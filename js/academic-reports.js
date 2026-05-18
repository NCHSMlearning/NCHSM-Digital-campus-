// js/academic-reports.js - SMART FILTERING (KRCHN Blocks / TVET Semesters)
(function() {
    'use strict';
    
    console.log('📊 Academic Reports Module Loading...');
    
    // TVET Program Codes (same as exams.js)
    const TVET_PROGRAMS = [
        'DPOTT', 'DCH', 'DHRIT', 'DSL', 'DSW', 'DCJS', 'DHSS', 'DICT', 'DME',
        'CPOTT', 'CCH', 'CHRIT', 'CPC', 'CSL', 'CSW', 'CCJS', 'CAG', 'CHSS', 'CICT',
        'ACH', 'AAG', 'ASW', 'CCA', 'PTE'
    ];
    
    // DOM Elements
    const elements = {
        semesterGpa: document.getElementById('semester-gpa'),
        semesterGrade: document.getElementById('semester-grade'),
        cumulativeGpa: document.getElementById('cumulative-gpa'),
        cumulativeGrade: document.getElementById('cumulative-grade'),
        totalCreditsEarned: document.getElementById('total-credits-earned'),
        classRank: document.getElementById('class-rank'),
        gradesTableBody: document.getElementById('grades-table-body'),
        yearGpa: document.getElementById('year-gpa'),
        yearCredits: document.getElementById('year-credits'),
        yearCourses: document.getElementById('year-courses'),
        yearAwards: document.getElementById('year-awards'),
        studentNameDisplay: document.getElementById('student-name-display'),
        programDisplay: document.getElementById('program-display'),
        studentIdDisplay: document.getElementById('student-id-display'),
        transcriptTableBody: document.getElementById('transcript-table-body'),
        totalAttempted: document.getElementById('total-attempted'),
        totalEarned: document.getElementById('total-earned'),
        transcriptCgpa: document.getElementById('transcript-cgpa'),
        completedCoursesProgress: document.getElementById('completed-courses-progress'),
        totalCoursesProgress: document.getElementById('total-courses-progress'),
        courseProgressList: document.getElementById('course-progress-list'),
        filterSelect: document.getElementById('block-filter-select'),
        programTypeIndicator: document.getElementById('program-type-indicator')
    };
    
    let gradeChart = null;
    let currentFilter = 'all';
    let currentData = {
        grades: [],
        totalGpa: 0,
        completedCount: 0,
        totalCredits: 0,
        programType: 'KRCHN', // 'KRCHN' or 'TVET'
        blockTerm: null,
        filterOptions: []
    };
    
    // Determine program type (same logic as exams.js)
    function determineProgramType() {
        const profile = window.currentUserProfile || {};
        const programCode = (profile.program || profile.course || 'KRCHN').toUpperCase().trim();
        
        if (TVET_PROGRAMS.includes(programCode)) {
            let level = 'CERTIFICATE';
            if (programCode.startsWith('D')) level = 'DIPLOMA';
            if (programCode.startsWith('A')) level = 'ARTISAN';
            return { type: 'TVET', level: level, code: programCode };
        }
        
        return { type: 'KRCHN', level: 'KRCHN', code: 'KRCHN' };
    }
    
    // Get block/term from user profile
    function getUserBlockTerm() {
        const profile = window.currentUserProfile || {};
        const programInfo = determineProgramType();
        
        if (programInfo.type === 'TVET') {
            return profile.term || profile.block || 'Term 1';
        } else {
            return profile.block || 'Introductory Block';
        }
    }
    
    // Generate filter options based on program type
    function generateFilterOptions() {
        const programInfo = determineProgramType();
        const userBlockTerm = getUserBlockTerm();
        
        if (programInfo.type === 'TVET') {
            // TVET Semester-based options
            return [
                { value: 'all', label: '📚 All Semesters' },
                { value: 'Term1', label: '📘 Term 1 / Semester 1' },
                { value: 'Term2', label: '📗 Term 2 / Semester 2' },
                { value: 'Term3', label: '📙 Term 3 / Semester 3' },
                { value: 'Term4', label: '📕 Term 4 / Semester 4' },
                { value: 'Term5', label: '📔 Term 5 / Semester 5' },
                { value: 'Term6', label: '📓 Term 6 / Semester 6' }
            ];
        } else {
            // KRCHN Block-based options
            const blocks = [
                { value: 'all', label: '📚 All Blocks' },
                { value: 'Introductory Block', label: '🎓 Introductory Block' },
                { value: 'Block 1', label: '📖 Block 1' },
                { value: 'Block 2', label: '📗 Block 2' },
                { value: 'Block 3', label: '📘 Block 3' },
                { value: 'Block 4', label: '📙 Block 4' },
                { value: 'Block 5', label: '📕 Block 5' },
                { value: 'Final Block', label: '🏆 Final Block' }
            ];
            
            // Mark current block
            return blocks.map(block => ({
                ...block,
                isCurrent: block.value !== 'all' && block.value === userBlockTerm
            }));
        }
    }
    
    // Populate filter dropdown
    function populateFilterDropdown() {
        if (!elements.filterSelect) {
            // Create filter dropdown if it doesn't exist
            createFilterDropdown();
            return;
        }
        
        const programInfo = determineProgramType();
        const options = generateFilterOptions();
        
        // Update program type indicator
        if (elements.programTypeIndicator) {
            elements.programTypeIndicator.innerHTML = `
                <span class="program-badge ${programInfo.type === 'TVET' ? 'tvet-badge' : 'krchn-badge'}">
                    <i class="fas ${programInfo.type === 'TVET' ? 'fa-tools' : 'fa-graduation-cap'}"></i>
                    ${programInfo.type === 'TVET' ? 'TVET Program' : 'KRCHN Nursing'}
                    ${programInfo.type === 'TVET' ? ` - ${programInfo.level}` : ''}
                </span>
                <span class="current-block-badge">
                    <i class="fas fa-location-dot"></i>
                    Current: ${programInfo.type === 'TVET' ? getUserBlockTerm() : getUserBlockTerm()}
                </span>
            `;
        }
        
        // Populate select options
        elements.filterSelect.innerHTML = options.map(opt => 
            `<option value="${opt.value}" ${opt.isCurrent ? 'selected' : ''}>${opt.label}</option>`
        ).join('');
        
        // Set current filter to user's current block/term
        const userBlockTerm = getUserBlockTerm();
        if (userBlockTerm && options.some(opt => opt.value === userBlockTerm)) {
            currentFilter = userBlockTerm;
            if (elements.filterSelect) elements.filterSelect.value = userBlockTerm;
        }
        
        console.log(`📋 Filter dropdown populated for ${programInfo.type} with ${options.length} options`);
    }
    
    // Create filter dropdown if missing
    function createFilterDropdown() {
        const reportFilter = document.querySelector('.report-filter');
        if (!reportFilter) return;
        
        const filterGroup = document.createElement('div');
        filterGroup.className = 'filter-group';
        filterGroup.innerHTML = `
            <label><i class="fas fa-filter"></i> Filter by Block/Semester:</label>
            <select id="block-filter-select" class="modern-select">
                <option value="all">Loading...</option>
            </select>
        `;
        
        reportFilter.insertBefore(filterGroup, reportFilter.firstChild);
        elements.filterSelect = document.getElementById('block-filter-select');
    }
    
    // Helper functions
    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }
    
    function calculateLetterGrade(percentage) {
        if (percentage >= 85) return 'A';
        if (percentage >= 75) return 'B+';
        if (percentage >= 70) return 'B';
        if (percentage >= 65) return 'C+';
        if (percentage >= 60) return 'C';
        if (percentage >= 50) return 'D';
        return 'F';
    }
    
    function calculateGPAFromLetter(grade) {
        const points = { 'A': 4.0, 'B+': 3.5, 'B': 3.0, 'C+': 2.5, 'C': 2.0, 'D': 1.0, 'F': 0.0 };
        return points[grade] || 0;
    }
    
    // Load student info
    function loadStudentInfo() {
        const profile = window.currentUserProfile || {};
        const studentName = profile.full_name || profile.name || 'Student Name';
        const program = profile.program || profile.department || 'KRCHN Nursing';
        const studentId = profile.student_id || profile.id || 'N/A';
        
        if (elements.studentNameDisplay) elements.studentNameDisplay.textContent = studentName;
        if (elements.programDisplay) elements.programDisplay.textContent = program;
        if (elements.studentIdDisplay) elements.studentIdDisplay.textContent = studentId;
    }
    
    // Load grades from exams module with block/semester filtering
    async function loadGradesFromExams() {
        console.log('📚 Loading grades from exams module...');
        
        // Wait for exams module
        if (window.examsModule) {
            if (!window.examsModule.allExams || window.examsModule.allExams.length === 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            const examsData = window.examsModule.allExams || [];
            const programInfo = determineProgramType();
            const userBlockTerm = getUserBlockTerm();
            
            console.log(`Found ${examsData.length} exams, Program: ${programInfo.type}, Filter: ${currentFilter}`);
            
            // Filter exams by selected block/term
            let filteredExams = examsData;
            if (currentFilter !== 'all') {
                filteredExams = examsData.filter(exam => {
                    const examBlockTerm = exam.block_term || exam.block || exam.term;
                    return examBlockTerm === currentFilter;
                });
            }
            
            // Process grades
            const processedGrades = [];
            let totalPercentageSum = 0;
            let gradedCount = 0;
            let totalCreditsEarned = 0;
            
            filteredExams.forEach(exam => {
                if (exam.isCompleted && exam.isReleased && exam.totalPercentage !== null) {
                    const grade = calculateLetterGrade(exam.totalPercentage);
                    const gpa = calculateGPAFromLetter(grade);
                    const credits = 3;
                    
                    processedGrades.push({
                        courseCode: exam.unit_code || exam.course_code || exam.id?.toString().substring(0, 8)
 || 'N/A',
                        courseName: exam.exam_name || 'Course',
                        credits: credits,
                        cat1: exam.cat1Score || '--',
                        cat2: exam.cat2Score || '--',
                        final: exam.finalScore || '--',
                        total: exam.totalPercentage,
                        grade: grade,
                        gpa: gpa,
                        status: exam.totalPercentage >= 60 ? 'PASS' : 'FAIL',
                        blockTerm: exam.block_term || 'General',
                        examDate: exam.exam_date
                    });
                    
                    if (exam.totalPercentage >= 60) totalCreditsEarned += credits;
                    totalPercentageSum += exam.totalPercentage;
                    gradedCount++;
                }
            });
            
            const averagePercentage = gradedCount > 0 ? totalPercentageSum / gradedCount : 0;
            const overallGpa = gradedCount > 0 ? (totalPercentageSum / gradedCount / 25).toFixed(2) : '0.00';
            const overallGrade = calculateLetterGrade(averagePercentage);
            
            currentData = {
                grades: processedGrades,
                totalGpa: overallGpa,
                totalGrade: overallGrade,
                completedCount: gradedCount,
                totalCredits: totalCreditsEarned,
                averagePercentage: averagePercentage,
                programType: programInfo.type,
                currentFilter: currentFilter
            };
            
            console.log(`✅ Processed ${processedGrades.length} graded exams, GPA: ${overallGpa}, Filter: ${currentFilter}`);
            return processedGrades;
        }
        
        console.warn('⚠️ Exams module not available');
        return [];
    }
    
    // Display grades table
    function displayGradesTable() {
        if (!elements.gradesTableBody) return;
        
        const grades = currentData.grades;
        
        if (!grades || grades.length === 0) {
            elements.gradesTableBody.innerHTML = `<tr><td colspan="9" class="text-center">
                <div class="empty-state">
                    <i class="fas fa-chart-line"></i>
                    <p>No grades available for the selected ${currentData.programType === 'TVET' ? 'semester' : 'block'}.</p>
                    <small>Try selecting a different filter option.</small>
                </div>
            </td></td>`;
            return;
        }
        
        let html = '';
        grades.forEach(grade => {
            const statusColor = grade.status === 'PASS' ? '#10b981' : '#ef4444';
            const statusIcon = grade.status === 'PASS' ? '✓' : '✗';
            
            html += `
                <tr>
                    <td class="course-code">${escapeHtml(grade.courseCode)}</td>
                    <td class="course-name">${escapeHtml(grade.courseName)}</td>
                    <td class="text-center">${grade.credits}</td>
                    <td class="text-center">${typeof grade.cat1 === 'number' ? grade.cat1 + '%' : grade.cat1}</td>
                    <td class="text-center">${typeof grade.cat2 === 'number' ? grade.cat2 + '%' : grade.cat2}</td>
                    <td class="text-center">${typeof grade.final === 'number' ? grade.final + '%' : grade.final}</td>
                    <td class="text-center"><strong>${grade.total}%</strong></td>
                    <td class="text-center grade-cell"><span class="grade-letter">${grade.grade}</span></td>
                    <td class="text-center"><span style="color: ${statusColor}; font-weight: bold;">${statusIcon} ${grade.status}</span></td>
                </tr>
            `;
        });
        
        elements.gradesTableBody.innerHTML = html;
    }
    
    // Update GPA summary
    function updateGpaSummary() {
        if (elements.semesterGpa) elements.semesterGpa.textContent = currentData.totalGpa;
        if (elements.semesterGrade) elements.semesterGrade.textContent = currentData.totalGrade || '--';
        if (elements.cumulativeGpa) elements.cumulativeGpa.textContent = currentData.totalGpa;
        if (elements.cumulativeGrade) elements.cumulativeGrade.textContent = currentData.totalGrade || '--';
        if (elements.totalCreditsEarned) elements.totalCreditsEarned.textContent = currentData.totalCredits;
        if (elements.classRank) elements.classRank.textContent = 'N/A';
        
        // Update filter info text
        const filterInfo = document.getElementById('current-filter-info');
        if (filterInfo) {
            const filterDisplay = currentFilter === 'all' ? 'All' : currentFilter;
            filterInfo.textContent = `${currentData.programType === 'TVET' ? 'Semester' : 'Block'}: ${filterDisplay}`;
        }
    }
    
    // Load transcript
    function loadTranscript() {
        if (!elements.transcriptTableBody) return;
        
        const grades = currentData.grades;
        
        if (grades.length === 0) {
            elements.transcriptTableBody.innerHTML = '<tr><td colspan="6" class="text-center">No transcript data available</td></tr>';
            return;
        }
        
        let html = '';
        let totalAttempted = 0;
        let totalEarned = 0;
        let totalPoints = 0;
        
        grades.forEach(grade => {
            const gradePoints = calculateGPAFromLetter(grade.grade);
            const isPassed = grade.status === 'PASS';
            
            html += `
                <tr>
                    <td>${escapeHtml(grade.blockTerm || 'Current')}</td>
                    <td>${escapeHtml(grade.courseCode)}</td>
                    <td>${escapeHtml(grade.courseName)}</td>
                    <td class="text-center">${grade.credits}</td>
                    <td class="text-center">${grade.grade}</td>
                    <td class="text-center">${(gradePoints * grade.credits).toFixed(1)}</td>
                </tr>
            `;
            
            totalAttempted += grade.credits;
            if (isPassed) totalEarned += grade.credits;
            totalPoints += gradePoints * grade.credits;
        });
        
        elements.transcriptTableBody.innerHTML = html;
        
        const totalCredits = grades.reduce((sum, g) => sum + g.credits, 0);
        const cumulativeGpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';
        
        if (elements.totalAttempted) elements.totalAttempted.textContent = totalAttempted;
        if (elements.totalEarned) elements.totalEarned.textContent = totalEarned;
        if (elements.transcriptCgpa) elements.transcriptCgpa.textContent = cumulativeGpa;
    }
    
    // Load course progress
    function loadCourseProgress() {
        if (!elements.courseProgressList) return;
        
        const grades = currentData.grades;
        
        if (grades.length === 0) {
            elements.courseProgressList.innerHTML = '<div class="no-data">No course progress data available</div>';
            return;
        }
        
        let html = '';
        let completedCount = 0;
        
        grades.forEach(course => {
            const percentage = course.total;
            const isCompleted = percentage >= 60;
            if (isCompleted) completedCount++;
            
            let barColor = percentage >= 75 ? '#10b981' : (percentage >= 60 ? '#f59e0b' : '#ef4444');
            
            html += `
                <div class="progress-item">
                    <div class="progress-header">
                        <span class="course-name">${escapeHtml(course.courseName)}</span>
                        <span class="progress-percent">${percentage}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${percentage}%; background: ${barColor};"></div>
                    </div>
                    <div class="progress-status">${isCompleted ? '✅ Completed' : '❌ In Progress'}</div>
                </div>
            `;
        });
        
        elements.courseProgressList.innerHTML = html;
        
        const totalCourses = grades.length;
        if (elements.completedCoursesProgress) elements.completedCoursesProgress.textContent = completedCount;
        if (elements.totalCoursesProgress) elements.totalCoursesProgress.textContent = totalCourses;
    }
    
    // Create chart
    function createGradeChart() {
        const canvas = document.getElementById('grade-distribution-chart');
        if (!canvas) return;
        
        const grades = currentData.grades;
        const gradeCounts = { 'A': 0, 'B+': 0, 'B': 0, 'C+': 0, 'C': 0, 'D': 0, 'F': 0 };
        
        grades.forEach(grade => {
            if (gradeCounts[grade.grade] !== undefined) gradeCounts[grade.grade]++;
        });
        
        const labels = Object.keys(gradeCounts);
        const data = Object.values(gradeCounts);
        
        if (gradeChart) gradeChart.destroy();
        
        if (typeof Chart !== 'undefined') {
            gradeChart = new Chart(canvas, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Number of Courses',
                        data: data,
                        backgroundColor: 'rgba(79, 70, 229, 0.7)',
                        borderColor: '#4f46e5',
                        borderWidth: 1,
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { position: 'top' },
                        tooltip: { callbacks: { label: (ctx) => `${ctx.raw} courses` } }
                    },
                    scales: {
                        y: { beginAtZero: true, title: { display: true, text: 'Number of Courses' } },
                        x: { title: { display: true, text: 'Grade' } }
                    }
                }
            });
        }
    }
    
    // Setup event listeners
    function setupEventListeners() {
        // Filter change
        if (elements.filterSelect) {
            elements.filterSelect.addEventListener('change', (e) => {
                currentFilter = e.target.value;
                console.log(`Filter changed to: ${currentFilter}`);
                loadAcademicReports();
            });
        }
        
        // Refresh button
        const refreshBtn = document.getElementById('refresh-report');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => loadAcademicReports());
        }
        
        // Download button
        const downloadBtn = document.getElementById('download-transcript-pdf');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => alert('PDF download coming soon!'));
        }
        
        // Print button
        const printBtn = document.getElementById('print-report');
        if (printBtn) {
            printBtn.addEventListener('click', () => window.print());
        }
    }
    
    // Setup report tabs
    function setupReportTabs() {
        const tabs = document.querySelectorAll('.report-tab');
        const contents = {
            'semester': document.getElementById('semester-report'),
            'yearly': document.getElementById('yearly-report'),
            'transcript': document.getElementById('transcript-report'),
            'progress': document.getElementById('progress-report')
        };
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const reportType = tab.getAttribute('data-report');
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                Object.values(contents).forEach(content => {
                    if (content) content.style.display = 'none';
                });
                if (contents[reportType]) contents[reportType].style.display = 'block';
            });
        });
    }
    
    // Main load function
    async function loadAcademicReports() {
        console.log('🚀 Loading Academic Reports...');
        
        try {
            if (elements.gradesTableBody) {
                elements.gradesTableBody.innerHTML = '<tr><td colspan="9"><div class="loading-spinner"></div> Loading grades...</td></tr>';
            }
            
            loadStudentInfo();
            populateFilterDropdown();
            await loadGradesFromExams();
            
            displayGradesTable();
            updateGpaSummary();
            loadTranscript();
            loadCourseProgress();
            createGradeChart();
            
            console.log(`✅ Academic Reports loaded: ${currentData.grades.length} grades, Filter: ${currentFilter}`);
            
        } catch (error) {
            console.error('❌ Error:', error);
            if (elements.gradesTableBody) {
                elements.gradesTableBody.innerHTML = '<tr><td colspan="9" class="text-center error">Error loading grades. Please refresh.</td></tr>';
            }
        }
    }
    
    // Initialize
    function init() {
        console.log('🔧 Initializing Academic Reports Module...');
        
        setupReportTabs();
        setupEventListeners();
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => setTimeout(loadAcademicReports, 500));
        } else {
            setTimeout(loadAcademicReports, 500);
        }
        
        document.addEventListener('examsModuleReady', () => loadAcademicReports());
        document.addEventListener('appReady', () => setTimeout(loadAcademicReports, 500));
    }
    
    // Expose module
    window.academicReportsModule = {
        init: init,
        loadReports: loadAcademicReports,
        refresh: loadAcademicReports,
        setFilter: (filter) => { currentFilter = filter; loadAcademicReports(); }
    };
    
    init();
    
    console.log('✅ Academic Reports Module Ready - Smart filtering (KRCHN Blocks / TVET Semesters)');
})();
