from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates

from app.config.dependencies import (
    get_current_user,
    get_endpoint_repo,
    get_list_endpoints_use_case,
    get_request_repo,
)
from app.domain.entities.user import User

router = APIRouter(tags=["pages"])
templates = Jinja2Templates(directory="app/templates")


@router.get("/", response_class=HTMLResponse)
async def index(
    request: Request,
    search: str = "",
    current_user: User = Depends(get_current_user),
    use_case=Depends(get_list_endpoints_use_case),
):
    endpoints = await use_case.execute(search=search)
    return templates.TemplateResponse(
        "index.html",
        {"request": request, "endpoints": endpoints, "user": current_user, "search": search},
    )


@router.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})


@router.get("/logout")
async def logout_page():
    response = RedirectResponse(url="/login")
    response.delete_cookie("access_token")
    return response


@router.get("/endpoint/{endpoint_id}", response_class=HTMLResponse)
async def endpoint_detail(
    endpoint_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    endpoint_repo=Depends(get_endpoint_repo),
    request_repo=Depends(get_request_repo),
):
    endpoint = await endpoint_repo.find_by_id(endpoint_id)
    if not endpoint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Endpoint {endpoint_id} not found")
    requests = await request_repo.list_by_endpoint(endpoint_id, limit=50)
    return templates.TemplateResponse(
        "endpoint.html",
        {
            "request": request,
            "endpoint": endpoint,
            "requests": requests,
            "user": current_user,
        },
    )
