// =====================================================
// COMPLETE ADMIN DASHBOARD SCRIPT - NO DUPLICATES
// =====================================================

// Supabase Configuration - Use const instead of let to avoid redeclaration
const SUPABASE_URL = 'https://lwhtjozfsmbyihenfunw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk';

// Use different variable names to avoid conflicts
let sbClient = null;
let currentAdminProfile = null;
let allUnitsData = [];

// =====================================================
// INITIALIZATION
// =====================================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Admin Dashboard Initializing...');
    
    // Initialize Supabase client
    if (typeof window.supabase !== 'undefined') {
        sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase initialized');
    } else {
        console.error('❌ Supabase library not loaded');
        return;
    }
    
    await checkAdminAuth();
    initSidebarNavigation();
    initMobileToggle();
    initForms();
    loadDashboardStats();
    
    console.log('✅ Admin Dashboard Ready');
});

// =====================================================
// CHECK AUTHENTICATION
// =====================================================
async function checkAdminAuth() {
    try {
        const { data: { session } } = await sbClient.auth.getSession();
        if (!session) {
            window.location.href = 'login.html';
            return;
        }
        
        const { data: profile } = await sbClient
            .from('consolidated_user_profiles_table')
            .select('*')
            .eq('email', session.user.email)
            .single();
        
        if (profile) {
            currentAdminProfile = profile;
            const welcomeHeader = document.querySelector('header h1');
            if (welcomeHeader && profile.full_name) {
                welcomeHeader.textContent = `Welcome, ${profile.full_name}!`;
            }
            
            // Redirect super admin to their dashboard
            if (profile.role === 'superadmin' || profile.role === 'super_admin') {
                window.location.href = 'super_admin.html';
                return;
            }
            
            // Update admin badge
            const adminBadge = document.querySelector('.admin-badge');
            if (adminBadge) {
                adminBadge.textContent = `Admin - ${profile.email}`;
            }
        }
    } catch (error) {
        console.error('Auth error:', error);
        window.location.href = 'login.html';
    }
}

// =====================================================
// SIDEBAR NAVIGATION - FIXED
// =====================================================
function initSidebarNavigation() {
    const navLinks = document.querySelectorAll('.nav a');
    const tabs = document.querySelectorAll('.tab-content');
    
    console.log(`Found ${navLinks.length} nav links`);
    
    navLinks.forEach(link => {
        // Remove any existing listeners by cloning
        const newLink = link.cloneNode(true);
        link.parentNode.replaceChild(newLink, link);
        
        newLink.addEventListener('click', function(e) {
            e.preventDefault();
            const tabId = this.getAttribute('data-tab');
            console.log('Clicked tab:', tabId);
            
            // Update active class on nav links
            document.querySelectorAll('.nav a').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            // Hide all tabs
            tabs.forEach(tab => {
                tab.classList.remove('active');
                tab.style.display = 'none';
            });
            
            // Show selected tab
            const targetTab = document.getElementById(tabId);
            if (targetTab) {
                targetTab.classList.add('active');
                targetTab.style.display = 'block';
                loadTabContent(tabId);
            }
        });
    });
    
    // Make sure dashboard is visible by default
    const dashboardTab = document.getElementById('dashboard');
    if (dashboardTab) {
        dashboardTab.style.display = 'block';
        dashboardTab.classList.add('active');
    }
}

function loadTabContent(tabId) {
    switch(tabId) {
        case 'dashboard': loadDashboardStats(); break;
        case 'users': loadUsersList(); break;
        case 'pending': loadPendingList(); break;
        case 'courses': loadCoursesList(); break;
        case 'unit-management': loadUnitsList(); break;
        case 'support-tickets': loadTicketsList(); break;
        case 'fee-accounts': loadFeeAccountsList(); break;
        case 'attendance': loadAttendanceList(); break;
        case 'cats': loadExamsList(); break;
        case 'resources': loadResourcesList(); break;
        case 'messages': loadMessagesList(); break;
        case 'calendar': initCalendarView(); break;
        case 'welcome-editor': loadWelcomeMessageEditor(); break;
    }
}

function initMobileToggle() {
    const toggle = document.getElementById('mobileNavToggle');
    const sidebar = document.getElementById('sidebar');
    if (toggle && sidebar) {
        toggle.addEventListener('click', () => sidebar.classList.toggle('active'));
    }
}

function initForms() {
    const addAccountForm = document.getElementById('add-account-form');
    if (addAccountForm) addAccountForm.addEventListener('submit', handleAddNewAccount);
    
    const addCourseForm = document.getElementById('add-course-form');
    if (addCourseForm) addCourseForm.addEventListener('submit', handleAddNewCourse);
    
    const editWelcomeForm = document.getElementById('edit-welcome-form');
    if (editWelcomeForm) editWelcomeForm.addEventListener('submit', handleSaveWelcomeMsg);
}

// =====================================================
// DASHBOARD STATS
// =====================================================
async function loadDashboardStats() {
    try {
        const { count: totalUsers } = await sbClient
            .from('consolidated_user_profiles_table')
            .select('*', { count: 'exact', head: true });
        
        const { count: pendingCount } = await sbClient
            .from('consolidated_user_profiles_table')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');
        
        const { count: studentsCount } = await sbClient
            .from('consolidated_user_profiles_table')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'student');
        
        const { count: coursesCount } = await sbClient
            .from('courses')
            .select('*', { count: 'exact', head: true });
        
        const { count: unitsCount } = await sbClient
            .from('units_catalog')
            .select('*', { count: 'exact', head: true });
        
        const { count: openTickets } = await sbClient
            .from('support_tickets')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'open');
        
        const today = new Date().toISOString().split('T')[0];
        const { count: checkIns } = await sbClient
            .from('geo_attendance_logs')
            .select('*', { count: 'exact', head: true })
            .gte('check_in_time', today);
        
        const elements = {
            totalUsers: totalUsers || 0,
            pendingApprovals: pendingCount || 0,
            totalStudents: studentsCount || 0,
            totalCourses: coursesCount || 0,
            dashboardTotalUnits: unitsCount || 0,
            dashboardOpenTickets: openTickets || 0,
            totalDailyCheckIns: checkIns || 0
        };
        
        for (const [id, value] of Object.entries(elements)) {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        }
        
        console.log('Dashboard stats loaded');
    } catch (error) {
        console.error('Dashboard error:', error);
    }
}

// =====================================================
// USERS MANAGEMENT
// =====================================================
async function loadUsersList() {
    const tbody = document.getElementById('users-table');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="7"><div class="loading-spinner"></div> Loading users...<\/td><\/tr>';
    
    const { data, error } = await sbClient
        .from('consolidated_user_profiles_table')
        .select('*')
        .neq('role', 'superadmin')
        .order('full_name');
    
    if (error) {
        tbody.innerHTML = `<tr><td colspan="7">Error: ${error.message}<\/td><\/tr>`;
        return;
    }
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">No users found.<\/td><\/tr>';
        return;
    }
    
    tbody.innerHTML = '';
    data.forEach(user => {
        const statusClass = user.status === 'approved' ? 'badge-success' : 'badge-warning';
        tbody.innerHTML += `
            <tr>
                <td>${user.user_id?.substring(0, 8)}...<\/td>
                <td>${escapeHtmlContent(user.full_name)}<\/td>
                <td>${escapeHtmlContent(user.email)}<\/td>
                <td>${escapeHtmlContent(user.role)}<\/td>
                <td>${escapeHtmlContent(user.program || 'N/A')}<\/td>
                <td><span class="badge ${statusClass}">${user.status}<\/span><\/td>
                <td>
                    <button class="btn-sm btn-edit" onclick="editAdminUser('${user.user_id}')">Edit</button>
                    <button class="btn-sm btn-delete" onclick="deleteAdminUser('${user.user_id}')">Delete</button>
                 <\/td>
             `
        ;
    });
}

async function loadPendingList() {
    const tbody = document.getElementById('pending-table');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="6"><div class="loading-spinner"></div> Loading...<\/td><\/tr>';
    
    const { data, error } = await sbClient
        .from('consolidated_user_profiles_table')
        .select('*')
        .eq('status', 'pending')
        .order('created_at');
    
    if (error) {
        tbody.innerHTML = `<tr><td colspan="6">Error: ${error.message}<\/td><\/tr>`;
        return;
    }
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">No pending approvals.<\/td><\/tr>';
        return;
    }
    
    tbody.innerHTML = '';
    data.forEach(user => {
        tbody.innerHTML += `
            <tr>
                <td>${escapeHtmlContent(user.full_name)}<\/td>
                <td>${escapeHtmlContent(user.email)}<\/td>
                <td>${escapeHtmlContent(user.role)}<\/td>
                <td>${escapeHtmlContent(user.program || 'N/A')}<\/td>
                <td>${new Date(user.created_at).toLocaleDateString()}<\/td>
                <td>
                    <button class="btn-sm btn-success" onclick="approveAdminUser('${user.user_id}', '${escapeHtmlContent(user.full_name)}')">Approve</button>
                    <button class="btn-sm btn-delete" onclick="deleteAdminUser('${user.user_id}')">Reject</button>
                 <\/td>
             `
        ;
    });
}

async function handleAddNewAccount(e) {
    e.preventDefault();
    const name = document.getElementById('account-name').value;
    const email = document.getElementById('account-email').value;
    const password = document.getElementById('account-password').value;
    const role = document.getElementById('account-role').value;
    const phone = document.getElementById('account-phone').value;
    const program = document.getElementById('account-program').value;
    const intake = document.getElementById('account-intake').value;
    
    try {
        const { data: { user }, error } = await sbClient.auth.signUp({
            email, password,
            options: { data: { full_name: name, role, phone, program, intake_year: intake, status: 'approved' } }
        });
        
        if (error) throw error;
        
        if (user) {
            await sbClient.from('consolidated_user_profiles_table').insert([{
                user_id: user.id, email, full_name: name, role, phone, program, intake_year: intake, status: 'approved'
            }]);
        }
        
        alert(`✅ Account created for ${name}!`);
        e.target.reset();
        loadUsersList();
        loadDashboardStats();
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

window.approveAdminUser = async function(userId, fullName) {
    if (!confirm(`Approve user ${fullName}?`)) return;
    
    try {
        await sbClient
            .from('consolidated_user_profiles_table')
            .update({ status: 'approved', updated_at: new Date().toISOString() })
            .eq('user_id', userId);
        
        alert(`✅ User ${fullName} approved!`);
        loadPendingList();
        loadUsersList();
        loadDashboardStats();
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
};

window.deleteAdminUser = async function(userId) {
    if (!confirm('Are you sure? This action cannot be undone.')) return;
    
    try {
        await sbClient.from('consolidated_user_profiles_table').delete().eq('user_id', userId);
        alert('✅ User deleted!');
        loadPendingList();
        loadUsersList();
        loadDashboardStats();
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
};

window.editAdminUser = function(userId) {
    alert(`Edit user: ${userId.substring(0, 8)}... (Feature coming soon)`);
};

// =====================================================
// COURSES MANAGEMENT
// =====================================================
async function loadCoursesList() {
    const tbody = document.getElementById('courses-table');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="5">Loading courses...<\/td><\/tr>';
    
    const { data, error } = await sbClient.from('courses').select('*').order('course_name');
    if (error) {
        tbody.innerHTML = `<td><td colspan="5">Error: ${error.message}<\/td><\/tr>`;
        return;
    }
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No courses found.<\/td><\/tr>';
        return;
    }
    
    tbody.innerHTML = '';
    data.forEach(course => {
        tbody.innerHTML += `
            <tr>
                <td>${escapeHtmlContent(course.course_name)}<\/td>
                <td>${escapeHtmlContent(course.unit_code)}<\/td>
                <td>${escapeHtmlContent(course.target_program)}<\/td>
                <td>${escapeHtmlContent(course.intake_year || 'N/A')}<\/td>
                <td>
                    <button class="btn-sm btn-edit" onclick="alert('Edit course: ${course.course_name}')">Edit</button>
                    <button class="btn-sm btn-delete" onclick="alert('Delete course: ${course.course_name}')">Delete</button>
                 <\/td>
             `
        ;
    });
}

async function handleAddNewCourse(e) {
    e.preventDefault();
    const courseData = {
        course_name: document.getElementById('course-name').value,
        unit_code: document.getElementById('course-unit-code').value,
        description: document.getElementById('course-description').value,
        target_program: document.getElementById('course-program').value,
        intake_year: document.getElementById('course-intake').value,
        status: 'Active'
    };
    
    const { error } = await sbClient.from('courses').insert([courseData]);
    if (error) {
        alert(`Error: ${error.message}`);
    } else {
        alert('✅ Course added!');
        e.target.reset();
        loadCoursesList();
    }
}

// =====================================================
// UNITS MANAGEMENT
// =====================================================
async function loadUnitsList() {
    const container = document.getElementById('units-list-container');
    if (!container) return;
    
    container.innerHTML = '<div class="loading-spinner"></div><p>Loading units...</p>';
    
    const { data, error } = await sbClient.from('units_catalog').select('*').order('block');
    if (error) {
        container.innerHTML = `<p>Error: ${error.message}</p>`;
        return;
    }
    
    if (!data || data.length === 0) {
        container.innerHTML = '<p>No units found.</p>';
        return;
    }
    
    allUnitsData = data;
    let html = '<div class="units-grid">';
    data.forEach(unit => {
        html += `
            <div class="unit-card">
                <div class="unit-header">
                    <div>
                        <span class="unit-code">${escapeHtmlContent(unit.unit_code)}</span>
                        <span class="unit-name">${escapeHtmlContent(unit.unit_name)}</span>
                    </div>
                </div>
                <div class="unit-meta">
                    <span>${escapeHtmlContent(unit.program)}</span>
                    <span>${escapeHtmlContent(unit.block)}</span>
                    <span>Year: ${unit.year || 'N/A'}</span>
                    <span>${unit.credits || 3} Credits</span>
                </div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

// =====================================================
// TICKETS MANAGEMENT
// =====================================================
async function loadTicketsList() {
    const tbody = document.getElementById('admin-tickets-body');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="7">Loading tickets...<\/td><\/tr>';
    
    const { data, error } = await sbClient.from('support_tickets').select('*').order('created_at', { ascending: false });
    if (error) {
        tbody.innerHTML = `<tr><td colspan="7">Error: ${error.message}<\/td><\/tr>`;
        return;
    }
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">No tickets found.<\/td><\/tr>';
        return;
    }
    
    // Get student names
    const studentIds = [...new Set(data.map(t => t.student_id))];
    let studentNames = {};
    if (studentIds.length > 0) {
        const { data: students } = await sbClient
            .from('consolidated_user_profiles_table')
            .select('user_id, full_name')
            .in('user_id', studentIds);
        if (students) students.forEach(s => studentNames[s.user_id] = s.full_name);
    }
    
    tbody.innerHTML = '';
    data.forEach(ticket => {
        const statusClass = ticket.status === 'open' ? 'badge-warning' : ticket.status === 'in_progress' ? 'badge-info' : 'badge-success';
        tbody.innerHTML += `
            <tr>
                <td>${escapeHtmlContent(ticket.ticket_number)}<\/td>
                <td>${escapeHtmlContent(studentNames[ticket.student_id] || 'Unknown')}<\/td>
                <td>${escapeHtmlContent(ticket.subject)}<\/td>
                <td><span class="badge ${ticket.priority === 'urgent' ? 'badge-danger' : 'badge-info'}">${escapeHtmlContent(ticket.priority)}<\/span><\/td>
                <td><span class="badge ${statusClass}">${escapeHtmlContent(ticket.status)}<\/span><\/td>
                <td>${new Date(ticket.created_at).toLocaleDateString()}<\/td>
                <td><button class="btn-sm btn-edit" onclick="alert('View ticket: ${ticket.ticket_number}')">View<\/button><\/td>
             `
        ;
    });
    
    const openCount = data.filter(t => t.status === 'open').length;
    const progressCount = data.filter(t => t.status === 'in_progress').length;
    const closedCount = data.filter(t => t.status === 'closed').length;
    const urgentCount = data.filter(t => t.priority === 'urgent').length;
    
    const ids = ['admin_open_tickets', 'admin_progress_tickets', 'admin_closed_tickets', 'admin_urgent_tickets'];
    const counts = [openCount, progressCount, closedCount, urgentCount];
    ids.forEach((id, i) => { const el = document.getElementById(id); if (el) el.textContent = counts[i]; });
}

// =====================================================
// FEE ACCOUNTS
// =====================================================
async function loadFeeAccountsList() {
    const tbody = document.getElementById('student-accounts-body');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="7">Loading accounts...<\/td><\/tr>';
    
    const { data: students } = await sbClient
        .from('consolidated_user_profiles_table')
        .select('*')
        .eq('role', 'student')
        .eq('status', 'approved');
    
    if (!students || students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">No students found.<\/td><\/tr>';
        return;
    }
    
    tbody.innerHTML = '';
    for (const s of students) {
        const { data: payments } = await sbClient.from('fee_payments').select('amount').eq('student_id', s.user_id);
        const totalPaid = payments ? payments.reduce((sum, p) => sum + parseFloat(p.amount), 0) : 0;
        const totalDue = 45000;
        const balance = totalDue - totalPaid;
        const statusClass = balance <= 0 ? 'badge-success' : 'badge-warning';
        
        tbody.innerHTML += `
            <tr>
                <td>${escapeHtmlContent(s.full_name)}<\/td>
                <td>${s.user_id.substring(0, 8)}...<\/td>
                <td>KES ${totalDue.toLocaleString()}<\/td>
                <td>KES ${totalPaid.toLocaleString()}<\/td>
                <td>KES ${balance.toLocaleString()}<\/td>
                <td><span class="badge ${statusClass}">${balance <= 0 ? 'Paid' : 'Outstanding'}<\/span><\/td>
                <td><button class="btn-sm btn-edit" onclick="alert('Payment history for ${s.full_name}')">History<\/button><\/td>
             `
        ;
    }
}

// =====================================================
// ATTENDANCE
// =====================================================
async function loadAttendanceList() {
    const tbody = document.getElementById('attendance-table');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="5">Loading attendance...<\/td><\/tr>';
    
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await sbClient
        .from('geo_attendance_logs')
        .select('*, student:student_id(full_name)')
        .gte('check_in_time', today)
        .order('check_in_time', { ascending: false });
    
    if (error) {
        tbody.innerHTML = `<tr><td colspan="5">Error: ${error.message}<\/td><\/tr>`;
        return;
    }
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No attendance records today.<\/td><\/tr>';
        return;
    }
    
    tbody.innerHTML = '';
    data.forEach(record => {
        const studentName = record.student?.full_name || 'Unknown';
        tbody.innerHTML += `
            <tr>
                <td>${escapeHtmlContent(studentName)}<\/td>
                <td>${new Date(record.check_in_time).toLocaleDateString()}<\/td>
                <td>${escapeHtmlContent(record.session_type)}<\/td>
                <td>${escapeHtmlContent(record.location_name || 'N/A')}<\/td>
                <td>${record.is_verified ? '✅ Verified' : '⏳ Pending'}<\/td>
             `
        ;
    });
}

// =====================================================
// EXAMS
// =====================================================
async function loadExamsList() {
    const tbody = document.getElementById('exams-list');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="6">Loading exams...<\/td><\/tr>';
    
    const { data, error } = await sbClient.from('exams').select('*').order('exam_date');
    if (error) {
        tbody.innerHTML = `<tr><td colspan="6">Error: ${error.message}<\/td><\/tr>`;
        return;
    }
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">No exams found.<\/td><\/tr>';
        return;
    }
    
    tbody.innerHTML = '';
    data.forEach(exam => {
        tbody.innerHTML += `
            <tr>
                <td>${escapeHtmlContent(exam.exam_type)}<\/td>
                <td>${escapeHtmlContent(exam.exam_name)}<\/td>
                <td>${new Date(exam.exam_date).toLocaleDateString()}<\/td>
                <td>${escapeHtmlContent(exam.target_program)}<\/td>
                <td>${escapeHtmlContent(exam.status)}<\/td>
                <td>
                    <button class="btn-sm btn-edit" onclick="alert('Edit exam: ${exam.exam_name}')">Edit</button>
                    <button class="btn-sm btn-delete" onclick="alert('Delete exam: ${exam.exam_name}')">Delete</button>
                 <\/td>
             `
        ;
    });
}

// =====================================================
// RESOURCES
// =====================================================
async function loadResourcesList() {
    const tbody = document.getElementById('resources-list');
    if (!tbody) return;
    
    tbody.innerHTML = '<td><td colspan="5">Loading resources...<\/td><\/tr>';
    
    const { data, error } = await sbClient.from('resources').select('*').order('created_at', { ascending: false });
    if (error) {
        tbody.innerHTML = `<tr><td colspan="5">Error: ${error.message}<\/td><\/tr>`;
        return;
    }
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No resources found.<\/td><\/tr>';
        return;
    }
    
    tbody.innerHTML = '';
    data.forEach(res => {
        tbody.innerHTML += `
            <tr>
                <td>${escapeHtmlContent(res.title)}<\/td>
                <td>${escapeHtmlContent(res.program_type)}<\/td>
                <td>${escapeHtmlContent(res.uploaded_by_name || 'Admin')}<\/td>
                <td>${new Date(res.created_at).toLocaleDateString()}<\/td>
                <td><a href="${res.file_url}" target="_blank" class="btn-sm btn-edit">View<\/a><\/td>
             `
        ;
    });
}

// =====================================================
// MESSAGES
// =====================================================
async function loadMessagesList() {
    const tbody = document.getElementById('messages-list');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="5">Loading messages...<\/td><\/tr>';
    
    const { data, error } = await sbClient.from('notifications').select('*').order('created_at', { ascending: false });
    if (error) {
        tbody.innerHTML = `<tr><td colspan="5">Error: ${error.message}<\/td><\/tr>`;
        return;
    }
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No messages found.<\/td><\/tr>';
        return;
    }
    
    tbody.innerHTML = '';
    data.forEach(msg => {
        tbody.innerHTML += `
            <tr>
                <td>${escapeHtmlContent(msg.target_program || 'All')}<\/td>
                <td>${escapeHtmlContent(msg.subject)}<\/td>
                <td>${escapeHtmlContent(msg.sender_name || 'System')}<\/td>
                <td>${new Date(msg.created_at).toLocaleDateString()}<\/td>
                <td><button class="btn-sm btn-edit" onclick="alert('View message: ${msg.subject}')">View<\/button><\/td>
             `
        ;
    });
}

// =====================================================
// CALENDAR
// =====================================================
function initCalendarView() {
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

// =====================================================
// WELCOME MESSAGE
// =====================================================
async function loadWelcomeMessageEditor() {
    const editor = document.getElementById('welcome-message-editor');
    const preview = document.getElementById('live-preview');
    
    const { data } = await sbClient.from('app_settings').select('value').eq('key', 'student_welcome').single();
    const content = data?.value || '<p>Welcome to NCHSM Learning Portal!</p>';
    
    if (editor) editor.value = content;
    if (preview) preview.innerHTML = content;
}

async function handleSaveWelcomeMsg(e) {
    e.preventDefault();
    const content = document.getElementById('welcome-message-editor').value;
    
    const { error } = await sbClient.from('app_settings').upsert([{ key: 'student_welcome', value: content }]);
    if (error) {
        alert(`Error: ${error.message}`);
    } else {
        alert('✅ Welcome message saved!');
        document.getElementById('live-preview').innerHTML = content;
    }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================
function escapeHtmlContent(str) {
    if (!str) return '';
    return String(str).replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

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

window.logout = async function() {
    if (sbClient) await sbClient.auth.signOut();
    localStorage.clear();
    window.location.href = 'login.html';
};

window.showTab = function(tabId) {
    const navLink = document.querySelector(`.nav a[data-tab="${tabId}"]`);
    if (navLink) navLink.click();
};
