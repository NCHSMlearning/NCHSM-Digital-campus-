// js/academic-reports.js - LINKS WITH EXAMS MODULE
(function() {
    'use strict';
    
    console.log('📊 Academic Reports Module Loading...');
    
    // DOM Elements - Updated to match your HTML structure
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
        courseProgressList: document.getElementById('course-progress-list')
    };
    
    let gradeChart = null;
    let currentData = {
        grades: [],
        totalGpa: 0,
        completedCount: 0,
        totalCredits: 0
    };
    
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
    
    // Load student info from global profile
    function loadStudentInfo() {
        console.log('📋 Loading student info...');
        
        const profile = window.currentUserProfile || {};
        const studentName = profile.full_name || profile.name || 'Student Name';
        const program = profile.program || profile.department || 'KRCHN Nursing';
        const studentId = profile.student_id || profile.id || 'N/A';
        
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
    }
    
    // Load grades from exams module data
    async function loadGradesFromExams() {
        console.log('📚 Loading grades from exams module...');
        
        // Wait for exams module to be ready
        if (window.examsModule) {
            // If exams haven't loaded yet, wait
            if (!window.examsModule.allExams || window.examsModule.allExams.length === 0) {
                console.log('⏳ Waiting for exams data...');
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            const examsData = window.examsModule.allExams || [];
            console.log(`Found ${examsData.length} exams in exams module`);
            
            // Process only completed exams with released results
            const processedGrades = [];
            let totalPercentageSum = 0;
            let gradedCount = 0;
            let totalCreditsEarned = 0;
            
            examsData.forEach(exam => {
                // Check if exam has a grade and is released
                if (exam.isCompleted && exam.isReleased && exam.totalPercentage !== null) {
                    const grade = calculateLetterGrade(exam.totalPercentage);
                    const gpa = calculateGPAFromLetter(grade);
                    const credits = 3; // Default credits, adjust as needed
                    
                    processedGrades.push({
                        courseCode: exam.unit_code || exam.course_code || exam.id?.substring(0, 8) || 'N/A',
                        courseName: exam.exam_name || 'Course',
                        credits: credits,
                        cat1: exam.cat1Score || '--',
                        cat2: exam.cat2Score || '--',
                        final: exam.finalScore || '--',
                        total: exam.totalPercentage,
                        grade: grade,
                        gpa: gpa,
                        status: exam.totalPercentage >= 60 ? 'PASS' : 'FAIL',
                        semester: exam.block_term || 'Current',
                        examDate: exam.exam_date
                    });
                    
                    if (exam.totalPercentage >= 60) {
                        totalCreditsEarned += credits;
                    }
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
                averagePercentage: averagePercentage
            };
            
            console.log(`✅ Processed ${processedGrades.length} graded exams, GPA: ${overallGpa}`);
            return processedGrades;
        }
        
        console.warn('⚠️ Exams module not available, using fallback data');
        return getFallbackData();
    }
    
    // Fallback data if exams module not available
    function getFallbackData() {
        return [
            { courseCode: 'ANAT101', courseName: 'Anatomy & Physiology I', credits: 3, cat1: 72, cat2: 78, final: 82, total: 79.2, grade: 'B+', status: 'PASS', semester: '2024/2025 - Semester 1' },
            { courseCode: 'NURS102', courseName: 'Fundamentals of Nursing', credits: 4, cat1: 85, cat2: 88, final: 90, total: 88.0, grade: 'A', status: 'PASS', semester: '2024/2025 - Semester 1' },
            { courseCode: 'PHAR103', courseName: 'Pharmacology', credits: 3, cat1: 68, cat2: 72, final: 75, total: 72.5, grade: 'B', status: 'PASS', semester: '2024/2025 - Semester 2' },
            { courseCode: 'PATH104', courseName: 'Pathophysiology', credits: 3, cat1: 55, cat2: 60, final: 58, total: 57.8, grade: 'D', status: 'FAIL', semester: '2024/2025 - Semester 2' }
        ];
    }
    
    // Display grades in table
    function displayGradesTable() {
        if (!elements.gradesTableBody) {
            console.warn('Grades table body not found');
            return;
        }
        
        const grades = currentData.grades;
        
        if (!grades || grades.length === 0) {
            elements.gradesTableBody.innerHTML = '<tr><td colspan="9" class="text-center">No grades available</td></tr>';
            return;
        }
        
        let html = '';
        grades.forEach(grade => {
            const statusColor = grade.status === 'PASS' ? '#10b981' : '#ef4444';
            const statusIcon = grade.status === 'PASS' ? '✓' : '✗';
            
            html += `
                <tr>
                    <td>${escapeHtml(grade.courseCode)}</td>
                    <td>${escapeHtml(grade.courseName)}</td>
                    <td class="text-center">${grade.credits}</td>
                    <td class="text-center">${typeof grade.cat1 === 'number' ? grade.cat1 + '%' : grade.cat1}</td>
                    <td class="text-center">${typeof grade.cat2 === 'number' ? grade.cat2 + '%' : grade.cat2}</td>
                    <td class="text-center">${typeof grade.final === 'number' ? grade.final + '%' : grade.final}</td>
                    <td class="text-center"><strong>${grade.total}%</strong></td>
                    <td class="text-center"><span class="grade-letter">${grade.grade}</span></td>
                    <td class="text-center"><span style="color: ${statusColor}; font-weight: bold;">${statusIcon} ${grade.status}</span></td>
                </tr>
            `;
        });
        
        elements.gradesTableBody.innerHTML = html;
    }
    
    // Update GPA summary cards
    function updateGpaSummary() {
        const semesterGpa = currentData.totalGpa;
        const semesterGrade = currentData.totalGrade || calculateLetterGrade(currentData.averagePercentage);
        const cumulativeGpa = semesterGpa;
        const cumulativeGrade = semesterGrade;
        
        if (elements.semesterGpa) elements.semesterGpa.textContent = semesterGpa;
        if (elements.semesterGrade) elements.semesterGrade.textContent = semesterGrade;
        if (elements.cumulativeGpa) elements.cumulativeGpa.textContent = cumulativeGpa;
        if (elements.cumulativeGrade) elements.cumulativeGrade.textContent = cumulativeGrade;
        if (elements.totalCreditsEarned) elements.totalCreditsEarned.textContent = currentData.totalCredits;
        if (elements.classRank) elements.classRank.textContent = 'N/A';
    }
    
    // Update yearly summary
    function updateYearlySummary() {
        const yearGpa = currentData.totalGpa;
        const yearCredits = currentData.totalCredits;
        const yearCourses = currentData.grades.length;
        
        if (elements.yearGpa) elements.yearGpa.textContent = yearGpa;
        if (elements.yearCredits) elements.yearCredits.textContent = yearCredits;
        if (elements.yearCourses) elements.yearCourses.textContent = yearCourses;
        if (elements.yearAwards) elements.yearAwards.textContent = '0';
    }
    
    // Load transcript data
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
                    <td>${escapeHtml(grade.semester)}</td>
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
            
            let barColor = '#10b981';
            if (percentage < 60) barColor = '#ef4444';
            else if (percentage < 75) barColor = '#f59e0b';
            else barColor = '#10b981';
            
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
    
    // Create grade distribution chart
    function createGradeChart() {
        const canvas = document.getElementById('grade-distribution-chart');
        if (!canvas) {
            console.warn('Grade chart canvas not found');
            return;
        }
        
        const grades = currentData.grades;
        const gradeCounts = { 'A': 0, 'B+': 0, 'B': 0, 'C+': 0, 'C': 0, 'D': 0, 'F': 0 };
        
        grades.forEach(grade => {
            if (gradeCounts[grade.grade] !== undefined) {
                gradeCounts[grade.grade]++;
            }
        });
        
        const labels = Object.keys(gradeCounts);
        const data = Object.values(gradeCounts);
        
        if (gradeChart) {
            gradeChart.destroy();
        }
        
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
            console.log('✅ Grade chart created');
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
                
                if (contents[reportType]) {
                    contents[reportType].style.display = 'block';
                }
            });
        });
    }
    
    // Setup event listeners
    function setupEventListeners() {
        const refreshBtn = document.getElementById('refresh-report');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => loadAcademicReports());
        }
        
        const semesterFilter = document.getElementById('semester-filter');
        if (semesterFilter) {
            semesterFilter.addEventListener('change', () => loadAcademicReports());
        }
        
        const gpaType = document.getElementById('gpa-type');
        if (gpaType) {
            gpaType.addEventListener('change', () => loadAcademicReports());
        }
        
        const downloadBtn = document.getElementById('download-transcript-pdf');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                alert('PDF download feature coming soon!');
            });
        }
        
        const printBtn = document.getElementById('print-report');
        if (printBtn) {
            printBtn.addEventListener('click', () => {
                window.print();
            });
        }
    }
    
    // Main load function
    async function loadAcademicReports() {
        console.log('🚀 Loading Academic Reports...');
        
        try {
            // Show loading state
            if (elements.gradesTableBody) {
                elements.gradesTableBody.innerHTML = '<tr><td colspan="9"><div class="loading-spinner"></div> Loading grades...</td></tr>';
            }
            
            // Load student info
            loadStudentInfo();
            
            // Load grades from exams module
            await loadGradesFromExams();
            
            // Update all displays
            displayGradesTable();
            updateGpaSummary();
            updateYearlySummary();
            loadTranscript();
            loadCourseProgress();
            createGradeChart();
            
            console.log('✅ Academic Reports loaded successfully');
            console.log(`📊 Total grades: ${currentData.grades.length}, GPA: ${currentData.totalGpa}`);
            
        } catch (error) {
            console.error('❌ Error loading academic reports:', error);
            if (elements.gradesTableBody) {
                elements.gradesTableBody.innerHTML = '<tr><td colspan="9" class="text-center error">Error loading grades. Please refresh.</td></tr>';
            }
        }
    }
    
    // Initialize module
    function init() {
        console.log('🔧 Initializing Academic Reports Module...');
        
        setupReportTabs();
        setupEventListeners();
        
        // Wait for exams module to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(loadAcademicReports, 500);
            });
        } else {
            setTimeout(loadAcademicReports, 500);
        }
        
        // Also listen for exams module ready event
        document.addEventListener('examsModuleReady', () => {
            console.log('📢 Exams module ready event received');
            loadAcademicReports();
        });
    }
    
    // Expose module globally
    window.academicReportsModule = {
        init: init,
        loadReports: loadAcademicReports,
        refresh: loadAcademicReports
    };
    
    // Auto-initialize
    init();
    
    console.log('✅ Academic Reports Module Ready - Linked with Exams Module');
})();
