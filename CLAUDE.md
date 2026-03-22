# CLAUDE.md — Webhook Tester

Self-hosted webhook testing service (like webhook.site) built with FastAPI. Create endpoints, receive HTTP requests in real time via WebSocket, configure custom responses.

## Stack

Python 3.11 · FastAPI 0.115+ · Uvicorn · Tortoise ORM + SQLite (aiosqlite) · JWT (python-jose) + bcrypt · Jinja2 · pydantic-settings · Docker

## Architecture: Hexagonal (Ports & Adapters)

```
app/
├── main.py                     # Entry point, lifespan, router registration
├── config/
│   ├── settings.py             # Pydantic BaseSettings (reads .env)
│   ├── database.py             # Tortoise ORM init
│   └── dependencies.py         # FastAPI DI factories — start here
├── domain/                     # Pure business logic, NO external deps
│   ├── entities/               # User, Endpoint, WebhookRequest, IncomingRequest
│   ├── ports/repositories/     # Abstract repo interfaces
│   ├── ports/services/         # Auth + WS broadcaster interfaces
│   ├── use_cases/              # One class per operation, async execute()
│   └── exceptions.py
└── adapters/
    ├── inbound/http/           # FastAPI routers: auth, endpoint, webhook, pages
    ├── inbound/ws/             # WebSocket router + ConnectionManager singleton
    └── outbound/
        ├── persistence/        # Tortoise models + repo implementations
        └── security/           # JWT service
```

**Rule:** `domain/` must never import from `adapters/` or `config/`.

## API

| Method | Path | Notes |
|--------|------|-------|
| POST | `/auth/token` | Login (form: username/password), sets JWT cookie |
| GET/POST | `/`, `/login`, `/endpoint/{id}` | HTML pages |
| GET | `/api/endpoints` | List (`?search=`) |
| POST | `/api/endpoints` | Create (`name`, `slug`) |
| PUT | `/api/endpoints/{id}` | Update response config |
| DELETE | `/api/endpoints/{id}` | Delete endpoint |
| DELETE | `/api/endpoints/{id}/requests` | Clear history |
| ANY | `/hook/{slug}` | Receive webhook → save → broadcast → respond |
| WS | `/ws/endpoint/{id}` | Real-time push (JWT cookie required) |

## Database Models (`adapters/outbound/persistence/models.py`)

- `EndpointModel` — id, name, slug (unique), response_status, response_body, response_content_type, delay_ms, created_at
- `RequestModel` — id, endpoint FK, method, headers (JSON), body, query_params (JSON), remote_addr, timestamp
- `UserModel` — id, username (unique), password (bcrypt)

## Config (`.env` or environment)

| Variable | Default |
|----------|---------|
| `SECRET_KEY` | `change-me-in-production` |
| `DATABASE_URL` | `sqlite://webhook.db` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` |
| `DEFAULT_USERNAME` / `DEFAULT_PASSWORD` | `huy` / `huy` |

## Dev Workflow

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000  # http://localhost:8000

docker compose up --build   # port 8899
```

Push to `main` → CI deploys via Tailscale SSH (`docker compose up --build -d`).

## Conventions

- **Naming:** `CreateEndpointUseCase`, `TortoiseEndpointRepository`, snake_case functions, `_private` attrs
- **Use cases:** single `async execute()`, deps injected via constructor
- **DI:** `Depends()` factory functions in `dependencies.py`
- **Entities:** pure `@dataclass`, no ORM references
- **Type hints:** `from __future__ import annotations` + full annotations everywhere
- **Async:** no blocking calls anywhere

## Testing

No tests yet. When adding: `pytest` + `pytest-asyncio`, `httpx` with `ASGITransport`, mock repo ports.
