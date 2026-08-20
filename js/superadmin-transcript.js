// ============================================================
// SUPER ADMIN TRANSCRIPT GENERATOR - COMPLETE FINAL VERSION
// WITH BLOCK NAVIGATION, DOWNLOAD, AND OFFICIAL SIGNATURES
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

window._transcriptData = null;

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
// HELPER FUNCTIONS - CORRECTLY DETECT NURSING VS TVET
// ============================================================

function getProgramType(programCode) {
    if (!programCode) return 'nursing';
    const code = String(programCode).toUpperCase().trim();
    
    if (code === 'KRCHN' || code === 'NURSING') {
        return 'nursing';
    }
    
    if (TVET_PROGRAMS.diploma.includes(code)) return 'tvet_diploma';
    if (TVET_PROGRAMS.certificate.includes(code)) return 'tvet_certificate';
    if (TVET_PROGRAMS.artisan.includes(code)) return 'tvet_artisan';
    
    return 'nursing';
}

function isTVETProgram(programCode) {
    if (!programCode) return false;
    const code = String(programCode).toUpperCase().trim();
    
    if (code === 'KRCHN' || code === 'NURSING') {
        return false;
    }
    
    const type = getProgramType(programCode);
    return type === 'tvet_diploma' || type === 'tvet_certificate' || type === 'tvet_artisan';
}

function isNursingProgram(programCode) {
    if (!programCode) return true;
    const code = String(programCode).toUpperCase().trim();
    return code === 'KRCHN' || code === 'NURSING' || !isTVETProgram(programCode);
}

function getTVETTermStructure(programCode) {
    const type = getProgramType(programCode);
    if (type === 'tvet_certificate') return TVET_TERMS_CERTIFICATE;
    if (type === 'tvet_diploma') return TVET_TERMS_DIPLOMA;
    if (type === 'tvet_artisan') return TVET_TERMS_ARTISAN;
    return TVET_TERMS_CERTIFICATE;
}

function getBlockOptions(programCode) {
    if (isNursingProgram(programCode)) return KRCHN_BLOCKS;
    if (isTVETProgram(programCode)) return getTVETTermStructure(programCode);
    return KRCHN_BLOCKS;
}

function getGradingConfig(programCode) {
    if (isNursingProgram(programCode)) {
        return GRADE_CONFIG.nursing;
    }
    if (isTVETProgram(programCode)) {
        return GRADE_CONFIG.tvet;
    }
    return GRADE_CONFIG.nursing;
}

function calculateOfficialGrade(score, programCode) {
    const config = getGradingConfig(programCode);
    const grades = config.grades;
    
    if (score === null || score === undefined || score === 0) {
        const defaultGrade = isNursingProgram(programCode) ? 'D' : 'E';
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
    
    const defaultGrade = isNursingProgram(programCode) ? 'D' : 'E';
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
// SHOW TRANSCRIPT PREVIEW - WITH BLOCK NAVIGATION
// Academic Registrar & Director signatures ONLY
// ============================================================

window.showTranscriptPreview = function(student, marks, year) {
    const container = document.getElementById('transcriptPreviewContainer');
    const content = document.getElementById('transcriptPreviewContent');
    
    if (!container || !content) return;
    
    const program = student.program || 'KRCHN';
    const isTVET = isTVETProgram(program);
    const isNursing = isNursingProgram(program);
    const config = getGradingConfig(program);
    const passMark = config.passMark;
    const gradingDisplay = config.display;
    const programType = isTVET ? 'TVET' : 'NURSING';
    const blockLabel = isTVET ? 'Term' : 'Block';
    
    // Group marks by block/term
    const groupedMarks = {};
    marks.forEach(m => {
        const block = m.block || 'General';
        if (!groupedMarks[block]) groupedMarks[block] = [];
        groupedMarks[block].push(m);
    });
    const blockNames = Object.keys(groupedMarks).sort();
    
    // Store data globally for navigation
    window._transcriptData = {
        student: student,
        marks: marks,
        year: year,
        groupedMarks: groupedMarks,
        blockNames: blockNames,
        currentBlockIndex: 0,
        program: program,
        isTVET: isTVET,
        passMark: passMark,
        gradingDisplay: gradingDisplay,
        programType: programType,
        blockLabel: blockLabel,
        config: config
    };

    // Render the first block
    renderBlock(0);
    container.style.display = 'block';
};

// ============================================================
// RENDER A SPECIFIC BLOCK
// ============================================================

// ============================================================
// RENDER A SPECIFIC BLOCK - WITH PROGRESSION MESSAGE ONLY
// YEAR OF STUDY shows Academic Year (e.g., 2026/2027)
// ============================================================

function renderBlock(index) {
    const content = document.getElementById('transcriptPreviewContent');
    const data = window._transcriptData;
    if (!content || !data) return;

    const { 
        student, marks, year, groupedMarks, blockNames, 
        program, isTVET, passMark, gradingDisplay, programType, blockLabel, config
    } = data;

    // Update current index
    data.currentBlockIndex = index;
    const blockName = blockNames[index] || 'General';
    const blockMarks = groupedMarks[blockName] || [];
    
    // Calculate block stats
    let blockTotal = blockMarks.length;
    let blockPassed = 0;
    let blockPoints = 0;
    let blockCredits = 0;
    let totalScore = 0;
    let scoredCount = 0;
    let totalPoints = 0;
    let totalCredits = 0;
    let totalUnits = marks.length;
    let passedUnits = 0;
    let failedUnits = 0;

    // Build marks table for this block
    let marksHtml = '';
    let retakeCount = 0;

    blockMarks.forEach((m) => {
        const score = m.final_score || 0;
        const gradeInfo = calculateOfficialGrade(score, program);
        const isPassing = score >= passMark;
        const unitCode = getUnitCode(m.subject_name);
        const credits = GRADE_CONFIG.creditHours;
        const pointsEarned = gradeInfo.points * credits;
        const hasRetake = m.retake_count > 0 || false;
        
        if (hasRetake) retakeCount++;
        if (isPassing) {
            blockPassed++;
            passedUnits++;
        } else {
            failedUnits++;
        }
        
        if (score > 0) {
            totalScore += score;
            scoredCount++;
            totalPoints += pointsEarned;
            totalCredits += credits;
            blockPoints += pointsEarned;
            blockCredits += credits;
        }
        
        // Subtle retake indicator (star)
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

    // Block summary (NO retake summary)
    const blockPassRate = blockTotal > 0 ? Math.round((blockPassed / blockTotal) * 100) : 0;
    const blockGPA = blockCredits > 0 ? Math.round((blockPoints / blockCredits) * 100) / 100 : 0;
    const allPassed = blockPassed === blockTotal && blockTotal > 0;
    const hasFailed = failedUnits > 0;
    
    marksHtml += `
        <tr style="background: #f8fafc; border-bottom: 2px solid #0A3D62;">
            <td colspan="5" style="padding: 4px 12px; font-size: 9px; color: #64748b; text-align: right; border: 1px solid #d1d5db;">
                <strong>Block Summary:</strong> ${blockPassed}/${blockTotal} passed (${blockPassRate}%) · GPA: ${blockGPA.toFixed(2)}
            </td>
        </tr>
    `;

    // Calculate overall stats
    const overallAvg = scoredCount > 0 ? Math.round((totalScore / scoredCount) * 10) / 10 : 0;
    const overallGradeInfo = calculateOfficialGrade(overallAvg, program);
    const gpa = totalCredits > 0 ? Math.round((totalPoints / totalCredits) * 100) / 100 : 0;
    
    const now = new Date().toLocaleDateString('en-KE', {
        timeZone: 'Africa/Nairobi',
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });

    // ============================================================
    // 🎯 ACADEMIC YEAR CALCULATION
    // Based on student intake year and current block
    // ============================================================
    
    // Get intake year from student or use the selected year
    const intakeYear = parseInt(student.intake_year) || parseInt(year) || 2025;
    
    // Define block to academic year mapping
    // Block 0 (Introductory) -> intakeYear/intakeYear+1
    // Block 1 -> intakeYear+1/intakeYear+2
    // Block 2 -> intakeYear+2/intakeYear+3
    // etc.
    const blockMapping = {
        'Introductory': 0,
        'Block 1': 1,
        'Block 2': 2,
        'Block 3': 3,
        'Block 4': 4,
        'Block 5': 5,
        'Block 6': 6,
        'Final': 7
    };
    
    // Get block year offset
    let blockOffset = blockMapping[blockName];
    
    // If block not found in mapping, try to extract number from block name
    if (blockOffset === undefined) {
        const match = blockName.match(/\d+/);
        if (match) {
            blockOffset = parseInt(match[0]);
        } else {
            blockOffset = 0;
        }
    }
    
    // Calculate academic year
    const startYear = intakeYear + blockOffset;
    const endYear = startYear + 1;
    const academicYear = `${startYear}/${endYear}`;
    
    // For TVET terms, use a different mapping
    let displayYearOfStudy = academicYear;
    if (isTVET) {
        // TVET: Year 1 Term 1 -> intakeYear/intakeYear+1
        // Year 1 Term 2 -> intakeYear/intakeYear+1
        // Year 2 Term 1 -> intakeYear+1/intakeYear+2
        const termMatch = blockName.match(/Year\s+(\d+)/);
        if (termMatch) {
            const yearNum = parseInt(termMatch[1]);
            const startYearTVET = intakeYear + (yearNum - 1);
            const endYearTVET = startYearTVET + 1;
            displayYearOfStudy = `${startYearTVET}/${endYearTVET}`;
        }
    }

    // ============================================================
    // 🎯 PROGRESSION MESSAGE (NO BUTTONS - JUST A MESSAGE)
    // ============================================================
    const currentBlockIndex = index;
    const nextBlockIndex = currentBlockIndex + 1;
    const hasNextBlock = nextBlockIndex < blockNames.length;
    const nextBlockName = hasNextBlock ? blockNames[nextBlockIndex] : null;
    
    // Determine progression message (MESSAGE ONLY, NO BUTTONS)
    let progressionHtml = '';
    
    if (allPassed && hasNextBlock) {
        // ✅ ALL PASSED - Show "Proceed to Next Block" message
        const programTypeLabel = isTVET ? 'Term' : 'Block';
        progressionHtml = `
            <div style="
                background: linear-gradient(135deg, #d1fae5, #a7f3d0);
                border: 2px solid #059669;
                border-radius: 8px;
                padding: 12px 20px;
                margin: 10px 0 14px 0;
                text-align: center;
            ">
                <div style="font-weight: 700; font-size: 15px; color: #065f46;">
                    🎯 Proceed to ${nextBlockName}
                </div>
                <div style="font-size: 12px; font-weight: 500; color: #047857; margin-top: 2px;">
                    All ${blockTotal} units passed with ${blockPassRate}% success rate
                </div>
                <div style="font-size: 11px; color: #065f46; margin-top: 4px; border-top: 1px dashed #86efac; padding-top: 6px;">
                    ${programTypeLabel} ${currentBlockIndex + 1} ✓ → ${programTypeLabel} ${nextBlockIndex + 1} · Academic Year: ${academicYear}
                </div>
            </div>
        `;
    } else if (allPassed && !hasNextBlock) {
        // 🏆 ALL PASSED - Final block complete
        progressionHtml = `
            <div style="
                background: linear-gradient(135deg, #ede9fe, #c4b5fd);
                border: 2px solid #4C1D95;
                border-radius: 8px;
                padding: 12px 20px;
                margin: 10px 0 14px 0;
                text-align: center;
            ">
                <div style="font-weight: 700; font-size: 15px; color: #4C1D95;">
                    🏆 CONGRATULATIONS! All blocks completed!
                </div>
                <div style="font-size: 12px; font-weight: 500; color: #5b21b6; margin-top: 2px;">
                    All ${blockTotal} units passed with ${blockPassRate}% success rate
                </div>
                <div style="font-size: 11px; color: #5b21b6; margin-top: 4px; border-top: 1px dashed #c4b5fd; padding-top: 6px;">
                    🎓 Program Complete — Ready for Graduation · Academic Year: ${academicYear}
                </div>
            </div>
        `;
    } else if (hasFailed && blockPassed > 0) {
        // ⚠️ SOME FAILED - Need to retake failed units
        const failedList = blockMarks
            .filter(m => (m.final_score || 0) < passMark)
            .map(m => m.subject_name)
            .join(', ');
        progressionHtml = `
            <div style="
                background: linear-gradient(135deg, #fee2e2, #fca5a5);
                border: 2px solid #dc2626;
                border-radius: 8px;
                padding: 12px 20px;
                margin: 10px 0 14px 0;
                text-align: center;
            ">
                <div style="font-weight: 700; font-size: 15px; color: #991b1b;">
                    ⚠️ Retake Required — Cannot Proceed
                </div>
                <div style="font-size: 12px; font-weight: 500; color: #b91c1c; margin-top: 2px;">
                    ${failedUnits} unit(s) failed: ${escapeHtml(failedList)}
                </div>
                <div style="font-size: 11px; color: #991b1b; margin-top: 4px; border-top: 1px dashed #fca5a5; padding-top: 6px;">
                    Please consult Academic Registrar for retake scheduling · Academic Year: ${academicYear}
                </div>
            </div>
        `;
    } else if (blockPassed === 0 && blockTotal > 0) {
        // ❌ ALL FAILED - Serious issue
        progressionHtml = `
            <div style="
                background: linear-gradient(135deg, #fee2e2, #fca5a5);
                border: 2px solid #dc2626;
                border-radius: 8px;
                padding: 12px 20px;
                margin: 10px 0 14px 0;
                text-align: center;
            ">
                <div style="font-weight: 700; font-size: 15px; color: #991b1b;">
                    ❌ Academic Intervention Required
                </div>
                <div style="font-size: 12px; font-weight: 500; color: #b91c1c; margin-top: 2px;">
                    No units passed in this block
                </div>
                <div style="font-size: 11px; color: #991b1b; margin-top: 4px; border-top: 1px dashed #fca5a5; padding-top: 6px;">
                    Please contact Academic Registrar immediately · Academic Year: ${academicYear}
                </div>
            </div>
        `;
    }

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

    // Navigation buttons (keep these as they are - just for navigation)
    const prevBlock = index > 0 ? blockNames[index - 1] : null;
    const nextBlock = index < blockNames.length - 1 ? blockNames[index + 1] : null;
    
    let navHtml = '';
    if (blockNames.length > 1) {
        navHtml = `
            <div style="display: flex; justify-content: center; gap: 15px; margin-top: 14px; padding-top: 10px; border-top: 1px solid #e5e7eb; flex-wrap: wrap;">
                ${prevBlock ? `
                    <button onclick="window.navigateBlock(-1)" style="background: #0A3D62; color: white; border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 12px; transition: all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
                        ⬅️ Previous: ${escapeHtml(prevBlock)}
                    </button>
                ` : ''}
                <span style="color: #64748b; font-size: 12px; padding: 8px 12px; background: #f1f5f9; border-radius: 20px;">
                    ${index + 1} of ${blockNames.length}
                </span>
                ${nextBlock ? `
                    <button onclick="window.navigateBlock(1)" style="background: #0A3D62; color: white; border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 12px; transition: all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
                        Next: ${escapeHtml(nextBlock)} ▶️
                    </button>
                ` : `
                    <button style="background: #4C1D95; color: white; border: none; padding: 8px 20px; border-radius: 6px; cursor: default; font-weight: 600; font-size: 12px;">
                        🏆 Final Block
                    </button>
                `}
            </div>
        `;
    }

    // Build full official transcript HTML for current block
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
                    <div><span style="font-weight: 600; font-size: 11px; color: #475569;">YEAR OF STUDY</span><br><span style="font-weight: 700; font-size: 14px; color: #0A3D62;">${escapeHtml(displayYearOfStudy)}</span></div>
                </div>
            </div>
            
            <!-- BLOCK HEADER -->
            <div style="margin-bottom: 10px; padding: 6px 14px; background: #e0e7ff; border-radius: 4px; border-left: 4px solid #0A3D62;">
                <span style="font-weight: 700; font-size: 14px; color: #0A3D62;">📚 ${escapeHtml(blockName)}</span>
                <span style="font-size: 11px; color: #64748b; margin-left: 12px;">${blockTotal} units</span>
                <span style="float: right; font-size: 11px; font-weight: 600; color: ${allPassed ? '#059669' : (hasFailed ? '#dc2626' : '#f59e0b')};">
                    ${allPassed ? '✅ COMPLETED' : (hasFailed ? '⚠️ RETAKE REQUIRED' : '⏳ PENDING')}
                </span>
            </div>
            
            <!-- 🎯 PROGRESSION MESSAGE (JUST A MESSAGE, NO BUTTONS) -->
            ${progressionHtml}
            
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
            
            <!-- SIGNATURES - Academic Registrar & Director ONLY -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; padding-top: 10px; border-top: 1px solid #e5e7eb;">
                <div style="text-align: center;">
                    <div style="font-weight: 600; font-size: 12px; color: #0A3D62;">_________________________</div>
                    <div style="border-bottom: 2px solid #1e293b; width: 180px; margin: 6px auto 2px auto;"></div>
                    <div style="font-size: 9px; color: #0A3D62; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Academic Registrar</div>
                    <div style="font-size: 8px; color: #94a3b8;">Date: _____________</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-weight: 600; font-size: 12px; color: #0A3D62;">_________________________</div>
                    <div style="border-bottom: 2px solid #1e293b; width: 180px; margin: 6px auto 2px auto;"></div>
                    <div style="font-size: 9px; color: #0A3D62; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Director</div>
                    <div style="font-size: 8px; color: #94a3b8;">Date: _____________</div>
                </div>
            </div>
            
            <!-- FOOTER -->
            <div style="text-align: center; margin-top: 12px; padding-top: 8px; border-top: 1px solid #e5e7eb; font-size: 8px; color: #94a3b8;">
                <p style="font-style: italic;">This Transcript is issued without any alteration whatsoever, and is only valid with the College Seal.</p>
                <p>Any queries relating to this document should be addressed to the Registrar (Academic Affairs).</p>
                <p style="font-size: 7px; color: #cbd5e1; margin-top: 4px;">Document ID: ${Date.now().toString(36).toUpperCase()} · Generated: ${now}</p>
            </div>
            
            <!-- NAVIGATION BUTTONS (KEEP AS IS - FOR NAVIGATION ONLY) -->
            ${navHtml}
            
            <!-- ACTION BUTTONS -->
            <div style="display: flex; justify-content: center; gap: 10px; margin-top: 14px; padding-top: 10px; border-top: 1px solid #e5e7eb; flex-wrap: wrap;">
                <button onclick="window.printTranscriptDocument()" style="background: #0A3D62; color: white; border: none; padding: 8px 24px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 12px; transition: all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(10,61,98,0.3)'" onmouseout="this.style.transform='none'; this.style.boxShadow='none'">
                    <i class="fas fa-print"></i> Print / PDF
                </button>
                <button onclick="window.downloadTranscript()" style="background: #059669; color: white; border: none; padding: 8px 24px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 12px; transition: all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(5,150,105,0.3)'" onmouseout="this.style.transform='none'; this.style.boxShadow='none'">
                    <i class="fas fa-download"></i> Download
                </button>
                <button onclick="window.closeTranscriptPreview()" style="background: #6b7280; color: white; border: none; padding: 8px 24px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 12px; transition: all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
                    <i class="fas fa-times"></i> Close
                </button>
            </div>
        </div>
    `;
    
    content.innerHTML = html;
};
// ============================================================
// NAVIGATE BLOCKS
// ============================================================

window.navigateBlock = function(direction) {
    const data = window._transcriptData;
    if (!data) return;
    
    const newIndex = data.currentBlockIndex + direction;
    if (newIndex < 0 || newIndex >= data.blockNames.length) return;
    
    renderBlock(newIndex);
};

// ============================================================
// DOWNLOAD TRANSCRIPT AS HTML
// ============================================================

window.downloadTranscript = function() {
    const content = document.getElementById('transcriptPreviewContent');
    if (!content) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('No transcript to download. Please generate one first.', 'warning');
        }
        return;
    }
    
    const data = window._transcriptData;
    const studentName = data?.student?.full_name || 'Student';
    const studentId = data?.student?.student_id || 'N/A';
    const blockName = data?.blockNames?.[data.currentBlockIndex] || 'Transcript';
    
    // Get the transcript HTML and clean it
    const doc = document.createElement('div');
    doc.innerHTML = content.innerHTML;
    
    // Remove all button containers (navigation and action buttons)
    const allDivs = doc.querySelectorAll('div');
    allDivs.forEach(div => {
        const hasButtons = div.querySelectorAll('button').length > 0;
        if (hasButtons) {
            const style = div.getAttribute('style') || '';
            if (style.includes('display: flex') || style.includes('gap:')) {
                div.remove();
            }
        }
    });
    
    // Also remove any remaining button elements
    doc.querySelectorAll('button').forEach(el => el.remove());
    
    const cleanHtml = doc.innerHTML;
    
    const now = new Date().toLocaleDateString('en-KE', {
        timeZone: 'Africa/Nairobi',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const fullHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Academic Transcript - ${studentName} (${studentId})</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 10mm 12mm;
        }
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Times New Roman', Times, serif;
            background: white;
            padding: 20px;
            margin: 0;
            display: flex;
            justify-content: center;
        }
        #transcriptContainer {
            max-width: 850px;
            width: 100%;
            background: white;
            padding: 20px;
            border: 2px solid #0A3D62;
            border-radius: 8px;
        }
        table {
            border-collapse: collapse;
            width: 100%;
        }
        th, td {
            border: 1px solid #d1d5db;
        }
        @media print {
            body { padding: 0; }
            #transcriptContainer { border: none; border-radius: 0; padding: 10px; }
        }
    </style>
</head>
<body>
    <div id="transcriptContainer">
        ${cleanHtml}
    </div>
</body>
</html>`;
    
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Transcript_${studentName.replace(/\s+/g, '_')}_${studentId}_${now.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    if (typeof window.showNotification === 'function') {
        window.showNotification(`✅ Transcript downloaded for ${studentName}`, 'success');
    }
};

// ============================================================
// PRINT TRANSCRIPT DOCUMENT
// ============================================================

window.printTranscriptDocument = function() {
    const content = document.getElementById('transcriptPreviewContent');
    if (!content) return;
    
    const transcriptHtml = content.innerHTML;
    const data = window._transcriptData;
    const studentName = data?.student?.full_name || 'Student';
    const blockName = data?.blockNames?.[data.currentBlockIndex] || 'Transcript';
    
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
            <title>Academic Transcript - ${escapeHtml(studentName)} - ${escapeHtml(blockName)}</title>
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
    window._transcriptData = null;
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
window.downloadTranscript = window.downloadTranscript;
window.navigateBlock = window.navigateBlock;
window.calculateOfficialGrade = calculateOfficialGrade;
window.getProgramType = getProgramType;
window.isTVETProgram = isTVETProgram;
window.isNursingProgram = isNursingProgram;
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
console.log('✅ FIXED: Grading scale correctly detects Nursing vs TVET');
console.log('📋 Features:');
console.log('   - School Logo');
console.log('   - GPA for the year / Cumulative GPA');
console.log('   - Credits Covered / Total Credits');
console.log('   - Fixed Grading Scale (TVET/Nursing based on program)');
console.log('   - Academic Registrar & Director signatures (student removed)');
console.log('   - Print / PDF export');
console.log('   - Download HTML export');
console.log('   - CSV export for bulk transcripts');
console.log('   - ☆ Subtle retake indicator');
console.log('   - Block/Term headers with summaries (NO retake summary)');
console.log('   - All borders on tables');
console.log('   - TVET + Nursing support');
console.log('   - Block navigation (Previous/Next)');
