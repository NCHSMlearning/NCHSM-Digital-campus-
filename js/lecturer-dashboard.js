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
                this.assignedEnrollmentKeys = new Set();
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
            // Keep exact student + unit + block membership for every downstream dashboard query.
            this.assignedEnrollmentKeys = new Set(enrollments.map(enrollment =>
                String(enrollment.student_id || '').trim() + '|' + normalize(enrollment.unit_name) + '|' + normalize(enrollment.block)
            ));

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
                .select('user_id, student_id, admission_number, full_name, program, block, intake_year, email, phone, gender')
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
            // Legacy marks may carry the admission number instead of the Auth UUID.
            // Keep both identifiers mapped to the same registered unit/block pair.
            this.assignedEnrollmentKeys = new Set();
            enrollments.forEach(enrollment => {
                const id=String(enrollment.student_id||'').trim();
                const student=profileMap.get(id);
                const unitKey=normalize(enrollment.unit_name)+'|'+normalize(enrollment.block);
                [id,student?.student_id,student?.admission_number].filter(Boolean).forEach(identifier=>{
                    this.assignedEnrollmentKeys.add(String(identifier).trim()+'|'+unitKey);
                });
            });

            // One student is counted once, even when enrolled in several assigned units.
            this.metrics.totalStudents = this.assignedStudents.length;
            this.updateMetricCards();
            console.log(`👨‍🎓 Loaded ${this.assignedStudents.length} unique assigned students for program ${program}`);
        } catch (error) {
            console.error('Failed to load assigned students:', error);
            this.assignedStudents = [];
            this.assignedEnrollmentKeys = new Set();
            // Do not silently turn a failed database request into a valid-looking zero.
            this.metrics.totalStudents = null;
            this.updateMetricCards();
        }
    },

    // A mark can be keyed by Auth UUID or by the student's admission number.
    isMarkForAssignedRegistration(mark) {
        const norm = value => String(value || '').trim().toLowerCase();
        const unitKey = norm(mark?.subject_name) + '|' + norm(mark?.block);
        const identifiers = [mark?.student_id, mark?.admission_number]
            .map(value => String(value || '').trim()).filter(Boolean);
        const registered = this.assignedEnrollmentKeys || new Set();
        return identifiers.some(id => registered.has(id + '|' + unitKey));
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
                if (!unitKeys.has(key) || !(this.assignedEnrollmentKeys||new Set()).has(String(log.student_id||'')+'|'+key)) return;
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
                if (unitKeys.has(key) && (this.assignedEnrollmentKeys||new Set()).has(String(log.student_id||'')+'|'+key) && status === 'pending') pendingIds.add(String(log.student_id));
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
                .select('student_id, admission_number, subject_name, block, final_score, published, approval_status, program, updated_at, created_at')
                .in('subject_name', unitNames)
                .eq('program', program)
                .eq('published', true)
                .eq('approval_status', 'approved');
            if (error) throw error;

            const latestByStudentUnit = new Map();
            (data || []).forEach(mark => {
                const key = normalize(mark.subject_name) + '|' + normalize(mark.block);
                const score = Number(mark.final_score);
                if (!unitKeys.has(key) || !this.isMarkForAssignedRegistration(mark) || !Number.isFinite(score) || score < 0 || score > 100) return;
                const rowKey = String(mark.admission_number || mark.student_id || '') + '|' + key;
                const old = latestByStudentUnit.get(rowKey);
                if (!old || new Date(mark.updated_at || mark.created_at || 0) > new Date(old.updated_at || old.created_at || 0)) latestByStudentUnit.set(rowKey, mark);
            });
            const validScores = [...latestByStudentUnit.values()];
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
            safe(supabase.from('student_marks').select('student_id,admission_number,subject_name,block,final_score,published,approval_status,program,updated_at,created_at').in('subject_name', unitNames).eq('program', program), 'marks'),
            safe(supabase.from('geo_attendance_logs').select('student_id,unit_name,block,attendance_status,status,program').in('student_id', studentIds).eq('program', program), 'attendance rate'),
            authId ? safe(supabase.from('online_assignments').select('id,title,unit_code,unit_name,program,block,published,due_at,created_by').eq('created_by', authId).eq('program', program), 'online assignments') : Promise.resolve(null),
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
            const unitMarks = (marks || []).filter(m => unitKey({subject_name:m.subject_name,block:m.block}) === key && this.isMarkForAssignedRegistration(m) && m.published === true && norm(m.approval_status) === 'approved');
            const publishedByStudent = new Map();
            unitMarks.forEach(m => {
                const id=String(m.admission_number||m.student_id||'').trim(); if(!id)return;
                const old=publishedByStudent.get(id);
                if(!old || new Date(m.updated_at||m.created_at||0)>new Date(old.updated_at||old.created_at||0)) publishedByStudent.set(id,m);
            });
            const published = [...publishedByStudent.values()].filter(m=>Number.isFinite(Number(m.final_score))&&Number(m.final_score)>=0&&Number(m.final_score)<=100);
            const avg = published.length ? Math.round(published.reduce((sum,m)=>sum+Number(m.final_score),0)/published.length) : null;
            const passThreshold = this.getPassingThreshold();
            const passRate = published.length ? Math.round(published.filter(m => Number(m.final_score) >= passThreshold).length / published.length * 100) : null;
            return {name:unit.subject_name,block:unit.block,students:new Set(regs.map(r=>r.student_id)).size,marked:published.length,avg,scoreTotal:published.reduce((sum,m)=>sum+Number(m.final_score),0),passRate};
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
        const scopedAttendance = attendanceRecords === null ? null : attendanceRecords.filter(log => assignedKeys.has(norm(log.unit_name)+'|'+norm(log.block)) && (this.assignedEnrollmentKeys||new Set()).has(String(log.student_id||'')+'|'+norm(log.unit_name)+'|'+norm(log.block)));
        const presentCount = scopedAttendance ? scopedAttendance.filter(log => ['present','verified'].includes(norm(log.attendance_status || log.status))).length : 0;
        const absentCount = scopedAttendance ? scopedAttendance.filter(log => norm(log.attendance_status || log.status) === 'absent').length : 0;
        const attendanceDenominator = presentCount + absentCount;
        set('liAttendanceRate', scopedAttendance === null ? '—' : (attendanceDenominator ? Math.round(presentCount / attendanceDenominator * 100) : 0) + '%');
        set('liAttendanceDetail', scopedAttendance === null ? 'Data unavailable' : presentCount + ' present / ' + absentCount + ' absent records');
        const assignedBlocks = new Set(units.map(u=>norm(u.block)));
        const assignedCodes = new Set(units.map(u=>norm(u.subject_code)).filter(Boolean));
        const scopedAssignments = assignments === null ? null : assignments.filter(a => {
            const blockMatch = assignedBlocks.has(norm(a.block));
            const codeMatch = norm(a.unit_code) && assignedCodes.has(norm(a.unit_code));
            const unitMatch = assignedKeys.has(norm(a.unit_name)+'|'+norm(a.block));
            return unitMatch || codeMatch || blockMatch;
        });
        const assignmentCount = scopedAssignments === null ? null : scopedAssignments.length;
        set('liAssignments', assignmentCount === null ? '—' : String(assignmentCount));
        const scopedAssignmentRows = scopedAssignments || [];
        const scopedAssignmentIds = scopedAssignmentRows.map(a=>a.id);
        const scopedSubmissions = assignmentSubmissions === null ? null : assignmentSubmissions.filter(s=>scopedAssignmentIds.includes(s.assignment_id));
        const submittedPairs = scopedSubmissions === null ? 0 : new Set(scopedSubmissions.map(s=>String(s.assignment_id)+'|'+String(s.student_id))).size;
        const assignmentExpected = scopedAssignmentRows.reduce((sum,a)=>sum + students.filter(student => units.some(unit => norm(unit.block) === norm(a.block))).length,0);
        const submissionRate = scopedAssignments !== null && scopedSubmissions !== null && assignmentExpected > 0
            ? Math.min(100, Math.round(submittedPairs / assignmentExpected * 100))
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
        const markedUnitRows = unitRows.filter(u => u.marked > 0 && Number.isFinite(u.scoreTotal));
        const overallUnitAverage = markedUnitRows.length
            ? Math.round(markedUnitRows.reduce((sum,u)=>sum+u.scoreTotal,0)/markedUnitRows.reduce((sum,u)=>sum+u.marked,0))
            : null;
        set('liUnitAverage', overallUnitAverage === null ? '—' : overallUnitAverage + '%');
        set('nrdPerformanceAverage', overallUnitAverage === null ? '—' : overallUnitAverage + '%');

        const table = document.getElementById('liUnitPerformanceRows');
        if (table && (registrations === null || marks === null)) {
            table.innerHTML = '<tr><td colspan="6">Unit performance data is unavailable. Check lecturer data permissions.</td></tr>';
        } else if (table) {
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
        const supabase=this.getSupabaseClient(),students=this.assignedStudents||[],units=this.assignedUnits||[];
        const ids=[...new Set(students.map(s=>String(s.user_id||'').trim()).filter(Boolean))];
        const names=[...new Set(units.map(u=>String(u.subject_name||'').trim()).filter(Boolean))];
        const norm=v=>String(v||'').trim().toLowerCase(),keys=new Set(units.map(u=>norm(u.subject_name)+'|'+norm(u.block)));
        if(!supabase||!ids.length||!names.length){
            this.attendanceMetrics={today:0,week:0,month:0,overall:0,present:0,absent:0,pending:students.length,lectureCount:0,clinicalCount:0,labCount:0,campusCount:0,hospitalCount:0};
            this.updateAttendanceMetricsUI();return;
        }
        try{
            const now=new Date(),localParts=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Nairobi',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
            const part=t=>localParts.find(x=>x.type===t)?.value;
            const todayStr=part('year')+'-'+part('month')+'-'+part('day');
            const monthStart=todayStr.slice(0,7)+'-01';
            const monthStartUtc=new Date(monthStart+'T00:00:00+03:00').toISOString();
            const {data,error}=await supabase.from('geo_attendance_logs')
                .select('student_id,unit_name,block,program,check_in_time,attendance_status,status,session_type,location_name,location_address,location_friendly_name')
                .in('student_id',ids).in('unit_name',names).eq('program',this.getCurrentProgram()).gte('check_in_time',monthStartUtc);
            if(error)throw error;
            const enrollmentKeys=this.assignedEnrollmentKeys||new Set();
            const logs=(data||[]).filter(x=>keys.has(norm(x.unit_name)+'|'+norm(x.block))&&enrollmentKeys.has(String(x.student_id)+'|'+norm(x.unit_name)+'|'+norm(x.block)));
            const kenyaDate=value=>new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Nairobi',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
            const status=x=>norm(x.attendance_status||x.status);
            const todayLogs=logs.filter(x=>x.check_in_time&&kenyaDate(x.check_in_time)===todayStr);
            const checkedToday=new Set(todayLogs.map(x=>String(x.student_id)));
            const presentToday=new Set(todayLogs.filter(x=>['present','verified'].includes(status(x))).map(x=>String(x.student_id)));
            const absentToday=new Set(todayLogs.filter(x=>status(x)==='absent').map(x=>String(x.student_id)));
            this.attendanceMetrics.today=checkedToday.size;
            this.attendanceMetrics.present=presentToday.size;
            this.attendanceMetrics.absent=absentToday.size;
            this.attendanceMetrics.pending=Math.max(0,ids.length-checkedToday.size);
            this.attendanceMetrics.lectureCount=todayLogs.filter(x=>norm(x.session_type)==='lecture'||norm(x.session_type)==='class').length;
            this.attendanceMetrics.clinicalCount=todayLogs.filter(x=>norm(x.session_type)==='clinical').length;
            this.attendanceMetrics.labCount=todayLogs.filter(x=>norm(x.session_type)==='lab').length;
            this.attendanceMetrics.campusCount=todayLogs.filter(x=>norm(x.location_name||x.location_friendly_name||x.location_address).includes('kiamunyi')).length;
            this.attendanceMetrics.hospitalCount=todayLogs.filter(x=>norm(x.location_name||x.location_friendly_name||x.location_address).includes('hospital')).length;
            const weekStart=new Date(now);weekStart.setHours(0,0,0,0);const dow=(weekStart.getDay()+6)%7;weekStart.setDate(weekStart.getDate()-dow);
            const weekStartKey=kenyaDate(weekStart);
            this.attendanceMetrics.week=logs.filter(x=>x.check_in_time&&kenyaDate(x.check_in_time)>=weekStartKey).length;
            const monthPresent=logs.filter(x=>['present','verified'].includes(status(x))).length;
            const monthAbsent=logs.filter(x=>status(x)==='absent').length;
            this.attendanceMetrics.month=monthPresent+monthAbsent?Math.round(monthPresent/(monthPresent+monthAbsent)*100):0;
            this.attendanceMetrics.overall=logs.length;
            this.updateAttendanceMetricsUI();
        }catch(error){console.error('[Lecturer Dashboard] Assigned-unit attendance metrics failed:',error);}
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
        const supabase = this.getSupabaseClient();
        const students = this.assignedStudents || [];
        const studentIds = [...new Set(students.map(s => String(s.user_id || '').trim()).filter(Boolean))];
        if (!supabase || !studentIds.length) {
            this.clinicalMetrics = {percent:0,completed:0,required:0,onTrack:0,atRisk:0,critical:0};
            this.updateClinicalUI(0,0,0,0,0);
            const requiredEl=document.getElementById('clinicalHoursRequired');
            if(requiredEl) requiredEl.textContent='0';
            return;
        }
        try {
            const {data:logs,error}=await supabase.from('clinical_hours_logs')
                .select('student_id,hours_completed,hours_required,verified')
                .in('student_id',studentIds).eq('program',this.getCurrentProgram()).eq('verified',true);
            if(error) throw error;
            const hoursByStudent=new Map(studentIds.map(id=>[id,0]));
            const requiredByStudent=new Map(studentIds.map(id=>[id,1500]));
            (logs||[]).forEach(log=>{
                const id=String(log.student_id||'');
                if(!hoursByStudent.has(id))return;
                hoursByStudent.set(id,hoursByStudent.get(id)+Math.max(0,Number(log.hours_completed)||0));
                const required=Math.max(0,Number(log.hours_required)||1500);
                requiredByStudent.set(id,Math.max(requiredByStudent.get(id),required));
            });
            const totalHours=[...hoursByStudent.values()].reduce((a,b)=>a+b,0);
            const totalRequired=[...requiredByStudent.values()].reduce((a,b)=>a+b,0);
            const percent=totalRequired?Math.min(100,Math.round(totalHours/totalRequired*100)):0;
            let onTrack=0,atRisk=0,critical=0;
            hoursByStudent.forEach((hours,id)=>{
                const target=requiredByStudent.get(id)||1500;
                const pct=target?hours/target*100:0;
                if(pct>=80)onTrack++;else if(pct>=60)atRisk++;else critical++;
            });
            this.clinicalMetrics={percent,completed:totalHours,required:totalRequired,onTrack,atRisk,critical};
            this.updateClinicalUI(percent,Math.round(totalHours),onTrack,atRisk,critical);
            const requiredEl=document.getElementById('clinicalHoursRequired');
            if(requiredEl)requiredEl.textContent=totalRequired.toLocaleString();
        } catch(error) {
            console.error('[Lecturer Dashboard] Verified clinical hours failed:',error);
            const pctEl=document.getElementById('clinicalHoursPercent');
            if(pctEl)pctEl.textContent='—';
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
        const supabase=this.getSupabaseClient();
        const students=this.assignedStudents||[];
        const units=this.assignedUnits||[];
        const studentIds=[...new Set(students.map(s=>String(s.user_id||'').trim()).filter(Boolean))];
        const unitNames=[...new Set(units.map(u=>String(u.subject_name||'').trim()).filter(Boolean))];
        const norm=v=>String(v||'').trim().toLowerCase();
        const unitKeys=new Set(units.map(u=>norm(u.subject_name)+'|'+norm(u.block)));
        if(!supabase||!studentIds.length||!units.length){this.riskMetrics={high:0,medium:0,low:0,students:[]};this.updateRiskUI([],0,0,0);return;}
        try{
            const [attendanceResult,marksResult]=await Promise.all([
                supabase.from('geo_attendance_logs').select('student_id,unit_name,block,attendance_status,status').in('student_id',studentIds).in('unit_name',unitNames).eq('program',this.getCurrentProgram()),
                supabase.from('student_marks').select('student_id,admission_number,subject_name,block,final_score,published,approval_status,updated_at,created_at').in('subject_name',unitNames).eq('program',this.getCurrentProgram()).eq('published',true).eq('approval_status','approved')
            ]);
            if(attendanceResult.error)throw attendanceResult.error;
            if(marksResult.error)throw marksResult.error;
            const enrollmentKeys=this.assignedEnrollmentKeys||new Set();
            const attendance=(attendanceResult.data||[]).filter(a=>unitKeys.has(norm(a.unit_name)+'|'+norm(a.block))&&enrollmentKeys.has(String(a.student_id)+'|'+norm(a.unit_name)+'|'+norm(a.block)));
            const marks=(marksResult.data||[]).filter(m=>unitKeys.has(norm(m.subject_name)+'|'+norm(m.block))&&this.isMarkForAssignedRegistration(m)&&Number.isFinite(Number(m.final_score)));
            const latestMarks=new Map();
            marks.forEach(m=>{
                const key=String(m.admission_number||m.student_id||'')+'|'+norm(m.subject_name)+'|'+norm(m.block);
                const old=latestMarks.get(key);
                if(!old||new Date(m.updated_at||m.created_at||0)>new Date(old.updated_at||old.created_at||0))latestMarks.set(key,m);
            });
            const rows=studentIds.map(id=>{
                const student=students.find(s=>String(s.user_id)===id);
                const absences=attendance.filter(a=>String(a.student_id)===id&&norm(a.attendance_status||a.status)==='absent').length;
                const studentAdmission=String(student?.student_id||student?.admission_number||'').trim();
                const studentMarks=[...latestMarks.values()].filter(m=>String(m.student_id||'')===id||String(m.admission_number||'').trim()===studentAdmission);
                const avg=studentMarks.length?studentMarks.reduce((sum,m)=>sum+Number(m.final_score),0)/studentMarks.length:null;
                const expected=Math.max(1,Number(student?.unit_count)||1);
                const coverage=Math.min(100,studentMarks.length/expected*100);
                const missingPenalty=(100-coverage)*0.3;
                const scorePenalty=avg===null?20:Math.max((this.getPassingThreshold()-avg)*1.2,0);
                const riskScore=Math.round(Math.min(100,Math.min(absences*10,50)+scorePenalty+missingPenalty));
                return {id,name:student?.full_name||'Unknown',absences,avgScore:avg===null?null:Math.round(avg),submissionRate:Math.round(coverage),riskScore,riskLevel:riskScore>50?'high':riskScore>25?'medium':'low',isPassing:avg!==null&&avg>=this.getPassingThreshold(),hasMarks:avg!==null};
            });
            this.riskMetrics.high=rows.filter(x=>x.riskLevel==='high').length;
            this.riskMetrics.medium=rows.filter(x=>x.riskLevel==='medium').length;
            this.riskMetrics.low=rows.filter(x=>x.riskLevel==='low').length;
            this.riskMetrics.students=rows.sort((a,b)=>b.riskScore-a.riskScore);
            this.updateRiskUI(rows,this.riskMetrics.high,this.riskMetrics.medium,this.riskMetrics.low);
        }catch(error){console.error('[Lecturer Dashboard] Assigned-unit risk calculation failed:',error);const el=document.getElementById('studentsAtRiskCountPanel');if(el)el.textContent='—';}
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
                    <span style="font-size: 11px; font-weight: 600; color: ${s.hasMarks ? (s.isPassing ? '#10b981' : '#ef4444') : '#64748b'};">${s.hasMarks ? s.avgScore + '% ' + passingEmoji : 'No published marks'}</span>
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
        const container=document.getElementById('courseProgressList');
        if(!container)return;
        const supabase=this.getSupabaseClient();
        const students=this.assignedStudents||[];
        const units=this.assignedUnits||[];
        const ids=[...new Set(students.map(s=>String(s.user_id||'').trim()).filter(Boolean))];
        if(!supabase||!ids.length||!units.length){container.innerHTML='<p class="nrd-empty">No assigned-unit results available.</p>';return;}
        const norm=v=>String(v||'').trim().toLowerCase();
        const threshold=this.getPassingThreshold();
        try{
            const rows=await Promise.all(units.map(async unit=>{
                const [regResult,markResult]=await Promise.all([
                    supabase.from('student_unit_registrations').select('student_id').in('student_id',ids).eq('program',this.getCurrentProgram()).eq('unit_name',unit.subject_name).eq('block',unit.block).in('status',['approved','completed']),
                    supabase.from('student_marks').select('student_id,admission_number,final_score,published,approval_status,updated_at,created_at').eq('program',this.getCurrentProgram()).eq('subject_name',unit.subject_name).eq('block',unit.block).eq('published',true).eq('approval_status','approved')
                ]);
                if(regResult.error)throw regResult.error;if(markResult.error)throw markResult.error;
                const enrolled=new Set((regResult.data||[]).map(x=>String(x.student_id)));
                const latest=new Map();
                (markResult.data||[]).forEach(m=>{
                    const score=Number(m.final_score);if(!Number.isFinite(score)||score<0||score>100||!this.isMarkForAssignedRegistration(m))return;
                    const id=String(m.student_id||m.admission_number||'').trim(),old=latest.get(id);
                    if(!old||new Date(m.updated_at||m.created_at||0)>new Date(old.updated_at||old.created_at||0))latest.set(id,m);
                });
                const scores=[...latest.values()].map(x=>Number(x.final_score));
                return {unit:unit.subject_name,avg:scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):null,students:enrolled.size,marked:scores.length,completion:enrolled.size?Math.round(scores.length/enrolled.size*100):0,passRate:scores.length?Math.round(scores.filter(x=>x>=threshold).length/scores.length*100):null};
            }));
            container.innerHTML=rows.map(p=>{
                const color=p.avg===null?'#94a3b8':p.avg>=threshold?'#16a34a':'#d97706';
                const status=p.avg===null?'Pending':p.avg>=threshold?'On track':'Needs review';
                return '<div class="nrd-course-progress-row" style="margin-bottom:10px;padding:10px 12px;border:1px solid #e5e7eb;border-radius:10px"><div style="display:flex;justify-content:space-between;gap:8px;font-size:12px;margin-bottom:6px"><strong>'+String(p.unit).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))+'</strong><b style="color:'+color+'">'+(p.avg===null?'No published marks':p.avg+'% · '+status)+'</b></div><div style="height:7px;background:#e5e7eb;border-radius:8px;overflow:hidden"><div style="height:100%;width:'+p.completion+'%;background:'+color+'"></div></div><div style="display:flex;justify-content:space-between;font-size:9px;color:#64748b;margin-top:5px"><span>'+p.marked+'/'+p.students+' marked</span><span>'+(p.passRate===null?'—':p.passRate+'% passing')+'</span></div></div>';
            }).join('');
        }catch(error){console.error('[Lecturer Dashboard] Unit progress query failed:',error);container.innerHTML='<p class="nrd-empty">Unable to load unit performance.</p>';}
    },

    // ─── LOAD TOP STUDENTS ───
    async loadTopStudents() {
        const container=document.getElementById('topStudentsList');
        if(!container)return;
        const supabase=this.getSupabaseClient(),students=this.assignedStudents||[],units=this.assignedUnits||[];
        const ids=[...new Set(students.map(s=>String(s.user_id||'').trim()).filter(Boolean))];
        const names=[...new Set(units.map(u=>String(u.subject_name||'').trim()).filter(Boolean))];
        const norm=v=>String(v||'').trim().toLowerCase(),keys=new Set(units.map(u=>norm(u.subject_name)+'|'+norm(u.block)));
        if(!supabase||!ids.length||!names.length){container.innerHTML='<div class="nrd-empty">No assigned students yet.</div>';return;}
        try{
            const {data,error}=await supabase.from('student_marks').select('student_id,admission_number,student_name,subject_name,block,final_score,published,approval_status,updated_at,created_at').in('subject_name',names).eq('program',this.getCurrentProgram()).eq('published',true).eq('approval_status','approved');
            if(error)throw error;
            const latest=new Map();
            (data||[]).forEach(m=>{
                const score=Number(m.final_score),key=String(m.admission_number||m.student_id||'')+'|'+norm(m.subject_name)+'|'+norm(m.block);
                if(!keys.has(norm(m.subject_name)+'|'+norm(m.block))||!this.isMarkForAssignedRegistration(m)||!Number.isFinite(score)||score<0||score>100)return;
                const old=latest.get(key);if(!old||new Date(m.updated_at||m.created_at||0)>new Date(old.updated_at||old.created_at||0))latest.set(key,m);
            });
            const aggregate=new Map();
            latest.forEach(m=>{const id=String(m.admission_number||m.student_id||'').trim(),matchedStudent=students.find(s=>String(s.user_id)===id||String(s.student_id||'').trim()===id||String(s.admission_number||'').trim()===id),entry=aggregate.get(id)||{name:m.student_name||matchedStudent?.full_name||'Student',scores:[]};entry.scores.push(Number(m.final_score));aggregate.set(id,entry);});
            const top=[...aggregate.values()].map(x=>({...x,avg:x.scores.reduce((a,b)=>a+b,0)/x.scores.length,units:x.scores.length})).sort((a,b)=>b.avg-a.avg).slice(0,5);
            container.innerHTML=top.length?top.map((x,i)=>'<div style="display:flex;align-items:center;gap:9px;padding:7px 0;border-bottom:1px solid #eef1f5"><b style="width:20px">'+(['🥇','🥈','🥉'][i]||String(i+1))+'</b><div style="flex:1;min-width:0"><strong style="font-size:10px">'+x.name+'</strong><div style="font-size:8px;color:#667085">'+x.units+' assigned units with published results</div></div><b style="font-size:13px;color:#15803d">'+Math.round(x.avg)+'%</b></div>').join(''):'<div class="nrd-empty">No approved and published marks yet.</div>';
        }catch(error){console.error('[Lecturer Dashboard] Top students failed:',error);container.innerHTML='<div class="nrd-empty">Unable to load top performers.</div>';}
    },

    // ─── LOAD ATTENDANCE ALERTS ───
    async loadAttendanceAlerts() {
        const container=document.getElementById('attendanceAlerts');
        if(!container)return;
        const supabase=this.getSupabaseClient(),students=this.assignedStudents||[],units=this.assignedUnits||[];
        const ids=[...new Set(students.map(s=>String(s.user_id||'').trim()).filter(Boolean))];
        const names=[...new Set(units.map(u=>String(u.subject_name||'').trim()).filter(Boolean))];
        const norm=v=>String(v||'').trim().toLowerCase();
        const keys=new Set(units.map(u=>norm(u.subject_name)+'|'+norm(u.block)));
        if(!supabase||!ids.length||!names.length){container.innerHTML='<p class="nrd-empty">No assigned students.</p>';return;}
        try{
            const since=new Date(Date.now()-7*86400000).toISOString();
            const {data,error}=await supabase.from('geo_attendance_logs').select('student_id,student_name,unit_name,block,attendance_status,status,check_in_time').in('student_id',ids).in('unit_name',names).eq('program',this.getCurrentProgram()).gte('check_in_time',since);
            if(error)throw error;
            const counts=new Map();
            (data||[]).forEach(row=>{
                if(!keys.has(norm(row.unit_name)+'|'+norm(row.block))||!(this.assignedEnrollmentKeys||new Set()).has(String(row.student_id)+'|'+norm(row.unit_name)+'|'+norm(row.block))||norm(row.attendance_status||row.status)!=='absent')return;
                const id=String(row.student_id),current=counts.get(id)||{name:row.student_name||students.find(s=>String(s.user_id)===id)?.full_name||'Student',count:0};
                current.count++;counts.set(id,current);
            });
            const alerts=[...counts.entries()].filter(([,x])=>x.count>2).sort((a,b)=>b[1].count-a[1].count).slice(0,5);
            container.innerHTML=alerts.length?alerts.map(([,x])=>'<div style="display:flex;align-items:center;gap:8px;padding:7px 9px;background:#fff1f1;border-radius:8px;margin-bottom:6px"><strong style="flex:1;font-size:10px">'+x.name+'</strong><b style="font-size:9px;color:#b42318">'+x.count+' absences / 7 days</b></div>').join(''):'<div class="nrd-empty">No repeated absences in assigned units this week.</div>';
        }catch(error){console.error('[Lecturer Dashboard] Attendance alerts failed:',error);container.innerHTML='<div class="nrd-empty">Attendance alerts unavailable.</div>';}
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
        const container=document.getElementById('recentActivityList');
        if(!container)return;
        const supabase=this.getSupabaseClient(),students=this.assignedStudents||[],units=this.assignedUnits||[];
        const ids=[...new Set(students.map(s=>String(s.user_id||'').trim()).filter(Boolean))];
        const names=[...new Set(units.map(u=>String(u.subject_name||'').trim()).filter(Boolean))];
        const norm=v=>String(v||'').trim().toLowerCase(),keys=new Set(units.map(u=>norm(u.subject_name)+'|'+norm(u.block)));
        if(!supabase||!ids.length||!units.length){container.innerHTML='<div class="nrd-empty">No assigned-unit activity available.</div>';return;}
        try{
            const program=this.getCurrentProgram();
            const [att,exams,sessions,assignments]=await Promise.all([
                supabase.from('geo_attendance_logs').select('student_id,student_name,unit_name,block,session_type,check_in_time').in('student_id',ids).in('unit_name',names).eq('program',program).order('check_in_time',{ascending:false}).limit(20),
                supabase.from('exams').select('exam_name,title,course_name,course_code,block,created_at,target_program').eq('target_program',program).order('created_at',{ascending:false}).limit(20),
                supabase.from('scheduled_sessions').select('session_title,title,unit_name,course_name,block,created_at,target_program,lecturer_staff_id,lecturer_id').eq('target_program',program).order('created_at',{ascending:false}).limit(20),
                supabase.from('online_assignments').select('title,unit_name,unit_code,block,created_at,program,created_by').eq('created_by',this.lecturerUuid).eq('program',program).order('created_at',{ascending:false}).limit(10)
            ]);
            const activities=[];
            if(!att.error)(att.data||[]).filter(x=>keys.has(norm(x.unit_name)+'|'+norm(x.block))&&(this.assignedEnrollmentKeys||new Set()).has(String(x.student_id)+'|'+norm(x.unit_name)+'|'+norm(x.block))).forEach(x=>activities.push({icon:'fa-clipboard-check',color:'#10b981',message:(x.student_name||'Student')+' checked in · '+x.unit_name,time:x.check_in_time}));
            if(!exams.error)(exams.data||[]).filter(x=>keys.has(norm(x.course_name||x.exam_name||x.title)+'|'+norm(x.block))).forEach(x=>activities.push({icon:'fa-file-alt',color:'#8b5cf6',message:'Exam created · '+(x.exam_name||x.title||x.course_name),time:x.created_at}));
            if(!sessions.error)(sessions.data||[]).filter(x=>keys.has(norm(x.unit_name||x.course_name)+'|'+norm(x.block))).forEach(x=>activities.push({icon:'fa-calendar-plus',color:'#f59e0b',message:'Teaching session scheduled · '+(x.session_title||x.title||x.unit_name),time:x.created_at}));
            if(!assignments.error)(assignments.data||[]).forEach(x=>activities.push({icon:'fa-file-lines',color:'#0875ee',message:'Assignment created · '+x.title,time:x.created_at}));
            activities.sort((a,b)=>new Date(b.time||0)-new Date(a.time||0));
            container.innerHTML=activities.length?activities.slice(0,6).map(x=>'<div style="display:flex;align-items:center;gap:9px;padding:7px 0;border-bottom:1px solid #eef1f5"><span style="width:27px;height:27px;display:grid;place-items:center;border-radius:8px;background:'+x.color+'18;color:'+x.color+'"><i class="fas '+x.icon+'"></i></span><div style="flex:1;min-width:0"><div style="font-size:9px;color:#344054">'+x.message+'</div><small style="font-size:8px;color:#98a2b3">'+(x.time?this.timeAgo(new Date(x.time)):'')+'</small></div></div>').join(''):'<div class="nrd-empty">No recent activity in your assigned units.</div>';
        }catch(error){console.error('[Lecturer Dashboard] Scoped recent activity failed:',error);container.innerHTML='<div class="nrd-empty">Activity feed unavailable.</div>';}
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
                    .select('student_id,admission_number,subject_name,block,final_score,published,approval_status,updated_at,created_at')
                    .in('subject_name', [...new Set((this.assignedUnits || []).map(u => String(u.subject_name || '').trim()).filter(Boolean))])
                    .eq('program', program);
                marksData = marks || [];
            }

            const normChart = value => String(value || '').trim().toLowerCase();
            const assignedUnitKeys = new Set((this.assignedUnits || []).map(u =>
                normChart(u.subject_name) + '|' + normChart(u.block)
            ));
            const latestPublished = new Map();
            marksData.forEach(m => {
                const score=Number(m.final_score ?? m.score);
                const key=normChart(m.subject_name)+'|'+normChart(m.block);
                if(m.published!==true||normChart(m.approval_status)!=='approved'||!assignedUnitKeys.has(key)||!this.isMarkForAssignedRegistration(m)||!Number.isFinite(score)||score<0||score>100)return;
                const rowKey=String(m.admission_number||m.student_id||'')+'|'+key,old=latestPublished.get(rowKey);
                if(!old||new Date(m.updated_at||m.created_at||0)>new Date(old.updated_at||old.created_at||0))latestPublished.set(rowKey,m);
            });
            const validPublishedMarks=[...latestPublished.values()];
            const scores=validPublishedMarks.map(m=>Number(m.final_score ?? m.score));
            const gradeBands=this.isTVET?[80,65,50]:[75,65,60];
            const gradeBuckets=[
                scores.filter(score=>score>=gradeBands[0]).length,
                scores.filter(score=>score>=gradeBands[1]&&score<gradeBands[0]).length,
                scores.filter(score=>score>=gradeBands[2]&&score<gradeBands[1]).length,
                scores.filter(score=>score<gradeBands[2]).length
            ];
            const averageScore=scores.length?Math.round(scores.reduce((sum,score)=>sum+score,0)/scores.length):null;
            const legendValues=['nrdGradeDistinction','nrdGradeCredit','nrdGradePass','nrdGradeFail'];
            legendValues.forEach((id,index)=>{const el=document.getElementById(id);if(el)el.textContent=gradeBuckets[index];});
            const legendLabels=this.isTVET?['Distinction (≥80%)','Credit (65–79%)','Pass (50–64%)','Below 50%']:['Distinction (≥75%)','Credit (65–74%)','Pass (60–64%)','Below 60%'];
            document.querySelectorAll('#nrdGradeLegend .nrd-grade-label').forEach((el,index)=>{if(legendLabels[index])el.textContent=legendLabels[index];});
            const totalEl=document.getElementById('nrdGradeTotal');
            if(totalEl)totalEl.textContent=scores.length?'Approved & published results: '+scores.length:'No approved and published marks yet';
            const averageEl=document.getElementById('nrdPerformanceAverage');
            if(averageEl)averageEl.textContent=averageScore===null?'—':averageScore+'%';
            const unitAverageEl=document.getElementById('liUnitAverage');
            if(unitAverageEl)unitAverageEl.textContent=averageScore===null?'—':averageScore+'%';

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

                const normAttendance=value=>String(value||'').trim().toLowerCase();
                const assignedStudentIds=[...new Set((this.assignedStudents||[]).map(s=>String(s.user_id||'').trim()).filter(Boolean))];
                const assignedNames=[...new Set((this.assignedUnits||[]).map(u=>String(u.subject_name||'').trim()).filter(Boolean))];
                const assignedKeys=new Set((this.assignedUnits||[]).map(u=>normAttendance(u.subject_name)+'|'+normAttendance(u.block)));
                const chartDays=[];
                for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);d.setHours(0,0,0,0);chartDays.push(d);}
                const weekDays=chartDays.map(d=>d.toLocaleDateString('en-KE',{weekday:'short',timeZone:'Africa/Nairobi'}));
                const attendanceResults=await Promise.all(chartDays.map(async day=>{
                    const start=day.toISOString(),end=new Date(day.getTime()+86400000).toISOString();
                    if(!assignedStudentIds.length||!assignedNames.length)return {count:0};
                    const {data,error}=await supabase.from('geo_attendance_logs')
                        .select('student_id,unit_name,block,attendance_status,status,check_in_time')
                        .in('student_id',assignedStudentIds).in('unit_name',assignedNames).eq('program',program)
                        .gte('check_in_time',start).lt('check_in_time',end);
                    if(error)throw error;
                    const enrollmentKeys=this.assignedEnrollmentKeys||new Set();
                    const present=new Set((data||[]).filter(row=>assignedKeys.has(normAttendance(row.unit_name)+'|'+normAttendance(row.block))&&enrollmentKeys.has(String(row.student_id)+'|'+normAttendance(row.unit_name)+'|'+normAttendance(row.block))&&['present','verified'].includes(normAttendance(row.attendance_status||row.status))).map(row=>String(row.student_id)));
                    return {count:present.size};
                }));
                const attendanceData=attendanceResults.map(x=>x.count);

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
