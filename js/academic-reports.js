// academic-reports.js - Professional Academic Reports Module
// Integrates with Exams & Grades (CATS) data

(function() {
    'use strict';
    
    console.log('📊 Academic Reports Module Loading...');
    
    // ==================== DATA STORE ====================
    let academicData = {
        grades: [],
        studentInfo: {
            name: '',
            id: '',
            program: '',
            intake: '',
            currentBlock: '',
            profilePhoto: ''
        },
        semesterGPA: 0,
        cumulativeGPA: 0,
        totalCredits: 0,
        earnedCredits: 0,
        classRank: 15,
        totalStudents: 120,
        gradeDistribution: { distinction: 0, credit: 0, pass: 0, fail: 0 },
        semesterData: {},
        yearlySummary: {}
    };
    
    // Grade point mapping
    const GRADE_POINTS = {
        'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7,
        'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D+': 1.3, 'D': 1.0, 'F': 0.0
    };
    
    const GRADE_LETTERS = {
        'A': 85, 'A-': 80, 'B+': 75, 'B': 70, 'B-': 65,
        'C+': 60, 'C': 55, 'C-': 50, 'D+': 45, 'D': 40, 'F': 0
    };
    
    let gradeChart = null;
    let semesterChart = null;
    
    // ==================== HELPER FUNCTIONS ====================
    function getSupabaseClient() {
        return window.db?.supabase || window.supabase || null;
    }
    
    async function getUserProfile() {
        if (window.currentUserProfile?.program) return window.currentUserProfile;
        if (window.db?.currentUserProfile) return window.db.currentUserProfile;
        
        // Try to get from profile module
        if (window.profileModule?.getProfile) {
            return await window.profileModule.getProfile();
        }
        
        return { 
            program: 'KRCHN', 
            intake_year: '2024', 
            full_name: 'Student Name', 
            student_id: 'NCHSM/001',
            block: 'Block 4'
        };
    }
    
    // ==================== LOAD DATA FROM EXAMS MODULE ====================
    async function loadAcademicData() {
        console.log('📡 Loading academic data from Exams module...');
        showLoadingState();
        
        // Load student info first
        await loadStudentInfo();
        
        // Try to get data from exams module
        if (window.examsModule && window.examsModule.completedExams) {
            const completedExams = window.examsModule.completedExams || [];
            const allExams = window.examsModule.allExams || [];
            
            if (completedExams.length > 0) {
                academicData.grades = completedExams.map(exam => ({
                    course_code: exam.course_code || exam.id,
                    course_name: exam.exam_name,
                    credits: 3,
                    cat1_score: exam.cat1Score,
                    cat2_score: exam.cat2Score,
                    final_score: exam.finalScore,
                    total_score: exam.totalPercentage,
                    grade: exam.gradeText,
                    semester: exam.semester || 2,
                    academic_year: exam.academic_year || '2024/2025',
                    exam_date: exam.examDate,
                    graded_date: exam.formattedGradedDate
                }));
                console.log(`✅ Loaded ${academicData.grades.length} records from Exams module`);
            }
        }
        
        // If empty, try database
        if (academicData.grades.length === 0) {
            await loadFromDatabase();
        }
        
        // Calculate all metrics
        calculateAllMetrics();
        
        // Render UI
        await renderAllReports();
        
        // Initialize charts
        initCharts();
        
        // Setup event listeners
        setupEventListeners();
    }
    
    async function loadStudentInfo() {
        const profile = await getUserProfile();
        academicData.studentInfo = {
            name: profile.full_name || profile.name || 'Student Name',
            id: profile.student_id || profile.id || 'NCHSM/STU/001',
            program: profile.program || 'KRCHN',
            intake: profile.intake_year || '2024',
            currentBlock: profile.block || profile.current_block || 'Block 4',
            profilePhoto: profile.passport_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || 'Student')}&background=4C1D95&color=fff&size=100`
        };
        
        // Update display elements
        document.getElementById('student-name-display').textContent = academicData.studentInfo.name;
        document.getElementById('student-id-display').textContent = academicData.studentInfo.id;
        document.getElementById('program-display').textContent = academicData.studentInfo.program;
        document.getElementById('intake-display').textContent = academicData.studentInfo.intake;
        document.getElementById('current-block-display').textContent = academicData.studentInfo.currentBlock;
        
        const studentAvatar = document.getElementById('student-avatar');
        if (studentAvatar) studentAvatar.src = academicData.studentInfo.profilePhoto;
    }
    
    async function loadFromDatabase() {
        const supabase = getSupabaseClient();
        if (!supabase) {
            loadSampleData();
            return;
        }
        
        const profile = await getUserProfile();
        if (!profile?.program) {
            loadSampleData();
            return;
        }
        
        try {
            const { data: grades, error } = await supabase
                .from('exam_grades')
                .select(`
                    *,
                    exams:exam_id (exam_name, exam_type, exam_date, block_term)
                `)
                .eq('student_id', profile.id || profile.user_id)
                .order('created_at', { ascending: false });
            
            if (!error && grades && grades.length > 0) {
                academicData.grades = grades.map(g => ({
                    course_code: g.exam_id,
                    course_name: g.exams?.exam_name || 'Assessment',
                    credits: 3,
                    cat1_score: g.cat_1_score,
                    cat2_score: g.cat_2_score,
                    final_score: g.exam_score,
                    total_score: g.total_score,
                    grade: g.grade,
                    semester: g.semester || 2,
                    academic_year: g.academic_year || '2024/2025'
                }));
                localStorage.setItem('nchsm_academic_grades', JSON.stringify(academicData.grades));
            } else {
                loadSampleData();
            }
        } catch (err) {
            console.error('Database error:', err);
            loadSampleData();
        }
    }
    
    function loadSampleData() {
        console.log('📋 Using sample academic data');
        academicData.grades = [
            { course_code: 'NUR 401', course_name: 'Advanced Medical-Surgical Nursing', credits: 3, cat1_score: 78, cat2_score: 82, final_score: 76, total_score: 77.4, grade: 'B+', semester: 2, academic_year: '2024/2025' },
            { course_code: 'NUR 402', course_name: 'Community Health Nursing', credits: 3, cat1_score: 85, cat2_score: 88, final_score: 82, total_score: 83.5, grade: 'A-', semester: 2, academic_year: '2024/2025' },
            { course_code: 'NUR 403', course_name: 'Mental Health Nursing', credits: 3, cat1_score: 92, cat2_score: 90, final_score: 88, total_score: 89.2, grade: 'A', semester: 2, academic_year: '2024/2025' },
            { course_code: 'NUR 404', course_name: 'Research Methods', credits: 2, cat1_score: 75, cat2_score: 78, final_score: 72, total_score: 74.1, grade: 'B', semester: 2, academic_year: '2024/2025' },
            { course_code: 'NUR 405', course_name: 'Leadership & Management', credits: 2, cat1_score: 68, cat2_score: 72, final_score: 65, total_score: 67.1, grade: 'B-', semester: 2, academic_year: '2024/2025' },
            { course_code: 'NUR 301', course_name: 'Medical-Surgical Nursing I', credits: 3, cat1_score: 72, cat2_score: 75, final_score: 70, total_score: 71.5, grade: 'B', semester: 1, academic_year: '2024/2025' },
            { course_code: 'NUR 302', course_name: 'Pharmacology', credits: 2, cat1_score: 68, cat2_score: 70, final_score: 65, total_score: 66.5, grade: 'B-', semester: 1, academic_year: '2024/2025' },
            { course_code: 'NUR 303', course_name: 'Pathophysiology', credits: 3, cat1_score: 82, cat2_score: 85, final_score: 78, total_score: 80.2, grade: 'A-', semester: 1, academic_year: '2024/2025' }
        ];
    }
    
    // ==================== CALCULATIONS ====================
    function calculateAllMetrics() {
        calculateGPA();
        calculateGradeDistribution();
        calculateTotals();
        calculateSemesterData();
        calculateYearlySummary();
    }
    
    function calculateGPA() {
        let totalPoints = 0;
        let totalCredits = 0;
        
        academicData.grades.forEach(course => {
            const points = GRADE_POINTS[course.grade] || 0;
            totalPoints += points * (course.credits || 3);
            totalCredits += (course.credits || 3);
        });
        
        academicData.cumulativeGPA = totalCredits > 0 ? parseFloat((totalPoints / totalCredits).toFixed(2)) : 0;
        
        // Calculate semester GPA (current/latest semester)
        const latestYear = academicData.grades[0]?.academic_year;
        const latestSemester = academicData.grades[0]?.semester;
        const semesterGrades = academicData.grades.filter(g => 
            g.academic_year === latestYear && g.semester === latestSemester
        );
        
        let semPoints = 0, semCredits = 0;
        semesterGrades.forEach(course => {
            semPoints += (GRADE_POINTS[course.grade] || 0) * (course.credits || 3);
            semCredits += (course.credits || 3);
        });
        academicData.semesterGPA = semCredits > 0 ? parseFloat((semPoints / semCredits).toFixed(2)) : 0;
        
        // Update GPA displays
        document.getElementById('semester-gpa').textContent = academicData.semesterGPA.toFixed(2);
        document.getElementById('cumulative-gpa').textContent = academicData.cumulativeGPA.toFixed(2);
        
        const semesterGradeLetter = getGradeLetter(academicData.semesterGPA * 25);
        const cumulativeGradeLetter = getGradeLetter(academicData.cumulativeGPA * 25);
        document.getElementById('semester-grade').textContent = semesterGradeLetter;
        document.getElementById('cumulative-grade').textContent = cumulativeGradeLetter;
    }
    
    function getGradeLetter(percentage) {
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
    
    function calculateGradeDistribution() {
        let distinction = 0, credit = 0, pass = 0, fail = 0;
        
        academicData.grades.forEach(course => {
            const grade = course.grade;
            if (grade === 'A' || grade === 'A-') distinction++;
            else if (grade === 'B+' || grade === 'B') credit++;
            else if (grade === 'B-' || grade === 'C+' || grade === 'C') pass++;
            else fail++;
        });
        
        academicData.gradeDistribution = { distinction, credit, pass, fail };
        
        // Update distribution display
        document.getElementById('distinction-count').textContent = distinction;
        document.getElementById('credit-count').textContent = credit;
        document.getElementById('pass-count').textContent = pass;
        document.getElementById('fail-count').textContent = fail;
        
        const total = academicData.grades.length;
        if (total > 0) {
            document.getElementById('distinction-bar').style.width = `${(distinction / total) * 100}%`;
            document.getElementById('credit-bar').style.width = `${(credit / total) * 100}%`;
            document.getElementById('pass-bar').style.width = `${(pass / total) * 100}%`;
            document.getElementById('fail-bar').style.width = `${(fail / total) * 100}%`;
        }
    }
    
    function calculateTotals() {
        let totalCredits = 0;
        let earnedCredits = 0;
        
        academicData.grades.forEach(course => {
            const credits = course.credits || 3;
            totalCredits += credits;
            if (course.grade !== 'F' && course.grade !== 'D' && course.grade !== 'D+') {
                earnedCredits += credits;
            }
        });
        
        academicData.totalCredits = totalCredits;
        academicData.earnedCredits = earnedCredits;
        
        document.getElementById('total-credits-earned').textContent = earnedCredits;
        document.getElementById('total-credits-attempted').textContent = totalCredits;
        document.getElementById('class-rank').textContent = academicData.classRank;
    }
    
    function calculateSemesterData() {
        const semesters = {};
        academicData.grades.forEach(course => {
            const key = `${course.academic_year} - Semester ${course.semester}`;
            if (!semesters[key]) {
                semesters[key] = { grades: [], totalPoints: 0, totalCredits: 0 };
            }
            semesters[key].grades.push(course);
            semesters[key].totalPoints += (GRADE_POINTS[course.grade] || 0) * (course.credits || 3);
            semesters[key].totalCredits += (course.credits || 3);
        });
        
        Object.keys(semesters).forEach(key => {
            semesters[key].gpa = semesters[key].totalCredits > 0 ? 
                (semesters[key].totalPoints / semesters[key].totalCredits).toFixed(2) : 0;
        });
        
        academicData.semesterData = semesters;
    }
    
    function calculateYearlySummary() {
        const years = {};
        academicData.grades.forEach(course => {
            const year = course.academic_year;
            if (!years[year]) {
                years[year] = { totalPoints: 0, totalCredits: 0, count: 0 };
            }
            years[year].totalPoints += (GRADE_POINTS[course.grade] || 0) * (course.credits || 3);
            years[year].totalCredits += (course.credits || 3);
            years[year].count++;
        });
        
        Object.keys(years).forEach(year => {
            years[year].gpa = years[year].totalCredits > 0 ? 
                (years[year].totalPoints / years[year].totalCredits).toFixed(2) : 0;
        });
        
        academicData.yearlySummary = years;
        
        // Update yearly stats for latest year
        const latestYear = Object.keys(years)[0];
        if (latestYear) {
            document.getElementById('year-gpa').textContent = years[latestYear].gpa;
            document.getElementById('year-credits').textContent = years[latestYear].totalCredits;
            document.getElementById('year-courses').textContent = years[latestYear].count;
        }
    }
    
    // ==================== CHART INITIALIZATION ====================
    function initCharts() {
        initGradeChart();
        initProgressChart();
        initSemesterTrendChart();
    }
    
    function initGradeChart() {
        const ctx = document.getElementById('grade-distribution-chart');
        if (!ctx) return;
        
        if (gradeChart) gradeChart.destroy();
        
        const distribution = academicData.gradeDistribution;
        const total = academicData.grades.length;
        
        gradeChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Distinction (A/A-)', 'Credit (B+/B)', 'Pass (B-/C+/C)', 'Fail'],
                datasets: [{
                    data: [distribution.distinction, distribution.credit, distribution.pass, distribution.fail],
                    backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#fff', font: { size: 11 } } },
                    tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.raw} (${((ctx.raw / total) * 100).toFixed(1)}%)` } }
                }
            }
        });
    }
    
    function initProgressChart() {
        const ctx = document.getElementById('semester-progress-chart');
        if (!ctx) return;
        
        const semesters = Object.keys(academicData.semesterData).slice(0, 4);
        const gpas = semesters.map(s => academicData.semesterData[s].gpa);
        
        if (semesterChart) semesterChart.destroy();
        
        semesterChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: semesters,
                datasets: [{
                    label: 'GPA',
                    data: gpas,
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    tension: 0.3,
                    fill: true,
                    pointBackgroundColor: '#c084fc',
                    pointBorderColor: '#fff',
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: { min: 0, max: 4, title: { display: true, text: 'GPA', color: '#fff' }, ticks: { color: '#fff' } },
                    x: { ticks: { color: '#fff', rotation: -30, autoSkip: true, maxRotation: -30, minRotation: -30 } }
                },
                plugins: { legend: { labels: { color: '#fff' } } }
            }
        });
    }
    
    function initSemesterTrendChart() {
        // Already handled by initProgressChart
    }
    
    // ==================== RENDER FUNCTIONS ====================
    async function renderAllReports() {
        renderSemesterReport();
        renderTranscript();
        renderCourseProgress();
        renderYearlySummary();
    }
    
    function renderSemesterReport() {
        const tbody = document.getElementById('grades-table-body');
        if (!tbody) return;
        
        if (academicData.grades.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="empty-state">No grade data available</td></tr>';
            return;
        }
        
        tbody.innerHTML = academicData.grades.map(course => `
            <tr>
                <td><strong>${escapeHtml(course.course_code)}</strong></td>
                <td>${escapeHtml(course.course_name)}</td>
                <td class="text-center">${course.credits || 3}</td>
                <td class="text-center">${course.cat1_score ? course.cat1_score + '%' : '--'}</td>
                <td class="text-center">${course.cat2_score ? course.cat2_score + '%' : '--'}</td>
                <td class="text-center">${course.final_score ? course.final_score + '%' : '--'}</td>
                <td class="text-center"><strong>${course.total_score ? course.total_score.toFixed(1) + '%' : '--'}</strong></td>
                <td class="text-center"><span class="grade-badge grade-${getGradeClass(course.grade)}">${course.grade}</span></td>
                <td class="text-center"><span class="status-badge ${course.total_score >= 60 ? 'status-pass' : 'status-fail'}">${course.total_score >= 60 ? 'Passed' : 'Failed'}</span></td>
            </tr>
        `).join('');
    }
    
    function renderTranscript() {
        const tbody = document.getElementById('transcript-table-body');
        if (!tbody) return;
        
        if (academicData.grades.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No transcript data available</td></tr>';
            return;
        }
        
        let html = '';
        let currentYear = '';
        
        academicData.grades.forEach(course => {
            const yearSem = `${course.academic_year} - Semester ${course.semester}`;
            if (yearSem !== currentYear) {
                currentYear = yearSem;
                html += `<tr class="semester-header"><td colspan="6"><strong>📚 ${escapeHtml(currentYear)}</strong></td></tr>`;
            }
            html += `
                <tr>
                    <td>${escapeHtml(yearSem)}</td>
                    <td>${escapeHtml(course.course_code)}</td>
                    <td>${escapeHtml(course.course_name)}</td>
                    <td class="text-center">${course.credits || 3}</td>
                    <td class="text-center"><span class="grade-badge grade-${getGradeClass(course.grade)}">${course.grade}</span></td>
                    <td class="text-center">${(GRADE_POINTS[course.grade] || 0).toFixed(1)}</td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
        
        document.getElementById('total-attempted').textContent = academicData.totalCredits;
        document.getElementById('total-earned').textContent = academicData.earnedCredits;
        document.getElementById('transcript-cgpa').textContent = academicData.cumulativeGPA.toFixed(2);
    }
    
    function renderCourseProgress() {
        const progressList = document.getElementById('course-progress-list');
        if (!progressList) return;
        
        if (academicData.grades.length === 0) {
            progressList.innerHTML = '<div class="empty-state">No course progress data available</div>';
            return;
        }
        
        const completed = academicData.grades.filter(c => c.total_score >= 60).length;
        const total = academicData.grades.length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        document.getElementById('completed-courses-progress').textContent = completed;
        document.getElementById('total-courses-progress').textContent = total;
        
        // Update progress circle
        const circle = document.querySelector('#progress-report .progress-circle svg circle:last-child');
        if (circle) {
            const circumference = 2 * Math.PI * 45;
            const offset = circumference - (percentage / 100) * circumference;
            circle.style.strokeDasharray = circumference;
            circle.style.strokeDashoffset = offset;
        }
        document.querySelector('#progress-report .progress-circle text').textContent = `${percentage}%`;
        
        progressList.innerHTML = academicData.grades.map(course => {
            const score = course.total_score || 0;
            let color = '#ef4444';
            if (score >= 75) color = '#10b981';
            else if (score >= 60) color = '#3b82f6';
            else if (score >= 50) color = '#f59e0b';
            
            return `
                <div class="progress-item">
                    <div class="progress-header">
                        <span class="course-name">${escapeHtml(course.course_name)} (${escapeHtml(course.course_code)})</span>
                        <span class="progress-percent">${score.toFixed(1)}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${score}%; background: ${color};"></div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    function renderYearlySummary() {
        const yearSelect = document.getElementById('year-filter');
        if (!yearSelect) return;
        
        const years = Object.keys(academicData.yearlySummary);
        yearSelect.innerHTML = years.map(year => `<option value="${year}">${year} Academic Year</option>`).join('');
        
        const latestYear = years[0];
        if (latestYear) {
            document.getElementById('year-gpa').textContent = academicData.yearlySummary[latestYear].gpa;
            document.getElementById('year-credits').textContent = academicData.yearlySummary[latestYear].totalCredits;
            document.getElementById('year-courses').textContent = academicData.yearlySummary[latestYear].count;
        }
    }
    
    function getGradeClass(grade) {
        if (!grade) return 'default';
        const g = grade.toUpperCase();
        if (g === 'A' || g === 'A-') return 'A';
        if (g === 'B+' || g === 'B') return 'B';
        if (g === 'B-' || g === 'C+' || g === 'C') return 'C';
        return 'F';
    }
    
    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
    
    function showLoadingState() {
        const tables = ['grades-table-body', 'transcript-table-body', 'course-progress-list'];
        tables.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '<tr><td colspan="9" class="loading-state"><div class="loading-spinner"></div> Loading data...</td></tr>';
        });
    }
    
    // ==================== EVENT LISTENERS ====================
    function setupEventListeners() {
        // Semester filter change
        const semesterFilter = document.getElementById('semester-filter');
        if (semesterFilter) {
            semesterFilter.addEventListener('change', () => filterBySemester(semesterFilter.value));
        }
        
        // Year filter change
        const yearFilter = document.getElementById('year-filter');
        if (yearFilter) {
            yearFilter.addEventListener('change', () => filterByYear(yearFilter.value));
        }
        
        // Refresh button
        const refreshBtn = document.getElementById('refresh-report');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => loadAcademicData());
        }
        
        // Download PDF button
        const downloadBtn = document.getElementById('download-transcript-pdf');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', downloadTranscriptPDF);
        }
        
        // Print button
        const printBtn = document.getElementById('print-report');
        if (printBtn) {
            printBtn.addEventListener('click', () => window.print());
        }
        
        // Tab switching
        document.querySelectorAll('.report-tab').forEach(tab => {
            tab.addEventListener('click', function() {
                document.querySelectorAll('.report-tab').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                const reportType = this.getAttribute('data-report');
                document.querySelectorAll('.report-content').forEach(content => content.style.display = 'none');
                const target = document.getElementById(`${reportType}-report`);
                if (target) target.style.display = 'block';
                
                // Refresh chart when switching to semester report
                if (reportType === 'semester' && gradeChart) {
                    setTimeout(() => gradeChart.update(), 100);
                }
            });
        });
    }
    
    function filterBySemester(semester) {
        console.log('Filtering by semester:', semester);
        // Implement semester filtering if needed
    }
    
    function filterByYear(year) {
        document.getElementById('year-gpa').textContent = academicData.yearlySummary[year]?.gpa || '--';
        document.getElementById('year-credits').textContent = academicData.yearlySummary[year]?.totalCredits || 0;
        document.getElementById('year-courses').textContent = academicData.yearlySummary[year]?.count || 0;
    }
    
    function downloadTranscriptPDF() {
        alert('📄 PDF Transcript feature coming soon. Your transcript data is ready for download.');
        // PDF generation can be added here
    }
    
    // ==================== EXPORTS ====================
    window.academicReportsModule = {
        loadReports: loadAcademicData,
        refresh: loadAcademicData,
        getData: () => academicData
    };
    
    // Listen for exams module ready event
    document.addEventListener('examsModuleReady', () => {
        console.log('🔄 Exams module ready, refreshing reports...');
        setTimeout(() => loadAcademicData(), 500);
    });
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(loadAcademicData, 500));
    } else {
        setTimeout(loadAcademicData, 500);
    }
    
    console.log('✅ Academic Reports Module Ready!');
})();
