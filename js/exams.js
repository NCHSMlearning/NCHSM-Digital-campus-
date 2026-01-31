// js/exams.js - COMPLETE & SIMPLIFIED VERSION
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
            
            // Get user profile
            this.userProfile = window.db?.currentUserProfile || {};
            this.program = this.userProfile.program || 'KRCHN';
            this.intakeYear = this.userProfile.intake_year || 2025;
            this.block = this.userProfile.block || 'A';
            this.term = this.userProfile.term || 'Term 1';
            this.userId = window.db?.currentUserId;
            
            // Cache DOM elements
            this.cacheElements();
            
            // Initialize
            this.initializeEventListeners();
            this.updateFilterButtons();
            this.loadExams();
            
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
        
        setupAutoRefresh() {
            // Check if we're returning from an exam portal
            const returningFromExam = sessionStorage.getItem('returningFromExam');
            if (returningFromExam === 'true') {
                console.log('🔄 Returning from exam portal - refreshing data...');
                setTimeout(() => {
                    this.loadExams();
                }, 2000); // Wait 2 seconds for auto-grading to complete
                sessionStorage.removeItem('returningFromExam');
            }
            
            // Also refresh on page focus (when user returns to tab)
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
            // Mark that we're going to exam portal
            sessionStorage.setItem('returningFromExam', 'true');
            
            // Optional: Log exam access
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
                    .then(() => {
                        console.log('✅ Exam access logged');
                    })
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
                if (!window.db?.currentUserProfile) {
                    throw new Error('User profile not available');
                }
                
                if (!window.db?.supabase) {
                    throw new Error('Database connection not available');
                }
                
                const userProfile = window.db.currentUserProfile;
                const program = userProfile.program || 'KRCHN';
                const intakeYear = userProfile.intake_year || 2025;
                const block = userProfile.block || 'A';
                const term = userProfile.term || 'Term 1';
                const userId = window.db.currentUserId;
                
                console.log('🎯 Loading exams for:', { program, intakeYear, block, term });
                
                const supabase = window.db.supabase;
                
                // Check if TVET program
                const isTVET = this.isTVETProgram(program);
                
                // 1. Fetch exams
                let query = supabase
                    .from('exams_with_courses')
                    .select('*')
                    .eq('intake_year', intakeYear)
                    .order('exam_date', { ascending: true });
                
                if (isTVET) {
                    // TVET filtering
                    query = query
                        .eq('program_type', program)
                        .or(`block_term.eq.${term},block_term.eq.General,block_term.is.null`);
                } else {
                    // KRCHN filtering
                    query = query
                        .or(`program_type.eq.${program},program_type.eq.General`)
                        .or(`block_term.eq.${block},block_term.is.null,block_term.eq.General`);
                }
                
                const { data: exams, error: examsError } = await query;
                if (examsError) throw examsError;
                
                // 2. Fetch grades for this student
                const { data: grades, error: gradesError } = await supabase
                    .from('exam_grades')
                    .select('*')
                    .eq('student_id', userId)
                    .order('graded_at', { ascending: false });
                
                if (gradesError) throw gradesError;
                
                console.log(`📊 Found ${exams?.length || 0} exams and ${grades?.length || 0} grades`);
                
                // 3. Process exams data
                this.processExamsData(exams || [], grades || []);
                
                // 4. Apply filter and display
                this.applyDataFilter();
                
                // 5. Show success
                console.log('✅ Exams loaded successfully');
                
            } catch (error) {
                console.error('❌ Error loading exams:', error);
                this.showError(error.message);
            }
        }
        
        isTVETProgram(program) {
            const tvetPrograms = ['TVET', 'TVET NURSING', 'TVET NURSING(A)', 'TVET NURSING(B)', 
                                'CRAFT CERTIFICATE', 'ARTISAN', 'DIPLOMA IN TVET'];
            return tvetPrograms.some(tvet => program?.toUpperCase().includes(tvet));
        }
        
        processExamsData(exams, grades) {
            this.allExams = exams.map(exam => {
                // Find grade for this exam
                const grade = grades.find(g => String(g.exam_id) === String(exam.id));
                
                // Check if exam is completed
                let isCompleted = false;
                let totalPercentage = null;
                let gradeText = '--';
                let gradeClass = '';
                
                if (grade && grade.is_graded) {
                    isCompleted = true;
                    totalPercentage = grade.total_percentage;
                    
                    // Determine grade text and class
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
                
                // Check if exam link exists
                const hasExamLink = exam.exam_link && exam.exam_link.trim() !== '';
                
                return {
                    ...exam,
                    isCompleted,
                    totalPercentage,
                    gradeText,
                    gradeClass,
                    hasExamLink,
                    // Display scores
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
            
            console.log(`✅ Processed ${this.allExams.length} exams`);
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
                // Determine button text and status
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
                // Check if this exam has a retake link
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
            // Update section counts
            if (this.currentCount) {
                this.currentCount.textContent = `${this.currentExams.length} pending`;
            }
            
            if (this.completedCount) {
                this.completedCount.textContent = `${this.completedExams.length} graded`;
            }
            
            // Update header counts
            if (this.currentHeaderCount) {
                this.currentHeaderCount.textContent = this.currentExams.length;
            }
            
            if (this.completedHeaderCount) {
                this.completedHeaderCount.textContent = this.completedExams.length;
            }
            
            // Calculate and update average
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
            // This updates the performance cards at the bottom
            // You can add logic here if needed
        }
        
        showTranscriptModal() {
            // Simple transcript modal
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
            
            // Close modal
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
        
        // Public methods
        refresh() {
            this.loadExams();
        }
    }
    
    // Create global instance
    window.examsModule = new ExamsModule();
    
    // Global functions for backward compatibility
    window.loadExams = () => window.examsModule?.refresh();
    window.refreshAssessments = () => window.examsModule?.refresh();
    
    console.log('✅ Exams module ready with Exam Portal Links!');
})();
