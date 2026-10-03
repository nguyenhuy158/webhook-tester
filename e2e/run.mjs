// One-command E2E: apply schema.sql to the local D1 -> start `wrangler dev`
// -> run the read-only smoke, then the dev smoke -> stop the server.
//
// Environment:
// - E2E_PORT: port for wrangler dev (default 8791, off `pnpm dev`'s 8787 so
//   both can run side by side)
import { run, startServer } from "@huyab/e2e";

const PORT = process.env.E2E_PORT || "8791";
const BASE = `http://127.0.0.1:${PORT}`;
// Local-only signing key; production reads SECRET_KEY from `wrangler secret`.
const E2E_SECRET_KEY = "e2e-local-secret";

let failed = false;
let server;
try {
  await run("pnpm", ["exec", "wrangler", "d1", "execute", "db", "--local", "--file=./schema.sql"], {
    label: "D1 schema",
  });
  server = await startServer({
    command: "pnpm",
    args: ["exec", "wrangler", "dev", "--ip", "127.0.0.1", "--port", PORT, "--var", `SECRET_KEY:${E2E_SECRET_KEY}`],
    readyUrl: `${BASE}/login`,
  });
  console.log(`\nServer ready at ${BASE}\n`);
  const env = { E2E_BASE_URL: BASE };
  await run("node", ["e2e/readonly-smoke.mjs"], { label: "read-only smoke", env });
  await run("node", ["e2e/dev-smoke.mjs"], { label: "dev smoke", env });
} catch (error) {
  failed = true;
  console.error("E2E FAIL:", error.message);
} finally {
  await server?.stop();
}

process.exit(failed ? 1 : 0);
