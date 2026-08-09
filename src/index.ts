import { Hono } from "hono";
import { authRouter } from "./adapters/inbound/http/auth-router";
import { endpointRouter } from "./adapters/inbound/http/endpoint-router";
import { pagesRouter } from "./adapters/inbound/http/pages-router";
import { webhookRouter } from "./adapters/inbound/http/webhook-router";
import { wsRouter } from "./adapters/inbound/ws/ws-router";
import type { AppContext } from "./config/env";

export { EndpointHub } from "./adapters/inbound/ws/endpoint-hub";

const app = new Hono<AppContext>();

app.route("/", authRouter);
app.route("/api", endpointRouter);
app.route("/", webhookRouter);
app.route("/", pagesRouter);
app.route("/", wsRouter);

app.notFound((c) => c.text("Not found", 404));

app.onError((err, c) => {
  console.error("Unhandled error", err);
  return c.json({ detail: "Internal server error" }, 500);
});

export default app;
