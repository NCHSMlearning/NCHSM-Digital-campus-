/*
 NCHSM LECTURER ATTENDANCE — FIX PATCH
 --------------------------------------
 Append this block to the END of the exact lecturer attendance JS supplied
 in the conversation. It preserves the existing HTML/global function names.

 Fixes:
 1. Manual attendance is tied to the selected scheduled session.
 2. Session radius uses the session radius as the authoritative fallback.
 3. Session register matches attendance by multiple student identifiers.
 4. Selected-session export uses the COMPLETE roster, including Absent/Pending.
 5. Selected-session filtering does not destroy the underlying register.
 6. Selected session is never silently replaced by generic daily logs when
    scheduled sessions exist.
 7. Finalized sessions display missing students as Absent.
 8. Verification refreshes the selected session rather than falling back
    to generic daily attendance.
*/

(function () {
    'use strict';

    const LA = window.LecturerAttendance;
    if (!LA) {
        console.error('❌ LecturerAttendance was not found. Load the main attendance JS first.');
        return;
    }

    // ------------------------------------------------------------
    // 1. AUTHORITATIVE SESSION RADIUS
    // ------------------------------------------------------------
    LA.getSessionRadius = function (session, log = null) {
        const value =
            log?.target_radius ??
            session?.target_radius ??
            150;

        const radius = Number(value);
        return Number.isFinite(radius) && radius > 0 ? radius : 150;
    };

    // ------------------------------------------------------------
    // 2. SESSION REGISTER — REPLACE WITH STRICTER VERSION
    // ------------------------------------------------------------
    LA.getSessionAttendanceRegister = async function (session, finalize = false) {
        const supabase = window.lecturerDB?.supabase;

        if (!supabase || !session?.id) {
            return {
                roster: [],
                logs: [],
                rows: [],
                summary: {
                    total: 0,
                    present: 0,
                    absent: 0,
                    pending: 0,
                    notCheckedIn: 0,
                    rate: 0
                }
            };
        }

        const roster = await this.getSessionRoster(session);

        const { data: logs, error } = await supabase
            .from('geo_attendance_logs')
            .select('*')
            .eq('session_id', session.id)
            .neq('role', 'lecturer')
            .order('check_in_time', { ascending: true });

        if (error) throw error;

        /*
         * Index every attendance log by all identifiers.
         * This prevents a valid student check-in from being missed when
         * one record contains user_id while the roster contains student_id.
         */
        const byKey = new Map();

        const put = (key, log) => {
            if (!key) return;
            const k = String(key).trim();
            if (!k) return;

            const old = byKey.get(k);

            const status = String(log.attendance_status || '').toLowerCase();
            const oldStatus = String(old?.attendance_status || '').toLowerCase();

            const present =
                status === 'present' ||
                status === 'verified' ||
                log.is_verified === true;

            const oldPresent =
                oldStatus === 'present' ||
                oldStatus === 'verified' ||
                old?.is_verified === true;

            if (
                !old ||
                (present && !oldPresent) ||
                (!present && !oldPresent &&
                 new Date(log.check_in_time || 0) >
                 new Date(old.check_in_time || 0))
            ) {
                byKey.set(k, log);
            }
        };

        (logs || []).forEach(log => {
            put(log.user_id, log);
            put(log.student_id, log);
            put(log.registration_number, log);
        });

        const rows = [];
        const finalizeItems = [];

        for (const student of roster) {
            const keys = [
                student.user_id,
                student.student_id,
                student.registration_number
            ]
                .filter(Boolean)
                .map(String);

            let log = null;

            for (const key of keys) {
                if (byKey.has(key)) {
                    log = byKey.get(key);
                    break;
                }
            }

            const rawStatus = String(
                log?.attendance_status || ''
            ).toLowerCase();

            const hasPresentStatus =
                rawStatus === 'present' ||
                rawStatus === 'verified' ||
                log?.is_verified === true;

            const radius = this.getSessionRadius(session, log);

            const distance = Number(log?.distance_meters);

            /*
             * If distance exists, it MUST be inside the session radius.
             * If the attendance record has no distance value, preserve the
             * existing verified/manual behaviour instead of automatically
             * rejecting it.
             */
            const withinRadius =
                !log ||
                !Number.isFinite(distance) ||
                distance <= radius;

            const validPresent =
                !!log &&
                hasPresentStatus &&
                withinRadius;

            let status;

            if (validPresent) {
                status = 'Present';
            } else if (log) {
                status = 'Absent';
            } else {
                status = 'Not Checked In';
            }

            if (finalize && status !== 'Present') {
                finalizeItems.push({
                    student,
                    existingLog: log
                });

                status = 'Absent';
            }

            rows.push({
                student,
                log,
                status,
                checkInTime: log?.check_in_time || null,
                distance: log?.distance_meters ?? null,
                accuracy: log?.accuracy_m ?? log?.accuracy || null
            });
        }

        // --------------------------------------------------------
        // FINALIZE ABSENCES
        // --------------------------------------------------------
        if (finalize && finalizeItems.length) {
            const now = new Date().toISOString();
            const inserts = [];
            const updates = [];

            for (const item of finalizeItems) {
                const student = item.student;
                const existingLog = item.existingLog;

                if (existingLog?.id) {
                    updates.push(
                        supabase
                            .from('geo_attendance_logs')
                            .update({
                                attendance_status: 'Absent',
                                is_verified: false,
                                finalized_at: now,
                                finalized_by: this.lecturerUuid || null,
                                verification_source:
                                    'Automatic Session Finalization',
                                finalization_reason:
                                    'No valid in-radius check-in for this session'
                            })
                            .eq('id', existingLog.id)
                    );
                } else {
                    inserts.push({
                        user_id: student.user_id || null,
                        student_id:
                            student.student_id ||
                            student.registration_number ||
                            null,
                        registration_number:
                            student.registration_number || null,
                        student_name: student.name || 'Unknown Student',
                        block: student.block || null,
                        intake_year: student.intake_year || null,
                        program: student.program || null,

                        /*
                         * The record is an absence marker. The timestamp is
                         * finalization time because there was no check-in.
                         */
                        check_in_time: now,

                        session_type: session.session_type || 'Class',

                        target_id: session.id,
                        session_id: session.id,

                        target_name:
                            session.location_name ||
                            session.session_title ||
                            session.title ||
                            'Class',

                        unit_name:
                            session.unit_name ||
                            session.course_name ||
                            'General',

                        attendance_status: 'Absent',
                        is_verified: false,
                        location_type: 'class',

                        target_radius: this.getSessionRadius(session),
                        target_latitude:
                            session.target_latitude ?? null,
                        target_longitude:
                            session.target_longitude ?? null,

                        role: 'student',
                        is_manual_entry: false,

                        verification_source:
                            'Automatic Session Finalization',

                        finalization_reason:
                            'No check-in recorded before session close',

                        finalized_at: now,
                        finalized_by: this.lecturerUuid || null,
                        created_at: now
                    });
                }
            }

            if (updates.length) {
                const results = await Promise.all(updates);
                const failed = results.find(result => result.error);

                if (failed?.error) {
                    throw failed.error;
                }
            }

            if (inserts.length) {
                const { error } = await supabase
                    .from('geo_attendance_logs')
                    .insert(inserts);

                if (error) throw error;
            }

            return this.getSessionAttendanceRegister(session, false);
        }

        const summary = {
            total: rows.length,
            present: rows.filter(r => r.status === 'Present').length,
            absent: rows.filter(r => r.status === 'Absent').length,
            pending: rows.filter(r => r.status === 'Not Checked In').length,
            notCheckedIn:
                rows.filter(r => r.status === 'Not Checked In').length
        };

        summary.rate = summary.total
            ? Math.round((summary.present / summary.total) * 100)
            : 0;

        return {
            roster,
            logs: logs || [],
            rows,
            summary
        };
    };

    // ------------------------------------------------------------
    // 3. MANUAL MARK — ALWAYS ATTACH TO SELECTED SESSION
    // ------------------------------------------------------------
    LA.markStudentAttendance = async function (e) {
        if (e) e.preventDefault();
        if (this.isProcessing) return;

        const form = document.getElementById('manualAttendanceForm');
        const btn = form?.querySelector('button[type="submit"]');

        if (!form || !btn) return;

        const originalText = btn.innerHTML;

        this.isProcessing = true;
        btn.disabled = true;
        btn.innerHTML =
            '<i class="fas fa-spinner fa-spin"></i> Marking...';

        try {
            const studentId =
                document.getElementById('attStudentId')?.value;

            const sessionType =
                document.getElementById('attSessionType')?.value;

            const unit =
                document.getElementById('attUnit')?.value;

            const location =
                document.getElementById('attLocation')?.value;

            const date =
                document.getElementById('attDate')?.value;

            const time =
                document.getElementById('attTime')?.value;

            if (!studentId || !sessionType || !date) {
                throw new Error('Please fill all required fields');
            }

            const supabase = window.lecturerDB?.supabase;
            const profile =
                window.lecturerDB?.getCurrentUserProfile();

            if (!supabase || !profile) {
                throw new Error('Database not available');
            }

            /*
             * A manual class attendance mark MUST have a session.
             * Otherwise it becomes a generic record that cannot appear
             * in the selected session register.
             */
            if (!this.selectedSessionId) {
                throw new Error(
                    'Please select an attendance session before marking a student.'
                );
            }

            const session =
                this.selectedSession ||
                await this.getScheduledSessionById(
                    this.selectedSessionId
                );

            if (!session) {
                throw new Error(
                    'Selected attendance session could not be found.'
                );
            }

            const { data: student, error: studentError } =
                await supabase
                    .from('consolidated_user_profiles_table')
                    .select(
                        'user_id, full_name, program, block, intake_year, student_id, admission_number, registration_number'
                    )
                    .eq('user_id', studentId)
                    .maybeSingle();

            if (studentError) throw studentError;
            if (!student) throw new Error('Student not found');

            /*
             * Strict duplicate check for THIS session only.
             */
            const { data: existing, error: existingError } =
                await supabase
                    .from('geo_attendance_logs')
                    .select('id, attendance_status')
                    .eq('session_id', this.selectedSessionId)
                    .or(
                        `user_id.eq.${student.user_id},student_id.eq.${student.student_id || student.registration_number || ''},registration_number.eq.${student.registration_number || student.student_id || ''}`
                    )
                    .limit(1);

            if (existingError) {
                console.warn(
                    'Session duplicate lookup warning:',
                    existingError
                );
            }

            if (existing?.length) {
                throw new Error(
                    `${student.full_name || 'Student'} already has an attendance record for this session.`
                );
            }

            const checkInTime = time
                ? `${date}T${time}:00.000Z`
                : `${date}T12:00:00.000Z`;

            const registrationNumber =
                student.registration_number ||
                student.admission_number ||
                student.student_id ||
                null;

            const { error: insertError } =
                await supabase
                    .from('geo_attendance_logs')
                    .insert({
                        user_id: student.user_id || null,
                        student_id:
                            student.student_id ||
                            student.admission_number ||
                            registrationNumber,

                        registration_number: registrationNumber,

                        student_name:
                            student.full_name || 'Student',

                        check_in_time: checkInTime,

                        /*
                         * CRITICAL FIX:
                         */
                        session_id: this.selectedSessionId,
                        target_id: this.selectedSessionId,

                        session_type:
                            session.session_type ||
                            sessionType ||
                            'Class',

                        target_name:
                            session.session_title ||
                            session.title ||
                            unit ||
                            'Class',

                        unit_name:
                            session.unit_name ||
                            unit ||
                            'General',

                        attendance_status: 'Present',
                        is_verified: true,
                        is_manual_entry: true,

                        location_friendly_name:
                            location || 'Manual Entry',

                        location_address:
                            `MANUAL: ${location || 'N/A'} (By ${profile.full_name || 'Lecturer'})`,

                        program:
                            student.program ||
                            session.target_program ||
                            profile.program ||
                            'KRCHN',

                        block:
                            student.block ||
                            session.block_term ||
                            session.block ||
                            profile.block ||
                            null,

                        block_display:
                            student.block
                                ? this.getBlockDisplay(student.block)
                                : 'N/A',

                        intake_year:
                            student.intake_year ||
                            session.intake_year ||
                            profile.intake_year ||
                            null,

                        role: 'student',

                        recorded_by_id:
                            profile.user_id,

                        recorded_by_name:
                            profile.full_name ||
                            'Lecturer',

                        program_type:
                            this.getProgramTypeLabel(),

                        is_tvet: this.isTVET,

                        target_radius:
                            this.getSessionRadius(session),

                        target_latitude:
                            session.target_latitude ?? null,

                        target_longitude:
                            session.target_longitude ?? null,

                        verification_source:
                            'Manual Lecturer Entry',

                        created_at:
                            new Date().toISOString()
                    });

            if (insertError) throw insertError;

            this.showNotification(
                `✅ ${student.full_name} marked present for this session!`,
                'success'
            );

            form.reset();

            const dateInput =
                document.getElementById('attDate');

            if (dateInput) {
                dateInput.value =
                    new Date().toISOString().split('T')[0];
            }

            await this.loadTodayAttendance();
            await this.loadAttendanceStats();

        } catch (error) {
            console.error(
                '❌ markStudentAttendance:',
                error
            );

            this.showNotification(
                'Failed: ' + (error.message || error),
                'error'
            );

        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
            this.isProcessing = false;
        }
    };

    // ------------------------------------------------------------
    // 4. SESSION-FIRST TODAY LOADING
    // ------------------------------------------------------------
    LA.loadTodayAttendance = async function () {
        const tbody =
            document.getElementById('attendanceTable');

        if (!tbody) return;

        try {
            const supabase =
                window.lecturerDB?.supabase;

            if (!supabase) {
                tbody.innerHTML =
                    '<tr><td colspan="10" style="padding:30px;text-align:center;color:#ef4444;">Database not available</td></tr>';
                return;
            }

            if (this.selectedSessionId) {
                const session =
                    this.selectedSession ||
                    await this.getScheduledSessionById(
                        this.selectedSessionId
                    );

                if (session) {
                    this.selectedSession = session;

                    const register =
                        await this.getSessionAttendanceRegister(
                            session,
                            false
                        );

                    this.sessionRegister = register;

                    this.todayLogs =
                        (register.rows || [])
                            .map(row =>
                                this.sessionRowToLog(
                                    row,
                                    session
                                )
                            );

                    this.filteredTodayLogs =
                        [...this.todayLogs];

                    this.updateSessionStats(
                        register.summary
                    );

                    this.renderSessionRegister(
                        register,
                        session
                    );

                    this.updateProgramBadge();
                    return;
                }
            }

            /*
             * No selected session: do NOT mix all historical/current
             * attendance into a supposed class register.
             */
            tbody.innerHTML = `
                <tr>
                    <td colspan="10"
                        style="padding:40px;text-align:center;color:#94a3b8;">
                        <i class="fas fa-calendar-check"
                           style="font-size:32px;display:block;margin-bottom:10px;color:#cbd5e1;"></i>
                        <p style="margin:0;font-weight:600;">
                            Select or schedule an attendance session.
                        </p>
                        <small>
                            Attendance is now organized by scheduled session.
                        </small>
                    </td>
                </tr>`;

            this.todayLogs = [];
            this.filteredTodayLogs = [];

            this.updateSessionStats({
                total: 0,
                present: 0,
                absent: 0,
                pending: 0,
                rate: 0
            });

        } catch (error) {
            console.error(
                '❌ loadTodayAttendance:',
                error
            );

            tbody.innerHTML = `
                <tr>
                    <td colspan="10"
                        style="padding:30px;text-align:center;color:#ef4444;">
                        Attendance load failed:
                        ${this.escapeHtml(error.message || String(error))}
                    </td>
                </tr>`;
        }
    };

    // ------------------------------------------------------------
    // 5. SESSION-FIRST EXPORT
    // ------------------------------------------------------------
    const originalExport = LA.exportCSV.bind(LA);

    LA.exportCSV = async function () {
        /*
         * For a selected session, build the export source directly from
         * the complete session register. This guarantees absent students
         * are exported even when they never checked in.
         */
        if (this.selectedSessionId) {
            if (typeof ExcelJS === 'undefined') {
                this.showNotification(
                    'Excel library still loading — try again in a moment.',
                    'warning'
                );
                return;
            }

            try {
                const session =
                    this.selectedSession ||
                    await this.getScheduledSessionById(
                        this.selectedSessionId
                    );

                if (!session) {
                    throw new Error(
                        'Selected session could not be found.'
                    );
                }

                const register =
                    await this.getSessionAttendanceRegister(
                        session,
                        false
                    );

                const filterBlock =
                    (document.getElementById('filterBlock')?.value || 'All').trim();

                const filterYear =
                    (document.getElementById('filterYear')?.value || 'All').trim();

                const filterSessionType =
                    (document.getElementById('filterSessionType')?.value || 'All').trim();

                const searchText =
                    (document.getElementById('filterSearch')?.value || '')
                        .trim()
                        .toLowerCase();

                let rows = [...(register.rows || [])];

                if (filterBlock !== 'All') {
                    rows = rows.filter(row =>
                        String(row.student?.block || '')
                            .toLowerCase() ===
                        filterBlock.toLowerCase()
                    );
                }

                if (filterYear !== 'All') {
                    rows = rows.filter(row =>
                        String(row.student?.intake_year || '')
                            .toLowerCase() ===
                        filterYear.toLowerCase()
                    );
                }

                if (filterSessionType !== 'All') {
                    rows = rows.filter(() =>
                        String(session.session_type || '')
                            .toLowerCase() ===
                        filterSessionType.toLowerCase()
                    );
                }

                if (searchText) {
                    rows = rows.filter(row => {
                        const haystack = [
                            row.student?.name,
                            row.student?.registration_number,
                            row.student?.student_id,
                            row.student?.program,
                            row.student?.block,
                            session.unit_name,
                            session.session_title,
                            session.title
                        ]
                            .filter(Boolean)
                            .join(' ')
                            .toLowerCase();

                        return haystack.includes(searchText);
                    });
                }

                if (!rows.length) {
                    this.showNotification(
                        'No students match the current filters.',
                        'warning'
                    );
                    return;
                }

                /*
                 * Build a session-specific one-sheet workbook.
                 */
                const PURPLE = 'FF4F46E5';
                const PURPLE_LIGHT = 'FFEEF2FF';
                const GREEN = 'FF10B981';
                const GREEN_LIGHT = 'FFD1FAE5';
                const RED = 'FFEF4444';
                const RED_LIGHT = 'FFFEE2E2';
                const AMBER = 'FFF59E0B';
                const AMBER_LIGHT = 'FFFEF3C7';
                const DARK = 'FF0F172A';
                const BORDER = 'FFE2E8F0';
                const GREY = 'FF64748B';
                const GREY_LIGHT = 'FFF1F5F9';

                const wb = new ExcelJS.Workbook();

                wb.creator = 'NCHSM';
                wb.created = new Date();

                let sheetName =
                    (
                        session.session_title ||
                        session.title ||
                        session.unit_name ||
                        'Attendance'
                    )
                        .replace(/[\\\/\?\*\[\]:]/g, '-')
                        .slice(0, 31);

                if (!sheetName) sheetName = 'Attendance';

                const ws = wb.addWorksheet(sheetName, {
                    pageSetup: {
                        paperSize: 9,
                        orientation: 'landscape',
                        fitToPage: true,
                        fitToWidth: 1,
                        fitToHeight: 0,
                        margins: {
                            left: 0.3,
                            right: 0.3,
                            top: 0.4,
                            bottom: 0.4,
                            header: 0.2,
                            footer: 0.2
                        }
                    }
                });

                const totalCols = 9;

                const mergeRow = (
                    rowNumber,
                    value,
                    fill = null,
                    font = {}
                ) => {
                    ws.mergeCells(
                        rowNumber,
                        1,
                        rowNumber,
                        totalCols
                    );

                    const cell =
                        ws.getCell(rowNumber, 1);

                    cell.value = value;

                    cell.alignment = {
                        horizontal: 'center',
                        vertical: 'middle',
                        wrapText: true
                    };

                    if (fill) {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: fill }
                        };
                    }

                    cell.font = font;
                };

                let r = 1;

                mergeRow(
                    r++,
                    'NAKURU COLLEGE OF HEALTH SCIENCES AND MANAGEMENT',
                    PURPLE,
                    {
                        bold: true,
                        color: { argb: 'FFFFFFFF' },
                        size: 14
                    }
                );

                mergeRow(
                    r++,
                    'DEPARTMENT OF NURSING',
                    PURPLE_LIGHT,
                    {
                        bold: true,
                        color: { argb: PURPLE },
                        size: 12
                    }
                );

                const program =
                    session.target_program ||
                    session.program_type ||
                    this.currentProgram ||
                    'KRCHN';

                const block =
                    session.block_term ||
                    session.block ||
                    'N/A';

                mergeRow(
                    r++,
                    `${program} CLASS  |  ${this.getBlockDisplay(block)}  |  Intake ${session.intake_year || 'N/A'}`,
                    null,
                    {
                        bold: true,
                        color: { argb: DARK },
                        size: 12
                    }
                );

                mergeRow(
                    r++,
                    `UNIT: ${session.unit_name || session.title || 'General'}  |  SESSION: ${session.session_type || 'Class'}`,
                    null,
                    {
                        bold: true,
                        color: { argb: DARK },
                        size: 12
                    }
                );

                mergeRow(
                    r++,
                    `DATE: ${session.session_date ? new Date(session.session_date).toLocaleDateString('en-GB') : 'N/A'}  |  TIME: ${(session.session_time || '').slice(0,5)}  |  SESSION ID: ${session.id}`,
                    PURPLE_LIGHT,
                    {
                        color: { argb: PURPLE },
                        size: 10
                    }
                );

                r++;

                const headers = [
                    'S/NO',
                    'REG NO',
                    'FULL NAME',
                    'PROGRAM',
                    'BLOCK / TERM',
                    'INTAKE',
                    'SESSION',
                    'STATUS',
                    'CHECK-IN TIME'
                ];

                headers.forEach((header, i) => {
                    const cell =
                        ws.getCell(r, i + 1);

                    cell.value = header;

                    cell.font = {
                        bold: true,
                        color: { argb: 'FFFFFFFF' },
                        size: 10
                    };

                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: PURPLE }
                    };

                    cell.alignment = {
                        horizontal: 'center',
                        vertical: 'middle',
                        wrapText: true
                    };

                    cell.border = {
                        top: { style: 'thin', color: { argb: BORDER } },
                        bottom: { style: 'thin', color: { argb: BORDER } },
                        left: { style: 'thin', color: { argb: BORDER } },
                        right: { style: 'thin', color: { argb: BORDER } }
                    };
                });

                ws.getRow(r).height = 24;
                r++;

                let present = 0;
                let absent = 0;
                let pending = 0;

                rows.forEach((row, index) => {
                    const student = row.student || {};
                    const status = row.status || 'Not Checked In';

                    if (status === 'Present') present++;
                    else if (status === 'Absent') absent++;
                    else pending++;

                    const excelStatus =
                        status === 'Not Checked In'
                            ? 'Pending'
                            : status;

                    const values = [
                        index + 1,
                        student.registration_number ||
                            student.student_id ||
                            'N/A',
                        student.name || 'Unknown Student',
                        student.program || program,
                        this.getBlockDisplay(
                            student.block || block
                        ),
                        student.intake_year ||
                            session.intake_year ||
                            'N/A',
                        session.session_type || 'Class',
                        excelStatus,
                        row.checkInTime
                            ? new Date(
                                row.checkInTime
                              ).toLocaleTimeString(
                                'en-GB',
                                {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                }
                              )
                            : '—'
                    ];

                    const excelRow =
                        ws.getRow(r);

                    values.forEach((value, i) => {
                        const cell =
                            excelRow.getCell(i + 1);

                        cell.value = value;

                        cell.border = {
                            top: { style: 'thin', color: { argb: BORDER } },
                            bottom: { style: 'thin', color: { argb: BORDER } },
                            left: { style: 'thin', color: { argb: BORDER } },
                            right: { style: 'thin', color: { argb: BORDER } }
                        };

                        cell.alignment = {
                            vertical: 'middle',
                            horizontal:
                                i === 0 ||
                                i >= 6
                                    ? 'center'
                                    : 'left'
                        };

                        cell.font = {
                            size: 10,
                            color: { argb: DARK }
                        };
                    });

                    const statusCell =
                        excelRow.getCell(8);

                    if (status === 'Present') {
                        statusCell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: GREEN_LIGHT }
                        };
                        statusCell.font = {
                            bold: true,
                            color: { argb: GREEN }
                        };
                    } else if (status === 'Absent') {
                        statusCell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: RED_LIGHT }
                        };
                        statusCell.font = {
                            bold: true,
                            color: { argb: RED }
                        };
                    } else {
                        statusCell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: AMBER_LIGHT }
                        };
                        statusCell.font = {
                            bold: true,
                            color: { argb: AMBER }
                        };
                    }

                    excelRow.height = 20;
                    r++;
                });

                r++;

                const total =
                    rows.length;

                const rate =
                    total
                        ? Math.round(
                            (present / total) * 100
                          )
                        : 0;

                ws.mergeCells(
                    r,
                    1,
                    r,
                    totalCols
                );

                const summary =
                    ws.getCell(r, 1);

                summary.value =
                    `SUMMARY  ·  Students: ${total}   Present: ${present}   Absent: ${absent}   Pending: ${pending}   Attendance Rate: ${rate}%`;

                summary.alignment = {
                    horizontal: 'center',
                    vertical: 'middle'
                };

                summary.font = {
                    bold: true,
                    color: {
                        argb: 'FF065F46'
                    },
                    size: 11
                };

                summary.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: {
                        argb: GREEN_LIGHT
                    }
                };

                ws.getRow(r).height = 24;

                ws.columns = [
                    { width: 7 },
                    { width: 23 },
                    { width: 30 },
                    { width: 13 },
                    { width: 20 },
                    { width: 10 },
                    { width: 16 },
                    { width: 15 },
                    { width: 16 }
                ];

                ws.views = [{
                    state: 'frozen',
                    xSplit: 3,
                    ySplit: 7
                }];

                const filename =
                    `Attendance_${String(program).replace(/\s+/g,'_')}_${String(
                        session.unit_name ||
                        session.title ||
                        'Session'
                    ).replace(/[^a-zA-Z0-9_-]+/g,'_')}_${new Date()
                        .toISOString()
                        .split('T')[0]}.xlsx`;

                const buffer =
                    await wb.xlsx.writeBuffer();

                const blob =
                    new Blob(
                        [buffer],
                        {
                            type:
                                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                        }
                    );

                if (typeof saveAs === 'function') {
                    saveAs(blob, filename);
                } else {
                    const url =
                        URL.createObjectURL(blob);

                    const a =
                        document.createElement('a');

                    a.href = url;
                    a.download = filename;

                    document.body.appendChild(a);
                    a.click();
                    a.remove();

                    setTimeout(
                        () => URL.revokeObjectURL(url),
                        1000
                    );
                }

                this.showNotification(
                    `✅ Exported ${rows.length} students — Present: ${present}, Absent: ${absent}, Pending: ${pending}`,
                    'success'
                );

            } catch (error) {
                console.error(
                    '❌ Session export error:',
                    error
                );

                this.showNotification(
                    'Export failed: ' +
                    (error.message || error),
                    'error'
                );
            }

            return;
        }

        /*
         * If there is no selected session, retain the original export
         * behaviour for compatibility with older/non-session views.
         */
        return originalExport();
    };

    // ------------------------------------------------------------
    // 6. VERIFICATION — REFRESH SELECTED SESSION
    // ------------------------------------------------------------
    const originalVerify =
        LA.verifyAttendance.bind(LA);

    LA.verifyAttendance = async function (recordId) {
        await originalVerify(recordId);

        if (this.selectedSessionId) {
            await this.loadTodayAttendance();
            await this.loadAttendanceStats();
            this.applyFilters();
        }
    };

    // ------------------------------------------------------------
    // 7. SELECTED SESSION FILTER COUNT
    // ------------------------------------------------------------
    const originalApplyFilters =
        LA.applyFilters.bind(LA);

    LA.applyFilters = function () {
        if (
            this.selectedSessionId &&
            this.sessionRegister
        ) {
            const filterBlock =
                (document.getElementById('filterBlock')?.value || 'All').trim();

            const filterYear =
                (document.getElementById('filterYear')?.value || 'All').trim();

            const filterSessionType =
                (document.getElementById('filterSessionType')?.value || 'All').trim();

            const searchText =
                (document.getElementById('filterSearch')?.value || '')
                    .trim()
                    .toLowerCase();

            let rows =
                [...(this.sessionRegister.rows || [])];

            if (filterBlock !== 'All') {
                rows = rows.filter(row =>
                    String(row.student?.block || '')
                        .toLowerCase() ===
                    filterBlock.toLowerCase()
                );
            }

            if (filterYear !== 'All') {
                rows = rows.filter(row =>
                    String(row.student?.intake_year || '')
                        .toLowerCase() ===
                    filterYear.toLowerCase()
                );
            }

            if (filterSessionType !== 'All') {
                rows = rows.filter(() =>
                    String(this.selectedSession?.session_type || '')
                        .toLowerCase() ===
                    filterSessionType.toLowerCase()
                );
            }

            if (searchText) {
                rows = rows.filter(row => {
                    const text = [
                        row.student?.name,
                        row.student?.registration_number,
                        row.student?.student_id,
                        row.student?.program,
                        row.student?.block,
                        this.selectedSession?.unit_name,
                        this.selectedSession?.session_title,
                        this.selectedSession?.title
                    ]
                        .filter(Boolean)
                        .join(' ')
                        .toLowerCase();

                    return text.includes(searchText);
                });
            }

            this.renderSessionRegister(
                {
                    rows,
                    summary: this.sessionRegister.summary
                },
                this.selectedSession
            );

            const count =
                document.getElementById(
                    'attendanceFilterCount'
                );

            if (count) {
                count.textContent =
                    `Showing ${rows.length} of ${this.sessionRegister.rows.length} students in selected session`;
            }

            return;
        }

        return originalApplyFilters();
    };

    // ------------------------------------------------------------
    // 8. GLOBALS REMAIN HTML-COMPATIBLE
    // ------------------------------------------------------------
    window.LecturerAttendance = LA;

    window.markAttendance =
        e => LA.markStudentAttendance(e);

    window.exportAttendanceCSV =
        () => LA.exportCSV();

    window.applyAttendanceFilters =
        () => LA.applyFilters();

    window.resetAttendanceFilters =
        () => LA.resetFilters();

    window.verifyAttendance =
        id => LA.verifyAttendance(id);

    console.log(
        '✅ LecturerAttendance FIX PATCH loaded'
    );
    console.log(
        '📋 Session ID enforcement: ENABLED'
    );
    console.log(
        '📊 Full class register/export: ENABLED'
    );
    console.log(
        '📍 Session radius validation: ENABLED'
    );

})();
