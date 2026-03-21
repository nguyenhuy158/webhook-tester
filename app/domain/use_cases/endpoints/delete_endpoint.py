from __future__ import annotations

from app.domain.ports.repositories.endpoint_repository import EndpointRepository


class DeleteEndpointUseCase:
    def __init__(self, endpoint_repo: EndpointRepository) -> None:
        self._repo = endpoint_repo

    async def execute(self, endpoint_id: int) -> None:
        await self._repo.delete(endpoint_id)
