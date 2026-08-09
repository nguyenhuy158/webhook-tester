import { Hono } from "hono";
import type { AppContext } from "../../../config/env";
import { resolveUser } from "../http/middleware";

export const wsRouter = new Hono<AppContext>();

wsRouter.get("/ws/endpoint/:endpointId", async (c) => {
  if (c.req.header("Upgrade") !== "websocket") {
    return c.text("Expected websocket", 426);
  }

  const endpointId = Number.parseInt(c.req.param("endpointId"), 10);
  if (Number.isNaN(endpointId)) return c.text("Invalid endpoint id", 400);

  // Same credentials the HTTP routes accept; the browser sends them on the handshake.
  if (!(await resolveUser(c.env, c.req.raw))) {
    return c.text("Unauthorized", 401);
  }

  const namespace = c.env.ENDPOINT_HUB;
  const stub = namespace.get(namespace.idFromName(`endpoint:${endpointId}`));
  return stub.fetch(c.req.raw);
});
