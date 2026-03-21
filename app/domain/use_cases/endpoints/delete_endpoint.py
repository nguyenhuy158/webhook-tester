from __future__ import annotations

from app.domain.exceptions import EndpointNotFoundError
from app.domain.ports.repositories.endpoint_repository import EndpointRepository


class DeleteEndpointUseCase:
    def __init__(self, endpoint_repo: EndpointRepository) -> None:
        self._repo = endpoint_repo

    async def execute(self, endpoint_id: int) -> None:
        if not await self._repo.find_by_id(endpoint_id):
            raise EndpointNotFoundError(f"Endpoint {endpoint_id} not found")
        await self._repo.delete(endpoint_id)
