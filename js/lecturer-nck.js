// ============================================================
// LECTURER NCK SYSTEM - ENTER MARKS + SUBMIT FOR APPROVAL
// PURELY KRCHN NURSING - FOLLOWS MARKS ENTRY WORKFLOW
// ============================================================

// ============================================================
// STATE
// ============================================================
const LecturerNCK = {
    students: [],
    marks: {},
    columns: [],
    currentIntake: '2026',
    currentSheet: 'XY_FORMS',
    lecturerId: null,
    lecturerName: 'Loading...',
    approvalStatus: 'draft',
    hasPending: false,
    hasApproved: false,
    isSubmitting: false,
    isSaving: false
};

// ============================================================
// INITIALIZE
// ============================================================
function lecturerNCKInit() {
    console.log('📋 Initializing Lecturer NCK System...');
    lecturerNCKGetLecturerInfo();
    lecturerNCKLoadColumns();
    // Don't auto-load - wait for user to click "Load My Students"
    document.getElementById('lecturerNCKPlaceholder').style.display = 'block';
}

// ============================================================
// GET LECTURER INFO
// ============================================================
function lecturerNCKGetLecturerInfo() {
    try {
        // Try from lecturerDB
        const profile = window.lecturerDB?.getCurrentUserProfile?.();
        if (profile) {
            LecturerNCK.lecturerId = profile.user_id || profile.id;
            LecturerNCK.lecturerName = profile.full_name || profile.name || 'Lecturer';
            document.getElementById('lecturerNCKName').textContent = LecturerNCK.lecturerName;
            document.getElementById('lecturerNCKShortName').textContent = LecturerNCK.lecturerName;
            return;
        }
        
        // Try from staffSession
        const staffSession = localStorage.getItem('staffSession');
        if (staffSession) {
            const data = JSON.parse(staffSession);
            LecturerNCK.lecturerId = data.staffId || data.user_id;
            LecturerNCK.lecturerName = data.name || 'Lecturer';
            document.getElementById('lecturerNCKName').textContent = LecturerNCK.lecturerName;
            document.getElementById('lecturerNCKShortName').textContent = LecturerNCK.lecturerName;
            return;
        }
        
        // Fallback
        LecturerNCK.lecturerName = 'You';
        document.getElementById('lecturerNCKName').textContent = 'You';
        document.getElementById('lecturerNCKShortName').textContent = 'You';
        
    } catch (e) {
        console.error('Error getting lecturer info:', e);
    }
}

// ============================================================
// LOAD NCK COLUMNS (Read-only for lecturer)
// ============================================================
function lecturerNCKLoadColumns() {
    const sheet = document.getElementById('lecturerNCKSheet')?.value || 'XY_FORMS';
    const key = `nck_columns_${sheet}`;
    let columns = JSON.parse(localStorage.getItem(key));
    
    if (!columns) {
        // Default columns - managed by admin, lecturer just uses them
        if (sheet === 'XY_FORMS') {
            columns = [
                { id: 'MED1', label: 'MED1', visible: true },
                { id: 'MED2', label: 'MED2', visible: true },
                { id: 'MED3', label: 'MED3', visible: true },
                { id: 'MED4', label: 'MED4', visible: true },
                { id: 'MED5', label: 'MED5', visible: true },
                { id: 'MED6', label: 'MED6', visible: true },
                { id: 'MED7', label: 'MED7', visible: true },
                { id: 'MED8', label: 'MED8', visible: true }
            ];
        } else {
            columns = [
                { id: 'ASSESSMENT1', label: 'Assessment 1', visible: true },
                { id: 'ASSESSMENT2', label: 'Assessment 2', visible: true },
                { id: 'ASSESSMENT3', label: 'Assessment 3', visible: true },
                { id: 'ASSESSMENT4', label: 'Assessment 4', visible: true },
                { id: 'ASSESSMENT5', label: 'Assessment 5', visible: true }
            ];
        }
        localStorage.setItem(key, JSON.stringify(columns));
    }
    
    LecturerNCK.columns = columns.filter(c => c.visible);
    document.getElementById('lecturer_nck_block_columns')?.textContent = LecturerNCK.columns.length;
}

// ============================================================
// LOAD NCK DATA - LECTURER FILTERED
// ============================================================
async function lecturerNCKLoadData() {
    const intake = document.getElementById('lecturerNCKIntake')?.value || '2026';
    const sheet = document.getElementById('lecturerNCKSheet')?.value || 'XY_FORMS';
    
    LecturerNCK.currentIntake = intake;
    LecturerNCK.currentSheet = sheet;
    
    // Show loading
    const container = document.getElementById('lecturerNCKTableContainer');
    const placeholder = document.getElementById('lecturerNCKPlaceholder');
    if (placeholder) placeholder.style.display = 'none';
    
    container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #94a3b8;">
            <div class="loading-spinner" style="display: inline-block; width: 30px; height: 30px; border: 3px solid #e5e7eb; border-top-color: #4C1D95; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <p style="margin-top: 15px;">Loading your NCK data...</p>
        </div>
    `;
    
    try {
        const supabase = window.lecturerDB?.supabase;
        if (!supabase) throw new Error('Database not available');
        
        const lecturerId = LecturerNCK.lecturerId;
        if (!lecturerId) {
            container.innerHTML = `<div style="text-align:center;padding:40px;color:#dc2626;">Lecturer ID not found. Please refresh.</div>`;
            return;
        }
        
        // Step 1: Get students assigned to this lecturer for KRCHN
        const { data: assignments, error: assignError } = await supabase
            .from('lecturer_subject_assignments')
            .select('student_id, student_name, program, intake_year, block, registration_number')
            .eq('lecturer_id', String(lecturerId))
            .eq('intake_year', parseInt(intake));
        
        if (assignError) throw assignError;
        
        // Filter only KRCHN students
        const krchnStudents = (assignments || []).filter(s => 
            s.program === 'KRCHN' || s.program?.includes('KRCHN')
        );
        
        if (krchnStudents.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #94a3b8;">
                    <i class="fas fa-users" style="font-size: 32px; display: block; margin-bottom: 10px; color: #e2e8f0;"></i>
                    <p style="font-size: 16px; font-weight: 500; color: #475569;">No KRCHN students assigned to you</p>
                    <p style="font-size: 13px; margin: 0;">You don't have any KRCHN students for ${intake} intake</p>
                </div>
            `;
            return;
        }
        
        LecturerNCK.students = krchnStudents;
        
        // Step 2: Get existing NCK marks
        const studentIds = krchnStudents.map(s => s.student_id);
        const { data: marks, error: marksError } = await supabase
            .from('nck_marks')
            .select('*')
            .in('student_id', studentIds)
            .eq('sheet_type', sheet);
        
        if (marksError) throw marksError;
        
        // Build marks map
        LecturerNCK.marks = {};
        (marks || []).forEach(m => {
            if (!LecturerNCK.marks[m.student_id]) {
                LecturerNCK.marks[m.student_id] = {};
            }
            LecturerNCK.marks[m.student_id][m.column_id] = m;
        });
        
        // Step 3: Render table
        lecturerNCKRenderTable();
        
        // Step 4: Update stats
        lecturerNCKUpdateStats();
        
        // Step 5: Check approval status
        lecturerNCKCheckApprovalStatus();
        
        console.log(`✅ Loaded ${krchnStudents.length} KRCHN students for ${intake}`);
        
    } catch (error) {
        console.error('Error loading NCK data:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #dc2626;">
                <i class="fas fa-exclamation-circle" style="font-size: 32px; display: block; margin-bottom: 10px;"></i>
                <p style="font-size: 16px; font-weight: 500;">Error loading data</p>
                <p style="font-size: 13px; margin: 0;">${error.message}</p>
                <button onclick="lecturerNCKLoadData()" style="margin-top: 15px; padding: 8px 20px; background: #4C1D95; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    <i class="fas fa-sync-alt"></i> Retry
                </button>
            </div>
        `;
    }
}

// ============================================================
// RENDER TABLE
// ============================================================
function lecturerNCKRenderTable() {
    const container = document.getElementById('lecturerNCKTableContainer');
    if (!container) return;
    
    const students = LecturerNCK.students;
    const columns = LecturerNCK.columns;
    
    if (!students || students.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #94a3b8;">
                <i class="fas fa-users" style="font-size: 32px; display: block; margin-bottom: 10px; color: #e2e8f0;"></i>
                <p style="font-size: 16px; font-weight: 500; color: #475569;">No students found</p>
            </div>
        `;
        return;
    }
    
    // Build table
    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; margin-bottom: 20px;">
            <div>
                <h4 style="margin: 0; color: #1e293b; font-size: 16px;">
                    <i class="fas fa-table"></i> NCK ${LecturerNCK.currentSheet === 'XY_FORMS' ? 'XY Forms' : 'Assessment & Case'}
                    <span style="font-size: 13px; font-weight: 400; color: #64748b; margin-left: 10px;">
                        ${LecturerNCK.currentIntake} Intake
                    </span>
                </h4>
                <p style="margin: 4px 0 0 0; color: #64748b; font-size: 12px;">
                    <i class="fas fa-users"></i> ${students.length} students &nbsp;|&nbsp;
                    <i class="fas fa-file-medical"></i> ${columns.length} assessment areas &nbsp;|&nbsp;
                    <i class="fas fa-flag-checkered"></i> Pass Mark: 60%
                </p>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button onclick="lecturerNCKSaveAll()" style="background: #059669; padding: 6px 14px; border: none; border-radius: 6px; color: white; cursor: pointer; font-size: 12px; font-weight: 600;">
                    <i class="fas fa-save"></i> 💾 Save All
                </button>
                <button onclick="lecturerNCKSubmitForApproval()" style="background: #4C1D95; padding: 6px 14px; border: none; border-radius: 6px; color: white; cursor: pointer; font-size: 12px; font-weight: 600;">
                    <i class="fas fa-paper-plane"></i> Submit for Approval
                </button>
            </div>
        </div>
        
        <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                    <tr style="background: linear-gradient(135deg, #4C1D95, #7c3aed); color: white; position: sticky; top: 0; z-index: 5;">
                        <th style="padding: 10px 8px; text-align: center; min-width: 35px;">#</th>
                        <th style="padding: 10px 8px; text-align: left; min-width: 180px;">Student Name</th>
                        <th style="padding: 10px 8px; text-align: left; min-width: 100px;">Reg No</th>
    `;
    
    // Column headers
    columns.forEach(col => {
        html += `<th style="padding: 10px 8px; text-align: center; min-width: 70px; background: #6d28d9;">${col.label}</th>`;
    });
    
    html += `
                        <th style="padding: 10px 8px; text-align: center; min-width: 70px; background: #4C1D95;">AVG %</th>
                        <th style="padding: 10px 8px; text-align: center; min-width: 80px; background: #4C1D95;">Status</th>
                        <th style="padding: 10px 8px; text-align: center; min-width: 100px; background: #4C1D95;">Approval</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    // Student rows
    students.forEach((student, idx) => {
        const marks = LecturerNCK.marks[student.student_id] || {};
        const rowValues = [];
        let total = 0;
        let count = 0;
        
        columns.forEach(col => {
            const mark = marks[col.id];
            const value = mark?.marks !== undefined && mark.marks !== null ? mark.marks : '';
            rowValues.push(value);
            if (value !== '' && !isNaN(parseFloat(value))) {
                total += parseFloat(value);
                count++;
            }
        });
        
        const avg = count > 0 ? total / count : 0;
        const status = avg >= 60 ? 'PASS' : (avg > 0 ? 'FAIL' : 'PENDING');
        const statusColor = status === 'PASS' ? '#d1fae5' : (status === 'FAIL' ? '#fee2e2' : '#fef3c7');
        const statusTextColor = status === 'PASS' ? '#065f46' : (status === 'FAIL' ? '#991b1b' : '#92400e');
        const statusIcon = status === 'PASS' ? '✅' : (status === 'FAIL' ? '❌' : '⏳');
        
        // Get approval status for this student
        let approvalStatus = 'draft';
        let hasMarks = false;
        columns.forEach(col => {
            const mark = marks[col.id];
            if (mark?.approval_status) {
                approvalStatus = mark.approval_status;
                hasMarks = true;
            }
        });
        
        const approvalBadge = {
            'pending': '<span style="background:#fef3c7;color:#92400e;padding:2px 10px;border-radius:12px;font-size:11px;">⏳ Pending</span>',
            'approved': '<span style="background:#d1fae5;color:#065f46;padding:2px 10px;border-radius:12px;font-size:11px;">✅ Approved</span>',
            'rejected': '<span style="background:#fee2e2;color:#991b1b;padding:2px 10px;border-radius:12px;font-size:11px;">❌ Rejected</span>',
            'draft': '<span style="background:#e5e7eb;color:#6b7280;padding:2px 10px;border-radius:12px;font-size:11px;">📝 Draft</span>'
        }[approvalStatus] || '<span style="background:#e5e7eb;color:#6b7280;padding:2px 10px;border-radius:12px;font-size:11px;">📝 Draft</span>';
        
        html += `
            <tr style="border-bottom: 1px solid #f1f5f9; cursor: pointer;" 
                onclick="lecturerNCKOpenStudentMarks('${student.student_id}')"
                onmouseover="this.style.background='#f8fafc'" 
                onmouseout="this.style.background='transparent'">
                <td style="padding: 8px 6px; text-align: center; font-weight: 600; color: #64748b;">${idx + 1}</td>
                <td style="padding: 8px 6px; font-weight: 500;">${student.student_name || 'Unknown'}</td>
                <td style="padding: 8px 6px; color: #64748b; font-size: 12px;">${student.registration_number || 'N/A'}</td>
        `;
        
        // Mark cells
        columns.forEach((col, colIdx) => {
            const value = rowValues[colIdx];
            const isFilled = value !== '' && !isNaN(parseFloat(value));
            const val = isFilled ? parseFloat(value) : '';
            const markColor = isFilled ? (val >= 60 ? '#065f46' : '#991b1b') : '#94a3b8';
            
            html += `
                <td style="padding: 4px 4px; text-align: center;">
                    <input type="number" 
                           class="nck-mark-input" 
                           data-student="${student.student_id}" 
                           data-column="${col.id}"
                           data-index="${idx}"
                           value="${val}"
                           min="0" 
                           max="100" 
                           step="0.5"
                           style="width: 60px; padding: 4px 6px; border-radius: 4px; border: 2px solid ${isFilled ? (val >= 60 ? '#10b981' : '#ef4444') : '#e2e8f0'}; text-align: center; font-size: 13px;"
                           onchange="lecturerNCKUpdateRow('${student.student_id}')"
                           oninput="lecturerNCKUpdateRow('${student.student_id}')">
                </td>
            `;
        });
        
        html += `
                <td id="nck_avg_${idx}" style="padding: 8px 6px; text-align: center; font-weight: bold; font-size: 15px; color: ${status === 'PASS' ? '#10b981' : (status === 'FAIL' ? '#dc2626' : '#f59e0b')};">${avg > 0 ? avg.toFixed(1) : '--'}</td>
                <td id="nck_status_${idx}" style="padding: 8px 6px; text-align: center;">
                    <span style="background: ${statusColor}; padding: 3px 12px; border-radius: 12px; color: ${statusTextColor}; font-weight: 600; display: inline-block; font-size: 12px;">
                        ${statusIcon} ${status}
                    </span>
                </td>
                <td style="padding: 8px 6px; text-align: center;">
                    ${approvalBadge}
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
        
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
            <span style="font-size: 13px; color: #64748b;">
                <i class="fas fa-flag"></i> Legend: 
                <span style="background: #d1fae5; padding: 2px 8px; border-radius: 4px; color: #065f46; font-size: 11px;">PASS</span>
                <span style="background: #fee2e2; padding: 2px 8px; border-radius: 4px; color: #991b1b; font-size: 11px;">FAIL</span>
                <span style="background: #fef3c7; padding: 2px 8px; border-radius: 4px; color: #92400e; font-size: 11px;">PENDING</span>
            </span>
            <button onclick="lecturerNCKExportCSV()" style="background: #0A3D62; padding: 8px 20px; border: none; border-radius: 6px; color: white; cursor: pointer; font-size: 13px;">
                <i class="fas fa-download"></i> Export CSV
            </button>
        </div>
    `;
    
    container.innerHTML = html;
}

// ============================================================
// UPDATE ROW (Real-time calculation)
// ============================================================
function lecturerNCKUpdateRow(studentId) {
    const inputs = document.querySelectorAll(`.nck-mark-input[data-student="${studentId}"]`);
    let total = 0;
    let count = 0;
    
    inputs.forEach(input => {
        const val = parseFloat(input.value);
        if (!isNaN(val) && val > 0) {
            total += val;
            count++;
        }
    });
    
    const avg = count > 0 ? total / count : 0;
    
    // Find the index of this student
    const studentIndex = LecturerNCK.students.findIndex(s => s.student_id === studentId);
    if (studentIndex === -1) return;
    
    const avgEl = document.getElementById(`nck_avg_${studentIndex}`);
    const statusEl = document.getElementById(`nck_status_${studentIndex}`);
    
    if (avgEl) {
        avgEl.textContent = avg > 0 ? avg.toFixed(1) : '--';
        avgEl.style.color = avg >= 60 ? '#10b981' : (avg > 0 ? '#dc2626' : '#f59e0b');
    }
    
    if (statusEl) {
        const status = avg >= 60 ? 'PASS' : (avg > 0 ? 'FAIL' : 'PENDING');
        const statusColor = status === 'PASS' ? '#d1fae5' : (status === 'FAIL' ? '#fee2e2' : '#fef3c7');
        const statusTextColor = status === 'PASS' ? '#065f46' : (status === 'FAIL' ? '#991b1b' : '#92400e');
        const statusIcon = status === 'PASS' ? '✅' : (status === 'FAIL' ? '❌' : '⏳');
        
        statusEl.innerHTML = `
            <span style="background: ${statusColor}; padding: 3px 12px; border-radius: 12px; color: ${statusTextColor}; font-weight: 600; display: inline-block; font-size: 12px;">
                ${statusIcon} ${status}
            </span>
        `;
    }
    
    // Update mark input border colors
    inputs.forEach(input => {
        const val = parseFloat(input.value);
        if (!isNaN(val) && val > 0) {
            input.style.borderColor = val >= 60 ? '#10b981' : '#ef4444';
        } else {
            input.style.borderColor = '#e2e8f0';
        }
    });
}

// ============================================================
// SAVE ALL MARKS
// ============================================================
async function lecturerNCKSaveAll() {
    if (LecturerNCK.isSaving) return;
    LecturerNCK.isSaving = true;
    
    const supabase = window.lecturerDB?.supabase;
    if (!supabase) {
        showNotification('Database not available', 'error');
        LecturerNCK.isSaving = false;
        return;
    }
    
    // Collect all marks from inputs
    const inputs = document.querySelectorAll('.nck-mark-input');
    if (!inputs.length) {
        showNotification('No marks to save', 'warning');
        LecturerNCK.isSaving = false;
        return;
    }
    
    // Check if any marks have values
    let hasValues = false;
    const marksToSave = [];
    
    inputs.forEach(input => {
        const val = parseFloat(input.value);
        if (!isNaN(val) && val > 0) {
            hasValues = true;
            marksToSave.push({
                student_id: input.dataset.student,
                column_id: input.dataset.column,
                marks: val,
                student_name: LecturerNCK.students.find(s => s.student_id === input.dataset.student)?.student_name || 'Unknown',
                intake_year: parseInt(LecturerNCK.currentIntake),
                sheet_type: LecturerNCK.currentSheet
            });
        }
    });
    
    if (!hasValues) {
        showNotification('No scores entered to save', 'warning');
        LecturerNCK.isSaving = false;
        return;
    }
    
    if (!confirm(`💾 Save ${marksToSave.length} marks for ${LecturerNCK.currentSheet}?`)) {
        LecturerNCK.isSaving = false;
        return;
    }
    
    showLoading('Saving NCK marks...');
    let saved = 0;
    let errors = 0;
    
    try {
        // Process in batches
        const batchSize = 50;
        for (let i = 0; i < marksToSave.length; i += batchSize) {
            const batch = marksToSave.slice(i, i + batchSize);
            
            for (const mark of batch) {
                try {
                    // Check if exists
                    const { data: existing } = await supabase
                        .from('nck_marks')
                        .select('id, approval_status')
                        .eq('student_id', mark.student_id)
                        .eq('column_id', mark.column_id)
                        .eq('sheet_type', mark.sheet_type)
                        .maybeSingle();
                    
                    const markData = {
                        student_id: mark.student_id,
                        student_name: mark.student_name,
                        column_id: mark.column_id,
                        marks: mark.marks,
                        sheet_type: mark.sheet_type,
                        intake_year: mark.intake_year,
                        updated_at: new Date().toISOString(),
                        graded_by: document.getElementById('lecturerNCKFastGraded')?.value || LecturerNCK.lecturerName
                    };
                    
                    let result;
                    if (existing) {
                        // Check if approval status should be reset
                        let newStatus = existing.approval_status || 'draft';
                        if (existing.approval_status === 'approved' || existing.approval_status === 'pending') {
                            newStatus = 'draft';
                        }
                        markData.approval_status = newStatus;
                        result = await supabase
                            .from('nck_marks')
                            .update(markData)
                            .eq('id', existing.id);
                    } else {
                        markData.approval_status = 'draft';
                        markData.created_at = new Date().toISOString();
                        result = await supabase
                            .from('nck_marks')
                            .insert([markData]);
                    }
                    
                    if (result.error) {
                        errors++;
                        console.error('Error saving mark:', result.error);
                    } else {
                        saved++;
                    }
                } catch (err) {
                    errors++;
                    console.error('Error saving mark:', err);
                }
            }
        }
        
        hideLoading();
        showNotification(`✅ ${saved} marks saved${errors > 0 ? `, ${errors} errors` : ''}`, errors > 0 ? 'warning' : 'success');
        
        // Reload data
        await lecturerNCKLoadData();
        
    } catch (error) {
        hideLoading();
        showNotification('❌ Error saving: ' + error.message, 'error');
        console.error('Save error:', error);
    }
    
    LecturerNCK.isSaving = false;
}

// ============================================================
// SUBMIT FOR APPROVAL
// ============================================================
async function lecturerNCKSubmitForApproval() {
    if (LecturerNCK.isSubmitting) return;
    
    const supabase = window.lecturerDB?.supabase;
    if (!supabase) {
        showNotification('Database not available', 'error');
        return;
    }
    
    // Check if there are any marks to submit
    const students = LecturerNCK.students;
    if (!students || students.length === 0) {
        showNotification('No students loaded', 'warning');
        return;
    }
    
    showLoading('Checking marks for submission...');
    
    try {
        // Get all marks for these students
        const studentIds = students.map(s => s.student_id);
        const { data: marks, error } = await supabase
            .from('nck_marks')
            .select('*')
            .in('student_id', studentIds)
            .eq('sheet_type', LecturerNCK.currentSheet);
        
        if (error) throw error;
        
        // Count marks by status
        const draftMarks = (marks || []).filter(m => m.approval_status === 'draft' || m.approval_status === 'rejected');
        const pendingMarks = (marks || []).filter(m => m.approval_status === 'pending');
        const approvedMarks = (marks || []).filter(m => m.approval_status === 'approved');
        
        hideLoading();
        
        if (draftMarks.length === 0) {
            if (approvedMarks.length > 0) {
                showNotification('✅ All marks are already approved!', 'success');
            } else if (pendingMarks.length > 0) {
                showNotification(`⏳ ${pendingMarks.length} marks are already pending approval`, 'warning');
            } else {
                showNotification('No marks to submit. Please enter marks first.', 'warning');
            }
            return;
        }
        
        // Show summary
        const summary = [
            `📊 ${draftMarks.length} marks ready for submission`,
            approvedMarks.length > 0 ? `✅ ${approvedMarks.length} already approved` : null,
            pendingMarks.length > 0 ? `⏳ ${pendingMarks.length} already pending` : null
        ].filter(Boolean).join('\n');
        
        if (!confirm(`📤 Submit for approval?\n\n${summary}\n\nContinue?`)) {
            return;
        }
        
        showLoading(`Submitting ${draftMarks.length} marks...`);
        
        // Submit in batches
        const batchSize = 50;
        let submitted = 0;
        let errors = 0;
        
        for (let i = 0; i < draftMarks.length; i += batchSize) {
            const batch = draftMarks.slice(i, i + batchSize);
            const ids = batch.map(m => m.id);
            
            const { error: updateError } = await supabase
                .from('nck_marks')
                .update({
                    approval_status: 'pending',
                    submitted_at: new Date().toISOString(),
                    submitted_by: LecturerNCK.lecturerId
                })
                .in('id', ids);
            
            if (updateError) {
                errors += batch.length;
                console.error('Submit error:', updateError);
            } else {
                submitted += batch.length;
            }
        }
        
        hideLoading();
        
        if (errors > 0 && submitted > 0) {
            showNotification(`⚠️ ${submitted} marks submitted, ${errors} errors`, 'warning');
        } else if (submitted > 0) {
            showNotification(`✅ ${submitted} marks submitted for approval!`, 'success');
        } else {
            showNotification('❌ Failed to submit marks', 'error');
        }
        
        // Reload
        await lecturerNCKLoadData();
        
    } catch (error) {
        hideLoading();
        showNotification('❌ Error submitting: ' + error.message, 'error');
        console.error('Submit error:', error);
    }
}

// ============================================================
// WITHDRAW APPROVAL
// ============================================================
async function lecturerNCKWithdrawApproval() {
    const supabase = window.lecturerDB?.supabase;
    if (!supabase) {
        showNotification('Database not available', 'error');
        return;
    }
    
    const students = LecturerNCK.students;
    if (!students || students.length === 0) {
        showNotification('No students loaded', 'warning');
        return;
    }
    
    showLoading('Checking pending marks...');
    
    try {
        const studentIds = students.map(s => s.student_id);
        const { data: pendingMarks, error } = await supabase
            .from('nck_marks')
            .select('*')
            .in('student_id', studentIds)
            .eq('sheet_type', LecturerNCK.currentSheet)
            .eq('approval_status', 'pending');
        
        if (error) throw error;
        
        hideLoading();
        
        if (!pendingMarks || pendingMarks.length === 0) {
            showNotification('No pending marks to withdraw', 'warning');
            return;
        }
        
        if (!confirm(`⏪ Withdraw ${pendingMarks.length} marks from approval?`)) {
            return;
        }
        
        showLoading(`Withdrawing ${pendingMarks.length} marks...`);
        
        const ids = pendingMarks.map(m => m.id);
        const { error: updateError } = await supabase
            .from('nck_marks')
            .update({
                approval_status: 'draft',
                submitted_at: null,
                submitted_by: null
            })
            .in('id', ids);
        
        hideLoading();
        
        if (updateError) {
            showNotification('❌ Error withdrawing: ' + updateError.message, 'error');
        } else {
            showNotification(`✅ ${pendingMarks.length} marks withdrawn from approval!`, 'success');
        }
        
        await lecturerNCKLoadData();
        
    } catch (error) {
        hideLoading();
        showNotification('❌ Error withdrawing: ' + error.message, 'error');
        console.error('Withdraw error:', error);
    }
}

// ============================================================
// UPDATE STATS
// ============================================================
function lecturerNCKUpdateStats() {
    const students = LecturerNCK.students;
    const marks = LecturerNCK.marks;
    
    if (!students || students.length === 0) {
        document.getElementById('lecturerNCKTotalStudents').textContent = '0';
        document.getElementById('lecturerNCKPassRate').textContent = '0%';
        document.getElementById('lecturerNCKAvgScore').textContent = '0%';
        document.getElementById('lecturerNCKAtRisk').textContent = '0';
        document.getElementById('lecturerNCKPublished').textContent = '0';
        document.getElementById('lecturerNCKPending').textContent = '0';
        document.getElementById('lecturer_nck_block_students').textContent = '0';
        return;
    }
    
    // Calculate stats
    let totalStudents = students.length;
    let totalScore = 0;
    let countWithScores = 0;
    let passing = 0;
    let failing = 0;
    let approved = 0;
    let pending = 0;
    
    students.forEach(student => {
        const studentMarks = marks[student.student_id] || {};
        let total = 0;
        let count = 0;
        
        LecturerNCK.columns.forEach(col => {
            const mark = studentMarks[col.id];
            if (mark?.marks !== undefined && mark.marks !== null && !isNaN(parseFloat(mark.marks))) {
                total += parseFloat(mark.marks);
                count++;
            }
        });
        
        const avg = count > 0 ? total / count : 0;
        
        if (avg > 0) {
            totalScore += avg;
            countWithScores++;
            if (avg >= 60) {
                passing++;
            } else {
                failing++;
            }
        }
        
        // Check approval status
        let hasApproved = false;
        let hasPending = false;
        LecturerNCK.columns.forEach(col => {
            const mark = studentMarks[col.id];
            if (mark?.approval_status === 'approved') hasApproved = true;
            if (mark?.approval_status === 'pending') hasPending = true;
        });
        
        if (hasApproved) approved++;
        if (hasPending) pending++;
    });
    
    const avgScore = countWithScores > 0 ? Math.round(totalScore / countWithScores) : 0;
    const passRate = totalStudents > 0 ? Math.round((passing / totalStudents) * 100) : 0;
    
    document.getElementById('lecturerNCKTotalStudents').textContent = totalStudents;
    document.getElementById('lecturerNCKPassRate').textContent = passRate + '%';
    document.getElementById('lecturerNCKAvgScore').textContent = avgScore + '%';
    document.getElementById('lecturerNCKAtRisk').textContent = failing;
    document.getElementById('lecturerNCKPublished').textContent = approved;
    document.getElementById('lecturerNCKPending').textContent = pending;
    document.getElementById('lecturer_nck_block_students').textContent = totalStudents;
}

// ============================================================
// CHECK APPROVAL STATUS
// ============================================================
function lecturerNCKCheckApprovalStatus() {
    const students = LecturerNCK.students;
    const marks = LecturerNCK.marks;
    
    if (!students || students.length === 0) {
        document.getElementById('lecturerNCKApprovalBanner').style.display = 'none';
        return;
    }
    
    let pendingCount = 0;
    let approvedCount = 0;
    let draftCount = 0;
    let rejectedCount = 0;
    
    students.forEach(student => {
        const studentMarks = marks[student.student_id] || {};
        LecturerNCK.columns.forEach(col => {
            const mark = studentMarks[col.id];
            if (mark?.approval_status) {
                if (mark.approval_status === 'pending') pendingCount++;
                else if (mark.approval_status === 'approved') approvedCount++;
                else if (mark.approval_status === 'rejected') rejectedCount++;
                else draftCount++;
            } else {
                draftCount++;
            }
        });
    });
    
    const banner = document.getElementById('lecturerNCKApprovalBanner');
    const statusText = document.getElementById('lecturerNCKStatusText');
    const statusBadge = document.getElementById('lecturerNCKStatusBadge');
    const submitBtn = document.getElementById('lecturerNCKSubmitBtn');
    const withdrawBtn = document.getElementById('lecturerNCKWithdrawBtn2');
    const details = document.getElementById('lecturerNCKApprovalDetails');
    const rejectionReason = document.getElementById('lecturerNCKRejectionReason');
    
    if (!banner) return;
    
    // Show banner if there are any marks
    const totalMarks = pendingCount + approvedCount + draftCount + rejectedCount;
    if (totalMarks === 0) {
        banner.style.display = 'none';
        return;
    }
    
    banner.style.display = 'block';
    
    if (pendingCount > 0) {
        banner.style.borderLeftColor = '#f59e0b';
        banner.style.background = '#fef3c7';
        statusText.textContent = `${pendingCount} marks pending Admin Approval`;
        statusBadge.textContent = '⏳ Pending';
        statusBadge.style.cssText = 'background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 12px; font-size: 12px;';
        submitBtn.style.display = 'none';
        withdrawBtn.style.display = 'inline-block';
        if (details) details.style.display = 'block';
        if (rejectionReason) rejectionReason.style.display = 'none';
    } else if (approvedCount > 0 && pendingCount === 0) {
        banner.style.borderLeftColor = '#10b981';
        banner.style.background = '#d1fae5';
        statusText.textContent = `✅ ${approvedCount} marks Approved by Admin`;
        statusBadge.textContent = '✅ Approved';
        statusBadge.style.cssText = 'background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 12px; font-size: 12px;';
        submitBtn.style.display = 'none';
        withdrawBtn.style.display = 'none';
        if (details) details.style.display = 'block';
        if (rejectionReason) rejectionReason.style.display = 'none';
    } else if (rejectedCount > 0) {
        banner.style.borderLeftColor = '#dc2626';
        banner.style.background = '#fee2e2';
        statusText.textContent = `❌ ${rejectedCount} marks Rejected by Admin`;
        statusBadge.textContent = '❌ Rejected';
        statusBadge.style.cssText = 'background: #fee2e2; color: #991b1b; padding: 4px 12px; border-radius: 12px; font-size: 12px;';
        submitBtn.style.display = 'inline-block';
        withdrawBtn.style.display = 'none';
        if (details) details.style.display = 'block';
        if (rejectionReason) rejectionReason.style.display = 'block';
    } else if (draftCount > 0) {
        banner.style.borderLeftColor = '#6b7280';
        banner.style.background = '#f3f4f6';
        statusText.textContent = `📝 ${draftCount} marks in Draft - Ready to submit`;
        statusBadge.textContent = '📝 Draft';
        statusBadge.style.cssText = 'background: #e5e7eb; color: #6b7280; padding: 4px 12px; border-radius: 12px; font-size: 12px;';
        submitBtn.style.display = 'inline-block';
        withdrawBtn.style.display = 'none';
        if (details) details.style.display = 'none';
        if (rejectionReason) rejectionReason.style.display = 'none';
    }
}

// ============================================================
// OPEN STUDENT MARKS (Popup for individual student)
// ============================================================
function lecturerNCKOpenStudentMarks(studentId) {
    const student = LecturerNCK.students.find(s => s.student_id === studentId);
    if (!student) return;
    
    // Build popup content
    const studentMarks = LecturerNCK.marks[studentId] || {};
    let html = `
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px;" onclick="if(event.target===this) this.remove()">
            <div style="background: white; border-radius: 16px; max-width: 600px; width: 100%; padding: 30px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-height: 90vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0; color: #1e293b;">${student.student_name}</h3>
                    <button onclick="this.closest('div[style*=\\'position: fixed\\']').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #94a3b8;">&times;</button>
                </div>
                <p style="color: #64748b; margin: 0 0 20px 0;">Reg: ${student.registration_number || 'N/A'} | Intake: ${student.intake_year}</p>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
    `;
    
    LecturerNCK.columns.forEach(col => {
        const mark = studentMarks[col.id];
        const value = mark?.marks !== undefined && mark.marks !== null ? mark.marks : '';
        const approval = mark?.approval_status || 'draft';
        const approvalLabel = approval === 'approved' ? '✅' : (approval === 'pending' ? '⏳' : (approval === 'rejected' ? '❌' : '📝'));
        
        html += `
            <div style="background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e5e7eb;">
                <div style="font-weight: 600; font-size: 13px; color: #475569;">${col.label}</div>
                <input type="number" 
                       class="nck-popup-mark" 
                       data-student="${studentId}" 
                       data-column="${col.id}"
                       value="${value}"
                       min="0" 
                       max="100" 
                       step="0.5"
                       style="width: 80px; padding: 6px; border-radius: 4px; border: 2px solid ${value !== '' && !isNaN(parseFloat(value)) ? (parseFloat(value) >= 60 ? '#10b981' : '#ef4444') : '#e2e8f0'}; text-align: center; font-size: 14px; margin-top: 4px;"
                       onchange="lecturerNCKUpdatePopupMark(this)">
                <span style="font-size: 12px; margin-left: 8px;">${approvalLabel}</span>
            </div>
        `;
    });
    
    html += `
                </div>
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; display: flex; gap: 10px; justify-content: flex-end;">
                    <button onclick="lecturerNCKSavePopupMarks('${studentId}')" style="background: #059669; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        <i class="fas fa-save"></i> Save
                    </button>
                    <button onclick="this.closest('div[style*=\\'position: fixed\\']').remove()" style="background: #e5e7eb; color: #475569; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        Close
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Append popup
    const popup = document.createElement('div');
    popup.innerHTML = html;
    document.body.appendChild(popup.firstElementChild);
}

function lecturerNCKUpdatePopupMark(input) {
    const val = parseFloat(input.value);
    if (!isNaN(val) && val > 0) {
        input.style.borderColor = val >= 60 ? '#10b981' : '#ef4444';
    } else {
        input.style.borderColor = '#e2e8f0';
    }
}

async function lecturerNCKSavePopupMarks(studentId) {
    const inputs = document.querySelectorAll(`.nck-popup-mark[data-student="${studentId}"]`);
    const supabase = window.lecturerDB?.supabase;
    if (!supabase) {
        showNotification('Database not available', 'error');
        return;
    }
    
    showLoading('Saving marks...');
    let saved = 0;
    let errors = 0;
    
    for (const input of inputs) {
        const val = parseFloat(input.value);
        const columnId = input.dataset.column;
        
        if (isNaN(val) || val < 0) continue;
        
        try {
            const { data: existing } = await supabase
                .from('nck_marks')
                .select('id, approval_status')
                .eq('student_id', studentId)
                .eq('column_id', columnId)
                .eq('sheet_type', LecturerNCK.currentSheet)
                .maybeSingle();
            
            const markData = {
                student_id: studentId,
                student_name: LecturerNCK.students.find(s => s.student_id === studentId)?.student_name || 'Unknown',
                column_id: columnId,
                marks: val,
                sheet_type: LecturerNCK.currentSheet,
                intake_year: parseInt(LecturerNCK.currentIntake),
                updated_at: new Date().toISOString(),
                graded_by: document.getElementById('lecturerNCKFastGraded')?.value || LecturerNCK.lecturerName
            };
            
            if (existing) {
                let newStatus = existing.approval_status || 'draft';
                if (existing.approval_status === 'approved' || existing.approval_status === 'pending') {
                    newStatus = 'draft';
                }
                markData.approval_status = newStatus;
                const { error } = await supabase
                    .from('nck_marks')
                    .update(markData)
                    .eq('id', existing.id);
                if (error) throw error;
            } else {
                markData.approval_status = 'draft';
                markData.created_at = new Date().toISOString();
                const { error } = await supabase
                    .from('nck_marks')
                    .insert([markData]);
                if (error) throw error;
            }
            saved++;
        } catch (err) {
            errors++;
            console.error('Error saving mark:', err);
        }
    }
    
    hideLoading();
    showNotification(`✅ ${saved} marks saved${errors > 0 ? `, ${errors} errors` : ''}`, errors > 0 ? 'warning' : 'success');
    
    // Close popup
    const popup = document.querySelector('div[style*="position: fixed"][style*="z-index: 9999"]');
    if (popup) popup.remove();
    
    // Reload data
    await lecturerNCKLoadData();
}

// ============================================================
// FAST ENTRY MODAL
// ============================================================
function lecturerNCKOpenFastEntry() {
    const students = LecturerNCK.students;
    if (!students || students.length === 0) {
        showNotification('Please load students first', 'warning');
        return;
    }
    
    const modal = document.getElementById('lecturerNCKFastEntryModal');
    if (!modal) return;
    
    // Populate student dropdown
    const select = document.getElementById('lecturerNCKFastStudent');
    select.innerHTML = '<option value="">-- Select a student --</option>';
    students.forEach(s => {
        const option = document.createElement('option');
        option.value = s.student_id;
        option.textContent = `${s.student_name} (${s.registration_number || 'N/A'})`;
        select.appendChild(option);
    });
    
    // Load first student
    if (students.length > 0) {
        select.value = students[0].student_id;
        lecturerNCKFastLoadStudent(students[0].student_id);
    }
    
    modal.style.display = 'flex';
    
    // Keyboard shortcuts
    document.addEventListener('keydown', lecturerNCKFastKeyHandler);
}

function lecturerNCKFastKeyHandler(e) {
    if (e.key === 'Escape') {
        lecturerNCKCloseFastEntry();
    } else if (e.key === 'Enter') {
        if (e.shiftKey) {
            document.getElementById('lecturerNCKFastStay')?.click();
        } else {
            document.getElementById('lecturerNCKFastNext')?.click();
        }
    }
}

function lecturerNCKFastLoadStudent(studentId) {
    const student = LecturerNCK.students.find(s => s.student_id === studentId);
    if (!student) return;
    
    const studentMarks = LecturerNCK.marks[studentId] || {};
    const container = document.getElementById('lecturerNCKFastFields');
    if (!container) return;
    
    let html = '';
    LecturerNCK.columns.forEach(col => {
        const mark = studentMarks[col.id];
        const value = mark?.marks !== undefined && mark.marks !== null ? mark.marks : '';
        const approval = mark?.approval_status || 'draft';
        const approvalLabel = approval === 'approved' ? '✅' : (approval === 'pending' ? '⏳' : (approval === 'rejected' ? '❌' : '📝'));
        
        html += `
            <div style="background: #f8fafc; padding: 14px 16px; border-radius: 12px; border: 1px solid #e5e7eb;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <label style="font-weight: 600; font-size: 14px; color: #1e293b;">${col.label}</label>
                    <span style="font-size: 12px;">${approvalLabel}</span>
                </div>
                <input type="number" 
                       class="fast-entry-mark" 
                       data-student="${studentId}" 
                       data-column="${col.id}"
                       value="${value}"
                       min="0" 
                       max="100" 
                       step="0.5"
                       style="width: 100%; padding: 8px 10px; border-radius: 6px; border: 2px solid ${value !== '' && !isNaN(parseFloat(value)) ? (parseFloat(value) >= 60 ? '#10b981' : '#ef4444') : '#e2e8f0'}; font-size: 16px; margin-top: 6px;"
                       onchange="lecturerNCKFastUpdateAvg()"
                       oninput="lecturerNCKFastUpdateAvg()">
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Update average
    lecturerNCKFastUpdateAvg();
}

function lecturerNCKFastUpdateAvg() {
    const inputs = document.querySelectorAll('.fast-entry-mark');
    let total = 0;
    let count = 0;
    
    inputs.forEach(input => {
        const val = parseFloat(input.value);
        if (!isNaN(val) && val > 0) {
            total += val;
            count++;
        }
    });
    
    const avg = count > 0 ? total / count : 0;
    const status = avg >= 60 ? 'PASS' : (avg > 0 ? 'FAIL' : 'PENDING');
    const color = status === 'PASS' ? '#10b981' : (status === 'FAIL' ? '#dc2626' : '#f59e0b');
    
    document.getElementById('lecturerNCKFastAvg').textContent = avg > 0 ? avg.toFixed(1) : '0.00';
    document.getElementById('lecturerNCKFastStatus').textContent = status;
    document.getElementById('lecturerNCKFastStatus').style.color = color;
}

async function lecturerNCKFastSave(studentId, stay = false) {
    const inputs = document.querySelectorAll(`.fast-entry-mark[data-student="${studentId}"]`);
    const supabase = window.lecturerDB?.supabase;
    if (!supabase) {
        showNotification('Database not available', 'error');
        return;
    }
    
    let saved = 0;
    let errors = 0;
    
    for (const input of inputs) {
        const val = parseFloat(input.value);
        const columnId = input.dataset.column;
        
        if (isNaN(val) || val < 0) continue;
        
        try {
            const { data: existing } = await supabase
                .from('nck_marks')
                .select('id, approval_status')
                .eq('student_id', studentId)
                .eq('column_id', columnId)
                .eq('sheet_type', LecturerNCK.currentSheet)
                .maybeSingle();
            
            const markData = {
                student_id: studentId,
                student_name: LecturerNCK.students.find(s => s.student_id === studentId)?.student_name || 'Unknown',
                column_id: columnId,
                marks: val,
                sheet_type: LecturerNCK.currentSheet,
                intake_year: parseInt(LecturerNCK.currentIntake),
                updated_at: new Date().toISOString(),
                graded_by: document.getElementById('lecturerNCKFastGraded')?.value || LecturerNCK.lecturerName
            };
            
            if (existing) {
                let newStatus = existing.approval_status || 'draft';
                if (existing.approval_status === 'approved' || existing.approval_status === 'pending') {
                    newStatus = 'draft';
                }
                markData.approval_status = newStatus;
                const { error } = await supabase
                    .from('nck_marks')
                    .update(markData)
                    .eq('id', existing.id);
                if (error) throw error;
            } else {
                markData.approval_status = 'draft';
                markData.created_at = new Date().toISOString();
                const { error } = await supabase
                    .from('nck_marks')
                    .insert([markData]);
                if (error) throw error;
            }
            saved++;
        } catch (err) {
            errors++;
            console.error('Error saving mark:', err);
        }
    }
    
    showNotification(`✅ ${saved} marks saved${errors > 0 ? `, ${errors} errors` : ''}`, errors > 0 ? 'warning' : 'success');
    
    if (stay) {
        // Refresh current student data
        await lecturerNCKFastLoadStudent(studentId);
    } else {
        // Move to next student
        const select = document.getElementById('lecturerNCKFastStudent');
        const options = select.options;
        let nextIndex = -1;
        
        for (let i = 0; i < options.length; i++) {
            if (options[i].value === studentId) {
                nextIndex = i + 1;
                break;
            }
        }
        
        if (nextIndex < options.length) {
            select.value = options[nextIndex].value;
            lecturerNCKFastLoadStudent(options[nextIndex].value);
        } else {
            showNotification('✅ All students processed!', 'success');
            lecturerNCKCloseFastEntry();
            await lecturerNCKLoadData();
        }
    }
}

function lecturerNCKCloseFastEntry() {
    document.getElementById('lecturerNCKFastEntryModal').style.display = 'none';
    document.removeEventListener('keydown', lecturerNCKFastKeyHandler);
}

// ============================================================
// EXPORT CSV
// ============================================================
function lecturerNCKExportCSV() {
    const students = LecturerNCK.students;
    const columns = LecturerNCK.columns;
    
    if (!students || students.length === 0) {
        showNotification('No data to export', 'warning');
        return;
    }
    
    // Build CSV
    let headers = ['#', 'Student Name', 'Registration', 'Program'];
    columns.forEach(col => headers.push(col.label));
    headers.push('Average', 'Status', 'Approval');
    
    let rows = [];
    students.forEach((student, idx) => {
        const studentMarks = LecturerNCK.marks[student.student_id] || {};
        const row = [
            idx + 1,
            student.student_name || 'Unknown',
            student.registration_number || 'N/A',
            student.program || 'KRCHN'
        ];
        
        let total = 0;
        let count = 0;
        columns.forEach(col => {
            const mark = studentMarks[col.id];
            const val = mark?.marks !== undefined && mark.marks !== null ? parseFloat(mark.marks) : '';
            row.push(val !== '' && !isNaN(val) ? val : '');
            if (val !== '' && !isNaN(val)) {
                total += val;
                count++;
            }
        });
        
        const avg = count > 0 ? total / count : 0;
        const status = avg >= 60 ? 'PASS' : (avg > 0 ? 'FAIL' : 'PENDING');
        row.push(avg > 0 ? avg.toFixed(1) : '');
        row.push(status);
        
        // Approval status
        let approvalStatus = 'draft';
        columns.forEach(col => {
            const mark = studentMarks[col.id];
            if (mark?.approval_status) approvalStatus = mark.approval_status;
        });
        row.push(approvalStatus);
        
        rows.push(row);
    });
    
    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `NCK_${LecturerNCK.currentSheet}_${LecturerNCK.currentIntake}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    
    showNotification('✅ CSV exported!', 'success');
}

// ============================================================
// EXPOSE GLOBALLY
// ============================================================
window.LecturerNCK = LecturerNCK;
window.lecturerNCKInit = lecturerNCKInit;
window.lecturerNCKLoadData = lecturerNCKLoadData;
window.lecturerNCKLoadColumns = lecturerNCKLoadColumns;
window.lecturerNCKRenderTable = lecturerNCKRenderTable;
window.lecturerNCKUpdateRow = lecturerNCKUpdateRow;
window.lecturerNCKSaveAll = lecturerNCKSaveAll;
window.lecturerNCKSubmitForApproval = lecturerNCKSubmitForApproval;
window.lecturerNCKWithdrawApproval = lecturerNCKWithdrawApproval;
window.lecturerNCKUpdateStats = lecturerNCKUpdateStats;
window.lecturerNCKCheckApprovalStatus = lecturerNCKCheckApprovalStatus;
window.lecturerNCKOpenStudentMarks = lecturerNCKOpenStudentMarks;
window.lecturerNCKOpenFastEntry = lecturerNCKOpenFastEntry;
window.lecturerNCKCloseFastEntry = lecturerNCKCloseFastEntry;
window.lecturerNCKFastLoadStudent = lecturerNCKFastLoadStudent;
window.lecturerNCKFastUpdateAvg = lecturerNCKFastUpdateAvg;
window.lecturerNCKFastSave = lecturerNCKFastSave;
window.lecturerNCKExportCSV = lecturerNCKExportCSV;
window.lecturerNCKGetLecturerInfo = lecturerNCKGetLecturerInfo;

console.log('✅ Lecturer NCK module loaded');
