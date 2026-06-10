// =====================================================
// LECTURER DASHBOARD - WORKING (Like SuperAdmin)
// =====================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://lwhtjozfsmbyihenfunw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk';

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.sb = sb;

let currentUserProfile = null;
let currentUserId = null;
let allCourses = [];
let allStudents = [];

function $(id) { return document.getElementById(id); }

// =====================================================
// LOAD COURSES - PROVEN WORKING
// =====================================================
async function loadCourses() {
    console.log('🔵 loadCourses STARTED');
    const tbody = $('#coursesTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="5"><div class="loading-spinner"></div> Loading courses...<\/td><\/tr>';
    
    const { data, error } = await sb.from('courses').select('*');
    console.log('🔵 Courses from Supabase:', data?.length);
    
    if (error) {
        tbody.innerHTML = `<tr><td colspan="5">Error: ${error.message}<\/td><\/tr>`;
        return;
    }
    
    allCourses = data || [];
    console.log('🔵 allCourses =', allCourses.length);
    
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
            <td><button class="btn-action">View</button></td>
        </tr>`;
    }
    console.log('🔵 loadCourses FINISHED -', allCourses.length, 'courses');
}

// =====================================================
// LOAD STUDENTS - PROVEN WORKING
// =====================================================
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
    
    console.log('🟢 Students from Supabase:', data?.length);
    
    if (error) {
        tbody.innerHTML = `<tr><td colspan="7">Error: ${error.message}<\/td><\/tr>`;
        return;
    }
    
    allStudents = data || [];
    console.log('🟢 allStudents =', allStudents.length);
    
    if (allStudents.length === 0) {
        tbody.innerHTML = '<td><td colspan="7">No students found<\/td><\/tr>';
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
    console.log('🟢 loadStudents FINISHED -', allStudents.length, 'students');
}

// =====================================================
// LOAD DASHBOARD
// =====================================================
async function loadDashboard() {
    console.log('🟡 Updating dashboard...');
    const totalStudents = $('#totalStudents');
    const totalCourses = $('#totalCourses');
    
    if (totalStudents) totalStudents.textContent = allStudents.length;
    if (totalCourses) totalCourses.textContent = allCourses.length;
    
    console.log('🟡 Dashboard - Students:', allStudents.length, 'Courses:', allCourses.length);
}

// =====================================================
// TODAY'S SCHEDULE
// =====================================================
async function loadTodaySchedule() {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await sb.from('scheduled_sessions').select('*').eq('session_date', today);
    const container = $('#todayScheduleList');
    if (!container) return;
    if (!data?.length) { container.innerHTML = '<p>No sessions scheduled for today</p>'; return; }
    container.innerHTML = data.map(s => `<div class="schedule-item"><span class="schedule-time">${s.session_time || 'TBA'}</span><span class="schedule-title">${s.session_title}</span></div>`).join('');
}

// =====================================================
// PROFILE
// =====================================================
async function loadProfile() {
    if (!currentUserProfile) return;
    if ($('profileName')) $('profileName').textContent = currentUserProfile.full_name || 'Lecturer';
    if ($('profileProgram')) $('profileProgram').textContent = currentUserProfile.program || 'KRCHN';
}

// =====================================================
// VIEW STUDENT DETAILS
// =====================================================
window.viewStudentDetails = async function(studentId) {
    const student = allStudents.find(s => s.user_id === studentId);
    if (!student) return;
    $('#studentDetailTitle').textContent = `${student.full_name} - Student Details`;
    $('#studentDetailBody').innerHTML = `<p><strong>Email:</strong> ${student.email}</p><p><strong>Program:</strong> ${student.program}</p><p><strong>Block:</strong> ${student.block}</p><p><strong>Absences:</strong> ${student.cumulative_absences || 0}</p>`;
    $('#studentDetailModal').style.display = 'flex';
};

// =====================================================
// FILTER FUNCTIONS
// =====================================================
window.filterCourses = function() {
    const search = $('#courseSearch')?.value.toLowerCase() || '';
    const rows = document.querySelectorAll('#coursesTableBody tr');
    rows.forEach(row => { row.style.display = row.textContent.toLowerCase().includes(search) ? '' : 'none'; });
};

window.filterStudents = function() {
    const search = $('#studentSearch')?.value.toLowerCase() || '';
    const rows = document.querySelectorAll('#studentsTableBody tr');
    rows.forEach(row => { row.style.display = row.textContent.toLowerCase().includes(search) ? '' : 'none'; });
};

// =====================================================
// SHOW TAB
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
    document.querySelectorAll('.nav a').forEach(link => link.classList.remove('active'));
    const activeLink = document.querySelector(`.nav a[data-tab="${tabId}"]`);
    if (activeLink) activeLink.classList.add('active');
    
    if (tabId === 'my-courses') loadCourses();
    if (tabId === 'my-students') loadStudents();
    if (tabId === 'dashboard') loadDashboard();
};

// =====================================================
// INIT - THE MOST IMPORTANT PART
// =====================================================
async function init() {
    console.log('Initializing Lecturer Dashboard...');
    
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }
    
    currentUserId = session.user.id;
    console.log('User ID:', currentUserId);
    
    const { data: profile } = await sb
        .from('consolidated_user_profiles_table')
        .select('*')
        .eq('user_id', currentUserId)
        .maybeSingle();
    
    currentUserProfile = profile || { program: 'KRCHN', full_name: 'Lecturer' };
    
    if ($('welcomeHeader')) {
        $('welcomeHeader').textContent = `Welcome, ${currentUserProfile.full_name || 'Lecturer'}!`;
    }
    
    // CRITICAL: Load in correct order with await
    await loadCourses();
    await loadStudents();
    await loadDashboard();
    await loadTodaySchedule();
    await loadProfile();
    
    console.log('Dashboard ready!');
    console.log('✅ Students loaded:', allStudents.length);
    console.log('✅ Courses loaded:', allCourses.length);
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
    
    window.closeModal = function(modalId) {
        const modal = $(modalId);
        if (modal) modal.style.display = 'none';
    };
    
    init();
});

// For debugging
window.allCourses = allCourses;
window.allStudents = allStudents;
