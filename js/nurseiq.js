// ============================================
// js/nurseiq.js - COMPLETE UPDATED VERSION
// ✅ Questions grouped by course (Medical Surgical together)
// ✅ Latest question banks on top
// ✅ Full TVET/KRCHN support with dynamic program detection
// ✅ Filter order: Years → Levels → Categories
// ============================================

// ============================================
// TVET PROGRAM CODES & DISPLAY NAMES
// ============================================
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

// ============================================
// HELPER: Get Current User ID
// ============================================
function getCurrentUserId() {
    if (window.currentUserProfile?.user_id) return window.currentUserProfile.user_id;
    if (window.currentUser?.id) return window.currentUser.id;
    if (window.userData?.id) return window.userData.id;
    
    const storedUserId = localStorage.getItem('userId') || 
                        localStorage.getItem('currentUserId') ||
                        localStorage.getItem('user_id');
    if (storedUserId) return storedUserId;
    
    const sessionUserId = sessionStorage.getItem('userId') ||
                         sessionStorage.getItem('currentUserId') ||
                         sessionStorage.getItem('user_id');
    if (sessionUserId) return sessionUserId;
    
    try {
        const sessionData = sessionStorage.getItem('supabase.auth.token');
        if (sessionData) {
            const parsed = JSON.parse(sessionData);
            if (parsed?.currentUser?.id) {
                return parsed.currentUser.id;
            }
        }
    } catch (e) {}
    
    console.warn('⚠️ No existing user found. Please login first.');
    return null;
}
window.getCurrentUserId = getCurrentUserId;

// ============================================
// COMPLETE NURSEIQ MODULE CLASS
// ============================================
class NurseIQModule {
    constructor() {
        this.userId = null;
        this.userProfile = null;
        this.currentProgram = 'nursing';
        this.programDisplayName = 'KRCHN Nursing';
        this.programCode = 'KRCHN';
        this.intakeYear = null;
        this.userBlock = null;
        this.isTVETStudent = false;
        
        // DOM elements
        this.studentQuestionBankSearch = null;
        this.nurseiqSearchBtn = null;
        this.clearSearchBtn = null;
        this.loadCourseCatalogBtn = null;
        this.studentQuestionBankLoading = null;
        this.studentQuestionBankContent = null;
        
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
        this.activeSessionId = null;
        this.testStartTime = null;
        this._isSaving = false;
    }
    
    // ============================================
    // GET USER PROFILE
    // ============================================
    getUserProfile() {
        let profile = null;
        
        if (window.currentUserProfile) profile = window.currentUserProfile;
        else if (window.db?.currentUserProfile) profile = window.db.currentUserProfile;
        else if (window.userProfile) profile = window.userProfile;
        
        if (!profile) {
            try {
                const savedProfile = localStorage.getItem('userProfile');
                if (savedProfile) profile = JSON.parse(savedProfile);
            } catch (e) {}
        }
        
        return profile;
    }
    
    // ============================================
    // GET SUPABASE CLIENT
    // ============================================
    getSupabaseClient() {
        return window.supabaseClient || (window.db?.supabase) || null;
    }
    
    // ============================================
    // SHOW NOTIFICATION
    // ============================================
    showNotification(message, type = 'info') {
        const colors = {
            success: '#10b981',
            error: '#dc2626',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        
        const container = document.getElementById('toast-container');
        if (container) {
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.style.cssText = `
                background: ${colors[type] || '#3b82f6'};
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                max-width: 400px;
                animation: slideIn 0.3s ease;
                font-size: 14px;
                margin-bottom: 8px;
            `;
            toast.innerHTML = `<i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i> ${message}`;
            container.appendChild(toast);
            setTimeout(() => toast.remove(), 4000);
        } else {
            console.log(`[${type}] ${message}`);
            if (type === 'error') {
                alert('❌ ' + message);
            } else if (type === 'warning') {
                alert('⚠️ ' + message);
            }
        }
    }
    
    // ============================================
    // CHECK IF USER EXISTS
    // ============================================
    async userExists(userId) {
        if (!userId) return false;
        
        try {
            const supabase = this.getSupabaseClient();
            if (!supabase) return false;
            
            const { data, error } = await supabase
                .from('consolidated_user_profiles_table')
                .select('user_id, full_name, email, role, program, student_id, block, intake_year, intake_month')
                .eq('user_id', userId)
                .maybeSingle();
            
            if (error) {
                console.error('❌ Error checking user:', error);
                return false;
            }
            
            if (data) {
                this.userProfile = data;
                console.log('✅ Existing user found:', data.full_name);
                return true;
            }
            
            console.warn('⚠️ User not found in database:', userId);
            return false;
            
        } catch (error) {
            console.error('❌ Error in userExists:', error);
            return false;
        }
    }
    
    // ============================================
    // ENSURE USER EXISTS
    // ============================================
    async ensureUserExists() {
        if (!this.userId) {
            console.warn('⚠️ No user ID found - please login');
            return false;
        }
        
        const exists = await this.userExists(this.userId);
        if (!exists) {
            console.warn('⚠️ User not found - please register/login first');
            this.showNotification('Please login to access NurseIQ features', 'warning');
            return false;
        }
        
        return true;
    }
    
    // ============================================
    // DETECT USER PROGRAM
    // ============================================
    detectUserProgram() {
        console.log('🔍 Detecting user program...');
        const profile = this.getUserProfile();
        
        if (profile) {
            this.userProfile = profile;
            console.log('📊 User profile data:', profile);
            
            let programCode = profile.program || 'KRCHN';
            this.programCode = String(programCode).toUpperCase().trim();
            this.intakeYear = profile.intake_year || 2026;
            this.userBlock = profile.block || profile.current_block || 'Introductory';
            
            if (TVET_PROGRAMS.includes(this.programCode) || this.programCode === 'TVET') {
                this.isTVETStudent = true;
                this.currentProgram = 'tvet';
                this.programDisplayName = PROGRAM_DISPLAY_NAMES[this.programCode] || this.programCode;
                console.log(`✅ Detected TVET: ${this.programCode} - ${this.programDisplayName}`);
            } else {
                this.isTVETStudent = false;
                this.currentProgram = 'nursing';
                this.programDisplayName = 'KRCHN Nursing';
                console.log('✅ Detected KRCHN Nursing');
            }
            
            this.updateStudentInfoDisplay();
            this.updateUIForProgram();
            return this.currentProgram;
        }
        
        console.log('⚠️ No program detected, defaulting to Nursing');
        this.currentProgram = 'nursing';
        this.programDisplayName = 'KRCHN Nursing (Default)';
        this.updateUIForProgram();
        return 'nursing';
    }
    
    // ============================================
    // UPDATE STUDENT INFO DISPLAY
    // ============================================
    updateStudentInfoDisplay() {
        const programCodeEl = document.getElementById('studentProgramCode');
        if (programCodeEl) programCodeEl.textContent = this.programCode || 'N/A';
        
        const intakeEl = document.getElementById('studentIntakeYear');
        if (intakeEl) intakeEl.textContent = this.intakeYear || '2026';
        
        const blockEl = document.getElementById('studentBlockTerm');
        if (blockEl) {
            blockEl.textContent = this.isTVETStudent ? 
                (this.userProfile?.term || this.userBlock || 'Term 1') : 
                (this.userBlock || 'Introductory');
        }
        
        const welcomeStudentProgram = document.getElementById('welcomeStudentProgram');
        if (welcomeStudentProgram) welcomeStudentProgram.textContent = this.programDisplayName || this.programCode || 'Loading...';
        
        const catalogStudentProgram = document.getElementById('catalogStudentProgram');
        if (catalogStudentProgram) catalogStudentProgram.textContent = this.programDisplayName || this.programCode || 'Loading...';
        
        const loadingProgramDisplay = document.getElementById('loadingProgramDisplay');
        if (loadingProgramDisplay) loadingProgramDisplay.textContent = this.programDisplayName || this.programCode || 'your program';
        
        const welcomeProgramInfo = document.getElementById('welcomeProgramInfo');
        if (welcomeProgramInfo) welcomeProgramInfo.textContent = `${this.programDisplayName} - ${this.isTVETStudent ? 'TVET' : 'Nursing'} Program`;
    }
    
    // ============================================
    // UPDATE UI FOR PROGRAM
    // ============================================
    updateUIForProgram() {
        const isNursing = this.currentProgram === 'nursing';
        const isTVET = this.currentProgram === 'tvet';
        
        console.log(`🔄 Updating UI for: ${this.currentProgram} (${this.programDisplayName})`);
        
        // Title and icon
        const titleEl = document.getElementById('nurseiqTitle');
        const iconEl = document.getElementById('nurseiqIcon');
        const badgeEl = document.getElementById('nurseiqSubtitleBadge');
        const subtitleEl = document.getElementById('nurseiqSubtitle');
        const indicatorText = document.getElementById('indicatorText');
        const indicatorIcon = document.getElementById('indicatorIcon');
        const switchNoteText = document.getElementById('switchNoteText');
        const programDisplayBadge = document.getElementById('programDisplayBadge');
        const programDisplayNameEl = document.getElementById('programDisplayName');
        const programDisplaySubtitle = document.getElementById('programDisplaySubtitle');
        
        // Welcome elements
        const welcomeIcon = document.getElementById('welcomeIconElement');
        const welcomeTitle = document.getElementById('welcomeTitle');
        const welcomeText = document.getElementById('welcomeText');
        const loadBtnText = document.getElementById('loadBtnText');
        
        if (isNursing) {
            if (titleEl) titleEl.textContent = 'NurseIQ';
            if (iconEl) iconEl.className = 'fas fa-brain';
            if (badgeEl) {
                badgeEl.textContent = 'KRCHN';
                badgeEl.style.background = '#FDB913';
                badgeEl.style.color = '#0A3D62';
            }
            if (subtitleEl) {
                subtitleEl.innerHTML = `<i class="fas fa-graduation-cap"></i> Practice questions for <span id="programDisplaySubtitle">KRCHN Nursing</span> program`;
            }
            if (indicatorText) indicatorText.textContent = 'Nursing Mode';
            if (indicatorIcon) indicatorIcon.className = 'fas fa-user-md';
            if (switchNoteText) switchNoteText.textContent = `Program: ${this.programDisplayName || 'KRCHN Nursing'}`;
            if (programDisplayBadge) {
                programDisplayBadge.style.display = 'inline-block';
                programDisplayBadge.style.background = 'rgba(253,185,19,0.2)';
                programDisplayBadge.style.color = '#FDB913';
            }
            if (programDisplayNameEl) programDisplayNameEl.textContent = this.programDisplayName || 'KRCHN';
            if (programDisplaySubtitle) programDisplaySubtitle.textContent = 'KRCHN Nursing';
            if (welcomeIcon) welcomeIcon.className = 'fas fa-book-medical';
            if (welcomeTitle) welcomeTitle.textContent = 'NurseIQ Question Bank';
            if (welcomeText) welcomeText.textContent = 'Access practice questions organized by curriculum courses.';
            if (loadBtnText) loadBtnText.textContent = 'Load Course Catalog';
            
        } else if (isTVET) {
            if (titleEl) titleEl.textContent = 'TVETIQ';
            if (iconEl) iconEl.className = 'fas fa-tools';
            if (badgeEl) {
                badgeEl.textContent = 'TVET';
                badgeEl.style.background = '#1a7a5a';
                badgeEl.style.color = 'white';
            }
            if (subtitleEl) {
                subtitleEl.innerHTML = `<i class="fas fa-graduation-cap"></i> Practice questions for <span id="programDisplaySubtitle">${this.programDisplayName}</span> program`;
            }
            if (indicatorText) indicatorText.textContent = 'TVET Mode';
            if (indicatorIcon) indicatorIcon.className = 'fas fa-tools';
            if (switchNoteText) switchNoteText.textContent = `Program: ${this.programDisplayName || 'TVET Program'}`;
            if (programDisplayBadge) {
                programDisplayBadge.style.display = 'inline-block';
                programDisplayBadge.style.background = 'rgba(26,122,90,0.2)';
                programDisplayBadge.style.color = '#1a7a5a';
            }
            if (programDisplayNameEl) programDisplayNameEl.textContent = this.programDisplayName || 'TVET';
            if (programDisplaySubtitle) programDisplaySubtitle.textContent = this.programDisplayName || 'TVET Program';
            if (welcomeIcon) welcomeIcon.className = 'fas fa-tools';
            if (welcomeTitle) welcomeTitle.textContent = 'TVETIQ Question Bank';
            if (welcomeText) welcomeText.textContent = `Access practice questions organized for ${this.programDisplayName || 'TVET Program'}.`;
            if (loadBtnText) loadBtnText.textContent = 'Load TVET Courses';
        }
        
        // Update welcome program info
        const welcomeProgramInfo = document.getElementById('welcomeProgramInfo');
        if (welcomeProgramInfo) welcomeProgramInfo.textContent = `${this.programDisplayName} - ${isTVET ? 'TVET' : 'Nursing'} Program`;
        
        this.updateFilterOptions();
        
        localStorage.setItem('nurseiq_program_mode', this.currentProgram);
        localStorage.setItem('nurseiq_program_display', this.programDisplayName);
        
        document.dispatchEvent(new CustomEvent('nurseiqProgramChanged', {
            detail: { 
                program: this.currentProgram,
                displayName: this.programDisplayName,
                isTVET: isTVET,
                isNursing: isNursing,
                programCode: this.programCode
            }
        }));
        
        console.log('✅ UI updated for program:', this.currentProgram, '-', this.programDisplayName);
    }
    
    // ============================================
    // UPDATE FILTER OPTIONS - ORDERED: Years → Levels → Categories
    // ============================================
    updateFilterOptions() {
        const isTVET = this.currentProgram === 'tvet';
        const isNursing = this.currentProgram === 'nursing';
        
        // Year filter - same for both
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
        
        // Level filter - changes based on program
        const levelFilter = document.getElementById('nurseiqLevelFilter');
        if (levelFilter) {
            levelFilter.innerHTML = '';
            const levels = isNursing ? [
                { value: 'all', label: '📚 All Levels' },
                { value: 'certificate', label: 'Certificate' },
                { value: 'diploma', label: 'Diploma' },
                { value: 'higher-diploma', label: 'Higher Diploma' },
                { value: 'degree', label: 'Degree' }
            ] : [
                { value: 'all', label: '📚 All Levels' },
                { value: 'artisan', label: '🔧 Artisan' },
                { value: 'certificate', label: '📜 Certificate' },
                { value: 'diploma', label: '🎓 Diploma' },
                { value: 'higher-diploma', label: '🎓 Higher Diploma' }
            ];
            levels.forEach(level => {
                const option = document.createElement('option');
                option.value = level.value;
                option.textContent = level.label;
                levelFilter.appendChild(option);
            });
        }
        
        // Category filter - changes based on program
        const categoryFilter = document.getElementById('nurseiqCategoryFilter');
        if (categoryFilter) {
            categoryFilter.innerHTML = '';
            const categories = isNursing ? [
                { value: 'all', label: '📂 All Categories' },
                { value: 'theory', label: '📖 Theory' },
                { value: 'practical', label: '💉 Practical' },
                { value: 'clinical', label: '🏥 Clinical' },
                { value: 'osce', label: '👨‍⚕️ OSCE' },
                { value: 'pharmacology', label: '💊 Pharmacology' },
                { value: 'anatomy', label: '🧬 Anatomy' },
                { value: 'physiology', label: '🫀 Physiology' }
            ] : [
                { value: 'all', label: '📂 All Categories' },
                { value: 'tvet-core', label: '⚙️ TVET Core' },
                { value: 'tvet-electives', label: '🔧 TVET Electives' },
                { value: 'tvet-practical', label: '🛠️ Practical Skills' },
                { value: 'tvet-theory', label: '📚 Theory' },
                { value: 'tvet-clinical', label: '🏥 Clinical' }
            ];
            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.value;
                option.textContent = cat.label;
                categoryFilter.appendChild(option);
            });
        }
    }
    
    // ============================================
    // CACHE DOM ELEMENTS
    // ============================================
    cacheElements() {
        this.studentQuestionBankSearch = document.getElementById('studentQuestionBankSearch');
        this.nurseiqSearchBtn = document.getElementById('nurseiqSearchBtn');
        this.clearSearchBtn = document.getElementById('clearSearchBtn');
        this.loadCourseCatalogBtn = document.getElementById('loadCourseCatalogBtn');
        this.studentQuestionBankLoading = document.getElementById('studentQuestionBankLoading');
        this.studentQuestionBankContent = document.getElementById('studentQuestionBankContent');
        
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
    
    // ============================================
    // INITIALIZE ELEMENTS
    // ============================================
    async initializeElements() {
        console.log('🔍 Initializing NurseIQ elements...');
        await this.waitForElement('#loadCourseCatalogBtn');
        this.cacheElements();
        
        if (this.studentQuestionBankSearch) {
            let searchTimeout;
            this.studentQuestionBankSearch.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => this.loadQuestionBankCards(), 300);
            });
            this.studentQuestionBankSearch.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.loadQuestionBankCards();
            });
        }
        
        if (this.nurseiqSearchBtn) {
            this.nurseiqSearchBtn.addEventListener('click', () => this.loadQuestionBankCards());
        }
        if (this.clearSearchBtn) {
            this.clearSearchBtn.addEventListener('click', () => this.clearQuestionBankSearch());
        }
        if (this.loadCourseCatalogBtn) {
            this.loadCourseCatalogBtn.addEventListener('click', () => this.loadQuestionBankCards());
        }
        
        const nurseiqTab = document.querySelector('[data-tab="nurseiq"]');
        if (nurseiqTab) {
            nurseiqTab.addEventListener('click', () => {
                if (!this.initialized) this.loadQuestionBankCards();
            });
        }
        
        console.log('✅ NurseIQ elements initialized');
    }
    
    waitForElement(selector, timeout = 5000) {
        return new Promise((resolve) => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }
            const observer = new MutationObserver(() => {
                const element = document.querySelector(selector);
                if (element) {
                    observer.disconnect();
                    resolve(element);
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
            setTimeout(() => {
                observer.disconnect();
                resolve(null);
            }, timeout);
        });
    }
    
    // ============================================
    // INITIALIZE
    // ============================================
    async initialize() {
        console.log('🚀 Initializing NurseIQ Module...');
        try {
            this.userId = getCurrentUserId();
            console.log('👤 User ID:', this.userId || 'Not logged in');
            
            if (!this.userId) {
                console.warn('⚠️ No user found - please login');
                this.showNotification('Please login to access NurseIQ features', 'warning');
                return;
            }
            
            const userExists = await this.ensureUserExists();
            if (!userExists) {
                console.warn('⚠️ User not found in database');
                this.showNotification('Please register or contact admin', 'warning');
                return;
            }
            
            await this.initializeElements();
            this.detectUserProgram();
            await this.loadUserProgress();
            await this.loadQuestionBankCards();
            
            this.initialized = true;
            this.updateDashboardMetrics();
            
            setInterval(() => {
                if (this.userTestAnswers && Object.keys(this.userTestAnswers).length > 0) {
                    this.saveProgressToDatabase();
                }
            }, 30000);
            
            console.log('✅ NurseIQ Module initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize:', error);
        }
    }
    
    // ============================================
    // USER PROGRESS
    // ============================================
    async loadUserProgress() {
        try {
            if (!this.userId) return;
            
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
            
            if (this.userId && !this.userId.startsWith('anonymous_')) {
                const supabase = this.getSupabaseClient();
                if (supabase) {
                    const { data, error } = await supabase
                        .from('user_progress')
                        .select('progress_data')
                        .eq('user_id', this.userId)
                        .maybeSingle();
                    
                    if (!error && data && data.progress_data) {
                        const dbAnswers = data.progress_data.answers || {};
                        this.userTestAnswers = { ...dbAnswers, ...this.userTestAnswers };
                        console.log('📊 Loaded from database, total:', Object.keys(this.userTestAnswers).length);
                        this.saveUserProgress();
                    }
                }
            }
            
            this.updateDashboardMetrics();
            
        } catch (error) {
            console.warn('Could not load user progress:', error);
        }
    }
    
    saveUserProgress() {
        if (!this.userId || this.userId.startsWith('anonymous_')) return;
        
        try {
            const progressData = {
                version: this.progressVersion,
                answers: this.userTestAnswers,
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
                if (this.saveTimeout) {
                    clearTimeout(this.saveTimeout);
                }
                this.saveTimeout = setTimeout(() => {
                    this.saveProgressToDatabase();
                }, 1000);
            }
            
            this.updateDashboardMetrics();
            
        } catch (error) {
            console.warn('Could not save progress:', error);
        }
    }
    
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
            
            const progressData = {
                version: this.progressVersion,
                answers: this.userTestAnswers,
                lastSaved: new Date().toISOString()
            };
            
            const { error } = await supabase
                .from('user_progress')
                .upsert({
                    user_id: this.userId,
                    progress_data: progressData,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });
            
            if (error) {
                console.error('❌ Database save error:', error);
            }
            
        } catch (error) {
            console.error('❌ Exception in saveProgressToDatabase:', error);
        } finally {
            this._isSaving = false;
        }
    }
    
    // ============================================
    // GET DASHBOARD METRICS
    // ============================================
    getNurseIQDashboardMetrics() {
        try {
            let totalAnswered = 0;
            let totalCorrect = 0;
            let recentActivity = 0;
            const courses = {};
            
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            
            Object.values(this.userTestAnswers).forEach(answer => {
                if (answer.answered) {
                    totalAnswered++;
                    if (answer.correct) totalCorrect++;
                    
                    if (answer.timestamp) {
                        const answerDate = new Date(answer.timestamp);
                        if (answerDate >= sevenDaysAgo) {
                            recentActivity++;
                        }
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
                lastUpdated: new Date().toISOString()
            };
            
            localStorage.setItem(this.dashboardMetricsKey, JSON.stringify(metrics));
            return metrics;
            
        } catch (error) {
            console.error('Error calculating NurseIQ metrics:', error);
            return this.getDefaultDashboardMetrics();
        }
    }
    
    calculateStudyStreak() {
        try {
            const timestamps = [];
            Object.values(this.userTestAnswers).forEach(answer => {
                if (answer.answered && answer.timestamp) {
                    timestamps.push(new Date(answer.timestamp));
                }
            });
            
            if (timestamps.length === 0) return 0;
            
            timestamps.sort((a, b) => b - a);
            
            const uniqueDates = [];
            timestamps.forEach(date => {
                const dateStr = date.toDateString();
                if (!uniqueDates.includes(dateStr)) {
                    uniqueDates.push(dateStr);
                }
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
                
                if (uniqueDates.includes(checkDateStr)) {
                    streak++;
                } else {
                    break;
                }
            }
            
            return streak;
        } catch (error) {
            console.error('Error calculating streak:', error);
            return 0;
        }
    }
    
    getDefaultDashboardMetrics() {
        return {
            totalAnswered: 0,
            totalCorrect: 0,
            accuracy: 0,
            progress: 0,
            recentActivity: 0,
            streak: 0,
            totalCourses: 0,
            mostActiveCourse: null,
            lastUpdated: new Date().toISOString()
        };
    }
    
    updateDashboardMetrics() {
        try {
            const metrics = this.getNurseIQDashboardMetrics();
            localStorage.setItem(this.dashboardMetricsKey, JSON.stringify(metrics));
            this.dispatchDashboardUpdateEvent(metrics);
        } catch (error) {
            console.error('Error updating dashboard metrics:', error);
        }
    }
    
    dispatchDashboardUpdateEvent(metrics) {
        const event = new CustomEvent('nurseiqMetricsUpdated', {
            detail: {
                progress: metrics.progress,
                accuracy: metrics.accuracy,
                totalQuestions: metrics.totalAnswered,
                recentActivity: metrics.recentActivity,
                streak: metrics.streak,
                lastUpdated: metrics.lastUpdated
            }
        });
        document.dispatchEvent(event);
    }
    
    getLastCourseProgress() {
        try {
            const lastProgress = localStorage.getItem(this.lastCourseProgressKey);
            return lastProgress ? JSON.parse(lastProgress) : null;
        } catch (error) {
            return null;
        }
    }
    
    // ============================================
    // LOAD QUESTION BANK - GROUPED BY COURSE & SORTED BY LATEST
    // ============================================
    async loadQuestionBankCards() {
        if (!this.userId) {
            console.warn('⚠️ No user - please login');
            this.showNotification('Please login to access the question bank', 'warning');
            return;
        }
        
        try {
            console.log('📚 Loading question bank...');
            this.showLoading();
            const supabase = this.getSupabaseClient();
            if (!supabase) throw new Error('No database connection');
            
            // Fetch questions with course info
            const { data: questions, error } = await supabase
                .from('medical_assessments')
                .select(`*, courses (id, course_name, unit_code, color, description)`)
                .eq('is_active', true)
                .eq('is_published', true)
                .order('updated_at', { ascending: false }); // ✅ Latest first
            
            if (error) throw error;
            console.log(`✅ Fetched ${questions?.length || 0} questions`);
            
            // ============================================
            // ✅ GROUP BY COURSE - Medical Surgical stays together
            // ============================================
            const coursesMap = {};
            const courseUpdatedDates = {};
            
            questions.forEach(question => {
                const courseId = question.course_id || 'general';
                const courseName = question.courses?.course_name || 'General Nursing';
                const unitCode = question.courses?.unit_code || 'KRCHN';
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
                
                // Track latest update per course
                if (question.updated_at) {
                    const updatedDate = new Date(question.updated_at);
                    if (updatedDate > courseUpdatedDates[courseId]) {
                        courseUpdatedDates[courseId] = updatedDate;
                    }
                }
            });
            
            // ✅ Apply latest update date to each course
            Object.keys(coursesMap).forEach(courseId => {
                coursesMap[courseId].stats.lastUpdated = courseUpdatedDates[courseId] || new Date();
                coursesMap[courseId].userStats = this.getCourseUserStats(courseId, coursesMap[courseId].questions);
            });
            
            // ✅ SORT COURSES BY LATEST UPDATE (NEWEST FIRST)
            const coursesArray = Object.values(coursesMap);
            coursesArray.sort((a, b) => {
                const dateA = a.stats.lastUpdated || new Date(0);
                const dateB = b.stats.lastUpdated || new Date(0);
                return dateB - dateA; // Newest first
            });
            
            this.displayQuestionBankCards(coursesArray);
            
        } catch (error) {
            console.error('❌ Error loading question bank:', error);
            this.showError(`Failed to load: ${error.message || 'Please try again'}`);
        } finally {
            this.hideLoading();
        }
    }
    
    // ============================================
    // GET COURSE USER STATS
    // ============================================
    getCourseUserStats(courseId, questions) {
        const courseQuestions = questions.filter(q => q.course_id === courseId);
        let answered = 0;
        let correct = 0;
        let lastAttempt = null;
        
        courseQuestions.forEach(question => {
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
        const completion = answered > 0 ? Math.round((answered / courseQuestions.length) * 100) : 0;
        
        const difficultyStats = {
            easy: 0,
            medium: 0,
            hard: 0
        };
        
        courseQuestions.forEach(question => {
            const difficulty = question.difficulty?.toLowerCase() || 'medium';
            if (difficulty === 'easy') difficultyStats.easy++;
            else if (difficulty === 'hard') difficultyStats.hard++;
            else difficultyStats.medium++;
        });
        
        return {
            answered,
            correct,
            accuracy,
            completion,
            lastAttempt,
            total: courseQuestions.length,
            difficulty: difficultyStats
        };
    }
    
    // ============================================
    // DISPLAY QUESTION BANK CARDS - GROUPED & SORTED
    // ============================================
    displayQuestionBankCards(courses) {
        if (!this.studentQuestionBankContent) return;

        const isTVET = this.currentProgram === 'tvet';
        const isNursing = this.currentProgram === 'nursing';
        const moduleName = isTVET ? 'TVETIQ' : 'NurseIQ';
        const iconClass = isTVET ? 'fa-tools' : 'fa-graduation-cap';
        const color = isTVET ? '#1a7a5a' : '#4C1D95';

        let filteredCourses = this.filterCoursesByProgram(courses);

        const searchTerm = this.studentQuestionBankSearch?.value?.toLowerCase() || '';
        if (searchTerm) {
            filteredCourses = filteredCourses.filter(course =>
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
                <span style="font-weight: 600; color: ${color};">${moduleName} Mode</span>
                <span style="color: #64748b; margin-left: 4px;">| Showing ${filteredCourses.length} ${isTVET ? 'TVET' : 'Nursing'} courses</span>
                ${filteredCourses.length === 0 ? `<span style="color: #dc2626; margin-left: 8px;">⚠️ No ${isTVET ? 'TVET' : 'Nursing'} courses available</span>` : ''}
                <span style="margin-left: auto; font-size: 12px; color: #94a3b8;">
                    <i class="fas fa-clock"></i> Latest updates on top
                </span>
            </div>
        `;

        // Resume card for last course
        const lastProgress = this.getLastCourseProgress();
        if (lastProgress) {
            const lastCourse = filteredCourses.find(c => c.id === lastProgress.courseId);
            if (lastCourse) {
                const userStats = lastCourse.userStats;
                html += `
                    <div class="resume-card" style="background: ${color}10; border: 1px solid ${color}30; border-radius: 16px; padding: 16px; margin-bottom: 20px;">
                        <div class="resume-header" style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                            <i class="fas fa-history" style="color: ${color};"></i>
                            <h3 style="margin: 0; font-size: 16px;">Continue Where You Left Off</h3>
                        </div>
                        <div class="resume-content" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                            <div class="resume-course">
                                <span class="resume-course-name" style="font-weight: 600;">${lastCourse.name}</span>
                                <span class="resume-progress" style="font-size: 13px; color: #64748b; margin-left: 12px;">
                                    <i class="fas fa-chart-line"></i> 
                                    Question ${lastProgress.currentIndex + 1} of ${lastProgress.totalQuestions}
                                </span>
                                <div class="resume-stats" style="margin-top: 4px; display: flex; gap: 16px; font-size: 13px;">
                                    <span class="resume-stat"><i class="fas fa-check-circle" style="color: #10b981;"></i> ${userStats.answered}/${userStats.total} answered</span>
                                    <span class="resume-stat"><i class="fas fa-trophy" style="color: #f59e0b;"></i> ${userStats.accuracy}% accuracy</span>
                                </div>
                            </div>
                            <div class="resume-actions" style="display: flex; gap: 8px;">
                                <button onclick="window.startCourseTest('${lastCourse.id}', '${lastCourse.name.replace(/'/g, "\\'")}', ${lastProgress.currentIndex})" 
                                        class="resume-btn btn-primary" style="background: ${color}; color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                                    <i class="fas fa-play"></i> Resume
                                </button>
                                <button onclick="window.startCourseTest('${lastCourse.id}', '${lastCourse.name.replace(/'/g, "\\'")}', 0)" 
                                        class="resume-btn btn-secondary" style="background: #e2e8f0; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 600;">
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
                <div class="empty-state" style="text-align: center; padding: 60px 20px;">
                    <i class="fas fa-search" style="font-size: 48px; color: #d1d5db;"></i>
                    <h3 style="margin-top: 16px;">No ${isTVET ? 'TVET' : 'Nursing'} Courses Found</h3>
                    <p style="color: #6b7280;">${searchTerm ? `No courses match your search "${searchTerm}".` : `No ${isTVET ? 'TVET' : 'Nursing'} courses available in the question bank yet.`}</p>
                    ${searchTerm ? `<button onclick="window.clearQuestionBankSearch()" class="btn btn-primary mt-2" style="margin-top: 12px; padding: 8px 20px; background: ${color}; color: white; border: none; border-radius: 8px; cursor: pointer;">
                        <i class="fas fa-times"></i> Clear Search
                    </button>` : ''}
                </div>
            `;
        } else {
            html += `<div class="courses-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px;">`;

            filteredCourses.forEach(course => {
                const courseColor = course.color || color;
                const lastUpdated = formatDate(course.stats.lastUpdated);
                const userStats = course.userStats;
                const hasProgress = userStats.answered > 0;

                html += `
                    <div class="course-card" style="background: white; border-radius: 16px; padding: 20px; border: 1px solid #e2e8f0; transition: all 0.2s; cursor: pointer;" 
                         onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'" 
                         onmouseout="this.style.boxShadow='none'">
                        <div class="course-header" style="border-bottom: 2px solid ${courseColor}20; padding-bottom: 12px; margin-bottom: 12px;">
                            <div class="course-title" style="display: flex; justify-content: space-between; align-items: flex-start;">
                                <div>
                                    <h3 style="margin: 0; font-size: 16px; font-weight: 600;">${course.name}</h3>
                                    <div class="course-subtitle" style="display: flex; gap: 8px; margin-top: 4px; flex-wrap: wrap;">
                                        <span class="unit-code" style="background: ${courseColor}30; color: ${courseColor}; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                                            ${course.unit_code}
                                        </span>
                                        <span class="question-count" style="color: #64748b; font-size: 13px;">
                                            <i class="fas fa-question-circle"></i> ${course.stats.total} questions
                                        </span>
                                        ${isTVET ? `<span style="background: #1a7a5a20; color: #1a7a5a; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;">TVET</span>` : ''}
                                        <span style="font-size: 11px; color: #94a3b8;">
                                            <i class="fas fa-clock"></i> Updated: ${lastUpdated}
                                        </span>
                                    </div>
                                </div>
                                <div class="course-icon" style="width: 40px; height: 40px; background: ${courseColor}; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0;">
                                    <i class="fas fa-book-medical"></i>
                                </div>
                            </div>
                            ${hasProgress ? `
                                <div class="progress-badge" style="margin-top: 8px; background: linear-gradient(135deg, ${courseColor}, #4C1D95); color: white; padding: 4px 12px; border-radius: 12px; display: inline-block; font-size: 12px; font-weight: 600;">
                                    <i class="fas fa-chart-line"></i> ${userStats.completion}% Complete
                                </div>
                            ` : `
                                <div class="active-badge" style="margin-top: 8px; color: #10b981; font-size: 13px;">
                                    <i class="fas fa-check-circle"></i> Active Questions
                                </div>
                            `}
                        </div>

                        <div class="course-stats">
                            ${hasProgress ? `
                                <div class="user-progress-section" style="margin-bottom: 12px;">
                                    <div class="progress-title" style="font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 8px;">
                                        <i class="fas fa-chart-bar"></i> Your Progress
                                    </div>
                                    <div class="progress-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
                                        <div class="progress-item" style="text-align: center;">
                                            <div class="progress-value" style="font-weight: 700; color: ${courseColor};">${userStats.answered}/${userStats.total}</div>
                                            <div class="progress-label" style="font-size: 10px; color: #94a3b8;">Answered</div>
                                        </div>
                                        <div class="progress-item" style="text-align: center;">
                                            <div class="progress-value" style="font-weight: 700; color: #10b981;">${userStats.correct}</div>
                                            <div class="progress-label" style="font-size: 10px; color: #94a3b8;">Correct</div>
                                        </div>
                                        <div class="progress-item" style="text-align: center;">
                                            <div class="progress-value" style="font-weight: 700; color: #f59e0b;">${userStats.accuracy}%</div>
                                            <div class="progress-label" style="font-size: 10px; color: #94a3b8;">Accuracy</div>
                                        </div>
                                        <div class="progress-item" style="text-align: center;">
                                            <div class="progress-value" style="font-weight: 700; color: #8b5cf6;">${userStats.completion}%</div>
                                            <div class="progress-label" style="font-size: 10px; color: #94a3b8;">Complete</div>
                                        </div>
                                    </div>
                                </div>
                            ` : ''}

                            <div class="stats-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px;">
                                <div class="stat-item" style="text-align: center;">
                                    <div class="stat-value" style="font-weight: 700; color: #4C1D95; font-size: 18px;">${course.stats.total}</div>
                                    <div class="stat-label" style="font-size: 10px; color: #94a3b8;">TOTAL</div>
                                </div>
                                <div class="stat-item" style="text-align: center;">
                                    <div class="stat-value" style="font-weight: 700; color: #dc2626; font-size: 18px;">${course.stats.hard}</div>
                                    <div class="stat-label" style="font-size: 10px; color: #94a3b8;">HARD</div>
                                </div>
                                <div class="stat-item" style="text-align: center;">
                                    <div class="stat-value" style="font-weight: 700; color: #f59e0b; font-size: 18px;">${course.stats.medium}</div>
                                    <div class="stat-label" style="font-size: 10px; color: #94a3b8;">MEDIUM</div>
                                </div>
                                <div class="stat-item" style="text-align: center;">
                                    <div class="stat-date-label" style="font-size: 10px; color: #94a3b8;">UPDATED</div>
                                    <div class="stat-date" style="font-size: 12px; font-weight: 600; color: ${courseColor};">${lastUpdated}</div>
                                </div>
                            </div>

                            <button class="start-test-btn" 
                                    onclick="window.startCourseTest('${course.id}', '${course.name.replace(/'/g, "\\'")}', ${hasProgress ? -1 : 0})" 
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
        console.log(`✅ ${filteredCourses.length} courses displayed, sorted by latest updates`);
    }
    
    // ============================================
    // FILTER COURSES BY PROGRAM
    // ============================================
    filterCoursesByProgram(courses) {
        const isTVET = this.currentProgram === 'tvet';
        const isNursing = this.currentProgram === 'nursing';
        
        if (isTVET) {
            const tvetKeywords = [
                'tvet', 'cdacc', 'nita', 'vocational', 'technical',
                'craft', 'artisan', 'trade', 'occupational',
                'dipott', 'cch', 'chrit', 'cpc', 'csl', 'csw', 'ccjs', 'cag', 'chss', 'cict',
                'dpott', 'dch', 'dhr', 'dsl', 'dsw', 'dcjs', 'dhss', 'dict', 'dme',
                'ach', 'aag', 'asw', 'cca', 'pte'
            ];
            
            return courses.filter(course => {
                const courseName = course.name.toLowerCase();
                const unitCode = (course.unit_code || '').toLowerCase();
                
                for (const keyword of tvetKeywords) {
                    if (courseName.includes(keyword) || unitCode.includes(keyword)) {
                        return true;
                    }
                }
                if (course.description && course.description.toLowerCase().includes('tvet')) {
                    return true;
                }
                return false;
            });
        }
        
        if (isNursing) {
            const nursingKeywords = [
                'nursing', 'krchn', 'health', 'medical', 'clinical',
                'midwifery', 'pediatric', 'anatomy', 'physiology',
                'surgical', 'medical surgical', 'immunization',
                'leadership', 'management', 'pharmacology',
                'obstetrics', 'gynecology', 'psychiatry', 'mental health',
                'public health', 'epidemiology', 'nutrition',
                'nchsgn', 'nchsm', 'nchsch'
            ];
            
            return courses.filter(course => {
                const courseName = course.name.toLowerCase();
                const unitCode = (course.unit_code || '').toLowerCase();
                
                for (const keyword of nursingKeywords) {
                    if (courseName.includes(keyword) || unitCode.includes(keyword)) {
                        return true;
                    }
                }
                if (course.description) {
                    const desc = course.description.toLowerCase();
                    if (desc.includes('nursing') || desc.includes('health') || desc.includes('clinical')) {
                        return true;
                    }
                }
                return false;
            });
        }
        
        return courses;
    }
    
    // ============================================
    // START COURSE TEST
    // ============================================
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
            this.currentSessionAnswers = {};
            
            let actualStartIndex = 0;
            if (startIndex === -1) {
                let firstUnanswered = 0;
                for (let i = 0; i < questions.length; i++) {
                    const question = questions[i];
                    const hasAnswered = this.userTestAnswers[question.id]?.answered;
                    if (!hasAnswered) {
                        firstUnanswered = i;
                        break;
                    }
                }
                actualStartIndex = firstUnanswered;
            } else if (startIndex >= 0 && startIndex < questions.length) {
                actualStartIndex = startIndex;
            }
            
            this.currentQuestionIndex = actualStartIndex;
            
            // Display the interactive questions
            this.displayInteractiveQuestions(courseName, questions);
            
        } catch (error) {
            console.error('Error starting test:', error);
            this.showNotification('Failed to start test. Please try again.', 'error');
            this.loadQuestionBankCards();
        } finally {
            this.hideLoading();
        }
    }
    
    // ============================================
    // DISPLAY INTERACTIVE QUESTIONS
    // ============================================
    displayInteractiveQuestions(courseName, questions) {
        if (!this.studentQuestionBankContent) return;
        
        const courseColor = questions[0]?.courses?.color || '#4f46e5';
        const userStats = this.getCourseUserStats(this.currentCourseForTest.id, questions);
        
        let html = `
            <div class="interactive-questions-container">
                <div class="questions-header-bar" style="background: #f8fafc; border-bottom: 2px solid ${courseColor}; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <button onclick="window.loadQuestionBankCards()" style="padding: 6px 14px; background: #e5e7eb; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; font-size: 13px;">
                            <i class="fas fa-arrow-left"></i> Back
                        </button>
                        <h3 style="margin: 0; color: #0A3D62; font-size: 16px; font-weight: 600;">${courseName}</h3>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span style="font-size: 13px; color: #64748b;">
                            <i class="fas fa-question-circle"></i> ${questions.length} questions
                        </span>
                        <span style="font-size: 13px; color: #059669; background: #d1fae5; padding: 4px 12px; border-radius: 12px; font-weight: 600;">
                            ${userStats.completion}% Complete
                        </span>
                    </div>
                </div>
                <div style="padding: 16px;">
                    <div id="questionDisplay" style="margin-bottom: 16px;">
                        <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
                                <span style="font-weight: 600; color: #4C1D95; font-size: 14px;">Question ${this.currentQuestionIndex + 1} of ${questions.length}</span>
                                <span id="difficultyBadge" style="padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; background: #fef3c7; color: #92400e;">Medium</span>
                            </div>
                            <div id="questionText" style="font-size: 15px; line-height: 1.6; color: #1e293b;">
                                Loading question...
                            </div>
                        </div>
                        <div id="optionsContainer" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                            <!-- Options will be loaded here -->
                        </div>
                        <div id="explanationContainer" style="display: none; margin-top: 16px; padding: 16px; background: #f0f7ff; border-radius: 8px; border-left: 4px solid #3B82F6;">
                            <div style="font-weight: 600; color: #1e40af; margin-bottom: 4px;">💡 Explanation</div>
                            <div id="explanationText" style="color: #475569;"></div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: space-between; padding-top: 12px; border-top: 1px solid #e5e7eb;">
                        <div style="display: flex; gap: 8px;">
                            <button onclick="window.prevQuestion()" id="prevBtn" style="padding: 8px 16px; background: #f1f5f9; border: none; border-radius: 8px; cursor: pointer; font-weight: 500;">
                                <i class="fas fa-chevron-left"></i> Previous
                            </button>
                            <button onclick="window.nextQuestion()" id="nextBtn" style="padding: 8px 16px; background: #4C1D95; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500;">
                                Next <i class="fas fa-chevron-right"></i>
                            </button>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button onclick="window.checkAnswer()" id="checkAnswerBtn" style="padding: 8px 16px; background: #10b981; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                                <i class="fas fa-check-circle"></i> Check Answer
                            </button>
                            <button onclick="window.resetQuestion()" style="padding: 8px 16px; background: #f1f5f9; border: none; border-radius: 8px; cursor: pointer; font-weight: 500;">
                                <i class="fas fa-redo"></i> Reset
                            </button>
                            <button onclick="window.finishPractice()" style="padding: 8px 16px; background: #dc2626; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                                <i class="fas fa-flag-checkered"></i> Finish
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.studentQuestionBankContent.innerHTML = html;
        
        // Load first question after rendering
        setTimeout(() => {
            this.loadCurrentInteractiveQuestion();
        }, 50);
    }
    
    // ============================================
    // LOAD CURRENT INTERACTIVE QUESTION
    // ============================================
    loadCurrentInteractiveQuestion() {
        const question = this.currentCourseQuestions[this.currentQuestionIndex];
        if (!question) return;
        
        const questionText = document.getElementById('questionText');
        if (questionText) {
            questionText.textContent = question.question_text || 'Question text not available';
        }
        
        const difficultyBadge = document.getElementById('difficultyBadge');
        if (difficultyBadge) {
            difficultyBadge.textContent = question.difficulty?.toUpperCase() || 'MEDIUM';
            difficultyBadge.className = '';
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
        
        // Load options
        this.loadAnswerOptions(question);
    }
    
    // ============================================
    // LOAD ANSWER OPTIONS
    // ============================================
    loadAnswerOptions(question) {
        const optionsContainer = document.getElementById('optionsContainer');
        if (!optionsContainer) return;
        
        let options = [];
        if (question.option_a && question.option_a.trim() !== '') options.push(question.option_a);
        if (question.option_b && question.option_b.trim() !== '') options.push(question.option_b);
        if (question.option_c && question.option_c.trim() !== '') options.push(question.option_c);
        if (question.option_d && question.option_d.trim() !== '') options.push(question.option_d);
        
        if (options.length === 0) options = ['Option A', 'Option B', 'Option C', 'Option D'];
        
        const optionLabels = ['A', 'B', 'C', 'D'];
        let optionsHtml = '';
        
        options.forEach((option, index) => {
            if (index >= optionLabels.length) return;
            const optionId = `option-${this.currentQuestionIndex}-${index}`;
            const optionLetter = optionLabels[index];
            
            optionsHtml += `
                <div style="padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; transition: all 0.2s; background: white;" 
                     onclick="window.selectOption(${index})" 
                     id="option-container-${index}"
                     onmouseover="this.style.borderColor='#4C1D95'; this.style.background='#f8fafc'"
                     onmouseout="if(!this.classList.contains('selected')){this.style.borderColor='#e2e8f0'; this.style.background='white'}">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="width: 24px; height: 24px; border-radius: 50%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 12px;">${optionLetter}</span>
                        <span>${option}</span>
                    </div>
                </div>
            `;
        });
        
        optionsContainer.innerHTML = optionsHtml;
        
        // Check if already answered
        const savedAnswer = this.userTestAnswers[question.id];
        if (savedAnswer?.answered) {
            const selectedIndex = savedAnswer.selectedOptionIndex;
            if (selectedIndex !== undefined) {
                this.selectOption(selectedIndex);
            }
        }
    }
    
    // ============================================
    // SELECT OPTION
    // ============================================
    selectOption(index) {
        // Reset all options
        document.querySelectorAll('#optionsContainer > div').forEach(el => {
            el.classList.remove('selected', 'correct', 'incorrect');
            el.style.borderColor = '#e2e8f0';
            el.style.background = 'white';
        });
        
        // Select the chosen option
        const selectedElement = document.getElementById(`option-container-${index}`);
        if (selectedElement) {
            selectedElement.classList.add('selected');
            selectedElement.style.borderColor = '#4C1D95';
            selectedElement.style.background = '#ede9fe';
        }
        
        // Store selection
        const question = this.currentCourseQuestions[this.currentQuestionIndex];
        if (question) {
            const optionText = this.getOptionText(index);
            this.userTestAnswers[this.currentQuestionIndex] = {
                selectedOption: optionText,
                selectedOptionIndex: index,
                answered: false
            };
        }
    }
    
    getOptionText(index) {
        const question = this.currentCourseQuestions[this.currentQuestionIndex];
        if (!question) return '';
        const options = [];
        if (question.option_a) options.push(question.option_a);
        if (question.option_b) options.push(question.option_b);
        if (question.option_c) options.push(question.option_c);
        if (question.option_d) options.push(question.option_d);
        return options[index] || '';
    }
    
    // ============================================
    // CHECK ANSWER
    // ============================================
    checkAnswer() {
        const userAnswer = this.userTestAnswers[this.currentQuestionIndex];
        if (!userAnswer || userAnswer.selectedOptionIndex === undefined) {
            this.showNotification('Please select an answer first!', 'warning');
            return;
        }
        
        const question = this.currentCourseQuestions[this.currentQuestionIndex];
        const correctAnswer = question.correct_answer || '';
        const selectedOption = userAnswer.selectedOption;
        const isCorrect = selectedOption === correctAnswer;
        
        // Highlight correct/incorrect
        const selectedIndex = userAnswer.selectedOptionIndex;
        const selectedElement = document.getElementById(`option-container-${selectedIndex}`);
        
        // Find correct option
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
        
        // Show correct answer
        if (correctIndex >= 0) {
            const correctElement = document.getElementById(`option-container-${correctIndex}`);
            if (correctElement && !isCorrect) {
                correctElement.style.borderColor = '#10b981';
                correctElement.style.background = '#d1fae5';
                correctElement.classList.add('correct');
            }
        }
        
        // Update user answer
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
        
        // Show explanation
        const explanationContainer = document.getElementById('explanationContainer');
        const explanationText = document.getElementById('explanationText');
        if (explanationContainer && explanationText) {
            explanationContainer.style.display = 'block';
            explanationText.textContent = question.explanation || 'No explanation available for this question.';
        }
        
        this.saveUserProgress();
        this.showNotification(isCorrect ? '✅ Correct! Well done!' : '❌ Incorrect. Review the explanation.', isCorrect ? 'success' : 'error');
    }
    
    // ============================================
    // RESET QUESTION
    // ============================================
    resetQuestion() {
        const question = this.currentCourseQuestions[this.currentQuestionIndex];
        if (question) {
            delete this.userTestAnswers[question.id];
            delete this.userTestAnswers[this.currentQuestionIndex];
        }
        
        // Reset UI
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
    
    // ============================================
    // PREVIOUS QUESTION
    // ============================================
    prevQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.loadCurrentInteractiveQuestion();
            this.updateQuestionButtons();
        }
    }
    
    // ============================================
    // NEXT QUESTION
    // ============================================
    nextQuestion() {
        if (this.currentQuestionIndex < this.currentCourseQuestions.length - 1) {
            this.currentQuestionIndex++;
            this.loadCurrentInteractiveQuestion();
            this.updateQuestionButtons();
        }
    }
    
    updateQuestionButtons() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        
        if (prevBtn) prevBtn.disabled = this.currentQuestionIndex === 0;
        if (nextBtn) nextBtn.disabled = this.currentQuestionIndex === this.currentCourseQuestions.length - 1;
    }
    
    // ============================================
    // FINISH PRACTICE
    // ============================================
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
            this.loadQuestionBankCards();
            this.showNotification(`🎉 Practice complete! ${accuracy}% accuracy`, 'success');
            await this.saveAttemptToDatabase(correctCount, totalQuestions);
            this.saveUserProgress();
        }
    }
    
    async saveAttemptToDatabase(score, totalQuestions) {
        if (!this.userId || this.userId.startsWith('anonymous_')) return;
        
        try {
            const supabase = this.getSupabaseClient();
            if (!supabase) return;
            
            await supabase
                .from('nurseiq_attempts')
                .insert({
                    student_id: this.userId,
                    score: score,
                    total_questions: totalQuestions,
                    completed_at: new Date().toISOString()
                });
        } catch (error) {
            console.warn('Could not save attempt to database:', error);
        }
    }
    
    // ============================================
    // CLEAR SEARCH
    // ============================================
    clearQuestionBankSearch() {
        if (this.studentQuestionBankSearch) {
            this.studentQuestionBankSearch.value = '';
            this.loadQuestionBankCards();
        }
    }
    
    // ============================================
    // LOADING / ERROR STATES
    // ============================================
    showLoading() {
        if (this.studentQuestionBankLoading) this.studentQuestionBankLoading.style.display = 'block';
        if (this.studentQuestionBankContent) {
            this.studentQuestionBankContent.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #94a3b8;">
                    <div style="width: 40px; height: 40px; border: 3px solid #e5e7eb; border-top-color: #4C1D95; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px;"></div>
                    <p style="margin: 8px 0 0 0;">Loading questions for ${this.programDisplayName || 'your program'}...</p>
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
    
    // ============================================
    // CLEAR ALL PROGRESS
    // ============================================
    clearAllProgress() {
        if (confirm('Are you sure you want to clear all your progress? This cannot be undone.')) {
            localStorage.removeItem(this.storageKey);
            localStorage.removeItem(this.lastCourseProgressKey);
            localStorage.removeItem(this.dashboardMetricsKey);
            this.userTestAnswers = {};
            this.showNotification('All progress cleared', 'success');
            this.updateDashboardMetrics();
            this.loadQuestionBankCards();
        }
    }
}

// ============================================
// GLOBAL FUNCTIONS
// ============================================

window.NurseIQModule = NurseIQModule;
window.nurseiqModule = null;

window.initNurseIQ = async function() {
    console.log('🚀 Starting NurseIQ...');
    if (document.readyState === 'loading') {
        await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
    }
    window.nurseiqModule = new NurseIQModule();
    await window.nurseiqModule.initialize();
    return window.nurseiqModule;
};

window.loadQuestionBankCards = function() {
    if (window.nurseiqModule) window.nurseiqModule.loadQuestionBankCards();
    else window.initNurseIQ().then(() => window.nurseiqModule.loadQuestionBankCards()).catch(console.error);
};

window.clearQuestionBankSearch = function() { 
    if (window.nurseiqModule) window.nurseiqModule.clearQuestionBankSearch(); 
};

window.startCourseTest = function(courseId, courseName, startIndex = 0) { 
    if (window.nurseiqModule) window.nurseiqModule.startCourseTest(courseId, courseName, startIndex); 
};

window.prevQuestion = function() { 
    if (window.nurseiqModule) window.nurseiqModule.prevQuestion(); 
};

window.nextQuestion = function() { 
    if (window.nurseiqModule) window.nurseiqModule.nextQuestion(); 
};

window.selectOption = function(index) { 
    if (window.nurseiqModule) window.nurseiqModule.selectOption(index); 
};

window.checkAnswer = function() { 
    if (window.nurseiqModule) window.nurseiqModule.checkAnswer(); 
};

window.resetQuestion = function() { 
    if (window.nurseiqModule) window.nurseiqModule.resetQuestion(); 
};

window.finishPractice = function() { 
    if (window.nurseiqModule) window.nurseiqModule.finishPractice(); 
};

window.clearAllProgress = function() { 
    if (window.nurseiqModule) window.nurseiqModule.clearAllProgress(); 
};

window.getNurseIQDashboardMetrics = function() {
    if (window.nurseiqModule) {
        return window.nurseiqModule.getNurseIQDashboardMetrics();
    }
    return {
        totalAnswered: 0,
        totalCorrect: 0,
        accuracy: 0,
        progress: 0,
        recentActivity: 0,
        streak: 0,
        totalCourses: 0,
        mostActiveCourse: null,
        lastUpdated: new Date().toISOString()
    };
};

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => window.initNurseIQ().catch(console.error), 1000);
    });
} else {
    setTimeout(() => window.initNurseIQ().catch(console.error), 1000);
}

console.log('✅ NurseIQ module loaded - Questions grouped by course, latest on top!');
