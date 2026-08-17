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
    isSaving: false,
    initialized: false
};

// ============================================================
// INITIALIZE
// ============================================================
function lecturerNCKInit() {
    console.log('📋 Initializing Lecturer NCK System...');
    lecturerNCKGetLecturerInfo();
    lecturerNCKLoadColumns();
    var placeholder = document.getElementById('lecturerNCKPlaceholder');
    if (placeholder) placeholder.style.display = 'block';
    LecturerNCK.initialized = true;
    console.log('✅ Lecturer NCK System initialized');
}

// ============================================================
// GET LECTURER INFO
// ============================================================
function lecturerNCKGetLecturerInfo() {
    try {
        var profile = window.lecturerDB?.getCurrentUserProfile?.();
        if (profile) {
            LecturerNCK.lecturerId = profile.user_id || profile.id;
            LecturerNCK.lecturerName = profile.full_name || profile.name || 'Lecturer';
            var nameEl = document.getElementById('lecturerNCKName');
            if (nameEl) nameEl.textContent = LecturerNCK.lecturerName;
            var shortEl = document.getElementById('lecturerNCKShortName');
            if (shortEl) shortEl.textContent = LecturerNCK.lecturerName;
            return;
        }
        
        var staffSession = localStorage.getItem('staffSession');
        if (staffSession) {
            var data = JSON.parse(staffSession);
            LecturerNCK.lecturerId = data.staffId || data.user_id;
            LecturerNCK.lecturerName = data.name || 'Lecturer';
            var nameEl2 = document.getElementById('lecturerNCKName');
            if (nameEl2) nameEl2.textContent = LecturerNCK.lecturerName;
            var shortEl2 = document.getElementById('lecturerNCKShortName');
            if (shortEl2) shortEl2.textContent = LecturerNCK.lecturerName;
            return;
        }
        
        LecturerNCK.lecturerName = 'You';
        var nameEl3 = document.getElementById('lecturerNCKName');
        if (nameEl3) nameEl3.textContent = 'You';
        var shortEl3 = document.getElementById('lecturerNCKShortName');
        if (shortEl3) shortEl3.textContent = 'You';
        
    } catch (e) {
        console.error('Error getting lecturer info:', e);
    }
}

// ============================================================
// LOAD NCK COLUMNS
// ============================================================
function lecturerNCKLoadColumns() {
    var sheetEl = document.getElementById('lecturerNCKSheet');
    var sheet = sheetEl ? sheetEl.value : 'XY_FORMS';
    var key = 'nck_columns_' + sheet;
    var columns = JSON.parse(localStorage.getItem(key));
    
    if (!columns) {
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
    
    LecturerNCK.columns = columns.filter(function(c) { return c.visible; });
    var colEl = document.getElementById('lecturer_nck_block_columns');
    if (colEl) colEl.textContent = LecturerNCK.columns.length;
}

// ============================================================
// LOAD NCK DATA
// ============================================================
async function lecturerNCKLoadData() {
    console.log('📊 lecturerNCKLoadData called');
    
    var intakeEl = document.getElementById('lecturerNCKIntake');
    var sheetEl = document.getElementById('lecturerNCKSheet');
    var intake = intakeEl ? intakeEl.value : '2026';
    var sheet = sheetEl ? sheetEl.value : 'XY_FORMS';
    
    LecturerNCK.currentIntake = intake;
    LecturerNCK.currentSheet = sheet;
    
    var container = document.getElementById('lecturerNCKTableContainer');
    var placeholder = document.getElementById('lecturerNCKPlaceholder');
    if (placeholder) placeholder.style.display = 'none';
    
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #94a3b8;">
                <div class="loading-spinner" style="display: inline-block; width: 30px; height: 30px; border: 3px solid #e5e7eb; border-top-color: #4C1D95; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <p style="margin-top: 15px;">Loading your NCK data...</p>
            </div>
        `;
    }
    
    try {
        var supabase = window.lecturerDB?.supabase || window.sb;
        if (!supabase) throw new Error('Database not available');
        
        var lecturerId = LecturerNCK.lecturerId;
        if (!lecturerId) {
            container.innerHTML = '<div style="text-align:center;padding:40px;color:#dc2626;">Lecturer ID not found. Please refresh.</div>';
            return;
        }
        
        // Get students assigned to this lecturer for KRCHN
        var { data: assignments, error: assignError } = await supabase
            .from('lecturer_subject_assignments')
            .select('student_id, student_name, program, intake_year, block, registration_number')
            .eq('lecturer_id', String(lecturerId))
            .eq('intake_year', parseInt(intake));
        
        if (assignError) throw assignError;
        
        var krchnStudents = (assignments || []).filter(function(s) {
            return s.program === 'KRCHN' || (s.program && s.program.includes('KRCHN'));
        });
        
        if (krchnStudents.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #94a3b8;">
                    <i class="fas fa-users" style="font-size: 32px; display: block; margin-bottom: 10px; color: #e2e8f0;"></i>
                    <p style="font-size: 16px; font-weight: 500; color: #475569;">No KRCHN students assigned to you</p>
                    <p style="font-size: 13px; margin: 0;">You don't have any KRCHN students for ${intake} intake</p>
                    <button onclick="lecturerNCKLoadData()" style="margin-top: 15px; padding: 8px 20px; background: #4C1D95; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-sync-alt"></i> Retry
                    </button>
                </div>
            `;
            return;
        }
        
        LecturerNCK.students = krchnStudents;
        
        // Get existing NCK marks
        var studentIds = krchnStudents.map(function(s) { return s.student_id; });
        var { data: marks, error: marksError } = await supabase
            .from('nck_marks')
            .select('*')
            .in('student_id', studentIds)
            .eq('sheet_type', sheet);
        
        if (marksError) throw marksError;
        
        // Build marks map
        LecturerNCK.marks = {};
        (marks || []).forEach(function(m) {
            if (!LecturerNCK.marks[m.student_id]) {
                LecturerNCK.marks[m.student_id] = {};
            }
            LecturerNCK.marks[m.student_id][m.column_id] = m;
        });
        
        // Render table
        lecturerNCKRenderTable();
        
        // Update stats
        lecturerNCKUpdateStats();
        
        // Check approval status
        lecturerNCKCheckApprovalStatus();
        
        console.log('✅ Loaded ' + krchnStudents.length + ' KRCHN students for ' + intake);
        
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
    var container = document.getElementById('lecturerNCKTableContainer');
    if (!container) return;
    
    var students = LecturerNCK.students;
    var columns = LecturerNCK.columns;
    
    if (!students || students.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;">No students found</div>';
        return;
    }
    
    var html = `
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
                    <i class="fas fa-save"></i> Save All
                </button>
                <button onclick="lecturerNCKSubmitForApproval()" style="background: #4C1D95; padding: 6px 14px; border: none; border-radius: 6px; color: white; cursor: pointer; font-size: 12px; font-weight: 600;">
                    <i class="fas fa-paper-plane"></i> Submit for Approval
                </button>
                <button onclick="lecturerNCKWithdrawApproval()" style="background: #d97706; padding: 6px 14px; border: none; border-radius: 6px; color: white; cursor: pointer; font-size: 12px; font-weight: 600;">
                    <i class="fas fa-undo"></i> Withdraw
                </button>
            </div>
        </div>
        
        <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                    <tr style="background: linear-gradient(135deg, #4C1D95, #7c3aed); color: white; position: sticky; top: 0; z-index: 5;">
                        <th style="padding: 10px 8px; text-align: center;">#</th>
                        <th style="padding: 10px 8px; text-align: left;">Student Name</th>
                        <th style="padding: 10px 8px; text-align: left;">Reg No</th>
    `;
    
    columns.forEach(function(col) {
        html += '<th style="padding: 10px 8px; text-align: center; background: #6d28d9;">' + col.label + '</th>';
    });
    
    html += `
                        <th style="padding: 10px 8px; text-align: center; background: #4C1D95;">AVG %</th>
                        <th style="padding: 10px 8px; text-align: center; background: #4C1D95;">Status</th>
                        <th style="padding: 10px 8px; text-align: center; background: #4C1D95;">Approval</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    students.forEach(function(student, idx) {
        var marks = LecturerNCK.marks[student.student_id] || {};
        var rowValues = [];
        var total = 0;
        var count = 0;
        
        columns.forEach(function(col) {
            var mark = marks[col.id];
            var value = (mark && mark.marks !== undefined && mark.marks !== null) ? mark.marks : '';
            rowValues.push(value);
            if (value !== '' && !isNaN(parseFloat(value))) {
                total += parseFloat(value);
                count++;
            }
        });
        
        var avg = count > 0 ? total / count : 0;
        var status = avg >= 60 ? 'PASS' : (avg > 0 ? 'FAIL' : 'PENDING');
        var statusColor = status === 'PASS' ? '#d1fae5' : (status === 'FAIL' ? '#fee2e2' : '#fef3c7');
        var statusTextColor = status === 'PASS' ? '#065f46' : (status === 'FAIL' ? '#991b1b' : '#92400e');
        var statusIcon = status === 'PASS' ? '✅' : (status === 'FAIL' ? '❌' : '⏳');
        
        var approvalStatus = 'draft';
        columns.forEach(function(col) {
            var mark = marks[col.id];
            if (mark && mark.approval_status) approvalStatus = mark.approval_status;
        });
        
        var approvalBadge = {
            'pending': '<span style="background:#fef3c7;color:#92400e;padding:2px 10px;border-radius:12px;font-size:11px;">⏳ Pending</span>',
            'approved': '<span style="background:#d1fae5;color:#065f46;padding:2px 10px;border-radius:12px;font-size:11px;">✅ Approved</span>',
            'rejected': '<span style="background:#fee2e2;color:#991b1b;padding:2px 10px;border-radius:12px;font-size:11px;">❌ Rejected</span>',
            'draft': '<span style="background:#e5e7eb;color:#6b7280;padding:2px 10px;border-radius:12px;font-size:11px;">📝 Draft</span>'
        };
        var badgeHtml = approvalBadge[approvalStatus] || approvalBadge['draft'];
        
        html += `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 6px; text-align: center; font-weight: 600; color: #64748b;">${idx + 1}</td>
                <td style="padding: 8px 6px; font-weight: 500;">${student.student_name || 'Unknown'}</td>
                <td style="padding: 8px 6px; color: #64748b; font-size: 12px;">${student.registration_number || 'N/A'}</td>
        `;
        
        columns.forEach(function(col, colIdx) {
            var value = rowValues[colIdx];
            var isFilled = value !== '' && !isNaN(parseFloat(value));
            var val = isFilled ? parseFloat(value) : '';
            
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
                <td style="padding: 8px 6px; text-align: center;">${badgeHtml}</td>
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
// UPDATE ROW
// ============================================================
function lecturerNCKUpdateRow(studentId) {
    var inputs = document.querySelectorAll('.nck-mark-input[data-student="' + studentId + '"]');
    var total = 0;
    var count = 0;
    
    inputs.forEach(function(input) {
        var val = parseFloat(input.value);
        if (!isNaN(val) && val > 0) {
            total += val;
            count++;
        }
    });
    
    var avg = count > 0 ? total / count : 0;
    var studentIndex = -1;
    for (var i = 0; i < LecturerNCK.students.length; i++) {
        if (LecturerNCK.students[i].student_id === studentId) {
            studentIndex = i;
            break;
        }
    }
    if (studentIndex === -1) return;
    
    var avgEl = document.getElementById('nck_avg_' + studentIndex);
    var statusEl = document.getElementById('nck_status_' + studentIndex);
    
    if (avgEl) {
        avgEl.textContent = avg > 0 ? avg.toFixed(1) : '--';
        avgEl.style.color = avg >= 60 ? '#10b981' : (avg > 0 ? '#dc2626' : '#f59e0b');
    }
    
    if (statusEl) {
        var status = avg >= 60 ? 'PASS' : (avg > 0 ? 'FAIL' : 'PENDING');
        var statusColor = status === 'PASS' ? '#d1fae5' : (status === 'FAIL' ? '#fee2e2' : '#fef3c7');
        var statusTextColor = status === 'PASS' ? '#065f46' : (status === 'FAIL' ? '#991b1b' : '#92400e');
        var statusIcon = status === 'PASS' ? '✅' : (status === 'FAIL' ? '❌' : '⏳');
        
        statusEl.innerHTML = `
            <span style="background: ${statusColor}; padding: 3px 12px; border-radius: 12px; color: ${statusTextColor}; font-weight: 600; display: inline-block; font-size: 12px;">
                ${statusIcon} ${status}
            </span>
        `;
    }
    
    inputs.forEach(function(input) {
        var val = parseFloat(input.value);
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
    
    var supabase = window.lecturerDB?.supabase || window.sb;
    if (!supabase) {
        showNotification('Database not available', 'error');
        LecturerNCK.isSaving = false;
        return;
    }
    
    var inputs = document.querySelectorAll('.nck-mark-input');
    if (!inputs.length) {
        showNotification('No marks to save', 'warning');
        LecturerNCK.isSaving = false;
        return;
    }
    
    var hasValues = false;
    var marksToSave = [];
    
    inputs.forEach(function(input) {
        var val = parseFloat(input.value);
        if (!isNaN(val) && val > 0) {
            hasValues = true;
            marksToSave.push({
                student_id: input.dataset.student,
                column_id: input.dataset.column,
                marks: val,
                student_name: 'Unknown',
                intake_year: parseInt(LecturerNCK.currentIntake),
                sheet_type: LecturerNCK.currentSheet
            });
        }
    });
    
    // Find student names
    marksToSave.forEach(function(mark) {
        for (var i = 0; i < LecturerNCK.students.length; i++) {
            if (LecturerNCK.students[i].student_id === mark.student_id) {
                mark.student_name = LecturerNCK.students[i].student_name || 'Unknown';
                break;
            }
        }
    });
    
    if (!hasValues) {
        showNotification('No scores entered to save', 'warning');
        LecturerNCK.isSaving = false;
        return;
    }
    
    if (!confirm('💾 Save ' + marksToSave.length + ' marks for ' + LecturerNCK.currentSheet + '?')) {
        LecturerNCK.isSaving = false;
        return;
    }
    
    showLoading('Saving NCK marks...');
    var saved = 0;
    var errors = 0;
    
    try {
        for (var i = 0; i < marksToSave.length; i++) {
            var mark = marksToSave[i];
            try {
                var { data: existing, error: findError } = await supabase
                    .from('nck_marks')
                    .select('id, approval_status')
                    .eq('student_id', mark.student_id)
                    .eq('column_id', mark.column_id)
                    .eq('sheet_type', mark.sheet_type)
                    .maybeSingle();
                
                if (findError) throw findError;
                
                var markData = {
                    student_id: mark.student_id,
                    student_name: mark.student_name,
                    column_id: mark.column_id,
                    marks: mark.marks,
                    sheet_type: mark.sheet_type,
                    intake_year: mark.intake_year,
                    updated_at: new Date().toISOString(),
                    graded_by: LecturerNCK.lecturerName
                };
                
                if (existing) {
                    var newStatus = existing.approval_status || 'draft';
                    if (existing.approval_status === 'approved' || existing.approval_status === 'pending') {
                        newStatus = 'draft';
                    }
                    markData.approval_status = newStatus;
                    var { error: updateError } = await supabase
                        .from('nck_marks')
                        .update(markData)
                        .eq('id', existing.id);
                    if (updateError) throw updateError;
                } else {
                    markData.approval_status = 'draft';
                    markData.created_at = new Date().toISOString();
                    var { error: insertError } = await supabase
                        .from('nck_marks')
                        .insert([markData]);
                    if (insertError) throw insertError;
                }
                saved++;
            } catch (err) {
                errors++;
                console.error('Error saving mark:', err);
            }
        }
        
        hideLoading();
        var msg = '✅ ' + saved + ' marks saved';
        if (errors > 0) msg += ', ' + errors + ' errors';
        showNotification(msg, errors > 0 ? 'warning' : 'success');
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
    
    var supabase = window.lecturerDB?.supabase || window.sb;
    if (!supabase) {
        showNotification('Database not available', 'error');
        return;
    }
    
    var students = LecturerNCK.students;
    if (!students || students.length === 0) {
        showNotification('No students loaded', 'warning');
        return;
    }
    
    showLoading('Checking marks for submission...');
    
    try {
        var studentIds = students.map(function(s) { return s.student_id; });
        var { data: marks, error } = await supabase
            .from('nck_marks')
            .select('*')
            .in('student_id', studentIds)
            .eq('sheet_type', LecturerNCK.currentSheet);
        
        if (error) throw error;
        
        var draftMarks = (marks || []).filter(function(m) {
            return m.approval_status === 'draft' || m.approval_status === 'rejected';
        });
        var pendingMarks = (marks || []).filter(function(m) { return m.approval_status === 'pending'; });
        var approvedMarks = (marks || []).filter(function(m) { return m.approval_status === 'approved'; });
        
        hideLoading();
        
        if (draftMarks.length === 0) {
            if (approvedMarks.length > 0) {
                showNotification('✅ All marks are already approved!', 'success');
            } else if (pendingMarks.length > 0) {
                showNotification('⏳ ' + pendingMarks.length + ' marks are already pending approval', 'warning');
            } else {
                showNotification('No marks to submit. Please enter marks first.', 'warning');
            }
            return;
        }
        
        if (!confirm('📤 Submit ' + draftMarks.length + ' marks for approval?')) {
            return;
        }
        
        showLoading('Submitting ' + draftMarks.length + ' marks...');
        
        var ids = draftMarks.map(function(m) { return m.id; });
        var { error: updateError } = await supabase
            .from('nck_marks')
            .update({
                approval_status: 'pending',
                submitted_at: new Date().toISOString(),
                submitted_by: LecturerNCK.lecturerId
            })
            .in('id', ids);
        
        hideLoading();
        
        if (updateError) {
            showNotification('❌ Error submitting: ' + updateError.message, 'error');
        } else {
            showNotification('✅ ' + draftMarks.length + ' marks submitted for approval!', 'success');
        }
        
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
    var supabase = window.lecturerDB?.supabase || window.sb;
    if (!supabase) {
        showNotification('Database not available', 'error');
        return;
    }
    
    var students = LecturerNCK.students;
    if (!students || students.length === 0) {
        showNotification('No students loaded', 'warning');
        return;
    }
    
    showLoading('Checking pending marks...');
    
    try {
        var studentIds = students.map(function(s) { return s.student_id; });
        var { data: pendingMarks, error } = await supabase
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
        
        if (!confirm('⏪ Withdraw ' + pendingMarks.length + ' marks from approval?')) {
            return;
        }
        
        showLoading('Withdrawing ' + pendingMarks.length + ' marks...');
        
        var ids = pendingMarks.map(function(m) { return m.id; });
        var { error: updateError } = await supabase
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
            showNotification('✅ ' + pendingMarks.length + ' marks withdrawn from approval!', 'success');
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
    var students = LecturerNCK.students;
    var marks = LecturerNCK.marks;
    
    var statIds = ['lecturerNCKTotalStudents', 'lecturerNCKPassRate', 'lecturerNCKAvgScore', 
                   'lecturerNCKAtRisk', 'lecturerNCKPublished', 'lecturerNCKPending', 
                   'lecturer_nck_block_students'];
    
    if (!students || students.length === 0) {
        statIds.forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.textContent = '0';
        });
        return;
    }
    
    var totalScore = 0;
    var countWithScores = 0;
    var passing = 0;
    var failing = 0;
    var approved = 0;
    var pending = 0;
    
    students.forEach(function(student) {
        var studentMarks = marks[student.student_id] || {};
        var total = 0;
        var count = 0;
        
        LecturerNCK.columns.forEach(function(col) {
            var mark = studentMarks[col.id];
            if (mark && mark.marks !== undefined && mark.marks !== null && !isNaN(parseFloat(mark.marks))) {
                total += parseFloat(mark.marks);
                count++;
            }
        });
        
        var avg = count > 0 ? total / count : 0;
        
        if (avg > 0) {
            totalScore += avg;
            countWithScores++;
            if (avg >= 60) passing++;
            else failing++;
        }
        
        var hasApproved = false;
        var hasPending = false;
        LecturerNCK.columns.forEach(function(col) {
            var mark = studentMarks[col.id];
            if (mark && mark.approval_status === 'approved') hasApproved = true;
            if (mark && mark.approval_status === 'pending') hasPending = true;
        });
        
        if (hasApproved) approved++;
        if (hasPending) pending++;
    });
    
    var avgScore = countWithScores > 0 ? Math.round(totalScore / countWithScores) : 0;
    var passRate = students.length > 0 ? Math.round((passing / students.length) * 100) : 0;
    
    var map = {
        'lecturerNCKTotalStudents': students.length,
        'lecturerNCKPassRate': passRate + '%',
        'lecturerNCKAvgScore': avgScore + '%',
        'lecturerNCKAtRisk': failing,
        'lecturerNCKPublished': approved,
        'lecturerNCKPending': pending,
        'lecturer_nck_block_students': students.length
    };
    
    Object.keys(map).forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.textContent = map[id];
    });
}

// ============================================================
// CHECK APPROVAL STATUS
// ============================================================
function lecturerNCKCheckApprovalStatus() {
    var students = LecturerNCK.students;
    var marks = LecturerNCK.marks;
    
    var banner = document.getElementById('lecturerNCKApprovalBanner');
    if (!banner) return;
    
    if (!students || students.length === 0) {
        banner.style.display = 'none';
        return;
    }
    
    var pendingCount = 0;
    var approvedCount = 0;
    var draftCount = 0;
    var rejectedCount = 0;
    
    students.forEach(function(student) {
        var studentMarks = marks[student.student_id] || {};
        LecturerNCK.columns.forEach(function(col) {
            var mark = studentMarks[col.id];
            if (mark && mark.approval_status) {
                if (mark.approval_status === 'pending') pendingCount++;
                else if (mark.approval_status === 'approved') approvedCount++;
                else if (mark.approval_status === 'rejected') rejectedCount++;
                else draftCount++;
            } else {
                draftCount++;
            }
        });
    });
    
    var totalMarks = pendingCount + approvedCount + draftCount + rejectedCount;
    if (totalMarks === 0) {
        banner.style.display = 'none';
        return;
    }
    
    banner.style.display = 'block';
    var statusText = document.getElementById('lecturerNCKStatusText');
    var statusBadge = document.getElementById('lecturerNCKStatusBadge');
    var submitBtn = document.getElementById('lecturerNCKSubmitBtn');
    var withdrawBtn = document.getElementById('lecturerNCKWithdrawBtn2');
    
    if (pendingCount > 0) {
        banner.style.borderLeftColor = '#f59e0b';
        banner.style.background = '#fef3c7';
        if (statusText) statusText.textContent = pendingCount + ' marks pending Admin Approval';
        if (statusBadge) {
            statusBadge.textContent = '⏳ Pending';
            statusBadge.style.cssText = 'background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 12px; font-size: 12px;';
        }
        if (submitBtn) submitBtn.style.display = 'none';
        if (withdrawBtn) withdrawBtn.style.display = 'inline-block';
    } else if (approvedCount > 0 && pendingCount === 0) {
        banner.style.borderLeftColor = '#10b981';
        banner.style.background = '#d1fae5';
        if (statusText) statusText.textContent = '✅ ' + approvedCount + ' marks Approved by Admin';
        if (statusBadge) {
            statusBadge.textContent = '✅ Approved';
            statusBadge.style.cssText = 'background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 12px; font-size: 12px;';
        }
        if (submitBtn) submitBtn.style.display = 'none';
        if (withdrawBtn) withdrawBtn.style.display = 'none';
    } else if (rejectedCount > 0) {
        banner.style.borderLeftColor = '#dc2626';
        banner.style.background = '#fee2e2';
        if (statusText) statusText.textContent = '❌ ' + rejectedCount + ' marks Rejected by Admin';
        if (statusBadge) {
            statusBadge.textContent = '❌ Rejected';
            statusBadge.style.cssText = 'background: #fee2e2; color: #991b1b; padding: 4px 12px; border-radius: 12px; font-size: 12px;';
        }
        if (submitBtn) submitBtn.style.display = 'inline-block';
        if (withdrawBtn) withdrawBtn.style.display = 'none';
    } else if (draftCount > 0) {
        banner.style.borderLeftColor = '#6b7280';
        banner.style.background = '#f3f4f6';
        if (statusText) statusText.textContent = '📝 ' + draftCount + ' marks in Draft - Ready to submit';
        if (statusBadge) {
            statusBadge.textContent = '📝 Draft';
            statusBadge.style.cssText = 'background: #e5e7eb; color: #6b7280; padding: 4px 12px; border-radius: 12px; font-size: 12px;';
        }
        if (submitBtn) submitBtn.style.display = 'inline-block';
        if (withdrawBtn) withdrawBtn.style.display = 'none';
    }
}

// ============================================================
// EXPORT CSV
// ============================================================
function lecturerNCKExportCSV() {
    var students = LecturerNCK.students;
    var columns = LecturerNCK.columns;
    
    if (!students || students.length === 0) {
        showNotification('No data to export', 'warning');
        return;
    }
    
    var headers = ['#', 'Student Name', 'Registration', 'Program'];
    columns.forEach(function(col) { headers.push(col.label); });
    headers.push('Average', 'Status', 'Approval');
    
    var rows = [];
    students.forEach(function(student, idx) {
        var studentMarks = LecturerNCK.marks[student.student_id] || {};
        var row = [
            idx + 1,
            student.student_name || 'Unknown',
            student.registration_number || 'N/A',
            student.program || 'KRCHN'
        ];
        
        var total = 0;
        var count = 0;
        columns.forEach(function(col) {
            var mark = studentMarks[col.id];
            var val = (mark && mark.marks !== undefined && mark.marks !== null) ? parseFloat(mark.marks) : '';
            row.push(val !== '' && !isNaN(val) ? val : '');
            if (val !== '' && !isNaN(val)) {
                total += val;
                count++;
            }
        });
        
        var avg = count > 0 ? total / count : 0;
        var status = avg >= 60 ? 'PASS' : (avg > 0 ? 'FAIL' : 'PENDING');
        row.push(avg > 0 ? avg.toFixed(1) : '');
        row.push(status);
        
        var approvalStatus = 'draft';
        columns.forEach(function(col) {
            var mark = studentMarks[col.id];
            if (mark && mark.approval_status) approvalStatus = mark.approval_status;
        });
        row.push(approvalStatus);
        
        rows.push(row);
    });
    
    var csv = headers.join(',') + '\n';
    rows.forEach(function(row) {
        csv += row.map(function(cell) { return '"' + String(cell).replace(/"/g, '""') + '"'; }).join(',') + '\n';
    });
    
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'NCK_' + LecturerNCK.currentSheet + '_' + LecturerNCK.currentIntake + '.csv';
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
window.lecturerNCKExportCSV = lecturerNCKExportCSV;
window.lecturerNCKGetLecturerInfo = lecturerNCKGetLecturerInfo;

console.log('✅ Lecturer NCK module loaded successfully');
