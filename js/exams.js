// exams.js - NAKURU COLLEGE OF HEALTH SCIENCE AND MANAGEMENT VERSION
(function() {
    'use strict';
    
    console.log('✅ exams.js - Nakuru College of Health Science and Management version');
    
    class ExamsModule {
        constructor() {
            console.log('🔧 ExamsModule initialized');
            
            // Define TVET program codes (must match courses.js)
            this.TVET_PROGRAMS = [
                // Diploma Programs (6-24 months)
                'DPOTT', 'DCH', 'DHRIT', 'DSL', 'DSW', 'DCJS', 'DHSS', 'DICT', 'DME',
                
                // Certificate Programs (3-12 months)
                'CPOTT', 'CCH', 'CHRIT', 'CPC', 'CSL', 'CSW', 'CCJS', 'CAG', 'CHSS', 'CICT',
                
                // Artisan Programs (2-12 months)
                'ACH', 'AAG', 'ASW',
                
                // Other TVET Programs
                'CCA', 'PTE'
            ];
            
            // Store exam data
            this.allExams = [];
            this.currentExams = [];
            this.completedExams = [];
            this.currentFilter = 'all';
            
            // Initialize user profile data
            this.userProfile = {};
            this.program = 'KRCHN';
            this.programCode = 'KRCHN';
            this.programName = 'KRCHN Nursing';
            this.programType = 'KRCHN';  // 'TVET' or 'KRCHN'
            this.programLevel = 'KRCHN'; // 'DIPLOMA', 'CERTIFICATE', 'ARTISAN', 'KRCHN'
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
            
            // Try to load user data with retry mechanism
            this.initializeUserData();
            
            // Setup auto-refresh when returning from exam
            this.setupAutoRefresh();
        }
        
        cacheElements() {
            // Tables
            this.currentTable = document.getElementById('current-assessments-table');
            this.completedTable = document.getElementById('completed-assessments-table');
            
            // Empty states
            this.currentEmpty = document.getElementById('current-empty');
            this.completedEmpty = document.getElementById('completed-empty');
            
            // Count elements
            this.currentCount = document.getElementById('current-count');
            this.completedCount = document.getElementById('completed-count');
            this.completedAverage = document.getElementById('completed-average');
            
            // Header stats
            this.currentHeaderCount = document.getElementById('current-assessments-count');
            this.completedHeaderCount = document.getElementById('completed-assessments-count');
            this.overallAverage = document.getElementById('overall-average');
            
            // Program indicator
            this.programIndicator = document.getElementById('program-indicator');
        }
        
        initializeUserData() {
            console.log('👤 Initializing user data for exams...');
            
            // Try to get user data immediately
            this.updateUserData();
            
            // If not available, wait for global user to be set
            if (!this.userId) {
                console.log('⏳ User data not ready, waiting...');
                
                // Listen for user data events
                document.addEventListener('userDataLoaded', () => {
                    console.log('📥 User data loaded event received');
                    this.updateUserData();
                    this.loadExams();
                });
                
                // Listen for app ready event
                document.addEventListener('appReady', () => {
                    console.log('📱 App ready event received');
                    this.updateUserData();
                    this.loadExams();
                });
                
                // Poll for user data
                const userCheckInterval = setInterval(() => {
                    if (window.db?.currentUserId) {
                        console.log('✅ User data found via polling');
                        this.updateUserData();
                        this.loadExams();
                        clearInterval(userCheckInterval);
                    }
                }, 1000);
                
                // Fallback after 3 seconds
                setTimeout(() => {
                    if (!this.userId) {
                        console.log('⚠️ Using default user data (timeout)');
                        this.loadExams();
                    }
                }, 3000);
            }
        }
        
        // 🔥 UPDATED: Match courses.js logic for program detection
        determineProgramType(programCode) {
            if (!programCode) return { type: 'KRCHN', level: 'KRCHN' };
            
            const code = String(programCode).toUpperCase().trim();
            
            // Check if it's a TVET program
            if (this.TVET_PROGRAMS.includes(code)) {
                // Determine level based on program code
                let level = 'CERTIFICATE';
                if (code.startsWith('D')) level = 'DIPLOMA';
                if (code.startsWith('A')) level = 'ARTISAN';
                if (code === 'CCA' || code === 'PTE') level = 'OTHER';
                
                return {
                    type: 'TVET',
                    level: level,
                    code: code
                };
            }
            
            if (code === 'KRCHN') {
                return { type: 'KRCHN', level: 'KRCHN', code: 'KRCHN' };
            }
            
            return { type: 'KRCHN', level: 'KRCHN', code: 'KRCHN' };
        }
        
        updateUserData() {
            if (window.db?.currentUserProfile) {
                this.userProfile = window.db.currentUserProfile;
                
                // Get program from profile
                const programFromProfile = this.userProfile.program || 
                                         this.userProfile.course || 
                                         'KRCHN';
                
                this.intakeYear = this.userProfile.intake_year || 2025;
                this.userId = window.db.currentUserId;
                
                // 🔥 UPDATED: Use same logic as courses.js
                const programInfo = this.determineProgramType(programFromProfile);
                
                this.programCode = programInfo.code;
                this.programType = programInfo.type;
                this.programLevel = programInfo.level;
                this.isTVETStudent = (this.programType === 'TVET');
                
                // Get program name
                this.programName = this.getProgramDisplayName(programFromProfile);
                
                // 🔥 SET BLOCK/TERM BASED ON PROGRAM TYPE (same as courses.js)
                if (this.isTVETStudent) {
                    this.userTerm = this.userProfile.term || 
                                   this.userProfile.block || 
                                   'Term1';
                    this.userBlock = null;
                    console.log('🎯 TVET Student for Exams:', {
                        code: this.programCode,
                        level: this.programLevel,
                        name: this.programName,
                        term: this.userTerm
                    });
                } else {
                    this.userBlock = this.userProfile.block || 'A';
                    this.userTerm = null;
                    console.log('🎯 KRCHN Student for Exams:', {
                        code: this.programCode,
                        name: this.programName,
                        block: this.userBlock
                    });
                }
                
                // Update UI to show program type
                this.updateProgramIndicator();
                
                return true;
            }
            return false;
        }
        
        // 🔥 GET PROGRAM DISPLAY NAME
        getProgramDisplayName(programCode) {
            const code = String(programCode).toUpperCase().trim();
            
            const programNames = {
                // KRCHN
                'KRCHN': 'KRCHN Nursing',
                
                // TVET Diplomas
                'DPOTT': 'Diploma in Perioperative Theatre Technology',
                'DCH': 'Diploma in Community Health',
                'DHRIT': 'Diploma in Health Records and IT',
                'DSL': 'Diploma in Science Lab',
                'DSW': 'Diploma in Social Work',
                'DCJS': 'Diploma in Criminal Justice',
                'DHSS': 'Diploma in Health Support Services',
                'DICT': 'Diploma in ICT',
                'DME': 'Diploma in Medical Engineering',
                
                // TVET Certificates
                'CPOTT': 'Certificate in Perioperative Theatre Technology',
                'CCH': 'Certificate in Community Health',
                'CHRIT': 'Certificate in Health Records and IT',
                'CPC': 'Certificate in Patient Care',
                'CSL': 'Certificate in Science Lab',
                'CSW': 'Certificate in Social Work',
                'CCJS': 'Certificate in Criminal Justice',
                'CAG': 'Certificate in Agriculture',
                'CHSS': 'Certificate in Health Support Services',
                'CICT': 'Certificate in ICT',
                
                // TVET Artisan
                'ACH': 'Artisan in Community Health',
                'AAG': 'Artisan in Agriculture',
                'ASW': 'Artisan in Social Work',
                
                // Other TVET
                'CCA': 'Certificate in Computer Applications',
                'PTE': 'TVET/CDACC (PTE)'
            };
            
            return programNames[code] || programCode;
        }
        
        updateProgramIndicator() {
            if (this.programIndicator) {
                const badgeClass = this.isTVETStudent ? 'badge-tvet' : 'badge-krchn';
                const icon = this.isTVETStudent ? 'fa-tools' : 'fa-graduation-cap';
                
                let programText = this.programName;
                if (this.isTVETStudent && this.programLevel !== 'OTHER') {
                    programText = `${this.programLevel} - ${this.programName}`;
                }
                
                const blockTermText = this.isTVETStudent ? 
                    `Term: ${this.userTerm}` : 
                    `Block: ${this.userBlock}`;
                
                this.programIndicator.innerHTML = `
                    <span class="badge ${badgeClass}">
                        <i class="fas ${icon}"></i>
                        ${this.escapeHtml(programText)}
                        <span class="ms-2">${blockTermText}</span>
                    </span>
                `;
            }
        }
        
        setupAutoRefresh() {
            const returningFromExam = sessionStorage.getItem('returningFromExam');
            if (returningFromExam === 'true') {
                console.log('🔄 Returning from exam portal - refreshing data...');
                setTimeout(() => {
                    this.loadExams();
                }, 2000);
                sessionStorage.removeItem('returningFromExam');
            }
            
            window.addEventListener('focus', () => {
                console.log('🔍 Page focused - checking for updates...');
                setTimeout(() => {
                    this.loadExams();
                }, 1000);
            });
        }
        
        initializeEventListeners() {
            // Filter buttons
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
            
            // Refresh button
            document.getElementById('refresh-assessments')?.addEventListener('click', (e) => {
                e.preventDefault();
                this.loadExams();
            });
            
            // Transcript button
            document.getElementById('view-transcript')?.addEventListener('click', (e) => {
                e.preventDefault();
                this.showProfessionalTranscript();
            });
            
            // Handle exam link clicks - FIXED VERSION
            document.addEventListener('click', (e) => {
                const examLink = e.target.closest('.exam-link-btn');
                if (examLink && examLink.href && examLink.href !== '#') {
                    e.preventDefault();
                    
                    // Track the exam access
                    this.trackExamAccess(examLink);
                    
                    // Open exam in new tab/window
                    window.open(examLink.href, '_blank');
                }
            });
        }
        
        trackExamAccess(linkElement) {
            sessionStorage.setItem('returningFromExam', 'true');
            
            const examId = linkElement.dataset.examId;
            const examName = linkElement.dataset.examName;
            
            console.log('📝 Student accessing exam:', { examId, examName });
            
            // Check if Supabase is available
            if (!window.db?.supabase) {
                console.warn('Supabase not available, skipping exam access logging');
                return;
            }
            
            if (!this.userId) {
                console.warn('User ID not available, skipping exam access logging');
                return;
            }
            
            // Log exam access
            try {
                const result = window.db.supabase
                    .from('exam_access_logs')
                    .insert([{
                        exam_id: examId,
                        student_id: this.userId,
                        accessed_at: new Date().toISOString(),
                        status: 'started'
                    }]);
                
                // Check if result has a promise (catch method)
                if (result && typeof result.catch === 'function') {
                    result.catch(error => {
                        console.error('❌ Failed to log exam access:', error);
                    });
                }
            } catch (error) {
                console.error('❌ Error in trackExamAccess:', error);
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
            if (currentButton) {
                currentButton.classList.add('active');
            }
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
            console.log('📥 Loading exams...');
            
            this.showLoading();
            
            try {
                // Ensure we have user data
                if (!this.userId && !this.updateUserData()) {
                    console.warn('⚠️ User profile not available yet, retrying in 1 second...');
                    setTimeout(() => this.loadExams(), 1000);
                    return;
                }
                
                if (!window.db?.supabase) {
                    throw new Error('Database connection not available');
                }
                
                console.log('🎯 Loading exams for:', { 
                    programCode: this.programCode,
                    programType: this.programType,
                    level: this.programLevel,
                    intakeYear: this.intakeYear,
                    term: this.userTerm,
                    block: this.userBlock,
                    isTVET: this.isTVETStudent
                });
                
                const supabase = window.db.supabase;
                
                // 🔥 BUILD QUERY BASED ON STUDENT TYPE (same logic as courses.js)
                let query = supabase
                    .from('exams_with_courses')
                    .select('*')
                    .order('exam_date', { ascending: true });
                
                // 1. Filter by intake year
                query = query.eq('intake_year', String(this.intakeYear));
                
                // 2. 🔥 FILTER BY PROGRAM TYPE
                if (this.isTVETStudent) {
                    // TVET students see TVET exams
                    console.log('🎯 Loading TVET exams for TVET student');
                    query = query.eq('program_type', 'TVET');
                } else {
                    // KRCHN students see KRCHN exams
                    console.log('🎯 Loading KRCHN exams for KRCHN student');
                    query = query.eq('program_type', 'KRCHN');
                }
                
                // 3. Filter by block/term
                if (this.isTVETStudent && this.userTerm) {
                    // TVET: Filter by term (e.g., Term1)
                    query = query.eq('block_term', this.userTerm);
                } else if (!this.isTVETStudent && this.userBlock) {
                    // KRCHN: Filter by block (e.g., A)
                    query = query.eq('block_term', this.userBlock);
                }
                
                let { data: exams, error: examsError } = await query;
                if (examsError) throw examsError;
                
                console.log(`📊 Found ${exams?.length || 0} exams with strict filtering`);
                
                // 🔥 FALLBACK: If no exams found, try without block/term filter
                if (!exams || exams.length === 0) {
                    console.log('⚠️ No exams found with strict filter, trying fallback...');
                    
                    // Fallback: Same program filter but no block/term restriction
                    let fallbackQuery = supabase
                        .from('exams_with_courses')
                        .select('*')
                        .eq('intake_year', String(this.intakeYear))
                        .order('exam_date', { ascending: true });
                    
                    if (this.isTVETStudent) {
                        fallbackQuery = fallbackQuery.eq('program_type', 'TVET');
                    } else {
                        fallbackQuery = fallbackQuery.eq('program_type', 'KRCHN');
                    }
                    
                    const fallbackResult = await fallbackQuery;
                    
                    if (fallbackResult.error) throw fallbackResult.error;
                    
                    exams = fallbackResult.data;
                    console.log(`📊 Found ${exams?.length || 0} exams via fallback`);
                }
                
                // 4. Fetch grades for this student
                let grades = [];
                if (this.userId) {
                    const { data: gradesData, error: gradesError } = await supabase
                        .from('exam_grades')
                        .select('*')
                        .eq('student_id', this.userId)
                        .order('graded_at', { ascending: false });
                    
                    if (gradesError) throw gradesError;
                    grades = gradesData || [];
                }
                
                console.log(`📊 Processing ${exams?.length || 0} exams with ${grades.length} grades`);
                
                // 5. Process exams data
                this.processExamsData(exams || [], grades);
                
                // 6. Apply filter and display
                this.applyDataFilter();
                
                console.log('✅ Exams loaded successfully');
                
                // Dispatch event for dashboard
                this.dispatchDashboardEvent();
                
            } catch (error) {
                console.error('❌ Error loading exams:', error);
                this.showError(error.message);
            }
        }
        
        processExamsData(exams, grades) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            this.allExams = exams.map(exam => {
                const grade = grades.find(g => String(g.exam_id) === String(exam.id));
                
                // Determine if exam is completed
                let isCompleted = false;
                let totalPercentage = null;
                let gradeText = 'Pending Grade';
                let gradeClass = 'pending';
                let gradePoint = 0;
                
                // 🔥 FIXED: Use correct column names from your database
                if (grade && (grade.total_score !== null || grade.score !== null)) {
                    isCompleted = true;
                    
                    // Use total_score if available, otherwise use score
                    totalPercentage = grade.total_score || grade.score || 0;
                    
                    // 🔥 UPDATED GRADING SCALE: Fail = 0-59%
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
                        // 0-59% = Fail
                        gradeText = 'Fail';
                        gradeClass = 'fail';
                        gradePoint = 0.0;
                    }
                } else if (exam.status === 'Completed' || exam.status === 'completed') {
                    isCompleted = true;
                } else {
                    // Check if exam date is in past
                    const examDate = exam.exam_date ? new Date(exam.exam_date) : null;
                    if (examDate) {
                        const oneDayAgo = new Date(today);
                        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
                        
                        if (examDate < oneDayAgo) {
                            isCompleted = true;
                        }
                    }
                }
                
                // Check if exam has a valid link
                const hasValidLink = exam.exam_link && 
                                   exam.exam_link.trim() !== '' && 
                                   exam.exam_link !== '#' &&
                                   (exam.exam_link.startsWith('http://') || exam.exam_link.startsWith('https://'));
                
                // Check if retake has a valid link
                const hasValidRetakeLink = exam.retake_link && 
                                         exam.retake_link.trim() !== '' && 
                                         exam.retake_link !== '#' &&
                                         (exam.retake_link.startsWith('http://') || exam.retake_link.startsWith('https://'));
                
                // Determine program info
                const isTVETExam = exam.program_type === 'TVET';
                const programBadgeClass = isTVETExam ? 'badge-tvet' : 'badge-krchn';
                const programIcon = isTVETExam ? 'fa-tools' : 'fa-graduation-cap';
                const programDisplay = isTVETExam ? 'TVET Program' : 'KRCHN Program';
                
                // Add level info for TVET
                let programDisplayWithLevel = programDisplay;
                if (isTVETExam && this.isTVETStudent && this.programLevel !== 'OTHER') {
                    programDisplayWithLevel += ` (${this.programLevel})`;
                }
                
                // Determine if it's a CAT exam
                const isCatExam = exam.exam_type?.includes('CAT') || exam.exam_type === 'CAT';
                
                return {
                    ...exam,
                    isCatExam, // Add this for easier detection
                    isCompleted,
                    totalPercentage,
                    gradeText,
                    gradeClass,
                    gradePoint,
                    hasValidLink,
                    hasValidRetakeLink,
                    // 🔥 FIXED: Use correct column names
                    cat1Score: grade?.cat_1_score ?? grade?.cat_score ?? null,
                    cat2Score: grade?.cat_2_score ?? null,
                    finalScore: grade?.exam_score ?? null,
                    cat1Display: (grade?.cat_1_score ?? grade?.cat_score) !== null && 
                                (grade?.cat_1_score ?? grade?.cat_score) !== undefined ? 
                                `${(grade?.cat_1_score ?? grade?.cat_score)}%` : '--',
                    cat2Display: grade?.cat_2_score !== null && grade?.cat_2_score !== undefined ? 
                                `${grade.cat_2_score}%` : '--',
                    finalDisplay: grade?.exam_score !== null && grade?.exam_score !== undefined ? 
                                `${grade.exam_score}%` : '--',
                    formattedExamDate: exam.exam_date ? 
                        new Date(exam.exam_date).toLocaleDateString('en-US', { 
                            year: 'numeric', month: 'short', day: 'numeric' 
                        }) : '--',
                    formattedGradedDate: grade?.graded_at ? 
                        new Date(grade.graded_at).toLocaleDateString('en-US', { 
                            year: 'numeric', month: 'short', day: 'numeric' 
                        }) : '--',
                    programBadgeClass,
                    programIcon,
                    programDisplay: programDisplayWithLevel,
                    programType: exam.program_type,
                    isTVETExam
                };
            });
            
            const tvetCount = this.allExams.filter(e => e.program_type === 'TVET').length;
            const krchnCount = this.allExams.filter(e => e.program_type === 'KRCHN').length;
            const completedCount = this.allExams.filter(e => e.isCompleted).length;
            const catCount = this.allExams.filter(e => e.isCatExam).length;
            
            console.log(`✅ Processed ${this.allExams.length} exams:`, {
                TVET: tvetCount,
                KRCHN: krchnCount,
                Completed: completedCount,
                CAT: catCount,
                Final: this.allExams.length - catCount
            });
        }
        
        dispatchDashboardEvent() {
            const event = new CustomEvent('examsModuleReady', {
                detail: {
                    metrics: this.getDashboardData(),
                    count: this.allExams.length,
                    tvetCount: this.allExams.filter(e => e.program_type === 'TVET').length,
                    krchnCount: this.allExams.filter(e => e.program_type === 'KRCHN').length,
                    timestamp: new Date().toISOString()
                }
            });
            document.dispatchEvent(event);
            
            window.examsData = {
                allExams: this.allExams,
                metrics: this.getDashboardData(),
                loaded: true,
                isTVETStudent: this.isTVETStudent,
                programCode: this.programCode,
                programName: this.programName,
                programLevel: this.programLevel
            };
        }
        
        displayTables() {
            this.displayCurrentTable();
            this.displayCompletedTable();
            this.updateCounts();
            this.updateEmptyStates();
            this.updatePerformanceSummary();
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
                let buttonIcon = 'fas fa-external-link-alt';
                
                if (!exam.hasValidLink) {
                    buttonText = 'No Link';
                    buttonClass = 'btn-disabled';
                    buttonIcon = 'fas fa-unlink';
                }
                
                // Score columns for current exams (all show -- for pending)
                let scoreColumns;
                if (isCatExam) {
                    // CAT exam: Show only CAT column
                    scoreColumns = `
                        <td class="text-center">--</td>
                        <td class="text-center cat2-column">--</td>
                        <td class="text-center final-column">--</td>
                    `;
                } else {
                    // Final exam: Show all columns
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
                    <td><span class="badge ${isCatExam ? 'badge-cat' : 'badge-final'}">
                        ${isCatExam ? 'CAT' : 'Exam'}
                    </span></td>
                    <td>${this.escapeHtml(exam.course_name || 'General')}</td>
                    <td class="text-center">${exam.block_term || 'General'}</td>
                    <td>${exam.formattedExamDate}</td>
                    <td><span class="status-badge pending">Pending</span></td>
                    ${scoreColumns}
                    <td class="text-center">--</td>
                    <td class="text-center">
                        ${exam.hasValidLink ? 
                            `<a href="${exam.exam_link}" 
                                target="_blank" 
                                class="exam-link-btn ${buttonClass}"
                                data-exam-id="${exam.id}"
                                data-exam-name="${this.escapeHtml(exam.exam_name || '')}">
                                <i class="${buttonIcon}"></i> ${buttonText}
                            </a>` :
                            `<span class="exam-link-btn ${buttonClass}" title="Exam link not available">
                                <i class="${buttonIcon}"></i> ${buttonText}
                            </span>`
                        }
                    </td>
                </tr>`;
            }).join('');
            
            this.currentTable.innerHTML = html;
            
            // Update table headers based on content
            this.updateTableHeaders();
        }
        
        displayCompletedTable() {
            if (!this.completedTable) return;
            
            if (this.completedExams.length === 0) {
                this.completedTable.innerHTML = '';
                return;
            }
            
            const html = this.completedExams.map(exam => {
                const isCatExam = exam.isCatExam;
                
                // Score columns for completed exams
                let scoreColumns;
                if (isCatExam) {
                    // CAT exam: Show only CAT score
                    scoreColumns = `
                        <td class="text-center"><strong>${exam.cat1Display}</strong></td>
                        <td class="text-center cat2-column">--</td>
                        <td class="text-center final-column">--</td>
                    `;
                } else {
                    // Final exam: Show all scores
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
                    <td><span class="badge ${isCatExam ? 'badge-cat' : 'badge-final'}">
                        ${isCatExam ? 'CAT' : 'Exam'}
                    </span></td>
                    <td>${this.escapeHtml(exam.course_name || 'General')}</td>
                    <td class="text-center">${exam.block_term || 'General'}</td>
                    <td>${exam.formattedGradedDate}</td>
                    <td><span class="status-badge ${exam.gradeClass}">${exam.gradeText}</span></td>
                    ${scoreColumns}
                    <td class="text-center"><strong>${exam.totalPercentage ? exam.totalPercentage.toFixed(1) + '%' : '--'}</strong></td>
                    <td class="text-center">
                        ${exam.hasValidRetakeLink ? 
                            `<a href="${exam.retake_link}" 
                                target="_blank" 
                                class="exam-link-btn btn-secondary"
                                data-exam-id="${exam.id}"
                                data-exam-name="${this.escapeHtml(exam.exam_name || '')}">
                                <i class="fas fa-redo"></i> Retake
                            </a>` :
                            `<span class="grade-badge ${exam.gradeClass}">${exam.gradeText}</span>`
                        }
                    </td>
                </tr>`;
            }).join('');
            
            this.completedTable.innerHTML = html;
            
            // Update table headers based on content
            this.updateTableHeaders();
        }
        
        // 🔥 ADDED: Update table headers based on exam types
        updateTableHeaders() {
            // Get all exam types
            const allExams = [...this.currentExams, ...this.completedExams];
            const hasCatExams = allExams.some(exam => exam.isCatExam);
            const hasFinalExams = allExams.some(exam => !exam.isCatExam);
            
            // Update current table headers
            const currentTable = document.querySelector('.current-section table');
            const currentHeaders = currentTable?.querySelectorAll('thead th');
            
            if (currentHeaders && currentHeaders.length >= 9) {
                // Index 6 = CAT 1, Index 7 = CAT 2, Index 8 = Final
                const cat1Header = currentHeaders[6];
                const cat2Header = currentHeaders[7];
                const finalHeader = currentHeaders[8];
                
                if (cat1Header && cat2Header && finalHeader) {
                    if (hasCatExams && !hasFinalExams) {
                        // Only CAT exams
                        cat1Header.textContent = 'CAT Score';
                        cat2Header.style.display = 'none';
                        finalHeader.style.display = 'none';
                    } else if (hasFinalExams && !hasCatExams) {
                        // Only Final exams
                        cat1Header.textContent = 'CAT 1';
                        cat2Header.style.display = '';
                        finalHeader.style.display = '';
                    } else {
                        // Mixed or no exams
                        cat1Header.textContent = 'CAT 1';
                        cat2Header.style.display = '';
                        finalHeader.style.display = '';
                    }
                }
            }
            
            // Update completed table headers
            const completedTable = document.querySelector('.completed-section table');
            const completedHeaders = completedTable?.querySelectorAll('thead th');
            
            if (completedHeaders && completedHeaders.length >= 9) {
                // Index 6 = CAT 1, Index 7 = CAT 2, Index 8 = Final
                const cat1Header = completedHeaders[6];
                const cat2Header = completedHeaders[7];
                const finalHeader = completedHeaders[8];
                
                if (cat1Header && cat2Header && finalHeader) {
                    if (hasCatExams && !hasFinalExams) {
                        // Only CAT exams
                        cat1Header.textContent = 'CAT Score';
                        cat2Header.style.display = 'none';
                        finalHeader.style.display = 'none';
                    } else if (hasFinalExams && !hasCatExams) {
                        // Only Final exams
                        cat1Header.textContent = 'CAT 1';
                        cat2Header.style.display = '';
                        finalHeader.style.display = '';
                    } else {
                        // Mixed or no exams
                        cat1Header.textContent = 'CAT 1';
                        cat2Header.style.display = '';
                        finalHeader.style.display = '';
                    }
                }
            }
            
            // Also hide/show columns in tbody
            const cat2Columns = document.querySelectorAll('.cat2-column');
            const finalColumns = document.querySelectorAll('.final-column');
            
            if (hasCatExams && !hasFinalExams) {
                cat2Columns.forEach(col => col.style.display = 'none');
                finalColumns.forEach(col => col.style.display = 'none');
            } else if (hasFinalExams && !hasCatExams) {
                cat2Columns.forEach(col => col.style.display = '');
                finalColumns.forEach(col => col.style.display = '');
            }
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
                if (this.completedAverage) {
                    this.completedAverage.textContent = 'Average: --';
                }
                if (this.overallAverage) {
                    this.overallAverage.textContent = '--';
                }
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
        
        updatePerformanceSummary() {
            // Performance summary logic
        }
        
        showProfessionalTranscript() {
            const completedExams = this.allExams.filter(exam => exam.isCompleted && exam.totalPercentage !== null);
            const totalUnits = completedExams.length;
            const totalPoints = completedExams.reduce((sum, exam) => sum + exam.gradePoint, 0);
            const gpa = totalUnits > 0 ? (totalPoints / totalUnits).toFixed(2) : '0.00';
            
            const transcriptDate = new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            const modal = document.createElement('div');
            modal.className = 'modal-overlay transcript-modal';
            modal.innerHTML = `
                <div class="modal-content transcript-content">
                    <div class="transcript-header">
                        <div class="school-header">
                            <div class="school-logo">
                                <i class="fas fa-graduation-cap"></i>
                            </div>
                            <div class="school-info">
                                <h1>NAKURU COLLEGE OF HEALTH SCIENCE AND MANAGEMENT</h1>
                                <h2>OFFICIAL ACADEMIC TRANSCRIPT</h2>
                                <p class="motto">Excellence in Health Education and Management</p>
                            </div>
                            <div class="transcript-number">
                                <p>Transcript No: ${String(this.userId).substring(0, 8).toUpperCase()}</p>
                                <p>Date: ${transcriptDate}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="student-info-section">
                        <div class="section-title">
                            <i class="fas fa-user-graduate"></i> STUDENT INFORMATION
                        </div>
                        <div class="info-grid">
                            <div class="info-item">
                                <span class="info-label">Full Name:</span>
                                <span class="info-value">${this.userProfile.full_name || 'Not Provided'}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Student ID:</span>
                                <span class="info-value">${this.userId || 'N/A'}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Program:</span>
                                <span class="info-value">${this.programName}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Program Level:</span>
                                <span class="info-value">${this.programLevel}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Intake Year:</span>
                                <span class="info-value">${this.intakeYear}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">${this.isTVETStudent ? 'Term' : 'Block'}:</span>
                                <span class="info-value">${this.isTVETStudent ? this.userTerm : this.userBlock}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="grades-section">
                        <div class="section-title">
                            <i class="fas fa-chart-line"></i> ACADEMIC PERFORMANCE
                        </div>
                        
                        <div class="performance-summary">
                            <div class="summary-item">
                                <div class="summary-label">Total Exams Taken</div>
                                <div class="summary-value">${completedExams.length}</div>
                            </div>
                            <div class="summary-item">
                                <div class="summary-label">Overall Average</div>
                                <div class="summary-value">${completedExams.length > 0 ? 
                                    (completedExams.reduce((sum, exam) => sum + exam.totalPercentage, 0) / completedExams.length).toFixed(1) + '%' : 'N/A'}</div>
                            </div>
                            <div class="summary-item">
                                <div class="summary-label">Current GPA</div>
                                <div class="summary-value">${gpa}</div>
                            </div>
                        </div>
                        
                        <div class="grades-table-container">
                            <table class="transcript-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Exam Name</th>
                                        <th>Course/Subject</th>
                                        <th>Type</th>
                                        <th>CAT 1</th>
                                        <th>CAT 2</th>
                                        <th>Final Exam</th>
                                        <th>Total %</th>
                                        <th>Grade</th>
                                        <th>Grade Point</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${completedExams.map((exam, index) => `
                                        <tr>
                                            <td class="text-center">${index + 1}</td>
                                            <td>${this.escapeHtml(exam.exam_name || 'N/A')}</td>
                                            <td>${this.escapeHtml(exam.course_name || 'General')}</td>
                                            <td class="text-center">
                                                <span class="badge ${exam.isCatExam ? 'badge-cat' : 'badge-final'}">
                                                    ${exam.isCatExam ? 'CAT' : 'Final'}
                                                </span>
                                            </td>
                                            <td class="text-center">${exam.cat1Display}</td>
                                            <td class="text-center">${exam.cat2Display}</td>
                                            <td class="text-center">${exam.finalDisplay}</td>
                                            <td class="text-center"><strong>${exam.totalPercentage ? exam.totalPercentage.toFixed(1) + '%' : '--'}</strong></td>
                                            <td class="text-center">
                                                <span class="grade-badge ${exam.gradeClass}">${exam.gradeText}</span>
                                            </td>
                                            <td class="text-center"><strong>${exam.gradePoint.toFixed(1)}</strong></td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                                ${completedExams.length > 0 ? `
                                    <tfoot>
                                        <tr class="summary-row">
                                            <td colspan="7" class="text-end"><strong>GRADE POINT AVERAGE (GPA):</strong></td>
                                            <td colspan="3" class="text-center"><strong class="gpa-display">${gpa}</strong></td>
                                        </tr>
                                    </tfoot>
                                ` : ''}
                            </table>
                            
                            ${completedExams.length === 0 ? `
                                <div class="no-grades">
                                    <i class="fas fa-clipboard-list"></i>
                                    <p>No graded exams available for transcript</p>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="grading-scale-section">
                        <div class="section-title">
                            <i class="fas fa-scale-balanced"></i> GRADING SCALE
                        </div>
                        <div class="grading-scale-grid">
                            <div class="grade-item distinction">
                                <div class="grade-range">85% - 100%</div>
                                <div class="grade-letter">A</div>
                                <div class="grade-point">5.0</div>
                                <div class="grade-description">Distinction</div>
                            </div>
                            <div class="grade-item credit">
                                <div class="grade-range">75% - 84%</div>
                                <div class="grade-letter">B</div>
                                <div class="grade-point">4.0</div>
                                <div class="grade-description">Credit</div>
                            </div>
                            <div class="grade-item pass">
                                <div class="grade-range">60% - 74%</div>
                                <div class="grade-letter">C</div>
                                <div class="grade-point">3.0</div>
                                <div class="grade-description">Pass</div>
                            </div>
                            <div class="grade-item fail">
                                <div class="grade-range">0% - 59%</div>
                                <div class="grade-letter">F</div>
                                <div class="grade-point">0.0</div>
                                <div class="grade-description">Fail</div>
                            </div>
                        </div>
                        <div class="scale-note">
                            <p><strong>Note:</strong> Passing grade is 60% and above. Grades below 60% are considered Fail.</p>
                        </div>
                    </div>
                    
                    <div class="transcript-footer">
                        <div class="signature-section">
                            <div class="signature-line"></div>
                            <p>Registrar's Signature</p>
                        </div>
                        <div class="footer-info">
                            <p><strong>Nakuru College of Health Science and Management</strong></p>
                            <p>P.O. Box 301-20100, Nakuru, Kenya</p>
                            <p>Email: registrar@nchsm.ac.ke | Website: www.nchsm.ac.ke</p>
                            <p class="footer-note">This transcript is computer-generated and does not require a signature</p>
                        </div>
                    </div>
                    
                    <div class="modal-actions">
                        <button class="btn btn-secondary print-transcript">
                            <i class="fas fa-print"></i> Print Transcript
                        </button>
                        <button class="btn btn-primary close-transcript">
                            <i class="fas fa-times"></i> Close
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Add styles for transcript
            this.addTranscriptStyles();
            
            // Add event listeners
            modal.querySelector('.close-transcript').onclick = () => modal.remove();
            modal.querySelector('.print-transcript').onclick = () => this.printTranscript();
            
            modal.onclick = (e) => {
                if (e.target === modal) modal.remove();
            };
        }
        
        addTranscriptStyles() {
            if (!document.getElementById('transcript-styles')) {
                const style = document.createElement('style');
                style.id = 'transcript-styles';
                style.textContent = `
                    .transcript-modal .modal-content {
                        max-width: 1000px;
                        width: 95%;
                        padding: 0;
                        overflow-y: auto;
                        max-height: 90vh;
                    }
                    
                    .transcript-content {
                        font-family: 'Times New Roman', Times, serif;
                        background: white;
                        color: #333;
                    }
                    
                    .transcript-header {
                        background: linear-gradient(135deg, #0066cc, #004d99);
                        color: white;
                        padding: 25px;
                        text-align: center;
                        border-bottom: 3px solid #ff6600;
                    }
                    
                    .school-header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        margin-bottom: 15px;
                    }
                    
                    .school-logo {
                        font-size: 40px;
                        color: #ff6600;
                    }
                    
                    .school-info h1 {
                        margin: 0;
                        font-size: 20px;
                        font-weight: bold;
                        letter-spacing: 0.5px;
                        line-height: 1.3;
                    }
                    
                    .school-info h2 {
                        margin: 5px 0;
                        font-size: 18px;
                        font-weight: normal;
                        letter-spacing: 1px;
                    }
                    
                    .school-info .motto {
                        margin: 5px 0 0;
                        font-style: italic;
                        color: #ffcc80;
                    }
                    
                    .transcript-number {
                        text-align: right;
                        font-size: 12px;
                        background: rgba(255, 255, 255, 0.1);
                        padding: 8px 12px;
                        border-radius: 4px;
                    }
                    
                    .student-info-section, .grades-section, .grading-scale-section {
                        padding: 25px;
                        border-bottom: 1px solid #e0e0e0;
                    }
                    
                    .section-title {
                        font-size: 18px;
                        font-weight: bold;
                        color: #0066cc;
                        margin-bottom: 20px;
                        padding-bottom: 8px;
                        border-bottom: 2px solid #ff6600;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }
                    
                    .section-title i {
                        color: #ff6600;
                    }
                    
                    .info-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                        gap: 15px;
                    }
                    
                    .info-item {
                        display: flex;
                        justify-content: space-between;
                        padding: 10px 15px;
                        background: #f5f5f5;
                        border-radius: 4px;
                        border-left: 3px solid #0066cc;
                    }
                    
                    .info-label {
                        font-weight: bold;
                        color: #555;
                    }
                    
                    .info-value {
                        color: #0066cc;
                        font-weight: 600;
                    }
                    
                    .performance-summary {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                        gap: 15px;
                        margin-bottom: 25px;
                    }
                    
                    .summary-item {
                        background: linear-gradient(135deg, #e8f4fd, #f0f8ff);
                        padding: 20px;
                        border-radius: 8px;
                        text-align: center;
                        border: 1px solid #bbdefb;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                    }
                    
                    .summary-label {
                        font-size: 14px;
                        color: #555;
                        margin-bottom: 8px;
                        font-weight: 500;
                    }
                    
                    .summary-value {
                        font-size: 28px;
                        font-weight: bold;
                        color: #0066cc;
                    }
                    
                    .grades-table-container {
                        overflow-x: auto;
                        margin: 20px 0;
                    }
                    
                    .transcript-table {
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 14px;
                    }
                    
                    .transcript-table th {
                        background: #0066cc;
                        color: white;
                        padding: 12px 8px;
                        text-align: center;
                        font-weight: 600;
                        border: 1px solid #004d99;
                    }
                    
                    .transcript-table td {
                        padding: 10px 8px;
                        border: 1px solid #ddd;
                        text-align: center;
                    }
                    
                    .transcript-table tr:nth-child(even) {
                        background-color: #f9f9f9;
                    }
                    
                    .transcript-table tr:hover {
                        background-color: #f5f5f5;
                    }
                    
                    .summary-row {
                        background: #e8f4fd !important;
                        font-weight: bold;
                    }
                    
                    .gpa-display {
                        font-size: 20px;
                        color: #0066cc;
                    }
                    
                    .grading-scale-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                        gap: 15px;
                        margin-top: 15px;
                        margin-bottom: 15px;
                    }
                    
                    .grade-item {
                        padding: 15px;
                        border-radius: 8px;
                        text-align: center;
                        color: white;
                        transition: transform 0.2s;
                    }
                    
                    .grade-item:hover {
                        transform: translateY(-2px);
                    }
                    
                    .grade-item.distinction {
                        background: linear-gradient(135deg, #4caf50, #2e7d32);
                    }
                    
                    .grade-item.credit {
                        background: linear-gradient(135deg, #2196f3, #1565c0);
                    }
                    
                    .grade-item.pass {
                        background: linear-gradient(135deg, #ff9800, #ef6c00);
                    }
                    
                    .grade-item.fail {
                        background: linear-gradient(135deg, #f44336, #c62828);
                    }
                    
                    .grade-range {
                        font-size: 12px;
                        opacity: 0.9;
                        margin-bottom: 5px;
                    }
                    
                    .grade-letter {
                        font-size: 24px;
                        font-weight: bold;
                        margin-bottom: 5px;
                    }
                    
                    .grade-point {
                        font-size: 18px;
                        font-weight: bold;
                        margin-bottom: 5px;
                    }
                    
                    .grade-description {
                        font-size: 14px;
                        font-weight: 500;
                    }
                    
                    .scale-note {
                        background: #fff8e1;
                        padding: 12px 15px;
                        border-radius: 6px;
                        border-left: 4px solid #ffb300;
                        font-size: 13px;
                        color: #5d4037;
                        margin-top: 15px;
                    }
                    
                    .scale-note p {
                        margin: 0;
                    }
                    
                    .transcript-footer {
                        padding: 25px;
                        background: #f5f5f5;
                    }
                    
                    .signature-section {
                        text-align: right;
                        margin-bottom: 30px;
                    }
                    
                    .signature-line {
                        width: 200px;
                        height: 1px;
                        background: #333;
                        margin-left: auto;
                        margin-bottom: 5px;
                    }
                    
                    .footer-info {
                        text-align: center;
                        color: #666;
                        font-size: 12px;
                        line-height: 1.5;
                    }
                    
                    .footer-note {
                        font-style: italic;
                        color: #888;
                        margin-top: 10px;
                        font-size: 11px;
                    }
                    
                    .modal-actions {
                        padding: 20px;
                        display: flex;
                        justify-content: flex-end;
                        gap: 10px;
                        background: #f5f5f5;
                        border-top: 1px solid #ddd;
                    }
                    
                    .no-grades {
                        text-align: center;
                        padding: 40px;
                        color: #666;
                    }
                    
                    .no-grades i {
                        font-size: 48px;
                        margin-bottom: 15px;
                        color: #bbb;
                    }
                    
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        .transcript-modal .modal-content,
                        .transcript-modal .modal-content * {
                            visibility: visible;
                        }
                        .transcript-modal .modal-content {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            max-width: 100%;
                            padding: 0;
                            margin: 0;
                            box-shadow: none;
                        }
                        .modal-actions {
                            display: none;
                        }
                    }
                `;
                document.head.appendChild(style);
            }
        }
        
        printTranscript() {
            window.print();
        }
        
        showLoading() {
            const programType = this.isTVETStudent ? 'TVET' : 'KRCHN';
            const blockTerm = this.isTVETStudent ? `Term: ${this.userTerm}` : `Block: ${this.userBlock}`;
            
            const loadingHTML = (colspan) => `
                <tr class="loading">
                    <td colspan="${colspan}">
                        <div class="loading-content">
                            <div class="loading-spinner"></div>
                            <p>Loading ${programType} assessments...</p>
                            <small class="text-muted">${blockTerm} | ${this.programName}</small>
                        </div>
                    </td>
                </tr>`;
            
            if (this.currentTable) {
                this.currentTable.innerHTML = loadingHTML(11);
            }
            if (this.completedTable) {
                this.completedTable.innerHTML = loadingHTML(11);
            }
        }
        
        showError(message) {
            const errorHTML = (colspan) => `
                <tr class="error">
                    <td colspan="${colspan}">
                        <div class="error-content">
                            <i class="fas fa-exclamation-circle"></i>
                            <p>${message}</p>
                            <small class="text-muted">Program: ${this.programName}</small>
                            <br>
                            <button onclick="window.examsModule.loadExams()" class="btn btn-sm">
                                <i class="fas fa-redo"></i> Retry
                            </button>
                        </div>
                    </td>
                </tr>`;
            
            if (this.currentTable) {
                this.currentTable.innerHTML = errorHTML(11);
            }
            if (this.completedTable) {
                this.completedTable.innerHTML = errorHTML(11);
            }
        }
        
        escapeHtml(str) {
            if (!str) return '';
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }
        
        calculateDashboardMetrics() {
            const completedExams = this.allExams.filter(exam => exam.isCompleted && exam.totalPercentage !== null);
            const totalCompleted = completedExams.length;
            
            const activeExams = this.allExams.filter(exam => !exam.isCompleted);
            
            const defaultMetrics = {
                upcomingExam: 'No upcoming exams',
                upcomingExamName: 'None',
                upcomingCount: 0,
                gradedExams: 0,
                averageScore: 0,
                bestScore: 0,
                passRate: 0,
                programType: this.programType,
                programName: this.programName,
                programLevel: this.programLevel,
                isTVETStudent: this.isTVETStudent,
                lastUpdated: new Date().toISOString()
            };
            
            if (activeExams.length === 0) {
                return defaultMetrics;
            }
            
            let upcomingText = 'No upcoming exams';
            let upcomingName = 'None';
            
            if (activeExams.length > 0) {
                const nextExam = activeExams[0];
                const examDate = nextExam.exam_date ? new Date(nextExam.exam_date) : null;
                
                upcomingName = nextExam.exam_name || 'Untitled Exam';
                
                if (examDate) {
                    const now = new Date();
                    const diffDays = Math.ceil((examDate - now) / (1000 * 60 * 60 * 24));
                    
                    if (diffDays <= 0) {
                        upcomingText = `Today: ${upcomingName}`;
                    } else if (diffDays === 1) {
                        upcomingText = `Tomorrow: ${upcomingName}`;
                    } else if (diffDays <= 7) {
                        upcomingText = `${diffDays}d: ${upcomingName}`;
                    } else {
                        upcomingText = `Future: ${upcomingName}`;
                    }
                } else {
                    upcomingText = `Active: ${upcomingName}`;
                }
                
                if (activeExams.length > 1) {
                    upcomingText += ` (+${activeExams.length - 1} more)`;
                }
            }
            
            let averageScore = 0;
            let bestScore = 0;
            let passRate = 0;
            
            if (totalCompleted > 0) {
                const scores = completedExams.map(exam => exam.totalPercentage);
                averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
                bestScore = Math.max(...scores);
                const passedExams = completedExams.filter(exam => exam.totalPercentage >= 60).length;
                passRate = (passedExams / totalCompleted) * 100;
            }
            
            return {
                upcomingExam: upcomingText,
                upcomingExamName: upcomingName,
                upcomingCount: activeExams.length,
                gradedExams: totalCompleted,
                averageScore: Math.round(averageScore * 10) / 10,
                bestScore: Math.round(bestScore * 10) / 10,
                passRate: Math.round(passRate),
                programType: this.programType,
                programName: this.programName,
                programLevel: this.programLevel,
                isTVETStudent: this.isTVETStudent,
                lastUpdated: new Date().toISOString()
            };
        }
        
        getDashboardData() {
            return this.calculateDashboardMetrics();
        }
        
        refresh() {
            this.loadExams();
        }
    }
    
    // Wait for DOM to be ready before initializing
    function initializeExamsModule() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                console.log('📄 DOM loaded, initializing exams module...');
                window.examsModule = new ExamsModule();
            });
        } else {
            console.log('📄 DOM already loaded, initializing exams module...');
            window.examsModule = new ExamsModule();
        }
    }
    
    // Initialize the module
    initializeExamsModule();
    
    // Global functions
    window.loadExams = () => window.examsModule?.refresh();
    window.refreshAssessments = () => window.examsModule?.refresh();
    
    window.getExamsDashboardMetrics = function() {
        if (window.examsModule) {
            return window.examsModule.getDashboardData();
        }
        return {
            upcomingExam: 'None',
            upcomingCount: 0,
            gradedExams: 0,
            averageScore: 0,
            bestScore: 0,
            passRate: 0,
            programType: 'Unknown',
            programName: 'Unknown',
            programLevel: 'Unknown',
            isTVETStudent: false,
            lastUpdated: new Date().toISOString()
        };
    };
    
    console.log('✅ Exams module ready with Nakuru College of Health Science and Management branding!');
})();
