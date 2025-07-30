
async function getCurrentUser() {
  try {
    const res = await fetch('/api/me', { credentials: 'include' });
    const data = await res.json();
    return data.user;
  } catch (err) {
    return null;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const saveBtn = document.getElementById('saveWrite');
  const writeText = document.getElementById('writeText');
  const writeMood = document.getElementById('writeMood');
  const alertBox = document.getElementById('writeAlert');
  const quickMoodContainer = document.getElementById('quickMoodButtons');
  const questionBox = document.getElementById('questionBox');
  const questionText = document.getElementById('questionText');
  const questionInput = document.getElementById('questionInput');

  const user = await getCurrentUser();
  if (!user) return;

  // Fetch daily question
  const res = await fetch('/api/daily-question', { credentials: 'include' });
  const qData = await res.json();
  const question = qData.question;

  if (question) {
    questionText.textContent = question.text;
    if (question.type === 'text') {
      questionInput.innerHTML = '<textarea id="questionAnswer" rows="3" class="w-full"></textarea>';
    } else if (question.type === 'choice') {
      questionInput.innerHTML = question.options.map(opt => 
        \`<label><input type="radio" name="questionAnswer" value="\${opt}"> \${opt}</label><br>\`
      ).join('');
    }

    document.getElementById('submitQuestion').onclick = async () => {
      let answer = '';
      if (question.type === 'text') {
        answer = document.getElementById('questionAnswer').value.trim();
      } else {
        const selected = document.querySelector('input[name="questionAnswer"]:checked');
        if (selected) answer = selected.value;
      }
      if (!answer) return alert("กรุณาตอบคำถาม");

      const res = await fetch('/api/submit-question-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ questionId: question._id, answer })
      });

      const feedback = await res.json();
      alert(feedback.message || "ขอบคุณที่ตอบคำถามนะ");
    };
  }
});
