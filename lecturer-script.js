// =====================================================
// LECTURER DASHBOARD - FOLLOWS SUPER ADMIN PATTERNS
// =====================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
 
// Supabase Configuration
const SUPABASE_URL = 'https://lwhtjozfsmbyihenfunw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.sb = sb;

// Global Variables
let currentUserProfile = null;
let currentUserId = null;
let allCourses = [];
let allStudents = [];
let allSessions = [];
let allExams = [];
let allResources = [];
let calendar = null;

// =====================================================
// HELPER FUNCTIONS (MATCHING SUPER ADMIN)
// =====================================================
function $(id) { return document.getElementById(id); }

function escapeHtml(s, isAttribute = false) {
    let str = String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    if (isAttribute) {
        str = str.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
    } else {
        str = str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    return str;
}

function showFeedback(message, type = 'success') {
    const prefix = type === 'success' ? '✅ Success: ' :
        type === 'error' ? '❌ Error: ' :
            type === 'warning' ? '⚠️ Warning: ' : 'ℹ️ Info: ';
    alert(prefix + message);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

async function fetchData(tableName, selectQuery = '*', filters = {}, order = 'created_at', ascending = false) {
    let query = sb.from(tableName).select(selectQuery);

    for (const key in filters) {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
            query = query.eq(key, filters[key]);
        }
    }

    query = query.order(order, { ascending });

    const { data, error } = await query;
    if (error) {
        console.error(`Error loading ${tableName}:`, error);
        return { data: null, error };
    }
    return { data, error: null };
}

// =====================================================
// PROGRAM MANAGEMENT (MATCHING SUPER ADMIN)
// =====================================================
const TVET_PROGRAMS = ['DPOTT', 'DCH', 'DHRIT', 'DSL', 'DSW', 'DCJS', 'DHSS', 'DICT', 'DME', 'CPOTT', 'CCH', 'CHRIT', 'CPC', 'CSL', 'CSW', 'CCJS', 'CAG', 'CHSS', 'CICT', 'ACH', 'AAG', 'ASW', 'CCA', 'PTE'];

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

function isTVETProgram(programCode) {
    if (!programCode) return false;
    const code = String(programCode).toUpperCase().trim();
    return TVET_PROGRAMS.includes(code);
}

function getProgramType(programCode) {
    if (!programCode) return 'KRCHN';
    const code = String(programCode).toUpperCase().trim();
    if (code === 'KRCHN') return 'KRCHN';
    if (isTVETProgram(code)) return 'TVET';
    return 'KRCHN';
}

function getProgramDisplayName(programCode) {
    if (!programCode) return 'Unknown Program';
    const code = String(programCode).toUpperCase().trim();
    return PROGRAM_DISPLAY_NAMES[code] || programCode;
}

function updateProgramDropdown(selectElement) {
    if (!selectElement) return;
    const currentValue = selectElement.value;

    selectElement.innerHTML = '';

    const krchnOption = document.createElement('option');
    krchnOption.value = 'KRCHN';
    krchnOption.textContent = '🎓 KRCHN Nursing';
    selectElement.appendChild(krchnOption);

    const diplomaGroup = document.createElement('optgroup');
    diplomaGroup.label = '🎯 TVET Diploma Programs (6-24 months)';
    ['DPOTT', 'DCH', 'DHRIT', 'DSL', 'DSW', 'DCJS', 'DHSS', 'DICT', 'DME'].forEach(code => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = PROGRAM_DISPLAY_NAMES[code] || code;
        diplomaGroup.appendChild(option);
    });
    selectElement.appendChild(diplomaGroup);

    const certificateGroup = document.createElement('optgroup');
    certificateGroup.label = '📜 TVET Certificate Programs (3-12 months)';
    ['CPOTT', 'CCH', 'CHRIT', 'CPC', 'CSL', 'CSW', 'CCJS', 'CAG', 'CHSS', 'CICT'].forEach(code => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = PROGRAM_DISPLAY_NAMES[code] || code;
        certificateGroup.appendChild(option);
    });
    selectElement.appendChild(certificateGroup);

    const artisanGroup = document.createElement('optgroup');
    artisanGroup.label = '🔧 TVET Artisan Programs (2-12 months)';
    ['ACH', 'AAG', 'ASW'].forEach(code => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = PROGRAM_DISPLAY_NAMES[code] || code;
        artisanGroup.appendChild(option);
    });
    selectElement.appendChild(artisanGroup);

    const otherGroup = document.createElement('optgroup');
    otherGroup.label = '📊 Other TVET Programs';
    ['CCA', 'PTE'].forEach(code => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = PROGRAM_DISPLAY_NAMES[code] || code;
        otherGroup.appendChild(option);
    });
    selectElement.appendChild(otherGroup);

    if (currentValue) {
        selectElement.value = currentValue;
    }
}

function updateBlockTermOptions(programSelectId, blockTermSelectId) {
    const programSelect = $(programSelectId);
    const blockTermSelect = $(blockTermSelectId);

    if (!programSelect || !blockTermSelect) {
        console.warn(`updateBlockTermOptions: Elements not found - ${programSelectId}, ${blockTermSelectId}`);
        return;
    }

    const programCode = programSelect.value;
    const programType = getProgramType(programCode);
    const currentValue = blockTermSelect.value;

    blockTermSelect.innerHTML = '<option value="">-- Select Block/Term --</option>';

    if (!programCode) {
        console.log('No program code selected');
        return;
    }

    let options = [];

    if (programType === 'KRCHN') {
        options = [
            { value: 'Introductory', text: 'Introductory Block' },
            { value: 'Block 1', text: 'Block 1' },
            { value: 'Block 2', text: 'Block 2' },
            { value: 'Block 3', text: 'Block 3' },
            { value: 'Block 4', text: 'Block 4' },
            { value: 'Block 5', text: 'Block 5' },
            { value: 'Block 6', text: 'Block 6' },
            { value: 'Final', text: 'Final Block' }
        ];
    } else if (programType === 'TVET') {
        options = [
            { value: 'Introductory', text: 'Introductory Term' },
            { value: 'Term1', text: 'Term 1' },
            { value: 'Term2', text: 'Term 2' },
            { value: 'Term3', text: 'Term 3' },
            { value: 'Term4', text: 'Term 4' },
            { value: 'Term5', text: 'Term 5' },
            { value: 'Term6', text: 'Term 6' },
            { value: 'Final', text: 'Final Term' }
        ];
    } else {
        options = [
            { value: 'Introductory', text: 'Introductory' },
            { value: 'Block A', text: 'Block A' },
            { value: 'Block B', text: 'Block B' },
            { value: 'Block C', text: 'Block C' },
            { value: 'Block D', text: 'Block D' },
            { value: 'Final', text: 'Final' }
        ];
    }

    options.push({ value: 'General', text: 'General' });

    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.text;
        blockTermSelect.appendChild(option);
    });

    if (currentValue) {
        const valueExists = Array.from(blockTermSelect.options).some(opt => opt.value === currentValue);
        if (valueExists) {
            blockTermSelect.value = currentValue;
        }
    }
}

// =====================================================
// TAB NAVIGATION (MATCHING SUPER ADMIN)
// =====================================================
window.showTab = function(tabId) {
    console.log('Opening tab:', tabId);

    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
        tab.classList.remove('active');
    });

    const targetTab = document.getElementById(tabId);
    if (targetTab) {
        targetTab.style.display = 'block';
        targetTab.classList.add('active');
    }

    document.querySelectorAll('.nav a').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-tab') === tabId) {
            link.classList.add('active');
        }
    });

    loadSectionData(tabId);
};

async function loadSectionData(tabId) {
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');

    switch (tabId) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'profile':
            loadProfile();
            break;
        case 'my-courses':
            loadCourses();
            updateProgramDropdown($('sessionProgram'));
            updateProgramDropdown($('examProgram'));
            updateProgramDropdown($('resourceProgram'));
            break;
        case 'my-students':
            loadStudents();
            break;
        case 'sessions':
            loadSessions();
            updateProgramDropdown($('sessionProgram'));
            updateBlockTermOptions('sessionProgram', 'sessionBlock');
            break;
        case 'attendance':
            loadAttendance();
            populateAttendanceSelects();
            break;
        case 'cats':
            loadExams();
            updateProgramDropdown($('examProgram'));
            updateBlockTermOptions('examProgram', 'examBlock');
            populateExamCourseSelects();
            break;
        case 'resources':
            loadResources();
            updateProgramDropdown($('resourceProgram'));
            updateBlockTermOptions('resourceProgram', 'resourceBlock');
            break;
        case 'messages':
            loadMessages();
            updateProgramDropdown($('msgRecipient'));
            break;
        case 'calendar':
            loadCalendar();
            break;
    }
}

// =====================================================
// DASHBOARD (MATCHING SUPER ADMIN)
// =====================================================
async function loadDashboardData() {
    if ($('totalStudents')) $('totalStudents').textContent = allStudents.length;
    if ($('totalCourses')) $('totalCourses').textContent = allCourses.length;
    if ($('pendingGrading')) $('pendingGrading').textContent = allExams.filter(e => e.status === 'Scheduled').length;

    const today = new Date().toISOString().slice(0, 10);
    const { count: todaySessions } = await sb.from('scheduled_sessions').select('*', { count: 'exact', head: true }).eq('session_date', today).eq('lecturer_id', currentUserId);
    if ($('todaySessions')) $('todaySessions').textContent = todaySessions || 0;

    const { count: todayAttendance } = await sb.from('geo_attendance_logs').select('*', { count: 'exact', head: true }).gte('check_in_time', today);
    if ($('todayAttendance')) $('todayAttendance').textContent = todayAttendance || 0;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString();
    const { count: weekAttendance } = await sb.from('geo_attendance_logs').select('*', { count: 'exact', head: true }).gte('check_in_time', weekAgoStr);
    if ($('weeklyAttendance')) $('weeklyAttendance').textContent = weekAttendance || 0;

    if ($('monthlyRate')) $('monthlyRate').textContent = allStudents.length ? '85%' : '0%';

    loadTodaySchedule();
}

async function loadTodaySchedule() {
    const today = new Date().toISOString().slice(0, 10);
    const { data: sessions } = await sb.from('scheduled_sessions').select('*').eq('session_date', today).eq('lecturer_id', currentUserId).order('session_time');
    const container = $('#todayScheduleList');
    if (!container) return;
    if (!sessions || sessions.length === 0) {
        container.innerHTML = 'No sessions today';
        return;
    }
    container.innerHTML = sessions.map(s => `<div class="schedule-item"><span class="schedule-time">${s.session_time || 'TBA'}</span><span>${escapeHtml(s.session_title)}</span></div>`).join('');
}

// =====================================================
// PROFILE (MATCHING SUPER ADMIN)
// =====================================================
async function loadProfile() {
    if (!currentUserProfile) return;
    if ($('profileName')) $('profileName').textContent = currentUserProfile.full_name || 'Lecturer';
    if ($('profileId')) $('profileId').textContent = currentUserProfile.employee_id || currentUserProfile.user_id?.substring(0, 8) || 'N/A';
    if ($('profileEmail')) $('profileEmail').textContent = currentUserProfile.email || 'N/A';
    if ($('profileDept')) $('profileDept').textContent = currentUserProfile.department || 'Academic';
    if ($('profileProgram')) $('profileProgram').textContent = currentUserProfile.program || 'KRCHN';
    if (currentUserProfile.avatar_url && $('#profileAvatar')) {
        $('#profileAvatar').innerHTML = `<img src="${currentUserProfile.avatar_url}" alt="Profile">`;
    }
}

// =====================================================
// COURSES (FILTERED BY LECTURER'S PROGRAM)
// =====================================================
async function loadCourses() {
    const tbody = $('coursesTableBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5">Loading courses...<\/td><\/tr>';

    const lecturerProgram = currentUserProfile?.program || 'KRCHN';
    const { data: courses, error } = await fetchData('courses', '*', { target_program: lecturerProgram }, 'course_name', true);

    if (error) {
        tbody.innerHTML = `<tr><td colspan="5">Error loading courses: ${error.message}<\/td><\/tr>`;
        return;
    }

    if (!courses || courses.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5">No courses found for ${lecturerProgram}<\/td><\/tr>`;
        return;
    }

    allCourses = courses;
    tbody.innerHTML = '';

    courses.forEach(c => {
        tbody.innerHTML += `
            <tr>
                <td><strong>${escapeHtml(c.unit_code || 'N/A')}</strong><\/td>
                <td>${escapeHtml(c.course_name)}<\/td>
                <td>${escapeHtml(c.target_program)}<\/td>
                <td>${escapeHtml(c.block || 'N/A')}<\/td>
                <td><button class="btn-action" onclick="showFeedback('Course: ${escapeHtml(c.course_name)}', 'info')">View</button><\/td>
            <\/tr>
        `;
    });

    if ($('totalCourses')) $('totalCourses').textContent = courses.length;
}

window.filterCourses = function() {
    const search = $('#courseSearch')?.value.toLowerCase() || '';
    const rows = document.querySelectorAll('#coursesTableBody tr');
    rows.forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(search) ? '' : 'none';
    });
};

// =====================================================
// STUDENTS (FILTERED BY LECTURER'S PROGRAM)
// =====================================================
async function loadStudents() {
    const tbody = $('studentsTableBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="7">Loading students...<\/td><\/tr>';

    const lecturerProgram = currentUserProfile?.program || 'KRCHN';
    const { data: students, error } = await sb
        .from('consolidated_user_profiles_table')
        .select('*')
        .eq('role', 'student')
        .eq('program', lecturerProgram)
        .order('full_name', { ascending: true });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="7">Error loading students: ${error.message}<\/td><\/tr>`;
        return;
    }

    if (!students || students.length === 0) {
        tbody.innerHTML = `<td><td colspan="7">No students found for ${lecturerProgram}<\/td><\/tr>`;
        return;
    }

    allStudents = students;
    tbody.innerHTML = '';

    students.forEach(s => {
        const status = (s.cumulative_absences || 0) > 5 ? 'At Risk' : 'Active';
        const statusClass = (s.cumulative_absences || 0) > 5 ? 'badge-danger' : 'badge-success';
        tbody.innerHTML += `
            <tr>
                <td>${escapeHtml(s.full_name || 'N/A')}<\/td>
                <td><strong>${escapeHtml(s.student_id || 'N/A')}<\/strong><\/td>
                <td>${escapeHtml(s.email || 'N/A')}<\/td>
                <td>${escapeHtml(s.program)}<\/td>
                <td>${escapeHtml(s.block || 'N/A')}<\/td>
                <td><span class="${statusClass}">${status}<\/span><\/td>
                <td><button class="btn-action" onclick="viewStudentDetails('${s.user_id}')">View</button><\/td>
            <\/tr>
        `;
    });

    if ($('totalStudents')) $('totalStudents').textContent = students.length;
}

window.filterStudents = function() {
    const search = $('#studentSearch')?.value.toLowerCase() || '';
    const statusFilter = $('#studentStatusFilter')?.value || 'all';
    const rows = document.querySelectorAll('#studentsTableBody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        const status = row.cells[5]?.textContent?.toLowerCase() || '';
        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'active' && !status.includes('risk')) ||
            (statusFilter === 'at-risk' && status.includes('risk'));
        row.style.display = (text.includes(search) && matchesStatus) ? '' : 'none';
    });
};

window.viewStudentDetails = async function(studentId) {
    const student = allStudents.find(s => s.user_id === studentId);
    if (!student) return;
    $('#studentDetailTitle').textContent = `${student.full_name} - Student Details`;
    $('#studentDetailBody').innerHTML = `
        <p><strong>Email:</strong> ${escapeHtml(student.email)}</p>
        <p><strong>Program:</strong> ${escapeHtml(student.program)}</p>
        <p><strong>Block:</strong> ${escapeHtml(student.block)}</p>
        <p><strong>Intake:</strong> ${escapeHtml(student.intake_year)}</p>
        <p><strong>Absences:</strong> ${student.cumulative_absences || 0}</p>
        <button class="btn-action" onclick="showFeedback('Send message to ${escapeHtml(student.full_name)}', 'info')">Send Message</button>
    `;
    $('#studentDetailModal').style.display = 'flex';
};

// =====================================================
// SESSIONS (MATCHING SUPER ADMIN)
// =====================================================
async function loadSessions() {
    const tbody = $('#sessionsTableBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5">Loading sessions...<\/td><\/tr>';

    const { data: sessions, error } = await fetchData('scheduled_sessions', '*', { lecturer_id: currentUserId }, 'session_date', false);

    if (error) {
        tbody.innerHTML = `<tr><td colspan="5">Error loading sessions: ${error.message}<\/td><\/tr>`;
        return;
    }

    if (!sessions || sessions.length === 0) {
        tbody.innerHTML = '<td><td colspan="5">No sessions scheduled<\/td><\/tr>';
        return;
    }

    allSessions = sessions;
    tbody.innerHTML = '';

    sessions.forEach(s => {
        const link = `${window.location.origin}/attendance?session=${s.id}`;
        tbody.innerHTML += `
            <tr>
                <td>${escapeHtml(s.session_title)}<\/td>
                <td>${new Date(s.session_date).toLocaleDateString()} @ ${s.session_time}<\/td>
                <td>${escapeHtml(s.target_program)}/${escapeHtml(s.block_term)}<\/td>
                <td><button class="btn-action" onclick="navigator.clipboard.writeText('${link}'); showFeedback('Link copied!', 'success')">Copy Link</button><\/td>
                <td><button class="btn-danger" onclick="deleteSession('${s.id}')">Delete</button><\/td>
            <\/tr>
        `;
    });
}

window.deleteSession = async function(sessionId) {
    if (!confirm('Delete this session?')) return;
    const { error } = await sb.from('scheduled_sessions').delete().eq('id', sessionId);
    if (error) {
        showFeedback(`Failed to delete session: ${error.message}`, 'error');
    } else {
        showFeedback('Session deleted successfully!', 'success');
        loadSessions();
        loadDashboardData();
    }
};

$('#addSessionForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitter = e.submitter;
    const originalText = submitter?.textContent;
    if (submitter) {
        submitter.disabled = true;
        submitter.textContent = 'Processing...';
    }

    const sessionData = {
        session_title: $('#sessionTitle').value,
        session_date: $('#sessionDate').value,
        session_time: $('#sessionTime').value,
        target_program: $('#sessionProgram').value,
        block_term: $('#sessionBlock').value,
        lecturer_id: currentUserId
    };

    const { error } = await sb.from('scheduled_sessions').insert([sessionData]);

    if (error) {
        showFeedback(`Failed to schedule session: ${error.message}`, 'error');
    } else {
        showFeedback('Session scheduled successfully!', 'success');
        e.target.reset();
        loadSessions();
        loadDashboardData();
    }

    if (submitter) {
        submitter.disabled = false;
        submitter.textContent = originalText;
    }
});

// =====================================================
// ATTENDANCE (MATCHING SUPER ADMIN)
// =====================================================
async function populateAttendanceSelects() {
    const lecturerProgram = currentUserProfile?.program || 'KRCHN';
    const { data: students } = await sb
        .from('consolidated_user_profiles_table')
        .select('user_id, full_name, student_id')
        .eq('role', 'student')
        .eq('program', lecturerProgram)
        .order('full_name', true);
    populateSelect($('attStudentId'), students, 'user_id', 'full_name', 'Select Student');
}

function populateSelect(selectElement, data, valueKey, textKey, defaultText) {
    if (!selectElement) return;
    selectElement.innerHTML = `<option value="">-- ${defaultText} --</option>`;
    data?.forEach(item => {
        const text = item[textKey] || item[valueKey];
        selectElement.innerHTML += `<option value="${item[valueKey]}">${escapeHtml(text)}</option>`;
    });
}

$('#manualAttendanceForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitter = e.submitter;
    const originalText = submitter?.textContent;
    if (submitter) {
        submitter.disabled = true;
        submitter.textContent = 'Processing...';
    }

    const studentId = $('#attStudentId').value;
    const sessionType = $('#attSessionType').value;
    const date = $('#attDate').value;
    const location = $('#attLocation').value;

    if (!studentId) {
        showFeedback('Please select a student', 'error');
        if (submitter) {
            submitter.disabled = false;
            submitter.textContent = originalText;
        }
        return;
    }

    const checkInTime = date ? new Date(date).toISOString() : new Date().toISOString();

    const attendanceData = {
        user_id: studentId,
        session_type: sessionType,
        check_in_time: checkInTime,
        location_details: location || 'Manual Entry',
        recorded_by_id: currentUserId,
        recorded_by_name: currentUserProfile?.full_name,
        program: currentUserProfile?.program,
        is_manual_entry: true
    };

    const { error } = await sb.from('geo_attendance_logs').insert([attendanceData]);

    if (error) {
        showFeedback(`Failed to record attendance: ${error.message}`, 'error');
    } else {
        showFeedback('Attendance recorded successfully!', 'success');
        e.target.reset();
        loadAttendance();
        loadDashboardData();
    }

    if (submitter) {
        submitter.disabled = false;
        submitter.textContent = originalText;
    }
});

window.markLecturerAttendance = function() {
    if (!navigator.geolocation) {
        showFeedback('Geolocation is not supported by this browser.', 'error');
        return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
        const checkInData = {
            user_id: currentUserId,
            session_type: 'Lecturer Check-in',
            check_in_time: new Date().toISOString(),
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            location_name: 'Lecturer Check-in',
            program: currentUserProfile?.program,
            recorded_by_id: currentUserId
        };

        const { error } = await sb.from('geo_attendance_logs').insert([checkInData]);
        if (error) {
            showFeedback(`Check-in failed: ${error.message}`, 'error');
        } else {
            showFeedback('Check-in recorded successfully!', 'success');
            loadAttendance();
            loadDashboardData();
        }
    }, () => {
        showFeedback('Unable to get your location. Please enable location services.', 'error');
    });
};

async function loadAttendance() {
    const tbody = $('#attendanceTableBody');
    if (!tbody) return;

    tbody.innerHTML = '</table><td colspan="6">Loading attendance...<\/td><\/tr>';

    const today = new Date().toISOString().slice(0, 10);
    const { data: records, error } = await sb
        .from('geo_attendance_logs')
        .select('*')
        .gte('check_in_time', today)
        .order('check_in_time', false);

    if (error) {
        tbody.innerHTML = `<tr><td colspan="6">Error loading attendance: ${error.message}<\/td><\/tr>`;
        return;
    }

    if (!records || records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">No attendance records today<\/td><\/tr>';
        return;
    }

    tbody.innerHTML = '';
    records.forEach(r => {
        const student = allStudents.find(s => s.user_id === r.user_id);
        tbody.innerHTML += `
            <tr>
                <td>${escapeHtml(r.student_name || student?.full_name || 'N/A')}<\/td>
                <td>${escapeHtml(student?.student_id || 'N/A')}<\/td>
                <td>${escapeHtml(r.session_type || 'N/A')}<\/td>
                <td>${new Date(r.check_in_time).toLocaleTimeString()}<\/td>
                <td>${escapeHtml(r.location_details || r.location_name || 'N/A')}<\/td>
                <td><button class="btn-danger" onclick="deleteAttendanceRecord('${r.id}')">Delete</button><\/td>
            <\/tr>
        `;
    });
}

window.deleteAttendanceRecord = async function(recordId) {
    if (!confirm('Delete this attendance record?')) return;
    const { error } = await sb.from('geo_attendance_logs').delete().eq('id', recordId);
    if (error) {
        showFeedback(`Failed to delete record: ${error.message}`, 'error');
    } else {
        showFeedback('Record deleted successfully!', 'success');
        loadAttendance();
        loadDashboardData();
    }
};

// =====================================================
// EXAMS (MATCHING SUPER ADMIN)
// =====================================================
async function populateExamCourseSelects() {
    const program = $('#examProgram')?.value;
    const courseSelect = $('#examCourse');

    if (!courseSelect) return;

    courseSelect.innerHTML = '<option value="">-- Select Course (Optional) --</option>';

    if (!program) return;

    const { data: courses } = await fetchData('courses', 'id, course_name', { target_program: program }, 'course_name', true);
    if (courses && courses.length > 0) {
        courses.forEach(c => {
            const option = document.createElement('option');
            option.value = c.id;
            option.textContent = c.course_name;
            courseSelect.appendChild(option);
        });
    }
}

$('#addExamForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitter = e.submitter;
    const originalText = submitter?.textContent;
    if (submitter) {
        submitter.disabled = true;
        submitter.textContent = 'Processing...';
    }

    const examData = {
        exam_name: $('#examTitle').value,
        exam_date: $('#examDate').value,
        exam_type: $('#examType').value,
        target_program: $('#examProgram').value,
        block_term: $('#examBlock').value,
        course_id: $('#examCourse').value || null,
        duration_minutes: 120,
        status: 'Scheduled',
        created_by: currentUserId
    };

    const { error } = await sb.from('exams').insert([examData]);

    if (error) {
        showFeedback(`Failed to create exam: ${error.message}`, 'error');
    } else {
        showFeedback('Exam created successfully!', 'success');
        e.target.reset();
        loadExams();
        loadDashboardData();
    }

    if (submitter) {
        submitter.disabled = false;
        submitter.textContent = originalText;
    }
});

async function loadExams() {
    const tbody = $('#examsTableBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6">Loading exams...<\/td><\/tr>';

    const { data: exams, error } = await fetchData('exams', '*, course:course_id(course_name)', { created_by: currentUserId }, 'exam_date', false);

    if (error) {
        tbody.innerHTML = `<tr><td colspan="6">Error loading exams: ${error.message}<\/td><\/tr>`;
        return;
    }

    if (!exams || exams.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">No exams created<\/td><\/tr>';
        return;
    }

    allExams = exams;
    tbody.innerHTML = '';

    exams.forEach(e => {
        const courseName = e.course?.course_name || 'N/A';
        tbody.innerHTML += `
            <tr>
                <td><span class="badge badge-info">${escapeHtml(e.exam_type)}<\/span><\/td>
                <td><strong>${escapeHtml(e.exam_name)}<\/strong><\/td>
                <td>${escapeHtml(courseName)}<\/td>
                <td>${escapeHtml(e.target_program)}/${escapeHtml(e.block_term)}<\/td>
                <td>${new Date(e.exam_date).toLocaleDateString()}<\/td>
                <td><span class="badge badge-warning">${escapeHtml(e.status)}<\/span><\/td>
                <td><button class="btn-action" onclick="openGradeModal('${e.id}')">Grade</button> <button class="btn-danger" onclick="deleteExam('${e.id}')">Delete</button><\/td>
            <\/tr>
        `;
    });
}

window.deleteExam = async function(examId) {
    if (!confirm('Delete this exam?')) return;
    const { error } = await sb.from('exams').delete().eq('id', examId);
    if (error) {
        showFeedback(`Failed to delete exam: ${error.message}`, 'error');
    } else {
        showFeedback('Exam deleted successfully!', 'success');
        loadExams();
        loadDashboardData();
    }
};

window.openGradeModal = function(examId) {
    showFeedback('Grade modal coming soon', 'info');
};

window.saveGrades = function() {
    closeModal('gradeModal');
    showFeedback('Grades saved', 'success');
};

// =====================================================
// RESOURCES (MATCHING SUPER ADMIN)
// =====================================================
$('#uploadResourceForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitter = e.submitter;
    const originalText = submitter?.textContent;
    if (submitter) {
        submitter.disabled = true;
        submitter.textContent = 'Processing...';
    }

    const fileInput = $('#resourceFile');
    if (!fileInput.files.length) {
        showFeedback('Please select a file', 'error');
        if (submitter) {
            submitter.disabled = false;
            submitter.textContent = originalText;
        }
        return;
    }

    const file = fileInput.files[0];
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `lecturer_resources/${currentUserId}/${fileName}`;

    const { error: uploadError } = await sb.storage.from('resources').upload(filePath, file);
    if (uploadError) {
        showFeedback(`Upload failed: ${uploadError.message}`, 'error');
        if (submitter) {
            submitter.disabled = false;
            submitter.textContent = originalText;
        }
        return;
    }

    const { data: urlData } = sb.storage.from('resources').getPublicUrl(filePath);

    const resourceData = {
        title: $('#resourceTitle').value,
        file_path: filePath,
        file_url: urlData.publicUrl,
        program_type: $('#resourceProgram').value,
        block: $('#resourceBlock').value,
        uploaded_by: currentUserId,
        uploaded_by_name: currentUserProfile?.full_name,
        created_at: new Date().toISOString()
    };

    const { error: dbError } = await sb.from('resources').insert([resourceData]);

    if (dbError) {
        showFeedback(`Failed to save resource: ${dbError.message}`, 'error');
    } else {
        showFeedback('Resource uploaded successfully!', 'success');
        e.target.reset();
        loadResources();
    }

    if (submitter) {
        submitter.disabled = false;
        submitter.textContent = originalText;
    }
});

async function loadResources() {
    const tbody = $('#resourcesTableBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="4">Loading resources...<\/td><\/tr>';

    const { data: resources, error } = await fetchData('resources', '*', { uploaded_by: currentUserId }, 'created_at', false);

    if (error) {
        tbody.innerHTML = `<tr><td colspan="4">Error loading resources: ${error.message}<\/td><\/tr>`;
        return;
    }

    if (!resources || resources.length === 0) {
        tbody.innerHTML = '<td><td colspan="4">No resources uploaded<\/td><\/tr>';
        return;
    }

    allResources = resources;
    tbody.innerHTML = '';

    resources.forEach(r => {
        tbody.innerHTML += `
            <tr>
                <td>${escapeHtml(r.title)}<\/td>
                <td>${escapeHtml(r.program_type)}/${escapeHtml(r.block)}<\/td>
                <td>${new Date(r.created_at).toLocaleDateString()}<\/td>
                <td><a href="${r.file_url}" target="_blank" class="btn-action">Download</a> <button class="btn-danger" onclick="deleteResource('${r.id}')">Delete</button><\/td>
            <\/tr>
        `;
    });
}

window.deleteResource = async function(resourceId) {
    if (!confirm('Delete this resource?')) return;
    const { error } = await sb.from('resources').delete().eq('id', resourceId);
    if (error) {
        showFeedback(`Failed to delete resource: ${error.message}`, 'error');
    } else {
        showFeedback('Resource deleted successfully!', 'success');
        loadResources();
    }
};

// =====================================================
// MESSAGES (MATCHING SUPER ADMIN)
// =====================================================
async function loadMessages() {
    const lecturerProgram = currentUserProfile?.program || 'KRCHN';
    const { data: students } = await sb
        .from('consolidated_user_profiles_table')
        .select('user_id, full_name')
        .eq('role', 'student')
        .eq('program', lecturerProgram)
        .order('full_name', true);

    const recipientSelect = $('#msgRecipient');
    if (recipientSelect) {
        recipientSelect.innerHTML = '<option value="">-- Select Student --</option>';
        students?.forEach(s => {
            recipientSelect.innerHTML += `<option value="${s.user_id}">${escapeHtml(s.full_name)}</option>`;
        });
    }

    const tbody = $('#messagesTableBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="4">Loading messages...<\/td><\/tr>';

    const { data: messages, error } = await fetchData('notifications', '*', { sender_id: currentUserId }, 'created_at', false);

    if (error) {
        tbody.innerHTML = `<td><td colspan="4">Error loading messages: ${error.message}<\/td><\/tr>`;
        return;
    }

    if (!messages || messages.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">No messages sent<\/td><\/tr>';
        return;
    }

    tbody.innerHTML = '';
    messages.forEach(m => {
        const recipient = students?.find(s => s.user_id === m.target_user_id)?.full_name || 'All';
        tbody.innerHTML += `
            <tr>
                <td>${new Date(m.created_at).toLocaleDateString()}<\/td>
                <td>${escapeHtml(m.subject)}<\/td>
                <td>${escapeHtml(recipient)}<\/td>
                <td><span class="badge badge-success">Sent<\/span><\/td>
            <\/tr>
        `;
    });
}

$('#sendMessageForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitter = e.submitter;
    const originalText = submitter?.textContent;
    if (submitter) {
        submitter.disabled = true;
        submitter.textContent = 'Processing...';
    }

    const messageData = {
        target_user_id: $('#msgRecipient').value,
        subject: $('#msgSubject').value,
        message: $('#msgBody').value,
        sender_id: currentUserId,
        sender_name: currentUserProfile?.full_name,
        target_program: currentUserProfile?.program
    };

    const { error } = await sb.from('notifications').insert([messageData]);

    if (error) {
        showFeedback(`Failed to send message: ${error.message}`, 'error');
    } else {
        showFeedback('Message sent successfully!', 'success');
        e.target.reset();
        loadMessages();
    }

    if (submitter) {
        submitter.disabled = false;
        submitter.textContent = originalText;
    }
});

// =====================================================
// CALENDAR (MATCHING SUPER ADMIN)
// =====================================================
async function loadCalendar() {
    const calendarEl = $('#calendarDisplay');
    if (!calendarEl) return;

    const { data: sessions } = await fetchData('scheduled_sessions', 'id, session_title, session_date', { lecturer_id: currentUserId }, 'session_date', true);

    const events = (sessions || []).map(s => ({
        id: s.id,
        title: s.session_title,
        start: s.session_date,
        color: '#4C1D95'
    }));

    if (calendar) calendar.destroy();
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek'
        },
        events: events,
        eventClick: function(info) {
            showFeedback(`Session: ${info.event.title}`, 'info');
        }
    });
    calendar.render();
}

// =====================================================
// PHOTO UPLOAD
// =====================================================
$('#uploadPhotoBtn')?.addEventListener('click', () => $('#photoInput').click());
$('#photoInput')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileName = `avatars/${currentUserId}_${Date.now()}.jpg`;
    const { error: uploadError } = await sb.storage.from('resources').upload(fileName, file);
    if (uploadError) {
        showFeedback(`Upload failed: ${uploadError.message}`, 'error');
        return;
    }

    const { data: urlData } = sb.storage.from('resources').getPublicUrl(fileName);
    const { error: updateError } = await sb
        .from('consolidated_user_profiles_table')
        .update({ avatar_url: urlData.publicUrl })
        .eq('user_id', currentUserId);

    if (updateError) {
        showFeedback(`Failed to update profile: ${updateError.message}`, 'error');
    } else {
        showFeedback('Photo updated successfully!', 'success');
        loadProfile();
    }
});

// =====================================================
// EXPORT FUNCTIONS
// =====================================================
window.exportCourses = function() {
    showFeedback('Export feature coming soon', 'info');
};

window.exportStudents = function() {
    showFeedback('Export feature coming soon', 'info');
};

// =====================================================
// LOGOUT (MATCHING SUPER ADMIN)
// =====================================================
window.logout = async function() {
    await sb.auth.signOut();
    window.location.href = 'login.html';
};

// =====================================================
// INITIALIZATION (MATCHING SUPER ADMIN)
// =====================================================
async function initSession() {
    const { data: { session }, error: sessionError } = await sb.auth.getSession();

    if (sessionError || !session) {
        console.warn("Session check failed, redirecting to login.");
        window.location.href = "login.html";
        return;
    }

    currentUserId = session.user.id;

    const { data: profile, error: profileError } = await sb
        .from('consolidated_user_profiles_table')
        .select('*')
        .eq('user_id', currentUserId)
        .maybeSingle();

    if (profileError || !profile) {
        console.error("Profile not found or fetch error:", profileError?.message);
        window.location.href = "login.html";
        return;
    }

    if (profile.role !== 'lecturer') {
        console.warn(`User ${session.user.email} is not a Lecturer. Redirecting.`);
        window.location.href = "login.html";
        return;
    }

    currentUserProfile = profile;
    document.querySelector('header h1').innerHTML = `Welcome, ${profile.full_name || 'Lecturer'}!`;

    // Load initial data
    await loadCourses();
    await loadStudents();
    await loadDashboardData();
    await loadProfile();
    await loadSessions();
    await loadExams();
    await loadResources();
    await loadMessages();

    // Setup event listeners
    setupEventListeners();
}

function setupEventListeners() {
    // Session form
    const sessionProgram = $('#sessionProgram');
    if (sessionProgram) {
        updateProgramDropdown(sessionProgram);
        sessionProgram.addEventListener('change', () => updateBlockTermOptions('sessionProgram', 'sessionBlock'));
    }

    // Exam form
    const examProgram = $('#examProgram');
    if (examProgram) {
        updateProgramDropdown(examProgram);
        examProgram.addEventListener('change', () => {
            updateBlockTermOptions('examProgram', 'examBlock');
            populateExamCourseSelects();
        });
    }

    // Resource form
    const resourceProgram = $('#resourceProgram');
    if (resourceProgram) {
        updateProgramDropdown(resourceProgram);
        resourceProgram.addEventListener('change', () => updateBlockTermOptions('resourceProgram', 'resourceBlock'));
    }

    // Mobile navigation
    const mobileToggle = $('#mobileNavToggle');
    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            $('#sidebar')?.classList.toggle('active');
        });
    }

    // Close sidebar when clicking nav links (mobile)
    document.querySelectorAll('.nav a').forEach(link => {
        link.addEventListener('click', () => {
            $('#sidebar')?.classList.remove('active');
        });
    });
}

// Initialize modals
function initializeModals() {
    document.querySelectorAll('.modal .close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    });
}

// Start the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing Lecturer Dashboard...');
    initializeModals();
    initSession();
    console.log('✅ Dashboard initialization complete');
});
