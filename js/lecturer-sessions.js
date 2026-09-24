// js/lecturer-sessions.js - COMPLETE WITH TVET + INTAKE YEAR + OCCURRENCE-SAFE ATTENDANCE + GEO COORDINATES
/**
 * NCHSM Lecturer Sessions Module
 * Uses scheduled_sessions table with correct column names
 * ✅ Includes session open/close for student attendance sign-in
 * ✅ STRICT UNIT ASSIGNMENT FILTERING - Same as Resources and Marks
 * ✅ Supports both Nursing (KRCHN) and TVET programs
 * ✅ intake_year taken from lecturer's dropdown selection
 * ✅ lecturer_id populated for proper joins
 * ✅ editSession() — lecturer can edit date/time/location
 * ✅ Each attendance occurrence uses its own scheduled_sessions UUID
 * ✅ Sessions with attendance cannot be reopened/reused
 * ✅ Editing date/time after attendance creates a fresh session UUID
 * ✅ NEW: CAMPUS_LOCATIONS map — auto-populates target lat/lng/radius
 * ✅ NEW: Location-aware target coordinates on create AND edit
 */

const LecturerSessions = {
    sessions: [],
    lecturerAssignmentId: null,
    lecturerUuid: null,
    assignedUnits: [],
    isProcessing: false,
    isTVET: false,
    currentProgram: 'KRCHN',

    // ============================================
    // CAMPUS LOCATIONS — target coordinates for geofencing
    // Add more halls here as you collect their coordinates.
    // Lookup is case-insensitive + substring + "LH6" alias.
    // ============================================
    CAMPUS_LOCATIONS: {
        'lecture hall 6':   { lat: -0.261366, lng: 36.011125, radius: 50 },
        // 'lecture hall 1': { lat: 0, lng: 0, radius: 50 },
        // 'lecture hall 2': { lat: 0, lng: 0, radius: 50 },
        // 'lecture hall 3': { lat: 0, lng: 0, radius: 50 },
        // 'lecture hall 4': { lat: 0, lng: 0, radius: 50 },
        // 'lecture hall 5': { lat: 0, lng: 0, radius: 50 },
        // 'skills lab':     { lat: 0, lng: 0, radius: 60 },
        // 'clinical room 1':{ lat: 0, lng: 0, radius: 75 },
    },

    // Resolve a free-text location name to coordinates.
    // Returns { lat, lng, radius } or null.
    resolveLocationCoordinates(locationName) {
        if (!locationName) return null;
        const key = String(locationName).trim().toLowerCase();
        if (!key) return null;

        if (this.CAMPUS_LOCATIONS[key]) return this.CAMPUS_LOCATIONS[key];

        for (const [name, coords] of Object.entries(this.CAMPUS_LOCATIONS)) {
            if (key.includes(name) || name.includes(key)) return coords;
        }

        const lhMatch = key.match(/\blh[\s\-]?(\d+)\b/);
        if (lhMatch) {
            const alias = `lecture hall ${lhMatch[1]}`;
            if (this.CAMPUS_LOCATIONS[alias]) return this.CAMPUS_LOCATIONS[alias];
        }

        return null;
    },

    // ============================================
    // PROGRAM TYPE DETECTION
    // ============================================
    getProgramType() {
        return window.CURRENT_PROGRAM_TYPE || 'KRCHN';
    },

    isTVETProgram() {
        return this.getProgramType() === 'TVET';
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

    getBlockShortName(blockValue) {
        if (!blockValue) return 'N/A';
        const programType = this.getProgramType();
        if (programType === 'TVET') {
            return blockValue;
        } else {
            if (blockValue.startsWith('Block ')) return blockValue;
            if (blockValue === 'Introductory') return 'Introductory';
            if (blockValue === 'Final') return 'Final';
            return `Block ${blockValue}`;
        }
    },

    getProgramTypeLabel() {
        return this.isTVETProgram() ? '🔧 TVET' : '🎓 Nursing';
    },

    getProgramEmoji() {
        return this.isTVETProgram() ? '🔧' : '🎓';
    },

    // ============================================================
    // SESSION DATE SAFETY
    // A scheduled session is tied to its scheduled date.
    // OPEN/CLOSE/REOPEN never creates a new session ID.
    // ============================================================
    getLocalDateString(date = new Date()) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    },

    getSessionDateString(session) {
        if (!session?.session_date) return '';
        return String(session.session_date).slice(0, 10);
    },

    async getSessionAttendanceCount(sessionId) {
        const supabase = window.lecturerDB?.supabase;
        if (!supabase || !sessionId) return 0;
        const { count, error } = await supabase
            .from('geo_attendance_logs')
            .select('id', { count: 'exact', head: true })
            .eq('session_id', sessionId)
            .neq('role', 'lecturer');
        if (error) throw error;
        return Number(count || 0);
    },

    async getSessionAttendanceIds(sessionId) {
        const supabase = window.lecturerDB?.supabase;
        if (!supabase || !sessionId) return [];
        const { data, error } = await supabase
            .from('geo_attendance_logs')
            .select('id,user_id,student_id,registration_number,attendance_status,check_in_time,is_verified')
            .eq('session_id', sessionId)
            .neq('role', 'lecturer')
            .order('check_in_time', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    chooseEffectiveAttendanceRows(logs) {
        const map = new Map();
        const rank = (row) => {
            const status = String(row?.attendance_status || '').toLowerCase();
            const present = status === 'present' || status === 'verified' || row?.is_verified === true;
            const absent = status === 'absent';
            return (present ? 3 : (absent ? 1 : 2));
        };
        for (const row of (logs || [])) {
            const key = String(row.user_id || row.student_id || row.registration_number || row.id || '').trim();
            if (!key) continue;
            const old = map.get(key);
            if (!old ||
                rank(row) > rank(old) ||
                (rank(row) === rank(old) &&
                 new Date(row.check_in_time || 0) > new Date(old.check_in_time || 0))) {
                map.set(key, row);
            }
        }
        return [...map.values()];
    },

    // ============================================
    // INITIALIZATION
    // ============================================
    async init() {
        console.log('📅 Initializing Lecturer Sessions...');
        this.currentProgram = this.getProgramType();
        this.isTVET = this.isTVETProgram();
        console.log(`📚 Program Type: ${this.getProgramTypeLabel()}`);
        console.log(`📍 Known campus locations: ${Object.keys(this.CAMPUS_LOCATIONS).length}`);

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
    // LOAD ASSIGNED UNITS
    // ============================================
    async loadAssignedUnits() {
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) return;

            const profile = window.lecturerDB?.getCurrentUserProfile();
            if (!profile) return;

            const fullName = profile.full_name;
            const program = this.currentProgram || profile.program || 'KRCHN';

            console.log(`🔍 Loading assigned units for lecturer: ${fullName} (${this.getProgramTypeLabel()})`);

            const { data: assignments, error } = await supabase
                .from('lecturer_subject_assignments')
                .select('subject_name, subject_code, block, program, academic_year, lecturer_id')
                .ilike('lecturer_name', `%${fullName}%`);

            if (error) {
                console.error('❌ Error loading assigned units:', error);
                this.assignedUnits = [];
                this.populateUnitDropdowns();
                return;
            }

            const programUnits = assignments?.filter(u => u.program === program) || [];
            const allUnits = assignments || [];

            this.assignedUnits = programUnits.length > 0 ? programUnits : allUnits;

            console.log(`📚 Loaded ${this.assignedUnits.length} assigned units for ${program}`);

            const lecturerIds = [...new Set(this.assignedUnits.map(u => u.lecturer_id))];
            if (lecturerIds.length > 0) {
                const counts = {};
                this.assignedUnits.forEach(u => {
                    counts[u.lecturer_id] = (counts[u.lecturer_id] || 0) + 1;
                });
                let maxCount = 0;
                let primaryId = lecturerIds[0];
                for (const [id, count] of Object.entries(counts)) {
                    if (count > maxCount) {
                        maxCount = count;
                        primaryId = id;
                    }
                }
                this.lecturerAssignmentId = primaryId;
                console.log(`✅ Primary lecturer ID set to: ${primaryId} (${maxCount} units)`);
            }

            this.populateUnitDropdowns();
            this.populateBlockDropdown();

        } catch (error) {
            console.error('❌ Failed to load assigned units:', error);
            this.assignedUnits = [];
        }
    },

    // ============================================
    // POPULATE UNIT DROPDOWNS
    // ============================================
    populateUnitDropdowns() {
        const unitSelect = document.getElementById('sessionUnit');
        if (!unitSelect) return;

        const units = this.assignedUnits;
        const typeLabel = this.getProgramTypeLabel();

        if (units && units.length > 0) {
            unitSelect.innerHTML = '<option value="">-- Select Unit --</option>' +
                units.map(u => {
                    const blockDisplay = this.getBlockDisplay(u.block);
                    return `<option value="${u.subject_name}" data-block="${u.block || ''}" data-year="${u.academic_year || ''}">
                        ${u.subject_code ? u.subject_code + ' - ' : ''}${u.subject_name} 
                        (${blockDisplay})
                        ${this.isTVET ? ' 🔧' : ''}
                    </option>`;
                }).join('');
            console.log(`📚 Populated ${units.length} assigned units (${typeLabel})`);
        } else {
            unitSelect.innerHTML = '<option value="">-- No units assigned --</option>';
            console.warn('⚠️ No assigned units to populate');
        }
    },

    // ============================================
    // POPULATE BLOCK DROPDOWN
    // ============================================
    populateBlockDropdown() {
        const blockSelect = document.getElementById('sessionBlockTerm');
        if (!blockSelect) return;

        const blocks = [...new Set(this.assignedUnits.map(u => u.block).filter(Boolean))];

        if (blocks.length > 0) {
            blockSelect.innerHTML = '<option value="">-- Select Block --</option>' +
                blocks.map(b => {
                    const displayName = this.getBlockDisplay(b);
                    return `<option value="${b}">${displayName}</option>`;
                }).join('');
            console.log(`📚 Populated ${blocks.length} blocks`);
        } else {
            blockSelect.innerHTML = '<option value="">-- No blocks assigned --</option>';
        }

        const label = document.getElementById('blockFilterLabel');
        if (label) {
            const blockType = this.isTVET ? 'Term' : 'Block';
            label.innerHTML = `<i class="fas fa-layer-group" style="color: #4C1D95; width: 18px;"></i> ${blockType}`;
        }
    },

    // ============================================
    // LOAD SESSIONS
    // ============================================
    async loadSessions() {
        try {
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const userId = this.lecturerUuid || profile?.user_id;

            if (!userId) {
                console.warn('No user ID found');
                return;
            }

            const supabase = window.lecturerDB?.supabase;
            if (!supabase) return;

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
            await this.renderSessions();
            this.updateStats();

            console.log(`✅ Loaded ${this.sessions.length} sessions - ${this.getProgramTypeLabel()}`);

        } catch (error) {
            console.error('Failed to load sessions:', error);
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Failed to load sessions: ' + error.message, 'error');
            }
        }
    },

    // ============================================
    // RENDER SESSIONS
    // ============================================
    async renderSessions() {
        const tbody = document.getElementById('sessionsTable');
        if (!tbody) return;

        const sessions = this.sessions;
        const typeLabel = this.getProgramTypeLabel();

        if (!sessions || sessions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="padding: 50px 20px; text-align: center; color: #94a3b8;">
                        <i class="fas fa-calendar-plus" style="font-size: 48px; display: block; margin-bottom: 15px; color: #e2e8f0;"></i>
                        <h3 style="color: #475569; margin: 0 0 8px 0;">No Sessions Scheduled</h3>
                        <p style="margin: 0; font-size: 14px;">Schedule your first session using the form above. (${typeLabel})</p>
                    </td>
                </tr>
            `;
            return;
        }

        // Fetch attendee counts
        let attendeeCounts = {};
        try {
            const supabase = window.lecturerDB?.supabase;
            if (supabase) {
                const ids = sessions.map(s => s.id);
                const { data } = await supabase
                    .from('geo_attendance_logs')
                    .select('session_id,user_id,student_id,registration_number,role')
                    .in('session_id', ids)
                    .neq('role', 'lecturer');

                const uniqueBySessionStudent = new Set();
                (data || []).forEach(r => {
                    if (!r.session_id) return;
                    const studentKey = r.user_id || r.student_id || r.registration_number;
                    if (!studentKey) return;
                    const key = `${r.session_id}:${studentKey}`;
                    if (uniqueBySessionStudent.has(key)) return;
                    uniqueBySessionStudent.add(key);
                    attendeeCounts[r.session_id] = (attendeeCounts[r.session_id] || 0) + 1;
                });
            }
        } catch (e) {
            console.warn('⚠️ Could not fetch attendee counts:', e);
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const statusBadges = {
            'pending': '<span style="background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 500;">⏳ Pending</span>',
            'approved': '<span style="background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 500;">✅ Approved</span>',
            'rejected': '<span style="background: #fee2e2; color: #991b1b; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 500;">❌ Rejected</span>',
            'completed': '<span style="background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 500;">📌 Completed</span>',
            'active': '<span style="background: #10b981; color: #065f46; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 500;">🟢 Active</span>',
            'closed': '<span style="background: #6b7280; color: #1e293b; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 500;">🔒 Closed</span>',
            'scheduled': '<span style="background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 500;">📅 Scheduled</span>'
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

            const status = session.approval_status || 'scheduled';
            const statusBadge = statusBadges[status] || statusBadges.scheduled;

            const sessionType = session.session_type || 'Class';
            const sessionTypeLabel = sessionTypeLabels[sessionType] || sessionType;

            const unitDisplay = session.unit_name || session.course_name || 'N/A';
            const blockDisplay = session.block_display || (session.block_term ? this.getBlockDisplay(session.block_term) : 'N/A');

            const rowStyle = isActive ? 'background: #d1fae5;' : (isToday ? 'background: #dbeafe;' : '');
            const rowClass = isPast && !isActive ? 'opacity: 0.7;' : '';

            // ✅ NEW: geo badge — shows whether session has target coordinates
            const hasGeo = session.target_latitude && session.target_longitude && session.target_radius;
            const geoBadge = hasGeo
                ? `<span title="Geo-target: ${Number(session.target_latitude).toFixed(5)}, ${Number(session.target_longitude).toFixed(5)} (±${session.target_radius}m)" style="font-size:9px;background:#d1fae5;color:#065f46;padding:1px 6px;border-radius:8px;margin-left:6px;">📍 geo</span>`
                : `<span title="No target coordinates — will fall back to campus center" style="font-size:9px;background:#fef3c7;color:#92400e;padding:1px 6px;border-radius:8px;margin-left:6px;">⚠ no geo</span>`;

            const attendeeCount = attendeeCounts[session.id] || 0;
            const attendeeBadge = attendeeCount === 0
                ? `<span style="background:#f1f5f9;color:#64748b;padding:4px 12px;border-radius:12px;font-size:11px;font-weight:500;">0 checked in</span>`
                : `<span style="background:#d1fae5;color:#065f46;padding:4px 12px;border-radius:12px;font-size:11px;font-weight:600;"><i class="fas fa-users"></i> ${attendeeCount} checked in</span>`;

            let sessionControls = '';
            if (isActive) {
                sessionControls += `
                    <button onclick="LecturerSessions.closeSession('${session.id}')" 
                            style="background: #ef4444; color: white; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 11px; display: inline-flex; align-items: center; gap: 3px;"
                            onmouseover="this.style.background='#dc2626'" onmouseout="this.style.background='#ef4444'">
                        <i class="fas fa-stop"></i> Close
                    </button>
                `;
            } else if (sessionDate && sessionDate.toDateString() === today.toDateString() && status !== 'closed') {
                sessionControls += `
                    <button onclick="LecturerSessions.openSession('${session.id}')" 
                            style="background: #10b981; color: white; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 11px; display: inline-flex; align-items: center; gap: 3px;"
                            onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'">
                        <i class="fas fa-play"></i> Open
                    </button>
                `;
            }

            const titleDisplay = session.session_title || session.title || 'N/A';
            const isTVET = this.isTVET;

            return `
                <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s; ${rowStyle} ${rowClass}" 
                    onmouseover="this.style.background='${isActive ? '#bfdbfe' : (isToday ? '#bfdbfe' : '#f8fafc')}'" 
                    onmouseout="this.style.background='${isActive ? '#d1fae5' : (isToday ? '#dbeafe' : 'transparent')}'">
                    <td style="padding: 14px 18px; font-weight: 600; color: #1e293b;">
                        ${this.escapeHtml(titleDisplay)}
                        ${isTVET ? ' <span style="font-size: 9px; background: #8b5cf6; color: white; padding: 2px 8px; border-radius: 10px;">TVET</span>' : ''}
                        ${isActive ? '<span style="font-size: 10px; background: #10b981; color: white; padding: 2px 8px; border-radius: 10px; margin-left: 8px;">🟢 OPEN</span>' : ''}
                        ${isToday && !isActive ? '<span style="font-size: 10px; background: #4C1D95; color: white; padding: 2px 8px; border-radius: 10px; margin-left: 8px;">TODAY</span>' : ''}
                        ${isPast && !isActive ? '<span style="font-size: 10px; color: #94a3b8; margin-left: 8px;">(Past)</span>' : ''}
                        ${geoBadge}
                        <div style="margin-top: 4px;">${statusBadge}</div>
                    </td>
                    <td style="padding: 14px 18px; color: #475569;">
                        ${dateTime}
                    </td>
                    <td style="padding: 14px 18px; color: #475569;">
                        ${sessionTypeLabel}
                    </td>
                    <td style="padding: 14px 18px; color: #475569; font-weight: 500;">
                        ${this.escapeHtml(unitDisplay)}
                        ${session.block_term ? `<div style="font-size: 10px; color: #94a3b8;">${blockDisplay}</div>` : ''}
                    </td>
                    <td style="padding: 14px 18px; color: #475569;">
                        ${this.escapeHtml(session.target_program || 'N/A')}
                        <div style="font-size: 10px; color: #94a3b8;">${blockDisplay} • Intake ${session.intake_year || 'N/A'}</div>
                    </td>
                    <td style="padding: 14px 18px; text-align: center;">
                        ${attendeeBadge}
                    </td>
                    <td style="padding: 14px 18px; text-align: center;">
                        <button onclick="LecturerSessions.viewAttendees('${session.id}')" 
                                style="background: #4C1D95; color: white; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 11px; display: inline-flex; align-items: center; gap: 3px;"
                                onmouseover="this.style.background='#5b21b6'" onmouseout="this.style.background='#4C1D95'">
                            <i class="fas fa-users"></i> View
                        </button>
                    </td>
                    <td style="padding: 14px 18px; text-align: center;">
                        <div style="display: flex; gap: 4px; justify-content: center; flex-wrap: wrap;">
                            <button onclick="LecturerSessions.editSession('${session.id}')" 
                                    style="background: #6366f1; color: white; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 11px; display: inline-flex; align-items: center; gap: 3px;"
                                    onmouseover="this.style.background='#4f46e5'" onmouseout="this.style.background='#6366f1'"
                                    title="Edit date / time / location">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button onclick="LecturerSessions.generateAttendanceLink('${session.id}')" 
                                    style="background: #2563eb; color: white; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 11px; display: inline-flex; align-items: center; gap: 3px;"
                                    onmouseover="this.style.background='#1d4ed8'" onmouseout="this.style.background='#2563eb'">
                                <i class="fas fa-link"></i> Link
                            </button>
                            ${(status === 'pending' || status === 'scheduled') ? `
                                <button onclick="LecturerSessions.cancelSession('${session.id}')" 
                                        style="background: #fee2e2; color: #dc2626; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 11px; display: inline-flex; align-items: center; gap: 3px;"
                                        onmouseover="this.style.background='#fecaca'" onmouseout="this.style.background='#fee2e2'">
                                    <i class="fas fa-times"></i>
                                </button>
                            ` : ''}
                            ${sessionControls}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        const countDisplay = document.getElementById('sessionCountDisplay');
        if (countDisplay) countDisplay.textContent = sessions.length;
    },

    // ============================================
    // GENERATE ATTENDANCE LINK
    // ============================================
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

    // ============================================
    // EDIT SESSION — update date / time / location + coords
    // ============================================
    async editSession(sessionId) {
        const session = this.sessions.find(s => s.id === sessionId);
        if (!session) {
            window.showNotification('Session not found.', 'error');
            return;
        }

        const profile = window.lecturerDB?.getCurrentUserProfile();
        if (session.created_by !== this.lecturerUuid && session.created_by !== profile?.user_id) {
            window.showNotification('You can only edit your own sessions.', 'warning');
            return;
        }

        const currentDate = session.session_date ? session.session_date.split('T')[0] : '';
        const currentTime = (session.session_time || '09:00').substring(0, 5);
        const currentLocation = session.location_name || '';
        const title = session.session_title || session.title || 'Session';
        const unit = session.unit_name || '';
        const blockDisplay = session.block_display || session.block_term || '';
        const sessionType = session.session_type || 'Class';

        const existing = document.getElementById('editSessionModal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'editSessionModal';
        modal.innerHTML = `
            <div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.55);backdrop-filter:blur(6px);z-index:999998;display:flex;align-items:center;justify-content:center;padding:16px;animation:fadeInBackdrop 0.25s ease;">
                <div style="background:#fff;border-radius:20px;max-width:520px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.35);animation:slideUpModal 0.35s cubic-bezier(0.34,1.56,0.64,1);overflow:hidden;max-height:92vh;display:flex;flex-direction:column;">

                    <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:20px 24px;color:#fff;">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
                            <div style="flex:1;min-width:0;">
                                <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                                    <i class="fas fa-edit" style="font-size:16px;opacity:0.9;"></i>
                                    <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;opacity:0.85;font-weight:600;">Edit Session</span>
                                </div>
                                <h2 style="margin:0;font-size:18px;font-weight:700;line-height:1.3;word-break:break-word;">${this.escapeHtml(title)}</h2>
                                ${unit ? `<div style="font-size:12px;opacity:0.85;margin-top:4px;word-break:break-word;">${this.escapeHtml(unit)}${blockDisplay ? ' · ' + this.escapeHtml(blockDisplay) : ''}</div>` : ''}
                            </div>
                            <button type="button" onclick="window._closeEditSessionModal()" style="background:rgba(255,255,255,0.2);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;" aria-label="Close">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>

                    <div style="padding:22px 24px;overflow-y:auto;flex:1;">

                        <div style="display:flex;gap:8px;margin-bottom:18px;flex-wrap:wrap;">
                            <span style="background:#eef2ff;color:#4f46e5;padding:4px 12px;border-radius:12px;font-size:11px;font-weight:600;">${this.escapeHtml(sessionType)}</span>
                            ${blockDisplay ? `<span style="background:#f3e8ff;color:#7c3aed;padding:4px 12px;border-radius:12px;font-size:11px;font-weight:600;">${this.escapeHtml(blockDisplay)}</span>` : ''}
                            ${session.intake_year ? `<span style="background:#ecfdf5;color:#059669;padding:4px 12px;border-radius:12px;font-size:11px;font-weight:600;">Intake ${this.escapeHtml(String(session.intake_year))}</span>` : ''}
                        </div>

                        <label style="display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:6px;">
                            <i class="fas fa-calendar-day" style="color:#4f46e5;margin-right:6px;"></i>Session Date <span style="color:#ef4444;">*</span>
                        </label>
                        <input id="editSessionDate" type="date" value="${currentDate}" required
                               style="width:100%;padding:12px 14px;border:2px solid #e2e8f0;border-radius:10px;font-size:14px;color:#0f172a;outline:none;transition:border 0.2s;margin-bottom:16px;box-sizing:border-box;font-family:inherit;"
                               onfocus="this.style.borderColor='#4f46e5'" onblur="this.style.borderColor='#e2e8f0'" />

                        <label style="display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:6px;">
                            <i class="fas fa-clock" style="color:#4f46e5;margin-right:6px;"></i>Session Time <span style="color:#ef4444;">*</span>
                        </label>
                        <input id="editSessionTime" type="time" value="${currentTime}" required
                               style="width:100%;padding:12px 14px;border:2px solid #e2e8f0;border-radius:10px;font-size:14px;color:#0f172a;outline:none;transition:border 0.2s;margin-bottom:16px;box-sizing:border-box;font-family:inherit;"
                               onfocus="this.style.borderColor='#4f46e5'" onblur="this.style.borderColor='#e2e8f0'" />

                        <label style="display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:6px;">
                            <i class="fas fa-map-marker-alt" style="color:#4f46e5;margin-right:6px;"></i>Location <span style="color:#94a3b8;font-weight:400;">(optional)</span>
                        </label>
                        <input id="editSessionLocation" type="text" value="${this.escapeHtml(currentLocation)}" placeholder="e.g. Lecture Hall 6, Skills Lab"
                               style="width:100%;padding:12px 14px;border:2px solid #e2e8f0;border-radius:10px;font-size:14px;color:#0f172a;outline:none;transition:border 0.2s;box-sizing:border-box;font-family:inherit;"
                               onfocus="this.style.borderColor='#4f46e5'" onblur="this.style.borderColor='#e2e8f0'" />

                        <div style="display:flex;gap:8px;align-items:flex-start;background:#eff6ff;border-radius:10px;padding:10px 12px;margin-top:16px;">
                            <i class="fas fa-info-circle" style="color:#3b82f6;font-size:13px;margin-top:2px;"></i>
                            <div style="font-size:12px;color:#1e40af;line-height:1.5;">
                                You may change the date and time at any point. Changing the date reschedules this same session (the session ID remains unchanged), so it can be opened on the new date. Changing the location updates the geo-target coordinates automatically.
                            </div>
                        </div>

                        <div id="editSessionError" style="display:none;background:#fee2e2;color:#991b1b;padding:10px 12px;border-radius:10px;font-size:12px;margin-top:12px;"></div>

                    </div>

                    <div style="padding:16px 24px;border-top:1px solid #f1f5f9;display:flex;gap:10px;background:#fafafa;">
                        <button type="button" onclick="window._closeEditSessionModal()"
                                style="flex:1;padding:12px 18px;border:2px solid #e2e8f0;background:#fff;color:#64748b;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;transition:all 0.15s;font-family:inherit;"
                                onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='#fff'">
                            Cancel
                        </button>
                        <button type="button" id="editSessionSaveBtn"
                                style="flex:2;padding:12px 18px;border:none;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;transition:all 0.15s;display:flex;align-items:center;justify-content:center;gap:8px;font-family:inherit;box-shadow:0 4px 12px rgba(79,70,229,0.3);"
                                onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 6px 16px rgba(79,70,229,0.4)'"
                                onmouseout="this.style.transform='none';this.style.boxShadow='0 4px 12px rgba(79,70,229,0.3)'">
                            <i class="fas fa-save"></i> Save Changes
                        </button>
                    </div>

                </div>
            </div>
        `;

        document.body.appendChild(modal);

        setTimeout(() => {
            const dateInput = document.getElementById('editSessionDate');
            if (dateInput) dateInput.focus();
        }, 100);

        window._closeEditSessionModal = () => {
            const el = document.getElementById('editSessionModal');
            if (el) {
                el.style.animation = 'fadeInBackdrop 0.2s ease reverse';
                setTimeout(() => el.remove(), 200);
            }
            delete window._closeEditSessionModal;
            delete window._saveEditSession;
        };

        window._saveEditSession = async () => {
            const dateEl = document.getElementById('editSessionDate');
            const timeEl = document.getElementById('editSessionTime');
            const locEl = document.getElementById('editSessionLocation');
            const errorEl = document.getElementById('editSessionError');
            const saveBtn = document.getElementById('editSessionSaveBtn');

            const newDate = (dateEl?.value || '').trim();
            const newTime = (timeEl?.value || '').trim();
            const newLocation = (locEl?.value || '').trim();

            const showError = (msg) => {
                if (errorEl) {
                    errorEl.textContent = msg;
                    errorEl.style.display = 'block';
                }
            };
            if (errorEl) errorEl.style.display = 'none';

            if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
                showError('Please pick a valid date.');
                return;
            }
            if (!/^\d{2}:\d{2}$/.test(newTime)) {
                showError('Please pick a valid time.');
                return;
            }

            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
                saveBtn.style.opacity = '0.7';
            }

            try {
                const supabase = window.lecturerDB?.supabase;
                if (!supabase) throw new Error('Database not available');

                // RESCHEDULING / OCCURRENCE SAFETY
                // A session ID represents one actual attendance occurrence.
                // If attendance already exists and the date/time is changed, preserve
                // the old occurrence and create a fresh scheduled_sessions row/ID for
                // the new occurrence. If no attendance exists, safely update the same row.
                const oldDate = this.getSessionDateString(session);
                const oldTime = String(session.session_time || '').substring(0, 5);
                const dateChanged = newDate !== oldDate;
                const timeChanged = newTime !== oldTime;

                let attendanceExists = false;
                if (dateChanged || timeChanged) {
                    const { data: existingAttendance, error: attendanceCheckError } = await supabase
                        .from('geo_attendance_logs')
                        .select('id')
                        .eq('session_id', sessionId)
                        .neq('role', 'lecturer')
                        .limit(1);

                    if (attendanceCheckError) throw attendanceCheckError;
                    attendanceExists = Array.isArray(existingAttendance) && existingAttendance.length > 0;
                }

                const updateData = {
                    session_date: newDate,
                    session_time: newTime + ':00',
                    updated_at: new Date().toISOString()
                };

                // Location change → also refresh target coordinates.
                if (newLocation && newLocation !== currentLocation) {
                    updateData.location_name = newLocation;

                    const locationCoords = this.resolveLocationCoordinates(newLocation);
                    console.log('📍 Location changed →', newLocation, '→', locationCoords);

                    if (locationCoords) {
                        updateData.target_latitude  = locationCoords.lat;
                        updateData.target_longitude = locationCoords.lng;
                        updateData.target_radius    = locationCoords.radius;
                    } else {
                        updateData.target_latitude  = null;
                        updateData.target_longitude = null;
                        updateData.target_radius    = 150;
                    }
                }

                const ownerId = this.lecturerUuid || profile?.user_id;

                if (attendanceExists && (dateChanged || timeChanged)) {
                    // Preserve the old session + its attendance history.
                    // Clone the scheduled session without the old primary key and
                    // reset attendance lifecycle fields so the new occurrence starts clean.
                    const newSession = { ...session, ...updateData };

                    delete newSession.id;
                    delete newSession.created_at;
                    delete newSession.opened_at;
                    delete newSession.closed_at;
                    delete newSession.updated_at;

                    newSession.status = 'scheduled';
                    newSession.is_active = false;
                    newSession.opened_by = null;
                    newSession.closed_at = null;

                    // Keep the current lecturer as owner.
                    newSession.created_by = ownerId;

                    const { data: createdSession, error: createError } = await supabase
                        .from('scheduled_sessions')
                        .insert(newSession)
                        .select('*')
                        .single();

                    if (createError) throw createError;

                    window.showNotification(
                        `✅ New class occurrence created for ${newDate} at ${newTime}. Previous attendance was preserved.`,
                        'success'
                    );
                    console.log('📅 Rescheduled occurrence:', {
                        old_session_id: sessionId,
                        new_session_id: createdSession?.id,
                        old_date: oldDate,
                        new_date: newDate
                    });
                } else {
                    const { error } = await supabase
                        .from('scheduled_sessions')
                        .update(updateData)
                        .eq('id', sessionId)
                        .eq('created_by', ownerId);

                    if (error) throw error;

                    window.showNotification(
                        dateChanged
                            ? `✅ Session rescheduled to ${newDate} at ${newTime}.`
                            : `✅ Session updated to ${newDate} at ${newTime}.`,
                        'success'
                    );
                }
                window._closeEditSessionModal();
                await this.loadSessions();

            } catch (err) {
                console.error('Error editing session:', err);
                showError('Failed to save: ' + err.message);
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
                    saveBtn.style.opacity = '1';
                }
            }
        };

        const saveBtn = document.getElementById('editSessionSaveBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => window._saveEditSession());
        }

        const keyHandler = (e) => {
            if (e.key === 'Escape') {
                window._closeEditSessionModal();
                document.removeEventListener('keydown', keyHandler);
            } else if (e.key === 'Enter' && !e.shiftKey) {
                const tag = document.activeElement?.tagName?.toLowerCase();
                if (tag !== 'textarea') {
                    e.preventDefault();
                    window._saveEditSession();
                }
            }
        };
        document.addEventListener('keydown', keyHandler);

        const observer = new MutationObserver(() => {
            if (!document.getElementById('editSessionModal')) {
                document.removeEventListener('keydown', keyHandler);
                observer.disconnect();
            }
        });
        observer.observe(document.body, { childList: true });

        modal.addEventListener('click', (e) => {
            if (e.target === modal.firstElementChild) {
                window._closeEditSessionModal();
            }
        });
    },

    // ============================================
    // OPEN SESSION
    // ============================================
    async openSession(sessionId) {
        if (this.isProcessing) return;
        this.isProcessing = true;

        const session = this.sessions.find(s => s.id === sessionId);
        if (!session) {
            window.showNotification('Session not found.', 'error');
            this.isProcessing = false;
            return;
        }

        const profile = window.lecturerDB?.getCurrentUserProfile();
        const lecturerId = this.lecturerUuid || profile?.user_id;

        if (session.created_by !== lecturerId) {
            window.showNotification('You can only manage your own sessions.', 'warning');
            this.isProcessing = false;
            return;
        }

        const sessionDate = this.getSessionDateString(session);
        const today = this.getLocalDateString();

        // A student must never check into a future/past calendar date.
        // The lecturer must open the session on its scheduled date.
        if (sessionDate !== today) {
            window.showNotification(
                sessionDate > today
                    ? `This session is scheduled for ${this.formatDate(sessionDate)}. It can be opened on that date.`
                    : `This session is dated ${this.formatDate(sessionDate)}. Create a new session for today instead.`,
                'warning',
                5000
            );
            this.isProcessing = false;
            return;
        }

        if (session.status === 'active' || session.is_active === true) {
            window.showNotification('This session is already open.', 'info');
            this.isProcessing = false;
            return;
        }

        // 🔒 OCCURRENCE SAFETY:
        // A session ID belongs to ONE attendance occurrence.
        // Never reopen a closed/scheduled row that already has student
        // attendance records. Create a NEW session instead.
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) throw new Error('Database connection not available');

            const { count, error: attendanceCheckError } = await supabase
                .from('geo_attendance_logs')
                .select('id', { count: 'exact', head: true })
                .eq('session_id', sessionId)
                .neq('role', 'lecturer');

            if (attendanceCheckError) throw attendanceCheckError;

            if (Number(count || 0) > 0) {
                window.showNotification(
                    '🔒 This session already contains attendance history. Create a NEW session for this attendance occurrence.',
                    'warning',
                    6000
                );
                this.isProcessing = false;
                return;
            }
        } catch (attendanceError) {
            console.error('❌ Could not verify session attendance history:', attendanceError);
            window.showNotification(
                'Could not verify attendance history. Session was not opened.',
                'error'
            );
            this.isProcessing = false;
            return;
        }

        if (!confirm(`Open "${session.session_title || session.title}" for student attendance?`)) {
            this.isProcessing = false;
            return;
        }

        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) throw new Error('Database connection not available');

            // This row has no previous attendance, so it is safe to open.
            // Keep the same UUID for this single occurrence and clear any stale
            // lifecycle timestamp from an earlier failed/open-close attempt.
            const { error } = await supabase
                .from('scheduled_sessions')
                .update({
                    status: 'active',
                    is_active: true,
                    opened_at: new Date().toISOString(),
                    closed_at: null,
                    opened_by: profile?.full_name || lecturerId
                })
                .eq('id', sessionId)
                .eq('created_by', lecturerId);

            if (error) throw error;

            window.showNotification('✅ Session opened! Students can now sign in.', 'success');
            await this.loadSessions();

        } catch (error) {
            console.error('Error opening session:', error);
            window.showNotification('Failed to open session: ' + error.message, 'error');
        } finally {
            this.isProcessing = false;
        }
    },
    // ============================================
    // CLOSE SESSION
    // ============================================
    async closeSession(sessionId) {
        if (this.isProcessing) return;
        this.isProcessing = true;

        const session = this.sessions.find(s => s.id === sessionId);
        if (!session) {
            window.showNotification('Session not found.', 'error');
            this.isProcessing = false;
            return;
        }

        const profile = window.lecturerDB?.getCurrentUserProfile();
        if (session.created_by !== this.lecturerUuid && session.created_by !== profile?.user_id) {
            window.showNotification('You can only manage your own sessions.', 'warning');
            this.isProcessing = false;
            return;
        }

        if (!confirm(`Close "${session.session_title || session.title}" and stop attendance?`)) {
            this.isProcessing = false;
            return;
        }

        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) throw new Error('Database connection not available');

            if (window.LecturerAttendance?.reconcileSessionAttendance) {
                try {
                    const register = await window.LecturerAttendance.reconcileSessionAttendance(sessionId, true);
                    console.log('📋 Final attendance register:', register.summary);
                } catch (attendanceError) {
                    console.error('❌ Attendance finalization failed:', attendanceError);
                    window.showNotification(
                        'Session was not closed because attendance could not be finalized: ' + attendanceError.message,
                        'error'
                    );
                    this.isProcessing = false;
                    return;
                }
            }

            const { error } = await supabase
                .from('scheduled_sessions')
                .update({
                    status: 'closed',
                    is_active: false,
                    closed_at: new Date().toISOString()
                })
                .eq('id', sessionId)
                .eq('created_by', this.lecturerUuid);

            if (error) throw error;

            window.showNotification('✅ Session closed. Full class attendance finalized.', 'success');
            await this.loadSessions();

        } catch (error) {
            console.error('Error closing session:', error);
            window.showNotification('Failed to close session: ' + error.message, 'error');
        } finally {
            this.isProcessing = false;
        }
    },

    // ============================================
    // VIEW ATTENDEES
    // ============================================
    async viewAttendees(sessionId) {
        const session = this.sessions.find(s => s.id === sessionId);
        if (!session) {
            window.showNotification('Session not found.', 'error');
            return;
        }

        const profile = window.lecturerDB?.getCurrentUserProfile();
        if (session.created_by !== this.lecturerUuid && session.created_by !== profile?.user_id) {
            window.showNotification('You can only view attendees for your own sessions.', 'warning');
            return;
        }

        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) throw new Error('Database connection not available');

            const { data: rawAttendees, error } = await supabase
                .from('geo_attendance_logs')
                .select('*')
                .eq('session_id', sessionId)
                .neq('role', 'lecturer')
                .order('check_in_time', { ascending: false });

            if (error) throw error;

            const attendees = this.chooseEffectiveAttendanceRows(rawAttendees || []);

            if (attendees.length === 0) {
                window.showNotification('No students have signed in yet.', 'info');
                return;
            }

            const attendeeList = attendees.map((a, i) => {
                const name = a.student_name || 'Unknown';
                const time = a.check_in_time ? new Date(a.check_in_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
                const status = a.attendance_status || 'Pending';
                const distance = a.distance_meters ? `${Math.round(a.distance_meters)}m` : '';
                return `${i + 1}. ${name} - ${status}${distance ? ' (' + distance + ')' : ''} - ${time}`;
            }).join('\n');

            alert(`📋 Attendance for: ${session.session_title || session.title}\n\n${attendeeList}\n\nTotal: ${attendees.length} students (unique attendance records)`);

        } catch (error) {
            console.error('Error viewing attendees:', error);
            window.showNotification('Failed to load attendees: ' + error.message, 'error');
        }
    },

    // ============================================
    // OPEN TODAY'S SESSION
    // ============================================
    async openTodaySession() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) throw new Error('Database connection not available');

            const profile = window.lecturerDB?.getCurrentUserProfile();
            const program = this.currentProgram || profile?.program || profile?.department || 'KRCHN';
            const lecturerId = this.lecturerUuid || profile?.user_id;
            const today = this.getLocalDateString();

            const { data: sessions, error } = await supabase
                .from('scheduled_sessions')
                .select('*')
                .eq('target_program', program)
                .eq('created_by', lecturerId)
                .eq('session_date', today)
                .in('status', ['scheduled', 'closed'])
                .order('session_time', { ascending: true })
                .limit(1);

            if (error) throw error;

            if (!sessions || sessions.length === 0) {
                window.showNotification('No new attendance session available for today. Create a NEW session first.', 'info');
                this.isProcessing = false;
                return;
            }

            // Never reopen a row that already contains attendance.
            // Each attendance occurrence must have its own scheduled_sessions UUID.
            let session = null;

            for (const candidate of sessions) {
                const { count, error: attendanceCheckError } = await supabase
                    .from('geo_attendance_logs')
                    .select('id', { count: 'exact', head: true })
                    .eq('session_id', candidate.id)
                    .neq('role', 'lecturer');

                if (attendanceCheckError) throw attendanceCheckError;

                if (Number(count || 0) === 0) {
                    session = candidate;
                    break;
                }
            }

            if (!session) {
                window.showNotification(
                    '🔒 All available sessions for today already have attendance history. Create a NEW session for the next attendance occurrence.',
                    'warning',
                    6000
                );
                this.isProcessing = false;
                return;
            }

            // Open only a clean session occurrence. Its UUID remains unique to this occurrence.
            const { error: updateError } = await supabase
                .from('scheduled_sessions')
                .update({
                    status: 'active',
                    is_active: true,
                    opened_at: new Date().toISOString(),
                    closed_at: null,
                    opened_by: profile?.full_name || lecturerId
                })
                .eq('id', session.id)
                .eq('created_by', lecturerId);

            if (updateError) throw updateError;

            window.showNotification(`✅ Session "${session.session_title}" opened! Students can now sign in.`, 'success');
            await this.loadSessions();

        } catch (error) {
            console.error('Error opening today\'s session:', error);
            window.showNotification('Failed to open session: ' + error.message, 'error');
        } finally {
            this.isProcessing = false;
        }
    },
    // ============================================
    // CLOSE ALL SESSIONS
    // ============================================
    async closeAllSessions() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) throw new Error('Database connection not available');

            const profile = window.lecturerDB?.getCurrentUserProfile();
            const lecturerId = this.lecturerUuid || profile?.user_id;

            if (!confirm('Close all your active sessions and finalize attendance?')) {
                this.isProcessing = false;
                return;
            }

            const { data: activeSessions, error: fetchError } = await supabase
                .from('scheduled_sessions')
                .select('id,session_title,title,status,is_active')
                .eq('created_by', lecturerId)
                .eq('status', 'active');

            if (fetchError) throw fetchError;

            // Finalize each session before closing it.
            for (const session of (activeSessions || [])) {
                if (window.LecturerAttendance?.reconcileSessionAttendance) {
                    await window.LecturerAttendance.reconcileSessionAttendance(session.id, true);
                }
            }

            const { error } = await supabase
                .from('scheduled_sessions')
                .update({
                    status: 'closed',
                    is_active: false,
                    closed_at: new Date().toISOString()
                })
                .eq('created_by', lecturerId)
                .eq('status', 'active');

            if (error) throw error;

            window.showNotification('✅ All your sessions closed and attendance finalized.', 'success');
            await this.loadSessions();

        } catch (error) {
            console.error('Error closing all sessions:', error);
            window.showNotification('Failed to close sessions: ' + error.message, 'error');
        } finally {
            this.isProcessing = false;
        }
    },
    // ============================================
    // CANCEL SESSION
    // ============================================
    async cancelSession(sessionId) {
        if (this.isProcessing) return;
        this.isProcessing = true;

        const session = this.sessions.find(s => s.id === sessionId);
        if (!session) {
            window.showNotification('Session not found.', 'error');
            this.isProcessing = false;
            return;
        }

        const profile = window.lecturerDB?.getCurrentUserProfile();
        if (session.created_by !== this.lecturerUuid && session.created_by !== profile?.user_id) {
            window.showNotification('You can only cancel your own sessions.', 'warning');
            this.isProcessing = false;
            return;
        }

        if (session.approval_status === 'approved') {
            window.showNotification('Approved sessions cannot be cancelled.', 'warning');
            this.isProcessing = false;
            return;
        }

        if (!confirm(`Cancel session "${session.session_title || session.title}"?`)) {
            this.isProcessing = false;
            return;
        }

        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) throw new Error('Database connection not available');

            const { error } = await supabase
                .from('scheduled_sessions')
                .delete()
                .eq('id', sessionId)
                .eq('created_by', this.lecturerUuid);

            if (error) throw error;

            window.showNotification('✅ Session cancelled!', 'success');
            await this.loadSessions();

        } catch (error) {
            console.error('Error cancelling session:', error);
            window.showNotification('Failed to cancel session: ' + error.message, 'error');
        } finally {
            this.isProcessing = false;
        }
    },

    // ============================================
    // POPULATE SESSION FORM
    // ============================================
    populateSessionForm() {
        const profile = window.lecturerDB?.getCurrentUserProfile();
        const program = this.currentProgram || profile?.program || profile?.department;
        const typeLabel = this.getProgramTypeLabel();
        const emoji = this.getProgramEmoji();

        const programSelect = document.getElementById('sessionProgram');
        if (programSelect && program) {
            programSelect.innerHTML = `<option value="${program}">${program} (${typeLabel})</option>`;
        }

        const blocks = [...new Set(this.assignedUnits.map(u => u.block).filter(Boolean))];
        const blockSelect = document.getElementById('sessionBlockTerm');
        if (blockSelect) {
            if (blocks.length > 0) {
                blockSelect.innerHTML = '<option value="">-- Select Block --</option>' +
                    blocks.map(b => {
                        const displayName = this.getBlockDisplay(b);
                        return `<option value="${b}">${displayName}</option>`;
                    }).join('');
            } else {
                blockSelect.innerHTML = '<option value="">-- No blocks assigned --</option>';
            }
        }

        const blockLabel = document.getElementById('sessionBlockLabel');
        if (blockLabel) {
            blockLabel.innerHTML = `<i class="fas fa-layer-group" style="color: #4C1D95; width: 18px;"></i> ${this.isTVET ? 'Term' : 'Block'} *`;
        }

        this.populateUnitDropdowns();

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

        const dateInput = document.getElementById('sessionDate');
        if (dateInput) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            dateInput.value = tomorrow.toISOString().split('T')[0];
        }

        const timeInput = document.getElementById('sessionTime');
        if (timeInput) {
            timeInput.value = '09:00';
        }

        const formSubtitle = document.querySelector('#addSessionForm .form-subtitle');
        if (formSubtitle) {
            formSubtitle.textContent = `${emoji} ${typeLabel} - Schedule sessions for your assigned units`;
        }
    },

    // ============================================
    // SETUP EVENT LISTENERS
    // ============================================
    setupEventListeners() {
        const form = document.getElementById('addSessionForm');
        if (form) {
            const newForm = form.cloneNode(true);
            form.parentNode.replaceChild(newForm, form);

            newForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddSession(e);
            });
        }

        const blockSelect = document.getElementById('sessionBlockTerm');
        if (blockSelect) {
            blockSelect.addEventListener('change', () => {
                const block = blockSelect.value;
                const unitSelect = document.getElementById('sessionUnit');
                if (unitSelect) {
                    const filtered = this.assignedUnits.filter(u => u.block === block || !block);
                    if (filtered.length > 0) {
                        unitSelect.innerHTML = '<option value="">-- Select Unit --</option>' +
                            filtered.map(u => {
                                const blockDisplay = this.getBlockDisplay(u.block);
                                return `<option value="${u.subject_name}" data-year="${u.academic_year || ''}">${u.subject_code ? u.subject_code + ' - ' : ''}${u.subject_name} (${blockDisplay})</option>`;
                            }).join('');
                    } else {
                        unitSelect.innerHTML = '<option value="">-- No units in this block --</option>';
                    }
                }
            });
        }

        // ✅ Live feedback when location changes
        const locationInput = document.getElementById('sessionLocation');
        if (locationInput && !locationInput.dataset.geoBound) {
            locationInput.dataset.geoBound = '1';
            const updateGeoHint = () => {
                const coords = this.resolveLocationCoordinates(locationInput.value);
                const hintEl = document.getElementById('locationGeoHint');
                if (hintEl) {
                    if (coords) {
                        hintEl.textContent = `📍 Geo-target: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)} (±${coords.radius}m)`;
                        hintEl.style.color = '#065f46';
                    } else if (locationInput.value.trim()) {
                        hintEl.textContent = `⚠ No known coordinates for this location — will fall back to campus center`;
                        hintEl.style.color = '#92400e';
                    } else {
                        hintEl.textContent = '';
                    }
                }
            };
            locationInput.addEventListener('input', updateGeoHint);
            locationInput.addEventListener('blur', updateGeoHint);
        }
    },

    // ============================================
    // HANDLE ADD SESSION — WITH COORDINATE POPULATION
    // ============================================
    async handleAddSession(e) {
        if (this.isProcessing) return;
        this.isProcessing = true;

        if (e && typeof e.preventDefault === 'function') {
            e.preventDefault();
        }

        const btn = document.querySelector('#addSessionForm button[type="submit"]');
        const originalText = btn?.innerHTML || 'Schedule Session';

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scheduling...';
        }

        const formData = {
            title: document.getElementById('sessionTopic')?.value?.trim(),
            date: document.getElementById('sessionDate')?.value,
            time: document.getElementById('sessionTime')?.value,
            program: document.getElementById('sessionProgram')?.value,
            block: document.getElementById('sessionBlockTerm')?.value,
            unit: document.getElementById('sessionUnit')?.value,
            type: document.getElementById('sessionType')?.value || 'Class',
            location: document.getElementById('sessionLocation')?.value || 'Lecture Hall',
            capacity: document.getElementById('sessionCapacity')?.value || 0,
            intakeYear: document.getElementById('sessionIntakeYear')?.value
        };

        if (!formData.title || !formData.date || !formData.program || !formData.block || !formData.unit || !formData.intakeYear) {
            window.showNotification('Please fill all required fields including Intake Year.', 'error');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
            this.isProcessing = false;
            return;
        }

        try {
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const lecturerUuid = this.lecturerUuid || profile?.user_id;
            const supabase = window.lecturerDB?.supabase;
            const typeLabel = this.getProgramTypeLabel();

            if (!supabase) {
                throw new Error('Database connection not available');
            }

            const intakeYear = formData.intakeYear;
            console.log('🎓 Using intake_year from form dropdown:', intakeYear);

            const matchedUnit = this.assignedUnits.find(
                u => u.subject_name === formData.unit && u.block === formData.block
            );
            console.log('🎓 Matched assignment:', matchedUnit);

            const blockDisplay = this.getBlockDisplay(formData.block);

            // ✅ Resolve target coordinates from location name
            const locationCoords = this.resolveLocationCoordinates(formData.location);
            console.log('📍 Location resolved:', formData.location, '→', locationCoords);

            if (!locationCoords) {
                console.warn('⚠️ No known coordinates for location:', formData.location);
            }

            const sessionData = {
                session_title: formData.title,
                title: formData.title,
                session_date: formData.date,
                session_time: formData.time || '09:00:00',
                target_program: formData.program,
                program_type: formData.program,
                block_term: formData.block,
                block_display: blockDisplay,
                session_type: formData.type,
                location_name: formData.location || 'Lecture Hall',

                // ✅ NEW: geo target
                target_latitude:  locationCoords ? locationCoords.lat    : null,
                target_longitude: locationCoords ? locationCoords.lng    : null,
                target_radius:    locationCoords ? locationCoords.radius : 150,

                created_by: lecturerUuid,
                lecturer_id: this.lecturerUuid || lecturerUuid,
                approval_status: 'pending',
                status: 'scheduled',
                is_active: false,
                capacity: parseInt(formData.capacity) || 0,
                intake_year: intakeYear,
                unit_name: formData.unit,
                is_tvet: this.isTVET,
                program_type_label: typeLabel,
                created_at: new Date().toISOString()
            };

            console.log(`📤 Scheduling ${typeLabel} session:`, sessionData);

            const { data: result, error } = await supabase
                .from('scheduled_sessions')
                .insert([sessionData])
                .select();

            if (error) {
                console.error('DB Error:', error);
                throw new Error('Failed to schedule session: ' + error.message);
            }

            if (locationCoords) {
                window.showNotification(`✅ ${typeLabel} session scheduled with geo-target 📍`, 'success');
            } else {
                window.showNotification(`⚠️ ${typeLabel} session scheduled (no geo-target for "${formData.location}")`, 'warning', 5000);
            }

            const form = document.getElementById('addSessionForm');
            if (form) form.reset();
            this.populateSessionForm();
            await this.loadSessions();

        } catch (error) {
            console.error('Error scheduling session:', error);
            window.showNotification('Failed to schedule session: ' + error.message, 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
            this.isProcessing = false;
        }
    },

    // ============================================
    // UPDATE STATS
    // ============================================
    updateStats() {
        const sessions = this.sessions;
        const total = sessions.length;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const typeLabel = this.getProgramTypeLabel();
        const emoji = this.getProgramEmoji();

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

        const totalEl = document.getElementById('totalSessionsStat');
        if (totalEl) totalEl.textContent = total;

        const activeEl = document.getElementById('activeSessionsStat');
        if (activeEl) activeEl.textContent = active;

        const todayEl = document.getElementById('todaySessionsStat');
        if (todayEl) todayEl.textContent = todaySessions;

        const upcomingEl = document.getElementById('upcomingSessionsStat');
        if (upcomingEl) upcomingEl.textContent = upcoming;

        const badge = document.getElementById('sessionsCount');
        if (badge) badge.textContent = upcoming;

        const activeBadge = document.getElementById('activeSessionsBadge');
        if (activeBadge) activeBadge.textContent = active;

        const countDisplay = document.getElementById('sessionCountDisplay');
        if (countDisplay) countDisplay.textContent = sessions.length;

        const titleEl = document.querySelector('#sessions-content h3');
        if (titleEl) {
            titleEl.textContent = `${emoji} My Sessions (${typeLabel})`;
        }
    },

    // ============================================
    // EXPORT SESSIONS
    // ============================================
    exportSessions() {
        const sessions = this.sessions;
        if (sessions.length === 0) {
            window.showNotification('No sessions to export.', 'warning');
            return;
        }

        const typeLabel = this.getProgramTypeLabel();

        const headers = ['Topic', 'Date', 'Time', 'Type', 'Program', 'Block', 'Intake Year', 'Unit', 'Block Display', 'Location', 'Geo Target', 'Status', 'Approval', 'Program Type'];
        const rows = sessions.map(s => {
            const blockDisplay = s.block_display || (s.block_term ? this.getBlockDisplay(s.block_term) : 'N/A');
            const geo = s.target_latitude && s.target_longitude
                ? `${Number(s.target_latitude).toFixed(5)},${Number(s.target_longitude).toFixed(5)} (±${s.target_radius}m)`
                : 'none';
            return [
                s.session_title || s.title || 'N/A',
                s.session_date || 'N/A',
                s.session_time || 'N/A',
                s.session_type || 'Class',
                s.target_program || 'N/A',
                s.block_term || 'N/A',
                s.intake_year || 'N/A',
                s.unit_name || 'N/A',
                blockDisplay,
                s.location_name || 'N/A',
                geo,
                s.status || 'scheduled',
                s.approval_status || 'pending',
                typeLabel
            ];
        });

        const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sessions_${typeLabel}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        window.showNotification(`✅ ${typeLabel} sessions exported successfully!`, 'success');
    },

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
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

    // ============================================
    // REFRESH
    // ============================================
    async refresh() {
        await this.resolveLecturerId();
        await this.loadAssignedUnits();
        await this.loadSessions();
        this.populateSessionForm();
        this.updateStats();
        window.showNotification('Sessions refreshed!', 'success');
    }
};

// ============================================
// GLOBAL FUNCTIONS
// ============================================
function scheduleSession(e) {
    if (e) e.preventDefault();
    LecturerSessions.handleAddSession(e);
}

function generateAttendanceLink(id) {
    LecturerSessions.generateAttendanceLink(id);
}

function openSession(id) {
    LecturerSessions.openSession(id);
}

function closeSession(id) {
    LecturerSessions.closeSession(id);
}

function editSession(id) {
    LecturerSessions.editSession(id);
}

function viewAttendees(id) {
    LecturerSessions.viewAttendees(id);
}

function openTodaySession() {
    LecturerSessions.openTodaySession();
}

function closeAllSessions() {
    LecturerSessions.closeAllSessions();
}

function exportSessions() {
    LecturerSessions.exportSessions();
}

// ============================================
// INITIALIZE ON DOM READY
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => LecturerSessions.init(), 700);
});

// Make globally accessible
window.LecturerSessions = LecturerSessions;
window.scheduleSession = scheduleSession;
window.generateAttendanceLink = generateAttendanceLink;
window.openSession = openSession;
window.closeSession = closeSession;
window.editSession = editSession;
window.viewAttendees = viewAttendees;
window.openTodaySession = openTodaySession;
window.closeAllSessions = closeAllSessions;
window.exportSessions = exportSessions;

console.log('✅ LecturerSessions module loaded - Complete with TVET + GEO support');
console.log('🔒 Lecturers can only see and manage their own sessions');
console.log('📚 Unit filtering matches Resources and Marks modules');
console.log('📊 TVET Support: Enabled (Year X Term Y format)');
console.log('🎓 Intake Year: Selected by lecturer from dropdown');
console.log('🔗 lecturer_id: Populated for proper joins');
console.log('✏️ Edit Session: Enabled (date / time / location / coords)');
console.log('📍 Geo-Targets: Auto-populated from CAMPUS_LOCATIONS map');
