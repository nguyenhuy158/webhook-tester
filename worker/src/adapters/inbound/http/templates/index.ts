import type { Endpoint, User } from "../../../../domain/entities";
import { esc } from "./layout";

export function indexPage(params: { user: User; endpoints: Endpoint[]; search: string }): string {
  const rows = params.endpoints
    .map(
      (endpoint) => `
                <tr>
                    <td>${esc(endpoint.name)}</td>
                    <td><code>/hook/${esc(endpoint.slug)}</code></td>
                    <td>${esc(endpoint.createdAt)}</td>
                    <td class="actions">
                        <a href="/endpoint/${endpoint.id}" class="btn" style="background: #27ae60; padding: 5px 10px; font-size: 0.9em;">View Details</a>
                    </td>
                </tr>`,
    )
    .join("");

  const table = params.endpoints.length
    ? `<table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>URL Path</th>
                    <th>Created At</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>${rows}
            </tbody>
        </table>`
    : `<p style="text-align: center; color: #777; padding: 20px;">No endpoints found.</p>`;

  return `<!DOCTYPE html>
<html>
<head>
    <title>Webhook Tester - Dashboard</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background: #f4f6f9; color: #333; max-width: 900px; margin: 40px auto; padding: 20px; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ddd; padding-bottom: 15px; margin-bottom: 20px; }
        h1 { color: #2c3e50; margin: 0; }
        .logout { color: #e74c3c; text-decoration: none; font-weight: bold; }
        .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .btn { display: inline-block; padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; font-size: 0.9em; }
        .btn:hover { background: #2980b9; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input[type="text"] { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { text-align: left; padding: 12px; border-bottom: 1px solid #eee; }
        th { background: #f8f9fa; font-weight: 600; }
        tr:hover { background: #f1f1f1; }
        .actions { text-align: right; }
        .alert { padding: 10px; margin-bottom: 20px; border-radius: 4px; display: none; }
        .alert-error { background: #f8d7da; color: #721c24; }
        .alert-success { background: #d4edda; color: #155724; }
        .slug-error { color: #e74c3c; font-size: 0.8em; margin-top: 5px; display: none; }
        .search-box { display: flex; gap: 10px; margin-bottom: 15px; }
        .search-box input { flex-grow: 1; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Webhook Tester Dashboard</h1>
        <div>
            <span>Hello, ${esc(params.user.username)}!</span> |
            <a href="/logout" class="logout">Logout</a>
        </div>
    </div>

    <div id="alert" class="alert"></div>

    <div class="card">
        <h2>Create New Endpoint</h2>
        <div class="form-group">
            <label for="name">Name (e.g., Stripe Payments)</label>
            <input type="text" id="name" placeholder="My Awesome Webhook">
        </div>
        <div class="form-group">
            <label for="slug">Slug (URL Path)</label>
            <input type="text" id="slug" placeholder="stripe-payments" oninput="checkSlug()">
            <div id="slug-error" class="slug-error"></div>
        </div>
        <button id="create-btn" class="btn" onclick="createEndpoint()">Create Endpoint</button>
    </div>

    <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <h2>Your Endpoints</h2>
            <form action="/" method="GET" class="search-box" style="margin: 0; width: 300px;">
                <input type="text" name="search" placeholder="Search endpoints..." value="${esc(params.search)}">
                <button type="submit" class="btn">Search</button>
            </form>
        </div>

        ${table}
    </div>

    <script>
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

            const resp = await fetch(\`/api/endpoints/check-slug?slug=\${encodeURIComponent(slug)}\`);
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
                window.location.href = \`/endpoint/\${data.id}\`;
            } else if (resp.status === 409) {
                showAlert('Slug already exists!', 'error');
            } else {
                showAlert('Failed to create endpoint.', 'error');
            }
        }
    </script>
</body>
</html>`;
}
