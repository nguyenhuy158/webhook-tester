from __future__ import annotations

from fastapi import APIRouter, Cookie, WebSocket, WebSocketDisconnect

from app.config.dependencies import get_auth_service, get_user_repo
from app.domain.ports.services.ws_broadcaster import WebSocketBroadcaster

router = APIRouter(tags=["websocket"])


class ConnectionManager(WebSocketBroadcaster):
    """In-memory WebSocket connection manager implementing WebSocketBroadcaster port."""

    def __init__(self) -> None:
        self._connections: dict[int, list[WebSocket]] = {}

    async def connect(self, endpoint_id: int, ws: WebSocket) -> None:
        await ws.accept()
        self._connections.setdefault(endpoint_id, []).append(ws)

    def disconnect(self, endpoint_id: int, ws: WebSocket) -> None:
        connections = self._connections.get(endpoint_id, [])
        if ws in connections:
            connections.remove(ws)

    async def broadcast(self, endpoint_id: int, data: dict) -> None:
        dead: list[WebSocket] = []
        for ws in self._connections.get(endpoint_id, []):
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(endpoint_id, ws)


# Module-level singleton — shared across all requests
manager = ConnectionManager()


@router.websocket("/ws/endpoint/{endpoint_id}")
async def websocket_endpoint(
    endpoint_id: int,
    websocket: WebSocket,
    access_token: str | None = Cookie(default=None),
):
    # Authenticate via JWT cookie
    auth_service = get_auth_service()
    token = access_token or websocket.cookies.get("access_token")
    if not token or auth_service.decode_token(token) is None:
        await websocket.close(code=4001)
        return

    await manager.connect(endpoint_id, websocket)
    try:
        while True:
            # Keep connection alive; client sends ping or we just wait
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(endpoint_id, websocket)
