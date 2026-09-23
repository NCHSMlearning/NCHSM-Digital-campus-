// ============================================================
// NCHSM LECTURER ATTENDANCE MODULE — WITH TVET + STYLED XLSX
// ✅ FIXED: removed non-existent registration_number column
// ✅ FIXED: filters out placeholder "Student" accounts
// ✅ FIXED: safe radius comparison for out-of-radius check-ins
// ✅ FIXED: display-safe registration number (never shows UUID)
// ✅ NEW:   Unit filter in the attendance filter bar
// ✅ NEW:   Export treats P (Pending) as Present (renders as ✓)
// ✅ NEW:   Export includes ALL students in the block, not just those with logs
// ✅ NEW:   Single + Bulk delete with RLS-friendly permission checks
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
    // ✅ Display-safe registration number (never shows UUID)
    // ============================================================
    getDisplayRegNumber(log) {
        if (!log) return 'N/A';
        const isUUID = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || ''));
        const candidates = [log.registration_number, log.admission_number, log.student_id];
        for (const c of candidates) {
            const v = (c || '').toString().trim();
            if (v && !isUUID(v)) return v;
        }
        return 'N/A';
    },

    // ============================================================
    // ✅ Placeholder detector
    // ============================================================
    isPlaceholderLog(log) {
        if (!log) return false;
        if (log.session_type === 'Lecturer Check-in') return false;
        const name = String(log.student_name || '').trim().toLowerCase();
        const reg = String(log.registration_number || log.student_id || '').trim();
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reg);
        return name === 'student' || isUUID;
    },

    // ============================================================
    // ✅ Can current user delete this record?
    // ============================================================
    canDeleteRecord(record) {
        if (!record) return false;
        const profile = window.lecturerDB?.getCurrentUserProfile();
        const userId = profile?.user_id || this.lecturerUuid;
        if (!userId) return false;
        if (record.session_type === 'Lecturer Check-in') return false;
        return (
            record.finalized_by === userId ||
            record.verified_by === userId ||
            record.recorded_by_id === userId
        );
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
            this.populateUnitSelectors();
            this.updateProgramBadge();
        } catch (error) {
            console.error('❌ loadAssignedUnits fail:', error);
        }
    },

    // ============================================================
    // POPULATE UNIT SELECTORS (manual-entry dropdown)
    // ============================================================
    populateUnitSelectors() {
        const unitSelect = document.getElementById('attUnit');
        if (!unitSelect) return;
        const units = this.assignedUnits;
        const typeLabel = this.getProgramTypeLabel();
        const emoji = this.getProgramEmoji();

        if (units?.length > 0) {
            unitSelect.innerHTML = `<option value="">-- ${emoji} Select Unit --</option>` +
                units.map(u => {
                    const blockDisplay = this.getBlockDisplay(u.block);
                    return `<option value="${u.subject_name}">
                        ${u.subject_code ? u.subject_code + ' - ' : ''}${u.subject_name}
                        ${u.block ? ' (' + blockDisplay + ')' : ''}
                        ${this.isTVET ? ' 🔧' : ''}
                    </option>`;
                }).join('');
        } else {
            unitSelect.innerHTML = `<option value="">-- No ${typeLabel} units assigned --</option>`;
        }
    },

    // ============================================================
    // ✅ Populate the FILTER unit dropdown from loaded logs
    // ============================================================
    populateUnitFilter() {
        const unitSelect = document.getElementById('filterUnit');
        if (!unitSelect) return;

        const allLogs = [...(this.todayLogs || []), ...(this.pastLogs || [])];
        const units = [...new Set(
            allLogs
                .map(l => (l.unit_name || l.target_name || '').trim())
                .filter(u => u && u.toLowerCase() !== 'general')
        )].sort((a, b) => a.localeCompare(b));

        const previous = unitSelect.value;
        unitSelect.innerHTML = '<option value="All">All Units</option>' +
            units.map(u => `<option value="${this.escapeHtml(u)}">${this.escapeHtml(u)}</option>`).join('');

        if (previous && [...unitSelect.options].some(o => o.value === previous)) {
            unitSelect.value = previous;
        }
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
            this.populateUnitFilter();
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
            const todayStr = new Date().toISOString().split('T')[0];

            const { data: logs, error } = await supabase
                .from('geo_attendance_logs')
                .select('*')
                .gte('check_in_time', `${todayStr}T00:00:00.000Z`)
                .lte('check_in_time', `${todayStr}T23:59:59.999Z`)
                .order('check_in_time', { ascending: false });

            if (error) {
                tbody.innerHTML = `<tr><td colspan="10" style="padding:30px;text-align:center;color:#ef4444;">Error: ${error.message}</td></tr>`;
                return;
            }
            this.todayLogs = logs || [];
            this.filteredTodayLogs = [...this.todayLogs];
            this.renderTodayAttendance();
            this.updateStats(this.todayLogs);
            this.updateProgramBadge();
        } catch (error) {
            console.error('❌ loadTodayAttendance:', error);
        }
    },

    // ============================================================
    // RENDER TODAY
    // ============================================================
    renderTodayAttendance() {
        const tbody = document.getElementById('attendanceTable');
        if (!tbody) return;
        const logs = this.todayLogs;
        const typeLabel = this.getProgramTypeLabel();

        const countEl = document.getElementById('todayLogCount');
        if (countEl) countEl.textContent = `${logs.length} records`;

        if (!logs?.length) {
            tbody.innerHTML = `<tr><td colspan="10" style="padding:40px;text-align:center;color:#94a3b8;">
                <i class="fas fa-calendar-day" style="font-size:32px;display:block;margin-bottom:10px;color:#e2e8f0;"></i>
                <p style="margin:0;">No student attendance records today. (${typeLabel})</p></td></tr>`;
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

            const studentName = log.student_name || 'Unknown Student';
            const regNumber = this.getDisplayRegNumber(log);
            const displayReg = regNumber.length > 15 ? regNumber.substring(0, 15) + '...' : regNumber;
            const blockDisplay = log.block ? this.getBlockDisplay(log.block) : 'N/A';
            const programDisplay = log.program || 'N/A';
            const checkInDate = log.check_in_time ? new Date(log.check_in_time) : null;
            const timeStr = checkInDate ? checkInDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
            const isLecturerCheckin = log.session_type === 'Lecturer Check-in';
            const locationDisplay = isLecturerCheckin ? 'Lecturer Check-in' : (log.location_address || log.location_friendly_name || log.location_name || 'N/A');
            const canVerify = !isLecturerCheckin && log.role !== 'lecturer' && !isVerified;
            const verifiedByDisplay = log.verified_by_name ? `by ${log.verified_by_name}` : '';

            return `
                <tr style="border-bottom: 1px solid #f1f5f9; ${isVerified ? 'background: #f0fdf4;' : ''} ${isLecturerCheckin ? 'background: #f0fdf4;' : ''}">
                    <td style="padding: 10px 14px; font-weight: 500; color: #1e293b; font-size: 13px;">
                        ${this.escapeHtml(studentName)}
                        ${isLecturerCheckin ? ' <span style="font-size:10px;background:#10b981;color:white;padding:1px 8px;border-radius:10px;">👨‍🏫</span>' : ''}
                        ${isVerified && !isLecturerCheckin ? ' <span style="font-size:10px;background:#10b981;color:white;padding:1px 8px;border-radius:10px;">✓</span>' : ''}
                        ${isTVET && !isLecturerCheckin ? ' <span style="font-size:9px;color:#8b5cf6;padding:1px 6px;border-radius:8px;">TVET</span>' : ''}
                    </td>
                    <td style="padding: 10px 14px; font-weight: 600; color: #4C1D95; font-size: 12px;">${this.escapeHtml(displayReg)}</td>
                    <td style="padding: 10px 14px; color: #475569; font-size: 12px;"><span style="background: ${programDisplay === 'KRCHN' ? '#dbeafe' : '#fef3c7'}; color: ${programDisplay === 'KRCHN' ? '#1e40af' : '#92400e'}; padding: 2px 10px; border-radius: 12px; font-size: 11px;">${this.escapeHtml(programDisplay)}</span></td>
                    <td style="padding: 10px 14px; color: #475569; font-size: 13px;">${this.escapeHtml(blockDisplay)}</td>
                    <td style="padding: 10px 14px; color: #475569; font-size: 13px;">${this.escapeHtml(log.unit_name || log.target_name || 'General')}</td>
                    <td style="padding: 10px 14px;"><span style="background: ${isLecturerCheckin ? '#d1fae5' : '#dbeafe'}; color: ${isLecturerCheckin ? '#065f46' : '#1e40af'}; padding: 2px 10px; border-radius: 12px; font-size: 11px;">${this.escapeHtml(log.session_type || 'Class')}</span></td>
                    <td style="padding: 10px 14px; color: #475569; font-size: 13px;">${timeStr}</td>
                    <td style="padding: 10px 14px; color: #475569; font-size: 12px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${this.escapeHtml(locationDisplay)}</td>
                    <td style="padding: 10px 14px; text-align: center;">
                        <span style="background: ${isVerified ? '#10b98120' : statusColor + '20'}; color: ${isVerified ? '#10b981' : statusColor}; padding: 3px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; display: inline-block;">${isVerified ? '✅ Verified' : displayStatus}</span>
                        ${isVerified && verifiedByDisplay ? `<span style="font-size: 9px; color: #64748b; display: block; margin-top: 2px;">${verifiedByDisplay}</span>` : ''}
                    </td>
                    <td style="padding: 10px 14px; text-align: center;">
                        <div style="display: flex; gap: 4px; justify-content: center; flex-wrap: wrap;">
                            ${hasLocation && !isLecturerCheckin ? `<button onclick="LecturerAttendance.viewAttendanceMap(${log.latitude}, ${log.longitude}, '${this.escapeHtml(studentName)}')" style="background: #4C1D95; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;"><i class="fas fa-map-marker-alt" style="font-size:10px;"></i></button>` : `<span style="color: #94a3b8; font-size: 11px;">${isLecturerCheckin ? '✓' : 'No location'}</span>`}
                            ${canVerify ? `<button onclick="LecturerAttendance.verifyAttendance('${log.id}')" data-verify-id="${log.id}" style="background: #8b5cf6; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 11px;"><i class="fas fa-check" style="font-size:10px;"></i> Verify</button>` : `<span style="color: ${isVerified ? '#10b981' : '#94a3b8'}; font-size: 11px;">${isVerified ? '✅ Verified' : '—'}</span>`}
                            ${this.canDeleteRecord(log) ? `<button onclick="LecturerAttendance.deleteAttendance('${log.id}')" title="Delete this record" style="background: #dc2626; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;"><i class="fas fa-trash-alt" style="font-size:10px;"></i></button>` : ''}
                        </div>
                    </td>
                </tr>`;
        }).join('');
    },

    // ============================================================
    // UPDATE STATS
    // ============================================================
    updateStats(logs) {
        if (!logs) logs = this.todayLogs || [];
        const total = logs.length;
        const present = logs.filter(l => (l.attendance_status || '').toLowerCase() === 'present' || l.is_verified === true).length;
        const absent = logs.filter(l => (l.attendance_status || '').toLowerCase() === 'absent').length;
        const pending = logs.filter(l => { const s = (l.attendance_status || '').toLowerCase(); return s === 'pending' || s === '' || l.attendance_status === null; }).length;
        const rate = total > 0 ? Math.round((present / total) * 100) : 0;

        this.stats = { total, present, absent, pending, rate };
        const threshold = this.getPassingThreshold();

        const elementMap = {
            'todayTotal': total, 'todayPresent': present, 'todayAbsent': absent, 'todayPending': pending,
            'todayRate': rate + '%', 'attendanceRate': rate + '%', 'filteredCount': total,
            'totalStudentsCount': total, 'presentTodayCount': present, 'absentTodayCount': absent,
            'pendingCount': pending, 'todayTotalDisplay': total, 'todayPresentDisplay': present,
            'todayAbsentDisplay': absent, 'todayPendingDisplay': pending, 'attendanceRateDisplay': rate + '%'
        };

        for (const [id, value] of Object.entries(elementMap)) {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        }

        const progressBar = document.getElementById('attendanceProgressBar');
        if (progressBar) {
            progressBar.style.width = rate + '%';
            progressBar.style.background = rate >= threshold ? '#10b981' : (rate >= threshold * 0.7 ? '#f59e0b' : '#ef4444');
        }

        const rateBadge = document.getElementById('attendanceRateBadge');
        if (rateBadge) {
            rateBadge.textContent = `${rate}% (Pass: ≥${threshold}%)`;
            rateBadge.style.background = rate >= threshold ? '#d1fae5' : (rate >= threshold * 0.7 ? '#fef3c7' : '#fee2e2');
            rateBadge.style.color = rate >= threshold ? '#065f46' : (rate >= threshold * 0.7 ? '#92400e' : '#991b1b');
        }
        return this.stats;
    },

    // ============================================================
    // LOAD PAST
    // ============================================================
    async loadPastAttendance() {
        const tbody = document.getElementById('pastAttendanceTable');
        if (!tbody) return;
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) return;
            const todayStr = new Date().toISOString().split('T')[0];

            const { data: logs, error } = await supabase
                .from('geo_attendance_logs')
                .select('*')
                .lt('check_in_time', `${todayStr}T00:00:00.000Z`)
                .order('check_in_time', { ascending: false })
                .limit(100);

            if (error) { console.error(error); return; }
            this.pastLogs = logs || [];
            this.filteredPastLogs = [...this.pastLogs];
            this.renderPastAttendance();
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
            tbody.innerHTML = `<tr><td colspan="10" style="padding:40px;text-align:center;color:#94a3b8;">
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
            const regNumber = this.getDisplayRegNumber(log);
            const displayReg = regNumber.length > 15 ? regNumber.substring(0, 15) + '...' : regNumber;
            const blockDisplay = log.block ? this.getBlockDisplay(log.block) : 'N/A';
            const isLecturerCheckin = log.session_type === 'Lecturer Check-in';
            const locationDisplay = isLecturerCheckin ? 'Lecturer Check-in' : (log.location_address || log.location_friendly_name || log.location_name || 'N/A');
            const canVerify = !isLecturerCheckin && log.role !== 'lecturer' && !isVerified;
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
                            ${hasLocation && !isLecturerCheckin ? `<button onclick="LecturerAttendance.viewAttendanceMap(${log.latitude}, ${log.longitude}, '${this.escapeHtml(studentName)}')" style="background: #4C1D95; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;"><i class="fas fa-map-marker-alt" style="font-size:10px;"></i></button>` : `<span style="color: #94a3b8; font-size: 11px;">${isLecturerCheckin ? '✓' : 'No location'}</span>`}
                            ${canVerify ? `<button onclick="LecturerAttendance.verifyAttendance('${log.id}')" data-verify-id="${log.id}" style="background: #8b5cf6; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 11px;"><i class="fas fa-check" style="font-size:10px;"></i> Verify</button>` : `<span style="color: ${isVerified ? '#10b981' : '#94a3b8'}; font-size: 11px;">${isVerified ? '✅ Verified' : '—'}</span>`}
                            ${this.canDeleteRecord(log) ? `<button onclick="LecturerAttendance.deleteAttendance('${log.id}')" title="Delete this record" style="background: #dc2626; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;"><i class="fas fa-trash-alt" style="font-size:10px;"></i></button>` : ''}
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
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) return;
            const todayStr = new Date().toISOString().split('T')[0];

            const { data: logs } = await supabase
                .from('geo_attendance_logs')
                .select('attendance_status, is_verified')
                .gte('check_in_time', `${todayStr}T00:00:00.000Z`)
                .lte('check_in_time', `${todayStr}T23:59:59.999Z`);

            const total = logs?.length || 0;
            const present = logs?.filter(l => (l.attendance_status || '').toLowerCase() === 'present' || l.is_verified === true).length || 0;
            const absent = logs?.filter(l => (l.attendance_status || '').toLowerCase() === 'absent').length || 0;
            const pending = total - present - absent;
            const rate = total > 0 ? Math.round((present / total) * 100) : 0;

            const cardMap = {
                'totalStudentsCount': total, 'presentTodayCount': present,
                'absentTodayCount': absent, 'pendingCount': pending,
                'attendanceRate': rate + '%'
            };

            for (const [id, value] of Object.entries(cardMap)) {
                const el = document.getElementById(id);
                if (el) el.textContent = value;
            }
        } catch (error) {
            console.error('❌ loadAttendanceStats:', error);
        }
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
                .eq('role', 'student')
                .eq('status', 'approved')
                .not('student_id', 'is', null)
                .not('student_id', 'like', '%-%-%-%-%');

            const blocks = [...new Set(this.assignedUnits.map(u => u.block).filter(Boolean))];
            const currentBlock = blocks.length > 0 ? this.getBlockDisplay(blocks[0]) : 'N/A';
            const programDisplay = window.LecturerUtils?.getProgramDisplayName?.(program) || program;
            const typeLabel = this.getProgramTypeLabel();
            const emoji = this.getProgramEmoji();

            const displayMap = {
                'programDisplayName': `${emoji} ${programDisplay}`,
                'programTypeBadge': typeLabel,
                'currentBlockDisplay': currentBlock,
                'studentCountDisplay': (studentCount || 0) + ' Students'
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

                const today = new Date().toISOString().split('T')[0];
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

            const { error: insertError } = await supabase.from('geo_attendance_logs').insert({
                student_id: studentId,
                student_name: student.full_name || 'Student',
                registration_number: student.student_id || null,
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
            document.getElementById('attDate').value = new Date().toISOString().split('T')[0];

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
    // ✅ NEW: Single-record delete
    // ============================================================
    async deleteAttendance(recordId) {
        if (!recordId) { this.showNotification('Record ID is required', 'error'); return; }
        if (this.isProcessing) return;

        if (!confirm('Delete this attendance record? This cannot be undone.')) return;

        this.isProcessing = true;

        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) throw new Error('Database not available');

            const profile = window.lecturerDB?.getCurrentUserProfile();
            const userId = profile?.user_id || this.lecturerUuid;

            const { error: delError } = await supabase
                .from('geo_attendance_logs')
                .delete()
                .eq('id', recordId)
                .or(`finalized_by.eq.${userId},verified_by.eq.${userId},recorded_by_id.eq.${userId}`);

            if (delError) throw new Error(delError.message);

            this.showNotification('🗑️ Attendance record deleted', 'success');

            await this.loadTodayAttendance();
            await this.loadPastAttendance();
            await this.loadAttendanceStats();
            this.applyFilters();
        } catch (error) {
            console.error('❌ deleteAttendance:', error);
            this.showNotification('Failed to delete: ' + error.message, 'error');
        } finally {
            this.isProcessing = false;
        }
    },

    // ============================================================
    // ✅ NEW: Bulk delete (uses current filters)
    // ============================================================
    async bulkDeleteAttendance() {
        if (this.isProcessing) return;

        const targets = [
            ...(this.filteredTodayLogs || []),
            ...(this.filteredPastLogs || [])
        ].filter(l => l.session_type !== 'Lecturer Check-in');

        if (!targets.length) {
            this.showNotification('No records to delete with current filters.', 'info');
            return;
        }

        const filterDate = document.getElementById('filterDate')?.value || '';
        const filterBlock = document.getElementById('filterBlock')?.value || 'All';
        const filterUnit = document.getElementById('filterUnit')?.value || 'All';
        const filterType = document.getElementById('filterSessionType')?.value || 'All';
        const searchText = document.getElementById('filterSearch')?.value || '';

        const bits = [];
        if (filterDate) bits.push(`Date ${filterDate}`);
        if (filterBlock !== 'All') bits.push(`Block ${filterBlock}`);
        if (filterUnit !== 'All') bits.push(`Unit ${filterUnit}`);
        if (filterType !== 'All') bits.push(`Type ${filterType}`);
        if (searchText) bits.push(`Search "${searchText}"`);
        const context = bits.length ? `matching: ${bits.join(' · ')}` : 'ALL attendance records';

        if (!confirm(
            `⚠️ DELETE ${targets.length} attendance record${targets.length === 1 ? '' : 's'}?\n\n` +
            `Filters: ${context}\n\n` +
            `This cannot be undone.`
        )) return;

        this.isProcessing = true;
        this.showNotification(`Deleting ${targets.length} records...`, 'info');

        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) throw new Error('Database not available');

            const profile = window.lecturerDB?.getCurrentUserProfile();
            const userId = profile?.user_id || this.lecturerUuid;

            const ids = targets.map(t => t.id).filter(Boolean);
            if (!ids.length) throw new Error('No valid record IDs');

            const CHUNK = 500;
            let deleted = 0;
            for (let i = 0; i < ids.length; i += CHUNK) {
                const slice = ids.slice(i, i + CHUNK);
                const { error: delError, count } = await supabase
                    .from('geo_attendance_logs')
                    .delete({ count: 'exact' })
                    .in('id', slice)
                    .or(`finalized_by.eq.${userId},verified_by.eq.${userId},recorded_by_id.eq.${userId}`);

                if (delError) throw new Error(delError.message);
                deleted += (count || slice.length);
            }

            this.showNotification(`🗑️ Deleted ${deleted} record${deleted === 1 ? '' : 's'}`, 'success');

            await this.loadTodayAttendance();
            await this.loadPastAttendance();
            await this.loadAttendanceStats();
            this.applyFilters();
        } catch (error) {
            console.error('❌ bulkDeleteAttendance:', error);
            this.showNotification('Failed to delete: ' + error.message, 'error');
        } finally {
            this.isProcessing = false;
        }
    },

    // ============================================================
    // POPULATE FILTERS
    // ============================================================
    populateFilters() {
        const today = new Date().toISOString().split('T')[0];
        const filterDate = document.getElementById('filterDate');
        if (filterDate) filterDate.value = today;
        const attDate = document.getElementById('attDate');
        if (attDate) attDate.value = today;

        this.populateStudentSelect();
        this.populateBlockFilter();
        this.populateUnitFilter();
        this.updateFilterLabels();
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
                .eq('role', 'student')
                .eq('status', 'approved')
                .not('student_id', 'is', null)
                .not('student_id', 'like', '%-%-%-%-%')
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
    // APPLY / RESET FILTERS
    // ============================================================
    applyFilters() {
        const filterDate = (document.getElementById('filterDate')?.value || '').trim();
        const filterBlock = (document.getElementById('filterBlock')?.value || 'All').trim();
        const filterUnit = (document.getElementById('filterUnit')?.value || 'All').trim();
        const filterYear = (document.getElementById('filterYear')?.value || 'All').trim();
        const filterSessionType = (document.getElementById('filterSessionType')?.value || 'All').trim();
        const searchText = (document.getElementById('filterSearch')?.value || '').trim().toLowerCase();

        const unitFilterActive = filterUnit !== 'All';

        let filteredToday = [...(this.todayLogs || [])];
        if (filterDate) filteredToday = filteredToday.filter(l => l.check_in_time && new Date(l.check_in_time).toISOString().split('T')[0] === filterDate);
        if (filterBlock !== 'All') filteredToday = filteredToday.filter(l => String(l.block || '').toLowerCase() === filterBlock.toLowerCase());
        if (filterUnit !== 'All') filteredToday = filteredToday.filter(l => {
            const u = String(l.unit_name || l.target_name || '').trim().toLowerCase();
            return u === filterUnit.toLowerCase();
        });
        if (filterYear !== 'All') filteredToday = filteredToday.filter(l => String(l.intake_year || '').toLowerCase() === filterYear.toLowerCase());
        if (filterSessionType !== 'All') filteredToday = filteredToday.filter(l => String(l.session_type || '').toLowerCase() === filterSessionType.toLowerCase());
        if (searchText) filteredToday = filteredToday.filter(l => {
            const h = [l.student_name, l.registration_number, l.student_id, l.unit_name, l.target_name, l.session_type, l.block, l.program].filter(Boolean).join(' ').toLowerCase();
            return h.includes(searchText);
        });

        let filteredPast = [...(this.pastLogs || [])];
        if (filterBlock !== 'All') filteredPast = filteredPast.filter(l => String(l.block || '').toLowerCase() === filterBlock.toLowerCase());
        if (filterUnit !== 'All') filteredPast = filteredPast.filter(l => {
            const u = String(l.unit_name || l.target_name || '').trim().toLowerCase();
            return u === filterUnit.toLowerCase();
        });
        if (filterYear !== 'All') filteredPast = filteredPast.filter(l => String(l.intake_year || '').toLowerCase() === filterYear.toLowerCase());
        if (filterSessionType !== 'All') filteredPast = filteredPast.filter(l => String(l.session_type || '').toLowerCase() === filterSessionType.toLowerCase());
        if (searchText) filteredPast = filteredPast.filter(l => {
            const h = [l.student_name, l.registration_number, l.student_id, l.unit_name, l.target_name, l.session_type, l.block, l.program].filter(Boolean).join(' ').toLowerCase();
            return h.includes(searchText);
        });

        filteredToday = filteredToday.filter(l => !this.isPlaceholderLog(l));
        filteredPast = filteredPast.filter(l => !this.isPlaceholderLog(l));

        this.filteredTodayLogs = filteredToday;
        this.filteredPastLogs = filteredPast;

        this.renderFilteredToday(filteredToday);
        this.renderFilteredPast(filteredPast);

        const filterCount = document.getElementById('attendanceFilterCount');
        if (filterCount) {
            const unitBit = unitFilterActive ? ` · Unit: ${filterUnit}` : '';
            filterCount.textContent = `Showing ${filteredToday.length} of ${this.todayLogs.length} today · ${filteredPast.length} past${unitBit}`;
        }
    },

    renderFilteredToday(logs) {
        const tbody = document.getElementById('attendanceTable');
        if (!tbody) return;
        const countEl = document.getElementById('todayLogCount');
        if (countEl) countEl.textContent = `${logs.length} records`;
        if (!logs?.length) {
            tbody.innerHTML = `<tr><td colspan="10" style="padding:40px;text-align:center;color:#94a3b8;">
                <i class="fas fa-filter" style="font-size:32px;display:block;margin-bottom:10px;color:#e2e8f0;"></i>
                <p style="margin:0;">No attendance records match your filters.</p></td></tr>`;
            return;
        }
        const original = this.todayLogs;
        this.todayLogs = logs;
        this.renderTodayAttendance();
        this.todayLogs = original;
    },

    renderFilteredPast(logs) {
        const tbody = document.getElementById('pastAttendanceTable');
        if (!tbody) return;
        const countEl = document.getElementById('pastLogCount');
        if (countEl) countEl.textContent = `${logs.length} records`;
        if (!logs?.length) {
            tbody.innerHTML = `<tr><td colspan="10" style="padding:40px;text-align:center;color:#94a3b8;">
                <i class="fas fa-filter" style="font-size:32px;display:block;margin-bottom:10px;color:#e2e8f0;"></i>
                <p style="margin:0;">No past records match your filters.</p></td></tr>`;
            return;
        }
        const original = this.pastLogs;
        this.pastLogs = logs;
        this.renderPastAttendance();
        this.pastLogs = original;
    },

    resetFilters() {
        const today = new Date().toISOString().split('T')[0];
        const fDate = document.getElementById('filterDate'); if (fDate) fDate.value = today;
        const fBlock = document.getElementById('filterBlock'); if (fBlock) fBlock.value = 'All';
        const fUnit = document.getElementById('filterUnit'); if (fUnit) fUnit.value = 'All';
        const fYear = document.getElementById('filterYear'); if (fYear) fYear.value = 'All';
        const fType = document.getElementById('filterSessionType'); if (fType) fType.value = 'All';
        const fSearch = document.getElementById('filterSearch'); if (fSearch) fSearch.value = '';

        this.renderTodayAttendance();
        this.renderPastAttendance();
        this.updateStats(this.todayLogs);

        const filterCount = document.getElementById('attendanceFilterCount');
        if (filterCount) filterCount.textContent = `Showing all ${this.getProgramTypeLabel()} records`;
        this.showNotification('Filters reset!', 'info');
    },

    // ============================================================
    // ✅ MODERN STYLED XLSX EXPORT (ExcelJS)
    //   - P (Pending) counts as Present → renders as ✓
    //   - Includes ALL students in the block, not just those with logs
    // ============================================================
    async exportCSV() {
        if (typeof ExcelJS === 'undefined') {
            this.showNotification('Excel library still loading — try again in a moment.', 'warning');
            return;
        }

        const filterBlock = (document.getElementById('filterBlock')?.value || 'All').trim();
        const filterYear = (document.getElementById('filterYear')?.value || 'All').trim();
        const filterSessionType = (document.getElementById('filterSessionType')?.value || 'All').trim();
        const filterUnit = (document.getElementById('filterUnit')?.value || 'All').trim();
        const filterDate = (document.getElementById('filterDate')?.value || '').trim();
        const searchText = (document.getElementById('filterSearch')?.value || '').trim().toLowerCase();

        const hasFilters = (filterBlock !== 'All') || (filterYear !== 'All') || (filterSessionType !== 'All') || (filterUnit !== 'All') || !!searchText;

        let source = [...(this.todayLogs || []), ...(this.pastLogs || [])]
            .filter(l => l.session_type !== 'Lecturer Check-in');

        if (filterDate) source = source.filter(l => l.check_in_time && new Date(l.check_in_time).toISOString().split('T')[0] === filterDate);
        if (filterBlock !== 'All') source = source.filter(l => String(l.block || '').toLowerCase() === filterBlock.toLowerCase());
        if (filterUnit !== 'All') source = source.filter(l => {
            const u = String(l.unit_name || l.target_name || '').trim().toLowerCase();
            return u === filterUnit.toLowerCase();
        });
        if (filterYear !== 'All') source = source.filter(l => String(l.intake_year || '').toLowerCase() === filterYear.toLowerCase());
        if (filterSessionType !== 'All') source = source.filter(l => String(l.session_type || '').toLowerCase() === filterSessionType.toLowerCase());
        if (searchText) source = source.filter(l => {
            const h = [l.student_name, l.registration_number, l.student_id, l.unit_name, l.target_name, l.session_type, l.block, l.program].filter(Boolean).join(' ').toLowerCase();
            return h.includes(searchText);
        });

        source = source.filter(l => !this.isPlaceholderLog(l));

        if (!source.length) {
            this.showNotification(hasFilters ? 'No records match the current filters.' : 'No attendance data to export.', 'warning');
            return;
        }

        const typeLabel = this.getProgramTypeLabel();

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

        // Load full roster for each class
        for (const cls of classList) {
            try {
                const roster = await this.getRosterForClass(cls);
                cls.roster = roster;
            } catch (err) {
                console.warn('⚠️ Could not load roster for', cls.unit, err);
                const seen = new Map();
                cls.logs.forEach(l => {
                    const reg = this.getDisplayRegNumber(l);
                    if (!seen.has(reg)) seen.set(reg, (l.student_name || 'Unknown').trim());
                });
                cls.roster = [...seen.entries()].map(([reg, name]) => ({ reg, name }));
            }
        }

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

        const usedNames = new Set();

        for (const cls of classList) {
            const dateSet = new Set();
            cls.logs.forEach(log => {
                if (!log.check_in_time) return;
                dateSet.add(new Date(log.check_in_time).toISOString().split('T')[0]);
            });
            const sortedDates = [...dateSet].sort();
            const dateDisplayMap = {};
            sortedDates.forEach(iso => {
                const [y, m, d] = iso.split('-');
                dateDisplayMap[iso] = `${d}/${m}`;
            });

            const studentMap = {};
            cls.roster.forEach(s => {
                studentMap[s.reg] = { reg: s.reg, name: s.name, byDate: {} };
            });

            cls.logs.forEach(log => {
                const reg = this.getDisplayRegNumber(log);
                if (!studentMap[reg]) {
                    studentMap[reg] = { reg, name: (log.student_name || 'Unknown').trim(), byDate: {} };
                }

                const iso = log.check_in_time ? new Date(log.check_in_time).toISOString().split('T')[0] : null;
                if (!iso) return;

                const status = String(log.attendance_status || '').toLowerCase();
                const verified = log.is_verified === true;

                // ✅ P (Pending) counts as PRESENT → renders as ✓
                let mark = '-';
                if (verified || status === 'present' || status === 'verified' || status === 'pending' || status === '' || status === 'late') {
                    mark = '✓';
                } else if (status === 'absent') {
                    mark = 'A';
                } else if (status === 'excused') {
                    mark = 'E';
                }

                const rank = { '✓': 4, 'E': 3, 'A': 2, '-': 1 };
                const prev = studentMap[reg].byDate[iso];
                if (!prev || rank[mark] > rank[prev]) studentMap[reg].byDate[iso] = mark;
            });

            const students = Object.values(studentMap).sort((a, b) =>
                a.reg.localeCompare(b.reg, undefined, { numeric: true })
            );

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

            const totalCols = 3 + sortedDates.length + 1;

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
                if (filterUnit !== 'All') bits.push(`Unit ${filterUnit}`);
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

            mergeRow(r++, '✓ = Present (includes P/Pending & Late)   ·   A = Absent   ·   E = Excused   ·   - = Not Recorded', {
                font: { italic: true, color: { argb: 'FF475569' }, size: 10 }, height: 18
            });

            r++;

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
                    else if (mark === 'A') { fill = RED_LIGHT; fontColor = RED; }
                    else if (mark === 'E') { fill = AMBER_LIGHT; fontColor = AMBER; }

                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
                    cell.font = { bold: mark !== '-', color: { argb: fontColor }, size: 12 };
                    if (mark === '✓') present++;
                });

                const totalCell = row.getCell(4 + sortedDates.length);
                totalCell.value = `${present}/${sortedDates.length}`;
                totalCell.alignment = { horizontal: 'center', vertical: 'middle' };
                totalCell.font = { bold: true, color: { argb: DARK }, size: 11 };
                totalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PURPLE_LIGHT } };

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

            r++;
            const totalStudents = students.length;
            const totalSessions = sortedDates.length;
            const totalPossible = totalStudents * totalSessions;
            const totalPresent = students.reduce((s, x) => s + Object.values(x.byDate).filter(v => v === '✓').length, 0);
            const rate = totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 0;

            ws.mergeCells(r, 1, r, totalCols);
            const sumCell = ws.getCell(r, 1);
            sumCell.value = `SUMMARY  ·  Students: ${totalStudents}   Sessions: ${totalSessions}   Present: ${totalPresent}/${totalPossible}   Rate: ${rate}%`;
            sumCell.alignment = { horizontal: 'center', vertical: 'middle' };
            sumCell.font = { bold: true, color: { argb: 'FF065F46' }, size: 11 };
            sumCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN_LIGHT } };
            ws.getRow(r).height = 24;
            r += 2;

            ws.mergeCells(r, 1, r, totalCols);
            const sigHeader = ws.getCell(r, 1);
            sigHeader.value = 'AUTHORIZATION & VERIFICATION';
            sigHeader.alignment = { horizontal: 'center', vertical: 'middle' };
            sigHeader.font = { bold: true, color: { argb: PURPLE }, size: 12 };
            sigHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PURPLE_LIGHT } };
            ws.getRow(r).height = 22;
            r++;

            const sigRow = (label) => {
                if (totalCols >= 2) ws.mergeCells(r, 1, r, 2);
                const labelCell = ws.getCell(r, 1);
                labelCell.value = label;
                labelCell.font = { bold: true, size: 11, color: { argb: DARK } };
                labelCell.alignment = { horizontal: 'left', vertical: 'middle' };

                const lineCell = ws.getCell(r, 3);
                lineCell.value = '_______________________';
                lineCell.alignment = { horizontal: 'center', vertical: 'middle' };
                lineCell.font = { size: 11 };

                if (totalCols >= 5) ws.mergeCells(r, 4, r, 5);
                const sigCell = ws.getCell(r, 4);
                sigCell.value = 'Signature: ______________';
                sigCell.font = { size: 11 };
                sigCell.alignment = { horizontal: 'left', vertical: 'middle' };

                if (totalCols > 6) ws.mergeCells(r, 6, r, totalCols);
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

            const widths = [];
            widths.push({ width: 7 });
            widths.push({ width: 22 });
            widths.push({ width: 30 });
            sortedDates.forEach(() => widths.push({ width: 8 }));
            widths.push({ width: 10 });
            ws.columns = widths;

            ws.views = [{ state: 'frozen', xSplit: 3, ySplit: headerRowIdx }];
        }

        const suffixBits = [];
        if (filterBlock !== 'All') suffixBits.push(filterBlock.replace(/\s+/g, ''));
        if (filterUnit !== 'All') suffixBits.push(filterUnit.replace(/\s+/g, ''));
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

            const totalStudentsExported = classList.reduce((s, c) => s + c.roster.length, 0);
            this.showNotification(
                `✅ Exported ${classList.length} sheet${classList.length === 1 ? '' : 's'} — ${totalStudentsExported} students${hasFilters ? ' (filtered)' : ''}`,
                'success'
            );
        } catch (err) {
            console.error('❌ Export error:', err);
            this.showNotification('Export failed: ' + err.message, 'error');
        }
    },

    // ============================================================
    // ✅ NEW: Full roster for one (block × program × intake) class
    // ============================================================
    async getRosterForClass(cls) {
        const supabase = window.lecturerDB?.supabase;
        if (!supabase) return [];

        const program = cls.program || this.currentProgram || 'KRCHN';
        const block = cls.block;
        const intake = cls.intake;

        let query = supabase
            .from('consolidated_user_profiles_table')
            .select('user_id, full_name, student_id, admission_number, program, block, intake_year, role')
            .eq('role', 'student')
            .eq('status', 'approved')
            .eq('program', program)
            .not('student_id', 'is', null)
            .not('student_id', 'like', '%-%-%-%-%');

        if (block && block !== 'N/A') query = query.eq('block', block);
        if (intake && intake !== 'N/A') query = query.eq('intake_year', String(intake));

        const { data, error } = await query.order('full_name');
        if (error) throw error;

        return (data || []).map(s => ({
            reg:
                (s.admission_number && String(s.admission_number).trim()) ||
                (s.student_id && String(s.student_id).trim()) ||
                s.user_id,
            name: s.full_name || 'Unknown Student'
        }));
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

        ['filterDate', 'filterBlock', 'filterUnit', 'filterYear', 'filterSessionType'].forEach(id => {
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
    // ============================================================
    async getSessionRoster(session) {
        const supabase = window.lecturerDB?.supabase;
        if (!supabase || !session?.id) return [];

        const program = session.target_program || session.program || this.currentProgram || 'KRCHN';
        const block = session.block_term || session.block;
        const intake = session.intake_year;

        let query = supabase
            .from('consolidated_user_profiles_table')
            .select('user_id, full_name, student_id, admission_number, program, block, intake_year, role')
            .eq('role', 'student')
            .eq('program', program)
            .eq('status', 'approved')
            .not('student_id', 'is', null)
            .not('student_id', 'like', '%-%-%-%-%');

        if (block) query = query.eq('block', block);
        if (intake !== null && intake !== undefined && String(intake) !== '') {
            query = query.eq('intake_year', String(intake));
        }

        const { data, error } = await query.order('full_name', { ascending: true });
        if (error) throw error;

        return (data || []).map(student => {
            const regNumber =
                (student.admission_number && String(student.admission_number).trim()) ||
                (student.student_id && String(student.student_id).trim()) ||
                student.user_id;

            return {
                user_id: student.user_id,
                name: student.full_name || 'Unknown Student',
                registration_number: regNumber,
                student_id: student.student_id || student.admission_number || null,
                program: student.program || program,
                block: student.block || block || null,
                intake_year: student.intake_year || intake || null
            };
        });
    },

    async getSessionAttendanceRegister(session, finalize = false) {
        const supabase = window.lecturerDB?.supabase;
        if (!supabase || !session?.id) return { roster: [], logs: [], rows: [], summary: { total: 0, present: 0, absent: 0, pending: 0, notCheckedIn: 0, rate: 0 } };

        const roster = await this.getSessionRoster(session);

        const { data: logs, error } = await supabase
            .from('geo_attendance_logs')
            .select('*')
            .eq('session_id', session.id)
            .neq('role', 'lecturer')
            .order('check_in_time', { ascending: true });

        if (error) throw error;

        const byStudent = new Map();
        (logs || []).forEach(log => {
            const key = String(log.user_id || log.student_id || log.registration_number || '').trim();
            if (!key) return;
            const previous = byStudent.get(key);
            const status = String(log.attendance_status || '').toLowerCase();
            const prevStatus = String(previous?.attendance_status || '').toLowerCase();
            const currentIsPresent = status === 'present' || status === 'verified' || log.is_verified === true;
            const previousIsPresent = prevStatus === 'present' || prevStatus === 'verified' || previous?.is_verified === true;

            if (!previous || (currentIsPresent && !previousIsPresent) ||
                (!currentIsPresent && !previousIsPresent &&
                 new Date(log.check_in_time || 0) > new Date(previous.check_in_time || 0))) {
                byStudent.set(key, log);
            }
        });

        const rows = [];
        const missing = [];
        const rosterKeys = new Set();

        for (const student of roster) {
            const keys = [
                student.user_id,
                student.student_id,
                student.registration_number
            ].filter(Boolean).map(String);

            keys.forEach(k => rosterKeys.add(k));

            let log = null;
            for (const key of keys) {
                if (byStudent.has(key)) {
                    log = byStudent.get(key);
                    break;
                }
            }

            const status = String(log?.attendance_status || '').toLowerCase();

            const DEFAULT_RADIUS_M = 150;
            const radius = Number(log?.target_radius ?? session?.target_radius ?? DEFAULT_RADIUS_M);
            const distance = Number(log?.distance_meters ?? Infinity);

            const hasValidStatus =
                status === 'present' || status === 'verified' || log?.is_verified === true;
            const inRadius = distance <= radius;
            const validPresent = !!log && hasValidStatus && inRadius;

            let finalStatus = validPresent ? 'Present' : (log ? 'Absent' : 'Not Checked In');
            if (log && !validPresent) finalStatus = 'Absent';

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

            for (const item of missing) {
                const { student, existingLog } = item;

                if (existingLog?.id) {
                    updates.push(
                        supabase
                            .from('geo_attendance_logs')
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
                        student_id: student.student_id || student.registration_number,
                        registration_number: student.registration_number,
                        student_name: student.name,
                        block: student.block,
                        intake_year: student.intake_year,
                        program: student.program,
                        check_in_time: now,
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
                const { error: insertError } = await supabase
                    .from('geo_attendance_logs')
                    .insert(inserts);
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
        const targetDate = date || document.getElementById('filterDate')?.value || new Date().toISOString().split('T')[0];
        if (!confirm(`Verify ALL unverified attendance records for ${targetDate}?`)) return;
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) throw new Error('Database not available');
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const lecturerName = profile?.full_name || 'Lecturer';
            const lecturerId = profile?.user_id || this.lecturerUuid || 'unknown';

            const { data: records } = await supabase
                .from('geo_attendance_logs')
                .select('id')
                .eq('is_verified', false)
                .neq('session_type', 'Lecturer Check-in')
                .gte('check_in_time', `${targetDate}T00:00:00.000Z`)
                .lte('check_in_time', `${targetDate}T23:59:59.999Z`);

            if (!records?.length) {
                this.showNotification('No unverified records found.', 'info');
                return;
            }

            const { error: updateError } = await supabase
                .from('geo_attendance_logs')
                .update({
                    is_verified: true, attendance_status: 'Verified',
                    verified_by: lecturerId, verified_by_name: lecturerName,
                    verified_at: new Date().toISOString(),
                    verification_source: 'Bulk Verification'
                })
                .in('id', records.map(r => r.id));

            if (updateError) throw new Error(updateError.message);

            this.showNotification(`✅ ${records.length} records verified!`, 'success');
            await this.loadTodayAttendance();
            await this.loadPastAttendance();
            await this.loadAttendanceStats();
        } catch (error) {
            console.error('❌ bulkVerifyAttendance:', error);
            this.showNotification('Failed: ' + error.message, 'error');
        } finally {
            this.isProcessing = false;
        }
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
window.exportAttendanceCSV = () => LecturerAttendance.exportCSV();
window.printAttendanceReport = () => LecturerAttendance.printReport();
window.lecturerCheckin = () => LecturerAttendance.lecturerCheckIn();
window.markAttendance = (e) => LecturerAttendance.markStudentAttendance(e);
window.verifyAttendance = (id) => LecturerAttendance.verifyAttendance(id);
window.bulkVerifyAttendance = (date) => LecturerAttendance.bulkVerifyAttendance(date);

window.deleteAttendance = (id) => LecturerAttendance.deleteAttendance(id);
window.bulkDeleteAttendance = () => LecturerAttendance.bulkDeleteAttendance();
window.canDeleteRecord = (record) => LecturerAttendance.canDeleteRecord(record);

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
console.log('📋 Features: Today/Past, Stats, Check-in, Map, Styled XLSX Export, Print, Verify, Bulk Verify, Unit filter, Delete (single + bulk)');
console.log(`📊 TVET Support: Enabled (${LecturerAttendance.getProgramTypeLabel()})`);
console.log('🎨 Export: Modern styled .xlsx — P (Pending) counted as Present');
console.log('👥 Export: Includes ALL students in each block, even those with no check-ins');
console.log('🗑️ Delete: Single + bulk, owner-only via RLS');
