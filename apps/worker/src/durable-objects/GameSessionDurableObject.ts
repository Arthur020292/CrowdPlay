import { DurableObject } from "cloudflare:workers";

import {
  buildStandings as buildGoldRushStandings,
  clearExpiredLockout,
  createChestOutcome as createGoldRushChestOutcome,
  evaluateAnswer as evaluateGoldRushAnswer,
  getQuestionForPlayer as getGoldRushQuestionForPlayer,
  getTopOpponentTargets as getGoldRushTopOpponentTargets,
  isLockoutActive,
  requiresTarget as goldRushRequiresTarget,
  resolveChestOutcome as resolveGoldRushChestOutcome,
  syncRanks as syncGoldRushRanks
} from "@crowdplay/game-goldrush";
import {
  buildStandings as buildQuizDashStandings,
  createChestOutcome as createQuizDashChestOutcome,
  evaluateAnswer as evaluateQuizDashAnswer,
  getQuestionForPlayer as getQuizDashQuestionForPlayer,
  getTopOpponentTargets as getQuizDashTopOpponentTargets,
  requiresTarget as quizDashRequiresTarget,
  resolveChestOutcome as resolveQuizDashChestOutcome,
  syncRanks as syncQuizDashRanks
} from "@crowdplay/game-quizdash";
import {
  PROTOCOL_VERSION,
  coercePlayerAvatarId,
  getDefaultSessionConfig,
  isGoldRushConfig,
  isGoldRushPlayer,
  isQuizDashConfig,
  isQuizDashPlayer,
  parseClientEvent,
  type ChaosEvent,
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

const STORAGE_KEY = "session-state-v3";
const EXPIRY_MS = 30 * 60 * 1000;

export class GameSessionDurableObject extends DurableObject<Env> {
  private sessionId = "";
  private code = "";
  private phase: GamePhase = "expired";
  private config: SessionConfig = getDefaultSessionConfig("goldrush");
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
    player.status = "connected";
    player.lastSeenAt = now;

    if (isGoldRushPlayer(player)) {
      clearExpiredLockout(player, now);

      if (event.type === "input") {
        this.send(ws, { v: PROTOCOL_VERSION, type: "error", code: "INVALID_FOR_GAME", message: "Tap input is not used in Gold Rush." });
        return;
      }

      if (event.type === "answer") {
        await this.handleGoldRushAnswer(player, event.questionId, event.answerId);
        return;
      }

      if (event.type === "chest_pick") {
        await this.handleGoldRushChestPick(player, event.chestIndex);
        return;
      }

      if (event.type === "target_pick") {
        await this.handleGoldRushTargetPick(player, event.targetPlayerId);
      }

      return;
    }

    if (event.type === "input") {
      this.send(ws, { v: PROTOCOL_VERSION, type: "error", code: "INVALID_FOR_GAME", message: "Tap input is not used in QuizDash." });
      return;
    }

    if (event.type === "answer") {
      await this.handleQuizDashAnswer(player, event.questionId, event.answerId);
      return;
    }

    if (event.type === "chest_pick") {
      await this.handleQuizDashChestPick(player, event.chestIndex);
      return;
    }

    if (event.type === "target_pick") {
      await this.handleQuizDashTargetPick(player, event.targetPlayerId);
      return;
    }

    this.send(ws, { v: PROTOCOL_VERSION, type: "error", code: "INVALID_FOR_GAME", message: "QuizDash only accepts answer and chest events." });
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
          player.status = this.phase === "finished" ? "finished" : "disconnected";
          player.lastSeenAt = Date.now();
        }
      }
    }

    await this.persistState(true);
    this.broadcastRoster();
    this.broadcastPlayerStates();
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
    this.lastResult = persisted.lastResult ? this.restoreMatchResult(persisted.lastResult) : null;

    this.players = new Map(
      persisted.players.map((player, index) => [player.playerId, this.restorePlayer(player, index)])
    );
  }

  private restorePlayer(player: SessionPlayer, index: number): SessionPlayer {
    if (isGoldRushPlayer(player)) {
      return {
        ...player,
        avatarId: coercePlayerAvatarId(player.avatarId, index),
        availableTargets: player.availableTargets.map((target, targetIndex) => ({
          ...target,
          avatarId: coercePlayerAvatarId(target.avatarId, targetIndex)
        })),
        status: player.connected ? "connected" : player.status
      };
    }

    return {
      ...player,
      avatarId: coercePlayerAvatarId(player.avatarId, index),
      availableTargets: player.availableTargets.map((target, targetIndex) => ({
        ...target,
        avatarId: coercePlayerAvatarId(target.avatarId, targetIndex)
      })),
      status: player.connected ? "connected" : player.status
    };
  }

  private restoreMatchResult(result: MatchResult): MatchResult {
    if (result.gameType === "goldrush") {
      return {
        ...result,
        standings: result.standings.map((standing, index) => ({
          ...standing,
          avatarId: coercePlayerAvatarId(standing.avatarId ?? (standing as { color?: string }).color, index)
        }))
      };
    }

    return {
      ...result,
      standings: result.standings.map((standing, index) => ({
        ...standing,
        avatarId: coercePlayerAvatarId(standing.avatarId ?? (standing as { color?: string }).color, index)
      }))
    };
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
        player.status = "connected";
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
      config: SessionConfig;
    };

    this.sessionId = payload.sessionId;
    this.code = payload.code;
    this.phase = "lobby";
    this.createdAt = Date.now();
    this.config = { ...getDefaultSessionConfig(payload.config.gameType), ...payload.config } as SessionConfig;
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

    const player = isGoldRushConfig(this.config)
      ? ({
          gameType: "goldrush",
          playerId: payload.playerId,
          name: payload.name.trim(),
          avatarId: coercePlayerAvatarId(payload.avatarId ?? payload.color, this.players.size),
          joinedAt: now,
          connected: false,
          lastSeenAt: now,
          gold: 0,
          rank: this.players.size + 1,
          status: "connected",
          questionCursor: 0,
          questionSeed: this.players.size,
          correctAnswers: 0,
          wrongAnswers: 0,
          chaosTriggerCount: 0,
          goldGained: 0,
          goldLost: 0,
          lockoutUntil: null,
          pendingChestPick: false,
          pendingTargetPick: false,
          pendingChestOutcome: null,
          availableTargets: [],
          recentOutcome: null
        } satisfies SessionPlayer)
      : ({
          gameType: "quizdash",
          playerId: payload.playerId,
          name: payload.name.trim(),
          avatarId: coercePlayerAvatarId(payload.avatarId ?? payload.color, this.players.size),
          joinedAt: now,
          connected: false,
          lastSeenAt: now,
          distance: 0,
          questionCursor: 0,
          questionSeed: this.players.size,
          correctAnswers: 0,
          wrongAnswers: 0,
          chaosTriggerCount: 0,
          distanceGained: 0,
          distanceLost: 0,
          pendingChestPick: false,
          pendingTargetPick: false,
          pendingChestOutcome: null,
          availableTargets: [],
          recentOutcome: null,
          rank: this.players.size + 1,
          status: "connected"
        } satisfies SessionPlayer);

    this.players.set(player.playerId, player);
    this.syncRanksForCurrentGame();
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

  private async handleQuizDashAnswer(player: SessionPlayer, questionId: string, answerId: string): Promise<void> {
    if (!isQuizDashPlayer(player)) {
      return;
    }

    if (this.phase !== "live" || player.pendingChestPick || player.pendingTargetPick) {
      return;
    }

    const isCorrect = evaluateQuizDashAnswer(player, questionId, answerId);
    if (isCorrect) {
      player.correctAnswers += 1;
      player.pendingChestPick = true;
      player.pendingTargetPick = false;
      player.pendingChestOutcome = null;
      player.availableTargets = [];
      player.recentOutcome = {
        kind: "correct",
        title: "Correct",
        detail: "Pick 1 of 3 hidden chests.",
        at: Date.now()
      };
    } else {
      player.wrongAnswers += 1;
      player.pendingChestPick = false;
      player.pendingTargetPick = false;
      player.pendingChestOutcome = null;
      player.availableTargets = [];
      player.recentOutcome = {
        kind: "wrong",
        title: "Missed it",
        detail: "No boost this round. Next question coming up.",
        at: Date.now()
      };
      player.questionCursor += 1;
    }

    syncQuizDashRanks(this.quizDashPlayers());
    this.broadcastSnapshot(true);
    this.broadcastPlayerStates();
    await this.persistState(false);
  }

  private async handleQuizDashChestPick(player: SessionPlayer, chestIndex: number): Promise<void> {
    if (!isQuizDashPlayer(player)) {
      return;
    }

    if (this.phase !== "live" || !player.pendingChestPick || player.pendingTargetPick) {
      return;
    }

    const outcome = createQuizDashChestOutcome(player, chestIndex, `${this.sessionId}:${player.playerId}:${player.questionCursor}`);
    player.pendingChestPick = false;

    if (quizDashRequiresTarget(outcome)) {
      const availableTargets = getQuizDashTopOpponentTargets(this.quizDashPlayers().filter((candidate) => candidate.connected), player);

      if (availableTargets.length === 0) {
        await this.finalizeQuizDashResolution(player, resolveQuizDashChestOutcome(this.quizDashPlayers(), player, { effectType: "distance_gain", distanceAmount: 20 }));
        return;
      }

      player.pendingTargetPick = true;
      player.pendingChestOutcome = outcome;
      player.availableTargets = availableTargets;
      player.recentOutcome = {
        kind: "reward",
        title: outcome.effectType === "distance_steal" ? "Heist chest" : "Swap chest",
        detail: outcome.effectType === "distance_steal" ? "Pick 1 of the top racers to steal from." : "Pick 1 of the top racers to swap with.",
        effectType: outcome.effectType,
        at: Date.now()
      };
      this.broadcastPlayerStates();
      await this.persistState(false);
      return;
    }

    await this.finalizeQuizDashResolution(player, resolveQuizDashChestOutcome(this.quizDashPlayers(), player, outcome));
  }

  private async handleQuizDashTargetPick(player: SessionPlayer, targetPlayerId: string): Promise<void> {
    if (!isQuizDashPlayer(player)) {
      return;
    }

    if (this.phase !== "live" || !player.pendingTargetPick || !player.pendingChestOutcome) {
      return;
    }

    const latestTargets = getQuizDashTopOpponentTargets(this.quizDashPlayers().filter((candidate) => candidate.connected), player);
    const resolvedTargetId = latestTargets.some((target) => target.playerId === targetPlayerId) ? targetPlayerId : undefined;
    await this.finalizeQuizDashResolution(
      player,
      resolveQuizDashChestOutcome(this.quizDashPlayers(), player, player.pendingChestOutcome, resolvedTargetId)
    );
  }

  private async finalizeQuizDashResolution(
    player: SessionPlayer,
    resolution: ReturnType<typeof resolveQuizDashChestOutcome>
  ): Promise<void> {
    if (!isQuizDashPlayer(player)) {
      return;
    }

    player.pendingChestPick = false;
    player.pendingTargetPick = false;
    player.pendingChestOutcome = null;
    player.availableTargets = [];
    player.questionCursor += 1;
    player.recentOutcome = resolution.outcome;

    syncQuizDashRanks(this.quizDashPlayers());
    this.broadcastSnapshot(true);
    this.broadcastPlayerStates();
    await this.persistState(false);
  }

  private async handleGoldRushAnswer(player: SessionPlayer, questionId: string, answerId: string): Promise<void> {
    if (!isGoldRushPlayer(player) || !isGoldRushConfig(this.config)) {
      return;
    }

    const now = Date.now();
    clearExpiredLockout(player, now);

    if (this.phase !== "live" || player.pendingChestPick || player.pendingTargetPick || isLockoutActive(player, now)) {
      return;
    }

    const isCorrect = evaluateGoldRushAnswer(player, questionId, answerId);
    if (isCorrect) {
      player.correctAnswers += 1;
      player.pendingChestPick = true;
      player.pendingTargetPick = false;
      player.pendingChestOutcome = null;
      player.availableTargets = [];
      player.recentOutcome = {
        kind: "correct",
        title: "Correct",
        detail: "Pick 1 of 3 hidden chests.",
        at: now
      };
    } else {
      player.wrongAnswers += 1;
      player.lockoutUntil = now + this.config.lockoutMs;
      player.questionCursor += 1;
      player.pendingChestPick = false;
      player.pendingTargetPick = false;
      player.pendingChestOutcome = null;
      player.availableTargets = [];
      player.recentOutcome = {
        kind: "wrong",
        title: "Locked out",
        detail: `Wrong answer. You're frozen for ${Math.ceil(this.config.lockoutMs / 1000)}s.`,
        at: now
      };
    }

    syncGoldRushRanks(this.goldRushPlayers());
    this.broadcastSnapshot(true);
    this.broadcastPlayerStates();
    await this.persistState(false);
  }

  private async handleGoldRushChestPick(player: SessionPlayer, chestIndex: number): Promise<void> {
    if (!isGoldRushPlayer(player) || !isGoldRushConfig(this.config)) {
      return;
    }

    if (this.phase !== "live" || !player.pendingChestPick || player.pendingTargetPick) {
      return;
    }

    const outcome = createGoldRushChestOutcome(player, chestIndex, `${this.sessionId}:${player.playerId}:${player.questionCursor}`);
    player.pendingChestPick = false;

    if (goldRushRequiresTarget(outcome)) {
      const availableTargets = getGoldRushTopOpponentTargets(this.goldRushPlayers().filter((candidate) => candidate.connected), player);

      if (availableTargets.length === 0) {
        await this.finalizeGoldRushResolution(player, resolveGoldRushChestOutcome(this.goldRushPlayers(), player, { effectType: "gold_gain", goldAmount: 50 }));
        return;
      }

      player.pendingTargetPick = true;
      player.pendingChestOutcome = outcome;
      player.availableTargets = availableTargets;
      player.recentOutcome = {
        kind: "reward",
        title: outcome.effectType === "gold_steal" ? "Heist chest" : "Swap chest",
        detail: outcome.effectType === "gold_steal" ? "Pick 1 of the top vaults to rob." : "Pick 1 of the top vaults to swap with.",
        effectType: outcome.effectType,
        at: Date.now()
      };
      this.broadcastPlayerStates();
      await this.persistState(false);
      return;
    }

    await this.finalizeGoldRushResolution(player, resolveGoldRushChestOutcome(this.goldRushPlayers(), player, outcome));
  }

  private async handleGoldRushTargetPick(player: SessionPlayer, targetPlayerId: string): Promise<void> {
    if (!isGoldRushPlayer(player)) {
      return;
    }

    if (this.phase !== "live" || !player.pendingTargetPick || !player.pendingChestOutcome) {
      return;
    }

    const latestTargets = getGoldRushTopOpponentTargets(this.goldRushPlayers().filter((candidate) => candidate.connected), player);
    const resolvedTargetId = latestTargets.some((target) => target.playerId === targetPlayerId) ? targetPlayerId : undefined;
    await this.finalizeGoldRushResolution(
      player,
      resolveGoldRushChestOutcome(this.goldRushPlayers(), player, player.pendingChestOutcome, resolvedTargetId)
    );
  }

  private async finalizeGoldRushResolution(
    player: SessionPlayer,
    resolution: ReturnType<typeof resolveGoldRushChestOutcome>
  ): Promise<void> {
    if (!isGoldRushPlayer(player)) {
      return;
    }

    player.pendingChestPick = false;
    player.pendingTargetPick = false;
    player.pendingChestOutcome = null;
    player.availableTargets = [];
    player.questionCursor += 1;
    player.recentOutcome = resolution.outcome;

    syncGoldRushRanks(this.goldRushPlayers());
    this.broadcastSnapshot(true);
    this.broadcastPlayerStates();
    this.broadcastChaosEvent(player, resolution.target, resolution.outcome);
    await this.persistState(false);
  }

  private broadcastChaosEvent(player: SessionPlayer, target: SessionPlayer | null, outcome: ChaosEvent["outcome"]): void {
    if (!isGoldRushPlayer(player)) {
      return;
    }

    const event: ChaosEvent = {
      v: PROTOCOL_VERSION,
      type: "chaos_event",
      gameType: "goldrush",
      actor: {
        playerId: player.playerId,
        name: player.name,
        avatarId: player.avatarId,
        rank: player.rank,
        gold: player.gold
      },
      target: target && isGoldRushPlayer(target)
        ? {
            playerId: target.playerId,
            name: target.name,
            avatarId: target.avatarId,
            rank: target.rank,
            gold: target.gold
          }
        : undefined,
      outcome,
      at: outcome.at
    };

    this.broadcast(event);
  }

  private async finishMatch(): Promise<void> {
    if (this.phase === "finished" || this.phase === "expired") {
      return;
    }

    this.phase = "finished";
    this.endedAt = Date.now();

    if (isGoldRushConfig(this.config)) {
      for (const player of this.goldRushPlayers()) {
        player.pendingChestPick = false;
        player.pendingTargetPick = false;
        player.pendingChestOutcome = null;
        player.availableTargets = [];
        player.lockoutUntil = null;
        player.status = "finished";
      }

      const standings = buildGoldRushStandings(this.goldRushPlayers());
      const winners = standings.slice(0, 3).map((standing) => standing.playerId);
      const totalCorrectAnswers = standings.reduce((sum, standing) => sum + standing.correctAnswers, 0);
      const totalWrongAnswers = standings.reduce((sum, standing) => sum + standing.wrongAnswers, 0);
      const totalChaosTriggers = standings.reduce((sum, standing) => sum + standing.chaosTriggers, 0);
      const totalGoldInPlay = standings.reduce((sum, standing) => sum + standing.gold, 0);

      this.lastResult = {
        matchId: createId("match"),
        sessionId: this.sessionId,
        code: this.code,
        gameType: "goldrush",
        startedAt: this.startedAt ?? this.createdAt,
        endedAt: this.endedAt,
        durationMs: (this.startedAt ? this.endedAt - this.startedAt : 0) || 0,
        playerCount: standings.length,
        winners,
        standings,
        stats: {
          totalCorrectAnswers,
          totalWrongAnswers,
          totalChaosTriggers,
          totalGoldInPlay,
          winningGold: standings[0]?.gold ?? 0
        }
      };
    } else {
      for (const player of this.quizDashPlayers()) {
        player.pendingChestPick = false;
        player.pendingTargetPick = false;
        player.pendingChestOutcome = null;
        player.availableTargets = [];
        player.status = "finished";
      }

      const standings = buildQuizDashStandings(this.quizDashPlayers());
      const winners = standings.slice(0, 3).map((standing) => standing.playerId);
      const totalCorrectAnswers = standings.reduce((sum, standing) => sum + standing.correctAnswers, 0);
      const totalWrongAnswers = standings.reduce((sum, standing) => sum + standing.wrongAnswers, 0);

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
          winningDistance: standings[0]?.distance ?? 0
        }
      };
    }

    await this.persistState(true);
    await this.schedulePhaseAlarm();

    this.broadcast({
      v: PROTOCOL_VERSION,
      type: "phase_changed",
      phase: "finished",
      remainingMs: 0
    });
    this.broadcast(this.buildMatchFinishedEvent());
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

    if (isGoldRushConfig(this.config)) {
      for (const player of this.goldRushPlayers()) {
        if (player.lockoutUntil !== null && player.lockoutUntil <= now) {
          clearExpiredLockout(player, now);
          lockoutChanged = true;
        }
      }
    }

    if (this.phase === "countdown" && this.countdownEndsAt && now >= this.countdownEndsAt) {
      this.phase = "live";
      this.startedAt = now;
      this.liveEndsAt = now + this.getDurationMs();
      await this.persistState(true);
      await this.schedulePhaseAlarm();
      this.broadcast({
        v: PROTOCOL_VERSION,
        type: "phase_changed",
        phase: "live",
        remainingMs: this.getDurationMs()
      });
      this.broadcastPlayerStates();
    }

    if (this.phase === "live") {
      if (this.liveEndsAt && now >= this.liveEndsAt) {
        await this.finishMatch();
      } else {
        if (isQuizDashConfig(this.config)) {
          this.broadcastSnapshot();
        } else {
          if (lockoutChanged) {
            this.broadcastPlayerStates();
          }
          this.broadcastSnapshot();
        }
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

    if (isGoldRushPlayer(player)) {
      clearExpiredLockout(player, now);
      return {
        v: PROTOCOL_VERSION,
        type: "player_state",
        gameType: "goldrush",
        phase: this.phase,
        playerId: player.playerId,
        gold: player.gold,
        rank: player.rank,
        correctAnswers: player.correctAnswers,
        wrongAnswers: player.wrongAnswers,
        chaosTriggers: player.chaosTriggerCount,
        lockoutEndsAt: player.lockoutUntil && player.lockoutUntil > now ? player.lockoutUntil : null,
        pendingChestPick: player.pendingChestPick,
        pendingTargetPick: player.pendingTargetPick,
        availableTargets: player.pendingTargetPick ? player.availableTargets : [],
        currentQuestion:
          this.phase === "live" && !player.pendingChestPick && !player.pendingTargetPick && !isLockoutActive(player, now)
            ? getGoldRushQuestionForPlayer(player)
            : null,
        recentOutcome: player.recentOutcome
      };
    }

    return {
      v: PROTOCOL_VERSION,
      type: "player_state",
      gameType: "quizdash",
      phase: this.phase,
      playerId: player.playerId,
      pendingChestPick: player.pendingChestPick,
      pendingTargetPick: player.pendingTargetPick,
      availableTargets: player.pendingTargetPick ? player.availableTargets : [],
      currentQuestion:
        this.phase === "live" && !player.pendingChestPick && !player.pendingTargetPick
          ? getQuizDashQuestionForPlayer(player)
          : null,
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

    if (isGoldRushConfig(this.config)) {
      this.broadcast({
        v: PROTOCOL_VERSION,
        type: "snapshot",
        gameType: "goldrush",
        phase: this.phase,
        tick: this.tick,
        serverTimeMs: now,
        remainingMs: this.getRemainingMs(now),
        players: this.goldRushPlayers()
          .sort((left, right) => left.rank - right.rank)
          .map((player) => ({
            gameType: "goldrush" as const,
            id: player.playerId,
            name: player.name,
            avatarId: player.avatarId,
            gold: player.gold,
            rank: player.rank,
            correctAnswers: player.correctAnswers,
            wrongAnswers: player.wrongAnswers,
            status: player.status
          }))
      });
      return;
    }

    this.broadcast({
      v: PROTOCOL_VERSION,
      type: "snapshot",
      gameType: "quizdash",
      phase: this.phase,
      tick: this.tick,
      serverTimeMs: now,
      remainingMs: this.getRemainingMs(now),
      players: this.quizDashPlayers()
        .sort((left, right) => left.rank - right.rank)
        .map((player) => ({
          gameType: "quizdash" as const,
          id: player.playerId,
          name: player.name,
          avatarId: player.avatarId,
          distance: Math.round(player.distance * 100) / 100,
          rank: player.rank,
          correctAnswers: player.correctAnswers,
          wrongAnswers: player.wrongAnswers,
          status: player.status
        }))
    });
  }

  private getRemainingMs(now: number): number {
    if (this.phase === "countdown") {
      return Math.max(0, (this.countdownEndsAt ?? now) - now);
    }
    if (this.phase === "live") {
      return Math.max(0, (this.liveEndsAt ?? now) - now);
    }
    return 0;
  }

  private broadcastRoster(): void {
    const players: RosterPlayer[] = isGoldRushConfig(this.config)
      ? this.goldRushPlayers()
          .sort((left, right) => left.joinedAt - right.joinedAt)
          .map((player) => ({
            gameType: "goldrush" as const,
            id: player.playerId,
            name: player.name,
            avatarId: player.avatarId,
            connected: player.connected,
            rank: player.rank,
            gold: player.gold
          }))
      : this.quizDashPlayers()
          .sort((left, right) => left.joinedAt - right.joinedAt)
          .map((player) => ({
            gameType: "quizdash" as const,
            id: player.playerId,
            name: player.name,
            avatarId: player.avatarId,
            connected: player.connected,
            rank: player.rank,
            distance: Math.round(player.distance * 100) / 100
          }));

    this.broadcast({ v: PROTOCOL_VERSION, type: "roster_update", gameType: this.config.gameType, players });
  }

  private buildMatchFinishedEvent(): ServerEvent {
    if (!this.lastResult) {
      return { v: PROTOCOL_VERSION, type: "error", code: "RESULT_MISSING", message: "Match result missing." };
    }

    return {
      v: PROTOCOL_VERSION,
      type: "match_finished",
      gameType: this.lastResult.gameType,
      matchId: this.lastResult.matchId,
      winners: this.lastResult.winners,
      standings: this.lastResult.standings
    } as ServerEvent;
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

  private getDurationMs(): number {
    return isGoldRushConfig(this.config) ? this.config.matchDurationMs : this.config.raceDurationMs;
  }

  private goldRushPlayers() {
    return [...this.players.values()].filter(isGoldRushPlayer);
  }

  private quizDashPlayers() {
    return [...this.players.values()].filter(isQuizDashPlayer);
  }

  private syncRanksForCurrentGame(): void {
    if (isGoldRushConfig(this.config)) {
      syncGoldRushRanks(this.goldRushPlayers());
      return;
    }

    syncQuizDashRanks(this.quizDashPlayers());
  }
}
