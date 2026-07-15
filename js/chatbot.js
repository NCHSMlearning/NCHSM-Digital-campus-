// ============================================
// NCHSM AI CHATBOT ASSISTANT - COMPLETE
// WITH SUPABASE STORAGE + RESPONSE FETCHING
// ============================================

class ChatbotAssistant {
    constructor() {
        this.isOpen = false;
        this.messages = [];
        this.userId = null;
        this.userProfile = null;
        this.sb = null;
        this.sessionId = null;
        this.conversationHistory = [];
        
        // Default intents (can be overridden from Supabase)
        this.intents = {
            'greeting': ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'howdy', 'sup'],
            'exam': ['exam', 'assessment', 'cat', 'test', 'quiz', 'midterm', 'final'],
            'attendance': ['attendance', 'absent', 'present', 'check in', 'check-in', 'verify'],
            'grades': ['grade', 'score', 'result', 'marks', 'performance', 'gpa', 'transcript'],
            'fee': ['fee', 'payment', 'balance', 'tuition', 'invoice', 'pay', 'money', 'cost'],
            'courses': ['course', 'unit', 'subject', 'register', 'enroll', 'registration', 'classes'],
            'schedule': ['schedule', 'timetable', 'class', 'lecture', 'time', 'when', 'calendar'],
            'resources': ['resource', 'material', 'past paper', 'notes', 'study', 'pdf', 'book'],
            'profile': ['profile', 'account', 'password', 'change', 'update', 'edit', 'photo'],
            'help': ['help', 'support', 'assist', 'guide', 'how to', 'what can you do', 'commands'],
            'thanks': ['thanks', 'thank you', 'thx', 'appreciate', 'good job', 'nice']
        };
        
        // Default responses (will be overridden from Supabase)
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
            'thanks': this.thanksResponse.bind(this),
            'default': this.defaultResponse.bind(this)
        };
        
        // Custom responses from Supabase
        this.customResponses = {};
        
        this.init();
    }
    
    // ============================================
    // INIT
    // ============================================
    
    init() {
        console.log('🤖 Initializing Chatbot Assistant...');
        this.setupDataFetching();
        this.createChatWidget();
        this.addStyles();
        this.loadCustomResponses();
        console.log('✅ Chatbot Assistant ready');
    }
    
    // ============================================
    // LOAD CUSTOM RESPONSES FROM SUPABASE
    // ============================================
    
    async loadCustomResponses() {
        try {
            if (!this.sb) {
                console.log('⏳ Waiting for Supabase to load custom responses...');
                setTimeout(() => this.loadCustomResponses(), 1000);
                return;
            }
            
            const { data, error } = await this.sb
                .from('chatbot_responses')
                .select('*')
                .eq('is_active', true);
            
            if (error) throw error;
            
            if (data && data.length > 0) {
                this.customResponses = {};
                data.forEach(item => {
                    if (!this.customResponses[item.intent]) {
                        this.customResponses[item.intent] = [];
                    }
                    this.customResponses[item.intent].push(item.response_text);
                });
                console.log(`📚 Loaded ${data.length} custom responses from Supabase`);
            } else {
                console.log('📚 No custom responses found, using defaults');
            }
        } catch (error) {
            console.error('❌ Error loading custom responses:', error);
        }
    }
    
    // ============================================
    // GET RESPONSE (with Supabase fallback)
    // ============================================
    
    getCustomResponse(intent) {
        const responses = this.customResponses[intent];
        if (responses && responses.length > 0) {
            return responses[Math.floor(Math.random() * responses.length)];
        }
        return null;
    }
    
    // ============================================
    // SETUP DATA FETCHING
    // ============================================
    
    setupDataFetching() {
        // Get user data from global scope
        if (window.currentUserId) {
            this.userId = window.currentUserId;
            this.userProfile = window.currentUserProfile;
            this.sb = window.db?.supabase || window.supabase;
            console.log('🤖 Chatbot connected to user:', this.userId);
        }
        
        // Listen for appReady event
        document.addEventListener('appReady', (e) => {
            this.userId = e.detail?.userId || window.currentUserId;
            this.userProfile = e.detail?.userProfile || window.currentUserProfile;
            this.sb = window.db?.supabase || window.supabase;
            if (this.userId) {
                console.log('🤖 Chatbot connected via appReady:', this.userId);
                this.loadCustomResponses();
            }
        });
        
        // Also check periodically
        let checkCount = 0;
        const checkInterval = setInterval(() => {
            checkCount++;
            if (window.currentUserId && !this.userId) {
                this.userId = window.currentUserId;
                this.userProfile = window.currentUserProfile;
                this.sb = window.db?.supabase || window.supabase;
                console.log('🤖 Chatbot found user data:', this.userId);
                this.loadCustomResponses();
                clearInterval(checkInterval);
            }
            if (checkCount > 10) {
                clearInterval(checkInterval);
                console.log('🤖 Chatbot: No user data found after 10 attempts');
            }
        }, 500);
    }
    
    // ============================================
    // CREATE CHAT WIDGET
    // ============================================
    
    createChatWidget() {
        // Check if already exists
        if (document.getElementById('chatbotToggle')) return;
        
        // ===== CHAT BUTTON =====
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
            background: linear-gradient(135deg, #4C1D95, #7c3aed);
            color: white;
            border: none;
            font-size: 28px;
            cursor: pointer;
            box-shadow: 0 4px 20px rgba(76, 29, 149, 0.5);
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
        
        // Hover effect
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.05)';
            button.style.boxShadow = '0 6px 30px rgba(76, 29, 149, 0.6)';
        });
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
            button.style.boxShadow = '0 4px 20px rgba(76, 29, 149, 0.5)';
        });
        
        document.body.appendChild(button);
        
        // ===== CHAT WINDOW =====
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
            animation: slideInRight 0.3s ease;
        `;
        
        chatWindow.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #4C1D95, #6d28d9);
                color: white;
                padding: 16px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-radius: 16px 16px 0 0;
                flex-shrink: 0;
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
                        <div style="font-size: 12px; opacity: 0.8;">
                            <span id="chatbotStatus">Online · Ready to help</span>
                        </div>
                    </div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button id="chatbotClear" style="
                        background: none;
                        border: none;
                        color: white;
                        cursor: pointer;
                        padding: 4px 8px;
                        opacity: 0.7;
                        font-size: 16px;
                        border-radius: 6px;
                        transition: background 0.2s;
                    " title="Clear chat">🗑️</button>
                    <button id="chatbotClose" style="
                        background: none;
                        border: none;
                        color: white;
                        cursor: pointer;
                        font-size: 20px;
                        padding: 0 4px;
                        line-height: 1;
                        opacity: 0.7;
                        transition: opacity 0.2s;
                    " title="Close chat">×</button>
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
                        line-height: 1.6;
                        font-size: 14px;
                        color: #1e293b;
                    ">
                        👋 Hi! I'm your NCHSM Assistant.<br><br>
                        I can help you with:<br>
                        📝 Exams & Grades<br>
                        ✅ Attendance<br>
                        📚 Courses & Registration<br>
                        💰 Fees & Payments<br>
                        📅 Schedule & Timetable<br><br>
                        <strong>Try asking:</strong><br>
                        "When is my next exam?"<br>
                        "How's my attendance?"<br>
                        "How do I register for units?"<br>
                        "What's my GPA?"
                    </div>
                </div>
            </div>
            <div style="
                padding: 12px 16px;
                border-top: 1px solid #e5e7eb;
                display: flex;
                gap: 10px;
                background: white;
                flex-shrink: 0;
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
                    background: #f8fafc;
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
                    transition: all 0.2s;
                    white-space: nowrap;
                ">
                    Send
                </button>
            </div>
        `;
        
        document.body.appendChild(chatWindow);
        
        // ===== EVENT LISTENERS =====
        button.addEventListener('click', () => this.toggleChat());
        
        document.getElementById('chatbotClose').addEventListener('click', () => this.closeChat());
        document.getElementById('chatbotClose').addEventListener('mouseenter', (e) => {
            e.target.style.opacity = '1';
        });
        document.getElementById('chatbotClose').addEventListener('mouseleave', (e) => {
            e.target.style.opacity = '0.7';
        });
        
        document.getElementById('chatbotSend').addEventListener('click', () => this.sendMessage());
        document.getElementById('chatbotSend').addEventListener('mouseenter', (e) => {
            e.target.style.background = '#3b1a75';
        });
        document.getElementById('chatbotSend').addEventListener('mouseleave', (e) => {
            e.target.style.background = '#4C1D95';
        });
        
        document.getElementById('chatbotInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        
        document.getElementById('chatbotInput').addEventListener('focus', (e) => {
            e.target.style.borderColor = '#4C1D95';
            e.target.style.background = 'white';
        });
        document.getElementById('chatbotInput').addEventListener('blur', (e) => {
            e.target.style.borderColor = '#e5e7eb';
            e.target.style.background = '#f8fafc';
        });
        
        document.getElementById('chatbotClear').addEventListener('click', () => this.clearChat());
        document.getElementById('chatbotClear').addEventListener('mouseenter', (e) => {
            e.target.style.opacity = '1';
        });
        document.getElementById('chatbotClear').addEventListener('mouseleave', (e) => {
            e.target.style.opacity = '0.7';
        });
        
        // Click outside to close
        document.addEventListener('click', (e) => {
            if (this.isOpen && 
                !chatWindow.contains(e.target) && 
                !button.contains(e.target)) {
                this.closeChat();
            }
        });
    }
    
    // ============================================
    // STYLES
    // ============================================
    
    addStyles() {
        if (document.getElementById('chatbotStyles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'chatbotStyles';
        styles.textContent = `
            @keyframes chatbotPulse {
                0% { transform: scale(1); opacity: 1; }
                100% { transform: scale(1.5); opacity: 0; }
            }
            
            @keyframes messageIn {
                from { opacity: 0; transform: translateY(10px) scale(0.95); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            
            @keyframes typingBounce {
                0%, 60%, 100% { transform: translateY(0); }
                30% { transform: translateY(-8px); }
            }
            
            @keyframes slideInRight {
                from { opacity: 0; transform: translateX(50px) scale(0.95); }
                to { opacity: 1; transform: translateX(0) scale(1); }
            }
            
            .chatbot-message.user {
                justify-content: flex-end;
            }
            
            .chatbot-message.user > div:last-child {
                background: #4C1D95;
                color: white;
                border-radius: 12px 12px 4px 12px;
            }
            
            #chatbotMessages::-webkit-scrollbar {
                width: 4px;
            }
            
            #chatbotMessages::-webkit-scrollbar-track {
                background: #f1f1f1;
                border-radius: 10px;
            }
            
            #chatbotMessages::-webkit-scrollbar-thumb {
                background: #c4b5fd;
                border-radius: 10px;
            }
            
            #chatbotMessages::-webkit-scrollbar-thumb:hover {
                background: #7c3aed;
            }
            
            @media (max-width: 768px) {
                #chatbotWindow {
                    width: 100%;
                    right: 0;
                    bottom: 80px;
                    border-radius: 12px 12px 0 0;
                    height: 70vh;
                    max-height: 70vh;
                }
                
                #chatbotToggle {
                    width: 50px;
                    height: 50px;
                    font-size: 24px;
                    bottom: 16px;
                    right: 16px;
                }
            }
        `;
        document.head.appendChild(styles);
    }
    
    // ============================================
    // CHAT CONTROLS
    // ============================================
    
    toggleChat() {
        this.isOpen = !this.isOpen;
        const window = document.getElementById('chatbotWindow');
        const button = document.getElementById('chatbotToggle');
        
        if (this.isOpen) {
            window.style.display = 'flex';
            document.getElementById('chatbotInput').focus();
            button.style.transform = 'scale(0.9)';
            setTimeout(() => { button.style.transform = 'scale(1)'; }, 300);
        } else {
            window.style.display = 'none';
        }
    }
    
    closeChat() {
        this.isOpen = false;
        document.getElementById('chatbotWindow').style.display = 'none';
    }
    
    // ============================================
    // SEND MESSAGE WITH SUPABASE STORAGE
    // ============================================
    
  async sendMessage() {
    const input = document.getElementById('chatbotInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    this.addMessage('user', message);
    input.value = '';
    input.disabled = true;
    this.showTyping();
    
    const startTime = Date.now();
    const intent = this.detectIntent(message);
    const handler = this.responses[intent] || this.responses['default'];
    const response = await handler(message);
    const responseTime = Date.now() - startTime;
    this.hideTyping();
    
    // ✅ SAVE AND GET THE REAL CONVERSATION
    const saved = await this.saveConversation(
        message,
        response,
        intent,
        this.getKeywords(message),
        responseTime
    );
    
    // ✅ Use the message_id from the saved conversation
    const messageId = saved?.message_id || `temp_${Date.now()}`;
    this.addMessageWithFeedback('bot', response, messageId);
    
    input.disabled = false;
    input.focus();
    this.scrollToBottom();
}
    // ============================================
    // ADD MESSAGE
    // ============================================
    
    addMessage(type, content) {
        const container = document.getElementById('chatbotMessages');
        if (!container) return;
        
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
    
    // ============================================
    // ADD MESSAGE WITH FEEDBACK BUTTONS
    // ============================================
    
    addMessageWithFeedback(type, content) {
        const container = document.getElementById('chatbotMessages');
        if (!container) return;
        
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
            // Generate a unique ID for this message
            const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
            
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
                ">
                    ${content}
                    <div style="margin-top: 10px; display: flex; gap: 8px; border-top: 1px solid #e5e7eb; padding-top: 8px; align-items: center;">
                        <span style="font-size: 11px; color: #94a3b8;">Was this helpful?</span>
                        <button onclick="window.chatbot?.saveFeedback('${messageId}', true)" style="
                            background: none; border: none; cursor: pointer; font-size: 16px; padding: 0 4px; color: #10b981;
                            transition: transform 0.2s;
                        " onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">👍</button>
                        <button onclick="window.chatbot?.saveFeedback('${messageId}', false)" style="
                            background: none; border: none; cursor: pointer; font-size: 16px; padding: 0 4px; color: #ef4444;
                            transition: transform 0.2s;
                        " onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">👎</button>
                    </div>
                </div>
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
    
    // ============================================
    // TYPING INDICATOR
    // ============================================
    
    showTyping() {
        const container = document.getElementById('chatbotMessages');
        if (!container) return;
        
        // Remove existing typing indicator
        this.hideTyping();
        
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
    }
    
    hideTyping() {
        const typing = document.getElementById('chatbotTyping');
        if (typing) typing.remove();
    }
    
    clearChat() {
        const container = document.getElementById('chatbotMessages');
        if (!container) return;
        
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
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }
    
    // ============================================
    // PROCESS MESSAGE
    // ============================================
    
    async processMessage(message) {
        const lowerMsg = message.toLowerCase().trim();
        
        // Detect intent
        let intent = 'default';
        let highestMatch = 0;
        
        for (const [key, keywords] of Object.entries(this.intents)) {
            for (const keyword of keywords) {
                if (lowerMsg.includes(keyword)) {
                    const matchScore = keyword.length / lowerMsg.length;
                    if (matchScore > highestMatch) {
                        highestMatch = matchScore;
                        intent = key;
                    }
                }
            }
        }
        
        // Check for custom response first
        const customResponse = this.getCustomResponse(intent);
        if (customResponse) {
            return customResponse;
        }
        
        // Get default response
        const handler = this.responses[intent] || this.responses['default'];
        return await handler(message);
    }
    
    // ============================================
    // 💾 SUPABASE STORAGE METHODS
    // ============================================
    
    generateSessionId() {
        if (!this.sessionId) {
            this.sessionId = `${this.userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        return this.sessionId;
    }
    
   async saveConversation(message, response, intent, keywords, responseTime) {
    try {
        if (!this.sb || !this.userId) {
            console.log('💬 Conversation not saved (no Supabase/user)');
            return null;
        }

        const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

        const { data, error } = await this.sb
            .from('chatbot_conversations')
            .insert({
                user_id: this.userId,
                session_id: this.sessionId || this.generateSessionId(),
                message_id: messageId,
                message: message,
                response: response,
                intent: intent || 'unknown',
                detected_keywords: keywords || [],
                response_time_ms: responseTime || 0,
                created_at: new Date().toISOString()
            })
            .select();

        if (error) {
            console.error('❌ Failed to save conversation:', error);
            return null;
        }

        console.log('💬 Conversation saved to Supabase');
        return data?.[0] || null;
    } catch (error) {
        console.error('❌ Save conversation error:', error);
        return null;
    }
}
   async saveFeedback(messageId, wasHelpful) {
    try {
        if (!this.sb) {
            console.log('⚠️ No Supabase connection');
            return;
        }
        
        // ✅ Use message_id column
        const { error } = await this.sb
            .from('chatbot_conversations')
            .update({ was_helpful: wasHelpful })
            .eq('message_id', messageId);

        if (error) {
            console.error('❌ Feedback save error:', error);
        } else {
            console.log('✅ Feedback saved successfully!');
        }
    } catch (error) {
        console.error('❌ Feedback error:', error);
    }
}
    async getUserConversations(limit = 20) {
        try {
            if (!this.sb || !this.userId) return [];
            const { data, error } = await this.sb
                .from('chatbot_conversations')
                .select('*')
                .eq('user_id', this.userId)
                .order('created_at', { ascending: false })
                .limit(limit);
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('❌ Fetch conversations error:', error);
            return [];
        }
    }
    
    async getChatbotAnalytics() {
        try {
            if (!this.sb) return null;

            // Total conversations
            const { count: total } = await this.sb
                .from('chatbot_conversations')
                .select('*', { count: 'exact', head: true });

            // Today's conversations
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const { count: todayCount } = await this.sb
                .from('chatbot_conversations')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', today.toISOString());

            // Intent breakdown
            const { data: intents } = await this.sb
                .from('chatbot_conversations')
                .select('intent');

            // Count intents
            const intentCounts = {};
            if (intents) {
                intents.forEach(i => {
                    const intent = i.intent || 'unknown';
                    intentCounts[intent] = (intentCounts[intent] || 0) + 1;
                });
            }

            // Helpful rate
            const { data: helpful } = await this.sb
                .from('chatbot_conversations')
                .select('was_helpful')
                .not('was_helpful', 'is', null);

            const helpfulCount = helpful?.filter(h => h.was_helpful === true).length || 0;
            const totalFeedback = helpful?.length || 0;
            const helpfulRate = totalFeedback > 0 ? Math.round((helpfulCount / totalFeedback) * 100) : 0;

            return {
                total: total || 0,
                today: todayCount || 0,
                intentBreakdown: intentCounts,
                helpfulRate: helpfulRate,
                totalFeedback: totalFeedback
            };
        } catch (error) {
            console.error('❌ Analytics error:', error);
            return null;
        }
    }
    
    detectIntent(message) {
        const lowerMsg = message.toLowerCase().trim();
        let intent = 'default';
        let highestMatch = 0;

        for (const [key, keywords] of Object.entries(this.intents)) {
            for (const keyword of keywords) {
                if (lowerMsg.includes(keyword)) {
                    const matchScore = keyword.length / lowerMsg.length;
                    if (matchScore > highestMatch) {
                        highestMatch = matchScore;
                        intent = key;
                    }
                }
            }
        }
        return intent;
    }
    
    getKeywords(message) {
        const lowerMsg = message.toLowerCase().trim();
        const keywords = [];
        for (const [key, words] of Object.entries(this.intents)) {
            for (const word of words) {
                if (lowerMsg.includes(word)) {
                    keywords.push(word);
                }
            }
        }
        return keywords.slice(0, 10);
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
    
    async thanksResponse(message) {
        const responses = [
            "You're welcome! 😊 Happy to help!",
            "Anytime! 🎉 Let me know if you need anything else.",
            "My pleasure! 💪 Keep up the great work!",
            "Glad I could help! 🌟 All the best with your studies!"
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }
    
    async examResponse(message) {
        try {
            if (!this.sb || !this.userId) {
                return "📝 Please log in to check your exams. If you're already logged in, please refresh the page.";
            }
            
            const { data, error } = await this.sb
                .from('exams')
                .select('*')
                .eq('program_type', this.userProfile?.program || 'KRCHN')
                .eq('block', this.userProfile?.block || 'Introductory')
                .eq('intake_year', this.userProfile?.intake_year || '2026')
                .order('exam_date', { ascending: true })
                .limit(3);
            
            if (error) throw error;
            
            if (data && data.length > 0) {
                const exam = data[0];
                const date = new Date(exam.exam_date);
                const formattedDate = date.toLocaleDateString('en-KE', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    timeZone: 'Africa/Nairobi'
                });
                const examTime = exam.exam_start_time?.substring(0,5) || 'TBA';
                const examName = exam.exam_name || exam.title || 'Exam';
                const totalMarks = exam.total_marks || exam.marks_out_of || 30;
                const passMark = exam.pass_mark || Math.round(totalMarks * 0.6);
                
                let response = `📝 **Your Next Exam**\n\n`;
                response += `📚 **${examName}**\n`;
                response += `📅 **${formattedDate}**\n`;
                response += `⏰ **${examTime}**\n`;
                response += `📊 **${totalMarks} marks** (Pass: ${passMark})\n`;
                response += `⏳ **${exam.duration_minutes || 30} minutes**\n\n`;
                response += `💡 **Tip:** Start preparing early! Review past papers in the Resources section.`;
                return response;
            }
            
            return "📝 No upcoming exams scheduled. Check your exam card in the Learning Hub!";
        } catch (error) {
            console.error('Exam error:', error);
            return "📝 I couldn't fetch your exam schedule. Please check the Exams & Grades section manually.";
        }
    }
    
    async attendanceResponse(message) {
        try {
            if (!this.sb || !this.userId) {
                return "📊 Please log in to check your attendance.";
            }
            
            const { data, error } = await this.sb
                .from('geo_attendance_logs')
                .select('is_verified')
                .eq('student_id', this.userId);
            
            if (error) throw error;
            
            if (!data || data.length === 0) {
                return "📊 No attendance records found. Start checking in to track your attendance!";
            }
            
            const total = data.length;
            const verified = data.filter(l => l.is_verified === true).length;
            const pending = total - verified;
            const rate = total > 0 ? Math.round((verified / total) * 100) : 0;
            
            let status = '';
            let emoji = '';
            if (rate >= 75) {
                status = 'Good standing! ✅';
                emoji = '🎉';
            } else if (rate >= 50) {
                status = 'You need to improve ⚠️';
                emoji = '📈';
            } else {
                status = 'Critical! Please attend more classes 🚨';
                emoji = '🔴';
            }
            
            let response = `📊 **Your Attendance**\n\n`;
            response += `✅ Verified: **${verified}**\n`;
            response += `⏳ Pending: **${pending}**\n`;
            response += `📈 Rate: **${rate}%**\n\n`;
            response += `${emoji} **${status}**\n\n`;
            response += `💡 Each verified attendance gives you **+10 XP points**!`;
            return response;
        } catch (error) {
            console.error('Attendance error:', error);
            return "📊 I couldn't fetch your attendance. Please check the Attendance section manually.";
        }
    }
    
    async gradesResponse(message) {
        try {
            if (!this.sb || !this.userId) {
                return "📊 Please log in to check your grades.";
            }
            
            const { data, error } = await this.sb
                .from('exam_grades')
                .select('*')
                .eq('student_id', this.userId)
                .order('created_at', { ascending: false })
                .limit(5);
            
            if (error) throw error;
            
            if (data && data.length > 0) {
                let response = "📊 **Your Recent Grades**\n\n";
                
                data.slice(0, 3).forEach((g, i) => {
                    const name = g.unit_name || g.course || 'Assessment';
                    const score = g.total_score || g.score || 0;
                    const grade = g.grade || this.getGradeLetter(score);
                    response += `${i + 1}. 📚 **${name}**\n`;
                    response += `   Score: **${score}%** (Grade: **${grade}**)\n\n`;
                });
                
                response += `📈 Check the **Exams & Grades** section for full details.`;
                return response;
            }
            
            return "📊 No grades available yet. Grades appear after assessments are completed and released.";
        } catch (error) {
            console.error('Grades error:', error);
            return "📊 I couldn't fetch your grades. Please check the Exams & Grades section manually.";
        }
    }
    
    getGradeLetter(percentage) {
        if (percentage >= 85) return 'A';
        if (percentage >= 75) return 'B+';
        if (percentage >= 70) return 'B';
        if (percentage >= 65) return 'C+';
        if (percentage >= 60) return 'C';
        if (percentage >= 50) return 'D';
        return 'F';
    }
    
    async feeResponse(message) {
        return `💰 **Fee Information**\n\n` +
               `To check your fee balance and payment status:\n` +
               `1. Go to **Profile** section\n` +
               `2. Check the fee status section\n` +
               `3. View your payment history\n\n` +
               `📌 **Need help with fees?**\n` +
               `📧 Email: fees@nchsm.ac.ke\n` +
               `📞 Phone: 0790969743\n\n` +
               `💡 **Remember:** Fees must be cleared to access exam cards.`;
    }
    
    async coursesResponse(message) {
        const block = this.userProfile?.block || 'Introductory';
        return `📚 **Course Registration**\n\n` +
               `**How to register for units:**\n` +
               `1. Go to **Learning Hub** → **Register Units**\n` +
               `2. Select your block/trimester\n` +
               `3. Choose your units\n` +
               `4. Submit for approval\n\n` +
               `📌 **Your current block:** ${block}\n\n` +
               `💡 **Tip:** Register early to secure your preferred units!`;
    }
    
    async scheduleResponse(message) {
        return `📅 **Academic Calendar**\n\n` +
               `**View your schedule:**\n` +
               `1. Go to **Academic Calendar** section\n` +
               `2. See all your classes, clinical rotations, and exams\n` +
               `3. Filter by type (Class, Clinical, Exam)\n\n` +
               `📌 **Your next class** appears on the dashboard!\n\n` +
               `💡 **Tip:** Check the calendar daily to stay on track.`;
    }
    
    async resourcesResponse(message) {
        return `📚 **Learning Resources**\n\n` +
               `**You can access:**\n` +
               `📄 Past papers\n` +
               `📖 Lecture notes\n` +
               `🎥 Video lessons\n` +
               `📝 Study materials\n\n` +
               `💡 **Tip:** Resources are organized by block/course.\n` +
               `🔍 Use the **search bar** in Resources section to find specific materials.`;
    }
    
    async profileResponse(message) {
        return `👤 **Profile & Account**\n\n` +
               `**You can:**\n` +
               `✏️ Edit personal information\n` +
               `📸 Upload profile photo\n` +
               `📄 Upload documents (KCSE, ID)\n` +
               `🔑 Change password\n\n` +
               `💡 **Tip:** Keep your profile updated for exam registration.\n\n` +
               `📌 Need help? Contact admin at **portal.nchsm@gmail.com**`;
    }
    
    async helpResponse(message) {
        return `🆘 **How can I help?**\n\n` +
               `Here's what I can assist with:\n\n` +
               `📝 **Exams & Grades**\n` +
               `   "When is my next exam?" "What's my GPA?"\n\n` +
               `✅ **Attendance**\n` +
               `   "Check my attendance" "How's my attendance?"\n\n` +
               `📚 **Courses**\n` +
               `   "How to register units?" "My courses"\n\n` +
               `💰 **Fees**\n` +
               `   "Check fee balance" "Payment status"\n\n` +
               `📅 **Schedule**\n` +
               `   "Show my timetable" "Next class"\n\n` +
               `📄 **Resources**\n` +
               `   "Find past papers" "Study materials"\n\n` +
               `👤 **Profile**\n` +
               `   "Update my profile" "Change password"\n\n` +
               `💡 Just type your question naturally and I'll help!`;
    }
    
    async defaultResponse(message) {
        const fallbacks = [
            "I'm not sure about that. 🤔 Let me guide you to the right section.",
            "That's a great question! I'd recommend checking the relevant section for detailed info.",
            "I'm still learning! 📚 Let me direct you to where you can find the answer.",
            "Good question! Please check the specific section or ask our support team."
        ];
        
        const quickActions = [
            "💡 Try typing **\"help\"** to see what I can do!",
            "💡 You can ask about **exams, attendance, courses, fees, schedule, resources, or profile**.",
            "💡 Not sure? Type **\"help\"** for a list of things I can assist with."
        ];
        
        return `${fallbacks[Math.floor(Math.random() * fallbacks.length)]}\n\n${quickActions[Math.floor(Math.random() * quickActions.length)]}`;
    }
    
    escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}

// ============================================
// 🚀 INITIALIZE CHATBOT
// ============================================

function initChatbot() {
    if (window.chatbot) {
        console.log('🤖 Chatbot already initialized');
        return;
    }
    
    try {
        window.chatbot = new ChatbotAssistant();
        console.log('✅ Chatbot initialized successfully!');
        console.log('💬 Click the 💬 button to chat!');
        console.log('📊 Conversations will be saved to Supabase');
    } catch (error) {
        console.error('❌ Chatbot initialization error:', error);
    }
}

// Initialize immediately if DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initChatbot, 300);
    });
} else {
    setTimeout(initChatbot, 300);
}

// Also initialize on appReady
document.addEventListener('appReady', () => {
    setTimeout(initChatbot, 200);
});

// Also initialize when db is ready
if (window.db) {
    setTimeout(initChatbot, 500);
}

console.log('✅ Chatbot Assistant loaded - Click 💬 to chat!');
