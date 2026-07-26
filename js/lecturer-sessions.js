// js/lecturer-sessions.js
/**
 * NCHSM Lecturer Sessions Module
 * Uses dedicated lecturer database with correct ID resolution
 */

const LecturerSessions = {
    sessions: [],
    lecturerAssignmentId: null,
    assignedUnits: [],
    
    async init() {
        console.log('📅 Initializing Lecturer Sessions...');
        await this.resolveLecturerId();
        await this.loadAssignedUnits();
        await this.loadSessions();
        this.populateSessionForm();
        this.setupEventListeners();
        this.updateStats();
        console.log('✅ Lecturer Sessions initialized');
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
    
    async loadSessions() {
        try {
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const program = profile?.program || profile?.department;
            const userId = this.lecturerAssignmentId || profile?.user_id;
            
            if (!program || !userId) {
                console.warn('No program or user ID found');
                return;
            }
            
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) {
                console.warn('Supabase not available');
                return;
            }
            
            // Get sessions from scheduled_sessions
            const { data: sessions, error } = await supabase
                .from('scheduled_sessions')
                .select('*')
                .eq('lecturer_id', userId)
                .order('session_date', { ascending: true });
            
            if (error) {
                console.error('Error loading sessions:', error);
                return;
            }
            
            this.sessions = sessions || [];
            this.renderSessions();
            this.updateStats();
            
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
        
        if (!sessions || sessions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="padding: 50px 20px; text-align: center; color: #94a3b8;">
                        <i class="fas fa-calendar-plus" style="font-size: 48px; display: block; margin-bottom: 15px; color: #e2e8f0;"></i>
                        <h3 style="color: #475569; margin: 0 0 8px 0;">No Sessions Scheduled</h3>
                        <p style="margin: 0; font-size: 14px;">Schedule your first session using the form above.</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        tbody.innerHTML = sessions.map(session => {
            const sessionDate = session.session_date ? new Date(session.session_date) : null;
            const isToday = sessionDate && sessionDate.toDateString() === today.toDateString();
            const isPast = sessionDate && sessionDate < today;
            
            const dateTime = session.session_date 
                ? window.LecturerUtils?.formatDate(session.session_date) + (session.session_time ? ' ' + session.session_time : '')
                : 'N/A';
            
            const statusBadge = this.getStatusBadge(session);
            
            // Row highlight for today
            const rowStyle = isToday ? 'background: #dbeafe;' : '';
            const rowClass = isPast ? 'opacity: 0.7;' : '';
            
            return `
                <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s; ${rowStyle} ${rowClass}" 
                    onmouseover="this.style.background='${isToday ? '#bfdbfe' : '#f8fafc'}'" 
                    onmouseout="this.style.background='${isToday ? '#dbeafe' : 'transparent'}'">
                    <td style="padding: 14px 18px; font-weight: 600; color: #1e293b;">
                        ${this.escapeHtml(session.session_title || 'N/A')}
                        ${isToday ? '<span style="font-size: 10px; background: #4C1D95; color: white; padding: 2px 8px; border-radius: 10px; margin-left: 8px;">TODAY</span>' : ''}
                        ${isPast ? '<span style="font-size: 10px; color: #94a3b8; margin-left: 8px;">(Past)</span>' : ''}
                    </td>
                    <td style="padding: 14px 18px; color: #475569;">
                        ${dateTime}
                    </td>
                    <td style="padding: 14px 18px; color: #475569;">
                        ${this.escapeHtml(session.course_name || session.unit_name || 'N/A')}
                    </td>
                    <td style="padding: 14px 18px; color: #475569;">
                        ${this.escapeHtml(session.target_program || 'N/A')}/${this.escapeHtml(session.block_term || session.block || 'N/A')}
                    </td>
                    <td style="padding: 14px 18px;">
                        <button onclick="LecturerSessions.generateAttendanceLink('${session.id}')" 
                                style="background: #4C1D95; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;"
                                onmouseover="this.style.background='#5b21b6'" onmouseout="this.style.background='#4C1D95'">
                            <i class="fas fa-link"></i> Get Link
                        </button>
                    </td>
                    <td style="padding: 14px 18px; text-align: center;">
                        <div style="display: flex; gap: 6px; justify-content: center; flex-wrap: wrap;">
                            ${statusBadge}
                            ${session.approval_status === 'pending' || !session.approval_status ? 
                                `<button onclick="LecturerSessions.cancelSession('${session.id}')" 
                                        style="background: #fee2e2; color: #dc2626; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;"
                                        onmouseover="this.style.background='#fecaca'" onmouseout="this.style.background='#fee2e2'">
                                    <i class="fas fa-times"></i> Cancel
                                </button>` : ''
                            }
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },
    
    getStatusBadge(session) {
        const status = session.approval_status || 'pending';
        const badges = {
            'pending': '<span style="background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 500;">⏳ Pending</span>',
            'approved': '<span style="background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 500;">✅ Approved</span>',
            'rejected': '<span style="background: #fee2e2; color: #991b1b; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 500;">❌ Rejected</span>',
            'completed': '<span style="background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 500;">📌 Completed</span>'
        };
        return badges[status] || badges.pending;
    },
    
    generateAttendanceLink(sessionId) {
        const session = this.sessions.find(s => s.id === sessionId);
        if (!session) {
            window.showNotification('Session not found.', 'error');
            return;
        }
        
        const link = `${window.location.origin}/attendance?session=${sessionId}`;
        
        navigator.clipboard?.writeText(link).then(() => {
            window.showNotification('✅ Attendance link copied to clipboard!', 'success');
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
        
        // Blocks from assigned units
        const blocks = [...new Set(this.assignedUnits.map(u => u.block).filter(Boolean))];
        const blockSelect = document.getElementById('sessionBlockTerm');
        if (blockSelect) {
            blockSelect.innerHTML = '<option value="">-- Select Block --</option>' +
                blocks.map(b => `<option value="${b}">${b}</option>`).join('');
        }
        
        // Units from assigned units
        this.loadUnitsForForm();
    },
    
    async loadUnitsForForm() {
        try {
            const unitSelect = document.getElementById('sessionUnit');
            if (!unitSelect) return;
            
            // Use assigned units
            const units = this.assignedUnits;
            
            if (units && units.length > 0) {
                unitSelect.innerHTML = '<option value="">-- Select Unit --</option>' +
                    units.map(u => 
                        `<option value="${u.subject_name}">${u.subject_code ? u.subject_code + ' - ' : ''}${u.subject_name}</option>`
                    ).join('');
            } else {
                unitSelect.innerHTML = '<option value="">-- No units assigned --</option>';
            }
            
        } catch (error) {
            console.error('Failed to load units for form:', error);
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
        
        // Block change -> update units
        const blockSelect = document.getElementById('sessionBlockTerm');
        if (blockSelect) {
            blockSelect.addEventListener('change', () => {
                const block = blockSelect.value;
                const unitSelect = document.getElementById('sessionUnit');
                if (unitSelect) {
                    const filtered = this.assignedUnits.filter(u => u.block === block || !block);
                    unitSelect.innerHTML = '<option value="">-- Select Unit --</option>' +
                        filtered.map(u => 
                            `<option value="${u.subject_name}">${u.subject_code ? u.subject_code + ' - ' : ''}${u.subject_name}</option>`
                        ).join('');
                }
            });
        }
    },
    
    async handleAddSession(e) {
        e.preventDefault();
        const btn = e.submitter || e.target.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scheduling...';
        
        const formData = {
            title: document.getElementById('sessionTopic')?.value,
            date: document.getElementById('sessionDate')?.value,
            time: document.getElementById('sessionTime')?.value,
            program: document.getElementById('sessionProgram')?.value,
            block: document.getElementById('sessionBlockTerm')?.value,
            unit: document.getElementById('sessionUnit')?.value
        };
        
        if (!formData.title || !formData.date || !formData.program || !formData.block || !formData.unit) {
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
            
            // Save session
            const { data: result, error } = await supabase
                .from('scheduled_sessions')
                .insert({
                    session_title: formData.title,
                    session_date: formData.date,
                    session_time: formData.time,
                    target_program: formData.program,
                    block_term: formData.block,
                    unit_name: formData.unit,
                    lecturer_id: lecturerId,
                    lecturer_name: profile?.full_name || 'Lecturer',
                    approval_status: 'pending',
                    created_at: new Date().toISOString()
                })
                .select();
            
            if (error) throw error;
            
            window.showNotification('✅ Session scheduled successfully!', 'success');
            e.target.reset();
            
            // Reset date to tomorrow
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            document.getElementById('sessionDate').value = tomorrow.toISOString().split('T')[0];
            
            await this.loadSessions();
            
        } catch (error) {
            console.error('Error scheduling session:', error);
            window.showNotification('Failed to schedule session: ' + error.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    },
    
    async cancelSession(sessionId) {
        const session = this.sessions.find(s => s.id === sessionId);
        if (!session) {
            window.showNotification('Session not found.', 'error');
            return;
        }
        
        if (session.approval_status === 'approved') {
            window.showNotification('Approved sessions cannot be cancelled.', 'warning');
            return;
        }
        
        if (!confirm(`Cancel session "${session.session_title}"?`)) return;
        
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) {
                throw new Error('Database connection not available');
            }
            
            const { error } = await supabase
                .from('scheduled_sessions')
                .delete()
                .eq('id', sessionId);
            
            if (error) throw error;
            
            window.showNotification('✅ Session cancelled!', 'success');
            await this.loadSessions();
            
        } catch (error) {
            console.error('Error cancelling session:', error);
            window.showNotification('Failed to cancel session: ' + error.message, 'error');
        }
    },
    
    updateStats() {
        const sessions = this.sessions;
        const total = sessions.length;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const upcoming = sessions.filter(s => {
            const date = s.session_date ? new Date(s.session_date) : null;
            return date && date >= today && s.approval_status !== 'rejected';
        }).length;
        
        const todaySessions = sessions.filter(s => {
            const date = s.session_date ? new Date(s.session_date) : null;
            return date && date.toDateString() === today.toDateString() && s.approval_status !== 'rejected';
        }).length;
        
        const past = sessions.filter(s => {
            const date = s.session_date ? new Date(s.session_date) : null;
            return date && date < today;
        }).length;
        
        // Update stats cards
        const totalEl = document.getElementById('totalSessionsStat');
        if (totalEl) totalEl.textContent = total;
        
        const upcomingEl = document.getElementById('upcomingSessionsStat');
        if (upcomingEl) upcomingEl.textContent = upcoming;
        
        const todayEl = document.getElementById('todaySessionsStat');
        if (todayEl) todayEl.textContent = todaySessions;
        
        const pastEl = document.getElementById('pastSessionsStat');
        if (pastEl) pastEl.textContent = past;
        
        // Badge
        const badge = document.getElementById('sessionsCount');
        if (badge) badge.textContent = upcoming;
        
        // Table count
        const countDisplay = document.getElementById('sessionCountDisplay');
        if (countDisplay) countDisplay.textContent = sessions.length;
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
        await this.loadSessions();
        this.populateSessionForm();
        this.updateStats();
        window.showNotification('Sessions refreshed!', 'success');
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => LecturerSessions.init(), 700);
});

// Make globally accessible
window.LecturerSessions = LecturerSessions;

console.log('✅ LecturerSessions module loaded - Same ID resolution as other modules');
