from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass
class Endpoint:
    name: str
    slug: str
    id: int | None = None
    response_status: int = 200
    response_body: str = '{"status": "ok"}'
    response_content_type: str = "application/json"
    delay_ms: int = 0
    created_at: datetime | None = None
