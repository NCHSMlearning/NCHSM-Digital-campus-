// js/lecturer-messages.js
/**
 * NCHSM Lecturer Messages Module
 * Uses dedicated lecturer database
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
            const userId = window.lecturerDB?.getCurrentUserId();
            
            if (!userId) {
                console.warn('No user ID found');
                return;
            }
            
            // ✅ Use lecturerDB
            this.messages = await window.lecturerDB.getMessages(userId);
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
                    <td>${window.LecturerUtils?.formatDateTime(m.created_at || m.inserted_at) || m.created_at || 'N/A'}</td>
                    <td>${window.LecturerUtils?.escapeHtml(m.topic || m.subject || 'N/A') || m.topic || m.subject || 'N/A'}</td>
                    <td>${window.LecturerUtils?.escapeHtml(targetDisplay) || targetDisplay}</td>
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
        
        const profile = window.lecturerDB?.getCurrentUserProfile();
        const program = profile?.program || profile?.department;
        
        if (!program) {
            targetSelect.innerHTML = '<option value="all-students">All Students</option>';
            return;
        }
        
        // ✅ Use lecturerDB
        window.lecturerDB.getStudents(program)
            .then(students => {
                targetSelect.innerHTML = `
                    <option value="all-students">All ${program || 'Assigned'} Students</option>
                    ${(students || []).map(s => 
                        `<option value="${s.user_id}">${window.LecturerUtils?.escapeHtml(s.full_name) || s.full_name || 'N/A'} (${s.student_id || 'N/A'})</option>`
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
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Please fill all fields.', 'error');
            }
            btn.disabled = false;
            btn.textContent = 'Send Message';
            return;
        }
        
        try {
            // ✅ Use lecturerDB
            const result = await window.lecturerDB.sendMessage({
                target: target,
                subject: subject,
                message: body
            });
            
            if (!result.success) {
                throw new Error(result.error);
            }
            
            // Request admin approval
            if (typeof window.requestAdminApproval === 'function') {
                const profile = window.lecturerDB?.getCurrentUserProfile();
                await window.requestAdminApproval(
                    'send_message',
                    {
                        message_id: result.data[0]?.id,
                        subject: subject,
                        target: target,
                        target_program: profile?.program
                    },
                    'Sent message: ' + subject,
                    result.data[0]?.id
                );
            }
            
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('✅ Message submitted! Waiting for admin approval.', 'success');
            }
            e.target.reset();
            await this.loadMessages();
            
        } catch (error) {
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Failed: ' + error.message, 'error');
            }
        } finally {
            btn.disabled = false;
            btn.textContent = 'Send Message';
        }
    },
    
    viewMessage(messageId) {
        const message = this.messages.find(m => m.id === messageId);
        if (!message) {
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Message not found.', 'error');
            }
            return;
        }
        
        // Show message in a modal or alert
        alert(`Subject: ${message.topic || message.subject}\n\n${message.body || message.message}`);
    },
    
    async refresh() {
        await this.loadMessages();
        if (window.LecturerUI) {
            window.LecturerUI.showNotification('Messages refreshed!', 'success');
        }
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => LecturerMessages.init(), 950);
});

window.LecturerMessages = LecturerMessages;
