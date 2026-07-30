// js/academic-reports.js - COMPLETE STUDENT VERSION
// All tabs: Semester Report, Yearly Summary, Full Transcript, Course Progress, My Marks
// INCLUDES: Report Card Download Functionality
(function() {
    'use strict';
    
    console.log('📊 Student Academic Reports Module Loading...');

    // ============================================================
    // 1. PROGRAM DETECTION
    // ============================================================
    const PROGRAM = {
        isTVET: function(programCode) {
            if (!programCode) return false;
            const code = String(programCode).toUpperCase().trim();
            const tvetCodes = ['DPOTT','DCH','DHRIT','DSL','DSW','DCJS','DHSS','DICT','DME',
                               'CPOTT','CCH','CHRIT','CPC','CSL','CSW','CCJS','CAG','CHSS','CICT',
                               'ACH','AAG','ASW','CCA','PTE'];
            return tvetCodes.includes(code);
        },
        
        getBlockLabel: function(programCode) {
            return this.isTVET(programCode) ? 'Term' : 'Block';
        },
        
        getBlockOptions: function(programCode) {
            if (this.isTVET(programCode)) {
                return ['Introductory', 'Term 1', 'Term 2', 'Term 3', 'Term 4', 'Term 5', 'Term 6', 'Final'];
            }
            return ['Introductory', 'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Final'];
        }
    };

    // ============================================================
    // 2. UNIT CODE MAPPING
    // ============================================================
    const UNIT_CODE_MAP = {
        'Medical Surgical Nursing II: Renal & Genito-Urinary Diseases': 'NCHSGN 203',
        'Medical Surgical Nursing II: Gastrointestinal, Hepatobiliary Diseases': 'NCHSGN 201',
        'Medical Surgical Nursing II: Orodental Nursing': 'NCHSGN 202',
        'Medical Surgical Nursing III: Endocrine Diseases': 'NCHSGN 209',
        'Medical Surgical Nursing III: Neurological Disorders': 'NCHSGN 210',
        'Fundamentals of Nursing': 'NUR101',
        'Anatomy and Physiology': 'NUR102',
        'Pharmacology Basics': 'NUR103',
        'Medical-Surgical Nursing I': 'NUR104',
        'Community Health Nursing': 'NUR105',
        'Maternal & Child Health': 'NUR106',
        'Occupational Health & Safety': 'TVT101',
        'Workshop Practice': 'TVT102',
        'Technical Drawing': 'TVT103',
        'Electrical Principles': 'TVT104',
        'Mechanical Engineering': 'TVT105',
        'Industrial Management': 'TVT106'
    };

    function getUnitCode(subjectName) {
        if (!subjectName) return 'N/A';
        
        if (UNIT_CODE_MAP[subjectName]) {
            return UNIT_CODE_MAP[subjectName];
        }
        
        if (subjectName.includes('Medical Surgical Nursing II:')) {
            const specialty = subjectName.split(':')[1]?.trim() || '';
            if (specialty.includes('Renal')) return 'NCHSGN 203';
            if (specialty.includes('Gastrointestinal') || specialty.includes('Hepatobiliary')) return 'NCHSGN 201';
            if (specialty.includes('Orodental')) return 'NCHSGN 202';
            return 'NCHSGN 2XX';
        }
        
        if (subjectName.includes('Medical Surgical Nursing III:')) {
            const specialty = subjectName.split(':')[1]?.trim() || '';
            if (specialty.includes('Endocrine')) return 'NCHSGN 209';
            if (specialty.includes('Neurological')) return 'NCHSGN 210';
            return 'NCHSGN 2XX';
        }
        
        const words = subjectName.split(' ');
        if (words.length === 1) {
            return subjectName.substring(0, 6).toUpperCase();
        }
        const code = words.map(w => w[0]).join('').toUpperCase();
        return code.length > 6 ? code.substring(0, 6) : code;
    }

    // ============================================================
    // 3. UTILITY FUNCTIONS
    // ============================================================
    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function getGradeColor(grade) {
        const colors = {
            'A': '#10b981',
            'B': '#3b82f6',
            'C': '#f59e0b',
            'D': '#ef4444'
        };
        return colors[grade] || '#6b7280';
    }

    // ============================================================
    // 4. GRADING FUNCTIONS (A: 75-100%, B: 65-74%, C: 60-64%, D: Below 60%)
    // ============================================================
    function calculateGrade(score) {
        if (score === null || score === undefined || score === 0) return 'N/A';
        if (score >= 75) return 'A';
        if (score >= 65) return 'B';
        if (score >= 60) return 'C';
        return 'D';
    }

    function calculatePoints(grade) {
        const points = {
            'A': 4.0,
            'B': 3.0,
            'C': 2.0,
            'D': 0.0
        };
        return points[grade] || 0.0;
    }

    function calculateGPA(marks) {
        if (!marks || marks.length === 0) return 0;
        const totalPoints = marks.reduce((sum, m) => sum + (m.points || 0), 0);
        return totalPoints / marks.length;
    }

    // ============================================================
    // 5. GRADING STATUS HELPER
    // ============================================================
    function getGradingStatus(score) {
        if (score === null || score === undefined || score === 0) return 'PENDING';
        if (score >= 75) return 'DISTINCTION';
        if (score >= 65) return 'CREDIT';
        if (score >= 60) return 'PASS';
        return 'FAIL';
    }

    function getStatusColor(status) {
        const colors = {
            'DISTINCTION': '#10b981',
            'CREDIT': '#3b82f6',
            'PASS': '#f59e0b',
            'FAIL': '#dc2626',
            'PENDING': '#94a3b8'
        };
        return colors[status] || '#94a3b8';
    }

    // ============================================================
    // 6. GENERATE SAMPLE GRADES (Fallback)
    // ============================================================
    function generateSampleGrades() {
        const user = window.currentUserProfile || {};
        const isTVET = PROGRAM.isTVET(user.program);
        
        const courses = isTVET ? [
            { code: 'TVT101', name: 'Occupational Health & Safety', block: 'Term 1' },
            { code: 'TVT102', name: 'Workshop Practice', block: 'Term 1' },
            { code: 'TVT103', name: 'Technical Drawing', block: 'Term 2' },
            { code: 'TVT104', name: 'Electrical Principles', block: 'Term 2' },
            { code: 'TVT105', name: 'Mechanical Engineering', block: 'Term 3' },
            { code: 'TVT106', name: 'Industrial Management', block: 'Term 3' }
        ] : [
            { code: 'NUR101', name: 'Fundamentals of Nursing', block: 'Introductory' },
            { code: 'NUR102', name: 'Anatomy & Physiology', block: 'Introductory' },
            { code: 'NUR103', name: 'Pharmacology Basics', block: 'Block 1' },
            { code: 'NUR104', name: 'Medical-Surgical Nursing I', block: 'Block 1' },
            { code: 'NUR105', name: 'Community Health Nursing', block: 'Block 2' },
            { code: 'NUR106', name: 'Maternal & Child Health', block: 'Block 2' }
        ];
        
        return courses.map((course) => {
            const base = 65 + Math.random() * 30;
            const score = Math.min(99, Math.round(base * 10) / 10);
            const grade = calculateGrade(score);
            const points = calculatePoints(grade);
            
            return {
                courseCode: course.code,
                courseName: course.name,
                credits: 3,
                cat1: Math.round(15 + Math.random() * 15),
                cat2: Math.round(15 + Math.random() * 15),
                final: Math.round(40 + Math.random() * 40),
                total: score,
                grade: grade,
                points: points,
                status: score >= 60 ? 'PASS' : 'FAIL',
                blockTerm: course.block,
                year: '2024',
                examDate: '2024-01-15'
            };
        });
    }

    // ============================================================
    // 7. MY MARKS - STATE & FUNCTIONS
    // ============================================================
    let myMarksData = [];
    let myMarksFiltered = [];

    function getDemoMarks(program) {
        const isTVET = PROGRAM.isTVET(program);
        
        if (isTVET) {
            return [
                { id: 101, admission_number: 'TVET/001/2025', student_name: 'Student', subject_name: 'Occupational Health & Safety', program: program, block: 'Term 1', year: '2025', cat1_score: 16, cat2_score: 18, exam_score: 45, final_score: 79, grade: 'B', points: 3.0, published: true, published_at: '2025-01-15', assessment_type: 'full', academic_year: '2025' }
            ];
        }
        
        return [
            { id: 1, admission_number: 'NCHSM/KRCHN/0139/03/26', student_name: 'Gigen Mochiri', subject_name: 'Fundamentals of Nursing', program: 'KRCHN', block: 'Introductory', year: '2025', cat1_score: 18, cat2_score: 19, exam_score: 55, final_score: 92, grade: 'A', points: 4.0, published: true, published_at: '2025-01-15', assessment_type: 'full', academic_year: '2025' },
            { id: 2, admission_number: 'NCHSM/KRCHN/0139/03/26', student_name: 'Gigen Mochiri', subject_name: 'Anatomy and Physiology', program: 'KRCHN', block: 'Introductory', year: '2025', cat1_score: 15, cat2_score: 16, exam_score: 48, final_score: 79, grade: 'B', points: 3.0, published: true, published_at: '2025-01-15', assessment_type: 'full', academic_year: '2025' }
        ];
    }

    async function loadMyMarks() {
        const tbody = document.getElementById('my_marks_table_body');
        if (!tbody) return;
        
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px;">
                    <div class="loading-spinner"></div>
                    <p style="margin-top: 10px; color: #94a3b8;">Loading your marks...</p>
                </td>
            </tr>
        `;
        
        try {
            const user = window.currentUserProfile || window.db?.currentUserProfile;
            if (!user) {
                tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px; color: #dc2626;">Please log in to view your marks</td></tr>`;
                return;
            }
            
            const registrationNumber = user.student_id || user.admission_number || user.user_id;
            
            // Update student info
            const nameEl = document.getElementById('my_marks_student_name');
            if (nameEl) nameEl.textContent = user.full_name || 'Student';
            
            const admissionEl = document.getElementById('my_marks_admission');
            if (admissionEl) admissionEl.textContent = registrationNumber || '-';
            
            const programEl = document.getElementById('my_marks_program');
            if (programEl) programEl.textContent = user.program || '-';
            
            const academicYearEl = document.getElementById('my_marks_academic_year');
            if (academicYearEl) academicYearEl.textContent = user.academic_year || user.intake_year || '2025';
            
            const blockLabel = PROGRAM.getBlockLabel(user.program);
            const headerEl = document.querySelector('#my_marks_table_body')?.closest('table')?.querySelector('th:nth-child(3)');
            if (headerEl) headerEl.textContent = blockLabel;
            
            populateMyMarksBlockFilter(user.program);
            
            let marks = [];
            try {
                const result = await window.db.supabase
                    .from('student_marks')
                    .select('*')
                    .eq('admission_number', registrationNumber)
                    .eq('published', true)
                    .order('published_at', { ascending: false });
                
                if (!result.error && result.data && result.data.length > 0) {
                    marks = result.data;
                    
                    try {
                        const catalogResult = await window.db.supabase
                            .from('units_catalog')
                            .select('unit_name, unit_code, credits')
                            .in('unit_name', marks.map(m => m.subject_name));
                        
                        if (!catalogResult.error && catalogResult.data) {
                            const unitMap = {};
                            catalogResult.data.forEach(u => {
                                unitMap[u.unit_name] = {
                                    unit_code: u.unit_code,
                                    credits: u.credits
                                };
                            });
                            
                            marks = marks.map(mark => ({
                                ...mark,
                                unit_code: unitMap[mark.subject_name]?.unit_code || getUnitCode(mark.subject_name),
                                credits: unitMap[mark.subject_name]?.credits || 3,
                                // Recalculate grade and points based on correct scale
                                grade: mark.grade || calculateGrade(mark.final_score),
                                points: mark.points || calculatePoints(mark.grade || calculateGrade(mark.final_score))
                            }));
                        } else {
                            marks = marks.map(mark => ({
                                ...mark,
                                unit_code: getUnitCode(mark.subject_name),
                                credits: 3,
                                grade: mark.grade || calculateGrade(mark.final_score),
                                points: mark.points || calculatePoints(mark.grade || calculateGrade(mark.final_score))
                            }));
                        }
                    } catch (e) {
                        console.warn('Error fetching catalog:', e);
                        marks = marks.map(mark => ({
                            ...mark,
                            unit_code: getUnitCode(mark.subject_name),
                            credits: 3,
                            grade: mark.grade || calculateGrade(mark.final_score),
                            points: mark.points || calculatePoints(mark.grade || calculateGrade(mark.final_score))
                        }));
                    }
                }
            } catch (e) {
                console.warn('Error fetching marks:', e);
            }
            
            if (marks && marks.length > 0) {
                myMarksData = marks;
            } else {
                myMarksData = getDemoMarks(user.program);
                myMarksData = myMarksData.map(mark => ({
                    ...mark,
                    unit_code: getUnitCode(mark.subject_name),
                    grade: mark.grade || calculateGrade(mark.final_score),
                    points: mark.points || calculatePoints(mark.grade || calculateGrade(mark.final_score))
                }));
            }
            
            myMarksFiltered = [...myMarksData];
            
            // Populate subject filter
            const subjectFilter = document.getElementById('my_marks_subject_filter');
            if (subjectFilter) {
                const subjects = [...new Set(myMarksData.map(m => m.subject_name).filter(Boolean))];
                subjectFilter.innerHTML = '<option value="all">All Units</option>';
                subjects.sort().forEach(subject => {
                    const option = document.createElement('option');
                    option.value = subject;
                    option.textContent = subject;
                    subjectFilter.appendChild(option);
                });
            }
            
            // Populate year filter
            const yearFilter = document.getElementById('my_marks_year_filter');
            if (yearFilter) {
                const years = [...new Set(myMarksData.map(m => m.academic_year || m.year || '2025').filter(Boolean))];
                yearFilter.innerHTML = '<option value="all">All Years</option>';
                years.sort().reverse().forEach(year => {
                    const option = document.createElement('option');
                    option.value = year;
                    option.textContent = year;
                    yearFilter.appendChild(option);
                });
            }
            
            // Update GPA
            const total = myMarksData.length;
            const totalPoints = myMarksData.reduce((sum, m) => sum + (m.points || 0), 0);
            const gpa = total > 0 ? (totalPoints / total) : 0;
            const gpaEl = document.getElementById('my_marks_gpa');
            if (gpaEl) gpaEl.textContent = gpa.toFixed(2);
            
            renderMyMarksTable();
            
        } catch (error) {
            console.error('Error loading my marks:', error);
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px; color: #dc2626;">Error: ${error.message}</td></tr>`;
        }
    }

    function populateMyMarksBlockFilter(program) {
        const filter = document.getElementById('my_marks_block_filter');
        if (!filter) return;
        
        const isTVET = PROGRAM.isTVET(program);
        const label = isTVET ? 'Terms' : 'Blocks';
        const options = PROGRAM.getBlockOptions(program);
        
        filter.innerHTML = `<option value="all">All ${label}</option>`;
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            filter.appendChild(option);
        });
    }

    function renderMyMarksTable() {
        const tbody = document.getElementById('my_marks_table_body');
        if (!tbody) return;
        
        const marks = myMarksFiltered;
        if (!marks || marks.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: #94a3b8;">
                        <i class="fas fa-file-alt" style="font-size: 32px; display: block; margin-bottom: 10px;"></i>
                        No published marks found
                    </td>
                </tr>
            `;
            document.getElementById('my_marks_count').textContent = '0 results';
            return;
        }
        
        let html = '';
        marks.forEach((mark, index) => {
            const status = getGradingStatus(mark.final_score);
            const statusColor = getStatusColor(status);
            const gradeColor = getGradeColor(mark.grade);
            const unitCode = mark.unit_code || getUnitCode(mark.subject_name) || 'N/A';
            const credits = mark.credits || 3;
            const score = mark.final_score || 0;
            
            html += `
                <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;" 
                    onmouseover="this.style.background='#f8fafc'" 
                    onmouseout="this.style.background='transparent'">
                    <td style="padding: 10px 14px; text-align: center; color: #94a3b8; font-weight: 600;">${index + 1}</td>
                    <td style="padding: 10px 14px; font-weight: 600; color: #0A3D62;">${escapeHtml(unitCode)}</td>
                    <td style="padding: 10px 14px;">${escapeHtml(mark.subject_name || 'N/A')}</td>
                    <td style="padding: 10px 14px; text-align: center; font-weight: 600;">${credits}</td>
                    <td style="padding: 10px 14px; text-align: center; font-weight: 700;">${score}%</td>
                    <td style="padding: 10px 14px; text-align: center;">
                        <span style="background: ${gradeColor}; color: white; padding: 2px 12px; border-radius: 12px; font-weight: 700; font-size: 13px; display: inline-block;">
                            ${mark.grade || '-'}
                        </span>
                    </td>
                    <td style="padding: 10px 14px; text-align: center;">
                        <span style="background: ${statusColor}; color: white; padding: 2px 12px; border-radius: 12px; font-weight: 600; font-size: 11px;">
                            ${status}
                        </span>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
        document.getElementById('my_marks_count').textContent = `${marks.length} results`;
    }

    function filterMyMarks() {
        const subjectFilter = document.getElementById('my_marks_subject_filter')?.value || 'all';
        const blockFilter = document.getElementById('my_marks_block_filter')?.value || 'all';
        const yearFilter = document.getElementById('my_marks_year_filter')?.value || 'all';
        const searchTerm = document.getElementById('my_marks_search')?.value?.toLowerCase() || '';
        
        let filtered = [...myMarksData];
        
        if (subjectFilter !== 'all') {
            filtered = filtered.filter(m => m.subject_name === subjectFilter);
        }
        if (blockFilter !== 'all') {
            filtered = filtered.filter(m => m.block === blockFilter);
        }
        if (yearFilter !== 'all') {
            filtered = filtered.filter(m => (m.academic_year || m.year || '2025') === yearFilter);
        }
        if (searchTerm) {
            filtered = filtered.filter(m => 
                (m.subject_name || '').toLowerCase().includes(searchTerm) ||
                (m.unit_code || '').toLowerCase().includes(searchTerm)
            );
        }
        
        myMarksFiltered = filtered;
        renderMyMarksTable();
        document.getElementById('my_marks_count').textContent = `${filtered.length} results`;
    }

    // ============================================================
    // 8. SEMESTER REPORT
    // ============================================================
    let gradeChart = null;
    let currentGrades = [];

    function loadSemesterReport() {
        const tbody = document.getElementById('grades-table-body');
        if (!tbody) return;
        
        tbody.innerHTML = `<tr><td colspan="9"><div class="loading-spinner"></div> Loading grades...</td></tr>`;
        
        try {
            const user = window.currentUserProfile || {};
            let grades = [];
            
            if (window.examsModule && window.examsModule.allExams) {
                const exams = window.examsModule.allExams || [];
                const releasedExams = exams.filter(e => 
                    (e.isReleased === true || e.released === true) && 
                    e.totalPercentage !== null && e.totalPercentage !== undefined
                );
                
                if (releasedExams.length > 0) {
                    grades = releasedExams.map(e => ({
                        courseCode: e.unit_code || e.course_code || getUnitCode(e.exam_name || e.title),
                        courseName: e.exam_name || e.title || 'Exam',
                        credits: e.credits || 3,
                        cat1: e.cat1Display || e.cat_1_score || '--',
                        cat2: e.cat2Display || e.cat_2_score || '--',
                        final: e.finalDisplay || e.final_score || '--',
                        total: e.totalPercentage || 0,
                        grade: calculateGrade(e.totalPercentage || 0),
                        points: calculatePoints(calculateGrade(e.totalPercentage || 0)),
                        status: (e.totalPercentage || 0) >= 60 ? 'PASS' : 'FAIL',
                        blockTerm: e.block_term || e.block || 'General',
                        year: e.intake_year || '2024'
                    }));
                }
            }
            
            if (grades.length === 0) {
                grades = generateSampleGrades();
            }
            
            currentGrades = grades;
            
            const total = grades.length;
            const totalScore = grades.reduce((sum, g) => sum + g.total, 0);
            const avgScore = total > 0 ? (totalScore / total) : 0;
            const gpa = calculateGPA(grades);
            const grade = calculateGrade(avgScore);
            const passed = grades.filter(g => g.status === 'PASS').length;
            
            document.getElementById('semester-gpa').textContent = gpa.toFixed(2);
            document.getElementById('semester-grade').textContent = grade;
            document.getElementById('cumulative-gpa').textContent = gpa.toFixed(2);
            document.getElementById('cumulative-grade').textContent = grade;
            document.getElementById('total-credits-earned').textContent = total * 3;
            document.getElementById('class-rank').textContent = total > 0 ? 'Top 30%' : 'N/A';
            
            let html = '';
            grades.forEach((g, i) => {
                const statusColor = g.status === 'PASS' ? '#10b981' : '#dc2626';
                const gradeColor = getGradeColor(g.grade);
                
                html += `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 12px;">${escapeHtml(g.courseCode)}</td>
                        <td style="padding: 12px;">${escapeHtml(g.courseName)}</td>
                        <td style="padding: 12px; text-align: center;">${g.credits}</td>
                        <td style="padding: 12px; text-align: center;">${g.cat1}</td>
                        <td style="padding: 12px; text-align: center;">${g.cat2}</td>
                        <td style="padding: 12px; text-align: center;">${g.final}</td>
                        <td style="padding: 12px; text-align: center; font-weight: 700; color: ${gradeColor};">${g.total}%</td>
                        <td style="padding: 12px; text-align: center;"><span class="grade-letter">${g.grade}</span></td>
                        <td style="padding: 12px; text-align: center; color: ${statusColor}; font-weight: 600;">${g.status}</td>
                    </tr>
                `;
            });
            
            tbody.innerHTML = html || '<tr><td colspan="9" style="text-align: center; padding: 40px;">No grades available</td></tr>';
            createGradeChart(grades);
            
        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="9" style="color: red; text-align: center; padding: 40px;">Error: ${error.message}</td></tr>`;
        }
    }

    function createGradeChart(grades) {
        const canvas = document.getElementById('grade-distribution-chart');
        if (!canvas) return;
        
        const gradeCounts = { 'A': 0, 'B': 0, 'C': 0, 'D': 0 };
        grades.forEach(g => { if (gradeCounts[g.grade] !== undefined) gradeCounts[g.grade]++; });
        
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
                        backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'],
                        borderWidth: 1,
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, ticks: { stepSize: 1 } },
                        x: { title: { display: true, text: 'Grade' } }
                    }
                }
            });
        }
    }

    // ============================================================
    // 9. YEARLY REPORT
    // ============================================================
    function loadYearlyReport() {
        const grades = currentGrades.length > 0 ? currentGrades : generateSampleGrades();
        const total = grades.length;
        const avg = total > 0 ? (grades.reduce((sum, g) => sum + g.total, 0) / total) : 0;
        const gpa = calculateGPA(grades);
        
        document.getElementById('year-gpa').textContent = gpa.toFixed(2);
        document.getElementById('year-credits').textContent = total * 3;
        document.getElementById('year-courses').textContent = total;
        document.getElementById('year-awards').textContent = total > 4 ? '2' : '0';
    }

    // ============================================================
    // 10. FULL TRANSCRIPT
    // ============================================================
    function loadTranscript() {
        const tbody = document.getElementById('transcript-table-body');
        if (!tbody) return;
        
        const user = window.currentUserProfile || {};
        document.getElementById('student-name-display').textContent = user.full_name || 'Student';
        document.getElementById('program-display').textContent = user.program || 'KRCHN';
        document.getElementById('student-id-display').textContent = user.student_id || 'N/A';
        
        const grades = currentGrades.length > 0 ? currentGrades : generateSampleGrades();
        
        let html = '';
        let totalAttempted = 0;
        let totalEarned = 0;
        let totalPoints = 0;
        
        grades.forEach(g => {
            const points = g.points * g.credits;
            totalAttempted += g.credits;
            if (g.status === 'PASS') totalEarned += g.credits;
            totalPoints += points;
            
            html += `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 12px;">${escapeHtml(g.blockTerm)}</td>
                    <td style="padding: 12px;">${escapeHtml(g.courseCode)}</td>
                    <td style="padding: 12px;">${escapeHtml(g.courseName)}</td>
                    <td style="padding: 12px; text-align: center;">${g.credits}</td>
                    <td style="padding: 12px; text-align: center;"><span class="grade-letter">${g.grade}</span></td>
                    <td style="padding: 12px; text-align: center;">${points.toFixed(1)}</td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html || '<tr><td colspan="6" style="text-align: center; padding: 40px;">No transcript data</td></tr>';
        
        const cgpa = totalAttempted > 0 ? (totalPoints / totalAttempted) : 0;
        document.getElementById('total-attempted').textContent = totalAttempted;
        document.getElementById('total-earned').textContent = totalEarned;
        document.getElementById('transcript-cgpa').textContent = cgpa.toFixed(2);
    }

    // ============================================================
    // 11. COURSE PROGRESS
    // ============================================================
    function loadCourseProgress() {
        const container = document.getElementById('course-progress-list');
        if (!container) return;
        
        const grades = currentGrades.length > 0 ? currentGrades : generateSampleGrades();
        const total = grades.length;
        const completed = grades.filter(g => g.status === 'PASS').length;
        
        document.getElementById('completed-courses-progress').textContent = completed;
        document.getElementById('total-courses-progress').textContent = total;
        
        let html = '';
        grades.forEach(g => {
            const barColor = getGradeColor(g.grade);
            html += `
                <div class="progress-item">
                    <div class="progress-header">
                        <span class="course-name">${escapeHtml(g.courseName)}</span>
                        <span class="progress-percent">${g.total}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${g.total}%; background: ${barColor};"></div>
                    </div>
                    <div style="margin-top: 4px; font-size: 12px; color: ${g.status === 'PASS' ? '#10b981' : '#dc2626'};">
                        ${g.status === 'PASS' ? '✅ Completed' : '❌ In Progress'} · Grade: ${g.grade}
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html || '<div style="padding: 40px; text-align: center; color: #94a3b8;">No course data available</div>';
    }

    // ============================================================
    // 12. DOWNLOAD FULL TRANSCRIPT
    // ============================================================
    function downloadTranscriptPDF() {
        const user = window.currentUserProfile || {};
        const grades = currentGrades.length > 0 ? currentGrades : generateSampleGrades();
        const total = grades.length;
        const avg = total > 0 ? (grades.reduce((sum, g) => sum + g.total, 0) / total) : 0;
        const gpa = calculateGPA(grades);
        const grade = calculateGrade(avg);
        
        let html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Academic Transcript</title>
                <style>
                    body { font-family: 'Times New Roman', serif; padding: 40px; color: #1e293b; }
                    .header { text-align: center; border-bottom: 2px solid #1e293b; padding-bottom: 20px; margin-bottom: 20px; }
                    .header h1 { font-size: 24px; margin: 0; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th { background: #1e293b; color: white; padding: 10px; text-align: left; }
                    td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
                    .summary { display: flex; justify-content: space-around; margin: 20px 0; padding: 20px; background: #f8fafc; border-radius: 8px; }
                    .summary-item { text-align: center; }
                    .summary-value { font-size: 28px; font-weight: bold; }
                    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; }
                    @media print { body { padding: 20px; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>NAKURU COLLEGE OF HEALTH SCIENCES AND MANAGEMENT</h1>
                    <p>Academic Transcript</p>
                    <p><strong>${escapeHtml(user.full_name || 'Student')}</strong> · ${escapeHtml(user.student_id || 'N/A')}</p>
                    <p>Program: ${escapeHtml(user.program || 'KRCHN')} · Intake: ${escapeHtml(user.intake_year || '2024')}</p>
                </div>
                
                <div class="summary">
                    <div class="summary-item"><div class="summary-value">${gpa.toFixed(2)}</div><div>GPA</div></div>
                    <div class="summary-item"><div class="summary-value">${grade}</div><div>Grade</div></div>
                    <div class="summary-item"><div class="summary-value">${total * 3}</div><div>Credits</div></div>
                    <div class="summary-item"><div class="summary-value">${total}</div><div>Courses</div></div>
                </div>
                
                <table>
                    <thead><tr><th>Block/Term</th><th>Unit Code</th><th>Unit Name</th><th>Credits</th><th>Grade</th><th>Points</th></tr></thead>
                    <tbody>
        `;
        
        grades.forEach(g => {
            html += `
                <tr>
                    <td>${escapeHtml(g.blockTerm)}</td>
                    <td>${escapeHtml(g.courseCode)}</td>
                    <td>${escapeHtml(g.courseName)}</td>
                    <td>${g.credits}</td>
                    <td>${g.grade}</td>
                    <td>${(g.points * g.credits).toFixed(1)}</td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
                <div class="footer">
                    <p>Generated: ${new Date().toLocaleString()}</p>
                    <p>NCHSM · P.O. Box 12906 - 20100, Nakuru</p>
                </div>
            </body>
            </html>
        `;
        
        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
            setTimeout(() => printWindow.print(), 500);
        } else {
            alert('Please allow popups to download the transcript.');
        }
    }

   // ============================================================
// 13. DOWNLOAD REPORT CARD (WITH ONLY GRADING SCALE)
// ============================================================
function downloadReportCard() {
    const user = window.currentUserProfile || {};
    const marks = myMarksData || [];
    
    if (marks.length === 0) {
        alert('No marks available to generate report card.');
        return;
    }
    
    const now = new Date().toLocaleDateString('en-KE', {
        timeZone: 'Africa/Nairobi',
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
    const academicYear = user.academic_year || user.intake_year || '2025';
    
    let tableRows = '';
    marks.forEach((mark, index) => {
        const status = getGradingStatus(mark.final_score);
        const statusColor = getStatusColor(status);
        const unitCode = mark.unit_code || getUnitCode(mark.subject_name) || 'N/A';
        
        tableRows += `
            <tr>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${index + 1}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #0A3D62;">${escapeHtml(unitCode)}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(mark.subject_name || 'N/A')}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${mark.credits || 3}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: 700;">${mark.final_score || 0}%</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
                    <span style="background: ${getGradeColor(mark.grade)}; color: white; padding: 2px 10px; border-radius: 12px; font-weight: 700; font-size: 12px;">${mark.grade || '-'}</span>
                </td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
                    <span style="background: ${statusColor}; color: white; padding: 2px 12px; border-radius: 12px; font-weight: 600; font-size: 11px;">${status}</span>
                </td>
            </tr>
        `;
    });
    
    const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Report Card - ${escapeHtml(user.full_name || 'Student')}</title>
            <style>
                body { 
                    font-family: 'Times New Roman', Times, serif; 
                    padding: 40px; 
                    color: #1e293b; 
                    background: white;
                    margin: 0;
                }
                .container {
                    max-width: 1100px;
                    margin: 0 auto;
                    padding: 20px;
                    border: 2px solid #0A3D62;
                    border-radius: 12px;
                    background: #ffffff;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                }
                .header { 
                    text-align: center; 
                    border-bottom: 3px solid #0A3D62; 
                    padding-bottom: 20px; 
                    margin-bottom: 20px;
                }
                .header .logo {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 20px;
                    margin-bottom: 10px;
                }
                .header .logo img {
                    max-height: 80px;
                    width: auto;
                }
                .header .school { 
                    font-size: 18px; 
                    font-weight: 700;
                    color: #0A3D62;
                    letter-spacing: 2px;
                }
                .header .motto {
                    font-size: 13px;
                    color: #64748b;
                    font-style: italic;
                    margin-top: 4px;
                }
                .header .subtitle { 
                    font-size: 14px; 
                    color: #64748b; 
                    margin: 4px 0; 
                }
                .student-info { 
                    display: grid; 
                    grid-template-columns: 1fr 1fr 1fr; 
                    gap: 10px; 
                    margin: 20px 0; 
                    padding: 16px; 
                    background: #f8fafc; 
                    border-radius: 8px; 
                    border: 1px solid #e5e7eb; 
                }
                .student-info .label { 
                    font-size: 11px; 
                    color: #94a3b8; 
                    text-transform: uppercase; 
                    letter-spacing: 0.5px;
                }
                .student-info .value { 
                    font-weight: 600; 
                    font-size: 15px; 
                    color: #0A3D62;
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin: 20px 0; 
                    font-size: 13px;
                }
                th { 
                    background: #0A3D62; 
                    color: white; 
                    padding: 10px 12px; 
                    text-align: left; 
                    font-size: 12px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                td { 
                    padding: 8px 12px; 
                    border-bottom: 1px solid #e5e7eb; 
                    font-size: 13px; 
                }
                .footer { 
                    text-align: center; 
                    margin-top: 30px; 
                    padding-top: 20px; 
                    border-top: 1px solid #e5e7eb; 
                    font-size: 12px; 
                    color: #94a3b8; 
                }
                .grading-scale { 
                    margin-top: 20px; 
                    padding: 16px; 
                    background: #f8fafc; 
                    border-radius: 8px; 
                    border: 1px solid #e5e7eb; 
                }
                .grading-scale .scale-item { 
                    display: inline-block; 
                    margin: 4px 12px; 
                    font-size: 13px; 
                }
                .grading-scale .grade-box { 
                    padding: 2px 10px; 
                    border-radius: 4px; 
                    font-weight: 700; 
                    color: white; 
                    display: inline-block;
                    min-width: 20px;
                    text-align: center;
                }
                .watermark {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%) rotate(-45deg);
                    font-size: 80px;
                    color: rgba(10, 61, 98, 0.05);
                    font-weight: 700;
                    pointer-events: none;
                    z-index: 0;
                    white-space: nowrap;
                }
                .no-print { display: block; }
                @media print { 
                    body { padding: 20px; } 
                    .no-print { display: none; }
                    .container { border: 2px solid #0A3D62; box-shadow: none; }
                    .header .logo img { max-height: 70px; }
                }
                @media (max-width: 768px) {
                    .student-info { grid-template-columns: 1fr 1fr; }
                    table { font-size: 11px; }
                    th, td { padding: 6px 8px; }
                }
            </style>
        </head>
        <body>
            <div class="watermark">NCHSM</div>
            <div class="container">
                <div class="header">
                    <div class="logo">
                        <img src="https://raw.githubusercontent.com/NCHSMlearning/e-learning/main/images/Logo_NCHSM.png" alt="NCHSM Logo" style="max-height: 80px; width: auto;">
                        <div>
                            <div class="school">NAKURU COLLEGE OF HEALTH SCIENCES AND MANAGEMENT</div>
                            <div class="motto">"Excellence in Health Sciences Education"</div>
                            <div class="subtitle">Student Report Card</div>
                        </div>
                    </div>
                    <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
                        <i class="fas fa-calendar-alt"></i> Generated: ${now}
                    </div>
                </div>
                
                <div class="student-info">
                    <div>
                        <div class="label">Student Name</div>
                        <div class="value">${escapeHtml(user.full_name || 'Student')}</div>
                    </div>
                    <div>
                        <div class="label">Admission Number</div>
                        <div class="value">${escapeHtml(user.student_id || user.admission_number || 'N/A')}</div>
                    </div>
                    <div>
                        <div class="label">Program</div>
                        <div class="value">${escapeHtml(user.program || 'KRCHN')}</div>
                    </div>
                    <div>
                        <div class="label">Academic Year</div>
                        <div class="value">${escapeHtml(academicYear)}</div>
                    </div>
                    <div>
                        <div class="label">Overall GPA</div>
                        <div class="value" style="color: #6d28d9; font-size: 20px;">${calculateGPA(marks).toFixed(2)}</div>
                    </div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th style="text-align: center; width: 40px;">#</th>
                            <th style="min-width: 100px;">Unit Code</th>
                            <th style="min-width: 150px;">Unit Name</th>
                            <th style="text-align: center; width: 60px;">Credits</th>
                            <th style="text-align: center; width: 70px;">Score</th>
                            <th style="text-align: center; width: 60px;">Grade</th>
                            <th style="text-align: center; width: 100px;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
                
                <div class="grading-scale">
                    <div style="font-weight: 600; margin-bottom: 8px; color: #0A3D62;">📊 Grading Scale:</div>
                    <div>
                        <span class="scale-item"><span class="grade-box" style="background: #10b981;">A</span> 75-100% → 4.0</span>
                        <span class="scale-item"><span class="grade-box" style="background: #3b82f6;">B</span> 65-74% → 3.0</span>
                        <span class="scale-item"><span class="grade-box" style="background: #f59e0b;">C</span> 60-64% → 2.0</span>
                        <span class="scale-item"><span class="grade-box" style="background: #ef4444;">D</span> Below 60% → 0.0</span>
                    </div>
                    <div style="margin-top: 8px; font-size: 12px; color: #94a3b8;">
                        <i class="fas fa-info-circle"></i> Minimum passing grade: C (60%)
                    </div>
                </div>
                
                <div class="footer">
                    <p style="margin: 4px 0;"><strong>This is an official report card.</strong> For verification, contact the Registrar's Office.</p>
                    <p style="margin: 4px 0;">NCHSM · P.O. Box 12906 - 20100, Nakuru · Tel: 0790969743</p>
                    <p style="margin: 4px 0; font-size: 11px; margin-top: 8px;">
                        <i class="fas fa-print"></i> Printed on ${now}
                    </p>
                </div>
                
                <div style="text-align: center; margin-top: 20px;" class="no-print">
                    <button onclick="window.print()" style="padding: 12px 40px; background: #0A3D62; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px;">
                        <i class="fas fa-print"></i> 🖨️ Print Report Card
                    </button>
                    <button onclick="window.close()" style="padding: 12px 40px; background: #e2e8f0; color: #475569; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px; margin-left: 10px;">
                        <i class="fas fa-times"></i> Close
                    </button>
                </div>
            </div>
        </body>
        </html>
    `;
    
    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (printWindow) {
        printWindow.document.write(fullHtml);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.print();
        }, 1000);
    } else {
        alert('Please allow popups to download the report card.');
    }
}

    // ============================================================
    // 14. TAB SWITCHING
    // ============================================================
    function setupTabs() {
        const tabs = document.querySelectorAll('.report-tab');
        const contents = {
            'semester': document.getElementById('semester-report'),
            'yearly': document.getElementById('yearly-report'),
            'transcript': document.getElementById('transcript-report'),
            'progress': document.getElementById('progress-report'),
            'mymarks': document.getElementById('mymarks-report')
        };
        
        tabs.forEach(tab => {
            tab.addEventListener('click', function() {
                const reportType = this.dataset.report;
                tabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                
                Object.keys(contents).forEach(key => {
                    if (contents[key]) {
                        contents[key].style.display = key === reportType ? 'block' : 'none';
                    }
                });
                
                if (reportType === 'semester') {
                    setTimeout(loadSemesterReport, 100);
                } else if (reportType === 'yearly') {
                    setTimeout(loadYearlyReport, 100);
                } else if (reportType === 'transcript') {
                    setTimeout(loadTranscript, 100);
                } else if (reportType === 'progress') {
                    setTimeout(loadCourseProgress, 100);
                } else if (reportType === 'mymarks') {
                    setTimeout(loadMyMarks, 100);
                }
            });
        });
    }

    // ============================================================
    // 15. INITIALIZE
    // ============================================================
    function init() {
        console.log('🔧 Initializing Academic Reports...');
        setupTabs();
        
        // Add event listeners for filters
        const subjectFilter = document.getElementById('my_marks_subject_filter');
        const blockFilter = document.getElementById('my_marks_block_filter');
        const yearFilter = document.getElementById('my_marks_year_filter');
        const searchInput = document.getElementById('my_marks_search');
        
        if (subjectFilter) subjectFilter.addEventListener('change', filterMyMarks);
        if (blockFilter) blockFilter.addEventListener('change', filterMyMarks);
        if (yearFilter) yearFilter.addEventListener('change', filterMyMarks);
        if (searchInput) searchInput.addEventListener('input', filterMyMarks);
        
        const refreshBtn = document.getElementById('refresh-report');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', function() {
                const activeTab = document.querySelector('.report-tab.active');
                if (activeTab) {
                    const reportType = activeTab.dataset.report;
                    if (reportType === 'semester') loadSemesterReport();
                    else if (reportType === 'yearly') loadYearlyReport();
                    else if (reportType === 'transcript') loadTranscript();
                    else if (reportType === 'progress') loadCourseProgress();
                    else if (reportType === 'mymarks') loadMyMarks();
                }
            });
        }
        
        const downloadBtn = document.getElementById('download-transcript-pdf');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', downloadTranscriptPDF);
        }
        
        const printBtn = document.getElementById('print-report');
        if (printBtn) {
            printBtn.addEventListener('click', function() {
                window.print();
            });
        }
        
        const downloadReportCardBtn = document.getElementById('download-report-card');
        if (downloadReportCardBtn) {
            downloadReportCardBtn.addEventListener('click', downloadReportCard);
        }
        
        setTimeout(function() {
            const activeTab = document.querySelector('.report-tab.active');
            if (activeTab) {
                const reportType = activeTab.dataset.report;
                if (reportType === 'semester') loadSemesterReport();
                else if (reportType === 'yearly') loadYearlyReport();
                else if (reportType === 'transcript') loadTranscript();
                else if (reportType === 'progress') loadCourseProgress();
                else if (reportType === 'mymarks') loadMyMarks();
            } else {
                const myMarksTab = document.querySelector('.report-tab[data-report="mymarks"]');
                if (myMarksTab) {
                    myMarksTab.classList.add('active');
                    const contents = {
                        'semester': document.getElementById('semester-report'),
                        'yearly': document.getElementById('yearly-report'),
                        'transcript': document.getElementById('transcript-report'),
                        'progress': document.getElementById('progress-report'),
                        'mymarks': document.getElementById('mymarks-report')
                    };
                    Object.keys(contents).forEach(key => {
                        if (contents[key]) {
                            contents[key].style.display = key === 'mymarks' ? 'block' : 'none';
                        }
                    });
                    loadMyMarks();
                } else {
                    loadSemesterReport();
                }
            }
        }, 300);
        
        console.log('✅ Academic Reports ready');
    }

    // ============================================================
    // 16. EXPOSE FUNCTIONS
    // ============================================================
    window.loadMyMarks = loadMyMarks;
    window.filterMyMarks = filterMyMarks;
    window.loadSemesterReport = loadSemesterReport;
    window.loadYearlyReport = loadYearlyReport;
    window.loadTranscript = loadTranscript;
    window.loadCourseProgress = loadCourseProgress;
    window.downloadTranscriptPDF = downloadTranscriptPDF;
    window.downloadReportCard = downloadReportCard;
    window.getUnitCode = getUnitCode;
    window.UNIT_CODE_MAP = UNIT_CODE_MAP;
    window.getGradingStatus = getGradingStatus;
    window.calculateGrade = calculateGrade;
    window.calculatePoints = calculatePoints;
    window.calculateGPA = calculateGPA;

    // ============================================================
    // 17. AUTO-INIT
    // ============================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('✅ Student Academic Reports Module loaded');
    console.log('📊 Available functions:');
    console.log('   - loadMyMarks() - Load published marks');
    console.log('   - filterMyMarks() - Filter marks');
    console.log('   - downloadReportCard() - Download report card PDF');
    console.log('   - downloadTranscriptPDF() - Download full transcript');
})();
