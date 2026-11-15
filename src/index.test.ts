import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "./config/env";

vi.mock("cloudflare:workers", () => ({ DurableObject: class {} }));

const { default: app } = await import("./index");

const BASE = "https://hooks.test";
const HEALTH_HINT_PATTERN = /database/i;

const fakeDb = (first: () => Promise<unknown>) => ({ prepare: vi.fn(() => ({ first })) }) as unknown as D1Database;

const makeEnv = (db: D1Database): Env => ({ DB: db, ENDPOINT_HUB: {} as DurableObjectNamespace });

const call = (path: string, env: Env, init?: RequestInit) => app.fetch(new Request(`${BASE}${path}`, init), env);

describe("deploy check routes", () => {
  let env: Env;

  beforeEach(() => {
    env = makeEnv(fakeDb(async () => ({ 1: 1 })));
  });

  it("serves the build info without a session", async () => {
    const response = await call("/api/version", env);
    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual(["branch", "builtAt", "builtBy", "commit", "dirty", "shortCommit"]);
    expect((body.commit as string).length).toBeGreaterThan(0);
  });

  it("answers health with ok when the database answers", async () => {
    const response = await call("/api/health", env);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("answers health with 500 and a hint when the database fails", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const failing = makeEnv(
      fakeDb(async () => {
        throw new Error("secret-detail");
      }),
    );
    const response = await call("/api/health", failing);
    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).not.toContain("secret-detail");
    const body = JSON.parse(text) as { ok: boolean; hint: string };
    expect(body.ok).toBe(false);
    expect(body.hint).toMatch(HEALTH_HINT_PATTERN);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("does not serve the two routes for other methods", async () => {
    const version = await call("/api/version", env, { method: "POST" });
    const health = await call("/api/health", env, { method: "POST" });
    expect(version.status).toBe(401);
    expect(health.status).toBe(401);
  });
});

describe("other routes are unchanged", () => {
  const env = makeEnv(fakeDb(async () => null));

  it("renders the login page", async () => {
    const response = await call("/login", env);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("<h1>Webhook Tester</h1>");
  });

  it("redirects the dashboard to the login page", async () => {
    const response = await call("/", env);
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/login");
  });

  it("rejects anonymous API callers", async () => {
    const response = await call("/api/endpoints", env);
    expect(response.status).toBe(401);
  });

  it("keeps unknown paths a 404", async () => {
    expect((await call("/no-such-page", env)).status).toBe(404);
  });
});
