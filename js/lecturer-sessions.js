// js/lecturer-sessions.js - COMPLETE WITH SESSION MANAGEMENT
/**
 * NCHSM Lecturer Sessions Module
 * Uses scheduled_sessions table with correct column names
 * Includes session open/close for student attendance sign-in
 */

const LecturerSessions = {
    sessions: [],
    lecturerAssignmentId: null,
    lecturerUuid: null,
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
                    console.log('✅ Found non-UUID ID:', this.lecturerAssignmentId);
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
    // LOAD ASSIGNED UNITS (for form dropdown)
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
                .eq('lecturer_id', String(lecturerId));
            
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
            const userId = this.lecturerUuid || profile?.user_id;
            
            if (!program || !userId) {
                console.warn('No program or user ID found');
                return;
            }
            
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) {
                console.warn('Supabase not available');
                return;
            }
            
            // ✅ Use correct column: created_by (UUID)
            const { data: sessions, error } = await supabase
                .from('scheduled_sessions')
                .select('*')
                .eq('created_by', userId)
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
                    <td colspan="7" style="padding: 50px 20px; text-align: center; color: #94a3b8;">
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
        
        const statusBadges = {
            'pending': '<span style="background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 500;">⏳ Pending</span>',
            'approved': '<span style="background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 500;">✅ Approved</span>',
            'rejected': '<span style="background: #fee2e2; color: #991b1b; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 500;">❌ Rejected</span>',
            'completed': '<span style="background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 500;">📌 Completed</span>',
            'active': '<span style="background: #10b981; color: #065f46; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 500;">🟢 Active</span>',
            'closed': '<span style="background: #6b7280; color: #1e293b; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 500;">🔒 Closed</span>'
        };
        
        const sessionTypeLabels = {
            'Class': '📚 Class',
            'Clinical': '🏥 Clinical',
            'Lab': '🔬 Lab',
            'Tutorial': '📝 Tutorial',
            'Exam': '📝 Exam'
        };
        
        tbody.innerHTML = sessions.map(session => {
            const sessionDate = session.session_date ? new Date(session.session_date) : null;
            const isToday = sessionDate && sessionDate.toDateString() === today.toDateString();
            const isPast = sessionDate && sessionDate < today;
            const isActive = session.status === 'active' || session.is_active === true;
            
            const dateTime = session.session_date 
                ? (this.formatDate(session.session_date)) + (session.session_time ? ' ' + session.session_time : '')
                : 'N/A';
            
            const status = session.approval_status || 'pending';
            const statusBadge = statusBadges[status] || statusBadges.pending;
            
            const sessionType = session.session_type || 'Class';
            const sessionTypeLabel = sessionTypeLabels[sessionType] || sessionType;
            
            const rowStyle = isActive ? 'background: #d1fae5;' : (isToday ? 'background: #dbeafe;' : '');
            const rowClass = isPast && !isActive ? 'opacity: 0.7;' : '';
            
            // Generate attendance link
            const attendanceLink = `${window.location.origin}/attendance?session=${session.id}`;
            
            // Session control buttons
            let sessionControls = '';
            if (sessionDate && sessionDate >= today) {
                if (!isActive) {
                    sessionControls += `
                        <button onclick="LecturerSessions.openSession('${session.id}')" 
                                style="background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;"
                                onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'">
                            <i class="fas fa-play"></i> Open
                        </button>
                    `;
                } else {
                    sessionControls += `
                        <button onclick="LecturerSessions.closeSession('${session.id}')" 
                                style="background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;"
                                onmouseover="this.style.background='#dc2626'" onmouseout="this.style.background='#ef4444'">
                            <i class="fas fa-stop"></i> Close
                        </button>
                    `;
                }
            }
            
            return `
                <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s; ${rowStyle} ${rowClass}" 
                    onmouseover="this.style.background='${isActive ? '#bfdbfe' : (isToday ? '#bfdbfe' : '#f8fafc')}'" 
                    onmouseout="this.style.background='${isActive ? '#d1fae5' : (isToday ? '#dbeafe' : 'transparent')}'">
                    <td style="padding: 14px 18px; font-weight: 600; color: #1e293b;">
                        ${this.escapeHtml(session.session_title || session.title || 'N/A')}
                        ${isActive ? '<span style="font-size: 10px; background: #10b981; color: white; padding: 2px 8px; border-radius: 10px; margin-left: 8px;">🟢 OPEN</span>' : ''}
                        ${isToday && !isActive ? '<span style="font-size: 10px; background: #4C1D95; color: white; padding: 2px 8px; border-radius: 10px; margin-left: 8px;">TODAY</span>' : ''}
                        ${isPast && !isActive ? '<span style="font-size: 10px; color: #94a3b8; margin-left: 8px;">(Past)</span>' : ''}
                    </td>
                    <td style="padding: 14px 18px; color: #475569;">
                        ${dateTime}
                    </td>
                    <td style="padding: 14px 18px; color: #475569;">
                        ${sessionTypeLabel}
                    </td>
                    <td style="padding: 14px 18px; color: #475569;">
                        ${this.escapeHtml(session.target_program || 'N/A')}/${this.escapeHtml(session.block_term || 'N/A')}
                    </td>
                    <td style="padding: 14px 18px; text-align: center;">
                        <div style="display: flex; gap: 4px; justify-content: center; flex-wrap: wrap;">
                            <button onclick="LecturerSessions.generateAttendanceLink('${session.id}')" 
                                    style="background: #4C1D95; color: white; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 11px; display: inline-flex; align-items: center; gap: 3px;"
                                    onmouseover="this.style.background='#5b21b6'" onmouseout="this.style.background='#4C1D95'">
                                <i class="fas fa-link"></i> Link
                            </button>
                            ${isActive ? `
                                <button onclick="LecturerSessions.viewAttendees('${session.id}')" 
                                        style="background: #8b5cf6; color: white; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 11px; display: inline-flex; align-items: center; gap: 3px;"
                                        onmouseover="this.style.background='#7c3aed'" onmouseout="this.style.background='#8b5cf6'">
                                    <i class="fas fa-users"></i> Attendees
                                </button>
                            ` : ''}
                        </div>
                    </td>
                    <td style="padding: 14px 18px; text-align: center;">
                        ${statusBadge}
                    </td>
                    <td style="padding: 14px 18px; text-align: center;">
                        <div style="display: flex; gap: 6px; justify-content: center; flex-wrap: wrap;">
                            ${sessionControls}
                            ${status === 'pending' ? `
                                <button onclick="LecturerSessions.cancelSession('${session.id}')" 
                                        style="background: #fee2e2; color: #dc2626; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;"
                                        onmouseover="this.style.background='#fecaca'" onmouseout="this.style.background='#fee2e2'">
                                    <i class="fas fa-times"></i> Cancel
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
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
    
    async openSession(sessionId) {
        const session = this.sessions.find(s => s.id === sessionId);
        if (!session) {
            window.showNotification('Session not found.', 'error');
            return;
        }
        
        if (!confirm(`Open "${session.session_title || session.title}" for student attendance?`)) return;
        
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) {
                throw new Error('Database connection not available');
            }
            
            // Update session status to active/open
            const { error } = await supabase
                .from('scheduled_sessions')
                .update({
                    status: 'active',
                    is_active: true,
                    opened_at: new Date().toISOString()
                })
                .eq('id', sessionId);
            
            if (error) throw error;
            
            window.showNotification('✅ Session opened! Students can now sign in.', 'success');
            await this.loadSessions();
            
        } catch (error) {
            console.error('Error opening session:', error);
            window.showNotification('Failed to open session: ' + error.message, 'error');
        }
    },
    
    async closeSession(sessionId) {
        const session = this.sessions.find(s => s.id === sessionId);
        if (!session) {
            window.showNotification('Session not found.', 'error');
            return;
        }
        
        if (!confirm(`Close "${session.session_title || session.title}" and stop attendance?`)) return;
        
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) {
                throw new Error('Database connection not available');
            }
            
            // Update session status to closed
            const { error } = await supabase
                .from('scheduled_sessions')
                .update({
                    status: 'closed',
                    is_active: false,
                    closed_at: new Date().toISOString()
                })
                .eq('id', sessionId);
            
            if (error) throw error;
            
            window.showNotification('✅ Session closed. Attendance sign-in disabled.', 'success');
            await this.loadSessions();
            
        } catch (error) {
            console.error('Error closing session:', error);
            window.showNotification('Failed to close session: ' + error.message, 'error');
        }
    },
    
    async viewAttendees(sessionId) {
        const session = this.sessions.find(s => s.id === sessionId);
        if (!session) {
            window.showNotification('Session not found.', 'error');
            return;
        }
        
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) {
                throw new Error('Database connection not available');
            }
            
            // Get attendance records for this session
            const { data: attendees, error } = await supabase
                .from('geo_attendance_logs')
                .select('*, student:student_id(full_name, student_id)')
                .eq('session_id', sessionId)
                .order('check_in_time', { ascending: false });
            
            if (error) throw error;
            
            if (!attendees || attendees.length === 0) {
                window.showNotification('No students have signed in yet.', 'info');
                return;
            }
            
            // Show attendees in a formatted list
            const attendeeList = attendees.map((a, i) => {
                const name = a.student?.full_name || a.student_name || 'Unknown';
                const time = a.check_in_time ? new Date(a.check_in_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
                return `${i + 1}. ${name} - ${time}`;
            }).join('\n');
            
            alert(`📋 Attendance for: ${session.session_title || session.title}\n\n${attendeeList}\n\nTotal: ${attendees.length} students`);
            
        } catch (error) {
            console.error('Error viewing attendees:', error);
            window.showNotification('Failed to load attendees: ' + error.message, 'error');
        }
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
        
        // Session Types
        const typeSelect = document.getElementById('sessionType');
        if (typeSelect) {
            typeSelect.innerHTML = `
                <option value="Class">📚 Class</option>
                <option value="Clinical">🏥 Clinical</option>
                <option value="Lab">🔬 Lab</option>
                <option value="Tutorial">📝 Tutorial</option>
                <option value="Exam">📝 Exam</option>
            `;
        }
        
        // Units from assigned units
        this.loadUnitsForForm();
        
        // Set default date to tomorrow
        const dateInput = document.getElementById('sessionDate');
        if (dateInput) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            dateInput.value = tomorrow.toISOString().split('T')[0];
        }
    },
    
    loadUnitsForForm() {
        const unitSelect = document.getElementById('sessionUnit');
        if (!unitSelect) return;
        
        const units = this.assignedUnits;
        
        if (units && units.length > 0) {
            unitSelect.innerHTML = '<option value="">-- Select Unit --</option>' +
                units.map(u => 
                    `<option value="${u.subject_name}">${u.subject_code ? u.subject_code + ' - ' : ''}${u.subject_name}</option>`
                ).join('');
        } else {
            unitSelect.innerHTML = '<option value="">-- No units assigned --</option>';
        }
    },
    
    setupEventListeners() {
        const form = document.getElementById('addSessionForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleAddSession(e));
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
            unit: document.getElementById('sessionUnit')?.value,
            type: document.getElementById('sessionType')?.value || 'Class',
            location: document.getElementById('sessionLocation')?.value || 'Lecture Hall'
        };
        
        if (!formData.title || !formData.date || !formData.program || !formData.block || !formData.unit) {
            window.showNotification('Please fill all required fields.', 'error');
            btn.disabled = false;
            btn.innerHTML = originalText;
            return;
        }
        
        try {
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const lecturerUuid = this.lecturerUuid || profile?.user_id;
            const supabase = window.lecturerDB?.supabase;
            
            if (!supabase) {
                throw new Error('Database connection not available');
            }
            
            // ✅ Use correct column names
            const sessionData = {
                session_title: formData.title,
                title: formData.title,
                session_date: formData.date,
                session_time: formData.time || '09:00:00',
                target_program: formData.program,
                program_type: formData.program,
                block_term: formData.block,
                session_type: formData.type,
                location_name: formData.location,
                created_by: lecturerUuid,
                approval_status: 'pending',
                created_at: new Date().toISOString(),
                status: 'scheduled',
                is_active: false
            };
            
            console.log('📤 Creating session with data:', sessionData);
            
            const { data: result, error } = await supabase
                .from('scheduled_sessions')
                .insert([sessionData])
                .select();
            
            if (error) {
                console.error('DB Error:', error);
                throw new Error('Failed to schedule session: ' + error.message);
            }
            
            window.showNotification('✅ Session scheduled successfully!', 'success');
            e.target.reset();
            this.populateSessionForm();
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
        
        if (!confirm(`Cancel session "${session.session_title || session.title}"?`)) return;
        
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
        
        const active = sessions.filter(s => s.status === 'active' || s.is_active === true).length;
        const upcoming = sessions.filter(s => {
            const date = s.session_date ? new Date(s.session_date) : null;
            return date && date >= today && s.approval_status !== 'rejected' && s.status !== 'closed';
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
        
        const activeEl = document.getElementById('activeSessionsStat');
        if (activeEl) activeEl.textContent = active;
        
        const upcomingEl = document.getElementById('upcomingSessionsStat');
        if (upcomingEl) upcomingEl.textContent = upcoming;
        
        const pastEl = document.getElementById('pastSessionsStat');
        if (pastEl) pastEl.textContent = past;
        
        // Badge
        const badge = document.getElementById('sessionsCount');
        if (badge) badge.textContent = upcoming;
        
        // Table count
        const countDisplay = document.getElementById('sessionCountDisplay');
        if (countDisplay) countDisplay.textContent = sessions.length;
    },
    
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
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
window.scheduleSession = (e) => LecturerSessions.handleAddSession(e);
window.generateAttendanceLink = (id) => LecturerSessions.generateAttendanceLink(id);
window.openSession = (id) => LecturerSessions.openSession(id);
window.closeSession = (id) => LecturerSessions.closeSession(id);
window.viewAttendees = (id) => LecturerSessions.viewAttendees(id);

console.log('✅ LecturerSessions module loaded - Session management included');
