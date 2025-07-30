async function getCurrentUser() {
  try {
    const res = await fetch('/api/me', { credentials: 'include' });
    const data = await res.json();
    return data.user;
  } catch (err) {
    return null;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const saveBtn = document.getElementById('saveWrite');
  const writeText = document.getElementById('writeText');
  const writeMood = document.getElementById('writeMood');
  const alertBox = document.getElementById('writeAlert');
  const quickMoodContainer = document.getElementById('quickMoodButtons');

  const dailyQuestions = [
    {
      type: "choice",
      text: "วันนี้คุณรู้สึกใกล้เคียงกับคำไหนมากที่สุด?",
      options: ["ทะเล", "ภูเขา", "ดวงดาว", "สายลม", "อื่น ๆ"]
    },
    {
      type: "text",
      text: "อะไรคือสิ่งเล็ก ๆ ที่ทำให้คุณรู้สึกดีในวันนี้?"
    }
  ];

  const positiveResponses = [
    "ยินดีกับความสุขของคุณด้วยนะ 😊",
    "ดีใจที่วันนี้คุณรู้สึกดี 💖",
    "ขอให้ความสุขนี้อยู่กับคุณนาน ๆ นะ",
    "เก็บความรู้สึกดี ๆ นี้ไว้นานเท่าที่อยากเก็บเลย 🌟"
  ];

  const gentleResponses = [
    "ขอบคุณที่คุณแบ่งปันความรู้สึกนะ 🌷",
    "ทุกความรู้สึกของคุณมีคุณค่าเสมอ 🤍",
    "คุณกำลังทำดีที่สุดแล้วในแบบของคุณ",
    "บางทีแค่ยอมรับสิ่งที่รู้สึก ก็ถือว่ากล้าหาญมากแล้ว"
  ];

  function showFeedback() {
    const otherInput = document.getElementById('otherMood')?.value.toLowerCase() || '';
    const selectedRadio = document.querySelector('input[name="dailyChoice"]:checked');
    const feedbackBox = document.getElementById("feedbackBox");

    let response;
    if (selectedRadio && selectedRadio.value === "อื่น ๆ" && otherInput) {
      if (otherInput.includes("สุข") || otherInput.includes("ดี") || otherInput.includes("เบิกบาน")) {
        response = positiveResponses[Math.floor(Math.random() * positiveResponses.length)];
      } else {
        response = gentleResponses[Math.floor(Math.random() * gentleResponses.length)];
      }
    } else if (selectedRadio) {
      response = gentleResponses[Math.floor(Math.random() * gentleResponses.length)];
    } else {
      response = "ขอบคุณที่แบ่งปันความรู้สึกค่ะ 😊";
    }

    feedbackBox.innerText = response;
  }

  // แสดงคำถามประจำวัน
  const question = dailyQuestions[Math.floor(Math.random() * dailyQuestions.length)];
  const container = document.getElementById("dailyQuestionText");
  if (container) {
    if (question.type === "text") {
      container.innerHTML = `${question.text}<br>
        <textarea class="textarea-field" id="textAnswer" placeholder="พิมพ์คำตอบ..."></textarea>
        <button onclick="showFeedback()" class="button button-secondary">ส่งคำตอบ</button>`;
    } else if (question.type === "choice") {
      container.innerHTML = `${question.text}<br>` +
        question.options.map(opt => {
          if (opt === "อื่น ๆ") {
            return `<label><input type="radio" name="dailyChoice" value="อื่น ๆ"> อื่น ๆ</label>
              <input type="text" id="otherMood" class="input-field" placeholder="ระบุเพิ่มเติม...">`;
          } else {
            return `<label><input type="radio" name="dailyChoice" value="${opt}"> ${opt}</label>`;
          }
        }).join("<br>") +
        `<br><button onclick="showFeedback()" class="button button-secondary">ส่งคำตอบ</button>`;
    }
  }

  // ปุ่มเซฟ mood
  saveBtn.addEventListener('click', () => {
    const mood = writeMood.value;
    const text = writeText.value;
    if (!mood) {
      alert('กรุณาเลือกอารมณ์');
      return;
    }
    saveMoodEntry(mood, text);
  });

  // ปุ่ม quick mood
  if (quickMoodContainer) {
    quickMoodContainer.querySelectorAll('button[data-mood]').forEach(btn => {
      btn.addEventListener('click', () => {
        const mood = btn.getAttribute('data-mood');
        saveMoodEntry(mood, '');
      });
    });
  }

  async function saveMoodEntry(mood, text) {
    const user = await getCurrentUser();
    if (!user) { alert('กรุณาเข้าสู่ระบบ'); return; }
    const userId = user.userId;
    if (!userId) {
      alert('กรุณาเข้าสู่ระบบก่อนบันทึกอารมณ์');
      return;
    }
    try {
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
});

