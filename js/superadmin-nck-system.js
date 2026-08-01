// ============================================
// NCK XY FORMS & ASSESSMENT SYSTEM
// COMPLETE UPDATED SCRIPT - ALL BUTTONS WORKING
// WITH BLOCK 1, FAST ENTRY, PUBLISH, COLUMNS
// ============================================

// ============================================
// GLOBAL VARIABLES
// ============================================

let currentNCKStudentsList = [];
let currentNCKColumns = [];
let currentNCKSelectedStudents = new Set();
let currentNCKSheetType = 'XY_FORMS';
let currentNCKBlock = 'Introductory';
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

// ============================================
// MAIN LOAD FUNCTIONS - REFRESH DATA
// ============================================

function loadNCKSystemData() {
    console.log('🏥 Loading NCK System...');
    loadNCKStats();
    loadNCKData();
}

// REFRESH DATA BUTTON - Main refresh function
async function refreshNCKData() {
    console.log('🔄 Refreshing NCK data...');
    showLoading('Refreshing NCK data...');
    
    try {
        // Clear caches
        currentNCKMarksMap = {};
        currentNCKStudentsList = [];
        
        // Reload everything
        await loadNCKStats();
        await loadNCKData();
        
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
        // Get total students
        const { data: students, error: sError } = await sb
            .from('consolidated_user_profiles_table')
            .select('student_id', { count: 'exact' })
            .eq('role', 'student')
            .eq('status', 'approved');

        if (sError) {
            console.error('❌ Error loading student stats:', sError);
            return;
        }

        const totalStudents = students?.length || 0;
        const totalEl = document.getElementById('nck_total_students');
        if (totalEl) totalEl.textContent = totalStudents;

        // Get NCK marks
        const { data: nckMarks, error: nError } = await sb
            .from('nck_marks')
            .select('final_score, published, status');

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
    // Get filter values
    const blockSelect = document.getElementById('nck_block_select');
    const sheetSelect = document.getElementById('nck_sheet_select');
    const programSelect = document.getElementById('nck_program_select');

    currentNCKBlock = blockSelect?.value || 'Introductory';
    currentNCKSheetType = sheetSelect?.value || 'XY_FORMS';
    currentNCKProgram = programSelect?.value || 'KRCHN';

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
        console.log(`📊 Loading: Block=${currentNCKBlock}, Sheet=${currentNCKSheetType}, Program=${currentNCKProgram}`);

        // Get students from profiles table
        const { data: students, error: sError } = await sb
            .from('consolidated_user_profiles_table')
            .select('student_id, full_name, admission_number, block, program, status')
            .eq('role', 'student')
            .eq('status', 'approved')
            .eq('block', currentNCKBlock)
            .eq('program', currentNCKProgram);

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
                    <p style="margin-top: 10px;">No students found for ${currentNCKBlock} - ${currentNCKProgram}</p>
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

        // Get NCK marks
        const { data: marks, error: mError } = await sb
            .from('nck_marks')
            .select('id, student_id, full_name, block, subject_name, program, scores, final_score, grade, status, graded_by, published, published_at')
            .eq('block', currentNCKBlock)
            .eq('subject_name', currentNCKSheetType)
            .eq('program', currentNCKProgram);

        if (mError) {
            console.error('❌ Error loading NCK marks:', mError);
        }

        console.log(`✅ Found ${marks?.length || 0} NCK marks`);

        // Build marks map
        currentNCKMarksMap = {};
        if (marks) {
            marks.forEach(m => {
                currentNCKMarksMap[m.student_id] = m;
            });
        }

        // Get columns
        let columns = [];
        const savedColumns = localStorage.getItem(`nck_columns_${currentNCKSheetType}_${currentNCKBlock}`);
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
        
        const columnCount2El = document.getElementById('nck_column_count_2');
        if (columnCount2El) columnCount2El.textContent = columns.length;
        
        const blockColumnsEl = document.getElementById('nck_block_columns');
        if (blockColumnsEl) blockColumnsEl.textContent = columns.length;

        // Update titles
        updateBlockDisplay();

        // Build table
        buildNCKTable(students, currentNCKMarksMap, columns);

        // Load column settings
        loadColumnSettings(columns);

        if (placeholder) placeholder.style.display = 'none';
        if (dynamicContent) dynamicContent.style.display = 'block';

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

function updateBlockDisplay() {
    const blockLabels = {
        'Introductory': { label: 'Introductory', type: 'Foundation Block' },
        'Block 1': { label: 'Block 1', type: 'Year 1 Term 1' },
        'Block 2': { label: 'Block 2', type: 'Block 2' },
        'Block 3': { label: 'Block 3', type: 'Block 3' },
        'Block 4': { label: 'Block 4', type: 'Block 4' },
        'Block 5': { label: 'Block 5', type: 'Block 5' }
    };

    const info = blockLabels[currentNCKBlock] || { label: currentNCKBlock, type: 'Block' };

    const labelEl = document.getElementById('nck_current_block_label');
    if (labelEl) labelEl.textContent = info.label;

    const typeEl = document.getElementById('nck_block_type_label');
    if (typeEl) typeEl.textContent = info.type;

    const displayEl = document.getElementById('nck_current_block_display');
    if (displayEl) displayEl.textContent = info.label;

    const typeDisplayEl = document.getElementById('nck_block_type_display');
    if (typeDisplayEl) typeDisplayEl.textContent = info.type;
}

// ============================================
// TABLE BUILDING
// ============================================

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

    const tableWidth = 400 + (columns.length * 70);

    let html = `
        <table id="nck_marks_table" style="width: 100%; min-width: ${tableWidth}px; border-collapse: collapse; font-size: 13px;">
            <thead>
                <tr style="background: linear-gradient(135deg, #4C1D95, #7c3aed); color: white;">
                    <th style="position: sticky; left: 0; background: #4C1D95; padding: 10px 6px; text-align: center; min-width: 35px; z-index: 3;" rowspan="2">#</th>
                    <th style="position: sticky; left: 35px; background: #4C1D95; padding: 10px 6px; text-align: left; min-width: 160px; z-index: 3;" rowspan="2">Student Name</th>
                    <th style="position: sticky; left: 195px; background: #4C1D95; padding: 10px 6px; text-align: left; min-width: 120px; z-index: 3;" rowspan="2">Admission</th>
    `;

    columns.forEach(col => {
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

    columns.forEach(() => {
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
        const studentId = student.student_id || student.admission_number;
        const mark = marksMap[studentId] || {};
        let scores = {};
        try {
            if (mark.scores) {
                scores = typeof mark.scores === 'string' ? JSON.parse(mark.scores) : mark.scores;
            }
        } catch (e) {}

        const gradedBy = mark.graded_by || '';
        const published = mark.published === true || mark.published === 'true';

        let totalScore = 0, scoredCount = 0;
        columns.forEach(col => {
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

        columns.forEach(col => {
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

// ============================================
// COLUMN SETTINGS
// ============================================

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
        `nck_columns_${currentNCKSheetType}_${currentNCKBlock}`,
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
    
    const colCount2El = document.getElementById('nck_column_count_2');
    if (colCount2El) colCount2El.textContent = currentNCKColumns.length;
    
    const blockColumnsEl = document.getElementById('nck_block_columns');
    if (blockColumnsEl) blockColumnsEl.textContent = currentNCKColumns.length;
}

// ============================================
// AUTO-CALCULATION
// ============================================

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

// ============================================
// SAVE FUNCTIONS - SAVE ALL BUTTON
// ============================================

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

        try {
            const { error } = await sb
                .from('nck_marks')
                .upsert({
                    student_id: studentId,
                    full_name: student.full_name || 'Unknown',
                    admission_number: student.admission_number || studentId,
                    block: currentNCKBlock,
                    subject_name: currentNCKSheetType,
                    program: currentNCKProgram,
                    scores: JSON.stringify(scores),
                    final_score: Math.round(avg * 10) / 10,
                    grade: grade,
                    status: status,
                    graded_by: gradedBy,
                    updated_at: new Date().toISOString()
                }, { 
                    onConflict: 'student_id, subject_name, block, program' 
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

// ============================================
// PUBLISH FUNCTIONS - PUBLISH ALL BUTTON
// ============================================

async function publishAllNCKMarks() {
    const studentCount = currentNCKStudentsList?.length || 0;
    if (studentCount === 0) {
        showNotification('No students to publish', true);
        return;
    }

    if (!confirm(`PUBLISH ALL NCK marks for "${currentNCKSheetType}" (${studentCount} students)?`)) return;

    showLoading(`Publishing ${studentCount} records...`);

    try {
        const { error } = await sb
            .from('nck_marks')
            .update({
                published: true,
                published_at: new Date().toISOString(),
                published_by: window.currentUser?.full_name || 'Admin'
            })
            .eq('block', currentNCKBlock)
            .eq('subject_name', currentNCKSheetType)
            .eq('program', currentNCKProgram);

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

    try {
        const { data: current, error: getError } = await sb
            .from('nck_marks')
            .select('published')
            .eq('student_id', studentId)
            .eq('block', currentNCKBlock)
            .eq('subject_name', currentNCKSheetType)
            .eq('program', currentNCKProgram)
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
            .eq('block', currentNCKBlock)
            .eq('subject_name', currentNCKSheetType)
            .eq('program', currentNCKProgram);

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

    try {
        const { error } = await sb
            .from('nck_marks')
            .update({
                published: true,
                published_at: new Date().toISOString(),
                published_by: window.currentUser?.full_name || 'Admin'
            })
            .in('student_id', studentIds)
            .eq('block', currentNCKBlock)
            .eq('subject_name', currentNCKSheetType)
            .eq('program', currentNCKProgram);

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

// ============================================
// FAST ENTRY MODE - FULL SCREEN
// ============================================

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

    // Populate student dropdown
    const select = document.getElementById('fastStudentSelect');
    if (select) {
        select.innerHTML = currentNCKStudentsList.map((s, i) => 
            `<option value="${i}">${i + 1}. ${escapeHtml(s.full_name)}</option>`
        ).join('');
        select.onchange = function() {
            loadFastEntryFields(parseInt(this.value));
        };
    }

    // Load first student
    if (currentNCKStudentsList.length > 0) {
        loadFastEntryFields(0);
    }

    // Setup buttons
    const saveNextBtn = document.getElementById('saveNextBtn');
    if (saveNextBtn) saveNextBtn.onclick = applyFastEntry;
    
    const saveStayBtn = document.getElementById('saveStayBtn');
    if (saveStayBtn) saveStayBtn.onclick = applyFastEntryAndStay;

    // Keyboard shortcuts
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

    // Get current avg
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

    // Build fields
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

    // Add grading field
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

    // Focus first input
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

    // Move to next student
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

    try {
        const { error } = await sb
            .from('nck_marks')
            .upsert({
                student_id: studentId,
                full_name: studentName || 'Unknown',
                admission_number: studentId,
                block: currentNCKBlock,
                subject_name: currentNCKSheetType,
                program: currentNCKProgram,
                scores: JSON.stringify(scores),
                final_score: Math.round(avg * 10) / 10,
                grade: grade,
                status: status,
                graded_by: gradedBy,
                updated_at: new Date().toISOString()
            }, { 
                onConflict: 'student_id, subject_name, block, program' 
            });

        if (error) {
            console.error('❌ Error saving:', error);
            showNotification(`Error saving: ${error.message}`, true);
            return false;
        }

        // Update marks map
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

// ============================================
// FILL DOWN
// ============================================

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

// ============================================
// EXPORT - EXPORT CSV BUTTON
// ============================================

async function exportNCKData() {
    showLoading('Exporting NCK data...');

    try {
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

        const headers = ['Student ID', 'Full Name', 'Admission', 'Block', 'Subject', 'Program', 'Scores', 'Final Score', 'Grade', 'Status', 'Graded By', 'Published'];
        const rows = marks.map(m => [
            m.student_id || '',
            m.full_name || '',
            m.admission_number || '',
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
        a.download = `nck_marks_${currentNCKSheetType}_${new Date().toISOString().split('T')[0]}.csv`;
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

// ============================================
// EDIT STUDENT
// ============================================

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

// ============================================
// CSS STYLES
// ============================================

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

// ============================================
// AUTO-INIT
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🏥 NCK System initializing...');
    const nckSection = document.getElementById('nursing-system');
    if (nckSection) {
        setTimeout(() => {
            loadNCKSystemData();
        }, 500);
    }
});

// ============================================
// GLOBAL EXPOSURE - ALL FUNCTIONS
// ============================================

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
window.saveFastEntryMarks = saveFastEntryMarks;
window.fillDownNCKValues = fillDownNCKValues;
window.editNCKStudent = editNCKStudent;
window.calculateNursingGrade = calculateNursingGrade;
window.escapeHtml = escapeHtml;
window.showNotification = showNotification;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.updateBlockDisplay = updateBlockDisplay;
window.loadFastEntryFields = loadFastEntryFields;
window.updateFastPreview = updateFastPreview;
window.applyFastEntry = applyFastEntry;
window.applyFastEntryAndStay = applyFastEntryAndStay;
window.handleFastEntryKey = handleFastEntryKey;
window.handleFastEntryKeyboard = handleFastEntryKeyboard;
window.saveSingleStudentMarks = saveSingleStudentMarks;

console.log('✅ NCK System module loaded successfully!');
console.log('📊 Available functions:', Object.keys(window).filter(k => k.includes('NCK') || k.includes('nck') || k === 'refreshNCKData'));
