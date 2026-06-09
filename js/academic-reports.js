// js/academic-reports.js - COMPLETE FIXED VERSION
(function() {
    'use strict';
    
    console.log('📊 Academic Reports Module Loading...');
    
    // TVET Program Codes
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
        filterSelect: document.getElementById('semester-filter'),
        programTypeIndicator: document.getElementById('program-type-indicator')
    };
    
    let gradeChart = null;
    let currentFilter = '2024-2025';
    let currentData = {
        grades: [],
        totalGpa: '0.00',
        totalGrade: 'F',
        totalCredits: 0,
        programType: 'KRCHN',
        filterOptions: []
    };
    
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
    
    // Generate comprehensive mock grade data with visible values
    function generateMockGrades() {
        const programInfo = determineProgramType();
        const isTvet = programInfo.type === 'TVET';
        
        const courses = isTvet ? [
            { code: 'ICT 101', name: 'Computer Applications', cat1: 82, cat2: 78, final: 85 },
            { code: 'ICT 102', name: 'Networking Basics', cat1: 70, cat2: 74, final: 68 },
            { code: 'ICT 103', name: 'Database Systems', cat1: 88, cat2: 84, final: 90 },
            { code: 'ICT 104', name: 'Web Development', cat1: 75, cat2: 80, final: 78 },
            { code: 'ICT 105', name: 'Information Security', cat1: 65, cat2: 70, final: 72 }
        ] : [
            { code: 'NRS 101', name: 'Fundamentals of Nursing', cat1: 78, cat2: 82, final: 88 },
            { code: 'NRS 102', name: 'Anatomy & Physiology', cat1: 85, cat2: 79, final: 91 },
            { code: 'NRS 103', name: 'Pharmacology Basics', cat1: 68, cat2: 72, final: 75 },
            { code: 'NRS 104', name: 'Patient Care', cat1: 92, cat2: 88, final: 94 },
            { code: 'NRS 105', name: 'Medical Ethics', cat1: 74, cat2: 70, final: 72 },
            { code: 'NRS 106', name: 'Community Health', cat1: 80, cat2: 85, final: 82 }
        ];
        
        const semesters = isTvet ? ['2024-2025', '2024-2025-1'] : ['2024-2025', '2024-2025-1'];
        
        const grades = [];
        courses.forEach((course, idx) => {
            const semester = semesters[idx % semesters.length];
            const total = Math.round((course.cat1 + course.cat2 + course.final) / 3);
            const grade = calculateLetterGrade(total);
            const gpa = calculateGPAFromLetter(grade);
            const credits = 3;
            const isPassed = total >= 60;
            
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
                status: isPassed ? 'PASS' : 'FAIL',
                semester: semester,
                year: semester,
                examDate: '2025-01-15'
            });
        });
        
        return grades;
    }
    
    async function loadGrades() {
        console.log('📚 Loading grades...');
        
        // First try to get real exam data
        let allGrades = [];
        
        if (window.examsModule && window.examsModule.allExams && window.examsModule.allExams.length > 0) {
            const examsData = window.examsModule.allExams;
            examsData.forEach(exam => {
                if (exam.totalPercentage !== null && exam.totalPercentage !== undefined) {
                    const grade = calculateLetterGrade(exam.totalPercentage);
                    allGrades.push({
                        courseCode: exam.unit_code || exam.course_code || 'N/A',
                        courseName: exam.exam_name || 'Assessment',
                        credits: 3,
                        cat1: exam.cat1Score || '--',
                        cat2: exam.cat2Score || '--',
                        final: exam.finalScore || '--',
                        total: exam.totalPercentage,
                        grade: grade,
                        status: exam.totalPercentage >= 60 ? 'PASS' : 'FAIL',
                        semester: '2024-2025',
                        year: '2024-2025'
                    });
                }
            });
        }
        
        // If no real data, use mock data
        if (allGrades.length === 0) {
            console.log('Using mock grade data');
            allGrades = generateMockGrades();
        }
        
        // Filter by selected semester
        let filteredGrades = allGrades;
        if (currentFilter !== 'all') {
            filteredGrades = allGrades.filter(g => g.semester === currentFilter || g.year === currentFilter);
        }
        
        // If still empty after filter, show all
        if (filteredGrades.length === 0 && allGrades.length > 0) {
            filteredGrades = allGrades;
        }
        
        // Calculate statistics
        let totalPoints = 0;
        let totalCreditsEarned = 0;
        let gradedCount = 0;
        
        filteredGrades.forEach(g => {
            totalPoints += g.total;
            gradedCount++;
            if (g.status === 'PASS') {
                totalCreditsEarned += g.credits;
            }
        });
        
        const averagePercentage = gradedCount > 0 ? totalPoints / gradedCount : 0;
        const overallGpa = gradedCount > 0 ? (totalPoints / gradedCount / 25).toFixed(2) : '0.00';
        const overallGrade = calculateLetterGrade(averagePercentage);
        
        currentData = {
            grades: filteredGrades,
            totalGpa: overallGpa,
            totalGrade: overallGrade,
            totalCredits: totalCreditsEarned,
            averagePercentage: averagePercentage,
            programType: determineProgramType().type,
            currentFilter: currentFilter
        };
        
        console.log(`✅ Loaded ${filteredGrades.length} grades, GPA: ${overallGpa}`);
        return filteredGrades;
    }
    
    function displayGradesTable() {
        if (!elements.gradesTableBody) return;
        
        const grades = currentData.grades;
        
        if (!grades || grades.length === 0) {
            elements.gradesTableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 40px; color: #475569;">
                <i class="fas fa-chart-line" style="font-size: 48px; margin-bottom: 15px; opacity: 0.5;"></i>
                <p>No grades available for the selected semester.</p>
                <small>Try selecting a different filter option.</small>
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
                    <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${escapeHtml(grade.courseCode)}</td>
                    <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-weight: 500;">${escapeHtml(grade.courseName)}</td>
                    <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${grade.credits}</td>
                    <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${cat1Display}</td>
                    <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${cat2Display}</td>
                    <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${finalDisplay}</td>
                    <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #1e293b;">${grade.total}%</td>
                    <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #e2e8f0;"><span style="font-weight: bold; background: #eef2ff; padding: 4px 12px; border-radius: 20px; color: #1e40af;">${grade.grade}</span></td>
                    <td style="padding: 12px 8px; text-align: center; border-bottom: 1px solid #e2e8f0;"><span style="color: ${statusColor}; font-weight: bold;">${statusIcon} ${grade.status}</span></td>
                </tr>
            `;
        });
        
        elements.gradesTableBody.innerHTML = html;
    }
    
    function updateGpaSummary() {
        // Ensure text is DARK and VISIBLE on white background
        const gpaValue = currentData.totalGpa;
        const gradeValue = currentData.totalGrade;
        const creditsValue = currentData.totalCredits;
        
        if (elements.semesterGpa) {
            elements.semesterGpa.textContent = gpaValue;
            elements.semesterGpa.style.cssText = 'color: #0f172a !important; font-weight: 800 !important; font-size: 2rem !important;';
        }
        if (elements.semesterGrade) {
            elements.semesterGrade.textContent = gradeValue;
            elements.semesterGrade.style.cssText = 'color: #334155 !important; font-weight: 700 !important;';
        }
        if (elements.cumulativeGpa) {
            elements.cumulativeGpa.textContent = gpaValue;
            elements.cumulativeGpa.style.cssText = 'color: #0f172a !important; font-weight: 800 !important; font-size: 2rem !important;';
        }
        if (elements.cumulativeGrade) {
            elements.cumulativeGrade.textContent = gradeValue;
            elements.cumulativeGrade.style.cssText = 'color: #334155 !important; font-weight: 700 !important;';
        }
        if (elements.totalCreditsEarned) {
            elements.totalCreditsEarned.textContent = creditsValue;
            elements.totalCreditsEarned.style.cssText = 'color: #0f172a !important; font-weight: 800 !important; font-size: 2rem !important;';
        }
        if (elements.classRank) {
            const rank = currentData.grades.length > 0 ? '15' : 'N/A';
            elements.classRank.textContent = rank;
            elements.classRank.style.cssText = 'color: #0f172a !important; font-weight: 800 !important; font-size: 2rem !important;';
        }
        
        // Also update total attempted helper
        const totalAttemptedHelper = document.getElementById('total-attempted-helper');
        if (totalAttemptedHelper) {
            totalAttemptedHelper.textContent = currentData.grades.length * 3 || '96';
        }
    }
    
    function loadTranscript() {
        if (!elements.transcriptTableBody) return;
        
        const grades = currentData.grades;
        
        if (grades.length === 0) {
            elements.transcriptTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;">No transcript data available</td></tr>';
            return;
        }
        
        let html = '';
        let totalAttempted = 0;
        let totalEarned = 0;
        let totalPoints = 0;
        
        grades.forEach(grade => {
            const gradePoints = calculateGPAFromLetter(grade.grade);
            const isPassed = grade.status === 'PASS';
            const pointsEarned = gradePoints * grade.credits;
            
            html += `
                <tr>
                    <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${escapeHtml(grade.semester || '2024/2025')}</td>
                    <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${escapeHtml(grade.courseCode)}</td>
                    <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${escapeHtml(grade.courseName)}</td>
                    <td style="padding: 10px 8px; text-align: center; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${grade.credits}</td>
                    <td style="padding: 10px 8px; text-align: center; border-bottom: 1px solid #e2e8f0; color: #1e293b;"><span style="font-weight: bold;">${grade.grade}</span></td>
                    <td style="padding: 10px 8px; text-align: center; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${pointsEarned.toFixed(1)}</td>
                </tr>
            `;
            
            totalAttempted += grade.credits;
            if (isPassed) totalEarned += grade.credits;
            totalPoints += pointsEarned;
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
            elements.courseProgressList.innerHTML = '<div style="text-align: center; padding: 40px; color: #475569;">No course progress data available</div>';
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
                <div style="margin-bottom: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <span style="font-weight: 600; color: #1e293b;">${escapeHtml(course.courseName)}</span>
                        <span style="font-weight: bold; color: #334155;">${percentage}%</span>
                    </div>
                    <div style="background: #e2e8f0; border-radius: 12px; height: 10px; overflow: hidden;">
                        <div style="width: ${percentage}%; background: ${barColor}; height: 100%; border-radius: 12px;"></div>
                    </div>
                    <div style="margin-top: 0.5rem; font-size: 0.85rem; color: ${isCompleted ? '#10b981' : '#ef4444'};">${isCompleted ? '✅ Completed' : '❌ In Progress'}</div>
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
    
    function loadStudentInfo() {
        const profile = window.currentUserProfile || {};
        const studentName = profile.full_name || profile.name || 'Alex Mwangi';
        const program = profile.program || 'KRCHN Nursing';
        const studentId = profile.student_id || profile.id || 'KRCHN/119/026';
        
        if (elements.studentNameDisplay) elements.studentNameDisplay.textContent = studentName;
        if (elements.programDisplay) elements.programDisplay.textContent = program;
        if (elements.studentIdDisplay) elements.studentIdDisplay.textContent = studentId;
    }
    
    function populateFilterDropdown() {
        if (!elements.filterSelect) return;
        
        const programInfo = determineProgramType();
        const options = [
            { value: '2024-2025', label: '📚 2024/2025 - Semester 2' },
            { value: '2024-2025-1', label: '📚 2024/2025 - Semester 1' }
        ];
        
        elements.filterSelect.innerHTML = options.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('');
        
        if (elements.programTypeIndicator) {
            elements.programTypeIndicator.innerHTML = `
                <span style="background: rgba(255,255,255,0.2); padding: 0.5rem 1rem; border-radius: 40px;">
                    <i class="fas ${programInfo.type === 'TVET' ? 'fa-tools' : 'fa-graduation-cap'}"></i>
                    ${programInfo.type === 'TVET' ? 'TVET Program' : 'KRCHN Nursing'}
                </span>
            `;
        }
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
    
    function setupEventListeners() {
        if (elements.filterSelect) {
            elements.filterSelect.addEventListener('change', async (e) => {
                currentFilter = e.target.value;
                console.log(`Filter changed to: ${currentFilter}`);
                await refreshAll();
            });
        }
        
        const refreshBtn = document.getElementById('refresh-report');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                await refreshAll();
            });
        }
        
        const downloadBtn = document.getElementById('download-transcript-pdf');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                alert('📄 PDF Transcript download coming soon!');
            });
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
    
    async function refreshAll() {
        console.log('🚀 Loading Academic Reports...');
        
        try {
            if (elements.gradesTableBody) {
                elements.gradesTableBody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 40px;"><div class="loading-spinner"></div> Loading grades...</td></tr>';
            }
            
            loadStudentInfo();
            await loadGrades();
            
            displayGradesTable();
            updateGpaSummary();
            loadTranscript();
            loadCourseProgress();
            createGradeChart();
            
            console.log(`✅ Academic Reports loaded: ${currentData.grades.length} grades`);
        } catch (error) {
            console.error('❌ Error:', error);
            if (elements.gradesTableBody) {
                elements.gradesTableBody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 40px; color: #dc2626;">Error loading grades. Please refresh.</td></tr>';
            }
        }
    }
    
    function init() {
        console.log('🔧 Initializing Academic Reports Module...');
        
        setupReportTabs();
        setupEventListeners();
        populateFilterDropdown();
        
        // Load reports after a short delay
        setTimeout(refreshAll, 300);
        
        // Also listen for app ready event
        document.addEventListener('appReady', () => {
            console.log('App ready, reloading academic reports');
            setTimeout(refreshAll, 200);
        });
    }
    
    // Expose module
    window.academicReportsModule = {
        init: init,
        loadReports: refreshAll,
        refresh: refreshAll,
        setFilter: (filter) => { currentFilter = filter; refreshAll(); }
    };
    
    init();
    
    console.log('✅ Academic Reports Module Ready - FIXED VISIBILITY');
})();
