
async function getCurrentUser() {
  try {
    const res = await fetch('/api/me', { credentials: 'include' });
    const data = await res.json();
    return data.user;
  } catch (err) {
    return null;
  }
}
// Encourage page script for whisper deploy
// Uses backend API to store and fetch encouragement messages. Users can send encouragement
// to the global pool and retrieve random encouragements. Saved encouragements are stored
// locally per user.
document.addEventListener('DOMContentLoaded', () => {
    const sendBtn = document.getElementById('sendEncourage');
    const textArea = document.getElementById('encourageText');
    const getBtn = document.getElementById('getEncourage');
    const display = document.getElementById('encourageDisplay');
    const actionsDiv = document.getElementById('encourageActions');
    let currentMsg = null;

    // Send a new encouragement.  Requires the user to be logged in.  The
    // message will be stored globally on the server.
    sendBtn.addEventListener('click', async () => {
        const user = await getCurrentUser();
        if (!user) {
            alert('กรุณาเข้าสู่ระบบก่อนส่งกำลังใจ');
            return;
        }
        const text = textArea.value.trim();
        if (!text) {
            alert('กรุณากรอกข้อความ');
            return;
        }
        try {
            await fetch('/api/encouragements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.userId, text })
            });
            textArea.value = '';
            alert('ส่งข้อความกำลังใจเรียบร้อย!');
        } catch (err) {
            alert('เกิดข้อผิดพลาดในการส่งข้อความ');
        }
    });

    // Fetch a random encouragement message from the server and display it.
    getBtn.addEventListener('click', async () => {
        try {
            const res = await fetch('/api/encouragements/random');
            const msg = await res.json();
            if (!msg) {
                display.textContent = 'ยังไม่มีข้อความกำลังใจในระบบ';
                display.style.display = 'block';
                actionsDiv.style.display = 'none';
                return;
            }
            currentMsg = msg;
            display.textContent = '"' + msg.text + '"';
            display.style.display = 'block';
            actionsDiv.innerHTML = '';
            // Like button (purely visual)
            const likeBtn = document.createElement('button');
            likeBtn.className = 'button button-secondary';
            likeBtn.textContent = '♥';
            likeBtn.addEventListener('click', () => {
                likeBtn.classList.toggle('button-primary');
            });
            actionsDiv.appendChild(likeBtn);
            // Save button (persist to server)
            const saveBtn = document.createElement('button');
            saveBtn.className = 'button button-secondary';
            saveBtn.textContent = '💾';
            saveBtn.addEventListener('click', async () => {
                const user = await getCurrentUser();
                if (!user) {
                    alert('กรุณาเข้าสู่ระบบก่อน');
                    return;
                }
                try {
                    await fetch('/api/saved-encouragements', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: user.userId, text: currentMsg.text })
                    });
                    alert('บันทึกข้อความแล้ว');
                } catch (err) {
                    alert('เกิดข้อผิดพลาดในการบันทึกข้อความ');
                }
            });
            actionsDiv.appendChild(saveBtn);
            actionsDiv.style.display = 'flex';
        } catch (err) {
            alert('เกิดข้อผิดพลาดในการดึงข้อความ');
        }
    });
});
