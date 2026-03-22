# CLAUDE.md — Webhook Tester

This file provides AI assistants with context about the codebase, development workflows, and conventions for this project.

## Project Overview

A self-hosted webhook testing service (similar to webhook.site / RequestBin) built with FastAPI. Users can create webhook endpoints, receive and inspect incoming HTTP requests in real time via WebSocket, and configure custom HTTP responses.

## Technology Stack

- **Language:** Python 3.11
- **Framework:** FastAPI 0.115+ (async, ASGI)
- **Server:** Uvicorn 0.32+
- **ORM:** Tortoise ORM 0.21+ (async)
- **Database:** SQLite (via aiosqlite)
- **Auth:** JWT (python-jose), bcrypt via passlib
- **Templates:** Jinja2
- **Config:** pydantic-settings (env vars / `.env` file)
- **Container:** Docker + Docker Compose

## Architecture: Hexagonal (Ports & Adapters)

```
app/
├── main.py                  # App entry point, lifespan, router registration
├── config/
│   ├── settings.py          # Pydantic BaseSettings (reads .env)
│   ├── database.py          # Tortoise ORM init / schema generation
│   └── dependencies.py      # FastAPI dependency injection factory
├── domain/                  # Pure business logic — NO external deps here
│   ├── entities/            # Dataclasses: User, Endpoint, WebhookRequest, IncomingRequest
│   ├── ports/
│   │   ├── repositories/    # Abstract repository interfaces
│   │   └── services/        # Abstract service interfaces (auth, WS broadcaster)
│   ├── use_cases/           # One class per operation, async execute() method
│   │   ├── auth/            # authenticate_user
│   │   ├── endpoints/       # create, delete, list, update
│   │   └── webhooks/        # receive_webhook
│   └── exceptions.py        # Domain exceptions
└── adapters/
    ├── inbound/
    │   ├── http/            # FastAPI routers (auth, endpoint, webhook, pages)
    │   └── ws/              # WebSocket router + ConnectionManager
    └── outbound/
        ├── persistence/     # Tortoise ORM models + repository implementations
        └── security/        # JWT service (jwt_service.py)
```

**Key rule:** Domain layer (`domain/`) must not import from `adapters/` or `config/`. Data flows inward via port interfaces.

## API Surface

### Authentication
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/token` | Login with form fields `username` / `password`; sets JWT cookie |
| POST | `/auth/logout` | Clears JWT cookie |
| GET | `/logout` | Redirect logout (HTML) |

### Pages (HTML / Jinja2)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Dashboard — list endpoints, create form |
| GET | `/login` | Login page |
| GET | `/endpoint/{endpoint_id}` | Endpoint detail + request history |

### REST API (JSON)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/endpoints` | List endpoints (optional `?search=`) |
| POST | `/api/endpoints` | Create endpoint (`name`, `slug`) |
| PUT | `/api/endpoints/{id}` | Update response config (`response_status`, `response_body`, `response_content_type`, `delay_ms`) |
| DELETE | `/api/endpoints/{id}` | Delete endpoint |
| GET | `/api/endpoints/check-slug` | Check slug availability |
| DELETE | `/api/endpoints/{id}/requests` | Clear request history |

### Webhook Receiver
| Method | Path | Description |
|--------|------|-------------|
| ANY | `/hook/{slug}` | Accepts any HTTP method; saves request and returns configured response |

### WebSocket
| Path | Description |
|------|-------------|
| `/ws/endpoint/{endpoint_id}` | Real-time push when new webhooks arrive (requires valid JWT cookie) |

## Database Models (Tortoise ORM)

```
EndpointModel   — id, name, slug (unique), response_status, response_body,
                  response_content_type, delay_ms, created_at
RequestModel    — id, endpoint (FK→Endpoint), method, headers (JSON str),
                  body, query_params (JSON str), remote_addr, timestamp
UserModel       — id, username (unique), password (bcrypt hash)
```

Models live in `app/adapters/outbound/persistence/models.py`.

## Configuration (Environment Variables)

Override via `.env` file or environment. Defaults from `app/config/settings.py`:

| Variable | Default | Notes |
|----------|---------|-------|
| `SECRET_KEY` | `change-me-in-production` | JWT signing key — **change in production** |
| `ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | 24 hours |
| `DATABASE_URL` | `sqlite://webhook.db` | Tortoise ORM DSN |
| `DEFAULT_USERNAME` | `huy` | Seeded on first startup |
| `DEFAULT_PASSWORD` | `huy` | Seeded on first startup |

## Development Workflow

### Local (without Docker)

```bash
# Install dependencies
pip install -r requirements.txt

# Run the app (SQLite DB auto-created as webhook.db)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

App is available at `http://localhost:8000`. FastAPI auto-docs at `/docs`.

### With Docker Compose

```bash
# Build and start (exposed on host port 8899)
docker compose up --build

# Stop
docker compose down
```

The compose file mounts the `app/` directory for hot-reload during development.

### Deployment (CI/CD)

Pushing to `main` triggers `.github/workflows/deploy.yml`:
1. Connects to remote server via Tailscale + SSH
2. Runs `docker compose up --build -d` on the server

## Code Conventions

### Naming
- **Classes:** PascalCase (`CreateEndpointUseCase`, `TortoiseEndpointRepository`)
- **Functions / variables:** snake_case
- **Constants:** UPPER_SNAKE_CASE
- **Private attributes:** `_underscore_prefix`
- **Repository implementations:** `Tortoise` prefix (e.g., `TortoiseUserRepository`)
- **Use case classes:** `<Action><Entity>UseCase`

### Patterns
- **Use cases** have a single async `execute()` method; accept dependencies via constructor
- **Dependency injection** is done via FastAPI `Depends()` factory functions in `dependencies.py`
- **Repositories** are abstract base classes in `domain/ports/repositories/`; concrete implementations in `adapters/outbound/persistence/`
- **Domain entities** are pure `@dataclass` or Pydantic models — no ORM references
- **WebSocket broadcasting** is handled by a global `ConnectionManager` singleton in `ws_router.py`, injected into the webhook use case
- Full **async/await** throughout — no blocking calls

### File Organisation
- Each use case in its own file under `domain/use_cases/<domain>/`
- Each HTTP router in `adapters/inbound/http/<name>_router.py`
- All dependency wiring in `config/dependencies.py`
- Exceptions in `domain/exceptions.py`

### Type Hints
- `from __future__ import annotations` at top of every file
- Full type annotations on all function signatures

## Testing

**There are currently no tests in this repository.** When adding tests:
- Use `pytest` with `pytest-asyncio` for async tests
- Use `httpx` with `ASGITransport` for FastAPI integration tests
- Mock repository ports so use cases can be tested without a real database

## Key Files to Read First

When making changes, start with:
1. `app/main.py` — understand lifespan, router wiring, startup seed
2. `app/config/dependencies.py` — understand how components are composed
3. `app/domain/` — understand business rules before touching adapters
4. The relevant router in `app/adapters/inbound/http/`
