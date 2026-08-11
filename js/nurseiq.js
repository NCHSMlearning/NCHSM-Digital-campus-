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
        
        const container = document.getElementById('toast-container');
        if (container) {
            const toast = document.createElement('div');
            toast.style.cssText = `
                background: ${colors[type] || '#4C1D95'};
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                max-width: 400px;
                animation: slideInRight 0.3s ease;
                font-size: 14px;
                margin-bottom: 8px;
                z-index: 9999;
            `;
            toast.textContent = message;
            container.appendChild(toast);
            setTimeout(() => toast.remove(), 4000);
        } else {
            console.log(`[${type}] ${message}`);
        }
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
                    // Merge: database takes priority
                    this.userTestAnswers = { ...this.userTestAnswers, ...dbAnswers };
                    console.log('📊 Loaded from database, total:', Object.keys(this.userTestAnswers).length);
                    // Save merged data back to localStorage
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
        
        const points = correctAnswers * 2;
        
        const progressData = {
            version: this.progressVersion,
            answers: this.userTestAnswers,
            lastSaved: new Date().toISOString(),
            stats: {
                totalAnswered,
                correctAnswers,
                points,
                accuracy: totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0
            }
        };
        
        // 1. Save to user_progress
        const { error: progressError } = await supabase
            .from('user_progress')
            .upsert({
                user_id: this.userId,
                progress_data: progressData,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });
        
        if (progressError) {
            console.error('❌ Error saving to user_progress:', progressError);
        } else {
            console.log('✅ Saved to user_progress');
        }
        
        // 2. Save/Update nurseiq_attempts - FIXED: Check if record exists first
        if (totalAnswered > 0) {
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
                const totalPoints = (profile.login_count || 0) * 10 + 
                                   (profile.gamification_points || 0) + 
                                   (profile.attendance_points || 0) + 
                                   points;
                
                const { error: profileError } = await supabase
                    .from('consolidated_user_profiles_table')
                    .update({
                        nurseiq_points: points,
                        total_points: totalPoints,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', this.userId);
                
                if (profileError) {
                    console.error('❌ Error updating profile:', profileError);
                } else {
                    console.log(`✅ Profile updated: NurseIQ=${points}, Total=${totalPoints}`);
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
        
        const points = totalCorrect * 2;
        
        return {
            answered: totalAnswered,
            correct: totalCorrect,
            points: points,
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
        
        console.log('📊 NurseIQ Stats:', stats);
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
    // 📄 DISPLAY INTERACTIVE QUESTIONS
    // ============================================================
    displayInteractiveQuestions(courseName, questions) {
        if (!this.studentQuestionBankContent) return;
        
        const courseColor = questions[0]?.courses?.color || '#4f46e5';
        const userStats = this.getCourseUserStats(this.currentCourseForTest.id, questions);
        
        let html = `
            <div class="interactive-questions-container">
                <div style="background: #f8fafc; border-bottom: 2px solid ${courseColor}; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
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
                        <div id="optionsContainer" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;"></div>
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
        setTimeout(() => this.loadCurrentQuestion(), 50);
    }
    
    // ============================================================
    // 📥 LOAD CURRENT QUESTION - FIXED with already answered
    // ============================================================
    loadCurrentQuestion() {
        const question = this.currentCourseQuestions[this.currentQuestionIndex];
        if (!question) return;
        
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
        
        this.showNotification(isCorrect ? '✅ Correct! Well done!' : '❌ Incorrect. Review the explanation.', isCorrect ? 'success' : 'error');
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
            this.loadQuestionBankCards();
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
    // 🚀 INITIALIZE
    // ============================================================
    async initialize() {
        console.log('🚀 Initializing NurseIQ Module...');
        
        this.cacheElements();
        this.updateUIForProgram();
        await this.loadUserProgress();
        await this.loadQuestionBankCards();
        
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
window.prevQuestion = function() {
    if (nurseiqModule) nurseiqModule.prevQuestion();
};
window.nextQuestion = function() {
    if (nurseiqModule) nurseiqModule.nextQuestion();
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
console.log('💰 Points: 2 per correct answer!');
console.log('💾 Saves progress to user_progress, nurseiq_attempts, and profile!');
