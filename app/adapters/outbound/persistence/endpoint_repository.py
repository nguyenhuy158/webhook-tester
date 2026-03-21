from __future__ import annotations

from tortoise.expressions import Q

from app.adapters.outbound.persistence.models import EndpointModel
from app.domain.entities.endpoint import Endpoint
from app.domain.ports.repositories.endpoint_repository import EndpointRepository


def _to_entity(m: EndpointModel) -> Endpoint:
    return Endpoint(
        id=m.id,
        name=m.name,
        slug=m.slug,
        response_status=m.response_status,
        response_body=m.response_body,
        response_content_type=m.response_content_type,
        delay_ms=m.delay_ms,
        created_at=m.created_at,
    )


class TortoiseEndpointRepository(EndpointRepository):
    async def find_by_id(self, endpoint_id: int) -> Endpoint | None:
        m = await EndpointModel.get_or_none(id=endpoint_id)
        return _to_entity(m) if m else None

    async def find_by_slug(self, slug: str) -> Endpoint | None:
        m = await EndpointModel.get_or_none(slug=slug)
        return _to_entity(m) if m else None

    async def list_all(self, search: str = "") -> list[Endpoint]:
        qs = EndpointModel.all().order_by("-created_at")
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(slug__icontains=search))
        return [_to_entity(m) for m in await qs]

    async def create(self, endpoint: Endpoint) -> Endpoint:
        m = await EndpointModel.create(
            name=endpoint.name,
            slug=endpoint.slug,
            response_status=endpoint.response_status,
            response_body=endpoint.response_body,
            response_content_type=endpoint.response_content_type,
            delay_ms=endpoint.delay_ms,
        )
        return _to_entity(m)

    async def update(self, endpoint: Endpoint) -> Endpoint:
        await EndpointModel.filter(id=endpoint.id).update(
            name=endpoint.name,
            response_status=endpoint.response_status,
            response_body=endpoint.response_body,
            response_content_type=endpoint.response_content_type,
            delay_ms=endpoint.delay_ms,
        )
        m = await EndpointModel.get(id=endpoint.id)
        return _to_entity(m)

    async def delete(self, endpoint_id: int) -> None:
        await EndpointModel.filter(id=endpoint_id).delete()

    async def slug_exists(self, slug: str) -> bool:
        return await EndpointModel.filter(slug=slug).exists()
