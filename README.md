# Webhook Tester

Self-hosted webhook inspector on Cloudflare Workers, live at
<https://hooks.huyab.click>.

Create an endpoint, point any system at `https://hooks.huyab.click/hook/<slug>`,
and watch requests arrive live — method, headers, body, query params and caller
IP. Each endpoint replies with the status code, content type, body and delay you
configure, so it doubles as a mock server.

Sign in with Google through the shared [SSO service](https://github.com/nguyenhuy158/sso),
or register a username and password.

## Architecture

Hexagonal: `src/domain` holds entities, ports and use cases and imports nothing
from the runtime; `src/adapters` holds everything platform-specific.

| Concern | Implementation |
| --- | --- |
| HTTP | Hono, `src/adapters/inbound/http` |
| Database | D1, `src/adapters/outbound/persistence` |
| Realtime | Durable Object `EndpointHub`, one per endpoint |
| Auth | `huyab_sso` cookie verified against the issuer's JWKS, or a local PBKDF2 password |
| UI | server-rendered templates, no build step, no client dependencies |

The D1 instance is shared with other projects, so every table carries the
`webhook_tester_` prefix and `schema.sql` only ever creates tables, never drops
them.

## Setup

```sh
pnpm install
pnpm run db:remote                    # apply schema.sql to the shared D1
npx wrangler secret put SECRET_KEY    # required: JWT signing key
pnpm run deploy
```

Pushing to `main` deploys through Workers Builds; `pnpm run deploy` is only for
deploying from a laptop.

## Local development

```sh
cp .dev.vars.example .dev.vars
pnpm run db:local
pnpm run dev            # http://localhost:8787
```

## Routes

| Route | Purpose |
| --- | --- |
| `GET /login`, `GET /logout` | login/register screen, cookie teardown |
| `POST /auth/token`, `POST /auth/register`, `POST /auth/logout` | login, self-service signup, logout |
| `GET /auth/sso`, `GET /auth/sso/logout` | hand off to the shared SSO service |
| `GET /`, `GET /endpoint/:id` | dashboard and endpoint detail |
| `GET/POST/PUT/DELETE /api/endpoints...` | endpoint CRUD, slug check, clear history |
| `ALL /hook/:slug` | webhook receiver (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS) |
| `GET /ws/endpoint/:id` | live request feed (WebSocket) |

## Things worth knowing

- **No default account.** Everyone registers, or arrives with a valid SSO cookie
  and is provisioned on first sight.
- **`SECRET_KEY` has no default.** Requests fail with a 500 until it is set, so a
  deployment can never fall back to a value published here.
- **Sign-in with Google** belongs to the SSO service at `auth.huyab.click`, which
  owns the only Google OAuth client on the domain. This app holds no Google
  credentials. Point `SSO_ISSUER` in `wrangler.jsonc` elsewhere to change issuer.
- **The response delay is capped at 30s**, so a request cannot outlive the Worker.
- **Everything rendered from a request is escaped**, including values echoed into
  the DOM by client-side JavaScript.
- **`CF-Connecting-IP`** supplies the caller's address.
- **Webhook responses are sandboxed.** An endpoint's body and content type are
  chosen by its owner and served from the same origin as the dashboard, so
  `/hook/<slug>` responses carry `Content-Security-Policy: sandbox` and
  `X-Content-Type-Options: nosniff`. Returning `text/html` still works; it just
  cannot script against this origin.
- **Endpoints are not yet scoped to their creator** — any signed-in user can see
  every endpoint and its recorded requests.

## History

Version 1 was a FastAPI app in Docker on a home server, reached over a Cloudflare
Tunnel. It was ported to Workers in `1543d9f` and the Python version removed in
`a93df9d`; it remains in the history at `3171129`.
