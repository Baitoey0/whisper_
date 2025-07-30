document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const welcomeMsg = document.getElementById('welcomeMsg');
  const logoutBtn = document.getElementById('logoutBtn');
  const tabButtons = document.querySelectorAll('.tab-nav button');
  const sections = document.querySelectorAll('.section');

  // Mood elements
  const moodSelect = document.getElementById('moodSelect');
  const moodText = document.getElementById('moodText');
  const saveMoodBtn = document.getElementById('saveMoodBtn');
  const moodMsg = document.getElementById('moodMsg');
  const moodChartCanvas = document.getElementById('moodChart');
  let moodChart;

  // Calendar elements
  const calendarGrid = document.getElementById('calendarGrid');
  const calendarTitle = document.getElementById('calendarTitle');
  const prevMonthBtn = document.getElementById('prevMonth');
  const nextMonthBtn = document.getElementById('nextMonth');
  const taskTitle = document.getElementById('taskTitle');
  const taskDate = document.getElementById('taskDate');
  const taskNote = document.getElementById('taskNote');
  const saveTaskBtn = document.getElementById('saveTaskBtn');
  const taskMsg = document.getElementById('taskMsg');

  // Notes elements
  const noteMoodSelect = document.getElementById('noteMoodSelect');
  const noteText = document.getElementById('noteText');
  const saveNoteBtn = document.getElementById('saveNoteBtn');
  const noteMsg = document.getElementById('noteMsg');
  const notesList = document.getElementById('notesList');

  // Encouragement elements
  const encourageText = document.getElementById('encourageText');
  const sendEncourageBtn = document.getElementById('sendEncourageBtn');
  const encourageMsg = document.getElementById('encourageMsg');
  const getRandomEncourageBtn = document.getElementById('getRandomEncourageBtn');
  const randomEncourageDisplay = document.getElementById('randomEncourageDisplay');
  const encourageList = document.getElementById('encourageList');

  // Current calendar state
  let currentDate = new Date();

  // General functions
  function showMessage(element, msg, success = true) {
    element.textContent = msg;
    element.style.background = success ? '#d4edda' : '#f8d7da';
    element.style.color = success ? '#155724' : '#721c24';
    element.style.borderColor = success ? '#c3e6cb' : '#f5c6cb';
    element.style.display = 'block';
    setTimeout(() => {
      element.style.display = 'none';
    }, 3000);
  }

  // Authentication check
  async function checkAuth() {
    const res = await fetch('/api/me');
    const data = await res.json();
    if (!data.user) {
      window.location.href = 'login.html';
    } else {
      welcomeMsg.textContent = `สวัสดี, ${data.user.username}`;
    }
  }

  // Tab navigation
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      sections.forEach(sec => sec.classList.remove('active'));
      const id = btn.getAttribute('data-tab');
      document.getElementById(`section-${id}`).classList.add('active');
    });
  });

  // Logout
  logoutBtn.addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = 'login.html';
  });

  /* Mood section */
  // Fetch moods and draw chart
  async function loadMoods() {
  
    const resUser = await fetch('/api/me');
    const userData = await resUser.json();
    const userId = userData.user?.userId;
    if (!userId) return;

    const res = await fetch(`/api/moods?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) return;

    
    const moods = await res.json();
    // Aggregate by date (YYYY-MM-DD)
    const map = {};
    const moodValues = { '😢': 1, '😰': 2, '😠': 2, '😐': 3, '😊': 5 };
    moods.forEach(item => {
      const dateStr = item.timestamp.split('T')[0];
      if (!map[dateStr]) map[dateStr] = { count: 0, total: 0, moodCounts: {} };
      const val = moodValues[item.mood] || 3;
      map[dateStr].count++;
      map[dateStr].total += val;
      map[dateStr].moodCounts[item.mood] = (map[dateStr].moodCounts[item.mood] || 0) + 1;
    });
    const aggregated = [];
    Object.keys(map).forEach(date => {
      const { count, total, moodCounts } = map[date];
      let repMood = null;
      let maxCount = 0;
      let maxValue = -Infinity;
      Object.keys(moodCounts).forEach(m => {
        const c = moodCounts[m];
        const val = moodValues[m] || 0;
        if (c > maxCount || (c === maxCount && val > maxValue)) {
          maxCount = c;
          maxValue = val;
          repMood = m;
        }
      });
      aggregated.push({ date, mood: repMood });
    });
    aggregated.sort((a, b) => new Date(a.date) - new Date(b.date));
    const labels = aggregated.map(a => {
      const d = new Date(a.date);
      return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
    });
    const data = aggregated.map(a => moodValues[a.mood] || 3);
    const emojis = aggregated.map(a => a.mood);
    drawMoodChart(labels, data, emojis);
  }

  function drawMoodChart(labels, data, emojis) {
    if (moodChart) moodChart.destroy();
    moodChart = new Chart(moodChartCanvas.getContext('2d'), {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: '',
          data: data,
          borderColor: getComputedStyle(document.documentElement).getPropertyValue('--accent') || '#5c7ea3',
          backgroundColor: 'rgba(92, 126, 163, 0.2)',
          fill: false,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4,
          emojis: emojis
        }]
      },
      options: {
        scales: {
          y: {
            min: 0,
            max: 5.5,
            ticks: { stepSize: 1 },
            title: { display: true, text: 'ระดับอารมณ์' }
          },
          x: {
            title: { display: true, text: 'วัน' }
          }
        },
        plugins: { legend: { display: false } },
        maintainAspectRatio: false
      },
      plugins: [{
        id: 'emojiPlugin',
        afterDatasetDraw(chart, args, opts) {
          const { ctx } = chart;
          const dataset = chart.data.datasets[0];
          dataset.data.forEach((value, index) => {
            const meta = chart.getDatasetMeta(0);
            const x = meta.data[index].x;
            const y = meta.data[index].y;
            ctx.save();
            ctx.font = '20px serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(dataset.emojis[index], x, y - 15);
            ctx.restore();
          });
        }
      }]
    });
  }

  saveMoodBtn.addEventListener('click', async () => {
    const mood = moodSelect.value;
    const text = moodText.value;
    if (!mood) {
      showMessage(moodMsg, 'กรุณาเลือกอารมณ์', false);
      return;
    }
    const res = await fetch('/api/moods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mood, text })
    });
    const data = await res.json();
    if (data.error) {
      showMessage(moodMsg, data.error, false);
    } else {
      showMessage(moodMsg, 'บันทึกอารมณ์สำเร็จ', true);
      moodText.value = '';
      // Refresh chart
      loadMoods();
    }
  });

  /* Calendar section */
  function getMonthData(year, month, tasks) {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();
    const cells = [];
    for (let i = 0; i < 42; i++) {
      let dayNum = i - firstDay + 1;
      let cellMonth = month;
      let cellYear = year;
      let other = false;
      if (dayNum < 1) {
        cellMonth = month === 0 ? 11 : month - 1;
        cellYear = month === 0 ? year - 1 : year;
        dayNum = prevDays + dayNum;
        other = true;
      } else if (dayNum > daysInMonth) {
        cellMonth = month === 11 ? 0 : month + 1;
        cellYear = month === 11 ? year + 1 : year;
        dayNum = dayNum - daysInMonth;
        other = true;
      }
      const dateStr = `${cellYear}-${String(cellMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const dateTasks = tasks.filter(t => t.date === dateStr);
      cells.push({ dayNum, dateStr, other, hasTasks: dateTasks.length > 0 });
    }
    return cells;
  }

  async function loadTasksAndRenderCalendar() {
    const res = await fetch('/api/tasks');
    if (!res.ok) return;
    const tasks = await res.json();
    renderCalendar(currentDate.getFullYear(), currentDate.getMonth(), tasks);
  }

  function renderCalendar(year, month, tasks) {
    calendarGrid.innerHTML = '';
    const cells = getMonthData(year, month, tasks);
    calendarTitle.textContent = `${year}-${String(month + 1).padStart(2, '0')}`;
    cells.forEach(cell => {
      const div = document.createElement('div');
      div.classList.add('day');
      if (cell.other) div.classList.add('other-month');
      div.textContent = cell.dayNum;
      if (cell.hasTasks) {
        const dot = document.createElement('span');
        dot.classList.add('task-dot');
        dot.textContent = '•';
        div.appendChild(dot);
      }
      div.addEventListener('click', () => {
        // Fill date in form
        taskDate.value = cell.dateStr;
        // Show tasks for this date
        const todayTasks = tasks.filter(t => t.date === cell.dateStr);
        if (todayTasks.length > 0) {
          const list = todayTasks.map(t => `${t.title}${t.note ? ' - ' + t.note : ''}`).join('\n');
          alert(`กิจกรรมวันที่ ${cell.dateStr}:\n${list}`);
        } else {
          alert(`ยังไม่มีกิจกรรมในวันที่ ${cell.dateStr}`);
        }
      });
      calendarGrid.appendChild(div);
    });
  }

  prevMonthBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    loadTasksAndRenderCalendar();
  });
  nextMonthBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    loadTasksAndRenderCalendar();
  });

  saveTaskBtn.addEventListener('click', async () => {
    const title = taskTitle.value.trim();
    const date = taskDate.value;
    const note = taskNote.value.trim();
    if (!title || !date) {
      showMessage(taskMsg, 'กรุณากรอกชื่อกิจกรรมและวันที่', false);
      return;
    }
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, date, note })
    });
    const data = await res.json();
    if (data.error) {
      showMessage(taskMsg, data.error, false);
    } else {
      showMessage(taskMsg, 'บันทึกกิจกรรมสำเร็จ', true);
      taskTitle.value = '';
      taskDate.value = '';
      taskNote.value = '';
      loadTasksAndRenderCalendar();
    }
  });

  /* Notes section */
  async function loadNotes() {
    const res = await fetch('/api/notes');
    if (!res.ok) return;
    const notes = await res.json();
    notesList.innerHTML = '';
    if (notes.length === 0) {
      notesList.textContent = 'ยังไม่มีโน้ต';
      return;
    }
    notes.forEach(note => {
      const div = document.createElement('div');
      div.style.background = 'rgba(255, 255, 255, 0.7)';
      div.style.padding = '0.5rem';
      div.style.marginBottom = '0.5rem';
      div.style.borderRadius = '8px';
      div.innerHTML = `<span style="font-size:1.2rem;">${note.mood}</span> <strong>${note.text}</strong><br><span style="font-size:0.8rem;color:rgba(0,0,0,0.6);">${new Date(note.timestamp).toLocaleString('th-TH')}</span>`;
      notesList.appendChild(div);
    });
  }

  saveNoteBtn.addEventListener('click', async () => {
    const mood = noteMoodSelect.value;
    const text = noteText.value.trim();
    if (!text || !mood) {
      showMessage(noteMsg, 'กรุณาเลือกอารมณ์และกรอกข้อความ', false);
      return;
    }
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mood, text })
    });
    const data = await res.json();
    if (data.error) {
      showMessage(noteMsg, data.error, false);
    } else {
      showMessage(noteMsg, 'บันทึกโน้ตสำเร็จ', true);
      noteText.value = '';
      loadNotes();
    }
  });

  /* Encouragement section */
  async function loadEncouragements() {
    const res = await fetch('/api/encouragements');
    if (!res.ok) return;
    const list = await res.json();
    encourageList.innerHTML = '';
    if (list.length === 0) {
      encourageList.textContent = 'ยังไม่มีข้อความกำลังใจ';
      return;
    }
    // Show latest 10 messages
    const latest = list.slice(-10).reverse();
    latest.forEach(item => {
      const p = document.createElement('p');
      p.textContent = item.text;
      encourageList.appendChild(p);
    });
  }

  sendEncourageBtn.addEventListener('click', async () => {
    const text = encourageText.value.trim();
    if (!text) {
      showMessage(encourageMsg, 'กรุณากรอกข้อความ', false);
      return;
    }
    const res = await fetch('/api/encouragements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const data = await res.json();
    if (data.error) {
      showMessage(encourageMsg, data.error, false);
    } else {
      showMessage(encourageMsg, 'ส่งกำลังใจสำเร็จ', true);
      encourageText.value = '';
      loadEncouragements();
    }
  });

  getRandomEncourageBtn.addEventListener('click', async () => {
    const res = await fetch('/api/encouragements/random');
    const data = await res.json();
    randomEncourageDisplay.textContent = data ? `"${data.text}"` : 'ยังไม่มีข้อความกำลังใจ';
  });

  // Initialization
  (async function init() {
    await checkAuth();
    loadMoods();
    loadTasksAndRenderCalendar();
    loadNotes();
    loadEncouragements();
  })();
});
