// =====================================================
// STAFF MANAGEMENT - FULL MODULE WITH DOCUMENT UPLOAD
// MATCHES REGISTRATION FLOW
// =====================================================

let staffRecords = [];
const STAFF_DEPARTMENTS = [
    'Nursing', 'TVET', 'Community Health', 'Health Records', 
    'ICT', 'Administration', 'Front Desk', 'Library', 'Clinical'
];

// ============================================
// STORED STAFF DOCUMENTS
// ============================================
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
        animation: slideUp 0.3s ease;
        max-width: 450px;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 10px;
    `;
    
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    notification.style.background = colors[type] || colors.success;
    notification.innerHTML = `${icons[type] || '📢'} ${message}`;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification && notification.parentNode) {
            notification.style.animation = 'slideDown 0.3s ease';
            setTimeout(() => {
                if (notification && notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }
    }, 3500);
}

// ============================================
// HELPER: Get document label
// ============================================
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
// LOAD ALL STAFF
// ============================================
async function loadAllStaff() {
    console.log('👥 Loading staff records...');
    
    const tbody = document.getElementById('staffTableBody');
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
            tbody.innerHTML = `<tr><td colspan="15" style="color: red; padding: 40px; text-align: center;">
                ❌ Error: ${error.message}<br>
                <small>Please create the staff_records table in Supabase.</small>
            </td></tr>`;
        }
    }
}

// ============================================
// UPDATE STATS
// ============================================
function updateStaffStats() {
    const total = staffRecords.length;
    const active = staffRecords.filter(s => s.status === 'active').length;
    const male = staffRecords.filter(s => s.gender === 'M' || s.gender === 'Male').length;
    const female = staffRecords.filter(s => s.gender === 'F' || s.gender === 'Female').length;
    
    const totalEl = document.getElementById('totalStaffCount');
    const activeEl = document.getElementById('activeStaffCount');
    const maleEl = document.getElementById('maleStaffCount');
    const femaleEl = document.getElementById('femaleStaffCount');
    
    if (totalEl) totalEl.textContent = total;
    if (activeEl) activeEl.textContent = active;
    if (maleEl) maleEl.textContent = male;
    if (femaleEl) femaleEl.textContent = female;
}

// ============================================
// RENDER STAFF TABLE
// ============================================
function renderStaffTable() {
    const tbody = document.getElementById('staffTableBody');
    if (!tbody) return;
    
    const searchTerm = (document.getElementById('staffSearchInput')?.value || '').toLowerCase();
    const deptFilter = document.getElementById('departmentFilter')?.value || 'all';
    const statusFilter = document.getElementById('statusFilter')?.value || 'all';
    const programFilter = document.getElementById('programFilter')?.value || 'all';
    
    let filtered = [...staffRecords];
    
    if (searchTerm) {
        filtered = filtered.filter(s => 
            (s.first_name || '').toLowerCase().includes(searchTerm) || 
            (s.other_names || '').toLowerCase().includes(searchTerm) ||
            (s.id || '').toLowerCase().includes(searchTerm) || 
            (s.email || '').toLowerCase().includes(searchTerm)
        );
    }
    
    if (deptFilter !== 'all') {
        filtered = filtered.filter(s => s.department === deptFilter);
    }
    
    if (statusFilter !== 'all') {
        filtered = filtered.filter(s => s.status === statusFilter);
    }
    
    if (programFilter !== 'all') {
        filtered = filtered.filter(s => s.program === programFilter);
    }
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="15" style="text-align: center; padding: 40px; color: #6b7280;">No staff records found</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    
    filtered.forEach(staff => {
        const loginStatus = staff.login_enabled ? 
            '<span style="color: #10b981;">✅ Enabled</span>' : 
            '<span style="color: #ef4444;">❌ Disabled</span>';
        
        const programBadge = staff.program === 'TVET' ? 
            '<span style="background: #f59e0b; color: #92400e; padding: 2px 8px; border-radius: 4px; font-size: 11px;">TVET</span>' :
            '<span style="background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px; font-size: 11px;">KRCHN</span>';
        
        const genderDisplay = staff.gender === 'M' || staff.gender === 'Male' ? 'Male' : 
                             staff.gender === 'F' || staff.gender === 'Female' ? 'Female' : '-';
        
        tbody.innerHTML += `
            <tr data-staff-id="${staff.id}" style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px;">${escapeHtml(staff.title || '')}</td>
                <td style="padding: 12px;">${escapeHtml(staff.first_name)}</td>
                <td style="padding: 12px;">${escapeHtml(staff.other_names || '')}</td>
                <td style="padding: 12px;">${escapeHtml(staff.department || 'N/A')}</td>
                <td style="padding: 12px;">${programBadge}</td>
                <td style="padding: 12px;">${escapeHtml(staff.email)}</td>
                <td style="padding: 12px;">${escapeHtml(staff.phone)}</td>
                <td style="padding: 12px;"><strong>${escapeHtml(staff.id)}</strong></td>
                <td style="padding: 12px;">${genderDisplay}</td>
                <td style="padding: 12px;">${escapeHtml(staff.bank_name || '-')}</td>
                <td style="padding: 12px;">${escapeHtml(staff.bank_account || '-')}</td>
                <td style="padding: 12px;">${escapeHtml(staff.shif_number || '-')}</td>
                <td style="padding: 12px;">${escapeHtml(staff.nsrf_number || '-')}</td>
                <td style="padding: 12px;">
                    <span class="login-status" style="color: ${staff.login_enabled ? '#10b981' : '#ef4444'};">
                        ${staff.login_enabled ? '✅ Enabled' : '❌ Disabled'}
                    </span>
                </td>
                <td style="padding: 12px; white-space: nowrap;">
                    <button onclick="toggleStaffLogin('${staff.id}', ${staff.login_enabled})" 
                            class="toggle-login-btn"
                            style="background:${staff.login_enabled ? '#f59e0b' : '#10b981'};color:white;border:none;padding:5px 10px;border-radius:4px;margin-right:5px;cursor:pointer;font-size:12px;">
                        ${staff.login_enabled ? '🔓 Disable' : '🔒 Enable'}
                    </button>
                    <button onclick="editStaff('${staff.id}')" 
                            style="background:#3b82f6;color:white;border:none;padding:5px 10px;border-radius:4px;margin-right:5px;cursor:pointer;font-size:12px;">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="viewStaffDocuments('${staff.id}')" 
                            style="background:#10b981;color:white;border:none;padding:5px 10px;border-radius:4px;margin-right:5px;cursor:pointer;font-size:12px;">
                        <i class="fas fa-file-alt"></i>
                    </button>
                    <button onclick="quickEditDepartment('${staff.id}')" 
                            style="background:#8b5cf6;color:white;border:none;padding:5px 10px;border-radius:4px;margin-right:5px;cursor:pointer;font-size:12px;">
                        <i class="fas fa-building"></i>
                    </button>
                    <button onclick="resetStaffPassword('${staff.id}', '${staff.first_name}')" 
                            style="background:#f59e0b;color:white;border:none;padding:5px 10px;border-radius:4px;margin-right:5px;cursor:pointer;font-size:12px;">
                        <i class="fas fa-key"></i>
                    </button>
                    <button onclick="deleteStaff('${staff.id}', '${staff.first_name}')" 
                            style="background:#ef4444;color:white;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;font-size:12px;">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

// ============================================
// TOGGLE STAFF LOGIN ACCESS
// ============================================
async function toggleStaffLogin(staffId, currentStatus) {
    try {
        const sb = getSb();
        if (!sb) throw new Error('Supabase client not available');
        
        const newStatus = !currentStatus;
        
        const { data, error } = await sb
            .from('staff_records')
            .update({
                login_enabled: newStatus,
                updated_at: new Date().toISOString()
            })
            .eq('id', staffId)
            .select();
        
        if (error) throw error;
        
        // Update UI without reload
        const row = document.querySelector(`[data-staff-id="${staffId}"]`);
        if (row) {
            const badge = row.querySelector('.login-status');
            if (badge) {
                badge.textContent = newStatus ? '✅ Enabled' : '❌ Disabled';
                badge.style.color = newStatus ? '#10b981' : '#ef4444';
            }
            
            const btn = row.querySelector('.toggle-login-btn');
            if (btn) {
                btn.textContent = newStatus ? '🔓 Disable' : '🔒 Enable';
                btn.style.background = newStatus ? '#f59e0b' : '#10b981';
                btn.onclick = function() { toggleStaffLogin(staffId, newStatus); };
            }
        }
        
        // Update staffRecords array
        const staffIndex = staffRecords.findIndex(s => s.id === staffId);
        if (staffIndex !== -1) {
            staffRecords[staffIndex].login_enabled = newStatus;
        }
        
        showNotification(`✅ Login ${newStatus ? 'enabled' : 'disabled'} successfully`, 'success');
        return true;
        
    } catch (error) {
        console.error('❌ Toggle login error:', error);
        showNotification('❌ Failed to toggle login: ' + error.message, 'error');
        return false;
    }
}

// ============================================
// OPEN ADD STAFF MODAL - FIXED
// ============================================
function openAddStaffModal() {
    console.log('🔧 Opening Add Staff Modal...');
    
    const modal = document.getElementById('addStaffModal');
    if (!modal) {
        console.error('❌ addStaffModal not found in HTML!');
        alert('Staff modal not found. Please check the HTML.');
        return;
    }
    
    document.getElementById('modalTitle').textContent = 'Register Staff';
    document.getElementById('editStaffId').value = '';
    
    // ✅ FIXED - Safe button update
    const submitBtn = document.querySelector('#staffForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Staff';
        submitBtn.onclick = saveStaff;
        submitBtn.disabled = false;
    }
    
    // Reset form fields
    document.getElementById('staffTitle').value = 'Mr.';
    document.getElementById('staffFirstName').value = '';
    document.getElementById('staffOtherNames').value = '';
    document.getElementById('staffEmail').value = '';
    document.getElementById('staffPhone').value = '';
    document.getElementById('staffNationalId').value = '';
    document.getElementById('staffGender').value = 'Male';
    document.getElementById('staffDepartment').value = 'Nursing';
    document.getElementById('staffProgram').value = 'KRCHN';
    document.getElementById('staffDesignation').value = '';
    document.getElementById('staffBankName').value = '';
    document.getElementById('staffBankAccount').value = '';
    document.getElementById('staffShifNumber').value = '';
    document.getElementById('staffNsrfNumber').value = '';
    document.getElementById('staffTaxPin').value = '';
    document.getElementById('staffGuardianPhone').value = '';
    document.getElementById('staffStatus').value = 'active';
    document.getElementById('staffEnableLogin').checked = true;
    document.getElementById('staffEnableLogin').disabled = false;
    
    document.getElementById('staffPassword').value = '';
    document.getElementById('staffConfirmPassword').value = '';
    
    const passwordSection = document.getElementById('staffPasswordSection');
    if (passwordSection) passwordSection.style.display = 'block';
    
    resetStaffDocuments();
    
    modal.style.display = 'flex';
    console.log('✅ Modal opened successfully');
}

// ============================================
// CLOSE MODAL
// ============================================
function closeAddStaffModal() {
    const modal = document.getElementById('addStaffModal');
    if (modal) modal.style.display = 'none';
}

// ============================================
// RESET STAFF DOCUMENTS
// ============================================
function resetStaffDocuments() {
    const docTypes = ['lecturer_id', 'kra_pin', 'university_cert', 'cv'];
    docTypes.forEach(docType => {
        staffUploadedDocs[docType] = null;
        const card = document.getElementById(`doc_${docType}`);
        const statusEl = document.getElementById(`doc_${docType}_status`);
        const filenameEl = document.getElementById(`doc_${docType}_filename`);
        const input = document.getElementById(`doc_${docType}_input`);
        
        if (card) card.classList.remove('uploaded');
        if (statusEl) {
            statusEl.textContent = 'Not uploaded';
            statusEl.className = 'doc-status';
        }
        if (filenameEl) filenameEl.textContent = '';
        if (input) input.value = '';
    });
}

// ============================================
// TOGGLE PASSWORD FIELD
// ============================================
function toggleStaffPasswordField() {
    const loginCheckbox = document.getElementById('staffEnableLogin');
    const passwordSection = document.getElementById('staffPasswordSection');
    
    if (loginCheckbox && passwordSection) {
        passwordSection.style.display = loginCheckbox.checked ? 'block' : 'none';
    }
}

// ============================================
// HANDLE STAFF DOCUMENT UPLOAD
// ============================================
function handleStaffDocumentUpload(event, docType) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
        alert(`❌ ${getStaffDocLabel(docType)} exceeds 5MB limit.`);
        event.target.value = '';
        return;
    }
    
    staffUploadedDocs[docType] = file;
    
    const card = document.getElementById(`doc_${docType}`);
    const statusEl = document.getElementById(`doc_${docType}_status`);
    const filenameEl = document.getElementById(`doc_${docType}_filename`);
    
    if (card) card.classList.add('uploaded');
    if (statusEl) {
        statusEl.textContent = '✅ Uploaded';
        statusEl.className = 'doc-status uploaded-text';
    }
    if (filenameEl) {
        filenameEl.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    }
    
    const progressEl = document.getElementById('staffDocUploadProgress');
    const progressBar = document.getElementById('staffDocProgressBar');
    if (progressEl) {
        progressEl.classList.add('active');
        if (progressBar) progressBar.style.width = '100%';
    }
    setTimeout(() => {
        if (progressEl) {
            progressEl.classList.remove('active');
            if (progressBar) progressBar.style.width = '0%';
        }
    }, 800);
    
    console.log(`✅ ${getStaffDocLabel(docType)} uploaded:`, file.name);
}

// ============================================
// REMOVE STAFF DOCUMENT
// ============================================
function removeStaffDocument(docType) {
    if (!confirm(`Remove ${getStaffDocLabel(docType)}?`)) return;
    
    staffUploadedDocs[docType] = null;
    const card = document.getElementById(`doc_${docType}`);
    const statusEl = document.getElementById(`doc_${docType}_status`);
    const filenameEl = document.getElementById(`doc_${docType}_filename`);
    const input = document.getElementById(`doc_${docType}_input`);
    
    if (card) card.classList.remove('uploaded');
    if (statusEl) {
        statusEl.textContent = 'Not uploaded';
        statusEl.className = 'doc-status';
    }
    if (filenameEl) filenameEl.textContent = '';
    if (input) input.value = '';
    
    console.log(`🗑️ ${getStaffDocLabel(docType)} removed`);
}

// ============================================
// VIEW STAFF DOCUMENTS
// ============================================
async function viewStaffDocuments(staffId) {
    console.log('📄 Viewing documents for:', staffId);
    
    try {
        const sb = getSb();
        if (!sb) throw new Error('Supabase client not available');
        
        const modal = document.getElementById('viewDocsModal');
        const content = document.getElementById('viewDocsContent');
        const title = document.getElementById('viewDocsTitle');
        
        if (!modal || !content) return;
        
        const staff = staffRecords.find(s => s.id === staffId);
        title.textContent = `📄 ${staff?.first_name || 'Staff'} Documents`;
        
        content.innerHTML = '<p style="color:#94a3b8; text-align:center;"><i class="fas fa-spinner fa-spin"></i> Loading documents...</p>';
        modal.style.display = 'flex';
        
        const { data, error } = await sb
            .from('user_documents')
            .select('*')
            .eq('user_id', staffId);
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            content.innerHTML = `
                <div style="text-align:center; padding:30px; color:#94a3b8;">
                    <i class="fas fa-folder-open" style="font-size:40px; display:block; margin-bottom:12px;"></i>
                    <p>No documents uploaded for this staff member.</p>
                    <p style="font-size:0.8rem;">Documents can be uploaded when editing the staff profile.</p>
                </div>
            `;
        } else {
            const docIcons = {
                'lecturer_id': '🪪',
                'kra_pin': '📄',
                'university_cert': '🎓',
                'cv': '📝'
            };
            
            const docLabels = {
                'lecturer_id': 'National ID / Passport',
                'kra_pin': 'KRA PIN Certificate',
                'university_cert': 'University Certificate',
                'cv': 'CV / Resume'
            };
            
            content.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:12px;">
                    ${data.map(doc => `
                        <div style="display:flex; align-items:center; gap:14px; padding:12px 16px; background:#f8fafc; border-radius:12px; border:1px solid #e2e8f0;">
                            <span style="font-size:24px;">${docIcons[doc.document_type] || '📄'}</span>
                            <div style="flex:1;">
                                <div style="font-weight:600; font-size:14px; color:#1e293b;">${docLabels[doc.document_type] || doc.document_type}</div>
                                <div style="font-size:12px; color:#64748B;">${doc.file_name || 'Document'}</div>
                                <div style="font-size:11px; color:#94a3b8;">Uploaded: ${new Date(doc.upload_date).toLocaleDateString()}</div>
                            </div>
                            <div>
                                <a href="${doc.file_path}" target="_blank" style="background:#4C1D95; color:white; border:none; padding:6px 14px; border-radius:8px; cursor:pointer; text-decoration:none; font-size:12px;">
                                    <i class="fas fa-download"></i> View
                                </a>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
    } catch (error) {
        console.error('❌ Error viewing documents:', error);
        const content = document.getElementById('viewDocsContent');
        if (content) {
            content.innerHTML = `
                <div style="text-align:center; padding:30px; color:#dc2626;">
                    <i class="fas fa-exclamation-circle" style="font-size:40px; display:block; margin-bottom:12px;"></i>
                    <p>Error loading documents: ${error.message}</p>
                </div>
            `;
        }
    }
}

// ============================================
// CLOSE VIEW DOCS MODAL
// ============================================
function closeViewDocsModal() {
    const modal = document.getElementById('viewDocsModal');
    if (modal) modal.style.display = 'none';
}

// ============================================
// SAVE STAFF - CREATE NEW - FIXED
// ============================================
async function saveStaff() {
    console.log('🔧 Saving new staff...');
    
    const loginEnabled = document.getElementById('staffEnableLogin').checked;
    const password = document.getElementById('staffPassword')?.value;
    const confirmPassword = document.getElementById('staffConfirmPassword')?.value;
    
    if (loginEnabled) {
        if (!password) {
            alert('Please enter a password');
            return;
        }
        if (password !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }
        if (password.length < 6) {
            alert('Password must be at least 6 characters');
            return;
        }
    }
    
    const staffData = {
        title: document.getElementById('staffTitle').value,
        first_name: document.getElementById('staffFirstName').value.trim(),
        other_names: document.getElementById('staffOtherNames').value.trim(),
        department: document.getElementById('staffDepartment').value,
        program: document.getElementById('staffProgram').value,
        designation: document.getElementById('staffDesignation').value || 'lecturer',
        email: document.getElementById('staffEmail').value.trim(),
        phone: document.getElementById('staffPhone').value.trim(),
        national_id: document.getElementById('staffNationalId').value.trim(),
        gender: document.getElementById('staffGender').value,
        bank_name: document.getElementById('staffBankName').value.trim(),
        bank_account: document.getElementById('staffBankAccount').value.trim(),
        shif_number: document.getElementById('staffShifNumber').value.trim(),
        nsrf_number: document.getElementById('staffNsrfNumber').value.trim(),
        tax_pin: document.getElementById('staffTaxPin').value.trim(),
        guardian_phone: document.getElementById('staffGuardianPhone').value.trim(),
        login_enabled: loginEnabled,
        status: document.getElementById('staffStatus').value || 'active'
    };
    
    if (!staffData.first_name || !staffData.department || !staffData.email || !staffData.phone) {
        alert('Please fill all required fields (First Name, Department, Email, Phone)');
        return;
    }
    
    try {
        const sb = getSb();
        if (!sb) throw new Error('Supabase client not available');
        
        // ✅ FIXED - Safe button update
        const submitBtn = document.querySelector('#staffForm button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            submitBtn.disabled = true;
        }
        
        const { data: existing, error: checkError } = await sb
            .from('staff_records')
            .select('id, email')
            .eq('email', staffData.email)
            .maybeSingle();
        
        if (checkError && checkError.code !== 'PGRST116') {
            throw checkError;
        }
        
        let staffId;
        
        if (existing) {
            console.log('⚠️ Staff with email already exists. Updating instead...');
            staffId = existing.id;
            if (password) {
                staffData.password_hash = btoa(password);
            }
            staffData.updated_at = new Date().toISOString();
            
            const { error: updateError } = await sb
                .from('staff_records')
                .update(staffData)
                .eq('id', existing.id);
            
            if (updateError) throw updateError;
            showNotification(`✅ Staff ${staffData.first_name} updated successfully!`, 'success');
            
        } else {
            const deptCodes = {
                'Nursing': 'NUR',
                'TVET': 'TVT',
                'Community Health': 'COM',
                'Health Records': 'HRT',
                'ICT': 'ICT',
                'Administration': 'ADM',
                'Front Desk': 'FRT',
                'Library': 'LIB',
                'Clinical': 'CLN'
            };
            
            const deptCode = deptCodes[staffData.department] || 'STA';
            
            const { data: deptStaff } = await sb
                .from('staff_records')
                .select('id')
                .ilike('id', 'NCHSM' + deptCode + '-%')
                .order('created_at', { ascending: false });
            
            let nextNumber = 1;
            if (deptStaff && deptStaff.length > 0) {
                const lastId = deptStaff[0].id;
                const match = lastId.match(new RegExp('NCHSM' + deptCode + '-(\\d+)'));
                if (match) {
                    nextNumber = parseInt(match[1]) + 1;
                } else {
                    nextNumber = deptStaff.length + 1;
                }
            }
            
            staffId = 'NCHSM' + deptCode + '-' + String(nextNumber).padStart(3, '0');
            staffData.id = staffId;
            
            if (password) {
                staffData.password_hash = btoa(password);
            }
            staffData.created_at = new Date().toISOString();
            staffData.updated_at = new Date().toISOString();
            
            const { error: insertError } = await sb
                .from('staff_records')
                .insert([staffData]);
            
            if (insertError) throw insertError;
            
            showNotification(`✅ Staff ${staffData.first_name} registered! ID: ${staffId}`, 'success');
        }
        
        // Sync with consolidated profile
        try {
            const fullName = `${staffData.title || ''} ${staffData.first_name} ${staffData.other_names || ''}`.trim();
            
            const { data: existingCons } = await sb
                .from('consolidated_user_profiles_table')
                .select('user_id')
                .eq('email', staffData.email)
                .maybeSingle();
            
            if (existingCons) {
                await sb
                    .from('consolidated_user_profiles_table')
                    .update({
                        full_name: fullName,
                        phone: staffData.phone,
                        department: staffData.department,
                        program: staffData.program,
                        role: 'lecturer',
                        staff_id: staffId,
                        status: staffData.status || 'active',
                        gender: staffData.gender || '',
                        updated_at: new Date().toISOString()
                    })
                    .eq('email', staffData.email);
                console.log('✅ Consolidated profile updated');
            } else {
                await sb
                    .from('consolidated_user_profiles_table')
                    .insert({
                        email: staffData.email,
                        full_name: fullName,
                        phone: staffData.phone,
                        department: staffData.department,
                        program: staffData.program,
                        role: 'lecturer',
                        staff_id: staffId,
                        status: staffData.status || 'active',
                        gender: staffData.gender || '',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });
                console.log('✅ Consolidated profile created');
            }
        } catch (e) {
            console.warn('⚠️ Error with consolidated profile:', e);
        }
        
        // Upload documents
        const docTypes = ['lecturer_id', 'kra_pin', 'university_cert', 'cv'];
        let docsUploaded = 0;
        
        for (const docType of docTypes) {
            if (staffUploadedDocs[docType]) {
                const file = staffUploadedDocs[docType];
                const ext = file.name.split('.').pop();
                const docPath = `documents/${staffId}/${docType}.${ext}`;
                
                try {
                    const { error: uploadError } = await sb.storage
                        .from('user-documents')
                        .upload(docPath, file, { upsert: true });
                    
                    if (!uploadError) {
                        await sb.from('user_documents').insert({
                            user_id: staffId,
                            document_type: docType,
                            file_path: docPath,
                            file_name: file.name,
                            upload_date: new Date().toISOString()
                        });
                        docsUploaded++;
                        console.log(`✅ ${docType} document uploaded`);
                    }
                } catch (err) {
                    console.warn(`⚠️ Error uploading ${docType}:`, err);
                }
            }
        }
        
        if (docsUploaded > 0) {
            console.log(`📁 ${docsUploaded} documents uploaded`);
        }
        
        closeAddStaffModal();
        loadAllStaff();
        resetStaffDocuments();
        
    } catch (error) {
        console.error('❌ Save error:', error);
        alert(`❌ Error: ${error.message}`);
    } finally {
        // ✅ FIXED - Safe button reset
        const submitBtn = document.querySelector('#staffForm button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Staff';
            submitBtn.disabled = false;
        }
    }
}

// ============================================
// EDIT STAFF - FIXED
// ============================================
async function editStaff(staffId) {
    console.log('✏️ Editing staff:', staffId);
    
    const staff = staffRecords.find(s => s.id === staffId);
    if (!staff) {
        alert('Staff record not found');
        return;
    }
    
    const modal = document.getElementById('addStaffModal');
    if (!modal) {
        alert('Modal not found');
        return;
    }
    
    document.getElementById('modalTitle').textContent = `✏️ Edit Staff: ${staff.first_name}`;
    document.getElementById('editStaffId').value = staff.id;
    
    // ✅ FIXED - Safe button update
    const submitBtn = document.querySelector('#staffForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Staff';
        submitBtn.onclick = updateStaff;
        submitBtn.disabled = false;
    }
    
    // Populate form fields
    document.getElementById('staffTitle').value = staff.title || 'Mr.';
    document.getElementById('staffFirstName').value = staff.first_name || '';
    document.getElementById('staffOtherNames').value = staff.other_names || '';
    document.getElementById('staffDepartment').value = staff.department || 'Nursing';
    document.getElementById('staffProgram').value = staff.program || 'KRCHN';
    document.getElementById('staffDesignation').value = staff.designation || '';
    document.getElementById('staffEmail').value = staff.email || '';
    document.getElementById('staffPhone').value = staff.phone || '';
    document.getElementById('staffNationalId').value = staff.national_id || '';
    document.getElementById('staffGender').value = staff.gender || 'Male';
    document.getElementById('staffBankName').value = staff.bank_name || '';
    document.getElementById('staffBankAccount').value = staff.bank_account || '';
    document.getElementById('staffShifNumber').value = staff.shif_number || '';
    document.getElementById('staffNsrfNumber').value = staff.nsrf_number || '';
    document.getElementById('staffTaxPin').value = staff.tax_pin || '';
    document.getElementById('staffGuardianPhone').value = staff.guardian_phone || '';
    document.getElementById('staffStatus').value = staff.status || 'active';
    document.getElementById('staffEnableLogin').checked = staff.login_enabled || false;
    
    const staffIdDisplay = document.getElementById('staffIdDisplay');
    if (staffIdDisplay) {
        staffIdDisplay.value = staff.id;
        staffIdDisplay.style.color = '#0b1120';
        staffIdDisplay.style.fontWeight = '600';
    }
    
    const passwordSection = document.getElementById('staffPasswordSection');
    if (passwordSection) {
        passwordSection.style.display = 'none';
    }
    
    const loginCheckbox = document.getElementById('staffEnableLogin');
    if (loginCheckbox) {
        loginCheckbox.disabled = true;
    }
    
    resetStaffDocuments();
    
    try {
        const sb = getSb();
        if (sb) {
            const { data: docs } = await sb
                .from('user_documents')
                .select('document_type, file_name')
                .eq('user_id', staffId);
            
            if (docs && docs.length > 0) {
                docs.forEach(doc => {
                    const docType = doc.document_type;
                    const card = document.getElementById(`doc_${docType}`);
                    const statusEl = document.getElementById(`doc_${docType}_status`);
                    const filenameEl = document.getElementById(`doc_${docType}_filename`);
                    
                    if (card) card.classList.add('uploaded');
                    if (statusEl) {
                        statusEl.textContent = '✅ Existing';
                        statusEl.className = 'doc-status uploaded-text';
                    }
                    if (filenameEl) {
                        filenameEl.textContent = doc.file_name || 'Previously uploaded';
                    }
                });
            }
        }
    } catch (e) {
        console.warn('Could not load existing documents:', e);
    }
    
    modal.style.display = 'flex';
    console.log('✅ Staff data loaded for editing:', staff.first_name);
}

// ============================================
// UPDATE STAFF - FIXED
// ============================================
async function updateStaff() {
    console.log('🔄 Updating staff...');
    
    const staffId = document.getElementById('editStaffId').value;
    if (!staffId) {
        alert('Staff ID not found');
        return;
    }
    
    const staffData = {
        title: document.getElementById('staffTitle').value,
        first_name: document.getElementById('staffFirstName').value.trim(),
        other_names: document.getElementById('staffOtherNames').value.trim(),
        department: document.getElementById('staffDepartment').value,
        program: document.getElementById('staffProgram').value,
        designation: document.getElementById('staffDesignation').value.trim() || 'lecturer',
        email: document.getElementById('staffEmail').value.trim(),
        phone: document.getElementById('staffPhone').value.trim(),
        national_id: document.getElementById('staffNationalId').value.trim(),
        gender: document.getElementById('staffGender').value,
        bank_name: document.getElementById('staffBankName').value.trim(),
        bank_account: document.getElementById('staffBankAccount').value.trim(),
        shif_number: document.getElementById('staffShifNumber').value.trim(),
        nsrf_number: document.getElementById('staffNsrfNumber').value.trim(),
        tax_pin: document.getElementById('staffTaxPin').value.trim(),
        guardian_phone: document.getElementById('staffGuardianPhone').value.trim(),
        status: document.getElementById('staffStatus').value || 'active',
        updated_at: new Date().toISOString()
    };
    
    if (!staffData.first_name) {
        alert('First Name is required');
        return;
    }
    if (!staffData.department) {
        alert('Department is required');
        return;
    }
    if (!staffData.email) {
        alert('Email is required');
        return;
    }
    if (!staffData.phone) {
        alert('Phone is required');
        return;
    }
    
    try {
        const sb = getSb();
        if (!sb) throw new Error('Supabase client not available');
        
        // ✅ FIXED - Safe button update
        const submitBtn = document.querySelector('#staffForm button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
            submitBtn.disabled = true;
        }
        
        const { error: staffError } = await sb
            .from('staff_records')
            .update(staffData)
            .eq('id', staffId);
        
        if (staffError) throw staffError;
        console.log('✅ staff_records updated');
        
        // Update consolidated profile
        try {
            const fullName = `${staffData.title || ''} ${staffData.first_name} ${staffData.other_names || ''}`.trim();
            
            const { error: consError } = await sb
                .from('consolidated_user_profiles_table')
                .update({
                    full_name: fullName,
                    email: staffData.email,
                    phone: staffData.phone,
                    department: staffData.department,
                    program: staffData.program,
                    gender: staffData.gender,
                    status: staffData.status,
                    updated_at: new Date().toISOString()
                })
                .eq('staff_id', staffId);
            
            if (consError) {
                await sb
                    .from('consolidated_user_profiles_table')
                    .update({
                        full_name: fullName,
                        phone: staffData.phone,
                        department: staffData.department,
                        program: staffData.program,
                        gender: staffData.gender,
                        status: staffData.status,
                        updated_at: new Date().toISOString()
                    })
                    .eq('email', staffData.email);
            }
            console.log('✅ consolidated_user_profiles_table updated');
        } catch (e) {
            console.warn('⚠️ Error updating consolidated profile:', e);
        }
        
        // Upload new documents
        const docTypes = ['lecturer_id', 'kra_pin', 'university_cert', 'cv'];
        let docsUploaded = 0;
        
        for (const docType of docTypes) {
            if (staffUploadedDocs[docType]) {
                const file = staffUploadedDocs[docType];
                const ext = file.name.split('.').pop();
                const docPath = `documents/${staffId}/${docType}.${ext}`;
                
                try {
                    const { data: existingDoc } = await sb
                        .from('user_documents')
                        .select('id')
                        .eq('user_id', staffId)
                        .eq('document_type', docType)
                        .maybeSingle();
                    
                    if (existingDoc) {
                        await sb
                            .from('user_documents')
                            .update({
                                file_path: docPath,
                                file_name: file.name,
                                upload_date: new Date().toISOString()
                            })
                            .eq('id', existingDoc.id);
                    } else {
                        await sb.from('user_documents').insert({
                            user_id: staffId,
                            document_type: docType,
                            file_path: docPath,
                            file_name: file.name,
                            upload_date: new Date().toISOString()
                        });
                    }
                    
                    const { error: uploadError } = await sb.storage
                        .from('user-documents')
                        .upload(docPath, file, { upsert: true });
                    
                    if (!uploadError) {
                        docsUploaded++;
                        console.log(`✅ ${docType} document uploaded/updated`);
                    }
                } catch (err) {
                    console.warn(`⚠️ Error uploading ${docType}:`, err);
                }
            }
        }
        
        if (docsUploaded > 0) {
            console.log(`📁 ${docsUploaded} documents uploaded/updated`);
        }
        
        showNotification(`✅ Staff ${staffData.first_name} updated successfully!`, 'success');
        
        closeAddStaffModal();
        loadAllStaff();
        resetStaffDocuments();
        
        // Reset modal to add mode
        document.getElementById('modalTitle').textContent = 'Register Staff';
        const resetBtn = document.querySelector('#staffForm button[type="submit"]');
        if (resetBtn) {
            resetBtn.innerHTML = '<i class="fas fa-save"></i> Save Staff';
            resetBtn.onclick = saveStaff;
            resetBtn.disabled = false;
        }
        document.getElementById('editStaffId').value = '';
        const loginCheckbox = document.getElementById('staffEnableLogin');
        if (loginCheckbox) loginCheckbox.disabled = false;
        
        const staffIdDisplay = document.getElementById('staffIdDisplay');
        if (staffIdDisplay) {
            staffIdDisplay.value = 'Auto-generated on save';
            staffIdDisplay.style.color = '#6b7280';
            staffIdDisplay.style.fontWeight = 'normal';
        }
        
    } catch (error) {
        console.error('❌ Update error:', error);
        alert(`❌ Error updating staff: ${error.message}`);
        
        const submitBtn = document.querySelector('#staffForm button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Staff';
            submitBtn.disabled = false;
        }
    }
}

// ============================================
// RESET STAFF PASSWORD
// ============================================
async function resetStaffPassword(staffId, staffName) {
    const newPassword = prompt(`Reset password for ${staffName}\n\nEnter new password (min 6 chars):`);
    if (!newPassword || newPassword.length < 6) {
        if (newPassword) alert('Password must be at least 6 characters');
        return;
    }
    
    const confirmPwd = prompt('Confirm new password:');
    if (newPassword !== confirmPwd) {
        alert('Passwords do not match');
        return;
    }
    
    try {
        const sb = getSb();
        if (!sb) throw new Error('Supabase client not available');
        
        const { error } = await sb
            .from('staff_records')
            .update({ 
                password_hash: btoa(newPassword),
                login_enabled: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', staffId);
        
        if (error) throw error;
        
        showNotification(`✅ Password for ${staffName} reset successfully!`, 'success');
        loadAllStaff();
        
    } catch (error) {
        alert(`❌ Error: ${error.message}`);
    }
}

// ============================================
// DELETE STAFF
// ============================================
async function deleteStaff(staffId, staffName) {
    if (!confirm(`⚠️ Delete staff "${staffName}"? This cannot be undone.`)) return;
    
    try {
        const sb = getSb();
        if (!sb) throw new Error('Supabase client not available');
        
        const { error } = await sb
            .from('staff_records')
            .delete()
            .eq('id', staffId);
        
        if (error) throw error;
        
        showNotification(`✅ Staff ${staffName} deleted!`, 'success');
        loadAllStaff();
        
    } catch (error) {
        alert(`❌ Error: ${error.message}`);
    }
}

// ============================================
// QUICK DEPARTMENT EDIT
// ============================================
async function quickEditDepartment(staffId) {
    const staff = staffRecords.find(s => s.id === staffId);
    if (!staff) {
        alert('Staff record not found');
        return;
    }
    
    const currentDept = staff.department || 'Not Set';
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100000;
    `;
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 16px; padding: 32px; max-width: 400px; width: 90%;">
            <h3 style="margin-top: 0; color: #1e293b;">Change Department</h3>
            <p style="color: #64748b; margin-bottom: 16px;">
                Current: <strong>${currentDept}</strong>
            </p>
            <select id="quickDeptSelect" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 14px; margin-bottom: 16px;">
                ${STAFF_DEPARTMENTS.map(d => `<option value="${d}" ${d === currentDept ? 'selected' : ''}>${d}</option>`).join('')}
            </select>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button onclick="this.closest('div[style]').remove()" style="padding: 8px 20px; border: none; background: #e2e8f0; border-radius: 8px; cursor: pointer;">Cancel</button>
                <button id="quickDeptConfirm" style="padding: 8px 20px; border: none; background: #4C1D95; color: white; border-radius: 8px; cursor: pointer;">Update</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('quickDeptConfirm').onclick = async function() {
        const newDept = document.getElementById('quickDeptSelect').value;
        if (newDept === currentDept) {
            alert('Department unchanged');
            modal.remove();
            return;
        }
        
        try {
            const sb = getSb();
            if (!sb) throw new Error('Supabase client not available');
            
            const { error } = await sb
                .from('staff_records')
                .update({ 
                    department: newDept,
                    updated_at: new Date().toISOString()
                })
                .eq('id', staffId);
            
            if (error) throw error;
            
            showNotification(`✅ Department updated to: ${newDept}`, 'success');
            modal.remove();
            loadAllStaff();
            
        } catch (error) {
            console.error('❌ Department update error:', error);
            alert(`❌ Error: ${error.message}`);
        }
    };
    
    modal.addEventListener('click', function(e) {
        if (e.target === this) this.remove();
    });
}

// ============================================
// FILTER STAFF
// ============================================
function filterStaffTable() {
    renderStaffTable();
}

// ============================================
// EXPORT TO CSV
// ============================================
function exportStaffToCSV() {
    const headers = ['Staff ID', 'Title', 'First Name', 'Other Names', 'Department', 'Program', 'Designation', 'Email', 'Phone', 'National ID', 'Gender', 'Bank Name', 'Bank Account', 'SHIF', 'NSRF', 'Tax PIN', 'Guardian Phone', 'Login Enabled', 'Status'];
    
    const rows = staffRecords.map(s => [
        s.id, s.title || '', s.first_name, s.other_names || '', s.department, s.program || 'KRCHN', s.designation || '',
        s.email, s.phone, s.national_id || '', s.gender || '', s.bank_name || '', s.bank_account || '',
        s.shif_number || '', s.nsrf_number || '', s.tax_pin || '', s.guardian_phone || '', s.login_enabled ? 'Yes' : 'No', s.status || 'active'
    ]);
    
    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `staff_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
}

// ============================================
// IMPORT STAFF FROM CSV
// ============================================
function importStaffFromCSV() {
    console.log('🔧 Import Staff from CSV...');
    
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.csv';
    fileInput.style.display = 'none';
    
    fileInput.onchange = async function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const text = e.target.result;
                const lines = text.split('\n');
                
                const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
                const required = ['first_name', 'email', 'phone', 'department', 'program'];
                const missing = required.filter(f => !headers.includes(f));
                
                if (missing.length > 0) {
                    alert(`❌ CSV must contain: ${required.join(', ')}\nMissing: ${missing.join(', ')}`);
                    return;
                }
                
                let imported = 0;
                let errors = [];
                let skipped = 0;
                let updated = 0;
                
                const sb = getSb();
                if (!sb) {
                    alert('Supabase client not available');
                    return;
                }
                
                for (let i = 1; i < lines.length; i++) {
                    if (!lines[i].trim()) continue;
                    
                    const values = lines[i].split(',').map(v => v.trim());
                    const row = {};
                    headers.forEach((h, idx) => {
                        row[h] = values[idx] || '';
                    });
                    
                    if (!row.first_name && !row.email) {
                        skipped++;
                        continue;
                    }
                    
                    const staffData = {
                        title: row.title || '',
                        first_name: row.first_name || '',
                        other_names: row.other_names || '',
                        department: row.department || '',
                        program: row.program || 'KRCHN',
                        designation: row.designation || '',
                        email: row.email || '',
                        phone: row.phone || '',
                        national_id: row.national_id || '',
                        gender: row.gender || '',
                        bank_name: row.bank_name || '',
                        bank_account: row.bank_account || '',
                        shif_number: row.shif_number || '',
                        nsrf_number: row.nsrf_number || '',
                        tax_pin: row.tax_pin || '',
                        guardian_phone: row.guardian_phone || '',
                        login_enabled: row.login_enabled === 'true' || row.login_enabled === 'TRUE' || false,
                        status: row.status || 'active',
                        updated_at: new Date().toISOString()
                    };
                    
                    try {
                        const { data: existing } = await sb
                            .from('staff_records')
                            .select('id')
                            .eq('email', staffData.email)
                            .maybeSingle();
                        
                        if (existing) {
                            const { error } = await sb
                                .from('staff_records')
                                .update(staffData)
                                .eq('id', existing.id);
                            if (error) throw error;
                            updated++;
                        } else {
                            const deptCodes = {
                                'Nursing': 'NUR',
                                'TVET': 'TVT',
                                'Community Health': 'COM',
                                'Health Records': 'HRT',
                                'ICT': 'ICT',
                                'Administration': 'ADM',
                                'Front Desk': 'FRT',
                                'Library': 'LIB',
                                'Clinical': 'CLN'
                            };
                            const deptCode = deptCodes[staffData.department] || 'STA';
                            
                            const { data: deptStaff } = await sb
                                .from('staff_records')
                                .select('id')
                                .ilike('id', 'NCHSM' + deptCode + '-%')
                                .order('created_at', { ascending: false });
                            
                            let nextNumber = 1;
                            if (deptStaff && deptStaff.length > 0) {
                                const lastId = deptStaff[0].id;
                                const match = lastId.match(new RegExp('NCHSM' + deptCode + '-(\\d+)'));
                                if (match) {
                                    nextNumber = parseInt(match[1]) + 1;
                                } else {
                                    nextNumber = deptStaff.length + 1;
                                }
                            }
                            
                            staffData.id = 'NCHSM' + deptCode + '-' + String(nextNumber).padStart(3, '0');
                            staffData.created_at = new Date().toISOString();
                            
                            const { error } = await sb.from('staff_records').insert([staffData]);
                            if (error) throw error;
                            imported++;
                        }
                    } catch (err) {
                        errors.push(`${staffData.first_name}: ${err.message}`);
                    }
                }
                
                let message = `✅ Import complete!\n\n`;
                message += `📥 Imported: ${imported} new staff\n`;
                message += `🔄 Updated: ${updated} existing staff\n`;
                if (skipped > 0) message += `⏭️ Skipped: ${skipped} empty rows\n`;
                if (errors.length > 0) {
                    message += `❌ Errors: ${errors.length}\n\n`;
                    message += `Errors:\n${errors.slice(0, 10).join('\n')}`;
                    if (errors.length > 10) message += `\n... and ${errors.length - 10} more`;
                }
                
                alert(message);
                loadAllStaff();
                
            } catch (error) {
                alert('❌ Error importing CSV: ' + error.message);
                console.error('Import error:', error);
            }
        };
        reader.readAsText(file);
    };
    
    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
}

// ============================================
// STAFF LOGIN FUNCTION
// ============================================
async function staffLogin(emailOrId, password) {
    try {
        const sb = getSb();
        if (!sb) return { success: false, message: 'Supabase not available' };
        
        const { data, error } = await sb
            .from('staff_records')
            .select('*')
            .or(`email.eq.${emailOrId},id.eq.${emailOrId}`)
            .eq('login_enabled', true)
            .eq('status', 'active')
            .single();
        
        if (error || !data) {
            return { success: false, message: 'Invalid credentials' };
        }
        
        if (data.password_hash) {
            try {
                const storedPassword = atob(data.password_hash);
                if (storedPassword !== password) {
                    return { success: false, message: 'Invalid password' };
                }
            } catch (e) {
                return { success: false, message: 'Password format error' };
            }
        } else {
            return { success: false, message: 'No password set. Please contact admin.' };
        }
        
        const session = {
            staffId: data.id,
            name: `${data.title || ''} ${data.first_name} ${data.other_names || ''}`.trim(),
            email: data.email,
            department: data.department,
            program: data.program || 'KRCHN',
            role: 'staff'
        };
        
        localStorage.setItem('staffSession', JSON.stringify(session));
        return { success: true, staff: session };
        
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, message: error.message };
    }
}

// ============================================
// STAFF LOGOUT
// ============================================
function staffLogout() {
    localStorage.removeItem('staffSession');
    showNotification('👋 Logged out successfully', 'info');
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 500);
}

// ============================================
// CHECK STAFF SESSION
// ============================================
function checkStaffSession() {
    try {
        const session = localStorage.getItem('staffSession');
        if (session) {
            return JSON.parse(session);
        }
        return null;
    } catch (e) {
        return null;
    }
}

// ============================================
// GET CURRENT STAFF
// ============================================
function getCurrentStaff() {
    return checkStaffSession();
}

// ============================================
// INITIALIZE STAFF MANAGEMENT
// ============================================
function initStaffManagement() {
    console.log('🚀 Initializing Staff Management...');
    
    loadAllStaff();
    
    const searchInput = document.getElementById('staffSearchInput');
    if (searchInput) searchInput.addEventListener('keyup', filterStaffTable);
    
    const deptFilter = document.getElementById('departmentFilter');
    if (deptFilter) deptFilter.addEventListener('change', filterStaffTable);
    
    const programFilter = document.getElementById('programFilter');
    if (programFilter) programFilter.addEventListener('change', filterStaffTable);
    
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) statusFilter.addEventListener('change', filterStaffTable);
    
    const loginCheckbox = document.getElementById('staffEnableLogin');
    if (loginCheckbox) loginCheckbox.addEventListener('change', toggleStaffPasswordField);
    
    const addModal = document.getElementById('addStaffModal');
    if (addModal) {
        addModal.addEventListener('click', function(e) {
            if (e.target === this) closeAddStaffModal();
        });
    }
    
    const viewModal = document.getElementById('viewDocsModal');
    if (viewModal) {
        viewModal.addEventListener('click', function(e) {
            if (e.target === this) closeViewDocsModal();
        });
    }
    
    console.log('✅ Staff Management initialized');
}

// ============================================
// MAKE FUNCTIONS GLOBAL
// ============================================
window.loadAllStaff = loadAllStaff;
window.openAddStaffModal = openAddStaffModal;
window.closeAddStaffModal = closeAddStaffModal;
window.saveStaff = saveStaff;
window.editStaff = editStaff;
window.updateStaff = updateStaff;
window.resetStaffPassword = resetStaffPassword;
window.deleteStaff = deleteStaff;
window.filterStaffTable = filterStaffTable;
window.exportStaffToCSV = exportStaffToCSV;
window.importStaffFromCSV = importStaffFromCSV;
window.initStaffManagement = initStaffManagement;
window.toggleStaffPasswordField = toggleStaffPasswordField;
window.toggleStaffLogin = toggleStaffLogin;
window.staffLogin = staffLogin;
window.staffLogout = staffLogout;
window.checkStaffSession = checkStaffSession;
window.getCurrentStaff = getCurrentStaff;
window.quickEditDepartment = quickEditDepartment;
window.handleStaffDocumentUpload = handleStaffDocumentUpload;
window.removeStaffDocument = removeStaffDocument;
window.viewStaffDocuments = viewStaffDocuments;
window.closeViewDocsModal = closeViewDocsModal;
window.showNotification = showNotification;
window.getSb = getSb;

console.log('✅ Staff Management module fully loaded with all functions');
