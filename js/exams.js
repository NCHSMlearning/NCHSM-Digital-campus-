// exams.js - COMPLETE FIXED VERSION WITH ONE-CALL OPTIMIZATION
// Displays released results (including FAIL with 0 marks) in Completed section
// Also fetches published scores from Nursing School System
(function() {
    'use strict';
    
    console.log('✅ exams.js - ONE-CALL OPTIMIZED VERSION');
    
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
            this.countdownInterval = null;
            
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
            
            // Start countdown timer
            this.startCountdownTimer();
        }
        
        startCountdownTimer() {
            if (this.countdownInterval) clearInterval(this.countdownInterval);
            
            this.countdownInterval = setInterval(() => {
                if (this.currentExams && this.currentExams.length > 0) {
                    this.updateDisplayedCountdowns();
                }
            }, 1000);
        }
        
        updateDisplayedCountdowns() {
            const now = new Date();
            const kenyaNow = new Date(now.getTime() + (3 * 60 * 60 * 1000));
            
            this.currentExams.forEach(exam => {
                if (exam.examStartDateTime && exam.examEndDateTime && exam.actionState === 'available') {
                    if (kenyaNow >= exam.examStartDateTime && kenyaNow <= exam.examEndDateTime) {
                        const timeLeftMs = exam.examEndDateTime - kenyaNow;
                        const minutesLeft = Math.floor(timeLeftMs / 60000);
                        const secondsLeft = Math.floor((timeLeftMs % 60000) / 1000);
                        
                        const rowElement = document.querySelector(`tr[data-exam-id="${exam.id}"]`);
                        if (rowElement) {
                            const timeRemainingSpan = rowElement.querySelector('.time-remaining');
                            if (timeRemainingSpan) {
                                timeRemainingSpan.innerHTML = `<i class="fas fa-hourglass-half"></i> Time left: ${minutesLeft}m ${secondsLeft}s`;
                            }
                        }
                    }
                }
            });
        }
        
        getExamPeriod() {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth();
            
            if (month >= 2 && month <= 5) {
                return `March - June ${year} (Trimester 1)`;
            } else if (month >= 6 && month <= 9) {
                return `July - October ${year} (Trimester 2)`;
            } else {
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
            // Current exams: NOT completed AND NOT expired AND NOT released (pending)
            this.currentExams = this.allExams.filter(exam => 
                !exam.isCompleted && exam.actionState !== 'expired' && exam.actionState !== 'pending_release'
            );
            
            // Completed exams: isCompleted OR expired OR released (including FAIL)
            this.completedExams = this.allExams.filter(exam => 
                exam.isCompleted || exam.actionState === 'expired' || exam.actionState === 'pending_release'
            );
            
            if (this.currentFilter === 'current') {
                this.completedExams = [];
            } else if (this.currentFilter === 'completed') {
                this.currentExams = [];
            }
            
            this.displayTables();
            this.updateCounts();
        }
        
        // ==================== LOAD NCK MARKS FROM NURSING SCHOOL SYSTEM ====================
        async loadNCKMarksFromSystem() {
            console.log('🔄 Loading NCK marks from Nursing School System...');
            
            const admission = this.userProfile?.student_id || this.userProfile?.admission || window.db?.currentUserProfile?.student_id;
            
            if (!admission) {
                console.log('⚠️ No admission number found');
                return;
            }
            
            console.log('📚 Fetching published marks for admission:', admission);
            
            try {
                const encodedAdmission = encodeURIComponent(admission);
                const response = await fetch(`https://nchsm-marks-proxy.onrender.com/api/student/marks/${encodedAdmission}`, {
                    headers: { 
                        'Content-Type': 'application/json',
                        'X-Year': this.intakeYear || '2026'
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    console.log(`✅ Found ${data.marks?.length || 0} published marks from NCK system`);
                    
                    if (data.marks && data.marks.length > 0) {
                        const nckExams = data.marks.map((mark, index) => {
                            const finalScore = parseFloat(mark.final) || 0;
                            
                            let gradeClass = 'fail';
                            let gradeText = 'Fail';
                            if (finalScore >= 85) {
                                gradeClass = 'distinction';
                                gradeText = 'Distinction';
                            } else if (finalScore >= 75) {
                                gradeClass = 'credit';
                                gradeText = 'Credit';
                            } else if (finalScore >= 60) {
                                gradeClass = 'pass';
                                gradeText = 'Pass';
                            } else if (finalScore > 0) {
                                gradeClass = 'fail';
                                gradeText = 'Fail';
                            }
                            
                            // ✅ FIX: Determine if this is a CAT exam (assessmentType !== 'exam_only')
                            const isCatExam = mark.assessmentType !== 'exam_only';
                            
                            return {
                                id: `nck_${mark.block}_${mark.subject}_${index}`,
                                exam_name: mark.subject,
                                exam_type: mark.assessmentType === 'full' ? 'CAT' : (mark.assessmentType === 'single_cat' ? 'CAT' : 'EXAM'),
                                isCatExam: isCatExam,
                                isCompleted: true,
                                isReleased: true,
                                hasGrade: finalScore > 0,
                                totalPercentage: finalScore,
                                gradeText: gradeText,
                                gradeClass: gradeClass,
                                cat1Display: mark.cat1 ? `${mark.cat1}` : '--',
                                cat2Display: mark.cat2 ? `${mark.cat2}` : '--',
                                finalDisplay: mark.exam ? `${mark.exam}` : '--',
                                course: mark.subject,
                                block_term: mark.block?.replace('_', ' ') || 'N/A',
                                formattedGradedDate: new Date().toLocaleDateString(),
                                formattedExamDateTime: new Date().toLocaleDateString(),
                                isFromNCK: true,
                                programBadgeClass: 'badge-nck',
                                programIcon: 'fa-stethoscope',
                                programDisplay: 'NCK System',
                                examLink: null,
                                canTakeExam: false,
                                actionState: 'completed',
                                buttonText: 'View Results',
                                marks_out_of: isCatExam ? 30 : 100,
                                cat1Score: mark.cat1 ? parseFloat(mark.cat1) : null,
                                cat2Score: mark.cat2 ? parseFloat(mark.cat2) : null,
                                finalScore: mark.exam ? parseFloat(mark.exam) : null,
                                marks: mark.final ? parseFloat(mark.final) : 0
                            };
                        });
                        
                        const existingIds = new Set(this.completedExams.map(e => e.id));
                        const newExams = nckExams.filter(exam => !existingIds.has(exam.id));
                        
                        if (newExams.length > 0) {
                            this.completedExams = [...this.completedExams, ...newExams];
                            console.log(`✅ Added ${newExams.length} NCK marks to completed section`);
                            this.displayCompletedTable();
                            this.updateCounts();
                        }
                    }
                } else {
                    console.log('No published marks found for this student');
                }
            } catch (error) {
                console.error('Failed to fetch NCK marks:', error);
            }
        }
        
        async loadNCKClinicalScore() {
            const admission = this.userProfile?.student_id || this.userProfile?.admission || window.db?.currentUserProfile?.student_id;
            if (!admission) return;
            
            try {
                const encodedAdmission = encodeURIComponent(admission);
                const response = await fetch(`https://nchsm-marks-proxy.onrender.com/api/nck-student/${encodedAdmission}`);
                const data = await response.json();
                
                if (data.scores && data.scores.length > 0) {
                    const validScores = data.scores.filter(s => s > 0);
                    const avgScore = validScores.length > 0 
                        ? (validScores.reduce((a,b) => a+b, 0) / validScores.length).toFixed(1)
                        : 0;
                    
                    document.dispatchEvent(new CustomEvent('nckScoreUpdate', {
                        detail: { score: avgScore, count: validScores.length }
                    }));
                }
            } catch (error) {
                console.error('Failed to load NCK clinical score:', error);
            }
        }
        
        // ==================== OPTIMIZED MAIN LOAD EXAMS FUNCTION ====================
        // 🔥 FIX: ONE CALL FOR ALL EXAM DATA!
        async loadExams() {
            console.log('📥 Loading exams with ONE consolidated call...');
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
                
                // 🔥 ONE CALL: Get all exam data at once via RPC
                const { data, error } = await supabase.rpc('get_student_exams', {
                    p_user_id: this.userId
                });
                
                if (error) {
                    // Fallback to individual calls if RPC fails
                    console.warn('⚠️ RPC failed, falling back to individual calls...');
                    await this.loadExamsFallback();
                    return;
                }
                
                console.log(`📊 Loaded ${data?.exams?.length || 0} exams from RPC`);
                console.log(`📊 Loaded ${data?.grades?.length || 0} grades from RPC`);
                
                // Process the data
                const exams = data.exams || [];
                const grades = data.grades || [];
                
                // Set released results
                this.releasedResults.clear();
                if (data.released && data.released.length > 0) {
                    this.releasedResults = new Set(data.released.map(r => String(r)));
                    console.log(`✅ Loaded ${this.releasedResults.size} released results`);
                }
                
                // Process exams data
                this.processExamsData(exams, grades);
                
                // Apply filters and display
                this.applyDataFilter();
                
                console.log(`✅ Processed ${this.allExams.length} exams: ${this.currentExams.length} current, ${this.completedExams.length} completed`);
                
                // Load NCK marks in background (don't block)
                this.loadNCKMarksFromSystem().catch(e => console.warn('NCK load:', e));
                this.loadNCKClinicalScore().catch(e => console.warn('NCK score:', e));
                
                this.dispatchDashboardEvent();
                this.hideLoading();
                
            } catch (error) {
                console.error('❌ Error loading exams:', error);
                // Try fallback
                try {
                    await this.loadExamsFallback();
                } catch (fallbackError) {
                    console.error('❌ Fallback also failed:', fallbackError);
                    this.showError(error.message);
                }
            }
        }
        
        // ==================== FALLBACK LOAD EXAMS (Individual Calls) ====================
        async loadExamsFallback() {
            console.log('📥 Loading exams using fallback (individual calls)...');
            
            try {
                if (!window.db?.supabase) throw new Error('Database connection not available');
                const supabase = window.db.supabase;
                
                // BATCH LOAD: Get all data in parallel for speed
                const [examsResult, gradesResult, releasedResult] = await Promise.all([
                    supabase
                        .from('exams')
                        .select('*, course:course_id(course_name)')
                        .eq('intake_year', this.intakeYear)
                        .eq('program_type', this.programType)
                        .eq('block', this.userBlock)
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
        
       processExamsData(exams, grades) {
    const gradeMap = new Map();
    grades.forEach(grade => {
        gradeMap.set(String(grade.exam_id), grade);
    });
    
    // 🔥 FIX: Get current time (Kenya Time UTC+3)
    const now = new Date();
    const kenyaNow = new Date(now.getTime() + (3 * 60 * 60 * 1000));
    
    // Group exams by name and intake year
    const examGroups = new Map();
    
    exams.forEach(exam => {
        const groupKey = `${exam.exam_name || exam.title || 'Untitled'}_${exam.intake_year}`;
        
        // ✅ Determine total marks based on exam type
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
                block_term: exam.block_term,
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
                is_published: exam.is_published || false,
                released: exam.released || false
            });
        }
        
        const group = examGroups.get(groupKey);
        if (exam.course_name) group.course_levels.add(exam.course_name);
        if (exam.block_term) group.blocks.add(exam.block_term);
        if (exam.program_type) group.programs.add(exam.program_type === 'TVET' ? 'TVET Program' : 'KRCHN Program');
        
        // 🔥 FIX: Check if grade exists and is released
        const grade = gradeMap.get(String(exam.id));
        if (grade) {
            // Only set grade if it has valid data
            if (grade.marks !== null || grade.total_score !== null || grade.result_status) {
                group.grade = grade;
            }
        }
    });
    
    // Process each exam group
    this.allExams = Array.from(examGroups.values()).map(group => {
        const grade = group.grade;
        const gradeId = grade?.id;
        
        // 🔥 CRITICAL FIX: Check release status from MULTIPLE sources
        let isReleased = false;
        let isPendingRelease = false;
        
        if (gradeId) {
            // 1. Check released_exam_results table via this.releasedResults Set
            if (this.releasedResults.has(String(gradeId))) {
                isReleased = true;
            }
            
            // 2. Check if grade has result_status = 'RELEASED'
            if (grade?.result_status === 'RELEASED' || grade?.result_status === 'PASS' || grade?.result_status === 'FAIL') {
                isReleased = true;
            }
            
            // 3. Check if grade has been graded (has marks and is not pending)
            if (grade?.marks !== null && grade?.marks !== undefined && 
                (grade?.result_status !== 'PENDING_REVIEW' && grade?.result_status !== 'PENDING')) {
                // If marks exist and not pending, it's released
                if (grade.marks > 0 || grade.total_score > 0) {
                    isReleased = true;
                }
            }
            
            // 4. Check if exam itself is marked as released/published
            if (group.is_published || group.released) {
                isReleased = true;
            }
            
            // 5. Check if result_status is PENDING_REVIEW or PENDING
            if (grade?.result_status === 'PENDING_REVIEW' || grade?.result_status === 'PENDING') {
                isPendingRelease = true;
                isReleased = false; // Not released yet
            }
        }
        
        // 🔥 FIX: Also check if exam is marked as released in the exams table
        if (group.status === 'Released' || group.status === 'Completed' || group.status === 'Published') {
            if (grade && grade.marks !== null) {
                isReleased = true;
            }
        }
        
        const combinedCourse = Array.from(group.course_levels).join(' · ') || group.course || 'General';
        const combinedBlock = Array.from(group.blocks).join(' · ') || group.block_term || 'General';
        const combinedProgram = Array.from(group.programs).join(' · ') || 'KRCHN Program';
        
        // Extract scores from grade
        const cat1Score = grade?.cat_1_score ?? grade?.cat_score ?? null;
        const cat2Score = grade?.cat_2_score ?? null;
        const finalScore = grade?.exam_score ?? null;
        const totalPercentage = grade?.total_score ? parseFloat(grade.total_score) : null;
        const marks = grade?.marks ? parseFloat(grade.marks) : null;
        
        // Determine if student has taken this exam
        const hasTaken = grade && (grade.result_status === 'PASS' || grade.result_status === 'FAIL' || 
                                  grade.result_status === 'RELEASED' || grade.result_status === 'PENDING_REVIEW' || 
                                  grade.result_status === 'PENDING' || marks !== null || totalPercentage !== null);
        
        const examType = (group.exam_type || '').toUpperCase();
        const isCatExam = examType.includes('CAT');
        const isFinalExam = examType === 'EXAM' || examType === 'FINAL' || examType === 'END_TERM';
        
        // Build exam start datetime
        let examStartDateTime = null;
        let examEndDateTime = null;
        let formattedExamDateTime = 'TBA';
        let countdownText = '';
        let examStatus = 'upcoming';
        let statusMessage = '';
        let canStart = false;
        let timeRemainingMs = 0;
        
        if (group.exam_date) {
            const [year, month, day] = group.exam_date.split('-');
            
            if (group.exam_start_time) {
                const [hours, minutes, seconds] = group.exam_start_time.split(':');
                examStartDateTime = new Date(Date.UTC(year, month-1, day, hours, minutes, seconds || 0));
                examStartDateTime = new Date(examStartDateTime.getTime() + (3 * 60 * 60 * 1000));
            } else {
                examStartDateTime = new Date(Date.UTC(year, month-1, day, 0, 0, 0));
                examStartDateTime = new Date(examStartDateTime.getTime() + (3 * 60 * 60 * 1000));
            }
            
            examEndDateTime = new Date(examStartDateTime.getTime() + (group.duration_minutes || 40) * 60000);
            
            const dateOptions = { month: 'short', day: 'numeric', year: 'numeric' };
            formattedExamDateTime = new Date(group.exam_date).toLocaleDateString('en-US', dateOptions);
            
            if (group.exam_start_time) {
                const [hours, minutes] = group.exam_start_time.split(':');
                const hour12 = parseInt(hours) % 12 || 12;
                const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM';
                formattedExamDateTime += ` at ${hour12}:${minutes} ${ampm}`;
            }
        }
        
        // Determine exam status based on current time
        if (examStartDateTime && examEndDateTime) {
            if (kenyaNow < examStartDateTime) {
                examStatus = 'upcoming';
                const diffMs = examStartDateTime - kenyaNow;
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                if (diffHours > 24) {
                    const diffDays = Math.floor(diffHours / 24);
                    countdownText = `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
                } else if (diffHours > 0) {
                    countdownText = `in ${diffHours}h ${diffMinutes}m`;
                } else if (diffMinutes > 0) {
                    countdownText = `in ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
                } else {
                    countdownText = `in a few seconds`;
                }
                statusMessage = `📅 ${countdownText}`;
                canStart = false;
            } else if (kenyaNow >= examStartDateTime && kenyaNow <= examEndDateTime) {
                examStatus = 'available';
                const timeLeftMs = examEndDateTime - kenyaNow;
                const minutesLeft = Math.floor(timeLeftMs / 60000);
                const secondsLeft = Math.floor((timeLeftMs % 60000) / 1000);
                statusMessage = `🟢 Available Now! Time left: ${minutesLeft}m ${secondsLeft}s`;
                canStart = true;
                timeRemainingMs = timeLeftMs;
            } else if (kenyaNow > examEndDateTime) {
                if (group.status === 'Closed' || group.status === 'Completed' || group.status === 'Released') {
                    examStatus = 'expired';
                    statusMessage = '🔒 Exam Closed';
                    canStart = false;
                } else {
                    examStatus = 'available';
                    statusMessage = '📋 Exam Available - Auto-Grading Active';
                    canStart = true;
                }
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
        
        // 🔥 CRITICAL FIX: Properly handle RELEASED results
        if (isReleased && hasTaken) {
            // ✅ RELEASED - Show in Completed section
            isCompleted = true;
            finalStatus = 'completed';
            finalCanStart = false;
            finalMessage = '✅ Results Released';
            buttonText = 'View Results';
            
            // Get the score
            if (isCatExam) {
                displayScore = cat1Score || cat2Score || marks || 0;
                displayScore = Math.min(displayScore, 30);
            } else {
                displayScore = marks || totalPercentage || 0;
                displayScore = Math.min(displayScore, totalMarks);
            }
            
            // Calculate percentage
            const calcPercentage = totalMarks > 0 ? (displayScore / totalMarks) * 100 : 0;
            displayPercentage = Math.round(calcPercentage);
            
            // Determine grade
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
            
        } else if (isPendingRelease) {
            // ⏳ PENDING RELEASE - Show in Current section with pending badge
            finalStatus = 'pending_release';
            finalCanStart = false;
            finalMessage = '⏳ Pending Release';
            buttonText = 'Pending Release';
            isCompleted = false;
            gradeText = 'Pending';
            gradeClass = 'pending';
            displayPercentage = null;
            
        } else if (hasTaken && !isReleased) {
            // ⏳ Taken but not released
            finalStatus = 'pending_release';
            finalCanStart = false;
            finalMessage = '⏳ Awaiting Admin Review';
            buttonText = 'Pending';
            isCompleted = false;
            gradeText = 'Pending Review';
            gradeClass = 'pending';
            
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
            buttonText = countdownText || 'Coming Soon';
            isCompleted = false;
            
        } else if (examStatus === 'expired' && !hasTaken) {
            finalStatus = 'expired';
            buttonText = 'Missed';
            gradeText = 'Missed';
            gradeClass = 'missed';
            isCompleted = true;
            
        } else {
            finalStatus = 'pending';
            buttonText = 'Not Available';
            isCompleted = false;
        }
        
        // Format score displays
        let cat1Display = '--';
        let cat2Display = '--';
        let finalDisplay = '--';
        
        if (isReleased || hasTaken) {
            if (isCatExam) {
                if (cat1Score !== null && cat1Score !== undefined) cat1Display = `${cat1Score}`;
                if (cat2Score !== null && cat2Score !== undefined) cat2Display = `${cat2Score}`;
                // For released CAT, show percentage in CAT columns
                if (isReleased && displayPercentage !== null) {
                    cat1Display = `${displayPercentage}%`;
                    cat2Display = `${displayPercentage}%`;
                }
            } else {
                if (cat1Score !== null && cat1Score !== undefined) cat1Display = `${cat1Score}`;
                if (cat2Score !== null && cat2Score !== undefined) cat2Display = `${cat2Score}`;
                if (finalScore !== null && finalScore !== undefined) finalDisplay = `${finalScore}`;
            }
        }
        
        // For released results, show the total percentage
        if (isReleased && displayPercentage !== null) {
            if (isCatExam) {
                cat1Display = `${displayPercentage}%`;
                cat2Display = `${displayPercentage}%`;
            }
        }
        
        return {
            ...group,
            id: group.id,
            exam_name: group.exam_name,
            title: group.title,
            exam_type: group.exam_type || (isCatExam ? 'CAT' : 'EXAM'),
            isCatExam: isCatExam,
            isFinalExam: isFinalExam,
            isCompleted: isCompleted,
            isReleased: isReleased,
            isPendingRelease: isPendingRelease,
            hasGrade: hasTaken,
            isDatePassed: examStatus === 'expired',
            completionReason: finalStatus,
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
            formattedGradedDate: grade?.graded_at ? new Date(grade.graded_at).toLocaleDateString() : '--',
            programBadgeClass: group.program_type === 'TVET' ? 'badge-tvet' : 'badge-krchn',
            programIcon: group.program_type === 'TVET' ? 'fa-tools' : 'fa-graduation-cap',
            programDisplay: combinedProgram,
            course: combinedCourse,
            block_term: combinedBlock,
            status: group.status,
            result_status: grade?.result_status || null
        };
    });
    
    // Log summary
    const releasedCount = this.allExams.filter(e => e.isReleased).length;
    const pendingCount = this.allExams.filter(e => e.actionState === 'pending_release').length;
    const currentCount = this.allExams.filter(e => !e.isCompleted && e.actionState !== 'expired' && e.actionState !== 'pending_release').length;
    const completedCount = this.allExams.filter(e => e.isCompleted || e.actionState === 'expired' || e.actionState === 'pending_release').length;
    
    console.log(`✅ Processed ${this.allExams.length} exams:`);
    console.log(`   📊 Released: ${releasedCount}`);
    console.log(`   ⏳ Pending Release: ${pendingCount}`);
    console.log(`   📝 Current: ${currentCount}`);
    console.log(`   ✅ Completed: ${completedCount}`);
}
        
        displayTables() {
            this.displayCurrentTable();
            this.displayCompletedTable();
            this.updateCounts();
            this.updateEmptyStates();
        }
        
        displayCurrentTable() {
            if (!this.currentTable) return;
            
            const activeExams = this.currentExams.filter(exam => !exam.isCompleted && exam.actionState !== 'expired' && exam.actionState !== 'pending_release');
            
            if (activeExams.length === 0) {
                this.currentTable.innerHTML = '';
                return;
            }
            
            // Get user details for the link
            const userId = this.userId || window.db?.currentUserId || '';
            const userProgram = this.programCode || 'KRCHN';
            const userBlock = this.userBlock || 'A';
            const userIntake = this.intakeYear || 2025;
            
            const html = activeExams.map(exam => {
                const isCatExam = exam.isCatExam;
                const examDisplayName = exam.exam_name || exam.title || 'Assessment';
                let actionHtml = '';
                let timeRemainingHtml = '';
                
                if (exam.actionState === 'available' && exam.canTakeExam && exam.hasValidLink) {
                    let examLink = exam.examLink;
                    const baseUrl = examLink.split('?')[0];
                    const existingParams = examLink.includes('?') ? examLink.split('?')[1] : '';
                    
                    const params = new URLSearchParams();
                    params.append('user_id', userId);
                    params.append('exam_id', exam.id);
                    
                    if (existingParams) {
                        const existing = new URLSearchParams(existingParams);
                        existing.forEach((value, key) => {
                            if (!params.has(key)) {
                                params.append(key, value);
                            }
                        });
                    }
                    
                    const fullUrl = `${baseUrl}?${params.toString()}`;
                    
                    actionHtml = `<a href="${fullUrl}" 
                                    target="_blank" 
                                    class="exam-link-btn btn-primary"
                                    onclick="sessionStorage.setItem('returningFromExam', 'true'); sessionStorage.setItem('examUserId', '${userId}');"
                                    style="display: inline-block; padding: 8px 16px; background: #38A169; color: white; border-radius: 8px; text-decoration: none; font-weight: 600;">
                                    <i class="fas fa-external-link-alt"></i> Start Exam
                                </a>`;
                    
                    if (exam.timeRemainingMs > 0) {
                        const minutesLeft = Math.floor(exam.timeRemainingMs / 60000);
                        const secondsLeft = Math.floor((exam.timeRemainingMs % 60000) / 1000);
                        timeRemainingHtml = `<div class="time-remaining" style="font-size: 0.7rem; color: #059669; margin-top: 5px;">
                                                <i class="fas fa-hourglass-half"></i> Time left: ${minutesLeft}m ${secondsLeft}s
                                            </div>`;
                    }
                } 
                else if (exam.actionState === 'upcoming') {
                    actionHtml = `<span class="exam-link-btn btn-secondary" style="display: inline-block; padding: 8px 16px; background: #6B7280; color: white; border-radius: 8px; cursor: not-allowed;">
                                    <i class="fas fa-hourglass-half"></i> ${exam.countdownText || 'Coming Soon'}
                                </span>`;
                }
                else {
                    actionHtml = `<span class="exam-link-btn btn-secondary" style="display: inline-block; padding: 8px 16px; background: #6B7280; color: white; border-radius: 8px; cursor: not-allowed;">
                                    <i class="fas fa-clock"></i> ${exam.buttonText || 'Coming Soon'}
                                </span>`;
                }
                
                let statusHtml = `<span class="status-badge ${exam.gradeClass}">${exam.gradeText}</span>`;
                
                let assessmentCell = `
                    <div class="assessment-info-box">
                        <div class="assessment-name">
                            <strong>${this.escapeHtml(examDisplayName)}</strong>
                            <span class="${isCatExam ? 'badge-cat' : 'badge-final'}">${isCatExam ? 'CAT' : 'Exam'}</span>
                        </div>
                        <div class="assessment-details">
                            <span class="detail-item"><i class="fas fa-book"></i> ${this.escapeHtml(exam.course || 'General')}</span>
                            <span class="detail-item"><i class="fas fa-layer-group"></i> ${exam.block_term || 'General'}</span>
                            <span class="program-badge ${exam.programBadgeClass}">
                                <i class="fas ${exam.programIcon}"></i> ${this.escapeHtml(exam.programDisplay)}
                            </span>
                        </div>
                        ${exam.formattedExamDateTime !== 'TBA' ? `<div class="exam-datetime"><i class="fas fa-calendar-clock"></i> ${exam.formattedExamDateTime}</div>` : ''}
                        ${timeRemainingHtml}
                    </div>
                `;
                
                return `
                    <tr class="assessment-row ${isCatExam ? 'cat-exam' : 'final-exam'}" data-exam-id="${exam.id}">
                        <td class="assessment-cell">${assessmentCell}</td>
                        <td class="text-center date-cell">${exam.formattedExamDateTime}</td>
                        <td class="text-center status-cell">${statusHtml}</td>
                        <td class="text-center">${exam.cat1Display}</td>
                        <td class="text-center">${exam.cat2Display}</td>
                        <td class="text-center">${exam.finalDisplay}</td>
                        <td class="text-center total-cell">${exam.totalPercentage !== null ? `${exam.totalPercentage.toFixed(1)}%` : '--'}</td>
                        <td class="text-center action-cell">${actionHtml}</td>
                    </tr>
                `;
            }).join('');
            
            this.currentTable.innerHTML = html;
        }
        
        // ✅ FIXED: Proper CAT marks display
      displayCompletedTable() {
    if (!this.completedTable) return;
    
    // 🔥 FIX: Show both completed AND released exams
    const completedReleased = this.completedExams.filter(exam => 
        exam.isCompleted || exam.isReleased || exam.actionState === 'expired' || exam.actionState === 'pending_release'
    );
    
    if (completedReleased.length === 0) {
        this.completedTable.innerHTML = '';
        return;
    }
    
    const html = completedReleased.map(exam => {
        const isCatExam = exam.isCatExam;
        const examDisplayName = exam.exam_name || exam.title || 'Assessment';
        
        // ✅ Determine total marks and display correctly
        let totalMarks = isCatExam ? 30 : (exam.marks_out_of || 100);
        let displayScore = exam.displayScore || exam.marks || 0;
        displayScore = Math.min(displayScore, totalMarks);
        
        // ✅ Calculate percentage
        const calcPercentage = totalMarks > 0 ? (displayScore / totalMarks) * 100 : 0;
        const displayPercent = Math.round(calcPercentage);
        const displayPercentage = `${displayPercent}%`;
        
        // ✅ CAT display: Show marks with denominator
        let catDisplayValue = '--';
        if (displayScore > 0) {
            catDisplayValue = `${displayScore}/${totalMarks}`;
        }
        
        // ✅ Grade determination
        let displayGrade = exam.gradeText || 'Not Started';
        let displayClass = exam.gradeClass || 'pending';
        
        if (displayPercent > 0) {
            if (displayPercent >= 85) {
                displayGrade = 'Distinction';
                displayClass = 'distinction';
            } else if (displayPercent >= 75) {
                displayGrade = 'Credit';
                displayClass = 'credit';
            } else if (displayPercent >= 60) {
                displayGrade = 'Pass';
                displayClass = 'pass';
            } else {
                displayGrade = 'Fail';
                displayClass = 'fail';
            }
        }
        
        // 🔥 If pending release, show pending badge
        if (exam.actionState === 'pending_release') {
            displayGrade = 'Pending Release';
            displayClass = 'pending';
        }
        
        // 🔥 If FAIL with 0 marks, show properly
        if (exam.isReleased && displayPercent === 0 && exam.gradeText === 'Fail') {
            displayGrade = 'Fail';
            displayClass = 'fail';
        }
        
        let assessmentCell = `
            <div class="assessment-info-box">
                <div class="assessment-name">
                    <strong>${this.escapeHtml(examDisplayName)}</strong>
                    <span class="${isCatExam ? 'badge-cat' : 'badge-final'}">${isCatExam ? 'CAT' : 'Exam'}</span>
                    ${exam.isReleased ? '<span class="badge-released">✅ Released</span>' : ''}
                    ${exam.actionState === 'pending_release' ? '<span class="badge-pending">⏳ Pending</span>' : ''}
                </div>
                <div class="assessment-details">
                    <span class="detail-item"><i class="fas fa-book"></i> ${this.escapeHtml(exam.course || 'General')}</span>
                    <span class="detail-item"><i class="fas fa-layer-group"></i> ${exam.block_term || 'General'}</span>
                    <span class="program-badge ${exam.programBadgeClass}">
                        <i class="fas ${exam.programIcon}"></i> ${this.escapeHtml(exam.programDisplay)}
                    </span>
                </div>
                ${exam.isReleased ? `<div style="font-size: 0.7rem; color: #10B981; margin-top: 4px;">📊 ${displayScore} / ${totalMarks} marks</div>` : ''}
                ${exam.actionState === 'pending_release' ? `<div style="font-size: 0.7rem; color: #F59E0B; margin-top: 4px;">⏳ Awaiting admin release</div>` : ''}
            </div>
        `;
        
        // CAT columns
        let cat1Display = exam.cat1Display || '--';
        let cat2Display = exam.cat2Display || '--';
        let finalDisplay = exam.finalDisplay || '--';
        
        // If released, show properly
        if (exam.isReleased && displayScore > 0) {
            if (isCatExam) {
                cat1Display = `${displayScore}/${totalMarks}`;
                cat2Display = `${displayScore}/${totalMarks}`;
            } else {
                if (exam.cat1Score !== null && exam.cat1Score !== undefined) {
                    cat1Display = `${exam.cat1Score}`;
                }
                if (exam.cat2Score !== null && exam.cat2Score !== undefined) {
                    cat2Display = `${exam.cat2Score}`;
                }
                if (exam.finalScore !== null && exam.finalScore !== undefined) {
                    finalDisplay = `${exam.finalScore}`;
                }
            }
        }
        
        let gradeBadge = `<span class="grade-badge ${displayClass}">${displayGrade}</span>`;
        let actionHtml = '';
        
        if (exam.isReleased && exam.hasGrade) {
            actionHtml = `<button class="exam-link-btn btn-success" onclick="window.examsModule?.viewExamResults(${exam.id})" style="padding: 8px 16px; background: #10B981; color: white; border-radius: 8px; border: none; cursor: pointer;">
                            <i class="fas fa-chart-line"></i> View Results
                        </button>`;
        } else if (exam.actionState === 'pending_release') {
            actionHtml = `<span class="exam-link-btn btn-warning" style="padding: 8px 16px; background: #F59E0B; color: white; border-radius: 8px; cursor: not-allowed;">
                            <i class="fas fa-clock"></i> Pending Release
                        </span>`;
        } else if (exam.actionState === 'expired') {
            actionHtml = `<span class="exam-link-btn btn-danger" style="padding: 8px 16px; background: #DC2626; color: white; border-radius: 8px; cursor: not-allowed;">
                            <i class="fas fa-calendar-times"></i> Missed
                        </span>`;
        } else {
            actionHtml = `<span class="exam-link-btn btn-secondary" style="padding: 8px 16px; background: #6B7280; color: white; border-radius: 8px; cursor: not-allowed;">
                            <i class="fas fa-check-circle"></i> ${exam.gradeText || 'Completed'}
                        </span>`;
        }
        
        return `
            <tr class="assessment-row ${isCatExam ? 'cat-exam' : 'final-exam'} ${exam.isReleased ? 'row-released' : ''}">
                <td class="assessment-cell">${assessmentCell}</td>
                <td class="text-center date-cell">${exam.formattedGradedDate !== '--' ? exam.formattedGradedDate : exam.formattedExamDateTime}</td>
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
            
            // Calculate average score for completed exams that are released
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
        
        async viewExamResults(examId) {
            try {
                const supabase = window.db?.supabase;
                if (!supabase) {
                    showToast('Database connection not available', 'warning');
                    return;
                }
                
                const { data: grade, error } = await supabase
                    .from('exam_grades')
                    .select('*')
                    .eq('student_id', this.userId)
                    .eq('exam_id', examId)
                    .eq('question_id', '00000000-0000-0000-0000-000000000000')
                    .single();
                
                if (error) throw error;
                
                const exam = this.allExams.find(e => e.id === examId);
                
                // ✅ FIX: Determine total marks based on exam type
                const isCatExam = exam?.isCatExam || false;
                let totalMarks = 30; // Default for CAT
                if (!isCatExam) {
                    totalMarks = exam?.marks_out_of || 100;
                }
                if (exam?.marks_out_of) {
                    totalMarks = exam.marks_out_of;
                }
                
                // ✅ FIX: Get the actual score
                let displayScore = 0;
                if (isCatExam) {
                    displayScore = grade?.cat_1_score || grade?.cat_2_score || grade?.marks || 0;
                    displayScore = Math.min(displayScore, 30);
                } else {
                    displayScore = grade?.marks || 0;
                    displayScore = Math.min(displayScore, totalMarks);
                }
                
                // ✅ FIX: Calculate percentage correctly
                const calcPercentage = totalMarks > 0 ? (displayScore / totalMarks) * 100 : 0;
                const percentage = Math.round(calcPercentage);
                
                let gradeText = '';
                let gradeColor = '';
                let gradeBg = '';
                let passText = '';
                
                const passMark = exam?.pass_mark || 60;
                const isPassed = percentage >= passMark;
                
                if (isPassed) {
                    if (percentage >= 85) {
                        gradeText = 'DISTINCTION';
                        gradeColor = '#065F46';
                        gradeBg = '#D1FAE5';
                    } else if (percentage >= 75) {
                        gradeText = 'CREDIT';
                        gradeColor = '#1E40AF';
                        gradeBg = '#DBEAFE';
                    } else if (percentage >= 60) {
                        gradeText = 'PASS';
                        gradeColor = '#92400E';
                        gradeBg = '#FEF3C7';
                    }
                    passText = '✅ PASS ✓';
                } else if (percentage > 0) {
                    gradeText = 'FAIL';
                    gradeColor = '#991B1B';
                    gradeBg = '#FEE2E2';
                    passText = '❌ FAIL ✗';
                } else {
                    gradeText = 'PENDING';
                    gradeColor = '#6B7280';
                    gradeBg = '#F3F4F6';
                    passText = '⏳ Pending';
                }
                
                // Small custom modal
                const modalHtml = `
                    <div id="resultModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 100000; display: flex; align-items: center; justify-content: center;">
                        <div style="background: white; border-radius: 16px; max-width: 320px; width: 90%; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);">
                            <div style="background: linear-gradient(135deg, #4C1D95, #6D28D9); padding: 16px; text-align: center;">
                                <div style="font-size: 32px;">📊</div>
                                <h3 style="margin: 4px 0 0 0; font-size: 16px; color: white; font-weight: 600;">Exam Results</h3>
                            </div>
                            <div style="padding: 16px;">
                                <div style="margin-bottom: 12px;">
                                    <div style="font-size: 11px; color: #6B7280; text-transform: uppercase;">Exam</div>
                                    <div style="font-size: 14px;">${this.escapeHtml(exam?.exam_name || exam?.title || 'N/A')}</div>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #F3F4F6;">
                                    <span style="font-size: 12px; color: #6B7280;">Score:</span>
                                    <span style="font-weight: 500;">${displayScore} / ${totalMarks} marks ${isCatExam ? '(CAT)' : ''}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #F3F4F6;">
                                    <span style="font-size: 12px; color: #6B7280;">Percentage:</span>
                                    <span style="font-weight: 600;">${percentage}%</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #F3F4F6;">
                                    <span style="font-size: 12px; color: #6B7280;">Pass Mark:</span>
                                    <span style="font-weight: 600;">${passMark}%</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #F3F4F6;">
                                    <span style="font-size: 12px; color: #6B7280;">Grade:</span>
                                    <span style="font-weight: 700; background: ${gradeBg}; color: ${gradeColor}; padding: 4px 10px; border-radius: 20px;">${gradeText}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between;">
                                    <span style="font-size: 11px; color: #6B7280;">Released:</span>
                                    <span style="font-size: 11px;">${grade.graded_at ? new Date(grade.graded_at).toLocaleDateString() : 'N/A'}</span>
                                </div>
                            </div>
                            <button onclick="document.getElementById('resultModal').remove()" style="width: 100%; padding: 12px; background: #4C1D95; color: white; border: none; font-size: 14px; font-weight: 500; cursor: pointer;">
                                Close
                            </button>
                        </div>
                    </div>
                `;
                
                const existingModal = document.getElementById('resultModal');
                if (existingModal) existingModal.remove();
                document.body.insertAdjacentHTML('beforeend', modalHtml);
                document.getElementById('resultModal').addEventListener('click', function(e) {
                    if (e.target === this) this.remove();
                });
                
            } catch (error) {
                console.error('Error loading exam results:', error);
                const errorModal = `
                    <div id="errorModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 100000; display: flex; align-items: center; justify-content: center;">
                        <div style="background: white; border-radius: 12px; max-width: 260px; width: 90%; padding: 20px; text-align: center;">
                            <div style="font-size: 36px;">⚠️</div>
                            <p style="margin: 10px 0; font-size: 13px;">Unable to load exam results.</p>
                            <button onclick="document.getElementById('errorModal').remove()" style="padding: 8px 20px; background: #4C1D95; color: white; border: none; border-radius: 8px; cursor: pointer;">OK</button>
                        </div>
                    </div>
                `;
                const existingError = document.getElementById('errorModal');
                if (existingError) existingError.remove();
                document.body.insertAdjacentHTML('beforeend', errorModal);
            }
        }
        
        showProfessionalTranscript() {
            const completedReleased = this.completedExams.filter(e => e.isReleased && e.totalPercentage !== null);
            if (completedReleased.length === 0) {
                const noResultsModal = `
                    <div id="noResultsModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 100000; display: flex; align-items: center; justify-content: center;">
                        <div style="background: white; border-radius: 12px; max-width: 260px; width: 90%; padding: 20px; text-align: center;">
                            <div style="font-size: 36px;">📋</div>
                            <p style="margin: 10px 0; font-size: 13px;">No released results available for transcript yet.</p>
                            <button onclick="document.getElementById('noResultsModal').remove()" style="padding: 8px 20px; background: #4C1D95; color: white; border: none; border-radius: 8px; cursor: pointer;">OK</button>
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
                    <div style="background: white; border-radius: 16px; max-width: 340px; width: 90%; overflow: hidden;">
                        <div style="background: linear-gradient(135deg, #4C1D95, #6D28D9); padding: 16px; text-align: center;">
                            <div style="font-size: 28px;">📜</div>
                            <h3 style="margin: 4px 0 0 0; font-size: 16px; color: white; font-weight: 600;">Academic Transcript</h3>
                        </div>
                        <div style="padding: 16px;">
                            <div style="text-align: center; margin-bottom: 16px;">
                                <div style="font-size: 28px; font-weight: 700; color: #4C1D95;">${avg.toFixed(1)}%</div>
                                <div style="font-size: 11px; color: #6B7280;">Overall Average</div>
                            </div>
                            <div style="display: flex; justify-content: space-around; margin-bottom: 16px;">
                                <div style="text-align: center;">
                                    <div style="font-weight: 700; font-size: 18px; color: #065F46;">${distinctionCount}</div>
                                    <div style="font-size: 10px; color: #6B7280;">Distinction</div>
                                </div>
                                <div style="text-align: center;">
                                    <div style="font-weight: 700; font-size: 18px; color: #1E40AF;">${creditCount}</div>
                                    <div style="font-size: 10px; color: #6B7280;">Credit</div>
                                </div>
                                <div style="text-align: center;">
                                    <div style="font-weight: 700; font-size: 18px; color: #92400E;">${passCount}</div>
                                    <div style="font-size: 10px; color: #6B7280;">Pass</div>
                                </div>
                            </div>
                            <div style="background: #F9FAFB; border-radius: 8px; padding: 10px; margin-bottom: 12px; text-align: center;">
                                <span style="font-size: 11px; color: #6B7280;">Completed Exams: ${completedReleased.length}</span>
                            </div>
                            <p style="font-size: 10px; color: #9CA3AF; text-align: center; margin: 0;">Contact registrar for official transcript</p>
                        </div>
                        <button onclick="document.getElementById('transcriptModal').remove()" style="width: 100%; padding: 12px; background: #4C1D95; color: white; border: none; font-size: 14px; font-weight: 500; cursor: pointer;">
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
        
        showLoading() {
            const loadingHTML = `<tr class="loading"><td colspan="8"><div class="loading-content"><div class="loading-spinner"></div><p>Loading assessments...</p></div></td></tr>`;
            if (this.currentTable) this.currentTable.innerHTML = loadingHTML;
            if (this.completedTable) this.completedTable.innerHTML = loadingHTML;
        }
        
        showError(message) {
            const errorHTML = `<tr class="error"><td colspan="8"><div class="error-content"><i class="fas fa-exclamation-circle"></i><p>${message}</p><button onclick="window.examsModule?.refresh()" class="btn btn-sm">Retry</button></div><\/td><\/tr>`;
            if (this.currentTable) this.currentTable.innerHTML = errorHTML;
            if (this.completedTable) this.completedTable.innerHTML = errorHTML;
        }
        
        hideLoading() {
            // Loading will be replaced by actual content
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
    
    // Initialize the module
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
    
    console.log('✅ Exams module ready - ONE-CALL OPTIMIZED!');
})();
