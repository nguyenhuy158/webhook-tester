import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { getAuthService } from "../../../config/dependencies";
import type { AppContext } from "../../../config/env";
import { AUTH_COOKIE } from "../http/middleware";

export const wsRouter = new Hono<AppContext>();

wsRouter.get("/ws/endpoint/:endpointId", async (c) => {
  if (c.req.header("Upgrade") !== "websocket") {
    return c.text("Expected websocket", 426);
  }

  const endpointId = Number.parseInt(c.req.param("endpointId"), 10);
  if (Number.isNaN(endpointId)) return c.text("Invalid endpoint id", 400);

  // Same JWT-cookie check the HTTP routes use — the browser sends it on the handshake.
  const token = getCookie(c, AUTH_COOKIE);
  if (!token || (await getAuthService(c.env).decodeToken(token)) === null) {
    return c.text("Unauthorized", 401);
  }

  const namespace = c.env.ENDPOINT_HUB;
  const stub = namespace.get(namespace.idFromName(`endpoint:${endpointId}`));
  return stub.fetch(c.req.raw);
});
