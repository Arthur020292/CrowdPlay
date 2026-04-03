import { DurableObject } from "cloudflare:workers";

import {
  applyRewardChoice,
  buildStandings,
  clearExpiredLockout,
  evaluateAnswer,
  getQuestionForPlayer,
  isLockoutActive,
  syncRanks
} from "@crowdplay/game-quizdash";
import {
  PROTOCOL_VERSION,
  coercePlayerAvatarId,
  defaultSessionConfig,
  parseClientEvent,
  type GamePhase,
  type MatchResult,
  type PlayerStateEvent,
  type RosterPlayer,
  type ServerEvent,
  type SessionConfig,
  type SessionPlayer
} from "@crowdplay/protocol";

import { persistMatchResult } from "../lib/match-results";
import { createId } from "../lib/session-code";
import type { Env, PersistedSessionState } from "../lib/env";

type SocketAttachment =
  | { role: "host"; sessionId: string }
  | { role: "player"; sessionId: string; playerId: string };

const STORAGE_KEY = "session-state";
const EXPIRY_MS = 30 * 60 * 1000;

export class GameSessionDurableObject extends DurableObject<Env> {
  private sessionId = "";
  private code = "";
  private phase: GamePhase = "expired";
  private config: SessionConfig = defaultSessionConfig;
  private createdAt = 0;
  private startedAt: number | null = null;
  private endedAt: number | null = null;
  private countdownEndsAt: number | null = null;
  private liveEndsAt: number | null = null;
  private tick = 0;
  private players = new Map<string, SessionPlayer>();
  private hostSockets = new Set<WebSocket>();
  private playerSockets = new Map<string, Set<WebSocket>>();
  private lastResult: MatchResult | null = null;
  private loopTimer: ReturnType<typeof setTimeout> | null = null;
  private lastSnapshotSentAt = 0;
  private lastPersistedAt = 0;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    this.ctx.blockConcurrencyWhile(async () => {
      await this.restoreState();
      this.rehydrateSockets();
      this.scheduleLoop();
    });
  }

  async fetch(request: Request): Promise<Response> {
    await this.restoreIfNeeded();

    const url = new URL(request.url);

    if (url.pathname === "/internal/create" && request.method === "POST") {
      return this.handleCreate(request);
    }

    if (url.pathname === "/internal/join" && request.method === "POST") {
      return this.handleJoin(request);
    }

    if (url.pathname === "/internal/start" && request.method === "POST") {
      return this.handleStart();
    }

    if (url.pathname === "/internal/end" && request.method === "POST") {
      return this.handleEnd();
    }

    if (url.pathname === "/internal/state" && request.method === "GET") {
      return Response.json(this.getSummary());
    }

    if (url.pathname === "/ws" && request.method === "GET") {
      return this.handleWebSocket(request);
    }

    return new Response("Not found", { status: 404 });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    await this.restoreIfNeeded();

    const attachment = this.readAttachment(ws);
    const text = typeof message === "string" ? message : new TextDecoder().decode(message);

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      this.send(ws, { v: PROTOCOL_VERSION, type: "error", code: "BAD_JSON", message: "Invalid message payload." });
      return;
    }

    let event;
    try {
      event = parseClientEvent(parsed);
    } catch {
      this.send(ws, { v: PROTOCOL_VERSION, type: "error", code: "BAD_EVENT", message: "Unsupported client event." });
      return;
    }

    const now = Date.now();

    if (event.type === "ping") {
      this.send(ws, { v: PROTOCOL_VERSION, type: "pong", at: now });
      return;
    }

    if (attachment.role === "host") {
      if (event.type === "host_command") {
        if (event.command === "start_match") {
          await this.startCountdown();
        }

        if (event.command === "end_match") {
          await this.finishMatch();
        }
      }
      return;
    }

    const player = this.players.get(attachment.playerId);
    if (!player) {
      this.send(ws, { v: PROTOCOL_VERSION, type: "error", code: "PLAYER_NOT_FOUND", message: "Player session missing." });
      return;
    }

    player.connected = true;
    player.lastSeenAt = now;
    clearExpiredLockout(player, now);

    if (event.type === "answer") {
      await this.handlePlayerAnswer(player, event.questionId, event.answerId);
      return;
    }

    if (event.type === "reward_choice") {
      await this.handleRewardChoice(player, event.choice);
      return;
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const attachment = this.readAttachment(ws);

    if (attachment.role === "host") {
      this.hostSockets.delete(ws);
    } else {
      const sockets = this.playerSockets.get(attachment.playerId);
      sockets?.delete(ws);
      if (!sockets || sockets.size === 0) {
        this.playerSockets.delete(attachment.playerId);
        const player = this.players.get(attachment.playerId);
        if (player) {
          player.connected = false;
          player.lastSeenAt = Date.now();
        }
      }
    }

    await this.persistState(true);
    this.broadcastRoster();
  }

  async alarm(): Promise<void> {
    await this.restoreIfNeeded();

    const now = Date.now();
    if (this.phase === "countdown" && this.countdownEndsAt && now >= this.countdownEndsAt) {
      await this.runTick();
      return;
    }

    if (this.phase === "live" && this.liveEndsAt && now >= this.liveEndsAt) {
      await this.runTick();
      return;
    }

    if (this.phase === "finished" && this.endedAt && now - this.endedAt > EXPIRY_MS) {
      this.phase = "expired";
      await this.persistState(true);
      this.closeAllSockets(1001, "Session expired");
      return;
    }

    await this.schedulePhaseAlarm();
  }

  private async restoreIfNeeded(): Promise<void> {
    if (!this.sessionId && this.phase === "expired") {
      await this.restoreState();
      this.rehydrateSockets();
      this.scheduleLoop();
    }
  }

  private async restoreState(): Promise<void> {
    const persisted = await this.ctx.storage.get<PersistedSessionState>(STORAGE_KEY);
    if (!persisted) {
      return;
    }

    this.sessionId = persisted.sessionId;
    this.code = persisted.code;
    this.phase = persisted.phase;
    this.createdAt = persisted.createdAt;
    this.startedAt = persisted.startedAt;
    this.endedAt = persisted.endedAt;
    this.countdownEndsAt = persisted.countdownEndsAt;
    this.liveEndsAt = persisted.liveEndsAt;
    this.tick = persisted.tick;
    this.config = persisted.config;
    this.lastResult = persisted.lastResult
      ? {
          ...persisted.lastResult,
          standings: persisted.lastResult.standings.map((standing, index) => ({
            ...standing,
            avatarId: coercePlayerAvatarId(standing.avatarId ?? (standing as { color?: string }).color, index)
          }))
        }
      : null;

    this.players = new Map(
      persisted.players.map((player, index) => [
        player.playerId,
        {
          ...player,
          avatarId: coercePlayerAvatarId(player.avatarId ?? (player as { color?: string }).color, index),
          status: player.connected ? "connected" : player.status
        }
      ])
    );
  }

  private rehydrateSockets(): void {
    this.hostSockets.clear();
    this.playerSockets.clear();

    for (const ws of this.ctx.getWebSockets()) {
      const attachment = this.readAttachment(ws);
      if (attachment.role === "host") {
        this.hostSockets.add(ws);
        continue;
      }

      const sockets = this.playerSockets.get(attachment.playerId) ?? new Set<WebSocket>();
      sockets.add(ws);
      this.playerSockets.set(attachment.playerId, sockets);

      const player = this.players.get(attachment.playerId);
      if (player) {
        player.connected = true;
        player.lastSeenAt = Date.now();
      }
    }
  }

  private getSummary() {
    return {
      sessionId: this.sessionId,
      code: this.code,
      phase: this.phase,
      createdAt: this.createdAt,
      startedAt: this.startedAt,
      endedAt: this.endedAt,
      playerCount: this.players.size,
      config: this.config
    };
  }

  private async handleCreate(request: Request): Promise<Response> {
    if (this.sessionId) {
      return Response.json({ error: { code: "SESSION_EXISTS", message: "Session code already allocated." } }, { status: 409 });
    }

    const payload = (await request.json()) as {
      sessionId: string;
      code: string;
      config?: Partial<SessionConfig>;
    };

    this.sessionId = payload.sessionId;
    this.code = payload.code;
    this.phase = "lobby";
    this.createdAt = Date.now();
    this.config = { ...defaultSessionConfig, ...payload.config };
    this.players = new Map();
    this.lastResult = null;
    this.tick = 0;
    this.startedAt = null;
    this.endedAt = null;
    this.countdownEndsAt = null;
    this.liveEndsAt = null;

    await this.persistState(true);
    return Response.json({ ok: true, summary: this.getSummary() });
  }

  private async handleJoin(request: Request): Promise<Response> {
    if (this.phase !== "lobby") {
      return Response.json({ error: { code: "SESSION_CLOSED", message: "This session is no longer accepting players." } }, { status: 409 });
    }

    if (this.players.size >= this.config.playerLimit) {
      return Response.json({ error: { code: "SESSION_FULL", message: "Player limit reached." } }, { status: 409 });
    }

    const payload = (await request.json()) as { name: string; avatarId?: string; color?: string; playerId: string };
    const now = Date.now();

    const player: SessionPlayer = {
      playerId: payload.playerId,
      name: payload.name.trim(),
      avatarId: coercePlayerAvatarId(payload.avatarId ?? payload.color, this.players.size),
      joinedAt: now,
      connected: false,
      lastSeenAt: now,
      distance: 0,
      rank: this.players.size + 1,
      status: "connected",
      questionCursor: 0,
      questionSeed: this.players.size,
      correctAnswers: 0,
      wrongAnswers: 0,
      effectCount: 0,
      distanceGained: 0,
      distanceLost: 0,
      lockoutUntil: null,
      pendingRewardChoice: false,
      recentOutcome: null
    };

    this.players.set(player.playerId, player);
    syncRanks([...this.players.values()]);
    await this.persistState(true);
    this.broadcastRoster();

    return Response.json({
      ok: true,
      playerId: player.playerId,
      summary: this.getSummary()
    });
  }

  private async handleStart(): Promise<Response> {
    await this.startCountdown();
    return Response.json({ ok: true, summary: this.getSummary() });
  }

  private async handleEnd(): Promise<Response> {
    await this.finishMatch();
    return Response.json({ ok: true, summary: this.getSummary(), result: this.lastResult });
  }

  private handleWebSocket(request: Request): Response {
    const role = request.headers.get("x-crowdplay-role");
    const playerId = request.headers.get("x-crowdplay-player-id") ?? undefined;

    if (role !== "host" && role !== "player") {
      return new Response("Missing role", { status: 400 });
    }

    if (role === "player" && !playerId) {
      return new Response("Missing player id", { status: 400 });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.ctx.acceptWebSocket(server);

    const attachment: SocketAttachment =
      role === "host"
        ? { role: "host", sessionId: this.sessionId }
        : { role: "player", sessionId: this.sessionId, playerId: playerId ?? "" };

    server.serializeAttachment?.(attachment);

    if (role === "host") {
      this.hostSockets.add(server);
      this.send(server, {
        v: PROTOCOL_VERSION,
        type: "join_ack",
        sessionId: this.sessionId,
        phase: this.phase,
        serverTimeMs: Date.now(),
        summary: this.getSummary()
      });
      this.broadcastSnapshot(true);
    } else if (playerId) {
      const sockets = this.playerSockets.get(playerId) ?? new Set<WebSocket>();
      sockets.add(server);
      this.playerSockets.set(playerId, sockets);

      const player = this.players.get(playerId);
      if (player) {
        player.connected = true;
        player.status = "connected";
        player.lastSeenAt = Date.now();
      }

      this.send(server, {
        v: PROTOCOL_VERSION,
        type: "join_ack",
        sessionId: this.sessionId,
        playerId,
        phase: this.phase,
        serverTimeMs: Date.now(),
        summary: this.getSummary()
      });

      if (player) {
        this.send(server, this.buildPlayerState(player));
      }

      this.broadcastRoster();
      this.broadcastSnapshot(true);
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  private readAttachment(ws: WebSocket): SocketAttachment {
    const attachment = ws.deserializeAttachment?.();
    if (!attachment || typeof attachment !== "object" || !("role" in attachment)) {
      return { role: "host", sessionId: this.sessionId };
    }
    return attachment as SocketAttachment;
  }

  private async startCountdown(): Promise<void> {
    if (this.phase !== "lobby") {
      return;
    }

    this.phase = "countdown";
    this.countdownEndsAt = Date.now() + this.config.countdownMs;
    await this.persistState(true);
    await this.schedulePhaseAlarm();
    this.broadcast({
      v: PROTOCOL_VERSION,
      type: "phase_changed",
      phase: "countdown",
      countdownMs: this.config.countdownMs
    });
    this.broadcastPlayerStates();
    this.scheduleLoop();
  }

  private async handlePlayerAnswer(player: SessionPlayer, questionId: string, answerId: string): Promise<void> {
    const now = Date.now();
    clearExpiredLockout(player, now);

    if (this.phase !== "live" || player.pendingRewardChoice || isLockoutActive(player, now)) {
      return;
    }

    const isCorrect = evaluateAnswer(player, questionId, answerId);
    if (isCorrect) {
      player.correctAnswers += 1;
      player.pendingRewardChoice = true;
      player.recentOutcome = {
        kind: "correct",
        title: "Correct",
        detail: "Choose your reward: safe progress or a chaotic chest.",
        at: now
      };
    } else {
      player.wrongAnswers += 1;
      player.lockoutUntil = now + this.config.lockoutMs;
      player.questionCursor += 1;
      player.recentOutcome = {
        kind: "wrong",
        title: "Locked out",
        detail: `Wrong answer. You're frozen for ${Math.ceil(this.config.lockoutMs / 1000)}s.`,
        at: now
      };
    }

    syncRanks([...this.players.values()]);
    this.broadcastSnapshot(true);
    this.broadcastPlayerStates();
    await this.persistState(false);
  }

  private async handleRewardChoice(player: SessionPlayer, choice: "move" | "effect"): Promise<void> {
    const now = Date.now();
    clearExpiredLockout(player, now);

    if (this.phase !== "live" || !player.pendingRewardChoice) {
      return;
    }

    const resolution = applyRewardChoice(
      [...this.players.values()],
      player,
      choice,
      `${this.sessionId}:${player.playerId}:${player.questionCursor}:${this.tick}`
    );

    player.pendingRewardChoice = false;
    player.questionCursor += 1;
    player.recentOutcome = resolution.outcome;

    syncRanks([...this.players.values()]);
    this.broadcastSnapshot(true);
    this.broadcastPlayerStates();
    await this.persistState(false);
  }

  private async finishMatch(): Promise<void> {
    if (this.phase === "finished" || this.phase === "expired") {
      return;
    }

    this.phase = "finished";
    this.endedAt = Date.now();

    for (const player of this.players.values()) {
      player.pendingRewardChoice = false;
      player.lockoutUntil = null;
      player.status = "finished";
    }

    const standings = buildStandings([...this.players.values()]);
    const winners = standings.slice(0, 3).map((standing) => standing.playerId);
    const totalCorrectAnswers = standings.reduce((sum, standing) => sum + standing.correctAnswers, 0);
    const totalWrongAnswers = standings.reduce((sum, standing) => sum + standing.wrongAnswers, 0);
    const totalEffectsTriggered = standings.reduce((sum, standing) => sum + standing.effectsTriggered, 0);

    this.lastResult = {
      matchId: createId("match"),
      sessionId: this.sessionId,
      code: this.code,
      gameType: "quizdash",
      startedAt: this.startedAt ?? this.createdAt,
      endedAt: this.endedAt,
      durationMs: (this.startedAt ? this.endedAt - this.startedAt : 0) || 0,
      playerCount: standings.length,
      winners,
      standings,
      stats: {
        totalCorrectAnswers,
        totalWrongAnswers,
        totalEffectsTriggered,
        winningDistance: standings[0]?.distance ?? 0
      }
    };

    await this.persistState(true);
    await this.schedulePhaseAlarm();

    this.broadcast({
      v: PROTOCOL_VERSION,
      type: "phase_changed",
      phase: "finished",
      remainingMs: 0
    });
    this.broadcast({
      v: PROTOCOL_VERSION,
      type: "match_finished",
      matchId: this.lastResult.matchId,
      winners: this.lastResult.winners,
      standings: this.lastResult.standings
    });
    this.broadcastPlayerStates();

    try {
      await persistMatchResult(this.env.DB, this.lastResult);
    } catch (error) {
      console.error("Failed to persist match result", {
        sessionId: this.sessionId,
        code: this.code,
        matchId: this.lastResult.matchId,
        error
      });
    }
  }

  private scheduleLoop(): void {
    if (this.loopTimer || (this.phase !== "countdown" && this.phase !== "live")) {
      return;
    }

    const loop = async () => {
      this.loopTimer = null;
      await this.runTick();
      if (this.phase === "countdown" || this.phase === "live") {
        this.loopTimer = setTimeout(loop, 1000 / this.config.tickRateHz);
      }
    };

    this.loopTimer = setTimeout(loop, 1000 / this.config.tickRateHz);
  }

  private async runTick(): Promise<void> {
    this.tick += 1;
    const now = Date.now();
    let lockoutChanged = false;

    for (const player of this.players.values()) {
      if (player.lockoutUntil !== null && player.lockoutUntil <= now) {
        clearExpiredLockout(player, now);
        lockoutChanged = true;
      }
    }

    if (this.phase === "countdown" && this.countdownEndsAt && now >= this.countdownEndsAt) {
      this.phase = "live";
      this.startedAt = now;
      this.liveEndsAt = now + this.config.raceDurationMs;
      await this.persistState(true);
      await this.schedulePhaseAlarm();
      this.broadcast({
        v: PROTOCOL_VERSION,
        type: "phase_changed",
        phase: "live",
        remainingMs: this.config.raceDurationMs
      });
      this.broadcastPlayerStates();
    }

    if (this.phase === "live") {
      if (this.liveEndsAt && now >= this.liveEndsAt) {
        await this.finishMatch();
      } else {
        if (lockoutChanged) {
          this.broadcastPlayerStates();
        }
        this.broadcastSnapshot();
      }
    } else if (this.phase === "countdown") {
      this.broadcast({
        v: PROTOCOL_VERSION,
        type: "phase_changed",
        phase: "countdown",
        countdownMs: Math.max(0, (this.countdownEndsAt ?? now) - now)
      });
    }

    if (now - this.lastPersistedAt > 1_000) {
      await this.persistState(false);
    }
  }

  private buildPlayerState(player: SessionPlayer): PlayerStateEvent {
    const now = Date.now();
    clearExpiredLockout(player, now);

    return {
      v: PROTOCOL_VERSION,
      type: "player_state",
      phase: this.phase,
      playerId: player.playerId,
      distance: Math.round(player.distance * 100) / 100,
      rank: player.rank,
      correctAnswers: player.correctAnswers,
      wrongAnswers: player.wrongAnswers,
      effectsTriggered: player.effectCount,
      lockoutEndsAt: player.lockoutUntil && player.lockoutUntil > now ? player.lockoutUntil : null,
      pendingRewardChoice: player.pendingRewardChoice,
      currentQuestion: this.phase === "live" && !player.pendingRewardChoice ? getQuestionForPlayer(player) : null,
      recentOutcome: player.recentOutcome
    };
  }

  private broadcastPlayerStates(): void {
    for (const [playerId, sockets] of this.playerSockets.entries()) {
      const player = this.players.get(playerId);
      if (!player) {
        continue;
      }

      const event = this.buildPlayerState(player);
      for (const socket of sockets) {
        this.send(socket, event);
      }
    }
  }

  private broadcastSnapshot(force = false): void {
    const now = Date.now();
    const intervalMs = 1000 / this.config.snapshotRateHz;

    if (!force && now - this.lastSnapshotSentAt < intervalMs) {
      return;
    }

    this.lastSnapshotSentAt = now;
    const players = [...this.players.values()]
      .sort((left, right) => left.rank - right.rank)
      .map((player) => ({
        id: player.playerId,
        name: player.name,
        avatarId: player.avatarId,
        d: Math.round(player.distance * 100) / 100,
        r: player.rank,
        correctAnswers: player.correctAnswers,
        wrongAnswers: player.wrongAnswers,
        status: player.status
      }));

    this.broadcast({
      v: PROTOCOL_VERSION,
      type: "snapshot",
      phase: this.phase,
      tick: this.tick,
      serverTimeMs: now,
      remainingMs:
        this.phase === "countdown"
          ? Math.max(0, (this.countdownEndsAt ?? now) - now)
          : this.phase === "live"
            ? Math.max(0, (this.liveEndsAt ?? now) - now)
            : 0,
      players
    });
  }

  private broadcastRoster(): void {
    const players: RosterPlayer[] = [...this.players.values()]
      .sort((left, right) => left.joinedAt - right.joinedAt)
      .map((player) => ({
        id: player.playerId,
        name: player.name,
        avatarId: player.avatarId,
        connected: player.connected,
        rank: player.rank,
        distance: Math.round(player.distance * 100) / 100
      }));

    this.broadcast({ v: PROTOCOL_VERSION, type: "roster_update", players });
  }

  private broadcast(event: ServerEvent): void {
    const payload = JSON.stringify(event);

    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(payload);
      } catch {
        ws.close(1011, "Failed to deliver event");
      }
    }
  }

  private send(ws: WebSocket, event: ServerEvent): void {
    ws.send(JSON.stringify(event));
  }

  private closeAllSockets(code: number, reason: string): void {
    for (const ws of this.ctx.getWebSockets()) {
      ws.close(code, reason);
    }
  }

  private async schedulePhaseAlarm(): Promise<void> {
    let nextAlarmAt: number | null = null;

    if (this.phase === "countdown") {
      nextAlarmAt = this.countdownEndsAt;
    } else if (this.phase === "live") {
      nextAlarmAt = this.liveEndsAt;
    } else if (this.phase === "finished" && this.endedAt) {
      nextAlarmAt = this.endedAt + EXPIRY_MS;
    }

    if (nextAlarmAt) {
      await this.ctx.storage.setAlarm(nextAlarmAt);
    }
  }

  private async persistState(force: boolean): Promise<void> {
    const now = Date.now();
    if (!force && now - this.lastPersistedAt < 500) {
      return;
    }

    this.lastPersistedAt = now;

    const state: PersistedSessionState = {
      sessionId: this.sessionId,
      code: this.code,
      phase: this.phase,
      createdAt: this.createdAt,
      startedAt: this.startedAt,
      endedAt: this.endedAt,
      countdownEndsAt: this.countdownEndsAt,
      liveEndsAt: this.liveEndsAt,
      tick: this.tick,
      config: this.config,
      players: [...this.players.values()],
      lastResult: this.lastResult
    };

    await this.ctx.storage.put(STORAGE_KEY, state);
  }
}
