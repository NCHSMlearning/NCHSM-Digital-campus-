(function() {
    'use strict';
     
    console.log('✅ exams.js - COMPLETE FIXED VERSION WITH TIMER & ROUND BUTTONS');
    
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
            this.timerUpdateInterval = null;
            
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
        // ⏱️ COUNTDOWN TIMER - WITH HOURS, MINUTES, SECONDS
        // ============================================
        startCountdownTimer() {
            if (this.countdownInterval) clearInterval(this.countdownInterval);
            
            // Update every second
            this.countdownInterval = setInterval(() => {
                if (this.currentExams && this.currentExams.length > 0) {
                    this.updateAllCountdowns();
                }
            }, 1000);
            
            console.log('✅ Countdown timer started');
        }
        
        updateAllCountdowns() {
            const kenyaNow = getKenyaNow();
            let updated = false;
            
            this.currentExams.forEach(exam => {
                // Only update exams that are available
                if (exam.actionState === 'available' && exam.examStartDateTime && exam.examEndDateTime) {
                    if (kenyaNow >= exam.examStartDateTime && kenyaNow <= exam.examEndDateTime) {
                        const timeLeftMs = exam.examEndDateTime - kenyaNow;
                        
                        // Calculate hours, minutes, seconds
                        const hours = Math.floor(timeLeftMs / (1000 * 60 * 60));
                        const minutes = Math.floor((timeLeftMs % (1000 * 60 * 60)) / (1000 * 60));
                        const seconds = Math.floor((timeLeftMs % (1000 * 60)) / 1000);
                        
                        // Update the DOM
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
                                updated = true;
                            }
                        }
                    } else if (kenyaNow > exam.examEndDateTime) {
                        // Exam expired - update status
                        const rowElement = document.querySelector(`tr[data-exam-id="${exam.id}"]`);
                        if (rowElement) {
                            const timerElement = rowElement.querySelector('.exam-timer');
                            if (timerElement) {
                                timerElement.innerHTML = `
                                    <span class="timer-expired">
                                        <i class="fas fa-clock"></i> Expired
                                    </span>
                                `;
                            }
                            // Update the action button
                            const actionBtn = rowElement.querySelector('.exam-action-btn');
                            if (actionBtn) {
                                actionBtn.innerHTML = '<i class="fas fa-times-circle"></i> Missed';
                                actionBtn.className = 'exam-action-btn btn-missed';
                                actionBtn.disabled = true;
                            }
                        }
                    }
                } else if (exam.actionState === 'upcoming' && exam.examStartDateTime) {
                    // Show countdown to start
                    if (kenyaNow < exam.examStartDateTime) {
                        const timeToStart = exam.examStartDateTime - kenyaNow;
                        const hours = Math.floor(timeToStart / (1000 * 60 * 60));
                        const minutes = Math.floor((timeToStart % (1000 * 60 * 60)) / (1000 * 60));
                        const seconds = Math.floor((timeToStart % (1000 * 60)) / 1000);
                        
                        const rowElement = document.querySelector(`tr[data-exam-id="${exam.id}"]`);
                        if (rowElement) {
                            const timerElement = rowElement.querySelector('.exam-timer');
                            if (timerElement) {
                                timerElement.innerHTML = `
                                    <span class="timer-upcoming">
                                        <i class="fas fa-clock"></i>
                                        ${hours > 0 ? hours + 'h ' : ''}${minutes}m ${seconds}s
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
        
        applyDataFilter() {
            const kenyaNow = getKenyaNow();
            
            // First, update all exams with proper status based on current date
            this.allExams = this.allExams.map(exam => {
                // If exam date has passed and student didn't take it, mark as MISSED
                if (exam.examEndDateTime && kenyaNow > exam.examEndDateTime && !exam.hasGrade) {
                    exam.isCompleted = true;
                    exam.actionState = 'expired';
                    exam.gradeText = 'Missed';
                    exam.gradeClass = 'missed';
                    exam.buttonText = 'Missed';
                }
                // If exam date has passed and student took it but not released, mark as pending
                else if (exam.examEndDateTime && kenyaNow > exam.examEndDateTime && exam.hasGrade && !exam.isReleased) {
                    exam.isCompleted = true;
                    exam.actionState = 'pending_release';
                    exam.gradeText = 'Pending Release';
                    exam.gradeClass = 'pending';
                }
                // If exam date is in the future, keep as current
                else if (exam.examStartDateTime && kenyaNow < exam.examStartDateTime) {
                    exam.isCompleted = false;
                    exam.actionState = 'upcoming';
                }
                // If exam is currently available
                else if (exam.examStartDateTime && kenyaNow >= exam.examStartDateTime && kenyaNow <= exam.examEndDateTime) {
                    exam.isCompleted = false;
                    exam.actionState = 'available';
                }
                return exam;
            });
            
            // Now filter into current and completed
            this.currentExams = this.allExams.filter(exam => 
                !exam.isCompleted && 
                exam.actionState !== 'expired' && 
                exam.actionState !== 'pending_release' &&
                exam.actionState !== 'completed'
            );
            
            this.completedExams = this.allExams.filter(exam => 
                exam.isCompleted || 
                exam.actionState === 'expired' || 
                exam.actionState === 'pending_release' ||
                exam.actionState === 'completed'
            );
            
            if (this.currentFilter === 'current') {
                this.completedExams = [];
            } else if (this.currentFilter === 'completed') {
                this.currentExams = [];
            }
            
            this.displayTables();
            this.updateCounts();
            this.updatePerformanceSummary();
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
        // 🔧 PROCESS EXAMS DATA - COMPLETE FIXED VERSION
        // ============================================
        processExamsData(exams, grades) {
            // Block/Term normalization map
            const blockMap = {
                // KRCHN Blocks
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
                
                // TVET Terms
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
            
            // Get student info
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
            
            // Build grade map
            const gradeMap = new Map();
            grades.forEach(grade => {
                const gradeWithId = {
                    ...grade,
                    id: grade.id || grade._id || grade.grade_id || null
                };
                gradeMap.set(String(grade.exam_id), gradeWithId);
            });
            
            // Filter exams - INTAKE FIRST with Block/Term support
            const filteredExams = exams.filter(exam => {
                const rawExamBlock = exam.block || exam.block_term || exam.term || 'General';
                const examBlockOrTerm = blockMap[rawExamBlock] || rawExamBlock;
                const examIntake = exam.intake_year;
                const examProgram = exam.program_type || exam.target_program;
                
                const hasGrade = gradeMap.has(String(exam.id));
                const intakeMatch = examIntake == studentIntake;
                
                // Block/Term match
                let blockTermMatch = false;
                
                if (examBlockOrTerm === 'General' || examBlockOrTerm === 'All' || studentBlockOrTerm === 'General') {
                    blockTermMatch = true;
                } else if (examBlockOrTerm === studentBlockOrTerm) {
                    blockTermMatch = true;
                } else if (isTVET) {
                    // TVET: Match by Year and Term
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
                    // KRCHN: Match by Block number
                    const examNum = examBlockOrTerm.match(/\d+/);
                    const studentNum = studentBlockOrTerm.match(/\d+/);
                    if (examNum && studentNum && examNum[0] === studentNum[0]) {
                        blockTermMatch = true;
                    } else if (examBlockOrTerm.includes(studentBlockOrTerm) || studentBlockOrTerm.includes(examBlockOrTerm)) {
                        blockTermMatch = true;
                    }
                }
                
                // Program match
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
                
                // Decision rules
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
            
            // Build exam groups
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
            
            // Process each exam
            this.allExams = Array.from(examGroups.values()).map(group => {
                const grade = group.grade;
                const gradeId = grade?.id || grade?._id || grade?.grade_id || null;
                
                // Determine release status
                let isReleased = false;
                let isPendingRelease = false;
                
                if (grade && (grade.result_status === 'PASS' || grade.result_status === 'FAIL')) {
                    isReleased = true;
                    isPendingRelease = false;
                }
                
                if (gradeId && this.releasedResults.has(String(gradeId))) {
                    isReleased = true;
                }
                if (grade?.result_status === 'RELEASED') {
                    isReleased = true;
                }
                if (grade?.result_status === 'PENDING_REVIEW' || grade?.result_status === 'PENDING') {
                    isPendingRelease = true;
                    isReleased = false;
                }
                if (group.status === 'Released' || group.status === 'Completed') {
                    if (grade && grade.marks !== null) {
                        isReleased = true;
                    }
                }
                
                // Check if TVET
                const examProgram = group.program_type || '';
                const isExamTVET = this.TVET_PROGRAMS.includes(examProgram) || examProgram === 'TVET';
                
                const combinedProgram = isExamTVET ? 'TVET Program' : 'KRCHN Program';
                const programBadgeClass = isExamTVET ? 'badge-tvet' : 'badge-krchn';
                const programIcon = isExamTVET ? 'fa-tools' : 'fa-graduation-cap';
                
                const combinedCourse = Array.from(group.course_levels).join(' · ') || group.course || 'General';
                const blockTermDisplay = isTVET ? (this.userTerm || group.block_term || 'Year 1 Term 1') : (group.block_term || 'General');
                
                // Extract scores
                const cat1Score = grade?.cat_1_score ?? grade?.cat_score ?? null;
                const cat2Score = grade?.cat_2_score ?? null;
                const finalScore = grade?.exam_score ?? null;
                const totalPercentage = grade?.total_score ? parseFloat(grade.total_score) : null;
                const marks = grade?.marks ? parseFloat(grade.marks) : null;
                
                const hasTaken = grade && (grade.result_status === 'PASS' || grade.result_status === 'FAIL' || 
                                          grade.result_status === 'RELEASED' || grade.result_status === 'PENDING_REVIEW' || 
                                          grade.result_status === 'PENDING' || marks !== null || totalPercentage !== null);
                
                const examType = (group.exam_type || '').toUpperCase();
                const isCatExam = examType.includes('CAT');
                
                // Calculate exam date/time
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
                
                // Determine status based on date
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
                
                // Determine final state
                let finalStatus = examStatus;
                let finalCanStart = false;
                let finalMessage = statusMessage;
                let buttonText = '';
                let isCompleted = false;
                let displayPercentage = null;
                let gradeText = 'Not Started';
                let gradeClass = 'pending';
                let displayScore = 0;
                let totalMarks = group.marks_out_of || 100;
                
                const isClosed = group.status === 'Completed' || group.status === 'Closed';
                const isExpired = examStatus === 'expired' || isClosed;
                
                // 1. RELEASED + STUDENT TOOK IT
                if (isReleased && hasTaken) {
                    isCompleted = true;
                    finalStatus = 'completed';
                    finalCanStart = false;
                    finalMessage = '✅ Results Released';
                    buttonText = 'View Results';
                    
                    if (isCatExam) {
                        displayScore = cat1Score || cat2Score || marks || 0;
                        displayScore = Math.min(displayScore, 30);
                    } else {
                        displayScore = marks || totalPercentage || 0;
                        displayScore = Math.min(displayScore, totalMarks);
                    }
                    
                    const calcPercentage = totalMarks > 0 ? (displayScore / totalMarks) * 100 : 0;
                    displayPercentage = Math.round(calcPercentage);
                    
                    if (displayPercentage >= 85) {
                        gradeText = 'Distinction';
                        gradeClass = 'distinction';
                    } else if (displayPercentage >= 75) {
                        gradeText = 'Credit';
                        gradeClass = 'credit';
                    } else if (displayPercentage >= 60) {
                        gradeText = 'Pass';
                        gradeClass = 'pass';
                    } else if (displayPercentage > 0) {
                        gradeText = 'Fail';
                        gradeClass = 'fail';
                    } else {
                        gradeText = 'Completed';
                        gradeClass = 'completed';
                    }
                }
                // 2. CLOSED + NOT TAKEN = MISSED
                else if (isExpired && !hasTaken) {
                    finalStatus = 'expired';
                    finalCanStart = false;
                    finalMessage = '🔒 Exam Closed - You did not take this exam';
                    buttonText = 'Missed';
                    isCompleted = true;
                    gradeText = 'Missed';
                    gradeClass = 'missed';
                    displayPercentage = null;
                }
                // 3. PENDING RELEASE
                else if (isPendingRelease) {
                    finalStatus = 'pending_release';
                    finalCanStart = false;
                    finalMessage = '⏳ Pending Release';
                    buttonText = 'Pending';
                    isCompleted = true;
                    gradeText = 'Pending Release';
                    gradeClass = 'pending';
                    displayPercentage = null;
                }
                // 4. TOOK BUT NOT RELEASED
                else if (hasTaken && !isReleased) {
                    finalStatus = 'pending_release';
                    finalCanStart = false;
                    finalMessage = '⏳ Awaiting Admin Review';
                    buttonText = 'Pending';
                    isCompleted = true;
                    gradeText = 'Pending Review';
                    gradeClass = 'pending';
                    displayPercentage = null;
                }
                // 5. AVAILABLE
                else if (examStatus === 'available' && !hasTaken && hasValidLink) {
                    finalStatus = 'available';
                    finalCanStart = true;
                    finalMessage = statusMessage;
                    buttonText = 'Start Exam';
                    isCompleted = false;
                }
                // 6. UPCOMING
                else if (examStatus === 'upcoming' && !hasTaken) {
                    finalStatus = 'upcoming';
                    finalCanStart = false;
                    finalMessage = countdownText || 'Coming Soon';
                    buttonText = 'Coming Soon';
                    isCompleted = false;
                }
                // 7. DEFAULT
                else {
                    finalStatus = 'pending';
                    buttonText = 'Not Available';
                    isCompleted = false;
                }
                
                // Format displays
                let cat1Display = '--';
                let cat2Display = '--';
                let finalDisplay = '--';
                
                if (isReleased || hasTaken) {
                    if (isCatExam) {
                        if (cat1Score !== null && cat1Score !== undefined) cat1Display = `${cat1Score}`;
                        if (cat2Score !== null && cat2Score !== undefined) cat2Display = `${cat2Score}`;
                        if (isReleased && displayScore > 0) {
                            cat1Display = `${displayScore}/${totalMarks}`;
                            cat2Display = `${displayScore}/${totalMarks}`;
                        }
                    } else {
                        if (cat1Score !== null && cat1Score !== undefined) cat1Display = `${cat1Score}`;
                        if (cat2Score !== null && cat2Score !== undefined) cat2Display = `${cat2Score}`;
                        if (finalScore !== null && finalScore !== undefined) finalDisplay = `${finalScore}`;
                    }
                }
                
                const formattedGradedDate = grade?.graded_at ? 
                    formatKenyaDate(new Date(new Date(grade.graded_at).getTime() + (3 * 60 * 60 * 1000))) : '--';
                
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
                    hasGrade: hasTaken,
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
                    displayScore: displayScore,
                    examDate: group.exam_date,
                    examStartTime: group.exam_start_time,
                    formattedExamDateTime: formattedExamDateTime,
                    formattedGradedDate: formattedGradedDate,
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
            
            // Log results
            const releasedCount = this.allExams.filter(e => e.isReleased).length;
            const pendingCount = this.allExams.filter(e => e.actionState === 'pending_release').length;
            const currentCount = this.allExams.filter(e => !e.isCompleted && e.actionState !== 'expired' && e.actionState !== 'pending_release').length;
            const completedCount = this.allExams.filter(e => e.isCompleted || e.actionState === 'expired' || e.actionState === 'pending_release').length;
            const missedCount = this.allExams.filter(e => e.gradeClass === 'missed').length;
            
            console.log(`✅ Processed ${this.allExams.length} exams:`);
            console.log(`   📊 Released: ${releasedCount}`);
            console.log(`   ⏳ Pending Release: ${pendingCount}`);
            console.log(`   📝 Current: ${currentCount}`);
            console.log(`   ✅ Completed: ${completedCount}`);
            console.log(`   ❌ Missed: ${missedCount}`);
        }
        
        // ============================================
        // 📊 DISPLAY TABLES - WITH ROUND BUTTONS & TIMER
        // ============================================
        displayTables() {
            this.displayCurrentTable();
            this.displayCompletedTable();
            this.updateCounts();
            this.updateEmptyStates();
            
            // Start timer updates after rendering
            setTimeout(() => this.updateAllCountdowns(), 100);
        }
        
        displayCurrentTable() {
            if (!this.currentTable) return;
            
            const activeExams = this.currentExams.filter(exam => 
                !exam.isCompleted && 
                exam.actionState !== 'expired' && 
                exam.actionState !== 'pending_release'
            );
            
            if (activeExams.length === 0) {
                this.currentTable.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center text-muted py-4">
                            <i class="fas fa-inbox fa-2x d-block mb-2"></i>
                            No current assessments available.
                        </td>
                    </tr>
                `;
                return;
            }
            
            const userId = this.userId || window.db?.currentUserId || '';
            const kenyaNow = getKenyaNow();
            
            const html = activeExams.map(exam => {
                const isCatExam = exam.isCatExam;
                const isTVET = exam.isTVET || this.isTVETStudent;
                
                let examDisplayName = 'Assessment';
                if (typeof exam.exam_name === 'string' && exam.exam_name !== '[object Object]' && exam.exam_name !== '') {
                    examDisplayName = exam.exam_name;
                } else if (typeof exam.title === 'string' && exam.title !== '[object Object]' && exam.title !== '') {
                    examDisplayName = exam.title;
                } else {
                    examDisplayName = 'Assessment';
                }
                
                // Check if exam is actually expired (date passed)
                let isActuallyExpired = false;
                if (exam.examEndDateTime && kenyaNow > exam.examEndDateTime) {
                    isActuallyExpired = true;
                }
                
                // ============================================
                // 🎯 ROUND ACTION BUTTON WITH TIMER
                // ============================================
                let actionHtml = '';
                let timerHtml = '';
                let timerClass = '';
                
                if (isActuallyExpired) {
                    actionHtml = `
                        <span class="exam-action-btn btn-missed">
                            <i class="fas fa-times-circle"></i> Missed
                        </span>
                    `;
                    timerHtml = `
                        <span class="exam-timer timer-expired">
                            <i class="fas fa-clock"></i> Expired
                        </span>
                    `;
                } else if (exam.actionState === 'available' && exam.canTakeExam && exam.hasValidLink) {
                    let examLink = exam.examLink;
                    const baseUrl = examLink.split('?')[0];
                    const params = new URLSearchParams();
                    params.append('user_id', userId);
                    params.append('exam_id', exam.id);
                    const fullUrl = baseUrl + '?' + params.toString();
                    
                    actionHtml = `
                        <a href="${fullUrl}" target="_blank" 
                           class="exam-action-btn btn-start" 
                           onclick="sessionStorage.setItem('returningFromExam', 'true'); sessionStorage.setItem('examUserId', '${userId}');">
                            <i class="fas fa-play"></i> Start Exam
                        </a>
                    `;
                    
                    if (exam.timeRemainingMs > 0) {
                        const hours = Math.floor(exam.timeRemainingMs / (1000 * 60 * 60));
                        const minutes = Math.floor((exam.timeRemainingMs % (1000 * 60 * 60)) / (1000 * 60));
                        const seconds = Math.floor((exam.timeRemainingMs % (1000 * 60)) / 1000);
                        timerHtml = `
                            <span class="exam-timer timer-active">
                                <i class="fas fa-hourglass-half"></i>
                                ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}
                            </span>
                        `;
                        timerClass = 'has-timer';
                    }
                } else if (exam.actionState === 'upcoming') {
                    const timeToStart = exam.examStartDateTime - kenyaNow;
                    const hours = Math.floor(timeToStart / (1000 * 60 * 60));
                    const minutes = Math.floor((timeToStart % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((timeToStart % (1000 * 60)) / 1000);
                    const countdownText = `${hours > 0 ? hours + 'h ' : ''}${minutes}m ${seconds}s`;
                    
                    actionHtml = `
                        <span class="exam-action-btn btn-upcoming">
                            <i class="fas fa-clock"></i> ${countdownText || 'Coming Soon'}
                        </span>
                    `;
                    timerHtml = `
                        <span class="exam-timer timer-upcoming">
                            <i class="fas fa-clock"></i> ${countdownText}
                        </span>
                    `;
                    timerClass = 'has-timer';
                } else {
                    actionHtml = `
                        <span class="exam-action-btn btn-disabled">
                            <i class="fas fa-lock"></i> ${exam.buttonText || 'Not Available'}
                        </span>
                    `;
                }
                
                // Status badge
                let statusHtml = `<span class="status-badge ${exam.gradeClass}">${exam.gradeText}</span>`;
                
                // Assessment info
                let assessmentCell = `
                    <div class="assessment-info-box">
                        <div class="assessment-row-top">
                            <div class="assessment-name">
                                <strong>${this.escapeHtml(examDisplayName)}</strong>
                                <span class="${isCatExam ? 'badge-cat' : 'badge-final'}">${isCatExam ? 'CAT' : 'Exam'}</span>
                                ${isTVET ? '<span class="badge-tvet-small">TVET</span>' : ''}
                            </div>
                        </div>
                        ${exam.formattedExamDateTime !== 'TBA' ? `
                        <div class="exam-datetime">
                            <i class="fas fa-calendar-clock"></i> ${exam.formattedExamDateTime}
                        </div>` : ''}
                        ${isActuallyExpired ? `
                        <div class="exam-expired">
                            <i class="fas fa-exclamation-circle"></i> This exam has expired
                        </div>` : ''}
                    </div>
                `;
                
                return `
                    <tr class="assessment-row ${isCatExam ? 'cat-exam' : 'final-exam'} ${timerClass} ${isActuallyExpired ? 'row-expired' : ''}" data-exam-id="${exam.id}">
                        <td class="assessment-cell">${assessmentCell}</td>
                        <td class="text-center status-cell">${statusHtml}</td>
                        <td class="text-center">${exam.cat1Display}</td>
                        <td class="text-center">${exam.cat2Display}</td>
                        <td class="text-center">${exam.finalDisplay}</td>
                        <td class="text-center total-cell">${exam.totalPercentage !== null ? exam.totalPercentage.toFixed(1) + '%' : '--'}</td>
                        <td class="text-center action-cell">
                            ${actionHtml}
                            ${timerHtml}
                        </td>
                    </tr>
                `;
            }).join('');
            
            this.currentTable.innerHTML = html;
        }
        
        displayCompletedTable() {
            if (!this.completedTable) return;
            
            const completedReleased = this.completedExams.filter(exam => 
                exam.isCompleted || exam.isReleased || exam.actionState === 'expired' || exam.actionState === 'pending_release'
            );
            
            if (completedReleased.length === 0) {
                this.completedTable.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center text-muted py-4">
                            <i class="fas fa-inbox fa-2x d-block mb-2"></i>
                            No completed assessments yet.
                        </td>
                    </tr>
                `;
                return;
            }
            
            const html = completedReleased.map(exam => {
                const isCatExam = exam.isCatExam;
                const isTVET = exam.isTVET || this.isTVETStudent;
                
                let examDisplayName = 'Assessment';
                if (typeof exam.exam_name === 'string' && exam.exam_name !== '[object Object]' && exam.exam_name !== '') {
                    examDisplayName = exam.exam_name;
                } else if (typeof exam.title === 'string' && exam.title !== '[object Object]' && exam.title !== '') {
                    examDisplayName = exam.title;
                } else {
                    examDisplayName = 'Assessment';
                }
                
                let totalMarks = exam.marks_out_of || (isCatExam ? 30 : 100);
                let displayScore = 0;
                let displayPercentage = '--';
                
                if (exam.isReleased && exam.hasGrade) {
                    if (isCatExam) {
                        displayScore = exam.cat1Score || exam.cat2Score || exam.marks || 0;
                    } else {
                        displayScore = exam.marks || exam.totalPercentage || 0;
                    }
                    displayScore = Math.min(displayScore, totalMarks);
                    const calcPct = totalMarks > 0 ? Math.round((displayScore / totalMarks) * 100) : 0;
                    displayPercentage = calcPct + '%';
                }
                
                let displayGrade = exam.gradeText || 'Not Started';
                let displayClass = exam.gradeClass || 'pending';
                
                if (exam.isReleased && exam.hasGrade && displayPercentage !== '--') {
                    const pct = parseInt(displayPercentage);
                    if (pct >= 85) { displayGrade = 'Distinction'; displayClass = 'distinction'; }
                    else if (pct >= 75) { displayGrade = 'Credit'; displayClass = 'credit'; }
                    else if (pct >= 60) { displayGrade = 'Pass'; displayClass = 'pass'; }
                    else if (pct > 0) { displayGrade = 'Fail'; displayClass = 'fail'; }
                }
                
                if (exam.actionState === 'pending_release') {
                    displayGrade = 'Pending Release';
                    displayClass = 'pending';
                }
                if (exam.actionState === 'expired' && !exam.hasGrade) {
                    displayGrade = 'Missed';
                    displayClass = 'missed';
                }
                
                // Status badges
                let statusBadges = '';
                if (exam.isReleased) {
                    statusBadges = '<span class="badge-released">✅ Released</span>';
                } else if (exam.actionState === 'pending_release') {
                    statusBadges = '<span class="badge-pending">⏳ Pending</span>';
                }
                
                let assessmentCell = `
                    <div class="assessment-info-box">
                        <div class="assessment-row-top">
                            <div class="assessment-name">
                                <strong>${this.escapeHtml(examDisplayName)}</strong>
                                <span class="${isCatExam ? 'badge-cat' : 'badge-final'}">${isCatExam ? 'CAT' : 'Exam'}</span>
                                ${isTVET ? '<span class="badge-tvet-small">TVET</span>' : ''}
                                ${statusBadges}
                            </div>
                        </div>
                        <div class="exam-datetime">
                            <i class="fas fa-calendar-check"></i> ${exam.formattedGradedDate !== '--' ? exam.formattedGradedDate : exam.formattedExamDateTime}
                        </div>
                        ${exam.isReleased && exam.hasGrade ? `
                        <div class="exam-score">
                            📊 ${displayScore} / ${totalMarks} marks
                        </div>` : ''}
                        ${exam.actionState === 'pending_release' ? `
                        <div class="exam-pending">
                            ⏳ Results pending release
                        </div>` : ''}
                    </div>
                `;
                
                let cat1Display = '--';
                let cat2Display = '--';
                let finalDisplay = '--';
                
                if (exam.isReleased && exam.hasGrade) {
                    if (isCatExam) {
                        cat1Display = `${displayScore}/${totalMarks}`;
                        cat2Display = '--';
                    } else {
                        if (exam.cat1Score) cat1Display = `${exam.cat1Score}`;
                        if (exam.cat2Score) cat2Display = `${exam.cat2Score}`;
                        if (exam.finalScore) finalDisplay = `${exam.finalScore}`;
                    }
                } else if (exam.actionState === 'pending_release') {
                    cat1Display = '🔒';
                    cat2Display = '🔒';
                    finalDisplay = '🔒';
                }
                
                let gradeBadge = `<span class="grade-badge ${displayClass}">${displayGrade}</span>`;
                
                // ============================================
                // 🎯 ROUND ACTION BUTTON FOR COMPLETED
                // ============================================
                let actionHtml = '';
                if (exam.isReleased && exam.hasGrade) {
                    actionHtml = `
                        <button class="exam-action-btn btn-view" onclick="window.examsModule?.viewDetailedResults(${exam.id})">
                            <i class="fas fa-clipboard-list"></i> Details
                        </button>
                    `;
                } else if (exam.actionState === 'pending_release') {
                    actionHtml = `
                        <span class="exam-action-btn btn-pending">
                            <i class="fas fa-clock"></i> Pending
                        </span>
                    `;
                } else if (exam.actionState === 'expired') {
                    actionHtml = `
                        <span class="exam-action-btn btn-missed">
                            <i class="fas fa-times-circle"></i> Missed
                        </span>
                    `;
                } else {
                    actionHtml = `
                        <span class="exam-action-btn btn-disabled">
                            <i class="fas fa-check-circle"></i> ${exam.gradeText || 'Completed'}
                        </span>
                    `;
                }
                
                let rowClass = 'assessment-row';
                if (isCatExam) rowClass += ' cat-exam';
                else rowClass += ' final-exam';
                if (exam.isReleased) rowClass += ' row-released';
                if (exam.actionState === 'pending_release') rowClass += ' row-pending';
                
                return `
                    <tr class="${rowClass}" data-exam-id="${exam.id}">
                        <td class="assessment-cell">${assessmentCell}</td>
                        <td class="text-center status-cell">${gradeBadge}</td>
                        <td class="text-center">${cat1Display}</td>
                        <td class="text-center">${cat2Display}</td>
                        <td class="text-center">${finalDisplay}</td>
                        <td class="text-center total-cell"><strong>${displayPercentage}</strong></td>
                        <td class="text-center grade-cell">${actionHtml}</td>
                    </tr>
                `;
            }).join('');
            
            this.completedTable.innerHTML = html;
        }
        
        // ============================================
        // 📊 VIEW DETAILED RESULTS
        // ============================================
        async viewDetailedResults(examId) {
            console.log('🔍 viewDetailedResults called with examId:', examId);
            
            try {
                const supabase = window.db?.supabase;
                if (!supabase) {
                    this.showToast('Database connection not available', 'warning');
                    return;
                }
                
                const userId = this.userId || window.db?.currentUserId;
                if (!userId) {
                    this.showToast('Please log in to view results', 'warning');
                    return;
                }
                
                // Get exam details
                const { data: exam, error: examError } = await supabase
                    .from('exams')
                    .select('*')
                    .eq('id', parseInt(examId))
                    .single();
                
                if (examError) throw examError;
                
                // Get questions
                const { data: questions, error: questionsError } = await supabase
                    .from('exam_questions')
                    .select('*')
                    .eq('exam_id', parseInt(examId))
                    .order('question_number', { ascending: true });
                
                if (questionsError) throw questionsError;
                
                // Get answers
                const { data: answers, error: answersError } = await supabase
                    .from('exam_grades')
                    .select('*')
                    .eq('student_id', userId)
                    .eq('exam_id', parseInt(examId))
                    .neq('question_id', '00000000-0000-0000-0000-000000000000');
                
                if (answersError) throw answersError;
                
                // Get overall grade
                const { data: grade, error: gradeError } = await supabase
                    .from('exam_grades')
                    .select('*')
                    .eq('student_id', userId)
                    .eq('exam_id', parseInt(examId))
                    .eq('question_id', '00000000-0000-0000-0000-000000000000')
                    .single();
                
                if (gradeError && gradeError.code !== 'PGRST116') throw gradeError;
                
                // Build question review
                const questionReview = (questions || []).map(q => {
                    const answer = answers?.find(a => a.question_id === q.id);
                    const options = [];
                    if (q.option_a) options.push({ label: 'A', value: q.option_a });
                    if (q.option_b) options.push({ label: 'B', value: q.option_b });
                    if (q.option_c) options.push({ label: 'C', value: q.option_c });
                    if (q.option_d) options.push({ label: 'D', value: q.option_d });
                    
                    return {
                        question_text: q.question_text || 'Question ' + q.id,
                        options: options,
                        student_answer: answer?.selected_answer || 'Not answered',
                        correct_answer: q.correct_answer || 'N/A',
                        is_correct: answer?.selected_answer === q.correct_answer,
                        explanation: q.explanation || null,
                        marks_obtained: answer?.marks || 0,
                        total_marks: q.marks || 1
                    };
                });
                
                const totalCorrect = questionReview.filter(q => q.is_correct).length;
                const totalQuestions = questionReview.length;
                const score = grade?.marks || 0;
                const totalMarks = exam?.total_marks || 100;
                const percentage = totalMarks > 0 ? ((score / totalMarks) * 100).toFixed(1) : '0.0';
                const passed = parseFloat(percentage) >= (exam?.pass_mark || 60);
                
                // Build questions HTML
                let questionsHtml = '';
                if (questionReview.length === 0) {
                    questionsHtml = `
                        <div style="text-align: center; padding: 30px; color: #94A3B8;">
                            <i class="fas fa-question-circle" style="font-size: 2rem; display: block; margin-bottom: 10px;"></i>
                            <p>No question data available for this exam.</p>
                        </div>
                    `;
                } else {
                    questionReview.forEach((q, index) => {
                        const isCorrect = q.is_correct;
                        const icon = isCorrect ? '✅' : '❌';
                        const bgColor = isCorrect ? '#F0FDF4' : '#FEF2F2';
                        const borderColor = isCorrect ? '#D1FAE5' : '#FEE2E2';
                        
                        let optionsHtml = '';
                        if (q.options && q.options.length > 0) {
                            optionsHtml = '<div style="margin-top: 8px; display: flex; flex-direction: column; gap: 4px; font-size: 0.9rem;">';
                            q.options.forEach(opt => {
                                const isStudentAnswer = opt.label === q.student_answer;
                                const isCorrectAnswer = opt.label === q.correct_answer;
                                let style = 'padding: 6px 12px; border-radius: 6px; border: 1px solid #E2E8F0;';
                                let indicator = '';
                                
                                if (isStudentAnswer && isCorrectAnswer) {
                                    style += ' background: #D1FAE5; border-color: #38A169; font-weight: 600;';
                                    indicator = ' ✅ Your answer (Correct!)';
                                } else if (isStudentAnswer && !isCorrectAnswer) {
                                    style += ' background: #FEE2E2; border-color: #DC2626; font-weight: 600;';
                                    indicator = ' ❌ Your answer (Wrong)';
                                } else if (isCorrectAnswer) {
                                    style += ' background: #D1FAE5; border-color: #38A169;';
                                    indicator = ' ✅ Correct answer';
                                } else {
                                    style += ' background: #F8FAFC; border-color: #E2E8F0;';
                                }
                                
                                optionsHtml += `
                                    <div style="${style}">
                                        <strong>${opt.label}.</strong> ${this.escapeHtml(opt.value)}
                                        ${indicator}
                                    </div>
                                `;
                            });
                            optionsHtml += '</div>';
                        }
                        
                        questionsHtml += `
                            <div style="background: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 8px; padding: 12px 16px; margin-bottom: 10px;">
                                <div style="font-weight: 600; color: #0A3D62; margin-bottom: 4px;">
                                    ${icon} Q${index + 1}: ${this.escapeHtml(q.question_text)}
                                </div>
                                <div style="display: flex; gap: 16px; font-size: 0.85rem; color: #64748B; margin-bottom: 6px; flex-wrap: wrap;">
                                    <span>Marks: ${q.marks_obtained}/${q.total_marks}</span>
                                    <span style="color: ${isCorrect ? '#38A169' : '#DC2626'}; font-weight: 600;">
                                        ${isCorrect ? '✓ Correct' : '✗ Wrong'}
                                    </span>
                                    <span>Your answer: <strong style="color: ${isCorrect ? '#38A169' : '#DC2626'};">${q.student_answer}</strong></span>
                                    <span>Correct answer: <strong style="color: #38A169;">${q.correct_answer}</strong></span>
                                </div>
                                ${optionsHtml}
                                ${q.explanation ? `<div style="margin-top: 8px; font-size: 0.85rem; color: #64748B; background: white; padding: 8px; border-radius: 4px; border-left: 3px solid #3B82F6;">💡 ${this.escapeHtml(q.explanation)}</div>` : ''}
                            </div>
                        `;
                    });
                }
                
                // Show modal
                const modalHtml = `
                    <div id="detailedResultsModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); z-index: 100000; display: flex; align-items: center; justify-content: center; padding: 20px; overflow-y: auto;">
                        <div style="background: white; border-radius: 16px; max-width: 750px; width: 100%; max-height: 90vh; overflow-y: auto; padding: 24px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                                <h2 style="margin: 0; color: #0A3D62;">
                                    <i class="fas fa-clipboard-list"></i> Detailed Exam Review
                                </h2>
                                <button onclick="document.getElementById('detailedResultsModal').remove()" 
                                        style="background: none; border: none; font-size: 1.8rem; cursor: pointer; color: #94A3B8; padding: 0 8px; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; transition: background 0.2s;"
                                        onmouseover="this.style.background='#F1F5F9'" onmouseout="this.style.background='transparent'">
                                    &times;
                                </button>
                            </div>
                            
                            <div style="text-align: center; padding: 16px; background: #F8FAFC; border-radius: 12px; margin-bottom: 20px;">
                                <h3 style="margin: 0; color: #0A3D62;">${this.escapeHtml(exam?.exam_name || 'Exam')}</h3>
                                <div style="font-size: 2.5rem; font-weight: 700; color: ${passed ? '#38A169' : '#DC2626'};">
                                    ${percentage}%
                                </div>
                                <div style="font-weight: 600; color: ${passed ? '#38A169' : '#DC2626'};">
                                    ${passed ? '✅ PASS' : '❌ FAIL'}
                                </div>
                                <div style="display: flex; justify-content: center; gap: 24px; margin-top: 12px; flex-wrap: wrap;">
                                    <div><span style="color: #64748B;">Score:</span> <strong>${score}/${totalMarks}</strong></div>
                                    <div><span style="color: #64748B;">Correct:</span> <strong style="color: #38A169;">${totalCorrect}/${totalQuestions}</strong></div>
                                    <div><span style="color: #64748B;">Wrong:</span> <strong style="color: #DC2626;">${totalQuestions - totalCorrect}</strong></div>
                                </div>
                            </div>
                            
                            <h4 style="color: #0A3D62; margin-bottom: 12px;">📝 Question-by-Question Review</h4>
                            ${questionsHtml}
                            
                            <div style="margin-top: 16px; display: flex; gap: 10px; justify-content: flex-end; border-top: 1px solid #E2E8F0; padding-top: 16px;">
                                <button onclick="document.getElementById('detailedResultsModal').remove()" 
                                        style="padding: 10px 24px; background: #0A3D62; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500;">
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                
                const existing = document.getElementById('detailedResultsModal');
                if (existing) existing.remove();
                document.body.insertAdjacentHTML('beforeend', modalHtml);
                document.getElementById('detailedResultsModal').addEventListener('click', function(e) {
                    if (e.target === this) this.remove();
                });
                
            } catch (error) {
                console.error('❌ Error loading detailed results:', error);
                this.showToast('Error loading exam details: ' + error.message, 'error');
            }
        }
        
        // ============================================
        // 📊 PERFORMANCE SUMMARY
        // ============================================
        updateCounts() {
            const currentCount = this.currentExams.length;
            const completedCount = this.completedExams.length;
            
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
            } else {
                if (this.completedAverage) this.completedAverage.textContent = 'Average: --';
                if (this.overallAverage) this.overallAverage.textContent = '--';
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
                return;
            }
            
            const percentages = completedReleased.map(e => e.totalPercentage);
            const best = Math.max(...percentages);
            const lowest = Math.min(...percentages);
            const average = percentages.reduce((a, b) => a + b, 0) / percentages.length;
            
            const distinctions = completedReleased.filter(e => e.totalPercentage >= 85).length;
            const credits = completedReleased.filter(e => e.totalPercentage >= 75 && e.totalPercentage < 85).length;
            const passes = completedReleased.filter(e => e.totalPercentage >= 60 && e.totalPercentage < 75).length;
            const fails = completedReleased.filter(e => e.totalPercentage < 60).length;
            
            const passed = distinctions + credits + passes;
            const passRateValue = completedReleased.length > 0 ? (passed / completedReleased.length) * 100 : 0;
            
            const examDates = completedReleased
                .map(e => e.examStartDateTime || e.examDate)
                .filter(d => d)
                .sort((a, b) => new Date(a) - new Date(b));
            
            const firstDate = examDates.length > 0 ? examDates[0] : null;
            const latestDate = examDates.length > 0 ? examDates[examDates.length - 1] : null;
            
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
            const distinctionCount = completedReleased.filter(e => e.totalPercentage >= 85).length;
            const creditCount = completedReleased.filter(e => e.totalPercentage >= 75 && e.totalPercentage < 85).length;
            const passCount = completedReleased.filter(e => e.totalPercentage >= 60 && e.totalPercentage < 75).length;
            
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
            const loadingHTML = `
                <tr class="loading">
                    <td colspan="7">
                        <div class="loading-content" style="text-align: center; padding: 30px;">
                            <div class="loading-spinner" style="display: inline-block; width: 40px; height: 40px; border: 4px solid #E2E8F0; border-top-color: #0A3D62; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                            <p style="margin-top: 10px; color: #64748B;">Loading assessments...</p>
                        </div>
                    </td>
                </tr>
            `;
            if (this.currentTable) this.currentTable.innerHTML = loadingHTML;
            if (this.completedTable) this.completedTable.innerHTML = loadingHTML;
        }
        
        showError(message) {
            const errorHTML = `
                <tr class="error">
                    <td colspan="7">
                        <div class="error-content" style="text-align: center; padding: 30px;">
                            <i class="fas fa-exclamation-circle" style="font-size: 2rem; color: #DC2626;"></i>
                            <p style="margin-top: 10px; color: #64748B;">${message}</p>
                            <button onclick="window.examsModule?.refresh()" 
                                    style="margin-top: 10px; padding: 8px 20px; background: #0A3D62; color: white; border: none; border-radius: 8px; cursor: pointer;">
                                Retry
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            if (this.currentTable) this.currentTable.innerHTML = errorHTML;
            if (this.completedTable) this.completedTable.innerHTML = errorHTML;
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
    
    console.log('✅ Exams module ready - TVET, Timer & Round Buttons FIXED!');
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
    
    // Try immediately
    if (!dispatchEvent()) {
        // Try after 500ms
        setTimeout(() => {
            if (!dispatchEvent()) {
                // Try after 2s
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

// ============================================
// 🎨 CSS for Round Buttons & Timer (Add to your CSS)
// ============================================
const style = document.createElement('style');
style.textContent = `
    /* Round Action Buttons */
    .exam-action-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        border-radius: 50px;
        border: none;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        text-decoration: none;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        min-width: 80px;
        justify-content: center;
    }
    
    .exam-action-btn i {
        font-size: 13px;
    }
    
    .btn-start {
        background: linear-gradient(135deg, #38A169, #2F855A);
        color: white;
    }
    .btn-start:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(56, 161, 105, 0.4);
    }
    
    .btn-view {
        background: linear-gradient(135deg, #3182CE, #2B6CB0);
        color: white;
    }
    .btn-view:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(49, 130, 206, 0.4);
    }
    
    .btn-upcoming {
        background: linear-gradient(135deg, #ED8936, #DD6B20);
        color: white;
    }
    
    .btn-pending {
        background: linear-gradient(135deg, #D69E2E, #B7791F);
        color: white;
    }
    
    .btn-missed {
        background: linear-gradient(135deg, #E53E3E, #C53030);
        color: white;
        cursor: default;
    }
    
    .btn-disabled {
        background: #E2E8F0;
        color: #718096;
        cursor: default;
    }
    
    .btn-disabled i {
        color: #A0AEC0;
    }
    
    /* Timer Display */
    .exam-timer {
        display: inline-block;
        margin-top: 6px;
        padding: 4px 12px;
        border-radius: 50px;
        font-size: 11px;
        font-weight: 600;
        font-family: 'Courier New', monospace;
        background: rgba(0,0,0,0.05);
        transition: all 0.3s ease;
        min-width: 80px;
        text-align: center;
    }
    
    .exam-timer i {
        margin-right: 4px;
    }
    
    .timer-active {
        background: #F0FFF4;
        color: #38A169;
        border: 1px solid #C6F6D5;
        animation: pulse-green 1.5s ease-in-out infinite;
    }
    
    .timer-upcoming {
        background: #FFFAF0;
        color: #DD6B20;
        border: 1px solid #FEEBC8;
    }
    
    .timer-expired {
        background: #FFF5F5;
        color: #E53E3E;
        border: 1px solid #FED7D7;
    }
    
    .has-timer .action-cell {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
    }
    
    @keyframes pulse-green {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
    }
    
    /* Badge TVET Small */
    .badge-tvet-small {
        display: inline-block;
        padding: 1px 8px;
        border-radius: 50px;
        font-size: 9px;
        font-weight: 700;
        background: #805AD5;
        color: white;
        margin-left: 4px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    /* Assessment Info Box */
    .assessment-info-box {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 2px 0;
    }
    
    .assessment-row-top {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
    }
    
    .assessment-name {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
    }
    
    .assessment-name strong {
        font-size: 13px;
        color: #2D3748;
    }
    
    .exam-datetime {
        font-size: 11px;
        color: #718096;
        display: flex;
        align-items: center;
        gap: 4px;
    }
    
    .exam-score {
        font-size: 11px;
        color: #4A5568;
        font-weight: 500;
    }
    
    .exam-pending {
        font-size: 11px;
        color: #D69E2E;
        font-weight: 500;
    }
    
    /* Status Badge */
    .status-badge {
        display: inline-block;
        padding: 3px 10px;
        border-radius: 50px;
        font-size: 11px;
        font-weight: 600;
        text-transform: capitalize;
    }
    
    .status-badge.distinction {
        background: #C6F6D5;
        color: #065F46;
    }
    
    .status-badge.credit {
        background: #DBEAFE;
        color: #1E40AF;
    }
    
    .status-badge.pass {
        background: #FEF3C7;
        color: #92400E;
    }
    
    .status-badge.fail {
        background: #FEE2E2;
        color: #991B1B;
    }
    
    .status-badge.pending {
        background: #F3F4F6;
        color: #6B7280;
    }
    
    .status-badge.missed {
        background: #FEE2E2;
        color: #991B1B;
    }
    
    .status-badge.completed {
        background: #E9D8FD;
        color: #6B46C1;
    }
    
    /* Grade Badge */
    .grade-badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 50px;
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    .grade-badge.distinction {
        background: #C6F6D5;
        color: #065F46;
    }
    
    .grade-badge.credit {
        background: #DBEAFE;
        color: #1E40AF;
    }
    
    .grade-badge.pass {
        background: #FEF3C7;
        color: #92400E;
    }
    
    .grade-badge.fail {
        background: #FEE2E2;
        color: #991B1B;
    }
    
    .grade-badge.pending {
        background: #F3F4F6;
        color: #6B7280;
    }
    
    .grade-badge.missed {
        background: #FEE2E2;
        color: #991B1B;
    }
    
    /* Row states */
    .row-released {
        background-color: #FAFCFE !important;
    }
    
    .row-pending {
        background-color: #FFFAF0 !important;
    }
    
    /* Badge released/pending */
    .badge-released {
        display: inline-block;
        padding: 1px 8px;
        border-radius: 50px;
        font-size: 9px;
        font-weight: 600;
        background: #C6F6D5;
        color: #065F46;
    }
    
    .badge-pending {
        display: inline-block;
        padding: 1px 8px;
        border-radius: 50px;
        font-size: 9px;
        font-weight: 600;
        background: #FEF3C7;
        color: #92400E;
    }
    
    .badge-cat {
        display: inline-block;
        padding: 1px 8px;
        border-radius: 50px;
        font-size: 9px;
        font-weight: 700;
        background: #9F7AEA;
        color: white;
        text-transform: uppercase;
    }
    
    .badge-final {
        display: inline-block;
        padding: 1px 8px;
        border-radius: 50px;
        font-size: 9px;
        font-weight: 700;
        background: #FC8181;
        color: white;
        text-transform: uppercase;
    }
    
    /* TVET/KRCHN Badges */
    .badge-tvet {
        background: #805AD5;
        color: white;
        padding: 4px 12px;
        border-radius: 50px;
        font-size: 12px;
        font-weight: 600;
    }
    
    .badge-krchn {
        background: #3182CE;
        color: white;
        padding: 4px 12px;
        border-radius: 50px;
        font-size: 12px;
        font-weight: 600;
    }
    
    .badge-tvet i, .badge-krchn i {
        margin-right: 4px;
    }
    
    .ms-2 {
        margin-left: 8px;
    }
    
    /* Loading spinner animation */
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    
    /* Table styling */
    .assessment-row td {
        vertical-align: middle;
        padding: 12px 8px;
    }
    
    .text-center {
        text-align: center;
    }
    
    .text-muted {
        color: #A0AEC0;
    }
    
    .py-4 {
        padding-top: 1rem;
        padding-bottom: 1rem;
    }
    
    .d-block {
        display: block;
    }
    
    .mb-2 {
        margin-bottom: 0.5rem;
    }
`;
document.head.appendChild(style);
