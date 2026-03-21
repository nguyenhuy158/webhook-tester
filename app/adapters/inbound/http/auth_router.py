from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.security import OAuth2PasswordRequestForm

from app.config.dependencies import get_auth_service, get_auth_use_case, get_current_user
from app.domain.entities.user import User
from app.domain.exceptions import InvalidCredentialsError

router = APIRouter(tags=["auth"])


@router.post("/auth/token")
async def login(
    response: Response,
    form: OAuth2PasswordRequestForm = Depends(),
    auth_use_case=Depends(get_auth_use_case),
    auth_service=Depends(get_auth_service),
):
    try:
        user = await auth_use_case.execute(form.username, form.password)
    except InvalidCredentialsError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = auth_service.create_token(user.id)
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=60 * 60 * 24,
    )
    return {"message": "Login successful"}


@router.post("/auth/logout")
async def logout(response: Response, current_user: User = Depends(get_current_user)):
    response.delete_cookie("access_token")
    return {"message": "Logged out"}
