// ============================================
// NCK XY FORMS & ASSESSMENT SYSTEM
// COMPLETE SUPER ADMIN MODULE
// ============================================

// ============================================
// GLOBAL VARIABLES
// ============================================

let currentNCKData = [];
let currentNCKStudentsList = [];
let currentNCKColumns = [];
let currentNCKSelectedStudents = [];
let currentNCKSheetType = 'XY_FORMS';
let currentNCKBlock = 'BLOCK_0';
let currentNCKYear = '2025';
let currentNCKProgram = 'KRCHN';

// Default columns for XY FORMS
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

// ============================================
// MAIN LOAD FUNCTIONS
// ============================================

function loadNCKSystemData() {
    console.log('🏥 Loading NCK System...');
    loadNCKStats();
    loadNCKData();
}

async function loadNCKStats() {
    try {
        // Get total students
        const { data: students, error: sError } = await sb
            .from('consolidated_user_profiles_table')
            .select('student_id', { count: 'exact' })
            .eq('role', 'student')
            .eq('status', 'approved');

        if (!sError) {
            document.getElementById('nck_total_students').textContent = students?.length || 0;
        }

        // Get NCK marks
        const { data: nckMarks, error: nError } = await sb
            .from('nck_marks')
            .select('final_score, published');

        if (!nError && nckMarks) {
            let totalScore = 0;
            let scoredCount = 0;
            let passedCount = 0;
            let publishedCount = 0;

            nckMarks.forEach(m => {
                const score = parseFloat(m.final_score) || 0;
                if (score > 0) {
                    totalScore += score;
                    scoredCount++;
                    if (score >= 60) passedCount++;
                }
                if (m.published) publishedCount++;
            });

            const avgScore = scoredCount > 0 ? (totalScore / scoredCount).toFixed(1) : 0;
            const passRate = scoredCount > 0 ? ((passedCount / scoredCount) * 100).toFixed(1) : 0;

            document.getElementById('nck_pass_rate').textContent = `${passRate}%`;
            document.getElementById('nck_avg_score').textContent = `${avgScore}%`;
            document.getElementById('nck_at_risk').textContent = scoredCount - passedCount;
            document.getElementById('nck_published_count').textContent = publishedCount;
        }

    } catch (err) {
        console.error('Error loading NCK stats:', err);
    }
}

async function loadNCKData() {
    // Get filter values
    currentNCKYear = document.getElementById('nck_year_select')?.value || '2025';
    currentNCKBlock = document.getElementById('nck_block_select')?.value || 'BLOCK_0';
    currentNCKSheetType = document.getElementById('nck_sheet_select')?.value || 'XY_FORMS';
    currentNCKProgram = document.getElementById('nck_program_select')?.value || 'KRCHN';

    const container = document.getElementById('nck_table_container');
    const placeholder = document.getElementById('nckPlaceholder');
    const dynamicContent = document.getElementById('nckDynamicContent');

    if (!container) return;

    // Show loading
    container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #94a3b8;">
            <i class="fas fa-spinner fa-spin" style="font-size: 24px;"></i>
            <p style="margin-top: 10px;">Loading NCK data...</p>
        </div>
    `;

    try {
        // Get students in this block and program
        const { data: students, error: sError } = await sb
            .from('consolidated_user_profiles_table')
            .select('student_id, full_name, admission_number')
            .eq('role', 'student')
            .eq('status', 'approved')
            .eq('block', currentNCKBlock)
            .eq('program', currentNCKProgram);

        if (sError) throw sError;

        if (!students || students.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #94a3b8;">
                    <i class="fas fa-users" style="font-size: 32px;"></i>
                    <p style="margin-top: 10px;">No students found in this block/program</p>
                </div>
            `;
            if (placeholder) placeholder.style.display = 'block';
            if (dynamicContent) dynamicContent.style.display = 'none';
            return;
        }

        currentNCKStudentsList = students;

        // Update student count
        const studentCountEl = document.getElementById('nck_student_count');
        if (studentCountEl) studentCountEl.textContent = students.length;
        
        const blockStudentsEl = document.getElementById('nck_block_students');
        if (blockStudentsEl) blockStudentsEl.textContent = students.length;

        // Get existing NCK marks
        const { data: existingMarks, error: mError } = await sb
            .from('nck_marks')
            .select('*')
            .eq('block', currentNCKBlock)
            .eq('subject_name', currentNCKSheetType)
            .eq('program', currentNCKProgram);

        if (mError) throw mError;

        const marksMap = {};
        existingMarks?.forEach(m => {
            marksMap[m.admission_number] = m;
        });

        // Determine columns based on sheet type
        let columns = [];
        if (currentNCKSheetType === 'XY_FORMS') {
            columns = [...DEFAULT_XY_COLUMNS];
        } else {
            columns = [...DEFAULT_ASSESSMENT_COLUMNS];
        }

        // Load column settings from localStorage
        const savedColumns = localStorage.getItem(`nck_columns_${currentNCKSheetType}_${currentNCKBlock}`);
        if (savedColumns) {
            try {
                const parsed = JSON.parse(savedColumns);
                if (parsed.length > 0) {
                    columns = parsed;
                }
            } catch (e) {}
        }

        currentNCKColumns = columns;
        
        const columnCountEl = document.getElementById('nck_column_count');
        if (columnCountEl) columnCountEl.textContent = columns.length;
        
        const blockColumnsEl = document.getElementById('nck_block_columns');
        if (blockColumnsEl) blockColumnsEl.textContent = columns.length;

        // Update title
        const title = document.getElementById('nck_table_title');
        if (title) {
            title.textContent = currentNCKSheetType === 'XY_FORMS' ? 
                'NCK XY Forms - Clinical Evaluation' : 
                'NCK Assessment & Case - Written Assessments';
        }

        // Update legend visibility
        const xyLegend = document.getElementById('nck_xy_legend');
        const assessmentLegend = document.getElementById('nck_assessment_legend');
        if (xyLegend && assessmentLegend) {
            xyLegend.style.display = currentNCKSheetType === 'XY_FORMS' ? 'flex' : 'none';
            assessmentLegend.style.display = currentNCKSheetType === 'ASSESSMENT_CASE' ? 'flex' : 'none';
        }

        // Build table
        buildNCKTable(students, marksMap, columns);

        // Show content
        if (placeholder) placeholder.style.display = 'none';
        if (dynamicContent) dynamicContent.style.display = 'block';

        // Load column settings in sidebar
        loadColumnSettings(columns);

        // Update block info
        const blockInfo = document.getElementById('nck_block_info');
        if (blockInfo) {
            blockInfo.style.display = 'block';
        }

    } catch (err) {
        console.error('Error loading NCK data:', err);
        container.innerHTML = `
            <div class="alert alert-danger" style="padding: 20px; border-radius: 8px;">
                <i class="fas fa-exclamation-triangle"></i> Error loading data: ${err.message}
            </div>
        `;
    }
}

// ============================================
// TABLE BUILDING FUNCTIONS
// ============================================

function buildNCKTable(students, marksMap, columns) {
    const container = document.getElementById('nck_table_container');
    if (!container) return;

    let html = `
        <table id="nck_marks_table" class="table table-bordered table-striped" style="min-width: ${800 + (columns.length * 70)}px; font-size: 13px; border-collapse: collapse;">
            <thead>
                <tr style="background: linear-gradient(135deg, #4C1D95, #7c3aed); color: white;">
                    <th style="position: sticky; left: 0; background: #4C1D95; padding: 10px 8px; text-align: center; min-width: 35px; z-index: 2;">#</th>
                    <th style="position: sticky; left: 35px; background: #4C1D95; padding: 10px 8px; text-align: left; min-width: 180px; z-index: 2;">Student Name</th>
                    <th style="position: sticky; left: 215px; background: #4C1D95; padding: 10px 8px; text-align: left; min-width: 120px; z-index: 2;">Admission</th>
    `;

    // Add column headers
    columns.forEach(col => {
        html += `<th style="padding: 10px 4px; text-align: center; min-width: 60px; font-size: 11px; background: #6d28d9;" data-column="${escapeHtml(col)}">${escapeHtml(col)}</th>`;
    });

    html += `
                    <th style="padding: 10px 8px; text-align: center; background: #059669; min-width: 50px;">Avg</th>
                    <th style="padding: 10px 8px; text-align: center; background: #FDB913; min-width: 70px;">Status</th>
                    <th style="padding: 10px 8px; text-align: center; background: #4C1D95; min-width: 120px;">Graded By</th>
                    <th style="padding: 10px 8px; text-align: center; background: #8b5cf6; min-width: 80px;">📤 Publish</th>
                </tr>
            </thead>
            <tbody>
    `;

    // Build rows
    students.forEach((student, idx) => {
        const mark = marksMap[student.student_id] || {};
        const scores = mark.scores ? JSON.parse(mark.scores) : {};
        const gradedBy = mark.graded_by || '';
        const published = mark.published || false;

        // Calculate average
        let totalScore = 0;
        let scoredCount = 0;
        columns.forEach(col => {
            const val = parseFloat(scores[col]) || 0;
            if (val > 0) {
                totalScore += val;
                scoredCount++;
            }
        });
        const avg = scoredCount > 0 ? (totalScore / scoredCount).toFixed(1) : 0;
        const status = avg > 0 ? (avg >= 60 ? 'PASS' : 'FAIL') : 'PENDING';
        const statusClass = status === 'PASS' ? 'pass-row' : (status === 'FAIL' ? 'fail-row' : 'pending-row');
        const bgColor = status === 'PASS' ? '#d1fae5' : (status === 'FAIL' ? '#fee2e2' : '#fef3c7');

        html += `
            <tr class="${statusClass}" data-student-id="${student.student_id}" style="border-bottom: 1px solid #e5e7eb;">
                <td style="position: sticky; left: 0; background: white; padding: 8px 6px; text-align: center; font-weight: 500; z-index: 1;">${idx + 1}</td>
                <td style="position: sticky; left: 35px; background: white; padding: 8px 6px; font-weight: 600; z-index: 1;">
                    <span style="cursor: pointer; color: #4C1D95; text-decoration: underline;" onclick="editNCKStudent('${student.student_id}')">
                        ${escapeHtml(student.full_name)} <i class="fas fa-edit" style="font-size: 10px;"></i>
                    </span>
                </td>
                <td style="position: sticky; left: 215px; background: white; padding: 8px 6px; font-weight: 500; z-index: 1; font-size: 12px; color: #64748b;">
                    ${escapeHtml(student.student_id)}
                </td>
        `;

        // Add score inputs for each column
        columns.forEach(col => {
            const val = scores[col] !== undefined && scores[col] !== null ? scores[col] : '';
            const hasValue = val !== '' && parseFloat(val) > 0;
            const inputBg = hasValue ? '#d1fae5' : '#fff3e0';
            html += `
                <td style="padding: 4px; text-align: center;">
                    <input type="number" 
                           class="nck-score-input" 
                           data-student="${student.student_id}" 
                           data-column="${escapeHtml(col)}"
                           value="${val}" 
                           min="0" 
                           max="100" 
                           step="0.5" 
                           style="width: 60px; padding: 4px; border-radius: 6px; text-align: center; background: ${inputBg}; border: 1px solid ${hasValue ? '#d1fae5' : '#fef3c7'}; font-size: 12px;" 
                           onchange="updateNCKAverage('${student.student_id}')">
                </td>
            `;
        });

        // Add average, status, graded by, publish
        html += `
                <td style="font-weight: bold; text-align: center; background: ${bgColor};" class="nck-avg-cell" id="nck_avg_${student.student_id}">${avg}</td>
                <td style="text-align: center;" class="nck-status-cell" id="nck_status_${student.student_id}">
                    <span class="badge" style="background: ${bgColor}; color: ${status === 'PASS' ? '#065f46' : (status === 'FAIL' ? '#991b1b' : '#92400e')}; padding: 4px 12px; border-radius: 12px; font-weight: 600; font-size: 12px;">${status}</span>
                </td>
                <td style="text-align: center;">
                    <input type="text" class="nck-graded-input" data-student="${student.student_id}" value="${escapeHtml(gradedBy)}" placeholder="Lecturer" style="width: 120px; padding: 4px 8px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 12px;">
                </td>
                <td style="text-align: center;">
                    <button onclick="togglePublishNCK('${student.student_id}')" class="btn-action" style="background: ${published ? '#10b981' : '#8b5cf6'}; color: white; padding: 4px 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">
                        <i class="fas ${published ? 'fa-eye' : 'fa-eye-slash'}"></i> ${published ? 'Published' : 'Publish'}
                    </button>
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

// ============================================
// COLUMN SETTINGS FUNCTIONS
// ============================================

function loadColumnSettings(columns) {
    const container = document.getElementById('nck_column_settings');
    if (!container) return;

    let html = '';
    columns.forEach(col => {
        html += `
            <div style="display: flex; align-items: center; gap: 8px; background: #f8fafc; padding: 6px 12px; border-radius: 6px; border: 1px solid #e5e7eb;">
                <input type="checkbox" class="nck-column-toggle" id="col_${escapeHtml(col)}" checked value="${escapeHtml(col)}" onchange="toggleColumn('${escapeHtml(col)}')">
                <label for="col_${escapeHtml(col)}" style="font-size: 12px; margin: 0; cursor: pointer;">${escapeHtml(col)}</label>
                <button onclick="removeColumn('${escapeHtml(col)}')" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 14px; margin-left: auto;">&times;</button>
            </div>
        `;
    });

    container.innerHTML = html;
}

function toggleColumn(columnName) {
    const checkbox = document.getElementById(`col_${escapeHtml(columnName)}`);
    if (!checkbox) return;

    // Update column visibility in table
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

    // Remove from table
    const inputs = document.querySelectorAll(`.nck-score-input[data-column="${columnName}"]`);
    inputs.forEach(input => {
        input.parentElement.remove();
    });

    const settingDiv = document.querySelector(`[id="col_${escapeHtml(columnName)}"]`)?.closest('div');
    if (settingDiv) settingDiv.remove();

    document.getElementById('nck_column_count').textContent = currentNCKColumns.length;
    document.getElementById('nck_block_columns').textContent = currentNCKColumns.length;

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
    const rows = document.querySelectorAll('#nck_marks_table tbody tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const avgCell = cells[cells.length - 4];
        if (avgCell) {
            const td = document.createElement('td');
            td.style.padding = '4px';
            td.style.textAlign = 'center';
            td.innerHTML = `
                <input type="number" 
                       class="nck-score-input" 
                       data-student="${row.dataset.studentId}" 
                       data-column="${cleanName}"
                       value="" 
                       min="0" 
                       max="100" 
                       step="0.5" 
                       style="width: 60px; padding: 4px; border-radius: 6px; text-align: center; background: #fff3e0; border: 1px solid #fef3c7; font-size: 12px;" 
                       onchange="updateNCKAverage('${row.dataset.studentId}')">
            `;
            avgCell.parentNode.insertBefore(td, avgCell);
        }
    });

    // Add to header
    const headerRow = document.querySelector('#nck_marks_table thead tr:first-child');
    if (headerRow) {
        const avgTh = headerRow.querySelector('th:nth-last-child(4)');
        if (avgTh) {
            const th = document.createElement('th');
            th.dataset.column = cleanName;
            th.style.padding = '10px 4px';
            th.style.textAlign = 'center';
            th.style.minWidth = '60px';
            th.style.fontSize = '11px';
            th.style.background = '#6d28d9';
            th.textContent = cleanName;
            avgTh.parentNode.insertBefore(th, avgTh);
        }
    }

    // Add to settings
    const settingsContainer = document.getElementById('nck_column_settings');
    if (settingsContainer) {
        const div = document.createElement('div');
        div.style.cssText = 'display: flex; align-items: center; gap: 8px; background: #f8fafc; padding: 6px 12px; border-radius: 6px; border: 1px solid #e5e7eb;';
        div.innerHTML = `
            <input type="checkbox" class="nck-column-toggle" id="col_${cleanName}" checked value="${cleanName}" onchange="toggleColumn('${cleanName}')">
            <label for="col_${cleanName}" style="font-size: 12px; margin: 0; cursor: pointer;">${cleanName}</label>
            <button onclick="removeColumn('${cleanName}')" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 14px; margin-left: auto;">&times;</button>
        `;
        settingsContainer.appendChild(div);
    }

    document.getElementById('nck_column_count').textContent = currentNCKColumns.length;
    document.getElementById('nck_block_columns').textContent = currentNCKColumns.length;

    saveColumnSettingsToStorage();
    showNotification(`Column "${cleanName}" added!`, false);
}

function resetNCKColumns() {
    if (!confirm('Reset columns to default for this assessment type?')) return;

    const defaultCols = currentNCKSheetType === 'XY_FORMS' ? 
        [...DEFAULT_XY_COLUMNS] : [...DEFAULT_ASSESSMENT_COLUMNS];

    currentNCKColumns = defaultCols;
    document.getElementById('nck_column_count').textContent = currentNCKColumns.length;
    document.getElementById('nck_block_columns').textContent = currentNCKColumns.length;

    saveColumnSettingsToStorage();
    loadNCKData();
    showNotification('Columns reset to default!', false);
}

function saveColumnSettingsToStorage() {
    localStorage.setItem(
        `nck_columns_${currentNCKSheetType}_${currentNCKBlock}`,
        JSON.stringify(currentNCKColumns)
    );
}

// ============================================
// AUTO-CALCULATION FUNCTIONS
// ============================================

function updateNCKAverage(studentId) {
    const inputs = document.querySelectorAll(`.nck-score-input[data-student="${studentId}"]`);
    let totalScore = 0;
    let scoredCount = 0;

    inputs.forEach(input => {
        const val = parseFloat(input.value) || 0;
        if (val > 0) {
            totalScore += val;
            scoredCount++;
        }
        input.style.background = val > 0 ? '#d1fae5' : '#fff3e0';
        input.style.borderColor = val > 0 ? '#d1fae5' : '#fef3c7';
    });

    const avg = scoredCount > 0 ? (totalScore / scoredCount).toFixed(1) : 0;
    const status = avg > 0 ? (avg >= 60 ? 'PASS' : 'FAIL') : 'PENDING';
    const bgColor = status === 'PASS' ? '#d1fae5' : (status === 'FAIL' ? '#fee2e2' : '#fef3c7');
    const textColor = status === 'PASS' ? '#065f46' : (status === 'FAIL' ? '#991b1b' : '#92400e');

    const avgCell = document.getElementById(`nck_avg_${studentId}`);
    if (avgCell) {
        avgCell.textContent = avg;
        avgCell.style.background = bgColor;
    }

    const statusCell = document.getElementById(`nck_status_${studentId}`);
    if (statusCell) {
        statusCell.innerHTML = `
            <span class="badge" style="background: ${bgColor}; color: ${textColor}; padding: 4px 12px; border-radius: 12px; font-weight: 600; font-size: 12px;">${status}</span>
        `;
    }
}

// ============================================
// SAVE FUNCTIONS
// ============================================

async function saveAllNCKMarks() {
    const students = currentNCKStudentsList;
    if (!students || students.length === 0) {
        showNotification('No data to save', true);
        return;
    }

    showLoading('Saving all NCK marks...');
    let savedCount = 0;

    for (const student of students) {
        const scores = {};
        const inputs = document.querySelectorAll(`.nck-score-input[data-student="${student.student_id}"]`);

        inputs.forEach(input => {
            const column = input.dataset.column;
            const val = parseFloat(input.value) || 0;
            scores[column] = val;
        });

        let totalScore = 0;
        let scoredCount = 0;
        Object.values(scores).forEach(val => {
            if (val > 0) {
                totalScore += val;
                scoredCount++;
            }
        });
        const avg = scoredCount > 0 ? (totalScore / scoredCount) : 0;
        const grade = calculateNursingGrade(avg);
        const status = avg > 0 ? (avg >= 60 ? 'passed' : 'failed') : 'pending';

        const gradedInput = document.querySelector(`.nck-graded-input[data-student="${student.student_id}"]`);
        const gradedBy = gradedInput?.value || 'Admin';

        try {
            const { error } = await sb
                .from('nck_marks')
                .upsert({
                    admission_number: student.student_id,
                    student_name: student.full_name,
                    block: currentNCKBlock,
                    subject_name: currentNCKSheetType,
                    program: currentNCKProgram,
                    scores: JSON.stringify(scores),
                    final_score: Math.round(avg * 10) / 10,
                    grade: grade,
                    status: status,
                    graded_by: gradedBy,
                    academic_year: currentNCKYear,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'admission_number,subject_name,block' });

            if (!error) savedCount++;
        } catch (err) {
            console.error('Error saving student:', student.student_id, err);
        }
    }

    hideLoading();
    showNotification(`✅ Saved ${savedCount} records!`, false);
    await loadNCKStats();
}

// ============================================
// PUBLISH FUNCTIONS
// ============================================

async function publishAllNCKMarks() {
    const studentCount = currentNCKStudentsList?.length || 0;
    if (!confirm(`PUBLISH ALL NCK marks for "${currentNCKSheetType}" (${studentCount} students)?`)) return;

    showLoading(`Publishing ${studentCount} records...`);

    try {
        const { error } = await sb
            .from('nck_marks')
            .update({
                published: true,
                published_at: new Date().toISOString(),
                published_by: window.currentUser?.username || 'Admin'
            })
            .eq('block', currentNCKBlock)
            .eq('subject_name', currentNCKSheetType)
            .eq('program', currentNCKProgram);

        if (error) throw error;

        showNotification(`✅ Published ${studentCount} NCK records!`, false);
        await loadNCKData();
        await loadNCKStats();

    } catch (err) {
        showNotification(`Error: ${err.message}`, true);
    } finally {
        hideLoading();
    }
}

async function togglePublishNCK(studentId) {
    const confirmMsg = confirm('Toggle publish status for this student?');
    if (!confirmMsg) return;

    showLoading('Updating publish status...');

    try {
        // Get current status first
        const { data: current, error: getError } = await sb
            .from('nck_marks')
            .select('published')
            .eq('admission_number', studentId)
            .eq('block', currentNCKBlock)
            .eq('subject_name', currentNCKSheetType)
            .single();

        if (getError && getError.code !== 'PGRST116') throw getError;

        const currentStatus = current?.published || false;

        const { error } = await sb
            .from('nck_marks')
            .update({
                published: !currentStatus,
                published_at: !currentStatus ? new Date().toISOString() : null,
                published_by: window.currentUser?.username || 'Admin'
            })
            .eq('admission_number', studentId)
            .eq('block', currentNCKBlock)
            .eq('subject_name', currentNCKSheetType);

        if (error) throw error;

        showNotification(`✅ ${!currentStatus ? 'Published' : 'Hidden'} marks!`, false);
        await loadNCKData();

    } catch (err) {
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

    // Populate student list
    const listContainer = document.getElementById('nckStudentList');
    if (listContainer && currentNCKStudentsList) {
        let html = '';
        currentNCKStudentsList.forEach((student, idx) => {
            html += `
                <div class="student-item" style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; gap: 10px;">
                    <input type="checkbox" class="nck-student-checkbox" id="nck_student_${idx}" value="${student.student_id}">
                    <label for="nck_student_${idx}" style="margin: 0; cursor: pointer; flex: 1;">
                        <strong>${escapeHtml(student.full_name)}</strong>
                        <span style="color: #94a3b8; font-size: 12px; margin-left: 10px;">${escapeHtml(student.student_id)}</span>
                    </label>
                </div>
            `;
        });
        listContainer.innerHTML = html;
    }

    modal.style.display = 'block';
}

async function publishSelectedStudents() {
    const checkboxes = document.querySelectorAll('.nck-student-checkbox:checked');
    if (checkboxes.length === 0) {
        showNotification('Please select at least one student', true);
        return;
    }

    const studentIds = Array.from(checkboxes).map(cb => cb.value);

    showLoading(`Publishing ${studentIds.length} students...`);

    try {
        const { error } = await sb
            .from('nck_marks')
            .update({
                published: true,
                published_at: new Date().toISOString(),
                published_by: window.currentUser?.username || 'Admin'
            })
            .in('admission_number', studentIds)
            .eq('block', currentNCKBlock)
            .eq('subject_name', currentNCKSheetType);

        if (error) throw error;

        showNotification(`✅ Published ${studentIds.length} records!`, false);
        document.getElementById('nckPublishModal').style.display = 'none';
        await loadNCKData();
        await loadNCKStats();

    } catch (err) {
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

// ============================================
// HELPER FUNCTIONS
// ============================================

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

function editNCKStudent(studentId) {
    // Find the student row and scroll to it
    const row = document.querySelector(`tr[data-student-id="${studentId}"]`);
    if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        row.style.background = '#fef3c7';
        setTimeout(() => {
            row.style.background = '';
        }, 2000);
    }
}

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

    showNotification('Values filled down!', false);
}

function openFastEntryMode() {
    const modal = document.getElementById('nckFastEntryModal');
    if (!modal) {
        showNotification('Fast Entry modal not found', true);
        return;
    }

    const container = document.getElementById('nckFastEntryContainer');
    if (container) {
        // Build a simplified table for fast entry
        let html = `
            <table class="table table-bordered table-striped" style="font-size: 13px;">
                <thead>
                    <tr style="background: #4C1D95; color: white;">
                        <th>#</th>
                        <th>Student</th>
        `;
        
        currentNCKColumns.forEach(col => {
            html += `<th style="font-size: 11px;">${escapeHtml(col)}</th>`;
        });
        
        html += `
                        <th>Avg</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
        `;

        currentNCKStudentsList.forEach((student, idx) => {
            html += `
                <tr>
                    <td>${idx + 1}</td>
                    <td><strong>${escapeHtml(student.full_name)}</strong></td>
            `;
            
            currentNCKColumns.forEach(col => {
                html += `
                    <td>
                        <input type="number" class="fast-score-input" data-student="${student.student_id}" data-column="${escapeHtml(col)}" 
                               min="0" max="100" step="0.5" style="width: 50px; padding: 4px; text-align: center; border-radius: 4px; border: 1px solid #e2e8f0;">
                    </td>
                `;
            });
            
            html += `
                    <td id="fast_avg_${idx}">-</td>
                    <td id="fast_status_${idx}" class="text-warning">PENDING</td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        container.innerHTML = html;
    }

    modal.style.display = 'block';
}

async function saveFastEntryMarks() {
    const inputs = document.querySelectorAll('.fast-score-input');
    if (inputs.length === 0) {
        showNotification('No data to save', true);
        return;
    }

    showLoading('Saving fast entry marks...');
    let savedCount = 0;

    // Group inputs by student
    const studentData = {};
    inputs.forEach(input => {
        const studentId = input.dataset.student;
        const column = input.dataset.column;
        const val = parseFloat(input.value) || 0;
        if (!studentData[studentId]) studentData[studentId] = {};
        studentData[studentId][column] = val;
    });

    for (const [studentId, scores] of Object.entries(studentData)) {
        const student = currentNCKStudentsList.find(s => s.student_id === studentId);
        if (!student) continue;

        let totalScore = 0;
        let scoredCount = 0;
        Object.values(scores).forEach(val => {
            if (val > 0) {
                totalScore += val;
                scoredCount++;
            }
        });
        const avg = scoredCount > 0 ? (totalScore / scoredCount) : 0;
        const grade = calculateNursingGrade(avg);
        const status = avg > 0 ? (avg >= 60 ? 'passed' : 'failed') : 'pending';

        try {
            const { error } = await sb
                .from('nck_marks')
                .upsert({
                    admission_number: studentId,
                    student_name: student.full_name,
                    block: currentNCKBlock,
                    subject_name: currentNCKSheetType,
                    program: currentNCKProgram,
                    scores: JSON.stringify(scores),
                    final_score: Math.round(avg * 10) / 10,
                    grade: grade,
                    status: status,
                    graded_by: window.currentUser?.username || 'Admin',
                    academic_year: currentNCKYear,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'admission_number,subject_name,block' });

            if (!error) savedCount++;
        } catch (err) {
            console.error('Error saving fast entry:', err);
        }
    }

    hideLoading();
    showNotification(`✅ Saved ${savedCount} records!`, false);
    document.getElementById('nckFastEntryModal').style.display = 'none';
    await loadNCKData();
    await loadNCKStats();
}

function openColumnManager() {
    const modal = document.getElementById('nckColumnModal');
    if (modal) modal.style.display = 'block';
}

function addNewColumnFromModal() {
    const input = document.getElementById('nckNewColumnName');
    if (!input || !input.value.trim()) {
        showNotification('Please enter a column name', true);
        return;
    }
    addNewColumn();
    input.value = '';
}

function saveColumnSettings() {
    saveColumnSettingsToStorage();
    showNotification('Column settings saved!', false);
    document.getElementById('nckColumnModal').style.display = 'none';
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

async function exportNCKData() {
    const { data: marks, error } = await sb
        .from('nck_marks')
        .select('*')
        .eq('block', currentNCKBlock)
        .eq('subject_name', currentNCKSheetType)
        .eq('program', currentNCKProgram);

    if (error) {
        showNotification(`Error: ${error.message}`, true);
        return;
    }

    if (!marks || marks.length === 0) {
        showNotification('No data to export', true);
        return;
    }

    const headers = ['Admission', 'Student Name', 'Block', 'Subject', 'Scores', 'Final Score', 'Grade', 'Status', 'Graded By', 'Published'];
    const rows = marks.map(m => [
        m.admission_number || '',
        m.student_name || '',
        m.block || '',
        m.subject_name || '',
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

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nck_marks_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Export complete!', false);
}

// ============================================
// INITIALIZATION
// ============================================

console.log('✅ NCK System module loaded');

// Make all functions globally accessible
window.loadNCKSystemData = loadNCKSystemData;
window.loadNCKData = loadNCKData;
window.loadNCKStats = loadNCKStats;
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
window.saveFastEntryMarks = saveFastEntryMarks;
window.fillDownNCKValues = fillDownNCKValues;
window.editNCKStudent = editNCKStudent;
window.calculateNursingGrade = calculateNursingGrade;
window.escapeHtml = escapeHtml;
