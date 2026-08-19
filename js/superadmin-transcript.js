// ============================================================
// SUPER ADMIN TRANSCRIPT GENERATOR - COMPLETE
// WITH OFFICIAL GRADE MAPPING FROM MARKS ENTRY SYSTEM
// TVET: Certificate (1 Year - 3 Terms), Diploma (2 Years - 6 Terms)
// KRCHN Nursing: Blocks (Introductory, Block 1-6, Final)
// PROFESSIONAL TRANSCRIPT DOCUMENT
// ============================================================

console.log('📄 Super Admin Transcript Generator Loading...');

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
// OFFICIAL GRADE MAPPING - MATCHES MARKS ENTRY SYSTEM
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
        label: 'TVET Competency-Based'
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
        label: 'Nursing Academic'
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
    
    for (const [grade, config] of Object.entries(grades)) {
        if (score >= config.min && score <= config.max) {
            return {
                grade: grade,
                points: config.points,
                label: config.label,
                color: config.color,
                bgColor: config.bgColor
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
    
    const program = document.getElementById('transcript_program_select')?.value || 'all';
    const year = document.getElementById('transcript_year_select')?.value || '2025';
    const block = document.getElementById('transcript_block_select')?.value || 'all';
    
    const placeholder = document.getElementById('transcriptPlaceholder');
    const dynamicContent = document.getElementById('transcriptDynamicContent');
    const studentList = document.getElementById('transcriptStudentList');
    const previewContainer = document.getElementById('transcriptPreviewContainer');
    
    // Show loading
    if (studentList) {
        studentList.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                <div class="loading-spinner" style="display: inline-block; width: 30px; height: 30px; border: 3px solid #e5e7eb; border-top-color: #0A3D62; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <p style="color: #94a3b8; margin-top: 10px;">Loading students...</p>
            </div>
        `;
    }
    
    try {
        // Get students
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
            // Get marks for all students
            const studentIds = students.map(s => s.student_id);
            const { data: marks, error: marksError } = await window.sb
                .from('student_marks')
                .select('*')
                .in('admission_number', studentIds)
                .eq('academic_year', year);
            
            if (marksError) throw marksError;
            
            window.transcriptData.marks = marks || [];
            
            // Update stats
            window.updateTranscriptStats(students, marks);
            
            // Render student list
            window.renderTranscriptStudentList(students, marks);
            
            // Update student count
            const countEl = document.getElementById('transcript_student_count');
            if (countEl) countEl.textContent = students.length;
            
            // Show dynamic content, hide placeholder
            if (placeholder) placeholder.style.display = 'none';
            if (dynamicContent) dynamicContent.style.display = 'block';
            if (previewContainer) previewContainer.style.display = 'none';
            
        } else {
            // No students found
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
        
        // Populate student dropdown
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
    
    // Calculate passing/failing/pending
    let passing = 0;
    let failing = 0;
    let pending = 0;
    let totalScore = 0;
    let scoredCount = 0;
    let totalCreditHours = 0;
    let totalGradePoints = 0;
    
    // Group marks by student
    const studentMarks = {};
    marks?.forEach(m => {
        const admission = m.admission_number;
        if (!studentMarks[admission]) studentMarks[admission] = [];
        studentMarks[admission].push(m);
    });
    
    // Calculate per student
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
    
    // Calculate averages per student
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
    
    // Update selected count
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
    
    // Re-render the student list
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
    
    // Find student
    const student = window.transcriptData.students.find(s => s.student_id === studentId);
    if (!student) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('Student not found', 'error');
        }
        return;
    }
    
    // Get student marks
    const studentMarks = window.transcriptData.marks.filter(m => m.admission_number === studentId);
    
    if (studentMarks.length === 0) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('No marks found for this student', 'warning');
        }
        return;
    }
    
    // Generate and show transcript
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
            
            // Generate transcript preview
            window.showTranscriptPreview(student, studentMarks, year);
            successCount++;
            
            // Small delay to prevent overload
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
// SHOW TRANSCRIPT PREVIEW - PROFESSIONAL OFFICIAL VERSION
// ============================================================

window.showTranscriptPreview = function(student, marks, year) {
    const container = document.getElementById('transcriptPreviewContainer');
    const content = document.getElementById('transcriptPreviewContent');
    
    if (!container || !content) return;
    
    const program = student.program || 'KRCHN';
    const isTVET = isTVETProgram(program);
    const programType = isTVET ? 'TVET' : 'Nursing';
    const config = getGradingConfig(program);
    const passMark = config.passMark;
    const blockLabel = isTVET ? 'Term' : 'Block';
    const programLabel = isTVET ? 'Competency-Based Education & Training (CBET)' : 'Academic Program';
    
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
    
    blockNames.forEach((block) => {
        const blockMarks = groupedMarks[block];
        const blockTotal = blockMarks.length;
        let blockPassed = 0;
        
        // Block header
        marksHtml += `
            <tr style="background: #0A3D62; color: white;">
                <td colspan="11" style="padding: 6px 12px; text-align: center; font-size: 11px; font-weight: 700;">
                    📁 ${escapeHtml(block)} (${blockTotal} units)
                </td>
            </tr>
        `;
        
        blockMarks.forEach((m, index) => {
            const score = m.final_score || 0;
            const gradeInfo = calculateOfficialGrade(score, program);
            const isPassing = score >= passMark;
            const statusLabel = getStatusLabel(score, program);
            
            if (score > 0) {
                totalScore += score;
                scoredCount++;
                totalPoints += gradeInfo.points * GRADE_CONFIG.creditHours;
                totalCredits += GRADE_CONFIG.creditHours;
                if (isPassing) blockPassed++;
            }
            
            const rowBg = index % 2 === 0 ? '#f8fafc' : 'transparent';
            
            marksHtml += `
                <tr style="border-bottom: 1px solid #e5e7eb; background: ${rowBg};">
                    <td style="padding: 6px 10px; text-align: center; font-size: 11px; color: #94a3b8;">${index + 1}</td>
                    <td style="padding: 6px 10px; font-weight: 500; font-size: 12px;">${escapeHtml(m.subject_name || 'N/A')}</td>
                    <td style="padding: 6px 10px; text-align: center; font-size: 11px;">${escapeHtml(m.unit_code || m.unit_code || 'N/A')}</td>
                    <td style="padding: 6px 10px; text-align: center; font-size: 11px;">${m.cat1_score || '-'}</td>
                    <td style="padding: 6px 10px; text-align: center; font-size: 11px;">${m.cat2_score || '-'}</td>
                    <td style="padding: 6px 10px; text-align: center; font-size: 11px;">${m.exam_score || '-'}</td>
                    <td style="padding: 6px 10px; text-align: center; font-weight: 700; font-size: 13px; color: ${isPassing ? '#059669' : '#dc2626'};">${score || '-'}</td>
                    <td style="padding: 6px 10px; text-align: center;">
                        <span style="background: ${gradeInfo.bgColor}; color: ${gradeInfo.color}; padding: 2px 10px; border-radius: 10px; font-weight: 700; font-size: 12px;">
                            ${gradeInfo.grade}
                        </span>
                    </td>
                    <td style="padding: 6px 10px; text-align: center; font-weight: 600; font-size: 11px; color: ${gradeInfo.color};">${gradeInfo.points.toFixed(1)}</td>
                    <td style="padding: 6px 10px; text-align: center; font-size: 10px;">
                        <span style="background: ${isPassing ? '#d1fae5' : '#fee2e2'}; color: ${isPassing ? '#065f46' : '#991b1b'}; padding: 1px 8px; border-radius: 8px; font-weight: 600;">
                            ${statusLabel}
                        </span>
                    </td>
                    <td style="padding: 6px 10px; text-align: center; font-size: 10px;">
                        ${isPassing ? '✅' : '❌'}
                    </td>
                </tr>
            `;
        });
        
        // Block summary
        const blockPassRate = blockTotal > 0 ? Math.round((blockPassed / blockTotal) * 100) : 0;
        marksHtml += `
            <tr style="background: #f1f5f9; border-top: 2px solid #0A3D62;">
                <td colspan="6" style="padding: 4px 10px; font-size: 10px; color: #64748b;">
                    <strong>Block Summary:</strong> ${blockPassed}/${blockTotal} passed (${blockPassRate}%)
                </td>
                <td colspan="5" style="padding: 4px 10px; font-size: 10px; color: #64748b; text-align: right;">
                    GPA: <strong>${calculateGPA(blockMarks, program).toFixed(2)}</strong>
                </td>
            </tr>
        `;
    });
    
    // Calculate overall stats
    const overallAvg = scoredCount > 0 ? Math.round((totalScore / scoredCount) * 10) / 10 : 0;
    const overallGradeInfo = calculateOfficialGrade(overallAvg, program);
    const overallStatus = getStatusLabel(overallAvg, program);
    const isOverallPassing = overallAvg >= passMark;
    const gpa = totalCredits > 0 ? Math.round((totalPoints / totalCredits) * 100) / 100 : 0;
    const totalUnits = marks.length;
    const passedUnits = marks.filter(m => (m.final_score || 0) >= passMark).length;
    const failedUnits = marks.filter(m => (m.final_score || 0) > 0 && (m.final_score || 0) < passMark).length;
    const pendingUnits = marks.filter(m => (m.final_score || 0) === 0).length;
    
    // Grading scale table
    let gradingScaleHtml = '';
    const grades = config.grades;
    for (const [grade, gConfig] of Object.entries(grades)) {
        const range = `${gConfig.min}-${gConfig.max === 100 ? '100' : gConfig.max}`;
        gradingScaleHtml += `
            <tr>
                <td style="padding: 3px 8px; text-align: center;"><span style="background: ${gConfig.color}; color: white; padding: 1px 10px; border-radius: 4px; font-weight: 700; font-size: 10px;">${grade}</span></td>
                <td style="padding: 3px 8px; text-align: center; font-size: 10px;">${range}%</td>
                <td style="padding: 3px 8px; text-align: center; font-size: 10px;">${gConfig.points.toFixed(1)}</td>
                <td style="padding: 3px 8px; text-align: center; font-size: 10px;">${gConfig.label}</td>
            </tr>
        `;
    }
    
    const now = new Date().toLocaleDateString('en-KE', {
        timeZone: 'Africa/Nairobi',
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
    
    // Build full professional transcript HTML
    const html = `
        <div id="transcriptDocument" style="background: white; padding: 30px; border: 2px solid #0A3D62; border-radius: 12px; box-shadow: 0 4px 20px rgba(10,61,98,0.15); font-family: 'Times New Roman', Times, serif;">
            
            <!-- WATERMARK -->
            <div style="position: relative; overflow: hidden;">
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 80px; color: rgba(10,61,98,0.03); font-weight: 700; white-space: nowrap; pointer-events: none; z-index: 0;">NCHSM</div>
                
                <!-- HEADER -->
                <div style="text-align: center; border-bottom: 3px double #0A3D62; padding-bottom: 15px; margin-bottom: 20px; position: relative; z-index: 1;">
                    <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 5px;">
                        <img src="https://raw.githubusercontent.com/NCHSMlearning/e-learning/main/images/Logo_NCHSM.png" alt="NCHSM Logo" style="max-height: 55px; width: auto;" onerror="this.style.display='none'">
                        <div>
                            <h1 style="color: #0A3D62; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 1px;">NAKURU COLLEGE OF HEALTH SCIENCES</h1>
                            <p style="color: #64748b; margin: 0; font-size: 11px; font-style: italic;">AND MANAGEMENT (NCHSM)</p>
                            <p style="color: #0A3D62; margin: 2px 0 0 0; font-size: 11px; font-weight: 600;">"Excellence in Health Sciences Education"</p>
                        </div>
                    </div>
                    <h2 style="color: #0A3D62; margin: 8px 0 0 0; font-size: 16px; letter-spacing: 3px; font-weight: 700;">ACADEMIC TRANSCRIPT</h2>
                    <p style="color: #94a3b8; margin: 2px 0 0 0; font-size: 10px;">Generated: ${now}</p>
                </div>
                
                <!-- STUDENT INFO -->
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px 20px; margin-bottom: 16px; padding: 12px 16px; background: #f8fafc; border-radius: 6px; border: 1px solid #e5e7eb; position: relative; z-index: 1;">
                    <div><span style="font-weight: 600; color: #475569; font-size: 10px; display: block; text-transform: uppercase; letter-spacing: 0.5px;">Student Name</span><span style="font-weight: 700; color: #0A3D62; font-size: 14px;">${escapeHtml(student.full_name || 'Unknown')}</span></div>
                    <div><span style="font-weight: 600; color: #475569; font-size: 10px; display: block; text-transform: uppercase; letter-spacing: 0.5px;">Admission Number</span><span style="font-weight: 600; color: #0A3D62; font-size: 14px;">${escapeHtml(student.student_id || 'N/A')}</span></div>
                    <div><span style="font-weight: 600; color: #475569; font-size: 10px; display: block; text-transform: uppercase; letter-spacing: 0.5px;">Program</span><span style="font-weight: 600; color: #0A3D62; font-size: 14px;">${escapeHtml(student.program || 'N/A')}</span></div>
                    <div><span style="font-weight: 600; color: #475569; font-size: 10px; display: block; text-transform: uppercase; letter-spacing: 0.5px;">Program Type</span><span style="font-weight: 600; color: #0A3D62; font-size: 14px;">${programType} - ${programLabel}</span></div>
                    <div><span style="font-weight: 600; color: #475569; font-size: 10px; display: block; text-transform: uppercase; letter-spacing: 0.5px;">${blockLabel}</span><span style="font-weight: 600; color: #0A3D62; font-size: 14px;">${escapeHtml(student.block || 'N/A')}</span></div>
                    <div><span style="font-weight: 600; color: #475569; font-size: 10px; display: block; text-transform: uppercase; letter-spacing: 0.5px;">Academic Year</span><span style="font-weight: 600; color: #0A3D62; font-size: 14px;">${escapeHtml(year)}</span></div>
                </div>
                
                <!-- ACADEMIC SUMMARY -->
                <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; margin-bottom: 16px; padding: 10px 12px; background: #0A3D62; border-radius: 6px; position: relative; z-index: 1;">
                    <div style="text-align: center;">
                        <div style="font-size: 9px; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.5px;">GPA</div>
                        <div style="font-size: 18px; font-weight: 700; color: #FDB913;">${gpa.toFixed(2)}</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 9px; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.5px;">Average</div>
                        <div style="font-size: 18px; font-weight: 700; color: ${isOverallPassing ? '#10b981' : '#dc2626'};">${overallAvg || '-'}%</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 9px; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.5px;">Grade</div>
                        <div style="font-size: 18px; font-weight: 700; color: ${overallGradeInfo.color};">${overallGradeInfo.grade}</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 9px; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.5px;">Status</div>
                        <div style="font-size: 14px; font-weight: 700; color: ${isOverallPassing ? '#10b981' : '#dc2626'};">${overallStatus}</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 9px; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.5px;">Units</div>
                        <div style="font-size: 18px; font-weight: 700; color: white;">${totalUnits}</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 9px; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.5px;">Pass/Fail</div>
                        <div style="font-size: 14px; font-weight: 700; color: white;">${passedUnits}/${failedUnits}</div>
                        <div style="font-size: 8px; color: rgba(255,255,255,0.5);">${pendingUnits} pending</div>
                    </div>
                </div>
                
                <!-- MARKS TABLE -->
                <div style="overflow-x: auto; margin-bottom: 16px; position: relative; z-index: 1;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                        <thead>
                            <tr style="background: #0A3D62; color: white;">
                                <th style="padding: 6px 10px; text-align: center; width: 30px;">#</th>
                                <th style="padding: 6px 10px; text-align: left; min-width: 120px;">Unit Name</th>
                                <th style="padding: 6px 10px; text-align: center; min-width: 60px;">Code</th>
                                <th style="padding: 6px 10px; text-align: center; width: 40px;">CAT1</th>
                                <th style="padding: 6px 10px; text-align: center; width: 40px;">CAT2</th>
                                <th style="padding: 6px 10px; text-align: center; width: 40px;">Exam</th>
                                <th style="padding: 6px 10px; text-align: center; width: 45px;">Total</th>
                                <th style="padding: 6px 10px; text-align: center; width: 40px;">Grade</th>
                                <th style="padding: 6px 10px; text-align: center; width: 40px;">Points</th>
                                <th style="padding: 6px 10px; text-align: center; min-width: 60px;">Status</th>
                                <th style="padding: 6px 10px; text-align: center; width: 30px;">Pass</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${marksHtml}
                        </tbody>
                    </table>
                </div>
                
                <!-- GRADING SCALE -->
                <div style="margin-bottom: 16px; padding: 10px 14px; background: #f8fafc; border-radius: 6px; border: 1px solid #e5e7eb; position: relative; z-index: 1;">
                    <div style="font-weight: 700; color: #0A3D62; font-size: 11px; text-align: center; margin-bottom: 6px;">📊 Grading Scale (${programType})</div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 9px;">
                        <thead>
                            <tr style="background: #e5e7eb;">
                                <th style="padding: 2px 8px; text-align: center;">Grade</th>
                                <th style="padding: 2px 8px; text-align: center;">Range</th>
                                <th style="padding: 2px 8px; text-align: center;">Points</th>
                                <th style="padding: 2px 8px; text-align: center;">Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${gradingScaleHtml}
                            <tr>
                                <td colspan="4" style="padding: 4px 8px; text-align: center; font-weight: 600; color: #0A3D62; font-size: 9px;">
                                    Min Pass: ${passMark}% · Credit Hours: ${GRADE_CONFIG.creditHours} per unit
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <!-- DECLARATION -->
                <div style="margin-bottom: 12px; padding: 10px 14px; background: #f8fafc; border-radius: 6px; border: 1px solid #e5e7eb; position: relative; z-index: 1;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-weight: 700; color: #0A3D62; font-size: 10px;">📋 DECLARATION:</span>
                        <span style="font-size: 10px; color: #475569;">I confirm that the grades presented are accurate and reflect my academic performance.</span>
                    </div>
                    <div style="font-size: 8px; color: #94a3b8; margin-top: 2px; text-align: center;">I understand that falsification will result in disciplinary action.</div>
                </div>
                
                <!-- SIGNATURES -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 12px; padding-top: 10px; border-top: 1px solid #e5e7eb; position: relative; z-index: 1;">
                    <div style="text-align: center;">
                        <div style="font-weight: 600; font-size: 12px; color: #0A3D62;">${escapeHtml(student.full_name || 'Student')}</div>
                        <div style="border-bottom: 2px solid #1e293b; width: 140px; margin: 6px auto 2px auto;"></div>
                        <div style="font-size: 8px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Student Signature</div>
                        <div style="font-size: 8px; color: #94a3b8;">Date: ${now}</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-weight: 600; font-size: 12px; color: #94a3b8;">_________________________</div>
                        <div style="border-bottom: 2px solid #1e293b; width: 140px; margin: 6px auto 2px auto;"></div>
                        <div style="font-size: 8px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Registrar / Head of Department</div>
                        <div style="font-size: 8px; color: #94a3b8;">Date: _____________</div>
                    </div>
                </div>
                
                <!-- FOOTER -->
                <div style="text-align: center; padding-top: 10px; border-top: 1px solid #e5e7eb; font-size: 8px; color: #94a3b8; position: relative; z-index: 1;">
                    <p>This is an official document. For verification, contact the Academic Office.</p>
                    <p><strong style="color: #0A3D62;">NCHSM</strong> · P.O. Box 12906 - 20100, Nakuru · Tel: 0790969743</p>
                    <p style="font-size: 7px; color: #cbd5e1;">Document ID: ${Date.now().toString(36).toUpperCase()} · Generated by NCHSM Transcript System</p>
                </div>
            </div>
            
            <!-- ACTION BUTTONS -->
            <div style="display: flex; justify-content: center; gap: 10px; margin-top: 16px; padding-top: 12px; border-top: 1px solid #e5e7eb; flex-wrap: wrap;">
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
    
    // Store current transcript data for printing
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
    
    // Get the transcript HTML
    const transcriptHtml = content.innerHTML;
    
    // Open print window
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
                    max-width: 900px;
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
    
    // Generate a summary CSV
    const headers = ['Admission', 'Student Name', 'Program', 'Program Type', 'Block/Term', 'Academic Year', 'Units', 'Average', 'Grade', 'Points', 'GPA', 'Status', 'Passed', 'Failed', 'Pending'];
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
            pending
        ]);
    }
    
    // Build CSV
    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
    });
    
    // Download CSV
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
window.escapeHtml = escapeHtml;

console.log('✅ Super Admin Transcript Generator Module Loaded Successfully!');
console.log('📄 Professional transcript document with official grade mapping');
console.log('📊 TVET: Certificate (3 Terms), Diploma (6 Terms)');
console.log('📊 KRCHN: Blocks (Introductory, Block 1-6, Final)');
console.log('⭐ Official grade mapping from marks entry system');
console.log('📋 Available functions:');
console.log('   - loadTranscriptStudents()');
console.log('   - filterTranscriptStudents()');
console.log('   - refreshTranscriptData()');
console.log('   - exportAllTranscripts()');
console.log('   - generateSelectedTranscript()');
console.log('   - generateSelectedTranscripts()');
console.log('   - selectAllTranscriptStudents()');
console.log('   - deselectAllTranscriptStudents()');
console.log('   - printTranscriptDocument()');
