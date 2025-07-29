// Journal page script for whisper deploy
// Fetches notes from the backend and displays them. Reply, edit, and delete actions
// are omitted because the simple backend does not support note modification.
document.addEventListener('DOMContentLoaded', () => {
    const journalList = document.getElementById('journalList');

    // Map emoji to soft background colours
    const moodColors = {
        '😊': '#fff7d6', // pale yellow
        '😐': '#e5f0ff', // light blue
        '😢': '#e3f2fd', // very light blue
        '😰': '#ffe8d6', // peach
        '😠': '#ffe5e5'  // light red
    };

    async function fetchNotes() {
        try {
            const userId = localStorage.getItem('whisperUserId');
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
