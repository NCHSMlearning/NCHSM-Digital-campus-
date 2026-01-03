// js/exams.js - Enhanced Exams Management Module for Student Dashboard
// Updated to work with actual database schema

// *************************************************************************
// *** EXAMS & ASSESSMENTS MANAGEMENT SYSTEM ***
// *************************************************************************

// Helper function for safe Supabase client access
function getSupabaseClient() {
    const client = window.db?.supabase;
    if (!client || typeof client.from !== 'function') {
        console.error('❌ No valid Supabase client available');
        return null;
    }
    return client;
}

// Helper function for safe user profile access
function getUserProfile() {
    return window.db?.currentUserProfile || 
           window.currentUserProfile || 
           window.userProfile || 
           {};
}

// Helper function for safe user ID access
function getCurrentUserId() {
    return window.db?.currentUserId || window.currentUserId;
}

let cachedAssessments = [];
let currentFilter = 'all';

// Convert string scores to numbers safely
function parseScore(score) {
    if (score === null || score === undefined || score === '') return null;
    const num = parseFloat(score);
    return isNaN(num) ? null : num;
}

// Calculate total percentage from individual scores
function calculateTotalPercentage(cat1, cat2, exam, totalScore) {
    // If total_score is provided, use it
    if (totalScore !== null && totalScore !== undefined) {
        return parseScore(totalScore);
    }
    
    // Otherwise calculate from individual scores
    const cat1Num = parseScore(cat1);
    const cat2Num = parseScore(cat2);
    const examNum = parseScore(exam);
    
    if (cat1Num !== null && cat2Num !== null && examNum !== null) {
        // Assuming CAT1 and CAT2 are out of 15 each (15% each), exam is out of 70 (70%)
        const totalMarks = cat1Num + cat2Num + examNum;
        // If scores are already percentages, return as is
        if (totalMarks <= 100) {
            return totalMarks;
        }
        // If scores are raw marks, calculate percentage
        // CAT1: 15%, CAT2: 15%, Exam: 70% = 100% total
        const totalPossible = 15 + 15 + 70; // 100
        return (totalMarks / totalPossible) * 100;
    }
    
    return null;
}

// Calculate grade based on percentage score
function calculateGrade(percentage) {
    if (percentage >= 70) return 'Distinction';
    if (percentage >= 60) return 'Credit';
    if (percentage >= 50) return 'Pass';
    return 'Fail';
}

// Get grade color class
function getGradeClass(grade) {
    switch(grade) {
        case 'Distinction': return 'distinction';
        case 'Credit': return 'credit';
        case 'Pass': return 'pass';
        case 'Fail': return 'fail';
        default: return '';
    }
}

// Get grade icon
function getGradeIcon(grade) {
    switch(grade) {
        case 'Distinction': return 'fas fa-award';
        case 'Credit': return 'fas fa-star';
        case 'Pass': return 'fas fa-check-circle';
        case 'Fail': return 'fas fa-times-circle';
        default: return 'fas fa-question-circle';
    }
}

// Determine assessment status
function determineAssessmentStatus(gradeData) {
    if (!gradeData) return 'pending';
    
    const resultStatus = gradeData.result_status;
    const cat1Score = parseScore(gradeData.cat_1_score);
    const cat2Score = parseScore(gradeData.cat_2_score);
    const examScore = parseScore(gradeData.exam_score);
    
    // If result_status indicates completion
    if (resultStatus === 'Completed' || resultStatus === 'Graded' || resultStatus === 'Final') {
        const totalPercentage = calculateTotalPercentage(
            cat1Score, 
            cat2Score, 
            examScore, 
            parseScore(gradeData.total_score)
        );
        
        if (totalPercentage !== null) {
            return totalPercentage >= 50 ? 'completed' : 'failed';
        }
        return 'graded';
    }
    
    // Check if any scores are available
    if (cat1Score !== null || cat2Score !== null || examScore !== null) {
        return 'graded';
    }
    
    return 'pending';
}

// Load all assessments for the current student
async function loadAllAssessments() {
    const userProfile = getUserProfile();
    const userId = getCurrentUserId();
    
    console.log('📚 Loading assessments for user:', { userId, userProfile });
    
    // Get Supabase client safely
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) {
        console.error('❌ No Supabase client');
        return [];
    }
    
    const program = userProfile?.program || userProfile?.department;
    const block = userProfile?.block;
    const intakeYear = userProfile?.intake_year;

    if (!program || !intakeYear) {
        console.error('❌ Missing program or intake year info');
        return [];
    }

    try {
        console.log('📡 Fetching exams from Supabase...');
        
        // Fetch exams for this student's program
        const { data: exams, error: examsError } = await supabaseClient
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
                online_link,
                course_name,
                course_code,
                intake_year,
                duration_minutes,
                exam_start_time
            `)
            .or(`program_type.eq.${program},program_type.eq.General`)
            .or(`block_term.eq.${block},block_term.is.null,block_term.eq.General`)
            .eq('intake_year', intakeYear)
            .order('exam_date', { ascending: true });

        if (examsError) throw examsError;

        console.log(`✅ Fetched ${exams?.length || 0} exams`);

        // Fetch grades for this student
        const { data: grades, error: gradesError } = await supabaseClient
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
                graded_at,
                created_at,
                updated_at
            `)
            .eq('student_id', userId)
            .eq('question_id', '00000000-0000-0000-0000-000000000000')
            .order('graded_at', { ascending: false });

        if (gradesError) throw gradesError;

        console.log(`✅ Fetched ${grades?.length || 0} grades`);

        // Combine exams with their grades
        const assessments = exams.map(exam => {
            const grade = grades?.find(g => g.exam_id === exam.id);
            const examType = exam.exam_type || 'EXAM';
            
            // Parse scores
            const cat1Score = grade ? parseScore(grade.cat_1_score) : null;
            const cat2Score = grade ? parseScore(grade.cat_2_score) : null;
            const examScore = grade ? parseScore(grade.exam_score) : null;
            const totalScore = grade ? parseScore(grade.total_score) : null;
            
            // Calculate total percentage
            let totalPercentage = null;
            if (grade) {
                totalPercentage = calculateTotalPercentage(cat1Score, cat2Score, examScore, totalScore);
            }
            
            // Determine assessment status
            const status = determineAssessmentStatus(grade);
            
            // Calculate grade
            let gradeResult = '--';
            if (totalPercentage !== null) {
                gradeResult = calculateGrade(totalPercentage);
            }
            
            return {
                id: exam.id,
                name: exam.exam_name || 'Unnamed Assessment',
                type: examType.includes('CAT') ? 'CAT' : 'Exam',
                unit: exam.course_name || exam.course_code || 'General',
                code: exam.course_code || '',
                block: exam.block_term || 'General',
                dueDate: exam.exam_date,
                dateGraded: grade?.graded_at,
                status: status,
                cat1Score: cat1Score,
                cat2Score: cat2Score,
                finalScore: examScore,
                totalScore: totalScore,
                totalPercentage: totalPercentage,
                grade: gradeResult,
                examLink: exam.exam_link || exam.online_link,
                resultStatus: grade?.result_status || 'Scheduled',
                gradedBy: grade?.graded_by,
                duration: exam.duration_minutes,
                startTime: exam.exam_start_time,
                originalData: { ...exam, grade }
            };
        });

        console.log(`📊 Processed ${assessments.length} assessments`);
        return assessments;

    } catch (error) {
        console.error("❌ Failed to load assessments:", error);
        return [];
    }
}

// Load and display assessments based on filter
async function loadAssessments() {
    console.log('📚 loadAssessments called with filter:', currentFilter);
    
    // Show loading states
    showAssessmentsLoadingState('current');
    showAssessmentsLoadingState('completed');
    
    try {
        // Load all assessments
        cachedAssessments = await loadAllAssessments();
        console.log(`✅ Loaded ${cachedAssessments.length} total assessments`);
        
        if (cachedAssessments.length === 0) {
            console.log('⚠️ No assessments found');
            showAssessmentsEmptyState('current');
            showAssessmentsEmptyState('completed');
            updateAssessmentsHeaderStats(0, 0, 0, '--');
            return;
        }
        
        // Split assessments into current and completed
        const currentAssessments = cachedAssessments.filter(assessment => {
            return assessment.status === 'pending' || assessment.status === 'graded';
        });
        
        const completedAssessments = cachedAssessments.filter(assessment => {
            return assessment.status === 'completed' || assessment.status === 'failed';
        });
        
        console.log(`📊 Split: ${currentAssessments.length} current, ${completedAssessments.length} completed`);
        
        // Update header stats
        const averageScore = calculateAverageScore(completedAssessments);
        updateAssessmentsHeaderStats(
            cachedAssessments.length,
            currentAssessments.length,
            completedAssessments.length,
            averageScore
        );
        
        // Apply filter if needed
        let filteredCurrent = currentAssessments;
        let filteredCompleted = completedAssessments;
        
        if (currentFilter === 'current') {
            filteredCompleted = [];
        } else if (currentFilter === 'completed') {
            filteredCurrent = [];
        }
        
        // Display assessments
        console.log('🎨 Displaying current assessments:', filteredCurrent.length);
        if (filteredCurrent.length > 0) {
            displayCurrentAssessments(filteredCurrent);
            hideAssessmentsEmptyState('current');
        } else {
            showAssessmentsEmptyState('current');
        }
        
        console.log('🎨 Displaying completed assessments:', filteredCompleted.length);
        if (filteredCompleted.length > 0) {
            displayCompletedAssessments(filteredCompleted);
            hideAssessmentsEmptyState('completed');
            calculatePerformanceSummary(filteredCompleted);
        } else {
            showAssessmentsEmptyState('completed');
        }
        
    } catch (error) {
        console.error('❌ Error in loadAssessments:', error);
        showAssessmentsErrorState('current', 'Failed to load assessments');
        showAssessmentsErrorState('completed', 'Failed to load assessments');
    }
}

// Display current assessments
function displayCurrentAssessments(assessments) {
    const tableBody = document.getElementById('current-assessments-table');
    const countElement = document.getElementById('current-count');
    const emptyState = document.getElementById('current-empty');
    
    if (!tableBody) {
        console.error('❌ current-assessments-table element not found');
        return;
    }
    
    if (assessments.length === 0) {
        tableBody.innerHTML = '';
        showAssessmentsEmptyState('current');
        if (countElement) countElement.textContent = '0 pending';
        return;
    }
    
    // Update count
    if (countElement) {
        countElement.textContent = `${assessments.length} pending`;
    }
    
    // Clear loading/empty states
    if (emptyState) emptyState.style.display = 'none';
    
    // Generate table rows
    tableBody.innerHTML = assessments.map(assessment => {
        // Format due date
        const dueDate = assessment.dueDate ? 
            new Date(assessment.dueDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }) : '--';
        
        // Determine status display
        let statusDisplay = '';
        let statusClass = '';
        
        switch(assessment.status) {
            case 'pending':
                statusDisplay = '<i class="fas fa-clock"></i> Pending';
                statusClass = 'pending';
                break;
            case 'graded':
                statusDisplay = '<i class="fas fa-clipboard-check"></i> Graded';
                statusClass = 'graded';
                break;
            default:
                statusDisplay = '<i class="fas fa-question"></i> Unknown';
                statusClass = 'unknown';
        }
        
        // Format scores (show as integers if whole numbers)
        const formatScore = (score) => {
            if (score === null || score === undefined) return '--';
            if (Number.isInteger(score)) return score.toString();
            return score.toFixed(1);
        };
        
        const cat1Display = formatScore(assessment.cat1Score);
        const cat2Display = formatScore(assessment.cat2Score);
        const finalDisplay = formatScore(assessment.finalScore);
        const totalDisplay = assessment.totalPercentage !== null ? 
            `${assessment.totalPercentage.toFixed(1)}%` : '--';
        
        // Add exam type indicator
        let typeBadge = '';
        if (assessment.type === 'CAT') {
            typeBadge = `<span class="type-badge cat">CAT</span>`;
        } else {
            typeBadge = `<span class="type-badge exam">Exam</span>`;
        }
        
        return `
            <tr>
                <td>${escapeHtml(assessment.name)}</td>
                <td>${typeBadge}</td>
                <td>${escapeHtml(assessment.unit)}</td>
                <td class="text-center">${escapeHtml(assessment.block)}</td>
                <td>${dueDate}</td>
                <td><span class="status-badge ${statusClass}">${statusDisplay}</span></td>
                <td class="text-center">${cat1Display}</td>
                <td class="text-center">${cat2Display}</td>
                <td class="text-center">${finalDisplay}</td>
                <td class="text-center"><strong>${totalDisplay}</strong></td>
            </tr>
        `;
    }).join('');
}

// Display completed assessments
function displayCompletedAssessments(assessments) {
    const tableBody = document.getElementById('completed-assessments-table');
    const countElement = document.getElementById('completed-count');
    const averageElement = document.getElementById('completed-average');
    const emptyState = document.getElementById('completed-empty');
    
    if (!tableBody) {
        console.error('❌ completed-assessments-table element not found');
        return;
    }
    
    if (assessments.length === 0) {
        tableBody.innerHTML = '';
        showAssessmentsEmptyState('completed');
        if (countElement) countElement.textContent = '0 graded';
        if (averageElement) averageElement.textContent = 'Average: --';
        return;
    }
    
    // Calculate average
    const averageScore = calculateAverageScore(assessments);
    
    // Update counts
    if (countElement) {
        countElement.textContent = `${assessments.length} graded`;
    }
    if (averageElement) {
        averageElement.textContent = `Average: ${averageScore}`;
    }
    
    // Clear loading/empty states
    if (emptyState) emptyState.style.display = 'none';
    
    // Generate table rows
    tableBody.innerHTML = assessments.map(assessment => {
        // Format dates
        const dueDate = assessment.dueDate ? 
            new Date(assessment.dueDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }) : '--';
        
        const gradedDate = assessment.dateGraded ? 
            new Date(assessment.dateGraded).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }) : '--';
        
        // Determine status display
        let statusDisplay = '';
        let statusClass = '';
        
        if (assessment.status === 'completed') {
            statusDisplay = `<i class="${getGradeIcon(assessment.grade)}"></i> ${assessment.grade}`;
            statusClass = getGradeClass(assessment.grade);
        } else {
            statusDisplay = '<i class="fas fa-times-circle"></i> Failed';
            statusClass = 'failed';
        }
        
        // Format scores (show as integers if whole numbers)
        const formatScore = (score) => {
            if (score === null || score === undefined) return '--';
            if (Number.isInteger(score)) return score.toString();
            return score.toFixed(1);
        };
        
        const cat1Display = formatScore(assessment.cat1Score);
        const cat2Display = formatScore(assessment.cat2Score);
        const finalDisplay = formatScore(assessment.finalScore);
        const totalDisplay = assessment.totalPercentage !== null ? 
            `${assessment.totalPercentage.toFixed(1)}%` : '--';
        
        // Add exam type indicator
        let typeBadge = '';
        if (assessment.type === 'CAT') {
            typeBadge = `<span class="type-badge cat">CAT</span>`;
        } else {
            typeBadge = `<span class="type-badge exam">Exam</span>`;
        }
        
        // Grade badge
        const gradeClass = getGradeClass(assessment.grade);
        const gradeBadge = assessment.grade !== '--' ? 
            `<span class="grade-badge ${gradeClass}">${assessment.grade}</span>` : '--';
        
        return `
            <tr>
                <td>${escapeHtml(assessment.name)}</td>
                <td>${typeBadge}</td>
                <td>${escapeHtml(assessment.unit)}<br><small class="text-muted">${escapeHtml(assessment.code)}</small></td>
                <td class="text-center">${escapeHtml(assessment.block)}</td>
                <td>${gradedDate}</td>
                <td><span class="status-badge ${statusClass}">${statusDisplay}</span></td>
                <td class="text-center">${cat1Display}</td>
                <td class="text-center">${cat2Display}</td>
                <td class="text-center">${finalDisplay}</td>
                <td class="text-center"><strong>${totalDisplay}</strong></td>
                <td class="text-center">${gradeBadge}</td>
            </tr>
        `;
    }).join('');
}

// Calculate average score
function calculateAverageScore(assessments) {
    const scoredAssessments = assessments.filter(a => a.totalPercentage !== null);
    if (scoredAssessments.length === 0) return '--';
    
    const total = scoredAssessments.reduce((sum, a) => sum + a.totalPercentage, 0);
    const average = total / scoredAssessments.length;
    return `${average.toFixed(1)}%`;
}

// Calculate performance summary
function calculatePerformanceSummary(assessments) {
    const scoredAssessments = assessments.filter(a => a.totalPercentage !== null);
    
    if (scoredAssessments.length === 0) {
        // Reset all summary values
        document.getElementById('best-score').textContent = '--';
        document.getElementById('lowest-score').textContent = '--';
        document.getElementById('pass-rate').textContent = '--';
        document.getElementById('distinction-count').textContent = '0';
        document.getElementById('credit-count').textContent = '0';
        document.getElementById('pass-count').textContent = '0';
        document.getElementById('fail-count').textContent = '0';
        document.getElementById('first-assessment-date').textContent = '--';
        document.getElementById('latest-assessment-date').textContent = '--';
        document.getElementById('total-submitted').textContent = '0';
        
        // Reset bars
        ['distinction-bar', 'credit-bar', 'pass-bar', 'fail-bar'].forEach(id => {
            const bar = document.getElementById(id);
            if (bar) bar.style.width = '0%';
        });
        
        return;
    }
    
    // Calculate best and lowest scores
    const scores = scoredAssessments.map(a => a.totalPercentage);
    const bestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);
    
    document.getElementById('best-score').textContent = `${bestScore.toFixed(1)}%`;
    document.getElementById('lowest-score').textContent = `${lowestScore.toFixed(1)}%`;
    
    // Calculate pass rate (50% or higher is pass)
    const passedAssessments = scoredAssessments.filter(a => a.totalPercentage >= 50);
    const passRate = (passedAssessments.length / scoredAssessments.length) * 100;
    document.getElementById('pass-rate').textContent = `${passRate.toFixed(0)}%`;
    
    // Calculate grade distribution (Pass/Credit/Distinction/Fail)
    const gradeCounts = {
        distinction: scoredAssessments.filter(a => a.totalPercentage >= 70).length,
        credit: scoredAssessments.filter(a => a.totalPercentage >= 60 && a.totalPercentage < 70).length,
        pass: scoredAssessments.filter(a => a.totalPercentage >= 50 && a.totalPercentage < 60).length,
        fail: scoredAssessments.filter(a => a.totalPercentage < 50).length
    };
    
    // Update grade counts
    document.getElementById('distinction-count').textContent = gradeCounts.distinction;
    document.getElementById('credit-count').textContent = gradeCounts.credit;
    document.getElementById('pass-count').textContent = gradeCounts.pass;
    document.getElementById('fail-count').textContent = gradeCounts.fail;
    
    // Update distribution bars
    const totalCount = scoredAssessments.length;
    if (totalCount > 0) {
        document.getElementById('distinction-bar').style.width = `${(gradeCounts.distinction / totalCount) * 100}%`;
        document.getElementById('credit-bar').style.width = `${(gradeCounts.credit / totalCount) * 100}%`;
        document.getElementById('pass-bar').style.width = `${(gradeCounts.pass / totalCount) * 100}%`;
        document.getElementById('fail-bar').style.width = `${(gradeCounts.fail / totalCount) * 100}%`;
    }
    
    // Get assessment dates
    const dates = assessments
        .filter(a => a.dateGraded)
        .map(a => new Date(a.dateGraded))
        .sort((a, b) => a - b);
    
    if (dates.length > 0) {
        const firstDate = dates[0];
        const latestDate = dates[dates.length - 1];
        
        document.getElementById('first-assessment-date').textContent = 
            firstDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        document.getElementById('latest-assessment-date').textContent = 
            latestDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
    
    document.getElementById('total-submitted').textContent = scoredAssessments.length;
}

// Update header statistics
function updateAssessmentsHeaderStats(total, current, completed, average) {
    console.log('📊 Updating assessments header stats:', {total, current, completed, average});
    
    // Get DOM elements
    const currentElem = document.getElementById('current-assessments-count');
    const completedElem = document.getElementById('completed-assessments-count');
    const averageElem = document.getElementById('overall-average');
    
    console.log('🔍 DOM elements found:', {
        currentElem: currentElem?.id || 'NOT FOUND',
        completedElem: completedElem?.id || 'NOT FOUND',
        averageElem: averageElem?.id || 'NOT FOUND'
    });
    
    // Update counts
    if (currentElem) currentElem.textContent = current;
    if (completedElem) completedElem.textContent = completed;
    if (averageElem) averageElem.textContent = average;
}

// Filter assessments based on selection
function filterAssessments(filterType) {
    console.log('🔍 Filtering assessments by:', filterType);
    currentFilter = filterType;
    
    // Get section elements
    const currentSection = document.querySelector('.current-section');
    const completedSection = document.querySelector('.completed-section');
    
    console.log('🔍 Sections found:', {
        currentSection: !!currentSection,
        completedSection: !!completedSection
    });
    
    // Show/hide sections based on filter
    if (filterType === 'current') {
        // Show only current section
        if (currentSection) currentSection.style.display = 'block';
        if (completedSection) completedSection.style.display = 'none';
        console.log('✅ Showing current section, hiding completed');
    } else if (filterType === 'completed') {
        // Show only completed section
        if (currentSection) currentSection.style.display = 'none';
        if (completedSection) completedSection.style.display = 'block';
        console.log('✅ Showing completed section, hiding current');
    } else {
        // Show both sections
        if (currentSection) currentSection.style.display = 'block';
        if (completedSection) completedSection.style.display = 'block';
        console.log('✅ Showing both sections');
    }
    
    // Update button states
    const buttons = document.querySelectorAll('.quick-actions .action-btn');
    console.log(`🔍 Found ${buttons.length} action buttons`);
    
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
    
    console.log('🔍 Button to activate:', activeBtn?.id);
    
    if (activeBtn) {
        activeBtn.classList.add('active');
        console.log(`✅ Activated button: ${activeBtn.id}`);
    } else {
        console.error('❌ Could not find button for filter:', filterType);
    }
    
    // Reload assessments with new filter
    console.log('🔄 Loading assessments with filter:', currentFilter);
    loadAssessments();
}

// Switch to current assessments
function switchToCurrentAssessments() {
    filterAssessments('current');
    // Scroll to current section only if visible
    const currentSection = document.querySelector('.current-section');
    if (currentSection && currentSection.style.display !== 'none') {
        currentSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// Switch to completed assessments
function switchToCompletedAssessments() {
    filterAssessments('completed');
    // Scroll to completed section only if visible
    const completedSection = document.querySelector('.completed-section');
    if (completedSection && completedSection.style.display !== 'none') {
        completedSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// View transcript (placeholder function)
function viewTranscript() {
    console.log('📄 View transcript clicked');
    if (window.AppUtils && window.AppUtils.showToast) {
        AppUtils.showToast('Transcript feature coming soon!', 'info');
    }
    // In real app, this would open a modal or navigate to transcript page
}

// Refresh assessments
function refreshAssessments() {
    console.log('🔄 Refreshing assessments...');
    loadAssessments();
    if (window.AppUtils && window.AppUtils.showToast) {
        AppUtils.showToast('Assessments refreshed successfully', 'success');
    }
}

// Show loading state
function showAssessmentsLoadingState(section) {
    console.log(`⏳ Showing loading state for: ${section}`);
    
    if (section === 'current') {
        const tableBody = document.getElementById('current-assessments-table');
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
        const tableBody = document.getElementById('completed-assessments-table');
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
function showAssessmentsEmptyState(section) {
    console.log(`📭 Showing empty state for: ${section}, filter: ${currentFilter}`);
    
    if (section === 'current') {
        const emptyState = document.getElementById('current-empty');
        const tableBody = document.getElementById('current-assessments-table');
        
        if (emptyState) {
            emptyState.style.display = 'block';
        }
        if (tableBody) tableBody.innerHTML = '';
        
    } else if (section === 'completed') {
        const emptyState = document.getElementById('completed-empty');
        const tableBody = document.getElementById('completed-assessments-table');
        
        if (emptyState) {
            emptyState.style.display = 'block';
        }
        if (tableBody) tableBody.innerHTML = '';
    }
}

// Hide empty state
function hideAssessmentsEmptyState(section) {
    console.log(`👁️ Hiding empty state for: ${section}`);
    
    if (section === 'current') {
        const emptyState = document.getElementById('current-empty');
        if (emptyState) {
            emptyState.style.display = 'none';
        }
    } else if (section === 'completed') {
        const emptyState = document.getElementById('completed-empty');
        if (emptyState) {
            emptyState.style.display = 'none';
        }
    }
}

// Show error state
function showAssessmentsErrorState(section, message) {
    if (section === 'current') {
        const tableBody = document.getElementById('current-assessments-table');
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
        const tableBody = document.getElementById('completed-assessments-table');
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

// Helper function to truncate text
function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Utility to safely escape HTML
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// *************************************************************************
// *** INITIALIZATION ***
// *************************************************************************

// Initialize assessments module
function initializeAssessmentsModule() {
    console.log('📚 Initializing Assessments Module...');
    
    // Set up event listeners for assessments tab
    const assessmentsTab = document.querySelector('.nav a[data-tab="cats"]');
    console.log('🔍 Assessments tab element:', assessmentsTab);
    
    if (assessmentsTab) {
        assessmentsTab.addEventListener('click', () => {
            console.log('📚 Assessments tab clicked');
            
            if (getCurrentUserId()) {
                console.log('✅ User is logged in, loading assessments...');
                loadAssessments();
            } else {
                console.log('⚠️ No user ID, waiting for login...');
            }
        });
    } else {
        console.error('❌ Assessments tab not found! Check HTML structure.');
    }
    
    // Set up quick action buttons
    const viewAllBtn = document.getElementById('view-all-assessments');
    const viewCurrentBtn = document.getElementById('view-current-only');
    const viewCompletedBtn = document.getElementById('view-completed-only');
    const viewTranscriptBtn = document.getElementById('view-transcript');
    const refreshBtn = document.getElementById('refresh-assessments');
    
    console.log('🔍 Action buttons:', {
        viewAllBtn: viewAllBtn?.id,
        viewCurrentBtn: viewCurrentBtn?.id,
        viewCompletedBtn: viewCompletedBtn?.id,
        viewTranscriptBtn: viewTranscriptBtn?.id,
        refreshBtn: refreshBtn?.id
    });
    
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', () => {
            console.log('🔄 View All button clicked');
            filterAssessments('all');
        });
        viewAllBtn.classList.add('active'); // Default active
    }
    
    if (viewCurrentBtn) {
        viewCurrentBtn.addEventListener('click', () => {
            console.log('🔄 Current Only button clicked');
            filterAssessments('current');
        });
    }
    
    if (viewCompletedBtn) {
        viewCompletedBtn.addEventListener('click', () => {
            console.log('🔄 Completed Only button clicked');
            filterAssessments('completed');
        });
    }
    
    if (viewTranscriptBtn) {
        viewTranscriptBtn.addEventListener('click', viewTranscript);
    }
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            console.log('🔄 Refresh button clicked');
            refreshAssessments();
        });
    }
    
    // Set up empty state buttons
    const emptyViewCurrentBtn = document.querySelector('#completed-empty .btn');
    if (emptyViewCurrentBtn) {
        emptyViewCurrentBtn.addEventListener('click', switchToCurrentAssessments);
    }
    
    console.log('✅ Assessments Module initialized');
    
    // Try to load assessments immediately if user is logged in
    setTimeout(() => {
        if (getCurrentUserId()) {
            console.log('👤 User already logged in, loading assessments immediately...');
            loadAssessments();
        } else {
            console.log('⏳ Waiting for user login...');
        }
    }, 1000);
}

// *************************************************************************
// *** GLOBAL EXPORTS ***
// *************************************************************************

// Make functions globally available
window.loadAssessments = loadAssessments;
window.refreshAssessments = refreshAssessments;
window.switchToCurrentAssessments = switchToCurrentAssessments;
window.switchToCompletedAssessments = switchToCompletedAssessments;
window.viewTranscript = viewTranscript;
window.filterAssessments = filterAssessments;
window.initializeAssessmentsModule = initializeAssessmentsModule;

// Keep original functions for backward compatibility
window.loadExams = loadAssessments;
window.initExamsModule = initializeAssessmentsModule;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAssessmentsModule);
} else {
    initializeAssessmentsModule();
}
