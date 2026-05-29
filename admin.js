
// =====================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Hide .html extension in URL
if (window.location.pathname.endsWith('.html')) {
    const cleanPath = window.location.pathname.replace(/\.html$/, '');
    window.history.replaceState({}, '', cleanPath);
}

// =====================================================
// SUPABASE CONFIGURATION
// =====================================================
const SUPABASE_URL = 'https://lwhtjozfsmbyihenfunw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.sb = sb;

// =====================================================
// GLOBAL VARIABLES
// =====================================================
let currentUserProfile = null;
let currentUserId = null;
let attendanceMap = null;
let allUnits = [];
let currentBlockFilter = 'all';
let allResourcesData = [];
let currentResourceType = 'all';
let mainCalendar = null;
let gradeModalData = null;

// =====================================================
// TVET PROGRAM CODES
// =====================================================
const TVET_PROGRAMS = [
    'DPOTT', 'DCH', 'DHRIT', 'DSL', 'DSW', 'DCJS', 'DHSS', 'DICT', 'DME',
    'CPOTT', 'CCH', 'CHRIT', 'CPC', 'CSL', 'CSW', 'CCJS', 'CAG', 'CHSS', 'CICT',
    'ACH', 'AAG', 'ASW', 'CCA', 'PTE'
];

const PROGRAM_DISPLAY_NAMES = {
    'KRCHN': 'KRCHN Nursing',
    'DPOTT': 'Diploma in Perioperative Theatre Technology',
    'DCH': 'Diploma in Community Health',
    'DHRIT': 'Diploma in Health Records and IT',
    'DSL': 'Diploma in Science Lab',
    'DSW': 'Diploma in Social Work & Community Development',
    'DCJS': 'Diploma in Criminal Justice',
    'DHSS': 'Diploma in Health Support Services',
    'DICT': 'Diploma in ICT',
    'DME': 'Diploma in Medical Engineering',
    'CPOTT': 'Certificate in Perioperative Theatre Technology',
    'CCH': 'Certificate in Community Health',
    'CHRIT': 'Certificate in Health Records and IT',
    'CPC': 'Certificate in Patient Care',
    'CSL': 'Certificate in Science Lab',
    'CSW': 'Certificate in Social Work & Community Development',
    'CCJS': 'Certificate in Criminal Justice',
    'CAG': 'Certificate in Agriculture',
    'CHSS': 'Certificate in Health Support Services',
    'CICT': 'Certificate in ICT',
    'ACH': 'Artisan in Community Health',
    'AAG': 'Artisan in Agriculture',
    'ASW': 'Artisan in Social Work & Community Development',
    'CCA': 'Certificate in Computer Applications',
    'PTE': 'TVET/CDACC (PTE)'
};

// =====================================================
// UTILITY FUNCTIONS
// =====================================================
function $(id) { return document.getElementById(id); }

function escapeHtml(s, isAttribute = false) {
    if (!s) return '';
    let str = String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    if (isAttribute) {
        str = str.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
    } else {
        str = str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    return str;
}

function showFeedback(message, type = 'success') {
    const prefix = type === 'success' ? '✅ ' : type === 'error' ? '❌ ' : type === 'warning' ? '⚠️ ' : 'ℹ️ ';
    alert(prefix + message);
}

function setButtonLoading(button, isLoading, originalText = 'Submit') {
    if (!button) return;
    button.disabled = isLoading;
    button.textContent = isLoading ? 'Processing...' : originalText;
}

// =====================================================
// PROGRAM MANAGEMENT FUNCTIONS
// =====================================================
function isTVETProgram(programCode) {
    if (!programCode) return false;
    return TVET_PROGRAMS.includes(programCode.toUpperCase().trim());
}

function getProgramType(programCode) {
    if (!programCode) return 'KRCHN';
    const code = programCode.toUpperCase().trim();
    if (code === 'KRCHN') return 'KRCHN';
    if (isTVETProgram(code)) return 'TVET';
    return 'KRCHN';
}

function getProgramDisplayName(programCode) {
    if (!programCode) return 'Unknown Program';
    return PROGRAM_DISPLAY_NAMES[programCode.toUpperCase().trim()] || programCode;
}

function updateProgramDropdown(selectElement) {
    if (!selectElement) return;
    const currentValue = selectElement.value;
    selectElement.innerHTML = '';
    
    // Add KRCHN option
    const krchnOption = document.createElement('option');
    krchnOption.value = 'KRCHN';
    krchnOption.textContent = '🎓 KRCHN Nursing';
    selectElement.appendChild(krchnOption);
    
    // Add TVET Diploma group
    const diplomaGroup = document.createElement('optgroup');
    diplomaGroup.label = '🎯 TVET Diploma Programs';
    ['DPOTT', 'DCH', 'DHRIT', 'DSL', 'DSW', 'DCJS', 'DHSS', 'DICT', 'DME'].forEach(code => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = PROGRAM_DISPLAY_NAMES[code];
        diplomaGroup.appendChild(option);
    });
    selectElement.appendChild(diplomaGroup);
    
    // Add TVET Certificate group
    const certGroup = document.createElement('optgroup');
    certGroup.label = '📜 TVET Certificate Programs';
    ['CPOTT', 'CCH', 'CHRIT', 'CPC', 'CSL', 'CSW', 'CCJS', 'CAG', 'CHSS', 'CICT'].forEach(code => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = PROGRAM_DISPLAY_NAMES[code];
        certGroup.appendChild(option);
    });
    selectElement.appendChild(certGroup);
    
    // Add TVET Artisan group
    const artisanGroup = document.createElement('optgroup');
    artisanGroup.label = '🔧 TVET Artisan Programs';
    ['ACH', 'AAG', 'ASW'].forEach(code => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = PROGRAM_DISPLAY_NAMES[code];
        artisanGroup.appendChild(option);
    });
    selectElement.appendChild(artisanGroup);
    
    if (currentValue) selectElement.value = currentValue;
}

function updateBlockTermOptions(programSelectId, blockTermSelectId) {
    const programSelect = $(programSelectId);
    const blockTermSelect = $(blockTermSelectId);
    if (!programSelect || !blockTermSelect) return;
    
    const programCode = programSelect.value;
    const programType = getProgramType(programCode);
    const currentValue = blockTermSelect.value;
    
    blockTermSelect.innerHTML = '<option value="">-- Select Block/Term --</option>';
    if (!programCode) return;
    
    let options = [];
    if (programType === 'KRCHN') {
        options = ['Introductory', 'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Block 6', 'Final'];
    } else {
        options = ['Introductory', 'Term 1', 'Term 2', 'Term 3', 'Term 4', 'Term 5', 'Term 6', 'Final'];
    }
    
    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        blockTermSelect.appendChild(option);
    });
    
    if (currentValue && Array.from(blockTermSelect.options).some(o => o.value === currentValue)) {
        blockTermSelect.value = currentValue;
    }
}

function initializeAllProgramDropdowns() {
    const dropdowns = ['account-program', 'edit_user_program', 'course-program', 'exam_program', 'resource_program'];
    dropdowns.forEach(id => {
        const dropdown = $(id);
        if (dropdown) {
            updateProgramDropdown(dropdown);
            dropdown.addEventListener('change', () => {
                const blockField = id === 'account-program' ? 'account-block-term' :
                                  id === 'edit_user_program' ? 'edit_user_block' :
                                  id === 'course-program' ? 'course-block' :
                                  id === 'exam_program' ? 'exam-block-term' :
                                  id === 'resource_program' ? 'resource-block' : null;
                if (blockField) updateBlockTermOptions(id, blockField);
            });
        }
    });
}

// =====================================================
// TAB NAVIGATION
// =====================================================
window.showTab = function(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
        tab.classList.remove('active');
    });
    const target = document.getElementById(tabId);
    if (target) {
        target.style.display = 'block';
        target.classList.add('active');
    }
    document.querySelectorAll('.nav a').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-tab') === tabId) link.classList.add('active');
    });
    loadSectionData(tabId);
};

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
    if (modalId === 'mapModal' && attendanceMap) {
        attendanceMap.remove();
        attendanceMap = null;
    }
}

async function loadSectionData(tabId) {
    switch(tabId) {
        case 'dashboard': loadDashboardData(); break;
        case 'users': loadAllUsers(); break;
        case 'pending': loadPendingApprovals(); break;
        case 'enroll': loadStudents(); break;
        case 'courses': loadCourses(); break;
        case 'unit-management': loadAllUnits(); break;
        case 'support-tickets': loadAdminTickets(); break;
        case 'fee-accounts': loadStudentBalances(); break;
        case 'sessions': loadScheduledSessions(); break;
        case 'attendance': loadAttendance(); break;
        case 'cats': loadExams(); break;
        case 'resources': loadAllResources(); break;
        case 'messages': loadAdminMessages(); break;
        case 'calendar': renderFullCalendar(); break;
        case 'welcome-editor': loadWelcomeMessageForEdit(); break;
        case 'system-health': loadSystemHealth(); break;
        case 'user-analytics': loadUserAnalytics(); break;
    }
}

// =====================================================
// DASHBOARD
// =====================================================
async function loadDashboardData() {
    try {
        const { count: totalUsers } = await sb.from('consolidated_user_profiles_table').select('*', { count: 'exact', head: true });
        const { count: pendingCount } = await sb.from('consolidated_user_profiles_table').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        const { count: studentsCount } = await sb.from('consolidated_user_profiles_table').select('*', { count: 'exact', head: true }).eq('role', 'student');
        const { count: coursesCount } = await sb.from('courses').select('*', { count: 'exact', head: true });
        const { count: unitsCount } = await sb.from('units_catalog').select('*', { count: 'exact', head: true });
        const { count: openTickets } = await sb.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open');
        
        const today = new Date().toISOString().split('T')[0];
        const { count: checkIns } = await sb.from('geo_attendance_logs').select('*', { count: 'exact', head: true }).gte('check_in_time', today);
        
        document.getElementById('totalUsers').textContent = totalUsers || 0;
        document.getElementById('pendingApprovals').textContent = pendingCount || 0;
        document.getElementById('totalStudents').textContent = studentsCount || 0;
        document.getElementById('totalCourses').textContent = coursesCount || 0;
        document.getElementById('dashboardTotalUnits').textContent = unitsCount || 0;
        document.getElementById('dashboardOpenTickets').textContent = openTickets || 0;
        document.getElementById('totalDailyCheckIns').textContent = checkIns || 0;
        
        await loadFeeSummaryForDashboard();
        loadStudentWelcomeMessage();
    } catch (error) {
        console.error('Dashboard error:', error);
    }
}

async function loadFeeSummaryForDashboard() {
    try {
        const { data: students } = await sb.from('consolidated_user_profiles_table').select('user_id, program, block').eq('role', 'student').eq('status', 'approved');
        let totalOutstanding = 0;
        for (const student of students || []) {
            const { data: feeConfig } = await sb.from('fee_structure').select('amount').eq('program', student.program).eq('block', student.block || 'Introductory').single();
            const totalDue = feeConfig?.amount || 0;
            const { data: payments } = await sb.from('fee_payments').select('amount').eq('student_id', student.user_id);
            const totalPaid = payments ? payments.reduce((sum, p) => sum + parseFloat(p.amount), 0) : 0;
            const balance = totalDue - totalPaid;
            if (balance > 0) totalOutstanding += balance;
        }
        const el = document.getElementById('dashboardOutstandingFees');
        if (el) el.innerHTML = `KES ${totalOutstanding.toLocaleString()}`;
    } catch (error) {
        console.error('Fee summary error:', error);
    }
}

async function loadStudentWelcomeMessage() {
    const { data } = await sb.from('app_settings').select('value').eq('key', 'student_welcome').single();
    const messageDiv = document.getElementById('student-welcome-message');
    if (messageDiv && data?.value) messageDiv.innerHTML = data.value;
}

// =====================================================
// USERS MANAGEMENT
// =====================================================
async function loadAllUsers() {
    const tbody = document.getElementById('users-table');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7"><div class="loading-spinner"></div> Loading users...<\/td><\/tr>';
    
    const { data, error } = await sb.from('consolidated_user_profiles_table').select('*').neq('role', 'superadmin').order('full_name');
    if (error) { tbody.innerHTML = `<tr><td colspan="7">Error: ${error.message}<\/td><\/tr>`; return; }
    if (!data || data.length === 0) { tbody.innerHTML = '<tr><td colspan="7">No users found.<\/td><\/tr>'; return; }
    
    tbody.innerHTML = '';
    data.forEach(u => {
        const statusClass = u.status === 'approved' ? 'badge-success' : 'badge-warning';
        tbody.innerHTML += `<tr>
            <td>${u.user_id?.substring(0, 8)}...<\/td>
            <td>${escapeHtml(u.full_name)}<\/td>
            <td>${escapeHtml(u.email)}<\/td>
            <td>${escapeHtml(u.role)}<\/td>
            <td>${escapeHtml(getProgramDisplayName(u.program))}<\/td>
            <td><span class="badge ${statusClass}">${u.status}<\/span><\/td>
            <td><button class="btn-sm btn-edit" onclick="openEditUserModal('${u.user_id}')">Edit<\/button>
                <button class="btn-sm btn-delete" onclick="deleteUser('${u.user_id}', '${escapeHtml(u.full_name)}')">Delete<\/button><\/td>
        </tr>`;
    });
}

async function loadPendingApprovals() {
    const tbody = document.getElementById('pending-table');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6"><div class="loading-spinner"></div> Loading...<\/td><\/tr>';
    
    const { data, error } = await sb.from('consolidated_user_profiles_table').select('*').eq('status', 'pending').order('created_at');
    if (error) { tbody.innerHTML = `<tr><td colspan="6">Error: ${error.message}<\/td><\/tr>`; return; }
    if (!data || data.length === 0) { tbody.innerHTML = '<tr><td colspan="6">No pending approvals.<\/td><\/tr>'; return; }
    
    tbody.innerHTML = '';
    data.forEach(u => {
        tbody.innerHTML += `<tr>
            <td>${escapeHtml(u.full_name)}<\/td>
            <td>${escapeHtml(u.email)}<\/td>
            <td>${escapeHtml(u.role)}<\/td>
            <td>${escapeHtml(getProgramDisplayName(u.program))}<\/td>
            <td>${new Date(u.created_at).toLocaleDateString()}<\/td>
            <td><button class="btn-sm btn-success" onclick="approveUser('${u.user_id}', '${escapeHtml(u.full_name)}')">Approve<\/button>
                <button class="btn-sm btn-delete" onclick="deleteUser('${u.user_id}', '${escapeHtml(u.full_name)}', true)">Reject<\/button><\/td>
        </tr>`;
    });
}

async function loadStudents() {
    const tbody = document.getElementById('students-table');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6"><div class="loading-spinner"></div> Loading students...<\/td><\/tr>';
    
    const { data, error } = await sb.from('consolidated_user_profiles_table').select('*').eq('role', 'student').order('full_name');
    if (error) { tbody.innerHTML = `<tr><td colspan="6">Error: ${error.message}<\/td><\/tr>`; return; }
    if (!data || data.length === 0) { tbody.innerHTML = '<tr><td colspan="6">No students found.<\/td><\/tr>'; return; }
    
    tbody.innerHTML = '';
    data.forEach(s => {
        const statusClass = s.status === 'approved' ? 'badge-success' : 'badge-warning';
        tbody.innerHTML += `<tr>
            <td>${s.user_id?.substring(0, 8)}...<\/td>
            <td>${escapeHtml(s.full_name)}<\/td>
            <td>${escapeHtml(s.email)}<\/td>
            <td>${escapeHtml(getProgramDisplayName(s.program))}<\/td>
            <td><span class="badge ${statusClass}">${s.status}<\/span><\/td>
            <td><button class="btn-sm btn-edit" onclick="openEditUserModal('${s.user_id}')">Edit<\/button>
                <button class="btn-sm btn-delete" onclick="deleteUser('${s.user_id}', '${escapeHtml(s.full_name)}')">Delete<\/button><\/td>
        </tr>`;
    });
}

// Enroll Account Form
document.getElementById('add-account-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = e.submitter;
    const originalText = btn.textContent;
    setButtonLoading(btn, true, originalText);
    
    const name = document.getElementById('account-name').value;
    const email = document.getElementById('account-email').value;
    const password = document.getElementById('account-password').value;
    const role = document.getElementById('account-role').value;
    const phone = document.getElementById('account-phone').value;
    const program = document.getElementById('account-program').value;
    const intake = document.getElementById('account-intake').value;
    const block = document.getElementById('account-block-term')?.value || 'Introductory';
    
    try {
        const { data: { user }, error: authError } = await sb.auth.signUp({
            email, password,
            options: { data: { full_name: name, role, phone, program, intake_year: intake, block, status: 'approved' } }
        });
        if (authError) throw authError;
        
        if (user) {
            const { error: insertError } = await sb.from('consolidated_user_profiles_table').insert([{
                user_id: user.id, email, full_name: name, role, phone, program, intake_year: intake, block, status: 'approved'
            }]);
            if (insertError) throw insertError;
        }
        showFeedback(`✅ Account created for ${name}!`, 'success');
        e.target.reset();
        loadAllUsers();
        loadStudents();
        loadDashboardData();
    } catch (error) {
        showFeedback(`Error: ${error.message}`, 'error');
    } finally {
        setButtonLoading(btn, false, originalText);
    }
});

// Approve User
window.approveUser = async function(userId, fullName) {
    if (!confirm(`Approve ${fullName}?`)) return;
    try {
        await sb.from('consolidated_user_profiles_table').update({ status: 'approved' }).eq('user_id', userId);
        showFeedback(`✅ ${fullName} approved!`, 'success');
        loadPendingApprovals();
        loadAllUsers();
        loadDashboardData();
    } catch (error) {
        showFeedback(`Error: ${error.message}`, 'error');
    }
};

// Delete User
window.deleteUser = async function(userId, fullName, isRejection = false) {
    const action = isRejection ? 'reject' : 'delete';
    if (!confirm(`${action.toUpperCase()} ${fullName}? This cannot be undone.`)) return;
    try {
        await sb.from('consolidated_user_profiles_table').delete().eq('user_id', userId);
        showFeedback(`✅ User ${fullName} ${action}ed!`, 'success');
        loadPendingApprovals();
        loadAllUsers();
        loadStudents();
        loadDashboardData();
    } catch (error) {
        showFeedback(`Error: ${error.message}`, 'error');
    }
};

// Open Edit User Modal
window.openEditUserModal = async function(userId) {
    const { data: user, error } = await sb.from('consolidated_user_profiles_table').select('*').eq('user_id', userId).single();
    if (error || !user) { showFeedback('User not found', 'error'); return; }
    
    document.getElementById('edit_user_id').value = user.user_id;
    document.getElementById('edit_user_id_display').textContent = user.user_id.substring(0, 8);
    document.getElementById('edit_user_name').value = user.full_name || '';
    document.getElementById('edit_user_email').value = user.email || '';
    document.getElementById('edit_user_role').value = user.role || 'student';
    document.getElementById('edit_user_program').value = user.program || 'KRCHN';
    document.getElementById('edit_user_intake').value = user.intake_year || '2024';
    document.getElementById('edit_user_block_status').value = user.block_program_year ? 'true' : 'false';
    
    updateProgramDropdown(document.getElementById('edit_user_program'));
    updateBlockTermOptions('edit_user_program', 'edit_user_block');
    setTimeout(() => {
        document.getElementById('edit_user_block').value = user.block || 'Introductory';
    }, 100);
    
    document.getElementById('userEditModal').style.display = 'flex';
};

// Save Edit User
document.getElementById('edit-user-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = e.submitter;
    const originalText = btn.textContent;
    setButtonLoading(btn, true, originalText);
    
    const userId = document.getElementById('edit_user_id').value;
    const updatedData = {
        full_name: document.getElementById('edit_user_name').value,
        email: document.getElementById('edit_user_email').value,
        role: document.getElementById('edit_user_role').value,
        program: document.getElementById('edit_user_program').value,
        intake_year: document.getElementById('edit_user_intake').value,
        block: document.getElementById('edit_user_block').value,
        block_program_year: document.getElementById('edit_user_block_status').value === 'true',
        updated_at: new Date().toISOString()
    };
    
    const newPassword = document.getElementById('edit_user_new_password').value;
    const confirmPassword = document.getElementById('edit_user_confirm_password').value;
    
    if (newPassword && newPassword !== confirmPassword) {
        showFeedback('Passwords do not match!', 'error');
        setButtonLoading(btn, false, originalText);
        return;
    }
    
    try {
        const { error } = await sb.from('consolidated_user_profiles_table').update(updatedData).eq('user_id', userId);
        if (error) throw error;
        
        if (newPassword) {
            try {
                await sb.auth.admin.updateUserById(userId, { password: newPassword });
            } catch (pwError) {
                console.warn('Password update failed:', pwError);
            }
        }
        
        showFeedback('✅ User updated!', 'success');
        document.getElementById('userEditModal').style.display = 'none';
        document.getElementById('edit_user_new_password').value = '';
        document.getElementById('edit_user_confirm_password').value = '';
        loadAllUsers();
        loadStudents();
    } catch (error) {
        showFeedback(`Error: ${error.message}`, 'error');
    } finally {
        setButtonLoading(btn, false, originalText);
    }
});

// =====================================================
// COURSES MANAGEMENT
// =====================================================
async function loadCourses() {
    const tbody = document.getElementById('courses-table');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5"><div class="loading-spinner"></div> Loading courses...<\/td><\/tr>';
    
    const { data, error } = await sb.from('courses').select('*').order('course_name');
    if (error) { tbody.innerHTML = `<tr><td colspan="5">Error: ${error.message}<\/td><\/tr>`; return; }
    if (!data || data.length === 0) { tbody.innerHTML = '<tr><td colspan="5">No courses found.<\/td><\/tr>'; return; }
    
    tbody.innerHTML = '';
    data.forEach(c => {
        tbody.innerHTML += `<tr>
            <td>${escapeHtml(c.course_name)}<\/td>
            <td>${escapeHtml(c.unit_code || 'N/A')}<\/td>
            <td>${escapeHtml(c.target_program)}<\/td>
            <td>${escapeHtml(c.intake_year || 'N/A')}<\/td>
            <td><button class="btn-sm btn-edit" onclick="openEditCourseModal('${c.id}')">Edit<\/button>
                <button class="btn-sm btn-delete" onclick="deleteCourse('${c.id}')">Delete<\/button><\/td>
        </tr>`;
    });
}

// Add Course Form
document.getElementById('add-course-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = e.submitter;
    const originalText = btn.textContent;
    setButtonLoading(btn, true, originalText);
    
    const courseData = {
        course_name: document.getElementById('course-name').value,
        unit_code: document.getElementById('course-unit-code').value,
        description: document.getElementById('course-description').value,
        target_program: document.getElementById('course-program').value,
        intake_year: document.getElementById('course-intake').value,
        block: document.getElementById('course-block')?.value || 'General',
        status: 'Active'
    };
    
    const { error } = await sb.from('courses').insert([courseData]);
    if (error) {
        showFeedback(`Error: ${error.message}`, 'error');
    } else {
        showFeedback('✅ Course added!', 'success');
        e.target.reset();
        loadCourses();
    }
    setButtonLoading(btn, false, originalText);
});

// Delete Course
window.deleteCourse = async function(courseId) {
    if (!confirm('Delete this course?')) return;
    const { error } = await sb.from('courses').delete().eq('id', courseId);
    if (error) {
        showFeedback(`Error: ${error.message}`, 'error');
    } else {
        showFeedback('✅ Course deleted!', 'success');
        loadCourses();
    }
};

// Open Edit Course Modal
window.openEditCourseModal = async function(courseId) {
    const { data: course, error } = await sb.from('courses').select('*').eq('id', courseId).single();
    if (error || !course) { showFeedback('Course not found', 'error'); return; }
    
    document.getElementById('edit_course_id').value = course.id;
    document.getElementById('edit_course_name').value = course.course_name;
    document.getElementById('edit_course_unit_code').value = course.unit_code || '';
    document.getElementById('edit_course_description').value = course.description || '';
    document.getElementById('edit_course_program').value = course.target_program;
    document.getElementById('edit_course_intake').value = course.intake_year || '';
    document.getElementById('edit_course_block').value = course.block || 'General';
    
    document.getElementById('courseEditModal').style.display = 'flex';
};

// Save Edit Course
document.getElementById('edit-course-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const courseId = document.getElementById('edit_course_id').value;
    const updatedData = {
        course_name: document.getElementById('edit_course_name').value,
        unit_code: document.getElementById('edit_course_unit_code').value,
        description: document.getElementById('edit_course_description').value,
        target_program: document.getElementById('edit_course_program').value,
        intake_year: document.getElementById('edit_course_intake').value,
        block: document.getElementById('edit_course_block').value
    };
    
    const { error } = await sb.from('courses').update(updatedData).eq('id', courseId);
    if (error) {
        showFeedback(`Error: ${error.message}`, 'error');
    } else {
        showFeedback('✅ Course updated!', 'success');
        document.getElementById('courseEditModal').style.display = 'none';
        loadCourses();
    }
});

// =====================================================
// UNITS MANAGEMENT
// =====================================================
async function loadAllUnits() {
    const container = document.getElementById('units-list-container');
    if (!container) return;
    container.innerHTML = '<div class="loading-spinner"></div><p>Loading units...</p>';
    
    const { data, error } = await sb.from('units_catalog').select('*').order('block').order('unit_code');
    if (error) { container.innerHTML = `<p>Error: ${error.message}</p>`; return; }
    allUnits = data || [];
    renderUnitsCatalog();
}

function renderUnitsCatalog() {
    const container = document.getElementById('units-list-container');
    if (!container) return;
    
    const searchTerm = document.getElementById('unit_search')?.value.toLowerCase() || '';
    const programFilter = document.getElementById('unit_filter_program')?.value || '';
    
    let filtered = allUnits.filter(u => {
        if (searchTerm && !u.unit_code?.toLowerCase().includes(searchTerm) && !u.unit_name?.toLowerCase().includes(searchTerm)) return false;
        if (programFilter && u.program !== programFilter) return false;
        if (currentBlockFilter !== 'all' && u.block !== currentBlockFilter) return false;
        return true;
    });
    
    if (filtered.length === 0) { container.innerHTML = '<p>No units found.</p>'; return; }
    
    let html = '<div class="units-grid">';
    filtered.forEach(unit => {
        html += `<div class="unit-card">
            <div class="unit-header">
                <div>
                    <span class="unit-code">${escapeHtml(unit.unit_code)}</span>
                    <span class="unit-name">${escapeHtml(unit.unit_name)}</span>
                </div>
            </div>
            <div class="unit-meta">
                <span>${escapeHtml(getProgramDisplayName(unit.program))}</span>
                <span>${escapeHtml(unit.block)}</span>
                <span>Year: ${unit.year || 'N/A'}</span>
                <span>${unit.credits || 3} Credits</span>
                <span>${unit.hours || 0} Hours</span>
            </div>
        </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
}

window.filterUnitsByBlock = function(block) {
    currentBlockFilter = block;
    document.querySelectorAll('.block-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-block') === block) btn.classList.add('active');
    });
    renderUnitsCatalog();
};

// =====================================================
// SUPPORT TICKETS
// =====================================================
async function loadAdminTickets() {
    const tbody = document.getElementById('admin-tickets-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7"><div class="loading-spinner"></div> Loading tickets...<\/td><\/tr>';
    
    const { data, error } = await sb.from('support_tickets').select('*').order('created_at', { ascending: false });
    if (error) { tbody.innerHTML = `<tr><td colspan="7">Error: ${error.message}<\/td><\/tr>`; return; }
    if (!data || data.length === 0) { tbody.innerHTML = '<tr><td colspan="7">No tickets found.<\/td><\/tr>'; return; }
    
    // Get student names
    const studentIds = [...new Set(data.map(t => t.student_id))];
    let studentNames = {};
    if (studentIds.length) {
        const { data: students } = await sb.from('consolidated_user_profiles_table').select('user_id, full_name').in('user_id', studentIds);
        if (students) students.forEach(s => studentNames[s.user_id] = s.full_name);
    }
    
    tbody.innerHTML = '';
    data.forEach(t => {
        const statusClass = t.status === 'open' ? 'badge-warning' : t.status === 'in_progress' ? 'badge-info' : 'badge-success';
        tbody.innerHTML += `<tr>
            <td>${escapeHtml(t.ticket_number)}<\/td>
            <td>${escapeHtml(studentNames[t.student_id] || 'Unknown')}<\/td>
            <td>${escapeHtml(t.subject)}<\/td>
            <td><span class="badge ${t.priority === 'urgent' ? 'badge-danger' : 'badge-info'}">${escapeHtml(t.priority)}<\/span><\/td>
            <td><span class="badge ${statusClass}">${escapeHtml(t.status)}<\/span><\/td>
            <td>${new Date(t.created_at).toLocaleDateString()}<\/td>
            <td><button class="btn-sm btn-edit" onclick="viewTicketDetails('${t.id}')">View<\/button><\/td>
        </tr>`;
    });
    
    document.getElementById('admin_open_tickets').textContent = data.filter(t => t.status === 'open').length;
    document.getElementById('admin_progress_tickets').textContent = data.filter(t => t.status === 'in_progress').length;
    document.getElementById('admin_closed_tickets').textContent = data.filter(t => t.status === 'closed').length;
    document.getElementById('admin_urgent_tickets').textContent = data.filter(t => t.priority === 'urgent').length;
}

// View Ticket Details
window.viewTicketDetails = async function(ticketId) {
    const { data: ticket } = await sb.from('support_tickets').select('*').eq('id', ticketId).single();
    if (!ticket) return;
    
    const { data: student } = await sb.from('consolidated_user_profiles_table').select('full_name, email').eq('user_id', ticket.student_id).single();
    const { data: conversations } = await sb.from('ticket_conversations').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true });
    
    let convHtml = '<h4>Conversation</h4>';
    (conversations || []).forEach(c => {
        convHtml += `<div style="margin-bottom:10px;padding:10px;background:#f5f5f5;border-radius:8px;">
            <strong>${c.author_id === ticket.student_id ? 'Student' : 'Admin'}</strong> <small>${new Date(c.created_at).toLocaleString()}</small>
            <p style="margin-top:5px;">${escapeHtml(c.message)}</p>
        </div>`;
    });
    
    const modalHtml = `
        <div id="ticketDetailModal" style="display:flex;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:10000;align-items:center;justify-content:center;">
            <div style="background:white;width:600px;max-width:90%;border-radius:12px;max-height:80vh;overflow-y:auto;">
                <div style="padding:15px;border-bottom:1px solid #ddd;display:flex;justify-content:space-between;">
                    <h3>Ticket: ${escapeHtml(ticket.ticket_number)}</h3>
                    <button onclick="closeModal('ticketDetailModal')" style="background:none;border:none;font-size:24px;cursor:pointer;">&times;</button>
                </div>
                <div style="padding:15px;">
                    <p><strong>Student:</strong> ${escapeHtml(student?.full_name || 'Unknown')}</p>
                    <p><strong>Email:</strong> ${escapeHtml(student?.email || 'N/A')}</p>
                    <p><strong>Subject:</strong> ${escapeHtml(ticket.subject)}</p>
                    <p><strong>Description:</strong> ${escapeHtml(ticket.description)}</p>
                    <p><strong>Priority:</strong> ${escapeHtml(ticket.priority)}</p>
                    <p><strong>Status:</strong> ${escapeHtml(ticket.status)}</p>
                    <hr>
                    ${convHtml}
                    <hr>
                    <textarea id="ticketReplyMsg" rows="3" style="width:100%;padding:10px;margin:10px 0;" placeholder="Type your reply..."></textarea>
                    <select id="ticketStatusUpdate" style="padding:8px;margin-right:10px;">
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="closed">Closed</option>
                    </select>
                    <button onclick="sendTicketReply('${ticket.id}')" class="btn-action">Send Reply</button>
                </div>
            </div>
        </div>
    `;
    
    const existingModal = document.getElementById('ticketDetailModal');
    if (existingModal) existingModal.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

// Send Ticket Reply
window.sendTicketReply = async function(ticketId) {
    const message = document.getElementById('ticketReplyMsg')?.value;
    const newStatus = document.getElementById('ticketStatusUpdate')?.value;
    if (!message) { showFeedback('Please enter a message', 'warning'); return; }
    
    try {
        await sb.from('ticket_conversations').insert([{
            ticket_id: ticketId,
            author_id: currentUserProfile?.user_id || currentUserId,
            message: message,
            created_at: new Date().toISOString()
        }]);
        
        if (newStatus) {
            await sb.from('support_tickets').update({ status: newStatus }).eq('id', ticketId);
        }
        
        showFeedback('✅ Reply sent!', 'success');
        closeModal('ticketDetailModal');
        loadAdminTickets();
    } catch (error) {
        showFeedback(`Error: ${error.message}`, 'error');
    }
};

// =====================================================
// FEE ACCOUNTS - DISPLAY ONLY
// =====================================================
async function loadStudentBalances() {
    const tbody = document.getElementById('student-accounts-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8"><div class="loading-spinner"></div> Loading student balances...<\/td><\/tr>';
    
    const { data: students } = await sb.from('consolidated_user_profiles_table').select('*').eq('role', 'student').eq('status', 'approved');
    if (!students || students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8">No students found.<\/td><\/tr>';
        return;
    }
    
    let totalOutstanding = 0, totalCollected = 0, overdueCount = 0;
    tbody.innerHTML = '';
    
    for (const s of students) {
        const { data: feeConfig } = await sb.from('fee_structure').select('amount').eq('program', s.program).eq('block', s.block || 'Introductory').single();
        const totalDue = feeConfig?.amount || 0;
        const { data: payments } = await sb.from('fee_payments').select('amount, payment_date').eq('student_id', s.user_id);
        const totalPaid = payments ? payments.reduce((sum, p) => sum + parseFloat(p.amount), 0) : 0;
        const balance = totalDue - totalPaid;
        
        if (balance > 0) totalOutstanding += balance;
        totalCollected += totalPaid;
        
        let isOverdue = balance > 0;
        if (payments && payments.length) {
            const lastDate = new Date(payments[0].payment_date);
            if ((new Date() - lastDate) / (1000 * 3600 * 24) <= 30) isOverdue = false;
        }
        if (isOverdue && balance > 0) overdueCount++;
        
        const statusClass = balance <= 0 ? 'badge-success' : (isOverdue ? 'badge-danger' : 'badge-warning');
        const statusText = balance <= 0 ? 'Paid in Full' : (isOverdue ? 'Overdue' : 'Outstanding');
        
        tbody.innerHTML += `<tr>
            <td>${escapeHtml(s.full_name)}<\/td>
            <td>${s.user_id.substring(0, 8)}...<\/td>
            <td>${escapeHtml(getProgramDisplayName(s.program))}<\/td>
            <td>${escapeHtml(s.intake_year || '-')}<\/td>
            <td>KES ${totalDue.toLocaleString()}<\/td>
            <td>KES ${totalPaid.toLocaleString()}<\/td>
            <td class="${balance < 0 ? 'text-success' : 'text-danger'}">KES ${balance.toLocaleString()}<\/td>
            <td><span class="badge ${statusClass}">${statusText}<\/span><\/td>
        </tr>`;
    }
    
    document.getElementById('totalOutstandingBalance').innerHTML = `KES ${totalOutstanding.toLocaleString()}`;
    document.getElementById('totalCollected').innerHTML = `KES ${totalCollected.toLocaleString()}`;
    document.getElementById('overdueAccounts').innerText = overdueCount;
    
    const today = new Date().toISOString().split('T')[0];
    const { data: todayPayments } = await sb.from('fee_payments').select('amount').eq('payment_date', today);
    const todayTotal = todayPayments ? todayPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0) : 0;
    const todayEl = document.getElementById('todayCollections');
    if (todayEl) todayEl.innerHTML = `KES ${todayTotal.toLocaleString()}`;
}

window.exportAccountsToCSV = function() {
    exportTableToCSV('student-accounts-body', 'Student_Balances.csv');
};

// =====================================================
// SESSIONS MANAGEMENT
// =====================================================
async function loadScheduledSessions() {
    const tbody = document.getElementById('sessions-list');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5"><div class="loading-spinner"></div> Loading sessions...<\/td><\/tr>';
    
    const { data, error } = await sb.from('scheduled_sessions').select('*').order('session_date', { ascending: true });
    if (error) { tbody.innerHTML = `<tr><td colspan="5">Error: ${error.message}<\/td><\/tr>`; return; }
    if (!data || data.length === 0) { tbody.innerHTML = '<tr><td colspan="5">No sessions found.<\/td><\/tr>'; return; }
    
    tbody.innerHTML = '';
    data.forEach(s => {
        tbody.innerHTML += `<tr>
            <td>${escapeHtml(s.session_title)}<\/td>
            <td>${new Date(s.session_date).toLocaleDateString()}<\/td>
            <td>${s.session_time || 'All day'}<\/td>
            <td>${escapeHtml(s.target_program)}<\/td>
            <td><button class="btn-sm btn-delete" onclick="deleteSession('${s.id}')">Delete<\/button><\/td>
        </tr>`;
    });
}

// Add Session Form
document.getElementById('add-session-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const sessionData = {
        session_title: document.getElementById('session_title').value,
        session_date: document.getElementById('session_date').value,
        session_time: document.getElementById('session_start_time').value,
        session_end_date: document.getElementById('session_end_time').value || null,
        target_program: document.getElementById('session_program').value,
        session_type: 'class'
    };
    const { error } = await sb.from('scheduled_sessions').insert([sessionData]);
    if (error) {
        showFeedback(`Error: ${error.message}`, 'error');
    } else {
        showFeedback('✅ Session scheduled!', 'success');
        e.target.reset();
        loadScheduledSessions();
        renderFullCalendar();
    }
});

// Delete Session
window.deleteSession = async function(sessionId) {
    if (!confirm('Delete this session?')) return;
    const { error } = await sb.from('scheduled_sessions').delete().eq('id', sessionId);
    if (error) {
        showFeedback(`Error: ${error.message}`, 'error');
    } else {
        showFeedback('✅ Session deleted!', 'success');
        loadScheduledSessions();
        renderFullCalendar();
    }
};

// =====================================================
// ATTENDANCE MANAGEMENT
// =====================================================
async function loadAttendance() {
    const tbody = document.getElementById('attendance-table');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5"><div class="loading-spinner"></div> Loading attendance...<\/td><\/tr>';
    
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await sb.from('geo_attendance_logs').select('*, student:student_id(full_name)').gte('check_in_time', today).order('check_in_time', { ascending: false });
    
    if (error) { tbody.innerHTML = `<tr><td colspan="5">Error: ${error.message}<\/td><\/tr>`; return; }
    if (!data || data.length === 0) { tbody.innerHTML = '<tr><td colspan="5">No attendance records today.<\/td><\/tr>'; return; }
    
    tbody.innerHTML = '';
    data.forEach(r => {
        tbody.innerHTML += `<tr>
            <td>${escapeHtml(r.student?.full_name || 'Unknown')}<\/td>
            <td>${new Date(r.check_in_time).toLocaleDateString()}<\/td>
            <td>${escapeHtml(r.session_type)}<\/td>
            <td>${escapeHtml(r.location_name || 'N/A')}<\/td>
            <td>${r.is_verified ? '✅ Verified' : '⏳ Pending'}<\/td>
        </tr>`;
    });
}

// =====================================================
// EXAMS MANAGEMENT
// =====================================================
async function loadExams() {
    const tbody = document.getElementById('exams-list');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6"><div class="loading-spinner"></div> Loading exams...<\/td><\/tr>';
    
    const { data, error } = await sb.from('exams').select('*').order('exam_date');
    if (error) { tbody.innerHTML = `<tr><td colspan="6">Error: ${error.message}<\/td><\/tr>`; return; }
    if (!data || data.length === 0) { tbody.innerHTML = '<tr><td colspan="6">No exams found.<\/td><\/tr>'; return; }
    
    tbody.innerHTML = '';
    data.forEach(e => {
        tbody.innerHTML += `<tr>
            <td>${escapeHtml(e.exam_type)}<\/td>
            <td>${escapeHtml(e.exam_name)}<\/td>
            <td>${new Date(e.exam_date).toLocaleDateString()}<\/td>
            <td>${escapeHtml(e.target_program)}<\/td>
            <td>${escapeHtml(e.status)}<\/td>
            <td><button class="btn-sm btn-edit" onclick="openEditExamModal('${e.id}')">Edit<\/button>
                <button class="btn-sm btn-delete" onclick="deleteExam('${e.id}')">Delete<\/button>
                <button class="btn-sm btn-success" onclick="openGradeModal('${e.id}')">Grade<\/button><\/td>
        </tr>`;
    });
}

// Add Exam Form
document.getElementById('add-exam-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const examData = {
        exam_type: document.getElementById('exam_type').value,
        exam_name: document.getElementById('exam_title').value,
        exam_date: document.getElementById('exam_date').value,
        exam_start_time: document.getElementById('exam_time').value,
        target_program: document.getElementById('exam_program').value,
        status: 'Upcoming',
        duration_minutes: 60
    };
    const { error } = await sb.from('exams').insert([examData]);
    if (error) {
        showFeedback(`Error: ${error.message}`, 'error');
    } else {
        showFeedback('✅ Exam added!', 'success');
        e.target.reset();
        loadExams();
        renderFullCalendar();
    }
});

// Delete Exam
window.deleteExam = async function(examId) {
    if (!confirm('Delete this exam?')) return;
    const { error } = await sb.from('exams').delete().eq('id', examId);
    if (error) {
        showFeedback(`Error: ${error.message}`, 'error');
    } else {
        showFeedback('✅ Exam deleted!', 'success');
        loadExams();
        renderFullCalendar();
    }
};

// Open Edit Exam Modal
window.openEditExamModal = async function(examId) {
    const { data: exam } = await sb.from('exams').select('*').eq('id', examId).single();
    if (!exam) return;
    
    document.getElementById('edit_exam_id').value = exam.id;
    document.getElementById('edit_exam_title').value = exam.exam_name;
    document.getElementById('edit_exam_date').value = exam.exam_date;
    document.getElementById('edit_exam_start_time').value = exam.exam_start_time || '09:00';
    document.getElementById('edit_exam_duration').value = exam.duration_minutes || 60;
    document.getElementById('edit_exam_status').value = exam.status;
    document.getElementById('edit_exam_type').value = exam.exam_type;
    document.getElementById('edit_exam_link').value = exam.online_link || '';
    
    document.getElementById('examEditModal').style.display = 'flex';
};

// Save Edit Exam
document.getElementById('edit-exam-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const examId = document.getElementById('edit_exam_id').value;
    const updatedData = {
        exam_name: document.getElementById('edit_exam_title').value,
        exam_date: document.getElementById('edit_exam_date').value,
        exam_start_time: document.getElementById('edit_exam_start_time').value,
        duration_minutes: parseInt(document.getElementById('edit_exam_duration').value),
        status: document.getElementById('edit_exam_status').value,
        exam_type: document.getElementById('edit_exam_type').value,
        online_link: document.getElementById('edit_exam_link').value || null
    };
    
    const { error } = await sb.from('exams').update(updatedData).eq('id', examId);
    if (error) {
        showFeedback(`Error: ${error.message}`, 'error');
    } else {
        showFeedback('✅ Exam updated!', 'success');
        document.getElementById('examEditModal').style.display = 'none';
        loadExams();
        renderFullCalendar();
    }
});

// Grade Modal
window.openGradeModal = async function(examId) {
    const { data: exam } = await sb.from('exams').select('*').eq('id', examId).single();
    if (!exam) return;
    
    const { data: students } = await sb.from('consolidated_user_profiles_table').select('user_id, full_name, email').eq('program', exam.target_program).eq('role', 'student');
    if (!students || students.length === 0) { showFeedback('No students found for this exam', 'warning'); return; }
    
    const { data: existingGrades } = await sb.from('exam_grades').select('*').eq('exam_id', examId);
    const gradeMap = {};
    (existingGrades || []).forEach(g => { gradeMap[g.student_id] = g; });
    
    let tableRows = '';
    students.forEach(s => {
        const grade = gradeMap[s.user_id] || {};
        tableRows += `<tr data-student-id="${s.user_id}">
            <td>${escapeHtml(s.full_name)}</td>
            <td>${escapeHtml(s.email)}</td>
            <td><input type="number" class="grade-score" data-student="${s.user_id}" value="${grade.score || ''}" placeholder="Score" step="0.5" style="width:80px;"></td>
        </tr>`;
    });
    
    const modalHtml = `
        <div id="gradeModal" style="display:flex;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:10000;align-items:center;justify-content:center;">
            <div style="background:white;width:700px;max-width:90%;border-radius:12px;max-height:80vh;overflow-y:auto;">
                <div style="padding:15px;border-bottom:1px solid #ddd;display:flex;justify-content:space-between;">
                    <h3>Grade: ${escapeHtml(exam.exam_name)}</h3>
                    <button onclick="closeGradeModal()" style="background:none;border:none;font-size:24px;cursor:pointer;">&times;</button>
                </div>
                <div style="padding:15px;">
                    <table class="data-table" style="width:100%">
                        <thead><tr><th>Student</th><th>Email</th><th>Score</th></tr></thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                    <div style="margin-top:15px;text-align:right;">
                        <button onclick="saveGrades('${examId}')" class="btn-action">Save Grades</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const existingModal = document.getElementById('gradeModal');
    if (existingModal) existingModal.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

// Save Grades
window.saveGrades = async function(examId) {
    const rows = document.querySelectorAll('#gradeModal tbody tr');
    const grades = [];
    rows.forEach(row => {
        const studentId = row.getAttribute('data-student-id');
        const score = parseFloat(row.querySelector('.grade-score')?.value);
        if (studentId && !isNaN(score)) {
            grades.push({ exam_id: parseInt(examId), student_id: studentId, score: score, graded_by: currentUserProfile?.user_id });
        }
    });
    
    if (grades.length === 0) { showFeedback('No grades to save', 'warning'); return; }
    
    for (const grade of grades) {
        const { error } = await sb.from('exam_grades').upsert(grade, { onConflict: 'exam_id,student_id' });
        if (error) console.error('Grade save error:', error);
    }
    
    showFeedback(`✅ Saved ${grades.length} grades!`, 'success');
    closeGradeModal();
};

window.closeGradeModal = function() {
    const modal = document.getElementById('gradeModal');
    if (modal) modal.remove();
};

// =====================================================
// RESOURCES MANAGEMENT (WITH STORAGE UPLOAD)
// =====================================================
async function loadAllResources() {
    const tbody = document.getElementById('resources-list');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5"><div class="loading-spinner"></div> Loading resources...<\/td><\/tr>';
    
    const { data, error } = await sb.from('resources').select('*').order('created_at', { ascending: false });
    if (error) { tbody.innerHTML = `<tr><td colspan="5">Error: ${error.message}<\/td><\/tr>`; return; }
    if (!data || data.length === 0) { tbody.innerHTML = '<tr><td colspan="5">No resources found.<\/td><\/tr>'; return; }
    
    allResourcesData = data;
    tbody.innerHTML = '';
    data.forEach(r => {
        tbody.innerHTML += `<tr>
            <td>${escapeHtml(r.title)}<\/td>
            <td>${escapeHtml(r.program_type)}<\/td>
            <td>${escapeHtml(r.uploaded_by_name || 'Admin')}<\/td>
            <td>${new Date(r.created_at).toLocaleDateString()}<\/td>
            <td><a href="${r.file_url}" target="_blank" class="btn-sm btn-edit">View<\/a>
                <button class="btn-sm btn-delete" onclick="deleteResource('${r.id}')">Delete<\/button><\/td>
        </tr>`;
    });
}

// Upload Resource Form
document.getElementById('upload-resource-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = e.submitter;
    const originalText = btn.textContent;
    setButtonLoading(btn, true, originalText);
    
    const title = document.getElementById('resource_title').value;
    const program = document.getElementById('resource_program').value;
    const fileInput = document.getElementById('resource_file');
    
    if (!title || !program || !fileInput.files.length) {
        showFeedback('Please fill all fields and select a file', 'warning');
        setButtonLoading(btn, false, originalText);
        return;
    }
    
    const file = fileInput.files[0];
    const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = `resources/${program}/${fileName}`;
    
    try {
        // Upload to storage
        const { error: uploadError } = await sb.storage.from('resources').upload(filePath, file);
        if (uploadError) throw uploadError;
        
        // Get public URL
        const { data: { publicUrl } } = sb.storage.from('resources').getPublicUrl(filePath);
        
        // Save to database
        const { error: dbError } = await sb.from('resources').insert([{
            title: title,
            program_type: program,
            file_name: file.name,
            file_path: filePath,
            file_url: publicUrl,
            uploaded_by: currentUserProfile?.user_id,
            uploaded_by_name: currentUserProfile?.full_name || 'Admin',
            created_at: new Date().toISOString()
        }]);
        
        if (dbError) throw dbError;
        
        showFeedback('✅ Resource uploaded!', 'success');
        e.target.reset();
        loadAllResources();
    } catch (error) {
        showFeedback(`Error: ${error.message}`, 'error');
    } finally {
        setButtonLoading(btn, false, originalText);
    }
});

// Delete Resource
window.deleteResource = async function(resourceId) {
    if (!confirm('Delete this resource?')) return;
    
    const { data: resource } = await sb.from('resources').select('file_path').eq('id', resourceId).single();
    if (resource?.file_path) {
        await sb.storage.from('resources').remove([resource.file_path]);
    }
    
    const { error } = await sb.from('resources').delete().eq('id', resourceId);
    if (error) {
        showFeedback(`Error: ${error.message}`, 'error');
    } else {
        showFeedback('✅ Resource deleted!', 'success');
        loadAllResources();
    }
};

// =====================================================
// MESSAGES MANAGEMENT
// =====================================================
async function loadAdminMessages() {
    const tbody = document.getElementById('messages-list');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5"><div class="loading-spinner"></div> Loading messages...<\/td><\/tr>';
    
    const { data, error } = await sb.from('notifications').select('*').order('created_at', { ascending: false });
    if (error) { tbody.innerHTML = `<tr><td colspan="5">Error: ${error.message}<\/td><\/tr>`; return; }
    if (!data || data.length === 0) { tbody.innerHTML = '<tr><td colspan="5">No messages found.<\/td><\/tr>'; return; }
    
    tbody.innerHTML = '';
    data.forEach(m => {
        tbody.innerHTML += `</tr>
            <td>${escapeHtml(m.target_program || 'All')}<\/td>
            <td>${escapeHtml(m.subject)}<\/td>
            <td>${escapeHtml(m.sender_name || 'System')}<\/td>
            <td>${new Date(m.created_at).toLocaleDateString()}<\/td>
            <td><button class="btn-sm btn-edit" onclick="viewMessage('${m.id}')">View<\/button>
                <button class="btn-sm btn-delete" onclick="deleteMessage('${m.id}')">Delete<\/button><\/td>
        </tr>`;
    });
}

// Send Message Form
document.getElementById('send-message-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const messageData = {
        target_program: document.getElementById('msg_recipient').value === 'all' ? null : document.getElementById('msg_recipient').value,
        subject: document.getElementById('msg_subject').value,
        message: document.getElementById('msg_body').value,
        message_type: 'system',
        sender_name: currentUserProfile?.full_name || 'Admin',
        created_at: new Date().toISOString()
    };
    const { error } = await sb.from('notifications').insert([messageData]);
    if (error) {
        showFeedback(`Error: ${error.message}`, 'error');
    } else {
        showFeedback('✅ Message sent!', 'success');
        e.target.reset();
        loadAdminMessages();
    }
});

// View Message
window.viewMessage = async function(messageId) {
    const { data: msg } = await sb.from('notifications').select('*').eq('id', messageId).single();
    if (!msg) return;
    alert(`Subject: ${msg.subject}\n\nMessage: ${msg.message}\n\nSent to: ${msg.target_program || 'All Users'}\nDate: ${new Date(msg.created_at).toLocaleString()}`);
};

// Delete Message
window.deleteMessage = async function(messageId) {
    if (!confirm('Delete this message?')) return;
    const { error } = await sb.from('notifications').delete().eq('id', messageId);
    if (error) {
        showFeedback(`Error: ${error.message}`, 'error');
    } else {
        showFeedback('✅ Message deleted!', 'success');
        loadAdminMessages();
    }
};

// =====================================================
// CALENDAR
// =====================================================
async function renderFullCalendar() {
    const calendarEl = document.getElementById('fullCalendarDisplay');
    if (!calendarEl) return;
    calendarEl.innerHTML = '<div class="loading-spinner"></div><p>Loading calendar...</p>';
    
    const { data: sessions } = await sb.from('scheduled_sessions').select('*');
    const { data: exams } = await sb.from('exams').select('*');
    
    const events = [];
    (sessions || []).forEach(s => {
        events.push({ id: `session_${s.id}`, title: s.session_title, start: s.session_date + (s.session_time ? `T${s.session_time}` : ''), color: '#3498db' });
    });
    (exams || []).forEach(e => {
        events.push({ id: `exam_${e.id}`, title: `${e.exam_type}: ${e.exam_name}`, start: e.exam_date + (e.exam_start_time ? `T${e.exam_start_time}` : ''), color: '#e74c3c' });
    });
    
    if (typeof FullCalendar !== 'undefined') {
        if (mainCalendar) mainCalendar.destroy();
        mainCalendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' },
            events: events,
            height: 'auto'
        });
        mainCalendar.render();
    }
}

// =====================================================
// WELCOME EDITOR
// =====================================================
async function loadWelcomeMessageForEdit() {
    const { data } = await sb.from('app_settings').select('value').eq('key', 'student_welcome').single();
    const editor = document.getElementById('welcome-message-editor');
    const preview = document.getElementById('live-preview');
    const content = data?.value || '<p>Welcome to NCHSM Learning Portal!</p>';
    if (editor) editor.value = content;
    if (preview) preview.innerHTML = content;
}

document.getElementById('edit-welcome-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const content = document.getElementById('welcome-message-editor').value;
    const { error } = await sb.from('app_settings').upsert([{ key: 'student_welcome', value: content }]);
    if (error) {
        showFeedback(`Error: ${error.message}`, 'error');
    } else {
        showFeedback('✅ Welcome message saved!', 'success');
        document.getElementById('live-preview').innerHTML = content;
    }
});

// =====================================================
// SYSTEM HEALTH
// =====================================================
async function loadSystemHealth() {
    const { count: activeSessions } = await sb.from('user_sessions').select('*', { count: 'exact', head: true }).eq('is_active', true);
    document.getElementById('activeSessions').textContent = activeSessions || 0;
    
    document.getElementById('server-load-text').textContent = '42%';
    document.getElementById('db-query-time').textContent = 'Optimal';
    document.getElementById('storage-used').textContent = '58GB / 100GB';
    document.getElementById('api-response-time').textContent = '156ms avg';
}

// =====================================================
// USER ANALYTICS
// =====================================================
async function loadUserAnalytics() {
    const today = new Date().toISOString().split('T')[0];
    const { count: dailyActive } = await sb.from('geo_attendance_logs').select('*', { count: 'exact', head: true }).gte('check_in_time', today);
    document.getElementById('dailyActiveUsers').textContent = dailyActive || 0;
    document.getElementById('avgSessionDuration').textContent = '8.5m';
    document.getElementById('weeklyRetention').textContent = '76%';
    document.getElementById('featureAdoption').textContent = '62%';
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================
window.filterTable = function(inputId, tableId, columns) {
    const search = document.getElementById(inputId)?.value.toLowerCase() || '';
    const rows = document.querySelectorAll(`#${tableId} tr`);
    rows.forEach(row => {
        let match = false;
        columns.forEach(col => {
            const cell = row.cells[col];
            if (cell && cell.innerText.toLowerCase().includes(search)) match = true;
        });
        row.style.display = match ? '' : 'none';
    });
};

window.exportTableToCSV = function(tableId, filename) {
    const table = document.getElementById(tableId);
    if (!table) return;
    let csv = [];
    const rows = table.querySelectorAll('tr');
    for (let row of rows) {
        const rowData = [];
        const cols = row.querySelectorAll('td, th');
        for (let col of cols) rowData.push('"' + col.innerText.replace(/"/g, '""') + '"');
        csv.push(rowData.join(','));
    }
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
};

window.logout = async function() {
    await sb.auth.signOut();
    localStorage.clear();
    window.location.href = 'login.html';
};

// =====================================================
// INITIALIZATION
// =====================================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Admin Dashboard Initializing...');
    
    // Check authentication
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { window.location.href = 'login.html'; return; }
    
    // Get user profile
    const { data: profile } = await sb.from('consolidated_user_profiles_table').select('*').eq('user_id', session.user.id).single();
    if (profile) {
        currentUserProfile = profile;
        currentUserId = session.user.id;
        if (profile.role === 'superadmin') { window.location.href = 'super_admin.html'; return; }
        const welcomeHeader = document.getElementById('welcomeHeader');
        if (welcomeHeader) welcomeHeader.textContent = `Welcome, ${profile.full_name || 'Admin'}!`;
    }
    
    // Initialize program dropdowns
    initializeAllProgramDropdowns();
    
    // Initialize block term options
    updateBlockTermOptions('account-program', 'account-block-term');
    updateBlockTermOptions('course-program', 'course-block');
    updateBlockTermOptions('edit_user_program', 'edit_user_block');
    updateBlockTermOptions('exam_program', 'exam-block-term');
    updateBlockTermOptions('resource_program', 'resource-block');
    
    // Mobile nav toggle
    const mobileToggle = document.getElementById('mobileNavToggle');
    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('active');
        });
    }
    
    // Close modals on outside click
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
    
    // Load dashboard data
    loadDashboardData();
    
    // Set initial display
    document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
    document.getElementById('dashboard').style.display = 'block';
    
    console.log('✅ Admin Dashboard Ready');
});

// Add Course Edit Modal to HTML dynamically if not exists
if (!document.getElementById('courseEditModal')) {
    const modalHtml = `
        <div id="courseEditModal" class="modal">
            <div class="modal-content">
                <div class="modal-header"><h3>Edit Course</h3><span class="close" onclick="closeModal('courseEditModal')">&times;</span></div>
                <form id="edit-course-form">
                    <input type="hidden" id="edit_course_id">
                    <label>Course Name</label><input type="text" id="edit_course_name" required>
                    <label>Unit Code</label><input type="text" id="edit_course_unit_code">
                    <label>Description</label><textarea id="edit_course_description" rows="3"></textarea>
                    <label>Program</label><select id="edit_course_program"><option value="KRCHN">KRCHN</option><option value="TVET">TVET</option></select>
                    <label>Intake Year</label><input type="text" id="edit_course_intake">
                    <label>Block</label><select id="edit_course_block"><option value="General">General</option></select>
                    <div class="modal-actions"><button type="submit" class="btn-action">Save Changes</button></div>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Add Exam Edit Modal to HTML dynamically if not exists
if (!document.getElementById('examEditModal')) {
    const examModalHtml = `
        <div id="examEditModal" class="modal">
            <div class="modal-content">
                <div class="modal-header"><h3>Edit Exam</h3><span class="close" onclick="closeModal('examEditModal')">&times;</span></div>
                <form id="edit-exam-form">
                    <input type="hidden" id="edit_exam_id">
                    <label>Exam Title</label><input type="text" id="edit_exam_title" required>
                    <label>Exam Type</label><select id="edit_exam_type"><option>CAT</option><option>EXAM</option><option>ASSIGNMENT</option></select>
                    <label>Date</label><input type="date" id="edit_exam_date" required>
                    <label>Start Time</label><input type="time" id="edit_exam_start_time">
                    <label>Duration (minutes)</label><input type="number" id="edit_exam_duration" value="60">
                    <label>Status</label><select id="edit_exam_status"><option>Upcoming</option><option>InProgress</option><option>Completed</option></select>
                    <label>Online Link</label><input type="url" id="edit_exam_link">
                    <div class="modal-actions"><button type="submit" class="btn-action">Save Changes</button></div>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', examModalHtml);
}

// Add Fee Block filter function
window.filterByBalanceStatus = function() {
    const filter = document.getElementById('account_balance_filter')?.value || 'all';
    const rows = document.querySelectorAll('#student-accounts-body tr');
    rows.forEach(row => {
        if (row.cells.length < 8) return;
        const balanceText = row.cells[6]?.innerText.replace('KES', '').replace(/,/g, '').trim();
        const balance = parseFloat(balanceText);
        const statusText = row.cells[7]?.innerText;
        let show = true;
        if (filter === 'positive') show = balance < 0;
        else if (filter === 'zero') show = balance === 0;
        else if (filter === 'negative') show = balance > 0;
        else if (filter === 'overdue') show = statusText?.includes('Overdue');
        row.style.display = show ? '' : 'none';
    });
};

// Add fee account search
window.searchStudentAccount = function() {
    const search = document.getElementById('account_search')?.value.toLowerCase() || '';
    const rows = document.querySelectorAll('#student-accounts-body tr');
    rows.forEach(row => {
        const name = row.cells[0]?.innerText.toLowerCase() || '';
        const id = row.cells[1]?.innerText.toLowerCase() || '';
        row.style.display = (name.includes(search) || id.includes(search)) ? '' : 'none';
    });
};

// Add event listeners for fee filters
document.getElementById('account_balance_filter')?.addEventListener('change', window.filterByBalanceStatus);
document.getElementById('account_search')?.addEventListener('keyup', window.searchStudentAccount);
