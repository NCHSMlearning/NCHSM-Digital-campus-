// js/nurseiq.js - COMPLETE FULL VERSION
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
    if (window.userData?.id) return window.userData.id;
    if (window.currentUser?.id) return window.currentUser.id;
    const userIdMeta = document.querySelector('meta[name="user-id"]')?.content;
    if (userIdMeta) return userIdMeta;
    const bodyUserId = document.body.getAttribute('data-user-id');
    if (bodyUserId) return bodyUserId;
    const storedUserId = localStorage.getItem('userId') || 
                        localStorage.getItem('currentUserId') ||
                        localStorage.getItem('studentId') ||
                        localStorage.getItem('user_id');
    if (storedUserId) return storedUserId;
    const sessionUserId = sessionStorage.getItem('userId') ||
                         sessionStorage.getItem('currentUserId') ||
                         sessionStorage.getItem('user_id');
    if (sessionUserId) return sessionUserId;
    if (window.app?.user?.id) return window.app.user.id;
    if (window.USER_ID) return window.USER_ID;
    
    let anonymousId = sessionStorage.getItem('anonymousUserId');
    if (!anonymousId) {
        anonymousId = 'anonymous_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('anonymousUserId', anonymousId);
    }
    return anonymousId;
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
        this.studentQuestionBankSearch = null;
        this.nurseiqSearchBtn = null;
        this.clearSearchBtn = null;
        this.loadCourseCatalogBtn = null;
        this.studentQuestionBankLoading = null;
        this.studentQuestionBankContent = null;
        this.currentTestQuestions = [];
        this.currentQuestionIndex = 0;
        this.userTestAnswers = {};
        this.currentCourseForTest = null;
        this.currentCourseQuestions = [];
        this.showAnswersMode = true;
        this.initialized = false;
        this.storageKey = 'nurseiq_user_progress';
        this.lastCourseProgressKey = 'nurseiq_last_course';
        this.currentSessionAnswers = {};
        this.progressVersion = '2.0';
        this.dashboardMetricsKey = 'nurseiq_dashboard_metrics';
        this.saveTimeout = null;
        
        // Active test tracking
        this.activeSessionId = null;
        this.testStartTime = null;
        this.lastProgressUpdate = null;
        this.heartbeatInterval = null;
    }
    
    // ============================================
    // PROGRAM DETECTION
    // ============================================
    detectUserProgram() {
        console.log('🔍 Detecting user program...');
        let profile = null;
        
        if (window.currentUserProfile) profile = window.currentUserProfile;
        else if (window.db?.currentUserProfile) profile = window.db.currentUserProfile;
        else if (window.userProfile) profile = window.userProfile;
        else if (window.profileModule?.userProfile) profile = window.profileModule.userProfile;
        
        if (!profile) {
            try {
                const savedProfile = localStorage.getItem('userProfile');
                if (savedProfile) profile = JSON.parse(savedProfile);
            } catch (e) {}
        }
        
        if (profile) {
            this.userProfile = profile;
            console.log('📊 User profile data:', profile);
            
            if (profile.program) {
                const programCode = String(profile.program).toUpperCase().trim();
                console.log(`  Checking program: "${programCode}"`);
                
                if (TVET_PROGRAMS.includes(programCode)) {
                    this.currentProgram = 'tvet';
                    this.programDisplayName = PROGRAM_DISPLAY_NAMES[programCode] || programCode;
                    console.log(`✅ Detected TVET: ${programCode} - ${this.programDisplayName}`);
                    this.updateUIForProgram();
                    return 'tvet';
                }
                
                if (programCode === 'KRCHN') {
                    this.currentProgram = 'nursing';
                    this.programDisplayName = 'KRCHN Nursing';
                    console.log('✅ Detected KRCHN Nursing');
                    this.updateUIForProgram();
                    return 'nursing';
                }
                
                const progLower = String(profile.program).toLowerCase();
                if (progLower.includes('nursing') || progLower.includes('krchn') || 
                    progLower.includes('health') || progLower.includes('medical')) {
                    this.currentProgram = 'nursing';
                    this.programDisplayName = profile.program;
                    console.log(`✅ Detected Nursing from: "${profile.program}"`);
                    this.updateUIForProgram();
                    return 'nursing';
                }
            }
            
            if (profile.program_type) {
                const typeLower = String(profile.program_type).toLowerCase();
                if (typeLower === 'tvet' || typeLower === 'vocational' || typeLower === 'technical') {
                    this.currentProgram = 'tvet';
                    this.programDisplayName = 'TVET Program';
                    console.log('✅ Detected TVET from program_type');
                    this.updateUIForProgram();
                    return 'tvet';
                } else if (typeLower === 'nursing' || typeLower === 'health') {
                    this.currentProgram = 'nursing';
                    this.programDisplayName = 'Nursing Program';
                    console.log('✅ Detected Nursing from program_type');
                    this.updateUIForProgram();
                    return 'nursing';
                }
            }
        }
        
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('mode') === 'tvet') {
            this.currentProgram = 'tvet';
            this.programDisplayName = 'TVET (Test)';
            this.updateUIForProgram();
            return 'tvet';
        } else if (urlParams.get('mode') === 'nursing') {
            this.currentProgram = 'nursing';
            this.programDisplayName = 'Nursing (Test)';
            this.updateUIForProgram();
            return 'nursing';
        }
        
        const storedMode = localStorage.getItem('nurseiq_program_mode');
        if (storedMode === 'tvet') {
            this.currentProgram = 'tvet';
            this.programDisplayName = 'TVET (Stored)';
            this.updateUIForProgram();
            return 'tvet';
        } else if (storedMode === 'nursing') {
            this.currentProgram = 'nursing';
            this.programDisplayName = 'Nursing (Stored)';
            this.updateUIForProgram();
            return 'nursing';
        }
        
        console.log('⚠️ No program detected, defaulting to Nursing');
        this.currentProgram = 'nursing';
        this.programDisplayName = 'KRCHN Nursing (Default)';
        this.updateUIForProgram();
        return 'nursing';
    }
    
    // ============================================
    // UPDATE UI BASED ON PROGRAM
    // ============================================
    updateUIForProgram() {
        const isNursing = this.currentProgram === 'nursing';
        const isTVET = this.currentProgram === 'tvet';
        
        console.log(`🔄 Updating UI for: ${this.currentProgram} (${this.programDisplayName})`);
        
        const titleEl = document.getElementById('nurseiqTitle');
        const subtitleEl = document.getElementById('nurseiqSubtitle');
        const badgeEl = document.getElementById('nurseiqSubtitleBadge');
        const iconEl = document.getElementById('nurseiqIcon');
        const welcomeIcon = document.getElementById('welcomeIconElement');
        const welcomeTitle = document.getElementById('welcomeTitle');
        const welcomeText = document.getElementById('welcomeText');
        const loadBtnText = document.getElementById('loadBtnText');
        const indicatorText = document.getElementById('indicatorText');
        const indicatorIcon = document.getElementById('indicatorIcon');
        const switchNoteText = document.getElementById('switchNoteText');
        const programIndicator = document.getElementById('nurseiqProgramIndicator');
        
        if (titleEl) titleEl.textContent = isNursing ? 'NurseIQ' : 'TVETIQ';
        if (iconEl) iconEl.className = isNursing ? 'fas fa-brain' : 'fas fa-tools';
        
        if (badgeEl) {
            badgeEl.textContent = isNursing ? 'KRCHN' : 'TVET';
            badgeEl.style.background = isNursing ? '#4C1D95' : '#1a7a5a';
            badgeEl.style.color = 'white';
            badgeEl.style.padding = '4px 12px';
            badgeEl.style.borderRadius = '20px';
            badgeEl.style.fontSize = '14px';
            badgeEl.style.fontWeight = '600';
            badgeEl.style.display = 'inline-block';
            badgeEl.style.marginLeft = '10px';
        }
        
        if (subtitleEl) {
            if (isNursing) {
                subtitleEl.textContent = 'NSCHEQ Curriculum practice questions for Kenya Registered Community Health Nursing program';
            } else if (isTVET) {
                subtitleEl.textContent = `NITA/TVET Curriculum practice questions for ${this.programDisplayName}`;
            }
        }
        
        if (welcomeIcon) welcomeIcon.className = isNursing ? 'fas fa-book-medical' : 'fas fa-tools';
        if (welcomeTitle) welcomeTitle.textContent = isNursing ? 'NurseIQ Question Bank' : 'TVETIQ Question Bank';
        
        if (welcomeText) {
            if (isNursing) {
                welcomeText.textContent = 'Access practice questions organized by NSCHEQ curriculum courses.';
            } else if (isTVET) {
                welcomeText.textContent = `Access practice questions organized by NITA/TVET curriculum courses for ${this.programDisplayName}.`;
            }
        }
        
        if (loadBtnText) loadBtnText.textContent = isNursing ? 'Load Nursing Courses' : 'Load TVET Courses';
        
        if (indicatorText) {
            indicatorText.textContent = isNursing ? 'Nursing Mode' : `TVET Mode (${this.programDisplayName})`;
        }
        if (indicatorIcon) indicatorIcon.className = isNursing ? 'fas fa-user-md' : 'fas fa-tools';
        if (switchNoteText) switchNoteText.textContent = `Auto-detected: ${this.programDisplayName}`;
        
        if (programIndicator) {
            if (isTVET) {
                programIndicator.classList.add('tvet-mode');
                programIndicator.classList.remove('nursing-mode');
                programIndicator.style.borderColor = '#1a7a5a';
            } else {
                programIndicator.classList.add('nursing-mode');
                programIndicator.classList.remove('tvet-mode');
                programIndicator.style.borderColor = '#4C1D95';
            }
        }
        
        this.updateFilterOptions();
        
        localStorage.setItem('nurseiq_program_mode', this.currentProgram);
        localStorage.setItem('nurseiq_program_display', this.programDisplayName);
        
        document.dispatchEvent(new CustomEvent('nurseiqProgramChanged', {
            detail: { 
                program: this.currentProgram,
                displayName: this.programDisplayName,
                isTVET: isTVET,
                isNursing: isNursing
            }
        }));
        
        console.log('✅ UI updated for program:', this.currentProgram, '-', this.programDisplayName);
    }
    
    updateFilterOptions() {
        const isTVET = this.currentProgram === 'tvet';
        const isNursing = this.currentProgram === 'nursing';
        
        const categoryFilter = document.getElementById('nurseiqCategoryFilter');
        if (categoryFilter) {
            categoryFilter.innerHTML = '';
            const allOption = document.createElement('option');
            allOption.value = 'all';
            allOption.textContent = '📂 All Categories';
            categoryFilter.appendChild(allOption);
            
            if (isNursing) {
                const nursingCategories = [
                    { value: 'theory', label: '📖 Theory' },
                    { value: 'clinical', label: '🏥 Clinical' },
                    { value: 'practical', label: '💉 Practical' },
                    { value: 'osce', label: '👨‍⚕️ OSCE' },
                    { value: 'pharmacology', label: '💊 Pharmacology' },
                    { value: 'anatomy', label: '🧬 Anatomy' },
                    { value: 'physiology', label: '🫀 Physiology' },
                    { value: 'pathology', label: '🔬 Pathology' },
                    { value: 'microbiology', label: '🦠 Microbiology' },
                    { value: 'nutrition', label: '🍎 Nutrition' }
                ];
                nursingCategories.forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat.value;
                    option.textContent = cat.label;
                    categoryFilter.appendChild(option);
                });
            } else if (isTVET) {
                const tvetCategories = [
                    { value: 'tvet-core', label: '⚙️ TVET Core' },
                    { value: 'tvet-electives', label: '🔧 TVET Electives' },
                    { value: 'tvet-practical', label: '🛠️ Practical Skills' },
                    { value: 'tvet-theory', label: '📚 Theory' },
                    { value: 'tvet-clinical', label: '🏥 Clinical' },
                    { value: 'tvet-lab', label: '🔬 Laboratory' }
                ];
                tvetCategories.forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat.value;
                    option.textContent = cat.label;
                    categoryFilter.appendChild(option);
                });
            }
        }
        
        const levelFilter = document.getElementById('nurseiqLevelFilter');
        if (levelFilter && isTVET) {
            levelFilter.innerHTML = '';
            const tvetLevels = [
                { value: 'all', label: '📚 All Levels' },
                { value: 'artisan', label: '🔧 Artisan' },
                { value: 'certificate', label: '📜 Certificate' },
                { value: 'diploma', label: '🎓 Diploma' },
                { value: 'higher-diploma', label: '🎓 Higher Diploma' }
            ];
            tvetLevels.forEach(level => {
                const option = document.createElement('option');
                option.value = level.value;
                option.textContent = level.label;
                levelFilter.appendChild(option);
            });
        }
    }
    
    // ============================================
    // ACTIVE TEST TRACKING
    // ============================================
    
    async trackActiveSession(courseId, courseName) {
        try {
            console.log('📊 Tracking active test session...');
            
            const supabase = this.getSupabaseClient();
            if (!supabase) {
                console.warn('⚠️ No Supabase client, skipping active session tracking');
                return;
            }
            
            if (!this.userId || this.userId.startsWith('anonymous_')) {
                console.warn('⚠️ Anonymous user, skipping active session tracking');
                return;
            }
            
            // Check if there's already an active session for this user
            const { data: existing, error: checkError } = await supabase
                .from('active_test_sessions')
                .select('id')
                .eq('user_id', this.userId)
                .eq('is_active', true)
                .maybeSingle();
            
            if (existing) {
                await supabase
                    .from('active_test_sessions')
                    .update({ 
                        is_active: false,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existing.id);
            }
            
            let programType = this.currentProgram || 'nursing';
            
            const sessionData = {
                user_id: this.userId,
                course_id: courseId,
                course_name: courseName,
                program_type: programType,
                started_at: new Date().toISOString(),
                last_activity: new Date().toISOString(),
                total_questions: this.currentCourseQuestions?.length || 0,
                answered_questions: 0,
                correct_answers: 0,
                current_question_index: 0,
                is_active: true,
                session_data: {
                    userAgent: navigator.userAgent,
                    screenSize: `${window.innerWidth}x${window.innerHeight}`,
                    program: this.programDisplayName
                }
            };
            
            const { data, error } = await supabase
                .from('active_test_sessions')
                .insert([sessionData])
                .select()
                .single();
            
            if (error) {
                console.warn('⚠️ Failed to create active session:', error);
                return;
            }
            
            this.activeSessionId = data.id;
            this.testStartTime = Date.now();
            this.lastProgressUpdate = Date.now();
            
            this.startHeartbeat();
            
            document.dispatchEvent(new CustomEvent('studentTestStarted', {
                detail: {
                    userId: this.userId,
                    sessionId: this.activeSessionId,
                    courseId: courseId,
                    courseName: courseName,
                    programType: programType
                }
            }));
            
            console.log('✅ Active test session created:', this.activeSessionId);
            
        } catch (error) {
            console.error('❌ Error tracking active session:', error);
        }
    }
    
    startHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        
        this.heartbeatInterval = setInterval(() => {
            this.sendHeartbeat();
        }, 30000);
        
        console.log('💓 Heartbeat started (every 30s)');
    }
    
    async sendHeartbeat() {
        if (!this.activeSessionId) return;
        
        try {
            const supabase = this.getSupabaseClient();
            if (!supabase) return;
            
            let answered = 0;
            let correct = 0;
            
            if (this.userTestAnswers) {
                for (const [key, answer] of Object.entries(this.userTestAnswers)) {
                    if (answer && answer.answered) {
                        answered++;
                        if (answer.correct) correct++;
                    }
                }
            }
            
            const { error } = await supabase
                .from('active_test_sessions')
                .update({
                    last_activity: new Date().toISOString(),
                    answered_questions: answered,
                    correct_answers: correct,
                    current_question_index: this.currentQuestionIndex || 0
                })
                .eq('id', this.activeSessionId);
            
            if (error) {
                console.warn('⚠️ Heartbeat failed:', error);
            } else {
                this.lastProgressUpdate = Date.now();
            }
            
        } catch (error) {
            console.warn('⚠️ Heartbeat error:', error);
        }
    }
    
    async endActiveSession() {
        if (!this.activeSessionId) return;
        
        try {
            console.log('🏁 Ending active test session:', this.activeSessionId);
            
            const supabase = this.getSupabaseClient();
            if (!supabase) return;
            
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
                this.heartbeatInterval = null;
            }
            
            const { error } = await supabase
                .from('active_test_sessions')
                .update({
                    is_active: false,
                    ended_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', this.activeSessionId);
            
            if (error) {
                console.warn('⚠️ Failed to end session:', error);
            } else {
                console.log('✅ Active session ended');
            }
            
            document.dispatchEvent(new CustomEvent('studentTestFinished', {
                detail: {
                    userId: this.userId,
                    sessionId: this.activeSessionId,
                    courseId: this.currentCourseForTest?.id
                }
            }));
            
            this.activeSessionId = null;
            this.testStartTime = null;
            
        } catch (error) {
            console.error('❌ Error ending session:', error);
        }
    }
    
    async updateProgressForAdmin() {
        if (!this.activeSessionId) return;
        
        try {
            const supabase = this.getSupabaseClient();
            if (!supabase) return;
            
            let answered = 0;
            let correct = 0;
            
            if (this.userTestAnswers) {
                for (const [key, answer] of Object.entries(this.userTestAnswers)) {
                    if (answer && answer.answered) {
                        answered++;
                        if (answer.correct) correct++;
                    }
                }
            }
            
            const { error } = await supabase
                .from('active_test_sessions')
                .update({
                    answered_questions: answered,
                    correct_answers: correct,
                    current_question_index: this.currentQuestionIndex || 0,
                    last_activity: new Date().toISOString()
                })
                .eq('id', this.activeSessionId);
            
            if (error) {
                console.warn('⚠️ Failed to update progress:', error);
            }
            
        } catch (error) {
            console.warn('⚠️ Progress update error:', error);
        }
    }
    
    // ============================================
    // INITIALIZATION
    // ============================================
    
    async initializeElements() {
        console.log('🔍 Initializing NurseIQ...');
        await this.waitForElement('#loadCourseCatalogBtn');
        
        this.studentQuestionBankSearch = document.getElementById('studentQuestionBankSearch');
        this.nurseiqSearchBtn = document.getElementById('nurseiqSearchBtn');
        this.clearSearchBtn = document.getElementById('clearSearchBtn');
        this.loadCourseCatalogBtn = document.getElementById('loadCourseCatalogBtn');
        this.studentQuestionBankLoading = document.getElementById('studentQuestionBankLoading');
        this.studentQuestionBankContent = document.getElementById('studentQuestionBankContent');
        
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
    
    getSupabaseClient() {
        return window.supabaseClient || (window.db?.supabase) || null;
    }
    
    async initialize() {
        console.log('🚀 Initializing NurseIQ Module...');
        try {
            this.userId = getCurrentUserId();
            console.log('👤 User ID:', this.userId);
            
            if (this.userId && !this.userId.startsWith('anonymous_')) {
                localStorage.setItem('userId', this.userId);
                localStorage.setItem('currentUserId', this.userId);
                localStorage.setItem('studentId', this.userId);
            }
            
            await this.initializeElements();
            this.detectUserProgram();
            await this.loadUserProgress();
            await this.migrateOldProgress();
            await this.loadQuestionBankCards();
            
            this.initialized = true;
            this.updateDashboardMetrics();
            
            window.addEventListener('beforeunload', () => {
                if (this.activeSessionId) {
                    this.endActiveSession();
                }
                if (this.userTestAnswers && Object.keys(this.userTestAnswers).length > 0) {
                    this.saveProgressToDatabase();
                }
            });
            
            setInterval(() => {
                if (this.userTestAnswers && Object.keys(this.userTestAnswers).length > 0) {
                    this.saveProgressToDatabase();
                }
                if (this.activeSessionId) {
                    this.updateProgressForAdmin();
                }
            }, 30000);
            
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden && this.activeSessionId) {
                    this.sendHeartbeat();
                }
            });
            
            console.log('✅ NurseIQ Module initialized with active test tracking');
        } catch (error) {
            console.error('❌ Failed to initialize:', error);
        }
    }
    
    // ============================================
    // USER PROGRESS
    // ============================================
    
    async loadUserProgress() {
        try {
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
                    await this.ensureUserExistsInProfileTable();
                    
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
    
    async ensureUserExistsInProfileTable() {
        try {
            const supabase = this.getSupabaseClient();
            if (!supabase) return;
            
            const userEmail = localStorage.getItem('userEmail') || 
                             sessionStorage.getItem('userEmail') || 
                             `${this.userId}@student.nurseiq.com`;
            
            const userName = localStorage.getItem('userName') || 
                            sessionStorage.getItem('userName') || 
                            'Student';
            
            const studentId = localStorage.getItem('studentId') || 
                             sessionStorage.getItem('studentId') || 
                             null;
            
            const { data: existingUser, error: checkError } = await supabase
                .from('consolidated_user_profiles_table')
                .select('user_id')
                .eq('user_id', this.userId)
                .maybeSingle();
            
            if (checkError && checkError.code !== 'PGRST116') {
                console.error('Error checking user existence:', checkError);
                return;
            }
            
            if (!existingUser) {
                const { error: insertError } = await supabase
                    .from('consolidated_user_profiles_table')
                    .insert({
                        user_id: this.userId,
                        email: userEmail,
                        full_name: userName,
                        role: 'student',
                        student_id: studentId,
                        status: 'active',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });
                
                if (insertError) {
                    console.error('❌ Failed to create user profile:', insertError);
                } else {
                    console.log('✅ User profile created successfully');
                }
            }
            
        } catch (error) {
            console.error('❌ Error ensuring user exists:', error);
        }
    }
    
    async migrateOldProgress() {
        try {
            const supabase = this.getSupabaseClient();
            if (!supabase) return;
            
            if (!this.userId || this.userId.startsWith('anonymous_')) return;
            
            const localProgress = localStorage.getItem(this.storageKey);
            if (!localProgress) return;
            
            const parsedProgress = JSON.parse(localProgress);
            const hasAnswers = parsedProgress.answers && Object.keys(parsedProgress.answers).length > 0;
            
            if (!hasAnswers) return;
            
            console.log('📦 Found localStorage progress, checking database...');
            
            const { data: existingProgress, error: checkError } = await supabase
                .from('user_progress')
                .select('user_id')
                .eq('user_id', this.userId)
                .maybeSingle();
            
            if (checkError && checkError.code !== 'PGRST116') {
                console.error('Error checking existing progress:', checkError);
                return;
            }
            
            if (!existingProgress) {
                console.log('🔄 Migrating old progress from localStorage to database');
                
                const progressData = {
                    version: this.progressVersion,
                    answers: parsedProgress.answers || parsedProgress,
                    lastSaved: new Date().toISOString(),
                    migratedFromLocal: true,
                    migrationDate: new Date().toISOString()
                };
                
                const { error: insertError } = await supabase
                    .from('user_progress')
                    .insert({
                        user_id: this.userId,
                        progress_data: progressData,
                        updated_at: new Date().toISOString()
                    });
                
                if (insertError) {
                    console.error('❌ Migration failed:', insertError);
                } else {
                    console.log('✅ Old progress migrated successfully!');
                    this.showNotification('Your previous progress has been saved to the cloud!', 'success');
                    
                    if (parsedProgress.answers) {
                        this.userTestAnswers = { ...this.userTestAnswers, ...parsedProgress.answers };
                        this.saveUserProgress();
                    }
                }
            }
            
        } catch (error) {
            console.error('❌ Migration error:', error);
        }
    }
    
    saveUserProgress() {
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
        try {
            const supabase = this.getSupabaseClient();
            if (!supabase) return;
            
            if (!this.userId || this.userId.startsWith('anonymous_')) return;
            
            const progressData = {
                version: this.progressVersion,
                answers: this.userTestAnswers,
                lastSaved: new Date().toISOString()
            };
            
            const { data, error } = await supabase
                .from('user_progress')
                .upsert({
                    user_id: this.userId,
                    progress_data: progressData,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });
            
            if (error) {
                console.error('❌ Database save error:', error);
                
                if (error.code === '23503') {
                    console.log('🔄 Foreign key error - attempting to ensure user exists...');
                    await this.ensureUserExistsInProfileTable();
                    
                    const { error: retryError } = await supabase
                        .from('user_progress')
                        .upsert({
                            user_id: this.userId,
                            progress_data: progressData,
                            updated_at: new Date().toISOString()
                        }, { onConflict: 'user_id' });
                    
                    if (retryError) {
                        console.error('❌ Retry failed:', retryError);
                    } else {
                        console.log('✅ Progress saved after user creation');
                    }
                }
            } else {
                console.log('✅ Progress saved to database successfully');
            }
            
        } catch (error) {
            console.error('❌ Exception in saveProgressToDatabase:', error);
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
    // DASHBOARD METRICS
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
    
    static getDashboardMetrics() {
        try {
            const savedMetrics = localStorage.getItem('nurseiq_dashboard_metrics');
            if (savedMetrics) {
                return JSON.parse(savedMetrics);
            }
        } catch (error) {
            console.error('Error getting dashboard metrics:', error);
        }
        return {
            totalAnswered: 0,
            totalCorrect: 0,
            accuracy: 0,
            progress: 0,
            recentActivity: 0,
            streak: 0,
            lastUpdated: new Date().toISOString()
        };
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
    // COURSE USER STATS
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
    // LOAD QUESTION BANK
    // ============================================
    
    async loadQuestionBankCards() {
        try {
            console.log('📚 Loading question bank...');
            this.showLoading();
            const supabase = this.getSupabaseClient();
            if (!supabase) throw new Error('No database connection');
            
            const { data: questions, error } = await supabase
                .from('medical_assessments')
                .select(`*, courses (id, course_name, unit_code, color, description)`)
                .eq('is_active', true)
                .eq('is_published', true);
            
            if (error) throw error;
            console.log(`✅ Fetched ${questions?.length || 0} questions`);
            
            const coursesMap = {};
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
                }
                
                coursesMap[courseId].questions.push(question);
                coursesMap[courseId].stats.total++;
                coursesMap[courseId].stats.active++;
                
                if (question.difficulty === 'hard') coursesMap[courseId].stats.hard++;
                else if (question.difficulty === 'medium') coursesMap[courseId].stats.medium++;
                else if (question.difficulty === 'easy') coursesMap[courseId].stats.easy++;
                
                if (question.updated_at) {
                    const updatedDate = new Date(question.updated_at);
                    if (!coursesMap[courseId].stats.lastUpdated || updatedDate > coursesMap[courseId].stats.lastUpdated) {
                        coursesMap[courseId].stats.lastUpdated = updatedDate;
                    }
                }
            });
            
            Object.keys(coursesMap).forEach(courseId => {
                coursesMap[courseId].userStats = this.getCourseUserStats(courseId, coursesMap[courseId].questions);
            });
            
            const coursesArray = Object.values(coursesMap);
            this.displayQuestionBankCards(coursesArray);
            
        } catch (error) {
            console.error('❌ Error loading question bank:', error);
            this.showError(`Failed to load: ${error.message || 'Please try again'}`);
        } finally {
            this.hideLoading();
        }
    }
    
    // ============================================
    // DISPLAY QUESTION BANK CARDS
    // ============================================
    
    displayQuestionBankCards(courses) {
        if (!this.studentQuestionBankContent) return;
        
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
        
        const lastProgress = this.getLastCourseProgress();
        if (lastProgress) {
            const lastCourse = courses.find(c => c.id === lastProgress.courseId);
            if (lastCourse) {
                const userStats = lastCourse.userStats;
                html += `
                    <div class="resume-card">
                        <div class="resume-header">
                            <i class="fas fa-history"></i>
                            <h3>Continue Where You Left Off</h3>
                        </div>
                        <div class="resume-content">
                            <div class="resume-course">
                                <span class="resume-course-name">${lastCourse.name}</span>
                                <span class="resume-progress">
                                    <i class="fas fa-chart-line"></i> 
                                    Question ${lastProgress.currentIndex + 1} of ${lastProgress.totalQuestions}
                                </span>
                                <div class="resume-stats">
                                    <span class="resume-stat"><i class="fas fa-check-circle"></i> ${userStats.answered}/${userStats.total} answered</span>
                                    <span class="resume-stat"><i class="fas fa-trophy"></i> ${userStats.accuracy}% accuracy</span>
                                </div>
                            </div>
                            <div class="resume-actions">
                                <button onclick="window.startCourseTest('${lastCourse.id}', '${lastCourse.name.replace(/'/g, "\\'")}', ${lastProgress.currentIndex})" 
                                        class="resume-btn btn-primary">
                                    <i class="fas fa-play"></i> Resume Practice
                                </button>
                                <button onclick="window.startCourseTest('${lastCourse.id}', '${lastCourse.name.replace(/'/g, "\\'")}', 0)" 
                                        class="resume-btn btn-secondary">
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
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>No Courses Found</h3>
                    <p>No courses match your search "${searchTerm}". Try a different search term.</p>
                    <button onclick="window.clearQuestionBankSearch()" class="btn btn-primary mt-2">
                        <i class="fas fa-times"></i> Clear Search
                    </button>
                </div>
            `;
        } else {
            html += `<div class="courses-grid">`;
            
            filteredCourses.forEach(course => {
                const courseColor = course.color || '#4f46e5';
                const lastUpdated = formatDate(course.stats.lastUpdated);
                const userStats = course.userStats;
                const hasProgress = userStats.answered > 0;
                
                html += `
                    <div class="course-card">
                        <div class="course-header" style="border-color: ${courseColor}20;">
                            <div class="course-title">
                                <div>
                                    <h3>${course.name}</h3>
                                    <div class="course-subtitle">
                                        <span class="unit-code" style="background: ${courseColor}30; color: ${courseColor};">
                                            ${course.unit_code}
                                        </span>
                                        <span class="question-count">
                                            <i class="fas fa-question-circle"></i> ${course.stats.total} questions
                                        </span>
                                    </div>
                                </div>
                                <div class="course-icon" style="background: ${courseColor};">
                                    <i class="fas fa-book-medical"></i>
                                </div>
                            </div>
                            ${hasProgress ? `
                                <div class="progress-badge" style="background: linear-gradient(135deg, ${courseColor}, ${this.adjustColor(courseColor, -20)});">
                                    <i class="fas fa-chart-line"></i> ${userStats.completion}% Complete
                                </div>
                            ` : `
                                <div class="active-badge">
                                    <i class="fas fa-check-circle"></i> Active Questions
                                </div>
                            `}
                        </div>
                        
                        <div class="course-stats">
                            ${hasProgress ? `
                                <div class="user-progress-section">
                                    <div class="progress-title"><i class="fas fa-chart-bar"></i> Your Progress</div>
                                    <div class="progress-grid">
                                        <div class="progress-item">
                                            <div class="progress-value" style="color: ${courseColor};">${userStats.answered}/${userStats.total}</div>
                                            <div class="progress-label">Answered</div>
                                        </div>
                                        <div class="progress-item">
                                            <div class="progress-value" style="color: #10b981;">${userStats.correct}</div>
                                            <div class="progress-label">Correct</div>
                                        </div>
                                        <div class="progress-item">
                                            <div class="progress-value" style="color: #f59e0b;">${userStats.accuracy}%</div>
                                            <div class="progress-label">Accuracy</div>
                                        </div>
                                        <div class="progress-item">
                                            <div class="progress-value" style="color: #8b5cf6;">${userStats.completion}%</div>
                                            <div class="progress-label">Complete</div>
                                        </div>
                                    </div>
                                </div>
                            ` : ''}
                            
                            <div class="stats-grid">
                                <div class="stat-item">
                                    <div class="stat-value text-primary">${course.stats.total}</div>
                                    <div class="stat-label">TOTAL</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-value text-danger">${course.stats.hard}</div>
                                    <div class="stat-label">HARD</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-value text-warning">${course.stats.medium}</div>
                                    <div class="stat-label">MEDIUM</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-date-label">UPDATED</div>
                                    <div class="stat-date text-primary">${lastUpdated}</div>
                                </div>
                            </div>
                            
                            <button class="start-test-btn" 
                                    onclick="window.startCourseTest('${course.id}', '${course.name.replace(/'/g, "\\'")}', ${hasProgress ? -1 : 0})" 
                                    style="background: linear-gradient(135deg, ${courseColor}, ${this.adjustColor(courseColor, -20)});">
                                <i class="fas fa-play-circle"></i> ${hasProgress ? 'CONTINUE PRACTICE' : 'START PRACTICE TEST'}
                            </button>
                            
                            <div class="quick-stats">
                                <div class="quick-stat">
                                    <div class="quick-value text-success">${course.stats.easy}</div>
                                    <div class="quick-label">Easy</div>
                                </div>
                                <div class="quick-stat">
                                    <div class="quick-value text-warning">${course.stats.medium}</div>
                                    <div class="quick-label">Medium</div>
                                </div>
                                <div class="quick-stat">
                                    <div class="quick-value text-danger">${course.stats.hard}</div>
                                    <div class="quick-label">Hard</div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += `</div>`;
        }
        
        html += `</div>`;
        this.studentQuestionBankContent.innerHTML = html;
        console.log('✅ Question bank displayed');
    }
    
    adjustColor(color, amount) {
        let usePound = false;
        if (color[0] === "#") {
            color = color.slice(1);
            usePound = true;
        }
        const num = parseInt(color, 16);
        let r = (num >> 16) + amount;
        if (r > 255) r = 255;
        else if (r < 0) r = 0;
        let b = ((num >> 8) & 0x00FF) + amount;
        if (b > 255) b = 255;
        else if (b < 0) b = 0;
        let g = (num & 0x0000FF) + amount;
        if (g > 255) g = 255;
        else if (g < 0) g = 0;
        return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
    }
    
    // ============================================
    // START COURSE TEST
    // ============================================
    
    async startCourseTest(courseId, courseName, startIndex = 0) {
        try {
            console.log(`Starting test for course: ${courseName}`);
            this.showLoading();
            
            await this.trackActiveSession(courseId, courseName);
            
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
            
            this.displayInteractiveQuestions(courseName, questions);
            
            await this.updateProgressForAdmin();
            
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
                <div class="questions-header-bar">
                    <div class="header-content">
                        <button onclick="window.loadQuestionBankCards()" class="header-back-btn">
                            <i class="fas fa-arrow-left"></i> Back to Courses
                        </button>
                        
                        <div class="header-course-info">
                            <h2 class="course-name">${courseName}</h2>
                            <p class="practice-mode">Interactive Q&A Practice Mode</p>
                        </div>
                        
                        <div class="header-progress-stats">
                            <div class="progress-stat-top">
                                <div class="progress-label-top">Question</div>
                                <div class="progress-value-top">
                                    <span id="currentQuestionCountTop">${this.currentQuestionIndex + 1}</span>/<span id="totalQuestionsTop">${questions.length}</span>
                                </div>
                            </div>
                            <div class="progress-stat-top">
                                <div class="progress-label-top">Answered</div>
                                <div class="progress-value-top" id="answeredCountTop">${userStats.answered}</div>
                            </div>
                            <div class="progress-stat-top">
                                <div class="progress-label-top">Correct</div>
                                <div class="progress-value-top" id="correctCountTop">${userStats.correct}</div>
                            </div>
                            <div class="progress-stat-top">
                                <div class="progress-label-top">Accuracy</div>
                                <div class="progress-value-top" id="accuracyTop">${userStats.accuracy}%</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="questions-main-container">
                    <div class="question-panel">
                        <div class="question-header">
                            <div class="question-meta">
                                <span class="question-number-badge">Q${this.currentQuestionIndex + 1}</span>
                                <span class="question-type">Multiple Choice</span>
                                <span class="difficulty-badge difficulty-medium" id="difficultyBadge">Medium</span>
                            </div>
                            
                            <div class="mini-navigation">
                                <button onclick="window.prevQuestion()" class="mini-nav-btn" id="miniPrevBtn" ${this.currentQuestionIndex === 0 ? 'disabled' : ''}>
                                    <i class="fas fa-chevron-left"></i>
                                </button>
                                <div class="mini-dots" id="miniDotsContainer">
                                    ${this.generateMiniDots(questions.length)}
                                </div>
                                <button onclick="window.nextQuestion()" class="mini-nav-btn" id="miniNextBtn" ${this.currentQuestionIndex === questions.length - 1 ? 'disabled' : ''}>
                                    <i class="fas fa-chevron-right"></i>
                                </button>
                            </div>
                        </div>
                        
                        <div class="question-card">
                            <div class="question-text" id="questionText">Loading question...</div>
                        </div>
                        
                        <div class="options-panel">
                            <h3 class="options-title"><i class="fas fa-list-ol"></i> Select Your Answer:</h3>
                            <div id="optionsContainer" class="options-container-improved"></div>
                        </div>
                        
                        <div class="action-buttons-panel-horizontal">
                            <button onclick="window.checkAnswer()" id="checkAnswerBtn" class="action-btn-horizontal primary-action-btn">
                                <i class="fas fa-check-circle"></i> Check Answer
                            </button>
                            <button onclick="window.resetQuestion()" id="resetBtn" class="action-btn-horizontal secondary-action-btn">
                                <i class="fas fa-redo"></i> Reset
                            </button>
                            <button onclick="window.markForReview()" id="markBtn" class="action-btn-horizontal warning-action-btn">
                                <i class="fas fa-flag"></i> <span id="markBtnText">Mark for Review</span>
                            </button>
                        </div>
                        
                        <div class="compact-navigation">
                            <button onclick="window.prevQuestion()" id="prevBtn" class="compact-nav-btn compact-nav-prev">
                                <i class="fas fa-chevron-left"></i> Previous
                            </button>
                            
                            <div class="compact-progress">
                                <div class="compact-progress-bar">
                                    <div class="compact-progress-fill" id="progressFill" style="width: ${Math.round(((this.currentQuestionIndex + 1) / questions.length) * 100)}%;"></div>
                                </div>
                                <span class="compact-progress-text" id="progressPercent">${Math.round(((this.currentQuestionIndex + 1) / questions.length) * 100)}%</span>
                            </div>
                            
                            <button onclick="window.nextQuestion()" id="nextBtn" class="compact-nav-btn compact-nav-next">
                                Next <i class="fas fa-chevron-right"></i>
                            </button>
                            
                            <button onclick="window.finishPractice()" class="compact-nav-btn compact-nav-finish">
                                <i class="fas fa-flag-checkered"></i> Finish
                            </button>
                        </div>
                        
                        <div id="answerRevealSection" class="answer-reveal-section" style="display: none;">
                            <div class="answer-header">
                                <h3><i class="fas fa-check-double"></i> Answer & Explanation</h3>
                                <button onclick="window.hideAnswer()" class="hide-answer-btn">
                                    <i class="fas fa-times"></i> Hide
                                </button>
                            </div>
                            
                            <div class="correct-answer-box">
                                <div class="correct-answer-label">
                                    <i class="fas fa-check-circle"></i> Correct Answer:
                                </div>
                                <div class="correct-answer-text" id="correctAnswerText">Loading...</div>
                            </div>
                            
                            <div class="explanation-box">
                                <div class="explanation-label">
                                    <i class="fas fa-info-circle"></i> Explanation:
                                </div>
                                <div class="explanation-content">
                                    <div class="explanation-text" id="explanationText">Select an option and click "Check Answer" to see the explanation.</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="stats-panel">
                        <div class="horizontal-nav-card">
                            <h3 class="nav-title"><i class="fas fa-list-ol"></i> Questions Navigator</h3>
                            <div class="horizontal-question-grid" id="questionGridContainer"></div>
                            <div class="grid-controls">
                                <button onclick="window.scrollQuestions('left')" class="grid-scroll-btn">
                                    <i class="fas fa-chevron-left"></i>
                                </button>
                                <button onclick="window.jumpToQuestion()" class="grid-jump-btn">
                                    Jump to Question
                                </button>
                                <button onclick="window.scrollQuestions('right')" class="grid-scroll-btn">
                                    <i class="fas fa-chevron-right"></i>
                                </button>
                            </div>
                        </div>
                        
                        <div class="course-overview-card">
                            <h3 class="overview-title"><i class="fas fa-chart-bar"></i> Course Progress</h3>
                            <div class="overview-stats">
                                <div class="overview-stat">
                                    <div class="overview-value">${userStats.completion}%</div>
                                    <div class="overview-label">Completion</div>
                                </div>
                                <div class="overview-stat">
                                    <div class="overview-value">${userStats.accuracy}%</div>
                                    <div class="overview-label">Accuracy</div>
                                </div>
                                <div class="overview-stat">
                                    <div class="overview-value">${userStats.answered}</div>
                                    <div class="overview-label">Answered</div>
                                </div>
                                <div class="overview-stat">
                                    <div class="overview-value">${questions.length}</div>
                                    <div class="overview-label">Total</div>
                                </div>
                            </div>
                            <div class="progress-bar-container">
                                <div class="progress-bar" style="width: ${userStats.completion}%; background: ${courseColor};"></div>
                            </div>
                        </div>
                        
                        <div class="tips-card">
                            <h3 class="tips-title"><i class="fas fa-graduation-cap"></i> Study Tips</h3>
                            <ul class="tips-list">
                                <li><i class="fas fa-check"></i> Read each question carefully</li>
                                <li><i class="fas fa-check"></i> Review explanations thoroughly</li>
                                <li><i class="fas fa-check"></i> Mark difficult questions</li>
                                <li><i class="fas fa-check"></i> Aim for 80%+ accuracy</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.studentQuestionBankContent.innerHTML = html;
        
        setTimeout(() => {
            this.loadCurrentInteractiveQuestion();
            this.updateQuestionGrid();
            this.updateProgressBar();
            this.updateMiniDots();
            this.updateTopProgressStats();
            this.updateNavigationButtons();
        }, 100);
    }
    
    // ============================================
    // LOAD CURRENT INTERACTIVE QUESTION
    // ============================================
    
    loadCurrentInteractiveQuestion() {
        const question = this.currentCourseQuestions[this.currentQuestionIndex];
        if (!question) return;
        
        const questionText = document.getElementById('questionText');
        if (questionText) {
            questionText.innerHTML = question.question_text || 'Question text not available';
        }
        
        const difficultyBadge = document.getElementById('difficultyBadge');
        if (difficultyBadge) {
            difficultyBadge.textContent = question.difficulty?.toUpperCase() || 'MEDIUM';
            difficultyBadge.classList.remove('difficulty-easy', 'difficulty-medium', 'difficulty-hard');
            if (question.difficulty === 'easy') {
                difficultyBadge.classList.add('difficulty-easy');
            } else if (question.difficulty === 'hard') {
                difficultyBadge.classList.add('difficulty-hard');
            } else {
                difficultyBadge.classList.add('difficulty-medium');
            }
        }
        
        this.loadAnswerOptions(question);
        this.updateCounters();
        this.updateTopProgressStats();
        this.updateNavigationButtons();
        this.updateMarkButton();
        
        const savedAnswer = this.userTestAnswers[question.id];
        const answerRevealSection = document.getElementById('answerRevealSection');
        
        if (savedAnswer?.answered) {
            this.userTestAnswers[this.currentQuestionIndex] = {
                ...savedAnswer,
                selectedOption: savedAnswer.selectedOption,
                selectedOptionIndex: savedAnswer.selectedOptionIndex,
                answered: true,
                correct: savedAnswer.correct
            };
            this.showUserAnswer(this.userTestAnswers[this.currentQuestionIndex]);
            if (answerRevealSection) {
                answerRevealSection.style.display = 'block';
                this.showAnswerRevealSection();
            }
        } else {
            if (answerRevealSection) answerRevealSection.style.display = 'none';
            this.resetOptionSelection();
        }
        
        this.highlightCurrentQuestionInGrid();
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
        
        const correctAnswer = question.correct_answer || '';
        const optionLabels = ['A', 'B', 'C', 'D'];
        let optionsHtml = '';
        
        options.forEach((option, index) => {
            if (index >= optionLabels.length) return;
            const optionId = `option-${this.currentQuestionIndex}-${index}`;
            const optionLetter = optionLabels[index];
            const isCorrectAnswer = option === correctAnswer;
            
            optionsHtml += `
                <div class="option-item-improved" data-option-index="${index}" data-is-correct="${isCorrectAnswer}">
                    <div class="option-radio-improved">
                        <input type="radio" id="${optionId}" name="question-${this.currentQuestionIndex}" value="${option}" class="option-input-hidden">
                        <label for="${optionId}" class="option-label-improved">
                            <span class="option-letter-circle">${optionLetter}</span>
                            <span class="option-text-improved">${option}</span>
                        </label>
                    </div>
                </div>
            `;
        });
        
        optionsContainer.innerHTML = optionsHtml;
        
        optionsContainer.querySelectorAll('.option-item-improved').forEach(item => {
            item.addEventListener('click', () => this.selectOption(item));
        });
        
        const savedAnswer = this.userTestAnswers[question.id];
        if (savedAnswer?.answered) {
            optionsContainer.querySelectorAll('.option-item-improved').forEach(item => {
                const optionText = item.querySelector('.option-text-improved')?.textContent || '';
                if (optionText === savedAnswer.selectedOption) {
                    this.selectOption(item);
                }
            });
        }
    }
    
    // ============================================
    // SELECT OPTION
    // ============================================
    
    selectOption(optionItem) {
        this.resetOptionSelection();
        const radioInput = optionItem.querySelector('.option-input-hidden');
        if (radioInput) {
            radioInput.checked = true;
            optionItem.classList.add('selected-improved');
            const optionIndex = optionItem.dataset.optionIndex;
            const optionText = optionItem.querySelector('.option-text-improved')?.textContent || '';
            this.userTestAnswers[this.currentQuestionIndex] = {
                ...this.userTestAnswers[this.currentQuestionIndex],
                selectedOption: optionText,
                selectedOptionIndex: parseInt(optionIndex),
                answered: false
            };
        }
    }
    
    resetOptionSelection() {
        const optionsContainer = document.getElementById('optionsContainer');
        if (!optionsContainer) return;
        optionsContainer.querySelectorAll('.option-item-improved').forEach(item => {
            item.classList.remove('selected-improved', 'correct-improved', 'incorrect-improved');
        });
        const question = this.currentCourseQuestions[this.currentQuestionIndex];
        const savedAnswer = this.userTestAnswers[question.id];
        if (!savedAnswer?.answered) {
            delete this.userTestAnswers[this.currentQuestionIndex];
        }
    }
    
    // ============================================
    // CHECK ANSWER - UPDATED WITH TRACKING
    // ============================================
    
    checkAnswer() {
        const userAnswer = this.userTestAnswers[this.currentQuestionIndex];
        if (!userAnswer || !userAnswer.selectedOption) {
            this.showNotification('Please select an answer first!', 'warning');
            return;
        }
        
        const question = this.currentCourseQuestions[this.currentQuestionIndex];
        const correctAnswer = question.correct_answer || '';
        const isCorrect = userAnswer.selectedOption === correctAnswer;
        
        userAnswer.answered = true;
        userAnswer.correct = isCorrect;
        userAnswer.timestamp = new Date().toISOString();
        userAnswer.correctAnswer = correctAnswer;
        userAnswer.courseId = question.course_id;
        userAnswer.courseName = this.currentCourseForTest.name;
        userAnswer.questionText = question.question_text;
        userAnswer.difficulty = question.difficulty;
        
        this.userTestAnswers[question.id] = {
            selectedOption: userAnswer.selectedOption,
            selectedOptionIndex: userAnswer.selectedOptionIndex,
            answered: true,
            correct: isCorrect,
            correctAnswer: correctAnswer,
            timestamp: userAnswer.timestamp,
            questionText: question.question_text,
            courseId: question.course_id,
            courseName: this.currentCourseForTest.name,
            difficulty: question.difficulty,
            explanationViewed: true
        };
        
        this.showUserAnswer(userAnswer);
        this.updateCounters();
        this.updateTopProgressStats();
        this.showAnswerRevealSection();
        this.updateQuestionGrid();
        this.showFeedbackNotification(isCorrect);
        this.saveUserProgress();
        
        // Send progress update to admin
        this.updateProgressForAdmin();
        
        // Dispatch progress event
        document.dispatchEvent(new CustomEvent('studentTestProgress', {
            detail: {
                userId: this.userId,
                sessionId: this.activeSessionId,
                questionIndex: this.currentQuestionIndex,
                isCorrect: isCorrect,
                answered: Object.values(this.userTestAnswers).filter(a => a?.answered).length,
                total: this.currentCourseQuestions.length
            }
        }));
        
        // Auto-advance to next question after 2 seconds
        if (this.currentQuestionIndex < this.currentCourseQuestions.length - 1) {
            setTimeout(() => {
                this.nextQuestion();
            }, 2000);
        }
    }
    
    // ============================================
    // SHOW USER ANSWER
    // ============================================
    
    showUserAnswer(userAnswer) {
        const optionsContainer = document.getElementById('optionsContainer');
        if (!optionsContainer) return;
        
        optionsContainer.querySelectorAll('.option-item-improved').forEach(item => {
            const optionText = item.querySelector('.option-text-improved')?.textContent || '';
            if (optionText === userAnswer.selectedOption) {
                item.classList.add('selected-improved');
                const radioInput = item.querySelector('.option-input-hidden');
                if (radioInput) radioInput.checked = true;
                if (userAnswer.answered) {
                    if (userAnswer.correct) {
                        item.classList.add('correct-improved');
                    } else {
                        item.classList.add('incorrect-improved');
                        optionsContainer.querySelectorAll('.option-item-improved').forEach(correctItem => {
                            const correctOptionText = correctItem.querySelector('.option-text-improved')?.textContent || '';
                            if (correctOptionText === userAnswer.correctAnswer) {
                                correctItem.classList.add('correct-improved');
                            }
                        });
                    }
                }
            }
        });
    }
    
    // ============================================
    // SHOW ANSWER REVEAL SECTION
    // ============================================
    
    showAnswerRevealSection() {
        const answerRevealSection = document.getElementById('answerRevealSection');
        if (!answerRevealSection) return;
        
        const question = this.currentCourseQuestions[this.currentQuestionIndex];
        if (!question) return;
        
        const correctAnswer = question.correct_answer || 'Correct answer not available';
        const correctAnswerText = document.getElementById('correctAnswerText');
        if (correctAnswerText) correctAnswerText.textContent = correctAnswer;
        
        const explanationText = document.getElementById('explanationText');
        if (explanationText) {
            explanationText.innerHTML = question.explanation || '<div class="no-explanation">No detailed explanation available for this question.</div>';
        }
        
        answerRevealSection.style.display = 'block';
        answerRevealSection.style.opacity = '1';
        answerRevealSection.style.visibility = 'visible';
        
        const questionCard = document.querySelector('.question-card');
        if (questionCard && this.userTestAnswers[this.currentCourseQuestions[this.currentQuestionIndex]?.id]?.answered) {
            questionCard.classList.add('has-answer');
        }
    }
    
    // ============================================
    // HIDE ANSWER
    // ============================================
    
    hideAnswer() {
        const answerRevealSection = document.getElementById('answerRevealSection');
        if (answerRevealSection) answerRevealSection.style.display = 'none';
    }
    
    // ============================================
    // SHOW FEEDBACK NOTIFICATION
    // ============================================
    
    showFeedbackNotification(isCorrect) {
        const notification = document.createElement('div');
        notification.className = `feedback-notification ${isCorrect ? 'success' : 'error'}`;
        notification.innerHTML = `<i class="fas fa-${isCorrect ? 'check-circle' : 'times-circle'}"></i>
                                <span>${isCorrect ? 'Correct! Well done!' : 'Incorrect. Review the explanation below.'}</span>`;
        document.querySelector('.questions-main-container')?.appendChild(notification);
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }
    
    // ============================================
    // SHOW NOTIFICATION
    // ============================================
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `toast toast-${type}`;
        notification.innerHTML = `<i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
                                <span>${message}</span>`;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }
    
    // ============================================
    // RESET QUESTION
    // ============================================
    
    resetQuestion() {
        const question = this.currentCourseQuestions[this.currentQuestionIndex];
        const savedAnswer = this.userTestAnswers[question.id];
        
        if (savedAnswer?.answered) {
            delete this.userTestAnswers[question.id];
        }
        
        delete this.userTestAnswers[this.currentQuestionIndex];
        this.saveUserProgress();
        
        this.loadCurrentInteractiveQuestion();
        this.updateQuestionGrid();
        this.updateTopProgressStats();
    }
    
    // ============================================
    // MARK FOR REVIEW
    // ============================================
    
    markForReview() {
        const currentIndex = this.currentQuestionIndex;
        const question = this.currentCourseQuestions[currentIndex];
        const isMarked = this.userTestAnswers[question.id]?.marked || 
                        this.userTestAnswers[currentIndex]?.marked || 
                        false;
        
        if (question.id) {
            this.userTestAnswers[question.id] = {
                ...this.userTestAnswers[question.id],
                marked: !isMarked,
                timestamp: new Date().toISOString()
            };
        }
        
        this.updateMarkButton();
        this.updateQuestionGrid();
        this.updateMiniDots();
        this.updateTopProgressStats();
        const action = !isMarked ? 'marked for review' : 'unmarked';
        this.showNotification(`Question ${currentIndex + 1} ${action}`, 'info');
        this.saveUserProgress();
    }
    
    updateMarkButton() {
        const markBtn = document.getElementById('markBtn');
        const markBtnText = document.getElementById('markBtnText');
        if (!markBtn || !markBtnText) return;
        
        const question = this.currentCourseQuestions[this.currentQuestionIndex];
        const isMarked = this.userTestAnswers[question.id]?.marked || 
                        this.userTestAnswers[this.currentQuestionIndex]?.marked || 
                        false;
        
        if (isMarked) {
            markBtn.classList.add('marked');
            markBtnText.textContent = 'Unmark Review';
        } else {
            markBtn.classList.remove('marked');
            markBtnText.textContent = 'Mark for Review';
        }
    }
    
    // ============================================
    // NAVIGATION
    // ============================================
    
    prevQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.loadCurrentInteractiveQuestion();
            this.updateProgressBar();
            this.updateMiniDots();
            this.updateTopProgressStats();
            this.updateNavigationButtons();
        }
    }
    
    nextQuestion() {
        if (this.currentQuestionIndex < this.currentCourseQuestions.length - 1) {
            this.currentQuestionIndex++;
            this.loadCurrentInteractiveQuestion();
            this.updateProgressBar();
            this.updateMiniDots();
            this.updateTopProgressStats();
            this.updateNavigationButtons();
        }
    }
    
    goToQuestion(index) {
        if (index >= 0 && index < this.currentCourseQuestions.length) {
            this.currentQuestionIndex = index;
            this.loadCurrentInteractiveQuestion();
            this.updateProgressBar();
            this.updateMiniDots();
            this.updateTopProgressStats();
            this.updateNavigationButtons();
        }
    }
    
    jumpToQuestion() {
        const inputValue = prompt(`Enter question number (1-${this.currentCourseQuestions.length}):`);
        if (!inputValue) return;
        const questionNum = parseInt(inputValue);
        if (isNaN(questionNum) || questionNum < 1 || questionNum > this.currentCourseQuestions.length) {
            this.showNotification(`Please enter a number between 1 and ${this.currentCourseQuestions.length}`, 'warning');
            return;
        }
        this.goToQuestion(questionNum - 1);
    }
    
    // ============================================
    // FINISH PRACTICE - UPDATED TO END SESSION
    // ============================================
    
    async finishPractice() {
        const userStats = this.getCourseUserStats(this.currentCourseForTest.id, this.currentCourseQuestions);
        const answeredCount = userStats.answered;
        const correctCount = userStats.correct;
        const accuracy = userStats.accuracy;
        const totalQuestions = this.currentCourseQuestions.length;
        
        const allAnswered = answeredCount === totalQuestions;
        const warningMessage = allAnswered ? 
            '' : 
            `⚠️ You have ${totalQuestions - answeredCount} unanswered questions. Continue?`;
        
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
            // End the active session
            await this.endActiveSession();
            
            // Show results summary
            this.showPracticeSummary(correctCount, totalQuestions, accuracy);
            await this.saveAttemptToDatabase(correctCount, totalQuestions);
            this.saveUserProgress();
        }
    }
    
    showPracticeSummary(correct, total, accuracy) {
        const isPass = accuracy >= 60;
        const grade = accuracy >= 85 ? 'Distinction' : 
                      accuracy >= 75 ? 'Credit' : 
                      accuracy >= 60 ? 'Pass' : 'Fail';
        
        const summaryHTML = `
            <div class="practice-summary-overlay">
                <div class="practice-summary-card ${isPass ? 'passed' : 'failed'}">
                    <div class="summary-icon">
                        <i class="fas ${isPass ? 'fa-trophy' : 'fa-book'}"></i>
                    </div>
                    <h2>${isPass ? '🎉 Practice Complete!' : '📚 Keep Practicing!'}</h2>
                    <div class="summary-stats">
                        <div class="stat">
                            <span class="value">${correct}/${total}</span>
                            <span class="label">Correct</span>
                        </div>
                        <div class="stat">
                            <span class="value">${accuracy}%</span>
                            <span class="label">Accuracy</span>
                        </div>
                        <div class="stat">
                            <span class="value">${grade}</span>
                            <span class="label">Grade</span>
                        </div>
                    </div>
                    <div class="summary-actions">
                        <button onclick="window.loadQuestionBankCards()" class="btn-primary">
                            <i class="fas fa-arrow-left"></i> Back to Courses
                        </button>
                        <button onclick="window.startCourseTest('${this.currentCourseForTest.id}', '${this.currentCourseForTest.name.replace(/'/g, "\\'")}', 0)" class="btn-secondary">
                            <i class="fas fa-redo"></i> Retry
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        if (this.studentQuestionBankContent) {
            this.studentQuestionBankContent.innerHTML = summaryHTML;
        }
    }
    
    // ============================================
    // UPDATE METHODS
    // ============================================
    
    updateCounters() {
        const userStats = this.getCourseUserStats(this.currentCourseForTest.id, this.currentCourseQuestions);
        const answeredCount = userStats.answered;
        const correctCount = userStats.correct;
        const accuracy = userStats.accuracy;
        
        const currentQuestionCountEl = document.getElementById('currentQuestionCountTop');
        const totalQuestionsEl = document.getElementById('totalQuestionsTop');
        const answeredCountEl = document.getElementById('answeredCountTop');
        const correctCountEl = document.getElementById('correctCountTop');
        const accuracyEl = document.getElementById('accuracyTop');
        
        if (currentQuestionCountEl) currentQuestionCountEl.textContent = this.currentQuestionIndex + 1;
        if (totalQuestionsEl) totalQuestionsEl.textContent = this.currentCourseQuestions.length;
        if (answeredCountEl) answeredCountEl.textContent = answeredCount;
        if (correctCountEl) correctCountEl.textContent = correctCount;
        if (accuracyEl) accuracyEl.textContent = `${accuracy}%`;
    }
    
    updateTopProgressStats() {
        this.updateCounters();
    }
    
    updateNavigationButtons() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const miniPrevBtn = document.getElementById('miniPrevBtn');
        const miniNextBtn = document.getElementById('miniNextBtn');
        
        const isFirst = this.currentQuestionIndex === 0;
        const isLast = this.currentQuestionIndex === this.currentCourseQuestions.length - 1;
        
        [prevBtn, nextBtn, miniPrevBtn, miniNextBtn].forEach(btn => {
            if (btn) {
                btn.disabled = (btn === prevBtn || btn === miniPrevBtn) ? isFirst : isLast;
                btn.classList.toggle('disabled', btn.disabled);
            }
        });
    }
    
    updateProgressBar() {
        const progressFill = document.getElementById('progressFill');
        const progressPercent = document.getElementById('progressPercent');
        if (!progressFill || !progressPercent) return;
        const totalQuestions = this.currentCourseQuestions.length;
        const progress = Math.round(((this.currentQuestionIndex + 1) / totalQuestions) * 100);
        progressFill.style.width = `${progress}%`;
        progressPercent.textContent = `${progress}%`;
    }
    
    updateQuestionGrid() {
        const questionGridContainer = document.getElementById('questionGridContainer');
        if (!questionGridContainer) return;
        const totalQuestions = this.currentCourseQuestions.length;
        let gridHtml = '';
        
        for (let i = 0; i < totalQuestions; i++) {
            const question = this.currentCourseQuestions[i];
            let questionClass = 'grid-question-number';
            if (i === this.currentQuestionIndex) questionClass += ' grid-current';
            
            const savedAnswer = this.userTestAnswers[question.id];
            if (savedAnswer) {
                if (savedAnswer.answered) {
                    questionClass += savedAnswer.correct ? ' grid-correct' : ' grid-incorrect';
                } else if (savedAnswer.marked) {
                    questionClass += ' grid-marked';
                } else if (savedAnswer.viewed) {
                    questionClass += ' grid-viewed';
                }
            } else {
                const sessionAnswer = this.userTestAnswers[i];
                if (sessionAnswer) {
                    if (sessionAnswer.answered) {
                        questionClass += sessionAnswer.correct ? ' grid-correct' : ' grid-incorrect';
                    } else if (sessionAnswer.marked) {
                        questionClass += ' grid-marked';
                    } else if (sessionAnswer.viewed) {
                        questionClass += ' grid-viewed';
                    }
                }
            }
            
            const marked = savedAnswer?.marked || this.userTestAnswers[i]?.marked;
            gridHtml += `<div class="${questionClass}" onclick="window.goToQuestion(${i})" title="Question ${i + 1}">
                        ${i + 1}${marked ? '<i class="fas fa-flag grid-flag"></i>' : ''}</div>`;
        }
        
        questionGridContainer.innerHTML = gridHtml;
        this.scrollToCurrentQuestion();
    }
    
    scrollToCurrentQuestion() {
        const questionGridContainer = document.getElementById('questionGridContainer');
        if (!questionGridContainer) return;
        const currentQuestionElement = questionGridContainer.querySelector('.grid-current');
        if (currentQuestionElement) {
            const containerWidth = questionGridContainer.clientWidth;
            const elementOffset = currentQuestionElement.offsetLeft;
            const elementWidth = currentQuestionElement.offsetWidth;
            questionGridContainer.scrollLeft = elementOffset - (containerWidth / 2) + (elementWidth / 2);
        }
    }
    
    highlightCurrentQuestionInGrid() {
        const questionGridContainer = document.getElementById('questionGridContainer');
        if (!questionGridContainer) return;
        questionGridContainer.querySelectorAll('.grid-question-number').forEach(el => {
            el.classList.remove('grid-current');
        });
        const currentQuestionElement = questionGridContainer.querySelector(`[onclick*="goToQuestion(${this.currentQuestionIndex})"]`);
        if (currentQuestionElement) currentQuestionElement.classList.add('grid-current');
    }
    
    updateMiniDots() {
        const miniDotsContainer = document.getElementById('miniDotsContainer');
        if (!miniDotsContainer) return;
        const totalQuestions = this.currentCourseQuestions.length;
        miniDotsContainer.innerHTML = this.generateMiniDots(totalQuestions);
    }
    
    generateMiniDots(totalQuestions) {
        let dotsHtml = '';
        const maxDots = 5;
        let start = Math.max(0, this.currentQuestionIndex - 2);
        let end = Math.min(totalQuestions - 1, start + maxDots - 1);
        if (end - start < maxDots - 1) start = Math.max(0, end - maxDots + 1);
        
        if (start > 0) dotsHtml += '<span class="mini-dot-ellipsis">...</span>';
        
        for (let i = start; i <= end; i++) {
            let dotClass = 'mini-dot';
            if (i === this.currentQuestionIndex) dotClass += ' mini-dot-active';
            
            const question = this.currentCourseQuestions[i];
            const savedAnswer = this.userTestAnswers[question.id];
            
            if (savedAnswer) {
                if (savedAnswer.answered) {
                    dotClass += savedAnswer.correct ? ' mini-dot-correct' : ' mini-dot-incorrect';
                } else if (savedAnswer.marked) {
                    dotClass += ' mini-dot-marked';
                }
            } else {
                const sessionAnswer = this.userTestAnswers[i];
                if (sessionAnswer) {
                    if (sessionAnswer.answered) {
                        dotClass += sessionAnswer.correct ? ' mini-dot-correct' : ' mini-dot-incorrect';
                    } else if (sessionAnswer.marked) {
                        dotClass += ' mini-dot-marked';
                    }
                }
            }
            
            dotsHtml += `<span class="${dotClass}" onclick="window.goToQuestion(${i})">${i + 1}</span>`;
        }
        
        if (end < totalQuestions - 1) dotsHtml += '<span class="mini-dot-ellipsis">...</span>';
        return dotsHtml;
    }
    
    scrollQuestions(direction) {
        const gridContainer = document.getElementById('questionGridContainer');
        if (!gridContainer) return;
        const scrollAmount = 300;
        const currentScroll = gridContainer.scrollLeft;
        if (direction === 'left') gridContainer.scrollLeft = currentScroll - scrollAmount;
        else gridContainer.scrollLeft = currentScroll + scrollAmount;
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
                <div class="loading-content">
                    <div class="spinner-container">
                        <div class="spinner"></div>
                        <div class="spinner-ring"></div>
                    </div>
                    <div class="loading-text">Loading question bank...</div>
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
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Failed to Load Question Bank</h3>
                    <p>${message}</p>
                    <div class="mt-2">
                        <button onclick="window.loadQuestionBankCards()" class="btn btn-primary mr-2">
                            <i class="fas fa-redo"></i> Try Again
                        </button>
                        <button onclick="window.clearQuestionBankSearch()" class="btn btn-secondary">
                            <i class="fas fa-times"></i> Clear Search
                        </button>
                    </div>
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

window.goToQuestion = function(index) { 
    if (window.nurseiqModule) window.nurseiqModule.goToQuestion(index); 
};

window.jumpToQuestion = function() { 
    if (window.nurseiqModule) window.nurseiqModule.jumpToQuestion(); 
};

window.checkAnswer = function() { 
    if (window.nurseiqModule) window.nurseiqModule.checkAnswer(); 
};

window.resetQuestion = function() { 
    if (window.nurseiqModule) window.nurseiqModule.resetQuestion(); 
};

window.showAnswer = function() { 
    if (window.nurseiqModule) window.nurseiqModule.showAnswer(); 
};

window.hideAnswer = function() { 
    if (window.nurseiqModule) window.nurseiqModule.hideAnswer(); 
};

window.markForReview = function() { 
    if (window.nurseiqModule) window.nurseiqModule.markForReview(); 
};

window.finishPractice = function() { 
    if (window.nurseiqModule) window.nurseiqModule.finishPractice(); 
};

window.scrollQuestions = function(direction) { 
    if (window.nurseiqModule) window.nurseiqModule.scrollQuestions(direction); 
};

window.clearAllProgress = function() { 
    if (window.nurseiqModule) window.nurseiqModule.clearAllProgress(); 
};

window.getNurseIQDashboardMetrics = function() {
    if (window.nurseiqModule) {
        return window.nurseiqModule.getNurseIQDashboardMetrics();
    }
    return NurseIQModule.getDashboardMetrics();
};

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => window.initNurseIQ().catch(console.error), 1000);
    });
} else {
    setTimeout(() => window.initNurseIQ().catch(console.error), 1000);
}

console.log('✅ NurseIQ module loaded - Complete with TVET detection and active test tracking!');
