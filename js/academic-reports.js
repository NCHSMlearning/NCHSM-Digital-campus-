// ==================== ACADEMIC REPORTS MODULE ====================
(function() {
    'use strict';
    
    console.log('📊 Academic Reports Module Initializing...');
    
    // Module state
    let currentStudentData = null;
    let currentGrades = [];
    let gradeChart = null;
    
    // DOM Elements - MATCHING YOUR HTML STRUCTURE
    const elements = {
        // Semester report elements
        semesterGpa: document.getElementById('semester-gpa'),
        semesterGrade: document.getElementById('semester-grade'),
        cumulativeGpa: document.getElementById('cumulative-gpa'),
        cumulativeGrade: document.getElementById('cumulative-grade'),
        totalCreditsEarned: document.getElementById('total-credits-earned'),
        classRank: document.getElementById('class-rank'),
        gradesTableBody: document.getElementById('grades-table-body'),
        
        // Yearly report elements
        yearGpa: document.getElementById('year-gpa'),
        yearCredits: document.getElementById('year-credits'),
        yearCourses: document.getElementById('year-courses'),
        yearAwards: document.getElementById('year-awards'),
        
        // Transcript elements
        studentNameDisplay: document.getElementById('student-name-display'),
        programDisplay: document.getElementById('program-display'),
        studentIdDisplay: document.getElementById('student-id-display'),
        transcriptTableBody: document.getElementById('transcript-table-body'),
        totalAttempted: document.getElementById('total-attempted'),
        totalEarned: document.getElementById('total-earned'),
        transcriptCgpa: document.getElementById('transcript-cgpa'),
        
        // Progress elements
        completedCoursesProgress: document.getElementById('completed-courses-progress'),
        totalCoursesProgress: document.getElementById('total-courses-progress'),
        courseProgressList: document.getElementById('course-progress-list')
    };
    
    // Check if elements exist and log missing ones
    function validateElements() {
        console.log('🔍 Validating Academic Reports elements...');
        for (const [key, element] of Object.entries(elements)) {
            if (!element) {
                console.warn(`⚠️ Element missing: ${key}`);
            } else {
                console.log(`✅ Found: ${key}`);
            }
        }
    }
    
    // Load student information
    async function loadStudentInfo() {
        console.log('📋 Loading student info...');
        
        try {
            // Get from global user profile
            const userProfile = window.currentUserProfile || {};
            const studentName = userProfile.full_name || userProfile.name || 'Student Name';
            const program = userProfile.program || userProfile.department || 'Nursing';
            const studentId = userProfile.student_id || userProfile.id || 'N/A';
            
            // Update transcript header
            if (elements.studentNameDisplay) {
                elements.studentNameDisplay.textContent = studentName;
            }
            if (elements.programDisplay) {
                elements.programDisplay.textContent = program;
            }
            if (elements.studentIdDisplay) {
                elements.studentIdDisplay.textContent = studentId;
            }
            
            console.log('✅ Student info loaded:', { studentName, program, studentId });
            
        } catch (error) {
            console.error('❌ Error loading student info:', error);
            // Set fallback values
            if (elements.studentNameDisplay) elements.studentNameDisplay.textContent = 'Student';
            if (elements.programDisplay) elements.programDisplay.textContent = 'Nursing';
            if (elements.studentIdDisplay) elements.studentIdDisplay.textContent = 'N/A';
        }
    }
    
    // Load grades from the exams module cache
    async function loadGrades() {
        console.log('📚 Loading grades...');
        
        // Try to get grades from window.cachedExams (set by exams.js)
        if (window.cachedExams && window.cachedExams.length > 0) {
            console.log(`Found ${window.cachedExams.length} exams in cache`);
            
            // Process grades from exam data
            currentGrades = window.cachedExams
                .filter(exam => exam.grade && exam.grade.total_score !== null)
                .map(exam => ({
                    courseCode: exam.unit_code || exam.course_code || 'N/A',
                    courseName: exam.course_name || exam.exam_name || 'Course',
                    credits: 3, // Default credits, should come from database
                    cat1: exam.grade.cat_1_score || 0,
                    cat2: exam.grade.cat_2_score || 0,
                    final: exam.grade.exam_score || 0,
                    total: exam.grade.total_score || 0,
                    grade: calculateLetterGrade(exam.grade.total_score || 0),
                    status: (exam.grade.total_score || 0) >= 60 ? 'PASS' : 'FAIL'
                }));
            
            console.log(`Processed ${currentGrades.length} grades`);
        } else {
            console.log('No cached exams found, using sample data');
            // Sample fallback data
            currentGrades = getSampleGrades();
        }
        
        return currentGrades;
    }
    
    // Calculate letter grade from percentage
    function calculateLetterGrade(percentage) {
        if (percentage >= 85) return 'A';
        if (percentage >= 75) return 'B+';
        if (percentage >= 70) return 'B';
        if (percentage >= 65) return 'C+';
        if (percentage >= 60) return 'C';
        if (percentage >= 50) return 'D';
        return 'F';
    }
    
    // Get sample grades for fallback
    function getSampleGrades() {
        return [
            { courseCode: 'ANAT101', courseName: 'Anatomy & Physiology I', credits: 3, cat1: 72, cat2: 78, final: 82, total: 79.2, grade: 'B+', status: 'PASS' },
            { courseCode: 'NURS102', courseName: 'Fundamentals of Nursing', credits: 4, cat1: 85, cat2: 88, final: 90, total: 88.0, grade: 'A', status: 'PASS' },
            { courseCode: 'PHAR103', courseName: 'Pharmacology', credits: 3, cat1: 68, cat2: 72, final: 75, total: 72.5, grade: 'B', status: 'PASS' },
            { courseCode: 'PATH104', courseName: 'Pathophysiology', credits: 3, cat1: 55, cat2: 60, final: 58, total: 57.8, grade: 'D', status: 'FAIL' },
            { courseCode: 'MICR105', courseName: 'Microbiology', credits: 3, cat1: 82, cat2: 85, final: 88, total: 85.7, grade: 'A', status: 'PASS' },
            { courseCode: 'NUTR106', courseName: 'Nutrition', credits: 2, cat1: 90, cat2: 92, final: 88, total: 89.4, grade: 'A', status: 'PASS' }
        ];
    }
    
    // Display grades in the semester report table
    function displayGradesTable() {
        if (!elements.gradesTableBody) {
            console.error('Grades table body not found');
            return;
        }
        
        if (!currentGrades || currentGrades.length === 0) {
            elements.gradesTableBody.innerHTML = '<tr><td colspan="9" style="text-align: center;">No grades available</td></tr>';
            return;
        }
        
        let html = '';
        let totalPoints = 0;
        let totalCredits = 0;
        
        currentGrades.forEach(grade => {
            const statusClass = grade.status === 'PASS' ? 'status-pass' : 'status-fail';
            const statusColor = grade.status === 'PASS' ? '#10b981' : '#ef4444';
            
            html += `
                <tr>
                    <td>${escapeHtml(grade.courseCode)}</td>
                    <td>${escapeHtml(grade.courseName)}</td>
                    <td class="text-center">${grade.credits}</td>
                    <td class="text-center">${grade.cat1}%</td>
                    <td class="text-center">${grade.cat2}%</td>
                    <td class="text-center">${grade.final}%</td>
                    <td class="text-center"><strong>${grade.total}%</strong></td>
                    <td class="text-center"><span class="grade-letter">${grade.grade}</span></td>
                    <td class="text-center"><span style="color: ${statusColor}; font-weight: bold;">${grade.status}</span></td>
                </tr>
            `;
            
            totalPoints += grade.total * grade.credits;
            totalCredits += grade.credits;
        });
        
        elements.gradesTableBody.innerHTML = html;
        
        // Calculate GPA
        const semesterGpa = totalCredits > 0 ? (totalPoints / totalCredits / 25).toFixed(2) : '0.00';
        const cumulativeGpa = semesterGpa; // For now, same as semester
        
        if (elements.semesterGpa) elements.semesterGpa.textContent = semesterGpa;
        if (elements.semesterGrade) elements.semesterGrade.textContent = calculateLetterGrade(parseFloat(semesterGpa) * 25);
        if (elements.cumulativeGpa) elements.cumulativeGpa.textContent = cumulativeGpa;
        if (elements.cumulativeGrade) elements.cumulativeGrade.textContent = calculateLetterGrade(parseFloat(cumulativeGpa) * 25);
        if (elements.totalCreditsEarned) elements.totalCreditsEarned.textContent = totalCredits;
        if (elements.classRank) elements.classRank.textContent = 'N/A';
    }
    
    // Create grade distribution chart
    function createGradeChart() {
        const canvas = document.getElementById('grade-distribution-chart');
        if (!canvas) {
            console.warn('Grade chart canvas not found');
            return;
        }
        
        // Count grades
        const gradeCounts = {
            'A': 0, 'B+': 0, 'B': 0, 'C+': 0, 'C': 0, 'D': 0, 'F': 0
        };
        
        currentGrades.forEach(grade => {
            if (gradeCounts[grade.grade] !== undefined) {
                gradeCounts[grade.grade]++;
            }
        });
        
        const labels = Object.keys(gradeCounts);
        const data = Object.values(gradeCounts);
        
        // Destroy existing chart if any
        if (gradeChart) {
            gradeChart.destroy();
        }
        
        // Create new chart
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
                    y: { beginAtZero: true, title: { display: true, text: 'Number of Courses' }, grid: { color: '#e5e7eb' } },
                    x: { title: { display: true, text: 'Grade' }, grid: { display: false } }
                }
            }
        });
        
        console.log('✅ Grade chart created');
    }
    
    // Load transcript data
    async function loadTranscript() {
        console.log('📜 Loading transcript...');
        
        if (!elements.transcriptTableBody) {
            console.error('Transcript table body not found');
            return;
        }
        
        // Use the same grades data for transcript
        let transcriptHtml = '';
        let semesterGroups = {};
        
        currentGrades.forEach(grade => {
            const semester = 'Semester 1, 2024'; // Default semester
            if (!semesterGroups[semester]) semesterGroups[semester] = [];
            semesterGroups[semester].push(grade);
        });
        
        let totalAttempted = 0;
        let totalEarned = 0;
        let totalPoints = 0;
        let totalCredits = 0;
        
        for (const [semester, courses] of Object.entries(semesterGroups)) {
            transcriptHtml += `<tr class="semester-header"><td colspan="6"><strong>${semester}</strong></td></tr>`;
            
            courses.forEach(course => {
                const gradePoints = getGradePoints(course.grade);
                transcriptHtml += `
                    <tr>
                        <td>${semester}</td>
                        <td>${escapeHtml(course.courseCode)}</td>
                        <td>${escapeHtml(course.courseName)}</td>
                        <td class="text-center">${course.credits}</td>
                        <td class="text-center">${course.grade}</td>
                        <td class="text-center">${gradePoints}</td>
                    </tr>
                `;
                
                totalAttempted += course.credits;
                if (course.status === 'PASS') totalEarned += course.credits;
                totalPoints += gradePoints * course.credits;
                totalCredits += course.credits;
            });
        }
        
        elements.transcriptTableBody.innerHTML = transcriptHtml || '<tr><td colspan="6" class="text-center">No transcript data available</td></tr>';
        
        const cumulativeGpa = totalCredits > 0 ? (totalPoints / totalCredits / 10).toFixed(2) : '0.00';
        
        if (elements.totalAttempted) elements.totalAttempted.textContent = totalAttempted;
        if (elements.totalEarned) elements.totalEarned.textContent = totalEarned;
        if (elements.transcriptCgpa) elements.transcriptCgpa.textContent = cumulativeGpa;
    }
    
    // Get grade points (A=12, B+=11, etc. - on a 12-point scale)
    function getGradePoints(grade) {
        const points = { 'A': 12, 'B+': 11, 'B': 10, 'C+': 9, 'C': 8, 'D': 6, 'F': 4 };
        return points[grade] || 0;
    }
    
    // Load course progress
    async function loadCourseProgress() {
        console.log('📈 Loading course progress...');
        
        if (!elements.courseProgressList) {
            console.error('Course progress list not found');
            return;
        }
        
        let progressHtml = '';
        let completedCount = 0;
        
        currentGrades.forEach(course => {
            const percentage = course.total;
            const isCompleted = percentage >= 60;
            if (isCompleted) completedCount++;
            
            let barColor = '#10b981';
            if (percentage < 60) barColor = '#ef4444';
            else if (percentage < 75) barColor = '#f59e0b';
            else barColor = '#10b981';
            
            progressHtml += `
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
        
        elements.courseProgressList.innerHTML = progressHtml || '<div class="no-data">No course progress data available</div>';
        
        const totalCourses = currentGrades.length;
        if (elements.completedCoursesProgress) elements.completedCoursesProgress.textContent = completedCount;
        if (elements.totalCoursesProgress) elements.totalCoursesProgress.textContent = totalCourses;
    }
    
    // Load yearly summary
    async function loadYearlySummary() {
        console.log('📅 Loading yearly summary...');
        
        // Calculate yearly stats from current grades
        const totalCourses = currentGrades.length;
        const totalCreditsEarned = currentGrades.reduce((sum, c) => sum + (c.status === 'PASS' ? c.credits : 0), 0);
        
        // Calculate average GPA for the year
        let totalPoints = 0;
        let totalCredits = 0;
        currentGrades.forEach(course => {
            totalPoints += course.total * course.credits;
            totalCredits += course.credits;
        });
        const yearGpa = totalCredits > 0 ? (totalPoints / totalCredits / 25).toFixed(2) : '0.00';
        
        if (elements.yearGpa) elements.yearGpa.textContent = yearGpa;
        if (elements.yearCredits) elements.yearCredits.textContent = totalCreditsEarned;
        if (elements.yearCourses) elements.yearCourses.textContent = totalCourses;
        if (elements.yearAwards) elements.yearAwards.textContent = '0';
    }
    
    // Helper function
    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }
    
    // Setup tab switching within reports
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
                
                if (contents[reportType]) {
                    contents[reportType].style.display = 'block';
                }
            });
        });
    }
    
    // Main load function
    async function loadAcademicData() {
        console.log('🚀 Loading academic reports data...');
        
        try {
            // Validate elements first
            validateElements();
            
            // Load data
            await loadStudentInfo();
            await loadGrades();
            
            // Display all sections
            displayGradesTable();
            createGradeChart();
            await loadTranscript();
            await loadCourseProgress();
            await loadYearlySummary();
            
            console.log('✅ Academic reports loaded successfully');
            
        } catch (error) {
            console.error('❌ Error loading academic reports:', error);
        }
    }
    
    // Setup event listeners
    function setupEventListeners() {
        // Semester filter
        const semesterFilter = document.getElementById('semester-filter');
        if (semesterFilter) {
            semesterFilter.addEventListener('change', () => loadAcademicData());
        }
        
        // GPA type
        const gpaType = document.getElementById('gpa-type');
        if (gpaType) {
            gpaType.addEventListener('change', () => loadAcademicData());
        }
        
        // Refresh button
        const refreshBtn = document.getElementById('refresh-report');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => loadAcademicData());
        }
        
        // Year filter
        const yearFilter = document.getElementById('year-filter');
        if (yearFilter) {
            yearFilter.addEventListener('change', () => loadYearlySummary());
        }
        
        // Download transcript button
        const downloadBtn = document.getElementById('download-transcript-pdf');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                alert('PDF download feature coming soon!');
            });
        }
        
        // Print report button
        const printBtn = document.getElementById('print-report');
        if (printBtn) {
            printBtn.addEventListener('click', () => {
                window.print();
            });
        }
    }
    
    // Initialize module
    function init() {
        console.log('🔧 Initializing Academic Reports Module...');
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', async () => {
                setupReportTabs();
                setupEventListeners();
                await loadAcademicData();
            });
        } else {
            setupReportTabs();
            setupEventListeners();
            loadAcademicData();
        }
    }
    
    // Expose module globally
    window.academicReportsModule = {
        init: init,
        loadReports: loadAcademicData,
        refresh: loadAcademicData
    };
    
    // Auto-initialize
    init();
    
})();
