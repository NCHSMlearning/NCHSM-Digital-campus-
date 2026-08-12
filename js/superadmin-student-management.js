// ============================================================
// SUPER ADMIN STUDENT MANAGEMENT MODULE
// CHANGE OF PROGRAM & READMISSION
// ============================================================

// ============================================================
// STATE
// ============================================================
const SM_STATE = {
    changeRequests: [],
    readmissionRequests: [],
    history: [],
    currentRequestId: null,
    currentType: null,
    selectedChange: new Set(),
    selectedReadmission: new Set(),
    stats: {
        total: 0,
        change: 0,
        readmission: 0,
        approved: 0,
        rejected: 0
    },
    filters: {
        change: { search: '', status: 'all' },
        readmission: { search: '', status: 'all' },
        history: { type: 'all', status: 'all', dateFrom: '', dateTo: '' }
    }
};

// ============================================================
// INITIALIZATION
// ============================================================
function initStudentManagement() {
    console.log('🎓 Student Management Module initialized');
    loadStudentsForDropdown();
    loadChangeProgramRequests();
    loadReadmissionRequests();
    loadSMHistory();
    updateSMStats();
    toggleSMRequestFields();
    updateSMBadges();
}

// ============================================================
// LOAD STUDENTS FOR DROPDOWN (FROM consolidated_user_profiles_table)
// ============================================================
async function loadStudentsForDropdown() {
    try {
        if (typeof showLoading === 'function') showLoading('Loading students...');
        
        const { data, error } = await supabase
            .from('consolidated_user_profiles_table')
            .select('student_id, full_name, program, block, intake_year, intake_month')
            .eq('role', 'student')
            .eq('status', 'approved')
            .order('full_name', { ascending: true });

        if (error) throw error;

        const select = document.getElementById('smStudentSelect');
        if (!select) {
            if (typeof hideLoading === 'function') hideLoading();
            return;
        }
        
        select.innerHTML = '<option value="">-- Select Student --</option>';
        
        if (data && data.length > 0) {
            data.forEach(student => {
                const opt = document.createElement('option');
                opt.value = student.student_id;
                opt.textContent = `${student.full_name} (${student.student_id || 'N/A'}) - ${student.program || 'No Program'}`;
                opt.dataset.program = student.program || '';
                opt.dataset.block = student.block || '';
                opt.dataset.studentId = student.student_id || '';
                select.appendChild(opt);
            });
        }

        // Auto-populate current program when student is selected
        select.onchange = function() {
            const selected = this.options[this.selectedIndex];
            const program = selected?.dataset?.program || '';
            
            const currentProgramSelect = document.getElementById('smCurrentProgram');
            if (currentProgramSelect && program) {
                for (let opt of currentProgramSelect.options) {
                    if (opt.value === program) {
                        currentProgramSelect.value = program;
                        break;
                    }
                }
            }
            
            const previousProgramSelect = document.getElementById('smPreviousProgram');
            if (previousProgramSelect && program) {
                for (let opt of previousProgramSelect.options) {
                    if (opt.value === program) {
                        previousProgramSelect.value = program;
                        break;
                    }
                }
            }
        };

        if (typeof hideLoading === 'function') hideLoading();

    } catch (error) {
        console.error('Error loading students:', error);
        if (typeof showNotification === 'function') {
            showNotification('Failed to load students', 'error');
        }
        if (typeof hideLoading === 'function') hideLoading();
    }
}

// ============================================================
// LOAD CHANGE OF PROGRAM REQUESTS
// ============================================================
async function loadChangeProgramRequests() {
    try {
        const search = document.getElementById('smChangeSearch')?.value?.toLowerCase() || '';
        const status = document.getElementById('smChangeStatusFilter')?.value || 'all';
        
        let query = supabase
            .from('student_requests')
            .select(`
                *,
                student:student_id (student_id, full_name, program, block)
            `)
            .eq('request_type', 'change_program')
            .order('created_at', { ascending: false });

        if (status !== 'all') {
            query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Apply search filter
        let filtered = data || [];
        if (search) {
            filtered = filtered.filter(r => 
                r.student?.full_name?.toLowerCase().includes(search) ||
                r.student?.student_id?.toLowerCase().includes(search)
            );
        }

        SM_STATE.changeRequests = filtered;
        renderChangeProgramTable();
        updateSMStats();
        updateSMBadges();

    } catch (error) {
        console.error('Error loading change program requests:', error);
        const tbody = document.getElementById('smChangeProgramBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr><td colspan="7" style="padding: 40px; text-align: center; color: #dc2626;">
                    <i class="fas fa-exclamation-circle" style="font-size: 24px; display: block; margin-bottom: 10px;"></i>
                    Error loading requests: ${error.message}
                </td></tr>
            `;
        }
        if (typeof showNotification === 'function') {
            showNotification('Error loading change program requests', 'error');
        }
    }
}

// ============================================================
// RENDER CHANGE PROGRAM TABLE
// ============================================================
function renderChangeProgramTable() {
    const tbody = document.getElementById('smChangeProgramBody');
    if (!tbody) return;
    
    const requests = SM_STATE.changeRequests;
    
    if (!requests || requests.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="padding: 40px; text-align: center; color: #94a3b8;">
            <i class="fas fa-inbox" style="font-size: 24px; display: block; margin-bottom: 10px;"></i>
            No change of program requests found.
        </td></tr>`;
        return;
    }
    
    let html = '';
    requests.forEach((r, index) => {
        const statusClass = r.status || 'pending';
        const statusLabel = statusClass.charAt(0).toUpperCase() + statusClass.slice(1);
        const date = r.created_at ? new Date(r.created_at).toLocaleDateString() : 'N/A';
        const studentName = r.student?.full_name || 'Unknown';
        const studentId = r.student?.student_id || 'N/A';
        const currentProgram = r.current_program || 'N/A';
        const requestedProgram = r.requested_program || 'N/A';
        
        html += `
        <tr style="border-bottom: 1px solid #e5e7eb; ${index % 2 === 0 ? 'background: #f8fafc;' : ''}">
            <td style="text-align: center; padding: 12px 8px;">
                <input type="checkbox" class="sm-checkbox change-checkbox" data-id="${r.id}" onchange="updateSMCounter('change')" style="width: 16px; height: 16px; cursor: pointer;">
            </td>
            <td style="padding: 12px 16px;">
                <strong>${escapeHtml(studentName)}</strong>
                <div style="font-size: 11px; color: #94a3b8;">${escapeHtml(studentId)}</div>
            </td>
            <td style="padding: 12px 16px;">
                <span style="background: #dbeafe; padding: 2px 12px; border-radius: 12px; font-size: 12px; color: #1e40af;">${escapeHtml(currentProgram)}</span>
            </td>
            <td style="padding: 12px 16px;">
                <span style="background: #fef3c7; padding: 2px 12px; border-radius: 12px; font-size: 12px; color: #92400e;">${escapeHtml(requestedProgram)}</span>
            </td>
            <td style="padding: 12px 16px; text-align: center; font-size: 12px; color: #64748b;">${date}</td>
            <td style="padding: 12px 16px; text-align: center;">
                <span class="sm-status-badge ${statusClass}">${statusLabel}</span>
            </td>
            <td style="padding: 12px 16px; text-align: center;">
                <button onclick="viewSMRequest('${r.id}', 'change')" style="padding: 4px 12px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; transition: 0.2s;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
                    <i class="fas fa-eye"></i> View
                </button>
                ${r.status === 'pending' ? `
                <button onclick="quickApproveSM('${r.id}', 'change')" style="padding: 4px 10px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; margin-top: 4px; transition: 0.2s;" onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'">
                    <i class="fas fa-check"></i>
                </button>
                ` : ''}
            </td>
        </tr>
    `});
    
    tbody.innerHTML = html;
    updateSMCounter('change');
}

// ============================================================
// LOAD READMISSION REQUESTS
// ============================================================
async function loadReadmissionRequests() {
    try {
        const search = document.getElementById('smReadmissionSearch')?.value?.toLowerCase() || '';
        const status = document.getElementById('smReadmissionStatusFilter')?.value || 'all';
        
        let query = supabase
            .from('student_requests')
            .select(`
                *,
                student:student_id (student_id, full_name, program, block)
            `)
            .eq('request_type', 'readmission')
            .order('created_at', { ascending: false });

        if (status !== 'all') {
            query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Apply search filter
        let filtered = data || [];
        if (search) {
            filtered = filtered.filter(r => 
                r.student?.full_name?.toLowerCase().includes(search) ||
                r.student?.student_id?.toLowerCase().includes(search)
            );
        }

        SM_STATE.readmissionRequests = filtered;
        renderReadmissionTable();
        updateSMStats();
        updateSMBadges();

    } catch (error) {
        console.error('Error loading readmission requests:', error);
        const tbody = document.getElementById('smReadmissionBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr><td colspan="7" style="padding: 40px; text-align: center; color: #dc2626;">
                    <i class="fas fa-exclamation-circle" style="font-size: 24px; display: block; margin-bottom: 10px;"></i>
                    Error loading requests: ${error.message}
                </td></tr>
            `;
        }
        if (typeof showNotification === 'function') {
            showNotification('Error loading readmission requests', 'error');
        }
    }
}

// ============================================================
// RENDER READMISSION TABLE
// ============================================================
function renderReadmissionTable() {
    const tbody = document.getElementById('smReadmissionBody');
    if (!tbody) return;
    
    const requests = SM_STATE.readmissionRequests;
    
    if (!requests || requests.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="padding: 40px; text-align: center; color: #94a3b8;">
            <i class="fas fa-inbox" style="font-size: 24px; display: block; margin-bottom: 10px;"></i>
            No readmission requests found.
        </td></tr>`;
        return;
    }
    
    let html = '';
    requests.forEach((r, index) => {
        const statusClass = r.status || 'pending';
        const statusLabel = statusClass.charAt(0).toUpperCase() + statusClass.slice(1);
        const date = r.created_at ? new Date(r.created_at).toLocaleDateString() : 'N/A';
        const studentName = r.student?.full_name || 'Unknown';
        const studentId = r.student?.student_id || 'N/A';
        const previousProgram = r.previous_program || 'N/A';
        const requestedProgram = r.requested_program || 'N/A';
        
        html += `
        <tr style="border-bottom: 1px solid #e5e7eb; ${index % 2 === 0 ? 'background: #f8fafc;' : ''}">
            <td style="text-align: center; padding: 12px 8px;">
                <input type="checkbox" class="sm-checkbox readmission-checkbox" data-id="${r.id}" onchange="updateSMCounter('readmission')" style="width: 16px; height: 16px; cursor: pointer;">
            </td>
            <td style="padding: 12px 16px;">
                <strong>${escapeHtml(studentName)}</strong>
                <div style="font-size: 11px; color: #94a3b8;">${escapeHtml(studentId)}</div>
            </td>
            <td style="padding: 12px 16px;">
                <span style="background: #fee2e2; padding: 2px 12px; border-radius: 12px; font-size: 12px; color: #991b1b;">${escapeHtml(previousProgram)}</span>
            </td>
            <td style="padding: 12px 16px;">
                <span style="background: #d1fae5; padding: 2px 12px; border-radius: 12px; font-size: 12px; color: #065f46;">${escapeHtml(requestedProgram)}</span>
            </td>
            <td style="padding: 12px 16px; text-align: center; font-size: 12px; color: #64748b;">${date}</td>
            <td style="padding: 12px 16px; text-align: center;">
                <span class="sm-status-badge ${statusClass}">${statusLabel}</span>
            </td>
            <td style="padding: 12px 16px; text-align: center;">
                <button onclick="viewSMRequest('${r.id}', 'readmission')" style="padding: 4px 12px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; transition: 0.2s;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
                    <i class="fas fa-eye"></i> View
                </button>
                ${r.status === 'pending' ? `
                <button onclick="quickApproveSM('${r.id}', 'readmission')" style="padding: 4px 10px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; margin-top: 4px; transition: 0.2s;" onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'">
                    <i class="fas fa-check"></i>
                </button>
                ` : ''}
            </td>
        </tr>
    `});
    
    tbody.innerHTML = html;
    updateSMCounter('readmission');
}

// ============================================================
// LOAD HISTORY
// ============================================================
async function loadSMHistory() {
    try {
        const type = document.getElementById('smHistoryType')?.value || 'all';
        const status = document.getElementById('smHistoryStatus')?.value || 'all';
        const dateFrom = document.getElementById('smHistoryDateFrom')?.value || '';
        const dateTo = document.getElementById('smHistoryDateTo')?.value || '';
        
        let query = supabase
            .from('student_requests')
            .select(`
                *,
                student:student_id (student_id, full_name, program, block)
            `)
            .in('status', ['approved', 'rejected'])
            .order('updated_at', { ascending: false });

        if (type !== 'all') {
            query = query.eq('request_type', type);
        }
        
        if (status !== 'all') {
            query = query.eq('status', status);
        }
        
        if (dateFrom) {
            query = query.gte('updated_at', dateFrom);
        }
        
        if (dateTo) {
            query = query.lte('updated_at', dateTo + 'T23:59:59');
        }

        const { data, error } = await query;

        if (error) throw error;

        SM_STATE.history = data || [];
        renderHistoryTable();

    } catch (error) {
        console.error('Error loading history:', error);
        const tbody = document.getElementById('smHistoryBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr><td colspan="6" style="padding: 40px; text-align: center; color: #dc2626;">
                    <i class="fas fa-exclamation-circle" style="font-size: 24px; display: block; margin-bottom: 10px;"></i>
                    Error loading history: ${error.message}
                </td></tr>
            `;
        }
        if (typeof showNotification === 'function') {
            showNotification('Error loading history', 'error');
        }
    }
}

// ============================================================
// RENDER HISTORY TABLE
// ============================================================
function renderHistoryTable() {
    const tbody = document.getElementById('smHistoryBody');
    if (!tbody) return;
    
    const history = SM_STATE.history;
    
    if (!history || history.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="padding: 40px; text-align: center; color: #94a3b8;">
            <i class="fas fa-history" style="font-size: 24px; display: block; margin-bottom: 10px;"></i>
            No history found.
        </td></tr>`;
        return;
    }
    
    const typeLabels = {
        'change_program': 'Change of Program',
        'readmission': 'Readmission'
    };
    
    let html = '';
    history.forEach((r, index) => {
        const typeLabel = typeLabels[r.request_type] || r.request_type;
        const statusClass = r.status || 'approved';
        const statusLabel = statusClass.charAt(0).toUpperCase() + statusClass.slice(1);
        const date = r.updated_at ? new Date(r.updated_at).toLocaleDateString() : 'N/A';
        const studentName = r.student?.full_name || 'Unknown';
        const studentId = r.student?.student_id || 'N/A';
        const fromProgram = r.current_program || r.previous_program || 'N/A';
        const toProgram = r.requested_program || 'N/A';
        const approvedBy = r.approved_by || r.updated_by || 'System';
        
        html += `
        <tr style="border-bottom: 1px solid #e5e7eb; ${index % 2 === 0 ? 'background: #f8fafc;' : ''}">
            <td style="padding: 12px 16px;">
                <strong>${escapeHtml(studentName)}</strong>
                <div style="font-size: 11px; color: #94a3b8;">${escapeHtml(studentId)}</div>
            </td>
            <td style="padding: 12px 16px;">
                <span style="background: #e0e7ff; padding: 2px 12px; border-radius: 12px; font-size: 12px; color: #4C1D95;">${escapeHtml(typeLabel)}</span>
            </td>
            <td style="padding: 12px 16px; font-size: 13px;">
                ${escapeHtml(fromProgram)} <i class="fas fa-arrow-right" style="color: #94a3b8; margin: 0 6px;"></i> ${escapeHtml(toProgram)}
            </td>
            <td style="padding: 12px 16px; text-align: center; font-size: 12px; color: #64748b;">${date}</td>
            <td style="padding: 12px 16px; text-align: center;">
                <span class="sm-status-badge ${statusClass}">${statusLabel}</span>
            </td>
            <td style="padding: 12px 16px; text-align: center; font-size: 12px; color: #64748b;">${escapeHtml(approvedBy)}</td>
        </tr>
    `});
    
    tbody.innerHTML = html;
}

// ============================================================
// VIEW REQUEST DETAILS
// ============================================================
async function viewSMRequest(requestId, type) {
    if (!requestId) {
        if (typeof showNotification === 'function') {
            showNotification('Invalid request ID', 'error');
        }
        return;
    }
    
    const modal = document.getElementById('smRequestModal');
    if (!modal) {
        if (typeof showNotification === 'function') {
            showNotification('Modal not found', 'error');
        }
        return;
    }
    
    SM_STATE.currentRequestId = requestId;
    SM_STATE.currentType = type;
    
    document.getElementById('smModalTitle').textContent = 
        type === 'change' ? 'Change of Program Request' : 'Readmission Request';
    
    modal.style.display = 'flex';
    
    const body = document.getElementById('smModalBody');
    if (body) {
        body.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div class="loading-spinner" style="width: 40px; height: 40px; border: 4px solid #e2e8f0; border-top-color: #4C1D95; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
                <p style="color: #6b7280; margin-top: 10px;">Loading request details...</p>
            </div>
            <style>
                @keyframes spin { to { transform: rotate(360deg); } }
            </style>
        `;
    }
    
    document.getElementById('smModalActions').style.display = 'none';
    
    try {
        const { data, error } = await supabase
            .from('student_requests')
            .select(`
                *,
                student:student_id (student_id, full_name, program, block, intake_year, intake_month)
            `)
            .eq('id', requestId)
            .single();
        
        if (error) throw error;
        
        if (!data) {
            body.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #dc2626;">
                    <i class="fas fa-exclamation-circle" style="font-size: 48px; display: block; margin-bottom: 10px;"></i>
                    Request not found
                </div>
            `;
            return;
        }
        
        const student = data.student || {};
        const studentName = student.full_name || 'Unknown';
        const studentId = student.student_id || 'N/A';
        const program = student.program || 'N/A';
        const block = student.block || 'N/A';
        const intakeYear = student.intake_year || 'N/A';
        const intakeMonth = student.intake_month || 'N/A';
        const currentProgram = data.current_program || 'N/A';
        const previousProgram = data.previous_program || 'N/A';
        const requestedProgram = data.requested_program || 'N/A';
        const reason = data.reason || 'No reason provided';
        const status = data.status || 'pending';
        const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
        const createdAt = data.created_at ? new Date(data.created_at).toLocaleString() : 'N/A';
        const updatedAt = data.updated_at ? new Date(data.updated_at).toLocaleString() : 'N/A';
        const requestType = data.request_type || 'change_program';
        const typeLabel = requestType === 'change_program' ? 'Change of Program' : 'Readmission';
        
        let statusColor = '#f59e0b';
        if (status === 'approved') statusColor = '#10b981';
        if (status === 'rejected') statusColor = '#dc2626';
        if (status === 'processing') statusColor = '#3b82f6';
        
        const isPending = status === 'pending';
        
        const html = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div style="grid-column: 1 / -1; background: #f8fafc; padding: 12px 16px; border-radius: 8px; margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                        <span style="font-weight: 700; font-size: 16px; color: #1e293b;">${escapeHtml(studentName)}</span>
                        <span style="background: ${statusColor}20; color: ${statusColor}; padding: 4px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; border: 1px solid ${statusColor}40;">
                            ${statusLabel}
                        </span>
                    </div>
                    <div style="display: flex; gap: 20px; flex-wrap: wrap; margin-top: 8px; font-size: 13px; color: #64748b;">
                        <span><i class="fas fa-id-card"></i> ${escapeHtml(studentId)}</span>
                        <span><i class="fas fa-graduation-cap"></i> ${escapeHtml(program)}</span>
                        <span><i class="fas fa-layer-group"></i> ${escapeHtml(block)}</span>
                        <span><i class="fas fa-calendar"></i> ${escapeHtml(intakeMonth)} ${escapeHtml(intakeYear)}</span>
                    </div>
                </div>
                
                <div style="grid-column: 1 / -1; background: #f0f9ff; padding: 12px 16px; border-radius: 8px;">
                    <span style="font-weight: 600; color: #1e40af;">📋 Request Type:</span>
                    <span style="margin-left: 12px;">${escapeHtml(typeLabel)}</span>
                </div>
                
                ${requestType === 'change_program' ? `
                <div style="background: #dbeafe; padding: 10px 16px; border-radius: 8px;">
                    <span style="font-weight: 600; color: #1e40af;">Current Program:</span>
                    <div style="font-size: 15px; margin-top: 4px;">${escapeHtml(currentProgram)}</div>
                </div>
                ` : `
                <div style="background: #fee2e2; padding: 10px 16px; border-radius: 8px;">
                    <span style="font-weight: 600; color: #991b1b;">Previous Program:</span>
                    <div style="font-size: 15px; margin-top: 4px;">${escapeHtml(previousProgram)}</div>
                </div>
                `}
                
                <div style="background: #d1fae5; padding: 10px 16px; border-radius: 8px;">
                    <span style="font-weight: 600; color: #065f46;">Requested Program:</span>
                    <div style="font-size: 15px; margin-top: 4px;">${escapeHtml(requestedProgram)}</div>
                </div>
                
                <div style="grid-column: 1 / -1; background: #fef3c7; padding: 12px 16px; border-radius: 8px;">
                    <span style="font-weight: 600; color: #92400e;">💬 Reason / Justification:</span>
                    <div style="margin-top: 6px; font-size: 14px; line-height: 1.6; padding: 8px 12px; background: white; border-radius: 6px; border: 1px solid #fde68a;">
                        ${escapeHtml(reason)}
                    </div>
                </div>
                
                <div style="grid-column: 1 / -1; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px; color: #64748b;">
                    <div><i class="fas fa-clock"></i> Requested: ${createdAt}</div>
                    <div><i class="fas fa-edit"></i> Last Updated: ${updatedAt}</div>
                </div>
                
                ${data.documents && data.documents.length > 0 ? `
                <div style="grid-column: 1 / -1; background: #f0fdf4; padding: 12px 16px; border-radius: 8px; border: 1px solid #86efac;">
                    <span style="font-weight: 600; color: #065f46;"><i class="fas fa-paperclip"></i> Supporting Documents:</span>
                    <div style="margin-top: 6px; display: flex; gap: 8px; flex-wrap: wrap;">
                        ${data.documents.map(doc => `
                            <a href="${doc.url}" target="_blank" style="background: white; padding: 4px 12px; border-radius: 6px; border: 1px solid #d1d5db; font-size: 12px; text-decoration: none; color: #4C1D95;">
                                <i class="fas fa-file-alt"></i> ${doc.name || 'Document'}
                            </a>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
        `;
        
        body.innerHTML = html;
        
        // Show actions only for pending requests
        if (isPending) {
            document.getElementById('smModalActions').style.display = 'flex';
            document.getElementById('smApproveBtn').onclick = function() { approveSMRequest(requestId); };
            document.getElementById('smRejectBtn').onclick = function() { rejectSMRequest(requestId); };
        } else {
            document.getElementById('smModalActions').style.display = 'flex';
            document.getElementById('smApproveBtn').style.display = 'none';
            document.getElementById('smRejectBtn').style.display = 'none';
            // Add a close button alternative
            const actions = document.getElementById('smModalActions');
            actions.innerHTML = `
                <button onclick="closeModal('smRequestModal')" style="padding: 10px 24px; background: #6b7280; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500;">
                    Close
                </button>
            `;
        }
        
    } catch (error) {
        console.error('Error loading request details:', error);
        body.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #dc2626;">
                <i class="fas fa-exclamation-circle" style="font-size: 48px; display: block; margin-bottom: 10px;"></i>
                Error loading request: ${error.message}
            </div>
        `;
        if (typeof showNotification === 'function') {
            showNotification('Error loading request details', 'error');
        }
    }
}

// ============================================================
// APPROVE REQUEST
// ============================================================
async function approveSMRequest(requestId) {
    if (!requestId) {
        if (typeof showNotification === 'function') {
            showNotification('Invalid request ID', 'error');
        }
        return;
    }
    
    if (!confirm('✅ Approve this request?\n\nThis will update the student\'s program in the system.')) return;
    
    if (typeof showLoading === 'function') showLoading('Approving request...');
    
    try {
        // Get the request details first
        const { data: request, error: fetchError } = await supabase
            .from('student_requests')
            .select('*')
            .eq('id', requestId)
            .single();
        
        if (fetchError) throw fetchError;
        
        if (!request) {
            throw new Error('Request not found');
        }
        
        // Update the request status
        const { error: updateError } = await supabase
            .from('student_requests')
            .update({
                status: 'approved',
                approved_at: new Date().toISOString(),
                approved_by: window.currentUser?.id || 'system',
                updated_at: new Date().toISOString()
            })
            .eq('id', requestId);
        
        if (updateError) throw updateError;
        
        // Update the student's program in consolidated_user_profiles_table
        if (request.student_id && request.requested_program) {
            const { error: studentError } = await supabase
                .from('consolidated_user_profiles_table')
                .update({
                    program: request.requested_program,
                    updated_at: new Date().toISOString()
                })
                .eq('student_id', request.student_id);
            
            if (studentError) {
                console.warn('⚠️ Could not update student program:', studentError);
                // Don't throw - the request is approved, we just log the warning
            }
        }
        
        if (typeof hideLoading === 'function') hideLoading();
        closeModal('smRequestModal');
        
        if (typeof showNotification === 'function') {
            showNotification('✅ Request approved successfully!', 'success');
        }
        
        // Refresh all data
        loadChangeProgramRequests();
        loadReadmissionRequests();
        loadSMHistory();
        updateSMStats();
        updateSMBadges();
        
    } catch (error) {
        if (typeof hideLoading === 'function') hideLoading();
        console.error('Error approving request:', error);
        if (typeof showNotification === 'function') {
            showNotification('❌ Error approving: ' + error.message, 'error');
        }
    }
}

// ============================================================
// REJECT REQUEST
// ============================================================
async function rejectSMRequest(requestId) {
    if (!requestId) {
        if (typeof showNotification === 'function') {
            showNotification('Invalid request ID', 'error');
        }
        return;
    }
    
    if (!confirm('❌ Reject this request?\n\nThis action cannot be undone.')) return;
    
    if (typeof showLoading === 'function') showLoading('Rejecting request...');
    
    try {
        const { error } = await supabase
            .from('student_requests')
            .update({
                status: 'rejected',
                rejected_at: new Date().toISOString(),
                rejected_by: window.currentUser?.id || 'system',
                updated_at: new Date().toISOString()
            })
            .eq('id', requestId);
        
        if (error) throw error;
        
        if (typeof hideLoading === 'function') hideLoading();
        closeModal('smRequestModal');
        
        if (typeof showNotification === 'function') {
            showNotification('❌ Request rejected.', 'error');
        }
        
        // Refresh all data
        loadChangeProgramRequests();
        loadReadmissionRequests();
        loadSMHistory();
        updateSMStats();
        updateSMBadges();
        
    } catch (error) {
        if (typeof hideLoading === 'function') hideLoading();
        console.error('Error rejecting request:', error);
        if (typeof showNotification === 'function') {
            showNotification('❌ Error rejecting: ' + error.message, 'error');
        }
    }
}

// ============================================================
// QUICK APPROVE (from table)
// ============================================================
async function quickApproveSM(requestId, type) {
    if (!requestId) {
        if (typeof showNotification === 'function') {
            showNotification('Invalid request ID', 'warning');
        }
        return;
    }
    
    if (!confirm('✅ Quick approve this request?')) return;
    
    if (typeof showLoading === 'function') showLoading('Approving...');
    
    try {
        // Get the request details first
        const { data: request, error: fetchError } = await supabase
            .from('student_requests')
            .select('*')
            .eq('id', requestId)
            .single();
        
        if (fetchError) throw fetchError;
        
        if (!request) {
            throw new Error('Request not found');
        }
        
        // Update the request status
        const { error: updateError } = await supabase
            .from('student_requests')
            .update({
                status: 'approved',
                approved_at: new Date().toISOString(),
                approved_by: window.currentUser?.id || 'system',
                updated_at: new Date().toISOString()
            })
            .eq('id', requestId);
        
        if (updateError) throw updateError;
        
        // Update the student's program in consolidated_user_profiles_table
        if (request.student_id && request.requested_program) {
            const { error: studentError } = await supabase
                .from('consolidated_user_profiles_table')
                .update({
                    program: request.requested_program,
                    updated_at: new Date().toISOString()
                })
                .eq('student_id', request.student_id);
            
            if (studentError) {
                console.warn('⚠️ Could not update student program:', studentError);
            }
        }
        
        if (typeof hideLoading === 'function') hideLoading();
        
        if (typeof showNotification === 'function') {
            showNotification('✅ Request approved!', 'success');
        }
        
        // Refresh all data
        loadChangeProgramRequests();
        loadReadmissionRequests();
        loadSMHistory();
        updateSMStats();
        updateSMBadges();
        
    } catch (error) {
        if (typeof hideLoading === 'function') hideLoading();
        console.error('Error quick approving:', error);
        if (typeof showNotification === 'function') {
            showNotification('❌ Error: ' + error.message, 'error');
        }
    }
}

// ============================================================
// BULK APPROVE
// ============================================================
async function bulkApproveSM(type) {
    const checkboxes = document.querySelectorAll(`.${type}-checkbox:checked`);
    
    if (checkboxes.length === 0) {
        if (typeof showNotification === 'function') {
            showNotification('Please select at least one request', 'warning');
        }
        return;
    }
    
    const ids = Array.from(checkboxes).map(cb => cb.dataset.id);
    
    if (!confirm(`✅ Approve ${ids.length} selected ${type === 'change' ? 'change of program' : 'readmission'} requests?`)) return;
    
    if (typeof showLoading === 'function') showLoading(`Approving ${ids.length} requests...`);
    
    try {
        let successCount = 0;
        let errorCount = 0;
        
        for (const id of ids) {
            try {
                // Get request details
                const { data: request, error: fetchError } = await supabase
                    .from('student_requests')
                    .select('*')
                    .eq('id', id)
                    .single();
                
                if (fetchError) throw fetchError;
                
                // Update request status
                const { error: updateError } = await supabase
                    .from('student_requests')
                    .update({
                        status: 'approved',
                        approved_at: new Date().toISOString(),
                        approved_by: window.currentUser?.id || 'system',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', id);
                
                if (updateError) throw updateError;
                
                // Update student program
                if (request.student_id && request.requested_program) {
                    await supabase
                        .from('consolidated_user_profiles_table')
                        .update({
                            program: request.requested_program,
                            updated_at: new Date().toISOString()
                        })
                        .eq('student_id', request.student_id);
                }
                
                successCount++;
            } catch (err) {
                console.error(`Error approving ${id}:`, err);
                errorCount++;
            }
        }
        
        if (typeof hideLoading === 'function') hideLoading();
        
        if (typeof showNotification === 'function') {
            if (errorCount === 0) {
                showNotification(`✅ ${successCount} requests approved!`, 'success');
            } else {
                showNotification(`⚠️ ${successCount} approved, ${errorCount} errors`, 'warning');
            }
        }
        
        // Refresh all data
        loadChangeProgramRequests();
        loadReadmissionRequests();
        loadSMHistory();
        updateSMStats();
        updateSMBadges();
        
    } catch (error) {
        if (typeof hideLoading === 'function') hideLoading();
        console.error('Error bulk approving:', error);
        if (typeof showNotification === 'function') {
            showNotification('❌ Error: ' + error.message, 'error');
        }
    }
}

// ============================================================
// BULK REJECT
// ============================================================
async function bulkRejectSM(type) {
    const checkboxes = document.querySelectorAll(`.${type}-checkbox:checked`);
    
    if (checkboxes.length === 0) {
        if (typeof showNotification === 'function') {
            showNotification('Please select at least one request', 'warning');
        }
        return;
    }
    
    const ids = Array.from(checkboxes).map(cb => cb.dataset.id);
    
    if (!confirm(`❌ Reject ${ids.length} selected ${type === 'change' ? 'change of program' : 'readmission'} requests?`)) return;
    
    if (typeof showLoading === 'function') showLoading(`Rejecting ${ids.length} requests...`);
    
    try {
        let successCount = 0;
        let errorCount = 0;
        
        for (const id of ids) {
            try {
                const { error } = await supabase
                    .from('student_requests')
                    .update({
                        status: 'rejected',
                        rejected_at: new Date().toISOString(),
                        rejected_by: window.currentUser?.id || 'system',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', id);
                
                if (error) throw error;
                successCount++;
            } catch (err) {
                console.error(`Error rejecting ${id}:`, err);
                errorCount++;
            }
        }
        
        if (typeof hideLoading === 'function') hideLoading();
        
        if (typeof showNotification === 'function') {
            if (errorCount === 0) {
                showNotification(`❌ ${successCount} requests rejected.`, 'error');
            } else {
                showNotification(`⚠️ ${successCount} rejected, ${errorCount} errors`, 'warning');
            }
        }
        
        // Refresh all data
        loadChangeProgramRequests();
        loadReadmissionRequests();
        loadSMHistory();
        updateSMStats();
        updateSMBadges();
        
    } catch (error) {
        if (typeof hideLoading === 'function') hideLoading();
        console.error('Error bulk rejecting:', error);
        if (typeof showNotification === 'function') {
            showNotification('❌ Error: ' + error.message, 'error');
        }
    }
}

// ============================================================
// SUBMIT NEW REQUEST
// ============================================================
async function submitSMRequest() {
    const studentSelect = document.getElementById('smStudentSelect');
    const typeRadio = document.querySelector('input[name="requestType"]:checked');
    const reason = document.getElementById('smReason');
    const requestedProgram = document.getElementById('smRequestedProgram');
    const currentProgram = document.getElementById('smCurrentProgram');
    const previousProgram = document.getElementById('smPreviousProgram');
    const docsInput = document.getElementById('smSupportingDocs');
    
    // Validation
    if (!studentSelect || !studentSelect.value) {
        if (typeof showNotification === 'function') {
            showNotification('Please select a student', 'warning');
        }
        return;
    }
    
    if (!typeRadio) {
        if (typeof showNotification === 'function') {
            showNotification('Please select a request type', 'warning');
        }
        return;
    }
    
    if (!reason || !reason.value.trim()) {
        if (typeof showNotification === 'function') {
            showNotification('Please provide a reason', 'warning');
        }
        return;
    }
    
    if (!requestedProgram || !requestedProgram.value) {
        if (typeof showNotification === 'function') {
            showNotification('Please select a requested program', 'warning');
        }
        return;
    }
    
    const requestType = typeRadio.value;
    let programFrom = '';
    
    if (requestType === 'change_program') {
        if (!currentProgram || !currentProgram.value) {
            if (typeof showNotification === 'function') {
                showNotification('Please select the current program', 'warning');
            }
            return;
        }
        programFrom = currentProgram.value;
    } else {
        if (!previousProgram || !previousProgram.value) {
            if (typeof showNotification === 'function') {
                showNotification('Please select the previous program', 'warning');
            }
            return;
        }
        programFrom = previousProgram.value;
    }
    
    if (typeof showLoading === 'function') showLoading('Submitting request...');
    
    try {
        // Get student details from consolidated_user_profiles_table
        const { data: student, error: studentError } = await supabase
            .from('consolidated_user_profiles_table')
            .select('student_id, full_name, program, block, intake_year, intake_month')
            .eq('student_id', studentSelect.value)
            .single();
        
        if (studentError) throw studentError;
        
        // Handle document uploads
        let documents = [];
        if (docsInput && docsInput.files && docsInput.files.length > 0) {
            // Upload documents (you'll need to implement this based on your storage setup)
            // For now, we'll just store the file names
            for (const file of docsInput.files) {
                documents.push({
                    name: file.name,
                    size: file.size,
                    type: file.type
                });
            }
        }
        
        // Create the request
        const requestData = {
            student_id: student.student_id,
            student_name: student.full_name,
            request_type: requestType,
            current_program: requestType === 'change_program' ? programFrom : null,
            previous_program: requestType === 'readmission' ? programFrom : null,
            requested_program: requestedProgram.value,
            reason: reason.value.trim(),
            status: 'pending',
            documents: documents,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        const { data, error } = await supabase
            .from('student_requests')
            .insert(requestData)
            .select();
        
        if (error) throw error;
        
        if (typeof hideLoading === 'function') hideLoading();
        
        if (typeof showNotification === 'function') {
            showNotification('✅ Request submitted successfully!', 'success');
        }
        
        // Reset form
        document.getElementById('smRequestForm').reset();
        if (docsInput) docsInput.value = '';
        
        // Switch to the pending tab
        showSMSubTab('change-program');
        
        // Refresh data
        loadChangeProgramRequests();
        loadReadmissionRequests();
        updateSMStats();
        updateSMBadges();
        
    } catch (error) {
        if (typeof hideLoading === 'function') hideLoading();
        console.error('Error submitting request:', error);
        if (typeof showNotification === 'function') {
            showNotification('❌ Error submitting: ' + error.message, 'error');
        }
    }
}

// ============================================================
// TOGGLE REQUEST FIELDS
// ============================================================
function toggleSMRequestFields() {
    const type = document.querySelector('input[name="requestType"]:checked');
    if (!type) return;
    
    const currentSection = document.getElementById('smCurrentProgramSection');
    const previousSection = document.getElementById('smPreviousProgramSection');
    
    if (type.value === 'change_program') {
        if (currentSection) {
            currentSection.style.display = 'block';
            document.getElementById('smCurrentProgram').required = true;
        }
        if (previousSection) {
            previousSection.style.display = 'none';
            document.getElementById('smPreviousProgram').required = false;
        }
    } else {
        if (currentSection) {
            currentSection.style.display = 'none';
            document.getElementById('smCurrentProgram').required = false;
        }
        if (previousSection) {
            previousSection.style.display = 'block';
            document.getElementById('smPreviousProgram').required = true;
        }
    }
}

// ============================================================
// TOGGLE ALL CHECKBOXES
// ============================================================
function toggleAllSMCheckboxes(type) {
    const selectAll = document.getElementById(`smSelectAll${type.charAt(0).toUpperCase() + type.slice(1)}`);
    if (!selectAll) return;
    
    const checkboxes = document.querySelectorAll(`.${type}-checkbox`);
    checkboxes.forEach(cb => cb.checked = selectAll.checked);
    updateSMCounter(type);
}

// ============================================================
// UPDATE COUNTER
// ============================================================
function updateSMCounter(type) {
    const checkboxes = document.querySelectorAll(`.${type}-checkbox:checked`);
    const countEl = document.getElementById(`sm${type.charAt(0).toUpperCase() + type.slice(1)}SelectedCount`);
    if (countEl) countEl.textContent = checkboxes.length;
}

// ============================================================
// FILTER REQUESTS
// ============================================================
function filterSMRequests(type) {
    if (type === 'change') {
        loadChangeProgramRequests();
    } else {
        loadReadmissionRequests();
    }
}

// ============================================================
// SHOW SUB TAB
// ============================================================
function showSMSubTab(tab) {
    // Hide all tabs
    document.querySelectorAll('.sm-tab-content').forEach(el => el.style.display = 'none');
    
    // Show selected tab
    const tabs = {
        'change-program': 'smChangeProgramTab',
        'readmission': 'smReadmissionTab',
        'history': 'smHistoryTab',
        'new-request': 'smNewRequestTab'
    };
    
    const tabId = tabs[tab];
    if (tabId) {
        const el = document.getElementById(tabId);
        if (el) el.style.display = 'block';
    }
    
    // Update tab buttons
    document.querySelectorAll('.sm-tab-btn').forEach(btn => {
        btn.style.background = 'transparent';
        btn.style.color = '#334155';
        btn.style.boxShadow = 'none';
    });
    
    const btnMap = {
        'change-program': 'smTabChangeProgram',
        'readmission': 'smTabReadmission',
        'history': 'smTabHistory',
        'new-request': 'smTabNewRequest'
    };
    
    const btnId = btnMap[tab];
    if (btnId) {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.style.background = 'linear-gradient(135deg, #4C1D95, #6d28d9)';
            btn.style.color = 'white';
            btn.style.boxShadow = '0 4px 16px rgba(76,29,149,0.25)';
        }
    }
    
    // Load data based on tab
    if (tab === 'change-program') loadChangeProgramRequests();
    else if (tab === 'readmission') loadReadmissionRequests();
    else if (tab === 'history') loadSMHistory();
    else if (tab === 'new-request') loadStudentsForDropdown();
}

// ============================================================
// UPDATE STATS
// ============================================================
function updateSMStats() {
    const changePending = SM_STATE.changeRequests.filter(r => r.status === 'pending').length;
    const readmissionPending = SM_STATE.readmissionRequests.filter(r => r.status === 'pending').length;
    const totalRequests = SM_STATE.changeRequests.length + SM_STATE.readmissionRequests.length;
    
    // Get today's approved count
    const today = new Date().toISOString().split('T')[0];
    const allRequests = [...SM_STATE.changeRequests, ...SM_STATE.readmissionRequests];
    const approvedToday = allRequests.filter(r => 
        r.status === 'approved' && r.approved_at && r.approved_at.startsWith(today)
    ).length;
    
    const rejectedCount = allRequests.filter(r => r.status === 'rejected').length;
    
    document.getElementById('smTotalRequests').textContent = totalRequests;
    document.getElementById('smChangeProgramCount').textContent = changePending;
    document.getElementById('smReadmissionCount').textContent = readmissionPending;
    document.getElementById('smApprovedToday').textContent = approvedToday;
    document.getElementById('smRejectedCount').textContent = rejectedCount;
}

// ============================================================
// UPDATE BADGES
// ============================================================
function updateSMBadges() {
    const changePending = SM_STATE.changeRequests.filter(r => r.status === 'pending').length;
    const readmissionPending = SM_STATE.readmissionRequests.filter(r => r.status === 'pending').length;
    
    const changeBadge = document.getElementById('smChangePendingBadge');
    const readmissionBadge = document.getElementById('smReadmissionBadge');
    
    if (changeBadge) changeBadge.textContent = changePending;
    if (readmissionBadge) readmissionBadge.textContent = readmissionPending;
}

// ============================================================
// REFRESH
// ============================================================
function refreshStudentManagement() {
    loadChangeProgramRequests();
    loadReadmissionRequests();
    loadSMHistory();
    updateSMStats();
    updateSMBadges();
    if (typeof showNotification === 'function') {
        showNotification('🔄 Data refreshed!', 'success');
    }
}

// ============================================================
// EXPORT
// ============================================================
function exportStudentRequests() {
    const allRequests = [...SM_STATE.changeRequests, ...SM_STATE.readmissionRequests];
    
    if (!allRequests || allRequests.length === 0) {
        if (typeof showNotification === 'function') {
            showNotification('No data to export', 'warning');
        }
        return;
    }
    
    const headers = ['ID', 'Student', 'Type', 'From Program', 'To Program', 'Status', 'Date', 'Approved By'];
    const rows = allRequests.map(r => {
        const studentName = r.student?.full_name || r.student_name || 'Unknown';
        const type = r.request_type === 'change_program' ? 'Change of Program' : 'Readmission';
        const fromProgram = r.current_program || r.previous_program || 'N/A';
        const toProgram = r.requested_program || 'N/A';
        const status = r.status || 'pending';
        const date = r.created_at ? new Date(r.created_at).toLocaleDateString() : 'N/A';
        const approvedBy = r.approved_by || r.updated_by || 'System';
        return [r.id, studentName, type, fromProgram, toProgram, status, date, approvedBy];
    });
    
    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
    });
    
    downloadCSV(csv, `student_requests_${new Date().toISOString().split('T')[0]}.csv`);
    if (typeof showNotification === 'function') {
        showNotification('✅ Data exported!', 'success');
    }
}

// ============================================================
// DOWNLOAD CSV
// ============================================================
function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ============================================================
// ESCAPE HTML
// ============================================================
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ============================================================
// CLOSE MODAL HELPER
// ============================================================
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

// ============================================================
// GLOBAL REGISTRATION
// ============================================================
window.initStudentManagement = initStudentManagement;
window.loadStudentsForDropdown = loadStudentsForDropdown;
window.loadChangeProgramRequests = loadChangeProgramRequests;
window.loadReadmissionRequests = loadReadmissionRequests;
window.loadSMHistory = loadSMHistory;
window.viewSMRequest = viewSMRequest;
window.approveSMRequest = approveSMRequest;
window.rejectSMRequest = rejectSMRequest;
window.quickApproveSM = quickApproveSM;
window.bulkApproveSM = bulkApproveSM;
window.bulkRejectSM = bulkRejectSM;
window.submitSMRequest = submitSMRequest;
window.toggleSMRequestFields = toggleSMRequestFields;
window.toggleAllSMCheckboxes = toggleAllSMCheckboxes;
window.updateSMCounter = updateSMCounter;
window.filterSMRequests = filterSMRequests;
window.showSMSubTab = showSMSubTab;
window.refreshStudentManagement = refreshStudentManagement;
window.exportStudentRequests = exportStudentRequests;
window.escapeHtml = escapeHtml;
window.closeModal = closeModal;
window.downloadCSV = downloadCSV;

console.log('✅ Student Management Module Loaded!');
console.log('📋 Features:');
console.log('   - ✅ Change of Program requests');
console.log('   - ✅ Readmission requests');
console.log('   - ✅ Request history with filters');
console.log('   - ✅ Bulk approve/reject');
console.log('   - ✅ Student data from consolidated_user_profiles_table');
console.log('   - ✅ Auto-update student program on approval');
console.log('   - ✅ Export to CSV');
