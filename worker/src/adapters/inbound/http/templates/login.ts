import { esc, page } from "./layout";

const GOOGLE_LOGO = `<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.7 1.22 9.2 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>`;

const STYLE = `
    body {
        background: #2c3e50;
        display: flex; justify-content: center; align-items: center;
        min-height: 100vh; min-height: 100dvh;
    }
    .login-card { background: white; padding: 28px 22px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); width: 100%; text-align: center; }
    .login-card h1 { margin-bottom: 22px; color: #333; }
    .google-btn {
        display: flex; align-items: center; justify-content: center; gap: 10px;
        width: 100%; min-height: 46px; padding: 11px;
        border: 1px solid #ddd; border-radius: 6px;
        text-decoration: none; color: #333; font-weight: 600;
    }
    .google-btn:hover { background: #f7f7f7; }
    .divider { display: flex; align-items: center; gap: 10px; color: #999; font-size: 0.85rem; margin: 18px 0; }
    .divider::before, .divider::after { content: ""; flex: 1; height: 1px; background: #e5e5e5; }
    .error { color: #e74c3c; margin-bottom: 14px; font-size: 0.9rem; }
    .toggle { margin-top: 18px; font-size: 0.9rem; color: #666; }
    .toggle a { color: #3498db; cursor: pointer; text-decoration: none; font-weight: 600; }
    .hint { font-size: 0.8rem; color: #999; margin: -6px 0 12px; text-align: left; }
    #auth-form input { margin-bottom: 12px; }
`;

export function loginPage(params: { error?: string }): string {
  const errorText = params.error === "sso" ? "Single sign-on failed. Please try again." : "";

  const body = `
    <div class="login-card">
        <h1 id="title">Webhook Tester</h1>
        <div id="error-msg" class="error" ${errorText ? "" : 'style="display: none;"'}>${esc(errorText)}</div>

        <a class="google-btn" href="/auth/sso">${GOOGLE_LOGO}<span>Continue with Google</span></a>
        <div class="divider"><span>or</span></div>

        <form id="auth-form">
            <input type="text" id="username" placeholder="Username" required
                   autocomplete="username" autocapitalize="none" autocorrect="off">
            <input type="password" id="password" placeholder="Password" required autocomplete="current-password">
            <div id="hint" class="hint" style="display: none;">At least 8 characters.</div>
            <button type="submit" id="submit-btn" class="btn btn-block">Login</button>
        </form>

        <div class="toggle">
            <span id="toggle-text">No account?</span>
            <a id="toggle-link">Register</a>
        </div>
    </div>`;

  const script = `
        let mode = 'login';
        const errorMsg = document.getElementById('error-msg');

        function showError(text) {
            errorMsg.textContent = text;
            errorMsg.style.display = 'block';
        }

        document.getElementById('toggle-link').addEventListener('click', function() {
            mode = mode === 'login' ? 'register' : 'login';
            const registering = mode === 'register';
            document.getElementById('title').textContent = registering ? 'Create Account' : 'Webhook Tester';
            document.getElementById('submit-btn').textContent = registering ? 'Register' : 'Login';
            document.getElementById('toggle-text').textContent = registering ? 'Already have an account?' : 'No account?';
            this.textContent = registering ? 'Login' : 'Register';
            document.getElementById('hint').style.display = registering ? 'block' : 'none';
            document.getElementById('password').autocomplete = registering ? 'new-password' : 'current-password';
            errorMsg.style.display = 'none';
        });

        document.getElementById('auth-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            errorMsg.style.display = 'none';

            const formData = new URLSearchParams();
            formData.append('username', document.getElementById('username').value);
            formData.append('password', document.getElementById('password').value);

            try {
                const resp = await fetch(mode === 'login' ? '/auth/token' : '/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: formData.toString()
                });
                if (resp.ok) {
                    window.location.href = '/';
                    return;
                }
                const data = await resp.json().catch(() => ({}));
                showError(data.detail || (mode === 'login' ? 'Invalid username or password.' : 'Registration failed.'));
            } catch (err) {
                showError('Connection error. Please try again.');
            }
        });`;

  return page({ title: "Webhook Tester - Login", maxWidth: "22rem", style: STYLE, body, script });
}
