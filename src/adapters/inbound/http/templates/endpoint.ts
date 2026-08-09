import type { Endpoint, WebhookRequest } from "../../../../domain/entities";
import { esc, jsonForScript, LOGO, page, THEME_BUTTON, WIDE } from "./layout";

const STYLE = `
    .url-bar {
        display: flex; flex-direction: column; gap: 8px;
        background: var(--surface-2); border: 1px solid var(--border);
        border-radius: 6px; padding: 10px 12px; margin-bottom: 18px;
    }
    .url-bar code { font-family: var(--mono); font-size: 0.82rem; word-break: break-all; }

    .settings { display: grid; grid-template-columns: 1fr; gap: 0 14px; }
    .settings textarea { min-height: 96px; resize: vertical; font-family: var(--mono); }

    .toolbar { display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; }
    .chips { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 2px; }
    .chip {
        border: 1px solid var(--border); background: var(--surface-2); color: var(--muted);
        border-radius: 999px; padding: 4px 11px; font-size: 0.8rem; cursor: pointer; white-space: nowrap;
    }
    .chip[aria-pressed="true"] { border-color: var(--accent); color: var(--accent); }

    .req { border: 1px solid var(--border); border-radius: 6px; margin-bottom: 8px; background: var(--surface-2); }
    .req.new { animation: flash 1.6s ease-out; }
    @keyframes flash { from { border-color: var(--success); } }
    .req-sum {
        display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
        width: 100%; padding: 10px 12px; background: none; border: none;
        cursor: pointer; text-align: left; min-height: 44px;
    }
    .req-sum .path { font-family: var(--mono); font-size: 0.8rem; color: var(--muted); word-break: break-all; }
    .req-body { display: none; padding: 0 12px 12px; }
    .req[open] .req-body { display: block; }
    .req[open] .caret { transform: rotate(90deg); }
    .caret { color: var(--muted); transition: transform 0.15s; }

    .tabs { display: flex; gap: 4px; margin-bottom: 8px; border-bottom: 1px solid var(--border); }
    .tab {
        background: none; border: none; border-bottom: 2px solid transparent;
        color: var(--muted); padding: 6px 10px; cursor: pointer; font-size: 0.82rem; min-height: 34px;
    }
    .tab[aria-selected="true"] { color: var(--text); border-bottom-color: var(--accent); }
    .pane { position: relative; }
    .pane .copy { position: absolute; top: 6px; right: 6px; }
    .pane pre { padding-right: 46px; }

    .live { display: inline-flex; align-items: center; gap: 5px; font-size: 0.78rem; color: var(--muted); }
    .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--muted); }
    .live.on .dot { background: var(--success); }
    .live.off .dot { background: var(--danger); }

    @media (min-width: ${WIDE}) {
        .url-bar { flex-direction: row; align-items: center; justify-content: space-between; }
        .settings { grid-template-columns: repeat(4, 1fr); }
        .settings .full { grid-column: span 4; }
        .toolbar { flex-direction: row; align-items: center; justify-content: space-between; }
        .toolbar .search { width: 18rem; }
    }
`;

export function endpointPage(params: {
  endpoint: Endpoint;
  requests: WebhookRequest[];
  webhookUrl: string;
}): string {
  const { endpoint, requests, webhookUrl } = params;

  const body = `
    <div class="topbar">
        <div class="brand">${LOGO}<h1>${esc(endpoint.name)}</h1></div>
        <div class="row">
            ${THEME_BUTTON}
            <a class="btn btn-sm" href="/">All endpoints</a>
        </div>
    </div>

    <div class="url-bar">
        <code id="hook-url">${esc(webhookUrl)}</code>
        <div class="row">
            <button class="btn btn-sm" id="copy-url">Copy</button>
            <button class="btn btn-sm" id="copy-curl">Copy curl</button>
        </div>
    </div>

    <div class="card">
        <div class="card-head"><h3>Response returned to callers</h3></div>
        <div class="settings">
            <div class="field">
                <label for="response_status">Status</label>
                <input type="number" id="response_status" inputmode="numeric" value="${esc(endpoint.responseStatus)}">
            </div>
            <div class="field">
                <label for="response_content_type">Content type</label>
                <input type="text" id="response_content_type" autocapitalize="none" value="${esc(endpoint.responseContentType)}">
            </div>
            <div class="field">
                <label for="delay_ms">Delay (ms)</label>
                <input type="number" id="delay_ms" inputmode="numeric" value="${esc(endpoint.delayMs)}">
            </div>
            <div class="field">
                <label for="save-btn" style="visibility:hidden">Save</label>
                <button id="save-btn" class="btn btn-primary btn-block">Save</button>
            </div>
            <div class="field full">
                <label for="response_body">Body</label>
                <textarea id="response_body" spellcheck="false">${esc(endpoint.responseBody)}</textarea>
            </div>
        </div>
    </div>

    <div class="card">
        <div class="card-head spread">
            <h3>Requests <span class="muted" id="count"></span></h3>
            <div class="row">
                <span class="live off" id="live"><span class="dot"></span><span id="live-text">connecting</span></span>
                <button class="btn btn-sm" id="pause-btn">Pause</button>
                <button class="btn btn-sm btn-danger" id="clear-btn">Clear</button>
            </div>
        </div>

        <div class="toolbar">
            <div class="chips" id="methods" role="group" aria-label="Filter by method"></div>
            <input type="search" class="search" id="q" placeholder="Search body, headers, IP" aria-label="Search requests">
        </div>

        <div id="feed"></div>
        <noscript><p class="empty">JavaScript is required to view recorded requests.</p></noscript>
    </div>`;

  const script = `
        var HOOK_URL = ${jsonForScript(webhookUrl)};
        var requests = ${jsonForScript(
          requests.map((r) => ({
            id: r.id,
            method: r.method,
            headers: r.headers,
            body: r.body,
            query_params: r.queryParams,
            remote_addr: r.remoteAddr,
            timestamp: r.timestamp,
          })),
        )};
        var endpointId = ${endpoint.id};
        var paused = false;
        var buffered = [];
        var openIds = {};
        var activeTab = {};
        var methodFilter = '';
        var query = '';

        var METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

        function matches(req) {
            if (methodFilter && req.method !== methodFilter) return false;
            if (!query) return true;
            var haystack = [req.method, req.remote_addr, req.body,
                            JSON.stringify(req.headers), JSON.stringify(req.query_params)]
                            .join(' ').toLowerCase();
            return haystack.indexOf(query.toLowerCase()) !== -1;
        }

        function renderChips() {
            var host = document.getElementById('methods');
            host.innerHTML = '';
            [''].concat(METHODS).forEach(function (m) {
                var seen = m === '' || requests.some(function (r) { return r.method === m; });
                if (!seen) return;
                var b = document.createElement('button');
                b.className = 'chip';
                b.textContent = m === '' ? 'All' : m;
                b.setAttribute('aria-pressed', String(methodFilter === m));
                b.onclick = function () { methodFilter = m; renderChips(); renderFeed(); };
                host.appendChild(b);
            });
        }

        function pane(id, kind, content, isJson) {
            var div = document.createElement('div');
            div.className = 'pane';
            div.dataset.pane = kind;
            div.style.display = (activeTab[id] || 'body') === kind ? 'block' : 'none';
            var pre = document.createElement('pre');
            if (isJson) pre.innerHTML = highlightJson(content);
            else pre.textContent = content;
            var btn = document.createElement('button');
            btn.className = 'btn btn-sm copy';
            btn.textContent = 'Copy';
            btn.onclick = function () { copyText(content, kind + ' copied'); };
            div.appendChild(pre);
            div.appendChild(btn);
            return div;
        }

        function renderRequest(req) {
            var wrap = document.createElement('div');
            wrap.className = 'req';
            if (openIds[req.id]) wrap.setAttribute('open', '');

            var sum = document.createElement('button');
            sum.className = 'req-sum';
            sum.setAttribute('aria-expanded', String(!!openIds[req.id]));

            var caret = document.createElement('span');
            caret.className = 'caret';
            caret.textContent = '\\u25B8';

            var method = document.createElement('span');
            method.className = 'method m-' + req.method;
            method.textContent = req.method;

            var when = document.createElement('span');
            when.className = 'muted tabular';
            when.textContent = relativeTime(req.timestamp);
            when.title = req.timestamp || '';

            var qs = Object.keys(req.query_params || {}).length
                ? '?' + new URLSearchParams(req.query_params).toString() : '';
            var path = document.createElement('span');
            path.className = 'path grow';
            path.textContent = req.remote_addr + qs;

            sum.appendChild(caret); sum.appendChild(method); sum.appendChild(when); sum.appendChild(path);
            sum.onclick = function () {
                var isOpen = wrap.hasAttribute('open');
                if (isOpen) { wrap.removeAttribute('open'); delete openIds[req.id]; }
                else { wrap.setAttribute('open', ''); openIds[req.id] = true; }
                sum.setAttribute('aria-expanded', String(!isOpen));
            };

            var bodyEl = document.createElement('div');
            bodyEl.className = 'req-body';

            var tabs = document.createElement('div');
            tabs.className = 'tabs';
            var panes = [
                ['body', req.body || '(empty)', true],
                ['headers', JSON.stringify(req.headers, null, 2), true],
                ['query', JSON.stringify(req.query_params, null, 2), true]
            ];
            panes.forEach(function (p) {
                var t = document.createElement('button');
                t.className = 'tab';
                t.textContent = p[0];
                t.setAttribute('aria-selected', String((activeTab[req.id] || 'body') === p[0]));
                t.onclick = function () {
                    activeTab[req.id] = p[0];
                    tabs.querySelectorAll('.tab').forEach(function (x) {
                        x.setAttribute('aria-selected', String(x.textContent === p[0]));
                    });
                    bodyEl.querySelectorAll('[data-pane]').forEach(function (x) {
                        x.style.display = x.dataset.pane === p[0] ? 'block' : 'none';
                    });
                };
                tabs.appendChild(t);
            });
            bodyEl.appendChild(tabs);
            panes.forEach(function (p) { bodyEl.appendChild(pane(req.id, p[0], p[1], p[2])); });

            wrap.appendChild(sum);
            wrap.appendChild(bodyEl);
            return wrap;
        }

        function renderFeed() {
            var feed = document.getElementById('feed');
            var visible = requests.filter(matches);
            document.getElementById('count').textContent =
                visible.length === requests.length
                    ? '(' + requests.length + ')'
                    : '(' + visible.length + ' of ' + requests.length + ')';

            feed.innerHTML = '';
            if (!visible.length) {
                var p = document.createElement('p');
                p.className = 'empty';
                p.textContent = requests.length
                    ? 'No request matches the current filter.'
                    : 'Waiting for the first request. Send one with the curl command above.';
                feed.appendChild(p);
                return;
            }
            visible.forEach(function (r) { feed.appendChild(renderRequest(r)); });
        }

        function addRequest(req) {
            requests.unshift(req);
            if (requests.length > 200) requests.pop();
            renderChips();
            renderFeed();
            var first = document.querySelector('.req');
            if (first && matches(req)) first.classList.add('new');
        }

        // --- controls ----------------------------------------------------------
        document.getElementById('copy-url').onclick = function () { copyText(HOOK_URL, 'URL copied'); };
        document.getElementById('copy-curl').onclick = function () {
            copyText("curl -X POST " + HOOK_URL + " -H 'Content-Type: application/json' -d '{\\"hello\\":\\"world\\"}'", 'curl command copied');
        };

        document.getElementById('q').oninput = function (e) { query = e.target.value.trim(); renderFeed(); };

        var pauseBtn = document.getElementById('pause-btn');
        pauseBtn.onclick = function () {
            paused = !paused;
            if (!paused && buffered.length) {
                buffered.forEach(addRequest);
                toast('Added ' + buffered.length + ' buffered request(s)');
                buffered = [];
            }
            pauseBtn.textContent = paused ? 'Resume' : 'Pause';
            pauseBtn.classList.toggle('btn-primary', paused);
        };

        document.getElementById('clear-btn').onclick = async function () {
            var ok = await confirmDialog('Delete every recorded request for this endpoint?', 'Clear');
            if (!ok) return;
            var resp = await fetch('/api/endpoints/' + endpointId + '/requests', { method: 'DELETE' });
            if (!resp.ok) { toast('Could not clear history', 'error'); return; }
            requests = []; buffered = [];
            renderChips(); renderFeed();
            toast('History cleared', 'success');
        };

        document.getElementById('save-btn').onclick = async function () {
            var btn = this;
            btn.disabled = true;
            var resp = await fetch('/api/endpoints/' + endpointId, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    response_status: parseInt(document.getElementById('response_status').value, 10),
                    response_body: document.getElementById('response_body').value,
                    response_content_type: document.getElementById('response_content_type').value,
                    delay_ms: parseInt(document.getElementById('delay_ms').value, 10) || 0
                })
            });
            toast(resp.ok ? 'Settings saved' : 'Could not save settings', resp.ok ? 'success' : 'error');
            btn.disabled = false;
        };

        // --- live feed ---------------------------------------------------------
        var ws, reconnectDelay = 1000, keepAlive;

        function setLive(state, text) {
            var el = document.getElementById('live');
            el.className = 'live ' + state;
            document.getElementById('live-text').textContent = text;
        }

        function connect() {
            ws = new WebSocket((location.protocol === 'https:' ? 'wss' : 'ws') + '://' + location.host + '/ws/endpoint/' + endpointId);
            ws.onopen = function () {
                setLive('on', 'live');
                reconnectDelay = 1000;
                // Cloudflare closes idle WebSockets after ~100s.
                clearInterval(keepAlive);
                keepAlive = setInterval(function () {
                    if (ws.readyState === WebSocket.OPEN) ws.send('ping');
                }, 30000);
            };
            ws.onmessage = function (event) {
                var req = JSON.parse(event.data);
                if (paused) {
                    buffered.unshift(req);
                    setLive('on', buffered.length + ' waiting');
                } else {
                    addRequest(req);
                }
            };
            ws.onclose = function () {
                clearInterval(keepAlive);
                setLive('off', 'reconnecting');
                setTimeout(connect, reconnectDelay);
                reconnectDelay = Math.min(reconnectDelay * 2, 30000);
            };
            ws.onerror = function () { ws.close(); };
        }

        // Phones suspend sockets in background tabs; reconnect on return.
        document.addEventListener('visibilitychange', function () {
            if (!document.hidden && ws && ws.readyState === WebSocket.CLOSED) connect();
        });

        // Keep "3m ago" honest without re-rendering the whole feed.
        setInterval(function () {
            document.querySelectorAll('.req-sum .tabular').forEach(function (el) {
                if (el.title) el.textContent = relativeTime(el.title);
            });
        }, 30000);

        renderChips();
        renderFeed();
        connect();`;

  return page({
    title: `${endpoint.name} - Webhook Tester`,
    maxWidth: "62rem",
    style: STYLE,
    body,
    script,
  });
}
