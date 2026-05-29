// ========== ADMIN DASHBOARD SCRIPT ==========
// Supabase Configuration
const SUPABASE_URL = 'https://lwhtjozfsmbyihenfunw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.sb = sb;

let currentUserProfile = null;
let currentUserId = null;
let usersData = [];
let coursesData = [];
let ticketsData = [];

// ========== UTILITY FUNCTIONS ==========
function $(id) { return document.getElementById(id); }

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function showFeedback(message, type = 'success') {
    alert(message);
}

async function logAudit(action_type, details, target_id = null, status = 'SUCCESS') {
    console.log(`📝 AUDIT: ${action_type} - ${details}`);
}

// ========== TAB NAVIGATION ==========
window.showTab = function(tabId) {
    console.log('Opening tab:', tabId);
    
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
        if (link.getAttribute('data-tab') === tabId) {
            link.classList.add('active');
        }
    });
    
    loadSectionData(tabId);
};

function loadSectionData(tabId) {
    switch(tabId) {
        case 'dashboard': loadDashboardStats(); break;
        case 'users': loadUsers(); break;
        case 'pending': loadPendingApprovals(); break;
        case 'courses': loadCourses(); break;
        case 'unit-management': loadUnits(); break;
        case 'support-tickets': loadTickets(); break;
        case 'fee-accounts': loadFeeAccounts(); break;
        case 'attendance': loadAttendance(); break;
        case 'cats': loadExams(); break;
        case 'resources': loadResources(); break;
        case 'messages': loadMessages(); break;
        case 'calendar': initCalendar(); break;
        case 'welcome-editor': loadWelcomeMessage(); break;
    }
}

// ========== DASHBOARD ==========
async function loadDashboardStats() {
    try {
        const { count: totalUsers } = await sb.from('consolidated_user_profiles_table').select('*', { count: 'exact', head: true });
        const { count: pendingCount } = await sb.from('consolidated_user_profiles_table').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        const { count: studentsCount } = await sb.from('consolidated_user_profiles_table').select('*', { count: 'exact', head: true }).eq('role', 'student');
        const { count: coursesCount } = await sb.from('courses').select('*', { count: 'exact', head: true });
        
        const totalUsersEl = document.getElementById('totalUsers');
        const pendingApprovalsEl = document.getElementById('pendingApprovals');
        const totalStudentsEl = document.getElementById('totalStudents');
        const totalCoursesEl = document.getElementById('totalCourses');
        
        if (totalUsersEl) totalUsersEl.textContent = totalUsers || 0;
        if (pendingApprovalsEl) pendingApprovalsEl.textContent = pendingCount || 0;
        if (totalStudentsEl) totalStudentsEl.textContent = studentsCount || 0;
        if (totalCoursesEl) totalCoursesEl.textContent = coursesCount || 0;
        
        // Load daily check-ins
        const today = new Date().toISOString().split('T')[0];
        const { count: checkIns } = await sb.from('geo_attendance_logs').select('*', { count: 'exact', head: true }).gte('check_in_time', today);
        const dailyCheckIns = document.getElementById('totalDailyCheckIns');
        if (dailyCheckIns) dailyCheckIns.textContent = checkIns || 0;
        
    } catch (error) {
        console.error('Dashboard error:', error);
    }
}

// ========== USERS MANAGEMENT ==========
async function loadUsers() {
    const tbody = document.getElementById('users-table');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="7"><div class="loading-spinner"></div> Loading users...</td></tr>';
    
    const { data, error } = await sb.from('consolidated_user_profiles_table')
        .select('*')
        .neq('role', 'superadmin')
        .order('full_name');
    
    if (error) {
        tbody.innerHTML = `<tr><td colspan="7">Error: ${error.message}</td></tr>`;
        return;
    }
    
    usersData = data || [];
    tbody.innerHTML = '';
    
    usersData.forEach(u => {
        const statusClass = u.status === 'approved' ? 'badge-success' : 'badge-warning';
        tbody.innerHTML += `
            <tr>
                <td>${u.user_id?.substring(0, 8)}...</td>
                <td>${escapeHtml(u.full_name)}</td>
                <td>${escapeHtml(u.email)}</td>
                <td>${escapeHtml(u.role)}</td>
                <td>${escapeHtml(u.program)}</td>
                <td><span class="badge ${statusClass}">${u.status}</span></td>
                <td>
                    <button class="btn-sm btn-edit" onclick="openEditUserModal('${u.user_id}')">Edit</button>
                    <button class="btn-sm btn-delete" onclick="deleteUser('${u.user_id}', '${escapeHtml(u.full_name)}')">Delete</button>
                </td>
            </tr>
        `;
    });
}

async function loadPendingApprovals() {
    const tbody = document.getElementById('pending-table');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="6"><div class="loading-spinner"></div> Loading...</td></tr>';
    
    const { data, error } = await sb.from('consolidated_user_profiles_table')
        .select('*')
        .eq('status', 'pending')
        .order('created_at');
    
    if (error) {
        tbody.innerHTML = `<tr><td colspan="6">Error: ${error.message}</td></tr>`;
        return;
    }
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">No pending approvals.</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    data.forEach(u => {
        tbody.innerHTML += `
            <tr>
                <td>${escapeHtml(u.full_name)}</td>
                <td>${escapeHtml(u.email)}</td>
                <td>${escapeHtml(u.role)}</td>
                <td>${escapeHtml(u.program)}</td>
                <td>${new Date(u.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn-sm btn-success" onclick="approveUser('${u.user_id}', '${escapeHtml(u.full_name)}')">Approve</button>
                    <button class="btn-sm btn-delete" onclick="deleteUser('${u.user_id}', '${escapeHtml(u.full_name)}', true)">Reject</button>
                </td>
            </tr>
        `;
    });
}

async function approveUser(userId, fullName) {
    if (!confirm(`Approve user ${fullName}?`)) return;
    
    try {
        const { error } = await sb.from('consolidated_user_profiles_table')
            .update({ status: 'approved', updated_at: new Date().toISOString() })
            .eq('user_id', userId);
        
        if (error) throw error;
        
        showFeedback(`✅ User ${fullName} approved successfully!`, 'success');
        loadPendingApprovals();
        loadUsers();
        loadDashboardStats();
        
    } catch (error) {
        showFeedback(`Error: ${error.message}`, 'error');
    }
}

async function deleteUser(userId, fullName, isRejection = false) {
    const action = isRejection ? 'reject' : 'delete';
    if (!confirm(`Are you sure you want to ${action} ${fullName}?`)) return;
    
    try {
        const { error } = await sb.from('consolidated_user_profiles_table').delete().eq('user_id', userId);
        if (error) throw error;
        
        showFeedback(`✅ User ${fullName} ${action}ed successfully!`, 'success');
        loadPendingApprovals();
        loadUsers();
        loadDashboardStats();
        
    } catch (error) {
        showFeedback(`Error: ${error.message}`, 'error');
    }
}

async function openEditUserModal(userId) {
    try {
        const { data, error } = await sb.from('consolidated_user_profiles_table')
            .select('*')
            .eq('user_id', userId)
            .single();
        
        if (error) throw error;
        
        document.getElementById('edit_user_id').value = data.user_id;
        document.getElementById('edit_user_id_display').textContent = data.user_id.substring(0, 8);
        document.getElementById('edit_user_name').value = data.full_name || '';
        document.getElementById('edit_user_email').value = data.email || '';
        document.getElementById('edit_user_role').value = data.role || 'student';
        document.getElementById('edit_user_program').value = data.program || 'KRCHN';
        document.getElementById('edit_user_intake').value = data.intake_year || '2024';
        document.getElementById('edit_user_block_status').value = data.block_program_year ? 'true' : 'false';
        
        // Update block options based on program
        updateBlockOptions(data.program);
        setTimeout(() => {
            document.getElementById('edit_user_block').value = data.block || '';
        }, 100);
        
        document.getElementById('userEditModal').style.display = 'flex';
        
    } catch (error) {
        showFeedback(`Error loading user: ${error.message}`, 'error');
    }
}

function updateBlockOptions(program) {
    const blockSelect = document.getElementById('edit_user_block');
    if (!blockSelect) return;
    
    const isTVET = program !== 'KRCHN';
    blockSelect.innerHTML = '<option value="">-- Select Block/Term --</option>';
    
    if (isTVET) {
        const terms = ['Introductory', 'Term1', 'Term2', 'Term3', 'Term4', 'Term5', 'Term6'];
        terms.forEach(term => {
            const option = document.createElement('option');
            option.value = term;
            option.textContent = term;
            blockSelect.appendChild(option);
        });
    } else {
        const blocks = ['Introductory', 'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Block 6', 'Final'];
        blocks.forEach(block => {
            const option = document.createElement('option');
            option.value = block;
            option.textContent = block;
            blockSelect.appendChild(option);
        });
    }
}

document.getElementById('edit-user-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
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
        
        showFeedback('✅ User updated successfully!', 'success');
        document.getElementById('userEditModal').style.display = 'none';
        loadUsers();
        
    } catch (error) {
        showFeedback(`Error: ${error.message}`, 'error');
    }
});

// ========== ENROLL ACCOUNTS ==========
document.getElementById('add-account-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const name = document.getElementById('account-name').value;
    const email = document.getElementById('account-email').value;
    const password = document.getElementById('account-password').value;
    const role = document.getElementById('account-role').value;
    const phone = document.getElementById('account-phone').value;
    const program = document.getElementById('account-program').value;
    const intake = document.getElementById('account-intake').value;
    
    try {
        const { data: { user }, error } = await sb.auth.signUp({
            email, password,
            options: { data: { full_name: name, role, phone, program, intake_year: intake, status: 'approved' } }
        });
        
        if (error) throw error;
        
        if (user) {
            await sb.from('consolidated_user_profiles_table').insert([{
                user_id: user.id, email, full_name: name, role, phone, program, intake_year: intake, status: 'approved'
            }]);
        }
        
        showFeedback(`✅ Account created for ${name}!`, 'success');
        this.reset();
        loadUsers();
        loadDashboardStats();
        
    } catch (error) {
        showFeedback(`Error: ${error.message}`, 'error');
    }
});

// ========== COURSES ==========
async function loadCourses() {
    const tbody = document.getElementById('courses-table');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="5">Loading courses...</td></tr>';
    
    const { data, error } = await sb.from('courses').select('*').order('course_name');
    if (error) {
        tbody.innerHTML = `<tr><td colspan="5">Error: ${error.message}</td></tr>`;
        return;
    }
    
    coursesData = data || [];
    tbody.innerHTML = '';
    
    coursesData.forEach(c => {
        tbody.innerHTML += `
            <tr>
                <td>${escapeHtml(c.course_name)}</td>
                <td>${escapeHtml(c.unit_code)}</td>
                <td>${escapeHtml(c.target_program)}</td>
                <td>${escapeHtml(c.intake_year)}</td>
                <td>
                    <button class="btn-sm btn-edit" onclick="editCourse('${c.id}')">Edit</button>
                    <button class="btn-sm btn-delete" onclick="deleteCourse('${c.id}', '${escapeHtml(c.course_name)}')">Delete</button>
                </td>
            </tr>
        `;
    });
}

document.getElementById('add-course-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const courseData = {
        course_name: document.getElementById('course-name').value,
        unit_code: document.getElementById('course-unit-code').value,
        description: document.getElementById('course-description').value,
        target_program: document.getElementById('course-program').value,
        intake_year: document.getElementById('course-intake').value,
        status: 'Active'
    };
    
    const { error } = await sb.from('courses').insert([courseData]);
    if (error) {
        showFeedback(`Error: ${error.message}`, 'error');
    } else {
        showFeedback('✅ Course added successfully!', 'success');
        this.reset();
        loadCourses();
    }
});

// ========== UNITS ==========
async function loadUnits() {
    const container = document.getElementById('units-list-container');
    if (!container) return;
    
    container.innerHTML = '<div class="loading-spinner"></div><p>Loading units...</p>';
    
    const { data, error } = await sb.from('units_catalog').select('*').order('block');
    if (error) {
        container.innerHTML = `<p>Error: ${error.message}</p>`;
        return;
    }
    
    if (!data || data.length === 0) {
        container.innerHTML = '<p>No units found.</p>';
        return;
    }
    
    let html = '<div class="units-grid">';
    data.forEach(unit => {
        html += `
            <div class="unit-card">
                <div class="unit-header">
                    <div>
                        <span class="unit-code">${escapeHtml(unit.unit_code)}</span>
                        <span class="unit-name">${escapeHtml(unit.unit_name)}</span>
                    </div>
                </div>
                <div class="unit-meta">
                    <span>${escapeHtml(unit.program)}</span>
                    <span>${escapeHtml(unit.block)}</span>
                    <span>Year: ${unit.year || 'N/A'}</span>
                    <span>${unit.credits || 3} Credits</span>
                </div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

// ========== TICKETS ==========
async function loadTickets() {
    const tbody = document.getElementById('admin-tickets-body');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="7">Loading tickets...</td></tr>';
    
    const { data, error } = await sb.from('support_tickets').select('*').order('created_at', { ascending: false });
    if (error) {
        tbody.innerHTML = `<tr><td colspan="7">Error: ${error.message}</td></tr>`;
        return;
    }
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">No tickets found.</td></tr>';
        return;
    }
    
    // Get student names
    const studentIds = [...new Set(data.map(t => t.student_id))];
    let studentNames = {};
    const { data: profiles } = await sb.from('consolidated_user_profiles_table').select('user_id, full_name').in('user_id', studentIds);
    if (profiles) profiles.forEach(p => studentNames[p.user_id] = p.full_name);
    
    tbody.innerHTML = '';
    data.forEach(ticket => {
        const statusClass = ticket.status === 'open' ? 'badge-warning' : ticket.status === 'in_progress' ? 'badge-info' : 'badge-success';
        tbody.innerHTML += `
            <tr>
                <td>${escapeHtml(ticket.ticket_number)}</td>
                <td>${escapeHtml(studentNames[ticket.student_id] || 'Unknown')}</td>
                <td>${escapeHtml(ticket.subject)}</td>
                <td><span class="badge ${ticket.priority === 'urgent' ? 'badge-danger' : 'badge-info'}">${escapeHtml(ticket.priority)}</span></td>
                <td><span class="badge ${statusClass}">${escapeHtml(ticket.status)}</span></td>
                <td>${new Date(ticket.created_at).toLocaleDateString()}</td>
                <td><button class="btn-sm btn-edit" onclick="viewTicket('${ticket.id}')">View</button></td>
            </tr>
        `;
    });
    
    // Update counts
    const openCount = data.filter(t => t.status === 'open').length;
    const progressCount = data.filter(t => t.status === 'in_progress').length;
    const closedCount = data.filter(t => t.status === 'closed').length;
    const urgentCount = data.filter(t => t.priority === 'urgent').length;
    
    document.getElementById('admin_open_tickets').textContent = openCount;
    document.getElementById('admin_progress_tickets').textContent = progressCount;
    document.getElementById('admin_closed_tickets').textContent = closedCount;
    document.getElementById('admin_urgent_tickets').textContent = urgentCount;
}

// ========== FEE ACCOUNTS ==========
async function loadFeeAccounts() {
    const tbody = document.getElementById('student-accounts-body');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="7">Loading accounts...</td></tr>';
    
    const { data: students } = await sb.from('consolidated_user_profiles_table').select('*').eq('role', 'student').eq('status', 'approved');
    if (!students || students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">No students found.</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    for (const s of students) {
        const { data: payments } = await sb.from('fee_payments').select('amount').eq('student_id', s.user_id);
        const totalPaid = payments ? payments.reduce((sum, p) => sum + parseFloat(p.amount), 0) : 0;
        const totalDue = 45000; // Default fee
        const balance = totalDue - totalPaid;
        const statusClass = balance <= 0 ? 'badge-success' : 'badge-warning';
        const statusText = balance <= 0 ? 'Paid' : 'Outstanding';
        
        tbody.innerHTML += `
            <tr>
                <td>${escapeHtml(s.full_name)}</td>
                <td>${s.user_id.substring(0, 8)}...</td>
                <td>KES ${totalDue.toLocaleString()}</td>
                <td>KES ${totalPaid.toLocaleString()}</td>
                <td>KES ${balance.toLocaleString()}</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td><button class="btn-sm btn-edit" onclick="viewPaymentHistory('${s.user_id}')">History</button></td>
            </tr>
        `;
    }
}

// ========== ATTENDANCE ==========
async function loadAttendance() {
    const tbody = document.getElementById('attendance-table');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="5">Loading attendance...</td></tr>';
    
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await sb.from('geo_attendance_logs')
        .select('*, student:student_id(full_name)')
        .gte('check_in_time', today)
        .order('check_in_time', { ascending: false });
    
    if (error) {
        tbody.innerHTML = `<tr><td colspan="5">Error: ${error.message}</td></tr>`;
        return;
    }
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No attendance records today.</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    data.forEach(record => {
        const studentName = record.student?.full_name || 'Unknown';
        tbody.innerHTML += `
            <tr>
                <td>${escapeHtml(studentName)}</td>
                <td>${new Date(record.check_in_time).toLocaleDateString()}</td>
                <td>${escapeHtml(record.session_type)}</td>
                <td>${escapeHtml(record.location_name || 'N/A')}</td>
                <td>${record.is_verified ? '✅ Verified' : '⏳ Pending'}</td>
            </tr>
        `;
    });
}

// ========== EXAMS ==========
async function loadExams() {
    const tbody = document.getElementById('exams-list');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="6">Loading exams...</td></tr>';
    
    const { data, error } = await sb.from('exams').select('*').order('exam_date');
    if (error) {
        tbody.innerHTML = `<tr><td colspan="6">Error: ${error.message}</td></tr>`;
        return;
    }
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">No exams found.</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    data.forEach(exam => {
        tbody.innerHTML += `
            <tr>
                <td>${escapeHtml(exam.exam_type)}</td>
                <td>${escapeHtml(exam.exam_name)}</td>
                <td>${new Date(exam.exam_date).toLocaleDateString()}</td>
                <td>${escapeHtml(exam.target_program)}</td>
                <td>${escapeHtml(exam.status)}</td>
                <td>
                    <button class="btn-sm btn-edit" onclick="editExam('${exam.id}')">Edit</button>
                    <button class="btn-sm btn-delete" onclick="deleteExam('${exam.id}', '${escapeHtml(exam.exam_name)}')">Delete</button>
                 </td>
            </tr>
        `;
    });
}

// ========== RESOURCES ==========
async function loadResources() {
    const tbody = document.getElementById('resources-list');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="5">Loading resources...</td></tr>';
    
    const { data, error } = await sb.from('resources').select('*').order('created_at', { ascending: false });
    if (error) {
        tbody.innerHTML = `<tr><td colspan="5">Error: ${error.message}</td></tr>`;
        return;
    }
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No resources found.</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    data.forEach(res => {
        tbody.innerHTML += `
            <tr>
                <td>${escapeHtml(res.title)}</td>
                <td>${escapeHtml(res.program_type)}</td>
                <td>${escapeHtml(res.uploaded_by_name || 'Admin')}</td>
                <td>${new Date(res.created_at).toLocaleDateString()}</td>
                <td>
                    <a href="${res.file_url}" target="_blank" class="btn-sm btn-edit">View</a>
                 </td>
            </tr>
        `;
    });
}

// ========== MESSAGES ==========
async function loadMessages() {
    const tbody = document.getElementById('messages-list');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="5">Loading messages...</td></tr>';
    
    const { data, error } = await sb.from('notifications').select('*').order('created_at', { ascending: false });
    if (error) {
        tbody.innerHTML = `<tr><td colspan="5">Error: ${error.message}</td></tr>`;
        return;
    }
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No messages found.</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    data.forEach(msg => {
        tbody.innerHTML += `
            <tr>
                <td>${escapeHtml(msg.target_program || 'All')}</td>
                <td>${escapeHtml(msg.subject)}</td>
                <td>${escapeHtml(msg.sender_name || 'System')}</td>
                <td>${new Date(msg.created_at).toLocaleDateString()}</td>
                <td><button class="btn-sm btn-edit" onclick="viewMessage('${msg.id}')">View</button></td>
            </tr>
        `;
    });
}

// ========== CALENDAR ==========
function initCalendar() {
    const calendarEl = document.getElementById('fullCalendarDisplay');
    if (!calendarEl) return;
    
    if (window.mainCalendar) window.mainCalendar.destroy();
    
    window.mainCalendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' },
        height: 'auto'
    });
    window.mainCalendar.render();
}

// ========== WELCOME MESSAGE ==========
async function loadWelcomeMessage() {
    const editor = document.getElementById('welcome-message-editor');
    const preview = document.getElementById('live-preview');
    
    const { data } = await sb.from('app_settings').select('value').eq('key', 'student_welcome').single();
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

// ========== UTILITY FUNCTIONS ==========
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

window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
};

window.logout = function() {
    sb.auth.signOut();
    window.location.href = 'login.html';
};

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Admin Dashboard Initializing...');
    
    // Check session
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }
    
    // Get user profile
    const { data: profile } = await sb.from('consolidated_user_profiles_table')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
    
    if (profile) {
        currentUserProfile = profile;
        currentUserId = session.user.id;
        
        // Check if user is admin (not super admin)
        if (profile.role === 'superadmin') {
            window.location.href = 'super_admin.html';
            return;
        }
        
        document.querySelector('header h1').textContent = `Welcome, ${profile.full_name || 'Admin'}!`;
    }
    
    // Load initial data
    loadDashboardStats();
    
    // Mobile nav toggle
    const toggle = document.getElementById('mobileNavToggle');
    if (toggle) {
        toggle.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('active');
        });
    }
    
    // Set initial active tab display
    document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
    document.getElementById('dashboard').style.display = 'block';
});
