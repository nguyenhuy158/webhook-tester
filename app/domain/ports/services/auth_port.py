from __future__ import annotations

from abc import ABC, abstractmethod


class AuthService(ABC):
    @abstractmethod
    def create_token(self, user_id: int) -> str: ...

    @abstractmethod
    def decode_token(self, token: str) -> int | None:
        """Returns user_id or None if invalid."""
        ...

    @abstractmethod
    def hash_password(self, plain: str) -> str: ...

    @abstractmethod
    def verify_password(self, plain: str, hashed: str) -> bool: ...
