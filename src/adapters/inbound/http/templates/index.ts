import type { Endpoint, User } from "../../../../domain/entities";
import { esc, jsonForScript, LOGO, page, THEME_BUTTON, WIDE } from "./layout";

const STYLE = `
    .ep {
        display: flex; flex-direction: column; gap: 10px;
        padding: 14px 0; border-bottom: 1px solid var(--border);
    }
    .ep:last-child { border-bottom: none; padding-bottom: 4px; }
    .ep-name { font-weight: 600; }
    .ep-url {
        font-family: var(--mono); font-size: 0.8rem; color: var(--muted);
        word-break: break-all;
    }
    .ep-url b { color: var(--text); font-weight: 600; }
    .ep-actions { display: flex; gap: 8px; }
    .ep-actions .btn { flex: 1; }

    .create-grid { display: grid; grid-template-columns: 1fr; gap: 0 14px; }
    .search { display: flex; gap: 8px; }
    .snippet { position: relative; }
    .snippet pre { padding-right: 44px; }
    .snippet .btn { position: absolute; top: 6px; right: 6px; }

    @media (min-width: ${WIDE}) {
        .ep { flex-direction: row; align-items: center; gap: 16px; }
        .ep-actions { flex: 0 0 auto; }
        .ep-actions .btn { flex: 0 0 auto; }
        .create-grid { grid-template-columns: 1fr 1fr auto; align-items: end; }
        .create-grid .field { margin-bottom: 0; }
        .search { width: 260px; }
    }
`;

export function indexPage(params: { user: User; endpoints: Endpoint[]; search: string; origin: string }): string {
  const { user, endpoints, search, origin } = params;

  const list = endpoints.length
    ? endpoints
        .map(
          (e) => `
            <div class="ep" data-id="${e.id}" data-slug="${esc(e.slug)}" data-name="${esc(e.name)}">
                <div class="grow">
                    <div class="ep-name">${esc(e.name)}</div>
                    <div class="ep-url">${esc(origin)}/hook/<b>${esc(e.slug)}</b></div>
                    <div class="muted tabular" data-time="${esc(e.createdAt)}">${esc(e.createdAt)}</div>
                </div>
                <div class="ep-actions">
                    <button class="btn btn-sm" data-act="copy">Copy URL</button>
                    <a class="btn btn-sm" href="/endpoint/${e.id}">Inspect</a>
                    <button class="btn btn-sm btn-danger" data-act="delete" aria-label="Delete ${esc(e.name)}">Delete</button>
                </div>
            </div>`,
        )
        .join("")
    : search
      ? `<p class="empty">No endpoint matches “${esc(search)}”.</p>`
      : `<div class="empty">
            <p style="margin-top:0">No endpoints yet. Create one above, then send it a request:</p>
            <div class="snippet" style="text-align:left; max-width: 34rem; margin: 0 auto;">
                <pre>curl -X POST ${esc(origin)}/hook/&lt;slug&gt; \\
  -H 'Content-Type: application/json' \\
  -d '{"hello":"world"}'</pre>
            </div>
        </div>`;

  const body = `
    <div class="topbar">
        <div class="brand">${LOGO}<h1>Webhook Tester</h1></div>
        <div class="row">
            ${THEME_BUTTON}
            <span class="muted">${esc(user.username)}</span>
            <a class="btn btn-sm" href="/logout">Sign out</a>
        </div>
    </div>

    <div class="card">
        <div class="card-head"><h3>New endpoint</h3></div>
        <div class="create-grid">
            <div class="field">
                <label for="name">Name</label>
                <input type="text" id="name" placeholder="Stripe payments" oninput="syncSlug()">
            </div>
            <div class="field">
                <label for="slug">Slug</label>
                <input type="text" id="slug" placeholder="stripe-payments" oninput="slugTouched = true; checkSlug()"
                       autocapitalize="none" autocorrect="off" spellcheck="false">
                <div id="slug-msg" class="field-hint">Used as ${esc(origin)}/hook/&lt;slug&gt;</div>
            </div>
            <div class="field">
                <button id="create-btn" class="btn btn-primary btn-block" onclick="createEndpoint()">Create</button>
            </div>
        </div>
    </div>

    <div class="card">
        <div class="card-head spread">
            <h3>Endpoints <span class="muted">(${endpoints.length})</span></h3>
            <form action="/" method="GET" class="search" role="search">
                <input type="search" name="search" placeholder="Search name or slug" value="${esc(search)}" aria-label="Search endpoints">
                <button type="submit" class="btn btn-sm">Search</button>
            </form>
        </div>
        <div id="list">${list}</div>
    </div>`;

  const script = `
        var ORIGIN = ${jsonForScript(origin)};
        var slugTouched = ${jsonForScript(Boolean(search))};

        document.querySelectorAll('[data-time]').forEach(function (el) {
            var iso = el.getAttribute('data-time');
            el.textContent = 'Created ' + relativeTime(iso);
            el.title = iso;
        });

        function slugify(value) {
            return value.toLowerCase().trim()
                .normalize('NFD').replace(/[\\u0300-\\u036f]/g, '')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '')
                .slice(0, 60);
        }

        function syncSlug() {
            if (slugTouched) return;
            document.getElementById('slug').value = slugify(document.getElementById('name').value);
            checkSlug();
        }

        var slugTimer;
        function checkSlug() {
            clearTimeout(slugTimer);
            slugTimer = setTimeout(runSlugCheck, 250);
        }

        async function runSlugCheck() {
            var slug = document.getElementById('slug').value.trim();
            var msg = document.getElementById('slug-msg');
            var btn = document.getElementById('create-btn');
            if (slug.length < 3) {
                msg.className = 'field-hint';
                msg.textContent = 'Used as ' + ORIGIN + '/hook/<slug>';
                btn.disabled = false;
                return;
            }
            var resp = await fetch('/api/endpoints/check-slug?slug=' + encodeURIComponent(slug));
            var data = await resp.json();
            msg.className = data.available ? 'field-hint' : 'field-error';
            msg.textContent = data.available ? ORIGIN + '/hook/' + slug : 'Slug already taken';
            btn.disabled = !data.available;
        }

        async function createEndpoint() {
            var btn = document.getElementById('create-btn');
            var name = document.getElementById('name').value.trim();
            var slug = document.getElementById('slug').value.trim();
            if (!name) { toast('Name is required', 'error'); return; }
            if (!slug) { toast('Slug is required', 'error'); return; }

            btn.disabled = true;
            btn.textContent = 'Creating...';
            try {
                var resp = await fetch('/api/endpoints', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: name, slug: slug })
                });
                if (resp.ok) {
                    var data = await resp.json();
                    window.location.href = '/endpoint/' + data.id;
                    return;
                }
                var body = await resp.json().catch(function () { return {}; });
                toast(body.detail || 'Could not create endpoint', 'error');
            } catch (err) {
                toast('Network error', 'error');
            }
            btn.disabled = false;
            btn.textContent = 'Create';
        }

        // Delegated so endpoint names never have to be interpolated into an
        // inline handler, where a quote in the name would break out of the string.
        document.getElementById('list').addEventListener('click', function (event) {
            var button = event.target.closest('[data-act]');
            if (!button) return;
            var row = button.closest('.ep');
            if (button.dataset.act === 'copy') {
                copyText(ORIGIN + '/hook/' + row.dataset.slug, 'Webhook URL copied');
            } else if (button.dataset.act === 'delete') {
                removeEndpoint(row.dataset.id, row.dataset.name);
            }
        });

        async function removeEndpoint(id, name) {
            var ok = await confirmDialog('Delete "' + name + '" and all of its recorded requests?', 'Delete');
            if (!ok) return;
            var resp = await fetch('/api/endpoints/' + id, { method: 'DELETE' });
            if (!resp.ok) { toast('Could not delete endpoint', 'error'); return; }
            var row = document.querySelector('.ep[data-id="' + id + '"]');
            if (row) row.remove();
            toast('Deleted "' + name + '"', 'success');
            if (!document.querySelectorAll('.ep').length) window.location.reload();
        }`;

  return page({ title: "Webhook Tester", maxWidth: "58rem", style: STYLE, body, script });
}
