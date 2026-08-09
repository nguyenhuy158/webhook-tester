import { esc, LOGO, page } from "./layout";

const GOOGLE_LOGO = `<svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.7 1.22 9.2 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>`;

const STYLE = `
    .auth { width: 100%; }
    .auth .brand { justify-content: center; margin-bottom: 6px; }
    .auth h1 { font-size: 1.2rem; }
    .lead { text-align: center; color: var(--muted); font-size: 0.85rem; margin: 0 0 20px; }
    .sso { width: 100%; min-height: 44px; }
    .divider { display: flex; align-items: center; gap: 10px; color: var(--muted); font-size: 0.75rem; margin: 16px 0; text-transform: uppercase; letter-spacing: 0.08em; }
    .divider::before, .divider::after { content: ""; flex: 1; height: 1px; background: var(--border); }
    .switch { margin-top: 16px; text-align: center; font-size: 0.85rem; color: var(--muted); }
    .switch button { background: none; border: none; color: var(--accent); cursor: pointer; font-weight: 600; padding: 4px; }
`;

export function loginPage(params: { error?: string }): string {
  const errorText = params.error === "sso" ? "Single sign-on failed. Please try again." : "";

  const body = `
    <div class="card auth">
        <div class="brand">${LOGO}<h1>Webhook Tester</h1></div>
        <p class="lead">Inspect and replay incoming webhooks.</p>

        ${errorText ? `<div class="field-error" style="text-align:center;margin-bottom:12px">${esc(errorText)}</div>` : ""}

        <a class="btn sso" href="/auth/sso">${GOOGLE_LOGO}<span>Continue with Google</span></a>
        <div class="divider"><span>or</span></div>

        <form id="auth-form" novalidate>
            <div class="field">
                <label for="username">Username</label>
                <input type="text" id="username" required autocomplete="username"
                       autocapitalize="none" autocorrect="off" spellcheck="false">
            </div>
            <div class="field">
                <label for="password">Password</label>
                <input type="password" id="password" required autocomplete="current-password">
                <div id="hint" class="field-hint" style="display:none">At least 8 characters.</div>
            </div>
            <div id="form-error" class="field-error" style="display:none"></div>
            <button type="submit" id="submit-btn" class="btn btn-primary btn-block">Sign in</button>
        </form>

        <div class="switch">
            <span id="switch-text">No account?</span>
            <button type="button" id="switch-btn">Create one</button>
        </div>
    </div>`;

  const script = `
        var mode = 'login';
        var errorEl = document.getElementById('form-error');

        function showError(text) {
            errorEl.textContent = text;
            errorEl.style.display = 'block';
        }

        document.getElementById('switch-btn').onclick = function () {
            mode = mode === 'login' ? 'register' : 'login';
            var registering = mode === 'register';
            document.getElementById('submit-btn').textContent = registering ? 'Create account' : 'Sign in';
            document.getElementById('switch-text').textContent = registering ? 'Already have an account?' : 'No account?';
            this.textContent = registering ? 'Sign in' : 'Create one';
            document.getElementById('hint').style.display = registering ? 'block' : 'none';
            document.getElementById('password').autocomplete = registering ? 'new-password' : 'current-password';
            errorEl.style.display = 'none';
        };

        document.getElementById('auth-form').onsubmit = async function (event) {
            event.preventDefault();
            errorEl.style.display = 'none';

            var btn = document.getElementById('submit-btn');
            var username = document.getElementById('username').value.trim();
            var password = document.getElementById('password').value;
            if (!username || !password) { showError('Username and password are required.'); return; }

            var label = btn.textContent;
            btn.disabled = true;
            btn.textContent = mode === 'login' ? 'Signing in...' : 'Creating...';
            try {
                var form = new URLSearchParams();
                form.append('username', username);
                form.append('password', password);
                var resp = await fetch(mode === 'login' ? '/auth/token' : '/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: form.toString()
                });
                if (resp.ok) { window.location.href = '/'; return; }
                var data = await resp.json().catch(function () { return {}; });
                showError(data.detail || (mode === 'login' ? 'Invalid username or password.' : 'Could not create account.'));
            } catch (err) {
                showError('Network error. Please try again.');
            }
            btn.disabled = false;
            btn.textContent = label;
        };`;

  return page({
    title: "Sign in - Webhook Tester",
    maxWidth: "22rem",
    style: STYLE,
    body,
    script,
    centered: true,
  });
}
