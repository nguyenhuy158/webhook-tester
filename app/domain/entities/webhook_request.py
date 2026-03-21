from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass
class WebhookRequest:
    endpoint_id: int
    method: str
    headers: dict
    body: str
    query_params: dict
    remote_addr: str
    id: int | None = None
    timestamp: datetime | None = None
