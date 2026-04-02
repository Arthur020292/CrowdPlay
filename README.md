# CrowdPlay

CrowdPlay is a browser-based multiplayer party game platform built on Cloudflare Workers,
Durable Objects, D1, React, and Canvas.

## Apps

- `apps/web`: React + Vite host/player client
- `apps/worker`: Cloudflare Worker APIs and `GameSessionDurableObject`
- `packages/protocol`: shared message schemas and data models
- `packages/game-tapdash`: TapDash race simulation and ranking logic

## Getting Started

1. Install dependencies: `npm install`
2. Create a D1 database and update `wrangler.toml`
3. Add `.dev.vars` with `TOKEN_SECRET=your-local-secret`
4. Apply schema: `wrangler d1 execute crowdplay --local --file ./migrations/0001_match_results.sql`
5. Start local dev: `npm run dev`

The dev launcher automatically finds open ports for both Vite and Wrangler, then proxies `/api`
and WebSockets through the Vite dev server. This avoids collisions with other projects already
running on your machine.

## Environment

- `TOKEN_SECRET`: HMAC secret for host/player tokens
- `DB`: D1 binding for match history
- `GAME_SESSIONS`: Durable Object namespace
- `ASSETS`: static asset binding for the built frontend

## Release Workflow

- See [docs/release-process.md](/Users/arthur/Project/CrowdPlay/docs/release-process.md) for the feature branch, promotion, and production deploy checklist.
