// exams.js - COMPLETE with Date Comparison & Release Support
(function() {
    'use strict';
    
    console.log('✅ exams.js - Nakuru College of Health Science and Management (FULL RELEASE SUPPORT)');
    
    class ExamsModule {
        constructor() {
            console.log('🔧 ExamsModule initialized');
            
            // Define TVET program codes
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
            
            // Initialize user profile data
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
            
            // Try to load user data
            this.initializeUserData();
            
            // Setup auto-refresh
            this.setupAutoRefresh();
        }
        
        getExamPeriod() {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth();
            
            // Trimester 1: March (2) to June (5)
            if (month >= 2 && month <= 5) {
                return `March - June ${year} (Trimester 1)`;
            }
            // Trimester 2: July (6) to October (9)
            else if (month >= 6 && month <= 9) {
                return `July - October ${year} (Trimester 2)`;
            }
            // Trimester 3: November (10) to February (1)
            else {
                if (month === 10 || month === 11) {
                    return `November ${year} - February ${year + 1} (Trimester 3)`;
                }
                return `November ${year - 1} - February ${year} (Trimester 3)`;
            }
        }
        
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
                    this.userTerm = this.userProfile.term || this.userProfile.block || 'Term1';
                    this.userBlock = null;
                } else {
                    this.userBlock = this.userProfile.block || 'A';
                    this.userTerm = null;
                }
                
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
            
            document.getElementById('refresh-assessments')?.addEventListener('click', (e) => {
                e.preventDefault();
                this.loadExams();
            });
            
            document.getElementById('view-transcript')?.addEventListener('click', (e) => {
                e.preventDefault();
                this.showProfessionalTranscript();
            });
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
            this.currentExams = this.allExams.filter(exam => !exam.isCompleted);
            this.completedExams = this.allExams.filter(exam => exam.isCompleted);
            
            if (this.currentFilter === 'current') {
                this.completedExams = [];
            } else if (this.currentFilter === 'completed') {
                this.currentExams = [];
            }
            
            this.displayTables();
        }
        
        async loadExams() {
            console.log('📥 Loading exams with consolidated view...');
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
                    userId: this.userId
                });
                
                let query = supabase
                    .from('exams')
                    .select('*')
                    .order('exam_date', { ascending: true });
                
                query = query.eq('intake_year', this.intakeYear);
                
                if (this.isTVETStudent) {
                    query = query.eq('program_type', 'TVET');
                } else {
                    query = query.eq('program_type', 'KRCHN');
                }
                
                if (this.isTVETStudent && this.userTerm) {
                    query = query.eq('block_term', this.userTerm);
                } else if (!this.isTVETStudent && this.userBlock) {
                    query = query.eq('block_term', this.userBlock);
                }
                
                let { data: exams, error: examsError } = await query;
                if (examsError) throw examsError;
                
                console.log(`📊 Found ${exams?.length || 0} exams`);
                
                let grades = [];
                if (this.userId) {
                    const { data: gradesData, error: gradesError } = await supabase
                        .from('exam_grades')
                        .select('*')
                        .eq('student_id', this.userId)
                        .eq('question_id', '00000000-0000-0000-0000-000000000000');
                    
                    if (!gradesError && gradesData) {
                        grades = gradesData;
                        console.log(`📊 Found ${grades.length} grade records`);
                    }
                }
                
                this.releasedResults.clear();
                const { data: released } = await supabase
                    .from('released_exam_results')
                    .select('result_id');
                
                if (released && released.length > 0) {
                    this.releasedResults = new Set(released.map(r => r.result_id));
                    console.log(`✅ Loaded ${this.releasedResults.size} released results`);
                }
                
                this.processExamsData(exams || [], grades);
                this.applyDataFilter();
                
                console.log('✅ Exams loaded successfully');
                this.dispatchDashboardEvent();
                
            } catch (error) {
                console.error('❌ Error loading exams:', error);
                this.showError(error.message);
            }
        }
        
        processExamsData(exams, grades) {
            const gradeMap = new Map();
            grades.forEach(grade => {
                gradeMap.set(String(grade.exam_id), grade);
            });
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            this.allExams = exams.map(exam => {
                const grade = gradeMap.get(String(exam.id));
                const gradeId = grade?.id;
                const isReleased = gradeId ? this.releasedResults.has(gradeId) : false;
                
                const cat1Score = grade?.cat_1_score ?? grade?.cat_score ?? null;
                const cat2Score = grade?.cat_2_score ?? null;
                const finalScore = grade?.exam_score ?? null;
                const totalPercentage = grade?.total_score ? parseFloat(grade.total_score) : null;
                
                const examType = (exam.exam_type || '').toUpperCase();
                const isCatExam = examType.includes('CAT');
                const isFinalExam = examType === 'EXAM' || examType === 'FINAL';
                
                const examDate = exam.exam_date ? new Date(exam.exam_date) : null;
                const isDatePassed = examDate ? examDate < today : false;
                const hasGrade = grade && totalPercentage !== null;
                
                let isCompleted = false;
                let gradeText = 'Not Started';
                let gradeClass = 'pending';
                let gradePoint = 0;
                let displayPercentage = null;
                let completionReason = '';
                
                if (hasGrade && isReleased) {
                    isCompleted = true;
                    displayPercentage = totalPercentage;
                    completionReason = 'graded';
                    
                    if (totalPercentage >= 85) {
                        gradeText = 'Distinction';
                        gradeClass = 'distinction';
                        gradePoint = 5.0;
                    } else if (totalPercentage >= 75) {
                        gradeText = 'Credit';
                        gradeClass = 'credit';
                        gradePoint = 4.0;
                    } else if (totalPercentage >= 60) {
                        gradeText = 'Pass';
                        gradeClass = 'pass';
                        gradePoint = 3.0;
                    } else {
                        gradeText = 'Fail';
                        gradeClass = 'fail';
                        gradePoint = 0.0;
                    }
                } else if (hasGrade && !isReleased) {
                    if (isDatePassed) {
                        isCompleted = true;
                        gradeText = 'Pending Release';
                        gradeClass = 'pending';
                        completionReason = 'date_passed';
                        displayPercentage = totalPercentage;
                    } else {
                        isCompleted = false;
                        gradeText = 'Pending Release';
                        gradeClass = 'pending';
                    }
                } else if (!hasGrade && isDatePassed) {
                    isCompleted = true;
                    gradeText = 'Missed';
                    gradeClass = 'missed';
                    completionReason = 'missed';
                } else {
                    isCompleted = false;
                    gradeText = 'Not Started';
                    gradeClass = 'pending';
                }
                
                // Check if exam has a valid link
                const examLink = exam.exam_link || exam.online_link;
                const hasValidLink = examLink && examLink.trim() !== '' && (examLink.startsWith('http') || examLink.includes('docs.google.com'));
                
                // Determine action button state
                let actionState = 'not_available';
                let actionMessage = 'Not Available';
                
                if (exam.isCompleted) {
                    actionMessage = 'Completed';
                    actionState = 'completed';
                } else if (gradeText === 'Pending Release') {
                    actionMessage = 'Pending Release';
                    actionState = 'pending_release';
                } else if (gradeText === 'Missed') {
                    actionMessage = 'Missed';
                    actionState = 'missed';
                } else if (!hasValidLink) {
                    actionMessage = 'No Link Available';
                    actionState = 'no_link';
                } else if (hasValidLink && !exam.isCompleted && gradeText !== 'Pending Release' && gradeText !== 'Missed') {
                    actionMessage = 'Start Exam';
                    actionState = 'start';
                }
                
                const canTakeExam = (actionState === 'start');
                
                // Format display values
                let cat1Display = '--';
                let cat2Display = '--';
                let finalDisplay = '--';
                
                if (isCatExam && cat1Score !== null) {
                    cat1Display = `${cat1Score}%`;
                }
                if (isCatExam && cat2Score !== null) {
                    cat2Display = `${cat2Score}%`;
                }
                if (isFinalExam) {
                    if (cat1Score !== null) cat1Display = `${cat1Score}%`;
                    if (cat2Score !== null) cat2Display = `${cat2Score}%`;
                    if (finalScore !== null) finalDisplay = `${finalScore}%`;
                }
                
                if (isReleased && displayPercentage !== null) {
                    cat1Display = displayPercentage.toFixed(1) + '%';
                }
                
                return {
                    ...exam,
                    id: exam.id,
                    exam_name: exam.exam_name || exam.title || 'Untitled Exam',
                    exam_type: exam.exam_type || (isCatExam ? 'CAT' : 'EXAM'),
                    isCatExam,
                    isFinalExam,
                    isCompleted,
                    isReleased,
                    hasGrade,
                    isDatePassed,
                    completionReason,
                    totalPercentage: displayPercentage,
                    gradeText,
                    gradeClass,
                    gradePoint,
                    hasValidLink,
                    canTakeExam,
                    actionState,
                    actionMessage,
                    examLink: examLink,
                    cat1Score: cat1Score,
                    cat2Score: cat2Score,
                    finalScore: finalScore,
                    cat1Display: cat1Display,
                    cat2Display: cat2Display,
                    finalDisplay: finalDisplay,
                    examDate: exam.exam_date,
                    formattedExamDate: exam.exam_date ? new Date(exam.exam_date).toLocaleDateString() : 'TBA',
                    formattedGradedDate: grade?.graded_at ? new Date(grade.graded_at).toLocaleDateString() : '--',
                    programBadgeClass: exam.program_type === 'TVET' ? 'badge-tvet' : 'badge-krchn',
                    programIcon: exam.program_type === 'TVET' ? 'fa-tools' : 'fa-graduation-cap',
                    programDisplay: exam.program_type === 'TVET' ? 'TVET Program' : 'KRCHN Program'
                };
            });
            
            const currentCount = this.allExams.filter(e => !e.isCompleted).length;
            const completedCount = this.allExams.filter(e => e.isCompleted).length;
            console.log(`✅ Processed ${this.allExams.length} exams: ${currentCount} current, ${completedCount} completed`);
        }
        
        displayTables() {
            this.displayCurrentTable();
            this.displayCompletedTable();
            this.updateCounts();
            this.updateEmptyStates();
        }
        
        displayCurrentTable() {
            if (!this.currentTable) return;
            
            if (this.currentExams.length === 0) {
                this.currentTable.innerHTML = '';
                return;
            }
            
            const html = this.currentExams.map(exam => {
                const isCatExam = exam.isCatExam;
                
                // Action button based on state
                let actionHtml = '';
                if (exam.canTakeExam && exam.actionState === 'start') {
                    actionHtml = `<a href="${exam.examLink}" 
                                    target="_blank" 
                                    class="exam-link-btn btn-primary"
                                    data-exam-id="${exam.id}"
                                    data-exam-name="${this.escapeHtml(exam.exam_name)}">
                                    <i class="fas fa-external-link-alt"></i> Start Exam
                                </a>`;
                } else {
                    let icon = '<i class="fas fa-lock"></i>';
                    if (exam.actionState === 'pending_release') icon = '<i class="fas fa-clock"></i>';
                    if (exam.actionState === 'completed') icon = '<i class="fas fa-check-circle"></i>';
                    if (exam.actionState === 'missed') icon = '<i class="fas fa-calendar-times"></i>';
                    
                    actionHtml = `<span class="exam-link-btn btn-disabled" title="${exam.actionMessage}">
                                    ${icon} ${exam.actionMessage}
                                </span>`;
                }
                
                let statusHtml = `<span class="status-badge ${exam.gradeClass}">${exam.gradeText}</span>`;
                
                // Consolidated Assessment Cell
                let assessmentCell = `
                    <div class="assessment-info-box">
                        <div class="assessment-name">
                            <strong>${this.escapeHtml(exam.exam_name)}</strong>
                            <span class="${isCatExam ? 'badge-cat' : 'badge-final'}">${isCatExam ? 'CAT' : 'Exam'}</span>
                        </div>
                        <div class="assessment-details">
                            <span class="detail-item"><i class="fas fa-book"></i> ${this.escapeHtml(exam.course || 'General')}</span>
                            <span class="detail-item"><i class="fas fa-layer-group"></i> ${exam.block_term || 'General'}</span>
                            <span class="program-badge ${exam.programBadgeClass}">
                                <i class="fas ${exam.programIcon}"></i> ${this.escapeHtml(exam.programDisplay)}
                            </span>
                        </div>
                    </div>
                `;
                
                // Score columns
                let scoreColumns;
                if (isCatExam) {
                    scoreColumns = `
                        <td class="text-center"><strong>${exam.cat1Display}</strong></td>
                        <td class="text-center" style="display:none">--</td>
                        <td class="text-center" style="display:none">--</td>
                    `;
                } else {
                    scoreColumns = `
                        <td class="text-center">${exam.cat1Display}</td>
                        <td class="text-center">${exam.cat2Display}</td>
                        <td class="text-center">${exam.finalDisplay}</td>
                    `;
                }
                
                return `
                    <tr class="assessment-row ${isCatExam ? 'cat-exam' : 'final-exam'}">
                        <td class="assessment-cell">${assessmentCell}</td>
                        <td class="text-center date-cell">${exam.formattedExamDate}</td>
                        <td class="text-center status-cell">${statusHtml}</td>
                        ${scoreColumns}
                        <td class="text-center total-cell">
                            ${exam.totalPercentage !== null ? `<span class="total-score">${exam.totalPercentage.toFixed(1)}%</span>` : '--'}
                        </td>
                        <td class="text-center action-cell">${actionHtml}</td>
                    </tr>
                `;
            }).join('');
            
            this.currentTable.innerHTML = html;
        }
        
        displayCompletedTable() {
            if (!this.completedTable) return;
            
            if (this.completedExams.length === 0) {
                this.completedTable.innerHTML = '';
                return;
            }
            
            const html = this.completedExams.map(exam => {
                const isCatExam = exam.isCatExam;
                const percentage = exam.totalPercentage !== null ? exam.totalPercentage.toFixed(1) : '0';
                const displayPercentage = exam.totalPercentage !== null ? `${percentage}%` : '--';
                const displayGrade = exam.gradeText;
                const displayClass = exam.gradeClass;
                
                // Consolidated Assessment Cell
                let assessmentCell = `
                    <div class="assessment-info-box">
                        <div class="assessment-name">
                            <strong>${this.escapeHtml(exam.exam_name)}</strong>
                            <span class="${isCatExam ? 'badge-cat' : 'badge-final'}">${isCatExam ? 'CAT' : 'Exam'}</span>
                        </div>
                        <div class="assessment-details">
                            <span class="detail-item"><i class="fas fa-book"></i> ${this.escapeHtml(exam.course || 'General')}</span>
                            <span class="detail-item"><i class="fas fa-layer-group"></i> ${exam.block_term || 'General'}</span>
                            <span class="program-badge ${exam.programBadgeClass}">
                                <i class="fas ${exam.programIcon}"></i> ${this.escapeHtml(exam.programDisplay)}
                            </span>
                        </div>
                    </div>
                `;
                
                // Score columns
                let scoreColumns;
                if (isCatExam) {
                    scoreColumns = `
                        <td class="text-center"><strong>${exam.cat1Display}</strong></td>
                        <td class="text-center" style="display:none">--</td>
                        <td class="text-center" style="display:none">--</td>
                    `;
                } else {
                    scoreColumns = `
                        <td class="text-center">${exam.cat1Display}</td>
                        <td class="text-center">${exam.cat2Display}</td>
                        <td class="text-center">${exam.finalDisplay}</td>
                    `;
                }
                
                // Grade badge for completed
                let gradeBadge = `<span class="grade-badge ${displayClass}">${displayGrade}</span>`;
                
                return `
                    <tr class="assessment-row ${isCatExam ? 'cat-exam' : 'final-exam'}">
                        <td class="assessment-cell">${assessmentCell}</td>
                        <td class="text-center date-cell">${exam.formattedGradedDate !== '--' ? exam.formattedGradedDate : exam.formattedExamDate}</td>
                        <td class="text-center status-cell"><span class="status-badge ${displayClass}">${displayGrade}</span></td>
                        ${scoreColumns}
                        <td class="text-center total-cell"><strong>${displayPercentage}</strong></td>
                        <td class="text-center grade-cell">${gradeBadge}</td>
                    </tr>
                `;
            }).join('');
            
            this.completedTable.innerHTML = html;
        }
        
        updateCounts() {
            if (this.currentCount) {
                this.currentCount.textContent = `${this.currentExams.length} pending`;
            }
            if (this.completedCount) {
                this.completedCount.textContent = `${this.completedExams.length} completed`;
            }
            if (this.currentHeaderCount) {
                this.currentHeaderCount.textContent = this.currentExams.length;
            }
            if (this.completedHeaderCount) {
                this.completedHeaderCount.textContent = this.completedExams.length;
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
        }
        
        updateEmptyStates() {
            if (this.currentEmpty) {
                this.currentEmpty.style.display = this.currentExams.length === 0 ? 'block' : 'none';
            }
            if (this.completedEmpty) {
                this.completedEmpty.style.display = this.completedExams.length === 0 ? 'block' : 'none';
            }
        }
        
        showProfessionalTranscript() {
            const completedReleased = this.completedExams.filter(e => e.isReleased && e.totalPercentage !== null);
            if (completedReleased.length === 0) {
                alert('No released results available for transcript yet.');
                return;
            }
            const avg = completedReleased.reduce((sum, e) => sum + e.totalPercentage, 0) / completedReleased.length;
            alert(`📊 Transcript\n\nCompleted Exams: ${completedReleased.length}\nAverage Score: ${avg.toFixed(1)}%\n\nContact registrar for official transcript.`);
        }
        
        showLoading() {
            const loadingHTML = `<tr class="loading"><td colspan="8"><div class="loading-content"><div class="loading-spinner"></div><p>Loading assessments...</p></div></td></tr>`;
            if (this.currentTable) this.currentTable.innerHTML = loadingHTML;
            if (this.completedTable) this.completedTable.innerHTML = loadingHTML;
        }
        
        showError(message) {
            const errorHTML = `<tr class="error"><td colspan="8"><div class="error-content"><i class="fas fa-exclamation-circle"></i><p>${message}</p><button onclick="window.examsModule?.refresh()" class="btn btn-sm">Retry</button></div></td></tr>`;
            if (this.currentTable) this.currentTable.innerHTML = errorHTML;
            if (this.completedTable) this.completedTable.innerHTML = errorHTML;
        }
        
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
    
    console.log('✅ Exams module ready with consolidated view and action buttons!');
})();
