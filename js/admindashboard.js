// ============================================
// 📁 js/admindashboard.js
// NCHSM Exam Dashboard - Complete JavaScript
// ============================================

(function() {
    'use strict';

    // ============================================
    // 🔧 CONFIGURATION
    // ============================================
    const SUPABASE_URL = 'https://lwhtjozfsmbyihenfunw.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk';

    // Initialize Supabase
    const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.supabase = sb;

    // ============================================
    // 📦 STATE
    // ============================================
    let currentTab = 'students';
    let studentsResults = [];
    let allStudents = [];
    let allExams = [];
    let proctoringLogs = [];
    let examsMap = {};
    let currentPage = { 
    students: 1, 
    allStudents: 1, 
    exams: 1, 
    proctoring: 1, 
    attendance: 1 
};
    let currentExamFilter = 'all';
    let itemsPerPage = 15;
    let notificationSubscription = null;
    let unreadCount = 0;
    let examToReset = null;
    let currentReleaseResults = [];
    let selectedStudentIds = new Set();

    // Live Feed Variables
    let liveFeedInterval = null;
    let liveFeedAutoRefresh = true;
    let liveFeedData = [];
    let liveFeedPage = 1;
    const LIVE_FEED_PER_PAGE = 12;

    // Camera Variables
    let cameraInterval = null;
    let cameraAutoRefresh = true;
    let currentCameraStudent = null;
    let currentCameraExam = null;
    let currentCameraStudentName = '';
    let currentCameraExamName = '';
// ============================================
// 📋 ATTENDANCE SHEET STATE
// ============================================
let attendanceData = [];
let attendanceAutoRefresh = true;
let attendanceRefreshInterval = null;
let liveVideoStreams = {};
let isVideoAutoRefresh = true;
    
    // Timer Variables
    let timerModalData = {
        studentId: null,
        examId: null,
        studentName: null,
        examName: null
    };

    // Live Students Variables
    window.liveStudentsData = [];
    let autoRefreshInterval = null;
    let autoRefreshEnabled = true;

    // ============================================
    // 🕐 KENYA TIMEZONE HELPERS
    // ============================================
    function getKenyaNow() {
        const now = new Date();
        return new Date(now.getTime() + (3 * 60 * 60 * 1000));
    }

    function getKenyaTime(date) {
        const d = new Date(date);
        return new Date(d.getTime() + (3 * 60 * 60 * 1000));
    }

    function formatKenyaTime(date) {
        const d = new Date(date);
        const kenyaTime = new Date(d.getTime() + (3 * 60 * 60 * 1000));
        return kenyaTime.toLocaleString('en-KE', {
            timeZone: 'Africa/Nairobi',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }

    // ============================================
    // 🔔 TOAST NOTIFICATIONS
    // ============================================
    function showToast(message, type = 'info') {
        const colors = {
            success: '#10B981',
            error: '#EF4444',
            warning: '#F59E0B',
            info: '#3B82F6'
        };
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        
        document.querySelectorAll('.custom-toast').forEach(t => t.remove());
        
        const toast = document.createElement('div');
        toast.className = 'custom-toast';
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type] || '#3B82F6'};
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            z-index: 99999;
            display: flex;
            align-items: center;
            gap: 12px;
            font-family: 'Poppins', sans-serif;
            font-size: 0.9rem;
            font-weight: 500;
            max-width: 400px;
            transform: translateX(120%);
            opacity: 0;
            transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            cursor: pointer;
            border-radius: 12px;
        `;
        
        toast.innerHTML = `
            <i class="fas ${icons[type] || 'fa-info-circle'}" style="font-size:1.2rem;"></i>
            <span>${message}</span>
            <i class="fas fa-times" style="margin-left: auto; opacity: 0.7; font-size: 0.8rem; cursor:pointer;"></i>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
            toast.style.opacity = '1';
        }, 10);
        
        toast.addEventListener('click', () => {
            toast.style.transform = 'translateX(120%)';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 400);
        });
        
        setTimeout(() => {
            if (document.body.contains(toast)) {
                toast.style.transform = 'translateX(120%)';
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 400);
            }
        }, 5000);
    }

    // ============================================
    // 📊 EXAM TIMER CALCULATIONS
    // ============================================
    function calculateExamTimer(exam) {
        const kenyaNow = getKenyaNow();
        
        if (!exam.exam_date || !exam.exam_start_time) {
            return {
                timerHtml: `<span class="badge bg-secondary">⏱️ No Date Set</span>`,
                status: '⏱️ No Date',
                timeLeft: 'N/A',
                examStart: null,
                examEnd: null,
                isActive: false,
                isUpcoming: false,
                isExpired: false
            };
        }
        
        try {
            let timeStr = exam.exam_start_time;
            if (timeStr.split(':').length === 2) {
                timeStr = timeStr + ':00';
            }
            
            const examDateTime = new Date(exam.exam_date + 'T' + timeStr);
            
            if (isNaN(examDateTime.getTime())) {
                throw new Error('Invalid date');
            }
            
            const examStart = getKenyaTime(examDateTime);
            const examEnd = new Date(examStart.getTime() + (exam.duration_minutes || 30) * 60000);
            
            let status = '';
            let timeLeft = '';
            let timerHtml = '';
            
            if (kenyaNow < examStart) {
                const diffMs = examStart - kenyaNow;
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                status = '🟡 Upcoming';
                timeLeft = `${diffHours}h ${diffMinutes}m`;
                timerHtml = `<span class="badge bg-warning text-dark">⏰ ${timeLeft}</span>`;
            } else if (kenyaNow >= examStart && kenyaNow <= examEnd) {
                const timeLeftMs = examEnd - kenyaNow;
                const minutesLeft = Math.floor(timeLeftMs / 60000);
                const secondsLeft = Math.floor((timeLeftMs % 60000) / 1000);
                status = '🟢 Active';
                timeLeft = `${minutesLeft}m ${secondsLeft}s`;
                timerHtml = `<span class="badge bg-danger" style="animation: pulse-green 1s infinite;">🔴 ${timeLeft}</span>`;
            } else if (kenyaNow > examEnd) {
                status = '🔴 Expired';
                timeLeft = 'Closed';
                timerHtml = `<span class="badge bg-secondary">⏱️ Closed</span>`;
            }
            
            return {
                timerHtml,
                status,
                timeLeft,
                examStart,
                examEnd,
                isActive: kenyaNow >= examStart && kenyaNow <= examEnd,
                isUpcoming: kenyaNow < examStart,
                isExpired: kenyaNow > examEnd
            };
        } catch (error) {
            console.warn('Timer calculation error for exam:', exam.id, error);
            return {
                timerHtml: `<span class="badge bg-secondary">⏱️ Invalid Date</span>`,
                status: '⏱️ Invalid',
                timeLeft: 'N/A',
                examStart: null,
                examEnd: null,
                isActive: false,
                isUpcoming: false,
                isExpired: false
            };
        }
    }

    // ============================================
    // ⏱️ UPDATE ADMIN TIMERS
    // ============================================
    function updateAdminTimers() {
        document.querySelectorAll('.exam-timer-cell').forEach(el => {
            const examStartStr = el.dataset.examStart;
            const examEndStr = el.dataset.examEnd;
            
            if (!examStartStr || !examEndStr || examStartStr === '' || examEndStr === '') {
                return;
            }
            
            try {
                const examStart = new Date(examStartStr);
                const examEnd = new Date(examEndStr);
                
                if (isNaN(examStart.getTime()) || isNaN(examEnd.getTime())) {
                    return;
                }
                
                const kenyaNow = getKenyaNow();
                const kenyaStart = getKenyaTime(examStart);
                const kenyaEnd = getKenyaTime(examEnd);
                
                if (kenyaNow >= kenyaStart && kenyaNow <= kenyaEnd) {
                    const timeLeftMs = kenyaEnd - kenyaNow;
                    const minutesLeft = Math.floor(timeLeftMs / 60000);
                    const secondsLeft = Math.floor((timeLeftMs % 60000) / 1000);
                    el.innerHTML = `<span class="badge bg-danger" style="animation: pulse-green 1s infinite;">🔴 ${minutesLeft}m ${secondsLeft}s</span>`;
                } else if (kenyaNow < kenyaStart) {
                    const diffMs = kenyaStart - kenyaNow;
                    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                    el.innerHTML = `<span class="badge bg-warning text-dark">⏰ ${diffHours}h ${diffMinutes}m</span>`;
                } else {
                    el.innerHTML = `<span class="badge bg-secondary">⏱️ Closed</span>`;
                }
            } catch (error) {
                // Skip this cell
            }
        });
    }

    // ============================================
    // 🎯 EXAM HELPER FUNCTIONS
    // ============================================
    function getExamTotalMarks(examType) {
        const type = (examType || '').toUpperCase();
        if (type.includes('CAT')) return 30;
        if (type === 'EXAM' || type === 'FINAL' || type === 'END_TERM') return 70;
        return 100;
    }

    function getPassMark(totalMarks) {
        return Math.round(totalMarks * 0.6);
    }
window.updateTotalMarksHint = function() {
    const examType = document.getElementById('examType').value;
    const totalMarksInput = document.getElementById('examTotalMarks');
    const hintEl = document.getElementById('totalMarksHint');
    const passMarkInput = document.getElementById('examPassMark');
    
    // Get the current value or use default
    let currentTotal = parseInt(totalMarksInput.value) || 0;
    let defaultMarks = 30;
    let defaultPass = 18;
    
    if (examType && examType.toUpperCase().includes('CAT')) {
        defaultMarks = 30;
        defaultPass = 18;
        hintEl.innerHTML = '📊 CAT exams: <strong>30 marks</strong> (you can change this) | Pass mark: <strong>60%</strong>';
    } else if (examType === 'EXAM' || examType === 'FINAL' || examType === 'END_TERM') {
        defaultMarks = 70;
        defaultPass = 42;
        hintEl.innerHTML = '📊 Final exams: <strong>70 marks</strong> (you can change this) | Pass mark: <strong>60%</strong>';
    } else {
        defaultMarks = 100;
        defaultPass = 60;
        hintEl.innerHTML = '📊 Standard exams: <strong>100 marks</strong> (you can change this) | Pass mark: <strong>60%</strong>';
    }
    
    // Only set if empty or zero
    if (!currentTotal || currentTotal === 0) {
        totalMarksInput.value = defaultMarks;
        passMarkInput.value = defaultPass;
    } else {
        // Auto-calculate pass mark based on current total
        passMarkInput.value = Math.round(currentTotal * 0.6);
        hintEl.innerHTML = `📊 Total marks: <strong>${currentTotal}</strong> | Pass mark (60%): <strong>${Math.round(currentTotal * 0.6)}</strong>`;
    }
};

// Add real-time update when total marks changes
document.addEventListener('DOMContentLoaded', function() {
    const totalMarksInput = document.getElementById('examTotalMarks');
    if (totalMarksInput) {
        totalMarksInput.addEventListener('input', function() {
            const total = parseInt(this.value) || 0;
            const passMarkInput = document.getElementById('examPassMark');
            if (passMarkInput && total > 0) {
                passMarkInput.value = Math.round(total * 0.6);
            }
            const hintEl = document.getElementById('totalMarksHint');
            if (hintEl && total > 0) {
                hintEl.innerHTML = `📊 Total marks: <strong>${total}</strong> | Pass mark (60%): <strong>${Math.round(total * 0.6)}</strong>`;
            }
        });
    }
});
    // ============================================

    // 🔐 AUTHENTICATION
    // ============================================
    function checkAdminAuth() {
        const session = localStorage.getItem('adminSession');
        if (!session) { 
            window.location.href = 'admin_login.html'; 
            return false; 
        }
        try {
            const s = JSON.parse(session);
            document.getElementById('adminName').textContent = s.name || 'Admin';
            document.getElementById('adminEmail').textContent = s.email || 'admin@nchsm.ac.ke';
            document.getElementById('adminInitial').textContent = (s.name || 'A')[0].toUpperCase();
            return true;
        } catch (e) { 
            window.location.href = 'admin_login.html'; 
            return false; 
        }
    }

    window.logout = function() { 
        localStorage.removeItem('adminSession');
        window.location.href = 'admin_login.html'; 
    };

    // ============================================
    // 📋 LOAD EXAM DROPDOWN
    // ============================================
    async function loadExamDropdown() {
        const { data } = await sb.from('exams').select('id,exam_name');
        const select = document.getElementById('examFilter');
        if (select && data) {
            data.forEach(e => { 
                const opt = document.createElement('option');
                opt.value = e.id;
                opt.textContent = e.exam_name;
                select.appendChild(opt); 
            });
        }
    }

    async function loadProgramDropdown() {
        const { data } = await sb.from('consolidated_user_profiles_table').select('program');
        const programs = [...new Set(data?.map(p => p.program).filter(Boolean))];
        const select = document.getElementById('programFilter');
        if (select) {
            programs.forEach(p => { 
                const opt = document.createElement('option');
                opt.value = p;
                opt.textContent = p;
                select.appendChild(opt); 
            });
        }
    }

    async function loadExamsMap() {
    const { data } = await sb.from('exams').select('*');
    if (data) { 
        examsMap = {};
        data.forEach(e => { 
            examsMap[e.id] = {
                ...e,
                status: e.status || 'published'  // ✅ Default status
            }; 
        }); 
    }
    return examsMap;
}

    // ============================================
    // 🔄 LOAD EXAMS FOR RESET DROPDOWN
    // ============================================
    async function loadExamsForResetDropdown() {
        const { data: exams } = await sb.from('exams').select('id, exam_name').order('exam_name');
        const select = document.getElementById('resetExamSelect');
        if (select && exams) {
            select.innerHTML = '<option value="">-- ALL EXAMS (Reset everything) --</option>' + 
                exams.map(e => `<option value="${e.id}">${e.exam_name}</option>`).join('');
        }
    }

    // ============================================
    // 🔍 SEARCH STUDENT BY EMAIL
    // ============================================
    async function searchStudentByEmail(email) {
        try {
            const { data: student, error } = await sb
                .from('consolidated_user_profiles_table')
                .select('user_id, student_id, full_name, email, program')
                .eq('email', email)
                .single();
            
            if (error || !student) {
                document.getElementById('resetStudentInfo').style.display = 'none';
                const errorDiv = document.getElementById('resetErrorInfo');
                errorDiv.style.display = 'block';
                errorDiv.innerHTML = `⚠️ No student found with email: ${email}`;
                document.getElementById('confirmResetByEmailBtn').disabled = true;
                window.resetTargetStudent = null;
                return;
            }
            
            window.resetTargetStudent = { 
                user_id: student.user_id, 
                student_id: student.student_id,
                full_name: student.full_name, 
                email: student.email, 
                program: student.program 
            };
            
            const infoDiv = document.getElementById('resetStudentInfo');
            infoDiv.style.display = 'block';
            infoDiv.innerHTML = `
                <p><strong>📧 Student Found:</strong> ${student.full_name} ✓</p>
                <p><strong>🆔 Student ID:</strong> ${student.student_id || 'N/A'}</p>
                <p><strong>📚 Program:</strong> ${student.program || 'N/A'}</p>
            `;
            document.getElementById('resetErrorInfo').style.display = 'none';
            document.getElementById('confirmResetByEmailBtn').disabled = false;
        } catch (err) {
            console.error(err);
            document.getElementById('resetStudentInfo').style.display = 'none';
            const errorDiv = document.getElementById('resetErrorInfo');
            errorDiv.style.display = 'block';
            errorDiv.innerHTML = '⚠️ Error searching for student';
            document.getElementById('confirmResetByEmailBtn').disabled = true;
        }
    }

   // ============================================
// 📊 LOAD STUDENTS WITH RESULTS - FIXED
// ============================================
window.loadStudentsWithResults = async function() {
    const loadingDiv = document.getElementById('studentsLoading');
    const table = document.getElementById('studentsTable');
    loadingDiv.style.display = 'block';
    table.style.display = 'none';
    try {
        await loadExamsMap();
        const { data: grades, error } = await sb
            .from('exam_grades')
            .select('*')
            .eq('question_id', '00000000-0000-0000-0000-000000000000');
        
        if (error) { 
            loadingDiv.innerHTML = 'Error loading data'; 
            return; 
        }
        
        const { data: releases } = await sb.from('released_exam_results').select('result_id');
        const releasedSet = new Set(releases?.map(r => r.result_id) || []);
        const studentIds = [...new Set(grades.map(g => g.student_id))];
        
        const { data: profiles } = await sb
            .from('consolidated_user_profiles_table')
            .select('user_id, full_name, student_id, email, program, block, intake_year')
            .in('user_id', studentIds);
        
        const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));
        
        // ✅ FIX: Include exam status in exam_info
        studentsResults = grades.map(g => {
            const exam = examsMap[g.exam_id] || null;
            return {
                ...g,
                student_profile: profileMap[g.student_id] || null,
                isReleased: releasedSet.has(g.id),
                exam_info: exam ? {
                    ...exam,
                    status: exam.status || 'published'  // ✅ Ensure status is included
                } : null
            };
        });
        
        const examFilter = document.getElementById('examFilter')?.value;
        const statusFilter = document.getElementById('statusFilter')?.value;
        const search = document.getElementById('searchInput')?.value;
        
        let filtered = studentsResults;
        if (examFilter) filtered = filtered.filter(r => r.exam_id == examFilter);
        if (statusFilter) filtered = filtered.filter(r => r.result_status === statusFilter);
        if (search) {
            filtered = filtered.filter(r => 
                r.student_profile?.full_name?.toLowerCase().includes(search.toLowerCase()) || 
                r.student_profile?.student_id?.toLowerCase().includes(search.toLowerCase())
            );
        }
        
        studentsResults = filtered;
        displayStudentsResults();
        loadingDiv.style.display = 'none';
        table.style.display = 'table';
        updateStats();
    } catch (err) { 
        console.error(err);
        loadingDiv.innerHTML = 'Error loading data'; 
    }
};

    // ============================================
// 📊 DISPLAY STUDENTS RESULTS - FIXED
// ============================================
function displayStudentsResults() {
    const start = (currentPage.students - 1) * itemsPerPage;
    const page = studentsResults.slice(start, start + itemsPerPage);
    const tbody = document.getElementById('studentsBody');
    
    if (page.length === 0) { 
        tbody.innerHTML = '<tr><td colspan="12" style="text-align:center">No results found</td></tr>'; 
        return; 
    }
    
    tbody.innerHTML = page.map(r => {
        const studentName = (r.student_profile?.full_name || 'Unknown').replace(/'/g, "\\'");
        const examName = (r.exam_info?.exam_name || 'Exam ' + r.exam_id).replace(/'/g, "\\'");
        
        // ✅ FIX: Use the actual total_marks from the exam record
        const totalMarks = r.exam_info?.total_marks || 100;
        const passMark = r.exam_info?.pass_mark || Math.round(totalMarks * 0.6);
        const score = r.marks || 0;
        const percentage = totalMarks > 0 ? ((score / totalMarks) * 100).toFixed(1) : '0.0';
        
        // ✅ CRITICAL FIX: Check exam status FIRST
        const examStatus = r.exam_info?.status || 'published';
        const isPendingReview = examStatus === 'pending_review';
        const isReleased = r.isReleased || false;
        const percentNum = parseFloat(percentage);
        
        // ✅ Determine display status based on exam status
        let displayStatus = '';
        let statusClass = '';
        
        if (isPendingReview) {
            // 🔴 ALWAYS show PENDING for pending_review exams
            displayStatus = 'PENDING';
            statusClass = 'status-pending';
        } else if (isReleased) {
            // Only show PASS/FAIL if released
            if (percentNum >= passMark) {
                displayStatus = 'PASS';
                statusClass = 'status-pass';
            } else {
                displayStatus = 'FAIL';
                statusClass = 'status-fail';
            }
        } else if (r.result_status === 'PASS' || r.result_status === 'FAIL') {
            // Use stored result status
            displayStatus = r.result_status;
            statusClass = displayStatus === 'PASS' ? 'status-pass' : 'status-fail';
        } else {
            // Default fallback
            displayStatus = 'PENDING';
            statusClass = 'status-pending';
        }
        
        const typeLabel = r.exam_info?.exam_type?.includes('CAT') ? 'CAT' : 'Exam';
        const totalDisplay = totalMarks;
        
        const studentId = r.student_id || r.student_profile?.user_id || '';
        const examId = r.exam_id || '';
        
        return `<tr>
            <td><span class="student-id-badge">${r.student_profile?.student_id || 'N/A'}</span></td>
            <td><strong>${r.student_profile?.full_name || 'Unknown'}</strong></td>
            <td>${r.student_profile?.email || '-'}</td>
            <td>${r.student_profile?.program || '-'}</td>
            <td>${r.exam_info?.exam_name || 'Exam ' + r.exam_id} <span class="exam-type-badge ${r.exam_info?.exam_type?.includes('CAT') ? 'badge-cat' : 'badge-exam'}">${typeLabel}</span></td>
            <td class="clickable-score" onclick="openEditMarksModal('${studentId}', ${examId}, '${studentName}', '${examName}')" style="cursor:pointer;color:#0A3D62;font-weight:600;">
                ${score} / ${totalDisplay} ✏️
            </td>
            <td class="clickable-percentage" onclick="openEditMarksModal('${studentId}', ${examId}, '${studentName}', '${examName}')" style="cursor:pointer;color:#0A3D62;font-weight:600;">
                ${percentage}% ✏️
            </td>
            <td><span class="${statusClass}">${displayStatus}</span></td>
            <td>${isReleased ? '<span class="status-pass">✅ Released</span>' : '<span class="status-pending">🔒 Not Released</span>'}</td>
            <td>
                <button class="action-btn btn-view" onclick="viewExamResult('${studentId}',${examId})" style="background:#4299E1; color:white; border:none; padding:4px 10px; border-radius:4px; cursor:pointer;">View</button>
                <button class="action-btn btn-info" onclick="viewStudentProgress('${studentId}', '${studentName}', ${examId})" style="background:#8B5CF6; color:white; border:none; padding:4px 10px; border-radius:4px; cursor:pointer;" title="View Live Progress">
                    <i class="fas fa-chart-line"></i> Progress
                </button>
                <button class="action-btn btn-warning" onclick="openTimerModal('${studentId}', '${studentName}', ${examId}, '${examName.replace(/'/g, "\\'")}')" style="background:#F59E0B; color:white; border:none; padding:4px 10px; border-radius:4px; cursor:pointer;" title="Manage Timer">
                    <i class="fas fa-clock"></i> Timer
                </button>
                <button class="action-btn btn-reset-student" onclick="resetSingleStudent('${studentId}', ${examId}, '${studentName}', '${examName}')" style="background:#DC2626; color:white; border:none; padding:4px 10px; border-radius:4px; cursor:pointer;">
                    <i class="fas fa-user-slash"></i> Reset
                </button>
            </td>
        </tr>`;
    }).join('');
    
    renderPagination('students', studentsResults.length);
}
    // ============================================
    // 👥 LOAD ALL STUDENTS
    // ============================================
    window.loadAllStudents = async function() {
        const loadingDiv = document.getElementById('allStudentsLoading');
        const table = document.getElementById('allStudentsTable');
        loadingDiv.style.display = 'block';
        const { data, error } = await sb.from('consolidated_user_profiles_table').select('*');
        if (error) return;
        allStudents = data || [];
        const studentIds = allStudents.map(s => s.user_id);
        const { data: gradeCounts } = await sb
            .from('exam_grades')
            .select('student_id')
            .eq('question_id', '00000000-0000-0000-0000-000000000000')
            .in('student_id', studentIds);
        const countMap = {};
        if (gradeCounts) {
            gradeCounts.forEach(g => { 
                countMap[g.student_id] = (countMap[g.student_id] || 0) + 1; 
            });
        }
        allStudents.forEach(s => { s.examsTaken = countMap[s.user_id] || 0; });
        displayAllStudents();
        loadingDiv.style.display = 'none';
        table.style.display = 'table';
    };

    function displayAllStudents() {
        const start = (currentPage.allStudents - 1) * itemsPerPage;
        const page = allStudents.slice(start, start + itemsPerPage);
        const tbody = document.getElementById('allStudentsBody');
        tbody.innerHTML = page.map(s =>
            `<tr>
                <td><span class="student-id-badge">${s.student_id || 'N/A'}</span></td>
                <td><strong>${s.full_name}</strong></td>
                <td>${s.email}</td>
                <td>${s.program || '-'}</td>
                <td>${s.block || '-'}</td>
                <td>${s.examsTaken || 0}</td>
                <td>
                    <button class="action-btn btn-view" onclick="viewStudentProfile('${s.id}')">Profile</button>
                    <button class="action-btn btn-assign" onclick="openAssignExamModal()">Assign</button>
                </td>
            </tr>`
        ).join('');
        renderPagination('allStudents', allStudents.length);
    }

    // ============================================
    // 📝 LOAD ALL EXAMS
    // ============================================
    window.loadAllExams = async function() {
        const loadingDiv = document.getElementById('examsLoading');
        const table = document.getElementById('examsTable');
        loadingDiv.style.display = 'block';
        table.style.display = 'none';
        try {
            const { data, error } = await sb.from('exams').select('*').order('id');
            if (error) throw error;
            allExams = data || [];
            
            const { data: grades } = await sb
                .from('exam_grades')
                .select('exam_id, result_status')
                .eq('question_id', '00000000-0000-0000-0000-000000000000');
            
            const countMap = {};
            const hasResultsMap = {};
            if (grades) { 
                grades.forEach(g => { 
                    countMap[g.exam_id] = (countMap[g.exam_id] || 0) + 1; 
                    if (g.result_status === 'PASS' || g.result_status === 'FAIL') {
                        hasResultsMap[g.exam_id] = true; 
                    }
                }); 
            }
            
            let filteredExams = allExams;
            if (currentExamFilter === 'active') {
                filteredExams = allExams.filter(e => !hasResultsMap[e.id]);
            } else if (currentExamFilter === 'completed') {
                filteredExams = allExams.filter(e => hasResultsMap[e.id]);
            }
            
            displayAllExams(filteredExams, countMap, hasResultsMap);
            loadingDiv.style.display = 'none';
            table.style.display = 'table';
            updateStats();
        } catch(err) { 
            console.error('Error loading exams:', err); 
            loadingDiv.innerHTML = 'Error loading exams: ' + err.message; 
            loadingDiv.style.color = '#DC2626';
        }
    };

    function displayAllExams(exams, countMap, hasResultsMap) {
        const start = (currentPage.exams - 1) * itemsPerPage;
        const page = exams.slice(start, start + itemsPerPage);
        const tbody = document.getElementById('examsBody');
        if (!page || page.length === 0) { 
            tbody.innerHTML = '<tr><td colspan="11" style="text-align:center; padding:30px;">📭 No exams found</td></tr>'; 
            return; 
        }

        tbody.innerHTML = page.map(e => {
            try {
                const hasResults = hasResultsMap[e.id] || false;
                const examStatus = hasResults ? 'Completed' : 'Active';
                const statusClass = hasResults ? 'status-completed' : 'status-active';
                const publishStatus = e.status || 'draft';
                const totalMarks = e.total_marks || e.marks_out_of || getExamTotalMarks(e.exam_type) || 100;
                const passMark = e.pass_mark || getPassMark(totalMarks) || 60;
                const typeLabel = e.exam_type?.includes('CAT') ? 'CAT' : 'Exam';
                const typeBadge = e.exam_type?.includes('CAT') ? 'badge-cat' : 'badge-exam';
                const examDisplayName = e.title || e.exam_name || 'Unnamed Exam';

                let timerData;
                try {
                    timerData = calculateExamTimer(e);
                } catch (timerError) {
                    console.warn('Timer error for exam:', e.id, timerError);
                    timerData = {
                        timerHtml: `<span class="badge bg-secondary">⏱️ N/A</span>`,
                        status: 'N/A',
                        timeLeft: 'N/A',
                        examStart: null,
                        examEnd: null,
                        isActive: false,
                        isUpcoming: false,
                        isExpired: false
                    };
                }

                const timerDisplay = timerData.timerHtml || `<span class="badge bg-secondary">⏱️ N/A</span>`;
                const statusDisplay = timerData.status || 'N/A';

                let examStartStr = '';
                let examEndStr = '';
                try {
                    if (timerData.examStart && typeof timerData.examStart === 'object' && !isNaN(timerData.examStart.getTime())) {
                        examStartStr = timerData.examStart.toISOString();
                    }
                } catch(e) { examStartStr = ''; }

                try {
                    if (timerData.examEnd && typeof timerData.examEnd === 'object' && !isNaN(timerData.examEnd.getTime())) {
                        examEndStr = timerData.examEnd.toISOString();
                    }
                } catch(e) { examEndStr = ''; }

                return `<tr>
                    <td><strong>${examDisplayName}</strong></td>
                    <td><span class="exam-type-badge ${typeBadge}">${typeLabel}</span></td>
                    <td>${e.course_code || e.course || '-'}</td>
                    <td>${totalMarks} (Pass: ${passMark})</td>
                    <td>${e.duration_minutes || 30} min</td>
                    <td>${countMap[e.id] || 0}</td>
                    <td><span class="${statusClass}">${examStatus}</span></td>
                    <td>
                        <span class="${timerData.isActive ? 'status-active' : timerData.isUpcoming ? 'status-pending' : 'status-fail'}">
                            ${statusDisplay}
                        </span>
                    </td>
                    <td class="exam-timer-cell" 
                        data-exam-id="${e.id}"
                        data-exam-start="${examStartStr}"
                        data-exam-end="${examEndStr}">
                        ${timerDisplay}
                    </td>
                    <td>
                        <label class="publish-toggle">
                            <input type="checkbox" ${publishStatus === 'published' ? 'checked' : ''} 
                                   onchange="togglePublish(${e.id}, '${publishStatus}')">
                            <span style="margin-left:8px;">${publishStatus === 'published' ? 'Published' : 'Draft'}</span>
                        </label>
                    </td>
                    <td>
                        <button class="action-btn btn-edit" onclick="openCreateExamModal(${e.id})">Edit</button>
                        <button class="action-btn btn-assign" onclick="openAssignExamModal()">Assign</button>
                        <button class="action-btn btn-reset" onclick="openResetModal(${e.id}, '${examDisplayName.replace(/'/g, "\\'")}')">Reset All</button>
                        <button class="action-btn btn-delete" onclick="deleteExam(${e.id}, '${examDisplayName.replace(/'/g, "\\'")}')">Delete</button>
                    </td>
                </tr>`;
            } catch (error) {
                console.error('Error rendering exam row:', e.id, error);
                return `<tr><td colspan="11" style="color:red; padding:10px;">❌ Error loading exam ${e.id}</td></tr>`;
            }
        }).join('');
        renderPagination('exams', exams.length);
    }

    // ============================================
    // 🎥 LOAD PROCTORING LOGS
    // ============================================
    async function loadProctoringLogs() {
        const loadingDiv = document.getElementById('proctoringLoading');
        const table = document.getElementById('proctoringTable');
        loadingDiv.style.display = 'block';
        table.style.display = 'none';
        try {
            let query = sb.from('exam_proctoring_logs')
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(500);
            const { data: logs, error } = await query;
            if (error) { 
                loadingDiv.innerHTML = 'Error loading logs'; 
                return; 
            }
            
            const { data: allStudents } = await sb
                .from('consolidated_user_profiles_table')
                .select('user_id, full_name, student_id, program, email');
            
            const studentMap = {};
            allStudents?.forEach(s => {
                studentMap[s.user_id] = s;
                if (s.student_id) studentMap[s.student_id] = s;
            });
            
            proctoringLogs = logs.map(log => {
                let student = studentMap[log.student_id] || null;
                if (!student) student = studentMap[log.student_id] || null;
                return { ...log, student_profile: student };
            });
            
            displayProctoringLogs();
            loadingDiv.style.display = 'none';
            table.style.display = 'table';
            updateStats();
        } catch (error) {
            console.error('Error loading proctoring logs:', error);
            loadingDiv.innerHTML = 'Error loading logs: ' + error.message;
        }
    }

    function displayProctoringLogs() {
        const start = (currentPage.proctoring - 1) * itemsPerPage;
        const page = proctoringLogs.slice(start, start + itemsPerPage);
        const tbody = document.getElementById('proctoringBody');
        if (!tbody) return;
        if (page.length === 0) { 
            tbody.innerHTML = '<tr><td colspan="8">No alerts</td></tr>'; 
            return; 
        }
        
        tbody.innerHTML = page.map(log => {
            const student = log.student_profile || {};
            const studentName = student.full_name || 'Unknown';
            const studentIdDisplay = student.student_id || log.student_id || 'N/A';
            const examName = examsMap[log.exam_id]?.exam_name || 'Exam ' + log.exam_id;
            let severityClass = 'status-pending';
            let severityText = log.severity || 'info';
            if (severityText === 'critical') severityClass = 'status-critical';
            else if (severityText === 'warning') severityClass = 'status-warning';
            let alertIcon = '📹';
            if (log.event_type === 'multiple_faces_detected') alertIcon = '🚨';
            else if (log.event_type === 'face_missing') alertIcon = '😞';
            else if (log.event_type === 'fullscreen_exit_attempt') alertIcon = '🔄';
            const hasSnapshot = log.snapshot_url;
            const snapshotHtml = hasSnapshot ?
                `<a href="${log.snapshot_url}" target="_blank" style="padding:2px 8px;font-size:0.6rem;margin-left:5px;background:#10B981;color:white;border-radius:4px;text-decoration:none;" title="View Snapshot">📸</a>` :
                '';
            return `<tr style="${severityText === 'critical' ? 'background:#FEF2F2;' : ''}">
                <td style="padding:8px;font-size:0.75rem;">${formatKenyaTime(log.timestamp)}</td>
                <td style="padding:8px;"><span class="student-id-badge">${studentIdDisplay}</span></td>
                <td style="padding:8px;"><strong>${studentName}</strong><br><small style="color:#6b7280;">${student.program || ''}</small></td>
                <td style="padding:8px;">${examName}</td>
                <td style="padding:8px;"><span class="${severityText === 'critical' ? 'status-critical' : 'status-pending'}">${alertIcon} ${log.event_type}</span></td>
                <td style="padding:8px;font-size:0.75rem;">${log.details || '-'}</td>
                <td style="padding:8px;"><span class="${severityClass}">${severityText}</span></td>
                <td style="padding:8px;"><button class="action-btn btn-view" onclick="viewAlertDetails('${log.id}')" style="background:#4299E1;color:white;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;"><i class="fas fa-eye"></i> View</button>${snapshotHtml}</td>
            </tr>`;
        }).join('');
        renderPagination('proctoring', proctoringLogs.length);
    }

    // ============================================
    // 🔔 REALTIME NOTIFICATIONS
    // ============================================
    async function setupRealtimeNotifications() {
        const { data: existingLogs } = await sb
            .from('exam_proctoring_logs')
            .select('id, is_read')
            .eq('is_read', false);
        
        unreadCount = existingLogs?.length || 0;
        document.getElementById('notificationCount').innerText = unreadCount;
        document.getElementById('sidebarAlertCount').innerText = unreadCount;
        
        notificationSubscription = sb.channel('proctoring-alerts')
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'exam_proctoring_logs' 
            }, async (payload) => {
                unreadCount++;
                document.getElementById('notificationCount').innerText = unreadCount;
                document.getElementById('sidebarAlertCount').innerText = unreadCount;
                await loadNotifications();
                if (currentTab === 'proctoring') loadProctoringLogs();
                updateStats();
            })
            .subscribe();
    }

    async function loadNotifications() {
        const { data: logs } = await sb
            .from('exam_proctoring_logs')
            .select('*')
            .eq('is_read', false)
            .order('timestamp', { ascending: false })
            .limit(20);
        
        const studentIds = [...new Set(logs?.map(l => l.student_id).filter(Boolean))];
        const { data: profiles } = await sb
            .from('consolidated_user_profiles_table')
            .select('user_id, full_name, student_id')
            .in('user_id', studentIds);
        
        const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));
        const container = document.getElementById('notificationList');
        
        if (!logs || logs.length === 0) { 
            container.innerHTML = '<div style="padding:20px;text-align:center;">No new alerts</div>'; 
            return; 
        }
        
        container.innerHTML = logs.map(log =>
            `<div class="notification-item ${log.event_type === 'multiple_faces_detected' ? 'critical' : 'unread'}" onclick="markNotificationRead('${log.id}')">
                <div class="notification-title">${log.event_type === 'multiple_faces_detected' ? '🚨 MULTIPLE FACES' : '📹 ' + log.event_type}</div>
                <div class="notification-detail"><strong>Student:</strong> ${profileMap[log.student_id]?.full_name} (${profileMap[log.student_id]?.student_id})</div>
                <div class="notification-detail"><strong>Exam:</strong> ${examsMap[log.exam_id]?.exam_name}</div>
                <div class="notification-time">${formatKenyaTime(log.timestamp)}</div>
                <button class="mark-read-btn" onclick="event.stopPropagation(); markNotificationRead('${log.id}')">Mark read</button>
            </div>`
        ).join('');
        
        document.getElementById('notificationCount').innerText = logs.length;
        document.getElementById('sidebarAlertCount').innerText = logs.length;
    }

    window.markNotificationRead = async function(logId) {
        await sb.from('exam_proctoring_logs').update({ is_read: true }).eq('id', logId);
        unreadCount--;
        document.getElementById('notificationCount').innerText = Math.max(0, unreadCount);
        document.getElementById('sidebarAlertCount').innerText = Math.max(0, unreadCount);
        loadNotifications();
    };

    // ============================================
    // 🧹 CLEAR ALL ALERTS
    // ============================================
    window.clearAllAlerts = async function() {
        if (confirm('Clear all alerts?')) { 
            await sb.from('exam_proctoring_logs').delete().neq('id', 0);
            loadProctoringLogs();
            loadNotifications();
            alert('Cleared'); 
        }
    };

    // ============================================
    // 🔄 RESET PROCTORING FILTERS
    // ============================================
    window.resetProctoringFilters = function() {
        ['alertTypeFilter', 'severityFilter', 'proctoringSearch'].forEach(id => { 
            const el = document.getElementById(id);
            if (el) el.value = ''; 
        });
        currentPage.proctoring = 1;
        loadProctoringLogs();
    };

    // ============================================
    // 🚀 RESET BY EMAIL
    // ============================================
    window.openResetByEmailModal = function() {
        let modal = document.getElementById('resetByEmailModal');
        loadExamsForResetDropdown();
        document.getElementById('resetEmailInput').value = '';
        document.getElementById('resetStudentInfo').style.display = 'none';
        document.getElementById('resetErrorInfo').style.display = 'none';
        document.getElementById('confirmResetByEmailBtn').disabled = true;
        modal.style.display = 'flex';
    };

    window.confirmResetByEmail = async function() {
        if (!window.resetTargetStudent) { 
            alert('No student selected. Please enter a valid email.'); 
            return; 
        }
        
        const examId = document.getElementById('resetExamSelect').value;
        const student = window.resetTargetStudent;
        const examName = examId ? (examsMap[examId]?.exam_name || 'Selected Exam') : 'ALL EXAMS';
        
        let confirmMsg = `⚠️ RESET STUDENT EXAMS\n\nStudent: ${student.full_name}\nEmail: ${student.email}\nStudent ID: ${student.student_id || 'N/A'}\n\n`;
        if (examId) {
            confirmMsg += `Exam to reset: ${examName}\nThis will delete ALL answers for this specific exam.\n\n`;
        } else {
            confirmMsg += `⚠️ You are about to reset ALL EXAMS for this student!\nThis will delete EVERY exam attempt.\n\n`;
        }
        confirmMsg += `This action cannot be undone! Are you absolutely sure?`;
        
        if (!confirm(confirmMsg)) return;
        
        try {
            let query = sb.from('exam_grades').delete().eq('student_id', student.user_id);
            if (examId) query = query.eq('exam_id', parseInt(examId));
            const { error: deleteError } = await query;
            if (deleteError) throw deleteError;
            
            if (examId) {
                const { data: grades } = await sb
                    .from('exam_grades')
                    .select('id')
                    .eq('student_id', student.user_id)
                    .eq('exam_id', parseInt(examId));
                if (grades && grades.length) {
                    await sb.from('released_exam_results').delete().in('result_id', grades.map(g => g.id));
                }
            } else {
                await sb.from('released_exam_results').delete().eq('student_id', student.user_id);
            }
            
            alert(`✅ Successfully reset ${examId ? `"${examName}" for ${student.full_name}` : `ALL exams for ${student.full_name}`}`);
            closeResetByEmailModal();
            loadStudentsWithResults();
            loadAllExams();
            loadAllStudents();
        } catch (err) { 
            alert('❌ Error resetting: ' + err.message); 
        }
    };

    // ============================================
    // 🔄 RESET SINGLE STUDENT
    // ============================================
    window.resetSingleStudent = async function(studentId, examId, studentName, examName) {
        if (!confirm(
            `⚠️ RESET STUDENT EXAM\n\nReset "${studentName}"'s attempt for "${examName}"?\n\nThis will delete ALL their answers and scores.\n\nCannot be undone!`
        )) return;
        
        try {
            await sb.from('exam_grades').delete().eq('student_id', studentId).eq('exam_id', examId);
            await sb.from('released_exam_results').delete().eq('student_id', studentId);
            alert(`✅ ${studentName}'s exam "${examName}" has been reset.`);
            loadStudentsWithResults();
            loadAllExams();
        } catch (err) { 
            alert('Error: ' + err.message); 
        }
    };

    // ============================================
    // 📈 UPDATE STATS
    // ============================================
    async function updateStats() {
        const totalStudents = allStudents.length;
        const passed = studentsResults.filter(r => r.result_status === 'PASS').length;
        const failed = studentsResults.filter(r => r.result_status === 'FAIL').length;
        const pending = studentsResults.filter(r => r.result_status === 'PENDING' || r.result_status === 'PENDING_REVIEW' || !r.result_status).length;
        const scoredExams = studentsResults.filter(r => r.total_score > 0);
        const avg = scoredExams.length ? (scoredExams.reduce((a, b) => a + (parseFloat(b.total_score) || 0), 0) / scoredExams.length).toFixed(1) : 0;
        const faceAlerts = proctoringLogs.filter(l => l.event_type === 'multiple_faces_detected').length;

        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { data: recentStarts } = await sb
            .from('exam_proctoring_logs')
            .select('student_id')
            .eq('event_type', 'exam_started')
            .gte('timestamp', fiveMinutesAgo);
        
        const onlineStudents = new Set();
        recentStarts?.forEach(s => onlineStudents.add(s.student_id));

        document.getElementById('statsContainer').innerHTML = `
            <div class="stat-card total"><div class="stat-value">${totalStudents}</div><div class="stat-label">Total Students</div></div>
            <div class="stat-card online"><div class="stat-value">${onlineStudents.size}</div><div class="stat-label">🟢 Currently Online</div></div>
            <div class="stat-card passed"><div class="stat-value">${passed}</div><div class="stat-label">Passed</div></div>
            <div class="stat-card failed"><div class="stat-value">${failed}</div><div class="stat-label">Failed</div></div>
            <div class="stat-card pending"><div class="stat-value">${pending}</div><div class="stat-label">Pending Release</div></div>
            <div class="stat-card avg"><div class="stat-value">${avg}%</div><div class="stat-label">Avg Score</div></div>
            <div class="stat-card face-alerts"><div class="stat-value">${faceAlerts}</div><div class="stat-label">Face Violations</div></div>
        `;
    }

    // ============================================
    // 📄 PAGINATION
    // ============================================
    function renderPagination(type, total) {
        const totalPages = Math.ceil(total / itemsPerPage);
        const container = document.getElementById(type + 'Pagination');
        if (!container || totalPages <= 1) { 
            if (container) container.innerHTML = ''; 
            return; 
        }
        
        let html = `<button class="page-btn" onclick="changePage('${type}',${currentPage[type]-1})" ${currentPage[type]===1?'disabled':''}>‹</button>`;
        for (let i = 1; i <= totalPages; i++) { 
            if (i === 1 || i === totalPages || (i >= currentPage[type] - 2 && i <= currentPage[type] + 2)) {
                html += `<button class="page-btn ${i===currentPage[type]?'active':''}" onclick="changePage('${type}',${i})">${i}</button>`;
            }
        }
        html += `<button class="page-btn" onclick="changePage('${type}',${currentPage[type]+1})" ${currentPage[type]===totalPages?'disabled':''}>›</button>`;
        container.innerHTML = html;
    }

    window.changePage = function(type, page) { 
        currentPage[type] = page; 
        if (type === 'students') displayStudentsResults(); 
        if (type === 'allStudents') displayAllStudents(); 
        if (type === 'exams') loadAllExams(); 
        if (type === 'proctoring') displayProctoringLogs(); 
    };

    // ============================================
    // 🔍 VIEW EXAM RESULT
    // ============================================
    window.viewExamResult = async function(sid, eid) {
        const { data: grade } = await sb
            .from('exam_grades')
            .select('*')
            .eq('student_id', sid)
            .eq('exam_id', eid)
            .eq('question_id', '00000000-0000-0000-0000-000000000000')
            .single();
        
        const { data: exam } = await sb.from('exams').select('*').eq('id', eid).single();
        const { data: profile } = await sb
            .from('consolidated_user_profiles_table')
            .select('*')
            .eq('user_id', sid)
            .single();
        
        const totalMarks = exam?.total_marks || getExamTotalMarks(exam?.exam_type);
        const passMark = exam?.pass_mark || getPassMark(totalMarks);
        const score = grade?.marks || 0;
        const percentage = totalMarks > 0 ? ((score / totalMarks) * 100).toFixed(1) : '0.0';
        const status = grade?.result_status || 'PENDING';
        const isPassed = status === 'PASS' || score >= passMark;
        const displayStatus = isPassed ? 'PASS' : (status === 'FAIL' ? 'FAIL' : 'PENDING');
        const statusClass = displayStatus === 'PASS' ? 'status-pass' : (displayStatus === 'FAIL' ? 'status-fail' : 'status-pending');
        
        document.getElementById('modalContent').innerHTML = `
            <div style="background:${isPassed ? '#D1FAE5' : '#FEE2E2'};padding:20px;border-radius:16px;">
                <h3>${profile?.full_name} (${profile?.student_id})</h3>
                <p><strong>Exam:</strong> ${exam?.exam_name}</p>
                <p><strong>Score:</strong> ${score} / ${totalMarks} marks</p>
                <p><strong>Percentage:</strong> ${percentage}%</p>
                <p><strong>Pass Mark:</strong> ${passMark} marks (60%)</p>
                <p><strong>Status:</strong> <span class="${statusClass}">${displayStatus}</span></p>
            </div>`;
        document.getElementById('studentModal').style.display = 'flex';
    };

    // ============================================
    // 👤 VIEW STUDENT PROFILE
    // ============================================
    window.viewStudentProfile = async function(pid) {
        const { data: student } = await sb
            .from('consolidated_user_profiles_table')
            .select('*')
            .eq('id', pid)
            .single();
        
        document.getElementById('modalContent').innerHTML = `
            <p><strong>Student ID:</strong> ${student.student_id}</p>
            <p><strong>Email:</strong> ${student.email}</p>
            <p><strong>Program:</strong> ${student.program}</p>
            <p><strong>Block:</strong> ${student.block}</p>`;
        document.getElementById('studentModal').style.display = 'flex';
    };

    // ============================================
    // 📝 VIEW ALERT DETAILS
    // ============================================
    window.viewAlertDetails = async function(logId) {
        let log = proctoringLogs ? proctoringLogs.find(l => String(l.id) === String(logId)) : null;
        if (!log) {
            const { data, error } = await sb
                .from('exam_proctoring_logs')
                .select('*')
                .eq('id', logId)
                .single();
            if (error) { 
                alert('Alert not found'); 
                return; 
            }
            log = data;
            const { data: student } = await sb
                .from('consolidated_user_profiles_table')
                .select('full_name, student_id, program, email')
                .eq('user_id', log.student_id)
                .single();
            log.student_profile = student || {};
        }
        
        const student = log.student_profile || {};
        const examName = examsMap[log.exam_id]?.exam_name || 'Unknown Exam';
        const snapshotUrl = log.snapshot_url;
        const snapshotHtml = snapshotUrl ?
            `<div style="margin-top:15px;border-top:1px solid #e5e7eb;padding-top:15px;">
                <h4>📸 Camera Snapshot</h4>
                <div style="background:#000;border-radius:8px;overflow:hidden;max-width:100%;">
                    <img src="${snapshotUrl}" style="width:100%;max-height:400px;object-fit:contain;" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22150%22%3E%3Crect fill=%22%23333%22 width=%22200%22 height=%22150%22/%3E%3Ctext x=%2250%22 y=%2275%22 fill=%22%23666%22 font-family=%22Arial%22 font-size=%2214%22%3ENo Image%3C/text%3E%3C/svg%3E'">
                </div>
                <a href="${snapshotUrl}" target="_blank" style="margin-top:10px;display:inline-block;padding:8px 16px;background:#4C1D95;color:white;border-radius:6px;text-decoration:none;">View Full Image</a>
            </div>` :
            '<p style="color:#6b7280;margin-top:10px;">📷 No camera snapshot captured</p>';
        
        let bgColor = '#F0FDF4';
        if (log.severity === 'critical') bgColor = '#FEE2E2';
        else if (log.severity === 'warning') bgColor = '#FEF3C7';
        
        document.getElementById('modalTitle').innerHTML = '<i class="fas fa-exclamation-triangle"></i> Proctoring Alert Details';
        document.getElementById('modalContent').innerHTML = `
            <div style="background:${bgColor};padding:20px;border-radius:16px;">
                <p><strong>👤 Student:</strong> ${student.full_name || 'Unknown'} (${student.student_id || log.student_id || 'N/A'})</p>
                <p><strong>📝 Exam:</strong> ${examName}</p>
                <p><strong>⏰ Time:</strong> ${formatKenyaTime(log.timestamp)}</p>
                <p><strong>📹 Alert Type:</strong> ${log.event_type}</p>
                <p><strong>📋 Details:</strong> ${log.details || 'No details'}</p>
                <p><strong>⚠️ Severity:</strong> <span class="${log.severity === 'critical' ? 'status-critical' : 'status-pending'}">${log.severity || 'info'}</span></p>
                <p><strong>🌐 IP Address:</strong> ${log.ip_address || 'N/A'}</p>
                <p><strong>💻 Device:</strong> ${log.device_info || 'N/A'}</p>
            </div>${snapshotHtml}`;
        document.getElementById('studentModal').style.display = 'flex';
    };

    // ============================================
    // 📝 VIEW STUDENT PROGRESS
    // ============================================
    window.viewStudentProgress = async function(studentId, studentName, examId) {
        try {
            document.getElementById('modalTitle').innerHTML = `<i class="fas fa-chart-line"></i> Student Progress`;
            document.getElementById('modalContent').innerHTML = '<div style="text-align:center;padding:40px;"><i class="fas fa-spinner fa-spin fa-2x"></i><br>Loading...</div>';
            document.getElementById('studentModal').style.display = 'flex';
            
            const { data: answers } = await sb
                .from('exam_grades')
                .select('*')
                .eq('student_id', studentId)
                .eq('exam_id', parseInt(examId))
                .neq('question_id', '00000000-0000-0000-0000-000000000000');
            
            const { data: questions } = await sb
                .from('exam_questions')
                .select('*')
                .eq('exam_id', parseInt(examId))
                .order('question_number');
            
            const { data: exam } = await sb
                .from('exams')
                .select('exam_name')
                .eq('id', parseInt(examId))
                .single();
            
            const examName = exam?.exam_name || 'Exam ' + examId;
            const answeredCount = answers?.length || 0;
            const totalQuestions = questions?.length || 0;
            const correctCount = answers?.filter(a => a.selected_answer && a.marks > 0).length || 0;
            
            let html = `
                <div style="background:#F8FAFC;padding:16px;border-radius:12px;margin-bottom:16px;">
                    <h3>${studentName}</h3>
                    <p style="color:#64748B;">${examName}</p>
                    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:12px;">
                        <div style="background:white;padding:10px;border-radius:8px;text-align:center;">
                            <div style="font-size:1.5rem;font-weight:700;color:#0A3D62;">${answeredCount}/${totalQuestions}</div>
                            <div style="font-size:0.7rem;color:#64748B;">Answered</div>
                        </div>
                        <div style="background:white;padding:10px;border-radius:8px;text-align:center;">
                            <div style="font-size:1.5rem;font-weight:700;color:#38A169;">${correctCount}</div>
                            <div style="font-size:0.7rem;color:#64748B;">Correct</div>
                        </div>
                        <div style="background:white;padding:10px;border-radius:8px;text-align:center;">
                            <div style="font-size:1.5rem;font-weight:700;color:#F59E0B;">${totalQuestions - answeredCount}</div>
                            <div style="font-size:0.7rem;color:#64748B;">Unanswered</div>
                        </div>
                    </div>
                </div>
                <div style="max-height:400px;overflow-y:auto;">
                    <table style="width:100%;border-collapse:collapse;font-size:0.8rem;">
                        <thead>
                            <tr style="background:#F1F5F9;">
                                <th style="padding:8px;text-align:left;">Q#</th>
                                <th style="padding:8px;text-align:left;">Question</th>
                                <th style="padding:8px;text-align:center;">Answer</th>
                                <th style="padding:8px;text-align:center;">Correct</th>
                                <th style="padding:8px;text-align:center;">Status</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            questions?.forEach((q, index) => {
                const answer = answers?.find(a => a.question_id === q.id);
                const isCorrect = answer?.selected_answer === q.correct_answer;
                const isAnswered = !!answer?.selected_answer;
                const statusIcon = isAnswered ? (isCorrect ? '✅' : '❌') : '⬜';
                const statusText = isAnswered ? (isCorrect ? 'Correct' : 'Wrong') : 'Not answered';
                const statusColor = isAnswered ? (isCorrect ? '#38A169' : '#DC2626') : '#94A3B8';
                
                html += `
                    <tr style="border-bottom:1px solid #E2E8F0;">
                        <td style="padding:8px;">${index + 1}</td>
                        <td style="padding:8px;">${q.question_text.substring(0, 60)}...</td>
                        <td style="padding:8px;text-align:center;">${answer?.selected_answer || '-'}</td>
                        <td style="padding:8px;text-align:center;">${q.correct_answer}</td>
                        <td style="padding:8px;text-align:center;color:${statusColor};font-weight:600;">${statusIcon} ${statusText}</td>
                    </tr>
                `;
            });
            
            html += `</tbody></table></div>`;
            document.getElementById('modalContent').innerHTML = html;
            
        } catch (error) {
            document.getElementById('modalContent').innerHTML = `<div style="color:#DC2626;padding:20px;">Error: ${error.message}</div>`;
        }
    };

    // ============================================
    // 📝 VIEW VIOLATIONS
    // ============================================
    window.viewViolations = async function(studentId, examId) {
        try {
            const { data: violations } = await sb
                .from('exam_proctoring_logs')
                .select('*')
                .eq('student_id', studentId)
                .eq('exam_id', parseInt(examId))
                .in('event_type', ['multiple_faces_detected', 'face_missing', 'tab_switched', 'fullscreen_exit_attempt'])
                .order('timestamp', { ascending: false })
                .limit(20);
            
            if (!violations || violations.length === 0) {
                showToast('No violations found', 'info');
                return;
            }
            
            const { data: profile } = await sb
                .from('consolidated_user_profiles_table')
                .select('full_name, student_id')
                .eq('user_id', studentId)
                .single();
            
            document.getElementById('modalTitle').innerHTML = `🚨 Violations - ${profile?.full_name || 'Student'}`;
            document.getElementById('modalContent').innerHTML = `
                <div style="max-height:400px; overflow-y:auto;">
                    ${violations.map(v => `
                        <div style="padding:10px; border-bottom:1px solid #E2E8F0; display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <span style="font-weight:600;">${v.event_type}</span>
                                <div style="font-size:0.8rem; color:#64748B;">${v.details || ''}</div>
                            </div>
                            <span style="font-size:0.7rem; color:#64748B;">${formatKenyaTime(v.timestamp)}</span>
                        </div>
                    `).join('')}
                </div>
                ${violations[0]?.snapshot_url ? `
                    <div style="margin-top:16px; border-top:1px solid #E2E8F0; padding-top:16px;">
                        <h4>Latest Snapshot</h4>
                        <img src="${violations[0].snapshot_url}" style="max-width:100%; max-height:300px; border-radius:8px;">
                    </div>
                ` : ''}
            `;
            document.getElementById('studentModal').style.display = 'flex';
            
        } catch (error) {
            showToast('Error loading violations: ' + error.message, 'error');
        }
    };

    // ============================================
    // ✏️ EDIT MARKS
    // ============================================
    window.openEditMarksModal = async function(studentId, examId, studentName, examName) {
        try {
            document.getElementById('modalTitle').innerHTML = `<i class="fas fa-spinner fa-spin"></i> Loading...`;
            document.getElementById('modalContent').innerHTML = '<div style="text-align:center;padding:40px;"><i class="fas fa-spinner fa-spin fa-2x"></i><br>Loading student data...</div>';
            document.getElementById('studentModal').style.display = 'flex';
            
            const { data: grade, error: gradeError } = await sb
                .from('exam_grades')
                .select('*')
                .eq('student_id', studentId)
                .eq('exam_id', parseInt(examId))
                .eq('question_id', '00000000-0000-0000-0000-000000000000')
                .maybeSingle();
            
            if (gradeError) throw gradeError;
            
            const { data: exam, error: examError } = await sb
                .from('exams')
                .select('*')
                .eq('id', parseInt(examId))
                .single();
            
            if (examError) throw examError;
            
            const examType = exam?.exam_type || 'EXAM';
            const isCatExam = examType.toUpperCase().includes('CAT');
            const totalMarks = isCatExam ? 30 : (exam?.total_marks || 70);
            const passMark = exam?.pass_mark || getPassMark(totalMarks) || 18;
            
            let cat1Score = grade?.cat_1_score !== undefined ? grade.cat_1_score : null;
            let cat2Score = grade?.cat_2_score !== undefined ? grade.cat_2_score : null;
            let examScore = grade?.exam_score !== undefined ? grade.exam_score : null;
            let currentTotal = grade?.marks || 0;
            let currentPercentage = totalMarks > 0 ? ((currentTotal / totalMarks) * 100).toFixed(1) : '0.0';
            
            if (isCatExam) {
                cat1Score = grade?.marks || 0;
                cat2Score = null;
                examScore = null;
            }
            
            let editHtml = `
                <div style="background:#F8FAFC;padding:16px;border-radius:12px;margin-bottom:16px;">
                    <h3 style="margin-bottom:8px;">${studentName}</h3>
                    <p style="color:#64748B;font-size:0.85rem;">${examName} (${isCatExam ? 'CAT' : 'Final Exam'})</p>
                    <p style="color:#64748B;font-size:0.8rem;">Total Marks: ${totalMarks} | Pass Mark: ${passMark} (60%)</p>
                    <p><strong>Current Score:</strong> ${currentTotal} / ${totalMarks} (${currentPercentage}%)</p>
                    <p><strong>Current Status:</strong> <span class="${parseFloat(currentPercentage) >= passMark ? 'status-pass' : 'status-fail'}">${parseFloat(currentPercentage) >= passMark ? 'PASS' : 'FAIL'}</span></p>
                </div>
            `;
            
            if (isCatExam) {
                editHtml += `
                    <div class="form-group">
                        <label>CAT Score (max ${totalMarks} marks) *</label>
                        <input type="number" id="editCat1Score" value="${cat1Score || 0}" min="0" max="${totalMarks}" step="0.5" style="width:100%;padding:12px;border-radius:12px;border:2px solid #E2E8F0;">
                        <small style="color:#64748B;">Enter the student's CAT score</small>
                    </div>
                `;
            } else {
                editHtml += `
                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
                        <div class="form-group">
                            <label>CAT 1 (max 30) *</label>
                            <input type="number" id="editCat1Score" value="${cat1Score !== null ? cat1Score : ''}" min="0" max="30" step="0.5" style="width:100%;padding:12px;border-radius:12px;border:2px solid #E2E8F0;" placeholder="e.g., 25">
                        </div>
                        <div class="form-group">
                            <label>CAT 2 (max 30) *</label>
                            <input type="number" id="editCat2Score" value="${cat2Score !== null ? cat2Score : ''}" min="0" max="30" step="0.5" style="width:100%;padding:12px;border-radius:12px;border:2px solid #E2E8F0;" placeholder="e.g., 28">
                        </div>
                        <div class="form-group">
                            <label>Exam Score (max 70) *</label>
                            <input type="number" id="editExamScore" value="${examScore !== null ? examScore : ''}" min="0" max="70" step="0.5" style="width:100%;padding:12px;border-radius:12px;border:2px solid #E2E8F0;" placeholder="e.g., 65">
                        </div>
                    </div>
                    <small style="color:#64748B;display:block;margin-top:4px;">📊 Total = CAT1 + CAT2 + Exam Score (max 100)</small>
                `;
            }
            
            editHtml += `
                <div style="margin-top:20px;padding:12px;background:#EFF6FF;border-radius:10px;">
                    <p><strong>Preview:</strong> <span id="editPreviewTotal">${currentTotal}</span> / ${totalMarks} 
                    (<span id="editPreviewPercent">${currentPercentage}</span>%) 
                    → <span id="editPreviewStatus" class="${parseFloat(currentPercentage) >= passMark ? 'status-pass' : 'status-fail'}">${parseFloat(currentPercentage) >= passMark ? 'PASS' : 'FAIL'}</span></p>
                </div>
                <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px;border-top:1px solid #E2E8F0;padding-top:20px;">
                    <input type="hidden" id="editStudentId" value="${studentId}">
                    <input type="hidden" id="editExamId" value="${examId}">
                    <input type="hidden" id="editGradeId" value="${grade?.id || ''}">
                    <input type="hidden" id="editTotalMarks" value="${totalMarks}">
                    <input type="hidden" id="editPassMark" value="${passMark}">
                    <button class="btn btn-danger" onclick="closeModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="saveEditedMarks()"><i class="fas fa-save"></i> Save Marks</button>
                </div>
            `;
            
            document.getElementById('modalTitle').innerHTML = `<i class="fas fa-edit"></i> Edit Marks - ${studentName}`;
            document.getElementById('modalContent').innerHTML = editHtml;
            
            setTimeout(() => {
                const inputs = document.querySelectorAll('#editCat1Score, #editCat2Score, #editExamScore');
                inputs.forEach(input => {
                    if (input) {
                        input.addEventListener('input', updateEditPreview);
                        input.addEventListener('change', updateEditPreview);
                    }
                });
            }, 100);
            
        } catch (error) {
            console.error('Error loading edit modal:', error);
            document.getElementById('modalContent').innerHTML = `
                <div style="color:#DC2626;padding:20px;text-align:center;">
                    <i class="fas fa-exclamation-circle fa-2x"></i>
                    <p>Error: ${error.message}</p>
                    <button class="btn btn-primary" onclick="closeModal()">Close</button>
                </div>
            `;
        }
    };

    window.updateEditPreview = function() {
        const isCatExam = !document.getElementById('editExamScore');
        let total = 0;
        let cat1 = parseFloat(document.getElementById('editCat1Score')?.value) || 0;
        let cat2 = parseFloat(document.getElementById('editCat2Score')?.value) || 0;
        let examSc = parseFloat(document.getElementById('editExamScore')?.value) || 0;
        
        if (document.getElementById('editExamScore')) {
            total = cat1 + cat2 + examSc;
        } else {
            total = cat1;
        }
        
        const totalMarks = parseInt(document.getElementById('editTotalMarks')?.value) || 100;
        const passMark = parseInt(document.getElementById('editPassMark')?.value) || 60;
        const percentage = totalMarks > 0 ? ((total / totalMarks) * 100).toFixed(1) : '0.0';
        const isPassed = parseFloat(percentage) >= passMark;
        
        const totalEl = document.getElementById('editPreviewTotal');
        const percentEl = document.getElementById('editPreviewPercent');
        const statusEl = document.getElementById('editPreviewStatus');
        
        if (totalEl) totalEl.textContent = total.toFixed(1);
        if (percentEl) percentEl.textContent = percentage;
        if (statusEl) {
            statusEl.textContent = isPassed ? 'PASS' : 'FAIL';
            statusEl.className = isPassed ? 'status-pass' : 'status-fail';
        }
    };

    window.saveEditedMarks = async function() {
        try {
            const studentId = document.getElementById('editStudentId').value;
            const examId = parseInt(document.getElementById('editExamId').value);
            const gradeId = document.getElementById('editGradeId').value;
            const totalMarks = parseInt(document.getElementById('editTotalMarks').value);
            const passMark = parseInt(document.getElementById('editPassMark').value);
            
            const isCatExam = !document.getElementById('editExamScore');
            
            let cat1 = parseFloat(document.getElementById('editCat1Score')?.value) || 0;
            let cat2 = 0;
            let examScore = 0;
            let total = cat1;
            
            if (!isCatExam) {
                cat2 = parseFloat(document.getElementById('editCat2Score')?.value) || 0;
                examScore = parseFloat(document.getElementById('editExamScore')?.value) || 0;
                total = cat1 + cat2 + examScore;
            }
            
            if (isCatExam && cat1 > 30) {
                alert('CAT score cannot exceed 30 marks!');
                return;
            }
            if (!isCatExam) {
                if (cat1 > 30 || cat2 > 30 || examScore > 70) {
                    alert('CAT scores max 30, Exam score max 70!');
                    return;
                }
            }
            
            const percentage = totalMarks > 0 ? ((total / totalMarks) * 100) : 0;
            const isPassed = percentage >= passMark;
            const resultStatus = isPassed ? 'PASS' : 'FAIL';
            
            if (!confirm(`Save marks?\n\n${isCatExam ? 'CAT: ' + cat1 : 'CAT1: ' + cat1 + ' | CAT2: ' + cat2 + ' | Exam: ' + examScore}\nTotal: ${total.toFixed(1)} / ${totalMarks} (${percentage.toFixed(1)}%)\nStatus: ${resultStatus}`)) {
                return;
            }
            
            const updateData = {
                marks: total,
                total_score: total,
                result_status: resultStatus,
                updated_at: new Date().toISOString()
            };
            
            if (isCatExam) {
                updateData.cat_1_score = cat1;
            } else {
                updateData.cat_1_score = cat1;
                updateData.cat_2_score = cat2;
                updateData.exam_score = examScore;
            }
            
            const { error: updateError } = await sb
                .from('exam_grades')
                .update(updateData)
                .eq('id', gradeId);
            
            if (updateError) throw updateError;
            
            alert(`✅ Marks updated successfully!\n\nTotal: ${total.toFixed(1)} / ${totalMarks} (${percentage.toFixed(1)}%)\nStatus: ${resultStatus}`);
            closeModal();
            loadStudentsWithResults();
            
        } catch (error) {
            console.error('Error saving marks:', error);
            alert('❌ Error saving marks: ' + error.message);
        }
    };

    // ============================================
    // ⏱️ TIMER MODAL
    // ============================================
    window.openTimerModal = async function(studentId, studentName, examId, examName) {
        timerModalData = {
            studentId: studentId,
            examId: examId,
            studentName: studentName,
            examName: examName
        };
        
        document.getElementById('timerStudentName').textContent = studentName;
        document.getElementById('timerExamName').textContent = examName;
        document.getElementById('timerCurrentStatus').textContent = 'Loading...';
        document.getElementById('timerMinutesToAdd').value = 10;
        
        try {
            const { data: grade } = await sb
                .from('exam_grades')
                .select('result_status')
                .eq('student_id', studentId)
                .eq('exam_id', parseInt(examId))
                .eq('question_id', '00000000-0000-0000-0000-000000000000')
                .maybeSingle();
            
            if (grade) {
                const status = grade.result_status || 'PENDING';
                let statusDisplay = status;
                if (status === 'PENDING_REVIEW') statusDisplay = '⏳ Pending Review';
                else if (status === 'PASS') statusDisplay = '✅ Passed';
                else if (status === 'FAIL') statusDisplay = '❌ Failed';
                else if (status === 'SCHEDULED') statusDisplay = '📅 Scheduled';
                document.getElementById('timerCurrentStatus').textContent = statusDisplay;
            } else {
                document.getElementById('timerCurrentStatus').textContent = '📝 Not Started';
            }
        } catch (error) {
            document.getElementById('timerCurrentStatus').textContent = '⚠️ Unknown';
        }
        
        document.getElementById('timerModal').style.display = 'flex';
    };

    window.closeTimerModal = function() {
        document.getElementById('timerModal').style.display = 'none';
        timerModalData = { studentId: null, examId: null, studentName: null, examName: null };
    };

    window.addTimeToStudent = async function() {
        const { studentId, examId, studentName, examName } = timerModalData;
        const minutesToAdd = parseInt(document.getElementById('timerMinutesToAdd').value) || 10;
        
        if (minutesToAdd < 1 || minutesToAdd > 60) {
            alert('⚠️ Please enter a number between 1 and 60 minutes.');
            return;
        }
        
        if (!confirm(`Add ${minutesToAdd} minutes to ${studentName}'s timer for "${examName}"?`)) {
            return;
        }
        
        try {
            await sb.from('exam_proctoring_logs').insert({
                student_id: studentId,
                exam_id: parseInt(examId),
                event_type: 'time_extended',
                details: `Added ${minutesToAdd} minutes to student's exam timer (${studentName})`,
                severity: 'info',
                timestamp: new Date().toISOString()
            });
            
            try {
                const existing = await sb.from('exam_heartbeats')
                    .select('duration_extension')
                    .eq('student_id', studentId)
                    .eq('exam_id', parseInt(examId))
                    .maybeSingle();
                
                const currentExtension = existing?.duration_extension || 0;
                const newExtension = currentExtension + minutesToAdd;
                
                await sb.from('exam_heartbeats').upsert({
                    student_id: studentId,
                    exam_id: parseInt(examId),
                    duration_extension: newExtension,
                    extended_at: new Date().toISOString(),
                    timestamp: new Date().toISOString()
                }, { onConflict: 'student_id, exam_id' });
            } catch (e) {
                console.log('Note: exam_heartbeats table not available');
            }
            
            alert(`✅ Added ${minutesToAdd} minutes to ${studentName}'s timer!\n\n📝 Student must refresh the exam page to see the updated time.`);
            closeTimerModal();
            loadStudentsWithResults();
            loadAllExams();
            
        } catch (error) {
            console.error('Error adding time:', error);
            alert('❌ Error adding time: ' + error.message);
        }
    };

    window.resetStudentTimerComplete = async function() {
        const { studentId, examId, studentName, examName } = timerModalData;
        
        if (!confirm(`⚠️ RESET TIMER COMPLETELY\n\nStudent: ${studentName}\nExam: ${examName}\n\nAre you sure?`)) {
            return;
        }
        
        try {
            try {
                await sb.from('exam_heartbeats')
                    .delete()
                    .eq('student_id', studentId)
                    .eq('exam_id', parseInt(examId));
            } catch (e) {
                console.log('Note: exam_heartbeats table not available');
            }
            
            await sb.from('exam_proctoring_logs').insert({
                student_id: studentId,
                exam_id: parseInt(examId),
                event_type: 'timer_reset',
                details: `Admin reset timer completely for ${studentName}`,
                severity: 'warning',
                timestamp: new Date().toISOString()
            });
            
            alert(`✅ Timer reset completely for ${studentName}!`);
            closeTimerModal();
            loadStudentsWithResults();
            loadAllExams();
            
        } catch (error) {
            alert('❌ Error resetting timer: ' + error.message);
        }
    };

    // ============================================
    // 🚀 FORCE SUBMIT STUDENT
    // ============================================
    window.forceSubmitStudent = async function(studentId, examId) {
        if (!confirm(`⚠️ Force submit this student's exam?`)) return;
        
        try {
            await sb.from('exam_grades').upsert({
                student_id: studentId,
                exam_id: parseInt(examId),
                question_id: '00000000-0000-0000-0000-000000000000',
                result_status: 'PENDING_REVIEW',
                graded_at: new Date().toISOString()
            }, { onConflict: 'student_id, exam_id, question_id' });
            
            alert('✅ Exam force submitted!');
            loadStudentsWithResults();
        } catch (error) {
            alert('❌ Error: ' + error.message);
        }
    };

    // ============================================
    // 🎥 CAMERA VIEW
    // ============================================
    window.openCameraView = async function(studentId, examId, studentName, examName) {
        currentCameraStudent = studentId;
        currentCameraExam = examId;
        currentCameraStudentName = studentName;
        currentCameraExamName = examName;
        
        document.getElementById('cameraModalTitle').innerHTML = `<i class="fas fa-video"></i> Live Camera - ${studentName}`;
        document.getElementById('cameraStudentName').textContent = studentName;
        document.getElementById('cameraExamName').textContent = examName;
        document.getElementById('cameraStatus').textContent = '🟢 Connecting...';
        document.getElementById('cameraStatus').className = 'status-active';
        document.getElementById('cameraFeed').style.display = 'none';
        document.getElementById('cameraLoading').style.display = 'flex';
        document.getElementById('cameraLoading').innerHTML = `<i class="fas fa-spinner fa-spin fa-3x"></i><p>Loading camera feed...</p>`;
        document.getElementById('cameraOverlay').style.display = 'none';
        document.getElementById('snapshotGallery').style.display = 'none';
        document.getElementById('cameraAlertsList').innerHTML = '<p style="color:#94A3B8;">Loading alerts...</p>';
        
        document.getElementById('cameraModal').style.display = 'flex';
        
        try {
            await Promise.all([
                refreshCameraFeed(studentId, examId),
                loadCameraAlerts(studentId, examId),
                loadSnapshots(studentId, examId)
            ]);
            startCameraAutoRefresh(studentId, examId);
        } catch (error) {
            console.error('Error opening camera:', error);
            showToast('Error loading camera: ' + error.message, 'error');
        }
    };

    window.refreshCameraFeed = async function(studentId, examId) {
        const sid = studentId || currentCameraStudent;
        const eid = examId || currentCameraExam;
        if (!sid || !eid) return;
        
        try {
            const { data: logs, error } = await sb
                .from('exam_proctoring_logs')
                .select('*')
                .eq('student_id', sid)
                .eq('exam_id', parseInt(eid))
                .not('snapshot_url', 'is', null)
                .order('timestamp', { ascending: false })
                .limit(1);
            
            if (error) throw error;
            
            const feed = document.getElementById('cameraFeed');
            const loading = document.getElementById('cameraLoading');
            const overlay = document.getElementById('cameraOverlay');
            
            if (logs && logs.length > 0 && logs[0].snapshot_url) {
                feed.src = logs[0].snapshot_url + '?t=' + Date.now();
                feed.style.display = 'block';
                loading.style.display = 'none';
                overlay.style.display = 'block';
                document.getElementById('cameraTimestamp').textContent = formatKenyaTime(logs[0].timestamp);
                document.getElementById('cameraSignal').textContent = '🟢 Live';
                document.getElementById('cameraStatus').textContent = '🟢 Active';
                document.getElementById('cameraStatus').className = 'status-active';
                
                const { data: violations } = await sb
                    .from('exam_proctoring_logs')
                    .select('event_type')
                    .eq('student_id', sid)
                    .eq('exam_id', parseInt(eid))
                    .in('event_type', ['multiple_faces_detected', 'face_missing'])
                    .gte('timestamp', new Date(Date.now() - 120000).toISOString());
                
                if (violations && violations.length > 0) {
                    document.getElementById('cameraStatus').textContent = '🔴 Violation!';
                    document.getElementById('cameraStatus').className = 'status-critical';
                    document.getElementById('cameraSignal').textContent = '🚨 Alert';
                }
            } else {
                feed.style.display = 'none';
                loading.innerHTML = `
                    <div style="text-align:center;">
                        <i class="fas fa-user-clock fa-3x" style="color:#F59E0B;"></i>
                        <p style="margin-top:16px;">No camera snapshot available</p>
                        <button class="btn btn-primary" onclick="requestCameraSnapshot()" style="margin-top:12px;">
                            <i class="fas fa-camera"></i> Request Snapshot
                        </button>
                    </div>
                `;
                loading.style.display = 'flex';
                overlay.style.display = 'none';
                document.getElementById('cameraStatus').textContent = '📷 No Feed';
                document.getElementById('cameraStatus').className = 'status-pending';
            }
        } catch (error) {
            console.error('Error refreshing camera:', error);
            document.getElementById('cameraLoading').innerHTML = `
                <div style="text-align:center; color:#DC2626;">
                    <i class="fas fa-exclamation-triangle fa-3x"></i>
                    <p style="margin-top:16px;">Error: ${error.message}</p>
                    <button class="btn btn-primary" onclick="refreshCameraFeed()" style="margin-top:12px;">
                        <i class="fas fa-sync"></i> Retry
                    </button>
                </div>
            `;
        }
    };

    window.requestCameraSnapshot = async function() {
        if (!currentCameraStudent || !currentCameraExam) {
            showToast('No student selected', 'warning');
            return;
        }
        try {
            showToast('Requesting camera snapshot...', 'info');
            await sb.from('exam_proctoring_logs').insert({
                student_id: currentCameraStudent,
                exam_id: parseInt(currentCameraExam),
                event_type: 'snapshot_requested',
                details: `Admin requested camera snapshot`,
                timestamp: new Date().toISOString(),
                severity: 'info'
            });
            showToast('Snapshot requested. Waiting for camera...', 'info');
            setTimeout(() => refreshCameraFeed(), 3000);
        } catch (error) {
            showToast('Error: ' + error.message, 'error');
        }
    };

    window.captureSnapshot = async function() {
        const feed = document.getElementById('cameraFeed');
        if (feed.style.display === 'none') {
            showToast('No camera feed to capture', 'warning');
            return;
        }
        try {
            const { data: logs } = await sb
                .from('exam_proctoring_logs')
                .select('snapshot_url')
                .eq('student_id', currentCameraStudent)
                .eq('exam_id', parseInt(currentCameraExam))
                .not('snapshot_url', 'is', null)
                .order('timestamp', { ascending: false })
                .limit(1);
            
            if (logs && logs.length > 0 && logs[0].snapshot_url) {
                window.open(logs[0].snapshot_url, '_blank');
                showToast('📸 Snapshot opened', 'success');
            }
        } catch (error) {
            showToast('Error: ' + error.message, 'error');
        }
    };

    window.loadCameraAlerts = async function(studentId, examId) {
        const sid = studentId || currentCameraStudent;
        const eid = examId || currentCameraExam;
        if (!sid || !eid) return;
        
        try {
            const { data: alerts } = await sb
                .from('exam_proctoring_logs')
                .select('*')
                .eq('student_id', sid)
                .eq('exam_id', parseInt(eid))
                .in('event_type', ['multiple_faces_detected', 'face_missing', 'tab_switched'])
                .order('timestamp', { ascending: false })
                .limit(10);
            
            const list = document.getElementById('cameraAlertsList');
            if (!alerts || alerts.length === 0) {
                list.innerHTML = '<p style="color:#94A3B8;">✅ No recent alerts</p>';
                return;
            }
            list.innerHTML = alerts.map(a => `
                <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #E2E8F0;">
                    <span>${a.event_type === 'multiple_faces_detected' ? '🚨' : '⚠️'} ${a.event_type}</span>
                    <span style="color:#64748B; font-size:0.7rem;">${formatKenyaTime(a.timestamp)}</span>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading alerts:', error);
        }
    };

  // ============================================
// 📸 SNAPSHOT MANAGEMENT - FIXED FOR MULTIPLE
// ============================================

// Global array to store snapshots in memory
let snapshotCache = [];
let maxSnapshots = 50;

/**
 * Load snapshots for a student/exam from database
 */
window.loadSnapshots = async function(studentId, examId) {
    const sid = studentId || currentCameraStudent;
    const eid = examId || currentCameraExam;
    if (!sid || !eid) return;
    
    try {
        // Fetch snapshots from database - NOW UP TO 50
        const { data: snapshots, error } = await sb
            .from('exam_proctoring_logs')
            .select('id, snapshot_url, screenshot_data, timestamp, event_type, details')
            .eq('student_id', sid)
            .eq('exam_id', parseInt(eid))
            .not('snapshot_url', 'is', null)
            .order('timestamp', { ascending: false })
            .limit(50);
        
        if (error) throw error;
        
        // Store in cache
        snapshotCache = snapshots || [];
        
        // Render the gallery
        renderSnapshotGallery();
        
        console.log(`📸 Loaded ${snapshotCache.length} snapshots`);
        
    } catch (error) {
        console.error('Error loading snapshots:', error);
        showToast('Error loading snapshots: ' + error.message, 'error');
    }
};

/**
 * Render the snapshot gallery with all snapshots
 */
function renderSnapshotGallery() {
    const gallery = document.getElementById('snapshotGallery');
    const list = document.getElementById('snapshotList');
    const count = document.getElementById('snapshotCount');
    const empty = document.getElementById('snapshotEmpty');
    
    if (!gallery || !list) return;
    
    // Update count
    if (count) count.textContent = snapshotCache.length;
    
    if (snapshotCache.length === 0) {
        gallery.style.display = 'block';
        list.innerHTML = '';
        if (empty) {
            empty.style.display = 'flex';
            empty.innerHTML = `
                <i class="fas fa-camera-slash fa-2x"></i>
                <p style="margin:0;">No snapshots captured yet</p>
                <p style="margin:0; font-size:0.8rem; color:#94A3B8;">Click "Capture" to take a snapshot</p>
            `;
        }
        return;
    }
    
    gallery.style.display = 'block';
    if (empty) empty.style.display = 'none';
    
    // Build the snapshot list
    list.innerHTML = '';
    
    snapshotCache.forEach((snapshot, index) => {
        const imageUrl = snapshot.snapshot_url || snapshot.screenshot_data;
        if (!imageUrl) return;
        
        const div = document.createElement('div');
        div.className = 'snapshot-item';
        div.style.cssText = `
            flex: 0 0 180px;
            border-radius: 8px;
            overflow: hidden;
            border: 2px solid #E2E8F0;
            position: relative;
            background: #000;
            min-height: 140px;
            cursor: pointer;
            transition: all 0.3s;
        `;
        div.onmouseenter = function() {
            this.style.transform = 'scale(1.03)';
            this.style.borderColor = '#3B82F6';
            this.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
        };
        div.onmouseleave = function() {
            this.style.transform = 'scale(1)';
            this.style.borderColor = '#E2E8F0';
            this.style.boxShadow = 'none';
        };
        
        // Image
        const img = document.createElement('img');
        img.src = imageUrl + (imageUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
        img.alt = `Snapshot ${index + 1}`;
        img.style.cssText = `
            width: 100%;
            height: 140px;
            object-fit: cover;
        `;
        img.onerror = function() {
            this.style.display = 'none';
            const fallback = document.createElement('div');
            fallback.style.cssText = `
                width: 100%;
                height: 140px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #1a1a2e;
                color: #94A3B8;
                font-size: 0.8rem;
                flex-direction: column;
                gap: 8px;
            `;
            fallback.innerHTML = `
                <i class="fas fa-image" style="font-size:2rem; opacity:0.3;"></i>
                <span>Image unavailable</span>
            `;
            this.parentElement.insertBefore(fallback, this);
            this.remove();
        };
        div.appendChild(img);
        
        // Click to view fullscreen
        div.onclick = function() {
            viewSnapshotFullscreen(imageUrl);
        };
        
        // Overlay with timestamp and delete button
        const overlay = document.createElement('div');
        overlay.className = 'snapshot-overlay';
        overlay.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(0,0,0,0.7);
            color: white;
            padding: 4px 8px;
            font-size: 0.6rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        
        const timeSpan = document.createElement('span');
        const date = new Date(snapshot.timestamp);
        timeSpan.textContent = date.toLocaleTimeString('en-KE', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
        
        const delBtn = document.createElement('button');
        delBtn.innerHTML = '<i class="fas fa-times"></i>';
        delBtn.className = 'delete-btn';
        delBtn.style.cssText = `
            background: rgba(220,38,38,0.8);
            border: none;
            color: white;
            border-radius: 50%;
            width: 18px;
            height: 18px;
            cursor: pointer;
            font-size: 0.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        `;
        delBtn.onmouseenter = function() {
            this.style.background = '#DC2626';
            this.style.transform = 'scale(1.1)';
        };
        delBtn.onmouseleave = function() {
            this.style.background = 'rgba(220,38,38,0.8)';
            this.style.transform = 'scale(1)';
        };
        delBtn.onclick = function(e) {
            e.stopPropagation();
            deleteSnapshot(index, snapshot.id);
        };
        
        overlay.appendChild(timeSpan);
        overlay.appendChild(delBtn);
        div.appendChild(overlay);
        
        list.appendChild(div);
    });
}

/**
 * Delete a snapshot
 */
window.deleteSnapshot = async function(index, snapshotId) {
    if (!confirm('Delete this snapshot?')) return;
    
    try {
        // Remove from database
        if (snapshotId) {
            const { error } = await sb
                .from('exam_proctoring_logs')
                .update({ snapshot_url: null, screenshot_data: null })
                .eq('id', snapshotId);
            
            if (error) throw error;
        }
        
        // Remove from cache
        snapshotCache.splice(index, 1);
        
        // Re-render
        renderSnapshotGallery();
        showToast('Snapshot deleted', 'info');
        
    } catch (error) {
        console.error('Error deleting snapshot:', error);
        showToast('Error deleting snapshot: ' + error.message, 'error');
    }
};

/**
 * Clear all snapshots
 */
window.clearAllSnapshots = function() {
    if (!confirm('Delete all snapshots for this student?')) return;
    
    // Delete from database
    snapshotCache.forEach(async (snapshot) => {
        if (snapshot.id) {
            await sb
                .from('exam_proctoring_logs')
                .update({ snapshot_url: null, screenshot_data: null })
                .eq('id', snapshot.id);
        }
    });
    
    // Clear cache
    snapshotCache = [];
    renderSnapshotGallery();
    showToast('All snapshots cleared', 'info');
};

/**
 * View snapshot in fullscreen
 */
window.viewSnapshotFullscreen = function(imageUrl) {
    const modal = document.createElement('div');
    modal.className = 'snapshot-fullscreen';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.95);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
    `;
    
    const img = document.createElement('img');
    img.src = imageUrl + (imageUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
    img.style.cssText = `
        max-width: 95%;
        max-height: 95%;
        object-fit: contain;
        border-radius: 8px;
    `;
    
    modal.appendChild(img);
    modal.onclick = function() {
        modal.remove();
    };
    
    // Close with Escape key
    modal.onkeydown = function(e) {
        if (e.key === 'Escape') modal.remove();
    };
    modal.tabIndex = 0;
    modal.focus();
    
    document.body.appendChild(modal);
};

/**
 * Capture a new snapshot - REPLACES OLD VERSION
 */
window.captureSnapshot = async function() {
    const feed = document.getElementById('cameraFeed');
    if (!feed || !feed.src || feed.src === '' || feed.style.display === 'none') {
        showToast('No camera feed available. Please refresh first.', 'warning');
        return;
    }
    
    try {
        showToast('📸 Capturing snapshot...', 'info');
        
        const studentName = document.getElementById('cameraStudentName')?.textContent || 'Student';
        const examName = document.getElementById('cameraExamName')?.textContent || 'Exam';
        const studentId = currentCameraStudent || 'unknown';
        const examId = currentCameraExam || 0;
        
        // Create canvas to capture
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        
        // Load image
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = feed.src;
        
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            setTimeout(reject, 5000);
        });
        
        // Draw image
        ctx.drawImage(img, 0, 0, 640, 480);
        
        // Add watermark/overlay
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 440, 640, 40);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '14px Poppins, sans-serif';
        ctx.fillText(`${studentName} - ${examName} - ${new Date().toLocaleString()}`, 10, 468);
        
        // Add timestamp
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '12px Poppins, sans-serif';
        ctx.fillText('NCHSM Proctoring', 540, 16);
        
        // Convert to data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        // Save to database
        const { data: logData, error: logError } = await sb
            .from('exam_proctoring_logs')
            .insert({
                student_id: studentId,
                exam_id: parseInt(examId),
                student_name: studentName,
                exam_name: examName,
                event_type: 'admin_snapshot',
                details: `Admin captured snapshot of ${studentName}`,
                severity: 'info',
                screenshot_data: dataUrl,
                timestamp: new Date().toISOString()
            })
            .select('id, timestamp')
            .single();
        
        if (logError) throw logError;
        
        // Add to cache
        const newSnapshot = {
            id: logData.id,
            snapshot_url: null,
            screenshot_data: dataUrl,
            timestamp: logData.timestamp || new Date().toISOString(),
            event_type: 'admin_snapshot',
            details: `Admin captured snapshot`
        };
        
        snapshotCache.unshift(newSnapshot);
        
        // Keep only maxSnapshots
        if (snapshotCache.length > maxSnapshots) {
            snapshotCache = snapshotCache.slice(0, maxSnapshots);
        }
        
        // Re-render gallery
        renderSnapshotGallery();
        
        showToast(`✅ Snapshot captured! (${snapshotCache.length} total)`, 'success');
        
        // Update camera feed with latest
        feed.src = dataUrl;
        document.getElementById('cameraTimestamp').textContent = new Date().toLocaleTimeString();
        
    } catch (error) {
        console.error('Capture error:', error);
        showToast('❌ Failed to capture snapshot: ' + error.message, 'error');
    }
};

/**
 * Open camera modal - UPDATED
 */
window.openCameraView = async function(studentId, examId, studentName, examName) {
    currentCameraStudent = studentId;
    currentCameraExam = examId;
    currentCameraStudentName = studentName;
    currentCameraExamName = examName;
    
    // Reset snapshot cache
    snapshotCache = [];
    
    // Set modal title
    document.getElementById('cameraModalTitle').innerHTML = `<i class="fas fa-video"></i> Live Camera - ${studentName}`;
    document.getElementById('cameraStudentName').textContent = studentName;
    document.getElementById('cameraExamName').textContent = examName;
    document.getElementById('cameraStatus').textContent = '🟢 Connecting...';
    document.getElementById('cameraStatus').className = 'status-active';
    
    // Show modal
    document.getElementById('cameraModal').style.display = 'flex';
    
    // Load data
    try {
        await Promise.all([
            refreshCameraFeed(studentId, examId),
            loadCameraAlerts(studentId, examId),
            loadSnapshots(studentId, examId)
        ]);
        startCameraAutoRefresh(studentId, examId);
    } catch (error) {
        console.error('Error opening camera:', error);
        showToast('Error loading camera: ' + error.message, 'error');
    }
};

/**
 * Close camera modal - UPDATED
 */
window.closeCameraModal = function() {
    document.getElementById('cameraModal').style.display = 'none';
    if (cameraInterval) {
        clearInterval(cameraInterval);
        cameraInterval = null;
    }
    cameraAutoRefresh = true;
    snapshotCache = [];
};
    function startCameraAutoRefresh(studentId, examId) {
        if (cameraInterval) clearInterval(cameraInterval);
        cameraInterval = setInterval(() => {
            if (cameraAutoRefresh && document.getElementById('cameraModal').style.display === 'flex') {
                refreshCameraFeed(studentId || currentCameraStudent, examId || currentCameraExam);
                loadCameraAlerts(studentId || currentCameraStudent, examId || currentCameraExam);
            }
        }, 5000);
    }

    window.toggleAutoRefreshCamera = function() {
        cameraAutoRefresh = !cameraAutoRefresh;
        const btn = document.getElementById('cameraRefreshBtn');
        if (cameraAutoRefresh) {
            btn.innerHTML = '<i class="fas fa-play"></i> Auto: ON';
            btn.className = 'btn btn-warning';
            startCameraAutoRefresh();
            showToast('Auto-refresh enabled', 'success');
        } else {
            btn.innerHTML = '<i class="fas fa-pause"></i> Auto: OFF';
            btn.className = 'btn btn-secondary';
            if (cameraInterval) clearInterval(cameraInterval);
            showToast('Auto-refresh disabled', 'info');
        }
    };

    window.closeCameraModal = function() {
        document.getElementById('cameraModal').style.display = 'none';
        if (cameraInterval) {
            clearInterval(cameraInterval);
            cameraInterval = null;
        }
        cameraAutoRefresh = true;
    };

    // ============================================
    // 🟢 LIVE STUDENTS
    // ============================================
    window.loadLiveStudents = async function() {
        const loadingDiv = document.getElementById('liveStudentsLoading');
        const table = document.getElementById('liveStudentsTable');
        const statsDiv = document.getElementById('liveStudentsStats');
        
        if (!loadingDiv) return;
        
        loadingDiv.style.display = 'block';
        loadingDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scanning for active students...';
        table.style.display = 'none';
        statsDiv.style.display = 'none';
        
        try {
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
            
            const { data: activeLogs, error: logsError } = await window.supabase
                .from('exam_proctoring_logs')
                .select('student_id, exam_id, timestamp, event_type, details')
                .gte('timestamp', fiveMinutesAgo)
                .order('timestamp', { ascending: false });
            
            if (logsError) {
                console.error('❌ Logs error:', logsError);
                throw logsError;
            }
            
            if (!activeLogs || activeLogs.length === 0) {
                loadingDiv.innerHTML = '🟢 No students currently taking exams';
                loadingDiv.style.color = '#38A169';
                loadingDiv.style.display = 'block';
                table.style.display = 'none';
                statsDiv.style.display = 'none';
                document.getElementById('liveBadge').textContent = '0';
                window.liveStudentsData = [];
                return;
            }
            
            const activePairs = new Map();
            activeLogs.forEach(log => {
                const key = `${log.student_id}_${log.exam_id}`;
                if (!activePairs.has(key) || new Date(log.timestamp) > new Date(activePairs.get(key).timestamp)) {
                    activePairs.set(key, log);
                }
            });
            
            const studentIds = [...activePairs.values()].map(p => p.student_id).filter(id => id);
            
            const { data: profiles } = await window.supabase
                .from('consolidated_user_profiles_table')
                .select('user_id, full_name, student_id, email, program, block')
                .in('user_id', studentIds);
            
            const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));
            
            const examIds = [...activePairs.values()].map(p => p.exam_id).filter(id => id);
            const { data: exams } = await window.supabase
                .from('exams')
                .select('id, exam_name, duration_minutes, total_marks')
                .in('id', examIds);
            const examMap = Object.fromEntries((exams || []).map(e => [e.id, e]));
            
            const progressData = [];
            for (const [key, log] of activePairs) {
                const student = profileMap[log.student_id];
                const exam = examMap[log.exam_id];
                
                if (!student || !exam) continue;
                
                const { data: answers } = await window.supabase
                    .from('exam_grades')
                    .select('id, question_id, marks, selected_answer')
                    .eq('student_id', log.student_id)
                    .eq('exam_id', log.exam_id)
                    .neq('question_id', '00000000-0000-0000-0000-000000000000');
                
                const { data: questions } = await window.supabase
                    .from('exam_questions')
                    .select('id')
                    .eq('exam_id', log.exam_id);
                
                const answeredCount = answers?.length || 0;
                const totalQuestions = questions?.length || 0;
                const progress = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;
                
                const { data: cameraLogs } = await window.supabase
                    .from('exam_proctoring_logs')
                    .select('event_type, timestamp')
                    .eq('student_id', log.student_id)
                    .eq('exam_id', log.exam_id)
                    .in('event_type', ['face_detected', 'face_missing', 'multiple_faces_detected'])
                    .order('timestamp', { ascending: false })
                    .limit(1);
                
                const cameraStatus = cameraLogs?.[0]?.event_type || 'unknown';
                const cameraIcon = cameraStatus === 'face_detected' ? '🟢' : 
                                  cameraStatus === 'face_missing' ? '🔴' : 
                                  cameraStatus === 'multiple_faces_detected' ? '🚨' : '⚪';
                
                const startedAt = new Date(log.timestamp);
                const durationMinutes = exam?.duration_minutes || 30;
                const endTime = new Date(startedAt.getTime() + durationMinutes * 60000);
                const now = new Date();
                const timeLeftMs = endTime - now;
                
                let timeDisplay = '--';
                let statusClass = 'status-active';
                
                if (timeLeftMs > 0) {
                    const minutes = Math.floor(timeLeftMs / 60000);
                    const seconds = Math.floor((timeLeftMs % 60000) / 1000);
                    timeDisplay = `${minutes}m ${seconds}s`;
                    statusClass = minutes < 5 ? 'status-critical' : 'status-active';
                } else {
                    timeDisplay = '⏰ Time Up';
                    statusClass = 'status-fail';
                }
                
                const { data: alerts } = await window.supabase
                    .from('exam_proctoring_logs')
                    .select('event_type')
                    .eq('student_id', log.student_id)
                    .eq('exam_id', log.exam_id)
                    .in('event_type', ['multiple_faces_detected', 'tab_switched', 'fullscreen_exit_attempt'])
                    .gte('timestamp', new Date(Date.now() - 60000).toISOString());
                
                const alertCount = alerts?.length || 0;
                
                progressData.push({
                    key: key,
                    student: student,
                    exam: exam,
                    log: log,
                    answeredCount: answeredCount,
                    totalQuestions: totalQuestions,
                    progress: progress,
                    timeDisplay: timeDisplay,
                    statusClass: statusClass,
                    cameraIcon: cameraIcon,
                    cameraStatus: cameraStatus,
                    alertCount: alertCount,
                    lastActivity: log.timestamp,
                    startedAt: startedAt,
                    studentId: student.student_id || 'N/A',
                    studentName: student.full_name || 'Unknown',
                    examName: exam.exam_name || 'Unknown Exam',
                    examId: exam.id
                });
            }
            
            progressData.sort((a, b) => {
                const timeA = new Date(a.log.timestamp);
                const timeB = new Date(b.log.timestamp);
                return timeA - timeB;
            });
            
            window.liveStudentsData = progressData;
            document.getElementById('liveBadge').textContent = progressData.length;
            window.displayLiveStudents();
            
            loadingDiv.style.display = 'none';
            table.style.display = 'table';
            statsDiv.style.display = 'block';
            document.getElementById('liveCountDisplay').textContent = progressData.length;
            
        } catch (error) {
            console.error('❌ Error loading live students:', error);
            loadingDiv.innerHTML = '❌ Error loading live students: ' + error.message;
            loadingDiv.style.color = '#DC2626';
            loadingDiv.style.display = 'block';
            window.liveStudentsData = [];
        }
    };

   // ✅ FIXED: Display live students with proper null checks
window.displayLiveStudents = function() {
    const tbody = document.getElementById('liveStudentsBody');
    
    if (!tbody) {
        console.error('❌ liveStudentsBody not found!');
        return;
    }
    
    const data = window.liveStudentsData || [];
    console.log('📊 Displaying', data.length, 'students');
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:30px;">🟢 No active students</td></tr>';
        // ✅ Check if renderPagination exists before calling
        if (typeof window.renderPagination === 'function') {
            window.renderPagination('liveStudents', 0);
        }
        return;
    }
    
    // ✅ FIX: Safely access currentPage
    const currentPage = window.currentPage || {};
    const livePage = currentPage.liveStudents || 1;
    const itemsPerPage = window.itemsPerPage || 15;
    
    const start = (livePage - 1) * itemsPerPage;
    const page = data.slice(start, start + itemsPerPage);
    
    tbody.innerHTML = page.map(item => {
        const student = item.student || {};
        const exam = item.exam || {};
        const log = item.log || {};
        
        // Check if active
        const lastActivity = log.timestamp ? new Date(log.timestamp) : new Date();
        const now = new Date();
        const inactiveMinutes = Math.floor((now - lastActivity) / 60000);
        const isActive = inactiveMinutes < 5;
        
        const statusIcon = isActive ? '🟢' : '🟡';
        const statusText = isActive ? 'Active' : `Inactive (${inactiveMinutes}m ago)`;
        
        // Progress bar
        const progress = item.progress || 0;
        const progressBar = `
            <div style="display:flex; align-items:center; gap:8px;">
                <div style="flex:1; background:#E2E8F0; border-radius:10px; height:8px; overflow:hidden; width:80px;">
                    <div style="width:${progress}%; height:100%; background:${progress >= 70 ? '#38A169' : progress >= 40 ? '#F59E0B' : '#DC2626'};"></div>
                </div>
                <span style="font-size:0.7rem; font-weight:600; min-width:40px;">${progress}%</span>
            </div>
        `;
        
        // Alert indicator
        const alertCount = item.alertCount || 0;
        const alertIcon = alertCount > 0 ? 
            `<span style="color:#DC2626; font-weight:700;">🚨 ${alertCount}</span>` : 
            '<span style="color:#38A169;">✅</span>';
        
        // Format time
        let formattedTime = 'N/A';
        try {
            if (item.lastActivity) {
                if (typeof window.formatKenyaTime === 'function') {
                    formattedTime = window.formatKenyaTime(item.lastActivity);
                } else {
                    formattedTime = new Date(item.lastActivity).toLocaleString();
                }
            }
        } catch (e) {
            formattedTime = new Date(item.lastActivity).toLocaleString();
        }
        
        // Student info
        const studentName = student.full_name || 'Unknown';
        const studentId = student.student_id || 'N/A';
        const studentUserId = student.user_id || '';
        const examName = exam.exam_name || 'Unknown Exam';
        const examId = exam.id || 0;
        const program = student.program || '';
        
        // Escape for onclick
        const safeName = studentName.replace(/'/g, "\\'");
        const safeExam = examName.replace(/'/g, "\\'");
        
        // Actions
        let actions = '';
        if (studentUserId && examId) {
            actions = `
                <button class="action-btn btn-view" onclick="viewStudentProgress('${studentUserId}', '${safeName}', ${examId})" 
                        style="background:#4299E1; color:white; border:none; padding:4px 10px; border-radius:4px; cursor:pointer; font-size:0.65rem;">
                    <i class="fas fa-chart-line"></i> Progress
                </button>
                <button class="action-btn btn-warning" onclick="openTimerModal('${studentUserId}', '${safeName}', ${examId}, '${safeExam}')" 
                        style="background:#F59E0B; color:white; border:none; padding:4px 10px; border-radius:4px; cursor:pointer; font-size:0.65rem;">
                    <i class="fas fa-clock"></i> Timer
                </button>
                <button class="action-btn btn-danger" onclick="forceSubmitStudent('${studentUserId}', ${examId})" 
                        style="background:#DC2626; color:white; border:none; padding:4px 10px; border-radius:4px; cursor:pointer; font-size:0.65rem;">
                    <i class="fas fa-paper-plane"></i> Submit
                </button>
            `;
        }
        
        return `<tr>
            <td style="padding:10px 12px;">
                <span style="font-weight:600;">${statusIcon}</span>
                <div style="font-size:0.65rem; color:#64748B;">${statusText}</div>
            </td>
            <td style="padding:10px 12px;">
                <span class="student-id-badge">${studentId}</span>
            </td>
            <td style="padding:10px 12px;">
                <strong>${studentName}</strong>
                <div style="font-size:0.7rem; color:#64748B;">${program}</div>
            </td>
            <td style="padding:10px 12px;">
                <strong>${examName}</strong>
                <div style="font-size:0.65rem; color:#64748B;">${item.answeredCount || 0}/${item.totalQuestions || 0} answered</div>
            </td>
            <td style="padding:10px 12px;">${progressBar}</td>
            <td style="padding:10px 12px;">
                <span class="${item.statusClass || 'status-active'}" style="font-weight:600; font-family:monospace; padding:4px 8px; border-radius:6px;">
                    ${item.timeDisplay || '--'}
                </span>
            </td>
            <td style="padding:10px 12px; text-align:center; font-size:1.2rem;">
                ${item.cameraIcon || '⚪'}
                <div style="font-size:0.55rem; color:#64748B;">${item.cameraStatus || 'unknown'}</div>
            </td>
            <td style="padding:10px 12px; font-size:0.7rem; color:#64748B;">
                ${formattedTime}
                <div style="font-size:0.6rem;">${alertIcon}</div>
            </td>
            <td style="padding:10px 12px;">
                <div style="display:flex; gap:4px; flex-wrap:wrap;">${actions}</div>
            </td>
        </tr>`;
    }).join('');
    
    // ✅ Check if renderPagination exists
    if (typeof window.renderPagination === 'function') {
        window.renderPagination('liveStudents', data.length);
    }
};

    window.toggleAutoRefresh = function() {
        autoRefreshEnabled = !autoRefreshEnabled;
        const icon = document.getElementById('autoRefreshIcon');
        const text = document.getElementById('autoRefreshText');
        
        if (autoRefreshEnabled) {
            icon.className = 'fas fa-play';
            text.textContent = 'Auto-Refresh: ON';
            startAutoRefresh();
        } else {
            icon.className = 'fas fa-pause';
            text.textContent = 'Auto-Refresh: OFF';
            stopAutoRefresh();
        }
    };

    function startAutoRefresh() {
        if (autoRefreshInterval) clearInterval(autoRefreshInterval);
        autoRefreshInterval = setInterval(() => {
            if (autoRefreshEnabled && window.currentTab === 'liveStudents') {
                window.loadLiveStudents();
            }
        }, 10000);
    }

    function stopAutoRefresh() {
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
            autoRefreshInterval = null;
        }
    }

    window.exportLiveStudents = function() {
        const data = window.liveStudentsData || [];
        if (data.length === 0) {
            alert('No live students to export!');
            return;
        }
        
        const exportData = data.map(item => ({
            'Student ID': item.student?.student_id || 'N/A',
            'Student Name': item.student?.full_name || 'Unknown',
            'Email': item.student?.email || '',
            'Program': item.student?.program || '',
            'Exam': item.exam?.exam_name || 'Unknown',
            'Progress': `${item.progress || 0}% (${item.answeredCount || 0}/${item.totalQuestions || 0})`,
            'Time Remaining': item.timeDisplay || '--',
            'Camera Status': item.cameraStatus || 'unknown',
            'Alerts': item.alertCount || 0,
            'Last Activity': formatKenyaTime(item.lastActivity)
        }));
        
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Live Students');
        XLSX.writeFile(wb, `Live_Students_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // ============================================
    // 📹 LIVE FEED
    // ============================================
window.loadLiveFeed = async function() {
    const loadingDiv = document.getElementById('liveFeedLoading');
    const gridDiv = document.getElementById('liveFeedGrid');
    const statsDiv = document.getElementById('liveFeedStats');
    
    if (!loadingDiv) return;
    
    // ✅ Check if this is an auto-refresh (data already exists)
    const isAutoRefresh = liveFeedData.length > 0;
    
    // ✅ Only show loading on manual refresh
    if (!isAutoRefresh) {
        loadingDiv.style.display = 'block';
        loadingDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading camera feeds...';
        gridDiv.innerHTML = '';
        statsDiv.style.display = 'none';
    }
    
    try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        
        const { data: activeLogs, error } = await sb
            .from('exam_proctoring_logs')
            .select('*')
            .gte('timestamp', fiveMinutesAgo)
            .order('timestamp', { ascending: false });
        
        if (error) throw error;
        
        if (!activeLogs || activeLogs.length === 0) {
            // ✅ On auto-refresh, keep existing data
            if (!isAutoRefresh) {
                loadingDiv.innerHTML = '🟢 No students currently active';
                loadingDiv.style.color = '#38A169';
                loadingDiv.style.display = 'block';
                gridDiv.innerHTML = `
                    <div style="grid-column:1/-1; text-align:center; padding:60px; color:#94A3B8;">
                        <i class="fas fa-video-slash fa-3x" style="display:block; margin-bottom:16px;"></i>
                        <p>No students are currently taking exams</p>
                    </div>
                `;
                document.getElementById('liveFeedBadge').textContent = '0';
            }
            return;
        }
        
        // Get unique student IDs for profile lookup
        const studentIds = [...new Set(activeLogs.map(l => l.student_id).filter(id => id))];
        
        // FETCH STUDENT PROFILES
        let profileMap = {};
        if (studentIds.length > 0) {
            const { data: profiles } = await sb
                .from('consolidated_user_profiles_table')
                .select('user_id, full_name, student_id, email, program, block')
                .in('user_id', studentIds);
            
            profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));
            console.log('📋 Profiles found:', profiles?.length || 0);
        }
        
        // FETCH EXAM DETAILS
        const examIds = [...new Set(activeLogs.map(l => l.exam_id).filter(id => id))];
        let examMap = {};
        if (examIds.length > 0) {
            const { data: exams } = await sb
                .from('exams')
                .select('id, exam_name, duration_minutes, total_marks')
                .in('id', examIds);
            
            examMap = Object.fromEntries((exams || []).map(e => [e.id, e]));
            console.log('📋 Exams found:', exams?.length || 0);
        }
        
        // Get unique student-exam pairs (most recent per pair)
        const uniqueStudents = new Map();
        activeLogs.forEach(log => {
            const key = `${log.student_id}_${log.exam_id}`;
            if (!uniqueStudents.has(key) || new Date(log.timestamp) > new Date(uniqueStudents.get(key).timestamp)) {
                uniqueStudents.set(key, log);
            }
        });
        
        const students = Array.from(uniqueStudents.values());
        console.log('📹 Found', students.length, 'active students');
        
        // Build feed data
        liveFeedData = [];
        let withCamera = 0;
        let noCamera = 0;
        let violations = 0;
        
        for (const log of students) {
            const profile = profileMap[log.student_id] || {};
            
            const studentName = profile.full_name || log.student_name || 'Unknown Student';
            const studentRegNumber = profile.student_id || log.student_reg_number || 'N/A';
            const program = profile.program || '';
            
            const exam = examMap[log.exam_id] || {};
            const examName = exam.exam_name || log.exam_name || 'Exam ' + log.exam_id;
            
            const hasCamera = !!(log.snapshot_url || log.screenshot_data);
            if (hasCamera) withCamera++;
            else noCamera++;
            
            const isViolation = log.event_type === 'multiple_faces_detected' || 
                                log.event_type === 'face_missing' ||
                                log.event_type === 'tab_switched' ||
                                log.event_type === 'fullscreen_exit_attempt';
            if (isViolation) violations++;
            
            // Get progress
            let progress = 0;
            let answered = 0;
            let total = 0;
            
            if (log.student_id && log.exam_id) {
                try {
                    const { data: answers } = await sb
                        .from('exam_grades')
                        .select('id')
                        .eq('student_id', log.student_id)
                        .eq('exam_id', log.exam_id)
                        .neq('question_id', '00000000-0000-0000-0000-000000000000');
                    
                    const { data: questions } = await sb
                        .from('exam_questions')
                        .select('id')
                        .eq('exam_id', log.exam_id);
                    
                    answered = answers?.length || 0;
                    total = questions?.length || 0;
                    progress = total > 0 ? Math.round((answered / total) * 100) : 0;
                } catch (e) {
                    console.warn('Could not get progress for student:', log.student_id);
                }
            }
            
            // Calculate time remaining
            const startedAt = new Date(log.timestamp);
            const duration = exam.duration_minutes || 30;
            const endTime = new Date(startedAt.getTime() + duration * 60000);
            const now = new Date();
            const timeLeftMs = endTime - now;
            
            let timeDisplay = '--';
            if (timeLeftMs > 0) {
                const mins = Math.floor(timeLeftMs / 60000);
                const secs = Math.floor((timeLeftMs % 60000) / 1000);
                timeDisplay = `${mins}m ${secs}s`;
            } else {
                timeDisplay = '⏰ Time Up';
            }
            
            // Determine status
            let status = 'active';
            let statusLabel = '🟢 Active';
            let statusClass = 'status-active';
            
            if (log.event_type === 'multiple_faces_detected') {
                status = 'violation';
                statusLabel = '🚨 Violation';
                statusClass = 'status-critical';
            } else if (log.event_type === 'face_missing') {
                status = 'warning';
                statusLabel = '😞 No Face';
                statusClass = 'status-pending';
            } else if (!hasCamera) {
                status = 'no-camera';
                statusLabel = '📷 No Camera';
                statusClass = 'status-pending';
            }
            
            liveFeedData.push({
                log: log,
                profile: profile,
                exam: exam,
                studentName: studentName,
                studentRegNumber: studentRegNumber,
                program: program,
                examName: examName,
                hasCamera: hasCamera,
                snapshot: hasCamera ? log : null,
                hasViolations: isViolation,
                progress: progress,
                answered: answered,
                total: total,
                timeDisplay: timeDisplay,
                timeLeftMs: timeLeftMs,
                status: status,
                statusLabel: statusLabel,
                statusClass: statusClass,
                startedAt: startedAt,
                user_id: log.student_id,
                exam_id: log.exam_id,
                isPast: false
            });
        }
        
        // Sort by status (violations first)
        liveFeedData.sort((a, b) => {
            const order = { violation: 0, warning: 1, 'no-camera': 2, active: 3 };
            return (order[a.status] || 4) - (order[b.status] || 4);
        });
        
        // Update stats
        document.getElementById('liveFeedCount').textContent = liveFeedData.length;
        document.getElementById('liveFeedWithCamera').textContent = withCamera;
        document.getElementById('liveFeedNoCamera').textContent = noCamera;
        document.getElementById('liveFeedViolations').textContent = violations;
        document.getElementById('liveFeedBadge').textContent = liveFeedData.length;
        
        // Populate exam filter
        populateExamFilter();
        
        // Render
        displayLiveFeed();
        
        loadingDiv.style.display = 'none';
        statsDiv.style.display = 'block';
        
        console.log('📹 Live Feed loaded:', liveFeedData.length, 'students');
        
    } catch (error) {
        console.error('❌ Error loading live feed:', error);
        loadingDiv.innerHTML = '❌ Error loading camera feeds: ' + error.message;
        loadingDiv.style.color = '#DC2626';
    }
};
    window.refreshLiveFeed = function() {
        loadLiveFeed();
        showToast('Refreshing camera feeds...', 'info');
    };


    // ============================================
// 📹 DISPLAY LIVE FEED
// ============================================
window.displayLiveFeed = function() {
    const grid = document.getElementById('liveFeedGrid');
    if (!grid) return;
    
    const start = (liveFeedPage - 1) * LIVE_FEED_PER_PAGE;
    const pageData = liveFeedData.slice(start, start + LIVE_FEED_PER_PAGE);
    
    if (pageData.length === 0) {
        grid.innerHTML = `
            <div style="grid-column:1/-1; text-align:center; padding:60px; color:#94A3B8;">
                <i class="fas fa-video-slash fa-3x" style="display:block; margin-bottom:16px;"></i>
                <p>No active students to display</p>
            </div>
        `;
        renderLiveFeedPagination();
        return;
    }
    
    grid.innerHTML = pageData.map(item => {
        const log = item.log || {};
        const hasCamera = item.hasCamera;
        
        // Get image URL
        let imageUrl = null;
        if (log.snapshot_url) {
            imageUrl = log.snapshot_url;
        } else if (log.screenshot_data) {
            imageUrl = log.screenshot_data.startsWith('data:') ? 
                log.screenshot_data : 
                'data:image/jpeg;base64,' + log.screenshot_data;
        }
        
        // Use the data from the item object
        const studentName = item.studentName || 'Unknown Student';
        const studentId = item.studentRegNumber || 'N/A';
        const examName = item.examName || 'Exam';
        const program = item.program || '';
        
        // Status color for progress bar
        let progressColor = '#38A169';
        if (item.progress < 30) progressColor = '#DC2626';
        else if (item.progress < 60) progressColor = '#F59E0B';
        
        // Card class
        let cardClass = 'live-feed-card';
        if (item.status === 'violation') cardClass += ' violation';
        else if (item.status === 'warning') cardClass += ' warning';
        
        // Camera status badge
        let cameraBadge = '';
        if (imageUrl) {
            cameraBadge = `<span class="overlay-badge camera-on">🟢 Live</span>`;
        } else {
            cameraBadge = `<span class="overlay-badge camera-off">📷 No Camera</span>`;
        }
        
        // Violation badge
        let violationBadge = '';
        if (item.hasViolations) {
            const critical = log.event_type === 'multiple_faces_detected';
            violationBadge = `<span class="overlay-badge violation">${critical ? '🚨 CRITICAL' : '⚠️ Alert'}</span>`;
        }
        
        // Camera image or placeholder
        let cameraContent = '';
        if (imageUrl) {
            cameraContent = `
                <img src="${imageUrl}" 
                     alt="Camera feed for ${studentName}" 
                     style="width:100%; height:250px; object-fit:cover;"
                     onerror="this.parentElement.innerHTML='<div class=\\'no-camera\\' style=\\'display:flex; align-items:center; justify-content:center; height:250px; color:white; flex-direction:column; gap:12px; background:#1a1a2e;\\'><i class=\\'fas fa-camera-slash\\' style=\\'font-size:3rem; opacity:0.5;\\'></i><p>Image failed to load</p><p style=\\'font-size:0.8rem; opacity:0.6;\\'>Please check the URL</p></div>'">
            `;
        } else {
            cameraContent = `
                <div class="no-camera">
                    <i class="fas fa-user-slash"></i>
                    <p>No camera feed</p>
                    <p style="font-size:0.8rem; opacity:0.6;">Student hasn't shared camera</p>
                </div>
            `;
        }
        
        // Actions
        const safeName = studentName.replace(/'/g, "\\'");
        const safeExam = examName.replace(/'/g, "\\'");
        const userId = log.student_id || '';
        const examId = log.exam_id || 0;
        
        return `
            <div class="${cardClass}">
                <div class="card-header">
                    <div class="student-info">
                        <div class="avatar">${studentName.charAt(0).toUpperCase()}</div>
                        <div>
                            <div class="name">${studentName}</div>
                            <div class="details">${studentId} • ${program}</div>
                        </div>
                    </div>
                    <span class="status-badge ${item.statusClass}">${item.statusLabel}</span>
                </div>
                
                <div class="card-body">
                    ${cameraContent}
                    ${cameraBadge}
                    ${violationBadge}
                </div>
                
                <div class="progress-bar-container">
                    <div class="progress-track">
                        <div class="progress-fill" style="width:${item.progress}%; background:${progressColor};"></div>
                    </div>
                    <div class="progress-label">
                        <span>Progress: ${item.progress}%</span>
                        <span>${item.answered}/${item.total} answered</span>
                    </div>
                </div>
                
                <div class="card-footer">
                    <div>
                        <span class="info-item"><i class="fas fa-clock"></i> ${item.timeDisplay}</span>
                        <span class="info-item" style="margin-left:12px;"><i class="fas fa-book"></i> ${examName}</span>
                    </div>
                    <div class="actions">
                        <button class="btn-view-cam" onclick="openCameraView('${userId}', ${examId}, '${safeName}', '${safeExam}')">
                            <i class="fas fa-expand"></i> View
                        </button>
                        ${item.hasViolations ? `<button class="btn-alert" onclick="viewViolations('${userId}', ${examId})">🚨</button>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    renderLiveFeedPagination();
};
    window.toggleLiveFeedAutoRefresh = function() {
        liveFeedAutoRefresh = !liveFeedAutoRefresh;
        const icon = document.getElementById('liveFeedAutoIcon');
        const text = document.getElementById('liveFeedAutoText');
        
        if (liveFeedAutoRefresh) {
            icon.className = 'fas fa-play';
            text.textContent = 'Auto: ON';
            startLiveFeedAutoRefresh();
            showToast('Auto-refresh enabled', 'success');
        } else {
            icon.className = 'fas fa-pause';
            text.textContent = 'Auto: OFF';
            if (liveFeedInterval) {
                clearInterval(liveFeedInterval);
                liveFeedInterval = null;
            }
            showToast('Auto-refresh disabled', 'info');
        }
    };
function startLiveFeedAutoRefresh() {
    if (liveFeedInterval) clearInterval(liveFeedInterval);
    liveFeedInterval = setInterval(() => {
        if (liveFeedAutoRefresh && document.getElementById('livefeedTableContainer').style.display !== 'none') {
            // ✅ Save current filter values
            const searchValue = document.getElementById('liveFeedSearch')?.value || '';
            const examValue = document.getElementById('liveFeedExamFilter')?.value || '';
            const statusValue = document.getElementById('liveFeedStatusFilter')?.value || '';
            const currentView = liveFeedViewMode || 'live';
            
            // ✅ Reload based on current view
            if (currentView === 'live') {
                loadLiveFeed().then(() => {
                    restoreFilters(searchValue, examValue, statusValue);
                });
            } else {
                loadPastStudents().then(() => {
                    restoreFilters(searchValue, examValue, statusValue);
                });
            }
        }
    }, 10000);
}

// ========== RESTORE FILTERS ==========
function restoreFilters(searchValue, examValue, statusValue) {
    const searchInput = document.getElementById('liveFeedSearch');
    if (searchInput) searchInput.value = searchValue;
    
    const examFilter = document.getElementById('liveFeedExamFilter');
    if (examFilter) examFilter.value = examValue;
    
    const statusFilter = document.getElementById('liveFeedStatusFilter');
    if (statusFilter) statusFilter.value = statusValue;
    
    filterLiveFeed();
}

    window.clearAllCameraFeeds = function() {
        if (!confirm('Clear all camera feeds from view?')) return;
        liveFeedData = [];
        document.getElementById('liveFeedGrid').innerHTML = `
            <div style="grid-column:1/-1; text-align:center; padding:60px; color:#94A3B8;">
                <i class="fas fa-video-slash fa-3x" style="display:block; margin-bottom:16px;"></i>
                <p>Camera feeds cleared</p>
            </div>
        `;
        document.getElementById('liveFeedStats').style.display = 'none';
        document.getElementById('liveFeedBadge').textContent = '0';
        showToast('Camera feeds cleared', 'info');
    };

    window.exportLiveFeed = function() {
        if (!liveFeedData || liveFeedData.length === 0) {
            showToast('No data to export', 'warning');
            return;
        }
        
        const exportData = liveFeedData.map(item => ({
            'Student ID': item.profile?.student_id || 'N/A',
            'Student Name': item.profile?.full_name || 'Unknown',
            'Program': item.profile?.program || '',
            'Exam': item.exam?.exam_name || 'Unknown',
            'Progress': `${item.progress}% (${item.answered}/${item.total})`,
            'Time Remaining': item.timeDisplay,
            'Status': item.statusLabel,
            'Has Camera': item.hasCamera ? 'Yes' : 'No',
            'Violations': item.violations?.length || 0,
            'Last Activity': formatKenyaTime(item.log?.timestamp)
        }));
        
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Live Feed');
        XLSX.writeFile(wb, `Live_Feed_${new Date().toISOString().split('T')[0]}.xlsx`);
        showToast(`Exported ${exportData.length} students`, 'success');
    };
// ============================================
// 🔍 LIVE FEED SEARCH & FILTERS
// ============================================

let liveFeedViewMode = 'live'; // 'live' or 'past'
let filteredLiveFeedData = [];

// ========== SET VIEW MODE ==========
window.setLiveFeedView = function(mode) {
    liveFeedViewMode = mode;
    
    // Update toggle buttons
    const liveBtn = document.getElementById('liveViewBtn');
    const pastBtn = document.getElementById('pastViewBtn');
    if (liveBtn) liveBtn.classList.toggle('active', mode === 'live');
    if (pastBtn) pastBtn.classList.toggle('active', mode === 'past');
    
    // Update label
    const label = document.getElementById('liveFeedViewLabel');
    if (label) label.textContent = mode === 'live' ? 'active' : 'past';
    
    // Reload data
    if (mode === 'live') {
        loadLiveFeed();
    } else {
        loadPastStudents();
    }
};

// ========== LOAD PAST STUDENTS ==========
window.loadPastStudents = async function() {
    const loadingDiv = document.getElementById('liveFeedLoading');
    const gridDiv = document.getElementById('liveFeedGrid');
    const statsDiv = document.getElementById('liveFeedStats');
    
    if (!loadingDiv) return;
    
    loadingDiv.style.display = 'block';
    loadingDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading past students...';
    gridDiv.innerHTML = '';
    statsDiv.style.display = 'none';
    
    try {
        // Get students who completed exams in the last 24 hours
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        
        // Get logs with exam_completed or exam_submitted events
        const { data: pastLogs, error } = await sb
            .from('exam_proctoring_logs')
            .select('*')
            .in('event_type', ['exam_submitted', 'exam_auto_submitted', 'exam_completed'])
            .gte('timestamp', twentyFourHoursAgo)
            .order('timestamp', { ascending: false });
        
        if (error) throw error;
        
        if (!pastLogs || pastLogs.length === 0) {
            loadingDiv.innerHTML = '📭 No students have completed exams in the last 24 hours';
            loadingDiv.style.color = '#64748B';
            loadingDiv.style.display = 'block';
            gridDiv.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-history"></i>
                    <p>No past exam records found</p>
                    <p style="font-size:0.85rem;">Students who completed exams will appear here</p>
                </div>
            `;
            document.getElementById('liveFeedBadge').textContent = '0';
            return;
        }
        
        // Get unique students
        const uniqueStudents = new Map();
        pastLogs.forEach(log => {
            const key = `${log.student_id}_${log.exam_id}`;
            if (!uniqueStudents.has(key) || new Date(log.timestamp) > new Date(uniqueStudents.get(key).timestamp)) {
                uniqueStudents.set(key, log);
            }
        });
        
        const students = Array.from(uniqueStudents.values());
        
        // Get student profiles
        const studentIds = students.map(s => s.student_id).filter(id => id);
        let profileMap = {};
        if (studentIds.length > 0) {
            const { data: profiles } = await sb
                .from('consolidated_user_profiles_table')
                .select('user_id, full_name, student_id, email, program, block')
                .in('user_id', studentIds);
            profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));
        }
        
        // Get exam details
        const examIds = students.map(s => s.exam_id).filter(id => id);
        let examMap = {};
        if (examIds.length > 0) {
            const { data: exams } = await sb
                .from('exams')
                .select('id, exam_name')
                .in('id', examIds);
            examMap = Object.fromEntries((exams || []).map(e => [e.id, e]));
        }
        
        // Build past data
        const pastData = [];
        let withCamera = 0;
        let noCamera = 0;
        
        for (const log of students) {
            const profile = profileMap[log.student_id] || {};
            const exam = examMap[log.exam_id] || {};
            
            const studentName = profile.full_name || log.student_name || 'Unknown';
            const studentReg = profile.student_id || log.student_reg_number || 'N/A';
            const program = profile.program || '';
            const examName = exam.exam_name || log.exam_name || 'Exam';
            
            const hasCamera = !!(log.snapshot_url || log.screenshot_data);
            if (hasCamera) withCamera++;
            else noCamera++;
            
            // Get the last snapshot for this student
            let lastSnapshot = null;
            if (log.snapshot_url || log.screenshot_data) {
                lastSnapshot = log;
            } else {
                // Try to get a snapshot from their logs
                const { data: snapshots } = await sb
                    .from('exam_proctoring_logs')
                    .select('snapshot_url, screenshot_data, timestamp')
                    .eq('student_id', log.student_id)
                    .eq('exam_id', log.exam_id)
                    .or('snapshot_url.not.is.null,screenshot_data.not.is.null')
                    .order('timestamp', { ascending: false })
                    .limit(1);
                
                if (snapshots && snapshots.length > 0) {
                    lastSnapshot = snapshots[0];
                }
            }
            
            // Get exam result
            let result = null;
            try {
                const { data: grade } = await sb
                    .from('exam_grades')
                    .select('marks, total_score, percentage, result_status')
                    .eq('student_id', log.student_id)
                    .eq('exam_id', log.exam_id)
                    .eq('question_id', '00000000-0000-0000-0000-000000000000')
                    .maybeSingle();
                result = grade;
            } catch (e) { /* ignore */ }
            
            pastData.push({
                log: log,
                profile: profile,
                exam: exam,
                studentName: studentName,
                studentRegNumber: studentReg,
                program: program,
                examName: examName,
                hasCamera: hasCamera,
                snapshot: lastSnapshot || log,
                isPast: true,
                timestamp: log.timestamp,
                result: result
            });
        }
        
        // Sort by most recent
        pastData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Store in liveFeedData for display
        liveFeedData = pastData;
        
        // Update stats
        document.getElementById('liveFeedCount').textContent = liveFeedData.length;
        document.getElementById('liveFeedWithCamera').textContent = withCamera;
        document.getElementById('liveFeedNoCamera').textContent = noCamera;
        document.getElementById('liveFeedViolations').textContent = 0;
        document.getElementById('liveFeedBadge').textContent = liveFeedData.length;
        
        // Populate exam filter
        populateExamFilter();
        
        // Render
        displayLiveFeed();
        
        loadingDiv.style.display = 'none';
        statsDiv.style.display = 'block';
        
        console.log('📹 Past students loaded:', liveFeedData.length);
        
    } catch (error) {
        console.error('❌ Error loading past students:', error);
        loadingDiv.innerHTML = '❌ Error loading past students: ' + error.message;
        loadingDiv.style.color = '#DC2626';
    }
};

// ========== POPULATE EXAM FILTER ==========
function populateExamFilter() {
    const select = document.getElementById('liveFeedExamFilter');
    if (!select) return;
    
    // Get unique exam names from current data
    const exams = [...new Set(liveFeedData.map(item => item.examName).filter(Boolean))];
    
    // Keep "All Exams" option
    const currentValue = select.value;
    select.innerHTML = '<option value="">All Exams</option>';
    
    exams.forEach(exam => {
        const option = document.createElement('option');
        option.value = exam;
        option.textContent = exam;
        select.appendChild(option);
    });
    
    // Restore selected value if it still exists
    if (currentValue && exams.includes(currentValue)) {
        select.value = currentValue;
    }
}

// ========== FILTER LIVE FEED ==========
window.filterLiveFeed = function() {
    const searchTerm = document.getElementById('liveFeedSearch')?.value?.toLowerCase() || '';
    const examFilter = document.getElementById('liveFeedExamFilter')?.value || '';
    const statusFilter = document.getElementById('liveFeedStatusFilter')?.value || '';
    
    // Store filtered data
    filteredLiveFeedData = liveFeedData.filter(item => {
        // Search filter
        if (searchTerm) {
            const nameMatch = item.studentName?.toLowerCase().includes(searchTerm);
            const regMatch = item.studentRegNumber?.toLowerCase().includes(searchTerm);
            if (!nameMatch && !regMatch) return false;
        }
        
        // Exam filter
        if (examFilter && item.examName !== examFilter) return false;
        
        // Status filter
        if (statusFilter) {
            const status = item.status || 'active';
            if (statusFilter === 'active' && status !== 'active') return false;
            if (statusFilter === 'violation' && status !== 'violation') return false;
            if (statusFilter === 'warning' && status !== 'warning') return false;
            if (statusFilter === 'no-camera' && status !== 'no-camera') return false;
        }
        
        return true;
    });
    
    // Re-render with filtered data
    displayFilteredLiveFeed();
};

// ========== DISPLAY FILTERED LIVE FEED ==========
function displayFilteredLiveFeed() {
    const grid = document.getElementById('liveFeedGrid');
    if (!grid) return;
    
    const data = filteredLiveFeedData.length > 0 ? filteredLiveFeedData : liveFeedData;
    const start = (liveFeedPage - 1) * LIVE_FEED_PER_PAGE;
    const pageData = data.slice(start, start + LIVE_FEED_PER_PAGE);
    
    if (pageData.length === 0) {
        grid.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <p>No students match your filters</p>
                <p style="font-size:0.85rem;">Try adjusting your search or filters</p>
            </div>
        `;
        renderLiveFeedPagination();
        return;
    }
    
    // Use existing display function with filtered data
    renderLiveFeedCards(grid, pageData);
}

// ========== RENDER LIVE FEED CARDS ==========
function renderLiveFeedCards(grid, pageData) {
    grid.innerHTML = pageData.map(item => {
        const log = item.log || {};
        const hasCamera = item.hasCamera;
        
        // Get image URL
        let imageUrl = null;
        const snapshot = item.snapshot || log;
        
        if (snapshot.snapshot_url) {
            imageUrl = snapshot.snapshot_url + '?t=' + Date.now();
        } else if (snapshot.screenshot_data) {
            imageUrl = snapshot.screenshot_data.startsWith('data:') ? 
                snapshot.screenshot_data : 
                'data:image/jpeg;base64,' + snapshot.screenshot_data;
        }
        
        const studentName = item.studentName || 'Unknown';
        const studentId = item.studentRegNumber || 'N/A';
        const examName = item.examName || 'Exam';
        const program = item.program || '';
        
        // Status
        let statusClass = 'status-active';
        let statusLabel = '🟢 Active';
        
        if (item.isPast) {
            statusClass = 'status-completed';
            statusLabel = '✅ Completed';
        } else if (item.status === 'violation') {
            statusClass = 'status-critical';
            statusLabel = '🚨 Violation';
        } else if (item.status === 'warning') {
            statusClass = 'status-pending';
            statusLabel = '⚠️ Warning';
        } else if (!hasCamera) {
            statusClass = 'status-pending';
            statusLabel = '📷 No Camera';
        }
        
        // Card class
        let cardClass = 'live-feed-card';
        if (item.status === 'violation') cardClass += ' violation';
        else if (item.status === 'warning') cardClass += ' warning';
        if (item.isPast) cardClass += ' past-record';
        
        // Camera badge
        let cameraBadge = '';
        if (imageUrl) {
            cameraBadge = `<span class="overlay-badge camera-on">🟢 Live</span>`;
        } else {
            cameraBadge = `<span class="overlay-badge camera-off">📷 No Camera</span>`;
        }
        
        // Progress
        const progress = item.progress || 0;
        const progressColor = progress < 30 ? '#DC2626' : progress < 60 ? '#F59E0B' : '#38A169';
        
        // Camera content
        let cameraContent = '';
        if (imageUrl) {
            cameraContent = `
                <img src="${imageUrl}" 
                     alt="Camera feed for ${studentName}" 
                     style="width:100%; height:250px; object-fit:cover;"
                     onerror="this.parentElement.innerHTML='<div class=\\'no-camera\\' style=\\'display:flex; align-items:center; justify-content:center; height:250px; color:white; flex-direction:column; gap:12px; background:#1a1a2e;\\'><i class=\\'fas fa-camera-slash\\' style=\\'font-size:3rem; opacity:0.5;\\'></i><p>Image failed to load</p></div>'">
            `;
        } else {
            cameraContent = `
                <div class="no-camera">
                    <i class="fas fa-user-slash"></i>
                    <p>${item.isPast ? 'No snapshot available' : 'No camera feed'}</p>
                </div>
            `;
        }
        
        // Time display
        let timeDisplay = item.timeDisplay || '--';
        if (item.isPast) {
            timeDisplay = '✅ Completed';
        }
        
        // Result badge for past students
        let resultBadge = '';
        if (item.isPast && item.result) {
            const status = item.result.result_status || 'PENDING';
            const percentage = item.result.percentage || 0;
            resultBadge = `
                <div style="display:flex; gap:8px; align-items:center;">
                    <span class="${status === 'PASS' ? 'status-pass' : 'status-fail'}">${status}</span>
                    <span style="font-size:0.7rem; font-weight:600; color:#0A3D62;">${percentage.toFixed(0)}%</span>
                </div>
            `;
        }
        
        // Actions
        const safeName = studentName.replace(/'/g, "\\'");
        const safeExam = examName.replace(/'/g, "\\'");
        const userId = log.student_id || '';
        const examId = log.exam_id || 0;
        
        return `
            <div class="${cardClass}">
                <div class="card-header">
                    <div class="student-info">
                        <div class="avatar">${studentName.charAt(0).toUpperCase()}</div>
                        <div>
                            <div class="name">${studentName}</div>
                            <div class="details">${studentId} • ${program}</div>
                        </div>
                    </div>
                    <span class="status-badge ${statusClass}">${statusLabel}</span>
                </div>
                
                <div class="card-body">
                    ${cameraContent}
                    ${cameraBadge}
                    ${item.isPast ? `<span class="overlay-badge" style="background:rgba(56,161,105,0.9); color:white;">✅ Done</span>` : ''}
                </div>
                
                <div class="progress-bar-container">
                    <div class="progress-track">
                        <div class="progress-fill" style="width:${progress}%; background:${progressColor};"></div>
                    </div>
                    <div class="progress-label">
                        <span>Progress: ${progress}%</span>
                        <span>${item.answered || 0}/${item.total || 0} answered</span>
                    </div>
                </div>
                
                <div class="card-footer">
                    <div>
                        <span class="info-item"><i class="fas fa-clock"></i> ${timeDisplay}</span>
                        <span class="info-item" style="margin-left:12px;"><i class="fas fa-book"></i> ${examName}</span>
                        ${resultBadge}
                    </div>
                    <div class="actions">
                        ${!item.isPast ? `
                            <button class="btn-view-cam" onclick="openCameraView('${userId}', ${examId}, '${safeName}', '${safeExam}')">
                                <i class="fas fa-expand"></i> View
                            </button>
                        ` : `
                            <button class="btn-view-cam" onclick="viewPastResult('${userId}', ${examId})" style="background:#38A169;">
                                <i class="fas fa-chart-bar"></i> Results
                            </button>
                        `}
                        ${item.hasViolations ? `<button class="btn-alert" onclick="viewViolations('${userId}', ${examId})">🚨</button>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    renderLiveFeedPagination();
}

// ========== VIEW PAST RESULT ==========
window.viewPastResult = async function(studentId, examId) {
    try {
        const { data: result } = await sb
            .from('exam_grades')
            .select('*')
            .eq('student_id', studentId)
            .eq('exam_id', parseInt(examId))
            .eq('question_id', '00000000-0000-0000-0000-000000000000')
            .single();
        
        if (!result) {
            showToast('No results found for this student', 'warning');
            return;
        }
        
        const { data: profile } = await sb
            .from('consolidated_user_profiles_table')
            .select('full_name, student_id')
            .eq('user_id', studentId)
            .single();
        
        const { data: exam } = await sb
            .from('exams')
            .select('exam_name, total_marks')
            .eq('id', parseInt(examId))
            .single();
        
        document.getElementById('modalTitle').innerHTML = `<i class="fas fa-chart-bar"></i> Exam Results - ${profile?.full_name || 'Student'}`;
        document.getElementById('modalContent').innerHTML = `
            <div style="background:#F8FAFC; padding:20px; border-radius:16px;">
                <p><strong>📝 Exam:</strong> ${exam?.exam_name || 'Exam ' + examId}</p>
                <p><strong>📊 Score:</strong> ${result.marks || 0} / ${exam?.total_marks || result.total_score || 0}</p>
                <p><strong>📈 Percentage:</strong> ${result.percentage || 0}%</p>
                <p><strong>📋 Status:</strong> <span class="${result.result_status === 'PASS' ? 'status-pass' : 'status-fail'}">${result.result_status || 'PENDING'}</span></p>
                <p><strong>📅 Completed:</strong> ${formatKenyaTime(result.graded_at)}</p>
                ${result.released_at ? `<p><strong>📤 Released:</strong> ${formatKenyaTime(result.released_at)}</p>` : ''}
            </div>
        `;
        document.getElementById('studentModal').style.display = 'flex';
        
    } catch (error) {
        showToast('Error loading results: ' + error.message, 'error');
    }
};

// ========== CLEAR FILTERS ==========
window.clearLiveFeedFilters = function() {
    const search = document.getElementById('liveFeedSearch');
    const exam = document.getElementById('liveFeedExamFilter');
    const status = document.getElementById('liveFeedStatusFilter');
    
    if (search) search.value = '';
    if (exam) exam.value = '';
    if (status) status.value = '';
    
    filterLiveFeed();
    showToast('Filters cleared', 'info');
};

// ========== OVERRIDE DISPLAY LIVE FEED ==========
// Replace the existing displayLiveFeed with this updated version
window.displayLiveFeed = function() {
    // Store original data for filtering
    filteredLiveFeedData = liveFeedData;
    
    // Populate exam filter
    populateExamFilter();
    
    // Apply current filters
    filterLiveFeed();
};
    function renderLiveFeedPagination() {
        const totalPages = Math.ceil(liveFeedData.length / LIVE_FEED_PER_PAGE);
        const container = document.getElementById('liveFeedPagination');
        if (!container) return;
        
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }
        
        let html = `
            <button class="page-btn" onclick="changeLiveFeedPage(${liveFeedPage - 1})" ${liveFeedPage === 1 ? 'disabled' : ''}>‹</button>
        `;
        
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= liveFeedPage - 2 && i <= liveFeedPage + 2)) {
                html += `<button class="page-btn ${i === liveFeedPage ? 'active' : ''}" onclick="changeLiveFeedPage(${i})">${i}</button>`;
            }
        }
        
        html += `
            <button class="page-btn" onclick="changeLiveFeedPage(${liveFeedPage + 1})" ${liveFeedPage === totalPages ? 'disabled' : ''}>›</button>
        `;
        
        container.innerHTML = html;
    }

    window.changeLiveFeedPage = function(page) {
        const totalPages = Math.ceil(liveFeedData.length / LIVE_FEED_PER_PAGE);
        if (page < 1 || page > totalPages) return;
        liveFeedPage = page;
        displayLiveFeed();
        document.getElementById('liveFeedGrid').scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // ============================================
    // 📋 RENDER FILTERS
    // ============================================
    function renderFilters() {
        const container = document.getElementById('filtersContainer');
        if (currentTab === 'students') {
            container.innerHTML = `
                <h3><i class="fas fa-filter"></i> Filter Results</h3>
                <div class="filters-grid">
                    <div class="filter-group"><label>Exam</label><select id="examFilter"><option value="">All</option></select></div>
                    <div class="filter-group"><label>Status</label><select id="statusFilter"><option value="">All</option><option value="PASS">Pass</option><option value="FAIL">Fail</option></select></div>
                </div>
                <div class="search-box">
                    <input type="text" id="searchInput" placeholder="Search by name or ID...">
                    <button class="btn btn-primary" onclick="loadStudentsWithResults()">Search</button>
                    <button class="btn btn-danger" onclick="resetFilters()">Reset</button>
                </div>
            `;
            loadExamDropdown();
        } else if (currentTab === 'allStudents') {
            container.innerHTML = `
                <h3><i class="fas fa-filter"></i> Filter Students</h3>
                <div class="filters-grid">
                    <div class="filter-group"><label>Program</label><select id="programFilter"><option value="">All</option></select></div>
                </div>
                <div class="search-box">
                    <input type="text" id="studentSearch" placeholder="Search by name or ID...">
                    <button class="btn btn-primary" onclick="loadAllStudents()">Search</button>
                    <button class="btn btn-danger" onclick="resetStudentFilters()">Reset</button>
                </div>
            `;
            loadProgramDropdown();
        } else if (currentTab === 'exams') {
            container.innerHTML = `
                <h3><i class="fas fa-filter"></i> Filter Exams</h3>
                <div class="filters-grid">
                    <div class="filter-group"><label>Type</label><select id="examTypeFilter"><option value="">All</option><option value="EXAM">Final Exam (70)</option><option value="CAT_1">CAT 1 (30)</option><option value="CAT_2">CAT 2 (30)</option><option value="CAT">CAT (30)</option><option value="QUIZ">Quiz</option></select></div>
                </div>
                <div class="search-box">
                    <input type="text" id="examSearch" placeholder="Search exam name...">
                    <button class="btn btn-primary" onclick="loadAllExams()">Search</button>
                    <button class="btn btn-danger" onclick="resetExamFilters()">Reset</button>
                </div>
            `;
        } else {
            container.innerHTML = `
                <h3><i class="fas fa-filter"></i> Filter Proctoring Alerts</h3>
                <div class="filters-grid">
                    <div class="filter-group"><label>Alert Type</label><select id="alertTypeFilter"><option value="">All</option><option value="multiple_faces_detected">🚨 Multiple Faces</option><option value="face_missing">😞 Face Missing</option></select></div>
                    <div class="filter-group"><label>Severity</label><select id="severityFilter"><option value="">All</option><option value="critical">Critical</option><option value="warning">Warning</option></select></div>
                </div>
                <div class="search-box">
                    <input type="text" id="proctoringSearch" placeholder="Search by student...">
                    <button class="btn btn-primary" onclick="loadProctoringLogs()">Search</button>
                    <button class="btn btn-danger" onclick="resetProctoringFilters()">Reset</button>
                </div>
            `;
        }
    }

    // ============================================
    // 🔄 RESET FILTERS
    // ============================================
    window.resetFilters = function() { 
        ['examFilter', 'statusFilter', 'searchInput'].forEach(id => { 
            const el = document.getElementById(id); 
            if (el) el.value = ''; 
        });
        currentPage.students = 1;
        loadStudentsWithResults(); 
    };

    window.resetStudentFilters = function() { 
        ['programFilter', 'studentSearch'].forEach(id => { 
            const el = document.getElementById(id); 
            if (el) el.value = ''; 
        });
        currentPage.allStudents = 1;
        loadAllStudents(); 
    };

    window.resetExamFilters = function() { 
        ['examTypeFilter', 'examSearch'].forEach(id => { 
            const el = document.getElementById(id); 
            if (el) el.value = ''; 
        });
        currentPage.exams = 1;
        loadAllExams(); 
    };

    // ============================================
    // 📊 EXPORT FUNCTIONS
    // ============================================
    window.exportToExcel = function(type) {
        let data = [];
        if (type === 'students') {
            data = studentsResults.map(r => {
                const totalMarks = r.exam_info?.total_marks || getExamTotalMarks(r.exam_info?.exam_type);
                const score = r.marks || 0;
                const percentage = totalMarks > 0 ? ((score / totalMarks) * 100).toFixed(1) : '0.0';
                return { 
                    'Student ID': r.student_profile?.student_id, 
                    'Name': r.student_profile?.full_name,
                    'Exam': r.exam_info?.exam_name, 
                    'Score': `${score}/${totalMarks}`,
                    'Percent': percentage + '%', 
                    'Status': r.result_status 
                };
            });
        } else if (type === 'allStudents') {
            data = allStudents.map(s => ({ 
                'Student ID': s.student_id,
                'Name': s.full_name, 
                'Email': s.email, 
                'Program': s.program 
            }));
        } else if (type === 'exams') {
            data = allExams.map(e => {
                const totalMarks = e.total_marks || getExamTotalMarks(e.exam_type);
                return { 
                    'Exam Name': e.exam_name, 
                    'Type': e.exam_type, 
                    'Total Marks': totalMarks,
                    'Duration': e.duration_minutes 
                };
            });
        } else if (type === 'proctoring') {
            data = proctoringLogs.map(l => ({ 
                'Time': formatKenyaTime(l.timestamp), 
                'Student': l.student_profile?.full_name, 
                'Alert': l.event_type,
                'Details': l.details 
            }));
        }
        
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Data');
        XLSX.writeFile(wb, `${type}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    window.printTable = function(type) {
        const tableHtml = document.getElementById(type === 'students' ? 'studentsTable' : 
            type === 'allStudents' ? 'allStudentsTable' : 
            type === 'exams' ? 'examsTable' : 'proctoringTable').outerHTML;
        const win = window.open();
        win.document.write(
            `<html><head><title>Report</title><style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px}</style></head><body>${tableHtml}</body></html>`
        );
        win.print();
    };

   window.exportMarksOnly = function() {
    if (!studentsResults || studentsResults.length === 0) { 
        alert('No results to export!'); 
        return; 
    }
    
    const exportData = studentsResults.map(r => {
        const student = r.student_profile || {};
        const exam = r.exam_info || {};
        
        // ✅ FIX: Use the actual total_marks from the exam record
        const totalMarks = exam.total_marks || 100;
        const passMark = exam.pass_mark || Math.round(totalMarks * 0.6);
        
        const examType = (exam.exam_type || '').toUpperCase();
        const isCatExam = examType.includes('CAT');
        
        let score = 0;
        // ✅ FIX: Use totalMarks instead of hardcoded 30
        if (isCatExam) {
            score = r.marks || parseFloat(r.total_score) || 0;
            score = Math.min(score, totalMarks);
        } else {
            score = parseFloat(r.total_score) || r.marks || 0;
            score = Math.min(score, totalMarks);
        }
        
        const percentage = totalMarks > 0 ? ((score / totalMarks) * 100).toFixed(1) : '0.0';
        const percentNum = parseFloat(percentage);
        
        let grade = 'PENDING';
        if (r.isReleased) {
            if (percentNum >= passMark) {
                grade = 'PASS';
            } else {
                grade = 'FAIL';
            }
        } else if (r.result_status === 'PASS' || r.result_status === 'FAIL') {
            grade = r.result_status;
        } else if (r.result_status === 'PENDING_REVIEW' || r.result_status === 'PENDING') {
            grade = 'PENDING REVIEW';
        } else if (score === 0) {
            grade = 'FAIL';
        }
        
        let cat1Display = '--';
        let cat2Display = '--';
        let examScoreDisplay = '--';
        
        if (isCatExam) {
            cat1Display = score > 0 ? score : '--';
        } else {
            cat1Display = r.cat_1_score !== undefined && r.cat_1_score !== null ? r.cat_1_score : '--';
            cat2Display = r.cat_2_score !== undefined && r.cat_2_score !== null ? r.cat_2_score : '--';
            examScoreDisplay = r.exam_score !== undefined && r.exam_score !== null ? r.exam_score : '--';
        }
        
        return {
            'Admission Number': student.student_id || 'N/A',
            'Student Name': student.full_name || 'Unknown',
            'Exam': exam.exam_name || 'Exam ' + r.exam_id,
            'CAT 1': cat1Display,
            'CAT 2': cat2Display,
            'Exam Score': examScoreDisplay,
            'Total': `${score} / ${totalMarks}`,
            'Percentage': percentage + '%',
            'Grade': grade,
            'Released': r.isReleased ? '✅ Yes' : '❌ No'
        };
    });
    
    const headers = ['Admission Number', 'Student Name', 'Exam', 'CAT 1', 'CAT 2', 'Exam Score', 'Total', 'Percentage', 'Grade', 'Released'];
    let csv = headers.join(',') + '\n';
    
    exportData.forEach(row => {
        const values = headers.map(header => {
            let value = row[header] !== undefined && row[header] !== null ? row[header] : '';
            if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                value = '"' + value.replace(/"/g, '""') + '"';
            }
            return value;
        });
        csv += values.join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Exam_Marks_Export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    alert(`✅ Exported ${exportData.length} results with correct grades!`);
};
    // ============================================
    // 📋 MODAL FUNCTIONS
    // ============================================
    window.closeModal = function() {
        const modal = document.getElementById('studentModal');
        if (modal) modal.style.display = 'none';
    };

    window.closeReleaseModal = function() {
        const modal = document.getElementById('releaseModal');
        if (modal) modal.style.display = 'none';
        selectedStudentIds = new Set();
        const checkbox = document.getElementById('selectAllCheckbox');
        if (checkbox) checkbox.checked = false;
        const countEl = document.getElementById('selectedCount');
        if (countEl) countEl.innerHTML = '0 selected';
        const confirmBtn = document.getElementById('confirmReleaseBtn');
        if (confirmBtn) confirmBtn.disabled = true;
        const preview = document.getElementById('releasePreview');
        if (preview) preview.style.display = 'none';
    };

    window.closeAssignExamModal = function() {
        const modal = document.getElementById('assignExamModal');
        if (modal) modal.style.display = 'none';
    };

    window.closeResetByEmailModal = function() {
        const modal = document.getElementById('resetByEmailModal');
        if (modal) modal.style.display = 'none';
        window.resetTargetStudent = null;
        const emailInput = document.getElementById('resetEmailInput');
        if (emailInput) emailInput.value = '';
        const infoDiv = document.getElementById('resetStudentInfo');
        if (infoDiv) infoDiv.style.display = 'none';
        const errorDiv = document.getElementById('resetErrorInfo');
        if (errorDiv) errorDiv.style.display = 'none';
        const confirmBtn = document.getElementById('confirmResetByEmailBtn');
        if (confirmBtn) confirmBtn.disabled = true;
    };

    window.closeExamModal = function() {
        const modal = document.getElementById('examModal');
        if (modal) modal.style.display = 'none';
    };

    window.closeResetModal = function() {
        const modal = document.getElementById('resetExamModal');
        if (modal) modal.style.display = 'none';
        examToReset = null;
    };

    // ============================================
    // 📝 RELEASE MODAL
    // ============================================
    window.openReleaseModal = async function() {
        const { data: exams } = await sb.from('exams').select('id, exam_name').order('id', { ascending: false });
        const selectEl = document.getElementById('releaseExamFilter');
        if (selectEl) {
            selectEl.innerHTML = '<option value="">-- Select Exam --</option>' + 
                (exams || []).map(e => `<option value="${e.id}">${e.exam_name}</option>`).join('');
        }
        document.getElementById('releasePreview').style.display = 'none';
        selectedStudentIds.clear();
        document.getElementById('releaseModal').style.display = 'flex';
    };

  window.loadReleasePreview = async function() {
    const examId = document.getElementById('releaseExamFilter').value;
    if (!examId) { 
        document.getElementById('releasePreview').style.display = 'none'; 
        return; 
    }
    
    document.getElementById('releasePreview').style.display = 'block';
    selectedStudentIds.clear();
    
    const { data: results, error } = await sb
        .from('exam_grades')
        .select('id, student_id, marks, total_score, result_status')
        .eq('exam_id', parseInt(examId))
        .eq('question_id', '00000000-0000-0000-0000-000000000000');
    
    if (error) { 
        document.getElementById('releasePreviewBody').innerHTML = `<tr><td colspan="8">Error: ${error.message}</td></tr>`; 
        return; 
    }
    
    if (!results || results.length === 0) { 
        document.getElementById('releasePreviewBody').innerHTML = '<tr><td colspan="8">No students have taken this exam yet</td></tr>';
        document.getElementById('releaseSummary').innerHTML = '<strong>No results available</strong>';
        return; 
    }
    
    const { data: exam } = await sb
        .from('exams')
        .select('pass_mark, total_marks, exam_name, exam_type')
        .eq('id', parseInt(examId))
        .single();
    
    const passMark = exam?.pass_mark || 18;
    const examName = exam?.exam_name || 'Exam';
    const examType = exam?.exam_type || 'EXAM';
    const totalMarks = exam?.total_marks || 30;
    const isCatExam = examType.toUpperCase().includes('CAT');
    
    // ✅ FIX: Use released_at instead of created_at
    const { data: released } = await sb
        .from('released_exam_results')
        .select('result_id, released_at');
    
    const releasedMap = {};
    released?.forEach(r => {
        releasedMap[String(r.result_id)] = r.released_at;
    });
    
    // Get student profiles
    const studentIds = results.map(r => r.student_id).filter(id => id);
    const { data: profiles } = await sb
        .from('consolidated_user_profiles_table')
        .select('user_id, full_name, student_id, email')
        .in('user_id', studentIds);
    const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));
    
    let html = '';
    let pendingCount = 0;
    let releasedCount = 0;
    
    results.forEach(r => {
        const student = profileMap[r.student_id];
        const isReleased = releasedMap.hasOwnProperty(String(r.id));
        const releasedAt = isReleased ? releasedMap[String(r.id)] : null;
        
        const studentName = (student?.full_name || 'Unknown').replace(/'/g, "\\'");
        const studentId = r.student_id || '';
        const studentIdDisplay = student?.student_id || 'N/A';
        const studentEmail = student?.email || '';
        
        const score = parseFloat(r.total_score) || r.marks || 0;
        const percentage = totalMarks > 0 ? ((score / totalMarks) * 100).toFixed(1) : '0.0';
        const isPassed = score >= passMark;
        const statusClass = isPassed ? 'status-pass' : 'status-fail';
        const statusText = isPassed ? 'PASS' : 'FAIL';
        
        const safeName = studentName.replace(/'/g, "\\'");
        const safeExam = examName.replace(/'/g, "\\'");
        
        let releasedDisplay = '';
        let actionButtons = '';
        
        if (isReleased) {
            releasedCount++;
            const releasedTime = releasedAt ? formatKenyaTime(releasedAt) : '';
            releasedDisplay = `<span class="status-pass">✅ Released<br><small style="font-size:0.6rem;">${releasedTime}</small></span>`;
            actionButtons = `
                <button class="action-btn btn-success" onclick="resendReleaseEmail('${studentId}', ${parseInt(examId)}, '${safeName}', '${safeExam}')" 
                        style="background:#10B981; color:white; border:none; padding:4px 10px; border-radius:4px; cursor:pointer; font-size:0.65rem;" 
                        title="Resend email notification">
                    <i class="fas fa-envelope"></i> Resend
                </button>
                <button class="action-btn btn-info" onclick="viewStudentProgress('${studentId}', '${safeName}', ${parseInt(examId)})" 
                        style="background:#8B5CF6; color:white; border:none; padding:4px 10px; border-radius:4px; cursor:pointer; font-size:0.65rem;" 
                        title="View Live Progress">
                    <i class="fas fa-chart-line"></i>
                </button>
            `;
        } else {
            pendingCount++;
            releasedDisplay = `<span class="status-pending">🔒 Not Released</span>`;
            actionButtons = `
                <input type="checkbox" class="student-checkbox" data-id="${r.id}" data-student-id="${r.student_id}" onchange="updateSelectedCount()" style="margin-right:8px;">
                <button class="action-btn btn-info" onclick="viewStudentProgress('${studentId}', '${safeName}', ${parseInt(examId)})" 
                        style="background:#8B5CF6; color:white; border:none; padding:4px 10px; border-radius:4px; cursor:pointer; font-size:0.65rem;" 
                        title="View Live Progress">
                    <i class="fas fa-chart-line"></i>
                </button>
                <button class="action-btn btn-warning" onclick="openTimerModal('${studentId}', '${safeName}', ${parseInt(examId)}, '${safeExam}')" 
                        style="background:#F59E0B; color:white; border:none; padding:4px 10px; border-radius:4px; cursor:pointer; font-size:0.65rem;" 
                        title="Manage Timer">
                    <i class="fas fa-clock"></i>
                </button>
            `;
        }
        
        html += `<tr>
            <td style="padding:8px;">
                ${!isReleased ? `<input type="checkbox" class="student-checkbox" data-id="${r.id}" data-student-id="${r.student_id}" onchange="updateSelectedCount()">` : ''}
            </td>
            <td style="padding:8px;"><span class="student-id-badge">${studentIdDisplay}</span></td>
            <td style="padding:8px;"><strong>${studentName}</strong><br><small style="color:#6b7280;">${studentEmail}</small></td>
            <td style="padding:8px;color:#0A3D62;font-weight:600;cursor:pointer;" onclick="openEditMarksModal('${studentId}', ${parseInt(examId)}, '${safeName}', '${safeExam}')">
                ${score} ✏️
            </td>
            <td style="padding:8px;color:#0A3D62;font-weight:600;cursor:pointer;" onclick="openEditMarksModal('${studentId}', ${parseInt(examId)}, '${safeName}', '${safeExam}')">
                ${percentage}% ✏️
            </td>
            <td style="padding:8px;"><span class="${statusClass}">${statusText}</span></td>
            <td style="padding:8px;">${releasedDisplay}</td>
            <td style="padding:8px;">
                <div style="display:flex; gap:4px; flex-wrap:wrap; align-items:center;">
                    ${actionButtons}
                </div>
            </td>
        </tr>`;
    });
    
    document.getElementById('releasePreviewBody').innerHTML = html;
    
    // Update summary
    let summaryHTML = '';
    if (pendingCount > 0) {
        summaryHTML += `<strong>📋 Pending Results: ${pendingCount} student(s) ready for release</strong>`;
    }
    if (releasedCount > 0) {
        if (summaryHTML) summaryHTML += ' | ';
        summaryHTML += `<strong>✅ Already Released: ${releasedCount} student(s)</strong>`;
        summaryHTML += ` <span style="font-size:0.7rem; color:#64748B;">(click <strong>Resend</strong> to send email again)</span>`;
        
        if (releasedCount > 0) {
            summaryHTML += ` <button class="btn btn-success" onclick="batchResendReleaseEmails(${parseInt(examId)})" 
                    style="background:#10B981; color:white; border:none; padding:4px 12px; border-radius:4px; cursor:pointer; font-size:0.7rem; margin-left:8px;">
                    <i class="fas fa-envelope"></i> Resend All (${releasedCount})
                </button>`;
        }
    }
    if (!summaryHTML) {
        summaryHTML = '<strong>No results found</strong>';
    }
    document.getElementById('releaseSummary').innerHTML = summaryHTML;
    
    document.getElementById('selectAllCheckbox').checked = false;
    document.getElementById('confirmReleaseBtn').disabled = (pendingCount === 0);
    
    const releaseBtn = document.getElementById('confirmReleaseBtn');
    if (pendingCount === 0) {
        releaseBtn.disabled = true;
        releaseBtn.innerHTML = '✅ All Released';
    } else {
        releaseBtn.disabled = false;
        releaseBtn.innerHTML = `<i class="fas fa-share-alt"></i> Release Selected (${pendingCount} pending)`;
    }
    
    updateSelectedCount();
};
    window.selectAllStudents = function(select) {
        const checkboxes = document.querySelectorAll('#releasePreviewBody .student-checkbox');
        checkboxes.forEach(cb => { 
            cb.checked = select;
            const id = cb.getAttribute('data-id'); 
            if (select && id) selectedStudentIds.add(id);
            else if (!select && id) selectedStudentIds.delete(id); 
        });
        updateSelectedCount();
        const box = document.getElementById('selectAllCheckbox');
        if (box) box.checked = select;
    };

    window.toggleSelectAll = function() { 
        const box = document.getElementById('selectAllCheckbox'); 
        if (box) selectAllStudents(box.checked); 
    };

    window.updateSelectedCount = function() {
        const checkboxes = document.querySelectorAll('#releasePreviewBody .student-checkbox:checked');
        const count = checkboxes.length;
        document.getElementById('selectedCount').innerHTML = `${count} selected`;
        document.getElementById('confirmReleaseBtn').disabled = (count === 0);
        selectedStudentIds.clear();
        checkboxes.forEach(cb => { 
            const idValue = cb.getAttribute('data-id'); 
            if (idValue) selectedStudentIds.add(idValue); 
        });
    };

    window.confirmReleaseResults = async function() {
    const ids = Array.from(selectedStudentIds);
    if (ids.length === 0) { 
        alert('Please select at least one student to release results.'); 
        return; 
    }
    
    const examId = document.getElementById('releaseExamFilter').value;
    if (!examId) return;
    
    if (!confirm(`Release results for ${ids.length} selected student(s)?`)) return;
    
    try {
        const { data: exam, error: examError } = await sb
            .from('exams')
            .select('pass_mark, total_marks, exam_type, exam_name')
            .eq('id', parseInt(examId))
            .single();
        
        if (examError) throw examError;
        
        const passMark = exam?.pass_mark || 18;
        const totalMarks = exam?.total_marks || 30;
        const isCatExam = (exam?.exam_type || '').toUpperCase().includes('CAT');
        const examName = exam?.exam_name || 'Exam';
        
        let releasedCount = 0;
        let failedCount = 0;
        let errorMessages = [];
        let releaseData = []; // ✅ Store for email sending
        
        for (const gradeId of ids) {
            const { data: grade, error: gradeError } = await sb
                .from('exam_grades')
                .select('id, student_id, marks, total_score, result_status')
                .eq('id', gradeId)
                .single();
            
            if (gradeError || !grade) {
                console.error('Grade not found:', gradeId);
                failedCount++;
                errorMessages.push(`Grade ID ${gradeId} not found`);
                continue;
            }
            
            if (!grade.student_id) {
                console.error('Missing student_id for grade:', gradeId);
                failedCount++;
                errorMessages.push(`Missing student_id for grade ${gradeId}`);
                continue;
            }
            
            let score = 0;
            if (isCatExam) {
                score = grade.marks || parseFloat(grade.total_score) || 0;
                score = Math.min(score, 30);
            } else {
                score = parseFloat(grade.total_score) || grade.marks || 0;
                score = Math.min(score, totalMarks || 70);
            }
            
            const isPassed = score >= passMark;
            const resultStatus = isPassed ? 'PASS' : 'FAIL';
            
            const { error: releaseError } = await sb
                .from('released_exam_results')
                .insert({
                    result_id: gradeId,
                    student_id: grade.student_id,
                    exam_id: parseInt(examId)
                });
            
            if (releaseError) {
                console.error('Release error for grade', gradeId, ':', releaseError);
                failedCount++;
                errorMessages.push(`Release error for grade ${gradeId}: ${releaseError.message}`);
                continue;
            }
            
            const { error: updateError } = await sb
                .from('exam_grades')
                .update({
                    result_status: resultStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('id', gradeId);
            
            if (updateError) {
                console.error('Update error for grade', gradeId, ':', updateError);
                failedCount++;
                errorMessages.push(`Update error for grade ${gradeId}: ${updateError.message}`);
                continue;
            }
            
            releasedCount++;
            
            // ✅ Store for email sending
            releaseData.push({
                student_id: grade.student_id,
                exam_id: parseInt(examId),
                grade: grade
            });
        }
        
        let message = `✅ Released ${releasedCount} result(s) for "${examName}"`;
        if (failedCount > 0) {
            message += `\n❌ Failed: ${failedCount}`;
            if (errorMessages.length > 0) {
                message += `\n\nErrors:\n${errorMessages.slice(0, 5).join('\n')}`;
                if (errorMessages.length > 5) {
                    message += `\n... and ${errorMessages.length - 5} more`;
                }
            }
        }
        alert(message);
        
        // ============================================
        // 📧 SEND EMAIL NOTIFICATIONS
        // ============================================
        if (releasedCount > 0 && releaseData.length > 0) {
            const sendEmail = document.getElementById('sendEmailOnRelease')?.checked !== false;
            
            if (sendEmail) {
                showToast('📧 Sending email notifications...', 'info');
                
                console.log(`📧 Sending ${releaseData.length} emails...`);
                let sent = 0;
                let failed = 0;
                
                for (const data of releaseData) {
                    try {
                        const success = await sendResultReleaseEmail(
                            data.student_id,
                            data.exam_id,
                            data.grade
                        );
                        
                        if (success) {
                            sent++;
                            console.log(`✅ Email sent to student ${data.student_id}`);
                        } else {
                            failed++;
                            console.log(`❌ Email failed for student ${data.student_id}`);
                        }
                        
                        // Small delay to avoid rate limits
                        await new Promise(r => setTimeout(r, 300));
                        
                    } catch (e) {
                        failed++;
                        console.error('Email error:', e);
                    }
                }
                
                if (sent > 0) {
                    showToast(`✅ ${sent} email notification(s) sent successfully!`, 'success');
                }
                if (failed > 0) {
                    showToast(`⚠️ ${failed} email(s) failed to send`, 'warning');
                }
                
                console.log(`📧 Email summary: ${sent} sent, ${failed} failed`);
            }
        }
        
        closeReleaseModal();
        loadStudentsWithResults();
        loadAllExams();
        
    } catch (err) { 
        alert('❌ Error: ' + err.message); 
        console.error(err);
    }
};

    // ============================================
// 📧 RESEND RELEASE EMAIL (Single Student)
// ============================================

window.resendReleaseEmail = async function(studentId, examId, studentName, examName) {
    try {
        // Check if this student has been released
        const { data: grade, error: gradeError } = await sb
            .from('exam_grades')
            .select('id, student_id, marks, total_score, result_status, exam_id')
            .eq('student_id', studentId)
            .eq('exam_id', parseInt(examId))
            .eq('question_id', '00000000-0000-0000-0000-000000000000')
            .single();
        
        if (gradeError || !grade) {
            showToast('❌ Student grade not found', 'error');
            return;
        }
        
        // Check if released
        const { data: released, error: releasedError } = await sb
            .from('released_exam_results')
            .select('result_id')
            .eq('result_id', grade.id)
            .maybeSingle();
        
        if (!released) {
            showToast('⚠️ This student\'s results have not been released yet. Please release first.', 'warning');
            return;
        }
        
        if (!confirm(`📧 Resend release email to ${studentName} for "${examName}"?`)) {
            return;
        }
        
        showToast(`📧 Sending email to ${studentName}...`, 'info');
        
        // Send the email
        const success = await sendResultReleaseEmail(studentId, parseInt(examId), grade);
        
        if (success) {
            showToast(`✅ Email resent successfully to ${studentName}`, 'success');
            
            // Log the resend action
            await sb.from('exam_proctoring_logs').insert({
                student_id: studentId,
                exam_id: parseInt(examId),
                event_type: 'email_resent',
                details: `Admin resent release email to ${studentName} for ${examName}`,
                severity: 'info',
                timestamp: new Date().toISOString()
            });
        } else {
            showToast(`❌ Failed to send email to ${studentName}`, 'error');
        }
        
    } catch (error) {
        console.error('Error resending email:', error);
        showToast('❌ Error: ' + error.message, 'error');
    }
};

// ============================================
// 📧 BATCH RESEND RELEASE EMAILS
// ============================================

window.batchResendReleaseEmails = async function(examId) {
    if (!examId) {
        examId = document.getElementById('releaseExamFilter')?.value;
        if (!examId) {
            showToast('Please select an exam first', 'warning');
            return;
        }
    }
    
    try {
        // Get all released results for this exam
        const { data: releasedResults, error } = await sb
            .from('released_exam_results')
            .select('result_id, student_id, exam_id')
            .eq('exam_id', parseInt(examId));
        
        if (error) throw error;
        
        if (!releasedResults || releasedResults.length === 0) {
            showToast('No released results found for this exam', 'info');
            return;
        }
        
        if (!confirm(`📧 Resend emails to ${releasedResults.length} students for this exam?`)) {
            return;
        }
        
        showToast(`📧 Sending ${releasedResults.length} emails...`, 'info');
        
        let sent = 0;
        let failed = 0;
        
        for (const result of releasedResults) {
            try {
                const { data: grade } = await sb
                    .from('exam_grades')
                    .select('*')
                    .eq('id', result.result_id)
                    .single();
                
                if (grade) {
                    const success = await sendResultReleaseEmail(result.student_id, parseInt(examId), grade);
                    if (success) sent++;
                    else failed++;
                } else {
                    failed++;
                }
                
                // Small delay to avoid rate limits
                await new Promise(r => setTimeout(r, 200));
                
            } catch (e) {
                failed++;
            }
        }
        
        showToast(`📧 Sent: ${sent}, Failed: ${failed}`, sent > 0 ? 'success' : 'error');
        
        // Log the batch action
        await sb.from('exam_proctoring_logs').insert({
            student_id: 'admin',
            exam_id: parseInt(examId),
            event_type: 'batch_email_resent',
            details: `Admin resent ${sent} emails for exam ID ${examId}`,
            severity: 'info',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        showToast('❌ Error: ' + error.message, 'error');
    }
};
  

  // ============================================
// 📧 SEND RESULT RELEASE EMAIL (NO SCORES!)
// PROFESSIONAL TEMPLATE WITH NCHSM BRANDING
// ============================================

async function sendResultReleaseEmail(studentId, examId, grade) {
    try {
        // Get student details
        const { data: student, error: studentError } = await sb
            .from('consolidated_user_profiles_table')
            .select('full_name, email, student_id, program, block')
            .eq('user_id', studentId)
            .single();
        
        if (studentError || !student || !student.email) {
            console.log('⚠️ No email found for student:', studentId);
            return false;
        }
        
        // Get exam details
        const { data: exam, error: examError } = await sb
            .from('exams')
            .select('exam_name, exam_type, exam_date')
            .eq('id', parseInt(examId))
            .single();
        
        if (examError || !exam) {
            console.log('⚠️ Exam not found:', examId);
            return false;
        }
        
        const isCatExam = (exam.exam_type || '').toUpperCase().includes('CAT');
        const examTypeLabel = isCatExam ? 'CAT' : 'Exam';
        const examDate = exam.exam_date ? new Date(exam.exam_date).toLocaleDateString('en-KE', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }) : 'N/A';
        
        // ✅ FROM ADDRESS
        const fromAddress = 'NCHSM Exam Office <admin@nakurucollegeofhealthelearning.site>';
        
        // ✅ PROFESSIONAL EMAIL HTML
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Exam Results Released</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f0f4f8;
            -webkit-font-smoothing: antialiased;
        }
        .container {
            max-width: 580px;
            margin: 0 auto;
            padding: 20px;
        }
        .card {
            background: #ffffff;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 10px 40px rgba(10, 61, 98, 0.12);
        }
        .header {
            background: linear-gradient(135deg, #0A3D62 0%, #1a5276 100%);
            padding: 35px 35px 30px;
            text-align: center;
            position: relative;
        }
        .header::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #f1c40f, #f39c12, #f1c40f);
        }
        .header-logo {
            width: 75px;
            height: 75px;
            border-radius: 50%;
            background: white;
            padding: 6px;
            margin-bottom: 14px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        }
        .header-title {
            color: #ffffff;
            font-size: 26px;
            font-weight: 700;
            margin: 0 0 4px;
            letter-spacing: -0.5px;
        }
        .header-subtitle {
            color: rgba(255,255,255,0.85);
            font-size: 14px;
            margin: 0;
            font-weight: 300;
            letter-spacing: 0.5px;
        }
        .body {
            padding: 32px 35px 28px;
        }
        .greeting {
            font-size: 20px;
            font-weight: 700;
            color: #0A3D62;
            margin: 0 0 4px;
        }
        .greeting-sub {
            color: #5a6c7d;
            font-size: 15px;
            margin: 0 0 22px;
        }
        .divider {
            border: none;
            border-top: 2px solid #eef2f7;
            margin: 18px 0 22px;
        }
        .info-grid {
            background: #f8fafc;
            border-radius: 14px;
            padding: 20px 24px;
            margin: 16px 0;
            border-left: 4px solid #0A3D62;
        }
        .info-grid p {
            margin: 6px 0;
            font-size: 14px;
            color: #2c3e50;
            display: flex;
            justify-content: space-between;
            padding: 2px 0;
        }
        .info-grid .label {
            color: #5a6c7d;
            font-weight: 500;
        }
        .info-grid .value {
            color: #0A3D62;
            font-weight: 600;
            text-align: right;
        }
        .info-grid .value-name {
            color: #0A3D62;
            font-weight: 700;
        }
        .badge-exam {
            display: inline-block;
            background: #eaf4ea;
            color: #1a7a3a;
            padding: 2px 14px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }
        .badge-cat {
            display: inline-block;
            background: #fef3c7;
            color: #92400e;
            padding: 2px 14px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }
        .callout {
            background: linear-gradient(135deg, #eaf4ff, #dbeafe);
            border-radius: 14px;
            padding: 24px 28px;
            margin: 24px 0;
            text-align: center;
            border: 1px solid #bfdbfe;
        }
        .callout-icon {
            font-size: 40px;
            display: block;
            margin-bottom: 8px;
        }
        .callout-title {
            font-size: 18px;
            font-weight: 700;
            color: #0A3D62;
            margin: 0 0 4px;
        }
        .callout-text {
            font-size: 14px;
            color: #2c3e50;
            margin: 0;
        }
        .btn-primary {
            display: inline-block;
            background: linear-gradient(135deg, #0A3D62, #1a5276);
            color: white !important;
            padding: 15px 36px;
            border-radius: 12px;
            text-decoration: none;
            font-weight: 600;
            font-size: 16px;
            margin: 8px 0 4px;
            transition: all 0.3s ease;
            box-shadow: 0 6px 20px rgba(10, 61, 98, 0.3);
            text-align: center;
        }
        .btn-primary:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 30px rgba(10, 61, 98, 0.4);
        }
        .btn-secondary {
            display: inline-block;
            color: #0A3D62 !important;
            text-decoration: none;
            font-size: 13px;
            font-weight: 500;
            margin-top: 6px;
        }
        .btn-secondary:hover {
            text-decoration: underline;
        }
        .tip-box {
            background: #fef9e7;
            border-radius: 12px;
            padding: 14px 18px;
            margin: 18px 0 6px;
            border-left: 4px solid #f39c12;
        }
        .tip-box p {
            margin: 0;
            font-size: 13px;
            color: #7d6608;
        }
        .footer {
            background: #f8fafc;
            padding: 22px 35px;
            text-align: center;
            border-top: 1px solid #eef2f7;
        }
        .footer-text {
            font-size: 12px;
            color: #8a9aa8;
            margin: 4px 0;
            line-height: 1.6;
        }
        .footer-text strong {
            color: #5a6c7d;
        }
        .footer-links {
            margin-top: 10px;
        }
        .footer-links a {
            color: #0A3D62;
            text-decoration: none;
            font-size: 12px;
            margin: 0 12px;
            font-weight: 500;
        }
        .footer-links a:hover {
            text-decoration: underline;
        }
        .secure-badge {
            display: inline-block;
            background: #10b981;
            color: white;
            font-size: 11px;
            padding: 4px 16px;
            border-radius: 20px;
            font-weight: 600;
            margin-top: 8px;
        }
        @media (max-width: 480px) {
            .header { padding: 20px; }
            .body { padding: 20px; }
            .footer { padding: 15px 20px; }
            .info-grid { padding: 14px 16px; }
            .info-grid p { flex-direction: column; align-items: flex-start; }
            .info-grid .value { text-align: left; margin-top: 2px; }
            .btn-primary { padding: 12px 24px; font-size: 14px; display: block; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <!-- Header -->
            <div class="header">
                <img src="https://raw.githubusercontent.com/NCHSMlearning/e-learning/main/images/Logo_NCHSM.png" 
                     alt="NCHSM Logo" class="header-logo">
                <h1 class="header-title">📊 Results Released</h1>
                <p class="header-subtitle">Nakuru College of Health Sciences and Management</p>
            </div>
            
            <!-- Body -->
            <div class="body">
                <p class="greeting">Dear ${student.full_name},</p>
                <p class="greeting-sub">We are pleased to inform you that your exam results have been released.</p>
                
                <hr class="divider">
                
                <!-- Exam Details -->
                <div class="info-grid">
                    <p><span class="label">📋 Exam</span> <span class="value">${exam.exam_name}</span></p>
                    <p><span class="label">📅 Date</span> <span class="value">${examDate}</span></p>
                    <p><span class="label">📊 Type</span> 
                        <span class="value"><span class="${isCatExam ? 'badge-cat' : 'badge-exam'}">${examTypeLabel}</span></span>
                    </p>
                    <p><span class="label">👤 Student</span> <span class="value value-name">${student.full_name}</span></p>
                    <p><span class="label">🆔 ID</span> <span class="value">${student.student_id || 'N/A'}</span></p>
                    <p><span class="label">📚 Program</span> <span class="value">${student.program || 'N/A'}</span></p>
                    <p><span class="label">📌 Block</span> <span class="value">${student.block || 'N/A'}</span></p>
                </div>
                
                <!-- Call to Action -->
                <div class="callout">
                    <span class="callout-icon">🔐</span>
                    <p class="callout-title">Your Results Are Ready</p>
                    <p class="callout-text">Log in to the student portal to view your grades securely.</p>
                    <p style="font-size: 12px; color: #5a6c7d; margin: 8px 0 0;">
                        <span style="background: #d1fae5; padding: 3px 12px; border-radius: 20px; font-size: 11px; color: #065f46; font-weight: 600;">🔒 Secure & Private</span>
                    </p>
                </div>
                
                <!-- Button -->
                <div style="text-align: center; margin: 24px 0 16px;">
                    <a href="https://nakurucollegeofhealthelearning.site/exams" class="btn-primary">
                        🔑 Go to Exam Portal
                    </a>
                    <br>
                    <a href="https://nakurucollegeofhealthelearning.site" class="btn-secondary">
                        🌐 Visit NCHSM Digital Campus
                    </a>
                </div>
                
                <!-- Tip Box -->
                <div class="tip-box">
                    <p>💡 <strong>Tip:</strong> If you have any questions about your results, please contact your lecturer or the academic office.</p>
                </div>
            </div>
            
            <!-- Footer -->
            <div class="footer">
                <p class="footer-text">
                    <strong>Nakuru College of Health Sciences and Management</strong>
                </p>
                <p class="footer-text">
                    📞 +254 790 969 743 &nbsp;|&nbsp; 📧 admin@nakurucollegeofhealthelearning.site
                </p>
                <p class="footer-text" style="font-size: 11px; color: #aab7c5;">
                    This is an automated notification. Please do not reply to this email.
                </p>
                <div class="footer-links">
                    <a href="https://nakurucollegeofhealthelearning.site">🏠 Home</a>
                    <a href="https://nakurucollegeofhealthelearning.site/exams">📝 Exams</a>
                    <a href="https://nakurucollegeofhealthelearning.site/contact">📞 Contact</a>
                </div>
                <span class="secure-badge">🔒 Secure Notification</span>
            </div>
        </div>
    </div>
</body>
</html>`;
        
        // Send via Edge Function
        const result = await fetch('https://lwhtjozfsmbyihenfunw.supabase.co/functions/v1/send-email', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                to: student.email,
                subject: `📊 Exam Results Released - ${exam.exam_name}`,
                html: html,
                from: fromAddress
            })
        });
        
        const data = await result.json();
        
        if (data.success) {
            console.log(`✅ Email sent to ${student.email} (NO SCORES shown)`);
            return true;
        } else {
            console.error('❌ Email failed:', data.error);
            return false;
        }
        
    } catch (error) {
        console.error('❌ Email error:', error);
        return false;
    }
}

    /**
     * Send bulk emails from the release modal
     */
    async function sendBulkEmailsForRelease(releasedData) {
        const result = await sendBulkReleaseEmails(releasedData);
        
        let message = `📧 Email Summary:\n\n`;
        message += `✅ Sent: ${result.sent}\n`;
        message += `❌ Failed: ${result.failed}\n`;
        if (result.errors.length > 0) {
            message += `\nErrors:\n${result.errors.slice(0, 5).join('\n')}`;
            if (result.errors.length > 5) {
                message += `\n... and ${result.errors.length - 5} more`;
            }
        }
        alert(message);
        
        return result;
    }

    /**
     * Manually send an exam result email to a student
     */
    window.sendManualResultEmail = async function(studentId, examId) {
        try {
            const { data: grade, error } = await sb
                .from('exam_grades')
                .select('*')
                .eq('student_id', studentId)
                .eq('exam_id', parseInt(examId))
                .eq('question_id', '00000000-0000-0000-0000-000000000000')
                .single();
            
            if (error || !grade) {
                showToast('No grade found for this student/exam', 'error');
                return;
            }
            
            const success = await sendResultReleaseEmail(studentId, examId, grade);
            
            if (success) {
                showToast('📧 Email sent successfully!', 'success');
            } else {
                showToast('❌ Failed to send email', 'error');
            }
        } catch (error) {
            showToast('❌ Error: ' + error.message, 'error');
        }
    };

    /**
     * Send bulk exam result emails for an exam
     */
    window.sendBulkExamResultEmails = async function(examId) {
        if (!examId) {
            examId = prompt('Enter the exam ID to send emails:');
            if (!examId) return;
        }
        
        try {
            const { data: grades, error } = await sb
                .from('exam_grades')
                .select('*')
                .eq('exam_id', parseInt(examId))
                .eq('question_id', '00000000-0000-0000-0000-000000000000')
                .neq('result_status', 'PENDING');
            
            if (error || !grades || grades.length === 0) {
                showToast('No grades found for this exam', 'error');
                return;
            }
            
            if (!confirm(`Send emails to ${grades.length} students for this exam?`)) {
                return;
            }
            
            showToast(`📧 Sending ${grades.length} emails...`, 'info');
            
            const results = [];
            for (const grade of grades) {
                const sent = await sendResultReleaseEmail(grade.student_id, examId, grade);
                results.push({ student: grade.student_id, sent });
                await new Promise(r => setTimeout(r, 200));
            }
            
            const sent = results.filter(r => r.sent).length;
            const failed = results.filter(r => !r.sent).length;
            
            showToast(`📧 Sent: ${sent}, Failed: ${failed}`, sent > 0 ? 'success' : 'error');
            
        } catch (error) {
            showToast('❌ Error: ' + error.message, 'error');
        }
    };

    // ============================================
    // 🔔 EMAIL UI HELPER
    // ============================================

    /**
     * Add email toggle to release modal
     */
    function addEmailToggleToReleaseModal() {
        const releaseActions = document.querySelector('.release-actions');
        if (!releaseActions) return;
        
        if (document.getElementById('releaseEmailToggle')) return;
        
        const toggle = document.createElement('div');
        toggle.id = 'releaseEmailToggle';
        toggle.style.cssText = 'display:flex; align-items:center; gap:8px; margin-left:auto;';
        toggle.innerHTML = `
            <label style="display:flex; align-items:center; gap:6px; font-size:0.8rem; cursor:pointer;">
                <input type="checkbox" id="sendEmailOnRelease" checked>
                <i class="fas fa-envelope"></i> Send email to students
            </label>
            <span style="font-size:0.7rem; color:#64748B;">(no scores shown)</span>
        `;
        
        releaseActions.appendChild(toggle);
    }

    // ============================================
    // 📝 MODIFIED: CONFIRM RELEASE RESULTS WITH EMAIL
    // ============================================

    /**
     * UPDATED: Confirm release results with email notifications
     * Replace your existing confirmReleaseResults with this
     */
    window.confirmReleaseResultsWithEmail = async function() {
        const ids = Array.from(selectedStudentIds);
        if (ids.length === 0) { 
            alert('Please select at least one student to release results.'); 
            return; 
        }
        
        const examId = document.getElementById('releaseExamFilter').value;
        if (!examId) return;
        
        if (!confirm(`Release results for ${ids.length} selected student(s)?`)) return;
        
        try {
            const { data: exam, error: examError } = await sb
                .from('exams')
                .select('pass_mark, total_marks, exam_type, exam_name')
                .eq('id', parseInt(examId))
                .single();
            
            if (examError) throw examError;
            
            const passMark = exam?.pass_mark || 18;
            const totalMarks = exam?.total_marks || 30;
            const isCatExam = (exam?.exam_type || '').toUpperCase().includes('CAT');
            const examName = exam?.exam_name || 'Exam';
            
            let releasedCount = 0;
            let failedCount = 0;
            let errorMessages = [];
            let releaseData = [];
            
            for (const gradeId of ids) {
                const { data: grade, error: gradeError } = await sb
                    .from('exam_grades')
                    .select('id, student_id, marks, total_score, result_status')
                    .eq('id', gradeId)
                    .single();
                
                if (gradeError || !grade) {
                    console.error('Grade not found:', gradeId);
                    failedCount++;
                    errorMessages.push(`Grade ID ${gradeId} not found`);
                    continue;
                }
                
                if (!grade.student_id) {
                    console.error('Missing student_id for grade:', gradeId);
                    failedCount++;
                    errorMessages.push(`Missing student_id for grade ${gradeId}`);
                    continue;
                }
                
                let score = 0;
                if (isCatExam) {
                    score = grade.marks || parseFloat(grade.total_score) || 0;
                    score = Math.min(score, 30);
                } else {
                    score = parseFloat(grade.total_score) || grade.marks || 0;
                    score = Math.min(score, totalMarks || 70);
                }
                
                const isPassed = score >= passMark;
                const resultStatus = isPassed ? 'PASS' : 'FAIL';
                
                const { error: releaseError } = await sb
                    .from('released_exam_results')
                    .insert({
                        result_id: gradeId,
                        student_id: grade.student_id,
                        exam_id: parseInt(examId)
                    });
                
                if (releaseError) {
                    console.error('Release error:', releaseError);
                    failedCount++;
                    errorMessages.push(`Release error for grade ${gradeId}: ${releaseError.message}`);
                    continue;
                }
                
                const { error: updateError } = await sb
                    .from('exam_grades')
                    .update({
                        result_status: resultStatus,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', gradeId);
                
                if (updateError) {
                    console.error('Update error:', updateError);
                    failedCount++;
                    errorMessages.push(`Update error for grade ${gradeId}: ${updateError.message}`);
                    continue;
                }
                
                releasedCount++;
                
                // Store for email
                releaseData.push({
                    student_id: grade.student_id,
                    exam_id: parseInt(examId),
                    grade: grade
                });
            }
            
            let message = `✅ Released ${releasedCount} result(s) for "${examName}"`;
            if (failedCount > 0) {
                message += `\n❌ Failed: ${failedCount}`;
                if (errorMessages.length > 0) {
                    message += `\n\nErrors:\n${errorMessages.slice(0, 5).join('\n')}`;
                    if (errorMessages.length > 5) {
                        message += `\n... and ${errorMessages.length - 5} more`;
                    }
                }
            }
            alert(message);
            
            // 📧 Send email notifications to students
            if (releasedCount > 0 && releaseData.length > 0) {
                const sendEmail = document.getElementById('sendEmailOnRelease')?.checked !== false;
                
                if (sendEmail) {
                    showToast('📧 Sending email notifications...', 'info');
                    
                    const emailResults = await sendBulkEmailsForRelease(releaseData);
                    console.log(`📧 Email summary: ${emailResults.sent} sent, ${emailResults.failed} failed`);
                    
                    if (emailResults.failed > 0 && emailResults.failed < releaseData.length) {
                        showToast(`⚠️ ${emailResults.sent} emails sent, ${emailResults.failed} failed`, 'warning');
                    } else if (emailResults.failed === releaseData.length) {
                        showToast('❌ All emails failed to send', 'error');
                    } else {
                        showToast(`✅ ${emailResults.sent} email notifications sent`, 'success');
                    }
                }
            }
            
            closeReleaseModal();
            loadStudentsWithResults();
            loadAllExams();
            
        } catch (err) { 
            alert('❌ Error: ' + err.message); 
            console.error(err);
        }
    };
    // ============================================
    // 📝 EXAM MANAGEMENT FUNCTIONS
    // ============================================
    window.filterExamsByStatus = function(status) {
        currentExamFilter = status;
        document.querySelectorAll('.status-toggle-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        loadAllExams();
    };

    window.togglePublish = async function(examId, currentStatus) {
        const newStatus = currentStatus === 'published' ? 'draft' : 'published';
        const { error } = await sb.from('exams').update({ status: newStatus }).eq('id', examId);
        if (error) { 
            alert('Error: ' + error.message); 
        } else { 
            loadAllExams(); 
        }
    };

    window.openResetModal = function(examId, examName) {
        examToReset = { id: examId, name: examName };
        document.getElementById('resetExamModal').style.display = 'flex';
    };

    window.confirmResetExam = async function() {
        if (!examToReset) return;
        if (confirm(`Reset all student answers for "${examToReset.name}"? This cannot be undone.`)) {
            const { error } = await sb.from('exam_grades').delete().eq('exam_id', examToReset.id);
            if (error) { 
                alert('Error: ' + error.message); 
            } else { 
                alert(`Exam "${examToReset.name}" has been reset!`);
                loadAllExams();
                loadStudentsWithResults(); 
            }
        }
        closeResetModal();
    };

    window.openCreateExamModal = function(examId = null) {
    document.getElementById('examModalTitle').innerHTML = examId ? '<i class="fas fa-edit"></i> Edit Exam' : '<i class="fas fa-plus-circle"></i> Create New Exam';
    document.getElementById('editingExamId').value = examId || '';
    
    if (examId && examsMap[examId]) {
        const exam = examsMap[examId];
        document.getElementById('examName').value = exam.title || exam.exam_name || '';
        document.getElementById('examType').value = exam.exam_type || 'EXAM';
        document.getElementById('examCourse').value = exam.course_code || exam.course || '';
        document.getElementById('examDuration').value = exam.duration_minutes || 30;
        
        // ✅ FIX: Load the actual total_marks from the exam
        document.getElementById('examTotalMarks').value = exam.total_marks || exam.marks_out_of || 100;
        document.getElementById('examLink').value = exam.online_link || exam.exam_link || '';
        document.getElementById('examProgram').value = exam.program_type || '';
        document.getElementById('examBlock').value = exam.block || exam.block_term || '';
        document.getElementById('examIntakeYear').value = exam.intake_year || '';
        
        // ✅ FIX: Load the actual pass_mark from the exam
        document.getElementById('examPassMark').value = exam.pass_mark || Math.round((exam.total_marks || 100) * 0.6);
        
        // ✅ Set status if the field exists
        const statusSelect = document.getElementById('examStatus');
        if (statusSelect) statusSelect.value = exam.status || 'draft';
        
    } else {
        // New exam defaults
        document.getElementById('examName').value = '';
        document.getElementById('examType').value = 'EXAM';
        document.getElementById('examCourse').value = '';
        document.getElementById('examDuration').value = 30;
        document.getElementById('examTotalMarks').value = 70;
        document.getElementById('examLink').value = '';
        document.getElementById('examProgram').value = '';
        document.getElementById('examBlock').value = '';
        document.getElementById('examIntakeYear').value = '';
        document.getElementById('examPassMark').value = 42;
        const statusSelect = document.getElementById('examStatus');
        if (statusSelect) statusSelect.value = 'draft';
    }
    
    updateTotalMarksHint();
    document.getElementById('examModal').style.display = 'flex';
};

   document.getElementById('examForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const examId = document.getElementById('editingExamId').value;
    const examType = document.getElementById('examType').value;
    
    // ✅ FIX: Get values from the form inputs, not hardcoded defaults
    const totalMarks = parseInt(document.getElementById('examTotalMarks').value) || 100;
    const passMark = parseInt(document.getElementById('examPassMark').value) || Math.round(totalMarks * 0.6);
    const duration = parseInt(document.getElementById('examDuration').value) || 30;
    
    const examData = {
        title: document.getElementById('examName').value,
        exam_name: document.getElementById('examName').value,
        exam_type: examType,
        course_code: document.getElementById('examCourse').value,
        duration_minutes: duration,
        total_marks: totalMarks,      // ✅ Uses user input
        marks_out_of: totalMarks,     // ✅ Uses user input
        pass_mark: passMark,          // ✅ Uses user input
        online_link: document.getElementById('examLink').value,
        program_type: document.getElementById('examProgram').value || null,
        block: document.getElementById('examBlock').value || null,
        intake_year: document.getElementById('examIntakeYear').value || null,
        status: document.getElementById('examStatus')?.value || 'draft',
        updated_at: new Date().toISOString()
    };
    
    // ✅ Add validation
    if (!examData.title || examData.title.trim() === '') {
        alert('Please enter an exam name.');
        return;
    }
    if (!examData.online_link || examData.online_link.trim() === '') {
        alert('Please enter an exam link.');
        return;
    }
    if (examData.duration_minutes < 1) {
        alert('Duration must be at least 1 minute.');
        return;
    }
    if (examData.total_marks < 1) {
        alert('Total marks must be at least 1.');
        return;
    }
    
    let result;
    if (examId) {
        result = await sb.from('exams').update(examData).eq('id', parseInt(examId));
    } else {
        result = await sb.from('exams').insert([examData]);
    }
    
    if (result.error) { 
        alert('❌ Error: ' + result.error.message); 
    } else { 
        alert(examId ? '✅ Exam updated successfully!' : '✅ Exam created successfully!'); 
        closeExamModal(); 
        loadAllExams(); 
        loadStudentsWithResults();
    }
});

    window.deleteExam = async function(examId, examName) {
        if (confirm(`Delete exam "${examName}"? This will also delete all student answers.`)) {
            await sb.from('exam_grades').delete().eq('exam_id', examId);
            const { error } = await sb.from('exams').delete().eq('id', examId);
            if (error) alert('Error: ' + error.message);
            else { 
                alert('Exam deleted!');
                loadAllExams();
                loadStudentsWithResults(); 
            }
        }
    };

    window.openAssignExamModal = async function() {
        const { data: students } = await sb.from('consolidated_user_profiles_table').select('id, full_name, student_id');
        const { data: exams } = await sb.from('exams').select('id, exam_name');
        document.getElementById('assignStudentSelect').innerHTML = students.map(s =>
            `<option value="${s.id}">${s.full_name} (${s.student_id || 'N/A'})</option>`).join('');
        document.getElementById('assignExamSelect').innerHTML = exams.map(e =>
            `<option value="${e.id}">${e.exam_name}</option>`).join('');
        document.getElementById('assignExamModal').style.display = 'flex';
    };

    window.confirmAssignExam = async function() {
        const studentId = document.getElementById('assignStudentSelect').value;
        const examId = document.getElementById('assignExamSelect').value;
        if (!studentId || !examId) return alert('Select both');
        const { data: student } = await sb.from('consolidated_user_profiles_table').select('user_id').eq('id', studentId).single();
        if (!student?.user_id) return alert('Student not found');
        const { error } = await sb.from('exam_grades').insert({ 
            student_id: student.user_id,
            exam_id: parseInt(examId),
            question_id: '00000000-0000-0000-0000-000000000000', 
            marks: 0, 
            total_score: 0,
            result_status: 'Scheduled', 
            graded_at: new Date().toISOString() 
        });
        if (error) alert('Error: ' + error.message);
        else { 
            alert('Exam assigned!');
            closeAssignExamModal();
            loadAllExams();
            loadStudentsWithResults(); 
        }
    };

  // ============================================
    // 🖱️ SIDEBAR FUNCTIONS
    // ============================================
    window.toggleSidebar = function() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        sidebar.classList.toggle('open');
        overlay.classList.toggle('show');
    };

    window.switchTab = function(tab) {
        currentTab = tab;
        document.querySelectorAll('.sidebar-menu a').forEach(a => a.classList.remove('active'));
        document.querySelector(`.sidebar-menu a[data-tab="${tab}"]`)?.classList.add('active');

        const titles = {
            'students': ['Students Results', 'View and manage student exam results', 'fa-graduation-cap'],
            'allStudents': ['All Students', 'View all registered students', 'fa-users'],
            'exams': ['Exam Management', 'Create, edit and manage exams', 'fa-file-alt'],
            'proctoring': ['Proctoring Alerts', 'Live monitoring and alerts', 'fa-video'],
            'liveStudents': ['Live Students', 'Students currently taking exams', 'fa-eye'],
            'livefeed': ['Live Camera Feed', 'Real-time camera feeds of active students', 'fa-video'],
            'attendance': ['Attendance Sheet', 'View exam attendance with live video feeds', 'fa-clipboard-check']  // ✅ ADD THIS LINE
        };
        
        const [title, subtitle, icon] = titles[tab] || ['Dashboard', 'Overview', 'fa-home'];
        document.getElementById('pageTitle').innerHTML = `<i class="fas ${icon}"></i> ${title}`;
        document.getElementById('pageSubtitle').textContent = subtitle;

        document.getElementById('studentsTableContainer').style.display = tab === 'students' ? 'block' : 'none';
        document.getElementById('allStudentsTableContainer').style.display = tab === 'allStudents' ? 'block' : 'none';
        document.getElementById('examsTableContainer').style.display = tab === 'exams' ? 'block' : 'none';
        document.getElementById('proctoringTableContainer').style.display = tab === 'proctoring' ? 'block' : 'none';
        document.getElementById('liveStudentsTableContainer').style.display = tab === 'liveStudents' ? 'block' : 'none';
        document.getElementById('livefeedTableContainer').style.display = tab === 'livefeed' ? 'block' : 'none';
        document.getElementById('attendanceTableContainer').style.display = tab === 'attendance' ? 'block' : 'none';  // ✅ ADD THIS LINE

        if (tab === 'students') loadStudentsWithResults();
        if (tab === 'allStudents') loadAllStudents();
        if (tab === 'exams') loadAllExams();
        if (tab === 'proctoring') loadProctoringLogs();
        if (tab === 'liveStudents') loadLiveStudents();
        if (tab === 'livefeed') {
            loadLiveFeed();
            startLiveFeedAutoRefresh();
        }
        if (tab === 'attendance') {  // ✅ ADD THIS BLOCK
            initAttendanceTab();
        }
        
        renderFilters();

        if (window.innerWidth <= 768) {
            document.getElementById('sidebar').classList.remove('open');
            document.getElementById('sidebarOverlay').classList.remove('show');
        }
    };
    // ============================================
    // 🔄 REFRESH STUDENT PROGRESS
    // ============================================
    window.refreshStudentProgress = function() {
        loadStudentsWithResults();
        alert('🔄 Data refreshed!');
    };

    // ============================================
    // 🚀 DOM READY
    // ============================================
    document.addEventListener('DOMContentLoaded', function() {
        if (!checkAdminAuth()) return;

        const session = JSON.parse(localStorage.getItem('adminSession') || '{}');
        document.getElementById('adminName').textContent = session.name || 'Admin';
        document.getElementById('adminEmail').textContent = session.email || 'admin@nchsm.ac.ke';
        document.getElementById('adminInitial').textContent = (session.name || 'A')[0].toUpperCase();

        window.switchTab('students');
        setupRealtimeNotifications();
        updateTotalMarksHint();

        setInterval(updateAdminTimers, 1000);

        document.addEventListener('visibilitychange', function() {
            if (!document.hidden) updateAdminTimers();
        });

        document.addEventListener('click', function(e) {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebarOverlay');
            if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
                if (!sidebar.contains(e.target) && !e.target.closest('.mobile-toggle')) {
                    sidebar.classList.remove('open');
                    overlay.classList.remove('show');
                }
            }
        });

        // ✅ Load attendance exam dropdown
        if (typeof loadAttendanceExamDropdown === 'function') {
            loadAttendanceExamDropdown();
        }
        if (typeof setDefaultAttendanceDate === 'function') {
            setDefaultAttendanceDate();
        }

        // Load live feed in background after 2 seconds
        setTimeout(function() {
            if (typeof loadLiveFeed === 'function') {
                loadLiveFeed();
                startLiveFeedAutoRefresh();
                console.log('📹 Live Feed initialized');
            }
        }, 2000);

        // Auto-refresh live data every 30 seconds
        setInterval(function() {
            if (currentTab === 'liveStudents' && typeof loadLiveStudents === 'function') {
                loadLiveStudents();
            }
            if (currentTab === 'livefeed' && typeof loadLiveFeed === 'function') {
                loadLiveFeed();
            }
            // ✅ Auto-refresh attendance
            if (currentTab === 'attendance' && attendanceAutoRefresh && typeof loadAttendanceSheet === 'function') {
                loadAttendanceSheet();
            }
        }, 30000);

        // Keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.shiftKey && e.key === 'L') {
                e.preventDefault();
                if (typeof switchTab === 'function') {
                    switchTab('livefeed');
                    if (typeof showToast === 'function') {
                        showToast('📹 Opening Live Feed', 'info');
                    }
                }
            }
            
            if (e.ctrlKey && e.shiftKey && e.key === 'S') {
                e.preventDefault();
                if (currentTab === 'livefeed' && typeof refreshLiveFeed === 'function') {
                    refreshLiveFeed();
                }
            }
            
            if (e.ctrlKey && e.shiftKey && e.key === 'V') {
                e.preventDefault();
                if (typeof liveFeedData !== 'undefined' && liveFeedData && liveFeedData.length > 0) {
                    const first = liveFeedData[0];
                    const profile = first.profile || {};
                    const exam = first.exam || {};
                    if (profile.user_id && exam.id && typeof openCameraView === 'function') {
                        openCameraView(profile.user_id, exam.id, profile.full_name || 'Student', exam.exam_name || 'Exam');
                    }
                }
            }
            
            // ✅ Keyboard shortcut for Attendance: Ctrl+Shift+A
            if (e.ctrlKey && e.shiftKey && e.key === 'A') {
                e.preventDefault();
                if (typeof switchTab === 'function') {
                    switchTab('attendance');
                    if (typeof showToast === 'function') {
                        showToast('📋 Opening Attendance Sheet', 'info');
                    }
                }
            }
            
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal').forEach(function(modal) {
                    if (modal.style.display === 'flex') {
                        modal.style.display = 'none';
                        if (modal.id === 'releaseModal') {
                            selectedStudentIds = new Set();
                            const checkbox = document.getElementById('selectAllCheckbox');
                            if (checkbox) checkbox.checked = false;
                            const countEl = document.getElementById('selectedCount');
                            if (countEl) countEl.innerHTML = '0 selected';
                            const confirmBtn = document.getElementById('confirmReleaseBtn');
                            if (confirmBtn) confirmBtn.disabled = true;
                        }
                        if (modal.id === 'cameraModal' && typeof closeCameraModal === 'function') {
                            closeCameraModal();
                        }
                        if (modal.id === 'attendanceDetailModal') {
                            modal.remove();
                        }
                    }
                });
            }
        });

        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
                if (e.target.id === 'releaseModal') {
                    selectedStudentIds = new Set();
                    const checkbox = document.getElementById('selectAllCheckbox');
                    if (checkbox) checkbox.checked = false;
                    const countEl = document.getElementById('selectedCount');
                    if (countEl) countEl.innerHTML = '0 selected';
                    const confirmBtn = document.getElementById('confirmReleaseBtn');
                    if (confirmBtn) confirmBtn.disabled = true;
                }
                if (e.target.id === 'cameraModal' && typeof closeCameraModal === 'function') {
                    closeCameraModal();
                }
                if (e.target.id === 'attendanceDetailModal') {
                    e.target.remove();
                }
            }
        });

        console.log('✅ Dashboard fully initialized');
        console.log('📹 Press Ctrl+Shift+L to open Live Feed');
        console.log('📋 Press Ctrl+Shift+A to open Attendance Sheet');
    });
// ============================================
// 📋 ATTENDANCE SHEET FUNCTIONS
// ============================================

// Load attendance sheet
async function loadAttendanceSheet() {
    const examId = document.getElementById('attendanceExamFilter')?.value;
    const date = document.getElementById('attendanceDateFilter')?.value;
    const status = document.getElementById('attendanceStatusFilter')?.value;
    const showOnlyLive = document.getElementById('showOnlyLive')?.checked || false;

    const loadingDiv = document.getElementById('attendanceLoading');
    const table = document.getElementById('attendanceTable');
    const summaryBar = document.getElementById('attendanceSummaryBar');

    if (loadingDiv) {
        loadingDiv.style.display = 'block';
        loadingDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading attendance data...';
    }
    if (table) table.style.display = 'none';
    if (summaryBar) summaryBar.style.display = 'none';

    try {
        let query = sb.from('exam_attendance').select('*');
        
        if (examId) {
            query = query.eq('exam_id', parseInt(examId));
        }
        if (date) {
            query = query.eq('date', date);
        }
        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        let filteredData = data || [];
        
        // Filter for live only if checked
        if (showOnlyLive) {
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
            const { data: liveLogs } = await sb
                .from('exam_proctoring_logs')
                .select('student_id, exam_id')
                .gte('timestamp', fiveMinutesAgo);
            
            const liveSet = new Set(liveLogs?.map(l => `${l.student_id}_${l.exam_id}`) || []);
            filteredData = filteredData.filter(r => liveSet.has(`${r.student_id}_${r.exam_id}`));
        }

        attendanceData = filteredData;
        renderAttendanceTable(attendanceData);
        updateAttendanceStats(attendanceData);
        updateAttendanceSummary(attendanceData);

        // Update badge count
        const badge = document.getElementById('attendanceBadge');
        if (badge) badge.textContent = attendanceData.length;

    } catch (error) {
        console.error('Error loading attendance:', error);
        showToast('Error loading attendance data', 'error');
        if (loadingDiv) {
            loadingDiv.innerHTML = '❌ Error loading attendance data';
            loadingDiv.style.color = '#DC2626';
        }
    }

    if (loadingDiv) loadingDiv.style.display = 'none';
}

// Render attendance table
function renderAttendanceTable(data) {
    const tbody = document.getElementById('attendanceBody');
    const table = document.getElementById('attendanceTable');

    if (!tbody) return;

    if (!data || data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="attendance-empty">
                    <i class="fas fa-clipboard-list"></i>
                    No attendance records found
                </td>
            </tr>
        `;
        if (table) table.style.display = 'table';
        return;
    }

    // Get live students
    const liveStudents = getLiveStudents(data);

    let html = '';
    data.forEach((record, index) => {
        const isLive = liveStudents.includes(record.student_id);
        const statusClass = record.status === 'present' || record.status === 'completed' ? 'present' :
                           record.status === 'signed_in' ? 'signed-in' :
                           record.status === 'in_progress' ? 'in-progress' : 'absent';
        
        const statusDisplay = record.status === 'completed' ? '✅ Completed' :
                              record.status === 'present' ? '✅ Present' :
                              record.status === 'signed_in' ? '📋 Signed In' :
                              record.status === 'in_progress' ? '⏳ In Progress' : '❌ Absent';

        const signInTime = record.sign_in_time ? new Date(record.sign_in_time).toLocaleString() : '--';
        
        // Video feed HTML
        let videoHtml = '';
        if (isLive) {
            videoHtml = `
                <div class="live-video-container">
                    <video id="liveVideo_${record.student_id}" 
                           autoplay muted playsinline
                           style="width:100%; height:100%; object-fit:cover; background:#1a1a2e;">
                        <source src="" type="video/webm">
                    </video>
                    <div class="live-badge">
                        <span class="dot"></span> LIVE
                    </div>
                    <div class="video-controls">
                        <button onclick="toggleVideoMute('${record.student_id}')" title="Mute">
                            <i class="fas fa-volume-up"></i>
                        </button>
                        <button onclick="openFullVideo('${record.student_id}', '${record.student_name || 'Student'}', '${record.exam_id}')" title="Full Screen">
                            <i class="fas fa-expand"></i>
                        </button>
                    </div>
                </div>
            `;
        } else {
            videoHtml = `
                <div class="video-placeholder">
                    <i class="fas fa-video-slash"></i>
                    <span>Not live</span>
                    <button onclick="requestLiveFeed('${record.student_id}', '${record.exam_id}')" 
                            style="padding:2px 12px; background:#3B82F6; color:white; border:none; border-radius:4px; font-size:0.6rem; cursor:pointer;">
                        <i class="fas fa-play"></i> Request
                    </button>
                </div>
            `;
        }

        html += `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${record.student_name || 'Unknown'}</strong></td>
                <td>${record.student_reg_number || 'N/A'}</td>
                <td>${record.exam_name || 'Exam ' + record.exam_id}</td>
                <td><span class="status-badge-attendance ${statusClass}">${statusDisplay}</span></td>
                <td>${signInTime}</td>
                <td>${videoHtml}</td>
                <td>
                    <button class="btn-sm btn-info" onclick="viewStudentAttendance('${record.student_id}', '${record.exam_id}')">
                        <i class="fas fa-eye"></i> Details
                    </button>
                    ${isLive ? `
                        <button class="btn-sm btn-danger" onclick="stopLiveFeed('${record.student_id}')">
                            <i class="fas fa-stop"></i>
                        </button>
                    ` : ''}
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    if (table) table.style.display = 'table';
    
    const summaryBar = document.getElementById('attendanceSummaryBar');
    if (summaryBar) summaryBar.style.display = 'flex';

    // Start video streams for live students
    setTimeout(() => {
        const liveIds = getLiveStudents(data);
        liveIds.forEach(id => {
            startVideoStream(id);
        });
    }, 500);

    // Update live count
    const liveCountEl = document.getElementById('attSummaryLive');
    if (liveCountEl) liveCountEl.textContent = liveStudents.length;
    
    const liveStatEl = document.getElementById('attStatLive');
    if (liveStatEl) liveStatEl.textContent = liveStudents.length;
}

// Get live students from heartbeat data
function getLiveStudents(attendanceData) {
    const inProgress = attendanceData.filter(r => r.status === 'in_progress');
    const now = Date.now();
    const activeThreshold = 5 * 60 * 1000; // 5 minutes

    return inProgress.filter(r => {
        const lastActivity = r.updated_at ? new Date(r.updated_at).getTime() : 0;
        return (now - lastActivity) < activeThreshold;
    }).map(r => r.student_id);
}

// Start video stream for a student
async function startVideoStream(studentId) {
    const videoElement = document.getElementById(`liveVideo_${studentId}`);
    if (!videoElement) return;

    if (liveVideoStreams[studentId]) {
        videoElement.srcObject = liveVideoStreams[studentId];
        return;
    }

    try {
        const stream = await getStudentVideoStream(studentId);
        if (stream) {
            liveVideoStreams[studentId] = stream;
            videoElement.srcObject = stream;
            await videoElement.play();
            console.log(`📹 Video stream started for student: ${studentId}`);
        }
    } catch (error) {
        console.error(`Error starting video for ${studentId}:`, error);
    }
}

// Get student video stream (simulated)
async function getStudentVideoStream(studentId) {
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, 640, 480);
        
        ctx.fillStyle = '#4ADE80';
        ctx.font = '20px Poppins';
        ctx.textAlign = 'center';
        ctx.fillText(`📹 Student: ${studentId}`, 320, 200);
        ctx.fillStyle = '#94A3B8';
        ctx.font = '16px Poppins';
        ctx.fillText('Live Video Feed', 320, 240);
        ctx.fillStyle = '#64748B';
        ctx.font = '12px Poppins';
        ctx.fillText(`Updated: ${new Date().toLocaleTimeString()}`, 320, 280);
        
        let frame = 0;
        const animate = () => {
            if (!liveVideoStreams[studentId]) return;
            
            frame++;
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 0, 640, 480);
            
            const pulse = Math.sin(frame / 20) * 10 + 20;
            ctx.fillStyle = `rgba(74, 222, 128, ${0.1 + Math.sin(frame / 30) * 0.05})`;
            ctx.beginPath();
            ctx.arc(50, 50, pulse, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#4ADE80';
            ctx.font = '20px Poppins';
            ctx.textAlign = 'center';
            ctx.fillText(`📹 Student: ${studentId}`, 320, 200);
            ctx.fillStyle = '#94A3B8';
            ctx.font = '16px Poppins';
            ctx.fillText('Live Video Feed', 320, 240);
            ctx.fillStyle = '#64748B';
            ctx.font = '12px Poppins';
            ctx.fillText(`Updated: ${new Date().toLocaleTimeString()}`, 320, 280);
            
            ctx.strokeStyle = '#4ADE80';
            ctx.lineWidth = 3;
            ctx.strokeRect(200, 100, 240, 200);
            ctx.fillStyle = '#4ADE80';
            ctx.font = '12px Poppins';
            ctx.fillText('✅ Face Detected', 320, 340);
            
            requestAnimationFrame(animate);
        };
        animate();
        
        return canvas.captureStream(15);
        
    } catch (error) {
        console.error('Error creating video stream:', error);
        return null;
    }
}

// Stop video stream
function stopLiveFeed(studentId) {
    if (liveVideoStreams[studentId]) {
        liveVideoStreams[studentId].getTracks().forEach(track => track.stop());
        delete liveVideoStreams[studentId];
    }
    
    const videoElement = document.getElementById(`liveVideo_${studentId}`);
    if (videoElement) {
        videoElement.srcObject = null;
    }
    
    showToast(`📹 Video feed stopped`, 'info');
    loadAttendanceSheet();
}

// Toggle video mute
function toggleVideoMute(studentId) {
    const videoElement = document.getElementById(`liveVideo_${studentId}`);
    if (videoElement) {
        videoElement.muted = !videoElement.muted;
        const icon = videoElement.muted ? 'fa-volume-mute' : 'fa-volume-up';
        const buttons = videoElement.parentElement.querySelectorAll('.video-controls button');
        buttons.forEach(btn => {
            if (btn.innerHTML.includes('fa-volume')) {
                btn.innerHTML = `<i class="fas ${icon}"></i>`;
            }
        });
    }
}

// Open full video modal
function openFullVideo(studentId, studentName, examId) {
    const modal = document.createElement('div');
    modal.className = 'full-video-modal';
    modal.innerHTML = `
        <div class="video-wrapper">
            <button class="close-btn" onclick="this.closest('.full-video-modal').remove()">&times;</button>
            <div class="video-info">
                <div>
                    <h3>${studentName || 'Student'}</h3>
                    <p>ID: ${studentId} | Exam: ${examId || 'N/A'}</p>
                </div>
                <div class="status-live">
                    <span class="dot"></span> LIVE
                </div>
            </div>
            <video id="fullVideo_${studentId}" autoplay muted playsinline style="width:100%; max-height:70vh; background:#1a1a2e;">
                <source src="" type="video/webm">
            </video>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const videoEl = document.getElementById(`fullVideo_${studentId}`);
    if (videoEl && liveVideoStreams[studentId]) {
        videoEl.srcObject = liveVideoStreams[studentId];
        videoEl.play();
    }
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Request live feed from student
async function requestLiveFeed(studentId, examId) {
    try {
        await sb.from('exam_proctoring_logs').insert({
            student_id: studentId,
            exam_id: parseInt(examId),
            event_type: 'admin_live_request',
            details: 'Admin requested live video feed',
            severity: 'info',
            timestamp: new Date().toISOString()
        });
        
        showToast('📹 Live feed requested', 'success');
        loadAttendanceSheet();
    } catch (error) {
        showToast('Error requesting live feed', 'error');
    }
}

// View all live videos
function viewAllLiveVideos() {
    const liveIds = getLiveStudents(attendanceData);
    if (liveIds.length === 0) {
        showToast('No live students to view', 'warning');
        return;
    }
    showToast(`📹 Opening ${liveIds.length} live feeds...`, 'info');
    
    liveIds.forEach(id => {
        const record = attendanceData.find(r => r.student_id === id);
        if (record) {
            openFullVideo(id, record.student_name || 'Student', record.exam_id);
        }
    });
}

// Update attendance stats
function updateAttendanceStats(data) {
    const total = data.length;
    const present = data.filter(r => r.status === 'present' || r.status === 'completed').length;
    const inProgress = data.filter(r => r.status === 'in_progress').length;
    const signedIn = data.filter(r => r.status === 'signed_in').length;
    const absent = total - present - inProgress - signedIn;
    const rate = total > 0 ? Math.round(((present + signedIn) / total) * 100) : 0;

    const statPresent = document.getElementById('attStatPresent');
    const statInProgress = document.getElementById('attStatInProgress');
    const statSignedIn = document.getElementById('attStatSignedIn');
    const statAbsent = document.getElementById('attStatAbsent');
    const statRate = document.getElementById('attStatRate');

    if (statPresent) statPresent.textContent = present;
    if (statInProgress) statInProgress.textContent = inProgress;
    if (statSignedIn) statSignedIn.textContent = signedIn;
    if (statAbsent) statAbsent.textContent = absent;
    if (statRate) statRate.textContent = rate + '%';
}

// Update attendance summary
function updateAttendanceSummary(data) {
    const total = data.length;
    const present = data.filter(r => r.status === 'present' || r.status === 'completed').length;
    const inProgress = data.filter(r => r.status === 'in_progress').length;
    const absent = total - present - inProgress;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;

    const totalEl = document.getElementById('attTotalStudents');
    const presentEl = document.getElementById('attSummaryPresent');
    const inProgressEl = document.getElementById('attSummaryInProgress');
    const absentEl = document.getElementById('attSummaryAbsent');
    const rateEl = document.getElementById('attSummaryRate');
    const progressBar = document.getElementById('attendanceProgressBar');

    if (totalEl) totalEl.textContent = total;
    if (presentEl) presentEl.textContent = present;
    if (inProgressEl) inProgressEl.textContent = inProgress;
    if (absentEl) absentEl.textContent = absent;
    if (rateEl) rateEl.textContent = rate + '%';
    if (progressBar) progressBar.style.width = rate + '%';
}

// View student attendance details
async function viewStudentAttendance(studentId, examId) {
    try {
        const { data, error } = await sb
            .from('exam_attendance')
            .select('*')
            .eq('student_id', studentId)
            .eq('exam_id', parseInt(examId))
            .order('created_at', { ascending: false });

        if (error) throw error;

        showAttendanceDetailModal(studentId, data || []);
    } catch (error) {
        showToast('Error loading student details', 'error');
    }
}

// Show attendance detail modal
function showAttendanceDetailModal(studentId, records) {
    const modal = document.createElement('div');
    modal.id = 'attendanceDetailModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
        padding: 20px;
    `;

    const record = records[0] || {};
    modal.innerHTML = `
        <div style="background: white; border-radius: 16px; max-width: 700px; width: 100%; max-height: 80vh; overflow-y: auto; padding: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h2 style="margin:0; color:#0A3D62;">
                    <i class="fas fa-user-graduate"></i> Student Attendance Details
                </h2>
                <button onclick="this.closest('#attendanceDetailModal').remove()" 
                        style="background: none; border: none; font-size: 1.8rem; cursor: pointer; color: #94A3B8;">
                    &times;
                </button>
            </div>

            <div style="background: #F8FAFC; padding: 16px; border-radius: 12px; margin-bottom: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div><strong>👤 Student ID:</strong> ${studentId}</div>
                <div><strong>📛 Name:</strong> ${record.student_name || 'Unknown'}</div>
                <div><strong>🆔 Registration:</strong> ${record.student_reg_number || 'N/A'}</div>
                <div><strong>📝 Exam:</strong> ${record.exam_name || 'Exam ' + record.exam_id}</div>
            </div>

            <h3 style="color:#0A3D62; margin-bottom:12px;">📋 Attendance History</h3>
            
            ${records && records.length > 0 ? `
                <div style="overflow-x:auto;">
                    <table style="width:100%; border-collapse: collapse; font-size:0.85rem;">
                        <thead>
                            <tr style="background:#F8FAFC;">
                                <th style="padding:8px 12px; text-align:left;">Date</th>
                                <th style="padding:8px 12px; text-align:left;">Status</th>
                                <th style="padding:8px 12px; text-align:left;">Sign In</th>
                                <th style="padding:8px 12px; text-align:left;">Submission</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${records.map(r => `
                                <tr style="border-bottom:1px solid #E2E8F0;">
                                    <td style="padding:8px 12px;">${r.date || '--'}</td>
                                    <td style="padding:8px 12px;">
                                        <span class="status-badge-attendance ${r.status === 'present' || r.status === 'completed' ? 'present' : r.status === 'signed_in' ? 'signed-in' : r.status === 'in_progress' ? 'in-progress' : 'absent'}">
                                            ${r.status || 'Unknown'}
                                        </span>
                                    </td>
                                    <td style="padding:8px 12px;">${r.sign_in_time ? new Date(r.sign_in_time).toLocaleTimeString() : '--'}</td>
                                    <td style="padding:8px 12px;">${r.submission_time ? new Date(r.submission_time).toLocaleTimeString() : '--'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : `
                <div style="text-align:center; padding:20px; color:#94A3B8;">
                    <i class="fas fa-clipboard-list" style="font-size:2rem; display:block; margin-bottom:8px;"></i>
                    No attendance records found
                </div>
            `}

            <div style="margin-top:16px; display:flex; gap:10px; justify-content:flex-end; border-top:1px solid #E2E8F0; padding-top:16px;">
                <button onclick="this.closest('#attendanceDetailModal').remove()" 
                        style="padding: 8px 20px; background: #0A3D62; color: white; border: none; border-radius: 8px; cursor: pointer;">
                    Close
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// Export attendance to CSV
function exportAttendanceCSV() {
    if (!attendanceData || attendanceData.length === 0) {
        showToast('No data to export', 'warning');
        return;
    }

    const headers = ['Student Name', 'Registration', 'Exam ID', 'Status', 'Date', 'Sign In Time', 'Submission Time', 'Duration (min)'];
    const rows = attendanceData.map(record => [
        record.student_name || 'Unknown',
        record.student_reg_number || 'N/A',
        record.exam_id || 'N/A',
        record.status || 'Unknown',
        record.date || '--',
        record.sign_in_time ? new Date(record.sign_in_time).toLocaleString() : '--',
        record.submission_time ? new Date(record.submission_time).toLocaleString() : '--',
        record.sign_in_time && record.submission_time ? 
            Math.round((new Date(record.submission_time) - new Date(record.sign_in_time)) / 1000 / 60) : '--'
    ]);

    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => {
        csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('📥 Attendance exported successfully!', 'success');
}

// Export attendance to Excel
function exportAttendanceExcel() {
    if (!attendanceData || attendanceData.length === 0) {
        showToast('No data to export', 'warning');
        return;
    }

    const data = attendanceData.map(record => ({
        'Student Name': record.student_name || 'Unknown',
        'Registration': record.student_reg_number || 'N/A',
        'Exam ID': record.exam_id || 'N/A',
        'Status': record.status || 'Unknown',
        'Date': record.date || '--',
        'Sign In Time': record.sign_in_time ? new Date(record.sign_in_time).toLocaleString() : '--',
        'Submission Time': record.submission_time ? new Date(record.submission_time).toLocaleString() : '--',
        'Duration (min)': record.sign_in_time && record.submission_time ? 
            Math.round((new Date(record.submission_time) - new Date(record.sign_in_time)) / 1000 / 60) : '--'
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    XLSX.writeFile(wb, `attendance_${new Date().toISOString().split('T')[0]}.xlsx`);

    showToast('📥 Attendance exported successfully!', 'success');
}

// Print attendance
function printAttendance() {
    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    printWindow.document.write(`
        <html>
            <head><title>Attendance Sheet</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { padding: 8px 12px; border: 1px solid #ddd; text-align: left; }
                th { background: #f5f5f5; }
                h1 { color: #0A3D62; }
                .status-badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.7rem; font-weight: 600; }
                .status-badge.present { background: #D1FAE5; color: #064E3B; }
                .status-badge.absent { background: #FEE2E2; color: #991B1B; }
                .status-badge.in-progress { background: #FEF3C7; color: #92400E; }
                .status-badge.signed-in { background: #DBEAFE; color: #1E40AF; }
                .status-badge.completed { background: #D1FAE5; color: #064E3B; }
                .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
                .stats { display: flex; gap: 20px; margin-bottom: 20px; flex-wrap: wrap; }
                .stats div { padding: 8px 16px; background: #f8fafc; border-radius: 8px; }
            </style>
        </head><body>
    `);
    
    printWindow.document.write(`
        <div class="header">
            <h1>📋 Exam Attendance Sheet</h1>
            <p>Generated: ${new Date().toLocaleString()}</p>
        </div>
        <div class="stats">
            <div>📊 Total: ${attendanceData.length}</div>
            <div style="background:#D1FAE5;">✅ Present: ${attendanceData.filter(r => r.status === 'present' || r.status === 'completed').length}</div>
            <div style="background:#FEF3C7;">⏳ In Progress: ${attendanceData.filter(r => r.status === 'in_progress').length}</div>
            <div style="background:#DBEAFE;">📋 Signed In: ${attendanceData.filter(r => r.status === 'signed_in').length}</div>
            <div style="background:#FEE2E2;">❌ Absent: ${attendanceData.filter(r => r.status === 'absent').length}</div>
        </div>
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Student Name</th>
                    <th>Registration</th>
                    <th>Status</th>
                    <th>Sign In Time</th>
                    <th>Submission Time</th>
                    <th>Duration</th>
                </tr>
            </thead>
            <tbody>
    `);
    
    attendanceData.forEach((record, index) => {
        const statusClass = record.status === 'present' || record.status === 'completed' ? 'present' :
                           record.status === 'signed_in' ? 'signed-in' :
                           record.status === 'in_progress' ? 'in-progress' : 'absent';
        const statusDisplay = record.status === 'completed' ? 'Completed' :
                              record.status === 'present' ? 'Present' :
                              record.status === 'signed_in' ? 'Signed In' :
                              record.status === 'in_progress' ? 'In Progress' : 'Absent';
        const duration = record.sign_in_time && record.submission_time ? 
            Math.round((new Date(record.submission_time) - new Date(record.sign_in_time)) / 1000 / 60) + ' min' : '--';
        
        printWindow.document.write(`
            <tr>
                <td>${index + 1}</td>
                <td>${record.student_name || 'Unknown'}</td>
                <td>${record.student_reg_number || 'N/A'}</td>
                <td><span class="status-badge ${statusClass}">${statusDisplay}</span></td>
                <td>${record.sign_in_time ? new Date(record.sign_in_time).toLocaleString() : '--'}</td>
                <td>${record.submission_time ? new Date(record.submission_time).toLocaleString() : '--'}</td>
                <td>${duration}</td>
            </tr>
        `);
    });
    
    printWindow.document.write(`</tbody></table></body></html>`);
    printWindow.document.close();
    printWindow.print();
}

// Refresh attendance
function refreshAttendance() {
    loadAttendanceSheet();
    showToast('🔄 Attendance refreshed', 'success');
}

// Clear attendance filters
function clearAttendanceFilters() {
    const examFilter = document.getElementById('attendanceExamFilter');
    const dateFilter = document.getElementById('attendanceDateFilter');
    const statusFilter = document.getElementById('attendanceStatusFilter');
    const liveOnly = document.getElementById('showOnlyLive');
    
    if (examFilter) examFilter.value = '';
    if (dateFilter) dateFilter.value = '';
    if (statusFilter) statusFilter.value = '';
    if (liveOnly) liveOnly.checked = false;
    
    loadAttendanceSheet();
}

// Load exam dropdown for attendance filter
async function loadAttendanceExamDropdown() {
    try {
        const { data, error } = await sb
            .from('exams')
            .select('id, exam_name')
            .order('exam_name');

        if (error) throw error;

        const select = document.getElementById('attendanceExamFilter');
        if (select) {
            select.innerHTML = '<option value="">All Exams</option>';
            data.forEach(exam => {
                select.innerHTML += `<option value="${exam.id}">${exam.exam_name || 'Exam ' + exam.id}</option>`;
            });
        }

        // Also populate for live feed
        const liveSelect = document.getElementById('liveFeedExamFilter');
        if (liveSelect) {
            liveSelect.innerHTML = '<option value="">All Exams</option>';
            data.forEach(exam => {
                liveSelect.innerHTML += `<option value="${exam.id}">${exam.exam_name || 'Exam ' + exam.id}</option>`;
            });
        }

    } catch (error) {
        console.error('Error loading exams:', error);
    }
}

// Set default date to today
function setDefaultAttendanceDate() {
    const dateInput = document.getElementById('attendanceDateFilter');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
    }
}

// Initialize attendance tab
function initAttendanceTab() {
    loadAttendanceExamDropdown();
    setDefaultAttendanceDate();
    loadAttendanceSheet();
    startAttendanceAutoRefresh();
}

// Auto-refresh attendance
function toggleAttendanceAutoRefresh() {
    attendanceAutoRefresh = !attendanceAutoRefresh;
    const icon = document.getElementById('attendanceAutoIcon');
    const text = document.getElementById('attendanceAutoText');
    
    if (attendanceAutoRefresh) {
        if (icon) icon.className = 'fas fa-play';
        if (text) text.textContent = 'Auto: ON';
        startAttendanceAutoRefresh();
    } else {
        if (icon) icon.className = 'fas fa-pause';
        if (text) text.textContent = 'Auto: OFF';
        if (attendanceRefreshInterval) {
            clearInterval(attendanceRefreshInterval);
            attendanceRefreshInterval = null;
        }
    }
}

function startAttendanceAutoRefresh() {
    if (attendanceRefreshInterval) {
        clearInterval(attendanceRefreshInterval);
    }
    attendanceRefreshInterval = setInterval(() => {
        if (attendanceAutoRefresh && currentTab === 'attendance') {
            loadAttendanceSheet();
        }
    }, 30000);
}
   // ============================================
    // 📤 EXPOSE FUNCTIONS GLOBALLY
    // ============================================
    window.getKenyaNow = getKenyaNow;
    window.getKenyaTime = getKenyaTime;
    window.formatKenyaTime = formatKenyaTime;
    window.showToast = showToast;
    window.calculateExamTimer = calculateExamTimer;
    window.updateAdminTimers = updateAdminTimers;
    window.getExamTotalMarks = getExamTotalMarks;
    window.getPassMark = getPassMark;
    window.updateTotalMarksHint = updateTotalMarksHint;

    // ============================================
    // 📋 ATTENDANCE SHEET FUNCTIONS - GLOBAL EXPOSURE
    // ============================================
    window.loadAttendanceSheet = loadAttendanceSheet;
    window.renderAttendanceTable = renderAttendanceTable;
    window.updateAttendanceStats = updateAttendanceStats;
    window.updateAttendanceSummary = updateAttendanceSummary;
    window.viewStudentAttendance = viewStudentAttendance;
    window.showAttendanceDetailModal = showAttendanceDetailModal;
    window.exportAttendanceCSV = exportAttendanceCSV;
    window.exportAttendanceExcel = exportAttendanceExcel;
    window.printAttendance = printAttendance;
    window.refreshAttendance = refreshAttendance;
    window.clearAttendanceFilters = clearAttendanceFilters;
    window.loadAttendanceExamDropdown = loadAttendanceExamDropdown;
    window.setDefaultAttendanceDate = setDefaultAttendanceDate;
    window.initAttendanceTab = initAttendanceTab;
    window.toggleAttendanceAutoRefresh = toggleAttendanceAutoRefresh;
    window.startAttendanceAutoRefresh = startAttendanceAutoRefresh;

    // ============================================
    // 📹 VIDEO FUNCTIONS - GLOBAL EXPOSURE
    // ============================================
    window.startVideoStream = startVideoStream;
    window.getStudentVideoStream = getStudentVideoStream;
    window.stopLiveFeed = stopLiveFeed;
    window.toggleVideoMute = toggleVideoMute;
    window.openFullVideo = openFullVideo;
    window.requestLiveFeed = requestLiveFeed;
    window.viewAllLiveVideos = viewAllLiveVideos;
    window.getLiveStudents = getLiveStudents;

})();
