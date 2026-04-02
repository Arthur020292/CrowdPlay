# CrowdPlay Release Process

This repo uses a three-branch workflow:

- `main`: the integration branch for reviewed, releasable code
- `codex/<feature-name>`: short-lived feature or fix branches
- `production`: the promotion branch that mirrors what should go live

## Normal Development Flow

1. Branch from `main`
2. Build and test on the feature branch
3. Open a PR into `main`
4. Merge into `main`
5. Fast-forward `production` to `main`
6. Deploy from `production`

## Feature Branch Checklist

1. Create a branch from the latest `main`
2. Keep the branch rebased on `origin/main` before pushing
3. Run:
   - `npm run typecheck`
   - `npm test`
   - `npm run build`
4. Push the feature branch
5. Include a clear PR title and description

## Production Promotion Checklist

1. Confirm `main` contains the exact code you want to ship
2. Fast-forward `production` from `main`
3. Verify production config is still correct:
   - `TOKEN_SECRET`
   - D1 database binding
   - Durable Object binding and migrations
4. Deploy from `production`
5. Run a smoke test:
   - create session
   - join from another device
   - verify lobby roster updates
   - start match
   - confirm race and results screen work

## Cloudflare-Specific Notes

- Standard code-only releases can usually go through the normal build pipeline
- Releases that add or change Durable Object migrations may require a manual `npx wrangler deploy`
- If Cloudflare build output shows `wrangler versions upload` for a Durable Object migration release, use manual deploy instead

## Recommended Protections

- `main`
  - require pull requests before merging
  - block force pushes
  - block branch deletion
- `production`
  - block force pushes
  - block branch deletion
  - prefer promotion-only updates from `main`

## Rollback

If a release is bad:

1. identify the last known good commit on `production`
2. move `production` back to that commit with a controlled revert or rollback commit
3. redeploy from `production`
4. re-run the smoke test
