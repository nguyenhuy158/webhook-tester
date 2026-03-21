from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.adapters.inbound.http.auth_router import router as auth_router
from app.adapters.inbound.http.endpoint_router import router as endpoint_router
from app.adapters.inbound.http.pages_router import router as pages_router
from app.adapters.inbound.http.webhook_router import router as webhook_router
from app.adapters.inbound.http.webhook_router import set_receive_use_case_factory
from app.adapters.inbound.ws.ws_router import manager, router as ws_router
from app.config.database import close_tortoise, init_tortoise
from app.config.dependencies import get_auth_service, get_receive_webhook_use_case, get_user_repo
from app.config.settings import settings


async def _seed_default_user() -> None:
    user_repo = get_user_repo()
    auth_service = get_auth_service()
    existing = await user_repo.find_by_username(settings.default_username)
    if not existing:
        from app.domain.entities.user import User
        hashed = auth_service.hash_password(settings.default_password)
        await user_repo.create(User(username=settings.default_username, password_hash=hashed))


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_tortoise()
    await _seed_default_user()
    # Wire the WebSocket broadcaster into the webhook use case
    set_receive_use_case_factory(lambda: get_receive_webhook_use_case(ws_broadcaster=manager))
    yield
    await close_tortoise()


app = FastAPI(
    title="Webhook Tester",
    description="Advanced webhook testing tool with real-time updates",
    version="2.0.0",
    lifespan=lifespan,
)

app.include_router(auth_router)
app.include_router(endpoint_router, prefix="/api")
app.include_router(webhook_router)
app.include_router(pages_router)
app.include_router(ws_router)
