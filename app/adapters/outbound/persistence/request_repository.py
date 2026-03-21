from __future__ import annotations

import json

from app.adapters.outbound.persistence.models import RequestModel
from app.domain.entities.webhook_request import WebhookRequest
from app.domain.ports.repositories.request_repository import RequestRepository


def _to_entity(m: RequestModel) -> WebhookRequest:
    try:
        headers = json.loads(m.headers)
    except (json.JSONDecodeError, TypeError):
        headers = {}
    try:
        query_params = json.loads(m.query_params)
    except (json.JSONDecodeError, TypeError):
        query_params = {}
    return WebhookRequest(
        id=m.id,
        endpoint_id=m.endpoint_id,
        method=m.method,
        headers=headers,
        body=m.body,
        query_params=query_params,
        remote_addr=m.remote_addr,
        timestamp=m.timestamp,
    )


class TortoiseRequestRepository(RequestRepository):
    async def save(self, request: WebhookRequest) -> WebhookRequest:
        m = await RequestModel.create(
            endpoint_id=request.endpoint_id,
            method=request.method,
            headers=json.dumps(request.headers),
            body=request.body,
            query_params=json.dumps(request.query_params),
            remote_addr=request.remote_addr,
        )
        return _to_entity(m)

    async def list_by_endpoint(self, endpoint_id: int, limit: int = 50) -> list[WebhookRequest]:
        models = await RequestModel.filter(endpoint_id=endpoint_id).order_by("-timestamp").limit(limit)
        return [_to_entity(m) for m in models]

    async def delete_by_endpoint(self, endpoint_id: int) -> None:
        await RequestModel.filter(endpoint_id=endpoint_id).delete()
