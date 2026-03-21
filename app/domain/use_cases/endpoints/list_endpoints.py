from __future__ import annotations

from app.domain.entities.endpoint import Endpoint
from app.domain.ports.repositories.endpoint_repository import EndpointRepository


class ListEndpointsUseCase:
    def __init__(self, endpoint_repo: EndpointRepository) -> None:
        self._repo = endpoint_repo

    async def execute(self, search: str = "") -> list[Endpoint]:
        return await self._repo.list_all(search=search)
