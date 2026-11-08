// ============================================
// js/lecturer-dashboard.js - COMPLETE UPGRADED VERSION WITH TVET SUPPORT
// ============================================
// NCHSM Lecturer Dashboard Module
// Features: Metrics, Charts, Top Students, Alerts, Progress, Activity, 
// Clinical Hours, Early Warning System, Attendance Deep Dive, Auto-refresh
// Supports both Nursing (KRCHN) and TVET programs
// ============================================

const LecturerDashboard = {
    // ─── STATE ───
    metrics: {
        totalStudents: 0,
        totalCourses: 0,
        atRiskStudents: 0,
        pendingAttendance: 0,
        examsDue: 0,
        unreadMessages: 0,
        avgPerformance: 0
    },
    attendanceMetrics: {
        today: 0,
        week: 0,
        month: 0,
        overall: 0,
        present: 0,
        absent: 0,
        pending: 0,
        lectureCount: 0,
        clinicalCount: 0,
        labCount: 0,
        campusCount: 0,
        hospitalCount: 0
    },
    clinicalMetrics: {
        percent: 0,
        completed: 0,
        required: 1500,
        onTrack: 0,
        atRisk: 0,
        critical: 0
    },
    riskMetrics: {
        high: 0,
        medium: 0,
        low: 0,
        students: []
    },
    chartInstances: {
        performance: null,
        distribution: null,
        trend: null
    },
    lecturerAssignmentId: null,
    lecturerUuid: null,
    assignedUnits: [],
    assignedStudents: [],
    isRefreshing: false,
    refreshInterval: null,
    currentProgram: null,
    isTVET: false,
    _chartsLoading: false,
    _initialized: false,

    // Student-dashboard-inspired reliability layer
    CACHE_DURATION: 120000,
    cacheKey: null,
    _refreshInProgress: false,
    liveClockInterval: null,

    // ─── SHARED DASHBOARD RELIABILITY HELPERS ───
    getSupabaseClient() {
        const candidates = [
            window.lecturerDB?.supabase,
            window.sb,
            window.supabaseClient,
            window.db?.supabase,
            window.NCHSMLogin?.supabase,
            window.supabase
        ];

        return candidates.find(client =>
            client &&
            typeof client.from === 'function' &&
            client.auth &&
            typeof client.auth.getSession === 'function'
        ) || null;
    },

    async withTimeout(promise, timeoutMs = 12000, label = 'Dashboard request') {
        let timeoutId;
        try {
            return await Promise.race([
                Promise.resolve(promise),
                new Promise((_, reject) => {
                    timeoutId = setTimeout(() => reject(new Error(label + ' timed out after ' + timeoutMs + 'ms')), timeoutMs);
                })
            ]);
        } finally {
            if (timeoutId) clearTimeout(timeoutId);
        }
    },

    async runDashboardTask(task, timeoutMs = 10000, label = 'Dashboard section') {
        try {
            return await this.withTimeout(task(), timeoutMs, label);
        } catch (error) {
            console.warn('⚠️ ' + label + ' did not finish; continuing with the remaining dashboard sections:', error?.message || error);
            return null;
        }
    },

    async ensureSupabaseSession() {
        const client = this.getSupabaseClient();
        if (!client) throw new Error('Lecturer dashboard Supabase client is unavailable.');

        let lastError = null;
        for (let attempt = 0; attempt < 6; attempt++) {
            try {
                const result = await this.withTimeout(client.auth.getSession(), 8000, 'Supabase session check');
                if (result?.error) throw result.error;
                if (result?.data?.session?.user?.id) {
                    return { client, session: result.data.session };
                }
            } catch (error) {
                lastError = error;
            }
            await new Promise(resolve => setTimeout(resolve, 250));
        }

        throw lastError || new Error('No authenticated lecturer session is available.');
    },

    getKenyaNow() {
        return new Date(new Date().toLocaleString('en-US', {
            timeZone: 'Africa/Nairobi'
        }));
    },

    formatKenyaDate(date) {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-KE', {
            timeZone: 'Africa/Nairobi',
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    },

    formatKenyaTime(date, seconds = true) {
        return new Date(date || this.getKenyaNow()).toLocaleTimeString('en-KE', {
            timeZone: 'Africa/Nairobi',
            hour: '2-digit',
            minute: '2-digit',
            ...(seconds ? { second: '2-digit' } : {}),
            hour12: true
        });
    },

    updateTimeGreeting() {
        const now = this.getKenyaNow();
        const hour = now.getHours();

        let greeting = 'Good Morning';
        let emoji = '☀️';

        if (hour >= 12 && hour < 17) {
            greeting = 'Good Afternoon';
            emoji = '🌤️';
        } else if (hour >= 17 && hour < 21) {
            greeting = 'Good Evening';
            emoji = '🌅';
        } else if (hour >= 21 || hour < 5) {
            greeting = 'Good Night';
            emoji = '🌙';
        }

        const greetingEl = document.getElementById('lecturerGreetingText');
        const emojiEl = document.getElementById('lecturerGreetingEmoji');
        const daypartEl = document.getElementById('nrdDaypart');
        const clockEl = document.getElementById('nrdClock');
        const dateEl = document.getElementById('currentDateTime');
        const nameEl = document.getElementById('lecturerHeroName');

        if (greetingEl) greetingEl.textContent = greeting;
        if (emojiEl) emojiEl.textContent = '👋';
        if (daypartEl) daypartEl.textContent = emoji;
        if (clockEl) clockEl.textContent = this.formatKenyaTime(now, false);
        if (dateEl) {
            dateEl.textContent = now.toLocaleDateString('en-KE', {
                timeZone: 'Africa/Nairobi',
                weekday: 'long',
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        }

        const profile = window.lecturerDB?.getCurrentUserProfile?.();
        if (nameEl && profile?.full_name) nameEl.textContent = profile.full_name;

        return { greeting, emoji, now };
    },

    setCacheKey() {
        const profile = window.lecturerDB?.getCurrentUserProfile?.();
        const userId = profile?.user_id || this.lecturerUuid || this.lecturerAssignmentId;
        if (userId) this.cacheKey = `lecturer_dashboard_${userId}`;
        return this.cacheKey;
    },

    loadCachedSnapshot() {
        this.setCacheKey();
        if (!this.cacheKey) return false;

        try {
            const cached = localStorage.getItem(this.cacheKey);
            if (!cached) return false;

            const parsed = JSON.parse(cached);
            if (!parsed?.data || Date.now() - parsed.timestamp >= this.CACHE_DURATION) {
                return false;
            }

            if (parsed.data.metrics) this.metrics = { ...this.metrics, ...parsed.data.metrics };
            if (parsed.data.attendanceMetrics) this.attendanceMetrics = { ...this.attendanceMetrics, ...parsed.data.attendanceMetrics };
            if (parsed.data.clinicalMetrics) this.clinicalMetrics = { ...this.clinicalMetrics, ...parsed.data.clinicalMetrics };
            if (parsed.data.riskMetrics) this.riskMetrics = { ...this.riskMetrics, ...parsed.data.riskMetrics };
            if (Array.isArray(parsed.data.assignedUnits)) this.assignedUnits = parsed.data.assignedUnits;
            if (Array.isArray(parsed.data.assignedStudents)) this.assignedStudents = parsed.data.assignedStudents;

            this.updateMetricCards();
            this.updateAttendanceMetricsUI();
            this.updateClinicalUI(
                this.clinicalMetrics.percent,
                this.clinicalMetrics.completed,
                this.clinicalMetrics.onTrack,
                this.clinicalMetrics.atRisk,
                this.clinicalMetrics.critical
            );
            this.updateRiskUI();
            this.updateWelcomeBanner();
            this.loadQuickStats();

            console.log('ℹ️ Showing cached lecturer dashboard values while fresh data loads...');
            return true;
        } catch (error) {
            console.warn('⚠️ Ignoring invalid lecturer dashboard cache:', error);
            return false;
        }
    },

    saveToCache() {
        this.setCacheKey();
        if (!this.cacheKey) return;

        try {
            localStorage.setItem(this.cacheKey, JSON.stringify({
                timestamp: Date.now(),
                data: {
                    metrics: this.metrics,
                    attendanceMetrics: this.attendanceMetrics,
                    clinicalMetrics: this.clinicalMetrics,
                    riskMetrics: this.riskMetrics,
                    assignedUnits: this.assignedUnits,
                    assignedStudents: this.assignedStudents
                }
            }));
        } catch (error) {
            console.debug('Lecturer dashboard cache save skipped:', error.message);
        }
    },

    clearCache() {
        this.setCacheKey();
        if (this.cacheKey) localStorage.removeItem(this.cacheKey);
    },

    // ─── GET CURRENT PROGRAM ───
    getCurrentProgram() {
        try {
            const normalize = value => String(value || '').trim();
            const profile = window.lecturerDB?.getCurrentUserProfile?.() || {};

            if (window.CURRENT_PROGRAM) {
                this.currentProgram = normalize(window.CURRENT_PROGRAM);
                this.isTVET = window.IS_TVET === true;
            } else if (profile.program) {
                this.currentProgram = normalize(profile.program);
                this.isTVET = this.currentProgram.toUpperCase() !== 'KRCHN';
            } else if (this.currentProgram && this.currentProgram.toUpperCase() !== 'NURSING') {
                // Keep the programme already resolved from the authenticated staff record.
                this.isTVET = this.currentProgram.toUpperCase() !== 'KRCHN';
            } else {
                const department = normalize(profile.department).toLowerCase();
                const stored = normalize(localStorage.getItem('lecturerProgram'));
                if (department === 'nursing' || department.includes('nursing')) {
                    this.currentProgram = 'KRCHN';
                    this.isTVET = false;
                } else if (stored && stored.toUpperCase() !== 'NURSING') {
                    this.currentProgram = stored;
                    this.isTVET = this.currentProgram.toUpperCase() !== 'KRCHN';
                } else if (department.includes('tvet')) {
                    this.currentProgram = stored || 'TVET';
                    this.isTVET = true;
                } else {
                    this.currentProgram = 'KRCHN';
                    this.isTVET = false;
                }
            }

            localStorage.setItem('lecturerProgram', this.currentProgram);
            localStorage.setItem('isTVET', JSON.stringify(this.isTVET));
            return this.currentProgram;
        } catch (error) {
            console.warn('[Lecturer Dashboard] Programme resolution failed:', error);
            this.currentProgram = 'KRCHN';
            this.isTVET = false;
            return 'KRCHN';
        }
    },

    // ─── GET PASSING THRESHOLD ───
    getPassingThreshold() {
        return this.isTVET ? 50 : 60;
    },

    // ─── GET GRADE FOR SCORE ───
    getGrade(score) {
        if (this.isTVET) {
            if (score >= 80) return { grade: 'A', points: 4.0, remarks: 'MASTERY', color: '#065f46' };
            if (score >= 65) return { grade: 'B', points: 3.0, remarks: 'PROFICIENT', color: '#1e40af' };
            if (score >= 50) return { grade: 'C', points: 2.0, remarks: 'COMPETENT', color: '#92400e' };
            return { grade: 'E', points: 0.0, remarks: 'NOT YET COMPETENT', color: '#991b1b' };
        } else {
            if (score >= 75) return { grade: 'A', points: 4.0, remarks: 'Distinction', color: '#065f46' };
            if (score >= 65) return { grade: 'B', points: 3.0, remarks: 'Credit', color: '#1e40af' };
            if (score >= 60) return { grade: 'C', points: 2.0, remarks: 'Pass', color: '#92400e' };
            return { grade: 'D', points: 0.0, remarks: 'Fail', color: '#991b1b' };
        }
    },

    // ─── GET GRADING REFERENCE ───
    getGradingReference() {
        if (this.isTVET) {
            return {
                name: 'TVET Competency-Based Grading',
                icon: '🔧',
                color: '#8b5cf6',
                passingScore: 50,
                grades: [
                    { grade: 'A', range: '80-100%', points: 4.0, remarks: 'MASTERY' },
                    { grade: 'B', range: '65-79%', points: 3.0, remarks: 'PROFICIENT' },
                    { grade: 'C', range: '50-64%', points: 2.0, remarks: 'COMPETENT' },
                    { grade: 'E', range: '0-49%', points: 0.0, remarks: 'NOT YET COMPETENT' }
                ]
            };
        } else {
            return {
                name: 'Nursing Grading System',
                icon: '🎓',
                color: '#4C1D95',
                passingScore: 60,
                grades: [
                    { grade: 'A', range: '75-100%', points: 4.0, remarks: 'Distinction' },
                    { grade: 'B', range: '65-74%', points: 3.0, remarks: 'Credit' },
                    { grade: 'C', range: '60-64%', points: 2.0, remarks: 'Pass' },
                    { grade: 'D', range: '0-59%', points: 0.0, remarks: 'Fail' }
                ]
            };
        }
    },

    // ─── NEXT CLASS / NEXT EXAM (STUDENT DASHBOARD-STYLE LOGIC) ───
    normalizePersonName(value) {
        return String(value || '')
            .toLowerCase()
            .replace(/\b(mr|mrs|ms|miss|dr|prof|madam|md|sir)\.?\b/g, ' ')
            .replace(/[^a-z0-9]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    },

    lecturerNameMatches(a, b) {
        const left = this.normalizePersonName(a);
        const right = this.normalizePersonName(b);
        if (!left || !right) return false;
        if (left === right || left.includes(right) || right.includes(left)) return true;

        const leftTokens = new Set(left.split(' ').filter(Boolean));
        const rightTokens = new Set(right.split(' ').filter(Boolean));
        const shared = [...leftTokens].filter(token => rightTokens.has(token));
        const meaningfulLeft = [...leftTokens].filter(t => t.length > 2);
        const meaningfulRight = [...rightTokens].filter(t => t.length > 2);

        // Handles records such as "Mr. Kevin Matoka" vs "Kevin matoka Tiong'i".
        return shared.length >= 2 ||
            (meaningfulLeft.length === 1 && meaningfulRight.includes(meaningfulLeft[0]));
    },

    normalizeUnitName(value) {
        return String(value || '')
            .toLowerCase()
            .replace(/&/g, ' and ')
            .replace(/[^a-z0-9]+/g, ' ')
            .replace(/\b(ii|iii|iv|v|vi|i)\b/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    },

    unitNamesMatch(a, b) {
        const left = this.normalizeUnitName(a);
        const right = this.normalizeUnitName(b);
        if (!left || !right) return false;
        if (left === right || left.includes(right) || right.includes(left)) return true;

        const leftTokens = left.split(' ').filter(t => t.length > 2);
        const rightTokens = new Set(right.split(' ').filter(t => t.length > 2));
        const shared = leftTokens.filter(t => rightTokens.has(t));
        const ratio = shared.length / Math.max(1, Math.min(leftTokens.length, rightTokens.size));
        return shared.length >= 2 && ratio >= 0.6;
    },

    async loadNextClassAndExam() {
        const supabase = this.getSupabaseClient();
        if (!supabase) return;

        const profile = window.lecturerDB?.getCurrentUserProfile?.() || {};
        const lecturerName = profile.full_name || profile.name || '';
        const program = this.getCurrentProgram();
        const now = this.getKenyaNow();

        // ------------------------------------------------------------
        // NEXT CLASS — same future-date/time selection as Student Dashboard,
        // but scoped to this lecturer's timetable records.
        // ------------------------------------------------------------
        try {
            const todayDate = now.toISOString().split('T')[0];
            const { data: timetableRows, error } = await supabase
                .from('timetables')
                .select('*')
                .eq('program', program)
                .gte('class_date', todayDate)
                .order('class_date', { ascending: true })
                .order('start_time', { ascending: true });

            if (error) throw error;

            const lecturerClasses = (timetableRows || []).filter(row =>
                !row.is_holiday &&
                !row.is_self_study &&
                !row.is_exam &&
                this.lecturerNameMatches(row.lecturer_name, lecturerName)
            );

            let nextClass = null;
            for (const cls of lecturerClasses) {
                if (!cls.class_date || !cls.start_time) continue;
                const classDateTime = new Date(`${cls.class_date}T${cls.start_time}`);
                if (classDateTime > now) {
                    nextClass = cls;
                    break;
                }
            }

            const timeEl = document.getElementById('nrdNextClassTime');
            const durationEl = document.getElementById('nrdNextClassDuration');
            const nameEl = document.getElementById('nrdNextClassName');
            const unitEl = document.getElementById('nrdNextClassUnit');
            const venueEl = document.getElementById('nrdNextClassVenue');
            const lecturerEl = document.getElementById('nrdNextClassLecturer');

            if (!nextClass) {
                if (timeEl) timeEl.innerHTML = '--:--';
                if (durationEl) durationEl.textContent = 'No upcoming class';
                if (nameEl) nameEl.textContent = 'No Upcoming Class';
                if (unitEl) unitEl.textContent = 'Check your timetable for the latest schedule.';
                if (venueEl) venueEl.textContent = '—';
                if (lecturerEl) lecturerEl.textContent = '—';
            } else {
                const classDate = new Date(`${nextClass.class_date}T00:00:00`);
                const isToday = classDate.toDateString() === now.toDateString();
                const startTime = String(nextClass.start_time || '').substring(0, 5) || 'TBA';
                const endTime = String(nextClass.end_time || '').substring(0, 5) || 'TBA';
                const dateLabel = isToday ? 'TODAY' : this.formatKenyaDate(classDate);

                if (timeEl) timeEl.innerHTML = `${startTime}<span class="nrd-next-class-end-time">${endTime}</span>`;
                if (durationEl) durationEl.textContent = `${dateLabel}`;
                if (nameEl) nameEl.textContent = nextClass.session_name || nextClass.course_name || 'Scheduled Class';
                if (unitEl) unitEl.textContent = nextClass.course_name || nextClass.session_name || nextClass.block || 'Scheduled teaching session';
                if (venueEl) venueEl.textContent = nextClass.venue || 'Venue TBA';
                if (lecturerEl) lecturerEl.textContent = nextClass.lecturer_name || 'TBA';
            }
        } catch (error) {
            console.error('❌ Next class query failed:', error);
            const nameEl = document.getElementById('nrdNextClassName');
            const unitEl = document.getElementById('nrdNextClassUnit');
            if (nameEl) nameEl.textContent = 'Unable to load next class';
            if (unitEl) unitEl.textContent = 'Open the schedule for details.';
        }

        // ------------------------------------------------------------
        // NEXT EXAM — use the real `exams` table and scope it to the
        // lecturer's assigned units/classes. No cats_exams dependency.
        // ------------------------------------------------------------
        try {
            const assignedUnits = Array.isArray(this.assignedUnits) ? this.assignedUnits : [];
            const assignedNames = assignedUnits.map(u => u.subject_name).filter(Boolean);
            const assignedBlocks = new Set(
                assignedUnits.map(u => String(u.block || '').trim().toLowerCase()).filter(Boolean)
            );

            const { data: exams, error } = await supabase
                .from('exams')
                .select('*')
                .eq('target_program', program)
                .eq('is_active', true)
                .in('status', ['Scheduled', 'scheduled', 'Upcoming', 'upcoming', 'Published', 'published'])
                .order('exam_date', { ascending: true })
                .order('exam_start_time', { ascending: true });

            if (error) throw error;

            const futureExams = (exams || []).filter(exam => {
                if (!exam.exam_date) return false;

                const block = String(exam.block || exam.block_term || '').trim().toLowerCase();
                if (assignedBlocks.size && block && !assignedBlocks.has(block)) return false;

                // Prefer unit-name matching. This accommodates exams where
                // course_id is populated as well as legacy rows using names/codes.
                const examText = [exam.exam_name, exam.title, exam.course_code].filter(Boolean).join(' ');
                const unitMatch = assignedNames.some(name => this.unitNamesMatch(name, examText));
                if (!unitMatch) return false;

                const time = exam.exam_start_time || (exam.start_time ? new Date(exam.start_time).toTimeString().slice(0, 8) : '00:00:00');
                const examDateTime = new Date(`${exam.exam_date}T${time}`);
                return examDateTime > now;
            }).sort((a, b) => {
                const timeA = a.exam_start_time || (a.start_time ? new Date(a.start_time).toTimeString().slice(0, 8) : '00:00:00');
                const timeB = b.exam_start_time || (b.start_time ? new Date(b.start_time).toTimeString().slice(0, 8) : '00:00:00');
                return new Date(`${a.exam_date}T${timeA}`) - new Date(`${b.exam_date}T${timeB}`);
            });

            const exam = futureExams[0] || null;
            const nameEl = document.getElementById('nrdNextExamName');
            const metaEl = document.getElementById('nrdNextExamMeta');

            if (!exam) {
                if (nameEl) nameEl.textContent = 'No upcoming exam';
                if (metaEl) metaEl.textContent = assignedNames.length
                    ? 'No upcoming exam found for your assigned units.'
                    : 'No assigned units available for exam matching.';
                this.metrics.nextExam = null;
            } else {
                const examTime = exam.exam_start_time || (exam.start_time ? new Date(exam.start_time).toTimeString().slice(0, 5) : 'TBA');
                const examDate = new Date(`${exam.exam_date}T00:00:00`);
                const type = exam.exam_type || 'EXAM';
                const title = exam.exam_name || exam.title || exam.course_code || 'Scheduled Exam';
                const block = exam.block || exam.block_term || '';

                if (nameEl) nameEl.textContent = title;
                if (metaEl) metaEl.textContent = `${type} • ${this.formatKenyaDate(examDate)} • ${examTime.substring(0, 5)}${block ? ` • ${block}` : ''}`;
                this.metrics.nextExam = exam;
            }
        } catch (error) {
            console.error('❌ Next exam query failed:', error);
            const nameEl = document.getElementById('nrdNextExamName');
            const metaEl = document.getElementById('nrdNextExamMeta');
            if (nameEl) nameEl.textContent = 'Unable to load exam';
            if (metaEl) metaEl.textContent = 'Open Exams / CATS for the latest schedule.';
        }
    },

    // ─── INIT ───
    async init() {
        // Avoid overlapping bootstraps from duplicate tab/orchestrator handlers.
        if (this._initialized || this._initializing) {
            console.debug('Lecturer dashboard init skipped: already initialized or in progress.');
            return;
        }
        this._initializing = true;
        console.log('📊 Initializing Lecturer Dashboard...');
        const program = this.getCurrentProgram();
        const typeLabel = this.isTVET ? 'TVET' : 'Nursing';
        console.log(`📚 Current Program: ${program} (${typeLabel})`);

        try {
            this.setCacheKey();
            this.loadCachedSnapshot();
            this.updateTimeGreeting();

            // Wait for the same authenticated session layer used by the
            // student dashboard before making lecturer data requests.
            await this.withTimeout(this.ensureSupabaseSession(), 10000, 'Lecturer session initialization');

            // Dashboard's DOMContentLoaded timer may fire before lecturer-main
            // hydrates the signed-in profile. Wait briefly instead of treating
            // an empty profile as a successfully initialized dashboard.
            let profile = window.lecturerDB?.getCurrentUserProfile?.();
            const profileWaitStarted = Date.now();
            while (!profile && Date.now() - profileWaitStarted < 8000) {
                await new Promise(resolve => setTimeout(resolve, 200));
                profile = window.lecturerDB?.getCurrentUserProfile?.();
            }
            if (!profile) throw new Error('Lecturer profile was not ready after authentication.');

            await this.withTimeout(this.resolveLecturerId(), 8000, 'Lecturer profile resolution');
            await this.withTimeout(this.loadAssignedUnits(), 8000, 'Assigned units loading');
            await this.runDashboardTask(() => this.loadNextClassAndExam(), 8000, 'Next class and exam loading');
            await this.withTimeout(this.loadAssignedStudents(), 10000, 'Assigned students loading');

            // Independent dashboard sections load together after the core
            // lecturer assignments are ready, reducing serial wait time.
            this.updateWelcomeBanner();
            this.loadQuickStats();
            await Promise.all([
                this.runDashboardTask(() => this.loadMetrics(), 8000, 'Dashboard metrics loading'),
                this.runDashboardTask(() => this.loadAttendanceMetrics(), 8000, 'Attendance metrics loading'),
                this.runDashboardTask(() => this.loadClinicalHours(), 8000, 'Clinical hours loading'),
                this.runDashboardTask(() => this.loadRiskData(), 8000, 'Student risk data loading'),
                this.runDashboardTask(() => this.loadCourseProgress(), 8000, 'Course progress loading'),
                this.runDashboardTask(() => this.loadTopStudents(), 8000, 'Top students loading'),
                this.runDashboardTask(() => this.loadAttendanceAlerts(), 8000, 'Attendance alerts loading'),
                this.runDashboardTask(() => this.loadIntelligentAlerts(), 8000, 'Intelligent alerts loading'),
                this.runDashboardTask(() => this.loadRecentActivity(), 8000, 'Recent activity loading'),
                this.runDashboardTask(() => this.loadCharts(), 8000, 'Dashboard charts loading')
            ]);
            await this.runDashboardTask(() => this.loadWorkloadInsights(), 12000, 'Workload insights loading');
            this.setupEventListeners();
        if (this.liveClockInterval) clearInterval(this.liveClockInterval);
        this.liveClockInterval = setInterval(() => {
            const now = new Date();
            const hour = now.getHours();
            let greeting = 'Good Morning', icon = '🌅';
            if (hour >= 12 && hour < 17) { greeting = 'Good Afternoon'; icon = '☀️'; }
            else if (hour >= 17 && hour < 21) { greeting = 'Good Evening'; icon = '🌆'; }
            else if (hour >= 21 || hour < 5) { greeting = 'Good Night'; icon = '🌙'; }
            const g = document.getElementById('lecturerGreetingText');
            const e = document.getElementById('lecturerGreetingEmoji');
            const c = document.getElementById('nrdClock');
            const d = document.getElementById('nrdDaypart');
            if (g) g.textContent = greeting;
            if (e) e.textContent = icon;
            if (d) d.textContent = icon;
            if (c) c.textContent = now.toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'});
        }, 30000);
            this.startAutoRefresh();
            this.updateLastUpdated();
            this.updateProgramBadge();
            this.updateDashboardGradingInfo();
            this.updateTimeGreeting();
            this.saveToCache();
            this._initialized = true;
            console.log('✅ Lecturer Dashboard initialized');
            console.log(`📚 ${this.assignedUnits.length} assigned units`);
            console.log(`👨‍🎓 ${this.assignedStudents.length} assigned students`);
            console.log(`🎯 Program: ${this.currentProgram} (${typeLabel})`);
            console.log(`📊 Grading: ${this.isTVET ? 'TVET (Pass: 50%)' : 'Nursing (Pass: 60%)'}`);
        } catch (error) {
            console.error('❌ Dashboard initialization error:', error);
        } finally {
            // Let a later attempt recover from a failed initialization.
            this._initializing = false;
        }
    },

    // ─── UPDATE DASHBOARD GRADING INFO ───
    updateDashboardGradingInfo() {
        const gradingInfo = document.getElementById('gradingSystemInfo');
        if (gradingInfo) {
            if (this.isTVET) {
                gradingInfo.innerHTML = `
                    <span style="background: #8b5cf6; color: white; padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 600;">
                        🔧 TVET Grading: A(80%) B(65%) C(50%) E(0%)
                    </span>
                `;
                gradingInfo.style.display = 'inline-block';
            } else {
                gradingInfo.innerHTML = `
                    <span style="background: #4C1D95; color: white; padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 600;">
                        🎓 Nursing Grading: A(75%) B(65%) C(60%) D(0%)
                    </span>
                `;
                gradingInfo.style.display = 'inline-block';
            }
        }

        const thresholdDisplay = document.getElementById('passingThresholdDisplay');
        if (thresholdDisplay) {
            const threshold = this.getPassingThreshold();
            thresholdDisplay.textContent = `Passing: ≥${threshold}%`;
        }
    },

    // ─── UPDATE PROGRAM BADGE ───
    updateProgramBadge() {
        const program = this.getCurrentProgram();
        const typeLabel = this.isTVET ? 'TVET' : 'Nursing';
        const emoji = this.isTVET ? '🔧' : '🎓';
        const displayText = `${emoji} ${program} (${typeLabel})`;

        const badge = document.getElementById('userProgramBadge');
        if (badge) {
            badge.textContent = displayText;
            badge.style.background = this.isTVET ? 'rgba(139,92,246,0.3)' : 'rgba(76,29,149,0.3)';
            badge.style.border = this.isTVET ? '1px solid #8b5cf6' : '1px solid #4C1D95';
        }

        const programDisplay = document.getElementById('programDisplayName');
        if (programDisplay) {
            programDisplay.textContent = `${program} (${typeLabel})`;
        }

        const subtitle = document.getElementById('programSubtitle');
        if (subtitle) {
            subtitle.textContent = `${emoji} Program: ${program} (${typeLabel})`;
        }

        const programBadge = document.querySelector('.program-badge');
        if (programBadge) {
            programBadge.textContent = displayText;
            programBadge.style.background = this.isTVET ? '#8b5cf6' : '#4C1D95';
        }

        const programTypeBadge = document.getElementById('programTypeBadge');
        if (programTypeBadge) {
            programTypeBadge.textContent = typeLabel;
            programTypeBadge.style.background = this.isTVET ? 'rgba(139,92,246,0.3)' : 'rgba(76,29,149,0.3)';
        }

        window.lecturerProgram = program;
        window.IS_TVET = this.isTVET;
        localStorage.setItem('lecturerProgram', program);
        localStorage.setItem('isTVET', JSON.stringify(this.isTVET));
    },

    // ─── RESOLVE LECTURER ID ───
    // lecturer_subject_assignments.lecturer_id references staff_records.id,
    // not auth.uid() and not consolidated_user_profiles_table.staff_id.
    async resolveLecturerId() {
        try {
            const supabase = this.getSupabaseClient();
            if (!supabase) throw new Error('Supabase client is unavailable.');

            const profile = window.lecturerDB?.getCurrentUserProfile() || {};
            let email = String(profile.email || profile.email_address || window.currentUser?.email || '').trim();

            if (!email && supabase.auth?.getUser) {
                const { data: { user }, error } = await supabase.auth.getUser();
                if (error) throw error;
                email = String(user?.email || '').trim();
            }
            if (!email) throw new Error('Could not resolve the authenticated lecturer email.');

            const { data: staff, error: staffError } = await supabase
                .from('staff_records')
                .select('id, first_name, other_names, email, program, department')
                .ilike('email', email)
                .maybeSingle();

            if (staffError) throw staffError;
            if (!staff?.id) throw new Error('No staff record matches the signed-in lecturer email.');

            this.lecturerUuid = window.currentUser?.id || profile.user_id || null;
            this.lecturerAssignmentId = String(staff.id);
            if (staff.program) {
                this.currentProgram = String(staff.program).trim();
                this.isTVET = this.currentProgram.toUpperCase() !== 'KRCHN';
            } else if (String(staff.department || '').toLowerCase().includes('nursing')) {
                this.currentProgram = 'KRCHN';
                this.isTVET = false;
            }
            window.CORRECT_LECTURER_ID = String(staff.id);
            console.log('[Lecturer Dashboard] Resolved staff-record assignment ID:', this.lecturerAssignmentId);
            return this.lecturerAssignmentId;
        } catch (error) {
            console.error('[Lecturer Dashboard] Lecturer identity resolution failed:', error);
            this.lecturerAssignmentId = null;
            return null;
        }
    },

    // ─── LOAD ASSIGNED UNITS ───
    async loadAssignedUnits() {
        try {
            const supabase = this.getSupabaseClient();
            if (!supabase) throw new Error('Supabase client is unavailable.');

            const lecturerId = String(this.lecturerAssignmentId || await this.resolveLecturerId() || '').trim();
            if (!lecturerId) throw new Error('Lecturer staff-record ID could not be resolved.');

            const { data: assignments, error } = await supabase
                .from('lecturer_subject_assignments')
                .select('id, subject_name, subject_code, block, program, academic_year, lecturer_id')
                .eq('lecturer_id', lecturerId);

            if (error) throw error;

            const normalize = value => String(value || '').trim().toLowerCase();
            const program = normalize(this.getCurrentProgram());
            const ownRows = (assignments || []).filter(row =>
                String(row.lecturer_id || '') === lecturerId &&
                (!program || normalize(row.program) === program)
            );
            const uniqueUnits = new Map();
            ownRows.forEach(unit => {
                const key = normalize(unit.subject_code || unit.subject_name) + '|' + normalize(unit.block);
                if (!uniqueUnits.has(key)) uniqueUnits.set(key, unit);
            });
            this.assignedUnits = [...uniqueUnits.values()];

            console.log('[Lecturer Dashboard] Loaded assigned units:', this.assignedUnits.length, {
                lecturerId, program: this.getCurrentProgram()
            });
        } catch (error) {
            console.error('[Lecturer Dashboard] Failed to load assigned units:', error);
            this.assignedUnits = [];
        }
    },

    // ─── LOAD ASSIGNED STUDENTS ───
    async loadAssignedStudents() {
        try {
            const supabase = this.getSupabaseClient();
            if (!supabase) throw new Error('Supabase client is unavailable.');

            const program = this.getCurrentProgram();
            const normalize = value => String(value || '').trim().toLowerCase();
            const assignedUnitKeys = new Set(this.assignedUnits.map(unit =>
                normalize(unit.subject_name) + '|' + normalize(unit.block)
            ).filter(key => key !== '|'));

            // A lecturer with no assigned units must not be shown the whole programme.
            if (assignedUnitKeys.size === 0) {
                this.assignedStudents = [];
                this.metrics.totalStudents = 0;
                this.updateMetricCards();
                return;
            }

            const unitNames = [...new Set(this.assignedUnits
                .map(unit => String(unit.subject_name || '').trim())
                .filter(Boolean))];

            const { data: registrationRows, error: enrollError } = await supabase
                .from('student_unit_registrations')
                .select('student_id, unit_name, block, status, program')
                .in('unit_name', unitNames)
                .eq('program', program)
                .in('status', ['approved', 'completed']);

            if (enrollError) throw enrollError;

            // Match both unit AND block: the same unit can be taught in several blocks.
            const enrollments = (registrationRows || []).filter(enrollment =>
                assignedUnitKeys.has(normalize(enrollment.unit_name) + '|' + normalize(enrollment.block))
            );

            const studentIds = [...new Set(enrollments
                .map(enrollment => String(enrollment.student_id || '').trim())
                .filter(Boolean))];

            if (studentIds.length === 0) {
                this.assignedStudents = [];
                this.metrics.totalStudents = 0;
                this.updateMetricCards();
                console.log('No approved registrations found for lecturer-assigned units/blocks.');
                return;
            }

            // student_unit_registrations.student_id is UUID and maps directly
            // to consolidated_user_profiles_table.user_id (also UUID).
            // Do not query the legacy varchar student_id column with UUID values.
            const { data: studentProfiles, error: profileError } = await supabase
                .from('consolidated_user_profiles_table')
                .select('user_id, student_id, full_name, program, block, intake_year, email, phone, gender')
                .in('user_id', studentIds)
                .eq('role', 'student')
                .eq('program', program);

            if (profileError) throw profileError;

            const profileMap = new Map();
            (studentProfiles || []).forEach(student => {
                if (student.user_id) profileMap.set(String(student.user_id), student);
            });

            const enrollmentMap = new Map();
            enrollments.forEach(enrollment => {
                const id = String(enrollment.student_id || '').trim();
                const student = profileMap.get(id);
                if (!student) return;

                const canonicalId = String(student.user_id || student.student_id || id);
                if (!enrollmentMap.has(canonicalId)) enrollmentMap.set(canonicalId, new Set());
                enrollmentMap.get(canonicalId).add(String(enrollment.unit_name || '').trim());
            });

            this.assignedStudents = [...enrollmentMap.entries()]
                .map(([id, units]) => {
                    const student = profileMap.get(id);
                    return student ? {
                        ...student,
                        units_enrolled: [...units],
                        unit_count: units.size
                    } : null;
                })
                .filter(Boolean)
                .sort((a, b) => String(a.full_name || '').localeCompare(String(b.full_name || '')));

            // One student is counted once, even when enrolled in several assigned units.
            this.metrics.totalStudents = this.assignedStudents.length;
            this.updateMetricCards();
            console.log(`👨‍🎓 Loaded ${this.assignedStudents.length} unique assigned students for program ${program}`);
        } catch (error) {
            console.error('Failed to load assigned students:', error);
            this.assignedStudents = [];
            // Do not silently turn a failed database request into a valid-looking zero.
            this.metrics.totalStudents = null;
            this.updateMetricCards();
        }
    },

    // ─── LOAD METRICS ───
    async loadMetrics() {
        const supabase = this.getSupabaseClient();
        const students = Array.isArray(this.assignedStudents) ? this.assignedStudents : [];
        const units = Array.isArray(this.assignedUnits) ? this.assignedUnits : [];
        const program = this.getCurrentProgram();
        const studentIds = [...new Set(students.map(s => String(s.user_id || '').trim()).filter(Boolean))];
        const unitNames = [...new Set(units.map(u => String(u.subject_name || '').trim()).filter(Boolean))];
        const unitKeys = new Set(units.map(u =>
            String(u.subject_name || '').trim().toLowerCase() + '|' + String(u.block || '').trim().toLowerCase()
        ));
        const normalize = value => String(value || '').trim().toLowerCase();

        this.metrics.totalStudents = students.length;
        this.metrics.totalCourses = units.length;
        this.metrics.atRiskStudents = null;
        this.metrics.pendingAttendance = null;
        this.metrics.examsDue = null;
        this.metrics.avgPerformance = null;

        if (!supabase) {
            console.error('[Lecturer Dashboard] Metrics: Supabase client unavailable.');
            this.updateMetricCards();
            return;
        }

        if (!studentIds.length || !unitNames.length) {
            this.metrics.atRiskStudents = 0;
            this.metrics.pendingAttendance = 0;
            this.metrics.examsDue = 0;
            this.metrics.avgPerformance = 0;
            this.updateMetricCards();
            return;
        }

        // Attendance-based risk: count distinct students with more than five
        // recorded absences in their own assigned units.
        try {
            const { data, error } = await supabase
                .from('geo_attendance_logs')
                .select('student_id, unit_name, block, attendance_status, status')
                .in('student_id', studentIds)
                .in('unit_name', unitNames)
                .eq('program', program);
            if (error) throw error;

            const absenceCounts = new Map();
            (data || []).forEach(log => {
                const key = normalize(log.unit_name) + '|' + normalize(log.block);
                if (!unitKeys.has(key)) return;
                const status = normalize(log.attendance_status || log.status);
                if (status === 'absent') {
                    const id = String(log.student_id || '').trim();
                    absenceCounts.set(id, (absenceCounts.get(id) || 0) + 1);
                }
            });
            this.metrics.atRiskStudents = [...absenceCounts.values()].filter(count => count > 5).length;
        } catch (error) {
            console.warn('[Lecturer Dashboard] At-risk attendance metric failed:', error);
            this.metrics.atRiskStudents = null;
        }

        // Pending attendance counts only explicit pending records for today;
        // it does not assume every student has a class every day.
        try {
            const now = new Date();
            const localDate = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
            const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

            const { data, error } = await supabase
                .from('geo_attendance_logs')
                .select('student_id, unit_name, block, attendance_status, status, check_in_time')
                .in('student_id', studentIds)
                .in('unit_name', unitNames)
                .eq('program', program)
                .gte('check_in_time', startOfDay)
                .lt('check_in_time', endOfDay);
            if (error) throw error;

            const pendingIds = new Set();
            (data || []).forEach(log => {
                const key = normalize(log.unit_name) + '|' + normalize(log.block);
                const status = normalize(log.attendance_status || log.status);
                if (unitKeys.has(key) && status === 'pending') pendingIds.add(String(log.student_id));
            });
            this.metrics.pendingAttendance = pendingIds.size;
            console.debug('[Lecturer Dashboard] Pending attendance date:', localDate, pendingIds.size);
        } catch (error) {
            console.warn('[Lecturer Dashboard] Pending attendance metric failed:', error);
            this.metrics.pendingAttendance = null;
        }

        // Exams due: only published/scheduled exams belonging to this lecturer's
        // assigned units and blocks, with an exam date today or in the future.
        try {
            const today = new Date();
            const localToday = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
            const { data, error } = await supabase
                .from('exams')
                .select('id, title, exam_name, course_name, course_code, block, target_program, status, exam_date, is_published')
                .eq('target_program', program)
                .gte('exam_date', localToday);
            if (error) throw error;

            const activeStatuses = new Set(['published', 'upcoming', 'scheduled']);
            this.metrics.examsDue = (data || []).filter(exam => {
                const examName = normalize(exam.course_name || exam.exam_name || exam.title);
                const key = examName + '|' + normalize(exam.block);
                const isAssigned = unitKeys.has(key);
                const isActive = activeStatuses.has(normalize(exam.status)) || exam.is_published === true;
                return isAssigned && isActive;
            }).length;
        } catch (error) {
            console.warn('[Lecturer Dashboard] Exams due metric failed:', error);
            this.metrics.examsDue = null;
        }

        // Performance is calculated only from approved AND published marks,
        // and only for the lecturer's assigned units/blocks.
        try {
            const { data, error } = await supabase
                .from('student_marks')
                .select('student_id, subject_name, block, final_score, published, approval_status, program')
                .in('student_id', studentIds)
                .eq('program', program)
                .eq('published', true)
                .eq('approval_status', 'approved');
            if (error) throw error;

            const validScores = (data || []).filter(mark => {
                const key = normalize(mark.subject_name) + '|' + normalize(mark.block);
                const score = Number(mark.final_score);
                return unitKeys.has(key) && Number.isFinite(score) && score >= 0 && score <= 100;
            });
            this.metrics.avgPerformance = validScores.length
                ? Math.round(validScores.reduce((sum, mark) => sum + Number(mark.final_score), 0) / validScores.length)
                : 0;
        } catch (error) {
            console.warn('[Lecturer Dashboard] Average performance metric failed:', error);
            this.metrics.avgPerformance = null;
        }

        // Keep unread-message count independent of the academic KPI queries.
        try {
            const profile = window.lecturerDB?.getCurrentUserProfile?.();
            const lecturerId = this.lecturerUuid || profile?.user_id;
            if (lecturerId) {
                const { data, error } = await supabase
                    .from('messages')
                    .select('id')
                    .eq('receiver_id', lecturerId);
                if (error) throw error;
                this.metrics.unreadMessages = (data || []).length;
            }
        } catch (error) {
            console.warn('[Lecturer Dashboard] Message count failed:', error);
        }

        this.updateMetricCards();
        console.log('[Lecturer Dashboard] KPI refresh complete:', {
            students: this.metrics.totalStudents,
            units: this.metrics.totalCourses,
            atRisk: this.metrics.atRiskStudents,
            pendingAttendance: this.metrics.pendingAttendance,
            examsDue: this.metrics.examsDue,
            assignedExams: assignedExams?.length,
            completedExams,
            averagePerformance: this.metrics.avgPerformance
        });
    },

    // ─── LECTURER WORKLOAD & ACADEMIC INSIGHTS ───
    async loadWorkloadInsights() {
        const supabase = this.getSupabaseClient();
        const students = this.assignedStudents || [];
        const units = this.assignedUnits || [];
        const profile = window.lecturerDB?.getCurrentUserProfile?.() || {};
        const authId = this.lecturerUuid || profile.user_id || window.currentUser?.id;
        const lecturerName = String(profile.full_name || profile.name || '').trim();
        const lecturerId = String(this.lecturerAssignmentId || '');
        const program = this.getCurrentProgram();
        const studentIds = [...new Set(students.map(s => String(s.user_id || '').trim()).filter(Boolean))];
        const assignmentIds = [...new Set(units.map(u => String(u.id || '').trim()).filter(Boolean))];
        const norm = v => String(v || '').trim().toLowerCase();
        const unitKey = u => norm(u.subject_name) + '|' + norm(u.block);
        const assignedKeys = new Set(units.map(unitKey));
        const unitNames = [...new Set(units.map(u => String(u.subject_name || '').trim()).filter(Boolean))];
        const root = document.getElementById('lecturerWorkloadInsights');
        if (!root) return;
        const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
        const safe = async (query, label) => {
            try { const result = await query; if (result.error) throw result.error; return result.data || []; }
            catch (error) { console.warn('[Lecturer insights] ' + label + ' unavailable:', error.message); return null; }
        };
        if (!supabase) return;

        const [registrations, marks, attendanceRecords, assignments, assignmentSubmissions, exams, schemes, lessons, nurseAttempts, research, reports] = await Promise.all([
            safe(supabase.from('student_unit_registrations').select('student_id,unit_name,block,status,program').in('student_id', studentIds).eq('program', program), 'unit registrations'),
            safe(supabase.from('student_marks').select('student_id,subject_name,block,final_score,published,approval_status,program').in('student_id', studentIds).eq('program', program), 'marks'),
            safe(supabase.from('geo_attendance_logs').select('student_id,unit_name,block,attendance_status,status,program').in('student_id', studentIds).eq('program', program), 'attendance rate'),
            authId ? safe(supabase.from('online_assignments').select('id,title,unit_name,block,published,due_at,created_by').eq('created_by', authId), 'online assignments') : Promise.resolve(null),
            studentIds.length ? safe(supabase.from('online_submissions').select('id,assignment_id,student_id,status,submitted_at').in('student_id', studentIds), 'assignment submissions') : Promise.resolve([]),
            safe(supabase.from('exams').select('id,title,exam_name,course_name,block,status,exam_date,target_program,is_published').eq('target_program', program), 'assigned examinations'),
            assignmentIds.length ? safe(supabase.from('schemes_of_work').select('id,lecturer_subject_assignment_id,status,hod_approved').in('lecturer_subject_assignment_id', assignmentIds), 'schemes of work') : Promise.resolve([]),
            assignmentIds.length ? safe(supabase.from('lesson_plans').select('id,lecturer_subject_assignment_id,status,hod_approved').in('lecturer_subject_assignment_id', assignmentIds), 'lesson plans') : Promise.resolve([]),
            studentIds.length ? safe(supabase.from('nurseiq_attempts').select('id,student_id,score,total_questions,completed_at').in('student_id', studentIds), 'NurseIQ attempts') : Promise.resolve([]),
            lecturerName ? safe(supabase.from('research_submissions').select('id,student_id,title,status,submission_type,submitted_at,supervisor_name').ilike('supervisor_name', lecturerName), 'research supervision') : Promise.resolve(null),
            authId ? safe(supabase.from('lecturer_report_submissions').select('id,status,document_type,report_type').eq('lecturer_user_id', authId), 'teaching documents') : Promise.resolve(null)
        ]);

        const unitRows = units.map(unit => {
            const key = unitKey(unit);
            const regs = (registrations || []).filter(r => unitKey({subject_name:r.unit_name,block:r.block}) === key && ['approved','completed'].includes(norm(r.status)));
            const unitMarks = (marks || []).filter(m => unitKey({subject_name:m.subject_name,block:m.block}) === key);
            const published = unitMarks.filter(m => m.published === true && norm(m.approval_status) === 'approved');
            const avg = published.length ? Math.round(published.reduce((sum,m)=>sum+Number(m.final_score||0),0)/published.length) : null;
            const passThreshold = 50;
            const passRate = published.length ? Math.round(published.filter(m => Number(m.final_score) >= passThreshold).length / published.length * 100) : null;
            return {name:unit.subject_name,block:unit.block,students:new Set(regs.map(r=>r.student_id)).size,marked:new Set(published.map(m=>m.student_id)).size,avg,passRate};
        });
        const expected = unitRows.reduce((sum,u)=>sum+u.students,0);
        const marked = unitRows.reduce((sum,u)=>sum+u.marked,0);
        const markPct = expected ? Math.round(marked/expected*100) : 0;
        set('liMarksProgress', registrations === null || marks === null ? '—' : markPct + '%');
        set('liMarksDetail', registrations === null || marks === null ? 'Data unavailable' : marked + ' of ' + expected + ' unit registrations have published marks');
        const assignedExams = exams === null ? null : exams.filter(exam => assignedKeys.has(norm(exam.course_name || exam.exam_name || exam.title) + '|' + norm(exam.block)) && (exam.is_published === true || ['published','upcoming','scheduled','completed'].includes(norm(exam.status))));
        const completedExams = assignedExams === null ? 0 : assignedExams.filter(exam => norm(exam.status) === 'completed').length;
        set('liExamProgress', assignedExams === null ? '—' : (assignedExams.length ? Math.round(completedExams / assignedExams.length * 100) : 0) + '%');
        set('liExamDetail', assignedExams === null ? 'Data unavailable' : completedExams + ' completed of ' + assignedExams.length + ' published/scheduled exams');
        const scopedAttendance = attendanceRecords === null ? null : attendanceRecords.filter(log => assignedKeys.has(norm(log.unit_name)+'|'+norm(log.block)));
        const presentCount = scopedAttendance ? scopedAttendance.filter(log => ['present','verified'].includes(norm(log.attendance_status || log.status))).length : 0;
        const absentCount = scopedAttendance ? scopedAttendance.filter(log => norm(log.attendance_status || log.status) === 'absent').length : 0;
        const attendanceDenominator = presentCount + absentCount;
        set('liAttendanceRate', scopedAttendance === null ? '—' : (attendanceDenominator ? Math.round(presentCount / attendanceDenominator * 100) : 0) + '%');
        set('liAttendanceDetail', scopedAttendance === null ? 'Data unavailable' : presentCount + ' present / ' + absentCount + ' absent records');
        const assignmentCount = assignments === null ? null : assignments.filter(a => assignedKeys.has(norm(a.unit_name)+'|'+norm(a.block))).length;
        set('liAssignments', assignmentCount === null ? '—' : String(assignmentCount));
        const scopedAssignments = assignments === null ? [] : assignments.filter(a => assignedKeys.has(norm(a.unit_name)+'|'+norm(a.block)));
        const scopedAssignmentIds = scopedAssignments.map(a=>a.id);
        const scopedSubmissions = assignmentSubmissions === null ? null : assignmentSubmissions.filter(s=>scopedAssignmentIds.includes(s.assignment_id));
        const submittedPairs = scopedSubmissions === null ? 0 : new Set(scopedSubmissions.map(s=>String(s.assignment_id)+'|'+String(s.student_id))).size;
        const submissionRate = scopedAssignments.length && scopedSubmissions !== null
            ? Math.min(100, Math.round(submittedPairs / Math.max(1, scopedAssignments.length * Math.max(1, students.length)) * 100))
            : null;
        set('liAssignmentDetail', assignments === null || assignmentSubmissions === null ? 'Submission data unavailable' : assignmentCount + ' assignments · ' + scopedSubmissions.length + ' submissions (' + submissionRate + '% participation estimate)');
        set('liNurseIq', nurseAttempts === null ? '—' : String(nurseAttempts.length));
        set('liNurseIqDetail', nurseAttempts === null ? 'Data unavailable' : new Set(nurseAttempts.map(a=>a.student_id)).size + ' participating students');
        set('liResearch', research === null ? '—' : String(research.length));
        set('liResearchDetail', research === null ? 'Supervisor records unavailable' : research.filter(r=>['pending','submitted','under_review','resubmitted'].includes(norm(r.status))).length + ' submissions awaiting review');
        const schemeCount = schemes === null ? null : schemes.length;
        const lessonCount = lessons === null ? null : lessons.length;
        const reportCount = reports === null ? null : reports.length;
        set('liTeachingDocs', schemeCount === null || lessonCount === null || reportCount === null ? '—' : String(schemeCount + lessonCount + reportCount));
        set('liTeachingDocsDetail', [schemeCount===null?'Schemes unavailable':schemeCount+' schemes',lessonCount===null?'lesson plans unavailable':lessonCount+' lesson plans',reportCount===null?'reports unavailable':reportCount+' reports'].join(' · '));
        const availableUnitAverages = unitRows.filter(u => Number.isFinite(u.avg));
        const overallUnitAverage = availableUnitAverages.length
            ? Math.round(availableUnitAverages.reduce((sum,u)=>sum+u.avg,0)/availableUnitAverages.length)
            : null;
        set('liUnitAverage', overallUnitAverage === null ? '—' : overallUnitAverage + '%');
        set('nrdPerformanceAverage', overallUnitAverage === null ? '—' : overallUnitAverage + '%');

        const table = document.getElementById('liUnitPerformanceRows');
        if (table) {
            table.innerHTML = unitRows.map((u,index) => {
                const status = u.avg === null ? 'Pending' : (u.avg >= 70 ? 'Good' : 'Review');
                const statusClass = status === 'Good' ? 'nrd-status-good' : (status === 'Review' ? 'nrd-status-review' : 'nrd-status-pending');
                return '<tr><td>'+(index+1)+'</td><td><strong>'+String(u.name).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))+'</strong><small>'+String(u.block||'')+'</small></td><td>'+u.students+'</td><td>'+(u.avg===null?'—':u.avg+'%')+'</td><td>'+(u.passRate===null?'—':u.passRate+'%')+'</td><td><span class="'+statusClass+'">'+status+'</span></td></tr>';
            }).join('') || '<tr><td colspan="6">No assigned units available.</td></tr>';
        }
        set('liUnitSummary', units.length + ' assigned units · ' + (registrations === null ? 'registration data unavailable' : expected + ' unit registrations'));
        console.log('[Lecturer insights] workload data loaded', {units:units.length,markPct,assignments:assignmentCount,nurseIq:nurseAttempts?.length,research:research?.length});
    },

    // ─── UPDATE METRIC CARDS ───
    updateMetricCards() {
        const elements = {
            'totalStudentsCount': this.metrics.totalStudents,
            'totalCoursesCount': this.metrics.totalCourses,
            'studentsAtRiskCount': this.metrics.atRiskStudents,
            'pendingAttendanceCount': this.metrics.pendingAttendance,
            'examsDueCount': this.metrics.examsDue,
            'unreadMessagesCount': this.metrics.unreadMessages,
            'avgPerformance': this.metrics.avgPerformance === null || this.metrics.avgPerformance === undefined ? null : this.metrics.avgPerformance + '%'
        };

        Object.keys(elements).forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = elements[id] === null || elements[id] === undefined ? '—' : elements[id];
            }
        });
    },

    // ─── LOAD QUICK STATS ───
    loadQuickStats() {
        const container = document.getElementById('quickStatsContainer');
        if (!container) return;

        const totalStudents = this.assignedStudents.length || this.metrics.totalStudents || 0;
        const totalUnits = this.assignedUnits.length || this.metrics.totalCourses || 0;
        const avgStudentsPerUnit = totalUnits > 0 ? Math.round(totalStudents / totalUnits) : 0;
        const totalEnrollments = totalStudents * totalUnits;
        const typeLabel = this.isTVET ? 'TVET' : 'Nursing';
        const emoji = this.isTVET ? '🔧' : '🎓';

        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; background: #f8fafc; border-radius: 12px; padding: 15px 20px; border: 1px solid #e5e7eb;">
                <div style="text-align: center;">
                    <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Program</div>
                    <div style="font-size: 20px; font-weight: 700; color: ${this.isTVET ? '#7c3aed' : '#4C1D95'};">${emoji} ${typeLabel}</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Avg/Unit</div>
                    <div style="font-size: 20px; font-weight: 700; color: #0A3D62;">${avgStudentsPerUnit}</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Enrollments</div>
                    <div style="font-size: 20px; font-weight: 700; color: #0A3D62;">${totalEnrollments}</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Units</div>
                    <div style="font-size: 20px; font-weight: 700; color: #0A3D62;">${totalUnits}</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Passing</div>
                    <div style="font-size: 20px; font-weight: 700; color: ${this.isTVET ? '#8b5cf6' : '#10b981'};">≥${this.getPassingThreshold()}%</div>
                </div>
            </div>
        `;
    },

    // ─── LOAD ATTENDANCE METRICS ───
    async loadAttendanceMetrics() {
        try {
            const supabase = this.getSupabaseClient();
            if (!supabase) return;

            const program = this.getCurrentProgram();
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];

            const { data: todayLogs } = await supabase
                .from('geo_attendance_logs')
                .select('*')
                .eq('program', program)
                .gte('check_in_time', `${todayStr}T00:00:00.000Z`)
                .lte('check_in_time', `${todayStr}T23:59:59.999Z`);

            const logs = todayLogs || [];
            this.attendanceMetrics.today = logs.length;
            this.attendanceMetrics.present = logs.filter(l => l.attendance_status === 'Present' || l.status === 'present').length;
            this.attendanceMetrics.absent = logs.filter(l => l.attendance_status === 'Absent' || l.status === 'absent').length;
            this.attendanceMetrics.pending = this.assignedStudents.length - logs.length;

            this.attendanceMetrics.lectureCount = logs.filter(l => l.session_type === 'Lecture' || l.session_type === 'Class').length;
            this.attendanceMetrics.clinicalCount = logs.filter(l => l.session_type === 'Clinical').length;
            this.attendanceMetrics.labCount = logs.filter(l => l.session_type === 'Lab').length;

            this.attendanceMetrics.campusCount = logs.filter(l =>
                l.location && l.location.toLowerCase().includes('kiamunyi')
            ).length;
            this.attendanceMetrics.hospitalCount = logs.filter(l =>
                l.location && l.location.toLowerCase().includes('hospital')
            ).length;

            const weekRange = this.getWeekRange();
            const { data: weekLogs } = await supabase
                .from('geo_attendance_logs')
                .select('*')
                .eq('program', program);

            this.attendanceMetrics.week = weekLogs?.filter(l => {
                const date = new Date(l.check_in_time);
                return date >= weekRange.start && date <= weekRange.end;
            }).length || 0;

            const { data: monthLogs } = await supabase
                .from('geo_attendance_logs')
                .select('student_id')
                .eq('program', program);

            const uniqueStudents = [...new Set(monthLogs?.map(l => l.student_id) || [])];
            const totalStudents = this.assignedStudents.length || this.metrics.totalStudents || 1;
            this.attendanceMetrics.month = totalStudents > 0 ? Math.round((uniqueStudents.length / totalStudents) * 100) : 0;
            this.attendanceMetrics.overall = monthLogs?.length || 0;

            this.updateAttendanceMetricsUI();

        } catch (error) {
            console.error('Failed to load attendance metrics:', error);
        }
    },

    getWeekRange() {
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        const start = new Date(today);
        start.setDate(diff);
        start.setHours(0, 0, 0, 0);
        const end = new Date(today);
        end.setDate(diff + 6);
        end.setHours(23, 59, 59, 999);
        return { start, end };
    },

    updateAttendanceMetricsUI() {
        const elements = {
            'todayAttendanceTotal': this.attendanceMetrics.today,
            'todayAttendanceTotal2': this.attendanceMetrics.today,
            'weeklyAttendanceTotal': this.attendanceMetrics.week,
            'monthlyAttendanceRate': this.attendanceMetrics.month + '%',
            'overallAttendanceTotal': this.attendanceMetrics.overall,
            'todayPresent': this.attendanceMetrics.present,
            'todayAbsent': this.attendanceMetrics.absent,
            'todayPending': this.attendanceMetrics.pending,
            'lectureAttendance': this.attendanceMetrics.lectureCount,
            'clinicalAttendance': this.attendanceMetrics.clinicalCount,
            'labAttendance': this.attendanceMetrics.labCount
        };

        Object.keys(elements).forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = elements[id];
            }
        });

        const locationEl = document.getElementById('locationBreakdown');
        if (locationEl) {
            locationEl.textContent = `🏫 ${this.attendanceMetrics.campusCount} · 🏥 ${this.attendanceMetrics.hospitalCount}`;
        }

        const dateDisplay = document.getElementById('todayDateDisplay');
        if (dateDisplay) {
            dateDisplay.textContent = new Date().toLocaleDateString('en-GB', {
                weekday: 'short',
                day: 'numeric',
                month: 'short'
            });
        }
    },

    // ─── LOAD CLINICAL HOURS ───
    async loadClinicalHours() {
        try {
            const supabase = this.getSupabaseClient();
            if (!supabase) return;

            const program = this.getCurrentProgram();
            const studentIds = this.assignedStudents.map(s => s.user_id);

            if (studentIds.length === 0) {
                this.updateClinicalUI(0, 0, 0, 0, 0);
                return;
            }

            const { data: logs } = await supabase
                .from('clinical_hours_logs')
                .select('student_id, hours_completed')
                .in('student_id', studentIds)
                .eq('program', program);

            const totalHours = logs?.reduce((sum, l) => sum + (l.hours_completed || 0), 0) || 0;
            const required = 1500;
            const percent = Math.min(Math.round((totalHours / required) * 100), 100);

            const studentHours = {};
            logs?.forEach(l => {
                studentHours[l.student_id] = (studentHours[l.student_id] || 0) + (l.hours_completed || 0);
            });

            let onTrack = 0, atRisk = 0, critical = 0;
            Object.values(studentHours).forEach(hours => {
                const pct = (hours / required) * 100;
                if (pct >= 80) onTrack++;
                else if (pct >= 60) atRisk++;
                else critical++;
            });

            this.clinicalMetrics = {
                percent,
                completed: totalHours,
                required,
                onTrack,
                atRisk,
                critical
            };

            this.updateClinicalUI(percent, totalHours, onTrack, atRisk, critical);

        } catch (error) {
            console.error('Failed to load clinical hours:', error);
        }
    },

    updateClinicalUI(percent, completed, onTrack, atRisk, critical) {
        const elements = {
            'clinicalHoursPercent': percent + '%',
            'clinicalHoursCompleted': completed,
            'clinicalOnTrack': onTrack,
            'clinicalAtRisk': atRisk,
            'clinicalCritical': critical
        };

        Object.keys(elements).forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = elements[id];
            }
        });

        const ring = document.getElementById('clinicalRing');
        if (ring) {
            const circumference = 314;
            const offset = circumference - (percent / 100) * circumference;
            ring.style.strokeDashoffset = offset;
        }

        const bar = document.getElementById('clinicalHoursBar');
        if (bar) {
            bar.style.width = Math.min(percent, 100) + '%';
        }
    },

    // ─── LOAD RISK DATA ───
    async loadRiskData() {
        try {
            const supabase = this.getSupabaseClient();
            if (!supabase) return;

            const program = this.getCurrentProgram();
            const studentIds = this.assignedStudents.map(s => s.user_id);

            if (studentIds.length === 0) {
                this.updateRiskUI([], 0, 0, 0);
                return;
            }

            const { data: attendance } = await supabase
                .from('geo_attendance_logs')
                .select('student_id, attendance_status')
                .in('student_id', studentIds)
                .eq('program', program);

            const { data: marks } = await supabase
                .from('student_marks')
                .select('student_id, final_score')
                .in('student_id', studentIds)
                .eq('program', program);

            const riskMap = {};
            const threshold = this.getPassingThreshold();

            studentIds.forEach(id => {
                const student = this.assignedStudents.find(s => s.user_id === id);
                const studentAttendance = attendance?.filter(a => a.student_id === id) || [];
                const studentMarks = marks?.filter(m => m.student_id === id) || [];

                const absences = studentAttendance.filter(a =>
                    a.attendance_status === 'Absent' || a.attendance_status === 'absent'
                ).length;

                const avgScore = studentMarks.length > 0
                    ? studentMarks.reduce((sum, m) => sum + (m.final_score || 0), 0) / studentMarks.length
                    : 0;

                const submissions = studentMarks.length;
                const totalStudents = studentIds.length;
                const submissionRate = totalStudents > 0 ? (submissions / totalStudents) * 100 : 0;

                let riskScore = 0;
                riskScore += Math.min(absences * 10, 50);
                riskScore += Math.max((100 - avgScore) * 0.3, 0);
                riskScore += Math.max((100 - submissionRate) * 0.2, 0);

                const isPassing = avgScore >= threshold;

                riskMap[id] = {
                    name: student?.full_name || 'Unknown',
                    absences,
                    avgScore: Math.round(avgScore),
                    submissionRate: Math.round(submissionRate),
                    riskScore: Math.round(riskScore),
                    riskLevel: riskScore > 50 ? 'high' : (riskScore > 25 ? 'medium' : 'low'),
                    isPassing
                };
            });

            const riskStudents = Object.entries(riskMap).map(([id, data]) => ({ id, ...data }));

            this.riskMetrics.high = riskStudents.filter(s => s.riskLevel === 'high').length;
            this.riskMetrics.medium = riskStudents.filter(s => s.riskLevel === 'medium').length;
            this.riskMetrics.low = riskStudents.filter(s => s.riskLevel === 'low').length;
            this.riskMetrics.students = riskStudents.sort((a, b) => b.riskScore - a.riskScore);

            this.updateRiskUI(riskStudents, this.riskMetrics.high, this.riskMetrics.medium, this.riskMetrics.low);

        } catch (error) {
            console.error('Failed to load risk data:', error);
        }
    },

    updateRiskUI(students, high, medium, low) {
        const elements = {
            'highRiskCount': high,
            'mediumRiskCount': medium,
            'lowRiskCount': low
        };

        Object.keys(elements).forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = elements[id];
            }
        });
        const interventionCount = document.getElementById('studentsAtRiskCountPanel');
        if (interventionCount) interventionCount.textContent = Number(high || 0) + Number(medium || 0);

        const container = document.getElementById('riskStudentList');
        if (!container) return;

        if (students.length === 0) {
            container.innerHTML = '<p style="color: #94a3b8; text-align: center; padding: 10px;">No risk data available.</p>';
            return;
        }

        const topRisk = students.filter(s => s.riskLevel !== 'low').slice(0, 5);

        if (topRisk.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 10px; color: #10b981;">
                    <i class="fas fa-check-circle"></i> All students are low risk!
                </div>
            `;
            return;
        }

        container.innerHTML = topRisk.map(s => {
            const colors = {
                high: { bg: '#fef2f2', border: '#dc2626', text: '#dc2626', label: '🔴 HIGH' },
                medium: { bg: '#fffbeb', border: '#f59e0b', text: '#d97706', label: '🟡 MEDIUM' }
            };
            const c = colors[s.riskLevel] || colors.medium;
            const passingEmoji = s.isPassing ? '✅' : '❌';

            return `
                <div style="display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: ${c.bg}; border-radius: 8px; margin-bottom: 6px; border-left: 3px solid ${c.border};">
                    <span style="font-weight: 600; color: ${c.text}; font-size: 11px;">${c.label}</span>
                    <span style="flex: 1; font-size: 13px; color: #1e293b; font-weight: 500;">${s.name}</span>
                    <span style="font-size: 12px; color: #64748b;">${s.absences} absences</span>
                    <span style="font-size: 12px; font-weight: 600; color: ${s.isPassing ? '#10b981' : '#ef4444'};">${s.avgScore}% ${passingEmoji}</span>
                </div>
            `;
        }).join('');
    },

    // ─── UPDATE WELCOME BANNER ───
    updateWelcomeBanner() {
        const profile = window.lecturerDB?.getCurrentUserProfile();
        const program = this.getCurrentProgram();
        const typeLabel = this.isTVET ? 'TVET' : 'Nursing';
        const emoji = this.isTVET ? '🔧' : '🎓';
        const threshold = this.getPassingThreshold();

        // Dynamic lecturer greeting used by the reference dashboard.
        const now = new Date();
        const hour = now.getHours();
        let greeting = 'Good Morning';
        let greetingEmoji = '🌅';
        if (hour >= 12 && hour < 17) { greeting = 'Good Afternoon'; greetingEmoji = '☀️'; }
        else if (hour >= 17 && hour < 21) { greeting = 'Good Evening'; greetingEmoji = '🌆'; }
        else if (hour >= 21 || hour < 5) { greeting = 'Good Night'; greetingEmoji = '🌙'; }

        const lecturerName = profile?.full_name || 'Lecturer';
        const greetingEl = document.getElementById('lecturerGreetingText');
        const greetingEmojiEl = document.getElementById('lecturerGreetingEmoji');
        const heroNameEl = document.getElementById('lecturerHeroName');
        const clockEl = document.getElementById('nrdClock');
        const daypartEl = document.getElementById('nrdDaypart');
        if (greetingEl) greetingEl.textContent = greeting;
        if (greetingEmojiEl) greetingEmojiEl.textContent = greetingEmoji;
        if (heroNameEl) heroNameEl.textContent = lecturerName;
        if (clockEl) clockEl.textContent = now.toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'});
        if (daypartEl) daypartEl.textContent = greetingEmoji;

        const welcomeHeader = document.getElementById('welcomeHeader');
        const welcomeBannerText = document.getElementById('welcomeBannerText');
        const studentCountDisplay = document.getElementById('studentCountDisplay');
        const unitCountDisplay = document.getElementById('unitCountDisplay');

        if (welcomeHeader) {
            welcomeHeader.textContent = profile?.full_name || 'Lecturer';
        }

        if (welcomeBannerText) {
            const totalStudents = this.assignedStudents.length || 0;
            const totalUnits = this.assignedUnits.length || 0;
            const atRisk = this.riskMetrics.high || 0;
            const riskMsg = atRisk > 0 ? `⚠️ ${atRisk} at-risk students need attention.` : '✅ All students on track!';
            welcomeBannerText.textContent =
                `${emoji} Welcome back! You have ${totalUnits} assigned units with ${totalStudents} students. ${riskMsg} (${typeLabel} - Passing: ≥${threshold}%)`;
        }

        if (studentCountDisplay) {
            studentCountDisplay.textContent = this.assignedStudents.length || 0;
        }
        if (unitCountDisplay) {
            unitCountDisplay.textContent = this.assignedUnits.length || 0;
        }

        const currentDateTime = document.getElementById('currentDateTime');
        if (currentDateTime) {
            const now = this.getKenyaNow();
            currentDateTime.textContent = now.toLocaleDateString('en-KE', {
                timeZone: 'Africa/Nairobi',
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            }) + ' · ' + this.formatKenyaTime(now, false);
        }

        const subtitle = document.getElementById('programSubtitle');
        if (subtitle) {
            subtitle.textContent = `${emoji} Program: ${program} (${typeLabel}) · Passing: ≥${threshold}%`;
        }

        const programDisplay = document.getElementById('programDisplayName');
        if (programDisplay) {
            const friendly = this.isTVET ? `${program} TVET Program` : `${program} Nursing Program`;
            programDisplay.textContent = friendly;
        }
    },

    // ─── LOAD COURSE PROGRESS ───
    async loadCourseProgress() {
        try {
            const container = document.getElementById('courseProgressList');
            if (!container) return;

            const supabase = this.getSupabaseClient();
            if (!supabase) return;

            const program = this.getCurrentProgram();
            const threshold = this.getPassingThreshold();
            const unitNames = this.assignedUnits.map(u => u.subject_name);

            if (unitNames.length === 0) {
                container.innerHTML = '<p style="color: #94a3b8; text-align: center; padding: 20px;">No courses assigned.</p>';
                return;
            }

            const progressData = await Promise.all(unitNames.map(async (unit) => {
                const { data: marks } = await supabase
                    .from('student_marks')
                    .select('final_score')
                    .eq('subject_name', unit)
                    .eq('program', program);

                const validScores = marks?.filter(m => m.final_score > 0) || [];
                const avgScore = validScores.length > 0
                    ? Math.round(validScores.reduce((a, b) => a + b.final_score, 0) / validScores.length)
                    : 0;
                const studentCount = validScores.length;
                const totalStudents = this.assignedStudents.length || 0;
                const completionRate = totalStudents > 0 ? Math.round((studentCount / totalStudents) * 100) : 0;
                const passingCount = validScores.filter(s => s >= threshold).length;
                const passRate = studentCount > 0 ? Math.round((passingCount / studentCount) * 100) : 0;

                return { unit, avgScore, studentCount, completionRate, totalStudents, passRate };
            }));

            container.innerHTML = progressData.map(p => {
                const color = p.avgScore >= 70 ? '#10b981' : (p.avgScore >= 50 ? '#f59e0b' : '#ef4444');
                const passEmoji = p.passRate >= 80 ? '🌟' : (p.passRate >= 50 ? '📈' : '⚠️');
                const statusLabel = p.avgScore >= 70 ? '✅ Excellent' : (p.avgScore >= 50 ? '⚡ Good' : '⚠️ Needs Improvement');
                return `
                    <div style="margin-bottom: 14px; padding: 10px 12px; background: #f8fafc; border-radius: 10px; border: 1px solid #e5e7eb;">
                        <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;">
                            <span style="color: #1e293b; font-weight: 600;">${p.unit}</span>
                            <span style="color: ${color}; font-weight: 600;">
                                ${p.avgScore}% avg · ${statusLabel}
                            </span>
                        </div>
                        <div style="background: #e5e7eb; border-radius: 8px; height: 8px; overflow: hidden;">
                            <div class="progress-bar" style="background: ${color}; width: ${p.avgScore}%; height: 100%; border-radius: 8px; transition: width 1.5s ease;"></div>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; margin-top: 4px;">
                            <span>📊 ${p.completionRate}% completion</span>
                            <span>📝 ${p.studentCount} submissions</span>
                            <span>👨‍🎓 ${p.totalStudents} enrolled</span>
                            <span>${passEmoji} ${p.passRate}% passing</span>
                        </div>
                    </div>
                `;
            }).join('');

        } catch (error) {
            console.error('Failed to load course progress:', error);
            const container = document.getElementById('courseProgressList');
            if (container) {
                container.innerHTML = '<p style="color: #ef4444; text-align: center; padding: 20px;">Error loading progress</p>';
            }
        }
    },

    // ─── LOAD TOP STUDENTS ───
    async loadTopStudents() {
        try {
            const container = document.getElementById('topStudentsList');
            if (!container) return;

            const supabase = this.getSupabaseClient();
            if (!supabase) return;

            const program = this.getCurrentProgram();
            const studentIds = this.assignedStudents.map(s => s.user_id);

            if (studentIds.length === 0) {
                container.innerHTML = '<p style="color: #94a3b8; text-align: center; padding: 20px;">No students assigned yet.</p>';
                return;
            }

            const { data: marks } = await supabase
                .from('student_marks')
                .select('student_id, student_name, final_score, subject_name')
                .in('student_id', studentIds)
                .eq('program', program)
                .order('final_score', { ascending: false })
                .limit(5);

            if (!marks || marks.length === 0) {
                container.innerHTML = '<p style="color: #94a3b8; text-align: center; padding: 20px;">No marks data available yet.</p>';
                return;
            }

            const threshold = this.getPassingThreshold();

            container.innerHTML = marks.map((m, i) => {
                const medals = ['🥇', '🥈', '🥉'];
                const isTop3 = i < 3;
                const gradeInfo = this.getGrade(m.final_score || 0);
                const isPassing = (m.final_score || 0) >= threshold;

                return `
                    <div style="display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
                        <span style="font-size: 20px;">${isTop3 ? medals[i] : (i + 1)}</span>
                        <div style="flex: 1;">
                            <div style="font-weight: 600; font-size: 14px; color: #1e293b;">${m.student_name || 'Unknown'}</div>
                            <div style="font-size: 11px; color: #94a3b8;">${m.subject_name || 'General'} · Grade: ${gradeInfo.grade}</div>
                        </div>
                        <div style="text-align: right;">
                            <span style="font-weight: 700; color: ${isPassing ? '#10b981' : '#ef4444'}; font-size: 18px;">
                                ${m.final_score || 0}%
                            </span>
                            <div style="font-size: 10px; color: ${isPassing ? '#10b981' : '#ef4444'};">
                                ${isPassing ? '✅ Passed' : '❌ Failed'} · ${gradeInfo.remarks}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

        } catch (error) {
            console.error('Failed to load top students:', error);
            const container = document.getElementById('topStudentsList');
            if (container) {
                container.innerHTML = '<p style="color: #ef4444; text-align: center; padding: 20px;">Error loading top students</p>';
            }
        }
    },

    // ─── LOAD ATTENDANCE ALERTS ───
    async loadAttendanceAlerts() {
        try {
            const container = document.getElementById('attendanceAlerts');
            if (!container) return;

            const supabase = this.getSupabaseClient();
            if (!supabase) return;

            const program = this.getCurrentProgram();
            const studentIds = this.assignedStudents.map(s => s.user_id);

            if (studentIds.length === 0) {
                container.innerHTML = '<p style="color: #94a3b8; text-align: center; padding: 20px;">No students assigned yet.</p>';
                return;
            }

            const { data: absences } = await supabase
                .from('geo_attendance_logs')
                .select('student_id, student_name, attendance_status, check_in_time')
                .in('student_id', studentIds)
                .eq('program', program)
                .eq('attendance_status', 'Absent')
                .gte('check_in_time', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

            const absenceCount = {};
            absences?.forEach(a => {
                if (!absenceCount[a.student_id]) {
                    absenceCount[a.student_id] = { name: a.student_name || 'Unknown', count: 0 };
                }
                absenceCount[a.student_id].count++;
            });

            const alertStudents = Object.entries(absenceCount)
                .filter(([_, data]) => data.count > 2)
                .sort((a, b) => b[1].count - a[1].count)
                .slice(0, 5);

            if (alertStudents.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: #10b981;">
                        <i class="fas fa-check-circle" style="font-size: 24px; display: block; margin-bottom: 8px;"></i>
                        <span style="font-size: 13px;">No attendance alerts! All students have good attendance.</span>
                    </div>
                `;
                return;
            }

            container.innerHTML = alertStudents.map(([_, data]) => `
                <div style="display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: #fef2f2; border-radius: 8px; margin-bottom: 6px; border-left: 3px solid #ef4444;">
                    <i class="fas fa-exclamation-triangle" style="color: #ef4444; font-size: 14px;"></i>
                    <span style="flex: 1; font-size: 13px; color: #1e293b; font-weight: 500;">${data.name}</span>
                    <span style="font-size: 12px; color: #ef4444; font-weight: 600; background: #fee2e2; padding: 2px 12px; border-radius: 12px;">
                        ${data.count} absences this week
                    </span>
                </div>
            `).join('');

        } catch (error) {
            console.error('Failed to load attendance alerts:', error);
            const container = document.getElementById('attendanceAlerts');
            if (container) {
                container.innerHTML = '<p style="color: #ef4444; text-align: center; padding: 20px;">Error loading alerts</p>';
            }
        }
    },

    // ─── LOAD INTELLIGENT ALERTS ───
    async loadIntelligentAlerts() {
        try {
            const container = document.getElementById('intelligentAlerts');
            if (!container) return;

            const threshold = this.getPassingThreshold();
            const typeLabel = this.isTVET ? 'TVET' : 'Nursing';
            const emoji = this.isTVET ? '🔧' : '🎓';

            const alerts = [];

            if (this.clinicalMetrics.critical > 0) {
                alerts.push({
                    type: 'critical',
                    icon: '🚨',
                    message: `${this.clinicalMetrics.critical} students are critically below clinical hours requirement (${this.clinicalMetrics.percent}% completion)`
                });
            }

            if (this.riskMetrics.high > 0) {
                alerts.push({
                    type: 'warning',
                    icon: '⚠️',
                    message: `${this.riskMetrics.high} students are at HIGH risk - immediate intervention recommended (${typeLabel} passing: ≥${threshold}%)`
                });
            }

            if (this.metrics.pendingAttendance > 20) {
                alerts.push({
                    type: 'warning',
                    icon: '📌',
                    message: `${this.metrics.pendingAttendance} students have not checked in today - attendance pending`
                });
            }

            if (this.metrics.examsDue > 0) {
                alerts.push({
                    type: 'info',
                    icon: '📝',
                    message: `${this.metrics.examsDue} exams/CATs are scheduled and awaiting grading`
                });
            }

            const unitNames = this.assignedUnits.map(u => u.subject_name);
            if (unitNames.length > 0) {
                alerts.push({
                    type: 'success',
                    icon: '✅',
                    message: `${unitNames.length} units assigned - all courses are active (${typeLabel} grading)`
                });
            }

            if (alerts.length === 0) {
                alerts.push({
                    type: 'success',
                    icon: '🎉',
                    message: `${emoji} All systems clear! Your ${typeLabel} dashboard is up to date.`
                });
            }

            container.innerHTML = alerts.slice(0, 5).map(a => {
                const classes = {
                    critical: 'alert-critical',
                    warning: 'alert-warning',
                    info: 'alert-info',
                    success: 'alert-success'
                };
                return `
                    <div class="alert-modern ${classes[a.type] || 'alert-info'}" style="padding: 10px 14px; border-radius: 10px; margin-bottom: 6px; display: flex; align-items: center; gap: 12px; border-left: 4px solid transparent;">
                        <span style="font-size: 18px;">${a.icon}</span>
                        <span style="font-size: 13px; color: #1e293b;">${a.message}</span>
                    </div>
                `;
            }).join('');

        } catch (error) {
            console.error('Failed to load intelligent alerts:', error);
            const container = document.getElementById('intelligentAlerts');
            if (container) {
                container.innerHTML = '<p style="color: #94a3b8; text-align: center; padding: 20px;">No alerts available</p>';
            }
        }
    },

    // ─── LOAD RECENT ACTIVITY ───
    async loadRecentActivity() {
        try {
            const container = document.getElementById('recentActivityList');
            if (!container) return;

            const supabase = this.getSupabaseClient();
            if (!supabase) return;

            const program = this.getCurrentProgram();
            const activities = [];

            const { data: recentAttendance } = await supabase
                .from('geo_attendance_logs')
                .select('*')
                .eq('program', program)
                .order('check_in_time', { ascending: false })
                .limit(3);

            if (recentAttendance && recentAttendance.length > 0) {
                recentAttendance.forEach(a => {
                    const sessionType = a.session_type || 'class';
                    activities.push({
                        type: 'attendance',
                        icon: 'fa-clipboard-check',
                        color: '#10b981',
                        message: `${a.student_name || 'Student'} checked in for ${sessionType.toLowerCase()}`,
                        time: a.check_in_time
                    });
                });
            }

            const { data: recentExams } = await supabase
                .from('exams')
                .select('*')
                .eq('target_program', program)
                .order('created_at', { ascending: false })
                .limit(2);

            if (recentExams && recentExams.length > 0) {
                recentExams.forEach(e => {
                    activities.push({
                        type: 'exam',
                        icon: 'fa-file-alt',
                        color: '#8b5cf6',
                        message: `Exam "${e.exam_name || e.title || 'Untitled'}" was created`,
                        time: e.created_at
                    });
                });
            }

            const { data: recentSessions } = await supabase
                .from('scheduled_sessions')
                .select('*')
                .eq('target_program', program)
                .order('created_at', { ascending: false })
                .limit(2);

            if (recentSessions && recentSessions.length > 0) {
                recentSessions.forEach(s => {
                    activities.push({
                        type: 'session',
                        icon: 'fa-calendar-plus',
                        color: '#f59e0b',
                        message: `Session "${s.session_title || s.title || 'Untitled'}" was scheduled`,
                        time: s.created_at
                    });
                });
            }

            activities.sort((a, b) => new Date(b.time) - new Date(a.time));

            if (activities.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: #94a3b8;">
                        <i class="fas fa-inbox" style="font-size: 24px; display: block; margin-bottom: 8px;"></i>
                        <span style="font-size: 13px;">No recent activity found.</span>
                    </div>
                `;
                return;
            }

            const topActivities = activities.slice(0, 5);

            container.innerHTML = topActivities.map(a => {
                const timeAgo = this.timeAgo(new Date(a.time));
                return `
                    <div style="display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
                        <div style="background: ${a.color}20; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                            <i class="fas ${a.icon}" style="color: ${a.color}; font-size: 14px;"></i>
                        </div>
                        <div style="flex: 1;">
                            <div style="font-size: 13px; color: #1e293b;">${a.message}</div>
                            <div style="font-size: 11px; color: #94a3b8;">${timeAgo}</div>
                        </div>
                    </div>
                `;
            }).join('');

        } catch (error) {
            console.error('Failed to load recent activity:', error);
            const container = document.getElementById('recentActivityList');
            if (container) {
                container.innerHTML = '<p style="color: #ef4444; text-align: center; padding: 20px;">Error loading activity</p>';
            }
        }
    },

    // ─── TIME AGO HELPER ───
    timeAgo(date) {
        const now = new Date();
        const diff = Math.floor((now - date) / 1000);

        if (diff < 60) return 'Just now';
        if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
        if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
        if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    },

    // ─── UPDATE LAST UPDATED ───
    updateLastUpdated() {
        const el = document.getElementById('lastUpdatedTime');
        if (el) {
            el.textContent = `Last updated: ${this.formatKenyaTime(this.getKenyaNow(), true)}`;
        }

        const status = document.getElementById('nrdLiveStatus');
        if (status) {
            status.innerHTML = '<i class="fas fa-circle"></i> Live';
            status.classList.remove('refreshing');
        }
    },

    // ─── LIVE CLOCK ───
    startLiveClock() {
        if (this.liveClockInterval) clearInterval(this.liveClockInterval);
        this.updateTimeGreeting();

        this.liveClockInterval = setInterval(() => {
            this.updateTimeGreeting();
        }, 30000);
    },

    // ─── START AUTO REFRESH ───
    startAutoRefresh() {
        if (this.refreshInterval) clearInterval(this.refreshInterval);

        this.refreshInterval = setInterval(async () => {
            // Do not run dashboard queries while the user is in another section.
            // Background refreshes used to compete with the active module and
            // could make the portal appear to freeze and reload its data.
            const dashboard = document.getElementById('dashboard-content');
            const dashboardVisible = !!dashboard &&
                dashboard.classList.contains('active') &&
                getComputedStyle(dashboard).display !== 'none';

            if (document.hidden || !dashboardVisible ||
                this._refreshInProgress || this.isRefreshing) return;

            this._refreshInProgress = true;
            try {
                await this.refresh({ silent: true });
            } catch (error) {
                console.warn('Automatic lecturer dashboard refresh skipped:', error);
            } finally {
                this._refreshInProgress = false;
            }
        }, Math.max(this.CACHE_DURATION, 300000));

        console.log('🔄 Auto-refresh started (5-minute minimum; dashboard visible only)');
    },

    // ─── CHARTS ───
    async loadCharts() {
        if (this._chartsLoading) {
            console.log('⏭️ loadCharts already running, skipping');
            return;
        }
        this._chartsLoading = true;

        console.log('📊 Loading lecturer charts...');

        this.getCurrentProgram();

        try {
            const supabase = this.getSupabaseClient();
            if (!supabase) return;

            const program = this.getCurrentProgram();
            const typeLabel = this.isTVET ? 'TVET' : 'Nursing';
            const emoji = this.isTVET ? '🔧' : '🎓';

            // Lecturer analytics must be scoped to students assigned to this lecturer,
            // just as the main student metrics are scoped through approved unit registrations.
            const students = this.assignedStudents || [];

            // ─── 1. GENDER DISTRIBUTION CHART ───
            const maleCount = students?.filter(s => s.gender === 'Male' || s.gender === 'M').length || 0;
            const femaleCount = students?.filter(s => s.gender === 'Female' || s.gender === 'F').length || 0;
            const otherCount = students?.filter(s => s.gender && !['Male', 'M', 'Female', 'F'].includes(s.gender)).length || 0;

            const ctx2 = document.getElementById('studentDistributionChart');
            if (ctx2) {
                const existing = Chart.getChart(ctx2);
                if (existing) existing.destroy();
                if (this.chartInstances.distribution) {
                    this.chartInstances.distribution.destroy();
                    this.chartInstances.distribution = null;
                }
                this.chartInstances.distribution = new Chart(ctx2, {
                    type: 'doughnut',
                    data: {
                        labels: ['Male', 'Female', 'Other'],
                        datasets: [{
                            data: [maleCount, femaleCount, otherCount],
                            backgroundColor: this.isTVET ? ['#7c3aed', '#8b5cf6', '#a78bfa'] : ['#4C1D95', '#FDB913', '#94a3b8'],
                            borderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: { padding: 15, font: { size: 12, weight: '500' } }
                            },
                            title: {
                                display: true,
                                text: `${emoji} Gender Distribution - ${program} (${typeLabel})`,
                                font: { size: 14, weight: '700' },
                                padding: { bottom: 10 },
                                color: '#0F172A'
                            }
                        }
                    }
                });
                console.log('✅ Gender distribution chart updated');
            }

            // ─── 2. PERFORMANCE CHART ───
            const studentIds = students?.map(s => s.user_id) || [];
            let marksData = [];
            if (studentIds.length > 0) {
                const { data: marks } = await supabase
                    .from('student_marks')
                    .select('*')
                    .in('student_id', studentIds)
                    .eq('program', program);
                marksData = marks || [];
            }

            const assignedUnitKeys = new Set((this.assignedUnits || []).map(u =>
                String(u.subject_name || '').trim().toLowerCase() + '|' + String(u.block || '').trim().toLowerCase()
            ));
            const validPublishedMarks = marksData.filter(m => {
                const score = Number(m.final_score ?? m.score);
                const key = String(m.subject_name || '').trim().toLowerCase() + '|' + String(m.block || '').trim().toLowerCase();
                return m.published === true && String(m.approval_status || '').toLowerCase() === 'approved'
                    && assignedUnitKeys.has(key) && Number.isFinite(score) && score >= 0 && score <= 100;
            });
            const scores = validPublishedMarks.map(m => Number(m.final_score ?? m.score));
            const gradeBuckets = [
                scores.filter(score => score >= 75).length,
                scores.filter(score => score >= 65 && score < 75).length,
                scores.filter(score => score >= 50 && score < 65).length,
                scores.filter(score => score < 50).length
            ];
            const averageScore = scores.length ? Math.round(scores.reduce((sum,score)=>sum+score,0)/scores.length) : null;
            const legendValues = ['nrdGradeDistinction','nrdGradeCredit','nrdGradePass','nrdGradeFail'];
            legendValues.forEach((id,index) => {
                const el = document.getElementById(id);
                if (el) el.textContent = gradeBuckets[index];
            });
            const totalEl = document.getElementById('nrdGradeTotal');
            if (totalEl) totalEl.textContent = scores.length ? 'Total marked results: ' + scores.length : 'No approved and published marks yet';
            const averageEl = document.getElementById('nrdPerformanceAverage');
            if (averageEl) averageEl.textContent = averageScore === null ? '—' : averageScore + '%';

            const ctx1 = document.getElementById('performanceChart');
            if (ctx1) {
                const existing = Chart.getChart(ctx1);
                if (existing) existing.destroy();
                if (this.chartInstances.performance) {
                    this.chartInstances.performance.destroy();
                    this.chartInstances.performance = null;
                }
                this.chartInstances.performance = new Chart(ctx1, {
                    type: 'doughnut',
                    data: {
                        labels: ['Distinction (≥75%)', 'Credit (65–74%)', 'Pass (50–64%)', 'Below 50%'],
                        datasets: [{
                            data: scores.length ? gradeBuckets : [1,0,0,0],
                            backgroundColor: ['#22a447','#1685ed','#f2b900','#ef4444'],
                            borderWidth: 0,
                            hoverOffset: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '70%',
                        plugins: {
                            legend: { display: false },
                            tooltip: { enabled: scores.length > 0 },
                            title: { display: false }
                        }
                    }
                });
                console.log('✅ Published grade distribution updated:', {count:scores.length,average:averageScore,buckets:gradeBuckets});
            }

            // ─── 3. ATTENDANCE TREND CHART ───
            const ctx3 = document.getElementById('attendanceTrendChart');
            if (ctx3) {
                const existing = Chart.getChart(ctx3);
                if (existing) existing.destroy();
                if (this.chartInstances.trend) {
                    this.chartInstances.trend.destroy();
                    this.chartInstances.trend = null;
                }

                const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                const attendanceData = [];

                for (let i = 6; i >= 0; i--) {
                    const date = new Date();
                    date.setDate(date.getDate() - i);
                    const dateStr = date.toISOString().split('T')[0];

                    const { data: dayLogs } = await supabase
                        .from('geo_attendance_logs')
                        .select('*')
                        .eq('program', program)
                        .gte('check_in_time', `${dateStr}T00:00:00.000Z`)
                        .lte('check_in_time', `${dateStr}T23:59:59.999Z`);

                    attendanceData.push(dayLogs?.length || 0);
                }

                this.chartInstances.trend = new Chart(ctx3, {
                    type: 'line',
                    data: {
                        labels: weekDays,
                        datasets: [{
                            label: `Attendance - ${typeLabel}`,
                            data: attendanceData,
                            borderColor: this.isTVET ? '#8b5cf6' : '#4C1D95',
                            backgroundColor: this.isTVET ? 'rgba(139,92,246,0.1)' : 'rgba(76, 29, 149, 0.1)',
                            fill: true,
                            tension: 0.4,
                            pointBackgroundColor: this.isTVET ? '#8b5cf6' : '#4C1D95',
                            pointBorderColor: this.isTVET ? '#8b5cf6' : '#4C1D95',
                            pointRadius: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            title: {
                                display: true,
                                text: `${emoji} Attendance Trend - ${program} (${typeLabel})`,
                                font: { size: 14, weight: '700' },
                                padding: { bottom: 10 },
                                color: '#0F172A'
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: 'Students Present',
                                    font: { weight: '500' }
                                }
                            }
                        }
                    }
                });
                console.log('✅ Attendance trend chart updated');
            }

            console.log(`✅ All charts updated for ${program} (${typeLabel})`);

        } catch (error) {
            console.error('❌ Error loading charts:', error);
        } finally {
            this._chartsLoading = false;
        }
    },

    // ─── SETUP EVENT LISTENERS ───
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
                e.preventDefault();
                this.refresh();
            }
        });

        // Refresh immediately when the lecturer returns to the dashboard
        // after the browser tab has been hidden for a while.
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this._initialized) {
                this.updateTimeGreeting();
            }
        });

        console.log('✅ Event listeners setup complete');
    },

    // ─── REFRESH ───
    async refresh(options = {}) {
        const silent = options.silent === true;

        if (this.isRefreshing || this._refreshInProgress) {
            console.log('⏭️ Dashboard refresh already in progress');
            return;
        }

        if (!this._initialized && !silent) {
            console.log('⏭️ Dashboard still initializing, skipping refresh');
            return;
        }

        this.isRefreshing = true;
        this._refreshInProgress = true;

        const status = document.getElementById('nrdLiveStatus');
        if (status) {
            status.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Updating';
            status.classList.add('refreshing');
        }

        if (!silent) this.clearCache();

        console.log(`🔄 ${silent ? 'Automatic' : 'Manual'} lecturer dashboard refresh...`);

        try {
            const freshClient = this.getSupabaseClient();
            if (!freshClient) throw new Error('No valid Supabase client available.');
            await this.ensureSupabaseSession();

            this.getCurrentProgram();

            await this.resolveLecturerId();
            this.setCacheKey();
            await this.loadAssignedUnits();
            await this.loadNextClassAndExam();
            await this.loadAssignedStudents();
            await this.loadMetrics();
            await this.loadAttendanceMetrics();
            await this.loadClinicalHours();
            await this.loadRiskData();

            this.updateWelcomeBanner();
            this.loadQuickStats();

            await this.loadCourseProgress();
            await this.loadTopStudents();
            await this.loadAttendanceAlerts();
            await this.loadIntelligentAlerts();
            await this.loadRecentActivity();
            await this.loadCharts();
            await this.loadWorkloadInsights();

            this.updateTimeGreeting();
            this.updateLastUpdated();
            this.updateProgramBadge();
            this.updateDashboardGradingInfo();
            this.saveToCache();

            if (!silent && window.LecturerUI) {
                window.LecturerUI.showNotification('Dashboard refreshed successfully!', 'success');
            }

            console.log('✅ Lecturer dashboard refreshed');
        } catch (error) {
            console.error('❌ Refresh error:', error);

            const failedStatus = document.getElementById('nrdLiveStatus');
            if (failedStatus) {
                failedStatus.innerHTML = '<i class="fas fa-circle"></i> Update failed';
                failedStatus.classList.remove('refreshing');
            }

            if (!silent && window.LecturerUI) {
                window.LecturerUI.showNotification('Error refreshing dashboard', 'error');
            }
        } finally {
            this.isRefreshing = false;
            this._refreshInProgress = false;
        }
    },

    // ─── DESTROY ───
    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }

        Object.keys(this.chartInstances).forEach(key => {
            if (this.chartInstances[key]) {
                this.chartInstances[key].destroy();
                this.chartInstances[key] = null;
            }
        });

        console.log('🗑️ Dashboard destroyed');
    }
};

// ─── INITIALIZE ───
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => LecturerDashboard.init(), 500);
});

// ─── GLOBAL EXPOSURE ───
window.LecturerDashboard = LecturerDashboard;
window.refreshDashboard = () => LecturerDashboard.refresh();

console.log('✅ LecturerDashboard module loaded - Complete upgraded version');
console.log('📊 Features:');
console.log('   • Metrics & Stats Cards');
console.log('   • Clinical Hours Tracker');
console.log('   • Attendance Deep Dive (Present/Absent/Pending/Location)');
console.log('   • Early Warning System (Risk Monitoring)');
console.log('   • Course Progress with Visual Bars');
console.log('   • Top Students Ranking');
console.log('   • Intelligent Alerts');
console.log('   • Attendance Alerts');
console.log('   • Recent Activity Feed');
console.log('   • Charts (Performance, Distribution, Trend)');
console.log('   • Auto-refresh every 30 seconds');
console.log('   • Keyboard shortcut: Ctrl+R to refresh');
console.log('   • TVET/Nursing Support: ✅ Enabled');
