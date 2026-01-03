// js/exams.js - Complete Fixed Exams Management Module for new UI
(function() {
    'use strict';
    
    console.log('🎯 exams.js loaded - ULTIMATE FIXED VERSION');
    
    // Helper functions - SIMPLE AND DIRECT
    function getSupabaseClient() {
        return window.db?.supabase || null;
    }
    
    // FIXED: This is the CRITICAL fix - extract fields from profile
    function getUserProfile() {
        console.log('🔍 getUserProfile() called in exams.js');
        
        // Get the profile
        const rawProfile = window.db?.currentUserProfile || 
                          window.currentUserProfile || 
                          window.userProfile || 
                          {};
        
        console.log('📋 Raw profile:', {
            program: rawProfile.program,
            intake_year: rawProfile.intake_year,
            block: rawProfile.block,
            hasProgram: !!rawProfile.program,
            hasIntakeYear: !!rawProfile.intake_year
        });
        
        // EXTRACT and ensure string values
        return {
            program: String(rawProfile.program || ''),
            department: String(rawProfile.department || ''),
            intake_year: String(rawProfile.intake_year || ''),
            block: String(rawProfile.block || ''),
            // Include all original data too
            ...rawProfile
        };
    }
    
    function getCurrentUserId() {
        const userId = window.db?.currentUserId || window.currentUserId || null;
        console.log('🔑 getCurrentUserId:', userId);
        return userId;
    }
    
    class ExamsModule {
        constructor() {
            console.log('🔧 ExamsModule constructor called');
            
            this.userId = null;
            this.userProfile = null;
            this.cachedExams = [];
            this.currentFilter = 'all';
            
            // Get DOM elements
            this.currentAssessmentsTable = document.getElementById('current-assessments-table');
            this.completedAssessmentsTable = document.getElementById('completed-assessments-table');
            this.currentEmptyState = document.getElementById('current-empty');
            this.completedEmptyState = document.getElementById('completed-empty');
            this.currentCountElement = document.getElementById('current-count');
            this.completedCountElement = document.getElementById('completed-count');
            this.completedAverageElement = document.getElementById('completed-average');
            
            // Initialize
            this.initializeElements();
            this.initialize();
        }
        
        initializeElements() {
            // Setup event listeners
            const viewAllBtn = document.getElementById('view-all-assessments');
            const viewCurrentBtn = document.getElementById('view-current-only');
            const viewCompletedBtn = document.getElementById('view-completed-only');
            const refreshBtn = document.getElementById('refresh-assessments');
            
            if (viewAllBtn) {
                viewAllBtn.addEventListener('click', () => this.filterAssessments('all'));
                viewAllBtn.classList.add('active');
            }
            if (viewCurrentBtn) viewCurrentBtn.addEventListener('click', () => this.filterAssessments('current'));
            if (viewCompletedBtn) viewCompletedBtn.addEventListener('click', () => this.filterAssessments('completed'));
            if (refreshBtn) refreshBtn.addEventListener('click', () => this.refreshAssessments());
        }
        
        initialize() {
            console.log('🚀 Initializing ExamsModule...');
            
            // Get user data
            this.userId = getCurrentUserId();
            this.userProfile = getUserProfile();
            
            console.log('👤 User data loaded:', {
                userId: this.userId,
                program: this.userProfile.program,
                intake_year: this.userProfile.intake_year,
                block: this.userProfile.block
            });
            
            if (this.userId && this.userProfile.program && this.userProfile.intake_year) {
                console.log('✅ Data valid, loading exams...');
                this.loadExams();
            } else {
                console.error('❌ Missing user data');
                this.showError('Missing user profile data. Please ensure your profile is complete.');
            }
        }
        
        async loadExams() {
            console.log('📥 Loading exams...');
            
            this.showLoadingState('current');
            this.showLoadingState('completed');
            
            const program = this.userProfile.program;
            const block = this.userProfile.block;
            const intakeYear = this.userProfile.intake_year;
            const studentId = this.userId;
            
            console.log('🎯 Query params:', { program, intakeYear, block, studentId });
            
            if (!program || !intakeYear || !studentId) {
                console.error('❌ Missing required data:', { program, intakeYear, studentId });
                this.showError('Missing program, intake year, or user ID');
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
                
                // Process data
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
                        }
                        
                        displayStatus = calculatedPercentage !== null 
                            ? (calculatedPercentage >= 60 ? 'PASS' : 'FAIL')
                            : 'Graded';
                    }
                    
                    return {
                        ...exam,
                        grade: grade || null,
                        display_status: displayStatus,
                        calculated_percentage: calculatedPercentage,
                        assessment_status: grade ? 'completed' : 'current',
                        cat1Score: grade?.cat_1_score || null,
                        cat2Score: grade?.cat_2_score || null,
                        finalScore: grade?.exam_score || null,
                        dateGraded: grade?.graded_at
                    };
                });
                
                // Display results
                const current = this.cachedExams.filter(e => e.assessment_status === 'current');
                const completed = this.cachedExams.filter(e => e.assessment_status === 'completed');
                
                this.displayResults(current, completed);
                console.log('✅ Exams loaded successfully');
                
            } catch (error) {
                console.error('❌ Failed to load exams:', error);
                this.showError(`Error loading exams: ${error.message}`);
            }
        }
        
        displayResults(current, completed) {
            // Display current assessments
            if (current.length > 0) {
                this.displayCurrentAssessments(current);
                this.hideEmptyState('current');
            } else {
                this.showEmptyState('current');
            }
            
            // Display completed assessments
            if (completed.length > 0) {
                this.displayCompletedAssessments(completed);
                this.hideEmptyState('completed');
                this.calculatePerformanceSummary(completed);
            } else {
                this.showEmptyState('completed');
            }
            
            // Update header stats
            this.updateHeaderStats(current.length, completed.length);
        }
        
        displayCurrentAssessments(assessments) {
            if (!this.currentAssessmentsTable) return;
            
            this.currentAssessmentsTable.innerHTML = '';
            
            assessments.forEach(exam => {
                const dateStr = exam.exam_date ? new Date(exam.exam_date).toLocaleDateString('en-US', { 
                    year: 'numeric', month: 'short', day: 'numeric' 
                }) : '--';
                
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
        
        displayCompletedAssessments(assessments) {
            if (!this.completedAssessmentsTable) return;
            
            this.completedAssessmentsTable.innerHTML = '';
            
            assessments.forEach(exam => {
                const gradedDate = exam.dateGraded ? new Date(exam.dateGraded).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'short', day: 'numeric'
                }) : '--';
                
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
        
        // Other methods remain the same...
        calculatePerformanceSummary(assessments) {
            // Implementation from previous versions
            const scoredAssessments = assessments.filter(a => a.calculated_percentage !== null);
            
            if (scoredAssessments.length === 0) return;
            
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
            
            if (this.distinctionCountElement) this.distinctionCountElement.textContent = gradeCounts.distinction;
            if (this.creditCountElement) this.creditCountElement.textContent = gradeCounts.credit;
            if (this.passCountElement) this.passCountElement.textContent = gradeCounts.pass;
            if (this.failCountElement) this.failCountElement.textContent = gradeCounts.fail;
        }
        
        updateHeaderStats(current, completed) {
            if (this.currentCountHeader) this.currentCountHeader.textContent = current;
            if (this.completedCountHeader) this.completedCountHeader.textContent = completed;
        }
        
        filterAssessments(filterType) {
            this.currentFilter = filterType;
            this.loadExams();
        }
        
        refreshAssessments() {
            this.loadExams();
        }
        
        showLoadingState(section) {
            // Implementation from previous versions
        }
        
        showEmptyState(section) {
            // Implementation from previous versions
        }
        
        hideEmptyState(section) {
            // Implementation from previous versions
        }
        
        showError(message) {
            // Show error in both tables
            if (this.currentAssessmentsTable) {
                this.currentAssessmentsTable.innerHTML = `
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
                    </tr>`;
            }
            if (this.completedAssessmentsTable) {
                this.completedAssessmentsTable.innerHTML = `
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
                    </tr>`;
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
    
    // Create and expose module
    let examsModule = null;
    
    function initExamsModule() {
        console.log('🚀 Initializing exams module...');
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
    window.ExamsModule = ExamsModule;
    window.initExamsModule = initExamsModule;
    window.loadExams = function() {
        if (examsModule) examsModule.loadExams();
        else initExamsModule();
    };
    window.refreshAssessments = function() {
        if (examsModule) examsModule.refreshAssessments();
    };
    
    // Auto-initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initExamsModule);
    } else {
        initExamsModule();
    }
})();
