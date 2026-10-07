/*******************************************************
 * 13. EXAMS/CATS MANAGEMENT — COMPLETE WITH EMAIL NOTIFICATIONS
 * ✅ Units sourced from units_catalog
 * ✅ Auto-generated name for Main Exams
 * ✅ Block-independent Course/Unit search
 * ✅ 13-column table (Type…Purpose…Status…Actions)
 * ✅ Tolerant student filtering (block + intake)
 * ✅ Grade weighting: 30% CATs + 70% Exam
 * ✅ Defensive edit-modal handling
 * ✅ Fixed: DOM global alias (no ReferenceError)
 * ✅ Fixed: EXAM_CONFIG scoped inside IIFE (no redeclare)
 *******************************************************/

// ============================================================
// GLOBAL DOM ALIAS — shared with script.js and other modules
// ============================================================
window.DOM = window.DOM || {};
// Make a top-level alias so any bare `DOM.` in this file resolves.
var DOM = window.DOM;

// ============================================
// FEEDBACK TOAST
// ============================================
function showFeedback(message, type = 'info') {
    const colors = { success: '#10b981', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };
    document.querySelectorAll('.exam-feedback-toast').forEach(el => el.remove());
    const toast = document.createElement('div');
    toast.className = 'exam-feedback-toast';
    toast.textContent = message;
    toast.style.cssText = `position:fixed;right:24px;bottom:24px;z-index:99999;max-width:420px;padding:13px 18px;background:${colors[type] || colors.info};color:#fff;border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,.18);font-size:13px;font-weight:600;line-height:1.45;opacity:0;transform:translateY(10px);transition:opacity .2s ease,transform .2s ease;`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; toast.style.transform = 'translateY(0)'; });
    setTimeout(() => {
        toast.style.opacity = '0'; toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 220);
    }, type === 'error' ? 5000 : 3500);
}
window.showFeedback = window.showFeedback || showFeedback;

// ============================================
// CACHE + CONFIG — encapsulated to avoid global collisions
// (Fix for: "Identifier 'EXAM_CONFIG' has already been declared")
// ============================================
const ExamCache = (function () {
    const EXAM_CONFIG = { CACHE_TTL: 60000, BATCH_SIZE: 50, DEBOUNCE_DELAY: 300 };
    const _cache = {};

    return {
        get(key) {
            const item = _cache[key];
            if (!item) return null;
            if (Date.now() - item.timestamp > EXAM_CONFIG.CACHE_TTL) {
                delete _cache[key];
                return null;
            }
            return item.data;
        },
        set(key, data) { _cache[key] = { data, timestamp: Date.now() }; },
        clear() { Object.keys(_cache).forEach(k => delete _cache[k]); }
    };
})();
window.ExamCache = ExamCache;

// ============================================
// DOM CACHE
// ============================================
function cacheDomElements() {
    window.DOM = window.DOM || {};
    const D = window.DOM;
    D.examsTbody = document.getElementById('exams-table-body');
    D.studentExams = document.getElementById('student-exams');
    D.examSearch = document.getElementById('exam-search');
    D.programFilter = document.getElementById('exam_filter_program');
    D.statusFilter = document.getElementById('exam_filter_status');
    D.monthFilter = document.getElementById('exam_filter_intake_month');
    D.examForm = document.getElementById('add-exam-form-enhanced');
    D.classSelector = document.getElementById('exam_class_selector');
    D.courseSelect = document.getElementById('exam_course_id');
}

function debounce(fn, delay = 300) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}
window.debounce = debounce;

// ============================================
// NORMALIZER
// ============================================
function _normKey(s) {
    return String(s || '').trim().toLowerCase().replace(/[_\s]+/g, ' ').replace(/\s+block$|\s+term$/, '');
}

// ============================================
// EMAIL
// ============================================
async function sendEmailWithBrevo(to, subject, htmlContent) {
    try {
        const supabase = window.sb || window.supabase;
        if (!supabase) return { success: false, error: 'Supabase not available' };
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) return await sendEmailWithEdgeFunctionFallback(to, subject, htmlContent);
        const response = await fetch('https://lwhtjozfsmbyihenfunw.supabase.co/functions/v1/send-email', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ to, subject, html: htmlContent, from: 'NCHSM Exam Office <noreply@nakurucollegeofhealthelearning.site>' })
        });
        const data = await response.json();
        return response.ok && data.success ? { success: true, data } : { success: false, error: data.error || 'Unknown error' };
    } catch (error) {
        return await sendEmailWithEdgeFunctionFallback(to, subject, htmlContent);
    }
}

async function sendEmailWithEdgeFunctionFallback(to, subject, htmlContent) {
    try {
        const response = await fetch('https://lwhtjozfsmbyihenfunw.supabase.co/functions/v1/send-email', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ to, subject, html: htmlContent, from: 'NCHSM Exam Office <noreply@nakurucollegeofhealthelearning.site>' })
        });
        const data = await response.json();
        return response.ok && data.success ? { success: true, data } : { success: false, error: data.error || 'Unknown error' };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function sendExamNotificationEmail(examData, recipients) {
    if (!recipients || recipients.length === 0) return { sent: 0, total: 0, failed: 0 };
    const examDate = examData.exam_date ? new Date(examData.exam_date).toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'TBD';
    const examTime = examData.exam_start_time || 'TBD';
    const examLink = examData.online_link || examData.exam_link || '#';
    const examTitle = examData.title || examData.exam_name || 'New Exam';
    const examType = examData.exam_type || 'EXAM';
    const examTypeLabel = getExamTypeLabel(examType);
    const emailHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
        body{font-family:'Segoe UI',Tahoma,sans-serif;margin:0;padding:0;background:#f0f4f8;}
        .container{max-width:580px;margin:0 auto;padding:20px;}
        .card{background:white;border-radius:20px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.1);}
        .header{background:linear-gradient(135deg,#0A3D62,#1a5276);padding:30px 35px;text-align:center;color:white;}
        .header h1{margin:0;font-size:24px;}
        .header p{margin:4px 0 0;opacity:0.8;}
        .body{padding:30px 35px;}
        .greeting{background:#e8f4f8;border-radius:12px;padding:16px;margin-bottom:20px;border-left:4px solid #10b981;}
        .greeting p{margin:0;font-size:16px;color:#0A3D62;}
        .details{background:#f8fafc;border-radius:12px;padding:16px;margin-bottom:20px;}
        .details h4{margin:0 0 12px 0;color:#1e293b;}
        .details table{width:100%;border-collapse:collapse;font-size:14px;}
        .details td{padding:8px 0;border-bottom:1px solid #e2e8f0;}
        .details .label{color:#64748B;font-weight:500;}
        .details .value{color:#0A3D62;font-weight:600;text-align:right;}
        .details tr:last-child td{border-bottom:none;}
        .btn{display:inline-block;background:#0A3D62;color:white;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:16px;}
        .footer{background:#F8FAFC;padding:20px;text-align:center;border-top:1px solid #E2E8F0;font-size:0.85rem;color:#64748B;}
    </style></head><body><div class="container"><div class="card">
    <div class="header"><h1>📝 ${examTypeLabel} Posted!</h1><p>Nakuru College of Health Sciences and Management</p></div>
    <div class="body"><div class="greeting"><p>👋 <strong>Dear Student,</strong></p><p style="margin:8px 0 0;color:#1e293b;">A new exam has been posted for your program. Please review the details below.</p></div>
    <div class="details"><h4>📋 Exam Details</h4><table>
    <tr><td class="label">📝 Exam Title</td><td class="value"><strong>${escapeHtml(examTitle)}</strong></td></tr>
    <tr><td class="label">🎓 Program</td><td class="value">${escapeHtml(examData.target_program || examData.program_type || 'N/A')}</td></tr>
    <tr><td class="label">📚 Block/Term</td><td class="value">${escapeHtml(examData.block || 'N/A')}</td></tr>
    <tr><td class="label">📅 Date</td><td class="value">${examDate}</td></tr>
    <tr><td class="label">⏰ Time</td><td class="value">${examTime}</td></tr>
    <tr><td class="label">⏱️ Duration</td><td class="value">${examData.duration_minutes || 'N/A'} minutes</td></tr>
    <tr><td class="label">📊 Total Marks</td><td class="value">${examData.marks_out_of || examData.total_marks || 100}</td></tr>
    <tr><td class="label">✅ Pass Mark</td><td class="value">${examData.pass_mark || 50}%</td></tr>
    ${examLink && examLink !== '#' ? '<tr><td class="label">🔗 Exam Link</td><td class="value"><a href="' + escapeHtml(examLink) + '" target="_blank">Click Here</a></td></tr>' : ''}
    </table></div>
    ${examLink && examLink !== '#' ? '<div style="text-align:center;margin:20px 0;"><a href="' + escapeHtml(examLink) + '" target="_blank" class="btn">🚪 Take Exam</a></div>' : ''}
    <div style="background:#fef3c7;border-radius:12px;padding:12px 16px;border-left:4px solid #f59e0b;margin-top:16px;"><p style="margin:0;font-size:13px;color:#78350F;"><strong>Important:</strong> Please ensure you have a stable internet connection before starting the exam.</p></div>
    </div><div class="footer"><p>📞 +254 790 969 743 &nbsp;|&nbsp; 📧 admin@nchsm.co.ke</p><p style="font-size:0.75rem;">© ${new Date().getFullYear()} Nakuru College of Health Sciences and Management</p></div>
    </div></div></body></html>`;
    let sentCount = 0, failedCount = 0;
    for (const student of recipients) {
        if (!student.email) { failedCount++; continue; }
        try {
            const result = await sendEmailWithBrevo(student.email, `📝 ${examTypeLabel}: ${examTitle}`, emailHtml);
            if (result.success) sentCount++; else failedCount++;
            await new Promise(r => setTimeout(r, 200));
        } catch (error) { failedCount++; }
    }
    try {
        const supabase = window.sb || window.supabase;
        if (supabase) await supabase.from('exam_notifications').insert([{
            exam_id: examData.id, recipients: recipients.length, sent_count: sentCount,
            failed_count: failedCount, sent_at: new Date().toISOString()
        }]);
    } catch (error) { console.warn('Could not save notification record:', error); }
    return { sent: sentCount, failed: failedCount, total: recipients.length };
}

// ============================================
// STUDENT NOTIFICATION SELECTION
// ============================================
let selectedStudentsForNotification = [];
let allStudentsForProgram = [];

document.addEventListener('DOMContentLoaded', function () {
    document.addEventListener('change', function (e) {
        if (e.target && e.target.id === 'exam_notify_target') {
            const container = document.getElementById('specific_students_container');
            if (container) container.style.display = e.target.value === 'specific' ? 'block' : 'none';
        }
    });
});

function getSelectedNotificationBlocks() {
    const blocks = [];
    const select = document.getElementById('exam_block_term');
    if (select) {
        const opt = select.selectedOptions?.[0];
        let value = String(select.value || '').trim();
        let text = String(opt?.textContent || '').trim();
        if (!value && text && !/^--\s*select/i.test(text)) value = text;
        if (value) blocks.push(value);
    }
    if (!blocks.length) {
        document.querySelectorAll('.exam-class-checkbox:checked').forEach(cb => {
            const v = String(cb.value || '').trim();
            if (v) blocks.push(v);
        });
    }
    return [...new Set(blocks.map(v => _normKey(v)))];
}

async function loadStudentsForNotification() {
    const program = document.getElementById('exam_program')?.value || '';
    const blocks = getSelectedNotificationBlocks();
    console.log('📋 Loading students for notification:', { program, blocks });

    const countEl = document.getElementById('student_notify_count');

    if (!program || !blocks.length) {
        allStudentsForProgram = [];
        if (countEl) countEl.textContent = '0 students';
        updateSelectedStudentsDisplay();
        return;
    }

    try {
        const supabase = window.sb || window.supabase;
        if (!supabase) throw new Error('Supabase client not available');

        const { data, error } = await supabase
            .from('consolidated_user_profiles_table')
            .select('user_id, full_name, email, program, intake_year, intake_month, block, current_block, status')
            .eq('role', 'student')
            .eq('status', 'approved')
            .eq('program', program)
            .limit(1000);

        if (error) throw error;

        const wanted = new Set(blocks);
        allStudentsForProgram = (data || []).filter(student => {
            const effectiveBlock = _normKey(student.current_block || student.block);
            return wanted.has(effectiveBlock);
        });

        console.log(`✅ Loaded ${allStudentsForProgram.length} students for ${program} / ${blocks.join(', ')}`);
        if (countEl) countEl.textContent = `${allStudentsForProgram.length} students`;
        updateSelectedStudentsDisplay();
        searchStudentsForNotification();
    } catch (error) {
        console.error('❌ Error loading students:', error);
        allStudentsForProgram = [];
        if (countEl) countEl.textContent = '0 students';
        updateSelectedStudentsDisplay();
    }
}

function searchStudentsForNotification() {
    const searchTerm = document.getElementById('exam_student_search')?.value?.toLowerCase() || '';
    const resultsContainer = document.getElementById('student_search_results');
    if (!resultsContainer) return;
    let filtered = searchTerm
        ? allStudentsForProgram.filter(s => (s.full_name || '').toLowerCase().includes(searchTerm) || (s.email || '').toLowerCase().includes(searchTerm))
        : allStudentsForProgram;
    if (filtered.length === 0) {
        resultsContainer.innerHTML = '<div style="padding:8px;color:#94a3b8;text-align:center;">No students found</div>';
        resultsContainer.style.display = 'block'; return;
    }
    let html = '';
    filtered.slice(0, 20).forEach(student => {
        const isSelected = selectedStudentsForNotification.some(s => s.user_id === student.user_id);
        html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;border-bottom:1px solid #f1f5f9;${isSelected ? 'background:#dbeafe;' : ''}">
        <div><strong style="font-size:13px;">${escapeHtml(student.full_name)}</strong><span style="font-size:11px;color:#6b7280;margin-left:8px;">${escapeHtml(student.email)}</span></div>
        <button onclick="toggleStudentForNotification('${student.user_id}')" style="padding:2px 12px;border:none;border-radius:4px;cursor:pointer;font-size:11px;background:${isSelected ? '#dc2626' : '#059669'};color:white;">${isSelected ? 'Remove' : 'Add'}</button></div>`;
    });
    if (filtered.length > 20) html += `<div style="padding:6px;text-align:center;color:#94a3b8;font-size:12px;">+ ${filtered.length - 20} more students</div>`;
    resultsContainer.innerHTML = html; resultsContainer.style.display = 'block';
}

function toggleStudentForNotification(studentId) {
    const student = allStudentsForProgram.find(s => s.user_id === studentId);
    if (!student) return;
    const index = selectedStudentsForNotification.findIndex(s => s.user_id === studentId);
    if (index > -1) selectedStudentsForNotification.splice(index, 1);
    else selectedStudentsForNotification.push(student);
    updateSelectedStudentsDisplay(); searchStudentsForNotification();
}

function updateSelectedStudentsDisplay() {
    const container = document.getElementById('selected_students_list');
    if (!container) return;
    if (!selectedStudentsForNotification.length) {
        container.innerHTML = '<span style="font-size:12px;color:#94a3b8;"><i class="fas fa-info-circle"></i> No students selected</span>'; return;
    }
    container.innerHTML = selectedStudentsForNotification.map(student =>
        `<span style="background:#dbeafe;color:#1e40af;padding:2px 10px;border-radius:16px;font-size:12px;display:inline-flex;align-items:center;gap:4px;margin:2px;">${escapeHtml(student.full_name)}<span onclick="toggleStudentForNotification('${student.user_id}')" style="cursor:pointer;color:#dc2626;font-weight:700;margin-left:4px;">&times;</span></span>`
    ).join('');
}

// ============================================
// LOAD EXAMS
// ============================================
async function loadExams(forceRefresh = false) {
    cacheDomElements();
    const D = window.DOM;
    if (!D.examsTbody) return;
    if (!forceRefresh) {
        const cached = ExamCache.get('exams_list');
        if (cached) { renderExamsTable(cached); renderStudentExams(cached); updateExamStats(cached); return; }
    }
    D.examsTbody.innerHTML = `<tr><td colspan="13" style="padding:40px;text-align:center;color:#94a3b8;"><div class="loading-spinner" style="margin:0 auto 12px;"></div><p style="margin-top:10px;font-size:13px;">Loading exams...</p></td></tr>`;
    try {
        const supabase = window.sb || window.supabase;
        if (!supabase) throw new Error('Supabase client not available');

        const { data: exams, error } = await supabase
            .from('exams').select('*')
            .order('created_at', { ascending: false })
            .limit(200);
        if (error) throw error;

        // Load units_catalog and build lookup maps
        const { data: allUnits, error: unitsError } = await supabase
            .from('units_catalog')
            .select('id, unit_code, unit_name, program, block, status')
            .eq('status', 'active');

        if (unitsError) {
            console.error('Error fetching units:', unitsError);
        } else {
            const byId = {}, byCode = {}, byName = {};
            (allUnits || []).forEach(u => {
                byId[String(u.id)] = u;
                if (u.unit_code) byCode[String(u.unit_code).trim().toUpperCase()] = u;
                if (u.unit_name) byName[String(u.unit_name).trim().toUpperCase()] = u;
            });

            window._courseMap = byId;
            window._unitByCode = byCode;
            window._unitByName = byName;

            let attached = 0;
            (exams || []).forEach(exam => {
                let unit = null;

                if (exam.course_id) {
                    unit = byCode[String(exam.course_id).trim().toUpperCase()];
                }
                if (!unit && exam.course_id) {
                    unit = byId[String(exam.course_id)];
                }
                if (!unit && exam.course_code) {
                    unit = byCode[String(exam.course_code).trim().toUpperCase()];
                }
                if (!unit && (exam.exam_name || exam.title)) {
                    const titleN = String(exam.exam_name || exam.title).trim().toUpperCase();
                    unit = byName[titleN];
                }

                if (unit) {
                    exam.course = {
                        id: unit.id,
                        unit_code: unit.unit_code,
                        unit_name: unit.unit_name,
                        course_name: unit.unit_name,
                        name: unit.unit_name,
                        target_program: unit.program,
                        block: unit.block
                    };
                    exam._resolved_unit = unit;
                    attached++;
                }
            });

            console.log(`✅ Loaded ${allUnits?.length || 0} units from units_catalog`);
            console.log(`✅ Attached unit data to ${attached} exams`);
        }

        ExamCache.set('exams_list', exams || []);
        renderExamsTable(exams || []);
        renderStudentExams(exams || []);
        updateExamStats(exams || []);

    } catch (error) {
        console.error('Error loading exams:', error);
        D.examsTbody.innerHTML = `<tr><td colspan="13" style="padding:30px;text-align:center;color:#dc2626;font-size:13px;"><i class="fas fa-exclamation-circle"></i> Failed: ${escapeHtml(error.message)}<br><button onclick="loadExams(true)" style="margin-top:10px;padding:6px 16px;background:#7c3aed;color:white;border:none;border-radius:6px;cursor:pointer;"><i class="fas fa-sync-alt"></i> Retry</button></td></tr>`;
    }
}

function updateExamStats(exams) {
    const statValues = document.querySelectorAll('.exam-stat-value');
    if (statValues && statValues.length >= 4) {
        statValues[0].textContent = exams.length;
        statValues[1].textContent = exams.filter(e => e.status === 'published' || e.status === 'Published').length;
        statValues[2].textContent = exams.filter(e => e.status === 'InProgress' || e.status === 'In Progress').length;
        statValues[3].textContent = exams.filter(e => e.status === 'Draft' || e.status === 'draft' || !e.status).length;
    }
}

function getStatusBadge(status) {
    const statusMap = {
        Published: { bg: '#d1fae5', color: '#065f46', icon: '✅', label: 'Published' },
        published: { bg: '#d1fae5', color: '#065f46', icon: '✅', label: 'Published' },
        Upcoming: { bg: '#dbeafe', color: '#1e40af', icon: '📅', label: 'Upcoming' },
        upcoming: { bg: '#dbeafe', color: '#1e40af', icon: '📅', label: 'Upcoming' },
        InProgress: { bg: '#fef3c7', color: '#92400e', icon: '⏳', label: 'In Progress' },
        'In Progress': { bg: '#fef3c7', color: '#92400e', icon: '⏳', label: 'In Progress' },
        Completed: { bg: '#d1fae5', color: '#065f46', icon: '✅', label: 'Completed' },
        completed: { bg: '#d1fae5', color: '#065f46', icon: '✅', label: 'Completed' },
        Draft: { bg: '#f3f4f6', color: '#6b7280', icon: '📝', label: 'Draft' },
        draft: { bg: '#f3f4f6', color: '#6b7280', icon: '📝', label: 'Draft' },
        Closed: { bg: '#fee2e2', color: '#991b1b', icon: '🔒', label: 'Closed' },
        closed: { bg: '#fee2e2', color: '#991b1b', icon: '🔒', label: 'Closed' }
    };
    const s = statusMap[status] || statusMap.Draft;
    return `<span style="display:inline-flex;align-items:center;gap:4px;background:${s.bg};color:${s.color};padding:2px 12px;border-radius:12px;font-size:11px;font-weight:600;border:1px solid ${s.color}33;">${s.icon} ${s.label}</span>`;
}

function getPurposeBadge(basis) {
    const purpose = String(basis || 'ordinary').toLowerCase();
    const map = {
        ordinary: { bg: '#f3e8ff', color: '#6d28d9' },
        consolidated: { bg: '#dbeafe', color: '#1e40af' },
        supplementary: { bg: '#fef3c7', color: '#92400e' },
        special: { bg: '#fee2e2', color: '#991b1b' }
    };
    const c = map[purpose] || map.ordinary;
    const label = purpose.charAt(0).toUpperCase() + purpose.slice(1);
    return `<span style="background:${c.bg};color:${c.color};padding:2px 10px;border-radius:12px;font-size:10px;font-weight:600;">${escapeHtml(label)}</span>`;
}

function renderExamsTable(exams) {
    const D = window.DOM;
    if (!D.examsTbody) return;
    if (!exams.length) {
        D.examsTbody.innerHTML = `<tr><td colspan="13" style="padding:40px;text-align:center;color:#94a3b8;">No exams found. Create your first exam!</td></tr>`;
        return;
    }
    let html = '';
    for (const e of exams) {
        let courseName = '—';
        if (e._resolved_unit) {
            courseName = e._resolved_unit.unit_name || e._resolved_unit.unit_code || '—';
        } else if (e.course?.course_name) {
            courseName = e.course.course_name;
        } else if (e.course_code && window._unitByCode) {
            const u = window._unitByCode[String(e.course_code).trim().toUpperCase()];
            if (u) courseName = u.unit_name || u.unit_code;
        } else if (e.course_id && window._courseMap) {
            const u = window._courseMap[String(e.course_id)];
            if (u) courseName = u.unit_name || u.unit_code;
        } else if (e.course_name) {
            courseName = e.course_name;
        } else if (e.unit_name) {
            courseName = e.unit_name;
        } else if (e.subject_name) {
            courseName = e.subject_name;
        } else if (e.exam_name || e.title) {
            courseName = e.exam_name || e.title;
        }

        const title = e.title || e.exam_name || 'Untitled';
        const type = e.exam_type || 'N/A';
        const programDisplay = e.target_program || e.program_type || 'N/A';
        const marksOutOf = e.marks_out_of || e.total_marks || 100;
        const passMark = e.pass_mark || 50;
        const status = e.status || 'draft';
        const link = e.online_link || e.exam_link;
        const purpose = e.exam_basis || 'ordinary';

        let formattedDate = 'N/A', formattedTime = 'N/A';
        if (e.exam_date || e.created_at) {
            try {
                const d = new Date(e.exam_date || e.created_at);
                if (!isNaN(d.getTime())) formattedDate = d.toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });
            } catch (err) { /* ignore */ }
        }
        if (e.exam_start_time?.includes(':')) formattedTime = e.exam_start_time.substring(0, 5);

        const intakeDisplay = e.intake_year ? `${e.intake_year}${e.intake_month ? ' ' + e.intake_month : ''}` : 'N/A';
        const blockDisplay = e.block || e.block_term || 'N/A';
        const durationDisplay = e.duration_minutes ? e.duration_minutes + 'm' : 'N/A';

        html += `<tr style="border-bottom:1px solid #f1f5f9;" data-program="${escapeHtml(programDisplay)}" data-status="${escapeHtml(status)}" data-month="${escapeHtml(e.intake_month || '')}">
        <td style="padding:8px 10px;font-size:12px;text-align:center;"><span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:10px;font-weight:600;background:${type === 'EXAM' ? '#dbeafe' : '#fef3c7'};color:${type === 'EXAM' ? '#1e40af' : '#92400e'};">${escapeHtml(type)}</span></td>
        <td style="padding:8px 10px;font-size:12px;">${escapeHtml(programDisplay)}</td>
        <td style="padding:8px 10px;font-size:12px;">${escapeHtml(courseName)}</td>
        <td style="padding:8px 10px;font-weight:500;font-size:13px;">${escapeHtml(title)}</td>
        <td style="padding:8px 10px;text-align:center;font-weight:600;">${marksOutOf}</td>
        <td style="padding:8px 10px;text-align:center;font-weight:600;color:${parseInt(passMark) >= 50 ? '#059669' : '#dc2626'};">${passMark}%</td>
        <td style="padding:8px 10px;font-size:12px;"><div>${formattedDate}</div><div style="font-size:10px;color:#94a3b8;">${formattedTime}</div></td>
        <td style="padding:8px 10px;text-align:center;font-size:12px;">${durationDisplay}</td>
        <td style="padding:8px 10px;font-size:12px;text-align:center;">${escapeHtml(intakeDisplay)}</td>
        <td style="padding:8px 10px;font-size:12px;text-align:center;">${escapeHtml(blockDisplay)}</td>
        <td style="padding:8px 10px;text-align:center;">${getPurposeBadge(purpose)}</td>
        <td style="padding:8px 10px;text-align:center;">${getStatusBadge(status)}</td>
        <td style="padding:8px 10px;text-align:center;white-space:nowrap;">
        <button onclick="openEditExamModal('${e.id}')" style="padding:4px 10px;background:#3b82f6;color:white;border:none;border-radius:4px;cursor:pointer;" title="Edit"><i class="fas fa-edit"></i></button>
        <button onclick="openGradeModal('${e.id}')" style="padding:4px 10px;background:#10b981;color:white;border:none;border-radius:4px;cursor:pointer;" title="Grade"><i class="fas fa-check-double"></i></button>
        ${status !== 'Completed' && status !== 'Closed' && status !== 'completed' ? `<button onclick="closeExam('${e.id}')" style="padding:4px 10px;background:#f59e0b;color:white;border:none;border-radius:4px;cursor:pointer;" title="Close"><i class="fas fa-lock"></i></button>` : ''}
        <button onclick="deleteExam('${e.id}', '${escapeHtml(title)}')" style="padding:4px 10px;background:#dc2626;color:white;border:none;border-radius:4px;cursor:pointer;" title="Delete"><i class="fas fa-trash"></i></button>
        ${link ? `<a href="${escapeHtml(link)}" target="_blank" style="padding:4px 10px;background:#059669;color:white;border-radius:4px;text-decoration:none;display:inline-block;" title="Open"><i class="fas fa-external-link-alt"></i></a>` : ''}
        </td></tr>`;
    }
    D.examsTbody.innerHTML = html;
}

function renderStudentExams(exams) {
    const D = window.DOM;
    if (!D.studentExams) return;
    const published = exams.filter(e => ['Published', 'published', 'Upcoming', 'InProgress'].includes(e.status));
    if (!published.length) {
        D.studentExams.innerHTML = '<p style="color:#94a3b8;padding:20px;text-align:center;">No published assessments available.</p>';
        return;
    }
    let html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px;">';
    for (const exam of published.slice(0, 6)) {
        const dateStr = exam.exam_date ? new Date(exam.exam_date).toLocaleDateString() : '';
        const statusClass = exam.status === 'Upcoming' ? 'upcoming' : exam.status === 'InProgress' ? 'in-progress' : 'completed';
        const borderColor = statusClass === 'upcoming' ? '#f59e0b' : statusClass === 'in-progress' ? '#3b82f6' : '#10b981';
        const link = exam.online_link || exam.exam_link;
        const courseName = exam._resolved_unit?.unit_name || exam.course?.course_name || exam.course_name || exam.subject_name || '—';
        html += `<div style="background:white;border-radius:12px;padding:14px 16px;border-left:4px solid ${borderColor};border:1px solid #f1f5f9;"><h4 style="margin:0 0 6px;font-size:14px;">${escapeHtml(exam.title || exam.exam_name || 'Assessment')}</h4><div style="font-size:12px;color:#94a3b8;">${escapeHtml(courseName)}</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 14px;font-size:12px;color:#475569;margin-top:6px;"><span><strong>Type:</strong> ${escapeHtml(exam.exam_type || '')}</span><span><strong>Duration:</strong> ${exam.duration_minutes || 'N/A'}m</span><span><strong>Date:</strong> ${dateStr}</span><span><strong>Marks:</strong> ${exam.marks_out_of || exam.total_marks || 100}</span></div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;"><span style="font-size:11px;color:${borderColor};">${escapeHtml(exam.status)}</span>${link ? `<a href="${escapeHtml(link)}" target="_blank" style="background:linear-gradient(135deg,#7c3aed,#6d28d9);color:white;padding:4px 16px;border-radius:20px;text-decoration:none;font-size:12px;font-weight:600;">Take Exam</a>` : ''}</div></div>`;
    }
    html += '</div>';
    D.studentExams.innerHTML = html;
}

// ============================================
// PROGRAM / CLASS HELPERS
// ============================================
function getProgramOptions() {
    const groups = [
        { label: '🎓 KRCHN Nursing', programs: ['KRCHN - Kenya Registered Community Health Nursing'] },
        { label: '🎯 TVET Diploma', programs: ['DPOTT - Diploma in Perioperative Theatre Technology', 'DCH - Diploma in Community Health', 'DHRIT - Diploma in Health Records and IT', 'DSL - Diploma in Science Lab', 'DSW - Diploma in Social Work', 'DCJS - Diploma in Criminal Justice', 'DHSS - Diploma in Health Support Services', 'DICT - Diploma in ICT', 'DME - Diploma in Medical Engineering'] },
        { label: '📜 TVET Certificate', programs: ['CPOTT - Certificate in Perioperative Theatre Technology', 'CCH - Certificate in Community Health', 'CHRIT - Certificate in Health Records and IT', 'CPC - Certificate in Patient Care', 'CSL - Certificate in Science Lab', 'CSW - Certificate in Social Work', 'CCJS - Certificate in Criminal Justice', 'CAG - Certificate in Agriculture', 'CHSS - Certificate in Health Support Services', 'CICT - Certificate in ICT'] },
        { label: '🔧 Artisan', programs: ['ACH - Artisan in Community Health', 'AAG - Artisan in Agriculture', 'ASW - Artisan in Social Work'] },
        { label: '📊 Other', programs: ['CCA - Certificate in Computer Applications', 'PTE - TVET/CDACC (PTE)'] }
    ];
    return groups.map(g => `<optgroup label="${g.label}">${g.programs.map(p => { const code = p.split(' - ')[0]; return `<option value="${code}">${p}</option>`; }).join('')}</optgroup>`).join('');
}

function populateProgramDropdowns() {
    const options = getProgramOptions();
    const examProgram = document.getElementById('exam_program');
    const editExamProgram = document.getElementById('edit_exam_program');

    if (examProgram && examProgram.options.length <= 1) {
        examProgram.innerHTML = '<option value="">-- Select Program --</option>' + options;
    }
    if (editExamProgram && editExamProgram.options.length <= 1) {
        editExamProgram.innerHTML = '<option value="">-- Select Program --</option>' + options;
    }
}

function isTVETProgram(programCode) {
    if (!programCode) return false;
    const code = String(programCode).toUpperCase().trim();
    if (code === 'KRCHN') return false;
    return ['DPOTT', 'DCH', 'DHRIT', 'DSL', 'DSW', 'DCJS', 'DHSS', 'DICT', 'DME', 'CPOTT', 'CCH', 'CHRIT', 'CPC', 'CSL', 'CSW', 'CCJS', 'CAG', 'CHSS', 'CICT', 'CCA', 'ACH', 'AAG', 'ASW', 'PTE', 'COMT', 'CCG'].includes(code);
}

function getProgramLevel(programCode) {
    if (!programCode) return 'KRCHN';
    const code = String(programCode).toUpperCase().trim();
    if (code.startsWith('D')) return 'DIPLOMA';
    if (code.startsWith('C') && code !== 'CCA') return 'CERTIFICATE';
    if (code.startsWith('A')) return 'ARTISAN';
    if (code === 'CCA' || code === 'PTE') return 'OTHER';
    return 'KRCHN';
}

function updateBlockTermOptions(programSelectId = 'exam_program', blockSelectId = 'exam_block_term') {
    const programEl = document.getElementById(programSelectId);
    const blockEl = document.getElementById(blockSelectId);
    if (!blockEl) return;

    const program = programEl?.value || '';
    const isTVET = program ? isTVETProgram(program) : false;
    const level = program ? getProgramLevel(program) : '';
    const currentValue = blockEl.value;

    // ── Static list — same approach as the lecturer module ──
    let blocks;
    if (!program) {
        // No program picked yet — show both blocks and terms as a starting point
        blocks = [
            'Introductory',
            'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Block 6',
            'Final'
        ];
    } else if (isTVET) {
        if (level === 'DIPLOMA') {
            blocks = ['Introductory', 'Term 1', 'Term 2', 'Term 3', 'Term 4', 'Term 5', 'Term 6', 'Final'];
        } else if (level === 'CERTIFICATE') {
            blocks = ['Introductory', 'Term 1', 'Term 2', 'Term 3', 'Final'];
        } else if (level === 'ARTISAN') {
            blocks = ['Introductory', 'Term 1', 'Term 2', 'Final'];
        } else {
            blocks = ['Introductory', 'Term 1', 'Term 2', 'Term 3', 'Term 4', 'Term 5', 'Term 6', 'Final'];
        }
    } else {
        // KRCHN Nursing
        blocks = [
            'Introductory',
            'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Block 6',
            'Final'
        ];
    }

    const label = isTVET ? 'Term' : 'Block';

    blockEl.innerHTML =
        '<option value="">-- Select ' + label + ' --</option>' +
        blocks.map(b =>
            '<option value="' + escapeHtml(b) + '">' + escapeHtml(b) + '</option>'
        ).join('');

    // Restore previous selection if still valid
    if (currentValue && blocks.includes(currentValue)) {
        blockEl.value = currentValue;
    }

    // Update the hint if present
    const hint = document.getElementById('exam_block_hint');
    if (hint) hint.textContent = `${blocks.length} ${label.toLowerCase()}(s) available`;

    console.log(`📋 updateBlockTermOptions: program=${program || '(none)'} → ${blocks.length} ${label.toLowerCase()}(s)`);
}

async function loadAvailableClassesForExam() {
    const D = window.DOM;
    if (!D.classSelector) return;
    const program = document.getElementById('exam_program')?.value || 'KRCHN';
    const isTVET = isTVETProgram(program);
    const level = getProgramLevel(program);
    let options = [], blockLabel = 'Block';

    if (isTVET) {
        blockLabel = 'Term';
        if (level === 'DIPLOMA') options = [['Y1T1', 'Year 1 Term 1'], ['Y1T2', 'Year 1 Term 2'], ['Y1T3', 'Year 1 Term 3'], ['Y2T1', 'Year 2 Term 1'], ['Y2T2', 'Year 2 Term 2'], ['Y2T3', 'Year 2 Term 3']];
        else if (level === 'CERTIFICATE') options = [['Y1T1', 'Year 1 Term 1'], ['Y1T2', 'Year 1 Term 2'], ['Y1T3', 'Year 1 Term 3']];
        else options = [['Introductory', 'Introductory Term'], ['Term1', 'Term 1'], ['Term2', 'Term 2'], ['Term3', 'Term 3'], ['Term4', 'Term 4'], ['Term5', 'Term 5'], ['Term6', 'Term 6'], ['Final', 'Final Term']];
    } else {
        options = [['Introductory', 'Introductory Block'], ['Block 1', 'Block 1'], ['Block 2', 'Block 2'], ['Block 3', 'Block 3'], ['Block 4', 'Block 4'], ['Block 5', 'Block 5'], ['Block 6', 'Block 6'], ['Final', 'Final Block']];
    }

    D.classSelector.innerHTML = `<p style="color:#6b7280;font-size:12px;margin:0 0 8px;grid-column:1/-1;"><i class="fas fa-info-circle"></i> Select ${blockLabel}s:</p><div style="display:flex;flex-wrap:wrap;gap:8px;grid-column:1/-1;">${options.map(o => `<label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;"><input type="checkbox" class="exam-class-checkbox" value="${o[0]}"><span>${o[1]}</span></label>`).join('')}</div><div style="display:flex;gap:6px;grid-column:1/-1;margin-top:4px;"><input type="text" id="customBlocksInput" placeholder="Custom ${blockLabel}s (comma)" style="flex:1;padding:6px 12px;border-radius:6px;border:1px solid #ddd;font-size:12px;"><button onclick="addCustomBlocks()" style="padding:6px 14px;background:#7c3aed;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:12px;">Add</button></div>`;
}

function addCustomBlocks() {
    const input = document.getElementById('customBlocksInput');
    if (!input?.value.trim()) return;
    const blocks = input.value.split(',').map(b => b.trim()).filter(Boolean);
    const container = window.DOM?.classSelector;
    const div = container?.querySelector('div:first-child') || container;
    if (!div) return;
    blocks.forEach(block => {
        const label = document.createElement('label');
        label.style.cssText = 'display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;';
        label.innerHTML = `<input type="checkbox" class="exam-class-checkbox" value="${escapeHtml(block)}"><span>${escapeHtml(block)}</span>`;
        div.appendChild(label);
    });
    input.value = '';
}

function getSelectedClasses() {
    const selected = [];
    document.querySelectorAll('.exam-class-checkbox:checked').forEach(cb => selected.push(cb.value));
    return selected;
}

// ============================================
// CREATE EXAM
// ============================================
async function handleAddExam(e) {
    e.preventDefault();
    const btn = e.submitter;
    if (!btn) return;

    const original = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Creating...';

    const fields = {
        title: document.getElementById('exam_title')?.value.trim(),
        type: document.getElementById('exam_type')?.value,
        status: document.getElementById('exam_status')?.value || 'published',
        basis: document.getElementById('exam_basis')?.value || 'ordinary',
        date: document.getElementById('exam_date')?.value,
        startTime: document.getElementById('exam_start_time')?.value || '09:00',
        duration: parseInt(document.getElementById('exam_duration_minutes')?.value),
        deadline: document.getElementById('exam_deadline')?.value || null,
        program: document.getElementById('exam_program')?.value,
        block: document.getElementById('exam_block_term')?.value,
        intake: parseInt(document.getElementById('exam_intake')?.value),
        intakeMonth: document.getElementById('exam_intake_month')?.value || null,
        unitId: document.getElementById('exam_course_id')?.value || null,
        outOf: parseInt(document.getElementById('exam_out_of')?.value) || 100,
        passMark: parseInt(document.getElementById('exam_pass_mark')?.value) || 50,
        minFee: parseInt(document.getElementById('exam_min_fee')?.value) || 0,
        link: document.getElementById('exam_link')?.value.trim() || null
    };

    const typeUpper = String(fields.type || '').trim().toUpperCase();
    const mainExamTypes = new Set(['EXAM', 'END_TERM', 'SUPPLEMENTARY', 'FINAL_EXAM', 'FINAL']);

    if (mainExamTypes.has(typeUpper)) {
        fields.title = buildExamNameFromCourse() || fields.title;
    } else {
        fields.title = document.getElementById('exam_title')?.value.trim() || '';
    }

    const commonMissing = !fields.title || !fields.program || !fields.date || !fields.intake || !fields.block || !fields.type || isNaN(fields.duration);
    const courseRequired = mainExamTypes.has(typeUpper);

    if (commonMissing || (courseRequired && !fields.unitId)) {
        showFeedback(
            courseRequired
                ? 'Please select the Course/Unit for this main examination and fill all required fields.'
                : 'Please enter the assessment name and fill all required fields.',
            'error'
        );
        btn.disabled = false;
        btn.innerHTML = original;
        return;
    }

    const classes = getSelectedClasses();
    const user = await getCurrentUser();
    const notifyStudents = document.getElementById('exam_notify_students')?.checked || false;
    const notifyTarget = document.getElementById('exam_notify_target')?.value || 'all';

    let recipients = [];
    if (notifyStudents) {
        if (notifyTarget === 'specific') recipients = [...selectedStudentsForNotification];
        else recipients = [...allStudentsForProgram];
        console.log(`📧 Recipients: ${recipients.length} (target: ${notifyTarget})`);
    }

    try {
        const supabase = window.sb || window.supabase;
        if (!supabase) throw new Error('Supabase client not available');

        const selectedUnit =
            window.selectedExamUnit ||
            (window.createUnitsData || []).find(u => String(u.id) === String(fields.unitId)) ||
            null;

        let legacyCourseId = null;
        if (selectedUnit?.unit_code) {
            try {
                const { data: legacyCourse } = await supabase
                    .from('courses')
                    .select('id')
                    .eq('unit_code', selectedUnit.unit_code)
                    .eq('target_program', fields.program)
                    .limit(1)
                    .maybeSingle();

                if (!legacyCourse) {
                    const { data: legacyCourseByCode } = await supabase
                        .from('courses')
                        .select('id')
                        .eq('code', selectedUnit.unit_code)
                        .eq('target_program', fields.program)
                        .limit(1)
                        .maybeSingle();
                    legacyCourseId = legacyCourseByCode?.id || null;
                } else {
                    legacyCourseId = legacyCourse.id;
                }
            } catch (mappingError) {
                console.warn('⚠️ Legacy course mapping skipped:', mappingError);
            }
        }

        const examData = {
            title: fields.title,
            exam_name: fields.title,
            exam_type: fields.type,
            status: String(fields.status || 'published').toLowerCase(),
            exam_basis: fields.basis,
            exam_date: fields.date,
            exam_start_time: fields.startTime,
            duration_minutes: fields.duration,
            marks_entry_deadline: fields.deadline,
            target_program: fields.program,
            program_type: fields.program,
            block: fields.block,
            block_term: fields.block,
            intake_year: fields.intake,
            intake_month: fields.intakeMonth,
            course_id: legacyCourseId,
            course_code: selectedUnit?.unit_code || null,
            marks_out_of: fields.outOf,
            total_marks: fields.outOf,
            MARKS: String(fields.outOf),
            pass_mark: fields.passMark,
            min_fee_balance: fields.minFee,
            online_link: fields.link,
            exam_link: fields.link,
            assigned_classes: classes,
            created_by: user?.user_id || user?.id || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        if (selectedUnit) {
            examData.unit_code = selectedUnit.unit_code || null;
            examData.unit_name = selectedUnit.unit_name || null;
        }

        let insertResult = await supabase.from('exams').insert(examData).select('id');

        if (insertResult.error && /column .* (unit_code|unit_name|course_code) .* does not exist/i.test(insertResult.error.message || '')) {
            delete examData.unit_code;
            delete examData.unit_name;
            insertResult = await supabase.from('exams').insert(examData).select('id');
        }

        if (insertResult.error) throw insertResult.error;

        examData.id = insertResult.data?.[0]?.id;

        let emailResult = { sent: 0, total: 0, failed: 0 };
        if (notifyStudents && recipients.length > 0) {
            emailResult = await sendExamNotificationEmail(examData, recipients);
        }

        let feedbackMsg = `✅ "${fields.title}" created successfully!`;
        if (selectedUnit) feedbackMsg += ` 📚 ${selectedUnit.unit_code} — ${selectedUnit.unit_name}`;
        if (notifyStudents) {
            if (recipients.length > 0) {
                feedbackMsg += ` 📧 ${emailResult.sent} emails sent to ${recipients.length} students.`;
                if (emailResult.failed > 0) feedbackMsg += ` ⚠️ ${emailResult.failed} failed.`;
            } else {
                feedbackMsg += ' ⚠️ No students found to notify.';
            }
        }

        showFeedback(feedbackMsg, 'success');

        if (e.target) e.target.reset();
        selectedStudentsForNotification = [];
        window.selectedExamUnit = null;
        updateSelectedStudentsDisplay();

        const nc = document.getElementById('exam_notify_students');
        if (nc) nc.checked = true;

        ExamCache.clear();
        loadExams(true);

        setTimeout(() => {
            const program = document.getElementById('exam_program')?.value || '';
            if (program) initCreateCourseDropdown(program);
        }, 100);

    } catch (error) {
        console.error('❌ Exam creation failed:', error);
        showFeedback(`Failed: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = original;
    }
}

// ============================================
// EDIT EXAM (Defensive)
// ============================================
async function openEditExamModal(id) {
    try {
        const modal = document.getElementById('examEditModal');
        if (!modal) {
            showFeedback('⚠️ Edit modal is not available on this page. Use Marks Entry to edit.', 'warning');
            return;
        }

        const supabase = window.sb || window.supabase;
        if (!supabase) throw new Error('Supabase client not available');

        const { data: exam, error } = await supabase.from('exams').select('*').eq('id', id).single();
        if (error) throw error;

        const setVal = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = val || ''; };
        setVal('edit_exam_id', exam.id);
        setVal('edit_exam_title', exam.title || exam.exam_name || '');
        setVal('edit_exam_type', exam.exam_type || 'CAT');
        setVal('edit_exam_status', exam.status || 'Upcoming');
        setVal('edit_exam_basis', exam.exam_basis || 'ordinary');
        if (exam.exam_date) {
            const d = new Date(exam.exam_date);
            if (!isNaN(d.getTime())) setVal('edit_exam_date', d.toISOString().split('T')[0]);
        }
        if (exam.exam_start_time?.includes(':')) setVal('edit_exam_start_time', exam.exam_start_time.substring(0, 5));
        setVal('edit_exam_duration', exam.duration_minutes || 60);
        setVal('edit_exam_deadline', exam.marks_entry_deadline || '');
        setVal('edit_exam_program', exam.target_program || exam.program_type || '');
        setVal('edit_exam_block', exam.block || exam.block_term || '');
        setVal('edit_exam_intake', exam.intake_year || '');
        setVal('edit_exam_intake_month', exam.intake_month || '');
        setVal('edit_exam_out_of', exam.marks_out_of || exam.total_marks || 100);
        setVal('edit_exam_pass_mark', exam.pass_mark || 50);
        setVal('edit_exam_min_fee', exam.min_fee_balance || 0);
        setVal('edit_exam_link', exam.online_link || exam.exam_link || '');
        setVal('edit_exam_course', exam.course_id || exam.course_code || '');

        if (typeof initEditCourseDropdown === 'function') {
            try { await initEditCourseDropdown(exam.target_program || '', exam.course_id); }
            catch (e) { console.warn('initEditCourseDropdown skipped:', e.message); }
        }

        const editTitle = document.getElementById('edit_exam_title');
        if (editTitle) editTitle.readOnly = true;

        if (typeof renderAssignedClasses === 'function') {
            renderAssignedClasses(exam.id, exam.assigned_classes || []);
        }

        modal.style.display = 'flex';
    } catch (error) {
        showFeedback('❌ Failed to load exam: ' + error.message, 'error');
    }
}

async function saveEditedExam(event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    const id = document.getElementById('edit_exam_id')?.value;
    if (!id) { showFeedback('❌ Exam ID not found', 'error'); return; }

    const outOf = parseInt(document.getElementById('edit_exam_out_of')?.value) || 100;

    const data = {
        title: document.getElementById('edit_exam_title')?.value?.trim() || '',
        exam_name: document.getElementById('edit_exam_title')?.value?.trim() || '',
        exam_type: document.getElementById('edit_exam_type')?.value || 'CAT',
        status: document.getElementById('edit_exam_status')?.value || 'Upcoming',
        exam_basis: document.getElementById('edit_exam_basis')?.value || 'ordinary',
        exam_date: document.getElementById('edit_exam_date')?.value || null,
        exam_start_time: document.getElementById('edit_exam_start_time')?.value || null,
        duration_minutes: parseInt(document.getElementById('edit_exam_duration')?.value) || 60,
        marks_entry_deadline: document.getElementById('edit_exam_deadline')?.value || null,
        target_program: document.getElementById('edit_exam_program')?.value || '',
        program_type: document.getElementById('edit_exam_program')?.value || '',
        block: document.getElementById('edit_exam_block')?.value || '',
        block_term: document.getElementById('edit_exam_block')?.value || '',
        intake_year: parseInt(document.getElementById('edit_exam_intake')?.value) || null,
        intake_month: document.getElementById('edit_exam_intake_month')?.value || null,
        course_id: document.getElementById('edit_exam_course')?.value || null,
        marks_out_of: outOf,
        total_marks: outOf,
        MARKS: String(outOf),
        pass_mark: parseInt(document.getElementById('edit_exam_pass_mark')?.value) || 50,
        min_fee_balance: parseInt(document.getElementById('edit_exam_min_fee')?.value) || 0,
        online_link: document.getElementById('edit_exam_link')?.value?.trim() || null,
        exam_link: document.getElementById('edit_exam_link')?.value?.trim() || null,
        updated_at: new Date().toISOString()
    };

    Object.keys(data).forEach(k => {
        if (data[k] === undefined || data[k] === null || data[k] === '') delete data[k];
    });

    const saveBtn = document.querySelector('#editExamForm button[type="submit"]') || document.querySelector('#examEditModal .btn-primary');
    const original = saveBtn?.textContent || 'Save Changes';
    if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...'; }

    try {
        const supabase = window.sb || window.supabase;
        if (!supabase) throw new Error('Supabase client not available');
        const { error } = await supabase.from('exams').update(data).eq('id', id);
        if (error) throw error;
        showFeedback('✅ Exam updated successfully!', 'success');
        ExamCache.clear();
        await loadExams(true);
        closeEditModal();
    } catch (error) {
        showFeedback('❌ Failed to save: ' + error.message, 'error');
        if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = original; }
    }
}

// ============================================
// ASSIGNED CLASSES
// ============================================
function renderAssignedClasses(examId, classes) {
    const container = document.getElementById('edit_exam_classes_container');
    if (!container) return;
    container.innerHTML = `<label style="font-weight:600;font-size:11px;text-transform:uppercase;color:#475569;display:block;margin-bottom:4px;">Assigned Blocks</label><div style="display:flex;flex-wrap:wrap;gap:6px;padding:8px;background:#f8fafc;border-radius:8px;min-height:32px;border:1px solid #e2e8f0;">${classes?.length ? classes.map(c => `<span style="background:#7c3aed;color:#fff;padding:2px 12px;border-radius:16px;font-size:11px;display:inline-flex;align-items:center;gap:4px;">${escapeHtml(c)}<span onclick="removeClass('${examId}','${escapeHtml(c)}')" style="cursor:pointer;color:#fca5a5;font-weight:700;">&times;</span></span>`).join('') : '<span style="color:#94a3b8;font-size:12px;">No blocks assigned</span>'}</div><div style="display:flex;gap:6px;margin-top:6px;"><input type="text" id="edit_exam_add_class" placeholder="Add block" style="flex:1;padding:6px 10px;border-radius:6px;border:1px solid #e2e8f0;font-size:12px;"><button onclick="addClass('${examId}')" style="padding:6px 14px;background:#7c3aed;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:12px;"><i class="fas fa-plus"></i></button></div>`;
}

async function addClass(examId) {
    const input = document.getElementById('edit_exam_add_class');
    if (!input?.value.trim()) return;
    const className = input.value.trim();
    try {
        const supabase = window.sb || window.supabase;
        const { data: exam } = await supabase.from('exams').select('assigned_classes').eq('id', examId).single();
        const current = exam?.assigned_classes || [];
        if (current.includes(className)) { showFeedback('Already assigned', 'warning'); return; }
        current.push(className);
        const { error } = await supabase.from('exams').update({ assigned_classes: current }).eq('id', examId);
        if (error) throw error;
        showFeedback(`✅ Added "${className}"`, 'success');
        input.value = '';
        renderAssignedClasses(examId, current);
    } catch (e) { showFeedback(`Error: ${e.message}`, 'error'); }
}

async function removeClass(examId, className) {
    if (!confirm(`Remove "${className}"?`)) return;
    try {
        const supabase = window.sb || window.supabase;
        const { data: exam } = await supabase.from('exams').select('assigned_classes').eq('id', examId).single();
        const current = (exam?.assigned_classes || []).filter(c => c !== className);
        const { error } = await supabase.from('exams').update({ assigned_classes: current }).eq('id', examId);
        if (error) throw error;
        showFeedback(`✅ Removed "${className}"`, 'success');
        renderAssignedClasses(examId, current);
    } catch (e) { showFeedback(`Error: ${e.message}`, 'error'); }
}

async function deleteExam(id, name) {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
        const supabase = window.sb || window.supabase;
        const { error } = await supabase.from('exams').delete().eq('id', id);
        if (error) throw error;
        ExamCache.clear();
        showFeedback(`✅ "${name}" deleted`, 'success');
        loadExams(true);
    } catch (e) { showFeedback(`Delete failed: ${e.message}`, 'error'); }
}

async function closeExam(id) {
    if (!confirm('Close this exam?')) return;
    try {
        const supabase = window.sb || window.supabase;
        const { error } = await supabase.from('exams').update({ status: 'Completed', updated_at: new Date().toISOString() }).eq('id', id);
        if (error) throw error;
        ExamCache.clear();
        showFeedback('✅ Exam closed', 'success');
        loadExams(true);
    } catch (e) { showFeedback(`Failed: ${e.message}`, 'error'); }
}

function closeEditModal() {
    const modal = document.getElementById('examEditModal');
    if (modal) {
        modal.style.display = 'none';
        const form = document.getElementById('editExamForm');
        if (form) form.reset();
    }
}

// ============================================
// FILTER + EXPORT
// ============================================
const filterExamsTable = debounce(function () {
    const search = document.getElementById('exam-search')?.value?.toLowerCase() || '';
    const program = document.getElementById('exam_filter_program')?.value || '';
    const status = document.getElementById('exam_filter_status')?.value || '';
    const month = document.getElementById('exam_filter_intake_month')?.value || '';

    document.querySelectorAll('#exams-table-body tr').forEach(row => {
        if (row.querySelector('td[colspan]')) return;
        const cells = row.querySelectorAll('td');
        if (cells.length < 13) return;

        const title = cells[3]?.textContent?.toLowerCase() || '';
        const prog = cells[1]?.textContent || '';
        const intake = cells[8]?.textContent || '';
        const stat = cells[11]?.textContent || '';

        let show = true;
        if (search && !title.includes(search)) show = false;
        if (program && !prog.includes(program)) show = false;
        if (status && !stat.toLowerCase().includes(status.toLowerCase())) show = false;
        if (month && !intake.includes(month)) show = false;
        row.style.display = show ? '' : 'none';
    });
}, 300);

function exportExamsToCSV() {
    const rows = document.querySelectorAll('#exams-table-body tr');
    const visible = Array.from(rows).filter(r => r.style.display !== 'none' && !r.querySelector('td[colspan]'));
    if (!visible.length) { showFeedback('No exams to export', 'warning'); return; }

    let csv = 'Type,Program,Course,Title,Out Of,Pass Mark,Date,Duration,Intake,Block,Purpose,Status\n';
    visible.forEach(row => {
        const cols = row.querySelectorAll('td');
        if (cols.length >= 12) {
            const data = [];
            for (let i = 0; i < 12; i++) data.push(`"${String(cols[i]?.textContent || '').replace(/"/g, '""').trim()}"`);
            csv += data.join(',') + '\n';
        }
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exams_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showFeedback('✅ Exported!', 'success');
}

// ============================================
// TABS
// ============================================
function showExamTab(tab) {
    document.querySelectorAll('.exam-tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.exam-tab-btn').forEach(btn => {
        btn.className = 'exam-tab-btn';
        btn.style.background = 'transparent';
        btn.style.color = '#334155';
        btn.style.boxShadow = 'none';
    });
    if (tab === 'list') {
        document.getElementById('examListTab').style.display = 'block';
        const btn = document.getElementById('examListTabBtn');
        if (btn) {
            btn.className = 'exam-tab-btn active';
            btn.style.background = 'linear-gradient(135deg,#7c3aed,#6d28d9)';
            btn.style.color = 'white';
            btn.style.boxShadow = '0 4px 16px rgba(124,58,237,0.3)';
        }
        loadExams();
    } else if (tab === 'create') {
        document.getElementById('examCreateTab').style.display = 'block';
        const btn = document.getElementById('examCreateTabBtn');
        if (btn) {
            btn.className = 'exam-tab-btn active';
            btn.style.background = 'linear-gradient(135deg,#7c3aed,#6d28d9)';
            btn.style.color = 'white';
            btn.style.boxShadow = '0 4px 16px rgba(124,58,237,0.3)';
        }
        loadAvailableClassesForExam();
        const program = document.getElementById('exam_program')?.value || '';
        if (typeof initCreateCourseDropdown === 'function') initCreateCourseDropdown(program);
        setTimeout(loadStudentsForNotification, 800);
    }
}

// ============================================
// CURRENT USER
// ============================================
async function getCurrentUser() {
    try {
        if (window.currentUserProfile?.user_id) return window.currentUserProfile;
        const stored = sessionStorage.getItem('currentUserProfile');
        if (stored) {
            const user = JSON.parse(stored);
            if (user?.user_id) return user;
        }
        const supabase = window.sb || window.supabase;
        if (!supabase) return null;
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase.from('consolidated_user_profiles_table').select('*').eq('user_id', user.id).single();
            if (profile) {
                window.currentUserProfile = profile;
                sessionStorage.setItem('currentUserProfile', JSON.stringify(profile));
                return profile;
            }
        }
        return null;
    } catch (e) { return null; }
}

// ============================================
// COURSE / UNIT SEARCH
// ============================================
let createCoursesData = [], editCoursesData = [];
let createUnitsData = [];

async function initCreateCourseDropdown(program = '') {
    const input = document.getElementById('createCourseSearchInput');
    const list = document.getElementById('createCourseDropdownList');
    if (!input || !list) return;

    await loadCoursesForCreateDropdown(program);

    if (!input.dataset.bound) {
        input.dataset.bound = '1';
        input.addEventListener('input', () => filterCreateCourseDropdown(input.value.toLowerCase().trim()));
        input.addEventListener('focus', () => {
            list.classList.add('show');
            filterCreateCourseDropdown(input.value.toLowerCase().trim());
        });
        input.addEventListener('blur', () => setTimeout(() => list.classList.remove('show'), 200));
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                const first = list.querySelector('.dropdown-item');
                if (first) first.click();
                e.preventDefault();
            }
            if (e.key === 'Escape') list.classList.remove('show');
        });
    }

    filterCreateCourseDropdown('');

    const typeInput = document.getElementById('exam_type');
    if (typeInput && !typeInput.dataset.examNameBound) {
        typeInput.dataset.examNameBound = '1';
        typeInput.addEventListener('change', buildExamNameFromCourse);
    }

    buildExamNameFromCourse();
}

async function loadCoursesForCreateDropdown(program = '') {
    try {
        const supabase = window.sb || window.supabase;
        if (!supabase) { createUnitsData = []; filterCreateCourseDropdown(''); return; }

        let query = supabase
            .from('units_catalog')
            .select('id, unit_code, unit_name, program, block, term, year, unit_type, status, block_order, assessment_type')
            .eq('status', 'active');

        if (program) query = query.eq('program', program);

        const { data, error } = await query
            .order('block_order', { ascending: true, nullsFirst: false })
            .order('unit_code', { ascending: true });

        if (error) throw error;

        createUnitsData = data || [];
        window.createUnitsData = createUnitsData;
        console.log('📚 units_catalog loaded for Course/Unit search:', {
            program: program || 'ALL PROGRAMS', count: createUnitsData.length
        });

        filterCreateCourseDropdown('');
    } catch (error) {
        console.error('❌ Failed to load units_catalog:', error);
        createUnitsData = [];
        filterCreateCourseDropdown('');
    }
}

function filterCreateCourseDropdown(searchTerm = '') {
    const list = document.getElementById('createCourseDropdownList');
    if (!list) return;

    let filtered = createUnitsData || [];
    if (searchTerm) {
        filtered = filtered.filter(u => {
            const text = [u.unit_name || '', u.unit_code || '', u.program || '', u.block || '', u.assessment_type || ''].join(' ').toLowerCase();
            return text.includes(searchTerm);
        });
    }

    if (!filtered.length) {
        const program = document.getElementById('exam_program')?.value || '';
        const message = program ? `No active courses/units found for ${escapeHtml(program)}` : 'Select a program or search the course/unit list';
        list.innerHTML = `<div class="no-results"><i class="fas fa-book"></i> ${message}</div>`;
        list.classList.add('show');
        return;
    }

    let html = '';
    filtered.slice(0, 100).forEach(unit => {
        const displayName = unit.unit_name || 'Untitled Unit';
        const unitCode = unit.unit_code || '';
        const programTag = unit.program ? `[${unit.program}]` : '';

        const safeId = String(unit.id).replace(/'/g, "\\'");
        const safeName = escapeHtml(displayName).replace(/'/g, "\\'");
        const safeCode = escapeHtml(unitCode).replace(/'/g, "\\'");
        const safeProgram = escapeHtml(programTag).replace(/'/g, "\\'");

        html += `<div class="dropdown-item" onclick="selectCreateCourse('${safeId}','${safeName}','${safeCode}','${safeProgram}')">
            <span><strong>${escapeHtml(displayName)}</strong>${unitCode ? `<small style="display:block;color:#64748b;margin-top:2px;">${escapeHtml(unitCode)}</small>` : ''}</span>
            <span style="display:flex;gap:6px;align-items:center;">${unit.assessment_type ? `<span class="course-code">${escapeHtml(unit.assessment_type)}</span>` : ''}${unit.block ? `<span class="program-tag">${escapeHtml(unit.block)}</span>` : ''}</span>
        </div>`;
    });

    if (filtered.length > 100) html += `<div class="no-results" style="font-size:12px;">And ${filtered.length - 100} more</div>`;

    list.innerHTML = html;
    list.classList.add('show');
}

function buildExamNameFromCourse() {
    const titleInput = document.getElementById('exam_title');
    const courseInput = document.getElementById('createCourseSearchInput');
    const typeInput = document.getElementById('exam_type');

    if (!titleInput) return '';

    const examType = (typeInput?.value || '').trim().toUpperCase();
    const courseText = (courseInput?.value || '').trim();

    const mainExamTypes = new Set(['EXAM', 'END_TERM', 'SUPPLEMENTARY', 'FINAL_EXAM', 'FINAL']);

    if (mainExamTypes.has(examType)) {
        const cleanCourse = courseText.replace(/\s+\([^)]*\)\s*$/, '').trim();
        const generated = cleanCourse ? (typeInput?.value ? `${cleanCourse} — ${typeInput.value}` : cleanCourse) : '';

        titleInput.value = generated;
        titleInput.readOnly = true;
        titleInput.setAttribute('aria-readonly', 'true');
        titleInput.title = 'Automatically generated from the selected Course/Unit and Exam Type';
        titleInput.dataset.generatedTitle = generated;

        return generated;
    }

    if (titleInput.dataset.generatedTitle && titleInput.value === titleInput.dataset.generatedTitle) {
        titleInput.value = '';
    }

    titleInput.readOnly = false;
    titleInput.removeAttribute('aria-readonly');
    titleInput.title = 'Enter the assessment name';
    return titleInput.value.trim();
}

function selectCreateCourse(courseId, courseName, courseCode, programTag) {
    const input = document.getElementById('createCourseSearchInput');
    const hidden = document.getElementById('exam_course_id');
    const list = document.getElementById('createCourseDropdownList');
    const display = document.getElementById('createSelectedCourseDisplay');
    const nameDisplay = document.getElementById('createSelectedCourseName');

    if (input) input.value = courseName + (courseCode ? ` (${courseCode})` : '');
    if (hidden) hidden.value = courseId;
    if (list) list.classList.remove('show');
    if (display && nameDisplay) {
        display.style.display = 'inline';
        nameDisplay.textContent = courseName + (courseCode ? ` (${courseCode})` : '');
    }

    const selectedUnit = createUnitsData.find(u => String(u.id) === String(courseId));
    if (selectedUnit) window.selectedExamUnit = selectedUnit;

    buildExamNameFromCourse();
}

function updateCreateCourseDropdown() {
    const program = document.getElementById('exam_program')?.value || '';
    loadCoursesForCreateDropdown(program);

    const input = document.getElementById('createCourseSearchInput');
    const hidden = document.getElementById('exam_course_id');
    const display = document.getElementById('createSelectedCourseDisplay');
    const title = document.getElementById('exam_title');

    if (input) input.value = '';
    if (hidden) hidden.value = '';
    if (display) display.style.display = 'none';

    window.selectedExamUnit = null;

    if (title) {
        title.value = '';
        title.dataset.generatedTitle = '';
        buildExamNameFromCourse();
    }

    filterCreateCourseDropdown('');
}

// Edit-side stubs (safe no-ops if edit modal doesn't exist)
async function initEditCourseDropdown(program = '', selectedId = '') {
    const input = document.getElementById('editCourseSearchInput');
    const list = document.getElementById('editCourseDropdownList');
    if (!input || !list) return;

    await loadCoursesForEditDropdown(program);

    if (!input.dataset.bound) {
        input.dataset.bound = '1';
        input.addEventListener('input', () => filterEditCourseDropdown(input.value.toLowerCase().trim()));
        input.addEventListener('focus', () => { list.classList.add('show'); filterEditCourseDropdown(input.value.toLowerCase().trim()); });
        input.addEventListener('blur', () => setTimeout(() => list.classList.remove('show'), 200));
    }

    if (selectedId) setEditCourseValue(selectedId);
    filterEditCourseDropdown('');
}

async function loadCoursesForEditDropdown(program = '') {
    try {
        const supabase = window.sb || window.supabase;
        if (!supabase) { editCoursesData = []; return; }
        let query = supabase.from('units_catalog').select('id, unit_code, unit_name, program, block').eq('status', 'active');
        if (program) query = query.eq('program', program);
        const { data, error } = await query.order('unit_name', { ascending: true });
        if (error) throw error;
        editCoursesData = (data || []).map(u => ({
            id: u.id, unit_code: u.unit_code, unit_name: u.unit_name,
            course_name: u.unit_name, name: u.unit_name,
            code: u.unit_code, target_program: u.program, block: u.block
        }));
        filterEditCourseDropdown('');
    } catch (error) { editCoursesData = []; }
}

function filterEditCourseDropdown(searchTerm = '') {
    const list = document.getElementById('editCourseDropdownList');
    if (!list) return;
    let filtered = editCoursesData;
    if (searchTerm) filtered = editCoursesData.filter(c =>
        (c.course_name || c.name || '').toLowerCase().includes(searchTerm) ||
        (c.unit_code || c.code || '').toLowerCase().includes(searchTerm)
    );
    if (!filtered.length) {
        list.innerHTML = '<div class="no-results"><i class="fas fa-search"></i> No units found</div>';
        list.classList.add('show'); return;
    }
    let html = '';
    filtered.slice(0, 50).forEach(course => {
        const displayName = course.course_name || course.name || 'Untitled';
        const unitCode = course.unit_code || course.code || '';
        const programTag = course.target_program ? `[${course.target_program}]` : '';
        html += `<div class="dropdown-item" onclick="selectEditCourse('${course.id}','${escapeHtml(displayName).replace(/'/g, "\\'")}','${escapeHtml(unitCode).replace(/'/g, "\\'")}','${escapeHtml(programTag).replace(/'/g, "\\'")}')">
            <span>${escapeHtml(displayName)}</span>
            <span style="display:flex;gap:6px;align-items:center;">
                ${unitCode ? `<span class="course-code">${escapeHtml(unitCode)}</span>` : ''}
                ${programTag ? `<span class="program-tag">${escapeHtml(programTag)}</span>` : ''}
            </span>
        </div>`;
    });
    list.innerHTML = html;
    list.classList.add('show');
}

function selectEditCourse(courseId, courseName, courseCode, programTag) {
    const input = document.getElementById('editCourseSearchInput');
    const hidden = document.getElementById('edit_exam_course');
    const list = document.getElementById('editCourseDropdownList');
    const display = document.getElementById('editSelectedCourseDisplay');
    const nameDisplay = document.getElementById('editSelectedCourseName');

    if (input) input.value = courseName + (courseCode ? ` (${courseCode})` : '');
    if (hidden) hidden.value = courseId;
    if (list) list.classList.remove('show');
    if (display && nameDisplay) {
        display.style.display = 'inline';
        nameDisplay.textContent = courseName + (courseCode ? ` (${courseCode})` : '');
    }
}

function setEditCourseValue(courseId) {
    if (!courseId) return;
    const course = editCoursesData.find(c => String(c.id) === String(courseId));
    if (!course) return;
    const input = document.getElementById('editCourseSearchInput');
    const hidden = document.getElementById('edit_exam_course');
    const display = document.getElementById('editSelectedCourseDisplay');
    const nameDisplay = document.getElementById('editSelectedCourseName');
    if (hidden) hidden.value = courseId;
    const displayName = course.course_name || course.name || 'Untitled';
    const unitCode = course.unit_code || course.code || '';
    if (input) input.value = displayName + (unitCode ? ` (${unitCode})` : '');
    if (display && nameDisplay) {
        display.style.display = 'inline';
        nameDisplay.textContent = displayName + (unitCode ? ` (${unitCode})` : '');
    }
}

// ============================================
// GRADE MODAL — tolerant filtering + correct weighting
// ============================================
async function openGradeModal(examId, examName = '') {
    try {
        const supabase = window.sb || window.supabase;
        if (!supabase) { showFeedback('❌ Supabase client not available', 'error'); return; }

        const currentUser = await getCurrentUser();
        if (!currentUser?.user_id) { showFeedback('❌ You must be logged in to grade exams.', 'error'); return; }

        const { data: exam, error: examError } = await supabase.from('exams').select('*').eq('id', examId).single();
        if (examError || !exam) { showFeedback('❌ Error loading exam details.', 'error'); return; }

        const programField = exam.target_program || exam.program_type;
        const blockField = exam.block || exam.block_term;
        const intakeField = exam.intake_year;

        let query = supabase
            .from('consolidated_user_profiles_table')
            .select('user_id, full_name, email, program, intake_year, block, current_block, status')
            .eq('role', 'student')
            .eq('status', 'approved');

        if (programField) query = query.eq('program', programField);

        const { data: rawStudents, error: studentError } = await query.limit(500);
        if (studentError) throw studentError;

        const blockN = blockField ? _normKey(blockField) : null;
        const intakeN = intakeField != null ? String(intakeField).trim() : null;

        const students = (rawStudents || []).filter(s => {
            if (blockN) {
                const eff = _normKey(s.current_block || s.block);
                if (eff && eff !== blockN) return false;
            }
            if (intakeN) {
                const sIntake = String(s.intake_year ?? '').trim();
                if (sIntake && sIntake !== intakeN) return false;
            }
            return true;
        });

        console.log(`🎯 Grade filter: block="${blockField}" intake=${intakeField} → ${students.length}/${rawStudents?.length || 0}`);

        if (students.length === 0) {
            const blocks = [...new Set((rawStudents || []).map(s => s.current_block || s.block).filter(Boolean))].slice(0, 8);
            const intakes = [...new Set((rawStudents || []).map(s => s.intake_year).filter(Boolean))].slice(0, 8);
            showFeedback(
                `⚠️ No students matched. Exam block="${blockField}", intake="${intakeField}". Students: blocks=[${blocks.join(', ')}] intakes=[${intakes.join(', ')}]`,
                'warning'
            );
            return;
        }

        const { data: existingGrades } = await supabase.from('exam_grades').select('*').eq('exam_id', examId);
        showGradeModal(buildGradeModalHTML(exam, students, existingGrades || [], currentUser, exam.exam_type || 'EXAM'));
        showFeedback(`✅ Grading modal loaded for ${students.length} students`, 'success');
    } catch (error) {
        showFeedback('❌ Failed to load grading: ' + error.message, 'error');
    }
}

function buildGradeModalHTML(exam, students, existingGrades, currentUser, examType) {
    const examTypeLabel = getExamTypeLabel(examType);
    const marksOutOf = exam.marks_out_of || exam.total_marks || 70;
    const passMark = exam.pass_mark || 50;
    const examTitle = exam.title || exam.exam_name || 'Assessment';
    let tableHeaders = '', tableRows = '';

    if (examType === 'CAT_1' || examType === 'CAT_2') {
        const field = examType === 'CAT_1' ? 'cat_1_score' : 'cat_2_score';
        const label = examType === 'CAT_1' ? 'CAT 1' : 'CAT 2';
        tableHeaders = `<th>Student</th><th>Email</th><th>${label} (max 30)</th><th>Status</th>`;
        tableRows = students.map(s => {
            const grade = existingGrades.find(g => g.student_id === s.user_id) || {};
            return `<tr data-name="${escapeHtml((s.full_name || '').toLowerCase())}" data-email="${escapeHtml((s.email || '').toLowerCase())}" data-id="${s.user_id}"><td><strong>${escapeHtml(s.full_name)}</strong></td><td>${escapeHtml(s.email || '')}</td><td><input type="number" min="0" max="30" step="0.5" id="${examType === 'CAT_1' ? 'cat1' : 'cat2'}-${s.user_id}" value="${grade[field] ?? ''}" class="grade-input"></td><td><select id="status-${s.user_id}" class="status-select"><option value="Scheduled" ${grade.result_status === 'Scheduled' ? 'selected' : ''}>⏳ Scheduled</option><option value="InProgress" ${grade.result_status === 'InProgress' ? 'selected' : ''}>🔄 In Progress</option><option value="Final" ${grade.result_status === 'Final' ? 'selected' : ''}>✅ Final</option></select></td></tr>`;
        }).join('');
    } else {
        tableHeaders = `<th>Student</th><th>Email</th><th>CAT 1 (max 30)</th><th>CAT 2 (max 30)</th><th>Final (max ${marksOutOf})</th><th>Total</th><th>Status</th>`;
        tableRows = students.map(s => {
            const grade = existingGrades.find(g => g.student_id === s.user_id) || {};
            return `<tr data-name="${escapeHtml((s.full_name || '').toLowerCase())}" data-email="${escapeHtml((s.email || '').toLowerCase())}" data-id="${s.user_id}"><td><strong>${escapeHtml(s.full_name)}</strong></td><td>${escapeHtml(s.email || '')}</td><td><input type="number" min="0" max="30" step="0.5" id="cat1-${s.user_id}" value="${grade.cat_1_score ?? ''}" class="grade-input" oninput="updateGradeTotal('${s.user_id}', ${marksOutOf})"></td><td><input type="number" min="0" max="30" step="0.5" id="cat2-${s.user_id}" value="${grade.cat_2_score ?? ''}" class="grade-input" oninput="updateGradeTotal('${s.user_id}', ${marksOutOf})"></td><td><input type="number" min="0" max="${marksOutOf}" step="0.5" id="final-${s.user_id}" value="${grade.exam_score ?? ''}" class="grade-input" oninput="updateGradeTotal('${s.user_id}', ${marksOutOf})"></td><td><input type="number" min="0" max="100" step="0.1" id="total-${s.user_id}" value="" readonly class="total-input"></td><td><select id="status-${s.user_id}" class="status-select"><option value="Scheduled" ${grade.result_status === 'Scheduled' ? 'selected' : ''}>⏳ Scheduled</option><option value="InProgress" ${grade.result_status === 'InProgress' ? 'selected' : ''}>🔄 In Progress</option><option value="Final" ${grade.result_status === 'Final' ? 'selected' : ''}>✅ Final</option></select></td></tr>`;
        }).join('');
    }

    return `<div class="modal-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;"><div style="background:white;border-radius:16px;max-width:1000px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.3);"><div style="padding:16px 24px;border-bottom:2px solid #4C1D95;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;background:white;z-index:10;"><div><h3 style="margin:0;color:#4C1D95;"><i class="fas fa-check-double"></i> ${examTypeLabel}: ${escapeHtml(examTitle)}</h3><p style="margin:2px 0;font-size:12px;color:#94a3b8;">${escapeHtml(exam.program_type || exam.target_program || 'N/A')} | Block: ${escapeHtml(exam.block || exam.block_term || 'N/A')} | Pass: ${passMark}% | Students: ${students.length}</p></div><button onclick="closeGradeModal()" style="background:none;border:none;font-size:28px;cursor:pointer;color:#6b7280;">&times;</button></div><div style="padding:16px 24px;"><div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap;"><input type="text" id="gradeSearch" placeholder="🔍 Search by name or email..." style="flex:1;min-width:200px;padding:8px 14px;border-radius:8px;border:1px solid #e2e8f0;font-size:13px;" oninput="filterGradeStudents()"><span style="font-size:12px;color:#94a3b8;display:flex;align-items:center;"><i class="fas fa-users"></i> ${students.length} students</span></div><div style="overflow-x:auto;max-height:50vh;overflow-y:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;"><thead style="position:sticky;top:0;z-index:5;"><tr style="background:#f8fafc;border-bottom:2px solid #e5e7eb;">${tableHeaders}</tr></thead><tbody id="gradeTableBody">${tableRows}</tbody></table></div></div><div style="padding:16px 24px;border-top:1px solid #e5e7eb;display:flex;gap:12px;justify-content:flex-end;"><button onclick="saveGrades('${exam.id}')" style="background:#10b981;color:white;border:none;padding:10px 24px;border-radius:8px;cursor:pointer;font-weight:600;"><i class="fas fa-save"></i> Save Grades</button><button onclick="closeGradeModal()" style="background:#e5e7eb;color:#475569;border:none;padding:10px 24px;border-radius:8px;cursor:pointer;font-weight:600;">Cancel</button></div></div></div>`;
}

function showGradeModal(modalHtml) {
    document.getElementById('gradeModal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'gradeModal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:10000;';
    modal.innerHTML = modalHtml;
    document.body.appendChild(modal);
}

function closeGradeModal() { document.getElementById('gradeModal')?.remove(); }

function filterGradeStudents() {
    const search = document.getElementById('gradeSearch')?.value?.toLowerCase() || '';
    document.querySelectorAll('#gradeTableBody tr').forEach(row => {
        const name = row.getAttribute('data-name') || '';
        const email = row.getAttribute('data-email') || '';
        row.style.display = name.includes(search) || email.includes(search) ? '' : 'none';
    });
}

function updateGradeTotal(studentId, marksOutOf = 70) {
    const cat1 = parseFloat(document.getElementById(`cat1-${studentId}`)?.value) || 0;
    const cat2 = parseFloat(document.getElementById(`cat2-${studentId}`)?.value) || 0;
    const finalExam = parseFloat(document.getElementById(`final-${studentId}`)?.value) || 0;

    const catPct = ((Math.min(cat1, 30) + Math.min(cat2, 30)) / 60) * 30;
    const examPct = (Math.min(finalExam, marksOutOf) / marksOutOf) * 70;
    const total = Math.round((catPct + examPct) * 10) / 10;

    const totalInput = document.getElementById(`total-${studentId}`);
    if (totalInput) totalInput.value = total.toFixed(1);
}

async function saveGrades(examId) {
    try {
        const supabase = window.sb || window.supabase;
        if (!supabase) { showFeedback('❌ Supabase client not available', 'error'); return; }

        const rows = document.querySelectorAll('#gradeTableBody tr');
        const currentUser = await getCurrentUser();
        if (!currentUser) { showFeedback('❌ Please login first', 'error'); return; }

        let saved = 0;
        for (const row of rows) {
            const studentId = row.getAttribute('data-id');
            if (!studentId) continue;

            const cat1 = parseFloat(document.getElementById(`cat1-${studentId}`)?.value) || null;
            const cat2 = parseFloat(document.getElementById(`cat2-${studentId}`)?.value) || null;
            const finalExam = parseFloat(document.getElementById(`final-${studentId}`)?.value) || null;
            const status = document.getElementById(`status-${studentId}`)?.value || 'Scheduled';

            if (!cat1 && !cat2 && !finalExam) continue;

            const gradeData = {
                exam_id: parseInt(examId),
                student_id: studentId,
                cat_1_score: cat1,
                cat_2_score: cat2,
                exam_score: finalExam,
                result_status: status,
                graded_by: currentUser.user_id,
                updated_at: new Date().toISOString()
            };

            const { data: existing } = await supabase.from('exam_grades').select('id')
                .eq('exam_id', parseInt(examId)).eq('student_id', studentId).maybeSingle();

            if (existing) {
                await supabase.from('exam_grades').update(gradeData).eq('id', existing.id);
            } else {
                await supabase.from('exam_grades').insert({ ...gradeData, created_at: new Date().toISOString() });
            }
            saved++;
        }

        showFeedback(`✅ ${saved} grades saved successfully!`, 'success');
        setTimeout(closeGradeModal, 1000);
    } catch (error) {
        showFeedback('❌ Failed to save grades: ' + error.message, 'error');
    }
}

function getExamTypeLabel(examType) {
    return {
        'CAT_1': 'CAT 1 Assessment', 'CAT_2': 'CAT 2 Assessment', 'CAT': 'Continuous Assessment Test',
        'EXAM': 'Final Examination', 'ASSIGNMENT': 'Assignment', 'END_TERM': 'End of Term Exam',
        'SUPPLEMENTARY': 'Supplementary Exam', 'OSCE': 'OSCE', 'RAT': 'RAT',
        'PRACTICAL': 'Practical Assessment', 'QUIZ': 'Quiz'
    }[examType] || 'Assessment';
}

// ============================================
// INIT
// ============================================
function initExams() {
    cacheDomElements();
    const D = window.DOM;
    const dateInput = document.getElementById('exam_date');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

    populateProgramDropdowns();

    loadExams();
    loadAvailableClassesForExam();

    const program = document.getElementById('exam_program')?.value || '';
    if (typeof initCreateCourseDropdown === 'function') initCreateCourseDropdown(program);

    if (D.examSearch) D.examSearch.addEventListener('input', filterExamsTable);
    if (D.programFilter) D.programFilter.addEventListener('change', filterExamsTable);
    if (D.statusFilter) D.statusFilter.addEventListener('change', filterExamsTable);
    if (D.monthFilter) D.monthFilter.addEventListener('change', filterExamsTable);

    if (!window.__examDelegationBound) {
        window.__examDelegationBound = true;
        document.addEventListener('change', function (e) {
            if (!e.target) return;
            if (e.target.id === 'exam_program') {
                console.log('🎯 Program changed:', e.target.value);
                updateBlockTermOptions('exam_program', 'exam_block_term');
                loadAvailableClassesForExam();
                selectedStudentsForNotification = [];
                updateSelectedStudentsDisplay();
                loadStudentsForNotification();
                if (typeof updateCreateCourseDropdown === 'function') updateCreateCourseDropdown();
            }
            if (e.target.id === 'exam_block_term') {
                console.log('🎯 Block changed:', e.target.value);
                selectedStudentsForNotification = [];
                updateSelectedStudentsDisplay();
                loadStudentsForNotification();
            }
            if (e.target.classList?.contains('exam-class-checkbox')) {
                selectedStudentsForNotification = [];
                updateSelectedStudentsDisplay();
                loadStudentsForNotification();
            }
        });
    }

    setTimeout(() => {
        const ps = document.getElementById('exam_program');
        if (ps?.value) { updateBlockTermOptions('exam_program', 'exam_block_term'); loadAvailableClassesForExam(); }
        loadStudentsForNotification();
    }, 500);

    console.log('🚀 Exams/CATS initialized');
}

// ============================================
// GLOBAL EXPOSURE
// ============================================
window.filterExamsTable = filterExamsTable;
window.buildExamNameFromCourse = buildExamNameFromCourse;
window.updateCreateCourseDropdown = updateCreateCourseDropdown;
window.initCreateCourseDropdown = initCreateCourseDropdown;
window.createUnitsData = createUnitsData;
window.loadCoursesForCreateDropdown = loadCoursesForCreateDropdown;
window.filterCreateCourseDropdown = filterCreateCourseDropdown;
window.selectCreateCourse = selectCreateCourse;
window.initEditCourseDropdown = initEditCourseDropdown;
window.selectEditCourse = selectEditCourse;
window.setEditCourseValue = setEditCourseValue;

window.sendEmailWithBrevo = sendEmailWithBrevo;
window.sendEmailWithEdgeFunctionFallback = sendEmailWithEdgeFunctionFallback;
window.sendExamNotificationEmail = sendExamNotificationEmail;
window.loadStudentsForNotification = loadStudentsForNotification;
window.searchStudentsForNotification = searchStudentsForNotification;
window.toggleStudentForNotification = toggleStudentForNotification;
window.updateSelectedStudentsDisplay = updateSelectedStudentsDisplay;
window.debounce = debounce;

window.loadExams = loadExams;
window.showExamTab = showExamTab;
window.deleteExam = deleteExam;
window.closeExam = closeExam;
window.openEditExamModal = openEditExamModal;
window.saveEditedExam = saveEditedExam;
window.exportExamsToCSV = exportExamsToCSV;
window.handleAddExam = handleAddExam;
window.addCustomBlocks = addCustomBlocks;
window.addClass = addClass;
window.removeClass = removeClass;
window.closeEditModal = closeEditModal;
window.getSelectedClasses = getSelectedClasses;
window.loadAvailableClassesForExam = loadAvailableClassesForExam;
window.populateProgramDropdowns = populateProgramDropdowns;
window.escapeHtml = window.escapeHtml || escapeHtml;
window.getCurrentUser = getCurrentUser;
window.ExamCache = ExamCache;
window.initExams = initExams;
window.openGradeModal = openGradeModal;
window.closeGradeModal = closeGradeModal;
window.saveGrades = saveGrades;
window.filterGradeStudents = filterGradeStudents;
window.updateGradeTotal = updateGradeTotal;
window.getExamTypeLabel = getExamTypeLabel;
window.updateBlockTermOptions = updateBlockTermOptions;
window.DOM = window.DOM || DOM;

console.log('✅ CATS/Exams loaded — 13-column table, tolerant filters, correct weighting.');

// ============================================================
// SELF-BOOT — MUST BE AT THE BOTTOM OF THE FILE
// All functions above must be defined before this runs.
// ============================================================
(function bootSuperadminExams() {
    function boot() {
        if (window.__superadminExamsBooted) {
            console.log('ℹ️ superadmin-exams already booted — skipping');
            return;
        }

        if (typeof window.initExams !== 'function' && typeof initExams !== 'function') {
            console.warn('⏳ initExams not yet available — retrying in 300ms');
            setTimeout(boot, 300);
            return;
        }

        window.__superadminExamsBooted = true;

        try {
            if (typeof window.initExams === 'function') {
                window.initExams();
            } else {
                initExams();
            }
            console.log('✅ superadmin-exams module self-booted');
        } catch (e) {
            console.error('❌ superadmin-exams boot failed:', e);
            window.__superadminExamsBooted = false;
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        setTimeout(boot, 700);
    }
})();
