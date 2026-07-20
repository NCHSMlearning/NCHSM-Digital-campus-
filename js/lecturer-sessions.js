// js/lecturer-sessions.js
/**
 * NCHSM Lecturer Sessions Module
 * Handles scheduling, managing, and viewing sessions
 */

const LecturerSessions = {
    sessions: [],
    
    // Initialize
    async init() {
        console.log('📅 Initializing Lecturer Sessions...');
        await this.loadSessions();
        this.populateSessionForm();
        this.setupEventListeners();
        console.log('✅ Lecturer Sessions initialized');
    },
    
    // Load sessions
    async loadSessions() {
        try {
            const profile = window.db?.getUserProfile();
            const program = profile?.program || profile?.department;
            const userId = window.db?.getCurrentUserId();
            
            if (!program || !userId) {
                console.warn('No program or user ID found');
                return;
            }
            
            const { data, error } = await window.db.supabase
                .from('scheduled_sessions')
                .select('*')
                .eq('target_program', program)
                .eq('lecturer_id', userId)
                .order('session_date', { ascending: true });
            
            if (error) throw error;
            
            this.sessions = data || [];
            this.renderSessions();
            console.log(`✅ Loaded ${this.sessions.length} sessions`);
            
        } catch (error) {
            console.error('Failed to load sessions:', error);
            LecturerUI.showNotification('Failed to load sessions: ' + error.message, 'error');
        }
    },
    
    // Render sessions table
    renderSessions() {
        const tbody = document.getElementById('sessionsTable');
        if (!tbody) return;
        
        const sessions = this.sessions;
        
        if (!sessions.length) {
            tbody.innerHTML = '<tr><td colspan="6">No sessions scheduled.</td></tr>';
            return;
        }
        
        tbody.innerHTML = sessions.map(session => {
            const dateTime = session.session_date 
                ? Utils.formatDate(session.session_date) + (session.session_time ? ' ' + session.session_time : '')
                : 'N/A';
            
            const statusBadge = this.getStatusBadge(session);
            
            return `
                <tr>
                    <td><strong>${Utils.escapeHtml(session.session_title || 'N/A')}</strong></td>
                    <td>${dateTime}</td>
                    <td>${Utils.escapeHtml(session.course_name || 'N/A')}</td>
                    <td>${Utils.escapeHtml(session.target_program || 'N/A')}/${Utils.escapeHtml(session.block_term || 'N/A')}</td>
                    <td>
                        <button class="btn btn-action btn-small" 
                                onclick="LecturerSessions.generateAttendanceLink('${session.id}')">
                            <i class="fas fa-link"></i> Get Link
                        </button>
                    </td>
                    <td>
                        ${statusBadge}
                        ${session.approval_status === 'pending' ? 
                            `<button class="btn btn-delete btn-small" onclick="LecturerSessions.cancelSession('${session.id}')">
                                <i class="fas fa-times"></i> Cancel
                            </button>` : ''
                        }
                    </td>
                </tr>
            `;
        }).join('');
    },
    
    // Get status badge
    getStatusBadge(session) {
        const status = session.approval_status || 'pending';
        const badges = {
            'pending': '<span class="badge badge-warning">⏳ Pending Approval</span>',
            'approved': '<span class="badge badge-success">✅ Approved</span>',
            'rejected': '<span class="badge badge-danger">❌ Rejected</span>',
            'completed': '<span class="badge badge-info">📌 Completed</span>'
        };
        return badges[status] || badges.pending;
    },
    
    // Generate attendance link
    generateAttendanceLink(sessionId) {
        const session = this.sessions.find(s => s.id === sessionId);
        if (!session) {
            LecturerUI.showNotification('Session not found.', 'error');
            return;
        }
        
        const link = `${window.location.origin}/attendance?session=${sessionId}`;
        
        // Copy to clipboard
        navigator.clipboard?.writeText(link).then(() => {
            LecturerUI.showNotification('Attendance link copied to clipboard!', 'success');
        }).catch(() => {
            // Fallback
            prompt('Copy this link:', link);
        });
    },
    
    // Populate session form
    populateSessionForm() {
        const profile = window.db?.getUserProfile();
        const program = profile?.program || profile?.department;
        
        // Program
        const programSelect = document.getElementById('sessionProgram');
        if (programSelect && program) {
            programSelect.innerHTML = `<option value="${program}">${program}</option>`;
        }
        
        // Blocks
        const blocks = Utils.getAcademicBlocks(program);
        const blockSelect = document.getElementById('sessionBlockTerm');
        if (blockSelect) {
            blockSelect.innerHTML = '<option value="">-- Select Block/Term --</option>' +
                blocks.map(b => `<option value="${b}">${b}</option>`).join('');
        }
        
        // Courses
        this.loadCoursesForForm();
    },
    
    // Load courses for form
    async loadCoursesForForm() {
        try {
            const profile = window.db?.getUserProfile();
            const program = profile?.program || profile?.department;
            
            const { data, error } = await window.db.supabase
                .from('courses')
                .select('id, course_name')
                .eq('target_program', program)
                .eq('status', 'Active');
            
            if (error) throw error;
            
            const courseSelect = document.getElementById('sessionCourseId');
            if (courseSelect) {
                courseSelect.innerHTML = '<option value="">-- Select Course --</option>' +
                    (data || []).map(c => 
                        `<option value="${c.id}">${Utils.escapeHtml(c.course_name)}</option>`
                    ).join('');
            }
            
        } catch (error) {
            console.error('Failed to load courses for form:', error);
        }
    },
    
    // Setup event listeners
    setupEventListeners() {
        // Session form submission
        const form = document.getElementById('addSessionForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleAddSession(e));
        }
        
        // Date default to tomorrow
        const dateInput = document.getElementById('sessionDate');
        if (dateInput) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            dateInput.value = tomorrow.toISOString().split('T')[0];
        }
    },
    
    // Handle add session
    async handleAddSession(e) {
        e.preventDefault();
        const btn = e.submitter || e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Scheduling...';
        
        const formData = {
            title: document.getElementById('sessionTopic')?.value,
            date: document.getElementById('sessionDate')?.value,
            time: document.getElementById('sessionTime')?.value,
            program: document.getElementById('sessionProgram')?.value,
            block: document.getElementById('sessionBlockTerm')?.value,
            course: document.getElementById('sessionCourseId')?.value
        };
        
        // Validate
        if (!formData.title || !formData.date || !formData.program || !formData.block || !formData.course) {
            LecturerUI.showNotification('Please fill all fields.', 'error');
            btn.disabled = false;
            btn.textContent = 'Schedule Session';
            return;
        }
        
        try {
            const userId = window.db?.getCurrentUserId();
            const profile = window.db?.getUserProfile();
            
            const { data, error } = await window.db.supabase
                .from('scheduled_sessions')
                .insert({
                    session_title: formData.title,
                    session_date: formData.date,
                    session_time: formData.time || null,
                    target_program: formData.program,
                    block_term: formData.block,
                    course_id: formData.course,
                    lecturer_id: userId,
                    lecturer_name: profile?.full_name || 'Lecturer',
                    approval_status: 'pending',
                    created_at: new Date().toISOString()
                })
                .select();
            
            if (error) throw error;
            
            // Request admin approval
            if (typeof window.requestAdminApproval === 'function') {
                await window.requestAdminApproval(
                    'schedule_session',
                    {
                        session_id: data[0]?.id,
                        title: formData.title,
                        date: formData.date,
                        program: formData.program,
                        block: formData.block
                    },
                    'Scheduled session: ' + formData.title,
                    data[0]?.id
                );
            }
            
            LecturerUI.showNotification('✅ Session scheduled! Waiting for admin approval.', 'success');
            e.target.reset();
            await this.loadSessions();
            
        } catch (error) {
            LecturerUI.showNotification('Failed: ' + error.message, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Schedule Session';
        }
    },
    
    // Cancel session (only if pending)
    async cancelSession(sessionId) {
        const session = this.sessions.find(s => s.id === sessionId);
        if (!session) {
            LecturerUI.showNotification('Session not found.', 'error');
            return;
        }
        
        if (session.approval_status !== 'pending') {
            LecturerUI.showNotification('Only pending sessions can be cancelled.', 'warning');
            return;
        }
        
        if (!confirm(`Cancel session "${session.session_title}"?`)) return;
        
        try {
            const { error } = await window.db.supabase
                .from('scheduled_sessions')
                .delete()
                .eq('id', sessionId);
            
            if (error) throw error;
            
            LecturerUI.showNotification('✅ Session cancelled!', 'success');
            await this.loadSessions();
            
        } catch (error) {
            LecturerUI.showNotification('Failed to cancel: ' + error.message, 'error');
        }
    },
    
    // Refresh sessions
    async refresh() {
        await this.loadSessions();
        LecturerUI.showNotification('Sessions refreshed!', 'success');
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => LecturerSessions.init(), 700);
});

window.LecturerSessions = LecturerSessions;
