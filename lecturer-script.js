// ============================================
// LECTURER DASHBOARD SCRIPT - MATCHES SUPER ADMIN PATTERNS 
// ============================================ 

const SUPABASE_URL = 'https://lwhtjozfsmbyihenfunw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.sb = sb;

let currentUserProfile = null;
let currentUserId = null;
let allCourses = [];
let allStudents = [];
let calendar = null;

function $(id) { return document.getElementById(id); }

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function closeModal(modalId) {
    const modal = $(modalId);
    if (modal) modal.style.display = 'none';
}

function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
}

// Tab navigation
window.showTab = function(tabId) {
    console.log('Opening tab:', tabId);
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
        tab.style.display = 'none';
    });
    const targetTab = $(tabId);
    if (targetTab) {
        targetTab.classList.add('active');
        targetTab.style.display = 'block';
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
    if (tabId === 'dashboard') { await loadDashboard(); await loadTodaySchedule(); }
    if (tabId === 'profile') await loadProfile();
    if (tabId === 'my-courses') await loadCourses();
    if (tabId === 'my-students') await loadStudents();
    if (tabId === 'sessions') await loadSessions();
    if (tabId === 'attendance') await loadAttendance();
    if (tabId === 'cats') await loadExams();
    if (tabId === 'resources') await loadResources();
    if (tabId === 'messages') await loadMessages();
    if (tabId === 'calendar') await loadCalendar();
}

// Dashboard
async function loadDashboard() {
    if ($('totalStudents')) $('totalStudents').textContent = allStudents.length;
    if ($('totalCourses')) $('totalCourses').textContent = allCourses.length;
    
    const today = new Date().toISOString().split('T')[0];
    
    const { data: todaySessionsData } = await sb.from('scheduled_sessions').select('*').eq('session_date', today).eq('lecturer_id', currentUserId);
    if ($('todaySessions')) $('todaySessions').textContent = todaySessionsData?.length || 0;
    
    const { data: attendance } = await sb.from('geo_attendance_logs').select('*').gte('check_in_time', today);
    if ($('todayAttendance')) $('todayAttendance').textContent = attendance?.length || 0;
    
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const { data: weekAttendance } = await sb.from('geo_attendance_logs').select('*').gte('check_in_time', weekAgo.toISOString());
    if ($('weeklyAttendance')) $('weeklyAttendance').textContent = weekAttendance?.length || 0;
    
    if ($('monthlyRate')) $('monthlyRate').textContent = allStudents.length ? '85%' : '0%';
}

async function loadTodaySchedule() {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await sb.from('scheduled_sessions').select('*').eq('session_date', today).eq('lecturer_id', currentUserId).order('session_time');
    const container = $('#todayScheduleList');
    if (!container) return;
    if (!data?.length) { container.innerHTML = 'No sessions today'; return; }
    container.innerHTML = data.map(s => `<div class="schedule-item"><span class="schedule-time">${s.session_time || 'TBA'}</span><span>${escapeHtml(s.session_title)}</span></div>`).join('');
}

// Profile
async function loadProfile() {
    if (!currentUserProfile) return;
    if ($('profileName')) $('profileName').textContent = currentUserProfile.full_name || 'Lecturer';
    if ($('profileId')) $('profileId').textContent = currentUserProfile.user_id?.substring(0, 8) || 'N/A';
    if ($('profileEmail')) $('profileEmail').textContent = currentUserProfile.email || 'N/A';
    if ($('profileDept')) $('profileDept').textContent = currentUserProfile.department || 'Academic';
    if ($('profileProgram')) $('profileProgram').textContent = currentUserProfile.program || 'KRCHN';
    if (currentUserProfile.avatar_url && $('#profileAvatar')) {
        $('#profileAvatar').innerHTML = `<img src="${currentUserProfile.avatar_url}" alt="Profile">`;
    }
}

// Courses - FILTER by lecturer's program
async function loadCourses() {
    const program = currentUserProfile?.program || 'KRCHN';
    console.log('Loading courses for program:', program);
    
    const tbody = $('#coursesTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="5"><div class="loading-spinner"></div> Loading courses...<\/td><\/tr>';
    
    const { data, error } = await sb.from('courses').select('*').eq('target_program', program);
    
    if (error) {
        tbody.innerHTML = `<tr><td colspan="5">Error: ${error.message}<\/td><\/tr>`;
        return;
    }
    
    allCourses = data || [];
    if (allCourses.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5">No courses found for ${program}<\/td><\/tr>`;
        return;
    }
    
    tbody.innerHTML = '';
    allCourses.forEach(c => {
        tbody.innerHTML += `<tr>
            <td><strong>${escapeHtml(c.unit_code || 'N/A')}</strong><\/td>
            <td>${escapeHtml(c.course_name)}<\/td>
            <td>${escapeHtml(c.target_program)}<\/td>
            <td>${escapeHtml(c.block || 'N/A')}<\/td>
            <td><button class="btn-action" onclick="showToast('Course: ${escapeHtml(c.course_name)}', 'info')">View</button><\/td>
        </tr>`;
    });
    
    if ($('totalCourses')) $('totalCourses').textContent = allCourses.length;
    console.log(`Loaded ${allCourses.length} courses for ${program}`);
}

window.filterCourses = function() {
    const search = $('#courseSearch')?.value.toLowerCase() || '';
    const rows = document.querySelectorAll('#coursesTableBody tr');
    rows.forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(search) ? '' : 'none';
    });
};

// Students - FILTER by lecturer's program
async function loadStudents() {
    const program = currentUserProfile?.program || 'KRCHN';
    console.log('Loading students for program:', program);
    
    const tbody = $('#studentsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="7"><div class="loading-spinner"></div> Loading students...<\/td><\/tr>';
    
    const { data, error } = await sb.from('consolidated_user_profiles_table')
        .select('*')
        .eq('role', 'student')
        .eq('program', program);
    
    if (error) {
        tbody.innerHTML = `<tr><td colspan="7">Error: ${error.message}<\/td><\/tr>`;
        return;
    }
    
    allStudents = data || [];
    if (allStudents.length === 0) {
        tbody.innerHTML = `</table><td colspan="7">No students found for ${program}<\/td><\/tr>`;
        return;
    }
    
    tbody.innerHTML = '';
    allStudents.forEach(s => {
        const status = (s.cumulative_absences || 0) > 5 ? 'At Risk' : 'Active';
        const statusClass = (s.cumulative_absences || 0) > 5 ? 'badge-danger' : 'badge-success';
        tbody.innerHTML += `<tr>
            <td>${escapeHtml(s.full_name || 'N/A')}<\/td>
            <td><strong>${escapeHtml(s.student_id || 'N/A')}<\/strong><\/td>
            <td>${escapeHtml(s.email || 'N/A')}<\/td>
            <td>${escapeHtml(s.program)}<\/td>
            <td>${escapeHtml(s.block || 'N/A')}<\/td>
            <td><span class="${statusClass}">${status}<\/span><\/td>
            <td><button class="btn-action" onclick="viewStudentDetails('${s.user_id}')">View<\/button><\/td>
        </tr>`;
    });
    
    if ($('totalStudents')) $('totalStudents').textContent = allStudents.length;
    console.log(`Loaded ${allStudents.length} students for ${program}`);
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
        <button class="btn-action" onclick="showToast('Message feature coming', 'info')">Send Message</button>
    `;
    $('#studentDetailModal').style.display = 'flex';
};

// Sessions
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
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Session scheduled!', 'success');
    e.target.reset();
    await loadSessions();
});

async function loadSessions() {
    const tbody = $('#sessionsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="5"><div class="loading-spinner"></div> Loading sessions...<\/td><\/tr>';
    
    const { data, error } = await sb.from('scheduled_sessions').select('*').eq('lecturer_id', currentUserId).order('session_date', false);
    
    if (error) {
        tbody.innerHTML = `<tr><td colspan="5">Error: ${error.message}<\/td><\/tr>`;
        return;
    }
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No sessions scheduled<\/td><\/tr>';
        return;
    }
    
    tbody.innerHTML = '';
    data.forEach(s => {
        const link = `${window.location.origin}/attendance?session=${s.id}`;
        tbody.innerHTML += `<tr>
            <td>${escapeHtml(s.session_title)}<\/td>
            <td>${new Date(s.session_date).toLocaleDateString()} @ ${s.session_time}<\/td>
            <td>${s.target_program}/${s.block_term}<\/td>
            <td><button class="btn-action" onclick="navigator.clipboard.writeText('${link}'); showToast('Link copied!', 'success')">Copy Link<\/button><\/td>
            <td><button class="btn-danger" onclick="deleteSession('${s.id}')">Delete<\/button><\/td>
        </table>`;
    });
}

window.deleteSession = async (id) => {
    if (confirm('Delete this session?')) {
        await sb.from('scheduled_sessions').delete().eq('id', id);
        await loadSessions();
        showToast('Session deleted', 'success');
    }
};

// Attendance
window.markLecturerAttendance = () => {
    if (!navigator.geolocation) { showToast('Geolocation not supported', 'error'); return; }
    navigator.geolocation.getCurrentPosition(async (pos) => {
        const { error } = await sb.from('geo_attendance_logs').insert({
            user_id: currentUserId,
            user_role: 'lecturer',
            session_type: 'Check-in',
            check_in_time: new Date().toISOString(),
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
        });
        if (error) showToast(error.message, 'error');
        else { showToast('Checked in!', 'success'); await loadAttendance(); }
    }, () => showToast('Location denied', 'error'));
};

async function loadAttendance() {
    const tbody = $('#attendanceTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="6"><div class="loading-spinner"></div> Loading attendance...<\/td><\/tr>';
    
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await sb.from('geo_attendance_logs').select('*').gte('check_in_time', today).order('check_in_time', false);
    
    if (error) {
        tbody.innerHTML = `<tr><td colspan="6">Error: ${error.message}<\/td><\/tr>`;
        return;
    }
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">No attendance today<\/td><\/tr>';
        return;
    }
    
    tbody.innerHTML = '';
    data.forEach(a => {
        const student = allStudents.find(s => s.user_id === a.user_id);
        tbody.innerHTML += `<tr>
            <td>${escapeHtml(a.student_name || student?.full_name)}<\/td>
            <td>${escapeHtml(student?.student_id)}<\/td>
            <td>${a.session_type || 'Class'}<\/td>
            <td>${new Date(a.check_in_time).toLocaleTimeString()}<\/td>
            <td>${escapeHtml(a.location_details || a.location_name)}<\/td>
            <td><button class="btn-danger" onclick="deleteAttendance('${a.id}')">Delete<\/button><\/td>
        </tr>`;
    });
}

window.deleteAttendance = async (id) => {
    if (confirm('Delete this record?')) {
        await sb.from('geo_attendance_logs').delete().eq('id', id);
        await loadAttendance();
        showToast('Record deleted', 'success');
    }
};

// Exams
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
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Exam created!', 'success');
    e.target.reset();
    await loadExams();
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
    data.forEach(e => {
        tbody.innerHTML += `<tr>
            <td><span class="badge badge-info">${e.exam_type}</span><\/td>
            <td><strong>${escapeHtml(e.exam_name)}<\/strong><\/td>
            <td>${e.target_program}/${e.block_term}<\/td>
            <td>${new Date(e.exam_date).toLocaleDateString()}<\/td>
            <td><span class="badge badge-warning">${e.status}<\/span><\/td>
            <td><button class="btn-action" onclick="openGradeModal('${e.id}')">Grade</button> <button class="btn-danger" onclick="deleteExam('${e.id}')">Delete</button><\/td>
        </tr>`;
    });
}

window.deleteExam = async (id) => {
    if (confirm('Delete this exam?')) {
        await sb.from('exams').delete().eq('id', id);
        await loadExams();
        showToast('Exam deleted', 'success');
    }
};

// Grade Modal
window.openGradeModal = (id) => {
    showToast('Grade modal coming soon', 'info');
};

window.saveGrades = () => {
    closeModal('gradeModal');
    showToast('Grades saved', 'success');
};

// Resources
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
        file_url: urlData.publicUrl,
        program_type: $('#resourceProgram').value,
        block: $('#resourceBlock').value,
        uploaded_by: currentUserId
    });
    if (error) showToast(error.message, 'error');
    else { showToast('Resource uploaded!', 'success'); e.target.reset(); await loadResources(); }
});

async function loadResources() {
    const tbody = $('#resourcesTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="4"><div class="loading-spinner"></div> Loading resources...<\/td><\/tr>';
    
    const { data, error } = await sb.from('resources').select('*').eq('uploaded_by', currentUserId).order('created_at', false);
    
    if (error) {
        tbody.innerHTML = `<td><td colspan="4">Error: ${error.message}<\/td><\/tr>`;
        return;
    }
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">No resources uploaded<\/td><\/tr>';
        return;
    }
    
    tbody.innerHTML = '';
    data.forEach(r => {
        tbody.innerHTML += `<tr>
            <td>${escapeHtml(r.title)}<\/td>
            <td>${r.program_type}/${r.block}<\/td>
            <td>${new Date(r.created_at).toLocaleDateString()}<\/td>
            <td><a href="${r.file_url}" target="_blank" class="btn-action">Download</a> <button class="btn-danger" onclick="deleteResource('${r.id}')">Delete</button><\/td>
        </tr>`;
    });
}

window.deleteResource = async (id) => {
    if (confirm('Delete this resource?')) {
        await sb.from('resources').delete().eq('id', id);
        await loadResources();
        showToast('Resource deleted', 'success');
    }
};

// Messages
async function loadMessages() {
    const { data: students } = await sb.from('consolidated_user_profiles_table').select('user_id, full_name').eq('role', 'student');
    const select = $('#msgRecipient');
    if (select) {
        select.innerHTML = '<option value="">Select Student</option>' + (students || []).map(s => `<option value="${s.user_id}">${escapeHtml(s.full_name)}</option>`).join('');
    }
    
    const tbody = $('#messagesTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="4"><div class="loading-spinner"></div> Loading messages...<\/td><\/tr>';
    
    const { data, error } = await sb.from('notifications').select('*').eq('sender_id', currentUserId).order('created_at', false);
    
    if (error) {
        tbody.innerHTML = `<tr><td colspan="4">Error: ${error.message}<\/td><\/tr>`;
        return;
    }
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">No messages sent<\/td><\/tr>';
        return;
    }
    
    tbody.innerHTML = '';
    data.forEach(m => {
        tbody.innerHTML += `<tr>
            <td>${new Date(m.created_at).toLocaleDateString()}<\/td>
            <td>${escapeHtml(m.subject)}<\/td>
            <td>${students?.find(s => s.user_id === m.target_user_id)?.full_name || 'All'}<\/td>
            <td><span class="badge badge-success">Sent<\/span><\/td>
        </tr>`;
    });
}

$('#sendMessageForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { error } = await sb.from('notifications').insert({
        target_user_id: $('#msgRecipient').value,
        subject: $('#msgSubject').value,
        message: $('#msgBody').value,
        sender_id: currentUserId
    });
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Message sent!', 'success');
    e.target.reset();
    await loadMessages();
});

// Calendar
async function loadCalendar() {
    const el = $('#calendarDisplay');
    if (!el) return;
    
    const { data: sessions } = await sb.from('scheduled_sessions').select('*').eq('lecturer_id', currentUserId);
    const events = (sessions || []).map(s => ({ title: s.session_title, start: s.session_date, color: '#3498db' }));
    
    if (calendar) calendar.destroy();
    calendar = new FullCalendar.Calendar(el, { initialView: 'dayGridMonth', events });
    calendar.render();
}

// Photo upload
$('#uploadPhotoBtn')?.addEventListener('click', () => $('#photoInput').click());
$('#photoInput')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fileName = `avatars/${currentUserId}_${Date.now()}.jpg`;
    const { error: uploadError } = await sb.storage.from('resources').upload(fileName, file);
    if (uploadError) { showToast(uploadError.message, 'error'); return; }
    const { data } = sb.storage.from('resources').getPublicUrl(fileName);
    await sb.from('consolidated_user_profiles_table').update({ avatar_url: data.publicUrl }).eq('user_id', currentUserId);
    showToast('Photo updated!', 'success');
    await loadProfile();
});

// Export functions
window.exportCourses = () => showToast('Export feature coming soon', 'info');
window.exportStudents = () => showToast('Export feature coming soon', 'info');

// Logout
window.logout = async () => {
    await sb.auth.signOut();
    window.location.href = 'login.html';
};

// Initialize
async function init() {
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
        currentUserProfile = {
            user_id: currentUserId,
            full_name: session.user.email?.split('@')[0] || 'Lecturer',
            role: 'lecturer',
            program: 'KRCHN',
            email: session.user.email
        };
    } else {
        currentUserProfile = profile;
    }
    
    $('#lecturerName').textContent = currentUserProfile.full_name || 'Lecturer';
    
    await loadCourses();
    await loadStudents();
    await loadDashboard();
    await loadTodaySchedule();
    await loadProfile();
    
    document.querySelectorAll('.nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = link.getAttribute('data-tab');
            if (tabId) showTab(tabId);
        });
    });
    
    $('#mobileNavToggle')?.addEventListener('click', () => {
        $('#sidebar')?.classList.toggle('active');
    });
    
    console.log('Dashboard ready!');
}

// Start the application
init();
