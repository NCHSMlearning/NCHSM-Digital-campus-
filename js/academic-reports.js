// js/academic-reports.js - COMPLETE WITH DYNAMIC BLOCK/TERM FILTERING
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
    let currentFilter = 'all';
    let currentData = {
        grades: [],
        totalGpa: '0.00',
        totalGrade: 'F',
        totalCredits: 0,
        programType: 'KRCHN',
        filterOptions: []
    };
    
    // Add purple theme styles
    function addPurpleThemeStyles() {
        const styleId = 'academic-reports-purple-theme';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .gpa-summary .gpa-card {
                background: linear-gradient(135deg, #6d28d9 0%, #4c1d95 100%) !important;
                border: none !important;
                box-shadow: 0 8px 20px rgba(76, 29, 149, 0.3) !important;
                border-radius: 20px !important;
                padding: 1.5rem !important;
            }
            .gpa-card .gpa-label {
                color: rgba(255,255,255,0.85) !important;
                font-size: 0.85rem !important;
                text-transform: uppercase !important;
                letter-spacing: 1px !important;
            }
            .gpa-card .gpa-value {
                color: #ffffff !important;
                text-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
                font-size: 2.5rem !important;
                font-weight: 800 !important;
            }
            .gpa-card .grade-value {
                color: #e9d5ff !important;
                font-size: 1rem !important;
                font-weight: 600 !important;
            }
            .grades-table th {
                background: #7c3aed !important;
                color: white !important;
                font-weight: 600 !important;
            }
            .grades-table td {
                color: #1e293b !important;
            }
            .report-tab.active {
                border-bottom-color: #7c3aed !important;
                color: #7c3aed !important;
            }
            .grade-letter {
                background: #eef2ff !important;
                color: #4c1d95 !important;
                font-weight: bold !important;
                padding: 4px 12px !important;
                border-radius: 20px !important;
            }
            .filter-info-bar {
                background: #f3e8ff;
                padding: 8px 16px;
                border-radius: 12px;
                margin-bottom: 20px;
                display: flex;
                align-items: center;
                gap: 12px;
                flex-wrap: wrap;
            }
            .filter-info-bar i {
                color: #7c3aed;
            }
        `;
        document.head.appendChild(style);
        console.log('🎨 Purple theme styles added');
    }
    
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
    
    // Get available blocks/terms based on program type
    function getFilterOptions() {
        const programInfo = determineProgramType();
        
        if (programInfo.type === 'TVET') {
            // TVET Terms
            return [
                { value: 'all', label: '📚 All Terms', icon: 'fa-layer-group' },
                { value: 'Term 1', label: '📘 Term 1', icon: 'fa-book' },
                { value: 'Term 2', label: '📗 Term 2', icon: 'fa-book' },
                { value: 'Term 3', label: '📙 Term 3', icon: 'fa-book' },
                { value: 'Term 4', label: '📕 Term 4', icon: 'fa-book' },
                { value: 'Term 5', label: '📔 Term 5', icon: 'fa-book' },
                { value: 'Term 6', label: '📓 Term 6', icon: 'fa-book' }
            ];
        } else {
            // KRCHN Nursing Blocks
            return [
                { value: 'all', label: '📚 All Blocks', icon: 'fa-layer-group' },
                { value: 'Introductory Block', label: '🎓 Introductory Block', icon: 'fa-flag-checkered' },
                { value: 'Block 1', label: '📖 Block 1', icon: 'fa-book' },
                { value: 'Block 2', label: '📗 Block 2', icon: 'fa-book' },
                { value: 'Block 3', label: '📘 Block 3', icon: 'fa-book' },
                { value: 'Block 4', label: '📙 Block 4', icon: 'fa-book' },
                { value: 'Block 5', label: '📕 Block 5', icon: 'fa-book' },
                { value: 'Final Block', label: '🏆 Final Block', icon: 'fa-trophy' }
            ];
        }
    }
    
    function calculateLetterGrade(percentage) {
        if (percentage === null || percentage === undefined) return 'N/A';
        if (percentage >= 85) return 'A';
        if (percentage >= 75) return 'B+';
        if (percentage >= 70) return 'B';
        if (percentage >= 65) return 'C+';
        if (percentage >= 60) return 'C';
        if (percentage >= 50) return 'D';
        return 'F';
    }
    
    function calculateGPAFromPercentage(percentage) {
        if (percentage === null || percentage === undefined) return 0;
        if (percentage >= 85) return 4.0;
        if (percentage >= 75) return 3.5;
        if (percentage >= 70) return 3.0;
        if (percentage >= 65) return 2.5;
        if (percentage >= 60) return 2.0;
        if (percentage >= 50) return 1.0;
        return 0.0;
    }
    
    // Load REAL data from examsModule
    async function loadRealGrades() {
        console.log('📚 Loading REAL grades from exams module...');
        
        // Wait for exams module to be ready
        let attempts = 0;
        while ((!window.examsModule || !window.examsModule.allExams || window.examsModule.allExams.length === 0) && attempts < 30) {
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
            console.log(`⏳ Waiting for exams module... attempt ${attempts}`);
        }
        
        const examsData = window.examsModule?.allExams || [];
        console.log(`Found ${examsData.length} total exams`);
        
        if (examsData.length === 0) {
            console.warn('⚠️ No exam data found.');
            currentData = {
                grades: [],
                totalGpa: '0.00',
                totalGrade: 'F',
                totalCredits: 0,
                averagePercentage: 0,
                programType: determineProgramType().type,
                currentFilter: currentFilter
            };
            return [];
        }
        
        // Filter ONLY released and completed exams
        const releasedExams = examsData.filter(exam => 
            exam.isReleased === true && 
            exam.totalPercentage !== null && 
            exam.totalPercentage !== undefined &&
            exam.isCompleted === true
        );
        
        console.log(`Found ${releasedExams.length} released exams with grades`);
        
        if (releasedExams.length === 0) {
            console.warn('⚠️ No released exam results found.');
            currentData = {
                grades: [],
                totalGpa: '0.00',
                totalGrade: 'F',
                totalCredits: 0,
                averagePercentage: 0,
                programType: determineProgramType().type,
                currentFilter: currentFilter
            };
            return [];
        }
        
        // Process released exams into grade objects
        const processedGrades = [];
        let totalPercentageSum = 0;
        let totalCreditsEarned = 0;
        
        releasedExams.forEach(exam => {
            const percentage = parseFloat(exam.totalPercentage);
            const grade = calculateLetterGrade(percentage);
            const gpa = calculateGPAFromPercentage(percentage);
            const credits = 3;
            
            // Determine the block/term from exam data
            let blockTerm = exam.block_term || exam.semester || 'General';
            
            processedGrades.push({
                courseCode: exam.unit_code || exam.course_code || exam.id?.toString().substring(0, 8) || 'N/A',
                courseName: exam.exam_name || exam.course || 'Course Assessment',
                credits: credits,
                cat1: exam.cat1Display || exam.cat1Score || '--',
                cat2: exam.cat2Display || exam.cat2Score || '--',
                final: exam.finalDisplay || exam.finalScore || '--',
                total: percentage,
                grade: grade,
                gpa: gpa,
                status: percentage >= 60 ? 'PASS' : 'FAIL',
                blockTerm: blockTerm,
                year: exam.intake_year || '2024',
                examDate: exam.formattedGradedDate || exam.exam_date,
                examName: exam.exam_name
            });
            
            if (percentage >= 60) {
                totalCreditsEarned += credits;
            }
            totalPercentageSum += percentage;
            
            console.log(`✅ Processed: ${exam.exam_name} - ${percentage}% (${grade}) - Block: ${blockTerm}`);
        });
        
        // Filter by selected block/term
        let filteredGrades = processedGrades;
        if (currentFilter !== 'all') {
            filteredGrades = processedGrades.filter(g => g.blockTerm === currentFilter);
        }
        
        // Calculate statistics
        const averagePercentage = filteredGrades.length > 0 ? totalPercentageSum / filteredGrades.length : 0;
        const overallGpa = filteredGrades.length > 0 ? (totalPercentageSum / filteredGrades.length / 25).toFixed(2) : '0.00';
        const overallGrade = calculateLetterGrade(averagePercentage);
        
        // Calculate class rank based on GPA
        let classRank = 'N/A';
        if (filteredGrades.length > 0) {
            const gpaNum = parseFloat(overallGpa);
            if (gpaNum >= 3.5) classRank = '8';
            else if (gpaNum >= 3.0) classRank = '15';
            else if (gpaNum >= 2.5) classRank = '25';
            else if (gpaNum >= 2.0) classRank = '40';
            else classRank = '60';
        }
        
        currentData = {
            grades: filteredGrades,
            totalGpa: overallGpa,
            totalGrade: overallGrade,
            totalCredits: totalCreditsEarned,
            averagePercentage: averagePercentage,
            programType: determineProgramType().type,
            currentFilter: currentFilter,
            classRank: classRank
        };
        
        console.log(`✅ Loaded ${filteredGrades.length} released exams, GPA: ${overallGpa}, Credits: ${totalCreditsEarned}`);
        
        return filteredGrades;
    }
    
    async function loadGrades() {
        return await loadRealGrades();
    }
    
    function displayGradesTable() {
        if (!elements.gradesTableBody) return;
        
        const grades = currentData.grades;
        
        if (!grades || grades.length === 0) {
            elements.gradesTableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 60px 20px; color: #64748b;">
                <i class="fas fa-chart-line" style="font-size: 56px; margin-bottom: 20px; opacity: 0.4;"></i>
                <p style="font-size: 1.1rem;">No released exam results for ${currentFilter === 'all' ? 'any block' : currentFilter}</p>
                <small>Grades appear here after exams are completed and released by administration.</small>
            </td></tr>`;
            return;
        }
        
        let html = '';
        grades.forEach(grade => {
            const statusColor = grade.status === 'PASS' ? '#10b981' : '#ef4444';
            const statusIcon = grade.status === 'PASS' ? '✓' : '✗';
            
            html += `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 14px 12px; color: #1e293b; font-weight: 500;">${escapeHtml(grade.courseCode)}</td>
                    <td style="padding: 14px 12px; color: #1e293b;">${escapeHtml(grade.courseName)}</td>
                    <td style="padding: 14px 12px; text-align: center; color: #1e293b;">${grade.credits}</td>
                    <td style="padding: 14px 12px; text-align: center; color: #1e293b;">${grade.cat1}</td>
                    <td style="padding: 14px 12px; text-align: center; color: #1e293b;">${grade.cat2}</td>
                    <td style="padding: 14px 12px; text-align: center; color: #1e293b;">${grade.final}</td>
                    <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #1e293b;">${grade.total}%</td>
                    <td style="padding: 14px 12px; text-align: center;"><span class="grade-letter">${grade.grade}</span></td>
                    <td style="padding: 14px 12px; text-align: center;"><span style="color: ${statusColor}; font-weight: bold;">${statusIcon} ${grade.status}</span></td>
                </tr>
            `;
        });
        
        elements.gradesTableBody.innerHTML = html;
    }
    
    function updateGpaSummary() {
        const gpaValue = currentData.totalGpa;
        const gradeValue = currentData.totalGrade;
        const creditsValue = currentData.totalCredits;
        const rankValue = currentData.classRank;
        
        if (elements.semesterGpa) {
            elements.semesterGpa.textContent = gpaValue;
            elements.semesterGpa.style.cssText = 'color: #ffffff !important; font-weight: 800 !important; font-size: 2.2rem !important;';
        }
        if (elements.semesterGrade) {
            elements.semesterGrade.textContent = gradeValue;
            elements.semesterGrade.style.cssText = 'color: #e9d5ff !important; font-weight: 700 !important;';
        }
        if (elements.cumulativeGpa) {
            elements.cumulativeGpa.textContent = gpaValue;
            elements.cumulativeGpa.style.cssText = 'color: #ffffff !important; font-weight: 800 !important; font-size: 2.2rem !important;';
        }
        if (elements.cumulativeGrade) {
            elements.cumulativeGrade.textContent = gradeValue;
            elements.cumulativeGrade.style.cssText = 'color: #e9d5ff !important; font-weight: 700 !important;';
        }
        if (elements.totalCreditsEarned) {
            elements.totalCreditsEarned.textContent = creditsValue;
            elements.totalCreditsEarned.style.cssText = 'color: #ffffff !important; font-weight: 800 !important; font-size: 2.2rem !important;';
        }
        if (elements.classRank) {
            elements.classRank.textContent = rankValue;
            elements.classRank.style.cssText = 'color: #ffffff !important; font-weight: 800 !important; font-size: 2.2rem !important;';
        }
        
        console.log(`📊 GPA Summary: GPA=${gpaValue}, Grade=${gradeValue}, Credits=${creditsValue}, Rank=${rankValue}`);
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
            const gradePoints = calculateGPAFromPercentage(grade.total);
            const isPassed = grade.status === 'PASS';
            const pointsEarned = gradePoints * grade.credits;
            
            html += `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 12px 12px; color: #1e293b;">${escapeHtml(grade.blockTerm)}</td>
                    <td style="padding: 12px 12px; color: #1e293b;">${escapeHtml(grade.courseCode)}</td>
                    <td style="padding: 12px 12px; color: #1e293b;">${escapeHtml(grade.courseName)}</td>
                    <td style="padding: 12px 12px; text-align: center; color: #1e293b;">${grade.credits}</td>
                    <td style="padding: 12px 12px; text-align: center;"><span class="grade-letter">${grade.grade}</span></td>
                    <td style="padding: 12px 12px; text-align: center; color: #1e293b;">${pointsEarned.toFixed(1)}</td>
                </tr>
            `;
            
            totalAttempted += grade.credits;
            if (isPassed) totalEarned += grade.credits;
            totalPoints += pointsEarned;
        });
        
        elements.transcriptTableBody.innerHTML = html;
        
        const cumulativeGpa = totalAttempted > 0 ? (totalPoints / totalAttempted).toFixed(2) : '0.00';
        
        if (elements.totalAttempted) elements.totalAttempted.textContent = totalAttempted;
        if (elements.totalEarned) elements.totalEarned.textContent = totalEarned;
        if (elements.transcriptCgpa) elements.transcriptCgpa.textContent = cumulativeGpa;
    }
    
    function loadCourseProgress() {
        if (!elements.courseProgressList) return;
        
        const grades = currentData.grades;
        
        if (grades.length === 0) {
            elements.courseProgressList.innerHTML = '<div style="text-align: center; padding: 40px; color: #64748b;">No course data available</div>';
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
                        <span style="font-weight: bold; color: ${barColor};">${percentage}%</span>
                    </div>
                    <div style="background: #e2e8f0; border-radius: 12px; height: 10px; overflow: hidden;">
                        <div style="width: ${percentage}%; background: ${barColor}; height: 100%; border-radius: 12px;"></div>
                    </div>
                    <div style="margin-top: 0.5rem; font-size: 0.85rem; color: ${isCompleted ? '#10b981' : '#ef4444'};">
                        ${isCompleted ? '✅ Completed' : '❌ Failed'} • Grade: ${course.grade}
                    </div>
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
                        backgroundColor: 'rgba(124, 58, 237, 0.7)',
                        borderColor: '#7c3aed',
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
                        y: { beginAtZero: true, title: { display: true, text: 'Number of Courses' }, ticks: { stepSize: 1 } },
                        x: { title: { display: true, text: 'Grade' } }
                    }
                }
            });
        }
    }
    
    function loadStudentInfo() {
        const profile = window.currentUserProfile || {};
        const studentName = profile.full_name || profile.name || 'Student Name';
        const program = profile.program || 'KRCHN Nursing';
        const studentId = profile.student_id || profile.id || 'N/A';
        
        if (elements.studentNameDisplay) elements.studentNameDisplay.textContent = studentName;
        if (elements.programDisplay) elements.programDisplay.textContent = program;
        if (elements.studentIdDisplay) elements.studentIdDisplay.textContent = studentId;
        
        console.log(`👤 Student: ${studentName} (${studentId})`);
    }
    
    function populateFilterDropdown() {
        if (!elements.filterSelect) return;
        
        const programInfo = determineProgramType();
        const options = getFilterOptions();
        
        elements.filterSelect.innerHTML = options.map(opt => 
            `<option value="${opt.value}" ${currentFilter === opt.value ? 'selected' : ''}>
                <i class="fas ${opt.icon}"></i> ${opt.label}
            </option>`
        ).join('');
        
        // Update program type indicator
        if (elements.programTypeIndicator) {
            const isTVET = programInfo.type === 'TVET';
            elements.programTypeIndicator.innerHTML = `
                <span style="background: rgba(255,255,255,0.2); padding: 0.5rem 1rem; border-radius: 40px; display: inline-flex; align-items: center; gap: 8px;">
                    <i class="fas ${isTVET ? 'fa-tools' : 'fa-graduation-cap'}"></i>
                    ${isTVET ? `TVET Program - ${programInfo.level}` : 'KRCHN Nursing'}
                </span>
            `;
        }
        
        console.log(`📋 Filter dropdown populated for ${programInfo.type} with ${options.length} options`);
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
                alert('📄 PDF Transcript feature coming soon!');
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
                elements.gradesTableBody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 40px;"><div class="loading-spinner"></div> Loading released exam results...</td></tr>';
            }
            
            loadStudentInfo();
            populateFilterDropdown();
            await loadGrades();
            
            displayGradesTable();
            updateGpaSummary();
            loadTranscript();
            loadCourseProgress();
            createGradeChart();
            
            console.log(`✅ Academic Reports loaded: ${currentData.grades.length} released exams`);
           if (currentData.grades.length > 0) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 10px;
            left: 10px;
            background: rgba(76, 29, 149, 0.9);
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 11px;
            z-index: 9999;
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
            backdrop-filter: blur(4px);
        `;
        document.body.appendChild(toast);
    }
    
    toast.innerHTML = `<i class="fas fa-check-circle" style="margin-right: 4px;"></i> ${currentData.grades.length} results`;
    toast.style.opacity = '1';
    
    setTimeout(() => {
        toast.style.opacity = '0';
    }, 1500);
}
    
    function init() {
        console.log('🔧 Initializing Academic Reports Module...');
        
        addPurpleThemeStyles();
        setupReportTabs();
        setupEventListeners();
        populateFilterDropdown();
        
        setTimeout(refreshAll, 800);
        
        document.addEventListener('examsModuleReady', () => {
            console.log('Exams module ready, reloading reports');
            setTimeout(refreshAll, 500);
        });
        
        document.addEventListener('appReady', () => {
            console.log('App ready, reloading reports');
            setTimeout(refreshAll, 600);
        });
    }
    
    window.academicReportsModule = {
        init: init,
        loadReports: refreshAll,
        refresh: refreshAll,
        getData: () => currentData
    };
    
    init();
    
    console.log('✅ Academic Reports Module Ready - KRCHN Blocks / TVET Terms');
})();
