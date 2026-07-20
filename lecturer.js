/**
 * ============================================================
 * NCHSM LECTURER DASHBOARD - COMPLETE JAVASCRIPT
 * ============================================================
 * Matches Super Admin style with program filtering
 */

// ============================================================
// 1. CONFIGURATION & CONSTANTS
// ============================================================

var CONFIG = {
    SUPABASE_URL: 'https://lwhtjozfsmbyihenfunw.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk'
};

var TABLES = {
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

var ACADEMIC_STRUCTURE = {
    'KRCHN': ['Introductory', 'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Final'],
    'TVET': ['Introductory', 'Term 1', 'Term 2', 'Term 3', 'Term 4', 'Term 5', 'Term 6', 'Final']
};

var RESOURCES_BUCKET = 'resources';

// ============================================================
// 2. STATE MANAGEMENT
// ============================================================

var state = {
    sb: null,
    currentUser: null,
    currentUserId: null,
    program: null,
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

function $(id) {
    return document.getElementById(id);
}

function $$(selector) {
    return document.querySelectorAll(selector);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function showFeedback(message, type) {
    type = type || 'info';
    var el = $('feedbackMessage');
    if (!el) {
        console.warn('[' + type + '] ' + message);
        return;
    }
    el.textContent = message;
    el.className = 'feedback-' + type;
    el.style.display = 'block';
    if (type !== 'error') {
        setTimeout(function() {
            el.style.display = 'none';
        }, 5000);
    }
}

function showNotification(message, type) {
    showFeedback(message, type || 'success');
}

function showLoading(message) {
    showFeedback(message, 'info');
}

function hideLoading() {
    var el = $('feedbackMessage');
    if (el) el.style.display = 'none';
}

function formatDate(date) {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric'
    });
}

function formatDateTime(date) {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function getProgramFromDepartment(department) {
    if (!department) return null;
    var dept = department.toLowerCase().trim();
    if (dept.includes('krchn') || dept.includes('nursing') || dept.includes('registered')) {
        return 'KRCHN';
    }
    if (dept.includes('tvet') || dept.includes('technical') || dept.includes('vocational')) {
        return 'TVET';
    }
    return null;
}

function isTVETProgram(programCode) {
    if (!programCode) return false;
    var code = String(programCode).toUpperCase().trim();
    var tvetCodes = [
        'DPOTT', 'DCH', 'DHRIT', 'DSL', 'DSW', 'DCJS', 'DHSS', 'DICT', 'DME',
        'CPOTT', 'CCH', 'CHRIT', 'CPC', 'CSL', 'CSW', 'CCJS', 'CAG', 'CHSS', 'CICT',
        'ACH', 'AAG', 'ASW', 'CCA', 'PTE'
    ];
    return tvetCodes.includes(code);
}

function getProgramType(programCode) {
    if (!programCode) return 'KRCHN';
    var code = String(programCode).toUpperCase().trim();
    if (code === 'KRCHN') return 'KRCHN';
    if (isTVETProgram(code)) return 'TVET';
    return 'KRCHN';
}

function getProgramDisplayName(programCode) {
    if (!programCode) return 'Unknown Program';
    var names = {
        'KRCHN': 'KRCHN Nursing',
        'DPOTT': 'Diploma in Perioperative Theatre Technology',
        'DCH': 'Diploma in Community Health',
        'DHRIT': 'Diploma in Health Records and IT',
        'DSL': 'Diploma in Science Lab',
        'DSW': 'Diploma in Social Work',
        'DCJS': 'Diploma in Criminal Justice',
        'DHSS': 'Diploma in Health Support Services',
        'DICT': 'Diploma in ICT',
        'DME': 'Diploma in Medical Engineering',
        'CPOTT': 'Certificate in Perioperative Theatre Technology',
        'CCH': 'Certificate in Community Health',
        'CHRIT': 'Certificate in Health Records and IT',
        'CPC': 'Certificate in Patient Care',
        'CSL': 'Certificate in Science Lab',
        'CSW': 'Certificate in Social Work',
        'CCJS': 'Certificate in Criminal Justice',
        'CAG': 'Certificate in Agriculture',
        'CHSS': 'Certificate in Health Support Services',
        'CICT': 'Certificate in ICT',
        'ACH': 'Artisan in Community Health',
        'AAG': 'Artisan in Agriculture',
        'ASW': 'Artisan in Social Work',
        'CCA': 'Certificate in Computer Applications',
        'PTE': 'TVET/CDACC (PTE)'
    };
    return names[code] || programCode;
}

function populateSelect(selectElement, data, valueKey, textKey, defaultText) {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">-- ' + (defaultText || 'Select') + ' --</option>';
    if (!data || !data.length) return;
    data.forEach(function(item) {
        var value = item[valueKey] || item.id || '';
        var text = item[textKey] || item.name || value;
        var option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        selectElement.appendChild(option);
    });
}

function getAcademicBlocks(program) {
    return ACADEMIC_STRUCTURE[program] || ACADEMIC_STRUCTURE['KRCHN'];
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

function calculateGradeLetter(score) {
    return calculateGrade(score);
}

function filterTable(inputId, tableId, columnsToSearch) {
    columnsToSearch = columnsToSearch || [0];
    var filter = document.getElementById(inputId)?.value.toUpperCase() || '';
    var tbody = document.getElementById(tableId);
    if (!tbody) return;
    var trs = tbody.getElementsByTagName('tr');
    for (var i = 0; i < trs.length; i++) {
        var tr = trs[i];
        if (tr.getElementsByTagName('td').length === 0) {
            tr.style.display = '';
            continue;
        }
        var rowMatches = false;
        for (var j = 0; j < columnsToSearch.length; j++) {
            var td = tr.getElementsByTagName('td')[columnsToSearch[j]];
            if (td) {
                var txtValue = td.textContent || td.innerText;
                if (txtValue.toUpperCase().indexOf(filter) > -1) {
                    rowMatches = true;
                    break;
                }
            }
        }
        tr.style.display = rowMatches ? '' : 'none';
    }
}

// ============================================================
// 4. AUTHENTICATION & INITIALIZATION
// ============================================================

async function initLecturerDashboard() {
    console.log('🚀 Initializing Lecturer Dashboard...');
    
    try {
        state.sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
        window.sb = state.sb;
        
        var { data: { session }, error: sessionError } = await state.sb.auth.getSession();
        if (sessionError || !session) {
            console.warn('No session found, redirecting to login...');
            window.location.href = 'login.html';
            return;
        }
        
        var user = session.user;
        console.log('✅ User authenticated:', user.email);
        
        var { data: profile, error: profileError } = await state.sb
            .from(TABLES.USERS)
            .select('*')
            .eq('user_id', user.id)
            .single();
        
        if (profileError || !profile) {
            console.error('Profile not found:', profileError?.message);
            window.location.href = 'login.html';
            return;
        }
        
        var allowedRoles = ['lecturer', 'admin', 'superadmin'];
        if (!allowedRoles.includes(profile.role)) {
            console.warn('User is not a lecturer. Role:', profile.role);
            window.location.href = 'login.html';
            return;
        }
        
        state.currentUser = profile;
        state.currentUserId = user.id;
        state.program = getProgramFromDepartment(profile.department) || 'KRCHN';
        
        console.log('📚 Lecturer Program:', state.program);
        
        updateUIWithProgram();
        await loadAllData();
        setupEventListeners();
        loadSectionData('dashboard');
        
        var dateEl = $('currentDate');
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
    var program = state.program;
    var programName = program === 'KRCHN' ? '🎓 KRCHN Nursing' : '🔧 TVET Programs';
    
    var badge = $('userProgramBadge');
    if (badge) badge.textContent = programName;
    
    var subtitle = $('programSubtitle');
    if (subtitle) subtitle.textContent = 'Dashboard filtered for ' + programName;
    
    var banner = $('welcomeBannerText');
    if (banner) {
        banner.textContent = 'This dashboard is filtered to your program: ' + programName + '. The card data below highlights urgent tasks.';
    }
    
    var header = $('welcomeHeader');
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
        var query = state.sb.from(TABLES.USERS).select('*').eq('role', 'student');
        if (state.program) {
            query = query.eq('program', state.program);
        }
        var { data, error } = await query.order('full_name', { ascending: true });
        if (error) throw error;
        state.allStudents = data || [];
        console.log('✅ Loaded ' + state.allStudents.length + ' students for ' + state.program);
        return state.allStudents;
    } catch (error) {
        console.error('Error loading students:', error);
        state.allStudents = [];
        return [];
    }
}

async function loadCourses() {
    try {
        var query = state.sb.from(TABLES.COURSES).select('*');
        if (state.program) {
            query = query.eq('target_program', state.program);
        }
        var { data, error } = await query.order('course_name', { ascending: true });
        if (error) throw error;
        state.allCourses = data || [];
        console.log('✅ Loaded ' + state.allCourses.length + ' courses for ' + state.program);
        return state.allCourses;
    } catch (error) {
        console.error('Error loading courses:', error);
        state.allCourses = [];
        return [];
    }
}

async function loadExams() {
    try {
        var query = state.sb.from(TABLES.EXAMS).select('*, course:course_id(course_name, unit_code)');
        if (state.program) {
            query = query.eq('target_program', state.program);
        }
        var { data, error } = await query.order('exam_date', { ascending: false });
        if (error) throw error;
        state.allExams = data || [];
        console.log('✅ Loaded ' + state.allExams.length + ' exams');
        return state.allExams;
    } catch (error) {
        console.error('Error loading exams:', error);
        state.allExams = [];
        return [];
    }
}

async function loadSessions() {
    try {
        var query = state.sb.from(TABLES.SESSIONS).select('*');
        if (state.program) {
            query = query.eq('target_program', state.program);
        }
        var { data, error } = await query.order('session_date', { ascending: true });
        if (error) throw error;
        state.allSessions = data || [];
        console.log('✅ Loaded ' + state.allSessions.length + ' sessions');
        return state.allSessions;
    } catch (error) {
        console.error('Error loading sessions:', error);
        state.allSessions = [];
        return [];
    }
}

async function loadResources() {
    try {
        var query = state.sb.from(TABLES.RESOURCES).select('*');
        if (state.program) {
            query = query.eq('target_program', state.program);
        }
        var { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        state.allResources = data || [];
        console.log('✅ Loaded ' + state.allResources.length + ' resources');
        return state.allResources;
    } catch (error) {
        console.error('Error loading resources:', error);
        state.allResources = [];
        return [];
    }
}

async function loadMessages() {
    try {
        var { data, error } = await state.sb
            .from(TABLES.MESSAGES)
            .select('*')
            .eq('sender_id', state.currentUserId)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.warn('Messages query error:', error);
            state.allMessages = [];
            return [];
        }
        
        state.allMessages = data || [];
        console.log('✅ Loaded ' + state.allMessages.length + ' messages');
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
    $$('.modal').forEach(function(m) { m.classList.remove('active'); });
    
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
        case 'reports': showNotification('Reports section loaded', 'info'); break;
        case 'settings': showNotification('Settings section loaded', 'info'); break;
        case 'nurse-iq': loadNurseIQ(); break;
        default: console.log('Unknown tab:', tabId);
    }
    
    $$('.tab-content').forEach(function(s) { s.classList.remove('active'); });
    var target = $(tabId + '-content');
    if (target) target.classList.add('active');
    
    $$('.nav a').forEach(function(link) { link.classList.remove('active'); });
    var activeLink = document.querySelector('.nav a[data-tab="' + tabId + '"]');
    if (activeLink) activeLink.classList.add('active');
}

// ============================================================
// 7. DASHBOARD
// ============================================================

async function loadDashboard() {
    try {
        var students = state.allStudents;
        var courses = state.allCourses;
        
        var totalStudents = students.length;
        var totalCourses = courses.length;
        var atRisk = students.filter(function(s) { 
            return (s.cumulative_absences || 0) > 5 || (s.status || '').toLowerCase() === 'probation';
        });
        
        $('totalStudentsCount').textContent = totalStudents;
        $('totalCoursesCount').textContent = totalCourses;
        $('studentsAtRiskCount').textContent = atRisk.length;
        $('pendingAttendanceCount').textContent = '0';
        $('examsDueCount').textContent = state.allExams.filter(function(e) { 
            return e.status === 'Scheduled' || e.status === 'InProgress'; 
        }).length;
        $('unreadMessagesCount').textContent = '0';
        
        var badge = $('studentCountBadge');
        if (badge) badge.textContent = totalStudents;
        
        await loadAttendanceMetrics();
        
    } catch (error) {
        console.error('Dashboard error:', error);
    }
}

async function loadAttendanceMetrics() {
    try {
        var today = new Date();
        var startOfToday = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        var endOfToday = new Date(today.setHours(23, 59, 59, 999)).toISOString();
        
        var { data: todayData } = await state.sb
            .from(TABLES.ATTENDANCE)
            .select('*')
            .gte('check_in_time', startOfToday)
            .lte('check_in_time', endOfToday);
        
        if (todayData) {
            var filtered = todayData.filter(function(log) {
                return log.program === state.program || log.recorded_by_id === state.currentUserId;
            });
            $('todayAttendanceTotal').textContent = filtered.length;
        }
        
        var startOfWeek = new Date(today);
        var day = today.getDay();
        var diff = today.getDate() - day + (day === 0 ? -6 : 1);
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0, 0, 0, 0);
        
        var { data: weeklyData } = await state.sb
            .from(TABLES.ATTENDANCE)
            .select('*')
            .gte('check_in_time', startOfWeek.toISOString())
            .lte('check_in_time', endOfToday);
        
        if (weeklyData) {
            var filteredWeekly = weeklyData.filter(function(log) {
                return log.program === state.program || log.recorded_by_id === state.currentUserId;
            });
            $('weeklyAttendanceTotal').textContent = filteredWeekly.length || '0';
        }
        
        var startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        var { data: monthlyData } = await state.sb
            .from(TABLES.ATTENDANCE)
            .select('*')
            .gte('check_in_time', startOfMonth.toISOString())
            .lte('check_in_time', endOfToday);
        
        if (monthlyData) {
            var filteredMonthly = monthlyData.filter(function(log) {
                return log.program === state.program || log.recorded_by_id === state.currentUserId;
            });
            var unique = [...new Set(filteredMonthly.map(function(log) { return log.user_id; }))].length;
            var rate = state.allStudents.length > 0 ? Math.round((unique / state.allStudents.length) * 100) : 0;
            $('monthlyAttendanceRate').textContent = rate + '%';
        }
        
        var { data: overallData } = await state.sb
            .from(TABLES.ATTENDANCE)
            .select('*');
        
        if (overallData) {
            var filteredOverall = overallData.filter(function(log) {
                return log.program === state.program || log.recorded_by_id === state.currentUserId;
            });
            $('overallAttendanceTotal').textContent = filteredOverall.length || '0';
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
    var user = state.currentUser;
    
    var avatar = user.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.full_name || 'Lecturer') + '&background=4C1D95&color=fff&size=120';
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
    var tbody = $('lecturerCoursesTable');
    if (!tbody) return;
    
    var courses = state.allCourses.filter(function(c) { return (c.status || 'Active') === 'Active'; });
    
    if (!courses.length) {
        tbody.innerHTML = '<tr><td colspan="7">No courses found for ' + state.program + '.</td></tr>';
        return;
    }
    
    tbody.innerHTML = courses.map(function(c) {
        var students = state.allStudents.filter(function(s) {
            return s.program === state.program && (!c.intake_year || s.intake_year === c.intake_year);
        });
        return '<tr>' +
            '<td><strong>' + escapeHtml(c.unit_code || 'N/A') + '</strong></td>' +
            '<td>' + escapeHtml(c.course_name || 'N/A') + '</td>' +
            '<td><span class="program-badge">' + escapeHtml(c.target_program || 'N/A') + '</span></td>' +
            '<td>' + escapeHtml(c.block || 'N/A') + '</td>' +
            '<td>' + escapeHtml(c.intake_year || 'N/A') + '</td>' +
            '<td>' + students.length + ' students</td>' +
            '<td><button class="btn btn-action btn-small" data-action="manage-course" data-course="' + (c.id || '') + '"><i class="fas fa-chart-bar"></i> Manage</button></td>' +
        '</tr>';
    }).join('');
    
    populateCourseFilters(courses);
}

function populateCourseFilters(courses) {
    var years = [...new Set(courses.map(function(c) { return c.intake_year; }).filter(Boolean))].sort().reverse();
    var intakeFilter = $('intakeYearFilter');
    if (intakeFilter && years.length) {
        intakeFilter.innerHTML = '<option value="">All Intake Years</option>' + 
            years.map(function(y) { return '<option value="' + y + '">' + y + '</option>'; }).join('');
    }
    
    var blocks = getAcademicBlocks(state.program);
    var periodFilter = $('academicPeriodFilter');
    var label = $('academicPeriodLabel');
    if (periodFilter && label) {
        label.textContent = state.program === 'KRCHN' ? 'Filter by Block:' : 'Filter by Term:';
        periodFilter.innerHTML = '<option value="">All</option>' + 
            blocks.map(function(b) { return '<option value="' + b + '">' + b + '</option>'; }).join('');
    }
}

function filterCoursesByAcademicPeriod() {
    var intake = $('intakeYearFilter')?.value;
    var period = $('academicPeriodFilter')?.value;
    
    var filtered = state.allCourses.filter(function(c) {
        var matchProgram = c.target_program === state.program;
        var matchIntake = !intake || c.intake_year === intake;
        var matchPeriod = !period || c.block === period;
        var isActive = (c.status || 'Active') === 'Active';
        return matchProgram && matchIntake && matchPeriod && isActive;
    });
    
    var tbody = $('lecturerCoursesTable');
    if (!tbody) return;
    
    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="7">No courses match filters.</td></tr>';
        return;
    }
    
    tbody.innerHTML = filtered.map(function(c) {
        var students = state.allStudents.filter(function(s) {
            return s.program === state.program && (!c.intake_year || s.intake_year === c.intake_year);
        });
        return '<tr>' +
            '<td><strong>' + escapeHtml(c.unit_code || 'N/A') + '</strong></td>' +
            '<td>' + escapeHtml(c.course_name || 'N/A') + '</td>' +
            '<td><span class="program-badge">' + escapeHtml(c.target_program || 'N/A') + '</span></td>' +
            '<td>' + escapeHtml(c.block || 'N/A') + '</td>' +
            '<td>' + escapeHtml(c.intake_year || 'N/A') + '</td>' +
            '<td>' + students.length + ' students</td>' +
            '<td><button class="btn btn-action btn-small" data-action="manage-course" data-course="' + (c.id || '') + '"><i class="fas fa-chart-bar"></i> Manage</button></td>' +
        '</tr>';
    }).join('');
}

// ============================================================
// 10. STUDENTS
// ============================================================

function loadStudentsTable() {
    var tbody = $('studentsTableBody');
    if (!tbody) return;
    
    var students = state.allStudents;
    
    if (!students.length) {
        tbody.innerHTML = '<tr><td colspan="8">No students found for ' + state.program + '.</td></tr>';
        return;
    }
    
    tbody.innerHTML = students.map(function(s) {
        var status = (s.status || 'Active').toLowerCase();
        var atRisk = (s.cumulative_absences || 0) > 5 || status === 'probation';
        return '<tr class="' + (atRisk ? 'student-at-risk' : '') + '">' +
            '<td>' + (atRisk ? '⚠️ ' : '') + escapeHtml(s.full_name || 'N/A') + '</td>' +
            '<td><strong>' + escapeHtml(s.student_id || 'N/A') + '</strong></td>' +
            '<td>' + escapeHtml(s.email || 'N/A') + '</td>' +
            '<td>' + escapeHtml(s.program || 'N/A') + '</td>' +
            '<td>' + escapeHtml(s.intake_year || 'N/A') + '</td>' +
            '<td><span class="student-status-badge status-' + status + '">' + escapeHtml(s.status || 'Active') + '</span></td>' +
            '<td style="color:' + ((s.cumulative_absences || 0) > 3 ? '#EF4444' : '#10B981') + '">' + (s.cumulative_absences || 0) + ' days</td>' +
            '<td>' +
                '<button class="btn btn-action btn-small" data-action="view-student" data-user="' + (s.user_id || '') + '"><i class="fas fa-eye"></i> Profile</button>' +
                '<button class="btn btn-action btn-small" data-action="message-student" data-user="' + (s.user_id || '') + '" data-name="' + escapeHtml(s.full_name) + '"><i class="fas fa-envelope"></i> Message</button>' +
            '</td>' +
        '</tr>';
    }).join('');
    
    populateStudentFilters(students);
    updateStudentStats(students.length);
}

function populateStudentFilters(students) {
    var years = [...new Set(students.map(function(s) { return s.intake_year; }).filter(Boolean))].sort().reverse();
    var intakeFilter = $('studentIntakeFilter');
    if (intakeFilter) {
        intakeFilter.innerHTML = '<option value="all">All Intakes</option>' + 
            years.map(function(y) { return '<option value="' + y + '">' + y + '</option>'; }).join('');
    }
}

function updateStudentStats(total) {
    var stats = $('studentStats');
    if (!stats) return;
    var atRisk = state.allStudents.filter(function(s) {
        return (s.cumulative_absences || 0) > 5 || (s.status || '').toLowerCase() === 'probation';
    }).length;
    stats.innerHTML = 'Showing ' + total + ' of ' + state.allStudents.length + ' students | ' + atRisk + ' require attention';
}

function filterStudentTable() {
    var intake = $('studentIntakeFilter')?.value || 'all';
    var status = $('studentStatusFilter')?.value || 'all';
    var risk = $('studentRiskFilter')?.value || 'all';
    var search = $('studentSearch')?.value.toLowerCase() || '';
    
    var rows = document.querySelectorAll('#studentsTableBody tr');
    var visible = 0;
    
    rows.forEach(function(row) {
        if (row.cells.length < 2) return;
        var name = row.cells[0]?.textContent?.toLowerCase() || '';
        var id = row.cells[1]?.textContent?.toLowerCase() || '';
        var intakeVal = row.cells[4]?.textContent || '';
        var statusVal = row.cells[5]?.textContent?.trim() || '';
        var atRisk = row.classList.contains('student-at-risk');
        
        var matchIntake = intake === 'all' || intakeVal === intake;
        var matchStatus = status === 'all' || statusVal === status;
        var matchRisk = risk === 'all' || (risk === 'at-risk' && atRisk);
        var matchSearch = !search || name.includes(search) || id.includes(search);
        
        row.style.display = (matchIntake && matchStatus && matchRisk && matchSearch) ? '' : 'none';
        if (row.style.display !== 'none') visible++;
    });
    
    updateStudentStats(visible);
}

function viewStudentProfile(userId) {
    var student = state.allStudents.find(function(s) { return s.user_id === userId; });
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
    
    var modal = $('studentInfoModal');
    modal.classList.add('active');
}

function closeStudentInfoModal() {
    var modal = $('studentInfoModal');
    if (modal) modal.classList.remove('active');
}

function showSendMessageModal(userId, fullName) {
    var form = $('sendMessageForm');
    if (form) form.reset();
    populateMessageForm();
    
    var target = $('msgTarget');
    if (target) {
        for (var i = 0; i < target.options.length; i++) {
            if (target.options[i].value === userId) {
                target.value = userId;
                break;
            }
        }
    }
    showNotification('Ready to message ' + fullName, 'info');
}

// ============================================================
// 11. SESSIONS
// ============================================================

// ============================================================
// FIXED: populateSessionForm - With Your Actual Blocks
// ============================================================

function populateSessionForm() {
    var program = state.program;
    var programs = program ? [{ id: program, name: program }] : [];
    populateSelect($('sessionProgram'), programs, 'id', 'name', 'Select Program');
    if (program) $('sessionProgram').value = program;
    
    // Get blocks from your actual data
    var blockSelect = $('sessionBlockTerm');
    if (blockSelect) {
        // Fetch actual blocks from units_catalog
        state.sb
            .from(TABLES.UNITS)
            .select('block')
            .eq('status', 'active')
            .order('block')
            .then(function(result) {
                if (!result.error && result.data) {
                    var blocks = [...new Set(result.data.map(function(u) { return u.block; }))];
                    populateSelect(blockSelect, blocks.map(function(b) { return { id: b, name: b }; }), 'id', 'name', 'Select Block/Term');
                }
            });
    }
    
    var courses = state.allCourses.filter(function(c) { return c.target_program === program; });
    populateSelect($('sessionCourseId'), courses, 'id', 'course_name', 'Select Course');
}

// ============================================================
// FIXED: handleAddSession - WITH ADMIN APPROVAL
// ============================================================

async function handleAddSession(e) {
    e.preventDefault();
    var btn = e.submitter || e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Scheduling...';
    
    var data = {
        title: $('sessionTopic').value,
        date: $('sessionDate').value,
        time: $('sessionTime').value,
        program: $('sessionProgram').value,
        block_term: $('sessionBlockTerm').value,
        course_id: $('sessionCourseId').value
    };
    
    if (Object.values(data).some(function(v) { return !v; })) {
        showNotification('Please fill all fields.', 'error');
        btn.disabled = false;
        btn.textContent = 'Schedule Session';
        return;
    }
    
    try {
        var { data: inserted, error: insertError } = await state.sb
            .from(TABLES.SESSIONS)
            .insert({
                session_title: data.title,
                session_date: data.date,
                session_time: data.time,
                target_program: data.program,
                block_term: data.block_term,
                course_id: data.course_id,
                lecturer_id: state.currentUserId,
                approval_status: 'pending',
                created_at: new Date().toISOString()
            })
            .select();
        
        if (insertError) throw insertError;
        
        // ✅ REQUEST ADMIN APPROVAL
        if (typeof requestAdminApproval === 'function') {
            await requestAdminApproval(
                'schedule_session',
                {
                    session_id: inserted[0]?.id,
                    title: data.title,
                    date: data.date,
                    program: data.program,
                    block: data.block_term
                },
                'Scheduled session: ' + data.title,
                inserted[0]?.id
            );
        } else {
            console.warn('⚠️ requestAdminApproval function not found');
        }
        
        showNotification('✅ Session "' + data.title + '" scheduled! Waiting for admin approval.', 'success');
        e.target.reset();
        loadSessionsTable();
        
    } catch (error) {
        showNotification('Failed: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Schedule Session';
    }
}
// ============================================================
// 👨‍🏫 LECTURER ATTENDANCE SYSTEM - FIXED
// Now shows student data from geo_attendance_logs
// ============================================================

function loadAttendance() {
    loadAttendanceSelects();
    loadTodayAttendance();
    loadPastAttendance();
    loadAttendanceMetrics();
}

function loadAttendanceSelects() {
    var students = state.allStudents || [];
    populateSelect($('attStudentId'), students, 'user_id', 'full_name', 'Select Student');
    
    var courses = state.allCourses ? state.allCourses.filter(function(c) { 
        return c.target_program === state.program; 
    }) : [];
    populateSelect($('attCourseId'), courses, 'id', 'course_name', 'Select Course');
    
    var dateInput = $('attDate');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
}

// ============================================
// ✅ FIXED: LOAD TODAY'S ATTENDANCE
// ============================================

async function loadTodayAttendance() {
    var tbody = $('attendanceTable');
    if (!tbody) return;
    
    try {
        var today = new Date();
        var start = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        var end = new Date(today.setHours(23, 59, 59, 999)).toISOString();
        
        // ✅ FIX: Use correct column names without alias issues
        var { data: logs, error } = await state.sb
            .from('geo_attendance_logs')
            .select(`
                *,
                student:student_id (
                    full_name,
                    student_id,
                    program,
                    block,
                    intake_year
                )
            `)
            .gte('check_in_time', start)
            .lte('check_in_time', end)
            .order('check_in_time', { ascending: false });
        
        if (error) {
            console.error('❌ Query error:', error);
            tbody.innerHTML = '<tr><td colspan="12" style="color:#ef4444;">Error: ' + error.message + '</td></tr>';
            return;
        }
        
        if (!logs?.length) {
            tbody.innerHTML = '<tr><td colspan="12" style="text-align:center; padding:30px; color:#9ca3af;">No records today.</td></tr>';
            return;
        }
        
        // ✅ Filter out lecturer check-ins
        var filtered = logs.filter(function(log) {
            return log.student_id && log.session_type !== 'Lecturer Check-in';
        });
        
        if (!filtered.length) {
            tbody.innerHTML = '<tr><td colspan="12" style="text-align:center; padding:30px; color:#9ca3af;">No student records for your program today.</td></tr>';
            return;
        }
        
        tbody.innerHTML = filtered.map(function(log) {
            var student = log.student || {};
            var name = student.full_name || 'Unknown Student';
            var regNo = student.student_id || 'N/A';  // ✅ FIX: Use student_id directly
            var program = student.program || 'N/A';
            var block = student.block || 'N/A';
            var year = student.intake_year || 'N/A';
            var sessionType = log.session_type || 'Class';
            var typeClass = sessionType.toLowerCase();
            var course = log.target_name || log.unit_code || log.clinical_area || 'General';
            var dateTime = log.check_in_time ? formatDateTime(log.check_in_time) : 'N/A';
            var location = log.location_friendly_name || log.location_address || log.location_details || 'N/A';
            var hasLocation = log.latitude && log.longitude;
            var status = log.attendance_status || (log.is_verified ? 'Present' : 'Pending');
            var statusClass = status === 'Present' ? 'status-present' : status === 'Absent' ? 'status-absent' : 'status-pending';
            var distance = log.distance_meters ? (log.distance_meters / 1000).toFixed(2) + 'km' : 'N/A';
            var accuracy = log.accuracy_m ? '±' + log.accuracy_m.toFixed(0) + 'm' : 'N/A';
            
            return '<tr>' +
                '<td>' + escapeHtml(name) + '</td>' +
                '<td>' + escapeHtml(regNo) + '</td>' +
                '<td>' + escapeHtml(program) + '</td>' +
                '<td>' + escapeHtml(block) + '</td>' +
                '<td>' + escapeHtml(year) + '</td>' +
                '<td><span class="session-type-badge type-' + typeClass + '">' + escapeHtml(sessionType) + '</span></td>' +
                '<td>' + escapeHtml(course) + '</td>' +
                '<td>' + dateTime + '</td>' +
                '<td>' + escapeHtml(location) + '</td>' +
                '<td>' + escapeHtml(distance) + '</td>' +
                '<td><span class="' + statusClass + '">' + escapeHtml(status) + '</span></td>' +
                '<td>' +
                    '<button class="btn btn-action btn-small" ' + (!hasLocation ? 'disabled' : '') +
                    ' data-action="view-map" data-lat="' + (log.latitude || 0) + '" data-lng="' + (log.longitude || 0) + '" data-name="' + escapeHtml(name) + '">' +
                    (hasLocation ? '📍 Map' : 'No Location') +
                    '</button>' +
                '</td>' +
            '</tr>';
        }).join('');
        
        var countEl = $('filteredCount');
        if (countEl) countEl.textContent = filtered.length;
        
    } catch (error) {
        console.error('Error loading today\'s attendance:', error);
        tbody.innerHTML = '<tr><td colspan="12" style="color:#ef4444;">Error: ' + error.message + '</td></tr>';
    }
}

// ============================================
// ✅ FIXED: LOAD PAST ATTENDANCE
// ============================================

async function loadPastAttendance() {
    var tbody = $('pastAttendanceTable');
    if (!tbody) return;
    
    try {
        var { data: records, error } = await state.sb
            .from('geo_attendance_logs')
            .select(`
                *,
                student:student_id (
                    full_name,
                    student_id,
                    program,
                    block,
                    intake_year
                )
            `)
            .order('check_in_time', { ascending: false })
            .limit(100);
        
        if (error) {
            console.error('❌ Query error:', error);
            tbody.innerHTML = '<tr><td colspan="11" style="color:#ef4444;">Error: ' + error.message + '</td></tr>';
            return;
        }
        
        if (!records?.length) {
            tbody.innerHTML = '<tr><td colspan="11" style="text-align:center; padding:30px; color:#9ca3af;">No records found.</td></tr>';
            return;
        }
        
        var filtered = records.filter(function(log) {
            return log.student_id && log.session_type !== 'Lecturer Check-in';
        });
        
        if (!filtered.length) {
            tbody.innerHTML = '<tr><td colspan="11" style="text-align:center; padding:30px; color:#9ca3af;">No student records found.</td></tr>';
            return;
        }
        
        tbody.innerHTML = filtered.map(function(log) {
            var student = log.student || {};
            var name = student.full_name || 'Unknown Student';
            var regNo = student.student_id || 'N/A';  // ✅ FIX: Use student_id directly
            var program = student.program || 'N/A';
            var block = student.block || 'N/A';
            var sessionType = log.session_type || 'Class';
            var typeClass = sessionType.toLowerCase();
            var course = log.target_name || log.unit_code || log.clinical_area || 'General';
            var status = log.attendance_status || (log.is_verified ? 'Present' : 'Pending');
            var statusClass = status === 'Present' ? 'status-present' : status === 'Absent' ? 'status-absent' : 'status-pending';
            var dt = log.check_in_time ? new Date(log.check_in_time) : new Date();
            var location = log.location_friendly_name || log.location_address || 'N/A';
            var recordedBy = log.student_name || 'Student';
            
            return '<tr>' +
                '<td>' + dt.toLocaleDateString('en-GB') + '</td>' +
                '<td>' + escapeHtml(name) + '</td>' +
                '<td>' + escapeHtml(regNo) + '</td>' +
                '<td>' + escapeHtml(program) + '</td>' +
                '<td>' + escapeHtml(block) + '</td>' +
                '<td><span class="session-type-badge type-' + typeClass + '">' + escapeHtml(sessionType) + '</span></td>' +
                '<td>' + escapeHtml(course) + '</td>' +
                '<td>' + dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + '</td>' +
                '<td>' + escapeHtml(location) + '</td>' +
                '<td><span class="' + statusClass + '">' + escapeHtml(status) + '</span></td>' +
                '<td>' + escapeHtml(recordedBy) + '</td>' +
            '</tr>';
        }).join('');
        
        var countEl = $('pastAttendanceCount');
        if (countEl) countEl.textContent = filtered.length;
        
    } catch (error) {
        console.error('Error loading past attendance:', error);
        tbody.innerHTML = '<tr><td colspan="11" style="color:#ef4444;">Error: ' + error.message + '</td></tr>';
    }
}

// ============================================
// FILTER FUNCTIONS (Updated)
// ============================================

function filterTodayAttendance() {
    var search = $('attendanceSearch')?.value.toLowerCase() || '';
    var rows = document.querySelectorAll('#attendanceTable tr');
    var visible = 0;
    rows.forEach(function(row) {
        if (row.cells.length < 8) return;
        var text = row.textContent.toLowerCase();
        var show = !search || text.includes(search);
        row.style.display = show ? '' : 'none';
        if (show) visible++;
    });
    var countEl = $('todaysAttendanceCount');
    if (countEl) countEl.textContent = visible;
}

function filterPastAttendance() {
    var dateFilter = $('pastAttendanceDateFilter')?.value;
    var typeFilter = $('pastAttendanceTypeFilter')?.value;
    var searchFilter = $('pastAttendanceSearch')?.value.toLowerCase() || '';
    
    var rows = document.querySelectorAll('#pastAttendanceTable tr');
    var visible = 0;
    
    rows.forEach(function(row) {
        if (row.cells.length < 9) return;
        var date = row.cells[0]?.textContent || '';
        var name = row.cells[1]?.textContent?.toLowerCase() || '';
        var regNo = row.cells[2]?.textContent?.toLowerCase() || '';
        var type = row.cells[3]?.textContent?.toLowerCase() || '';
        
        var matchDate = !dateFilter || date === new Date(dateFilter).toLocaleDateString('en-GB');
        var matchType = typeFilter === 'all' || type.includes(typeFilter.toLowerCase());
        var matchSearch = !searchFilter || name.includes(searchFilter) || regNo.includes(searchFilter);
        
        var show = matchDate && matchType && matchSearch;
        row.style.display = show ? '' : 'none';
        if (show) visible++;
    });
    
    var countEl = $('pastAttendanceCount');
    if (countEl) countEl.textContent = visible;
}

// ============================================
// LECTURER CHECK-IN (Kept as is)
// ============================================

async function lecturerCheckIn() {
    var btn = $('lecturerCheckinBtn');
    btn.disabled = true;
    btn.textContent = 'Marking...';
    
    if (!navigator.geolocation) {
        showNotification('Geolocation not supported.', 'error');
        btn.disabled = false;
        btn.textContent = 'Mark My Attendance';
        return;
    }
    
    navigator.geolocation.getCurrentPosition(async function(pos) {
        try {
            // ✅ Store in geo_attendance_logs (same as students)
            await state.sb.from('geo_attendance_logs').insert({
                student_id: state.currentUserId,
                check_in_time: new Date().toISOString(),
                session_type: 'Lecturer Check-in',
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy_m: pos.coords.accuracy || null,
                attendance_status: 'Present',
                is_verified: true,
                target_name: 'Lecturer Check-in',
                location_address: 'Lecturer Check-in',
                student_name: state.currentUser.full_name
            });
            showNotification('✅ Lecturer check-in logged!', 'success');
            loadTodayAttendance();
        } catch (e) {
            showNotification('Check-in failed: ' + e.message, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Mark My Attendance';
        }
    }, function(e) {
        showNotification('Geolocation error: ' + e.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Mark My Attendance';
    });
}

// ============================================
// MANUAL STUDENT ATTENDANCE ENTRY
// ============================================

async function handleManualAttendance(e) {
    e.preventDefault();
    var btn = e.submitter || e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Marking...';
    
    var studentId = $('attStudentId').value;
    var sessionType = $('attSessionType').value;
    var courseId = $('attCourseId').value;
    var location = $('attLocation').value;
    var date = $('attDate').value;
    var time = $('attTime').value;
    
    if (!studentId || !sessionType || !date) {
        showNotification('Student, Session Type, and Date required.', 'error');
        btn.disabled = false;
        btn.textContent = 'Mark Student Present';
        return;
    }
    
    var student = state.allStudents.find(function(s) { return s.user_id === studentId; });
    if (!student) {
        showNotification('Student not found.', 'error');
        btn.disabled = false;
        btn.textContent = 'Mark Student Present';
        return;
    }
    
    // Get course name
    var course = state.allCourses.find(function(c) { return c.id === courseId; });
    var courseName = course ? course.course_name : 'General';
    
    try {
        // ✅ Store in geo_attendance_logs (same as student check-ins)
        await state.sb.from('geo_attendance_logs').insert({
            student_id: studentId,
            check_in_time: date + 'T' + (time || '12:00') + ':00.000Z',
            session_type: sessionType,
            target_id: courseId || null,
            target_name: courseName,
            attendance_status: 'Present',
            is_verified: true,
            location_address: 'MANUAL: ' + (location || 'N/A') + ' (By ' + state.currentUser.full_name + ')',
            student_name: student.full_name,
            unit_code: courseId || null,
            clinical_area: sessionType === 'Clinical' ? courseName : null
        });
        showNotification('✅ ' + student.full_name + ' marked present!', 'success');
        e.target.reset();
        loadTodayAttendance();
        loadPastAttendance();
    } catch (error) {
        showNotification('Failed: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Mark Student Present';
    }
}

// ============================================
// MAP VIEW
// ============================================

function viewCheckInMap(lat, lng, name) {
    if (!lat || !lng) {
        showNotification('No location data.', 'info');
        return;
    }
    
    var modal = $('mapModal');
    modal.classList.add('active');
    
    if (state.attendanceMap) state.attendanceMap.remove();
    
    $('mapDetails').textContent = 'Location for ' + name;
    
    state.attendanceMap = L.map('mapbox-map').setView([parseFloat(lat), parseFloat(lng)], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
    }).addTo(state.attendanceMap);
    
    L.marker([parseFloat(lat), parseFloat(lng)])
        .addTo(state.attendanceMap)
        .bindPopup('<b>' + name + '</b>')
        .openPopup();
    
    setTimeout(function() { state.attendanceMap.invalidateSize(); }, 300);
}

function closeMapModal() {
    var modal = $('mapModal');
    if (modal) modal.classList.remove('active');
}

// ============================================================
// 13. EXAMS / CATS
// ============================================================

function populateExamForm() {
    var program = state.program;
    var programs = program ? [{ id: program, name: program }] : [];
    populateSelect($('examProgram'), programs, 'id', 'name', 'Select Program');
    if (program) $('examProgram').value = program;
    
    var blocks = getAcademicBlocks(program);
    var blockSelect = $('examBlockTerm');
    if (blocks.length) {
        populateSelect(blockSelect, blocks.map(function(b) { return { id: b, name: b }; }), 'id', 'name', 'Select Block/Term');
    }
    
    var courses = state.allCourses.filter(function(c) { return c.target_program === program; });
    populateSelect($('examCourseId'), courses, 'id', 'course_name', 'Select Course (Optional)');
}

function loadExamsTable() {
    var tbody = $('examsTable');
    if (!tbody) return;
    
    var exams = state.allExams;
    
    if (!exams.length) {
        tbody.innerHTML = '<tr><td colspan="8">No exams found.</td></tr>';
        return;
    }
    
    tbody.innerHTML = exams.map(function(e) {
        var course = e.course?.course_name || 'General';
        var dateTime = e.exam_date ? formatDate(e.exam_date) + (e.exam_start_time ? ' ' + e.exam_start_time : '') : 'N/A';
        var statusClass = (e.status || 'Scheduled').toLowerCase();
        
        var approvalBadge = '';
        var approvalStatus = e.approval_status || 'draft';
        if (approvalStatus === 'draft') {
            approvalBadge = ' <span class="badge badge-warning">📝 Draft</span>';
        } else if (approvalStatus === 'published') {
            approvalBadge = ' <span class="badge badge-success">📢 Published</span>';
        } else if (approvalStatus === 'rejected') {
            approvalBadge = ' <span class="badge badge-danger">❌ Rejected</span>';
        }
        
        // ✅ CHECK: Is this exam created by THIS lecturer?
        var isOwner = e.created_by === state.currentUserId;
        var isPublished = approvalStatus === 'published' || e.status === 'Published' || e.status === 'Completed';
        
        // Build action buttons based on ownership and status
        var actionsHtml = '';
        
        if (isOwner) {
            // OWNER can edit/delete only if still in draft
            if (approvalStatus === 'draft' || e.status === 'Draft') {
                actionsHtml += '<button class="btn btn-action btn-small" data-action="edit-exam" data-exam="' + (e.id || '') + '"><i class="fas fa-edit"></i></button>';
                actionsHtml += '<button class="btn btn-delete btn-small" data-action="delete-exam" data-exam="' + (e.id || '') + '"><i class="fas fa-trash"></i></button>';
            }
            
            // Owner can grade if published
            if (isPublished) {
                actionsHtml += '<button class="btn btn-action btn-small" data-action="grade-exam" data-exam="' + (e.id || '') + '" style="background:#10b981;"><i class="fas fa-check-circle"></i></button>';
            }
        } else {
            // NOT OWNER - View only (can grade if published by admin)
            if (isPublished) {
                actionsHtml += '<button class="btn btn-action btn-small" data-action="grade-exam" data-exam="' + (e.id || '') + '" style="background:#10b981;"><i class="fas fa-check-circle"></i></button>';
            }
            actionsHtml += '<button class="btn btn-action btn-small" data-action="view-exam" data-exam="' + (e.id || '') + '" style="background:#3b82f6;"><i class="fas fa-eye"></i></button>';
        }
        
        // Exam link if available (view only)
        if (e.online_link || e.exam_link) {
            var link = e.online_link || e.exam_link;
            actionsHtml += '<a href="' + escapeHtml(link) + '" target="_blank" class="btn btn-map btn-small" style="padding: 4px 10px; font-size: 11px;"><i class="fas fa-external-link-alt"></i></a>';
        }
        
        return '<tr>' +
            '<td><span class="exam-type-badge">' + escapeHtml(e.exam_type || 'N/A') + '</span></td>' +
            '<td><strong>' + escapeHtml(e.exam_name || 'N/A') + '</strong>' + approvalBadge + '</td>' +
            '<td>' + escapeHtml(course) + '</td>' +
            '<td>' + escapeHtml(e.target_program || 'N/A') + '/' + escapeHtml(e.block_term || 'N/A') + '</td>' +
            '<td>' + dateTime + '</td>' +
            '<td>' + (e.duration_minutes ? e.duration_minutes + ' mins' : 'N/A') + '</td>' +
            '<td><span class="status-' + statusClass + '">' + escapeHtml(e.status || 'Scheduled') + '</span></td>' +
            '<td>' + actionsHtml + '</td>' +
        '</tr>';
    }).join('');
}
// ============================================================
// FIXED: handleAddExam - WITH ADMIN APPROVAL
// ============================================================

async function handleAddExam(e) {
    e.preventDefault();
    var btn = e.submitter || e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Creating...';
    
    var data = {
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
    
    var required = ['title', 'date', 'type', 'program', 'intake', 'block_term', 'duration'];
    if (required.some(function(f) { return !data[f]; })) {
        showNotification('Please fill all required fields.', 'error');
        btn.disabled = false;
        btn.textContent = 'Create Exam Record';
        return;
    }
    
    try {
        var { data: inserted, error: insertError } = await state.sb
            .from(TABLES.EXAMS)
            .insert({
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
                approval_status: 'draft',
                created_by: state.currentUserId,
                created_at: new Date().toISOString()
            })
            .select();
        
        if (insertError) throw insertError;
        
        // ✅ REQUEST ADMIN APPROVAL
        if (typeof requestAdminApproval === 'function') {
            await requestAdminApproval(
                'create_exam',
                {
                    exam_id: inserted[0]?.id,
                    title: data.title,
                    type: data.type,
                    program: data.program,
                    block: data.block_term,
                    intake: data.intake
                },
                'Created exam: ' + data.title,
                inserted[0]?.id
            );
        } else {
            console.warn('⚠️ requestAdminApproval function not found');
        }
        
        showNotification('✅ ' + data.type + ' "' + data.title + '" created! Waiting for admin approval.', 'success');
        e.target.reset();
        if (state.program) $('examProgram').value = state.program;
        loadExamsTable();
        
    } catch (error) {
        showNotification('Failed: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Create Exam Record';
    }
}
async function deleteExam(examId) {
    var exam = state.allExams.find(function(e) { return e.id === examId; });
    if (!confirm('Delete "' + (exam?.exam_name || 'Exam') + '"?')) return;
    
    try {
        await state.sb
            .from(TABLES.EXAMS)
            .delete()
            .eq('id', examId);
        showNotification('✅ Exam deleted!', 'success');
        loadExamsTable();
    } catch (error) {
        showNotification('Delete failed: ' + error.message, 'error');
    }
}

async function openEditExamModal(examId) {
    try {
        var { data: exam, error } = await state.sb
            .from(TABLES.EXAMS)
            .select('*')
            .eq('id', examId)
            .single();
        
        if (error || !exam) {
            showNotification('Exam not found.', 'error');
            return;
        }
        
        $('editExamId').value = exam.id;
        $('editExamTitle').value = exam.exam_name || '';
        $('editExamDate').value = exam.exam_date || '';
        $('editExamStatus').value = exam.status || 'Scheduled';
        
        var modal = $('examEditModal');
        modal.classList.add('active');
        
    } catch (error) {
        showNotification('Failed: ' + error.message, 'error');
    }
}

function closeEditExamModal() {
    var modal = $('examEditModal');
    if (modal) modal.classList.remove('active');
}

async function saveEditedExam(e) {
    e.preventDefault();
    var btn = e.submitter || e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Saving...';
    
    var id = $('editExamId').value;
    var title = $('editExamTitle').value;
    var date = $('editExamDate').value;
    var status = $('editExamStatus').value;
    
    if (!title || !date) {
        showNotification('Title and date required.', 'error');
        btn.disabled = false;
        btn.textContent = 'Save Changes';
        return;
    }
    
    try {
        await state.sb
            .from(TABLES.EXAMS)
            .update({ exam_name: title, exam_date: date, status: status })
            .eq('id', id);
        
        showNotification('✅ Exam updated!', 'success');
        closeEditExamModal();
        loadExamsTable();
    } catch (error) {
        showNotification('Failed: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save Changes';
    }
}

// ============================================================
// 14. MARKS MANAGEMENT
// ============================================================

function loadMarksManagement() {
    var blockSelect = $('lecBlockSelect');
    if (!blockSelect) return;
    
    // Fetch actual blocks from units_catalog
    state.sb
        .from(TABLES.UNITS)
        .select('block')
        .eq('status', 'active')
        .order('block')
        .then(function(result) {
            if (!result.error && result.data) {
                var blocks = [...new Set(result.data.map(function(u) { return u.block; }))];
                var currentValue = blockSelect.value;
                blockSelect.innerHTML = '<option value="">-- Select Block --</option>';
                blocks.forEach(function(block) {
                    var option = document.createElement('option');
                    option.value = block;
                    option.textContent = block;
                    blockSelect.appendChild(option);
                });
                if (currentValue) blockSelect.value = currentValue;
                
                // Load subjects if block is selected
                if (blockSelect.value) {
                    loadLecturerSubjects();
                    loadLecturerInternalMarks();
                }
            }
        });
    
    loadLecturerNCKMarks();
}
// ============================================================
// FIXED: loadLecturerSubjects - Works with Your Actual Data
// ============================================================

async function loadLecturerSubjects() {
    var block = $('lecBlockSelect')?.value;
    var subjectSelect = $('lecSubjectSelect');
    
    if (!subjectSelect) {
        console.warn('⚠️ lecSubjectSelect not found');
        return;
    }
    
    if (!block) {
        subjectSelect.innerHTML = '<option value="">-- Select Block First --</option>';
        return;
    }
    
    console.log('📚 Loading subjects for block:', block);
    console.log('📚 Program filter:', state.program);
    
    try {
        // Build query - don't filter by program if program is null
        var query = state.sb
            .from(TABLES.UNITS)
            .select('*')
            .eq('status', 'active');
        
        // Try different block matching strategies
        // Strategy 1: Exact match
        var { data: units, error } = await query.eq('block', block).order('unit_name', { ascending: true });
        
        // If no results, try Strategy 2: Case-insensitive match
        if (!units || units.length === 0) {
            console.log('⚠️ No exact match, trying case-insensitive...');
            var { data: allUnits, error: allError } = await state.sb
                .from(TABLES.UNITS)
                .select('*')
                .eq('status', 'active')
                .order('unit_name', { ascending: true });
            
            if (!allError && allUnits) {
                units = allUnits.filter(function(u) {
                    return u.block && u.block.toLowerCase() === block.toLowerCase();
                });
            }
        }
        
        // If still no results, try Strategy 3: Contains match
        if (!units || units.length === 0) {
            console.log('⚠️ No case-insensitive match, trying contains...');
            var { data: allUnits, error: allError } = await state.sb
                .from(TABLES.UNITS)
                .select('*')
                .eq('status', 'active')
                .order('unit_name', { ascending: true });
            
            if (!allError && allUnits) {
                units = allUnits.filter(function(u) {
                    return u.block && u.block.toLowerCase().includes(block.toLowerCase());
                });
            }
        }
        
        if (error) {
            console.error('❌ Error loading units:', error);
            subjectSelect.innerHTML = '<option value="">Error loading subjects</option>';
            return;
        }
        
        console.log('✅ Loaded', units?.length || 0, 'subjects');
        
        if (!units || units.length === 0) {
            subjectSelect.innerHTML = '<option value="">No subjects found for ' + block + '</option>';
            return;
        }
        
        // Populate dropdown
        subjectSelect.innerHTML = '<option value="">-- Select Subject --</option>';
        units.forEach(function(u) {
            var option = document.createElement('option');
            option.value = u.unit_name;
            var displayText = u.unit_name;
            if (u.unit_code) displayText += ' (' + u.unit_code + ')';
            if (u.credits) displayText += ' - ' + u.credits + ' cr';
            option.textContent = displayText;
            subjectSelect.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error in loadLecturerSubjects:', error);
        subjectSelect.innerHTML = '<option value="">Error loading subjects</option>';
    }
}
// ============================================================
// FIXED: loadLecturerInternalMarks - With Student Names
// ============================================================

async function loadLecturerInternalMarks() {
    var block = $('lecBlockSelect')?.value;
    var subject = $('lecSubjectSelect')?.value;
    var container = $('lecInternalContainer');
    
    if (!container) return;
    
    if (!block || !subject) {
        container.innerHTML = '<div class="text-center" style="padding:40px;">Select a block and subject</div>';
        return;
    }
    
    console.log('📊 Loading internal marks for:', { block, subject });
    
    container.innerHTML = '<div class="text-center" style="padding:40px;"><div class="loading-spinner"></div><p>Loading marks...</p></div>';
    
    try {
        // Get students in this block
        var students = state.allStudents.filter(function(s) { 
            return s.block === block && s.program === state.program;
        });
        
        console.log('👥 Students found:', students.length);
        
        if (!students || students.length === 0) {
            container.innerHTML = '<div class="text-center" style="padding:40px;">No students found in this block</div>';
            return;
        }
        
        state.currentLecturerStudents = students;
        
        // Get existing marks
        var { data: existing, error } = await state.sb
            .from(TABLES.MARKS)
            .select('*')
            .eq('block', block)
            .eq('subject_name', subject);
        
        if (error) {
            console.warn('⚠️ Error loading existing marks:', error);
            existing = [];
        }
        
        var marksMap = {};
        existing?.forEach(function(m) { 
            marksMap[m.admission_number] = m; 
        });
        
        // Build HTML table
        var html = '<div class="table-responsive"><table class="data-table" style="width:100%;border-collapse:collapse;">' +
            '<thead><tr style="background:#4C1D95;color:white;">' +
                '<th style="padding:10px;">Admission</th>' +
                '<th style="padding:10px;">Student Name</th>' +
                '<th style="padding:10px;">CAT1 (0-30)</th>' +
                '<th style="padding:10px;">CAT2 (0-30)</th>' +
                '<th style="padding:10px;">Exam (0-70)</th>' +
                '<th style="padding:10px;">Total</th>' +
                '<th style="padding:10px;">Grade</th>' +
                '<th style="padding:10px;">Status</th>' +
            '</tr></thead><tbody>';
        
        for (var i = 0; i < students.length; i++) {
            var s = students[i];
            var m = marksMap[s.student_id] || {};
            var cat1 = m.cat1_score !== undefined && m.cat1_score !== null ? m.cat1_score : '';
            var cat2 = m.cat2_score !== undefined && m.cat2_score !== null ? m.cat2_score : '';
            var exam = m.exam_score !== undefined && m.exam_score !== null ? m.exam_score : '';
            var total = 0, grade = '-', status = 'PENDING', color = '#f59e0b';
            
            if (cat1 !== '' || cat2 !== '' || exam !== '') {
                var ncat1 = Math.min(parseFloat(cat1) || 0, 30);
                var ncat2 = Math.min(parseFloat(cat2) || 0, 30);
                var nexam = Math.min(parseFloat(exam) || 0, 70);
                total = ((ncat1 + ncat2) / 60 * 30) + nexam;
                total = Math.round(total * 10) / 10;
                grade = calculateGrade(total);
                status = total >= 60 ? 'PASS' : (total > 0 ? 'FAIL' : 'PENDING');
                color = status === 'PASS' ? '#10b981' : (status === 'FAIL' ? '#ef4444' : '#f59e0b');
            }
            
            html += '<tr>' +
                '<td>' + escapeHtml(s.student_id) + '</td>' +
                '<td><strong>' + escapeHtml(s.full_name) + '</strong></td>' +
                '<td><input type="number" class="internal-cat1" data-student="' + s.student_id + '" value="' + cat1 + '" min="0" max="30" step="0.5" style="width:70px;padding:5px;"></td>' +
                '<td><input type="number" class="internal-cat2" data-student="' + s.student_id + '" value="' + cat2 + '" min="0" max="30" step="0.5" style="width:70px;padding:5px;"></td>' +
                '<td><input type="number" class="internal-exam" data-student="' + s.student_id + '" value="' + exam + '" min="0" max="70" step="0.5" style="width:70px;padding:5px;"></td>' +
                '<td id="lecTotal_' + s.student_id + '" style="font-weight:bold;color:' + color + ';">' + (total || '-') + '</td>' +
                '<td id="lecGrade_' + s.student_id + '">' + grade + '</td>' +
                '<td id="lecStatus_' + s.student_id + '" style="color:' + color + ';">' + status + '</td>' +
            '</tr>';
        }
        
        html += '</tbody></table></div>' +
            '<div style="text-align:center;margin-top:20px;">' +
                '<button class="btn btn-action" id="saveInternalMarksBtn" style="background:#059669;"><i class="fas fa-save"></i> Save All Marks</button>' +
                '<button class="btn btn-action" id="fillDownInternalBtn" style="background:#3b82f6;margin-left:10px;"><i class="fas fa-arrow-down"></i> Fill Down</button>' +
            '</div>';
        
        container.innerHTML = html;
        $('lecTotalStudents').textContent = students.length;
        
        // Attach event listeners
        document.querySelectorAll('.internal-cat1, .internal-cat2, .internal-exam').forEach(function(input) {
            input.addEventListener('change', function() {
                var studentId = this.dataset.student;
                updateLecturerInternalTotal(studentId);
            });
        });
        
        document.getElementById('saveInternalMarksBtn')?.addEventListener('click', saveLecturerInternalMarks);
        document.getElementById('fillDownInternalBtn')?.addEventListener('click', fillDownInternalMarks);
        
    } catch (error) {
        console.error('Error loading marks:', error);
        container.innerHTML = '<div class="alert alert-danger">Error: ' + error.message + '</div>';
    }
}
function updateLecturerInternalTotal(studentId) {
    var cat1 = parseFloat(document.querySelector('.internal-cat1[data-student="' + studentId + '"]').value) || 0;
    var cat2 = parseFloat(document.querySelector('.internal-cat2[data-student="' + studentId + '"]').value) || 0;
    var exam = parseFloat(document.querySelector('.internal-exam[data-student="' + studentId + '"]').value) || 0;
    
    var ncat1 = Math.min(cat1, 30);
    var ncat2 = Math.min(cat2, 30);
    var nexam = Math.min(exam, 70);
    var total = Math.round((((ncat1 + ncat2) / 60 * 30) + nexam) * 10) / 10;
    var grade = calculateGrade(total);
    var status = total >= 60 ? 'PASS' : (total > 0 ? 'FAIL' : 'PENDING');
    var color = status === 'PASS' ? '#10b981' : (status === 'FAIL' ? '#ef4444' : '#f59e0b');
    
    var totalSpan = document.getElementById('lecTotal_' + studentId);
    var gradeSpan = document.getElementById('lecGrade_' + studentId);
    var statusSpan = document.getElementById('lecStatus_' + studentId);
    
    if (totalSpan) { totalSpan.innerHTML = total || '-'; totalSpan.style.color = color; }
    if (gradeSpan) gradeSpan.innerHTML = grade;
    if (statusSpan) { statusSpan.innerHTML = status; statusSpan.style.color = color; }
}

function fillDownInternalMarks() {
    var cat1s = document.querySelectorAll('.internal-cat1');
    if (!cat1s.length) return;
    
    var v1 = cat1s[0].value;
    var v2 = document.querySelector('.internal-cat2')?.value || '';
    var v3 = document.querySelector('.internal-exam')?.value || '';
    
    for (var i = 1; i < cat1s.length; i++) {
        var sId = cat1s[i].getAttribute('data-student');
        var cat1Input = document.querySelector('.internal-cat1[data-student="' + sId + '"]');
        var cat2Input = document.querySelector('.internal-cat2[data-student="' + sId + '"]');
        var examInput = document.querySelector('.internal-exam[data-student="' + sId + '"]');
        
        if (cat1Input) cat1Input.value = v1;
        if (cat2Input) cat2Input.value = v2;
        if (examInput) examInput.value = v3;
        updateLecturerInternalTotal(sId);
    }
    showNotification('Values filled down!', 'success');
}

// ============================================================
// FIXED: saveLecturerInternalMarks - WITH ADMIN APPROVAL
// ============================================================
// ============================================================
// FIXED: saveLecturerInternalMarks - Matches Your Exact Schema
// ============================================================

async function saveLecturerInternalMarks() {
    var block = $('lecBlockSelect').value;
    var subject = $('lecSubjectSelect').value;
    
    if (!block || !subject) {
        showNotification('Select block and subject', 'error');
        return;
    }
    
    var inputs = document.querySelectorAll('.internal-cat1');
    if (!inputs.length) {
        showNotification('No data to save', 'error');
        return;
    }
    
    showLoading('Saving marks...');
    var saved = 0;
    
    for (var i = 0; i < inputs.length; i++) {
        var sId = inputs[i].getAttribute('data-student');
        var cat1 = parseFloat(document.querySelector('.internal-cat1[data-student="' + sId + '"]').value) || 0;
        var cat2 = parseFloat(document.querySelector('.internal-cat2[data-student="' + sId + '"]').value) || 0;
        var exam = parseFloat(document.querySelector('.internal-exam[data-student="' + sId + '"]').value) || 0;
        
        // Find student name
        var student = state.allStudents.find(function(s) { return s.student_id === sId; });
        var studentName = student?.full_name || 'Unknown Student';
        
        var ncat1 = Math.min(cat1, 30);
        var ncat2 = Math.min(cat2, 30);
        var nexam = Math.min(exam, 70);
        var finalTotal = Math.round((((ncat1 + ncat2) / 60 * 30) + nexam) * 10) / 10;
        var grade = calculateGrade(finalTotal);
        
        // ✅ MATCH YOUR EXACT TABLE SCHEMA
        var markData = {
            admission_number: sId,          // Required (NOT NULL)
            student_name: studentName,       // Required (NOT NULL)
            block: block,                    // Required (NOT NULL)
            subject_name: subject,           // Required (NOT NULL)
            cat1_score: cat1 || null,
            cat2_score: cat2 || null,
            exam_score: exam || null,
            final_score: finalTotal || null,
            grade: grade || null,
            graded_by: state.currentUser?.full_name || 'Lecturer',
            academic_year: '2026',
            assessment_type: 'full',
            published: false,
            approval_status: 'draft',
            updated_at: new Date().toISOString(),
            created_at: new Date().toISOString()
        };
        
        console.log('📊 Saving mark for:', sId, markData);
        
        try {
            // Try upsert first
            var { error } = await state.sb
                .from(TABLES.MARKS)
                .upsert(markData, { 
                    onConflict: 'admission_number,subject_name,block' 
                });
            
            if (error) {
                console.error('❌ Error saving for', sId, ':', error);
                // If upsert fails, try insert
                if (error.code === '23505' || error.message.includes('duplicate')) {
                    // Update existing
                    var { error: updateError } = await state.sb
                        .from(TABLES.MARKS)
                        .update({
                            cat1_score: cat1 || null,
                            cat2_score: cat2 || null,
                            exam_score: exam || null,
                            final_score: finalTotal || null,
                            grade: grade || null,
                            graded_by: state.currentUser?.full_name || 'Lecturer',
                            updated_at: new Date().toISOString()
                        })
                        .eq('admission_number', sId)
                        .eq('subject_name', subject)
                        .eq('block', block);
                    
                    if (!updateError) saved++;
                } else {
                    // Try insert without onConflict
                    var { error: insertError } = await state.sb
                        .from(TABLES.MARKS)
                        .insert(markData);
                    if (!insertError) saved++;
                }
            } else {
                saved++;
            }
        } catch (err) {
            console.error('❌ Catch error for', sId, ':', err);
        }
    }
    
    // ✅ Request admin approval if marks were saved
    if (saved > 0 && typeof requestAdminApproval === 'function') {
        await requestAdminApproval(
            'save_marks',
            {
                block: block,
                subject: subject,
                marks_count: saved
            },
            'Saved ' + saved + ' internal marks for ' + subject + ' (' + block + ')',
            block
        );
    }
    
    hideLoading();
    showNotification('Saved ' + saved + ' marks! Waiting for admin approval.', 'success');
    loadLecturerInternalMarks();
}

// ============================================================
// 15. NCK MARKS
// ============================================================

async function loadLecturerNCKMarks() {
    var block = $('lecNckBlock').value;
    var sheet = $('lecNckSheet').value;
    var container = $('lecNckContainer');
    
    if (!block) {
        container.innerHTML = '<div class="text-center" style="padding:40px;">Select a block</div>';
        return;
    }
    
    container.innerHTML = '<div class="text-center" style="padding:40px;"><div class="loading-spinner"></div><p>Loading NCK marks...</p></div>';
    
    try {
        var students = state.allStudents.filter(function(s) { return s.block === block; });
        
        if (!students.length) {
            container.innerHTML = '<div class="text-center" style="padding:40px;">No students found</div>';
            return;
        }
        
        var { data: existing, error } = await state.sb
            .from(TABLES.NCK)
            .select('*')
            .eq('block', block)
            .eq('subject_name', sheet);
        
        if (error) throw error;
        
        var marksMap = {};
        existing?.forEach(function(m) { marksMap[m.admission_number] = m; });
        
        var html = '<table class="data-table" style="width:100%;border-collapse:collapse;">' +
            '<thead><tr style="background:#4C1D95;color:white;">' +
                '<th style="padding:10px;">#</th>' +
                '<th style="padding:10px;">Student Name</th>' +
                '<th style="padding:10px;">Admission</th>' +
                '<th style="padding:10px;">Score (%)</th>' +
                '<th style="padding:10px;">Grade</th>' +
                '<th style="padding:10px;">Status</th>' +
                '<th style="padding:10px;">Graded By</th>' +
                '<th style="padding:10px;">Actions</th>' +
            '</tr></thead><tbody>';
        
        for (var i = 0; i < students.length; i++) {
            var s = students[i];
            var m = marksMap[s.student_id] || {};
            var score = m.final_score !== undefined ? m.final_score : '';
            var grade = score !== '' ? calculateGrade(parseFloat(score)) : '-';
            var status = score !== '' ? (parseFloat(score) >= 60 ? 'PASS' : (parseFloat(score) > 0 ? 'FAIL' : 'PENDING')) : 'PENDING';
            var color = status === 'PASS' ? '#10b981' : (status === 'FAIL' ? '#ef4444' : '#f59e0b');
            
            html += '<tr>' +
                '<td>' + (i + 1) + '</td>' +
                '<td><strong>' + escapeHtml(s.full_name) + '</strong></td>' +
                '<td>' + escapeHtml(s.student_id) + '</td>' +
                '<td><input type="number" class="nck-score" data-index="' + i + '" value="' + score + '" min="0" max="100" step="0.5" style="width:80px;padding:5px;"></td>' +
                '<td id="nckGrade_' + i + '" style="color:' + color + ';">' + grade + '</td>' +
                '<td id="nckStatus_' + i + '" style="color:' + color + ';">' + status + '</td>' +
                '<td><input type="text" class="nck-graded" data-index="' + i + '" value="' + (m.graded_by || '') + '" placeholder="Lecturer" style="width:120px;padding:5px;"></td>' +
                '<td><button class="btn btn-action btn-small save-nck" data-index="' + i + '" data-student="' + s.student_id + '" style="background:#059669;"><i class="fas fa-save"></i> Save</button></td>' +
            '</tr>';
        }
        
        html += '</tbody></table>' +
            '<div style="text-align:center;margin-top:20px;">' +
                '<button class="btn btn-action" id="saveAllNckMarksBtn" style="background:#059669;"><i class="fas fa-save"></i> Save All NCK Marks</button>' +
                '<button class="btn btn-action" id="fillDownNckBtn" style="background:#3b82f6;margin-left:10px;"><i class="fas fa-arrow-down"></i> Fill Down</button>' +
            '</div>';
        
        container.innerHTML = html;
        
        document.querySelectorAll('.nck-score').forEach(function(input) {
            input.addEventListener('change', function() {
                var idx = parseInt(this.dataset.index);
                updateLecturerNCKTotal(idx);
            });
        });
        
        document.querySelectorAll('.save-nck').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var idx = parseInt(this.dataset.index);
                var studentId = this.dataset.student;
                saveSingleLecturerNCK(idx, studentId);
            });
        });
        
        document.getElementById('saveAllNckMarksBtn')?.addEventListener('click', saveAllLecturerNCKMarks);
        document.getElementById('fillDownNckBtn')?.addEventListener('click', fillDownNCKValues);
        
    } catch (error) {
        container.innerHTML = '<div class="alert alert-danger">Error: ' + error.message + '</div>';
    }
}

function updateLecturerNCKTotal(idx) {
    var score = parseFloat(document.querySelector('.nck-score[data-index="' + idx + '"]').value) || 0;
    var grade = calculateGrade(score);
    var status = score >= 60 ? 'PASS' : (score > 0 ? 'FAIL' : 'PENDING');
    var color = status === 'PASS' ? '#10b981' : (status === 'FAIL' ? '#ef4444' : '#f59e0b');
    
    var gradeEl = document.getElementById('nckGrade_' + idx);
    var statusEl = document.getElementById('nckStatus_' + idx);
    
    if (gradeEl) { gradeEl.innerHTML = grade; gradeEl.style.color = color; }
    if (statusEl) { statusEl.innerHTML = status; statusEl.style.color = color; }
}

function fillDownNCKValues() {
    var inputs = document.querySelectorAll('.nck-score');
    if (!inputs.length) return;
    
    var val = inputs[0].value;
    for (var i = 1; i < inputs.length; i++) {
        inputs[i].value = val;
        updateLecturerNCKTotal(i);
    }
    showNotification('Values filled down!', 'success');
}

async function saveSingleLecturerNCK(idx, studentId) {
    var block = $('lecNckBlock').value;
    var sheet = $('lecNckSheet').value;
    var score = parseFloat(document.querySelector('.nck-score[data-index="' + idx + '"]').value) || 0;
    var gradedBy = document.querySelector('.nck-graded[data-index="' + idx + '"]').value;
    var student = state.allStudents.find(function(s) { return s.student_id === studentId; });
    
    var grade = calculateGrade(score);
    var status = score >= 60 ? 'passed' : (score > 0 ? 'failed' : 'pending');
    
    showLoading('Saving ' + (student?.full_name || 'student') + '...');
    
    var { error } = await state.sb
        .from(TABLES.NCK)
        .upsert({
            admission_number: studentId,
            student_name: student?.full_name || '',
            block: block,
            subject_name: sheet,
            final_score: score,
            grade: grade,
            status: status,
            graded_by: gradedBy || state.currentUser?.full_name || 'Lecturer',
            academic_year: '2026',
            published: true,
            approval_status: 'draft'
        }, { onConflict: 'admission_number,subject_name,block' });
    
    hideLoading();
    showNotification(error ? 'Error: ' + error.message : 'Saved! Waiting for admin approval.', error ? 'error' : 'success');
}

// ============================================================
// FIXED: saveAllLecturerNCKMarks - WITH ADMIN APPROVAL
// ============================================================

async function saveAllLecturerNCKMarks() {
    var block = $('lecNckBlock').value;
    var sheet = $('lecNckSheet').value;
    var inputs = document.querySelectorAll('.nck-score');
    
    if (!inputs.length) {
        showNotification('No data to save', 'error');
        return;
    }
    
    showLoading('Saving all NCK marks...');
    var saved = 0;
    var nckData = [];
    
    for (var i = 0; i < inputs.length; i++) {
        var student = state.allStudents[i];
        if (!student) continue;
        
        var score = parseFloat(document.querySelector('.nck-score[data-index="' + i + '"]').value) || 0;
        var gradedBy = document.querySelector('.nck-graded[data-index="' + i + '"]').value;
        var grade = calculateGrade(score);
        var status = score >= 60 ? 'passed' : (score > 0 ? 'failed' : 'pending');
        
        var nckRecord = {
            admission_number: student.student_id,
            student_name: student.full_name,
            block: block,
            subject_name: sheet,
            final_score: score,
            grade: grade,
            status: status,
            graded_by: gradedBy || state.currentUser?.full_name || 'Lecturer',
            academic_year: '2026',
            published: true,
            approval_status: 'draft'
        };
        
        var { error } = await state.sb
            .from(TABLES.NCK)
            .upsert(nckRecord, { onConflict: 'admission_number,subject_name,block' });
        
        if (!error) {
            saved++;
            nckData.push(nckRecord);
        }
    }
    
    // ✅ REQUEST ADMIN APPROVAL
    if (saved > 0 && typeof requestAdminApproval === 'function') {
        await requestAdminApproval(
            'save_nck_marks',
            {
                block: block,
                sheet: sheet,
                marks_count: saved,
                nck_data: nckData
            },
            'Saved ' + saved + ' NCK marks for ' + sheet + ' (' + block + ')',
            block
        );
    }
    
    hideLoading();
    showNotification('Saved ' + saved + ' NCK records! Waiting for admin approval.', 'success');
    loadLecturerNCKMarks();
}
function switchMarksTab(tab) {
    document.querySelectorAll('.marks-tab').forEach(function(t) { t.style.display = 'none'; });
    document.querySelectorAll('.tabs-nav .tab-btn').forEach(function(b) { b.classList.remove('active'); });
    
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
        var { data: grades } = await state.sb.from(TABLES.MARKS).select('final_score');
        var { data: nck } = await state.sb.from(TABLES.NCK).select('final_score');
        
        var total = 0, scored = 0, passed = 0;
        var all = [...(grades || []), ...(nck || [])];
        
        for (var i = 0; i < all.length; i++) {
            var score = all[i].final_score || 0;
            if (score > 0) {
                total += score;
                scored++;
                if (score >= 60) passed++;
            }
        }
        
        var avg = scored > 0 ? (total / scored).toFixed(1) : 0;
        var rate = scored > 0 ? ((passed / scored) * 100).toFixed(1) : 0;
        
        $('lecAnalyticsAvg').textContent = avg + '%';
        $('lecAnalyticsPass').textContent = rate + '%';
        $('lecAnalyticsTotal').textContent = all.length;
        $('lecAvgScore').textContent = avg + '%';
        
        if (state.lecturerChart) state.lecturerChart.destroy();
        var ctx = document.getElementById('lecPerformanceChart')?.getContext('2d');
        
        if (ctx) {
            state.lecturerChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Pass (' + passed + ')', 'Fail (' + (scored - passed) + ')', 'Pending (' + (all.length - scored) + ')'],
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
// 16. RESOURCES (WITH APPROVAL)
// ============================================================

function populateResourceForm() {
    var program = state.program;
    var programs = program ? [{ id: program, name: program }] : [];
    populateSelect($('resourceProgram'), programs, 'id', 'name', 'Select Program');
    if (program) $('resourceProgram').value = program;
    
    var intakes = [
        { id: '2024', name: '2024' },
        { id: '2025', name: '2025' },
        { id: '2026', name: '2026' },
        { id: '2027', name: '2027' },
        { id: '2028', name: '2028' }
    ];
    populateSelect($('resourceIntake'), intakes, 'id', 'name', 'Select Intake');
    
    var blocks = getAcademicBlocks(program);
    populateSelect($('resourceBlock'), blocks.map(function(b) { return { id: b, name: b }; }), 'id', 'name', 'Select Block/Term');
}

function loadResourcesTable() {
    var tbody = $('resourcesList');
    if (!tbody) return;
    
    var resources = state.allResources;
    
    if (!resources || !resources.length) {
        tbody.innerHTML = '<tr><td colspan="7">No resources uploaded.</td></tr>';
        return;
    }
    
    tbody.innerHTML = resources.map(function(r) {
        var statusBadge = '';
        var status = r.approval_status || 'pending';
        if (status === 'pending') {
            statusBadge = '<span class="badge badge-warning">⏳ Pending Approval</span>';
        } else if (status === 'approved') {
            statusBadge = '<span class="badge badge-success">✅ Approved</span>';
        } else if (status === 'rejected') {
            statusBadge = '<span class="badge badge-danger">❌ Rejected</span>';
        }
        
        // ✅ Only the uploader can delete (only if pending)
        var isOwner = r.uploaded_by === state.currentUserId;
        var canDelete = isOwner && status === 'pending';
        
        var programDisplay = r.target_program || r.program_type || 'N/A';
        var blockDisplay = r.block || r.block_term || 'N/A';
        
        return '<tr>' +
            '<td>' + escapeHtml(r.title || 'N/A') + '</td>' +
            '<td>' + escapeHtml(r.category || 'Academic') + '</td>' +
            '<td>' + escapeHtml(programDisplay) + '/' + escapeHtml(blockDisplay) + '</td>' +
            '<td>' + escapeHtml(r.uploaded_by_name || 'N/A') + '</td>' +
            '<td>' + formatDate(r.created_at) + '</td>' +
            '<td>' + statusBadge + '</td>' +
            '<td>' +
                (status === 'approved' ? '<a href="' + r.file_url + '" target="_blank" class="btn btn-action btn-small"><i class="fas fa-download"></i> Download</a>' : '') +
                (canDelete ? '<button class="btn btn-delete btn-small" data-action="delete-resource" data-resource="' + r.id + '"><i class="fas fa-trash"></i> Cancel</button>' : '') +
            '</td>' +
        '</tr>';
    }).join('');
}

// ============================================================
// DELETE RESOURCE - Only if Owner and Pending
// ============================================================

async function deleteResource(resourceId) {
    console.log('🗑️ Deleting resource:', resourceId);
    
    // ✅ Check if user owns this resource
    var resource = state.allResources.find(function(r) { 
        return r.id === resourceId; 
    });
    
    if (!resource) {
        showNotification('Resource not found.', 'error');
        return;
    }
    
    // Only owner can delete, and only if pending
    if (resource.uploaded_by !== state.currentUserId) {
        showNotification('You can only delete resources you uploaded.', 'warning');
        return;
    }
    
    if (resource.approval_status === 'approved') {
        showNotification('Approved resources cannot be deleted. Contact admin.', 'warning');
        return;
    }
    
    if (!confirm('Delete this resource: "' + resource.title + '"?')) return;
    
    try {
        // Delete from storage first
        if (resource.file_path) {
            var { error: storageError } = await state.sb
                .storage
                .from(RESOURCES_BUCKET)
                .remove([resource.file_path]);
            
            if (storageError) {
                console.warn('⚠️ Storage delete error:', storageError);
                // Continue anyway - try to delete from database
            }
        }
        
        // Delete from database
        var { error } = await state.sb
            .from(TABLES.RESOURCES)
            .delete()
            .eq('id', resourceId);
        
        if (error) throw error;
        
        showNotification('✅ Resource deleted!', 'success');
        await loadResourcesTable();
        
    } catch (error) {
        console.error('Delete error:', error);
        showNotification('Delete failed: ' + error.message, 'error');
    }
}

// Make it globally available
window.deleteResource = deleteResource;
// ============================================================
// FIXED: handleUploadResource - Matches YOUR EXACT DB Schema
// ============================================================

async function handleUploadResource(e) {
    e.preventDefault();
    var btn = e.submitter || e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Uploading...';
    
    var program = $('resourceProgram').value;
    var intake = $('resourceIntake').value;
    var block = $('resourceBlock').value;
    var fileInput = $('resourceFile');
    var title = $('resourceTitle').value.trim();
    var category = $('resourceCategory').value;
    
    if (!fileInput.files.length || !program || !intake || !block || !title || !category) {
        showNotification('Please fill all required fields.', 'error');
        btn.disabled = false;
        btn.textContent = 'Upload Resource';
        return;
    }
    
    var file = fileInput.files[0];
    var ext = file.name.split('.').pop();
    var base = title.replace(/[^\w\-]+/g, '_') + '_' + Date.now();
    var fileName = base + '.' + ext;
    var filePath = program + '/' + intake + '/' + block + '/' + fileName;
    var fileSize = file.size;
    var fileType = file.type || ext;
    
    try {
        // Upload to storage
        var { error: uploadError } = await state.sb
            .storage
            .from(RESOURCES_BUCKET)
            .upload(filePath, file, { cacheControl: '3600', upsert: true });
        
        if (uploadError) {
            console.error('Storage upload error:', uploadError);
            throw new Error('Storage upload failed: ' + uploadError.message);
        }
        
        var { data: urlData } = state.sb
            .storage
            .from(RESOURCES_BUCKET)
            .getPublicUrl(filePath);
        
        var publicUrl = urlData?.publicUrl;
        
        if (!publicUrl) {
            throw new Error('Failed to get public URL');
        }
        
        // ✅ MATCH YOUR EXACT TABLE SCHEMA
        var resourceData = {
            // Core fields
            title: title,
            file_name: fileName,
            file_path: filePath,
            file_url: publicUrl,
            file_size: fileSize,
            file_type: fileType,
            
            // Program fields
            program_type: program,
            target_program: program,
            intake: intake,
            block: block,
            block_term: block,
            
            // Category & Description
            category: category || 'General',
            description: '', // Optional - add if you have a description input
            
            // Uploader info
            uploaded_by: state.currentUserId,
            uploaded_by_name: state.currentUser?.full_name || 'Lecturer',
            
            // Resource type (default to 'material')
            resource_type: 'material', // or 'pastpaper' if you add that toggle
            
            // Approval fields
            approval_status: 'pending',
            
            // Allow download
            allow_download: true,
            
            // Timestamps
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        console.log('📤 Inserting resource with data:', resourceData);
        
        var { data: inserted, error: insertError } = await state.sb
            .from(TABLES.RESOURCES)
            .insert(resourceData)
            .select();
        
        if (insertError) {
            console.error('Insert error:', insertError);
            throw new Error('Database insert failed: ' + insertError.message);
        }
        
        // ✅ Request admin approval
        if (typeof requestAdminApproval === 'function') {
            await requestAdminApproval(
                'upload_resource',
                {
                    resource_id: inserted[0]?.id,
                    title: title,
                    file_path: filePath,
                    program: program,
                    block: block,
                    intake: intake
                },
                'Uploaded resource: ' + title,
                inserted[0]?.id
            );
        }
        
        showNotification('✅ Resource uploaded! Waiting for admin approval.', 'success');
        e.target.reset();
        await loadResourcesTable();
        
    } catch (err) {
        console.error('Upload error:', err);
        showNotification('Upload failed: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Upload Resource';
    }
}
// ============================================================
// REQUEST ADMIN APPROVAL - FOR LECTURER ACTIONS
// ============================================================

async function requestAdminApproval(actionType, actionData, description, targetId) {
    try {
        console.log('📤 Requesting admin approval:', { actionType, description, targetId });
        
        var { data: { user } } = await state.sb.auth.getUser();
        if (!user) {
            console.error('❌ No user found');
            return { success: false, error: 'No user found' };
        }
        
        var { data: profile, error: profileError } = await state.sb
            .from('consolidated_user_profiles_table')
            .select('full_name, email')
            .eq('user_id', user.id)
            .single();
        
        if (profileError) {
            console.warn('⚠️ Profile fetch error:', profileError);
        }
        
        var actionRequest = {
            admin_id: user.id,
            admin_name: profile?.full_name || profile?.email || user.email || 'Unknown Lecturer',
            action_type: actionType,
            action_data: actionData || {},
            description: description || 'No description provided',
            target_id: targetId || null,
            status: 'pending',
            requested_at: new Date().toISOString()
        };
        
        console.log('📋 Action request data:', actionRequest);
        
        var { data, error } = await state.sb
            .from('admin_action_requests')
            .insert([actionRequest])
            .select();
        
        if (error) {
            console.error('❌ Insert error:', error);
            throw error;
        }
        
        console.log('✅ Approval request created:', data);
        showNotification('✅ Submitted for admin approval. Request ID: ' + data[0].id.substring(0, 8), 'success');
        return { success: true, requestId: data[0].id };
        
    } catch (error) {
        console.error('❌ Error requesting approval:', error);
        showNotification('Failed to submit approval request: ' + error.message, 'error');
        return { success: false, error: error.message };
    }
}

// Make it globally available
window.requestAdminApproval = requestAdminApproval;
// ============================================================
// 17. MESSAGES (WITH APPROVAL)
// ============================================================

function populateMessageForm() {
    var students = state.allStudents;
    var targetSelect = $('msgTarget');
    if (!targetSelect) return;
    
    targetSelect.innerHTML = '';
    
    var allOption = document.createElement('option');
    allOption.value = 'all-students';
    allOption.textContent = 'All ' + (state.program || 'Assigned') + ' Students';
    targetSelect.appendChild(allOption);
    
    if (students && students.length) {
        students.forEach(function(s) {
            var option = document.createElement('option');
            option.value = s.user_id;
            option.textContent = s.full_name + ' (' + (s.student_id || 'N/A') + ')';
            targetSelect.appendChild(option);
        });
    }
}

function loadMessagesTable() {
    var tbody = $('messagesTable');
    if (!tbody) return;
    
    var messages = state.allMessages;
    
    if (!messages || !messages.length) {
        tbody.innerHTML = '<tr><td colspan="6">No messages sent.</td></tr>';
        return;
    }
    
    tbody.innerHTML = messages.map(function(m) {
        var targetDisplay = m.target_group === 'all-students' ? 
            'All ' + (m.target_program || 'Assigned') + ' Students' :
            state.allStudents.find(function(s) { return s.user_id === m.receiver_id; })?.full_name || 
            'User ID: ' + (m.receiver_id || 'N/A');
        
        var statusBadge = '';
        var approvalStatus = m.approval_status || 'pending';
        if (approvalStatus === 'pending') {
            statusBadge = '<span class="badge badge-warning">⏳ Pending Approval</span>';
        } else if (approvalStatus === 'approved') {
            statusBadge = '<span class="badge badge-success">✅ Approved</span>';
        } else if (approvalStatus === 'sent') {
            statusBadge = '<span class="badge badge-success">📨 Sent</span>';
        } else if (approvalStatus === 'rejected') {
            statusBadge = '<span class="badge badge-danger">❌ Rejected</span>';
        }
        
        return '<tr>' +
            '<td>' + formatDateTime(m.created_at || m.inserted_at) + '</td>' +
            '<td>' + escapeHtml(m.topic || m.subject || 'N/A') + '</td>' +
            '<td>' + escapeHtml(targetDisplay) + '</td>' +
            '<td>' + statusBadge + '</td>' +
            '<td><button class="btn btn-action btn-small" data-action="view-message" data-message="' + (m.id || '') + '">View</button></td>' +
        '</tr>';
    }).join('');
}

// ============================================================
// FIXED: handleSendMessage - WITH ADMIN APPROVAL
// ============================================================

async function handleSendMessage(e) {
    e.preventDefault();
    var btn = e.submitter || e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Sending...';
    
    var target = $('msgTarget').value;
    var subject = $('msgSubject').value;
    var body = $('msgBody').value;
    
    if (!target || !subject || !body) {
        showNotification('Please fill all fields.', 'error');
        btn.disabled = false;
        btn.textContent = 'Send Message';
        return;
    }
    
    try {
        var messageData = {
            sender_id: state.currentUserId,
            sender_role: 'lecturer',
            topic: subject,
            body: body,
            message: body,
            recipient_role: target === 'all-students' ? 'student' : 'student',
            target_program: state.program,
            target_group: target === 'all-students' ? 'all-students' : 'specific-user',
            program_type: state.program,
            receiver_id: target === 'all-students' ? null : target,
            extension: 'message',
            private: false,
            approval_status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            inserted_at: new Date().toISOString()
        };
        
        if (target !== 'all-students') {
            messageData.receiver_id = target;
            messageData.recipient_role = 'student';
        }
        
        var { data: inserted, error: insertError } = await state.sb
            .from(TABLES.MESSAGES)
            .insert(messageData)
            .select();
        
        if (insertError) throw insertError;
        
        // ✅ REQUEST ADMIN APPROVAL
        if (typeof requestAdminApproval === 'function') {
            await requestAdminApproval(
                'send_message',
                {
                    message_id: inserted[0]?.id,
                    subject: subject,
                    target: target,
                    target_program: state.program
                },
                'Sent message: ' + subject,
                inserted[0]?.id
            );
        } else {
            console.warn('⚠️ requestAdminApproval function not found');
        }
        
        showNotification('✅ Message submitted! Waiting for admin approval.', 'success');
        e.target.reset();
        populateMessageForm();
        loadMessagesTable();
        
    } catch (error) {
        showNotification('Failed: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Send Message';
    }
}

// ============================================================
// 18. CALENDAR
// ============================================================

function loadCalendar() {
    var container = $('calendarView');
    if (container) {
        container.innerHTML = 
            '<div style="background: white; border-radius: 12px; padding: 20px;">' +
                '<p>Academic Calendar for ' + (state.program || 'All Programs') + '</p>' +
                '<div style="text-align: center; padding: 40px; color: #6b7280;">' +
                    '<i class="fas fa-calendar-alt" style="font-size: 48px; display: block; margin-bottom: 15px;"></i>' +
                    '<p>Full calendar integration coming soon.</p>' +
                    '<p style="font-size: 12px;">Your sessions and exams will appear here.</p>' +
                '</div>' +
            '</div>';
    }
}

// ============================================================
// 19. NURSE IQ
// ============================================================

function loadNurseIQ() {
    var container = $('nurse-iq-content');
    if (container) {
        container.innerHTML = 
            '<div class="panel_s">' +
                '<div class="panel-body text-center" style="padding: 60px;">' +
                    '<i class="fas fa-stethoscope" style="font-size: 64px; color: #4C1D95; margin-bottom: 20px;"></i>' +
                    '<h3>Nurse IQ Assessment</h3>' +
                    '<p>Clinical knowledge assessment module for ' + (state.program || 'Nursing') + ' students.</p>' +
                    '<p style="font-size: 12px; color: #6b7280; margin-top: 10px;">Coming soon...</p>' +
                '</div>' +
            '</div>';
    }
}

// ============================================================
// 20. REPORTS
// ============================================================

async function handleGenerateReport(e) {
    e.preventDefault();
    var btn = e.submitter || e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Generating...';
    
    var type = $('reportType').value;
    var scope = $('reportScope').value;
    
    if (!type || !scope) {
        showNotification('Select both fields.', 'error');
        btn.disabled = false;
        btn.textContent = 'Generate Report';
        return;
    }
    
    await new Promise(function(r) { setTimeout(r, 1500); });
    showNotification('✅ ' + type + ' report generated!', 'success');
    
    var table = $('reportsTable');
    var row = '<tr>' +
        '<td>' + type + ' - ' + new Date().toLocaleDateString() + '</td>' +
        '<td>' + type + '</td>' +
        '<td>' + scope + '</td>' +
        '<td>' + new Date().toLocaleDateString() + '</td>' +
        '<td><button class="btn btn-action btn-small" data-action="download-report">Download</button></td>' +
    '</tr>';
    table.innerHTML = table.innerHTML.includes('No reports') ? row : row + table.innerHTML;
    
    btn.disabled = false;
    btn.textContent = 'Generate Report';
}

// ============================================================
// 21. SETTINGS
// ============================================================

async function handleSaveSettings(e) {
    e.preventDefault();
    var btn = e.submitter || e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Saving...';
    await new Promise(function(r) { setTimeout(r, 1000); });
    showNotification('✅ Settings saved!', 'success');
    btn.disabled = false;
    btn.textContent = 'Save Settings';
}

// ============================================================
// 22. EVENT LISTENERS
// ============================================================

function setupEventListeners() {
    // Mobile nav toggle
    var toggle = $('mobileNavToggle');
    if (toggle) {
        toggle.addEventListener('click', function() {
            document.getElementById('sidebar')?.classList.toggle('active');
        });
    }
    
    // Logout
    var logoutBtn = $('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            await state.sb.auth.signOut();
            window.location.href = 'login.html';
        });
    }
    
    // Profile photo upload
    var updatePhotoBtn = $('updatePhotoBtn');
    var photoInput = $('photoUploadInput');
    if (updatePhotoBtn && photoInput) {
        updatePhotoBtn.addEventListener('click', function() { photoInput.click(); });
        photoInput.addEventListener('change', handleProfilePhotoChange);
    }
    
    // Edit profile
    var editProfileBtn = $('editProfileBtn');
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', function() {
            showNotification('Profile editing feature coming soon!', 'info');
        });
    }
    
    // Change password
    var updatePasswordBtn = $('updatePasswordBtn');
    if (updatePasswordBtn) {
        updatePasswordBtn.addEventListener('click', function() {
            showNotification('Password change feature coming soon!', 'info');
        });
    }
    
    // Notification button
    var notificationBtn = $('notificationBtn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', function() {
            showNotification('Notifications feature coming soon!', 'info');
        });
    }
    
    // Help button
    var helpBtn = $('helpBtn');
    if (helpBtn) {
        helpBtn.addEventListener('click', function() {
            showNotification('Help documentation is being prepared.', 'info');
        });
    }
    
    // Navigation clicks
    document.querySelectorAll('.nav a[data-tab]').forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            var tab = this.dataset.tab;
            loadSectionData(tab);
            document.getElementById('sidebar')?.classList.remove('active');
        });
    });
    
    // Card clicks
    document.querySelectorAll('.card[data-tab]').forEach(function(card) {
        card.addEventListener('click', function() {
            var tab = this.dataset.tab;
            loadSectionData(tab);
        });
    });
    
    // Session form
    var sessionForm = $('addSessionForm');
    if (sessionForm) {
        sessionForm.addEventListener('submit', handleAddSession);
    }
    
    // Manual attendance form
    var attendanceForm = $('manualAttendanceForm');
    if (attendanceForm) {
        attendanceForm.addEventListener('submit', handleManualAttendance);
    }
    
    // Lecturer check-in
    var checkinBtn = $('lecturerCheckinBtn');
    if (checkinBtn) {
        checkinBtn.addEventListener('click', lecturerCheckIn);
    }
    
    // Exam form
    var examForm = $('addExamForm');
    if (examForm) {
        examForm.addEventListener('submit', handleAddExam);
    }
    
    // Resource form
    var resourceForm = $('uploadResourceForm');
    if (resourceForm) {
        resourceForm.addEventListener('submit', handleUploadResource);
    }
    
    // Message form
    var messageForm = $('sendMessageForm');
    if (messageForm) {
        messageForm.addEventListener('submit', handleSendMessage);
    }
    
    // Report form
    var reportForm = $('reportGenerationForm');
    if (reportForm) {
        reportForm.addEventListener('submit', handleGenerateReport);
    }
    
    // Settings form
    var settingsForm = $('settingsForm');
    if (settingsForm) {
        settingsForm.addEventListener('submit', handleSaveSettings);
    }
    
    // Edit resource modal
    var editResourceForm = $('editResourceForm');
    if (editResourceForm) {
        editResourceForm.addEventListener('submit', saveResourceEdits);
    }
    var closeEditResourceBtn = $('closeEditResourceModal');
    if (closeEditResourceBtn) {
        closeEditResourceBtn.addEventListener('click', closeEditResourceModal);
    }
    var cancelEditResourceBtn = $('cancelEditResourceBtn');
    if (cancelEditResourceBtn) {
        cancelEditResourceBtn.addEventListener('click', closeEditResourceModal);
    }
    
    // Edit exam modal
    var editExamForm = $('editExamForm');
    if (editExamForm) {
        editExamForm.addEventListener('submit', saveEditedExam);
    }
    var closeExamEditBtn = $('closeExamEditModal');
    if (closeExamEditBtn) {
        closeExamEditBtn.addEventListener('click', closeEditExamModal);
    }
    var cancelEditExamBtn = $('cancelEditExamBtn');
    if (cancelEditExamBtn) {
        cancelEditExamBtn.addEventListener('click', closeEditExamModal);
    }
    
    // Student info modal
    var closeStudentInfoBtn = $('closeStudentInfoModal');
    if (closeStudentInfoBtn) {
        closeStudentInfoBtn.addEventListener('click', closeStudentInfoModal);
    }
    
    // Map modal
    var closeMapBtn = $('closeMapModal');
    if (closeMapBtn) {
        closeMapBtn.addEventListener('click', closeMapModal);
    }
    
    // Search buttons
    var courseSearchBtn = $('courseSearchBtn');
    if (courseSearchBtn) {
        courseSearchBtn.addEventListener('click', function() {
            filterTable('courseSearch', 'lecturerCoursesTable', [0, 1]);
        });
    }
    
    var attendanceSearchBtn = $('attendanceSearchBtn');
    if (attendanceSearchBtn) {
        attendanceSearchBtn.addEventListener('click', filterTodayAttendance);
    }
    
    var examSearchBtn = $('examSearchBtn');
    if (examSearchBtn) {
        examSearchBtn.addEventListener('click', function() {
            filterTable('examSearch', 'examsTable', [1, 2, 3]);
        });
    }
    
    var resourceSearchBtn = $('resourceSearchBtn');
    if (resourceSearchBtn) {
        resourceSearchBtn.addEventListener('click', function() {
            filterTable('resourceSearch', 'resourcesList', [0, 1, 2]);
        });
    }
    
    // Student search
    var studentSearch = $('studentSearch');
    if (studentSearch) {
        studentSearch.addEventListener('keyup', filterStudentTable);
    }
    
    // Filter changes
    var studentIntakeFilter = $('studentIntakeFilter');
    if (studentIntakeFilter) {
        studentIntakeFilter.addEventListener('change', filterStudentTable);
    }
    var studentStatusFilter = $('studentStatusFilter');
    if (studentStatusFilter) {
        studentStatusFilter.addEventListener('change', filterStudentTable);
    }
    var studentRiskFilter = $('studentRiskFilter');
    if (studentRiskFilter) {
        studentRiskFilter.addEventListener('change', filterStudentTable);
    }
    
    // Marks tab buttons
    var internalTab = $('lecTabInternal');
    if (internalTab) {
        internalTab.addEventListener('click', function() { switchMarksTab('internal'); });
    }
    var nckTab = $('lecTabNck');
    if (nckTab) {
        nckTab.addEventListener('click', function() { switchMarksTab('nck'); });
    }
    var analyticsTab = $('lecTabAnalytics');
    if (analyticsTab) {
        analyticsTab.addEventListener('click', function() { switchMarksTab('analytics'); });
    }
    
    // Marks filter changes
    var lecBlockSelect = $('lecBlockSelect');
    if (lecBlockSelect) {
        lecBlockSelect.addEventListener('change', function() {
            loadLecturerSubjects();
            loadLecturerInternalMarks();
        });
    }
    var lecSubjectSelect = $('lecSubjectSelect');
    if (lecSubjectSelect) {
        lecSubjectSelect.addEventListener('change', loadLecturerInternalMarks);
    }
    var lecNckBlock = $('lecNckBlock');
    if (lecNckBlock) {
        lecNckBlock.addEventListener('change', loadLecturerNCKMarks);
    }
    var lecNckSheet = $('lecNckSheet');
    if (lecNckSheet) {
        lecNckSheet.addEventListener('change', loadLecturerNCKMarks);
    }
    
    // Past attendance filters
    var pastDateFilter = $('pastAttendanceDateFilter');
    if (pastDateFilter) {
        pastDateFilter.addEventListener('change', filterPastAttendance);
    }
    var pastTypeFilter = $('pastAttendanceTypeFilter');
    if (pastTypeFilter) {
        pastTypeFilter.addEventListener('change', filterPastAttendance);
    }
    var pastSearch = $('pastAttendanceSearch');
    if (pastSearch) {
        pastSearch.addEventListener('keyup', filterPastAttendance);
    }
    
    // Attendance search
    var attendanceSearch = $('attendanceSearch');
    if (attendanceSearch) {
        attendanceSearch.addEventListener('keyup', filterTodayAttendance);
    }
    
    // Course search
    var courseSearch = $('courseSearch');
    if (courseSearch) {
        courseSearch.addEventListener('keyup', function() {
            filterTable('courseSearch', 'lecturerCoursesTable', [0, 1]);
        });
    }
    
    // Exam search
    var examSearch = $('examSearch');
    if (examSearch) {
        examSearch.addEventListener('keyup', function() {
            filterTable('examSearch', 'examsTable', [1, 2, 3]);
        });
    }
    
    // Resource search
    var resourceSearch = $('resourceSearch');
    if (resourceSearch) {
        resourceSearch.addEventListener('keyup', function() {
            filterTable('resourceSearch', 'resourcesList', [0, 1, 2]);
        });
    }
    
    // Event delegation for dynamic buttons
    document.addEventListener('click', handleDynamicClicks);
    
    // Filter buttons
    var intakeFilter = $('intakeYearFilter');
    if (intakeFilter) {
        intakeFilter.addEventListener('change', filterCoursesByAcademicPeriod);
    }
    var periodFilter = $('academicPeriodFilter');
    if (periodFilter) {
        periodFilter.addEventListener('change', filterCoursesByAcademicPeriod);
    }
    
    // Course search button
    var courseSearchBtn = $('courseSearchBtn');
    if (courseSearchBtn) {
        courseSearchBtn.addEventListener('click', function() {
            filterTable('courseSearch', 'lecturerCoursesTable', [0, 1]);
        });
    }
    
    // Attendance search
    var attendanceSearch = $('attendanceSearch');
    if (attendanceSearch) {
        attendanceSearch.addEventListener('keyup', filterTodayAttendance);
    }
}

// ============================================================
// 23. DYNAMIC CLICK HANDLER
// ============================================================

function handleDynamicClicks(e) {
    var target = e.target.closest('[data-action]');
    if (!target) return;
    
    var action = target.dataset.action;
    
    switch (action) {
        case 'view-student':
            viewStudentProfile(target.dataset.user);
            break;
        case 'message-student':
            showSendMessageModal(target.dataset.user, target.dataset.name);
            break;
        case 'edit-exam':
            // ✅ Only allow if user owns the exam
            var examId = target.dataset.exam;
            var exam = state.allExams.find(function(ex) { return ex.id === examId; });
            if (exam && exam.created_by === state.currentUserId) {
                openEditExamModal(examId);
            } else {
                showNotification('You can only edit exams you created.', 'warning');
            }
            break;
        case 'delete-exam':
            // ✅ Only allow if user owns the exam
            var examIdDel = target.dataset.exam;
            var examDel = state.allExams.find(function(ex) { return ex.id === examIdDel; });
            if (examDel && examDel.created_by === state.currentUserId) {
                deleteExam(examIdDel);
            } else {
                showNotification('You can only delete exams you created.', 'warning');
            }
            break;
        case 'grade-exam':
            // ✅ Anyone can grade (lecturers grade their students)
            openGradeModal(target.dataset.exam);
            break;
        case 'view-exam':
            // ✅ View only - no edit/delete
            showNotification('Viewing exam details...', 'info');
            break;
        case 'delete-resource':
            // ✅ Only delete if pending (not approved yet)
            deleteResource(target.dataset.resource);
            break;
        case 'copy-link':
            e.preventDefault();
            navigator.clipboard.writeText(target.dataset.link).then(function() {
                showNotification('Link Copied!', 'success');
            });
            break;
        case 'view-map':
            viewCheckInMap(target.dataset.lat, target.dataset.lng, target.dataset.name);
            break;
        case 'edit-session':
            // ✅ Only allow if user owns the session
            var sessionId = target.dataset.session;
            var session = state.allSessions.find(function(s) { return s.id === sessionId; });
            if (session && session.lecturer_id === state.currentUserId) {
                showNotification('Edit session feature coming soon', 'info');
            } else {
                showNotification('You can only edit sessions you created.', 'warning');
            }
            break;
        case 'manage-course':
            showNotification('Course management coming soon', 'info');
            break;
        case 'view-message':
            showNotification('View message feature coming soon', 'info');
            break;
        case 'download-report':
            showNotification('Downloading report...', 'info');
            break;
        default:
            console.log('Unknown action:', action);
    }
}

// ============================================================
// 24. GRADE MODAL
// ============================================================

async function openGradeModal(examId) {
    try {
        showLoading('Loading grading interface...');
        
        var { data: exam, error: examError } = await state.sb
            .from(TABLES.EXAMS)
            .select('*, course:course_id(course_name, unit_code)')
            .eq('id', examId)
            .single();
        
        if (examError || !exam) {
            showNotification('Exam not found.', 'error');
            return;
        }
        
        var students = state.allStudents.filter(function(s) {
            return s.program === exam.target_program &&
                s.intake_year === exam.intake_year &&
                s.block === exam.block_term;
        });
        
        if (!students.length) {
            showNotification('No students found for this exam.', 'warning');
            return;
        }
        
        var { data: existing } = await state.sb
            .from('exam_grades')
            .select('*')
            .eq('exam_id', examId);
        
        var modal = $('gradeModal');
        modal.innerHTML = buildGradeModal(exam, students, existing || []);
        modal.classList.add('active');
        
        students.forEach(function(s) {
            var cat1 = document.getElementById('cat1-' + s.user_id);
            var cat2 = document.getElementById('cat2-' + s.user_id);
            var final = document.getElementById('final-' + s.user_id);
            if (cat1) cat1.addEventListener('input', function() { calculateStudentGrade(s.user_id); });
            if (cat2) cat2.addEventListener('input', function() { calculateStudentGrade(s.user_id); });
            if (final) final.addEventListener('input', function() { calculateStudentGrade(s.user_id); });
        });
        
        var saveBtn = document.getElementById('saveGradesBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', function() { saveAllGrades(examId); });
        }
        
        var closeBtn = modal.querySelector('.close');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeGradeModal);
        }
        
        hideLoading();
        
    } catch (error) {
        showNotification('Failed: ' + error.message, 'error');
    }
}

function buildGradeModal(exam, students, existing) {
    var studentRows = students.map(function(s) {
        var g = existing.find(function(e) { return e.student_id === s.user_id; }) || {};
        return '<tr data-name="' + s.full_name.toLowerCase() + '" data-id="' + s.student_id.toLowerCase() + '">' +
            '<td>' + escapeHtml(s.full_name) + '</td>' +
            '<td>' + escapeHtml(s.student_id) + '</td>' +
            '<td><input type="number" min="0" max="30" step="0.5" id="cat1-' + s.user_id + '" value="' + (g.cat_1_score || '') + '" class="grade-input"></td>' +
            '<td><input type="number" min="0" max="30" step="0.5" id="cat2-' + s.user_id + '" value="' + (g.cat_2_score || '') + '" class="grade-input"></td>' +
            '<td><input type="number" min="0" max="100" step="0.5" id="final-' + s.user_id + '" value="' + (g.exam_score || '') + '" class="grade-input"></td>' +
            '<td><input type="number" id="total-' + s.user_id + '" value="' + (g.total_score || '') + '" readonly class="total-input"></td>' +
            '<td><span id="grade-' + s.user_id + '" class="grade-letter">' + calculateGradeLetter(g.total_score) + '</span></td>' +
            '<td><select id="status-' + s.user_id + '" class="status-select">' +
                '<option value="Scheduled" ' + (g.result_status === 'Scheduled' ? 'selected' : '') + '>Scheduled</option>' +
                '<option value="InProgress" ' + (g.result_status === 'InProgress' ? 'selected' : '') + '>In Progress</option>' +
                '<option value="Graded" ' + (g.result_status === 'Graded' ? 'selected' : '') + '>Graded</option>' +
                '<option value="Final" ' + (g.result_status === 'Final' ? 'selected' : '') + '>Final</option>' +
            '</select></td>' +
        '</tr>';
    }).join('');
    
    return '<div class="modal-header">' +
            '<h3><i class="fas fa-check-circle"></i> Grade: ' + escapeHtml(exam.exam_name) + '</h3>' +
            '<span class="close">&times;</span>' +
        '</div>' +
        '<div class="modal-body">' +
            '<div class="exam-info-card" style="background:#f8f9fa;padding:15px;border-radius:8px;margin-bottom:15px;">' +
                '<p><strong>Course:</strong> ' + escapeHtml(exam.course?.course_name || 'General') + '</p>' +
                '<p><strong>Program:</strong> ' + escapeHtml(exam.target_program) + ' | Block ' + escapeHtml(exam.block_term) + ' | ' + escapeHtml(exam.intake_year) + '</p>' +
                '<p><strong>Type:</strong> ' + escapeHtml(exam.exam_type) + ' | <strong>Date:</strong> ' + formatDate(exam.exam_date) + '</p>' +
            '</div>' +
            '<div class="search-container">' +
                '<input type="text" id="gradeSearch" placeholder="Search students..." class="search-input">' +
                '<button class="btn btn-action" id="exportGradesBtn"><i class="fas fa-download"></i> Export</button>' +
            '</div>' +
            '<div class="table-container">' +
                '<table class="grade-table">' +
                    '<thead><tr>' +
                        '<th>Student Name</th>' +
                        '<th>Student ID</th>' +
                        '<th>CAT 1 (/30)</th>' +
                        '<th>CAT 2 (/30)</th>' +
                        '<th>Final (/100)</th>' +
                        '<th>Total (/100)</th>' +
                        '<th>Grade</th>' +
                        '<th>Status</th>' +
                    '</tr></thead>' +
                    '<tbody id="gradeTableBody">' + studentRows + '</tbody>' +
                '</table>' +
            '</div>' +
            '<div class="modal-actions">' +
                '<button class="btn btn-action" id="saveGradesBtn"><i class="fas fa-save"></i> Save All Grades</button>' +
                '<button class="btn btn-delete" id="closeGradeModalBtn"><i class="fas fa-times"></i> Close</button>' +
            '</div>' +
        '</div>';
}

function calculateStudentGrade(studentId) {
    var cat1 = parseFloat(document.getElementById('cat1-' + studentId)?.value) || 0;
    var cat2 = parseFloat(document.getElementById('cat2-' + studentId)?.value) || 0;
    var final = parseFloat(document.getElementById('final-' + studentId)?.value) || 0;
    var total = (cat1 * 0.3) + (cat2 * 0.3) + (final * 0.4);
    
    var totalInput = document.getElementById('total-' + studentId);
    var gradeSpan = document.getElementById('grade-' + studentId);
    
    if (totalInput && gradeSpan) {
        totalInput.value = total.toFixed(1);
        var letter = calculateGradeLetter(total);
        gradeSpan.textContent = letter;
        gradeSpan.className = 'grade-letter ' + (total >= 50 ? 'grade-pass' : 'grade-fail');
    }
}

async function saveAllGrades(examId) {
    var rows = document.querySelectorAll('#gradeTableBody tr');
    var grades = [];
    var hasChanges = false;
    
    for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var studentId = row.querySelector('input[id^="cat1-"]')?.id.replace('cat1-', '');
        if (!studentId) continue;
        
        var cat1 = document.getElementById('cat1-' + studentId)?.value;
        var cat2 = document.getElementById('cat2-' + studentId)?.value;
        var final = document.getElementById('final-' + studentId)?.value;
        var status = document.getElementById('status-' + studentId)?.value;
        
        if (cat1 || cat2 || final) {
            hasChanges = true;
            grades.push({
                exam_id: parseInt(examId),
                student_id: studentId,
                cat_1_score: cat1 ? parseFloat(cat1) : null,
                cat_2_score: cat2 ? parseFloat(cat2) : null,
                exam_score: final ? parseFloat(final) : null,
                total_score: document.getElementById('total-' + studentId)?.value ? parseFloat(document.getElementById('total-' + studentId).value) : null,
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
        showNotification('✅ Saved ' + grades.length + ' grades!', 'success');
        closeGradeModal();
    } catch (error) {
        showNotification('Failed: ' + error.message, 'error');
    }
}

function closeGradeModal() {
    var modal = $('gradeModal');
    if (modal) modal.classList.remove('active');
}

function saveResourceEdits(e) {
    e.preventDefault();
    showNotification('Resource edits saved (placeholder).', 'info');
    closeEditResourceModal();
}

function closeEditResourceModal() {
    var modal = $('editResourceModal');
    if (modal) modal.classList.remove('active');
}

async function handleProfilePhotoChange(event) {
    var file = event.target.files[0];
    if (!file) return;
    
    var reader = new FileReader();
    reader.onload = function(e) {
        $('profileImg').src = e.target.result;
    };
    reader.readAsDataURL(file);
    
    await uploadProfilePhoto(file);
}

async function uploadProfilePhoto(file) {
    var userId = state.currentUserId;
    if (!userId) {
        showNotification('Error: User ID not found.', 'error');
        return;
    }
    
    var ext = file.name.split('.').pop();
    var path = 'avatars/' + userId + '.' + ext;
    
    try {
        await state.sb
            .storage
            .from(RESOURCES_BUCKET)
            .upload(path, file, { cacheControl: '3600', upsert: true });
        
        var { data: urlData } = state.sb
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
        showNotification('Photo upload failed: ' + error.message, 'error');
    }
}

// ============================================================
// 25. INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', initLecturerDashboard);

console.log('✅ lecturer.js loaded successfully');
console.log('📚 Program filter:', state.program);

// ============================================================
// 26. EXPOSE FUNCTIONS GLOBALLY
// ============================================================

window.loadSectionData = loadSectionData;
window.filterTable = filterTable;
window.filterTodayAttendance = filterTodayAttendance;
window.filterPastAttendance = filterPastAttendance;
window.filterStudentTable = filterStudentTable;
window.filterCoursesByAcademicPeriod = filterCoursesByAcademicPeriod;
window.switchMarksTab = switchMarksTab;
window.loadLecturerInternalMarks = loadLecturerInternalMarks;
window.loadLecturerNCKMarks = loadLecturerNCKMarks;
window.saveLecturerInternalMarks = saveLecturerInternalMarks;
window.saveAllLecturerNCKMarks = saveAllLecturerNCKMarks;
window.fillDownInternalMarks = fillDownInternalMarks;
window.fillDownNCKValues = fillDownNCKValues;
window.updateLecturerInternalTotal = updateLecturerInternalTotal;
window.updateLecturerNCKTotal = updateLecturerNCKTotal;
window.saveSingleLecturerNCK = saveSingleLecturerNCK;
window.openGradeModal = openGradeModal;
window.closeGradeModal = closeGradeModal;
window.saveAllGrades = saveAllGrades;
window.calculateStudentGrade = calculateStudentGrade;
window.openEditExamModal = openEditExamModal;
window.closeEditExamModal = closeEditExamModal;
window.saveEditedExam = saveEditedExam;
window.deleteExam = deleteExam;
window.deleteResource = deleteResource;
window.closeEditResourceModal = closeEditResourceModal;
window.closeStudentInfoModal = closeStudentInfoModal;
window.viewCheckInMap = viewCheckInMap;
window.closeMapModal = closeMapModal;
window.showSendMessageModal = showSendMessageModal;
window.viewStudentProfile = viewStudentProfile;
window.handleAddSession = handleAddSession;
window.handleAddExam = handleAddExam;
window.handleUploadResource = handleUploadResource;
window.handleSendMessage = handleSendMessage;
window.handleGenerateReport = handleGenerateReport;
window.handleSaveSettings = handleSaveSettings;
window.handleManualAttendance = handleManualAttendance;
window.lecturerCheckIn = lecturerCheckIn;
window.loadDashboard = loadDashboard;
window.loadProfile = loadProfile;
window.loadCoursesTable = loadCoursesTable;
window.loadStudentsTable = loadStudentsTable;
window.loadSessionsTable = loadSessionsTable;
window.loadAttendance = loadAttendance;
window.loadExamsTable = loadExamsTable;
window.loadResourcesTable = loadResourcesTable;
window.loadMessagesTable = loadMessagesTable;
window.loadCalendar = loadCalendar;
window.loadNurseIQ = loadNurseIQ;
window.populateSessionForm = populateSessionForm;
window.populateExamForm = populateExamForm;
window.populateResourceForm = populateResourceForm;
window.populateMessageForm = populateMessageForm;
window.loadLecturerAnalytics = loadLecturerAnalytics;
window.calculateGrade = calculateGrade;
window.calculateGradeLetter = calculateGradeLetter;
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;
window.escapeHtml = escapeHtml;
window.showNotification = showNotification;
window.showFeedback = showFeedback;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.requestAdminApproval = requestAdminApproval;


console.log('✅ All lecturer functions exported');
