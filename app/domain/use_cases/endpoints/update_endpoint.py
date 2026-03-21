from __future__ import annotations

from app.domain.entities.endpoint import Endpoint
from app.domain.exceptions import EndpointNotFoundError
from app.domain.ports.repositories.endpoint_repository import EndpointRepository


class UpdateEndpointUseCase:
    def __init__(self, endpoint_repo: EndpointRepository) -> None:
        self._repo = endpoint_repo

    async def execute(
        self,
        endpoint_id: int,
        response_status: int,
        response_body: str,
        response_content_type: str,
        delay_ms: int,
    ) -> Endpoint:
        endpoint = await self._repo.find_by_id(endpoint_id)
        if not endpoint:
            raise EndpointNotFoundError(f"Endpoint {endpoint_id} not found")
        endpoint.response_status = response_status
        endpoint.response_body = response_body
        endpoint.response_content_type = response_content_type
        endpoint.delay_ms = delay_ms
        return await self._repo.update(endpoint)
