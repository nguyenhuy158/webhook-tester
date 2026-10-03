import { ssoUrl } from "@huyab/sso";
import { Hono, type Context } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import { getAuthService, getAuthUseCase, getRegisterUserUseCase } from "../../../config/dependencies";
import { settings, type AppContext } from "../../../config/env";
import type { User } from "../../../domain/entities";
import {
  InvalidCredentialsError,
  UsernameAlreadyExistsError,
  WeakPasswordError,
} from "../../../domain/exceptions";
import { AUTH_COOKIE, requireApiUser } from "./middleware";

export const authRouter = new Hono<AppContext>();

async function issueSession(c: Context<AppContext>, user: User) {
  const config = settings(c.env);
  const token = await getAuthService(c.env).createToken(user.id!);
  setCookie(c, AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "Lax",
    secure: new URL(c.req.url).protocol === "https:",
    path: "/",
    maxAge: config.accessTokenExpireMinutes * 60,
  });
}

authRouter.post("/auth/token", async (c) => {
  const form = await c.req.parseBody();
  try {
    const user = await getAuthUseCase(c.env).execute(
      String(form.username ?? ""),
      String(form.password ?? ""),
    );
    await issueSession(c, user);
    return c.json({ message: "Login successful" });
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      return c.json({ detail: "Invalid credentials" }, 401);
    }
    throw error;
  }
});

authRouter.post("/auth/register", async (c) => {
  const form = await c.req.parseBody();
  try {
    const user = await getRegisterUserUseCase(c.env).execute(
      String(form.username ?? "").trim(),
      String(form.password ?? ""),
    );
    await issueSession(c, user);
    return c.json({ message: "Account created" }, 201);
  } catch (error) {
    if (error instanceof UsernameAlreadyExistsError) return c.json({ detail: error.message }, 409);
    if (error instanceof WeakPasswordError) return c.json({ detail: error.message }, 422);
    throw error;
  }
});

/**
 * Google sign-in lives in the shared SSO service, which owns the single OAuth
 * client for the domain; this app only verifies the cookie it issues.
 */
authRouter.get("/auth/sso", (c) => {
  const origin = new URL(c.req.url).origin;
  return c.redirect(ssoUrl(settings(c.env).ssoIssuer, "/login", `${origin}/`), 302);
});

authRouter.post("/auth/logout", requireApiUser, (c) => {
  deleteCookie(c, AUTH_COOKIE, { path: "/" });
  return c.json({ message: "Logged out" });
});

/**
 * The SSO cookie belongs to the whole domain, so signing out of it is the SSO
 * service's job; this app only drops its own local session.
 */
authRouter.get("/auth/sso/logout", (c) => {
  const origin = new URL(c.req.url).origin;
  deleteCookie(c, AUTH_COOKIE, { path: "/" });
  return c.redirect(ssoUrl(settings(c.env).ssoIssuer, "/logout", `${origin}/login`), 302);
});
