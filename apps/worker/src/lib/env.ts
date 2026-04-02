import type { MatchResult } from "@crowdplay/protocol";

export interface TokenClaims {
  role: "host" | "player";
  sessionId: string;
  code: string;
  playerId?: string;
  issuedAt: number;
}

export interface PersistedSessionState {
  sessionId: string;
  code: string;
  phase: "lobby" | "countdown" | "live" | "finished" | "archived" | "expired";
  createdAt: number;
  startedAt: number | null;
  endedAt: number | null;
  countdownEndsAt: number | null;
  liveEndsAt: number | null;
  tick: number;
  config: {
    gameType: "tapdash";
    playerLimit: number;
    raceDurationMs: number;
    countdownMs: number;
    tickRateHz: number;
    snapshotRateHz: number;
  };
  players: Array<{
    playerId: string;
    name: string;
    joinedAt: number;
    connected: boolean;
    lastSeenAt: number;
    inputSeq: number;
    totalTaps: number;
    pendingTaps: number;
    distance: number;
    rank: number;
    status: "connected" | "disconnected" | "finished" | "kicked";
  }>;
  lastResult: MatchResult | null;
}

export interface Env {
  APP_NAME: string;
  TOKEN_SECRET: string;
  ASSETS: Fetcher;
  DB: D1Database;
  GAME_SESSIONS: DurableObjectNamespace;
}
