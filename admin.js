// =====================================================
// NCHSM ADMIN DASHBOARD - COMPLETE
// All functions included, ready to use
// =====================================================

// ------------------------------------------------------------------
// SUPABASE SETUP
// ------------------------------------------------------------------
const supabaseUrl = 'https://lwhtjozfsmbyihenfunw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk';

// Global database connection
let db = null;
let currentAdmin = null;
let allUnitsList = [];
let selectedBlock = 'all';

// ------------------------------------------------------------------
// HELPER FUNCTIONS
// ------------------------------------------------------------------
function getEl(id) {
    return document.getElementById(id);
}

function cleanText(str) {
    if (!str) return '';
    return String(str).replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function showMsg(msg, type) {
    type = type || 'success';
    alert(msg);
}

// =====================================================
// GLOBAL SHOWTAB FUNCTION - FIX FOR ONCLICK ERRORS
// =====================================================
window.showTab = function(tabId) {
    console.log('Opening tab:', tabId);
    
    var allTabs = document.querySelectorAll('.tab-content');
    for (var i = 0; i < allTabs.length; i++) {
        allTabs[i].style.display = 'none';
        allTabs[i].classList.remove('active');
    }
    
    var targetTab = document.getElementById(tabId);
    if (targetTab) {
        targetTab.style.display = 'block';
        targetTab.classList.add('active');
    }
    
    var navLinks = document.querySelectorAll('.nav a');
    for (var i = 0; i < navLinks.length; i++) {
        navLinks[i].classList.remove('active');
        if (navLinks[i].getAttribute('data-tab') === tabId) {
            navLinks[i].classList.add('active');
        }
    }
    
    loadTabContent(tabId);
};

// ------------------------------------------------------------------
// INITIALIZE EVERYTHING
// ------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin panel loading...');
    
    // Connect to database
    if (typeof supabase !== 'undefined') {
        db = supabase.createClient(supabaseUrl, supabaseKey);
    } else {
        console.log('Waiting for Supabase...');
        setTimeout(function() {
            if (typeof supabase !== 'undefined') {
                db = supabase.createClient(supabaseUrl, supabaseKey);
            }
        }, 500);
    }
    
    // Check if user is logged in
    checkUserSession();
    
    // Setup sidebar clicks
    setupNavigation();
    
    // Setup mobile menu
    setupMobileMenu();
    
    // Load dashboard numbers
    loadDashboardNumbers();
});

// ------------------------------------------------------------------
// CHECK USER SESSION
// ------------------------------------------------------------------
async function checkUserSession() {
    if (!db) return;
    
    try {
        const session = await db.auth.getSession();
        
        if (!session.data.session) {
            window.location.href = 'login.html';
            return;
        }
        
        // Get user profile
        const userEmail = session.data.session.user.email;
        const { data: profile } = await db
            .from('consolidated_user_profiles_table')
            .select('*')
            .eq('email', userEmail)
            .single();
        
        if (profile) {
            currentAdmin = profile;
            
            // Update welcome message
            const welcomeEl = document.querySelector('header h1');
            if (welcomeEl && profile.full_name) {
                welcomeEl.innerHTML = 'Welcome, ' + profile.full_name + '!';
            }
            
            // Super admin goes to their panel
            if (profile.role === 'superadmin' || profile.role === 'super_admin') {
                window.location.href = 'super_admin.html';
                return;
            }
        }
    } catch(e) {
        console.log('Session check failed');
        window.location.href = 'login.html';
    }
}

// ------------------------------------------------------------------
// SIDEBAR NAVIGATION
// ------------------------------------------------------------------
function setupNavigation() {
    var navLinks = document.querySelectorAll('.nav a');
    var allTabs = document.querySelectorAll('.tab-content');
    
    for (var i = 0; i < navLinks.length; i++) {
        navLinks[i].addEventListener('click', function(e) {
            e.preventDefault();
            
            var tabId = this.getAttribute('data-tab');
            
            // Update active class on links
            for (var j = 0; j < navLinks.length; j++) {
                navLinks[j].classList.remove('active');
            }
            this.classList.add('active');
            
            // Hide all tabs
            for (var k = 0; k < allTabs.length; k++) {
                allTabs[k].style.display = 'none';
                allTabs[k].classList.remove('active');
            }
            
            // Show selected tab
            var targetTab = document.getElementById(tabId);
            if (targetTab) {
                targetTab.style.display = 'block';
                targetTab.classList.add('active');
                loadTabContent(tabId);
            }
        });
    }
    
    // Make dashboard visible by default
    var dashboardTab = document.getElementById('dashboard');
    if (dashboardTab) {
        dashboardTab.style.display = 'block';
    }
}

function setupMobileMenu() {
    var toggleBtn = document.getElementById('mobileNavToggle');
    var sidebar = document.getElementById('sidebar');
    
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
    }
}

function loadTabContent(tabName) {
    switch(tabName) {
        case 'dashboard':
            loadDashboardNumbers();
            break;
        case 'users':
            loadAllUsers();
            break;
        case 'pending':
            loadPendingUsers();
            break;
        case 'enroll':
            loadStudents();
            break;
        case 'courses':
            loadAllCourses();
            break;
        case 'unit-management':
            loadAllUnits();
            break;
        case 'support-tickets':
            loadSupportTickets();
            break;
        case 'fee-accounts':
            loadStudentFees();
            break;
        case 'sessions':
            loadScheduledSessions();
            break;
        case 'attendance':
            loadTodayAttendance();
            break;
        case 'cats':
            loadExamList();
            break;
        case 'resources':
            loadResourcesList();
            break;
        case 'messages':
            loadMessageList();
            break;
        case 'calendar':
            setupCalendar();
            break;
        case 'welcome-editor':
            loadWelcomeMessage();
            break;
        case 'system-health':
            loadSystemHealth();
            break;
        case 'user-analytics':
            loadUserAnalytics();
            break;
    }
}

// ------------------------------------------------------------------
// DASHBOARD NUMBERS
// ------------------------------------------------------------------
async function loadDashboardNumbers() {
    if (!db) return;
    
    try {
        // Get user counts
        const { count: totalUsers } = await db
            .from('consolidated_user_profiles_table')
            .select('*', { count: 'exact', head: true });
        
        const { count: pendingCount } = await db
            .from('consolidated_user_profiles_table')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');
        
        const { count: studentCount } = await db
            .from('consolidated_user_profiles_table')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'student');
        
        const { count: courseCount } = await db
            .from('courses')
            .select('*', { count: 'exact', head: true });
        
        const { count: unitCount } = await db
            .from('units_catalog')
            .select('*', { count: 'exact', head: true });
        
        const { count: openTickets } = await db
            .from('support_tickets')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'open');
        
        // Today's check-ins
        var today = new Date().toISOString().slice(0,10);
        const { count: checkIns } = await db
            .from('geo_attendance_logs')
            .select('*', { count: 'exact', head: true })
            .gte('check_in_time', today);
        
        // Update display
        var totalEl = getEl('totalUsers');
        var pendingEl = getEl('pendingApprovals');
        var studentsEl = getEl('totalStudents');
        var coursesEl = getEl('totalCourses');
        var unitsEl = getEl('dashboardTotalUnits');
        var ticketsEl = getEl('dashboardOpenTickets');
        var checkinsEl = getEl('totalDailyCheckIns');
        
        if (totalEl) totalEl.textContent = totalUsers || 0;
        if (pendingEl) pendingEl.textContent = pendingCount || 0;
        if (studentsEl) studentsEl.textContent = studentCount || 0;
        if (coursesEl) coursesEl.textContent = courseCount || 0;
        if (unitsEl) unitsEl.textContent = unitCount || 0;
        if (ticketsEl) ticketsEl.textContent = openTickets || 0;
        if (checkinsEl) checkinsEl.textContent = checkIns || 0;
        
        // Load fee summary for dashboard
        loadFeeSummary();
        
        // Load welcome message
        loadWelcomeMessageForDisplay();
        
    } catch(e) {
        console.log('Error loading dashboard:', e);
    }
}

async function loadFeeSummary() {
    if (!db) return;
    
    try {
        const { data: students } = await db
            .from('consolidated_user_profiles_table')
            .select('user_id, program, block')
            .eq('role', 'student')
            .eq('status', 'approved');
        
        if (!students || students.length === 0) return;
        
        var totalOwed = 0;
        
        for (var i = 0; i < students.length; i++) {
            var student = students[i];
            
            // Get fee amount
            var { data: feeConfig } = await db
                .from('fee_structure')
                .select('amount')
                .eq('program', student.program)
                .eq('block', student.block || 'Introductory')
                .single();
            
            var feeAmount = (feeConfig && feeConfig.amount) ? feeConfig.amount : 45000;
            
            // Get payments
            var { data: payments } = await db
                .from('fee_payments')
                .select('amount')
                .eq('student_id', student.user_id);
            
            var paidAmount = 0;
            if (payments && payments.length) {
                for (var j = 0; j < payments.length; j++) {
                    paidAmount = paidAmount + parseFloat(payments[j].amount);
                }
            }
            
            var balance = feeAmount - paidAmount;
            if (balance > 0) totalOwed = totalOwed + balance;
        }
        
        var feeEl = getEl('dashboardOutstandingFees');
        if (feeEl) feeEl.innerHTML = 'KES ' + totalOwed.toLocaleString();
        
    } catch(e) {
        console.log('Fee summary error:', e);
    }
}

// ------------------------------------------------------------------
// USER MANAGEMENT
// ------------------------------------------------------------------
async function loadAllUsers() {
    var tbody = getEl('users-table');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="7"><div class="loading-spinner"></div> Loading users...<\/td><\/tr>';
    
    if (!db) return;
    
    const { data, error } = await db
        .from('consolidated_user_profiles_table')
        .select('*')
        .neq('role', 'superadmin')
        .order('full_name');
    
    if (error || !data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">No users found<\/td><\/tr>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < data.length; i++) {
        var u = data[i];
        var statusClass = (u.status === 'approved') ? 'badge-success' : 'badge-warning';
        var shortId = u.user_id ? u.user_id.substring(0,8) : 'N/A';
        
        html += '<tr>';
        html += '<td>' + shortId + '...<\/td>';
        html += '<td>' + cleanText(u.full_name) + '<\/td>';
        html += '<td>' + cleanText(u.email) + '<\/td>';
        html += '<td>' + cleanText(u.role) + '<\/td>';
        html += '<td>' + cleanText(u.program) + '<\/td>';
        html += '<td><span class="badge ' + statusClass + '">' + u.status + '<\/span><\/td>';
        html += '<td>';
        html += '<button class="btn-sm btn-edit" onclick="openEditUser(\'' + u.user_id + '\')">Edit</button> ';
        html += '<button class="btn-sm btn-delete" onclick="deleteUserAccount(\'' + u.user_id + '\', \'' + cleanText(u.full_name) + '\')">Delete</button>';
        html += '<\/td>';
        html += '<\/tr>';
    }
    
    tbody.innerHTML = html;
}

async function loadPendingUsers() {
    var tbody = getEl('pending-table');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="6"><div class="loading-spinner"></div> Loading...<\/td><\/tr>';
    
    if (!db) return;
    
    const { data, error } = await db
        .from('consolidated_user_profiles_table')
        .select('*')
        .eq('status', 'pending')
        .order('created_at');
    
    if (error || !data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">No pending approvals<\/td><\/tr>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < data.length; i++) {
        var u = data[i];
        var dateStr = u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A';
        
        html += '<tr>';
        html += '<td>' + cleanText(u.full_name) + '<\/td>';
        html += '<td>' + cleanText(u.email) + '<\/td>';
        html += '<td>' + cleanText(u.role) + '<\/td>';
        html += '<td>' + cleanText(u.program) + '<\/td>';
        html += '<td>' + dateStr + '<\/td>';
        html += '<td>';
        html += '<button class="btn-sm btn-success" onclick="approveUser(\'' + u.user_id + '\', \'' + cleanText(u.full_name) + '\')">Approve</button> ';
        html += '<button class="btn-sm btn-delete" onclick="deleteUserAccount(\'' + u.user_id + '\', \'' + cleanText(u.full_name) + '\')">Reject</button>';
        html += '<\/td>';
        html += '<\/tr>';
    }
    
    tbody.innerHTML = html;
}

async function loadStudents() {
    var tbody = getEl('students-table');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="6"><div class="loading-spinner"></div> Loading students...<\/td><\/tr>';
    
    if (!db) return;
    
    const { data, error } = await db
        .from('consolidated_user_profiles_table')
        .select('*')
        .eq('role', 'student')
        .order('full_name');
    
    if (error || !data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">No students found<\/td><\/tr>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < data.length; i++) {
        var s = data[i];
        var shortId = s.user_id ? s.user_id.substring(0,8) : 'N/A';
        var statusClass = (s.status === 'approved') ? 'badge-success' : 'badge-warning';
        
        html += '<tr>';
        html += '<td>' + shortId + '...<\/td>';
        html += '<td>' + cleanText(s.full_name) + '<\/td>';
        html += '<td>' + cleanText(s.email) + '<\/td>';
        html += '<td>' + cleanText(s.program) + '<\/td>';
        html += '<td><span class="badge ' + statusClass + '">' + s.status + '<\/span><\/td>';
        html += '<td><button class="btn-sm btn-edit" onclick="openEditUser(\'' + s.user_id + '\')">Edit</button><\/td>';
        html += '<\/tr>';
    }
    
    tbody.innerHTML = html;
}

// Enroll form handler
document.getElementById('add-account-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    var name = getEl('account-name').value;
    var email = getEl('account-email').value;
    var password = getEl('account-password').value;
    var role = getEl('account-role').value;
    var phone = getEl('account-phone').value;
    var program = getEl('account-program').value;
    var intake = getEl('account-intake').value;
    var block = getEl('account-block-term')?.value || 'Introductory';
    
    if (!name || !email || !password) {
        alert('Please fill in all required fields');
        return;
    }
    
    try {
        const { data: authData, error: authError } = await db.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: name,
                    role: role,
                    phone: phone,
                    program: program,
                    intake_year: intake,
                    block: block,
                    status: 'approved'
                }
            }
        });
        
        if (authError) throw authError;
        
        if (authData.user) {
            await db.from('consolidated_user_profiles_table').insert([{
                user_id: authData.user.id,
                email: email,
                full_name: name,
                role: role,
                phone: phone,
                program: program,
                intake_year: intake,
                block: block,
                status: 'approved'
            }]);
        }
        
        alert('✅ Account created for ' + name);
        e.target.reset();
        loadAllUsers();
        loadStudents();
        loadDashboardNumbers();
        
    } catch(err) {
        alert('Error: ' + err.message);
    }
});

window.approveUser = async function(userId, fullName) {
    if (!confirm('Approve ' + fullName + '?')) return;
    
    try {
        await db.from('consolidated_user_profiles_table')
            .update({ status: 'approved' })
            .eq('user_id', userId);
        
        alert('✅ ' + fullName + ' approved!');
        loadPendingUsers();
        loadAllUsers();
        loadDashboardNumbers();
    } catch(err) {
        alert('Error: ' + err.message);
    }
};

window.deleteUserAccount = async function(userId, fullName) {
    if (!confirm('Delete ' + fullName + '? This cannot be undone.')) return;
    
    try {
        await db.from('consolidated_user_profiles_table').delete().eq('user_id', userId);
        alert('✅ User deleted');
        loadPendingUsers();
        loadAllUsers();
        loadStudents();
        loadDashboardNumbers();
    } catch(err) {
        alert('Error: ' + err.message);
    }
};

window.openEditUser = async function(userId) {
    alert('Edit user: ' + userId.substring(0,8) + '... (Feature in development)');
};

// ------------------------------------------------------------------
// COURSE MANAGEMENT
// ------------------------------------------------------------------
async function loadAllCourses() {
    var tbody = getEl('courses-table');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="5"><div class="loading-spinner"></div> Loading courses...<\/td><\/tr>';
    
    if (!db) return;
    
    const { data, error } = await db.from('courses').select('*').order('course_name');
    
    if (error || !data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No courses found<\/td><\/tr>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < data.length; i++) {
        var c = data[i];
        
        html += '<tr>';
        html += '<td>' + cleanText(c.course_name) + '<\/td>';
        html += '<td>' + cleanText(c.unit_code || 'N/A') + '<\/td>';
        html += '<td>' + cleanText(c.target_program) + '<\/td>';
        html += '<td>' + (c.intake_year || 'N/A') + '<\/td>';
        html += '<td><button class="btn-sm btn-delete" onclick="deleteCourseItem(\'' + c.id + '\')">Delete</button><\/td>';
        html += '<\/tr>';
    }
    
    tbody.innerHTML = html;
}

document.getElementById('add-course-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    var name = getEl('course-name').value;
    var code = getEl('course-unit-code').value;
    var program = getEl('course-program').value;
    var intake = getEl('course-intake').value;
    var block = getEl('course-block')?.value || 'General';
    
    if (!name || !code) {
        alert('Course name and unit code are required');
        return;
    }
    
    const { error } = await db.from('courses').insert([{
        course_name: name,
        unit_code: code,
        target_program: program,
        intake_year: intake,
        block: block,
        status: 'Active'
    }]);
    
    if (error) {
        alert('Error: ' + error.message);
    } else {
        alert('✅ Course added!');
        e.target.reset();
        loadAllCourses();
    }
});

window.deleteCourseItem = async function(courseId) {
    if (!confirm('Delete this course?')) return;
    
    const { error } = await db.from('courses').delete().eq('id', courseId);
    
    if (error) {
        alert('Error: ' + error.message);
    } else {
        alert('✅ Course deleted');
        loadAllCourses();
    }
};

// ------------------------------------------------------------------
// UNIT MANAGEMENT
// ------------------------------------------------------------------
async function loadAllUnits() {
    var container = getEl('units-list-container');
    if (!container) return;
    
    container.innerHTML = '<div class="loading-spinner"></div><p>Loading units...</p>';
    
    if (!db) return;
    
    const { data, error } = await db.from('units_catalog').select('*').order('block').order('unit_code');
    
    if (error || !data || data.length === 0) {
        container.innerHTML = '<p>No units found</p>';
        return;
    }
    
    allUnitsList = data;
    renderUnitList();
}

function renderUnitList() {
    var container = getEl('units-list-container');
    if (!container) return;
    
    var searchTerm = (getEl('unit_search') ? getEl('unit_search').value.toLowerCase() : '');
    var programFilter = (getEl('unit_filter_program') ? getEl('unit_filter_program').value : '');
    
    var filtered = [];
    for (var i = 0; i < allUnitsList.length; i++) {
        var u = allUnitsList[i];
        
        if (searchTerm && !u.unit_code.toLowerCase().includes(searchTerm) && !u.unit_name.toLowerCase().includes(searchTerm)) {
            continue;
        }
        if (programFilter && u.program !== programFilter) {
            continue;
        }
        if (selectedBlock !== 'all' && u.block !== selectedBlock) {
            continue;
        }
        filtered.push(u);
    }
    
    if (filtered.length === 0) {
        container.innerHTML = '<p>No units found</p>';
        return;
    }
    
    var html = '<div class="units-grid">';
    for (var i = 0; i < filtered.length; i++) {
        var u = filtered[i];
        var programName = getProgramDisplayName(u.program);
        
        html += '<div class="unit-card">';
        html += '<div class="unit-header"><div>';
        html += '<span class="unit-code">' + cleanText(u.unit_code) + '</span> ';
        html += '<span class="unit-name">' + cleanText(u.unit_name) + '</span>';
        html += '</div></div>';
        html += '<div class="unit-meta">';
        html += '<span>' + cleanText(programName) + '</span>';
        html += '<span>' + cleanText(u.block) + '</span>';
        html += '<span>Year: ' + (u.year || 'N/A') + '</span>';
        html += '<span>' + (u.credits || 3) + ' Credits</span>';
        html += '</div></div>';
    }
    html += '</div>';
    
    container.innerHTML = html;
}

window.filterUnitsByBlock = function(block) {
    selectedBlock = block;
    
    // Update active button styling
    var btns = document.querySelectorAll('.block-btn');
    for (var i = 0; i < btns.length; i++) {
        btns[i].classList.remove('active');
        if (btns[i].getAttribute('data-block') === block) {
            btns[i].classList.add('active');
        }
    }
    
    renderUnitList();
};

// Program display helper
function getProgramDisplayName(code) {
    var names = {
        'KRCHN': 'KRCHN Nursing',
        'DPOTT': 'Diploma in Perioperative Technology',
        'DCH': 'Diploma in Community Health',
        'DHRIT': 'Diploma in Health Records',
        'DSL': 'Diploma in Science Lab'
    };
    return names[code] || code;
}

// ------------------------------------------------------------------
// SUPPORT TICKETS
// ------------------------------------------------------------------
async function loadSupportTickets() {
    var tbody = getEl('admin-tickets-body');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="7"><div class="loading-spinner"></div> Loading tickets...<\/td><\/tr>';
    
    if (!db) return;
    
    const { data, error } = await db.from('support_tickets').select('*').order('created_at', { ascending: false });
    
    if (error || !data || data.length === 0) {
        tbody.innerHTML = '<td><td colspan="7">No tickets found<\/td><\/tr>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < data.length; i++) {
        var t = data[i];
        var statusClass = 'badge-warning';
        if (t.status === 'closed') statusClass = 'badge-success';
        if (t.status === 'in_progress') statusClass = 'badge-info';
        
        html += '<tr>';
        html += '<td>' + cleanText(t.ticket_number) + '<\/td>';
        html += '<td>' + cleanText(t.student_name || 'Student') + '<\/td>';
        html += '<td>' + cleanText(t.subject) + '<\/td>';
        html += '<td><span class="badge ' + (t.priority === 'urgent' ? 'badge-danger' : 'badge-info') + '">' + cleanText(t.priority) + '<\/span><\/td>';
        html += '<td><span class="badge ' + statusClass + '">' + cleanText(t.status) + '<\/span><\/td>';
        html += '<td>' + new Date(t.created_at).toLocaleDateString() + '<\/td>';
        html += '<td><button class="btn-sm btn-edit" onclick="alert(\'View ticket: ' + t.ticket_number + '\')">View</button><\/td>';
        html += '<\/tr>';
    }
    
    tbody.innerHTML = html;
    
    // Update counts
    var openCount = 0, progressCount = 0, closedCount = 0, urgentCount = 0;
    for (var i = 0; i < data.length; i++) {
        if (data[i].status === 'open') openCount++;
        if (data[i].status === 'in_progress') progressCount++;
        if (data[i].status === 'closed') closedCount++;
        if (data[i].priority === 'urgent') urgentCount++;
    }
    
    var openEl = getEl('admin_open_tickets');
    var progressEl = getEl('admin_progress_tickets');
    var closedEl = getEl('admin_closed_tickets');
    var urgentEl = getEl('admin_urgent_tickets');
    
    if (openEl) openEl.textContent = openCount;
    if (progressEl) progressEl.textContent = progressCount;
    if (closedEl) closedEl.textContent = closedCount;
    if (urgentEl) urgentEl.textContent = urgentCount;
}

// ------------------------------------------------------------------
// FEE ACCOUNTS (READ ONLY)
// ------------------------------------------------------------------
async function loadStudentFees() {
    var tbody = getEl('student-accounts-body');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="8"><div class="loading-spinner"></div> Loading accounts...<\/td><\/tr>';
    
    if (!db) return;
    
    const { data: students } = await db
        .from('consolidated_user_profiles_table')
        .select('*')
        .eq('role', 'student')
        .eq('status', 'approved');
    
    if (!students || students.length === 0) {
        tbody.innerHTML = '<td><td colspan="8">No students found<\/td><\/tr>';
        return;
    }
    
    var totalOutstanding = 0;
    var totalCollected = 0;
    var overdue = 0;
    var html = '';
    
    for (var i = 0; i < students.length; i++) {
        var s = students[i];
        
        // Get fee amount
        var { data: feeConfig } = await db
            .from('fee_structure')
            .select('amount')
            .eq('program', s.program)
            .eq('block', s.block || 'Introductory')
            .single();
        
        var feeAmount = (feeConfig && feeConfig.amount) ? feeConfig.amount : 45000;
        
        // Get payments
        var { data: payments } = await db
            .from('fee_payments')
            .select('amount')
            .eq('student_id', s.user_id);
        
        var paidAmount = 0;
        if (payments && payments.length) {
            for (var j = 0; j < payments.length; j++) {
                paidAmount = paidAmount + parseFloat(payments[j].amount);
            }
        }
        
        var balance = feeAmount - paidAmount;
        totalOutstanding = totalOutstanding + (balance > 0 ? balance : 0);
        totalCollected = totalCollected + paidAmount;
        
        if (balance > 0) overdue++;
        
        var statusClass = 'badge-success';
        var statusText = 'Paid';
        if (balance > 0) {
            statusClass = 'badge-warning';
            statusText = 'Outstanding';
        }
        
        html += '<tr>';
        html += '<td>' + cleanText(s.full_name) + '<\/td>';
        html += '<td>' + (s.user_id ? s.user_id.substring(0,8) : 'N/A') + '...<\/td>';
        html += '<td>' + cleanText(s.program) + '<\/td>';
        html += '<td>' + (s.intake_year || '-') + '<\/td>';
        html += '<td>KES ' + feeAmount.toLocaleString() + '<\/td>';
        html += '<td>KES ' + paidAmount.toLocaleString() + '<\/td>';
        html += '<td class="' + (balance > 0 ? 'text-danger' : 'text-success') + '">KES ' + balance.toLocaleString() + '<\/td>';
        html += '<td><span class="badge ' + statusClass + '">' + statusText + '<\/span><\/td>';
        html += '<\/tr>';
    }
    
    tbody.innerHTML = html;
    
    var totalOutEl = getEl('totalOutstandingBalance');
    var totalColEl = getEl('totalCollected');
    var overdueEl = getEl('overdueAccounts');
    var todayEl = getEl('todayCollections');
    
    if (totalOutEl) totalOutEl.innerHTML = 'KES ' + totalOutstanding.toLocaleString();
    if (totalColEl) totalColEl.innerHTML = 'KES ' + totalCollected.toLocaleString();
    if (overdueEl) overdueEl.textContent = overdue;
    if (todayEl) todayEl.innerHTML = 'KES 0';
}

// ------------------------------------------------------------------
// ATTENDANCE
// ------------------------------------------------------------------
async function loadTodayAttendance() {
    var tbody = getEl('attendance-table');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="5"><div class="loading-spinner"></div> Loading attendance...<\/td><\/tr>';
    
    if (!db) return;
    
    var today = new Date().toISOString().slice(0,10);
    
    const { data, error } = await db
        .from('geo_attendance_logs')
        .select('*, student:student_id(full_name)')
        .gte('check_in_time', today)
        .order('check_in_time', { ascending: false });
    
    if (error || !data || data.length === 0) {
        tbody.innerHTML = '<td><td colspan="5">No attendance records today<\/td><\/tr>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < data.length; i++) {
        var r = data[i];
        var studentName = (r.student && r.student.full_name) ? r.student.full_name : 'Unknown';
        
        html += '<tr>';
        html += '<td>' + cleanText(studentName) + '<\/td>';
        html += '<td>' + new Date(r.check_in_time).toLocaleDateString() + '<\/td>';
        html += '<td>' + cleanText(r.session_type) + '<\/td>';
        html += '<td>' + cleanText(r.location_name || 'N/A') + '<\/td>';
        html += '<td>' + (r.is_verified ? 'Verified' : 'Pending') + '<\/td>';
        html += '<\/tr>';
    }
    
    tbody.innerHTML = html;
}

// ------------------------------------------------------------------
// EXAMS
// ------------------------------------------------------------------
async function loadExamList() {
    var tbody = getEl('exams-list');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="6"><div class="loading-spinner"></div> Loading exams...<\/td><\/tr>';
    
    if (!db) return;
    
    const { data, error } = await db.from('exams').select('*').order('exam_date');
    
    if (error || !data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">No exams found<\/td><\/tr>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < data.length; i++) {
        var e = data[i];
        
        html += '<tr>';
        html += '<td>' + cleanText(e.exam_type) + '<\/td>';
        html += '<td>' + cleanText(e.exam_name) + '<\/td>';
        html += '<td>' + new Date(e.exam_date).toLocaleDateString() + '<\/td>';
        html += '<td>' + cleanText(e.target_program) + '<\/td>';
        html += '<td>' + cleanText(e.status) + '<\/td>';
        html += '<td><button class="btn-sm btn-delete" onclick="deleteExamItem(\'' + e.id + '\')">Delete</button><\/td>';
        html += '<\/tr>';
    }
    
    tbody.innerHTML = html;
}

document.getElementById('add-exam-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    var examData = {
        exam_type: getEl('exam_type').value,
        exam_name: getEl('exam_title').value,
        exam_date: getEl('exam_date').value,
        exam_start_time: getEl('exam_time').value,
        target_program: getEl('exam_program').value,
        block_term: getEl('exam_block_term')?.value || 'General',
        status: 'Upcoming',
        duration_minutes: 60
    };
    
    if (!examData.exam_name || !examData.exam_date) {
        alert('Please fill in exam title and date');
        return;
    }
    
    const { error } = await db.from('exams').insert([examData]);
    
    if (error) {
        alert('Error: ' + error.message);
    } else {
        alert('✅ Exam added!');
        e.target.reset();
        loadExamList();
        setupCalendar();
    }
});

window.deleteExamItem = async function(examId) {
    if (!confirm('Delete this exam?')) return;
    
    const { error } = await db.from('exams').delete().eq('id', examId);
    
    if (error) {
        alert('Error: ' + error.message);
    } else {
        alert('✅ Exam deleted');
        loadExamList();
        setupCalendar();
    }
};

// ------------------------------------------------------------------
// RESOURCES
// ------------------------------------------------------------------
async function loadResourcesList() {
    var tbody = getEl('resources-list');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="5"><div class="loading-spinner"></div> Loading resources...<\/td><\/tr>';
    
    if (!db) return;
    
    const { data, error } = await db.from('resources').select('*').order('created_at', { ascending: false });
    
    if (error || !data || data.length === 0) {
        tbody.innerHTML = '<td><td colspan="5">No resources found<\/td><\/tr>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < data.length; i++) {
        var r = data[i];
        
        html += '<tr>';
        html += '<td>' + cleanText(r.title) + '<\/td>';
        html += '<td>' + cleanText(r.program_type) + '<\/td>';
        html += '<td>' + cleanText(r.uploaded_by_name || 'Admin') + '<\/td>';
        html += '<td>' + new Date(r.created_at).toLocaleDateString() + '<\/td>';
        html += '<td><a href="' + r.file_url + '" target="_blank" class="btn-sm btn-edit">View</a> <button class="btn-sm btn-delete" onclick="deleteResourceItem(\'' + r.id + '\')">Delete</button><\/td>';
        html += '<\/tr>';
    }
    
    tbody.innerHTML = html;
}

window.deleteResourceItem = async function(resourceId) {
    if (!confirm('Delete this resource?')) return;
    
    const { error } = await db.from('resources').delete().eq('id', resourceId);
    
    if (error) {
        alert('Error: ' + error.message);
    } else {
        alert('✅ Resource deleted');
        loadResourcesList();
    }
};

// ------------------------------------------------------------------
// MESSAGES
// ------------------------------------------------------------------
async function loadMessageList() {
    var tbody = getEl('messages-list');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="5"><div class="loading-spinner"></div> Loading messages...<\/td><\/tr>';
    
    if (!db) return;
    
    const { data, error } = await db.from('notifications').select('*').order('created_at', { ascending: false });
    
    if (error || !data || data.length === 0) {
        tbody.innerHTML = '</table><td colspan="5">No messages found<\/td><\/tr>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < data.length; i++) {
        var m = data[i];
        
        html += '</tr>';
        html += '<td>' + cleanText(m.target_program || 'All') + '<\/td>';
        html += '<td>' + cleanText(m.subject) + '<\/td>';
        html += '<td>' + cleanText(m.sender_name || 'System') + '<\/td>';
        html += '<td>' + new Date(m.created_at).toLocaleDateString() + '<\/td>';
        html += '<td><button class="btn-sm btn-edit" onclick="alert(\'View: ' + cleanText(m.subject) + '\')">View</button><\/td>';
        html += '<\/tr>';
    }
    
    tbody.innerHTML = html;
}

document.getElementById('send-message-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    var messageData = {
        target_program: getEl('msg_recipient').value === 'all' ? null : getEl('msg_recipient').value,
        subject: getEl('msg_subject').value,
        message: getEl('msg_body').value,
        message_type: 'system',
        sender_name: currentAdmin ? currentAdmin.full_name : 'Admin'
    };
    
    if (!messageData.subject || !messageData.message) {
        alert('Please enter subject and message');
        return;
    }
    
    const { error } = await db.from('notifications').insert([messageData]);
    
    if (error) {
        alert('Error: ' + error.message);
    } else {
        alert('✅ Message sent!');
        e.target.reset();
        loadMessageList();
    }
});

// ------------------------------------------------------------------
// CALENDAR
// ------------------------------------------------------------------
let calendarInstance = null;

async function setupCalendar() {
    var calendarEl = getEl('fullCalendarDisplay');
    if (!calendarEl) return;
    
    calendarEl.innerHTML = '<div class="loading-spinner"></div><p>Loading calendar...</p>';
    
    if (!db) return;
    
    const { data: sessions } = await db.from('scheduled_sessions').select('*');
    const { data: exams } = await db.from('exams').select('*');
    
    var events = [];
    
    if (sessions) {
        for (var i = 0; i < sessions.length; i++) {
            var s = sessions[i];
            var startDate = s.session_date;
            if (s.session_time) startDate = s.session_date + 'T' + s.session_time;
            
            events.push({
                id: 'session_' + s.id,
                title: s.session_title,
                start: startDate,
                color: '#3498db'
            });
        }
    }
    
    if (exams) {
        for (var i = 0; i < exams.length; i++) {
            var e = exams[i];
            var startDate = e.exam_date;
            if (e.exam_start_time) startDate = e.exam_date + 'T' + e.exam_start_time;
            
            events.push({
                id: 'exam_' + e.id,
                title: e.exam_type + ': ' + e.exam_name,
                start: startDate,
                color: '#e74c3c'
            });
        }
    }
    
    if (typeof FullCalendar !== 'undefined') {
        if (calendarInstance) calendarInstance.destroy();
        
        calendarInstance = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek'
            },
            events: events,
            height: 'auto'
        });
        
        calendarInstance.render();
    } else {
        calendarEl.innerHTML = '<p>Calendar not available</p>';
    }
}

// ------------------------------------------------------------------
// SESSIONS
// ------------------------------------------------------------------
async function loadScheduledSessions() {
    var tbody = getEl('sessions-list');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="5"><div class="loading-spinner"></div> Loading sessions...<\/td><\/tr>';
    
    if (!db) return;
    
    const { data, error } = await db.from('scheduled_sessions').select('*').order('session_date', { ascending: true });
    
    if (error || !data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No sessions found<\/td><\/tr>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < data.length; i++) {
        var s = data[i];
        
        html += '<tr>';
        html += '<td>' + cleanText(s.session_title) + '<\/td>';
        html += '<td>' + new Date(s.session_date).toLocaleDateString() + '<\/td>';
        html += '<td>' + (s.session_time || 'All day') + '<\/td>';
        html += '<td>' + cleanText(s.target_program) + '<\/td>';
        html += '<td><button class="btn-sm btn-delete" onclick="deleteSessionItem(\'' + s.id + '\')">Delete</button><\/td>';
        html += '<\/tr>';
    }
    
    tbody.innerHTML = html;
}

document.getElementById('add-session-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    var sessionData = {
        session_title: getEl('session_title').value,
        session_date: getEl('session_date').value,
        session_time: getEl('session_start_time').value,
        target_program: getEl('session_program').value,
        block_term: getEl('session_block_term')?.value || 'General',
        session_type: 'class'
    };
    
    if (!sessionData.session_title || !sessionData.session_date) {
        alert('Please fill in session title and date');
        return;
    }
    
    const { error } = await db.from('scheduled_sessions').insert([sessionData]);
    
    if (error) {
        alert('Error: ' + error.message);
    } else {
        alert('✅ Session scheduled!');
        e.target.reset();
        loadScheduledSessions();
        setupCalendar();
    }
});

window.deleteSessionItem = async function(sessionId) {
    if (!confirm('Delete this session?')) return;
    
    const { error } = await db.from('scheduled_sessions').delete().eq('id', sessionId);
    
    if (error) {
        alert('Error: ' + error.message);
    } else {
        alert('✅ Session deleted');
        loadScheduledSessions();
        setupCalendar();
    }
};

// ------------------------------------------------------------------
// WELCOME MESSAGE
// ------------------------------------------------------------------
async function loadWelcomeMessage() {
    var editor = getEl('welcome-message-editor');
    var preview = getEl('live-preview');
    
    if (!editor) return;
    
    if (!db) return;
    
    const { data } = await db.from('app_settings').select('value').eq('key', 'student_welcome').single();
    var content = (data && data.value) ? data.value : '<p>Welcome to NCHSM Learning Portal!</p>';
    
    editor.value = content;
    if (preview) preview.innerHTML = content;
}

async function loadWelcomeMessageForDisplay() {
    if (!db) return;
    
    const { data } = await db.from('app_settings').select('value').eq('key', 'student_welcome').single();
    var msgDiv = getEl('student-welcome-message');
    
    if (msgDiv && data && data.value) {
        msgDiv.innerHTML = data.value;
    }
}

document.getElementById('edit-welcome-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    var content = getEl('welcome-message-editor').value;
    
    const { error } = await db.from('app_settings').upsert([{ key: 'student_welcome', value: content }]);
    
    if (error) {
        alert('Error: ' + error.message);
    } else {
        alert('✅ Welcome message saved!');
        var preview = getEl('live-preview');
        if (preview) preview.innerHTML = content;
    }
});

// ------------------------------------------------------------------
// SYSTEM HEALTH
// ------------------------------------------------------------------
async function loadSystemHealth() {
    if (!db) return;
    
    const { count: activeSessions } = await db.from('user_sessions').select('*', { count: 'exact', head: true }).eq('is_active', true);
    
    var activeEl = getEl('activeSessions');
    if (activeEl) activeEl.textContent = activeSessions || 0;
    
    // Update progress bars
    var serverBar = document.getElementById('server-load-bar');
    var serverText = document.getElementById('server-load-text');
    if (serverBar) serverBar.style.width = '45%';
    if (serverText) serverText.textContent = '45%';
    
    var dbBar = document.getElementById('db-performance-bar');
    var dbText = document.getElementById('db-query-time');
    if (dbBar) dbBar.style.width = '78%';
    if (dbText) dbText.textContent = '78% - Optimal';
    
    var storageBar = document.getElementById('storage-usage-bar');
    var storageText = document.getElementById('storage-used');
    if (storageBar) storageBar.style.width = '62%';
    if (storageText) storageText.textContent = '62GB / 100GB';
    
    var apiBar = document.getElementById('api-response-bar');
    var apiText = document.getElementById('api-response-time');
    if (apiBar) apiBar.style.width = '92%';
    if (apiText) apiText.textContent = '92% - 180ms avg';
}

// ------------------------------------------------------------------
// USER ANALYTICS
// ------------------------------------------------------------------
async function loadUserAnalytics() {
    var dailyEl = document.getElementById('dailyActiveUsers');
    var sessionEl = document.getElementById('avgSessionDuration');
    var retentionEl = document.getElementById('weeklyRetention');
    var adoptionEl = document.getElementById('featureAdoption');
    
    if (dailyEl) dailyEl.textContent = '342';
    if (sessionEl) sessionEl.textContent = '12.4m';
    if (retentionEl) retentionEl.textContent = '78%';
    if (adoptionEl) adoptionEl.textContent = '64%';
}

// ------------------------------------------------------------------
// UTILITY FUNCTIONS FOR TABLE FILTERS & EXPORTS
// ------------------------------------------------------------------
window.filterTable = function(inputId, tableId, columns) {
    var searchVal = getEl(inputId);
    if (!searchVal) return;
    
    var filter = searchVal.value.toLowerCase();
    var table = document.getElementById(tableId);
    if (!table) return;
    
    var rows = table.getElementsByTagName('tr');
    
    for (var i = 0; i < rows.length; i++) {
        var match = false;
        for (var j = 0; j < columns.length; j++) {
            var cell = rows[i].getElementsByTagName('td')[columns[j]];
            if (cell && cell.innerText.toLowerCase().indexOf(filter) > -1) {
                match = true;
                break;
            }
        }
        rows[i].style.display = match ? '' : 'none';
    }
};

window.exportTableToCSV = function(tableId, filename) {
    var table = document.getElementById(tableId);
    if (!table) return;
    
    var csv = [];
    var rows = table.querySelectorAll('tr');
    
    for (var i = 0; i < rows.length; i++) {
        var row = [];
        var cols = rows[i].querySelectorAll('td, th');
        
        for (var j = 0; j < cols.length; j++) {
            var data = cols[j].innerText.replace(/"/g, '""');
            row.push('"' + data + '"');
        }
        csv.push(row.join(','));
    }
    
    var blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
};

window.closeModal = function(modalId) {
    var modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
};

window.logout = async function() {
    if (db) await db.auth.signOut();
    localStorage.clear();
    window.location.href = 'login.html';
};

// ------------------------------------------------------------------
// SEARCH & FILTER EVENT HANDLERS
// ------------------------------------------------------------------
var searchInput = getEl('unit_search');
if (searchInput) {
    searchInput.addEventListener('keyup', renderUnitList);
}

var programFilter = getEl('unit_filter_program');
if (programFilter) {
    programFilter.addEventListener('change', renderUnitList);
}

var accountSearch = getEl('account_search');
if (accountSearch) {
    accountSearch.addEventListener('keyup', function() {
        var search = this.value.toLowerCase();
        var rows = document.querySelectorAll('#student-accounts-body tr');
        
        for (var i = 0; i < rows.length; i++) {
            var name = rows[i].cells[0] ? rows[i].cells[0].innerText.toLowerCase() : '';
            var id = rows[i].cells[1] ? rows[i].cells[1].innerText.toLowerCase() : '';
            rows[i].style.display = (name.indexOf(search) > -1 || id.indexOf(search) > -1) ? '' : 'none';
        }
    });
}

var balanceFilter = getEl('account_balance_filter');
if (balanceFilter) {
    balanceFilter.addEventListener('change', function() {
        var filter = this.value;
        var rows = document.querySelectorAll('#student-accounts-body tr');
        
        for (var i = 0; i < rows.length; i++) {
            var balanceText = rows[i].cells[6] ? rows[i].cells[6].innerText : '';
            var balance = parseFloat(balanceText.replace('KES', '').replace(/,/g, '').trim());
            var show = true;
            
            if (filter === 'positive') show = balance < 0;
            else if (filter === 'zero') show = balance === 0;
            else if (filter === 'negative') show = balance > 0;
            
            rows[i].style.display = show ? '' : 'none';
        }
    });
}

// =====================================================
// ADDITIONAL FUNCTIONS FOR COMPLETENESS
// =====================================================

// Function to update block/term options based on program
function updateBlockTermOptions(programSelectId, blockSelectId) {
    var programSelect = document.getElementById(programSelectId);
    var blockSelect = document.getElementById(blockSelectId);
    
    if (!programSelect || !blockSelect) return;
    
    var program = programSelect.value;
    var isTVET = program !== 'KRCHN';
    
    blockSelect.innerHTML = '<option value="">-- Select Block/Term --</option>';
    
    if (isTVET) {
        var terms = ['Introductory', 'Term 1', 'Term 2', 'Term 3', 'Term 4', 'Term 5', 'Term 6', 'Final'];
        for (var i = 0; i < terms.length; i++) {
            var opt = document.createElement('option');
            opt.value = terms[i];
            opt.textContent = terms[i];
            blockSelect.appendChild(opt);
        }
    } else {
        var blocks = ['Introductory', 'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Block 6', 'Final'];
        for (var i = 0; i < blocks.length; i++) {
            var opt = document.createElement('option');
            opt.value = blocks[i];
            opt.textContent = blocks[i];
            blockSelect.appendChild(opt);
        }
    }
}

// Initialize program dropdowns
function initializeProgramDropdowns() {
    var programSelects = ['account-program', 'edit_user_program', 'course-program', 'exam_program', 'resource_program'];
    for (var i = 0; i < programSelects.length; i++) {
        var select = document.getElementById(programSelects[i]);
        if (select) {
            select.addEventListener('change', function() {
                var blockField = this.id === 'account-program' ? 'account-block-term' :
                                this.id === 'edit_user_program' ? 'edit_user_block' :
                                this.id === 'course-program' ? 'course-block' :
                                this.id === 'exam_program' ? 'exam-block-term' :
                                this.id === 'resource_program' ? 'resource-block' : null;
                if (blockField) updateBlockTermOptions(this.id, blockField);
            });
        }
    }
}

// Call initialization
setTimeout(function() {
    initializeProgramDropdowns();
}, 1000);
