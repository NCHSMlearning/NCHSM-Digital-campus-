// =====================================================
// NCHSM LECTURER DASHBOARD SCRIPT
// Matches Super Admin database structure
// =====================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// =====================================================
// SUPABASE CONFIGURATION (SAME AS SUPER ADMIN)
// =====================================================
const SUPABASE_URL = 'https://lwhtjozfsmbyihenfunw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.sb = sb;

// =====================================================
// GLOBAL VARIABLES
// =====================================================
let currentUserProfile = null;
let currentUserId = null;
let attendanceMap = null;
let allCourses = [];
let allStudents = [];
let lecturerTargetProgram = null;

// =====================================================
// UTILITY FUNCTIONS
// =====================================================
function $(id) { return document.getElementById(id); }

function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function showFeedback(message, type = 'success') {
    const el = $('feedbackMessage');
    if (el) {
        el.textContent = message;
        el.className = `feedback-${type}`;
        el.style.display = 'block';
        setTimeout(() => { el.style.display = 'none'; }, 5000);
    } else {
        alert(message);
    }
}

function setButtonLoading(btn, loading, originalText = 'Submit') {
    if (!btn) return;
    if (loading) {
        btn.disabled = true;
        btn.dataset.original = btn.textContent;
        btn.textContent = 'Processing...';
    } else {
        btn.disabled = false;
        btn.textContent = btn.dataset.original || originalText;
    }
}

window.showTab = function(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
        tab.style.display = 'none';
    });
    const target = $(tabId + '-content');
    if (target) {
        target.classList.add('active');
        target.style.display = 'block';
    }
    document.querySelectorAll('.nav a').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.tab === tabId) link.classList.add('active');
    });
    loadSectionData(tabId);
};

window.closeModal = function(modalId) {
    const modal = $(modalId);
    if (modal) modal.classList.remove('active');
};

// =====================================================
// SESSION INITIALIZATION
// =====================================================
async function initSession() {
    try {
        const { data: { session }, error } = await sb.auth.getSession();
        if (error || !session) throw new Error('No active session');
        
        currentUserId = session.user.id;
        
        const { data: profile, error: profileError } = await sb
            .from('consolidated_user_profiles_table')
            .select('*')
            .eq('user_id', currentUserId)
            .single();
        
        if (profileError) throw profileError;
        if (profile.role !== 'lecturer') throw new Error('Access denied: Lecturer only');
        
        currentUserProfile = profile;
        lecturerTargetProgram = profile.program || 'KRCHN';
        
        $('welcomeHeader').textContent = `Welcome, ${profile.full_name || 'Lecturer'}!`;
        
        await loadGlobalData();
        loadSectionData('dashboard');
        setupEventListeners();
        
    } catch (error) {
        console.error('Session error:', error);
        alert('Session expired. Please login again.');
        window.location.href = '/login';
    }
}

async function loadGlobalData() {
    try {
        const [coursesRes, studentsRes] = await Promise.all([
            sb.from('courses').select('*').eq('target_program', lecturerTargetProgram),
            sb.from('consolidated_user_profiles_table').select('*').eq('role', 'student').eq('program', lecturerTargetProgram)
        ]);
        allCourses = coursesRes.data || [];
        allStudents = studentsRes.data || [];
        console.log(`Loaded ${allCourses.length} courses, ${allStudents.length} students`);
    } catch (error) {
        console.error('Error loading global data:', error);
    }
}

// =====================================================
// SECTION LOADERS
// =====================================================
function loadSectionData(tabId) {
    switch(tabId) {
        case 'dashboard': loadDashboard(); break;
        case 'profile': loadProfile(); break;
        case 'my-courses': loadCourses(); break;
        case 'my-students': loadStudents(); break;
        case 'sessions': loadSessions(); populateSessionForm(); break;
        case 'attendance': loadAttendance(); loadPastAttendance(); populateAttendanceForm(); break;
        case 'cats': loadExams(); populateExamForm(); break;
        case 'resources': loadResources(); populateResourceForm(); break;
        case 'messages': loadMessages(); populateMessageForm(); break;
        case 'calendar': loadCalendar(); break;
    }
}

// =====================================================
// DASHBOARD
// =====================================================
async function loadDashboard() {
    $('totalStudents').textContent = allStudents.length;
    $('totalCourses').textContent = allCourses.length;
    $('atRiskCount').textContent = Math.floor(allStudents.length * 0.1);
    $('pendingGrading').textContent = '0';
    
    // Load attendance metrics
    const today = new Date().toISOString().split('T')[0];
    const { data: todayData } = await sb.from('geo_attendance_logs').select('*').eq('program', lecturerTargetProgram).gte('check_in_time', today);
    $('todayAttendance').textContent = todayData?.length || 0;
    
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const { data: weekData } = await sb.from('geo_attendance_logs').select('*').eq('program', lecturerTargetProgram).gte('check_in_time', weekAgo.toISOString());
    $('weeklyAttendance').textContent = weekData?.length || 0;
    
    const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30);
    const { data: monthData } = await sb.from('geo_attendance_logs').select('*').eq('program', lecturerTargetProgram).gte('check_in_time', monthAgo.toISOString());
    const rate = allStudents.length ? Math.round((monthData?.length || 0) / allStudents.length) : 0;
    $('monthlyRate').textContent = `${rate}%`;
}

// =====================================================
// PROFILE
// =====================================================
function loadProfile() {
    if (!currentUserProfile) return;
    $('profileName').textContent = currentUserProfile.full_name || 'N/A';
    $('profileRole').textContent = currentUserProfile.role || 'Lecturer';
    $('profileId').textContent = currentUserProfile.employee_id || currentUserProfile.user_id?.slice(0, 8) || 'N/A';
    $('profileEmail').textContent = currentUserProfile.email || 'N/A';
    $('profilePhone').textContent = currentUserProfile.phone || 'N/A';
    $('profileDept').textContent = currentUserProfile.department || 'N/A';
    $('profileProgram').textContent = lecturerTargetProgram || 'N/A';
    $('profileJoinDate').textContent = currentUserProfile.created_at ? new Date(currentUserProfile.created_at).toLocaleDateString() : 'N/A';
}

// =====================================================
// COURSES
// =====================================================
function loadCourses() {
    const tbody = $('coursesTableBody');
    if (!allCourses.length) { tbody.innerHTML = '<tr><td colspan="7">No courses found</td></tr>'; return; }
    
    tbody.innerHTML = allCourses.map(c => `
        <tr>
            <td><strong>${escapeHtml(c.unit_code || 'N/A')}</strong></td>
            <td>${escapeHtml(c.course_name)}</td>
            <td>${escapeHtml(c.target_program)}</td>
            <td>${escapeHtml(c.block || 'N/A')}</td>
            <td>${escapeHtml(c.intake_year || 'N/A')}</td>
            <td>${allStudents.filter(s => s.intake_year === c.intake_year).length}</td>
            <td><button class="btn-action" onclick="alert('Course management coming soon')"><i class="fas fa-chart-bar"></i> Manage</button></td>
        </tr>
    `).join('');
    
    // Populate filters
    const intakes = [...new Set(allCourses.map(c => c.intake_year).filter(Boolean))];
    $('courseIntakeFilter').innerHTML = '<option value="">All Intakes</option>' + intakes.map(y => `<option value="${y}">${y}</option>`).join('');
    const blocks = [...new Set(allCourses.map(c => c.block).filter(Boolean))];
    $('courseBlockFilter').innerHTML = '<option value="">All Blocks</option>' + blocks.map(b => `<option value="${b}">${b}</option>`).join('');
}

window.filterCourses = function() {
    const intake = $('courseIntakeFilter').value;
    const block = $('courseBlockFilter').value;
    const search = $('courseSearch').value.toLowerCase();
    const filtered = allCourses.filter(c => 
        (!intake || c.intake_year === intake) &&
        (!block || c.block === block) &&
        (!search || c.course_name?.toLowerCase().includes(search) || c.unit_code?.toLowerCase().includes(search))
    );
    const tbody = $('coursesTableBody');
    if (!filtered.length) { tbody.innerHTML = '<tr><td colspan="7">No matching courses</td></tr>'; return; }
    tbody.innerHTML = filtered.map(c => `
        <tr><td><strong>${escapeHtml(c.unit_code)}</strong></td><td>${escapeHtml(c.course_name)}</td><td>${escapeHtml(c.target_program)}</td>
        <td>${escapeHtml(c.block)}</td><td>${escapeHtml(c.intake_year)}</td><td>${allStudents.filter(s => s.intake_year === c.intake_year).length}</td>
        <td><button class="btn-action" onclick="alert('Manage course')">Manage</button></td></tr>
    `).join('');
};

// =====================================================
// STUDENTS
// =====================================================
function loadStudents() {
    const tbody = $('studentsTableBody');
    if (!allStudents.length) { tbody.innerHTML = '<tr><td colspan="8">No students found</td></tr>'; return; }
    
    tbody.innerHTML = allStudents.map(s => `
        <tr class="${(s.cumulative_absences || 0) > 5 ? 'at-risk' : ''}">
            <td>${escapeHtml(s.full_name)}</td>
            <td><strong>${escapeHtml(s.student_id || 'N/A')}</strong></td>
            <td>${escapeHtml(s.email)}</td>
            <td>${escapeHtml(s.program)}</td>
            <td>${escapeHtml(s.intake_year)}</td>
            <td>${escapeHtml(s.block || 'N/A')}</td>
            <td><span class="badge ${(s.cumulative_absences || 0) > 5 ? 'badge-danger' : 'badge-success'}">${(s.cumulative_absences || 0) > 5 ? 'At Risk' : 'Active'}</span></td>
            <td><button class="btn-action" onclick="alert('View student: ${s.full_name}')"><i class="fas fa-eye"></i> View</button></td>
        </tr>
    `).join('');
    
    // Populate filters
    const intakes = [...new Set(allStudents.map(s => s.intake_year).filter(Boolean))];
    $('studentIntakeFilter').innerHTML = '<option value="">All</option>' + intakes.map(y => `<option value="${y}">${y}</option>`).join('');
}

window.filterStudents = function() {
    const intake = $('studentIntakeFilter').value;
    const status = $('studentStatusFilter').value;
    const search = $('studentSearch').value.toLowerCase();
    const filtered = allStudents.filter(s => 
        (!intake || s.intake_year === intake) &&
        (status === 'all' || (status === 'active' && (s.cumulative_absences || 0) <= 5) || (status === 'at-risk' && (s.cumulative_absences || 0) > 5)) &&
        (!search || s.full_name?.toLowerCase().includes(search) || s.student_id?.toLowerCase().includes(search))
    );
    const tbody = $('studentsTableBody');
    if (!filtered.length) { tbody.innerHTML = '<tr><td colspan="8">No matching students</td></tr>'; return; }
    tbody.innerHTML = filtered.map(s => `
        <tr><td>${escapeHtml(s.full_name)}</td><td>${escapeHtml(s.student_id)}</td><td>${escapeHtml(s.email)}</td>
        <td>${escapeHtml(s.program)}</td><td>${escapeHtml(s.intake_year)}</td><td>${escapeHtml(s.block)}</td>
        <td><span class="badge ${(s.cumulative_absences || 0) > 5 ? 'badge-danger' : 'badge-success'}">${(s.cumulative_absences || 0) > 5 ? 'At Risk' : 'Active'}</span></td>
        <td><button class="btn-action" onclick="alert('View student')">View</button></td></tr>
    `).join('');
};

// =====================================================
// SESSIONS
// =====================================================
function populateSessionForm() {
    $('sessionProgram').innerHTML = `<option value="${lecturerTargetProgram}">${lecturerTargetProgram}</option>`;
    $('sessionCourse').innerHTML = '<option value="">Select Course</option>' + allCourses.map(c => `<option value="${c.id}">${c.course_name}</option>`).join('');
    updateBlockOptions('sessionProgram', 'sessionBlock', lecturerTargetProgram);
}

$('addSessionForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.submitter;
    setButtonLoading(btn, true);
    try {
        const { error } = await sb.from('scheduled_sessions').insert({
            session_title: $('sessionTitle').value,
            session_date: $('sessionDate').value,
            session_time: $('sessionTime').value,
            target_program: $('sessionProgram').value,
            block_term: $('sessionBlock').value,
            course_id: $('sessionCourse').value,
            lecturer_id: currentUserId
        });
        if (error) throw error;
        showFeedback('Session scheduled successfully!', 'success');
        e.target.reset();
        loadSessions();
    } catch (error) {
        showFeedback(error.message, 'error');
    } finally {
        setButtonLoading(btn, false);
    }
});

async function loadSessions() {
    const { data, error } = await sb.from('scheduled_sessions').select('*').eq('lecturer_id', currentUserId).order('session_date', true);
    const tbody = $('sessionsTableBody');
    if (error || !data?.length) { tbody.innerHTML = '<tr><td colspan="6">No sessions scheduled</td></tr>'; return; }
    tbody.innerHTML = data.map(s => `
        <tr>
            <td>${escapeHtml(s.session_title)}</td>
            <td>${new Date(s.session_date).toLocaleDateString()} @ ${s.session_time}</td>
            <td>${allCourses.find(c => c.id === s.course_id)?.course_name || 'N/A'}</td>
            <td>${s.target_program}/${s.block_term}</td>
            <td><button class="btn-action" onclick="navigator.clipboard.writeText('${window.location.origin}/attendance?session=${s.id}')">Copy Link</button></td>
            <td><button class="btn-danger" onclick="deleteSession('${s.id}')">Delete</button></td>
        </tr>
    `).join('');
}

window.deleteSession = async (id) => {
    if (!confirm('Delete this session?')) return;
    await sb.from('scheduled_sessions').delete().eq('id', id);
    loadSessions();
    showFeedback('Session deleted', 'success');
};

// =====================================================
// ATTENDANCE
// =====================================================
function populateAttendanceForm() {
    $('attStudentId').innerHTML = '<option value="">Select Student</option>' + allStudents.map(s => `<option value="${s.user_id}">${s.full_name} (${s.student_id})</option>`).join('');
    $('attCourseId').innerHTML = '<option value="">Select Course</option>' + allCourses.map(c => `<option value="${c.id}">${c.course_name}</option>`).join('');
    $('attDate').value = new Date().toISOString().split('T')[0];
}

$('lecturerCheckinBtn')?.addEventListener('click', async () => {
    if (!navigator.geolocation) { alert('Geolocation not supported'); return; }
    navigator.geolocation.getCurrentPosition(async (pos) => {
        const { error } = await sb.from('geo_attendance_logs').insert({
            user_id: currentUserId,
            user_role: 'lecturer',
            session_type: 'Lecturer Check-in',
            check_in_time: new Date().toISOString(),
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            program: lecturerTargetProgram,
            location_name: 'Lecturer Check-in'
        });
        if (error) showFeedback(error.message, 'error');
        else { showFeedback('Check-in recorded!', 'success'); loadAttendance(); }
    }, () => alert('Location access denied'));
});

$('manualAttendanceForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.submitter;
    setButtonLoading(btn, true);
    const student = allStudents.find(s => s.user_id === $('attStudentId').value);
    if (!student) { showFeedback('Select a student', 'error'); setButtonLoading(btn, false); return; }
    const dateTime = `${$('attDate').value}T${$('attTime').value || '12:00'}:00`;
    const { error } = await sb.from('geo_attendance_logs').insert({
        user_id: $('attStudentId').value,
        student_name: student.full_name,
        user_role: 'student',
        session_type: $('attSessionType').value,
        check_in_time: dateTime,
        course_id: $('attCourseId').value || null,
        location_details: $('attLocation').value || 'Manual Entry',
        status: 'Present',
        recorded_by_id: currentUserId,
        recorded_by_name: currentUserProfile.full_name,
        program: lecturerTargetProgram,
        is_manual_entry: true
    });
    setButtonLoading(btn, false);
    if (error) showFeedback(error.message, 'error');
    else { showFeedback('Attendance recorded!', 'success'); e.target.reset(); loadAttendance(); }
});

async function loadAttendance() {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await sb.from('geo_attendance_logs').select('*').gte('check_in_time', today).order('check_in_time', false);
    const tbody = $('attendanceTableBody');
    if (error || !data?.length) { tbody.innerHTML = '<tr><td colspan="8">No attendance today</td></tr>'; return; }
    tbody.innerHTML = data.map(a => {
        const student = allStudents.find(s => s.user_id === a.user_id);
        return `<tr>
            <td>${escapeHtml(a.student_name || student?.full_name || 'N/A')}</td>
            <td>${escapeHtml(student?.student_id || 'N/A')}</td>
            <td>${escapeHtml(a.session_type)}</td>
            <td>${escapeHtml(allCourses.find(c => c.id === a.course_id)?.course_name || 'N/A')}</td>
            <td>${new Date(a.check_in_time).toLocaleTimeString()}</td>
            <td>${escapeHtml(a.location_details || 'N/A')}</td>
            <td><span class="badge badge-success">Present</span></td>
            <td>${a.latitude ? `<button class="btn-action" onclick="showMap(${a.latitude},${a.longitude},'${escapeHtml(a.student_name || student?.full_name)}')">Map</button>` : 'No GPS'}</td>
        </tr>`;
    }).join('');
}

async function loadPastAttendance() {
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 30);
    const { data, error } = await sb.from('geo_attendance_logs').select('*').lte('check_in_time', weekAgo.toISOString()).order('check_in_time', false).limit(100);
    const tbody = $('pastAttendanceTableBody');
    if (error || !data?.length) { tbody.innerHTML = '<tr><td colspan="8">No past records</td></tr>'; return; }
    tbody.innerHTML = data.map(a => {
        const student = allStudents.find(s => s.user_id === a.user_id);
        return `<tr>
            <td>${new Date(a.check_in_time).toLocaleDateString()}</td>
            <td>${escapeHtml(a.student_name || student?.full_name || 'N/A')}</td>
            <td>${escapeHtml(student?.student_id || 'N/A')}</td>
            <td>${escapeHtml(a.session_type)}</td>
            <td>${escapeHtml(allCourses.find(c => c.id === a.course_id)?.course_name || 'N/A')}</td>
            <td>${new Date(a.check_in_time).toLocaleTimeString()}</td>
            <td><span class="badge badge-success">Present</span></td>
            <td>${escapeHtml(a.recorded_by_name || 'Self')}</td>
        </tr>`;
    }).join('');
}

window.filterAttendance = function() {
    const search = $('attendanceSearch').value.toLowerCase();
    const rows = document.querySelectorAll('#attendanceTableBody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(search) ? '' : 'none';
    });
};

window.showMap = function(lat, lng, name) {
    const modal = $('mapModal');
    modal.classList.add('active');
    setTimeout(() => {
        if (window.attendanceMap) window.attendanceMap.remove();
        window.attendanceMap = L.map('mapContainer').setView([lat, lng], 16);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(window.attendanceMap);
        L.marker([lat, lng]).addTo(window.attendanceMap).bindPopup(`${name}'s location`).openPopup();
    }, 100);
};

// =====================================================
// EXAMS
// =====================================================
function populateExamForm() {
    $('examProgram').innerHTML = `<option value="${lecturerTargetProgram}">${lecturerTargetProgram}</option>`;
    $('examCourse').innerHTML = '<option value="">Select Course</option>' + allCourses.map(c => `<option value="${c.id}">${c.course_name}</option>`).join('');
    updateBlockOptions('examProgram', 'examBlock', lecturerTargetProgram);
}

$('addExamForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.submitter;
    setButtonLoading(btn, true);
    const { error } = await sb.from('exams').insert({
        exam_name: $('examTitle').value,
        exam_date: $('examDate').value,
        exam_type: $('examType').value,
        target_program: $('examProgram').value,
        intake_year: $('examIntake').value,
        block_term: $('examBlock').value,
        course_id: $('examCourse').value || null,
        duration_minutes: parseInt($('examDuration').value),
        status: $('examStatus').value,
        created_by: currentUserId
    });
    setButtonLoading(btn, false);
    if (error) showFeedback(error.message, 'error');
    else { showFeedback('Exam created!', 'success'); e.target.reset(); loadExams(); }
});

async function loadExams() {
    const { data, error } = await sb.from('exams').select('*, course:course_id(course_name)').eq('created_by', currentUserId).order('exam_date', false);
    const tbody = $('examsTableBody');
    if (error || !data?.length) { tbody.innerHTML = '<tr><td colspan="7">No exams created</td></tr>'; return; }
    tbody.innerHTML = data.map(e => `
        <tr>
            <td><span class="badge badge-info">${escapeHtml(e.exam_type)}</span></td>
            <td><strong>${escapeHtml(e.exam_name)}</strong></td>
            <td>${escapeHtml(e.course?.course_name || 'General')}</td>
            <td>${e.target_program}/${e.block_term}</td>
            <td>${new Date(e.exam_date).toLocaleDateString()}</td>
            <td><span class="badge ${e.status === 'Scheduled' ? 'badge-warning' : e.status === 'Completed' ? 'badge-success' : 'badge-info'}">${e.status}</span></td>
            <td><button class="btn-action" onclick="openGradeModal('${e.id}')">Grade</button> <button class="btn-warning" onclick="openEditExamModal('${e.id}')">Edit</button> <button class="btn-danger" onclick="deleteExam('${e.id}')">Delete</button></td>
        </tr>
    `).join('');
}

window.deleteExam = async (id) => {
    if (!confirm('Delete this exam?')) return;
    await sb.from('exams').delete().eq('id', id);
    loadExams();
    showFeedback('Exam deleted', 'success');
};

window.openEditExamModal = async (id) => {
    const { data } = await sb.from('exams').select('*').eq('id', id).single();
    if (!data) return;
    $('editExamId').value = data.id;
    $('editExamTitle').value = data.exam_name;
    $('editExamDate').value = data.exam_date;
    $('editExamStatus').value = data.status;
    $('examEditModal').classList.add('active');
};

$('editExamForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = $('editExamId').value;
    await sb.from('exams').update({
        exam_name: $('editExamTitle').value,
        exam_date: $('editExamDate').value,
        status: $('editExamStatus').value
    }).eq('id', id);
    closeModal('examEditModal');
    loadExams();
    showFeedback('Exam updated', 'success');
});

// =====================================================
// GRADE MODAL
// =====================================================
window.openGradeModal = async (examId) => {
    const { data: exam } = await sb.from('exams').select('*, course:course_id(course_name)').eq('id', examId).single();
    const { data: students } = await sb.from('consolidated_user_profiles_table').select('user_id, full_name, student_id').eq('program', exam.target_program).eq('intake_year', exam.intake_year).eq('block', exam.block_term);
    const { data: grades } = await sb.from('exam_grades').select('*').eq('exam_id', examId);
    
    $('gradeModalTitle').textContent = `Grade: ${exam.exam_name}`;
    $('gradeModalBody').innerHTML = `
        <div class="search-container"><input type="text" id="gradeSearch" placeholder="Search students..." onkeyup="filterGradeTable()"></div>
        <div class="table-responsive"><table class="data-table"><thead><tr><th>Student</th><th>ID</th><th>Score (/${exam.exam_type === 'CAT' ? 30 : 100})</th><th>Status</th></tr></thead>
        <tbody id="gradeTableBody">${students.map(s => {
            const grade = grades?.find(g => g.student_id === s.user_id);
            return `<tr data-name="${s.full_name.toLowerCase()}"><td>${escapeHtml(s.full_name)}</td><td>${escapeHtml(s.student_id)}</td>
            <td><input type="number" id="score-${s.user_id}" value="${grade?.score || ''}" step="0.5" class="form-control" style="width:100px"></td>
            <td><select id="status-${s.user_id}"><option ${grade?.status === 'Graded' ? 'selected' : ''}>Graded</option><option ${grade?.status === 'Pending' ? 'selected' : ''}>Pending</option></select></td></tr>`;
        }).join('')}</tbody></table></div>
    `;
    window.currentGradingExamId = examId;
    $('gradeModal').classList.add('active');
};

window.filterGradeTable = function() {
    const search = $('gradeSearch')?.value.toLowerCase() || '';
    const rows = document.querySelectorAll('#gradeTableBody tr');
    rows.forEach(row => {
        const name = row.getAttribute('data-name') || '';
        row.style.display = name.includes(search) ? '' : 'none';
    });
};

window.saveGrades = async () => {
    const rows = document.querySelectorAll('#gradeTableBody tr');
    for (const row of rows) {
        if (row.style.display === 'none') continue;
        const studentId = row.querySelector('input')?.id.replace('score-', '');
        if (!studentId) continue;
        const score = $(`score-${studentId}`)?.value;
        const status = $(`status-${studentId}`)?.value;
        if (score) {
            await sb.from('exam_grades').upsert({
                exam_id: window.currentGradingExamId,
                student_id: studentId,
                score: parseFloat(score),
                status: status,
                graded_by: currentUserId,
                question_id: '00000000-0000-0000-0000-000000000000'
            });
        }
    }
    showFeedback('Grades saved!', 'success');
    closeModal('gradeModal');
    loadExams();
};

// =====================================================
// RESOURCES
// =====================================================
function populateResourceForm() {
    $('resourceProgram').innerHTML = `<option value="${lecturerTargetProgram}">${lecturerTargetProgram}</option>`;
    updateBlockOptions('resourceProgram', 'resourceBlock', lecturerTargetProgram);
}

$('uploadResourceForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.submitter;
    setButtonLoading(btn, true);
    const file = $('resourceFile').files[0];
    if (!file) { alert('Select a file'); setButtonLoading(btn, false); return; }
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `${lecturerTargetProgram}/${$('resourceIntake').value}/${$('resourceBlock').value}/${fileName}`;
    const { error: uploadError } = await sb.storage.from('resources').upload(filePath, file);
    if (uploadError) { showFeedback(uploadError.message, 'error'); setButtonLoading(btn, false); return; }
    const { data: urlData } = sb.storage.from('resources').getPublicUrl(filePath);
    const { error } = await sb.from('resources').insert({
        title: $('resourceTitle').value,
        category: $('resourceCategory').value,
        program_type: lecturerTargetProgram,
        intake: $('resourceIntake').value,
        block: $('resourceBlock').value,
        file_path: filePath,
        file_url: urlData.publicUrl,
        uploaded_by: currentUserId,
        uploaded_by_name: currentUserProfile.full_name
    });
    setButtonLoading(btn, false);
    if (error) showFeedback(error.message, 'error');
    else { showFeedback('Resource uploaded!', 'success'); e.target.reset(); loadResources(); }
});

async function loadResources() {
    const { data, error } = await sb.from('resources').select('*').eq('uploaded_by', currentUserId).order('created_at', false);
    const tbody = $('resourcesTableBody');
    if (error || !data?.length) { tbody.innerHTML = '<tr><td colspan="5">No resources uploaded</td></tr>'; return; }
    tbody.innerHTML = data.map(r => `
        <tr>
            <td>${escapeHtml(r.title)}</td>
            <td><span class="badge badge-info">${escapeHtml(r.category)}</span></td>
            <td>${r.program_type}/${r.block}</td>
            <td>${new Date(r.created_at).toLocaleDateString()}</td>
            <td><a href="${r.file_url}" target="_blank" class="btn-action">Download</a> <button class="btn-danger" onclick="deleteResource('${r.id}')">Delete</button></td>
        </tr>
    `).join('');
}

window.deleteResource = async (id) => {
    if (!confirm('Delete this resource?')) return;
    await sb.from('resources').delete().eq('id', id);
    loadResources();
    showFeedback('Resource deleted', 'success');
};

// =====================================================
// MESSAGES
// =====================================================
function populateMessageForm() {
    $('msgRecipient').innerHTML = '<option value="">Select Student</option>' + allStudents.map(s => `<option value="${s.user_id}">${s.full_name}</option>`).join('');
}

$('sendMessageForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.submitter;
    setButtonLoading(btn, true);
    const student = allStudents.find(s => s.user_id === $('msgRecipient').value);
    if (!student) { showFeedback('Select a recipient', 'error'); setButtonLoading(btn, false); return; }
    const { error } = await sb.from('notifications').insert({
        target_program: lecturerTargetProgram,
        target_user_id: $('msgRecipient').value,
        subject: $('msgSubject').value,
        message: $('msgBody').value,
        sender_id: currentUserId,
        sender_name: currentUserProfile.full_name
    });
    setButtonLoading(btn, false);
    if (error) showFeedback(error.message, 'error');
    else { showFeedback('Message sent!', 'success'); e.target.reset(); loadMessages(); }
});

async function loadMessages() {
    const { data, error } = await sb.from('notifications').select('*').eq('sender_id', currentUserId).order('created_at', false);
    const tbody = $('messagesTableBody');
    if (error || !data?.length) { tbody.innerHTML = '<tr><td colspan="4">No messages sent</td></tr>'; return; }
    tbody.innerHTML = data.map(m => `
        <tr>
            <td>${new Date(m.created_at).toLocaleDateString()}</td>
            <td>${escapeHtml(m.subject)}</td>
            <td>${allStudents.find(s => s.user_id === m.target_user_id)?.full_name || m.target_program}</td>
            <td><span class="badge badge-success">Sent</span></td>
        </tr>
    `).join('');
}

// =====================================================
// CALENDAR
// =====================================================
let calendar = null;
async function loadCalendar() {
    const calendarEl = $('calendarDisplay');
    if (!calendarEl) return;
    const { data: sessions } = await sb.from('scheduled_sessions').select('*').eq('lecturer_id', currentUserId);
    const { data: exams } = await sb.from('exams').select('*').eq('created_by', currentUserId);
    const events = [
        ...(sessions || []).map(s => ({ title: s.session_title, start: s.session_date, color: '#3498db' })),
        ...(exams || []).map(e => ({ title: `${e.exam_type}: ${e.exam_name}`, start: e.exam_date, color: '#e74c3c' }))
    ];
    if (calendar) calendar.destroy();
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth' },
        events: events
    });
    calendar.render();
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================
function updateBlockOptions(programId, blockId, program) {
    const blockSelect = $(blockId);
    if (!blockSelect) return;
    const blocks = program === 'KRCHN' 
        ? ['Introductory', 'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Block 6', 'Final']
        : ['Introductory', 'Term1', 'Term2', 'Term3', 'Term4', 'Term5', 'Term6', 'Final'];
    blockSelect.innerHTML = '<option value="">Select Block/Term</option>' + blocks.map(b => `<option value="${b}">${b}</option>`).join('');
}

function setupEventListeners() {
    $('sessionProgram')?.addEventListener('change', () => updateBlockOptions('sessionProgram', 'sessionBlock', $('sessionProgram').value));
    $('examProgram')?.addEventListener('change', () => updateBlockOptions('examProgram', 'examBlock', $('examProgram').value));
    $('resourceProgram')?.addEventListener('change', () => updateBlockOptions('resourceProgram', 'resourceBlock', $('resourceProgram').value));
    $('profileStatus')?.addEventListener('click', () => showFeedback('Profile editing coming soon', 'info'));
    $('editProfileBtn')?.addEventListener('click', () => showFeedback('Profile editing coming soon', 'info'));
    $('changePasswordBtn')?.addEventListener('click', () => showFeedback('Password change coming soon', 'info'));
}

// =====================================================
// INITIALIZE
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing Lecturer Dashboard...');
    initSession();
    setupEventListeners();
});
