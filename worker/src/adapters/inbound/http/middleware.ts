import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { getAuthService, getUserRepo } from "../../../config/dependencies";
import type { AppContext } from "../../../config/env";

export const AUTH_COOKIE = "access_token";

async function resolveUser(c: { env: AppContext["Bindings"]; req: { raw: Request } }, token?: string) {
  if (!token) return null;
  const userId = await getAuthService(c.env).decodeToken(token);
  if (userId === null) return null;
  return getUserRepo(c.env).findById(userId);
}

/** Guards JSON API routes: unauthenticated callers get a 401 body. */
export const requireApiUser = createMiddleware<AppContext>(async (c, next) => {
  const user = await resolveUser(c, getCookie(c, AUTH_COOKIE));
  if (!user) return c.json({ detail: "Not authenticated" }, 401);
  c.set("user", user);
  await next();
});

/** Guards HTML pages: unauthenticated visitors are sent to the login screen. */
export const requirePageUser = createMiddleware<AppContext>(async (c, next) => {
  const user = await resolveUser(c, getCookie(c, AUTH_COOKIE));
  if (!user) return c.redirect("/login", 302);
  c.set("user", user);
  await next();
});
