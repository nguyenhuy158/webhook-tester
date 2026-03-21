from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.config.dependencies import (
    get_create_endpoint_use_case,
    get_current_user,
    get_delete_endpoint_use_case,
    get_endpoint_repo,
    get_list_endpoints_use_case,
    get_request_repo,
    get_update_endpoint_use_case,
)
from app.domain.entities.user import User
from app.domain.exceptions import EndpointNotFoundError, SlugAlreadyExistsError

router = APIRouter(tags=["endpoints"])


class CreateEndpointRequest(BaseModel):
    name: str
    slug: str


class UpdateEndpointRequest(BaseModel):
    response_status: int = 200
    response_body: str = '{"status": "ok"}'
    response_content_type: str = "application/json"
    delay_ms: int = 0


@router.get("/endpoints")
async def list_endpoints(
    search: str = "",
    current_user: User = Depends(get_current_user),
    use_case=Depends(get_list_endpoints_use_case),
):
    endpoints = await use_case.execute(search=search)
    return [
        {
            "id": e.id,
            "name": e.name,
            "slug": e.slug,
            "response_status": e.response_status,
            "response_content_type": e.response_content_type,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in endpoints
    ]


@router.post("/endpoints", status_code=status.HTTP_201_CREATED)
async def create_endpoint(
    body: CreateEndpointRequest,
    current_user: User = Depends(get_current_user),
    use_case=Depends(get_create_endpoint_use_case),
):
    try:
        endpoint = await use_case.execute(name=body.name, slug=body.slug)
    except SlugAlreadyExistsError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    return {"id": endpoint.id, "name": endpoint.name, "slug": endpoint.slug}


@router.put("/endpoints/{endpoint_id}")
async def update_endpoint(
    endpoint_id: int,
    body: UpdateEndpointRequest,
    current_user: User = Depends(get_current_user),
    use_case=Depends(get_update_endpoint_use_case),
):
    try:
        endpoint = await use_case.execute(
            endpoint_id=endpoint_id,
            response_status=body.response_status,
            response_body=body.response_body,
            response_content_type=body.response_content_type,
            delay_ms=body.delay_ms,
        )
    except EndpointNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    return {"id": endpoint.id, "name": endpoint.name, "slug": endpoint.slug}


@router.delete("/endpoints/{endpoint_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_endpoint(
    endpoint_id: int,
    current_user: User = Depends(get_current_user),
    use_case=Depends(get_delete_endpoint_use_case),
):
    try:
        await use_case.execute(endpoint_id=endpoint_id)
    except EndpointNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/endpoints/check-slug")
async def check_slug(
    slug: str,
    current_user: User = Depends(get_current_user),
    repo=Depends(get_endpoint_repo),
):
    exists = await repo.slug_exists(slug)
    return {"available": not exists}


@router.delete("/endpoints/{endpoint_id}/requests", status_code=status.HTTP_204_NO_CONTENT)
async def clear_requests(
    endpoint_id: int,
    current_user: User = Depends(get_current_user),
    repo=Depends(get_request_repo),
):
    await repo.delete_by_endpoint(endpoint_id)
