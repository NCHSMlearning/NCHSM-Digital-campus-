// ============================================================
// ENROLLMENT MODULE - Change of Program & Readmission
// STUDENT DASHBOARD VERSION
// ============================================================

// ============================================================
// STATE
// ============================================================
const ENR_STATE = {
    requests: [],
    history: [],
    currentStudentId: null,
    currentStudentProgram: null,
    currentStudentName: null,
    stats: {
        total: 0,
        pending: 0,
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
// INITIALIZATION
// ============================================================
function initEnrollment() {
    console.log('📋 Enrollment Module initialized');
    
    const sb = getSupabaseClient();
    if (!sb) {
        console.error('❌ Supabase client not available');
        if (typeof showNotification === 'function') {
            showNotification('Supabase client not available', 'error');
        }
        return;
    }
    
    loadStudentInfo();
    loadEnrollmentRequests();
    loadEnrollmentHistory();
    updateEnrollmentStats();
    setupEnrollmentEventListeners();
}

// ============================================================
// LOAD STUDENT INFO
// ============================================================
function loadStudentInfo() {
    try {
        // Get current user from session
        let user = null;
        if (window.currentUserProfile) {
            user = window.currentUserProfile;
        } else if (window.db && window.db.currentUserProfile) {
            user = window.db.currentUserProfile;
        } else if (window.currentUser) {
            user = window.currentUser;
        }
        
        if (user) {
            ENR_STATE.currentStudentId = user.student_id || user.id || user.user_id;
            ENR_STATE.currentStudentProgram = user.program || 'N/A';
            ENR_STATE.currentStudentName = user.full_name || user.name || 'Student';
            
            // Update UI
            document.getElementById('enrollmentStudentName').textContent = ENR_STATE.currentStudentName;
            document.getElementById('enrollmentStudentId').textContent = ENR_STATE.currentStudentId || 'N/A';
            document.getElementById('enrollmentProgram').textContent = ENR_STATE.currentStudentProgram;
            
            // Auto-populate current program in new request form
            const currentDisplay = document.getElementById('enrCurrentProgramDisplay');
            if (currentDisplay) {
                currentDisplay.value = ENR_STATE.currentStudentProgram;
            }
            const previousDisplay = document.getElementById('enrPreviousProgramDisplay');
            if (previousDisplay) {
                previousDisplay.value = ENR_STATE.currentStudentProgram;
            }
        } else {
            console.warn('⚠️ User not found');
            document.getElementById('enrollmentStudentName').textContent = 'Student';
            document.getElementById('enrollmentStudentId').textContent = 'N/A';
            document.getElementById('enrollmentProgram').textContent = 'N/A';
        }
    } catch (error) {
        console.error('Error loading student info:', error);
    }
}

// ============================================================
// LOAD ENROLLMENT REQUESTS
// ============================================================
async function loadEnrollmentRequests() {
    const sb = getSupabaseClient();
    if (!sb) {
        console.error('❌ Supabase client not available');
        return;
    }
    
    try {
        const studentId = ENR_STATE.currentStudentId;
        if (!studentId) {
            console.warn('⚠️ No student ID found');
            return;
        }
        
        const search = document.getElementById('enrSearch')?.value?.toLowerCase() || '';
        const status = document.getElementById('enrStatusFilter')?.value || 'all';
        const type = document.getElementById('enrTypeFilter')?.value || 'all';
        
        let query = sb
            .from('student_requests')
            .select('*')
            .eq('student_id', studentId)
            .order('created_at', { ascending: false });
        
        if (status !== 'all') {
            query = query.eq('status', status);
        }
        if (type !== 'all') {
            query = query.eq('request_type', type);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        // Apply search filter
        let filtered = data || [];
        if (search) {
            filtered = filtered.filter(r => 
                (r.requested_program || '').toLowerCase().includes(search) ||
                (r.current_program || '').toLowerCase().includes(search) ||
                (r.previous_program || '').toLowerCase().includes(search)
            );
        }
        
        ENR_STATE.requests = filtered;
        renderEnrollmentRequestsTable();
        updateEnrollmentStats();
        updateEnrollmentBadges();
        
    } catch (error) {
        console.error('Error loading enrollment requests:', error);
        const tbody = document.getElementById('enrRequestsBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr><td colspan="5" style="padding: 30px; text-align: center; color: #dc2626;">
                    <i class="fas fa-exclamation-circle" style="font-size: 20px; display: block; margin-bottom: 8px;"></i>
                    Error loading requests: ${error.message}
                </td></tr>
            `;
        }
        if (typeof showNotification === 'function') {
            showNotification('Error loading enrollment requests', 'error');
        }
    }
}

// ============================================================
// RENDER ENROLLMENT REQUESTS TABLE
// ============================================================
function renderEnrollmentRequestsTable() {
    const tbody = document.getElementById('enrRequestsBody');
    if (!tbody) return;
    
    const requests = ENR_STATE.requests;
    
    if (!requests || requests.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="5" style="padding: 40px; text-align: center; color: #94a3b8;">
                <i class="fas fa-inbox" style="font-size: 28px; display: block; margin-bottom: 10px; color: #d1d5db;"></i>
                <p style="margin: 0;">No enrollment requests found</p>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #cbd5e1;">Submit a new request using the "New Request" tab</p>
            </td></tr>
        `;
        return;
    }
    
    let html = '';
    requests.forEach((r, index) => {
        const requestType = r.request_type === 'change_program' ? 'Change of Program' : 'Readmission';
        const typeIcon = r.request_type === 'change_program' ? 'fa-exchange-alt' : 'fa-undo-alt';
        const typeColor = r.request_type === 'change_program' ? '#4C1D95' : '#059669';
        
        const statusClass = r.status || 'pending';
        const statusLabel = statusClass.charAt(0).toUpperCase() + statusClass.slice(1);
        const statusColors = {
            pending: { bg: '#fef3c7', color: '#92400e' },
            approved: { bg: '#d1fae5', color: '#065f46' },
            rejected: { bg: '#fee2e2', color: '#991b1b' },
            processing: { bg: '#dbeafe', color: '#1e40af' }
        };
        const statusStyle = statusColors[statusClass] || statusColors.pending;
        
        const date = r.created_at ? new Date(r.created_at).toLocaleDateString() : 'N/A';
        const time = r.created_at ? new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        
        const fromProgram = r.current_program || r.previous_program || 'N/A';
        const toProgram = r.requested_program || 'N/A';
        
        html += `
            <tr style="border-bottom: 1px solid #f1f5f9; ${index % 2 === 0 ? 'background: #fafafa;' : ''}">
                <td style="padding: 10px 14px;">
                    <span style="display: flex; align-items: center; gap: 6px;">
                        <i class="fas ${typeIcon}" style="color: ${typeColor}; font-size: 14px;"></i>
                        <span style="font-weight: 500; font-size: 13px;">${escapeHtml(requestType)}</span>
                    </span>
                </td>
                <td style="padding: 10px 14px; font-size: 13px;">
                    <span style="color: #6b7280;">${escapeHtml(fromProgram)}</span>
                    <i class="fas fa-arrow-right" style="color: #94a3b8; margin: 0 6px; font-size: 11px;"></i>
                    <span style="font-weight: 500; color: #0A3D62;">${escapeHtml(toProgram)}</span>
                </td>
                <td style="padding: 10px 14px; text-align: center; font-size: 12px; color: #64748b;">
                    ${date}<br><span style="font-size: 10px; color: #94a3b8;">${time}</span>
                </td>
                <td style="padding: 10px 14px; text-align: center;">
                    <span style="background: ${statusStyle.bg}; color: ${statusStyle.color}; padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 600; display: inline-block;">
                        ${statusLabel}
                    </span>
                </td>
                <td style="padding: 10px 14px; text-align: center;">
                    <button onclick="viewEnrollmentRequest('${r.id}')" 
                            style="padding: 4px 14px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; transition: all 0.2s;"
                            onmouseover="this.style.background='#2563eb'; this.style.transform='scale(1.05)'" 
                            onmouseout="this.style.background='#3b82f6'; this.style.transform='scale(1)'">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// ============================================================
// VIEW ENROLLMENT REQUEST DETAILS
// ============================================================
async function viewEnrollmentRequest(requestId) {
    const sb = getSupabaseClient();
    if (!sb) {
        if (typeof showNotification === 'function') {
            showNotification('Supabase client not available', 'error');
        }
        return;
    }
    
    try {
        const { data, error } = await sb
            .from('student_requests')
            .select('*')
            .eq('id', requestId)
            .single();
        
        if (error) throw error;
        
        if (!data) {
            if (typeof showNotification === 'function') {
                showNotification('Request not found', 'error');
            }
            return;
        }
        
        const requestType = data.request_type === 'change_program' ? 'Change of Program' : 'Readmission';
        const fromProgram = data.current_program || data.previous_program || 'N/A';
        const toProgram = data.requested_program || 'N/A';
        const status = data.status || 'pending';
        const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
        const statusColors = {
            pending: '#f59e0b',
            approved: '#10b981',
            rejected: '#dc2626',
            processing: '#3b82f6'
        };
        const statusColor = statusColors[status] || '#f59e0b';
        const date = data.created_at ? new Date(data.created_at).toLocaleString() : 'N/A';
        const updated = data.updated_at ? new Date(data.updated_at).toLocaleString() : 'N/A';
        
        // Create modal content
        const modalContent = `
            <div style="max-width: 550px; width: 95%; background: white; border-radius: 16px; padding: 28px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3); position: relative;">
                <!-- Close Button -->
                <button onclick="closeEnrollmentModal()" style="position: absolute; top: 12px; right: 16px; background: none; border: none; font-size: 24px; color: #94a3b8; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.color='#dc2626'" onmouseout="this.style.color='#94a3b8'">
                    <i class="fas fa-times"></i>
                </button>
                
                <h3 style="color: #0A3D62; margin: 0 0 4px 0; font-size: 18px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-file-alt" style="color: #4C1D95;"></i> 
                    ${escapeHtml(requestType)} Request
                </h3>
                <p style="color: #94a3b8; font-size: 13px; margin: 0 0 20px 0;">Request ID: ${escapeHtml(data.id.substring(0, 8))}...</p>
                
                <!-- Status Badge -->
                <div style="display: flex; justify-content: center; margin-bottom: 20px;">
                    <span style="background: ${statusColor}20; color: ${statusColor}; padding: 6px 24px; border-radius: 20px; font-size: 14px; font-weight: 700; border: 1px solid ${statusColor}40;">
                        ${statusLabel}
                    </span>
                </div>
                
                <!-- Details Grid -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; padding: 16px; background: #f8fafc; border-radius: 10px;">
                    <div>
                        <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">From Program</div>
                        <div style="font-size: 15px; font-weight: 600; color: #1e293b; margin-top: 2px;">${escapeHtml(fromProgram)}</div>
                    </div>
                    <div>
                        <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Requested Program</div>
                        <div style="font-size: 15px; font-weight: 600; color: #4C1D95; margin-top: 2px;">${escapeHtml(toProgram)}</div>
                    </div>
                </div>
                
                <!-- Reason -->
                <div style="margin-bottom: 16px;">
                    <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Reason / Justification</div>
                    <div style="background: #f1f5f9; padding: 12px 16px; border-radius: 8px; font-size: 14px; color: #334155; line-height: 1.6; margin-top: 4px; border-left: 3px solid #4C1D95;">
                        ${escapeHtml(data.reason || 'No reason provided')}
                    </div>
                </div>
                
                <!-- Documents -->
                ${data.documents && data.documents.length > 0 ? `
                <div style="margin-bottom: 16px;">
                    <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                        <i class="fas fa-paperclip"></i> Supporting Documents
                    </div>
                    <div style="margin-top: 4px; display: flex; gap: 6px; flex-wrap: wrap;">
                        ${data.documents.map(doc => `
                            <span style="background: #e5e7eb; padding: 4px 12px; border-radius: 6px; font-size: 12px; color: #1e293b; display: inline-flex; align-items: center; gap: 4px;">
                                <i class="fas fa-file"></i> ${escapeHtml(doc.name || 'Document')}
                            </span>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
                
                <!-- Timestamps -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e5e7eb; padding-top: 14px;">
                    <div><i class="fas fa-clock"></i> Submitted: ${date}</div>
                    <div><i class="fas fa-edit"></i> Updated: ${updated}</div>
                </div>
                
                <!-- Close Button -->
                <div style="margin-top: 18px; text-align: center;">
                    <button onclick="closeEnrollmentModal()" style="padding: 10px 40px; background: #4C1D95; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px; transition: all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(76,29,149,0.3)'" onmouseout="this.style.transform='none'; this.style.boxShadow='none'">
                        <i class="fas fa-times"></i> Close
                    </button>
                </div>
            </div>
        `;
        
        // Show modal
        showEnrollmentModal(modalContent);
        
    } catch (error) {
        console.error('Error loading request details:', error);
        if (typeof showNotification === 'function') {
            showNotification('Error loading request details', 'error');
        }
    }
}

// ============================================================
// ENROLLMENT MODAL HELPER
// ============================================================
function showEnrollmentModal(content) {
    // Remove existing modal
    closeEnrollmentModal();
    
    const modal = document.createElement('div');
    modal.id = 'enrollmentModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center;
        z-index: 100000; padding: 20px;
    `;
    modal.innerHTML = content;
    document.body.appendChild(modal);
    
    // Close on click outside
    modal.addEventListener('click', function(e) {
        if (e.target === this) {
            closeEnrollmentModal();
        }
    });
    
    // Close on Escape key
    document.addEventListener('keydown', function handler(e) {
        if (e.key === 'Escape') {
            closeEnrollmentModal();
            document.removeEventListener('keydown', handler);
        }
    });
}

function closeEnrollmentModal() {
    const modal = document.getElementById('enrollmentModal');
    if (modal) {
        modal.remove();
    }
}

// ============================================================
// LOAD ENROLLMENT HISTORY
// ============================================================
async function loadEnrollmentHistory() {
    const sb = getSupabaseClient();
    if (!sb) {
        console.error('❌ Supabase client not available');
        return;
    }
    
    try {
        const studentId = ENR_STATE.currentStudentId;
        if (!studentId) {
            console.warn('⚠️ No student ID found');
            return;
        }
        
        const type = document.getElementById('enrHistoryType')?.value || 'all';
        const status = document.getElementById('enrHistoryStatus')?.value || 'all';
        
        let query = sb
            .from('student_requests')
            .select('*')
            .eq('student_id', studentId)
            .in('status', ['approved', 'rejected'])
            .order('updated_at', { ascending: false });
        
        if (type !== 'all') {
            query = query.eq('request_type', type);
        }
        if (status !== 'all') {
            query = query.eq('status', status);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        ENR_STATE.history = data || [];
        renderEnrollmentHistoryTable();
        
    } catch (error) {
        console.error('Error loading enrollment history:', error);
        const tbody = document.getElementById('enrHistoryBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr><td colspan="5" style="padding: 30px; text-align: center; color: #dc2626;">
                    <i class="fas fa-exclamation-circle" style="font-size: 20px; display: block; margin-bottom: 8px;"></i>
                    Error loading history: ${error.message}
                </td></tr>
            `;
        }
        if (typeof showNotification === 'function') {
            showNotification('Error loading enrollment history', 'error');
        }
    }
}

// ============================================================
// RENDER ENROLLMENT HISTORY TABLE
// ============================================================
function renderEnrollmentHistoryTable() {
    const tbody = document.getElementById('enrHistoryBody');
    if (!tbody) return;
    
    const history = ENR_STATE.history;
    
    if (!history || history.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="5" style="padding: 40px; text-align: center; color: #94a3b8;">
                <i class="fas fa-history" style="font-size: 28px; display: block; margin-bottom: 10px; color: #d1d5db;"></i>
                <p style="margin: 0;">No enrollment history found</p>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #cbd5e1;">Completed requests will appear here</p>
            </td></tr>
        `;
        return;
    }
    
    let html = '';
    history.forEach((r, index) => {
        const requestType = r.request_type === 'change_program' ? 'Change of Program' : 'Readmission';
        const typeIcon = r.request_type === 'change_program' ? 'fa-exchange-alt' : 'fa-undo-alt';
        const typeColor = r.request_type === 'change_program' ? '#4C1D95' : '#059669';
        
        const statusClass = r.status || 'approved';
        const statusLabel = statusClass.charAt(0).toUpperCase() + statusClass.slice(1);
        const statusColors = {
            approved: { bg: '#d1fae5', color: '#065f46' },
            rejected: { bg: '#fee2e2', color: '#991b1b' }
        };
        const statusStyle = statusColors[statusClass] || statusColors.approved;
        
        const date = r.updated_at ? new Date(r.updated_at).toLocaleDateString() : 'N/A';
        const fromProgram = r.current_program || r.previous_program || 'N/A';
        const toProgram = r.requested_program || 'N/A';
        const approvedBy = r.approved_by || r.updated_by || 'System';
        
        html += `
            <tr style="border-bottom: 1px solid #f1f5f9; ${index % 2 === 0 ? 'background: #fafafa;' : ''}">
                <td style="padding: 10px 14px;">
                    <span style="display: flex; align-items: center; gap: 6px;">
                        <i class="fas ${typeIcon}" style="color: ${typeColor}; font-size: 14px;"></i>
                        <span style="font-size: 13px;">${escapeHtml(requestType)}</span>
                    </span>
                </td>
                <td style="padding: 10px 14px; font-size: 13px;">
                    <span style="color: #6b7280;">${escapeHtml(fromProgram)}</span>
                    <i class="fas fa-arrow-right" style="color: #94a3b8; margin: 0 6px; font-size: 11px;"></i>
                    <span style="font-weight: 500; color: #0A3D62;">${escapeHtml(toProgram)}</span>
                </td>
                <td style="padding: 10px 14px; text-align: center; font-size: 12px; color: #64748b;">${date}</td>
                <td style="padding: 10px 14px; text-align: center;">
                    <span style="background: ${statusStyle.bg}; color: ${statusStyle.color}; padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 600; display: inline-block;">
                        ${statusLabel}
                    </span>
                </td>
                <td style="padding: 10px 14px; text-align: center; font-size: 12px; color: #64748b;">${escapeHtml(approvedBy)}</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// ============================================================
// UPDATE ENROLLMENT STATS
// ============================================================
function updateEnrollmentStats() {
    const requests = ENR_STATE.requests;
    
    const total = requests.length;
    const pending = requests.filter(r => r.status === 'pending').length;
    const approved = requests.filter(r => r.status === 'approved').length;
    const rejected = requests.filter(r => r.status === 'rejected').length;
    
    // Find latest request date
    let lastRequest = '--';
    if (requests.length > 0) {
        const latest = requests.reduce((a, b) => 
            new Date(a.created_at) > new Date(b.created_at) ? a : b
        );
        lastRequest = new Date(latest.created_at).toLocaleDateString();
    }
    
    document.getElementById('enrTotalRequests').textContent = total;
    document.getElementById('enrPendingCount').textContent = pending;
    document.getElementById('enrApprovedCount').textContent = approved;
    document.getElementById('enrRejectedCount').textContent = rejected;
    document.getElementById('enrLastRequest').textContent = lastRequest;
    
    ENR_STATE.stats = { total, pending, approved, rejected };
}

// ============================================================
// UPDATE ENROLLMENT BADGES
// ============================================================
function updateEnrollmentBadges() {
    const pending = ENR_STATE.requests.filter(r => r.status === 'pending').length;
    const badge = document.getElementById('enrPendingBadge');
    if (badge) {
        badge.textContent = pending;
        badge.style.display = pending > 0 ? 'inline-block' : 'inline-block';
    }
}

// ============================================================
// FILTER ENROLLMENT REQUESTS
// ============================================================
function filterEnrRequests() {
    loadEnrollmentRequests();
}

// ============================================================
// SHOW ENROLLMENT SUB TAB
// ============================================================
function showEnrSubTab(tab) {
    // Hide all tabs
    document.querySelectorAll('.enr-tab-content').forEach(el => el.style.display = 'none');
    
    // Show selected tab
    const tabMap = {
        'my-requests': 'enrMyRequestsTab',
        'new-request': 'enrNewRequestTab',
        'history': 'enrHistoryTab'
    };
    
    const tabId = tabMap[tab];
    if (tabId) {
        const el = document.getElementById(tabId);
        if (el) el.style.display = 'block';
    }
    
    // Update tab buttons
    document.querySelectorAll('.enr-tab-btn').forEach(btn => {
        btn.style.background = 'transparent';
        btn.style.color = '#334155';
        btn.style.boxShadow = 'none';
    });
    
    const btnMap = {
        'my-requests': 'enrTabMyRequests',
        'new-request': 'enrTabNewRequest',
        'history': 'enrTabHistory'
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
    if (tab === 'my-requests') {
        loadEnrollmentRequests();
    } else if (tab === 'history') {
        loadEnrollmentHistory();
    } else if (tab === 'new-request') {
        // Reset form
        document.getElementById('enrRequestForm')?.reset();
        document.getElementById('enrFormFeedback').style.display = 'none';
        document.getElementById('enrTypeError').style.display = 'none';
        // Reset type selection
        document.querySelectorAll('#enrTypeChangeProgram, #enrTypeReadmission').forEach(btn => {
            btn.style.borderColor = '#e5e7eb';
            btn.style.background = 'white';
        });
        document.getElementById('enrRequestType').value = '';
    }
}

// ============================================================
// SELECT ENROLLMENT TYPE
// ============================================================
function selectEnrType(type) {
    document.getElementById('enrRequestType').value = type;
    document.getElementById('enrTypeError').style.display = 'none';
    
    // Update button styles
    document.querySelectorAll('#enrTypeChangeProgram, #enrTypeReadmission').forEach(btn => {
        btn.style.borderColor = '#e5e7eb';
        btn.style.background = 'white';
    });
    
    const btn = document.getElementById(type === 'change-program' ? 'enrTypeChangeProgram' : 'enrTypeReadmission');
    if (btn) {
        btn.style.borderColor = '#4C1D95';
        btn.style.background = '#f3e8ff';
    }
    
    // Show/hide sections
    const currentSection = document.getElementById('enrCurrentProgramSection');
    const previousSection = document.getElementById('enrPreviousProgramSection');
    
    if (type === 'change-program') {
        currentSection.style.display = 'block';
        previousSection.style.display = 'none';
        document.getElementById('enrCurrentProgramDisplay').value = ENR_STATE.currentStudentProgram || 'N/A';
    } else {
        currentSection.style.display = 'none';
        previousSection.style.display = 'block';
        document.getElementById('enrPreviousProgramDisplay').value = ENR_STATE.currentStudentProgram || 'N/A';
    }
}

// ============================================================
// SUBMIT ENROLLMENT REQUEST
// ============================================================
async function submitEnrollmentRequest() {
    const sb = getSupabaseClient();
    if (!sb) {
        if (typeof showNotification === 'function') {
            showNotification('Supabase client not available', 'error');
        }
        return;
    }
    
    const requestType = document.getElementById('enrRequestType').value;
    const requestedProgram = document.getElementById('enrRequestedProgram').value;
    const reason = document.getElementById('enrReason').value.trim();
    const docsInput = document.getElementById('enrSupportingDocs');
    
    // Validate
    if (!requestType) {
        document.getElementById('enrTypeError').style.display = 'block';
        if (typeof showNotification === 'function') {
            showNotification('Please select a request type', 'warning');
        }
        return;
    }
    
    if (!requestedProgram) {
        if (typeof showNotification === 'function') {
            showNotification('Please select a requested program', 'warning');
        }
        return;
    }
    
    if (!reason || reason.length < 10) {
        if (typeof showNotification === 'function') {
            showNotification('Please provide a detailed reason (minimum 10 characters)', 'warning');
        }
        return;
    }
    
    const studentId = ENR_STATE.currentStudentId;
    const studentName = ENR_STATE.currentStudentName || 'Unknown';
    const currentProgram = ENR_STATE.currentStudentProgram || 'N/A';
    
    // Check if already has pending request
    const existingPending = ENR_STATE.requests.filter(r => r.status === 'pending');
    if (existingPending.length > 0) {
        if (typeof showNotification === 'function') {
            showNotification('You already have a pending request. Please wait for it to be processed.', 'warning');
        }
        return;
    }
    
    if (typeof showLoading === 'function') showLoading('Submitting request...');
    
    try {
        // Handle documents
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
            student_id: studentId,
            student_name: studentName,
            request_type: requestType,
            current_program: requestType === 'change_program' ? currentProgram : null,
            previous_program: requestType === 'readmission' ? currentProgram : null,
            requested_program: requestedProgram,
            reason: reason,
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
        
        // Show success
        const feedback = document.getElementById('enrFormFeedback');
        if (feedback) {
            feedback.style.display = 'block';
            feedback.style.background = '#d1fae5';
            feedback.style.color = '#065f46';
            feedback.style.border = '1px solid #86efac';
            feedback.innerHTML = `
                <i class="fas fa-check-circle"></i> 
                <strong>Request submitted successfully!</strong><br>
                <span style="font-size: 13px;">Your enrollment request has been submitted. You will be notified once it's reviewed.</span>
            `;
        }
        
        if (typeof showNotification === 'function') {
            showNotification('✅ Enrollment request submitted successfully!', 'success');
        }
        
        // Reset form
        document.getElementById('enrRequestForm').reset();
        if (docsInput) docsInput.value = '';
        
        // Reset type selection
        document.querySelectorAll('#enrTypeChangeProgram, #enrTypeReadmission').forEach(btn => {
            btn.style.borderColor = '#e5e7eb';
            btn.style.background = 'white';
        });
        document.getElementById('enrRequestType').value = '';
        document.getElementById('enrCurrentProgramSection').style.display = 'none';
        document.getElementById('enrPreviousProgramSection').style.display = 'none';
        
        // Refresh data
        setTimeout(() => {
            loadEnrollmentRequests();
            loadEnrollmentHistory();
            updateEnrollmentStats();
            updateEnrollmentBadges();
            showEnrSubTab('my-requests');
        }, 1000);
        
    } catch (error) {
        if (typeof hideLoading === 'function') hideLoading();
        console.error('Error submitting request:', error);
        
        const feedback = document.getElementById('enrFormFeedback');
        if (feedback) {
            feedback.style.display = 'block';
            feedback.style.background = '#fee2e2';
            feedback.style.color = '#991b1b';
            feedback.style.border = '1px solid #fecaca';
            feedback.innerHTML = `
                <i class="fas fa-exclamation-circle"></i> 
                <strong>Error submitting request:</strong><br>
                <span style="font-size: 13px;">${escapeHtml(error.message)}</span>
            `;
        }
        
        if (typeof showNotification === 'function') {
            showNotification('❌ Error submitting request: ' + error.message, 'error');
        }
    }
}

// ============================================================
// REFRESH ENROLLMENT
// ============================================================
function refreshEnrollment() {
    loadStudentInfo();
    loadEnrollmentRequests();
    loadEnrollmentHistory();
    updateEnrollmentStats();
    updateEnrollmentBadges();
    if (typeof showNotification === 'function') {
        showNotification('🔄 Data refreshed!', 'success');
    }
}

// ============================================================
// EXPORT ENROLLMENT REQUESTS TO CSV
// ============================================================
function exportEnrollmentRequests() {
    const requests = ENR_STATE.requests;
    
    if (!requests || requests.length === 0) {
        if (typeof showNotification === 'function') {
            showNotification('No data to export', 'warning');
        }
        return;
    }
    
    const headers = ['Request Type', 'From Program', 'To Program', 'Status', 'Date', 'Reason'];
    const rows = requests.map(r => {
        const type = r.request_type === 'change_program' ? 'Change of Program' : 'Readmission';
        const fromProgram = r.current_program || r.previous_program || 'N/A';
        const toProgram = r.requested_program || 'N/A';
        const status = r.status || 'pending';
        const date = r.created_at ? new Date(r.created_at).toLocaleDateString() : 'N/A';
        return [type, fromProgram, toProgram, status, date, r.reason || ''];
    });
    
    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
    });
    
    downloadCSV(csv, `enrollment_requests_${new Date().toISOString().split('T')[0]}.csv`);
    if (typeof showNotification === 'function') {
        showNotification('✅ Data exported!', 'success');
    }
}

// ============================================================
// DOWNLOAD CSV HELPER
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
    URL.revokeObjectURL(url);
}

// ============================================================
// ESCAPE HTML HELPER
// ============================================================
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ============================================================
// SETUP EVENT LISTENERS
// ============================================================
function setupEnrollmentEventListeners() {
    // Request type button clicks
    document.querySelectorAll('#enrTypeChangeProgram, #enrTypeReadmission').forEach(btn => {
        btn.addEventListener('click', function() {
            const type = this.id === 'enrTypeChangeProgram' ? 'change-program' : 'readmission';
            selectEnrType(type);
        });
    });
    
    // Reset form feedback on input change
    document.getElementById('enrRequestForm')?.addEventListener('change', function() {
        const feedback = document.getElementById('enrFormFeedback');
        if (feedback) feedback.style.display = 'none';
    });
}

// ============================================================
// GLOBAL REGISTRATION
// ============================================================
window.initEnrollment = initEnrollment;
window.loadEnrollmentRequests = loadEnrollmentRequests;
window.loadEnrollmentHistory = loadEnrollmentHistory;
window.viewEnrollmentRequest = viewEnrollmentRequest;
window.showEnrSubTab = showEnrSubTab;
window.selectEnrType = selectEnrType;
window.submitEnrollmentRequest = submitEnrollmentRequest;
window.filterEnrRequests = filterEnrRequests;
window.refreshEnrollment = refreshEnrollment;
window.exportEnrollmentRequests = exportEnrollmentRequests;
window.closeEnrollmentModal = closeEnrollmentModal;
window.escapeHtml = escapeHtml;
window.downloadCSV = downloadCSV;

console.log('✅ Enrollment Module Loaded!');
console.log('📋 Features:');
console.log('   - ✅ Change of Program requests');
console.log('   - ✅ Readmission requests');
console.log('   - ✅ Request history with filters');
console.log('   - ✅ Student view only (own requests)');
console.log('   - ✅ Submit new enrollment requests');
console.log('   - ✅ Export to CSV');
console.log('   - ✅ View request details');
