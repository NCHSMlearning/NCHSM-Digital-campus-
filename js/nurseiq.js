// ============================================================
// 📚 NURSEIQ MODULE - COMPLETE FIXED VERSION
// ✅ Instant student data loading (like Finance Module)
// ✅ Auto-detects program type (KRCHN/TVET)
// ✅ Auto-detects level (Certificate/Diploma)
// ✅ Questions grouped by course (Medical Surgical together)
// ✅ Latest question banks on top
// ✅ Full TVET/KRCHN support with dynamic program detection
// ✅ Filter order: Years → Levels → Categories
// ✅ Points calculation: 2 points per correct answer
// ✅ Points display in stats
// ✅ SAVES TO DATABASE (user_progress, nurseiq_attempts, profile)
// ✅ SHOWS ALREADY ANSWERED QUESTIONS (green/red indicators)
// ============================================================

// ============================================================
// TVET PROGRAM CODES & DISPLAY NAMES
// ============================================================
const TVET_PROGRAMS = [
    'DPOTT', 'DCH', 'DHRIT', 'DSL', 'DSW', 'DCJS', 'DHSS', 'DICT', 'DME',
    'CPOTT', 'CCH', 'CHRIT', 'CPC', 'CSL', 'CSW', 'CCJS', 'CAG', 'CHSS', 'CICT',
    'ACH', 'AAG', 'ASW', 'CCA', 'PTE'
];

const PROGRAM_DISPLAY_NAMES = {
    'KRCHN': 'KRCHN Nursing',
    'DPOTT': 'Diploma in Perioperative Theatre Technology',
    'DCH': 'Diploma in Community Health',
    'DHRIT': 'Diploma in Health Records and IT',
    'DSL': 'Diploma in Science Lab',
    'DSW': 'Diploma in Social Work & Community Development',
    'DCJS': 'Diploma in Criminal Justice',
    'DHSS': 'Diploma in Health Support Services',
    'DICT': 'Diploma in ICT',
    'DME': 'Diploma in Medical Engineering',
    'CPOTT': 'Certificate in Perioperative Theatre Technology',
    'CCH': 'Certificate in Community Health',
    'CHRIT': 'Certificate in Health Records and IT',
    'CPC': 'Certificate in Patient Care',
    'CSL': 'Certificate in Science Lab',
    'CSW': 'Certificate in Social Work & Community Development',
    'CCJS': 'Certificate in Criminal Justice',
    'CAG': 'Certificate in Agriculture',
    'CHSS': 'Certificate in Health Support Services',
    'CICT': 'Certificate in ICT',
    'ACH': 'Artisan in Community Health',
    'AAG': 'Artisan in Agriculture',
    'ASW': 'Artisan in Social Work & Community Development',
    'CCA': 'Certificate in Computer Applications',
    'PTE': 'TVET/CDACC (PTE)'
};

// ============================================================
// 🏷️ PROGRAM DETECTION - SAME AS FINANCE MODULE
// ============================================================

function getProgramType(program) {
    if (!program) return 'KRCHN';
    const krchnPrograms = ['KRCHN'];
    if (krchnPrograms.includes(program.toUpperCase())) return 'KRCHN';
    return 'TVET';
}

function getProgramLevel(programCode) {
    if (!programCode) return 'diploma';
    const certificatePrograms = ['CCH', 'CPOTT', 'CHRIT', 'CPC', 'CSL', 'CSW', 'CCJS', 'CAG', 'CHSS', 'CICT', 'CCA', 'ACH', 'AAG', 'ASW', 'HSS', 'CNA', 'Caregiving', 'Nursing Assistant', 'Health Service Support'];
    if (certificatePrograms.includes(programCode) || certificatePrograms.includes(programCode.toUpperCase())) {
        return 'certificate';
    }
    return 'diploma';
}

function getProgramDisplayName(programCode) {
    if (!programCode) return 'KRCHN Nursing';
    const upperCode = programCode.toUpperCase();
    return PROGRAM_DISPLAY_NAMES[upperCode] || upperCode;
}

function isTVETProgram(programCode) {
    if (!programCode) return false;
    const upperCode = programCode.toUpperCase();
    return TVET_PROGRAMS.includes(upperCode) || upperCode === 'TVET';
}

// ============================================================
// 👤 GET USER DATA - SAME AS FINANCE MODULE
// ============================================================

function getCurrentUserData() {
    let user = window.currentUserProfile || window.currentUser || window.user;
    if (user) {
        console.log('👤 User found in window:', user.full_name || user.name);
        return user;
    }
    try {
        const stored = localStorage.getItem('nchsm_user');
        if (stored) {
            user = JSON.parse(stored);
            console.log('👤 User loaded from localStorage:', user.full_name || user.name);
            return user;
        }
    } catch (e) {}
    try {
        const stored = localStorage.getItem('userProfile');
        if (stored) {
            user = JSON.parse(stored);
            console.log('👤 User loaded from userProfile:', user.full_name || user.name);
            return user;
        }
    } catch (e) {}
    console.warn('⚠️ No user found');
    return null;
}

function getCurrentUserId() {
    const user = getCurrentUserData();
    if (user) {
        return user.id || user.user_id || user.student_id || null;
    }
    return null;
}

// ============================================================
// 📊 NURSEIQ MODULE - MAIN CLASS
// ============================================================

class NurseIQModule {
    constructor() {
        this.user = getCurrentUserData();
        this.userId = getCurrentUserId();
        
        const program = this.user?.program || this.user?.program_code || 'KRCHN';
        this.programType = getProgramType(program);
        this.programLevel = getProgramLevel(program);
        this.programCode = program.toUpperCase();
        this.programDisplayName = getProgramDisplayName(program);
        this.isTVETStudent = isTVETProgram(program);
        this.intakeYear = this.user?.intake_year || this.user?.intake || '2026';
        this.userBlock = this.user?.block || this.user?.current_block || 'Introductory';
        
        this.currentProgram = this.isTVETStudent ? 'tvet' : 'nursing';
        
        console.log(`🚀 NurseIQ Module initialized`);
        console.log(`👤 User: ${this.user?.full_name || this.user?.name || 'Student'}`);
        console.log(`📚 Program: ${this.programCode} (${this.programType})`);
        console.log(`📊 Level: ${this.programLevel}`);
        console.log(`🏷️ Type: ${this.isTVETStudent ? 'TVET' : 'KRCHN Nursing'}`);
        
        // DOM elements
        this.studentQuestionBankSearch = null;
        this.nurseiqSearchBtn = null;
        this.clearSearchBtn = null;
        this.loadCourseCatalogBtn = null;
        this.studentQuestionBankLoading = null;
        this.studentQuestionBankContent = null;
        this.nurseiqStatsBar = null;
        this.nurseiqQuickStats = null;
        
        // Stats elements
        this.nurseiqTotalQuestions = null;
        this.nurseiqTotalCourses = null;
        this.nurseiqAccuracy = null;
        this.nurseiqPoints = null;
        this.nurseiqProgressPercent = null;
        this.nurseiqProgressBar = null;
        this.nurseiqAnswered = null;
        this.nurseiqCorrect = null;
        this.nurseiqAccuracyQuick = null;
        this.nurseiqStreakQuick = null;
        this.streakDisplay = null;
        
        // Catalog elements
        this.catalogCount = null;
        this.catalogLastUpdated = null;
        this.catalogStudentProgram = null;
        
        // Welcome elements
        this.totalQuestionsWelcome = null;
        this.totalCoursesWelcome = null;
        this.welcomeProgramInfo = null;
        this.welcomeStudentProgram = null;
        this.loadingProgramDisplay = null;
        
        // Test state
        this.currentTestQuestions = [];
        this.currentQuestionIndex = 0;
        this.userTestAnswers = {};
        this.currentCourseForTest = null;
        this.currentCourseQuestions = [];
        this.showAnswersMode = true;
        this.initialized = false;
        this.storageKey = 'nurseiq_user_progress';
        this.lastCourseProgressKey = 'nurseiq_last_course';
        this.progressVersion = '2.0';
        this.dashboardMetricsKey = 'nurseiq_dashboard_metrics';
        this.saveTimeout = null;
        this._isSaving = false;
        this._isLoadingQuestions = false;
        this._dbSaveAttempted = false;

        this.examReviewState = {
            points: 0,
            viewedQuestionIds: [],
            viewedQuestionIdsByAttempt: {}
        };
        this.currentExamReview = null;
        this.releasedExamReviews = [];
        this.completedExamCount = 0;
        this._examReviewBound = false;
    }
    
    // ============================================================
    // 🔧 GET OPTION TEXT
    // ============================================================
    getOptionText(index) {
        const question = this.currentCourseQuestions[this.currentQuestionIndex];
        if (!question) return 'Option';
        
        const options = [];
        if (question.option_a && question.option_a.trim() !== '') options.push(question.option_a);
        if (question.option_b && question.option_b.trim() !== '') options.push(question.option_b);
        if (question.option_c && question.option_c.trim() !== '') options.push(question.option_c);
        if (question.option_d && question.option_d.trim() !== '') options.push(question.option_d);
        
        if (index >= 0 && index < options.length) {
            return options[index];
        }
        return 'Option ' + String.fromCharCode(65 + index);
    }
    
    // ============================================================
    // 🔧 GET SUPABASE CLIENT
    // ============================================================
    getSupabaseClient() {
        return window.supabaseClient || (window.db?.supabase) || null;
    }
    
    // ============================================================
    // 🔔 SHOW NOTIFICATION
    // ============================================================
    showNotification(message, type = 'info') {
        const colors = {
            success: '#10b981',
            error: '#dc2626',
            warning: '#f59e0b',
            info: '#4C1D95'
        };

        // NurseIQ success feedback: compact toast in the top-right corner.
        // Keep the message visually lightweight so it does not interrupt the test.
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.setAttribute('aria-live', 'polite');
            container.setAttribute('aria-atomic', 'true');
            container.style.cssText = `
                position: fixed;
                top: 18px;
                right: 18px;
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: 8px;
                z-index: 2147483647;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        } else {
            // Force the shared container into the top-right if another page style
            // has positioned it elsewhere.
            container.style.position = 'fixed';
            container.style.top = '18px';
            container.style.right = '18px';
            container.style.left = 'auto';
            container.style.bottom = 'auto';
            container.style.zIndex = '2147483647';
            container.style.pointerEvents = 'none';
        }

        const toast = document.createElement('div');
        const isSuccess = type === 'success';
        toast.style.cssText = `
            display: flex;
            align-items: center;
            gap: 9px;
            min-height: 42px;
            padding: 10px 14px;
            background: #ffffff;
            color: #17324d;
            border: 1px solid ${isSuccess ? '#a7f3d0' : '#e2e8f0'};
            border-left: 4px solid ${colors[type] || colors.info};
            border-radius: 10px;
            box-shadow: 0 8px 24px rgba(15, 23, 42, 0.16);
            max-width: min(360px, calc(100vw - 36px));
            font-size: 13px;
            font-weight: 600;
            line-height: 1.35;
            animation: nurseIQToastIn 0.25s ease-out;
            pointer-events: auto;
        `;

        const icon = document.createElement('span');
        icon.style.cssText = `
            width: 24px;
            height: 24px;
            min-width: 24px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background: ${isSuccess ? '#d1fae5' : `${colors[type] || colors.info}18`};
            color: ${colors[type] || colors.info};
            font-size: 13px;
            font-weight: 800;
        `;
        icon.textContent = isSuccess ? '✓' : (type === 'error' ? '!' : 'i');

        const text = document.createElement('span');
        text.textContent = message;

        toast.appendChild(icon);
        toast.appendChild(text);
        container.appendChild(toast);

        // Add the animation once without touching the page's existing CSS.
        if (!document.getElementById('nurseIQToastStyles')) {
            const style = document.createElement('style');
            style.id = 'nurseIQToastStyles';
            style.textContent = `
                @keyframes nurseIQToastIn {
                    from { opacity: 0; transform: translate3d(18px, -6px, 0); }
                    to { opacity: 1; transform: translate3d(0, 0, 0); }
                }
                @media (max-width: 600px) {
                    #toast-container {
                        top: 10px !important;
                        right: 10px !important;
                        left: 10px !important;
                        align-items: stretch !important;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        setTimeout(() => {
            toast.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
            toast.style.opacity = '0';
            toast.style.transform = 'translate3d(18px, -4px, 0)';
            setTimeout(() => toast.remove(), 220);
        }, type === 'success' ? 2600 : 3200);
    }
    
    // ============================================================
    // 🎯 CACHE DOM ELEMENTS
    // ============================================================
    cacheElements() {
        this.studentQuestionBankSearch = document.getElementById('studentQuestionBankSearch');
        this.nurseiqSearchBtn = document.getElementById('nurseiqSearchBtn');
        this.clearSearchBtn = document.getElementById('clearSearchBtn');
        this.loadCourseCatalogBtn = document.getElementById('loadCourseCatalogBtn');
        this.studentQuestionBankLoading = document.getElementById('studentQuestionBankLoading');
        this.studentQuestionBankContent = document.getElementById('studentQuestionBankContent');
        this.nurseiqStatsBar = document.getElementById('nurseiqStatsBar');
        this.nurseiqQuickStats = document.getElementById('nurseiqQuickStats');
        
        this.nurseiqTotalQuestions = document.getElementById('nurseiqTotalQuestions');
        this.nurseiqTotalCourses = document.getElementById('nurseiqTotalCourses');
        this.nurseiqAccuracy = document.getElementById('nurseiqAccuracy');
        this.nurseiqPoints = document.getElementById('nurseiqPoints');
        this.nurseiqProgressPercent = document.getElementById('nurseiqProgressPercent');
        this.nurseiqProgressBar = document.getElementById('nurseiqProgressBar');
        this.nurseiqAnswered = document.getElementById('nurseiqAnswered');
        this.nurseiqCorrect = document.getElementById('nurseiqCorrect');
        this.nurseiqAccuracyQuick = document.getElementById('nurseiqAccuracyQuick');
        this.nurseiqStreakQuick = document.getElementById('nurseiqStreakQuick');
        this.streakDisplay = document.getElementById('streakDisplay');
        
        this.catalogCount = document.getElementById('catalogCount');
        this.catalogLastUpdated = document.getElementById('catalogLastUpdated');
        this.catalogStudentProgram = document.getElementById('catalogStudentProgram');
        
        this.totalQuestionsWelcome = document.getElementById('totalQuestionsWelcome');
        this.totalCoursesWelcome = document.getElementById('totalCoursesWelcome');
        this.welcomeProgramInfo = document.getElementById('welcomeProgramInfo');
        this.welcomeStudentProgram = document.getElementById('welcomeStudentProgram');
        this.loadingProgramDisplay = document.getElementById('loadingProgramDisplay');
    }
    
    // ============================================================
    // 🎨 UPDATE UI FOR PROGRAM
    // ============================================================
    updateUIForProgram() {
        const isTVET = this.isTVETStudent;
        const displayName = this.programDisplayName;
        const programCode = this.programCode;
        const color = isTVET ? '#1a7a5a' : '#4C1D95';
        
        console.log(`🔄 Updating UI for: ${displayName} (${isTVET ? 'TVET' : 'Nursing'})`);
        
        const programDisplayEl = document.getElementById('studentProgramDisplay');
        if (programDisplayEl) programDisplayEl.textContent = displayName;
        
        const programCodeEl = document.getElementById('studentProgramCode');
        if (programCodeEl) programCodeEl.textContent = programCode;
        
        const intakeEl = document.getElementById('studentIntakeYear');
        if (intakeEl) intakeEl.textContent = this.intakeYear;
        
        const blockEl = document.getElementById('studentBlockTerm');
        if (blockEl) blockEl.textContent = this.userBlock;
        
        const welcomeStudentProgram = document.getElementById('welcomeStudentProgram');
        if (welcomeStudentProgram) welcomeStudentProgram.textContent = displayName;
        
        const catalogStudentProgram = document.getElementById('catalogStudentProgram');
        if (catalogStudentProgram) catalogStudentProgram.textContent = displayName;
        
        const loadingProgramDisplay = document.getElementById('loadingProgramDisplay');
        if (loadingProgramDisplay) loadingProgramDisplay.textContent = displayName;
        
        const welcomeProgramInfo = document.getElementById('welcomeProgramInfo');
        if (welcomeProgramInfo) welcomeProgramInfo.textContent = `${displayName} - ${isTVET ? 'TVET' : 'Nursing'} Program`;
        
        const titleEl = document.getElementById('nurseiqTitle');
        if (titleEl) titleEl.textContent = isTVET ? 'TVETIQ' : 'NurseIQ';
        
        const iconEl = document.getElementById('nurseiqIcon');
        if (iconEl) iconEl.className = isTVET ? 'fas fa-tools' : 'fas fa-brain';
        
        const badgeEl = document.getElementById('nurseiqSubtitleBadge');
        if (badgeEl) {
            if (isTVET) {
                badgeEl.textContent = 'TVET';
                badgeEl.style.background = '#1a7a5a';
                badgeEl.style.color = 'white';
            } else {
                badgeEl.textContent = 'KRCHN';
                badgeEl.style.background = '#FDB913';
                badgeEl.style.color = '#0A3D62';
            }
        }
        
        const subtitleEl = document.getElementById('nurseiqSubtitle');
        if (subtitleEl) {
            subtitleEl.innerHTML = `<i class="fas fa-graduation-cap"></i> Practice questions for <span id="programDisplaySubtitle">${displayName}</span> program`;
        }
        
        const indicatorText = document.getElementById('indicatorText');
        if (indicatorText) indicatorText.textContent = isTVET ? 'TVET Mode' : 'Nursing Mode';
        
        const indicatorIcon = document.getElementById('indicatorIcon');
        if (indicatorIcon) indicatorIcon.className = isTVET ? 'fas fa-tools' : 'fas fa-user-md';
        
        const switchNoteText = document.getElementById('switchNoteText');
        if (switchNoteText) switchNoteText.textContent = `Program: ${displayName}`;
        
        const programDisplayBadge = document.getElementById('programDisplayBadge');
        if (programDisplayBadge) {
            programDisplayBadge.style.display = 'inline-block';
            if (isTVET) {
                programDisplayBadge.style.background = 'rgba(26,122,90,0.2)';
                programDisplayBadge.style.color = '#1a7a5a';
            } else {
                programDisplayBadge.style.background = 'rgba(253,185,19,0.2)';
                programDisplayBadge.style.color = '#FDB913';
            }
        }
        
        const programDisplayNameEl = document.getElementById('programDisplayName');
        if (programDisplayNameEl) programDisplayNameEl.textContent = displayName;
        
        const programDisplaySubtitle = document.getElementById('programDisplaySubtitle');
        if (programDisplaySubtitle) programDisplaySubtitle.textContent = displayName;
        
        const welcomeIcon = document.getElementById('welcomeIconElement');
        if (welcomeIcon) welcomeIcon.className = isTVET ? 'fas fa-tools' : 'fas fa-book-medical';
        
        const welcomeTitle = document.getElementById('welcomeTitle');
        if (welcomeTitle) welcomeTitle.textContent = isTVET ? 'TVETIQ Question Bank' : 'NurseIQ Question Bank';
        
        const welcomeText = document.getElementById('welcomeText');
        if (welcomeText) {
            welcomeText.textContent = isTVET ? 
                `Access practice questions organized for ${displayName} program.` : 
                'Access practice questions organized by curriculum courses.';
        }
        
        const loadBtnText = document.getElementById('loadBtnText');
        if (loadBtnText) loadBtnText.textContent = isTVET ? 'Load TVET Courses' : 'Load Course Catalog';
        
        this.updateFilterOptions();
        
        if (this.nurseiqStatsBar) this.nurseiqStatsBar.style.display = 'block';
        if (this.nurseiqQuickStats) this.nurseiqQuickStats.style.display = 'grid';
        
        localStorage.setItem('nurseiq_program_mode', this.currentProgram);
        localStorage.setItem('nurseiq_program_display', displayName);
        localStorage.setItem('nurseiq_program_code', programCode);
        localStorage.setItem('nurseiq_is_tvet', String(isTVET));
        
        console.log('✅ UI updated for program:', displayName);
    }
    
    // ============================================================
    // 🔧 UPDATE FILTER OPTIONS
    // ============================================================
    updateFilterOptions() {
        const isTVET = this.isTVETStudent;
        
        const yearFilter = document.getElementById('nurseiqYearFilter');
        if (yearFilter) {
            yearFilter.innerHTML = `
                <option value="all">📅 All Years</option>
                <option value="year1">Year 1</option>
                <option value="year2">Year 2</option>
                <option value="year3">Year 3</option>
                <option value="year4">Year 4</option>
            `;
        }
        
        const levelFilter = document.getElementById('nurseiqLevelFilter');
        if (levelFilter) {
            levelFilter.innerHTML = '';
            const levels = isTVET ? [
                { value: 'all', label: '📚 All Levels' },
                { value: 'artisan', label: '🔧 Artisan' },
                { value: 'certificate', label: '📜 Certificate' },
                { value: 'diploma', label: '🎓 Diploma' },
                { value: 'higher-diploma', label: '🎓 Higher Diploma' }
            ] : [
                { value: 'all', label: '📚 All Levels' },
                { value: 'certificate', label: 'Certificate' },
                { value: 'diploma', label: 'Diploma' },
                { value: 'higher-diploma', label: 'Higher Diploma' },
                { value: 'degree', label: 'Degree' }
            ];
            levels.forEach(level => {
                const option = document.createElement('option');
                option.value = level.value;
                option.textContent = level.label;
                levelFilter.appendChild(option);
            });
        }
        
        const categoryFilter = document.getElementById('nurseiqCategoryFilter');
        if (categoryFilter) {
            categoryFilter.innerHTML = '';
            const categories = isTVET ? [
                { value: 'all', label: '📂 All Categories' },
                { value: 'tvet-core', label: '⚙️ TVET Core' },
                { value: 'tvet-electives', label: '🔧 TVET Electives' },
                { value: 'tvet-practical', label: '🛠️ Practical Skills' },
                { value: 'tvet-theory', label: '📚 Theory' },
                { value: 'tvet-clinical', label: '🏥 Clinical' }
            ] : [
                { value: 'all', label: '📂 All Categories' },
                { value: 'theory', label: '📖 Theory' },
                { value: 'practical', label: '💉 Practical' },
                { value: 'clinical', label: '🏥 Clinical' },
                { value: 'osce', label: '👨‍⚕️ OSCE' },
                { value: 'pharmacology', label: '💊 Pharmacology' },
                { value: 'anatomy', label: '🧬 Anatomy' },
                { value: 'physiology', label: '🫀 Physiology' }
            ];
            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.value;
                option.textContent = cat.label;
                categoryFilter.appendChild(option);
            });
        }
    }
    
    // ============================================================
    // 📥 LOAD USER PROGRESS
    // ============================================================
    async loadUserProgress() {
        try {
            if (!this.userId) return;
            
            // Load from localStorage first
            const savedProgress = localStorage.getItem(this.storageKey);
            if (savedProgress) {
                const parsed = JSON.parse(savedProgress);
                if (parsed.version === this.progressVersion && parsed.answers) {
                    this.userTestAnswers = parsed.answers;
                } else {
                    this.userTestAnswers = parsed;
                }
                console.log('📊 Loaded from localStorage:', Object.keys(this.userTestAnswers).length, 'answered questions');
            }
            
            // Load from database - OVERWRITE localStorage with database data
            const supabase = this.getSupabaseClient();
            if (supabase && this.userId && !this.userId.startsWith('anonymous_')) {
                const { data, error } = await supabase
                    .from('user_progress')
                    .select('progress_data')
                    .eq('user_id', this.userId)
                    .maybeSingle();
                
                if (!error && data && data.progress_data) {
                    const dbAnswers = data.progress_data.answers || {};
                    this.userTestAnswers = { ...this.userTestAnswers, ...dbAnswers };

                    const dbReview = data.progress_data.examReviewState || {};
                    this.examReviewState = {
                        points: Number(dbReview.points ?? data.progress_data.exam_review_points ?? 0) || 0,
                        viewedQuestionIds: Array.isArray(dbReview.viewedQuestionIds)
                            ? dbReview.viewedQuestionIds.map(String)
                            : [],
                        viewedQuestionIdsByAttempt:
                            dbReview.viewedQuestionIdsByAttempt &&
                            typeof dbReview.viewedQuestionIdsByAttempt === 'object'
                                ? dbReview.viewedQuestionIdsByAttempt
                                : {}
                    };

                    console.log('📊 Loaded from database, total:', Object.keys(this.userTestAnswers).length);
                    console.log('🧠 Exam review points:', this.examReviewState.points);
                    this.saveUserProgress();
                }
            }
            
            this.updateDashboardMetrics();
            
        } catch (error) {
            console.warn('Could not load user progress:', error);
        }
    }
    
    // ============================================================
    // 💾 SAVE USER PROGRESS
    // ============================================================
    saveUserProgress() {
        if (!this.userId || this.userId.startsWith('anonymous_')) return;
        
        try {
            const progressData = {
                version: this.progressVersion,
                answers: this.userTestAnswers,
                examReviewState: this.examReviewState,
                exam_review_points: Number(this.examReviewState?.points || 0),
                lastSaved: new Date().toISOString()
            };
            localStorage.setItem(this.storageKey, JSON.stringify(progressData));
            
            if (this.currentCourseForTest) {
                const lastProgress = {
                    courseId: this.currentCourseForTest.id,
                    courseName: this.currentCourseForTest.name,
                    currentIndex: this.currentQuestionIndex,
                    totalQuestions: this.currentCourseQuestions.length,
                    timestamp: new Date().toISOString()
                };
                localStorage.setItem(this.lastCourseProgressKey, JSON.stringify(lastProgress));
            }
            
            if (this.userId && !this.userId.startsWith('anonymous_')) {
                if (this.saveTimeout) clearTimeout(this.saveTimeout);
                this.saveTimeout = setTimeout(() => {
                    this.saveProgressToDatabase();
                }, 1000);
            }
            
            this.updateDashboardMetrics();
            
        } catch (error) {
            console.warn('Could not save progress:', error);
        }
    }
    
   // ============================================================
// 💾 SAVE TO DATABASE - FIXED (no ON CONFLICT)
// ============================================================
async saveProgressToDatabase() {
    if (!this.userId || this.userId.startsWith('anonymous_')) return;
    if (this._isSaving) return;
    
    this._isSaving = true;
    
    try {
        const supabase = this.getSupabaseClient();
        if (!supabase) {
            this._isSaving = false;
            return;
        }
        
        // Count correct answers for points
        let totalAnswered = 0;
        let correctAnswers = 0;
        
        Object.values(this.userTestAnswers).forEach(answer => {
            if (answer && answer.answered) {
                totalAnswered++;
                if (answer.correct) correctAnswers++;
            }
        });
        
        const practicePoints = correctAnswers * 2;
        const examReviewPoints = Number(this.examReviewState?.points || 0);

        const progressData = {
            version: this.progressVersion,
            answers: this.userTestAnswers,
            examReviewState: this.examReviewState,
            exam_review_points: examReviewPoints,
            lastSaved: new Date().toISOString(),
            stats: {
                totalAnswered,
                correctAnswers,
                points: practicePoints,
                examReviewPoints,
                totalNurseIQPoints: practicePoints + examReviewPoints,
                accuracy: totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0
            }
        };

        // 1. Save to user_progress only when the student's profile row exists.
        // user_progress.user_id has a foreign key to consolidated_user_profiles_table.user_id.
        const { data: linkedProfile, error: linkedProfileError } = await supabase
            .from('consolidated_user_profiles_table')
            .select('user_id')
            .eq('user_id', this.userId)
            .maybeSingle();

        if (linkedProfileError) {
            console.warn('⚠️ Could not verify student profile for progress save:', linkedProfileError.message || linkedProfileError);
        }

        const canPersistServerProgress = !!linkedProfile;

        if (canPersistServerProgress) {
            const { error: progressError } = await supabase
                .from('user_progress')
                .upsert({
                    user_id: this.userId,
                    progress_data: progressData,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });
            
            if (progressError) {
                console.warn('⚠️ Could not save user_progress:', progressError.message || progressError);
            } else {
                console.log('✅ Saved to user_progress');
            }
        } else {
            console.warn('⚠️ No matching consolidated profile found for this user. Keeping NurseIQ progress locally until the profile is provisioned.');
        }
        
        // 2. Save/Update nurseiq_attempts - FIXED: Check if record exists first
        if (totalAnswered > 0 && canPersistServerProgress) {
            try {
                // First check if a record exists for this student
                const { data: existing, error: checkError } = await supabase
                    .from('nurseiq_attempts')
                    .select('id')
                    .eq('student_id', this.userId)
                    .maybeSingle();
                
                if (checkError) {
                    console.warn('⚠️ Error checking nurseiq_attempts:', checkError);
                }
                
                if (existing) {
                    // Update existing record
                    const { error: updateError } = await supabase
                        .from('nurseiq_attempts')
                        .update({
                            score: correctAnswers,
                            total_questions: totalAnswered,
                            completed_at: new Date().toISOString()
                        })
                        .eq('id', existing.id);
                    
                    if (updateError) {
                        console.error('❌ Error updating nurseiq_attempts:', updateError);
                    } else {
                        console.log('✅ Updated nurseiq_attempts');
                    }
                } else {
                    // Insert new record
                    const { error: insertError } = await supabase
                        .from('nurseiq_attempts')
                        .insert([{
                            student_id: this.userId,
                            score: correctAnswers,
                            total_questions: totalAnswered,
                            completed_at: new Date().toISOString()
                        }]);
                    
                    if (insertError) {
                        console.error('❌ Error inserting nurseiq_attempts:', insertError);
                    } else {
                        console.log('✅ Inserted nurseiq_attempts');
                    }
                }
            } catch (error) {
                console.error('❌ Error with nurseiq_attempts operation:', error);
            }
        }
        
        // 3. Update consolidated_user_profiles_table
        try {
            const { data: profile } = await supabase
                .from('consolidated_user_profiles_table')
                .select('login_count, gamification_points, attendance_points')
                .eq('user_id', this.userId)
                .single();
            
            if (profile) {
                const totalNurseIQPoints = practicePoints + examReviewPoints;
                const totalPoints = (profile.login_count || 0) * 10 + 
                                   (profile.gamification_points || 0) + 
                                   (profile.attendance_points || 0) + 
                                   totalNurseIQPoints;

                const { error: profileError } = await supabase
                    .from('consolidated_user_profiles_table')
                    .update({
                        nurseiq_points: totalNurseIQPoints,
                        total_points: totalPoints,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', this.userId);

                if (profileError) {
                    console.error('❌ Error updating profile:', profileError);
                } else {
                    console.log(`✅ Profile updated: NurseIQ=${totalNurseIQPoints}, Total=${totalPoints}`);
                    this._dbSaveAttempted = true;
                }
            }
        } catch (error) {
            console.error('❌ Error updating profile:', error);
        }
        
    } catch (error) {
        console.error('❌ Exception in saveProgressToDatabase:', error);
    } finally {
        this._isSaving = false;
    }
}
    // ============================================================
    // 💰 CALCULATE NURSEIQ POINTS
    // ============================================================
    calculateNurseIQPoints() {
        let totalCorrect = 0;
        let totalAnswered = 0;
        
        Object.values(this.userTestAnswers).forEach(answer => {
            if (answer && answer.answered) {
                totalAnswered++;
                if (answer.correct) totalCorrect++;
            }
        });
        
        const practicePoints = totalCorrect * 2;
        const reviewPoints = Number(this.examReviewState?.points || 0);

        return {
            answered: totalAnswered,
            correct: totalCorrect,
            practicePoints,
            reviewPoints,
            points: practicePoints + reviewPoints,
            accuracy: totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0
        };
    }
    
    // ============================================================
    // 📊 GET DASHBOARD METRICS
    // ============================================================
    getDashboardMetrics() {
        try {
            let totalAnswered = 0;
            let totalCorrect = 0;
            let recentActivity = 0;
            const courses = {};
            
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            
            Object.values(this.userTestAnswers).forEach(answer => {
                if (answer && answer.answered) {
                    totalAnswered++;
                    if (answer.correct) totalCorrect++;
                    
                    if (answer.timestamp) {
                        const answerDate = new Date(answer.timestamp);
                        if (answerDate >= sevenDaysAgo) recentActivity++;
                    }
                    
                    if (answer.courseId) {
                        if (!courses[answer.courseId]) {
                            courses[answer.courseId] = {
                                answered: 0,
                                correct: 0,
                                name: answer.courseName || 'Unknown Course'
                            };
                        }
                        courses[answer.courseId].answered++;
                        if (answer.correct) courses[answer.courseId].correct++;
                    }
                }
            });
            
            const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
            const targetQuestions = 100;
            const progress = Math.min(Math.round((totalAnswered / targetQuestions) * 100), 100);
            const streak = this.calculateStudyStreak();
            const points = totalCorrect * 2;
            
            let mostActiveCourse = { name: 'None', answered: 0 };
            Object.entries(courses).forEach(([courseId, courseData]) => {
                if (courseData.answered > mostActiveCourse.answered) {
                    mostActiveCourse = {
                        name: courseData.name,
                        answered: courseData.answered,
                        accuracy: courseData.answered > 0 ? Math.round((courseData.correct / courseData.answered) * 100) : 0
                    };
                }
            });
            
            const metrics = {
                totalAnswered,
                totalCorrect,
                accuracy,
                progress,
                recentActivity,
                streak,
                totalCourses: Object.keys(courses).length,
                mostActiveCourse: mostActiveCourse.name !== 'None' ? mostActiveCourse : null,
                lastUpdated: new Date().toISOString(),
                points: points
            };
            
            localStorage.setItem(this.dashboardMetricsKey, JSON.stringify(metrics));
            return metrics;
            
        } catch (error) {
            console.error('Error calculating metrics:', error);
            return this.getDefaultMetrics();
        }
    }
    
    getDefaultMetrics() {
        return {
            totalAnswered: 0,
            totalCorrect: 0,
            accuracy: 0,
            progress: 0,
            recentActivity: 0,
            streak: 0,
            totalCourses: 0,
            mostActiveCourse: null,
            lastUpdated: new Date().toISOString(),
            points: 0
        };
    }
    
    calculateStudyStreak() {
        try {
            const timestamps = [];
            Object.values(this.userTestAnswers).forEach(answer => {
                if (answer && answer.answered && answer.timestamp) {
                    timestamps.push(new Date(answer.timestamp));
                }
            });
            
            if (timestamps.length === 0) return 0;
            
            timestamps.sort((a, b) => b - a);
            
            const uniqueDates = [];
            timestamps.forEach(date => {
                const dateStr = date.toDateString();
                if (!uniqueDates.includes(dateStr)) uniqueDates.push(dateStr);
            });
            
            let streak = 0;
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            
            const todayStr = today.toDateString();
            const yesterdayStr = yesterday.toDateString();
            
            let startDate = null;
            if (uniqueDates.includes(todayStr)) {
                startDate = today;
                streak = 1;
            } else if (uniqueDates.includes(yesterdayStr)) {
                startDate = yesterday;
                streak = 1;
            } else {
                return 0;
            }
            
            for (let i = 1; i < uniqueDates.length; i++) {
                const checkDate = new Date(startDate);
                checkDate.setDate(checkDate.getDate() - i);
                const checkDateStr = checkDate.toDateString();
                if (uniqueDates.includes(checkDateStr)) streak++;
                else break;
            }
            
            return streak;
        } catch (error) {
            console.error('Error calculating streak:', error);
            return 0;
        }
    }
    
    updateDashboardMetrics() {
        try {
            const metrics = this.getDashboardMetrics();
            localStorage.setItem(this.dashboardMetricsKey, JSON.stringify(metrics));
            this.updateStatsUI(metrics);
        } catch (error) {
            console.error('Error updating dashboard metrics:', error);
        }
    }
    
    // ============================================================
    // 📊 UPDATE STATS UI
    // ============================================================
    updateStatsUI(metrics) {
        const stats = this.calculateNurseIQPoints();
        
        const elements = {
            nurseiqTotalQuestions: metrics.totalAnswered,
            nurseiqTotalCourses: metrics.totalCourses || 0,
            nurseiqAccuracy: metrics.accuracy + '%',
            nurseiqProgressPercent: metrics.progress + '%',
            nurseiqProgressBar: metrics.progress + '%',
            nurseiqAnswered: metrics.totalAnswered,
            nurseiqCorrect: metrics.totalCorrect,
            nurseiqAccuracyQuick: metrics.accuracy + '%',
            nurseiqStreakQuick: metrics.streak + ' days',
            streakDisplay: metrics.streak > 0 ? `🔥 ${metrics.streak} day streak` : '🔥 0 day streak',
            totalQuestionsWelcome: metrics.totalAnswered,
            totalCoursesWelcome: metrics.totalCourses || 0,
            nurseiqPoints: stats.points
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) {
                if (id === 'nurseiqProgressBar') {
                    el.style.width = value;
                } else {
                    el.textContent = value;
                }
            }
        });
        
        this.updateNurseIQRedesignStats(metrics, stats);
        console.log('📊 NurseIQ Stats:', stats);
    }
    
    updateNurseIQRedesignStats(metrics, stats) {
        const setText = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };

        setText('niqPracticeQuestionsCount', metrics.totalAnswered || 0);
        setText('niqExamReviewCount', this.releasedExamReviews?.length || 0);
        setText('niqOverallAccuracy', `${stats.accuracy || 0}%`);
        setText('niqTotalPoints', stats.points || 0);

        setText('niqPracticeProgress', `${metrics.progress || 0}%`);
        setText('niqAnsweredMeta', `${metrics.totalAnswered || 0} answered`);
        setText('niqQuestionsMeta', `${metrics.totalAnswered || 0} practice questions`);

        const progressBar = document.getElementById('niqPracticeProgressBar');
        if (progressBar) progressBar.style.width = `${Math.max(0, Math.min(100, Number(metrics.progress || 0)))}%`;

        setText('niqAchievementAnswered', metrics.totalAnswered || 0);
        setText('niqAchievementCorrect', metrics.totalCorrect || 0);
        setText('niqAchievementReviews', this.examReviewState?.viewedQuestionIds?.length || 0);

        setText('niqReleasedCount', this.releasedExamReviews?.length || 0);
        setText('niqCompletedCount', this.completedExamCount || this.releasedExamReviews?.length || 0);
        setText('niqReviewPointsSummary', `+${this.examReviewState?.points || 0}`);
    }

    // ============================================================
    // 📚 LOAD QUESTION BANK
    // ============================================================
    async loadQuestionBankCards() {
        if (this._isLoadingQuestions) return;
        this._isLoadingQuestions = true;
        
        try {
            console.log('📚 Loading question bank...');
            this.showLoading();
            
            const supabase = this.getSupabaseClient();
            if (!supabase) throw new Error('No database connection');
            
            const { data: questions, error } = await supabase
                .from('medical_assessments')
                .select(`*, courses (id, course_name, unit_code, color, description)`)
                .eq('is_active', true)
                .eq('is_published', true)
                .order('updated_at', { ascending: false });
            
            if (error) throw error;
            console.log(`✅ Fetched ${questions?.length || 0} questions`);
            
            const coursesMap = {};
            const courseUpdatedDates = {};
            
            questions.forEach(question => {
                const courseId = question.course_id || 'general';
                const courseName = question.courses?.course_name || 'General Nursing';
                const unitCode = question.courses?.unit_code || this.programCode;
                const courseColor = question.courses?.color || '#4f46e5';
                
                if (!coursesMap[courseId]) {
                    coursesMap[courseId] = {
                        id: courseId,
                        name: courseName,
                        unit_code: unitCode,
                        color: courseColor,
                        description: question.courses?.description || '',
                        questions: [],
                        stats: { total: 0, active: 0, hard: 0, medium: 0, easy: 0, lastUpdated: null },
                        userStats: null
                    };
                    courseUpdatedDates[courseId] = new Date(0);
                }
                
                coursesMap[courseId].questions.push(question);
                coursesMap[courseId].stats.total++;
                coursesMap[courseId].stats.active++;
                
                if (question.difficulty === 'hard') coursesMap[courseId].stats.hard++;
                else if (question.difficulty === 'medium') coursesMap[courseId].stats.medium++;
                else if (question.difficulty === 'easy') coursesMap[courseId].stats.easy++;
                
                if (question.updated_at) {
                    const updatedDate = new Date(question.updated_at);
                    if (updatedDate > courseUpdatedDates[courseId]) {
                        courseUpdatedDates[courseId] = updatedDate;
                    }
                }
            });
            
            Object.keys(coursesMap).forEach(courseId => {
                coursesMap[courseId].stats.lastUpdated = courseUpdatedDates[courseId] || new Date();
                coursesMap[courseId].userStats = this.getCourseUserStats(courseId, coursesMap[courseId].questions);
            });
            
            const coursesArray = Object.values(coursesMap);
            this.questionBankCourses = coursesArray;
            coursesArray.sort((a, b) => {
                const dateA = a.stats.lastUpdated || new Date(0);
                const dateB = b.stats.lastUpdated || new Date(0);
                return dateB - dateA;
            });
            
            const filteredCourses = this.filterCoursesByProgram(coursesArray);
            this.displayQuestionBankCards(filteredCourses);
            
        } catch (error) {
            console.error('❌ Error loading question bank:', error);
            this.showError(`Failed to load: ${error.message || 'Please try again'}`);
        } finally {
            this.hideLoading();
            this._isLoadingQuestions = false;
        }
    }
    
    // ============================================================
    // 🎯 GET COURSE USER STATS
    // ============================================================
    getCourseUserStats(courseId, questions) {
        let answered = 0;
        let correct = 0;
        let lastAttempt = null;
        
        questions.forEach(question => {
            const questionAnswer = this.userTestAnswers[question.id];
            if (questionAnswer && questionAnswer.answered) {
                answered++;
                if (questionAnswer.correct) correct++;
                if (questionAnswer.timestamp && (!lastAttempt || new Date(questionAnswer.timestamp) > new Date(lastAttempt))) {
                    lastAttempt = questionAnswer.timestamp;
                }
            }
        });
        
        const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;
        const completion = answered > 0 ? Math.round((answered / questions.length) * 100) : 0;
        
        return {
            answered,
            correct,
            accuracy,
            completion,
            lastAttempt,
            total: questions.length
        };
    }
    
    // ============================================================
    // 🔍 FILTER COURSES BY PROGRAM
    // ============================================================
    filterCoursesByProgram(courses) {
        const isTVET = this.isTVETStudent;
        
        if (isTVET) {
            const tvetKeywords = [
                'tvet', 'cdacc', 'nita', 'vocational', 'technical',
                'craft', 'artisan', 'trade', 'occupational',
                'dpott', 'dch', 'dhr', 'dsl', 'dsw', 'dcjs', 'dhss', 'dict', 'dme',
                'cpott', 'cch', 'chrit', 'cpc', 'csl', 'csw', 'ccjs', 'cag', 'chss', 'cict',
                'ach', 'aag', 'asw', 'cca', 'pte'
            ];
            
            return courses.filter(course => {
                const courseName = course.name.toLowerCase();
                const unitCode = (course.unit_code || '').toLowerCase();
                
                for (const keyword of tvetKeywords) {
                    if (courseName.includes(keyword) || unitCode.includes(keyword)) return true;
                }
                if (course.description && course.description.toLowerCase().includes('tvet')) return true;
                return false;
            });
        } else {
            const nursingKeywords = [
                'nursing', 'krchn', 'health', 'medical', 'clinical',
                'midwifery', 'pediatric', 'anatomy', 'physiology',
                'surgical', 'medical surgical', 'immunization',
                'leadership', 'management', 'pharmacology',
                'obstetrics', 'gynecology', 'psychiatry', 'mental health',
                'public health', 'epidemiology', 'nutrition'
            ];
            
            return courses.filter(course => {
                const courseName = course.name.toLowerCase();
                const unitCode = (course.unit_code || '').toLowerCase();
                
                for (const keyword of nursingKeywords) {
                    if (courseName.includes(keyword) || unitCode.includes(keyword)) return true;
                }
                if (course.description) {
                    const desc = course.description.toLowerCase();
                    if (desc.includes('nursing') || desc.includes('health') || desc.includes('clinical')) return true;
                }
                return false;
            });
        }
    }
    
    // ============================================================
    // 📄 DISPLAY QUESTION BANK CARDS
    // ============================================================
    displayQuestionBankCards(courses) {
        if (!this.studentQuestionBankContent) return;
        
        const isTVET = this.isTVETStudent;
        const displayName = this.programDisplayName;
        const color = isTVET ? '#1a7a5a' : '#4C1D95';
        const iconClass = isTVET ? 'fa-tools' : 'fa-graduation-cap';
        
        const searchTerm = this.studentQuestionBankSearch?.value?.toLowerCase() || '';
        let filteredCourses = courses;
        
        if (searchTerm) {
            filteredCourses = courses.filter(course =>
                course.name.toLowerCase().includes(searchTerm) ||
                course.unit_code.toLowerCase().includes(searchTerm) ||
                course.description.toLowerCase().includes(searchTerm)
            );
        }
        
        function formatDate(date) {
            if (!date) return 'Never';
            if (typeof date === 'string') date = new Date(date);
            const now = new Date();
            const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
            if (diffDays === 0) return 'Today';
            if (diffDays === 1) return 'Yesterday';
            if (diffDays < 7) return `${diffDays} days ago`;
            if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
        
        let html = `<div class="question-bank-container">`;
        
        html += `
            <div class="program-info-banner ${isTVET ? 'tvet' : 'nursing'}" 
                 style="background: ${color}15; border-left: 4px solid ${color}; padding: 12px 16px; border-radius: 12px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <i class="fas ${iconClass}" style="color: ${color}; font-size: 18px;"></i>
                <span style="font-weight: 600; color: ${color};">${isTVET ? 'TVETIQ' : 'NurseIQ'} Mode</span>
                <span style="color: #64748b;">| ${displayName}</span>
                <span style="color: #64748b; margin-left: 4px;">| ${filteredCourses.length} courses</span>
                ${filteredCourses.length === 0 ? `<span style="color: #dc2626;">⚠️ No courses available</span>` : ''}
                <span style="margin-left: auto; font-size: 12px; color: #94a3b8;">
                    <i class="fas fa-clock"></i> Latest updates on top
                </span>
            </div>
        `;
        
        const lastProgress = this.getLastCourseProgress();
        if (lastProgress) {
            const lastCourse = filteredCourses.find(c => c.id === lastProgress.courseId);
            if (lastCourse) {
                const userStats = lastCourse.userStats;
                html += `
                    <div class="resume-card" style="background: ${color}10; border: 1px solid ${color}30; border-radius: 16px; padding: 16px; margin-bottom: 20px;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                            <i class="fas fa-history" style="color: ${color};"></i>
                            <h3 style="margin: 0; font-size: 16px;">Continue Where You Left Off</h3>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                            <div>
                                <span style="font-weight: 600;">${lastCourse.name}</span>
                                <span style="font-size: 13px; color: #64748b; margin-left: 12px;">
                                    Question ${lastProgress.currentIndex + 1} of ${lastProgress.totalQuestions}
                                </span>
                                <div style="margin-top: 4px; display: flex; gap: 16px; font-size: 13px;">
                                    <span><i class="fas fa-check-circle" style="color: #10b981;"></i> ${userStats.answered}/${userStats.total} answered</span>
                                    <span><i class="fas fa-trophy" style="color: #f59e0b;"></i> ${userStats.accuracy}% accuracy</span>
                                </div>
                            </div>
                            <div style="display: flex; gap: 8px;">
                                <button onclick="window.startCourseTest('${lastCourse.id}', '${lastCourse.name.replace(/'/g, "\\'")}', ${lastProgress.currentIndex})" 
                                        style="background: ${color}; color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                                    <i class="fas fa-play"></i> Resume
                                </button>
                                <button onclick="window.startCourseTest('${lastCourse.id}', '${lastCourse.name.replace(/'/g, "\\'")}', 0)" 
                                        style="background: #e2e8f0; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                                    <i class="fas fa-redo"></i> Start Over
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }
        }
        
        if (filteredCourses.length === 0) {
            html += `
                <div style="text-align: center; padding: 60px 20px;">
                    <i class="fas fa-search" style="font-size: 48px; color: #d1d5db;"></i>
                    <h3 style="margin-top: 16px;">No Courses Found</h3>
                    <p style="color: #6b7280;">${searchTerm ? `No courses match "${searchTerm}".` : `No ${isTVET ? 'TVET' : 'Nursing'} courses available yet.`}</p>
                    ${searchTerm ? `<button onclick="window.clearQuestionBankSearch()" style="margin-top: 12px; padding: 8px 20px; background: ${color}; color: white; border: none; border-radius: 8px; cursor: pointer;">
                        <i class="fas fa-times"></i> Clear Search
                    </button>` : ''}
                </div>
            `;
        } else {
            html += `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px;">`;
            
            filteredCourses.forEach(course => {
                const courseColor = course.color || color;
                const lastUpdated = formatDate(course.stats.lastUpdated);
                const userStats = course.userStats;
                const hasProgress = userStats.answered > 0;
                
                html += `
                    <div class="course-card" style="background: white; border-radius: 16px; padding: 20px; border: 1px solid #e2e8f0; transition: all 0.2s; cursor: pointer;" 
                         onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'" 
                         onmouseout="this.style.boxShadow='none'">
                        <div style="border-bottom: 2px solid ${courseColor}20; padding-bottom: 12px; margin-bottom: 12px;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                <div>
                                    <h3 style="margin: 0; font-size: 16px; font-weight: 600;">${course.name}</h3>
                                    <div style="display: flex; gap: 8px; margin-top: 4px; flex-wrap: wrap;">
                                        <span style="background: ${courseColor}30; color: ${courseColor}; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                                            ${course.unit_code}
                                        </span>
                                        <span style="color: #64748b; font-size: 13px;">
                                            <i class="fas fa-question-circle"></i> ${course.stats.total} questions
                                        </span>
                                        ${isTVET ? `<span style="background: #1a7a5a20; color: #1a7a5a; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;">TVET</span>` : ''}
                                        <span style="font-size: 11px; color: #94a3b8;">
                                            <i class="fas fa-clock"></i> ${lastUpdated}
                                        </span>
                                    </div>
                                </div>
                                <div style="width: 40px; height: 40px; background: ${courseColor}; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0;">
                                    <i class="fas fa-book-medical"></i>
                                </div>
                            </div>
                            ${hasProgress ? `
                                <div style="margin-top: 8px; background: linear-gradient(135deg, ${courseColor}, #4C1D95); color: white; padding: 4px 12px; border-radius: 12px; display: inline-block; font-size: 12px; font-weight: 600;">
                                    <i class="fas fa-chart-line"></i> ${userStats.completion}% Complete
                                </div>
                            ` : `
                                <div style="margin-top: 8px; color: #10b981; font-size: 13px;">
                                    <i class="fas fa-check-circle"></i> Active Questions
                                </div>
                            `}
                        </div>
                        
                        <div>
                            ${hasProgress ? `
                                <div style="margin-bottom: 12px;">
                                    <div style="font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 8px;">
                                        <i class="fas fa-chart-bar"></i> Your Progress
                                    </div>
                                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
                                        <div style="text-align: center;">
                                            <div style="font-weight: 700; color: ${courseColor};">${userStats.answered}/${userStats.total}</div>
                                            <div style="font-size: 10px; color: #94a3b8;">Answered</div>
                                        </div>
                                        <div style="text-align: center;">
                                            <div style="font-weight: 700; color: #10b981;">${userStats.correct}</div>
                                            <div style="font-size: 10px; color: #94a3b8;">Correct</div>
                                        </div>
                                        <div style="text-align: center;">
                                            <div style="font-weight: 700; color: #f59e0b;">${userStats.accuracy}%</div>
                                            <div style="font-size: 10px; color: #94a3b8;">Accuracy</div>
                                        </div>
                                        <div style="text-align: center;">
                                            <div style="font-weight: 700; color: #8b5cf6;">${userStats.completion}%</div>
                                            <div style="font-size: 10px; color: #94a3b8;">Complete</div>
                                        </div>
                                    </div>
                                </div>
                            ` : ''}
                            
                            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px;">
                                <div style="text-align: center;">
                                    <div style="font-weight: 700; color: #4C1D95; font-size: 18px;">${course.stats.total}</div>
                                    <div style="font-size: 10px; color: #94a3b8;">TOTAL</div>
                                </div>
                                <div style="text-align: center;">
                                    <div style="font-weight: 700; color: #dc2626; font-size: 18px;">${course.stats.hard}</div>
                                    <div style="font-size: 10px; color: #94a3b8;">HARD</div>
                                </div>
                                <div style="text-align: center;">
                                    <div style="font-weight: 700; color: #f59e0b; font-size: 18px;">${course.stats.medium}</div>
                                    <div style="font-size: 10px; color: #94a3b8;">MEDIUM</div>
                                </div>
                                <div style="text-align: center;">
                                    <div style="font-size: 10px; color: #94a3b8;">UPDATED</div>
                                    <div style="font-size: 12px; font-weight: 600; color: ${courseColor};">${lastUpdated}</div>
                                </div>
                            </div>
                            
                            <button onclick="window.startCourseTest('${course.id}', '${course.name.replace(/'/g, "\\'")}', ${hasProgress ? -1 : 0})" 
                                    style="width: 100%; padding: 10px; background: linear-gradient(135deg, ${courseColor}, #4C1D95); color: white; border: none; border-radius: 10px; font-weight: 700; font-size: 14px; cursor: pointer; transition: all 0.2s;"
                                    onmouseover="this.style.transform='scale(1.02)'" 
                                    onmouseout="this.style.transform='scale(1)'">
                                <i class="fas fa-play-circle"></i> ${hasProgress ? 'CONTINUE PRACTICE' : 'START PRACTICE TEST'}
                            </button>
                        </div>
                    </div>
                `;
            });
            
            html += `</div>`;
        }
        
        html += `</div>`;
        this.studentQuestionBankContent.innerHTML = html;
        console.log(`✅ ${filteredCourses.length} courses displayed`);
        
        this.updateDashboardMetrics();
    }
    
    // ============================================================
    // 📥 GET LAST COURSE PROGRESS
    // ============================================================
    getLastCourseProgress() {
        try {
            const lastProgress = localStorage.getItem(this.lastCourseProgressKey);
            return lastProgress ? JSON.parse(lastProgress) : null;
        } catch (error) {
            return null;
        }
    }
    
    // ============================================================
    // 🎯 START COURSE TEST
    // ============================================================
    async startCourseTest(courseId, courseName, startIndex = 0) {
        try {
            console.log(`Starting test for course: ${courseName}`);
            this.showLoading();
            
            const supabase = this.getSupabaseClient();
            if (!supabase) throw new Error('No database connection');
            
            const { data: questions, error } = await supabase
                .from('medical_assessments')
                .select(`*, courses (id, course_name, unit_code, color)`)
                .eq('course_id', courseId)
                .eq('is_active', true)
                .eq('is_published', true)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            if (!questions || questions.length === 0) {
                this.showNotification('No questions available for this course yet.', 'warning');
                this.loadQuestionBankCards();
                return;
            }
            
            this.currentCourseForTest = { id: courseId, name: courseName };
            this.currentCourseQuestions = questions;
            
            let actualStartIndex = 0;
            if (startIndex === -1) {
                for (let i = 0; i < questions.length; i++) {
                    const question = questions[i];
                    const hasAnswered = this.userTestAnswers[question.id]?.answered;
                    if (!hasAnswered) {
                        actualStartIndex = i;
                        break;
                    }
                }
            } else if (startIndex >= 0 && startIndex < questions.length) {
                actualStartIndex = startIndex;
            }
            
            this.currentQuestionIndex = actualStartIndex;
            this.displayInteractiveQuestions(courseName, questions);
            
        } catch (error) {
            console.error('Error starting test:', error);
            this.showNotification('Failed to start test. Please try again.', 'error');
            this.loadQuestionBankCards();
        } finally {
            this.hideLoading();
        }
    }
    
    // ============================================================
    // 📄 DISPLAY INTERACTIVE QUESTIONS — PREMIUM FULL-SCREEN TEST MODE
    // ============================================================
    displayInteractiveQuestions(courseName, questions) {
        const safeCourseName = this.escapeReviewHtml
            ? this.escapeReviewHtml(courseName)
            : String(courseName || '').replace(/[&<>\'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
        const course = questions[0]?.courses || {};
        const unitCode = this.escapeReviewHtml(course.unit_code || 'MEDICAL CATALOG');
        const questionCount = questions.length;
        const userStats = this.getCourseUserStats(this.currentCourseForTest.id, questions);

        const existing = document.getElementById('nurseiqTestFullscreen');
        if (existing) existing.remove();

        document.body.dataset.nurseiqPreviousOverflow = document.body.style.overflow || '';
        document.body.style.overflow = 'hidden';
        document.body.classList.add('niq-test-open');

        this.courseTestStartedAt = Date.now();
        if (this.courseTestTimer) clearInterval(this.courseTestTimer);

        const overlay = document.createElement('div');
        overlay.id = 'nurseiqTestFullscreen';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.innerHTML = `
            <style>
                #nurseiqTestFullscreen{position:fixed;inset:0;z-index:2147483000;background:#f4f8fc;color:#102f52;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow:hidden}
                #nurseiqTestFullscreen *{box-sizing:border-box}
                #nurseiqTestFullscreen .niq-screen{height:100dvh;min-height:100vh;display:flex;flex-direction:column}
                #nurseiqTestFullscreen .niq-header{height:82px;flex:0 0 82px;background:linear-gradient(135deg,#1557a6 0%,#174d93 48%,#103d7d 100%);color:#fff;display:flex;align-items:center;gap:20px;padding:12px 22px;box-shadow:0 3px 14px rgba(15,52,96,.16)}
                #nurseiqTestFullscreen .niq-back{height:48px;padding:0 18px;border:1px solid rgba(255,255,255,.24);border-radius:12px;background:rgba(255,255,255,.08);color:#fff;display:inline-flex;align-items:center;gap:9px;font-weight:700;font-size:14px;cursor:pointer;white-space:nowrap}
                #nurseiqTestFullscreen .niq-back:hover{background:rgba(255,255,255,.16)}
                #nurseiqTestFullscreen .niq-course-icon{width:40px;height:40px;border-radius:11px;background:#2d7ce0;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:inset 0 1px rgba(255,255,255,.2)}
                #nurseiqTestFullscreen .niq-course-info{min-width:0;flex:1}
                #nurseiqTestFullscreen .niq-course-title{margin:0 0 7px;font-size:19px;line-height:1.2;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:-.2px}
                #nurseiqTestFullscreen .niq-badges{display:flex;align-items:center;gap:8px}
                #nurseiqTestFullscreen .niq-badge{font-size:11px;font-weight:800;padding:5px 10px;border-radius:999px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.12)}
                #nurseiqTestFullscreen .niq-badge.code{background:#dbeafe;color:#244b80;border:0}
                #nurseiqTestFullscreen .niq-badge.practice{background:#22c55e;color:#fff;border:0}
                #nurseiqTestFullscreen .niq-timer{width:220px;min-width:220px;height:58px;border:1px solid rgba(255,255,255,.22);background:rgba(0,0,0,.10);border-radius:12px;padding:7px 14px;display:flex;align-items:center;gap:11px}
                #nurseiqTestFullscreen .niq-timer-icon{font-size:24px}
                #nurseiqTestFullscreen .niq-timer-label{font-size:10px;opacity:.8;display:block;margin-bottom:2px}
                #nurseiqTestFullscreen #niqTestElapsed{font-size:20px;font-weight:800;letter-spacing:.4px;font-variant-numeric:tabular-nums}
                #nurseiqTestFullscreen .niq-overall{width:380px;min-width:280px}
                #nurseiqTestFullscreen .niq-overall-top{display:flex;justify-content:space-between;align-items:center;font-size:12px;font-weight:700;margin-bottom:8px}
                #nurseiqTestFullscreen .niq-progress-track{height:10px;border-radius:999px;background:rgba(255,255,255,.2);overflow:hidden}
                #nurseiqTestFullscreen #niqTestProgressBar{height:100%;width:0%;background:#10d59a;border-radius:999px;transition:width .25s ease}
                #nurseiqTestFullscreen .niq-progress-percent{text-align:right;font-size:11px;font-weight:700;margin-top:5px;opacity:.9}
                #nurseiqTestFullscreen .niq-body{min-height:0;flex:1;display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:18px;padding:18px 22px 18px;overflow:hidden}
                #nurseiqTestFullscreen .niq-main-card,#nurseiqTestFullscreen .niq-nav-card{background:#fff;border:1px solid #e2eaf3;border-radius:14px;box-shadow:0 4px 18px rgba(21,65,105,.05)}
                #nurseiqTestFullscreen .niq-main-card{min-width:0;min-height:0;display:flex;flex-direction:column;overflow:hidden}
                #nurseiqTestFullscreen .niq-question-scroll{min-height:0;overflow:auto;padding:28px 32px 20px}
                #nurseiqTestFullscreen .niq-question-head{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:18px}
                #nurseiqTestFullscreen #questionNumberDisplay{font-size:17px;font-weight:800;color:#5523c7}
                #nurseiqTestFullscreen #difficultyBadge{padding:7px 15px!important;border-radius:999px!important;font-size:11px!important;font-weight:800!important;letter-spacing:.2px}
                #nurseiqTestFullscreen #questionText{font-size:18px!important;line-height:1.6!important;color:#173b64!important;margin:0 0 25px!important;font-weight:500}
                #nurseiqTestFullscreen #optionsContainer{display:grid!important;grid-template-columns:1fr 1fr!important;gap:14px!important}
                #nurseiqTestFullscreen #optionsContainer>div{min-height:76px!important;padding:14px 16px!important;border:1px solid #d7e1ec!important;border-radius:11px!important;background:#fff!important;display:flex;align-items:center;cursor:pointer;transition:all .16s ease;box-shadow:0 1px 2px rgba(15,23,42,.02)}
                #nurseiqTestFullscreen #optionsContainer>div:hover{border-color:#6d28d9!important;background:#faf8ff!important;transform:translateY(-1px)}
                #nurseiqTestFullscreen #optionsContainer>div.selected{border-color:#5b21b6!important;background:#f0eafe!important;box-shadow:0 0 0 2px rgba(91,33,182,.07)}
                #nurseiqTestFullscreen #optionsContainer>div.correct{border-color:#10b981!important;background:#d8faec!important}
                #nurseiqTestFullscreen #optionsContainer>div.incorrect{border-color:#ef4444!important;background:#fee8e8!important}
                #nurseiqTestFullscreen #optionsContainer span:first-child{flex:0 0 31px;width:31px!important;height:31px!important;border-radius:50%;display:inline-flex!important;align-items:center;justify-content:center;background:#edf2f7!important;color:#244464!important;font-weight:800!important;font-size:12px!important;margin-right:12px}
                #nurseiqTestFullscreen #optionsContainer>div.correct span:first-child{background:#fff!important;color:#059669}
                #nurseiqTestFullscreen #optionsContainer>div.incorrect span:first-child{background:#fff!important;color:#dc2626}
                #nurseiqTestFullscreen #optionsContainer span:last-child{font-size:16px;line-height:1.5;color:#173b64}
                #nurseiqTestFullscreen #explanationContainer{margin-top:18px!important;padding:17px 20px!important;background:#edf5ff!important;border-radius:9px!important;border-left:4px solid #3b82f6!important}
                #nurseiqTestFullscreen #explanationContainer>div:first-child{font-size:15px;font-weight:800;color:#1648a1;margin-bottom:8px}
                #nurseiqTestFullscreen #explanationText{font-size:15px;line-height:1.65;color:#355777}
                #nurseiqTestFullscreen .niq-footer{flex:0 0 auto;border-top:1px solid #e5ebf2;padding:13px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;background:#fff}
                #nurseiqTestFullscreen .niq-actions{display:flex;gap:9px;align-items:center;flex-wrap:wrap}
                #nurseiqTestFullscreen .niq-btn{min-height:42px;padding:0 17px;border:0;border-radius:9px;cursor:pointer;font-size:13px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;gap:7px;transition:.16s ease}
                #nurseiqTestFullscreen .niq-btn:disabled{opacity:.45;cursor:not-allowed;transform:none!important}
                #nurseiqTestFullscreen .niq-prev{background:#eef2f7;color:#94a3b8}.niq-next{background:#5b21b6;color:#fff}.niq-check{background:#10b981;color:#fff}.niq-reset{background:#eef2f7;color:#24364a}.niq-finish{background:#ef1f25;color:#fff}
                #nurseiqTestFullscreen .niq-btn:hover:not(:disabled){transform:translateY(-1px);filter:brightness(.98)}
                #nurseiqTestFullscreen .niq-nav-card{min-height:0;overflow:auto;padding:20px}
                #nurseiqTestFullscreen .niq-nav-title{font-size:18px;font-weight:800;color:#142f50;margin-bottom:17px}
                #nurseiqTestFullscreen .niq-nav-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
                #nurseiqTestFullscreen .niq-qnav{height:42px;border:1px solid #d7e1ec;border-radius:9px;background:#fff;color:#173b64;font-size:13px;font-weight:700;cursor:pointer}
                #nurseiqTestFullscreen .niq-qnav:hover{border-color:#5b21b6;background:#faf8ff}
                #nurseiqTestFullscreen .niq-qnav.current{background:#1769e0;color:#fff;border-color:#1769e0}
                #nurseiqTestFullscreen .niq-qnav.answered{background:#e1faef;color:#087a54;border-color:#77d9b2}
                #nurseiqTestFullscreen .niq-qnav.flagged{box-shadow:inset 0 -3px #f43f72}
                #nurseiqTestFullscreen .niq-legend{display:grid;grid-template-columns:1fr 1fr;gap:13px 12px;margin-top:22px;font-size:12px;color:#314b69}
                #nurseiqTestFullscreen .niq-legend-item{display:flex;align-items:center;gap:8px}
                #nurseiqTestFullscreen .niq-dot{width:13px;height:13px;border-radius:50%;display:inline-block}
                #nurseiqTestFullscreen .niq-dot.current{background:#1769e0}.niq-dot.answered{background:#10b981}.niq-dot.unanswered{background:#cbd5e1}.niq-dot.flagged{background:#f43f72}
                #nurseiqTestFullscreen .niq-nav-summary{margin-top:22px;padding-top:17px;border-top:1px solid #e5ebf2;font-size:12px;color:#64748b;line-height:1.8}
                #nurseiqTestFullscreen .niq-nav-summary strong{color:#173b64}
                @media(max-width:1100px){#nurseiqTestFullscreen .niq-header{gap:12px;padding:10px 14px}.niq-timer{width:175px!important;min-width:175px!important}.niq-overall{width:280px!important}.niq-body{grid-template-columns:minmax(0,1fr) 280px!important}.niq-question-scroll{padding:24px!important}}
                @media(max-width:850px){#nurseiqTestFullscreen .niq-header{height:auto;min-height:72px;flex-wrap:wrap}.niq-course-info{order:1;flex:1 1 calc(100% - 130px)}.niq-back{order:0}.niq-timer{order:2;width:auto!important;min-width:150px!important}.niq-overall{order:3;flex:1;width:auto!important;min-width:180px}.niq-body{grid-template-columns:1fr!important;overflow:auto;padding:12px}.niq-nav-card{max-height:240px;order:2}.niq-main-card{min-height:620px}.niq-question-scroll{overflow:visible}}
                @media(max-width:600px){#nurseiqTestFullscreen .niq-course-icon{display:none}.niq-course-title{font-size:14px!important}.niq-badges .niq-badge.code{display:none}.niq-timer{min-width:125px!important}.niq-timer-label{display:none}.niq-timer-icon{font-size:19px}.niq-header{padding:9px!important}.niq-body{padding:8px!important}.niq-question-scroll{padding:18px 14px!important}.niq-question-text{font-size:16px!important}#nurseiqTestFullscreen #optionsContainer{grid-template-columns:1fr!important}.niq-footer{flex-direction:column!important;align-items:stretch!important}.niq-actions{width:100%;justify-content:space-between}.niq-actions:last-child{justify-content:flex-end}.niq-btn{padding:0 12px!important}}
            </style>
            <div class="niq-screen">
                <header class="niq-header">
                    <button type="button" class="niq-back" onclick="window.closeCourseTestFullscreen()"><i class="fas fa-arrow-left"></i> Back</button>
                    <div class="niq-course-icon"><i class="fas fa-book-medical"></i></div>
                    <div class="niq-course-info">
                        <h1 class="niq-course-title">${safeCourseName}</h1>
                        <div class="niq-badges"><span class="niq-badge code">${unitCode}</span><span class="niq-badge">${questionCount} Questions</span><span class="niq-badge practice">Practice Test</span></div>
                    </div>
                    <div class="niq-timer"><span class="niq-timer-icon">⏱️</span><div><span class="niq-timer-label">Time Elapsed</span><strong id="niqTestElapsed">00:00:00</strong></div></div>
                    <div class="niq-overall"><div class="niq-overall-top"><span>Overall Progress</span><strong id="niqTestProgressText">${Math.min(100, Math.round((userStats.answered / Math.max(questionCount,1))*100))}%</strong></div><div class="niq-progress-track"><div id="niqTestProgressBar"></div></div><div class="niq-progress-percent"><span id="questionProgress">${Math.min(100, Math.round((userStats.answered / Math.max(questionCount,1))*100))}% Complete</span></div></div>
                </header>
                <div class="niq-body">
                    <section class="niq-main-card">
                        <div class="niq-question-scroll">
                            <div id="questionDisplay">
                                <div class="niq-question-head"><span id="questionNumberDisplay">Question ${this.currentQuestionIndex + 1} of ${questionCount}</span><span id="difficultyBadge">MEDIUM</span></div>
                                <div id="questionText">Loading question...</div>
                                <div id="optionsContainer"></div>
                                <div id="explanationContainer" style="display:none"><div>💡 Explanation</div><div id="explanationText"></div></div>
                            </div>
                        </div>
                        <footer class="niq-footer">
                            <div class="niq-actions"><button type="button" class="niq-btn niq-prev" onclick="window.prevQuestion()" id="prevBtn"><i class="fas fa-chevron-left"></i> Previous</button><button type="button" class="niq-btn niq-next" onclick="window.nextQuestion()" id="nextBtn">Next <i class="fas fa-chevron-right"></i></button></div>
                            <div class="niq-actions"><button type="button" class="niq-btn niq-check" onclick="window.checkAnswer()" id="checkAnswerBtn"><i class="fas fa-check-circle"></i> Check Answer</button><button type="button" class="niq-btn niq-reset" onclick="window.resetQuestion()"><i class="fas fa-redo"></i> Reset</button><button type="button" class="niq-btn niq-finish" onclick="window.finishPractice()"><i class="fas fa-flag-checkered"></i> Finish Test</button></div>
                        </footer>
                    </section>
                    <aside class="niq-nav-card">
                        <div class="niq-nav-title">Question Navigation</div>
                        <div class="niq-nav-grid" id="niqQuestionNav"></div>
                        <div class="niq-legend"><div class="niq-legend-item"><span class="niq-dot current"></span> Current</div><div class="niq-legend-item"><span class="niq-dot answered"></span> Answered</div><div class="niq-legend-item"><span class="niq-dot unanswered"></span> Not Answered</div><div class="niq-legend-item"><span class="niq-dot flagged"></span> Flagged</div></div>
                        <div class="niq-nav-summary"><div>Answered: <strong id="niqAnsweredCount">${userStats.answered}</strong> / ${questionCount}</div><div>Remaining: <strong id="niqRemainingCount">${Math.max(0,questionCount-userStats.answered)}</strong></div></div>
                    </aside>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        this.renderQuestionNavigation();
        this.updateTestTimer();
        this.courseTestTimer = setInterval(() => this.updateTestTimer(), 1000);
        setTimeout(() => this.loadCurrentQuestion(), 40);
    }

    renderQuestionNavigation() {
        const nav = document.getElementById('niqQuestionNav');
        if (!nav || !Array.isArray(this.currentCourseQuestions)) return;
        nav.innerHTML = this.currentCourseQuestions.map((question, index) => {
            const answer = this.userTestAnswers?.[question.id];
            const answered = !!answer?.answered;
            const current = index === this.currentQuestionIndex;
            return `<button type="button" class="niq-qnav${current ? ' current' : ''}${answered ? ' answered' : ''}" onclick="window.goToQuestion(${index})">${index + 1}</button>`;
        }).join('');
        const answeredCount = this.currentCourseQuestions.filter(q => this.userTestAnswers?.[q.id]?.answered).length;
        const remaining = Math.max(0, this.currentCourseQuestions.length - answeredCount);
        const a = document.getElementById('niqAnsweredCount'); if (a) a.textContent = answeredCount;
        const r = document.getElementById('niqRemainingCount'); if (r) r.textContent = remaining;
    }

    goToQuestion(index) {
        if (!Array.isArray(this.currentCourseQuestions) || index < 0 || index >= this.currentCourseQuestions.length) return;
        this.currentQuestionIndex = index;
        this.loadCurrentQuestion();
    }

    updateTestTimer() {
        const el = document.getElementById('niqTestElapsed');
        if (!el || !this.courseTestStartedAt) return;
        const total = Math.max(0, Math.floor((Date.now() - this.courseTestStartedAt) / 1000));
        const h = String(Math.floor(total / 3600)).padStart(2,'0');
        const m = String(Math.floor((total % 3600) / 60)).padStart(2,'0');
        const sec = String(total % 60).padStart(2,'0');
        el.textContent = `${h}:${m}:${sec}`;
    }

    // ============================================================
    // ⬅️ CLOSE FULL-SCREEN COURSE TEST
    // ============================================================
    closeCourseTestFullscreen() {
        const overlay = document.getElementById('nurseiqTestFullscreen');
        if (overlay) overlay.remove();

        if (this.courseTestTimer) {
            clearInterval(this.courseTestTimer);
            this.courseTestTimer = null;
        }
        this.courseTestStartedAt = null;

        const previousOverflow = document.body.dataset.nurseiqPreviousOverflow || '';
        document.body.style.overflow = previousOverflow;
        document.body.classList.remove('niq-test-open');
        delete document.body.dataset.nurseiqPreviousOverflow;

        this.currentCourseForTest = null;
        this.currentCourseQuestions = [];
        this.currentQuestionIndex = 0;

        this.loadQuestionBankCards();
    }

    // ============================================================
    // 📥 LOAD CURRENT QUESTION - FIXED with already answered
    // ============================================================
    loadCurrentQuestion() {
        const question = this.currentCourseQuestions[this.currentQuestionIndex];
        if (!question) return;
        
        // Update question number/header
        const questionNumberDisplay = document.getElementById('questionNumberDisplay');
        if (questionNumberDisplay) {
            questionNumberDisplay.textContent = `Question ${this.currentQuestionIndex + 1} of ${this.currentCourseQuestions.length}`;
        }

        this.renderQuestionNavigation();

        // Update question text
        const questionText = document.getElementById('questionText');
        if (questionText) {
            questionText.textContent = question.question_text || 'Question text not available';
        }
        
        // Update difficulty badge
        const difficultyBadge = document.getElementById('difficultyBadge');
        if (difficultyBadge) {
            difficultyBadge.textContent = question.difficulty?.toUpperCase() || 'MEDIUM';
            difficultyBadge.style.cssText = `padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;`;
            if (question.difficulty === 'easy') {
                difficultyBadge.style.background = '#d1fae5';
                difficultyBadge.style.color = '#065f46';
            } else if (question.difficulty === 'hard') {
                difficultyBadge.style.background = '#fee2e2';
                difficultyBadge.style.color = '#991b1b';
            } else {
                difficultyBadge.style.background = '#fef3c7';
                difficultyBadge.style.color = '#92400e';
            }
        }
        
        // Clear explanation when navigating to new question
        const explanationContainer = document.getElementById('explanationContainer');
        if (explanationContainer) {
            explanationContainer.style.display = 'none';
        }
        
        // Reset all option styles
        document.querySelectorAll('#optionsContainer > div').forEach(el => {
            el.classList.remove('selected', 'correct', 'incorrect');
            el.style.borderColor = '#e2e8f0';
            el.style.background = 'white';
        });
        
        // Load options
        this.loadAnswerOptions(question);
        this.updateQuestionButtons();
        
        // ✅ FIX: Check if question was already answered - use question.id
        const savedAnswer = this.userTestAnswers[question.id];
        if (savedAnswer?.answered && savedAnswer.selectedOptionIndex !== undefined) {
            const index = savedAnswer.selectedOptionIndex;
            const selectedElement = document.getElementById(`option-container-${index}`);
            if (selectedElement) {
                const isCorrect = savedAnswer.correct;
                if (isCorrect) {
                    selectedElement.classList.add('correct');
                    selectedElement.style.borderColor = '#10b981';
                    selectedElement.style.background = '#d1fae5';
                } else {
                    selectedElement.classList.add('incorrect');
                    selectedElement.style.borderColor = '#dc2626';
                    selectedElement.style.background = '#fee2e2';
                    
                    // Show correct answer if available
                    const correctAnswer = savedAnswer.correctAnswer;
                    if (correctAnswer) {
                        const options = [];
                        if (question.option_a) options.push(question.option_a);
                        if (question.option_b) options.push(question.option_b);
                        if (question.option_c) options.push(question.option_c);
                        if (question.option_d) options.push(question.option_d);
                        const correctIndex = options.indexOf(correctAnswer);
                        if (correctIndex >= 0) {
                            const correctElement = document.getElementById(`option-container-${correctIndex}`);
                            if (correctElement) {
                                correctElement.style.borderColor = '#10b981';
                                correctElement.style.background = '#d1fae5';
                                correctElement.classList.add('correct');
                            }
                        }
                    }
                }
            }
            
            // Show explanation if available
            if (savedAnswer.answered && question.explanation) {
                const explanationContainer = document.getElementById('explanationContainer');
                const explanationText = document.getElementById('explanationText');
                if (explanationContainer && explanationText) {
                    explanationContainer.style.display = 'block';
                    explanationText.textContent = question.explanation;
                }
            }
        }

        const answeredCount = this.currentCourseQuestions.filter(q => this.userTestAnswers?.[q.id]?.answered).length;
        const completion = Math.min(100, Math.round((answeredCount / Math.max(this.currentCourseQuestions.length, 1)) * 100));
        const progressText = document.getElementById('questionProgress');
        const progressTop = document.getElementById('niqTestProgressText');
        const progressBar = document.getElementById('niqTestProgressBar');
        if (progressText) progressText.textContent = `${completion}% Complete`;
        if (progressTop) progressTop.textContent = `${completion}%`;
        if (progressBar) progressBar.style.width = `${completion}%`;
        this.renderQuestionNavigation();
    }
    
    // ============================================================
    // 📄 LOAD ANSWER OPTIONS
    // ============================================================
    loadAnswerOptions(question) {
        const optionsContainer = document.getElementById('optionsContainer');
        if (!optionsContainer) return;
        
        const options = [];
        if (question.option_a && question.option_a.trim() !== '') options.push(question.option_a);
        if (question.option_b && question.option_b.trim() !== '') options.push(question.option_b);
        if (question.option_c && question.option_c.trim() !== '') options.push(question.option_c);
        if (question.option_d && question.option_d.trim() !== '') options.push(question.option_d);
        
        if (options.length === 0) options = ['Option A', 'Option B', 'Option C', 'Option D'];
        
        const optionLabels = ['A', 'B', 'C', 'D'];
        let optionsHtml = '';
        
        options.forEach((option, index) => {
            if (index >= optionLabels.length) return;
            const optionLetter = optionLabels[index];
            
            optionsHtml += `
                <div style="padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; transition: all 0.2s; background: white;" 
                     onclick="window.selectOption(${index})" 
                     id="option-container-${index}"
                     onmouseover="this.style.borderColor='#4C1D95'; this.style.background='#f8fafc'"
                     onmouseout="if(!this.classList.contains('selected') && !this.classList.contains('correct') && !this.classList.contains('incorrect')){this.style.borderColor='#e2e8f0'; this.style.background='white'}">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="width: 24px; height: 24px; border-radius: 50%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 12px;">${optionLetter}</span>
                        <span>${option}</span>
                    </div>
                </div>
            `;
        });
        
        optionsContainer.innerHTML = optionsHtml;
        
        // ✅ FIX: Check if already answered - use question.id
        const savedAnswer = this.userTestAnswers[question.id];
        if (savedAnswer?.answered) {
            const selectedIndex = savedAnswer.selectedOptionIndex;
            if (selectedIndex !== undefined) {
                this.selectOption(selectedIndex);
            }
        }
    }
    
    // ============================================================
    // 🎯 SELECT OPTION - FIXED
    // ============================================================
    selectOption(index) {
        document.querySelectorAll('#optionsContainer > div').forEach(el => {
            el.classList.remove('selected', 'correct', 'incorrect');
            el.style.borderColor = '#e2e8f0';
            el.style.background = 'white';
        });
        
        const selectedElement = document.getElementById(`option-container-${index}`);
        if (selectedElement) {
            selectedElement.classList.add('selected');
            selectedElement.style.borderColor = '#4C1D95';
            selectedElement.style.background = '#ede9fe';
        }
        
        const question = this.currentCourseQuestions[this.currentQuestionIndex];
        if (question) {
            const optionText = this.getOptionText(index);
            // ✅ FIX: Use question.id (UUID), not index
            this.userTestAnswers[question.id] = {
                selectedOption: optionText,
                selectedOptionIndex: index,
                answered: false,
                timestamp: new Date().toISOString(),
                courseId: question.course_id,
                courseName: this.currentCourseForTest?.name,
                questionText: question.question_text,
                difficulty: question.difficulty
            };
            this.saveUserProgress();
            this.renderQuestionNavigation();
        }
    }
    
    // ============================================================
    // ✅ CHECK ANSWER - FIXED
    // ============================================================
    checkAnswer() {
        const question = this.currentCourseQuestions[this.currentQuestionIndex];
        if (!question) {
            this.showNotification('No question found!', 'error');
            return;
        }
        
        // ✅ FIX: Use question.id (UUID), not question index
        const userAnswer = this.userTestAnswers[question.id];
        if (!userAnswer || userAnswer.selectedOptionIndex === undefined) {
            this.showNotification('Please select an answer first!', 'warning');
            return;
        }
        
        const correctAnswer = question.correct_answer || '';
        const selectedOption = userAnswer.selectedOption;
        const isCorrect = selectedOption === correctAnswer;
        
        const selectedIndex = userAnswer.selectedOptionIndex;
        const selectedElement = document.getElementById(`option-container-${selectedIndex}`);
        
        let correctIndex = -1;
        const options = [];
        if (question.option_a) options.push(question.option_a);
        if (question.option_b) options.push(question.option_b);
        if (question.option_c) options.push(question.option_c);
        if (question.option_d) options.push(question.option_d);
        options.forEach((opt, idx) => {
            if (opt === correctAnswer) correctIndex = idx;
        });
        
        if (selectedElement) {
            if (isCorrect) {
                selectedElement.classList.add('correct');
                selectedElement.style.borderColor = '#10b981';
                selectedElement.style.background = '#d1fae5';
            } else {
                selectedElement.classList.add('incorrect');
                selectedElement.style.borderColor = '#dc2626';
                selectedElement.style.background = '#fee2e2';
            }
        }
        
        if (correctIndex >= 0) {
            const correctElement = document.getElementById(`option-container-${correctIndex}`);
            if (correctElement && !isCorrect) {
                correctElement.style.borderColor = '#10b981';
                correctElement.style.background = '#d1fae5';
                correctElement.classList.add('correct');
            }
        }
        
        // ✅ FIX: Use question.id (UUID) as the key
        this.userTestAnswers[question.id] = {
            ...userAnswer,
            answered: true,
            correct: isCorrect,
            correctAnswer: correctAnswer,
            timestamp: new Date().toISOString(),
            courseId: question.course_id,
            courseName: this.currentCourseForTest?.name,
            questionText: question.question_text,
            difficulty: question.difficulty
        };
        
        const explanationContainer = document.getElementById('explanationContainer');
        const explanationText = document.getElementById('explanationText');
        if (explanationContainer && explanationText) {
            explanationContainer.style.display = 'block';
            explanationText.textContent = question.explanation || 'No explanation available.';
        }
        
        // ✅ Save progress (this saves to localStorage AND database)
        this.saveUserProgress();
        
        // ✅ Force save to database immediately
        this.saveProgressToDatabase();
        
        this.showNotification(isCorrect ? 'You are correct! Point earned.' : 'Incorrect. Review the explanation.', isCorrect ? 'success' : 'error');
    }
    
    // ============================================================
    // 🔄 RESET QUESTION - FIXED
    // ============================================================
    resetQuestion() {
        const question = this.currentCourseQuestions[this.currentQuestionIndex];
        if (question) {
            // ✅ FIX: Use question.id (UUID)
            delete this.userTestAnswers[question.id];
        }
        
        document.querySelectorAll('#optionsContainer > div').forEach(el => {
            el.classList.remove('selected', 'correct', 'incorrect');
            el.style.borderColor = '#e2e8f0';
            el.style.background = 'white';
        });
        
        const explanationContainer = document.getElementById('explanationContainer');
        if (explanationContainer) explanationContainer.style.display = 'none';
        
        this.saveUserProgress();
        this.showNotification('Question reset. Try again!', 'info');
    }
    
    // ============================================================
    // ⬅️ PREVIOUS QUESTION
    // ============================================================
    prevQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.loadCurrentQuestion();
        }
    }
    
    // ============================================================
    // ➡️ NEXT QUESTION
    // ============================================================
    nextQuestion() {
        if (this.currentQuestionIndex < this.currentCourseQuestions.length - 1) {
            this.currentQuestionIndex++;
            this.loadCurrentQuestion();
        }
    }
    
    updateQuestionButtons() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        if (prevBtn) prevBtn.disabled = this.currentQuestionIndex === 0;
        if (nextBtn) nextBtn.disabled = this.currentQuestionIndex === this.currentCourseQuestions.length - 1;
    }
    
    // ============================================================
    // 🏁 FINISH PRACTICE
    // ============================================================
    async finishPractice() {
        const userStats = this.getCourseUserStats(this.currentCourseForTest.id, this.currentCourseQuestions);
        const answeredCount = userStats.answered;
        const correctCount = userStats.correct;
        const accuracy = userStats.accuracy;
        const totalQuestions = this.currentCourseQuestions.length;
        
        const allAnswered = answeredCount === totalQuestions;
        const warningMessage = allAnswered ? '' : `⚠️ You have ${totalQuestions - answeredCount} unanswered questions.`;
        
        const confirmFinish = confirm(
            `Finish Practice Session?\n\n` +
            `📊 Summary:\n` +
            `✅ Answered: ${answeredCount}/${totalQuestions}\n` +
            `🎯 Correct: ${correctCount}\n` +
            `📈 Accuracy: ${accuracy}%\n` +
            `${warningMessage}\n\n` +
            `Click OK to finish and see your results.`
        );
        
        if (confirmFinish) {
            // ✅ Force save before finishing
            await this.saveProgressToDatabase();
            this.closeCourseTestFullscreen();
            this.showNotification(`🎉 Practice complete! ${accuracy}% accuracy`, 'success');
            this.saveUserProgress();
        }
    }
    
    // ============================================================
    // 🔍 CLEAR SEARCH
    // ============================================================
    clearQuestionBankSearch() {
        if (this.studentQuestionBankSearch) {
            this.studentQuestionBankSearch.value = '';
            this.loadQuestionBankCards();
        }
    }
    
    // ============================================================
    // ⏳ LOADING / ERROR STATES
    // ============================================================
    showLoading() {
        if (this.studentQuestionBankLoading) this.studentQuestionBankLoading.style.display = 'block';
        if (this.studentQuestionBankContent) {
            this.studentQuestionBankContent.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #94a3b8;">
                    <div style="width: 40px; height: 40px; border: 3px solid #e5e7eb; border-top-color: #4C1D95; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px;"></div>
                    <p style="margin: 8px 0 0 0;">Loading questions for ${this.programDisplayName}...</p>
                </div>
            `;
        }
    }
    
    hideLoading() {
        if (this.studentQuestionBankLoading) this.studentQuestionBankLoading.style.display = 'none';
    }
    
    showError(message) {
        if (this.studentQuestionBankContent) {
            this.studentQuestionBankContent.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #94a3b8;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #dc2626; display: block; margin-bottom: 16px;"></i>
                    <h3 style="color: #1e293b; margin: 0;">Failed to Load Question Bank</h3>
                    <p style="color: #64748b; margin: 8px 0 16px 0;">${message}</p>
                    <button onclick="window.loadQuestionBankCards()" style="padding: 10px 24px; background: #4C1D95; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500;">
                        <i class="fas fa-redo"></i> Try Again
                    </button>
                </div>
            `;
        }
    }
    
    // ============================================================
    // 🚀 FORCE SAVE TO DATABASE
    // ============================================================
    async forceSaveToDatabase() {
        console.log('💾 Force saving NurseIQ to database...');
        await this.saveProgressToDatabase();
        console.log('✅ Force save complete!');
    }
    

    // ============================================================
    // 🧠 EXAM REVIEW — RELEASED RESULTS
    // ============================================================

    escapeReviewHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    getReviewSupabase() {
        return this.getSupabaseClient() || window.supabase || window.db?.supabase || null;
    }

    getExamModuleList() {
        const module = window.examsModule || null;
        return Array.isArray(module?.allExams) ? module.allExams :
               Array.isArray(module?.exams) ? module.exams :
               Array.isArray(window.studentExams) ? window.studentExams : [];
    }

    isReleasedExamRecord(exam, grade, releasedIds) {
        const status = String(grade?.result_status || '').toUpperCase();
        return (
            status === 'PASS' ||
            status === 'FAIL' ||
            status === 'RELEASED' ||
            grade?.released === true ||
            grade?.released === 'true' ||
            !!grade?.released_at ||
            (!!grade?.id && releasedIds.has(String(grade.id))) ||
            exam?.isReleased === true
        );
    }

    formatReviewDate(value) {
        if (!value) return '—';
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return '—';
        return d.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }

    getReviewGradeLabel(percent) {
        const p = Number(percent || 0);
        if (p >= 85) return 'Distinction';
        if (p >= 75) return 'Credit';
        if (p >= 60) return 'Pass';
        return 'Fail';
    }

    getReviewScore(grade, exam) {
        const score = Number(grade?.marks ?? grade?.score ?? grade?.total_score ?? 0) || 0;
        const total = Number(
            grade?.marks_out_of ??
            grade?.total_marks ??
            exam?.total_marks ??
            exam?.marks_out_of ??
            100
        ) || 100;
        const percentage = Number(
            grade?.percentage ??
            grade?.total_percentage ??
            grade?.score_percentage
        );

        return {
            score,
            total,
            percent: Number.isFinite(percentage) && percentage > 0
                ? Math.round(percentage)
                : Math.round((score / total) * 100)
        };
    }

    async setupExamReviewUI() {
        if (this._examReviewBound) return;
        this._examReviewBound = true;

        const nurseiq = document.getElementById('nurseiq');
        if (!nurseiq) return;

        nurseiq.querySelectorAll('[data-niq-view]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const view = btn.getAttribute('data-niq-view');

                nurseiq.querySelectorAll('[data-niq-view]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                if (view === 'exam-review') {
                    await this.loadReleasedExamReviews();
                    const panel = document.getElementById('niqExamReviewPanel');
                    if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });

        const selector = document.getElementById('nurseiqExamSelector');
        const reviewButton = document.getElementById('nurseiqReviewSelectedBtn');

        if (selector) {
            selector.addEventListener('change', () => {
                const exam = (this.releasedExamReviews || [])
                    .find(e => String(e.examId) === String(selector.value));

                if (exam) this.updateExamReviewSelection(exam);
            });
        }

        if (reviewButton) {
            reviewButton.addEventListener('click', () => {
                const examId = selector?.value;
                if (!examId) {
                    this.showNotification('Select a released exam first.', 'warning');
                    return;
                }
                this.openExamReview(examId);
            });
        }

        const randomButton = document.getElementById('randomQuestionBtn');
        if (randomButton && !randomButton.dataset.niqBound) {
            randomButton.dataset.niqBound = '1';
            randomButton.addEventListener('click', async () => {
                if (!this.initialized && !this._isLoadingQuestions) {
                    await this.loadQuestionBankCards();
                }

                const courses = Array.isArray(this.questionBankCourses) ? this.questionBankCourses : [];
                const allQuestions = courses.flatMap(c => c.questions || []);

                if (!allQuestions.length) {
                    this.showNotification('Load the course catalog first.', 'info');
                    return;
                }

                const q = allQuestions[Math.floor(Math.random() * allQuestions.length)];
                const course = courses.find(c => String(c.id) === String(q.course_id));

                if (course) {
                    const questionIndex = course.questions.findIndex(x => String(x.id) === String(q.id));
                    this.startCourseTest(course.id, course.name, Math.max(0, questionIndex));
                }
            });
        }

        await this.loadReleasedExamReviews();
    }

    updateExamReviewSelection(exam) {
        const score = this.getReviewScore(exam.grade, exam.exam);
        const selector = document.getElementById('nurseiqExamSelector');

        if (selector && selector.value !== String(exam.examId)) {
            selector.value = String(exam.examId);
        }

        const tableBody = document.getElementById('nurseiqReleasedExamsTableBody');
        if (tableBody) {
            tableBody.querySelectorAll('tr').forEach(row => row.classList.remove('niq-selected-row'));
            const row = [...tableBody.querySelectorAll('tr')]
                .find(r => String(r.getAttribute('data-exam-id')) === String(exam.examId));

            if (row) row.classList.add('niq-selected-row');
        }

        const meta = document.getElementById('nurseiqExamReviewMeta');
        if (meta) {
            meta.textContent = `${exam.examType} • ${this.formatReviewDate(exam.date)} • ${score.score}/${score.total} (${score.percent}%)`;
        }
    }

    async loadReleasedExamReviews() {
        const supabase = this.getReviewSupabase();
        const tableBody = document.getElementById('nurseiqReleasedExamsTableBody');
        const selector = document.getElementById('nurseiqExamSelector');

        if (!supabase || !this.userId) {
            this.releasedExamReviews = [];

            if (tableBody) {
                tableBody.innerHTML = `
                    <tr><td colspan="6">
                        <div class="niq-empty">
                            <i class="fas fa-user-lock"></i>
                            <strong>Please log in to view your exam results.</strong>
                            <span>Your released assessments will appear here.</span>
                        </div>
                    </td></tr>`;
            }
            return;
        }

        try {
            const sentinel = '00000000-0000-0000-0000-000000000000';

            const [gradesResult, releasedResult] = await Promise.all([
                supabase
                    .from('exam_grades')
                    .select('*')
                    .eq('student_id', this.userId)
                    .eq('question_id', sentinel),
                supabase
                    .from('released_exam_results')
                    .select('result_id')
            ]);

            const summaryGrades = gradesResult.data || [];
            const releasedIds = new Set(
                (releasedResult.data || []).map(r => String(r.result_id))
            );

            const examIds = [...new Set(
                summaryGrades
                    .map(g => g.exam_id)
                    .filter(v => v !== null && v !== undefined)
            )];

            let exams = [];

            if (examIds.length) {
                const { data: examRows, error: examError } = await supabase
                    .from('exams')
                    .select('*')
                    .in('id', examIds);

                if (!examError) exams = examRows || [];
            }

            const moduleExams = this.getExamModuleList();
            const examMap = new Map(
                exams.map(e => [String(e.id ?? e.exam_id), e])
            );

            moduleExams.forEach(e => {
                const id = e.id ?? e.exam_id;
                if (id !== undefined && id !== null && !examMap.has(String(id))) {
                    examMap.set(String(id), e);
                }
            });

            const reviews = [];

            summaryGrades.forEach(grade => {
                const exam = examMap.get(String(grade.exam_id));
                if (!exam) return;
                if (!this.isReleasedExamRecord(exam, grade, releasedIds)) return;

                const score = this.getReviewScore(grade, exam);
                const examName =
                    exam.exam_name ||
                    exam.title ||
                    `Assessment ${grade.exam_id}`;

                reviews.push({
                    examId: grade.exam_id,
                    gradeId: grade.id,
                    exam,
                    grade,
                    examName,
                    examType: String(
                        exam.exam_type ||
                        (exam.isCatExam ? 'CAT' : 'EXAM')
                    ).toUpperCase(),
                    date:
                        grade.released_at ||
                        grade.graded_at ||
                        grade.updated_at ||
                        exam.exam_end_date ||
                        exam.end_date ||
                        exam.examEndDateTime,
                    score: score.score,
                    total: score.total,
                    percent: score.percent,
                    gradeLabel: this.getReviewGradeLabel(score.percent)
                });
            });

            // Fallback to the already-loaded Exams module when direct
            // summary rows are unavailable but the Exams module knows
            // that the result is released.
            if (!reviews.length) {
                moduleExams
                    .filter(e => e.isReleased && e.hasGrade)
                    .forEach(e => {
                        const score = this.getReviewScore(e, e);

                        reviews.push({
                            examId: e.id,
                            gradeId: e.gradeId || e.id,
                            exam: e,
                            grade: e.grade || e,
                            examName: e.exam_name || e.title || `Assessment ${e.id}`,
                            examType: String(
                                e.exam_type || (e.isCatExam ? 'CAT' : 'EXAM')
                            ).toUpperCase(),
                            date: e.gradedAt || e.released_at || e.examEndDateTime || e.examStartDateTime,
                            score: score.score,
                            total: score.total,
                            percent: score.percent,
                            gradeLabel: this.getReviewGradeLabel(score.percent)
                        });
                    });
            }

            // Only show assessments that the student actually attempted.
            // A sentinel summary grade / hasGrade record represents an attended
            // attempt; scheduled, upcoming and missed assessments are excluded.
            const attemptedReviews = reviews.filter(r => {
                const hasSummaryAttempt = summaryGrades.some(g =>
                    String(g.exam_id) === String(r.examId) &&
                    String(g.student_id || this.userId) === String(this.userId)
                );
                const hasModuleAttempt = Boolean(r.grade && (r.gradeId || r.grade?.id)) ||
                    Boolean(r.exam?.hasGrade && (r.exam?.gradeId || r.exam?.grade));
                return hasSummaryAttempt || hasModuleAttempt;
            });

            const uniqueReviews = Array.from(
                new Map(attemptedReviews.map(r => [String(r.examId), r])).values()
            );

            uniqueReviews.sort((a, b) =>
                new Date(b.date || 0) - new Date(a.date || 0)
            );

            this.releasedExamReviews = uniqueReviews;
            this.completedExamCount = uniqueReviews.length;

            this.renderReleasedExamReviews();

            if (this.currentExamReview) {
                const current = reviews.find(
                    r => String(r.examId) === String(this.currentExamReview.examId)
                );
                if (current) this.updateExamReviewSelection(current);
            }

            this.updateNurseIQRedesignStats(
                this.getDashboardMetrics(),
                this.calculateNurseIQPoints()
            );
        } catch (error) {
            console.error('❌ Failed to load released exam reviews:', error);
            this.releasedExamReviews = [];

            if (tableBody) {
                tableBody.innerHTML = `
                    <tr><td colspan="6">
                        <div class="niq-empty">
                            <i class="fas fa-circle-exclamation"></i>
                            <strong>Unable to load released results.</strong>
                            <span>Please refresh and try again.</span>
                        </div>
                    </td></tr>`;
            }
        }
    }

    ensureExamReviewNavigatorStyles() {
        if (document.getElementById('nurseiq-exam-review-navigator-styles')) return;
        const style = document.createElement('style');
        style.id = 'nurseiq-exam-review-navigator-styles';
        style.textContent = `
            .niq-question-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px}
            .niq-qnav{width:100%;aspect-ratio:1/1;border:1px solid #dbe4ef;border-radius:9px;background:#f8fafc;color:#64748b;font-weight:800;font-size:11px;cursor:pointer;transition:.16s ease;box-sizing:border-box}
            .niq-qnav.correct{background:#eff6ff!important;border-color:#3b82f6!important;color:#1d4ed8!important}
            .niq-qnav.incorrect{background:#fef2f2!important;border-color:#ef4444!important;color:#dc2626!important}
            .niq-qnav.unanswered{background:#f8fafc!important;border-color:#cbd5e1!important;color:#64748b!important}
            .niq-qnav.active{box-shadow:0 0 0 3px rgba(37,99,235,.16);transform:translateY(-1px)}
            .niq-qnav.correct.active{box-shadow:0 0 0 3px rgba(37,99,235,.24)}
            .niq-qnav.incorrect.active{box-shadow:0 0 0 3px rgba(239,68,68,.20)}
            @media(max-width:520px){.niq-question-grid{grid-template-columns:repeat(6,minmax(0,1fr));gap:6px}.niq-qnav{font-size:10px;border-radius:7px}}
        `;
        document.head.appendChild(style);
    }

    renderReleasedExamReviews() {
        const tableBody = document.getElementById('nurseiqReleasedExamsTableBody');
        const selector = document.getElementById('nurseiqExamSelector');

        if (!tableBody || !selector) return;

        const reviews = this.releasedExamReviews || [];

        selector.innerHTML =
            '<option value="">Select a released exam...</option>' +
            reviews.map(e => `
                <option value="${this.escapeReviewHtml(e.examId)}">
                    ${this.escapeReviewHtml(e.examName)} — ${this.escapeReviewHtml(e.examType)} — ${e.percent}%
                </option>
            `).join('');

        if (!reviews.length) {
            tableBody.innerHTML = `
                <tr><td colspan="6">
                    <div class="niq-empty">
                        <i class="fas fa-folder-open"></i>
                        <strong>No released exam results yet.</strong>
                        <span>Completed assessments will appear here once their results are released.</span>
                    </div>
                </td></tr>`;
            return;
        }

        tableBody.innerHTML = reviews.map(exam => `
            <tr data-exam-id="${this.escapeReviewHtml(exam.examId)}">
                <td>
                    <div class="niq-exam-name">${this.escapeReviewHtml(exam.examName)}</div>
                    <span class="niq-exam-type">${this.escapeReviewHtml(exam.examType)}</span>
                </td>
                <td>${this.escapeReviewHtml(this.formatReviewDate(exam.date))}</td>
                <td>
                    <span class="niq-score">${this.escapeReviewHtml(exam.score)}/${this.escapeReviewHtml(exam.total)}</span>
                    <small>${this.escapeReviewHtml(exam.percent)}%</small>
                </td>
                <td><strong style="font-size:9px;color:#475569">${this.escapeReviewHtml(exam.gradeLabel)}</strong></td>
                <td><span class="niq-release-badge"><i class="fas fa-check"></i> Released</span></td>
                <td>
                    <button type="button" class="niq-review-btn"
                        onclick="window.nurseiqModule?.openExamReview('${this.escapeReviewHtml(exam.examId)}')">
                        <i class="fas fa-book-open"></i> Review
                    </button>
                </td>
            </tr>
        `).join('');

        const first = reviews[0];
        if (first) {
            selector.value = String(first.examId);
            this.updateExamReviewSelection(first);
        }
    }

    async openExamReview(examId) {
        const container = document.getElementById('nurseiqExamReview');
        const body = document.getElementById('nurseiqExamReviewBody');
        const nurseiq = document.getElementById('nurseiq');

        if (!container || !body || !nurseiq) {
            throw new Error('NurseIQ exam review container is missing from the HTML.');
        }

        let exam = (this.releasedExamReviews || [])
            .find(e => String(e.examId) === String(examId));

        if (!exam) {
            await this.loadReleasedExamReviews();
            exam = (this.releasedExamReviews || [])
                .find(e => String(e.examId) === String(examId));
        }

        if (!exam) {
            this.showNotification(
                'This exam is not available for review. Results may still be pending release.',
                'warning'
            );
            return;
        }

        const supabase = this.getReviewSupabase();

        if (!supabase || !this.userId) {
            this.showNotification('Please log in again to review this exam.', 'warning');
            return;
        }

        container.style.display = 'block';
        nurseiq.classList.add('niq-review-mode');

        const title = document.getElementById('nurseiqExamReviewTitle');
        const meta = document.getElementById('nurseiqExamReviewMeta');
        const status = document.getElementById('nurseiqExamReviewStatus');
        const scoreEl = document.getElementById('nurseiqReviewScore');
        const correctEl = document.getElementById('nurseiqReviewCorrect');
        const totalEl = document.getElementById('nurseiqReviewTotal');
        const pointsEl = document.getElementById('nurseiqReviewPoints');

        if (title) title.textContent = exam.examName;
        if (meta) {
            meta.textContent =
                `${exam.examType} • ${this.formatReviewDate(exam.date)} • ${exam.score}/${exam.total} (${exam.percent}%)`;
        }
        if (status) status.textContent = 'RESULTS RELEASED';
        if (scoreEl) scoreEl.textContent = `${exam.score}/${exam.total}`;
        if (totalEl) totalEl.textContent = '—';
        if (correctEl) correctEl.textContent = '—';
        if (pointsEl) pointsEl.textContent = `+${this.examReviewState?.points || 0}`;

        body.innerHTML = `
            <div class="niq-review-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <div>Loading your submitted answers...</div>
            </div>`;

        try {
            const [questionsResult, answersResult] = await Promise.all([
                supabase
                    .from('exam_questions')
                    .select('*')
                    .eq('exam_id', exam.examId)
                    .order('question_number', { ascending: true }),
                supabase
                    .from('exam_grades')
                    .select('*')
                    .eq('student_id', this.userId)
                    .eq('exam_id', exam.examId)
                    .neq('question_id', '00000000-0000-0000-0000-000000000000')
            ]);

            if (questionsResult.error) throw questionsResult.error;
            if (answersResult.error) throw answersResult.error;

            const questions = questionsResult.data || [];
            const answers = answersResult.data || [];
            const answerMap = new Map(
                answers.map(a => [String(a.question_id), a])
            );

            const reviewQuestions = questions.map((q, index) => {
                const answer = answerMap.get(String(q.id));

                const selected =
                    answer?.selected_answer ??
                    answer?.student_answer ??
                    answer?.answer ??
                    '';

                const correct =
                    q.correct_answer ??
                    q.answer ??
                    '';

                const normalizedSelected = String(selected || '').trim();
                const normalizedCorrect = String(correct || '').trim();

                const isAnswered = normalizedSelected !== '';
                const isCorrect =
                    isAnswered &&
                    normalizedSelected.toLowerCase() === normalizedCorrect.toLowerCase();

                return {
                    id: q.id,
                    number: q.question_number ?? index + 1,
                    text: q.question_text || q.question || `Question ${index + 1}`,
                    options: [
                        ['A', q.option_a],
                        ['B', q.option_b],
                        ['C', q.option_c],
                        ['D', q.option_d]
                    ].filter(([, value]) =>
                        value !== null &&
                        value !== undefined &&
                        String(value).trim() !== ''
                    ),
                    selected,
                    correct,
                    isAnswered,
                    isCorrect,
                    explanation: q.explanation || q.rationale || '',
                    marks: answer?.marks ?? 0,
                    totalMarks: q.marks ?? 1
                };
            });

            const correctCount = reviewQuestions.filter(q => q.isCorrect).length;

            this.currentExamReview = {
                examId: exam.examId,
                gradeId: exam.gradeId,
                examName: exam.examName,
                examType: exam.examType,
                score: exam.score,
                total: exam.total,
                percent: exam.percent,
                questions: reviewQuestions,
                currentIndex: 0,
                attemptKey: `${exam.examId}:${exam.gradeId || 'released'}`
            };

            if (correctEl) correctEl.textContent = `${correctCount}/${reviewQuestions.length}`;
            if (totalEl) totalEl.textContent = String(reviewQuestions.length);
            const reviewQuestionsCountEl = document.getElementById('niqReviewQuestionsCount');
            if (reviewQuestionsCountEl) reviewQuestionsCountEl.textContent = String(reviewQuestions.length);

            await this.renderExamReviewQuestion(0);
            this.updateExamReviewSelection(exam);

            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
            console.error('❌ Exam review load failed:', error);

            body.innerHTML = `
                <div class="niq-empty">
                    <i class="fas fa-triangle-exclamation"></i>
                    <strong>Unable to load the exam review.</strong>
                    <span>${this.escapeReviewHtml(error.message || 'Please try again.')}</span>
                </div>`;
        }
    }

    async renderExamReviewQuestion(index) {
        const review = this.currentExamReview;
        const body = document.getElementById('nurseiqExamReviewBody');

        if (!review || !body || !review.questions?.length) {
            if (body) {
                body.innerHTML = `
                    <div class="niq-empty">
                        <i class="fas fa-file-circle-question"></i>
                        <strong>No question review data is available.</strong>
                        <span>The released result is available, but submitted question details could not be found.</span>
                    </div>`;
            }
            return;
        }

        const safeIndex = Math.max(
            0,
            Math.min(index, review.questions.length - 1)
        );

        review.currentIndex = safeIndex;
        const q = review.questions[safeIndex];

        await this.recordExamReviewPoint(q.id, review.attemptKey);

        const statusClass =
            !q.isAnswered ? 'unanswered' :
            q.isCorrect ? 'correct' : 'incorrect';

        const statusText =
            !q.isAnswered ? 'NOT ANSWERED' :
            q.isCorrect ? 'CORRECT' : 'INCORRECT';

        this.ensureExamReviewNavigatorStyles();

        const nav = review.questions.map((item, i) => {
            const statusClass = item.isCorrect
                ? 'correct'
                : item.isAnswered
                    ? 'incorrect'
                    : 'unanswered';
            const cls = [
                'niq-qnav',
                statusClass,
                i === safeIndex ? 'active' : ''
            ].filter(Boolean).join(' ');

            const statusLabel = item.isCorrect
                ? 'Correct'
                : item.isAnswered
                    ? 'Wrong'
                    : 'Not answered';

            return `
                <button type="button" class="${cls}"
                    title="Question ${i + 1}: ${statusLabel}"
                    aria-label="Question ${i + 1}: ${statusLabel}"
                    onclick="window.nurseiqModule?.renderExamReviewQuestion(${i})">
                    ${i + 1}
                </button>`;
        }).join('');

        const options = q.options.map(([letter, value]) => {
            const isStudent =
                String(q.selected || '').trim().toLowerCase() ===
                String(value).trim().toLowerCase();

            const isCorrect =
                String(q.correct || '').trim().toLowerCase() ===
                String(value).trim().toLowerCase();

            const cls = [
                'niq-option',
                isStudent ? 'student' : '',
                isCorrect ? 'correct' : ''
            ].filter(Boolean).join(' ');

            return `
                <div class="${cls}">
                    <span class="letter">${letter}</span>
                    <span>
                        ${this.escapeReviewHtml(value)}
                        ${isStudent ? ' <strong style="font-size:8px;color:#B91C1C">(Your answer)</strong>' : ''}
                        ${isCorrect ? ' <strong style="font-size:8px;color:#15803D">(Correct)</strong>' : ''}
                    </span>
                </div>`;
        }).join('');

        const selectedDisplay = q.isAnswered ? q.selected : 'Not answered';
        const correctDisplay = q.correct || 'Not available';

        body.innerHTML = `
            <div class="niq-review-layout">
                <aside class="niq-review-nav">
                    <div class="niq-review-nav-head">
                        <strong>Question Navigator</strong>
                        <span>${review.questions.length} questions • select any question</span>
                    </div>
                    <div class="niq-question-grid">${nav}</div>
                </aside>

                <article class="niq-review-card">
                    <div class="niq-review-card-head">
                        <div>
                            <h3>Question ${q.number} of ${review.questions.length}</h3>
                            <p>${this.escapeReviewHtml(review.examName)} • ${this.escapeReviewHtml(review.examType)}</p>
                        </div>
                        <span class="niq-answer-status ${statusClass}">${statusText}</span>
                    </div>

                    <div class="niq-question-body">
                        <div class="niq-question-text">${this.escapeReviewHtml(q.text)}</div>

                        <div class="niq-options">
                            ${options || `
                                <div class="niq-option">
                                    <span class="letter">—</span>
                                    <span>No answer options were stored for this question.</span>
                                </div>`}
                        </div>

                        <div class="niq-answer-box">
                            <div class="niq-answer-item">
                                <label>Your Answer</label>
                                <strong>${this.escapeReviewHtml(selectedDisplay)}</strong>
                            </div>
                            <div class="niq-answer-item">
                                <label>Correct Answer</label>
                                <strong>${this.escapeReviewHtml(correctDisplay)}</strong>
                            </div>
                        </div>

                        <div class="niq-explanation">
                            <label>Explanation</label>
                            <p>${this.escapeReviewHtml(q.explanation || 'No explanation was provided for this question.')}</p>
                        </div>
                    </div>

                    <div class="niq-review-footer">
                        <button type="button"
                            onclick="window.nurseiqModule?.renderExamReviewQuestion(${safeIndex - 1})"
                            ${safeIndex === 0 ? 'disabled' : ''}>
                            <i class="fas fa-arrow-left"></i> Previous
                        </button>

                        <button type="button" class="primary"
                            onclick="window.nurseiqModule?.renderExamReviewQuestion(${safeIndex + 1})"
                            ${safeIndex === review.questions.length - 1 ? 'disabled' : ''}>
                            Next Question <i class="fas fa-arrow-right"></i>
                        </button>
                    </div>
                </article>
            </div>`;

        const scoreEl = document.getElementById('nurseiqReviewScore');
        const pointsEl = document.getElementById('nurseiqReviewPoints');

        if (scoreEl) scoreEl.textContent = `${review.score}/${review.total}`;
        if (pointsEl) pointsEl.textContent = `+${this.examReviewState?.points || 0}`;
    }

    async recordExamReviewPoint(questionId, attemptKey) {
        if (!questionId || !attemptKey) return;

        if (!this.examReviewState) {
            this.examReviewState = {
                points: 0,
                viewedQuestionIds: [],
                viewedQuestionIdsByAttempt: {}
            };
        }

        if (!Array.isArray(this.examReviewState.viewedQuestionIds)) {
            this.examReviewState.viewedQuestionIds = [];
        }

        if (
            !this.examReviewState.viewedQuestionIdsByAttempt ||
            typeof this.examReviewState.viewedQuestionIdsByAttempt !== 'object'
        ) {
            this.examReviewState.viewedQuestionIdsByAttempt = {};
        }

        const key = String(attemptKey);
        const qid = String(questionId);

        const attemptList = Array.isArray(
            this.examReviewState.viewedQuestionIdsByAttempt[key]
        )
            ? this.examReviewState.viewedQuestionIdsByAttempt[key]
            : [];

        // Same question in the same exam attempt never earns another point.
        if (attemptList.map(String).includes(qid)) return;

        attemptList.push(qid);
        this.examReviewState.viewedQuestionIdsByAttempt[key] = attemptList;

        // Preserve a legacy flat list for existing dashboard data.
        if (!this.examReviewState.viewedQuestionIds.map(String).includes(qid)) {
            this.examReviewState.viewedQuestionIds.push(qid);
        }

        this.examReviewState.points =
            Number(this.examReviewState.points || 0) + 1;

        const pointsEl = document.getElementById('nurseiqReviewPoints');
        const summaryEl = document.getElementById('niqReviewPointsSummary');

        if (pointsEl) pointsEl.textContent = `+${this.examReviewState.points}`;
        if (summaryEl) summaryEl.textContent = `+${this.examReviewState.points}`;

        this.updateNurseIQRedesignStats(
            this.getDashboardMetrics(),
            this.calculateNurseIQPoints()
        );

        this.saveUserProgress();
        await this.saveProgressToDatabase();
    }

    closeExamReview() {
        const nurseiq = document.getElementById('nurseiq');
        const container = document.getElementById('nurseiqExamReview');

        if (container) container.style.display = 'none';
        if (nurseiq) nurseiq.classList.remove('niq-review-mode');

        this.currentExamReview = null;

        nurseiq?.querySelectorAll('[data-niq-view]').forEach(btn => {
            btn.classList.toggle(
                'active',
                btn.getAttribute('data-niq-view') === 'practice'
            );
        });

        this.loadReleasedExamReviews();
    }

    // ============================================================
    // 🚀 INITIALIZE
    // ============================================================
    async initialize() {
        console.log('🚀 Initializing NurseIQ Module...');
        
        this.cacheElements();
        this.updateUIForProgram();
        await this.loadUserProgress();
        await this.loadQuestionBankCards();
        await this.setupExamReviewUI();

        this.updateNurseIQRedesignStats(
            this.getDashboardMetrics(),
            this.calculateNurseIQPoints()
        );

        // ✅ Force save to database on init
        await this.saveProgressToDatabase();

        this.initialized = true;
        console.log('✅ NurseIQ Module initialized successfully');
    }
}

// ============================================================
// 🌐 GLOBAL FUNCTIONS
// ============================================================

let nurseiqModule = null;

async function initNurseIQ() {
    console.log('🚀 Starting NurseIQ...');
    if (document.readyState === 'loading') {
        await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
    }
    nurseiqModule = new NurseIQModule();
    await nurseiqModule.initialize();
    return nurseiqModule;
}

// Global functions for HTML onclick
window.initNurseIQ = initNurseIQ;
window.loadQuestionBankCards = function() {
    if (nurseiqModule) nurseiqModule.loadQuestionBankCards();
    else initNurseIQ().then(() => nurseiqModule.loadQuestionBankCards()).catch(console.error);
};
window.clearQuestionBankSearch = function() {
    if (nurseiqModule) nurseiqModule.clearQuestionBankSearch();
};
window.startCourseTest = function(courseId, courseName, startIndex = 0) {
    if (nurseiqModule) nurseiqModule.startCourseTest(courseId, courseName, startIndex);
};
window.closeCourseTestFullscreen = function() {
    if (nurseiqModule) nurseiqModule.closeCourseTestFullscreen();
};
window.prevQuestion = function() {
    if (nurseiqModule) nurseiqModule.prevQuestion();
};
window.nextQuestion = function() {
    if (nurseiqModule) nurseiqModule.nextQuestion();
};
window.goToQuestion = function(index) {
    if (nurseiqModule) nurseiqModule.goToQuestion(index);
};
window.selectOption = function(index) {
    if (nurseiqModule) nurseiqModule.selectOption(index);
};
window.checkAnswer = function() {
    if (nurseiqModule) nurseiqModule.checkAnswer();
};
window.resetQuestion = function() {
    if (nurseiqModule) nurseiqModule.resetQuestion();
};
window.finishPractice = function() {
    if (nurseiqModule) nurseiqModule.finishPractice();
};
window.openNurseIQExamReview = function(examId) {
    if (nurseiqModule) return nurseiqModule.openExamReview(examId);
};
window.closeNurseIQExamReview = function() {
    if (nurseiqModule) nurseiqModule.closeExamReview();
};
window.renderNurseIQExamReviewQuestion = function(index) {
    if (nurseiqModule) return nurseiqModule.renderExamReviewQuestion(index);
};
window.clearAllProgress = function() {
    if (nurseiqModule) {
        if (confirm('Are you sure you want to clear all your progress? This cannot be undone.')) {
            localStorage.removeItem(nurseiqModule.storageKey);
            localStorage.removeItem(nurseiqModule.lastCourseProgressKey);
            localStorage.removeItem(nurseiqModule.dashboardMetricsKey);
            nurseiqModule.userTestAnswers = {};
            nurseiqModule.showNotification('All progress cleared', 'success');
            nurseiqModule.updateDashboardMetrics();
            nurseiqModule.loadQuestionBankCards();
        }
    }
};
window.forceSaveNurseIQ = function() {
    if (nurseiqModule) {
        nurseiqModule.forceSaveToDatabase();
    } else {
        console.error('❌ NurseIQ module not initialized');
    }
};

// ============================================================
// 🚀 AUTO-INITIALIZE ON PAGE LOAD
// ============================================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => initNurseIQ().catch(console.error), 500);
    });
} else {
    setTimeout(() => initNurseIQ().catch(console.error), 500);
}

console.log('✅ NurseIQ module loaded - SAVES TO DATABASE!');
console.log('📚 Questions grouped by course, latest on top!');
console.log('🏷️ Auto-detects KRCHN/TVET programs like Finance Module!');
console.log('💰 Points: 2 per correct practice answer + 1 per unique reviewed exam question!');
console.log('💾 Saves practice progress + exam review state to user_progress and profile!');
