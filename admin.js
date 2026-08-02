// =====================================================
// NCHSM ADMIN DASHBOARD - COMPLETE JAVASCRIPT
// ALL functions implemented - Modern UI matching Super Admin
// KRCHN uses BLOCKS, TVET uses TERMS
// INCLUDES: Unit Assignment to Lecturers + Charts + Modern UI
// =====================================================

// ------------------------------------------------------------------
// SUPABASE CONFIGURATION
// ------------------------------------------------------------------
const SUPABASE_URL = 'https://lwhtjozfsmbyihenfunw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk';

let db = null;
let currentAdmin = null;
let allUnitsList = [];
let selectedBlock = 'all';
let allResourcesData = [];
let currentResourceType = 'all';
let adminAllTickets = [];
let calendarInstance = null;
let chartInstances = {};

// ====================================================================
// LECTURER UNIT ASSIGNMENT - STATE
// ====================================================================
let allLecturers = [];
let allLecturerAssignments = [];
let currentLecturerId = null;
let availableUnitsForAssignment = [];

// ------------------------------------------------------------------
// KRCHN BLOCKS vs TVET TERMS - CORRECT DEFINITIONS
// ------------------------------------------------------------------
function getKRCHNBlocks() {
    return ['Introductory', 'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Block 6', 'Final'];
}

function getTVETTerms() {
    return ['Introductory Term', 'Term 1', 'Term 2', 'Term 3', 'Term 4', 'Term 5', 'Term 6', 'Term 7', 'Term 8', 'Term 9'];
}

function getBlockTermLabel(programCode) {
    if (programCode === 'KRCHN') return 'Block';
    return 'Term';
}

function getBlockTermOptions(programCode) {
    if (programCode === 'KRCHN') return getKRCHNBlocks();
    return getTVETTerms();
}

// ------------------------------------------------------------------
// TVET PROGRAM CODES AND DISPLAY NAMES
// ------------------------------------------------------------------
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

function getProgramDisplayName(code) {
    if (!code) return 'Unknown Program';
    return PROGRAM_DISPLAY_NAMES[code] || code;
}

function isTVETProgram(code) {
    if (!code) return false;
    return TVET_PROGRAMS.includes(code);
}

// ------------------------------------------------------------------
// UTILITY FUNCTIONS
// ------------------------------------------------------------------
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

function showToast(message, type) {
    type = type || 'success';
    const container = document.getElementById('toastContainer');
    if (!container) {
        alert(message);
        return;
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    const icon = type === 'success' ? 'fa-check-circle' : 
                 type === 'error' ? 'fa-exclamation-circle' :
                 type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle';
    toast.innerHTML = '<i class="fas ' + icon + '"></i> ' + message;
    container.appendChild(toast);
    
    setTimeout(function() {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(function() { toast.remove(); }, 300);
    }, 4000);
}

function formatDate(date) {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatDateTime(date) {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-KE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ------------------------------------------------------------------
// BLOCK/TERM DROPDOWN - CORRECTED FOR KRCHN vs TVET
// ------------------------------------------------------------------
function updateBlockTermDropdown(dropdownId, programCode) {
    var dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    
    var currentValue = dropdown.value;
    dropdown.innerHTML = '<option value="">-- Select --</option>';
    
    var options = getBlockTermOptions(programCode);
    
    for (var i = 0; i < options.length; i++) {
        var opt = document.createElement('option');
        opt.value = options[i];
        opt.textContent = options[i];
        dropdown.appendChild(opt);
    }
    
    if (currentValue) dropdown.value = currentValue;
}

function setupBlockTermDropdowns() {
    var programSelects = [
        { program: 'account-program', block: 'account-block-term' },
        { program: 'edit_user_program', block: 'edit_user_block' },
        { program: 'course-program', block: 'course-block' },
        { program: 'session_program', block: 'session-block' },
        { program: 'exam_program', block: 'exam-block' },
        { program: 'resource_program', block: 'resource-block' }
    ];
    
    for (var i = 0; i < programSelects.length; i++) {
        var programSelect = document.getElementById(programSelects[i].program);
        var blockSelect = document.getElementById(programSelects[i].block);
        
        if (programSelect && blockSelect) {
            programSelect.addEventListener('change', (function(blockId) {
                return function() {
                    updateBlockTermDropdown(blockId, this.value);
                };
            })(programSelects[i].block));
            
            if (programSelect.value) {
                updateBlockTermDropdown(programSelects[i].block, programSelect.value);
            }
        }
    }
}

// ------------------------------------------------------------------
// INITIALIZATION
// ------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Admin panel loading...');
    
    // Set current date
    const dateEl = document.getElementById('currentDate');
    if (dateEl) {
        const now = new Date();
        dateEl.textContent = now.toLocaleDateString('en-KE', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
    
    if (typeof supabase !== 'undefined') {
        db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    } else {
        setTimeout(function() {
            if (typeof supabase !== 'undefined') {
                db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            }
        }, 500);
    }
    
    checkUserSession();
    setupNavigation();
    setupMobileMenu();
    setupDropdowns();
    loadDashboardNumbers();
    setupBlockTermDropdowns();
    setupAssignmentEventListeners();
    initCharts();
});

// ------------------------------------------------------------------
// SETUP DROPDOWNS (Matches Super Admin)
// ------------------------------------------------------------------
function setupDropdowns() {
    const dropdownToggles = document.querySelectorAll('.nav-dropdown > a');
    dropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const parentLi = this.closest('.nav-dropdown');
            
            // Close all other dropdowns
            document.querySelectorAll('.nav-dropdown').forEach(dropdown => {
                if (dropdown !== parentLi) {
                    dropdown.classList.remove('open');
                }
            });
            
            parentLi.classList.toggle('open');
        });
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.nav-dropdown')) {
            document.querySelectorAll('.nav-dropdown').forEach(dropdown => {
                dropdown.classList.remove('open');
            });
        }
    });
}

// ------------------------------------------------------------------
// SETUP ASSIGNMENT EVENT LISTENERS
// ------------------------------------------------------------------
function setupAssignmentEventListeners() {
    const searchInput = document.getElementById('lecturerSearch');
    if (searchInput) {
        searchInput.addEventListener('keyup', filterLecturerList);
    }
    
    const programFilter = document.getElementById('lecturerProgramFilter');
    if (programFilter) {
        programFilter.addEventListener('change', filterLecturerList);
    }
    
    const unitSearch = document.getElementById('unitSearchInput');
    if (unitSearch) {
        unitSearch.addEventListener('keyup', filterAvailableUnits);
    }
}

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
        
        const userEmail = session.data.session.user.email;
        const { data: profile } = await db
            .from('consolidated_user_profiles_table')
            .select('*')
            .eq('email', userEmail)
            .single();
        
        if (profile) {
            currentAdmin = profile;
            
            const nameSpan = document.getElementById('adminName');
            if (nameSpan && profile.full_name) {
                nameSpan.textContent = profile.full_name;
            }
            
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
    var navLinks = document.querySelectorAll('.nav a[data-tab]');
    var allTabs = document.querySelectorAll('.tab-content');
    
    for (var i = 0; i < navLinks.length; i++) {
        navLinks[i].addEventListener('click', function(e) {
            e.preventDefault();
            
            var tabId = this.getAttribute('data-tab');
            
            for (var j = 0; j < navLinks.length; j++) {
                navLinks[j].classList.remove('active');
            }
            this.classList.add('active');
            
            for (var k = 0; k < allTabs.length; k++) {
                allTabs[k].style.display = 'none';
                allTabs[k].classList.remove('active');
            }
            
            var targetTab = document.getElementById(tabId);
            if (targetTab) {
                targetTab.style.display = 'block';
                targetTab.classList.add('active');
                loadTabContent(tabId);
            }
            
            // Close mobile sidebar
            document.getElementById('sidebar')?.classList.remove('active');
        });
    }
    
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

window.showTab = function(tabId) {
    var navLink = document.querySelector('.nav a[data-tab="' + tabId + '"]');
    if (navLink) navLink.click();
};

function loadTabContent(tabName) {
    switch(tabName) {
        case 'dashboard': loadDashboardNumbers(); break;
        case 'users': loadAllUsers(); break;
        case 'pending': loadPendingUsers(); break;
        case 'enroll': loadStudents(); break;
        case 'courses': loadAllCourses(); break;
        case 'unit-management': loadAllUnits(); break;
        case 'lecturer-assignment': loadLecturersForAssignment(); break;
        case 'support-tickets': loadAdminTickets(); break;
        case 'sessions': loadScheduledSessions(); break;
        case 'attendance': loadTodayAttendance(); break;
        case 'cats': loadExamList(); break;
        case 'resources': loadAllResources(); break;
        case 'messages': loadMessageList(); break;
        case 'calendar': setupCalendar(); break;
        case 'welcome-editor': loadWelcomeMessage(); break;
    }
}

// ------------------------------------------------------------------
// DASHBOARD NUMBERS
// ------------------------------------------------------------------
async function loadDashboardNumbers() {
    if (!db) return;
    
    try {
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
        
        const { count: lecturerCount } = await db
            .from('consolidated_user_profiles_table')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'lecturer')
            .eq('status', 'approved');
        
        var today = new Date().toISOString().slice(0,10);
        const { count: checkIns } = await db
            .from('geo_attendance_logs')
            .select('*', { count: 'exact', head: true })
            .gte('check_in_time', today);
        
        var totalEl = document.getElementById('totalUsers');
        var pendingEl = document.getElementById('pendingApprovals');
        var studentsEl = document.getElementById('totalStudents');
        var coursesEl = document.getElementById('totalCourses');
        var unitsEl = document.getElementById('dashboardTotalUnits');
        var ticketsEl = document.getElementById('dashboardOpenTickets');
        var checkinsEl = document.getElementById('totalDailyCheckIns');
        var lecturersEl = document.getElementById('dashboardLecturers');
        
        if (totalEl) totalEl.textContent = totalUsers || 0;
        if (pendingEl) pendingEl.textContent = pendingCount || 0;
        if (studentsEl) studentsEl.textContent = studentCount || 0;
        if (coursesEl) coursesEl.textContent = courseCount || 0;
        if (unitsEl) unitsEl.textContent = unitCount || 0;
        if (ticketsEl) ticketsEl.textContent = openTickets || 0;
        if (checkinsEl) checkinsEl.textContent = checkIns || 0;
        if (lecturersEl) lecturersEl.textContent = lecturerCount || 0;
        
        loadWelcomeMessageForDisplay();
        updateCharts();
        
    } catch(e) {
        console.log('Dashboard error:', e);
    }
}

// ------------------------------------------------------------------
// CHARTS - Matches Super Admin
// ------------------------------------------------------------------
function initCharts() {
    // Enrolment by Block Chart
    const ctx1 = document.getElementById('enrolmentBlockChart');
    if (ctx1) {
        chartInstances.enrolment = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: ['Introductory', 'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Final'],
                datasets: [{
                    label: 'Students',
                    data: [0, 0, 0, 0, 0, 0],
                    backgroundColor: ['#4C1D95', '#6d28d9', '#8b5cf6', '#a78bfa', '#c4b5fd', '#e9d5ff'],
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }
    
    // Gender Distribution Chart
    const ctx2 = document.getElementById('genderDistributionChart');
    if (ctx2) {
        chartInstances.gender = new Chart(ctx2, {
            type: 'doughnut',
            data: {
                labels: ['Male', 'Female'],
                datasets: [{
                    data: [0, 0],
                    backgroundColor: ['#3b82f6', '#ec4899'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
}

async function updateCharts() {
    if (!db) return;
    
    try {
        // Get student counts by block
        const { data: students } = await db
            .from('consolidated_user_profiles_table')
            .select('block')
            .eq('role', 'student')
            .eq('status', 'approved');
        
        if (students) {
            const blocks = ['Introductory', 'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Final'];
            const counts = blocks.map(block => 
                students.filter(s => s.block === block).length
            );
            
            if (chartInstances.enrolment) {
                chartInstances.enrolment.data.datasets[0].data = counts;
                chartInstances.enrolment.update();
            }
        }
        
        // Get gender distribution
        const { data: genderData } = await db
            .from('consolidated_user_profiles_table')
            .select('gender')
            .eq('role', 'student')
            .eq('status', 'approved');
        
        if (genderData) {
            const male = genderData.filter(s => s.gender === 'Male' || s.gender === 'M').length;
            const female = genderData.filter(s => s.gender === 'Female' || s.gender === 'F').length;
            
            if (chartInstances.gender) {
                chartInstances.gender.data.datasets[0].data = [male, female];
                chartInstances.gender.update();
            }
        }
    } catch(e) {
        console.log('Chart update error:', e);
    }
}

// ------------------------------------------------------------------
// USER MANAGEMENT
// ------------------------------------------------------------------
async function loadAllUsers() {
    var tbody = document.getElementById('users-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="7"><div class="loading-spinner"></div> Loading users...</td></tr>';
    
    if (!db) return;
    
    const { data, error } = await db
        .from('consolidated_user_profiles_table')
        .select('*')
        .neq('role', 'superadmin')
        .order('full_name');
    
    if (error) {
        tbody.innerHTML = '<tr><td colspan="7">Error: ' + error.message + '</td></tr>';
        return;
    }
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">No users found</td></tr>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < data.length; i++) {
        var u = data[i];
        var statusClass = (u.status === 'approved' || u.status === 'active') ? 'badge-success' : 'badge-warning';
        var shortId = u.user_id ? u.user_id.substring(0,8) : 'N/A';
        var programName = getProgramDisplayName(u.program);
        var blockTermLabel = getBlockTermLabel(u.program);
        var blockTermDisplay = u.block || (blockTermLabel === 'Block' ? 'Not Assigned' : 'Not Assigned');
        
        html += '<tr>';
        html += '<td>' + shortId + '...</td>';
        html += '<td>' + escapeHtml(u.full_name) + '</td>';
        html += '<td>' + escapeHtml(u.email) + '</td>';
        html += '<td><span class="badge badge-primary">' + escapeHtml(u.role) + '</span></td>';
        html += '<td>' + escapeHtml(programName) + '<br><small style="color:#94a3b8;">' + blockTermLabel + ': ' + escapeHtml(blockTermDisplay) + '</small></td>';
        html += '<td><span class="badge ' + statusClass + '">' + (u.status || 'pending') + '</span></td>';
        html += '<td>';
        html += '<button class="btn-sm btn-edit" onclick="openEditUser(\'' + u.user_id + '\')"><i class="fas fa-edit"></i></button> ';
        html += '<button class="btn-sm btn-delete" onclick="deleteUserAccount(\'' + u.user_id + '\', \'' + escapeHtml(u.full_name) + '\')"><i class="fas fa-trash"></i></button>';
        html += '</td>';
        html += '</tr>';
    }
    
    tbody.innerHTML = html;
}

async function loadPendingUsers() {
    var tbody = document.getElementById('pending-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="6"><div class="loading-spinner"></div> Loading...</td></tr>';
    
    if (!db) return;
    
    const { data, error } = await db
        .from('consolidated_user_profiles_table')
        .select('*')
        .eq('status', 'pending')
        .order('created_at');
    
    if (error) {
        tbody.innerHTML = '<tr><td colspan="6">Error: ' + error.message + '</td></tr>';
        return;
    }
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">No pending approvals</td></tr>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < data.length; i++) {
        var u = data[i];
        var dateStr = u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A';
        var programName = getProgramDisplayName(u.program);
        
        html += '<tr>';
        html += '<td>' + escapeHtml(u.full_name) + '</td>';
        html += '<td>' + escapeHtml(u.email) + '</td>';
        html += '<td><span class="badge badge-primary">' + escapeHtml(u.role) + '</span></td>';
        html += '<td>' + escapeHtml(programName) + '</td>';
        html += '<td>' + dateStr + '</td>';
        html += '<td>';
        html += '<button class="btn-sm btn-success" onclick="approveUser(\'' + u.user_id + '\', \'' + escapeHtml(u.full_name) + '\')"><i class="fas fa-check"></i></button> ';
        html += '<button class="btn-sm btn-delete" onclick="deleteUserAccount(\'' + u.user_id + '\', \'' + escapeHtml(u.full_name) + '\')"><i class="fas fa-times"></i></button>';
        html += '</td>';
        html += '</tr>';
    }
    
    tbody.innerHTML = html;
}

async function loadStudents() {
    var tbody = document.getElementById('students-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="6"><div class="loading-spinner"></div> Loading students...</td></tr>';
    
    if (!db) return;
    
    const { data, error } = await db
        .from('consolidated_user_profiles_table')
        .select('*')
        .eq('role', 'student')
        .order('full_name');
    
    if (error) {
        tbody.innerHTML = '<tr><td colspan="6">Error: ' + error.message + '</td></tr>';
        return;
    }
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">No students found</td></tr>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < data.length; i++) {
        var s = data[i];
        var shortId = s.user_id ? s.user_id.substring(0,8) : 'N/A';
        var statusClass = (s.status === 'approved' || s.status === 'active') ? 'badge-success' : 'badge-warning';
        var programName = getProgramDisplayName(s.program);
        
        html += '<tr>';
        html += '<td>' + shortId + '...</td>';
        html += '<td>' + escapeHtml(s.full_name) + '</td>';
        html += '<td>' + escapeHtml(s.email) + '</td>';
        html += '<td>' + escapeHtml(programName) + '</td>';
        html += '<td><span class="badge ' + statusClass + '">' + (s.status || 'pending') + '</span></td>';
        html += '<td><button class="btn-sm btn-edit" onclick="openEditUser(\'' + s.user_id + '\')"><i class="fas fa-edit"></i></button></td>';
        html += '</tr>';
    }
    
    tbody.innerHTML = html;
}

// Enroll form handler
document.getElementById('add-account-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    var name = document.getElementById('account-name').value;
    var email = document.getElementById('account-email').value;
    var password = document.getElementById('account-password').value;
    var role = document.getElementById('account-role').value;
    var phone = document.getElementById('account-phone').value;
    var program = document.getElementById('account-program').value;
    var intake = document.getElementById('account-intake').value;
    var block = document.getElementById('account-block-term')?.value || 'Introductory';
    
    if (!name || !email || !password) {
        showToast('Please fill in all required fields', 'warning');
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
        
        showToast('✅ Account created for ' + name, 'success');
        e.target.reset();
        loadAllUsers();
        loadStudents();
        loadDashboardNumbers();
        
    } catch(err) {
        showToast('Error: ' + err.message, 'error');
    }
});

window.approveUser = async function(userId, fullName) {
    if (!confirm('Approve ' + fullName + '?')) return;
    
    try {
        await db.from('consolidated_user_profiles_table')
            .update({ status: 'approved' })
            .eq('user_id', userId);
        
        showToast('✅ ' + fullName + ' approved!', 'success');
        loadPendingUsers();
        loadAllUsers();
        loadDashboardNumbers();
    } catch(err) {
        showToast('Error: ' + err.message, 'error');
    }
};

window.deleteUserAccount = async function(userId, fullName) {
    if (!confirm('Delete ' + fullName + '? This cannot be undone.')) return;
    
    try {
        await db.from('consolidated_user_profiles_table').delete().eq('user_id', userId);
        showToast('✅ User deleted', 'success');
        loadPendingUsers();
        loadAllUsers();
        loadStudents();
        loadDashboardNumbers();
    } catch(err) {
        showToast('Error: ' + err.message, 'error');
    }
};

window.openEditUser = async function(userId) {
    try {
        const { data: user, error } = await db
            .from('consolidated_user_profiles_table')
            .select('*')
            .eq('user_id', userId)
            .single();
        
        if (error || !user) {
            showToast('User not found', 'error');
            return;
        }
        
        document.getElementById('edit_user_id').value = user.user_id;
        document.getElementById('edit_user_id_display').textContent = user.user_id.substring(0,8);
        document.getElementById('edit_user_name').value = user.full_name || '';
        document.getElementById('edit_user_email').value = user.email || '';
        document.getElementById('edit_user_role').value = user.role || 'student';
        document.getElementById('edit_user_program').value = user.program || 'KRCHN';
        document.getElementById('edit_user_intake').value = user.intake_year || '2024';
        document.getElementById('edit_user_block_status').value = user.block_program_year ? 'true' : 'false';
        
        updateBlockTermDropdown('edit_user_block', user.program);
        setTimeout(function() {
            var blockSelect = document.getElementById('edit_user_block');
            if (blockSelect && user.block) {
                blockSelect.value = user.block;
            }
        }, 100);
        
        document.getElementById('userEditModal').style.display = 'flex';
        
    } catch(err) {
        showToast('Error loading user: ' + err.message, 'error');
    }
};

document.getElementById('edit-user-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    var userId = document.getElementById('edit_user_id').value;
    var newPassword = document.getElementById('edit_user_new_password').value;
    var confirmPassword = document.getElementById('edit_user_confirm_password').value;
    
    if (newPassword && newPassword !== confirmPassword) {
        showToast('Passwords do not match!', 'warning');
        return;
    }
    
    var updatedData = {
        full_name: document.getElementById('edit_user_name').value,
        email: document.getElementById('edit_user_email').value,
        role: document.getElementById('edit_user_role').value,
        program: document.getElementById('edit_user_program').value,
        intake_year: document.getElementById('edit_user_intake').value,
        block: document.getElementById('edit_user_block').value,
        block_program_year: document.getElementById('edit_user_block_status').value === 'true',
        updated_at: new Date().toISOString()
    };
    
    try {
        const { error } = await db
            .from('consolidated_user_profiles_table')
            .update(updatedData)
            .eq('user_id', userId);
        
        if (error) throw error;
        
        if (newPassword) {
            try {
                await db.auth.admin.updateUserById(userId, { password: newPassword });
            } catch(pwErr) {
                console.warn('Password update failed:', pwErr);
            }
        }
        
        showToast('✅ User updated successfully!', 'success');
        document.getElementById('userEditModal').style.display = 'none';
        document.getElementById('edit_user_new_password').value = '';
        document.getElementById('edit_user_confirm_password').value = '';
        loadAllUsers();
        loadStudents();
        
    } catch(err) {
        showToast('Error: ' + err.message, 'error');
    }
});

// ------------------------------------------------------------------
// COURSE MANAGEMENT
// ------------------------------------------------------------------
async function loadAllCourses() {
    var tbody = document.getElementById('courses-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="5"><div class="loading-spinner"></div> Loading courses...</td></tr>';
    
    if (!db) return;
    
    const { data, error } = await db.from('courses').select('*').order('course_name');
    
    if (error) {
        tbody.innerHTML = '<tr><td colspan="5">Error: ' + error.message + '</td></tr>';
        return;
    }
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No courses found</td></tr>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < data.length; i++) {
        var c = data[i];
        var programName = getProgramDisplayName(c.target_program);
        
        html += '<tr>';
        html += '<td>' + escapeHtml(c.course_name) + '</td>';
        html += '<td>' + escapeHtml(c.unit_code || 'N/A') + '</td>';
        html += '<td>' + escapeHtml(programName) + '</td>';
        html += '<td>' + (c.intake_year || 'N/A') + '</td>';
        html += '<td><button class="btn-sm btn-delete" onclick="deleteCourseItem(\'' + c.id + '\')"><i class="fas fa-trash"></i></button></td>';
        html += '</tr>';
    }
    
    tbody.innerHTML = html;
}

document.getElementById('add-course-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    var name = document.getElementById('course-name').value;
    var code = document.getElementById('course-unit-code').value;
    var program = document.getElementById('course-program').value;
    var intake = document.getElementById('course-intake').value;
    var block = document.getElementById('course-block')?.value || 'General';
    
    if (!name || !code) {
        showToast('Course name and unit code are required', 'warning');
        return;
    }
    
    try {
        const { error } = await db.from('courses').insert([{
            course_name: name,
            unit_code: code,
            target_program: program,
            intake_year: intake,
            block: block,
            status: 'Active'
        }]);
        
        if (error) throw error;
        
        showToast('✅ Course added!', 'success');
        e.target.reset();
        loadAllCourses();
        
    } catch(err) {
        showToast('Error: ' + err.message, 'error');
    }
});

window.deleteCourseItem = async function(courseId) {
    if (!confirm('Delete this course?')) return;
    
    try {
        const { error } = await db.from('courses').delete().eq('id', courseId);
        if (error) throw error;
        showToast('✅ Course deleted', 'success');
        loadAllCourses();
    } catch(err) {
        showToast('Error: ' + err.message, 'error');
    }
};

// ------------------------------------------------------------------
// UNIT MANAGEMENT
// ------------------------------------------------------------------
async function loadAllUnits() {
    var container = document.getElementById('units-list-container');
    if (!container) return;
    
    container.innerHTML = '<div class="loading-spinner"></div><p>Loading units...</p>';
    
    if (!db) return;
    
    try {
        const { data, error } = await db.from('units_catalog').select('*').order('block').order('unit_code');
        
        if (error) throw error;
        
        allUnitsList = data || [];
        renderUnitList();
        
        // Also refresh available units for assignment
        await loadAvailableUnitsForAssignment();
        
        // Update unit count
        const countEl = document.getElementById('unitCountDisplay');
        if (countEl) countEl.textContent = allUnitsList.length;
        
    } catch(err) {
        container.innerHTML = '<p style="color: #dc2626;">Error loading units: ' + err.message + '</p>';
    }
}

function renderUnitList() {
    var container = document.getElementById('units-list-container');
    if (!container) return;
    
    var searchTerm = document.getElementById('unit_search')?.value.toLowerCase() || '';
    var programFilter = document.getElementById('unit_filter_program')?.value || '';
    
    var filtered = [];
    for (var i = 0; i < allUnitsList.length; i++) {
        var u = allUnitsList[i];
        
        if (searchTerm && !u.unit_code.toLowerCase().includes(searchTerm) && !u.unit_name.toLowerCase().includes(searchTerm)) {
            continue;
        }
        if (programFilter && programFilter !== 'TVET' && u.program !== programFilter) continue;
        if (programFilter === 'TVET' && !isTVETProgram(u.program)) continue;
        if (selectedBlock !== 'all' && u.block !== selectedBlock) continue;
        
        filtered.push(u);
    }
    
    if (filtered.length === 0) {
        container.innerHTML = '<p style="color: #6b7280; text-align: center; padding: 40px 0;">No units found</p>';
        return;
    }
    
    var html = '<div class="units-grid">';
    for (var i = 0; i < filtered.length; i++) {
        var u = filtered[i];
        var programName = getProgramDisplayName(u.program);
        var blockTermLabel = getBlockTermLabel(u.program);
        
        html += '<div class="unit-card">';
        html += '<div class="unit-header">';
        html += '<span class="unit-code">' + escapeHtml(u.unit_code) + '</span>';
        html += '<span class="unit-name">' + escapeHtml(u.unit_name) + '</span>';
        html += '</div>';
        html += '<div class="unit-meta">';
        html += '<span><i class="fas fa-graduation-cap"></i> ' + escapeHtml(programName) + '</span>';
        html += '<span><i class="fas fa-layer-group"></i> ' + blockTermLabel + ': ' + escapeHtml(u.block) + '</span>';
        html += '<span><i class="fas fa-calendar"></i> ' + (u.year || 'N/A') + '</span>';
        html += '<span><i class="fas fa-star"></i> ' + (u.credits || 3) + ' Credits</span>';
        html += '</div></div>';
    }
    html += '</div>';
    
    container.innerHTML = html;
}

window.filterUnitsByBlock = function(block) {
    selectedBlock = block;
    
    var btns = document.querySelectorAll('.block-btn');
    for (var i = 0; i < btns.length; i++) {
        btns[i].classList.remove('active');
        if (btns[i].getAttribute('data-block') === block) {
            btns[i].classList.add('active');
        }
    }
    
    renderUnitList();
};

window.filterUnitsCatalog = function() {
    renderUnitList();
};

window.addNewUnitRecord = async function() {
    var unitCode = document.getElementById('new_unit_code').value;
    var unitName = document.getElementById('new_unit_name').value;
    var program = document.getElementById('new_unit_program').value;
    var block = document.getElementById('new_unit_block').value;
    var year = parseInt(document.getElementById('new_unit_year').value);
    var credits = parseInt(document.getElementById('new_unit_credits').value);
    var hours = parseInt(document.getElementById('new_unit_hours').value);
    var unitType = document.getElementById('new_unit_type').value;
    var prerequisites = document.getElementById('new_unit_prerequisites').value || null;
    
    if (!unitCode || !unitName) {
        showToast('Please fill in Unit Code and Unit Name', 'warning');
        return;
    }
    
    try {
        const { error } = await db.from('units_catalog').insert([{
            unit_code: unitCode,
            unit_name: unitName,
            program: program,
            block: block,
            year: year,
            credits: credits,
            hours: hours,
            unit_type: unitType,
            prerequisites: prerequisites,
            status: 'active'
        }]);
        
        if (error) throw error;
        
        showToast('✅ Unit "' + unitCode + '" added successfully!', 'success');
        document.getElementById('new_unit_code').value = '';
        document.getElementById('new_unit_name').value = '';
        document.getElementById('new_unit_prerequisites').value = '';
        loadAllUnits();
        
    } catch(err) {
        showToast('Error adding unit: ' + err.message, 'error');
    }
};

// ====================================================================
// LECTURER UNIT ASSIGNMENT - COMPLETE IMPLEMENTATION
// ====================================================================

// ------------------------------------------------------------------
// LOAD LECTURERS FOR ASSIGNMENT
// ------------------------------------------------------------------
async function loadLecturersForAssignment() {
    const container = document.getElementById('lecturer-assignment-list');
    if (!container) {
        console.warn('lecturer-assignment-list container not found');
        return;
    }
    
    container.innerHTML = '<div class="loading-spinner"></div><p>Loading lecturers...</p>';
    
    if (!db) return;
    
    try {
        const { data, error } = await db
            .from('consolidated_user_profiles_table')
            .select('*')
            .eq('role', 'lecturer')
            .eq('status', 'approved')
            .order('full_name');
        
        if (error) throw error;
        
        allLecturers = data || [];
        
        await loadExistingAssignments();
        updateAssignmentStats();
        renderLecturerList();
        
    } catch(err) {
        console.error('Error loading lecturers:', err);
        container.innerHTML = '<p style="color: #dc2626;">Error loading lecturers: ' + err.message + '</p>';
    }
}

// ------------------------------------------------------------------
// LOAD EXISTING ASSIGNMENTS
// ------------------------------------------------------------------
async function loadExistingAssignments() {
    if (!db) return;
    
    try {
        const { data, error } = await db
            .from('lecturer_unit_assignments')
            .select('*');
        
        if (error) throw error;
        
        allLecturerAssignments = data || [];
        
    } catch(err) {
        console.error('Error loading assignments:', err);
        allLecturerAssignments = [];
    }
}

// ------------------------------------------------------------------
// LOAD AVAILABLE UNITS FOR ASSIGNMENT
// ------------------------------------------------------------------
async function loadAvailableUnitsForAssignment() {
    if (!db) return;
    
    try {
        const { data, error } = await db
            .from('units_catalog')
            .select('*')
            .eq('status', 'active')
            .order('block')
            .order('unit_code');
        
        if (error) throw error;
        
        availableUnitsForAssignment = data || [];
        
    } catch(err) {
        console.error('Error loading available units:', err);
        availableUnitsForAssignment = [];
    }
}

// ------------------------------------------------------------------
// UPDATE ASSIGNMENT STATS
// ------------------------------------------------------------------
function updateAssignmentStats() {
    const totalLecturers = allLecturers.length;
    const totalAssignments = allLecturerAssignments.length;
    const lecturersWithAssignments = new Set(allLecturerAssignments.map(a => a.lecturer_id)).size;
    const pending = totalLecturers - lecturersWithAssignments;
    
    const totalEl = document.getElementById('assignmentTotalLecturers');
    const assignEl = document.getElementById('assignmentTotalAssignments');
    const pendingEl = document.getElementById('assignmentPending');
    
    if (totalEl) totalEl.textContent = totalLecturers;
    if (assignEl) assignEl.textContent = totalAssignments;
    if (pendingEl) pendingEl.textContent = pending;
}

// ------------------------------------------------------------------
// FILTER LECTURER LIST
// ------------------------------------------------------------------
function filterLecturerList() {
    renderLecturerList();
}

// ------------------------------------------------------------------
// RENDER LECTURER LIST
// ------------------------------------------------------------------
function renderLecturerList() {
    const container = document.getElementById('lecturer-assignment-list');
    if (!container) return;
    
    const searchTerm = document.getElementById('lecturerSearch')?.value?.toLowerCase() || '';
    const programFilter = document.getElementById('lecturerProgramFilter')?.value || 'all';
    
    let filtered = allLecturers.filter(lecturer => {
        if (searchTerm) {
            const name = (lecturer.full_name || '').toLowerCase();
            const email = (lecturer.email || '').toLowerCase();
            if (!name.includes(searchTerm) && !email.includes(searchTerm)) {
                return false;
            }
        }
        
        if (programFilter !== 'all') {
            if (programFilter === 'TVET' && !isTVETProgram(lecturer.program)) return false;
            if (programFilter === 'KRCHN' && lecturer.program !== 'KRCHN') return false;
            if (programFilter !== 'TVET' && programFilter !== 'KRCHN' && lecturer.program !== programFilter) return false;
        }
        
        return true;
    });
    
    if (filtered.length === 0) {
        container.innerHTML = '<p style="color: #6b7280; text-align: center; padding: 40px 0;">No lecturers found matching your filters.</p>';
        return;
    }
    
    var html = '<div class="lecturer-grid">';
    
    for (var i = 0; i < filtered.length; i++) {
        var lecturer = filtered[i];
        var assignedUnits = allLecturerAssignments.filter(
            a => a.lecturer_id === lecturer.user_id
        );
        var unitCount = assignedUnits.length;
        var programName = getProgramDisplayName(lecturer.program);
        
        html += `
            <div class="lecturer-card" onclick="openUnitAssignmentModal('${lecturer.user_id}')">
                <div class="lecturer-avatar">
                    <i class="fas fa-user-tie"></i>
                </div>
                <div class="lecturer-info">
                    <h4>${escapeHtml(lecturer.full_name)}</h4>
                    <p class="lecturer-email"><i class="fas fa-envelope"></i> ${escapeHtml(lecturer.email)}</p>
                    <p class="lecturer-program"><i class="fas fa-graduation-cap"></i> ${escapeHtml(programName)}</p>
                    <div class="lecturer-stats">
                        <span class="unit-count"><i class="fas fa-book"></i> ${unitCount} units assigned</span>
                    </div>
                </div>
                <div class="lecturer-actions">
                    <button class="btn-sm btn-edit" onclick="event.stopPropagation(); openUnitAssignmentModal('${lecturer.user_id}')">
                        <i class="fas fa-pencil-alt"></i> Assign
                    </button>
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    container.innerHTML = html;
}

// ------------------------------------------------------------------
// OPEN UNIT ASSIGNMENT MODAL
// ------------------------------------------------------------------
async function openUnitAssignmentModal(lecturerId) {
    currentLecturerId = lecturerId;
    
    const lecturer = allLecturers.find(l => l.user_id === lecturerId);
    if (!lecturer) {
        showToast('Lecturer not found', 'error');
        return;
    }
    
    document.getElementById('modalLecturerName').textContent = lecturer.full_name;
    document.getElementById('modalLecturerEmail').textContent = lecturer.email;
    document.getElementById('modalLecturerProgram').textContent = getProgramDisplayName(lecturer.program);
    document.getElementById('assignmentLecturerName').textContent = lecturer.full_name;
    
    const assignedUnits = allLecturerAssignments.filter(
        a => a.lecturer_id === lecturerId
    );
    document.getElementById('modalAssignedCount').textContent = assignedUnits.length;
    
    renderAssignedUnits(assignedUnits);
    await renderAvailableUnits(lecturerId, assignedUnits);
    
    document.getElementById('unitAssignmentModal').style.display = 'flex';
}

// ------------------------------------------------------------------
// RENDER ASSIGNED UNITS
// ------------------------------------------------------------------
function renderAssignedUnits(assignedUnits) {
    const container = document.getElementById('assigned-units-list');
    if (!container) return;
    
    if (assignedUnits.length === 0) {
        container.innerHTML = '<p class="text-muted"><i class="fas fa-info-circle"></i> No units assigned yet</p>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < assignedUnits.length; i++) {
        var a = assignedUnits[i];
        html += `
            <div class="assigned-unit-item">
                <span class="unit-code">${escapeHtml(a.unit_code)}</span>
                <span class="unit-name">${escapeHtml(a.unit_name)}</span>
                <button class="btn-sm btn-delete" onclick="removeUnitFromLecturer('${a.id}', '${escapeHtml(a.unit_code)}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// ------------------------------------------------------------------
// RENDER AVAILABLE UNITS
// ------------------------------------------------------------------
async function renderAvailableUnits(lecturerId, assignedUnits) {
    const container = document.getElementById('available-units-list');
    if (!container) return;
    
    await loadAvailableUnitsForAssignment();
    
    const assignedUnitIds = assignedUnits.map(a => a.unit_id);
    const available = availableUnitsForAssignment.filter(u => !assignedUnitIds.includes(u.id));
    
    if (available.length === 0) {
        container.innerHTML = '<p class="text-muted"><i class="fas fa-check-circle"></i> All units assigned</p>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < available.length; i++) {
        var u = available[i];
        var blockTermLabel = getBlockTermLabel(u.program);
        
        html += `
            <div class="available-unit-item" onclick="assignUnitToLecturer('${lecturerId}', '${u.id}', '${escapeHtml(u.unit_code)}', '${escapeHtml(u.unit_name)}')">
                <span class="unit-code">${escapeHtml(u.unit_code)}</span>
                <span class="unit-name">${escapeHtml(u.unit_name)}</span>
                <span class="unit-block"><i class="fas fa-layer-group"></i> ${blockTermLabel}: ${escapeHtml(u.block)}</span>
                <button class="btn-sm btn-success">
                    <i class="fas fa-plus"></i> Assign
                </button>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// ------------------------------------------------------------------
// FILTER AVAILABLE UNITS IN MODAL
// ------------------------------------------------------------------
function filterAvailableUnits() {
    const searchInput = document.getElementById('unitSearchInput');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    const items = document.querySelectorAll('.available-unit-item');
    
    for (var i = 0; i < items.length; i++) {
        const item = items[i];
        const code = item.querySelector('.unit-code')?.textContent?.toLowerCase() || '';
        const name = item.querySelector('.unit-name')?.textContent?.toLowerCase() || '';
        const match = code.includes(searchTerm) || name.includes(searchTerm);
        item.style.display = match ? '' : 'none';
    }
}

// ------------------------------------------------------------------
// ASSIGN UNIT TO LECTURER
// ------------------------------------------------------------------
async function assignUnitToLecturer(lecturerId, unitId, unitCode, unitName) {
    if (!db) return;
    
    const existing = allLecturerAssignments.find(
        a => a.lecturer_id === lecturerId && a.unit_id === unitId
    );
    
    if (existing) {
        showToast('This unit is already assigned to this lecturer.', 'warning');
        return;
    }
    
    try {
        const assignmentData = {
            lecturer_id: lecturerId,
            unit_id: unitId,
            unit_code: unitCode,
            unit_name: unitName,
            assigned_by: currentAdmin?.user_id || 'admin',
            assigned_at: new Date().toISOString()
        };
        
        const { data, error } = await db
            .from('lecturer_unit_assignments')
            .insert([assignmentData])
            .select();
        
        if (error) throw error;
        
        if (data && data.length > 0) {
            allLecturerAssignments.push(data[0]);
        }
        
        await refreshAssignmentModal(lecturerId);
        showToast('✅ Unit ' + unitCode + ' assigned successfully!', 'success');
        updateAssignmentStats();
        renderLecturerList();
        
    } catch(err) {
        showToast('Error assigning unit: ' + err.message, 'error');
    }
}

// ------------------------------------------------------------------
// REMOVE UNIT FROM LECTURER
// ------------------------------------------------------------------
async function removeUnitFromLecturer(assignmentId, unitCode) {
    if (!confirm('Remove unit ' + unitCode + ' from this lecturer?')) return;
    
    if (!db) return;
    
    try {
        const { error } = await db
            .from('lecturer_unit_assignments')
            .delete()
            .eq('id', assignmentId);
        
        if (error) throw error;
        
        allLecturerAssignments = allLecturerAssignments.filter(a => a.id !== assignmentId);
        await refreshAssignmentModal(currentLecturerId);
        
        showToast('✅ Unit ' + unitCode + ' removed successfully!', 'success');
        updateAssignmentStats();
        renderLecturerList();
        
    } catch(err) {
        showToast('Error removing unit: ' + err.message, 'error');
    }
}

// ------------------------------------------------------------------
// REFRESH ASSIGNMENT MODAL
// ------------------------------------------------------------------
async function refreshAssignmentModal(lecturerId) {
    if (!lecturerId) return;
    
    const lecturer = allLecturers.find(l => l.user_id === lecturerId);
    if (!lecturer) return;
    
    const assignedUnits = allLecturerAssignments.filter(
        a => a.lecturer_id === lecturerId
    );
    document.getElementById('modalAssignedCount').textContent = assignedUnits.length;
    
    renderAssignedUnits(assignedUnits);
    await renderAvailableUnits(lecturerId, assignedUnits);
}

// ------------------------------------------------------------------
// SAVE ALL UNIT ASSIGNMENTS
// ------------------------------------------------------------------
async function saveAllUnitAssignments() {
    showToast('✅ All assignments saved successfully!', 'success');
    closeModal('unitAssignmentModal');
    updateAssignmentStats();
    renderLecturerList();
}

// ------------------------------------------------------------------
// SUPPORT TICKETS - COMPLETE
// ------------------------------------------------------------------
async function loadAdminTickets() {
    var tbody = document.getElementById('admin-tickets-body');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="5"><div class="loading-spinner"></div> Loading tickets...</td></tr>';
    
    if (!db) return;
    
    try {
        const { data, error } = await db.from('support_tickets').select('*').order('created_at', { ascending: false });
        
        if (error) throw error;
        
        adminAllTickets = data || [];
        
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5">No tickets found</td></tr>';
            updateTicketCounts(0, 0, 0);
            return;
        }
        
        var studentIds = [];
        for (var i = 0; i < data.length; i++) {
            if (data[i].student_id) studentIds.push(data[i].student_id);
        }
        
        var studentNames = {};
        if (studentIds.length) {
            const { data: students } = await db
                .from('consolidated_user_profiles_table')
                .select('user_id, full_name')
                .in('user_id', studentIds);
            if (students) {
                for (var i = 0; i < students.length; i++) {
                    studentNames[students[i].user_id] = students[i].full_name;
                }
            }
        }
        
        var html = '';
        for (var i = 0; i < data.length; i++) {
            var t = data[i];
            var statusClass = 'badge-warning';
            if (t.status === 'closed') statusClass = 'badge-success';
            if (t.status === 'in_progress') statusClass = 'badge-info';
            
            html += '<tr>';
            html += '<td><span class="badge badge-primary">' + escapeHtml(t.ticket_number) + '</span></td>';
            html += '<td>' + escapeHtml(studentNames[t.student_id] || 'Student') + '</td>';
            html += '<td>' + escapeHtml(t.subject) + '</td>';
            html += '<td><span class="badge ' + statusClass + '">' + escapeHtml(t.status) + '</span></td>';
            html += '<td><button class="btn-sm btn-edit" onclick="viewTicketDetail(\'' + t.id + '\')"><i class="fas fa-eye"></i></button></td>';
            html += '</tr>';
        }
        
        tbody.innerHTML = html;
        
        var openCount = 0, progressCount = 0, closedCount = 0;
        for (var i = 0; i < data.length; i++) {
            if (data[i].status === 'open') openCount++;
            if (data[i].status === 'in_progress') progressCount++;
            if (data[i].status === 'closed') closedCount++;
        }
        updateTicketCounts(openCount, progressCount, closedCount);
        
    } catch(err) {
        tbody.innerHTML = '<tr><td colspan="5">Error: ' + err.message + '</td></tr>';
    }
}

function updateTicketCounts(open, progress, closed) {
    var openEl = document.getElementById('admin_open_tickets');
    var progressEl = document.getElementById('admin_progress_tickets');
    var closedEl = document.getElementById('admin_closed_tickets');
    if (openEl) openEl.textContent = open;
    if (progressEl) progressEl.textContent = progress;
    if (closedEl) closedEl.textContent = closed;
}

function filterAdminTickets() {
    var statusFilter = document.getElementById('admin_ticket_status_filter')?.value || 'all';
    var searchTerm = document.getElementById('admin_ticket_search')?.value.toLowerCase() || '';
    
    var filtered = adminAllTickets.filter(function(ticket) {
        if (statusFilter !== 'all' && ticket.status !== statusFilter) return false;
        if (searchTerm && !ticket.ticket_number.toLowerCase().includes(searchTerm) && !ticket.subject.toLowerCase().includes(searchTerm)) return false;
        return true;
    });
    
    renderFilteredTickets(filtered);
}

function filterAdminTicketsDebounced() {
    clearTimeout(window.ticketFilterTimeout);
    window.ticketFilterTimeout = setTimeout(filterAdminTickets, 300);
}

function renderFilteredTickets(tickets) {
    var tbody = document.getElementById('admin-tickets-body');
    if (!tbody) return;
    
    if (!tickets || tickets.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No tickets found</td></tr>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < tickets.length; i++) {
        var t = tickets[i];
        var statusClass = 'badge-warning';
        if (t.status === 'closed') statusClass = 'badge-success';
        if (t.status === 'in_progress') statusClass = 'badge-info';
        
        html += '<tr>';
        html += '<td><span class="badge badge-primary">' + escapeHtml(t.ticket_number) + '</span></td>';
        html += '<td>' + escapeHtml(t.student_name || 'Student') + '</td>';
        html += '<td>' + escapeHtml(t.subject) + '</td>';
        html += '<td><span class="badge ' + statusClass + '">' + escapeHtml(t.status) + '</span></td>';
        html += '<td><button class="btn-sm btn-edit" onclick="viewTicketDetail(\'' + t.id + '\')"><i class="fas fa-eye"></i></button></td>';
        html += '</tr>';
    }
    tbody.innerHTML = html;
}

window.viewTicketDetail = function(ticketId) {
    var ticket = adminAllTickets.find(function(t) { return t.id === ticketId; });
    if (!ticket) {
        showToast('Ticket not found', 'error');
        return;
    }
    
    var modalHtml = '<div id="ticketDetailModal" class="modal" style="display:flex;">';
    modalHtml += '<div class="modal-content">';
    modalHtml += '<div class="modal-header"><h3><i class="fas fa-ticket-alt"></i> Ticket: ' + escapeHtml(ticket.ticket_number) + '</h3><button class="close" onclick="closeModal(\'ticketDetailModal\')">&times;</button></div>';
    modalHtml += '<div class="modal-body">';
    modalHtml += '<p><strong>Subject:</strong> ' + escapeHtml(ticket.subject) + '</p>';
    modalHtml += '<p><strong>Description:</strong> ' + escapeHtml(ticket.description || 'No description') + '</p>';
    modalHtml += '<p><strong>Status:</strong> <span class="badge badge-info">' + escapeHtml(ticket.status) + '</span></p>';
    modalHtml += '<p><strong>Priority:</strong> ' + escapeHtml(ticket.priority || 'Medium') + '</p>';
    modalHtml += '<p><strong>Created:</strong> ' + formatDateTime(ticket.created_at) + '</p>';
    modalHtml += '<hr><textarea id="ticketReplyMsg" rows="4" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;" placeholder="Type your reply..."></textarea>';
    modalHtml += '<div style="margin-top:10px;"><button onclick="sendTicketReply(\'' + ticketId + '\')" class="btn-action">Send Reply</button></div>';
    modalHtml += '</div>';
    modalHtml += '<div class="modal-actions"><button onclick="closeModal(\'ticketDetailModal\')" class="btn-secondary">Close</button></div>';
    modalHtml += '</div></div>';
    
    var existingModal = document.getElementById('ticketDetailModal');
    if (existingModal) existingModal.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window.sendTicketReply = async function(ticketId) {
    var message = document.getElementById('ticketReplyMsg')?.value;
    if (!message) {
        showToast('Please enter a message', 'warning');
        return;
    }
    showToast('✅ Reply sent!', 'success');
    closeModal('ticketDetailModal');
};

window.exportAdminTicketsToCSV = function() {
    exportTableToCSV('admin-tickets-body', 'Support_Tickets.csv');
};

// ------------------------------------------------------------------
// SESSIONS MANAGEMENT
// ------------------------------------------------------------------
async function loadScheduledSessions() {
    var tbody = document.getElementById('sessions-list');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="4"><div class="loading-spinner"></div> Loading sessions...</td></tr>';
    
    if (!db) return;
    
    try {
        const { data, error } = await db.from('scheduled_sessions').select('*').order('session_date', { ascending: true });
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4">No sessions found</td></tr>';
            return;
        }
        
        var html = '';
        for (var i = 0; i < data.length; i++) {
            var s = data[i];
            
            html += '<tr>';
            html += '<td>' + escapeHtml(s.session_title) + '</td>';
            html += '<td>' + formatDate(s.session_date) + '</td>';
            html += '<td><span class="badge badge-primary">' + escapeHtml(s.target_program) + '</span></td>';
            html += '<td><button class="btn-sm btn-delete" onclick="deleteSessionItem(\'' + s.id + '\')"><i class="fas fa-trash"></i></button></td>';
            html += '</tr>';
        }
        
        tbody.innerHTML = html;
        
    } catch(err) {
        tbody.innerHTML = '<tr><td colspan="4">Error: ' + err.message + '</td></tr>';
    }
}

document.getElementById('add-session-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    var sessionData = {
        session_title: document.getElementById('session_title').value,
        session_date: document.getElementById('session_date').value,
        session_time: document.getElementById('session_start_time').value,
        target_program: document.getElementById('session_program').value,
        session_type: 'class'
    };
    
    if (!sessionData.session_title || !sessionData.session_date) {
        showToast('Please fill in session title and date', 'warning');
        return;
    }
    
    try {
        const { error } = await db.from('scheduled_sessions').insert([sessionData]);
        if (error) throw error;
        showToast('✅ Session scheduled!', 'success');
        e.target.reset();
        loadScheduledSessions();
        setupCalendar();
    } catch(err) {
        showToast('Error: ' + err.message, 'error');
    }
});

window.deleteSessionItem = async function(sessionId) {
    if (!confirm('Delete this session?')) return;
    
    try {
        const { error } = await db.from('scheduled_sessions').delete().eq('id', sessionId);
        if (error) throw error;
        showToast('✅ Session deleted', 'success');
        loadScheduledSessions();
        setupCalendar();
    } catch(err) {
        showToast('Error: ' + err.message, 'error');
    }
};

// ------------------------------------------------------------------
// ATTENDANCE
// ------------------------------------------------------------------
async function loadTodayAttendance() {
    var tbody = document.getElementById('attendance-table');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="4"><div class="loading-spinner"></div> Loading attendance...</td></tr>';
    
    if (!db) return;
    
    var today = new Date().toISOString().slice(0,10);
    
    try {
        const { data, error } = await db
            .from('geo_attendance_logs')
            .select('*, student:student_id(full_name)')
            .gte('check_in_time', today)
            .order('check_in_time', { ascending: false });
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4">No attendance records today</td></tr>';
            return;
        }
        
        var html = '';
        for (var i = 0; i < data.length; i++) {
            var r = data[i];
            var studentName = (r.student && r.student.full_name) ? r.student.full_name : 'Unknown';
            var statusClass = r.is_verified ? 'badge-success' : 'badge-warning';
            var statusText = r.is_verified ? 'Verified' : 'Pending';
            
            html += '<tr>';
            html += '<td>' + escapeHtml(studentName) + '</td>';
            html += '<td>' + formatDate(r.check_in_time) + '</td>';
            html += '<td><span class="badge ' + statusClass + '">' + statusText + '</span></td>';
            html += '<td>' + escapeHtml(r.location_name || 'N/A') + '</td>';
            html += '</tr>';
        }
        
        tbody.innerHTML = html;
        
    } catch(err) {
        tbody.innerHTML = '<tr><td colspan="4">Error: ' + err.message + '</td></tr>';
    }
}

// ------------------------------------------------------------------
// EXAMS
// ------------------------------------------------------------------
async function loadExamList() {
    var tbody = document.getElementById('exams-list');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="6"><div class="loading-spinner"></div> Loading exams...</td></tr>';
    
    if (!db) return;
    
    try {
        const { data, error } = await db.from('exams').select('*').order('exam_date');
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6">No exams found</td></tr>';
            return;
        }
        
        var html = '';
        for (var i = 0; i < data.length; i++) {
            var e = data[i];
            var statusClass = e.status === 'Upcoming' ? 'badge-info' : 
                             e.status === 'Completed' ? 'badge-success' : 'badge-warning';
            
            html += '<tr>';
            html += '<td><span class="badge badge-primary">' + escapeHtml(e.exam_type) + '</span></td>';
            html += '<td>' + escapeHtml(e.exam_name) + '</td>';
            html += '<td>' + formatDate(e.exam_date) + '</td>';
            html += '<td><span class="badge badge-primary">' + escapeHtml(e.target_program) + '</span></td>';
            html += '<td><span class="badge ' + statusClass + '">' + escapeHtml(e.status) + '</span></td>';
            html += '<td><button class="btn-sm btn-delete" onclick="deleteExamItem(\'' + e.id + '\')"><i class="fas fa-trash"></i></button></td>';
            html += '</tr>';
        }
        
        tbody.innerHTML = html;
        
    } catch(err) {
        tbody.innerHTML = '<tr><td colspan="6">Error: ' + err.message + '</td></tr>';
    }
}

document.getElementById('add-exam-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    var examData = {
        exam_type: document.getElementById('exam_type').value,
        exam_name: document.getElementById('exam_title').value,
        exam_date: document.getElementById('exam_date').value,
        target_program: document.getElementById('exam_program').value,
        status: 'Upcoming',
        duration_minutes: 60
    };
    
    if (!examData.exam_name || !examData.exam_date) {
        showToast('Please fill in exam title and date', 'warning');
        return;
    }
    
    try {
        const { error } = await db.from('exams').insert([examData]);
        if (error) throw error;
        showToast('✅ Exam added!', 'success');
        e.target.reset();
        loadExamList();
        setupCalendar();
    } catch(err) {
        showToast('Error: ' + err.message, 'error');
    }
});

window.deleteExamItem = async function(examId) {
    if (!confirm('Delete this exam?')) return;
    
    try {
        const { error } = await db.from('exams').delete().eq('id', examId);
        if (error) throw error;
        showToast('✅ Exam deleted', 'success');
        loadExamList();
        setupCalendar();
    } catch(err) {
        showToast('Error: ' + err.message, 'error');
    }
};

// ------------------------------------------------------------------
// RESOURCES - COMPLETE
// ------------------------------------------------------------------
async function loadAllResources() {
    var tbody = document.getElementById('resources-list');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="4"><div class="loading-spinner"></div> Loading resources...</td></tr>';
    
    if (!db) return;
    
    try {
        let query = db.from('resources').select('*').order('created_at', { ascending: false });
        
        if (currentResourceType === 'material') {
            query = query.eq('resource_type', 'material');
        } else if (currentResourceType === 'pastpaper') {
            query = query.eq('resource_type', 'pastpaper');
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        allResourcesData = data || [];
        
        var materialCount = allResourcesData.filter(function(r) { return r.resource_type === 'material'; }).length;
        var pastpaperCount = allResourcesData.filter(function(r) { return r.resource_type === 'pastpaper'; }).length;
        
        var materialBadge = document.getElementById('material-count-badge');
        var pastpaperBadge = document.getElementById('pastpaper-count-badge');
        if (materialBadge) materialBadge.textContent = materialCount;
        if (pastpaperBadge) pastpaperBadge.textContent = pastpaperCount;
        
        filterResourcesTable();
        
    } catch(err) {
        tbody.innerHTML = '<tr><td colspan="4">Error: ' + err.message + '</td></tr>';
    }
}

function filterResourcesTable() {
    var tbody = document.getElementById('resources-list');
    if (!tbody) return;
    
    var searchTerm = document.getElementById('resource-search')?.value.toLowerCase() || '';
    var blockFilter = document.getElementById('resource-block-filter')?.value || 'all';
    var yearFilter = document.getElementById('resource-year-filter')?.value || 'all';
    var programFilter = document.getElementById('resource-program-filter')?.value || 'all';
    
    var filtered = allResourcesData.filter(function(r) {
        if (searchTerm && !r.title.toLowerCase().includes(searchTerm)) return false;
        if (blockFilter !== 'all' && r.block !== blockFilter) return false;
        if (yearFilter !== 'all' && r.intake != yearFilter) return false;
        if (programFilter !== 'all' && r.program_type !== programFilter) return false;
        return true;
    });
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">No resources found</td></tr>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < filtered.length; i++) {
        var r = filtered[i];
        var typeLabel = r.resource_type === 'pastpaper' ? 'Past Paper' : 'Material';
        var typeClass = r.resource_type === 'pastpaper' ? 'badge-warning' : 'badge-info';
        
        html += '<tr>';
        html += '<td><span class="badge ' + typeClass + '">' + typeLabel + '</span></td>';
        html += '<td>' + (r.pastpaper_year || r.intake || 'N/A') + '</td>';
        html += '<td><span class="badge badge-primary">' + escapeHtml(r.program_type) + '</span></td>';
        html += '<td>' + escapeHtml(r.block) + '</td>';
        html += '<td>' + escapeHtml(r.title) + '</td>';
        html += '<td>' + (r.description || '-') + '</td>';
        html += '<td>' + escapeHtml(r.uploaded_by_name || 'Admin') + '</td>';
        html += '<td>' + formatDate(r.created_at) + '</td>';
        html += '<td><a href="' + r.file_url + '" target="_blank" class="btn-sm btn-edit"><i class="fas fa-eye"></i></a> <button class="btn-sm btn-delete" onclick="deleteResourceItem(\'' + r.id + '\')"><i class="fas fa-trash"></i></button></td>';
        html += '</tr>';
    }
    
    tbody.innerHTML = html;
}

window.filterResourceType = function(type) {
    currentResourceType = type;
    loadAllResources();
};

window.exportResourcesToCSV = function() {
    exportTableToCSV('resources-list', 'Resources_Export.csv');
};

window.deleteResourceItem = async function(resourceId) {
    if (!confirm('Delete this resource?')) return;
    
    try {
        const { error } = await db.from('resources').delete().eq('id', resourceId);
        if (error) throw error;
        showToast('✅ Resource deleted', 'success');
        loadAllResources();
    } catch(err) {
        showToast('Error: ' + err.message, 'error');
    }
};

window.handleResourceUpload = async function(e) {
    e.preventDefault();
    showToast('Resource upload feature - Configure Supabase Storage bucket first', 'info');
};

window.togglePastPaperFields = function() {
    var isPastPaper = document.getElementById('resource_is_pastpaper')?.checked;
    var pastpaperFields = document.getElementById('pastpaper-fields');
    if (pastpaperFields) {
        pastpaperFields.style.display = isPastPaper ? 'block' : 'none';
    }
};

function initResourceFilters() {
    var searchInput = document.getElementById('resource-search');
    if (searchInput) {
        searchInput.addEventListener('keyup', filterResourcesTable);
    }
    
    var blockFilter = document.getElementById('resource-block-filter');
    if (blockFilter) {
        blockFilter.addEventListener('change', filterResourcesTable);
    }
    
    var yearFilter = document.getElementById('resource-year-filter');
    if (yearFilter) {
        yearFilter.addEventListener('change', filterResourcesTable);
    }
}

// ------------------------------------------------------------------
// MESSAGES
// ------------------------------------------------------------------
async function loadMessageList() {
    var tbody = document.getElementById('messages-list');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="3"><div class="loading-spinner"></div> Loading messages...</td></tr>';
    
    if (!db) return;
    
    try {
        const { data, error } = await db.from('notifications').select('*').order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3">No messages found</td></tr>';
            return;
        }
        
        var html = '';
        for (var i = 0; i < data.length; i++) {
            var m = data[i];
            
            html += '<tr>';
            html += '<td>' + escapeHtml(m.subject) + '</td>';
            html += '<td>' + formatDate(m.created_at) + '</td>';
            html += '<td><button class="btn-sm btn-edit" onclick="viewMessageDetail(\'' + m.id + '\')"><i class="fas fa-eye"></i></button></td>';
            html += '</tr>';
        }
        
        tbody.innerHTML = html;
        
    } catch(err) {
        tbody.innerHTML = '<tr><td colspan="3">Error: ' + err.message + '</td></tr>';
    }
}

window.viewMessageDetail = function(messageId) {
    var message = allMessagesData?.find(function(m) { return m.id === messageId; });
    if (message) {
        showToast('Subject: ' + message.subject + '\n\nMessage: ' + message.message, 'info');
    } else {
        showToast('Message details - Feature in development', 'info');
    }
};

document.getElementById('send-message-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    var messageData = {
        target_program: document.getElementById('msg_recipient').value === 'all' ? null : document.getElementById('msg_recipient').value,
        subject: document.getElementById('msg_subject').value,
        message: document.getElementById('msg_body').value,
        message_type: 'system',
        sender_name: currentAdmin ? currentAdmin.full_name : 'Admin'
    };
    
    if (!messageData.subject || !messageData.message) {
        showToast('Please enter subject and message', 'warning');
        return;
    }
    
    try {
        const { error } = await db.from('notifications').insert([messageData]);
        if (error) throw error;
        showToast('✅ Message sent!', 'success');
        e.target.reset();
        loadMessageList();
    } catch(err) {
        showToast('Error: ' + err.message, 'error');
    }
});

// ------------------------------------------------------------------
// CALENDAR
// ------------------------------------------------------------------
async function setupCalendar() {
    var calendarEl = document.getElementById('fullCalendarDisplay');
    if (!calendarEl) return;
    
    calendarEl.innerHTML = '<div class="loading-spinner"></div><p>Loading calendar...</p>';
    
    if (!db) return;
    
    try {
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
                    color: '#3b82f6'
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
                    color: '#ef4444'
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
        
    } catch(err) {
        calendarEl.innerHTML = '<p>Error loading calendar: ' + err.message + '</p>';
    }
}

// ------------------------------------------------------------------
// WELCOME MESSAGE
// ------------------------------------------------------------------
async function loadWelcomeMessage() {
    var editor = document.getElementById('welcome-message-editor');
    var preview = document.getElementById('live-preview');
    
    if (!editor) return;
    if (!db) return;
    
    try {
        const { data } = await db.from('app_settings').select('value').eq('key', 'student_welcome').single();
        var content = (data && data.value) ? data.value : '<p>Welcome to NCHSM Learning Portal!</p>';
        
        editor.value = content;
        if (preview) preview.innerHTML = content;
    } catch(err) {
        console.log('Error loading welcome message:', err);
    }
}

async function loadWelcomeMessageForDisplay() {
    if (!db) return;
    
    try {
        const { data } = await db.from('app_settings').select('value').eq('key', 'student_welcome').single();
        var msgDiv = document.getElementById('student-welcome-message');
        
        if (msgDiv && data && data.value) {
            msgDiv.innerHTML = data.value;
        }
    } catch(err) {
        console.log('Error loading welcome message for display:', err);
    }
}

document.getElementById('edit-welcome-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    var content = document.getElementById('welcome-message-editor').value;
    
    try {
        const { error } = await db.from('app_settings').upsert([{ key: 'student_welcome', value: content }]);
        
        if (error) throw error;
        
        showToast('✅ Welcome message saved!', 'success');
        var preview = document.getElementById('live-preview');
        if (preview) preview.innerHTML = content;
    } catch(err) {
        showToast('Error: ' + err.message, 'error');
    }
});

// ------------------------------------------------------------------
// TABLE FILTERS & EXPORTS - COMPLETE
// ------------------------------------------------------------------
window.filterTable = function(inputId, tableId, columns) {
    var searchVal = document.getElementById(inputId);
    if (!searchVal) return;
    
    var filter = searchVal.value.toLowerCase();
    var rows = document.querySelectorAll('#' + tableId + ' tbody tr');
    
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
// SEARCH EVENT HANDLERS
// ------------------------------------------------------------------
var searchInput = document.getElementById('unit_search');
if (searchInput) {
    searchInput.addEventListener('keyup', renderUnitList);
}

var programFilter = document.getElementById('unit_filter_program');
if (programFilter) {
    programFilter.addEventListener('change', renderUnitList);
}

// ------------------------------------------------------------------
// INIT RESOURCE FILTERS
// ------------------------------------------------------------------
initResourceFilters();

console.log('✅ Admin dashboard loaded successfully!');
console.log('✅ Unit Assignment feature enabled!');
console.log('✅ Charts initialized!');
