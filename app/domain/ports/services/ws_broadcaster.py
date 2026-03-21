from __future__ import annotations

from abc import ABC, abstractmethod


class WebSocketBroadcaster(ABC):
    @abstractmethod
    async def broadcast(self, endpoint_id: int, data: dict) -> None: ...
