// js/lecturer-messages.js - COMPLETE WITH TVET SUPPORT
/**
 * NCHSM Lecturer Messages Module
 * sender_id is UUID type - use auth UUID
 * Handles both UUID and text ID formats for other modules
 * Supports both Nursing (KRCHN) and TVET programs
 */

const LecturerMessages = {
    messages: [],
    lecturerAssignmentId: null,
    assignedUnits: [],
    isTVET: false,
    currentProgram: 'KRCHN',

    // ============================================
    // PROGRAM TYPE DETECTION
    // ============================================
    getProgramType() {
        return window.CURRENT_PROGRAM_TYPE || 'KRCHN';
    },

    isTVETProgram() {
        return this.getProgramType() === 'TVET';
    },

    getProgramTypeLabel() {
        return this.isTVETProgram() ? '🔧 TVET' : '🎓 Nursing';
    },

    getProgramEmoji() {
        return this.isTVETProgram() ? '🔧' : '🎓';
    },

    getBlockDisplay(blockValue) {
        if (!blockValue) return 'N/A';
        const programType = this.getProgramType();
        if (programType === 'TVET') {
            const match = blockValue.match(/^Y(\d)T(\d)$/);
            if (match) {
                const year = parseInt(match[1]);
                const term = parseInt(match[2]);
                const termNames = ['', 'First', 'Second', 'Third'];
                return `Year ${year} ${termNames[term] || term} Term`;
            }
            if (blockValue.includes('Term')) return blockValue;
            if (blockValue === 'Introductory') return '🌟 Introductory Term';
            return blockValue;
        } else {
            if (blockValue.startsWith('Block ')) return blockValue;
            if (blockValue === 'Introductory') return '🌟 Introductory Block';
            if (blockValue === 'Final') return '🏆 Final Block';
            return `Block ${blockValue}`;
        }
    },

    // ============================================
    // INITIALIZATION
    // ============================================
    async init() {
        console.log('💬 Initializing Lecturer Messages...');
        this.currentProgram = this.getProgramType();
        this.isTVET = this.isTVETProgram();
        console.log(`📚 Program Type: ${this.getProgramTypeLabel()}`);

        await this.resolveLecturerId();
        await this.loadAssignedUnits();
        await this.loadMessages();
        this.populateMessageForm();
        this.setupEventListeners();
        this.updateStats();
        this.updateProgramBadge();
        console.log('✅ Lecturer Messages initialized');
    },

    // ============================================
    // UPDATE PROGRAM BADGE
    // ============================================
    updateProgramBadge() {
        const typeLabel = this.getProgramTypeLabel();
        const emoji = this.getProgramEmoji();

        const subtitle = document.querySelector('#messages-content .subtitle');
        if (subtitle) {
            subtitle.textContent = `${emoji} ${typeLabel} - Send messages to your students`;
        }

        const formTitle = document.querySelector('#sendMessageForm h4');
        if (formTitle) {
            formTitle.innerHTML = `<i class="fas fa-paper-plane" style="color: #4C1D95; font-size: 22px;"></i> Compose ${typeLabel} Message`;
        }
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

            console.log('🔍 Auth ID (UUID):', authId);
            console.log('🔍 Lecturer name:', fullName);

            this.lecturerUuid = authId;

            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(authId));

            if (!isUUID && authId) {
                this.lecturerAssignmentId = authId;
                console.log('✅ Using non-UUID auth ID:', this.lecturerAssignmentId);
                return;
            }

            const { data: assignments, error: assignError } = await supabase
                .from('lecturer_subject_assignments')
                .select('lecturer_id, lecturer_name')
                .ilike('lecturer_name', `%${fullName}%`);

            if (!assignError && assignments && assignments.length > 0) {
                const textId = assignments.find(a => {
                    const id = a.lecturer_id;
                    return id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id));
                });

                if (textId) {
                    this.lecturerAssignmentId = textId.lecturer_id;
                    console.log('✅ Found non-UUID ID for other modules:', this.lecturerAssignmentId);
                    return;
                }

                this.lecturerAssignmentId = assignments[0].lecturer_id;
                console.log('⚠️ Using first match ID:', this.lecturerAssignmentId);
                return;
            }

            const nameParts = fullName.split(' ');
            const { data: staff, error: staffError } = await supabase
                .from('staff_records')
                .select('id, first_name, other_names')
                .ilike('first_name', `%${nameParts[0]}%`);

            if (!staffError && staff && staff.length > 0) {
                this.lecturerAssignmentId = staff[0].id;
                console.log('✅ Found lecturer ID from staff_records:', this.lecturerAssignmentId);
                return;
            }

            this.lecturerAssignmentId = authId;
            console.log('⚠️ Falling back to auth ID:', this.lecturerAssignmentId);

        } catch (error) {
            console.error('Error resolving lecturer ID:', error);
            this.lecturerAssignmentId = null;
            this.lecturerUuid = null;
        }
    },

    // ============================================
    // LOAD ASSIGNED UNITS - WITH TVET SUPPORT
    // ============================================
    async loadAssignedUnits() {
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) return;

            const profile = window.lecturerDB?.getCurrentUserProfile();
            if (!profile) return;

            const lecturerId = this.lecturerAssignmentId || profile.user_id;
            const program = this.currentProgram || profile.program || 'KRCHN';

            const { data: assignments, error } = await supabase
                .from('lecturer_subject_assignments')
                .select('subject_name, subject_code, block, program, academic_year')
                .eq('lecturer_id', String(lecturerId))
                .eq('program', program);

            if (error) {
                console.error('Error loading assigned units:', error);
                return;
            }

            this.assignedUnits = assignments || [];
            console.log(`📚 Loaded ${this.assignedUnits.length} assigned units (${this.getProgramTypeLabel()})`);

        } catch (error) {
            console.error('Failed to load assigned units:', error);
        }
    },

    // ============================================
    // LOAD MESSAGES
    // ============================================
    async loadMessages() {
        try {
            const userId = this.lecturerUuid || window.lecturerDB?.getCurrentUserId();

            if (!userId) {
                console.warn('No user ID found');
                return;
            }

            const supabase = window.lecturerDB?.supabase;
            if (!supabase) {
                console.warn('Supabase not available');
                return;
            }

            console.log('🔍 Loading messages for user UUID:', userId);

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
            console.log(`✅ Loaded ${this.messages.length} messages (${this.getProgramTypeLabel()})`);

        } catch (error) {
            console.error('Failed to load messages:', error);
            this.messages = [];
            this.renderMessages();
        }
    },

    // ============================================
    // RENDER MESSAGES - WITH TVET SUPPORT
    // ============================================
    renderMessages() {
        const tbody = document.getElementById('messagesTable');
        if (!tbody) return;

        const messages = this.messages;
        const typeLabel = this.getProgramTypeLabel();
        const emoji = this.getProgramEmoji();

        if (!messages || messages.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="padding: 50px 20px; text-align: center; color: #94a3b8;">
                        <i class="fas fa-envelope" style="font-size: 48px; display: block; margin-bottom: 15px; color: #e2e8f0;"></i>
                        <h3 style="color: #475569; margin: 0 0 8px 0;">No Messages Sent</h3>
                        <p style="margin: 0; font-size: 14px;">Send your first ${typeLabel} message using the form above.</p>
                        <p style="margin: 5px 0 0 0; font-size: 13px; color: #94a3b8;">Messages are sent immediately!</p>
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
            'pending': 'Pending',
            'approved': 'Approved',
            'rejected': 'Rejected'
        };

        tbody.innerHTML = messages.map(m => {
            const status = m.approval_status || m.status || 'sent';
            const statusColor = statusColors[status] || '#6b7280';
            const statusIcon = statusIcons[status] || '📨';
            const statusLabel = statusLabels[status] || status;

            const targetDisplay = m.target_group === 'all-students' || m.target === 'all-students' ?
                `All ${this.getProgramTypeLabel()} Students` :
                `Student: ${m.receiver_id?.substring(0, 8) || 'N/A'}`;

            const isTVET = m.is_tvet || this.isTVET;

            return `
                <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;"
                    onmouseover="this.style.background='#f8fafc'"
                    onmouseout="this.style.background='transparent'">
                    <td style="padding: 14px 18px; font-size: 13px; color: #475569;">
                        ${this.formatDate(m.created_at || m.inserted_at)}
                    </td>
                    <td style="padding: 14px 18px; font-weight: 600; color: #1e293b;">
                        ${this.escapeHtml(m.topic || m.subject || 'No Subject')}
                        ${m.target_group === 'all-students' || m.target === 'all-students' ?
                            `<span style="font-size: 10px; background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 10px; margin-left: 8px;">Bulk</span>` : ''}
                        ${isTVET ? ' <span style="font-size: 9px; background: #8b5cf6; color: white; padding: 2px 8px; border-radius: 10px;">TVET</span>' : ''}
                    </td>
                    <td style="padding: 14px 18px; font-size: 13px; color: #475569;">
                        ${this.escapeHtml(targetDisplay)}
                        ${isTVET ? ` <span style="font-size: 8px; color: #8b5cf6;">(TVET)</span>` : ''}
                    </td>
                    <td style="padding: 14px 18px;">
                        <span style="background: ${statusColor}20; color: ${statusColor}; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 500;">
                            ${statusIcon} ${statusLabel}
                        </span>
                    </td>
                    <td style="padding: 14px 18px; text-align: center;">
                        <div style="display: flex; gap: 6px; justify-content: center; flex-wrap: wrap;">
                            <button onclick="LecturerMessages.viewMessage('${m.id}')"
                                    style="background: #4C1D95; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;">
                                <i class="fas fa-eye"></i> View
                            </button>
                            ${status === 'pending' || status === 'sent' ? `
                                <button onclick="LecturerMessages.deleteMessage('${m.id}')"
                                        style="background: #fee2e2; color: #dc2626; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    // ============================================
    // UPDATE STATS - WITH TVET SUPPORT
    // ============================================
    updateStats() {
        const messages = this.messages;
        const total = messages.length;
        const sent = messages.filter(m => m.status === 'sent' || m.approval_status === 'approved').length;
        const read = messages.filter(m => m.status === 'read' || m.approval_status === 'approved').length;
        const pending = messages.filter(m => m.status === 'pending' || m.approval_status === 'pending').length;
        const typeLabel = this.getProgramTypeLabel();

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

        // Update title
        const title = document.querySelector('#messages-content h2');
        if (title) {
            const emoji = this.getProgramEmoji();
            title.innerHTML = `<i class="fas fa-envelope" style="color: #FDB913;"></i> ${emoji} ${typeLabel} Messages`;
        }
    },

    // ============================================
    // POPULATE MESSAGE FORM - WITH TVET SUPPORT
    // ============================================
    populateMessageForm() {
        const targetSelect = document.getElementById('msgTarget');
        if (!targetSelect) return;

        const profile = window.lecturerDB?.getCurrentUserProfile();
        const program = this.currentProgram || profile?.program || profile?.department;
        const typeLabel = this.getProgramTypeLabel();
        const emoji = this.getProgramEmoji();

        targetSelect.innerHTML = `
            <option value="all-students">📨 All ${typeLabel} Students</option>
        `;

        this.loadStudentsForForm();
        this.updateProgramBadge();
    },

    // ============================================
    // LOAD STUDENTS FOR FORM - WITH TVET SUPPORT
    // ============================================
    async loadStudentsForForm() {
        try {
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const program = this.currentProgram || profile?.program || profile?.department;
            const supabase = window.lecturerDB?.supabase;

            if (!supabase || !program) return;

            const { data: students, error } = await supabase
                .from('consolidated_user_profiles_table')
                .select('user_id, full_name, student_id, block')
                .eq('program', program)
                .eq('role', 'student')
                .order('full_name', { ascending: true });

            if (error) throw error;

            const targetSelect = document.getElementById('msgTarget');
            const typeLabel = this.getProgramTypeLabel();
            const emoji = this.getProgramEmoji();

            if (targetSelect && students) {
                const allOption = targetSelect.querySelector('option[value="all-students"]');
                targetSelect.innerHTML = '';
                if (allOption) {
                    allOption.textContent = `📨 All ${typeLabel} Students`;
                    targetSelect.appendChild(allOption);
                }

                students.forEach(s => {
                    const option = document.createElement('option');
                    option.value = s.user_id;
                    const blockDisplay = s.block ? this.getBlockDisplay(s.block) : '';
                    option.textContent = `${s.full_name || 'N/A'} (${s.student_id || 'N/A'})${blockDisplay ? ' - ' + blockDisplay : ''}`;
                    if (this.isTVET) {
                        option.textContent += ' 🔧';
                    }
                    targetSelect.appendChild(option);
                });

                console.log(`👥 Loaded ${students.length} ${typeLabel} students for message form`);
            }

        } catch (error) {
            console.error('Failed to load students for form:', error);
        }
    },

    // ============================================
    // SETUP EVENT LISTENERS
    // ============================================
    setupEventListeners() {
        const form = document.getElementById('sendMessageForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSendMessage(e));
        }

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

    // ============================================
    // FILTER MESSAGES
    // ============================================
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

    // ============================================
    // HANDLE SEND MESSAGE - WITH TVET SUPPORT
    // ============================================
    async handleSendMessage(e) {
        if (e) e.preventDefault();

        const btn = document.querySelector('#sendMessageForm button[type="submit"]');
        const originalText = btn?.innerHTML || 'Send Message';
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        }

        const target = document.getElementById('msgTarget')?.value;
        const subject = document.getElementById('msgSubject')?.value;
        const body = document.getElementById('msgBody')?.value;

        if (!target || !subject || !body) {
            window.showNotification('Please fill all fields.', 'error');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
            return;
        }

        try {
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const senderUuid = this.lecturerUuid || profile?.user_id;

            if (!senderUuid) {
                throw new Error('No UUID found for sender');
            }

            const supabase = window.lecturerDB?.supabase;
            if (!supabase) {
                throw new Error('Database connection not available');
            }

            const senderName = profile?.full_name || 'Lecturer';
            const typeLabel = this.getProgramTypeLabel();
            const program = this.currentProgram || profile?.program || 'KRCHN';

            // Get target student details if not bulk
            let targetName = null;
            let targetBlock = null;
            if (target !== 'all-students') {
                const { data: student, error: studentError } = await supabase
                    .from('consolidated_user_profiles_table')
                    .select('full_name, block')
                    .eq('user_id', target)
                    .maybeSingle();

                if (!studentError && student) {
                    targetName = student.full_name;
                    targetBlock = student.block;
                }
            }

            const messageData = {
                sender_id: senderUuid,
                sender_role: 'lecturer',
                topic: subject,
                body: body,
                recipient_role: 'student',
                target_program: program,
                target_group: target === 'all-students' ? 'all-students' : 'specific-user',
                receiver_id: target === 'all-students' ? null : target,
                receiver_name: targetName || null,
                receiver_block: targetBlock || null,
                approval_status: 'pending',
                created_at: new Date().toISOString(),
                program_type: typeLabel,
                is_tvet: this.isTVET,
                sender_name: senderName
            };

            console.log(`📤 Sending ${typeLabel} message with UUID sender_id:`, senderUuid);

            const { data: result, error } = await supabase
                .from('messages')
                .insert([messageData])
                .select();

            if (error) {
                console.error('DB Error:', error);
                throw new Error('Failed to send message: ' + error.message);
            }

            const recipientDisplay = target === 'all-students' ? `all ${typeLabel} students` : `student`;
            window.showNotification(`✅ ${typeLabel} message sent to ${recipientDisplay}!`, 'success');

            document.getElementById('sendMessageForm')?.reset();
            const charCount = document.getElementById('charCount');
            if (charCount) charCount.textContent = '0 characters';

            await this.loadMessages();

        } catch (error) {
            console.error('Error sending message:', error);
            window.showNotification('Failed to send message: ' + error.message, 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        }
    },

    // ============================================
    // VIEW MESSAGE
    // ============================================
    viewMessage(messageId) {
        const message = this.messages.find(m => m.id === messageId);
        if (!message) {
            window.showNotification('Message not found.', 'error');
            return;
        }

        const subject = message.topic || message.subject || 'No Subject';
        const body = message.body || message.message || 'No content';
        const target = message.target_group === 'all-students' ? 'All Students' : 'Specific Student';
        const typeLabel = this.getProgramTypeLabel();

        alert(`📨 ${typeLabel} Message Details\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📌 Subject: ${subject}\n👥 Recipient: ${target}\n📅 Sent: ${this.formatDate(message.created_at || message.inserted_at)}\n${this.isTVET ? '🔧 TVET\n' : ''}\n📝 Message:\n${body}`);
    },

    // ============================================
    // DELETE MESSAGE
    // ============================================
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
                .eq('id', message.id);

            if (error) throw error;

            window.showNotification('✅ Message deleted!', 'success');
            await this.loadMessages();

        } catch (error) {
            console.error('Error deleting message:', error);
            window.showNotification('Failed to delete message: ' + error.message, 'error');
        }
    },

    // ============================================
    // EXPORT MESSAGES - WITH TVET SUPPORT
    // ============================================
    exportMessages() {
        const messages = this.messages;
        if (messages.length === 0) {
            window.showNotification('No messages to export.', 'warning');
            return;
        }

        const typeLabel = this.getProgramTypeLabel();

        const headers = ['Date', 'Subject', 'Recipient', 'Status', 'Program Type'];
        const rows = messages.map(m => {
            const target = m.target_group === 'all-students' ? `All ${typeLabel} Students` : m.receiver_id || 'N/A';
            const status = m.approval_status || m.status || 'sent';
            return [
                this.formatDate(m.created_at || m.inserted_at),
                m.topic || m.subject || 'N/A',
                target,
                status,
                m.program_type || typeLabel
            ];
        });

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${typeLabel}_messages_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        window.showNotification(`✅ ${typeLabel} messages exported successfully!`, 'success');
    },

    // ============================================
    // UTILITY METHODS
    // ============================================
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

    // ============================================
    // REFRESH
    // ============================================
    async refresh() {
        await this.resolveLecturerId();
        await this.loadAssignedUnits();
        await this.loadMessages();
        this.populateMessageForm();
        this.updateStats();
        this.updateProgramBadge();
        window.showNotification(`${this.getProgramTypeLabel()} messages refreshed!`, 'success');
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => LecturerMessages.init(), 950);
});

// Make functions globally accessible
window.LecturerMessages = LecturerMessages;
window.sendMessage = (e) => LecturerMessages.handleSendMessage(e);
window.searchMessages = () => LecturerMessages.filterMessages();
window.exportMessages = () => LecturerMessages.exportMessages();

console.log('✅ LecturerMessages module loaded - Uses UUID for sender_id');
console.log('📊 TVET Support: Enabled');
