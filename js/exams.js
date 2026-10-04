(function() {
    'use strict';
     
    console.log('✅ exams.js - COMPLETE FIXED VERSION WITH RETAKE SUPPORT');
    // Keep grade + release status together in the Grade cell for CATs and Final Exams.
    if (!document.getElementById('nchsm-exam-grade-status-style')) {
        const style = document.createElement('style');
        style.id = 'nchsm-exam-grade-status-style';
        style.textContent = '.grade-status-stack{display:flex;flex-direction:column;align-items:center;gap:3px}.grade-release-label{font-size:8px;font-weight:800;color:#15803d;white-space:nowrap}.grade-release-label i{font-size:8px;margin-right:2px}';
        document.head.appendChild(style);
    }

    
    // ============================================
    // 🕐 KENYA TIMEZONE HELPERS
    // ============================================

    function getKenyaNow() {
        const now = new Date();
        return new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
    }

    function formatKenyaDate(date) {
        if (!date) return 'N/A';
        const d = new Date(date);
        return d.toLocaleDateString('en-US', {
            timeZone: 'Africa/Nairobi',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    function formatKenyaTime(date) {
        if (!date) return 'N/A';
        const d = new Date(date);
        return d.toLocaleTimeString('en-US', {
            timeZone: 'Africa/Nairobi',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }

    function formatKenyaDateTime(date) {
        if (!date) return 'N/A';
        const d = new Date(date);
        return d.toLocaleString('en-US', {
            timeZone: 'Africa/Nairobi',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }

    // ============================================
    // 🎓 UNIFIED GRADING — NURSING + TVET
    // ============================================
    function getNursingGrade(score) {
        const value = Number(score);
        if (!Number.isFinite(value)) return { grade: '', rating: 'Not Graded', points: 0.0 };
        if (value >= 85) return { grade: 'A', rating: 'Distinction', points: 4.0 };
        if (value >= 75) return { grade: 'B', rating: 'Credit', points: 3.0 };
        if (value >= 60) return { grade: 'C', rating: 'Pass', points: 2.0 };
        return { grade: 'D', rating: 'Fail', points: 0.0 };
    }

    function getTVETGrade(score) {
        const value = Number(score);
        if (!Number.isFinite(value) || value <= 0) return { grade: 'E', rating: 'NOT YET COMPETENT', points: 0.0 };
        if (value >= 80) return { grade: 'A', rating: 'MASTERY', points: 4.0 };
        if (value >= 65) return { grade: 'B', rating: 'PROFICIENT', points: 3.0 };
        if (value >= 50) return { grade: 'C', rating: 'COMPETENT', points: 2.0 };
        return { grade: 'E', rating: 'NOT YET COMPETENT', points: 0.0 };
    }

    function getAssessmentGrade(score, isTVET) {
        return isTVET ? getTVETGrade(score) : getNursingGrade(score);
    }

    // ============================================
    // 📦 MAIN CLASS
    // ============================================
    class ExamsModule {
        constructor() {
            console.log('🔧 ExamsModule initialized');
            
            // TVET program codes
            this.TVET_PROGRAMS = [
                'DPOTT', 'DCH', 'DHRIT', 'DSL', 'DSW', 'DCJS', 'DHSS', 'DICT', 'DME',
                'CPOTT', 'CCH', 'CHRIT', 'CPC', 'CSL', 'CSW', 'CCJS', 'CAG', 'CHSS', 'CICT',
                'ACH', 'AAG', 'ASW', 'CCA', 'PTE'
            ];
            
            // Store exam data
            this.allExams = [];
            this.currentExams = [];
            this.completedExams = [];
            this.currentFilter = 'all';
            this.releasedResults = new Set();
            this.countdownInterval = null;
            
            // User profile
            this.userProfile = {};
            this.program = 'KRCHN';
            this.programCode = 'KRCHN';
            this.programName = 'KRCHN Nursing';
            this.programType = 'KRCHN';
            this.programLevel = 'KRCHN';
            this.intakeYear = 2025;
            this.userBlock = 'A';
            this.userTerm = 'Term1';
            this.userId = null;
            this.isTVETStudent = false;
            
            // Chart state
            this.currentChartView = 'both';
            
            // Cache DOM elements
            this.cacheElements();
            
            // Initialize
            this.initializeEventListeners();
            this.updateFilterButtons();
            this.initializeUserData();
            this.setupAutoRefresh();
            this.startCountdownTimer();
        }
        
        // ============================================
        // ⏱️ COUNTDOWN TIMER
        // ============================================
        startCountdownTimer() {
            if (this.countdownInterval) clearInterval(this.countdownInterval);
            
            this.countdownInterval = setInterval(() => {
                if (this.currentExams && this.currentExams.length > 0) {
                    this.updateAllCountdowns();
                }
            }, 1000);
            
            console.log('✅ Countdown timer started');
        }
        
        updateAllCountdowns() {
            const kenyaNow = getKenyaNow();
            
            this.currentExams.forEach(exam => {
                if (exam.actionState === 'available' && exam.examStartDateTime && exam.examEndDateTime) {
                    if (kenyaNow >= exam.examStartDateTime && kenyaNow <= exam.examEndDateTime) {
                        const timeLeftMs = exam.examEndDateTime - kenyaNow;
                        const hours = Math.floor(timeLeftMs / (1000 * 60 * 60));
                        const minutes = Math.floor((timeLeftMs % (1000 * 60 * 60)) / (1000 * 60));
                        const seconds = Math.floor((timeLeftMs % (1000 * 60)) / 1000);
                        
                        const rowElement = document.querySelector(`tr[data-exam-id="${exam.id}"]`);
                        if (rowElement) {
                            const timerElement = rowElement.querySelector('.exam-timer');
                            if (timerElement) {
                                timerElement.innerHTML = `
                                    <span class="timer-display">
                                        <i class="fas fa-hourglass-half"></i>
                                        ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}
                                    </span>
                                `;
                            }
                        }
                    }
                }
            });
        }
        
        // ============================================
        // 📋 CACHE DOM ELEMENTS
        // ============================================
        cacheElements() {
            this.currentTable = document.getElementById('current-assessments-table');
            this.completedTable = document.getElementById('completed-assessments-table');
            this.currentEmpty = document.getElementById('current-empty');
            this.completedEmpty = document.getElementById('completed-empty');
            this.currentCount = document.getElementById('current-count');
            this.completedCount = document.getElementById('completed-count');
            this.completedAverage = document.getElementById('completed-average');
            this.currentHeaderCount = document.getElementById('current-assessments-count');
            this.completedHeaderCount = document.getElementById('completed-assessments-count');
            this.overallAverage = document.getElementById('overall-average');
            this.programIndicator = document.getElementById('program-indicator');
        }
        
        // ============================================
        // 👤 USER DATA
        // ============================================
        initializeUserData() {
            console.log('👤 Initializing user data for exams...');
            this.updateUserData();
            
            if (!this.userId) {
                console.log('⏳ User data not ready, waiting...');
                document.addEventListener('userDataLoaded', () => {
                    this.updateUserData();
                    this.loadExams();
                });
                document.addEventListener('appReady', () => {
                    this.updateUserData();
                    this.loadExams();
                });
                
                const userCheckInterval = setInterval(() => {
                    if (window.db?.currentUserId) {
                        this.updateUserData();
                        this.loadExams();
                        clearInterval(userCheckInterval);
                    }
                }, 1000);
                
                setTimeout(() => {
                    if (!this.userId) {
                        console.log('⚠️ Using default user data (timeout)');
                        this.loadExams();
                    }
                }, 3000);
            } else {
                this.loadExams();
            }
        }
        
        determineProgramType(programCode) {
            if (!programCode) return { type: 'KRCHN', level: 'KRCHN' };
            const code = String(programCode).toUpperCase().trim();
            
            if (this.TVET_PROGRAMS.includes(code)) {
                let level = 'CERTIFICATE';
                if (code.startsWith('D')) level = 'DIPLOMA';
                if (code.startsWith('A')) level = 'ARTISAN';
                if (code === 'CCA' || code === 'PTE') level = 'OTHER';
                return { type: 'TVET', level: level, code: code };
            }
            
            if (code === 'KRCHN') {
                return { type: 'KRCHN', level: 'KRCHN', code: 'KRCHN' };
            }
            
            return { type: 'KRCHN', level: 'KRCHN', code: 'KRCHN' };
        }
        
        updateUserData() {
            if (window.db?.currentUserProfile) {
                this.userProfile = window.db.currentUserProfile;
                const programFromProfile = this.userProfile.program || this.userProfile.course || 'KRCHN';
                this.intakeYear = this.userProfile.intake_year || 2025;
                this.userId = window.db.currentUserId;
                
                const programInfo = this.determineProgramType(programFromProfile);
                this.programCode = programInfo.code;
                this.programType = programInfo.type;
                this.programLevel = programInfo.level;
                this.isTVETStudent = (this.programType === 'TVET');
                this.programName = this.getProgramDisplayName(programFromProfile);
                
                if (this.isTVETStudent) {
                    this.userTerm = this.userProfile.term || this.userProfile.block || 'Year 1 Term 1';
                    this.userBlock = null;
                } else {
                    this.userBlock = this.userProfile.block || 'Introductory';
                    this.userTerm = null;
                }
                
                console.log('✅ User data updated:', {
                    userId: this.userId,
                    programType: this.programType,
                    programCode: this.programCode,
                    isTVET: this.isTVETStudent,
                    userBlock: this.userBlock,
                    userTerm: this.userTerm,
                    intakeYear: this.intakeYear
                });
                
                this.updateProgramIndicator();
                return true;
            }
            return false;
        }
        
        getProgramDisplayName(programCode) {
            const code = String(programCode).toUpperCase().trim();
            const programNames = {
                'KRCHN': 'KRCHN Nursing',
                'DPOTT': 'Diploma in Perioperative Theatre Technology',
                'DCH': 'Diploma in Community Health',
                'CPOTT': 'Certificate in Perioperative Theatre Technology',
                'CCH': 'Certificate in Community Health',
            };
            return programNames[code] || programCode;
        }
        
        updateProgramIndicator() {
            if (this.programIndicator) {
                const badgeClass = this.isTVETStudent ? 'badge-tvet' : 'badge-krchn';
                const icon = this.isTVETStudent ? 'fa-tools' : 'fa-graduation-cap';
                const blockTermText = this.isTVETStudent ? `Term: ${this.userTerm}` : `Block: ${this.userBlock}`;
                
                this.programIndicator.innerHTML = `
                    <span class="badge ${badgeClass}">
                        <i class="fas ${icon}"></i>
                        ${this.escapeHtml(this.programName)}
                        <span class="ms-2">${blockTermText}</span>
                    </span>
                `;
            }
        }
        
        setupAutoRefresh() {
            const returningFromExam = sessionStorage.getItem('returningFromExam');
            if (returningFromExam === 'true') {
                console.log('🔄 Returning from exam portal - refreshing data...');
                setTimeout(() => this.loadExams(), 2000);
                sessionStorage.removeItem('returningFromExam');
            }
            
            window.addEventListener('focus', () => {
                setTimeout(() => this.loadExams(), 1000);
            });
        }
        
        // ============================================
        // 🎛️ EVENT LISTENERS
        // ============================================
        initializeEventListeners() {
            const filterButtons = [
                { id: 'view-all-assessments', filter: 'all' },
                { id: 'view-current-only', filter: 'current' },
                { id: 'view-completed-only', filter: 'completed' }
            ];
            
            filterButtons.forEach(({ id, filter }) => {
                const button = document.getElementById(id);
                if (button) {
                    button.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.applyFilter(filter);
                    });
                }
            });
            
            const refreshBtn = document.getElementById('refresh-assessments');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.loadExams();
                });
            }
            
            const transcriptBtn = document.getElementById('view-transcript');
            if (transcriptBtn) {
                transcriptBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showProfessionalTranscript();
                });
            }
        }
        
        applyFilter(filterType) {
            this.currentFilter = filterType;
            this.updateFilterButtons();
            this.showFilteredSections();
            this.applyDataFilter();
        }
        
        updateFilterButtons() {
            const buttons = {
                'all': document.getElementById('view-all-assessments'),
                'current': document.getElementById('view-current-only'),
                'completed': document.getElementById('view-completed-only')
            };
            Object.values(buttons).forEach(button => {
                if (button) button.classList.remove('active');
            });
            const currentButton = buttons[this.currentFilter];
            if (currentButton) currentButton.classList.add('active');

            document.querySelectorAll('#cats .assessment-nav button[data-filter]').forEach(button => {
                button.classList.toggle('active', button.dataset.filter === this.currentFilter);
            });
        }
        
        showFilteredSections() {
            const currentSection = document.querySelector('.current-section');
            const completedSection = document.querySelector('.completed-section');
            
            if (!currentSection || !completedSection) return;
            
            switch(this.currentFilter) {
                case 'current':
                    currentSection.style.display = 'block';
                    completedSection.style.display = 'none';
                    break;
                case 'completed':
                    currentSection.style.display = 'none';
                    completedSection.style.display = 'block';
                    break;
                default:
                    currentSection.style.display = 'block';
                    completedSection.style.display = 'block';
            }
        }
        
       // ============================================
// 🔧 FIXED: applyDataFilter - Moves reset exams to Current
// ============================================
applyDataFilter() {
    const kenyaNow = getKenyaNow();
    
    this.allExams = this.allExams.map(exam => {
        // ✅ FIRST: Check if exam is reset for retake
        if (exam.isResetForRetake && exam.retakeUnlocked) {
            exam.isCompleted = false;
            exam.actionState = 'available';
            exam.canTakeExam = true;
            exam.buttonText = '▶ Continue Exam';
            exam.gradeText = 'Retake Available';
            exam.gradeClass = 'retake';
            return exam;
        }
        
        // Exam expired and no grade = Missed
        if (exam.examEndDateTime && kenyaNow > exam.examEndDateTime && !exam.hasGrade) {
            exam.isCompleted = true;
            exam.actionState = 'expired';
            exam.gradeText = 'Missed';
            exam.gradeClass = 'missed';
            exam.buttonText = 'Missed';
        }
        // Exam has grade = Completed
        else if (exam.hasGrade) {
            exam.isCompleted = true;
            if (exam.isReleased) {
                exam.actionState = 'completed';
                exam.gradeText = exam.gradeText || 'Completed';
                exam.buttonText = 'View Results';
            } else {
                exam.actionState = 'pending_release';
                exam.gradeText = 'Pending Release';
                exam.gradeClass = 'pending';
                exam.buttonText = 'Pending';
            }
            exam.canTakeExam = false;
        }
        // Upcoming exam
        else if (exam.examStartDateTime && kenyaNow < exam.examStartDateTime) {
            exam.isCompleted = false;
            exam.actionState = 'upcoming';
        }
        // Available exam
        else if (exam.examStartDateTime && kenyaNow >= exam.examStartDateTime && kenyaNow <= exam.examEndDateTime) {
            exam.isCompleted = false;
            exam.actionState = 'available';
        }
        return exam;
    });
    
    // ✅ FIX: Reset exams go to Current, NOT Completed
    this.currentExams = this.allExams.filter(exam => 
        // Normal current exams
        (!exam.isCompleted && exam.actionState !== 'expired' && exam.actionState !== 'pending_release') ||
        // ✅ Include reset exams
        (exam.isResetForRetake && exam.retakeUnlocked)
    );
    
    // ✅ FIX: Remove reset exams from Completed
    this.completedExams = this.allExams.filter(exam => 
        (exam.hasGrade === true || 
         exam.isCompleted === true || 
         exam.actionState === 'expired' || 
         exam.actionState === 'pending_release' ||
         exam.actionState === 'completed') &&
        // ✅ Exclude reset exams
        !(exam.isResetForRetake && exam.retakeUnlocked)
    );
    
    if (this.currentFilter === 'current') {
        this.completedExams = [];
    } else if (this.currentFilter === 'completed') {
        this.currentExams = [];
    }
    
    this.displayTables();
    this.updateCounts();
    this.updatePerformanceSummary();
    this.initPerformanceChart();
}
        // ============================================
        // 📥 LOAD EXAMS
        // ============================================
        async loadExams() {
            console.log('📥 Loading exams...');
            this.showLoading();
            
            try {
                if (!this.userId && !this.updateUserData()) {
                    setTimeout(() => this.loadExams(), 1000);
                    return;
                }
                
                if (!window.db?.supabase) {
                    throw new Error('Database connection not available');
                }
                
                const supabase = window.db.supabase;
                
                console.log('🎯 Loading exams for:', { 
                    programCode: this.programCode,
                    programType: this.programType,
                    intakeYear: this.intakeYear,
                    userId: this.userId,
                    isTVET: this.isTVETStudent,
                    block: this.userBlock,
                    term: this.userTerm
                });
                
                const { data, error } = await supabase.rpc('get_student_exams', {
                    p_user_id: this.userId
                });
                
                if (error) {
                    console.warn('⚠️ RPC failed, falling back to individual calls...');
                    await this.loadExamsFallback();
                    return;
                }
                
                console.log(`📊 Loaded ${data?.exams?.length || 0} exams from RPC`);
                console.log(`📊 Loaded ${data?.grades?.length || 0} grades from RPC`);
                
                const exams = data.exams || [];
                const grades = data.grades || [];
                
                this.releasedResults.clear();
                if (data.released && data.released.length > 0) {
                    this.releasedResults = new Set(data.released.map(r => String(r)));
                    console.log(`✅ Loaded ${this.releasedResults.size} released results`);
                }
                
                this.processExamsData(exams, grades);
                this.applyDataFilter();
                
                console.log(`✅ Processed ${this.allExams.length} exams: ${this.currentExams.length} current, ${this.completedExams.length} completed`);
                
                this.dispatchDashboardEvent();
                this.hideLoading();
                
            } catch (error) {
                console.error('❌ Error loading exams:', error);
                try {
                    await this.loadExamsFallback();
                } catch (fallbackError) {
                    console.error('❌ Fallback also failed:', fallbackError);
                    this.showError(error.message);
                }
            }
        }
        
        async loadExamsFallback() {
            console.log('📥 Loading exams using fallback...');
            
            try {
                if (!window.db?.supabase) throw new Error('Database connection not available');
                const supabase = window.db.supabase;
                
                const [examsResult, gradesResult, releasedResult] = await Promise.all([
                    supabase
                        .from('exams')
                        .select('*, course:course_id(course_name)')
                        .eq('intake_year', this.intakeYear)
                        .eq('program_type', this.programType)
                        .order('exam_date', { ascending: true }),
                    
                    supabase
                        .from('exam_grades')
                        .select('*')
                        .eq('student_id', this.userId)
                        .eq('question_id', '00000000-0000-0000-0000-000000000000'),
                    
                    supabase
                        .from('released_exam_results')
                        .select('result_id')
                ]);
                
                const { data: exams, error: examsError } = examsResult;
                if (examsError) throw examsError;
                
                console.log(`📊 Found ${exams?.length || 0} exams from fallback`);
                
                const grades = gradesResult.data || [];
                console.log(`📊 Found ${grades.length} grade records`);
                
                this.releasedResults.clear();
                if (releasedResult.data && releasedResult.data.length > 0) {
                    this.releasedResults = new Set(releasedResult.data.map(r => String(r.result_id)));
                    console.log(`✅ Loaded ${this.releasedResults.size} released results`);
                }
                
                this.processExamsData(exams || [], grades);
                this.applyDataFilter();
                console.log('✅ Exams loaded via fallback');
                this.dispatchDashboardEvent();
                this.hideLoading();
                
            } catch (error) {
                console.error('❌ Fallback error:', error);
                this.showError(error.message);
                throw error;
            }
        }
        
        // ============================================
        // 🔧 PROCESS EXAMS DATA - WITH RETAKE SUPPORT
        // ============================================
        processExamsData(exams, grades) {
            const blockMap = {
                'Introductory': 'Introductory Block',
                'Introductory Block': 'Introductory Block',
                'Block 1': 'Block 1',
                'Block 1A': 'Block 1',
                'Block 1B': 'Block 1',
                'Block 2': 'Block 2',
                'Block 2A': 'Block 2',
                'Block 2B': 'Block 2',
                'Block 3': 'Block 3',
                'Block 3A': 'Block 3',
                'Block 3B': 'Block 3',
                'Block 4': 'Block 4',
                'Block 4A': 'Block 4',
                'Block 4B': 'Block 4',
                'Block 5': 'Block 5',
                'Final': 'Final Block',
                'Final Block': 'Final Block',
                'Year 1 Term 1': 'Year 1 Term 1',
                'Y1T1': 'Year 1 Term 1',
                'Year1Term1': 'Year 1 Term 1',
                'Year 1 Term 2': 'Year 1 Term 2',
                'Y1T2': 'Year 1 Term 2',
                'Year1Term2': 'Year 1 Term 2',
                'Year 1 Term 3': 'Year 1 Term 3',
                'Y1T3': 'Year 1 Term 3',
                'Year1Term3': 'Year 1 Term 3',
                'Year 2 Term 1': 'Year 2 Term 1',
                'Y2T1': 'Year 2 Term 1',
                'Year2Term1': 'Year 2 Term 1',
                'Year 2 Term 2': 'Year 2 Term 2',
                'Y2T2': 'Year 2 Term 2',
                'Year2Term2': 'Year 2 Term 2',
                'Year 2 Term 3': 'Year 2 Term 3',
                'Y2T3': 'Year 2 Term 3',
                'Year2Term3': 'Year 2 Term 3',
                'Year 3 Term 1': 'Year 3 Term 1',
                'Y3T1': 'Year 3 Term 1',
                'Year3Term1': 'Year 3 Term 1',
                'Year 3 Term 2': 'Year 3 Term 2',
                'Y3T2': 'Year 3 Term 2',
                'Year3Term2': 'Year 3 Term 2',
                'Year 3 Term 3': 'Year 3 Term 3',
                'Y3T3': 'Year 3 Term 3',
                'Year3Term3': 'Year 3 Term 3',
                'General': 'General',
                'All': 'All'
            };
            
            let rawBlockOrTerm = this.userBlock || this.userTerm || this.userProfile?.block || 
                                 this.userProfile?.current_block || this.userProfile?.term || 'General';
            
            const isTVET = this.isTVETStudent || this.TVET_PROGRAMS.includes(this.programCode) ||
                           this.TVET_PROGRAMS.includes(this.programType);
            
            let studentBlockOrTerm = blockMap[rawBlockOrTerm] || rawBlockOrTerm;
            const studentIntake = this.intakeYear || this.userProfile?.intake_year || 2026;
            const studentProgram = this.programType || this.userProfile?.program || 'KRCHN';
            
            console.log(`🎯 Student: Type=${isTVET ? 'TVET' : 'KRCHN'}, Block/Term=${studentBlockOrTerm}, Intake=${studentIntake}`);
            
            const tvetPrograms = [
                'DPOTT', 'DCH', 'DHRIT', 'DSL', 'DSW', 'DCJS', 'DHSS', 'DICT', 'DME',
                'CPOTT', 'CCH', 'CHRIT', 'CPC', 'CSL', 'CSW', 'CCJS', 'CAG', 'CHSS', 'CICT',
                'ACH', 'AAG', 'ASW', 'CCA', 'PTE', 'TVET'
            ];
            
            // ============================================================
            // 🔄 RESET/CONTINUATION-AWARE GRADE SELECTION
            // ============================================================
            // Multiple sentinel grade rows can exist for one exam. Prefer an
            // active Admin reset authorization, then the newest record.
            const gradeMap = new Map();

            const isActiveContinuation = (grade) =>
                String(grade?.result_status || '').toUpperCase() === 'RESET_FOR_RETAKE' &&
                grade?.retake_unlocked === true &&
                grade?.allow_retake === true;

            const gradeTime = (grade) => {
                const updated = grade?.updated_at ? new Date(grade.updated_at).getTime() : 0;
                const created = grade?.created_at ? new Date(grade.created_at).getTime() : 0;
                return Math.max(
                    Number.isFinite(updated) ? updated : 0,
                    Number.isFinite(created) ? created : 0
                );
            };

            grades.forEach(grade => {
                const gradeWithId = {
                    ...grade,
                    id: grade.id || grade._id || grade.grade_id || null
                };

                const key = String(grade.exam_id);
                const existing = gradeMap.get(key);

                if (!existing) {
                    gradeMap.set(key, gradeWithId);
                    return;
                }

                const newContinuation = isActiveContinuation(gradeWithId);
                const oldContinuation = isActiveContinuation(existing);

                if (
                    (newContinuation && !oldContinuation) ||
                    (newContinuation === oldContinuation &&
                     gradeTime(gradeWithId) >= gradeTime(existing))
                ) {
                    gradeMap.set(key, gradeWithId);
                }
            });
            
            const filteredExams = exams.filter(exam => {
                const rawExamBlock = exam.block || exam.block_term || exam.term || 'General';
                const examBlockOrTerm = blockMap[rawExamBlock] || rawExamBlock;
                const examIntake = exam.intake_year;
                const examProgram = exam.program_type || exam.target_program;
                
                const hasGrade = gradeMap.has(String(exam.id));
                const intakeMatch = examIntake == studentIntake;
                
                let blockTermMatch = false;
                
                if (examBlockOrTerm === 'General' || examBlockOrTerm === 'All' || studentBlockOrTerm === 'General') {
                    blockTermMatch = true;
                } else if (examBlockOrTerm === studentBlockOrTerm) {
                    blockTermMatch = true;
                } else if (isTVET) {
                    const examYearMatch = examBlockOrTerm.match(/Year\s*(\d+)/i);
                    const studentYearMatch = studentBlockOrTerm.match(/Year\s*(\d+)/i);
                    const examTermMatch = examBlockOrTerm.match(/Term\s*(\d+)/i);
                    const studentTermMatch = studentBlockOrTerm.match(/Term\s*(\d+)/i);
                    
                    if (examYearMatch && studentYearMatch && examYearMatch[1] === studentYearMatch[1]) {
                        if (examTermMatch && studentTermMatch && examTermMatch[1] === studentTermMatch[1]) {
                            blockTermMatch = true;
                        } else if (!examTermMatch && !studentTermMatch) {
                            blockTermMatch = true;
                        }
                    }
                } else {
                    const examNum = examBlockOrTerm.match(/\d+/);
                    const studentNum = studentBlockOrTerm.match(/\d+/);
                    if (examNum && studentNum && examNum[0] === studentNum[0]) {
                        blockTermMatch = true;
                    } else if (examBlockOrTerm.includes(studentBlockOrTerm) || studentBlockOrTerm.includes(examBlockOrTerm)) {
                        blockTermMatch = true;
                    }
                }
                
                let programMatch = false;
                if (isTVET) {
                    programMatch = tvetPrograms.includes(examProgram) || 
                                   examProgram === studentProgram ||
                                   studentProgram === examProgram ||
                                   examProgram === 'TVET';
                } else {
                    programMatch = examProgram === 'KRCHN' || 
                                   examProgram === studentProgram ||
                                   studentProgram === examProgram ||
                                   !examProgram;
                }
                
                let shouldShow = false;
                
                if (intakeMatch) {
                    if (blockTermMatch && programMatch) {
                        shouldShow = true;
                    } else if (hasGrade) {
                        shouldShow = true;
                    }
                } else if (hasGrade) {
                    shouldShow = true;
                }
                
                return shouldShow;
            });
            
            console.log(`📊 After filtering: ${filteredExams.length} of ${exams.length} exams kept`);
            exams = filteredExams;
            
            const kenyaNow = getKenyaNow();
            const examGroups = new Map();
            
            exams.forEach(exam => {
                const groupKey = `${exam.exam_name || exam.title || 'Untitled'}_${exam.intake_year}`;
                const examType = (exam.exam_type || '').toUpperCase();
                const isCatExam = examType.includes('CAT');
                let marksOutOf = isCatExam ? 30 : (exam.marks_out_of || exam.total_marks || 100);
                if (exam.total_marks) marksOutOf = exam.total_marks;
                
                if (!examGroups.has(groupKey)) {
                    examGroups.set(groupKey, {
                        id: exam.id,
                        exam_name: exam.exam_name || exam.title || 'Untitled Exam',
                        title: exam.title || exam.exam_name || 'Untitled Exam',
                        exam_type: exam.exam_type,
                        intake_year: exam.intake_year,
                        program_type: exam.program_type,
                        block_term: exam.block_term || exam.term,
                        exam_date: exam.exam_date,
                        exam_start_time: exam.exam_start_time,
                        duration_minutes: exam.duration_minutes || 40,
                        exam_link: exam.exam_link || exam.online_link,
                        course: exam.course_name || exam.course || 'General',
                        marks_out_of: marksOutOf,
                        isCatExam: isCatExam,
                        course_levels: new Set(),
                        blocks: new Set(),
                        programs: new Set(),
                        grade: null,
                        status: exam.status,
                        released: exam.released || false
                    });
                }
                
                const group = examGroups.get(groupKey);
                if (exam.course_name) group.course_levels.add(exam.course_name);
                if (exam.block_term) group.blocks.add(exam.block_term);
                if (exam.term) group.blocks.add(exam.term);
                if (exam.program_type) group.programs.add(exam.program_type === 'TVET' ? 'TVET Program' : 'KRCHN Program');
                
                const grade = gradeMap.get(String(exam.id));
                if (grade) {
                    if (grade.marks !== null || grade.total_score !== null || grade.result_status) {
                        if (!grade.id) {
                            grade.id = grade._id || grade.grade_id || grade.uuid || null;
                        }
                        group.grade = grade;
                    }
                }
            });
            
            this.allExams = Array.from(examGroups.values()).map(group => {
                const grade = group.grade;
                const gradeId = grade?.id || grade?._id || grade?.grade_id || null;
                
                // ============================================
                // 🔧 FIXED: Release detection with RETAKE support
                // ============================================
                let isReleased = false;
                let isPendingRelease = false;
                let hasTaken = false;
                let hasGradeRecord = false;
                let isResetForRetake = false;
                let retakeUnlocked = false;
                
                if (grade) {
                    const gradeStatus = String(grade.result_status || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
                    const marks = grade.marks !== null && grade.marks !== undefined ? parseFloat(grade.marks) : null;
                    const totalScore = grade.total_score !== null && grade.total_score !== undefined ? parseFloat(grade.total_score) : null;
                    
                    // Check if this is a real grade record
                    hasGradeRecord = grade.question_id === '00000000-0000-0000-0000-000000000000';
                    
                    // ✅ CHECK FOR RESET - ALLOW RETAKE
                    if (gradeStatus === 'RESET_FOR_RETAKE' && grade.retake_unlocked === true) {
                        isResetForRetake = true;
                        retakeUnlocked = true;
                        hasTaken = true; // Keep their marks
                        hasGradeRecord = true; // They have a grade
                        isReleased = false; // Not released yet
                        console.log('🔄 Exam is reset for retake:', group.id);
                    } else {
                        // Normal grade processing
                        hasTaken = (
                            (marks !== null && marks >= 0) ||
                            (totalScore !== null && totalScore >= 0) ||
                            ['PASS', 'FAIL', 'RELEASED', 'RESULT_RELEASED', 'COMPLETED'].includes(gradeStatus)
                        );
                    }
                    
                    // Released logic
                    if (['PASS', 'FAIL', 'RELEASED', 'RESULT_RELEASED', 'COMPLETED'].includes(gradeStatus)) {
                        isReleased = true;
                        isPendingRelease = false;
                    } else if (['PENDING_REVIEW', 'PENDING', 'PENDING_RELEASE', 'AWAITING_RELEASE'].includes(gradeStatus)) {
                        isPendingRelease = true;
                        isReleased = false;
                        if (marks !== null && marks > 0) {
                            hasTaken = true;
                        }
                    }
                    
                    // Check released flag
                    if (grade.released === true || grade.released === 'true') {
                        isReleased = true;
                        isPendingRelease = false;
                    }
                    if (grade.released_at) {
                        isReleased = true;
                        isPendingRelease = false;
                    }
                }
                
                // Check if gradeId is in releasedResults
                if (gradeId && this.releasedResults.has(String(gradeId))) {
                    isReleased = true;
                    isPendingRelease = false;
                }
                
                // Check exam status
                if (['RELEASED', 'COMPLETED'].includes(String(group.status || '').trim().toUpperCase())) {
                    if (grade && (grade.marks !== null || grade.total_score !== null)) {
                        isReleased = true;
                        isPendingRelease = false;
                    }
                }
                
                // 🔧 FIX: hasGrade = hasTaken OR hasGradeRecord
                const hasGrade = hasTaken || hasGradeRecord;
                
                const examProgram = group.program_type || '';
                const isExamTVET = this.TVET_PROGRAMS.includes(examProgram) || examProgram === 'TVET';
                
                const combinedProgram = isExamTVET ? 'TVET Program' : 'KRCHN Program';
                const programBadgeClass = isExamTVET ? 'badge-tvet' : 'badge-krchn';
                const programIcon = isExamTVET ? 'fa-tools' : 'fa-graduation-cap';
                
                const combinedCourse = Array.from(group.course_levels).join(' · ') || group.course || 'General';
                const blockTermDisplay = isTVET ? (this.userTerm || group.block_term || 'Year 1 Term 1') : (group.block_term || 'General');
                
                // ============================================
                // 🔧 FIXED: Extract scores
                // ============================================
                let cat1Score = null;
                let cat2Score = null;
                let finalScore = null;
                let totalPercentage = null;
                let marks = null;
                let displayScore = 0;
                
                if (grade) {
                    cat1Score = grade.cat_1_score ?? grade.cat_score ?? grade.cat1 ?? null;
                    cat2Score = grade.cat_2_score ?? grade.cat2 ?? null;
                    finalScore = grade.exam_score ?? grade.final_score ?? grade.final ?? null;
                    
                    // Use total_score FIRST, then marks
                    if (grade.total_score !== null && grade.total_score !== undefined) {
                        marks = parseFloat(grade.total_score);
                    } else if (grade.marks !== null && grade.marks !== undefined) {
                        marks = parseFloat(grade.marks);
                    } else {
                        marks = null;
                    }
                    
                    totalPercentage = grade.percentage ? parseFloat(grade.percentage) : null;
                    
                    // For CAT exams, use marks FIRST
                    if (group.isCatExam) {
                        if (marks !== null && marks > 0) {
                            displayScore = marks;
                        } else {
                            displayScore = cat1Score || cat2Score || 0;
                        }
                        displayScore = Math.min(Math.max(0, displayScore), 30);
                    } else {
                        if (marks !== null && marks > 0) {
                            displayScore = marks;
                        } else {
                            displayScore = totalPercentage || finalScore || 0;
                        }
                        displayScore = Math.min(Math.max(0, displayScore), group.marks_out_of || 100);
                    }
                }
                
                const examType = (group.exam_type || '').toUpperCase();
                const isCatExam = examType.includes('CAT');
                
                let examStartDateTime = null;
                let examEndDateTime = null;
                let formattedExamDateTime = 'TBA';
                let countdownText = '';
                let examStatus = 'upcoming';
                let statusMessage = '';
                let canStart = false;
                let timeRemainingMs = 0;
                let timeToStartMs = 0;
                
                if (group.exam_date) {
                    const [year, month, day] = group.exam_date.split('-');
                    if (group.exam_start_time) {
                        const [hours, minutes, seconds] = group.exam_start_time.split(':');
                        const dateStr = `${year}-${month}-${day}T${hours}:${minutes}:${seconds || '00'}`;
                        examStartDateTime = new Date(dateStr + '+03:00');
                        if (isNaN(examStartDateTime.getTime())) {
                            examStartDateTime = new Date(year, month-1, day, hours, minutes, seconds || 0);
                        }
                    } else {
                        examStartDateTime = new Date(year, month-1, day, 0, 0, 0);
                    }
                    examEndDateTime = new Date(examStartDateTime.getTime() + (group.duration_minutes || 40) * 60000);
                    const dateOptions = { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Africa/Nairobi' };
                    formattedExamDateTime = examStartDateTime.toLocaleDateString('en-US', dateOptions);
                    if (group.exam_start_time) {
                        const timeOptions = { timeZone: 'Africa/Nairobi', hour: '2-digit', minute: '2-digit', hour12: true };
                        const timeString = examStartDateTime.toLocaleTimeString('en-US', timeOptions);
                        formattedExamDateTime += ` at ${timeString}`;
                    }
                }
                
                if (examStartDateTime && examEndDateTime) {
                    if (kenyaNow < examStartDateTime) {
                        examStatus = 'upcoming';
                        timeToStartMs = examStartDateTime - kenyaNow;
                        const hours = Math.floor(timeToStartMs / (1000 * 60 * 60));
                        const minutes = Math.floor((timeToStartMs % (1000 * 60 * 60)) / (1000 * 60));
                        const seconds = Math.floor((timeToStartMs % (1000 * 60)) / 1000);
                        countdownText = `${hours > 0 ? hours + 'h ' : ''}${minutes}m ${seconds}s`;
                        statusMessage = `📅 Starts in ${countdownText}`;
                        canStart = false;
                        timeRemainingMs = 0;
                    } else if (kenyaNow >= examStartDateTime && kenyaNow <= examEndDateTime) {
                        examStatus = 'available';
                        const timeLeftMs = examEndDateTime - kenyaNow;
                        const hours = Math.floor(timeLeftMs / (1000 * 60 * 60));
                        const minutes = Math.floor((timeLeftMs % (1000 * 60 * 60)) / (1000 * 60));
                        const seconds = Math.floor((timeLeftMs % (1000 * 60)) / 1000);
                        statusMessage = `🟢 Available! ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                        canStart = true;
                        timeRemainingMs = timeLeftMs;
                        timeToStartMs = 0;
                    } else if (kenyaNow > examEndDateTime) {
                        examStatus = 'expired';
                        statusMessage = '🔒 Exam Closed';
                        canStart = false;
                        timeRemainingMs = 0;
                        timeToStartMs = 0;
                    }
                }
                
                const hasValidLink = group.exam_link && group.exam_link.trim() !== '' && 
                                    (group.exam_link.startsWith('http') || group.exam_link.includes('docs.google.com'));
                
                let finalStatus = examStatus;
                let finalCanStart = false;
                let finalMessage = statusMessage;
                let buttonText = '';
                let isCompleted = false;
                let gradeText = 'Not Started';
                let gradeClass = 'pending';
                let totalMarks = group.marks_out_of || 100;
                
                let displayPercentage = null;
                
                // Calculate percentage correctly
                if (isReleased && hasTaken && displayScore > 0) {
                    const calcPercentage = totalMarks > 0 ? (displayScore / totalMarks) * 100 : 0;
                    displayPercentage = Math.round(calcPercentage);
                } else if (hasTaken && totalPercentage !== null) {
                    displayPercentage = Math.round(totalPercentage);
                } else if (hasTaken && marks !== null) {
                    const calcPercentage = totalMarks > 0 ? (marks / totalMarks) * 100 : 0;
                    displayPercentage = Math.round(calcPercentage);
                }
                
                const isClosed = group.status === 'Completed' || group.status === 'Closed';
                const isExpired = examStatus === 'expired' || isClosed;
                
                // ============================================
                // ✅ RETAKE CHECK - FIRST PRIORITY
                // ============================================
                if (isResetForRetake && retakeUnlocked) {
                    // Exam is available for retake
                    if (examStatus === 'available' || (examEndDateTime && kenyaNow <= examEndDateTime)) {
                        finalStatus = 'available';
                        finalCanStart = true;
                        buttonText = '🔄 Retake Exam';
                        finalMessage = '▶ Continue where you left off';
                        isCompleted = false;
                        gradeText = 'Retake Available';
                        gradeClass = 'retake';
                        canStart = true;
                    } else if (examEndDateTime && kenyaNow > examEndDateTime) {
                        finalStatus = 'expired';
                        finalCanStart = false;
                        buttonText = 'Retake Closed';
                        finalMessage = '🔒 Retake window closed';
                        isCompleted = true;
                        gradeText = 'Retake Closed';
                        gradeClass = 'missed';
                    } else {
                        // Exam is upcoming, show retake will be available
                        finalStatus = 'upcoming';
                        finalCanStart = false;
                        buttonText = 'Retake Available Soon';
                        finalMessage = `🔄 Retake available ${formattedExamDateTime}`;
                        isCompleted = false;
                        gradeText = 'Retake Soon';
                        gradeClass = 'pending';
                    }
                }
                // THEN check if hasGrade
                else if (hasGrade) {
                    isCompleted = true;
                    if (isReleased) {
                        finalStatus = 'completed';
                        buttonText = 'View Results';
                        finalMessage = '✅ Results Released';
                        
                        if (displayPercentage !== null && displayPercentage >= 0) {
                            const resultGrade = getAssessmentGrade(displayPercentage, isExamTVET);
                            gradeText = resultGrade.rating;
                            gradeClass = resultGrade.rating === 'Distinction' || resultGrade.rating === 'MASTERY' ? 'distinction' :
                                          resultGrade.rating === 'Credit' || resultGrade.rating === 'PROFICIENT' ? 'credit' :
                                          resultGrade.rating === 'Pass' || resultGrade.rating === 'COMPETENT' ? 'pass' : 'fail';
                        } else {
                            gradeText = 'Completed';
                            gradeClass = 'completed';
                        }
                    } else {
                        finalStatus = 'pending_release';
                        buttonText = 'Pending';
                        finalMessage = '⏳ Pending Release';
                        gradeText = 'Pending Release';
                        gradeClass = 'pending';
                        isCompleted = true;
                    }
                } else if (isExpired) {
                    finalStatus = 'expired';
                    finalCanStart = false;
                    finalMessage = '🔒 Exam Closed - You did not take this exam';
                    buttonText = 'Missed';
                    isCompleted = true;
                    gradeText = 'Missed';
                    gradeClass = 'missed';
                    displayPercentage = null;
                } else if (examStatus === 'available' && !hasTaken && hasValidLink) {
                    finalStatus = 'available';
                    finalCanStart = true;
                    finalMessage = statusMessage;
                    buttonText = 'Start Exam';
                    isCompleted = false;
                } else if (examStatus === 'upcoming' && !hasTaken) {
                    finalStatus = 'upcoming';
                    finalCanStart = false;
                    finalMessage = countdownText || 'Coming Soon';
                    buttonText = 'Coming Soon';
                    isCompleted = false;
                } else {
                    finalStatus = 'pending';
                    buttonText = 'Not Available';
                    isCompleted = false;
                }
                
                // ============================================
                // Display scores
                // ============================================
                // Never show the previous attempt's score while an Admin
                // continuation/reset is active.
                if (isResetForRetake && retakeUnlocked) {
                    displayScore = 0;
                    displayPercentage = null;
                }

                let cat1Display = '--';
                let cat2Display = '--';
                let finalDisplay = '--';
                let totalDisplay = '--';
                
                if (hasGrade && displayScore > 0) {
                    totalDisplay = `${Math.round(displayScore)}/${totalMarks}`;
                    
                    if (isCatExam) {
                        if (cat1Score !== null && cat1Score > 0) {
                            cat1Display = `${Math.round(cat1Score)}`;
                        } else if (displayScore > 0) {
                            cat1Display = `${Math.round(displayScore)}`;
                        }
                        if (cat2Score !== null && cat2Score > 0) {
                            cat2Display = `${Math.round(cat2Score)}`;
                        }
                    } else {
                        if (cat1Score !== null && cat1Score > 0) {
                            cat1Display = `${Math.round(cat1Score)}`;
                        }
                        if (cat2Score !== null && cat2Score > 0) {
                            cat2Display = `${Math.round(cat2Score)}`;
                        }
                        if (finalScore !== null && finalScore > 0) {
                            finalDisplay = `${Math.round(finalScore)}`;
                        } else if (displayScore > 0) {
                            finalDisplay = `${Math.round(displayScore)}/${totalMarks}`;
                        }
                    }
                } else if (isPendingRelease && hasGrade) {
                    cat1Display = '🔒';
                    cat2Display = '🔒';
                    finalDisplay = '🔒';
                    if (displayScore > 0) {
                        totalDisplay = `${Math.round(displayScore)}/${totalMarks}`;
                    }
                }
                
                const formattedGradedDate = grade?.graded_at ? 
                    formatKenyaDate(new Date(new Date(grade.graded_at).getTime() + (3 * 60 * 60 * 1000))) : '--';
                
                const gradedAt = grade?.graded_at || group.exam_date || null;
                
                return {
                    ...group,
                    id: group.id,
                    exam_name: group.exam_name,
                    title: group.title,
                    exam_type: group.exam_type || (isCatExam ? 'CAT' : 'EXAM'),
                    isCatExam: isCatExam,
                    isCompleted: isCompleted,
                    isReleased: isReleased,
                    isPendingRelease: isPendingRelease,
                    hasGrade: hasGrade,
                    isResetForRetake: isResetForRetake,
                    retakeUnlocked: retakeUnlocked,
                    totalPercentage: displayPercentage,
                    gradeText: gradeText,
                    gradeClass: gradeClass,
                    hasValidLink: hasValidLink,
                    canTakeExam: finalCanStart,
                    actionState: finalStatus,
                    actionMessage: finalMessage,
                    buttonText: buttonText,
                    examLink: group.exam_link,
                    marks_out_of: totalMarks,
                    examStartDateTime: examStartDateTime,
                    examEndDateTime: examEndDateTime,
                    timeRemainingMs: timeRemainingMs,
                    timeToStartMs: timeToStartMs,
                    countdownText: countdownText,
                    cat1Score: cat1Score,
                    cat2Score: cat2Score,
                    finalScore: finalScore,
                    marks: marks,
                    cat1Display: cat1Display,
                    cat2Display: cat2Display,
                    finalDisplay: finalDisplay,
                    totalDisplay: totalDisplay,
                    displayScore: displayScore,
                    examDate: group.exam_date,
                    examStartTime: group.exam_start_time,
                    formattedExamDateTime: formattedExamDateTime,
                    formattedGradedDate: formattedGradedDate,
                    gradedAt: gradedAt,
                    programBadgeClass: programBadgeClass,
                    programIcon: programIcon,
                    programDisplay: combinedProgram,
                    course: combinedCourse,
                    block_term: blockTermDisplay,
                    status: group.status,
                    result_status: grade?.result_status || null,
                    grade: grade,
                    isTVET: this.isTVETStudent || isExamTVET,
                    term: this.userTerm || group.block_term || 'Year 1 Term 1'
                };
            });
            
            const releasedCount = this.allExams.filter(e => e.isReleased).length;
            const pendingCount = this.allExams.filter(e => e.actionState === 'pending_release').length;
            const retakeCount = this.allExams.filter(e => e.isResetForRetake && e.retakeUnlocked).length;
            const currentCount = this.allExams.filter(e => !e.isCompleted && e.actionState !== 'expired' && e.actionState !== 'pending_release').length;
            const completedCount = this.allExams.filter(e => e.isCompleted || e.actionState === 'expired' || e.actionState === 'pending_release').length;
            const missedCount = this.allExams.filter(e => e.gradeClass === 'missed').length;
            
            console.log(`✅ Processed ${this.allExams.length} exams:`);
            console.log(`   📊 Released: ${releasedCount}`);
            console.log(`   ⏳ Pending Release: ${pendingCount}`);
            console.log(`   🔄 Retake Available: ${retakeCount}`);
            console.log(`   📝 Current: ${currentCount}`);
            console.log(`   ✅ Completed: ${completedCount}`);
            console.log(`   ❌ Missed: ${missedCount}`);
        }
        
        // ============================================
        // 📊 DISPLAY TABLES
        // ============================================
        displayTables() {
            this.displayCurrentTable();
            this.displayCompletedTable();
            this.updateCounts();
            this.updateEmptyStates();
            
            setTimeout(() => this.updateAllCountdowns(), 100);
        }
        
        // ============================================
        // 📊 DISPLAY CURRENT TABLE - WITH RETAKE BUTTON
        // ============================================
        displayCurrentTable() {
            if (!this.currentTable) return;

            const activeExams = this.currentExams.filter(exam =>
                !exam.isCompleted &&
                exam.actionState !== 'expired' &&
                exam.actionState !== 'pending_release'
            );

            if (activeExams.length === 0) {
                this.currentTable.innerHTML = '';
                return;
            }

            const userId = this.userId || window.db?.currentUserId || '';
            const kenyaNow = getKenyaNow();

            const html = activeExams.map(exam => {
                const isCatExam = exam.isCatExam;
                const isTVET = exam.isTVET || this.isTVETStudent;
                const isRetake = exam.isResetForRetake && exam.retakeUnlocked;
                const totalMarks = Number(exam.marks_out_of || exam.total_marks || (isCatExam ? 30 : 70));
                const displayName = (typeof exam.exam_name === 'string' && exam.exam_name !== '[object Object]' && exam.exam_name.trim())
                    ? exam.exam_name : ((typeof exam.title === 'string' && exam.title.trim()) ? exam.title : 'Assessment');
                const isActuallyExpired = !!(exam.examEndDateTime && kenyaNow > exam.examEndDateTime);

                let actionHtml = '';
                let timerHtml = '';
                let statusClass = '';
                let statusText = exam.gradeText || 'Available';

                if (isRetake && exam.canTakeExam && exam.hasValidLink) {
                    const baseUrl = exam.examLink.split('?')[0];
                    const params = new URLSearchParams({user_id: userId, exam_id: exam.id, retake: 'true'});
                    const fullUrl = `${baseUrl}?${params.toString()}`;
                    actionHtml = `<a href="${fullUrl}" target="_blank" class="exam-action-btn btn-retake" onclick="sessionStorage.setItem('returningFromExam','true');sessionStorage.setItem('examUserId','${userId}');"><i class="fas fa-play"></i> Continue Exam</a>`;
                    statusClass = 'retake';
                    statusText = 'Retake Available';
                } else if (exam.actionState === 'available' && exam.canTakeExam && exam.hasValidLink) {
                    const baseUrl = exam.examLink.split('?')[0];
                    const params = new URLSearchParams({user_id: userId, exam_id: exam.id});
                    const fullUrl = `${baseUrl}?${params.toString()}`;
                    actionHtml = `<a href="${fullUrl}" target="_blank" class="exam-action-btn btn-start" onclick="sessionStorage.setItem('returningFromExam','true');sessionStorage.setItem('examUserId','${userId}');"><i class="fas fa-play"></i> Start Assessment</a>`;
                    statusClass = 'available';
                    statusText = 'Available';
                } else if (isActuallyExpired) {
                    actionHtml = `<span class="exam-action-btn btn-missed"><i class="fas fa-times-circle"></i> Missed</span>`;
                    statusClass = 'missed';
                    statusText = 'Missed';
                } else if (exam.actionState === 'upcoming') {
                    const timeToStart = Math.max(0, exam.examStartDateTime - kenyaNow);
                    const hours = Math.floor(timeToStart / 3600000);
                    const minutes = Math.floor((timeToStart % 3600000) / 60000);
                    const seconds = Math.floor((timeToStart % 60000) / 1000);
                    const countdown = `${hours > 0 ? hours + 'h ' : ''}${minutes}m ${seconds}s`;
                    actionHtml = `<span class="exam-action-btn btn-upcoming"><i class="fas fa-clock"></i> ${countdown}</span>`;
                    timerHtml = `<span class="exam-timer timer-upcoming">Opens ${exam.formattedExamDateTime || 'soon'}</span>`;
                    statusClass = 'upcoming';
                    statusText = 'Upcoming';
                } else {
                    actionHtml = `<span class="exam-action-btn btn-disabled"><i class="fas fa-lock"></i> ${this.escapeHtml(exam.buttonText || 'Not Available')}</span>`;
                    statusClass = 'upcoming';
                }

                const dateText = exam.formattedExamDateTime && exam.formattedExamDateTime !== 'TBA' ? exam.formattedExamDateTime : 'Date/time TBA';
                const duration = exam.duration_minutes || exam.duration || null;
                const meta = [
                    `<span><i class="fas fa-star"></i> ${totalMarks} marks</span>`,
                    `<span><i class="fas fa-calendar"></i> ${this.escapeHtml(dateText)}</span>`,
                    duration ? `<span><i class="fas fa-hourglass-half"></i> ${duration} min</span>` : ''
                ].filter(Boolean).join('');

                return `
                    <div class="current-assessment-card ${isRetake ? 'row-retake' : ''}" data-exam-id="${exam.id}">
                        <div class="current-main">
                            <div class="current-top">
                                <span class="current-name">${this.escapeHtml(displayName)}</span>
                                <span class="type-badge ${isCatExam ? 'type-cat' : 'type-final'}">${isCatExam ? 'CAT' : 'FINAL EXAM'}</span>
                                ${isTVET ? '<span class="type-badge type-tvet">TVET</span>' : ''}
                                ${isRetake ? '<span class="retake-badge">↻ Retake</span>' : ''}
                                <span class="current-status ${statusClass}"><i class="fas ${statusClass === 'upcoming' ? 'fa-clock' : statusClass === 'retake' ? 'fa-rotate-right' : statusClass === 'missed' ? 'fa-circle-xmark' : 'fa-circle-check'}"></i> ${statusText}</span>
                            </div>
                            <div class="current-meta">${meta}</div>
                            ${isRetake ? '<div style="margin-top:6px;color:#6d28d9;font-size:9px;font-weight:750"><i class="fas fa-rotate-right"></i> Your assessment has been reset and is ready for continuation.</div>' : ''}
                        </div>
                        <div class="current-action">${actionHtml}${timerHtml}</div>
                    </div>
                `;
            }).join('');

            this.currentTable.innerHTML = html;
        }

        // ============================================
        // 📊 DISPLAY COMPLETED TABLE - FIXED MARKS
        // ============================================
        displayCompletedTable() {
            if (!this.completedTable) return;

            const completedReleased = this.completedExams
                .filter(exam => exam.isCompleted || exam.isReleased || exam.actionState === 'expired' || exam.actionState === 'pending_release')
                .sort((a, b) => {
                    const dateA = a.gradedAt || a.examDate || a.examStartDateTime || a.created_at || new Date(0);
                    const dateB = b.gradedAt || b.examDate || b.examStartDateTime || b.created_at || new Date(0);
                    return new Date(dateB) - new Date(dateA);
                });

            if (completedReleased.length === 0) {
                this.completedTable.innerHTML = '';
                return;
            }

            const html = completedReleased.map(exam => {
                const isCatExam = !!exam.isCatExam;
                const isRetake = exam.isResetForRetake && exam.retakeUnlocked;
                const isPendingRelease = exam.actionState === 'pending_release';
                const isReleased = exam.isReleased === true;
                const totalMarks = Number(exam.marks_out_of || exam.total_marks || (isCatExam ? 30 : 70));
                const displayName = (typeof exam.exam_name === 'string' && exam.exam_name !== '[object Object]' && exam.exam_name.trim())
                    ? exam.exam_name : ((typeof exam.title === 'string' && exam.title.trim()) ? exam.title : 'Assessment');

                let marks = Number(exam.marks || exam.displayScore || 0);
                let percentage = Number(exam.totalPercentage || 0);
                if (isReleased && !percentage && marks > 0) percentage = Math.round((marks / totalMarks) * 100);
                if (!isReleased || isPendingRelease) { marks = 0; percentage = 0; }

                let grade = 'Pending';
                let gradeClass = 'grade-pending';
                if (isRetake) { grade = 'Retake Available'; gradeClass = 'grade-retake'; }
                else if (isPendingRelease) { grade = 'Pending Release'; gradeClass = 'grade-pending'; }
                else if (exam.actionState === 'expired' && !exam.hasGrade) { grade = 'Missed'; gradeClass = 'grade-missed'; }
                else if (isReleased) {
                    const resultGrade = getAssessmentGrade(percentage, !!exam.isTVET);
                    grade = resultGrade.rating;
                    gradeClass = resultGrade.rating === 'Distinction' || resultGrade.rating === 'MASTERY' ? 'grade-distinction' :
                                 resultGrade.rating === 'Credit' || resultGrade.rating === 'PROFICIENT' ? 'grade-credit' :
                                 resultGrade.rating === 'Pass' || resultGrade.rating === 'COMPETENT' ? 'grade-pass' : 'grade-fail';
                }

                let status = 'Pending';
                let statusClass = 'status-pending';
                if (isRetake) { status = 'Retake Available'; statusClass = 'status-retake'; }
                else if (isReleased) { status = 'Released'; statusClass = 'status-released'; }
                else if (exam.actionState === 'expired') { status = 'Missed'; statusClass = 'status-missed'; }

                let actionHtml = '<span style="color:#94a3b8">—</span>';
                if (isReleased) {
                    actionHtml = `<div class="row-actions"><button type="button" class="result-btn" onclick="window.openNurseIQExamReview?.(${exam.id})"><i class="fas fa-chart-column"></i> View Result</button><button type="button" class="review-btn" onclick="window.openNurseIQExamReview?.(${exam.id})"><i class="fas fa-book-open"></i> Review Questions</button></div>`;
                } else if (isRetake) {
                    const userId = this.userId || window.db?.currentUserId || '';
                    const examLink = exam.examLink;
                    if (examLink && examLink.startsWith('http')) {
                        const fullUrl = examLink.split('?')[0] + '?' + new URLSearchParams({user_id:userId,exam_id:exam.id,retake:'true'}).toString();
                        actionHtml = `<a href="${fullUrl}" target="_blank" class="retake-link" onclick="sessionStorage.setItem('returningFromExam','true');"><i class="fas fa-rotate-right"></i> Retake</a>`;
                    } else actionHtml = '<span class="status-pill status-retake">Retake</span>';
                } else if (isPendingRelease) {
                    actionHtml = '<span style="color:#b45309;font-size:8px;font-weight:800">Awaiting marking/release</span>';
                }

                const scoreText = isReleased && marks !== null && Number.isFinite(marks) ? `${Math.round(marks)}/${totalMarks}` : 'Pending';
                const pctText = isReleased && percentage !== null && Number.isFinite(percentage) ? `${Math.round(percentage)}%` : 'Pending';
                const dateText = exam.formattedExamDateTime || exam.examDate || 'Date not available';

                return `
                    <tr>
                        <td><div class="assessment-name-main">${this.escapeHtml(displayName)}</div><div class="assessment-date">Submitted/assessed: ${this.escapeHtml(String(dateText))}</div></td>
                        <td><span class="type-badge ${isCatExam ? 'type-cat' : 'type-final'}">${isCatExam ? 'CAT' : 'FINAL EXAM'}</span></td>
                        <td><span class="score-main">${scoreText}</span></td>
                        <td><span class="${isReleased && percentage >= 60 ? 'percentage-good' : isReleased ? 'percentage-fail' : ''}">${pctText}</span></td>
                        <td>
                            <div class="grade-status-stack">
                                <span class="grade-pill ${gradeClass}">${grade}</span>
                                ${isReleased ? '<span class="grade-release-label"><i class="fas fa-circle-check"></i> Released</span>' : ''}
                            </div>
                        </td>
                        <td><span class="status-pill ${statusClass}">${status}</span></td>
                        <td>${actionHtml}</td>
                    </tr>
                `;
            }).join('');

            this.completedTable.innerHTML = html;
        }

        // ============================================
        // 📊 PERFORMANCE CHART
        // ============================================
        
        initPerformanceChart() {
            const ctx = document.getElementById('performanceGraph');
            if (!ctx) {
                console.warn('⚠️ Performance graph canvas not found');
                return;
            }
            
            if (window.performanceChart) {
                window.performanceChart.destroy();
                window.performanceChart = null;
            }
            
            const completedData = this.getCompletedChartData();
            
            if (completedData.length === 0) {
                const noDataEl = document.getElementById('graphNoData');
                const canvasEl = document.getElementById('performanceGraph');
                if (noDataEl) noDataEl.style.display = 'block';
                if (canvasEl) canvasEl.style.display = 'none';
                console.log('📊 No data for performance chart');
                return;
            }
            
            const noDataEl = document.getElementById('graphNoData');
            const canvasEl = document.getElementById('performanceGraph');
            if (noDataEl) noDataEl.style.display = 'none';
            if (canvasEl) canvasEl.style.display = 'block';
            
            const chartData = this.buildChartData(completedData, this.currentChartView || 'both');
            
            try {
                window.performanceChart = new Chart(ctx, {
                    type: 'line',
                    data: chartData,
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                labels: {
                                    boxWidth: 12,
                                    font: { size: 10 },
                                    padding: 10,
                                    usePointStyle: true,
                                    pointStyle: 'circle'
                                }
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return context.dataset.label + ': ' + context.parsed.y + '%';
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                max: 100,
                                grid: { display: true, color: 'rgba(0,0,0,0.05)' },
                                ticks: { callback: function(value) { return value + '%'; } }
                            },
                            x: {
                                grid: { display: false },
                                ticks: { 
                                    maxRotation: 45,
                                    minRotation: 30,
                                    font: { size: 9 }
                                }
                            }
                        },
                        elements: {
                            line: { tension: 0.3 },
                            point: { radius: 4, hoverRadius: 6 }
                        }
                    }
                });
                console.log('✅ Performance chart initialized with', completedData.length, 'data points');
            } catch (error) {
                console.error('❌ Failed to create chart:', error);
            }
        }
        
        getCompletedChartData() {
            const releasedExams = this.completedExams
                .filter(exam => 
                    exam.isReleased && exam.totalPercentage !== null
                )
                .sort((a, b) => {
                    const dateA = a.gradedAt || a.examDate || a.examStartDateTime || new Date(0);
                    const dateB = b.gradedAt || b.examDate || b.examStartDateTime || new Date(0);
                    return new Date(dateA) - new Date(dateB);
                });
            
            return releasedExams.map(exam => {
                const isCat = exam.isCatExam || (exam.exam_type && exam.exam_type.toUpperCase().includes('CAT'));
                
                let cat1Score = null;
                let cat2Score = null;
                let examScore = null;
                
                if (exam.cat1Score !== null && exam.cat1Score !== undefined && exam.cat1Score > 0) {
                    cat1Score = exam.cat1Score;
                }
                if (exam.cat2Score !== null && exam.cat2Score !== undefined && exam.cat2Score > 0) {
                    cat2Score = exam.cat2Score;
                }
                if (exam.finalScore !== null && exam.finalScore !== undefined && exam.finalScore > 0) {
                    examScore = exam.finalScore;
                }
                
                let totalMarks = exam.marks_out_of || (isCat ? 30 : 100);
                let displayScore = 0;
                
                if (isCat) {
                    displayScore = exam.cat1Score || exam.cat2Score || exam.marks || exam.totalPercentage || 0;
                    displayScore = Math.min(displayScore, totalMarks);
                } else {
                    displayScore = exam.marks || exam.totalPercentage || 0;
                    displayScore = Math.min(displayScore, totalMarks);
                }
                
                const pct = totalMarks > 0 ? Math.round((displayScore / totalMarks) * 100) : exam.totalPercentage || 0;
                
                return {
                    name: exam.exam_name || exam.title || 'Assessment',
                    totalPercentage: pct,
                    cat1Score: cat1Score,
                    cat2Score: cat2Score,
                    examScore: examScore,
                    isCat: isCat,
                    isTVET: exam.isTVET || this.isTVETStudent,
                    date: exam.gradedAt || exam.examDate || exam.examStartDateTime || new Date(),
                    examId: exam.id
                };
            });
        }
        
        buildChartData(data, view) {
            const labels = data.map(d => {
                const name = d.name.length > 20 ? d.name.substring(0, 18) + '...' : d.name;
                return name;
            });
            
            const catScores = data.map(d => d.cat1Score || d.cat2Score || null);
            const examScores = data.map(d => d.examScore || null);
            const overallScores = data.map(d => d.totalPercentage || null);
            
            let datasets = [];
            
            if (view === 'cats' || view === 'both') {
                datasets.push({
                    label: 'CAT Score',
                    data: catScores,
                    borderColor: '#4C1D95',
                    backgroundColor: 'rgba(76, 29, 149, 0.1)',
                    tension: 0.3,
                    pointRadius: 4,
                    pointBackgroundColor: '#4C1D95',
                    fill: true
                });
            }
            
            if (view === 'exams' || view === 'both') {
                datasets.push({
                    label: 'Exam Score',
                    data: examScores,
                    borderColor: '#059669',
                    backgroundColor: 'rgba(5, 150, 105, 0.1)',
                    tension: 0.3,
                    pointRadius: 4,
                    pointBackgroundColor: '#059669',
                    fill: true
                });
            }
            
            if (view === 'both') {
                datasets.push({
                    label: 'Overall Average',
                    data: overallScores,
                    borderColor: '#FDB913',
                    backgroundColor: 'rgba(253, 185, 19, 0.1)',
                    tension: 0.3,
                    borderDash: [5, 5],
                    pointRadius: 3,
                    pointBackgroundColor: '#FDB913',
                    fill: true
                });
            }
            
            datasets.push({
                label: 'Pass Mark (60%)',
                data: labels.map(() => 60),
                borderColor: '#ef4444',
                backgroundColor: 'transparent',
                borderDash: [3, 3],
                pointRadius: 0,
                fill: false,
                borderWidth: 1.5
            });
            
            return {
                labels: labels,
                datasets: datasets
            };
        }
        
        toggleGraphData(view) {
            this.currentChartView = view;
            
            document.querySelectorAll('#graphToggleCats, #graphToggleExams, #graphToggleBoth').forEach(btn => {
                if (btn) {
                    btn.style.border = '1px solid #e2e8f0';
                    btn.style.background = 'white';
                    btn.style.color = '#64748b';
                }
            });
            
            let activeBtn = document.getElementById(`graphToggle${view.charAt(0).toUpperCase() + view.slice(1)}`);
            if (activeBtn) {
                activeBtn.style.border = '1px solid #4C1D95';
                activeBtn.style.background = '#4C1D95';
                activeBtn.style.color = 'white';
            }
            
            this.updatePerformanceGraph();
        }
        
        updatePerformanceGraph() {
            if (window.performanceChart) {
                const data = this.getCompletedChartData();
                const chartData = this.buildChartData(data, this.currentChartView || 'both');
                
                window.performanceChart.data = chartData;
                window.performanceChart.update();
                console.log('📊 Performance chart updated with view:', this.currentChartView);
            } else {
                this.initPerformanceChart();
            }
        }
        
        // ============================================
        // 📊 PERFORMANCE SUMMARY
        // ============================================
        updateCounts() {
            const currentCount = this.currentExams.length;
            const completedCount = this.completedExams.length;
            const releasedCount = this.completedExams.filter(exam => exam.isReleased && exam.totalPercentage !== null).length;
            
            if (this.currentCount) {
                this.currentCount.textContent = `${currentCount} pending`;
            }
            if (this.completedCount) {
                this.completedCount.textContent = `${completedCount} completed`;
            }
            if (this.currentHeaderCount) {
                this.currentHeaderCount.textContent = currentCount;
            }
            if (this.completedHeaderCount) {
                this.completedHeaderCount.textContent = completedCount;
            }
            const releasedEl = document.getElementById('released-assessments-count');
            const navCurrent = document.getElementById('nav-current-count');
            const navCompleted = document.getElementById('nav-completed-count');
            if (releasedEl) releasedEl.textContent = releasedCount;
            if (navCurrent) navCurrent.textContent = currentCount;
            if (navCompleted) navCompleted.textContent = completedCount;
            
            // Calculate average from percentage values
            const scoredExams = this.completedExams.filter(exam => exam.totalPercentage !== null && exam.isReleased);
            if (scoredExams.length > 0) {
                const total = scoredExams.reduce((sum, exam) => sum + exam.totalPercentage, 0);
                const average = total / scoredExams.length;
                if (this.completedAverage) {
                    this.completedAverage.textContent = `Average: ${average.toFixed(1)}%`;
                }
                if (this.overallAverage) {
                    this.overallAverage.textContent = `${average.toFixed(1)}%`;
                }
                const passRateDisplay = document.getElementById('pass-rate-display');
                if (passRateDisplay) {
                    const passed = scoredExams.filter(exam => Number(exam.totalPercentage) >= 60).length;
                    passRateDisplay.textContent = `${Math.round((passed / scoredExams.length) * 100)}%`;
                }
            } else {
                if (this.completedAverage) this.completedAverage.textContent = 'Average: --';
                if (this.overallAverage) this.overallAverage.textContent = '--';
                const passRateDisplay = document.getElementById('pass-rate-display');
                if (passRateDisplay) passRateDisplay.textContent = '0%';
            }
            
            this.updatePerformanceSummary();
        }
        
        updatePerformanceSummary() {
            const completedReleased = this.completedExams.filter(exam => 
                exam.isReleased && exam.totalPercentage !== null
            );
            
            const bestScore = document.getElementById('best-score');
            const lowestScore = document.getElementById('lowest-score');
            const passRate = document.getElementById('pass-rate');
            const distinctionCount = document.getElementById('distinction-count');
            const creditCount = document.getElementById('credit-count');
            const passCount = document.getElementById('pass-count');
            const failCount = document.getElementById('fail-count');
            const firstAssessment = document.getElementById('first-assessment-date');
            const latestAssessment = document.getElementById('latest-assessment-date');
            const totalSubmitted = document.getElementById('total-submitted');
            const overallAverage = document.getElementById('overall-average');
            const catCount = document.getElementById('cat-count');
            const examCount = document.getElementById('exam-count');
            
            if (completedReleased.length === 0) {
                if (bestScore) bestScore.textContent = '--';
                if (lowestScore) lowestScore.textContent = '--';
                if (passRate) passRate.textContent = '--';
                if (distinctionCount) distinctionCount.textContent = '0';
                if (creditCount) creditCount.textContent = '0';
                if (passCount) passCount.textContent = '0';
                if (failCount) failCount.textContent = '0';
                if (firstAssessment) firstAssessment.textContent = '--';
                if (latestAssessment) latestAssessment.textContent = '--';
                if (totalSubmitted) totalSubmitted.textContent = '0';
                if (overallAverage) overallAverage.textContent = '--';
                if (catCount) catCount.textContent = '0';
                if (examCount) examCount.textContent = '0';
                return;
            }
            
            const percentages = completedReleased.map(e => e.totalPercentage);
            const best = Math.max(...percentages);
            const lowest = Math.min(...percentages);
            const average = percentages.reduce((a, b) => a + b, 0) / percentages.length;
            
            const distinctions = completedReleased.filter(e => { const g = getAssessmentGrade(e.totalPercentage, !!e.isTVET); return g.grade === 'A'; }).length;
            const credits = completedReleased.filter(e => { const g = getAssessmentGrade(e.totalPercentage, !!e.isTVET); return g.grade === 'B'; }).length;
            const passes = completedReleased.filter(e => { const g = getAssessmentGrade(e.totalPercentage, !!e.isTVET); return g.grade === 'C'; }).length;
            const fails = completedReleased.filter(e => { const g = getAssessmentGrade(e.totalPercentage, !!e.isTVET); return g.grade === 'D' || g.grade === 'E'; }).length;
            
            const passed = distinctions + credits + passes;
            const passRateValue = completedReleased.length > 0 ? (passed / completedReleased.length) * 100 : 0;
            
            const examDates = completedReleased
                .map(e => e.gradedAt || e.examStartDateTime || e.examDate)
                .filter(d => d)
                .sort((a, b) => new Date(a) - new Date(b));
            
            const firstDate = examDates.length > 0 ? examDates[0] : null;
            const latestDate = examDates.length > 0 ? examDates[examDates.length - 1] : null;
            
            const cats = completedReleased.filter(e => e.isCatExam).length;
            const exams = completedReleased.filter(e => !e.isCatExam).length;
            
            if (bestScore) bestScore.textContent = best.toFixed(1) + '%';
            if (lowestScore) lowestScore.textContent = lowest.toFixed(1) + '%';
            if (passRate) passRate.textContent = passRateValue.toFixed(1) + '%';
            if (distinctionCount) distinctionCount.textContent = distinctions;
            if (creditCount) creditCount.textContent = credits;
            if (passCount) passCount.textContent = passes;
            if (failCount) failCount.textContent = fails;
            if (firstAssessment) firstAssessment.textContent = firstDate ? formatKenyaDate(firstDate) : '--';
            if (latestAssessment) latestAssessment.textContent = latestDate ? formatKenyaDate(latestDate) : '--';
            if (totalSubmitted) totalSubmitted.textContent = completedReleased.length;
            if (overallAverage) overallAverage.textContent = average.toFixed(1) + '%';
            if (catCount) catCount.textContent = cats;
            if (examCount) examCount.textContent = exams;
        }
        
        updateEmptyStates() {
            if (this.currentEmpty) {
                this.currentEmpty.style.display = this.currentExams.length === 0 ? 'block' : 'none';
            }
            if (this.completedEmpty) {
                this.completedEmpty.style.display = this.completedExams.length === 0 ? 'block' : 'none';
            }
        }
        
        // ============================================
        // 📜 TRANSCRIPT
        // ============================================
        showProfessionalTranscript() {
            const completedReleased = this.completedExams.filter(e => e.isReleased && e.totalPercentage !== null);
            if (completedReleased.length === 0) {
                const noResultsModal = `
                    <div id="noResultsModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 100000; display: flex; align-items: center; justify-content: center;">
                        <div style="background: white; border-radius: 16px; max-width: 260px; width: 90%; padding: 24px; text-align: center;">
                            <div style="font-size: 36px;">📋</div>
                            <p style="margin: 10px 0; font-size: 13px; color: #64748B;">No released results available for transcript yet.</p>
                            <button onclick="document.getElementById('noResultsModal').remove()" 
                                    style="padding: 10px 24px; background: #0A3D62; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500;">
                                OK
                            </button>
                        </div>
                    </div>
                `;
                const existing = document.getElementById('noResultsModal');
                if (existing) existing.remove();
                document.body.insertAdjacentHTML('beforeend', noResultsModal);
                return;
            }
            
            const avg = completedReleased.reduce((sum, e) => sum + e.totalPercentage, 0) / completedReleased.length;
            const distinctionCount = completedReleased.filter(e => { const g = getAssessmentGrade(e.totalPercentage, !!e.isTVET); return g.grade === 'A'; }).length;
            const creditCount = completedReleased.filter(e => { const g = getAssessmentGrade(e.totalPercentage, !!e.isTVET); return g.grade === 'B'; }).length;
            const passCount = completedReleased.filter(e => { const g = getAssessmentGrade(e.totalPercentage, !!e.isTVET); return g.grade === 'C'; }).length;
            
            const transcriptModal = `
                <div id="transcriptModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 100000; display: flex; align-items: center; justify-content: center;">
                    <div style="background: white; border-radius: 16px; max-width: 340px; width: 90%; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                        <div style="background: linear-gradient(135deg, #0A3D62, #1A5A8A); padding: 20px; text-align: center;">
                            <div style="font-size: 32px;">📜</div>
                            <h3 style="margin: 4px 0 0 0; font-size: 18px; color: white; font-weight: 600;">Academic Transcript</h3>
                            <p style="margin: 2px 0 0 0; font-size: 12px; color: rgba(255,255,255,0.8);">${this.isTVETStudent ? 'TVET Program' : 'KRCHN Program'}</p>
                        </div>
                        <div style="padding: 20px;">
                            <div style="text-align: center; margin-bottom: 16px;">
                                <div style="font-size: 32px; font-weight: 700; color: #0A3D62;">${avg.toFixed(1)}%</div>
                                <div style="font-size: 12px; color: #64748B;">Overall Average</div>
                            </div>
                            <div style="display: flex; justify-content: space-around; margin-bottom: 16px;">
                                <div style="text-align: center;">
                                    <div style="font-weight: 700; font-size: 20px; color: #065F46;">${distinctionCount}</div>
                                    <div style="font-size: 10px; color: #64748B;">Distinction</div>
                                </div>
                                <div style="text-align: center;">
                                    <div style="font-weight: 700; font-size: 20px; color: #1E40AF;">${creditCount}</div>
                                    <div style="font-size: 10px; color: #64748B;">Credit</div>
                                </div>
                                <div style="text-align: center;">
                                    <div style="font-weight: 700; font-size: 20px; color: #92400E;">${passCount}</div>
                                    <div style="font-size: 10px; color: #64748B;">Pass</div>
                                </div>
                            </div>
                            <div style="background: #F8FAFC; border-radius: 8px; padding: 10px; margin-bottom: 12px; text-align: center;">
                                <span style="font-size: 12px; color: #64748B;">Completed Exams: <strong>${completedReleased.length}</strong></span>
                            </div>
                            <p style="font-size: 10px; color: #94A3B8; text-align: center; margin: 0;">Contact registrar for official transcript</p>
                        </div>
                        <button onclick="document.getElementById('transcriptModal').remove()" 
                                style="width: 100%; padding: 14px; background: #0A3D62; color: white; border: none; font-size: 14px; font-weight: 500; cursor: pointer; transition: background 0.2s;"
                                onmouseover="this.style.background='#0F4A6E'" onmouseout="this.style.background='#0A3D62'">
                            Close
                        </button>
                    </div>
                </div>
            `;
            
            const existing = document.getElementById('transcriptModal');
            if (existing) existing.remove();
            document.body.insertAdjacentHTML('beforeend', transcriptModal);
            document.getElementById('transcriptModal').addEventListener('click', function(e) {
                if (e.target === this) this.remove();
            });
        }
        
        // ============================================
        // 🛠️ UTILITY FUNCTIONS
        // ============================================
        showToast(message, type = 'info') {
            if (typeof showToast === 'function') {
                showToast(message, type);
            } else {
                console.log(`[${type}] ${message}`);
                if (type === 'error') {
                    alert('❌ ' + message);
                } else if (type === 'warning') {
                    alert('⚠️ ' + message);
                } else {
                    alert('ℹ️ ' + message);
                }
            }
        }
        
        showLoading() {
            const currentLoading = `
                <div class="empty-state" style="display:block">
                    <i class="fas fa-spinner fa-spin"></i>
                    <h3>Loading assessments...</h3>
                    <p>Fetching your current assessments.</p>
                </div>`;
            const completedLoading = `
                <tr><td colspan="7" style="padding:35px;text-align:center;color:#94a3b8">
                    <i class="fas fa-spinner fa-spin" style="font-size:24px;display:block;margin-bottom:8px"></i>
                    Loading completed assessments...
                </td></tr>`;
            if (this.currentTable) this.currentTable.innerHTML = currentLoading;
            if (this.completedTable) this.completedTable.innerHTML = completedLoading;
        }
        
        showError(message) {
            const currentError = `
                <div class="empty-state" style="display:block">
                    <i class="fas fa-exclamation-circle" style="color:#dc2626"></i>
                    <h3>Unable to load assessments</h3>
                    <p>${this.escapeHtml(String(message || 'Please try again.'))}</p>
                    <button type="button" onclick="window.examsModule?.refresh()">Retry</button>
                </div>`;
            const completedError = `<tr><td colspan="7" style="padding:35px;text-align:center;color:#94a3b8">Unable to load completed assessments. Please refresh.</td></tr>`;
            if (this.currentTable) this.currentTable.innerHTML = currentError;
            if (this.completedTable) this.completedTable.innerHTML = completedError;
        }
        
        hideLoading() {}
        
        escapeHtml(str) {
            if (!str) return '';
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }
        
        dispatchDashboardEvent() {
            const event = new CustomEvent('examsModuleReady', {
                detail: { count: this.allExams.length, timestamp: new Date().toISOString() }
            });
            document.dispatchEvent(event);
            
            window.examsData = {
                allExams: this.allExams,
                loaded: true,
                isTVETStudent: this.isTVETStudent,
                programCode: this.programCode,
                programName: this.programName
            };
        }
        
        refresh() {
            this.loadExams();
        }
    }
    
    // ============================================
    // 🚀 INITIALIZE
    // ============================================
    function initializeExamsModule() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                window.examsModule = new ExamsModule();
            });
        } else {
            window.examsModule = new ExamsModule();
        }
    }
    
    initializeExamsModule();
    window.loadExams = () => window.examsModule?.refresh();
    window.refreshAssessments = () => window.examsModule?.refresh();
    
    // ============================================
    // 📊 GRAPH TOGGLE FUNCTIONS - GLOBAL ACCESS
    // ============================================
    window.toggleGraphData = function(view) {
        if (window.examsModule) {
            window.examsModule.toggleGraphData(view);
        } else {
            console.warn('⚠️ ExamsModule not ready yet, retrying...');
            setTimeout(() => window.toggleGraphData(view), 500);
        }
    };
    
    window.updatePerformanceGraph = function() {
        if (window.examsModule) {
            window.examsModule.updatePerformanceGraph();
        } else {
            console.warn('⚠️ ExamsModule not ready yet, retrying...');
            setTimeout(window.updatePerformanceGraph, 500);
        }
    };
    
    console.log('✅ Exams module ready - upgraded Assessments UI, CAT/Exam states, NurseIQ review & performance chart!');
})();

// ============================================
// 🔄 FORCE DISPATCH EXAMS READY EVENT
// ============================================
(function ensureExamsReadyEvent() {
    console.log('📣 Ensuring examsModuleReady event...');
    
    const dispatchEvent = () => {
        if (window.examsModule && window.examsModule.allExams) {
            const event = new CustomEvent('examsModuleReady', {
                detail: { 
                    count: window.examsModule.allExams.length,
                    timestamp: new Date().toISOString(),
                    allExams: window.examsModule.allExams
                }
            });
            document.dispatchEvent(event);
            console.log('✅ examsModuleReady event dispatched');
            return true;
        }
        return false;
    };
    
    if (!dispatchEvent()) {
        setTimeout(() => {
            if (!dispatchEvent()) {
                setTimeout(dispatchEvent, 2000);
            }
        }, 500);
    }
})();

window.__examsReady = true;
window.__examsData = {
    allExams: window.examsModule?.allExams || [],
    loaded: true,
    timestamp: new Date().toISOString()
};

console.log('✅ Exams module fully loaded and ready');
