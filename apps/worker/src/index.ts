import {
  createSessionRequestSchema,
  joinSessionRequestSchema,
  type CreateSessionResponse,
  type JoinSessionResponse
} from "@crowdplay/protocol";

import { GameSessionDurableObject } from "./durable-objects/GameSessionDurableObject";
import type { Env } from "./lib/env";
import { json, errorResponse, readJson, spaFallbackRequest } from "./lib/http";
import { readMatchResult } from "./lib/match-results";
import { createId, generateSessionCode } from "./lib/session-code";
import { hashToken, signToken, verifyToken } from "./lib/tokens";

async function createSession(env: Env, request: Request): Promise<Response> {
  const body = createSessionRequestSchema.parse(await readJson(request));

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateSessionCode();
    const sessionId = createId("session");
    const hostClaims = {
      role: "host" as const,
      sessionId,
      code,
      issuedAt: Date.now()
    };
    const hostToken = await signToken(env.TOKEN_SECRET, hostClaims);

    const objectId = env.GAME_SESSIONS.idFromName(code);
    const stub = env.GAME_SESSIONS.get(objectId);
    const createResponse = await stub.fetch("https://session/internal/create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId,
        code,
        hostTokenHash: await hashToken(hostToken),
        config: body
      })
    });

    if (createResponse.ok) {
      const created = (await createResponse.json()) as { summary: CreateSessionResponse["summary"] };
      return json({
        sessionId,
        code,
        hostToken,
        summary: created.summary
      });
    }
  }

  return errorResponse(500, "SESSION_ALLOCATION_FAILED", "Unable to allocate a unique session code.");
}

async function joinSession(env: Env, request: Request, code: string): Promise<Response> {
  const body = joinSessionRequestSchema.parse(await readJson(request));
  const objectId = env.GAME_SESSIONS.idFromName(code);
  const stub = env.GAME_SESSIONS.get(objectId);
  const playerId = createId("player");

  const joinResponse = await stub.fetch("https://session/internal/join", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ playerId, name: body.name, color: body.color })
  });

  if (!joinResponse.ok) {
    return new Response(await joinResponse.text(), {
      status: joinResponse.status,
      headers: { "content-type": joinResponse.headers.get("content-type") ?? "application/json" }
    });
  }

  const joined = (await joinResponse.json()) as { summary: JoinSessionResponse["summary"] };
  const playerToken = await signToken(env.TOKEN_SECRET, {
    role: "player",
    sessionId: joined.summary.sessionId,
    code,
    playerId,
    issuedAt: Date.now()
  });

  return json({
    sessionId: joined.summary.sessionId,
    playerId,
    playerToken,
    summary: joined.summary
  });
}

async function hostCommand(env: Env, code: string, request: Request, pathname: "/internal/start" | "/internal/end"): Promise<Response> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return errorResponse(401, "UNAUTHORIZED", "Host token is required.");
  }

  const claims = await verifyToken(env.TOKEN_SECRET, authHeader.slice("Bearer ".length));
  if (!claims || claims.role !== "host" || claims.code !== code) {
    return errorResponse(403, "FORBIDDEN", "Host token is invalid for this session.");
  }

  const objectId = env.GAME_SESSIONS.idFromName(code);
  const stub = env.GAME_SESSIONS.get(objectId);
  const response = await stub.fetch(`https://session${pathname}`, { method: "POST" });

  return new Response(await response.text(), {
    status: response.status,
    headers: { "content-type": response.headers.get("content-type") ?? "application/json" }
  });
}

async function handleWebSocket(env: Env, request: Request, code: string): Promise<Response> {
  if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
    return errorResponse(426, "UPGRADE_REQUIRED", "Expected a WebSocket upgrade request.");
  }

  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return errorResponse(401, "UNAUTHORIZED", "Missing session token.");
  }

  const claims = await verifyToken(env.TOKEN_SECRET, token);
  if (!claims || claims.code !== code) {
    return errorResponse(403, "FORBIDDEN", "Session token is invalid.");
  }

  const objectId = env.GAME_SESSIONS.idFromName(code);
  const stub = env.GAME_SESSIONS.get(objectId);
  const headers = new Headers(request.headers);
  headers.set("x-crowdplay-role", claims.role);
  if (claims.playerId) {
    headers.set("x-crowdplay-player-id", claims.playerId);
  }

  const durableObjectRequest = new Request("https://session/ws", {
    method: request.method,
    headers
  });

  return stub.fetch(durableObjectRequest);
}

async function serveFrontend(env: Env, request: Request): Promise<Response> {
  const assetResponse = await env.ASSETS.fetch(request);
  if (assetResponse.status !== 404) {
    return assetResponse;
  }

  return env.ASSETS.fetch(spaFallbackRequest(request, "/index.html"));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/api/sessions") {
      return createSession(env, request);
    }

    const joinMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/join$/);
    if (request.method === "POST" && joinMatch) {
      return joinSession(env, request, joinMatch[1]!);
    }

    const startMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/start$/);
    if (request.method === "POST" && startMatch) {
      return hostCommand(env, startMatch[1]!, request, "/internal/start");
    }

    const endMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/end$/);
    if (request.method === "POST" && endMatch) {
      return hostCommand(env, endMatch[1]!, request, "/internal/end");
    }

    const wsMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/ws$/);
    if (wsMatch) {
      return handleWebSocket(env, request, wsMatch[1]!);
    }

    const resultMatch = url.pathname.match(/^\/api\/results\/([^/]+)$/);
    if (request.method === "GET" && resultMatch) {
      const result = await readMatchResult(env.DB, resultMatch[1]!);
      if (!result) {
        return errorResponse(404, "NOT_FOUND", "Match result not found.");
      }
      return json(result);
    }

    if (!url.pathname.startsWith("/api/")) {
      return serveFrontend(env, request);
    }

    return errorResponse(404, "NOT_FOUND", "Route not found.");
  }
};

export { GameSessionDurableObject };
