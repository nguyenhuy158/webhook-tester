// Dev-only smoke: walks the main flow end to end and WRITES to the local D1
// (registers an account, creates an endpoint, records requests). Never point
// this at production; `pnpm e2e` runs it against `wrangler dev` only.
import { assert, assertLocalOnly, BASE, expectStatus, finish, request, test } from "@huyab/e2e";

assertLocalOnly();

const run = `e2e${Date.now().toString(36)}`;
const slug = `${run}-hook`;
let cookie = "";
let endpointId = 0;

/** Same request, signed in as the account this run registered. */
const authed = (path, init = {}) => request(path, { ...init, headers: { Cookie: cookie, ...init.headers } });

const json = (method, body) => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

console.log(`Dev smoke against ${BASE}\n`);

await test("register a new account", async () => {
  const response = await request("/auth/register", {
    method: "POST",
    body: new URLSearchParams({ username: run, password: "e2e-password" }),
  });
  expectStatus(response, 201);
  cookie = response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  assert(cookie.includes("access_token="), "no session cookie issued");
});

await test("dashboard renders for the signed-in user", async () => {
  const response = await authed("/");
  expectStatus(response, 200);
  assert((await response.text()).includes(run), "username not shown");
});

await test("create an endpoint", async () => {
  const response = await authed("/api/endpoints", json("POST", { name: "E2E hook", slug }));
  expectStatus(response, 201);
  endpointId = (await response.json()).id;
  assert(Number.isInteger(endpointId), "no endpoint id returned");
});

await test("slug is reported as taken", async () => {
  const response = await authed(`/api/endpoints/check-slug?slug=${slug}`);
  expectStatus(response, 200);
  assert((await response.json()).available === false, "slug still reported available");
});

await test("webhook returns the default mock response, sandboxed", async () => {
  const response = await request(`/hook/${slug}?source=e2e`, json("POST", { marker: run }));
  expectStatus(response, 200);
  assert((await response.text()) === '{"status": "ok"}', "unexpected default body");
  assert(response.headers.get("content-security-policy") === "sandbox", "missing sandbox CSP");
});

await test("endpoint page lists the recorded request", async () => {
  const response = await authed(`/endpoint/${endpointId}`);
  expectStatus(response, 200);
  const html = await response.text();
  assert(html.includes(`/hook/${slug}`), "webhook URL not shown");
  assert(html.includes(run), "recorded request body not shown");
});

await test("updated mock response is served", async () => {
  const update = { response_status: 201, response_body: "created", response_content_type: "text/plain" };
  expectStatus(await authed(`/api/endpoints/${endpointId}`, json("PUT", update)), 200);
  const response = await request(`/hook/${slug}`);
  expectStatus(response, 201);
  assert((await response.text()) === "created", "update not applied");
});

await test("malformed endpoint id is rejected", async () => {
  expectStatus(await authed("/api/endpoints/not-a-number", { method: "DELETE" }), 422);
});

await test("clear requests, then delete the endpoint", async () => {
  expectStatus(await authed(`/api/endpoints/${endpointId}/requests`, { method: "DELETE" }), 204);
  expectStatus(await authed(`/api/endpoints/${endpointId}`, { method: "DELETE" }), 204);
  expectStatus(await authed(`/api/endpoints/${endpointId}`, { method: "DELETE" }), 404);
  expectStatus(await request(`/hook/${slug}`), 404);
});

finish();
