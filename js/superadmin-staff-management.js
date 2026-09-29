// =====================================================
// STAFF MANAGEMENT - FULL MODULE WITH DOCUMENT UPLOAD
// FIXED: Works with staffManagementBody / staffManagement* HTML IDs
// FIXED: Safe getSb (no more ReferenceError)
// FIXED: All aliases so HTML onclick handlers work
// =====================================================

// ✅ Safe getSb — this file may load before script.js
function getSb() {
    return window.sb || window.supabase || null;
}

let staffRecords = [];
const STAFF_DEPARTMENTS = [
    'Nursing', 'TVET', 'Community Health', 'Health Records', 
    'ICT', 'Administration', 'Front Desk', 'Library', 'Clinical', 'Finance'
];

const staffUploadedDocs = {
    lecturer_id: null,
    kra_pin: null,
    university_cert: null,
    cv: null
};

// ============================================
// SHOW NOTIFICATION
// ============================================
function showNotification(message, type = 'success') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        padding: 16px 24px;
        border-radius: 12px;
        color: white;
        font-weight: 600;
        z-index: 999999;
        box-shadow: 0 8px 32px rgba(0,0,0,0.15);
        max-width: 450px;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 10px;
    `;
    
    const colors = { success: '#10b981', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    
    notification.style.background = colors[type] || colors.success;
    notification.innerHTML = `${icons[type] || '📢'} ${message}`;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification && notification.parentNode) {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s';
            setTimeout(() => {
                if (notification && notification.parentNode) notification.remove();
            }, 300);
        }
    }, 3500);
}

// ============================================
// HELPER: escapeHtml fallback
// ============================================
if (typeof window.escapeHtml === 'undefined') {
    window.escapeHtml = function(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    };
}

function getStaffDocLabel(docType) {
    const labels = {
        lecturer_id: 'National ID/Passport',
        kra_pin: 'KRA PIN Certificate',
        university_cert: 'University Certificate',
        cv: 'CV/Resume'
    };
    return labels[docType] || docType;
}

// ============================================
// TABLE LOOKUP HELPER — matches both HTML ids
// ============================================
function getStaffTableBody() {
    return document.getElementById('staffTableBody') ||
           document.getElementById('staffManagementBody');
}

// ============================================
// LOAD ALL STAFF
// ============================================
async function loadAllStaff() {
    console.log('👥 Loading staff records...');
    
    const tbody = getStaffTableBody();
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="15"><div class="loading-spinner"></div> Loading staff...</td></tr>';
    }
    
    try {
        const sb = getSb();
        if (!sb) throw new Error('Supabase client not available');
        
        const { data, error } = await sb
            .from('staff_records')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            if (error.code === '42P01') {
                throw new Error('Table "staff_records" does not exist. Please create it in Supabase.');
            }
            throw error;
        }
        
        staffRecords = data || [];
        updateStaffStats();
        renderStaffTable();
        console.log('✅ Loaded', staffRecords.length, 'staff records');
        
    } catch (error) {
        console.error('Error loading staff:', error);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" style="color: red; padding: 40px; text-align: center;">
                ❌ Error: ${error.message}<br>
                <small>Please create the staff_records table in Supabase.</small>
            </td></tr>`;
        }
    }
}

// ============================================
// UPDATE STATS — writes to BOTH id sets
// ============================================
function updateStaffStats() {
    const total = staffRecords.length;
    const active = staffRecords.filter(s => s.status === 'active').length;
    const male = staffRecords.filter(s => s.gender === 'M' || s.gender === 'Male').length;
    const female = staffRecords.filter(s => s.gender === 'F' || s.gender === 'Female').length;
    const academic = staffRecords.filter(s => 
        s.designation && ['lecturer', 'tutor', 'clinical instructor'].includes(String(s.designation).toLowerCase())
    ).length;
    const departments = new Set(staffRecords.map(s => s.department).filter(Boolean)).size;

    // Old IDs (kept for safety)
    if (document.getElementById('totalStaffCount')) document.getElementById('totalStaffCount').textContent = total;
    if (document.getElementById('activeStaffCount')) document.getElementById('activeStaffCount').textContent = active;
    if (document.getElementById('maleStaffCount')) document.getElementById('maleStaffCount').textContent = male;
    if (document.getElementById('femaleStaffCount')) document.getElementById('femaleStaffCount').textContent = female;

    // New IDs (from actual staff-management section HTML)
    if (document.getElementById('staffManagementTotal')) document.getElementById('staffManagementTotal').textContent = total;
    if (document.getElementById('staffManagementActive')) document.getElementById('staffManagementActive').textContent = active;
    if (document.getElementById('staffManagementAcademic')) document.getElementById('staffManagementAcademic').textContent = academic;
    if (document.getElementById('staffManagementDepartments')) document.getElementById('staffManagementDepartments').textContent = departments;
}

// ============================================
// RENDER STAFF TABLE
// ============================================
function renderStaffTable() {
    const tbody = getStaffTableBody();
    if (!tbody) {
        console.warn('⚠️ Staff table body not found');
        return;
    }
    
    // Read from BOTH possible filter IDs
    const searchTerm = (
        document.getElementById('staffSearchInput')?.value ||
        document.getElementById('staffManagementSearch')?.value ||
        ''
    ).toLowerCase();

    const deptFilter = 
        document.getElementById('departmentFilter')?.value ||
        document.getElementById('staffManagementDepartment')?.value ||
        'all';

    const statusFilter = 
        document.getElementById('statusFilter')?.value ||
        document.getElementById('staffManagementStatus')?.value ||
        'all';

    const programFilter = document.getElementById('programFilter')?.value || 'all';
    
    let filtered = [...staffRecords];
    
    if (searchTerm) {
        filtered = filtered.filter(s => 
            (s.first_name || '').toLowerCase().includes(searchTerm) || 
            (s.other_names || '').toLowerCase().includes(searchTerm) ||
            (s.id || '').toLowerCase().includes(searchTerm) || 
            (s.email || '').toLowerCase().includes(searchTerm) ||
            (s.department || '').toLowerCase().includes(searchTerm)
        );
    }
    if (deptFilter !== 'all') filtered = filtered.filter(s => s.department === deptFilter);
    if (statusFilter !== 'all') filtered = filtered.filter(s => s.status === statusFilter);
    if (programFilter !== 'all') filtered = filtered.filter(s => s.program === programFilter);
    
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: #6b7280;">
            <i class="fas fa-users" style="font-size: 30px; display: block; margin-bottom: 10px;"></i>
            No staff records found.
        </td></tr>`;
        return;
    }
    
    let html = '';
    filtered.forEach(staff => {
        const programBadge = staff.program === 'TVET' 
            ? '<span style="background:#f59e0b;color:#92400e;padding:2px 8px;border-radius:4px;font-size:11px;">TVET</span>'
            : '<span style="background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:4px;font-size:11px;">KRCHN</span>';
        
        const genderDisplay = staff.gender === 'M' || staff.gender === 'Male' ? 'Male' : 
                             staff.gender === 'F' || staff.gender === 'Female' ? 'Female' : '-';
        
        const isActive = staff.status === 'active';
        const statusBadge = isActive
            ? '<span style="background:#d1fae5;color:#065f46;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;">✅ Active</span>'
            : '<span style="background:#fee2e2;color:#991b1b;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;">❌ Inactive</span>';
        
        const initials = ((staff.first_name || 'S').charAt(0) + (staff.other_names || '').charAt(0)).toUpperCase();
        
        html += `
            <tr data-staff-id="${escapeHtml(staff.id)}" style="border-bottom:1px solid #e5e7eb;">
                <td style="padding:12px;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <div style="width:36px;height:36px;border-radius:50%;background:#4C1D95;color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0;">${escapeHtml(initials || 'S')}</div>
                        <div>
                            <div style="font-weight:600;color:#1e293b;">${escapeHtml(staff.title || '')} ${escapeHtml(staff.first_name || '')} ${escapeHtml(staff.other_names || '')}</div>
                            <div style="font-size:11px;color:#94a3b8;">${escapeHtml(staff.email || '')} · ${escapeHtml(staff.phone || '')}</div>
                        </div>
                    </div>
                </td>
                <td style="padding:12px;"><code style="background:#f1f5f9;padding:2px 8px;border-radius:4px;font-size:12px;">${escapeHtml(staff.id || 'N/A')}</code></td>
                <td style="padding:12px;">
                    <div style="font-weight:500;color:#1e293b;">${escapeHtml(staff.department || 'N/A')}</div>
                    <div style="margin-top:2px;">${programBadge}</div>
                </td>
                <td style="padding:12px;">${escapeHtml(staff.designation || 'Staff')}</td>
                <td style="padding:12px;text-align:center;">${statusBadge}</td>
                <td style="padding:12px;text-align:center;white-space:nowrap;">
                    <button onclick="toggleStaffLogin('${escapeHtml(staff.id)}', ${staff.login_enabled})" 
                            class="toggle-login-btn"
                            style="background:${staff.login_enabled ? '#f59e0b' : '#10b981'};color:white;border:none;padding:5px 10px;border-radius:4px;margin-right:4px;cursor:pointer;font-size:11px;">
                        ${staff.login_enabled ? '🔓' : '🔒'}
                    </button>
                    <button onclick="editStaff('${escapeHtml(staff.id)}')" 
                            style="background:#3b82f6;color:white;border:none;padding:5px 10px;border-radius:4px;margin-right:4px;cursor:pointer;font-size:11px;">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="viewStaffDocuments('${escapeHtml(staff.id)}')" 
                            style="background:#10b981;color:white;border:none;padding:5px 10px;border-radius:4px;margin-right:4px;cursor:pointer;font-size:11px;">
                        <i class="fas fa-file-alt"></i>
                    </button>
                    <button onclick="deleteStaff('${escapeHtml(staff.id)}', '${escapeHtml(staff.first_name)}')" 
                            style="background:#ef4444;color:white;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;font-size:11px;">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// ============================================
// TOGGLE STAFF LOGIN ACCESS
// ============================================
async function toggleStaffLogin(staffId, currentStatus) {
    try {
        const sb = getSb();
        if (!sb) throw new Error('Supabase client not available');
        
        const newStatus = !currentStatus;
        
        const { error } = await sb
            .from('staff_records')
            .update({ login_enabled: newStatus, updated_at: new Date().toISOString() })
            .eq('id', staffId);
        
        if (error) throw error;
        
        showNotification(`✅ Login ${newStatus ? 'enabled' : 'disabled'}`, 'success');
        loadAllStaff();
        return true;
    } catch (error) {
        console.error('❌ Toggle login error:', error);
        showNotification('❌ Failed: ' + error.message, 'error');
        return false;
    }
}

// ============================================
// OPEN ADD STAFF MODAL
// ============================================
function openAddStaffModal() {
    console.log('🔧 Opening Add Staff Modal...');
    
    const modal = document.getElementById('addStaffModal');
    if (!modal) {
        console.error('❌ addStaffModal not found');
        alert('Staff modal not found. Please check the HTML.');
        return;
    }
    
    document.getElementById('modalTitle').textContent = 'Register Staff';
    document.getElementById('editStaffId').value = '';
    
    const submitBtn = document.querySelector('#staffForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Staff';
        submitBtn.onclick = saveStaff;
        submitBtn.disabled = false;
    }
    
    // Reset form fields safely
    const reset = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    reset('staffTitle', 'Mr.');
    reset('staffFirstName', '');
    reset('staffOtherNames', '');
    reset('staffEmail', '');
    reset('staffPhone', '');
    reset('staffNationalId', '');
    reset('staffGender', 'Male');
    reset('staffDepartment', 'Nursing');
    reset('staffProgram', 'KRCHN');
    reset('staffDesignation', '');
    reset('staffBankName', '');
    reset('staffBankAccount', '');
    reset('staffShifNumber', '');
    reset('staffNsrfNumber', '');
    reset('staffTaxPin', '');
    reset('staffGuardianPhone', '');
    reset('staffStatus', 'active');
    reset('staffPassword', '');
    reset('staffConfirmPassword', '');
    
    const loginCheck = document.getElementById('staffEnableLogin');
    if (loginCheck) { loginCheck.checked = true; loginCheck.disabled = false; }
    
    const pwSection = document.getElementById('staffPasswordSection');
    if (pwSection) pwSection.style.display = 'block';
    
    resetStaffDocuments();
    modal.style.display = 'flex';
}

function closeAddStaffModal() {
    const modal = document.getElementById('addStaffModal');
    if (modal) modal.style.display = 'none';
}

function resetStaffDocuments() {
    const docTypes = ['lecturer_id', 'kra_pin', 'university_cert', 'cv'];
    docTypes.forEach(docType => {
        staffUploadedDocs[docType] = null;
        const statusEl = document.getElementById(`doc_${docType}_status`);
        const filenameEl = document.getElementById(`doc_${docType}_filename`);
        const input = document.getElementById(`doc_${docType}_input`);
        if (statusEl) { statusEl.textContent = 'Not uploaded'; }
        if (filenameEl) filenameEl.textContent = '';
        if (input) input.value = '';
    });
}

function toggleStaffPasswordField() {
    const loginCheckbox = document.getElementById('staffEnableLogin');
    const passwordSection = document.getElementById('staffPasswordSection');
    if (loginCheckbox && passwordSection) {
        passwordSection.style.display = loginCheckbox.checked ? 'block' : 'none';
    }
}

function handleStaffDocumentUpload(event, docType) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
        alert(`❌ ${getStaffDocLabel(docType)} exceeds 5MB limit.`);
        event.target.value = '';
        return;
    }
    
    staffUploadedDocs[docType] = file;
    
    const statusEl = document.getElementById(`doc_${docType}_status`);
    const filenameEl = document.getElementById(`doc_${docType}_filename`);
    if (statusEl) statusEl.textContent = '✅ Uploaded';
    if (filenameEl) filenameEl.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
}

function removeStaffDocument(docType) {
    if (!confirm(`Remove ${getStaffDocLabel(docType)}?`)) return;
    staffUploadedDocs[docType] = null;
    const statusEl = document.getElementById(`doc_${docType}_status`);
    const filenameEl = document.getElementById(`doc_${docType}_filename`);
    const input = document.getElementById(`doc_${docType}_input`);
    if (statusEl) statusEl.textContent = 'Not uploaded';
    if (filenameEl) filenameEl.textContent = '';
    if (input) input.value = '';
}

async function viewStaffDocuments(staffId) {
    try {
        const sb = getSb();
        if (!sb) throw new Error('Supabase client not available');
        
        const modal = document.getElementById('viewDocsModal');
        const content = document.getElementById('viewDocsContent');
        const title = document.getElementById('viewDocsTitle');
        if (!modal || !content) return;
        
        const staff = staffRecords.find(s => s.id === staffId);
        if (title) title.textContent = `📄 ${staff?.first_name || 'Staff'} Documents`;
        
        content.innerHTML = '<p style="color:#94a3b8; text-align:center;"><i class="fas fa-spinner fa-spin"></i> Loading...</p>';
        modal.style.display = 'flex';
        
        const { data, error } = await sb.from('user_documents').select('*').eq('user_id', staffId);
        if (error) throw error;
        
        if (!data || data.length === 0) {
            content.innerHTML = `<div style="text-align:center;padding:30px;color:#94a3b8;">
                <i class="fas fa-folder-open" style="font-size:40px;display:block;margin-bottom:12px;"></i>
                <p>No documents uploaded.</p>
            </div>`;
        } else {
            content.innerHTML = `<div style="display:flex;flex-direction:column;gap:12px;">
                ${data.map(doc => `
                    <div style="display:flex;align-items:center;gap:14px;padding:12px 16px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
                        <span style="font-size:24px;">📄</span>
                        <div style="flex:1;">
                            <div style="font-weight:600;font-size:14px;color:#1e293b;">${escapeHtml(doc.document_type || 'Document')}</div>
                            <div style="font-size:12px;color:#64748B;">${escapeHtml(doc.file_name || '')}</div>
                        </div>
                        <a href="${doc.file_path}" target="_blank" style="background:#4C1D95;color:white;padding:6px 14px;border-radius:8px;text-decoration:none;font-size:12px;">
                            <i class="fas fa-download"></i> View
                        </a>
                    </div>
                `).join('')}
            </div>`;
        }
    } catch (error) {
        console.error('❌ Error:', error);
        const content = document.getElementById('viewDocsContent');
        if (content) content.innerHTML = `<div style="text-align:center;padding:30px;color:#dc2626;">Error: ${escapeHtml(error.message)}</div>`;
    }
}

function closeViewDocsModal() {
    const modal = document.getElementById('viewDocsModal');
    if (modal) modal.style.display = 'none';
}

// ============================================
// SAVE STAFF — CREATE NEW
// ============================================
async function saveStaff() {
    console.log('🔧 Saving new staff...');
    
    const loginEnabled = document.getElementById('staffEnableLogin')?.checked || false;
    const password = document.getElementById('staffPassword')?.value;
    const confirmPassword = document.getElementById('staffConfirmPassword')?.value;
    
    if (loginEnabled) {
        if (!password) { alert('Please enter a password'); return; }
        if (password !== confirmPassword) { alert('Passwords do not match'); return; }
        if (password.length < 6) { alert('Password must be at least 6 characters'); return; }
    }
    
    const staffData = {
        title: document.getElementById('staffTitle')?.value || '',
        first_name: document.getElementById('staffFirstName')?.value?.trim() || '',
        other_names: document.getElementById('staffOtherNames')?.value?.trim() || '',
        department: document.getElementById('staffDepartment')?.value || '',
        program: document.getElementById('staffProgram')?.value || 'KRCHN',
        designation: document.getElementById('staffDesignation')?.value || 'lecturer',
        email: document.getElementById('staffEmail')?.value?.trim() || '',
        phone: document.getElementById('staffPhone')?.value?.trim() || '',
        national_id: document.getElementById('staffNationalId')?.value?.trim() || '',
        gender: document.getElementById('staffGender')?.value || '',
        bank_name: document.getElementById('staffBankName')?.value?.trim() || '',
        bank_account: document.getElementById('staffBankAccount')?.value?.trim() || '',
        shif_number: document.getElementById('staffShifNumber')?.value?.trim() || '',
        nsrf_number: document.getElementById('staffNsrfNumber')?.value?.trim() || '',
        tax_pin: document.getElementById('staffTaxPin')?.value?.trim() || '',
        guardian_phone: document.getElementById('staffGuardianPhone')?.value?.trim() || '',
        login_enabled: loginEnabled,
        status: document.getElementById('staffStatus')?.value || 'active'
    };
    
    if (!staffData.first_name || !staffData.department || !staffData.email || !staffData.phone) {
        alert('Please fill all required fields (First Name, Department, Email, Phone)');
        return;
    }
    
    try {
        const sb = getSb();
        if (!sb) throw new Error('Supabase client not available');
        
        const submitBtn = document.querySelector('#staffForm button[type="submit"]');
        if (submitBtn) { submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...'; submitBtn.disabled = true; }
        
        const { data: existing } = await sb.from('staff_records').select('id, email').eq('email', staffData.email).maybeSingle();
        
        let staffId;
        if (existing) {
            staffId = existing.id;
            if (password) staffData.password_hash = btoa(password);
            staffData.updated_at = new Date().toISOString();
            const { error } = await sb.from('staff_records').update(staffData).eq('id', existing.id);
            if (error) throw error;
            showNotification(`✅ Staff ${staffData.first_name} updated!`, 'success');
        } else {
            const deptCodes = { 'Nursing':'NUR','TVET':'TVT','Community Health':'COM','Health Records':'HRT','ICT':'ICT','Administration':'ADM','Front Desk':'FRT','Library':'LIB','Clinical':'CLN','Finance':'FIN' };
            const deptCode = deptCodes[staffData.department] || 'STA';
            const { data: deptStaff } = await sb.from('staff_records').select('id').ilike('id', 'NCHSM' + deptCode + '-%').order('created_at', { ascending: false });
            
            let nextNumber = 1;
            if (deptStaff && deptStaff.length > 0) {
                const match = deptStaff[0].id.match(new RegExp('NCHSM' + deptCode + '-(\\d+)'));
                nextNumber = match ? parseInt(match[1]) + 1 : deptStaff.length + 1;
            }
            
            staffId = 'NCHSM' + deptCode + '-' + String(nextNumber).padStart(3, '0');
            staffData.id = staffId;
            if (password) staffData.password_hash = btoa(password);
            staffData.created_at = new Date().toISOString();
            staffData.updated_at = new Date().toISOString();
            
            const { error } = await sb.from('staff_records').insert([staffData]);
            if (error) throw error;
            showNotification(`✅ Staff registered! ID: ${staffId}`, 'success');
        }
        
        closeAddStaffModal();
        loadAllStaff();
        resetStaffDocuments();
        
    } catch (error) {
        console.error('❌ Save error:', error);
        alert(`❌ Error: ${error.message}`);
    } finally {
        const submitBtn = document.querySelector('#staffForm button[type="submit"]');
        if (submitBtn) { submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Staff'; submitBtn.disabled = false; }
    }
}

// ============================================
// EDIT STAFF
// ============================================
async function editStaff(staffId) {
    const staff = staffRecords.find(s => s.id === staffId);
    if (!staff) { alert('Staff record not found'); return; }
    
    const modal = document.getElementById('addStaffModal');
    if (!modal) { alert('Modal not found'); return; }
    
    document.getElementById('modalTitle').textContent = `✏️ Edit Staff: ${staff.first_name}`;
    document.getElementById('editStaffId').value = staff.id;
    
    const submitBtn = document.querySelector('#staffForm button[type="submit"]');
    if (submitBtn) { submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Staff'; submitBtn.onclick = updateStaff; submitBtn.disabled = false; }
    
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ''; };
    set('staffTitle', staff.title);
    set('staffFirstName', staff.first_name);
    set('staffOtherNames', staff.other_names);
    set('staffDepartment', staff.department);
    set('staffProgram', staff.program);
    set('staffDesignation', staff.designation);
    set('staffEmail', staff.email);
    set('staffPhone', staff.phone);
    set('staffNationalId', staff.national_id);
    set('staffGender', staff.gender);
    set('staffBankName', staff.bank_name);
    set('staffBankAccount', staff.bank_account);
    set('staffShifNumber', staff.shif_number);
    set('staffNsrfNumber', staff.nsrf_number);
    set('staffTaxPin', staff.tax_pin);
    set('staffGuardianPhone', staff.guardian_phone);
    set('staffStatus', staff.status || 'active');
    
    const loginCheck = document.getElementById('staffEnableLogin');
    if (loginCheck) { loginCheck.checked = staff.login_enabled || false; loginCheck.disabled = true; }
    
    const idDisplay = document.getElementById('staffIdDisplay');
    if (idDisplay) { idDisplay.value = staff.id; idDisplay.style.color = '#0b1120'; idDisplay.style.fontWeight = '600'; }
    
    const pwSection = document.getElementById('staffPasswordSection');
    if (pwSection) pwSection.style.display = 'none';
    
    resetStaffDocuments();
    modal.style.display = 'flex';
}

// ============================================
// UPDATE STAFF
// ============================================
async function updateStaff() {
    const staffId = document.getElementById('editStaffId')?.value;
    if (!staffId) { alert('Staff ID not found'); return; }
    
    const staffData = {
        title: document.getElementById('staffTitle')?.value || '',
        first_name: document.getElementById('staffFirstName')?.value?.trim() || '',
        other_names: document.getElementById('staffOtherNames')?.value?.trim() || '',
        department: document.getElementById('staffDepartment')?.value || '',
        program: document.getElementById('staffProgram')?.value || 'KRCHN',
        designation: document.getElementById('staffDesignation')?.value?.trim() || 'lecturer',
        email: document.getElementById('staffEmail')?.value?.trim() || '',
        phone: document.getElementById('staffPhone')?.value?.trim() || '',
        national_id: document.getElementById('staffNationalId')?.value?.trim() || '',
        gender: document.getElementById('staffGender')?.value || '',
        bank_name: document.getElementById('staffBankName')?.value?.trim() || '',
        bank_account: document.getElementById('staffBankAccount')?.value?.trim() || '',
        shif_number: document.getElementById('staffShifNumber')?.value?.trim() || '',
        nsrf_number: document.getElementById('staffNsrfNumber')?.value?.trim() || '',
        tax_pin: document.getElementById('staffTaxPin')?.value?.trim() || '',
        guardian_phone: document.getElementById('staffGuardianPhone')?.value?.trim() || '',
        status: document.getElementById('staffStatus')?.value || 'active',
        updated_at: new Date().toISOString()
    };
    
    if (!staffData.first_name || !staffData.email || !staffData.phone) {
        alert('First Name, Email and Phone are required');
        return;
    }
    
    try {
        const sb = getSb();
        if (!sb) throw new Error('Supabase client not available');
        
        const submitBtn = document.querySelector('#staffForm button[type="submit"]');
        if (submitBtn) { submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...'; submitBtn.disabled = true; }
        
        const { error } = await sb.from('staff_records').update(staffData).eq('id', staffId);
        if (error) throw error;
        
        showNotification(`✅ Staff ${staffData.first_name} updated!`, 'success');
        closeAddStaffModal();
        loadAllStaff();
        
    } catch (error) {
        console.error('❌ Update error:', error);
        alert(`❌ Error: ${error.message}`);
        const submitBtn = document.querySelector('#staffForm button[type="submit"]');
        if (submitBtn) { submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Staff'; submitBtn.disabled = false; }
    }
}

async function resetStaffPassword(staffId, staffName) {
    const newPassword = prompt(`Reset password for ${staffName}\n\nEnter new password (min 6 chars):`);
    if (!newPassword || newPassword.length < 6) { if (newPassword) alert('Password must be at least 6 characters'); return; }
    const confirmPwd = prompt('Confirm new password:');
    if (newPassword !== confirmPwd) { alert('Passwords do not match'); return; }
    
    try {
        const sb = getSb();
        const { error } = await sb.from('staff_records').update({ 
            password_hash: btoa(newPassword), login_enabled: true, updated_at: new Date().toISOString()
        }).eq('id', staffId);
        if (error) throw error;
        showNotification(`✅ Password reset for ${staffName}`, 'success');
        loadAllStaff();
    } catch (error) {
        alert(`❌ Error: ${error.message}`);
    }
}

async function deleteStaff(staffId, staffName) {
    if (!confirm(`⚠️ Delete staff "${staffName}"?`)) return;
    try {
        const sb = getSb();
        const { error } = await sb.from('staff_records').delete().eq('id', staffId);
        if (error) throw error;
        showNotification(`✅ Staff ${staffName} deleted!`, 'success');
        loadAllStaff();
    } catch (error) {
        alert(`❌ Error: ${error.message}`);
    }
}

async function quickEditDepartment(staffId) {
    const staff = staffRecords.find(s => s.id === staffId);
    if (!staff) return;
    
    const newDept = prompt(`Change department (current: ${staff.department}):`, staff.department);
    if (!newDept || newDept === staff.department) return;
    
    try {
        const sb = getSb();
        const { error } = await sb.from('staff_records').update({ department: newDept, updated_at: new Date().toISOString() }).eq('id', staffId);
        if (error) throw error;
        showNotification(`✅ Department updated to ${newDept}`, 'success');
        loadAllStaff();
    } catch (error) {
        alert(`❌ Error: ${error.message}`);
    }
}

function filterStaffTable() {
    renderStaffTable();
}

function exportStaffToCSV() {
    if (staffRecords.length === 0) { showNotification('No data to export', 'warning'); return; }
    const headers = ['Staff ID', 'Title', 'First Name', 'Other Names', 'Department', 'Program', 'Designation', 'Email', 'Phone', 'Gender', 'Status'];
    const rows = staffRecords.map(s => [s.id, s.title, s.first_name, s.other_names, s.department, s.program, s.designation, s.email, s.phone, s.gender, s.status]);
    let csv = headers.join(',') + '\n';
    rows.forEach(row => { csv += row.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(',') + '\n'; });
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `staff_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
}

// ============================================
// INITIALIZE STAFF MANAGEMENT
// ============================================
function initStaffManagement() {
    console.log('🚀 Initializing Staff Management...');
    loadAllStaff();
    
    const searchInput = document.getElementById('staffSearchInput') || document.getElementById('staffManagementSearch');
    if (searchInput && !searchInput.dataset.bound) {
        searchInput.dataset.bound = '1';
        searchInput.addEventListener('input', filterStaffTable);
    }
    
    ['departmentFilter','programFilter','statusFilter','staffManagementDepartment','staffManagementStatus'].forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.dataset.bound) {
            el.dataset.bound = '1';
            el.addEventListener('change', filterStaffTable);
        }
    });
    
    const loginCheckbox = document.getElementById('staffEnableLogin');
    if (loginCheckbox && !loginCheckbox.dataset.bound) {
        loginCheckbox.dataset.bound = '1';
        loginCheckbox.addEventListener('change', toggleStaffPasswordField);
    }
    
    console.log('✅ Staff Management initialized');
}

// ============================================
// EXPOSE TO GLOBAL + ALIASES
// ============================================
window.loadAllStaff = loadAllStaff;
window.openAddStaffModal = openAddStaffModal;
window.openStaffModal = openAddStaffModal;              // HTML alias
window.closeAddStaffModal = closeAddStaffModal;
window.saveStaff = saveStaff;
window.editStaff = editStaff;
window.updateStaff = updateStaff;
window.resetStaffPassword = resetStaffPassword;
window.deleteStaff = deleteStaff;
window.filterStaffTable = filterStaffTable;
window.filterStaff = filterStaffTable;                  // HTML alias
window.exportStaffToCSV = exportStaffToCSV;
window.initStaffManagement = initStaffManagement;
window.toggleStaffPasswordField = toggleStaffPasswordField;
window.toggleStaffLogin = toggleStaffLogin;
window.quickEditDepartment = quickEditDepartment;
window.handleStaffDocumentUpload = handleStaffDocumentUpload;
window.removeStaffDocument = removeStaffDocument;
window.viewStaffDocuments = viewStaffDocuments;
window.closeViewDocsModal = closeViewDocsModal;
window.showNotification = showNotification;
window.getSb = getSb;
window.loadStaff = loadAllStaff;                        // HTML alias
window.refreshStaff = function() {                      // HTML alias
    loadAllStaff();
    showNotification('🔄 Staff list refreshed', 'success');
};

console.log('✅ Staff Management module fully loaded with all functions');
console.log('✅ Aliases wired: openStaffModal, filterStaff, loadStaff, refreshStaff');
