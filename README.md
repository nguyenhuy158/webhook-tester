# Webhook Tester

Self-hosted webhook inspector on Cloudflare Workers, deployed at
<https://hooks.huyab.click>.

Create an endpoint, point any system at `https://hooks.huyab.click/hook/<slug>`,
and watch the requests arrive live — method, headers, body, query params and
caller IP. Each endpoint replies with a status code, content type, body and delay
you configure, so it doubles as a mock server.

Sign in with Google through the shared [SSO service](https://github.com/nguyenhuy158/sso),
or register a username and password.

Everything lives in [`worker/`](worker/) — see [worker/README.md](worker/README.md)
for setup, routes and deployment.

## History

Version 1 was a FastAPI app running in Docker on a home server, reached over a
Cloudflare Tunnel. It was ported to Workers in `1543d9f`; the Python version was
removed in this commit and remains in the history at `3171129` if it is ever
needed.
