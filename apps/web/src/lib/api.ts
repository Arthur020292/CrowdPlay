import {
  createSessionResponseSchema,
  joinSessionResponseSchema,
  type PlayerColorId,
  type CreateSessionResponse,
  type JoinSessionResponse,
  type MatchResult
} from "@crowdplay/protocol";

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(payload?.error?.message ?? "Request failed.");
  }

  return (await response.json()) as T;
}

export async function createSession(input: {
  playerLimit?: number;
  raceDurationMs?: number;
  countdownMs?: number;
}): Promise<CreateSessionResponse> {
  const response = await fetch("/api/sessions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input)
  });
  return createSessionResponseSchema.parse(await parseJson(response));
}

export async function joinSession(code: string, name: string, color: PlayerColorId): Promise<JoinSessionResponse> {
  const response = await fetch(`/api/sessions/${code}/join`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, color })
  });
  return joinSessionResponseSchema.parse(await parseJson(response));
}

export async function startSession(code: string, hostToken: string): Promise<void> {
  const response = await fetch(`/api/sessions/${code}/start`, {
    method: "POST",
    headers: { authorization: `Bearer ${hostToken}` }
  });
  await parseJson(response);
}

export async function endSession(code: string, hostToken: string): Promise<void> {
  const response = await fetch(`/api/sessions/${code}/end`, {
    method: "POST",
    headers: { authorization: `Bearer ${hostToken}` }
  });
  await parseJson(response);
}

export async function getMatchResult(matchId: string): Promise<MatchResult> {
  const response = await fetch(`/api/results/${matchId}`);
  return parseJson(response);
}

export function buildSessionSocketUrl(code: string, token: string): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/api/sessions/${code}/ws?token=${encodeURIComponent(token)}`;
}
