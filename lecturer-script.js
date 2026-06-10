// =====================================================
// LECTURER DASHBOARD - EXTERNAL JS (Like SuperAdmin)
// =====================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Supabase Configuration
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
let attendanceMap = null;
let currentQRCode = null;
let currentGradingExam = null;

// TVET Program Codes
const TVET_PROGRAMS = ['DPOTT', 'DCH', 'DHRIT', 'DSL', 'DSW', 'DCJS', 'DHSS', 'DICT', 'DME', 'CPOTT', 'CCH', 'CHRIT', 'CPC', 'CSL', 'CSW', 'CCJS', 'CAG', 'CHSS', 'CICT', 'ACH', 'AAG', 'ASW', 'CCA', 'PTE'];

const PROGRAM_DISPLAY_NAMES = {
    'KRCHN': 'KRCHN Nursing',
    'DPOTT': 'Diploma in Perioperative Theatre Technology',
    'DCH': 'Diploma in Community Health',
    'DHRIT': 'Diploma in Health Records and IT',
    'DSL': 'Diploma in Science Lab',
    'DSW': 'Diploma in Social Work',
    'DCJS': 'Diploma in Criminal Justice',
    'DHSS': 'Diploma in Health Support Services',
    'DICT': 'Diploma in ICT',
    'DME': 'Diploma in Medical Engineering'
};

const ACADEMIC_STRUCTURE = {
    'KRCHN': ['Introductory', 'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Block 6', 'Final'],
    'TVET': ['Introductory', 'Term1', 'Term2', 'Term3', 'Term4', 'Term5', 'Term6', 'Final']
};

// Helper functions
function $(id) { return document.getElementById(id); }

function showToast(message, type = 'success') {
    const container = $('#toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle', warning: 'fa-exclamation-triangle' };
    toast.innerHTML = `<i class="fas ${icons[type] || 'fa-info-circle'}"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function closeModal(modalId) {
    const modal = $(modalId);
    if (modal) modal.style.display = 'none';
    if (modalId === 'mapModal' && attendanceMap) {
        attendanceMap.remove();
        attendanceMap = null;
    }
}

function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}

function getProgramType(code) {
    if (!code) return 'KRCHN';
    if (code === 'KRCHN') return 'KRCHN';
    return TVET_PROGRAMS.includes(code) ? 'TVET' : 'KRCHN';
}

function getProgramDisplayName(code) {
    return PROGRAM_DISPLAY_NAMES[code] || code || 'Unknown Program';
}

function updateProgramDropdown(selectElement) {
    if (!selectElement) return;
    const currentValue = selectElement.value;
    selectElement.innerHTML = '<option value="KRCHN">🎓 KRCHN Nursing</option>';
    const diplomaGroup = document.createElement('optgroup');
    diplomaGroup.label = '🎯 TVET Diploma Programs';
    ['DPOTT', 'DCH', 'DHRIT', 'DSL', 'DSW', 'DCJS', 'DHSS', 'DICT', 'DME'].forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = PROGRAM_DISPLAY_NAMES[c] || c;
        diplomaGroup.appendChild(opt);
    });
    selectElement.appendChild(diplomaGroup);
    if (currentValue) selectElement.value = currentValue;
}

function updateBlockOptions(programId, blockId) {
    const programSelect = $(programId);
    const blockSelect = $(blockId);
    if (!programSelect || !blockSelect) return;
    const programType = getProgramType(programSelect.value);
    blockSelect.innerHTML = '<option value="">-- Select Block/Term --</option>';
    const options = programType === 'KRCHN' ? ACADEMIC_STRUCTURE.KRCHN : ACADEMIC_STRUCTURE.TVET;
    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        blockSelect.appendChild(option);
    });
}

// Tab navigation
window.showTab = function(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => {
        t.classList.remove('active');
        t.style.display = 'none';
    });
    const target = $(tabId);
    if (target) {
        target.classList.add('active');
        target.style.display = 'block';
    }
    document.querySelectorAll('.nav a').forEach(l => l.classList.remove('active'));
    const activeLink = document.querySelector(`.nav a[data-tab="${tabId}"]`);
    if (activeLink) activeLink.classList.add('active');
    loadSectionData(tabId);
};

async function loadSectionData(tabId) {
    switch(tabId) {
        case 'dashboard': await loadDashboard(); await loadTodaySchedule(); break;
        case 'profile': await loadProfile(); break;
        case 'my-courses': await loadCourses(); break;
        case 'my-students': await loadStudents(); break;
        case 'sessions': await loadSessions(); break;
        case 'attendance': await loadAttendance(); await populateAttendanceForm(); break;
        case 'cats': await loadExams(); break;
        case 'resources': await loadResources(); break;
        case 'messages': await loadMessages(); break;
        case 'calendar': await loadCalendar(); break;
    }
}

// Dashboard
async function loadDashboard() {
    try {
        if ($('totalStudents')) $('totalStudents').textContent = allStudents.length;
        if ($('totalCourses')) $('totalCourses').textContent = allCourses.length;
        if ($('atRiskCount')) $('atRiskCount').textContent = allStudents.filter(s => (s.cumulative_absences || 0) > 5).length;
        
        const { data: exams } = await sb.from('exams').select('id').eq('status', 'Scheduled');
        if ($('pendingGrading')) $('pendingGrading').textContent = exams?.length || 0;
        
        const today = new Date().toISOString().split('T')[0];
        const { data: todayData } = await sb.from('geo_attendance_logs').select('*').gte('check_in_time', today);
        if ($('todayAttendance')) $('todayAttendance').textContent = todayData?.length || 0;
        
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
        const { data: weekData } = await sb.from('geo_attendance_logs').select('*').gte('check_in_time', weekAgo.toISOString());
        if ($('weeklyAttendance')) $('weeklyAttendance').textContent = weekData?.length || 0;
        
        const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30);
        const { data: monthData } = await sb.from('geo_attendance_logs').select('*').gte('check_in_time', monthAgo.toISOString());
        const uniqueStudents = [...new Set((monthData || []).map(l => l.user_id))].length;
        if ($('monthlyRate')) $('monthlyRate').textContent = allStudents.length ? Math.round((uniqueStudents / allStudents.length) * 100) + '%' : '0%';
    } catch(e) { console.error('Dashboard error:', e); }
}

async function loadTodaySchedule() {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await sb.from('scheduled_sessions').select('*').eq('session_date', today).order('session_time');
    const container = $('#todayScheduleList');
    if (!container) return;
    if (!data?.length) { container.innerHTML = '<p>No sessions scheduled for today</p>'; return; }
    container.innerHTML = data.map(s => `<div class="schedule-item"><span class="schedule-time">${s.session_time || 'TBA'}</span><span class="schedule-title">${escapeHtml(s.session_title)}</span></div>`).join('');
}

// Profile
async function loadProfile() {
    if (!currentUserProfile) return;
    if ($('profileName')) $('profileName').textContent = currentUserProfile.full_name || 'Lecturer';
    if ($('profileId')) $('profileId').textContent = currentUserProfile.user_id?.substring(0, 8) || 'N/A';
    if ($('profileEmail')) $('profileEmail').textContent = currentUserProfile.email || 'N/A';
    if ($('profilePhone')) $('profilePhone').textContent = currentUserProfile.phone || 'N/A';
    if ($('profileDept')) $('profileDept').textContent = currentUserProfile.department || 'Academic';
    if ($('profileProgram')) $('profileProgram').textContent = currentUserProfile.program || 'KRCHN';
    if ($('profileJoinDate')) $('profileJoinDate').textContent = currentUserProfile.created_at ? new Date(currentUserProfile.created_at).toLocaleDateString() : '2024';
    if (currentUserProfile.avatar_url && $('#profileAvatar')) {
        $('#profileAvatar').innerHTML = `<img src="${currentUserProfile.avatar_url}" alt="Profile">`;
    }
}

// Courses - WORKING VERSION (NO onclick in button)
async function loadCourses() {
    console.log('🔵 loadCourses STARTED');
    const tbody = $('#coursesTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5"><div class="loading-spinner"></div> Loading courses...<\/td><\/tr>';
    
    const { data, error } = await sb.from('courses').select('*');
    console.log('🔵 Data from Supabase:', data?.length);
    
    if (error) {
        console.error('🔵 Error:', error);
        tbody.innerHTML = `<tr><td colspan="5">Error: ${error.message}<\/td><\/tr>`;
        return;
    }
    
    allCourses = data || [];
    console.log('🔵 allCourses set to:', allCourses.length);
    
    if (allCourses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No courses found<\/td><\/tr>';
        return;
    }
    
    tbody.innerHTML = '';
    for (const c of allCourses) {
        tbody.innerHTML += `
            <tr>
                <td><strong>${c.unit_code || 'N/A'}</strong></td>
                <td>${c.course_name}</td>
                <td>${c.target_program || 'KRCHN'}</td>
                <td>${c.block || 'N/A'}</td>
                <td><button class="btn-action">View</button></td>
            </tr>
        `;
    }
    console.log('🔵 loadCourses FINISHED - total courses:', allCourses.length);
}

window.filterCourses = function() {
    const search = $('#courseSearch')?.value.toLowerCase() || '';
    const rows = document.querySelectorAll('#coursesTableBody tr');
    rows.forEach(row => { row.style.display = row.textContent.toLowerCase().includes(search) ? '' : 'none'; });
};

// Students - WORKING VERSION
async function loadStudents() {
    console.log('🟢 loadStudents STARTED');
    const tbody = $('#studentsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7"><div class="loading-spinner"></div> Loading students...<\/td><\/tr>';
    
    const program = currentUserProfile?.program || 'KRCHN';
    console.log('🟢 Program:', program);
    
    const { data, error } = await sb.from('consolidated_user_profiles_table')
        .select('*')
        .eq('role', 'student')
        .eq('program', program);
    
    console.log('🟢 Data from Supabase:', data?.length);
    
    if (error) {
        console.error('🟢 Error:', error);
        tbody.innerHTML = `<tr><td colspan="7">Error: ${error.message}<\/td><\/tr>`;
        return;
    }
    
    allStudents = data || [];
    console.log('🟢 allStudents set to:', allStudents.length);
    
    if (allStudents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">No students found<\/td><\/tr>';
        return;
    }
    
    tbody.innerHTML = '';
    for (const s of allStudents) {
        const status = (s.cumulative_absences || 0) > 5 ? 'At Risk' : 'Active';
        const statusClass = (s.cumulative_absences || 0) > 5 ? 'badge-danger' : 'badge-success';
        tbody.innerHTML += `
            <tr>
                <td>${s.full_name || 'N/A'}</td>
                <td><strong>${s.student_id || 'N/A'}</strong></td>
                <td>${s.email || 'N/A'}</td>
                <td>${s.program}</td>
                <td>${s.block || 'N/A'}</td>
                <td><span class="${statusClass}">${status}</span></td>
                <td><button class="btn-action" onclick="viewStudentDetails('${s.user_id}')">View</button></td>
            </tr>
        `;
    }
    console.log('🟢 loadStudents FINISHED - total students:', allStudents.length);
}

window.filterStudents = function() {
    const search = $('#studentSearch')?.value.toLowerCase() || '';
    const rows = document.querySelectorAll('#studentsTableBody tr');
    rows.forEach(row => { row.style.display = row.textContent.toLowerCase().includes(search) ? '' : 'none'; });
};

window.viewStudentDetails = async function(studentId) {
    const student = allStudents.find(s => s.user_id === studentId);
    if (!student) return;
    $('#studentDetailTitle').textContent = `${student.full_name} - Student Details`;
    $('#studentDetailBody').innerHTML = `
        <p><strong>Email:</strong> ${escapeHtml(student.email)}</p>
        <p><strong>Program:</strong> ${getProgramDisplayName(student.program)}</p>
        <p><strong>Block:</strong> ${escapeHtml(student.block)}</p>
        <p><strong>Absences:</strong> ${student.cumulative_absences || 0}</p>
        <button class="btn-action" onclick="showToast('Message student', 'info')">Send Message</button>
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
        created_by: currentUserId
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
    const { data, error } = await sb.from('scheduled_sessions').select('*').order('session_date', false);
    if (error) { tbody.innerHTML = `<tr><td colspan="5">Error: ${error.message}<\/td><\/tr>`; return; }
    if (!data || data.length === 0) { tbody.innerHTML = '<tr><td colspan="5">No sessions scheduled<\/td><\/tr>'; return; }
    tbody.innerHTML = '';
    data.forEach(s => {
        const link = `${window.location.origin}/attendance?session=${s.id}`;
        tbody.innerHTML += `<tr>
            <td>${escapeHtml(s.session_title)}<\/td>
            <td>${new Date(s.session_date).toLocaleDateString()} @ ${s.session_time}<\/td>
            <td>${s.target_program}/${s.block_term}<\/td>
            <td><button class="btn-action" onclick="navigator.clipboard.writeText('${link}'); showToast('Link copied!', 'success')">Copy Link<\/button><\/td>
            <td><button class="btn-danger" onclick="deleteSession('${s.id}')">Delete<\/button><\/td>
        </tr>`;
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
async function populateAttendanceForm() {
    const program = currentUserProfile?.program || 'KRCHN';
    const { data: students } = await sb.from('consolidated_user_profiles_table').select('user_id, full_name, student_id').eq('role', 'student').eq('program', program);
    if ($('attStudentId')) {
        $('attStudentId').innerHTML = '<option value="">Select Student</option>' + (students || []).map(s => `<option value="${s.user_id}">${s.full_name} (${s.student_id})</option>`).join('');
    }
    if ($('attDate')) $('attDate').value = new Date().toISOString().split('T')[0];
}

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

$('#manualAttendanceForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const student = allStudents.find(s => s.user_id === $('#attStudentId').value);
    if (!student) { showToast('Select a student', 'error'); return; }
    const dateTime = `${$('#attDate').value}T12:00:00`;
    const { error } = await sb.from('geo_attendance_logs').insert({
        user_id: $('#attStudentId').value, student_name: student.full_name, user_role: 'student',
        session_type: $('#attSessionType').value, check_in_time: dateTime,
        location_details: $('#attLocation').value || 'Manual Entry', recorded_by_id: currentUserId,
        recorded_by_name: currentUserProfile?.full_name, program: currentUserProfile?.program
    });
    if (error) showToast(error.message, 'error');
    else { showToast('Attendance recorded!', 'success'); e.target.reset(); loadAttendance(); }
});

async function loadAttendance() {
    const tbody = $('#attendanceTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6"><div class="loading-spinner"></div> Loading attendance...<\/td><\/tr>';
    const { data, error } = await sb.from('geo_attendance_logs').select('*').order('check_in_time', false);
    if (error) { tbody.innerHTML = `<td><td colspan="6">Error: ${error.message}<\/td><\/tr>`; return; }
    if (!data || data.length === 0) { tbody.innerHTML = '<td><td colspan="6">No attendance records found<\/td><\/tr>'; return; }
    tbody.innerHTML = '';
    data.forEach(a => {
        const student = allStudents.find(s => s.user_id === a.user_id);
        tbody.innerHTML += `<tr>
            <td>${escapeHtml(a.student_name || student?.full_name)}<\/td>
            <td>${escapeHtml(student?.student_id)}<\/td>
            <td>${a.session_type || 'Class'}<\/td>
            <td>${new Date(a.check_in_time).toLocaleString()}<\/td>
            <td>${escapeHtml(a.location_details || a.location_name)}<\/td>
            <td><button class="btn-danger" onclick="deleteAttendanceRecord('${a.id}')">Delete<\/button><\/td>
        </tr>`;
    });
}

window.deleteAttendanceRecord = async (id) => {
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
        exam_name: $('#examTitle').value, exam_date: $('#examDate').value, exam_type: $('#examType').value,
        target_program: $('#examProgram').value, block_term: $('#examBlock').value,
        status: 'Scheduled', created_by: currentUserId
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
    if (error) { tbody.innerHTML = `<tr><td colspan="6">Error: ${error.message}<\/td><\/tr>`; return; }
    if (!data || data.length === 0) { tbody.innerHTML = '<tr><td colspan="6">No exams created<\/td><\/tr>'; return; }
    tbody.innerHTML = '';
    data.forEach(e => {
        tbody.innerHTML += `<tr>
                    <td><span class="badge badge-info">${e.exam_type}<\/span><\/td>
                    <td><strong>${escapeHtml(e.exam_name)}<\/strong><\/td>
                    <td>${e.target_program}/${e.block_term}<\/td>
                    <td>${new Date(e.exam_date).toLocaleDateString()}<\/td>
                    <td><span class="badge badge-warning">${e.status}<\/span><\/td>
                    <td><button class="btn-action" onclick="openGradeModal('${e.id}')">Grade<\/button> <button class="btn-danger" onclick="deleteExam('${e.id}')">Delete<\/button><\/td>
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
window.openGradeModal = async (examId) => {
    const { data: exam } = await sb.from('exams').select('*').eq('id', examId).single();
    if (!exam) return;
    currentGradingExam = exam;
    const students = allStudents.filter(s => s.block === exam.block_term);
    const maxScore = exam.exam_type === 'CAT_1' || exam.exam_type === 'CAT_2' ? 30 : 100;
    $('#gradeModalTitle').textContent = `Grade: ${exam.exam_name}`;
    $('#gradeModalBody').innerHTML = `
        <div class="search-container"><input type="text" id="gradeSearch" placeholder="Search students..." onkeyup="filterGradeTable()"></div>
        <div class="table-responsive"><table class="data-table"><thead><tr><th>Student</th><th>ID</th><th>Score (/${maxScore})</th><th>Status</th></tr></thead>
        <tbody id="gradeTableBody">${students.map(s => `<tr data-name="${s.full_name.toLowerCase()}"><td>${escapeHtml(s.full_name)}<\/td><td>${escapeHtml(s.student_id)}<\/td>
        <td><input type="number" id="score-${s.user_id}" step="0.5" class="grade-input" min="0" max="${maxScore}"><\/td>
        <td><select id="status-${s.user_id}"><option>Graded</option><option selected>Pending</option></select><\/td><\/tr>`).join('')}</tbody></table></div>
    `;
    $('#gradeModal').style.display = 'flex';
};

window.filterGradeTable = function() {
    const search = $('#gradeSearch')?.value.toLowerCase() || '';
    document.querySelectorAll('#gradeTableBody tr').forEach(row => {
        row.style.display = row.getAttribute('data-name')?.includes(search) ? '' : 'none';
    });
};

window.saveAllGrades = async () => {
    const rows = document.querySelectorAll('#gradeTableBody tr');
    let saved = 0;
    for (const row of rows) {
        if (row.style.display === 'none') continue;
        const studentId = row.querySelector('input')?.id.replace('score-', '');
        if (!studentId) continue;
        const score = $(`score-${studentId}`)?.value;
        const status = $(`status-${studentId}`)?.value;
        if (score) {
            const { error } = await sb.from('exam_grades').upsert({
                exam_id: currentGradingExam.id, student_id: studentId, score: parseFloat(score), status: status,
                graded_by: currentUserId, question_id: '00000000-0000-0000-0000-000000000000'
            });
            if (!error) saved++;
        }
    }
    showToast(`Saved ${saved} grades!`, 'success');
    closeModal('gradeModal');
    await loadExams();
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
        title: $('#resourceTitle').value, file_path: fileName, file_url: urlData.publicUrl,
        uploaded_by: currentUserId, uploaded_by_name: currentUserProfile?.full_name
    });
    if (error) showToast(error.message, 'error');
    else { showToast('Resource uploaded!', 'success'); e.target.reset(); await loadResources(); }
});

async function loadResources() {
    const tbody = $('#resourcesTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="3"><div class="loading-spinner"></div> Loading resources...<\/td><\/tr>';
    const { data, error } = await sb.from('resources').select('*').eq('uploaded_by', currentUserId).order('created_at', false);
    if (error) { tbody.innerHTML = `<tr><td colspan="3">Error: ${error.message}<\/td><\/tr>`; return; }
    if (!data || data.length === 0) { tbody.innerHTML = '<td><td colspan="3">No resources<\/td><\/tr>'; return; }
    tbody.innerHTML = '';
    data.forEach(r => {
        tbody.innerHTML += `<tr>
            <td>${escapeHtml(r.title)}<\/td>
            <td>${new Date(r.created_at).toLocaleDateString()}<\/td>
            <td><a href="${r.file_url}" target="_blank" class="btn-action">Download<\/a> <button class="btn-danger" onclick="deleteResource('${r.id}')">Delete<\/button><\/td>
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
    const program = currentUserProfile?.program || 'KRCHN';
    const { data: students } = await sb.from('consolidated_user_profiles_table').select('user_id, full_name').eq('role', 'student').eq('program', program);
    if ($('msgRecipient')) {
        $('msgRecipient').innerHTML = '<option value="">Select Student</option>' + (students || []).map(s => `<option value="${s.user_id}">${escapeHtml(s.full_name)}</option>`).join('');
    }
    const tbody = $('#messagesTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4"><div class="loading-spinner"></div> Loading messages...<\/td><\/tr>';
    const { data, error } = await sb.from('notifications').select('*').eq('sender_id', currentUserId).order('created_at', false);
    if (error) { tbody.innerHTML = `<td><td colspan="4">Error: ${error.message}<\/td><\/tr>`; return; }
    if (!data || data.length === 0) { tbody.innerHTML = '<tr><td colspan="4">No messages sent<\/td><\/tr>'; return; }
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
        target_user_id: $('#msgRecipient').value, subject: $('#msgSubject').value, message: $('#msgBody').value,
        sender_id: currentUserId, sender_name: currentUserProfile?.full_name
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
    const [sessions, exams] = await Promise.all([
        sb.from('scheduled_sessions').select('*'),
        sb.from('exams').select('*').eq('created_by', currentUserId)
    ]);
    const events = [
        ...(sessions.data || []).map(s => ({ title: s.session_title, start: s.session_date, color: '#3498db' })),
        ...(exams.data || []).map(e => ({ title: `${e.exam_type}: ${e.exam_name}`, start: e.exam_date, color: '#e74c3c' }))
    ];
    if (calendar) calendar.destroy();
    calendar = new FullCalendar.Calendar(el, { initialView: 'dayGridMonth', headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' }, events });
    calendar.render();
}

// Photo upload
$('#uploadPhotoBtn')?.addEventListener('click', () => $('#photoInput')?.click());
$('#photoInput')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fileName = `avatars/${currentUserId}_${Date.now()}.jpg`;
    const { error: uploadError } = await sb.storage.from('resources').upload(fileName, file);
    if (uploadError) { showToast(uploadError.message, 'error'); return; }
    const { data } = sb.storage.from('resources').getPublicUrl(fileName);
    await sb.from('consolidated_user_profiles_table').update({ avatar_url: data.publicUrl }).eq('user_id', currentUserId);
    showToast('Photo updated!', 'success');
    loadProfile();
});

window.exportCourses = () => showToast('Export feature coming soon', 'info');
window.exportStudents = () => showToast('Export feature coming soon', 'info');

// =====================================================
// INITIALIZATION
// =====================================================
async function init() {
    console.log('Initializing Lecturer Dashboard...');
    
    const { data: { session }, error: sessionError } = await sb.auth.getSession();
    
    if (sessionError || !session) {
        console.warn('Session check failed, redirecting to login');
        window.location.href = 'login.html';
        return;
    }
    
    currentUserId = session.user.id;
    console.log('User ID:', currentUserId);
    
    const { data: profile, error: profileError } = await sb
        .from('consolidated_user_profiles_table')
        .select('*')
        .eq('user_id', currentUserId)
        .maybeSingle();
    
    if (profileError || !profile) {
        console.warn('Profile not found, using default');
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
    
    if ($('welcomeHeader')) {
        $('welcomeHeader').textContent = `Welcome, ${currentUserProfile.full_name || 'Lecturer'}!`;
    }
    
    await loadCourses();
    await loadStudents();
    await loadDashboard();
    await loadTodaySchedule();
    await loadMessages();
    await loadProfile();
    
    ['sessionProgram', 'examProgram'].forEach(id => {
        const el = $(id);
        if (el) {
            updateProgramDropdown(el);
            el.addEventListener('change', () => updateBlockOptions(id, id === 'sessionProgram' ? 'sessionBlock' : 'examBlock'));
        }
    });
    
    sb.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') {
            window.location.href = 'login.html';
        }
    });
    
    console.log('Dashboard ready!');
    console.log('Students loaded:', allStudents.length);
    console.log('Courses loaded:', allCourses.length);
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing...');
    
    $('#mobileNavToggle')?.addEventListener('click', () => $('#sidebar')?.classList.toggle('active'));
    document.querySelectorAll('.nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = link.getAttribute('data-tab');
            if (tabId) showTab(tabId);
            $('#sidebar')?.classList.remove('active');
        });
    });
    $('#logoutBtn')?.addEventListener('click', async () => { await sb.auth.signOut(); window.location.href = 'login.html'; });
    $('#notificationBtn')?.addEventListener('click', () => showToast('No new notifications', 'info'));
    $('#helpBtn')?.addEventListener('click', () => showToast('Contact support: support@nchsm.ac.ke', 'info'));
    
    window.closeModal = closeModal;
    
    // Start app
    init();
});
