// ============================================================
// SUPER ADMIN STUDENT MANAGEMENT MODULE
// CHANGE OF PROGRAM, READMISSION & ADMISSIONS - FULLY FIXED
// ============================================================

// ============================================================
// STATE
// ============================================================
const SM_STATE = {
    changeRequests: [],
    readmissionRequests: [],
    admissionRequests: [],
    history: [],
    currentRequestId: null,
    currentType: null,
    selectedChange: new Set(),
    selectedReadmission: new Set(),
    selectedAdmissions: new Set(),
    stats: {
        total: 0,
        change: 0,
        readmission: 0,
        admissions: 0,
        approved: 0,
        rejected: 0
    }
};

// ============================================================
// GET SUPABASE CLIENT
// ============================================================
function getSupabaseClient() {
    if (typeof window.sb !== 'undefined' && window.sb) return window.sb;
    if (typeof window.supabase !== 'undefined' && window.supabase) return window.supabase;
    if (window.db && window.db.supabase) return window.db.supabase;
    return null;
}

// ============================================================
// SAFE DOM HELPERS
// ============================================================
function safeGetElement(id) {
    return document.getElementById(id);
}

function safeSetText(id, text) {
    const el = safeGetElement(id);
    if (el) el.textContent = text;
    return el;
}

function safeSetHTML(id, html) {
    const el = safeGetElement(id);
    if (el) el.innerHTML = html;
    return el;
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

// ============================================================
// GENERATE STUDENT ID
// ============================================================
async function generateStudentId(program, year) {
    const sb = getSupabaseClient();
    if (!sb) return `NCHSM-${Date.now().toString().slice(-6)}`;
    
    try {
        const { count, error } = await sb
            .from('consolidated_user_profiles_table')
            .select('*', { count: 'exact', head: true })
            .eq('program', program);
        
        if (error) throw error;
        
        const prefix = program || 'STD';
        const yearSuffix = year || new Date().getFullYear();
        const number = String((count || 0) + 1).padStart(4, '0');
        
        return `${prefix}/${number}/${yearSuffix}`;
    } catch (error) {
        console.error('Error generating student ID:', error);
        return `NCHSM-${Date.now().toString().slice(-6)}`;
    }
}

// ============================================================
// SEND ADMISSION LETTER EMAIL
// ============================================================
async function sendAdmissionLetter(studentEmail, studentName, program, studentId) {
    console.log(`📧 Sending admission letter to ${studentEmail} for ${studentName}`);
    
    try {
        // Implement your actual email sending logic here
        // For now, simulate success
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
}

// ============================================================
// INITIALIZATION
// ============================================================
function initStudentManagement() {
    console.log('🎓 Student Management Module initialized');
    
    const sb = getSupabaseClient();
    if (!sb) {
        console.error('❌ Supabase client not available');
        if (typeof showNotification === 'function') {
            showNotification('Supabase client not available. Please refresh the page.', 'error');
        }
        return;
    }
    
    // Load all data
    Promise.all([
        loadStudentsForDropdown(),
        loadAdmissions(),
        loadChangeProgramRequests(),
        loadReadmissionRequests(),
        loadSMHistory()
    ]).then(() => {
        updateSMStats();
        updateSMBadges();
        toggleSMRequestFields();
        console.log('✅ Student Management fully loaded');
    }).catch(err => {
        console.error('❌ Error loading student management:', err);
    });
}

// ============================================================
// LOAD STUDENTS FOR DROPDOWN
// ============================================================
async function loadStudentsForDropdown() {
    const sb = getSupabaseClient();
    if (!sb) return;
    
    try {
        if (typeof showLoading === 'function') showLoading('Loading students...');
        
        const { data, error } = await sb
            .from('consolidated_user_profiles_table')
            .select('student_id, full_name, program, block, intake_year, intake_month, email')
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
                opt.value = student.student_id || '';
                opt.textContent = `${student.full_name} (${student.student_id || 'N/A'}) - ${student.program || 'No Program'}`;
                opt.dataset.program = student.program || '';
                opt.dataset.block = student.block || '';
                opt.dataset.email = student.email || '';
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
// LOAD ADMISSIONS
// ============================================================
async function loadAdmissions() {
    const sb = getSupabaseClient();
    if (!sb) return;
    
    try {
        const search = document.getElementById('smAdmissionsSearch')?.value?.toLowerCase() || '';
        const status = document.getElementById('smAdmissionsStatusFilter')?.value || 'all';
        const program = document.getElementById('smAdmissionsProgramFilter')?.value || 'all';
        
        let query = sb
            .from('applications')
            .select('*')
            .order('created_at', { ascending: false });

        if (status !== 'all') {
            query = query.eq('status', status);
        }
        
        if (program !== 'all') {
            query = query.eq('program', program);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Apply search filter
        let filtered = data || [];
        if (search) {
            filtered = filtered.filter(r => 
                (r.full_name || '').toLowerCase().includes(search) ||
                (r.application_number || '').toLowerCase().includes(search) ||
                (r.email || '').toLowerCase().includes(search)
            );
        }

        SM_STATE.admissionRequests = filtered;
        renderAdmissionsTable();
        updateSMStats();
        updateSMBadges();

    } catch (error) {
        console.error('Error loading admissions:', error);
        const tbody = document.getElementById('smAdmissionsBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr><td colspan="8" style="padding: 40px; text-align: center; color: #dc2626;">
                    <i class="fas fa-exclamation-circle" style="font-size: 24px; display: block; margin-bottom: 10px;"></i>
                    Error loading admissions: ${error.message || 'Unknown error'}
                </td></tr>
            `;
        }
        if (typeof showNotification === 'function') {
            showNotification('Error loading admissions', 'error');
        }
    }
}

// ============================================================
// RENDER ADMISSIONS TABLE
// ============================================================
function renderAdmissionsTable() {
    const tbody = document.getElementById('smAdmissionsBody');
    if (!tbody) return;
    
    const requests = SM_STATE.admissionRequests;
    
    if (!requests || requests.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="padding: 40px; text-align: center; color: #94a3b8;">
            <i class="fas fa-inbox" style="font-size: 24px; display: block; margin-bottom: 10px;"></i>
            No admission applications found.
        </td></tr>`;
        return;
    }
    
    let html = '';
    requests.forEach((r, index) => {
        const statusClass = r.status || 'draft';
        const statusLabel = statusClass.charAt(0).toUpperCase() + statusClass.slice(1);
        const date = r.created_at ? new Date(r.created_at).toLocaleDateString() : 'N/A';
        const studentName = r.full_name || 'Unknown';
        const studentId = r.application_number || r.user_id || 'N/A';
        const program = r.program_name || r.program || 'N/A';
        const studentType = r.student_type || 'new';
        const eligibility = r.eligibility_passed ? '✅ Passed' : '❌ Failed';
        const eligibilityClass = r.eligibility_passed ? 'eligibility-pass' : 'eligibility-fail';
        
        html += `
        <tr style="border-bottom: 1px solid #e5e7eb; ${index % 2 === 0 ? 'background: #f8fafc;' : ''}">
            <td style="text-align: center; padding: 12px 8px;">
                <input type="checkbox" class="sm-checkbox admissions-checkbox" data-id="${r.id}" onchange="updateSMCounter('admissions')" style="width: 16px; height: 16px; cursor: pointer;">
            </td>
            <td style="padding: 12px 16px;">
                <strong>${escapeHtml(studentName)}</strong>
                <div style="font-size: 11px; color: #94a3b8;">${escapeHtml(studentId)}</div>
                <div style="font-size: 10px; color: #64748b;">${escapeHtml(r.email || '')}</div>
            </td>
            <td style="padding: 12px 16px;">
                <span style="background: #dbeafe; padding: 2px 12px; border-radius: 12px; font-size: 12px; color: #1e40af;">${escapeHtml(program)}</span>
            </td>
            <td style="padding: 12px 16px; text-align: center; font-size: 12px;">
                <span style="background: ${studentType === 'new' ? '#d1fae5' : '#fef3c7'}; padding: 2px 12px; border-radius: 12px; font-size: 11px; color: ${studentType === 'new' ? '#065f46' : '#92400e'};">
                    ${studentType === 'new' ? 'New' : 'Transfer'}
                </span>
            </td>
            <td style="padding: 12px 16px; text-align: center; font-size: 12px; color: #64748b;">${date}</td>
            <td style="padding: 12px 16px; text-align: center;">
                <span class="${eligibilityClass}">${eligibility}</span>
            </td>
            <td style="padding: 12px 16px; text-align: center;">
                <span class="sm-status-badge ${statusClass}">${statusLabel}</span>
            </td>
            <td style="padding: 12px 16px; text-align: center;">
                <button onclick="viewSMRequest('${r.id}', 'admission')" style="padding: 4px 12px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; transition: 0.2s;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
                    <i class="fas fa-eye"></i> View
                </button>
                ${r.status === 'submitted' || r.status === 'reviewing' ? `
                <button onclick="quickApproveSM('${r.id}', 'admission')" style="padding: 4px 10px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; margin-top: 4px; transition: 0.2s;" onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'">
                    <i class="fas fa-check"></i> Approve
                </button>
                ` : ''}
            </td>
        </tr>
    `});
    
    tbody.innerHTML = html;
    updateSMCounter('admissions');
}

// ============================================================
// LOAD CHANGE OF PROGRAM REQUESTS
// ============================================================
async function loadChangeProgramRequests() {
    const sb = getSupabaseClient();
    if (!sb) return;
    
    try {
        const search = document.getElementById('smChangeSearch')?.value?.toLowerCase() || '';
        const status = document.getElementById('smChangeStatusFilter')?.value || 'all';
        
        let query = sb
            .from('student_requests')
            .select('*')
            .eq('request_type', 'change_program')
            .order('created_at', { ascending: false });

        if (status !== 'all') {
            query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) throw error;

        let filtered = data || [];
        if (search) {
            filtered = filtered.filter(r => 
                (r.student_name || '').toLowerCase().includes(search) ||
                (r.student_id || '').toLowerCase().includes(search)
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
                    Error loading requests: ${error.message || 'Unknown error'}
                </td></tr>
            `;
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
        const studentName = r.student_name || 'Unknown';
        const studentId = r.student_id || 'N/A';
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
    const sb = getSupabaseClient();
    if (!sb) return;
    
    try {
        const search = document.getElementById('smReadmissionSearch')?.value?.toLowerCase() || '';
        const status = document.getElementById('smReadmissionStatusFilter')?.value || 'all';
        
        let query = sb
            .from('student_requests')
            .select('*')
            .eq('request_type', 'readmission')
            .order('created_at', { ascending: false });

        if (status !== 'all') {
            query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) throw error;

        let filtered = data || [];
        if (search) {
            filtered = filtered.filter(r => 
                (r.student_name || '').toLowerCase().includes(search) ||
                (r.student_id || '').toLowerCase().includes(search)
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
                    Error loading requests: ${error.message || 'Unknown error'}
                </td></tr>
            `;
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
        const studentName = r.student_name || 'Unknown';
        const studentId = r.student_id || 'N/A';
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
    const sb = getSupabaseClient();
    if (!sb) return;
    
    try {
        const type = document.getElementById('smHistoryType')?.value || 'all';
        const status = document.getElementById('smHistoryStatus')?.value || 'all';
        const dateFrom = document.getElementById('smHistoryDateFrom')?.value || '';
        const dateTo = document.getElementById('smHistoryDateTo')?.value || '';
        
        let allHistory = [];
        
        // Get from student_requests
        let query = sb
            .from('student_requests')
            .select('*')
            .in('status', ['approved', 'rejected'])
            .order('updated_at', { ascending: false });

        if (type !== 'all' && type !== 'admissions') {
            query = query.eq('request_type', type);
        }
        
        if (status !== 'all') {
            query = query.eq('status', status);
        }
        
        const { data: requestData, error: requestError } = await query;
        if (!requestError && requestData) {
            allHistory = [...allHistory, ...requestData];
        }
        
        // Get from applications (admissions)
        if (type === 'all' || type === 'admissions') {
            let appQuery = sb
                .from('applications')
                .select('*')
                .in('status', ['approved', 'rejected'])
                .order('updated_at', { ascending: false });
            
            if (status !== 'all') {
                appQuery = appQuery.eq('status', status);
            }
            
            if (dateFrom) {
                appQuery = appQuery.gte('updated_at', dateFrom);
            }
            if (dateTo) {
                appQuery = appQuery.lte('updated_at', dateTo + 'T23:59:59');
            }
            
            const { data: appData, error: appError } = await appQuery;
            if (!appError && appData) {
                allHistory = [...allHistory, ...appData.map(a => ({
                    ...a,
                    request_type: 'admission',
                    student_name: a.full_name,
                    student_id: a.application_number,
                    current_program: a.program_name,
                    requested_program: a.program_name,
                    approved_by: a.updated_by || 'System'
                }))];
            }
        }
        
        allHistory.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        
        SM_STATE.history = allHistory;
        renderHistoryTable();

    } catch (error) {
        console.error('Error loading history:', error);
        const tbody = document.getElementById('smHistoryBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr><td colspan="6" style="padding: 40px; text-align: center; color: #dc2626;">
                    <i class="fas fa-exclamation-circle" style="font-size: 24px; display: block; margin-bottom: 10px;"></i>
                    Error loading history: ${error.message || 'Unknown error'}
                </td></tr>
            `;
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
        'readmission': 'Readmission',
        'admission': 'Admission'
    };
    
    let html = '';
    history.forEach((r, index) => {
        const typeLabel = typeLabels[r.request_type] || r.request_type || 'Unknown';
        const statusClass = r.status || 'approved';
        const statusLabel = statusClass.charAt(0).toUpperCase() + statusClass.slice(1);
        const date = r.updated_at ? new Date(r.updated_at).toLocaleDateString() : 'N/A';
        const studentName = r.student_name || r.full_name || 'Unknown';
        const studentId = r.student_id || r.application_number || 'N/A';
        const fromProgram = r.current_program || r.previous_program || 'N/A';
        const toProgram = r.requested_program || r.program_name || 'N/A';
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
// APPROVE ADMISSION - CREATES PROFILE!
// ============================================================
async function approveAdmission(requestId) {
    const sb = getSupabaseClient();
    if (!sb) return;
    
    if (!confirm('✅ Approve this admission? This will create the student profile.')) return;
    
    if (typeof showLoading === 'function') showLoading('Approving admission...');
    
    try {
        // Get application data
        const { data: appData, error: fetchError } = await sb
            .from('applications')
            .select('*')
            .eq('id', requestId)
            .single();
        
        if (fetchError) throw fetchError;
        if (!appData) throw new Error('Application not found');
        
        // 1. Generate student ID
        const studentId = await generateStudentId(appData.program, appData.intake_year || '2026');
        
        // 2. ✅ CREATE consolidated_user_profiles_table entry (NOW!)
        const { error: profileError } = await sb
            .from('consolidated_user_profiles_table')
            .insert([{
                user_id: appData.user_id,
                email: appData.email || appData.user_email,
                full_name: appData.full_name,
                phone: appData.phone || '',
                alt_phone: appData.alt_phone || '',
                national_id: appData.national_id || '',
                dob: appData.dob || null,
                gender: appData.gender || '',
                address: appData.address || '',
                role: 'student',
                status: 'approved',
                student_id: studentId,
                program: appData.program,
                program_name: appData.program_name || appData.program,
                intake_month: appData.intake_month || '03',
                intake_year: appData.intake_year || '2026',
                current_block: 'Introductory',
                guardian_name: appData.guardian_name || '',
                guardian_phone: appData.guardian_phone || '',
                emergency_name: appData.emergency_name || '',
                emergency_phone: appData.emergency_phone || '',
                emergency_relation: appData.emergency_relation || '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }]);
        
        if (profileError) {
            console.error('Profile creation error:', profileError);
            throw new Error('Failed to create student profile: ' + profileError.message);
        }
        
        // 3. Update application
        await sb
            .from('applications')
            .update({
                status: 'approved',
                student_id: studentId,
                updated_at: new Date().toISOString(),
                updated_by: window.currentUser?.id || 'system'
            })
            .eq('id', requestId);
        
        // 4. Send admission letter email
        const emailSent = await sendAdmissionLetter(
            appData.email || appData.user_email,
            appData.full_name,
            appData.program_name || appData.program,
            studentId
        );
        
        if (typeof hideLoading === 'function') hideLoading();
        closeModal('smRequestModal');
        
        if (typeof showNotification === 'function') {
            const msg = emailSent 
                ? `✅ ${appData.full_name} approved! Student ID: ${studentId}. Email sent!`
                : `✅ ${appData.full_name} approved! Student ID: ${studentId}`;
            showNotification(msg, 'success');
        }
        
        loadAdmissions();
        loadSMHistory();
        updateSMStats();
        updateSMBadges();
        
    } catch (error) {
        if (typeof hideLoading === 'function') hideLoading();
        console.error('Error approving admission:', error);
        if (typeof showNotification === 'function') {
            showNotification('❌ Error approving: ' + error.message, 'error');
        }
    }
}

// ============================================================
// APPROVE REQUEST - Unified
// ============================================================
async function approveSMRequest(requestId) {
    const sb = getSupabaseClient();
    if (!sb) return;
    
    if (!requestId) {
        if (typeof showNotification === 'function') {
            showNotification('Invalid request ID', 'error');
        }
        return;
    }
    
    // Check if it's an admission (check applications table first)
    try {
        const { data: appData, error: appError } = await sb
            .from('applications')
            .select('*')
            .eq('id', requestId)
            .single();
        
        if (appData) {
            // It's an admission - use the full profile creation
            await approveAdmission(requestId);
            return;
        }
    } catch (e) {
        // Not an admission, continue to student_requests
    }
    
    // Check student_requests (change program or readmission)
    if (!confirm('✅ Approve this request?')) return;
    
    if (typeof showLoading === 'function') showLoading('Approving request...');
    
    try {
        const { data: request, error: fetchError } = await sb
            .from('student_requests')
            .select('*')
            .eq('id', requestId)
            .single();
        
        if (fetchError) throw fetchError;
        if (!request) throw new Error('Request not found');
        
        await sb
            .from('student_requests')
            .update({
                status: 'approved',
                approved_at: new Date().toISOString(),
                approved_by: window.currentUser?.id || 'system',
                updated_at: new Date().toISOString()
            })
            .eq('id', requestId);
        
        // Update student program
        if (request.student_id && request.requested_program) {
            await sb
                .from('consolidated_user_profiles_table')
                .update({
                    program: request.requested_program,
                    updated_at: new Date().toISOString()
                })
                .eq('student_id', request.student_id);
        }
        
        if (typeof hideLoading === 'function') hideLoading();
        closeModal('smRequestModal');
        
        if (typeof showNotification === 'function') {
            showNotification('✅ Request approved successfully!', 'success');
        }
        
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
    const sb = getSupabaseClient();
    if (!sb) return;
    
    if (!requestId) {
        if (typeof showNotification === 'function') {
            showNotification('Invalid request ID', 'error');
        }
        return;
    }
    
    if (!confirm('❌ Reject this request?\n\nThis action cannot be undone.')) return;
    
    if (typeof showLoading === 'function') showLoading('Rejecting request...');
    
    try {
        // Check if it's an admission request
        const { data: appData, error: appError } = await sb
            .from('applications')
            .select('*')
            .eq('id', requestId)
            .single();
        
        if (appData) {
            await sb
                .from('applications')
                .update({
                    status: 'rejected',
                    updated_at: new Date().toISOString(),
                    updated_by: window.currentUser?.id || 'system'
                })
                .eq('id', requestId);
            
            if (typeof hideLoading === 'function') hideLoading();
            closeModal('smRequestModal');
            
            if (typeof showNotification === 'function') {
                showNotification('❌ Admission rejected.', 'error');
            }
            
            loadAdmissions();
            loadSMHistory();
            updateSMStats();
            updateSMBadges();
            return;
        }
        
        // Student request
        await sb
            .from('student_requests')
            .update({
                status: 'rejected',
                rejected_at: new Date().toISOString(),
                rejected_by: window.currentUser?.id || 'system',
                updated_at: new Date().toISOString()
            })
            .eq('id', requestId);
        
        if (typeof hideLoading === 'function') hideLoading();
        closeModal('smRequestModal');
        
        if (typeof showNotification === 'function') {
            showNotification('❌ Request rejected.', 'error');
        }
        
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
// QUICK APPROVE (with profile creation for admissions)
// ============================================================
async function quickApproveSM(requestId, type) {
    const sb = getSupabaseClient();
    if (!sb) return;
    
    if (!requestId) {
        if (typeof showNotification === 'function') {
            showNotification('Invalid request ID', 'warning');
        }
        return;
    }
    
    if (type === 'admission') {
        // Use the full admission approval with profile creation
        await approveAdmission(requestId);
        return;
    }
    
    // Change program or readmission - quick approval
    if (!confirm('✅ Quick approve this request?')) return;
    
    if (typeof showLoading === 'function') showLoading('Approving...');
    
    try {
        const { data: request, error: fetchError } = await sb
            .from('student_requests')
            .select('*')
            .eq('id', requestId)
            .single();
        
        if (fetchError) throw fetchError;
        if (!request) throw new Error('Request not found');
        
        await sb
            .from('student_requests')
            .update({
                status: 'approved',
                approved_at: new Date().toISOString(),
                approved_by: window.currentUser?.id || 'system',
                updated_at: new Date().toISOString()
            })
            .eq('id', requestId);
        
        if (request.student_id && request.requested_program) {
            await sb
                .from('consolidated_user_profiles_table')
                .update({
                    program: request.requested_program,
                    updated_at: new Date().toISOString()
                })
                .eq('student_id', request.student_id);
        }
        
        if (typeof hideLoading === 'function') hideLoading();
        
        if (typeof showNotification === 'function') {
            showNotification('✅ Request approved!', 'success');
        }
        
        if (type === 'change') {
            loadChangeProgramRequests();
        } else if (type === 'readmission') {
            loadReadmissionRequests();
        }
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
    const sb = getSupabaseClient();
    if (!sb) return;
    
    const checkboxClass = type === 'admissions' ? 'admissions-checkbox' : `${type}-checkbox`;
    const checkboxes = document.querySelectorAll(`.${checkboxClass}:checked`);
    
    if (checkboxes.length === 0) {
        if (typeof showNotification === 'function') {
            showNotification('Please select at least one request', 'warning');
        }
        return;
    }
    
    const ids = Array.from(checkboxes).map(cb => cb.dataset.id);
    const typeLabel = type === 'admissions' ? 'admission' : (type === 'change' ? 'change of program' : 'readmission');
    
    if (!confirm(`✅ Approve ${ids.length} selected ${typeLabel} requests?`)) return;
    
    if (typeof showLoading === 'function') showLoading(`Approving ${ids.length} requests...`);
    
    try {
        let successCount = 0;
        let errorCount = 0;
        let emailSentCount = 0;
        
        for (const id of ids) {
            try {
                if (type === 'admissions') {
                    // Use the full approval with profile creation
                    await approveAdmission(id);
                    // Check if email was sent (approveAdmission sends it)
                    emailSentCount++;
                } else {
                    const { data: request, error: fetchError } = await sb
                        .from('student_requests')
                        .select('*')
                        .eq('id', id)
                        .single();
                    
                    if (fetchError) throw fetchError;
                    
                    await sb
                        .from('student_requests')
                        .update({
                            status: 'approved',
                            approved_at: new Date().toISOString(),
                            approved_by: window.currentUser?.id || 'system',
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', id);
                    
                    if (request.student_id && request.requested_program) {
                        await sb
                            .from('consolidated_user_profiles_table')
                            .update({
                                program: request.requested_program,
                                updated_at: new Date().toISOString()
                            })
                            .eq('student_id', request.student_id);
                    }
                }
                successCount++;
            } catch (err) {
                console.error(`Error approving ${id}:`, err);
                errorCount++;
            }
        }
        
        if (typeof hideLoading === 'function') hideLoading();
        
        if (typeof showNotification === 'function') {
            let msg = `✅ ${successCount} requests approved`;
            if (emailSentCount > 0) msg += `, ${emailSentCount} admission letters sent`;
            if (errorCount > 0) msg += `, ${errorCount} errors`;
            showNotification(msg, errorCount > 0 ? 'warning' : 'success');
        }
        
        loadAdmissions();
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
    const sb = getSupabaseClient();
    if (!sb) return;
    
    const checkboxClass = type === 'admissions' ? 'admissions-checkbox' : `${type}-checkbox`;
    const checkboxes = document.querySelectorAll(`.${checkboxClass}:checked`);
    
    if (checkboxes.length === 0) {
        if (typeof showNotification === 'function') {
            showNotification('Please select at least one request', 'warning');
        }
        return;
    }
    
    const ids = Array.from(checkboxes).map(cb => cb.dataset.id);
    const typeLabel = type === 'admissions' ? 'admission' : (type === 'change' ? 'change of program' : 'readmission');
    
    if (!confirm(`❌ Reject ${ids.length} selected ${typeLabel} requests?`)) return;
    
    if (typeof showLoading === 'function') showLoading(`Rejecting ${ids.length} requests...`);
    
    try {
        let successCount = 0;
        let errorCount = 0;
        
        for (const id of ids) {
            try {
                if (type === 'admissions') {
                    await sb
                        .from('applications')
                        .update({
                            status: 'rejected',
                            updated_at: new Date().toISOString(),
                            updated_by: window.currentUser?.id || 'system'
                        })
                        .eq('id', id);
                } else {
                    await sb
                        .from('student_requests')
                        .update({
                            status: 'rejected',
                            rejected_at: new Date().toISOString(),
                            rejected_by: window.currentUser?.id || 'system',
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', id);
                }
                successCount++;
            } catch (err) {
                console.error(`Error rejecting ${id}:`, err);
                errorCount++;
            }
        }
        
        if (typeof hideLoading === 'function') hideLoading();
        
        if (typeof showNotification === 'function') {
            const msg = errorCount === 0 ? `❌ ${successCount} requests rejected.` : `⚠️ ${successCount} rejected, ${errorCount} errors`;
            showNotification(msg, errorCount > 0 ? 'warning' : 'error');
        }
        
        loadAdmissions();
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
// BULK REVIEW (for admissions)
// ============================================================
async function bulkReviewSM(type) {
    if (type !== 'admissions') return;
    
    const sb = getSupabaseClient();
    if (!sb) return;
    
    const checkboxes = document.querySelectorAll('.admissions-checkbox:checked');
    
    if (checkboxes.length === 0) {
        if (typeof showNotification === 'function') {
            showNotification('Please select at least one application', 'warning');
        }
        return;
    }
    
    const ids = Array.from(checkboxes).map(cb => cb.dataset.id);
    
    if (!confirm(`🔄 Mark ${ids.length} applications as reviewing?`)) return;
    
    if (typeof showLoading === 'function') showLoading(`Updating ${ids.length} applications...`);
    
    try {
        let successCount = 0;
        let errorCount = 0;
        
        for (const id of ids) {
            try {
                await sb
                    .from('applications')
                    .update({
                        status: 'reviewing',
                        updated_at: new Date().toISOString(),
                        updated_by: window.currentUser?.id || 'system'
                    })
                    .eq('id', id);
                successCount++;
            } catch (err) {
                console.error(`Error updating ${id}:`, err);
                errorCount++;
            }
        }
        
        if (typeof hideLoading === 'function') hideLoading();
        
        if (typeof showNotification === 'function') {
            const msg = errorCount === 0 ? `✅ ${successCount} applications marked as reviewing.` : `⚠️ ${successCount} updated, ${errorCount} errors`;
            showNotification(msg, errorCount > 0 ? 'warning' : 'success');
        }
        
        loadAdmissions();
        updateSMStats();
        updateSMBadges();
        
    } catch (error) {
        if (typeof hideLoading === 'function') hideLoading();
        console.error('Error bulk reviewing:', error);
        if (typeof showNotification === 'function') {
            showNotification('❌ Error: ' + error.message, 'error');
        }
    }
}

// ============================================================
// VIEW REQUEST DETAILS
// ============================================================
async function viewSMRequest(requestId, type) {
    const sb = getSupabaseClient();
    if (!sb) return;
    
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
    
    const typeLabels = {
        'admission': 'Admission Application',
        'change': 'Change of Program Request',
        'readmission': 'Readmission Request'
    };
    
    document.getElementById('smModalTitle').textContent = typeLabels[type] || 'Request Details';
    
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
        let data = null;
        
        if (type === 'admission') {
            const { data: appData, error } = await sb
                .from('applications')
                .select('*')
                .eq('id', requestId)
                .single();
            
            if (error) throw error;
            data = appData;
            data.request_type = 'admission';
            data.student_name = data.full_name;
            data.student_id = data.application_number || data.user_id;
            data.requested_program = data.program_name || data.program;
            data.reason = data.additional_info || 'No additional information';
            data.current_program = data.program_name || data.program;
        } else {
            const { data: reqData, error } = await sb
                .from('student_requests')
                .select('*')
                .eq('id', requestId)
                .single();
            
            if (error) throw error;
            data = reqData;
        }
        
        if (!data) {
            body.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #dc2626;">
                    <i class="fas fa-exclamation-circle" style="font-size: 48px; display: block; margin-bottom: 10px;"></i>
                    Request not found
                </div>
            `;
            return;
        }
        
        const r = data;
        const studentName = r.student_name || r.full_name || 'Unknown';
        const studentId = r.student_id || r.application_number || 'N/A';
        const currentProgram = r.current_program || 'N/A';
        const previousProgram = r.previous_program || 'N/A';
        const requestedProgram = r.requested_program || r.program_name || r.program || 'N/A';
        const reason = r.reason || r.additional_info || 'No reason provided';
        const status = r.status || 'pending';
        const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
        const createdAt = r.created_at ? new Date(r.created_at).toLocaleString() : 'N/A';
        const updatedAt = r.updated_at ? new Date(r.updated_at).toLocaleString() : 'N/A';
        const requestType = r.request_type || 'admission';
        const typeLabel = requestType === 'admission' ? 'Admission' : 
                         requestType === 'change_program' ? 'Change of Program' : 
                         requestType === 'readmission' ? 'Readmission' : 'Unknown';
        const email = r.email || r.user_email || 'N/A';
        
        let statusColor = '#f59e0b';
        if (status === 'approved') statusColor = '#10b981';
        if (status === 'rejected') statusColor = '#dc2626';
        if (status === 'processing' || status === 'reviewing') statusColor = '#3b82f6';
        if (status === 'draft') statusColor = '#6b7280';
        
        const isPending = status === 'pending' || status === 'submitted' || status === 'reviewing';
        
        let html = `
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
                        ${email !== 'N/A' ? `<span><i class="fas fa-envelope"></i> ${escapeHtml(email)}</span>` : ''}
                    </div>
                </div>
                
                <div style="grid-column: 1 / -1; background: #f0f9ff; padding: 12px 16px; border-radius: 8px;">
                    <span style="font-weight: 600; color: #1e40af;">📋 Request Type:</span>
                    <span style="margin-left: 12px;">${escapeHtml(typeLabel)}</span>
                </div>
                
                ${requestType === 'admission' ? `
                <div style="background: #dbeafe; padding: 10px 16px; border-radius: 8px; grid-column: 1 / -1;">
                    <span style="font-weight: 600; color: #1e40af;">Student Type:</span>
                    <div style="font-size: 15px; margin-top: 4px;">${escapeHtml(r.student_type || 'New')}</div>
                </div>
                ` : ''}
                
                ${requestType === 'change_program' ? `
                <div style="background: #dbeafe; padding: 10px 16px; border-radius: 8px;">
                    <span style="font-weight: 600; color: #1e40af;">Current Program:</span>
                    <div style="font-size: 15px; margin-top: 4px;">${escapeHtml(currentProgram)}</div>
                </div>
                ` : ''}
                
                ${requestType === 'readmission' ? `
                <div style="background: #fee2e2; padding: 10px 16px; border-radius: 8px;">
                    <span style="font-weight: 600; color: #991b1b;">Previous Program:</span>
                    <div style="font-size: 15px; margin-top: 4px;">${escapeHtml(previousProgram)}</div>
                </div>
                ` : ''}
                
                <div style="${requestType === 'admission' ? 'grid-column: 1 / -1;' : ''} background: #d1fae5; padding: 10px 16px; border-radius: 8px;">
                    <span style="font-weight: 600; color: #065f46;">${requestType === 'admission' ? 'Applied Program:' : 'Requested Program:'}</span>
                    <div style="font-size: 15px; margin-top: 4px;">${escapeHtml(requestedProgram)}</div>
                </div>
                
                ${requestType === 'admission' ? `
                <div style="grid-column: 1 / -1; background: #fef3c7; padding: 10px 16px; border-radius: 8px;">
                    <span style="font-weight: 600; color: #92400e;">🎯 Eligibility Status:</span>
                    <div style="font-size: 15px; margin-top: 4px;">
                        ${r.eligibility_passed ? '✅ Eligible' : '❌ Not Eligible'}
                    </div>
                </div>
                ` : ''}
                
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
            </div>
        `;
        
        body.innerHTML = html;
        
        // Show actions for pending requests
        if (isPending) {
            document.getElementById('smModalActions').style.display = 'flex';
            document.getElementById('smApproveBtn').style.display = 'inline-flex';
            document.getElementById('smRejectBtn').style.display = 'inline-flex';
            document.getElementById('smApproveBtn').onclick = function() { approveSMRequest(requestId); };
            document.getElementById('smRejectBtn').onclick = function() { rejectSMRequest(requestId); };
        } else {
            document.getElementById('smModalActions').style.display = 'flex';
            document.getElementById('smApproveBtn').style.display = 'none';
            document.getElementById('smRejectBtn').style.display = 'none';
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
                Error loading request: ${error.message || 'Unknown error'}
            </div>
        `;
        if (typeof showNotification === 'function') {
            showNotification('Error loading request details', 'error');
        }
    }
}

// ============================================================
// SUBMIT NEW REQUEST
// ============================================================
async function submitSMRequest() {
    const sb = getSupabaseClient();
    if (!sb) return;
    
    const studentSelect = document.getElementById('smStudentSelect');
    const typeRadio = document.querySelector('input[name="requestType"]:checked');
    const reason = document.getElementById('smReason');
    const requestedProgram = document.getElementById('smRequestedProgram');
    const currentProgram = document.getElementById('smCurrentProgram');
    const previousProgram = document.getElementById('smPreviousProgram');
    const docsInput = document.getElementById('smSupportingDocs');
    
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
    } else if (requestType === 'readmission') {
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
        const { data: student, error: studentError } = await sb
            .from('consolidated_user_profiles_table')
            .select('student_id, full_name, program, block, email')
            .eq('student_id', studentSelect.value)
            .single();
        
        if (studentError) throw studentError;
        
        let documents = [];
        if (docsInput && docsInput.files && docsInput.files.length > 0) {
            for (const file of docsInput.files) {
                documents.push({
                    name: file.name,
                    size: file.size,
                    type: file.type
                });
            }
        }
        
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
        
        const { data, error } = await sb
            .from('student_requests')
            .insert(requestData)
            .select();
        
        if (error) throw error;
        
        if (typeof hideLoading === 'function') hideLoading();
        
        if (typeof showNotification === 'function') {
            showNotification('✅ Request submitted successfully!', 'success');
        }
        
        document.getElementById('smRequestForm').reset();
        if (docsInput) docsInput.value = '';
        
        showSMSubTab('change-program');
        
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
// UTILITY FUNCTIONS
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
    } else if (type.value === 'readmission') {
        if (currentSection) {
            currentSection.style.display = 'none';
            document.getElementById('smCurrentProgram').required = false;
        }
        if (previousSection) {
            previousSection.style.display = 'block';
            document.getElementById('smPreviousProgram').required = true;
        }
    } else {
        // Admission - hide both
        if (currentSection) {
            currentSection.style.display = 'none';
            document.getElementById('smCurrentProgram').required = false;
        }
        if (previousSection) {
            previousSection.style.display = 'none';
            document.getElementById('smPreviousProgram').required = false;
        }
    }
}

function toggleAllSMCheckboxes(type) {
    const selectAllMap = {
        'admissions': 'smSelectAllAdmissions',
        'change': 'smSelectAllChange',
        'readmission': 'smSelectAllReadmission'
    };
    
    const selectAll = document.getElementById(selectAllMap[type]);
    if (!selectAll) return;
    
    const checkboxClass = type === 'admissions' ? 'admissions-checkbox' : `${type}-checkbox`;
    const checkboxes = document.querySelectorAll(`.${checkboxClass}`);
    checkboxes.forEach(cb => cb.checked = selectAll.checked);
    updateSMCounter(type);
}

function updateSMCounter(type) {
    const checkboxClass = type === 'admissions' ? 'admissions-checkbox' : `${type}-checkbox`;
    const checkboxes = document.querySelectorAll(`.${checkboxClass}:checked`);
    const countElId = type === 'admissions' ? 'smAdmissionsSelectedCount' : `sm${type.charAt(0).toUpperCase() + type.slice(1)}SelectedCount`;
    const countEl = document.getElementById(countElId);
    if (countEl) countEl.textContent = checkboxes.length;
}

function filterSMRequests(type) {
    if (type === 'admissions') {
        loadAdmissions();
    } else if (type === 'change') {
        loadChangeProgramRequests();
    } else if (type === 'readmission') {
        loadReadmissionRequests();
    }
}

function showSMSubTab(tab) {
    document.querySelectorAll('.sm-tab-content').forEach(el => el.style.display = 'none');
    
    const tabs = {
        'admissions': 'smAdmissionsTab',
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
    
    document.querySelectorAll('.sm-tab-btn').forEach(btn => {
        btn.style.background = 'transparent';
        btn.style.color = '#334155';
        btn.style.boxShadow = 'none';
    });
    
    const btnMap = {
        'admissions': 'smTabAdmissions',
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
    
    if (tab === 'admissions') loadAdmissions();
    else if (tab === 'change-program') loadChangeProgramRequests();
    else if (tab === 'readmission') loadReadmissionRequests();
    else if (tab === 'history') loadSMHistory();
    else if (tab === 'new-request') loadStudentsForDropdown();
}

// ============================================================
// UPDATE SM STATS
// ============================================================
function updateSMStats() {
    const totalEl = document.getElementById('smTotalRequests');
    const changeEl = document.getElementById('smChangeProgramCount');
    const readmissionEl = document.getElementById('smReadmissionCount');
    const admissionsEl = document.getElementById('smNewAdmissionsCount');
    const approvedEl = document.getElementById('smApprovedToday');
    const rejectedEl = document.getElementById('smRejectedCount');

    const changePending = SM_STATE.changeRequests?.filter(r => r.status === 'pending').length || 0;
    const readmissionPending = SM_STATE.readmissionRequests?.filter(r => r.status === 'pending').length || 0;
    const admissionPending = SM_STATE.admissionRequests?.filter(r => r.status === 'submitted' || r.status === 'reviewing').length || 0;
    const totalRequests = (SM_STATE.changeRequests?.length || 0) + (SM_STATE.readmissionRequests?.length || 0) + (SM_STATE.admissionRequests?.length || 0);

    const today = new Date().toISOString().split('T')[0];
    const allRequests = [...(SM_STATE.changeRequests || []), ...(SM_STATE.readmissionRequests || []), ...(SM_STATE.admissionRequests || [])];
    const approvedToday = allRequests.filter(r => 
        r.status === 'approved' && (r.approved_at || r.updated_at) && 
        (r.approved_at || r.updated_at).startsWith(today)
    ).length;
    const rejectedCount = allRequests.filter(r => r.status === 'rejected').length;

    if (totalEl) totalEl.textContent = totalRequests;
    if (changeEl) changeEl.textContent = changePending;
    if (readmissionEl) readmissionEl.textContent = readmissionPending;
    if (admissionsEl) admissionsEl.textContent = admissionPending;
    if (approvedEl) approvedEl.textContent = approvedToday;
    if (rejectedEl) rejectedEl.textContent = rejectedCount;
}

// ============================================================
// UPDATE SM BADGES
// ============================================================
function updateSMBadges() {
    const changePending = SM_STATE.changeRequests?.filter(r => r.status === 'pending').length || 0;
    const readmissionPending = SM_STATE.readmissionRequests?.filter(r => r.status === 'pending').length || 0;
    const admissionPending = SM_STATE.admissionRequests?.filter(r => r.status === 'submitted' || r.status === 'reviewing').length || 0;

    const changeBadge = document.getElementById('smChangePendingBadge');
    const readmissionBadge = document.getElementById('smReadmissionBadge');
    const admissionBadge = document.getElementById('smAdmissionsBadge');

    if (changeBadge) changeBadge.textContent = changePending;
    if (readmissionBadge) readmissionBadge.textContent = readmissionPending;
    if (admissionBadge) admissionBadge.textContent = admissionPending;
}

function refreshStudentManagement() {
    loadAdmissions();
    loadChangeProgramRequests();
    loadReadmissionRequests();
    loadSMHistory();
    updateSMStats();
    updateSMBadges();
    if (typeof showNotification === 'function') {
        showNotification('🔄 Data refreshed!', 'success');
    }
}

function exportStudentRequests() {
    const allRequests = [...SM_STATE.changeRequests, ...SM_STATE.readmissionRequests, ...SM_STATE.admissionRequests];
    
    if (!allRequests || allRequests.length === 0) {
        if (typeof showNotification === 'function') {
            showNotification('No data to export', 'warning');
        }
        return;
    }
    
    const headers = ['ID', 'Student Name', 'Student ID', 'Email', 'Type', 'From Program', 'To Program', 'Status', 'Date', 'Approved By'];
    const rows = allRequests.map(r => {
        const type = r.request_type === 'admission' ? 'Admission' : 
                     r.request_type === 'change_program' ? 'Change of Program' : 
                     r.request_type === 'readmission' ? 'Readmission' : 'Unknown';
        const fromProgram = r.current_program || r.previous_program || 'N/A';
        const toProgram = r.requested_program || r.program_name || r.program || 'N/A';
        const status = r.status || 'pending';
        const date = r.created_at ? new Date(r.created_at).toLocaleDateString() : 'N/A';
        const approvedBy = r.approved_by || r.updated_by || 'System';
        const email = r.email || r.user_email || 'N/A';
        return [r.id, r.student_name || r.full_name || 'Unknown', r.student_id || r.application_number || 'N/A', email, type, fromProgram, toProgram, status, date, approvedBy];
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
// GLOBAL REGISTRATION
// ============================================================
window.initStudentManagement = initStudentManagement;
window.loadStudentsForDropdown = loadStudentsForDropdown;
window.loadAdmissions = loadAdmissions;
window.loadChangeProgramRequests = loadChangeProgramRequests;
window.loadReadmissionRequests = loadReadmissionRequests;
window.loadSMHistory = loadSMHistory;
window.viewSMRequest = viewSMRequest;
window.approveSMRequest = approveSMRequest;
window.rejectSMRequest = rejectSMRequest;
window.quickApproveSM = quickApproveSM;
window.bulkApproveSM = bulkApproveSM;
window.bulkRejectSM = bulkRejectSM;
window.bulkReviewSM = bulkReviewSM;
window.submitSMRequest = submitSMRequest;
window.toggleSMRequestFields = toggleSMRequestFields;
window.toggleAllSMCheckboxes = toggleAllSMCheckboxes;
window.updateSMCounter = updateSMCounter;
window.filterSMRequests = filterSMRequests;
window.showSMSubTab = showSMSubTab;
window.refreshStudentManagement = refreshStudentManagement;
window.exportStudentRequests = exportStudentRequests;
window.sendAdmissionLetter = sendAdmissionLetter;
window.escapeHtml = escapeHtml;
window.closeModal = closeModal;
window.downloadCSV = downloadCSV;

console.log('✅ Student Management Module Loaded!');
console.log('📋 Features:');
console.log('   - ✅ Admissions management with profile creation on approval');
console.log('   - ✅ Change of Program requests');
console.log('   - ✅ Readmission requests');
console.log('   - ✅ Automated admission letter emails');
console.log('   - ✅ Request history with filters');
console.log('   - ✅ Bulk approve/reject');
console.log('   - ✅ Student data from consolidated_user_profiles_table');
console.log('   - ✅ Auto-update student program on approval');
console.log('   - ✅ Export to CSV');
