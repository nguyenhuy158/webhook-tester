import { type Context, Hono } from "hono";
import {
  getClearRequestsUseCase,
  getCreateEndpointUseCase,
  getDeleteEndpointUseCase,
  getEndpointRepo,
  getListEndpointsUseCase,
  getUpdateEndpointUseCase,
} from "../../../config/dependencies";
import type { AppContext } from "../../../config/env";
import { ENDPOINT_DEFAULTS } from "../../../domain/entities";
import { EndpointNotFoundError, SlugAlreadyExistsError } from "../../../domain/exceptions";
import { requireApiUser } from "./middleware";

export const endpointRouter = new Hono<AppContext>();

endpointRouter.use("*", requireApiUser);

/** Every route below acts on behalf of exactly this account. */
const owner = (c: { get: (key: "user") => { id: number | null } }): number => c.get("user").id!;

function parseId(raw: string): number | null {
  const id = Number.parseInt(raw, 10);
  return Number.isNaN(id) ? null : id;
}

/**
 * Runs an action against the `:endpointId` in the path, mapping the two failures
 * every such route shares: a malformed id (422) and an endpoint that is missing or
 * owned by someone else (404).
 */
async function onOwnedEndpoint(
  c: Context<AppContext>,
  action: (endpointId: number, ownerId: number) => Promise<Response>,
): Promise<Response> {
  const endpointId = parseId(c.req.param("endpointId") ?? "");
  if (endpointId === null) return c.json({ detail: "Invalid endpoint id" }, 422);

  try {
    return await action(endpointId, owner(c));
  } catch (error) {
    if (error instanceof EndpointNotFoundError) return c.json({ detail: error.message }, 404);
    throw error;
  }
}

endpointRouter.get("/endpoints", async (c) => {
  const endpoints = await getListEndpointsUseCase(c.env).execute(owner(c), c.req.query("search") ?? "");
  return c.json(
    endpoints.map((e) => ({
      id: e.id,
      name: e.name,
      slug: e.slug,
      response_status: e.responseStatus,
      response_content_type: e.responseContentType,
      created_at: e.createdAt,
    })),
  );
});

// Registered before "/endpoints/:endpointId" so the literal path wins.
endpointRouter.get("/endpoints/check-slug", async (c) => {
  // Unscoped by design: slugs share one /hook/<slug> namespace, so a slug taken
  // by another account is genuinely unavailable.
  const exists = await getEndpointRepo(c.env).slugExists(c.req.query("slug") ?? "");
  return c.json({ available: !exists });
});

endpointRouter.post("/endpoints", async (c) => {
  const body = await c.req.json<{ name?: unknown; slug?: unknown }>();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  if (!name || !slug) {
    return c.json({ detail: "name and slug are required" }, 422);
  }

  try {
    const endpoint = await getCreateEndpointUseCase(c.env).execute({ ownerId: owner(c), name, slug });
    return c.json({ id: endpoint.id, name: endpoint.name, slug: endpoint.slug }, 201);
  } catch (error) {
    if (error instanceof SlugAlreadyExistsError) return c.json({ detail: error.message }, 409);
    throw error;
  }
});

endpointRouter.put("/endpoints/:endpointId", (c) =>
  onOwnedEndpoint(c, async (endpointId, ownerId) => {
    const body = await c.req.json<Record<string, unknown>>();
    const endpoint = await getUpdateEndpointUseCase(c.env).execute({
      endpointId,
      ownerId,
      responseStatus: Number(body.response_status ?? ENDPOINT_DEFAULTS.responseStatus),
      responseBody: String(body.response_body ?? ENDPOINT_DEFAULTS.responseBody),
      responseContentType: String(body.response_content_type ?? ENDPOINT_DEFAULTS.responseContentType),
      delayMs: Number(body.delay_ms ?? ENDPOINT_DEFAULTS.delayMs),
    });
    return c.json({ id: endpoint.id, name: endpoint.name, slug: endpoint.slug });
  }),
);

endpointRouter.delete("/endpoints/:endpointId", (c) =>
  onOwnedEndpoint(c, async (endpointId, ownerId) => {
    await getDeleteEndpointUseCase(c.env).execute(endpointId, ownerId);
    return c.body(null, 204);
  }),
);

endpointRouter.delete("/endpoints/:endpointId/requests", (c) =>
  onOwnedEndpoint(c, async (endpointId, ownerId) => {
    await getClearRequestsUseCase(c.env).execute(endpointId, ownerId);
    return c.body(null, 204);
  }),
);
