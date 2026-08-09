import { Hono } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import { getAuthService, getAuthUseCase, getSeedDefaultUserUseCase } from "../../../config/dependencies";
import { settings, type AppContext } from "../../../config/env";
import { InvalidCredentialsError } from "../../../domain/exceptions";
import { AUTH_COOKIE, requireApiUser } from "./middleware";

export const authRouter = new Hono<AppContext>();

authRouter.post("/auth/token", async (c) => {
  const form = await c.req.parseBody();
  const username = String(form.username ?? "");
  const password = String(form.password ?? "");
  const config = settings(c.env);

  // A Worker has no startup hook, so the default user is seeded on first login.
  await getSeedDefaultUserUseCase(c.env).execute(config.defaultUsername, config.defaultPassword);

  let user;
  try {
    user = await getAuthUseCase(c.env).execute(username, password);
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      return c.json({ detail: "Invalid credentials" }, 401);
    }
    throw error;
  }

  const token = await getAuthService(c.env).createToken(user.id!);
  setCookie(c, AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "Lax",
    secure: new URL(c.req.url).protocol === "https:",
    path: "/",
    maxAge: config.accessTokenExpireMinutes * 60,
  });
  return c.json({ message: "Login successful" });
});

authRouter.post("/auth/logout", requireApiUser, (c) => {
  deleteCookie(c, AUTH_COOKIE, { path: "/" });
  return c.json({ message: "Logged out" });
});
