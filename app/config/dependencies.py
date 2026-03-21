from __future__ import annotations

from fastapi import Cookie, HTTPException, Request, status

from app.adapters.outbound.persistence.endpoint_repository import TortoiseEndpointRepository
from app.adapters.outbound.persistence.request_repository import TortoiseRequestRepository
from app.adapters.outbound.persistence.user_repository import TortoiseUserRepository
from app.adapters.outbound.security.jwt_service import JWTService
from app.config.settings import settings
from app.domain.entities.user import User
from app.domain.ports.repositories.endpoint_repository import EndpointRepository
from app.domain.ports.repositories.request_repository import RequestRepository
from app.domain.ports.repositories.user_repository import UserRepository
from app.domain.ports.services.auth_port import AuthService
from app.domain.use_cases.auth.authenticate_user import AuthenticateUserUseCase
from app.domain.use_cases.endpoints.create_endpoint import CreateEndpointUseCase
from app.domain.use_cases.endpoints.delete_endpoint import DeleteEndpointUseCase
from app.domain.use_cases.endpoints.list_endpoints import ListEndpointsUseCase
from app.domain.use_cases.endpoints.update_endpoint import UpdateEndpointUseCase
from app.domain.use_cases.webhooks.receive_webhook import ReceiveWebhookUseCase


# ── Repository factories ──────────────────────────────────────────────────────

def get_endpoint_repo() -> EndpointRepository:
    return TortoiseEndpointRepository()


def get_request_repo() -> RequestRepository:
    return TortoiseRequestRepository()


def get_user_repo() -> UserRepository:
    return TortoiseUserRepository()


def get_auth_service() -> AuthService:
    return JWTService(
        secret_key=settings.secret_key,
        algorithm=settings.algorithm,
        expire_minutes=settings.access_token_expire_minutes,
    )


# ── Use case factories ────────────────────────────────────────────────────────

def get_list_endpoints_use_case() -> ListEndpointsUseCase:
    return ListEndpointsUseCase(get_endpoint_repo())


def get_create_endpoint_use_case() -> CreateEndpointUseCase:
    return CreateEndpointUseCase(get_endpoint_repo())


def get_update_endpoint_use_case() -> UpdateEndpointUseCase:
    return UpdateEndpointUseCase(get_endpoint_repo())


def get_delete_endpoint_use_case() -> DeleteEndpointUseCase:
    return DeleteEndpointUseCase(get_endpoint_repo())


def get_auth_use_case() -> AuthenticateUserUseCase:
    return AuthenticateUserUseCase(get_user_repo(), get_auth_service())


def get_receive_webhook_use_case(ws_broadcaster=None) -> ReceiveWebhookUseCase:
    # ws_broadcaster injected by the WebSocket router at runtime
    return ReceiveWebhookUseCase(get_endpoint_repo(), get_request_repo(), ws_broadcaster)


# ── Auth dependency ───────────────────────────────────────────────────────────

async def get_current_user(
    request: Request,
    access_token: str | None = Cookie(default=None),
) -> User:
    token = access_token or request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    auth_service = get_auth_service()
    user_id = auth_service.decode_token(token)
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user_repo = get_user_repo()
    user = await user_repo.find_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user
