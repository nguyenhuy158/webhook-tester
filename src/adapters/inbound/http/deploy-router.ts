import { Hono } from "hono";
import { BUILD_INFO } from "../../../config/build-info";
import { getHealthCheck } from "../../../config/dependencies";
import type { AppContext } from "../../../config/env";

const HEALTH_FAILURE_HINT = "Database is not reachable. Check the D1 binding and the migrations.";

export const deployRouter = new Hono<AppContext>();

deployRouter.get("/api/version", (c) => c.json(BUILD_INFO));

deployRouter.get("/api/health", async (c) => {
  try {
    await getHealthCheck(c.env).ping();
    return c.json({ ok: true });
  } catch (error) {
    console.error("Health check failed", error);
    return c.json({ ok: false, hint: HEALTH_FAILURE_HINT }, 500);
  }
});
