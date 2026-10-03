import { SSO_COOKIE, verifySsoToken } from "@huyab/sso";
import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { getAuthService, getLoginWithExternalIdentityUseCase, getUserRepo } from "../../../config/dependencies";
import { settings, type AppContext, type Env } from "../../../config/env";
import type { User } from "../../../domain/entities";

export const AUTH_COOKIE = "access_token";

/**
 * Resolves the caller from either credential: the local password session, or the
 * domain-wide SSO cookie. An SSO visitor is provisioned on first sight, so no
 * separate signup step is needed.
 */
export async function resolveUser(env: Env, request: Request): Promise<User | null> {
  const cookies = request.headers.get("Cookie") ?? "";
  const read = (name: string) =>
    cookies.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))?.[1];

  const localToken = read(AUTH_COOKIE);
  if (localToken) {
    const userId = await getAuthService(env).decodeToken(localToken);
    if (userId !== null) {
      const user = await getUserRepo(env).findById(userId);
      if (user) return user;
    }
  }

  const ssoToken = read(SSO_COOKIE);
  if (ssoToken) {
    const claims = await verifySsoToken(ssoToken, settings(env).ssoIssuer);
    if (claims) {
      return getLoginWithExternalIdentityUseCase(env).execute({
        // Namespaced so an SSO account can never collide with a local one.
        subject: `sso:${claims.sub}`,
        email: claims.email,
        name: claims.name ?? null,
      });
    }
  }

  return null;
}

/** Guards JSON API routes: unauthenticated callers get a 401 body. */
export const requireApiUser = createMiddleware<AppContext>(async (c, next) => {
  const user = await resolveUser(c.env, c.req.raw);
  if (!user) return c.json({ detail: "Not authenticated" }, 401);
  c.set("user", user);
  await next();
});

/** Guards HTML pages: unauthenticated visitors are sent to the login screen. */
export const requirePageUser = createMiddleware<AppContext>(async (c, next) => {
  const user = await resolveUser(c.env, c.req.raw);
  if (!user) return c.redirect("/login", 302);
  c.set("user", user);
  await next();
});

export { getCookie };
