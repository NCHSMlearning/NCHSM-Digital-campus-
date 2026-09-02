// ============================================================
// SUPER ADMIN STUDENT MANAGEMENT MODULE
// CHANGE OF PROGRAM, READMISSION, ADMISSIONS & SESSION REPORTS
// FULLY INTEGRATED WITH consolidated_user_profiles_table
// ============================================================

// ============================================================
// STATE
// ============================================================
const SM_STATE = {
    changeRequests: [],
    readmissionRequests: [],
    admissionRequests: [],
    sessionReports: [],
    history: [],
    currentRequestId: null,
    currentType: null,
    selectedChange: new Set(),
    selectedReadmission: new Set(),
    selectedAdmissions: new Set(),
    selectedSessionReports: new Set(),
    stats: {
        total: 0,
        change: 0,
        readmission: 0,
        admissions: 0,
        sessionReports: 0,
        approved: 0,
        rejected: 0
    }
};

// Nursing/Block programs
const NURSING_PROGRAMS = ['KRCHN', 'DCHN'];
const BLOCK_OPTIONS = ['Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Block 6', 'Block 7', 'Block 8'];
const TVET_YEARS = ['Year 1', 'Year 2', 'Year 3'];
const TVET_TERMS = ['Term 1', 'Term 2', 'Term 3'];

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
// DETECT PROGRAM TYPE
// ============================================================
function detectProgramType(programCode) {
    if (!programCode) return 'TVET';
    if (NURSING_PROGRAMS.includes(programCode)) {
        return 'Nursing';
    }
    return 'TVET';
}

// ============================================================
// GET STUDENT PROFILE FROM consolidated_user_profiles_table
// ============================================================
async function getStudentProfile(studentId) {
    const sb = getSupabaseClient();
    if (!sb) return null;
    
    try {
        const { data, error } = await sb
            .from('consolidated_user_profiles_table')
            .select('*')
            .eq('student_id', studentId)
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching student profile:', error);
        return null;
    }
}

// ============================================================
// UPDATE STUDENT PROFILE IN consolidated_user_profiles_table
// ============================================================
async function updateStudentProfile(studentId, updateData) {
    const sb = getSupabaseClient();
    if (!sb) return false;
    
    try {
        const { error } = await sb
            .from('consolidated_user_profiles_table')
            .update({
                ...updateData,
                updated_at: new Date().toISOString()
            })
            .eq('student_id', studentId);
        
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error updating student profile:', error);
        return false;
    }
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
        return;
    }
    
    // Load all data - MAKE SURE loadSessionReportsAdmin() is included
    Promise.all([
        loadStudentsForDropdown(),
        loadAdmissions(),
        loadChangeProgramRequests(),
        loadReadmissionRequests(),
        loadSessionReportsAdmin(),  // ✅ This must be here
        loadSMHistory()
    ]).then(() => {
        updateSMStats();
        updateSMBadges();
        updateSessionReportStats();  // ✅ Add this
        toggleSMRequestFields();
        console.log('✅ Student Management fully loaded');
    }).catch(err => {
        console.error('❌ Error loading student management:', err);
    });
}
// ============================================================
// LOAD STUDENTS FOR DROPDOWN (FROM consolidated_user_profiles_table)
// ============================================================
async function loadStudentsForDropdown() {
    const sb = getSupabaseClient();
    if (!sb) return;
    
    try {
        if (typeof showLoading === 'function') showLoading('Loading students...');
        
        const { data, error } = await sb
            .from('consolidated_user_profiles_table')
            .select('student_id, full_name, program, block, current_block, current_year, current_term, intake_year, intake_month, email')
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
                opt.dataset.block = student.current_block || student.block || '';
                opt.dataset.year = student.current_year || '';
                opt.dataset.term = student.current_term || '';
                opt.dataset.email = student.email || '';
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
// ADMIN: LOAD SESSION REPORTS
// ============================================================
async function loadSessionReportsAdmin() {
    const sb = getSupabaseClient();
    if (!sb) {
        console.error('❌ Supabase client not available');
        if (typeof showNotification === 'function') {
            showNotification('Supabase client not available', 'error');
        }
        return;
    }
    
    try {
        console.log('📊 Loading admin session reports...');
        
        const search = document.getElementById('smSessionReportSearch')?.value?.toLowerCase() || '';
        const status = document.getElementById('smSessionReportStatusFilter')?.value || 'all';
        const type = document.getElementById('smSessionReportTypeFilter')?.value || 'all';

        // Build query
        let query = sb
            .from('session_reports')
            .select('*')
            .order('submitted_at', { ascending: false });

        if (status !== 'all') {
            query = query.eq('approval_status', status);
        }
        if (type !== 'all') {
            query = query.eq('program_type', type);
        }

        const { data, error } = await query;

        if (error) {
            console.error('❌ Supabase error:', error);
            throw error;
        }

        // Apply search filter
        let filtered = data || [];
        if (search) {
            filtered = filtered.filter(r => 
                (r.student_name || '').toLowerCase().includes(search) ||
                (r.student_id || '').toLowerCase().includes(search) ||
                (r.program || '').toLowerCase().includes(search) ||
                (r.session || '').toLowerCase().includes(search)
            );
        }

        console.log(`✅ Found ${filtered.length} session reports for admin`);
        console.log('📋 Reports:', filtered);
        
        // Store in state
        SM_STATE.sessionReports = filtered;
        
        // Render the table
        renderSessionReportsAdminTable();
        
        // Update stats
        updateSMStats();
        updateSMBadges();
        updateSessionReportStats();

    } catch (error) {
        console.error('❌ Error loading session reports:', error);
        const tbody = document.getElementById('smSessionReportsBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr><td colspan="8" style="padding: 40px; text-align: center; color: #dc2626;">
                    <i class="fas fa-exclamation-circle" style="font-size: 24px; display: block; margin-bottom: 10px;"></i>
                    Error loading session reports: ${escapeHtml(error.message || 'Unknown error')}
                    <br>
                    <button onclick="loadSessionReportsAdmin()" style="margin-top: 12px; padding: 8px 20px; background: #4C1D95; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-sync-alt"></i> Retry
                    </button>
                </td></tr>
            `;
        }
    }
}
// ============================================================
// UPDATE SESSION REPORT STATS (For Admin)
// ============================================================
function updateSessionReportStats() {
    const reports = SM_STATE.sessionReports || [];
    
    const total = reports.length;
    const pending = reports.filter(r => r.approval_status === 'pending').length;
    const approved = reports.filter(r => r.approval_status === 'approved').length;
    const rejected = reports.filter(r => r.approval_status === 'rejected').length;
    
    // Update stats cards
    const totalEl = document.getElementById('smSessionReportsTotal');
    const pendingEl = document.getElementById('smSessionReportsPending');
    const approvedEl = document.getElementById('smSessionReportsApproved');
    const rejectedEl = document.getElementById('smSessionReportsRejected');
    
    if (totalEl) totalEl.textContent = total;
    if (pendingEl) pendingEl.textContent = pending;
    if (approvedEl) approvedEl.textContent = approved;
    if (rejectedEl) rejectedEl.textContent = rejected;
    
    // Update badge in tab
    const badge = document.getElementById('smSessionReportsBadge');
    if (badge) {
        badge.textContent = pending;
        badge.style.display = pending > 0 ? 'inline-block' : 'none';
    }
    
    // Update main stats
    const sessionReportsCount = document.getElementById('smSessionReportsCount');
    if (sessionReportsCount) {
        sessionReportsCount.textContent = pending;
    }
    
    console.log('📊 Session Report Stats:', { total, pending, approved, rejected });
}
// ============================================================
// ADMIN: RENDER SESSION REPORTS TABLE
// ============================================================
function renderSessionReportsAdminTable() {
    const tbody = document.getElementById('smSessionReportsBody');
    if (!tbody) {
        console.error('❌ Table body not found: smSessionReportsBody');
        return;
    }

    const reports = SM_STATE.sessionReports || [];
    console.log(`📊 Rendering ${reports.length} session reports`);

    if (!reports || reports.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="padding: 60px; text-align: center; color: #94a3b8;">
                    <i class="fas fa-inbox" style="font-size: 40px; display: block; margin-bottom: 16px; color: #d1d5db;"></i>
                    <p style="margin: 0; font-size: 16px;">No session reports found</p>
                    <p style="margin: 4px 0 0 0; font-size: 13px; color: #cbd5e1;">Students haven't submitted any session reports yet</p>
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    reports.forEach((report, index) => {
        const statusColors = {
            pending: { bg: '#fef3c7', color: '#92400e', icon: '⏳' },
            approved: { bg: '#d1fae5', color: '#065f46', icon: '✅' },
            rejected: { bg: '#fee2e2', color: '#991b1b', icon: '❌' }
        };
        const statusStyle = statusColors[report.approval_status] || statusColors.pending;
        
        const submittedDate = report.submitted_at ? new Date(report.submitted_at).toLocaleString() : 'N/A';
        const programType = report.program_type || 'TVET';
        const sessionDisplay = report.session || 'N/A';
        const studentName = report.student_name || 'Unknown';
        const studentId = report.student_id || 'N/A';
        const studentProgram = report.program || 'N/A';
        const studentStatus = report.student_status || report.status || 'Continuing';
        const academicYear = report.academic_year || 'N/A';
        const isPending = report.approval_status === 'pending';

        // Determine what gets updated on approval
        const updateLabel = programType === 'Nursing' ? 
            `Block → ${sessionDisplay}` : 
            `Year/Term → ${sessionDisplay}`;

        html += `
            <tr style="border-bottom: 1px solid #f1f5f9; ${index % 2 === 0 ? 'background: #fafafa;' : ''}">
                <td style="text-align: center; padding: 12px 8px;">
                    <input type="checkbox" class="sm-checkbox session-reports-checkbox" data-id="${report.id}" 
                           onchange="updateSMCounter('session-reports')" 
                           style="width: 16px; height: 16px; cursor: pointer;">
                </td>
                <td style="padding: 12px 16px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 32px; height: 32px; border-radius: 50%; background: #4C1D95; color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px;">
                            ${studentName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div style="font-weight: 600; color: #0A3D62; font-size: 14px;">${escapeHtml(studentName)}</div>
                            <div style="font-size: 11px; color: #94a3b8;">${escapeHtml(studentId)}</div>
                        </div>
                    </div>
                </td>
                <td style="padding: 12px 16px;">
                    <span style="background: #dbeafe; padding: 4px 12px; border-radius: 12px; font-size: 12px; color: #1e40af;">
                        ${escapeHtml(studentProgram)}
                    </span>
                    <br>
                    <span style="background: ${programType === 'Nursing' ? '#dbeafe' : '#fef3c7'}; padding: 2px 8px; border-radius: 12px; font-size: 10px; color: ${programType === 'Nursing' ? '#1e40af' : '#92400e'};">
                        ${programType}
                    </span>
                </td>
                <td style="padding: 12px 16px;">
                    <div style="font-weight: 500; color: #0A3D62;">${escapeHtml(academicYear)}</div>
                    <div style="font-size: 12px; color: #475569;">
                        <i class="fas fa-arrow-right" style="color: #94a3b8; font-size: 10px;"></i>
                        ${escapeHtml(sessionDisplay)}
                    </div>
                    <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
                        Status: ${escapeHtml(studentStatus)}
                    </div>
                    ${isPending ? `<div style="font-size: 10px; color: #3b82f6; margin-top: 2px;">
                        <i class="fas fa-sync-alt"></i> Will update: ${updateLabel}
                    </div>` : ''}
                </td>
                <td style="padding: 12px 16px; text-align: center;">
                    <span style="background: #d1fae5; padding: 4px 12px; border-radius: 12px; font-size: 12px; color: #065f46;">
                        ${escapeHtml(studentStatus)}
                    </span>
                </td>
                <td style="padding: 12px 16px; text-align: center; font-size: 12px; color: #64748b;">
                    ${submittedDate}
                </td>
                <td style="padding: 12px 16px; text-align: center;">
                    <span style="background: ${statusStyle.bg}; color: ${statusStyle.color}; padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 600; display: inline-block;">
                        ${statusStyle.icon} ${report.approval_status ? report.approval_status.charAt(0).toUpperCase() + report.approval_status.slice(1) : 'Pending'}
                    </span>
                </td>
                <td style="padding: 12px 16px; text-align: center;">
                    <div style="display: flex; gap: 4px; justify-content: center; flex-wrap: wrap;">
                        <button onclick="viewSMRequest('${report.id}', 'session-report')" 
                                style="padding: 4px 10px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 10px;">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${isPending ? `
                            <button onclick="approveSessionReportAdmin('${report.id}')" 
                                    style="padding: 4px 10px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 10px;">
                                <i class="fas fa-check"></i>
                            </button>
                            <button onclick="rejectSessionReportAdmin('${report.id}')" 
                                    style="padding: 4px 10px; background: #dc2626; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 10px;">
                                <i class="fas fa-times"></i>
                            </button>
                        ` : `
                            <span style="font-size: 10px; color: #94a3b8;">
                                ${report.approval_status === 'approved' ? '✅ Done' : '❌ Rejected'}
                            </span>
                        `}
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    updateSMCounter('session-reports');
    console.log('✅ Session reports table rendered');
}

// ============================================================
// APPROVE SESSION REPORT - UPDATES consolidated_user_profiles_table
// ============================================================
async function approveSessionReportAdmin(reportId) {
    const sb = getSupabaseClient();
    if (!sb) {
        if (typeof showNotification === 'function') {
            showNotification('Supabase client not available', 'error');
        }
        return;
    }

    if (!confirm('✅ Approve this session report?\n\nThis will update the student\'s profile in consolidated_user_profiles_table.')) return;

    if (typeof showLoading === 'function') showLoading('Approving session report...');

    try {
        // 1. Get the report
        const { data: report, error: fetchError } = await sb
            .from('session_reports')
            .select('*')
            .eq('id', reportId)
            .single();

        if (fetchError) throw fetchError;
        if (!report) throw new Error('Report not found');

        // 2. Get the student's current profile from consolidated_user_profiles_table
        const studentProfile = await getStudentProfile(report.student_id);
        if (!studentProfile) {
            throw new Error(`Student profile not found for ID: ${report.student_id}`);
        }

        console.log('📋 Current Student Profile:', studentProfile);

        // 3. Determine what to update based on program type
        const programType = report.program_type || detectProgramType(report.program);
        const session = report.session;
        const academicYear = report.academic_year;

        let updateData = {};

        if (programType === 'Nursing') {
            // Update block for Nursing students
            updateData = {
                current_block: session,
                current_academic_year: academicYear,
                block: session  // Also update the legacy block field
            };
            console.log(`🔄 Updating Nursing student ${report.student_name}: Block → ${session}`);
        } else {
            // TVET - Parse Year and Term from session string
            const parts = session.split(' - ');
            if (parts.length === 2) {
                const year = parts[0].trim();
                const term = parts[1].trim();
                updateData = {
                    current_year: year,
                    current_term: term,
                    current_academic_year: academicYear,
                    year: year,   // Also update legacy fields
                    term: term
                };
                console.log(`🔄 Updating TVET student ${report.student_name}: ${year} - ${term}`);
            } else {
                // Fallback: try to parse differently
                const yearMatch = session.match(/Year\s*(\d+)/i);
                const termMatch = session.match(/Term\s*(\d+)/i);
                if (yearMatch) {
                    const year = `Year ${yearMatch[1]}`;
                    updateData.current_year = year;
                    updateData.year = year;
                }
                if (termMatch) {
                    const term = `Term ${termMatch[1]}`;
                    updateData.current_term = term;
                    updateData.term = term;
                }
                updateData.current_academic_year = academicYear;
                console.log(`🔄 Updating TVET student ${report.student_name} (fallback):`, updateData);
            }
        }

        // 4. Update the report status first
        const { error: updateReportError } = await sb
            .from('session_reports')
            .update({
                approval_status: 'approved',
                approved_at: new Date().toISOString(),
                approved_by: 'Admin'
            })
            .eq('id', reportId);

        if (updateReportError) throw updateReportError;

        // 5. Update the student's profile in consolidated_user_profiles_table
        const profileUpdated = await updateStudentProfile(report.student_id, updateData);

        if (!profileUpdated) {
            throw new Error('Failed to update student profile');
        }

        // 6. Get updated profile to confirm
        const updatedProfile = await getStudentProfile(report.student_id);
        console.log('✅ Updated Student Profile:', updatedProfile);

        if (typeof hideLoading === 'function') hideLoading();

        if (typeof showNotification === 'function') {
            const updateType = programType === 'Nursing' ? 'Block' : 'Year/Term';
            showNotification(`✅ Session report approved! Student's ${updateType} updated to "${session}"`, 'success');
        }

        // Refresh data
        await loadSessionReportsAdmin();
        await loadStudentsForDropdown();
        updateSMStats();
        updateSMBadges();

    } catch (error) {
        if (typeof hideLoading === 'function') hideLoading();
        console.error('Error approving session report:', error);
        if (typeof showNotification === 'function') {
            showNotification('❌ Error approving report: ' + error.message, 'error');
        }
    }
}

// ============================================================
// REJECT SESSION REPORT
// ============================================================
async function rejectSessionReportAdmin(reportId) {
    const sb = getSupabaseClient();
    if (!sb) {
        if (typeof showNotification === 'function') {
            showNotification('Supabase client not available', 'error');
        }
        return;
    }

    if (!confirm('❌ Reject this session report?')) return;

    if (typeof showLoading === 'function') showLoading('Rejecting session report...');

    try {
        const { error } = await sb
            .from('session_reports')
            .update({
                approval_status: 'rejected',
                approved_at: new Date().toISOString(),
                approved_by: 'Admin'
            })
            .eq('id', reportId);

        if (error) throw error;

        if (typeof hideLoading === 'function') hideLoading();

        if (typeof showNotification === 'function') {
            showNotification('❌ Session report rejected', 'warning');
        }

        await loadSessionReportsAdmin();
        updateSMStats();
        updateSMBadges();

    } catch (error) {
        if (typeof hideLoading === 'function') hideLoading();
        console.error('Error rejecting session report:', error);
        if (typeof showNotification === 'function') {
            showNotification('❌ Error rejecting report', 'error');
        }
    }
}

// ============================================================
// BULK APPROVE SESSION REPORTS
// ============================================================
async function bulkApproveSessionReports() {
    const checkboxes = document.querySelectorAll('.session-reports-checkbox:checked');
    
    if (checkboxes.length === 0) {
        if (typeof showNotification === 'function') {
            showNotification('Please select reports to approve', 'warning');
        }
        return;
    }

    const ids = Array.from(checkboxes).map(cb => cb.dataset.id);

    if (!confirm(`✅ Approve ${ids.length} session report(s)?\n\nThis will update each student's profile in consolidated_user_profiles_table.`)) return;

    if (typeof showLoading === 'function') showLoading(`Approving ${ids.length} reports...`);

    let successCount = 0;
    let errorCount = 0;

    for (const id of ids) {
        try {
            await approveSessionReportAdmin(id);
            successCount++;
        } catch (error) {
            console.error(`Error approving ${id}:`, error);
            errorCount++;
        }
    }

    if (typeof hideLoading === 'function') hideLoading();

    if (typeof showNotification === 'function') {
        showNotification(`✅ ${successCount} approved, ${errorCount} failed`, successCount > 0 ? 'success' : 'error');
    }

    await loadSessionReportsAdmin();
    updateSMStats();
    updateSMBadges();
}

// ============================================================
// BULK REJECT SESSION REPORTS
// ============================================================
async function bulkRejectSessionReports() {
    const checkboxes = document.querySelectorAll('.session-reports-checkbox:checked');
    
    if (checkboxes.length === 0) {
        if (typeof showNotification === 'function') {
            showNotification('Please select reports to reject', 'warning');
        }
        return;
    }

    const ids = Array.from(checkboxes).map(cb => cb.dataset.id);

    if (!confirm(`❌ Reject ${ids.length} session report(s)?`)) return;

    if (typeof showLoading === 'function') showLoading(`Rejecting ${ids.length} reports...`);

    let successCount = 0;
    let errorCount = 0;

    for (const id of ids) {
        try {
            await rejectSessionReportAdmin(id);
            successCount++;
        } catch (error) {
            console.error(`Error rejecting ${id}:`, error);
            errorCount++;
        }
    }

    if (typeof hideLoading === 'function') hideLoading();

    if (typeof showNotification === 'function') {
        showNotification(`✅ ${successCount} rejected, ${errorCount} failed`, successCount > 0 ? 'success' : 'error');
    }

    await loadSessionReportsAdmin();
    updateSMStats();
    updateSMBadges();
}

// ============================================================
// VIEW SESSION REPORT DETAILS
// ============================================================
async function viewSessionReportDetails(reportId) {
    const sb = getSupabaseClient();
    if (!sb) return;
    
    try {
        const { data: report, error } = await sb
            .from('session_reports')
            .select('*')
            .eq('id', reportId)
            .single();

        if (error) throw error;
        if (!report) throw new Error('Report not found');

        // Get student's current profile
        const studentProfile = await getStudentProfile(report.student_id);

        const modalBody = document.getElementById('smModalBody');
        const modalTitle = document.getElementById('smModalTitle');
        const modalActions = document.getElementById('smModalActions');

        modalTitle.textContent = 'Session Report Details';

        const programType = report.program_type || 'TVET';
        const statusColors = {
            pending: { bg: '#fef3c7', color: '#92400e' },
            approved: { bg: '#d1fae5', color: '#065f46' },
            rejected: { bg: '#fee2e2', color: '#991b1b' }
        };
        const statusStyle = statusColors[report.approval_status || 'pending'] || statusColors.pending;
        const isPending = report.approval_status === 'pending';

        // Show current profile info
        let profileInfo = '';
        if (studentProfile) {
            const currentBlock = studentProfile.current_block || studentProfile.block || 'Not set';
            const currentYear = studentProfile.current_year || studentProfile.year || 'Not set';
            const currentTerm = studentProfile.current_term || studentProfile.term || 'Not set';
            
            profileInfo = `
                <div style="margin-bottom: 16px; padding: 16px; background: #f0f9ff; border-radius: 10px; border-left: 4px solid #3b82f6;">
                    <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 600; margin-bottom: 6px;">
                        <i class="fas fa-user-graduate"></i> Current Profile (consolidated_user_profiles_table)
                    </div>
                    <div style="display: grid; grid-template-columns: ${programType === 'Nursing' ? '1fr' : '1fr 1fr'}; gap: 8px; font-size: 13px;">
                        ${programType === 'Nursing' ? `
                            <div><strong>Current Block:</strong> ${escapeHtml(currentBlock)}</div>
                        ` : `
                            <div><strong>Current Year:</strong> ${escapeHtml(currentYear)}</div>
                            <div><strong>Current Term:</strong> ${escapeHtml(currentTerm)}</div>
                        `}
                        <div><strong>Program:</strong> ${escapeHtml(studentProfile.program || 'N/A')}</div>
                    </div>
                    ${isPending ? `
                        <div style="margin-top: 8px; padding: 8px 12px; background: #fef3c7; border-radius: 6px; font-size: 12px; color: #92400e;">
                            <i class="fas fa-info-circle"></i> 
                            <strong>Will be updated to:</strong> ${escapeHtml(report.session)}
                        </div>
                    ` : ''}
                </div>
            `;
        }

        modalBody.innerHTML = `
            <div style="margin-bottom: 16px; padding: 16px; background: #f8fafc; border-radius: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div>
                    <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 600;">Student</div>
                    <div style="font-size: 15px; font-weight: 600; color: #1e293b;">${escapeHtml(report.student_name)}</div>
                    <div style="font-size: 12px; color: #94a3b8;">ID: ${escapeHtml(report.student_id)}</div>
                </div>
                <div>
                    <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 600;">Program</div>
                    <div style="font-size: 15px; font-weight: 600; color: #0A3D62;">${escapeHtml(report.program)}</div>
                    <span style="background: ${programType === 'Nursing' ? '#dbeafe' : '#fef3c7'}; padding: 2px 10px; border-radius: 12px; font-size: 11px; color: ${programType === 'Nursing' ? '#1e40af' : '#92400e'};">
                        ${programType}
                    </span>
                </div>
            </div>

            ${profileInfo}

            <div style="margin-bottom: 16px; padding: 16px; background: #dbeafe; border-radius: 10px; border-left: 4px solid #3b82f6;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div>
                        <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 600;">Academic Year</div>
                        <div style="font-size: 15px; font-weight: 600; color: #1e293b;">${escapeHtml(report.academic_year)}</div>
                    </div>
                    <div>
                        <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 600;">${programType === 'Nursing' ? 'Block' : 'Year/Term'}</div>
                        <div style="font-size: 15px; font-weight: 600; color: #4C1D95;">${escapeHtml(report.session)}</div>
                    </div>
                </div>
            </div>

            <div style="margin-bottom: 16px;">
                <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 600;">Status</div>
                <div style="margin-top: 4px;">
                    <span style="background: #d1fae5; padding: 2px 12px; border-radius: 12px; font-size: 12px; color: #065f46;">
                        ${escapeHtml(report.status || 'Continuing')}
                    </span>
                    <span style="margin-left: 8px; background: ${statusStyle.bg}; color: ${statusStyle.color}; padding: 2px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                        ${(report.approval_status || 'pending').charAt(0).toUpperCase() + (report.approval_status || 'pending').slice(1)}
                    </span>
                </div>
            </div>

            <div style="margin-bottom: 16px;">
                <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 600;">Remarks</div>
                <div style="background: #f1f5f9; padding: 10px 14px; border-radius: 8px; font-size: 14px; color: #334155; margin-top: 4px; border-left: 3px solid #4C1D95;">
                    ${escapeHtml(report.remarks || 'No remarks')}
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e5e7eb; padding-top: 14px;">
                <div><i class="fas fa-clock"></i> Submitted: ${new Date(report.submitted_at).toLocaleString()}</div>
                ${report.approved_at ? `<div><i class="fas fa-check-circle"></i> Approved: ${new Date(report.approved_at).toLocaleString()}</div>` : ''}
            </div>
        `;

        // Show actions for pending requests
        if (isPending) {
            modalActions.style.display = 'flex';
            modalActions.innerHTML = `
                <button onclick="approveSessionReportAdmin('${reportId}')" style="padding: 10px 24px; background: #10b981; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    <i class="fas fa-check"></i> Approve & Update Profile
                </button>
                <button onclick="rejectSessionReportAdmin('${reportId}')" style="padding: 10px 24px; background: #dc2626; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    <i class="fas fa-times"></i> Reject
                </button>
                <button onclick="closeModal('smRequestModal')" style="padding: 10px 24px; background: #6b7280; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500;">
                    Close
                </button>
            `;
        } else {
            modalActions.style.display = 'flex';
            modalActions.innerHTML = `
                <button onclick="closeModal('smRequestModal')" style="padding: 10px 24px; background: #6b7280; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500;">
                    Close
                </button>
            `;
        }

        document.getElementById('smRequestModal').style.display = 'flex';

    } catch (error) {
        console.error('Error viewing session report:', error);
        if (typeof showNotification === 'function') {
            showNotification('Error loading report details', 'error');
        }
    }
}

// ============================================================
// UPDATE viewSMRequest to handle session reports
// ============================================================
async function viewSMRequest(requestId, type) {
    if (type === 'session-report') {
        await viewSessionReportDetails(requestId);
        return;
    }
    
    // Original code for other types...
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
        
        // Get student profile from consolidated_user_profiles_table for context
        let profileInfo = '';
        if (studentId && studentId !== 'N/A') {
            const profile = await getStudentProfile(studentId);
            if (profile) {
                const currentBlock = profile.current_block || profile.block || 'Not set';
                const currentYear = profile.current_year || profile.year || 'Not set';
                const currentTerm = profile.current_term || profile.term || 'Not set';
                const programType = detectProgramType(profile.program);
                profileInfo = `
                    <div style="grid-column: 1 / -1; background: #f0f9ff; padding: 10px 16px; border-radius: 8px; border-left: 3px solid #3b82f6;">
                        <span style="font-weight: 600; color: #1e40af; font-size: 11px; text-transform: uppercase;">Current Profile</span>
                        <div style="font-size: 13px; margin-top: 4px; display: flex; gap: 16px; flex-wrap: wrap;">
                            ${programType === 'Nursing' ? `
                                <span><strong>Block:</strong> ${escapeHtml(currentBlock)}</span>
                            ` : `
                                <span><strong>Year:</strong> ${escapeHtml(currentYear)}</span>
                                <span><strong>Term:</strong> ${escapeHtml(currentTerm)}</span>
                            `}
                            <span><strong>Program:</strong> ${escapeHtml(profile.program || 'N/A')}</span>
                        </div>
                    </div>
                `;
            }
        }
        
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
                
                ${profileInfo}
                
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
            document.getElementById('smModalActions').innerHTML = `
                <button onclick="approveSMRequest('${requestId}')" style="padding: 10px 24px; background: #10b981; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    <i class="fas fa-check"></i> Approve
                </button>
                <button onclick="rejectSMRequest('${requestId}')" style="padding: 10px 24px; background: #dc2626; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    <i class="fas fa-times"></i> Reject
                </button>
                <button onclick="closeModal('smRequestModal')" style="padding: 10px 24px; background: #6b7280; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500;">
                    Close
                </button>
            `;
        } else {
            document.getElementById('smModalActions').style.display = 'flex';
            document.getElementById('smModalActions').innerHTML = `
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
// LOAD HISTORY (UPDATED to include session reports)
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

        if (type !== 'all' && type !== 'admissions' && type !== 'session-report') {
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
        
        // Get from session_reports (NEW)
        if (type === 'all' || type === 'session-report') {
            let sessionQuery = sb
                .from('session_reports')
                .select('*')
                .in('approval_status', ['approved', 'rejected'])
                .order('approved_at', { ascending: false });
            
            if (status !== 'all') {
                sessionQuery = sessionQuery.eq('approval_status', status);
            }
            
            if (dateFrom) {
                sessionQuery = sessionQuery.gte('approved_at', dateFrom);
            }
            if (dateTo) {
                sessionQuery = sessionQuery.lte('approved_at', dateTo + 'T23:59:59');
            }
            
            const { data: sessionData, error: sessionError } = await sessionQuery;
            if (!sessionError && sessionData) {
                allHistory = [...allHistory, ...sessionData.map(s => ({
                    ...s,
                    request_type: 'session-report',
                    student_name: s.student_name,
                    student_id: s.student_id,
                    current_program: s.program,
                    requested_program: s.session,
                    approved_by: s.approved_by || 'System',
                    status: s.approval_status,
                    updated_at: s.approved_at
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
// RENDER HISTORY TABLE (UPDATED)
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
        'admission': 'Admission',
        'session-report': 'Session Report'
    };
    
    let html = '';
    history.forEach((r, index) => {
        const typeLabel = typeLabels[r.request_type] || r.request_type || 'Unknown';
        const statusClass = r.status || 'approved';
        const statusLabel = statusClass.charAt(0).toUpperCase() + statusClass.slice(1);
        const date = r.updated_at ? new Date(r.updated_at).toLocaleDateString() : 'N/A';
        const studentName = r.student_name || r.full_name || 'Unknown';
        const studentId = r.student_id || r.application_number || 'N/A';
        
        // For session reports, show different details
        let details = '';
        if (r.request_type === 'session-report') {
            details = `${r.academic_year || ''} → ${r.session || ''}`;
        } else {
            const fromProgram = r.current_program || r.previous_program || 'N/A';
            const toProgram = r.requested_program || r.program_name || 'N/A';
            details = `${fromProgram} <i class="fas fa-arrow-right" style="color: #94a3b8; margin: 0 6px;"></i> ${toProgram}`;
        }
        
        const approvedBy = r.approved_by || r.updated_by || 'System';
        
        html += `
        <tr style="border-bottom: 1px solid #e5e7eb; ${index % 2 === 0 ? 'background: #f8fafc;' : ''}">
            <td style="padding: 12px 16px;">
                <strong>${escapeHtml(studentName)}</strong>
                <div style="font-size: 11px; color: #94a3b8;">${escapeHtml(studentId)}</div>
            </td>
            <td style="padding: 12px 16px;">
                <span style="background: ${r.request_type === 'session-report' ? '#dbeafe' : '#e0e7ff'}; padding: 2px 12px; border-radius: 12px; font-size: 12px; color: #4C1D95;">${escapeHtml(typeLabel)}</span>
            </td>
            <td style="padding: 12px 16px; font-size: 13px;">
                ${details}
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
// UPDATE SM STATS (UPDATED)
// ============================================================
function updateSMStats() {
    const totalEl = document.getElementById('smTotalRequests');
    const changeEl = document.getElementById('smChangeProgramCount');
    const readmissionEl = document.getElementById('smReadmissionCount');
    const admissionsEl = document.getElementById('smNewAdmissionsCount');
    const sessionReportsEl = document.getElementById('smSessionReportsCount');
    const rejectedEl = document.getElementById('smRejectedCount');

    const changePending = SM_STATE.changeRequests?.filter(r => r.status === 'pending').length || 0;
    const readmissionPending = SM_STATE.readmissionRequests?.filter(r => r.status === 'pending').length || 0;
    const admissionPending = SM_STATE.admissionRequests?.filter(r => r.status === 'submitted' || r.status === 'reviewing').length || 0;
    const sessionPending = SM_STATE.sessionReports?.filter(r => r.approval_status === 'pending').length || 0;
    
    const totalRequests = (SM_STATE.changeRequests?.length || 0) + 
                         (SM_STATE.readmissionRequests?.length || 0) + 
                         (SM_STATE.admissionRequests?.length || 0) +
                         (SM_STATE.sessionReports?.length || 0);

    const allRequests = [...(SM_STATE.changeRequests || []), 
                         ...(SM_STATE.readmissionRequests || []), 
                         ...(SM_STATE.admissionRequests || []),
                         ...(SM_STATE.sessionReports || [])];
    const rejectedCount = allRequests.filter(r => r.status === 'rejected' || r.approval_status === 'rejected').length;

    if (totalEl) totalEl.textContent = totalRequests;
    if (changeEl) changeEl.textContent = changePending;
    if (readmissionEl) readmissionEl.textContent = readmissionPending;
    if (admissionsEl) admissionsEl.textContent = admissionPending;
    if (sessionReportsEl) sessionReportsEl.textContent = sessionPending;
    if (rejectedEl) rejectedEl.textContent = rejectedCount;
}

// ============================================================
// UPDATE SM BADGES (UPDATED)
// ============================================================
function updateSMBadges() {
    const changePending = SM_STATE.changeRequests?.filter(r => r.status === 'pending').length || 0;
    const readmissionPending = SM_STATE.readmissionRequests?.filter(r => r.status === 'pending').length || 0;
    const admissionPending = SM_STATE.admissionRequests?.filter(r => r.status === 'submitted' || r.status === 'reviewing').length || 0;
    const sessionPending = SM_STATE.sessionReports?.filter(r => r.approval_status === 'pending').length || 0;

    const changeBadge = document.getElementById('smChangePendingBadge');
    const readmissionBadge = document.getElementById('smReadmissionBadge');
    const admissionBadge = document.getElementById('smAdmissionsBadge');
    const sessionBadge = document.getElementById('smSessionReportsBadge');

    if (changeBadge) changeBadge.textContent = changePending;
    if (readmissionBadge) readmissionBadge.textContent = readmissionPending;
    if (admissionBadge) admissionBadge.textContent = admissionPending;
    if (sessionBadge) sessionBadge.textContent = sessionPending;
}

// ============================================================
// UPDATE SMCounter (UPDATED)
// ============================================================
function updateSMCounter(type) {
    const checkboxClass = type === 'admissions' ? 'admissions-checkbox' : 
                          type === 'change' ? 'change-checkbox' :
                          type === 'readmission' ? 'readmission-checkbox' :
                          'session-reports-checkbox';
    const checkboxes = document.querySelectorAll(`.${checkboxClass}:checked`);
    
    const countMap = {
        'admissions': 'smAdmissionsSelectedCount',
        'change': 'smChangeSelectedCount',
        'readmission': 'smReadmissionSelectedCount',
        'session-reports': 'smSessionReportsSelectedCount'
    };
    
    const countEl = document.getElementById(countMap[type]);
    if (countEl) countEl.textContent = checkboxes.length;
}

// ============================================================
// FILTER SM REQUESTS (UPDATED)
// ============================================================
function filterSMRequests(type) {
    if (type === 'admissions') {
        loadAdmissions();
    } else if (type === 'change') {
        loadChangeProgramRequests();
    } else if (type === 'readmission') {
        loadReadmissionRequests();
    } else if (type === 'session-reports') {
        loadSessionReportsAdmin();
    }
}

// ============================================================
// SHOW SM SUB TAB (UPDATED)
// ============================================================
function showSMSubTab(tab) {
    document.querySelectorAll('.sm-tab-content').forEach(el => el.style.display = 'none');
    
    const tabs = {
        'admissions': 'smAdmissionsTab',
        'change-program': 'smChangeProgramTab',
        'readmission': 'smReadmissionTab',
        'session-reports': 'smSessionReportsTab',
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
        'session-reports': 'smTabSessionReports',
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
    else if (tab === 'session-reports') loadSessionReportsAdmin();
    else if (tab === 'history') loadSMHistory();
    else if (tab === 'new-request') loadStudentsForDropdown();
}

// ============================================================
// TOGGLE ALL CHECKBOXES (UPDATED)
// ============================================================
function toggleAllSMCheckboxes(type) {
    const selectAllMap = {
        'admissions': 'smSelectAllAdmissions',
        'change': 'smSelectAllChange',
        'readmission': 'smSelectAllReadmission',
        'session-reports': 'smSelectAllSessionReports'
    };
    
    const selectAll = document.getElementById(selectAllMap[type]);
    if (!selectAll) return;
    
    const checkboxClass = type === 'admissions' ? 'admissions-checkbox' : 
                          type === 'change' ? 'change-checkbox' :
                          type === 'readmission' ? 'readmission-checkbox' :
                          'session-reports-checkbox';
    const checkboxes = document.querySelectorAll(`.${checkboxClass}`);
    checkboxes.forEach(cb => cb.checked = selectAll.checked);
    updateSMCounter(type);
}

// ============================================================
// REFRESH STUDENT MANAGEMENT (UPDATED)
// ============================================================
function refreshStudentManagement() {
    loadAdmissions();
    loadChangeProgramRequests();
    loadReadmissionRequests();
    loadSessionReportsAdmin();
    loadSMHistory();
    updateSMStats();
    updateSMBadges();
    if (typeof showNotification === 'function') {
        showNotification('🔄 Data refreshed!', 'success');
    }
}

// ============================================================
// EXPORT STUDENT REQUESTS (UPDATED)
// ============================================================
function exportStudentRequests() {
    const allRequests = [...SM_STATE.changeRequests, ...SM_STATE.readmissionRequests, ...SM_STATE.admissionRequests, ...SM_STATE.sessionReports];
    
    if (!allRequests || allRequests.length === 0) {
        if (typeof showNotification === 'function') {
            showNotification('No data to export', 'warning');
        }
        return;
    }
    
    const headers = ['ID', 'Student Name', 'Student ID', 'Email', 'Type', 'From Program', 'To Program', 'Status', 'Date', 'Approved By'];
    const rows = allRequests.map(r => {
        let type = 'Unknown';
        let fromProgram = 'N/A';
        let toProgram = 'N/A';
        let status = r.status || r.approval_status || 'pending';
        let date = r.created_at || r.submitted_at ? new Date(r.created_at || r.submitted_at).toLocaleDateString() : 'N/A';
        let approvedBy = r.approved_by || r.updated_by || 'System';
        let email = r.email || r.user_email || 'N/A';
        let studentName = r.student_name || r.full_name || 'Unknown';
        let studentId = r.student_id || r.application_number || 'N/A';
        
        if (r.request_type === 'admission') {
            type = 'Admission';
            fromProgram = r.program_name || r.program || 'N/A';
            toProgram = r.program_name || r.program || 'N/A';
        } else if (r.request_type === 'change_program') {
            type = 'Change of Program';
            fromProgram = r.current_program || 'N/A';
            toProgram = r.requested_program || 'N/A';
        } else if (r.request_type === 'readmission') {
            type = 'Readmission';
            fromProgram = r.previous_program || 'N/A';
            toProgram = r.requested_program || 'N/A';
        } else if (r.request_type === 'session-report') {
            type = 'Session Report';
            fromProgram = r.program || 'N/A';
            toProgram = r.session || 'N/A';
        }
        
        return [r.id, studentName, studentId, email, type, fromProgram, toProgram, status, date, approvedBy];
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
// GLOBAL REGISTRATION (UPDATED)
// ============================================================
window.initStudentManagement = initStudentManagement;
window.loadStudentsForDropdown = loadStudentsForDropdown;
window.loadAdmissions = loadAdmissions;
window.loadChangeProgramRequests = loadChangeProgramRequests;
window.loadReadmissionRequests = loadReadmissionRequests;
window.loadSessionReportsAdmin = loadSessionReportsAdmin;
window.loadSMHistory = loadSMHistory;
window.viewSMRequest = viewSMRequest;
window.approveSMRequest = approveSMRequest;
window.rejectSMRequest = rejectSMRequest;
window.quickApproveSM = quickApproveSM;
window.bulkApproveSM = bulkApproveSM;
window.bulkRejectSM = bulkRejectSM;
window.bulkReviewSM = bulkReviewSM;
window.approveSessionReportAdmin = approveSessionReportAdmin;
window.rejectSessionReportAdmin = rejectSessionReportAdmin;
window.bulkApproveSessionReports = bulkApproveSessionReports;
window.bulkRejectSessionReports = bulkRejectSessionReports;
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
window.getStudentProfile = getStudentProfile;
window.updateStudentProfile = updateStudentProfile;

console.log('✅ Student Management Module Loaded!');
console.log('📋 Features:');
console.log('   - ✅ Admissions management with profile creation');
console.log('   - ✅ Change of Program requests');
console.log('   - ✅ Readmission requests');
console.log('   - ✅ SESSION REPORTS: Auto-detects Nursing (Block) vs TVET (Year/Term)');
console.log('   - ✅ SESSION REPORTS: Admin approval updates consolidated_user_profiles_table');
console.log('   - ✅ Request history with filters');
console.log('   - ✅ Bulk approve/reject');
console.log('   - ✅ Student data from consolidated_user_profiles_table');
console.log('   - ✅ Auto-update student program on approval');
console.log('   - ✅ Export to CSV');
