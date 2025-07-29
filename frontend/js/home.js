// Home page script: handles login/register on index page and toggles content based on auth state.
document.addEventListener('DOMContentLoaded', () => {
    const authSection = document.getElementById('authSection');
    const loginSection = document.getElementById('loginSection');
    const loginFormHome = document.getElementById('loginFormHome');
    const registerFormHome = document.getElementById('registerFormHome');
    const showRegisterHome = document.getElementById('showRegisterHome');
    const showLoginHome = document.getElementById('showLoginHome');
    const loginBtnHome = document.getElementById('loginBtnHome');
    const registerBtnHome = document.getElementById('registerBtnHome');
    const loginAlert = document.getElementById('loginAlert');
    const loginTitle = document.getElementById('loginTitle');
    const userGreeting = document.getElementById('userGreeting');
    
    async function checkAuth() {
        try {
            const res = await fetch('/api/me', { credentials: 'include' });
            const data = await res.json();
            if (data.user) {
                userGreeting.textContent = `สวัสดี, ${data.user.username}`;
                authSection.style.display = 'block';
                loginSection.style.display = 'none';
            } else {
                authSection.style.display = 'none';
                loginSection.style.display = 'block';
            }
        } catch (err) {
            console.error('Auth check failed', err);
    }
  }

    function showAlert(msg, success = false) {
        loginAlert.textContent = msg;
        loginAlert.style.display = 'block';
        loginAlert.style.background = success ? '#d4edda' : '#f8d7da';
        loginAlert.style.color = success ? '#155724' : '#721c24';
        loginAlert.style.border = '1px solid ' + (success ? '#c3e6cb' : '#f5c6cb');
        setTimeout(() => {
            loginAlert.style.display = 'none';
        }, 3000);
    }

    async function checkAuth() {
        try {
            const res = await fetch('/api/me', { credentials: 'include' });
            const data = await res.json();
            if (data.user) {
                // Logged in
                userGreeting.textContent = data.user.username;
                authSection.style.display = 'block';
                loginSection.style.display = 'none';
            } else {
                // Not logged in
                authSection.style.display = 'none';
                loginSection.style.display = 'block';
            }
        } catch (err) {
            console.error('Auth check failed', err);
        }
    }

    showRegisterHome.addEventListener('click', (e) => {
        e.preventDefault();
        loginFormHome.style.display = 'none';
        registerFormHome.style.display = 'block';
        loginTitle.textContent = 'สมัครสมาชิก';
    });
    showLoginHome.addEventListener('click', (e) => {
        e.preventDefault();
        registerFormHome.style.display = 'none';
        loginFormHome.style.display = 'block';
        loginTitle.textContent = 'เข้าสู่ระบบ';
    });

    loginBtnHome.addEventListener('click', async () => {
        const username = document.getElementById('loginUsernameHome').value.trim();
        const password = document.getElementById('loginPasswordHome').value;
        if (!username || !password) {
            showAlert('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
            return;
        }
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const data = await res.json();
            if (data.error) {
                showAlert(data.error);
            } else {
                showAlert('เข้าสู่ระบบสำเร็จ', true);
                setTimeout(checkAuth, 500);
            }
        } catch (err) {
            showAlert('เกิดข้อผิดพลาด');
        }
    });

    registerBtnHome.addEventListener('click', async () => {
        const username = document.getElementById('registerUsernameHome').value.trim();
        const password = document.getElementById('registerPasswordHome').value;
        if (!username || !password) {
            showAlert('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
            return;
        }
        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const data = await res.json();
            if (data.error) {
                showAlert(data.error);
            } else {
                showAlert('สมัครสมาชิกสำเร็จ', true);
                setTimeout(checkAuth, 500);
            }
        } catch (err) {
            showAlert('เกิดข้อผิดพลาด');
        }
    });

    // Initial auth check on page load
    checkAuth();
});
