import { Hono } from "hono";
import { getEndpointRepo } from "../../../config/dependencies";
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
  const user = await resolveUser(c.env, c.req.raw);
  if (!user) return c.text("Unauthorized", 401);

  // The live feed carries the same payloads as the REST API, so it needs the
  // same ownership check — otherwise anyone signed in could subscribe to another
  // account's endpoint and watch its requests arrive.
  if (!(await getEndpointRepo(c.env).findById(endpointId, user.id!))) {
    return c.text("Not found", 404);
  }

  const namespace = c.env.ENDPOINT_HUB;
  const stub = namespace.get(namespace.idFromName(`endpoint:${endpointId}`));
  return stub.fetch(c.req.raw);
});
