// js/lecturer-messages.js
/**
 * NCHSM Lecturer Messages Module
 * Uses dedicated lecturer database with correct ID resolution
 * Messages sent immediately with admin approval workflow
 */

const LecturerMessages = {
    messages: [],
    lecturerAssignmentId: null,
    assignedUnits: [],
    
    async init() {
        console.log('💬 Initializing Lecturer Messages...');
        await this.resolveLecturerId();
        await this.loadAssignedUnits();
        await this.loadMessages();
        this.populateMessageForm();
        this.setupEventListeners();
        this.updateStats();
        console.log('✅ Lecturer Messages initialized');
    },
    
    // ============================================
    // RESOLVE THE CORRECT LECTURER ID
    // ============================================
    async resolveLecturerId() {
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) {
                console.warn('Supabase not available');
                return;
            }
            
            const profile = window.lecturerDB?.getCurrentUserProfile();
            if (!profile) {
                console.warn('No lecturer profile found');
                return;
            }
            
            const authId = profile.user_id;
            const fullName = profile.full_name;
            
            console.log('🔍 Auth ID:', authId);
            console.log('🔍 Lecturer name:', fullName);
            
            // Try to find by name in lecturer_subject_assignments
            const { data, error } = await supabase
                .from('lecturer_subject_assignments')
                .select('lecturer_id, lecturer_name')
                .eq('lecturer_name', fullName)
                .limit(1);
            
            if (!error && data && data.length > 0) {
                this.lecturerAssignmentId = data[0].lecturer_id;
                console.log('✅ Found lecturer ID by name:', this.lecturerAssignmentId);
                return;
            }
            
            // Try partial name match with scoring
            const nameParts = fullName.toLowerCase().split(' ');
            const { data: allLecturers, error: allError } = await supabase
                .from('lecturer_subject_assignments')
                .select('lecturer_id, lecturer_name')
                .order('created_at', { ascending: false });
            
            if (!allError && allLecturers && allLecturers.length > 0) {
                let bestMatch = null;
                let bestScore = -1;
                
                for (const lecturer of allLecturers) {
                    const lecturerName = lecturer.lecturer_name || '';
                    const lecturerId = lecturer.lecturer_id;
                    let score = 0;
                    
                    const lecturerNameLower = lecturerName.toLowerCase();
                    for (const part of nameParts) {
                        if (part.length > 1 && lecturerNameLower.includes(part)) {
                            score += 5;
                        }
                    }
                    
                    if (lecturerNameLower === fullName.toLowerCase()) {
                        score += 20;
                    }
                    
                    // BIG BONUS for non-STAFF IDs
                    if (!lecturerId.toString().startsWith('STAFF')) {
                        score += 50;
                    }
                    
                    if (lecturerId.toString().includes('-')) {
                        score += 30;
                    }
                    
                    if (score > bestScore) {
                        bestScore = score;
                        bestMatch = lecturerId;
                    }
                }
                
                if (bestMatch) {
                    this.lecturerAssignmentId = bestMatch;
                    console.log(`✅ Selected lecturer ID with score ${bestScore}:`, this.lecturerAssignmentId);
                    return;
                }
            }
            
            // Fallback: use auth ID
            this.lecturerAssignmentId = authId;
            console.log('⚠️ Falling back to auth ID:', this.lecturerAssignmentId);
            
        } catch (error) {
            console.error('Error resolving lecturer ID:', error);
            this.lecturerAssignmentId = null;
        }
    },
    
    // ============================================
    // LOAD ASSIGNED UNITS
    // ============================================
    async loadAssignedUnits() {
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) return;
            
            const profile = window.lecturerDB?.getCurrentUserProfile();
            if (!profile) return;
            
            const lecturerId = this.lecturerAssignmentId || profile.user_id;
            
            const { data: assignments, error } = await supabase
                .from('lecturer_subject_assignments')
                .select('subject_name, subject_code, block, program, academic_year')
                .eq('lecturer_id', lecturerId);
            
            if (error) {
                console.error('Error loading assigned units:', error);
                return;
            }
            
            this.assignedUnits = assignments || [];
            console.log(`📚 Loaded ${this.assignedUnits.length} assigned units`);
            
        } catch (error) {
            console.error('Failed to load assigned units:', error);
        }
    },
    
    async loadMessages() {
        try {
            const userId = this.lecturerAssignmentId || window.lecturerDB?.getCurrentUserId();
            
            if (!userId) {
                console.warn('No user ID found');
                return;
            }
            
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) {
                console.warn('Supabase not available');
                return;
            }
            
            const { data: messages, error } = await supabase
                .from('messages')
                .select('*')
                .eq('sender_id', userId)
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error('Error loading messages:', error);
                return;
            }
            
            this.messages = messages || [];
            this.renderMessages();
            this.updateStats();
            console.log(`✅ Loaded ${this.messages.length} messages`);
            
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    },
    
    renderMessages() {
        const tbody = document.getElementById('messagesTable');
        if (!tbody) return;
        
        const messages = this.messages;
        
        if (!messages || messages.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="padding: 50px 20px; text-align: center; color: #94a3b8;">
                        <i class="fas fa-envelope" style="font-size: 48px; display: block; margin-bottom: 15px; color: #e2e8f0;"></i>
                        <h3 style="color: #475569; margin: 0 0 8px 0;">No Messages Sent</h3>
                        <p style="margin: 0; font-size: 14px;">Send your first message using the form above.</p>
                        <p style="margin: 5px 0 0 0; font-size: 13px; color: #94a3b8;">Messages are sent immediately - no approval needed!</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        const statusColors = {
            'sent': '#10b981',
            'delivered': '#3b82f6',
            'read': '#8b5cf6',
            'failed': '#ef4444',
            'pending': '#f59e0b',
            'approved': '#10b981',
            'rejected': '#ef4444'
        };
        
        const statusIcons = {
            'sent': '✅',
            'delivered': '📨',
            'read': '👁️',
            'failed': '❌',
            'pending': '⏳',
            'approved': '✅',
            'rejected': '❌'
        };
        
        const statusLabels = {
            'sent': 'Sent',
            'delivered': 'Delivered',
            'read': 'Read',
            'failed': 'Failed',
            'pending': 'Pending Approval',
            'approved': 'Approved',
            'rejected': 'Rejected'
        };
        
        tbody.innerHTML = messages.map(m => {
            const status = m.approval_status || m.status || 'sent';
            const statusColor = statusColors[status] || '#6b7280';
            const statusIcon = statusIcons[status] || '📨';
            const statusLabel = statusLabels[status] || status;
            
            const targetDisplay = m.target_group === 'all-students' || m.target === 'all-students' ? 
                `All ${m.target_program || 'Students'}` :
                `Student: ${m.receiver_id?.substring(0, 8) || 'N/A'}`;
            
            return `
                <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;" 
                    onmouseover="this.style.background='#f8fafc'" 
                    onmouseout="this.style.background='transparent'">
                    <td style="padding: 14px 18px; font-size: 13px; color: #475569;">
                        ${this.formatDate(m.created_at || m.inserted_at)}
                    </td>
                    <td style="padding: 14px 18px; font-weight: 600; color: #1e293b;">
                        ${this.escapeHtml(m.topic || m.subject || 'No Subject')}
                        ${m.target === 'all-students' || m.target_group === 'all-students' ? 
                            '<span style="font-size: 10px; background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 10px; margin-left: 8px;">Bulk</span>' : ''}
                    </td>
                    <td style="padding: 14px 18px; font-size: 13px; color: #475569;">
                        ${this.escapeHtml(targetDisplay)}
                    </td>
                    <td style="padding: 14px 18px;">
                        <span style="background: ${statusColor}20; color: ${statusColor}; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 500;">
                            ${statusIcon} ${statusLabel}
                        </span>
                    </td>
                    <td style="padding: 14px 18px; text-align: center;">
                        <div style="display: flex; gap: 6px; justify-content: center; flex-wrap: wrap;">
                            <button onclick="LecturerMessages.viewMessage('${m.id}')" 
                                    style="background: #4C1D95; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;"
                                    onmouseover="this.style.background='#5b21b6'" onmouseout="this.style.background='#4C1D95'">
                                <i class="fas fa-eye"></i> View
                            </button>
                            ${status === 'pending' || status === 'sent' ? `
                                <button onclick="LecturerMessages.deleteMessage('${m.id}')" 
                                        style="background: #fee2e2; color: #dc2626; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;"
                                        onmouseover="this.style.background='#fecaca'" onmouseout="this.style.background='#fee2e2'">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },
    
    updateStats() {
        const messages = this.messages;
        const total = messages.length;
        const sent = messages.filter(m => m.status === 'sent' || m.approval_status === 'approved').length;
        const read = messages.filter(m => m.status === 'read' || m.approval_status === 'approved').length;
        const pending = messages.filter(m => m.status === 'pending' || m.approval_status === 'pending').length;
        
        const totalEl = document.getElementById('totalMessagesStat');
        if (totalEl) totalEl.textContent = total;
        
        const sentEl = document.getElementById('sentMessagesStat');
        if (sentEl) sentEl.textContent = sent;
        
        const readEl = document.getElementById('readMessagesStat');
        if (readEl) readEl.textContent = read;
        
        const pendingEl = document.getElementById('pendingMessagesStat');
        if (pendingEl) pendingEl.textContent = pending;
        
        const badge = document.getElementById('messageCountBadge2');
        if (badge) badge.textContent = total;
        
        const countDisplay = document.getElementById('messageCountDisplay');
        if (countDisplay) countDisplay.textContent = total;
    },
    
    populateMessageForm() {
        const targetSelect = document.getElementById('msgTarget');
        if (!targetSelect) return;
        
        const profile = window.lecturerDB?.getCurrentUserProfile();
        const program = profile?.program || profile?.department;
        
        // Add "All Students" option
        targetSelect.innerHTML = `
            <option value="all-students">📨 All ${program || 'Assigned'} Students</option>
        `;
        
        // Load students
        this.loadStudentsForForm();
    },
    
    async loadStudentsForForm() {
        try {
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const program = profile?.program || profile?.department;
            const supabase = window.lecturerDB?.supabase;
            
            if (!supabase || !program) return;
            
            const { data: students, error } = await supabase
                .from('consolidated_user_profiles_table')
                .select('user_id, full_name, student_id')
                .eq('program', program)
                .eq('role', 'student')
                .order('full_name', { ascending: true });
            
            if (error) throw error;
            
            const targetSelect = document.getElementById('msgTarget');
            if (targetSelect && students) {
                // Keep the "All Students" option
                const allOption = targetSelect.querySelector('option[value="all-students"]');
                targetSelect.innerHTML = '';
                if (allOption) targetSelect.appendChild(allOption);
                
                students.forEach(s => {
                    const option = document.createElement('option');
                    option.value = s.user_id;
                    option.textContent = `${s.full_name || 'N/A'} (${s.student_id || 'N/A'})`;
                    targetSelect.appendChild(option);
                });
            }
            
        } catch (error) {
            console.error('Failed to load students for form:', error);
        }
    },
    
    setupEventListeners() {
        const form = document.getElementById('sendMessageForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSendMessage(e));
        }
        
        // Character counter
        const msgBody = document.getElementById('msgBody');
        if (msgBody) {
            msgBody.addEventListener('input', () => {
                const count = msgBody.value.length;
                const charCount = document.getElementById('charCount');
                if (charCount) {
                    charCount.textContent = `${count} characters`;
                }
            });
        }
        
        // Search
        const searchInput = document.getElementById('messageSearch');
        if (searchInput) {
            let timeout;
            searchInput.addEventListener('input', () => {
                clearTimeout(timeout);
                timeout = setTimeout(() => this.filterMessages(), 300);
            });
        }
        
        const searchBtn = document.getElementById('messageSearchBtn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.filterMessages());
        }
    },
    
    filterMessages() {
        const searchTerm = document.getElementById('messageSearch')?.value?.toLowerCase() || '';
        const rows = document.querySelectorAll('#messagesTable tr');
        let visibleCount = 0;
        
        rows.forEach(row => {
            const text = row.textContent?.toLowerCase() || '';
            const match = text.includes(searchTerm);
            row.style.display = match ? '' : 'none';
            if (match) visibleCount++;
        });
        
        const countDisplay = document.getElementById('messageCountDisplay');
        if (countDisplay) countDisplay.textContent = visibleCount;
    },
    
    async handleSendMessage(e) {
        e.preventDefault();
        const btn = e.submitter || e.target.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        
        const target = document.getElementById('msgTarget')?.value;
        const subject = document.getElementById('msgSubject')?.value;
        const body = document.getElementById('msgBody')?.value;
        
        if (!target || !subject || !body) {
            window.showNotification('Please fill all fields.', 'error');
            btn.disabled = false;
            btn.innerHTML = originalText;
            return;
        }
        
        try {
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const lecturerId = this.lecturerAssignmentId || profile?.user_id;
            const supabase = window.lecturerDB?.supabase;
            
            if (!supabase) {
                throw new Error('Database connection not available');
            }
            
            // Save message - sent immediately
            const { data: result, error } = await supabase
                .from('messages')
                .insert({
                    sender_id: lecturerId,
                    sender_role: 'lecturer',
                    sender_name: profile?.full_name || 'Lecturer',
                    topic: subject,
                    subject: subject,
                    body: body,
                    message: body,
                    recipient_role: 'student',
                    target_program: profile?.program,
                    target_group: target === 'all-students' ? 'all-students' : 'specific-user',
                    receiver_id: target === 'all-students' ? null : target,
                    approval_status: 'sent',
                    status: 'sent',
                    created_at: new Date().toISOString(),
                    inserted_at: new Date().toISOString()
                })
                .select();
            
            if (error) throw error;
            
            window.showNotification('✅ Message sent successfully!', 'success');
            e.target.reset();
            
            // Reset char count
            const charCount = document.getElementById('charCount');
            if (charCount) charCount.textContent = '0 characters';
            
            await this.loadMessages();
            
        } catch (error) {
            console.error('Error sending message:', error);
            window.showNotification('Failed to send message: ' + error.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    },
    
    viewMessage(messageId) {
        const message = this.messages.find(m => m.id === messageId);
        if (!message) {
            window.showNotification('Message not found.', 'error');
            return;
        }
        
        const subject = message.topic || message.subject || 'No Subject';
        const body = message.body || message.message || 'No content';
        const target = message.target_group === 'all-students' ? 'All Students' : 'Specific Student';
        
        alert(`📨 Message Details\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📌 Subject: ${subject}\n👥 Recipient: ${target}\n📅 Sent: ${this.formatDate(message.created_at || message.inserted_at)}\n\n📝 Message:\n${body}`);
    },
    
    async deleteMessage(messageId) {
        const message = this.messages.find(m => m.id === messageId);
        if (!message) {
            window.showNotification('Message not found.', 'error');
            return;
        }
        
        if (!confirm(`Delete message "${message.topic || message.subject || 'Message'}"?`)) return;
        
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) {
                throw new Error('Database connection not available');
            }
            
            const { error } = await supabase
                .from('messages')
                .delete()
                .eq('id', messageId);
            
            if (error) throw error;
            
            window.showNotification('✅ Message deleted!', 'success');
            await this.loadMessages();
            
        } catch (error) {
            console.error('Error deleting message:', error);
            window.showNotification('Failed to delete message: ' + error.message, 'error');
        }
    },
    
    exportMessages() {
        const messages = this.messages;
        if (messages.length === 0) {
            window.showNotification('No messages to export.', 'warning');
            return;
        }
        
        const headers = ['Date', 'Subject', 'Recipient', 'Status'];
        const rows = messages.map(m => {
            const target = m.target_group === 'all-students' ? 'All Students' : m.receiver_id || 'N/A';
            const status = m.approval_status || m.status || 'sent';
            return [
                this.formatDate(m.created_at || m.inserted_at),
                m.topic || m.subject || 'N/A',
                target,
                status
            ];
        });
        
        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `messages_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        window.showNotification('✅ Messages exported successfully!', 'success');
    },
    
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateString;
        }
    },
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    async refresh() {
        await this.resolveLecturerId();
        await this.loadAssignedUnits();
        await this.loadMessages();
        this.populateMessageForm();
        this.updateStats();
        window.showNotification('Messages refreshed!', 'success');
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => LecturerMessages.init(), 950);
});

// Make globally accessible
window.LecturerMessages = LecturerMessages;
window.searchMessages = () => LecturerMessages.filterMessages();
window.exportMessages = () => LecturerMessages.exportMessages();

console.log('✅ LecturerMessages module loaded - Same ID resolution as other modules');
