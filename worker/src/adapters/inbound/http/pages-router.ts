import { Hono } from "hono";
import { deleteCookie, getCookie } from "hono/cookie";
import { getEndpointRepo, getListEndpointsUseCase, getRequestRepo } from "../../../config/dependencies";
import { SSO_COOKIE, type AppContext } from "../../../config/env";
import { AUTH_COOKIE, requirePageUser } from "./middleware";
import { endpointPage } from "./templates/endpoint";
import { indexPage } from "./templates/index";
import { loginPage } from "./templates/login";

export const pagesRouter = new Hono<AppContext>();

pagesRouter.get("/login", (c) => c.html(loginPage({ error: c.req.query("error") })));

pagesRouter.get("/logout", (c) => {
  deleteCookie(c, AUTH_COOKIE, { path: "/" });
  // The SSO cookie is owned by the whole domain, so only its issuer can clear it;
  // dropping the local one alone would leave the visitor signed straight back in.
  return c.redirect(getCookie(c, SSO_COOKIE) ? "/auth/sso/logout" : "/login", 302);
});

pagesRouter.get("/", requirePageUser, async (c) => {
  const search = c.req.query("search") ?? "";
  const endpoints = await getListEndpointsUseCase(c.env).execute(search);
  return c.html(indexPage({ user: c.get("user"), endpoints, search }));
});

pagesRouter.get("/endpoint/:endpointId", requirePageUser, async (c) => {
  const endpointId = Number.parseInt(c.req.param("endpointId"), 10);
  if (Number.isNaN(endpointId)) return c.text("Endpoint not found", 404);

  const endpoint = await getEndpointRepo(c.env).findById(endpointId);
  if (!endpoint) return c.text(`Endpoint ${endpointId} not found`, 404);

  const requests = await getRequestRepo(c.env).listByEndpoint(endpointId, 50);
  const url = new URL(c.req.url);
  return c.html(
    endpointPage({
      endpoint,
      requests,
      webhookUrl: `${url.protocol}//${url.host}/hook/${endpoint.slug}`,
    }),
  );
});
