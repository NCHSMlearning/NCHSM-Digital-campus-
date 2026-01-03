// js/exams.js - Complete Fixed Exams Management Module for new UI
(function() {
    'use strict';
    
    // Helper functions (same as courses.js)
    function getSupabaseClient() {
        const client = window.db?.supabase;
        if (!client || typeof client.from !== 'function') {
            console.error('❌ No valid Supabase client available');
            return null;
        }
        return client;
    }
    
    // FIXED: Simple, direct getUserProfile that always works
    function getUserProfile() {
        // Direct access to window.db - this is where your data is
        const profile = window.db?.currentUserProfile || {};
        
        // Always return strings, never undefined or null
        return {
            program: String(profile.program || ''),
            department: String(profile.department || ''),
            intake_year: String(profile.intake_year || ''),
            block: String(profile.block || ''),
            // Include all original data
            ...profile
        };
    }
    
    function getCurrentUserId() {
        return window.db?.currentUserId || window.currentUserId || null;
    }
    
    class ExamsModule {
        constructor() {
            console.log('🔧 ExamsModule constructor called');
            
            this.userId = null;
            this.userProfile = null;
            this.cachedExams = [];
            this.currentFilter = 'all';
            
            // New HTML elements
            this.currentAssessmentsTable = document.getElementById('current-assessments-table');
            this.completedAssessmentsTable = document.getElementById('completed-assessments-table');
            this.currentEmptyState = document.getElementById('current-empty');
            this.completedEmptyState = document.getElementById('completed-empty');
            this.currentCountElement = document.getElementById('current-count');
            this.completedCountElement = document.getElementById('completed-count');
            this.completedAverageElement = document.getElementById('completed-average');
            
            // Header stats elements
            this.currentCountHeader = document.getElementById('current-assessments-count');
            this.completedCountHeader = document.getElementById('completed-assessments-count');
            this.overallAverageHeader = document.getElementById('overall-average');
            
            // Performance summary elements
            this.bestScoreElement = document.getElementById('best-score');
            this.lowestScoreElement = document.getElementById('lowest-score');
            this.passRateElement = document.getElementById('pass-rate');
            this.distinctionCountElement = document.getElementById('distinction-count');
            this.creditCountElement = document.getElementById('credit-count');
            this.passCountElement = document.getElementById('pass-count');
            this.failCountElement = document.getElementById('fail-count');
            this.firstAssessmentDateElement = document.getElementById('first-assessment-date');
            this.latestAssessmentDateElement = document.getElementById('latest-assessment-date');
            this.totalSubmittedElement = document.getElementById('total-submitted');
            
            console.log('📋 Element references:', {
                currentTable: !!this.currentAssessmentsTable,
                completedTable: !!this.completedAssessmentsTable,
                currentEmptyState: !!this.currentEmptyState,
                completedEmptyState: !!this.completedEmptyState,
                currentCountHeader: !!this.currentCountHeader,
                completedCountHeader: !!this.completedCountHeader
            });
            
            this.initializeElements();
            
            // Initialize immediately
            this.initialize();
        }
        
        initializeElements() {
            // Setup event listeners for new buttons
            const viewAllBtn = document.getElementById('view-all-assessments');
            const viewCurrentBtn = document.getElementById('view-current-only');
            const viewCompletedBtn = document.getElementById('view-completed-only');
            const refreshBtn = document.getElementById('refresh-assessments');
            const transcriptBtn = document.getElementById('view-transcript');
            
            if (viewAllBtn) {
                viewAllBtn.addEventListener('click', () => this.filterAssessments('all'));
                viewAllBtn.classList.add('active');
            }
            
            if (viewCurrentBtn) {
                viewCurrentBtn.addEventListener('click', () => this.filterAssessments('current'));
            }
            
            if (viewCompletedBtn) {
                viewCompletedBtn.addEventListener('click', () => this.filterAssessments('completed'));
            }
            
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => this.refreshAssessments());
            }
            
            if (transcriptBtn) {
                transcriptBtn.addEventListener('click', () => {
                    if (window.AppUtils && window.AppUtils.showToast) {
                        AppUtils.showToast('Transcript feature coming soon!', 'info');
                    }
                });
            }
        }
        
        // Initialize with user ID and profile
        initialize() {
            console.log('🚀 ExamsModule.initialize() called');
            
            // Get user info
            this.userId = getCurrentUserId();
            this.userProfile = getUserProfile();
            
            console.log('👤 User data:', {
                userId: this.userId,
                program: this.userProfile.program,
                intake_year: this.userProfile.intake_year,
                block: this.userProfile.block
            });
            
            if (this.userId && this.userProfile.program && this.userProfile.intake_year) {
                console.log('✅ Loading exams...');
                this.loadExams();
            } else {
                console.error('❌ Missing user data');
                this.showErrorState('current', 'Please complete your profile with program and intake year');
                this.showErrorState('completed', 'Please complete your profile with program and intake year');
            }
        }
        
        // Load exams and grades
        async loadExams() {
            console.log('📥 Loading exams...');
            
            this.showLoadingState('current');
            this.showLoadingState('completed');
            
            const program = this.userProfile.program;
            const block = this.userProfile.block;
            const intakeYear = this.userProfile.intake_year;
            const studentId = this.userId;
            
            console.log('🎯 Query params:', { program, intakeYear, block, studentId });
            
            if (!program || !intakeYear) {
                console.error('❌ Missing program or intake year');
                this.showErrorState('current', 'Missing program or intake year');
                this.showErrorState('completed', 'Missing program or intake year');
                return;
            }
            
            try {
                const supabase = getSupabaseClient();
                if (!supabase) throw new Error('No Supabase client');
                
                // Fetch exams
                const { data: exams, error: examsError } = await supabase
                    .from('exams_with_courses')
                    .select('*')
                    .or(`program_type.eq.${program},program_type.eq.General`)
                    .or(`block_term.eq.${block},block_term.is.null,block_term.eq.General`)
                    .eq('intake_year', intakeYear)
                    .order('exam_date', { ascending: true });
                
                if (examsError) throw examsError;
                
                // Fetch grades
                const { data: grades, error: gradesError } = await supabase
                    .from('exam_grades')
                    .select('*')
                    .eq('student_id', studentId)
                    .eq('question_id', '00000000-0000-0000-0000-000000000000')
                    .order('graded_at', { ascending: false });
                
                if (gradesError) throw gradesError;
                
                // Process exams
                this.cachedExams = exams.map(exam => {
                    const grade = grades?.find(g => String(g.exam_id) === String(exam.id));
                    const examType = exam.exam_type || '';
                    
                    let calculatedPercentage = null;
                    let displayStatus = 'Scheduled';
                    
                    if (grade) {
                        // Calculate percentage
                        if (grade.total_score !== null) {
                            calculatedPercentage = Number(grade.total_score);
                        } else if (examType.includes('CAT_1') && grade.cat_1_score !== null) {
                            calculatedPercentage = (grade.cat_1_score / 30) * 100;
                        } else if (examType.includes('CAT_2') && grade.cat_2_score !== null) {
                            calculatedPercentage = (grade.cat_2_score / 30) * 100;
                        } else if (examType.includes('EXAM') && grade.cat_1_score !== null && grade.cat_2_score !== null && grade.exam_score !== null) {
                            const totalMarks = grade.cat_1_score + grade.cat_2_score + grade.exam_score;
                            calculatedPercentage = (totalMarks / 100) * 100;
                        }
                        
                        displayStatus = calculatedPercentage !== null 
                            ? (calculatedPercentage >= 60 ? 'PASS' : 'FAIL')
                            : (grade.result_status || 'Graded');
                    }
                    
                    const assessmentStatus = grade ? 'completed' : 'current';
                    
                    return { 
                        ...exam, 
                        grade: grade || null,
                        display_status: displayStatus,
                        calculated_percentage: calculatedPercentage,
                        assessment_status: assessmentStatus,
                        cat1Score: grade?.cat_1_score || null,
                        cat2Score: grade?.cat_2_score || null,
                        finalScore: grade?.exam_score || null,
                        dateGraded: grade?.graded_at
                    };
                });
                
                // Split and display
                const currentAssessments = this.cachedExams.filter(e => e.assessment_status === 'current');
                const completedAssessments = this.cachedExams.filter(e => e.assessment_status === 'completed');
                
                this.updateHeaderStats(currentAssessments.length, completedAssessments.length);
                
                // Apply filter
                let filteredCurrent = currentAssessments;
                let filteredCompleted = completedAssessments;
                
                if (this.currentFilter === 'current') {
                    filteredCompleted = [];
                } else if (this.currentFilter === 'completed') {
                    filteredCurrent = [];
                }
                
                // Display
                if (filteredCurrent.length > 0) {
                    this.displayCurrentAssessments(filteredCurrent);
                    this.hideEmptyState('current');
                } else {
                    this.showEmptyState('current');
                }
                
                if (filteredCompleted.length > 0) {
                    this.displayCompletedAssessments(filteredCompleted);
                    this.hideEmptyState('completed');
                    this.calculatePerformanceSummary(filteredCompleted);
                } else {
                    this.showEmptyState('completed');
                }
                
                console.log('✅ Exams loaded successfully');
                
            } catch (error) {
                console.error('❌ Failed to load exams:', error);
                this.showErrorState('current', `Error: ${error.message}`);
                this.showErrorState('completed', `Error: ${error.message}`);
            }
        }
        
        // Display current assessments
        displayCurrentAssessments(assessments) {
            if (!this.currentAssessmentsTable) return;
            
            this.currentAssessmentsTable.innerHTML = '';
            
            if (this.currentCountElement) {
                this.currentCountElement.textContent = `${assessments.length} pending`;
            }
            
            assessments.forEach((exam) => {
                const dateStr = exam.exam_date
                    ? new Date(exam.exam_date).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                    })
                    : '--';
                
                const typeBadge = exam.exam_type?.includes('CAT') 
                    ? `<span class="type-badge cat">CAT</span>`
                    : `<span class="type-badge exam">Exam</span>`;
                
                const statusClass = exam.display_status === 'PASS' ? 'completed' : 
                                  exam.display_status === 'FAIL' ? 'failed' : 'pending';
                
                const statusDisplay = exam.display_status === 'PASS' || exam.display_status === 'FAIL'
                    ? `<i class="fas fa-clipboard-check"></i> ${exam.display_status}`
                    : '<i class="fas fa-clock"></i> Pending';
                
                const totalScore = exam.calculated_percentage !== null 
                    ? `${exam.calculated_percentage.toFixed(1)}%`
                    : '--';
                
                this.currentAssessmentsTable.innerHTML += `
                    <tr>
                        <td>${this.escapeHtml(exam.exam_name || 'N/A')}</td>
                        <td>${typeBadge}</td>
                        <td>${this.escapeHtml(exam.course_name || 'General')}</td>
                        <td class="text-center">${this.escapeHtml(exam.block_term || 'General')}</td>
                        <td>${dateStr}</td>
                        <td><span class="status-badge ${statusClass}">${statusDisplay}</span></td>
                        <td class="text-center">${exam.cat1Score || '--'}</td>
                        <td class="text-center">${exam.cat2Score || '--'}</td>
                        <td class="text-center">${exam.finalScore || '--'}</td>
                        <td class="text-center"><strong>${totalScore}</strong></td>
                    </tr>`;
            });
        }
        
        // Display completed assessments
        displayCompletedAssessments(assessments) {
            if (!this.completedAssessmentsTable) return;
            
            this.completedAssessmentsTable.innerHTML = '';
            
            // Calculate average
            const scoredAssessments = assessments.filter(a => a.calculated_percentage !== null);
            let averageScore = '--';
            if (scoredAssessments.length > 0) {
                const total = scoredAssessments.reduce((sum, a) => sum + a.calculated_percentage, 0);
                averageScore = `${(total / scoredAssessments.length).toFixed(1)}%`;
            }
            
            // Update counts
            if (this.completedCountElement) {
                this.completedCountElement.textContent = `${assessments.length} graded`;
            }
            if (this.completedAverageElement) {
                this.completedAverageElement.textContent = `Average: ${averageScore}`;
            }
            
            assessments.forEach((exam) => {
                const gradedDate = exam.dateGraded
                    ? new Date(exam.dateGraded).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    })
                    : '--';
                
                const typeBadge = exam.exam_type?.includes('CAT') 
                    ? `<span class="type-badge cat">CAT</span>`
                    : `<span class="type-badge exam">Exam</span>`;
                
                // Calculate grade
                let grade = '--';
                let gradeClass = '';
                if (exam.calculated_percentage !== null) {
                    if (exam.calculated_percentage >= 85) {
                        grade = 'Distinction';
                        gradeClass = 'distinction';
                    } else if (exam.calculated_percentage >= 70) {
                        grade = 'Credit';
                        gradeClass = 'credit';
                    } else if (exam.calculated_percentage >= 60) {
                        grade = 'Pass';
                        gradeClass = 'pass';
                    } else {
                        grade = 'Fail';
                        gradeClass = 'fail';
                    }
                }
                
                const statusClass = exam.display_status === 'PASS' ? gradeClass : 'failed';
                const statusDisplay = exam.display_status === 'PASS'
                    ? `<i class="fas fa-check-circle"></i> ${grade}`
                    : '<i class="fas fa-times-circle"></i> Failed';
                
                const totalScore = exam.calculated_percentage !== null 
                    ? `${exam.calculated_percentage.toFixed(1)}%`
                    : '--';
                
                const gradeBadge = grade !== '--' 
                    ? `<span class="grade-badge ${gradeClass}">${grade}</span>` 
                    : '--';
                
                this.completedAssessmentsTable.innerHTML += `
                    <tr>
                        <td>${this.escapeHtml(exam.exam_name || 'N/A')}</td>
                        <td>${typeBadge}</td>
                        <td>${this.escapeHtml(exam.course_name || 'General')}</td>
                        <td class="text-center">${this.escapeHtml(exam.block_term || 'General')}</td>
                        <td>${gradedDate}</td>
                        <td><span class="status-badge ${statusClass}">${statusDisplay}</span></td>
                        <td class="text-center">${exam.cat1Score || '--'}</td>
                        <td class="text-center">${exam.cat2Score || '--'}</td>
                        <td class="text-center">${exam.finalScore || '--'}</td>
                        <td class="text-center"><strong>${totalScore}</strong></td>
                        <td class="text-center">${gradeBadge}</td>
                    </tr>`;
            });
        }
        
        // Calculate performance summary
        calculatePerformanceSummary(assessments) {
            const scoredAssessments = assessments.filter(a => a.calculated_percentage !== null);
            
            if (scoredAssessments.length === 0) {
                // Reset all values
                if (this.bestScoreElement) this.bestScoreElement.textContent = '--';
                if (this.lowestScoreElement) this.lowestScoreElement.textContent = '--';
                if (this.passRateElement) this.passRateElement.textContent = '--';
                if (this.distinctionCountElement) this.distinctionCountElement.textContent = '0';
                if (this.creditCountElement) this.creditCountElement.textContent = '0';
                if (this.passCountElement) this.passCountElement.textContent = '0';
                if (this.failCountElement) this.failCountElement.textContent = '0';
                if (this.firstAssessmentDateElement) this.firstAssessmentDateElement.textContent = '--';
                if (this.latestAssessmentDateElement) this.latestAssessmentDateElement.textContent = '--';
                if (this.totalSubmittedElement) this.totalSubmittedElement.textContent = '0';
                return;
            }
            
            // Calculate scores
            const scores = scoredAssessments.map(a => a.calculated_percentage);
            const bestScore = Math.max(...scores);
            const lowestScore = Math.min(...scores);
            
            if (this.bestScoreElement) this.bestScoreElement.textContent = `${bestScore.toFixed(1)}%`;
            if (this.lowestScoreElement) this.lowestScoreElement.textContent = `${lowestScore.toFixed(1)}%`;
            
            // Calculate pass rate
            const passedAssessments = scoredAssessments.filter(a => a.calculated_percentage >= 60);
            const passRate = (passedAssessments.length / scoredAssessments.length) * 100;
            if (this.passRateElement) this.passRateElement.textContent = `${passRate.toFixed(0)}%`;
            
            // Calculate grade distribution
            const gradeCounts = {
                distinction: scoredAssessments.filter(a => a.calculated_percentage >= 85).length,
                credit: scoredAssessments.filter(a => a.calculated_percentage >= 70 && a.calculated_percentage < 85).length,
                pass: scoredAssessments.filter(a => a.calculated_percentage >= 60 && a.calculated_percentage < 70).length,
                fail: scoredAssessments.filter(a => a.calculated_percentage < 60).length
            };
            
            // Update grade counts
            if (this.distinctionCountElement) this.distinctionCountElement.textContent = gradeCounts.distinction;
            if (this.creditCountElement) this.creditCountElement.textContent = gradeCounts.credit;
            if (this.passCountElement) this.passCountElement.textContent = gradeCounts.pass;
            if (this.failCountElement) this.failCountElement.textContent = gradeCounts.fail;
            
            // Update distribution bars
            const totalCount = scoredAssessments.length;
            if (totalCount > 0) {
                const distinctionBar = document.getElementById('distinction-bar');
                const creditBar = document.getElementById('credit-bar');
                const passBar = document.getElementById('pass-bar');
                const failBar = document.getElementById('fail-bar');
                
                if (distinctionBar) distinctionBar.style.width = `${(gradeCounts.distinction / totalCount) * 100}%`;
                if (creditBar) creditBar.style.width = `${(gradeCounts.credit / totalCount) * 100}%`;
                if (passBar) passBar.style.width = `${(gradeCounts.pass / totalCount) * 100}%`;
                if (failBar) failBar.style.width = `${(gradeCounts.fail / totalCount) * 100}%`;
            }
            
            // Get assessment dates
            const dates = assessments
                .filter(a => a.dateGraded)
                .map(a => new Date(a.dateGraded))
                .sort((a, b) => a - b);
            
            if (dates.length > 0) {
                const firstDate = dates[0];
                const latestDate = dates[dates.length - 1];
                
                if (this.firstAssessmentDateElement) {
                    this.firstAssessmentDateElement.textContent = 
                        firstDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                }
                if (this.latestAssessmentDateElement) {
                    this.latestAssessmentDateElement.textContent = 
                        latestDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                }
            }
            
            if (this.totalSubmittedElement) {
                this.totalSubmittedElement.textContent = scoredAssessments.length;
            }
        }
        
        // Update header statistics
        updateHeaderStats(current, completed) {
            // Calculate average
            const completedAssessments = this.cachedExams.filter(exam => exam.assessment_status === 'completed');
            const scoredAssessments = completedAssessments.filter(a => a.calculated_percentage !== null);
            let averageScore = '--';
            
            if (scoredAssessments.length > 0) {
                const total = scoredAssessments.reduce((sum, a) => sum + a.calculated_percentage, 0);
                averageScore = `${(total / scoredAssessments.length).toFixed(1)}%`;
            }
            
            // Update counts
            if (this.currentCountHeader) this.currentCountHeader.textContent = current;
            if (this.completedCountHeader) this.completedCountHeader.textContent = completed;
            if (this.overallAverageHeader) this.overallAverageHeader.textContent = averageScore;
        }
        
        // Filter assessments
        filterAssessments(filterType) {
            this.currentFilter = filterType;
            
            const currentSection = document.querySelector('.current-section');
            const completedSection = document.querySelector('.completed-section');
            
            if (filterType === 'current') {
                if (currentSection) currentSection.style.display = 'block';
                if (completedSection) completedSection.style.display = 'none';
            } else if (filterType === 'completed') {
                if (currentSection) currentSection.style.display = 'none';
                if (completedSection) completedSection.style.display = 'block';
            } else {
                if (currentSection) currentSection.style.display = 'block';
                if (completedSection) completedSection.style.display = 'block';
            }
            
            // Update button states
            document.querySelectorAll('.quick-actions .action-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            const activeBtn = filterType === 'current' ? document.getElementById('view-current-only') :
                            filterType === 'completed' ? document.getElementById('view-completed-only') :
                            document.getElementById('view-all-assessments');
            
            if (activeBtn) activeBtn.classList.add('active');
            
            this.loadExams();
        }
        
        switchToCurrentAssessments() {
            this.filterAssessments('current');
        }
        
        switchToCompletedAssessments() {
            this.filterAssessments('completed');
        }
        
        refreshAssessments() {
            this.loadExams();
            if (window.AppUtils && window.AppUtils.showToast) {
                AppUtils.showToast('Assessments refreshed successfully', 'success');
            }
        }
        
        showLoadingState(section) {
            if (section === 'current') {
                const tableBody = this.currentAssessmentsTable;
                if (tableBody) {
                    tableBody.innerHTML = `
                        <tr class="loading">
                            <td colspan="10">
                                <div class="loading-content">
                                    <div class="loading-spinner"></div>
                                    <p>Loading current assessments...</p>
                                </div>
                            </td>
                        </tr>
                    `;
                }
            } else if (section === 'completed') {
                const tableBody = this.completedAssessmentsTable;
                if (tableBody) {
                    tableBody.innerHTML = `
                        <tr class="loading">
                            <td colspan="11">
                                <div class="loading-content">
                                    <div class="loading-spinner"></div>
                                    <p>Loading completed assessments...</p>
                                </div>
                            </td>
                        </tr>
                    `;
                }
            }
        }
        
        showEmptyState(section) {
            if (section === 'current') {
                if (this.currentEmptyState) this.currentEmptyState.style.display = 'block';
                if (this.currentAssessmentsTable) this.currentAssessmentsTable.innerHTML = '';
            } else if (section === 'completed') {
                if (this.completedEmptyState) this.completedEmptyState.style.display = 'block';
                if (this.completedAssessmentsTable) this.completedAssessmentsTable.innerHTML = '';
            }
        }
        
        hideEmptyState(section) {
            if (section === 'current') {
                if (this.currentEmptyState) this.currentEmptyState.style.display = 'none';
            } else if (section === 'completed') {
                if (this.completedEmptyState) this.completedEmptyState.style.display = 'none';
            }
        }
        
        showErrorState(section, message) {
            if (section === 'current') {
                const tableBody = this.currentAssessmentsTable;
                if (tableBody) {
                    tableBody.innerHTML = `
                        <tr class="error">
                            <td colspan="10">
                                <div class="error-content">
                                    <i class="fas fa-exclamation-circle"></i>
                                    <p>${message}</p>
                                    <button onclick="window.examsModule?.refreshAssessments()" class="btn btn-sm btn-primary">
                                        <i class="fas fa-redo"></i> Retry
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                }
            } else if (section === 'completed') {
                const tableBody = this.completedAssessmentsTable;
                if (tableBody) {
                    tableBody.innerHTML = `
                        <tr class="error">
                            <td colspan="11">
                                <div class="error-content">
                                    <i class="fas fa-exclamation-circle"></i>
                                    <p>${message}</p>
                                    <button onclick="window.examsModule?.refreshAssessments()" class="btn btn-sm btn-primary">
                                        <i class="fas fa-redo"></i> Retry
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                }
            }
        }
        
        escapeHtml(str) {
            if (!str) return '';
            return String(str)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }
    }
    
    // Create global instance
    let examsModule = null;
    
    // Initialize exams module
    function initExamsModule() {
        try {
            examsModule = new ExamsModule();
            window.examsModule = examsModule;
            return examsModule;
        } catch (error) {
            console.error('Failed to initialize ExamsModule:', error);
            return null;
        }
    }
    
    // Global functions
    function loadExams() {
        if (examsModule) {
            examsModule.loadExams();
        } else {
            initExamsModule();
        }
    }
    
    function refreshAssessments() {
        if (examsModule) {
            examsModule.refreshAssessments();
        }
    }
    
    function switchToCurrentAssessments() {
        if (examsModule) {
            examsModule.switchToCurrentAssessments();
        }
    }
    
    function switchToCompletedAssessments() {
        if (examsModule) {
            examsModule.switchToCompletedAssessments();
        }
    }
    
    // Expose to global scope
    window.ExamsModule = ExamsModule;
    window.initExamsModule = initExamsModule;
    window.loadExams = loadExams;
    window.refreshAssessments = refreshAssessments;
    window.switchToCurrentAssessments = switchToCurrentAssessments;
    window.switchToCompletedAssessments = switchToCompletedAssessments;
    
    // Auto-initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initExamsModule);
    } else {
        initExamsModule();
    }
})();
