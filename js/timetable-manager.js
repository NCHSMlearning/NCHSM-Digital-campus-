// ================================================================
// NCHSM STUDENT PORTAL
// FULL STUDENT TIMETABLE MODULE
// ================================================================
// IMPORTANT:
// 1. Replace the old timetable-manager.js completely with this file.
// 2. Do NOT load the old timetable-manager.js and this file together.
// 3. This version includes the capitalize() fix internally.
// 4. It works with the HTML IDs in the redesigned timetable section.
// 5. Supabase table expected: timetables
//    Required filter: block = student's assigned block
// ================================================================

(function () {
    'use strict';

    // ------------------------------------------------------------
    // MODULE STATE
    // ------------------------------------------------------------

    let studentTimetableData = [];
    let currentStudentBlock = null;

    let initialized = false;
    let loading = false;
    let observerStarted = false;
    let retryTimer = null;

    let selectedWeek = 'all';

    // Expose data for debugging/other portal modules.
    window.studentTimetableData = studentTimetableData;

    // ------------------------------------------------------------
    // BASIC HELPERS
    // ------------------------------------------------------------

    const $ = id => document.getElementById(id);

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function normalize(value) {
        return String(value ?? '')
            .trim()
            .toLowerCase()
            .replace(/[_-]+/g, ' ')
            .replace(/\s+/g, ' ');
    }

    // IMPORTANT:
    // The previous timetable manager crashed because capitalize()
    // did not exist. Keep it local AND expose it globally.
    function capitalize(value) {
        if (value === null || value === undefined) return '';

        return String(value)
            .trim()
            .toLowerCase()
            .replace(/\b\w/g, char => char.toUpperCase());
    }

    if (typeof window.capitalize !== 'function') {
        window.capitalize = capitalize;
    }

    function escapeHtml(value) {
        const div = document.createElement('div');
        div.textContent = value === null || value === undefined
            ? ''
            : String(value);
        return div.innerHTML;
    }

    function formatTime(value) {
        if (!value) return 'TBA';

        const raw = String(value).trim();

        // PostgreSQL time: HH:MM:SS
        if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(raw)) {
            return raw.substring(0, 5);
        }

        return raw;
    }

    function timeToMinutes(value) {
        if (!value) return 9999;

        const match = String(value).trim().match(/^(\d{1,2}):(\d{2})/);

        if (!match) return 9999;

        return Number(match[1]) * 60 + Number(match[2]);
    }

    function normalizeDay(value) {
        const day = normalize(value);

        const aliases = {
            mon: 'monday',
            monday: 'monday',

            tue: 'tuesday',
            tues: 'tuesday',
            tuesday: 'tuesday',

            wed: 'wednesday',
            weds: 'wednesday',
            wednesday: 'wednesday',

            thu: 'thursday',
            thur: 'thursday',
            thurs: 'thursday',
            thursday: 'thursday',

            fri: 'friday',
            friday: 'friday',

            sat: 'saturday',
            saturday: 'saturday',

            sun: 'sunday',
            sunday: 'sunday'
        };

        return aliases[day] || day;
    }

    const DAYS = [
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday'
    ];

    const DAY_NAMES = {
        monday: 'Monday',
        tuesday: 'Tuesday',
        wednesday: 'Wednesday',
        thursday: 'Thursday',
        friday: 'Friday'
    };

    const DAY_SHORT = {
        monday: 'MON',
        tuesday: 'TUE',
        wednesday: 'WED',
        thursday: 'THU',
        friday: 'FRI'
    };

    const DAY_RANK = {
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5
    };

    // ------------------------------------------------------------
    // SUPABASE CLIENT
    // ------------------------------------------------------------

    function getSupabase() {
        const candidates = [
            window.supabase,
            window.db?.supabase,
            window.NCHSMLogin?.supabase,
            window.supabaseClient
        ];

        for (const client of candidates) {
            if (client && typeof client.from === 'function') {
                return client;
            }
        }

        return null;
    }

    // ------------------------------------------------------------
    // UI STATE
    // ------------------------------------------------------------

    function setDisplay(id, display) {
        const element = $(id);
        if (element) element.style.display = display;
    }

    function setText(id, text) {
        const element = $(id);
        if (element) element.textContent = text ?? '';
    }

    function setState(state, message = '') {
        const container = $('timetable-container');
        const loadingBox = $('timetable-loading');
        const emptyBox = $('timetable-empty');
        const errorBox = $('timetable-error');

        if (loadingBox) {
            loadingBox.style.display = state === 'loading' ? 'flex' : 'none';
        }

        if (container) {
            container.style.display = state === 'ready' ? 'block' : 'none';
        }

        if (emptyBox) {
            emptyBox.style.display = state === 'empty' ? 'flex' : 'none';
        }

        if (errorBox) {
            errorBox.style.display = state === 'error' ? 'flex' : 'none';
        }

        if (message) {
            setText('empty-message-text', message);
            setText('timetable-error-text', message);
        }
    }

    function setStatus(message, good = true) {
        const status = $('timetable-status');

        if (!status) return;

        status.innerHTML = `
            <span style="
                width:7px;
                height:7px;
                background:${good ? '#22c55e' : '#ef4444'};
                border-radius:50%;
                display:inline-block;
                box-shadow:0 0 0 3px ${good ? '#dcfce7' : '#fee2e2'};
            "></span>
            ${escapeHtml(message)}
        `;
    }

    function setRefreshButton(loadingNow) {
        const button = $('timetable-refresh-btn');

        if (!button) return;

        if (loadingNow) {
            button.disabled = true;
            button.style.opacity = '0.7';
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
        } else {
            button.disabled = false;
            button.style.opacity = '1';
            button.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
        }
    }

    // ------------------------------------------------------------
    // PROFILE / BLOCK RESOLUTION
    // ------------------------------------------------------------

    function getBlockFromProfile(profile) {
        if (!profile || typeof profile !== 'object') return null;

        const candidates = [
            profile.block,
            profile.student_block,
            profile.class_block,
            profile.current_block
        ];

        for (const value of candidates) {
            if (
                value !== null &&
                value !== undefined &&
                String(value).trim() !== '' &&
                normalize(value) !== 'null' &&
                normalize(value) !== 'undefined'
            ) {
                return String(value).trim();
            }
        }

        return null;
    }

    async function getAuthenticatedUser(client) {
        try {
            const result = await client.auth.getUser();
            return result?.data?.user || null;
        } catch (error) {
            console.warn('⚠️ Unable to get authenticated user:', error);
            return null;
        }
    }

    async function resolveStudentProfile(client) {

        // 1. Existing global profile.
        const knownProfiles = [
            window.currentUserProfile,
            window.db?.currentUserProfile,
            window.profileModule?.userProfile,
            window.studentProfile
        ];

        for (const profile of knownProfiles) {
            if (getBlockFromProfile(profile)) {
                return profile;
            }
        }

        // 2. Try authenticated user + database.
        const user = await getAuthenticatedUser(client);

        if (!user?.id) {
            return null;
        }

        try {
            const result = await client
                .from('consolidated_user_profiles_table')
                .select('block, program, full_name, intake_year, user_id')
                .eq('user_id', user.id)
                .maybeSingle();

            if (result.error) {
                console.warn(
                    '⚠️ Student profile lookup warning:',
                    result.error.message
                );
            }

            if (result.data) {
                window.currentUserProfile = {
                    ...(window.currentUserProfile || {}),
                    ...result.data
                };

                return result.data;
            }
        } catch (error) {
            console.warn('⚠️ Student profile lookup failed:', error);
        }

        return null;
    }

    async function resolveStudentBlock(client) {
        const profile = await resolveStudentProfile(client);

        return getBlockFromProfile(profile);
    }

    // ------------------------------------------------------------
    // FETCH TIMETABLE
    // ------------------------------------------------------------

    async function fetchTimetable(client, block) {
        if (!client) {
            throw new Error('Supabase client is not available.');
        }

        if (!block) {
            throw new Error('Student block is not available.');
        }

        console.log(`📅 Fetching timetable for block: ${block}`);

        const result = await client
            .from('timetables')
            .select('*')
            .eq('block', block);

        if (result.error) {
            throw result.error;
        }

        return Array.isArray(result.data)
            ? result.data
            : [];
    }

    // ------------------------------------------------------------
    // NORMALIZE DATABASE ROWS
    // ------------------------------------------------------------

    function normalizeTimetableRow(row) {
        const item = { ...row };

        item._day = normalizeDay(
            row.day_of_week ??
            row.day ??
            row.week_day
        );

        item._start = formatTime(
            row.start_time ??
            row.start ??
            row.startTime
        );

        item._end = formatTime(
            row.end_time ??
            row.end ??
            row.endTime
        );

        item._courseCode =
            row.unit_code ??
            row.course_code ??
            row.code ??
            row.courseCode ??
            '';

        item._courseName =
            row.session_name ??
            row.course_name ??
            row.unit_name ??
            row.courseName ??
            row.title ??
            'Class';

        item._lecturer =
            row.lecturer_name ??
            row.lecturer ??
            row.teacher_name ??
            row.teacher ??
            'TBA';

        item._venue =
            row.venue ??
            row.room ??
            row.location ??
            'TBD';

        item._type =
            row.class_type ??
            row.session_type ??
            row.type ??
            row.activity_type ??
            '';

        item._notes =
            row.notes ??
            row.description ??
            row.remarks ??
            '';

        return item;
    }

    function normalizedData(data) {
        return data.map(normalizeTimetableRow);
    }

    // ------------------------------------------------------------
    // WEEK HELPERS
    // ------------------------------------------------------------

    function getAvailableWeeks(data) {
        const values = data
            .map(row => row.week_number)
            .filter(value =>
                value !== null &&
                value !== undefined &&
                String(value).trim() !== ''
            )
            .map(value => Number(value))
            .filter(Number.isFinite);

        return [...new Set(values)].sort((a, b) => a - b);
    }

    function getCurrentWeek(data) {
        const current = data.find(row =>
            row.is_current_week === true ||
            row.current_week === true ||
            row.active_week === true
        );

        if (current?.week_number !== null &&
            current?.week_number !== undefined &&
            String(current.week_number).trim() !== '') {
            return String(current.week_number);
        }

        return 'all';
    }

    function updateWeekControls(data) {
        const strip = $('week-buttons');
        const select = $('week-filter-select');

        const weeks = getAvailableWeeks(data);

        // Week buttons.
        if (strip) {
            let html = `
                <button
                    type="button"
                    class="week-filter-btn ${selectedWeek === 'all' ? 'active' : ''}"
                    data-week-filter="all"
                    style="
                        padding:8px 18px;
                        border-radius:50px;
                        border:none;
                        font-weight:600;
                        cursor:pointer;
                        transition:all .3s ease;
                        background:${selectedWeek === 'all'
                            ? 'linear-gradient(135deg,#0A3D62,#1a5a7a)'
                            : '#f1f5f9'};
                        color:${selectedWeek === 'all' ? '#fff' : '#475569'};
                        box-shadow:${selectedWeek === 'all'
                            ? '0 2px 8px rgba(10,61,98,.30)'
                            : 'none'};
                    ">
                    <i class="fas fa-list"></i> All Weeks
                </button>
            `;

            weeks.forEach(week => {
                const active = String(selectedWeek) === String(week);

                html += `
                    <button
                        type="button"
                        class="week-filter-btn ${active ? 'active' : ''}"
                        data-week-filter="${escapeHtml(week)}"
                        style="
                            padding:8px 18px;
                            border-radius:50px;
                            border:none;
                            font-weight:${active ? '600' : '500'};
                            cursor:pointer;
                            transition:all .3s ease;
                            background:${active
                                ? 'linear-gradient(135deg,#0A3D62,#1a5a7a)'
                                : '#f1f5f9'};
                            color:${active ? '#fff' : '#475569'};
                            box-shadow:${active
                                ? '0 2px 8px rgba(10,61,98,.30)'
                                : 'none'};
                        ">
                        <i class="far fa-calendar"></i> Week ${escapeHtml(week)}
                    </button>
                `;
            });

            strip.innerHTML = html;

            strip.querySelectorAll('[data-week-filter]').forEach(button => {
                button.addEventListener('click', function () {
                    selectedWeek = this.dataset.weekFilter || 'all';

                    updateWeekControls(studentTimetableData);
                    renderTimetable(selectedWeek);
                });
            });
        }

        // Hidden select retained for compatibility.
        if (select) {
            select.innerHTML =
                '<option value="all">All Weeks</option>' +
                weeks.map(week =>
                    `<option value="${escapeHtml(week)}">Week ${escapeHtml(week)}</option>`
                ).join('');

            select.value = String(selectedWeek);

            select.onchange = function () {
                selectedWeek = this.value || 'all';
                updateWeekControls(studentTimetableData);
                renderTimetable(selectedWeek);
            };
        }

        setText(
            'timetable-week-count',
            String(weeks.length)
        );
    }

    // ------------------------------------------------------------
    // STATISTICS
    // ------------------------------------------------------------

    function updateStatistics(data) {
        const total = data.length;

        setText('timetable-total-count', total);
        setText(
            'class-count-display',
            `${total} ${total === 1 ? 'class' : 'classes'}`
        );

        const weeks = getAvailableWeeks(data);
        setText('timetable-week-count', weeks.length);

        const upcoming = countUpcomingClasses(data);
        setText('timetable-upcoming-count', upcoming);

        setText(
            'timetable-status-short',
            total > 0 ? 'Published' : 'Not Published'
        );

        setText(
            'timetable-week-label',
            selectedWeek === 'all'
                ? 'All Weeks'
                : `Week ${selectedWeek} of ${weeks.length || selectedWeek}`
        );
    }

    function countUpcomingClasses(data) {
        const now = new Date();

        const todayIndex = now.getDay();
        const currentMinutes =
            now.getHours() * 60 +
            now.getMinutes();

        const todayName =
            ['sunday', 'monday', 'tuesday', 'wednesday',
             'thursday', 'friday', 'saturday'][todayIndex];

        let count = 0;

        data.forEach(row => {
            const item = normalizeTimetableRow(row);

            if (
                item.is_holiday ||
                item.cancelled ||
                item.is_cancelled
            ) {
                return;
            }

            if (item._day === todayName) {
                if (timeToMinutes(item.start_time) >= currentMinutes) {
                    count++;
                }
            } else if (
                DAY_RANK[item._day] &&
                DAY_RANK[item._day] > todayIndex
            ) {
                count++;
            }
        });

        return count;
    }

    // ------------------------------------------------------------
    // NEXT CLASS
    // ------------------------------------------------------------

    function findNextClass(data) {
        const now = new Date();

        const todayIndex = now.getDay();

        const todayName =
            ['sunday', 'monday', 'tuesday', 'wednesday',
             'thursday', 'friday', 'saturday'][todayIndex];

        const currentMinutes =
            now.getHours() * 60 +
            now.getMinutes();

        const valid = data
            .map(normalizeTimetableRow)
            .filter(item =>
                DAYS.includes(item._day) &&
                !item.is_holiday &&
                !item.cancelled &&
                !item.is_cancelled
            );

        // First: remaining classes today.
        const todayClasses = valid
            .filter(item =>
                item._day === todayName &&
                timeToMinutes(item.start_time) >= currentMinutes
            )
            .sort((a, b) =>
                timeToMinutes(a.start_time) -
                timeToMinutes(b.start_time)
            );

        if (todayClasses.length) {
            return {
                item: todayClasses[0],
                dayOffset: 0
            };
        }

        // Then: next Monday-Friday.
        for (let offset = 1; offset <= 7; offset++) {
            const targetIndex = (todayIndex + offset) % 7;

            const targetDay =
                DAYS.find(day => DAY_RANK[day] === targetIndex);

            if (!targetDay) continue;

            const classes = valid
                .filter(item => item._day === targetDay)
                .sort((a, b) =>
                    timeToMinutes(a.start_time) -
                    timeToMinutes(b.start_time)
                );

            if (classes.length) {
                return {
                    item: classes[0],
                    dayOffset: offset
                };
            }
        }

        return null;
    }

    function showNextClassWidget(data) {
        const widget = $('next-class-snap');

        if (!widget) return;

        const result = findNextClass(data);

        if (!result) {
            widget.style.display = 'none';
            return;
        }

        const item = result.item;

        widget.style.display = 'block';

        setText(
            'next-class-name',
            item._courseName || 'Class'
        );

        setText(
            'next-class-time',
            `${item._start} – ${item._end}`
        );

        setText(
            'next-class-venue',
            item._venue || 'TBD'
        );

        setText(
            'next-class-lecturer',
            item._lecturer || 'TBA'
        );

        setText(
            'next-class-day',
            result.dayOffset === 0
                ? 'Today'
                : capitalize(item._day)
        );
    }

    // ------------------------------------------------------------
    // RENDER TIMETABLE
    // ------------------------------------------------------------

    function renderTimetable(weekFilter = 'all') {
        const container = $('timetable-container');

        if (!container) return;

        selectedWeek = String(weekFilter || 'all');

        let data = normalizedData(studentTimetableData);

        // Apply week filter.
        if (selectedWeek !== 'all') {
            data = data.filter(item =>
                String(item.week_number) === selectedWeek
            );
        }

        // Chronological order.
        data.sort((a, b) => {
            const dayA = DAY_RANK[a._day] || 99;
            const dayB = DAY_RANK[b._day] || 99;

            if (dayA !== dayB) {
                return dayA - dayB;
            }

            return timeToMinutes(a.start_time) -
                   timeToMinutes(b.start_time);
        });

        setText(
            'timetable-week-label',
            selectedWeek === 'all'
                ? 'All Weeks'
                : `Week ${selectedWeek}`
        );

        // No results for selected week.
        if (!data.length) {
            container.style.display = 'block';

            container.innerHTML = `
                <div style="
                    min-height:200px;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    flex-direction:column;
                    text-align:center;
                    color:#94a3b8;
                ">
                    <div style="
                        width:50px;
                        height:50px;
                        display:grid;
                        place-items:center;
                        border-radius:50%;
                        background:#f1f5f9;
                        color:#64748b;
                        font-size:20px;
                        margin-bottom:9px;
                    ">
                        <i class="far fa-calendar-xmark"></i>
                    </div>

                    <strong style="color:#475569;font-size:14px;">
                        No classes found
                    </strong>

                    <span style="font-size:12px;margin-top:4px;">
                        There are no timetable entries for the selected week.
                    </span>
                </div>
            `;

            return;
        }

        // Group by weekday.
        const grouped = {};

        DAYS.forEach(day => {
            grouped[day] = [];
        });

        data.forEach(item => {
            if (grouped[item._day]) {
                grouped[item._day].push(item);
            }
        });

        // Render.
        let html = `
            <div style="
                display:flex;
                justify-content:space-between;
                align-items:center;
                flex-wrap:wrap;
                gap:10px;
                padding:0 0 12px;
            ">
                <div style="
                    font-size:12px;
                    color:#64748b;
                ">
                    <span style="color:#94a3b8;">Showing:</span>
                    <strong style="color:#0A3D62;">
                        ${data.length}
                        ${data.length === 1 ? 'class' : 'classes'}
                    </strong>
                </div>

                <div style="
                    font-size:11px;
                    color:#94a3b8;
                ">
                    <i class="fas fa-circle-info"></i>
                    Classes are arranged chronologically
                </div>
            </div>

            <div style="
                width:100%;
                overflow-x:auto;
                border:1px solid #e5e7eb;
                border-radius:12px;
                background:#fff;
            ">
                <table class="timetable-modern" style="
                    width:100%;
                    min-width:1050px;
                    border-collapse:collapse;
                    font-size:13px;
                ">
                    <thead>
                        <tr>
                            <th>Day</th>
                            <th>Time</th>
                            <th>Unit Code</th>
                            <th>Unit / Session</th>
                            <th>Type</th>
                            <th>Venue</th>
                            <th>Lecturer</th>
                            <th>Notes</th>
                        </tr>
                    </thead>

                    <tbody>
        `;

        DAYS.forEach(day => {
            const classes = grouped[day];

            if (!classes.length) {
                html += `
                    <tr>
                        <td style="
                            padding:13px 14px;
                            border-bottom:1px solid #e5e7eb;
                            font-weight:700;
                            color:#0A3D62;
                            background:#fafcfd;
                        ">
                            ${DAY_NAMES[day]}
                        </td>

                        <td colspan="7" style="
                            padding:13px 14px;
                            border-bottom:1px solid #e5e7eb;
                            color:#cbd5e1;
                            font-size:11px;
                        ">
                            No classes scheduled
                        </td>
                    </tr>
                `;

                return;
            }

            classes.forEach((item, index) => {

                const badges = [];

                if (item.is_exam) {
                    badges.push(`
                        <span class="tt-badge exam">
                            <i class="fas fa-file-pen"></i> Exam
                        </span>
                    `);
                }

                if (item.is_holiday) {
                    badges.push(`
                        <span class="tt-badge holiday">
                            <i class="fas fa-umbrella-beach"></i> Holiday
                        </span>
                    `);
                }

                if (item.pending_allocation) {
                    badges.push(`
                        <span class="tt-badge pending">
                            <i class="fas fa-clock"></i> Pending
                        </span>
                    `);
                }

                if (item.cancelled || item.is_cancelled) {
                    badges.push(`
                        <span class="tt-badge cancelled">
                            <i class="fas fa-ban"></i> Cancelled
                        </span>
                    `);
                }

                const type = item._type
                    ? capitalize(item._type)
                    : 'Class';

                const notes = item._notes || '—';

                const rowStyle =
                    item.cancelled || item.is_cancelled
                        ? 'opacity:.55;'
                        : '';

                html += `
                    <tr style="${rowStyle}">

                        ${index === 0 ? `
                            <td
                                rowspan="${classes.length}"
                                class="day-cell"
                                style="
                                    padding:13px 14px;
                                    border-bottom:1px solid #e5e7eb;
                                    border-right:1px solid #eef2f5;
                                    font-weight:700;
                                    color:#0A3D62;
                                    background:#fafcfd;
                                    vertical-align:middle;
                                    white-space:nowrap;
                                "
                            >
                                <span style="display:block;">
                                    ${DAY_NAMES[day]}
                                </span>

                                <small style="
                                    color:#94a3b8;
                                    font-size:9px;
                                    font-weight:600;
                                ">
                                    ${DAY_SHORT[day]}
                                </small>
                            </td>
                        ` : ''}

                        <td style="
                            padding:13px 14px;
                            border-bottom:1px solid #e5e7eb;
                            color:#1e5a82;
                            font-weight:700;
                            white-space:nowrap;
                        ">
                            <span>${escapeHtml(item._start)}</span>
                            <span style="
                                display:block;
                                color:#94a3b8;
                                font-size:10px;
                                margin-top:2px;
                            ">
                                ${escapeHtml(item._end)}
                            </span>
                        </td>

                        <td style="
                            padding:13px 14px;
                            border-bottom:1px solid #e5e7eb;
                            color:#475569;
                            font-weight:700;
                            white-space:nowrap;
                        ">
                            ${escapeHtml(item._courseCode || '—')}
                        </td>

                        <td class="course-cell" style="
                            padding:13px 14px;
                            border-bottom:1px solid #e5e7eb;
                            color:#334155;
                            min-width:190px;
                        ">
                            <strong style="color:#0A3D62;">
                                ${escapeHtml(item._courseName)}
                            </strong>

                            ${badges.length ? `
                                <div style="
                                    display:flex;
                                    flex-wrap:wrap;
                                    gap:4px;
                                    margin-top:5px;
                                ">
                                    ${badges.join('')}
                                </div>
                            ` : ''}
                        </td>

                        <td style="
                            padding:13px 14px;
                            border-bottom:1px solid #e5e7eb;
                            color:#475569;
                            white-space:nowrap;
                        ">
                            <span style="
                                display:inline-block;
                                background:#eff6ff;
                                color:#2563eb;
                                padding:4px 8px;
                                border-radius:12px;
                                font-size:9px;
                                font-weight:700;
                            ">
                                ${escapeHtml(type)}
                            </span>
                        </td>

                        <td style="
                            padding:13px 14px;
                            border-bottom:1px solid #e5e7eb;
                            color:#475569;
                            min-width:120px;
                        ">
                            <i class="fas fa-location-dot"
                               style="color:#94a3b8;margin-right:4px;"></i>
                            ${escapeHtml(item._venue)}
                        </td>

                        <td style="
                            padding:13px 14px;
                            border-bottom:1px solid #e5e7eb;
                            color:#475569;
                            min-width:135px;
                        ">
                            <i class="fas fa-user-tie"
                               style="color:#94a3b8;margin-right:4px;"></i>
                            ${escapeHtml(item._lecturer)}
                        </td>

                        <td style="
                            padding:13px 14px;
                            border-bottom:1px solid #e5e7eb;
                            color:#64748b;
                            min-width:130px;
                            font-size:11px;
                        ">
                            ${escapeHtml(notes)}
                        </td>

                    </tr>
                `;
            });
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;
        container.style.display = 'block';
    }

    // ------------------------------------------------------------
    // MAIN INITIALIZATION
    // ------------------------------------------------------------

    async function initStudentTimetable(options = {}) {

        const force = options === true || options?.force === true;

        const container = $('timetable-container');

        // Section may be injected after the main page loads.
        if (!container) {
            scheduleRetry();
            return false;
        }

        // Prevent multiple simultaneous Supabase requests.
        if (loading) {
            return false;
        }

        if (initialized && !force) {
            return true;
        }

        loading = true;

        setState('loading');
        setStatus('Loading your academic timetable...', true);
        setRefreshButton(true);

        try {
            let client = getSupabase();
            let block = null;

            // Give the login/profile modules time to finish.
            for (let attempt = 1; attempt <= 20; attempt++) {

                client = getSupabase();

                if (client) {
                    block = await resolveStudentBlock(client);

                    if (block) {
                        break;
                    }
                }

                if (attempt < 20) {
                    await sleep(500);
                }
            }

            if (!client) {
                throw new Error(
                    'Supabase is still loading. Please try again.'
                );
            }

            if (!block) {
                currentStudentBlock = null;

                setText(
                    'timetable-block-title',
                    'Block not assigned'
                );

                updateStatistics([]);

                setState(
                    'empty',
                    'Your block has not been assigned yet. Please contact the administrator.'
                );

                setStatus(
                    'Student block not available',
                    false
                );

                initialized = true;

                return false;
            }

            currentStudentBlock = block;

            // Update header.
            setText(
                'timetable-block-title',
                block
            );

            setStatus(
                `Schedule for ${block}`,
                true
            );

            // Fetch timetable.
            const rawData = await fetchTimetable(
                client,
                block
            );

            studentTimetableData = normalizedData(rawData);

            // Expose latest copy.
            window.studentTimetableData =
                [...studentTimetableData];

            updateStatistics(studentTimetableData);
            updateWeekControls(studentTimetableData);

            // Always start with All Weeks unless a current week
            // is explicitly marked in the database.
            selectedWeek = getCurrentWeek(
                studentTimetableData
            );

            // Make sure the week controls reflect selectedWeek.
            updateWeekControls(studentTimetableData);

            renderTimetable(selectedWeek);
            showNextClassWidget(studentTimetableData);

            if (!studentTimetableData.length) {

                setState(
                    'empty',
                    `No timetable has been published for ${block} yet.`
                );

                setStatus(
                    `No published timetable for ${block}`,
                    false
                );

                initialized = true;

                return true;
            }

            setState('ready');

            setStatus(
                `${studentTimetableData.length} ${
                    studentTimetableData.length === 1
                        ? 'class'
                        : 'classes'
                } loaded`,
                true
            );

            initialized = true;

            console.log(
                `✅ Student timetable loaded successfully: ${studentTimetableData.length} entries`
            );

            console.log(
                `📌 Student block: ${currentStudentBlock}`
            );

            return true;

        } catch (error) {

            console.error(
                '❌ Student timetable initialization failed:',
                error
            );

            const message =
                error?.message ||
                'Unable to load the student timetable.';

            setState(
                'error',
                message
            );

            setStatus(
                'Unable to load timetable',
                false
            );

            initialized = false;

            return false;

        } finally {
            loading = false;
            setRefreshButton(false);
        }
    }

    // ------------------------------------------------------------
    // RETRY / DYNAMIC SECTION DETECTION
    // ------------------------------------------------------------

    function scheduleRetry(delay = 800) {
        clearTimeout(retryTimer);

        retryTimer = setTimeout(() => {

            if (
                $('timetable-container') &&
                !loading
            ) {
                initStudentTimetable();
            }

        }, delay);
    }

    function startMutationObserver() {

        if (observerStarted || !document.body) {
            return;
        }

        observerStarted = true;

        const observer = new MutationObserver(() => {

            const container =
                $('timetable-container');

            if (
                container &&
                !initialized &&
                !loading
            ) {
                initStudentTimetable();
            }
        });

        observer.observe(
            document.body,
            {
                childList: true,
                subtree: true
            }
        );
    }

    // ------------------------------------------------------------
    // TAB DETECTION
    // ------------------------------------------------------------

    function isTimetableTarget(element) {

        if (!element) return false;

        const values = [
            element.dataset?.tab,
            element.dataset?.section,
            element.getAttribute?.('href'),
            element.id,
            element.textContent
        ];

        const combined = values
            .filter(Boolean)
            .map(normalize)
            .join(' ');

        return (
            combined.includes('timetable') ||
            combined.includes('time table') ||
            combined.includes('calendar') ||
            combined.includes('schedule')
        );
    }

    document.addEventListener(
        'click',
        function (event) {

            const target =
                event.target.closest(
                    '[data-tab], [data-section], .sidebar-link, .nav-link, .menu-link, a, button'
                );

            if (!target) return;

            if (!isTimetableTarget(target)) {
                return;
            }

            console.log(
                '📅 Timetable tab detected - refreshing...'
            );

            // The portal may switch display after this click.
            setTimeout(() => {
                initStudentTimetable({
                    force: true
                });
            }, 250);
        },
        true
    );

    // ------------------------------------------------------------
    // APP LIFECYCLE
    // ------------------------------------------------------------

    function bootTimetable() {

        console.log(
            '📅 Booting student timetable module...'
        );

        startMutationObserver();

        if ($('timetable-container')) {
            initStudentTimetable();
        } else {
            scheduleRetry(500);
        }
    }

    document.addEventListener(
        'DOMContentLoaded',
        bootTimetable
    );

    window.addEventListener(
        'load',
        function () {
            setTimeout(
                bootTimetable,
                250
            );
        }
    );

    document.addEventListener(
        'appReady',
        function () {
            console.log(
                '📅 appReady received - starting timetable...'
            );

            setTimeout(
                () => initStudentTimetable({
                    force: true
                }),
                300
            );
        }
    );

    // ------------------------------------------------------------
    // PUBLIC REFRESH API
    // ------------------------------------------------------------

    window.refreshStudentTimetable = async function () {

        console.log(
            '🔄 Manual timetable refresh requested'
        );

        initialized = false;

        return await initStudentTimetable({
            force: true
        });
    };

    window.forceRefreshTimetable = async function (
        blockName = null
    ) {

        const client = getSupabase();

        const block =
            blockName ||
            currentStudentBlock ||
            getBlockFromProfile(
                window.currentUserProfile
            );

        if (!client) {
            console.error(
                '❌ Cannot refresh timetable: Supabase unavailable.'
            );

            return false;
        }

        if (!block) {
            console.error(
                '❌ Cannot refresh timetable: student block unavailable.'
            );

            return false;
        }

        loading = true;
        setState('loading');
        setRefreshButton(true);

        try {

            const rawData =
                await fetchTimetable(
                    client,
                    block
                );

            currentStudentBlock = block;

            studentTimetableData =
                normalizedData(rawData);

            window.studentTimetableData =
                [...studentTimetableData];

            selectedWeek = 'all';

            setText(
                'timetable-block-title',
                block
            );

            updateStatistics(
                studentTimetableData
            );

            updateWeekControls(
                studentTimetableData
            );

            renderTimetable('all');

            showNextClassWidget(
                studentTimetableData
            );

            if (!studentTimetableData.length) {

                setState(
                    'empty',
                    `No timetable has been published for ${block} yet.`
                );

                setStatus(
                    `No published timetable for ${block}`,
                    false
                );

            } else {

                setState('ready');

                setStatus(
                    `${studentTimetableData.length} ${
                        studentTimetableData.length === 1
                            ? 'class'
                            : 'classes'
                    } loaded`,
                    true
                );
            }

            initialized = true;

            console.log(
                `✅ Timetable force refresh complete for ${block}`
            );

            return true;

        } catch (error) {

            console.error(
                '❌ Timetable force refresh failed:',
                error
            );

            setState(
                'error',
                error?.message ||
                'Unable to refresh timetable.'
            );

            setStatus(
                'Unable to refresh timetable',
                false
            );

            initialized = false;

            return false;

        } finally {
            loading = false;
            setRefreshButton(false);
        }
    };

    // ------------------------------------------------------------
    // DEBUG API
    // ------------------------------------------------------------

    window.getStudentTimetableData =
        function () {
            return [...studentTimetableData];
        };

    window.getCurrentStudentBlock =
        function () {
            return currentStudentBlock;
        };

    window.renderStudentTimetable =
        function (week = 'all') {
            selectedWeek = String(week);
            updateWeekControls(
                studentTimetableData
            );
            renderTimetable(selectedWeek);
        };

    window.getStudentTimetableStatus =
        function () {
            return {
                initialized,
                loading,
                block: currentStudentBlock,
                total: studentTimetableData.length,
                weeks: getAvailableWeeks(
                    studentTimetableData
                )
            };
        };

    // ------------------------------------------------------------
    // FINAL MODULE EXPORT
    // ------------------------------------------------------------

    window.initStudentTimetable =
        initStudentTimetable;

    window.getSupabase =
        window.getSupabase ||
        getSupabase;

    console.log(
        '✅ FULL STUDENT TIMETABLE MODULE LOADED'
    );

})();
