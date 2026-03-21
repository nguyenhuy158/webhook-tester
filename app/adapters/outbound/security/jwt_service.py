from __future__ import annotations

from datetime import datetime, timedelta

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.domain.ports.services.auth_port import AuthService


class JWTService(AuthService):
    def __init__(self, secret_key: str, algorithm: str = "HS256", expire_minutes: int = 60 * 24) -> None:
        self._secret = secret_key
        self._algorithm = algorithm
        self._expire_minutes = expire_minutes
        self._pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    def create_token(self, user_id: int) -> str:
        payload = {
            "sub": str(user_id),
            "exp": datetime.utcnow() + timedelta(minutes=self._expire_minutes),
        }
        return jwt.encode(payload, self._secret, algorithm=self._algorithm)

    def decode_token(self, token: str) -> int | None:
        try:
            payload = jwt.decode(token, self._secret, algorithms=[self._algorithm])
            return int(payload["sub"])
        except (JWTError, KeyError, ValueError):
            return None

    def hash_password(self, plain: str) -> str:
        return self._pwd_context.hash(plain)

    def verify_password(self, plain: str, hashed: str) -> bool:
        return self._pwd_context.verify(plain, hashed)
