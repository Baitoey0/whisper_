document.addEventListener('DOMContentLoaded', () => {
    const listDiv = document.getElementById('encList');
    const btnLatest = document.getElementById('filterLatest');
    const btnLiked = document.getElementById('filterLiked');
    let myEnc = JSON.parse(localStorage.getItem('myEncouragements')) || [];
    let currentFilter = 'latest';
    // Render function
    function render() {
        listDiv.innerHTML = '';
        let entries = [...myEnc];
        if (currentFilter === 'liked') {
            entries = entries.filter(e => e.liked);
        }
        // Sort by time descending (assuming time string can be compared lexicographically; we store as locale string but maybe we keep insertion order; we keep as is)
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
            timeSpan.textContent = entry.time || '';
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
            likeBtn.addEventListener('click', () => {
                entry.liked = !entry.liked;
                localStorage.setItem('myEncouragements', JSON.stringify(myEnc));
                render();
            });
            actions.appendChild(likeBtn);
            // delete button
            const delBtn = document.createElement('button');
            delBtn.className = 'button button-secondary';
            delBtn.textContent = '🗑';
            delBtn.addEventListener('click', () => {
                if (confirm('ต้องการลบข้อความนี้หรือไม่?')) {
                    myEnc = myEnc.filter(e => e.id !== entry.id);
                    localStorage.setItem('myEncouragements', JSON.stringify(myEnc));
                    render();
                }
            });
            actions.appendChild(delBtn);
            meta.appendChild(actions);
            card.appendChild(meta);
            listDiv.appendChild(card);
        });
        // Message if no entries
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
    // Set default filter
    btnLatest.classList.add('button-primary');
    render();
});