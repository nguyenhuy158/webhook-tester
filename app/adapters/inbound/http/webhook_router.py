from __future__ import annotations

import json

from fastapi import APIRouter, Request
from fastapi.responses import Response

from app.domain.entities.incoming_request import IncomingRequest
from app.domain.exceptions import EndpointNotFoundError

router = APIRouter(tags=["webhooks"])

# This will be set by main.py after the ConnectionManager is created
_receive_use_case_factory = None


def set_receive_use_case_factory(factory):
    global _receive_use_case_factory
    _receive_use_case_factory = factory


@router.api_route("/hook/{slug}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"])
async def receive_webhook(slug: str, request: Request):
    if _receive_use_case_factory is None:
        return Response(content="Service not ready", status_code=503)

    body = (await request.body()).decode("utf-8", errors="replace")
    incoming = IncomingRequest(
        method=request.method,
        headers=dict(request.headers),
        body=body,
        query_params=dict(request.query_params),
        remote_addr=request.client.host if request.client else "unknown",
    )

    use_case = _receive_use_case_factory()
    try:
        result = await use_case.execute(slug=slug, incoming=incoming)
    except EndpointNotFoundError:
        return Response(content="Endpoint not found", status_code=404)

    return Response(
        content=result.body,
        status_code=result.status,
        media_type=result.content_type,
    )
