from __future__ import annotations

from tortoise import fields
from tortoise.models import Model


class EndpointModel(Model):
    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=255)
    slug = fields.CharField(max_length=255, unique=True)
    response_status = fields.IntField(default=200)
    response_body = fields.TextField(default='{"status": "ok"}')
    response_content_type = fields.CharField(max_length=100, default="application/json")
    delay_ms = fields.IntField(default=0)
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "endpoints"


class RequestModel(Model):
    id = fields.IntField(pk=True)
    endpoint: fields.ForeignKeyRelation[EndpointModel] = fields.ForeignKeyField(
        "models.EndpointModel", related_name="requests", on_delete=fields.CASCADE
    )
    method = fields.CharField(max_length=10)
    headers = fields.TextField()   # stored as JSON string
    body = fields.TextField(default="")
    query_params = fields.TextField(default="{}")  # stored as JSON string
    remote_addr = fields.CharField(max_length=50)
    timestamp = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "requests"


class UserModel(Model):
    id = fields.IntField(pk=True)
    username = fields.CharField(max_length=100, unique=True)
    password = fields.CharField(max_length=255)  # hashed

    class Meta:
        table = "users"
