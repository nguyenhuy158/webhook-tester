from __future__ import annotations

from app.domain.entities.endpoint import Endpoint
from app.domain.ports.repositories.endpoint_repository import EndpointRepository


class SlugAlreadyExistsError(Exception):
    pass


class CreateEndpointUseCase:
    def __init__(self, endpoint_repo: EndpointRepository) -> None:
        self._repo = endpoint_repo

    async def execute(self, name: str, slug: str) -> Endpoint:
        if await self._repo.slug_exists(slug):
            raise SlugAlreadyExistsError(f"Slug '{slug}' is already taken")
        endpoint = Endpoint(name=name, slug=slug)
        return await self._repo.create(endpoint)
