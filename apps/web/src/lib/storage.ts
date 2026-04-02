import type { PlayerColorId } from "@crowdplay/protocol";

interface StoredPlayerSession {
  code: string;
  playerId: string;
  playerToken: string;
  name: string;
  color: PlayerColorId;
}

const HOST_TOKEN_PREFIX = "crowdplay:host:";
const PLAYER_SESSION_PREFIX = "crowdplay:player:";

export function saveHostToken(code: string, token: string): void {
  window.sessionStorage.setItem(`${HOST_TOKEN_PREFIX}${code}`, token);
}

export function getHostToken(code: string): string | null {
  return window.sessionStorage.getItem(`${HOST_TOKEN_PREFIX}${code}`);
}

export function savePlayerSession(session: StoredPlayerSession): void {
  window.localStorage.setItem(`${PLAYER_SESSION_PREFIX}${session.code}`, JSON.stringify(session));
}

export function getPlayerSession(code: string): StoredPlayerSession | null {
  const raw = window.localStorage.getItem(`${PLAYER_SESSION_PREFIX}${code}`);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredPlayerSession;
  } catch {
    return null;
  }
}
