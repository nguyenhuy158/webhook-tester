from __future__ import annotations

from tortoise import Tortoise

TORTOISE_ORM = {
    "connections": {"default": "sqlite://webhook.db"},
    "apps": {
        "models": {
            "models": ["app.adapters.outbound.persistence.models", "aerich.models"],
            "default_connection": "default",
        }
    },
}


async def init_tortoise(db_url: str = "sqlite://webhook.db") -> None:
    await Tortoise.init(
        db_url=db_url,
        modules={"models": ["app.adapters.outbound.persistence.models"]},
    )
    await Tortoise.generate_schemas(safe=True)


async def close_tortoise() -> None:
    await Tortoise.close_connections()
