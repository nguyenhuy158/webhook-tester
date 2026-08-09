-- D1 schema for webhook-tester. Mirrors the Tortoise ORM models it replaces.

CREATE TABLE IF NOT EXISTS endpoints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    response_status INTEGER NOT NULL DEFAULT 200,
    response_body TEXT NOT NULL DEFAULT '{"status": "ok"}',
    response_content_type TEXT NOT NULL DEFAULT 'application/json',
    delay_ms INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint_id INTEGER NOT NULL REFERENCES endpoints(id) ON DELETE CASCADE,
    method TEXT NOT NULL,
    headers TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    query_params TEXT NOT NULL DEFAULT '{}',
    remote_addr TEXT NOT NULL,
    timestamp TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_requests_endpoint ON requests(endpoint_id, id DESC);

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
);
