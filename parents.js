/* ===== parents.js - REAL SUPABASE DATA ===== */

// ============================================================
// SUPABASE CONFIGURATION - FROM YOUR SUPERADMIN PORTAL
// ============================================================
const SUPABASE_URL = 'https://lwhtjozfsmbyihenfunw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
// APPLICATION STATE
// ============================================================
let currentStudentId = null;
let currentParentId = null;
let performanceChart = null;
let gradeDistributionChart = null;
let allStudents = [];
let allGrades = [];
let allAttendance = [];

// ============================================================
// DOM REFS
// ============================================================
const $ = id => document.getElementById(id);
const studentSelector = $('studentSelector');
const loadBtn = $('loadStudentBtn');

// ============================================================
// AUTHENTICATION
// ============================================================
async function checkAuth() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
            window.location.href = '/parents-login.html';
            return null;
        }
        
        const { data: parent, error: parentError } = await supabase
            .from('consolidated_user_profiles_table')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('role', 'parent')
            .single();
            
        if (parentError || !parent) {
            console.error('Parent profile not found:', parentError);
            await supabase.auth.signOut();
            window.location.href = '/parents-login.html';
            return null;
        }
        
        currentParentId = parent.user_id;
        updateConnectionStatus(true);
        return parent;
        
    } catch (err) {
        console.error('Auth error:', err);
        updateConnectionStatus(false);
        return null;
    }
}

function updateConnectionStatus(online) {
    const el = $('connectionStatus');
    if (online) {
        el.innerHTML = `<i class="fas fa-circle online"></i> Online`;
        el.style.borderColor = 'rgba(52, 211, 153, 0.3)';
    } else {
        el.innerHTML = `<i class="fas fa-circle offline"></i> Offline`;
        el.style.borderColor = 'rgba(239, 68, 68, 0.3)';
    }
}

// ============================================================
// LOAD STUDENTS LINKED TO THIS PARENT
// ============================================================
async function loadStudentList() {
    try {
        if (!currentParentId) return;
        
        const { data: students, error } = await supabase
            .from('student_parents')
            .select(`
                student_id,
                students:student_id (
                    user_id,
                    full_name,
                    student_id as admission_number,
                    program,
                    current_block,
                    intake_year,
                    email,
                    gpa
                )
            `)
            .eq('parent_id', currentParentId)
            .eq('status', 'active');

        if (error) throw error;
        
        if (!students || students.length === 0) {
            studentSelector.innerHTML = `<option value="">No students linked</option>`;
            return;
        }

        allStudents = students.map(sp => sp.students).filter(s => s);
        
        studentSelector.innerHTML = allStudents.map(s => 
            `<option value="${s.user_id}">👤 ${s.full_name} (${s.program} · ${s.current_block || 'N/A'})</option>`
        ).join('');

        if (allStudents.length > 0) {
            currentStudentId = allStudents[0].user_id;
            loadStudentData(currentStudentId);
        }
        
    } catch (err) {
        console.error('Failed to load students:', err);
        studentSelector.innerHTML = `<option value="">Error loading students</option>`;
        showToast('Error loading students', 'error');
    }
}

// ============================================================
// LOAD STUDENT DATA - REAL TABLES FROM YOUR SUPERADMIN
// ============================================================
async function loadStudentData(studentId) {
    if (!studentId) return;
    currentStudentId = studentId;
    showLoading(true);

    try {
        // 1. Get student profile
        const { data: profile, error: profileError } = await supabase
            .from('consolidated_user_profiles_table')
            .select('*')
            .eq('user_id', studentId)
            .single();

        if (profileError) throw profileError;

        // 2. Get grades from exam_grades (matches your superadmin)
        const { data: grades, error: gradesError } = await supabase
            .from('exam_grades')
            .select(`
                *,
                exams:exam_id (
                    title,
                    exam_name,
                    exam_type,
                    block,
                    marks_out_of,
                    pass_mark,
                    subject_name,
                    unit_code
                )
            `)
            .eq('student_id', studentId)
            .order('graded_at', { ascending: false });

        if (gradesError) throw gradesError;
        allGrades = grades || [];

        // 3. Get attendance
        const { data: attendance, error: attError } = await supabase
            .from('geo_attendance_logs')
            .select('*')
            .eq('student_id', studentId)
            .order('check_in_time', { ascending: false })
            .limit(50);

        if (attError) throw attError;
        allAttendance = attendance || [];

        // 4. Get finance data
        const { data: finance, error: finError } = await supabase
            .from('student_finance')
            .select('*')
            .eq('student_id', studentId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1);

        if (finError) throw finError;

        // 5. Get upcoming exams
        const today = new Date().toISOString();
        const { data: upcomingExams, error: examError } = await supabase
            .from('exams')
            .select('*')
            .eq('target_program', profile.program)
            .eq('status', 'published')
            .gte('exam_date', today)
            .order('exam_date', { ascending: true });

        if (examError) throw examError;

        // 6. Get registered units
        const { data: registrations, error: regError } = await supabase
            .from('student_unit_registrations')
            .select('*')
            .eq('student_id', studentId);

        if (regError) throw regError;

        // Render everything
        renderProfile(profile);
        renderStats(profile, grades, registrations, upcomingExams);
        renderGradesTable(grades);
        renderAttendanceTable(attendance);
        renderFinance(finance ? finance[0] : null);
        renderTranscript(grades, profile);
        updateCharts(grades);
        updateGradeDistribution(grades);
        updateTranscriptStats(grades);

    } catch (err) {
        console.error('Error loading student data:', err);
        showToast('Error loading student data: ' + err.message, 'error');
    } finally {
        showLoading(false);
    }
}

// ============================================================
// RENDER FUNCTIONS
// ============================================================

function renderProfile(profile) {
    if (!profile) return;
    $('studentNameDisplay').textContent = profile.full_name || '—';
    $('studentIdDisplay').textContent = profile.student_id || '—';
    $('studentProgramDisplay').textContent = profile.program || '—';
    $('studentBlockDisplay').textContent = profile.current_block || '—';
    $('studentGpaDisplay').textContent = profile.gpa ? profile.gpa.toFixed(2) : '—';
}

function renderStats(profile, grades, registrations, upcomingExams) {
    // Attendance
    const total = profile.total_sessions || 0;
    const present = profile.present_sessions || 0;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    $('attendanceRate').textContent = total > 0 ? rate + '%' : '—';
    $('attendanceSub').textContent = total > 0 ? `${present} / ${total} sessions` : 'No data';

    // Units
    const completed = registrations ? registrations.filter(r => r.status === 'approved' || r.status === 'completed').length : 0;
    const totalUnits = registrations ? registrations.length : 0;
    $('unitsCompleted').textContent = totalUnits > 0 ? completed : '—';
    $('unitsSub').textContent = totalUnits > 0 ? `of ${totalUnits} total` : 'No data';

    // GPA
    const gpa = profile.gpa || 0;
    $('gpaDisplay').textContent = gpa > 0 ? gpa.toFixed(2) : '—';
    $('gpaSub').textContent = gpa > 0 ? (gpa >= 3.5 ? '📈 Excellent' : gpa >= 2.5 ? '✅ Good' : '📊 Needs Improvement') : '—';

    // Exams
    const upcoming = upcomingExams ? upcomingExams.length : 0;
    $('upcomingExams').textContent = upcoming > 0 ? upcoming : '0';
    $('examSub').textContent = upcoming > 0 ? `Next: ${upcomingExams[0]?.exam_date || 'TBD'}` : 'No upcoming exams';

    // Tasks (pending registrations)
    const pending = registrations ? registrations.filter(r => r.status === 'pending').length : 0;
    $('pendingTasks').textContent = pending;
    $('taskSub').textContent = pending > 0 ? `${pending} pending approvals` : 'All caught up';
}

// ============================================================
// GRADES TABLE - MATCHES YOUR SUPERADMIN TABLE
// ============================================================
function renderGradesTable(grades) {
    const tbody = $('unitGradesTable');
    if (!tbody) return;

    if (!grades || grades.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted">No grades available</td></tr>`;
        return;
    }

    let passed = 0, failed = 0, retakes = 0;
    let totalScore = 0;

    tbody.innerHTML = grades.map(g => {
        const exam = g.exams || {};
        const total = g.total_score || g.exam_score || 0;
        const isPassing = total >= 60;
        const gradeLetter = g.grade || (isPassing ? (total >= 85 ? 'A' : total >= 75 ? 'B' : 'C') : 'D');
        const status = g.result_status || (isPassing ? 'Pass' : 'Fail');
        const retakeCount = g.retake_count || 0;
        
        if (isPassing) passed++;
        else failed++;
        if (retakeCount > 0) retakes++;
        totalScore += total;

        const statusClass = status === 'Pass' || status === 'Approved' ? 'pass' : 
                           status === 'Fail' || status === 'Rejected' ? 'fail' : 'pending';

        return `
            <tr>
                <td><strong>${exam.unit_code || g.subject_name || '-'}</strong></td>
                <td>${exam.title || exam.exam_name || g.subject_name || '-'}</td>
                <td>${exam.marks_out_of || 100}</td>
                <td>${g.cat_1_score || '-'}</td>
                <td>${g.cat_2_score || '-'}</td>
                <td>${g.exam_score || '-'}</td>
                <td><strong>${total > 0 ? total + '%' : '-'}</strong></td>
                <td><strong>${gradeLetter}</strong></td>
                <td><span class="status-badge ${statusClass}">${status}</span></td>
                <td>${retakeCount > 0 ? `⭐ R${retakeCount}` : '-'}</td>
            </tr>
        `;
    }).join('');

    // Update stats
    const avg = grades.length > 0 ? Math.round(totalScore / grades.length) : 0;
    $('passedCount').textContent = passed;
    $('failedCount').textContent = failed;
    $('retakeCount').textContent = retakes;
    $('avgScore').textContent = avg + '%';
}

// ============================================================
// ATTENDANCE TABLE
// ============================================================
function renderAttendanceTable(attendance) {
    const tbody = $('attendanceTable');
    if (!tbody) return;

    if (!attendance || attendance.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No attendance records</td></tr>`;
        return;
    }

    let present = 0, absent = 0, pending = 0;

    tbody.innerHTML = attendance.slice(0, 30).map(a => {
        const status = a.is_verified ? 'Present' : (a.status || 'Pending');
        if (status === 'Present') present++;
        else if (status === 'Absent') absent++;
        else pending++;

        const statusClass = status === 'Present' ? 'pass' : status === 'Absent' ? 'fail' : 'pending';

        return `
            <tr>
                <td>${a.check_in_time ? new Date(a.check_in_time).toLocaleDateString() : '-'}</td>
                <td>${a.session_type || '-'}</td>
                <td><span class="status-badge ${statusClass}">${status}</span></td>
                <td>${a.location_name || a.target_name || '-'}</td>
                <td>${a.is_verified ? '✅ Yes' : '❌ No'}</td>
            </tr>
        `;
    }).join('');

    const total = present + absent + pending;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    $('presentCount').textContent = present;
    $('absentCount').textContent = absent;
    $('pendingAttendance').textContent = pending;
    $('attendanceRateDisplay').textContent = rate + '%';
}

// ============================================================
// FINANCE
// ============================================================
function renderFinance(finance) {
    if (!finance) {
        ['financeDue', 'financePaid', 'financeOutstanding', 'financeStatus'].forEach(id => $(id).textContent = '—');
        $('financeProgressText').textContent = '0%';
        $('financeProgressFill').style.width = '0%';
        return;
    }
    const due = finance.total_fees || 0;
    const paid = finance.amount_paid || 0;
    const outstanding = due - paid;
    const pct = due > 0 ? Math.round((paid / due) * 100) : 0;

    $('financeDue').textContent = `KES ${due.toLocaleString()}`;
    $('financePaid').textContent = `KES ${paid.toLocaleString()}`;
    $('financeOutstanding').textContent = `KES ${outstanding.toLocaleString()}`;
    $('financeStatus').textContent = outstanding <= 0 ? '✅ Paid in Full' : '⏳ Partial';
    $('financeProgressText').textContent = pct + '%';
    $('financeProgressFill').style.width = pct + '%';
}

// ============================================================
// TRANSCRIPT
// ============================================================
function renderTranscript(grades, profile) {
    const tbody = $('transcriptTable');
    if (!tbody) return;

    if (!grades || grades.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No transcript data available</td></tr>`;
        return;
    }

    tbody.innerHTML = grades.map(g => {
        const exam = g.exams || {};
        const total = g.total_score || g.exam_score || 0;
        const isPassing = total >= 60;
        const gradeLetter = g.grade || (isPassing ? (total >= 85 ? 'A' : total >= 75 ? 'B' : 'C') : 'D');
        const points = isPassing ? (total >= 85 ? 4 : total >= 75 ? 3 : 2) : 0;
        const credits = exam.marks_out_of || 3;

        return `
            <tr>
                <td>${profile?.intake_year || 'N/A'}</td>
                <td>${exam.unit_code || g.subject_name || '-'}</td>
                <td>${exam.title || exam.exam_name || '-'}</td>
                <td>${credits}</td>
                <td><strong>${gradeLetter}</strong></td>
                <td>${points}</td>
                <td><span class="status-badge ${isPassing ? 'pass' : 'fail'}">${isPassing ? 'Pass' : 'Fail'}</span></td>
            </tr>
        `;
    }).join('');
}

function updateTranscriptStats(grades) {
    if (!grades || grades.length === 0) {
        $('totalCredits').textContent = '0';
        $('creditsEarned').textContent = '0';
        $('cumulativeGPA').textContent = '0.00';
        return;
    }

    let totalCredits = 0;
    let earnedCredits = 0;
    let totalPoints = 0;

    grades.forEach(g => {
        const exam = g.exams || {};
        const total = g.total_score || g.exam_score || 0;
        const isPassing = total >= 60;
        const credits = exam.marks_out_of || 3;
        const points = isPassing ? (total >= 85 ? 4 : total >= 75 ? 3 : 2) : 0;

        totalCredits += credits;
        if (isPassing) {
            earnedCredits += credits;
            totalPoints += points * credits;
        }
    });

    const gpa = earnedCredits > 0 ? (totalPoints / earnedCredits) : 0;

    $('totalCredits').textContent = totalCredits;
    $('creditsEarned').textContent = earnedCredits;
    $('cumulativeGPA').textContent = gpa.toFixed(2);
}

// ============================================================
// CHARTS
// ============================================================
function updateCharts(grades) {
    const ctx = document.getElementById('performanceChart')?.getContext('2d');
    if (!ctx) return;

    if (performanceChart) performanceChart.destroy();

    if (!grades || grades.length === 0) {
        performanceChart = new Chart(ctx, {
            type: 'bar',
            data: { labels: ['No Data'], datasets: [{ label: 'No scores', data: [0], backgroundColor: '#e5e7eb' }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
        return;
    }

    const sorted = [...grades].reverse();
    const labels = sorted.map(g => g.exams?.unit_code || g.subject_name || 'Unit');
    const cat1 = sorted.map(g => g.cat_1_score || 0);
    const cat2 = sorted.map(g => g.cat_2_score || 0);
    const exam = sorted.map(g => g.exam_score || 0);
    const total = sorted.map(g => g.total_score || g.exam_score || 0);

    performanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'CAT 1', data: cat1, backgroundColor: 'rgba(59,130,246,0.7)', borderRadius: 4 },
                { label: 'CAT 2', data: cat2, backgroundColor: 'rgba(16,185,129,0.7)', borderRadius: 4 },
                { label: 'Final', data: exam, backgroundColor: 'rgba(253,185,19,0.7)', borderRadius: 4 },
                { label: 'Total', data: total, type: 'line', borderColor: '#4C1D95', backgroundColor: 'rgba(76,29,149,0.1)', borderWidth: 2, pointRadius: 4, tension: 0.3, fill: true }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { font: { size: 10 }, boxWidth: 12, padding: 10 } }
            },
            scales: {
                y: { beginAtZero: true, max: 100, ticks: { font: { size: 9 }, callback: v => v + '%' } },
                x: { ticks: { font: { size: 9 } } }
            }
        }
    });
}

function updateGradeDistribution(grades) {
    const ctx = document.getElementById('gradeDistributionChart')?.getContext('2d');
    if (!ctx) return;

    if (gradeDistributionChart) gradeDistributionChart.destroy();

    if (!grades || grades.length === 0) {
        gradeDistributionChart = new Chart(ctx, {
            type: 'pie',
            data: { labels: ['No Data'], datasets: [{ data: [1], backgroundColor: ['#e5e7eb'] }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
        return;
    }

    let distinction = 0, credit = 0, pass = 0, fail = 0;

    grades.forEach(g => {
        const total = g.total_score || g.exam_score || 0;
        if (total >= 85) distinction++;
        else if (total >= 75) credit++;
        else if (total >= 60) pass++;
        else fail++;
    });

    $('distinctionCount').textContent = distinction;
    $('creditCount').textContent = credit;
    $('passCount').textContent = pass;
    $('failCount').textContent = fail;

    gradeDistributionChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: [`Distinction (≥85%) ${distinction}`, `Credit (75-84%) ${credit}`, `Pass (60-74%) ${pass}`, `Fail (<60%) ${fail}`],
            datasets: [{ data: [distinction, credit, pass, fail], backgroundColor: ['#059669', '#3B82F6', '#FDB913', '#dc2626'] }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { padding: 10, usePointStyle: true } } }
        }
    });
}

// ============================================================
// TAB SWITCHING
// ============================================================
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    const target = document.getElementById(`tab-${tabName}`);
    if (target) target.classList.add('active');
    
    const btn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    if (btn) btn.classList.add('active');
}

// ============================================================
// EXPORT TRANSCRIPT PDF
// ============================================================
function exportTranscriptPDF() {
    const content = document.getElementById('transcriptContainer');
    if (!content) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html><head><title>Transcript</title>
        <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background: #0A3D62; color: white; padding: 10px; text-align: left; }
            td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; }
            h2 { color: #0A3D62; }
            .header { text-align: center; margin-bottom: 30px; }
        </style>
        </head><body>
        <div class="header">
            <h2>Nakuru College of Health Sciences and Management</h2>
            <p>Academic Transcript</p>
            <p><strong>Student:</strong> ${$('studentNameDisplay').textContent}</p>
            <p><strong>Program:</strong> ${$('studentProgramDisplay').textContent}</p>
        </div>
        ${content.innerHTML}
        <p style="margin-top: 30px; font-size: 12px; color: #94a3b8;">Generated on ${new Date().toLocaleString()}</p>
        </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
}

// ============================================================
// CLOCK
// ============================================================
function updateClock() {
    const now = new Date();
    $('liveClock').innerHTML = `<i class="fas fa-clock"></i> ${now.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
}
setInterval(updateClock, 1000);
updateClock();

// ============================================================
// LOADING / TOAST
// ============================================================
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay') || (() => {
        const el = document.createElement('div');
        el.id = 'loadingOverlay';
        el.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;flex-direction:column;';
        el.innerHTML = '<div style="width:40px;height:40px;border:4px solid #fff;border-top-color:#FDB913;border-radius:50%;animation:spin 0.8s linear infinite;"></div><p style="color:#fff;margin-top:16px;font-weight:500;">Loading...</p>';
        document.body.appendChild(el);
        return el;
    })();
    
    overlay.style.display = show ? 'flex' : 'none';
}

function showToast(message, type = 'info') {
    const colors = { success: '#10b981', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };
    const toast = document.createElement('div');
    toast.style.cssText = `
        position:fixed;bottom:30px;right:30px;padding:12px 20px;border-radius:10px;
        background:${colors[type] || '#3b82f6'};color:white;font-weight:500;
        z-index:10000;box-shadow:0 4px 12px rgba(0,0,0,0.15);max-width:400px;
        animation:slideUp 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// ============================================================
// EVENT LISTENERS
// ============================================================
loadBtn.addEventListener('click', () => {
    const selected = studentSelector.value;
    if (selected) loadStudentData(selected);
});

studentSelector.addEventListener('change', () => {
    // Auto-load on change
    loadStudentData(studentSelector.value);
});

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = '/parents-login.html';
});

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', async function() {
    const parent = await checkAuth();
    if (parent) {
        await loadStudentList();
    }
});

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    .tabs-header { display: flex; gap: 6px; margin-bottom: 20px; background: white; padding: 8px 12px; border-radius: 12px; border: 1px solid #e5e7eb; flex-wrap: wrap; }
    .tab-btn { padding: 10px 20px; border: none; background: transparent; border-radius: 8px; cursor: pointer; font-weight: 500; font-size: 0.85rem; color: #6b7280; transition: 0.2s; }
    .tab-btn:hover { background: #f1f5f9; }
    .tab-btn.active { background: #4C1D95; color: white; }
`;
document.head.appendChild(style);
