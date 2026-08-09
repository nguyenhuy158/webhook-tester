import { Hono } from "hono";
import { getReceiveWebhookUseCase } from "../../../config/dependencies";
import type { AppContext } from "../../../config/env";
import { EndpointNotFoundError } from "../../../domain/exceptions";

export const webhookRouter = new Hono<AppContext>();

const METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];

webhookRouter.all("/hook/:slug", async (c) => {
  if (!METHODS.includes(c.req.method)) {
    return c.text("Method not allowed", 405);
  }

  const url = new URL(c.req.url);
  const incoming = {
    method: c.req.method,
    headers: Object.fromEntries(c.req.raw.headers),
    body: c.req.method === "GET" || c.req.method === "HEAD" ? "" : await c.req.text(),
    queryParams: Object.fromEntries(url.searchParams),
    remoteAddr: c.req.header("CF-Connecting-IP") ?? "unknown",
  };

  try {
    const result = await getReceiveWebhookUseCase(c.env).execute(c.req.param("slug"), incoming);
    return new Response(result.body, {
      status: result.status,
      headers: { "Content-Type": result.contentType },
    });
  } catch (error) {
    if (error instanceof EndpointNotFoundError) return c.text("Endpoint not found", 404);
    throw error;
  }
});
