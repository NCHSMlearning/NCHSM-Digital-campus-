// ============================================================
// SUPER ADMIN TRANSCRIPT GENERATOR - COMPLETE FINAL VERSION
// WITH FIXED GRADING SCALE (TVET/NURSING) AND FULL TABLE BORDERS
// ============================================================

console.log('📄 Super Admin Transcript Generator Loading... (FINAL VERSION)');

// ============================================================
// GLOBAL VARIABLES
// ============================================================

window.transcriptData = {
    students: [],
    selectedStudents: [],
    currentStudent: null,
    marks: [],
    filteredStudents: [],
    programs: []
};

// ============================================================
// UNIT CODE CACHE - MATCHES MARKS ENTRY SYSTEM
// ============================================================

let unitCodeCache = {};

async function fetchUnitCodes() {
    try {
        const { data, error } = await window.sb
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
    
    const words = subjectName.split(' ');
    const skipWords = ['and', 'of', 'for', 'the', 'to', 'with', 'on', 'at', 'in', 'from', '&'];
    let code = words
        .filter(w => !skipWords.includes(w.toLowerCase()))
        .map(w => w[0].toUpperCase())
        .join('');
    
    if (code.length > 6) code = code.substring(0, 6);
    if (code.length < 3) code = subjectName.substring(0, 6).toUpperCase();
    
    return code || 'N/A';
}

// ============================================================
// EXACT GRADE MAPPING - MATCHES YOUR GRADING STRUCTURE
// ============================================================

const GRADE_CONFIG = {
    // TVET Competency-Based Grading
    tvet: {
        grades: {
            'A': { min: 80, max: 100, points: 4.0, label: 'MASTERY', color: '#065f46', bgColor: '#d1fae5' },
            'B': { min: 65, max: 79, points: 3.0, label: 'PROFICIENT', color: '#1e40af', bgColor: '#dbeafe' },
            'C': { min: 50, max: 64, points: 2.0, label: 'COMPETENT', color: '#92400e', bgColor: '#fef3c7' },
            'E': { min: 0, max: 49, points: 0.0, label: 'NOT YET COMPETENT', color: '#991b1b', bgColor: '#fee2e2' }
        },
        passMark: 50,
        label: 'TVET Competency-Based',
        display: 'A(80-100%)=4, B(65-79%)=3, C(50-64%)=2, E(0-49%)=0'
    },
    // Nursing Academic Grading
    nursing: {
        grades: {
            'A': { min: 75, max: 100, points: 4.0, label: 'DISTINCTION', color: '#065f46', bgColor: '#d1fae5' },
            'B': { min: 65, max: 74, points: 3.0, label: 'CREDIT', color: '#1e40af', bgColor: '#dbeafe' },
            'C': { min: 60, max: 64, points: 2.0, label: 'PASS', color: '#92400e', bgColor: '#fef3c7' },
            'D': { min: 0, max: 59, points: 0.0, label: 'FAIL', color: '#991b1b', bgColor: '#fee2e2' }
        },
        passMark: 60,
        label: 'Nursing Academic',
        display: 'A(75-100%)=4.0, B(65-74%)=3.0, C(60-64%)=2.0, D(0-59%)=0.0'
    },
    creditHours: 3
};

// TVET Program Types
const TVET_PROGRAMS = {
    certificate: ['CPOTT', 'CCH', 'CHRIT', 'CPC', 'CSL', 'CSW', 'CCJS', 'CAG', 'CHSS', 'CICT', 'CCA'],
    diploma: ['DPOTT', 'DCH', 'DHRIT', 'DSL', 'DSW', 'DCJS', 'DHSS', 'DICT', 'DME'],
    artisan: ['ACH', 'AAG', 'ASW']
};

// KRCHN Blocks
const KRCHN_BLOCKS = ['Introductory', 'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Block 6', 'Final'];

// TVET Terms
const TVET_TERMS_CERTIFICATE = ['Year 1 Term 1', 'Year 1 Term 2', 'Year 1 Term 3'];
const TVET_TERMS_DIPLOMA = ['Year 1 Term 1', 'Year 1 Term 2', 'Year 1 Term 3', 'Year 2 Term 1', 'Year 2 Term 2', 'Year 2 Term 3'];
const TVET_TERMS_ARTISAN = ['Year 1 Term 1', 'Year 1 Term 2', 'Year 1 Term 3'];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getProgramType(programCode) {
    if (!programCode) return 'nursing';
    const code = String(programCode).toUpperCase().trim();
    if (code === 'KRCHN') return 'nursing';
    if (TVET_PROGRAMS.diploma.includes(code)) return 'tvet_diploma';
    if (TVET_PROGRAMS.certificate.includes(code)) return 'tvet_certificate';
    if (TVET_PROGRAMS.artisan.includes(code)) return 'tvet_artisan';
    return 'nursing';
}

function isTVETProgram(programCode) {
    const type = getProgramType(programCode);
    return type === 'tvet_diploma' || type === 'tvet_certificate' || type === 'tvet_artisan';
}

function getTVETTermStructure(programCode) {
    const type = getProgramType(programCode);
    if (type === 'tvet_certificate') return TVET_TERMS_CERTIFICATE;
    if (type === 'tvet_diploma') return TVET_TERMS_DIPLOMA;
    if (type === 'tvet_artisan') return TVET_TERMS_ARTISAN;
    return TVET_TERMS_CERTIFICATE;
}

function getBlockOptions(programCode) {
    if (programCode === 'KRCHN') return KRCHN_BLOCKS;
    if (isTVETProgram(programCode)) return getTVETTermStructure(programCode);
    return KRCHN_BLOCKS;
}

function getGradingConfig(programCode) {
    if (isTVETProgram(programCode)) return GRADE_CONFIG.tvet;
    return GRADE_CONFIG.nursing;
}

function calculateOfficialGrade(score, programCode) {
    const config = getGradingConfig(programCode);
    const grades = config.grades;
    
    if (score === null || score === undefined || score === 0) {
        const defaultGrade = programCode === 'KRCHN' ? 'D' : 'E';
        return {
            grade: defaultGrade,
            points: 0.0,
            label: config === GRADE_CONFIG.tvet ? 'NOT YET COMPETENT' : 'FAIL',
            color: '#991b1b',
            bgColor: '#fee2e2'
        };
    }
    
    for (const [grade, gConfig] of Object.entries(grades)) {
        if (score >= gConfig.min && score <= gConfig.max) {
            return {
                grade: grade,
                points: gConfig.points,
                label: gConfig.label,
                color: gConfig.color,
                bgColor: gConfig.bgColor
            };
        }
    }
    
    const defaultGrade = programCode === 'KRCHN' ? 'D' : 'E';
    return {
        grade: defaultGrade,
        points: 0.0,
        label: config === GRADE_CONFIG.tvet ? 'NOT YET COMPETENT' : 'FAIL',
        color: '#991b1b',
        bgColor: '#fee2e2'
    };
}

function getStatusLabel(score, programCode) {
    const config = getGradingConfig(programCode);
    const passMark = config.passMark;
    
    if (score === null || score === undefined || score === 0) return 'PENDING';
    if (score >= passMark) return config === GRADE_CONFIG.tvet ? 'COMPETENT' : 'PASS';
    return config === GRADE_CONFIG.tvet ? 'NOT YET COMPETENT' : 'FAIL';
}

function calculateGPA(marks, programCode) {
    if (!marks || marks.length === 0) return 0;
    let totalPoints = 0;
    let totalCredits = 0;
    
    marks.forEach(m => {
        const score = m.final_score || 0;
        if (score > 0) {
            const gradeInfo = calculateOfficialGrade(score, programCode);
            totalPoints += gradeInfo.points * GRADE_CONFIG.creditHours;
            totalCredits += GRADE_CONFIG.creditHours;
        }
    });
    
    return totalCredits > 0 ? Math.round((totalPoints / totalCredits) * 100) / 100 : 0;
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ============================================================
// LOAD TRANSCRIPT STUDENTS
// ============================================================

window.loadTranscriptStudents = async function() {
    console.log('📄 Loading transcript students...');
    
    await fetchUnitCodes();
    
    const program = document.getElementById('transcript_program_select')?.value || 'all';
    const year = document.getElementById('transcript_year_select')?.value || '2025';
    const block = document.getElementById('transcript_block_select')?.value || 'all';
    
    const placeholder = document.getElementById('transcriptPlaceholder');
    const dynamicContent = document.getElementById('transcriptDynamicContent');
    const studentList = document.getElementById('transcriptStudentList');
    const previewContainer = document.getElementById('transcriptPreviewContainer');
    
    if (studentList) {
        studentList.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                <div class="loading-spinner" style="display: inline-block; width: 30px; height: 30px; border: 3px solid #e5e7eb; border-top-color: #0A3D62; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <p style="color: #94a3b8; margin-top: 10px;">Loading students...</p>
            </div>
        `;
    }
    
    try {
        let query = window.sb
            .from('consolidated_user_profiles_table')
            .select('*')
            .eq('role', 'student')
            .eq('status', 'approved');
        
        if (program !== 'all') {
            if (program === 'TVET') {
                query = query.neq('program', 'KRCHN');
            } else {
                query = query.eq('program', program);
            }
        }
        
        if (block !== 'all') {
            query = query.eq('block', block);
        }
        
        if (year) {
            query = query.eq('intake_year', year);
        }
        
        const { data: students, error: studentError } = await query;
        
        if (studentError) throw studentError;
        
        window.transcriptData.students = students || [];
        window.transcriptData.selectedStudents = [];
        window.transcriptData.filteredStudents = students || [];
        
        if (students && students.length > 0) {
            const studentIds = students.map(s => s.student_id);
            const { data: marks, error: marksError } = await window.sb
                .from('student_marks')
                .select('*')
                .in('admission_number', studentIds)
                .eq('academic_year', year);
            
            if (marksError) throw marksError;
            
            window.transcriptData.marks = marks || [];
            
            window.updateTranscriptStats(students, marks);
            window.renderTranscriptStudentList(students, marks);
            
            const countEl = document.getElementById('transcript_student_count');
            if (countEl) countEl.textContent = students.length;
            
            if (placeholder) placeholder.style.display = 'none';
            if (dynamicContent) dynamicContent.style.display = 'block';
            if (previewContainer) previewContainer.style.display = 'none';
            
        } else {
            if (studentList) {
                studentList.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #94a3b8;">
                        <i class="fas fa-users" style="font-size: 48px; display: block; margin-bottom: 10px;"></i>
                        <h3 style="color: #1e293b;">No students found</h3>
                        <p>Try adjusting your filters</p>
                    </div>
                `;
            }
            if (countEl) countEl.textContent = '0';
            if (dynamicContent) dynamicContent.style.display = 'block';
            if (placeholder) placeholder.style.display = 'none';
        }
        
        window.populateTranscriptStudentDropdown(students);
        
        console.log(`✅ Loaded ${students?.length || 0} students`);
        
    } catch (error) {
        console.error('❌ Error loading students:', error);
        if (studentList) {
            studentList.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 30px; color: #dc2626;">
                    <i class="fas fa-exclamation-circle" style="font-size: 32px; display: block; margin-bottom: 10px;"></i>
                    Error: ${escapeHtml(error.message)}
                </div>
            `;
        }
        if (typeof window.showNotification === 'function') {
            window.showNotification('Error loading students: ' + error.message, 'error');
        }
    }
};

// ============================================================
// UPDATE TRANSCRIPT STATS
// ============================================================

window.updateTranscriptStats = function(students, marks) {
    const totalStudents = students?.length || 0;
    
    let passing = 0;
    let failing = 0;
    let pending = 0;
    let totalScore = 0;
    let scoredCount = 0;
    let totalCreditHours = 0;
    let totalGradePoints = 0;
    
    const studentMarks = {};
    marks?.forEach(m => {
        const admission = m.admission_number;
        if (!studentMarks[admission]) studentMarks[admission] = [];
        studentMarks[admission].push(m);
    });
    
    for (const [admission, markList] of Object.entries(studentMarks)) {
        let studentTotal = 0;
        let studentCount = 0;
        let studentPoints = 0;
        const program = markList[0]?.program || 'KRCHN';
        const config = getGradingConfig(program);
        const passMark = config.passMark;
        
        markList.forEach(m => {
            const score = m.final_score || 0;
            const gradeInfo = calculateOfficialGrade(score, program);
            
            if (score > 0) {
                studentTotal += score;
                studentCount++;
                studentPoints += gradeInfo.points * GRADE_CONFIG.creditHours;
                totalScore += score;
                scoredCount++;
            }
        });
        
        const avg = studentCount > 0 ? studentTotal / studentCount : 0;
        
        if (avg >= passMark) passing++;
        else if (avg > 0) failing++;
        else pending++;
        
        totalCreditHours += studentCount * GRADE_CONFIG.creditHours;
        totalGradePoints += studentPoints;
    }
    
    const avg = scoredCount > 0 ? Math.round((totalScore / scoredCount) * 10) / 10 : 0;
    const overallGPA = totalCreditHours > 0 ? Math.round((totalGradePoints / totalCreditHours) * 100) / 100 : 0;
    
    const elements = {
        'transcript_total_students': totalStudents,
        'transcript_passing': passing,
        'transcript_failing': failing,
        'transcript_pending': pending,
        'transcript_avg': avg + '%',
        'transcript_overall_gpa': overallGPA.toFixed(2)
    };
    
    for (const [id, value] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }
};

// ============================================================
// RENDER TRANSCRIPT STUDENT LIST
// ============================================================

window.renderTranscriptStudentList = function(students, marks) {
    const container = document.getElementById('transcriptStudentList');
    if (!container) return;
    
    if (!students || students.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #94a3b8;">
                <i class="fas fa-users" style="font-size: 32px; display: block; margin-bottom: 10px;"></i>
                No students found
            </div>
        `;
        return;
    }
    
    const studentAverages = {};
    marks?.forEach(m => {
        const admission = m.admission_number;
        const score = m.final_score || 0;
        const program = m.program || 'KRCHN';
        if (!studentAverages[admission]) {
            studentAverages[admission] = { total: 0, count: 0, scores: [], points: 0, program: program };
        }
        const gradeInfo = calculateOfficialGrade(score, program);
        if (score > 0) {
            studentAverages[admission].total += score;
            studentAverages[admission].count++;
            studentAverages[admission].scores.push(score);
            studentAverages[admission].points += gradeInfo.points * GRADE_CONFIG.creditHours;
        }
    });
    
    let html = '';
    students.forEach((student, index) => {
        const avgData = studentAverages[student.student_id] || { total: 0, count: 0, scores: [], points: 0, program: 'KRCHN' };
        const avg = avgData.count > 0 ? Math.round((avgData.total / avgData.count) * 10) / 10 : 0;
        const gpa = avgData.count > 0 ? Math.round((avgData.points / (avgData.count * GRADE_CONFIG.creditHours)) * 100) / 100 : 0;
        const program = avgData.program || student.program || 'KRCHN';
        const isTVET = isTVETProgram(program);
        const config = getGradingConfig(program);
        const passMark = config.passMark;
        const gradeInfo = calculateOfficialGrade(avg, program);
        const isPassing = avg >= passMark;
        const statusColor = isPassing ? '#059669' : (avg > 0 ? '#dc2626' : '#f59e0b');
        const statusText = isPassing ? '✅ Pass' : (avg > 0 ? '❌ Fail' : '⏳ Pending');
        const blockLabel = isTVET ? 'Term' : 'Block';
        
        const isSelected = window.transcriptData.selectedStudents.includes(student.student_id);
        const programIcon = isTVET ? '🔧' : '🎓';
        const programLabel = isTVET ? 'TVET' : 'Nursing';
        
        html += `
            <div style="
                background: ${isSelected ? '#e0e7ff' : '#ffffff'};
                border: 2px solid ${isSelected ? '#0A3D62' : '#e5e7eb'};
                border-radius: 8px;
                padding: 12px 16px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                cursor: pointer;
                transition: all 0.2s ease;
                ${isSelected ? 'box-shadow: 0 0 0 3px rgba(10,61,98,0.2);' : ''}
            "
            onclick="window.toggleTranscriptStudent('${student.student_id}')"
            onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)';"
            onmouseout="this.style.transform='none'; this.style.boxShadow='${isSelected ? '0 0 0 3px rgba(10,61,98,0.2)' : 'none'}';">
                <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0;">
                    <input type="checkbox" 
                           ${isSelected ? 'checked' : ''} 
                           onclick="event.stopPropagation(); window.toggleTranscriptStudent('${student.student_id}')"
                           style="width: 16px; height: 16px; cursor: pointer; accent-color: #0A3D62; flex-shrink: 0;">
                    <div style="min-width: 0;">
                        <div style="font-weight: 600; color: #0A3D62; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(student.full_name || 'Unknown')}</div>
                        <div style="font-size: 11px; color: #64748b; display: flex; flex-wrap: wrap; gap: 4px;">
                            <span style="background: #f1f5f9; padding: 1px 8px; border-radius: 10px;">${escapeHtml(student.student_id || 'N/A')}</span>
                            <span>${programIcon} ${escapeHtml(student.program || 'N/A')}</span>
                            <span>· ${blockLabel}: ${escapeHtml(student.block || 'N/A')}</span>
                            <span style="background: ${isTVET ? '#fef3c7' : '#dbeafe'}; padding: 1px 8px; border-radius: 10px; font-size: 9px; font-weight: 600;">${programLabel}</span>
                        </div>
                    </div>
                </div>
                <div style="text-align: right; flex-shrink: 0; margin-left: 8px;">
                    <div style="font-weight: 700; font-size: 15px; color: ${statusColor};">${avg || '-'}%</div>
                    <div style="font-size: 11px; color: ${statusColor};">${statusText}</div>
                    <div style="font-size: 10px; color: #94a3b8;">GPA: ${gpa.toFixed(2)} · ${avgData.count} units</div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    window.updateTranscriptSelectedCount();
};

// ============================================================
// FILTER TRANSCRIPT STUDENTS
// ============================================================

window.filterTranscriptStudents = function() {
    const searchTerm = document.getElementById('transcript_search_input')?.value?.toLowerCase() || '';
    const students = window.transcriptData.students || [];
    
    if (!searchTerm) {
        window.transcriptData.filteredStudents = students;
        window.renderTranscriptStudentList(students, window.transcriptData.marks);
        return;
    }
    
    const filtered = students.filter(s => 
        (s.full_name || '').toLowerCase().includes(searchTerm) ||
        (s.student_id || '').toLowerCase().includes(searchTerm) ||
        (s.program || '').toLowerCase().includes(searchTerm)
    );
    
    window.transcriptData.filteredStudents = filtered;
    window.renderTranscriptStudentList(filtered, window.transcriptData.marks);
    
    const countEl = document.getElementById('transcript_student_count');
    if (countEl) countEl.textContent = filtered.length;
};

// ============================================================
// TOGGLE TRANSCRIPT STUDENT SELECTION
// ============================================================

window.toggleTranscriptStudent = function(studentId) {
    const index = window.transcriptData.selectedStudents.indexOf(studentId);
    if (index > -1) {
        window.transcriptData.selectedStudents.splice(index, 1);
    } else {
        window.transcriptData.selectedStudents.push(studentId);
    }
    
    const students = window.transcriptData.filteredStudents || window.transcriptData.students;
    window.renderTranscriptStudentList(students, window.transcriptData.marks);
};

// ============================================================
// SELECT ALL TRANSCRIPT STUDENTS
// ============================================================

window.selectAllTranscriptStudents = function() {
    const students = window.transcriptData.filteredStudents || window.transcriptData.students;
    window.transcriptData.selectedStudents = students.map(s => s.student_id);
    window.renderTranscriptStudentList(students, window.transcriptData.marks);
    if (typeof window.showNotification === 'function') {
        window.showNotification(`✅ ${window.transcriptData.selectedStudents.length} students selected`, 'success');
    }
};

// ============================================================
// DESELECT ALL TRANSCRIPT STUDENTS
// ============================================================

window.deselectAllTranscriptStudents = function() {
    window.transcriptData.selectedStudents = [];
    const students = window.transcriptData.filteredStudents || window.transcriptData.students;
    window.renderTranscriptStudentList(students, window.transcriptData.marks);
    if (typeof window.showNotification === 'function') {
        window.showNotification('✅ All students deselected', 'info');
    }
};

// ============================================================
// UPDATE TRANSCRIPT SELECTED COUNT
// ============================================================

window.updateTranscriptSelectedCount = function() {
    const count = window.transcriptData.selectedStudents.length;
    const countEls = document.querySelectorAll('#transcriptSelectedCount');
    countEls.forEach(el => el.textContent = count);
};

// ============================================================
// POPULATE TRANSCRIPT STUDENT DROPDOWN
// ============================================================

window.populateTranscriptStudentDropdown = function(students) {
    const select = document.getElementById('transcript_student_select');
    if (!select) return;
    
    const currentValue = select.value;
    select.innerHTML = '<option value="">-- Select Student --</option>';
    
    students?.forEach(s => {
        const option = document.createElement('option');
        option.value = s.student_id;
        option.textContent = `${s.full_name || 'Unknown'} (${s.student_id || 'N/A'})`;
        select.appendChild(option);
    });
    
    if (currentValue) {
        select.value = currentValue;
    }
};

// ============================================================
// GENERATE SELECTED TRANSCRIPT
// ============================================================

window.generateSelectedTranscript = async function() {
    const studentId = document.getElementById('transcript_student_select')?.value;
    const year = document.getElementById('transcript_year_select')?.value || '2025';
    
    if (!studentId) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('Please select a student first', 'warning');
        }
        return;
    }
    
    const student = window.transcriptData.students.find(s => s.student_id === studentId);
    if (!student) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('Student not found', 'error');
        }
        return;
    }
    
    const studentMarks = window.transcriptData.marks.filter(m => m.admission_number === studentId);
    
    if (studentMarks.length === 0) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('No marks found for this student', 'warning');
        }
        return;
    }
    
    window.showTranscriptPreview(student, studentMarks, year);
};

// ============================================================
// GENERATE SELECTED TRANSCRIPTS (Bulk)
// ============================================================

window.generateSelectedTranscripts = async function() {
    const selectedIds = window.transcriptData.selectedStudents;
    
    if (selectedIds.length === 0) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('Please select at least one student', 'warning');
        }
        return;
    }
    
    if (selectedIds.length > 10) {
        if (!confirm(`Generate transcripts for ${selectedIds.length} students? This may take a moment.`)) {
            return;
        }
    }
    
    const year = document.getElementById('transcript_year_select')?.value || '2025';
    
    if (typeof window.showLoading === 'function') {
        window.showLoading(`Generating ${selectedIds.length} transcripts...`);
    }
    
    try {
        let successCount = 0;
        let failCount = 0;
        
        for (const studentId of selectedIds) {
            const student = window.transcriptData.students.find(s => s.student_id === studentId);
            if (!student) {
                failCount++;
                continue;
            }
            
            const studentMarks = window.transcriptData.marks.filter(m => m.admission_number === studentId);
            
            if (studentMarks.length === 0) {
                failCount++;
                continue;
            }
            
            window.showTranscriptPreview(student, studentMarks, year);
            successCount++;
            
            await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        if (typeof window.hideLoading === 'function') {
            window.hideLoading();
        }
        
        if (typeof window.showNotification === 'function') {
            window.showNotification(`✅ ${successCount} transcripts generated, ${failCount} failed`, successCount > 0 ? 'success' : 'error');
        }
        
    } catch (error) {
        if (typeof window.hideLoading === 'function') {
            window.hideLoading();
        }
        console.error('❌ Error generating transcripts:', error);
        if (typeof window.showNotification === 'function') {
            window.showNotification('Error: ' + error.message, 'error');
        }
    }
};

// ============================================================
// SHOW TRANSCRIPT PREVIEW - FINAL OFFICIAL VERSION
// WITH FIXED GRADING SCALE AND FULL TABLE BORDERS
// ============================================================

// ============================================================
// SHOW TRANSCRIPT PREVIEW - STATUS BLOCK REMOVED
// ============================================================

window.showTranscriptPreview = function(student, marks, year) {
    const container = document.getElementById('transcriptPreviewContainer');
    const content = document.getElementById('transcriptPreviewContent');
    
    if (!container || !content) return;
    
    const program = student.program || 'KRCHN';
    const isTVET = isTVETProgram(program);
    const config = getGradingConfig(program);
    const passMark = config.passMark;
    const gradingDisplay = config.display;
    const programType = isTVET ? 'TVET' : 'Nursing';
    
    // Group marks by block/term
    const groupedMarks = {};
    marks.forEach(m => {
        const block = m.block || 'General';
        if (!groupedMarks[block]) groupedMarks[block] = [];
        groupedMarks[block].push(m);
    });
    const blockNames = Object.keys(groupedMarks).sort();
    
    // Build marks table
    let marksHtml = '';
    let totalScore = 0;
    let scoredCount = 0;
    let totalPoints = 0;
    let totalCredits = 0;
    let totalUnits = marks.length;
    let passedUnits = 0;
    let retakeUnits = 0;
    
    blockNames.forEach((block) => {
        const blockMarks = groupedMarks[block];
        const blockTotal = blockMarks.length;
        let blockPassed = 0;
        let blockPoints = 0;
        let blockCredits = 0;
        
        marksHtml += `
            <tr style="background: #f0f4f8; border-bottom: 2px solid #0A3D62;">
                <td colspan="5" style="padding: 8px 12px; font-weight: 700; color: #0A3D62; font-size: 12px; letter-spacing: 0.5px; border: 1px solid #0A3D62;">
                    ${escapeHtml(block)}
                </td>
            </tr>
        `;
        
        blockMarks.forEach((m, index) => {
            const score = m.final_score || 0;
            const gradeInfo = calculateOfficialGrade(score, program);
            const isPassing = score >= passMark;
            
            const unitCode = getUnitCode(m.subject_name);
            const credits = GRADE_CONFIG.creditHours;
            const pointsEarned = gradeInfo.points * credits;
            
            const hasRetake = m.retake_count > 0 || false;
            if (hasRetake) retakeUnits++;
            if (isPassing) {
                blockPassed++;
                passedUnits++;
            }
            
            if (score > 0) {
                totalScore += score;
                scoredCount++;
                totalPoints += pointsEarned;
                totalCredits += credits;
                blockPoints += pointsEarned;
                blockCredits += credits;
            }
            
            const starIndicator = hasRetake ? `<span style="color: #94a3b8; font-size: 9px; margin-left: 4px; opacity: 0.5;" title="Retaken">☆</span>` : '';
            
            marksHtml += `
                <tr style="border-bottom: 1px solid #d1d5db;">
                    <td style="padding: 6px 12px; font-size: 11px; font-weight: 500; color: #1e293b; border: 1px solid #d1d5db;">
                        ${escapeHtml(unitCode)}
                    </td>
                    <td style="padding: 6px 12px; font-size: 11px; color: #1e293b; border: 1px solid #d1d5db;">
                        ${escapeHtml(m.subject_name || 'N/A')}
                        ${starIndicator}
                    </td>
                    <td style="padding: 6px 12px; text-align: center; font-size: 11px; color: #1e293b; border: 1px solid #d1d5db;">
                        ${credits}
                    </td>
                    <td style="padding: 6px 12px; text-align: center; font-size: 13px; font-weight: 700; color: ${gradeInfo.color}; border: 1px solid #d1d5db;">
                        ${gradeInfo.grade}
                    </td>
                    <td style="padding: 6px 12px; text-align: center; font-size: 11px; font-weight: 600; color: ${gradeInfo.color}; border: 1px solid #d1d5db;">
                        ${pointsEarned.toFixed(1)}
                    </td>
                </tr>
            `;
        });
        
        const blockPassRate = blockTotal > 0 ? Math.round((blockPassed / blockTotal) * 100) : 0;
        const blockGPA = blockCredits > 0 ? Math.round((blockPoints / blockCredits) * 100) / 100 : 0;
        marksHtml += `
            <tr style="background: #f8fafc; border-bottom: 2px solid #0A3D62;">
                <td colspan="5" style="padding: 4px 12px; font-size: 9px; color: #64748b; text-align: right; border: 1px solid #d1d5db;">
                    <strong>Block Summary:</strong> ${blockPassed}/${blockTotal} passed (${blockPassRate}%) · GPA: ${blockGPA.toFixed(2)}
                </td>
            </tr>
        `;
    });
    
    // Calculate overall stats
    const overallAvg = scoredCount > 0 ? Math.round((totalScore / scoredCount) * 10) / 10 : 0;
    const overallGradeInfo = calculateOfficialGrade(overallAvg, program);
    const gpa = totalCredits > 0 ? Math.round((totalPoints / totalCredits) * 100) / 100 : 0;
    const blockLabel = isTVET ? 'Term' : 'Block';
    
    const now = new Date().toLocaleDateString('en-KE', {
        timeZone: 'Africa/Nairobi',
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
    
    // Build grading scale table
    let gradingScaleHtml = '';
    const grades = config.grades;
    for (const [grade, gConfig] of Object.entries(grades)) {
        const range = `${gConfig.min}-${gConfig.max === 100 ? '100' : gConfig.max}`;
        gradingScaleHtml += `
            <tr>
                <td style="padding: 2px 8px; text-align: center; font-weight: 700; color: ${gConfig.color}; border: 1px solid #d1d5db;">${grade}</td>
                <td style="padding: 2px 8px; text-align: center; border: 1px solid #d1d5db;">${range}%</td>
                <td style="padding: 2px 8px; text-align: center; border: 1px solid #d1d5db;">${gConfig.points.toFixed(1)}</td>
                <td style="padding: 2px 8px; text-align: center; border: 1px solid #d1d5db;">${gConfig.label}</td>
            </tr>
        `;
    }
    
    // Build full official transcript HTML - STATUS BLOCK REMOVED
    const html = `
        <div id="transcriptDocument" style="background: white; padding: 30px 35px; border: 2px solid #0A3D62; border-radius: 8px; box-shadow: 0 4px 20px rgba(10,61,98,0.12); font-family: 'Times New Roman', Times, serif; max-width: 850px; margin: 0 auto;">
            
            <!-- HEADER WITH LOGO -->
            <div style="text-align: center; border-bottom: 3px double #0A3D62; padding-bottom: 14px; margin-bottom: 18px;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 2px;">
                    <img src="https://raw.githubusercontent.com/NCHSMlearning/e-learning/main/images/Logo_NCHSM.png" 
                         alt="NCHSM Logo" 
                         style="max-height: 55px; width: auto;"
                         onerror="this.style.display='none'">
                    <div>
                        <div style="font-size: 18px; font-weight: 700; color: #0A3D62; letter-spacing: 1px;">NAKURU COLLEGE OF HEALTH SCIENCES</div>
                        <div style="font-size: 11px; color: #64748b; font-style: italic; margin-top: -2px;">AND MANAGEMENT (NCHSM)</div>
                    </div>
                </div>
                <div style="font-size: 11px; color: #64748b;">P.O. Box 12906 - 20100, Nakuru · Tel: 0790969743 · E-Mail: admin@nchsm.co.ke · Website: www.nchsm.co.ke</div>
                <div style="font-size: 16px; font-weight: 700; color: #0A3D62; letter-spacing: 2px; margin-top: 6px;">OFFICIAL ACADEMIC TRANSCRIPT</div>
            </div>
            
            <!-- STUDENT INFO -->
            <div style="margin-bottom: 16px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2px 30px; padding: 8px 14px; background: #fafbfc; border-radius: 4px; border: 1px solid #e5e7eb;">
                    <div><span style="font-weight: 600; font-size: 11px; color: #475569;">NAME</span><br><span style="font-weight: 700; font-size: 14px; color: #0A3D62;">${escapeHtml(student.full_name || 'Unknown')}</span></div>
                    <div><span style="font-weight: 600; font-size: 11px; color: #475569;">ADMISSION NUMBER</span><br><span style="font-weight: 700; font-size: 14px; color: #0A3D62;">${escapeHtml(student.student_id || 'N/A')}</span></div>
                    <div><span style="font-weight: 600; font-size: 11px; color: #475569;">PROGRAMME</span><br><span style="font-weight: 700; font-size: 14px; color: #0A3D62;">${escapeHtml(student.program || 'N/A')}</span></div>
                    <div><span style="font-weight: 600; font-size: 11px; color: #475569;">YEAR OF STUDY</span><br><span style="font-weight: 700; font-size: 14px; color: #0A3D62;">${escapeHtml(student.year_of_study || student.block || 'N/A')}</span></div>
                </div>
            </div>
            
            <!-- MARKS TABLE - ALL BORDERS -->
            <div style="overflow-x: auto; margin-bottom: 16px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 12px; border: 1px solid #0A3D62;">
                    <thead>
                        <tr style="background: #0A3D62; color: white;">
                            <th style="padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 600; letter-spacing: 0.5px; border: 1px solid #0A3D62;">CODE</th>
                            <th style="padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 600; letter-spacing: 0.5px; border: 1px solid #0A3D62;">COURSE TITLE</th>
                            <th style="padding: 8px 12px; text-align: center; font-size: 11px; font-weight: 600; letter-spacing: 0.5px; border: 1px solid #0A3D62; width: 60px;">CREDIT</th>
                            <th style="padding: 8px 12px; text-align: center; font-size: 11px; font-weight: 600; letter-spacing: 0.5px; border: 1px solid #0A3D62; width: 60px;">GRADE</th>
                            <th style="padding: 8px 12px; text-align: center; font-size: 11px; font-weight: 600; letter-spacing: 0.5px; border: 1px solid #0A3D62; width: 60px;">POINTS</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${marksHtml}
                    </tbody>
                </table>
            </div>
            
            <!-- GPA SUMMARY -->
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; margin-bottom: 14px; padding: 10px 14px; background: #fafbfc; border-radius: 4px; border: 1px solid #e5e7eb;">
                <div style="text-align: center;">
                    <div style="font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">GPA FOR THE YEAR</div>
                    <div style="font-size: 20px; font-weight: 700; color: #0A3D62;">${gpa.toFixed(2)}</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">CUMULATIVE GPA</div>
                    <div style="font-size: 20px; font-weight: 700; color: #0A3D62;">${gpa.toFixed(2)}</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">CREDITS COVERED</div>
                    <div style="font-size: 20px; font-weight: 700; color: #0A3D62;">${totalCredits}</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">TOTAL CREDITS</div>
                    <div style="font-size: 20px; font-weight: 700; color: #0A3D62;">${totalCredits}</div>
                </div>
            </div>
            
            <!-- GRADING SCALE -->
            <div style="margin-bottom: 14px; padding: 8px 14px; background: #fafbfc; border-radius: 4px; border: 1px solid #e5e7eb;">
                <div style="font-weight: 600; color: #0A3D62; font-size: 10px; text-align: center; margin-bottom: 4px;">GRADING SCALE (${programType})</div>
                <div style="text-align: center; font-size: 9px; color: #64748b; margin-bottom: 4px;">${gradingDisplay}</div>
                <table style="width: 100%; border-collapse: collapse; font-size: 9px; border: 1px solid #0A3D62;">
                    <thead>
                        <tr style="background: #0A3D62; color: white;">
                            <th style="padding: 2px 8px; text-align: center; font-size: 8px; border: 1px solid #0A3D62;">GRADE</th>
                            <th style="padding: 2px 8px; text-align: center; font-size: 8px; border: 1px solid #0A3D62;">RANGE</th>
                            <th style="padding: 2px 8px; text-align: center; font-size: 8px; border: 1px solid #0A3D62;">POINTS</th>
                            <th style="padding: 2px 8px; text-align: center; font-size: 8px; border: 1px solid #0A3D62;">REMARKS</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${gradingScaleHtml}
                        <tr>
                            <td colspan="4" style="padding: 3px 8px; text-align: center; font-weight: 600; color: #0A3D62; font-size: 8px; border-top: 2px solid #0A3D62;">
                                Min Pass: ${passMark}% · Credit Hours: ${GRADE_CONFIG.creditHours} per unit
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <!-- SIGNATURES -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; padding-top: 10px; border-top: 1px solid #e5e7eb;">
                <div style="text-align: center;">
                    <div style="font-weight: 600; font-size: 12px; color: #0A3D62;">${escapeHtml(student.full_name || 'Student')}</div>
                    <div style="border-bottom: 2px solid #1e293b; width: 140px; margin: 6px auto 2px auto;"></div>
                    <div style="font-size: 8px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Student Signature</div>
                    <div style="font-size: 8px; color: #94a3b8;">Date: ${now}</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-weight: 600; font-size: 12px; color: #94a3b8;">_________________________</div>
                    <div style="border-bottom: 2px solid #1e293b; width: 140px; margin: 6px auto 2px auto;"></div>
                    <div style="font-size: 8px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Registrar (Academic Affairs)</div>
                    <div style="font-size: 8px; color: #94a3b8;">Date: _____________</div>
                </div>
            </div>
            
            <!-- FOOTER -->
            <div style="text-align: center; margin-top: 12px; padding-top: 8px; border-top: 1px solid #e5e7eb; font-size: 8px; color: #94a3b8;">
                <p style="font-style: italic;">This Transcript is issued without any alteration whatsoever, and is only valid with the College Seal.</p>
                <p>Any queries relating to this document should be addressed to the Registrar (Academic Affairs).</p>
                <p style="font-size: 7px; color: #cbd5e1; margin-top: 4px;">Document ID: ${Date.now().toString(36).toUpperCase()} · Generated: ${now}</p>
            </div>
            
            <!-- ACTION BUTTONS -->
            <div style="display: flex; justify-content: center; gap: 10px; margin-top: 14px; padding-top: 10px; border-top: 1px solid #e5e7eb; flex-wrap: wrap;">
                <button onclick="window.printTranscriptDocument()" style="background: #0A3D62; color: white; border: none; padding: 8px 24px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 12px; transition: all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(10,61,98,0.3)'" onmouseout="this.style.transform='none'; this.style.boxShadow='none'">
                    <i class="fas fa-print"></i> Print / PDF
                </button>
                <button onclick="window.closeTranscriptPreview()" style="background: #6b7280; color: white; border: none; padding: 8px 24px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 12px; transition: all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
                    <i class="fas fa-times"></i> Close
                </button>
            </div>
        </div>
    `;
    
    content.innerHTML = html;
    container.style.display = 'block';
    
    window._currentTranscript = {
        student: student,
        marks: marks,
        year: year
    };
};

// ============================================================
// PRINT TRANSCRIPT DOCUMENT
// ============================================================

window.printTranscriptDocument = function() {
    const content = document.getElementById('transcriptPreviewContent');
    if (!content) return;
    
    const transcriptHtml = content.innerHTML;
    
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
        alert('Please allow popups to print the transcript.');
        return;
    }
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Academic Transcript - ${escapeHtml(window._currentTranscript?.student?.full_name || 'Student')}</title>
            <style>
                @page {
                    size: A4 portrait;
                    margin: 10mm 12mm;
                }
                body {
                    font-family: 'Times New Roman', Times, serif;
                    background: white;
                    padding: 0;
                    margin: 0;
                }
                #transcriptContent {
                    max-width: 850px;
                    margin: 0 auto;
                    padding: 20px;
                }
                #transcriptContent table {
                    page-break-inside: avoid;
                }
                #transcriptContent tr {
                    page-break-inside: avoid;
                }
                @media print {
                    body { padding: 0; margin: 0; }
                    #transcriptContent { padding: 10px; }
                    .no-print { display: none !important; }
                    #transcriptContent .action-buttons { display: none !important; }
                }
            </style>
        </head>
        <body>
            <div id="transcriptContent">
                ${transcriptHtml}
            </div>
            <script>
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                    }, 500);
                };
            <\/script>
        </body>
        </html>
    `);
    printWindow.document.close();
};

// ============================================================
// CLOSE TRANSCRIPT PREVIEW
// ============================================================

window.closeTranscriptPreview = function() {
    const container = document.getElementById('transcriptPreviewContainer');
    if (container) {
        container.style.display = 'none';
    }
    window._currentTranscript = null;
};

// ============================================================
// EXPORT ALL TRANSCRIPTS - CSV
// ============================================================

window.exportAllTranscripts = function() {
    const selectedIds = window.transcriptData.selectedStudents;
    
    if (selectedIds.length === 0) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('Please select students first', 'warning');
        }
        return;
    }
    
    const headers = ['Admission', 'Student Name', 'Program', 'Program Type', 'Block/Term', 'Academic Year', 'Units', 'Average', 'Grade', 'Points', 'GPA', 'Status', 'Passed', 'Failed', 'Pending', 'Retakes'];
    const rows = [];
    
    for (const studentId of selectedIds) {
        const student = window.transcriptData.students.find(s => s.student_id === studentId);
        if (!student) continue;
        
        const studentMarks = window.transcriptData.marks.filter(m => m.admission_number === studentId);
        const program = student.program || 'KRCHN';
        const isTVET = isTVETProgram(program);
        
        let totalScore = 0;
        let scoredCount = 0;
        let totalPoints = 0;
        let totalCredits = 0;
        let passed = 0;
        let failed = 0;
        let pending = 0;
        let retakes = 0;
        
        studentMarks.forEach(m => {
            const score = m.final_score || 0;
            const gradeInfo = calculateOfficialGrade(score, program);
            if (score > 0) {
                totalScore += score;
                scoredCount++;
                totalPoints += gradeInfo.points * GRADE_CONFIG.creditHours;
                totalCredits += GRADE_CONFIG.creditHours;
                if (score >= (isTVET ? 50 : 60)) passed++;
                else failed++;
            } else {
                pending++;
            }
            if (m.retake_count > 0) retakes++;
        });
        
        const avg = scoredCount > 0 ? Math.round((totalScore / scoredCount) * 10) / 10 : 0;
        const gpa = totalCredits > 0 ? Math.round((totalPoints / totalCredits) * 100) / 100 : 0;
        const gradeInfo = calculateOfficialGrade(avg, program);
        const config = getGradingConfig(program);
        const status = avg >= config.passMark ? 'PASS' : (avg > 0 ? 'FAIL' : 'PENDING');
        
        rows.push([
            student.student_id || 'N/A',
            student.full_name || 'Unknown',
            student.program || 'N/A',
            isTVET ? 'TVET' : 'Nursing',
            student.block || 'N/A',
            document.getElementById('transcript_year_select')?.value || '2025',
            studentMarks.length,
            avg + '%',
            gradeInfo.grade,
            gradeInfo.points.toFixed(1),
            gpa.toFixed(2),
            status,
            passed,
            failed,
            pending,
            retakes
        ]);
    }
    
    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
    });
    
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcripts_summary_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    if (typeof window.showNotification === 'function') {
        window.showNotification(`✅ Exported ${rows.length} transcripts to CSV`, 'success');
    }
};

// ============================================================
// REFRESH TRANSCRIPT DATA
// ============================================================

window.refreshTranscriptData = function() {
    console.log('🔄 Refreshing transcript data...');
    window.loadTranscriptStudents();
    if (typeof window.showNotification === 'function') {
        window.showNotification('🔄 Transcript data refreshed!', 'success');
    }
};

// ============================================================
// EXPOSE FUNCTIONS TO GLOBAL SCOPE
// ============================================================

window.loadTranscriptStudents = window.loadTranscriptStudents;
window.filterTranscriptStudents = window.filterTranscriptStudents;
window.refreshTranscriptData = window.refreshTranscriptData;
window.exportAllTranscripts = window.exportAllTranscripts;
window.generateSelectedTranscript = window.generateSelectedTranscript;
window.generateSelectedTranscripts = window.generateSelectedTranscripts;
window.selectAllTranscriptStudents = window.selectAllTranscriptStudents;
window.deselectAllTranscriptStudents = window.deselectAllTranscriptStudents;
window.toggleTranscriptStudent = window.toggleTranscriptStudent;
window.showTranscriptPreview = window.showTranscriptPreview;
window.closeTranscriptPreview = window.closeTranscriptPreview;
window.printTranscriptDocument = window.printTranscriptDocument;
window.calculateOfficialGrade = calculateOfficialGrade;
window.getProgramType = getProgramType;
window.isTVETProgram = isTVETProgram;
window.getBlockOptions = getBlockOptions;
window.getGradingConfig = getGradingConfig;
window.calculateGPA = calculateGPA;
window.getStatusLabel = getStatusLabel;
window.getUnitCode = getUnitCode;
window.escapeHtml = escapeHtml;

console.log('✅ Super Admin Transcript Generator Module Loaded Successfully!');
console.log('📄 Official transcript format (CODE, COURSE TITLE, CREDIT, GRADE, POINTS)');
console.log('⭐ Retake indicator: ☆ (subtle star next to unit name)');
console.log('📊 TVET: Certificate (3 Terms), Diploma (6 Terms)');
console.log('📊 KRCHN: Blocks (Introductory, Block 1-6, Final)');
console.log('📋 Unit codes fetched from database (matches Marks Entry)');
console.log('📋 Features:');
console.log('   - School Logo');
console.log('   - GPA for the year / Cumulative GPA');
console.log('   - Credits Covered / Total Credits');
console.log('   - Fixed Grading Scale (TVET/Nursing based on program)');
console.log('   - Student & Registrar signatures');
console.log('   - Print / PDF export');
console.log('   - CSV export for bulk transcripts');
console.log('   - ☆ Subtle retake indicator');
console.log('   - Block/Term headers with summaries');
console.log('   - All borders on tables');
console.log('   - TVET + Nursing support');
