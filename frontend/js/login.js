document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const showRegister = document.getElementById('showRegister');
  const showLogin = document.getElementById('showLogin');
  const alertBox = document.getElementById('alert');

  function showMessage(msg, success = false) {
    alertBox.textContent = msg;
    alertBox.style.display = 'block';
    alertBox.style.background = success ? '#d4edda' : '#f8d7da';
    alertBox.style.color = success ? '#155724' : '#721c24';
    alertBox.style.borderColor = success ? '#c3e6cb' : '#f5c6cb';
    setTimeout(() => {
      alertBox.style.display = 'none';
    }, 3000);
  }

  showRegister.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
  });
  showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.style.display = 'none';
    loginForm.style.display = 'block';
  });

  document.getElementById('loginBtn').addEventListener('click', async () => {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    if (!username || !password) {
      showMessage('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      return;
    }
    try {
      // Call the backend login endpoint (not prefixed with /api)
      const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.error) {
        showMessage(data.error);
      } else {
        // Persist the authenticated userId and username in localStorage so
        // that subsequent requests can include the userId.  This avoids
        // reliance on cookies or sessions.
        showMessage('เข้าสู่ระบบสำเร็จ', true);
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 500);
      }
    } catch (err) {
      showMessage('เกิดข้อผิดพลาด');
    }
  });

  document.getElementById('registerBtn').addEventListener('click', async () => {
    const username = document.getElementById('registerUsername').value.trim();
    const password = document.getElementById('registerPassword').value;
    if (!username || !password) {
      showMessage('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      return;
    }
    try {
      // Call the backend register endpoint (not prefixed with /api)
      const res = await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.error) {
        showMessage(data.error);
      } else {
        // Save returned userId and username to localStorage and
        // redirect to index.  This ensures the user stays logged in
        // across page reloads.
        showMessage('สมัครสมาชิกสำเร็จ', true);
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 500);
      }
    } catch (err) {
      showMessage('เกิดข้อผิดพลาด');
    }
  });
});
