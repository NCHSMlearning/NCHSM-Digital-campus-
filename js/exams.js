// exams.js - FIXED VERSION with Release Results Support
(function() {
    'use strict';
    
    console.log('✅ exams.js - Nakuru College of Health Science and Management (RELEASE SUPPORT)');
    
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
            this.releasedResults = new Set(); // Track released result IDs
            
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
            console.log('📥 Loading exams with release support...');
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
                
                // 🔥 FIXED: Use 'exams' table directly (not exams_with_courses)
                let query = supabase
                    .from('exams')
                    .select('*')
                    .order('id', { ascending: true });
                
                // Filter by intake year
                query = query.eq('intake_year', this.intakeYear);
                
                // Filter by program type
                if (this.isTVETStudent) {
                    query = query.eq('program_type', 'TVET');
                } else {
                    query = query.eq('program_type', 'KRCHN');
                }
                
                // Filter by block/term
                if (this.isTVETStudent && this.userTerm) {
                    query = query.eq('block_term', this.userTerm);
                } else if (!this.isTVETStudent && this.userBlock) {
                    query = query.eq('block_term', this.userBlock);
                }
                
                let { data: exams, error: examsError } = await query;
                if (examsError) throw examsError;
                
                console.log(`📊 Found ${exams?.length || 0} exams`);
                
                // 🔥 Get grades for this student
                let grades = [];
                if (this.userId) {
                    const { data: gradesData, error: gradesError } = await supabase
                        .from('exam_grades')
                        .select('*')
                        .eq('student_id', this.userId)
                        .eq('question_id', '00000000-0000-0000-0000-000000000000');
                    
                    if (!gradesError && gradesData) {
                        grades = gradesData;
                    }
                }
                
                // 🔥 Get released results
                this.releasedResults.clear();
                const { data: released } = await supabase
                    .from('released_exam_results')
                    .select('result_id');
                
                if (released && released.length > 0) {
                    this.releasedResults = new Set(released.map(r => r.result_id));
                    console.log(`✅ Loaded ${this.releasedResults.size} released results`);
                }
                
                // Process exams
                this.processExamsData(exams || [], grades);
                
                // Apply filter and display
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
            
            this.allExams = exams.map(exam => {
                const grade = gradeMap.get(String(exam.id));
                const gradeId = grade?.id;
                const isReleased = gradeId ? this.releasedResults.has(gradeId) : false;
                
                // Determine if exam is completed AND released
                let isCompleted = false;
                let totalPercentage = null;
                let gradeText = 'Pending Grade';
                let gradeClass = 'pending';
                let gradePoint = 0;
                let actualMarks = null;
                
                // Only show results if RELEASED
                if (grade && isReleased) {
                    isCompleted = true;
                    totalPercentage = parseFloat(grade.total_score) || 0;
                    actualMarks = grade.marks || 0;
                    
                    // Grading scale
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
                } else if (grade && !isReleased) {
                    // Has grade but NOT released yet
                    isCompleted = false;
                    gradeText = 'Pending Release';
                    gradeClass = 'pending';
                }
                
                // Check if exam has a valid link
                const hasValidLink = (exam.online_link && exam.online_link.trim() !== '' && exam.online_link.startsWith('http')) ||
                                    (exam.exam_link && exam.exam_link.trim() !== '' && exam.exam_link.startsWith('http'));
                
                const examLink = exam.exam_link || exam.online_link;
                
                const isCatExam = exam.exam_type?.includes('CAT') || exam.exam_type === 'CAT';
                
                return {
                    ...exam,
                    id: exam.id,
                    exam_name: exam.exam_name || exam.title,
                    exam_type: exam.exam_type || (isCatExam ? 'CAT' : 'EXAM'),
                    isCatExam,
                    isCompleted,
                    isReleased,
                    totalPercentage,
                    actualMarks,
                    gradeText,
                    gradeClass,
                    gradePoint,
                    hasValidLink,
                    examLink: examLink,
                    cat1Score: grade?.cat_1_score ?? grade?.cat_score ?? null,
                    cat2Score: grade?.cat_2_score ?? null,
                    finalScore: grade?.exam_score ?? null,
                    cat1Display: (grade?.cat_1_score ?? grade?.cat_score) !== null ? `${grade?.cat_1_score ?? grade?.cat_score}%` : '--',
                    cat2Display: grade?.cat_2_score !== null ? `${grade.cat_2_score}%` : '--',
                    finalDisplay: grade?.exam_score !== null ? `${grade.exam_score}%` : '--',
                    formattedExamDate: exam.exam_date ? new Date(exam.exam_date).toLocaleDateString() : 'TBA',
                    formattedGradedDate: grade?.graded_at ? new Date(grade.graded_at).toLocaleDateString() : '--',
                    programBadgeClass: exam.program_type === 'TVET' ? 'badge-tvet' : 'badge-krchn',
                    programIcon: exam.program_type === 'TVET' ? 'fa-tools' : 'fa-graduation-cap',
                    programDisplay: exam.program_type === 'TVET' ? 'TVET Program' : 'KRCHN Program'
                };
            });
            
            console.log(`✅ Processed ${this.allExams.length} exams, ${this.allExams.filter(e => e.isCompleted).length} completed (released)`);
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
                let buttonText = 'Start Exam';
                let buttonClass = 'btn-primary';
                
                if (!exam.hasValidLink) {
                    buttonText = 'No Link Available';
                    buttonClass = 'btn-disabled';
                }
                
                // Show status message
                let statusHtml = `<span class="status-badge pending">Not Started</span>`;
                if (exam.gradeText === 'Pending Release') {
                    statusHtml = `<span class="status-badge pending">⏳ Pending Release</span>`;
                }
                
                let scoreColumns;
                if (isCatExam) {
                    scoreColumns = `
                        <td class="text-center">--</td>
                        <td class="text-center cat2-column">--</td>
                        <td class="text-center final-column">--</td>
                    `;
                } else {
                    scoreColumns = `
                        <td class="text-center">--</td>
                        <td class="text-center">--</td>
                        <td class="text-center">--</td>
                    `;
                }
                
                return `
                <tr class="${isCatExam ? 'cat-exam' : 'final-exam'}">
                    <td>
                        <strong>${this.escapeHtml(exam.exam_name || 'N/A')}</strong>
                        <div class="program-indicator ${exam.programBadgeClass}">
                            <i class="fas ${exam.programIcon}"></i> ${this.escapeHtml(exam.programDisplay)}
                        </div>
                    </td>
                    <td><span class="badge ${isCatExam ? 'badge-cat' : 'badge-final'}">${isCatExam ? 'CAT' : 'Exam'}</span></td>
                    <td>${this.escapeHtml(exam.course || 'General')}</td>
                    <td class="text-center">${exam.block_term || 'General'}</td>
                    <td>${exam.formattedExamDate}</td>
                    <td>${statusHtml}</td>
                    ${scoreColumns}
                    <td class="text-center">--</td>
                    <td class="text-center">
                        ${exam.hasValidLink && exam.gradeText !== 'Pending Release' ? 
                            `<a href="${exam.examLink}" 
                                target="_blank" 
                                class="exam-link-btn ${buttonClass}"
                                data-exam-id="${exam.id}"
                                data-exam-name="${this.escapeHtml(exam.exam_name || '')}">
                                <i class="fas fa-external-link-alt"></i> ${buttonText}
                            </a>` :
                            `<span class="exam-link-btn ${buttonClass}" title="Exam not available">
                                <i class="fas fa-lock"></i> ${buttonText}
                            </span>`
                        }
                    </td>
                </tr>`;
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
                const percentage = exam.totalPercentage ? exam.totalPercentage.toFixed(1) : '0';
                
                let scoreColumns;
                if (isCatExam) {
                    scoreColumns = `
                        <td class="text-center"><strong>${exam.cat1Display}</strong></td>
                        <td class="text-center cat2-column">--</td>
                        <td class="text-center final-column">--</td>
                    `;
                } else {
                    scoreColumns = `
                        <td class="text-center">${exam.cat1Display}</td>
                        <td class="text-center">${exam.cat2Display}</td>
                        <td class="text-center">${exam.finalDisplay}</td>
                    `;
                }
                
                return `
                <tr class="${isCatExam ? 'cat-exam' : 'final-exam'}">
                    <td>
                        <strong>${this.escapeHtml(exam.exam_name || 'N/A')}</strong>
                        <div class="program-indicator ${exam.programBadgeClass}">
                            <i class="fas ${exam.programIcon}"></i> ${this.escapeHtml(exam.programDisplay)}
                        </div>
                    </td>
                    <td><span class="badge ${isCatExam ? 'badge-cat' : 'badge-final'}">${isCatExam ? 'CAT' : 'Exam'}</span></td>
                    <td>${this.escapeHtml(exam.course || 'General')}</td>
                    <td class="text-center">${exam.block_term || 'General'}</td>
                    <td>${exam.formattedGradedDate}</td>
                    <td><span class="status-badge ${exam.gradeClass}">${exam.gradeText}</span></td>
                    ${scoreColumns}
                    <td class="text-center"><strong>${percentage}%</strong></td>
                    <td class="text-center">
                        <span class="grade-badge ${exam.gradeClass}">${exam.gradeText}</span>
                    </td>
                </tr>`;
            }).join('');
            
            this.completedTable.innerHTML = html;
        }
        
        updateCounts() {
            if (this.currentCount) {
                this.currentCount.textContent = `${this.currentExams.length} pending`;
            }
            if (this.completedCount) {
                this.completedCount.textContent = `${this.completedExams.length} graded`;
            }
            if (this.currentHeaderCount) {
                this.currentHeaderCount.textContent = this.currentExams.length;
            }
            if (this.completedHeaderCount) {
                this.completedHeaderCount.textContent = this.completedExams.length;
            }
            
            const scoredExams = this.completedExams.filter(exam => exam.totalPercentage !== null);
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
            // Transcript functionality (keep existing)
            alert('Transcript feature - will show all released results');
        }
        
        showLoading() {
            const loadingHTML = (colspan) => `
                <tr class="loading">
                    <td colspan="${colspan}">
                        <div class="loading-content">
                            <div class="loading-spinner"></div>
                            <p>Loading assessments...</p>
                        </div>
                    </td>
                </tr>`;
            
            if (this.currentTable) this.currentTable.innerHTML = loadingHTML(11);
            if (this.completedTable) this.completedTable.innerHTML = loadingHTML(11);
        }
        
        showError(message) {
            const errorHTML = (colspan) => `
                <tr class="error">
                    <td colspan="${colspan}">
                        <div class="error-content">
                            <i class="fas fa-exclamation-circle"></i>
                            <p>${message}</p>
                            <button onclick="window.examsModule?.refresh()" class="btn btn-sm">Retry</button>
                        </div>
                    </td>
                </tr>`;
            
            if (this.currentTable) this.currentTable.innerHTML = errorHTML(11);
            if (this.completedTable) this.completedTable.innerHTML = errorHTML(11);
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
    
    console.log('✅ Exams module ready with RELEASE RESULTS support!');
})();
