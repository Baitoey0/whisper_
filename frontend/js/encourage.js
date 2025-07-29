
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
    // Load myEncouragements from localStorage
    let myEnc = JSON.parse(localStorage.getItem('myEncouragements')) || [];

    // Handle sending encouragement
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
            const res = await fetch('/api/encouragements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ text })
            });
            const data = await res.json();
            if (data.error) {
                alert(data.error);
                return;
            }
            textArea.value = '';
            alert('ส่งข้อความกำลังใจเรียบร้อย!');
        } catch (err) {
            alert('เกิดข้อผิดพลาดในการส่งข้อความ');
        }
    });

    // Handle get random encouragement
    getBtn.addEventListener('click', async () => {
        try {
            const res = await fetch('/api/encouragements/random', { credentials: 'include' });
            const msg = await res.json();
            if (!msg) {
                display.textContent = 'ยังไม่มีข้อความกำลังใจในระบบ';
                display.style.display = 'block';
                actionsDiv.style.display = 'none';
                return;
            }
            // Show message
            display.textContent = '"' + msg.text + '"';
            display.style.display = 'block';
            // Prepare actions: like (toggle), save
            actionsDiv.innerHTML = '';
            // Like button (not persisted to backend)
            const likeBtn = document.createElement('button');
            likeBtn.className = 'button button-secondary';
            likeBtn.textContent = '♥';
            likeBtn.addEventListener('click', () => {
                likeBtn.classList.toggle('button-primary');
            });
            actionsDiv.appendChild(likeBtn);
            // Save button (local storage)
            const saveBtn = document.createElement('button');
            saveBtn.className = 'button button-secondary';
            saveBtn.textContent = '💾';
            saveBtn.addEventListener('click', () => {
                const entry = {
                    id: Date.now(),
                    text: msg.text,
                    time: new Date().toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }),
                    liked: false
                };
                myEnc.unshift(entry);
                localStorage.setItem('myEncouragements', JSON.stringify(myEnc));
                alert('บันทึกข้อความแล้ว');
            });
            actionsDiv.appendChild(saveBtn);
            actionsDiv.style.display = 'flex';
        } catch (err) {
            alert('เกิดข้อผิดพลาดในการดึงข้อความ');
        }
    });
});
