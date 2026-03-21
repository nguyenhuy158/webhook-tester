from __future__ import annotations

from abc import ABC, abstractmethod
from app.domain.entities.webhook_request import WebhookRequest


class RequestRepository(ABC):
    @abstractmethod
    async def save(self, request: WebhookRequest) -> WebhookRequest: ...

    @abstractmethod
    async def list_by_endpoint(self, endpoint_id: int, limit: int = 50) -> list[WebhookRequest]: ...

    @abstractmethod
    async def delete_by_endpoint(self, endpoint_id: int) -> None: ...
