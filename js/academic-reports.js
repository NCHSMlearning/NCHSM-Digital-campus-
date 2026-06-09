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
        programType: 'KRCHN',
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
            return [
                { value: 'all', label: '📚 All Semesters' },
                { value: 'Term 1', label: '📘 Term 1 / Semester 1' },
                { value: 'Term 2', label: '📗 Term 2 / Semester 2' },
                { value: 'Term 3', label: '📙 Term 3 / Semester 3' },
                { value: 'Term 4', label: '📕 Term 4 / Semester 4' },
                { value: 'Term 5', label: '📔 Term 5 / Semester 5' },
                { value: 'Term 6', label: '📓 Term 6 / Semester 6' }
            ];
        } else {
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
            
            return blocks.map(block => ({
                ...block,
                isCurrent: block.value !== 'all' && block.value === userBlockTerm
            }));
        }
    }
    
    // Populate filter dropdown
    function populateFilterDropdown() {
        if (!elements.filterSelect) {
            createFilterDropdown();
            return;
        }
        
        const programInfo = determineProgramType();
        const options = generateFilterOptions();
        
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
        
        elements.filterSelect.innerHTML = options.map(opt => 
            `<option value="${opt.value}" ${opt.isCurrent ? 'selected' : ''}>${opt.label}</option>`
        ).join('');
        
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
    
    function loadStudentInfo() {
        const profile = window.currentUserProfile || {};
        const studentName = profile.full_name || profile.name || 'Student Name';
        const program = profile.program || profile.department || 'KRCHN Nursing';
        const studentId = profile.student_id || profile.id || 'N/A';
        
        if (elements.studentNameDisplay) elements.studentNameDisplay.textContent = studentName;
        if (elements.programDisplay) elements.programDisplay.textContent = program;
        if (elements.studentIdDisplay) elements.studentIdDisplay.textContent = studentId;
    }
    
    // Generate mock grades for demo (since exams module may not be ready)
    function generateMockGrades() {
        const programInfo = determineProgramType();
        const isTvet = programInfo.type === 'TVET';
        
        const mockCourses = [
            { code: 'NRS 101', name: 'Fundamentals of Nursing', cat1: 78, cat2: 82, final: 88 },
            { code: 'NRS 102', name: 'Anatomy & Physiology', cat1: 85, cat2: 79, final: 91 },
            { code: 'NRS 103', name: 'Pharmacology Basics', cat1: 68, cat2: 72, final: 75 },
            { code: 'NRS 104', name: 'Patient Care', cat1: 92, cat2: 88, final: 94 },
            { code: 'NRS 105', name: 'Medical Ethics', cat1: 74, cat2: 70, final: 72 }
        ];
        
        const tvetCourses = [
            { code: 'ICT 101', name: 'Computer Applications', cat1: 80, cat2: 85, final: 88 },
            { code: 'ICT 102', name: 'Networking Basics', cat1: 72, cat2: 68, final: 74 },
            { code: 'ICT 103', name: 'Database Systems', cat1: 65, cat2: 70, final: 68 },
            { code: 'ICT 104', name: 'Web Development', cat1: 88, cat2: 84, final: 90 }
        ];
        
        const courses = isTvet ? tvetCourses : mockCourses;
        const blocksOrTerms = isTvet ? ['Term 1', 'Term 2'] : ['Introductory Block', 'Block 1'];
        
        const grades = [];
        courses.forEach((course, idx) => {
            const blockTerm = blocksOrTerms[idx % blocksOrTerms.length];
            const total = Math.round((course.cat1 + course.cat2 + course.final) / 3);
            const grade = calculateLetterGrade(total);
            const gpa = calculateGPAFromLetter(grade);
            const credits = 3;
            
            grades.push({
                courseCode: course.code,
                courseName: course.name,
                credits: credits,
                cat1: course.cat1,
                cat2: course.cat2,
                final: course.final,
                total: total,
                grade: grade,
                gpa: gpa,
                status: total >= 60 ? 'PASS' : 'FAIL',
                blockTerm: blockTerm,
                examDate: '2025-01-15'
            });
        });
        
        return grades;
    }
    
    async function loadGradesFromExams() {
        console.log('📚 Loading grades from exams module or mock data...');
        
        // Wait a bit for exams module
        if (window.examsModule && window.examsModule.allExams && window.examsModule.allExams.length > 0) {
            const examsData = window.examsModule.allExams;
            const programInfo = determineProgramType();
            
            let filteredExams = examsData;
            if (currentFilter !== 'all') {
                filteredExams = examsData.filter(exam => {
                    const examBlockTerm = exam.block_term || exam.block || exam.term;
                    return examBlockTerm === currentFilter;
                });
            }
            
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
                        courseCode: exam.unit_code || exam.course_code || exam.id?.toString().substring(0, 8) || 'N/A',
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
            
            if (processedGrades.length > 0) {
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
                
                console.log(`✅ Processed ${processedGrades.length} graded exams`);
                return processedGrades;
            }
        }
        
        // Use mock data if no exams available
        console.log('Using mock grade data for demo');
        const mockGrades = generateMockGrades();
        let filteredMock = mockGrades;
        
        if (currentFilter !== 'all') {
            filteredMock = mockGrades.filter(g => g.blockTerm === currentFilter);
        }
        
        let totalPoints = 0;
        let totalCreditsEarned = 0;
        filteredMock.forEach(g => {
            totalPoints += g.total;
            if (g.status === 'PASS') totalCreditsEarned += g.credits;
        });
        const avgPercent = filteredMock.length > 0 ? totalPoints / filteredMock.length : 0;
        const overallGpa = filteredMock.length > 0 ? (totalPoints / filteredMock.length / 25).toFixed(2) : '0.00';
        const overallGrade = calculateLetterGrade(avgPercent);
        
        currentData = {
            grades: filteredMock,
            totalGpa: overallGpa,
            totalGrade: overallGrade,
            completedCount: filteredMock.filter(g => g.status === 'PASS').length,
            totalCredits: totalCreditsEarned,
            averagePercentage: avgPercent,
            programType: determineProgramType().type,
            currentFilter: currentFilter
        };
        
        return filteredMock;
    }
    
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
            </td></tr>`;
            return;
        }
        
        let html = '';
        grades.forEach(grade => {
            const statusColor = grade.status === 'PASS' ? '#10b981' : '#ef4444';
            const statusIcon = grade.status === 'PASS' ? '✓' : '✗';
            const cat1Display = typeof grade.cat1 === 'number' ? grade.cat1 + '%' : (grade.cat1 || '--');
            const cat2Display = typeof grade.cat2 === 'number' ? grade.cat2 + '%' : (grade.cat2 || '--');
            const finalDisplay = typeof grade.final === 'number' ? grade.final + '%' : (grade.final || '--');
            
            html += `
                <tr>
                    <td class="course-code" style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(grade.courseCode)}</td>
                    <td class="course-name" style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(grade.courseName)}</td>
                    <td class="text-center" style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #e2e8f0;">${grade.credits}</td>
                    <td class="text-center" style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #e2e8f0;">${cat1Display}</td>
                    <td class="text-center" style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #e2e8f0;">${cat2Display}</td>
                    <td class="text-center" style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #e2e8f0;">${finalDisplay}</td>
                    <td class="text-center" style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #e2e8f0;"><strong>${grade.total}%</strong></td>
                    <td class="text-center grade-cell" style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #e2e8f0;"><span class="grade-letter" style="font-weight: bold; background: #f1f5f9; padding: 4px 10px; border-radius: 20px;">${grade.grade}</span></td>
                    <td class="text-center" style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #e2e8f0;"><span style="color: ${statusColor}; font-weight: bold;">${statusIcon} ${grade.status}</span></td>
                </tr>
            `;
        });
        
        elements.gradesTableBody.innerHTML = html;
    }
    
    function updateGpaSummary() {
        // FIX: Ensure text is visible on any background (dark text on light background)
        const gpaValue = currentData.totalGpa === '0.00' && currentData.grades.length === 0 ? '0.00' : currentData.totalGpa;
        const gradeValue = currentData.totalGrade || 'F';
        const creditsValue = currentData.totalCredits || 0;
        
        if (elements.semesterGpa) {
            elements.semesterGpa.textContent = gpaValue;
            elements.semesterGpa.style.color = '#1e293b';
            elements.semesterGpa.style.fontWeight = 'bold';
        }
        if (elements.semesterGrade) {
            elements.semesterGrade.textContent = gradeValue;
            elements.semesterGrade.style.color = '#1e293b';
        }
        if (elements.cumulativeGpa) {
            elements.cumulativeGpa.textContent = gpaValue;
            elements.cumulativeGpa.style.color = '#1e293b';
        }
        if (elements.cumulativeGrade) {
            elements.cumulativeGrade.textContent = gradeValue;
            elements.cumulativeGrade.style.color = '#1e293b';
        }
        if (elements.totalCreditsEarned) {
            elements.totalCreditsEarned.textContent = creditsValue;
            elements.totalCreditsEarned.style.color = '#1e293b';
        }
        if (elements.classRank) {
            elements.classRank.textContent = currentData.grades.length > 0 ? 'Top 15%' : 'N/A';
            elements.classRank.style.color = '#1e293b';
        }
        
        const filterInfo = document.getElementById('current-filter-info');
        if (filterInfo) {
            const filterDisplay = currentFilter === 'all' ? 'All' : currentFilter;
            filterInfo.textContent = `${currentData.programType === 'TVET' ? 'Semester' : 'Block'}: ${filterDisplay}`;
            filterInfo.style.color = '#475569';
        }
    }
    
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
                    <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(grade.blockTerm || 'Current')}</td>
                    <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(grade.courseCode)}</td>
                    <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(grade.courseName)}</td>
                    <td class="text-center" style="padding: 10px 8px; text-align: center; border-bottom: 1px solid #e2e8f0;">${grade.credits}</td>
                    <td class="text-center" style="padding: 10px 8px; text-align: center; border-bottom: 1px solid #e2e8f0;">${grade.grade}</td>
                    <td class="text-center" style="padding: 10px 8px; text-align: center; border-bottom: 1px solid #e2e8f0;">${(gradePoints * grade.credits).toFixed(1)}</td>
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
                <div class="progress-item" style="margin-bottom: 1.5rem;">
                    <div class="progress-header" style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <span class="course-name" style="font-weight: 600; color: #1e293b;">${escapeHtml(course.courseName)}</span>
                        <span class="progress-percent" style="font-weight: bold; color: #334155;">${percentage}%</span>
                    </div>
                    <div class="progress-bar" style="background: #e2e8f0; border-radius: 12px; height: 10px; overflow: hidden;">
                        <div class="progress-fill" style="width: ${percentage}%; background: ${barColor}; height: 100%; border-radius: 12px;"></div>
                    </div>
                    <div class="progress-status" style="margin-top: 0.5rem; font-size: 0.85rem; color: ${isCompleted ? '#10b981' : '#ef4444'};">${isCompleted ? '✅ Completed' : '❌ In Progress'}</div>
                </div>
            `;
        });
        
        elements.courseProgressList.innerHTML = html;
        
        const totalCourses = grades.length;
        if (elements.completedCoursesProgress) elements.completedCoursesProgress.textContent = completedCount;
        if (elements.totalCoursesProgress) elements.totalCoursesProgress.textContent = totalCourses;
    }
    
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
    
    function setupEventListeners() {
        if (elements.filterSelect) {
            elements.filterSelect.addEventListener('change', (e) => {
                currentFilter = e.target.value;
                console.log(`Filter changed to: ${currentFilter}`);
                loadAcademicReports();
            });
        }
        
        const refreshBtn = document.getElementById('refresh-report');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => loadAcademicReports());
        }
        
        const downloadBtn = document.getElementById('download-transcript-pdf');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => alert('📄 PDF Transcript download coming soon!'));
        }
        
        const printBtn = document.getElementById('print-report');
        if (printBtn) {
            printBtn.addEventListener('click', () => window.print());
        }
    }
    
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
    
    window.academicReportsModule = {
        init: init,
        loadReports: loadAcademicReports,
        refresh: loadAcademicReports,
        setFilter: (filter) => { currentFilter = filter; loadAcademicReports(); }
    };
    
    init();
    
    console.log('✅ Academic Reports Module Ready - Fixed visibility & smart filtering');
})();
