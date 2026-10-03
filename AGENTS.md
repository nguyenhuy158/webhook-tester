# Repository Guidelines

## Project Structure & Module Organization

Webhook Tester: a self-hosted webhook inspector on a single Cloudflare Worker
(Hono), live at <https://hooks.huyab.click>. The UI is server-rendered HTML
templates with no build step and no client dependencies. Code is structured as
a hexagon (ports & adapters): `src/domain/` holds entities, ports and use cases
and imports nothing from the runtime; `src/adapters/` holds everything
platform-specific; `src/config/` wires them together.

Folder structure:

```text
src/
  index.ts                     # Worker entry: Hono app, routers, EndpointHub export
  config/
    env.ts                     #   Env bindings type (DB, ENDPOINT_HUB, secrets, vars)
    dependencies.ts            #   Composition root: builds adapters + use cases per request
  domain/                      # Pure core (no Hono, D1, Workers APIs)
    entities.ts                #   Endpoint, WebhookRequest, User, ExternalIdentity
    exceptions.ts              #   Domain errors mapped to HTTP status by adapters
    ports.ts                   #   Repository / auth / broadcaster interfaces
    use-cases/                 #   auth.ts, endpoints.ts, webhooks.ts
  adapters/
    inbound/http/              #   Hono routers (auth, endpoints API, pages, webhook receiver)
      templates/               #   Server-rendered HTML (layout, login, index, endpoint)
    inbound/ws/                #   WebSocket router + EndpointHub Durable Object
    outbound/persistence/      #   D1 repositories (webhook_tester_* tables)
    outbound/security/         #   JWT (WebCrypto) + SSO cookie/JWKS verifier
    outbound/ws/               #   Durable Object broadcaster for live request feed
schema.sql                     # D1 schema (create-only; D1 is shared with other projects)
migrations/                    # One-off SQL migrations for older databases
e2e/                           # HTTP smoke suites (plain fetch, no browser)
  run.mjs                      #   `pnpm e2e`: schema -> local D1, wrangler dev, both suites
  readonly-smoke.mjs           #   GET-only checks, also run against prod (`pnpm e2e:prod`)
  dev-smoke.mjs                #   Full flow that writes to the local D1; never against prod
wrangler.jsonc                 # Worker config: D1 binding, Durable Object, custom domain
.dev.vars.example              # Template for local secrets (copy to .dev.vars)
```

The D1 database is shared with other projects: every table carries the
`webhook_tester_` prefix and `schema.sql` only ever creates tables, never drops
them.

## Build, Test, and Development Commands

- `pnpm install`: install project dependencies.
- `pnpm dev`: run `wrangler dev` on `http://localhost:8787` (needs `.dev.vars`,
  copy from `.dev.vars.example`, and `pnpm db:local` once).
- `pnpm check`: run `tsc --noEmit`.
- `pnpm build`: bundle without deploying (`wrangler deploy --dry-run`, output
  in `dist/`); catches bundling errors the typecheck misses.
- `pnpm lint`: run `biome check .` (formatter + recommended lint rules).
- `pnpm format`: run `biome format --write .`. Format only the files you touch;
  do not mass-reformat unrelated code.
- `pnpm e2e`: apply `schema.sql` to the local D1, start `wrangler dev` on port
  8791 (`E2E_PORT`), run both smoke suites, stop the server.
- `pnpm e2e:prod`: run only the read-only suite against
  <https://hooks.huyab.click>.
- `pnpm db:local` / `pnpm db:remote`: apply `schema.sql` to the local/remote D1.
- `pnpm deploy`: `wrangler deploy` from a laptop. Pushing to `main` deploys
  through Cloudflare Workers Builds.

Use `pnpm` for all package commands (`pnpm exec wrangler ...`, never `npx`).

## Coding Style & Naming Conventions

Use TypeScript with strict compiler settings. Prefer named exports and type
imports with `import type`. Follow the existing style: two-space indentation,
double quotes, kebab-case file names such as `endpoint-router.ts`, PascalCase
classes such as `D1EndpointRepository`. Do not leave magic strings or magic
numbers in code; extract them into clearly named constants near the relevant
module. Split complex logic into small, named functions with one clear
responsibility.

Hexagonal boundaries:

- Keep business rules in `src/domain/use-cases/`; they depend only on
  `src/domain/ports.ts`, never on Hono, D1 or Workers globals.
- Data access goes through repository ports implemented in
  `src/adapters/outbound/persistence/`; no inline SQL in routers.
- Routers in `src/adapters/inbound/` stay thin: parse request, call a use case,
  render or return JSON.
- New swappable dependencies get a port in `src/domain/ports.ts` plus an
  adapter, wired in `src/config/dependencies.ts`.
- Escape everything rendered from a request, including values echoed into the
  DOM by inline client-side JavaScript.

## Testing Guidelines

Coverage is HTTP smoke in `e2e/`. `pnpm e2e` runs `readonly-smoke.mjs` (login
page, anonymous redirects/401s, favicon, SSO hand-off) and `dev-smoke.mjs`
(register, create an endpoint, hit `/hook/<slug>`, see the request on the
endpoint page, update/clear/delete) against `wrangler dev`; CI runs it in the
`e2e` job. `pnpm e2e:prod` runs only the read-only suite against production:
GET requests only, no sign-up, nothing written. Keep any new prod check
read-only; flows that write belong in `dev-smoke.mjs`. Also run `pnpm check`
and `pnpm build`, and watch the WebSocket feed by hand in `pnpm dev` (the smoke
does not open a socket). If unit tests are added, prefer Vitest with colocated
`*.test.ts` files, starting with `src/domain/use-cases/`.

## Commit & Pull Request Guidelines

Use concise Conventional Commits, for example `feat: scope endpoints to the
account that created them` or `fix: sandbox webhook responses`. Pull requests
should include a short summary, typecheck results, linked issue if available,
and screenshots for visible UI changes.

## Agent-Specific Instructions

Keep responses short and focused. If a requirement is unclear, ask before making
assumptions.
Design UI/UX to fit inside a single viewport by default. Avoid page-level
scrolling; use compact layouts, tabs, panes, or contained internal lists when
content can overflow.
Never commit `.dev.vars` or secrets; `SECRET_KEY` is set with
`wrangler secret put SECRET_KEY` and intentionally has no default.
