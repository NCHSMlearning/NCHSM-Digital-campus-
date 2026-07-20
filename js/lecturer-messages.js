// js/lecturer-messages.js
/**
 * NCHSM Lecturer Messages Module
 * Handles sending messages to students and groups
 */

const LecturerMessages = {
    messages: [],
    
    async init() {
        console.log('💬 Initializing Lecturer Messages...');
        await this.loadMessages();
        this.populateMessageForm();
        this.setupEventListeners();
        console.log('✅ Lecturer Messages initialized');
    },
    
    async loadMessages() {
        try {
            const userId = window.db?.getCurrentUserId();
            
            const { data, error } = await window.db.supabase
                .from('messages')
                .select('*')
                .eq('sender_id', userId)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            this.messages = data || [];
            this.renderMessages();
            console.log(`✅ Loaded ${this.messages.length} messages`);
            
        } catch (error) {
            console.error('Failed to load messages:', error);
            // Don't show error for messages - it's non-critical
        }
    },
    
    renderMessages() {
        const tbody = document.getElementById('messagesTable');
        if (!tbody) return;
        
        const messages = this.messages;
        
        if (!messages.length) {
            tbody.innerHTML = '<tr><td colspan="6">No messages sent.</td></tr>';
            return;
        }
        
        tbody.innerHTML = messages.map(m => {
            const status = m.approval_status || 'pending';
            const statusBadges = {
                'pending': '<span class="badge badge-warning">⏳ Pending Approval</span>',
                'approved': '<span class="badge badge-success">✅ Approved</span>',
                'sent': '<span class="badge badge-success">📨 Sent</span>',
                'rejected': '<span class="badge badge-danger">❌ Rejected</span>'
            };
            
            const targetDisplay = m.target_group === 'all-students' ? 
                `All ${m.target_program || 'Assigned'} Students` :
                `Student: ${m.receiver_id?.substring(0, 8) || 'N/A'}`;
            
            return `
                <tr>
                    <td>${Utils.formatDateTime(m.created_at || m.inserted_at)}</td>
                    <td>${Utils.escapeHtml(m.topic || m.subject || 'N/A')}</td>
                    <td>${Utils.escapeHtml(targetDisplay)}</td>
                    <td>${statusBadges[status] || statusBadges.pending}</td>
                    <td>
                        <button class="btn btn-action btn-small" onclick="LecturerMessages.viewMessage('${m.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },
    
    populateMessageForm() {
        const targetSelect = document.getElementById('msgTarget');
        if (!targetSelect) return;
        
        const profile = window.db?.getUserProfile();
        const program = profile?.program || profile?.department;
        
        // Get students
        window.db.supabase
            .from('consolidated_user_profiles_table')
            .select('user_id, full_name, student_id')
            .eq('role', 'student')
            .eq('program', program)
            .order('full_name', { ascending: true })
            .then(({ data, error }) => {
                if (error) throw error;
                
                targetSelect.innerHTML = `
                    <option value="all-students">All ${program || 'Assigned'} Students</option>
                    ${(data || []).map(s => 
                        `<option value="${s.user_id}">${Utils.escapeHtml(s.full_name)} (${s.student_id || 'N/A'})</option>`
                    ).join('')}
                `;
            })
            .catch(error => {
                console.error('Failed to load students for message:', error);
                targetSelect.innerHTML = `
                    <option value="all-students">All Students</option>
                `;
            });
    },
    
    setupEventListeners() {
        const form = document.getElementById('sendMessageForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSendMessage(e));
        }
    },
    
    async handleSendMessage(e) {
        e.preventDefault();
        const btn = e.submitter || e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Sending...';
        
        const target = document.getElementById('msgTarget')?.value;
        const subject = document.getElementById('msgSubject')?.value;
        const body = document.getElementById('msgBody')?.value;
        
        if (!target || !subject || !body) {
            LecturerUI.showNotification('Please fill all fields.', 'error');
            btn.disabled = false;
            btn.textContent = 'Send Message';
            return;
        }
        
        try {
            const userId = window.db?.getCurrentUserId();
            const profile = window.db?.getUserProfile();
            
            const messageData = {
                sender_id: userId,
                sender_role: 'lecturer',
                topic: subject,
                body: body,
                message: body,
                recipient_role: 'student',
                target_program: profile?.program || profile?.department,
                target_group: target === 'all-students' ? 'all-students' : 'specific-user',
                receiver_id: target === 'all-students' ? null : target,
                approval_status: 'pending',
                created_at: new Date().toISOString(),
                inserted_at: new Date().toISOString()
            };
            
            const { data, error } = await window.db.supabase
                .from('messages')
                .insert(messageData)
                .select();
            
            if (error) throw error;
            
            // Request admin approval
            if (typeof window.requestAdminApproval === 'function') {
                await window.requestAdminApproval(
                    'send_message',
                    {
                        message_id: data[0]?.id,
                        subject: subject,
                        target: target,
                        target_program: profile?.program
                    },
                    'Sent message: ' + subject,
                    data[0]?.id
                );
            }
            
            LecturerUI.showNotification('✅ Message submitted! Waiting for admin approval.', 'success');
            e.target.reset();
            await this.loadMessages();
            
        } catch (error) {
            LecturerUI.showNotification('Failed: ' + error.message, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Send Message';
        }
    },
    
    viewMessage(messageId) {
        const message = this.messages.find(m => m.id === messageId);
        if (!message) {
            LecturerUI.showNotification('Message not found.', 'error');
            return;
        }
        
        // Show message in a modal or alert
        alert(`Subject: ${message.topic || message.subject}\n\n${message.body || message.message}`);
    },
    
    async refresh() {
        await this.loadMessages();
        LecturerUI.showNotification('Messages refreshed!', 'success');
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => LecturerMessages.init(), 950);
});

window.LecturerMessages = LecturerMessages;
