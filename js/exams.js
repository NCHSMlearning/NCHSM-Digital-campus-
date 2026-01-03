// js/exams.js - Updated Exams Management Module for new UI
(function() {
    'use strict';
    
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
                currentCountHeader: !!this.currentCountHeader,
                completedCountHeader: !!this.completedCountHeader
            });
            
            this.initializeElements();
        }
        
        initializeElements() {
            console.log('🔌 initializeElements called');
            
            // Setup event listeners for new buttons
            const viewAllBtn = document.getElementById('view-all-assessments');
            const viewCurrentBtn = document.getElementById('view-current-only');
            const viewCompletedBtn = document.getElementById('view-completed-only');
            const refreshBtn = document.getElementById('refresh-assessments');
            const transcriptBtn = document.getElementById('view-transcript');
            
            if (viewAllBtn) {
                viewAllBtn.addEventListener('click', () => {
                    console.log('🔄 View All button clicked');
                    this.filterAssessments('all');
                });
                viewAllBtn.classList.add('active');
            }
            
            if (viewCurrentBtn) {
                viewCurrentBtn.addEventListener('click', () => {
                    console.log('🔄 Current Only button clicked');
                    this.filterAssessments('current');
                });
            }
            
            if (viewCompletedBtn) {
                viewCompletedBtn.addEventListener('click', () => {
                    console.log('🔄 Completed Only button clicked');
                    this.filterAssessments('completed');
                });
            }
            
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => {
                    console.log('🔄 Refresh button clicked');
                    this.refreshAssessments();
                });
            }
            
            if (transcriptBtn) {
                transcriptBtn.addEventListener('click', () => {
                    console.log('📄 View transcript clicked');
                    if (window.AppUtils && window.AppUtils.showToast) {
                        AppUtils.showToast('Transcript feature coming soon!', 'info');
                    }
                });
            }
        }
        
        // Initialize with user ID and profile
        initialize() {
            console.log('🚀 ExamsModule.initialize() called');
            this.userId = getCurrentUserId();
            this.userProfile = getUserProfile();
            
            console.log('👤 User data:', {
                userId: this.userId,
                userProfile: this.userProfile ? 'Loaded' : 'Missing'
            });
            
            if (this.userId && this.userProfile) {
                console.log('✅ User data available, loading exams...');
                this.loadExams();
            } else {
                console.error('❌ Missing user data:', {
                    userId: this.userId,
                    userProfile: !!this.userProfile
                });
            }
        }
        
        // Get Supabase client
        getSupabaseClient() {
            const client = window.supabaseClient || getSupabaseClient();
            console.log('🔌 Supabase client:', client ? 'Available' : 'Missing');
            return client;
        }
        
        // Load exams and grades (ORIGINAL FETCHING LOGIC)
        async loadExams() {
            console.log('📥 loadExams() started');
            
            // Show loading states
            this.showLoadingState('current');
            this.showLoadingState('completed');
            
            if (!this.userProfile) {
                console.log('🔄 Re-fetching user profile');
                this.userProfile = getUserProfile();
            }
            
            if (!this.userId) {
                console.log('🔄 Re-fetching user ID');
                this.userId = getCurrentUserId();
            }
            
            const program = this.userProfile?.program || this.userProfile?.department;
            const block = this.userProfile?.block;
            const intakeYear = this.userProfile?.intake_year;
            const studentId = this.userId;
            
            console.log('🎯 Query parameters:', {
                program,
                block,
                intakeYear,
                studentId,
                userProfileKeys: Object.keys(this.userProfile || {})
            });
            
            if (!program || !intakeYear) {
                console.error('❌ Missing program or intake year:', {
                    program: program || 'undefined',
                    intakeYear: intakeYear || 'undefined'
                });
                this.showErrorState('current', 'Missing program or intake year info');
                this.showErrorState('completed', 'Missing program or intake year info');
                this.cachedExams = [];
                return;
            }
            
            try {
                console.log('📡 Fetching exams from Supabase...');
                // Fetch exams for this student's program
                const { data: exams, error: examsError } = await this.getSupabaseClient()
                    .from('exams_with_courses')
                    .select(`
                        id,
                        exam_name,
                        exam_type,  
                        exam_date,
                        status,
                        block_term,
                        program_type,
                        exam_link,
                        course_name
                    `)
                    .or(`program_type.eq.${program},program_type.eq.General`)
                    .or(`block_term.eq.${block},block_term.is.null,block_term.eq.General`)
                    .eq('intake_year', intakeYear)
                    .order('exam_date', { ascending: true });
                
                if (examsError) {
                    console.error('❌ Error fetching exams:', examsError);
                    throw examsError;
                }
                
                console.log(`✅ Fetched ${exams?.length || 0} exams:`, exams);
                
                // Fetch overall grades
                console.log('📡 Fetching grades from Supabase...');
                const { data: grades, error: gradesError } = await this.getSupabaseClient()
                    .from('exam_grades')
                    .select(`
                        exam_id,
                        student_id,
                        cat_1_score,
                        cat_2_score,
                        exam_score,
                        total_score,
                        result_status,
                        marks,
                        graded_by,
                        graded_at
                    `)
                    .eq('student_id', studentId)
                    .eq('question_id', '00000000-0000-0000-0000-000000000000')
                    .order('graded_at', { ascending: false });
                
                if (gradesError) {
                    console.error('❌ Error fetching grades:', gradesError);
                    throw gradesError;
                }
                
                console.log(`✅ Fetched ${grades?.length || 0} grades:`, grades);
                
                // Combine exams with their grades
                this.cachedExams = exams.map(exam => {
                    const grade = grades?.find(g => String(g.exam_id) === String(exam.id));
                    const examType = exam.exam_type || '';
                    
                    let resultStatus = 'Scheduled';
                    let displayStatus = 'Scheduled';
                    let calculatedPercentage = null;
                    
                    if (grade) {
                        console.log(`📊 Processing grade for exam ${exam.id}:`, grade);
                        
                        // Calculate percentage consistently
                        if (grade.total_score !== null && grade.total_score !== undefined) {
                            calculatedPercentage = Number(grade.total_score);
                            console.log(`📐 Using total_score: ${calculatedPercentage}%`);
                        } else {
                            // Calculate from CAT scores if total_score not available
                            if (examType.includes('CAT_1') || examType === 'CAT' || examType === 'CAT_1') {
                                if (grade.cat_1_score !== null) {
                                    calculatedPercentage = (grade.cat_1_score / 30) * 100;
                                    console.log(`📐 Calculated CAT1 percentage: ${calculatedPercentage}%`);
                                }
                            } else if (examType.includes('CAT_2') || examType === 'CAT_2') {
                                if (grade.cat_2_score !== null) {
                                    calculatedPercentage = (grade.cat_2_score / 30) * 100;
                                    console.log(`📐 Calculated CAT2 percentage: ${calculatedPercentage}%`);
                                }
                            } else if (examType === 'EXAM' || examType.includes('EXAM') || examType.includes('Final')) {
                                if (grade.cat_1_score !== null && grade.cat_2_score !== null && grade.exam_score !== null) {
                                    const totalMarks = grade.cat_1_score + grade.cat_2_score + grade.exam_score;
                                    calculatedPercentage = (totalMarks / 100) * 100;
                                    console.log(`📐 Calculated Final exam percentage: ${calculatedPercentage}%`);
                                } else if (grade.marks) {
                                    try {
                                        const marksData = typeof grade.marks === 'string' ? JSON.parse(grade.marks) : grade.marks;
                                        if (marksData.percentage !== undefined) {
                                            calculatedPercentage = marksData.percentage;
                                            console.log(`📐 Using marks JSON percentage: ${calculatedPercentage}%`);
                                        }
                                    } catch (e) {
                                        console.warn('⚠️ Error parsing marks JSON:', e);
                                    }
                                }
                            }
                        }
                        
                        // Determine PASS/FAIL based on 60% threshold
                        if (calculatedPercentage !== null) {
                            displayStatus = calculatedPercentage >= 60 ? 'PASS' : 'FAIL';
                            resultStatus = 'Final';
                            console.log(`🎯 Exam ${exam.id}: ${calculatedPercentage}% = ${displayStatus}`);
                        } else {
                            if (grade.result_status === 'Final') {
                                displayStatus = 'Graded';
                                resultStatus = 'Final';
                            } else {
                                displayStatus = grade.result_status || 'Graded';
                                resultStatus = grade.result_status || 'Graded';
                            }
                            console.log(`🎯 Exam ${exam.id}: No percentage, using ${displayStatus}`);
                        }
                    } else {
                        console.log(`📭 No grade found for exam ${exam.id}`);
                    }
                    
                    // Determine if assessment is current or completed
                    let assessmentStatus = 'current';
                    if (grade && (calculatedPercentage !== null || grade.result_status === 'Final' || grade.result_status === 'Graded')) {
                        assessmentStatus = 'completed';
                    }
                    
                    return { 
                        ...exam, 
                        grade: grade || null,
                        display_status: displayStatus,
                        result_status: resultStatus,
                        calculated_percentage: calculatedPercentage,
                        assessment_status: assessmentStatus,
                        // Add additional fields for new UI
                        totalPercentage: calculatedPercentage,
                        cat1Score: grade?.cat_1_score || null,
                        cat2Score: grade?.cat_2_score || null,
                        finalScore: grade?.exam_score || null,
                        dateGraded: grade?.graded_at
                    };
                });
                
                console.log('💾 Cached exams:', this.cachedExams);
                
                // Split into current and completed
                const currentAssessments = this.cachedExams.filter(exam => exam.assessment_status === 'current');
                const completedAssessments = this.cachedExams.filter(exam => exam.assessment_status === 'completed');
                
                console.log(`📊 Split: ${currentAssessments.length} current, ${completedAssessments.length} completed`);
                
                // Update header stats
                this.updateHeaderStats(currentAssessments.length, completedAssessments.length);
                
                // Apply filter if needed
                let filteredCurrent = currentAssessments;
                let filteredCompleted = completedAssessments;
                
                if (this.currentFilter === 'current') {
                    filteredCompleted = [];
                } else if (this.currentFilter === 'completed') {
                    filteredCurrent = [];
                }
                
                // Display assessments
                console.log('🎨 Displaying current assessments:', filteredCurrent.length);
                if (filteredCurrent.length > 0) {
                    this.displayCurrentAssessments(filteredCurrent);
                    this.hideEmptyState('current');
                } else {
                    this.showEmptyState('current');
                }
                
                console.log('🎨 Displaying completed assessments:', filteredCompleted.length);
                if (filteredCompleted.length > 0) {
                    this.displayCompletedAssessments(filteredCompleted);
                    this.hideEmptyState('completed');
                    this.calculatePerformanceSummary(filteredCompleted);
                } else {
                    this.showEmptyState('completed');
                }
                
            } catch (error) {
                console.error('❌ Failed to load exams:', error);
                this.showErrorState('current', 'Failed to load assessments');
                this.showErrorState('completed', 'Failed to load assessments');
                this.cachedExams = [];
            }
        }
        
        // Display current assessments in new table format
        displayCurrentAssessments(assessments) {
            if (!this.currentAssessmentsTable) {
                console.error('❌ current-assessments-table element not found!');
                return;
            }
            
            this.currentAssessmentsTable.innerHTML = '';
            
            if (assessments.length === 0) {
                return;
            }
            
            // Update count
            if (this.currentCountElement) {
                this.currentCountElement.textContent = `${assessments.length} pending`;
            }
            
            assessments.forEach((exam, index) => {
                console.log(`🎨 Rendering current exam ${index + 1}:`, exam.exam_name);
                
                const dateStr = exam.exam_date
                    ? new Date(exam.exam_date).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                    })
                    : '--';
                
                const gradeEntry = exam.grade;
                const examType = exam.exam_type || 'EXAM';
                
                // Format scores
                const formatScore = (score) => {
                    if (score === null || score === undefined || score === '-') return '--';
                    if (typeof score === 'string' && score.trim() === '') return '--';
                    return score;
                };
                
                let cat1Score = '--';
                let cat2Score = '--';
                let finalExamScore = '--';
                let totalScore = '--';
                
                if (gradeEntry) {
                    cat1Score = formatScore(gradeEntry.cat_1_score);
                    cat2Score = formatScore(gradeEntry.cat_2_score);
                    finalExamScore = formatScore(gradeEntry.exam_score);
                    
                    if (exam.calculated_percentage !== null) {
                        totalScore = `${exam.calculated_percentage.toFixed(1)}%`;
                    } else if (gradeEntry.total_score !== null) {
                        totalScore = `${gradeEntry.total_score.toFixed(1)}%`;
                    } else {
                        totalScore = '--';
                    }
                }
                
                // Determine status display
                let statusDisplay = '';
                let statusClass = '';
                
                if (exam.display_status === 'PASS' || exam.display_status === 'FAIL') {
                    statusDisplay = `<i class="fas fa-clipboard-check"></i> ${exam.display_status}`;
                    statusClass = exam.display_status === 'PASS' ? 'completed' : 'failed';
                } else {
                    statusDisplay = '<i class="fas fa-clock"></i> Pending';
                    statusClass = 'pending';
                }
                
                // Add exam type indicator
                let typeBadge = '';
                if (examType.includes('CAT')) {
                    typeBadge = `<span class="type-badge cat">CAT</span>`;
                } else {
                    typeBadge = `<span class="type-badge exam">Exam</span>`;
                }
                
                const rowHTML = `
                    <tr>
                        <td>${this.escapeHtml(exam.exam_name || 'N/A')}</td>
                        <td>${typeBadge}</td>
                        <td>${this.escapeHtml(exam.course_name || 'General')}</td>
                        <td class="text-center">${this.escapeHtml(exam.block_term || 'General')}</td>
                        <td>${dateStr}</td>
                        <td><span class="status-badge ${statusClass}">${statusDisplay}</span></td>
                        <td class="text-center">${cat1Score}</td>
                        <td class="text-center">${cat2Score}</td>
                        <td class="text-center">${finalExamScore}</td>
                        <td class="text-center"><strong>${totalScore}</strong></td>
                    </tr>`;
                
                this.currentAssessmentsTable.innerHTML += rowHTML;
            });
            
            console.log('✅ Current table rendered with', assessments.length, 'rows');
        }
        
        // Display completed assessments in new table format
        displayCompletedAssessments(assessments) {
            if (!this.completedAssessmentsTable) {
                console.error('❌ completed-assessments-table element not found!');
                return;
            }
            
            this.completedAssessmentsTable.innerHTML = '';
            
            if (assessments.length === 0) {
                return;
            }
            
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
            
            assessments.forEach((exam, index) => {
                console.log(`🎨 Rendering completed exam ${index + 1}:`, exam.exam_name);
                
                const dateStr = exam.exam_date
                    ? new Date(exam.exam_date).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                    })
                    : '--';
                
                const gradedDate = exam.dateGraded
                    ? new Date(exam.dateGraded).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    })
                    : '--';
                
                const gradeEntry = exam.grade;
                const examType = exam.exam_type || 'EXAM';
                
                // Format scores
                const formatScore = (score) => {
                    if (score === null || score === undefined || score === '-') return '--';
                    if (typeof score === 'string' && score.trim() === '') return '--';
                    return score;
                };
                
                let cat1Score = '--';
                let cat2Score = '--';
                let finalExamScore = '--';
                let totalScore = '--';
                
                if (gradeEntry) {
                    cat1Score = formatScore(gradeEntry.cat_1_score);
                    cat2Score = formatScore(gradeEntry.cat_2_score);
                    finalExamScore = formatScore(gradeEntry.exam_score);
                    
                    if (exam.calculated_percentage !== null) {
                        totalScore = `${exam.calculated_percentage.toFixed(1)}%`;
                    } else if (gradeEntry.total_score !== null) {
                        totalScore = `${gradeEntry.total_score.toFixed(1)}%`;
                    } else {
                        totalScore = '--';
                    }
                }
                
                // Calculate grade based on percentage
                let grade = '--';
                let gradeClass = '';
                if (exam.calculated_percentage !== null) {
                    if (exam.calculated_percentage >= 70) {
                        grade = 'Distinction';
                        gradeClass = 'distinction';
                    } else if (exam.calculated_percentage >= 60) {
                        grade = 'Credit';
                        gradeClass = 'credit';
                    } else if (exam.calculated_percentage >= 50) {
                        grade = 'Pass';
                        gradeClass = 'pass';
                    } else {
                        grade = 'Fail';
                        gradeClass = 'fail';
                    }
                }
                
                // Determine status display
                let statusDisplay = '';
                let statusClass = '';
                
                if (exam.display_status === 'PASS') {
                    statusDisplay = `<i class="fas fa-check-circle"></i> ${grade}`;
                    statusClass = gradeClass;
                } else if (exam.display_status === 'FAIL') {
                    statusDisplay = '<i class="fas fa-times-circle"></i> Failed';
                    statusClass = 'failed';
                } else {
                    statusDisplay = `<i class="fas fa-clipboard-check"></i> ${exam.display_status}`;
                    statusClass = 'graded';
                }
                
                // Add exam type indicator
                let typeBadge = '';
                if (examType.includes('CAT')) {
                    typeBadge = `<span class="type-badge cat">CAT</span>`;
                } else {
                    typeBadge = `<span class="type-badge exam">Exam</span>`;
                }
                
                // Grade badge
                const gradeBadge = grade !== '--' ? 
                    `<span class="grade-badge ${gradeClass}">${grade}</span>` : '--';
                
                const rowHTML = `
                    <tr>
                        <td>${this.escapeHtml(exam.exam_name || 'N/A')}</td>
                        <td>${typeBadge}</td>
                        <td>${this.escapeHtml(exam.course_name || 'General')}</td>
                        <td class="text-center">${this.escapeHtml(exam.block_term || 'General')}</td>
                        <td>${gradedDate}</td>
                        <td><span class="status-badge ${statusClass}">${statusDisplay}</span></td>
                        <td class="text-center">${cat1Score}</td>
                        <td class="text-center">${cat2Score}</td>
                        <td class="text-center">${finalExamScore}</td>
                        <td class="text-center"><strong>${totalScore}</strong></td>
                        <td class="text-center">${gradeBadge}</td>
                    </tr>`;
                
                this.completedAssessmentsTable.innerHTML += rowHTML;
            });
            
            console.log('✅ Completed table rendered with', assessments.length, 'rows');
        }
        
        // Calculate performance summary
        calculatePerformanceSummary(assessments) {
            const scoredAssessments = assessments.filter(a => a.calculated_percentage !== null);
            
            if (scoredAssessments.length === 0) {
                // Reset all summary values
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
            
            // Calculate best and lowest scores
            const scores = scoredAssessments.map(a => a.calculated_percentage);
            const bestScore = Math.max(...scores);
            const lowestScore = Math.min(...scores);
            
            if (this.bestScoreElement) this.bestScoreElement.textContent = `${bestScore.toFixed(1)}%`;
            if (this.lowestScoreElement) this.lowestScoreElement.textContent = `${lowestScore.toFixed(1)}%`;
            
            // Calculate pass rate (50% or higher is pass)
            const passedAssessments = scoredAssessments.filter(a => a.calculated_percentage >= 50);
            const passRate = (passedAssessments.length / scoredAssessments.length) * 100;
            if (this.passRateElement) this.passRateElement.textContent = `${passRate.toFixed(0)}%`;
            
            // Calculate grade distribution
            const gradeCounts = {
                distinction: scoredAssessments.filter(a => a.calculated_percentage >= 70).length,
                credit: scoredAssessments.filter(a => a.calculated_percentage >= 60 && a.calculated_percentage < 70).length,
                pass: scoredAssessments.filter(a => a.calculated_percentage >= 50 && a.calculated_percentage < 60).length,
                fail: scoredAssessments.filter(a => a.calculated_percentage < 50).length
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
            console.log('📊 Updating header stats:', {current, completed});
            
            // Calculate average score for completed assessments
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
        
        // Filter assessments based on selection
        filterAssessments(filterType) {
            console.log('🔍 Filtering assessments by:', filterType);
            this.currentFilter = filterType;
            
            // Get section elements
            const currentSection = document.querySelector('.current-section');
            const completedSection = document.querySelector('.completed-section');
            
            // Show/hide sections based on filter
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
            const buttons = document.querySelectorAll('.quick-actions .action-btn');
            buttons.forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Find and activate the correct button
            let activeBtn;
            if (filterType === 'current') {
                activeBtn = document.getElementById('view-current-only');
            } else if (filterType === 'completed') {
                activeBtn = document.getElementById('view-completed-only');
            } else {
                activeBtn = document.getElementById('view-all-assessments');
            }
            
            if (activeBtn) {
                activeBtn.classList.add('active');
            }
            
            // Reload assessments with new filter
            this.loadExams();
        }
        
        // Switch to current assessments
        switchToCurrentAssessments() {
            this.filterAssessments('current');
        }
        
        // Switch to completed assessments
        switchToCompletedAssessments() {
            this.filterAssessments('completed');
        }
        
        // Refresh assessments
        refreshAssessments() {
            console.log('🔄 Refreshing assessments...');
            this.loadExams();
            if (window.AppUtils && window.AppUtils.showToast) {
                AppUtils.showToast('Assessments refreshed successfully', 'success');
            }
        }
        
        // Show loading state
        showLoadingState(section) {
            console.log(`⏳ Showing loading state for: ${section}`);
            
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
        
        // Show empty state
        showEmptyState(section) {
            console.log(`📭 Showing empty state for: ${section}`);
            
            if (section === 'current') {
                if (this.currentEmptyState) {
                    this.currentEmptyState.style.display = 'block';
                }
                if (this.currentAssessmentsTable) {
                    this.currentAssessmentsTable.innerHTML = '';
                }
                
            } else if (section === 'completed') {
                if (this.completedEmptyState) {
                    this.completedEmptyState.style.display = 'block';
                }
                if (this.completedAssessmentsTable) {
                    this.completedAssessmentsTable.innerHTML = '';
                }
            }
        }
        
        // Hide empty state
        hideEmptyState(section) {
            console.log(`👁️ Hiding empty state for: ${section}`);
            
            if (section === 'current') {
                if (this.currentEmptyState) {
                    this.currentEmptyState.style.display = 'none';
                }
            } else if (section === 'completed') {
                if (this.completedEmptyState) {
                    this.completedEmptyState.style.display = 'none';
                }
            }
        }
        
        // Show error state
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
                                    <button onclick="refreshAssessments()" class="btn btn-sm btn-primary">
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
                                    <button onclick="refreshAssessments()" class="btn btn-sm btn-primary">
                                        <i class="fas fa-redo"></i> Retry
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                }
            }
        }
        
        // Utility functions
        escapeHtml(str) {
            if (!str) return '';
            return String(str)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }
        
        // Update user profile
        updateUserProfile(userProfile) {
            console.log('👤 Updating user profile in ExamsModule');
            this.userProfile = userProfile;
        }
    }
    
    // Create global instance
    let examsModule = null;
    
    // Initialize exams module
    function initExamsModule() {
        console.log('🚀 initExamsModule() called');
        try {
            examsModule = new ExamsModule();
            examsModule.initialize();
            console.log('✅ ExamsModule initialized successfully');
            return examsModule;
        } catch (error) {
            console.error('❌ Failed to initialize ExamsModule:', error);
            return null;
        }
    }
    
    // Global functions
    function loadExams() {
        console.log('🌍 Global loadExams() called');
        if (examsModule) {
            console.log('📥 Calling examsModule.loadExams()');
            examsModule.loadExams();
        } else {
            console.error('❌ examsModule not initialized!');
            initExamsModule();
        }
    }
    
    function refreshAssessments() {
        console.log('🌍 Global refreshAssessments called');
        if (examsModule) {
            examsModule.refreshAssessments();
        }
    }
    
    function switchToCurrentAssessments() {
        console.log('🌍 Global switchToCurrentAssessments called');
        if (examsModule) {
            examsModule.switchToCurrentAssessments();
        }
    }
    
    function switchToCompletedAssessments() {
        console.log('🌍 Global switchToCompletedAssessments called');
        if (examsModule) {
            examsModule.switchToCompletedAssessments();
        }
    }
    
    function filterAssessments(filterType) {
        console.log('🌍 Global filterAssessments called:', filterType);
        if (examsModule) {
            examsModule.filterAssessments(filterType);
        }
    }
    
    // Make functions globally available
    window.ExamsModule = ExamsModule;
    window.initExamsModule = initExamsModule;
    window.loadExams = loadExams;
    window.refreshAssessments = refreshAssessments;
    window.switchToCurrentAssessments = switchToCurrentAssessments;
    window.switchToCompletedAssessments = switchToCompletedAssessments;
    window.filterAssessments = filterAssessments;
    
    // Auto-initialize
    if (typeof window !== 'undefined') {
        console.log('🏁 Exams module loaded, ready to initialize');
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initExamsModule);
        } else {
            initExamsModule();
        }
    }
    
})();
