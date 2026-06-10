// =====================================================
// LECTURER DASHBOARD - COMPLETE WORKING SCRIPT
// =====================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

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

function $(id) { return document.getElementById(id); }

function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
}

function showFeedback(message, type = 'success') {
    const prefix = type === 'success' ? '✅ ' : type === 'error' ? '❌ ' : 'ℹ️ ';
    alert(prefix + message);
}

function closeModal(modalId) {
    const modal = $(modalId);
    if (modal) modal.style.display = 'none';
}

// =====================================================
// TAB NAVIGATION
// =====================================================
window.showTab = function(tabId) {
    console.log('Opening tab:', tabId);

    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
        tab.classList.remove('active');
    });

    const targetTab = $(tabId);
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
    switch (tabId) {
        case 'dashboard': loadDashboardData(); break;
        case 'profile': loadProfile(); break;
        case 'my-courses': loadCourses(); break;
        case 'my-students': loadStudents(); break;
        case 'sessions': loadSessions(); break;
        case 'attendance': loadAttendance(); break;
        case 'cats': loadExams(); break;
        case 'resources': loadResources(); break;
        case 'messages': loadMessages(); break;
        case 'calendar': loadCalendar(); break;
    }
}

// =====================================================
// DASHBOARD
// =====================================================
async function loadDashboardData() {
    const totalStudentsEl = $('#totalStudents');
    const totalCoursesEl = $('#totalCourses');
    
    if (totalStudentsEl) totalStudentsEl.textContent = allStudents.length;
    if (totalCoursesEl) totalCoursesEl.textContent = allCourses.length;
    
    const today = new Date().toISOString().slice(0, 10);
    const { count: todaySessions } = await sb.from('scheduled_sessions').select('*', { count: 'exact', head: true }).eq('session_date', today).eq('lecturer_id', currentUserId);
    const todaySessionsEl = $('#todaySessions');
    if (todaySessionsEl) todaySessionsEl.textContent = todaySessions || 0;

    const { count: todayAttendance } = await sb.from('geo_attendance_logs').select('*', { count: 'exact', head: true }).gte('check_in_time', today);
    const todayAttendanceEl = $('#todayAttendance');
    if (todayAttendanceEl) todayAttendanceEl.textContent = todayAttendance || 0;
}

// =====================================================
// PROFILE
// =====================================================
async function loadProfile() {
    if (!currentUserProfile) return;
    const profileNameEl = $('#profileName');
    const profileIdEl = $('#profileId');
    const profileEmailEl = $('#profileEmail');
    const profileDeptEl = $('#profileDept');
    const profileProgramEl = $('#profileProgram');
    
    if (profileNameEl) profileNameEl.textContent = currentUserProfile.full_name || 'Lecturer';
    if (profileIdEl) profileIdEl.textContent = currentUserProfile.user_id?.substring(0, 8) || 'N/A';
    if (profileEmailEl) profileEmailEl.textContent = currentUserProfile.email || 'N/A';
    if (profileDeptEl) profileDeptEl.textContent = currentUserProfile.department || 'Academic';
    if (profileProgramEl) profileProgramEl.textContent = currentUserProfile.program || 'KRCHN';
}

// =====================================================
// COURSES - FIXED
// =====================================================
async function loadCourses() {
    console.log('Loading courses...');
    const tbody = $('#coursesTableBody');
    if (!tbody) return;

    tbody.innerHTML = '<td><td colspan="5"><div class="loading-spinner"></div> Loading courses...<\/td><\/tr>';

    const program = currentUserProfile?.program || 'KRCHN';
    const { data: courses, error } = await sb.from('courses').select('*').eq('target_program', program);

    if (error) {
        tbody.innerHTML = `<tr><td colspan="5">Error: ${error.message}<\/td><\/tr>`;
        return;
    }

    allCourses = courses || [];
    if (allCourses.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5">No courses found for ${program}<\/td><\/tr>`;
        return;
    }

    tbody.innerHTML = '';
    allCourses.forEach(c => {
        tbody.innerHTML += `
            <tr>
                <td>${escapeHtml(c.unit_code || 'N/A')}<\/td>
                <td>${escapeHtml(c.course_name)}<\/td>
                <td>${escapeHtml(c.target_program)}<\/td>
                <td>${escapeHtml(c.block || 'N/A')}<\/td>
                <td><button class="btn-action" onclick="showFeedback('Course: ${escapeHtml(c.course_name)}', 'info')">View</button><\/td>
            <\/tr>
        `;
    });
    console.log(`✅ Loaded ${allCourses.length} courses`);
}

window.filterCourses = function() {
    const search = $('#courseSearch')?.value.toLowerCase() || '';
    const rows = document.querySelectorAll('#coursesTableBody tr');
    rows.forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(search) ? '' : 'none';
    });
};

// =====================================================
// STUDENTS - FIXED
// =====================================================
async function loadStudents() {
    console.log('Loading students...');
    const tbody = $('#studentsTableBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="7"><div class="loading-spinner"></div> Loading students...<\/td><\/tr>';

    const program = currentUserProfile?.program || 'KRCHN';
    const { data: students, error } = await sb
        .from('consolidated_user_profiles_table')
        .select('*')
        .eq('role', 'student')
        .eq('program', program);

    if (error) {
        tbody.innerHTML = `<tr><td colspan="7">Error: ${error.message}<\/td><\/tr>`;
        return;
    }

    allStudents = students || [];
    if (allStudents.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7">No students found for ${program}<\/td><\/tr>`;
        return;
    }

    tbody.innerHTML = '';
    allStudents.forEach(s => {
        const status = (s.cumulative_absences || 0) > 5 ? 'At Risk' : 'Active';
        const statusClass = (s.cumulative_absences || 0) > 5 ? 'badge-danger' : 'badge-success';
        tbody.innerHTML += `
            <tr>
                <td>${escapeHtml(s.full_name || 'N/A')}<\/td>
                <td>${escapeHtml(s.student_id || 'N/A')}<\/td>
                <td>${escapeHtml(s.email || 'N/A')}<\/td>
                <td>${escapeHtml(s.program)}<\/td>
                <td>${escapeHtml(s.block || 'N/A')}<\/td>
                <td><span class="${statusClass}">${status}<\/span><\/td>
                <td><button class="btn-action" onclick="viewStudentDetails('${s.user_id}')">View</button><\/td>
            <\/tr>
        `;
    });
    console.log(`✅ Loaded ${allStudents.length} students`);
}

window.filterStudents = function() {
    const search = $('#studentSearch')?.value.toLowerCase() || '';
    const rows = document.querySelectorAll('#studentsTableBody tr');
    rows.forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(search) ? '' : 'none';
    });
};

window.viewStudentDetails = function(studentId) {
    const student = allStudents.find(s => s.user_id === studentId);
    if (!student) return;
    const titleEl = $('#studentDetailTitle');
    const bodyEl = $('#studentDetailBody');
    if (titleEl) titleEl.textContent = `${student.full_name} - Student Details`;
    if (bodyEl) {
        bodyEl.innerHTML = `
            <p><strong>Email:</strong> ${escapeHtml(student.email)}</p>
            <p><strong>Program:</strong> ${escapeHtml(student.program)}</p>
            <p><strong>Block:</strong> ${escapeHtml(student.block)}</p>
            <p><strong>Absences:</strong> ${student.cumulative_absences || 0}</p>
            <button class="btn-action" onclick="showFeedback('Message feature coming', 'info')">Send Message</button>
        `;
    }
    $('#studentDetailModal').style.display = 'flex';
};

// =====================================================
// SESSIONS
// =====================================================
$('#addSessionForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { error } = await sb.from('scheduled_sessions').insert({
        session_title: $('#sessionTitle').value,
        session_date: $('#sessionDate').value,
        session_time: $('#sessionTime').value,
        target_program: $('#sessionProgram').value,
        block_term: $('#sessionBlock').value,
        lecturer_id: currentUserId
    });
    if (error) { showFeedback(error.message, 'error'); return; }
    showFeedback('Session scheduled!', 'success');
    e.target.reset();
    loadSessions();
});

async function loadSessions() {
    const tbody = $('#sessionsTableBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5"><div class="loading-spinner"></div> Loading sessions...<\/td><\/tr>';

    const { data: sessions, error } = await sb.from('scheduled_sessions').select('*').eq('lecturer_id', currentUserId).order('session_date', false);

    if (error) {
        tbody.innerHTML = `<tr><td colspan="5">Error: ${error.message}<\/td><\/tr>`;
        return;
    }

    if (!sessions || sessions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No sessions scheduled<\/td><\/tr>';
        return;
    }

    tbody.innerHTML = '';
    sessions.forEach(s => {
        const link = `${window.location.origin}/attendance?session=${s.id}`;
        tbody.innerHTML += `
            <tr>
                <td>${escapeHtml(s.session_title)}<\/td>
                <td>${new Date(s.session_date).toLocaleDateString()} @ ${s.session_time}<\/td>
                <td>${s.target_program}/${s.block_term}<\/td>
                <td><button class="btn-action" onclick="navigator.clipboard.writeText('${link}'); showFeedback('Link copied!', 'success')">Copy Link<\/button><\/td>
                <td><button class="btn-danger" onclick="deleteSession('${s.id}')">Delete<\/button><\/td>
            <\/tr>
        `;
    });
}

window.deleteSession = async (id) => {
    if (confirm('Delete this session?')) {
        await sb.from('scheduled_sessions').delete().eq('id', id);
        loadSessions();
        showFeedback('Session deleted', 'success');
    }
};

// =====================================================
// ATTENDANCE - FIXED (SHOWS ALL RECORDS)
// =====================================================
async function loadAttendance() {
    console.log('Loading attendance...');
    
    const tbody = $('#attendanceTableBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6"><div class="loading-spinner"></div> Loading attendance...<\/td><\/tr>';

    const { data: records, error } = await sb
        .from('geo_attendance_logs')
        .select('*')
        .order('check_in_time', { ascending: false })
        .limit(50);

    if (error) {
        tbody.innerHTML = `<tr><td colspan="6">Error: ${error.message}<\/td><\/tr>`;
        return;
    }

    if (!records || records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">No attendance records found. Click "Mark My Attendance" to add one.<\/td><\/tr>';
        return;
    }

    tbody.innerHTML = '';
    records.forEach(r => {
        const student = allStudents.find(s => s.user_id === r.user_id);
        const dateTime = new Date(r.check_in_time).toLocaleString();
        tbody.innerHTML += `
            <tr>
                <td>${escapeHtml(r.student_name || student?.full_name || 'N/A')}<\/td>
                <td>${escapeHtml(student?.student_id || r.user_id?.substring(0, 8) || 'N/A')}<\/td>
                <td>${escapeHtml(r.session_type || 'Check-in')}<\/td>
                <td>${dateTime}<\/td>
                <td>${escapeHtml(r.location_details || r.location_name || 'N/A')}<\/td>
                <td><button class="btn-danger" onclick="deleteAttendanceRecord('${r.id}')">Delete</button><\/td>
            <\/tr>
        `;
    });
    
    console.log(`✅ Loaded ${records.length} attendance records`);
}

window.markLecturerAttendance = function() {
    if (!navigator.geolocation) {
        showFeedback('Geolocation not supported', 'error');
        return;
    }
    navigator.geolocation.getCurrentPosition(async (pos) => {
        const { error } = await sb.from('geo_attendance_logs').insert({
            user_id: currentUserId,
            user_role: 'lecturer',
            session_type: 'Lecturer Check-in',
            check_in_time: new Date().toISOString(),
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            location_name: 'Lecturer Check-in',
            recorded_by_id: currentUserId
        });
        if (error) { showFeedback(error.message, 'error'); return; }
        showFeedback('Check-in recorded!', 'success');
        loadAttendance();
    }, () => showFeedback('Location access denied', 'error'));
};

$('#manualAttendanceForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const student = allStudents.find(s => s.user_id === $('#attStudentId').value);
    if (!student) { showFeedback('Select a student', 'error'); return; }
    
    const { error } = await sb.from('geo_attendance_logs').insert({
        user_id: $('#attStudentId').value,
        student_name: student.full_name,
        user_role: 'student',
        session_type: $('#attSessionType').value,
        check_in_time: new Date().toISOString(),
        location_details: $('#attLocation').value || 'Manual Entry',
        recorded_by_id: currentUserId,
        recorded_by_name: currentUserProfile?.full_name,
        program: currentUserProfile?.program
    });
    if (error) { showFeedback(error.message, 'error'); return; }
    showFeedback('Attendance recorded!', 'success');
    e.target.reset();
    loadAttendance();
});

window.deleteAttendanceRecord = async function(recordId) {
    if (!confirm('Delete this attendance record?')) return;
    const { error } = await sb.from('geo_attendance_logs').delete().eq('id', recordId);
    if (error) {
        showFeedback(`Failed to delete: ${error.message}`, 'error');
    } else {
        showFeedback('Record deleted successfully!', 'success');
        loadAttendance();
    }
};

// =====================================================
// EXAMS
// =====================================================
$('#addExamForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { error } = await sb.from('exams').insert({
        exam_name: $('#examTitle').value,
        exam_date: $('#examDate').value,
        exam_type: $('#examType').value,
        target_program: $('#examProgram').value,
        block_term: $('#examBlock').value,
        created_by: currentUserId,
        status: 'Scheduled'
    });
    if (error) { showFeedback(error.message, 'error'); return; }
    showFeedback('Exam created!', 'success');
    e.target.reset();
    loadExams();
});

async function loadExams() {
    const tbody = $('#examsTableBody');
    if (!tbody) return;

    tbody.innerHTML = '<td><td colspan="6"><div class="loading-spinner"></div> Loading exams...<\/td><\/tr>';

    const { data: exams, error } = await sb.from('exams').select('*').eq('created_by', currentUserId).order('exam_date', false);

    if (error) {
        tbody.innerHTML = `<tr><td colspan="6">Error: ${error.message}<\/td><\/tr>`;
        return;
    }

    allExams = exams || [];
    if (allExams.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">No exams created<\/td><\/tr>';
        return;
    }

    tbody.innerHTML = '';
    allExams.forEach(e => {
        tbody.innerHTML += `
            <td>
                <td><span class="badge badge-info">${e.exam_type}<\/span><\/td>
                <td><strong>${escapeHtml(e.exam_name)}<\/strong><\/td>
                <td>${e.target_program}/${e.block_term}<\/td>
                <td>${e.exam_date}<\/td>
                <td><span class="badge badge-warning">${e.status}<\/span><\/td>
                <td><button class="btn-action" onclick="openGradeModal('${e.id}')">Grade<\/button> <button class="btn-danger" onclick="deleteExam('${e.id}')">Delete<\/button><\/td>
            <\/tr>
        `;
    });
}

window.deleteExam = async (id) => {
    if (confirm('Delete this exam?')) {
        await sb.from('exams').delete().eq('id', id);
        loadExams();
        showFeedback('Exam deleted', 'success');
    }
};

// =====================================================
// RESOURCES
// =====================================================
$('#uploadResourceForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = $('#resourceFile').files[0];
    if (!file) { showFeedback('Select a file', 'error'); return; }
    const fileName = `${Date.now()}_${file.name}`;
    const { error: uploadError } = await sb.storage.from('resources').upload(fileName, file);
    if (uploadError) { showFeedback(uploadError.message, 'error'); return; }
    const { data: urlData } = sb.storage.from('resources').getPublicUrl(fileName);
    const { error } = await sb.from('resources').insert({
        title: $('#resourceTitle').value,
        file_url: urlData.publicUrl,
        program_type: $('#resourceProgram').value,
        block: $('#resourceBlock').value,
        uploaded_by: currentUserId
    });
    if (error) { showFeedback(error.message, 'error'); return; }
    showFeedback('Resource uploaded!', 'success');
    e.target.reset();
    loadResources();
});

async function loadResources() {
    const tbody = $('#resourcesTableBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="4"><div class="loading-spinner"></div> Loading resources...<\/td><\/tr>';

    const { data: resources, error } = await sb.from('resources').select('*').eq('uploaded_by', currentUserId).order('created_at', false);

    if (error) {
        tbody.innerHTML = `<tr><td colspan="4">Error: ${error.message}<\/td><\/tr>`;
        return;
    }

    allResources = resources || [];
    if (allResources.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">No resources uploaded<\/td><\/tr>';
        return;
    }

    tbody.innerHTML = '';
    allResources.forEach(r => {
        tbody.innerHTML += `
            <td>
                <td>${escapeHtml(r.title)}<\/td>
                <td>${r.program_type}/${r.block}<\/td>
                <td>${new Date(r.created_at).toLocaleDateString()}<\/td>
                <td><a href="${r.file_url}" target="_blank" class="btn-action">Download<\/a> <button class="btn-danger" onclick="deleteResource('${r.id}')">Delete<\/button><\/td>
            <\/tr>
        `;
    });
}

window.deleteResource = async (id) => {
    if (confirm('Delete this resource?')) {
        await sb.from('resources').delete().eq('id', id);
        loadResources();
        showFeedback('Resource deleted', 'success');
    }
};

// =====================================================
// MESSAGES
// =====================================================
async function loadMessages() {
    const program = currentUserProfile?.program || 'KRCHN';
    const { data: students } = await sb.from('consolidated_user_profiles_table').select('user_id, full_name').eq('role', 'student').eq('program', program);
    const select = $('#msgRecipient');
    if (select) {
        select.innerHTML = '<option value="">Select Student</option>' + (students || []).map(s => `<option value="${s.user_id}">${escapeHtml(s.full_name)}</option>`).join('');
    }

    const tbody = $('#messagesTableBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="4"><div class="loading-spinner"></div> Loading messages...<\/td><\/tr>';

    const { data: messages, error } = await sb.from('notifications').select('*').eq('sender_id', currentUserId).order('created_at', false);

    if (error) {
        tbody.innerHTML = `<tr><td colspan="4">Error: ${error.message}<\/td><\/tr>`;
        return;
    }

    if (!messages || messages.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">No messages sent<\/td><\/tr>';
        return;
    }

    tbody.innerHTML = '';
    messages.forEach(m => {
        tbody.innerHTML += `
            <td>
                <td>${new Date(m.created_at).toLocaleDateString()}<\/td>
                <td>${escapeHtml(m.subject)}<\/td>
                <td>${students?.find(s => s.user_id === m.target_user_id)?.full_name || 'All'}<\/td>
                <td><span class="badge badge-success">Sent<\/span><\/td>
            <\/tr>
        `;
    });
}

$('#sendMessageForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { error } = await sb.from('notifications').insert({
        target_user_id: $('#msgRecipient').value,
        subject: $('#msgSubject').value,
        message: $('#msgBody').value,
        sender_id: currentUserId,
        sender_name: currentUserProfile?.full_name
    });
    if (error) { showFeedback(error.message, 'error'); return; }
    showFeedback('Message sent!', 'success');
    e.target.reset();
    loadMessages();
});

// =====================================================
// CALENDAR
// =====================================================
async function loadCalendar() {
    const el = $('#calendarDisplay');
    if (!el) return;
    const { data: sessions } = await sb.from('scheduled_sessions').select('*').eq('lecturer_id', currentUserId);
    const events = (sessions || []).map(s => ({ title: s.session_title, start: s.session_date, color: '#3498db' }));
    if (calendar) calendar.destroy();
    calendar = new FullCalendar.Calendar(el, { initialView: 'dayGridMonth', events });
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
    if (uploadError) { showFeedback(uploadError.message, 'error'); return; }
    const { data } = sb.storage.from('resources').getPublicUrl(fileName);
    await sb.from('consolidated_user_profiles_table').update({ avatar_url: data.publicUrl }).eq('user_id', currentUserId);
    showFeedback('Photo updated!', 'success');
    loadProfile();
});

// =====================================================
// EXPORT FUNCTIONS
// =====================================================
window.exportCourses = () => showFeedback('Export feature coming soon', 'info');
window.exportStudents = () => showFeedback('Export feature coming soon', 'info');
window.openGradeModal = (id) => showFeedback('Grade modal coming soon', 'info');
window.saveGrades = () => { closeModal('gradeModal'); showFeedback('Grades saved', 'success'); };

// =====================================================
// LOGOUT
// =====================================================
window.logout = async () => {
    await sb.auth.signOut();
    window.location.href = 'login.html';
};

// =====================================================
// EVENT LISTENERS
// =====================================================
function setupEventListeners() {
    const navLinks = document.querySelectorAll('.nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = link.getAttribute('data-tab');
            if (tabId) showTab(tabId);
        });
    });

    const mobileToggle = $('#mobileNavToggle');
    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            $('#sidebar')?.classList.toggle('active');
        });
    }
}

// =====================================================
// INITIALIZATION - FIXED
// =====================================================
async function initSession() {
    console.log('Initializing Lecturer Dashboard...');

    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    currentUserId = session.user.id;

    const { data: profile } = await sb
        .from('consolidated_user_profiles_table')
        .select('*')
        .eq('user_id', currentUserId)
        .maybeSingle();

    if (!profile) {
        window.location.href = 'login.html';
        return;
    }

    if (profile.role !== 'lecturer') {
        window.location.href = 'login.html';
        return;
    }

    currentUserProfile = profile;
    
    // Set lecturer name safely
    const lecturerNameSpan = document.getElementById('lecturerName');
    if (lecturerNameSpan) {
        lecturerNameSpan.textContent = profile.full_name || 'Lecturer';
    }

    // Load all data
    await loadCourses();
    await loadStudents();
    await loadAttendance();
    await loadDashboardData();
    await loadProfile();
    await loadSessions();
    await loadExams();
    await loadResources();
    await loadMessages();
    await loadCalendar();

    setupEventListeners();

    console.log('✅ Dashboard ready!');
    console.log(`Courses: ${allCourses.length}, Students: ${allStudents.length}`);
}

// Start the application
initSession();
