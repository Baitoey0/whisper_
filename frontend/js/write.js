// Write page script for whisper deploy (backend enabled)
// Handles saving mood entries and optional text via API endpoints.
document.addEventListener('DOMContentLoaded', () => {
    const saveBtn = document.getElementById('saveWrite');
    const writeText = document.getElementById('writeText');
    const writeMood = document.getElementById('writeMood');
    const alertBox = document.getElementById('writeAlert');
    const quickMoodContainer = document.getElementById('quickMoodButtons');

    /**
     * Save a mood entry to the backend. If text is provided, also save it as a note.
     * Uses the API endpoints `/api/moods` and `/api/notes`.
     * @param {string} mood
     * @param {string} text
     */
    async function saveMoodEntry(mood, text) {
        // Retrieve the logged‑in userId from localStorage.  If not present,
        // prompt the user to log in again.
        const userId = localStorage.getItem('whisperUserId');
        if (!userId) {
            alert('กรุณาเข้าสู่ระบบก่อนบันทึกอารมณ์');
            return;
        }
        try {
            // Submit mood to backend; include userId in the request body
            const moodRes = await fetch('/submit-mood', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, mood, text: text || '' })
            });
            const moodData = await moodRes.json();
            if (moodData.error) {
                alert(moodData.error);
                return;
            }
            // If a non‑empty note was provided, record it separately via submit-journal
            if (text && text.trim() !== '') {
                const noteRes = await fetch('/submit-journal', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, mood, text: text.trim() })
                });
                const noteData = await noteRes.json();
                if (noteData.error) {
                    alert(noteData.error);
                    return;
                }
            }
            // Clear input fields
            writeText.value = '';
            writeMood.value = '';
            alertBox.style.display = 'block';
            setTimeout(() => {
                alertBox.style.display = 'none';
            }, 3000);
        } catch (err) {
            alert('เกิดข้อผิดพลาดในการบันทึก');
        }
    }

    // Handle saving via the main button (text + mood)
    saveBtn.addEventListener('click', () => {
        const mood = writeMood.value;
        const text = writeText.value;
        if (!mood) {
            alert('กรุณาเลือกอารมณ์');
            return;
        }
        saveMoodEntry(mood, text);
    });

    // Bind quick mood buttons if present
    if (quickMoodContainer) {
        quickMoodContainer.querySelectorAll('button[data-mood]').forEach(btn => {
            btn.addEventListener('click', () => {
                const mood = btn.getAttribute('data-mood');
                saveMoodEntry(mood, '');
            });
        });
    }
});
