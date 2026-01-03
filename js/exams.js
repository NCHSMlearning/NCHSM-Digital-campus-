// js/exams.js - Exams Management for NCHSM Digital Student Dashboard (Updated for new UI)
// *************************************************************************
// *** EXAMS MANAGEMENT SYSTEM ***
// *************************************************************************

// Helper functions (same as courses.js)
function getSupabaseClient() {
    const client = window.db?.supabase;
    if (!client || typeof client.from !== 'function') {
        console.error('❌ No valid Supabase client available');
        return null;
    }
    return client;
}

function getUserProfile() {
    return window.db?.currentUserProfile || 
           window.currentUserProfile || 
           window.userProfile || 
           {};
}

function getCurrentUserId() {
    return window.db?.currentUserId || window.currentUserId;
}

let cachedExams = [];
let currentFilter = 'all';

// Load all exams and grades for the current student
async function loadAllExams() {
    const userProfile = getUserProfile();
    const userId = getCurrentUserId();
    
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
        console.log('📚 Loading exams with:', {
            program,
            block,
            intakeYear,
            userId
        });

        // 1. Fetch exams for the student's program and intake year
        const { data: exams, error: examsError } = await supabaseClient
            .from('exams_with_courses')
            .select('*')
            .or(`program_type.eq.${program},program_type.eq.General`)
            .or(`block_term.eq.${block},block_term.is.null,block_term.eq.General`)
            .eq('intake_year', intakeYear)
            .order('exam_date', { ascending: true });

        if (examsError) throw examsError;

        // 2. Fetch grades for the student
        const { data: grades, error: gradesError } = await supabaseClient
            .from('exam_grades')
            .select('*')
            .eq('student_id', userId)
            .eq('question_id', '00000000-0000-0000-0000-000000000000')
            .order('graded_at', { ascending: false });

        if (gradesError) throw gradesError;

        // Combine exams with grades
        const combinedExams = (exams || []).map(exam => {
            const grade = (grades || []).find(g => String(g.exam_id) === String(exam.id));
            const examType = exam.exam_type || '';
            
            let calculatedPercentage = null;
            let displayStatus = 'Scheduled';
            
            if (grade) {
                // Calculate percentage
                if (grade.total_score !== null && grade.total_score !== undefined) {
                    calculatedPercentage = Number(grade.total_score);
                } else if (examType.includes('CAT_1') && grade.cat_1_score !== null) {
                    calculatedPercentage = (grade.cat_1_score / 30) * 100;
                } else if (examType.includes('CAT_2') && grade.cat_2_score !== null) {
                    calculatedPercentage = (grade.cat_2_score / 30) * 100;
                }
                
                displayStatus = calculatedPercentage !== null 
                    ? (calculatedPercentage >= 60 ? 'PASS' : 'FAIL')
                    : (grade.result_status || 'Graded');
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

        return combinedExams;
        
    } catch (error) {
        console.error("❌ Failed to load exams:", error);
        return [];
    }
}

// Load and display exams based on filter
async function loadExams() {
    console.log('📚 loadExams called with filter:', currentFilter);
    
    // Show loading states
    showLoadingState('current');
    showLoadingState('completed');
    
    try {
        // Load all exams
        cachedExams = await loadAllExams();
        console.log(`✅ Loaded ${cachedExams.length} total exams`);
        
        if (cachedExams.length === 0) {
            console.log('⚠️ No exams found');
            showEmptyState('current');
            showEmptyState('completed');
            updateHeaderStats(0, 0);
            return;
        }
        
        // Split exams into current and completed
        const currentAssessments = cachedExams.filter(exam => exam.assessment_status === 'current');
        const completedAssessments = cachedExams.filter(exam => exam.assessment_status === 'completed');
        
        console.log(`📊 Split: ${currentAssessments.length} current, ${completedAssessments.length} completed`);
        
        // Update header stats
        updateHeaderStats(currentAssessments.length, completedAssessments.length);
        
        // Apply filter if needed
        let filteredCurrent = currentAssessments;
        let filteredCompleted = completedAssessments;
        
        if (currentFilter === 'current') {
            filteredCompleted = [];
        } else if (currentFilter === 'completed') {
            filteredCurrent = [];
        }
        
        // Display exams
        console.log('🎨 Displaying current assessments:', filteredCurrent.length);
        if (filteredCurrent.length > 0) {
            displayCurrentAssessments(filteredCurrent);
            hideEmptyState('current');
        } else {
            showEmptyState('current');
        }
        
        console.log('🎨 Displaying completed assessments:', filteredCompleted.length);
        if (filteredCompleted.length > 0) {
            displayCompletedAssessments(filteredCompleted);
            hideEmptyState('completed');
            calculatePerformanceSummary(filteredCompleted);
        } else {
            showEmptyState('completed');
        }
        
    } catch (error) {
        console.error('❌ Error in loadExams:', error);
        showErrorState('current', 'Failed to load assessments');
        showErrorState('completed', 'Failed to load assessments');
    }
}

// Display current assessments in table format
function displayCurrentAssessments(assessments) {
    const tableBody = document.getElementById('current-assessments-table');
    const emptyState = document.getElementById('current-empty');
    
    if (!tableBody) {
        console.error('❌ current-assessments-table element not found');
        return;
    }
    
    if (assessments.length === 0) {
        tableBody.innerHTML = '';
        showEmptyState('current');
        const countElement = document.getElementById('current-count');
        if (countElement) countElement.textContent = '0 pending';
        return;
    }
    
    // Update count
    const countElement = document.getElementById('current-count');
    if (countElement) {
        countElement.textContent = `${assessments.length} pending`;
    }
    
    // Clear loading/empty states
    if (emptyState) emptyState.style.display = 'none';
    
    // Generate table rows
    tableBody.innerHTML = assessments.map(exam => {
        const dateStr = exam.exam_date
            ? new Date(exam.exam_date).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            })
            : '--';
        
        const examType = exam.exam_type || 'EXAM';
        
        // Add exam type indicator
        let typeBadge = '';
        if (examType.includes('CAT')) {
            typeBadge = `<span class="type-badge cat">CAT</span>`;
        } else {
            typeBadge = `<span class="type-badge exam">Exam</span>`;
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
        
        if (exam.grade) {
            cat1Score = formatScore(exam.grade.cat_1_score);
            cat2Score = formatScore(exam.grade.cat_2_score);
            finalExamScore = formatScore(exam.grade.exam_score);
            
            if (exam.calculated_percentage !== null) {
                totalScore = `${exam.calculated_percentage.toFixed(1)}%`;
            } else if (exam.grade.total_score !== null) {
                totalScore = `${exam.grade.total_score.toFixed(1)}%`;
            } else {
                totalScore = '--';
            }
        }
        
        return `
            <tr>
                <td>${escapeHtml(exam.exam_name || 'N/A')}</td>
                <td>${typeBadge}</td>
                <td>${escapeHtml(exam.course_name || 'General')}</td>
                <td class="text-center">${escapeHtml(exam.block_term || 'General')}</td>
                <td>${dateStr}</td>
                <td><span class="status-badge ${statusClass}">${statusDisplay}</span></td>
                <td class="text-center">${cat1Score}</td>
                <td class="text-center">${cat2Score}</td>
                <td class="text-center">${finalExamScore}</td>
                <td class="text-center"><strong>${totalScore}</strong></td>
            </tr>
        `;
    }).join('');
}

// Display completed assessments in table format
function displayCompletedAssessments(assessments) {
    const tableBody = document.getElementById('completed-assessments-table');
    const emptyState = document.getElementById('completed-empty');
    
    if (!tableBody) {
        console.error('❌ completed-assessments-table element not found');
        return;
    }
    
    if (assessments.length === 0) {
        tableBody.innerHTML = '';
        showEmptyState('completed');
        
        const countElement = document.getElementById('completed-count');
        const averageElement = document.getElementById('completed-average');
        
        if (countElement) countElement.textContent = '0 graded';
        if (averageElement) averageElement.textContent = 'Average: --';
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
    const countElement = document.getElementById('completed-count');
    const averageElement = document.getElementById('completed-average');
    
    if (countElement) countElement.textContent = `${assessments.length} graded`;
    if (averageElement) averageElement.textContent = `Average: ${averageScore}`;
    
    // Clear loading/empty states
    if (emptyState) emptyState.style.display = 'none';
    
    // Generate table rows
    tableBody.innerHTML = assessments.map(exam => {
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
        
        const examType = exam.exam_type || 'EXAM';
        
        // Add exam type indicator
        let typeBadge = '';
        if (examType.includes('CAT')) {
            typeBadge = `<span class="type-badge cat">CAT</span>`;
        } else {
            typeBadge = `<span class="type-badge exam">Exam</span>`;
        }
        
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
        
        if (exam.grade) {
            cat1Score = formatScore(exam.grade.cat_1_score);
            cat2Score = formatScore(exam.grade.cat_2_score);
            finalExamScore = formatScore(exam.grade.exam_score);
            
            if (exam.calculated_percentage !== null) {
                totalScore = `${exam.calculated_percentage.toFixed(1)}%`;
            } else if (exam.grade.total_score !== null) {
                totalScore = `${exam.grade.total_score.toFixed(1)}%`;
            } else {
                totalScore = '--';
            }
        }
        
        // Calculate grade based on percentage using the 85/70/60 scale
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
        
        // Grade badge
        const gradeBadge = grade !== '--' ? 
            `<span class="grade-badge ${gradeClass}">${grade}</span>` : '--';
        
        return `
            <tr>
                <td>${escapeHtml(exam.exam_name || 'N/A')}</td>
                <td>${typeBadge}</td>
                <td>${escapeHtml(exam.course_name || 'General')}</td>
                <td class="text-center">${escapeHtml(exam.block_term || 'General')}</td>
                <td>${gradedDate}</td>
                <td><span class="status-badge ${statusClass}">${statusDisplay}</span></td>
                <td class="text-center">${cat1Score}</td>
                <td class="text-center">${cat2Score}</td>
                <td class="text-center">${finalExamScore}</td>
                <td class="text-center"><strong>${totalScore}</strong></td>
                <td class="text-center">${gradeBadge}</td>
            </tr>
        `;
    }).join('');
}

// Calculate performance summary
function calculatePerformanceSummary(assessments) {
    const scoredAssessments = assessments.filter(a => a.calculated_percentage !== null);
    
    if (scoredAssessments.length === 0) {
        // Reset all summary values
        const elements = [
            'best-score', 'lowest-score', 'pass-rate',
            'distinction-count', 'credit-count', 'pass-count', 'fail-count',
            'first-assessment-date', 'latest-assessment-date', 'total-submitted'
        ];
        
        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.textContent = '--';
        });
        
        // Reset distribution bars
        ['distinction-bar', 'credit-bar', 'pass-bar', 'fail-bar'].forEach(id => {
            const bar = document.getElementById(id);
            if (bar) bar.style.width = '0%';
        });
        
        return;
    }
    
    // Calculate best and lowest scores
    const scores = scoredAssessments.map(a => a.calculated_percentage);
    const bestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);
    
    // Update DOM elements
    const bestScoreElement = document.getElementById('best-score');
    const lowestScoreElement = document.getElementById('lowest-score');
    
    if (bestScoreElement) bestScoreElement.textContent = `${bestScore.toFixed(1)}%`;
    if (lowestScoreElement) lowestScoreElement.textContent = `${lowestScore.toFixed(1)}%`;
    
    // Calculate pass rate (60% or higher is pass)
    const passedAssessments = scoredAssessments.filter(a => a.calculated_percentage >= 60);
    const passRate = (passedAssessments.length / scoredAssessments.length) * 100;
    
    const passRateElement = document.getElementById('pass-rate');
    if (passRateElement) passRateElement.textContent = `${passRate.toFixed(0)}%`;
    
    // Calculate grade distribution using 85/70/60 scale
    const gradeCounts = {
        distinction: scoredAssessments.filter(a => a.calculated_percentage >= 85).length,
        credit: scoredAssessments.filter(a => a.calculated_percentage >= 70 && a.calculated_percentage < 85).length,
        pass: scoredAssessments.filter(a => a.calculated_percentage >= 60 && a.calculated_percentage < 70).length,
        fail: scoredAssessments.filter(a => a.calculated_percentage < 60).length
    };
    
    // Update grade counts
    const distinctionElement = document.getElementById('distinction-count');
    const creditElement = document.getElementById('credit-count');
    const passElement = document.getElementById('pass-count');
    const failElement = document.getElementById('fail-count');
    
    if (distinctionElement) distinctionElement.textContent = gradeCounts.distinction;
    if (creditElement) creditElement.textContent = gradeCounts.credit;
    if (passElement) passElement.textContent = gradeCounts.pass;
    if (failElement) failElement.textContent = gradeCounts.fail;
    
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
        
        const firstDateElement = document.getElementById('first-assessment-date');
        const latestDateElement = document.getElementById('latest-assessment-date');
        
        if (firstDateElement) {
            firstDateElement.textContent = 
                firstDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        }
        if (latestDateElement) {
            latestDateElement.textContent = 
                latestDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        }
    }
    
    const totalSubmittedElement = document.getElementById('total-submitted');
    if (totalSubmittedElement) {
        totalSubmittedElement.textContent = scoredAssessments.length;
    }
}

// Update header statistics
function updateHeaderStats(current, completed) {
    console.log('📊 Updating header stats:', {current, completed});
    
    // Calculate average score for completed assessments
    const completedAssessments = cachedExams.filter(exam => exam.assessment_status === 'completed');
    const scoredAssessments = completedAssessments.filter(a => a.calculated_percentage !== null);
    let averageScore = '--';
    
    if (scoredAssessments.length > 0) {
        const total = scoredAssessments.reduce((sum, a) => sum + a.calculated_percentage, 0);
        averageScore = `${(total / scoredAssessments.length).toFixed(1)}%`;
    }
    
    // Update counts
    const currentHeader = document.getElementById('current-assessments-count');
    const completedHeader = document.getElementById('completed-assessments-count');
    const overallAverage = document.getElementById('overall-average');
    
    if (currentHeader) currentHeader.textContent = current;
    if (completedHeader) completedHeader.textContent = completed;
    if (overallAverage) overallAverage.textContent = averageScore;
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
        if (currentSection) currentSection.style.display = 'block';
        if (completedSection) completedSection.style.display = 'none';
        console.log('✅ Showing current section, hiding completed');
    } else if (filterType === 'completed') {
        if (currentSection) currentSection.style.display = 'none';
        if (completedSection) completedSection.style.display = 'block';
        console.log('✅ Showing completed section, hiding current');
    } else {
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
    
    // Reload exams with new filter
    console.log('🔄 Loading exams with filter:', currentFilter);
    loadExams();
}

// Switch to current assessments
function switchToCurrentAssessments() {
    filterAssessments('current');
    // Scroll to current section only if it's visible
    const currentSection = document.querySelector('.current-section');
    if (currentSection && currentSection.style.display !== 'none') {
        currentSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// Switch to completed assessments
function switchToCompletedAssessments() {
    filterAssessments('completed');
    // Scroll to completed section only if it's visible
    const completedSection = document.querySelector('.completed-section');
    if (completedSection && completedSection.style.display !== 'none') {
        completedSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// Switch to view all assessments
function switchToAllAssessments() {
    filterAssessments('all');
}

// Refresh assessments
function refreshAssessments() {
    console.log('🔄 Refreshing assessments...');
    loadExams();
    if (window.AppUtils && window.AppUtils.showToast) {
        AppUtils.showToast('Assessments refreshed successfully', 'success');
    }
}

// View transcript (placeholder)
function viewTranscript() {
    console.log('📄 View transcript clicked');
    if (window.AppUtils && window.AppUtils.showToast) {
        AppUtils.showToast('Transcript feature coming soon!', 'info');
    }
}

// Print assessments
function printAssessments() {
    console.log('🖨️ Print assessments clicked');
    
    // Create print-friendly version
    const printContent = document.getElementById('assessments-content');
    if (!printContent) {
        console.log('❌ Assessments content not found');
        return;
    }
    
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Assessments Report</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { color: #2c3e50; }
                .print-header { margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #3498db; }
                .print-info { margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th { background-color: #f8f9fa; padding: 10px; text-align: left; border: 1px solid #dee2e6; }
                td { padding: 8px; border: 1px solid #dee2e6; }
                .status-badge { padding: 4px 8px; border-radius: 4px; font-weight: bold; }
                .completed { background-color: #d4edda; color: #155724; }
                .failed { background-color: #f8d7da; color: #721c24; }
                .pending { background-color: #fff3cd; color: #856404; }
                .print-footer { margin-top: 30px; text-align: center; color: #6c757d; }
                @media print {
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="print-header">
                <h1>Academic Assessments Report</h1>
                <div class="print-info">
                    <p><strong>Student:</strong> ${getUserProfile()?.full_name || 'N/A'}</p>
                    <p><strong>Program:</strong> ${getUserProfile()?.program || 'N/A'}</p>
                    <p><strong>Intake Year:</strong> ${getUserProfile()?.intake_year || 'N/A'}</p>
                    <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                </div>
            </div>
            ${printContent.innerHTML}
            <div class="print-footer">
                <p>Generated by NCHSM Digital Campus • ${new Date().toLocaleString()}</p>
            </div>
            <script>
                window.onload = function() {
                    window.print();
                    window.onafterprint = function() {
                        window.close();
                    };
                };
            </script>
        </body>
        </html>
    `);
    
    printWindow.document.close();
}

// Show loading state
function showLoadingState(section) {
    console.log(`⏳ Showing loading state for: ${section}`);
    
    if (section === 'current') {
        const tableBody = document.getElementById('current-assessments-table');
        console.log('🔍 Current table body element:', tableBody);
        
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
        console.log('🔍 Completed table body element:', tableBody);
        
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
function showEmptyState(section) {
    console.log(`📭 Showing empty state for: ${section}, filter: ${currentFilter}`);
    
    if (section === 'current') {
        const emptyState = document.getElementById('current-empty');
        const tableBody = document.getElementById('current-assessments-table');
        
        if (emptyState) {
            emptyState.style.display = 'block';
            
            // Update message based on filter
            const emptyMessage = emptyState.querySelector('p');
            if (emptyMessage) {
                if (currentFilter === 'completed') {
                    emptyMessage.textContent = 'Current assessments are hidden. Switch to "View All" or "Current Only" to see current assessments.';
                } else {
                    emptyMessage.textContent = 'You don\'t have any current assessments at the moment.';
                }
            }
        }
        if (tableBody) tableBody.innerHTML = '';
        
    } else if (section === 'completed') {
        const emptyState = document.getElementById('completed-empty');
        const tableBody = document.getElementById('completed-assessments-table');
        
        if (emptyState) {
            emptyState.style.display = 'block';
            
            // Update message based on filter
            const emptyMessage = emptyState.querySelector('p');
            if (emptyMessage) {
                if (currentFilter === 'current') {
                    emptyMessage.textContent = 'Completed assessments are hidden. Switch to "View All" or "Completed Only" to see completed assessments.';
                } else {
                    emptyMessage.textContent = 'You haven\'t completed any assessments yet.';
                }
            }
        }
        if (tableBody) tableBody.innerHTML = '';
    }
}

// Hide empty state
function hideEmptyState(section) {
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
function showErrorState(section, message) {
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

// Initialize exams module with new UI
function initializeExamsModule() {
    console.log('📚 Initializing Exams Module with new UI...');
    
    // Set up event listeners for exams tab
    const examsTab = document.querySelector('.nav a[data-tab="cats"]');
    console.log('🔍 Exams tab element:', examsTab);
    
    if (examsTab) {
        examsTab.addEventListener('click', () => {
            console.log('📚 Exams tab clicked');
            
            if (getCurrentUserId()) {
                console.log('✅ User is logged in, loading exams...');
                loadExams();
            } else {
                console.log('⚠️ No user ID, waiting for login...');
            }
        });
    } else {
        console.error('❌ Exams tab not found! Check HTML structure.');
    }
    
    // Set up quick action buttons
    const viewAllBtn = document.getElementById('view-all-assessments');
    const viewCurrentBtn = document.getElementById('view-current-only');
    const viewCompletedBtn = document.getElementById('view-completed-only');
    const refreshBtn = document.getElementById('refresh-assessments');
    const transcriptBtn = document.getElementById('view-transcript');
    const printBtn = document.getElementById('print-assessments');
    
    console.log('🔍 Action buttons:', {
        viewAllBtn: viewAllBtn?.id,
        viewCurrentBtn: viewCurrentBtn?.id,
        viewCompletedBtn: viewCompletedBtn?.id,
        refreshBtn: refreshBtn?.id,
        transcriptBtn: transcriptBtn?.id,
        printBtn: printBtn?.id
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
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            console.log('🔄 Refresh button clicked');
            refreshAssessments();
        });
    }
    
    if (transcriptBtn) {
        transcriptBtn.addEventListener('click', () => {
            console.log('📄 Transcript button clicked');
            viewTranscript();
        });
    }
    
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            console.log('🖨️ Print button clicked');
            printAssessments();
        });
    }
    
    console.log('✅ Exams Module initialized');
    
    // Try to load exams immediately if user is logged in
    setTimeout(() => {
        if (getCurrentUserId()) {
            console.log('👤 User already logged in, loading exams immediately...');
            loadExams();
        } else {
            console.log('⏳ Waiting for user login...');
        }
    }, 1000);
}

// *************************************************************************
// *** GLOBAL EXPORTS ***
// *************************************************************************

// Make functions globally available
window.loadExams = loadExams;
window.refreshAssessments = refreshAssessments;
window.switchToCurrentAssessments = switchToCurrentAssessments;
window.switchToCompletedAssessments = switchToCompletedAssessments;
window.switchToAllAssessments = switchToAllAssessments;
window.filterAssessments = filterAssessments;
window.viewTranscript = viewTranscript;
window.printAssessments = printAssessments;
window.initializeExamsModule = initializeExamsModule;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeExamsModule);
} else {
    initializeExamsModule();
}
