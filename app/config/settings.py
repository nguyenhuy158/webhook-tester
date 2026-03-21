from __future__ import annotations

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 24 hours
    database_url: str = "sqlite://webhook.db"
    default_username: str = "huy"
    default_password: str = "huy"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
