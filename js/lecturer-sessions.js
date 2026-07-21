// js/lecturer-sessions.js
/**
 * NCHSM Lecturer Sessions Module
 * Uses dedicated lecturer database
 */

const LecturerSessions = {
    sessions: [],
    
    async init() {
        console.log('📅 Initializing Lecturer Sessions...');
        await this.loadSessions();
        this.populateSessionForm();
        this.setupEventListeners();
        console.log('✅ Lecturer Sessions initialized');
    },
    
    async loadSessions() {
        try {
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const program = profile?.program || profile?.department;
            const userId = window.lecturerDB?.getCurrentUserId();
            
            if (!program || !userId) {
                console.warn('No program or user ID found');
                return;
            }
            
            // ✅ Use lecturerDB
            this.sessions = await window.lecturerDB.getSessions(userId, program);
            this.renderSessions();
            console.log(`✅ Loaded ${this.sessions.length} sessions`);
            
        } catch (error) {
            console.error('Failed to load sessions:', error);
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Failed to load sessions: ' + error.message, 'error');
            }
        }
    },
    
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
                ? window.LecturerUtils?.formatDate(session.session_date) + (session.session_time ? ' ' + session.session_time : '')
                : 'N/A';
            
            const statusBadge = this.getStatusBadge(session);
            
            return `
                <tr>
                    <td><strong>${window.LecturerUtils?.escapeHtml(session.session_title || 'N/A') || session.session_title || 'N/A'}</strong></td>
                    <td>${dateTime}</td>
                    <td>${window.LecturerUtils?.escapeHtml(session.course_name || 'N/A') || session.course_name || 'N/A'}</td>
                    <td>${window.LecturerUtils?.escapeHtml(session.target_program || 'N/A') || session.target_program || 'N/A'}/${window.LecturerUtils?.escapeHtml(session.block_term || 'N/A') || session.block_term || 'N/A'}</td>
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
    
    generateAttendanceLink(sessionId) {
        const session = this.sessions.find(s => s.id === sessionId);
        if (!session) {
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Session not found.', 'error');
            }
            return;
        }
        
        const link = `${window.location.origin}/attendance?session=${sessionId}`;
        
        navigator.clipboard?.writeText(link).then(() => {
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Attendance link copied to clipboard!', 'success');
            }
        }).catch(() => {
            prompt('Copy this link:', link);
        });
    },
    
    populateSessionForm() {
        const profile = window.lecturerDB?.getCurrentUserProfile();
        const program = profile?.program || profile?.department;
        
        // Program
        const programSelect = document.getElementById('sessionProgram');
        if (programSelect && program) {
            programSelect.innerHTML = `<option value="${program}">${program}</option>`;
        }
        
        // Blocks
        const blocks = window.LecturerUtils?.getAcademicBlocks(program) || ['Introductory', 'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Final'];
        const blockSelect = document.getElementById('sessionBlockTerm');
        if (blockSelect) {
            blockSelect.innerHTML = '<option value="">-- Select Block/Term --</option>' +
                blocks.map(b => `<option value="${b}">${b}</option>`).join('');
        }
        
        // Courses
        this.loadCoursesForForm();
    },
    
    async loadCoursesForForm() {
        try {
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const program = profile?.program || profile?.department;
            
            // ✅ Use lecturerDB
            const courses = await window.lecturerDB.getCourses(program);
            
            const courseSelect = document.getElementById('sessionCourseId');
            if (courseSelect) {
                courseSelect.innerHTML = '<option value="">-- Select Course --</option>' +
                    courses.map(c => 
                        `<option value="${c.id}">${window.LecturerUtils?.escapeHtml(c.course_name) || c.course_name}</option>`
                    ).join('');
            }
            
        } catch (error) {
            console.error('Failed to load courses for form:', error);
        }
    },
    
    setupEventListeners() {
        const form = document.getElementById('addSessionForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleAddSession(e));
        }
        
        const dateInput = document.getElementById('sessionDate');
        if (dateInput) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            dateInput.value = tomorrow.toISOString().split('T')[0];
        }
    },
    
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
        
        if (!formData.title || !formData.date || !formData.program || !formData.block || !formData.course) {
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Please fill all fields.', 'error');
            }
            btn.disabled = false;
            btn.textContent = 'Schedule Session';
            return;
        }
        
        try {
            // ✅ Use lecturerDB
            const result = await window.lecturerDB.createSession(formData);
            
            if (!result.success) {
                throw new Error(result.error);
            }
            
            // Request admin approval
            if (typeof window.requestAdminApproval === 'function') {
                await window.requestAdminApproval(
                    'schedule_session',
                    {
                        session_id: result.data[0]?.id,
                        title: formData.title,
                        date: formData.date,
                        program: formData.program,
                        block: formData.block
                    },
                    'Scheduled session: ' + formData.title,
                    result.data[0]?.id
                );
            }
            
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('✅ Session scheduled! Waiting for admin approval.', 'success');
            }
            e.target.reset();
            await this.loadSessions();
            
        } catch (error) {
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Failed: ' + error.message, 'error');
            }
        } finally {
            btn.disabled = false;
            btn.textContent = 'Schedule Session';
        }
    },
    
    async cancelSession(sessionId) {
        const session = this.sessions.find(s => s.id === sessionId);
        if (!session) {
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Session not found.', 'error');
            }
            return;
        }
        
        if (session.approval_status !== 'pending') {
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Only pending sessions can be cancelled.', 'warning');
            }
            return;
        }
        
        if (!confirm(`Cancel session "${session.session_title}"?`)) return;
        
        try {
            // ✅ Use lecturerDB
            const { error } = await window.lecturerDB.supabase
                .from('scheduled_sessions')
                .delete()
                .eq('id', sessionId);
            
            if (error) throw error;
            
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('✅ Session cancelled!', 'success');
            }
            await this.loadSessions();
            
        } catch (error) {
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Failed to cancel: ' + error.message, 'error');
            }
        }
    },
    
    async refresh() {
        await this.loadSessions();
        if (window.LecturerUI) {
            window.LecturerUI.showNotification('Sessions refreshed!', 'success');
        }
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => LecturerSessions.init(), 700);
});

window.LecturerSessions = LecturerSessions;
