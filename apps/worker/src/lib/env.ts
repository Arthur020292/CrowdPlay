import type { MatchResult, SessionConfig, SessionPlayer } from "@crowdplay/protocol";

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
  config: SessionConfig;
  players: SessionPlayer[];
  lastResult: MatchResult | null;
}

export interface Env {
  APP_NAME: string;
  TOKEN_SECRET: string;
  ASSETS: Fetcher;
  DB: D1Database;
  GAME_SESSIONS: DurableObjectNamespace;
}
