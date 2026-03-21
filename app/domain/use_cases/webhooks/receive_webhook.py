from __future__ import annotations

import asyncio

from app.domain.entities.incoming_request import EndpointResponse, IncomingRequest
from app.domain.entities.webhook_request import WebhookRequest
from app.domain.exceptions import EndpointNotFoundError
from app.domain.ports.repositories.endpoint_repository import EndpointRepository
from app.domain.ports.repositories.request_repository import RequestRepository
from app.domain.ports.services.ws_broadcaster import WebSocketBroadcaster


class ReceiveWebhookUseCase:
    def __init__(
        self,
        endpoint_repo: EndpointRepository,
        request_repo: RequestRepository,
        ws_broadcaster: WebSocketBroadcaster,
    ) -> None:
        self._endpoint_repo = endpoint_repo
        self._request_repo = request_repo
        self._ws_broadcaster = ws_broadcaster

    async def execute(self, slug: str, incoming: IncomingRequest) -> EndpointResponse:
        endpoint = await self._endpoint_repo.find_by_slug(slug)
        if not endpoint:
            raise EndpointNotFoundError(f"No endpoint with slug '{slug}'")

        request = WebhookRequest(
            endpoint_id=endpoint.id,
            method=incoming.method,
            headers=incoming.headers,
            body=incoming.body,
            query_params=incoming.query_params,
            remote_addr=incoming.remote_addr,
        )
        saved = await self._request_repo.save(request)

        await self._ws_broadcaster.broadcast(
            endpoint.id,
            {
                "id": saved.id,
                "method": saved.method,
                "remote_addr": saved.remote_addr,
                "timestamp": saved.timestamp.isoformat() if saved.timestamp else None,
                "headers": saved.headers,
                "query_params": saved.query_params,
                "body": saved.body,
            },
        )

        if endpoint.delay_ms > 0:
            await asyncio.sleep(endpoint.delay_ms / 1000)

        return EndpointResponse(
            status=endpoint.response_status,
            body=endpoint.response_body,
            content_type=endpoint.response_content_type,
        )
