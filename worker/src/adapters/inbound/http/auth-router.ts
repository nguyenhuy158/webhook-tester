import { Hono, type Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import {
  getAuthService,
  getAuthUseCase,
  getGoogleAuthProvider,
  getLoginWithExternalIdentityUseCase,
  getRegisterUserUseCase,
} from "../../../config/dependencies";
import { googleEnabled, settings, type AppContext } from "../../../config/env";
import {
  ExternalAuthError,
  InvalidCredentialsError,
  UsernameAlreadyExistsError,
  WeakPasswordError,
} from "../../../domain/exceptions";
import type { User } from "../../../domain/entities";
import { AUTH_COOKIE, requireApiUser } from "./middleware";

export const authRouter = new Hono<AppContext>();

const OAUTH_STATE_COOKIE = "oauth_state";

const isSecure = (url: string) => new URL(url).protocol === "https:";

async function issueSession(c: Context<AppContext>, user: User) {
  const config = settings(c.env);
  const token = await getAuthService(c.env).createToken(user.id!);
  setCookie(c, AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "Lax",
    secure: isSecure(c.req.url),
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

authRouter.get("/auth/google", (c) => {
  if (!googleEnabled(c.env)) return c.text("Google sign-in is not configured", 503);

  const url = new URL(c.req.url);
  const redirectUri = `${url.origin}/auth/google/callback`;
  // Random state, mirrored in a short-lived cookie, so the callback can prove the
  // flow started on this browser and was not forged by a third party.
  const state = crypto.randomUUID();
  setCookie(c, OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "Lax",
    secure: isSecure(c.req.url),
    path: "/",
    maxAge: 600,
  });

  return c.redirect(getGoogleAuthProvider(c.env).authorizationUrl({ redirectUri, state }), 302);
});

authRouter.get("/auth/google/callback", async (c) => {
  if (!googleEnabled(c.env)) return c.text("Google sign-in is not configured", 503);

  const expectedState = getCookie(c, OAUTH_STATE_COOKIE);
  deleteCookie(c, OAUTH_STATE_COOKIE, { path: "/" });

  const state = c.req.query("state");
  if (!expectedState || !state || state !== expectedState) {
    return c.redirect("/login?error=state", 302);
  }

  const code = c.req.query("code");
  if (!code) return c.redirect("/login?error=google", 302);

  const url = new URL(c.req.url);
  try {
    const identity = await getGoogleAuthProvider(c.env).exchangeCode({
      code,
      redirectUri: `${url.origin}/auth/google/callback`,
    });
    const user = await getLoginWithExternalIdentityUseCase(c.env).execute(identity);
    await issueSession(c, user);
    return c.redirect("/", 302);
  } catch (error) {
    if (error instanceof ExternalAuthError) return c.redirect("/login?error=google", 302);
    throw error;
  }
});

authRouter.post("/auth/logout", requireApiUser, (c) => {
  deleteCookie(c, AUTH_COOKIE, { path: "/" });
  return c.json({ message: "Logged out" });
});
