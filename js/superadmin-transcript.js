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

// KRCHN annual academic structure (academic year is determined by block, not calendar year).
// Year 1: Introductory + Block 1
// Year 2: Block 2 + Block 3
// Year 3: Block 4 + Block 5 + FQE
// Block 6 is not assigned to an annual year until its curriculum placement is confirmed.
const KRCHN_BLOCKS = ['Introductory', 'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Block 6', 'FQE'];

function normalizeKRCHNBlock(value) {
    const raw = String(value || '').trim();
    const normalized = raw.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (/\bfqe\b|final qualifying examination|qualifying examination/.test(normalized)) return 'FQE';
    if (/introductory/.test(normalized)) return 'Introductory';
    const match = normalized.match(/\bblock\s*([1-6])\b/);
    if (match) return 'Block ' + match[1];
    if (/^final$/.test(normalized)) return 'FQE';
    return raw || 'General';
}

function getKRCHNStudyYear(value) {
    const block = normalizeKRCHNBlock(value);
    if (block === 'Introductory' || block === 'Block 1') return 1;
    if (block === 'Block 2' || block === 'Block 3') return 2;
    if (['Block 4', 'Block 5', 'FQE'].includes(block)) return 3;
    return 0;
}

function filterKRCHNMarksByStudyYear(marks, studyYear) {
    return (marks || []).filter(mark => getKRCHNStudyYear(mark.block || mark.unit_name || mark.assessment_name || mark.exam_title) === Number(studyYear));
}

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
    
    if (score === null || score === undefined || score === '') return 'PENDING';
    if (Number(score) === 0) return config === GRADE_CONFIG.tvet ? 'NOT YET COMPETENT' : 'FAIL';
    if (score >= passMark) return config === GRADE_CONFIG.tvet ? 'COMPETENT' : 'PASS';
    return config === GRADE_CONFIG.tvet ? 'NOT YET COMPETENT' : 'FAIL';
}

function calculateGPA(marks, programCode) {
 if (!Array.isArray(marks) || !marks.length) return 0;
 const rows = getEffectiveUnitMarks(marks.filter(m => m && m.published === true && String(m.approval_status || '').trim().toLowerCase() === 'approved'));
 let points = 0, creditsTotal = 0;
 rows.forEach(m => {
  const score = getEffectiveMarkScore(m);
  const gradeLabel = String(m.published_grade ?? m.final_grade ?? m.final_grade_letter ?? m.letter_grade ?? m.grade_letter ?? m.result_grade ?? m.computed_grade ?? m.grade ?? '').trim().toUpperCase();
  const storedPointsRaw = m.points ?? m.grade_points ?? m.grade_point ?? m.gpa_points;
  const storedPoints = storedPointsRaw !== null && storedPointsRaw !== undefined && storedPointsRaw !== '' && Number.isFinite(Number(storedPointsRaw)) ? Number(storedPointsRaw) : null;
  const gradePointMap = { A:4, DISTINCTION:4, EXCELLENT:4, B:3, CREDIT:3, GOOD:3, C:2, PASS:2, SATISFACTORY:2, D:0, F:0, FAIL:0, E:0, 'NOT YET COMPETENT':0 };
  let gradePoints = Object.prototype.hasOwnProperty.call(gradePointMap, gradeLabel) ? gradePointMap[gradeLabel] : storedPoints;
  if (gradePoints === null && score !== null) gradePoints = Number(calculateOfficialGrade(score, programCode).points || 0);
  if (gradePoints === null || !Number.isFinite(gradePoints)) return;
  const raw = Number(m.credits ?? m.credit_hours ?? m.creditHours);
  const credits = Number.isFinite(raw) && raw > 0 ? raw : GRADE_CONFIG.creditHours;
  points += gradePoints * credits; creditsTotal += credits;
 });
 return creditsTotal ? Math.round(points / creditsTotal * 100) / 100 : 0;
}

function getEffectiveMarkScore(mark) {
 if (!mark) return null;
 const status = String(mark.retake_status || '').trim().toLowerCase();
 if (['pass','passed','competent'].includes(status) && mark.retake_score !== null && mark.retake_score !== undefined && mark.retake_score !== '') { const n = Number(mark.retake_score); if (Number.isFinite(n)) return n; }
 const raw = mark.final_score ?? mark.published_score ?? mark.overall_score ?? mark.final_total ?? mark.total_score ?? mark.total ?? mark.score ?? mark.marks;
 if (raw === null || raw === undefined || raw === '') return null; const n = Number(raw); return Number.isFinite(n) ? n : null;
}
function getEffectiveUnitMarks(marks) {
 const chosen = new Map(); const time = m => { const n = Date.parse(m.updated_at || m.created_at || m.marked_at || m.published_at || ''); return Number.isFinite(n) ? n : 0; }; const rank = m => (Number(m.retake_count) > 0 || m.retake_score !== null && m.retake_score !== undefined || Boolean(m.retake_status)) ? 1 : 0;
 (Array.isArray(marks) ? marks : []).forEach(m => { if (!m) return; const block = normalizeKRCHNBlock(m.block || 'General').toLowerCase(); const unit = String(m.subject_name || m.unit_name || m.unit_code || m.course_code || m.id || m.mark_id || 'unknown-unit').trim().toLowerCase().replace(/\\s+/g, ' '); const key = block + '::' + unit; const old = chosen.get(key); if (!old || rank(m) > rank(old) || (rank(m) === rank(old) && time(m) >= time(old))) chosen.set(key, m); }); return Array.from(chosen.values());
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ============================================================
function ensureTranscriptBatchActions() {
    const list = document.getElementById('transcriptStudentList');
    if (!list || document.getElementById('transcriptBatchActions')) return;
    const toolbar = document.createElement('div');
    toolbar.id = 'transcriptBatchActions';
    toolbar.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:space-between;margin:12px 0;padding:12px;border:1px solid #dbe4ee;border-radius:10px;background:#f8fafc;';
    toolbar.innerHTML = `
      <div style="min-width:180px;flex:1;">
        <div style="font-weight:800;color:#0A3D62;font-size:14px;">Transcript generation</div>
        <div id="transcriptBatchScopeLabel" style="font-size:12px;color:#64748b;margin-top:3px;">Load an intake year and block to begin.</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button type="button" id="transcriptGenerateSingleAction" style="background:#0A3D62;color:#fff;border:0;border-radius:7px;padding:10px 14px;font-weight:700;cursor:pointer;"><i class="fas fa-file-alt"></i> Generate Single Student</button>
        <button type="button" id="transcriptGenerateBlockAction" style="background:#047857;color:#fff;border:0;border-radius:7px;padding:10px 14px;font-weight:700;cursor:pointer;"><i class="fas fa-users"></i> Generate Entire Filtered Block</button>
      </div>`;
    list.parentNode.insertBefore(toolbar, list);
    toolbar.querySelector('#transcriptGenerateSingleAction').addEventListener('click', () => {
        const checkedIds = Array.from(document.querySelectorAll('#transcriptStudentList input[type="checkbox"]:checked'))
            .map(box => box.dataset.transcriptStudentId || box.value || '')
            .map(id => String(id).trim()).filter(Boolean);
        const stateIds = (window.transcriptData?.selectedStudents || []).map(id => String(id).trim()).filter(Boolean);
        const ids = [...new Set(checkedIds.length ? checkedIds : stateIds)];
        if (ids.length !== 1) {
            const message = ids.length === 0
                ? 'Select exactly one student using the checkbox below.'
                : 'Select only one student to generate a single transcript.';
            if (typeof window.showNotification === 'function') window.showNotification(message, 'warning');
            else alert(message);
            return;
        }
        window.generateSelectedTranscriptBatch({ studentIds: ids });
    });
    toolbar.querySelector('#transcriptGenerateBlockAction').addEventListener('click', () => {
        window.transcriptData.selectedStudents = [];
        window.generateSelectedTranscriptBatch({ allFiltered: true });
    });
}

function updateTranscriptBatchActionLabel() {
    ensureTranscriptBatchActions();
    const node = document.getElementById('transcriptBatchScopeLabel');
    if (!node) return;
    const ctx = getTranscriptFilterContext();
    const count = (window.transcriptData?.students || []).length;
    node.textContent = `Intake ${ctx.intakeYear} · ${ctx.block === 'all' ? 'All blocks' : ctx.block} · ${count} eligible student(s) with approved and published marks`;
}

// Fetch all eligible marks for a cohort, paging beyond Supabase's default row cap.
async function fetchTranscriptMarksForStudents(sb, studentIds) {
    const ids = [...new Set((studentIds || []).map(id => String(id || '').trim()).filter(Boolean))];
    const all = [];
    for (let start = 0; start < ids.length; start += 100) {
        const chunk = ids.slice(start, start + 100);
        let offset = 0;
        while (true) {
            const { data, error } = await sb.from('student_marks').select('*')
                .in('admission_number', chunk)
                .eq('published', true)
                .eq('approval_status', 'approved')
                .range(offset, offset + 999);
            if (error) throw error;
            const rows = data || [];
            all.push(...rows);
            if (rows.length < 1000) break;
            offset += 1000;
        }
    }
    return all;
}

function getTranscriptFilterContext() {
    return {
        program: document.getElementById('transcript_program_select')?.value || 'all',
        intakeYear: document.getElementById('transcript_year_select')?.value || 'all',
        block: document.getElementById('transcript_block_select')?.value || 'all'
    };
}

function transcriptMarkMatchesBlock(mark, block) {
    if (!block || block === 'all') return true;
    const wanted = normalizeKRCHNBlock(block);
    const actual = normalizeKRCHNBlock(mark.block || mark.unit_name || mark.assessment_name || mark.exam_title || '');
    return actual === wanted;
}

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
        
        // Intake year identifies the cohort. The selected block is verified against
        // the student's actual published and approved exam marks, not their current profile block.
        if (year && year !== 'all') query = query.eq('intake_year', year);
        
        const { data: students, error: studentError } = await query;
        
        if (studentError) throw studentError;
        
        window.transcriptData.students = students || [];
        window.transcriptData.selectedStudents = [];
        window.transcriptData.filteredStudents = students || [];
        
        if (students && students.length > 0) {
            const studentIds = students.map(s => s.student_id);
            const allApprovedMarks = await fetchTranscriptMarksForStudents(window.sb, studentIds);
            const marks = block === 'all'
                ? allApprovedMarks
                : allApprovedMarks.filter(mark => transcriptMarkMatchesBlock(mark, block));
            const eligibleStudents = block === 'all'
                ? students
                : students.filter(student => marks.some(mark => String(mark.admission_number) === String(student.student_id)));

            window.transcriptData.students = eligibleStudents;
            window.transcriptData.filteredStudents = eligibleStudents;
            window.transcriptData.marks = marks;
            ensureTranscriptBatchActions();
            updateTranscriptBatchActionLabel();
            window.updateTranscriptStats(eligibleStudents, marks);
            window.renderTranscriptStudentList(eligibleStudents, marks);
            
            const countEl = document.getElementById('transcript_student_count');
            if (countEl) countEl.textContent = eligibleStudents.length;
            
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
        
        window.populateTranscriptStudentDropdown(window.transcriptData.students);
        updateTranscriptBatchActionLabel();
        
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
 const totalStudents = students?.length || 0; let passing = 0, failing = 0, pending = 0, sum = 0, count = 0, creditsTotal = 0, pointsTotal = 0; const grouped = {};
 getEffectiveUnitMarks(marks || []).forEach(m => { const id = m.admission_number; (grouped[id] ||= []).push(m); });
 for (const [id, rows] of Object.entries(grouped)) { const student = (students || []).find(s => String(s.student_id) === String(id)); const program = rows[0]?.program || student?.program || 'KRCHN'; const pass = getGradingConfig(program).passMark; let ssum = 0, scount = 0;
 rows.forEach(m => { const score = getEffectiveMarkScore(m); if (score === null) return; const grade = calculateOfficialGrade(score, program); const raw = Number(m.credits || m.credit_hours || m.creditHours); const credits = Number.isFinite(raw) && raw > 0 ? raw : GRADE_CONFIG.creditHours; ssum += score; scount++; sum += score; count++; pointsTotal += grade.points * credits; creditsTotal += credits; });
 if (!scount) pending++; else if (ssum / scount >= pass) passing++; else failing++; }
 const avg = count ? Math.round(sum / count * 10) / 10 : 0; const gpa = creditsTotal ? Math.round(pointsTotal / creditsTotal * 100) / 100 : 0; const values = { transcript_total_students: totalStudents, transcript_passing: passing, transcript_failing: failing, transcript_pending: Math.max(pending, totalStudents - Object.keys(grouped).length), transcript_avg: avg + '%', transcript_overall_gpa: gpa.toFixed(2) };
 Object.entries(values).forEach(([id, value]) => { const el = document.getElementById(id); if (el) el.textContent = value; });
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
    getEffectiveUnitMarks(marks || []).forEach(mark => { const admission = mark.admission_number; const score = getEffectiveMarkScore(mark); if (score === null) return; const owner = students.find(s => String(s.student_id) === String(admission)); const program = mark.program || owner?.program || 'KRCHN'; if (!studentAverages[admission]) studentAverages[admission] = { total: 0, count: 0, points: 0, credits: 0, program }; const grade = calculateOfficialGrade(score, program); const raw = Number(mark.credits || mark.credit_hours || mark.creditHours); const credits = Number.isFinite(raw) && raw > 0 ? raw : GRADE_CONFIG.creditHours; const item = studentAverages[admission]; item.total += score; item.count++; item.points += grade.points * credits; item.credits += credits; });
    
    let html = '';
    students.forEach((student, index) => {
        const avgData = studentAverages[student.student_id] || { total: 0, count: 0, scores: [], points: 0, program: 'KRCHN' };
        const avg = avgData.count > 0 ? Math.round((avgData.total / avgData.count) * 10) / 10 : 0;
        const gpa = avgData.credits > 0 ? Math.round((avgData.points / avgData.credits) * 100) / 100 : 0;
        const program = avgData.program || student.program || 'KRCHN';
        const isTVET = isTVETProgram(program);
        const config = getGradingConfig(program);
        const passMark = config.passMark;
        const gradeInfo = calculateOfficialGrade(avg, program);
        const isPassing = avg >= passMark;
        const statusColor = isPassing ? '#059669' : (avg > 0 ? '#dc2626' : '#f59e0b');
        const statusText = avgData.count === 0 ? '⏳ Pending' : (isPassing ? '✅ Pass' : '❌ Fail');
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
                           data-transcript-student-id="${escapeHtml(student.student_id)}"
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
    updateTranscriptBatchActionLabel();
    updateTranscriptBatchActionLabel();
    
    const countEl = document.getElementById('transcript_student_count');
    if (countEl) countEl.textContent = filtered.length;
};

// ============================================================
// TOGGLE TRANSCRIPT STUDENT SELECTION
// ============================================================

window.toggleTranscriptStudent = function(studentId) {
    const id = String(studentId);
    const selected = Array.isArray(window.transcriptData.selectedStudents)
        ? window.transcriptData.selectedStudents.map(String)
        : [];
    const index = selected.indexOf(id);
    if (index > -1) selected.splice(index, 1);
    else selected.push(id);
    window.transcriptData.selectedStudents = [...new Set(selected)];

    const students = window.transcriptData.filteredStudents || window.transcriptData.students;
    window.renderTranscriptStudentList(students, window.transcriptData.marks);
    window.updateTranscriptSelectedCount();
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
    const studentSelect = document.getElementById('transcript_student_select');
    const studentId = String(studentSelect?.value || '').trim();
    const year = document.getElementById('transcript_year_select')?.value || String(new Date().getFullYear());

    const notify = (message, type = 'warning') => {
        if (typeof window.showNotification === 'function') window.showNotification(message, type);
        else console.info('[Transcript Generator]', message);
    };

    if (!studentId) {
        notify('Please select a student first.');
        studentSelect?.focus();
        return;
    }

    const sb = window.sb || window.supabaseClient ||
        (window.supabase && typeof window.supabase.from === 'function' ? window.supabase : null);
    if (!sb || typeof sb.from !== 'function') {
        notify('Database connection is not ready. Refresh the page and try again.', 'error');
        return;
    }

    const generateButton = document.querySelector('button[onclick="generateSelectedTranscript()"]');
    const originalButtonHtml = generateButton?.innerHTML;
    if (generateButton) {
        generateButton.disabled = true;
        generateButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating…';
    }

    try {
        // Resolve the student from the loaded list first, then query by admission ID.
        // This prevents stale filters or an outdated student cache blocking generation.
        let student = (window.transcriptData?.students || []).find(s =>
            String(s.student_id || '').trim() === studentId
        );

        if (!student) {
            const { data, error } = await sb
                .from('consolidated_user_profiles_table')
                .select('*')
                .eq('student_id', studentId)
                .eq('role', 'student')
                .maybeSingle();
            if (error) throw error;
            student = data;
        }

        if (!student) {
            notify('The selected student could not be found. Click Load and select the student again.', 'error');
            return;
        }

        // Fetch marks for the selected student at generation time rather than relying
        // on a potentially stale list loaded for a different year/block filter.
        const context = getTranscriptFilterContext();
        const fetchedStudentMarks = await fetchTranscriptMarksForStudents(sb, [studentId]);
        const studentMarks = context.block === 'all'
            ? fetchedStudentMarks
            : fetchedStudentMarks.filter(mark => transcriptMarkMatchesBlock(mark, context.block));
        if (!studentMarks.length) {
            notify('No approved and published marks were found for this student in the selected block.', 'warning');
            return;
        }
        window.showTranscriptPreview(student, studentMarks, context.block === 'all' ? 'Cumulative' : context.block);

        if (studentMarks.length === 0) {
            notify('Transcript preview opened, but no marks are recorded for this student yet. Enter/release marks to complete it.', 'warning');
        } else {
            notify('Transcript generated successfully.', 'success');
        }
    } catch (error) {
        console.error('[Transcript Generator] Generation failed:', error);
        notify('Transcript generation failed: ' + (error?.message || 'Unknown database error'), 'error');
    } finally {
        if (generateButton) {
            generateButton.disabled = false;
            generateButton.innerHTML = originalButtonHtml || '<i class="fas fa-file-pdf"></i> Generate';
        }
    }
};

// ============================================================
// GENERATE SELECTED TRANSCRIPTS (Bulk)
// ============================================================

window.generateSelectedTranscriptBatch = async function(options = {}) {
    const notify = (message, type = 'info') => {
        if (typeof window.showNotification === 'function') window.showNotification(message, type);
        else console.info('[Transcript Generator]', message);
    };
    const sb = window.sb || window.supabaseClient ||
        (window.supabase && typeof window.supabase.from === 'function' ? window.supabase : null);
    if (!sb || typeof sb.from !== 'function') {
        notify('Database connection is not ready. Refresh and try again.', 'error');
        return;
    }

    const allStudents = Array.isArray(window.transcriptData?.students) ? window.transcriptData.students : [];
    const filteredStudents = Array.isArray(window.transcriptData?.filteredStudents)
        ? window.transcriptData.filteredStudents : allStudents;
    const normalizeStudentId = value => String(value ?? '').trim().toUpperCase();
    // Read both the visible checkbox state and the maintained selection state.
    // Do not reject a valid checked student just because the search filter changed.
    const checkedIds = Array.from(document.querySelectorAll('#transcriptStudentList input[type="checkbox"]:checked'))
        .map(box => box.dataset.transcriptStudentId || box.value || '')
        .map(normalizeStudentId).filter(Boolean);
    const stateIds = (window.transcriptData?.selectedStudents || []).map(normalizeStudentId).filter(Boolean);
    const requestedIds = Array.isArray(options.studentIds)
        ? options.studentIds.map(normalizeStudentId).filter(Boolean)
        : null;
    const selectedIds = [...new Set(requestedIds
        ? requestedIds
        : options.allFiltered
            ? filteredStudents.map(s => normalizeStudentId(s.student_id)).filter(Boolean)
            : (checkedIds.length ? checkedIds : stateIds))];
    if (!selectedIds.length) {
        notify('Select one or more students, or use Generate Entire Filtered Block.', 'warning');
        return;
    }
    if (selectedIds.length > 50 && !confirm(`Generate ${selectedIds.length} transcripts? This may take a few minutes.`)) return;

    const filterContext = getTranscriptFilterContext();
    const year = filterContext.intakeYear;
    const blockFilter = filterContext.block;
    const mode = document.getElementById('transcript_scope_select')?.value || 'cumulative';
    const scopeLabel = blockFilter !== 'all'
        ? `Intake ${year} · ${blockFilter}`
        : (year !== 'all' ? `Intake ${year} · Cumulative` : 'Cumulative');
    const content = document.getElementById('transcriptPreviewContent');
    const container = document.getElementById('transcriptPreviewContainer');
    if (!content || !container) {
        notify('Transcript preview area is missing. Reload the page and try again.', 'error');
        return;
    }

    const generateButton = document.querySelector('button[onclick="generateSelectedTranscriptBatch()"]');
    const originalButtonHtml = generateButton?.innerHTML;
    if (generateButton) { generateButton.disabled = true; generateButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Preparing PDFs…'; }
    if (typeof window.showLoading === 'function') window.showLoading(`Preparing ${selectedIds.length} ${scopeLabel.toLowerCase()} transcript(s)…`);

    const originalHtml = content.innerHTML;
    const wasContainerVisible = container.style.display;
    const originalTranscriptData = window._transcriptData;
    const originalCurrentStudent = window.transcriptData.currentStudent;
    const pages = [];
    const failures = [];

    try {
        for (let index = 0; index < selectedIds.length; index++) {
            const studentId = selectedIds[index];
            try {
                let student = allStudents.find(s => normalizeStudentId(s.student_id) === studentId);
                if (!student) {
                    const sr = await sb.from('consolidated_user_profiles_table').select('*')
                        .eq('student_id', studentId).eq('role', 'student').maybeSingle();
                    if (sr.error) throw sr.error;
                    student = sr.data;
                }
                if (!student) throw new Error('Student record not found for ' + studentId);

                let marks = await fetchTranscriptMarksForStudents(sb, [studentId]);
                if (blockFilter !== 'all') {
                    marks = marks.filter(mark => transcriptMarkMatchesBlock(mark, blockFilter));
                } else {
                    const isKRCHN = isNursingProgram(student.program || 'KRCHN') && !isTVETProgram(student.program || 'KRCHN');
                    if (isKRCHN && mode.startsWith('study_year_')) {
                        marks = filterKRCHNMarksByStudyYear(marks, Number(mode.slice(-1)));
                    }
                }
                if (!marks.length) {
                    failures.push(`${studentId}: no marks found for ${scopeLabel}`);
                    continue;
                }

                // Enforce the selected block at the final rendering boundary as well
                // as at query time. A filtered request must never fall back to, or append,
                // another block for the same student.
                if (blockFilter !== 'all') {
                    marks = marks.filter(mark => transcriptMarkMatchesBlock(mark, blockFilter));
                    if (!marks.length) throw new Error('No approved and published marks match the selected block ' + blockFilter);
                }
                window.showTranscriptPreview(student, marks, scopeLabel);
                if (window._transcriptVerificationPromise) await window._transcriptVerificationPromise;
                const transcriptState = window._transcriptData;
                const renderedBlocks = [];
                const availableBlocks = transcriptState?.blockNames || [];
                const targetBlockIndex = blockFilter === 'all'
                    ? null
                    : availableBlocks.findIndex(name => normalizeKRCHNBlock(name) === normalizeKRCHNBlock(blockFilter));
                if (blockFilter !== 'all' && targetBlockIndex < 0) {
                    throw new Error('The selected block ' + blockFilter + ' was not present in the generated transcript data.');
                }
                // A specific block filter produces exactly one transcript page per student.
                // Cumulative mode retains the normal block navigation/output behaviour.
                const indexesToRender = blockFilter === 'all'
                    ? availableBlocks.map((_, i) => i)
                    : [targetBlockIndex];
                for (const blockIndex of indexesToRender) {
                    if (blockIndex !== 0 && typeof window.renderTranscriptBlock === 'function') {
                        window.renderTranscriptBlock(blockIndex);
                    }
                    const blockHtml = content.innerHTML;
                    if (blockHtml.trim()) renderedBlocks.push(blockHtml);
                }
                if (blockFilter !== 'all' && renderedBlocks.length !== 1) {
                    throw new Error('Filtered transcript generation did not produce exactly one block page.');
                }
                const html = renderedBlocks.join('');
                if (!html.trim()) throw new Error('Transcript content was empty');
                const safeName = String(student.full_name || student.student_id || studentId).replace(/[<>&"]/g, '');
                pages.push({name:safeName, id:String(student.student_id || studentId), html});
            } catch (error) {
                console.error('[Transcript Generator] Failed for student', studentId, error);
                failures.push(`${studentId}: ${error?.message || 'generation failed'}`);
            }
        }

        if (!pages.length) {
            notify(`No transcripts were generated. ${failures[0] || 'Check that marks exist for the selected year.'}`, 'warning');
            return;
        }

        // One print-ready document, with a page break per student. Users can choose
        // Save as PDF in the browser print dialog, producing a single combined PDF.
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            notify('Allow pop-ups for this site to create the combined PDF.', 'error');
            return;
        }
        printWindow.document.open();
        printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>NCHSM ${scopeLabel} Transcripts</title>
          <style>
            ${window._superadminTranscriptStyles || ''}
            /* The only bulk-specific rule: one complete Academic-JS transcript per A4 page. */
            .bulk-transcript { display:block; page-break-after:always; break-after:page; }
            .bulk-transcript:last-child { page-break-after:auto; break-after:auto; }
            @media print {
              .bulk-transcript { page-break-after:always; break-after:page; }
              .bulk-transcript:last-child { page-break-after:auto; break-after:auto; }
            }
          </style></head><body>
          ${pages.map(p=>`<section class="bulk-transcript">${p.html}</section>`).join('')}
          <script>
            window.onload = function () {
              const images = Array.from(document.images);
              Promise.all(images.map(img => img.complete ? Promise.resolve() : new Promise(resolve => {
                img.onload = img.onerror = resolve;
              }))).then(() => setTimeout(() => window.print(), 250));
            };
          <\/script>
          </body></html>`);
        printWindow.document.close();
        notify(`Prepared ${pages.length} transcript(s) in one print-ready document.${failures.length ? ' Skipped ' + failures.length + ' student(s); see console for details.' : ''} Choose “Save as PDF” in the print dialog.`, failures.length ? 'warning' : 'success');
    } catch (error) {
        console.error('[Transcript Generator] Bulk generation failed:', error);
        notify('Bulk transcript generation failed: ' + (error?.message || 'Unknown error'), 'error');
    } finally {
        content.innerHTML = originalHtml;
        container.style.display = wasContainerVisible;
        window._transcriptData = originalTranscriptData;
        window.transcriptData.currentStudent = originalCurrentStudent;
        if (typeof window.hideLoading === 'function') window.hideLoading();
        if (generateButton) { generateButton.disabled = false; generateButton.innerHTML = originalButtonHtml || '<i class="fas fa-file-pdf"></i> Generate Selected'; }
    }
};

// ============================================================
// SHOW TRANSCRIPT PREVIEW - WITH BLOCK NAVIGATION
// Academic Registrar & Director signatures ONLY
// ============================================================


// ------------------------------------------------------------
// Transcript issuance analytics (registry-backed; no fabricated totals)
// ------------------------------------------------------------
window.loadTranscriptIssuanceAnalytics = async function() {
    const ids = ['transcriptIssuedCount','transcriptStudentCount','transcriptQrCount','transcriptNumberCount'];
    const setMessage = (message, error=false) => {
        const node = document.getElementById('transcriptAnalyticsMessage');
        if (node) { node.textContent = message; node.style.color = error ? '#b91c1c' : '#64748b'; }
    };
    const body = document.getElementById('transcriptIssuanceRows');
    if (!body) return;
    body.innerHTML = '<tr><td colspan="7" style="padding:18px;text-align:center;color:#64748b;">Loading transcript issuance records…</td></tr>';
    const sb = window.sb || window.supabaseClient ||
        (window.supabase && typeof window.supabase.from === 'function' ? window.supabase : null);
    if (!sb || !sb.auth || typeof sb.auth.getSession !== 'function') {
        body.innerHTML = '<tr><td colspan="7">Authentication session unavailable.</td></tr>';
        setMessage('Sign in again and refresh.', true); return;
    }
    try {
        const { data: sessionData, error: sessionError } = await sb.auth.getSession();
        if (sessionError) throw sessionError;
        const session = sessionData?.session;
        if (!session?.access_token) throw new Error('Your session has expired. Sign in again.');
        const config = window.APP_CONFIG || {};
        const supabaseUrl = config.SUPABASE_URL || config.supabaseUrl || sb.supabaseUrl;
        const anonKey = config.SUPABASE_ANON_KEY || config.SUPABASE_ANON || config.supabaseAnonKey;
        if (!supabaseUrl || !anonKey) throw new Error('Supabase public configuration is missing.');
        const baseUrl = String(supabaseUrl).endsWith('/') ? String(supabaseUrl).slice(0, -1) : String(supabaseUrl);
        const response = await fetch(baseUrl + '/functions/v1/transcript-registry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': anonKey, 'Authorization': 'Bearer ' + session.access_token },
            body: JSON.stringify({ action: 'list' })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'Registry request failed (' + response.status + ').');
        const rows = Array.isArray(payload.records) ? payload.records : [];
        const uniqueStudents = new Set(rows.map(r => String(r.student_id || r.student_name || '').trim()).filter(Boolean));
        const uniqueNumbers = new Set(rows.map(r => String(r.transcript_number || '').trim()).filter(Boolean));
        const put = (id, value) => { const node = document.getElementById(id); if (node) node.textContent = String(value); };
        put('transcriptIssuedCount', rows.length);
        put('transcriptStudentCount', uniqueStudents.size);
        put('transcriptQrCount', rows.filter(r => !!r.token).length);
        put('transcriptNumberCount', uniqueNumbers.size);
        if (!rows.length) {
            body.innerHTML = '<tr><td colspan="7">No transcript records found in the verification registry.</td></tr>';
            setMessage('Showing 0 records.'); return;
        }
        const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
        body.innerHTML = rows.map(r => {
            const token = String(r.token || '');
            const verifyUrl = token ? new URL('transcripts', window.location.origin).href + '?token=' + encodeURIComponent(token) : '';
            const issued = r.issued_at ? new Date(r.issued_at).toLocaleString() : '—';
            const qrCell = token ? '<a href="' + escape(verifyUrl) + '" target="_blank" rel="noopener noreferrer">Open QR verification</a>' : '<span>No token</span>';
            return '<tr><td>' + escape(r.student_name || '—') + '</td><td>' + escape(r.student_id || '—') + '</td><td>' + escape(r.program || '—') + '</td><td>' + escape(r.transcript_number || 'Not assigned') + (r.transcript_block && r.transcript_block !== 'ALL' ? '<div>' + escape(r.transcript_block) + '</div>' : '') + '</td><td>' + qrCell + '</td><td>' + escape(issued) + '</td><td>' + escape(r.status || 'issued') + '</td></tr>';
        }).join('');
        setMessage('Showing ' + rows.length + ' registry records. Access is restricted to authenticated Super Admins.');
    } catch (error) {
        console.error('[Transcript analytics] Registry request failed:', error);
        body.innerHTML = '<tr><td colspan="7">Unable to load transcript records.</td></tr>';
        setMessage(error?.message || 'Unable to access transcript registry.', true);
    }
};
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('transcriptIssuanceAnalytics')) window.loadTranscriptIssuanceAnalytics();
});

window.showTranscriptPreview = function(student, marks, year) {
    // Only approved and published marks may appear on an official transcript.
    marks = getEffectiveUnitMarks((Array.isArray(marks) ? marks : []).filter(m => m && m.published === true && String(m.approval_status || '').trim().toLowerCase() === 'approved'));
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
    // Normalize KRCHN labels and order them by programme progression.
    if (isNursing) {
        const normalizedGroups = {};
        Object.entries(groupedMarks).forEach(([label, rows]) => {
            const normalizedLabel = normalizeKRCHNBlock(label);
            normalizedGroups[normalizedLabel] = (normalizedGroups[normalizedLabel] || []).concat(rows);
        });
        Object.keys(groupedMarks).forEach(key => delete groupedMarks[key]);
        Object.assign(groupedMarks, normalizedGroups);
    }
    const progressionOrder = isTVET ? getTVETTermStructure(program) : KRCHN_BLOCKS;
    const blockNames = Object.keys(groupedMarks).sort((a, b) => {
        const ai = progressionOrder.indexOf(a);
        const bi = progressionOrder.indexOf(b);
        if (ai < 0 && bi < 0) return a.localeCompare(b);
        if (ai < 0) return 1;
        if (bi < 0) return -1;
        return ai - bi;
    });
    
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
    window.renderTranscriptBlock(0);
    container.style.display = 'block';
};

// ============================================================
// PRINT TRANSCRIPT DOCUMENT - A4 CLEAN
// ============================================================

window.printTranscriptDocument = async function() {
    const content = document.getElementById('transcriptPreviewContent');
    if (!content) return;

    // Wait for the authenticated registry request and QR image before taking
    // the HTML snapshot; otherwise the print window captures an empty QR slot.
    if (window._transcriptVerificationPromise) {
        try { await window._transcriptVerificationPromise; }
        catch (verificationError) { console.error('[Transcript Print] Verification was not ready:', verificationError); }
    }
    const qrImage = content.querySelector('#transcriptVerificationQr');
    if (qrImage && qrImage.dataset.ready !== 'true') {
        console.warn('[Transcript Print] QR is unavailable:', qrImage.title || qrImage.alt);
    }
    const transcriptHtml = content.innerHTML;
    const data = window._transcriptData;
    const studentName = data?.student?.full_name || 'Student';
    const studentId = data?.student?.student_id || 'N/A';
    const blockName = data?.blockNames?.[data.currentBlockIndex] || 'Transcript';
    
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
        alert('Please allow popups to print the transcript.');
        return;
    }
    
    printWindow.document.open();
    printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Provisional Academic Transcript - ${escapeHtml(studentName)}</title>
<style>${window._superadminTranscriptStyles || ''}
@media print {
  @page { size: A4 portrait; margin: 5mm; }
  html, body { background:#fff!important; margin:0!important; padding:0!important; }
  .no-print, .transcript-admin-actions { display:none!important; }
}
</style>
</head>
<body>${transcriptHtml}
<script>
window.onload = async function () {
  const qr = document.getElementById('transcriptVerificationQr');
  const deadline = Date.now() + 20000;
  while (qr && qr.dataset.ready !== 'true' && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  const imgs = Array.from(document.images);
  await Promise.all(imgs.map(img => img.complete ? Promise.resolve() : new Promise(resolve => {
    img.onload = img.onerror = resolve; setTimeout(resolve, 2500);
  })));
  if (document.fonts?.ready) await document.fonts.ready;
  window.print();
};
<\/script>
</body></html>`);

};
// ============================================================
// NAVIGATE BLOCKS
// ============================================================

window.navigateBlock = function(direction) {
    const data = window._transcriptData;
    if (!data) return;
    
    const newIndex = data.currentBlockIndex + direction;
    if (newIndex < 0 || newIndex >= data.blockNames.length) return;
    
    window.renderTranscriptBlock(newIndex);
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
// GET PROGRAM BLOCKS - FIXED PROGRESSION LOGIC
// ============================================================

function getProgramBlocks(programCode) {
    const code = String(programCode).toUpperCase().trim();
    
    if (code === 'KRCHN' || code === 'NURSING') {
        return KRCHN_BLOCKS;
    }
    
    const type = getProgramType(programCode);
    if (type === 'tvet_certificate' || type === 'tvet_artisan') {
        return TVET_TERMS_CERTIFICATE;
    }
    if (type === 'tvet_diploma') {
        return TVET_TERMS_DIPLOMA;
    }
    
    return KRCHN_BLOCKS;
}

// ============================================================
// RENDER A SPECIFIC BLOCK - FIXED PROGRESSION LOGIC
// A4 Ready - No outside text
// Clean header with proper spacing
// ============================================================

window.renderTranscriptBlock = function(index) {
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
        const score = getEffectiveMarkScore(m);
        const gradeInfo = calculateOfficialGrade(score === null ? 0 : score, program);
        const isPassing = score !== null && score >= passMark;
        const unitCode = getUnitCode(m.subject_name || m.unit_name);
        const rawCredits = Number(m.credits || m.credit_hours || m.creditHours);
        const credits = Number.isFinite(rawCredits) && rawCredits > 0 ? rawCredits : GRADE_CONFIG.creditHours;
        const pointsEarned = gradeInfo.points * credits;
        const hasRetake = Number(m.retake_count) > 0 || (m.retake_score !== null && m.retake_score !== undefined) || Boolean(m.retake_status);
        
        if (hasRetake) retakeCount++;
        if (score !== null) {
            if (isPassing) { blockPassed++; passedUnits++; } else { failedUnits++; }
            totalScore += score; scoredCount++; totalPoints += pointsEarned; totalCredits += credits; blockPoints += pointsEarned; blockCredits += credits;
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
                    ${score === null ? 'PENDING' : gradeInfo.grade}
                </td>
                <td style="padding: 6px 12px; text-align: center; font-size: 11px; font-weight: 600; color: ${gradeInfo.color}; border: 1px solid #d1d5db;">
                    ${score === null ? '—' : pointsEarned.toFixed(1)}
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
    // 🎯 YEAR OF STUDY - ACADEMIC YEAR RANGE CALCULATION
    // ============================================================
    
    const intakeYear = parseInt(student.intake_year) || parseInt(year) || 2025;
    
    let yearOffset = 0;
    let yearLabel = 'Year 1';
    let yearOfStudy = 'N/A';
    
    const programCode = String(program).toUpperCase().trim();
    const isNursing = programCode === 'KRCHN' || programCode === 'NURSING';
    
    const tvetType = getProgramType(programCode);
    const isTVETCert = tvetType === 'tvet_certificate';
    const isTVETDiploma = tvetType === 'tvet_diploma';
    const isTVETArtisan = tvetType === 'tvet_artisan';
    
    if (isNursing) {
        const nursingMapping = {
            'Introductory': { year: 0, label: 'Year 1' },
            'Block 1': { year: 0, label: 'Year 1' },
            'Block 2': { year: 1, label: 'Year 2' },
            'Block 3': { year: 1, label: 'Year 2' },
            'Block 4': { year: 2, label: 'Year 3' },
            'Block 5': { year: 2, label: 'Year 3' },
            'Block 6': { year: 2, label: 'Year 3' },
            'FQE': { year: 2, label: 'Year 3' },
            'Final': { year: 2, label: 'Year 3' }
        };
        
        if (nursingMapping[blockName]) {
            yearOffset = nursingMapping[blockName].year;
            yearLabel = nursingMapping[blockName].label;
            const startYear = intakeYear + yearOffset;
            const endYear = startYear + 1;
            yearOfStudy = `${startYear}/${endYear}`;
        } else {
            const numMatch = blockName.match(/\d+/);
            if (numMatch) {
                const num = parseInt(numMatch[0]);
                if (num <= 1) { yearOffset = 0; yearLabel = 'Year 1'; }
                else if (num <= 3) { yearOffset = 1; yearLabel = 'Year 2'; }
                else { yearOffset = 2; yearLabel = 'Year 3'; }
                const startYear = intakeYear + yearOffset;
                const endYear = startYear + 1;
                yearOfStudy = `${startYear}/${endYear}`;
            } else {
                yearOfStudy = `${intakeYear}/${intakeYear + 1}`;
                yearLabel = 'Year 1';
            }
        }
    } else if (isTVETCert || isTVETArtisan) {
        const yearMatch = blockName.match(/Year\s+(\d+)/i);
        if (yearMatch) {
            const yearNum = parseInt(yearMatch[1]);
            yearOffset = yearNum - 1;
            yearLabel = `Year ${yearNum}`;
            const startYear = intakeYear + yearOffset;
            const endYear = startYear + 1;
            yearOfStudy = `${startYear}/${endYear}`;
        } else {
            yearOfStudy = `${intakeYear}/${intakeYear + 1}`;
            yearLabel = 'Year 1';
        }
    } else if (isTVETDiploma) {
        const yearMatch = blockName.match(/Year\s+(\d+)/i);
        if (yearMatch) {
            const yearNum = parseInt(yearMatch[1]);
            yearOffset = yearNum - 1;
            yearLabel = `Year ${yearNum}`;
            const startYear = intakeYear + yearOffset;
            const endYear = startYear + 1;
            yearOfStudy = `${startYear}/${endYear}`;
        } else {
            yearOfStudy = `${intakeYear}/${intakeYear + 1}`;
            yearLabel = 'Year 1';
        }
    } else {
        const yearMatch = blockName.match(/Year\s+(\d+)/i);
        if (yearMatch) {
            const yearNum = parseInt(yearMatch[1]);
            yearOffset = yearNum - 1;
            yearLabel = `Year ${yearNum}`;
            const startYear = intakeYear + yearOffset;
            const endYear = startYear + 1;
            yearOfStudy = `${startYear}/${endYear}`;
        } else {
            const numMatch = blockName.match(/\d+/);
            if (numMatch) {
                const num = parseInt(numMatch[0]);
                if (num <= 1) { yearOffset = 0; yearLabel = 'Year 1'; }
                else if (num <= 3) { yearOffset = 1; yearLabel = 'Year 2'; }
                else { yearOffset = 2; yearLabel = 'Year 3'; }
                const startYear = intakeYear + yearOffset;
                const endYear = startYear + 1;
                yearOfStudy = `${startYear}/${endYear}`;
            } else {
                yearOfStudy = `${intakeYear}/${intakeYear + 1}`;
                yearLabel = 'Year 1';
            }
        }
    }

    // ============================================================
    // 🎯 PROGRESSION MESSAGE - FIXED LOGIC
    // ============================================================
    const currentBlockIndex = index;
    const nextBlockIndex = currentBlockIndex + 1;
    const hasNextBlock = nextBlockIndex < blockNames.length;
    const nextBlockName = hasNextBlock ? blockNames[nextBlockIndex] : null;
    
    // Get the complete program block sequence
    const programBlocks = getProgramBlocks(program);
    
    // Find the index of the current block in the program sequence
    const currentBlockProgramIndex = programBlocks.indexOf(blockName);
    
    // Check if all blocks in the program have marks
    const allBlocksPresent = programBlocks.every(block => groupedMarks[block] !== undefined);
    
    // Check if this is the LAST block in the program sequence AND all blocks are present
    const isLastProgramBlock = currentBlockProgramIndex === programBlocks.length - 1;
    const isProgramComplete = allBlocksPresent && isLastProgramBlock;
    
    // Check if there are more program blocks that don't have marks yet
    const hasMissingSubsequentBlocks = programBlocks.some((block, idx) => 
        idx > currentBlockProgramIndex && groupedMarks[block] === undefined
    );
    
    let progressionMessage = '';
    let messageColor = '#64748b';
    
    if (allPassed && hasNextBlock) {
        // Normal progression to next block/term that has marks
        messageColor = '#059669';
        progressionMessage = `✅ Passed — Proceed to ${nextBlockName} · ${yearLabel}`;
    } else if (allPassed && isProgramComplete) {
        // ALL blocks in the program are completed AND this is the last block
        messageColor = '#4C1D95';
        progressionMessage = `🎓 ALL BLOCKS COMPLETED — Ready for Graduation · ${yearLabel}`;
    } else if (allPassed && !hasNextBlock && !isProgramComplete && !hasMissingSubsequentBlocks) {
        // No more blocks with marks, but program has more blocks that should exist
        messageColor = '#f59e0b';
        progressionMessage = `⚠️ ${blockName} completed — Waiting for results in subsequent blocks · Contact Registrar`;
    } else if (allPassed && !hasNextBlock && !isProgramComplete && hasMissingSubsequentBlocks) {
        // Passed current block, but there are more program blocks without marks
        const nextProgramBlock = programBlocks[currentBlockProgramIndex + 1] || 'next block';
        messageColor = '#059669';
        progressionMessage = `✅ Passed — Proceed to ${nextProgramBlock} (results pending) · ${yearLabel}`;
    } else if (allPassed && hasNextBlock === false && isLastProgramBlock === false && allBlocksPresent === false) {
        // Passed but missing some blocks in the middle
        messageColor = '#f59e0b';
        progressionMessage = `⚠️ ${blockName} passed — Missing results for subsequent blocks · Contact Registrar`;
    } else if (hasFailed && blockPassed > 0) {
        const failedNames = blockMarks
            .filter(m => (m.final_score || 0) < passMark && (m.final_score || 0) > 0)
            .map(m => m.subject_name)
            .join(', ');
        messageColor = '#dc2626';
        if (failedNames) {
            progressionMessage = `❌ ${failedUnits} unit(s) failed: ${failedNames} — Retake required · ${yearLabel}`;
        } else {
            progressionMessage = `❌ ${failedUnits} unit(s) failed — Retake required · ${yearLabel}`;
        }
    } else if (blockPassed === 0 && blockTotal > 0) {
        messageColor = '#dc2626';
        progressionMessage = `❌ Academic intervention required — Contact Registrar · ${yearLabel}`;
    } else {
        progressionMessage = `⏳ Results pending · ${yearLabel}`;
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

    // Navigation buttons
    const prevBlock = index > 0 ? blockNames[index - 1] : null;
    const nextBlock = index < blockNames.length - 1 ? blockNames[index + 1] : null;
    
    let navHtml = '';
    if (blockNames.length > 1) {
        navHtml = `
            <div style="display: flex; justify-content: center; gap: 15px; margin-top: 14px; padding-top: 10px; border-top: 1px solid #e5e7eb; flex-wrap: wrap;">
                ${prevBlock ? `
                    <button onclick="window.navigateBlock(-1)" style="background: #0A3D62; color: white; border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 12px; transition: all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
                        ← Previous: ${escapeHtml(prevBlock)}
                    </button>
                ` : ''}
                <span style="color: #64748b; font-size: 12px; padding: 8px 12px; background: #f1f5f9; border-radius: 20px;">
                    ${index + 1} of ${blockNames.length}
                </span>
                ${nextBlock ? `
                    <button onclick="window.navigateBlock(1)" style="background: #0A3D62; color: white; border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 12px; transition: all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
                        Next: ${escapeHtml(nextBlock)} →
                    </button>
                ` : `
                    <button style="background: #4C1D95; color: white; border: none; padding: 8px 20px; border-radius: 6px; cursor: default; font-weight: 600; font-size: 12px;">
                        Final Block
                    </button>
                `}
            </div>
        `;
    }

    // Build full official transcript HTML for current block
    // PROVISIONAL TEMPLATE SYNC: academic-reports.js
    // Keep the Super Admin renderer on the exact student-facing transcript layout.
    const overallGrade = overallGradeInfo.grade || 'PENDING';
    const passRate = blockTotal > 0 ? Math.round((blockPassed / blockTotal) * 100) : 0;
    const transcriptAdmission = student.admission_number || student.student_id || student.user_id || 'N/A';
    const academicYearLabel = yearOfStudy || (intakeYear + '/' + (intakeYear + 1));
    const marksTableRows = blockMarks.map((m, rowIndex) => {
        const score = getEffectiveMarkScore(m);
        const gradeInfo = calculateOfficialGrade(score === null ? 0 : score, program);
        const creditsRaw = Number(m.credits || m.credit_hours || m.creditHours);
        const credits = Number.isFinite(creditsRaw) && creditsRaw > 0 ? creditsRaw : GRADE_CONFIG.creditHours;
        const points = score === null ? '—' : (gradeInfo.points * credits).toFixed(1);
        const unitCode = getUnitCode(m.subject_name || m.unit_name);
        const unitName = m.subject_name || m.unit_name || 'N/A';
        const status = score === null ? 'PENDING' : (score >= passMark ? (score >= 75 ? 'DISTINCTION' : score >= 65 ? 'CREDIT' : 'PASS') : 'FAIL');
        const retakeMark = Number(m.retake_count) > 0 || m.retake_score != null || Boolean(m.retake_status);
        return `<tr>
            <td style="text-align:center;">${rowIndex + 1}</td>
            <td>${escapeHtml(unitCode)}</td>
            <td><strong>${escapeHtml(unitName)}</strong>${retakeMark ? '<span style="color:#94a3b8;margin-left:4px;">☆</span>' : ''}</td>
            <td style="text-align:center;font-weight:900;">${score === null ? 'PENDING' : escapeHtml(gradeInfo.grade)}</td>
            <td style="text-align:center;font-weight:900;">${points}</td>
            <td style="text-align:center;font-weight:800;">${status}</td>
        </tr>`;
    }).join('');
    const transcriptProgramName = student.program || program;
    const academicYear = academicYearLabel;
    const transcriptIntakeYear = student.intake_year || intakeYear;
    const transcriptCurrentBlock = blockName;
    const transcriptResultsHeading = `End of ${blockName} Results`;
    const tableRows = marksTableRows;
    const gradingScaleHTML = `<table><thead><tr><th>Grade</th><th>Range</th><th>Points</th><th>Remarks</th></tr></thead><tbody>${gradingScaleHtml}</tbody></table>`;
    const grade = overallGrade;
    const transcriptSchool = 'Nakuru College of Health Sciences & Management';
    const normalizedProgramCode = String(student.program || program || '').trim().toUpperCase();
    const isKRCHNStudent = normalizedProgramCode === 'KRCHN' || normalizedProgramCode === 'NURSING';
    const principalSignatureLabel = isKRCHNStudent
        ? 'Principal — School of Nursing'
        : 'Principal — School of TVET';
    const hodSignatureLabel = isKRCHNStudent
        ? 'Head of Department (HOD) — School of Nursing'
        : 'Head of Department (HOD) — ' + String(student.program || program || 'Programme').trim();
    const profilePicture = student.passport_photo || student.profile_picture || student.photo_url || '';
    const profilePictureHTML = profilePicture ? `<div style="text-align:center;margin-right:12px;flex-shrink:0;"><img src="${escapeHtml(profilePicture)}" alt="Student Photo" class="student-photo" onerror="this.style.display='none'"></div>` : '';
    const transcriptStyles = String.raw`* { margin: 0; padding: 0; box-sizing: border-box; }
        @page { size: A4 portrait; margin: 6mm; }
        body { font-family: 'Times New Roman', 'Georgia', serif; background: #ffffff; font-size: 10px; margin: 0; padding: 10px; color: #1e293b; }
        .container { box-sizing: border-box; max-width: none; width: 100%; margin: 0 auto; padding: 7px 8px; background: #ffffff; border: 2px solid #1E559B; border-radius: 6px; box-shadow: none; }
        /* Official NCHSM crest palette: institutional blue with the crest's red cross as an accent. */
        .container { border-top: 4px solid #1E559B; }
        .header { border-bottom: 3px double #D62828; }
        .header .subtitle { border-bottom: 3px solid #D62828; }
        .student-info-wrapper { border-left: 4px solid #D62828; }
        .summary-card:nth-child(even) { border-top-color: #D62828; }
        .semester-results-title { border-left: 4px solid #D62828; }
        thead th { border-bottom: 2px solid #D62828; }
        .grading-scale-table .title { border-bottom: 2px solid #D62828; }

        /* Subtle institutional watermark: recognizable, never competing with marks or unit names. */
        .container { position: relative; isolation: isolate; overflow: hidden; }
        .container::before {
            content: "";
            position: absolute;
            inset: 0;
            z-index: 0;
            pointer-events: none;
            background-image: url("https://nchsm.co.ke/images/Logo_NCHSM.png");
            background-repeat: no-repeat;
            background-position: center 53%;
            background-size: 30% auto;
            opacity: 0.045;
        }
        .container > * { position: relative; z-index: 1; }
        .container .transcript-top { z-index: 2; }

        .transcript-top { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) 150px; align-items: start; column-gap: 8px; width: 100%; padding-top: 1px; }
        .transcript-top > .header { grid-column: 1; grid-row: 1; width: 100%; min-width: 0; box-sizing: border-box; padding-right: 0; }
        .transcript-verification-column { grid-column: 2; grid-row: 1; display: flex; flex-direction: column; align-items: flex-end; justify-content: flex-start; gap: 6px; min-width: 0; position: relative; z-index: 3; }
        .transcript-verification-column > .transcript-generation-number { position: relative; display: none; width: 150px; min-width: 150px; margin: 0; padding: 3px 0 5px; border: 0; border-radius: 0; background: #fff; color: #493638; font-family: Arial, Helvetica, sans-serif; line-height: 1; text-align: center; box-shadow: none; }
        .transcript-verification-column > .transcript-generation-number .number-label { display: block; margin-bottom: 5px; color: #475569; font-family: Arial, sans-serif; font-size: 7px; letter-spacing: .8px; font-weight: 700; white-space: normal; }
        .transcript-number-prefix { display: inline-block; color: #493638; font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 1.2; font-weight: 300; letter-spacing: -.25px; white-space: nowrap; }
        .transcript-number-sequence { display: inline-block; color: #493638; font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 1; font-weight: 300; letter-spacing: -.45px; white-space: nowrap; }
        .transcript-verification-column > .verification-qr { position: relative; width: 88px; min-height: 90px; margin: 0; }
        .verification-qr { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; gap: 2px; width: 88px; padding: 4px; border: 1px solid #1E559B; border-radius: 3px; background: #fff; font-size: 7px; font-weight: 800; color: #1E559B; }
        .verification-qr img { display: block; width: 76px; height: 76px; min-width: 76px; min-height: 76px; object-fit: contain; image-rendering: pixelated; }
        .header { text-align: center; border-bottom: 3px double #1E559B; padding-bottom: 5px; margin-bottom: 6px; }
        .header-top { display: flex; align-items: center; justify-content: flex-start; gap: 10px; width: 100%; min-width: 0; overflow: hidden; }
        .header-top img { display: block; flex: 0 0 62px; width: 62px; height: 62px; max-height: 62px; max-width: 62px; object-fit: contain; object-position: center; }
        .header-top > div { flex: 1 1 auto; min-width: 0; text-align: center; }
        .header .school { font-size: 16px; line-height: 1.2; font-weight: 800; color: #1E559B; font-family: 'Georgia', serif; white-space: normal; overflow-wrap: break-word; word-break: normal; }
        .header .motto { font-size: 8px; line-height: 1.25; color: #64748b; font-style: italic; }
        .header .subtitle { display: inline-block; font-size: 17px; color: #ffffff; background: #1E559B; font-weight: 800; margin-top: 10px; padding: 7px 28px; border-radius: 4px; letter-spacing: 2px; font-family: 'Georgia', serif; }
        .header .date { font-size: 8px; color: #94a3b8; margin-top: 2px; }
        .student-info-wrapper { display: flex; align-items: center; gap: 10px; margin: 5px 0 7px; padding: 7px 9px; background: #f1f6fb; border-radius: 8px; border: 1px solid #cbdbea; border-left: 5px solid #1E559B; }
        .student-info { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; flex: 1; }
        .student-info .field { display: flex; flex-direction: column; }
        .student-info .label { font-size: 9px; color: #52677a; text-transform: uppercase; letter-spacing: 0.7px; font-weight: 800; }
        .student-info .value { font-weight: 800; font-size: 12px; line-height: 1.35; color: #1E559B; margin-top: 3px; overflow-wrap: anywhere; }
        .student-photo { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 3px solid #1E559B; padding: 2px; background: white; flex-shrink: 0; }
        .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 14px 0; }
        .summary-card { background: linear-gradient(180deg,#ffffff,#f3f7fb); border-radius: 8px; padding: 12px 10px; text-align: center; border: 1px solid #cbdbea; border-top: 4px solid #1E559B; }
        .summary-card .value { font-size: 24px; line-height: 1.2; font-weight: 800; color: #1E559B; }
        .summary-card .label { font-size: 9px; color: #52677a; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 800; margin-top: 3px; }
        table { width: 100%; border-collapse: collapse; margin: 6px 0 8px 0; font-size: 8px; border: 1px solid #d1d5db; }
        .semester-results-title { margin: 5px 0 0; padding: 6px 10px; background: #1E559B; color: #ffffff; border-radius: 7px 7px 0 0; font-size: 11px; line-height: 1.15; font-weight: 800; letter-spacing: 0.35px; text-transform: uppercase; }
        table.semester-results-table { margin: 0 0 5px; font-size: 9px; table-layout: fixed; }
        table.semester-results-table thead th { padding: 5px 4px; font-size: 8px; line-height: 1.1; }
        table.semester-results-table tbody td { padding: 4px 4px; font-size: 9px; line-height: 1.15; }
        /* Unit codes and grade points must always print in bold black, including PDF export. */
        table.semester-results-table tbody td:nth-child(2),
        table.semester-results-table tbody td:nth-child(5),
        table.semester-results-table tbody td:nth-child(2) *,
        table.semester-results-table tbody td:nth-child(5) * {
            color: #000000 !important;
            font-weight: 900 !important;
            -webkit-text-fill-color: #000000 !important;
        }
        table.semester-results-table tbody td:nth-child(5) { text-align: center; }
        table.semester-results-table tbody td:nth-child(2) span,
        table.semester-results-table tbody td:nth-child(5) span {
            color: #000000 !important;
            background: transparent !important;
            font-weight: 900 !important;
            padding: 0 !important;
            border-radius: 0 !important;
        }
        thead th { background: #1E559B; color: white; padding: 10px 12px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.7px; font-weight: 800; border: 1px solid #1E559B; }
        tbody td { padding: 9px 12px; border: 1px solid #d1d5db; font-size: 10px; line-height: 1.35; }
        .chart-container { margin: 10px 0 12px; padding: 12px 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #cbdbea; }
        .chart-container .title { font-weight: 700; font-size: 8px; color: #1E559B; text-align: center; margin-bottom: 4px; }
        .chart-container canvas { width: 100% !important; height: 145px !important; max-height: 145px; }
        .transcript-lower-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: start; gap: 10px; margin: 8px 0; }
        .transcript-lower-grid > * { min-width: 0; }
        .academic-summary-panel { margin: 0; padding: 10px 12px; background: #f8fafc; border: 1px solid #cbdbea; border-radius: 8px; }
        .academic-summary-title { margin: 0 0 6px; color: #1E559B; text-align: center; font-size: 11px; font-weight: 800; }
        .transcript-lower-grid .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 5px; margin: 0; }
        .transcript-lower-grid .summary-card { padding: 7px 4px; border-radius: 5px; border-top-width: 2px; }
        .transcript-lower-grid .summary-card .value { font-size: 17px; line-height: 1.1; }
        .transcript-lower-grid .summary-card .label { font-size: 7px; letter-spacing: .2px; }
        .grading-scale-table { margin: 0; padding: 10px 14px; background: #f8fafc; border-radius: 8px; border: 1px solid #cbdbea; }
        /* Transcript section and grading headings: consistently bold black for clear printing. */
        .semester-results-title,
        .grading-scale-table .title,
        .academic-summary-title {
            background: #ffffff !important;
            font-weight: 900 !important;
            text-shadow: none !important;
        }
        /* Results section heading uses the NCHSM logo blue for brand consistency. */
        .semester-results-title {
            color: #1E559B !important;
            -webkit-text-fill-color: #1E559B !important;
            border-left: 3px solid #1E559B !important;
            border-bottom: 1px solid #1E559B !important;
            padding: 5px 8px !important;
        }
        /* Grading scale and academic summary headings remain bold black. */
        .grading-scale-table .title,
        .academic-summary-title {
            color: #000000 !important;
            -webkit-text-fill-color: #000000 !important;
        }
        .grading-scale-table .title {
            font-size: 11px;
            text-align: center;
            margin: 0 0 8px;
            padding: 6px 8px;
            border-bottom: 1px solid #000000;
            border-radius: 0;
        }
        .grading-scale-table table { width: 100%; border-collapse: collapse; font-size: 7px; margin: 0 auto; border: 1px solid #000000; }
        .grading-scale-table th {
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-text-fill-color: #000000 !important;
            font-weight: 900 !important;
            padding: 4px 8px;
            text-align: center;
            font-size: 7px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border: 1px solid #000000;
        }
        .grading-scale-table td { color: #000000 !important; -webkit-text-fill-color: #000000 !important; }
        .semester-results-table thead th {
            background: #ffffff !important;
            color: #1E559B !important;
            -webkit-text-fill-color: #1E559B !important;
            font-weight: 900 !important;
            border: 1px solid #1E559B !important;
        }
        .grading-scale-table td { padding: 4px 8px; text-align: center; border: 1px solid #d1d5db; font-size: 7px; }
                .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin: 8px 0 6px 0; padding-top: 8px; border-top: 1px solid #e2e8f0; min-height: 62px; }
        .signature-box { text-align: center; }
        .signature-box .line { border-bottom: 3px solid #1e293b; width: 155px; height: 24px; margin: 0 auto 3px auto; }
        .signature-box .label { font-size: 8px; color: #1e293b; text-transform: uppercase; letter-spacing: 0.35px; font-weight: 900; }
        .signature-box .date { font-weight: 800; color: #1e293b; }
        .signature-box .name { font-weight: 600; font-size: 10px; color: #1E559B; }
        .footer { text-align: center; margin-top: 4px; padding-top: 4px; border-top: 1px solid #1E559B; font-size: 8px; line-height: 1.2; color: #52677a; }
        .footer strong { color: #1E559B; }
        .no-print { text-align: center; margin-top: 8px; }
        .no-print button { padding: 5px 18px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 10px; }
        .no-print .btn-print { background: #1E559B; color: white; }
        .no-print .btn-close { background: #e2e8f0; color: #475569; margin-left: 6px; }
        @media screen and (max-width: 600px) {
            body { font-size: 14px; padding: 8px; }
            .container { width: 100%; max-width: 100%; padding: 12px 10px; }
            .student-info { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
            .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
            .summary-card .value { font-size: 22px; }
            table.semester-results-table { table-layout: fixed; font-size: 13px; }
            table.semester-results-table thead th { font-size: 13px !important; padding: 11px 6px !important; }
            table.semester-results-table tbody td { font-size: 13px !important; line-height: 1.5 !important; padding: 12px 6px !important; }
            .chart-container canvas { height: 160px !important; max-height: 160px; }
        }
        /* Print the same transcript layout shown in preview; only remove controls and outer preview chrome. */
        @media print {
            @page { size: A4 portrait; margin: 5mm; }
            html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; min-height: 0 !important; height: auto !important; }
            .transcript-preview-toolbar, .no-print, .btn-print, .btn-close { display: none !important; }
            .container {
                width: 100% !important;
                max-width: none !important;
                /* Fill the printable A4 height even when a block has only a few units. */
                min-height: 285mm !important;
                height: auto !important;
                margin: 0 !important;
                box-shadow: none !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: space-between !important;
                gap: 5mm !important;
            }
            .container > .transcript-top,
            .container > .student-info-wrapper,
            .container > .semester-results-title,
            .container > .semester-results-table,
            .container > .transcript-lower-grid,
            .container > .signatures,
            .container > .footer {
                flex-shrink: 0 !important;
            }
            .container > .semester-results-table { width: 100% !important; }
            .container > .footer { margin-top: auto !important; }
            .container > .transcript-admin-actions { display: none !important; }
        }
`;
    window._superadminTranscriptStyles = transcriptStyles;
    const transcriptHtml = `
<style>${transcriptStyles}</style>
<div class="container">
    <div class="transcript-top">
        <div class="header">
            <div class="header-top">
                <img src="https://nchsm.co.ke/images/Logo_NCHSM.png" alt="NCHSM Logo" crossorigin="anonymous">
                <div><div class="school">NAKURU COLLEGE OF HEALTH SCIENCES AND MANAGEMENT</div><div class="motto">"Excellence in Health Sciences Education"</div></div>
            </div>
            <div class="subtitle">PROVISIONAL ACADEMIC TRANSCRIPT</div>
            <div class="date">Generated: ${now}</div>
        </div>
        <div class="transcript-verification-column" aria-label="Transcript identification and verification">
            <div class="transcript-generation-number" id="transcriptGenerationNumber" aria-label="Transcript generation number" style="display:none"><span class="number-label">TRANSCRIPT NO.</span><span id="transcriptGenerationNumberValue"><span class="transcript-number-prefix"></span><span class="transcript-number-sequence"></span></span></div>
            <div class="verification-qr" aria-label="Document verification QR code"><img id="transcriptVerificationQr" alt="Scan to verify this transcript" /><span>VERIFY</span></div>
        </div>
    </div>
    <div class="student-info-wrapper">${profilePictureHTML}<div class="student-info">
        <div class="field"><span class="label">Student Name</span><span class="value">${escapeHtml(student.full_name || 'Student')}</span></div>
        <div class="field"><span class="label">Admission Number</span><span class="value">${escapeHtml(transcriptAdmission)}</span></div>
        <div class="field"><span class="label">Program</span><span class="value">${escapeHtml(transcriptProgramName || 'N/A')}</span></div>
        <div class="field"><span class="label">Academic Year</span><span class="value">${escapeHtml(academicYear)}</span></div>
        <div class="field"><span class="label">Intake Year</span><span class="value">${escapeHtml(transcriptIntakeYear || 'N/A')}</span></div>
        <div class="field"><span class="label">${isTVET ? 'Current Term' : 'Current Block'}</span><span class="value">${escapeHtml(transcriptCurrentBlock || 'N/A')}</span></div>
    </div></div>
    <div class="semester-results-title">${escapeHtml(transcriptResultsHeading)}</div>
    <table class="semester-results-table"><thead><tr>
        <th style="text-align: center; width: 25px; border: 1px solid #1E559B;">#</th>
        <th style="width: 76px; border: 1px solid #1E559B;">Unit Code</th>
        <th style="min-width: 170px; border: 1px solid #1E559B;">Unit Name</th>
        <th style="text-align: center; width: 50px; border: 1px solid #1E559B;">Grade</th>
        <th style="text-align: center; width: 70px; border: 1px solid #1E559B;">Grade Points</th>
        <th style="text-align: center; width: 82px; border: 1px solid #1E559B;">Status</th>
    </tr></thead><tbody>${tableRows || '<tr><td colspan="6" style="text-align:center;">No approved and published results.</td></tr>'}</tbody></table>
    <div class="transcript-lower-grid">
        <div class="grading-scale-table"><div class="title">Grading Scale (${programType}) — Mark*</div>${gradingScaleHTML}
            <div class="grading-scale-footnote" style="font-size: 7px; line-height: 1.2; margin-top: 3px; color: #475569;">* Indicates a grade/status obtained following a retake assessment.</div>
        </div>
        <div class="academic-summary-panel"><div class="academic-summary-title">Academic Summary</div><div class="summary-grid">
            <div class="summary-card"><div class="value" style="color: #1E559B;">${gpa.toFixed(2)}</div><div class="label">GPA</div></div>
            <div class="summary-card"><div class="value" style="color: ${grade === 'A' ? '#10b981' : grade === 'B' ? '#3b82f6' : grade === 'C' ? '#f59e0b' : '#ef4444'};">${escapeHtml(grade)}</div><div class="label">Overall Grade</div></div>
            <div class="summary-card"><div class="value" style="color: #1E559B;">${blockTotal}</div><div class="label">Units Reported</div></div>
            <div class="summary-card"><div class="value" style="color: #1E559B;">${passRate}%</div><div class="label">Pass Rate</div></div>
        </div></div>
    </div>
    <div class="signatures">
        <div class="signature-box"><div class="line"></div><div class="label">${principalSignatureLabel}</div><div class="date">Date: _____________</div></div>
        <div class="signature-box"><div class="line"></div><div class="label">${hodSignatureLabel}</div><div class="date">Date: _____________</div></div>
    </div>
    <div class="footer"><p>Accredited &amp; Registered Institution | Committed to Academic Excellence | © 2026 Nakuru College of Health Sciences &amp; Management</p>
        <p><strong>NCHSM</strong> · Tel: 0790 969 743 / 0722 351 791 · Email: <a href="mailto:info@nakurucollegeofhealth.ac.ke">info@nakurucollegeofhealth.ac.ke</a></p>
    </div>
    <div class="transcript-admin-actions no-print"><button class="btn-print" onclick="window.printTranscriptDocument()">Print / Save PDF</button><button class="btn-close" onclick="window.closeTranscriptPreview()">Close Preview</button></div>
</div>`;

    content.innerHTML = transcriptHtml;

    // Issue a real, authenticated provisional-transcript verification token.
    window._transcriptVerificationPromise = (async function issueAdminTranscriptVerification() {
        const qrHost = content.querySelector('#transcriptVerificationQr');
        const config = window.APP_CONFIG || {};
        const client = window.sb || window.supabaseClient || window.supabase || (window.db && window.db.supabase);
        // script.js creates the Supabase client directly and does not expose APP_CONFIG.
        // Supabase-js v2 retains the URL and anon key on the client instance.
        const supabaseUrl = config.SUPABASE_URL || client?.supabaseUrl || window.SUPABASE_URL;
        const anonKey = config.SUPABASE_ANON_KEY || client?.supabaseKey || window.SUPABASE_ANON_KEY;
        const setQrError = (message) => {
            if (qrHost) { qrHost.removeAttribute('src'); qrHost.alt = message || 'Verification unavailable'; qrHost.title = message || 'Verification unavailable'; }
        };
        try {
            if (!qrHost || !supabaseUrl || !anonKey || !client?.auth) {
                setQrError('Verification unavailable');
                return;
            }
            const { data: sessionData, error: sessionError } = await client.auth.getSession();
            const accessToken = sessionData?.session?.access_token;
            if (sessionError || !accessToken) throw new Error('Sign in again to issue verification.');
            const response = await fetch(supabaseUrl.replace(/\/$/, '') + '/functions/v1/transcript-registry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', apikey: anonKey, Authorization: 'Bearer ' + accessToken },
                body: JSON.stringify({ action: 'issue', block: blockName, admission_number: transcriptAdmission })
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok || !result.token) throw new Error(result.error || result.message || 'Registry did not return a verification token.');
            const numberBox = content.querySelector('#transcriptGenerationNumber');
            const numberValue = content.querySelector('#transcriptGenerationNumberValue');
            if (numberBox && numberValue && result.transcript_number) {
                const serial = String(result.transcript_number).trim();
                const sequenceMatch = serial.match(/(\d{5})$/);
                const prefix = sequenceMatch ? serial.slice(0, -5) : serial;
                const sequence = sequenceMatch ? sequenceMatch[1] : '';
                const prefixElement = numberValue.querySelector('.transcript-number-prefix');
                const sequenceElement = numberValue.querySelector('.transcript-number-sequence');
                if (prefixElement && sequenceElement) {
                    prefixElement.textContent = prefix;
                    sequenceElement.textContent = sequence;
                } else {
                    numberValue.textContent = serial;
                }
                numberBox.style.display = 'block';
            }
            const verifyUrl = new URL('/transcripts', window.location.origin);
            verifyUrl.searchParams.set('token', result.token);
            verifyUrl.searchParams.set('type', 'provisional-transcript');
            let QR = window.QRCode;
            if (!QR) {
                for (const url of [
                    'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
                    'https://unpkg.com/qrcodejs@1.0.0/qrcode.min.js'
                ]) {
                    try {
                        await new Promise((resolve, reject) => {
                            const script = document.createElement('script');
                            script.src = url;
                            script.onload = resolve;
                            script.onerror = reject;
                            document.head.appendChild(script);
                        });
                        if (window.QRCode) { QR = window.QRCode; break; }
                    } catch (_) {}
                }
            }
            if (!QR) throw new Error('QR library could not be loaded.');
            const qrStage = document.createElement('div');
            qrStage.style.cssText = 'position:fixed;left:-10000px;top:0;width:76px;height:76px;';
            document.body.appendChild(qrStage);
            try {
                new QR(qrStage, { text: verifyUrl.href, width: 76, height: 76, correctLevel: QR.CorrectLevel?.H ?? QR.CorrectLevel?.M ?? 0 });
                const qrCanvas = qrStage.querySelector('canvas');
                const qrGenerated = qrStage.querySelector('img');
                let qrData = '';
                if (qrCanvas && qrCanvas.width) qrData = qrCanvas.toDataURL('image/png');
                else if (qrGenerated) {
                    if (!qrGenerated.complete || !qrGenerated.naturalWidth) await new Promise((resolve, reject) => {
                        qrGenerated.onload = resolve; qrGenerated.onerror = reject;
                        setTimeout(() => reject(new Error('QR image timed out')), 5000);
                    });
                    qrData = qrGenerated.src;
                }
                if (!qrData) throw new Error('QR generator returned no image data.');
                qrHost.src = qrData;
                qrHost.width = 76;
                qrHost.height = 76;
                qrHost.dataset.ready = 'true';
            } finally { qrStage.remove(); }
        } catch (error) {
            console.error('[Transcript QR] Verification issuance failed:', error);
            setQrError('Verification unavailable');
            qrHost.title = error?.message || 'Verification unavailable';
        }
    })();
    return window._transcriptVerificationPromise;

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
        
        const effectiveMarks = getEffectiveUnitMarks(studentMarks);
        effectiveMarks.forEach(m => {
            const score = getEffectiveMarkScore(m);
            if (score === null) { pending++; return; }
            const gradeInfo = calculateOfficialGrade(score, program);
            const rawCredits = Number(m.credits || m.credit_hours || m.creditHours);
            const credits = Number.isFinite(rawCredits) && rawCredits > 0 ? rawCredits : GRADE_CONFIG.creditHours;
            totalScore += score; scoredCount++; totalPoints += gradeInfo.points * credits; totalCredits += credits;
            if (score >= getGradingConfig(program).passMark) passed++; else failed++;
            if (Number(m.retake_count) > 0 || m.retake_score !== null && m.retake_score !== undefined || m.retake_status) retakes++;
        });
        
        const avg = scoredCount > 0 ? Math.round((totalScore / scoredCount) * 10) / 10 : 0;
        const gpa = totalCredits > 0 ? Math.round((totalPoints / totalCredits) * 100) / 100 : 0;
        const gradeInfo = calculateOfficialGrade(avg, program);
        const config = getGradingConfig(program);
        const status = scoredCount === 0 ? 'PENDING' : (avg >= config.passMark ? 'PASS' : 'FAIL');
        
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
window.getProgramBlocks = getProgramBlocks;

console.log('✅ Super Admin Transcript Generator Module Loaded Successfully!');
console.log('📄 Official transcript format (CODE, COURSE TITLE, CREDIT, GRADE, POINTS)');
console.log('⭐ Retake indicator: ☆ (subtle star next to unit name)');
console.log('📊 TVET: Certificate (3 Terms), Diploma (6 Terms)');
console.log('📊 KRCHN: Blocks (Introductory, Block 1-6, Final)');
console.log('📋 Unit codes fetched from database (matches Marks Entry)');
console.log('✅ FIXED: Grading scale correctly detects Nursing vs TVET');
console.log('✅ FIXED: Progression message correctly checks program completion');
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
console.log('   - FIXED: "Proceed to next block" for Block 2 (not graduation)');
console.log('   - FIXED: "Ready for Graduation" only when ALL blocks completed');
