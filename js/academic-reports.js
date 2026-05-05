// ==================== ACADEMIC REPORTS MODULE ====================
(function() {
    'use strict';
    
    console.log('📊 Academic Reports Module Initializing...');
    
    // Sample grade data (will be replaced with real data from database)
    let academicData = {
        studentInfo: {
            name: '',
            id: '',
            program: 'KRCHN',
            intake: '2024'
        },
        semesterGrades: [
            { code: 'NUR 401', name: 'Advanced Medical-Surgical Nursing', credits: 3, cat1: 78, cat2: 82, final: 76, total: 77.4, grade: 'B+', status: 'Passed', semester: '2024/2025-2' },
            { code: 'NUR 402', name: 'Community Health Nursing', credits: 3, cat1: 85, cat2: 88, final: 82, total: 83.5, grade: 'A-', status: 'Passed', semester: '2024/2025-2' },
            { code: 'NUR 403', name: 'Mental Health Nursing', credits: 3, cat1: 92, cat2: 90, final: 88, total: 89.2, grade: 'A', status: 'Passed', semester: '2024/2025-2' },
            { code: 'NUR 404', name: 'Research Methods', credits: 2, cat1: 75, cat2: 78, final: 72, total: 74.1, grade: 'B', status: 'Passed', semester: '2024/2025-2' },
            { code: 'NUR 405', name: 'Leadership & Management', credits: 2, cat1: 68, cat2: 72, final: 65, total: 67.1, grade: 'B-', status: 'Passed', semester: '2024/2025-2' },
            { code: 'NUR 301', name: 'Medical-Surgical Nursing I', credits: 3, cat1: 72, cat2: 75, final: 70, total: 71.5, grade: 'B', status: 'Passed', semester: '2024/2025-1' },
            { code: 'NUR 302', name: 'Pharmacology', credits: 2, cat1: 68, cat2: 70, final: 65, total: 66.5, grade: 'B-', status: 'Passed', semester: '2024/2025-1' },
            { code: 'NUR 303', name: 'Pathophysiology', credits: 3, cat1: 82, cat2: 85, final: 78, total: 80.2, grade: 'A-', status: 'Passed', semester: '2024/2025-1' }
        ],
        allGrades: [
            { code: 'NUR 101', name: 'Anatomy & Physiology I', credits: 3, grade: 'B+', points: 9.0, semester: '2023/2024-1' },
            { code: 'NUR 102', name: 'Fundamentals of Nursing', credits: 3, grade: 'A-', points: 10.5, semester: '2023/2024-1' },
            { code: 'NUR 103', name: 'Communication Skills', credits: 2, grade: 'B', points: 6.0, semester: '2023/2024-1' },
            { code: 'NUR 201', name: 'Anatomy & Physiology II', credits: 3, grade: 'B+', points: 9.0, semester: '2023/2024-2' },
            { code: 'NUR 202', name: 'Medical Nursing I', credits: 3, grade: 'B', points: 6.0, semester: '2023/2024-2' },
            { code: 'NUR 203', name: 'Surgical Nursing I', credits: 3, grade: 'B+', points: 9.0, semester: '2023/2024-2' },
            { code: 'NUR 301', name: 'Medical-Surgical Nursing I', credits: 3, grade: 'B', points: 6.0, semester: '2024/2025-1' },
            { code: 'NUR 302', name: 'Pharmacology', credits: 2, grade: 'B-', points: 5.0, semester: '2024/2025-1' },
            { code: 'NUR 303', name: 'Pathophysiology', credits: 3, grade: 'A-', points: 10.5, semester: '2024/2025-1' },
            { code: 'NUR 401', name: 'Advanced Medical-Surgical Nursing', credits: 3, grade: 'B+', points: 9.0, semester: '2024/2025-2' },
            { code: 'NUR 402', name: 'Community Health Nursing', credits: 3, grade: 'A-', points: 10.5, semester: '2024/2025-2' },
            { code: 'NUR 403', name: 'Mental Health Nursing', credits: 3, grade: 'A', points: 12.0, semester: '2024/2025-2' }
        ]
    };
    
    // Grade point mapping
    const gradePoints = {
        'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7,
        'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D+': 1.3, 'D': 1.0, 'F': 0.0
    };
    
    // Helper: Calculate GPA from grades
    function calculateGPA(grades) {
        let totalPoints = 0;
        let totalCredits = 0;
        grades.forEach(grade => {
            let points = gradePoints[grade.grade] || 0;
            totalPoints += points * grade.credits;
            totalCredits += grade.credits;
        });
        return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';
    }
    
    // Helper: Get letter grade from percentage
    function getLetterGrade(percentage) {
        if (percentage >= 85) return 'A';
        if (percentage >= 80) return 'A-';
        if (percentage >= 75) return 'B+';
        if (percentage >= 70) return 'B';
        if (percentage >= 65) return 'B-';
        if (percentage >= 60) return 'C+';
        if (percentage >= 55) return 'C';
        if (percentage >= 50) return 'C-';
        if (percentage >= 45) return 'D+';
        if (percentage >= 40) return 'D';
        return 'F';
    }
    
    // Load student info from profile
    function loadStudentInfo() {
        const profile = window.currentUserProfile || {};
        academicData.studentInfo.name = profile.full_name || 'Student Name';
        academicData.studentInfo.id = profile.student_id || 'NCHSM/STUDENT/001';
        academicData.studentInfo.program = profile.program || 'KRCHN';
        academicData.studentInfo.intake = profile.intake_year || '2024';
        
        document.getElementById('student-name-display').textContent = academicData.studentInfo.name;
        document.getElementById('student-id-display').textContent = academicData.studentInfo.id;
        document.getElementById('program-display').textContent = academicData.studentInfo.program;
    }
    
    // Load semester report
    function loadSemesterReport(semester = '2024/2025-2') {
        const semesterGrades = academicData.semesterGrades.filter(g => g.semester === semester);
        
        // Calculate GPA
        let totalPoints = 0;
        let totalCredits = 0;
        semesterGrades.forEach(course => {
            let points = gradePoints[course.grade] || 0;
            totalPoints += points * course.credits;
            totalCredits += course.credits;
        });
        const semesterGPA = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';
        
        // Calculate CGPA from all grades
        const cgpa = calculateGPA(academicData.allGrades);
        
        // Update GPA displays
        document.getElementById('semester-gpa').textContent = semesterGPA;
        document.getElementById('cumulative-gpa').textContent = cgpa;
        document.getElementById('semester-grade').textContent = getLetterGrade(parseFloat(semesterGPA) * 25);
        document.getElementById('cumulative-grade').textContent = getLetterGrade(parseFloat(cgpa) * 25);
        
        // Update credits
        const totalCreditsEarned = academicData.allGrades.reduce((sum, g) => sum + g.credits, 0);
        document.getElementById('total-credits-earned').textContent = totalCreditsEarned;
        
        // Populate grades table
        const tbody = document.getElementById('grades-table-body');
        if (tbody) {
            if (semesterGrades.length === 0) {
                tbody.innerHTML = '<tr><td colspan="9" class="empty-state">No grades available for this semester</td></tr>';
            } else {
                tbody.innerHTML = semesterGrades.map(course => `
                    <tr>
                        <td>${course.code}</td>
                        <td>${course.name}</td>
                        <td>${course.credits}</td>
                        <td>${course.cat1}%</td>
                        <td>${course.cat2}%</td>
                        <td>${course.final}%</td>
                        <td><strong>${course.total}%</strong></td>
                        <td><span class="grade-badge grade-${course.grade.replace('+', 'p').replace('-', 'm')}">${course.grade}</span></td>
                        <td class="status-${course.status.toLowerCase()}">${course.status}</td>
                    </tr>
                `).join('');
            }
        }
        
        // Update chart
        updateGradeChart(semesterGrades);
    }
    
    // Load transcript
    function loadTranscript() {
        const tbody = document.getElementById('transcript-table-body');
        if (tbody) {
            let html = '';
            let currentYear = '';
            academicData.allGrades.forEach(grade => {
                if (grade.semester !== currentYear) {
                    currentYear = grade.semester;
                    html += `<tr class="semester-header"><td colspan="6"><strong>${currentYear}</strong></td></tr>`;
                }
                html += `
                    <tr>
                        <td>${grade.semester}</td>
                        <td>${grade.code}</td>
                        <td>${grade.name}</td>
                        <td>${grade.credits}</td>
                        <td>${grade.grade}</td>
                        <td>${(gradePoints[grade.grade] * grade.credits).toFixed(1)}</td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
        }
        
        const cgpa = calculateGPA(academicData.allGrades);
        const totalCredits = academicData.allGrades.reduce((sum, g) => sum + g.credits, 0);
        document.getElementById('total-attempted').textContent = totalCredits;
        document.getElementById('total-earned').textContent = totalCredits;
        document.getElementById('transcript-cgpa').textContent = cgpa;
    }
    
    // Load yearly summary
    function loadYearlySummary(year = '2024') {
        const yearGrades = academicData.allGrades.filter(g => g.semester.includes(year));
        const yearGPA = calculateGPA(yearGrades);
        const yearCredits = yearGrades.reduce((sum, g) => sum + g.credits, 0);
        const yearCourses = yearGrades.length;
        
        document.getElementById('year-gpa').textContent = yearGPA;
        document.getElementById('year-credits').textContent = yearCredits;
        document.getElementById('year-courses').textContent = yearCourses;
    }
    
    // Load course progress
    function loadCourseProgress() {
        const courses = academicData.allGrades;
        const completed = courses.filter(c => c.grade !== 'F' && c.grade !== 'D' && c.grade !== 'D+');
        const percentage = Math.round((completed.length / courses.length) * 100);
        
        document.getElementById('completed-courses-progress').textContent = completed.length;
        document.getElementById('total-courses-progress').textContent = courses.length;
        
        // Update progress circle
        const circle = document.querySelector('#progress-report .progress-circle svg circle:last-child');
        if (circle) {
            const circumference = 2 * Math.PI * 45;
            const offset = circumference - (percentage / 100) * circumference;
            circle.style.strokeDasharray = circumference;
            circle.style.strokeDashoffset = offset;
        }
        document.querySelector('#progress-report .progress-circle text').textContent = `${percentage}%`;
        
        // Populate course progress list
        const progressList = document.getElementById('course-progress-list');
        if (progressList) {
            progressList.innerHTML = courses.map(course => {
                const gradeValue = gradePoints[course.grade] || 0;
                const percent = (gradeValue / 4) * 100;
                let color = '#10b981';
                if (percent < 50) color = '#ef4444';
                else if (percent < 70) color = '#f59e0b';
                else if (percent < 85) color = '#3b82f6';
                
                return `
                    <div class="progress-item">
                        <div class="progress-header">
                            <span class="course-name">${course.name} (${course.code})</span>
                            <span class="progress-percent">${course.grade}</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${percent}%; background: ${color};"></div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }
    
    // Update grade distribution chart
    let gradeChart = null;
    function updateGradeChart(grades) {
        const ctx = document.getElementById('grade-distribution-chart');
        if (!ctx) return;
        
        const distribution = { A: 0, 'A-': 0, 'B+': 0, B: 0, 'B-': 0, 'C+': 0, C: 0, F: 0 };
        grades.forEach(g => { if (distribution[g.grade] !== undefined) distribution[g.grade]++; });
        
        const labels = Object.keys(distribution).filter(l => distribution[l] > 0);
        const data = labels.map(l => distribution[l]);
        
        if (gradeChart) gradeChart.destroy();
        
        gradeChart = new Chart(ctx, {
            type: 'bar',
            data: { labels: labels, datasets: [{ label: 'Number of Courses', data: data, backgroundColor: '#4f46e5', borderRadius: 8 }] },
            options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'top' } } }
        });
    }
    
    // Download transcript as PDF
    function downloadTranscriptPDF() {
        const { jsPDF } = window.jspdf;
        if (!jsPDF) {
            console.error('jsPDF not loaded');
            alert('PDF generation is loading. Please try again.');
            return;
        }
        
        const doc = new jsPDF('p', 'mm', 'a4');
        doc.setFontSize(18);
        doc.text('Academic Transcript', 105, 20, { align: 'center' });
        doc.setFontSize(12);
        doc.text(`${academicData.studentInfo.name} - ${academicData.studentInfo.id}`, 105, 35, { align: 'center' });
        doc.text(`Program: ${academicData.studentInfo.program} | Intake: ${academicData.studentInfo.intake}`, 105, 45, { align: 'center' });
        
        let y = 60;
        doc.setFontSize(10);
        doc.text('Course Code', 20, y);
        doc.text('Course Name', 50, y);
        doc.text('Credits', 120, y);
        doc.text('Grade', 150, y);
        doc.text('Points', 170, y);
        doc.line(20, y + 2, 190, y + 2);
        y += 8;
        
        academicData.allGrades.forEach(grade => {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.text(grade.code, 20, y);
            doc.text(grade.name.substring(0, 25), 50, y);
            doc.text(grade.credits.toString(), 120, y);
            doc.text(grade.grade, 150, y);
            doc.text(((gradePoints[grade.grade] || 0) * grade.credits).toFixed(1), 170, y);
            y += 7;
        });
        
        const cgpa = calculateGPA(academicData.allGrades);
        doc.setFontSize(12);
        doc.text(`Cumulative GPA: ${cgpa}`, 150, y + 10);
        
        doc.save(`${academicData.studentInfo.id}_Transcript.pdf`);
    }
    
    // Print report
    function printReport() {
        window.print();
    }
    
    // Initialize event listeners
    function initEventListeners() {
        // Semester filter change
        const semesterFilter = document.getElementById('semester-filter');
        if (semesterFilter) {
            semesterFilter.addEventListener('change', () => loadSemesterReport(semesterFilter.value));
        }
        
        // Year filter change
        const yearFilter = document.getElementById('year-filter');
        if (yearFilter) {
            yearFilter.addEventListener('change', () => loadYearlySummary(yearFilter.value));
        }
        
        // Refresh button
        const refreshBtn = document.getElementById('refresh-report');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                const semester = document.getElementById('semester-filter')?.value || '2024/2025-2';
                loadSemesterReport(semester);
            });
        }
        
        // Download PDF button
        const downloadBtn = document.getElementById('download-transcript-pdf');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', downloadTranscriptPDF);
        }
        
        // Print button
        const printBtn = document.getElementById('print-report');
        if (printBtn) {
            printBtn.addEventListener('click', printReport);
        }
        
        // Report tab switching
        document.querySelectorAll('.report-tab').forEach(tab => {
            tab.addEventListener('click', function() {
                document.querySelectorAll('.report-tab').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                
                const reportType = this.getAttribute('data-report');
                document.querySelectorAll('.report-content').forEach(content => content.style.display = 'none');
                document.getElementById(`${reportType}-report`).style.display = 'block';
                
                // Load data for active tab
                if (reportType === 'semester') loadSemesterReport();
                else if (reportType === 'yearly') loadYearlySummary();
                else if (reportType === 'transcript') loadTranscript();
                else if (reportType === 'progress') loadCourseProgress();
            });
        });
    }
    
    // Main initialization function
    function initAcademicReports() {
        console.log('📊 Initializing Academic Reports...');
        
        // Wait for Chart.js to load
        if (typeof Chart === 'undefined') {
            const chartScript = document.createElement('script');
            chartScript.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
            chartScript.onload = () => {
                console.log('✅ Chart.js loaded');
                loadDataAndRender();
            };
            document.head.appendChild(chartScript);
        } else {
            loadDataAndRender();
        }
        
        // Wait for jsPDF
        if (typeof window.jspdf === 'undefined') {
            const pdfScript = document.createElement('script');
            pdfScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            pdfScript.onload = () => console.log('✅ jsPDF loaded');
            document.head.appendChild(pdfScript);
        }
    }
    
    function loadDataAndRender() {
        loadStudentInfo();
        loadSemesterReport();
        loadTranscript();
        loadYearlySummary();
        loadCourseProgress();
        initEventListeners();
        
        console.log('✅ Academic Reports ready!');
    }
    
    // Export to window
    window.academicReportsModule = {
        init: initAcademicReports,
        loadReports: loadDataAndRender
    };
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAcademicReports);
    } else {
        initAcademicReports();
    }
})();
