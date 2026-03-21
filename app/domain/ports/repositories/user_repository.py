from __future__ import annotations

from abc import ABC, abstractmethod
from app.domain.entities.user import User


class UserRepository(ABC):
    @abstractmethod
    async def find_by_username(self, username: str) -> User | None: ...

    @abstractmethod
    async def find_by_id(self, user_id: int) -> User | None: ...

    @abstractmethod
    async def create(self, user: User) -> User: ...
