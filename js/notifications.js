// ============================================
// NCHSM AI CHATBOT ASSISTANT
// ============================================

class ChatbotAssistant {
    constructor() {
        this.isOpen = false;
        this.messages = [];
        this.userId = null;
        this.userProfile = null;
        this.intents = {
            'greeting': ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
            'exam': ['exam', 'assessment', 'cat', 'test', 'quiz'],
            'attendance': ['attendance', 'absent', 'present', 'check in'],
            'grades': ['grade', 'score', 'result', 'marks', 'performance'],
            'fee': ['fee', 'payment', 'balance', 'tuition', 'invoice'],
            'courses': ['course', 'unit', 'subject', 'register', 'enroll'],
            'schedule': ['schedule', 'timetable', 'class', 'lecture', 'time'],
            'resources': ['resource', 'material', 'past paper', 'notes', 'study'],
            'profile': ['profile', 'account', 'password', 'change', 'update'],
            'help': ['help', 'support', 'assist', 'guide', 'how to']
        };
        
        this.responses = {
            'greeting': this.greetingResponse.bind(this),
            'exam': this.examResponse.bind(this),
            'attendance': this.attendanceResponse.bind(this),
            'grades': this.gradesResponse.bind(this),
            'fee': this.feeResponse.bind(this),
            'courses': this.coursesResponse.bind(this),
            'schedule': this.scheduleResponse.bind(this),
            'resources': this.resourcesResponse.bind(this),
            'profile': this.profileResponse.bind(this),
            'help': this.helpResponse.bind(this),
            'default': this.defaultResponse.bind(this)
        };
        
        this.init();
    }
    
    init() {
        console.log('🤖 Initializing Chatbot Assistant...');
        this.createChatWidget();
        this.addStyles();
        console.log('✅ Chatbot Assistant ready');
    }
    
    createChatWidget() {
        // Chat button
        const button = document.createElement('button');
        button.id = 'chatbotToggle';
        button.innerHTML = '💬';
        button.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: #4C1D95;
            color: white;
            border: none;
            font-size: 28px;
            cursor: pointer;
            box-shadow: 0 4px 20px rgba(76, 29, 149, 0.4);
            z-index: 99998;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        // Pulse animation
        const pulse = document.createElement('span');
        pulse.style.cssText = `
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: rgba(76, 29, 149, 0.3);
            animation: chatbotPulse 2s infinite;
        `;
        button.appendChild(pulse);
        button.appendChild(document.createTextNode('💬'));
        
        document.body.appendChild(button);
        
        // Chat window
        const chatWindow = document.createElement('div');
        chatWindow.id = 'chatbotWindow';
        chatWindow.style.cssText = `
            position: fixed;
            bottom: 100px;
            right: 24px;
            width: 400px;
            max-width: 90vw;
            height: 550px;
            max-height: 80vh;
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            display: none;
            flex-direction: column;
            z-index: 99999;
            overflow: hidden;
            font-family: 'Inter', sans-serif;
            border: 1px solid #e5e7eb;
        `;
        
        chatWindow.innerHTML = `
            <div style="
                background: #4C1D95;
                color: white;
                padding: 16px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-radius: 16px 16px 0 0;
            ">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="
                        width: 36px;
                        height: 36px;
                        border-radius: 50%;
                        background: rgba(255,255,255,0.2);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 18px;
                    ">🤖</div>
                    <div>
                        <div style="font-weight: 700; font-size: 16px;">NCHSM Assistant</div>
                        <div style="font-size: 12px; opacity: 0.8;">Online · Ready to help</div>
                    </div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button id="chatbotClear" style="
                        background: none;
                        border: none;
                        color: white;
                        cursor: pointer;
                        padding: 4px;
                        opacity: 0.7;
                    ">🗑️</button>
                    <button id="chatbotClose" style="
                        background: none;
                        border: none;
                        color: white;
                        cursor: pointer;
                        font-size: 20px;
                        padding: 0 4px;
                    ">×</button>
                </div>
            </div>
            <div id="chatbotMessages" style="
                flex: 1;
                padding: 16px;
                overflow-y: auto;
                background: #f8fafc;
            ">
                <div class="chatbot-message bot" style="
                    display: flex;
                    gap: 10px;
                    margin-bottom: 12px;
                    animation: messageIn 0.3s ease;
                ">
                    <div style="
                        width: 32px;
                        height: 32px;
                        border-radius: 50%;
                        background: #4C1D95;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-size: 16px;
                        flex-shrink: 0;
                    ">🤖</div>
                    <div style="
                        background: white;
                        padding: 12px 16px;
                        border-radius: 12px 12px 12px 4px;
                        max-width: 80%;
                        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                        line-height: 1.5;
                        font-size: 14px;
                        color: #1e293b;
                    ">
                        👋 Hi! I'm your NCHSM Assistant. I can help you with:<br>
                        📝 Exams & Grades<br>
                        ✅ Attendance<br>
                        📚 Courses & Registration<br>
                        💰 Fees & Payments<br>
                        📅 Schedule & Timetable<br>
                        <br>
                        <strong>Try asking:</strong><br>
                        "When is my next exam?"<br>
                        "How's my attendance?"<br>
                        "How do I register for units?"<br>
                        "What's my current GPA?"
                    </div>
                </div>
            </div>
            <div style="
                padding: 12px 16px;
                border-top: 1px solid #e5e7eb;
                display: flex;
                gap: 10px;
                background: white;
            ">
                <input type="text" id="chatbotInput" placeholder="Type your question..." style="
                    flex: 1;
                    padding: 10px 14px;
                    border: 1px solid #e5e7eb;
                    border-radius: 50px;
                    font-size: 14px;
                    outline: none;
                    transition: border-color 0.2s;
                    font-family: 'Inter', sans-serif;
                ">
                <button id="chatbotSend" style="
                    padding: 10px 18px;
                    background: #4C1D95;
                    color: white;
                    border: none;
                    border-radius: 50px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 14px;
                    transition: background 0.2s;
                    white-space: nowrap;
                ">Send</button>
            </div>
        `;
        
        document.body.appendChild(chatWindow);
        
        // Event listeners
        button.addEventListener('click', () => {
            this.toggleChat();
        });
        
        document.getElementById('chatbotClose').addEventListener('click', () => {
            this.closeChat();
        });
        
        document.getElementById('chatbotSend').addEventListener('click', () => {
            this.sendMessage();
        });
        
        document.getElementById('chatbotInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        
        document.getElementById('chatbotClear').addEventListener('click', () => {
            this.clearChat();
        });
    }
    
    addStyles() {
        const styles = document.createElement('style');
        styles.textContent = `
            @keyframes chatbotPulse {
                0% { transform: scale(1); opacity: 1; }
                100% { transform: scale(1.5); opacity: 0; }
            }
            @keyframes messageIn {
                from { opacity: 0; transform: translateY(10px) scale(0.95); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes typingDots {
                0%, 20% { content: '.'; }
                40% { content: '..'; }
                60% { content: '...'; }
            }
            #chatbotInput:focus {
                border-color: #4C1D95;
            }
            #chatbotSend:hover {
                background: #3b1a75;
            }
            .chatbot-message.user {
                justify-content: flex-end;
            }
            .chatbot-message.user > div:last-child {
                background: #4C1D95;
                color: white;
                border-radius: 12px 12px 4px 12px;
            }
        `;
        document.head.appendChild(styles);
        
        // Add FontAwesome if not present
        if (!document.querySelector('link[href*="font-awesome"]')) {
            const fa = document.createElement('link');
            fa.rel = 'stylesheet';
            fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
            document.head.appendChild(fa);
        }
    }
    
    toggleChat() {
        this.isOpen = !this.isOpen;
        const window = document.getElementById('chatbotWindow');
        const button = document.getElementById('chatbotToggle');
        
        if (this.isOpen) {
            window.style.display = 'flex';
            document.getElementById('chatbotInput').focus();
        } else {
            window.style.display = 'none';
        }
    }
    
    closeChat() {
        this.isOpen = false;
        document.getElementById('chatbotWindow').style.display = 'none';
    }
    
    async sendMessage() {
        const input = document.getElementById('chatbotInput');
        const message = input.value.trim();
        
        if (!message) return;
        
        // Add user message
        this.addMessage('user', message);
        input.value = '';
        input.disabled = true;
        
        // Show typing indicator
        this.showTyping();
        
        // Process message
        const response = await this.processMessage(message);
        
        // Remove typing indicator
        this.hideTyping();
        
        // Add bot response
        this.addMessage('bot', response);
        input.disabled = false;
        input.focus();
        
        // Scroll to bottom
        this.scrollToBottom();
    }
    
    addMessage(type, content) {
        const container = document.getElementById('chatbotMessages');
        
        // Remove empty state if present
        const empty = container.querySelector('.chatbot-empty');
        if (empty) empty.remove();
        
        const div = document.createElement('div');
        div.className = `chatbot-message ${type}`;
        div.style.cssText = `
            display: flex;
            gap: 10px;
            margin-bottom: 12px;
            animation: messageIn 0.3s ease;
            ${type === 'user' ? 'justify-content: flex-end;' : ''}
        `;
        
        if (type === 'bot') {
            div.innerHTML = `
                <div style="
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: #4C1D95;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 16px;
                    flex-shrink: 0;
                ">🤖</div>
                <div style="
                    background: white;
                    padding: 12px 16px;
                    border-radius: 12px 12px 12px 4px;
                    max-width: 80%;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                    line-height: 1.6;
                    font-size: 14px;
                    color: #1e293b;
                    word-wrap: break-word;
                    white-space: pre-wrap;
                ">${content}</div>
            `;
        } else {
            div.innerHTML = `
                <div style="
                    background: #4C1D95;
                    color: white;
                    padding: 12px 16px;
                    border-radius: 12px 12px 4px 12px;
                    max-width: 80%;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                    line-height: 1.6;
                    font-size: 14px;
                    word-wrap: break-word;
                    white-space: pre-wrap;
                ">${this.escapeHtml(content)}</div>
            `;
        }
        
        container.appendChild(div);
        this.scrollToBottom();
    }
    
    showTyping() {
        const container = document.getElementById('chatbotMessages');
        const typing = document.createElement('div');
        typing.id = 'chatbotTyping';
        typing.className = 'chatbot-message bot';
        typing.style.cssText = `
            display: flex;
            gap: 10px;
            margin-bottom: 12px;
            animation: messageIn 0.3s ease;
        `;
        typing.innerHTML = `
            <div style="
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: #4C1D95;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 16px;
                flex-shrink: 0;
            ">🤖</div>
            <div style="
                background: white;
                padding: 12px 20px;
                border-radius: 12px 12px 12px 4px;
                box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                display: flex;
                align-items: center;
                gap: 4px;
            ">
                <span style="
                    width: 8px;
                    height: 8px;
                    background: #94a3b8;
                    border-radius: 50%;
                    animation: typingBounce 1.4s infinite;
                "></span>
                <span style="
                    width: 8px;
                    height: 8px;
                    background: #94a3b8;
                    border-radius: 50%;
                    animation: typingBounce 1.4s infinite 0.2s;
                "></span>
                <span style="
                    width: 8px;
                    height: 8px;
                    background: #94a3b8;
                    border-radius: 50%;
                    animation: typingBounce 1.4s infinite 0.4s;
                "></span>
            </div>
        `;
        container.appendChild(typing);
        this.scrollToBottom();
        
        // Add keyframes if not exists
        if (!document.querySelector('#typingStyles')) {
            const style = document.createElement('style');
            style.id = 'typingStyles';
            style.textContent = `
                @keyframes typingBounce {
                    0%, 60%, 100% { transform: translateY(0); }
                    30% { transform: translateY(-8px); }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    hideTyping() {
        const typing = document.getElementById('chatbotTyping');
        if (typing) typing.remove();
    }
    
    clearChat() {
        const container = document.getElementById('chatbotMessages');
        container.innerHTML = `
            <div class="chatbot-message bot" style="
                display: flex;
                gap: 10px;
                margin-bottom: 12px;
                animation: messageIn 0.3s ease;
            ">
                <div style="
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: #4C1D95;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 16px;
                    flex-shrink: 0;
                ">🤖</div>
                <div style="
                    background: white;
                    padding: 12px 16px;
                    border-radius: 12px 12px 12px 4px;
                    max-width: 80%;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                    line-height: 1.5;
                    font-size: 14px;
                    color: #1e293b;
                ">
                    🧹 Chat cleared! How can I help you?
                </div>
            </div>
        `;
    }
    
    scrollToBottom() {
        const container = document.getElementById('chatbotMessages');
        container.scrollTop = container.scrollHeight;
    }
    
    async processMessage(message) {
        const lowerMsg = message.toLowerCase().trim();
        
        // Detect intent
        let intent = 'default';
        for (const [key, keywords] of Object.entries(this.intents)) {
            if (keywords.some(k => lowerMsg.includes(k))) {
                intent = key;
                break;
            }
        }
        
        // Get response
        const handler = this.responses[intent] || this.responses['default'];
        return await handler(message);
    }
    
    // ============================================
    // RESPONSE HANDLERS
    // ============================================
    
    async greetingResponse(message) {
        const name = this.userProfile?.full_name || 'Student';
        const greetings = [
            `Hello ${name}! 👋 How can I assist you with your NCHSM journey today?`,
            `Hi ${name}! 🌟 I'm here to help you with anything you need.`,
            `Hey there ${name}! 💫 What can I do for you today?`,
            `Welcome back, ${name}! 🎯 How can I help you succeed?`
        ];
        return greetings[Math.floor(Math.random() * greetings.length)];
    }
    
    async examResponse(message) {
        try {
            const upcomingExams = await this.getUpcomingExams();
            if (upcomingExams && upcomingExams.length > 0) {
                const exam = upcomingExams[0];
                const date = new Date(exam.exam_date).toLocaleDateString('en-KE', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    timeZone: 'Africa/Nairobi'
                });
                return `📝 Your next exam:\n\n📚 ${exam.exam_name || exam.title}\n📅 ${date}\n⏰ ${exam.exam_start_time?.substring(0,5) || 'TBA'}\n📊 ${exam.total_marks || 30} marks\n🎯 Pass mark: ${exam.pass_mark || 60}%\n\n💡 Tip: Start preparing early! Review past papers in the Resources section.`;
            }
            return "📝 You don't have any upcoming exams scheduled. Check your exam card in the Learning Hub!";
        } catch {
            return "📝 I couldn't fetch your exam schedule. Please check the Exams section for details.";
        }
    }
    
    async attendanceResponse(message) {
        try {
            const attendance = await this.getAttendance();
            const rate = attendance?.rate || 0;
            const verified = attendance?.verified || 0;
            const total = attendance?.total || 0;
            
            let status = '';
            if (rate >= 75) status = '✅ Good standing!';
            else if (rate >= 50) status = '⚠️ You need to improve.';
            else status = '🚨 Critical! Please attend more classes.';
            
            return `📊 Your Attendance:\n\n✅ Verified: ${verified}\n⏳ Pending: ${total - verified}\n📈 Rate: ${rate}%\n${status}\n\n💡 Each verified attendance gives you +10 XP points!`;
        } catch {
            return "📊 I couldn't fetch your attendance. Please check the Attendance section.";
        }
    }
    
    async gradesResponse(message) {
        try {
            const grades = await this.getRecentGrades();
            if (grades && grades.length > 0) {
                const top = grades.slice(0, 3);
                let response = "📊 Your Recent Grades:\n\n";
                top.forEach(g => {
                    response += `📚 ${g.unit_name || g.course}: ${g.total_score || g.score}% (${g.grade || 'N/A'})\n`;
                });
                response += `\n📈 Check the Exams & Grades section for full details.`;
                return response;
            }
            return "📊 You don't have any grades yet. Grades appear after assessment completion.";
        } catch {
            return "📊 I couldn't fetch your grades. Please check the Exams & Grades section.";
        }
    }
    
    async feeResponse(message) {
        return `💰 Fee Information:\n\nTo check your fee balance and payment status, please visit the Profile section.\n\n📌 Need help with fees? Contact the Finance Office at:\n📧 fees@nchsm.ac.ke\n📞 0790969743\n\n💡 Remember: Fees must be cleared to access exam cards.`;
    }
    
    async coursesResponse(message) {
        return `📚 Course Registration:\n\nTo register for units:\n1. Go to Learning Hub → Register Units\n2. Select your block/trimester\n3. Choose your units\n4. Submit for approval\n\n📌 Your current block: ${this.userProfile?.block || 'Introductory'}\n\n💡 Tip: Register early to secure your preferred units!`;
    }
    
    async scheduleResponse(message) {
        return `📅 Academic Calendar:\n\nTo view your schedule:\n1. Go to Academic Calendar section\n2. See all your classes, clinical rotations, and exams\n3. Filter by type (Class, Clinical, Exam)\n\n📌 Your next class appears on the dashboard!\n\n💡 Tip: Check the calendar daily to stay on track.`;
    }
    
    async resourcesResponse(message) {
        return `📚 Learning Resources:\n\nYou can access:\n📄 Past papers\n📖 Lecture notes\n🎥 Video lessons\n📝 Study materials\n\n💡 Tip: Resources are organized by block/course for easy access.\n\n🔍 Use the search bar in Resources section to find specific materials.`;
    }
    
    async profileResponse(message) {
        return `👤 Profile & Account:\n\nYou can:\n✏️ Edit personal information\n📸 Upload profile photo\n📄 Upload documents (KCSE, ID)\n🔑 Change password\n\n💡 Tip: Keep your profile updated for exam registration.\n\n📌 Need help? Contact admin at portal.nchsm@gmail.com`;
    }
    
    async helpResponse(message) {
        return `🆘 How can I help?\n\nHere's what I can assist with:\n\n📝 **Exams & Grades** - "When is my exam?" "What's my GPA?"\n✅ **Attendance** - "Check my attendance"\n📚 **Courses** - "How to register units?"\n💰 **Fees** - "Check fee balance"\n📅 **Schedule** - "Show my timetable"\n📄 **Resources** - "Find past papers"\n👤 **Profile** - "Update my profile"\n\n💡 Just type your question naturally and I'll help!`;
    }
    
    async defaultResponse(message) {
        const fallbacks = [
            "I'm not sure about that. Let me guide you to the right section.",
            "That's a great question! I'd recommend checking the relevant section for detailed info.",
            "I'm still learning! Let me direct you to where you can find the answer.",
            "Good question! Please check the specific section or ask our support team."
        ];
        
        return `${fallbacks[Math.floor(Math.random() * fallbacks.length)]}\n\n💡 Try typing "help" to see what I can do!`;
    }
    
    // ============================================
    // DATA FETCHING METHODS
    // ============================================
    
    async getUpcomingExams() {
        if (!this.sb || !this.userId) return [];
        try {
            const { data } = await this.sb
                .from('exams')
                .select('*')
                .eq('program_type', this.userProfile?.program)
                .eq('block', this.userProfile?.block)
                .eq('intake_year', this.userProfile?.intake_year)
                .order('exam_date', { ascending: true })
                .limit(3);
            return data;
        } catch {
            return [];
        }
    }
    
    async getAttendance() {
        if (!this.sb || !this.userId) return null;
        try {
            const { data } = await this.sb
                .from('geo_attendance_logs')
                .select('is_verified')
                .eq('student_id', this.userId);
            
            if (!data) return null;
            const total = data.length;
            const verified = data.filter(l => l.is_verified === true).length;
            return { rate: total > 0 ? Math.round((verified/total)*100) : 0, verified, total };
        } catch {
            return null;
        }
    }
    
    async getRecentGrades() {
        if (!this.sb || !this.userId) return [];
        try {
            const { data } = await this.sb
                .from('exam_grades')
                .select('*')
                .eq('student_id', this.userId)
                .order('created_at', { ascending: false })
                .limit(5);
            return data;
        } catch {
            return [];
        }
    }
    
    escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, m => {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }
}

// Initialize
window.ChatbotAssistant = ChatbotAssistant;

document.addEventListener('appReady', (e) => {
    if (!window.chatbot) {
        const bot = new ChatbotAssistant();
        bot.userId = e.detail?.userId;
        bot.userProfile = e.detail?.userProfile;
        bot.sb = window.db?.supabase;
        window.chatbot = bot;
    }
});

console.log('✅ Chatbot Assistant loaded');
