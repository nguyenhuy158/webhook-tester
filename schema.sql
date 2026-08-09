-- D1 schema for webhook-tester.
--
-- The tables live in a D1 instance shared with other projects, so every name is
-- prefixed with `webhook_tester_`.

CREATE TABLE IF NOT EXISTS webhook_tester_endpoints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    response_status INTEGER NOT NULL DEFAULT 200,
    response_body TEXT NOT NULL DEFAULT '{"status": "ok"}',
    response_content_type TEXT NOT NULL DEFAULT 'application/json',
    delay_ms INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS webhook_tester_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint_id INTEGER NOT NULL REFERENCES webhook_tester_endpoints(id) ON DELETE CASCADE,
    method TEXT NOT NULL,
    headers TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    query_params TEXT NOT NULL DEFAULT '{}',
    remote_addr TEXT NOT NULL,
    timestamp TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_webhook_tester_requests_endpoint
    ON webhook_tester_requests(endpoint_id, id DESC);

-- `password` is null for accounts created through Google, `google_sub` is null for
-- accounts created with a password.
CREATE TABLE IF NOT EXISTS webhook_tester_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT,
    email TEXT,
    google_sub TEXT UNIQUE,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
