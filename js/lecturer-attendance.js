// ============================================================
// NCHSM LECTURER ATTENDANCE MODULE - WITH TVET SUPPORT
// ============================================================
// Handles:
//   1. Today's attendance display (with filters)
//   2. Past attendance records (with filters, last 100)
//   3. Attendance statistics (present, absent, pending, rate)
//   4. Lecturer self check-in with GPS
//   5. Manual student attendance marking
//   6. Attendance map view (Leaflet)
//   7. CSV export and print — WITH CONTINUOUS CLASS GROUPING
//   8. Search and filter (date, block, year, session type, text)
//   9. Single and Bulk Attendance Verification
// Supports both Nursing (KRCHN) and TVET programs
// ============================================================

const LecturerAttendance = {
    // ============================================================
    // STATE
    // ============================================================
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
    stats: {
        total: 0,
        present: 0,
        absent: 0,
        pending: 0,
        rate: 0
    },

    // ============================================================
    // PROGRAM TYPE DETECTION
    // ============================================================
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

    getPassingThreshold() {
        return this.isTVETProgram() ? 50 : 60;
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

    // ============================================================
    // INITIALIZATION
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
            console.log(`📊 ${this.getProgramTypeLabel()} attendance tracking enabled`);

            // Auto-refresh — also re-applies current filters
            setInterval(() => {
                console.log('🔄 Auto-refreshing attendance...');
                this.loadAllAttendance().then(() => this.applyFilters());
            }, 60000);

        } catch (error) {
            console.error('❌ Failed to initialize attendance module:', error);
            this.showError('Failed to initialize: ' + error.message);
        }
    },

    // ============================================================
    // UPDATE PROGRAM BADGE
    // ============================================================
    updateProgramBadge() {
        const typeLabel = this.getProgramTypeLabel();
        const emoji = this.getProgramEmoji();
        const threshold = this.getPassingThreshold();

        const programDisplay = document.getElementById('programDisplayName');
        if (programDisplay) {
            programDisplay.textContent = `${this.currentProgram} (${typeLabel})`;
        }

        const programTypeBadge = document.getElementById('programTypeBadge');
        if (programTypeBadge) {
            programTypeBadge.textContent = typeLabel;
            programTypeBadge.style.background = this.isTVET ? 'rgba(139,92,246,0.3)' : 'rgba(76,29,149,0.3)';
            programTypeBadge.style.color = this.isTVET ? '#7c3aed' : '#1e40af';
        }

        const blockDisplay = document.getElementById('currentBlockDisplay');
        if (blockDisplay) {
            const blocks = [...new Set(this.assignedUnits.map(u => u.block).filter(Boolean))];
            if (blocks.length > 0) {
                blockDisplay.textContent = this.getBlockDisplay(blocks[0]);
            }
        }

        const rateBadge = document.getElementById('attendanceRateBadge');
        if (rateBadge) {
            const rate = this.stats.rate || 0;
            rateBadge.textContent = `${rate}% (Pass: ≥${threshold}%)`;
        }

        const subtitle = document.querySelector('#attendance-content .subtitle');
        if (subtitle) {
            subtitle.textContent = `${emoji} ${typeLabel} - Track and manage student attendance`;
        }
    },

    // ============================================================
    // RESOLVE LECTURER ID
    // ============================================================
    async resolveLecturerId() {
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) { console.warn('⚠️ Supabase not available'); return; }

            const profile = window.lecturerDB?.getCurrentUserProfile();
            if (!profile) { console.warn('⚠️ No lecturer profile found'); return; }

            const authId = profile.user_id;
            const fullName = profile.full_name;

            console.log('🔍 Auth ID:', authId);
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

            this.lecturerAssignmentId = authId;
            console.log('⚠️ Falling back to auth ID:', this.lecturerAssignmentId);

        } catch (error) {
            console.error('❌ Error resolving lecturer ID:', error);
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
            if (!supabase) { console.warn('⚠️ Supabase not available'); return; }

            const profile = window.lecturerDB?.getCurrentUserProfile();
            if (!profile) { console.warn('⚠️ No lecturer profile found'); return; }

            const lecturerId = this.lecturerAssignmentId || profile.user_id;
            const program = this.currentProgram || profile.program || 'KRCHN';

            const { data: assignments, error } = await supabase
                .from('lecturer_subject_assignments')
                .select('subject_name, subject_code, block, program, academic_year')
                .eq('lecturer_id', String(lecturerId))
                .eq('program', program);

            if (error) { console.error('❌ Error loading assigned units:', error); return; }

            this.assignedUnits = assignments || [];
            console.log(`📚 Loaded ${this.assignedUnits.length} assigned units (${this.getProgramTypeLabel()})`);

            this.populateUnitSelectors();
            this.updateProgramBadge();

        } catch (error) {
            console.error('❌ Failed to load assigned units:', error);
        }
    },

    // ============================================================
    // POPULATE UNIT SELECTORS
    // ============================================================
    populateUnitSelectors() {
        const unitSelect = document.getElementById('attUnit');
        if (!unitSelect) return;

        const units = this.assignedUnits;
        const typeLabel = this.getProgramTypeLabel();
        const emoji = this.getProgramEmoji();

        if (units && units.length > 0) {
            unitSelect.innerHTML = `<option value="">-- ${emoji} Select Unit --</option>` +
                units.map(u => {
                    const blockDisplay = this.getBlockDisplay(u.block);
                    return `<option value="${u.subject_name}">
                        ${u.subject_code ? u.subject_code + ' - ' : ''}${u.subject_name}
                        ${u.block ? ' (' + blockDisplay + ')' : ''}
                        ${this.isTVET ? ' 🔧' : ''}
                    </option>`;
                }).join('');
            console.log(`📚 Populated ${units.length} units in dropdown (${typeLabel})`);
        } else {
            unitSelect.innerHTML = `<option value="">-- No ${typeLabel} units assigned --</option>`;
        }
    },

    // ============================================================
    // LOAD ALL ATTENDANCE DATA
    // ============================================================
    async loadAllAttendance() {
        console.log('📊 Loading all attendance data...');
        try {
            await Promise.all([
                this.loadTodayAttendance(),
                this.loadPastAttendance(),
                this.loadAttendanceStats(),
                this.loadProgramInfo()
            ]);
            console.log('✅ All attendance data loaded');
        } catch (error) {
            console.error('❌ Failed to load attendance data:', error);
        }
    },

    // ============================================================
    // LOAD TODAY'S ATTENDANCE
    // ============================================================
    async loadTodayAttendance() {
        const tbody = document.getElementById('attendanceTable');
        if (!tbody) { console.warn('⚠️ attendanceTable not found'); return; }

        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) {
                tbody.innerHTML = '<tr><td colspan="10" style="padding:30px;text-align:center;color:#ef4444;">Database not available</td></tr>';
                return;
            }

            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];

            const { data: logs, error } = await supabase
                .from('geo_attendance_logs')
                .select('*')
                .gte('check_in_time', `${todayStr}T00:00:00.000Z`)
                .lte('check_in_time', `${todayStr}T23:59:59.999Z`)
                .order('check_in_time', { ascending: false });

            if (error) {
                console.error('❌ Error loading today attendance:', error);
                tbody.innerHTML = `<tr><td colspan="10" style="padding:30px;text-align:center;color:#ef4444;">Error: ${error.message}</td></tr>`;
                return;
            }

            this.todayLogs = logs || [];
            this.filteredTodayLogs = [...this.todayLogs];
            console.log(`📊 Loaded ${this.todayLogs.length} today's attendance records`);

            this.renderTodayAttendance();
            this.updateStats(this.todayLogs);
            this.updateProgramBadge();

        } catch (error) {
            console.error('❌ Failed to load today attendance:', error);
            tbody.innerHTML = `<tr><td colspan="10" style="padding:30px;text-align:center;color:#ef4444;">Error: ${error.message}</td></tr>`;
        }
    },

    // ============================================================
    // RENDER TODAY'S ATTENDANCE
    // ============================================================
    renderTodayAttendance() {
        const tbody = document.getElementById('attendanceTable');
        if (!tbody) return;

        const logs = this.todayLogs;
        const typeLabel = this.getProgramTypeLabel();

        const countEl = document.getElementById('todayLogCount');
        if (countEl) countEl.textContent = `${logs.length} records`;

        if (!logs || logs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" style="padding:40px;text-align:center;color:#94a3b8;">
                        <i class="fas fa-calendar-day" style="font-size:32px;display:block;margin-bottom:10px;color:#e2e8f0;"></i>
                        <p style="margin:0;">No student attendance records today. (${typeLabel})</p>
                    </td>
                </tr>
            `;
            return;
        }

        const statusColors = {
            'Present': '#10b981',
            'Absent': '#ef4444',
            'Pending': '#f59e0b',
            'Late': '#f59e0b',
            'Excused': '#3b82f6',
            'Verified': '#10b981'
        };

        tbody.innerHTML = logs.map((log) => {
            const hasLocation = log.latitude && log.longitude;

            const isVerified = log.is_verified === true ||
                              log.is_verified === 'true' ||
                              log.is_verified === 1 ||
                              log.attendance_status === 'Verified' ||
                              (log.attendance_status === 'Present' && log.verified_at !== null);

            let displayStatus = log.attendance_status || 'Pending';
            if (isVerified && displayStatus !== 'Absent') displayStatus = 'Verified ✓';

            const statusColor = statusColors[displayStatus] || '#6b7280';

            const studentName = log.student_name || 'Unknown Student';
            const regNumber = log.registration_number || log.student_id || 'N/A';
            const displayReg = regNumber.length > 15 ? regNumber.substring(0, 15) + '...' : regNumber;
            const blockDisplay = log.block ? this.getBlockDisplay(log.block) : 'N/A';
            const programDisplay = log.program || 'N/A';
            const checkInDate = log.check_in_time ? new Date(log.check_in_time) : null;
            const timeStr = checkInDate ? checkInDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
            const isLecturerCheckin = log.session_type === 'Lecturer Check-in';
            const locationDisplay = isLecturerCheckin ? 'Lecturer Check-in' :
                (log.location_address || log.location_friendly_name || log.location_name || 'N/A');

            const canVerify = !isLecturerCheckin &&
                              log.session_type !== 'Lecturer Check-in' &&
                              log.role !== 'lecturer' &&
                              !isVerified;

            const verifiedByDisplay = log.verified_by_name ? `by ${log.verified_by_name}` : '';
            const isTVET = this.isTVET;

            return `
                <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s; ${isVerified ? 'background: #f0fdf4;' : ''} ${isLecturerCheckin ? 'background: #f0fdf4;' : ''}"
                    onmouseover="this.style.background='${isVerified || isLecturerCheckin ? '#dcfce7' : '#f8fafc'}'"
                    onmouseout="this.style.background='${isVerified || isLecturerCheckin ? '#f0fdf4' : 'transparent'}'">

                    <td style="padding: 10px 14px; font-weight: 500; color: #1e293b; font-size: 13px;">
                        ${this.escapeHtml(studentName)}
                        ${isLecturerCheckin ? ' <span style="font-size:10px;background:#10b981;color:white;padding:1px 8px;border-radius:10px;">👨‍🏫</span>' : ''}
                        ${isVerified && !isLecturerCheckin ? ' <span style="font-size:10px;background:#10b981;color:white;padding:1px 8px;border-radius:10px;">✓</span>' : ''}
                        ${isTVET && !isLecturerCheckin ? ' <span style="font-size:9px;color:#8b5cf6;padding:1px 6px;border-radius:8px;">TVET</span>' : ''}
                    </td>
                    <td style="padding: 10px 14px; font-weight: 600; color: #4C1D95; font-size: 12px;" title="${this.escapeHtml(regNumber)}">${this.escapeHtml(displayReg)}</td>
                    <td style="padding: 10px 14px; color: #475569; font-size: 12px;">
                        <span style="background: ${programDisplay === 'KRCHN' ? '#dbeafe' : '#fef3c7'}; color: ${programDisplay === 'KRCHN' ? '#1e40af' : '#92400e'}; padding: 2px 10px; border-radius: 12px; font-size: 11px;">${this.escapeHtml(programDisplay)}</span>
                    </td>
                    <td style="padding: 10px 14px; color: #475569; font-size: 13px;">
                        ${this.escapeHtml(blockDisplay)}
                        ${isTVET ? `<div style="font-size: 8px; color: #8b5cf6;">TVET Term</div>` : ''}
                    </td>
                    <td style="padding: 10px 14px; color: #475569; font-size: 13px;">${this.escapeHtml(log.unit_name || log.target_name || 'General')}</td>
                    <td style="padding: 10px 14px;">
                        <span style="background: ${isLecturerCheckin ? '#d1fae5' : '#dbeafe'}; color: ${isLecturerCheckin ? '#065f46' : '#1e40af'}; padding: 2px 10px; border-radius: 12px; font-size: 11px;">${this.escapeHtml(log.session_type || 'Class')}</span>
                    </td>
                    <td style="padding: 10px 14px; color: #475569; font-size: 13px;">${timeStr}</td>
                    <td style="padding: 10px 14px; color: #475569; font-size: 12px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${this.escapeHtml(locationDisplay)}</td>
                    <td style="padding: 10px 14px; text-align: center;">
                        <div>
                            <span style="background: ${isVerified ? '#10b98120' : statusColor + '20'}; color: ${isVerified ? '#10b981' : statusColor}; padding: 3px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; display: inline-block;">
                                ${isVerified ? '✅ Verified' : displayStatus}
                            </span>
                            ${isVerified && verifiedByDisplay ? `<span style="font-size: 9px; color: #64748b; display: block; margin-top: 2px;">${verifiedByDisplay}</span>` : ''}
                        </div>
                    </td>
                    <td style="padding: 10px 14px; text-align: center;">
                        <div style="display: flex; gap: 4px; justify-content: center; flex-wrap: wrap;">
                            ${hasLocation && !isLecturerCheckin ?
                                `<button onclick="LecturerAttendance.viewAttendanceMap(${log.latitude}, ${log.longitude}, '${this.escapeHtml(studentName)}')" style="background: #4C1D95; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; display: inline-flex; align-items: center; gap: 3px;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'"><i class="fas fa-map-marker-alt" style="font-size:10px;"></i></button>` :
                                `<span style="color: #94a3b8; font-size: 11px;">${isLecturerCheckin ? '✓' : 'No location'}</span>`
                            }
                            ${canVerify ?
                                `<button onclick="LecturerAttendance.verifyAttendance('${log.id}')" data-verify-id="${log.id}" style="background: #8b5cf6; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; display: inline-flex; align-items: center; gap: 3px; transition: all 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'"><i class="fas fa-check" style="font-size:10px;"></i> Verify</button>` :
                                `<span style="color: ${isVerified ? '#10b981' : '#94a3b8'}; font-size: 11px; font-weight: ${isVerified ? '600' : 'normal'};">${isVerified ? '✅ Verified' : '—'}</span>`
                            }
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    // ============================================================
    // UPDATE STATS
    // ============================================================
    updateStats(logs) {
        if (!logs) logs = this.todayLogs || [];

        const total = logs.length;
        const present = logs.filter(l => {
            const status = (l.attendance_status || '').toLowerCase();
            return status === 'present' || l.is_verified === true;
        }).length;
        const absent = logs.filter(l => (l.attendance_status || '').toLowerCase() === 'absent').length;
        const pending = logs.filter(l => {
            const status = (l.attendance_status || '').toLowerCase();
            return status === 'pending' || status === '' || l.attendance_status === null;
        }).length;
        const rate = total > 0 ? Math.round((present / total) * 100) : 0;

        this.stats = { total, present, absent, pending, rate };
        const threshold = this.getPassingThreshold();
        const typeLabel = this.getProgramTypeLabel();

        console.log(`📊 Stats: total=${total}, present=${present}, absent=${absent}, pending=${pending}, rate=${rate}% (${typeLabel})`);

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
            progressBar.setAttribute('aria-valuenow', rate);
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
    // LOAD PAST ATTENDANCE
    // ============================================================
    async loadPastAttendance() {
        const tbody = document.getElementById('pastAttendanceTable');
        if (!tbody) { console.warn('⚠️ pastAttendanceTable not found'); return; }

        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) {
                tbody.innerHTML = '<tr><td colspan="10" style="padding:30px;text-align:center;color:#ef4444;">Database not available</td></tr>';
                return;
            }

            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];

            const { data: logs, error } = await supabase
                .from('geo_attendance_logs')
                .select('*')
                .lt('check_in_time', `${todayStr}T00:00:00.000Z`)
                .order('check_in_time', { ascending: false })
                .limit(100);

            if (error) {
                console.error('❌ Error loading past attendance:', error);
                tbody.innerHTML = `<tr><td colspan="10" style="padding:30px;text-align:center;color:#ef4444;">Error: ${error.message}</td></tr>`;
                return;
            }

            this.pastLogs = logs || [];
            this.filteredPastLogs = [...this.pastLogs];
            console.log(`📊 Loaded ${this.pastLogs.length} past attendance records (${this.getProgramTypeLabel()})`);

            this.renderPastAttendance();

        } catch (error) {
            console.error('❌ Failed to load past attendance:', error);
            tbody.innerHTML = `<tr><td colspan="10" style="padding:30px;text-align:center;color:#ef4444;">Error: ${error.message}</td></tr>`;
        }
    },

    // ============================================================
    // RENDER PAST ATTENDANCE
    // ============================================================
    renderPastAttendance() {
        const tbody = document.getElementById('pastAttendanceTable');
        if (!tbody) return;

        const logs = this.pastLogs;
        const typeLabel = this.getProgramTypeLabel();

        const countEl = document.getElementById('pastLogCount');
        if (countEl) countEl.textContent = `${logs.length} records`;

        if (!logs || logs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" style="padding:40px;text-align:center;color:#94a3b8;">
                        <i class="fas fa-history" style="font-size:32px;display:block;margin-bottom:10px;color:#e2e8f0;"></i>
                        <p style="margin:0;">No past attendance records found. (${typeLabel})</p>
                    </td>
                </tr>
            `;
            return;
        }

        const statusColors = {
            'Present': '#10b981', 'Absent': '#ef4444', 'Pending': '#f59e0b',
            'Late': '#f59e0b', 'Excused': '#3b82f6', 'Verified': '#10b981'
        };

        tbody.innerHTML = logs.map((log) => {
            const hasLocation = log.latitude && log.longitude;

            const isVerified = log.is_verified === true ||
                              log.is_verified === 'true' ||
                              log.is_verified === 1 ||
                              log.attendance_status === 'Verified' ||
                              (log.attendance_status === 'Present' && log.verified_at !== null);

            let displayStatus = log.attendance_status || 'Pending';
            if (isVerified && displayStatus !== 'Absent') displayStatus = 'Verified ✓';

            const statusColor = statusColors[displayStatus] || '#6b7280';
            const date = log.check_in_time ? new Date(log.check_in_time) : new Date();

            const studentName = log.student_name || 'Unknown Student';
            const regNumber = log.registration_number || log.student_id || 'N/A';
            const displayReg = regNumber.length > 15 ? regNumber.substring(0, 15) + '...' : regNumber;
            const blockDisplay = log.block ? this.getBlockDisplay(log.block) : 'N/A';
            const isLecturerCheckin = log.session_type === 'Lecturer Check-in';
            const locationDisplay = isLecturerCheckin ? 'Lecturer Check-in' :
                (log.location_address || log.location_friendly_name || log.location_name || 'N/A');

            const canVerify = !isLecturerCheckin &&
                              log.session_type !== 'Lecturer Check-in' &&
                              log.role !== 'lecturer' &&
                              !isVerified;

            const verifiedByDisplay = log.verified_by_name ? `by ${log.verified_by_name}` : '';
            const isTVET = this.isTVET;

            return `
                <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s; ${isVerified ? 'background: #f0fdf4;' : ''} ${isLecturerCheckin ? 'background: #f0fdf4;' : ''}"
                    onmouseover="this.style.background='${isVerified || isLecturerCheckin ? '#dcfce7' : '#f8fafc'}'"
                    onmouseout="this.style.background='${isVerified || isLecturerCheckin ? '#f0fdf4' : 'transparent'}'">
                    <td style="padding: 10px 14px; color: #475569; font-size: 12px;">${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td style="padding: 10px 14px; font-weight: 500; color: #1e293b; font-size: 13px;">
                        ${this.escapeHtml(studentName)}
                        ${isVerified && !isLecturerCheckin ? ' <span style="font-size:10px;background:#10b981;color:white;padding:1px 8px;border-radius:10px;">✓</span>' : ''}
                        ${isTVET && !isLecturerCheckin ? ' <span style="font-size:9px;color:#8b5cf6;padding:1px 6px;border-radius:8px;">TVET</span>' : ''}
                    </td>
                    <td style="padding: 10px 14px; font-weight: 600; color: #4C1D95; font-size: 12px;" title="${this.escapeHtml(regNumber)}">${this.escapeHtml(displayReg)}</td>
                    <td style="padding: 10px 14px; color: #475569; font-size: 13px;">
                        ${this.escapeHtml(blockDisplay)}
                        ${isTVET ? `<div style="font-size: 8px; color: #8b5cf6;">TVET Term</div>` : ''}
                    </td>
                    <td style="padding: 10px 14px; color: #475569; font-size: 13px;">${this.escapeHtml(log.unit_name || log.target_name || 'General')}</td>
                    <td style="padding: 10px 14px;">
                        <span style="background: ${isLecturerCheckin ? '#d1fae5' : '#dbeafe'}; color: ${isLecturerCheckin ? '#065f46' : '#1e40af'}; padding: 2px 10px; border-radius: 12px; font-size: 11px;">${this.escapeHtml(log.session_type || 'Class')}</span>
                    </td>
                    <td style="padding: 10px 14px; color: #475569; font-size: 13px;">${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td style="padding: 10px 14px; color: #475569; font-size: 12px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${this.escapeHtml(locationDisplay)}</td>
                    <td style="padding: 10px 14px; text-align: center;">
                        <div>
                            <span style="background: ${isVerified ? '#10b98120' : statusColor + '20'}; color: ${isVerified ? '#10b981' : statusColor}; padding: 3px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; display: inline-block;">
                                ${isVerified ? '✅ Verified' : displayStatus}
                            </span>
                            ${isVerified && verifiedByDisplay ? `<span style="font-size: 9px; color: #64748b; display: block; margin-top: 2px;">${verifiedByDisplay}</span>` : ''}
                        </div>
                    </td>
                    <td style="padding: 10px 14px; text-align: center;">
                        <div style="display: flex; gap: 4px; justify-content: center; flex-wrap: wrap;">
                            ${hasLocation && !isLecturerCheckin ?
                                `<button onclick="LecturerAttendance.viewAttendanceMap(${log.latitude}, ${log.longitude}, '${this.escapeHtml(studentName)}')" style="background: #4C1D95; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; display: inline-flex; align-items: center; gap: 3px;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'"><i class="fas fa-map-marker-alt" style="font-size:10px;"></i></button>` :
                                `<span style="color: #94a3b8; font-size: 11px;">${isLecturerCheckin ? '✓' : 'No location'}</span>`
                            }
                            ${canVerify ?
                                `<button onclick="LecturerAttendance.verifyAttendance('${log.id}')" data-verify-id="${log.id}" style="background: #8b5cf6; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; display: inline-flex; align-items: center; gap: 3px; transition: all 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'"><i class="fas fa-check" style="font-size:10px;"></i> Verify</button>` :
                                `<span style="color: ${isVerified ? '#10b981' : '#94a3b8'}; font-size: 11px; font-weight: ${isVerified ? '600' : 'normal'};">${isVerified ? '✅ Verified' : '—'}</span>`
                            }
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    // ============================================================
    // LOAD ATTENDANCE STATS
    // ============================================================
    async loadAttendanceStats() {
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) return;

            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];

            const { data: logs, error } = await supabase
                .from('geo_attendance_logs')
                .select('attendance_status, is_verified')
                .gte('check_in_time', `${todayStr}T00:00:00.000Z`)
                .lte('check_in_time', `${todayStr}T23:59:59.999Z`);

            if (error) { console.error('❌ Error loading stats:', error); return; }

            const total = logs?.length || 0;
            const present = logs?.filter(l => {
                const status = (l.attendance_status || '').toLowerCase();
                return status === 'present' || l.is_verified === true;
            }).length || 0;
            const absent = logs?.filter(l => (l.attendance_status || '').toLowerCase() === 'absent').length || 0;
            const pending = total - present - absent;
            const rate = total > 0 ? Math.round((present / total) * 100) : 0;

            const typeLabel = this.getProgramTypeLabel();
            const threshold = this.getPassingThreshold();

            const cardMap = {
                'totalStudentsCount': total,
                'presentTodayCount': present,
                'absentTodayCount': absent,
                'pendingCount': pending,
                'attendanceRate': rate + '%'
            };

            for (const [id, value] of Object.entries(cardMap)) {
                const el = document.getElementById(id);
                if (el) el.textContent = value;
            }

            console.log(`📊 Dashboard stats: total=${total}, present=${present}, absent=${absent}, pending=${pending}, rate=${rate}% (${typeLabel}, Pass: ≥${threshold}%)`);

        } catch (error) {
            console.error('❌ Failed to load attendance stats:', error);
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
                .eq('role', 'student');

            const blocks = [...new Set(this.assignedUnits.map(u => u.block).filter(Boolean))];
            const currentBlock = blocks.length > 0 ? this.getBlockDisplay(blocks[0]) : 'N/A';

            const programDisplay = window.LecturerUtils?.getProgramDisplayName?.(program) || program;
            const isTVET = this.isTVET;
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
                if (el) {
                    el.textContent = value;
                    if (id === 'programTypeBadge') {
                        el.style.background = isTVET ? 'rgba(139,92,246,0.3)' : 'rgba(76,29,149,0.3)';
                        el.style.color = isTVET ? '#7c3aed' : '#1e40af';
                    }
                }
            }

        } catch (error) {
            console.error('❌ Failed to load program info:', error);
        }
    },

    // ============================================================
    // VIEW ATTENDANCE MAP
    // ============================================================
    viewAttendanceMap(lat, lng, name) {
        if (!lat || !lng) { this.showNotification('No location data available.', 'warning'); return; }

        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);

        if (isNaN(latNum) || isNaN(lngNum)) { this.showNotification('Invalid location data.', 'warning'); return; }

        this.currentLocation = { lat: latNum, lng: lngNum, name: name };

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

    // ============================================================
    // INIT MAP
    // ============================================================
    initMap(lat, lng, name) {
        const container = document.getElementById('mapContainer');
        if (!container) return;

        if (this.mapInstance) { this.mapInstance.remove(); this.mapInstance = null; }

        const loadingEl = document.getElementById('mapLoading');
        if (loadingEl) loadingEl.style.display = 'none';

        if (typeof L === 'undefined') {
            container.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;flex-direction:column;padding:20px;">
                    <i class="fas fa-map" style="font-size:48px;margin-bottom:10px;color:#e2e8f0;"></i>
                    <p style="text-align:center;max-width:300px;">Map library not loaded.</p>
                    <button onclick="LecturerAttendance.initMap(${lat}, ${lng}, '${name}')" style="margin-top:10px;background:#4C1D95;color:white;border:none;padding:8px 20px;border-radius:6px;cursor:pointer;font-size:13px;"><i class="fas fa-sync-alt"></i> Retry</button>
                </div>
            `;
            return;
        }

        try {
            const accentColor = this.isTVET ? '#8b5cf6' : '#4C1D95';
            this.mapInstance = L.map(container).setView([lat, lng], 16);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                maxZoom: 19
            }).addTo(this.mapInstance);

            L.marker([lat, lng]).addTo(this.mapInstance)
                .bindPopup(`<b>${this.escapeHtml(name)}</b><br>Lat: ${lat.toFixed(6)}<br>Lng: ${lng.toFixed(6)}`)
                .openPopup();

            L.circle([lat, lng], { radius: 50, color: accentColor, fillColor: accentColor, fillOpacity: 0.1, weight: 2 }).addTo(this.mapInstance);

            setTimeout(() => { if (this.mapInstance) this.mapInstance.invalidateSize(); }, 400);

        } catch (error) {
            console.error('❌ Error initializing map:', error);
            container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#ef4444;flex-direction:column;padding:20px;"><i class="fas fa-exclamation-triangle" style="font-size:32px;margin-bottom:10px;"></i><p>Error loading map: ${error.message}</p></div>`;
        }
    },

    // ============================================================
    // LECTURER SELF CHECK-IN
    // ============================================================
    async lecturerCheckIn() {
        if (this.isProcessing) { this.showNotification('Please wait, processing...', 'warning'); return; }

        const btn = document.getElementById('lecturerCheckinBtn');
        const statusEl = document.getElementById('lecturerCheckinStatus');
        if (!btn) return;

        this.isProcessing = true;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Getting location...';

        if (statusEl) { statusEl.textContent = '⏳ Getting location...'; statusEl.style.color = '#f59e0b'; }

        if (!navigator.geolocation) {
            this.showNotification('Geolocation not supported by your browser.', 'error');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check-circle"></i> Mark My Attendance';
            if (statusEl) { statusEl.textContent = '❌ Geolocation not supported'; statusEl.style.color = '#ef4444'; }
            this.isProcessing = false;
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const supabase = window.lecturerDB?.supabase;
                    const profile = window.lecturerDB?.getCurrentUserProfile();

                    const userId = profile?.user_id || this.lecturerUuid || this.lecturerAssignmentId;
                    const staffNumber = profile?.staff_id || profile?.staff_number || 'LECTURER';
                    const fullName = profile?.full_name || 'Lecturer';

                    if (!supabase || !userId) throw new Error('Database or user not available');

                    if (statusEl) { statusEl.textContent = '⏳ Checking in...'; statusEl.style.color = '#f59e0b'; }

                    const today = new Date().toISOString().split('T')[0];

                    const { data: existing } = await supabase
                        .from('geo_attendance_logs')
                        .select('id')
                        .eq('user_id', userId)
                        .eq('session_type', 'Lecturer Check-in')
                        .gte('check_in_time', `${today}T00:00:00.000Z`)
                        .lte('check_in_time', `${today}T23:59:59.999Z`)
                        .limit(1);

                    if (existing && existing.length > 0) {
                        this.showNotification('✅ You have already checked in today!', 'success');
                        if (statusEl) { statusEl.textContent = '✅ Already checked in today'; statusEl.style.color = '#10b981'; }
                        btn.disabled = false;
                        btn.innerHTML = '<i class="fas fa-check-circle"></i> Mark My Attendance';
                        this.isProcessing = false;
                        return;
                    }

                    const program = this.currentProgram || profile?.program || profile?.department || 'KRCHN';
                    const programType = this.getProgramTypeLabel();

                    const { error: insertError } = await supabase
                        .from('geo_attendance_logs')
                        .insert({
                            student_id: userId,
                            user_id: userId,
                            registration_number: staffNumber,
                            student_name: fullName,
                            check_in_time: new Date().toISOString(),
                            session_type: 'Lecturer Check-in',
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                            accuracy_m: position.coords.accuracy || null,
                            attendance_status: 'Present',
                            is_verified: true,
                            target_name: 'Lecturer Check-in',
                            location_address: 'Lecturer Check-in',
                            program: program,
                            block: profile?.block || 'Staff',
                            role: 'lecturer',
                            recorded_by_name: fullName,
                            program_type: programType,
                            is_tvet: this.isTVET,
                            created_at: new Date().toISOString()
                        });

                    if (insertError) throw new Error(insertError.message);

                    this.showNotification(`✅ ${this.getProgramTypeLabel()} lecturer check-in logged!`, 'success');
                    if (statusEl) { statusEl.textContent = '✅ Checked in successfully'; statusEl.style.color = '#10b981'; }

                    await this.loadTodayAttendance();
                    await this.loadAttendanceStats();

                } catch (error) {
                    console.error('❌ Check-in error:', error);
                    this.showNotification('Check-in failed: ' + error.message, 'error');
                    if (statusEl) { statusEl.textContent = '❌ Check-in failed'; statusEl.style.color = '#ef4444'; }
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-check-circle"></i> Mark My Attendance';
                    this.isProcessing = false;
                }
            },
            (error) => {
                let errorMessage = 'Location unavailable';
                if (error.code === 1) errorMessage = 'Location access denied.';
                else if (error.code === 2) errorMessage = 'Location unavailable.';
                else if (error.code === 3) errorMessage = 'Location request timed out.';

                this.showNotification('Geolocation error: ' + errorMessage, 'error');
                if (statusEl) { statusEl.textContent = '❌ ' + errorMessage; statusEl.style.color = '#ef4444'; }
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-check-circle"></i> Mark My Attendance';
                this.isProcessing = false;
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
        );
    },

    // ============================================================
    // MARK STUDENT ATTENDANCE (Manual)
    // ============================================================
    async markStudentAttendance(e) {
        if (e) e.preventDefault();
        if (this.isProcessing) { this.showNotification('Please wait, processing...', 'warning'); return; }

        const form = document.getElementById('manualAttendanceForm');
        const btn = form?.querySelector('button[type="submit"]');
        const originalText = btn?.innerHTML || 'Mark Student Present';

        if (!form || !btn) { this.showNotification('Form not found.', 'error'); return; }

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

            if (!studentId) { this.showNotification('Please select a student.', 'error'); throw new Error('no-student'); }
            if (!sessionType) { this.showNotification('Please select a session type.', 'error'); throw new Error('no-type'); }
            if (!date) { this.showNotification('Please select a date.', 'error'); throw new Error('no-date'); }

            const supabase = window.lecturerDB?.supabase;
            const profile = window.lecturerDB?.getCurrentUserProfile();
            if (!supabase || !profile) throw new Error('Database not available');

            const { data: student, error: studentError } = await supabase
                .from('consolidated_user_profiles_table')
                .select('full_name, program, block, intake_year, student_id')
                .eq('user_id', studentId)
                .maybeSingle();

            if (studentError) throw new Error('Failed to find student');
            if (!student) throw new Error('Student not found');

            const checkInTime = time ? `${date}T${time}:00.000Z` : `${date}T12:00:00.000Z`;
            const programType = this.getProgramTypeLabel();
            const blockDisplay = student.block ? this.getBlockDisplay(student.block) : 'N/A';

            const { error: insertError } = await supabase
                .from('geo_attendance_logs')
                .insert({
                    student_id: studentId,
                    student_name: student.full_name || 'Student',
                    check_in_time: checkInTime,
                    session_type: sessionType,
                    target_name: unit || 'General',
                    unit_name: unit || 'General',
                    attendance_status: 'Present',
                    is_verified: true,
                    is_manual_entry: true,
                    location_friendly_name: location || 'Manual Entry',
                    location_address: `MANUAL: ${location || 'N/A'} (By ${profile.full_name || 'Lecturer'})`,
                    program: student.program || profile.program || this.currentProgram || 'KRCHN',
                    block: student.block || profile.block,
                    block_display: blockDisplay,
                    intake_year: student.intake_year || profile.intake_year,
                    role: 'student',
                    recorded_by_id: profile.user_id,
                    recorded_by_name: profile.full_name || 'Lecturer',
                    program_type: programType,
                    is_tvet: this.isTVET,
                    created_at: new Date().toISOString()
                });

            if (insertError) throw new Error(insertError.message);

            this.showNotification(`✅ ${student.full_name || 'Student'} marked present! (${this.getProgramTypeLabel()})`, 'success');

            form.reset();
            const today = new Date();
            document.getElementById('attDate').value = today.toISOString().split('T')[0];

            await this.loadTodayAttendance();
            await this.loadAttendanceStats();

        } catch (error) {
            if (!['no-student', 'no-type', 'no-date'].includes(error.message)) {
                console.error('❌ Mark attendance error:', error);
                this.showNotification('Failed to mark attendance: ' + error.message, 'error');
            }
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
            this.isProcessing = false;
        }
    },

    // ============================================================
    // POPULATE FILTERS AND DROPDOWNS
    // ============================================================
    populateFilters() {
        const today = new Date().toISOString().split('T')[0];

        const filterDate = document.getElementById('filterDate');
        if (filterDate) filterDate.value = today;

        const attDate = document.getElementById('attDate');
        if (attDate) attDate.value = today;

        this.populateStudentSelect();
        this.populateBlockFilter();
        this.updateFilterLabels();
    },

    populateBlockFilter() {
        const blockFilter = document.getElementById('filterBlock');
        if (!blockFilter) return;

        const blocks = [...new Set(this.assignedUnits.map(u => u.block).filter(Boolean))];

        blockFilter.innerHTML = '<option value="All">All Blocks/Terms</option>';

        if (blocks.length > 0) {
            blocks.forEach(block => {
                const option = document.createElement('option');
                option.value = block;
                option.textContent = this.getBlockDisplay(block);
                blockFilter.appendChild(option);
            });
        }

        const label = document.getElementById('blockFilterLabel');
        if (label) {
            const blockType = this.isTVET ? 'Term' : 'Block';
            label.innerHTML = `<i class="fas fa-layer-group" style="color: #4C1D95; width: 18px;"></i> ${blockType}`;
        }
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
            const program = this.currentProgram || profile?.program || profile?.department;
            const supabase = window.lecturerDB?.supabase;
            if (!supabase || !program) return;

            const { data: students, error } = await supabase
                .from('consolidated_user_profiles_table')
                .select('user_id, full_name, student_id, block')
                .eq('program', program)
                .eq('role', 'student')
                .order('full_name', { ascending: true });

            if (error) { console.error('❌ Error loading students:', error); return; }

            const select = document.getElementById('attStudentId');
            if (select && students) {
                const typeLabel = this.getProgramTypeLabel();
                select.innerHTML = `<option value="">-- Select ${typeLabel} Student --</option>`;
                students.forEach(s => {
                    const blockDisplay = s.block ? this.getBlockDisplay(s.block) : '';
                    const option = document.createElement('option');
                    option.value = s.user_id;
                    const regDisplay = s.student_id || 'N/A';
                    option.textContent = `${this.escapeHtml(s.full_name)} (${this.escapeHtml(regDisplay)})${blockDisplay ? ' - ' + blockDisplay : ''}`;
                    select.appendChild(option);
                });
                console.log(`👥 Loaded ${students.length} ${typeLabel} students`);
            }
        } catch (error) {
            console.error('❌ Failed to populate student select:', error);
        }
    },

    // ============================================================
    // APPLY FILTERS — reads filter inputs and re-renders filtered data
    // ============================================================
    applyFilters() {
        console.log(`🔍 Applying ${this.getProgramTypeLabel()} filters...`);

        const filterDate        = (document.getElementById('filterDate')?.value || '').trim();
        const filterBlock       = (document.getElementById('filterBlock')?.value || 'All').trim();
        const filterYear        = (document.getElementById('filterYear')?.value || 'All').trim();
        const filterSessionType = (document.getElementById('filterSessionType')?.value || 'All').trim();
        const searchText        = (document.getElementById('filterSearch')?.value || '').trim().toLowerCase();

        console.log('📋 Filter values:', { filterDate, filterBlock, filterYear, filterSessionType, searchText });

        // ---------- TODAY ----------
        let filteredToday = [...(this.todayLogs || [])];

        if (filterDate) {
            filteredToday = filteredToday.filter(log => {
                if (!log.check_in_time) return false;
                const logDate = new Date(log.check_in_time).toISOString().split('T')[0];
                return logDate === filterDate;
            });
        }
        if (filterBlock && filterBlock !== 'All') {
            filteredToday = filteredToday.filter(log =>
                String(log.block || '').toLowerCase() === filterBlock.toLowerCase()
            );
        }
        if (filterYear && filterYear !== 'All') {
            filteredToday = filteredToday.filter(log =>
                String(log.intake_year || '').toLowerCase() === filterYear.toLowerCase()
            );
        }
        if (filterSessionType && filterSessionType !== 'All') {
            filteredToday = filteredToday.filter(log =>
                String(log.session_type || '').toLowerCase() === filterSessionType.toLowerCase()
            );
        }
        if (searchText) {
            filteredToday = filteredToday.filter(log => {
                const haystack = [log.student_name, log.registration_number, log.student_id, log.unit_name, log.target_name, log.session_type, log.block, log.program].filter(Boolean).join(' ').toLowerCase();
                return haystack.includes(searchText);
            });
        }

        // ---------- PAST ----------
        let filteredPast = [...(this.pastLogs || [])];

        if (filterBlock && filterBlock !== 'All') {
            filteredPast = filteredPast.filter(log =>
                String(log.block || '').toLowerCase() === filterBlock.toLowerCase()
            );
        }
        if (filterYear && filterYear !== 'All') {
            filteredPast = filteredPast.filter(log =>
                String(log.intake_year || '').toLowerCase() === filterYear.toLowerCase()
            );
        }
        if (filterSessionType && filterSessionType !== 'All') {
            filteredPast = filteredPast.filter(log =>
                String(log.session_type || '').toLowerCase() === filterSessionType.toLowerCase()
            );
        }
        if (searchText) {
            filteredPast = filteredPast.filter(log => {
                const haystack = [log.student_name, log.registration_number, log.student_id, log.unit_name, log.target_name, log.session_type, log.block, log.program].filter(Boolean).join(' ').toLowerCase();
                return haystack.includes(searchText);
            });
        }

        this.filteredTodayLogs = filteredToday;
        this.filteredPastLogs = filteredPast;

        console.log(`✅ Filtered: today=${filteredToday.length}/${this.todayLogs.length}, past=${filteredPast.length}/${this.pastLogs.length}`);

        this.renderFilteredToday(filteredToday);
        this.renderFilteredPast(filteredPast);

        const filterCount = document.getElementById('attendanceFilterCount');
        if (filterCount) {
            filterCount.textContent = `Showing ${filteredToday.length} of ${this.todayLogs.length} today · ${filteredPast.length} past`;
        }
    },

    // ============================================================
    // RENDER FILTERED TODAY
    // ============================================================
    renderFilteredToday(logs) {
        const tbody = document.getElementById('attendanceTable');
        if (!tbody) return;

        const countEl = document.getElementById('todayLogCount');
        if (countEl) countEl.textContent = `${logs.length} records`;

        if (!logs || logs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" style="padding:40px;text-align:center;color:#94a3b8;">
                        <i class="fas fa-filter" style="font-size:32px;display:block;margin-bottom:10px;color:#e2e8f0;"></i>
                        <p style="margin:0;">No attendance records match your filters.</p>
                    </td>
                </tr>
            `;
            return;
        }

        const original = this.todayLogs;
        this.todayLogs = logs;
        this.renderTodayAttendance();
        this.todayLogs = original;
    },

    // ============================================================
    // RENDER FILTERED PAST
    // ============================================================
    renderFilteredPast(logs) {
        const tbody = document.getElementById('pastAttendanceTable');
        if (!tbody) return;

        const countEl = document.getElementById('pastLogCount');
        if (countEl) countEl.textContent = `${logs.length} records`;

        if (!logs || logs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" style="padding:40px;text-align:center;color:#94a3b8;">
                        <i class="fas fa-filter" style="font-size:32px;display:block;margin-bottom:10px;color:#e2e8f0;"></i>
                        <p style="margin:0;">No past records match your filters.</p>
                    </td>
                </tr>
            `;
            return;
        }

        const original = this.pastLogs;
        this.pastLogs = logs;
        this.renderPastAttendance();
        this.pastLogs = original;
    },

    // ============================================================
    // RESET FILTERS — clear all + re-render unfiltered
    // ============================================================
    resetFilters() {
        console.log('🔄 Resetting filters...');

        const filterDate = document.getElementById('filterDate');
        if (filterDate) filterDate.value = new Date().toISOString().split('T')[0];

        const filterBlock = document.getElementById('filterBlock');
        if (filterBlock) filterBlock.value = 'All';

        const filterYear = document.getElementById('filterYear');
        if (filterYear) filterYear.value = 'All';

        const filterSessionType = document.getElementById('filterSessionType');
        if (filterSessionType) filterSessionType.value = 'All';

        const searchEl = document.getElementById('filterSearch');
        if (searchEl) searchEl.value = '';

        this.renderTodayAttendance();
        this.renderPastAttendance();
        this.updateStats(this.todayLogs);

        const filterCount = document.getElementById('attendanceFilterCount');
        if (filterCount) filterCount.textContent = `Showing all ${this.getProgramTypeLabel()} records`;

        this.showNotification(`${this.getProgramTypeLabel()} filters reset!`, 'info');
    },

    // ============================================================
    // ✅ EXPORT CSV — GROUPS CONTINUOUS (SAME-CLASS) RECORDS
    // ============================================================
    // Continuous classes reuse the same unit + session_type + block + intake
    // across multiple days. This export groups them into one block per class
    // and lists each dated occurrence, so the report reads like a class register.
    // ============================================================
    exportCSV() {
        const logs = this.todayLogs.filter(log => log.session_type !== 'Lecturer Check-in');

        if (!logs || logs.length === 0) {
            this.showNotification('No data to export.', 'warning');
            return;
        }

        const typeLabel = this.getProgramTypeLabel();
        const escapeCsv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

        // ---------- 1. GROUP BY CLASS IDENTITY ----------
        const groups = {};
        logs.forEach(log => {
            const unit = (log.unit_name || log.target_name || 'General').trim();
            const sessionType = (log.session_type || 'Class').trim();
            const block = (log.block || 'N/A').trim();
            const intake = String(log.intake_year || 'N/A');
            const program = (log.program || 'N/A').trim();

            const key = `${program}|${block}|${intake}|${unit}|${sessionType}`.toLowerCase();

            if (!groups[key]) {
                groups[key] = {
                    unit,
                    sessionType,
                    block,
                    blockDisplay: this.getBlockDisplay(block),
                    intake,
                    program,
                    programType: typeLabel,
                    occurrences: []   // each dated row for this class
                };
            }

            groups[key].occurrences.push(log);
        });

        // ---------- 2. SORT CLASSES BY UNIT NAME ----------
        const sortedGroups = Object.values(groups).sort((a, b) =>
            a.unit.localeCompare(b.unit)
        );

        // ---------- 3. BUILD CSV ----------
        const rows = [];

        // Header band
        rows.push([
            escapeCsv(`ATTENDANCE REPORT — ${typeLabel}`),
            escapeCsv(`Generated: ${new Date().toLocaleString('en-GB')}`),
            escapeCsv(`Total classes: ${sortedGroups.length}`),
            escapeCsv(`Total records: ${logs.length}`)
        ].join(','));

        rows.push(''); // spacer

        sortedGroups.forEach((group, groupIndex) => {
            // ---------- Class header ----------
            rows.push([
                escapeCsv(`CLASS ${groupIndex + 1}: ${group.unit}`),
                escapeCsv(`Type: ${group.sessionType}`),
                escapeCsv(`Block: ${group.blockDisplay}`),
                escapeCsv(`Program: ${group.program}`),
                escapeCsv(`Intake: ${group.intake}`),
                escapeCsv(`Occurrences: ${group.occurrences.length}`)
            ].join(','));

            // ---------- Column header for this class ----------
            rows.push([
                'Date',
                'Time',
                'Student Name',
                'Reg No',
                'Status',
                'Verified By',
                'Location',
                'Distance (m)',
                'Accuracy (m)'
            ].map(escapeCsv).join(','));

            // ---------- Sort occurrences chronologically ----------
            const sortedOccurrences = [...group.occurrences].sort(
                (a, b) => new Date(a.check_in_time) - new Date(b.check_in_time)
            );

            // ---------- Rows for each occurrence ----------
            sortedOccurrences.forEach(log => {
                const date = log.check_in_time ? new Date(log.check_in_time) : new Date();
                const status = log.attendance_status || (log.is_verified ? 'Present' : 'Pending');
                const verifiedFlag = log.is_verified ? 'Verified ✓' : status;

                rows.push([
                    escapeCsv(date.toLocaleDateString('en-GB')),
                    escapeCsv(date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })),
                    escapeCsv(log.student_name || 'Unknown'),
                    escapeCsv(log.registration_number || log.student_id || 'N/A'),
                    escapeCsv(verifiedFlag),
                    escapeCsv(log.verified_by_name || '—'),
                    escapeCsv(log.location_address || log.location_friendly_name || log.location_name || 'N/A'),
                    escapeCsv(log.distance_meters != null ? Math.round(log.distance_meters) : '—'),
                    escapeCsv(log.accuracy_m != null ? Math.round(log.accuracy_m) : '—')
                ].join(','));
            });

            // ---------- Class summary line ----------
            const presentCount = sortedOccurrences.filter(o => o.is_verified || (o.attendance_status || '').toLowerCase() === 'present').length;
            const pendingCount = sortedOccurrences.length - presentCount;

            rows.push([
                escapeCsv('SUMMARY'),
                escapeCsv(`Present/Verified: ${presentCount}`),
                escapeCsv(`Pending: ${pendingCount}`),
                escapeCsv(`Total: ${sortedOccurrences.length}`)
            ].join(','));

            rows.push(''); // spacer between classes
        });

        // ---------- 4. DOWNLOAD ----------
        const csv = rows.join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_${typeLabel.replace(/[^\w]/g, '_')}_grouped_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification(
            `✅ Exported ${sortedGroups.length} class${sortedGroups.length === 1 ? '' : 'es'} (${logs.length} records) as grouped CSV`,
            'success'
        );
    },

    // ============================================================
    // PRINT REPORT
    // ============================================================
    printReport() { window.print(); },

    // ============================================================
    // SHOW NOTIFICATION
    // ============================================================
    showNotification(message, type = 'info') {
        console.log(`[${type}] ${message}`);
        try {
            if (window.LecturerUI?.showNotification) { window.LecturerUI.showNotification(message, type); return; }
        } catch (e) { /* silent */ }
        try {
            const toast = document.createElement('div');
            const colors = { success: '#10b981', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };
            toast.style.cssText = `position:fixed;bottom:20px;right:20px;padding:12px 24px;background:${colors[type] || '#3b82f6'};color:white;border-radius:8px;font-weight:500;z-index:100000;box-shadow:0 4px 12px rgba(0,0,0,0.2);max-width:400px;font-family:system-ui,sans-serif;`;
            toast.textContent = message;
            document.body.appendChild(toast);
            setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.5s'; setTimeout(() => toast.remove(), 500); }, 3500);
        } catch (e) { /* silent */ }
    },

    showError(message) { console.error('❌', message); this.showNotification(message, 'error'); },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // ============================================================
    // SETUP EVENT LISTENERS — single-bind guards + debounce
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

        ['filterDate', 'filterBlock', 'filterYear', 'filterSessionType'].forEach(id => {
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

        console.log('✅ Event listeners setup complete');
    },

    // ============================================================
    // REFRESH
    // ============================================================
    async refresh() {
        console.log(`🔄 Refreshing ${this.getProgramTypeLabel()} attendance...`);
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
    // VERIFY ATTENDANCE — SINGLE RECORD
    // ============================================================
    verifyAttendance: async function(recordId) {
        console.log('🔍 VERIFY called for record:', recordId);
        if (!recordId) { this.showNotification('Error: Record ID is required', 'error'); return; }
        if (this.isProcessing) { this.showNotification('Please wait, processing...', 'warning'); return; }

        this.isProcessing = true;

        const verifyBtn = document.querySelector(`[data-verify-id="${recordId}"]`);
        const row = verifyBtn?.closest('tr');

        if (verifyBtn) {
            verifyBtn.disabled = true;
            verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
            verifyBtn.style.background = '#8b5cf6';
        }

        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) throw new Error('Database not available');

            const profile = window.lecturerDB?.getCurrentUserProfile();
            const lecturerName = profile?.full_name || 'Lecturer';
            const lecturerId = profile?.user_id || this.lecturerUuid || 'unknown';

            const { data: record, error: fetchError } = await supabase
                .from('geo_attendance_logs')
                .select('id, attendance_status, is_verified, student_name')
                .eq('id', recordId)
                .single();

            if (fetchError) throw new Error('Record not found: ' + fetchError.message);

            if (record.is_verified === true) {
                this.showNotification(`⚠️ ${record.student_name || 'Student'} is already verified`, 'warning');
                if (verifyBtn) { verifyBtn.innerHTML = '<i class="fas fa-check-circle"></i> Verified ✓'; verifyBtn.style.background = '#10b981'; verifyBtn.disabled = true; }
                this.isProcessing = false;
                return;
            }

            const now = new Date().toISOString();

            const { error: updateError } = await supabase
                .from('geo_attendance_logs')
                .update({
                    is_verified: true,
                    attendance_status: 'Verified',
                    verified_by: lecturerId,
                    verified_by_name: lecturerName,
                    verified_at: now,
                    verification_source: 'Manual Verification'
                })
                .eq('id', recordId);

            if (updateError) throw new Error('Failed to verify: ' + updateError.message);

            this.showNotification(`✅ ${record.student_name || 'Attendance'} verified!`, 'success');

            if (verifyBtn) {
                verifyBtn.innerHTML = '<i class="fas fa-check-circle"></i> Verified ✓';
                verifyBtn.style.background = '#10b981';
                verifyBtn.disabled = true;
            }

            if (row) {
                row.style.background = '#f0fdf4';
                const statusCell = row.querySelectorAll('td')[8];
                if (statusCell) {
                    statusCell.innerHTML = `
                        <div>
                            <span style="background: #10b98120; color: #10b981; padding: 3px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; display: inline-block;">✅ Verified</span>
                            <span style="font-size: 9px; color: #64748b; display: block; margin-top: 2px;">by ${lecturerName}</span>
                        </div>
                    `;
                }
            }

            this.todayLogs = [];
            this.pastLogs = [];
            await this.loadTodayAttendance();
            await this.loadPastAttendance();
            await this.loadAttendanceStats();
            this.renderTodayAttendance();
            this.renderPastAttendance();
            this.updateStats(this.todayLogs);

        } catch (error) {
            console.error('❌ Verification error:', error);
            this.showNotification('Failed to verify: ' + error.message, 'error');
            if (verifyBtn) {
                verifyBtn.disabled = false;
                verifyBtn.innerHTML = '<i class="fas fa-check"></i> Verify';
                verifyBtn.style.background = '#8b5cf6';
            }
        } finally {
            this.isProcessing = false;
        }
    },

    // ============================================================
    // BULK VERIFY ATTENDANCE
    // ============================================================
    bulkVerifyAttendance: async function(date = null) {
        const targetDate = date || document.getElementById('filterDate')?.value || new Date().toISOString().split('T')[0];

        if (!targetDate) { this.showNotification('Please select a date to bulk verify', 'warning'); return; }
        if (!confirm(`Are you sure you want to verify ALL unverified attendance records for ${targetDate}?`)) return;
        if (this.isProcessing) { this.showNotification('Please wait, processing...', 'warning'); return; }

        this.isProcessing = true;
        const btn = document.querySelector('.btn-bulk-verify');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...'; }

        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) throw new Error('Database not available');

            const profile = window.lecturerDB?.getCurrentUserProfile();
            const lecturerName = profile?.full_name || 'Lecturer';
            const lecturerId = profile?.user_id || this.lecturerUuid || 'unknown';
            const typeLabel = this.getProgramTypeLabel();

            const { data: records, error: fetchError } = await supabase
                .from('geo_attendance_logs')
                .select('id, student_name')
                .eq('is_verified', false)
                .neq('session_type', 'Lecturer Check-in')
                .gte('check_in_time', `${targetDate}T00:00:00.000Z`)
                .lte('check_in_time', `${targetDate}T23:59:59.999Z`);

            if (fetchError) throw new Error('Failed to fetch records: ' + fetchError.message);

            if (!records || records.length === 0) {
                this.showNotification(`No unverified records found for ${targetDate}`, 'info');
                this.isProcessing = false;
                if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check-double"></i> Bulk Verify'; }
                return;
            }

            const now = new Date().toISOString();
            const recordIds = records.map(r => r.id);

            const { error: updateError } = await supabase
                .from('geo_attendance_logs')
                .update({
                    is_verified: true,
                    attendance_status: 'Verified',
                    verified_by: lecturerId,
                    verified_by_name: lecturerName,
                    verified_at: now,
                    verification_source: 'Bulk Verification',
                    program_type: typeLabel,
                    is_tvet: this.isTVET
                })
                .in('id', recordIds);

            if (updateError) throw new Error('Failed to bulk verify: ' + updateError.message);

            this.showNotification(`✅ ${records.length} ${typeLabel} records verified successfully!`, 'success');

            this.todayLogs = [];
            this.pastLogs = [];
            await this.loadTodayAttendance();
            await this.loadPastAttendance();
            await this.loadAttendanceStats();
            this.renderTodayAttendance();
            this.renderPastAttendance();
            this.updateStats(this.todayLogs);
            this.updateProgramBadge();

        } catch (error) {
            console.error('❌ Bulk verification error:', error);
            this.showNotification('Bulk verification failed: ' + error.message, 'error');
        } finally {
            this.isProcessing = false;
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check-double"></i> Bulk Verify'; }
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
// INITIALIZE
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing Lecturer Attendance Module...');
    setTimeout(() => LecturerAttendance.init(), 750);
});

// ============================================================
// GLOBAL EXPOSURE
// ============================================================
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
    if (loc) window.open(`https://www.google.com/maps?q=${loc.lat},${loc.lng}`, '_blank');
};

console.log('✅ LecturerAttendance module loaded');
console.log('📋 Features: Today/Past attendance, Stats, Check-in, Map, Export (grouped), Print, Verify, Bulk Verify');
console.log(`📊 TVET Support: Enabled (${LecturerAttendance.getProgramTypeLabel()})`);
