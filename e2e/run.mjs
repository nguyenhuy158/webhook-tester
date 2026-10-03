// One-command E2E: apply schema.sql to the local D1 -> start `wrangler dev`
// -> run the read-only smoke, then the dev smoke -> stop the server.
//
// Environment:
// - E2E_PORT: port for wrangler dev (default 8791, off `pnpm dev`'s 8787 so
//   both can run side by side)
import { spawn } from "node:child_process";

const PORT = process.env.E2E_PORT || "8791";
const BASE = `http://127.0.0.1:${PORT}`;
const SERVER_TIMEOUT_MS = 120_000;
const POLL_INTERVAL_MS = 500;
// Local-only signing key; production reads SECRET_KEY from `wrangler secret`.
const E2E_SECRET_KEY = "e2e-local-secret";

/** Runs a command to completion; rejects on a non-zero exit. */
function run(command, args, label, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", env });
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${label} failed (exit ${code})`))));
  });
}

/** Waits until the server answers /login, or throws once the deadline passes. */
async function waitForServer(child) {
  const deadline = Date.now() + SERVER_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`wrangler dev exited early (exit ${child.exitCode})`);
    try {
      if ((await fetch(`${BASE}/login`)).ok) return;
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error(`wrangler dev not up after ${SERVER_TIMEOUT_MS}ms`);
}

await run("pnpm", ["exec", "wrangler", "d1", "execute", "db", "--local", "--file=./schema.sql"], "D1 schema");

const server = spawn(
  "pnpm",
  ["exec", "wrangler", "dev", "--ip", "127.0.0.1", "--port", PORT, "--var", `SECRET_KEY:${E2E_SECRET_KEY}`],
  { stdio: ["ignore", "inherit", "inherit"], env: { ...process.env, CI: "1" }, detached: true },
);

/** Signals the server's whole process group; a group that is already gone is fine. */
function stopServer(signal) {
  try {
    process.kill(-server.pid, signal);
  } catch {
    // Already exited.
  }
}

// Ctrl-C must not leave wrangler holding the port either.
process.on("SIGINT", () => {
  stopServer("SIGKILL");
  process.exit(130);
});

let failed = false;
try {
  await waitForServer(server);
  console.log(`\nServer ready at ${BASE}\n`);
  const env = { ...process.env, E2E_BASE_URL: BASE };
  await run("node", ["e2e/readonly-smoke.mjs"], "read-only smoke", env);
  await run("node", ["e2e/dev-smoke.mjs"], "dev smoke", env);
} catch (error) {
  failed = true;
  console.error("E2E FAIL:", error.message);
} finally {
  // pnpm -> wrangler -> workerd: signal the whole process group (the server was
  // spawned detached), or the grandchildren outlive this script and hold the port.
  stopServer("SIGTERM");
  // Give wrangler time to clean up, then force it so the process never hangs.
  const stopped = await Promise.race([
    new Promise((resolve) => server.once("exit", () => resolve(true))),
    new Promise((resolve) => setTimeout(() => resolve(false), 5000)),
  ]);
  if (!stopped) stopServer("SIGKILL");
}

process.exit(failed ? 1 : 0);
