from __future__ import annotations

from tortoise import Tortoise

from app.config.settings import settings

TORTOISE_ORM = {
    "connections": {"default": settings.database_url},
    "apps": {
        "models": {
            "models": ["app.adapters.outbound.persistence.models", "aerich.models"],
            "default_connection": "default",
        }
    },
}


async def init_tortoise(db_url: str = settings.database_url) -> None:
    await Tortoise.init(
        db_url=db_url,
        modules={"models": ["app.adapters.outbound.persistence.models"]},
        _enable_global_fallback=True,  # Required for Tortoise ORM 1.x global state
    )
    await Tortoise.generate_schemas(safe=True)


async def close_tortoise() -> None:
    await Tortoise.close_connections()
