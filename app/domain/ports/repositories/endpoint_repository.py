from __future__ import annotations

from abc import ABC, abstractmethod
from app.domain.entities.endpoint import Endpoint


class EndpointRepository(ABC):
    @abstractmethod
    async def find_by_id(self, endpoint_id: int) -> Endpoint | None: ...

    @abstractmethod
    async def find_by_slug(self, slug: str) -> Endpoint | None: ...

    @abstractmethod
    async def list_all(self, search: str = "") -> list[Endpoint]: ...

    @abstractmethod
    async def create(self, endpoint: Endpoint) -> Endpoint: ...

    @abstractmethod
    async def update(self, endpoint: Endpoint) -> Endpoint: ...

    @abstractmethod
    async def delete(self, endpoint_id: int) -> None: ...

    @abstractmethod
    async def slug_exists(self, slug: str) -> bool: ...
