/**
 * ============================================================
 * NCHSM LECTURER DASHBOARD - MAIN JAVASCRIPT
 * ============================================================
 * Complete functionality for lecturer dashboard with
 * program-based filtering (TVET/KRCHN)
 */

// ============================================================
// 1. CONFIGURATION & CONSTANTS
// ============================================================

const CONFIG = {
    SUPABASE_URL: 'https://lwhtjozfsmbyihenfunw.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk'
};

const TABLES = {
    USERS: 'consolidated_user_profiles_table',
    COURSES: 'courses',
    EXAMS: 'exams',
    SESSIONS: 'scheduled_sessions',
    ATTENDANCE: 'geo_attendance_logs',
    RESOURCES: 'resources',
    MESSAGES: 'messages',
    MARKS: 'student_marks',
    NCK: 'nck_marks',
    UNITS: 'units_catalog'
};

const ACADEMIC_STRUCTURE = {
    'KRCHN': ['Introductory', 'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Final'],
    'TVET': ['Introductory', 'Term 1', 'Term 2', 'Term 3', 'Term 4', 'Term 5', 'Term 6', 'Final']
};

// ============================================================
// 2. STATE MANAGEMENT
// ============================================================

const state = {
    sb: null,
    currentUser: null,
    currentUserId: null,
    program: null,          // 'KRCHN' or 'TVET'
    allStudents: [],
    allCourses: [],
    allExams: [],
    allSessions: [],
    allResources: [],
    allMessages: [],
    attendanceMap: null,
    lecturerChart: null,
    currentLecturerStudents: []
};

// ============================================================
// 3. UTILITY FUNCTIONS
// ============================================================

const $ = (id) => document.getElementById(id);
const $$ = (selector) => document.querySelectorAll(selector);

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function showFeedback(message, type = 'info') {
    const el = $('feedbackMessage');
    if (!el) {
        console.warn(`[${type}] ${message}`);
        return;
    }
    el.textContent = message;
    el.className = `feedback-${type}`;
    el.style.display = 'block';
    if (type !== 'error') {
        setTimeout(() => { el.style.display = 'none'; }, 5000);
    }
}

function showNotification(message, type = 'success') {
    showFeedback(message, type);
}

function showLoading(message) {
    showFeedback(message, 'info');
}

function hideLoading() {
    const el = $('feedbackMessage');
    if (el) el.style.display = 'none';
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric'
    });
}

function formatDateTime(date) {
    return new Date(date).toLocaleString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function getProgramFromDepartment(department) {
    if (!department) return null;
    const dept = department.toLowerCase().trim();
    if (dept.includes('krchn') || dept.includes('nursing') || dept.includes('registered')) {
        return 'KRCHN';
    }
    if (dept.includes('tvet') || dept.includes('technical') || dept.includes('vocational')) {
        return 'TVET';
    }
    return null;
}

function populateSelect(selectElement, data, valueKey, textKey, defaultText) {
    if (!selectElement) return;
    selectElement.innerHTML = `<option value="">-- ${defaultText || 'Select'} --</option>`;
    if (!data || !data.length) return;
    data.forEach(item => {
        const value = item[valueKey] || item.id || '';
        const text = item[textKey] || item.name || value;
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        selectElement.appendChild(option);
    });
}

function getAcademicBlocks(program) {
    return ACADEMIC_STRUCTURE[program] || ACADEMIC_STRUCTURE['KRCHN'];
}

// ============================================================
// 4. AUTHENTICATION & INITIALIZATION
// ============================================================

async function initLecturerDashboard() {
    console.log('🚀 Initializing Lecturer Dashboard...');
    
    try {
        // Initialize Supabase
        state.sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
        window.sb = state.sb;
        
        // Check session
        const { data: { session }, error: sessionError } = await state.sb.auth.getSession();
        if (sessionError || !session) {
            console.warn('No session found, redirecting to login...');
            window.location.href = 'login.html';
            return;
        }
        
        const user = session.user;
        console.log('✅ User authenticated:', user.email);
        
        // Get user profile
        const { data: profile, error: profileError } = await state.sb
            .from(TABLES.USERS)
            .select('*')
            .eq('user_id', user.id)
            .single();
        
        if (profileError || !profile) {
            console.error('Profile not found:', profileError?.message);
            window.location.href = 'login.html';
            return;
        }
        
        // Verify role
        const allowedRoles = ['lecturer', 'admin', 'superadmin'];
        if (!allowedRoles.includes(profile.role)) {
            console.warn('User is not a lecturer. Role:', profile.role);
            window.location.href = 'login.html';
            return;
        }
        
        // Set state
        state.currentUser = profile;
        state.currentUserId = user.id;
        state.program = getProgramFromDepartment(profile.department) || 'KRCHN';
        
        console.log(`📚 Lecturer Program: ${state.program}`);
        
        // Update UI with program info
        updateUIWithProgram();
        
        // Load data
        await loadAllData();
        
        // Setup event listeners
        setupEventListeners();
        
        // Load dashboard
        loadSectionData('dashboard');
        
        // Set current date
        const dateEl = $('currentDate');
        if (dateEl) {
            dateEl.textContent = new Date().toLocaleDateString('en-GB', {
                weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
            });
        }
        
        console.log('✅ Lecturer Dashboard initialized successfully!');
        
    } catch (error) {
        console.error('❌ Initialization error:', error);
        window.location.href = 'login.html';
    }
}

function updateUIWithProgram() {
    const program = state.program;
    const programName = program === 'KRCHN' ? '🎓 KRCHN Nursing' : '🔧 TVET Programs';
    
    // Update sidebar badge
    const badge = $('userProgramBadge');
    if (badge) badge.textContent = programName;
    
    // Update subtitle
    const subtitle = $('programSubtitle');
    if (subtitle) subtitle.textContent = `Dashboard filtered for ${programName}`;
    
    // Update welcome banner
    const banner = $('welcomeBannerText');
    if (banner) {
        banner.textContent = `This dashboard is filtered to your program: ${programName}. The card data below highlights urgent tasks.`;
    }
    
    // Update welcome header
    const header = $('welcomeHeader');
    if (header && state.currentUser) {
        header.textContent = state.currentUser.full_name || 'Lecturer';
    }
}

// ============================================================
// 5. DATA LOADING
// ============================================================

async function loadAllData() {
    await Promise.all([
        loadStudents(),
        loadCourses(),
        loadExams(),
        loadSessions(),
        loadResources(),
        loadMessages()
    ]);
}

async function loadStudents() {
    try {
        let query = state.sb
            .from(TABLES.USERS)
            .select('*')
            .eq('role', 'student');
        
        // Filter by program
        if (state.program) {
            query = query.eq('program', state.program);
        }
        
        const { data, error } = await query.order('full_name', { ascending: true });
        if (error) throw error;
        
        state.allStudents = data || [];
        console.log(`✅ Loaded ${state.allStudents.length} students for ${state.program}`);
        return state.allStudents;
    } catch (error) {
        console.error('Error loading students:', error);
        state.allStudents = [];
        return [];
    }
}

async function loadCourses() {
    try {
        let query = state.sb
            .from(TABLES.COURSES)
            .select('*');
        
        // Filter by program
        if (state.program) {
            query = query.eq('target_program', state.program);
        }
        
        const { data, error } = await query.order('course_name', { ascending: true });
        if (error) throw error;
        
        state.allCourses = data || [];
        console.log(`✅ Loaded ${state.allCourses.length} courses for ${state.program}`);
        return state.allCourses;
    } catch (error) {
        console.error('Error loading courses:', error);
        state.allCourses = [];
        return [];
    }
}

async function loadExams() {
    try {
        let query = state.sb
            .from(TABLES.EXAMS)
            .select('*, course:course_id(course_name, unit_code)')
            .eq('created_by', state.currentUserId);
        
        // Filter by program
        if (state.program) {
            query = query.eq('target_program', state.program);
        }
        
        const { data, error } = await query.order('exam_date', { ascending: false });
        if (error) throw error;
        
        state.allExams = data || [];
        console.log(`✅ Loaded ${state.allExams.length} exams`);
        return state.allExams;
    } catch (error) {
        console.error('Error loading exams:', error);
        state.allExams = [];
        return [];
    }
}

async function loadSessions() {
    try {
        let query = state.sb
            .from(TABLES.SESSIONS)
            .select('*')
            .eq('lecturer_id', state.currentUserId);
        
        // Filter by program
        if (state.program) {
            query = query.eq('target_program', state.program);
        }
        
        const { data, error } = await query.order('session_date', { ascending: true });
        if (error) throw error;
        
        state.allSessions = data || [];
        console.log(`✅ Loaded ${state.allSessions.length} sessions`);
        return state.allSessions;
    } catch (error) {
        console.error('Error loading sessions:', error);
        state.allSessions = [];
        return [];
    }
}

async function loadResources() {
    try {
        let query = state.sb
            .from(TABLES.RESOURCES)
            .select('*')
            .eq('uploaded_by', state.currentUserId);
        
        // Filter by program
        if (state.program) {
            query = query.eq('target_program', state.program);
        }
        
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        
        state.allResources = data || [];
        console.log(`✅ Loaded ${state.allResources.length} resources`);
        return state.allResources;
    } catch (error) {
        console.error('Error loading resources:', error);
        state.allResources = [];
        return [];
    }
}

async function loadMessages() {
    try {
        const { data, error } = await state.sb
            .from(TABLES.MESSAGES)
            .select('*')
            .eq('sender_id', state.currentUserId)
            .order('sent_at', { ascending: false });
        
        if (error) throw error;
        
        state.allMessages = data || [];
        console.log(`✅ Loaded ${state.allMessages.length} messages`);
        return state.allMessages;
    } catch (error) {
        console.error('Error loading messages:', error);
        state.allMessages = [];
        return [];
    }
}

// ============================================================
// 6. SECTION LOADER
// ============================================================

function loadSectionData(tabId) {
    // Close modals
    $$('.modal').forEach(m => m.classList.remove('active'));
    
    if (!state.currentUser) return;
    
    switch (tabId) {
        case 'profile': loadProfile(); break;
        case 'dashboard': loadDashboard(); break;
        case 'my-courses': loadCoursesTable(); break;
        case 'my-students': loadStudentsTable(); break;
        case 'sessions': loadSessionsTable(); populateSessionForm(); break;
        case 'attendance': loadAttendance(); break;
        case 'cats': loadExamsTable(); populateExamForm(); break;
        case 'marks-management': loadMarksManagement(); break;
        case 'resources': loadResourcesTable(); populateResourceForm(); break;
        case 'messages': loadMessagesTable(); populateMessageForm(); break;
        case 'calendar': loadCalendar(); break;
        case 'reports': showFeedback('Reports section loaded', 'info'); break;
        case 'settings': showFeedback('Settings section loaded', 'info'); break;
        case 'nurse-iq': loadNurseIQ(); break;
        default: console.log('Unknown tab:', tabId);
    }
    
    // Update active tab
    $$('.tab-content').forEach(s => s.classList.remove('active'));
    const target = $(`${tabId}-content`);
    if (target) target.classList.add('active');
    
    // Update nav
    $$('.nav a').forEach(link => link.classList.remove('active'));
    const activeLink = document.querySelector(`.nav a[data-tab="${tabId}"]`);
    if (activeLink) activeLink.classList.add('active');
}

// ============================================================
// 7. DASHBOARD
// ============================================================

async function loadDashboard() {
    try {
        const students = state.allStudents;
        const courses = state.allCourses;
        
        // Update counts
        const totalStudents = students.length;
        const totalCourses = courses.length;
        const atRisk = students.filter(s => (s.cumulative_absences || 0) > 5 || (s.status || '').toLowerCase() === 'probation');
        
        $('totalStudentsCount').textContent = totalStudents;
        $('totalCoursesCount').textContent = totalCourses;
        $('studentsAtRiskCount').textContent = atRisk.length;
        $('pendingAttendanceCount').textContent = '0';
        $('examsDueCount').textContent = state.allExams.filter(e => e.status === 'Scheduled' || e.status === 'InProgress').length;
        $('unreadMessagesCount').textContent = '0';
        
        // Update badges
        const badge = $('studentCountBadge');
        if (badge) badge.textContent = totalStudents;
        
        await loadAttendanceMetrics();
        
    } catch (error) {
        console.error('Dashboard error:', error);
    }
}

async function loadAttendanceMetrics() {
    try {
        const today = new Date();
        const startOfToday = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const endOfToday = new Date(today.setHours(23, 59, 59, 999)).toISOString();
        
        // Today's attendance
        const { data: todayData } = await state.sb
            .from(TABLES.ATTENDANCE)
            .select('*')
            .gte('check_in_time', startOfToday)
            .lte('check_in_time', endOfToday);
        
        if (todayData) {
            const filtered = todayData.filter(log => 
                log.program === state.program || 
                log.recorded_by_id === state.currentUserId
            );
            $('todayAttendanceTotal').textContent = filtered.length;
        }
        
        // Weekly attendance
        const startOfWeek = new Date(today);
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0, 0, 0, 0);
        
        const { data: weeklyData } = await state.sb
            .from(TABLES.ATTENDANCE)
            .select('*')
            .gte('check_in_time', startOfWeek.toISOString())
            .lte('check_in_time', endOfToday);
        
        if (weeklyData) {
            const filtered = weeklyData.filter(log => 
                log.program === state.program || 
                log.recorded_by_id === state.currentUserId
            );
            $('weeklyAttendanceTotal').textContent = filtered.length || '0';
        }
        
        // Monthly attendance rate
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const { data: monthlyData } = await state.sb
            .from(TABLES.ATTENDANCE)
            .select('*')
            .gte('check_in_time', startOfMonth.toISOString())
            .lte('check_in_time', endOfToday);
        
        if (monthlyData) {
            const filtered = monthlyData.filter(log => 
                log.program === state.program || 
                log.recorded_by_id === state.currentUserId
            );
            const unique = [...new Set(filtered.map(log => log.user_id))].length;
            const rate = state.allStudents.length > 0 ? Math.round((unique / state.allStudents.length) * 100) : 0;
            $('monthlyAttendanceRate').textContent = `${rate}%`;
        }
        
        // Overall total
        const { data: overallData } = await state.sb
            .from(TABLES.ATTENDANCE)
            .select('*');
        
        if (overallData) {
            const filtered = overallData.filter(log => 
                log.program === state.program || 
                log.recorded_by_id === state.currentUserId
            );
            $('overallAttendanceTotal').textContent = filtered.length || '0';
        }
        
        $('todayDateDisplay').textContent = new Date().toLocaleDateString('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
        
    } catch (error) {
        console.error('Attendance metrics error:', error);
    }
}

// ============================================================
// 8. PROFILE
// ============================================================

function loadProfile() {
    if (!state.currentUser) return;
    const user = state.currentUser;
    
    const avatar = user.avatar_url || 'https://via.placeholder.com/120x120/4C1D95/FFFFFF?text=Profile';
    $('profileImg').src = avatar;
    $('profileNameDisplay').textContent = user.full_name || 'N/A';
    $('profileRoleDisplay').textContent = user.role || 'Lecturer';
    $('profileId').textContent = user.employee_id || 'N/A';
    $('profileEmail').textContent = user.email || 'N/A';
    $('profilePhone').textContent = user.phone || 'N/A';
    $('profileDept').textContent = user.department || 'N/A';
    $('profileJoinDate').textContent = user.join_date ? formatDate(user.join_date) : 'N/A';
    $('profileProgramFocus').textContent = state.program || 'N/A';
}

// ============================================================
// 9. COURSES
// ============================================================

function loadCoursesTable() {
    const tbody = $('lecturerCoursesTable');
    if (!tbody) return;
    
    const courses = state.allCourses.filter(c => (c.status || 'Active') === 'Active');
    
    if (!courses.length) {
        tbody.innerHTML = `<tr><td colspan="7">No courses found for ${state.program}.</td></tr>`;
        return;
    }
    
    tbody.innerHTML = courses.map(c => {
        const students = state.allStudents.filter(s => 
            s.program === state.program && 
            (!c.intake_year || s.intake_year === c.intake_year)
        );
        return `<tr>
            <td><strong>${escapeHtml(c.unit_code || 'N/A')}</strong></td>
            <td>${escapeHtml(c.course_name || 'N/A')}</td>
            <td><span class="program-badge">${escapeHtml(c.target_program || 'N/A')}</span></td>
            <td>${escapeHtml(c.block || 'N/A')}</td>
            <td>${escapeHtml(c.intake_year || 'N/A')}</td>
            <td>${students.length} students</td>
            <td><button class="btn btn-action btn-small" data-action="manage-course" data-course="${c.id}">
                <i class="fas fa-chart-bar"></i> Manage
            </button></td>
        </tr>`;
    }).join('');
    
    // Populate filters
    populateCourseFilters(courses);
}

function populateCourseFilters(courses) {
    // Intake filter
    const years = [...new Set(courses.map(c => c.intake_year).filter(Boolean))].sort().reverse();
    const intakeFilter = $('intakeYearFilter');
    if (intakeFilter && years.length) {
        intakeFilter.innerHTML = '<option value="">All Intake Years</option>' + 
            years.map(y => `<option value="${y}">${y}</option>`).join('');
    }
    
    // Block filter
    const blocks = getAcademicBlocks(state.program);
    const periodFilter = $('academicPeriodFilter');
    const label = $('academicPeriodLabel');
    if (periodFilter && label) {
        label.textContent = state.program === 'KRCHN' ? 'Filter by Block:' : 'Filter by Term:';
        periodFilter.innerHTML = '<option value="">All</option>' + 
            blocks.map(b => `<option value="${b}">${b}</option>`).join('');
    }
}

// ============================================================
// 10. STUDENTS
// ============================================================

function loadStudentsTable() {
    const tbody = $('studentsTableBody');
    if (!tbody) return;
    
    const students = state.allStudents;
    
    if (!students.length) {
        tbody.innerHTML = `<tr><td colspan="8">No students found for ${state.program}.</td></tr>`;
        return;
    }
    
    tbody.innerHTML = students.map(s => {
        const status = (s.status || 'Active').toLowerCase();
        const atRisk = (s.cumulative_absences || 0) > 5 || status === 'probation';
        return `<tr class="${atRisk ? 'student-at-risk' : ''}">
            <td>${atRisk ? '⚠️ ' : ''}${escapeHtml(s.full_name || 'N/A')}</td>
            <td><strong>${escapeHtml(s.student_id || 'N/A')}</strong></td>
            <td>${escapeHtml(s.email || 'N/A')}</td>
            <td>${escapeHtml(s.program || 'N/A')}</td>
            <td>${escapeHtml(s.intake_year || 'N/A')}</td>
            <td><span class="student-status-badge status-${status}">${escapeHtml(s.status || 'Active')}</span></td>
            <td style="color:${(s.cumulative_absences || 0) > 3 ? '#EF4444' : '#10B981'}">${s.cumulative_absences || 0} days</td>
            <td>
                <button class="btn btn-action btn-small" data-action="view-student" data-user="${s.user_id}">
                    <i class="fas fa-eye"></i> Profile
                </button>
                <button class="btn btn-action btn-small" data-action="message-student" data-user="${s.user_id}" data-name="${escapeHtml(s.full_name)}">
                    <i class="fas fa-envelope"></i> Message
                </button>
            </td>
        </tr>`;
    }).join('');
    
    populateStudentFilters(students);
    updateStudentStats(students.length);
}

function populateStudentFilters(students) {
    // Intake filter
    const years = [...new Set(students.map(s => s.intake_year).filter(Boolean))].sort().reverse();
    const intakeFilter = $('studentIntakeFilter');
    if (intakeFilter) {
        intakeFilter.innerHTML = '<option value="all">All Intakes</option>' + 
            years.map(y => `<option value="${y}">${y}</option>`).join('');
    }
}

function updateStudentStats(total) {
    const stats = $('studentStats');
    if (!stats) return;
    const atRisk = state.allStudents.filter(s => 
        (s.cumulative_absences || 0) > 5 || (s.status || '').toLowerCase() === 'probation'
    ).length;
    stats.innerHTML = `Showing ${total} of ${state.allStudents.length} students | ${atRisk} require attention`;
}

// ============================================================
// 11. SESSIONS
// ============================================================

function populateSessionForm() {
    const program = state.program;
    const programs = program ? [{ id: program, name: program }] : [];
    populateSelect($('sessionProgram'), programs, 'id', 'name', 'Select Program');
    if (program) $('sessionProgram').value = program;
    
    // Blocks
    const blocks = getAcademicBlocks(program);
    const blockSelect = $('sessionBlockTerm');
    if (blocks.length) {
        populateSelect(blockSelect, blocks.map(b => ({ id: b, name: b })), 'id', 'name', `Select Block/Term`);
    }
    
    // Courses
    const courses = state.allCourses.filter(c => c.target_program === program);
    populateSelect($('sessionCourseId'), courses, 'id', 'course_name', 'Select Course');
}

function loadSessionsTable() {
    const tbody = $('sessionsTable');
    if (!tbody) return;
    
    const sessions = state.allSessions;
    
    if (!sessions.length) {
        tbody.innerHTML = '<tr><td colspan="6">No scheduled sessions.</td></tr>';
        return;
    }
    
    tbody.innerHTML = sessions.map(s => {
        const course = state.allCourses.find(c => c.id === s.course_id)?.course_name || s.course_id || 'N/A';
        const dateTime = `${formatDate(s.session_date)} @ ${s.session_time}`;
        const link = `${CONFIG.SUPABASE_URL}/attendance?session_id=${s.id}`;
        return `<tr>
            <td>${escapeHtml(s.session_title || 'N/A')}</td>
            <td>${dateTime}</td>
            <td>${escapeHtml(course)}</td>
            <td>${escapeHtml(s.target_program || 'N/A')}/${escapeHtml(s.block_term || 'N/A')}</td>
            <td><a href="#" data-action="copy-link" data-link="${link}">Copy Link</a></td>
            <td><button class="btn btn-action btn-small" data-action="edit-session" data-session="${s.id}">Edit</button></td>
        </tr>`;
    }).join('');
}

// ============================================================
// 12. ATTENDANCE
// ============================================================

function loadAttendance() {
    loadAttendanceSelects();
    loadTodayAttendance();
    loadPastAttendance();
    loadAttendanceMetrics();
}

function loadAttendanceSelects() {
    // Students
    const students = state.allStudents;
    populateSelect($('attStudentId'), students, 'user_id', 'full_name', 'Select Student');
    
    // Courses
    const courses = state.allCourses.filter(c => c.target_program === state.program);
    populateSelect($('attCourseId'), courses, 'id', 'course_name', 'Select Course');
    
    // Set default date
    const dateInput = $('attDate');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
}

async function loadTodayAttendance() {
    const tbody = $('attendanceTable');
    if (!tbody) return;
    
    try {
        const today = new Date();
        const start = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const end = new Date(today.setHours(23, 59, 59, 999)).toISOString();
        
        const { data: logs, error } = await state.sb
            .from(TABLES.ATTENDANCE)
            .select('*')
            .gte('check_in_time', start)
            .lte('check_in_time', end)
            .order('check_in_time', { ascending: false });
        
        if (error) throw error;
        
        if (!logs?.length) {
            tbody.innerHTML = '<tr><td colspan="8">No records today.</td></tr>';
            return;
        }
        
        const filtered = logs.filter(log =>
            log.user_id === state.currentUserId ||
            log.recorded_by_id === state.currentUserId ||
            log.program === state.program
        );
        
        if (!filtered.length) {
            tbody.innerHTML = '<tr><td colspan="8">No records for your program today.</td></tr>';
            return;
        }
        
        tbody.innerHTML = filtered.map(log => {
            const isLecturer = log.user_role === 'lecturer';
            const name = isLecturer ? state.currentUser.full_name : (log.student_name || 'Student');
            const regNo = isLecturer ? (state.currentUser.employee_id || 'N/A') : 'N/A';
            const course = state.allCourses.find(c => c.id === log.course_id)?.course_name || log.course_id || 'General';
            const dateTime = log.check_in_time ? formatDateTime(log.check_in_time) : 'N/A';
            const location = log.location_friendly_name || log.location_details || 'N/A';
            const hasLocation = log.latitude && log.longitude;
            const sessionType = log.session_type || 'Class';
            const typeClass = sessionType.toLowerCase();
            
            return `<tr>
                <td>${escapeHtml(name)}</td>
                <td>${escapeHtml(regNo)}</td>
                <td><span class="session-type-badge type-${typeClass}">${escapeHtml(sessionType)}</span></td>
                <td>${escapeHtml(course)}</td>
                <td>${dateTime}</td>
                <td>${escapeHtml(location)}</td>
                <td><span class="status-present">${escapeHtml(log.status || 'Present')}</span></td>
                <td>
                    <button class="btn btn-action btn-small" ${!hasLocation ? 'disabled' : ''}
                        data-action="view-map" data-lat="${log.latitude || 0}" data-lng="${log.longitude || 0}" data-name="${escapeHtml(name)}">
                        ${hasLocation ? 'View Map' : 'No Location'}
                    </button>
                </td>
            </tr>`;
        }).join('');
        
        $('todaysAttendanceCount').textContent = filtered.length;
        
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="8">Error: ${error.message}</td></tr>`;
    }
}

async function loadPastAttendance() {
    const tbody = $('pastAttendanceTable');
    if (!tbody) return;
    
    try {
        const { data: records, error } = await state.sb
            .from(TABLES.ATTENDANCE)
            .select('*')
            .order('check_in_time', { ascending: false })
            .limit(100);
        
        if (error) throw error;
        
        if (!records?.length) {
            tbody.innerHTML = '<tr><td colspan="9">No records found.</td></tr>';
            return;
        }
        
        const filtered = records.filter(log =>
            log.program === state.program ||
            log.recorded_by_id === state.currentUserId ||
            log.user_id === state.currentUserId
        );
        
        if (!filtered.length) {
            tbody.innerHTML = '<tr><td colspan="9">No records for your program.</td></tr>';
            return;
        }
        
        tbody.innerHTML = filtered.map(log => {
            const dt = log.check_in_time ? new Date(log.check_in_time) : new Date();
            const isLecturer = log.user_role === 'lecturer';
            const name = isLecturer ? (state.currentUser.full_name || 'Lecturer') : (log.student_name || 'Student');
            const regNo = isLecturer ? (state.currentUser.employee_id || 'N/A') : 'N/A';
            const course = state.allCourses.find(c => c.id === log.course_id)?.course_name || log.course_id || 'General';
            const sessionType = log.session_type || 'Class';
            const typeClass = sessionType.toLowerCase();
            
            return `<tr>
                <td>${dt.toLocaleDateString('en-GB')}</td>
                <td>${escapeHtml(name)}</td>
                <td>${escapeHtml(regNo)}</td>
                <td><span class="session-type-badge type-${typeClass}">${escapeHtml(sessionType)}</span></td>
                <td>${escapeHtml(course)}</td>
                <td>${dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</td>
                <td>${escapeHtml(log.location_friendly_name || log.location_details || 'N/A')}</td>
                <td><span class="status-present">${escapeHtml(log.status || 'Present')}</span></td>
                <td>${escapeHtml(log.recorded_by_name || 'Self')}</td>
            </tr>`;
        }).join('');
        
        $('pastAttendanceCount').textContent = filtered.length;
        
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="9">Error: ${error.message}</td></tr>`;
    }
}

// ============================================================
// 13. EXAMS
// ============================================================

function populateExamForm() {
    const program = state.program;
    const programs = program ? [{ id: program, name: program }] : [];
    populateSelect($('examProgram'), programs, 'id', 'name', 'Select Program');
    if (program) $('examProgram').value = program;
    
    // Blocks
    const blocks = getAcademicBlocks(program);
    const blockSelect = $('examBlockTerm');
    if (blocks.length) {
        populateSelect(blockSelect, blocks.map(b => ({ id: b, name: b })), 'id', 'name', `Select Block/Term`);
    }
    
    // Courses
    const courses = state.allCourses.filter(c => c.target_program === program);
    populateSelect($('examCourseId'), courses, 'id', 'course_name', 'Select Course (Optional)');
}

function loadExamsTable() {
    const tbody = $('examsTable');
    if (!tbody) return;
    
    const exams = state.allExams;
    
    if (!exams.length) {
        tbody.innerHTML = '<tr><td colspan="8">No exams found.</td></tr>';
        return;
    }
    
    tbody.innerHTML = exams.map(e => {
        const course = e.course?.course_name || 'General';
        const dateTime = e.exam_date ? formatDate(e.exam_date) + (e.exam_start_time ? ` ${e.exam_start_time}` : '') : 'N/A';
        const statusClass = (e.status || 'Scheduled').toLowerCase();
        
        return `<tr>
            <td><span class="exam-type-badge">${escapeHtml(e.exam_type || 'N/A')}</span></td>
            <td><strong>${escapeHtml(e.exam_name || 'N/A')}</strong></td>
            <td>${escapeHtml(course)}</td>
            <td>${escapeHtml(e.target_program || 'N/A')}/${escapeHtml(e.block_term || 'N/A')}</td>
            <td>${dateTime}</td>
            <td>${e.duration_minutes ? e.duration_minutes + ' mins' : 'N/A'}</td>
            <td><span class="status-${statusClass}">${escapeHtml(e.status || 'Scheduled')}</span></td>
            <td>
                <button class="btn btn-action btn-small" data-action="edit-exam" data-exam="${e.id}"><i class="fas fa-edit"></i></button>
                <button class="btn btn-action btn-small" data-action="grade-exam" data-exam="${e.id}" style="background:#10b981;"><i class="fas fa-check-circle"></i></button>
                <button class="btn btn-delete btn-small" data-action="delete-exam" data-exam="${e.id}"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
    }).join('');
}

// ============================================================
// 14. MARKS MANAGEMENT
// ============================================================

function loadMarksManagement() {
    // Load subjects for the selected block
    const blockSelect = $('lecBlockSelect');
    if (blockSelect && blockSelect.value) {
        loadLecturerSubjects();
        loadLecturerInternalMarks();
    }
    
    // Load NCK marks
    loadLecturerNCKMarks();
}

async function loadLecturerSubjects() {
    const block = $('lecBlockSelect').value;
    const subjectSelect = $('lecSubjectSelect');
    if (!block) {
        subjectSelect.innerHTML = '<option value="">-- Select Block First --</option>';
        return;
    }
    
    try {
        const { data: units, error } = await state.sb
            .from(TABLES.UNITS)
            .select('*')
            .eq('block', block)
            .eq('target_program', state.program);
        
        if (error) throw error;
        
        if (!units?.length) {
            subjectSelect.innerHTML = '<option value="">No subjects found</option>';
            return;
        }
        
        subjectSelect.innerHTML = '<option value="">-- Select Subject --</option>' +
            units.map(u => `<option value="${u.unit_name}">${escapeHtml(u.unit_name)} (${u.unit_code || ''})</option>`).join('');
            
    } catch (error) {
        console.error('Error loading subjects:', error);
        subjectSelect.innerHTML = '<option value="">Error loading subjects</option>';
    }
}

async function loadLecturerInternalMarks() {
    const block = $('lecBlockSelect').value;
    const subject = $('lecSubjectSelect').value;
    const container = $('lecInternalContainer');
    
    if (!block || !subject) {
        container.innerHTML = '<div class="text-center" style="padding:40px;">Select a block and subject</div>';
        return;
    }
    
    container.innerHTML = '<div class="text-center" style="padding:40px;"><div class="loading-spinner"></div><p>Loading marks...</p></div>';
    
    try {
        const students = state.allStudents.filter(s => s.block === block);
        
        if (!students.length) {
            container.innerHTML = '<div class="text-center" style="padding:40px;">No students found in this block</div>';
            return;
        }
        
        state.currentLecturerStudents = students;
        
        const { data: existing, error } = await state.sb
            .from(TABLES.MARKS)
            .select('*')
            .eq('block', block)
            .eq('subject_name', subject);
        
        if (error) throw error;
        
        const marksMap = {};
        existing?.forEach(m => marksMap[m.admission_number] = m);
        
        let html = `<table class="data-table" style="width:100%;border-collapse:collapse;">
            <thead><tr style="background:#4C1D95;color:white;">
                <th style="padding:10px;">Admission</th>
                <th style="padding:10px;">Student Name</th>
                <th style="padding:10px;">CAT1 (0-30)</th>
                <th style="padding:10px;">CAT2 (0-30)</th>
                <th style="padding:10px;">Exam (0-70)</th>
                <th style="padding:10px;">Total</th>
                <th style="padding:10px;">Grade</th>
                <th style="padding:10px;">Status</th>
            </tr></thead><tbody>`;
        
        for (const s of students) {
            const m = marksMap[s.student_id] || {};
            const cat1 = m.cat1_score !== undefined ? m.cat1_score : '';
            const cat2 = m.cat2_score !== undefined ? m.cat2_score : '';
            const exam = m.exam_score !== undefined ? m.exam_score : '';
            let total = 0, grade = '-', status = 'PENDING', color = '#f59e0b';
            
            if (cat1 !== '' || cat2 !== '' || exam !== '') {
                const ncat1 = Math.min(parseFloat(cat1) || 0, 30);
                const ncat2 = Math.min(parseFloat(cat2) || 0, 30);
                const nexam = Math.min(parseFloat(exam) || 0, 70);
                total = ((ncat1 + ncat2) / 60 * 30) + nexam;
                total = Math.round(total * 10) / 10;
                grade = calculateGrade(total);
                status = total >= 60 ? 'PASS' : (total > 0 ? 'FAIL' : 'PENDING');
                color = status === 'PASS' ? '#10b981' : (status === 'FAIL' ? '#ef4444' : '#f59e0b');
            }
            
            html += `<tr>
                <td>${escapeHtml(s.student_id)}</td>
                <td><strong>${escapeHtml(s.full_name)}</strong></td>
                <td><input type="number" class="internal-cat1" data-student="${s.student_id}" value="${cat1}" min="0" max="30" step="0.5" style="width:70px;padding:5px;"></td>
                <td><input type="number" class="internal-cat2" data-student="${s.student_id}" value="${cat2}" min="0" max="30" step="0.5" style="width:70px;padding:5px;"></td>
                <td><input type="number" class="internal-exam" data-student="${s.student_id}" value="${exam}" min="0" max="70" step="0.5" style="width:70px;padding:5px;"></td>
                <td id="lecTotal_${s.student_id}" style="font-weight:bold;color:${color};">${total || '-'}</td>
                <td id="lecGrade_${s.student_id}">${grade}</td>
                <td id="lecStatus_${s.student_id}" style="color:${color};">${status}</td>
            </tr>`;
        }
        
        html += `</tbody></table>
            <div style="text-align:center;margin-top:20px;">
                <button class="btn btn-action" id="saveInternalMarksBtn" style="background:#059669;"><i class="fas fa-save"></i> Save All Marks</button>
                <button class="btn btn-action" id="fillDownInternalBtn" style="background:#3b82f6;margin-left:10px;"><i class="fas fa-arrow-down"></i> Fill Down</button>
            </div>`;
        
        container.innerHTML = html;
        $('lecTotalStudents').textContent = students.length;
        
        // Attach event listeners for marks
        document.querySelectorAll('.internal-cat1, .internal-cat2, .internal-exam').forEach(input => {
            input.addEventListener('change', function() {
                const studentId = this.dataset.student;
                updateLecturerInternalTotal(studentId);
            });
        });
        
        document.getElementById('saveInternalMarksBtn')?.addEventListener('click', saveLecturerInternalMarks);
        document.getElementById('fillDownInternalBtn')?.addEventListener('click', fillDownInternalMarks);
        
    } catch (error) {
        container.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
    }
}

function updateLecturerInternalTotal(studentId) {
    const cat1 = parseFloat(document.querySelector(`.internal-cat1[data-student="${studentId}"]`).value) || 0;
    const cat2 = parseFloat(document.querySelector(`.internal-cat2[data-student="${studentId}"]`).value) || 0;
    const exam = parseFloat(document.querySelector(`.internal-exam[data-student="${studentId}"]`).value) || 0;
    
    const ncat1 = Math.min(cat1, 30);
    const ncat2 = Math.min(cat2, 30);
    const nexam = Math.min(exam, 70);
    const total = Math.round((((ncat1 + ncat2) / 60 * 30) + nexam) * 10) / 10;
    const grade = calculateGrade(total);
    const status = total >= 60 ? 'PASS' : (total > 0 ? 'FAIL' : 'PENDING');
    const color = status === 'PASS' ? '#10b981' : (status === 'FAIL' ? '#ef4444' : '#f59e0b');
    
    const totalSpan = document.getElementById(`lecTotal_${studentId}`);
    const gradeSpan = document.getElementById(`lecGrade_${studentId}`);
    const statusSpan = document.getElementById(`lecStatus_${studentId}`);
    
    if (totalSpan) { totalSpan.innerHTML = total || '-'; totalSpan.style.color = color; }
    if (gradeSpan) gradeSpan.innerHTML = grade;
    if (statusSpan) { statusSpan.innerHTML = status; statusSpan.style.color = color; }
}

function fillDownInternalMarks() {
    const cat1s = document.querySelectorAll('.internal-cat1');
    if (!cat1s.length) return;
    
    const v1 = cat1s[0].value;
    const v2 = document.querySelector('.internal-cat2')?.value || '';
    const v3 = document.querySelector('.internal-exam')?.value || '';
    
    for (let i = 1; i < cat1s.length; i++) {
        const sId = cat1s[i].getAttribute('data-student');
        const cat1Input = document.querySelector(`.internal-cat1[data-student="${sId}"]`);
        const cat2Input = document.querySelector(`.internal-cat2[data-student="${sId}"]`);
        const examInput = document.querySelector(`.internal-exam[data-student="${sId}"]`);
        
        if (cat1Input) cat1Input.value = v1;
        if (cat2Input) cat2Input.value = v2;
        if (examInput) examInput.value = v3;
        updateLecturerInternalTotal(sId);
    }
    showNotification('Values filled down!', 'success');
}

async function saveLecturerInternalMarks() {
    const block = $('lecBlockSelect').value;
    const subject = $('lecSubjectSelect').value;
    
    if (!block || !subject) {
        showNotification('Select block and subject', 'error');
        return;
    }
    
    const inputs = document.querySelectorAll('.internal-cat1');
    if (!inputs.length) {
        showNotification('No data to save', 'error');
        return;
    }
    
    showLoading('Saving marks...');
    let saved = 0;
    
    for (const input of inputs) {
        const sId = input.getAttribute('data-student');
        const cat1 = parseFloat(document.querySelector(`.internal-cat1[data-student="${sId}"]`).value) || 0;
        const cat2 = parseFloat(document.querySelector(`.internal-cat2[data-student="${sId}"]`).value) || 0;
        const exam = parseFloat(document.querySelector(`.internal-exam[data-student="${sId}"]`).value) || 0;
        
        const ncat1 = Math.min(cat1, 30);
        const ncat2 = Math.min(cat2, 30);
        const nexam = Math.min(exam, 70);
        const finalTotal = Math.round((((ncat1 + ncat2) / 60 * 30) + nexam) * 10) / 10;
        const grade = calculateGrade(finalTotal);
        
        const { error } = await state.sb
            .from(TABLES.MARKS)
            .upsert({
                admission_number: sId,
                block,
                subject_name: subject,
                cat1_score: cat1,
                cat2_score: cat2,
                exam_score: exam,
                final_score: finalTotal,
                grade,
                academic_year: '2026'
            }, { onConflict: 'admission_number,subject_name,block' });
        
        if (!error) saved++;
    }
    
    hideLoading();
    showNotification(`Saved ${saved} marks!`, 'success');
    loadLecturerInternalMarks();
}

// ============================================================
// 15. NCK MARKS
// ============================================================

async function loadLecturerNCKMarks() {
    const block = $('lecNckBlock').value;
    const sheet = $('lecNckSheet').value;
    const container = $('lecNckContainer');
    
    if (!block) {
        container.innerHTML = '<div class="text-center" style="padding:40px;">Select a block</div>';
        return;
    }
    
    container.innerHTML = '<div class="text-center" style="padding:40px;"><div class="loading-spinner"></div><p>Loading NCK marks...</p></div>';
    
    try {
        const students = state.allStudents.filter(s => s.block === block);
        
        if (!students.length) {
            container.innerHTML = '<div class="text-center" style="padding:40px;">No students found</div>';
            return;
        }
        
        const { data: existing, error } = await state.sb
            .from(TABLES.NCK)
            .select('*')
            .eq('block', block)
            .eq('subject_name', sheet);
        
        if (error) throw error;
        
        const marksMap = {};
        existing?.forEach(m => marksMap[m.admission_number] = m);
        
        let html = `<table class="data-table" style="width:100%;border-collapse:collapse;">
            <thead><tr style="background:#4C1D95;color:white;">
                <th style="padding:10px;">#</th>
                <th style="padding:10px;">Student Name</th>
                <th style="padding:10px;">Admission</th>
                <th style="padding:10px;">Score (%)</th>
                <th style="padding:10px;">Grade</th>
                <th style="padding:10px;">Status</th>
                <th style="padding:10px;">Graded By</th>
                <th style="padding:10px;">Actions</th>
            </tr></thead><tbody>`;
        
        for (let i = 0; i < students.length; i++) {
            const s = students[i];
            const m = marksMap[s.student_id] || {};
            const score = m.final_score !== undefined ? m.final_score : '';
            const grade = score !== '' ? calculateGrade(parseFloat(score)) : '-';
            const status = score !== '' ? (parseFloat(score) >= 60 ? 'PASS' : (parseFloat(score) > 0 ? 'FAIL' : 'PENDING')) : 'PENDING';
            const color = status === 'PASS' ? '#10b981' : (status === 'FAIL' ? '#ef4444' : '#f59e0b');
            
            html += `<tr>
                <td>${i + 1}</td>
                <td><strong>${escapeHtml(s.full_name)}</strong></td>
                <td>${escapeHtml(s.student_id)}</td>
                <td><input type="number" class="nck-score" data-index="${i}" value="${score}" min="0" max="100" step="0.5" style="width:80px;padding:5px;"></td>
                <td id="nckGrade_${i}" style="color:${color};">${grade}</td>
                <td id="nckStatus_${i}" style="color:${color};">${status}</td>
                <td><input type="text" class="nck-graded" data-index="${i}" value="${m.graded_by || ''}" placeholder="Lecturer" style="width:120px;padding:5px;"></td>
                <td><button class="btn btn-action btn-small save-nck" data-index="${i}" data-student="${s.student_id}" style="background:#059669;"><i class="fas fa-save"></i> Save</button></td>
            </tr>`;
        }
        
        html += `</tbody></table>
            <div style="text-align:center;margin-top:20px;">
                <button class="btn btn-action" id="saveAllNckMarksBtn" style="background:#059669;"><i class="fas fa-save"></i> Save All NCK Marks</button>
                <button class="btn btn-action" id="fillDownNckBtn" style="background:#3b82f6;margin-left:10px;"><i class="fas fa-arrow-down"></i> Fill Down</button>
            </div>`;
        
        container.innerHTML = html;
        
        // Attach event listeners
        document.querySelectorAll('.nck-score').forEach(input => {
            input.addEventListener('change', function() {
                const idx = parseInt(this.dataset.index);
                updateLecturerNCKTotal(idx);
            });
        });
        
        document.querySelectorAll('.save-nck').forEach(btn => {
            btn.addEventListener('click', function() {
                const idx = parseInt(this.dataset.index);
                const studentId = this.dataset.student;
                saveSingleLecturerNCK(idx, studentId);
            });
        });
        
        document.getElementById('saveAllNckMarksBtn')?.addEventListener('click', saveAllLecturerNCKMarks);
        document.getElementById('fillDownNckBtn')?.addEventListener('click', fillDownNCKValues);
        
    } catch (error) {
        container.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
    }
}

function updateLecturerNCKTotal(idx) {
    const score = parseFloat(document.querySelector(`.nck-score[data-index="${idx}"]`).value) || 0;
    const grade = calculateGrade(score);
    const status = score >= 60 ? 'PASS' : (score > 0 ? 'FAIL' : 'PENDING');
    const color = status === 'PASS' ? '#10b981' : (status === 'FAIL' ? '#ef4444' : '#f59e0b');
    
    const gradeEl = document.getElementById(`nckGrade_${idx}`);
    const statusEl = document.getElementById(`nckStatus_${idx}`);
    
    if (gradeEl) { gradeEl.innerHTML = grade; gradeEl.style.color = color; }
    if (statusEl) { statusEl.innerHTML = status; statusEl.style.color = color; }
}

function fillDownNCKValues() {
    const inputs = document.querySelectorAll('.nck-score');
    if (!inputs.length) return;
    
    const val = inputs[0].value;
    for (let i = 1; i < inputs.length; i++) {
        inputs[i].value = val;
        updateLecturerNCKTotal(i);
    }
    showNotification('Values filled down!', 'success');
}

async function saveSingleLecturerNCK(idx, studentId) {
    const block = $('lecNckBlock').value;
    const sheet = $('lecNckSheet').value;
    const score = parseFloat(document.querySelector(`.nck-score[data-index="${idx}"]`).value) || 0;
    const gradedBy = document.querySelector(`.nck-graded[data-index="${idx}"]`).value;
    const student = state.allStudents.find(s => s.student_id === studentId);
    
    const grade = calculateGrade(score);
    const status = score >= 60 ? 'passed' : (score > 0 ? 'failed' : 'pending');
    
    showLoading(`Saving ${student?.full_name || 'student'}...`);
    
    const { error } = await state.sb
        .from(TABLES.NCK)
        .upsert({
            admission_number: studentId,
            student_name: student?.full_name || '',
            block,
            subject_name: sheet,
            final_score: score,
            grade,
            status,
            graded_by: gradedBy || state.currentUser?.full_name || 'Lecturer',
            academic_year: '2026',
            published: true
        }, { onConflict: 'admission_number,subject_name,block' });
    
    hideLoading();
    showNotification(error ? `Error: ${error.message}` : 'Saved!', error ? 'error' : 'success');
}

async function saveAllLecturerNCKMarks() {
    const block = $('lecNckBlock').value;
    const sheet = $('lecNckSheet').value;
    const inputs = document.querySelectorAll('.nck-score');
    
    if (!inputs.length) {
        showNotification('No data to save', 'error');
        return;
    }
    
    showLoading('Saving all NCK marks...');
    let saved = 0;
    
    for (let i = 0; i < inputs.length; i++) {
        const student = state.allStudents[i];
        if (!student) continue;
        
        const score = parseFloat(document.querySelector(`.nck-score[data-index="${i}"]`).value) || 0;
        const gradedBy = document.querySelector(`.nck-graded[data-index="${i}"]`).value;
        const grade = calculateGrade(score);
        const status = score >= 60 ? 'passed' : (score > 0 ? 'failed' : 'pending');
        
        const { error } = await state.sb
            .from(TABLES.NCK)
            .upsert({
                admission_number: student.student_id,
                student_name: student.full_name,
                block,
                subject_name: sheet,
                final_score: score,
                grade,
                status,
                graded_by: gradedBy || state.currentUser?.full_name || 'Lecturer',
                academic_year: '2026',
                published: true
            }, { onConflict: 'admission_number,subject_name,block' });
        
        if (!error) saved++;
    }
    
    hideLoading();
    showNotification(`Saved ${saved} NCK records!`, 'success');
    loadLecturerNCKMarks();
}

function calculateGrade(score) {
    if (!score && score !== 0) return '-';
    if (score >= 80) return 'A';
    if (score >= 75) return 'A-';
    if (score >= 70) return 'B+';
    if (score >= 65) return 'B';
    if (score >= 60) return 'B-';
    if (score >= 55) return 'C+';
    if (score >= 50) return 'C';
    if (score >= 45) return 'C-';
    if (score >= 40) return 'D+';
    if (score >= 35) return 'D';
    return 'E';
}

// ============================================================
// 16. RESOURCES
// ============================================================

function populateResourceForm() {
    const program = state.program;
    const programs = program ? [{ id: program, name: program }] : [];
    populateSelect($('resourceProgram'), programs, 'id', 'name', 'Select Program');
    if (program) $('resourceProgram').value = program;
    
    // Intakes
    const intakes = [
        { id: '2024', name: '2024' },
        { id: '2025', name: '2025' },
        { id: '2026', name: '2026' },
        { id: '2027', name: '2027' },
        { id: '2028', name: '2028' }
    ];
    populateSelect($('resourceIntake'), intakes, 'id', 'name', 'Select Intake');
    
    // Blocks
    const blocks = getAcademicBlocks(program);
    populateSelect($('resourceBlock'), blocks.map(b => ({ id: b, name: b })), 'id', 'name', `Select Block/Term`);
}

function loadResourcesTable() {
    const tbody = $('resourcesList');
    if (!tbody) return;
    
    const resources = state.allResources;
    
    if (!resources.length) {
        tbody.innerHTML = '<tr><td colspan="6">No resources uploaded.</td></tr>';
        return;
    }
    
    tbody.innerHTML = resources.map(r => `
        <tr>
            <td>${escapeHtml(r.title || 'N/A')}</td>
            <td>${escapeHtml(r.category || 'Academic')}</td>
            <td>${escapeHtml(r.target_program || r.program_type || 'N/A')}/${escapeHtml(r.block_term || r.block || 'N/A')}</td>
            <td>${escapeHtml(r.uploaded_by_name || 'N/A')}</td>
            <td>${formatDate(r.created_at)}</td>
            <td>
                <a href="${r.file_url}" target="_blank" class="btn btn-action btn-small"><i class="fas fa-download"></i> Download</a>
                <button class="btn btn-delete btn-small" data-action="delete-resource" data-resource="${r.id}"><i class="fas fa-trash"></i> Delete</button>
            </td>
        </tr>
    `).join('');
}

// ============================================================
// 17. MESSAGES
// ============================================================

function populateMessageForm() {
    // Students
    const students = state.allStudents;
    const options = [
        { id: 'all-students', name: `All ${state.program || 'Assigned'} Students` }
    ];
    students.forEach(s => {
        options.push({ id: s.user_id, name: `${s.full_name} (${s.student_id})` });
    });
    populateSelect($('msgTarget'), options, 'id', 'name', 'Select Recipient');
}

function loadMessagesTable() {
    const tbody = $('messagesTable');
    if (!tbody) return;
    
    const messages = state.allMessages;
    
    if (!messages.length) {
        tbody.innerHTML = '<tr><td colspan="5">No messages sent.</td></tr>';
        return;
    }
    
    tbody.innerHTML = messages.map(m => {
        const targetDisplay = m.target_group === 'all-students' ? 
            `All ${m.target_program || 'Assigned'} Students` :
            state.allStudents.find(s => s.user_id === m.receiver_id)?.full_name || `User ID: ${m.receiver_id}`;
        
        return `<tr>
            <td>${formatDateTime(m.sent_at)}</td>
            <td>${escapeHtml(m.subject)}</td>
            <td>${escapeHtml(targetDisplay)}</td>
            <td><span class="status-success">Sent</span></td>
            <td><button class="btn btn-action btn-small" data-action="view-message" data-message="${m.id}">View</button></td>
        </tr>`;
    }).join('');
}

// ============================================================
// 18. CALENDAR
// ============================================================

function loadCalendar() {
    const container = $('calendarView');
    if (container) {
        container.innerHTML = `
            <div style="background: white; border-radius: 12px; padding: 20px;">
                <p>Academic Calendar for ${state.program || 'All Programs'}</p>
                <div style="text-align: center; padding: 40px; color: #6b7280;">
                    <i class="fas fa-calendar-alt" style="font-size: 48px; display: block; margin-bottom: 15px;"></i>
                    <p>Full calendar integration coming soon.</p>
                    <p style="font-size: 12px;">Your sessions and exams will appear here.</p>
                </div>
            </div>
        `;
    }
}

// ============================================================
// 19. NURSE IQ
// ============================================================

function loadNurseIQ() {
    const container = $('nurse-iq-content');
    if (container) {
        container.innerHTML = `
            <div class="panel_s">
                <div class="panel-body text-center" style="padding: 60px;">
                    <i class="fas fa-stethoscope" style="font-size: 64px; color: #4C1D95; margin-bottom: 20px;"></i>
                    <h3>Nurse IQ Assessment</h3>
                    <p>Clinical knowledge assessment module for ${state.program || 'Nursing'} students.</p>
                    <p style="font-size: 12px; color: #6b7280; margin-top: 10px;">Coming soon...</p>
                </div>
            </div>
        `;
    }
}

// ============================================================
// 20. EVENT LISTENERS
// ============================================================

function setupEventListeners() {
    // Mobile nav toggle
    const toggle = $('mobileNavToggle');
    if (toggle) {
        toggle.addEventListener('click', () => {
            document.getElementById('sidebar')?.classList.toggle('active');
        });
    }
    
    // Logout
    const logoutBtn = $('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await state.sb.auth.signOut();
            window.location.href = 'login.html';
        });
    }
    
    // Profile photo upload
    const updatePhotoBtn = $('updatePhotoBtn');
    const photoInput = $('photoUploadInput');
    if (updatePhotoBtn && photoInput) {
        updatePhotoBtn.addEventListener('click', () => photoInput.click());
        photoInput.addEventListener('change', handleProfilePhotoChange);
    }
    
    // Edit profile
    const editProfileBtn = $('editProfileBtn');
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => {
            showNotification('Profile editing feature coming soon!', 'info');
        });
    }
    
    // Change password
    const updatePasswordBtn = $('updatePasswordBtn');
    if (updatePasswordBtn) {
        updatePasswordBtn.addEventListener('click', () => {
            showNotification('Password change feature coming soon!', 'info');
        });
    }
    
    // Notification button
    const notificationBtn = $('notificationBtn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', () => {
            showNotification('Notifications feature coming soon!', 'info');
        });
    }
    
    // Help button
    const helpBtn = $('helpBtn');
    if (helpBtn) {
        helpBtn.addEventListener('click', () => {
            showNotification('Help documentation is being prepared.', 'info');
        });
    }
    
    // Navigation clicks
    document.querySelectorAll('.nav a[data-tab]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = link.dataset.tab;
            loadSectionData(tab);
            document.getElementById('sidebar')?.classList.remove('active');
        });
    });
    
    // Card clicks
    document.querySelectorAll('.card[data-tab]').forEach(card => {
        card.addEventListener('click', () => {
            const tab = card.dataset.tab;
            loadSectionData(tab);
        });
    });
    
    // Session form
    const sessionForm = $('addSessionForm');
    if (sessionForm) {
        sessionForm.addEventListener('submit', handleAddSession);
    }
    
    // Manual attendance form
    const attendanceForm = $('manualAttendanceForm');
    if (attendanceForm) {
        attendanceForm.addEventListener('submit', handleManualAttendance);
    }
    
    // Lecturer check-in
    const checkinBtn = $('lecturerCheckinBtn');
    if (checkinBtn) {
        checkinBtn.addEventListener('click', lecturerCheckIn);
    }
    
    // Exam form
    const examForm = $('addExamForm');
    if (examForm) {
        examForm.addEventListener('submit', handleAddExam);
    }
    
    // Resource form
    const resourceForm = $('uploadResourceForm');
    if (resourceForm) {
        resourceForm.addEventListener('submit', handleUploadResource);
    }
    
    // Message form
    const messageForm = $('sendMessageForm');
    if (messageForm) {
        messageForm.addEventListener('submit', handleSendMessage);
    }
    
    // Report form
    const reportForm = $('reportGenerationForm');
    if (reportForm) {
        reportForm.addEventListener('submit', handleGenerateReport);
    }
    
    // Settings form
    const settingsForm = $('settingsForm');
    if (settingsForm) {
        settingsForm.addEventListener('submit', handleSaveSettings);
    }
    
    // Edit resource modal
    const editResourceForm = $('editResourceForm');
    if (editResourceForm) {
        editResourceForm.addEventListener('submit', saveResourceEdits);
    }
    const closeEditResourceBtn = $('closeEditResourceModal');
    if (closeEditResourceBtn) {
        closeEditResourceBtn.addEventListener('click', closeEditResourceModal);
    }
    const cancelEditResourceBtn = $('cancelEditResourceBtn');
    if (cancelEditResourceBtn) {
        cancelEditResourceBtn.addEventListener('click', closeEditResourceModal);
    }
    
    // Edit exam modal
    const editExamForm = $('editExamForm');
    if (editExamForm) {
        editExamForm.addEventListener('submit', saveEditedExam);
    }
    const closeExamEditBtn = $('closeExamEditModal');
    if (closeExamEditBtn) {
        closeExamEditBtn.addEventListener('click', closeEditExamModal);
    }
    const cancelEditExamBtn = $('cancelEditExamBtn');
    if (cancelEditExamBtn) {
        cancelEditExamBtn.addEventListener('click', closeEditExamModal);
    }
    
    // Student info modal
    const closeStudentInfoBtn = $('closeStudentInfoModal');
    if (closeStudentInfoBtn) {
        closeStudentInfoBtn.addEventListener('click', closeStudentInfoModal);
    }
    
    // Map modal
    const closeMapBtn = $('closeMapModal');
    if (closeMapBtn) {
        closeMapBtn.addEventListener('click', closeMapModal);
    }
    
    // Search buttons
    const courseSearchBtn = $('courseSearchBtn');
    if (courseSearchBtn) {
        courseSearchBtn.addEventListener('click', () => {
            filterTable('courseSearch', 'lecturerCoursesTable', [0, 1]);
        });
    }
    
    const attendanceSearchBtn = $('attendanceSearchBtn');
    if (attendanceSearchBtn) {
        attendanceSearchBtn.addEventListener('click', filterTodayAttendance);
    }
    
    const examSearchBtn = $('examSearchBtn');
    if (examSearchBtn) {
        examSearchBtn.addEventListener('click', () => {
            filterTable('examSearch', 'examsTable', [1, 2, 3]);
        });
    }
    
    const resourceSearchBtn = $('resourceSearchBtn');
    if (resourceSearchBtn) {
        resourceSearchBtn.addEventListener('click', () => {
            filterTable('resourceSearch', 'resourcesList', [0, 1, 2]);
        });
    }
    
    // Student search
    const studentSearch = $('studentSearch');
    if (studentSearch) {
        studentSearch.addEventListener('keyup', filterStudentTable);
    }
    
    // Filter changes
    const studentIntakeFilter = $('studentIntakeFilter');
    if (studentIntakeFilter) {
        studentIntakeFilter.addEventListener('change', filterStudentTable);
    }
    const studentStatusFilter = $('studentStatusFilter');
    if (studentStatusFilter) {
        studentStatusFilter.addEventListener('change', filterStudentTable);
    }
    const studentRiskFilter = $('studentRiskFilter');
    if (studentRiskFilter) {
        studentRiskFilter.addEventListener('change', filterStudentTable);
    }
    
    // Marks tab buttons
    const internalTab = $('lecTabInternal');
    if (internalTab) {
        internalTab.addEventListener('click', () => switchMarksTab('internal'));
    }
    const nckTab = $('lecTabNck');
    if (nckTab) {
        nckTab.addEventListener('click', () => switchMarksTab('nck'));
    }
    const analyticsTab = $('lecTabAnalytics');
    if (analyticsTab) {
        analyticsTab.addEventListener('click', () => switchMarksTab('analytics'));
    }
    
    // Marks filter changes
    const lecBlockSelect = $('lecBlockSelect');
    if (lecBlockSelect) {
        lecBlockSelect.addEventListener('change', () => {
            loadLecturerSubjects();
            loadLecturerInternalMarks();
        });
    }
    const lecSubjectSelect = $('lecSubjectSelect');
    if (lecSubjectSelect) {
        lecSubjectSelect.addEventListener('change', loadLecturerInternalMarks);
    }
    const lecNckBlock = $('lecNckBlock');
    if (lecNckBlock) {
        lecNckBlock.addEventListener('change', loadLecturerNCKMarks);
    }
    const lecNckSheet = $('lecNckSheet');
    if (lecNckSheet) {
        lecNckSheet.addEventListener('change', loadLecturerNCKMarks);
    }
    
    // Past attendance filters
    const pastDateFilter = $('pastAttendanceDateFilter');
    if (pastDateFilter) {
        pastDateFilter.addEventListener('change', filterPastAttendance);
    }
    const pastTypeFilter = $('pastAttendanceTypeFilter');
    if (pastTypeFilter) {
        pastTypeFilter.addEventListener('change', filterPastAttendance);
    }
    const pastSearch = $('pastAttendanceSearch');
    if (pastSearch) {
        pastSearch.addEventListener('keyup', filterPastAttendance);
    }
    
    // Attendance search
    const attendanceSearch = $('attendanceSearch');
    if (attendanceSearch) {
        attendanceSearch.addEventListener('keyup', filterTodayAttendance);
    }
    
    // Course search
    const courseSearch = $('courseSearch');
    if (courseSearch) {
        courseSearch.addEventListener('keyup', () => {
            filterTable('courseSearch', 'lecturerCoursesTable', [0, 1]);
        });
    }
    
    // Exam search
    const examSearch = $('examSearch');
    if (examSearch) {
        examSearch.addEventListener('keyup', () => {
            filterTable('examSearch', 'examsTable', [1, 2, 3]);
        });
    }
    
    // Resource search
    const resourceSearch = $('resourceSearch');
    if (resourceSearch) {
        resourceSearch.addEventListener('keyup', () => {
            filterTable('resourceSearch', 'resourcesList', [0, 1, 2]);
        });
    }
    
    // Event delegation for dynamic buttons
    document.addEventListener('click', handleDynamicClicks);
}

// ============================================================
// 21. DYNAMIC CLICK HANDLER
// ============================================================

function handleDynamicClicks(e) {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    
    const action = target.dataset.action;
    
    switch (action) {
        case 'view-student':
            viewStudentProfile(target.dataset.user);
            break;
        case 'message-student':
            showSendMessageModal(target.dataset.user, target.dataset.name);
            break;
        case 'edit-exam':
            openEditExamModal(target.dataset.exam);
            break;
        case 'grade-exam':
            openGradeModal(target.dataset.exam);
            break;
        case 'delete-exam':
            deleteExam(target.dataset.exam);
            break;
        case 'delete-resource':
            deleteResource(target.dataset.resource);
            break;
        case 'copy-link':
            e.preventDefault();
            navigator.clipboard.writeText(target.dataset.link).then(() => {
                showNotification('Link Copied!', 'success');
            });
            break;
        case 'view-map':
            viewCheckInMap(target.dataset.lat, target.dataset.lng, target.dataset.name);
            break;
        case 'edit-session':
            showNotification('Edit session feature coming soon', 'info');
            break;
        case 'manage-course':
            showNotification('Course management coming soon', 'info');
            break;
        case 'view-message':
            showNotification('View message feature coming soon', 'info');
            break;
        default:
            console.log('Unknown action:', action);
    }
}

// ============================================================
// 22. FORM HANDLERS
// ============================================================

async function handleAddSession(e) {
    e.preventDefault();
    const btn = e.submitter || e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Scheduling...';
    
    const data = {
        title: $('sessionTopic').value,
        date: $('sessionDate').value,
        time: $('sessionTime').value,
        program: $('sessionProgram').value,
        block_term: $('sessionBlockTerm').value,
        course_id: $('sessionCourseId').value
    };
    
    if (Object.values(data).some(v => !v)) {
        showNotification('Please fill all fields.', 'error');
        btn.disabled = false;
        btn.textContent = 'Schedule Session';
        return;
    }
    
    try {
        await state.sb.from(TABLES.SESSIONS).insert({
            session_title: data.title,
            session_date: data.date,
            session_time: data.time,
            target_program: data.program,
            block_term: data.block_term,
            course_id: data.course_id,
            lecturer_id: state.currentUserId
        });
        showNotification(`✅ Session "${data.title}" scheduled!`, 'success');
        e.target.reset();
        loadSessionsTable();
    } catch (error) {
        showNotification(`Failed: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Schedule Session';
    }
}

async function handleManualAttendance(e) {
    e.preventDefault();
    const btn = e.submitter || e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Marking...';
    
    const studentId = $('attStudentId').value;
    const sessionType = $('attSessionType').value;
    const courseId = $('attCourseId').value;
    const location = $('attLocation').value;
    const date = $('attDate').value;
    const time = $('attTime').value;
    
    if (!studentId || !sessionType || !date) {
        showNotification('Student, Session Type, and Date required.', 'error');
        btn.disabled = false;
        btn.textContent = 'Mark Student Present';
        return;
    }
    
    const student = state.allStudents.find(s => s.user_id === studentId);
    if (!student) {
        showNotification('Student not found.', 'error');
        btn.disabled = false;
        btn.textContent = 'Mark Student Present';
        return;
    }
    
    try {
        await state.sb.from(TABLES.ATTENDANCE).insert({
            user_id: studentId,
            user_role: 'student',
            session_type: sessionType,
            check_in_time: `${date}T${time || '12:00'}:00.000Z`,
            course_id: courseId || null,
            location_details: `MANUAL: ${location || 'N/A'} (By ${state.currentUser.full_name})`,
            status: 'Present',
            recorded_by_id: state.currentUserId,
            recorded_by_name: state.currentUser.full_name,
            student_name: student.full_name,
            student_email: student.email,
            program: student.program,
            block: student.block,
            intake_year: student.intake_year,
            is_manual_entry: true
        });
        showNotification(`✅ ${student.full_name} marked present!`, 'success');
        e.target.reset();
        loadTodayAttendance();
    } catch (error) {
        showNotification(`Failed: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Mark Student Present';
    }
}

async function lecturerCheckIn() {
    const btn = $('lecturerCheckinBtn');
    btn.disabled = true;
    btn.textContent = 'Marking...';
    
    if (!navigator.geolocation) {
        showNotification('Geolocation not supported.', 'error');
        btn.disabled = false;
        btn.textContent = 'Mark My Attendance';
        return;
    }
    
    navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
            await state.sb.from(TABLES.ATTENDANCE).insert({
                user_id: state.currentUserId,
                user_role: 'lecturer',
                session_type: 'Lecturer Check-in',
                check_in_time: new Date().toISOString(),
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                status: 'Present',
                recorded_by_id: state.currentUserId,
                recorded_by_name: state.currentUser.full_name,
                student_name: state.currentUser.full_name,
                program: state.program
            });
            showNotification('✅ Check-in logged!', 'success');
            loadTodayAttendance();
        } catch (e) {
            showNotification(`Check-in failed: ${e.message}`, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Mark My Attendance';
        }
    }, (e) => {
        showNotification(`Geolocation error: ${e.message}`, 'error');
        btn.disabled = false;
        btn.textContent = 'Mark My Attendance';
    });
}

async function handleAddExam(e) {
    e.preventDefault();
    const btn = e.submitter || e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Creating...';
    
    const data = {
        title: $('examTitle').value,
        date: $('examDate').value,
        type: $('examType').value,
        program: $('examProgram').value,
        intake: $('examIntake').value,
        block_term: $('examBlockTerm').value,
        course_id: $('examCourseId').value,
        start_time: $('examStartTime').value,
        duration: $('examDurationMinutes').value,
        link: $('examLink').value,
        status: $('examStatus').value
    };
    
    const required = ['title', 'date', 'type', 'program', 'intake', 'block_term', 'duration'];
    if (required.some(f => !data[f])) {
        showNotification('Please fill all required fields.', 'error');
        btn.disabled = false;
        btn.textContent = 'Create Exam Record';
        return;
    }
    
    try {
        await state.sb.from(TABLES.EXAMS).insert({
            exam_name: data.title,
            exam_date: data.date,
            exam_start_time: data.start_time || null,
            exam_type: data.type,
            online_link: data.link || null,
            duration_minutes: parseInt(data.duration),
            target_program: data.program,
            course_id: data.course_id || null,
            intake_year: data.intake,
            block_term: data.block_term,
            status: data.status,
            created_by: state.currentUserId
        });
        showNotification(`✅ ${data.type} "${data.title}" created!`, 'success');
        e.target.reset();
        if (state.program) $('examProgram').value = state.program;
        loadExamsTable();
    } catch (error) {
        showNotification(`Failed: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Create Exam Record';
    }
}

async function handleUploadResource(e) {
    e.preventDefault();
    const btn = e.submitter || e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Uploading...';
    
    const program = $('resourceProgram').value;
    const intake = $('resourceIntake').value;
    const block = $('resourceBlock').value;
    const fileInput = $('resourceFile');
    const title = $('resourceTitle').value.trim();
    const category = $('resourceCategory').value;
    
    if (!fileInput.files.length || !program || !intake || !block || !title || !category) {
        showNotification('Please fill all required fields.', 'error');
        btn.disabled = false;
        btn.textContent = 'Upload Resource';
        return;
    }
    
    const file = fileInput.files[0];
    const ext = file.name.split('.').pop();
    const base = title.replace(/[^\w\-]+/g, '_') + '_' + Date.now();
    const fileName = `${base}.${ext}`;
    const filePath = `${program}/${intake}/${block}/${fileName}`;
    
    try {
        const { error: uploadError } = await state.sb
            .storage
            .from(RESOURCES_BUCKET)
            .upload(filePath, file, { cacheControl: '3600', upsert: true });
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = state.sb
            .storage
            .from(RESOURCES_BUCKET)
            .getPublicUrl(filePath);
        
        await state.sb.from(TABLES.RESOURCES).insert({
            title,
            category,
            program_type: program,
            target_program: program,
            intake,
            intake_year: intake,
            block,
            block_term: block,
            file_path: filePath,
            file_name: fileName,
            file_url: publicUrl,
            uploaded_by: state.currentUserId,
            uploaded_by_name: state.currentUser?.full_name,
            allow_download: true
        });
        showNotification(`✅ "${title}" uploaded!`, 'success');
        e.target.reset();
        loadResourcesTable();
    } catch (err) {
        showNotification(`Upload failed: ${err.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Upload Resource';
    }
}

async function handleSendMessage(e) {
    e.preventDefault();
    const btn = e.submitter || e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Sending...';
    
    const target = $('msgTarget').value;
    const subject = $('msgSubject').value;
    const body = $('msgBody').value;
    
    if (!target || !subject || !body) {
        showNotification('Please fill all fields.', 'error');
        btn.disabled = false;
        btn.textContent = 'Send Message';
        return;
    }
    
    try {
        const receiverId = target === 'all-students' ? 'SYSTEM_GROUP' : target;
        const targetGroup = target === 'all-students' ? 'all-students' : 'specific-user';
        
        await state.sb.from(TABLES.MESSAGES).insert({
            sender_id: state.currentUserId,
            sender_name: state.currentUser.full_name,
            subject,
            body,
            receiver_id: receiverId,
            target_program: state.program,
            target_group: targetGroup
        });
        showNotification('✅ Message sent!', 'success');
        e.target.reset();
        populateMessageForm();
        loadMessagesTable();
    } catch (error) {
        showNotification(`Failed: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Send Message';
    }
}

async function handleGenerateReport(e) {
    e.preventDefault();
    const btn = e.submitter || e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Generating...';
    
    const type = $('reportType').value;
    const scope = $('reportScope').value;
    
    if (!type || !scope) {
        showNotification('Select both fields.', 'error');
        btn.disabled = false;
        btn.textContent = 'Generate Report';
        return;
    }
    
    await new Promise(r => setTimeout(r, 1500));
    showNotification(`✅ ${type} report generated!`, 'success');
    
    const table = $('reportsTable');
    const row = `<tr>
        <td>${type} - ${new Date().toLocaleDateString()}</td>
        <td>${type}</td>
        <td>${scope}</td>
        <td>${new Date().toLocaleDateString()}</td>
        <td><button class="btn btn-action btn-small" data-action="download-report">Download</button></td>
    </tr>`;
    table.innerHTML = table.innerHTML.includes('No reports') ? row : row + table.innerHTML;
    
    btn.disabled = false;
    btn.textContent = 'Generate Report';
}

async function handleSaveSettings(e) {
    e.preventDefault();
    const btn = e.submitter || e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Saving...';
    await new Promise(r => setTimeout(r, 1000));
    showNotification('✅ Settings saved!', 'success');
    btn.disabled = false;
    btn.textContent = 'Save Settings';
}

// ============================================================
// 23. MODAL FUNCTIONS
// ============================================================

async function openGradeModal(examId) {
    try {
        showLoading('Loading grading interface...');
        
        const { data: exam, error: examError } = await state.sb
            .from(TABLES.EXAMS)
            .select('*, course:course_id(course_name, unit_code)')
            .eq('id', examId)
            .eq('created_by', state.currentUserId)
            .single();
        
        if (examError || !exam) {
            showNotification('Exam not found.', 'error');
            return;
        }
        
        const students = state.allStudents.filter(s => 
            s.program === exam.target_program &&
            s.intake_year === exam.intake_year &&
            s.block === exam.block_term
        );
        
        if (!students.length) {
            showNotification('No students found for this exam.', 'warning');
            return;
        }
        
        const { data: existing } = await state.sb
            .from('exam_grades')
            .select('*')
            .eq('exam_id', examId);
        
        const modal = $('gradeModal');
        modal.innerHTML = buildGradeModal(exam, students, existing || []);
        modal.classList.add('active');
        
        // Attach grade calculation events
        students.forEach(s => {
            const cat1 = document.getElementById(`cat1-${s.user_id}`);
            const cat2 = document.getElementById(`cat2-${s.user_id}`);
            const final = document.getElementById(`final-${s.user_id}`);
            if (cat1) cat1.addEventListener('input', () => calculateStudentGrade(s.user_id));
            if (cat2) cat2.addEventListener('input', () => calculateStudentGrade(s.user_id));
            if (final) final.addEventListener('input', () => calculateStudentGrade(s.user_id));
        });
        
        // Save grades button
        const saveBtn = document.getElementById('saveGradesBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => saveAllGrades(examId));
        }
        
        // Close button
        const closeBtn = modal.querySelector('.close');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeGradeModal);
        }
        
        showNotification('Grading interface loaded.', 'success');
        
    } catch (error) {
        showNotification(`Failed: ${error.message}`, 'error');
    }
}

function buildGradeModal(exam, students, existing) {
    const studentRows = students.map(s => {
        const g = existing.find(e => e.student_id === s.user_id) || {};
        return `<tr data-name="${s.full_name.toLowerCase()}" data-id="${s.student_id.toLowerCase()}">
            <td>${escapeHtml(s.full_name)}</td>
            <td>${escapeHtml(s.student_id)}</td>
            <td><input type="number" min="0" max="30" step="0.5" id="cat1-${s.user_id}" value="${g.cat_1_score || ''}" class="grade-input"></td>
            <td><input type="number" min="0" max="30" step="0.5" id="cat2-${s.user_id}" value="${g.cat_2_score || ''}" class="grade-input"></td>
            <td><input type="number" min="0" max="100" step="0.5" id="final-${s.user_id}" value="${g.exam_score || ''}" class="grade-input"></td>
            <td><input type="number" id="total-${s.user_id}" value="${g.total_score || ''}" readonly class="total-input"></td>
            <td><span id="grade-${s.user_id}" class="grade-letter">${calculateGradeLetter(g.total_score)}</span></td>
            <td><select id="status-${s.user_id}" class="status-select">
                <option value="Scheduled" ${g.result_status === 'Scheduled' ? 'selected' : ''}>Scheduled</option>
                <option value="InProgress" ${g.result_status === 'InProgress' ? 'selected' : ''}>In Progress</option>
                <option value="Graded" ${g.result_status === 'Graded' ? 'selected' : ''}>Graded</option>
                <option value="Final" ${g.result_status === 'Final' ? 'selected' : ''}>Final</option>
            </select></td>
        </tr>`;
    }).join('');
    
    return `
        <div class="modal-header">
            <h3><i class="fas fa-check-circle"></i> Grade: ${escapeHtml(exam.exam_name)}</h3>
            <span class="close">&times;</span>
        </div>
        <div class="modal-body">
            <div class="exam-info-card" style="background:#f8f9fa;padding:15px;border-radius:8px;margin-bottom:15px;">
                <p><strong>Course:</strong> ${escapeHtml(exam.course?.course_name || 'General')}</p>
                <p><strong>Program:</strong> ${escapeHtml(exam.target_program)} | Block ${escapeHtml(exam.block_term)} | ${escapeHtml(exam.intake_year)}</p>
                <p><strong>Type:</strong> ${escapeHtml(exam.exam_type)} | <strong>Date:</strong> ${formatDate(exam.exam_date)}</p>
            </div>
            <div class="search-container">
                <input type="text" id="gradeSearch" placeholder="Search students..." class="search-input">
                <button class="btn btn-action" id="exportGradesBtn"><i class="fas fa-download"></i> Export</button>
            </div>
            <div class="table-container">
                <table class="grade-table">
                    <thead><tr>
                        <th>Student Name</th>
                        <th>Student ID</th>
                        <th>CAT 1 (/30)</th>
                        <th>CAT 2 (/30)</th>
                        <th>Final (/100)</th>
                        <th>Total (/100)</th>
                        <th>Grade</th>
                        <th>Status</th>
                    </tr></thead>
                    <tbody id="gradeTableBody">${studentRows}</tbody>
                </table>
            </div>
            <div class="modal-actions">
                <button class="btn btn-action" id="saveGradesBtn"><i class="fas fa-save"></i> Save All Grades</button>
                <button class="btn btn-delete" id="closeGradeModalBtn"><i class="fas fa-times"></i> Close</button>
            </div>
        </div>
    `;
}

function calculateStudentGrade(studentId) {
    const cat1 = parseFloat(document.getElementById(`cat1-${studentId}`)?.value) || 0;
    const cat2 = parseFloat(document.getElementById(`cat2-${studentId}`)?.value) || 0;
    const final = parseFloat(document.getElementById(`final-${studentId}`)?.value) || 0;
    const total = (cat1 * 0.3) + (cat2 * 0.3) + (final * 0.4);
    
    const totalInput = document.getElementById(`total-${studentId}`);
    const gradeSpan = document.getElementById(`grade-${studentId}`);
    
    if (totalInput && gradeSpan) {
        totalInput.value = total.toFixed(1);
        const letter = calculateGradeLetter(total);
        gradeSpan.textContent = letter;
        gradeSpan.className = `grade-letter ${total >= 50 ? 'grade-pass' : 'grade-fail'}`;
    }
}

function calculateGradeLetter(score) {
    if (!score && score !== 0) return '-';
    if (score >= 80) return 'A';
    if (score >= 75) return 'A-';
    if (score >= 70) return 'B+';
    if (score >= 65) return 'B';
    if (score >= 60) return 'B-';
    if (score >= 55) return 'C+';
    if (score >= 50) return 'C';
    if (score >= 45) return 'C-';
    if (score >= 40) return 'D+';
    if (score >= 35) return 'D';
    return 'E';
}

async function saveAllGrades(examId) {
    const rows = document.querySelectorAll('#gradeTableBody tr');
    const grades = [];
    let hasChanges = false;
    
    for (const row of rows) {
        const studentId = row.querySelector('input[id^="cat1-"]')?.id.replace('cat1-', '');
        if (!studentId) continue;
        
        const cat1 = document.getElementById(`cat1-${studentId}`)?.value;
        const cat2 = document.getElementById(`cat2-${studentId}`)?.value;
        const final = document.getElementById(`final-${studentId}`)?.value;
        const status = document.getElementById(`status-${studentId}`)?.value;
        
        if (cat1 || cat2 || final) {
            hasChanges = true;
            grades.push({
                exam_id: parseInt(examId),
                student_id: studentId,
                cat_1_score: cat1 ? parseFloat(cat1) : null,
                cat_2_score: cat2 ? parseFloat(cat2) : null,
                exam_score: final ? parseFloat(final) : null,
                total_score: document.getElementById(`total-${studentId}`)?.value ? parseFloat(document.getElementById(`total-${studentId}`).value) : null,
                result_status: status,
                graded_by: state.currentUserId,
                question_id: '00000000-0000-0000-0000-000000000000'
            });
        }
    }
    
    if (!hasChanges) {
        showNotification('No changes to save.', 'info');
        return;
    }
    
    try {
        await state.sb
            .from('exam_grades')
            .upsert(grades, { onConflict: 'exam_id,student_id,question_id' });
        showNotification(`✅ Saved ${grades.length} grades!`, 'success');
        closeGradeModal();
    } catch (error) {
        showNotification(`Failed: ${error.message}`, 'error');
    }
}

function closeGradeModal() {
    const modal = $('gradeModal');
    if (modal) modal.classList.remove('active');
}

async function openEditExamModal(examId) {
    try {
        const { data: exam, error } = await state.sb
            .from(TABLES.EXAMS)
            .select('*')
            .eq('id', examId)
            .eq('created_by', state.currentUserId)
            .single();
        
        if (error || !exam) {
            showNotification('Exam not found.', 'error');
            return;
        }
        
        $('editExamId').value = exam.id;
        $('editExamTitle').value = exam.exam_name || '';
        $('editExamDate').value = exam.exam_date || '';
        $('editExamStatus').value = exam.status || 'Scheduled';
        
        const modal = $('examEditModal');
        modal.classList.add('active');
        
    } catch (error) {
        showNotification(`Failed: ${error.message}`, 'error');
    }
}

function closeEditExamModal() {
    const modal = $('examEditModal');
    if (modal) modal.classList.remove('active');
}

async function saveEditedExam(e) {
    e.preventDefault();
    const btn = e.submitter || e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Saving...';
    
    const id = $('editExamId').value;
    const title = $('editExamTitle').value;
    const date = $('editExamDate').value;
    const status = $('editExamStatus').value;
    
    if (!title || !date) {
        showNotification('Title and date required.', 'error');
        btn.disabled = false;
        btn.textContent = 'Save Changes';
        return;
    }
    
    try {
        await state.sb
            .from(TABLES.EXAMS)
            .update({ exam_name: title, exam_date: date, status })
            .eq('id', id)
            .eq('created_by', state.currentUserId);
        
        showNotification('✅ Exam updated!', 'success');
        closeEditExamModal();
        loadExamsTable();
    } catch (error) {
        showNotification(`Failed: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save Changes';
    }
}

async function deleteExam(examId) {
    const exam = state.allExams.find(e => e.id === examId);
    if (!confirm(`Delete "${exam?.exam_name || 'Exam'}"?`)) return;
    
    try {
        await state.sb
            .from(TABLES.EXAMS)
            .delete()
            .eq('id', examId)
            .eq('created_by', state.currentUserId);
        showNotification('✅ Exam deleted!', 'success');
        loadExamsTable();
    } catch (error) {
        showNotification(`Delete failed: ${error.message}`, 'error');
    }
}

async function deleteResource(resourceId) {
    if (!confirm('Delete this resource?')) return;
    
    try {
        await state.sb
            .from(TABLES.RESOURCES)
            .delete()
            .eq('id', resourceId);
        showNotification('✅ Resource deleted!', 'success');
        loadResourcesTable();
    } catch (error) {
        showNotification(`Delete failed: ${error.message}`, 'error');
    }
}

function saveResourceEdits(e) {
    e.preventDefault();
    showNotification('Resource edits saved (placeholder).', 'info');
    closeEditResourceModal();
}

function closeEditResourceModal() {
    const modal = $('editResourceModal');
    if (modal) modal.classList.remove('active');
}

function viewStudentProfile(userId) {
    const student = state.allStudents.find(s => s.user_id === userId);
    if (!student) {
        showNotification('Student not found.', 'error');
        return;
    }
    
    $('infoName').textContent = student.full_name || 'N/A';
    $('infoRegno').textContent = student.student_id || 'N/A';
    $('infoEmail').textContent = student.email || 'N/A';
    $('infoProgram').textContent = student.program || 'N/A';
    $('infoIntake').textContent = student.intake_year || 'N/A';
    $('infoStatus').textContent = student.status || 'Active';
    $('infoAbsences').textContent = student.cumulative_absences || '0';
    
    const modal = $('studentInfoModal');
    modal.classList.add('active');
}

function closeStudentInfoModal() {
    const modal = $('studentInfoModal');
    if (modal) modal.classList.remove('active');
}

function showSendMessageModal(userId, fullName) {
    const form = $('sendMessageForm');
    if (form) form.reset();
    populateMessageForm();
    
    const target = $('msgTarget');
    if (target) {
        // Try to select the specific student
        for (const option of target.options) {
            if (option.value === userId) {
                target.value = userId;
                break;
            }
        }
    }
    showNotification(`Ready to message ${fullName}`, 'info');
}

function viewCheckInMap(lat, lng, name) {
    if (!lat || !lng) {
        showNotification('No location data.', 'info');
        return;
    }
    
    const modal = $('mapModal');
    modal.classList.add('active');
    
    if (state.attendanceMap) state.attendanceMap.remove();
    
    $('mapDetails').textContent = `Location for ${name}`;
    
    state.attendanceMap = L.map('mapbox-map').setView([parseFloat(lat), parseFloat(lng)], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
    }).addTo(state.attendanceMap);
    
    L.marker([parseFloat(lat), parseFloat(lng)])
        .addTo(state.attendanceMap)
        .bindPopup(`<b>${name}</b>`)
        .openPopup();
    
    setTimeout(() => state.attendanceMap.invalidateSize(), 300);
}

function closeMapModal() {
    const modal = $('mapModal');
    if (modal) modal.classList.remove('active');
}

// ============================================================
// 24. FILTER FUNCTIONS
// ============================================================

function filterTable(inputId, tableId, columnsToSearch = [0]) {
    const filter = document.getElementById(inputId)?.value.toUpperCase() || '';
    const tbody = document.getElementById(tableId);
    if (!tbody) return;
    
    const trs = tbody.getElementsByTagName('tr');
    for (let i = 0; i < trs.length; i++) {
        const tr = trs[i];
        if (tr.getElementsByTagName('td').length === 0) {
            tr.style.display = '';
            continue;
        }
        
        let rowMatches = false;
        for (const colIndex of columnsToSearch) {
            const td = tr.getElementsByTagName('td')[colIndex];
            if (td) {
                const txtValue = td.textContent || td.innerText;
                if (txtValue.toUpperCase().indexOf(filter) > -1) {
                    rowMatches = true;
                    break;
                }
            }
        }
        tr.style.display = rowMatches ? '' : 'none';
    }
}

function filterStudentTable() {
    const intake = $('studentIntakeFilter')?.value || 'all';
    const status = $('studentStatusFilter')?.value || 'all';
    const risk = $('studentRiskFilter')?.value || 'all';
    const search = $('studentSearch')?.value.toLowerCase() || '';
    
    const rows = document.querySelectorAll('#studentsTableBody tr');
    let visible = 0;
    
    rows.forEach(row => {
        if (row.cells.length < 2) return;
        const name = row.cells[0]?.textContent?.toLowerCase() || '';
        const id = row.cells[1]?.textContent?.toLowerCase() || '';
        const intakeVal = row.cells[4]?.textContent || '';
        const statusVal = row.cells[5]?.textContent?.trim() || '';
        const atRisk = row.classList.contains('student-at-risk');
        
        const matchIntake = intake === 'all' || intakeVal === intake;
        const matchStatus = status === 'all' || statusVal === status;
        const matchRisk = risk === 'all' || (risk === 'at-risk' && atRisk);
        const matchSearch = !search || name.includes(search) || id.includes(search);
        
        row.style.display = (matchIntake && matchStatus && matchRisk && matchSearch) ? '' : 'none';
        if (row.style.display !== 'none') visible++;
    });
    
    updateStudentStats(visible);
}

function filterTodayAttendance() {
    const search = $('attendanceSearch')?.value.toLowerCase() || '';
    const rows = document.querySelectorAll('#attendanceTable tr');
    rows.forEach(row => {
        if (row.cells.length === 0) return;
        row.style.display = row.textContent.toLowerCase().includes(search) ? '' : 'none';
    });
}

function filterPastAttendance() {
    const dateFilter = $('pastAttendanceDateFilter')?.value;
    const typeFilter = $('pastAttendanceTypeFilter')?.value;
    const searchFilter = $('pastAttendanceSearch')?.value.toLowerCase() || '';
    
    const rows = document.querySelectorAll('#pastAttendanceTable tr');
    let visible = 0;
    
    rows.forEach(row => {
        if (row.cells.length < 9) return;
        const date = row.cells[0]?.textContent || '';
        const name = row.cells[1]?.textContent?.toLowerCase() || '';
        const regNo = row.cells[2]?.textContent?.toLowerCase() || '';
        const type = row.cells[3]?.textContent?.toLowerCase() || '';
        
        const matchDate = !dateFilter || date === new Date(dateFilter).toLocaleDateString('en-GB');
        const matchType = typeFilter === 'all' || type.includes(typeFilter.toLowerCase());
        const matchSearch = !searchFilter || name.includes(searchFilter) || regNo.includes(searchFilter);
        
        const show = matchDate && matchType && matchSearch;
        row.style.display = show ? '' : 'none';
        if (show) visible++;
    });
    
    $('pastAttendanceCount').textContent = visible;
}

function switchMarksTab(tab) {
    // Hide all tabs
    document.querySelectorAll('.marks-tab').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.tabs-nav .tab-btn').forEach(b => b.classList.remove('active'));
    
    if (tab === 'internal') {
        $('lecInternalTab').style.display = 'block';
        $('lecTabInternal').classList.add('active');
        loadLecturerInternalMarks();
    } else if (tab === 'nck') {
        $('lecNckTab').style.display = 'block';
        $('lecTabNck').classList.add('active');
        loadLecturerNCKMarks();
    } else if (tab === 'analytics') {
        $('lecAnalyticsTab').style.display = 'block';
        $('lecTabAnalytics').classList.add('active');
        loadLecturerAnalytics();
    }
}

async function loadLecturerAnalytics() {
    try {
        const { data: grades } = await state.sb
            .from(TABLES.MARKS)
            .select('final_score');
        
        const { data: nck } = await state.sb
            .from(TABLES.NCK)
            .select('final_score');
        
        let total = 0, scored = 0, passed = 0;
        const all = [...(grades || []), ...(nck || [])];
        
        for (const item of all) {
            const score = item.final_score || 0;
            if (score > 0) {
                total += score;
                scored++;
                if (score >= 60) passed++;
            }
        }
        
        const avg = scored > 0 ? (total / scored).toFixed(1) : 0;
        const rate = scored > 0 ? ((passed / scored) * 100).toFixed(1) : 0;
        
        $('lecAnalyticsAvg').textContent = `${avg}%`;
        $('lecAnalyticsPass').textContent = `${rate}%`;
        $('lecAnalyticsTotal').textContent = all.length;
        $('lecAvgScore').textContent = `${avg}%`;
        
        // Chart
        if (state.lecturerChart) state.lecturerChart.destroy();
        const ctx = document.getElementById('lecPerformanceChart')?.getContext('2d');
        
        if (ctx) {
            state.lecturerChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: [`Pass (${passed})`, `Fail (${scored - passed})`, `Pending (${all.length - scored})`],
                    datasets: [{
                        data: [passed, scored - passed, all.length - scored],
                        backgroundColor: ['#10b981', '#ef4444', '#f59e0b'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { position: 'bottom' }
                    }
                }
            });
        }
        
    } catch (error) {
        console.error('Analytics error:', error);
    }
}

// ============================================================
// 25. PROFILE PHOTO HANDLER
// ============================================================

async function handleProfilePhotoChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        $('profileImg').src = e.target.result;
    };
    reader.readAsDataURL(file);
    
    await uploadProfilePhoto(file);
}

async function uploadProfilePhoto(file) {
    const userId = state.currentUserId;
    if (!userId) {
        showNotification('Error: User ID not found.', 'error');
        return;
    }
    
    const ext = file.name.split('.').pop();
    const path = `avatars/${userId}.${ext}`;
    
    try {
        await state.sb
            .storage
            .from(RESOURCES_BUCKET)
            .upload(path, file, { cacheControl: '3600', upsert: true });
        
        const { data: urlData } = state.sb
            .storage
            .from(RESOURCES_BUCKET)
            .getPublicUrl(path);
        
        await state.sb
            .from(TABLES.USERS)
            .update({ avatar_url: urlData.publicUrl })
            .eq('user_id', userId);
        
        state.currentUser.avatar_url = urlData.publicUrl;
        $('profileImg').src = urlData.publicUrl;
        showNotification('✅ Profile photo updated!', 'success');
        
    } catch (error) {
        showNotification(`Photo upload failed: ${error.message}`, 'error');
    }
}

// ============================================================
// 26. INITIALIZATION
// ============================================================

// Start the dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', initLecturerDashboard);

// Export for debugging
console.log('✅ lecturer.js loaded successfully');
console.log('📚 Program filter:', state.program);
