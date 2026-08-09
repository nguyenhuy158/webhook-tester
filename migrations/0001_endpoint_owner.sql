-- Scopes endpoints to the account that created them.
--
-- SQLite cannot add a column and backfill it in one statement, so the column
-- lands nullable and existing rows are assigned afterwards. Run once against a
-- database created before this change:
--   wrangler d1 execute db --remote --file=./migrations/0001_endpoint_owner.sql

ALTER TABLE webhook_tester_endpoints ADD COLUMN user_id INTEGER REFERENCES webhook_tester_users(id);

CREATE INDEX IF NOT EXISTS idx_webhook_tester_endpoints_owner
    ON webhook_tester_endpoints(user_id, created_at DESC);

-- Existing endpoints predate ownership. There is no record of who created them,
-- so they are assigned by hand rather than guessed; on this deployment that is
-- the account behind ntqhuy2k2@gmail.com.
UPDATE webhook_tester_endpoints
   SET user_id = (SELECT id FROM webhook_tester_users WHERE username = 'ntqhuy2k2')
 WHERE user_id IS NULL;
