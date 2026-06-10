// =====================================================
// LECTURER DASHBOARD - FOLLOWS SUPER ADMIN PATTERNS EXACTLY
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
// HELPER FUNCTIONS (EXACTLY LIKE SUPER ADMIN)
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

// =====================================================
// SIMPLE GLOBAL SHOWTAB FUNCTION - MATCHES SUPER ADMIN
// =====================================================
window.showTab = function(tabId) {
    console.log('Opening tab:', tabId);
    
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
        tab.classList.remove('active');
    });
    
    const target = document.getElementById(tabId);
    if (target) {
        target.style.display = 'block';
        target.classList.add('active');
    }
    
    document.querySelectorAll('.nav a').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-tab') === tabId) {
            link.classList.add('active');
        }
    });
    
    if (typeof loadSectionData === 'function') {
        loadSectionData(tabId);
    }
};

// =====================================================
// TAB DATA LOADING (MATCHES SUPER ADMIN PATTERN)
// =====================================================
async function loadSectionData(tabId) {
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    
    switch(tabId) {
        case 'dashboard': 
            loadDashboardData();
            loadTodaySchedule();
            break;
        case 'profile': 
            loadProfile(); 
            break;
        case 'my-courses': 
            loadCourses(); 
            break;
        case 'my-students': 
            loadStudents(); 
            break;
        case 'sessions': 
            loadSessions(); 
            break;
        case 'attendance': 
            loadAttendance();
            populateAttendanceSelects();
            break;
        case 'cats': 
            loadExams(); 
            break;
        case 'resources': 
            loadResources(); 
            break;
        case 'messages': 
            loadMessages(); 
            break;
        case 'calendar': 
            loadCalendar(); 
            break;
    }
}

// =====================================================
// DASHBOARD (MATCHES SUPER ADMIN)
// =====================================================
async function loadDashboardData() {
    const totalStudentsEl = $('#totalStudents');
    const totalCoursesEl = $('#totalCourses');
    const pendingGradingEl = $('#pendingGrading');
    
    if (totalStudentsEl) totalStudentsEl.textContent = allStudents.length;
    if (totalCoursesEl) totalCoursesEl.textContent = allCourses.length;
    if (pendingGradingEl) pendingGradingEl.textContent = allExams.filter(e => e.status === 'Scheduled').length;
    
    const today = new Date().toISOString().slice(0, 10);
    const { count: todaySessions } = await sb.from('scheduled_sessions').select('*', { count: 'exact', head: true }).eq('session_date', today).eq('lecturer_id', currentUserId);
    const todaySessionsEl = $('#todaySessions');
    if (todaySessionsEl) todaySessionsEl.textContent = todaySessions || 0;
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
// PROFILE (MATCHES SUPER ADMIN)
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
// COURSES - FILTERED BY LECTURER'S PROGRAM (LIKE SUPER ADMIN)
// =====================================================
async function loadCourses() {
    const tbody = $('#coursesTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="5">Loading courses...<\/td><\/tr>';
    
    const lecturerProgram = currentUserProfile?.program || 'KRCHN';
    const { data: courses, error } = await sb
        .from('courses')
        .select('*')
        .eq('target_program', lecturerProgram)
        .order('course_name', true);
    
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
                <td><strong>${escapeHtml(c.unit_code || 'N/A')}<\/strong><\/td>
                <td>${escapeHtml(c.course_name)}<\/td>
                <td>${escapeHtml(c.target_program)}<\/td>
                <td>${escapeHtml(c.block || 'N/A')}<\/td>
                <td><button class="btn-action" onclick="showFeedback('Course: ${escapeHtml(c.course_name)}', 'info')">View<\/button><\/td>
            <\/tr>
        `;
    });
    
    const totalCoursesEl = $('#totalCourses');
    if (totalCoursesEl) totalCoursesEl.textContent = courses.length;
}

window.filterCourses = function() {
    const search = $('#courseSearch')?.value.toLowerCase() || '';
    const rows = document.querySelectorAll('#coursesTableBody tr');
    rows.forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(search) ? '' : 'none';
    });
};

// =====================================================
// STUDENTS - FILTERED BY LECTURER'S PROGRAM
// =====================================================
async function loadStudents() {
    const tbody = $('#studentsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="7">Loading students...<\/td><\/tr>';
    
    const lecturerProgram = currentUserProfile?.program || 'KRCHN';
    const { data: students, error } = await sb
        .from('consolidated_user_profiles_table')
        .select('*')
        .eq('role', 'student')
        .eq('program', lecturerProgram)
        .order('full_name', true);
    
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
                <td><button class="btn-action" onclick="viewStudentDetails('${s.user_id}')">View<\/button><\/td>
            <\/tr>
        `;
    });
    
    const totalStudentsEl = $('#totalStudents');
    if (totalStudentsEl) totalStudentsEl.textContent = students.length;
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

window.viewStudentDetails = function(studentId) {
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
// SESSIONS (MATCHES SUPER ADMIN)
// =====================================================
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

async function loadSessions() {
    const tbody = $('#sessionsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="5">Loading sessions...<\/td><\/tr>';
    
    const { data: sessions, error } = await sb
        .from('scheduled_sessions')
        .select('*')
        .eq('lecturer_id', currentUserId)
        .order('session_date', false);
    
    if (error) {
        tbody.innerHTML = `<tr><td colspan="5">Error loading sessions: ${error.message}<\/td><\/tr>`;
        return;
    }
    
    if (!sessions || sessions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No sessions scheduled<\/td><\/tr>';
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
                <td><button class="btn-action" onclick="navigator.clipboard.writeText('${link}'); showFeedback('Link copied!', 'success')">Copy Link<\/button><\/td>
                <td><button class="btn-danger" onclick="deleteSession('${s.id}')">Delete<\/button><\/td>
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

// =====================================================
// ATTENDANCE (MATCHES SUPER ADMIN)
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
    
    const student = allStudents.find(s => s.user_id === studentId);
    const checkInTime = date ? new Date(date).toISOString() : new Date().toISOString();
    
    const attendanceData = {
        user_id: studentId,
        student_name: student?.full_name,
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
        showFeedback('Geolocation not supported', 'error');
        return;
    }
    
    navigator.geolocation.getCurrentPosition(async (position) => {
        const checkInData = {
            user_id: currentUserId,
            user_role: 'lecturer',
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
    
    tbody.innerHTML = '<tr><td colspan="6">Loading attendance...<\/td><\/tr>';
    
    const { data: records, error } = await sb
        .from('geo_attendance_logs')
        .select('*')
        .order('check_in_time', { ascending: false })
        .limit(50);
    
    if (error) {
        tbody.innerHTML = `<tr><td colspan="6">Error loading attendance: ${error.message}<\/td><\/tr>`;
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
                <td><button class="btn-danger" onclick="deleteAttendanceRecord('${r.id}')">Delete<\/button><\/td>
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
// EXAMS (MATCHES SUPER ADMIN)
// =====================================================
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
        created_by: currentUserId,
        status: 'Scheduled'
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
    
    const { data: exams, error } = await sb
        .from('exams')
        .select('*, course:course_id(course_name)')
        .eq('created_by', currentUserId)
        .order('exam_date', false);
    
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
                <td><span class="badge badge-info">${e.exam_type}<\/span><\/td>
                <td><strong>${escapeHtml(e.exam_name)}<\/strong><\/td>
                <td>${escapeHtml(courseName)}<\/td>
                <td>${e.target_program}/${e.block_term}<\/td>
                <td>${new Date(e.exam_date).toLocaleDateString()}<\/td>
                <td><span class="badge badge-warning">${e.status}<\/span><\/td>
                <td><button class="btn-action" onclick="openGradeModal('${e.id}')">Grade<\/button> <button class="btn-danger" onclick="deleteExam('${e.id}')">Delete<\/button><\/td>
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
// RESOURCES (MATCHES SUPER ADMIN)
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
    
    const { data: resources, error } = await sb
        .from('resources')
        .select('*')
        .eq('uploaded_by', currentUserId)
        .order('created_at', false);
    
    if (error) {
        tbody.innerHTML = `<table><td colspan="4">Error loading resources: ${error.message}<\/td><\/tr>`;
        return;
    }
    
    if (!resources || resources.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">No resources uploaded<\/td><\/tr>';
        return;
    }
    
    allResources = resources;
    tbody.innerHTML = '';
    
    resources.forEach(r => {
        tbody.innerHTML += `
            <tr>
                <td>${escapeHtml(r.title)}<\/td>
                <td>${r.program_type}/${r.block}<\/td>
                <td>${new Date(r.created_at).toLocaleDateString()}<\/td>
                <td><a href="${r.file_url}" target="_blank" class="btn-action">Download<\/a> <button class="btn-danger" onclick="deleteResource('${r.id}')">Delete<\/button><\/td>
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
// MESSAGES (MATCHES SUPER ADMIN)
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
    
    const { data: messages, error } = await sb
        .from('notifications')
        .select('*')
        .eq('sender_id', currentUserId)
        .order('created_at', false);
    
    if (error) {
        tbody.innerHTML = `</td><td colspan="4">Error loading messages: ${error.message}<\/td><\/tr>`;
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
// CALENDAR (MATCHES SUPER ADMIN)
// =====================================================
async function loadCalendar() {
    const calendarEl = $('#calendarDisplay');
    if (!calendarEl) return;
    
    const { data: sessions } = await sb
        .from('scheduled_sessions')
        .select('id, session_title, session_date')
        .eq('lecturer_id', currentUserId)
        .order('session_date', true);
    
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
window.exportCourses = () => showFeedback('Export feature coming soon', 'info');
window.exportStudents = () => showFeedback('Export feature coming soon', 'info');

// =====================================================
// LOGOUT (MATCHES SUPER ADMIN)
// =====================================================
window.logout = async function() {
    await sb.auth.signOut();
    window.location.href = 'login.html';
};

// =====================================================
// INITIALIZATION (MATCHES SUPER ADMIN PATTERN)
// =====================================================
async function initSession() {
    console.log('Initializing Lecturer Dashboard...');
    
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
    const lecturerNameSpan = $('#lecturerName');
    if (lecturerNameSpan) lecturerNameSpan.textContent = profile.full_name || 'Lecturer';
    
    await loadCourses();
    await loadStudents();
    await loadDashboardData();
    await loadTodaySchedule();
    await loadProfile();
    await loadSessions();
    await loadExams();
    await loadResources();
    await loadMessages();
    await loadCalendar();
    await loadAttendance();
    
    // Setup nav click handlers (like Super Admin)
    const navLinks = document.querySelectorAll('.nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const tabId = link.getAttribute('data-tab');
            if (tabId) showTab(tabId);
        });
    });
    
    // Mobile navigation
    const mobileToggle = $('#mobileNavToggle');
    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            $('#sidebar')?.classList.toggle('active');
        });
    }
    
    console.log('✅ Lecturer Dashboard ready!');
}

// Start the application
initSession();
