
async function getCurrentUser() {
  try {
    const res = await fetch('/api/me', { credentials: 'include' });
    const data = await res.json();
    return data.user;
  } catch (err) {
    return null;
  }
}
// Journal page script for whisper deploy
// Fetches notes from the backend and displays them. Reply, edit, and delete actions
// are omitted because the simple backend does not support note modification.
document.addEventListener('DOMContentLoaded', () => {
    const journalList = document.getElementById('journalList');

    // Map emoji to soft background colours
  const moodColors = {
    '🤯': '#e0e0e0', // เทาอ่อน = สับสน
    '🥱': '#f3e5f5', // ม่วงอ่อน = เบื่อ
    '🥳': '#ffe082', // เหลืองสดใส = ตื่นเต้น
    '😴': '#d1c4e9', // ม่วงกลาง = ง่วง
    '😔': '#b0bec5', // เทาน้ำเงิน = นอย
    '😍': '#ffdce0', // ชมพูสด = มีความสุขมากกก
    '🙂': '#fff9c4', // เหลืองนวล = มีความสุขนิดๆ
    '😊': '#fff7d6', // เหลืองอ่อน = พอยิ้มๆ
    '😭': '#bbdefb', // ฟ้า = เศร้าไม่ไหวแล้ว
    '😩': '#ffe0b2', // ส้มอ่อน = เหนื่อย
    '😐': '#e5f0ff',
    '😢': '#e3f2fd',
    '😰': '#ffe8d6',
    '😠': '#ffe5e5'
  };


    async function fetchNotes() {
        try {
            const user = await getCurrentUser();
        if (!user) { alert('กรุณาเข้าสู่ระบบ'); return; }
        const userId = user.userId;
            if (!userId) {
                journalList.innerHTML = '<p style="color:rgba(0,0,0,0.6)">กรุณาเข้าสู่ระบบก่อน</p>';
                return;
            }
            const res = await fetch(`/api/notes?userId=${encodeURIComponent(userId)}`);
            const notes = await res.json();
            render(notes);
        } catch (err) {
            journalList.innerHTML = '<p style="color:rgba(0,0,0,0.6)">ไม่สามารถโหลดบันทึกได้</p>';
        }
    }

    function render(notes) {
        journalList.innerHTML = '';
        if (!notes || notes.length === 0) {
            const p = document.createElement('p');
            p.textContent = 'ยังไม่มีบันทึก';
            p.style.color = 'rgba(0,0,0,0.6)';
            journalList.appendChild(p);
            return;
        }
        // Sort notes by timestamp descending
        notes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        notes.forEach(entry => {
            const card = document.createElement('div');
            card.classList.add('journal-entry');
            card.style.background = moodColors[entry.mood] || 'rgba(255,255,255,0.7)';
            // mood and text
            const head = document.createElement('div');
            head.style.display = 'flex';
            head.style.alignItems = 'center';
            head.style.gap = '0.5rem';
            const moodSpan = document.createElement('span');
            moodSpan.textContent = entry.mood;
            moodSpan.style.fontSize = '1.5rem';
            head.appendChild(moodSpan);
            const textDiv = document.createElement('div');
            const ts = new Date(entry.timestamp);
            textDiv.innerHTML = `<p>${entry.text}</p><p style="font-size:0.8rem;color:rgba(0,0,0,0.5);margin-top:0.3rem;">${ts.toLocaleTimeString('th-TH', { hour:'2-digit', minute:'2-digit' })} · ${ts.toLocaleDateString('th-TH')}</p>`;
            head.appendChild(textDiv);
            card.appendChild(head);
            journalList.appendChild(card);
        });
    }

    fetchNotes();
});

document.addEventListener('DOMContentLoaded', async () => {
  const list = document.getElementById('questionAnswersList');
  if (!list) return;

  const res = await fetch('/api/my-question-answers', { credentials: 'include' });
  const data = await res.json();

  if (data.answers && data.answers.length > 0) {
    list.innerHTML = data.answers.map(entry => {
      const date = new Date(entry.date).toLocaleDateString('th-TH');
      return `
        <li style="margin-bottom:1rem;">
          <strong>📅 ${date}</strong><br>
          ❓ <em>${entry.questionText}</em><br>
          ✅ <strong>${entry.answer}</strong>
        </li>`;
    }).join('');
  } else {
    list.innerHTML = '<li>ยังไม่มีคำตอบคำถามประจำวัน</li>';
  }
});
