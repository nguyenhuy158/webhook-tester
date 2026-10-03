// Read-only smoke: GET requests only, no sign-up, no form submit, nothing
// written. Safe against production (`pnpm e2e:prod`, hooks.huyab.click);
// `pnpm e2e` runs it first against the local server so dev and prod share it.
import { assert, BASE, expectStatus, finish, request, test } from "@huyab/e2e";

const SSO_ISSUER = "https://auth.huyab.click";

console.log(`Read-only smoke against ${BASE}\n`);

await test("login page renders the sign-in form", async () => {
  const response = await request("/login");
  expectStatus(response, 200);
  const html = await response.text();
  assert(html.includes("<h1>Webhook Tester</h1>"), "missing app title");
  assert(html.includes('id="auth-form"'), "missing sign-in form");
  assert(html.includes('href="/auth/sso"'), "missing SSO button");
});

await test("dashboard redirects anonymous visitors to /login", async () => {
  const response = await request("/");
  expectStatus(response, 302);
  assert(response.headers.get("location") === "/login", `location ${response.headers.get("location")}`);
});

await test("favicon is served as SVG", async () => {
  const response = await request("/favicon.svg");
  expectStatus(response, 200);
  assert(response.headers.get("content-type")?.startsWith("image/svg+xml"), "wrong content type");
  assert((await response.text()).startsWith("<svg"), "body is not an SVG");
});

await test("API rejects anonymous callers", async () => {
  const response = await request("/api/endpoints");
  expectStatus(response, 401);
  assert((await response.json()).detail === "Not authenticated", "unexpected 401 body");
});

await test("SSO sign-in hands off to the issuer", async () => {
  const response = await request("/auth/sso");
  expectStatus(response, 302);
  const location = new URL(response.headers.get("location") ?? "");
  assert(`${location.origin}${location.pathname}` === `${SSO_ISSUER}/login`, `location ${location}`);
  // Only the path is pinned, so the check holds whatever host the Worker sees the request on.
  assert(
    new URL(location.searchParams.get("redirect_uri") ?? "").pathname === "/",
    "redirect_uri is not the dashboard",
  );
});

await test("unknown path is a 404", async () => {
  expectStatus(await request("/e2e-no-such-page"), 404);
});

finish();
