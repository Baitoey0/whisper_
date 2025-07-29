document.addEventListener('DOMContentLoaded', () => {
    const chatMessagesDiv = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendChat');
    const newChatBtn = document.getElementById('newChat');
    const botToggleBtn = document.getElementById('botToggle');
    const reportBtn = document.getElementById('reportBtn');
    let botMode = false;
    // Load chat history
    let chatHistory = JSON.parse(localStorage.getItem('whisperChat')) || [];
    // Predefined bot responses
    const botResponses = [
        'ขอบคุณที่แบ่งปันนะ',
        'ฉันอยู่ตรงนี้เพื่อรับฟังเสมอ',
        'ทุกอย่างจะดีขึ้น อย่ายอมแพ้',
        'อย่าลืมหายใจลึกๆ นะ'
    ];
    function render() {
        chatMessagesDiv.innerHTML = '';
        chatHistory.forEach(msg => {
            const div = document.createElement('div');
            div.classList.add('chat-message');
            if (msg.isOwn) div.classList.add('own');
            div.innerHTML = `<p>${msg.text}</p><p style="font-size:0.7rem;color:${msg.isOwn ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)'};margin-top:0.2rem;">${msg.time}</p>`;
            chatMessagesDiv.appendChild(div);
        });
        // Scroll to bottom
        chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
    }
    render();
    // Send chat message
    function sendMessage(text, isOwn = true) {
        if (!text.trim()) return;
        const now = new Date().toLocaleTimeString('th-TH', { hour:'2-digit', minute:'2-digit' });
        chatHistory.push({ text, isOwn, time: now });
        localStorage.setItem('whisperChat', JSON.stringify(chatHistory));
        render();
    }
    sendBtn.addEventListener('click', () => {
        const text = chatInput.value;
        if (!text.trim()) return;
        sendMessage(text, true);
        chatInput.value = '';
        // If bot mode, respond after a short delay
        if (botMode) {
            const response = botResponses[Math.floor(Math.random() * botResponses.length)];
            setTimeout(() => {
                sendMessage(response, false);
            }, 600);
        }
    });
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendBtn.click();
        }
    });
    // New chat resets history
    newChatBtn.addEventListener('click', () => {
        if (confirm('ต้องการเริ่มแชทใหม่หรือไม่? ข้อความทั้งหมดจะถูกลบ')) {
            chatHistory = [];
            localStorage.setItem('whisperChat', JSON.stringify(chatHistory));
            render();
        }
    });
    // Toggle bot mode
    botToggleBtn.addEventListener('click', () => {
        botMode = !botMode;
        botToggleBtn.classList.toggle('button-primary');
        botToggleBtn.textContent = botMode ? 'หยุดคุยกับบอท' : 'คุยกับบอท';
    });
    // Report button
    reportBtn.addEventListener('click', () => {
        alert('ขอบคุณสำหรับการรายงาน ทีมงานจะตรวจสอบข้อความนี้');
    });
});