// ============================================================
// NCHSM LECTURER ATTENDANCE MODULE
// ============================================================
// This module handles:
// 1. Today's attendance display
// 2. Past attendance records (last 100)
// 3. Attendance statistics (present, absent, pending, rate)
// 4. Lecturer self check-in with GPS
// 5. Manual student attendance marking
// 6. Attendance map view
// 7. CSV export and print
// 8. Search and filter functionality
// ============================================================

const LecturerAttendance = {
    // ============================================================
    // STATE
    // ============================================================
    todayLogs: [],
    pastLogs: [],
    assignedUnits: [],
    lecturerAssignmentId: null,
    lecturerUuid: null,
    mapInstance: null,
    currentLocation: null,
    isProcessing: false,
    stats: {
        total: 0,
        present: 0,
        absent: 0,
        pending: 0,
        rate: 0
    },

    // ============================================================
    // INITIALIZATION
    // ============================================================
    async init() {
        console.log('📋 Initializing Lecturer Attendance Module...');
        
        try {
            // Step 1: Resolve lecturer identity
            await this.resolveLecturerId();
            
            // Step 2: Load assigned units
            await this.loadAssignedUnits();
            
            // Step 3: Load all attendance data
            await this.loadAllAttendance();
            
            // Step 4: Setup event listeners
            this.setupEventListeners();
            
            // Step 5: Populate filters and dropdowns
            this.populateFilters();
            
            console.log('✅ Lecturer Attendance Module initialized successfully');
            
            // Auto-refresh every 60 seconds
            setInterval(() => {
                console.log('🔄 Auto-refreshing attendance...');
                this.loadAllAttendance();
            }, 60000);
            
        } catch (error) {
            console.error('❌ Failed to initialize attendance module:', error);
            this.showError('Failed to initialize: ' + error.message);
        }
    },

    // ============================================================
    // RESOLVE LECTURER ID
    // ============================================================
    async resolveLecturerId() {
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) {
                console.warn('⚠️ Supabase not available');
                return;
            }

            const profile = window.lecturerDB?.getCurrentUserProfile();
            if (!profile) {
                console.warn('⚠️ No lecturer profile found');
                return;
            }

            const authId = profile.user_id;
            const fullName = profile.full_name;

            console.log('🔍 Auth ID:', authId);
            console.log('🔍 Lecturer name:', fullName);

            this.lecturerUuid = authId;

            // Check if authId is a UUID
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(authId));

            if (!isUUID && authId) {
                this.lecturerAssignmentId = authId;
                console.log('✅ Using non-UUID auth ID:', this.lecturerAssignmentId);
                return;
            }

            // Try to find from lecturer_subject_assignments
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

            // Fallback to auth ID
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
            if (!supabase) {
                console.warn('⚠️ Supabase not available');
                return;
            }

            const profile = window.lecturerDB?.getCurrentUserProfile();
            if (!profile) {
                console.warn('⚠️ No lecturer profile found');
                return;
            }

            const lecturerId = this.lecturerAssignmentId || profile.user_id;

            const { data: assignments, error } = await supabase
                .from('lecturer_subject_assignments')
                .select('subject_name, subject_code, block, program, academic_year')
                .eq('lecturer_id', String(lecturerId));

            if (error) {
                console.error('❌ Error loading assigned units:', error);
                return;
            }

            this.assignedUnits = assignments || [];
            console.log(`📚 Loaded ${this.assignedUnits.length} assigned units`);

            // Populate unit dropdown
            this.populateUnitSelectors();

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

        if (units && units.length > 0) {
            unitSelect.innerHTML = '<option value="">-- Select Unit --</option>' +
                units.map(u => 
                    `<option value="${u.subject_name}">${u.subject_code ? u.subject_code + ' - ' : ''}${u.subject_name}</option>`
                ).join('');
        } else {
            unitSelect.innerHTML = '<option value="">-- No units assigned --</option>';
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
        if (!tbody) {
            console.warn('⚠️ attendanceTable not found');
            return;
        }

        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) {
                tbody.innerHTML = '<tr><td colspan="10" style="padding:30px;text-align:center;color:#ef4444;">Database not available</td></tr>';
                return;
            }

            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];

            // Get ALL records for today (no program filter)
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
            console.log(`📊 Loaded ${this.todayLogs.length} today's attendance records`);

            // Render and update stats
            this.renderTodayAttendance();
            this.updateStats(this.todayLogs);

        } catch (error) {
            console.error('❌ Failed to load today attendance:', error);
            tbody.innerHTML = `<tr><td colspan="10" style="padding:30px;text-align:center;color:#ef4444;">Error: ${error.message}</td></tr>`;
        }
    },

    // ============================================================
    // RENDER TODAY'S ATTENDANCE
    // ============================================================
 // ============================================================
// RENDER TODAY'S ATTENDANCE - FIXED TO USE REGISTRATION NUMBER
// ============================================================
renderTodayAttendance() {
    const tbody = document.getElementById('attendanceTable');
    if (!tbody) return;

    const logs = this.todayLogs;

    // Update count
    const countEl = document.getElementById('todayLogCount');
    if (countEl) countEl.textContent = `${logs.length} records`;

    // Empty state
    if (!logs || logs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" style="padding:40px;text-align:center;color:#94a3b8;">
                    <i class="fas fa-calendar-day" style="font-size:32px;display:block;margin-bottom:10px;color:#e2e8f0;"></i>
                    <p style="margin:0;">No student attendance records today.</p>
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
        'Excused': '#3b82f6'
    };

    tbody.innerHTML = logs.map((log, index) => {
        const hasLocation = log.latitude && log.longitude;
        const status = log.attendance_status || 'Pending';
        const statusColor = statusColors[status] || '#6b7280';
        
        const studentName = log.student_name || 'Unknown Student';
        
        // ✅ FIX: Use registration_number instead of student_id
        // registration_number contains: KRCHN/0052/MAR/2024
        // student_id contains: 28fa4da5-93a9-4098-ac2e-88ba142a77ee (UUID)
        const regNumber = log.registration_number || log.student_id || 'N/A';
        const displayReg = regNumber.length > 15 ? regNumber.substring(0, 15) + '...' : regNumber;
        
        const blockDisplay = log.block || 'N/A';
        const programDisplay = log.program || 'N/A';
        
        const checkInDate = log.check_in_time ? new Date(log.check_in_time) : null;
        const timeStr = checkInDate ? checkInDate.toLocaleTimeString('en-GB', { 
            hour: '2-digit', 
            minute: '2-digit' 
        }) : 'N/A';

        // Determine if this is a lecturer check-in
        const isLecturerCheckin = log.session_type === 'Lecturer Check-in';
        const locationDisplay = isLecturerCheckin ? 'Lecturer Check-in' : 
            (log.location_address || log.location_friendly_name || log.location_name || 'N/A');

        return `
            <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s; ${isLecturerCheckin ? 'background: #f0fdf4;' : ''}" 
                onmouseover="this.style.background='${isLecturerCheckin ? '#dcfce7' : '#f8fafc'}'" 
                onmouseout="this.style.background='${isLecturerCheckin ? '#f0fdf4' : 'transparent'}'">
                
                <td style="padding: 10px 14px; font-weight: 500; color: #1e293b; font-size: 13px;">
                    ${this.escapeHtml(studentName)}
                    ${isLecturerCheckin ? ' <span style="font-size:10px;background:#10b981;color:white;padding:1px 8px;border-radius:10px;">👨‍🏫</span>' : ''}
                </td>
                
                <td style="padding: 10px 14px; font-weight: 600; color: #4C1D95; font-size: 12px;" 
                    title="${this.escapeHtml(regNumber)}">
                    ${this.escapeHtml(displayReg)}
                </td>
                
                <td style="padding: 10px 14px; color: #475569; font-size: 12px;">
                    <span style="background: ${programDisplay === 'KRCHN' ? '#dbeafe' : '#fef3c7'}; 
                                 color: ${programDisplay === 'KRCHN' ? '#1e40af' : '#92400e'}; 
                                 padding: 2px 10px; border-radius: 12px; font-size: 11px;">
                        ${this.escapeHtml(programDisplay)}
                    </span>
                </td>
                
                <td style="padding: 10px 14px; color: #475569; font-size: 13px;">
                    ${this.escapeHtml(blockDisplay)}
                </td>
                
                <td style="padding: 10px 14px; color: #475569; font-size: 13px;">
                    ${this.escapeHtml(log.unit_name || log.target_name || 'General')}
                </td>
                
                <td style="padding: 10px 14px;">
                    <span style="background: ${isLecturerCheckin ? '#d1fae5' : '#dbeafe'}; 
                                 color: ${isLecturerCheckin ? '#065f46' : '#1e40af'}; 
                                 padding: 2px 10px; border-radius: 12px; font-size: 11px;">
                        ${this.escapeHtml(log.session_type || 'Class')}
                    </span>
                </td>
                
                <td style="padding: 10px 14px; color: #475569; font-size: 13px;">
                    ${timeStr}
                </td>
                
                <td style="padding: 10px 14px; color: #475569; font-size: 12px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${this.escapeHtml(locationDisplay)}
                </td>
                
                <td style="padding: 10px 14px; text-align: center;">
                    <span style="background: ${statusColor}20; 
                                 color: ${statusColor}; 
                                 padding: 3px 12px; 
                                 border-radius: 12px; 
                                 font-size: 11px; 
                                 font-weight: 600;">
                        ${status}
                    </span>
                    ${log.is_verified ? '<span style="font-size:10px;color:#10b981;margin-left:4px;">✓</span>' : ''}
                </td>
                
                <td style="padding: 10px 14px; text-align: center;">
                    ${hasLocation && !isLecturerCheckin ? 
                        `<button onclick="LecturerAttendance.viewAttendanceMap(${log.latitude}, ${log.longitude}, '${this.escapeHtml(studentName)}')" 
                                style="background: #4C1D95; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; display: inline-flex; align-items: center; gap: 3px;">
                            <i class="fas fa-map-marker-alt" style="font-size:10px;"></i> Map
                        </button>` : 
                        `<span style="color: #94a3b8; font-size: 11px;">${isLecturerCheckin ? '✓' : 'No location'}</span>`
                    }
                </td>
            </tr>
        `;
    }).join('');
},

    // ============================================================
    // UPDATE STATS - FULL FUNCTION
    // ============================================================
    updateStats(logs) {
        if (!logs) logs = this.todayLogs || [];
        
        // Calculate stats
        const total = logs.length;
        const present = logs.filter(l => {
            const status = (l.attendance_status || '').toLowerCase();
            return status === 'present' || l.is_verified === true;
        }).length;
        
        const absent = logs.filter(l => {
            const status = (l.attendance_status || '').toLowerCase();
            return status === 'absent';
        }).length;
        
        const pending = logs.filter(l => {
            const status = (l.attendance_status || '').toLowerCase();
            return status === 'pending' || status === '' || l.attendance_status === null;
        }).length;
        
        const rate = total > 0 ? Math.round((present / total) * 100) : 0;
        
        // Store stats
        this.stats = { total, present, absent, pending, rate };
        
        // Log for debugging
        console.log(`📊 Stats: total=${total}, present=${present}, absent=${absent}, pending=${pending}, rate=${rate}%`);
        
        // Update all UI elements
        const elementMap = {
            'todayTotal': total,
            'todayPresent': present,
            'todayAbsent': absent,
            'todayPending': pending,
            'todayRate': rate + '%',
            'attendanceRate': rate + '%',
            'filteredCount': total,
            'totalStudentsCount': total,
            'presentTodayCount': present,
            'absentTodayCount': absent,
            'pendingCount': pending,
            'todayTotalDisplay': total,
            'todayPresentDisplay': present,
            'todayAbsentDisplay': absent,
            'todayPendingDisplay': pending,
            'attendanceRateDisplay': rate + '%'
        };
        
        let updatedCount = 0;
        for (const [id, value] of Object.entries(elementMap)) {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = value;
                updatedCount++;
            }
        }
        
        // Update progress bar
        const progressBar = document.getElementById('attendanceProgressBar');
        if (progressBar) {
            progressBar.style.width = rate + '%';
            progressBar.setAttribute('aria-valuenow', rate);
            progressBar.style.background = rate >= 80 ? '#10b981' : (rate >= 60 ? '#f59e0b' : '#ef4444');
        }
        
        // Update rate badge
        const rateBadge = document.getElementById('attendanceRateBadge');
        if (rateBadge) {
            rateBadge.textContent = rate + '%';
            rateBadge.style.background = rate >= 80 ? '#d1fae5' : (rate >= 60 ? '#fef3c7' : '#fee2e2');
            rateBadge.style.color = rate >= 80 ? '#065f46' : (rate >= 60 ? '#92400e' : '#991b1b');
        }
        
        console.log(`✅ Stats updated (${updatedCount} elements)`);
        
        return this.stats;
    },

    // ============================================================
    // LOAD PAST ATTENDANCE
    // ============================================================
    async loadPastAttendance() {
        const tbody = document.getElementById('pastAttendanceTable');
        if (!tbody) {
            console.warn('⚠️ pastAttendanceTable not found');
            return;
        }

        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) {
                tbody.innerHTML = '<tr><td colspan="10" style="padding:30px;text-align:center;color:#ef4444;">Database not available</td></tr>';
                return;
            }

            const profile = window.lecturerDB?.getCurrentUserProfile();
            const program = profile?.program || profile?.department || 'KRCHN';

            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];

            // Get past records (excluding today)
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
            console.log(`📊 Loaded ${this.pastLogs.length} past attendance records`);

            this.renderPastAttendance();

        } catch (error) {
            console.error('❌ Failed to load past attendance:', error);
            tbody.innerHTML = `<tr><td colspan="10" style="padding:30px;text-align:center;color:#ef4444;">Error: ${error.message}</td></tr>`;
        }
    },

    // ============================================================
    // RENDER PAST ATTENDANCE
    // ============================================================
   // ============================================================
// RENDER PAST ATTENDANCE - FIXED TO USE REGISTRATION NUMBER
// ============================================================
renderPastAttendance() {
    const tbody = document.getElementById('pastAttendanceTable');
    if (!tbody) return;

    const logs = this.pastLogs;

    // Update count
    const countEl = document.getElementById('pastLogCount');
    if (countEl) countEl.textContent = `${logs.length} records`;

    // Empty state
    if (!logs || logs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" style="padding:40px;text-align:center;color:#94a3b8;">
                    <i class="fas fa-history" style="font-size:32px;display:block;margin-bottom:10px;color:#e2e8f0;"></i>
                    <p style="margin:0;">No past attendance records found.</p>
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
        'Excused': '#3b82f6'
    };

    tbody.innerHTML = logs.map((log) => {
        const hasLocation = log.latitude && log.longitude;
        const status = log.attendance_status || 'Pending';
        const statusColor = statusColors[status] || '#6b7280';
        const date = log.check_in_time ? new Date(log.check_in_time) : new Date();
        
        const studentName = log.student_name || 'Unknown Student';
        
        // ✅ FIX: Use registration_number instead of student_id
        const regNumber = log.registration_number || log.student_id || 'N/A';
        const displayReg = regNumber.length > 15 ? regNumber.substring(0, 15) + '...' : regNumber;
        
        const blockDisplay = log.block || 'N/A';
        const isLecturerCheckin = log.session_type === 'Lecturer Check-in';
        const locationDisplay = isLecturerCheckin ? 'Lecturer Check-in' : 
            (log.location_address || log.location_friendly_name || log.location_name || 'N/A');

        return `
            <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s; ${isLecturerCheckin ? 'background: #f0fdf4;' : ''}" 
                onmouseover="this.style.background='${isLecturerCheckin ? '#dcfce7' : '#f8fafc'}'" 
                onmouseout="this.style.background='${isLecturerCheckin ? '#f0fdf4' : 'transparent'}'">
                
                <td style="padding: 10px 14px; color: #475569; font-size: 12px;">
                    ${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                
                <td style="padding: 10px 14px; font-weight: 500; color: #1e293b; font-size: 13px;">
                    ${this.escapeHtml(studentName)}
                </td>
                
                <td style="padding: 10px 14px; font-weight: 600; color: #4C1D95; font-size: 12px;" 
                    title="${this.escapeHtml(regNumber)}">
                    ${this.escapeHtml(displayReg)}
                </td>
                
                <td style="padding: 10px 14px; color: #475569; font-size: 13px;">
                    ${this.escapeHtml(blockDisplay)}
                </td>
                
                <td style="padding: 10px 14px; color: #475569; font-size: 13px;">
                    ${this.escapeHtml(log.unit_name || log.target_name || 'General')}
                </td>
                
                <td style="padding: 10px 14px;">
                    <span style="background: ${isLecturerCheckin ? '#d1fae5' : '#dbeafe'}; 
                                 color: ${isLecturerCheckin ? '#065f46' : '#1e40af'}; 
                                 padding: 2px 10px; border-radius: 12px; font-size: 11px;">
                        ${this.escapeHtml(log.session_type || 'Class')}
                    </span>
                </td>
                
                <td style="padding: 10px 14px; color: #475569; font-size: 13px;">
                    ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </td>
                
                <td style="padding: 10px 14px; color: #475569; font-size: 12px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${this.escapeHtml(locationDisplay)}
                </td>
                
                <td style="padding: 10px 14px; text-align: center;">
                    <span style="background: ${statusColor}20; color: ${statusColor}; padding: 3px 12px; border-radius: 12px; font-size: 11px; font-weight: 600;">
                        ${status}
                    </span>
                </td>
                
                <td style="padding: 10px 14px; text-align: center;">
                    ${hasLocation && !isLecturerCheckin ? 
                        `<button onclick="LecturerAttendance.viewAttendanceMap(${log.latitude}, ${log.longitude}, '${this.escapeHtml(studentName)}')" 
                                style="background: #4C1D95; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; display: inline-flex; align-items: center; gap: 3px;">
                            <i class="fas fa-map-marker-alt" style="font-size:10px;"></i> Map
                        </button>` : 
                        `<span style="color: #94a3b8; font-size: 11px;">${isLecturerCheckin ? '✓' : 'No location'}</span>`
                    }
                </td>
            </tr>
        `;
    }).join('');
},
    // ============================================================
    // LOAD ATTENDANCE STATS (for dashboard cards)
    // ============================================================
    async loadAttendanceStats() {
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) return;

            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];

            // Get today's stats
            const { data: logs, error } = await supabase
                .from('geo_attendance_logs')
                .select('attendance_status, is_verified')
                .gte('check_in_time', `${todayStr}T00:00:00.000Z`)
                .lte('check_in_time', `${todayStr}T23:59:59.999Z`);

            if (error) {
                console.error('❌ Error loading stats:', error);
                return;
            }

            const total = logs?.length || 0;
            const present = logs?.filter(l => {
                const status = (l.attendance_status || '').toLowerCase();
                return status === 'present' || l.is_verified === true;
            }).length || 0;
            const absent = logs?.filter(l => {
                const status = (l.attendance_status || '').toLowerCase();
                return status === 'absent';
            }).length || 0;
            const pending = total - present - absent;
            const rate = total > 0 ? Math.round((present / total) * 100) : 0;

            // Update dashboard cards
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

            console.log(`📊 Dashboard stats: total=${total}, present=${present}, absent=${absent}, pending=${pending}, rate=${rate}%`);

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
            const program = profile?.program || profile?.department;
            if (!program) return;

            const supabase = window.lecturerDB?.supabase;
            if (!supabase) return;

            // Get student count
            const { count: studentCount } = await supabase
                .from('consolidated_user_profiles_table')
                .select('*', { count: 'exact', head: true })
                .eq('program', program)
                .eq('role', 'student');

            // Get block from assigned units
            const blocks = [...new Set(this.assignedUnits.map(u => u.block).filter(Boolean))];
            const currentBlock = blocks.length > 0 ? blocks[0] : 'N/A';

            const programDisplay = window.LecturerUtils?.getProgramDisplayName?.(program) || program;
            const isTVET = program !== 'KRCHN';

            const displayMap = {
                'programDisplayName': programDisplay,
                'programTypeBadge': isTVET ? 'TVET' : 'Nursing',
                'currentBlockDisplay': currentBlock,
                'studentCountDisplay': (studentCount || 0) + ' Students'
            };

            for (const [id, value] of Object.entries(displayMap)) {
                const el = document.getElementById(id);
                if (el) el.textContent = value;
            }

        } catch (error) {
            console.error('❌ Failed to load program info:', error);
        }
    },

    // ============================================================
    // VIEW ATTENDANCE MAP
    // ============================================================
    viewAttendanceMap(lat, lng, name) {
        if (!lat || !lng) {
            this.showNotification('No location data available.', 'warning');
            return;
        }

        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);

        if (isNaN(latNum) || isNaN(lngNum)) {
            this.showNotification('Invalid location data.', 'warning');
            return;
        }

        this.currentLocation = { lat: latNum, lng: lngNum, name: name };

        // Show modal
        const modal = document.getElementById('attendanceMapModal');
        if (modal) {
            modal.style.display = 'flex';
        }

        // Update location info
        const infoEl = document.getElementById('mapLocationInfo');
        const textEl = document.getElementById('mapLocationText');
        if (infoEl && textEl) {
            infoEl.style.display = 'block';
            textEl.textContent = `📍 ${name} - Latitude: ${latNum.toFixed(6)}, Longitude: ${lngNum.toFixed(6)}`;
        }

        // Initialize map after a delay
        setTimeout(() => {
            this.initMap(latNum, lngNum, name);
        }, 300);
    },

    // ============================================================
    // INIT MAP
    // ============================================================
    initMap(lat, lng, name) {
        const container = document.getElementById('mapContainer');
        if (!container) return;

        // Clean up existing map
        if (this.mapInstance) {
            this.mapInstance.remove();
            this.mapInstance = null;
        }

        // Hide loading
        const loadingEl = document.getElementById('mapLoading');
        if (loadingEl) loadingEl.style.display = 'none';

        // Check if Leaflet is loaded
        if (typeof L === 'undefined') {
            container.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;flex-direction:column;padding:20px;">
                    <i class="fas fa-map" style="font-size:48px;margin-bottom:10px;color:#e2e8f0;"></i>
                    <p style="text-align:center;max-width:300px;">Map library not loaded. Please check your internet connection.</p>
                    <button onclick="LecturerAttendance.initMap(${lat}, ${lng}, '${name}')" 
                            style="margin-top:10px;background:#4C1D95;color:white;border:none;padding:8px 20px;border-radius:6px;cursor:pointer;font-size:13px;">
                        <i class="fas fa-sync-alt"></i> Retry
                    </button>
                </div>
            `;
            return;
        }

        try {
            // Create map
            this.mapInstance = L.map(container).setView([lat, lng], 16);

            // Add tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                maxZoom: 19
            }).addTo(this.mapInstance);

            // Add marker
            L.marker([lat, lng])
                .addTo(this.mapInstance)
                .bindPopup(`<b>${this.escapeHtml(name)}</b><br>Lat: ${lat.toFixed(6)}<br>Lng: ${lng.toFixed(6)}`)
                .openPopup();

            // Add radius circle
            L.circle([lat, lng], {
                radius: 50,
                color: '#4C1D95',
                fillColor: '#4C1D95',
                fillOpacity: 0.1,
                weight: 2
            }).addTo(this.mapInstance);

            // Fix map size after render
            setTimeout(() => {
                if (this.mapInstance) {
                    this.mapInstance.invalidateSize();
                }
            }, 400);

        } catch (error) {
            console.error('❌ Error initializing map:', error);
            container.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#ef4444;flex-direction:column;padding:20px;">
                    <i class="fas fa-exclamation-triangle" style="font-size:32px;margin-bottom:10px;"></i>
                    <p>Error loading map: ${error.message}</p>
                </div>
            `;
        }
    },

    // ============================================================
    // LECTURER SELF CHECK-IN
    // ============================================================
    async lecturerCheckIn() {
        if (this.isProcessing) {
            this.showNotification('Please wait, processing...', 'warning');
            return;
        }

        const btn = document.getElementById('lecturerCheckinBtn');
        const statusEl = document.getElementById('lecturerCheckinStatus');

        if (!btn) return;

        this.isProcessing = true;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Getting location...';

        if (statusEl) {
            statusEl.textContent = '⏳ Getting location...';
            statusEl.style.color = '#f59e0b';
        }

        // Check if geolocation is available
        if (!navigator.geolocation) {
            this.showNotification('Geolocation not supported by your browser.', 'error');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check-circle"></i> Mark My Attendance';
            if (statusEl) {
                statusEl.textContent = '❌ Geolocation not supported';
                statusEl.style.color = '#ef4444';
            }
            this.isProcessing = false;
            return;
        }

        // Get location
        navigator.geolocation.getCurrentPosition(
            // Success callback
            async (position) => {
                try {
                    const supabase = window.lecturerDB?.supabase;
                    const profile = window.lecturerDB?.getCurrentUserProfile();
                    const userId = this.lecturerAssignmentId || profile?.user_id;

                    if (!supabase || !userId) {
                        throw new Error('Database or user not available');
                    }

                    if (statusEl) {
                        statusEl.textContent = '⏳ Checking in...';
                        statusEl.style.color = '#f59e0b';
                    }

                    // Check if already checked in today
                    const today = new Date().toISOString().split('T')[0];
                    const { data: existing, error: checkError } = await supabase
                        .from('geo_attendance_logs')
                        .select('id')
                        .eq('student_id', userId)
                        .eq('session_type', 'Lecturer Check-in')
                        .gte('check_in_time', `${today}T00:00:00.000Z`)
                        .lte('check_in_time', `${today}T23:59:59.999Z`)
                        .limit(1);

                    if (checkError) {
                        console.warn('⚠️ Error checking existing check-in:', checkError);
                    }

                    if (existing && existing.length > 0) {
                        this.showNotification('✅ You have already checked in today!', 'success');
                        if (statusEl) {
                            statusEl.textContent = '✅ Already checked in today';
                            statusEl.style.color = '#10b981';
                        }
                        btn.disabled = false;
                        btn.innerHTML = '<i class="fas fa-check-circle"></i> Mark My Attendance';
                        this.isProcessing = false;
                        return;
                    }

                    // Insert check-in record
                    const { error: insertError } = await supabase
                        .from('geo_attendance_logs')
                        .insert({
                            student_id: userId,
                            student_name: profile?.full_name || 'Lecturer',
                            check_in_time: new Date().toISOString(),
                            session_type: 'Lecturer Check-in',
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                            accuracy_m: position.coords.accuracy || null,
                            attendance_status: 'Present',
                            is_verified: true,
                            target_name: 'Lecturer Check-in',
                            location_address: 'Lecturer Check-in',
                            program: profile?.program || profile?.department || 'KRCHN',
                            role: 'lecturer',
                            recorded_by_name: profile?.full_name || 'Lecturer'
                        });

                    if (insertError) {
                        console.error('❌ Insert error:', insertError);
                        throw new Error(insertError.message);
                    }

                    this.showNotification('✅ Lecturer check-in logged successfully!', 'success');
                    if (statusEl) {
                        statusEl.textContent = '✅ Checked in successfully';
                        statusEl.style.color = '#10b981';
                    }

                    // Refresh attendance data
                    await this.loadTodayAttendance();
                    await this.loadAttendanceStats();

                } catch (error) {
                    console.error('❌ Check-in error:', error);
                    this.showNotification('Check-in failed: ' + error.message, 'error');
                    if (statusEl) {
                        statusEl.textContent = '❌ Check-in failed';
                        statusEl.style.color = '#ef4444';
                    }
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-check-circle"></i> Mark My Attendance';
                    this.isProcessing = false;
                }
            },
            // Error callback
            (error) => {
                console.error('❌ Geolocation error:', error);
                let errorMessage = 'Location unavailable';
                if (error.code === 1) errorMessage = 'Location access denied. Please enable location services.';
                else if (error.code === 2) errorMessage = 'Location unavailable. Please try again.';
                else if (error.code === 3) errorMessage = 'Location request timed out.';

                this.showNotification('Geolocation error: ' + errorMessage, 'error');
                if (statusEl) {
                    statusEl.textContent = '❌ ' + errorMessage;
                    statusEl.style.color = '#ef4444';
                }
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-check-circle"></i> Mark My Attendance';
                this.isProcessing = false;
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 30000
            }
        );
    },

    // ============================================================
    // MARK STUDENT ATTENDANCE (Manual)
    // ============================================================
    async markStudentAttendance(e) {
        if (e) e.preventDefault();

        if (this.isProcessing) {
            this.showNotification('Please wait, processing...', 'warning');
            return;
        }

        const form = document.getElementById('manualAttendanceForm');
        const btn = form?.querySelector('button[type="submit"]');
        const originalText = btn?.innerHTML || 'Mark Student Present';

        if (!form || !btn) {
            this.showNotification('Form not found.', 'error');
            return;
        }

        this.isProcessing = true;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Marking...';

        try {
            // Get form values
            const studentId = document.getElementById('attStudentId')?.value;
            const sessionType = document.getElementById('attSessionType')?.value;
            const unit = document.getElementById('attUnit')?.value;
            const location = document.getElementById('attLocation')?.value;
            const date = document.getElementById('attDate')?.value;
            const time = document.getElementById('attTime')?.value;

            // Validate
            if (!studentId) {
                this.showNotification('Please select a student.', 'error');
                btn.disabled = false;
                btn.innerHTML = originalText;
                this.isProcessing = false;
                return;
            }

            if (!sessionType) {
                this.showNotification('Please select a session type.', 'error');
                btn.disabled = false;
                btn.innerHTML = originalText;
                this.isProcessing = false;
                return;
            }

            if (!date) {
                this.showNotification('Please select a date.', 'error');
                btn.disabled = false;
                btn.innerHTML = originalText;
                this.isProcessing = false;
                return;
            }

            const supabase = window.lecturerDB?.supabase;
            const profile = window.lecturerDB?.getCurrentUserProfile();

            if (!supabase || !profile) {
                throw new Error('Database not available');
            }

            // Get student details
            const { data: student, error: studentError } = await supabase
                .from('consolidated_user_profiles_table')
                .select('full_name, program, block, intake_year, student_id')
                .eq('user_id', studentId)
                .maybeSingle();

            if (studentError) {
                console.error('❌ Student lookup error:', studentError);
                throw new Error('Failed to find student');
            }

            if (!student) {
                throw new Error('Student not found');
            }

            // Build check-in time
            const checkInTime = time ? `${date}T${time}:00.000Z` : `${date}T12:00:00.000Z`;

            // Insert attendance record
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
                    program: student.program || profile.program || 'KRCHN',
                    block: student.block || profile.block,
                    intake_year: student.intake_year || profile.intake_year,
                    role: 'student',
                    recorded_by_id: profile.user_id,
                    recorded_by_name: profile.full_name || 'Lecturer',
                    created_at: new Date().toISOString()
                });

            if (insertError) {
                console.error('❌ Insert error:', insertError);
                throw new Error(insertError.message);
            }

            this.showNotification(`✅ ${student.full_name || 'Student'} marked present!`, 'success');

            // Reset form
            form.reset();
            const today = new Date();
            document.getElementById('attDate').value = today.toISOString().split('T')[0];

            // Refresh attendance
            await this.loadTodayAttendance();
            await this.loadAttendanceStats();

        } catch (error) {
            console.error('❌ Mark attendance error:', error);
            this.showNotification('Failed to mark attendance: ' + error.message, 'error');
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
        // Set today's date on date inputs
        const today = new Date().toISOString().split('T')[0];
        
        const filterDate = document.getElementById('filterDate');
        if (filterDate) filterDate.value = today;
        
        const attDate = document.getElementById('attDate');
        if (attDate) attDate.value = today;

        // Populate student dropdown
        this.populateStudentSelect();
    },

    // ============================================================
    // POPULATE STUDENT SELECT
    // ============================================================
    async populateStudentSelect() {
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

            if (error) {
                console.error('❌ Error loading students:', error);
                return;
            }

            const select = document.getElementById('attStudentId');
            if (select && students) {
                select.innerHTML = '<option value="">-- Select Student --</option>' +
                    students.map(s => 
                        `<option value="${s.user_id}">${this.escapeHtml(s.full_name)} (${this.escapeHtml(s.student_id || 'N/A')})</option>`
                    ).join('');
                console.log(`👥 Loaded ${students.length} students`);
            }

        } catch (error) {
            console.error('❌ Failed to populate student select:', error);
        }
    },

    // ============================================================
    // FILTER FUNCTIONS
    // ============================================================
    applyFilters() {
        console.log('🔍 Applying filters...');
        // Just re-render with current data
        this.renderTodayAttendance();
        this.renderPastAttendance();
    },

    resetFilters() {
        console.log('🔄 Resetting filters...');
        const filterIds = ['filterDate', 'filterBlock', 'filterYear', 'filterSessionType'];
        filterIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                if (id === 'filterDate') {
                    el.value = new Date().toISOString().split('T')[0];
                } else {
                    el.value = 'All';
                }
            }
        });

        const searchEl = document.getElementById('filterSearch');
        if (searchEl) searchEl.value = '';

        this.applyFilters();
        this.showNotification('Filters reset!', 'info');
    },

    // ============================================================
    // EXPORT CSV
    // ============================================================
    exportCSV() {
        const logs = this.todayLogs.filter(log => log.session_type !== 'Lecturer Check-in');
        
        if (!logs || logs.length === 0) {
            this.showNotification('No data to export.', 'warning');
            return;
        }

        const headers = ['Student Name', 'Reg No', 'Program', 'Block', 'Unit', 'Session Type', 'Date/Time', 'Location', 'Status'];
        const rows = [headers.join(',')];

        logs.forEach(log => {
            const status = log.attendance_status || (log.is_verified ? 'Present' : 'Pending');
            const date = log.check_in_time ? new Date(log.check_in_time) : new Date();

            const row = [
                `"${(log.student_name || 'Unknown')}"`,
                `"${(log.student_id || 'N/A')}"`,
                `"${(log.program || 'N/A')}"`,
                `"${(log.block || 'N/A')}"`,
                `"${(log.unit_name || log.target_name || 'General')}"`,
                `"${(log.session_type || 'Class')}"`,
                `"${date.toLocaleString('en-GB')}"`,
                `"${(log.location_address || log.location_friendly_name || log.location_name || 'N/A')}"`,
                `"${status}"`
            ];
            rows.push(row.join(','));
        });

        const csv = rows.join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('✅ Attendance exported!', 'success');
    },

    // ============================================================
    // PRINT REPORT
    // ============================================================
    printReport() {
        window.print();
    },

    // ============================================================
    // SHOW NOTIFICATION
    // ============================================================
    showNotification(message, type = 'info') {
        console.log(`[${type}] ${message}`);
        
        try {
            if (window.LecturerUI && typeof window.LecturerUI.showNotification === 'function') {
                window.LecturerUI.showNotification(message, type);
                return;
            }
        } catch (e) {
            // Silent fallback
        }

        // Fallback notification
        try {
            const toast = document.createElement('div');
            const colors = {
                success: '#10b981',
                error: '#ef4444',
                warning: '#f59e0b',
                info: '#3b82f6'
            };
            toast.style.cssText = `
                position: fixed; bottom: 20px; right: 20px; padding: 12px 24px;
                background: ${colors[type] || '#3b82f6'}; color: white;
                border-radius: 8px; font-weight: 500; z-index: 100000;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                max-width: 400px; font-family: system-ui, sans-serif;
                animation: slideUp 0.3s ease;
            `;
            toast.textContent = message;
            document.body.appendChild(toast);
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transition = 'opacity 0.5s';
                setTimeout(() => toast.remove(), 500);
            }, 3500);
        } catch (e) {
            // Silent fallback
        }
    },

    // ============================================================
    // SHOW ERROR
    // ============================================================
    showError(message) {
        console.error('❌', message);
        this.showNotification(message, 'error');
    },

    // ============================================================
    // ESCAPE HTML
    // ============================================================
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // ============================================================
    // SETUP EVENT LISTENERS
    // ============================================================
    setupEventListeners() {
        // Lecturer check-in button
        const checkinBtn = document.getElementById('lecturerCheckinBtn');
        if (checkinBtn) {
            checkinBtn.addEventListener('click', () => this.lecturerCheckIn());
        }

        // Manual attendance form
        const form = document.getElementById('manualAttendanceForm');
        if (form) {
            form.addEventListener('submit', (e) => this.markStudentAttendance(e));
        }

        // Filter inputs
        ['filterDate', 'filterBlock', 'filterYear', 'filterSessionType'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', () => this.applyFilters());
            }
        });

        // Search input with debounce
        const searchInput = document.getElementById('filterSearch');
        if (searchInput) {
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
        console.log('🔄 Refreshing attendance...');
        await this.loadAllAttendance();
        this.showNotification('Attendance refreshed!', 'success');
    },

    // ============================================================
    // CLOSE MAP MODAL
    // ============================================================
    closeMapModal() {
        const modal = document.getElementById('attendanceMapModal');
        if (modal) modal.style.display = 'none';
        if (this.mapInstance) {
            this.mapInstance.remove();
            this.mapInstance = null;
        }
    },

    // ============================================================
    // OPEN IN GOOGLE MAPS
    // ============================================================
    openInGoogleMaps() {
        const loc = this.currentLocation;
        if (loc) {
            window.open(`https://www.google.com/maps?q=${loc.lat},${loc.lng}`, '_blank');
        }
    }
};

// ============================================================
// INITIALIZE
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing Lecturer Attendance Module...');
    setTimeout(() => {
        LecturerAttendance.init();
    }, 750);
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
console.log('📋 Features: Today/Past attendance, Stats, Check-in, Map, Export, Print');
