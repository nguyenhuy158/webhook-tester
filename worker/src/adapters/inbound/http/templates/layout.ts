/** Escapes a value for interpolation into HTML text or a quoted attribute. */
export function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Serialises a value for embedding inside an inline <script> block. */
export function jsonForScript(value: unknown): string {
  return JSON.stringify(value ?? null).replace(/</g, "\\u003c");
}

/** Width at which the layout stops stacking. */
export const WIDE = "48rem";

/**
 * Dark by default — this is a developer tool that mostly gets opened next to a
 * terminal — with a light palette for anyone whose system asks for one, plus a
 * manual toggle stored in localStorage that wins over both.
 */
const TOKENS = `
    :root {
        color-scheme: dark;
        --bg: #0b0f14;
        --surface: #121821;
        --surface-2: #0e141c;
        --border: #223041;
        --text: #e6edf3;
        --muted: #8b98a5;
        --accent: #3b82f6;
        --accent-text: #ffffff;
        --danger: #f85149;
        --success: #3fb950;
        --warning: #d29922;
        --focus: #58a6ff;
        --radius: 8px;
        --mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
    }
    @media (prefers-color-scheme: light) {
        :root:not([data-theme="dark"]) {
            color-scheme: light;
            --bg: #f6f8fa;
            --surface: #ffffff;
            --surface-2: #f0f3f6;
            --border: #d0d7de;
            --text: #1f2328;
            --muted: #636c76;
            --accent: #0969da;
            --danger: #cf222e;
            --success: #1a7f37;
            --warning: #9a6700;
            --focus: #0969da;
        }
    }
    :root[data-theme="light"] {
        color-scheme: light;
        --bg: #f6f8fa;
        --surface: #ffffff;
        --surface-2: #f0f3f6;
        --border: #d0d7de;
        --text: #1f2328;
        --muted: #636c76;
        --accent: #0969da;
        --danger: #cf222e;
        --success: #1a7f37;
        --warning: #9a6700;
        --focus: #0969da;
    }
`;

const BASE = `
    * { box-sizing: border-box; }
    html {
        -webkit-text-size-adjust: 100%; text-size-adjust: 100%;
        touch-action: pan-x pan-y;
    }
    body {
        margin: 0 auto; padding: 16px;
        background: var(--bg); color: var(--text);
        font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        font-size: 15px; line-height: 1.55;
    }
    /* Inheriting the font keeps every control at body size, below which iOS
       Safari zooms in on focus. */
    button, input, select, textarea { font: inherit; color: inherit; }
    /* Removes the 300ms tap delay and double-tap zoom on controls. */
    button, a, [role="button"] { touch-action: manipulation; }
    :focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }

    h1 { font-size: 1.15rem; margin: 0; letter-spacing: -0.01em; }
    h2 { font-size: 1rem; margin: 0; }
    h3 { font-size: 0.9rem; margin: 0; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); }
    a { color: var(--accent); }
    .mono { font-family: var(--mono); }
    .tabular { font-variant-numeric: tabular-nums; }
    .muted { color: var(--muted); font-size: 0.85rem; }
    .row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .spread { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .grow { flex: 1; min-width: 0; }

    .topbar {
        display: flex; align-items: center; justify-content: space-between; gap: 12px;
        padding-bottom: 14px; margin-bottom: 18px; border-bottom: 1px solid var(--border);
    }
    .brand { display: flex; align-items: center; gap: 8px; min-width: 0; }
    .brand svg { flex-shrink: 0; color: var(--accent); }

    .card {
        background: var(--surface); border: 1px solid var(--border);
        border-radius: var(--radius); padding: 16px; margin-bottom: 16px;
    }
    .card > .card-head { margin-bottom: 14px; }

    .btn {
        display: inline-flex; align-items: center; justify-content: center; gap: 6px;
        min-height: 40px; padding: 8px 14px;
        background: var(--surface-2); color: var(--text);
        border: 1px solid var(--border); border-radius: 6px;
        cursor: pointer; text-decoration: none; font-size: 0.9rem; font-weight: 500;
        white-space: nowrap;
    }
    .btn:hover { border-color: var(--muted); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-primary { background: var(--accent); border-color: var(--accent); color: var(--accent-text); font-weight: 600; }
    .btn-primary:hover { filter: brightness(1.1); }
    .btn-danger { color: var(--danger); }
    .btn-danger:hover { border-color: var(--danger); }
    .btn-sm { min-height: 32px; padding: 4px 10px; font-size: 0.82rem; }
    .btn-icon { min-height: 32px; min-width: 32px; padding: 4px; }
    .btn-block { width: 100%; }

    label { display: block; margin-bottom: 5px; font-size: 0.82rem; font-weight: 600; color: var(--muted); }
    input, select, textarea {
        width: 100%; padding: 9px 11px;
        background: var(--surface-2); border: 1px solid var(--border);
        border-radius: 6px;
    }
    input::placeholder, textarea::placeholder { color: var(--muted); }
    .field { margin-bottom: 14px; }
    .field-hint { font-size: 0.78rem; color: var(--muted); margin-top: 4px; }
    .field-error { font-size: 0.78rem; color: var(--danger); margin-top: 4px; }

    .method {
        font-family: var(--mono); font-size: 0.72rem; font-weight: 700;
        padding: 2px 6px; border-radius: 4px; letter-spacing: 0.03em;
        border: 1px solid currentColor; background: transparent;
    }
    .m-GET { color: #58a6ff; } .m-POST { color: #3fb950; } .m-PUT { color: #d29922; }
    .m-DELETE { color: #f85149; } .m-PATCH { color: #bc8cff; }
    .m-HEAD, .m-OPTIONS { color: var(--muted); }

    pre {
        margin: 0; padding: 12px;
        background: var(--surface-2); border: 1px solid var(--border); border-radius: 6px;
        font-family: var(--mono); font-size: 0.78rem; line-height: 1.5;
        overflow-x: auto; white-space: pre-wrap; word-break: break-word;
    }
    .jkey { color: #79c0ff; } .jstr { color: #a5d6ff; }
    .jnum { color: #ffa657; } .jbool { color: #d2a8ff; } .jnull { color: var(--muted); }

    .empty { text-align: center; padding: 28px 12px; color: var(--muted); }

    /* Toasts and dialogs replace alert()/confirm(), which block the page and
       look broken on mobile. */
    #toasts { position: fixed; left: 12px; right: 12px; bottom: 12px; z-index: 50;
              display: flex; flex-direction: column; gap: 8px; pointer-events: none; }
    .toast {
        background: var(--surface); border: 1px solid var(--border); border-left: 3px solid var(--accent);
        border-radius: 6px; padding: 11px 13px; font-size: 0.88rem;
        box-shadow: 0 6px 20px rgba(0,0,0,0.35); animation: rise 0.18s ease-out;
    }
    .toast.error { border-left-color: var(--danger); }
    .toast.success { border-left-color: var(--success); }
    @keyframes rise { from { opacity: 0; transform: translateY(8px); } }

    dialog {
        border: 1px solid var(--border); border-radius: var(--radius);
        background: var(--surface); color: var(--text);
        padding: 18px; width: min(24rem, calc(100vw - 32px));
    }
    dialog::backdrop { background: rgba(0,0,0,0.6); }

    @media (min-width: ${WIDE}) {
        body { padding: 28px 24px; }
        #toasts { left: auto; right: 20px; bottom: 20px; width: 22rem; }
    }
    @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after { animation: none !important; transition: none !important; }
    }
`;

/** Helpers every page uses: theme toggle, toasts, confirm dialog, JSON colouring. */
const UI_SCRIPT = `
    (function () {
        var saved = null;
        try { saved = localStorage.getItem('theme'); } catch (e) {}
        if (saved) document.documentElement.setAttribute('data-theme', saved);
    })();

    function toggleTheme() {
        var root = document.documentElement;
        var current = root.getAttribute('data-theme');
        if (!current) {
            current = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
        }
        var next = current === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
        try { localStorage.setItem('theme', next); } catch (e) {}
    }

    function toast(message, kind) {
        var host = document.getElementById('toasts');
        if (!host) return;
        var el = document.createElement('div');
        el.className = 'toast ' + (kind || '');
        el.textContent = message;
        el.setAttribute('role', 'status');
        host.appendChild(el);
        setTimeout(function () {
            el.style.opacity = '0';
            setTimeout(function () { el.remove(); }, 200);
        }, 3200);
    }

    function confirmDialog(message, confirmLabel) {
        return new Promise(function (resolve) {
            var dlg = document.createElement('dialog');
            var text = document.createElement('p');
            text.style.margin = '0 0 16px';
            text.textContent = message;
            var row = document.createElement('div');
            row.className = 'row';
            row.style.justifyContent = 'flex-end';
            var cancel = document.createElement('button');
            cancel.className = 'btn';
            cancel.textContent = 'Cancel';
            var ok = document.createElement('button');
            ok.className = 'btn btn-primary';
            ok.textContent = confirmLabel || 'Confirm';
            row.appendChild(cancel); row.appendChild(ok);
            dlg.appendChild(text); dlg.appendChild(row);
            document.body.appendChild(dlg);

            function done(value) { dlg.close(); dlg.remove(); resolve(value); }
            cancel.onclick = function () { done(false); };
            ok.onclick = function () { done(true); };
            dlg.addEventListener('cancel', function (e) { e.preventDefault(); done(false); });
            dlg.showModal();
            ok.focus();
        });
    }

    async function copyText(value, label) {
        try {
            await navigator.clipboard.writeText(value);
            toast((label || 'Copied') + ' to clipboard', 'success');
        } catch (err) {
            // The clipboard API needs a secure context and user gesture; some
            // mobile browsers refuse it outright.
            window.prompt('Copy manually:', value);
        }
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str == null ? '' : String(str);
        return div.innerHTML;
    }

    /** Colourises JSON. Input is escaped first, so no markup can survive. */
    function highlightJson(raw) {
        var text;
        try { text = JSON.stringify(JSON.parse(raw), null, 2); }
        catch (e) { return escapeHtml(raw); }
        return escapeHtml(text).replace(
            /("(\\\\u[a-zA-Z0-9]{4}|\\\\[^u]|[^\\\\"])*"(\\s*:)?|\\b(true|false)\\b|\\bnull\\b|-?\\d+(?:\\.\\d*)?(?:[eE][+-]?\\d+)?)/g,
            function (match) {
                var cls = 'jnum';
                if (/^"/.test(match)) cls = /:$/.test(match) ? 'jkey' : 'jstr';
                else if (/true|false/.test(match)) cls = 'jbool';
                else if (/null/.test(match)) cls = 'jnull';
                return '<span class="' + cls + '">' + match + '</span>';
            }
        );
    }

    function relativeTime(iso) {
        var then = Date.parse(iso);
        if (isNaN(then)) return iso || '';
        var secs = Math.round((Date.now() - then) / 1000);
        if (secs < 5) return 'just now';
        if (secs < 60) return secs + 's ago';
        if (secs < 3600) return Math.floor(secs / 60) + 'm ago';
        if (secs < 86400) return Math.floor(secs / 3600) + 'h ago';
        return Math.floor(secs / 86400) + 'd ago';
    }
`;

const THEME_BUTTON = `<button class="btn btn-icon" onclick="toggleTheme()" title="Toggle theme" aria-label="Toggle theme">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
    </button>`;

export const LOGO = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`;

export function page(params: {
  title: string;
  maxWidth: string;
  style?: string;
  body: string;
  script?: string;
  centered?: boolean;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${esc(params.title)}</title>
    <style>
${TOKENS}${BASE}
        body { max-width: ${params.maxWidth}; ${params.centered ? "display: flex; align-items: center; justify-content: center; min-height: 100vh; min-height: 100dvh;" : ""} }
${params.style ?? ""}
    </style>
</head>
<body>
${params.body}
<div id="toasts"></div>
<script>
${UI_SCRIPT}
${params.script ?? ""}
</script>
</body>
</html>`;
}

export { THEME_BUTTON };
