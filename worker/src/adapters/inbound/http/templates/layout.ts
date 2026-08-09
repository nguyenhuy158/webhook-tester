/** Escapes a value for interpolation into HTML text or a quoted attribute. */
export function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Width at which the layout stops stacking. */
const WIDE = "40rem";

/**
 * Shared styles, written mobile-first: the base rules target a phone and the
 * single media query adds the wider layout. Inputs stay at 16px because iOS
 * Safari zooms into any smaller field on focus.
 */
export const BASE_STYLE = `
    * { box-sizing: border-box; }
    body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        background: #f4f6f9; color: #333;
        margin: 0 auto; padding: 16px;
        font-size: 16px; line-height: 1.5;
        -webkit-text-size-adjust: 100%;
    }
    h1 { font-size: 1.35rem; margin: 0; color: #2c3e50; }
    h2 { font-size: 1.15rem; }
    h3 { font-size: 1.05rem; }
    h4 { font-size: 0.95rem; }

    .header {
        display: flex; flex-direction: column; gap: 10px;
        border-bottom: 2px solid #ddd; padding-bottom: 14px; margin-bottom: 18px;
    }
    .header-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 0.9rem; }

    .card { background: white; padding: 16px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.08); margin-bottom: 16px; }
    .card-head { display: flex; flex-direction: column; gap: 12px; margin-bottom: 14px; }
    .card-head h2, .card-head h3 { margin: 0; }

    /* 44px is the minimum comfortable touch target. */
    .btn {
        display: inline-flex; align-items: center; justify-content: center;
        min-height: 44px; padding: 10px 18px;
        background: #3498db; color: white; border: none; border-radius: 6px;
        cursor: pointer; text-decoration: none; font-size: 0.95rem; font-weight: 600;
    }
    .btn:hover { background: #2980b9; }
    .btn:disabled { background: #a9c9de; cursor: not-allowed; }
    .btn-block { width: 100%; }
    .btn-success { background: #27ae60; }
    .btn-success:hover { background: #219150; }
    .btn-danger { background: #e74c3c; }
    .btn-danger:hover { background: #c0392b; }
    .btn-small { min-height: 38px; padding: 8px 14px; font-size: 0.85rem; }

    .form-group { margin-bottom: 14px; }
    label { display: block; margin-bottom: 6px; font-weight: 600; font-size: 0.9rem; color: #555; }
    input, select, textarea {
        width: 100%; padding: 11px 12px;
        border: 1px solid #ddd; border-radius: 6px;
        font-size: 16px; font-family: inherit; background: white;
    }
    input:focus, select:focus, textarea:focus { outline: 2px solid #3498db; outline-offset: -1px; border-color: #3498db; }

    .alert { padding: 12px; margin-bottom: 16px; border-radius: 6px; display: none; font-size: 0.9rem; }
    .alert-error { background: #f8d7da; color: #721c24; }
    .alert-success { background: #d4edda; color: #155724; }

    .muted { color: #7f8c8d; font-size: 0.85rem; }

    /* Long values must scroll inside their own box, never widen the page. */
    pre {
        background: #2c3e50; color: #ecf0f1; padding: 12px; border-radius: 6px;
        overflow-x: auto; white-space: pre-wrap; word-break: break-word;
        font-size: 0.8rem; margin: 6px 0 12px;
    }
    code { word-break: break-all; }

    @media (min-width: ${WIDE}) {
        body { padding: 32px 24px; }
        h1 { font-size: 1.6rem; }
        .header { flex-direction: row; justify-content: space-between; align-items: center; }
        .card { padding: 22px; }
        .card-head { flex-direction: row; justify-content: space-between; align-items: center; }
        .btn-block { width: auto; }
    }
`;

export function page(params: { title: string; maxWidth: string; style?: string; body: string; script?: string }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>${esc(params.title)}</title>
    <style>
        body { max-width: ${params.maxWidth}; }
${BASE_STYLE}${params.style ?? ""}
    </style>
</head>
<body>
${params.body}
${params.script ? `<script>\n${params.script}\n</script>` : ""}
</body>
</html>`;
}
