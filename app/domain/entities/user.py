from __future__ import annotations

from dataclasses import dataclass


@dataclass
class User:
    username: str
    id: int | None = None
    password_hash: str | None = None
