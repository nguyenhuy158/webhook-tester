from __future__ import annotations

from app.adapters.outbound.persistence.models import UserModel
from app.domain.entities.user import User
from app.domain.ports.repositories.user_repository import UserRepository


def _to_entity(m: UserModel) -> User:
    return User(id=m.id, username=m.username, password_hash=m.password)


class TortoiseUserRepository(UserRepository):
    async def find_by_username(self, username: str) -> User | None:
        m = await UserModel.get_or_none(username=username)
        return _to_entity(m) if m else None

    async def find_by_id(self, user_id: int) -> User | None:
        m = await UserModel.get_or_none(id=user_id)
        return _to_entity(m) if m else None

    async def create(self, user: User) -> User:
        m = await UserModel.create(username=user.username, password=user.password_hash)
        return _to_entity(m)
