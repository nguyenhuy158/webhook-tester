# Webhook Tester — Cloudflare Workers

Port of the FastAPI app in `../app` to Cloudflare Workers. Same features, same URLs,
same hexagonal layering: `src/domain` stays free of any runtime import, `src/adapters`
holds everything platform-specific.

| Concern | FastAPI version | Worker version |
| --- | --- | --- |
| HTTP framework | FastAPI + uvicorn | Hono |
| Database | Tortoise ORM + SQLite file | D1 (`src/adapters/outbound/persistence`) |
| Realtime | in-process `ConnectionManager` | Durable Object `EndpointHub`, one per endpoint |
| Passwords | passlib + bcrypt | PBKDF2-SHA256 via WebCrypto |
| Tokens | python-jose | HS256 JWT via WebCrypto HMAC |
| Templates | Jinja2 | template functions in `src/adapters/inbound/http/templates` |

Deployed at <https://hooks.huyab.click>.

## Setup

The D1 instance is shared with other projects, so every table is prefixed with
`webhook_tester_` and `schema.sql` only ever creates tables, never drops them.

```sh
npm install
npm run db:remote                     # apply schema.sql to the shared D1
npx wrangler secret put SECRET_KEY    # required: JWT signing key
npm run deploy
```

### Sign-in with Google (optional)

Create an OAuth client of type *Web application* in the Google Cloud console, add
`https://hooks.huyab.click/auth/google/callback` as an authorized redirect URI, then:

```sh
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
```

The "Continue with Google" button appears once both secrets are set, and the
`/auth/google` routes answer 503 until then.

## Local development

```sh
cp .dev.vars.example .dev.vars
npm run db:local
npm run dev            # http://localhost:8787
```

## Routes

| Route | Purpose |
| --- | --- |
| `GET /login`, `GET /logout` | login/register screen, cookie teardown |
| `POST /auth/token`, `POST /auth/register`, `POST /auth/logout` | login, self-service signup, logout |
| `GET /auth/google`, `GET /auth/google/callback` | Google OAuth authorization-code flow |
| `GET /`, `GET /endpoint/:id` | dashboard and endpoint detail |
| `GET/POST/PUT/DELETE /api/endpoints...` | endpoint CRUD, slug check, clear history |
| `ALL /hook/:slug` | webhook receiver (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS) |
| `GET /ws/endpoint/:id` | live request feed (WebSocket) |

## Notes on behaviour differences

- **No default user.** The FastAPI version seeded a `huy/huy` account at startup.
  Accounts are now created by the visitor, either through `/auth/register` or by
  signing in with Google.
- **Unauthenticated pages** redirect to `/login` instead of returning a 401 body.
- **Response delay** is capped at 30s so a request cannot outlive the Worker.
- **Request history** in the dashboard is escaped before being inserted into the DOM.
- **`CF-Connecting-IP`** provides the client address in place of `request.client.host`.
- **`SECRET_KEY` has no default.** Requests fail with a 500 until it is set, so a
  deployment can never fall back to a value published in this repository.
