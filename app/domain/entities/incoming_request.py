from __future__ import annotations


class IncomingRequest:
    def __init__(
        self,
        method: str,
        headers: dict,
        body: str,
        query_params: dict,
        remote_addr: str,
    ) -> None:
        self.method = method
        self.headers = headers
        self.body = body
        self.query_params = query_params
        self.remote_addr = remote_addr


class EndpointResponse:
    def __init__(self, status: int, body: str, content_type: str) -> None:
        self.status = status
        self.body = body
        self.content_type = content_type
