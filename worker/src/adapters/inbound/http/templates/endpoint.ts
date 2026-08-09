import type { Endpoint, WebhookRequest } from "../../../../domain/entities";
import { esc } from "./layout";

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
                        <span>
                            <span class="method ${esc(req.method)}">${esc(req.method)}</span>
                            <span class="timestamp">${esc(req.timestamp)}</span>
                        </span>
                        <span style="font-size: 0.8em; color: #7f8c8d;">${esc(req.remoteAddr)} ▼</span>
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
    : `<p id="empty-msg" style="color: #777; text-align: center; padding: 20px;">No requests received yet. Send a request to the URL above!</p>`;

  return `<!DOCTYPE html>
<html>
<head>
    <title>Endpoint Details - ${esc(endpoint.name)}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background: #f4f6f9; color: #333; max-width: 1000px; margin: 40px auto; padding: 20px; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ddd; padding-bottom: 15px; margin-bottom: 20px; }
        .back-link { text-decoration: none; color: #3498db; font-weight: bold; }
        .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .url-box { background: #eef2f7; padding: 15px; border-radius: 4px; border: 1px solid #d1d9e6; font-family: monospace; font-size: 1.1em; word-break: break-all; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
        .copy-btn { background: #bdc3c7; color: #333; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; font-size: 0.8em; }
        .settings-form { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; font-size: 0.9em; color: #555; }
        input, select, textarea { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; font-family: monospace; }
        textarea { height: 100px; resize: vertical; }
        .btn { padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; }
        .btn-danger { background: #e74c3c; }
        .request-item { border-bottom: 1px solid #eee; padding: 15px 0; }
        .request-item.new-item { animation: highlight 2s ease-out; }
        @keyframes highlight { from { background-color: #d1f2eb; } to { background-color: transparent; } }
        .req-header { display: flex; justify-content: space-between; cursor: pointer; font-weight: bold; }
        .method { padding: 2px 6px; border-radius: 3px; font-size: 0.8em; margin-right: 10px; color: white; }
        .POST { background: #27ae60; } .GET { background: #2980b9; } .PUT { background: #f39c12; } .DELETE { background: #c0392b; } .PATCH { background: #8e44ad; }
        .req-details { display: none; margin-top: 10px; background: #fafafa; padding: 15px; border-radius: 4px; font-size: 0.9em; }
        pre { background: #2c3e50; color: #ecf0f1; padding: 10px; border-radius: 4px; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word; }
        .timestamp { color: #95a5a6; font-size: 0.8em; font-weight: normal; }
        .ws-status { font-size: 0.75em; padding: 2px 8px; border-radius: 10px; margin-left: 10px; }
        .ws-connected { background: #d4edda; color: #155724; }
        .ws-disconnected { background: #f8d7da; color: #721c24; }
        .alert { padding: 10px; margin-bottom: 15px; border-radius: 4px; display: none; }
        .alert-success { background: #d4edda; color: #155724; }
        .alert-error { background: #f8d7da; color: #721c24; }
    </style>
</head>
<body>
    <div class="header">
        <h1>
            ${esc(endpoint.name)}
            <span id="ws-status" class="ws-status ws-disconnected">Connecting...</span>
        </h1>
        <a href="/" class="back-link">← Back to Dashboard</a>
    </div>

    <div class="card">
        <h3>Webhook URL</h3>
        <div class="url-box">
            <span id="webhookUrl">${esc(webhookUrl)}</span>
            <button class="copy-btn" onclick="copyUrl()">Copy</button>
        </div>

        <h3>Response Settings</h3>
        <div id="settings-alert" class="alert"></div>
        <div class="settings-form">
            <div class="form-group">
                <label>Status Code</label>
                <input type="number" id="response_status" value="${esc(endpoint.responseStatus)}">
            </div>
            <div class="form-group">
                <label>Content Type</label>
                <input type="text" id="response_content_type" value="${esc(endpoint.responseContentType)}">
            </div>
            <div class="form-group" style="grid-column: span 2;">
                <label>Response Body</label>
                <textarea id="response_body">${esc(endpoint.responseBody)}</textarea>
            </div>
            <div class="form-group">
                <label>Delay (ms)</label>
                <input type="number" id="delay_ms" value="${esc(endpoint.delayMs)}">
            </div>
            <div class="form-group" style="display: flex; align-items: flex-end;">
                <button class="btn" onclick="saveSettings()">Save Settings</button>
            </div>
        </div>
    </div>

    <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <h3 style="margin: 0;">Request History (Live)</h3>
            <button class="btn btn-danger" style="padding: 5px 10px; font-size: 0.9em;" onclick="clearHistory()">Clear History</button>
        </div>

        <div id="requests-container">${history}
        </div>
    </div>

    <script>
        const endpointId = ${endpoint.id};
        let ws;
        let reconnectDelay = 1000;
        let keepAlive;

        function toggle(id) {
            const el = document.getElementById(id);
            el.style.display = (el.style.display === 'block') ? 'none' : 'block';
        }

        function copyUrl() {
            navigator.clipboard.writeText(document.getElementById('webhookUrl').innerText);
            alert('Copied URL to clipboard!');
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
                    <span>
                        <span class="method \${escapeHtml(req.method)}">\${escapeHtml(req.method)}</span>
                        <span class="timestamp">\${escapeHtml(req.timestamp || '')}</span>
                    </span>
                    <span style="font-size: 0.8em; color: #7f8c8d;">\${escapeHtml(req.remote_addr)} ▼</span>
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
            ws = new WebSocket(\`\${wsScheme}://\${location.host}/ws/endpoint/\${endpointId}\`);
            const statusEl = document.getElementById('ws-status');

            ws.onopen = () => {
                statusEl.textContent = 'Live';
                statusEl.className = 'ws-status ws-connected';
                reconnectDelay = 1000;
                // Cloudflare drops idle WebSockets after ~100s; ping to keep it open.
                clearInterval(keepAlive);
                keepAlive = setInterval(() => ws.readyState === WebSocket.OPEN && ws.send('ping'), 30000);
            };
            ws.onmessage = (event) => {
                const req = JSON.parse(event.data);
                addRequestToDom(req);
            };
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
            const resp = await fetch(\`/api/endpoints/\${endpointId}\`, {
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
            const resp = await fetch(\`/api/endpoints/\${endpointId}/requests\`, { method: 'DELETE' });
            if (resp.ok) {
                document.getElementById('requests-container').innerHTML =
                    '<p id="empty-msg" style="color:#777;text-align:center;padding:20px;">No requests received yet.</p>';
            }
        }

        document.addEventListener('DOMContentLoaded', connectWebSocket);
    </script>
</body>
</html>`;
}
