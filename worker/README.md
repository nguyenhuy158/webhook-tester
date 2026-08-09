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

## Setup

```sh
npm install
npx wrangler d1 create webhook-tester      # copy the id into wrangler.jsonc
npm run db:remote                          # apply schema.sql to the remote D1
npx wrangler secret put SECRET_KEY         # JWT signing key
npx wrangler secret put DEFAULT_PASSWORD   # password for the seeded first user
npm run deploy
```

## Local development

```sh
cp .dev.vars.example .dev.vars
npm run db:local
npm run dev            # http://localhost:8787
```

## Routes

| Route | Purpose |
| --- | --- |
| `GET /login`, `GET /logout` | login screen, cookie teardown |
| `POST /auth/token`, `POST /auth/logout` | form login, logout |
| `GET /`, `GET /endpoint/:id` | dashboard and endpoint detail |
| `GET/POST/PUT/DELETE /api/endpoints...` | endpoint CRUD, slug check, clear history |
| `ALL /hook/:slug` | webhook receiver (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS) |
| `GET /ws/endpoint/:id` | live request feed (WebSocket) |

## Notes on behaviour differences

- **User seeding.** A Worker has no startup hook, so the default user is created on
  the first login attempt when the `users` table is empty (`SeedDefaultUserUseCase`).
- **Unauthenticated pages** redirect to `/login` instead of returning a 401 body.
- **Response delay** is capped at 30s so a request cannot outlive the Worker.
- **Request history** in the dashboard is escaped before being inserted into the DOM.
- **`CF-Connecting-IP`** provides the client address in place of `request.client.host`.
