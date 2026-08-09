import type { Endpoint, WebhookRequest } from "../../../../domain/entities";
import { esc, page } from "./layout";

const STYLE = `
    .back-link { text-decoration: none; color: #3498db; font-weight: 600; font-size: 0.9rem; }
    .title-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

    .url-box {
        background: #eef2f7; border: 1px solid #d1d9e6; border-radius: 6px;
        padding: 12px; margin-bottom: 20px;
        display: flex; flex-direction: column; gap: 10px;
    }
    .url-box span {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 0.85rem; word-break: break-all;
    }

    .settings-form { display: grid; grid-template-columns: 1fr; gap: 0 18px; }
    .settings-form textarea { min-height: 110px; resize: vertical; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }

    .request-item { border-bottom: 1px solid #eee; padding: 12px 0; }
    .request-item:last-child { border-bottom: none; }
    .request-item.new-item { animation: highlight 2s ease-out; }
    @keyframes highlight { from { background-color: #d1f2eb; } to { background-color: transparent; } }

    .req-header {
        display: flex; justify-content: space-between; align-items: center; gap: 10px;
        cursor: pointer; flex-wrap: wrap; min-height: 40px;
    }
    .req-id { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .method { padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; color: white; background: #7f8c8d; }
    .POST { background: #27ae60; } .GET { background: #2980b9; } .PUT { background: #f39c12; }
    .DELETE { background: #c0392b; } .PATCH { background: #8e44ad; }
    .timestamp { color: #95a5a6; font-size: 0.8rem; }
    .req-meta { color: #7f8c8d; font-size: 0.8rem; word-break: break-all; }
    .req-details { display: none; margin-top: 10px; background: #fafafa; padding: 12px; border-radius: 6px; }
    .req-details h4 { margin: 8px 0 4px; }

    .ws-status { font-size: 0.7rem; padding: 3px 9px; border-radius: 10px; white-space: nowrap; }
    .ws-connected { background: #d4edda; color: #155724; }
    .ws-disconnected { background: #f8d7da; color: #721c24; }

    @media (min-width: 40rem) {
        .url-box { flex-direction: row; justify-content: space-between; align-items: center; }
        .url-box .btn { flex-shrink: 0; width: auto; }
        .settings-form { grid-template-columns: 1fr 1fr; }
        .settings-form .full { grid-column: span 2; }
    }
`;

export function endpointPage(params: {
  endpoint: Endpoint;
  requests: WebhookRequest[];
  webhookUrl: string;
}): string {
  const { endpoint, requests, webhookUrl } = params;

  const history = requests.length
    ? requests
        .map(
          (req) => `
                <div class="request-item">
                    <div class="req-header" onclick="toggle('req-${req.id}')">
                        <span class="req-id">
                            <span class="method ${esc(req.method)}">${esc(req.method)}</span>
                            <span class="timestamp">${esc(req.timestamp)}</span>
                        </span>
                        <span class="req-meta">${esc(req.remoteAddr)} &#9662;</span>
                    </div>
                    <div id="req-${req.id}" class="req-details">
                        <h4>Headers</h4>
                        <pre>${esc(JSON.stringify(req.headers, null, 2))}</pre>
                        <h4>Query Params</h4>
                        <pre>${esc(JSON.stringify(req.queryParams, null, 2))}</pre>
                        <h4>Body</h4>
                        <pre>${esc(req.body)}</pre>
                    </div>
                </div>`,
        )
        .join("")
    : `<p id="empty-msg" class="empty muted" style="text-align: center; padding: 24px 0;">No requests received yet. Send a request to the URL above!</p>`;

  const body = `
    <div class="header">
        <div class="title-row">
            <h1>${esc(endpoint.name)}</h1>
            <span id="ws-status" class="ws-status ws-disconnected">Connecting...</span>
        </div>
        <a href="/" class="back-link">&larr; Back to Dashboard</a>
    </div>

    <div class="card">
        <h3 style="margin-top: 0;">Webhook URL</h3>
        <div class="url-box">
            <span id="webhookUrl">${esc(webhookUrl)}</span>
            <button class="btn btn-small btn-block" onclick="copyUrl()">Copy</button>
        </div>

        <h3>Response Settings</h3>
        <div id="settings-alert" class="alert"></div>
        <div class="settings-form">
            <div class="form-group">
                <label for="response_status">Status Code</label>
                <input type="number" id="response_status" inputmode="numeric" value="${esc(endpoint.responseStatus)}">
            </div>
            <div class="form-group">
                <label for="response_content_type">Content Type</label>
                <input type="text" id="response_content_type" autocapitalize="none" value="${esc(endpoint.responseContentType)}">
            </div>
            <div class="form-group full">
                <label for="response_body">Response Body</label>
                <textarea id="response_body" spellcheck="false">${esc(endpoint.responseBody)}</textarea>
            </div>
            <div class="form-group">
                <label for="delay_ms">Delay (ms)</label>
                <input type="number" id="delay_ms" inputmode="numeric" value="${esc(endpoint.delayMs)}">
            </div>
            <div class="form-group" style="display: flex; align-items: flex-end;">
                <button class="btn btn-block" onclick="saveSettings()">Save Settings</button>
            </div>
        </div>
    </div>

    <div class="card">
        <div class="card-head">
            <h3>Request History (Live)</h3>
            <button class="btn btn-danger btn-small btn-block" onclick="clearHistory()">Clear History</button>
        </div>
        <div id="requests-container">${history}
        </div>
    </div>`;

  const script = `
        const endpointId = ${endpoint.id};
        let ws;
        let reconnectDelay = 1000;
        let keepAlive;

        function toggle(id) {
            const el = document.getElementById(id);
            el.style.display = (el.style.display === 'block') ? 'none' : 'block';
        }

        async function copyUrl() {
            const url = document.getElementById('webhookUrl').textContent;
            try {
                await navigator.clipboard.writeText(url);
                alert('Copied URL to clipboard!');
            } catch (err) {
                // clipboard API needs a secure context; some mobile browsers refuse it.
                prompt('Copy this URL:', url);
            }
        }

        function formatJson(str) {
            try { return JSON.stringify(JSON.parse(str), null, 2); } catch(e) { return str; }
        }

        function escapeHtml(str) {
            const div = document.createElement('div');
            div.textContent = str == null ? '' : String(str);
            return div.innerHTML;
        }

        function addRequestToDom(req) {
            const container = document.getElementById('requests-container');
            const emptyMsg = document.getElementById('empty-msg');
            if (emptyMsg) emptyMsg.style.display = 'none';

            const div = document.createElement('div');
            div.className = 'request-item new-item';
            const headersStr = typeof req.headers === 'object' ? JSON.stringify(req.headers, null, 2) : String(req.headers);
            const paramsStr = typeof req.query_params === 'object' ? JSON.stringify(req.query_params, null, 2) : String(req.query_params);
            div.innerHTML = \`
                <div class="req-header" onclick="toggle('req-\${escapeHtml(req.id)}')">
                    <span class="req-id">
                        <span class="method \${escapeHtml(req.method)}">\${escapeHtml(req.method)}</span>
                        <span class="timestamp">\${escapeHtml(req.timestamp || '')}</span>
                    </span>
                    <span class="req-meta">\${escapeHtml(req.remote_addr)} &#9662;</span>
                </div>
                <div id="req-\${escapeHtml(req.id)}" class="req-details">
                    <h4>Headers</h4><pre>\${escapeHtml(headersStr)}</pre>
                    <h4>Query Params</h4><pre>\${escapeHtml(paramsStr)}</pre>
                    <h4>Body</h4><pre>\${escapeHtml(formatJson(req.body || ''))}</pre>
                </div>\`;
            container.insertBefore(div, container.firstChild);
        }

        function connectWebSocket() {
            const wsScheme = location.protocol === 'https:' ? 'wss' : 'ws';
            ws = new WebSocket(wsScheme + '://' + location.host + '/ws/endpoint/' + endpointId);
            const statusEl = document.getElementById('ws-status');

            ws.onopen = () => {
                statusEl.textContent = 'Live';
                statusEl.className = 'ws-status ws-connected';
                reconnectDelay = 1000;
                // Cloudflare drops idle WebSockets after ~100s; ping to keep it open.
                clearInterval(keepAlive);
                keepAlive = setInterval(() => ws.readyState === WebSocket.OPEN && ws.send('ping'), 30000);
            };
            ws.onmessage = (event) => addRequestToDom(JSON.parse(event.data));
            ws.onclose = () => {
                clearInterval(keepAlive);
                statusEl.textContent = 'Reconnecting...';
                statusEl.className = 'ws-status ws-disconnected';
                setTimeout(connectWebSocket, reconnectDelay);
                reconnectDelay = Math.min(reconnectDelay * 2, 30000);
            };
            ws.onerror = () => ws.close();
        }

        async function saveSettings() {
            const alertEl = document.getElementById('settings-alert');
            const resp = await fetch('/api/endpoints/' + endpointId, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    response_status: parseInt(document.getElementById('response_status').value),
                    response_body: document.getElementById('response_body').value,
                    response_content_type: document.getElementById('response_content_type').value,
                    delay_ms: parseInt(document.getElementById('delay_ms').value) || 0
                })
            });
            alertEl.className = 'alert ' + (resp.ok ? 'alert-success' : 'alert-error');
            alertEl.textContent = resp.ok ? 'Settings saved!' : 'Failed to save settings.';
            alertEl.style.display = 'block';
            setTimeout(() => alertEl.style.display = 'none', 3000);
        }

        async function clearHistory() {
            if (!confirm('Clear all request history for this endpoint?')) return;
            const resp = await fetch('/api/endpoints/' + endpointId + '/requests', { method: 'DELETE' });
            if (resp.ok) {
                document.getElementById('requests-container').innerHTML =
                    '<p id="empty-msg" class="muted" style="text-align:center;padding:24px 0;">No requests received yet.</p>';
            }
        }

        // Reconnect when a phone wakes the tab; mobile browsers freeze sockets in the background.
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && ws && ws.readyState === WebSocket.CLOSED) connectWebSocket();
        });

        document.addEventListener('DOMContentLoaded', connectWebSocket);`;

  return page({
    title: `Endpoint Details - ${endpoint.name}`,
    maxWidth: "60rem",
    style: STYLE,
    body,
    script,
  });
}
