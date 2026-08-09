export const loginPage = () => `<!DOCTYPE html>
<html>
<head>
    <title>Webhook Tester - Login</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background: #2c3e50; color: #333; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .login-card { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); width: 300px; text-align: center; }
        h1 { margin-bottom: 30px; color: #333; }
        input { width: 100%; padding: 12px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
        button { width: 100%; padding: 12px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; font-weight: bold; }
        button:hover { background: #2980b9; }
        .error { color: #e74c3c; margin-bottom: 15px; font-size: 0.9em; display: none; }
    </style>
</head>
<body>
    <div class="login-card">
        <h1>Webhook Tester</h1>
        <div id="error-msg" class="error"></div>
        <form id="login-form">
            <input type="text" id="username" placeholder="Username" required autofocus>
            <input type="password" id="password" placeholder="Password" required>
            <button type="submit">Login</button>
        </form>
    </div>
    <script>
        document.getElementById('login-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            const errorMsg = document.getElementById('error-msg');
            errorMsg.style.display = 'none';

            const formData = new URLSearchParams();
            formData.append('username', document.getElementById('username').value);
            formData.append('password', document.getElementById('password').value);

            try {
                const resp = await fetch('/auth/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: formData.toString()
                });
                if (resp.ok) {
                    window.location.href = '/';
                } else {
                    errorMsg.textContent = 'Invalid username or password.';
                    errorMsg.style.display = 'block';
                }
            } catch (err) {
                errorMsg.textContent = 'Connection error. Please try again.';
                errorMsg.style.display = 'block';
            }
        });
    </script>
</body>
</html>`;
