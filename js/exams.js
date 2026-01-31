// js/exams.js - COMPLETE FIXED VERSION
(function() {
    'use strict';
    
    console.log('✅ exams.js - Complete with Auto-Grading Exam Links');
    
    class ExamsModule {
        constructor() {
            console.log('🔧 ExamsModule initialized');
            
            // Store exam data
            this.allExams = [];
            this.currentExams = [];
            this.completedExams = [];
            this.currentFilter = 'all';
            
            // Initialize user profile data
            this.userProfile = {};
            this.program = 'KRCHN';
            this.intakeYear = 2025;
            this.block = 'A';
            this.term = 'Term 1';
            this.userId = null;
            
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
            
            console.log('✅ Cached DOM elements');
        }
        
        initializeUserData() {
            console.log('👤 Initializing user data for exams...');
            
            // Try to get user data immediately
            this.updateUserData();
            
            // If not available, wait for global user to be set
            if (!this.userId) {
                console.log('⏳ User data not ready, waiting...');
                
                // Method 1: Listen for user data events
                document.addEventListener('userDataLoaded', () => {
                    console.log('📥 User data loaded event received');
                    this.updateUserData();
                    this.loadExams();
                });
                
                // Method 2: Listen for app ready event
                document.addEventListener('appReady', () => {
                    console.log('📱 App ready event received');
                    this.updateUserData();
                    this.loadExams();
                });
                
                // Method 3: Poll for user data
                const userCheckInterval = setInterval(() => {
                    if (window.db?.currentUserId) {
                        console.log('✅ User data found via polling');
                        this.updateUserData();
                        this.loadExams();
                        clearInterval(userCheckInterval);
                    }
                }, 1000);
                
                // Method 4: Fallback after 3 seconds
                setTimeout(() => {
                    if (!this.userId) {
                        console.log('⚠️ Using default user data (timeout)');
                        this.loadExams();
                    }
                }, 3000);
            }
        }
        
        updateUserData() {
            if (window.db?.currentUserProfile) {
                this.userProfile = window.db.currentUserProfile;
                this.program = this.userProfile.program || 'KRCHN';
                this.intakeYear = this.userProfile.intake_year || 2025;
                this.block = this.userProfile.block || 'A';
                this.term = this.userProfile.term || 'Term 1';
                this.userId = window.db.currentUserId;
                
                console.log('🎯 Updated user data for exams:', {
                    program: this.program,
                    intakeYear: this.intakeYear,
                    block: this.block,
                    term: this.term,
                    userId: this.userId
                });
                
                return true;
            }
            return false;
        }
        
        setupAutoRefresh() {
            // Check if we're returning from an exam portal
            const returningFromExam = sessionStorage.getItem('returningFromExam');
            if (returningFromExam === 'true') {
                console.log('🔄 Returning from exam portal - refreshing data...');
                setTimeout(() => {
                    this.loadExams();
                }, 2000);
                sessionStorage.removeItem('returningFromExam');
            }
            
            // Also refresh on page focus
            window.addEventListener('focus', () => {
                console.log('🔍 Page focused - checking for updates...');
                setTimeout(() => {
                    this.loadExams();
                }, 1000);
            });
        }
        
        initializeEventListeners() {
            console.log('🔌 Setting up event listeners...');
            
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
                this.showTranscriptModal();
            });
            
            // Handle exam link clicks
            document.addEventListener('click', (e) => {
                const examLink = e.target.closest('.exam-link-btn');
                if (examLink) {
                    e.preventDefault();
                    this.trackExamAccess(examLink);
                    window.open(examLink.href, '_blank');
                }
            });
            
            console.log('✅ Event listeners initialized');
        }
        
        trackExamAccess(linkElement) {
            sessionStorage.setItem('returningFromExam', 'true');
            
            const examId = linkElement.dataset.examId;
            const examName = linkElement.dataset.examName;
            
            console.log('📝 Student accessing exam:', { examId, examName });
            
            if (window.db?.supabase && this.userId) {
                window.db.supabase
                    .from('exam_access_logs')
                    .insert([{
                        exam_id: examId,
                        student_id: this.userId,
                        accessed_at: new Date().toISOString(),
                        status: 'started'
                    }])
                    .catch(error => {
                        console.error('❌ Failed to log exam access:', error);
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
                    program: this.program, 
                    intakeYear: this.intakeYear, 
                    block: this.block, 
                    term: this.term,
                    userId: this.userId 
                });
                
                const supabase = window.db.supabase;
                
                // Check if TVET program
                const isTVET = this.isTVETProgram(this.program);
                
                // 1. Fetch exams
                let query = supabase
                    .from('exams_with_courses')
                    .select('*')
                    .eq('intake_year', this.intakeYear)
                    .order('exam_date', { ascending: true });
                
                if (isTVET) {
                    query = query
                        .eq('program_type', this.program)
                        .or(`block_term.eq.${this.term},block_term.eq.General,block_term.is.null`);
                } else {
                    query = query
                        .or(`program_type.eq.${this.program},program_type.eq.General`)
                        .or(`block_term.eq.${this.block},block_term.is.null,block_term.eq.General`);
                }
                
                const { data: exams, error: examsError } = await query;
                if (examsError) throw examsError;
                
                // 2. Fetch grades for this student (if we have userId)
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
                
                console.log(`📊 Found ${exams?.length || 0} exams and ${grades.length} grades`);
                
                // 3. Process exams data
                this.processExamsData(exams || [], grades);
                
                // 4. Apply filter and display
                this.applyDataFilter();
                
                console.log('✅ Exams loaded successfully');
                
                // 🔥 CRITICAL: Dispatch event for dashboard
                this.dispatchDashboardEvent();
                
            } catch (error) {
                console.error('❌ Error loading exams:', error);
                this.showError(error.message);
            }
        }
        
        // 🔥 FIXED: Correct exam completion logic
        processExamsData(exams, grades) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            this.allExams = exams.map(exam => {
                const grade = grades.find(g => String(g.exam_id) === String(exam.id));
                
                // 🔥 FIX 1: Check multiple completion indicators
                let isCompleted = false;
                let totalPercentage = null;
                let gradeText = 'Pending Grade';
                let gradeClass = 'pending';
                
                // Method 1: Check if already graded
                if (grade && grade.is_graded) {
                    isCompleted = true;
                    totalPercentage = grade.total_percentage || 0;
                    
                    if (totalPercentage >= 85) {
                        gradeText = 'Distinction';
                        gradeClass = 'distinction';
                    } else if (totalPercentage >= 75) {
                        gradeText = 'Credit';
                        gradeClass = 'credit';
                    } else if (totalPercentage >= 60) {
                        gradeText = 'Pass';
                        gradeClass = 'pass';
                    } else {
                        gradeText = 'Fail';
                        gradeClass = 'fail';
                    }
                }
                // Method 2: Check status field from database
                else if (exam.status === 'Completed' || exam.status === 'completed') {
                    isCompleted = true;
                    // Keep as "Pending Grade" since not graded yet
                }
                // Method 3: Check if exam date is in past (more than 1 day ago)
                else {
                    const examDate = exam.exam_date ? new Date(exam.exam_date) : null;
                    
                    if (examDate) {
                        const oneDayAgo = new Date(today);
                        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
                        
                        // If exam date was more than 1 day ago, mark as completed
                        if (examDate < oneDayAgo) {
                            isCompleted = true;
                            // Still "Pending Grade" since not graded
                        }
                    }
                }
                
                const hasExamLink = exam.exam_link && exam.exam_link.trim() !== '';
                
                return {
                    ...exam,
                    isCompleted,  // 🔥 Now correctly identifies completed exams
                    totalPercentage,
                    gradeText,
                    gradeClass,
                    hasExamLink,
                    cat1Score: grade?.cat_1_score !== null && grade?.cat_1_score !== undefined ? 
                        `${grade.cat_1_score}%` : '--',
                    cat2Score: grade?.cat_2_score !== null && grade?.cat_2_score !== undefined ? 
                        `${grade.cat_2_score}%` : '--',
                    finalScore: grade?.exam_score !== null && grade?.exam_score !== undefined ? 
                        `${grade.exam_score}%` : '--',
                    formattedExamDate: exam.exam_date ? 
                        new Date(exam.exam_date).toLocaleDateString('en-US', { 
                            year: 'numeric', month: 'short', day: 'numeric' 
                        }) : '--',
                    formattedGradedDate: grade?.graded_at ? 
                        new Date(grade.graded_at).toLocaleDateString('en-US', { 
                            year: 'numeric', month: 'short', day: 'numeric' 
                        }) : '--'
                };
            });
            
            const completedCount = this.allExams.filter(e => e.isCompleted).length;
            console.log(`✅ Processed ${this.allExams.length} exams (${completedCount} completed)`);
        }
        
        // 🔥 NEW: Dispatch event for dashboard
        dispatchDashboardEvent() {
            const event = new CustomEvent('examsModuleReady', {
                detail: {
                    metrics: this.getDashboardData(),
                    count: this.allExams.length,
                    timestamp: new Date().toISOString()
                }
            });
            document.dispatchEvent(event);
            console.log('📢 Dispatched examsModuleReady event for dashboard');
            
            // Also update window object for immediate access
            window.examsData = {
                allExams: this.allExams,
                metrics: this.getDashboardData(),
                loaded: true
            };
        }
        
        isTVETProgram(program) {
            if (!program) return false;
            const tvetPrograms = ['TVET', 'TVET NURSING', 'TVET NURSING(A)', 'TVET NURSING(B)', 
                                'CRAFT CERTIFICATE', 'ARTISAN', 'DIPLOMA IN TVET'];
            return tvetPrograms.some(tvet => program.toUpperCase().includes(tvet));
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
                let buttonText = 'Start Exam';
                let buttonClass = 'primary';
                let buttonIcon = 'fas fa-external-link-alt';
                
                if (!exam.hasExamLink) {
                    buttonText = 'No Link';
                    buttonClass = 'disabled';
                    buttonIcon = 'fas fa-unlink';
                }
                
                return `
                <tr>
                    <td>${this.escapeHtml(exam.exam_name || 'N/A')}</td>
                    <td><span class="badge ${exam.exam_type?.includes('CAT') ? 'badge-cat' : 'badge-final'}">
                        ${exam.exam_type?.includes('CAT') ? 'CAT' : 'Exam'}
                    </span></td>
                    <td>${this.escapeHtml(exam.course_name || 'General')}</td>
                    <td class="text-center">${exam.block_term || 'General'}</td>
                    <td>${exam.formattedExamDate}</td>
                    <td><span class="status-badge pending">Pending</span></td>
                    <td class="text-center">--</td>
                    <td class="text-center">--</td>
                    <td class="text-center">--</td>
                    <td class="text-center">--</td>
                    <td class="text-center">
                        ${exam.hasExamLink ? 
                            `<a href="${exam.exam_link}" 
                                target="_blank" 
                                class="exam-link-btn btn-${buttonClass}"
                                data-exam-id="${exam.id}"
                                data-exam-name="${this.escapeHtml(exam.exam_name || '')}">
                                <i class="${buttonIcon}"></i> ${buttonText}
                            </a>` :
                            `<span class="exam-link-btn btn-disabled" title="Exam link not available">
                                <i class="${buttonIcon}"></i> ${buttonText}
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
                const hasRetakeLink = exam.retake_link && exam.retake_link.trim() !== '';
                
                return `
                <tr>
                    <td>${this.escapeHtml(exam.exam_name || 'N/A')}</td>
                    <td><span class="badge ${exam.exam_type?.includes('CAT') ? 'badge-cat' : 'badge-final'}">
                        ${exam.exam_type?.includes('CAT') ? 'CAT' : 'Exam'}
                    </span></td>
                    <td>${this.escapeHtml(exam.course_name || 'General')}</td>
                    <td class="text-center">${exam.block_term || 'General'}</td>
                    <td>${exam.formattedGradedDate}</td>
                    <td><span class="status-badge ${exam.gradeClass}">${exam.gradeText}</span></td>
                    <td class="text-center">${exam.cat1Score}</td>
                    <td class="text-center">${exam.cat2Score}</td>
                    <td class="text-center">${exam.finalScore}</td>
                    <td class="text-center"><strong>${exam.totalPercentage ? exam.totalPercentage.toFixed(1) + '%' : '--'}</strong></td>
                    <td class="text-center">
                        ${hasRetakeLink ? 
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
            
            console.log(`📊 Counts: ${this.currentExams.length} current, ${this.completedExams.length} completed`);
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
            // Performance summary logic here
        }
        
        showTranscriptModal() {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-scroll"></i> Academic Transcript</h3>
                        <button class="close-modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>Transcript feature will be available soon.</p>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            modal.querySelector('.close-modal').onclick = () => modal.remove();
            modal.onclick = (e) => {
                if (e.target === modal) modal.remove();
            };
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
        
        // 🔥 FIXED: Correct active exams calculation
        calculateActiveExams() {
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            
            const activeExams = this.allExams.filter(exam => {
                // Don't include completed exams
                if (exam.isCompleted) {
                    return false;
                }
                
                const examDate = exam.exam_date ? new Date(exam.exam_date) : null;
                
                // Only include exams from today onward
                if (examDate) {
                    const yesterday = new Date(now);
                    yesterday.setDate(yesterday.getDate() - 1);
                    
                    // Include exams from yesterday onward (gives 1 day grace period)
                    return examDate >= yesterday;
                }
                
                // If no date, check status
                return exam.status === 'Upcoming' || !exam.status;
            });
            
            console.log(`📊 Active exams calculated: ${activeExams.length}`);
            return activeExams;
        }
    calculateDashboardMetrics() {
    try {
        const completedExams = this.allExams.filter(exam => exam.isCompleted && exam.totalPercentage !== null);
        const totalCompleted = completedExams.length;
        
        const activeExams = this.calculateActiveExams();
        
        const defaultMetrics = {
            upcomingExam: 'No upcoming exams',
            upcomingExamName: 'None',
            upcomingCount: 0,
            gradedExams: 0,
            averageScore: 0,
            bestScore: 0,
            passRate: 0,
            lastUpdated: new Date().toISOString()
        };
        
        if (activeExams.length === 0) {
            return defaultMetrics;
        }
        
        let upcomingText = 'No upcoming exams';
        let upcomingName = 'None';
        
        if (activeExams.length > 0) {
            // Sort by date
            activeExams.sort((a, b) => {
                const aDate = a.exam_date ? new Date(a.exam_date) : new Date(0);
                const bDate = b.exam_date ? new Date(b.exam_date) : new Date(0);
                const now = new Date();
                
                if (aDate <= now && bDate > now) return -1;
                if (aDate > now && bDate <= now) return 1;
                
                return aDate - bDate;
            });
            
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
                } else if (diffDays <= 30) {
                    const weeks = Math.floor(diffDays / 7);
                    upcomingText = `${weeks}w: ${upcomingName}`;
                } else {
                    upcomingText = `Future: ${upcomingName}`;
                }
            } else {
                upcomingText = `Active: ${upcomingName}`;
            }
            
            // If multiple exams, show count in parentheses
            if (activeExams.length > 1) {
                const otherExams = activeExams.slice(1);
                const otherNames = otherExams.map(exam => exam.exam_name || 'Untitled').slice(0, 2); // Limit to 2
                if (otherExams.length > 2) {
                    upcomingText += ` (+${otherExams.length - 1} more)`;
                } else if (otherExams.length > 0) {
                    upcomingText += ` & ${otherExams.length} more`;
                }
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
        
        const metrics = {
            upcomingExam: upcomingText,
            upcomingExamName: upcomingName,
            upcomingCount: activeExams.length,
            gradedExams: totalCompleted,
            averageScore: Math.round(averageScore * 10) / 10,
            bestScore: Math.round(bestScore * 10) / 10,
            passRate: Math.round(passRate),
            lastUpdated: new Date().toISOString()
        };
        
        return metrics;
    } catch (error) {
        console.error('❌ Error calculating dashboard metrics:', error);
        return {
            upcomingExam: 'No upcoming exams',
            upcomingExamName: 'None',
            upcomingCount: 0,
            gradedExams: 0,
            averageScore: 0,
            bestScore: 0,
            passRate: 0,
            lastUpdated: new Date().toISOString()
        };
    }
}
        
        getDashboardData() {
            return this.calculateDashboardMetrics();
        }
        
        refresh() {
            this.loadExams();
        }
        
    } // End of class
    
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
    
    // Global function for dashboard to get metrics
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
            lastUpdated: new Date().toISOString()
        };
    };
    
    console.log('✅ Exams module ready with Exam Portal Links!');
})();
