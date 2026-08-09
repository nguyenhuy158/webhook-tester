import type { Endpoint, User } from "../../../../domain/entities";
import { esc, page } from "./layout";

const STYLE = `
    .endpoint {
        display: flex; flex-direction: column; gap: 10px;
        padding: 14px 0; border-bottom: 1px solid #eee;
    }
    .endpoint:last-child { border-bottom: none; padding-bottom: 0; }
    .endpoint-name { font-weight: 600; }
    .endpoint-path {
        background: #eef2f7; border: 1px solid #d1d9e6; border-radius: 4px;
        padding: 6px 8px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 0.85rem; word-break: break-all;
    }
    .search-box { display: flex; gap: 8px; width: 100%; }
    .search-box input { flex: 1; min-width: 0; }
    .slug-error { color: #e74c3c; font-size: 0.85rem; margin-top: 6px; display: none; }
    .empty { text-align: center; color: #777; padding: 24px 0; }

    @media (min-width: 40rem) {
        .endpoint {
            flex-direction: row; align-items: center; gap: 16px;
        }
        .endpoint-main { flex: 1; min-width: 0; }
        .endpoint-path { display: inline-block; margin-top: 4px; }
        .search-box { width: 320px; }
    }
`;

export function indexPage(params: { user: User; endpoints: Endpoint[]; search: string }): string {
  const list = params.endpoints.length
    ? params.endpoints
        .map(
          (endpoint) => `
            <div class="endpoint">
                <div class="endpoint-main">
                    <div class="endpoint-name">${esc(endpoint.name)}</div>
                    <div class="endpoint-path">/hook/${esc(endpoint.slug)}</div>
                    <div class="muted">Created ${esc(endpoint.createdAt)}</div>
                </div>
                <a href="/endpoint/${endpoint.id}" class="btn btn-success btn-small btn-block">View Details</a>
            </div>`,
        )
        .join("")
    : `<p class="empty">No endpoints found.</p>`;

  const body = `
    <div class="header">
        <h1>Webhook Tester</h1>
        <div class="header-meta">
            <span>Hello, ${esc(params.user.username)}!</span>
            <a href="/logout" style="color: #e74c3c; font-weight: 600;">Logout</a>
        </div>
    </div>

    <div id="alert" class="alert"></div>

    <div class="card">
        <h2 style="margin-top: 0;">Create New Endpoint</h2>
        <div class="form-group">
            <label for="name">Name</label>
            <input type="text" id="name" placeholder="Stripe Payments">
        </div>
        <div class="form-group">
            <label for="slug">Slug (URL path)</label>
            <input type="text" id="slug" placeholder="stripe-payments" oninput="checkSlug()"
                   autocapitalize="none" autocorrect="off" spellcheck="false">
            <div id="slug-error" class="slug-error"></div>
        </div>
        <button id="create-btn" class="btn btn-block" onclick="createEndpoint()">Create Endpoint</button>
    </div>

    <div class="card">
        <div class="card-head">
            <h2>Your Endpoints</h2>
            <form action="/" method="GET" class="search-box">
                <input type="text" name="search" placeholder="Search..." value="${esc(params.search)}">
                <button type="submit" class="btn btn-small">Search</button>
            </form>
        </div>
        ${list}
    </div>`;

  const script = `
        function showAlert(msg, type) {
            const el = document.getElementById('alert');
            el.className = 'alert alert-' + type;
            el.textContent = msg;
            el.style.display = 'block';
            setTimeout(() => el.style.display = 'none', 4000);
        }

        async function checkSlug() {
            const slug = document.getElementById('slug').value;
            const errorMsg = document.getElementById('slug-error');
            const submitBtn = document.getElementById('create-btn');
            if (slug.length < 3) { errorMsg.style.display = 'none'; submitBtn.disabled = false; return; }

            const resp = await fetch('/api/endpoints/check-slug?slug=' + encodeURIComponent(slug));
            const data = await resp.json();
            if (!data.available) {
                errorMsg.textContent = 'Slug already exists!';
                errorMsg.style.display = 'block';
                submitBtn.disabled = true;
            } else {
                errorMsg.style.display = 'none';
                submitBtn.disabled = false;
            }
        }

        async function createEndpoint() {
            const name = document.getElementById('name').value.trim();
            const slug = document.getElementById('slug').value.trim();
            if (!name) { showAlert('Name is required.', 'error'); return; }
            if (!slug) { showAlert('Slug is required.', 'error'); return; }

            const resp = await fetch('/api/endpoints', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, slug })
            });
            if (resp.ok) {
                const data = await resp.json();
                window.location.href = '/endpoint/' + data.id;
            } else if (resp.status === 409) {
                showAlert('Slug already exists!', 'error');
            } else {
                showAlert('Failed to create endpoint.', 'error');
            }
        }`;

  return page({ title: "Webhook Tester - Dashboard", maxWidth: "56rem", style: STYLE, body, script });
}
