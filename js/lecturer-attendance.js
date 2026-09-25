// ============================================================
// NCHSM LECTURER ATTENDANCE MODULE — WITH TVET + STYLED XLSX
// ============================================================

const LecturerAttendance = {
    todayLogs: [],
    pastLogs: [],
    filteredTodayLogs: [],
    filteredPastLogs: [],
    assignedUnits: [],
    lecturerAssignmentId: null,
    lecturerUuid: null,
    mapInstance: null,
    currentLocation: null,
    isProcessing: false,
    isTVET: false,
    currentProgram: 'KRCHN',
    stats: { total: 0, present: 0, absent: 0, pending: 0, rate: 0 },

    // Session occurrence state. Each scheduled attendance occurrence has its
    // own UUID; attendance is always resolved against that exact session_id.
    sessions: [],
    selectedSessionId: null,
    selectedSession: null,
    sessionRegister: null,

    // ============================================================
    // PROGRAM TYPE DETECTION
    // ============================================================
    getProgramType() { return window.CURRENT_PROGRAM_TYPE || 'KRCHN'; },
    isTVETProgram() { return this.getProgramType() === 'TVET'; },
    getProgramTypeLabel() { return this.isTVETProgram() ? '🔧 TVET' : '🎓 Nursing'; },
    getProgramEmoji() { return this.isTVETProgram() ? '🔧' : '🎓'; },
    getPassingThreshold() { return this.isTVETProgram() ? 50 : 60; },

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

    // ============================================================
    // INIT
    // ============================================================
    async init() {
        console.log('📋 Initializing Lecturer Attendance Module...');
        this.currentProgram = this.getProgramType();
        this.isTVET = this.isTVETProgram();
        console.log(`📚 Program Type: ${this.getProgramTypeLabel()}`);

        try {
            await this.resolveLecturerId();
            await this.loadAssignedUnits();
            await this.loadAttendanceSessions();
            await this.loadAllAttendance();
            this.setupEventListeners();
            this.populateFilters();
            this.updateProgramBadge();

            console.log('✅ Lecturer Attendance Module initialized successfully');

            setInterval(() => {
                this.loadAllAttendance().then(() => this.applyFilters());
            }, 60000);

        } catch (error) {
            console.error('❌ Failed to initialize attendance module:', error);
            this.showError('Failed to initialize: ' + error.message);
        }
    },

    // ============================================================
    // PROGRAM BADGE
    // ============================================================
    updateProgramBadge() {
        const typeLabel = this.getProgramTypeLabel();
        const emoji = this.getProgramEmoji();
        const threshold = this.getPassingThreshold();

        const programDisplay = document.getElementById('programDisplayName');
        if (programDisplay) programDisplay.textContent = `${this.currentProgram} (${typeLabel})`;

        const programTypeBadge = document.getElementById('programTypeBadge');
        if (programTypeBadge) {
            programTypeBadge.textContent = typeLabel;
            programTypeBadge.style.background = this.isTVET ? 'rgba(139,92,246,0.3)' : 'rgba(76,29,149,0.3)';
            programTypeBadge.style.color = this.isTVET ? '#7c3aed' : '#1e40af';
        }

        const blockDisplay = document.getElementById('currentBlockDisplay');
        if (blockDisplay) {
            const blocks = [...new Set(this.assignedUnits.map(u => u.block).filter(Boolean))];
            if (blocks.length > 0) blockDisplay.textContent = this.getBlockDisplay(blocks[0]);
        }

        const rateBadge = document.getElementById('attendanceRateBadge');
        if (rateBadge) rateBadge.textContent = `${this.stats.rate || 0}% (Pass: ≥${threshold}%)`;

        const subtitle = document.querySelector('#attendance-content .subtitle');
        if (subtitle) subtitle.textContent = `${emoji} ${typeLabel} - Track and manage student attendance`;
    },

    // ============================================================
    // RESOLVE LECTURER ID
    // ============================================================
    async resolveLecturerId() {
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) return;
            const profile = window.lecturerDB?.getCurrentUserProfile();
            if (!profile) return;

            const authId = profile.user_id;
            const fullName = profile.full_name;
            this.lecturerUuid = authId;

            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(authId));
            if (!isUUID && authId) { this.lecturerAssignmentId = authId; return; }

            const { data: assignments } = await supabase
                .from('lecturer_subject_assignments')
                .select('lecturer_id, lecturer_name')
                .ilike('lecturer_name', `%${fullName}%`);

            if (assignments?.length > 0) {
                const textId = assignments.find(a => a.lecturer_id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(a.lecturer_id)));
                this.lecturerAssignmentId = textId ? textId.lecturer_id : assignments[0].lecturer_id;
                return;
            }
            this.lecturerAssignmentId = authId;
        } catch (error) {
            console.error('❌ resolveLecturerId:', error);
            this.lecturerAssignmentId = null;
            this.lecturerUuid = null;
        }
    },

    // ============================================================
    // LOAD ASSIGNED UNITS
    // ============================================================
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

            if (error) { console.error('❌ loadAssignedUnits:', error); return; }

            this.assignedUnits = assignments || [];

            // Keep the lecturer's assigned block(s) available to every
            // session/roster operation. Sessions created before target_block
            // was introduced can still resolve their block from this table.
            this.assignedBlocks = [...new Set(this.assignedUnits.map(u => String(u.block || '').trim()).filter(Boolean))];

            this.populateUnitSelectors();
            this.populateUnitFilter();
            this.updateProgramBadge();

            console.log('📚 Assigned units:', this.assignedUnits);
            console.log('📚 Assigned blocks:', this.assignedBlocks);
        } catch (error) {
            console.error('❌ loadAssignedUnits fail:', error);
        }
    },

    // ============================================================
    // POPULATE UNIT SELECTORS
    // ============================================================
    populateUnitSelectors() {
        const unitSelect = document.getElementById('attUnit');
        if (!unitSelect) return;

        // IMPORTANT: this dropdown must contain ONLY units explicitly
        // assigned to the currently logged-in lecturer. Attendance history
        // is never used to add unassigned units here.
        const seen = new Map();
        (Array.isArray(this.assignedUnits) ? this.assignedUnits : []).forEach(u => {
            const name = String(u?.subject_name || '').trim();
            if (!name) return;
            const key = this.normalizeFilterValue(name);
            if (!seen.has(key)) seen.set(key, u);
        });
        const units = [...seen.values()].sort((a, b) =>
            String(a.subject_name || '').localeCompare(String(b.subject_name || ''))
        );

        const typeLabel = this.getProgramTypeLabel();
        const emoji = this.getProgramEmoji();

        if (units.length > 0) {
            unitSelect.innerHTML = `<option value="">-- ${emoji} Select Assigned Unit --</option>` +
                units.map(u => {
                    const blockDisplay = this.getBlockDisplay(u.block);
                    const code = u.subject_code ? `${this.escapeHtml(u.subject_code)} - ` : '';
                    const name = this.escapeHtml(u.subject_name);
                    const block = u.block ? ` (${this.escapeHtml(blockDisplay)})` : '';
                    return `<option value="${name}">${code}${name}${block}${this.isTVET ? ' 🔧' : ''}</option>`;
                }).join('');
        } else {
            unitSelect.innerHTML = `<option value="">-- No ${typeLabel} units assigned --</option>`;
        }
    },

    // ============================================================
    // LOCAL DATE / OCCURRENCE HELPERS
    // ============================================================
    getNairobiDateString(value = new Date()) {
        const d = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(d.getTime())) return '';
        return new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit'
        }).format(d);
    },

    getNairobiDayBounds(dateString) {
        const date = String(dateString || this.getNairobiDateString()).trim();
        // Kenya is UTC+3 and has no DST. Convert the selected local day to UTC.
        const start = new Date(`${date}T00:00:00+03:00`);
        const end = new Date(`${date}T23:59:59.999+03:00`);
        return { start: start.toISOString(), end: end.toISOString() };
    },

    formatAttendanceDate(value) {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return 'N/A';
        return new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Africa/Nairobi', day: '2-digit', month: 'short', year: 'numeric'
        }).format(d);
    },

    formatAttendanceTime(value) {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return 'N/A';
        return new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Africa/Nairobi', hour: '2-digit', minute: '2-digit'
        }).format(d);
    },

    // ============================================================
    // ATTENDANCE NORMALIZATION / FILTER HELPERS
    // ============================================================
    normalizeFilterValue(value) {
        return String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
    },

    attendanceRecordKey(log) {
        const student = String(log?.user_id || log?.student_id || log?.registration_number || log?.student_name || '').trim().toLowerCase();
        const session = String(log?.session_id || '').trim().toLowerCase();
        const occurrenceDate = this.getAttendanceDate(log);
        if (student && session) return `${student}|${session}|${occurrenceDate}`;
        return String(log?.id || `${student}|${occurrenceDate}|${log?.check_in_time || ''}`).trim().toLowerCase();
    },

    attendanceStatusRank(log) {
        const status = this.normalizeFilterValue(log?.attendance_status);
        if (log?.is_verified === true || status === 'verified' || status === 'present') return 5;
        if (status === 'late') return 4;
        if (status === 'pending' || !status) return 3;
        if (status === 'absent') return 2;
        return 1;
    },

    dedupeAttendanceLogs(logs) {
        const map = new Map();
        for (const log of (Array.isArray(logs) ? logs : [])) {
            const key = this.attendanceRecordKey(log);
            const existing = map.get(key);
            if (!existing || this.attendanceStatusRank(log) > this.attendanceStatusRank(existing) ||
                (this.attendanceStatusRank(log) === this.attendanceStatusRank(existing) && String(log.check_in_time || '') > String(existing.check_in_time || ''))) {
                map.set(key, log);
            }
        }
        return Array.from(map.values());
    },

    getAttendanceDate(log) {
        const raw = log?.check_in_time || log?.attendance_date || log?.session_date || log?.created_at;
        if (!raw) return '';
        return this.getNairobiDateString(raw);
    },

    // ============================================================
    // SESSION OCCURRENCE MANAGEMENT
    // ============================================================
    async loadAttendanceSessions() {
        const supabase = window.lecturerDB?.supabase;
        if (!supabase || !this.lecturerUuid) return [];

        try {
            const today = this.getNairobiDateString();
            const { data, error } = await supabase
                .from('scheduled_sessions')
                .select('*')
                .eq('created_by', this.lecturerUuid)
                .eq('target_program', this.currentProgram || 'KRCHN')
                .gte('session_date', this.getNairobiDayBounds(today).start)
                .lte('session_date', this.getNairobiDayBounds(today).end)
                .order('session_date', { ascending: false })
                .order('session_time', { ascending: false });

            if (error) throw error;
            this.sessions = data || [];

            // Keep an externally selected session when the lecturer sessions
            // module has already selected one. Otherwise use the active/opened
            // occurrence, then the most recently scheduled occurrence.
            const externalId = window.LecturerSessions?.selectedSessionId ||
                window.LecturerSessions?.currentSessionId || null;
            const preferredId = externalId || this.selectedSessionId;
            let selected = preferredId
                ? this.sessions.find(s => String(s.id) === String(preferredId))
                : null;

            if (!selected) {
                selected = this.sessions.find(s =>
                    s.is_active === true || String(s.status || '').toLowerCase() === 'active'
                ) || this.sessions.find(s => s.opened_at && !s.closed_at) || this.sessions[0] || null;
            }

            this.selectedSession = selected || null;
            this.selectedSessionId = selected?.id || null;
            return this.sessions;
        } catch (error) {
            console.error('❌ loadAttendanceSessions:', error);
            return [];
        }
    },

    async setAttendanceSession(sessionId, refresh = true) {
        if (!sessionId) {
            this.selectedSessionId = null;
            this.selectedSession = null;
            this.sessionRegister = null;
            if (refresh) await this.loadAllAttendance();
            return null;
        }

        const id = String(sessionId);
        let session = (this.sessions || []).find(s => String(s.id) === id);

        if (!session) {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) throw new Error('Database connection not available');
            const { data, error } = await supabase
                .from('scheduled_sessions')
                .select('*')
                .eq('id', sessionId)
                .maybeSingle();
            if (error) throw error;
            session = data;
        }

        if (!session) throw new Error('Attendance session not found');
        this.selectedSession = session;
        this.selectedSessionId = session.id;
        if (refresh) await this.loadAllAttendance();
        return session;
    },

    getSelectedSession() {
        return this.selectedSession ||
            (this.sessions || []).find(s => String(s.id) === String(this.selectedSessionId)) ||
            null;
    },

    getSessionDateTime(session) {
        if (!session) return null;
        const date = this.getNairobiDateString(session.session_date || new Date());
        const time = String(session.session_time || '00:00:00').slice(0, 8);
        const d = new Date(`${date}T${time}+03:00`);
        return Number.isNaN(d.getTime()) ? new Date(session.session_date || Date.now()) : d;
    },

    sessionRegisterToLogs(register, session) {
        if (!register?.rows) return [];
        return register.rows.map(row => {
            const student = row.student || {};
            const log = row.log ? { ...row.log } : {};
            const sessionDate = this.getSessionDateTime(session);
            const fallbackTime = sessionDate ? sessionDate.toISOString() : null;
            return {
                ...log,
                id: log.id || null,
                session_id: session?.id || null,
                student_id: log.student_id || student.student_id || student.user_id,
                user_id: log.user_id || student.user_id,
                registration_number: log.registration_number || student.registration_number || student.student_id || student.user_id,
                student_name: log.student_name || student.name || 'Unknown Student',
                program: log.program || student.program || session?.target_program || this.currentProgram,
                block: log.block || student.block || session?.target_block || session?.block_term || session?.block || null,
                intake_year: log.intake_year || student.intake_year || session?.intake_year || null,
                unit_name: log.unit_name || session?.unit_name || session?.course_name || session?.session_title || session?.title || 'General',
                target_name: log.target_name || session?.session_title || session?.title || 'Class',
                session_type: log.session_type || session?.session_type || 'Class',
                attendance_status: row.status === 'Not Checked In' ? 'Pending' : row.status,
                check_in_time: log.check_in_time || fallbackTime,
                created_at: log.created_at || fallbackTime,
                verification_source: log.verification_source || (row.status === 'Absent' ? 'Automatic Session Finalization' : null),
                finalization_reason: log.finalization_reason || (row.status === 'Absent' ? 'No check-in recorded before session close' : null)
            };
        });
    },

    // ============================================================
    // LOAD ALL
    // ============================================================
    async loadAllAttendance() {
        try {
            await Promise.all([
                this.loadTodayAttendance(),
                this.loadPastAttendance(),
                this.loadAttendanceStats(),
                this.loadProgramInfo()
            ]);
        } catch (error) {
            console.error('❌ loadAllAttendance:', error);
        }
    },

    // ============================================================
    // LOAD TODAY
    // ============================================================
    async loadTodayAttendance() {
        const tbody = document.getElementById('attendanceTable');
        if (!tbody) return;
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) {
                tbody.innerHTML = '<tr><td colspan="10" style="padding:30px;text-align:center;color:#ef4444;">Database not available</td></tr>';
                return;
            }

            const session = this.getSelectedSession();
            if (session) {
                const register = await this.getSessionAttendanceRegister(session, false);
                this.sessionRegister = register;
                this.todayLogs = this.sessionRegisterToLogs(register, session);
                this.filteredTodayLogs = [...this.todayLogs];
                this.renderTodayAttendance();
                this.updateRegisterStats(register);
                this.updateProgramBadge();
                return;
            }

            // No scheduled occurrence is selected: do not mix unrelated
            // attendance rows from other classes into the lecturer's register.
            this.todayLogs = [];
            this.filteredTodayLogs = [];
            this.sessionRegister = null;
            tbody.innerHTML = `<tr><td colspan="10" style="padding:40px;text-align:center;color:#94a3b8;">
                <i class="fas fa-calendar-check" style="font-size:32px;display:block;margin-bottom:10px;color:#cbd5e1;"></i>
                <p style="margin:0;font-weight:600;">No scheduled attendance session selected.</p>
                <p style="margin:6px 0 0;">Schedule/open a session first, then select that occurrence.</p></td></tr>`;
            this.updateStats([]);
            this.updateProgramBadge();
        } catch (error) {
            console.error('❌ loadTodayAttendance:', error);
            tbody.innerHTML = `<tr><td colspan="10" style="padding:30px;text-align:center;color:#ef4444;">Error: ${this.escapeHtml(error.message)}</td></tr>`;
        }
    },

    // ============================================================
    // RENDER TODAY
    // ============================================================
    renderTodayAttendance() {
        const tbody = document.getElementById('attendanceTable');
        if (!tbody) return;
        const logs = Array.isArray(this.todayLogs) ? this.todayLogs : [];
        const typeLabel = this.getProgramTypeLabel();
        const countEl = document.getElementById('todayLogCount');
        if (countEl) countEl.textContent = `${logs.length} records`;

        if (!logs.length) {
            tbody.innerHTML = `<tr><td colspan="9" style="padding:40px;text-align:center;color:#94a3b8;">
                <i class="fas fa-calendar-day" style="font-size:32px;display:block;margin-bottom:10px;color:#e2e8f0;"></i>
                <p style="margin:0;">No student attendance records in the selected range. (${typeLabel})</p></td></tr>`;
            return;
        }

        const statusColors = { Present: '#10b981', Absent: '#ef4444', Pending: '#f59e0b', Late: '#f59e0b', Excused: '#3b82f6', Verified: '#10b981' };
        const isTVET = this.isTVET;

        tbody.innerHTML = logs.map(log => {
            const hasLocation = log.latitude != null && log.longitude != null;
            const isVerified = log.is_verified === true || log.is_verified === 'true' || log.is_verified === 1 || log.attendance_status === 'Verified';
            let displayStatus = log.attendance_status || 'Pending';
            if (isVerified && displayStatus !== 'Absent') displayStatus = 'Verified';
            const statusColor = statusColors[displayStatus] || '#6b7280';
            const studentName = log.student_name || 'Unknown Student';
            const regNumber = String(log.registration_number || log.student_id || 'N/A');
            const programDisplay = log.program || 'N/A';
            const blockDisplay = log.block ? this.getBlockDisplay(log.block) : 'N/A';
            const unitDisplay = log.unit_name || log.target_name || 'General';
            const isAutomaticAbsence = String(log.verification_source || '').toLowerCase() === 'automatic session finalization' && String(log.finalization_reason || '').toLowerCase().includes('no check-in');
            const isLecturerCheckin = log.session_type === 'Lecturer Check-in';
            const locationDisplay = isAutomaticAbsence ? 'No location' : (isLecturerCheckin ? 'Lecturer Check-in' : (log.location_address || log.location_friendly_name || log.location_name || 'N/A'));
            const canVerify = !!log.id && !isLecturerCheckin && log.role !== 'lecturer' && !isVerified;
            const verifiedByDisplay = log.verified_by_name ? `by ${log.verified_by_name}` : '';
            const studentMeta = `${this.escapeHtml(regNumber)} · ${this.escapeHtml(programDisplay)}`;
            const actionName = this.escapeHtml(studentName).replace(/'/g, '&#39;');

            return `
                <tr style="border-bottom:1px solid #f1f5f9; ${isVerified ? 'background:#f0fdf4;' : ''} ${isLecturerCheckin ? 'background:#f0fdf4;' : ''}">
                    <td style="padding:10px 14px;color:#475569;font-size:12px;white-space:nowrap;">${this.escapeHtml(this.formatAttendanceDate(log.check_in_time || log.created_at))}</td>
                    <td style="padding:10px 14px;min-width:220px;">
                        <div style="font-weight:700;color:#1e293b;font-size:13px;line-height:1.35;">${this.escapeHtml(studentName)} ${isLecturerCheckin ? '<span style="font-size:10px;background:#10b981;color:white;padding:1px 7px;border-radius:10px;">👨‍🏫</span>' : ''}</div>
                        <div style="font-size:11px;color:#4C1D95;font-weight:600;margin-top:3px;">${studentMeta}</div>
                        ${isVerified && !isLecturerCheckin ? '<span style="font-size:9px;background:#10b981;color:white;padding:1px 7px;border-radius:10px;display:inline-block;margin-top:4px;">✓ Verified</span>' : ''}
                        ${isTVET && !isLecturerCheckin ? '<span style="font-size:9px;color:#8b5cf6;margin-left:4px;">TVET</span>' : ''}
                    </td>
                    <td style="padding:10px 14px;color:#475569;font-size:13px;">${this.escapeHtml(blockDisplay)}</td>
                    <td style="padding:10px 14px;color:#475569;font-size:13px;max-width:220px;">${this.escapeHtml(unitDisplay)}</td>
                    <td style="padding:10px 14px;"><span style="background:${isLecturerCheckin ? '#d1fae5' : '#dbeafe'};color:${isLecturerCheckin ? '#065f46' : '#1e40af'};padding:2px 10px;border-radius:12px;font-size:11px;white-space:nowrap;">${this.escapeHtml(log.session_type || 'Class')}</span></td>
                    <td style="padding:10px 14px;color:#475569;font-size:13px;white-space:nowrap;">${isAutomaticAbsence ? 'No check-in' : this.escapeHtml(this.formatAttendanceTime(log.check_in_time || log.created_at))}</td>
                    <td style="padding:10px 14px;color:#475569;font-size:12px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${this.escapeHtml(locationDisplay)}</td>
                    <td style="padding:10px 14px;text-align:center;">
                        <span style="background:${isVerified ? '#10b98120' : statusColor + '20'};color:${isVerified ? '#10b981' : statusColor};padding:3px 12px;border-radius:12px;font-size:11px;font-weight:600;display:inline-block;">${isVerified ? '✅ Verified' : this.escapeHtml(displayStatus)}</span>
                        ${verifiedByDisplay ? `<span style="font-size:9px;color:#64748b;display:block;margin-top:2px;">${this.escapeHtml(verifiedByDisplay)}</span>` : ''}
                        ${isAutomaticAbsence ? '<span style="font-size:9px;color:#64748b;display:block;margin-top:2px;">Automatic finalization</span>' : ''}
                    </td>
                    <td style="padding:10px 14px;text-align:center;">
                        <div style="display:flex;gap:4px;justify-content:center;flex-wrap:wrap;">
                            ${!isLecturerCheckin && log.id ? `<button onclick="LecturerAttendance.setAttendanceStatus('${String(log.id).replace(/'/g, "\'")}', 'Present')" data-attendance-action-id="${this.escapeHtml(String(log.id || ''))}" title="Mark Present" style="background:${String(displayStatus).toLowerCase().includes('present') || isVerified ? '#059669' : '#10b981'};color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:10px;font-weight:600;"><i class="fas fa-check"></i> Present</button>
                            <button onclick="LecturerAttendance.setAttendanceStatus('${String(log.id).replace(/'/g, "\'")}', 'Absent')" data-attendance-action-id="${this.escapeHtml(String(log.id || ''))}" title="Mark Absent" style="background:${String(displayStatus).toLowerCase() === 'absent' ? '#b91c1c' : '#ef4444'};color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:10px;font-weight:600;"><i class="fas fa-user-slash"></i> Absent</button>` : (!isLecturerCheckin ? '<span style="color:#94a3b8;font-size:10px;">Awaiting check-in</span>' : '')}
                            ${hasLocation && !isLecturerCheckin ? `<button onclick="LecturerAttendance.viewAttendanceMap(${Number(log.latitude)},${Number(log.longitude)},'${actionName}')" title="View location" style="background:#4C1D95;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px;"><i class="fas fa-map-marker-alt"></i></button>` : `<span style="color:#94a3b8;font-size:11px;">${isLecturerCheckin ? '✓' : 'No location'}</span>`}
                            ${canVerify ? `<button onclick="LecturerAttendance.verifyAttendance('${String(log.id).replace(/'/g, "\\'")}')" data-verify-id="${this.escapeHtml(String(log.id || ''))}" title="Verify" style="background:#8b5cf6;color:white;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:10px;"><i class="fas fa-check-double"></i> Verify</button>` : ''}
                            ${!isLecturerCheckin && log.id ? `<button onclick="LecturerAttendance.deleteAttendanceRecord('${String(log.id).replace(/'/g, "\\'")}')" data-delete-id="${this.escapeHtml(String(log.id || ''))}" title="Delete attendance record" style="background:#dc2626;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:10px;font-weight:600;"><i class="fas fa-trash-alt"></i> Delete</button>` : ''}
                        </div>
                    </td>
                </tr>`;
        }).join('');
    },

    // ============================================================
    // UPDATE STATS
    // ============================================================
    updateStats(logs) {
        const rows = Array.isArray(logs) ? logs : [];
        const total = rows.length;
        const present = rows.filter(l => {
            const s = String(l.attendance_status || '').toLowerCase();
            return s === 'present' || s === 'verified' || l.is_verified === true;
        }).length;
        const absent = rows.filter(l => String(l.attendance_status || '').toLowerCase() === 'absent').length;
        const pending = Math.max(0, total - present - absent);
        const rate = total ? Math.round((present / total) * 100) : 0;
        this.stats = { total, present, absent, pending, rate };

        const map = {
            todayTotal: total, todayPresent: present, todayAbsent: absent, todayPending: pending,
            todayRate: `${rate}%`, attendanceRate: `${rate}%`, filteredCount: total,
            totalStudentsCount: total, presentTodayCount: present, absentTodayCount: absent,
            pendingCount: pending, todayTotalDisplay: total, todayPresentDisplay: present,
            todayAbsentDisplay: absent, todayPendingDisplay: pending, attendanceRateDisplay: `${rate}%`
        };
        Object.entries(map).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        });
        return this.stats;
    },

    // ============================================================
    // LOAD PAST
    // ============================================================
    async loadPastAttendance() {
        // IMPORTANT: the current lecturer page uses the main #attendanceTable
        // for the filtered date-range view and may not contain a separate
        // #pastAttendanceTable element. Do NOT abort historical loading just
        // because that optional table is absent.
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) return;
            const todayStr = this.getNairobiDateString();
            const pageSize = 1000;
            const all = [];
            let from = 0;

            // Load historical records in pages so a busy class cannot hide older
            // attendance (the previous hard limit of 100 caused this problem).
            while (true) {
                const { data: page, error } = await supabase
                    .from('geo_attendance_logs')
                    .select('*')
                    .lt('check_in_time', this.getNairobiDayBounds(todayStr).start)
                    .order('check_in_time', { ascending: false })
                    .range(from, from + pageSize - 1);

                if (error) throw error;
                const rows = page || [];
                all.push(...rows);
                if (rows.length < pageSize) break;
                from += pageSize;
            }

            this.pastLogs = this.dedupeAttendanceLogs(all);
            this.filteredPastLogs = [...this.pastLogs];

            console.info(`📚 Historical attendance loaded: ${this.pastLogs.length} records`);

            // Render only when the optional historical table exists. The main
            // date-range table is rendered by applyFilters() after both today
            // and historical data have loaded.
            if (document.getElementById('pastAttendanceTable')) {
                this.renderPastAttendance();
            }
        } catch (error) {
            console.error('❌ loadPastAttendance:', error);
        }
    },

    // ============================================================
    // RENDER PAST
    // ============================================================
    renderPastAttendance() {
        const tbody = document.getElementById('pastAttendanceTable');
        if (!tbody) return;
        const logs = this.pastLogs;
        const typeLabel = this.getProgramTypeLabel();

        const countEl = document.getElementById('pastLogCount');
        if (countEl) countEl.textContent = `${logs.length} records`;

        if (!logs?.length) {
            tbody.innerHTML = `<tr><td colspan="9" style="padding:40px;text-align:center;color:#94a3b8;">
                <i class="fas fa-history" style="font-size:32px;display:block;margin-bottom:10px;color:#e2e8f0;"></i>
                <p style="margin:0;">No past attendance records found. (${typeLabel})</p></td></tr>`;
            return;
        }

        const statusColors = { Present: '#10b981', Absent: '#ef4444', Pending: '#f59e0b', Late: '#f59e0b', Excused: '#3b82f6', Verified: '#10b981' };
        const isTVET = this.isTVET;

        tbody.innerHTML = logs.map(log => {
            const hasLocation = log.latitude && log.longitude;
            const isVerified = log.is_verified === true || log.is_verified === 'true' || log.is_verified === 1 || log.attendance_status === 'Verified' || (log.attendance_status === 'Present' && log.verified_at !== null);
            let displayStatus = log.attendance_status || 'Pending';
            if (isVerified && displayStatus !== 'Absent') displayStatus = 'Verified ✓';
            const statusColor = statusColors[displayStatus] || '#6b7280';
            const date = log.check_in_time ? new Date(log.check_in_time) : new Date();
            const studentName = log.student_name || 'Unknown Student';
            const regNumber = log.registration_number || log.student_id || 'N/A';
            const displayReg = regNumber.length > 15 ? regNumber.substring(0, 15) + '...' : regNumber;
            const blockDisplay = log.block ? this.getBlockDisplay(log.block) : 'N/A';
            const isLecturerCheckin = log.session_type === 'Lecturer Check-in';
            const locationDisplay = isLecturerCheckin ? 'Lecturer Check-in' : (log.location_address || log.location_friendly_name || log.location_name || 'N/A');
            const canVerify = !!log.id && !isLecturerCheckin && log.role !== 'lecturer' && !isVerified;
            const verifiedByDisplay = log.verified_by_name ? `by ${log.verified_by_name}` : '';

            return `
                <tr style="border-bottom: 1px solid #f1f5f9; ${isVerified || isLecturerCheckin ? 'background: #f0fdf4;' : ''}">
                    <td style="padding: 10px 14px; color: #475569; font-size: 12px;">${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td style="padding: 10px 14px; font-weight: 500; color: #1e293b; font-size: 13px;">
                        ${this.escapeHtml(studentName)}
                        ${isVerified && !isLecturerCheckin ? ' <span style="font-size:10px;background:#10b981;color:white;padding:1px 8px;border-radius:10px;">✓</span>' : ''}
                        ${isTVET && !isLecturerCheckin ? ' <span style="font-size:9px;color:#8b5cf6;padding:1px 6px;border-radius:8px;">TVET</span>' : ''}
                    </td>
                    <td style="padding: 10px 14px; font-weight: 600; color: #4C1D95; font-size: 12px;">${this.escapeHtml(displayReg)}</td>
                    <td style="padding: 10px 14px; color: #475569; font-size: 13px;">${this.escapeHtml(blockDisplay)}</td>
                    <td style="padding: 10px 14px; color: #475569; font-size: 13px;">${this.escapeHtml(log.unit_name || log.target_name || 'General')}</td>
                    <td style="padding: 10px 14px;"><span style="background: ${isLecturerCheckin ? '#d1fae5' : '#dbeafe'}; color: ${isLecturerCheckin ? '#065f46' : '#1e40af'}; padding: 2px 10px; border-radius: 12px; font-size: 11px;">${this.escapeHtml(log.session_type || 'Class')}</span></td>
                    <td style="padding: 10px 14px; color: #475569; font-size: 13px;">${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td style="padding: 10px 14px; color: #475569; font-size: 12px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${this.escapeHtml(locationDisplay)}</td>
                    <td style="padding: 10px 14px; text-align: center;">
                        <span style="background: ${isVerified ? '#10b98120' : statusColor + '20'}; color: ${isVerified ? '#10b981' : statusColor}; padding: 3px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; display: inline-block;">${isVerified ? '✅ Verified' : displayStatus}</span>
                        ${isVerified && verifiedByDisplay ? `<span style="font-size: 9px; color: #64748b; display: block; margin-top: 2px;">${verifiedByDisplay}</span>` : ''}
                    </td>
                    <td style="padding: 10px 14px; text-align: center;">
                        <div style="display: flex; gap: 4px; justify-content: center; flex-wrap: wrap;">
                            ${!isLecturerCheckin ? `<button onclick="LecturerAttendance.setAttendanceStatus('${String(log.id).replace(/'/g, "\'")}', 'Present')" data-attendance-action-id="${this.escapeHtml(String(log.id || ''))}" title="Mark Present" style="background:${String(displayStatus).toLowerCase().includes('present') || isVerified ? '#059669' : '#10b981'};color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:10px;font-weight:600;"><i class="fas fa-check"></i> Present</button>
                            <button onclick="LecturerAttendance.setAttendanceStatus('${String(log.id).replace(/'/g, "\'")}', 'Absent')" data-attendance-action-id="${this.escapeHtml(String(log.id || ''))}" title="Mark Absent" style="background:${String(displayStatus).toLowerCase() === 'absent' ? '#b91c1c' : '#ef4444'};color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:10px;font-weight:600;"><i class="fas fa-user-slash"></i> Absent</button>` : ''}
                            ${hasLocation && !isLecturerCheckin ? `<button onclick="LecturerAttendance.viewAttendanceMap(${Number(log.latitude)}, ${Number(log.longitude)}, '${this.escapeHtml(studentName)}')" style="background: #4C1D95; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;"><i class="fas fa-map-marker-alt" style="font-size:10px;"></i></button>` : `<span style="color: #94a3b8; font-size: 11px;">${isLecturerCheckin ? '✓' : 'No location'}</span>`}
                            ${canVerify ? `<button onclick="LecturerAttendance.verifyAttendance('${String(log.id).replace(/'/g, "\'")}')" data-verify-id="${this.escapeHtml(String(log.id || ''))}" style="background: #8b5cf6; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 10px;"><i class="fas fa-check-double" style="font-size:10px;"></i> Verify</button>` : ''}
                        </div>
                    </td>
                </tr>`;
        }).join('');
    },

    // ============================================================
    // LOAD STATS
    // ============================================================
    async loadAttendanceStats() {
        try {
            const session = this.getSelectedSession();
            if (session) {
                const register = this.sessionRegister || await this.getSessionAttendanceRegister(session, false);
                this.sessionRegister = register;
                this.updateRegisterStats(register);
                return;
            }
        } catch (error) {
            console.warn('⚠️ Session-based attendance stats unavailable:', error);
        }

        this.updateStats([]);
    },

    updateRegisterStats(register) {
        const summary = register?.summary || {};
        const total = Number(summary.total || 0);
        const present = Number(summary.present || 0);
        const absent = Number(summary.absent || 0);
        const pending = Number(summary.pending || 0);
        const rate = total ? Math.round((present / total) * 100) : 0;

        this.stats = { total, present, absent, pending, rate };
        const elementMap = {
            todayTotal: total, todayPresent: present, todayAbsent: absent, todayPending: pending,
            todayRate: rate + '%', attendanceRate: rate + '%', filteredCount: total,
            totalStudentsCount: total, presentTodayCount: present, absentTodayCount: absent,
            pendingCount: pending, todayTotalDisplay: total, todayPresentDisplay: present,
            todayAbsentDisplay: absent, todayPendingDisplay: pending, attendanceRateDisplay: rate + '%'
        };
        for (const [id, value] of Object.entries(elementMap)) {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        }
        const progressBar = document.getElementById('attendanceProgressBar');
        if (progressBar) progressBar.style.width = rate + '%';
        const rateBadge = document.getElementById('attendanceRateBadge');
        if (rateBadge) rateBadge.textContent = `${rate}% (Class: ${total} students)`;
    },

    // ============================================================
    // LOAD PROGRAM INFO
    // ============================================================
    async loadProgramInfo() {
        try {
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const program = this.currentProgram || profile?.program || profile?.department;
            if (!program) return;
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) return;

            const { count: studentCount } = await supabase
                .from('consolidated_user_profiles_table')
                .select('*', { count: 'exact', head: true })
                .eq('program', program)
                .in('role', ['student', 'Student']);

            const blocks = [...new Set(this.assignedUnits.map(u => String(u.block || '').trim()).filter(Boolean))];
            const currentBlockRaw = blocks.length > 0 ? blocks[0] : null;
            const currentBlock = currentBlockRaw ? this.getBlockDisplay(currentBlockRaw) : 'N/A';

            // Count the actual class assigned to this lecturer, not the whole program.
            let classCount = 0;
            if (currentBlockRaw) {
                const result = await supabase
                    .from('consolidated_user_profiles_table')
                    .select('*', { count: 'exact', head: true })
                    .eq('program', program)
                    .eq('block', currentBlockRaw)
                    .in('role', ['student', 'Student', 'STUDENT']);
                if (!result.error) classCount = Number(result.count || 0);
                else console.warn('⚠️ Block roster count failed:', result.error.message);
            } else {
                classCount = Number(studentCount || 0);
            }

            this.currentAssignedBlock = currentBlockRaw;
            this.classStudentCount = classCount;

            const programDisplay = window.LecturerUtils?.getProgramDisplayName?.(program) || program;
            const typeLabel = this.getProgramTypeLabel();
            const emoji = this.getProgramEmoji();

            const displayMap = {
                'programDisplayName': `${emoji} ${programDisplay}`,
                'programTypeBadge': typeLabel,
                'currentBlockDisplay': currentBlock,
                'studentCountDisplay': classCount + ' Students'
            };

            for (const [id, value] of Object.entries(displayMap)) {
                const el = document.getElementById(id);
                if (el) el.textContent = value;
            }
        } catch (error) {
            console.error('❌ loadProgramInfo:', error);
        }
    },

    // ============================================================
    // MAP
    // ============================================================
    viewAttendanceMap(lat, lng, name) {
        if (!lat || !lng) { this.showNotification('No location data available.', 'warning'); return; }
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);
        if (isNaN(latNum) || isNaN(lngNum)) { this.showNotification('Invalid location data.', 'warning'); return; }

        this.currentLocation = { lat: latNum, lng: lngNum, name };
        const modal = document.getElementById('attendanceMapModal');
        if (modal) modal.style.display = 'flex';

        const infoEl = document.getElementById('mapLocationInfo');
        const textEl = document.getElementById('mapLocationText');
        if (infoEl && textEl) {
            infoEl.style.display = 'block';
            textEl.textContent = `📍 ${name} - Latitude: ${latNum.toFixed(6)}, Longitude: ${lngNum.toFixed(6)}`;
        }
        setTimeout(() => this.initMap(latNum, lngNum, name), 300);
    },

    initMap(lat, lng, name) {
        const container = document.getElementById('mapContainer');
        if (!container) return;
        if (this.mapInstance) { this.mapInstance.remove(); this.mapInstance = null; }

        if (typeof L === 'undefined') {
            container.innerHTML = `<div style="padding:20px;text-align:center;color:#94a3b8;">Map library not loaded.</div>`;
            return;
        }

        try {
            const accentColor = this.isTVET ? '#8b5cf6' : '#4C1D95';
            this.mapInstance = L.map(container).setView([lat, lng], 16);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(this.mapInstance);
            L.marker([lat, lng]).addTo(this.mapInstance).bindPopup(`<b>${this.escapeHtml(name)}</b>`).openPopup();
            L.circle([lat, lng], { radius: 50, color: accentColor, fillColor: accentColor, fillOpacity: 0.1, weight: 2 }).addTo(this.mapInstance);
            setTimeout(() => { if (this.mapInstance) this.mapInstance.invalidateSize(); }, 400);
        } catch (error) {
            console.error('❌ initMap:', error);
        }
    },

    // ============================================================
    // LECTURER CHECK-IN
    // ============================================================
    async lecturerCheckIn() {
        if (this.isProcessing) { this.showNotification('Please wait...', 'warning'); return; }
        const btn = document.getElementById('lecturerCheckinBtn');
        const statusEl = document.getElementById('lecturerCheckinStatus');
        if (!btn) return;

        this.isProcessing = true;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Getting location...';

        if (!navigator.geolocation) {
            this.showNotification('Geolocation not supported.', 'error');
            btn.disabled = false; btn.innerHTML = '<i class="fas fa-check-circle"></i> Mark My Attendance';
            this.isProcessing = false; return;
        }

        navigator.geolocation.getCurrentPosition(async (position) => {
            try {
                const supabase = window.lecturerDB?.supabase;
                const profile = window.lecturerDB?.getCurrentUserProfile();
                const userId = profile?.user_id || this.lecturerUuid;
                if (!supabase || !userId) throw new Error('Database or user not available');

                const today = this.getNairobiDateString();
                const { data: existing } = await supabase
                    .from('geo_attendance_logs')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('session_type', 'Lecturer Check-in')
                    .gte('check_in_time', `${today}T00:00:00.000Z`)
                    .lte('check_in_time', `${today}T23:59:59.999Z`)
                    .limit(1);

                if (existing?.length > 0) {
                    this.showNotification('✅ You have already checked in today!', 'success');
                    btn.disabled = false; btn.innerHTML = '<i class="fas fa-check-circle"></i> Mark My Attendance';
                    this.isProcessing = false; return;
                }

                const program = this.currentProgram || profile?.program || 'KRCHN';
                const programType = this.getProgramTypeLabel();

                const { error: insertError } = await supabase.from('geo_attendance_logs').insert({
                    student_id: userId, user_id: userId,
                    registration_number: profile?.staff_id || 'LECTURER',
                    student_name: profile?.full_name || 'Lecturer',
                    check_in_time: new Date().toISOString(),
                    session_type: 'Lecturer Check-in',
                    latitude: position.coords.latitude, longitude: position.coords.longitude,
                    accuracy_m: position.coords.accuracy || null,
                    attendance_status: 'Present', is_verified: true,
                    target_name: 'Lecturer Check-in', location_address: 'Lecturer Check-in',
                    program, block: profile?.block || 'Staff', role: 'lecturer',
                    program_type: programType, is_tvet: this.isTVET,
                    created_at: new Date().toISOString()
                });

                if (insertError) throw new Error(insertError.message);

                this.showNotification(`✅ Lecturer check-in logged!`, 'success');
                await this.loadTodayAttendance();
                await this.loadAttendanceStats();
            } catch (error) {
                console.error('❌ lecturerCheckIn:', error);
                this.showNotification('Check-in failed: ' + error.message, 'error');
            } finally {
                btn.disabled = false; btn.innerHTML = '<i class="fas fa-check-circle"></i> Mark My Attendance';
                this.isProcessing = false;
            }
        }, (error) => {
            this.showNotification('Geolocation error.', 'error');
            btn.disabled = false; btn.innerHTML = '<i class="fas fa-check-circle"></i> Mark My Attendance';
            this.isProcessing = false;
        }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
    },

    // ============================================================
    // MANUAL MARK
    // ============================================================
    async markStudentAttendance(e) {
        if (e) e.preventDefault();
        if (this.isProcessing) return;

        const form = document.getElementById('manualAttendanceForm');
        const btn = form?.querySelector('button[type="submit"]');
        const originalText = btn?.innerHTML || 'Mark Student Present';
        if (!form || !btn) return;

        this.isProcessing = true;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Marking...';

        try {
            const studentId = document.getElementById('attStudentId')?.value;
            const sessionType = document.getElementById('attSessionType')?.value;
            const unit = document.getElementById('attUnit')?.value;
            const location = document.getElementById('attLocation')?.value;
            const date = document.getElementById('attDate')?.value;
            const time = document.getElementById('attTime')?.value;

            if (!studentId || !sessionType || !date) throw new Error('Please fill all required fields');

            const supabase = window.lecturerDB?.supabase;
            const profile = window.lecturerDB?.getCurrentUserProfile();
            if (!supabase || !profile) throw new Error('Database not available');

            const { data: student } = await supabase
                .from('consolidated_user_profiles_table')
                .select('full_name, program, block, intake_year, student_id')
                .eq('user_id', studentId)
                .maybeSingle();

            if (!student) throw new Error('Student not found');

            const checkInTime = time ? `${date}T${time}:00.000Z` : `${date}T12:00:00.000Z`;

            // Manual attendance must belong to ONE exact scheduled occurrence.
            // Never silently attach it to an arbitrary session when several
            // occurrences exist on the same date/unit/block.
            let matchedSession = this.getSelectedSession();
            if (matchedSession) {
                const selectedDate = this.getNairobiDateString(matchedSession.session_date);
                const selectedUnit = this.normalizeFilterValue(matchedSession.unit_name || matchedSession.course_name || matchedSession.session_title || matchedSession.title);
                if (selectedDate !== date || (unit && selectedUnit !== this.normalizeFilterValue(unit))) {
                    throw new Error('The selected attendance session does not match the manual attendance date/unit. Select the correct session occurrence first.');
                }
            } else {
                const manualProgram = student.program || profile.program || this.currentProgram || 'KRCHN';
                const manualBlock = student.block || this.getAssignedBlockForUnit(unit);
                const dayStart = this.getNairobiDayBounds(date).start;
                const dayEnd = this.getNairobiDayBounds(date).end;
                const { data: candidateSessions, error: sessionLookupError } = await supabase
                    .from('scheduled_sessions')
                    .select('*')
                    .eq('target_program', manualProgram)
                    .eq('unit_name', unit)
                    .gte('session_date', dayStart)
                    .lte('session_date', dayEnd)
                    .order('session_time', { ascending: false });
                if (sessionLookupError) throw new Error('Unable to locate scheduled session: ' + sessionLookupError.message);

                const matches = (candidateSessions || []).filter(s => {
                    const sessionBlock = s.target_block || s.block_term || s.block || this.getAssignedBlockForUnit(s.unit_name);
                    return !manualBlock || String(sessionBlock || '').trim().toLowerCase() === String(manualBlock).trim().toLowerCase();
                });
                matchedSession = matches.find(s => s.is_active === true || String(s.status || '').toLowerCase() === 'active') || matches[0];
            }

            if (!matchedSession?.id) {
                throw new Error('No scheduled attendance session found for this date, unit and block. Schedule/open the session first.');
            }

            // Strict duplicate protection: one student can have only one
            // effective attendance record for this exact session UUID.
            const { data: existingSessionLogs, error: duplicateLookupError } = await supabase
                .from('geo_attendance_logs')
                .select('id,user_id,student_id,registration_number,attendance_status,is_verified')
                .eq('session_id', matchedSession.id)
                .neq('role', 'lecturer');
            if (duplicateLookupError) throw duplicateLookupError;

            const studentKeys = new Set([studentId, student.student_id].filter(Boolean).map(v => String(v).trim()));
            const duplicate = (existingSessionLogs || []).find(log =>
                [log.user_id, log.student_id, log.registration_number]
                    .filter(Boolean).some(v => studentKeys.has(String(v).trim()))
            );
            if (duplicate) {
                throw new Error(`${student.full_name || 'This student'} already has an attendance record for this session.`);
            }

            const { error: insertError } = await supabase.from('geo_attendance_logs').insert({
                session_id: matchedSession.id,
                student_id: student.student_id || studentId,
                user_id: studentId,
                registration_number: student.student_id || studentId,
                student_name: student.full_name || 'Student',
                check_in_time: checkInTime,
                session_type: sessionType,
                target_name: unit || 'General', unit_name: unit || 'General',
                attendance_status: 'Present', is_verified: true, is_manual_entry: true,
                location_friendly_name: location || 'Manual Entry',
                location_address: `MANUAL: ${location || 'N/A'} (By ${profile.full_name || 'Lecturer'})`,
                program: student.program || profile.program || 'KRCHN',
                block: student.block || profile.block,
                block_display: student.block ? this.getBlockDisplay(student.block) : 'N/A',
                intake_year: student.intake_year || profile.intake_year,
                role: 'student', recorded_by_id: profile.user_id,
                recorded_by_name: profile.full_name || 'Lecturer',
                program_type: this.getProgramTypeLabel(),
                is_tvet: this.isTVET,
                created_at: new Date().toISOString()
            });

            if (insertError) throw new Error(insertError.message);

            this.showNotification(`✅ ${student.full_name} marked present!`, 'success');
            form.reset();
            document.getElementById('attDate').value = this.getNairobiDateString();

            await this.loadTodayAttendance();
            await this.loadAttendanceStats();
        } catch (error) {
            console.error('❌ markStudentAttendance:', error);
            this.showNotification('Failed: ' + error.message, 'error');
        } finally {
            btn.disabled = false; btn.innerHTML = originalText;
            this.isProcessing = false;
        }
    },

    // ============================================================
    // POPULATE FILTERS
    // ============================================================
    populateFilters() {
        const today = this.getNairobiDateString();
        const filterDateFrom = document.getElementById('filterDateFrom');
        const filterDateTo = document.getElementById('filterDateTo');
        if (filterDateFrom) filterDateFrom.value = today;
        if (filterDateTo) filterDateTo.value = today;
        const filterDate = document.getElementById('filterDate');
        if (filterDate) filterDate.value = today;
        const attDate = document.getElementById('attDate');
        if (attDate) attDate.value = today;

        this.populateStudentSelect();
        this.populateBlockFilter();
        this.populateUnitFilter();
        this.populateYearFilter();
        this.updateFilterLabels();
    },

    populateUnitFilter() {
        const select = document.getElementById('filterUnit');
        if (!select) return;

        // The lecturer should only be able to filter/select units that are
        // actually assigned to them. Do NOT add arbitrary units from
        // historical attendance records.
        const values = new Map();
        (Array.isArray(this.assignedUnits) ? this.assignedUnits : []).forEach(u => {
            const name = String(u?.subject_name || '').trim();
            if (!name) return;
            values.set(this.normalizeFilterValue(name), name);
        });

        const current = select.value || 'All';
        select.innerHTML = '<option value="All">All Assigned Units</option>' +
            [...values.values()]
                .sort((a, b) => a.localeCompare(b))
                .map(v => `<option value="${this.escapeHtml(v)}">${this.escapeHtml(v)}</option>`)
                .join('');

        if ([...select.options].some(o => o.value === current)) {
            select.value = current;
        } else {
            select.value = 'All';
        }
    },

    populateYearFilter() {
        const select = document.getElementById('filterYear');
        if (!select) return;
        const years = new Set();
        [...(this.assignedUnits || [])].forEach(u => { if (u.academic_year != null) years.add(String(u.academic_year).trim()); });
        [...(this.todayLogs || []), ...(this.pastLogs || [])].forEach(l => { if (l.intake_year != null && String(l.intake_year).trim()) years.add(String(l.intake_year).trim()); });
        const current = select.value || 'All';
        select.innerHTML = '<option value="All">All Years</option>' +
            [...years].sort((a,b)=>String(b).localeCompare(String(a), undefined, {numeric:true})).map(v => `<option value="${this.escapeHtml(v)}">${this.escapeHtml(v)}</option>`).join('');
        if ([...select.options].some(o => o.value === current)) select.value = current;
    },

    populateBlockFilter() {
        const blockFilter = document.getElementById('filterBlock');
        if (!blockFilter) return;
        const blocks = [...new Set(this.assignedUnits.map(u => u.block).filter(Boolean))];
        blockFilter.innerHTML = '<option value="All">All Blocks/Terms</option>';
        blocks.forEach(block => {
            const option = document.createElement('option');
            option.value = block;
            option.textContent = this.getBlockDisplay(block);
            blockFilter.appendChild(option);
        });
        const label = document.getElementById('blockFilterLabel');
        if (label) label.innerHTML = `<i class="fas fa-layer-group" style="color: #4C1D95; width: 18px;"></i> ${this.isTVET ? 'Term' : 'Block'}`;
    },

    updateFilterLabels() {
        const typeLabel = this.getProgramTypeLabel();
        const filterCount = document.getElementById('attendanceFilterCount');
        if (filterCount) filterCount.textContent = `Showing all ${typeLabel} records`;

        const dateDisplay = document.getElementById('attendanceDateDisplay');
        if (dateDisplay) {
            const today = new Date();
            dateDisplay.textContent = `${today.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} (${typeLabel})`;
        }
    },

    async populateStudentSelect() {
        try {
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const program = this.currentProgram || profile?.program;
            const supabase = window.lecturerDB?.supabase;
            if (!supabase || !program) return;

            const { data: students } = await supabase
                .from('consolidated_user_profiles_table')
                .select('user_id, full_name, student_id, block')
                .eq('program', program)
                .in('role', ['student', 'Student'])
                .order('full_name');

            const select = document.getElementById('attStudentId');
            if (select && students) {
                select.innerHTML = `<option value="">-- Select ${this.getProgramTypeLabel()} Student --</option>`;
                students.forEach(s => {
                    const option = document.createElement('option');
                    option.value = s.user_id;
                    option.textContent = `${s.full_name} (${s.student_id || 'N/A'})`;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('❌ populateStudentSelect:', error);
        }
    },

    // ============================================================
    // APPLY / RESET FILTERS — DATE RANGE COMPATIBLE
    // ============================================================
    applyFilters() {
        const from = (document.getElementById('filterDateFrom')?.value || '').trim();
        const to = (document.getElementById('filterDateTo')?.value || '').trim();
        const legacyDate = (document.getElementById('filterDate')?.value || '').trim();
        const filterBlock = (document.getElementById('filterBlock')?.value || 'All').trim();
        const filterUnit = (document.getElementById('filterUnit')?.value || 'All').trim();
        const filterYear = (document.getElementById('filterYear')?.value || 'All').trim();
        const filterSessionType = (document.getElementById('filterSessionType')?.value || 'All').trim();
        const searchText = (document.getElementById('filterSearch')?.value || '').trim().toLowerCase();

        const rangeFrom = from || legacyDate || '';
        const rangeTo = to || legacyDate || '';
        this.populateUnitFilter();
        this.populateYearFilter();

        /*
         * IMPORTANT: The date filter is the source of truth for the table.
         * A selected session is used to supply the complete current-session
         * roster, but it must NEVER hide historical attendance when the
         * lecturer selects yesterday, 7 days, 30 days, a month, or all dates.
         *
         * Today/current session + historical logs are therefore combined first,
         * then the requested filters are applied. The session UUID remains on
         * each row, so different occurrences are never merged by date alone.
         */
        const selectedSession = this.getSelectedSession();
        const sessionLogs = selectedSession
            ? this.sessionRegisterToLogs(
                this.sessionRegister || { rows: [] },
                selectedSession
              )
            : [];

        const combined = [
            ...(this.pastLogs || []),
            ...(selectedSession ? sessionLogs : (this.todayLogs || []))
        ];

        const allLogs = this.dedupeAttendanceLogs(combined);

        const filtered = allLogs.filter(log => {
            /* For finalized absences check_in_time may intentionally be null.
             * Fall back to the session occurrence date so historical filtering
             * still places the absence on the correct teaching day. */
            const date = this.getAttendanceDate(log);
            const unit = String(log.unit_name || log.target_name || '').trim();
            const block = String(log.block || '').trim();
            const year = String(log.intake_year || '').trim();
            const type = String(log.session_type || 'Class').trim();

            if (rangeFrom && (!date || date < rangeFrom)) return false;
            if (rangeTo && (!date || date > rangeTo)) return false;
            if (filterBlock !== 'All' && this.normalizeFilterValue(block) !== this.normalizeFilterValue(filterBlock)) return false;
            if (filterUnit !== 'All' && this.normalizeFilterValue(unit) !== this.normalizeFilterValue(filterUnit)) return false;
            if (filterYear !== 'All' && this.normalizeFilterValue(year) !== this.normalizeFilterValue(filterYear)) return false;
            if (filterSessionType !== 'All' && this.normalizeFilterValue(type) !== this.normalizeFilterValue(filterSessionType)) return false;
            if (searchText) {
                const h = [log.student_name, log.student_id, log.registration_number, unit, log.target_name, type, block, log.program]
                    .filter(Boolean).join(' ').toLowerCase();
                if (!h.includes(searchText)) return false;
            }
            return true;
        });

        filtered.sort((a, b) => {
            const da = this.getAttendanceDate(a);
            const db = this.getAttendanceDate(b);
            if (db !== da) return String(db).localeCompare(String(da));
            return String(b.check_in_time || b.created_at || '').localeCompare(String(a.check_in_time || a.created_at || ''));
        });

        this.filteredTodayLogs = filtered;
        this.filteredPastLogs = filtered.filter(log => this.getAttendanceDate(log) !== this.getNairobiDateString());

        // The main dashboard table is the filtered table. Do not require a
        // separate past table in order to display historical records.
        this.renderFilteredToday(filtered);
        if (document.getElementById('pastAttendanceTable')) this.renderFilteredPast(this.filteredPastLogs);
        this.updateStats(filtered);

        const countEl = document.getElementById('filteredCount');
        if (countEl) countEl.textContent = String(filtered.length);
        const logCount = document.getElementById('todayLogCount');
        if (logCount) logCount.textContent = `${filtered.length} records`;
        const filterCount = document.getElementById('attendanceFilterCount');
        if (filterCount) filterCount.textContent = `Showing ${filtered.length} records · ${rangeFrom ? (rangeTo && rangeTo !== rangeFrom ? `${rangeFrom} → ${rangeTo}` : rangeFrom) : 'all dates'}`;

        const dateDisplay = document.getElementById('attendanceDateDisplay');
        if (dateDisplay) {
            if (!rangeFrom && !rangeTo) dateDisplay.textContent = `All dates (${this.getProgramTypeLabel()})`;
            else if (rangeFrom && rangeTo && rangeFrom !== rangeTo) dateDisplay.textContent = `${rangeFrom} → ${rangeTo}`;
            else dateDisplay.textContent = `${rangeFrom || rangeTo} (${this.getProgramTypeLabel()})`;
        }

        return filtered;
    },

    renderFilteredToday(logs = []) {
        const original = this.todayLogs;
        this.todayLogs = Array.isArray(logs) ? logs : [];
        try {
            this.renderTodayAttendance();
        } finally {
            this.todayLogs = original;
        }
    },

    renderFilteredPast(logs = []) {
        const original = this.pastLogs;
        this.pastLogs = Array.isArray(logs) ? logs : [];
        try {
            this.renderPastAttendance();
        } finally {
            this.pastLogs = original;
        }
    },

    // ============================================================
    // DATE RANGE PRESETS — matches current lecturer dashboard HTML
    // today / 7d / 30d / month / all
    // ============================================================
    setRangePreset(preset) {
        const fromEl = document.getElementById('filterDateFrom');
        const toEl = document.getElementById('filterDateTo');
        const legacyEl = document.getElementById('filterDate');
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const formatDate = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
        const value = String(preset || 'today').toLowerCase().trim();
        let from = new Date(now), to = new Date(now);

        switch (value) {
            case 'today': break;
            case '7d': case '7days': from.setDate(from.getDate() - 6); break;
            case '30d': case '30days': from.setDate(from.getDate() - 29); break;
            case 'month': case 'thismonth': case 'this_month': from = new Date(now.getFullYear(), now.getMonth(), 1); break;
            case 'all': case 'alltime': case 'all_time': from = null; to = null; break;
            case 'yesterday': from.setDate(from.getDate()-1); to = new Date(from); break;
            default:
                if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                    const parsed = new Date(`${value}T00:00:00`);
                    if (!Number.isNaN(parsed.getTime())) { from = parsed; to = new Date(parsed); }
                }
        }

        if (fromEl) fromEl.value = from ? formatDate(from) : '';
        if (toEl) toEl.value = to ? formatDate(to) : '';
        if (legacyEl) legacyEl.value = from ? formatDate(from) : '';
        this.applyFilters();

        const display = document.getElementById('attendanceDateDisplay');
        if (display) {
            if (!from && !to) display.textContent = `All dates (${this.getProgramTypeLabel()})`;
            else if (from && to && formatDate(from) !== formatDate(to)) display.textContent = `${from.toLocaleDateString('en-GB',{day:'numeric',month:'short'})} – ${to.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}`;
            else if (from) display.textContent = `${from.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})} (${this.getProgramTypeLabel()})`;
        }
    },

    resetFilters() {
        const now = new Date();
        const today = this.getNairobiDateString();
        const fromEl = document.getElementById('filterDateFrom'); if (fromEl) fromEl.value = today;
        const toEl = document.getElementById('filterDateTo'); if (toEl) toEl.value = today;
        const legacyEl = document.getElementById('filterDate'); if (legacyEl) legacyEl.value = today;
        const fBlock = document.getElementById('filterBlock'); if (fBlock) fBlock.value = 'All';
        const fUnit = document.getElementById('filterUnit'); if (fUnit) fUnit.value = 'All';
        const fYear = document.getElementById('filterYear'); if (fYear) fYear.value = 'All';
        const fType = document.getElementById('filterSessionType'); if (fType) fType.value = 'All';
        const fSearch = document.getElementById('filterSearch'); if (fSearch) fSearch.value = '';
        this.applyFilters();
        this.showNotification('Filters reset!', 'info');
    },

    // ============================================================
    // ✅ MODERN STYLED XLSX EXPORT (ExcelJS)
    // ============================================================
    async exportCSV() {
        if (typeof ExcelJS === 'undefined') {
            this.showNotification('Excel library still loading — try again in a moment.', 'warning');
            return;
        }

        // Read ALL active filters. These variables are intentionally declared
        // here because the workbook header/filename below uses them too.
        const filterDate = (document.getElementById('filterDate')?.value || '').trim();
        const filterDateFrom = (document.getElementById('filterDateFrom')?.value || '').trim();
        const filterDateTo = (document.getElementById('filterDateTo')?.value || '').trim();
        const filterBlock = (document.getElementById('filterBlock')?.value || 'All').trim();
        const filterUnit = (document.getElementById('filterUnit')?.value || 'All').trim();
        const filterYear = (document.getElementById('filterYear')?.value || 'All').trim();
        const filterSessionType = (document.getElementById('filterSessionType')?.value || 'All').trim();
        const searchText = (document.getElementById('filterSearch')?.value || '').trim();
        const hasFilters = Boolean(
            filterDate || filterDateFrom || filterDateTo ||
            filterBlock !== 'All' || filterUnit !== 'All' ||
            filterYear !== 'All' || filterSessionType !== 'All' || searchText
        );

        // IMPORTANT: export exactly what applyFilters() displays.
        // The old version reloaded the selected session after applying filters,
        // which meant a past-date filter could still export today's session.
        const filteredLogs = this.applyFilters();
        const source = this.dedupeAttendanceLogs(
            (filteredLogs || []).filter(l => l.session_type !== 'Lecturer Check-in')
        );

        if (!source.length) {
            this.showNotification(
                hasFilters ? 'No records match the current filters.' : 'No attendance data to export.',
                'warning'
            );
            return;
        }

        const typeLabel = this.getProgramTypeLabel();

        // ---- 3. GROUP ----
        const groups = {};
        source.forEach(log => {
            const block = (log.block || 'N/A').trim();
            const intake = String(log.intake_year || 'N/A');
            const unit = (log.unit_name || log.target_name || 'General').trim();
            const program = (log.program || 'KRCHN').trim();
            const sessionType = (log.session_type || 'Class').trim();
            const key = `${block}|${intake}|${program}|${unit}|${sessionType}`.toLowerCase();

            if (!groups[key]) groups[key] = {
                block, blockDisplay: this.getBlockDisplay(block),
                intake, program, unit, sessionType, logs: []
            };
            groups[key].logs.push(log);
        });

        const classList = Object.values(groups).sort((a, b) => {
            const c1 = String(a.block).localeCompare(String(b.block), undefined, { numeric: true });
            if (c1) return c1;
            return a.unit.localeCompare(b.unit);
        });

        // ---- 4. COLORS ----
        const PURPLE = 'FF4F46E5';
        const PURPLE_LIGHT = 'FFEEF2FF';
        const GREEN = 'FF10B981';
        const GREEN_LIGHT = 'FFD1FAE5';
        const RED = 'FFEF4444';
        const RED_LIGHT = 'FFFEE2E2';
        const AMBER = 'FFF59E0B';
        const AMBER_LIGHT = 'FFFEF3C7';
        const GREY = 'FF94A3B8';
        const GREY_LIGHT = 'FFF1F5F9';
        const DARK = 'FF0F172A';
        const BORDER = 'FFE2E8F0';

        const wb = new ExcelJS.Workbook();
        wb.creator = 'NCHSM';
        wb.created = new Date();

        // ============================================================
        // WORKBOOK SUMMARY SHEET
        // ============================================================
        const summaryWs = wb.addWorksheet('SUMMARY', {
            pageSetup: {
                paperSize: 9,
                orientation: 'landscape',
                fitToPage: true,
                fitToWidth: 1,
                fitToHeight: 0,
                margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 }
            }
        });

        const SUMMARY_PURPLE = 'FF4F46E5';
        const SUMMARY_PURPLE_LIGHT = 'FFEEF2FF';
        const SUMMARY_GREEN_LIGHT = 'FFD1FAE5';
        const SUMMARY_RED_LIGHT = 'FFFEE2E2';
        const SUMMARY_AMBER_LIGHT = 'FFFEF3C7';
        const SUMMARY_DARK = 'FF0F172A';
        const SUMMARY_GREY = 'FF64748B';
        const SUMMARY_BORDER = 'FFE2E8F0';
        const summaryCols = 12;

        const summaryMerge = (row, value, opts = {}) => {
            summaryWs.mergeCells(row, 1, row, summaryCols);
            const cell = summaryWs.getCell(row, 1);
            cell.value = value;
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            if (opts.fill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.fill } };
            if (opts.font) cell.font = opts.font;
            if (opts.height) summaryWs.getRow(row).height = opts.height;
        };

        let sr = 1;
        summaryMerge(sr++, 'NAKURU COLLEGE OF HEALTH SCIENCES AND MANAGEMENT', {
            fill: SUMMARY_PURPLE,
            font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 16 },
            height: 34
        });
        summaryMerge(sr++, 'DEPARTMENT OF NURSING — ATTENDANCE SUMMARY', {
            fill: SUMMARY_PURPLE_LIGHT,
            font: { bold: true, color: { argb: SUMMARY_PURPLE }, size: 13 },
            height: 24
        });
        summaryMerge(sr++, `${this.currentProgram || 'Nursing'} | Generated: ${new Date().toLocaleString('en-GB')}`, {
            font: { color: { argb: SUMMARY_DARK }, size: 11 },
            height: 22
        });

        sr++;
        const summaryHeaders = [
            'S/NO', 'CLASS / BLOCK', 'INTAKE', 'PROGRAM', 'UNIT', 'SESSION TYPE',
            'STUDENTS', 'PRESENT', 'ABSENT', 'PENDING', 'ATTENDANCE %', 'ABSENCE %'
        ];
        summaryHeaders.forEach((value, i) => {
            const cell = summaryWs.getCell(sr, i + 1);
            cell.value = value;
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SUMMARY_PURPLE } };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.border = {
                top: { style: 'thin', color: { argb: SUMMARY_BORDER } },
                bottom: { style: 'thin', color: { argb: SUMMARY_BORDER } },
                left: { style: 'thin', color: { argb: SUMMARY_BORDER } },
                right: { style: 'thin', color: { argb: SUMMARY_BORDER } }
            };
        });
        summaryWs.getRow(sr).height = 30;
        const summaryHeaderRow = sr;
        sr++;

        const summaryRows = [];

        // Summary is based on the same class/unit groups that are exported.
        classList.forEach((cls, index) => {
            const studentMap = {};
            cls.logs.forEach(log => {
                const reg = String(log.registration_number || log.student_id || log.student_name || 'N/A').trim();
                if (!studentMap[reg]) studentMap[reg] = {};
                const iso = this.getNairobiDateString(
                    log.check_in_time || selectedSession?.session_date || log.created_at
                );
                if (!iso) return;

                const status = String(log.attendance_status || '').toLowerCase();
                const verified = log.is_verified === true || status === 'present' || status === 'verified';
                let mark = '-';
                if (verified) mark = '✓';
                else if (status === 'absent') mark = 'A';
                else if (status === 'pending' || status === '') mark = 'P';

                const rank = { '✓': 4, 'P': 3, 'A': 2, '-': 0 };
                if (!studentMap[reg][iso] || rank[mark] > rank[studentMap[reg][iso]]) {
                    studentMap[reg][iso] = mark;
                }
            });

            const students = Object.values(studentMap);
            const dates = [...new Set(cls.logs.map(l =>
                this.getNairobiDateString(l.check_in_time || selectedSession?.session_date || l.created_at) || null
            ).filter(Boolean))];

            const totalStudents = students.length;
            const totalSessions = dates.length || 1;
            const possible = totalStudents * totalSessions;

            let present = 0, absent = 0, pending = 0;
            students.forEach(student => dates.forEach(date => {
                const mark = student[date] || '-';
                if (mark === '✓') present++;
                else if (mark === 'A') absent++;
                else pending++;
            }));

            const attendanceRate = possible ? Math.round((present / possible) * 100) : 0;
            const absenceRate = possible ? Math.round((absent / possible) * 100) : 0;

            summaryRows.push([
                index + 1, cls.blockDisplay, cls.intake, cls.program, cls.unit,
                cls.sessionType, totalStudents, present, absent, pending,
                `${attendanceRate}%`, `${absenceRate}%`
            ]);
        });

        summaryRows.forEach(values => {
            values.forEach((value, i) => {
                const cell = summaryWs.getCell(sr, i + 1);
                cell.value = value;
                cell.alignment = { horizontal: i >= 6 ? 'center' : 'left', vertical: 'middle', wrapText: true };
                cell.font = { size: 10, color: { argb: SUMMARY_DARK } };
                cell.border = {
                    top: { style: 'thin', color: { argb: SUMMARY_BORDER } },
                    bottom: { style: 'thin', color: { argb: SUMMARY_BORDER } },
                    left: { style: 'thin', color: { argb: SUMMARY_BORDER } },
                    right: { style: 'thin', color: { argb: SUMMARY_BORDER } }
                };
                if (i === 7) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SUMMARY_GREEN_LIGHT } };
                if (i === 8) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SUMMARY_RED_LIGHT } };
                if (i === 9) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SUMMARY_AMBER_LIGHT } };
            });
            sr++;
        });

        const overall = summaryRows.reduce((a, row) => {
            a.students += Number(row[6]) || 0;
            a.present += Number(row[7]) || 0;
            a.absent += Number(row[8]) || 0;
            a.pending += Number(row[9]) || 0;
            return a;
        }, { students: 0, present: 0, absent: 0, pending: 0 });

        const overallPossible = overall.present + overall.absent + overall.pending;
        const overallAttendance = overallPossible ? Math.round((overall.present / overallPossible) * 100) : 0;
        const overallAbsence = overallPossible ? Math.round((overall.absent / overallPossible) * 100) : 0;

        summaryWs.mergeCells(sr, 1, sr, 6);
        summaryWs.getCell(sr, 1).value = 'OVERALL SUMMARY';
        summaryWs.getCell(sr, 1).font = { bold: true, color: { argb: SUMMARY_DARK }, size: 11 };
        summaryWs.getCell(sr, 1).alignment = { horizontal: 'center', vertical: 'middle' };

        [
            overall.students, overall.present, overall.absent, overall.pending,
            `${overallAttendance}%`, `${overallAbsence}%`
        ].forEach((value, i) => {
            const cell = summaryWs.getCell(sr, i + 7);
            cell.value = value;
            cell.font = { bold: true, color: { argb: SUMMARY_DARK }, size: 11 };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });
        for (let c = 1; c <= summaryCols; c++) {
            summaryWs.getCell(sr, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SUMMARY_GREEN_LIGHT } };
            summaryWs.getCell(sr, c).border = {
                top: { style: 'thin', color: { argb: SUMMARY_BORDER } },
                bottom: { style: 'thin', color: { argb: SUMMARY_BORDER } },
                left: { style: 'thin', color: { argb: SUMMARY_BORDER } },
                right: { style: 'thin', color: { argb: SUMMARY_BORDER } }
            };
        }
        summaryWs.getRow(sr).height = 26;
        sr += 2;

        summaryMerge(sr++, 'ATTENDANCE KEY', {
            fill: SUMMARY_PURPLE_LIGHT,
            font: { bold: true, color: { argb: SUMMARY_PURPLE }, size: 11 },
            height: 22
        });
        [
            ['✓', 'Present — valid attendance'],
            ['A', 'Absent — attendance record not valid for the session'],
            ['P', 'Pending / unresolved attendance'],
            ['-', 'No attendance mark available']
        ].forEach(([code, description]) => {
            summaryWs.getCell(sr, 1).value = code;
            summaryWs.getCell(sr, 1).font = { bold: true, size: 11 };
            summaryWs.getCell(sr, 1).alignment = { horizontal: 'center', vertical: 'middle' };
            summaryWs.mergeCells(sr, 2, sr, summaryCols);
            summaryWs.getCell(sr, 2).value = description;
            summaryWs.getCell(sr, 2).font = { size: 10, color: { argb: SUMMARY_GREY } };
            summaryWs.getCell(sr, 2).alignment = { vertical: 'middle', wrapText: true };
            sr++;
        });

        summaryWs.columns = [
            { width: 7 }, { width: 22 }, { width: 12 }, { width: 12 },
            { width: 30 }, { width: 18 }, { width: 11 }, { width: 11 },
            { width: 11 }, { width: 11 }, { width: 15 }, { width: 13 }
        ];
        summaryWs.views = [{ state: 'frozen', ySplit: summaryHeaderRow }];
        summaryWs.autoFilter = {
            from: { row: summaryHeaderRow, column: 1 },
            to: { row: summaryHeaderRow + summaryRows.length, column: summaryCols }
        };

        const usedNames = new Set();

        // ---- 5. BUILD EACH SHEET ----
        for (const cls of classList) {
            // Unique dates
            const dateSet = new Set();
            cls.logs.forEach(log => {
                const date = log.check_in_time || selectedSession?.session_date || log.created_at;
                if (!date) return;
                dateSet.add(this.getNairobiDateString(date));
            });
            const sortedDates = [...dateSet].sort();
            const dateDisplayMap = {};
            sortedDates.forEach(iso => {
                const [y, m, d] = iso.split('-');
                dateDisplayMap[iso] = `${d}/${m}`;
            });

            // Student map
            const studentMap = {};
            cls.logs.forEach(log => {
                const reg = (log.registration_number || log.student_id || 'N/A').trim();
                const name = (log.student_name || 'Unknown').trim();
                const iso = this.getNairobiDateString(log.check_in_time || selectedSession?.session_date || log.created_at);
                if (!studentMap[reg]) studentMap[reg] = { reg, name, byDate: {} };
                if (!iso) return;

                const status = (log.attendance_status || '').toLowerCase();
                const verified = log.is_verified === true;
                let mark = '-';
                if (verified || status === 'present' || status === 'verified') mark = '✓';
                else if (status === 'absent') mark = log.verification_source === 'Automatic Session Finalization' ? 'A*' : 'A';
                else if (status === 'pending' || status === '') mark = 'P';

                const rank = { '✓': 3, 'P': 2, 'A*': 1, 'A': 1, '-': 0 };
                const prev = studentMap[reg].byDate[iso];
                if (!prev || rank[mark] > rank[prev]) studentMap[reg].byDate[iso] = mark;
            });

            const students = Object.values(studentMap).sort((a, b) =>
                a.reg.localeCompare(b.reg, undefined, { numeric: true })
            );

            // Unique sheet name
            let sheetName = `${cls.blockDisplay} ${cls.unit}`.slice(0, 28).replace(/[\\\/\?\*\[\]:]/g, '-');
            if (usedNames.has(sheetName)) {
                let n = 2;
                while (usedNames.has(`${sheetName} (${n})`.slice(0, 31))) n++;
                sheetName = `${sheetName} (${n})`.slice(0, 31);
            }
            usedNames.add(sheetName);

            const ws = wb.addWorksheet(sheetName, {
                pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 } }
            });

            const totalCols = 3 + sortedDates.length + 1; // S/NO + REG + NAME + dates + TOTAL

            // ---- Header rows ----
            const mergeRow = (rowNumber, text, opts = {}) => {
                ws.mergeCells(rowNumber, 1, rowNumber, totalCols);
                const cell = ws.getCell(rowNumber, 1);
                cell.value = text;
                cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                if (opts.fill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.fill } };
                if (opts.font) cell.font = opts.font;
                if (opts.height) ws.getRow(rowNumber).height = opts.height;
            };

            let r = 1;
            mergeRow(r++, 'NAKURU COLLEGE OF HEALTH SCIENCES AND MANAGEMENT', {
                fill: PURPLE, font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 14, name: 'Calibri' }, height: 32
            });
            mergeRow(r++, 'DEPARTMENT OF NURSING', {
                fill: PURPLE_LIGHT, font: { bold: true, italic: true, color: { argb: PURPLE }, size: 12 }, height: 22
            });
            mergeRow(r++, `${cls.program} CLASS  |  ${cls.blockDisplay}  |  Intake ${cls.intake}`, {
                font: { bold: true, color: { argb: DARK }, size: 12 }, height: 22
            });
            mergeRow(r++, `UNIT: ${cls.unit}  |  SESSION TYPE: ${cls.sessionType}  |  ${typeLabel}`, {
                font: { bold: true, color: { argb: DARK }, size: 12 }, height: 22
            });

            if (hasFilters) {
                const bits = [];
                if (filterBlock !== 'All') bits.push(`Block ${filterBlock}`);
                if (filterYear !== 'All') bits.push(`Intake ${filterYear}`);
                if (filterSessionType !== 'All') bits.push(`Type ${filterSessionType}`);
                if (filterDate) bits.push(`Date ${filterDate}`);
                if (searchText) bits.push(`Search "${searchText}"`);
                mergeRow(r++, `Filtered by → ${bits.join('  ·  ')}`, {
                    fill: AMBER_LIGHT, font: { italic: true, color: { argb: 'FF92400E' }, size: 10 }, height: 18
                });
            }

            mergeRow(r++, 'ATTENDANCE SHEET', {
                fill: PURPLE_LIGHT, font: { bold: true, color: { argb: PURPLE }, size: 13 }, height: 26
            });

            r++; // spacer

            // ---- Column header row ----
            const headerRowIdx = r;
            const header = ['S/NO', 'REG NO', 'FULL NAME', ...sortedDates.map(d => dateDisplayMap[d]), 'TOTAL'];
            header.forEach((v, i) => {
                const cell = ws.getCell(r, i + 1);
                cell.value = v;
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PURPLE } };
                cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                cell.border = { top: { style: 'thin', color: { argb: BORDER } }, bottom: { style: 'thin', color: { argb: BORDER } }, left: { style: 'thin', color: { argb: BORDER } }, right: { style: 'thin', color: { argb: BORDER } } };
            });
            ws.getRow(r).height = 24;
            r++;

            // ---- Student rows ----
            students.forEach((student, idx) => {
                const row = ws.getRow(r);
                row.getCell(1).value = idx + 1;
                row.getCell(2).value = student.reg;
                row.getCell(3).value = student.name;

                let present = 0;
                sortedDates.forEach((iso, i) => {
                    const mark = student.byDate[iso] || '-';
                    const cell = row.getCell(4 + i);
                    cell.value = mark;
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };

                    let fill = GREY_LIGHT, fontColor = GREY;
                    if (mark === '✓') { fill = GREEN_LIGHT; fontColor = GREEN; }
                    else if (mark === 'A' || mark === 'A*') { fill = RED_LIGHT; fontColor = RED; }
                    else if (mark === 'P') { fill = AMBER_LIGHT; fontColor = AMBER; }

                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
                    cell.font = { bold: mark !== '-', color: { argb: fontColor }, size: 12 };
                    if (mark === '✓') present++;
                });

                const totalCell = row.getCell(4 + sortedDates.length);
                totalCell.value = `${present}/${sortedDates.length}`;
                totalCell.alignment = { horizontal: 'center', vertical: 'middle' };
                totalCell.font = { bold: true, color: { argb: DARK }, size: 11 };
                totalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PURPLE_LIGHT } };

                // borders across the row
                for (let c = 1; c <= totalCols; c++) {
                    row.getCell(c).border = {
                        top: { style: 'thin', color: { argb: BORDER } },
                        bottom: { style: 'thin', color: { argb: BORDER } },
                        left: { style: 'thin', color: { argb: BORDER } },
                        right: { style: 'thin', color: { argb: BORDER } }
                    };
                    row.getCell(c).alignment = row.getCell(c).alignment || { vertical: 'middle' };
                    if (!row.getCell(c).font) row.getCell(c).font = { size: 11, color: { argb: DARK } };
                }
                row.height = 20;
                r++;
            });

            // ---- Summary row ----
            r++;
            const totalStudents = students.length;
            const totalSessions = sortedDates.length;
            const totalPossible = totalStudents * totalSessions;
            const totalPresent = students.reduce((sum, student) =>
                sum + Object.values(student.byDate).filter(v => v === '✓').length, 0);
            const rate = totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 0;

            ws.mergeCells(r, 1, r, totalCols);
            const sumCell = ws.getCell(r, 1);
            sumCell.value = `SUMMARY  ·  Students: ${totalStudents}   Sessions: ${totalSessions}   Present: ${totalPresent}/${totalPossible}   Rate: ${rate}%`;
            sumCell.alignment = { horizontal: 'center', vertical: 'middle' };
            sumCell.font = { bold: true, color: { argb: 'FF065F46' }, size: 11 };
            sumCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN_LIGHT } };
            ws.getRow(r).height = 24;
            r += 2;

            // ---- Detailed attendance summary ----
            const totalAbsent = students.reduce((s, x) => s + Object.values(x.byDate).filter(v => v === 'A' || v === 'A*').length, 0);
            const totalAutoAbsent = cls.logs.filter(l => l.attendance_status === 'Absent' && l.verification_source === 'Automatic Session Finalization').length;
            const totalAttemptedAbsent = cls.logs.filter(l => l.attendance_status === 'Absent' && l.verification_source !== 'Automatic Session Finalization').length;
            const totalPending = students.reduce((s, x) => s + Object.values(x.byDate).filter(v => v === 'P').length, 0);
            const totalPossibleDetailed = totalStudents * totalSessions;
            const attendanceRate = totalPossibleDetailed ? Math.round((totalPresent / totalPossibleDetailed) * 100) : 0;
            const absenceRate = totalPossibleDetailed ? Math.round((totalAbsent / totalPossibleDetailed) * 100) : 0;

            const summaryRows = [
                ['ATTENDANCE SUMMARY', ''],
                ['Total Students', totalStudents],
                ['Sessions / Dates', totalSessions],
                ['Total Possible Attendance', totalPossibleDetailed],
                ['Present', totalPresent],
                ['Absent — No Check-in / Automatic', totalAutoAbsent],
                ['Absent — Check-in Attempt Not Valid', totalAttemptedAbsent],
                ['Pending', totalPending],
                ['Attendance Rate', `${attendanceRate}%`],
                ['Absence Rate', `${absenceRate}%`]
            ];
            summaryRows.forEach((item, idx) => {
                const rr = r + idx;
                ws.mergeCells(rr, 1, rr, Math.max(2, Math.floor(totalCols / 2)));
                ws.mergeCells(rr, Math.max(3, Math.floor(totalCols / 2) + 1), rr, totalCols);
                ws.getCell(rr, 1).value = item[0];
                ws.getCell(rr, 2 + Math.floor(totalCols / 2)).value = item[1];
                ws.getCell(rr, 1).font = { bold: idx === 0, color: { argb: idx === 0 ? PURPLE : DARK }, size: idx === 0 ? 12 : 10 };
                ws.getCell(rr, 2 + Math.floor(totalCols / 2)).font = { bold: true, color: { argb: DARK }, size: 10 };
                ws.getCell(rr, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx === 0 ? PURPLE_LIGHT : GREY_LIGHT } };
                ws.getCell(rr, 2 + Math.floor(totalCols / 2)).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx === 0 ? PURPLE_LIGHT : 'FFFFFFFF' } };
                ws.getRow(rr).height = idx === 0 ? 22 : 19;
            });
            r += summaryRows.length + 1;

            // ---- Legend / audit notes ----
            ws.mergeCells(r, 1, r, totalCols);
            ws.getCell(r, 1).value = 'LEGEND: ✓ Present   |   A Absent after an invalid/unsuccessful check-in   |   A* Absent — no check-in recorded   |   P Pending';
            ws.getCell(r, 1).font = { italic: true, color: { argb: 'FF475569' }, size: 9 };
            ws.getCell(r, 1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            ws.getRow(r).height = 24;
            r += 2;

            // ---- Signature footer ----
            ws.mergeCells(r, 1, r, totalCols);
            const sigHeader = ws.getCell(r, 1);
            sigHeader.value = 'AUTHORIZATION & VERIFICATION';
            sigHeader.alignment = { horizontal: 'center', vertical: 'middle' };
            sigHeader.font = { bold: true, color: { argb: PURPLE }, size: 12 };
            sigHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PURPLE_LIGHT } };
            ws.getRow(r).height = 22;
            r++;

                      const sigRow = (label) => {
                // Column A (merged A:B) → the label
                if (totalCols >= 2) {
                    ws.mergeCells(r, 1, r, 2);
                }
                const labelCell = ws.getCell(r, 1);
                labelCell.value = label;
                labelCell.font = { bold: true, size: 11, color: { argb: DARK } };
                labelCell.alignment = { horizontal: 'left', vertical: 'middle' };

                // Column C → underscore line
                const lineCell = ws.getCell(r, 3);
                lineCell.value = '_______________________';
                lineCell.alignment = { horizontal: 'center', vertical: 'middle' };
                lineCell.font = { size: 11 };

                // Columns D:E (merged) → Signature line
                if (totalCols >= 5) {
                    ws.mergeCells(r, 4, r, 5);
                }
                const sigCell = ws.getCell(r, 4);
                sigCell.value = 'Signature: ______________';
                sigCell.font = { size: 11 };
                sigCell.alignment = { horizontal: 'left', vertical: 'middle' };

                // Columns F:end (merged, only if it spans MORE than one col) → Date line
                if (totalCols > 6) {
                    ws.mergeCells(r, 6, r, totalCols);
                }
                const dateCell = ws.getCell(r, 6);
                dateCell.value = 'Date: ______________';
                dateCell.font = { size: 11 };
                dateCell.alignment = { horizontal: 'left', vertical: 'middle' };

                ws.getRow(r).height = 26;
                r++;
            };
            r++;
            sigRow('Class Representative:');
            r++;
            sigRow('Lecturer:');
            r++;
            sigRow('Checked By:');

            // ---- Column widths ----
            const widths = [];
            widths.push({ width: 7 });  // S/NO
            widths.push({ width: 22 }); // REG NO
            widths.push({ width: 30 }); // NAME
            sortedDates.forEach(() => widths.push({ width: 8 }));
            widths.push({ width: 10 }); // TOTAL
            ws.columns = widths;

            // ---- Freeze header + first 3 cols ----
            ws.views = [{ state: 'frozen', xSplit: 3, ySplit: headerRowIdx }];
        }

        // Open the workbook on the administrative summary sheet.
        wb.views = [{ activeTab: 0, firstSheet: 0 }];

        // ---- 6. WRITE ----
        const suffixBits = [];
        if (filterBlock !== 'All') suffixBits.push(filterBlock.replace(/\s+/g, ''));
        if (filterYear !== 'All') suffixBits.push(`Intake${filterYear}`);
        if (filterSessionType !== 'All') suffixBits.push(filterSessionType);
        const suffix = suffixBits.length ? '_' + suffixBits.join('_') : '';
        const filename = `AttendanceSheet${suffix}_${new Date().toISOString().split('T')[0]}.xlsx`;

        try {
            const buffer = await wb.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

            if (typeof saveAs === 'function') {
                saveAs(blob, filename);
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = filename;
                document.body.appendChild(a); a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }

            this.showNotification(
                `✅ Exported ${classList.length} sheet${classList.length === 1 ? '' : 's'} (${source.length} records)${hasFilters ? ' — filtered view' : ''}`,
                'success'
            );
        } catch (err) {
            console.error('❌ Export error:', err);
            this.showNotification('Export failed: ' + err.message, 'error');
        }
    },

    // ============================================================
    // PRINT
    // ============================================================
    printReport() { window.print(); },

    // ============================================================
    // TOASTS
    // ============================================================
    showNotification(message, type = 'info') {
        console.log(`[${type}] ${message}`);
        try {
            if (window.LecturerUI?.showNotification) { window.LecturerUI.showNotification(message, type); return; }
        } catch (e) {}
        try {
            const toast = document.createElement('div');
            const colors = { success: '#10b981', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };
            toast.style.cssText = `position:fixed;bottom:20px;right:20px;padding:12px 24px;background:${colors[type] || '#3b82f6'};color:white;border-radius:8px;font-weight:500;z-index:100000;box-shadow:0 4px 12px rgba(0,0,0,0.2);max-width:400px;font-family:system-ui,sans-serif;`;
            toast.textContent = message;
            document.body.appendChild(toast);
            setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.5s'; setTimeout(() => toast.remove(), 500); }, 3500);
        } catch (e) {}
    },

    showError(message) { console.error('❌', message); this.showNotification(message, 'error'); },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // ============================================================
    // EVENT LISTENERS
    // ============================================================
    setupEventListeners() {
        const checkinBtn = document.getElementById('lecturerCheckinBtn');
        if (checkinBtn && !checkinBtn.dataset.bound) {
            checkinBtn.dataset.bound = '1';
            checkinBtn.addEventListener('click', () => this.lecturerCheckIn());
        }

        const form = document.getElementById('manualAttendanceForm');
        if (form && !form.dataset.bound) {
            form.dataset.bound = '1';
            form.addEventListener('submit', (e) => this.markStudentAttendance(e));
        }

        ['filterDateFrom', 'filterDateTo', 'filterDate', 'filterBlock', 'filterUnit', 'filterYear', 'filterSessionType'].forEach(id => {
            const el = document.getElementById(id);
            if (el && !el.dataset.filterBound) {
                el.dataset.filterBound = '1';
                el.addEventListener('change', () => this.applyFilters());
            }
        });

        const searchInput = document.getElementById('filterSearch');
        if (searchInput && !searchInput.dataset.filterBound) {
            searchInput.dataset.filterBound = '1';
            let timeout;
            searchInput.addEventListener('input', () => {
                clearTimeout(timeout);
                timeout = setTimeout(() => this.applyFilters(), 300);
            });
        }
    },

    // ============================================================
    // REFRESH
    // ============================================================
    async refresh() {
        await this.loadAllAttendance();
        this.applyFilters();
        this.updateProgramBadge();
        this.showNotification(`${this.getProgramTypeLabel()} attendance refreshed!`, 'success');
    },

    closeMapModal() {
        const modal = document.getElementById('attendanceMapModal');
        if (modal) modal.style.display = 'none';
        if (this.mapInstance) { this.mapInstance.remove(); this.mapInstance = null; }
    },

    openInGoogleMaps() {
        const loc = this.currentLocation;
        if (loc) window.open(`https://www.google.com/maps?q=${loc.lat},${loc.lng}`, '_blank');
    },


    // ============================================================
    // FULL CLASS SESSION RECONCILIATION
    // Builds the expected class from student profiles, compares it
    // against geo check-ins for THIS session, and can finalize
    // missing/invalid students as Absent when the session closes.
    // ============================================================
    getAssignedBlockForUnit(unitName, preferredBlock = null) {
        const preferred = String(preferredBlock || '').trim();
        const unit = String(unitName || '').trim().toLowerCase();
        const assignments = Array.isArray(this.assignedUnits) ? this.assignedUnits : [];

        if (preferred) {
            const exact = assignments.find(a =>
                String(a.block || '').trim().toLowerCase() === preferred.toLowerCase() &&
                (!unit || String(a.subject_name || '').trim().toLowerCase() === unit)
            );
            if (exact) return String(exact.block).trim();
        }

        if (unit) {
            const exactUnit = assignments.find(a => String(a.subject_name || '').trim().toLowerCase() === unit);
            if (exactUnit?.block) return String(exactUnit.block).trim();
        }

        return this.currentAssignedBlock || this.assignedBlocks?.[0] || null;
    },

    async getSessionRoster(session) {
        const supabase = window.lecturerDB?.supabase;
        if (!supabase || !session?.id) return [];

        const program = session.target_program || session.program || this.currentProgram || 'KRCHN';
        // New sessions may use target_block; older sessions use block_term.
        // If both are missing, recover the block from the lecturer's assignment.
        const block = this.getAssignedBlockForUnit(
            session.unit_name || session.course_name || session.session_title || session.title,
            session.target_block || session.block_term || session.block
        );
        const intake = session.intake_year;

        let query = supabase
            .from('consolidated_user_profiles_table')
            .select('user_id, full_name, student_id, program, block, intake_year, role')
            .in('role', ['student', 'Student', 'STUDENT'])
            .eq('program', program);

        if (block) query = query.eq('block', block);
        if (intake !== null && intake !== undefined && String(intake) !== '') {
            query = query.eq('intake_year', String(intake));
        }

        const { data, error } = await query.order('full_name', { ascending: true });
        if (error) throw error;

        return (data || []).map(student => ({
            user_id: student.user_id,
            name: student.full_name || 'Unknown Student',
            registration_number: student.student_id || student.user_id,
            student_id: student.student_id || student.user_id,
            program: student.program || program,
            block: student.block || block || null,
            intake_year: student.intake_year || intake || null
        }));
    },

    async getSessionAttendanceRegister(session, finalize = false) {
        const supabase = window.lecturerDB?.supabase;
        if (!supabase || !session?.id) {
            return { roster: [], logs: [], rows: [], summary: { total: 0, present: 0, absent: 0, pending: 0, notCheckedIn: 0, rate: 0 } };
        }

        const roster = await this.getSessionRoster(session);

        const { data: logs, error } = await supabase
            .from('geo_attendance_logs')
            .select('*')
            .eq('session_id', session.id)
            .neq('role', 'lecturer')
            .order('check_in_time', { ascending: true });

        if (error) throw error;

        // Index every identifier on every log. This prevents user_id/student_id
        // mismatches from hiding a valid check-in from the class register.
        const byStudent = new Map();
        const choose = (old, log) => {
            if (!old) return log;
            const status = String(log.attendance_status || '').toLowerCase();
            const oldStatus = String(old.attendance_status || '').toLowerCase();
            const present = status === 'present' || status === 'verified' || log.is_verified === true;
            const oldPresent = oldStatus === 'present' || oldStatus === 'verified' || old.is_verified === true;
            if (present && !oldPresent) return log;
            if (!present && !oldPresent && new Date(log.check_in_time || 0) > new Date(old.check_in_time || 0)) return log;
            return old;
        };
        const put = (key, log) => {
            if (!key) return;
            const k = String(key).trim();
            if (!k) return;
            byStudent.set(k, choose(byStudent.get(k), log));
        };
        (logs || []).forEach(log => {
            [log.user_id, log.student_id, log.registration_number].forEach(key => put(key, log));
        });

        const rows = [];
        const missing = [];
        const radiusFor = log => {
            const value = log?.target_radius ?? session.target_radius ?? 150;
            const radius = Number(value);
            return Number.isFinite(radius) && radius > 0 ? radius : 150;
        };

        for (const student of roster) {
            const keys = [student.user_id, student.student_id, student.registration_number]
                .filter(Boolean).map(String);
            let log = null;
            for (const key of keys) {
                if (byStudent.has(key)) { log = byStudent.get(key); break; }
            }

            const status = String(log?.attendance_status || '').toLowerCase();
            const manual = log?.is_manual_entry === true;
            const hasDistance = log?.distance_meters !== null && log?.distance_meters !== undefined && log?.distance_meters !== '';
            const withinRadius = manual || (hasDistance && Number(log.distance_meters) <= radiusFor(log));
            const hasCheckIn = !!log?.check_in_time;
            const validStatus = status === 'present' || status === 'verified' || log?.is_verified === true;
            const validPresent = !!log && !['absent'].includes(status) && hasCheckIn && validStatus && withinRadius;

            let finalStatus = validPresent ? 'Present' : (log ? 'Absent' : 'Not Checked In');

            if (finalize && finalStatus !== 'Present') {
                missing.push({ student, existingLog: log });
                finalStatus = 'Absent';
            }

            rows.push({
                student,
                log,
                status: finalStatus,
                checkInTime: log?.check_in_time || null,
                distance: log?.distance_meters ?? null,
                accuracy: log?.accuracy_m ?? null
            });
        }

        if (finalize && missing.length > 0) {
            const now = new Date().toISOString();
            const inserts = [];
            const updates = [];

            for (const { student, existingLog } of missing) {
                if (existingLog?.id) {
                    updates.push(
                        supabase.from('geo_attendance_logs')
                            .update({
                                attendance_status: 'Absent',
                                is_verified: false,
                                finalized_at: now,
                                finalized_by: this.lecturerUuid || null,
                                verification_source: 'Automatic Session Finalization',
                                finalization_reason: 'No valid in-radius check-in for this session'
                            })
                            .eq('id', existingLog.id)
                    );
                } else {
                    inserts.push({
                        user_id: student.user_id,
                        student_id: student.student_id,
                        registration_number: student.registration_number || student.student_id,
                        student_name: student.name,
                        block: student.block,
                        intake_year: student.intake_year,
                        program: student.program,
                        // This is NOT a real check-in. Store the session
                        // occurrence timestamp so date filters/history place the
                        // automatic absence on the actual class day. The UI
                        // still displays "No check-in" from verification_source.
                        check_in_time: this.getSessionDateTime(session)?.toISOString() || null,
                        session_type: session.session_type || 'Class',
                        target_id: session.id,
                        session_id: session.id,
                        target_name: session.location_name || session.session_title || session.title || 'Class',
                        unit_name: session.unit_name || session.course_name || 'General',
                        attendance_status: 'Absent',
                        is_verified: false,
                        location_type: 'class',
                        target_radius: session.target_radius || 150,
                        target_latitude: session.target_latitude || null,
                        target_longitude: session.target_longitude || null,
                        role: 'student',
                        is_manual_entry: false,
                        verification_source: 'Automatic Session Finalization',
                        finalization_reason: 'No check-in recorded before session close',
                        finalized_at: now,
                        finalized_by: this.lecturerUuid || null,
                        created_at: now
                    });
                }
            }

            if (updates.length) {
                const results = await Promise.all(updates);
                const failed = results.find(r => r.error);
                if (failed?.error) throw failed.error;
            }
            if (inserts.length) {
                const { error: insertError } = await supabase.from('geo_attendance_logs').insert(inserts);
                if (insertError) throw insertError;
            }

            return await this.getSessionAttendanceRegister(session, false);
        }

        const summary = {
            total: rows.length,
            present: rows.filter(r => r.status === 'Present').length,
            absent: rows.filter(r => r.status === 'Absent').length,
            pending: rows.filter(r => r.status === 'Not Checked In').length,
            notCheckedIn: rows.filter(r => r.status === 'Not Checked In').length
        };
        summary.rate = summary.total ? Math.round((summary.present / summary.total) * 100) : 0;
        return { roster, logs: logs || [], rows, summary };
    },

    async reconcileSessionAttendance(sessionId, finalize = true) {
        const supabase = window.lecturerDB?.supabase;
        if (!supabase) throw new Error('Database connection not available');
        if (!sessionId) throw new Error('Session ID is required');

        // IMPORTANT:
        // LecturerSessions and LecturerAttendance are separate modules.
        // LecturerAttendance does not necessarily have the session in
        // this.sessions, so closing a session must load it directly from
        // scheduled_sessions instead of relying on a local array.
        let session = this.sessions?.find(s => String(s.id) === String(sessionId));

        if (!session) {
            const { data, error } = await supabase
                .from('scheduled_sessions')
                .select('*')
                .eq('id', sessionId)
                .maybeSingle();

            if (error) throw new Error('Failed to load session: ' + error.message);
            session = data;
        }

        if (!session) throw new Error('Session not found in scheduled_sessions');

        // Confirm the current lecturer owns the session when an identity is available.
        const profile = window.lecturerDB?.getCurrentUserProfile?.();
        const lecturerId = this.lecturerUuid || profile?.user_id;

        if (
            lecturerId &&
            session.created_by &&
            String(session.created_by) !== String(lecturerId)
        ) {
            throw new Error('You can only finalize attendance for your own session');
        }

        const sessionType = String(session.session_type || 'Class').toLowerCase();

        // The automatic full-class finalization requested applies to classroom/
        // lab/tutorial sessions. Clinical and exam attendance retain their
        // existing workflow.
        if (sessionType === 'clinical' || sessionType === 'exam') {
            return await this.getSessionAttendanceRegister(session, false);
        }

        const register = await this.getSessionAttendanceRegister(session, finalize);

        console.log('📋 Session attendance reconciled:', {
            session_id: sessionId,
            total: register.summary.total,
            present: register.summary.present,
            absent: register.summary.absent,
            pending: register.summary.pending,
            rate: register.summary.rate
        });

        return register;
    },

    async previewSessionAttendance(sessionId) {
        return this.reconcileSessionAttendance(sessionId, false);
    },

    // ============================================================
    // INDIVIDUAL PRESENT / ABSENT STATUS
    // ============================================================
    async setAttendanceStatus(recordId, status) {
        if (!recordId) {
            this.showNotification('Attendance record ID is required.', 'error');
            return;
        }
        if (!['Present', 'Absent'].includes(status)) {
            this.showNotification('Invalid attendance status.', 'error');
            return;
        }
        if (this.isProcessing) return;

        const supabase = window.lecturerDB?.supabase;
        if (!supabase) {
            this.showNotification('Database not available.', 'error');
            return;
        }

        const record = [...(this.todayLogs || []), ...(this.pastLogs || [])].find(r => String(r?.id) === String(recordId));
        if (record?.session_type === 'Lecturer Check-in' || record?.role === 'lecturer') {
            this.showNotification('Lecturer check-in records cannot be marked as student Present/Absent.', 'warning');
            return;
        }

        const actionLabel = status === 'Present' ? 'Present' : 'Absent';
        if (!confirm(`Mark ${record?.student_name || 'this student'} as ${actionLabel}?`)) return;

        const buttons = document.querySelectorAll(`[data-attendance-action-id="${CSS.escape(String(recordId))}"]`);
        buttons.forEach(btn => { btn.disabled = true; btn.style.opacity = '0.65'; });

        this.isProcessing = true;
        try {
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const lecturerId = profile?.user_id || this.lecturerUuid || null;
            const lecturerName = profile?.full_name || 'Lecturer';

            const updatePayload = {
                attendance_status: status,
                is_verified: false,
                verified_by: null,
                verified_by_name: null,
                verified_at: null,
                verification_source: 'Manual Lecturer Status'
            };

            if (status === 'Present') {
                updatePayload.finalization_reason = null;
            }

            if (lecturerId) updatePayload.recorded_by_id = lecturerId;
            if (lecturerName) updatePayload.recorded_by_name = lecturerName;

            const { error } = await supabase
                .from('geo_attendance_logs')
                .update(updatePayload)
                .eq('id', recordId);

            if (error) throw error;

            this.showNotification(`✅ ${record?.student_name || 'Student'} marked ${status}.`, 'success');
            await this.loadAllAttendance();
            this.applyFilters();
        } catch (error) {
            console.error('❌ setAttendanceStatus:', error);
            this.showNotification(`Failed to mark ${actionLabel}: ${error.message}`, 'error');
        } finally {
            this.isProcessing = false;
        }
    },

    // ============================================================
    // VERIFY / BULK VERIFY
    // ============================================================
    verifyAttendance: async function(recordId) {
        if (!recordId) { this.showNotification('Error: Record ID is required', 'error'); return; }
        if (this.isProcessing) return;
        this.isProcessing = true;

        const verifyBtn = document.querySelector(`[data-verify-id="${recordId}"]`);
        if (verifyBtn) { verifyBtn.disabled = true; verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }

        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) throw new Error('Database not available');
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const lecturerName = profile?.full_name || 'Lecturer';
            const lecturerId = profile?.user_id || this.lecturerUuid || 'unknown';

            const { error: updateError } = await supabase
                .from('geo_attendance_logs')
                .update({
                    is_verified: true, attendance_status: 'Verified',
                    verified_by: lecturerId, verified_by_name: lecturerName,
                    verified_at: new Date().toISOString(),
                    verification_source: 'Manual Verification'
                })
                .eq('id', recordId);

            if (updateError) throw new Error(updateError.message);

            this.showNotification('✅ Verified!', 'success');
            await this.loadTodayAttendance();
            await this.loadPastAttendance();
            await this.loadAttendanceStats();
        } catch (error) {
            console.error('❌ verifyAttendance:', error);
            this.showNotification('Failed: ' + error.message, 'error');
        } finally {
            this.isProcessing = false;
        }
    },

    bulkVerifyAttendance: async function(date = null) {
        if (this.isProcessing) return;
        const rows = this.applyFilters().filter(r => r?.id && r.session_type !== 'Lecturer Check-in' && !r.is_verified);
        if (!rows.length) {
            this.showNotification('No unverified attendance records in the current filter.', 'info');
            return;
        }
        if (!confirm(`Verify ${rows.length} filtered attendance record(s)?`)) return;
        this.isProcessing = true;
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) throw new Error('Database not available');
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const lecturerName = profile?.full_name || 'Lecturer';
            const lecturerId = profile?.user_id || this.lecturerUuid || 'unknown';
            const { error } = await supabase.from('geo_attendance_logs').update({
                is_verified: true,
                attendance_status: 'Verified',
                verified_by: lecturerId,
                verified_by_name: lecturerName,
                verified_at: new Date().toISOString(),
                verification_source: 'Bulk Verification'
            }).in('id', rows.map(r => r.id));
            if (error) throw error;
            this.showNotification(`✅ ${rows.length} record(s) verified.`, 'success');
            await this.loadAllAttendance();
            this.applyFilters();
        } catch (error) {
            console.error('❌ bulkVerifyAttendance:', error);
            this.showNotification('Bulk verification failed: ' + error.message, 'error');
        } finally {
            this.isProcessing = false;
        }
    },

    async bulkMarkAbsent() {
        if (this.isProcessing) return;
        const rows = this.applyFilters().filter(r => { const status = String(r?.attendance_status || '').toLowerCase(); return r?.id && r.session_type !== 'Lecturer Check-in' && !r.is_verified && (status === '' || status === 'pending' || status === 'late'); });
        if (!rows.length) { this.showNotification('No attendance records in the current filter to mark absent.', 'info'); return; }
        if (!confirm(`Mark ${rows.length} filtered attendance record(s) as Absent?`)) return;
        const supabase = window.lecturerDB?.supabase;
        if (!supabase) { this.showNotification('Database not available.', 'error'); return; }
        this.isProcessing = true;
        try {
            const { error } = await supabase.from('geo_attendance_logs').update({
                attendance_status: 'Absent', is_verified: false, verification_source: 'Manual Bulk Absent'
            }).in('id', rows.map(r => r.id));
            if (error) throw error;
            this.showNotification(`✅ ${rows.length} record(s) marked Absent.`, 'success');
            await this.loadAllAttendance();
            this.applyFilters();
        } catch (error) {
            console.error('❌ bulkMarkAbsent:', error);
            this.showNotification('Bulk Absent failed: ' + error.message, 'error');
        } finally { this.isProcessing = false; }
    },

    async deleteAttendanceRecord(recordId) {
        if (!recordId) {
            this.showNotification('Attendance record ID is required.', 'error');
            return;
        }
        if (this.isProcessing) return;

        const record = [...(this.todayLogs || []), ...(this.pastLogs || [])]
            .find(r => String(r?.id) === String(recordId));

        if (record?.session_type === 'Lecturer Check-in' || record?.role === 'lecturer') {
            this.showNotification('Lecturer check-in records cannot be deleted from student attendance.', 'warning');
            return;
        }

        const studentName = record?.student_name || 'this student';
        const regNo = record?.registration_number || record?.student_id || '';
        const label = regNo ? `${studentName} (${regNo})` : studentName;

        if (!confirm(`Delete attendance for ${label}?\n\nThis deletes only this attendance record and cannot be undone.`)) return;

        const deleteBtn = document.querySelector(`[data-delete-id="${CSS.escape(String(recordId))}"]`);
        if (deleteBtn) {
            deleteBtn.disabled = true;
            deleteBtn.style.opacity = '0.65';
            deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        }

        this.isProcessing = true;
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) throw new Error('Database not available');

            const { error } = await supabase
                .from('geo_attendance_logs')
                .delete()
                .eq('id', recordId);

            if (error) throw error;

            this.showNotification(`🗑️ Attendance for ${studentName} deleted.`, 'success');
            await this.loadAllAttendance();
            this.applyFilters();
        } catch (error) {
            console.error('❌ deleteAttendanceRecord:', error);
            this.showNotification('Delete failed: ' + error.message, 'error');
        } finally {
            this.isProcessing = false;
        }
    },

    async bulkDeleteAttendance() {
        if (this.isProcessing) return;
        const rows = this.applyFilters().filter(r => r?.id && r.session_type !== 'Lecturer Check-in');
        if (!rows.length) { this.showNotification('No attendance records in the current filter to delete.', 'info'); return; }
        if (!confirm(`DELETE ${rows.length} filtered attendance record(s)? This cannot be undone.`)) return;
        const supabase = window.lecturerDB?.supabase;
        if (!supabase) { this.showNotification('Database not available.', 'error'); return; }
        this.isProcessing = true;
        try {
            const { error } = await supabase.from('geo_attendance_logs').delete().in('id', rows.map(r => r.id));
            if (error) throw error;
            this.showNotification(`🗑️ ${rows.length} record(s) deleted.`, 'success');
            await this.loadAllAttendance();
            this.applyFilters();
        } catch (error) {
            console.error('❌ bulkDeleteAttendance:', error);
            this.showNotification('Bulk Delete failed: ' + error.message, 'error');
        } finally { this.isProcessing = false; }
    },

    canVerifyRecord(record) {
        if (!record) return false;
        if (record.is_verified === true) return false;
        if (record.session_type === 'Lecturer Check-in') return false;
        if (record.role === 'lecturer') return false;
        return true;
    }
};

// ============================================================
// INIT + GLOBAL EXPOSURE
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => LecturerAttendance.init(), 750);
});

window.LecturerAttendance = LecturerAttendance;
window.viewAttendanceMap = (lat, lng, name) => LecturerAttendance.viewAttendanceMap(lat, lng, name);
window.applyAttendanceFilters = () => LecturerAttendance.applyFilters();
window.resetAttendanceFilters = () => LecturerAttendance.resetFilters();
window.exportAttendanceCSV = () => LecturerAttendance.exportCSV();  // still named CSV for HTML compatibility
window.printAttendanceReport = () => LecturerAttendance.printReport();
window.lecturerCheckin = () => LecturerAttendance.lecturerCheckIn();
window.markAttendance = (e) => LecturerAttendance.markStudentAttendance(e);
window.verifyAttendance = (id) => LecturerAttendance.verifyAttendance(id);
window.setAttendanceStatus = (id, status) => LecturerAttendance.setAttendanceStatus(id, status);
window.bulkVerifyAttendance = (date) => LecturerAttendance.bulkVerifyAttendance(date);
window.bulkMarkAbsent = () => LecturerAttendance.bulkMarkAbsent();
window.bulkDeleteAttendance = () => LecturerAttendance.bulkDeleteAttendance();
window.deleteAttendanceRecord = (id) => LecturerAttendance.deleteAttendanceRecord(id);

window.setAttendanceSession = (sessionId) => LecturerAttendance.setAttendanceSession(sessionId, true);
window.getAttendanceSession = () => LecturerAttendance.getSelectedSession();

window.reconcileSessionAttendance = (sessionId, finalize = true) =>
    LecturerAttendance.reconcileSessionAttendance(sessionId, finalize);
window.previewSessionAttendance = (sessionId) =>
    LecturerAttendance.previewSessionAttendance(sessionId);
window.canVerifyRecord = (record) => LecturerAttendance.canVerifyRecord(record);

window.closeAttendanceMap = () => {
    const modal = document.getElementById('attendanceMapModal');
    if (modal) modal.style.display = 'none';
    if (LecturerAttendance.mapInstance) {
        LecturerAttendance.mapInstance.remove();
        LecturerAttendance.mapInstance = null;
    }
};

window.openInGoogleMaps = () => {
    const loc = LecturerAttendance.currentLocation;
    if (loc) {
        window.open(`https://www.google.com/maps?q=${loc.lat},${loc.lng}`, '_blank');
    }
};

console.log('✅ LecturerAttendance module loaded');
console.log('📋 Features: Today/Past attendance, Stats, Check-in, Map, Styled XLSX Export, Print, Verify, Bulk Verify');
console.log(`📊 TVET Support: Enabled (${LecturerAttendance.getProgramTypeLabel()})`);
console.log('🎨 Export: Modern styled .xlsx with colored cells, merged headers, frozen panes');
