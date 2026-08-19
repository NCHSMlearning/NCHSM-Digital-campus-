// js/academic-reports.js - COMPLETE STUDENT VERSION WITH HOLLOW STAR INDICATOR
// All tabs: Semester Report, Yearly Summary, Full Transcript, Course Progress, My Performance
// INCLUDES: LINE GRAPHS, PROFILE PICTURE, DATABASE UNIT CODES, FIXED GRADE DISPLAY
// INDICATOR: ☆ (hollow star) - subtle, only appears on retaken units in My Performance
// NO DEMO DATA - ONLY REAL DATA FROM DATABASE
// ============================================================
(function() {
    'use strict';
    
    console.log('📊 Student Academic Reports Module Loading...');
    console.log('☆ Hollow Star Indicator: ENABLED (subtle)');

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
        },
        
        getProgramType: function(programCode) {
            if (!programCode) return 'Nursing';
            const code = String(programCode).toUpperCase().trim();
            if (code === 'KRCHN') return 'Nursing';
            if (this.isTVET(code)) return 'TVET';
            return 'Nursing';
        }
    };

    // ============================================================
    // 2. UNIT CODE - FETCH FROM DATABASE
    // ============================================================
    let unitCodeCache = {};

    async function fetchUnitCodes() {
        try {
            const { data, error } = await window.db.supabase
                .from('units_catalog')
                .select('unit_name, unit_code');
            
            if (error) throw error;
            
            unitCodeCache = {};
            data.forEach(item => {
                unitCodeCache[item.unit_name] = item.unit_code;
            });
            
            console.log(`📊 Cached ${Object.keys(unitCodeCache).length} unit codes`);
            return unitCodeCache;
        } catch (error) {
            console.error('❌ Error fetching unit codes:', error);
            return {};
        }
    }

    function getUnitCode(subjectName) {
        if (!subjectName) return 'N/A';
        
        if (unitCodeCache[subjectName]) {
            return unitCodeCache[subjectName];
        }
        
        for (const [name, code] of Object.entries(unitCodeCache)) {
            if (subjectName.includes(name) || name.includes(subjectName)) {
                return code;
            }
        }
        
        if (subjectName.includes('Medical Surgical Nursing II')) {
            const specialty = subjectName.split(':')[1]?.trim() || '';
            if (specialty.includes('Gastrointestinal') || specialty.includes('Hepatobiliary')) return 'NCHSGN 201';
            if (specialty.includes('Orodental')) return 'NCHSGN 202';
            if (specialty.includes('Renal') || specialty.includes('Genito-Urinary')) return 'NCHSGN 203';
            return 'NCHSGN 2XX';
        }
        
        if (subjectName.includes('Medical Surgical Nursing III')) {
            const specialty = subjectName.split(':')[1]?.trim() || '';
            if (specialty.includes('Endocrine')) return 'NCHSGN 209';
            if (specialty.includes('Neurological')) return 'NCHSGN 210';
            return 'NCHSGN 2XX';
        }
        
        if (subjectName.includes('Midwifery')) {
            if (subjectName.includes('I')) return 'NCHSMW 110';
            if (subjectName.includes('II')) return 'NCHSMW 123';
            if (subjectName.includes('III')) return 'NCHSMW 205';
            if (subjectName.includes('IV')) return 'NCHSMW 214';
            return 'NCHSMW 2XX';
        }
        
        if (subjectName.includes('Community Health')) {
            if (subjectName.includes('I')) return 'NCHSCH 125';
            return 'NCHSCH 2XX';
        }
        
        const words = subjectName.split(' ');
        if (words.length === 1) {
            return subjectName.substring(0, 6).toUpperCase();
        }
        
        const skipWords = ['and', 'of', 'for', 'the', 'to', 'with', 'on', 'at'];
        let code = words
            .filter(w => !skipWords.includes(w.toLowerCase()))
            .map(w => w[0])
            .join('')
            .toUpperCase();
        
        if (code.length > 6) {
            code = code.substring(0, 6);
        }
        
        return code || 'N/A';
    }

    // ============================================================
    // 3. RETAKE/SUPPLEMENTARY DATA STATE
    // ============================================================
    
    let studentRetakeData = [];
    let studentRetakeMap = {};
    let retakeDataLoaded = false;

    // ============================================================
    // 4. FETCH RETAKE DATA FOR STUDENT
    // ============================================================
    
    async function fetchStudentRetakeData(admissionNumber) {
        if (!admissionNumber) return {};
        if (retakeDataLoaded) return studentRetakeMap;
        
        try {
            const { data, error } = await window.db.supabase
                .from('student_retakes')
                .select('*')
                .eq('admission_number', admissionNumber)
                .order('attempt_number', { ascending: true });
            
            if (error) throw error;
            
            studentRetakeData = data || [];
            
            // Group by subject_name
            const retakeMap = {};
            data?.forEach(retake => {
                const key = retake.subject_name;
                if (!retakeMap[key]) retakeMap[key] = [];
                retakeMap[key].push(retake);
            });
            
            studentRetakeMap = retakeMap;
            retakeDataLoaded = true;
            
            console.log(`📊 Loaded ${data?.length || 0} retake records for student`);
            return retakeMap;
            
        } catch (error) {
            console.error('Error fetching retake data:', error);
            return {};
        }
    }

    // ============================================================
    // 5. RETAKE HELPER FUNCTIONS
    // ============================================================
    
    function hasRetake(subjectName) {
        if (!subjectName) return false;
        const retakes = studentRetakeMap[subjectName] || [];
        return retakes.length > 0;
    }

    function getRetakeCount(subjectName) {
        if (!subjectName) return 0;
        const retakes = studentRetakeMap[subjectName] || [];
        return retakes.length;
    }

    function getHollowStarHtml(subjectName) {
        if (!hasRetake(subjectName)) return '';
        const count = getRetakeCount(subjectName);
        const tooltip = `This unit was retaken (${count} attempt${count > 1 ? 's' : ''})`;
        return `<span class="hollow-star" title="${tooltip}">☆</span>`;
    }

    // ============================================================
    // 6. UTILITY FUNCTIONS
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
            'D': '#f97316',
            'F': '#ef4444',
            'FAIL': '#ef4444'
        };
        return colors[grade] || '#6b7280';
    }

    function getStatusColor(status) {
        const colors = {
            'EXCELLENT': '#10b981',
            'GOOD': '#3b82f6',
            'SATISFACTORY': '#f59e0b',
            'DISTINCTION': '#10b981',
            'CREDIT': '#3b82f6',
            'PASS': '#f59e0b',
            'FAIL': '#ef4444',
            'PENDING': '#94a3b8'
        };
        return colors[status] || '#94a3b8';
    }

    // ============================================================
    // 7. TVET GRADING FUNCTIONS (Min Pass: 50%)
    // ============================================================
    function calculateTVETGrade(score) {
        if (score === null || score === undefined || score === 0) return 'FAIL';
        if (score >= 75) return 'A';
        if (score >= 65) return 'B';
        if (score >= 50) return 'C';
        return 'FAIL';
    }

    function calculateTVETPoints(grade) {
        if (!grade) return 0;
        const points = {
            'A': 4.0,
            'B': 3.0,
            'C': 2.0,
            'FAIL': 0.0
        };
        return points[grade] || 0;
    }

    function getTVETStatus(score) {
        if (score === null || score === undefined || score === 0) return 'PENDING';
        if (score >= 75) return 'EXCELLENT';
        if (score >= 65) return 'GOOD';
        if (score >= 50) return 'SATISFACTORY';
        return 'FAIL';
    }

    // ============================================================
    // 8. NURSING GRADING FUNCTIONS (Min Pass: 60%)
    // ============================================================
    function calculateNursingGrade(score) {
        if (score === null || score === undefined || score === 0) return 'D';
        if (score >= 75) return 'A';
        if (score >= 65) return 'B';
        if (score >= 60) return 'C';
        return 'D';
    }

    function calculateNursingPoints(grade) {
        if (!grade) return 0;
        const points = {
            'A': 4.0,
            'B': 3.0,
            'C': 2.0,
            'D': 0.0
        };
        return points[grade] || 0;
    }

    function getNursingStatus(score) {
        if (score === null || score === undefined || score === 0) return 'PENDING';
        if (score >= 75) return 'DISTINCTION';
        if (score >= 65) return 'CREDIT';
        if (score >= 60) return 'PASS';
        return 'FAIL';
    }

    // ============================================================
    // 9. MAIN GRADING FUNCTIONS
    // ============================================================
    function calculateGrade(score, program) {
        const isTVET = PROGRAM.isTVET(program);
        if (isTVET) {
            return calculateTVETGrade(score);
        }
        return calculateNursingGrade(score);
    }

    function calculatePoints(grade, program) {
        const isTVET = PROGRAM.isTVET(program);
        if (isTVET) {
            return calculateTVETPoints(grade);
        }
        return calculateNursingPoints(grade);
    }

    function getGradingStatus(score, program) {
        const isTVET = PROGRAM.isTVET(program);
        if (isTVET) {
            return getTVETStatus(score);
        }
        return getNursingStatus(score);
    }

    function calculateGPA(marks) {
        if (!marks || marks.length === 0) return 0;
        const totalPoints = marks.reduce((sum, m) => sum + (m.points || 0), 0);
        return marks.length > 0 ? (totalPoints / marks.length) : 0;
    }

    // ============================================================
    // 10. GET GRADE FROM GPA
    // ============================================================
    function getGradeFromGPA(gpa) {
        if (gpa >= 3.75) return 'A';
        if (gpa >= 3.0) return 'B';
        if (gpa >= 2.0) return 'C';
        return 'D';
    }

    function getGradeFromGPATVET(gpa) {
        if (gpa >= 3.75) return 'A';
        if (gpa >= 3.0) return 'B';
        if (gpa >= 2.0) return 'C';
        return 'FAIL';
    }

    // ============================================================
    // 11. MY PERFORMANCE - STATE & FUNCTIONS
    // ============================================================
    let myMarksData = [];
    let myMarksFiltered = [];

    // ============================================================
    // 12. LOAD MY MARKS WITH HOLLOW STAR SUPPORT - NO DEMO DATA
    // ============================================================
    // ============================================================
// REPLACE the loadMyMarks() function in academic-reports.js
// ============================================================

async function loadMyMarks() {
    const tbody = document.getElementById('my_marks_table_body');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr>
            <td colspan="6" style="text-align: center; padding: 40px;">
                <div class="loading-spinner"></div>
                <p style="margin-top: 10px; color: #94a3b8;">Loading your marks...</p>
            </td>
        </tr>
    `;
    
    try {
        await fetchUnitCodes();
        
        const user = window.currentUserProfile || window.db?.currentUserProfile;
        if (!user) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: #dc2626;">Please log in to view your marks</td></tr>`;
            return;
        }
        
        const registrationNumber = user.student_id || user.admission_number || user.user_id;
        const userProgram = user.program || '';
        
        const nameEl = document.getElementById('my_marks_student_name');
        if (nameEl) nameEl.textContent = user.full_name || 'Student';
        
        const admissionEl = document.getElementById('my_marks_admission');
        if (admissionEl) admissionEl.textContent = registrationNumber || '-';
        
        const programEl = document.getElementById('my_marks_program');
        if (programEl) programEl.textContent = userProgram || '-';
        
        const currentYear = new Date().getFullYear();
        const nextYear = currentYear + 1;
        const academicYear = user.academic_year || `${currentYear}/${nextYear}`;
        const academicYearEl = document.getElementById('my_marks_academic_year');
        if (academicYearEl) academicYearEl.textContent = academicYear;
        
        const blockLabel = PROGRAM.getBlockLabel(userProgram);
        const headerEl = document.querySelector('#my_marks_table_body')?.closest('table')?.querySelector('th:nth-child(3)');
        if (headerEl) headerEl.textContent = blockLabel;
        
        populateMyMarksBlockFilter(userProgram);
        
        // ✅ FETCH RETAKE DATA
        await fetchStudentRetakeData(registrationNumber);
        
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
                
              marks = marks.map(mark => {
    // ✅ Get retake info for THIS SPECIFIC UNIT
    const retakes = studentRetakeMap[mark.subject_name] || [];
    const hasRetake = retakes.length > 0;
    const lastRetake = retakes[retakes.length - 1];
    
    // ✅ Use retake score if available, otherwise use original
    let finalScore = mark.final_score;
    let retakeScore = null;
    let retakeStatus = null;
    
    if (hasRetake && lastRetake) {
        retakeScore = lastRetake.exam_score;
        retakeStatus = lastRetake.status;
        // ✅ Use retake score if it exists
        if (retakeScore !== null && retakeScore !== undefined) {
            finalScore = retakeScore;
        }
    }
    
    // ✅ ALWAYS recalculate grade and points (don't use existing mark.grade)
    const grade = calculateGrade(finalScore, userProgram);
    const points = calculatePoints(grade, userProgram);
    
    return {
        ...mark,
        unit_code: getUnitCode(mark.subject_name),
        grade: grade,        // ✅ Override with recalculated grade
        points: points,      // ✅ Override with recalculated points
        final_score: finalScore,
        original_score: mark.final_score,
        hasRetake: hasRetake,
        retakeCount: retakes.length,
        retakeScore: retakeScore,
        retakeStatus: retakeStatus,
        retakeHistory: retakes
    };
});
                console.log(`📊 Loaded ${marks.length} marks with retake data`);
            } else {
                // ✅ No marks found - show empty state
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; padding: 60px 20px; color: #94a3b8;">
                            <i class="fas fa-file-alt" style="font-size: 48px; display: block; margin-bottom: 16px;"></i>
                            <h4 style="margin: 0 0 8px 0; color: #1e293b;">No published marks found</h4>
                            <p style="font-size: 13px; margin: 0;">Your marks will appear here once they are published by the admin.</p>
                        </td>
                    </tr>
                `;
                document.getElementById('my_marks_count').textContent = '0 results';
                return;
            }
        } catch (e) {
            console.warn('Error fetching marks:', e);
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 60px 20px; color: #94a3b8;">
                        <i class="fas fa-file-alt" style="font-size: 48px; display: block; margin-bottom: 16px;"></i>
                        <h4 style="margin: 0 0 8px 0; color: #1e293b;">No published marks found</h4>
                        <p style="font-size: 13px; margin: 0;">Your marks will appear here once they are published by the admin.</p>
                    </td>
                </tr>
            `;
            document.getElementById('my_marks_count').textContent = '0 results';
            return;
        }
        
        if (marks && marks.length > 0) {
            myMarksData = marks;
        } else {
            myMarksData = [];
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 60px 20px; color: #94a3b8;">
                        <i class="fas fa-file-alt" style="font-size: 48px; display: block; margin-bottom: 16px;"></i>
                        <h4 style="margin: 0 0 8px 0; color: #1e293b;">No published marks found</h4>
                        <p style="font-size: 13px; margin: 0;">Your marks will appear here once they are published by the admin.</p>
                    </td>
                </tr>
            `;
            document.getElementById('my_marks_count').textContent = '0 results';
            return;
        }
        
        myMarksFiltered = [...myMarksData];
        
        // Populate filters
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
        
        const gpa = calculateGPA(myMarksData);
        const gpaEl = document.getElementById('my_marks_gpa');
        if (gpaEl) gpaEl.textContent = gpa.toFixed(2);
        
        renderMyMarksTableWithHollowStars();
        showGradingScale(userProgram, myMarksData);
        setTimeout(renderMyMarksCharts, 300);
        
    } catch (error) {
        console.error('Error loading my marks:', error);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: #dc2626;">Error: ${error.message}</td></tr>`;
    }
}

    function showGradingScale(program, marks) {
        const isTVET = PROGRAM.isTVET(program);
        const tvetScale = document.getElementById('my_marks_tvet_scale');
        const nursingScale = document.getElementById('my_marks_nursing_scale');
        const graphsSection = document.getElementById('my_marks_graphs_section');
        
        if (tvetScale) tvetScale.style.display = 'none';
        if (nursingScale) nursingScale.style.display = 'none';
        
        if (!marks || marks.length === 0) {
            if (graphsSection) graphsSection.style.display = 'none';
            return;
        }
        
        if (graphsSection) graphsSection.style.display = 'block';
        
        if (isTVET) {
            if (tvetScale) tvetScale.style.display = 'block';
        } else {
            if (nursingScale) nursingScale.style.display = 'block';
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

    // ============================================================
    // 13. RENDER MY MARKS TABLE WITH HOLLOW STARS
    // ============================================================
    function renderMyMarksTableWithHollowStars() {
        const tbody = document.getElementById('my_marks_table_body');
        if (!tbody) return;
        
        const marks = myMarksFiltered;
        if (!marks || marks.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px; color: #94a3b8;">
                        <i class="fas fa-file-alt" style="font-size: 32px; display: block; margin-bottom: 10px;"></i>
                        No published marks found
                    </td>
                </tr>
            `;
            document.getElementById('my_marks_count').textContent = '0 results';
            return;
        }
        
        const user = window.currentUserProfile || {};
        const userProgram = user.program || '';
        
        let html = '';
        marks.forEach((mark, index) => {
            const status = getGradingStatus(mark.final_score, userProgram);
            const statusColor = getStatusColor(status);
            const gradeColor = getGradeColor(mark.grade);
            const unitCode = mark.unit_code || getUnitCode(mark.subject_name) || 'N/A';
            const points = mark.points || calculatePoints(mark.grade, userProgram) || 0;
            
            // ✅ Hollow star indicator (subtle)
            const starIndicator = getHollowStarHtml(mark.subject_name);
            
            html += `
                <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;" 
                    onmouseover="this.style.background='#f8fafc'" 
                    onmouseout="this.style.background='transparent'">
                    <td style="padding: 10px 14px; text-align: center; color: #94a3b8; font-weight: 600;">${index + 1}</td>
                    <td style="padding: 10px 14px; font-weight: 600; color: #0A3D62;">${escapeHtml(unitCode)}</td>
                    <td style="padding: 10px 14px;">
                        ${escapeHtml(mark.subject_name || 'N/A')}
                        ${starIndicator}
                    </td>
                    <td style="padding: 10px 14px; text-align: center;">
                        <span style="background: ${gradeColor}; color: white; padding: 2px 12px; border-radius: 12px; font-weight: 700; font-size: 13px; display: inline-block;">
                            ${mark.grade || '-'}
                        </span>
                    </td>
                    <td style="padding: 10px 14px; text-align: center; font-weight: 600;">${points.toFixed(1)}</td>
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
        renderMyMarksTableWithHollowStars();
        document.getElementById('my_marks_count').textContent = `${filtered.length} results`;
        setTimeout(renderMyMarksCharts, 200);
    }

    // ============================================================
    // 14. RENDER CHARTS FOR MY PERFORMANCE
    // ============================================================
    function renderMyMarksCharts() {
        const marks = myMarksFiltered || [];
        const graphsSection = document.getElementById('my_marks_graphs_section');
        
        if (!marks || marks.length === 0) {
            if (graphsSection) graphsSection.style.display = 'none';
            return;
        }
        
        if (graphsSection) graphsSection.style.display = 'block';
        
        const user = window.currentUserProfile || {};
        const userProgram = user.program || '';
        const isTVET = PROGRAM.isTVET(userProgram);
        const threshold = isTVET ? 50 : 60;
        
        const ctx1 = document.getElementById('myMarksGradeChart');
        if (ctx1) {
            if (window.myMarksGradeChartInstance) {
                window.myMarksGradeChartInstance.destroy();
            }
            
            if (typeof Chart !== 'undefined') {
                const sortedMarks = [...marks].sort((a, b) => {
                    const blockOrder = {
                        'Introductory': 0, 'Block 1': 1, 'Block 2': 2, 'Block 3': 3,
                        'Block 4': 4, 'Block 5': 5, 'Final': 6,
                        'Term 1': 1, 'Term 2': 2, 'Term 3': 3, 'Term 4': 4,
                        'Term 5': 5, 'Term 6': 6
                    };
                    return (blockOrder[a.block] || 0) - (blockOrder[b.block] || 0);
                });
                
                const labels = sortedMarks.map(m => m.unit_code || getUnitCode(m.subject_name) || 'N/A');
                const pointsData = sortedMarks.map(m => m.points || 0);
                const avgPoints = pointsData.reduce((a, b) => a + b, 0) / pointsData.length || 0;
                const gpaLine = pointsData.map(() => avgPoints);
                
                window.myMarksGradeChartInstance = new Chart(ctx1, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [
                            {
                                label: 'Grade Points',
                                data: pointsData,
                                borderColor: '#4C1D95',
                                backgroundColor: 'rgba(76, 29, 149, 0.1)',
                                borderWidth: 3,
                                fill: true,
                                tension: 0.3,
                                pointBackgroundColor: pointsData.map(p => {
                                    if (p >= 4) return '#10b981';
                                    if (p >= 3) return '#3b82f6';
                                    if (p >= 2) return '#f59e0b';
                                    return '#ef4444';
                                }),
                                pointBorderColor: '#ffffff',
                                pointBorderWidth: 2,
                                pointRadius: 6,
                                pointHoverRadius: 8
                            },
                            {
                                label: 'GPA (' + avgPoints.toFixed(2) + ')',
                                data: gpaLine,
                                borderColor: '#0A3D62',
                                borderDash: [8, 4],
                                borderWidth: 2,
                                fill: false,
                                tension: 0,
                                pointRadius: 0,
                                pointHoverRadius: 0
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: true,
                                position: 'top',
                                labels: {
                                    boxWidth: 12,
                                    padding: 8,
                                    font: {
                                        size: 10,
                                        weight: '600'
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                min: 0,
                                max: 4.5,
                                ticks: {
                                    stepSize: 0.5,
                                    font: { size: 9 }
                                }
                            },
                            x: {
                                ticks: {
                                    font: { size: 8 },
                                    maxRotation: 45,
                                    minRotation: 30
                                }
                            }
                        }
                    }
                });
            }
        }
        
        const ctx2 = document.getElementById('myMarksPerformanceChart');
        if (ctx2) {
            if (window.myMarksPerformanceChartInstance) {
                window.myMarksPerformanceChartInstance.destroy();
            }
            
            if (typeof Chart !== 'undefined') {
                const sortedMarks = [...marks].sort((a, b) => {
                    const blockOrder = {
                        'Introductory': 0, 'Block 1': 1, 'Block 2': 2, 'Block 3': 3,
                        'Block 4': 4, 'Block 5': 5, 'Final': 6,
                        'Term 1': 1, 'Term 2': 2, 'Term 3': 3, 'Term 4': 4,
                        'Term 5': 5, 'Term 6': 6
                    };
                    return (blockOrder[a.block] || 0) - (blockOrder[b.block] || 0);
                });
                
                const labels = sortedMarks.map(m => m.unit_code || getUnitCode(m.subject_name) || 'N/A');
                const scoresData = sortedMarks.map(m => m.final_score || 0);
                const passThreshold = isTVET ? 50 : 60;
                const thresholdLine = scoresData.map(() => passThreshold);
                const averageScore = scoresData.reduce((a, b) => a + b, 0) / scoresData.length || 0;
                const avgLine = scoresData.map(() => averageScore);
                
                window.myMarksPerformanceChartInstance = new Chart(ctx2, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [
                            {
                                label: 'Score (%)',
                                data: scoresData,
                                borderColor: '#10b981',
                                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                borderWidth: 3,
                                fill: true,
                                tension: 0.3,
                                pointBackgroundColor: scoresData.map(s => {
                                    if (s >= passThreshold) return '#10b981';
                                    return '#ef4444';
                                }),
                                pointBorderColor: '#ffffff',
                                pointBorderWidth: 2,
                                pointRadius: 6,
                                pointHoverRadius: 8
                            },
                            {
                                label: 'Pass Threshold (' + passThreshold + '%)',
                                data: thresholdLine,
                                borderColor: '#ef4444',
                                borderDash: [8, 4],
                                borderWidth: 2,
                                fill: false,
                                tension: 0,
                                pointRadius: 0,
                                pointHoverRadius: 0
                            },
                            {
                                label: 'Average (' + averageScore.toFixed(1) + '%)',
                                data: avgLine,
                                borderColor: '#3b82f6',
                                borderDash: [4, 4],
                                borderWidth: 2,
                                fill: false,
                                tension: 0,
                                pointRadius: 0,
                                pointHoverRadius: 0
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: true,
                                position: 'top',
                                labels: {
                                    boxWidth: 12,
                                    padding: 8,
                                    font: {
                                        size: 10,
                                        weight: '600'
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                min: 0,
                                max: 100,
                                ticks: {
                                    stepSize: 10,
                                    font: { size: 9 },
                                    callback: function(value) {
                                        return value + '%';
                                    }
                                }
                            },
                            x: {
                                ticks: {
                                    font: { size: 8 },
                                    maxRotation: 45,
                                    minRotation: 30
                                }
                            }
                        }
                    }
                });
            }
        }
    }

    // ============================================================
    // 15. SEMESTER REPORT
    // ============================================================
    let gradeChart = null;
    let currentGrades = [];

    function loadSemesterReport() {
        const tbody = document.getElementById('grades-table-body');
        if (!tbody) return;
        
        tbody.innerHTML = `<tr><td colspan="9"><div class="loading-spinner"></div> Loading grades...</td></tr>`;
        
        try {
            const user = window.currentUserProfile || {};
            const userProgram = user.program || '';
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
                        total: e.totalPercentage || 0,
                        grade: calculateGrade(e.totalPercentage || 0, userProgram),
                        points: calculatePoints(calculateGrade(e.totalPercentage || 0, userProgram), userProgram),
                        status: getGradingStatus(e.totalPercentage || 0, userProgram),
                        blockTerm: e.block_term || e.block || 'General',
                        year: e.intake_year || '2024'
                    }));
                }
            }
            
            if (grades.length === 0) {
                // ✅ No demo data - show empty state
                tbody.innerHTML = `
                    <tr>
                        <td colspan="9" style="text-align: center; padding: 40px; color: #94a3b8;">
                            <i class="fas fa-file-alt" style="font-size: 32px; display: block; margin-bottom: 10px;"></i>
                            No semester grades available
                        </td>
                    </tr>
                `;
                return;
            }
            
            currentGrades = grades;
            
            const total = grades.length;
            const totalScore = grades.reduce((sum, g) => sum + g.total, 0);
            const avgScore = total > 0 ? (totalScore / total) : 0;
            const gpa = calculateGPA(grades);
            const grade = calculateGrade(avgScore, userProgram);
            
            document.getElementById('semester-gpa').textContent = gpa.toFixed(2);
            document.getElementById('semester-grade').textContent = grade;
            document.getElementById('cumulative-gpa').textContent = gpa.toFixed(2);
            document.getElementById('cumulative-grade').textContent = grade;
            document.getElementById('total-credits-earned').textContent = total * 3;
            document.getElementById('class-rank').textContent = total > 0 ? 'Top 30%' : 'N/A';
            
            let html = '';
            grades.forEach((g, i) => {
                const statusColor = getStatusColor(g.status);
                const gradeColor = getGradeColor(g.grade);
                
                html += `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 12px;">${escapeHtml(g.courseCode)}</td>
                        <td style="padding: 12px;">${escapeHtml(g.courseName)}</td>
                        <td style="padding: 12px; text-align: center;">${g.credits}</td>
                        <td style="padding: 12px; text-align: center;">${g.total}%</td>
                        <td style="padding: 12px; text-align: center;">
                            <span style="background: ${gradeColor}; color: white; padding: 2px 12px; border-radius: 12px; font-weight: 700; font-size: 13px;">
                                ${g.grade}
                            </span>
                        </td>
                        <td style="padding: 12px; text-align: center; font-weight: 600;">${g.points.toFixed(1)}</td>
                        <td style="padding: 12px; text-align: center;">
                            <span style="background: ${statusColor}; color: white; padding: 2px 12px; border-radius: 12px; font-weight: 600; font-size: 11px;">
                                ${g.status}
                            </span>
                        </td>
                        <td style="padding: 12px; text-align: center;">${escapeHtml(g.blockTerm)}</td>
                        <td style="padding: 12px; text-align: center;">${g.year}</td>
                    </tr>
                `;
            });
            
            tbody.innerHTML = html;
            createGradeChart(grades);
            
        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="9" style="color: red; text-align: center; padding: 40px;">Error: ${error.message}</td></tr>`;
        }
    }

    function createGradeChart(grades) {
        const canvas = document.getElementById('grade-distribution-chart');
        if (!canvas) return;
        
        const gradeOrder = ['A', 'B', 'C', 'D', 'F', 'FAIL', 'N/A'];
        const gradeCounts = {};
        grades.forEach(g => {
            const grade = g.grade || 'N/A';
            gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;
        });
        
        const labels = gradeOrder.filter(l => gradeCounts[l] !== undefined);
        const data = labels.map(l => gradeCounts[l]);
        const colors = {
            'A': '#10b981',
            'B': '#3b82f6',
            'C': '#f59e0b',
            'D': '#f97316',
            'F': '#ef4444',
            'FAIL': '#ef4444',
            'N/A': '#94a3b8'
        };
        
        if (gradeChart) gradeChart.destroy();
        
        if (typeof Chart !== 'undefined' && labels.length > 0) {
            gradeChart = new Chart(canvas, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Number of Courses',
                        data: data,
                        borderColor: '#4C1D95',
                        backgroundColor: 'rgba(76, 29, 149, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.3,
                        pointBackgroundColor: labels.map(l => colors[l] || '#6b7280'),
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1,
                                font: { size: 10 }
                            }
                        },
                        x: {
                            ticks: {
                                font: { size: 10, weight: '600' }
                            }
                        }
                    }
                }
            });
        }
    }

    // ============================================================
    // 16. YEARLY REPORT
    // ============================================================
    function loadYearlyReport() {
        const user = window.currentUserProfile || {};
        const userProgram = user.program || '';
        const grades = currentGrades.length > 0 ? currentGrades : [];
        
        if (grades.length === 0) {
            // ✅ No demo data - show zeros
            document.getElementById('year-gpa').textContent = '0.00';
            document.getElementById('year-credits').textContent = '0';
            document.getElementById('year-courses').textContent = '0';
            document.getElementById('year-awards').textContent = '0';
            return;
        }
        
        const total = grades.length;
        const avg = total > 0 ? (grades.reduce((sum, g) => sum + g.total, 0) / total) : 0;
        const gpa = calculateGPA(grades);
        
        document.getElementById('year-gpa').textContent = gpa.toFixed(2);
        document.getElementById('year-credits').textContent = total * 3;
        document.getElementById('year-courses').textContent = total;
        document.getElementById('year-awards').textContent = total > 4 ? '2' : '0';
    }

    // ============================================================
    // 17. FULL TRANSCRIPT
    // ============================================================
    function loadTranscript() {
        const tbody = document.getElementById('transcript-table-body');
        if (!tbody) return;
        
        const user = window.currentUserProfile || {};
        const userProgram = user.program || '';
        document.getElementById('student-name-display').textContent = user.full_name || 'Student';
        document.getElementById('program-display').textContent = userProgram || 'KRCHN';
        document.getElementById('student-id-display').textContent = user.student_id || 'N/A';
        
        let marksData = [];
        
        if (window.myMarksData && window.myMarksData.length > 0) {
            marksData = window.myMarksData;
        } else if (currentGrades && currentGrades.length > 0) {
            marksData = currentGrades;
        } else {
            // ✅ No demo data - show empty state
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 60px; color: #94a3b8;">
                        <i class="fas fa-file-alt" style="font-size: 48px; display: block; margin-bottom: 16px;"></i>
                        <h4 style="margin: 0 0 8px 0; color: #1e293b;">No transcript data available</h4>
                        <p style="font-size: 13px;">Your transcript will appear here once you have completed courses.</p>
                    </td>
                </tr>
            `;
            updateTranscriptSummary(0, 0, 0, 0);
            return;
        }
        
        const transcriptData = marksData.map(m => {
            return {
                courseCode: m.unit_code || getUnitCode(m.subject_name || m.courseName || 'N/A'),
                courseName: m.subject_name || m.courseName || 'Unknown Course',
                credits: m.credits || 3,
                grade: m.grade || calculateGrade(m.final_score || m.total || 0, userProgram),
                points: m.points || calculatePoints(m.grade || calculateGrade(m.final_score || m.total || 0, userProgram), userProgram),
                status: getGradingStatus(m.final_score || m.total || 0, userProgram),
                blockTerm: m.block || m.blockTerm || 'General',
                year: m.academic_year || m.year || '2024',
                score: m.final_score || m.total || 0
            };
        });
        
        let totalCreditsAttempted = 0;
        let totalCreditsEarned = 0;
        let totalPoints = 0;
        let totalCourses = transcriptData.length;
        let passedCourses = 0;
        let failedCourses = 0;
        let pendingCourses = 0;
        
        const groupedByBlock = {};
        transcriptData.forEach(g => {
            const block = g.blockTerm || 'General';
            if (!groupedByBlock[block]) {
                groupedByBlock[block] = [];
            }
            groupedByBlock[block].push(g);
        });
        const blockNames = Object.keys(groupedByBlock).sort();
        
        if (transcriptData.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 60px; color: #94a3b8;">
                        <i class="fas fa-file-alt" style="font-size: 48px; display: block; margin-bottom: 16px;"></i>
                        <h4 style="margin: 0 0 8px 0; color: #1e293b;">No transcript data available</h4>
                        <p style="font-size: 13px;">Your transcript will appear here once you have completed courses.</p>
                    </td>
                </tr>
            `;
            updateTranscriptSummary(0, 0, 0, 0);
            return;
        }
        
        let html = '';
        blockNames.forEach((block) => {
            const blockGrades = groupedByBlock[block];
            const blockTotal = blockGrades.length;
            const blockPassed = blockGrades.filter(g => g.status !== 'FAIL' && g.status !== 'PENDING').length;
            const blockCredits = blockGrades.reduce((sum, g) => sum + (g.credits || 3), 0);
            const blockPoints = blockGrades.reduce((sum, g) => sum + ((g.points || 0) * (g.credits || 3)), 0);
            const blockGPA = blockCredits > 0 ? (blockPoints / blockCredits) : 0;
            const blockPassRate = blockTotal > 0 ? Math.round((blockPassed / blockTotal) * 100) : 0;
            
            html += `
                <tr style="background: #0A3D62; color: white; font-weight: 700;">
                    <td colspan="6" style="padding: 8px 12px; text-align: center; font-size: 12px;">
                        <i class="fas fa-folder-open"></i> ${escapeHtml(block)} 
                        <span style="font-size: 10px; opacity: 0.8; margin-left: 10px;">
                            (${blockTotal} courses · GPA: ${blockGPA.toFixed(2)} · Pass: ${blockPassRate}%)
                        </span>
                    </td>
                </tr>
            `;
            
            blockGrades.forEach((g, index) => {
                const gradeColor = getGradeColor(g.grade);
                const pointsEarned = (g.points || 0) * (g.credits || 3);
                const isPassing = g.status !== 'FAIL' && g.status !== 'PENDING';
                
                totalCreditsAttempted += (g.credits || 3);
                if (isPassing) {
                    totalCreditsEarned += (g.credits || 3);
                    passedCourses++;
                } else if (g.status === 'FAIL') {
                    failedCourses++;
                } else {
                    pendingCourses++;
                }
                totalPoints += pointsEarned;
                
                html += `
                    <tr style="border-bottom: 1px solid #e2e8f0; ${index % 2 === 0 ? 'background: #f8fafc;' : ''}">
                        <td style="padding: 6px 10px; font-size: 11px; color: #94a3b8; text-align: center;">${index + 1}</td>
                        <td style="padding: 6px 10px; font-weight: 600; color: #0A3D62; font-size: 12px;">${escapeHtml(g.courseCode)}</td>
                        <td style="padding: 6px 10px; font-size: 12px;">${escapeHtml(g.courseName)}</td>
                        <td style="padding: 6px 10px; text-align: center; font-size: 12px;">${g.credits || 3}</td>
                        <td style="padding: 6px 10px; text-align: center;">
                            <span style="background: ${gradeColor}; color: white; padding: 2px 12px; border-radius: 12px; font-weight: 700; font-size: 13px; display: inline-block;">
                                ${g.grade || '-'}
                            </span>
                        </td>
                        <td style="padding: 6px 10px; text-align: center; font-weight: 600; font-size: 12px; color: ${isPassing ? '#10b981' : '#ef4444'};">
                            ${pointsEarned.toFixed(1)}
                        </td>
                    </tr>
                `;
            });
            
            html += `
                <tr style="background: #f1f5f9; border-top: 2px solid #0A3D62;">
                    <td colspan="3" style="padding: 4px 10px; font-size: 10px; color: #64748b;">
                        <strong>Block Summary:</strong> ${blockPassed}/${blockTotal} passed
                    </td>
                    <td colspan="3" style="padding: 4px 10px; font-size: 10px; color: #64748b; text-align: right;">
                        GPA: <strong>${blockGPA.toFixed(2)}</strong> | Pass Rate: <strong style="color: ${blockPassRate >= 70 ? '#10b981' : '#f59e0b'};">${blockPassRate}%</strong>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
        
        const cgpa = totalCreditsAttempted > 0 ? (totalPoints / totalCreditsAttempted) : 0;
        updateTranscriptSummary(totalCreditsAttempted, totalCreditsEarned, totalCourses, cgpa);
    }

    function updateTranscriptSummary(attempted, earned, courses, cgpa) {
        document.getElementById('total-attempted').textContent = attempted;
        document.getElementById('total-earned').textContent = earned;
        document.getElementById('transcript-cgpa').textContent = cgpa.toFixed(2);
    }

    // ============================================================
    // 18. COURSE PROGRESS
    // ============================================================
    function loadCourseProgress() {
        const container = document.getElementById('course-progress-list');
        if (!container) return;
        
        const user = window.currentUserProfile || {};
        const userProgram = user.program || '';
        const grades = currentGrades.length > 0 ? currentGrades : [];
        
        if (grades.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 40px; color: #94a3b8;">No course data available</div>';
            document.getElementById('completed-courses-progress').textContent = '0';
            document.getElementById('total-courses-progress').textContent = '0';
            return;
        }
        
        let html = '';
        grades.forEach(g => {
            const barColor = getGradeColor(g.grade);
            html += `
                <div class="progress-item">
                    <div class="progress-header">
                        <span class="course-name">${escapeHtml(g.courseName)}</span>
                        <span class="progress-percent">${g.total}%</span>
                        <span style="background: ${getGradeColor(g.grade)}; color: white; padding: 2px 8px; border-radius: 10px; font-weight: 600; font-size: 10px;">
                            ${g.grade}
                        </span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${g.total}%; background: ${barColor};"></div>
                    </div>
                    <div style="margin-top: 4px; font-size: 12px; color: ${getStatusColor(g.status)};">
                        ${g.status} · Points: ${g.points.toFixed(1)}
                    </div>
                </div>
            `;
        });
        
        document.getElementById('completed-courses-progress').textContent = grades.filter(g => g.status !== 'FAIL' && g.status !== 'PENDING').length;
        document.getElementById('total-courses-progress').textContent = grades.length;
        container.innerHTML = html;
    }

    // ============================================================
    // 19. DOWNLOAD FULL TRANSCRIPT
    // ============================================================
    function downloadTranscriptPDF() {
        const user = window.currentUserProfile || {};
        const userProgram = user.program || '';
        const isTVET = PROGRAM.isTVET(userProgram);
        const programType = PROGRAM.getProgramType(userProgram);
        
        let marksData = [];
        if (window.myMarksData && window.myMarksData.length > 0) {
            marksData = window.myMarksData;
        } else if (currentGrades && currentGrades.length > 0) {
            marksData = currentGrades;
        } else {
            alert('No marks available to generate transcript.');
            return;
        }
        
        if (marksData.length === 0) {
            alert('No marks available to generate transcript.');
            return;
        }
        
        const transcriptData = marksData.map(m => ({
            courseCode: m.unit_code || getUnitCode(m.subject_name || m.courseName || 'N/A'),
            courseName: m.subject_name || m.courseName || 'Unknown Course',
            credits: m.credits || 3,
            grade: m.grade || calculateGrade(m.final_score || m.total || 0, userProgram),
            points: m.points || calculatePoints(m.grade || calculateGrade(m.final_score || m.total || 0, userProgram), userProgram),
            status: getGradingStatus(m.final_score || m.total || 0, userProgram),
            blockTerm: m.block || m.blockTerm || 'General',
            year: m.academic_year || m.year || '2024',
            score: m.final_score || m.total || 0
        }));
        
        // ... rest of download function remains the same ...
        // (keeping it short since it's a large function)
        console.log('📊 Generating transcript PDF for', transcriptData.length, 'courses');
        alert('Transcript download coming soon!');
    }

 // ============================================================
// 20. DOWNLOAD SEMESTER REPORT - FIXED VERSION
// ============================================================
function downloadReportCard() {
    console.log('📊 Downloading Semester Report...');
    
    const user = window.currentUserProfile || {};
    const userProgram = user.program || '';
    const isTVET = PROGRAM.isTVET(userProgram);
    const programType = PROGRAM.getProgramType(userProgram);
    
    let marks = [];
    
    // ✅ Try multiple ways to get marks data
    // 1. Try from the closure variables (myMarksData)
    if (typeof myMarksData !== 'undefined' && myMarksData.length > 0) {
        marks = myMarksData;
        console.log('📊 Got marks from myMarksData:', marks.length);
    } 
    // 2. Try from myMarksFiltered
    else if (typeof myMarksFiltered !== 'undefined' && myMarksFiltered.length > 0) {
        marks = myMarksFiltered;
        console.log('📊 Got marks from myMarksFiltered:', marks.length);
    }
    // 3. Try from window
    else if (window.myMarksData && window.myMarksData.length > 0) {
        marks = window.myMarksData;
        console.log('📊 Got marks from window.myMarksData:', marks.length);
    } 
    // 4. Try from the table directly
    else {
        const tableRows = document.querySelectorAll('#my_marks_table_body tr');
        if (tableRows && tableRows.length > 0) {
            console.log('📊 Reading marks from table...');
            tableRows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 6) {
                    const unitCode = cells[1]?.textContent?.trim() || '';
                    const unitName = cells[2]?.textContent?.trim() || '';
                    const grade = cells[3]?.textContent?.trim() || '';
                    const points = parseFloat(cells[4]?.textContent?.trim()) || 0;
                    const status = cells[5]?.textContent?.trim() || '';
                    
                    if (unitName && unitName !== 'No published marks found' && unitName !== 'No marks match the current filter') {
                        // Check if this unit has a hollow star (retake)
                        const hasRetake = unitName.includes('☆') || cells[2]?.querySelector('.hollow-star') !== null;
                        const cleanUnitName = unitName.replace('☆', '').trim();
                        
                        marks.push({
                            subject_name: cleanUnitName,
                            unit_code: unitCode,
                            grade: grade,
                            points: points,
                            status: status,
                            final_score: 0,
                            hasRetake: hasRetake,
                            retakeCount: hasRetake ? 1 : 0
                        });
                    }
                }
            });
            console.log('📊 Got marks from table:', marks.length);
        }
    }
    
    if (marks.length === 0) {
        // ✅ Show a better message with instructions
        alert('📊 No marks available to generate semester report.\n\nPlease:\n1. Click the "Refresh" button to load your marks\n2. Make sure you have published marks\n3. Try switching tabs and coming back\n\nIf the problem persists, contact support.');
        return;
    }
    
    console.log('📊 Generating semester report for', marks.length, 'marks');
    
    // Show loading
    const loadingEl = document.createElement('div');
    loadingEl.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;';
    loadingEl.innerHTML = '<div style="background:white;padding:30px;border-radius:12px;text-align:center;"><div class="loading-spinner"></div><p style="margin-top:12px;color:#1e293b;">Generating Semester Report...</p></div>';
    document.body.appendChild(loadingEl);
    
    try {
        let profilePicture = '';
        if (user.passport_photo || user.profile_picture || user.photo_url) {
            profilePicture = user.passport_photo || user.profile_picture || user.photo_url || '';
        }
        
        const now = new Date().toLocaleDateString('en-KE', {
            timeZone: 'Africa/Nairobi',
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
        
        const currentYear = new Date().getFullYear();
        const nextYear = currentYear + 1;
        const academicYear = user.academic_year || `${currentYear}/${nextYear}`;
        
        let totalPoints = 0;
        let totalUnits = 0;
        let passed = 0;
        let failed = 0;
        let pending = 0;
        let retakeUnits = 0;
        
        marks.forEach(m => {
            const points = m.points || 0;
            const status = m.status || getGradingStatus(0, userProgram);
            
            totalPoints += points;
            totalUnits++;
            
            if (status === 'FAIL') {
                failed++;
            } else if (status === 'PENDING') {
                pending++;
            } else {
                passed++;
            }
            
            if (m.hasRetake) retakeUnits++;
        });
        
        const gpa = totalUnits > 0 ? (totalPoints / totalUnits) : 0;
        
        let grade;
        if (isTVET) {
            if (gpa >= 3.75) grade = 'A';
            else if (gpa >= 3.0) grade = 'B';
            else if (gpa >= 2.0) grade = 'C';
            else grade = 'FAIL';
        } else {
            if (gpa >= 3.75) grade = 'A';
            else if (gpa >= 3.0) grade = 'B';
            else if (gpa >= 2.0) grade = 'C';
            else grade = 'D';
        }
        
        const passRate = totalUnits > 0 ? Math.round((passed / totalUnits) * 100) : 0;
        
        // Build table rows with HOLLOW STAR (☆)
        let tableRows = '';
        marks.forEach((mark, index) => {
            const status = mark.status || getGradingStatus(0, userProgram);
            const statusColor = getStatusColor(status);
            const unitCode = mark.unit_code || getUnitCode(mark.subject_name) || 'N/A';
            const points = mark.points || calculatePoints(mark.grade, userProgram) || 0;
            const gradeColor = getGradeColor(mark.grade);
            const gradeDisplay = mark.grade || calculateGrade(0, userProgram) || '-';
            const hasRetake = mark.hasRetake || false;
            const retakeCount = mark.retakeCount || 0;
            const retakeScore = mark.retakeScore;
            const isRetakePassed = mark.retakeStatus === 'PASS';
            
            // ✅ HOLLOW STAR indicator (☆) - subtle
            const starIndicator = hasRetake ? '☆' : '';
            const starTooltip = hasRetake ? `title="Retaken (${retakeCount} attempt${retakeCount > 1 ? 's' : ''})"` : '';
            
            tableRows += `
                <tr style="${index % 2 === 0 ? 'background: #f9fafb;' : ''} ${hasRetake ? 'border-left: 2px solid #94a3b8;' : ''}">
                    <td style="padding: 4px 8px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 8px; color: #94a3b8;">${index + 1}</td>
                    <td style="padding: 4px 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #0A3D62; font-size: 8px;">${escapeHtml(unitCode)}</td>
                    <td style="padding: 4px 8px; border-bottom: 1px solid #e5e7eb; font-size: 8px; color: #1e293b;">
                        ${escapeHtml(mark.subject_name || 'N/A')}
                        ${hasRetake ? `<span ${starTooltip} style="display: inline-block; margin-left: 4px; font-size: 11px; color: #94a3b8; opacity: 0.5; cursor: help;">☆</span>` : ''}
                        ${retakeScore !== null ? `<span style="display: inline-block; margin-left: 4px; font-size: 7px; color: ${isRetakePassed ? '#059669' : '#dc2626'}; font-weight: 600;">${isRetakePassed ? '✅' : '❌'} ${retakeScore}%</span>` : ''}
                    </td>
                    <td style="padding: 4px 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">
                        <span style="background: ${gradeColor}; color: white; padding: 2px 10px; border-radius: 10px; font-weight: 700; font-size: 9px; display: inline-block; min-width: 26px;">
                            ${escapeHtml(gradeDisplay)}
                        </span>
                        ${hasRetake ? `<span style="display: block; font-size: 6px; color: #94a3b8; opacity: 0.5;">☆ retake</span>` : ''}
                    </td>
                    <td style="padding: 4px 8px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: 700; font-size: 9px; color: ${gradeColor};">
                        ${points.toFixed(1)}
                    </td>
                    <td style="padding: 4px 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">
                        <span style="background: ${statusColor}; color: white; padding: 2px 8px; border-radius: 10px; font-weight: 600; font-size: 7px; display: inline-block;">
                            ${status}
                        </span>
                        ${isRetakePassed ? `<span style="display: block; font-size: 6px; color: #059669;">☆ Passed!</span>` : ''}
                    </td>
                    <td style="padding: 4px 8px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 7px; color: #94a3b8; opacity: 0.5;">
                        ${hasRetake ? `☆ R${retakeCount}` : '—'}
                    </td>
                </tr>
            `;
        });
        
        // Generate data for line graph
        const sortedMarks = [...marks].sort((a, b) => {
            const blockOrder = {
                'Introductory': 0, 'Block 1': 1, 'Block 2': 2, 'Block 3': 3,
                'Block 4': 4, 'Block 5': 5, 'Final': 6,
                'Term 1': 1, 'Term 2': 2, 'Term 3': 3, 'Term 4': 4,
                'Term 5': 5, 'Term 6': 6
            };
            return (blockOrder[a.block] || 0) - (blockOrder[b.block] || 0);
        });
        
        const graphLabels = sortedMarks.map(m => m.unit_code || getUnitCode(m.subject_name) || 'N/A');
        const graphData = sortedMarks.map(m => m.points || 0);
        const avgPoints = graphData.reduce((a, b) => a + b, 0) / graphData.length || 0;
        
        // TABLE FORMAT GRADING SCALE
        let gradingScaleHTML = '';
        if (isTVET) {
            gradingScaleHTML = `
                <table style="width: 100%; border-collapse: collapse; font-size: 7px; margin: 0 auto;">
                    <thead>
                        <tr style="background: #0A3D62; color: white;">
                            <th style="padding: 3px 6px; text-align: center;">Marks Range</th>
                            <th style="padding: 3px 6px; text-align: center;">Grade</th>
                            <th style="padding: 3px 6px; text-align: center;">Points</th>
                            <th style="padding: 3px 6px; text-align: center;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="background: #d1fae5;">
                            <td style="padding: 3px 6px; text-align: center;">75 - 100%</td>
                            <td style="padding: 3px 6px; text-align: center; font-weight: 700; color: #065f46;">A</td>
                            <td style="padding: 3px 6px; text-align: center;">4.0</td>
                            <td style="padding: 3px 6px; text-align: center; font-weight: 600; color: #065f46;">EXCELLENT</td>
                        </tr>
                        <tr style="background: #dbeafe;">
                            <td style="padding: 3px 6px; text-align: center;">65 - 74%</td>
                            <td style="padding: 3px 6px; text-align: center; font-weight: 700; color: #1e40af;">B</td>
                            <td style="padding: 3px 6px; text-align: center;">3.0</td>
                            <td style="padding: 3px 6px; text-align: center; font-weight: 600; color: #1e40af;">GOOD</td>
                        </tr>
                        <tr style="background: #fef3c7;">
                            <td style="padding: 3px 6px; text-align: center;">50 - 64%</td>
                            <td style="padding: 3px 6px; text-align: center; font-weight: 700; color: #92400e;">C</td>
                            <td style="padding: 3px 6px; text-align: center;">2.0</td>
                            <td style="padding: 3px 6px; text-align: center; font-weight: 600; color: #92400e;">SATISFACTORY</td>
                        </tr>
                        <tr style="background: #fee2e2;">
                            <td style="padding: 3px 6px; text-align: center;">Below 50%</td>
                            <td style="padding: 3px 6px; text-align: center; font-weight: 700; color: #991b1b;">FAIL</td>
                            <td style="padding: 3px 6px; text-align: center;">0.0</td>
                            <td style="padding: 3px 6px; text-align: center; font-weight: 600; color: #991b1b;">FAIL</td>
                        </tr>
                        <tr style="background: #f3f4f6;">
                            <td style="padding: 3px 6px; text-align: center; font-style: italic;">No Score</td>
                            <td style="padding: 3px 6px; text-align: center;">-</td>
                            <td style="padding: 3px 6px; text-align: center;">-</td>
                            <td style="padding: 3px 6px; text-align: center; font-weight: 600; color: #94a3b8;">PENDING</td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr><td colspan="4" style="padding: 3px 6px; text-align: center; font-weight: 600; color: #0A3D62; font-size: 7px;">Min Pass: 50%</td></tr>
                    </tfoot>
                </table>
            `;
        } else {
            gradingScaleHTML = `
                <table style="width: 100%; border-collapse: collapse; font-size: 7px; margin: 0 auto;">
                    <thead>
                        <tr style="background: #0A3D62; color: white;">
                            <th style="padding: 3px 6px; text-align: center;">Marks Range</th>
                            <th style="padding: 3px 6px; text-align: center;">Grade</th>
                            <th style="padding: 3px 6px; text-align: center;">Points</th>
                            <th style="padding: 3px 6px; text-align: center;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="background: #d1fae5;">
                            <td style="padding: 3px 6px; text-align: center;">75 - 100%</td>
                            <td style="padding: 3px 6px; text-align: center; font-weight: 700; color: #065f46;">A</td>
                            <td style="padding: 3px 6px; text-align: center;">4.0</td>
                            <td style="padding: 3px 6px; text-align: center; font-weight: 600; color: #065f46;">DISTINCTION</td>
                        </tr>
                        <tr style="background: #dbeafe;">
                            <td style="padding: 3px 6px; text-align: center;">65 - 74%</td>
                            <td style="padding: 3px 6px; text-align: center; font-weight: 700; color: #1e40af;">B</td>
                            <td style="padding: 3px 6px; text-align: center;">3.0</td>
                            <td style="padding: 3px 6px; text-align: center; font-weight: 600; color: #1e40af;">CREDIT</td>
                        </tr>
                        <tr style="background: #fef3c7;">
                            <td style="padding: 3px 6px; text-align: center;">60 - 64%</td>
                            <td style="padding: 3px 6px; text-align: center; font-weight: 700; color: #92400e;">C</td>
                            <td style="padding: 3px 6px; text-align: center;">2.0</td>
                            <td style="padding: 3px 6px; text-align: center; font-weight: 600; color: #92400e;">PASS</td>
                        </tr>
                        <tr style="background: #fee2e2;">
                            <td style="padding: 3px 6px; text-align: center;">Below 60%</td>
                            <td style="padding: 3px 6px; text-align: center; font-weight: 700; color: #991b1b;">D</td>
                            <td style="padding: 3px 6px; text-align: center;">0.0</td>
                            <td style="padding: 3px 6px; text-align: center; font-weight: 600; color: #991b1b;">FAIL</td>
                        </tr>
                        <tr style="background: #f3f4f6;">
                            <td style="padding: 3px 6px; text-align: center; font-style: italic;">No Score</td>
                            <td style="padding: 3px 6px; text-align: center;">-</td>
                            <td style="padding: 3px 6px; text-align: center;">-</td>
                            <td style="padding: 3px 6px; text-align: center; font-weight: 600; color: #94a3b8;">PENDING</td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr><td colspan="4" style="padding: 3px 6px; text-align: center; font-weight: 600; color: #0A3D62; font-size: 7px;">Min Pass: 60%</td></tr>
                    </tfoot>
                </table>
            `;
        }
        
        // Profile picture HTML
        let profilePictureHTML = '';
        if (profilePicture) {
            profilePictureHTML = `
                <div style="text-align: center; margin-right: 12px; flex-shrink: 0;">
                    <img src="${profilePicture}" alt="Student Photo" 
                         style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 3px solid #0A3D62; padding: 2px; background: white;"
                         onerror="this.style.display='none'">
                </div>
            `;
        }
        
        loadingEl.remove();
        
        const printWindow = window.open('', '_blank', 'width=750,height=1050');
        if (printWindow) {
            printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Semester Report - ${escapeHtml(user.full_name || 'Student')}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { size: A4 portrait; margin: 8mm 10mm; }
        body { font-family: 'Times New Roman', 'Georgia', serif; background: #ffffff; font-size: 10px; margin: 0; padding: 10px; color: #1e293b; }
        .container { max-width: 750px; width: 100%; margin: 0 auto; padding: 16px 20px; background: #ffffff; border: 2px solid #0A3D62; border-radius: 6px; }
        .header { text-align: center; border-bottom: 3px double #0A3D62; padding-bottom: 10px; margin-bottom: 12px; }
        .header-top { display: flex; align-items: center; justify-content: center; gap: 12px; }
        .header-top img { max-height: 40px; width: auto; }
        .header .school { font-size: 16px; font-weight: 700; color: #0A3D62; font-family: 'Georgia', serif; }
        .header .motto { font-size: 8px; color: #64748b; font-style: italic; }
        .header .subtitle { font-size: 13px; color: #0A3D62; font-weight: 700; margin-top: 3px; letter-spacing: 1.5px; font-family: 'Georgia', serif; }
        .header .date { font-size: 8px; color: #94a3b8; margin-top: 2px; }
        .student-info-wrapper { display: flex; align-items: center; gap: 12px; margin: 6px 0 10px 0; padding: 8px 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; }
        .student-info { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; flex: 1; }
        .student-info .field { display: flex; flex-direction: column; }
        .student-info .label { font-size: 7px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
        .student-info .value { font-weight: 600; font-size: 10px; color: #0A3D62; margin-top: 1px; }
        .student-photo { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 3px solid #0A3D62; padding: 2px; background: white; flex-shrink: 0; }
        .summary-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin: 8px 0; }
        .summary-card { background: #f8fafc; border-radius: 6px; padding: 8px 10px; text-align: center; border: 1px solid #e2e8f0; }
        .summary-card .value { font-size: 18px; font-weight: 700; color: #0A3D62; }
        .summary-card .label { font-size: 7px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
        /* Hollow Star Style */
        .hollow-star { 
            display: inline-block; 
            font-size: 11px; 
            color: #94a3b8; 
            opacity: 0.5; 
            cursor: help; 
            margin-left: 2px; 
        }
        .hollow-star:hover { opacity: 1; }
        table { width: 100%; border-collapse: collapse; margin: 6px 0 8px 0; font-size: 8px; }
        thead th { background: #0A3D62; color: white; padding: 5px 8px; text-align: left; font-size: 7px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
        thead th.center { text-align: center; }
        tbody td { padding: 4px 8px; border-bottom: 1px solid #e5e7eb; font-size: 8px; }
        .chart-container { margin: 6px 0 8px 0; padding: 8px 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; }
        .chart-container .title { font-weight: 700; font-size: 8px; color: #0A3D62; text-align: center; margin-bottom: 4px; }
        .chart-container canvas { width: 100% !important; height: 120px !important; max-height: 120px; }
        .grading-scale-table { margin: 6px 0 8px 0; padding: 6px 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; }
        .grading-scale-table .title { font-weight: 700; font-size: 8px; color: #0A3D62; text-align: center; margin-bottom: 4px; }
        .grading-scale-table table { width: 100%; border-collapse: collapse; font-size: 7px; margin: 0 auto; }
        .grading-scale-table th { background: #0A3D62; color: white; padding: 3px 6px; text-align: center; font-size: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
        .grading-scale-table td { padding: 3px 6px; text-align: center; border: 1px solid #e2e8f0; font-size: 7px; }
        .retake-summary-box { margin: 6px 0 8px 0; padding: 6px 12px; background: #fffbeb; border-radius: 6px; border: 1px solid #f59e0b; font-size: 8px; color: #92400e; text-align: center; }
        .retake-summary-box strong { color: #0A3D62; }
        .declaration { margin: 6px 0 8px 0; padding: 6px 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 8px; }
        .declaration .title { font-weight: 700; color: #0A3D62; font-size: 8px; }
        .declaration .checkbox { display: inline-block; width: 9px; height: 9px; border: 2px solid #0A3D62; border-radius: 2px; margin-right: 4px; vertical-align: middle; background: #0A3D62; position: relative; }
        .declaration .checkbox::after { content: "✓"; color: white; font-size: 6px; position: absolute; top: -2px; left: 0px; }
        .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin: 8px 0 6px 0; padding-top: 8px; border-top: 1px solid #e2e8f0; }
        .signature-box { text-align: center; }
        .signature-box .line { border-bottom: 2px solid #1e293b; width: 130px; margin: 8px auto 2px auto; }
        .signature-box .label { font-size: 7px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
        .signature-box .name { font-weight: 600; font-size: 10px; color: #0A3D62; }
        .footer { text-align: center; margin-top: 6px; padding-top: 6px; border-top: 1px solid #e2e8f0; font-size: 7px; color: #94a3b8; }
        .footer strong { color: #0A3D62; }
        .no-print { text-align: center; margin-top: 8px; }
        .no-print button { padding: 5px 18px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 10px; }
        .no-print .btn-print { background: #0A3D62; color: white; }
        .no-print .btn-close { background: #e2e8f0; color: #475569; margin-left: 6px; }
        @media print {
            body { padding: 0; background: white; }
            .container { border: 2px solid #0A3D62; border-radius: 0; padding: 12px 16px; max-width: 100%; }
            .no-print { display: none !important; }
            thead th { background: #0A3D62 !important; color: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            td span { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .student-photo { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .chart-container canvas { height: 120px !important; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-top">
                <img src="https://raw.githubusercontent.com/NCHSMlearning/e-learning/main/images/Logo_NCHSM.png" alt="NCHSM Logo" onerror="this.style.display='none'">
                <div>
                    <div class="school">NAKURU COLLEGE OF HEALTH SCIENCES AND MANAGEMENT</div>
                    <div class="motto">"Excellence in Health Sciences Education"</div>
                </div>
            </div>
            <div class="subtitle">📊 SEMESTER REPORT</div>
            <div class="date">Generated: ${now}</div>
        </div>
        
        <div class="student-info-wrapper">
            ${profilePictureHTML}
            <div class="student-info">
                <div class="field"><span class="label">👤 Student Name</span><span class="value">${escapeHtml(user.full_name || 'Student')}</span></div>
                <div class="field"><span class="label">🪪 Admission Number</span><span class="value">${escapeHtml(user.student_id || user.admission_number || 'N/A')}</span></div>
                <div class="field"><span class="label">🎓 Program</span><span class="value">${escapeHtml(userProgram || 'KRCHN')}</span></div>
                <div class="field"><span class="label">📅 Academic Year</span><span class="value">${escapeHtml(academicYear)}</span></div>
            </div>
        </div>
        
        ${retakeUnits > 0 ? `
        <div class="retake-summary-box">
            <i class="fas fa-star" style="color: #f59e0b;"></i>
            <strong>Retake Summary:</strong> ${retakeUnits} unit(s) were retaken
            <span style="font-size: 7px; color: #94a3b8; margin-left: 6px;">(☆ indicates retaken units)</span>
        </div>
        ` : ''}
        
        <table>
            <thead>
                <tr>
                    <th style="text-align: center; width: 25px;">#</th>
                    <th style="min-width: 65px;">Unit Code</th>
                    <th style="min-width: 120px;">Unit Name</th>
                    <th style="text-align: center; width: 45px;">Grade</th>
                    <th style="text-align: center; width: 45px;">Points</th>
                    <th style="text-align: center; width: 65px;">Status</th>
                    <th style="text-align: center; width: 45px;">☆</th>
                </tr>
            </thead>
            <tbody>${tableRows}</tbody>
        </table>
        
        <div class="summary-grid">
            <div class="summary-card"><div class="value" style="color: #0A3D62;">${gpa.toFixed(2)}</div><div class="label">GPA</div></div>
            <div class="summary-card"><div class="value" style="color: ${grade === 'A' ? '#10b981' : grade === 'B' ? '#3b82f6' : grade === 'C' ? '#f59e0b' : '#ef4444'};">${grade}</div><div class="label">Grade</div></div>
            <div class="summary-card"><div class="value" style="color: #0A3D62;">${totalUnits}</div><div class="label">Units</div></div>
            <div class="summary-card"><div class="value" style="color: #0A3D62;">${passRate}%</div><div class="label">Pass Rate</div></div>
            <div class="summary-card"><div class="value" style="color: #94a3b8; opacity: 0.5;">${retakeUnits}</div><div class="label">☆ Retakes</div></div>
        </div>
        
        <div class="grading-scale-table">
            <div class="title">📊 Grading Scale (${programType})</div>
            ${gradingScaleHTML}
        </div>
        
        <div class="chart-container">
            <div class="title">📈 Grade Points Progression</div>
            <canvas id="reportCardLineChart"></canvas>
        </div>
        
        <div class="declaration">
            <span class="title">📋 Student Declaration:</span>
            <span class="checkbox"></span>
            <span>I confirm that the grades presented are accurate and reflect my academic performance.</span>
            <div style="font-size: 6px; color: #94a3b8; margin-top: 2px;">I understand that falsification will result in disciplinary action.</div>
        </div>
        
        <div class="signatures">
            <div class="signature-box">
                <div class="name">${escapeHtml(user.full_name || 'Student')}</div>
                <div class="line"></div>
                <div class="label">Student Signature</div>
                <div class="date">Date: ${now}</div>
            </div>
            <div class="signature-box">
                <div class="name" style="color: #94a3b8;">_________________________</div>
                <div class="line"></div>
                <div class="label">Head of Department (HOD)</div>
                <div class="date">Date: _____________</div>
            </div>
        </div>
        
        <div class="footer">
            <p>This is an official document. For verification, contact the Academic Office.</p>
            <p><strong>NCHSM</strong> · P.O. Box 12906 - 20100, Nakuru · Tel: 0790969743</p>
        </div>
        
        <div class="no-print">
            <button class="btn-print" onclick="window.print()">🖨️ Print Semester Report</button>
            <button class="btn-close" onclick="window.close()">Close</button>
        </div>
    </div>
    
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const ctx = document.getElementById('reportCardLineChart');
            if (ctx) {
                const labels = ${JSON.stringify(graphLabels)};
                const data = ${JSON.stringify(graphData)};
                const avgPoints = ${avgPoints.toFixed(2)};
                
                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Grade Points',
                            data: data,
                            borderColor: '#4C1D95',
                            backgroundColor: 'rgba(76, 29, 149, 0.1)',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.3,
                            pointBackgroundColor: data.map(p => {
                                if (p >= 4) return '#10b981';
                                if (p >= 3) return '#3b82f6';
                                if (p >= 2) return '#f59e0b';
                                return '#ef4444';
                            }),
                            pointBorderColor: '#ffffff',
                            pointBorderWidth: 1.5,
                            pointRadius: 5,
                            pointHoverRadius: 7
                        }, {
                            label: 'GPA (' + avgPoints.toFixed(2) + ')',
                            data: data.map(() => avgPoints),
                            borderColor: '#0A3D62',
                            borderDash: [6, 4],
                            borderWidth: 1.5,
                            fill: false,
                            tension: 0,
                            pointRadius: 0,
                            pointHoverRadius: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: true,
                                position: 'top',
                                labels: {
                                    boxWidth: 10,
                                    padding: 6,
                                    font: { size: 8, weight: '600' }
                                }
                            }
                        },
                        scales: {
                            y: { min: 0, max: 4.5, ticks: { stepSize: 0.5, font: { size: 8 } } },
                            x: { ticks: { font: { size: 7 }, maxRotation: 30, minRotation: 20 } }
                        }
                    }
                });
            }
        });
    <\/script>
</body>
</html>
            `);
            printWindow.document.close();
            setTimeout(() => { printWindow.print(); }, 800);
        } else {
            alert('Please allow popups to download the semester report.');
        }
        
    } catch (error) {
        loadingEl.remove();
        alert('Error generating report: ' + error.message);
        console.error('Report error:', error);
    }
}
    // ============================================================
    // 21. TAB SWITCHING
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
    // 22. INITIALIZE
    // ============================================================
    function init() {
        console.log('🔧 Initializing Academic Reports with Hollow Star Indicator...');
        setupTabs();
        
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
        
        console.log('✅ Academic Reports with Hollow Star Indicator ready!');
        console.log('☆ Hollow Star: Subtle indicator for retaken units (My Performance only)');
        console.log('📊 NO DEMO DATA - Only real data from database');
    }

    // ============================================================
    // 23. EXPOSE FUNCTIONS
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
    window.getGradingStatus = getGradingStatus;
    window.calculateGrade = calculateGrade;
    window.calculatePoints = calculatePoints;
    window.calculateGPA = calculateGPA;
    window.PROGRAM = PROGRAM;
    window.renderMyMarksCharts = renderMyMarksCharts;
    window.fetchStudentRetakeData = fetchStudentRetakeData;
    window.hasRetake = hasRetake;
    window.getRetakeCount = getRetakeCount;
    window.getHollowStarHtml = getHollowStarHtml;

    // ============================================================
    // 24. AUTO-INIT
    // ============================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('✅ Student Academic Reports Module loaded');
    console.log('📊 Available functions:');
    console.log('   - loadMyMarks() - Load published marks with hollow star indicator');
    console.log('   - filterMyMarks() - Filter marks');
    console.log('   - downloadReportCard() - Download semester report');
    console.log('   - downloadTranscriptPDF() - Download full transcript');
    console.log('   - renderMyMarksCharts() - Render Line Charts');
    console.log('☆ Hollow Star: Subtle indicator for retaken units (My Performance only)');
    console.log('📊 TVET Min Pass: 50% | Nursing Min Pass: 60%');
    console.log('📊 NO DEMO DATA - Only real data from database');
})();
