// ============================================================
// NCK XY FORMS & ASSESSMENT SYSTEM - COMPLETE
// PURELY KRCHN NURSING - NO TVET
// ============================================================

// ============================================================
// GLOBAL VARIABLES
// ============================================================

let currentNCKStudentsList = [];
let currentNCKColumns = [];
let currentNCKSelectedStudents = new Set();
let currentNCKSheetType = 'XY_FORMS';
let currentNCKIntake = '2026';
let currentNCKProgram = 'KRCHN';
let currentNCKMarksMap = {};
let fastEntryVisible = false;

// Default columns for XY FORMS (22 clinical areas)
const DEFAULT_XY_COLUMNS = [
    'MED1', 'MED2', 'MED3',
    'MCH1', 'MCH2', 'MCH3',
    'MAT1', 'MAT2', 'MAT3',
    'PEAD1', 'PEAD2',
    'SURG1', 'SURG2', 'SURG3',
    'OPD', 'NBU1', 'NBU2',
    'THEATRE', 'PSYCHIATRY',
    'RURALS', 'DISTRICT', 'SPECIAL'
];

// Default columns for ASSESSMENT & CASE
const DEFAULT_ASSESSMENT_COLUMNS = [
    'ANC WARD',
    'IMMUNIZATION ASSESSMENT',
    'NURSING CARE',
    'PSYCHIATRY ASSESSMENT',
    'NBU ASSESSMENT',
    'MIDWIFERY ASSESSMENT',
    'WARD MANAGEMENT',
    'MCH/FP CLINIC',
    'PSYCHIATRY CASE STUDY',
    'GENERAL NURSING CASE STUDY',
    'MIDWIFERY CASE STUDY',
    'COMMUNITY DIAGNOSIS'
];

// Clinical area groups for Fast Entry
const CLINICAL_GROUPS = [
    { title: '🏥 MEDICAL', cols: [0, 1, 2], names: ['MED1', 'MED2', 'MED3'] },
    { title: '🤰 MCH', cols: [3, 4, 5], names: ['MCH1', 'MCH2', 'MCH3'] },
    { title: '🤱 MATERNITY', cols: [6, 7, 8], names: ['MAT1', 'MAT2', 'MAT3'] },
    { title: '👶 PAEDIATRICS', cols: [9, 10], names: ['PEAD1', 'PEAD2'] },
    { title: '🔪 SURGERY', cols: [11, 12, 13], names: ['SURG1', 'SURG2', 'SURG3'] },
    { title: '🚑 OTHER', cols: [14, 15, 16, 17, 18, 19, 20, 21], names: ['OPD', 'NBU1', 'NBU2', 'THEATRE', 'PSYCHIATRY', 'RURALS', 'DISTRICT', 'SPECIAL'] }
];

// Block mapping for intake years
const BLOCK_MAP = {
    '2024': 'Block 4',
    '2025': 'Block 2',
    '2026': 'Introductory',
    '2027': 'Block 1',
    '2028': 'Block 2',
    '2029': 'Block 3',
    '2030': 'Block 4'
};

// ============================================================
// HELPER: Normalize admission number for matching
// ============================================================

function normalizeAdmission(adm) {
    if (!adm) return '';
    let normalized = adm;
    // Convert /YY to /YYYY (e.g., /24 → /2024)
    normalized = normalized.replace(/\/(\d{2})$/, (match, year) => {
        const fullYear = 2000 + parseInt(year);
        return '/' + fullYear;
    });
    return normalized;
}

// ============================================================
// NCK MANAGE STUDENTS - ADD/DROP STUDENTS
// ============================================================

let nck_ms_allStudents = [];
let nck_ms_enrolledStudents = [];
let nck_ms_availableStudents = [];
let nck_ms_selected = new Set();

async function nckLoadManageStudents() {
    console.log('📚 NCK: Loading Manage Students...');
    
    const intake = document.getElementById('nck_intake_select')?.value || '2026';
    const sheet = document.getElementById('nck_sheet_select')?.value || 'XY_FORMS';
    const program = document.getElementById('nck_program_select')?.value || 'KRCHN';
    
    if (!intake || !sheet) {
        const tbody = document.getElementById('nck_ms_student_table_body');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="padding: 40px; text-align: center; color: #94a3b8;">
                        <i class="fas fa-info-circle" style="font-size: 24px; display: block; margin-bottom: 10px;"></i>
                        Please select an Intake Year and Assessment Type first
                    </td>
                </tr>
            `;
        }
        return;
    }
    
    const unitDisplay = document.getElementById('nck_ms_current_unit');
    if (unitDisplay) unitDisplay.textContent = `${sheet} (${intake} Intake)`;
    
    try {
        // Get enrolled students from nck_marks (uses academic_year and block)
        const block = BLOCK_MAP[intake] || 'Block 1';
        const { data: enrolled, error: enrolledError } = await sb
            .from('nck_marks')
            .select('*')
            .eq('academic_year', intake)
            .eq('block', block)
            .eq('subject_name', sheet)
            .eq('program', program);
        
        if (enrolledError) throw enrolledError;
        
        // Get KRCHN students from profiles (uses intake_year)
        const { data: profiles, error: profilesError } = await sb
            .from('consolidated_user_profiles_table')
            .select('student_id, full_name, email, program, intake_year, block, admission_number, status')
            .eq('role', 'student')
            .eq('intake_year', intake)
            .eq('program', program);
        
        if (profilesError) throw profilesError;
        
        // Build enrolled map
        const enrolledMap = {};
        enrolled?.forEach(s => {
            if (s.admission_number) enrolledMap[s.admission_number] = true;
        });
        
        // Build available students
        const available = profiles?.filter(s => !enrolledMap[s.admission_number]) || [];
        
        nck_ms_allStudents = profiles || [];
        nck_ms_enrolledStudents = enrolled || [];
        nck_ms_availableStudents = available;
        nck_ms_selected = new Set();
        
        nckRenderManageStudents();
        nckUpdateStudentSelect();
        nckUpdateStats();
        
    } catch (error) {
        console.error('❌ Error loading manage students:', error);
        const tbody = document.getElementById('nck_ms_student_table_body');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="padding: 40px; text-align: center; color: #dc2626;">
                        <i class="fas fa-exclamation-circle" style="font-size: 24px; display: block; margin-bottom: 10px;"></i>
                        Error: ${error.message}
                    </td>
                </tr>
            `;
        }
    }
}

function nckRenderManageStudents() {
    const tbody = document.getElementById('nck_ms_student_table_body');
    if (!tbody) return;
    
    const search = document.getElementById('nck_ms_search')?.value?.toLowerCase() || '';
    const filtered = nck_ms_enrolledStudents.filter(s => 
        (s.student_name || '').toLowerCase().includes(search) ||
        (s.admission_number || '').toLowerCase().includes(search)
    );
    
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="padding: 40px; text-align: center; color: #94a3b8;">
            <i class="fas fa-users" style="font-size: 24px; display: block; margin-bottom: 10px;"></i>
            No students enrolled in this NCK unit
        </td></tr>`;
        return;
    }
    
    let html = '';
    filtered.forEach((s, i) => {
        const admission = s.admission_number || 'N/A';
        const name = s.student_name || 'Unknown';
        const score = s.final_score || 0;
        const status = s.status || 'pending';
        const isPassing = score >= 60;
        const isSelected = nck_ms_selected.has(admission);
        
        const statusColor = status === 'passed' ? '#d1fae5' : (status === 'failed' ? '#fee2e2' : '#fef3c7');
        const statusText = status === 'passed' ? '✅ PASS' : (status === 'failed' ? '❌ FAIL' : '⏳ PENDING');
        const statusTextColor = status === 'passed' ? '#065f46' : (status === 'failed' ? '#991b1b' : '#92400e');
        
        html += `
            <tr style="border-bottom: 1px solid #e5e7eb; ${i % 2 === 0 ? 'background: #f8fafc;' : ''}">
                <td style="padding: 8px 6px; text-align: center;">
                    <input type="checkbox" class="nck-ms-checkbox" data-admission="${admission}" 
                           onchange="nckToggleStudent('${admission}')" ${isSelected ? 'checked' : ''} style="cursor: pointer;">
                </td>
                <td style="padding: 8px 6px; text-align: center; font-size: 12px;">${i + 1}</td>
                <td style="padding: 8px 8px; font-weight: 500;">${escapeHtml(name)}</td>
                <td style="padding: 8px 8px; font-size: 12px; color: #64748b;">${escapeHtml(admission)}</td>
                <td style="padding: 8px 8px; font-size: 12px;">${escapeHtml(s.program || 'KRCHN')}</td>
                <td style="padding: 8px 8px; font-size: 12px;">${escapeHtml(s.academic_year || s.intake_year || '')}</td>
                <td style="padding: 8px 6px; text-align: center; font-weight: bold; color: ${isPassing ? '#065f46' : '#991b1b'};">${score}%</td>
                <td style="padding: 8px 6px; text-align: center;">
                    <span style="background: ${statusColor}; color: ${statusTextColor}; padding: 2px 10px; border-radius: 12px; font-weight: 600; font-size: 11px;">${statusText}</span>
                </td>
                <td style="padding: 8px 6px; text-align: center;">
                    <button onclick="nckDropStudent('${admission}')" style="background: #dc2626; color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 11px;">
                        <i class="fas fa-user-minus"></i> Drop
                    </button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    nckUpdateDropButton();
}

function nckUpdateStudentSelect() {
    const select = document.getElementById('nck_ms_student_select');
    if (!select) return;
    
    select.innerHTML = '<option value="">-- Select Student to Add --</option>';
    nck_ms_availableStudents.forEach(s => {
        select.innerHTML += `<option value="${s.admission_number}">${s.full_name} (${s.admission_number})</option>`;
    });
    const display = document.getElementById('nck_ms_available_count_display');
    if (display) display.textContent = nck_ms_availableStudents.length;
}

function nckUpdateStats() {
    const total = nck_ms_enrolledStudents.length;
    const available = nck_ms_availableStudents.length;
    const all = nck_ms_allStudents.length;
    let passing = 0, failing = 0;
    
    nck_ms_enrolledStudents.forEach(s => {
        if (s.final_score >= 60) passing++;
        else if (s.final_score > 0) failing++;
    });
    
    document.getElementById('nck_ms_enrolled_count').textContent = total;
    document.getElementById('nck_ms_available_count').textContent = available;
    document.getElementById('nck_ms_total_count').textContent = all;
    document.getElementById('nck_ms_passing_count').textContent = passing;
    document.getElementById('nck_ms_failing_count').textContent = failing;
}

function nckToggleStudent(admission) {
    if (nck_ms_selected.has(admission)) nck_ms_selected.delete(admission);
    else nck_ms_selected.add(admission);
    nckUpdateDropButton();
}

function nckToggleAllStudents() {
    const selectAll = document.getElementById('nck_ms_select_all');
    const checkboxes = document.querySelectorAll('.nck-ms-checkbox');
    const isChecked = selectAll?.checked || false;
    checkboxes.forEach(cb => {
        cb.checked = isChecked;
        const admission = cb.dataset.admission;
        if (isChecked) nck_ms_selected.add(admission);
        else nck_ms_selected.delete(admission);
    });
    nckUpdateDropButton();
}

function nckUpdateDropButton() {
    const count = nck_ms_selected.size;
    const btn = document.getElementById('nck_ms_drop_btn');
    const countEl = document.getElementById('nck_ms_drop_count');
    if (btn) btn.style.display = count > 0 ? 'inline-block' : 'none';
    if (countEl) countEl.textContent = count;
}

function nckOpenAddStudentForm() {
    const form = document.getElementById('nck_ms_add_form');
    if (form) form.style.display = 'block';
    nckUpdateStudentSelect();
}

function nckCloseAddStudentForm() {
    const form = document.getElementById('nck_ms_add_form');
    if (form) form.style.display = 'none';
}

async function nckAddSelectedStudent() {
    const select = document.getElementById('nck_ms_student_select');
    const admission = select?.value;
    if (!admission) {
        showNotification('Please select a student', 'warning');
        return;
    }
    
    const student = nck_ms_availableStudents.find(s => s.admission_number === admission);
    if (!student) {
        showNotification('Student not found', 'error');
        return;
    }
    
    const intake = document.getElementById('nck_intake_select')?.value || '2026';
    const sheet = document.getElementById('nck_sheet_select')?.value || 'XY_FORMS';
    const program = document.getElementById('nck_program_select')?.value || 'KRCHN';
    const block = BLOCK_MAP[intake] || 'Block 1';
    
    try {
        const { error } = await sb
            .from('nck_marks')
            .insert({
                admission_number: admission,
                student_name: student.full_name,
                student_id: student.student_id,
                academic_year: intake,
                block: block,
                subject_name: sheet,
                program: program,
                status: 'pending',
                final_score: 0,
                scores: {},
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        if (error) throw error;
        showNotification(`✅ ${student.full_name} added to NCK`, 'success');
        await nckLoadManageStudents();
        loadNCKData();
    } catch (e) {
        showNotification('❌ Error: ' + e.message, 'error');
    }
}

async function nckAddAllAvailableStudents() {
    if (nck_ms_availableStudents.length === 0) {
        showNotification('No available students to add', 'info');
        return;
    }
    if (!confirm(`Add ${nck_ms_availableStudents.length} students to NCK?`)) return;
    
    const intake = document.getElementById('nck_intake_select')?.value || '2026';
    const sheet = document.getElementById('nck_sheet_select')?.value || 'XY_FORMS';
    const program = document.getElementById('nck_program_select')?.value || 'KRCHN';
    const block = BLOCK_MAP[intake] || 'Block 1';
    
    let added = 0;
    for (const s of nck_ms_availableStudents) {
        const { error } = await sb
            .from('nck_marks')
            .insert({
                admission_number: s.admission_number,
                student_name: s.full_name,
                student_id: s.student_id,
                academic_year: intake,
                block: block,
                subject_name: sheet,
                program: program,
                status: 'pending',
                final_score: 0,
                scores: {},
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        if (!error) added++;
    }
    showNotification(`✅ ${added} students added to NCK`, 'success');
    await nckLoadManageStudents();
    loadNCKData();
}

async function nckDropStudent(admission) {
    if (!confirm(`Remove this student from NCK?`)) return;
    
    const intake = document.getElementById('nck_intake_select')?.value || '2026';
    const sheet = document.getElementById('nck_sheet_select')?.value || 'XY_FORMS';
    const block = BLOCK_MAP[intake] || 'Block 1';
    
    try {
        const { error } = await sb
            .from('nck_marks')
            .delete()
            .eq('admission_number', admission)
            .eq('academic_year', intake)
            .eq('block', block)
            .eq('subject_name', sheet);
        if (error) throw error;
        showNotification('✅ Student removed from NCK', 'success');
        await nckLoadManageStudents();
        loadNCKData();
    } catch (e) {
        showNotification('❌ Error: ' + e.message, 'error');
    }
}

async function nckDropSelectedStudents() {
    const selected = Array.from(nck_ms_selected);
    if (selected.length === 0) {
        showNotification('No students selected', 'warning');
        return;
    }
    if (!confirm(`Remove ${selected.length} students from NCK?`)) return;
    
    const intake = document.getElementById('nck_intake_select')?.value || '2026';
    const sheet = document.getElementById('nck_sheet_select')?.value || 'XY_FORMS';
    const block = BLOCK_MAP[intake] || 'Block 1';
    
    let removed = 0;
    for (const admission of selected) {
        const { error } = await sb
            .from('nck_marks')
            .delete()
            .eq('admission_number', admission)
            .eq('academic_year', intake)
            .eq('block', block)
            .eq('subject_name', sheet);
        if (!error) removed++;
    }
    nck_ms_selected = new Set();
    showNotification(`✅ ${removed} students removed from NCK`, 'success');
    await nckLoadManageStudents();
    loadNCKData();
}

async function nckRemoveAllStudents() {
    const count = nck_ms_enrolledStudents.length;
    if (count === 0) {
        showNotification('No students to remove', 'info');
        return;
    }
    if (!confirm(`Remove ALL ${count} students from NCK?`)) return;
    
    const intake = document.getElementById('nck_intake_select')?.value || '2026';
    const sheet = document.getElementById('nck_sheet_select')?.value || 'XY_FORMS';
    const block = BLOCK_MAP[intake] || 'Block 1';
    
    try {
        const { error } = await sb
            .from('nck_marks')
            .delete()
            .eq('academic_year', intake)
            .eq('block', block)
            .eq('subject_name', sheet);
        if (error) throw error;
        showNotification(`✅ All ${count} students removed from NCK`, 'success');
        await nckLoadManageStudents();
        loadNCKData();
    } catch (e) {
        showNotification('❌ Error: ' + e.message, 'error');
    }
}

function nckRefreshManageStudents() {
    nckLoadManageStudents();
    showNotification('🔄 Students refreshed!', 'success');
}

// ============================================================
// MAIN LOAD FUNCTIONS
// ============================================================

function loadNCKSystemData() {
    console.log('🏥 Loading NCK System...');
    loadNCKStats();
    loadNCKData();
}

async function refreshNCKData() {
    console.log('🔄 Refreshing NCK data...');
    showLoading('Refreshing NCK data...');
    
    try {
        currentNCKMarksMap = {};
        currentNCKStudentsList = [];
        await loadNCKStats();
        await loadNCKData();
        await nckLoadManageStudents();
        showNotification('✅ NCK data refreshed successfully!', false);
    } catch (err) {
        console.error('❌ Refresh error:', err);
        showNotification('Error refreshing data: ' + err.message, true);
    } finally {
        hideLoading();
    }
}

async function loadNCKStats() {
    try {
        const { data: students, error: sError } = await sb
            .from('consolidated_user_profiles_table')
            .select('student_id', { count: 'exact' })
            .eq('role', 'student')
            .eq('status', 'approved')
            .eq('program', 'KRCHN');

        if (sError) {
            console.error('❌ Error loading student stats:', sError);
            return;
        }

        const totalStudents = students?.length || 0;
        const totalEl = document.getElementById('nck_total_students');
        if (totalEl) totalEl.textContent = totalStudents;

        const { data: nckMarks, error: nError } = await sb
            .from('nck_marks')
            .select('final_score, published, status')
            .eq('program', 'KRCHN');

        if (nError) {
            console.error('❌ Error loading NCK stats:', nError);
            return;
        }

        if (nckMarks) {
            let totalScore = 0, scoredCount = 0, passedCount = 0, publishedCount = 0;

            nckMarks.forEach(m => {
                const score = parseFloat(m.final_score) || 0;
                if (score > 0) {
                    totalScore += score;
                    scoredCount++;
                    if (score >= 60) passedCount++;
                }
                if (m.published === true || m.published === 'true') publishedCount++;
            });

            const avgScore = scoredCount > 0 ? (totalScore / scoredCount).toFixed(1) : 0;
            const passRate = scoredCount > 0 ? ((passedCount / scoredCount) * 100).toFixed(1) : 0;

            const passRateEl = document.getElementById('nck_pass_rate');
            if (passRateEl) passRateEl.textContent = `${passRate}%`;
            
            const avgScoreEl = document.getElementById('nck_avg_score');
            if (avgScoreEl) avgScoreEl.textContent = `${avgScore}%`;
            
            const atRiskEl = document.getElementById('nck_at_risk');
            if (atRiskEl) atRiskEl.textContent = scoredCount - passedCount;
            
            const publishedEl = document.getElementById('nck_published_count');
            if (publishedEl) publishedEl.textContent = publishedCount;
        }

    } catch (err) {
        console.error('❌ Error loading NCK stats:', err);
    }
}

async function loadNCKData() {
    const intakeSelect = document.getElementById('nck_intake_select');
    const sheetSelect = document.getElementById('nck_sheet_select');

    currentNCKIntake = intakeSelect?.value || '2026';
    currentNCKSheetType = sheetSelect?.value || 'XY_FORMS';
    currentNCKProgram = 'KRCHN';

    const container = document.getElementById('nck_table_container');
    const placeholder = document.getElementById('nckPlaceholder');
    const dynamicContent = document.getElementById('nckDynamicContent');

    if (!container) {
        console.error('❌ nck_table_container not found');
        return;
    }

    container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #94a3b8;">
            <i class="fas fa-spinner fa-spin" style="font-size: 24px;"></i>
            <p style="margin-top: 10px;">Loading NCK data...</p>
        </div>
    `;

    try {
        console.log(`📊 Loading: Intake=${currentNCKIntake}, Sheet=${currentNCKSheetType}, Program=KRCHN`);

        // Get students from profiles using intake_year
        const { data: students, error: sError } = await sb
            .from('consolidated_user_profiles_table')
            .select('student_id, full_name, admission_number, intake_year, program, status')
            .eq('role', 'student')
            .eq('status', 'approved')
            .eq('intake_year', currentNCKIntake)
            .eq('program', 'KRCHN');

        if (sError) {
            console.error('❌ Error loading students:', sError);
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #dc2626;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 32px;"></i>
                    <p style="margin-top: 10px;">Error: ${sError.message}</p>
                </div>
            `;
            return;
        }

        if (!students || students.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #94a3b8;">
                    <i class="fas fa-users" style="font-size: 32px;"></i>
                    <p style="margin-top: 10px;">No students found for ${currentNCKIntake} Intake - KRCHN</p>
                    <button onclick="loadNCKData()" style="background: #4C1D95; padding: 10px 20px; border: none; border-radius: 8px; color: white; cursor: pointer; margin-top: 10px;">
                        <i class="fas fa-sync-alt"></i> Try Again
                    </button>
                </div>
            `;
            if (placeholder) placeholder.style.display = 'block';
            if (dynamicContent) dynamicContent.style.display = 'none';
            return;
        }

        currentNCKStudentsList = students;
        console.log(`✅ Found ${students.length} students`);

        const studentCountEl = document.getElementById('nck_student_count');
        if (studentCountEl) studentCountEl.textContent = students.length;
        
        const blockStudentsEl = document.getElementById('nck_block_students');
        if (blockStudentsEl) blockStudentsEl.textContent = students.length;

        // Get marks from nck_marks using academic_year
        const block = BLOCK_MAP[currentNCKIntake] || 'Block 1';
        const { data: marks, error: mError } = await sb
            .from('nck_marks')
            .select('id, student_id, student_name, admission_number, academic_year, block, subject_name, program, scores, final_score, grade, status, graded_by, published, published_at')
            .eq('academic_year', currentNCKIntake)
            .eq('block', block)
            .eq('subject_name', currentNCKSheetType)
            .eq('program', 'KRCHN');

        if (mError) {
            console.error('❌ Error loading NCK marks:', mError);
        }

        console.log(`✅ Found ${marks?.length || 0} NCK marks`);

        // Build marks map with multiple keys for matching
        currentNCKMarksMap = {};
        if (marks) {
            marks.forEach(m => {
                // Store by original admission_number
                if (m.admission_number) {
                    currentNCKMarksMap[m.admission_number] = m;
                    // Also store normalized version
                    const normalized = normalizeAdmission(m.admission_number);
                    if (normalized !== m.admission_number) {
                        currentNCKMarksMap[normalized] = m;
                    }
                }
                // Store by student_id
                if (m.student_id) {
                    currentNCKMarksMap[m.student_id] = m;
                }
                // Store by student_name (lowercase for case-insensitive matching)
                if (m.student_name) {
                    const nameKey = m.student_name.trim().toLowerCase();
                    currentNCKMarksMap[nameKey] = m;
                }
            });
        }

        console.log(`📊 Marks map built with ${Object.keys(currentNCKMarksMap).length} keys`);

        let columns = [];
        const savedColumns = localStorage.getItem(`nck_columns_${currentNCKSheetType}_${currentNCKIntake}`);
        if (savedColumns) {
            try {
                const parsed = JSON.parse(savedColumns);
                if (Array.isArray(parsed) && parsed.length > 0) columns = parsed;
            } catch (e) {}
        }

        if (columns.length === 0) {
            columns = currentNCKSheetType === 'XY_FORMS' 
                ? [...DEFAULT_XY_COLUMNS] 
                : [...DEFAULT_ASSESSMENT_COLUMNS];
        }

        currentNCKColumns = columns;

        const columnCountEl = document.getElementById('nck_column_count');
        if (columnCountEl) columnCountEl.textContent = columns.length;
        
        const blockColumnsEl = document.getElementById('nck_block_columns');
        if (blockColumnsEl) blockColumnsEl.textContent = columns.length;

        updateIntakeDisplay();

        buildNCKTable(students, currentNCKMarksMap, columns);
        loadColumnSettings(columns);

        if (placeholder) placeholder.style.display = 'none';
        if (dynamicContent) dynamicContent.style.display = 'block';

        await nckLoadManageStudents();

    } catch (err) {
        console.error('❌ loadNCKData error:', err);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #dc2626;">
                <i class="fas fa-exclamation-triangle" style="font-size: 32px;"></i>
                <p style="margin-top: 10px;">Error: ${err.message}</p>
                <button onclick="loadNCKData()" style="background: #4C1D95; padding: 10px 20px; border: none; border-radius: 8px; color: white; cursor: pointer; margin-top: 10px;">
                    <i class="fas fa-sync-alt"></i> Retry
                </button>
            </div>
        `;
    }
}

function updateIntakeDisplay() {
    const intakeLabels = {
        '2030': { label: '2030 Intake', type: 'KRCHN Students' },
        '2029': { label: '2029 Intake', type: 'KRCHN Students' },
        '2028': { label: '2028 Intake', type: 'KRCHN Students' },
        '2027': { label: '2027 Intake', type: 'KRCHN Students' },
        '2026': { label: '2026 Intake', type: 'KRCHN Students' },
        '2025': { label: '2025 Intake', type: 'KRCHN Students' },
        '2024': { label: '2024 Intake', type: 'KRCHN Students' }
    };

    const info = intakeLabels[currentNCKIntake] || { label: currentNCKIntake + ' Intake', type: 'KRCHN Students' };

    const labelEl = document.getElementById('nck_current_block_label');
    if (labelEl) labelEl.textContent = info.label;

    const typeEl = document.getElementById('nck_block_type_label');
    if (typeEl) typeEl.textContent = info.type;

    const displayEl = document.getElementById('nck_current_block_display');
    if (displayEl) displayEl.textContent = info.label;

    const typeDisplayEl = document.getElementById('nck_block_type_display');
    if (typeDisplayEl) typeDisplayEl.textContent = info.type;
}

// ============================================================
// TABLE BUILDING
// ============================================================

function buildNCKTable(students, marksMap, columns) {
    const container = document.getElementById('nck_table_container');
    if (!container) return;

    if (!students || students.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #94a3b8;">
                <i class="fas fa-users" style="font-size: 32px;"></i>
                <p style="margin-top: 10px;">No students to display</p>
            </div>
        `;
        return;
    }

    let cols = columns || [];
    if (cols.length === 0) {
        cols = currentNCKSheetType === 'XY_FORMS' 
            ? [...DEFAULT_XY_COLUMNS] 
            : [...DEFAULT_ASSESSMENT_COLUMNS];
    }

    const tableWidth = 400 + (cols.length * 70);

    let html = `
        <table id="nck_marks_table" style="width: 100%; min-width: ${tableWidth}px; border-collapse: collapse; font-size: 13px;">
            <thead>
                <tr style="background: linear-gradient(135deg, #4C1D95, #7c3aed); color: white;">
                    <th style="position: sticky; left: 0; background: #4C1D95; padding: 10px 6px; text-align: center; min-width: 35px; z-index: 3;" rowspan="2">#</th>
                    <th style="position: sticky; left: 35px; background: #4C1D95; padding: 10px 6px; text-align: left; min-width: 160px; z-index: 3;" rowspan="2">Student Name</th>
                    <th style="position: sticky; left: 195px; background: #4C1D95; padding: 10px 6px; text-align: left; min-width: 120px; z-index: 3;" rowspan="2">Admission</th>
    `;

    cols.forEach(col => {
        html += `<th style="padding: 10px 4px; text-align: center; min-width: 60px; font-size: 11px; background: #6d28d9; border: 1px solid rgba(255,255,255,0.1);" data-column="${escapeHtml(col)}">${escapeHtml(col)}</th>`;
    });

    html += `
                    <th style="padding: 10px 6px; text-align: center; background: #059669; min-width: 50px;" rowspan="2">Avg</th>
                    <th style="padding: 10px 6px; text-align: center; background: #FDB913; min-width: 70px;" rowspan="2">Status</th>
                    <th style="padding: 10px 6px; text-align: center; background: #4C1D95; min-width: 120px;" rowspan="2">Graded By</th>
                    <th style="padding: 10px 6px; text-align: center; background: #8b5cf6; min-width: 80px;" rowspan="2">📤 Publish</th>
                </tr>
                <tr style="background: #ede9fe; border-bottom: 2px solid #4C1D95;">
                    <th style="position: sticky; left: 0; background: #ede9fe; padding: 4px 2px; text-align: center; z-index: 2;"></th>
                    <th style="position: sticky; left: 35px; background: #ede9fe; padding: 4px 2px; text-align: left; z-index: 2;"></th>
                    <th style="position: sticky; left: 195px; background: #ede9fe; padding: 4px 2px; text-align: left; z-index: 2;"></th>
    `;

    cols.forEach(() => {
        html += `<th style="padding: 4px 2px; text-align: center; font-size: 10px; color: #4C1D95; border: 1px solid #e5e7eb;"></th>`;
    });

    html += `
                    <th style="padding: 4px 2px; text-align: center; font-size: 10px; background: #059669; color: white;"></th>
                    <th style="padding: 4px 2px; text-align: center; font-size: 10px; background: #FDB913; color: #0A3D62;"></th>
                    <th style="padding: 4px 2px; text-align: center; font-size: 10px; background: #4C1D95; color: white;"></th>
                    <th style="padding: 4px 2px; text-align: center; font-size: 10px; background: #8b5cf6; color: white;"></th>
                </tr>
            </thead>
            <tbody>
    `;

    students.forEach((student, idx) => {
        // Try multiple keys to find the mark
        let mark = null;
        const studentId = student.student_id || student.admission_number;
        
        // 1. Try original admission_number
        if (student.admission_number && marksMap[student.admission_number]) {
            mark = marksMap[student.admission_number];
        }
        // 2. Try normalized admission_number (convert /24 to /2024)
        else if (student.admission_number) {
            const normalized = normalizeAdmission(student.admission_number);
            if (marksMap[normalized]) {
                mark = marksMap[normalized];
            }
        }
        // 3. Try student_id
        else if (student.student_id && marksMap[student.student_id]) {
            mark = marksMap[student.student_id];
        }
        // 4. Try by name (case-insensitive)
        else if (student.full_name) {
            const nameKey = student.full_name.trim().toLowerCase();
            if (marksMap[nameKey]) {
                mark = marksMap[nameKey];
            }
        }
        // 5. Try to find by any key that matches
        if (!mark && student.admission_number) {
            const keys = Object.keys(marksMap);
            for (const key of keys) {
                const m = marksMap[key];
                if (m.admission_number && normalizeAdmission(m.admission_number) === normalizeAdmission(student.admission_number)) {
                    mark = m;
                    break;
                }
                if (m.student_name && m.student_name.trim().toLowerCase() === student.full_name?.trim().toLowerCase()) {
                    mark = m;
                    break;
                }
            }
        }

        let scores = {};
        try {
            if (mark?.scores) {
                scores = typeof mark.scores === 'string' ? JSON.parse(mark.scores) : mark.scores;
            }
        } catch (e) {
            console.error('Error parsing scores for', student.full_name, e);
            scores = {};
        }

        const gradedBy = mark?.graded_by || '';
        const published = mark?.published === true || mark?.published === 'true';

        let totalScore = 0, scoredCount = 0;
        cols.forEach(col => {
            const val = parseFloat(scores[col]) || 0;
            if (val > 0) { totalScore += val; scoredCount++; }
        });

        const avg = scoredCount > 0 ? (totalScore / scoredCount) : 0;
        const status = avg > 0 ? (avg >= 60 ? 'PASS' : 'FAIL') : 'PENDING';
        const statusClass = status === 'PASS' ? 'pass-row' : (status === 'FAIL' ? 'fail-row' : 'pending-row');
        const bgColor = status === 'PASS' ? '#d1fae5' : (status === 'FAIL' ? '#fee2e2' : '#fef3c7');
        const textColor = status === 'PASS' ? '#065f46' : (status === 'FAIL' ? '#991b1b' : '#92400e');

        html += `
            <tr class="${statusClass}" data-student-id="${studentId}" style="border-bottom: 1px solid #e5e7eb;">
                <td style="position: sticky; left: 0; background: white; padding: 6px 4px; text-align: center; font-weight: 500; z-index: 1;">${idx + 1}</td>
                <td style="position: sticky; left: 35px; background: white; padding: 6px 4px; font-weight: 600; z-index: 1;">
                    <span style="cursor: pointer; color: #4C1D95; text-decoration: underline;" onclick="editNCKStudent('${studentId}')">
                        ${escapeHtml(student.full_name)} <i class="fas fa-edit" style="font-size: 10px;"></i>
                    </span>
                </td>
                <td style="position: sticky; left: 195px; background: white; padding: 6px 4px; font-weight: 500; z-index: 1; font-size: 12px; color: #64748b;">
                    ${escapeHtml(student.admission_number || studentId)}
                </td>
        `;

        cols.forEach(col => {
            const val = scores[col] !== undefined && scores[col] !== null ? scores[col] : '';
            const hasValue = val !== '' && parseFloat(val) > 0;
            const inputBg = hasValue ? '#d1fae5' : '#fff3e0';
            html += `
                <td style="padding: 4px 2px; text-align: center;">
                    <input type="number" 
                           class="nck-score-input" 
                           data-student="${studentId}" 
                           data-column="${escapeHtml(col)}"
                           value="${val}" 
                           min="0" 
                           max="100" 
                           step="0.5" 
                           style="width: 55px; padding: 4px; border-radius: 6px; text-align: center; background: ${inputBg}; border: 1px solid ${hasValue ? '#d1fae5' : '#fef3c7'}; font-size: 12px;" 
                           onchange="updateNCKAverage('${studentId}')">
                </td>
            `;
        });

        html += `
                <td style="font-weight: bold; text-align: center; background: ${bgColor}; font-size: 14px;" class="nck-avg-cell" id="nck_avg_${studentId}">${avg.toFixed(1)}</td>
                <td style="text-align: center;" class="nck-status-cell" id="nck_status_${studentId}">
                    <span style="background: ${bgColor}; color: ${textColor}; padding: 4px 12px; border-radius: 12px; font-weight: 600; font-size: 12px;">${status}</span>
                </td>
                <td style="text-align: center;">
                    <input type="text" class="nck-graded-input" data-student="${studentId}" value="${escapeHtml(gradedBy)}" placeholder="Lecturer" style="width: 120px; padding: 4px 8px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 12px;">
                </td>
                <td style="text-align: center;">
                    <button onclick="togglePublishNCK('${studentId}')" style="background: ${published ? '#10b981' : '#8b5cf6'}; color: white; padding: 4px 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">
                        <i class="fas ${published ? 'fa-eye' : 'fa-eye-slash'}"></i> ${published ? 'Published' : 'Publish'}
                    </button>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

// ============================================================
// COLUMN SETTINGS
// ============================================================

function loadColumnSettings(columns) {
    const container = document.getElementById('nck_column_settings');
    if (!container) return;

    let html = '';
    columns.forEach(col => {
        html += `
            <div class="nck-column-item">
                <input type="checkbox" class="nck-column-toggle" id="col_${escapeHtml(col)}" checked value="${escapeHtml(col)}" onchange="toggleColumn('${escapeHtml(col)}')">
                <label for="col_${escapeHtml(col)}">${escapeHtml(col)}</label>
                <button onclick="removeColumn('${escapeHtml(col)}')" class="remove-btn">&times;</button>
            </div>
        `;
    });

    container.innerHTML = html;
}

function toggleColumn(columnName) {
    const checkbox = document.getElementById(`col_${escapeHtml(columnName)}`);
    if (!checkbox) return;

    const inputs = document.querySelectorAll(`.nck-score-input[data-column="${columnName}"]`);
    const ths = document.querySelectorAll(`th[data-column="${columnName}"]`);

    inputs.forEach(input => {
        input.parentElement.style.display = checkbox.checked ? '' : 'none';
    });
    ths.forEach(th => {
        th.style.display = checkbox.checked ? '' : 'none';
    });

    saveColumnSettingsToStorage();
}

function removeColumn(columnName) {
    if (!confirm(`Remove column "${columnName}"?`)) return;

    currentNCKColumns = currentNCKColumns.filter(col => col !== columnName);

    const inputs = document.querySelectorAll(`.nck-score-input[data-column="${columnName}"]`);
    inputs.forEach(input => {
        const td = input.parentElement;
        if (td) td.remove();
    });

    const settingDiv = document.querySelector(`[id="col_${escapeHtml(columnName)}"]`)?.closest('.nck-column-item');
    if (settingDiv) settingDiv.remove();

    updateColumnCounts();
    saveColumnSettingsToStorage();
    showNotification(`Column "${columnName}" removed`, false);
}

function addNewColumn() {
    const columnName = prompt('Enter new column name:');
    if (!columnName || columnName.trim() === '') return;

    const cleanName = columnName.trim();

    if (currentNCKColumns.includes(cleanName)) {
        showNotification(`Column "${cleanName}" already exists!`, true);
        return;
    }

    currentNCKColumns.push(cleanName);

    // Add to table
    const table = document.getElementById('nck_marks_table');
    if (table) {
        const headerRow = table.querySelector('thead tr:last-child');
        const rows = table.querySelectorAll('tbody tr');

        if (headerRow) {
            const cells = headerRow.querySelectorAll('th');
            const avgTh = cells[cells.length - 4];
            const th = document.createElement('th');
            th.dataset.column = cleanName;
            th.style.cssText = 'padding: 6px 4px; text-align: center; min-width: 60px; font-size: 11px; background: #6d28d9; color: white; border: 1px solid rgba(255,255,255,0.1);';
            th.textContent = cleanName;
            if (avgTh) avgTh.parentNode.insertBefore(th, avgTh);
        }

        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            const avgCell = cells[cells.length - 4];
            const studentId = row.dataset.studentId || '';
            const td = document.createElement('td');
            td.style.cssText = 'padding: 4px 2px; text-align: center;';
            td.innerHTML = `
                <input type="number" 
                       class="nck-score-input" 
                       data-student="${studentId}" 
                       data-column="${cleanName}"
                       value="" 
                       min="0" 
                       max="100" 
                       step="0.5" 
                       style="width: 55px; padding: 4px; border-radius: 6px; text-align: center; background: #fff3e0; border: 1px solid #fef3c7; font-size: 12px;" 
                       onchange="updateNCKAverage('${studentId}')">
            `;
            if (avgCell) avgCell.parentNode.insertBefore(td, avgCell);
        });
    }

    // Add to settings
    const settingsContainer = document.getElementById('nck_column_settings');
    if (settingsContainer) {
        const div = document.createElement('div');
        div.className = 'nck-column-item';
        div.innerHTML = `
            <input type="checkbox" class="nck-column-toggle" id="col_${cleanName}" checked value="${cleanName}" onchange="toggleColumn('${cleanName}')">
            <label for="col_${cleanName}">${cleanName}</label>
            <button onclick="removeColumn('${cleanName}')" class="remove-btn">&times;</button>
        `;
        settingsContainer.appendChild(div);
    }

    updateColumnCounts();
    saveColumnSettingsToStorage();
    showNotification(`Column "${cleanName}" added!`, false);
}

function addNewColumnFromModal() {
    const input = document.getElementById('nckNewColumnName');
    if (!input || !input.value.trim()) {
        showNotification('Please enter a column name', true);
        return;
    }
    addNewColumn();
    input.value = '';
    document.getElementById('nckColumnModal').style.display = 'none';
}

function resetNCKColumns() {
    if (!confirm('Reset columns to default for this assessment type?')) return;

    const defaultCols = currentNCKSheetType === 'XY_FORMS' 
        ? [...DEFAULT_XY_COLUMNS] 
        : [...DEFAULT_ASSESSMENT_COLUMNS];

    currentNCKColumns = defaultCols;
    updateColumnCounts();
    saveColumnSettingsToStorage();
    loadNCKData();
    showNotification('Columns reset to default!', false);
}

function saveColumnSettingsToStorage() {
    localStorage.setItem(
        `nck_columns_${currentNCKSheetType}_${currentNCKIntake}`,
        JSON.stringify(currentNCKColumns)
    );
}

function saveColumnSettings() {
    saveColumnSettingsToStorage();
    showNotification('Column settings saved!', false);
    document.getElementById('nckColumnModal').style.display = 'none';
}

function openColumnManager() {
    const modal = document.getElementById('nckColumnModal');
    if (modal) {
        const listContainer = document.getElementById('nckColumnList');
        if (listContainer) {
            let html = '';
            currentNCKColumns.forEach(col => {
                html += `
                    <div class="nck-column-item">
                        <input type="checkbox" class="nck-column-toggle-modal" id="modal_col_${escapeHtml(col)}" checked value="${escapeHtml(col)}" onchange="toggleColumn('${escapeHtml(col)}')">
                        <label for="modal_col_${escapeHtml(col)}">${escapeHtml(col)}</label>
                        <button onclick="removeColumn('${escapeHtml(col)}'); openColumnManager();" class="remove-btn">&times;</button>
                    </div>
                `;
            });
            listContainer.innerHTML = html;
        }
        modal.style.display = 'flex';
    }
}

function updateColumnCounts() {
    const colCountEl = document.getElementById('nck_column_count');
    if (colCountEl) colCountEl.textContent = currentNCKColumns.length;
    
    const blockColumnsEl = document.getElementById('nck_block_columns');
    if (blockColumnsEl) blockColumnsEl.textContent = currentNCKColumns.length;
}

// ============================================================
// AUTO-CALCULATION
// ============================================================

function updateNCKAverage(studentId) {
    const inputs = document.querySelectorAll(`.nck-score-input[data-student="${studentId}"]`);
    let totalScore = 0, scoredCount = 0;

    inputs.forEach(input => {
        const val = parseFloat(input.value) || 0;
        if (val > 0) {
            totalScore += val;
            scoredCount++;
        }
        input.style.background = val > 0 ? '#d1fae5' : '#fff3e0';
        input.style.borderColor = val > 0 ? '#d1fae5' : '#fef3c7';
    });

    const avg = scoredCount > 0 ? (totalScore / scoredCount) : 0;
    const status = avg > 0 ? (avg >= 60 ? 'PASS' : 'FAIL') : 'PENDING';
    const bgColor = status === 'PASS' ? '#d1fae5' : (status === 'FAIL' ? '#fee2e2' : '#fef3c7');
    const textColor = status === 'PASS' ? '#065f46' : (status === 'FAIL' ? '#991b1b' : '#92400e');

    const avgCell = document.getElementById(`nck_avg_${studentId}`);
    if (avgCell) {
        avgCell.textContent = avg.toFixed(1);
        avgCell.style.background = bgColor;
    }

    const statusCell = document.getElementById(`nck_status_${studentId}`);
    if (statusCell) {
        statusCell.innerHTML = `
            <span style="background: ${bgColor}; color: ${textColor}; padding: 4px 12px; border-radius: 12px; font-weight: 600; font-size: 12px;">${status}</span>
        `;
    }

    const row = document.querySelector(`tr[data-student-id="${studentId}"]`);
    if (row) {
        row.className = status === 'PASS' ? 'pass-row' : (status === 'FAIL' ? 'fail-row' : 'pending-row');
    }
}

// ============================================================
// SAVE FUNCTIONS
// ============================================================

async function saveAllNCKMarks() {
    const students = currentNCKStudentsList;
    if (!students || students.length === 0) {
        showNotification('No data to save', true);
        return;
    }

    showLoading('Saving all NCK marks...');
    let savedCount = 0, errorCount = 0;

    for (const student of students) {
        const studentId = student.student_id || student.admission_number;
        const scores = {};
        const inputs = document.querySelectorAll(`.nck-score-input[data-student="${studentId}"]`);

        inputs.forEach(input => {
            const column = input.dataset.column;
            const val = parseFloat(input.value) || 0;
            scores[column] = val;
        });

        let totalScore = 0, scoredCount = 0;
        Object.values(scores).forEach(val => {
            if (val > 0) { totalScore += val; scoredCount++; }
        });
        const avg = scoredCount > 0 ? (totalScore / scoredCount) : 0;
        const grade = calculateNursingGrade(avg);
        const status = avg > 0 ? (avg >= 60 ? 'passed' : 'failed') : 'pending';

        const gradedInput = document.querySelector(`.nck-graded-input[data-student="${studentId}"]`);
        const gradedBy = gradedInput?.value || window.currentUser?.full_name || 'Admin';

        const block = BLOCK_MAP[currentNCKIntake] || 'Block 1';

        try {
            const { error } = await sb
                .from('nck_marks')
                .upsert({
                    student_id: studentId,
                    student_name: student.full_name || 'Unknown',
                    admission_number: student.admission_number || studentId,
                    academic_year: currentNCKIntake,
                    block: block,
                    subject_name: currentNCKSheetType,
                    program: 'KRCHN',
                    scores: JSON.stringify(scores),
                    final_score: Math.round(avg * 10) / 10,
                    grade: grade,
                    status: status,
                    graded_by: gradedBy,
                    updated_at: new Date().toISOString()
                }, { 
                    onConflict: 'student_id, subject_name, academic_year, block, program' 
                });

            if (error) {
                console.error('❌ Error saving student:', studentId, error);
                errorCount++;
            } else {
                savedCount++;
            }
        } catch (err) {
            console.error('❌ Error saving student:', studentId, err);
            errorCount++;
        }
    }

    hideLoading();
    if (errorCount > 0) {
        showNotification(`⚠️ Saved ${savedCount} records, ${errorCount} errors`, true);
    } else {
        showNotification(`✅ Saved ${savedCount} records successfully!`, false);
    }
    await loadNCKStats();
}

// ============================================================
// PUBLISH FUNCTIONS
// ============================================================

async function publishAllNCKMarks() {
    const studentCount = currentNCKStudentsList?.length || 0;
    if (studentCount === 0) {
        showNotification('No students to publish', true);
        return;
    }

    if (!confirm(`PUBLISH ALL NCK marks for "${currentNCKSheetType}" (${studentCount} students)?`)) return;

    showLoading(`Publishing ${studentCount} records...`);

    const block = BLOCK_MAP[currentNCKIntake] || 'Block 1';

    try {
        const { error } = await sb
            .from('nck_marks')
            .update({
                published: true,
                published_at: new Date().toISOString(),
                published_by: window.currentUser?.full_name || 'Admin'
            })
            .eq('academic_year', currentNCKIntake)
            .eq('block', block)
            .eq('subject_name', currentNCKSheetType)
            .eq('program', 'KRCHN');

        if (error) throw error;

        showNotification(`✅ Published ${studentCount} NCK records!`, false);
        await loadNCKData();
        await loadNCKStats();

    } catch (err) {
        console.error('❌ Publish error:', err);
        showNotification(`Error: ${err.message}`, true);
    } finally {
        hideLoading();
    }
}

async function togglePublishNCK(studentId) {
    if (!confirm('Toggle publish status for this student?')) return;

    showLoading('Updating publish status...');

    const block = BLOCK_MAP[currentNCKIntake] || 'Block 1';

    try {
        const { data: current, error: getError } = await sb
            .from('nck_marks')
            .select('published')
            .eq('student_id', studentId)
            .eq('academic_year', currentNCKIntake)
            .eq('block', block)
            .eq('subject_name', currentNCKSheetType)
            .eq('program', 'KRCHN')
            .single();

        if (getError && getError.code !== 'PGRST116') throw getError;

        const currentStatus = current?.published === true || current?.published === 'true';

        const { error } = await sb
            .from('nck_marks')
            .update({
                published: !currentStatus,
                published_at: !currentStatus ? new Date().toISOString() : null,
                published_by: window.currentUser?.full_name || 'Admin'
            })
            .eq('student_id', studentId)
            .eq('academic_year', currentNCKIntake)
            .eq('block', block)
            .eq('subject_name', currentNCKSheetType)
            .eq('program', 'KRCHN');

        if (error) throw error;

        showNotification(`✅ ${!currentStatus ? 'Published' : 'Hidden'} marks!`, false);
        await loadNCKData();

    } catch (err) {
        console.error('❌ Toggle publish error:', err);
        showNotification(`Error: ${err.message}`, true);
    } finally {
        hideLoading();
    }
}

function openNCKStudentPublishModal() {
    const modal = document.getElementById('nckPublishModal');
    if (!modal) {
        showNotification('Modal not found', true);
        return;
    }

    const listContainer = document.getElementById('nckStudentList');
    if (listContainer && currentNCKStudentsList) {
        let html = '';
        currentNCKStudentsList.forEach((student, idx) => {
            const studentId = student.student_id || student.admission_number;
            html += `
                <div class="student-item" style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; gap: 10px;">
                    <input type="checkbox" class="nck-student-checkbox" id="nck_student_${idx}" value="${studentId}">
                    <label for="nck_student_${idx}" style="margin: 0; cursor: pointer; flex: 1; display: flex; justify-content: space-between;">
                        <span><strong>${escapeHtml(student.full_name)}</strong></span>
                        <span style="color: #94a3b8; font-size: 12px;">${escapeHtml(student.admission_number || studentId)}</span>
                    </label>
                </div>
            `;
        });
        listContainer.innerHTML = html;
        currentNCKSelectedStudents = new Set();
        updateSelectedCount();
    }

    modal.style.display = 'flex';
}

async function publishSelectedStudents() {
    const checkboxes = document.querySelectorAll('.nck-student-checkbox:checked');
    if (checkboxes.length === 0) {
        showNotification('Please select at least one student', true);
        return;
    }

    const studentIds = Array.from(checkboxes).map(cb => cb.value);

    if (!confirm(`Publish marks for ${studentIds.length} selected students?`)) return;

    showLoading(`Publishing ${studentIds.length} students...`);

    const block = BLOCK_MAP[currentNCKIntake] || 'Block 1';

    try {
        const { error } = await sb
            .from('nck_marks')
            .update({
                published: true,
                published_at: new Date().toISOString(),
                published_by: window.currentUser?.full_name || 'Admin'
            })
            .in('student_id', studentIds)
            .eq('academic_year', currentNCKIntake)
            .eq('block', block)
            .eq('subject_name', currentNCKSheetType)
            .eq('program', 'KRCHN');

        if (error) throw error;

        showNotification(`✅ Published ${studentIds.length} records!`, false);
        document.getElementById('nckPublishModal').style.display = 'none';
        await loadNCKData();
        await loadNCKStats();

    } catch (err) {
        console.error('❌ Publish selected error:', err);
        showNotification(`Error: ${err.message}`, true);
    } finally {
        hideLoading();
    }
}

function selectAllStudents() {
    document.querySelectorAll('.nck-student-checkbox').forEach(cb => cb.checked = true);
    updateSelectedCount();
}

function deselectAllStudents() {
    document.querySelectorAll('.nck-student-checkbox').forEach(cb => cb.checked = false);
    updateSelectedCount();
}

function filterStudentList() {
    const search = document.getElementById('nckStudentSearch')?.value?.toLowerCase() || '';
    const items = document.querySelectorAll('.student-item');
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(search) ? '' : 'none';
    });
}

function updateSelectedCount() {
    const count = document.querySelectorAll('.nck-student-checkbox:checked').length;
    const countEl = document.getElementById('nckSelectedCount');
    if (countEl) countEl.textContent = `${count} students selected`;
    const publishCount = document.getElementById('nckPublishCount');
    if (publishCount) publishCount.textContent = count;
}

// ============================================================
// FAST ENTRY MODE
// ============================================================

function openFastEntryMode() {
    if (!currentNCKStudentsList || currentNCKStudentsList.length === 0) {
        showNotification('No students loaded. Please load data first.', true);
        return;
    }

    const modal = document.getElementById('nckFastEntryModal');
    if (!modal) {
        showNotification('Fast Entry modal not found', true);
        return;
    }

    const select = document.getElementById('fastStudentSelect');
    if (select) {
        select.innerHTML = currentNCKStudentsList.map((s, i) => 
            `<option value="${i}">${i + 1}. ${escapeHtml(s.full_name)}</option>`
        ).join('');
        select.onchange = function() {
            loadFastEntryFields(parseInt(this.value));
        };
    }

    if (currentNCKStudentsList.length > 0) {
        loadFastEntryFields(0);
    }

    const saveNextBtn = document.getElementById('saveNextBtn');
    if (saveNextBtn) saveNextBtn.onclick = applyFastEntry;
    
    const saveStayBtn = document.getElementById('saveStayBtn');
    if (saveStayBtn) saveStayBtn.onclick = applyFastEntryAndStay;

    document.addEventListener('keydown', handleFastEntryKeyboard);

    modal.style.display = 'flex';
    fastEntryVisible = true;
}

function closeFastEntryModal() {
    const modal = document.getElementById('nckFastEntryModal');
    if (modal) modal.style.display = 'none';
    fastEntryVisible = false;
    document.removeEventListener('keydown', handleFastEntryKeyboard);
}

function handleFastEntryKeyboard(e) {
    if (!fastEntryVisible) return;
    if (e.key === 'Escape') {
        closeFastEntryModal();
    } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        applyFastEntry();
    } else if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        applyFastEntryAndStay();
    }
}

function loadFastEntryFields(studentIdx) {
    const student = currentNCKStudentsList[studentIdx];
    if (!student) return;

    const studentId = student.student_id || student.admission_number;
    const mark = currentNCKMarksMap[studentId] || {};
    let scores = {};
    try {
        if (mark.scores) {
            scores = typeof mark.scores === 'string' ? JSON.parse(mark.scores) : mark.scores;
        }
    } catch (e) {}

    let totalScore = 0, scoredCount = 0;
    currentNCKColumns.forEach(col => {
        const val = parseFloat(scores[col]) || 0;
        if (val > 0) { totalScore += val; scoredCount++; }
    });
    const avg = scoredCount > 0 ? (totalScore / scoredCount) : 0;
    const status = avg > 0 ? (avg >= 60 ? 'PASS' : 'FAIL') : 'PENDING';

    const avgDisplay = document.getElementById('currentAvgDisplay');
    if (avgDisplay) avgDisplay.innerHTML = avg.toFixed(1);
    
    const statusDisplay = document.getElementById('currentStatusDisplay');
    if (statusDisplay) {
        statusDisplay.innerHTML = 
            `<span style="background: ${status === 'PASS' ? '#d1fae5' : (status === 'FAIL' ? '#fee2e2' : '#fef3c7')}; padding: 4px 12px; border-radius: 12px; font-weight: 600; color: ${status === 'PASS' ? '#065f46' : (status === 'FAIL' ? '#991b1b' : '#92400e')};">${status}</span>`;
    }

    const container = document.getElementById('fastEntryFields');
    if (!container) return;

    let html = '';
    CLINICAL_GROUPS.forEach(group => {
        html += `<div class="nck-fast-group"><h4>${group.title}</h4>`;
        for (let i = 0; i < group.cols.length; i++) {
            const colIdx = group.cols[i];
            const colName = group.names[i];
            const val = scores[colName] !== undefined && scores[colName] !== null ? scores[colName] : '';
            html += `
                <div class="field">
                    <label>${colName}:</label>
                    <input type="number" id="fast_${colIdx}" value="${val}" min="0" max="100" step="0.5" 
                           onchange="updateFastPreview(${studentIdx})" onkeypress="handleFastEntryKey(event, ${colIdx})">
                </div>
            `;
        }
        html += `</div>`;
    });

    const gradedBy = mark.graded_by || '';
    html += `
        <div class="nck-fast-grading">
            <h4><i class="fas fa-pen"></i> 📝 Grading Information</h4>
            <div class="field">
                <label>Graded By (Lecturer Name):</label>
                <input type="text" id="fast_graded" value="${escapeHtml(gradedBy)}" placeholder="Enter your name">
            </div>
        </div>
    `;

    container.innerHTML = html;

    const firstInput = container.querySelector('input[type="number"]');
    if (firstInput) setTimeout(() => firstInput.focus(), 100);
}

function updateFastPreview(studentIdx) {
    const student = currentNCKStudentsList[studentIdx];
    if (!student) return;

    let scores = {};
    currentNCKColumns.forEach((col, idx) => {
        const input = document.getElementById(`fast_${idx}`);
        if (input) {
            scores[col] = parseFloat(input.value) || 0;
        }
    });

    let totalScore = 0, scoredCount = 0;
    Object.values(scores).forEach(val => {
        if (val > 0) { totalScore += val; scoredCount++; }
    });
    const avg = scoredCount > 0 ? (totalScore / scoredCount) : 0;
    const status = avg > 0 ? (avg >= 60 ? 'PASS' : 'FAIL') : 'PENDING';

    const avgDisplay = document.getElementById('currentAvgDisplay');
    if (avgDisplay) avgDisplay.innerHTML = avg.toFixed(1);
    
    const statusDisplay = document.getElementById('currentStatusDisplay');
    if (statusDisplay) {
        statusDisplay.innerHTML = 
            `<span style="background: ${status === 'PASS' ? '#d1fae5' : (status === 'FAIL' ? '#fee2e2' : '#fef3c7')}; padding: 4px 12px; border-radius: 12px; font-weight: 600; color: ${status === 'PASS' ? '#065f46' : (status === 'FAIL' ? '#991b1b' : '#92400e')};">${status}</span>`;
    }
}

function handleFastEntryKey(event, colIdx) {
    if (event.key === 'Enter') {
        event.preventDefault();
        const nextCol = colIdx + 1;
        const nextInput = document.getElementById(`fast_${nextCol}`);
        if (nextInput) {
            nextInput.focus();
        } else {
            applyFastEntry();
        }
    }
}

async function applyFastEntry() {
    const select = document.getElementById('fastStudentSelect');
    if (!select) return;
    const studentIdx = parseInt(select.value);
    const student = currentNCKStudentsList[studentIdx];
    if (!student) return;

    const studentId = student.student_id || student.admission_number;
    const scores = {};
    currentNCKColumns.forEach((col, idx) => {
        const input = document.getElementById(`fast_${idx}`);
        if (input) {
            scores[col] = parseFloat(input.value) || 0;
        }
    });

    const gradedInput = document.getElementById('fast_graded');
    const gradedBy = gradedInput?.value || window.currentUser?.full_name || 'Admin';

    await saveSingleStudentMarks(studentId, student.full_name, scores, gradedBy);

    const nextIdx = studentIdx + 1;
    if (nextIdx < currentNCKStudentsList.length) {
        select.value = nextIdx;
        loadFastEntryFields(nextIdx);
        showNotification(`Now entering ${currentNCKStudentsList[nextIdx]?.full_name}`, false);
    } else {
        closeFastEntryModal();
        showNotification('🎉 All students saved!', false);
        await loadNCKData();
    }
}

async function applyFastEntryAndStay() {
    const select = document.getElementById('fastStudentSelect');
    if (!select) return;
    const studentIdx = parseInt(select.value);
    const student = currentNCKStudentsList[studentIdx];
    if (!student) return;

    const studentId = student.student_id || student.admission_number;
    const scores = {};
    currentNCKColumns.forEach((col, idx) => {
        const input = document.getElementById(`fast_${idx}`);
        if (input) {
            scores[col] = parseFloat(input.value) || 0;
        }
    });

    const gradedInput = document.getElementById('fast_graded');
    const gradedBy = gradedInput?.value || window.currentUser?.full_name || 'Admin';

    await saveSingleStudentMarks(studentId, student.full_name, scores, gradedBy);
    showNotification(`✅ Saved ${student.full_name}. Continue editing.`, false);
}

async function saveSingleStudentMarks(studentId, studentName, scores, gradedBy) {
    let totalScore = 0, scoredCount = 0;
    Object.values(scores).forEach(val => {
        if (val > 0) { totalScore += val; scoredCount++; }
    });
    const avg = scoredCount > 0 ? (totalScore / scoredCount) : 0;
    const grade = calculateNursingGrade(avg);
    const status = avg > 0 ? (avg >= 60 ? 'passed' : 'failed') : 'pending';

    const block = BLOCK_MAP[currentNCKIntake] || 'Block 1';

    try {
        const { error } = await sb
            .from('nck_marks')
            .upsert({
                student_id: studentId,
                student_name: studentName || 'Unknown',
                admission_number: studentId,
                academic_year: currentNCKIntake,
                block: block,
                subject_name: currentNCKSheetType,
                program: 'KRCHN',
                scores: JSON.stringify(scores),
                final_score: Math.round(avg * 10) / 10,
                grade: grade,
                status: status,
                graded_by: gradedBy,
                updated_at: new Date().toISOString()
            }, { 
                onConflict: 'student_id, subject_name, academic_year, block, program' 
            });

        if (error) {
            console.error('❌ Error saving:', error);
            showNotification(`Error saving: ${error.message}`, true);
            return false;
        }

        currentNCKMarksMap[studentId] = {
            ...currentNCKMarksMap[studentId],
            scores: JSON.stringify(scores),
            final_score: Math.round(avg * 10) / 10,
            grade: grade,
            status: status,
            graded_by: gradedBy
        };

        return true;
    } catch (err) {
        console.error('❌ Error saving:', err);
        showNotification(`Error saving: ${err.message}`, true);
        return false;
    }
}

// ============================================================
// FILL DOWN
// ============================================================

function fillDownNCKValues() {
    const firstRow = document.querySelector('#nck_marks_table tbody tr');
    if (!firstRow) {
        showNotification('No data to fill down', true);
        return;
    }

    const firstInputs = firstRow.querySelectorAll('.nck-score-input');
    const rows = document.querySelectorAll('#nck_marks_table tbody tr');

    rows.forEach((row, idx) => {
        if (idx === 0) return;
        const inputs = row.querySelectorAll('.nck-score-input');
        inputs.forEach((input, i) => {
            if (firstInputs[i]) {
                input.value = firstInputs[i].value;
                const studentId = input.dataset.student;
                if (studentId) updateNCKAverage(studentId);
            }
        });
    });

    showNotification('Values filled down from first row!', false);
}

// ============================================================
// EXPORT
// ============================================================

async function exportNCKData() {
    showLoading('Exporting NCK data...');

    const block = BLOCK_MAP[currentNCKIntake] || 'Block 1';

    try {
        const { data: marks, error } = await sb
            .from('nck_marks')
            .select('*')
            .eq('academic_year', currentNCKIntake)
            .eq('block', block)
            .eq('subject_name', currentNCKSheetType)
            .eq('program', 'KRCHN');

        if (error) {
            showNotification(`Error: ${error.message}`, true);
            return;
        }

        if (!marks || marks.length === 0) {
            showNotification('No data to export', true);
            return;
        }

        const headers = ['Student ID', 'Student Name', 'Admission', 'Academic Year', 'Block', 'Subject', 'Program', 'Scores', 'Final Score', 'Grade', 'Status', 'Graded By', 'Published'];
        const rows = marks.map(m => [
            m.student_id || '',
            m.student_name || '',
            m.admission_number || '',
            m.academic_year || '',
            m.block || '',
            m.subject_name || '',
            m.program || '',
            m.scores || '',
            m.final_score || '',
            m.grade || '',
            m.status || '',
            m.graded_by || '',
            m.published ? 'Yes' : 'No'
        ]);

        let csv = headers.join(',') + '\n';
        rows.forEach(row => {
            csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nck_marks_${currentNCKSheetType}_${currentNCKIntake}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showNotification('✅ Export complete!', false);

    } catch (err) {
        console.error('❌ Export error:', err);
        showNotification('Error exporting: ' + err.message, true);
    } finally {
        hideLoading();
    }
}

// ============================================================
// EDIT STUDENT
// ============================================================

function editNCKStudent(studentId) {
    const row = document.querySelector(`tr[data-student-id="${studentId}"]`);
    if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        row.style.background = '#fef3c7';
        setTimeout(() => {
            row.style.background = '';
        }, 2000);
    }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function calculateNursingGrade(score) {
    if (score >= 80) return 'A';
    if (score >= 75) return 'A-';
    if (score >= 70) return 'B+';
    if (score >= 65) return 'B';
    if (score >= 60) return 'B-';
    if (score >= 55) return 'C+';
    if (score >= 50) return 'C';
    if (score >= 45) return 'C-';
    if (score >= 40) return 'D+';
    if (score >= 35) return 'D';
    return 'E';
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showNotification(message, isError = false) {
    const container = document.getElementById('notification-container') || document.body;
    
    const notif = document.createElement('div');
    notif.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 24px;
        border-radius: 8px;
        font-weight: 600;
        z-index: 99999;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideInRight 0.3s ease;
        ${isError ? 'background: #fee2e2; color: #991b1b; border: 1px solid #fecaca;' : 'background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0;'}
    `;
    notif.innerHTML = `${isError ? '❌' : '✅'} ${message}`;
    container.appendChild(notif);
    
    setTimeout(() => {
        notif.style.opacity = '0';
        notif.style.transition = 'opacity 0.3s';
        setTimeout(() => notif.remove(), 300);
    }, 4000);
}

function showLoading(message = 'Loading...') {
    const existing = document.querySelector('.nck-loading-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'nck-loading-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99998;
        backdrop-filter: blur(4px);
    `;
    overlay.innerHTML = `
        <div style="background: white; padding: 30px 40px; border-radius: 12px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
            <div style="width: 40px; height: 40px; border: 4px solid #e2e8f0; border-top-color: #4C1D95; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 12px;"></div>
            <p style="margin: 0; font-weight: 600; color: #1e293b;">${message}</p>
        </div>
    `;
    document.body.appendChild(overlay);

    if (!document.getElementById('nck-spinner-keyframes')) {
        const style = document.createElement('style');
        style.id = 'nck-spinner-keyframes';
        style.textContent = `
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
}

function hideLoading() {
    const overlay = document.querySelector('.nck-loading-overlay');
    if (overlay) overlay.remove();
}

// ============================================================
// CSS STYLES
// ============================================================

(function injectNCKStyles() {
    if (document.getElementById('nck-custom-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'nck-custom-styles';
    styles.textContent = `
        .pass-row { background-color: #d1fae5 !important; }
        .fail-row { background-color: #fee2e2 !important; }
        .pending-row { background-color: #fef3c7 !important; }
        .pass-row td:first-child { background-color: #d1fae5 !important; }
        .fail-row td:first-child { background-color: #fee2e2 !important; }
        .pending-row td:first-child { background-color: #fef3c7 !important; }
        .pass-row td:nth-child(2) { background-color: #d1fae5 !important; }
        .fail-row td:nth-child(2) { background-color: #fee2e2 !important; }
        .pending-row td:nth-child(2) { background-color: #fef3c7 !important; }
        .nck-btn:hover { opacity: 0.85; transform: translateY(-1px); transition: all 0.2s; }
        .nck-modal { animation: fadeIn 0.3s ease; }
        @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
        #nck_marks_table tbody tr:hover { background: #f1f5f9 !important; }
        #nck_marks_table tbody tr.pass-row:hover { background: #a7f3d0 !important; }
        #nck_marks_table tbody tr.fail-row:hover { background: #fecaca !important; }
        #nck_marks_table tbody tr.pending-row:hover { background: #fde68a !important; }
        
        .nck-fast-group {
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            padding: 18px;
            background: #fafafa;
        }
        .nck-fast-group h4 {
            margin: 0 0 15px 0;
            color: #667eea;
            font-size: 16px;
        }
        .nck-fast-group .field {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }
        .nck-fast-group .field label {
            font-size: 14px;
            font-weight: 500;
        }
        .nck-fast-group .field input {
            width: 100px;
            padding: 8px;
            border-radius: 8px;
            border: 1px solid #cbd5e1;
            text-align: center;
        }
        .nck-fast-grading {
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            padding: 18px;
            background: #fafafa;
            margin-top: 20px;
        }
        .nck-fast-grading h4 {
            margin: 0 0 15px 0;
            color: #667eea;
            font-size: 16px;
        }
        .nck-fast-grading .field {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .nck-fast-grading .field label {
            font-size: 14px;
            font-weight: 500;
        }
        .nck-fast-grading .field input {
            flex: 1;
            margin-left: 20px;
            padding: 8px;
            border-radius: 8px;
            border: 1px solid #cbd5e1;
        }
        .nck-column-item {
            display: flex;
            align-items: center;
            gap: 8px;
            background: #f8fafc;
            padding: 6px 12px;
            border-radius: 6px;
            border: 1px solid #e5e7eb;
        }
        .nck-column-item .remove-btn {
            background: none;
            border: none;
            color: #ef4444;
            cursor: pointer;
            font-size: 14px;
            margin-left: auto;
        }
        .nck-column-item label {
            font-size: 12px;
            margin: 0;
            cursor: pointer;
        }
        .modal {
            animation: fadeIn 0.3s ease;
        }
    `;
    document.head.appendChild(styles);
})();

// ============================================================
// AUTO-INIT
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🏥 NCK System initializing...');
    const nckSection = document.getElementById('nursing-system');
    if (nckSection) {
        setTimeout(() => {
            loadNCKSystemData();
        }, 500);
    }
});

// ============================================================
// GLOBAL EXPOSURE
// ============================================================

window.loadNCKSystemData = loadNCKSystemData;
window.loadNCKData = loadNCKData;
window.loadNCKStats = loadNCKStats;
window.refreshNCKData = refreshNCKData;
window.buildNCKTable = buildNCKTable;
window.updateNCKAverage = updateNCKAverage;
window.saveAllNCKMarks = saveAllNCKMarks;
window.publishAllNCKMarks = publishAllNCKMarks;
window.togglePublishNCK = togglePublishNCK;
window.openNCKStudentPublishModal = openNCKStudentPublishModal;
window.publishSelectedStudents = publishSelectedStudents;
window.selectAllStudents = selectAllStudents;
window.deselectAllStudents = deselectAllStudents;
window.filterStudentList = filterStudentList;
window.exportNCKData = exportNCKData;
window.addNewColumn = addNewColumn;
window.addNewColumnFromModal = addNewColumnFromModal;
window.removeColumn = removeColumn;
window.toggleColumn = toggleColumn;
window.resetNCKColumns = resetNCKColumns;
window.openColumnManager = openColumnManager;
window.saveColumnSettings = saveColumnSettings;
window.openFastEntryMode = openFastEntryMode;
window.closeFastEntryModal = closeFastEntryModal;
window.fillDownNCKValues = fillDownNCKValues;
window.editNCKStudent = editNCKStudent;
window.calculateNursingGrade = calculateNursingGrade;
window.escapeHtml = escapeHtml;
window.showNotification = showNotification;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.updateIntakeDisplay = updateIntakeDisplay;
window.loadFastEntryFields = loadFastEntryFields;
window.updateFastPreview = updateFastPreview;
window.applyFastEntry = applyFastEntry;
window.applyFastEntryAndStay = applyFastEntryAndStay;
window.handleFastEntryKey = handleFastEntryKey;
window.handleFastEntryKeyboard = handleFastEntryKeyboard;
window.saveSingleStudentMarks = saveSingleStudentMarks;
window.nckLoadManageStudents = nckLoadManageStudents;
window.nckRenderManageStudents = nckRenderManageStudents;
window.nckUpdateStudentSelect = nckUpdateStudentSelect;
window.nckUpdateStats = nckUpdateStats;
window.nckToggleStudent = nckToggleStudent;
window.nckToggleAllStudents = nckToggleAllStudents;
window.nckUpdateDropButton = nckUpdateDropButton;
window.nckOpenAddStudentForm = nckOpenAddStudentForm;
window.nckCloseAddStudentForm = nckCloseAddStudentForm;
window.nckAddSelectedStudent = nckAddSelectedStudent;
window.nckAddAllAvailableStudents = nckAddAllAvailableStudents;
window.nckDropStudent = nckDropStudent;
window.nckDropSelectedStudents = nckDropSelectedStudents;
window.nckRemoveAllStudents = nckRemoveAllStudents;
window.nckRefreshManageStudents = nckRefreshManageStudents;

console.log('✅ NCK System module loaded successfully!');
console.log('🎓 KRCHN Nursing Only - No TVET');
console.log('📊 Features: XY FORMS, ASSESSMENT & CASE, Fast Entry, Manage Students');
console.log('📅 Intake Years: 2024 - 2030');
