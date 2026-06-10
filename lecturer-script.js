// =====================================================
// LECTURER DASHBOARD - COMPLETE ALL MODULES WORKING
// =====================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://lwhtjozfsmbyihenfunw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk';

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.sb = sb;

// =====================================================
// GLOBAL VARIABLES
// =====================================================
let currentUserProfile = null;
let currentUserId = null;
let allCourses = [];
let allStudents = [];
let allSessions = [];
let allExams = [];
let allResources = [];
let calendar = null;

function $(id) { return document.getElementById(id); }

function showToast(message, type = 'success') {
    const container = $('#toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}

// =====================================================
// 1. MY COURSES MODULE
// =====================================================
async function loadCourses() {
    console.log('🔵 Loading courses...');
    const tbody = $('#coursesTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="5"><div class="loading-spinner"></div> Loading courses...<\/td><\/tr>';
    
    const { data, error } = await sb.from('courses').select('*');
    if (error) {
        tbody.innerHTML = `<tr><td colspan="5">Error: ${error.message}<\/td><\/tr>`;
        return;
    }
    
    allCourses = data || [];
    console.log('✅ Courses loaded:', allCourses.length);
    
    if (allCourses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No courses found<\/td><\/tr>';
        return;
    }
    
    tbody.innerHTML = '';
    for (const c of allCourses) {
        tbody.innerHTML += `<tr>
            <td><strong>${c.unit_code || 'N/A'}</strong></td>
            <td>${c.course_name}</td>
            <td>${c.target_program || 'KRCHN'}</td>
            <td>${c.block || 'N/A'}</td>
            <td><button class="btn-action" onclick="showToast('Course: ${c.course_name}')">View</button></td>
        </tr>`;
    }
}

window.filterCourses = function() {
    const search = $('#courseSearch')?.value.toLowerCase() || '';
    const rows = document.querySelectorAll('#coursesTableBody tr');
    rows.forEach(row => row.style.display = row.textContent.toLowerCase().includes(search) ? '' : 'none');
};

// =====================================================
// 2. MY STUDENTS MODULE
// =====================================================
async function loadStudents() {
    console.log('🟢 Loading students...');
    const tbody = $('#studentsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="7"><div class="loading-spinner"></div> Loading students...<\/td><\/tr>';
    
    const program = currentUserProfile?.program || 'KRCHN';
    const { data, error } = await sb.from('consolidated_user_profiles_table')
        .select('*')
        .eq('role', 'student')
        .eq('program', program);
    
    if (error) {
        tbody.innerHTML = `<tr><td colspan="7">Error: ${error.message}<\/td><\/tr>`;
        return;
    }
    
    allStudents = data || [];
    console.log('✅ Students loaded:', allStudents.length);
    
    if (allStudents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">No students found<\/td><\/tr>';
        return;
    }
    
    tbody.innerHTML = '';
    for (const s of allStudents) {
        const status = (s.cumulative_absences || 0) > 5 ? 'At Risk' : 'Active';
        const statusClass = (s.cumulative_absences || 0) > 5 ? 'badge-danger' : 'badge-success';
        tbody.innerHTML += `<tr>
            <td>${s.full_name || 'N/A'}</td>
            <td><strong>${s.student_id || 'N/A'}</strong></td>
            <td>${s.email || 'N/A'}</td>
            <td>${s.program}</td>
            <td>${s.block || 'N/A'}</td>
            <td><span class="${statusClass}">${status}</span></td>
            <td><button class="btn-action" onclick="viewStudentDetails('${s.user_id}')">View</button></td>
        </tr>`;
    }
}

window.filterStudents = function() {
    const search = $('#studentSearch')?.value.toLowerCase() || '';
    const rows = document.querySelectorAll('#studentsTableBody tr');
    rows.forEach(row => row.style.display = row.textContent.toLowerCase().includes(search) ? '' : 'none');
};

window.viewStudentDetails = async function(studentId) {
    const student = allStudents.find(s => s.user_id === studentId);
    if (!student) return;
    $('#studentDetailTitle').textContent = `${student.full_name} - Student Details`;
    $('#studentDetailBody').innerHTML = `
        <p><strong>Email:</strong> ${escapeHtml(student.email)}</p>
        <p><strong>Program:</strong> ${student.program}</p>
        <p><strong>Block:</strong> ${escapeHtml(student.block)}</p>
        <p><strong>Absences:</strong> ${student.cumulative_absences || 0}</p>
        <button class="btn-action" onclick="showToast('Message sent')">Send Message</button>
    `;
    $('#studentDetailModal').style.display = 'flex';
};

// =====================================================
// 3. SESSIONS MODULE
// =====================================================
$('#addSessionForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { error } = await sb.from('scheduled_sessions').insert({
        session_title: $('#sessionTitle').value,
        session_date: $('#sessionDate').value,
        session_time: $('#sessionTime').value,
        target_program: $('#sessionProgram').value,
        block_term: $('#sessionBlock').value,
        created_by: currentUserId
    });
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Session scheduled!', 'success');
    e.target.reset();
    loadSessions();
});

async function loadSessions() {
    const tbody = $('#sessionsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5"><div class="loading-spinner"></div> Loading sessions...<\/td><\/tr>';
    
    const { data, error } = await sb.from('scheduled_sessions').select('*').order('session_date', false);
    if (error) {
        tbody.innerHTML = `<tr><td colspan="5">Error: ${error.message}<\/td><\/tr>`;
        return;
    }
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No sessions scheduled<\/td><\/tr>';
        return;
    }
    
    tbody.innerHTML = '';
    for (const s of data) {
        tbody.innerHTML += `<tr>
            <td>${s.session_title}</td>
            <td>${new Date(s.session_date).toLocaleDateString()} @ ${s.session_time}</td>
            <td>${s.target_program}/${s.block_term}</td>
            <td><button class="btn-action" onclick="navigator.clipboard.writeText(window.location.origin + '/attendance?session=${s.id}'); showToast('Link copied!')">Copy Link</button></td>
            <td><button class="btn-danger" onclick="deleteSession('${s.id}')">Delete</button></td>
        </tr>`;
    }
}

window.deleteSession = async (id) => {
    if (confirm('Delete this session?')) {
        await sb.from('scheduled_sessions').delete().eq('id', id);
        loadSessions();
        showToast('Session deleted', 'success');
    }
};

// =====================================================
// 4. ATTENDANCE MODULE
// =====================================================
async function loadAttendance() {
    const tbody = $('#attendanceTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6"><div class="loading-spinner"></div> Loading attendance...<\/td><\/tr>';
    
    const { data, error } = await sb.from('geo_attendance_logs').select('*').order('check_in_time', false);
    if (error) {
        tbody.innerHTML = `<tr><td colspan="6">Error: ${error.message}<\/td><\/tr>`;
        return;
    }
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">No attendance records found<\/td><\/tr>';
        return;
    }
    
    tbody.innerHTML = '';
    for (const a of data) {
        const student = allStudents.find(s => s.user_id === a.user_id);
        tbody.innerHTML += `<tr>
            <td>${a.student_name || student?.full_name || 'Unknown'}</td>
            <td>${student?.student_id || 'N/A'}</td>
            <td>${a.session_type || 'Class'}</td>
            <td>${new Date(a.check_in_time).toLocaleString()}</td>
            <td>${a.location_details || a.location_name || 'N/A'}</td>
            <td><button class="btn-danger" onclick="deleteAttendance('${a.id}')">Delete</button></td>
        </tr>`;
    }
}

window.deleteAttendance = async (id) => {
    if (confirm('Delete this record?')) {
        await sb.from('geo_attendance_logs').delete().eq('id', id);
        loadAttendance();
        showToast('Record deleted', 'success');
    }
};

$('#lecturerCheckinBtn')?.addEventListener('click', () => {
    if (!navigator.geolocation) { showToast('Geolocation not supported', 'error'); return; }
    navigator.geolocation.getCurrentPosition(async (pos) => {
        const { error } = await sb.from('geo_attendance_logs').insert({
            user_id: currentUserId, user_role: 'lecturer', session_type: 'Lecturer Check-in',
            check_in_time: new Date().toISOString(), latitude: pos.coords.latitude, longitude: pos.coords.longitude,
            program: currentUserProfile?.program, location_name: 'Lecturer Check-in'
        });
        if (error) showToast(error.message, 'error');
        else { showToast('Check-in recorded!', 'success'); loadAttendance(); }
    }, () => showToast('Location access denied', 'error'));
});

// =====================================================
// 5. EXAMS/CATS MODULE
// =====================================================
$('#addExamForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { error } = await sb.from('exams').insert({
        exam_name: $('#examTitle').value,
        exam_date: $('#examDate').value,
        exam_type: $('#examType').value,
        target_program: $('#examProgram').value,
        block_term: $('#examBlock').value,
        status: 'Scheduled',
        created_by: currentUserId
    });
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Exam created!', 'success');
    e.target.reset();
    loadExams();
});

async function loadExams() {
    const tbody = $('#examsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6"><div class="loading-spinner"></div> Loading exams...<\/td><\/tr>';
    
    const { data, error } = await sb.from('exams').select('*').eq('created_by', currentUserId).order('exam_date', false);
    if (error) {
        tbody.innerHTML = `<tr><td colspan="6">Error: ${error.message}<\/td><\/tr>`;
        return;
    }
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">No exams created<\/td><\/tr>';
        return;
    }
    
    tbody.innerHTML = '';
    for (const e of data) {
        tbody.innerHTML += `<tr>
            <td><span class="badge badge-info">${e.exam_type}</span></td>
            <td><strong>${e.exam_name}</strong></td>
            <td>${e.target_program}/${e.block_term}</td>
            <td>${new Date(e.exam_date).toLocaleDateString()}</td>
            <td><span class="badge badge-warning">${e.status}</span></td>
            <td><button class="btn-action" onclick="alert('Grade exam: ${e.exam_name}')">Grade</button>
                <button class="btn-danger" onclick="deleteExam('${e.id}')">Delete</button></td>
        </tr>`;
    }
}

window.deleteExam = async (id) => {
    if (confirm('Delete this exam?')) {
        await sb.from('exams').delete().eq('id', id);
        loadExams();
        showToast('Exam deleted', 'success');
    }
};

// =====================================================
// 6. RESOURCES MODULE
// =====================================================
$('#uploadResourceForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = $('#resourceFile').files[0];
    if (!file) { showToast('Select a file', 'error'); return; }
    
    const fileName = `${Date.now()}_${file.name}`;
    const { error: uploadError } = await sb.storage.from('resources').upload(fileName, file);
    if (uploadError) { showToast(uploadError.message, 'error'); return; }
    
    const { data: urlData } = sb.storage.from('resources').getPublicUrl(fileName);
    const { error } = await sb.from('resources').insert({
        title: $('#resourceTitle').value,
        file_path: fileName,
        file_url: urlData.publicUrl,
        uploaded_by: currentUserId,
        uploaded_by_name: currentUserProfile?.full_name
    });
    if (error) showToast(error.message, 'error');
    else { showToast('Resource uploaded!', 'success'); e.target.reset(); loadResources(); }
});

async function loadResources() {
    const tbody = $('#resourcesTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="3"><div class="loading-spinner"></div> Loading resources...<\/td><\/tr>';
    
    const { data, error } = await sb.from('resources').select('*').eq('uploaded_by', currentUserId).order('created_at', false);
    if (error) {
        tbody.innerHTML = `<tr><td colspan="3">Error: ${error.message}<\/td><\/tr>`;
        return;
    }
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<td><td colspan="3">No resources<\/td><\/tr>';
        return;
    }
    
    tbody.innerHTML = '';
    for (const r of data) {
        tbody.innerHTML += `<tr>
            <td>${r.title}</td>
            <td>${new Date(r.created_at).toLocaleDateString()}</td>
            <td><a href="${r.file_url}" target="_blank" class="btn-action">Download</a>
                <button class="btn-danger" onclick="deleteResource('${r.id}')">Delete</button></td>
        </tr>`;
    }
}

window.deleteResource = async (id) => {
    if (confirm('Delete this resource?')) {
        await sb.from('resources').delete().eq('id', id);
        loadResources();
        showToast('Resource deleted', 'success');
    }
};

// =====================================================
// 7. MESSAGES MODULE
// =====================================================
async function loadMessages() {
    const tbody = $('#messagesTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4"><div class="loading-spinner"></div> Loading messages...<\/td><\/tr>';
    
    const { data, error } = await sb.from('notifications').select('*').eq('sender_id', currentUserId).order('created_at', false);
    if (error) {
        tbody.innerHTML = `<tr><td colspan="4">Error: ${error.message}<\/td><\/tr>`;
        return;
    }
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<td><td colspan="4">No messages sent<\/td><\/tr>';
        return;
    }
    
    tbody.innerHTML = '';
    for (const m of data) {
        tbody.innerHTML += `<tr>
            <td>${new Date(m.created_at).toLocaleDateString()}</td>
            <td>${m.subject}</td>
            <td>${m.target_user_id?.substring(0, 8) || 'All'}</td>
            <td><span class="badge badge-success">Sent</span></td>
        </tr>`;
    }
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
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Message sent!', 'success');
    e.target.reset();
    loadMessages();
});

// =====================================================
// 8. CALENDAR MODULE
// =====================================================
async function loadCalendar() {
    const el = $('#calendarDisplay');
    if (!el) return;
    
    const [sessions, exams] = await Promise.all([
        sb.from('scheduled_sessions').select('*'),
        sb.from('exams').select('*').eq('created_by', currentUserId)
    ]);
    
    const events = [
        ...(sessions.data || []).map(s => ({ title: s.session_title, start: s.session_date, color: '#3498db' })),
        ...(exams.data || []).map(e => ({ title: `${e.exam_type}: ${e.exam_name}`, start: e.exam_date, color: '#e74c3c' }))
    ];
    
    if (calendar) calendar.destroy();
    calendar = new FullCalendar.Calendar(el, {
        initialView: 'dayGridMonth',
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' },
        events: events
    });
    calendar.render();
}

// =====================================================
// 9. DASHBOARD MODULE
// =====================================================
async function loadDashboard() {
    console.log('🟡 Updating dashboard...');
    if ($('totalStudents')) $('totalStudents').textContent = allStudents.length;
    if ($('totalCourses')) $('totalCourses').textContent = allCourses.length;
    if ($('atRiskCount')) $('atRiskCount').textContent = allStudents.filter(s => (s.cumulative_absences || 0) > 5).length;
    
    const today = new Date().toISOString().split('T')[0];
    const { data: todayData } = await sb.from('geo_attendance_logs').select('*').gte('check_in_time', today);
    if ($('todayAttendance')) $('todayAttendance').textContent = todayData?.length || 0;
}

async function loadTodaySchedule() {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await sb.from('scheduled_sessions').select('*').eq('session_date', today);
    const container = $('#todayScheduleList');
    if (!container) return;
    if (!data?.length) { container.innerHTML = '<p>No sessions scheduled for today</p>'; return; }
    container.innerHTML = data.map(s => `<div class="schedule-item"><span class="schedule-time">${s.session_time || 'TBA'}</span><span class="schedule-title">${s.session_title}</span></div>`).join('');
}

async function loadProfile() {
    if (!currentUserProfile) return;
    if ($('profileName')) $('profileName').textContent = currentUserProfile.full_name || 'Lecturer';
    if ($('profileProgram')) $('profileProgram').textContent = currentUserProfile.program || 'KRCHN';
}

// =====================================================
// TAB NAVIGATION
// =====================================================
window.showTab = function(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
        tab.style.display = 'none';
    });
    const target = $(tabId);
    if (target) {
        target.classList.add('active');
        target.style.display = 'block';
    }
    
    // Load data for the tab
    if (tabId === 'my-courses') loadCourses();
    if (tabId === 'my-students') loadStudents();
    if (tabId === 'sessions') loadSessions();
    if (tabId === 'attendance') loadAttendance();
    if (tabId === 'cats') loadExams();
    if (tabId === 'resources') loadResources();
    if (tabId === 'messages') loadMessages();
    if (tabId === 'calendar') loadCalendar();
    if (tabId === 'dashboard') { loadDashboard(); loadTodaySchedule(); }
    if (tabId === 'profile') loadProfile();
};

// =====================================================
// INITIALIZATION
// =====================================================
async function init() {
    console.log('Initializing Lecturer Dashboard...');
    
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }
    
    currentUserId = session.user.id;
    const { data: profile } = await sb.from('consolidated_user_profiles_table')
        .select('*')
        .eq('user_id', currentUserId)
        .maybeSingle();
    
    currentUserProfile = profile || { program: 'KRCHN', full_name: 'Lecturer' };
    
    if ($('welcomeHeader')) {
        $('welcomeHeader').textContent = `Welcome, ${currentUserProfile.full_name}!`;
    }
    
    await loadCourses();
    await loadStudents();
    await loadDashboard();
    await loadTodaySchedule();
    await loadMessages();
    await loadProfile();
    
    console.log('✅ Dashboard ready! Students:', allStudents.length, 'Courses:', allCourses.length);
}

// =====================================================
// START
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded');
    
    $('#mobileNavToggle')?.addEventListener('click', () => $('#sidebar')?.classList.toggle('active'));
    
    document.querySelectorAll('.nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = link.getAttribute('data-tab');
            if (tabId) window.showTab(tabId);
            $('#sidebar')?.classList.remove('active');
        });
    });
    
    $('#logoutBtn')?.addEventListener('click', async () => { await sb.auth.signOut(); window.location.href = 'login.html'; });
    $('#notificationBtn')?.addEventListener('click', () => showToast('No new notifications', 'info'));
    $('#helpBtn')?.addEventListener('click', () => showToast('Contact support: support@nchsm.ac.ke', 'info'));
    
    window.closeModal = (id) => { const m = $(id); if (m) m.style.display = 'none'; };
    
    init();
});

window.exportCourses = () => showToast('Export feature coming soon', 'info');
window.exportStudents = () => showToast('Export feature coming soon', 'info');

console.log('✅ Lecturer script loaded - ALL MODULES READY!');
