from __future__ import annotations

from app.domain.entities.user import User
from app.domain.exceptions import InvalidCredentialsError
from app.domain.ports.repositories.user_repository import UserRepository
from app.domain.ports.services.auth_port import AuthService


class AuthenticateUserUseCase:
    def __init__(self, user_repo: UserRepository, auth_service: AuthService) -> None:
        self._user_repo = user_repo
        self._auth_service = auth_service

    async def execute(self, username: str, password: str) -> User:
        user = await self._user_repo.find_by_username(username)
        if not user or not self._auth_service.verify_password(password, user.password_hash):
            raise InvalidCredentialsError("Invalid username or password")
        return user
