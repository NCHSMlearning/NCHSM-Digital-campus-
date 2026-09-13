// ============================================================
// STUDENT TIMETABLE MODULE - ROBUST AUTO-INITIALIZING VERSION
// ============================================================

(function () {
    'use strict';

    let studentTimetableData = [];
    let currentStudentBlock = null;
    let timetableInitialized = false;
    let timetableLoading = false;
    let retryTimer = null;
    let observerStarted = false;

    // ------------------------------------------------------------
    // SUPABASE CLIENT
    // ------------------------------------------------------------
    function getSupabase() {
        const candidates = [
            window.supabase,
            window.db?.supabase,
            window.NCHSMLogin?.supabase
        ];

        for (const client of candidates) {
            if (client && typeof client.from === 'function') {
                return client;
            }
        }

        return null;
    }

    // ------------------------------------------------------------
    // DOM HELPERS
    // ------------------------------------------------------------
    function getEl(id) {
        return document.getElementById(id);
    }

    function setState(state, message) {
        const container = getEl('timetable-container');
        const loading = getEl('timetable-loading');
        const empty = getEl('timetable-empty');
        const error = getEl('timetable-error');

        if (loading) loading.style.display = state === 'loading' ? 'flex' : 'none';
        if (container) container.style.display = state === 'ready' ? 'block' : 'none';
        if (empty) empty.style.display = state === 'empty' ? 'flex' : 'none';
        if (error) error.style.display = state === 'error' ? 'flex' : 'none';

        if (message) {
            const emptyText = getEl('empty-message-text');
            const errorText = getEl('timetable-error-text');

            if (emptyText) emptyText.textContent = message;
            if (errorText) errorText.textContent = message;
        }
    }

    function escapeHtml(value) {
        const div = document.createElement('div');
        div.textContent = value == null ? '' : String(value);
        return div.innerHTML;
    }

    function normalize(value) {
        return String(value ?? '')
            .trim()
            .toLowerCase()
            .replace(/[_-]+/g, ' ')
            .replace(/\s+/g, ' ');
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
            wednesday: 'wednesday',
            thu: 'thursday',
            thur: 'thursday',
            thurs: 'thursday',
            thursday: 'thursday',
            fri: 'friday',
            friday: 'friday'
        };
        return aliases[day] || day;
    }

    function formatTime(value) {
        if (!value) return 'TBA';
        const raw = String(value).trim();

        // HH:MM:SS / HH:MM
        if (/^\d{1,2}:\d{2}/.test(raw)) {
            return raw.substring(0, 5);
        }

        return raw;
    }

    function timeToMinutes(value) {
        if (!value) return 9999;
        const match = String(value).match(/^(\d{1,2}):(\d{2})/);
        if (!match) return 9999;
        return Number(match[1]) * 60 + Number(match[2]);
    }

    // ------------------------------------------------------------
    // PROFILE / BLOCK RESOLUTION
    // ------------------------------------------------------------
    async function resolveStudentProfile(supabaseClient) {
        const sources = [
            window.currentUserProfile,
            window.db?.currentUserProfile,
            window.profileModule?.userProfile,
            window.studentProfile
        ];

        for (const profile of sources) {
            if (profile && typeof profile === 'object') {
                const block = profile.block ?? profile.student_block ?? profile.class_block;
                if (block && normalize(block) !== 'null') {
                    return profile;
                }
            }
        }

        try {
            const authResult = await supabaseClient.auth.getUser();
            const user = authResult?.data?.user;

            if (!user?.id) return null;

            const { data, error } = await supabaseClient
                .from('consolidated_user_profiles_table')
                .select('block, program, full_name, intake_year')
                .eq('user_id', user.id)
                .maybeSingle();

            if (error) {
                console.warn('Timetable profile query:', error.message);
                return null;
            }

            if (data?.block) {
                window.currentUserProfile = {
                    ...(window.currentUserProfile || {}),
                    ...data
                };
            }

            return data || null;
        } catch (error) {
            console.warn('Unable to resolve student profile:', error);
            return null;
        }
    }

    async function resolveStudentBlock(supabaseClient) {
        const profile = await resolveStudentProfile(supabaseClient);

        if (!profile) return null;

        const block = profile.block ?? profile.student_block ?? profile.class_block;
        return block && normalize(block) !== 'null' ? String(block).trim() : null;
    }

    // ------------------------------------------------------------
    // FETCH TIMETABLE
    // ------------------------------------------------------------
    async function fetchTimetable(block) {
        const supabaseClient = getSupabase();

        if (!supabaseClient) {
            throw new Error('Supabase client is not ready yet.');
        }

        const { data, error } = await supabaseClient
            .from('timetables')
            .select('*')
            .eq('block', block);

        if (error) throw error;

        return Array.isArray(data) ? data : [];
    }

    // ------------------------------------------------------------
    // MAIN INITIALIZATION
    // ------------------------------------------------------------
    async function initStudentTimetable(options = {}) {
        const container = getEl('timetable-container');

        // If the timetable section has not been inserted yet, wait.
        if (!container) {
            scheduleRetry(700);
            return false;
        }

        // Prevent duplicate concurrent queries.
        if (timetableLoading) return false;

        // A forced refresh is allowed even after successful initialization.
        if (timetableInitialized && !options.force) {
            return true;
        }

        timetableLoading = true;
        setState('loading');

        const blockTitle = getEl('timetable-block-title');
        const countDisplay = getEl('class-count-display');
        const status = getEl('timetable-status');

        if (status) status.textContent = 'Connecting to your academic schedule…';

        try {
            // Wait briefly for the authentication/profile layer.
            let supabaseClient = getSupabase();
            let block = null;

            for (let attempt = 0; attempt < 12; attempt++) {
                supabaseClient = getSupabase();

                if (supabaseClient) {
                    block = await resolveStudentBlock(supabaseClient);
                    if (block) break;
                }

                await sleep(500);
            }

            if (!supabaseClient) {
                throw new Error('Supabase client is not available.');
            }

            if (!block) {
                currentStudentBlock = null;
                if (blockTitle) blockTitle.textContent = 'Block not assigned';
                if (countDisplay) countDisplay.textContent = '0 classes';
                setState(
                    'empty',
                    'Your block has not been assigned yet. Please contact the administrator.'
                );
                timetableInitialized = true;
                return false;
            }

            currentStudentBlock = block;

            if (blockTitle) blockTitle.textContent = block;
            if (status) status.textContent = `Schedule for ${block}`;

            const timetable = await fetchTimetable(block);

            studentTimetableData = timetable;

            if (!timetable.length) {
                if (countDisplay) countDisplay.textContent = '0 classes';
                updateWeekControls([]);
                renderTimetable('all');
                setState('empty', `No timetable has been published for ${block} yet.`);
                timetableInitialized = true;
                return true;
            }

            if (countDisplay) {
                countDisplay.textContent =
                    `${timetable.length} ${timetable.length === 1 ? 'class' : 'classes'}`;
            }

            updateWeekControls(timetable);
            renderTimetable(getDefaultWeekFilter(timetable));

            showNextClassWidget(timetable);

            setState('ready');
            timetableInitialized = true;

            console.log(`✅ Timetable loaded: ${timetable.length} entries for ${block}`);
            return true;

        } catch (error) {
            console.error('❌ Student timetable initialization failed:', error);

            const message = error?.message || 'Unable to load your timetable.';
            if (blockTitle) blockTitle.textContent = 'Schedule unavailable';
            if (status) status.textContent = 'There was a problem loading your schedule.';

            setState('error', message);
            timetableInitialized = false;
            return false;

        } finally {
            timetableLoading = false;
        }
    }

    function scheduleRetry(delay = 700) {
        clearTimeout(retryTimer);
        retryTimer = setTimeout(() => {
            if (getEl('timetable-container')) {
                initStudentTimetable();
            }
        }, delay);
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ------------------------------------------------------------
    // WEEK CONTROLS
    // ------------------------------------------------------------
    function getAvailableWeeks(timetable) {
        return [...new Set(
            timetable
                .map(item => item.week_number)
                .filter(week => week !== null && week !== undefined && String(week).trim() !== '')
                .map(Number)
                .filter(Number.isFinite)
        )].sort((a, b) => a - b);
    }

    function getDefaultWeekFilter(timetable) {
        const weeks = getAvailableWeeks(timetable);
        if (!weeks.length) return 'all';

        // Prefer a week marked current/active if the table contains such a field.
        const active = timetable.find(item =>
            item.is_current_week === true ||
            item.current_week === true ||
            item.active_week === true
        );

        if (active?.week_number != null) {
            return String(active.week_number);
        }

        return 'all';
    }

    function updateWeekControls(timetable) {
        const weeks = getAvailableWeeks(timetable);
        const strip = getEl('week-buttons');
        const select = getEl('week-filter-select');

        if (strip) {
            let html = `
                <button type="button"
                        class="week-filter-btn active"
                        data-week-filter="all">
                    <i class="fas fa-layer-group"></i>
                    <span>All Weeks</span>
                </button>
            `;

            weeks.forEach(week => {
                html += `
                    <button type="button"
                            class="week-filter-btn"
                            data-week-filter="${week}">
                        <i class="far fa-calendar"></i>
                        <span>Week ${week}</span>
                    </button>
                `;
            });

            strip.innerHTML = html;

            strip.querySelectorAll('[data-week-filter]').forEach(button => {
                button.addEventListener('click', () => {
                    const value = button.dataset.weekFilter || 'all';
                    setActiveWeekButton(value);
                    renderTimetable(value);
                });
            });
        }

        if (select) {
            select.innerHTML =
                `<option value="all">All Weeks</option>` +
                weeks.map(week => `<option value="${week}">Week ${week}</option>`).join('');

            select.onchange = event => {
                setActiveWeekButton(event.target.value);
                renderTimetable(event.target.value);
            };
        }
    }

    function setActiveWeekButton(value) {
        document.querySelectorAll('.week-filter-btn').forEach(button => {
            button.classList.toggle(
                'active',
                String(button.dataset.weekFilter) === String(value)
            );
        });

        const select = getEl('week-filter-select');
        if (select && select.value !== String(value)) {
            select.value = String(value);
        }
    }

    // ------------------------------------------------------------
    // NEXT CLASS
    // ------------------------------------------------------------
    function showNextClassWidget(timetable) {
        const widget = getEl('next-class-snap');
        if (!widget) return;

        const nextClass = findNextClass(timetable);

        if (!nextClass) {
            widget.style.display = 'none';
            return;
        }

        widget.style.display = 'block';

        const name = nextClass.session_name || nextClass.course_name || 'Class';
        const lecturer = nextClass.lecturer_name || 'TBA';
        const venue = nextClass.venue || 'TBD';

        const nameEl = getEl('next-class-name');
        const lecturerEl = getEl('next-class-lecturer');
        const timeEl = getEl('next-class-time');
        const venueEl = getEl('next-class-venue');
        const dayEl = getEl('next-class-day');

        if (nameEl) nameEl.textContent = name;
        if (lecturerEl) lecturerEl.textContent = lecturer;
        if (timeEl) {
            timeEl.textContent =
                `${formatTime(nextClass.start_time)} – ${formatTime(nextClass.end_time)}`;
        }
        if (venueEl) venueEl.textContent = venue;

        const today = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
            [new Date().getDay()];

        const day = normalizeDay(nextClass.day_of_week);
        if (dayEl) {
            dayEl.textContent =
                day === today
                    ? 'Today'
                    : capitalize(day);
        }
    }

    function findNextClass(timetable) {
        const now = new Date();
        const todayIndex = now.getDay();

        const dayOrder = {
            monday: 1,
            tuesday: 2,
            wednesday: 3,
            thursday: 4,
            friday: 5
        };

        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const today = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][todayIndex];

        const valid = timetable.filter(item =>
            !item.is_holiday &&
            !item.cancelled &&
            dayOrder[normalizeDay(item.day_of_week)]
        );

        // Today's next class.
        const todayClasses = valid
            .filter(item =>
                normalizeDay(item.day_of_week) === today &&
                timeToMinutes(item.start_time) >= currentMinutes
            )
            .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));

        if (todayClasses.length) return todayClasses[0];

        // Next weekday.
        for (let offset = 1; offset <= 7; offset++) {
            const targetIndex = (todayIndex + offset) % 7;
            const targetDay = Object.keys(dayOrder).find(day => dayOrder[day] === targetIndex);

            if (!targetDay) continue;

            const classes = valid
                .filter(item => normalizeDay(item.day_of_week) === targetDay)
                .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));

            if (classes.length) return classes[0];
        }

        return null;
    }

    // ------------------------------------------------------------
    // RENDER TIMETABLE
    // ------------------------------------------------------------
    function renderTimetable(weekFilter = 'all') {
        const container = getEl('timetable-container');
        if (!container) return;

        let data = [...studentTimetableData];

        if (String(weekFilter) !== 'all') {
            data = data.filter(item =>
                String(item.week_number) === String(weekFilter)
            );
        }

        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        const dayNames = {
            monday: 'Monday',
            tuesday: 'Tuesday',
            wednesday: 'Wednesday',
            thursday: 'Thursday',
            friday: 'Friday'
        };

        const grouped = {};
        days.forEach(day => grouped[day] = []);

        data.forEach(item => {
            const day = normalizeDay(item.day_of_week);
            if (grouped[day]) grouped[day].push(item);
        });

        Object.keys(grouped).forEach(day => {
            grouped[day].sort((a, b) =>
                timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
            );
        });

        const totalVisible = data.length;

        if (!totalVisible) {
            container.innerHTML = `
                <div class="timetable-no-results">
                    <div class="timetable-no-results-icon">
                        <i class="far fa-calendar-times"></i>
                    </div>
                    <strong>No classes found</strong>
                    <span>There are no timetable entries for the selected week.</span>
                </div>
            `;
            return;
        }

        let html = `
            <div class="timetable-summary-row">
                <div>
                    <span class="summary-label">Showing</span>
                    <strong>${totalVisible} ${totalVisible === 1 ? 'class' : 'classes'}</strong>
                </div>
                <div class="summary-hint">
                    <i class="fas fa-circle-info"></i>
                    Tap a class for details
                </div>
            </div>

            <div class="timetable-scroll">
                <table class="timetable-modern">
                    <thead>
                        <tr>
                            <th>Day</th>
                            <th>Time</th>
                            <th>Course / Session</th>
                            <th>Lecturer</th>
                            <th>Venue</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        for (const day of days) {
            const classes = grouped[day];

            if (!classes.length) {
                html += `
                    <tr class="empty-day-row">
                        <td class="day-cell">${dayNames[day]}</td>
                        <td colspan="4">
                            <span class="no-class-text">No classes scheduled</span>
                        </td>
                    </tr>
                `;
                continue;
            }

            classes.forEach((item, index) => {
                const badges = [];

                if (item.is_exam) {
                    badges.push('<span class="tt-badge exam"><i class="fas fa-file-pen"></i> Exam</span>');
                }

                if (item.is_holiday) {
                    badges.push('<span class="tt-badge holiday"><i class="fas fa-umbrella-beach"></i> Holiday</span>');
                }

                if (item.pending_allocation) {
                    badges.push('<span class="tt-badge pending"><i class="fas fa-clock"></i> Pending</span>');
                }

                if (item.cancelled) {
                    badges.push('<span class="tt-badge cancelled"><i class="fas fa-ban"></i> Cancelled</span>');
                }

                const lecturer = item.lecturer_name || 'TBA';
                const venue = item.venue || 'TBD';
                const course = item.session_name || item.course_name || 'Class';

                html += `
                    <tr class="${item.cancelled ? 'is-cancelled' : ''}">
                        ${index === 0
                            ? `<td class="day-cell" rowspan="${classes.length}">
                                    <span class="day-name">${dayNames[day]}</span>
                                    <span class="day-short">${day.slice(0, 3).toUpperCase()}</span>
                               </td>`
                            : ''
                        }
                        <td class="time-cell">
                            <span>${escapeHtml(formatTime(item.start_time))}</span>
                            <small>${escapeHtml(formatTime(item.end_time))}</small>
                        </td>
                        <td class="course-cell">
                            <strong>${escapeHtml(course)}</strong>
                            ${badges.length ? `<div class="tt-badges">${badges.join('')}</div>` : ''}
                        </td>
                        <td class="detail-cell">
                            <i class="fas fa-user-tie"></i>
                            ${escapeHtml(lecturer)}
                        </td>
                        <td class="detail-cell">
                            <i class="fas fa-location-dot"></i>
                            ${escapeHtml(venue)}
                        </td>
                    </tr>
                `;
            });
        }

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;
    }

    // ------------------------------------------------------------
    // REFRESH
    // ------------------------------------------------------------
    async function refreshStudentTimetable() {
        timetableInitialized = false;

        const button = getEl('timetable-refresh-btn');
        if (button) {
            button.disabled = true;
            button.classList.add('is-loading');
        }

        try {
            return await initStudentTimetable({ force: true });
        } finally {
            if (button) {
                button.disabled = false;
                button.classList.remove('is-loading');
            }
        }
    }

    // ------------------------------------------------------------
    // TAB / APP DETECTION
    // ------------------------------------------------------------
    function timetableSectionVisible() {
        const section = document.querySelector(
            '.timetable-panel, [data-section="timetable"], #timetable-section'
        );

        if (!section) return false;

        const style = window.getComputedStyle(section);
        return style.display !== 'none' &&
               style.visibility !== 'hidden';
    }

    function startAutoInitialization() {
        // Attempt immediately if markup already exists.
        if (getEl('timetable-container')) {
            initStudentTimetable();
        }

        // IMPORTANT:
        // The student portal may load sections dynamically after DOMContentLoaded.
        // MutationObserver catches that situation.
        if (!observerStarted && document.body) {
            observerStarted = true;

            const observer = new MutationObserver(() => {
                if (getEl('timetable-container') && !timetableInitialized && !timetableLoading) {
                    initStudentTimetable();
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    }

    // Listen for app lifecycle events without depending on event order.
    document.addEventListener('DOMContentLoaded', startAutoInitialization);
    window.addEventListener('load', startAutoInitialization);

    document.addEventListener('appReady', () => {
        setTimeout(startAutoInitialization, 150);
    });

    // Initialize when timetable/calendar/student schedule tab is opened.
    document.addEventListener('click', event => {
        const target = event.target.closest(
            '[data-tab], [data-section], .sidebar-link, .nav-link, .menu-link'
        );

        if (!target) return;

        const value = normalize(
            target.dataset.tab ||
            target.dataset.section ||
            target.getAttribute('href') ||
            target.textContent
        );

        const looksLikeTimetable =
            value.includes('timetable') ||
            value.includes('calendar') ||
            value.includes('schedule') ||
            value.includes('academic');

        if (looksLikeTimetable) {
            setTimeout(() => initStudentTimetable({ force: true }), 250);
        }
    });

    // ------------------------------------------------------------
    // GLOBAL DEBUG / PUBLIC API
    // ------------------------------------------------------------
    window.initStudentTimetable = initStudentTimetable;
    window.refreshStudentTimetable = refreshStudentTimetable;

    window.forceRefreshTimetable = async function (blockName = null) {
        const client = getSupabase();
        const block = blockName || currentStudentBlock || window.currentUserProfile?.block;

        if (!client || !block) {
            console.error('❌ Cannot refresh timetable: Supabase or block missing.');
            return false;
        }

        try {
            timetableLoading = true;
            setState('loading');

            const timetable = await fetchTimetable(block);
            studentTimetableData = timetable;
            currentStudentBlock = block;

            const title = getEl('timetable-block-title');
            const count = getEl('class-count-display');

            if (title) title.textContent = block;
            if (count) count.textContent = `${timetable.length} ${timetable.length === 1 ? 'class' : 'classes'}`;

            updateWeekControls(timetable);
            renderTimetable('all');
            showNextClassWidget(timetable);

            setState(
                timetable.length ? 'ready' : 'empty',
                timetable.length ? '' : `No timetable has been published for ${block} yet.`
            );

            timetableInitialized = true;
            return true;

        } catch (error) {
            console.error('❌ Timetable refresh failed:', error);
            setState('error', error?.message || 'Unable to refresh timetable.');
            return false;

        } finally {
            timetableLoading = false;
        }
    };

    window.getStudentTimetableData = () => [...studentTimetableData];
    window.getCurrentStudentBlock = () => currentStudentBlock;

    console.log('✅ Student timetable module loaded - robust auto-init enabled');

})();
