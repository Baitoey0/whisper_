async function getCurrentUser() {
    try {
        const res = await fetch('/api/me', { credentials: 'include' });
        const data = await res.json();
        return data.user;
    } catch {
        return null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const listDiv = document.getElementById('encList');
    const btnLatest = document.getElementById('filterLatest');
    const btnLiked = document.getElementById('filterLiked');
    let myEnc = [];
    let currentFilter = 'latest';

    async function loadEncouragements() {
        const resUser = await getCurrentUser();
        if (!resUser) {
            listDiv.innerHTML = '<p style="color:rgba(0,0,0,0.6)">กรุณาเข้าสู่ระบบก่อน</p>';
            return;
        }
        try {
            const res = await fetch(`/api/saved-encouragements?userId=${encodeURIComponent(resUser.userId)}`);
            const data = await res.json();
            myEnc = data;
            render();
        } catch (err) {
            listDiv.innerHTML = '<p style="color:rgba(0,0,0,0.6)">ไม่สามารถโหลดข้อความได้</p>';
        }
    }

    function render() {
        listDiv.innerHTML = '';
        let entries = [...myEnc];
        if (currentFilter === 'liked') {
            entries = entries.filter(e => e.liked);
        }
        // Sort by timestamp descending
        entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        entries.forEach(entry => {
            const card = document.createElement('div');
            card.classList.add('journal-entry');
            const msgP = document.createElement('p');
            msgP.style.marginBottom = '0.5rem';
            msgP.textContent = '"' + entry.text + '"';
            card.appendChild(msgP);
            const meta = document.createElement('div');
            meta.style.display = 'flex';
            meta.style.justifyContent = 'space-between';
            meta.style.alignItems = 'center';
            // time
            const timeSpan = document.createElement('span');
            timeSpan.style.fontSize = '0.8rem';
            timeSpan.style.color = 'rgba(0,0,0,0.5)';
            const ts = new Date(entry.timestamp);
            timeSpan.textContent = ts.toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' });
            meta.appendChild(timeSpan);
            // actions
            const actions = document.createElement('div');
            actions.style.display = 'flex';
            actions.style.gap = '0.5rem';
            // like button
            const likeBtn = document.createElement('button');
            likeBtn.className = 'button button-secondary';
            likeBtn.textContent = '♥';
            if (entry.liked) likeBtn.classList.add('button-primary');
            likeBtn.addEventListener('click', async () => {
                try {
                    await fetch('/api/saved-encouragements/like', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: entry.id, liked: !entry.liked })
                    });
                    entry.liked = !entry.liked;
                    render();
                } catch (err) {
                    alert('เกิดข้อผิดพลาดในการบันทึกการกดถูกใจ');
                }
            });
            actions.appendChild(likeBtn);
            // delete button
            const delBtn = document.createElement('button');
            delBtn.className = 'button button-secondary';
            delBtn.textContent = '🗑';
            delBtn.addEventListener('click', async () => {
                if (!confirm('ต้องการลบข้อความนี้หรือไม่?')) return;
                try {
                    await fetch(`/api/saved-encouragements/${entry.id}`, { method: 'DELETE' });
                    myEnc = myEnc.filter(e => e.id !== entry.id);
                    render();
                } catch (err) {
                    alert('เกิดข้อผิดพลาดในการลบ');
                }
            });
            actions.appendChild(delBtn);
            meta.appendChild(actions);
            card.appendChild(meta);
            listDiv.appendChild(card);
        });
        if (entries.length === 0) {
            const p = document.createElement('p');
            p.textContent = 'ยังไม่มีข้อความที่บันทึกไว้';
            p.style.color = 'rgba(0,0,0,0.6)';
            listDiv.appendChild(p);
        }
    }

    // Filter button events
    btnLatest.addEventListener('click', () => {
        currentFilter = 'latest';
        btnLatest.classList.add('button-primary');
        btnLiked.classList.remove('button-primary');
        render();
    });
    btnLiked.addEventListener('click', () => {
        currentFilter = 'liked';
        btnLiked.classList.add('button-primary');
        btnLatest.classList.remove('button-primary');
        render();
    });

    btnLatest.classList.add('button-primary');
    loadEncouragements();
});