// Calendar page script for whisper deploy
// Uses backend API to store and retrieve tasks (deadlines) per user.
document.addEventListener('DOMContentLoaded', () => {
    const calendarEl = document.getElementById('calendar');
    const taskTitle = document.getElementById('taskTitle');
    const taskDate = document.getElementById('taskDate');
    const taskNote = document.getElementById('taskNote');
    const addTaskBtn = document.getElementById('addTask');
    const modal = document.getElementById('taskModal');
    const modalTitle = document.getElementById('modalDateTitle');
    const modalList = document.getElementById('modalTaskList');
    const closeModal = document.getElementById('closeModal');

    let tasks = [];
    let currentDate = new Date();
    let currentYear = currentDate.getFullYear();
    let currentMonth = currentDate.getMonth();
    let selectedDate = null;
    let editingTaskId = null;

    const monthNames = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
    const dayNames = ['อา','จ','อ','พ','พฤ','ศ','ส'];


    async function getCurrentUser() {
        try {
            const res = await fetch('/api/me', { credentials: 'include' });
            const data = await res.json();
            return data.user;
        } catch (err) {
            return null;
        }
    }

    async function loadTasks() {
        try {
            const user = await getCurrentUser();
            if (!user) {
                alert('กรุณาเข้าสู่ระบบก่อน');
                tasks = [];
                renderCalendar(currentYear, currentMonth);
                return;
            }
            const userId = user.userId;
            const res = await fetch(`/api/tasks?userId=${encodeURIComponent(userId)}`);
            tasks = await res.json();
            renderCalendar(currentYear, currentMonth);
        } catch (err) {
            console.error('Error loading tasks', err);
        }
    }

    function renderCalendar(year, month) {
        calendarEl.innerHTML = '';
        // Header row
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.marginBottom = '0.5rem';
        const prevBtn = document.createElement('button');
        prevBtn.textContent = '<';
        prevBtn.className = 'button button-secondary';
        prevBtn.addEventListener('click', () => {
            if (currentMonth === 0) {
                currentMonth = 11;
                currentYear--;
            } else {
                currentMonth--;
            }
            renderCalendar(currentYear, currentMonth);
        });
        const nextBtn = document.createElement('button');
        nextBtn.textContent = '>';
        nextBtn.className = 'button button-secondary';
        nextBtn.addEventListener('click', () => {
            if (currentMonth === 11) {
                currentMonth = 0;
                currentYear++;
            } else {
                currentMonth++;
            }
            renderCalendar(currentYear, currentMonth);
        });
        const title = document.createElement('h3');
        title.textContent = `${monthNames[month]} ${year}`;
        title.classList.add('gradient-text');
        header.appendChild(prevBtn);
        header.appendChild(title);
        header.appendChild(nextBtn);
        calendarEl.appendChild(header);
        // Day names
        const dayRow = document.createElement('div');
        dayRow.style.display = 'grid';
        dayRow.style.gridTemplateColumns = 'repeat(7, 1fr)';
        dayRow.style.marginBottom = '0.5rem';
        dayNames.forEach(day => {
            const cell = document.createElement('div');
            cell.textContent = day;
            cell.style.textAlign = 'center';
            cell.style.fontWeight = '600';
            cell.style.color = 'var(--accent-color)';
            dayRow.appendChild(cell);
        });
        calendarEl.appendChild(dayRow);
        // Grid
        const grid = document.createElement('div');
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(7, 1fr)';
        // calculate first day and days in month
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const prevDays = new Date(year, month, 0).getDate();
        for (let i = 0; i < 42; i++) {
            const cell = document.createElement('div');
            cell.style.minHeight = '80px';
            cell.style.border = '1px solid rgba(255,255,255,0.5)';
            cell.style.padding = '4px';
            let dateNumber = i - firstDay + 1;
            let cellYear = year;
            let cellMonth = month;
            if (dateNumber < 1) {
                cellMonth = month === 0 ? 11 : month - 1;
                cellYear = month === 0 ? year - 1 : year;
                dateNumber = prevDays + dateNumber;
                cell.style.color = 'rgba(0,0,0,0.4)';
            } else if (dateNumber > daysInMonth) {
                cellMonth = month === 11 ? 0 : month + 1;
                cellYear = month === 11 ? year + 1 : year;
                dateNumber = dateNumber - daysInMonth;
                cell.style.color = 'rgba(0,0,0,0.4)';
            }
            const dateDiv = document.createElement('div');
            dateDiv.textContent = dateNumber;
            dateDiv.style.textAlign = 'left';
            dateDiv.style.fontWeight = '600';
            cell.appendChild(dateDiv);
            // tasks indicator
            const dateStr = `${cellYear}-${String(cellMonth + 1).padStart(2,'0')}-${String(dateNumber).padStart(2,'0')}`;
            const dateTasks = tasks.filter(t => t.date === dateStr);
            if (dateTasks.length > 0) {
                const dots = document.createElement('div');
                dateTasks.forEach(() => {
                    const dot = document.createElement('span');
                    dot.textContent = '•';
                    dot.style.color = 'var(--accent-color)';
                    dot.style.marginRight = '2px';
                    dot.style.fontSize = '1.2rem';
                    dots.appendChild(dot);
                });
                cell.appendChild(dots);
            }
            // click handler
            cell.addEventListener('click', () => {
                selectedDate = dateStr;
                if (taskDate) {
                    taskDate.value = selectedDate;
                }
                showTasksModal(dateStr);
            });
            grid.appendChild(cell);
        }
        calendarEl.appendChild(grid);
    }

    function showTasksModal(dateStr) {
        modalTitle.textContent = `กิจกรรมวันที่ ${dateStr}`;
        modalList.innerHTML = '';
        const list = tasks.filter(t => t.date === dateStr);
        if (list.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'ไม่มีกิจกรรมในวันนี้';
            li.style.color = 'rgba(0,0,0,0.6)';
            modalList.appendChild(li);
        } else {
            list.forEach(task => {
                const li = document.createElement('li');
                li.style.display = 'flex';
                li.style.justifyContent = 'space-between';
                li.style.alignItems = 'center';
                li.style.marginBottom = '0.5rem';
                const info = document.createElement('div');
                info.style.flex = '1';
                info.innerHTML = `<strong>${task.title}</strong>${task.note ? ` - ${task.note}` : ''}`;
                li.appendChild(info);
                const actions = document.createElement('div');
                // edit
                const editB = document.createElement('button');
                editB.className = 'button button-secondary';
                editB.textContent = 'แก้ไข';
                editB.style.marginRight = '0.25rem';
                editB.addEventListener('click', () => {
                    taskTitle.value = task.title;
                    taskDate.value = task.date;
                    taskNote.value = task.note || '';
                    editingTaskId = task.id;
                    modal.style.display = 'none';
                });
                actions.appendChild(editB);
                // delete
                const delB = document.createElement('button');
                delB.className = 'button button-secondary';
                delB.textContent = 'ลบ';
                delB.addEventListener('click', async () => {
                    if (confirm('ต้องการลบกิจกรรมนี้หรือไม่?')) {
                        await deleteTask(task.id);
                        showTasksModal(dateStr);
                    }
                });
                actions.appendChild(delB);
                li.appendChild(actions);
                modalList.appendChild(li);
            });
        }
        modal.style.display = 'flex';
    }

    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    async function saveTask() {
        const title = taskTitle.value.trim();
        const date = taskDate.value;
        const note = taskNote.value.trim();
        if (!title || !date) {
            alert('กรุณากรอกชื่อกิจกรรมและวันที่');
            return;
        }
        const user = await getCurrentUser();
        if (!user) {
            alert('กรุณาเข้าสู่ระบบก่อน');
            tasks = [];
            renderCalendar(currentYear, currentMonth);
            return;
        }
        const userId = user.userId;

        try {
            const body = { userId, title, date, note };
            if (editingTaskId) {
                body.id = editingTaskId;
            }
            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (data.error) {
                alert(data.error);
                return;
            }
            editingTaskId = null;
            taskTitle.value = '';
            taskDate.value = '';
            taskNote.value = '';
            modal.style.display = 'none';
            await loadTasks();
        } catch (err) {
            alert('เกิดข้อผิดพลาดในการบันทึกงาน');
        }
    }

    async function deleteTask(id) {
        try {
            await fetch(`/api/tasks/${id}`, {
                method: 'DELETE'
            });
            await loadTasks();
        } catch (err) {
            alert('เกิดข้อผิดพลาดในการลบงาน');
        }
    }

    addTaskBtn.addEventListener('click', saveTask);

    // Initial load
    loadTasks();
});
