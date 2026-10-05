/********************************** *********************
 * 13. EXAMS/CATS MANAGEMENT - COMPLETE WITH EMAIL NOTIFICATIONS
 * Part 1
 *******************************************************/

// ============================================
// FEEDBACK / TOAST HELPER
// ============================================
function showFeedback(message, type = 'info') {
    const colors = { success: '#10b981', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };
    document.querySelectorAll('.exam-feedback-toast').forEach(el => el.remove());
    const toast = document.createElement('div');
    toast.className = 'exam-feedback-toast';
    toast.textContent = message;
    toast.style.cssText = `position:fixed;right:24px;bottom:24px;z-index:99999;max-width:420px;padding:13px 18px;background:${colors[type] || colors.info};color:#fff;border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,.18);font-size:13px;font-weight:600;line-height:1.45;opacity:0;transform:translateY(10px);transition:opacity .2s ease,transform .2s ease;`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity='1'; toast.style.transform='translateY(0)'; });
    setTimeout(() => { toast.style.opacity='0'; toast.style.transform='translateY(10px)'; setTimeout(() => toast.remove(), 220); }, type === 'error' ? 5000 : 3500);
}
window.showFeedback = window.showFeedback || showFeedback;

const EXAM_CONFIG = { CACHE_TTL: 60000, BATCH_SIZE: 50, DEBOUNCE_DELAY: 300 };

const ExamCache = {
    _cache: {},
    get(key) {
        const item = this._cache[key];
        if (!item) return null;
        if (Date.now() - item.timestamp > EXAM_CONFIG.CACHE_TTL) { delete this._cache[key]; return null; }
        return item.data;
    },
    set(key, data) { this._cache[key] = { data, timestamp: Date.now() }; },
    clear() { this._cache = {}; }
};

function cacheDomElements() {
    if (typeof DOM === 'undefined') window.DOM = {};
    DOM.examsTbody = document.getElementById('exams-table-body');
    DOM.studentExams = document.getElementById('student-exams');
    DOM.examSearch = document.getElementById('exam-search');
    DOM.programFilter = document.getElementById('exam_filter_program');
    DOM.statusFilter = document.getElementById('exam_filter_status');
    DOM.monthFilter = document.getElementById('exam_filter_intake_month');
    DOM.examForm = document.getElementById('add-exam-form-enhanced');
    DOM.classSelector = document.getElementById('exam_class_selector');
    DOM.courseSelect = document.getElementById('exam_course_id');
}

function debounce(fn, delay = 300) {
    let timer;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}
window.debounce = debounce;

async function sendEmailWithBrevo(to, subject, htmlContent) {
    try {
        const supabase = window.sb || window.supabase;
        if (!supabase) return { success: false, error: 'Supabase client not available' };

        let accessToken = null;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            accessToken = session?.access_token || null;
        } catch (_) {}

        const headers = {
            'Content-Type': 'application/json'
        };
        if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

        const response = await fetch(
            'https://lwhtjozfsmbyihenfunw.supabase.co/functions/v1/send-email',
            {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    to,
                    subject,
                    html: htmlContent,
                    from: 'NCHSM Exam Office <noreply@nakurucollegeofhealthelearning.site>'
                })
            }
        );

        let data = {};
        try { data = await response.json(); } catch (_) {}

        if (response.ok && data.success !== false) {
            console.log(`✅ Exam email accepted for ${to}`);
            return { success: true, data };
        }

        const error = data.error || data.message || `Email service returned HTTP ${response.status}`;
        console.error(`❌ Exam email failed for ${to}:`, error, data);
        return { success: false, error };
    } catch (error) {
        console.error(`❌ Exam email request failed for ${to}:`, error);
        return { success: false, error: error.message || 'Network error' };
    }
}

async function sendExamNotificationEmail(examData, recipients) {
    const validRecipients = (recipients || []).filter(
        s => s && typeof s.email === 'string' && s.email.trim()
    );

    if (!validRecipients.length) {
        return {
            sent: 0,
            total: recipients?.length || 0,
            attempted: 0,
            failed: recipients?.length || 0,
            errors: ['No recipient records contained an email address.']
        };
    }

    const examDate = examData.exam_date
        ? new Date(examData.exam_date).toLocaleDateString('en-KE', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        })
        : 'TBD';
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
        .header h1{margin:0;font-size:24px;}.header p{margin:4px 0 0;opacity:.8;}
        .body{padding:30px 35px;}.greeting{background:#e8f4f8;border-radius:12px;padding:16px;margin-bottom:20px;border-left:4px solid #10b981;}
        .greeting p{margin:0;font-size:16px;color:#0A3D62;}.details{background:#f8fafc;border-radius:12px;padding:16px;margin-bottom:20px;}
        .details h4{margin:0 0 12px;color:#1e293b;}.details table{width:100%;border-collapse:collapse;font-size:14px;}
        .details td{padding:8px 0;border-bottom:1px solid #e2e8f0;}.details .label{color:#64748B;font-weight:500;}
        .details .value{color:#0A3D62;font-weight:600;text-align:right;}.details tr:last-child td{border-bottom:none;}
        .btn{display:inline-block;background:#0A3D62;color:white;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:16px;}
        .footer{background:#F8FAFC;padding:20px;text-align:center;}
    </style></head><body><div class="container"><div class="card">
        <div class="header"><h1>📝 New Examination Notice</h1><p>Nakuru College of Health Sciences and Management</p></div>
        <div class="body">
            <div class="greeting"><p>Dear Student, a new assessment has been scheduled for you.</p></div>
            <div class="details"><h4>Examination Details</h4><table>
                <tr><td class="label">Assessment</td><td class="value">${escapeHtml(examTitle)}</td></tr>
                <tr><td class="label">Type</td><td class="value">${escapeHtml(examTypeLabel)}</td></tr>
                <tr><td class="label">Date</td><td class="value">${escapeHtml(examDate)}</td></tr>
                <tr><td class="label">Time</td><td class="value">${escapeHtml(examTime)}</td></tr>
                <tr><td class="label">Duration</td><td class="value">${examData.duration_minutes || 60} minutes</td></tr>
                <tr><td class="label">Marks</td><td class="value">${examData.marks_out_of || examData.total_marks || 100}</td></tr>
                <tr><td class="label">Pass Mark</td><td class="value">${examData.pass_mark || 50}%</td></tr>
                ${examLink && examLink !== '#' ? `<tr><td class="label">Exam Link</td><td class="value"><a href="${escapeHtml(examLink)}" target="_blank">Open Exam</a></td></tr>` : ''}
            </table></div>
            ${examLink && examLink !== '#' ? `<div style="text-align:center;margin:20px 0;"><a href="${escapeHtml(examLink)}" target="_blank" class="btn">🚪 Take Exam</a></div>` : ''}
            <div style="background:#fef3c7;border-radius:12px;padding:12px 16px;border-left:4px solid #f59e0b;margin-top:16px;">
                <p style="margin:0;font-size:13px;color:#78350F;"><strong>Important:</strong> Please ensure you have a stable internet connection before starting the exam.</p>
            </div>
        </div>
        <div class="footer"><p>📞 +254 790 969 743 &nbsp;|&nbsp; 📧 admin@nchsm.co.ke</p>
        <p style="font-size:.75rem;">© ${new Date().getFullYear()} Nakuru College of Health Sciences and Management</p></div>
    </div></div></body></html>`;

    console.log(`📧 EMAIL NOTIFICATION: attempting ${validRecipients.length} of ${recipients.length} recipients`);

    let sentCount = 0;
    let failedCount = 0;
    const errors = [];

    // Send in small concurrent batches instead of waiting 200ms for every student.
    const batchSize = 8;
    for (let i = 0; i < validRecipients.length; i += batchSize) {
        const batch = validRecipients.slice(i, i + batchSize);
        const results = await Promise.all(batch.map(student =>
            sendEmailWithBrevo(
                student.email.trim(),
                `📝 ${examTypeLabel}: ${examTitle}`,
                emailHtml
            )
        ));

        results.forEach((result, index) => {
            if (result.success) {
                sentCount++;
            } else {
                failedCount++;
                if (errors.length < 10) {
                    errors.push(`${batch[index].email}: ${result.error || 'Unknown email error'}`);
                }
            }
        });
    }

    try {
        const supabase = window.sb || window.supabase;
        if (supabase && examData.id) {
            await supabase.from('exam_notifications').insert([{
                exam_id: examData.id,
                recipients: validRecipients.length,
                sent_count: sentCount,
                failed_count: failedCount,
                sent_at: new Date().toISOString()
            }]);
        }
    } catch (error) {
        console.warn('Could not save notification record:', error);
    }

    console.log('📧 EMAIL NOTIFICATION COMPLETE:', {
        requested: recipients.length,
        attempted: validRecipients.length,
        sent: sentCount,
        failed: failedCount,
        errors
    });

    return {
        sent: sentCount,
        failed: failedCount,
        total: recipients.length,
        attempted: validRecipients.length,
        errors
    };
}

let selectedStudentsForNotification = [];
let allStudentsForProgram = [];   // ALL approved students in selected program
let allStudentsForBlock = [];     // Students in selected program + selected block

function getNotificationTarget() {
    return document.getElementById('exam_notify_target')?.value || 'all';
}

function getNotificationRecipientsForCount() {
    const target = getNotificationTarget();

    if (target === 'specific') {
        return [...selectedStudentsForNotification];
    }

    if (target === 'program') {
        return [...allStudentsForProgram];
    }

    if (target === 'block') {
        return [...allStudentsForBlock];
    }

    // "all" means the current Program + current Block.
    return [...allStudentsForBlock];
}

function updateNotificationCount() {
    const countEl = document.getElementById('student_notify_count');
    if (!countEl) return;

    const recipients = getNotificationRecipientsForCount();
    countEl.textContent = `${recipients.length} students`;

    console.log('📊 Notification target/count:', {
        target: getNotificationTarget(),
        programStudents: allStudentsForProgram.length,
        blockStudents: allStudentsForBlock.length,
        selectedStudents: selectedStudentsForNotification.length,
        recipients: recipients.length
    });
}

async function loadStudentsForNotification() {
    const program = document.getElementById('exam_program')?.value;
    const block = document.getElementById('exam_block_term')?.value;

    console.log('📋 Loading notification students:', { program, block });

    if (!program) {
        allStudentsForProgram = [];
        allStudentsForBlock = [];
        selectedStudentsForNotification = [];
        updateNotificationCount();
        updateSelectedStudentsDisplay();
        return;
    }

    try {
        const supabase = window.sb || window.supabase;
        if (!supabase) throw new Error('Supabase client not available');

        // IMPORTANT: always load the complete PROGRAM population first.
        // Do not apply the block filter here, otherwise changing the target
        // cannot change the count.
        const { data: programStudents, error: programError } = await supabase
            .from('consolidated_user_profiles_table')
            .select('user_id, full_name, email, program, block')
            .eq('role', 'student')
            .eq('status', 'approved')
            .eq('program', program)
            .limit(1000);

        if (programError) throw programError;

        allStudentsForProgram = programStudents || [];

        // Derive the selected-block population from the same program dataset.
        // This keeps the count and the actual recipients consistent.
        if (block && block !== '' && block !== '-- Select --' && block !== '-- Select Block/Term --') {
            allStudentsForBlock = allStudentsForProgram.filter(
                s => String(s.block || '').trim() === String(block).trim()
            );
        } else {
            allStudentsForBlock = [];
        }

        // Remove selections that no longer exist in the current program.
        const validIds = new Set(allStudentsForProgram.map(s => s.user_id));
        selectedStudentsForNotification = selectedStudentsForNotification.filter(
            s => validIds.has(s.user_id)
        );

        console.log('✅ Notification populations loaded:', {
            program,
            block,
            programCount: allStudentsForProgram.length,
            blockCount: allStudentsForBlock.length,
            target: getNotificationTarget()
        });

        updateNotificationCount();
        updateSelectedStudentsDisplay();

    } catch (error) {
        console.error('❌ Error loading notification students:', error);
        allStudentsForProgram = [];
        allStudentsForBlock = [];
        selectedStudentsForNotification = [];
        updateNotificationCount();
        updateSelectedStudentsDisplay();
    }
}


function searchStudentsForNotification() {
    const searchTerm = document.getElementById('exam_student_search')?.value?.toLowerCase() || '';
    const resultsContainer = document.getElementById('student_search_results');
    if (!resultsContainer) return;
    let filtered = searchTerm ? allStudentsForProgram.filter(s => (s.full_name || '').toLowerCase().includes(searchTerm) || (s.email || '').toLowerCase().includes(searchTerm)) : allStudentsForProgram;
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

async function loadExams(forceRefresh = false) {
    cacheDomElements();
    if (!DOM.examsTbody) return;
    if (!forceRefresh) {
        const cached = ExamCache.get('exams_list');
        if (cached) { renderExamsTable(cached); renderStudentExams(cached); updateExamStats(cached); return; }
    }
    DOM.examsTbody.innerHTML = `<tr><td colspan="12" style="padding:40px;text-align:center;color:#94a3b8;"><div class="loading-spinner" style="margin:0 auto 12px;"></div><p style="margin-top:10px;font-size:13px;">Loading exams...</p></td></tr>`;
    try {
        const supabase = window.sb || window.supabase;
        if (!supabase) throw new Error('Supabase client not available');
        const { data: exams, error } = await supabase.from('exams').select('*').order('created_at', { ascending: false }).limit(200);
        if (error) throw error;
        const { data: allCourses } = await supabase.from('courses').select('id, course_name, name, unit_code, target_program');
        if (allCourses) {
            const courseMap = {}; allCourses.forEach(c => { courseMap[c.id] = c; }); window._courseMap = courseMap;
            (exams || []).forEach(exam => { if (exam.course_id && courseMap[exam.course_id]) exam.course = courseMap[exam.course_id]; });
        }
        ExamCache.set('exams_list', exams || []);
        renderExamsTable(exams || []); renderStudentExams(exams || []); updateExamStats(exams || []);
    } catch (error) {
        console.error('Error loading exams:', error);
        DOM.examsTbody.innerHTML = `<tr><td colspan="12" style="padding:30px;text-align:center;color:#dc2626;font-size:13px;"><i class="fas fa-exclamation-circle"></i> Failed: ${error.message}<br><button onclick="loadExams(true)" style="margin-top:10px;padding:6px 16px;background:#7c3aed;color:white;border:none;border-radius:6px;cursor:pointer;"><i class="fas fa-sync-alt"></i> Retry</button></td></tr>`;
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
        Published:{bg:'#d1fae5',color:'#065f46',icon:'✅',label:'Published'},published:{bg:'#d1fae5',color:'#065f46',icon:'✅',label:'Published'},
        Upcoming:{bg:'#dbeafe',color:'#1e40af',icon:'📅',label:'Upcoming'},upcoming:{bg:'#dbeafe',color:'#1e40af',icon:'📅',label:'Upcoming'},
        InProgress:{bg:'#fef3c7',color:'#92400e',icon:'⏳',label:'In Progress'},'In Progress':{bg:'#fef3c7',color:'#92400e',icon:'⏳',label:'In Progress'},
        Completed:{bg:'#d1fae5',color:'#065f46',icon:'✅',label:'Completed'},completed:{bg:'#d1fae5',color:'#065f46',icon:'✅',label:'Completed'},
        Draft:{bg:'#f3f4f6',color:'#6b7280',icon:'📝',label:'Draft'},draft:{bg:'#f3f4f6',color:'#6b7280',icon:'📝',label:'Draft'},
        Closed:{bg:'#fee2e2',color:'#991b1b',icon:'🔒',label:'Closed'},closed:{bg:'#fee2e2',color:'#991b1b',icon:'🔒',label:'Closed'}
    };
    const s = statusMap[status] || statusMap.Draft;
    return `<span style="display:inline-flex;align-items:center;gap:4px;background:${s.bg};color:${s.color};padding:2px 12px;border-radius:12px;font-size:11px;font-weight:600;border:1px solid ${s.color}33;">${s.icon} ${s.label}</span>`;
}

function renderExamsTable(exams) {
    if (!DOM.examsTbody) return;
    if (!exams.length) { DOM.examsTbody.innerHTML = `<tr><td colspan="12" style="padding:40px;text-align:center;color:#94a3b8;">No exams found. Create your first exam!</td></tr>`; return; }
    let html = '';
    for (const e of exams) {
        let courseName = e.course?.course_name || e.course?.name || e.course?.unit_code || e.course_name || e.unit_name || 'N/A';
        if (e.course_id && window._courseMap?.[e.course_id]) { const c=window._courseMap[e.course_id]; courseName=c.course_name||c.name||c.unit_code||courseName; }
        const title=e.title||e.exam_name||'Untitled', type=e.exam_type||'N/A', programDisplay=e.target_program||e.program_type||'N/A';
        const marksOutOf=e.marks_out_of||e.total_marks||100, passMark=e.pass_mark||50, status=e.status||'draft', link=e.online_link||e.exam_link;
        let formattedDate='N/A', formattedTime='N/A';
        if (e.exam_date||e.created_at) { try { const d=new Date(e.exam_date||e.created_at); if(!isNaN(d.getTime())) formattedDate=d.toLocaleDateString('en-KE',{year:'numeric',month:'short',day:'numeric'}); } catch(err){} }
        if(e.exam_start_time?.includes(':')) formattedTime=e.exam_start_time.substring(0,5);
        const intakeDisplay=e.intake_year?`${e.intake_year}${e.intake_month?' '+e.intake_month:''}`:'N/A', blockDisplay=e.block||e.block_term||'N/A', durationDisplay=e.duration_minutes?e.duration_minutes+'m':'N/A';
        html += `<tr style="border-bottom:1px solid #f1f5f9;" data-program="${escapeHtml(programDisplay)}" data-status="${escapeHtml(status)}" data-month="${escapeHtml(e.intake_month||'')}">
        <td style="padding:8px 10px;font-size:12px;text-align:center;"><span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:10px;font-weight:600;background:${type==='EXAM'?'#dbeafe':'#fef3c7'};color:${type==='EXAM'?'#1e40af':'#92400e'};">${escapeHtml(type)}</span></td>
        <td style="padding:8px 10px;font-size:12px;">${escapeHtml(programDisplay)}</td><td style="padding:8px 10px;font-size:12px;">${escapeHtml(courseName)}</td><td style="padding:8px 10px;font-weight:500;font-size:13px;">${escapeHtml(title)}</td>
        <td style="padding:8px 10px;text-align:center;font-weight:600;">${marksOutOf}</td><td style="padding:8px 10px;text-align:center;font-weight:600;color:${parseInt(passMark)>=50?'#059669':'#dc2626'};">${passMark}%</td>
        <td style="padding:8px 10px;font-size:12px;"><div>${formattedDate}</div><div style="font-size:10px;color:#94a3b8;">${formattedTime}</div></td><td style="padding:8px 10px;text-align:center;font-size:12px;">${durationDisplay}</td>
        <td style="padding:8px 10px;font-size:12px;text-align:center;">${escapeHtml(intakeDisplay)}</td><td style="padding:8px 10px;font-size:12px;text-align:center;">${escapeHtml(blockDisplay)}</td><td style="padding:8px 10px;text-align:center;">${getStatusBadge(status)}</td>
        <td style="padding:8px 10px;text-align:center;white-space:nowrap;">
        <button onclick="openEditExamModal('${e.id}')" style="padding:4px 10px;background:#3b82f6;color:white;border:none;border-radius:4px;cursor:pointer;" title="Edit"><i class="fas fa-edit"></i></button>
        <button onclick="openGradeModal('${e.id}')" style="padding:4px 10px;background:#10b981;color:white;border:none;border-radius:4px;cursor:pointer;" title="Grade"><i class="fas fa-check-double"></i></button>
        ${status!=='Completed'&&status!=='Closed'&&status!=='completed'?`<button onclick="closeExam('${e.id}')" style="padding:4px 10px;background:#f59e0b;color:white;border:none;border-radius:4px;cursor:pointer;" title="Close"><i class="fas fa-lock"></i></button>`:''}
        <button onclick="deleteExam('${e.id}', '${escapeHtml(title)}')" style="padding:4px 10px;background:#dc2626;color:white;border:none;border-radius:4px;cursor:pointer;" title="Delete"><i class="fas fa-trash"></i></button>
        ${link?`<a href="${escapeHtml(link)}" target="_blank" style="padding:4px 10px;background:#059669;color:white;border-radius:4px;text-decoration:none;display:inline-block;" title="Open"><i class="fas fa-external-link-alt"></i></a>`:''}
        </td></tr>`;
    }
    DOM.examsTbody.innerHTML=html;
}

function renderStudentExams(exams) {
    if(!DOM.studentExams)return;
    const published=exams.filter(e=>['Published','published','Upcoming','InProgress'].includes(e.status));
    if(!published.length){DOM.studentExams.innerHTML='<p style="color:#94a3b8;padding:20px;text-align:center;">No published assessments available.</p>';return;}
    let html='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px;">';
    for(const exam of published.slice(0,6)){
        const dateStr=exam.exam_date?new Date(exam.exam_date).toLocaleDateString():'', statusClass=exam.status==='Upcoming'?'upcoming':exam.status==='InProgress'?'in-progress':'completed';
        const borderColor=statusClass==='upcoming'?'#f59e0b':statusClass==='in-progress'?'#3b82f6':'#10b981', link=exam.online_link||exam.exam_link, courseName=exam.course?.course_name||exam.course_name||exam.subject_name||'N/A';
        html+=`<div style="background:white;border-radius:12px;padding:14px 16px;border-left:4px solid ${borderColor};border:1px solid #f1f5f9;"><h4 style="margin:0 0 6px;font-size:14px;">${escapeHtml(exam.title||exam.exam_name||'Assessment')}</h4><div style="font-size:12px;color:#94a3b8;">${escapeHtml(courseName)}</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 14px;font-size:12px;color:#475569;margin-top:6px;"><span><strong>Type:</strong> ${escapeHtml(exam.exam_type||'')}</span><span><strong>Duration:</strong> ${exam.duration_minutes||'N/A'}m</span><span><strong>Date:</strong> ${dateStr}</span><span><strong>Marks:</strong> ${exam.marks_out_of||exam.total_marks||100}</span></div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;"><span style="font-size:11px;color:${borderColor};">${escapeHtml(exam.status)}</span>${link?`<a href="${escapeHtml(link)}" target="_blank" style="background:linear-gradient(135deg,#7c3aed,#6d28d9);color:white;padding:4px 16px;border-radius:20px;text-decoration:none;font-size:12px;font-weight:600;">Take Exam</a>`:''}</div></div>`;
    }
    html+='</div>'; DOM.studentExams.innerHTML=html;
}

function getProgramOptions() {
    const groups=[
        {label:'🎓 KRCHN Nursing',programs:['KRCHN - Kenya Registered Community Health Nursing']},
        {label:'🎯 TVET Diploma',programs:['DPOTT - Diploma in Perioperative Theatre Technology','DCH - Diploma in Community Health','DHRIT - Diploma in Health Records and IT','DSL - Diploma in Science Lab','DSW - Diploma in Social Work','DCJS - Diploma in Criminal Justice','DHSS - Diploma in Health Support Services','DICT - Diploma in ICT','DME - Diploma in Medical Engineering']},
        {label:'📜 TVET Certificate',programs:['CPOTT - Certificate in Perioperative Theatre Technology','CCH - Certificate in Community Health','CHRIT - Certificate in Health Records and IT','CPC - Certificate in Patient Care','CSL - Certificate in Science Lab','CSW - Certificate in Social Work','CCJS - Certificate in Criminal Justice','CAG - Certificate in Agriculture','CHSS - Certificate in Health Support Services','CICT - Certificate in ICT']},
        {label:'🔧 Artisan',programs:['ACH - Artisan in Community Health','AAG - Artisan in Agriculture','ASW - Artisan in Social Work']},
        {label:'📊 Other',programs:['CCA - Certificate in Computer Applications','PTE - TVET/CDACC (PTE)']}
    ];
    return groups.map(g=>`<optgroup label="${g.label}">${g.programs.map(p=>{const code=p.split(' - ')[0];return `<option value="${code}">${p}</option>`}).join('')}</optgroup>`).join('');
}
function populateProgramDropdowns(){
    const options=getProgramOptions(), examProgram=document.getElementById('exam_program'), editExamProgram=document.getElementById('edit_exam_program');
    if(examProgram)examProgram.innerHTML='<option value="">-- Select Program --</option>'+options;
    if(editExamProgram&&!editExamProgram.querySelector('option[value=""]'))editExamProgram.innerHTML='<option value="">-- Select Program --</option>'+options;
}
function isTVETProgram(programCode){
    if(!programCode)return false; const code=String(programCode).toUpperCase().trim(); if(code==='KRCHN')return false;
    return ['DPOTT','DCH','DHRIT','DSL','DSW','DCJS','DHSS','DICT','DME','CPOTT','CCH','CHRIT','CPC','CSL','CSW','CCJS','CAG','CHSS','CICT','CCA','ACH','AAG','ASW','PTE','COMT','CCG'].includes(code);
}
function getProgramLevel(programCode){
    if(!programCode)return 'KRCHN'; const code=String(programCode).toUpperCase().trim();
    if(code.startsWith('D'))return 'DIPLOMA'; if(code.startsWith('C')&&code!=='CCA')return 'CERTIFICATE'; if(code.startsWith('A'))return 'ARTISAN'; if(code==='CCA'||code==='PTE')return 'OTHER'; return 'KRCHN';
}
async function loadAvailableClassesForExam(){
    if(!DOM.classSelector)return;
    const program=document.getElementById('exam_program')?.value||'KRCHN', isTVET=isTVETProgram(program), level=getProgramLevel(program);
    let options=[], blockLabel='Block';
    if(isTVET){
        blockLabel='Term';
        if(level==='DIPLOMA')options=[['Y1T1','Year 1 Term 1'],['Y1T2','Year 1 Term 2'],['Y1T3','Year 1 Term 3'],['Y2T1','Year 2 Term 1'],['Y2T2','Year 2 Term 2'],['Y2T3','Year 2 Term 3']];
        else if(level==='CERTIFICATE')options=[['Y1T1','Year 1 Term 1'],['Y1T2','Year 1 Term 2'],['Y1T3','Year 1 Term 3']];
        else options=[['Introductory','Introductory Term'],['Term1','Term 1'],['Term2','Term 2'],['Term3','Term 3'],['Term4','Term 4'],['Term5','Term 5'],['Term6','Term 6'],['Final','Final Term']];
    } else options=[['Introductory','Introductory Block'],['Block 1','Block 1'],['Block 2','Block 2'],['Block 3','Block 3'],['Block 4','Block 4'],['Block 5','Block 5'],['Block 6','Block 6'],['Final','Final Block']];
    DOM.classSelector.innerHTML=`<p style="color:#6b7280;font-size:12px;margin:0 0 8px;grid-column:1/-1;"><i class="fas fa-info-circle"></i> Select ${blockLabel}s:</p><div style="display:flex;flex-wrap:wrap;gap:8px;grid-column:1/-1;">${options.map(o=>`<label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;"><input type="checkbox" class="exam-class-checkbox" value="${o[0]}"><span>${o[1]}</span></label>`).join('')}</div><div style="display:flex;gap:6px;grid-column:1/-1;margin-top:4px;"><input type="text" id="customBlocksInput" placeholder="Custom ${blockLabel}s (comma)" style="flex:1;padding:6px 12px;border-radius:6px;border:1px solid #ddd;font-size:12px;"><button onclick="addCustomBlocks()" style="padding:6px 14px;background:#7c3aed;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:12px;">Add</button></div>`;
}


function addCustomBlocks(){
    const input=document.getElementById('customBlocksInput'); if(!input?.value.trim())return;
    const blocks=input.value.split(',').map(b=>b.trim()).filter(Boolean), container=DOM.classSelector, div=container?.querySelector('div:first-child')||container;
    if(!div)return;
    blocks.forEach(block=>{const label=document.createElement('label');label.style.cssText='display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;';label.innerHTML=`<input type="checkbox" class="exam-class-checkbox" value="${escapeHtml(block)}"><span>${escapeHtml(block)}</span>`;div.appendChild(label);}); input.value='';
}
function getSelectedClasses(){const selected=[];document.querySelectorAll('.exam-class-checkbox:checked').forEach(cb=>selected.push(cb.value));return selected;}

async function handleAddExam(e){
    e.preventDefault(); const btn=e.submitter; if(!btn)return; const original=btn.textContent; btn.disabled=true; btn.innerHTML='<span class="spinner"></span> Creating...';
    const fields={
        title:document.getElementById('exam_title')?.value.trim(),type:document.getElementById('exam_type')?.value,status:document.getElementById('exam_status')?.value||'published',
        basis:document.getElementById('exam_basis')?.value||'ordinary',date:document.getElementById('exam_date')?.value,startTime:document.getElementById('exam_start_time')?.value||'09:00',
        duration:parseInt(document.getElementById('exam_duration_minutes')?.value),deadline:document.getElementById('exam_deadline')?.value||null,program:document.getElementById('exam_program')?.value,
        block:document.getElementById('exam_block_term')?.value,intake:parseInt(document.getElementById('exam_intake')?.value),intakeMonth:document.getElementById('exam_intake_month')?.value||null,
        course:document.getElementById('exam_course_id')?.value||null,outOf:parseInt(document.getElementById('exam_out_of')?.value)||100,passMark:parseInt(document.getElementById('exam_pass_mark')?.value)||50,
        minFee:parseInt(document.getElementById('exam_min_fee')?.value)||0,link:document.getElementById('exam_link')?.value.trim()||null
    };
    fields.title=buildExamNameFromCourse()||fields.title;
    if(!fields.title||!fields.course||!fields.program||!fields.date||!fields.intake||!fields.block||!fields.type||isNaN(fields.duration)){showFeedback('Please select the correct Course/Unit and fill all required fields.','error');btn.disabled=false;btn.innerHTML=original;return;}
    const classes=getSelectedClasses(), user=await getCurrentUser(), notifyStudents=document.getElementById('exam_notify_students')?.checked||false, notifyTarget=document.getElementById('exam_notify_target')?.value||'all';
    let recipients=[];
    if(notifyStudents){
        if(notifyTarget==='specific'){
            recipients=[...selectedStudentsForNotification];
        } else if(notifyTarget==='program'){
            recipients=[...allStudentsForProgram];
        } else {
            // Both "all" and "block" are scoped to the selected Program + Block.
            recipients=[...allStudentsForBlock];
        }
        console.log(`📧 Recipients: ${recipients.length} students (target: ${notifyTarget}, program: ${fields.program}, block: ${fields.block})`);
    }
    try{
        const supabase=window.sb||window.supabase;if(!supabase)throw new Error('Supabase client not available');
        const examData={
            title:fields.title,exam_name:fields.title,exam_type:fields.type,status:fields.status.toLowerCase(),exam_basis:fields.basis,exam_date:fields.date,exam_start_time:fields.startTime,
            duration_minutes:fields.duration,marks_entry_deadline:fields.deadline,target_program:fields.program,program_type:fields.program,block:fields.block,block_term:fields.block,
            intake_year:fields.intake,intake_month:fields.intakeMonth,course_id:fields.course,marks_out_of:fields.outOf,total_marks:fields.outOf,MARKS:String(fields.outOf),
            pass_mark:fields.passMark,min_fee_balance:fields.minFee,online_link:fields.link,exam_link:fields.link,assigned_classes:classes,
            created_by:user?.user_id||user?.id||null,created_at:new Date().toISOString(),updated_at:new Date().toISOString()
        };
        const {data,error}=await supabase.from('exams').insert(examData).select('id');if(error)throw error;examData.id=data?.[0]?.id;
        let emailResult={sent:0,total:0,failed:0};if(notifyStudents&&recipients.length>0)emailResult=await sendExamNotificationEmail(examData,recipients);
        let feedbackMsg=`✅ "${fields.title}" created successfully!`;
        if(notifyStudents){
        if(recipients.length>0){
            feedbackMsg+=` 📧 ${emailResult.sent}/${emailResult.attempted || recipients.length} emails sent.`;
            if(emailResult.failed>0){
                feedbackMsg+=` ⚠️ ${emailResult.failed} failed.`;
                if(emailResult.errors?.length) feedbackMsg+=` First error: ${emailResult.errors[0]}`;
            }
        }else feedbackMsg+=' ⚠️ No students found to notify.';
    }
        showFeedback(feedbackMsg,'success');if(e.target)e.target.reset();selectedStudentsForNotification=[];updateSelectedStudentsDisplay();const nc=document.getElementById('exam_notify_students');if(nc)nc.checked=true;ExamCache.clear();loadExams(true);
    }catch(error){showFeedback(`Failed: ${error.message}`,'error');}finally{btn.disabled=false;btn.innerHTML=original;}
}

async function openEditExamModal(id){
    try{
        const supabase=window.sb||window.supabase;if(!supabase)throw new Error('Supabase client not available');
        const {data:exam,error}=await supabase.from('exams').select('*').eq('id',id).single();if(error)throw error;
        const modal=document.getElementById('examEditModal');if(!modal){showFeedback('Edit modal not found','error');return;}
        const setVal=(elId,val)=>{const el=document.getElementById(elId);if(el)el.value=val||''};
        setVal('edit_exam_id',exam.id);setVal('edit_exam_title',exam.title||exam.exam_name||'');setVal('edit_exam_type',exam.exam_type||'CAT');setVal('edit_exam_status',exam.status||'Upcoming');
        setVal('edit_exam_basis',exam.exam_basis||'ordinary');if(exam.exam_date){const d=new Date(exam.exam_date);if(!isNaN(d.getTime()))setVal('edit_exam_date',d.toISOString().split('T')[0]);}
        if(exam.exam_start_time?.includes(':'))setVal('edit_exam_start_time',exam.exam_start_time.substring(0,5));setVal('edit_exam_duration',exam.duration_minutes||60);setVal('edit_exam_deadline',exam.marks_entry_deadline||'');
        setVal('edit_exam_program',exam.target_program||exam.program_type||'');setVal('edit_exam_block',exam.block||exam.block_term||'');setVal('edit_exam_intake',exam.intake_year||'');setVal('edit_exam_intake_month',exam.intake_month||'');
        setVal('edit_exam_out_of',exam.marks_out_of||exam.total_marks||100);setVal('edit_exam_pass_mark',exam.pass_mark||50);setVal('edit_exam_min_fee',exam.min_fee_balance||0);setVal('edit_exam_link',exam.online_link||exam.exam_link||'');setVal('edit_exam_course',exam.course_id||'');
        if(typeof initEditCourseDropdown==='function')await initEditCourseDropdown(exam.target_program||'',exam.course_id);
        const editTitle=document.getElementById('edit_exam_title');if(editTitle)editTitle.readOnly=true;
        if(typeof renderAssignedClasses==='function')renderAssignedClasses(exam.id,exam.assigned_classes||[]);modal.style.display='flex';
    }catch(error){showFeedback('❌ Failed to load exam: '+error.message,'error');}
}

async function saveEditedExam(event){
    if(event){event.preventDefault();event.stopPropagation();}
    const id=document.getElementById('edit_exam_id')?.value;if(!id){showFeedback('❌ Exam ID not found','error');return;}
    const outOf=parseInt(document.getElementById('edit_exam_out_of')?.value)||100;
    const data={
        title:document.getElementById('edit_exam_title')?.value?.trim()||'',exam_name:document.getElementById('edit_exam_title')?.value?.trim()||'',exam_type:document.getElementById('edit_exam_type')?.value||'CAT',
        status:document.getElementById('edit_exam_status')?.value||'Upcoming',exam_basis:document.getElementById('edit_exam_basis')?.value||'ordinary',exam_date:document.getElementById('edit_exam_date')?.value||null,
        exam_start_time:document.getElementById('edit_exam_start_time')?.value||null,duration_minutes:parseInt(document.getElementById('edit_exam_duration')?.value)||60,marks_entry_deadline:document.getElementById('edit_exam_deadline')?.value||null,
        target_program:document.getElementById('edit_exam_program')?.value||'',program_type:document.getElementById('edit_exam_program')?.value||'',block:document.getElementById('edit_exam_block')?.value||'',block_term:document.getElementById('edit_exam_block')?.value||'',
        intake_year:parseInt(document.getElementById('edit_exam_intake')?.value)||null,intake_month:document.getElementById('edit_exam_intake_month')?.value||null,course_id:document.getElementById('edit_exam_course')?.value||null,
        marks_out_of:outOf,total_marks:outOf,MARKS:String(outOf),pass_mark:parseInt(document.getElementById('edit_exam_pass_mark')?.value)||50,min_fee_balance:parseInt(document.getElementById('edit_exam_min_fee')?.value)||0,
        online_link:document.getElementById('edit_exam_link')?.value?.trim()||null,exam_link:document.getElementById('edit_exam_link')?.value?.trim()||null,updated_at:new Date().toISOString()
    };
    Object.keys(data).forEach(k=>{if(data[k]===undefined||data[k]===null||data[k]==='')delete data[k]});
    const saveBtn=document.querySelector('#editExamForm button[type="submit"]')||document.querySelector('#examEditModal .btn-primary');
    const original=saveBtn?.textContent||'Save Changes';if(saveBtn){saveBtn.disabled=true;saveBtn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Saving...';}
    try{const supabase=window.sb||window.supabase;if(!supabase)throw new Error('Supabase client not available');const {error}=await supabase.from('exams').update(data).eq('id',id);if(error)throw error;showFeedback('✅ Exam updated successfully!','success');ExamCache.clear();await loadExams(true);closeEditModal();}
    catch(error){showFeedback('❌ Failed to save: '+error.message,'error');if(saveBtn){saveBtn.disabled=false;saveBtn.innerHTML=original;}}
}

function renderAssignedClasses(examId,classes){
    const container=document.getElementById('edit_exam_classes_container');if(!container)return;
    container.innerHTML=`<label style="font-weight:600;font-size:11px;text-transform:uppercase;color:#475569;display:block;margin-bottom:4px;">Assigned Blocks</label><div style="display:flex;flex-wrap:wrap;gap:6px;padding:8px;background:#f8fafc;border-radius:8px;min-height:32px;border:1px solid #e2e8f0;">${classes?.length?classes.map(c=>`<span style="background:#7c3aed;color:#fff;padding:2px 12px;border-radius:16px;font-size:11px;display:inline-flex;align-items:center;gap:4px;">${escapeHtml(c)}<span onclick="removeClass('${examId}','${escapeHtml(c)}')" style="cursor:pointer;color:#fca5a5;font-weight:700;">&times;</span></span>`).join(''):'<span style="color:#94a3b8;font-size:12px;">No blocks assigned</span>'}</div><div style="display:flex;gap:6px;margin-top:6px;"><input type="text" id="edit_exam_add_class" placeholder="Add block" style="flex:1;padding:6px 10px;border-radius:6px;border:1px solid #e2e8f0;font-size:12px;"><button onclick="addClass('${examId}')" style="padding:6px 14px;background:#7c3aed;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:12px;"><i class="fas fa-plus"></i></button></div>`;
}
async function addClass(examId){
    const input=document.getElementById('edit_exam_add_class');if(!input?.value.trim())return;const className=input.value.trim();
    try{const supabase=window.sb||window.supabase;const {data:exam}=await supabase.from('exams').select('assigned_classes').eq('id',examId).single();const current=exam?.assigned_classes||[];if(current.includes(className)){showFeedback('Already assigned','warning');return;}current.push(className);const {error}=await supabase.from('exams').update({assigned_classes:current}).eq('id',examId);if(error)throw error;showFeedback(`✅ Added "${className}"`,'success');input.value='';renderAssignedClasses(examId,current);}catch(e){showFeedback(`Error: ${e.message}`,'error');}
}
async function removeClass(examId,className){
    if(!confirm(`Remove "${className}"?`))return;try{const supabase=window.sb||window.supabase;const {data:exam}=await supabase.from('exams').select('assigned_classes').eq('id',examId).single();const current=(exam?.assigned_classes||[]).filter(c=>c!==className);const {error}=await supabase.from('exams').update({assigned_classes:current}).eq('id',examId);if(error)throw error;showFeedback(`✅ Removed "${className}"`,'success');renderAssignedClasses(examId,current);}catch(e){showFeedback(`Error: ${e.message}`,'error');}
}
async function deleteExam(id,name){
    if(!confirm(`Delete "${name}"?`))return;try{const supabase=window.sb||window.supabase;const {error}=await supabase.from('exams').delete().eq('id',id);if(error)throw error;ExamCache.clear();showFeedback(`✅ "${name}" deleted`,'success');loadExams(true);}catch(e){showFeedback(`Delete failed: ${e.message}`,'error');}
}
async function closeExam(id){
    if(!confirm('Close this exam?'))return;try{const supabase=window.sb||window.supabase;const {error}=await supabase.from('exams').update({status:'Completed',updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;ExamCache.clear();showFeedback('✅ Exam closed','success');loadExams(true);}catch(e){showFeedback(`Failed: ${e.message}`,'error');}
}
function closeEditModal(){const modal=document.getElementById('examEditModal');if(modal){modal.style.display='none';const form=document.getElementById('editExamForm');if(form)form.reset();}}

const filterExamsTable=debounce(function(){
    const search=document.getElementById('exam-search')?.value?.toLowerCase()||'',program=document.getElementById('exam_filter_program')?.value||'',status=document.getElementById('exam_filter_status')?.value||'',month=document.getElementById('exam_filter_intake_month')?.value||'';
    document.querySelectorAll('#exams-table-body tr').forEach(row=>{if(row.querySelector('td[colspan]'))return;const cells=row.querySelectorAll('td');if(cells.length<12)return;const title=cells[3]?.textContent?.toLowerCase()||'',prog=cells[1]?.textContent||'',stat=cells[10]?.textContent||'',intake=cells[8]?.textContent||'';let show=true;if(search&&!title.includes(search))show=false;if(program&&!prog.includes(program))show=false;if(status&&!stat.toLowerCase().includes(status.toLowerCase()))show=false;if(month&&!intake.includes(month))show=false;row.style.display=show?'':'none';});
},300);

function exportExamsToCSV(){
    const rows=document.querySelectorAll('#exams-table-body tr'),visible=Array.from(rows).filter(r=>r.style.display!=='none'&&!r.querySelector('td[colspan]'));if(!visible.length){showFeedback('No exams to export','warning');return;}
    let csv='Type,Program,Course,Title,Out Of,Pass Mark,Date,Duration,Intake,Block,Status\n';visible.forEach(row=>{const cols=row.querySelectorAll('td');if(cols.length>=11){const data=[];for(let i=0;i<11;i++)data.push(`"${String(cols[i]?.textContent||'').replace(/"/g,'""').trim()}"`);csv+=data.join(',')+'\n';}});
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`exams_${new Date().toISOString().split('T')[0]}.csv`;a.click();URL.revokeObjectURL(url);showFeedback('✅ Exported!','success');
}

function showExamTab(tab){
    document.querySelectorAll('.exam-tab-content').forEach(el=>el.style.display='none');document.querySelectorAll('.exam-tab-btn').forEach(btn=>{btn.className='exam-tab-btn';btn.style.background='transparent';btn.style.color='#334155';btn.style.boxShadow='none';});
    if(tab==='list'){document.getElementById('examListTab').style.display='block';const btn=document.getElementById('examListTabBtn');if(btn){btn.className='exam-tab-btn active';btn.style.background='linear-gradient(135deg,#7c3aed,#6d28d9)';btn.style.color='white';btn.style.boxShadow='0 4px 16px rgba(124,58,237,0.3)';}loadExams();}
    else if(tab==='create'){document.getElementById('examCreateTab').style.display='block';const btn=document.getElementById('examCreateTabBtn');if(btn){btn.className='exam-tab-btn active';btn.style.background='linear-gradient(135deg,#7c3aed,#6d28d9)';btn.style.color='white';btn.style.boxShadow='0 4px 16px rgba(124,58,237,0.3)';}loadAvailableClassesForExam();const program=document.getElementById('exam_program')?.value||'';if(typeof initCreateCourseDropdown==='function')initCreateCourseDropdown(program);setTimeout(loadStudentsForNotification,800);}
}

async function getCurrentUser(){
    try{
        if(window.currentUserProfile?.user_id)return window.currentUserProfile;const stored=sessionStorage.getItem('currentUserProfile');if(stored){const user=JSON.parse(stored);if(user?.user_id)return user;}
        const supabase=window.sb||window.supabase;if(!supabase)return null;const {data:{user}}=await supabase.auth.getUser();if(user){const {data:profile}=await supabase.from('consolidated_user_profiles_table').select('*').eq('user_id',user.id).single();if(profile){window.currentUserProfile=profile;sessionStorage.setItem('currentUserProfile',JSON.stringify(profile));return profile;}}return null;
    }catch(e){return null;}
}

let createCoursesData=[],editCoursesData=[];
async function initCreateCourseDropdown(program=''){
    const input=document.getElementById('createCourseSearchInput'),list=document.getElementById('createCourseDropdownList');if(!input||!list)return;await loadCoursesForCreateDropdown(program);
    if(!input.dataset.bound){input.dataset.bound='1';input.addEventListener('input',()=>filterCreateCourseDropdown(input.value.toLowerCase().trim()));input.addEventListener('focus',()=>{list.classList.add('show');filterCreateCourseDropdown(input.value.toLowerCase().trim())});input.addEventListener('blur',()=>setTimeout(()=>list.classList.remove('show'),200));input.addEventListener('keydown',e=>{if(e.key==='Enter'){const first=list.querySelector('.dropdown-item');if(first)first.click();e.preventDefault();}if(e.key==='Escape')list.classList.remove('show');});}
    filterCreateCourseDropdown('');
    const typeInput=document.getElementById('exam_type');
    if(typeInput&&!typeInput.dataset.examNameBound){typeInput.dataset.examNameBound='1';typeInput.addEventListener('change',buildExamNameFromCourse);}
    buildExamNameFromCourse();
}
async function loadCoursesForCreateDropdown(program=''){
    try{const supabase=window.sb||window.supabase;if(!supabase){createCoursesData=[];return;}let query=supabase.from('courses').select('id, course_name, unit_code, code, name, target_program');if(program)query=query.eq('target_program',program);const {data,error}=await query.order('course_name',{ascending:true});if(error)throw error;createCoursesData=data||[];filterCreateCourseDropdown('');}catch(error){createCoursesData=[];}
}
function filterCreateCourseDropdown(searchTerm=''){
    const list=document.getElementById('createCourseDropdownList');if(!list)return;let filtered=createCoursesData;if(searchTerm)filtered=createCoursesData.filter(c=>(c.course_name||c.name||'').toLowerCase().includes(searchTerm)||(c.unit_code||c.code||'').toLowerCase().includes(searchTerm));
    if(!filtered.length){list.innerHTML='<div class="no-results"><i class="fas fa-search"></i> No courses found</div>';list.classList.add('show');return;}
    let html='';filtered.slice(0,50).forEach(course=>{const displayName=course.course_name||course.name||'Untitled',unitCode=course.unit_code||course.code||'',programTag=course.target_program?`[${course.target_program}]`:'';html+=`<div class="dropdown-item" onclick="selectCreateCourse('${course.id}','${escapeHtml(displayName).replace(/'/g,"\\'")}','${escapeHtml(unitCode).replace(/'/g,"\\'")}','${escapeHtml(programTag).replace(/'/g,"\\'")}')"><span>${escapeHtml(displayName)}</span><span style="display:flex;gap:6px;align-items:center;">${unitCode?`<span class="course-code">${escapeHtml(unitCode)}</span>`:''}${programTag?`<span class="program-tag">${escapeHtml(programTag)}</span>`:''}</span></div>`;});
    if(filtered.length>50)html+=`<div class="no-results" style="font-size:12px;">And ${filtered.length-50} more</div>`;list.innerHTML=html;list.classList.add('show');
}
function buildExamNameFromCourse(){
    const titleInput=document.getElementById('exam_title');
    const courseInput=document.getElementById('createCourseSearchInput');
    const typeInput=document.getElementById('exam_type');
    if(!titleInput)return '';
    const courseText=(courseInput?.value||'').trim();
    const examType=(typeInput?.value||'').trim();
    const cleanCourse=courseText.replace(/\s+\([^)]*\)\s*$/,'').trim();
    const generated=cleanCourse?(examType?`${cleanCourse} — ${examType}`:cleanCourse):'';
    titleInput.value=generated;
    titleInput.readOnly=true;
    titleInput.setAttribute('aria-readonly','true');
    titleInput.title='Automatically generated from the selected Course/Unit and Exam Type';
    return generated;
}

function selectCreateCourse(courseId,courseName,courseCode,programTag){
    const input=document.getElementById('createCourseSearchInput'),hidden=document.getElementById('exam_course_id'),list=document.getElementById('createCourseDropdownList'),display=document.getElementById('createSelectedCourseDisplay'),nameDisplay=document.getElementById('createSelectedCourseName');
    if(input)input.value=courseName+(courseCode?` (${courseCode})`:''),hidden&&(hidden.value=courseId),list&&list.classList.remove('show');if(display&&nameDisplay){display.style.display='inline';nameDisplay.textContent=courseName+(courseCode?` (${courseCode})`:'');}
    buildExamNameFromCourse();
}
function updateCreateCourseDropdown(){const program=document.getElementById('exam_program')?.value||'';loadCoursesForCreateDropdown(program);filterCreateCourseDropdown('');const input=document.getElementById('createCourseSearchInput'),hidden=document.getElementById('exam_course_id'),display=document.getElementById('createSelectedCourseDisplay');if(input)input.value='';if(hidden)hidden.value='';if(display)display.style.display='none';const title=document.getElementById('exam_title');if(title){title.value='';title.readOnly=true;} }
async function initEditCourseDropdown(program='',selectedId=''){
    const input=document.getElementById('editCourseSearchInput'),list=document.getElementById('editCourseDropdownList');if(!input||!list)return;await loadCoursesForEditDropdown(program);
    if(!input.dataset.bound){input.dataset.bound='1';input.addEventListener('input',()=>filterEditCourseDropdown(input.value.toLowerCase().trim()));input.addEventListener('focus',()=>{list.classList.add('show');filterEditCourseDropdown(input.value.toLowerCase().trim())});input.addEventListener('blur',()=>setTimeout(()=>list.classList.remove('show'),200));input.addEventListener('keydown',e=>{if(e.key==='Enter'){const first=list.querySelector('.dropdown-item');if(first)first.click();e.preventDefault();}if(e.key==='Escape')list.classList.remove('show');});}
    if(selectedId)setEditCourseValue(selectedId);filterEditCourseDropdown('');
}
async function loadCoursesForEditDropdown(program=''){
    try{const supabase=window.sb||window.supabase;if(!supabase){editCoursesData=[];return;}let query=supabase.from('courses').select('id, course_name, unit_code, code, name, target_program');if(program)query=query.eq('target_program',program);const {data,error}=await query.order('course_name',{ascending:true});if(error)throw error;editCoursesData=data||[];filterEditCourseDropdown('');}catch(error){editCoursesData=[];}
}
function filterEditCourseDropdown(searchTerm=''){
    const list=document.getElementById('editCourseDropdownList');if(!list)return;let filtered=editCoursesData;if(searchTerm)filtered=editCoursesData.filter(c=>(c.course_name||c.name||'').toLowerCase().includes(searchTerm)||(c.unit_code||c.code||'').toLowerCase().includes(searchTerm));
    if(!filtered.length){list.innerHTML='<div class="no-results"><i class="fas fa-search"></i> No courses found</div>';list.classList.add('show');return;}
    let html='';filtered.slice(0,50).forEach(course=>{const displayName=course.course_name||course.name||'Untitled',unitCode=course.unit_code||course.code||'',programTag=course.target_program?`[${course.target_program}]`:'';html+=`<div class="dropdown-item" onclick="selectEditCourse('${course.id}','${escapeHtml(displayName).replace(/'/g,"\\'")}','${escapeHtml(unitCode).replace(/'/g,"\\'")}','${escapeHtml(programTag).replace(/'/g,"\\'")}')"><span>${escapeHtml(displayName)}</span><span style="display:flex;gap:6px;align-items:center;">${unitCode?`<span class="course-code">${escapeHtml(unitCode)}</span>`:''}${programTag?`<span class="program-tag">${escapeHtml(programTag)}</span>`:''}</span></div>`;});
    if(filtered.length>50)html+=`<div class="no-results" style="font-size:12px;">And ${filtered.length-50} more</div>`;list.innerHTML=html;list.classList.add('show');
}
function selectEditCourse(courseId,courseName,courseCode,programTag){
    const input=document.getElementById('editCourseSearchInput'),hidden=document.getElementById('edit_exam_course'),list=document.getElementById('editCourseDropdownList'),display=document.getElementById('editSelectedCourseDisplay'),nameDisplay=document.getElementById('editSelectedCourseName');
    if(input)input.value=courseName+(courseCode?` (${courseCode})`:''),hidden&&(hidden.value=courseId),list&&list.classList.remove('show');if(display&&nameDisplay){display.style.display='inline';nameDisplay.textContent=courseName+(courseCode?` (${courseCode})`:'');}
}
function setEditCourseValue(courseId){
    if(!courseId)return;const course=editCoursesData.find(c=>c.id===courseId);if(!course)return;const input=document.getElementById('editCourseSearchInput'),hidden=document.getElementById('edit_exam_course'),display=document.getElementById('editSelectedCourseDisplay'),nameDisplay=document.getElementById('editSelectedCourseName');if(hidden)hidden.value=courseId;const displayName=course.course_name||course.name||'Untitled',unitCode=course.unit_code||course.code||'';if(input)input.value=displayName+(unitCode?` (${unitCode})`:''),display&&nameDisplay&&(display.style.display='inline',nameDisplay.textContent=displayName+(unitCode?` (${unitCode})`:''));}

async function openGradeModal(examId,examName=''){
    try{
        const supabase=window.sb||window.supabase;if(!supabase){showFeedback('❌ Supabase client not available','error');return;}const currentUser=await getCurrentUser();if(!currentUser?.user_id){showFeedback('❌ You must be logged in to grade exams.','error');return;}
        const {data:exam,error:examError}=await supabase.from('exams').select('*').eq('id',examId).single();if(examError||!exam){showFeedback('❌ Error loading exam details.','error');return;}
        const programField=exam.target_program||exam.program_type,blockField=exam.block||exam.block_term;let query=supabase.from('consolidated_user_profiles_table').select('user_id, full_name, email, program, intake_year, block').eq('role','student').eq('status','approved');if(programField)query=query.eq('program',programField);if(exam.intake_year)query=query.eq('intake_year',String(exam.intake_year));if(blockField)query=query.eq('block',blockField);
        const {data:students,error:studentError}=await query.limit(200);if(studentError||!students?.length){showFeedback('⚠️ No students found for this exam criteria.','warning');return;}
        const {data:existingGrades}=await supabase.from('exam_grades').select('*').eq('exam_id',examId);showGradeModal(buildGradeModalHTML(exam,students,existingGrades||[],currentUser,exam.exam_type||'EXAM'));showFeedback(`✅ Grading modal loaded for ${students.length} students`,'success');
    }catch(error){showFeedback('❌ Failed to load grading: '+error.message,'error');}
}
function buildGradeModalHTML(exam,students,existingGrades,currentUser,examType){
    const examTypeLabel=getExamTypeLabel(examType),marksOutOf=exam.marks_out_of||exam.total_marks||100,passMark=exam.pass_mark||50,examTitle=exam.title||exam.exam_name||'Assessment';let tableHeaders='',tableRows='';
    if(examType==='CAT_1'||examType==='CAT_2'){
        const field=examType==='CAT_1'?'cat_1_score':'cat_2_score',label=examType==='CAT_1'?'CAT 1':'CAT 2';
        tableHeaders=`<th>Student</th><th>Email</th><th>${label} (max 30)</th><th>Status</th>`;
        tableRows=students.map(s=>{const grade=existingGrades.find(g=>g.student_id===s.user_id)||{};return `<tr data-name="${escapeHtml((s.full_name||'').toLowerCase())}" data-email="${escapeHtml((s.email||'').toLowerCase())}" data-id="${s.user_id}"><td><strong>${escapeHtml(s.full_name)}</strong></td><td>${escapeHtml(s.email||'')}</td><td><input type="number" min="0" max="30" step="0.5" id="${examType==='CAT_1'?'cat1':'cat2'}-${s.user_id}" value="${grade[field]??''}" class="grade-input"></td><td><select id="status-${s.user_id}" class="status-select"><option value="Scheduled">⏳ Scheduled</option><option value="InProgress">🔄 In Progress</option><option value="Final">✅ Final</option></select></td></tr>`}).join('');
    }else{
        tableHeaders=`<th>Student</th><th>Email</th><th>CAT 1 (max 30)</th><th>CAT 2 (max 30)</th><th>Final (max ${marksOutOf})</th><th>Total</th><th>Status</th>`;
        tableRows=students.map(s=>{const grade=existingGrades.find(g=>g.student_id===s.user_id)||{};return `<tr data-name="${escapeHtml((s.full_name||'').toLowerCase())}" data-email="${escapeHtml((s.email||'').toLowerCase())}" data-id="${s.user_id}"><td><strong>${escapeHtml(s.full_name)}</strong></td><td>${escapeHtml(s.email||'')}</td><td><input type="number" min="0" max="30" step="0.5" id="cat1-${s.user_id}" value="${grade.cat_1_score??''}" class="grade-input" oninput="updateGradeTotal('${s.user_id}')"></td><td><input type="number" min="0" max="30" step="0.5" id="cat2-${s.user_id}" value="${grade.cat_2_score??''}" class="grade-input" oninput="updateGradeTotal('${s.user_id}')"></td><td><input type="number" min="0" max="${marksOutOf}" step="0.5" id="final-${s.user_id}" value="${grade.exam_score??''}" class="grade-input" oninput="updateGradeTotal('${s.user_id}')"></td><td><input type="number" min="0" max="100" step="0.1" id="total-${s.user_id}" value="" readonly class="total-input"></td><td><select id="status-${s.user_id}" class="status-select"><option value="Scheduled">⏳ Scheduled</option><option value="InProgress">🔄 In Progress</option><option value="Final">✅ Final</option></select></td></tr>`}).join('');
    }
    return `<div class="modal-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;"><div style="background:white;border-radius:16px;max-width:1000px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.3);"><div style="padding:16px 24px;border-bottom:2px solid #4C1D95;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;background:white;z-index:10;"><div><h3 style="margin:0;color:#4C1D95;"><i class="fas fa-check-double"></i> ${examTypeLabel}: ${escapeHtml(examTitle)}</h3><p style="margin:2px 0;font-size:12px;color:#94a3b8;">${escapeHtml(exam.program_type||exam.target_program||'N/A')} | Block: ${escapeHtml(exam.block||exam.block_term||'N/A')} | Pass: ${passMark}% | Students: ${students.length}</p></div><button onclick="closeGradeModal()" style="background:none;border:none;font-size:28px;cursor:pointer;color:#6b7280;">&times;</button></div><div style="padding:16px 24px;"><div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap;"><input type="text" id="gradeSearch" placeholder="🔍 Search by name or email..." style="flex:1;min-width:200px;padding:8px 14px;border-radius:8px;border:1px solid #e2e8f0;font-size:13px;" oninput="filterGradeStudents()"><span style="font-size:12px;color:#94a3b8;display:flex;align-items:center;"><i class="fas fa-users"></i> ${students.length} students</span></div><div style="overflow-x:auto;max-height:50vh;overflow-y:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;"><thead style="position:sticky;top:0;z-index:5;"><tr style="background:#f8fafc;border-bottom:2px solid #e5e7eb;">${tableHeaders}</tr></thead><tbody id="gradeTableBody">${tableRows}</tbody></table></div></div><div style="padding:16px 24px;border-top:1px solid #e5e7eb;display:flex;gap:12px;justify-content:flex-end;"><button onclick="saveGrades('${exam.id}')" style="background:#10b981;color:white;border:none;padding:10px 24px;border-radius:8px;cursor:pointer;font-weight:600;"><i class="fas fa-save"></i> Save Grades</button><button onclick="closeGradeModal()" style="background:#e5e7eb;color:#475569;border:none;padding:10px 24px;border-radius:8px;cursor:pointer;font-weight:600;">Cancel</button></div></div></div>`;
}
function showGradeModal(modalHtml){const existing=document.getElementById('gradeModal');if(existing)existing.remove();const modal=document.createElement('div');modal.id='gradeModal';modal.style.cssText='position:fixed;inset:0;z-index:10000;';modal.innerHTML=modalHtml;document.body.appendChild(modal);}
function closeGradeModal(){document.getElementById('gradeModal')?.remove();}
function filterGradeStudents(){const search=document.getElementById('gradeSearch')?.value?.toLowerCase()||'';document.querySelectorAll('#gradeTableBody tr').forEach(row=>{const name=row.getAttribute('data-name')||'',email=row.getAttribute('data-email')||'';row.style.display=name.includes(search)||email.includes(search)?'':'none';});}
function updateGradeTotal(studentId){const cat1=parseFloat(document.getElementById(`cat1-${studentId}`)?.value)||0,cat2=parseFloat(document.getElementById(`cat2-${studentId}`)?.value)||0,finalExam=parseFloat(document.getElementById(`final-${studentId}`)?.value)||0,total=((cat1+cat2+finalExam)/160)*100,totalInput=document.getElementById(`total-${studentId}`);if(totalInput)totalInput.value=total.toFixed(2);}
async function saveGrades(examId){
    try{
        const supabase=window.sb||window.supabase;if(!supabase){showFeedback('❌ Supabase client not available','error');return;}const rows=document.querySelectorAll('#gradeTableBody tr'),currentUser=await getCurrentUser();if(!currentUser){showFeedback('❌ Please login first','error');return;}let saved=0;
        for(const row of rows){const studentId=row.getAttribute('data-id');if(!studentId)continue;const cat1=parseFloat(document.getElementById(`cat1-${studentId}`)?.value)||null,cat2=parseFloat(document.getElementById(`cat2-${studentId}`)?.value)||null,finalExam=parseFloat(document.getElementById(`final-${studentId}`)?.value)||null,status=document.getElementById(`status-${studentId}`)?.value||'Scheduled';if(!cat1&&!cat2&&!finalExam)continue;const gradeData={exam_id:parseInt(examId),student_id:studentId,cat_1_score:cat1,cat_2_score:cat2,exam_score:finalExam,result_status:status,graded_by:currentUser.user_id,updated_at:new Date().toISOString()};const {data:existing}=await supabase.from('exam_grades').select('id').eq('exam_id',parseInt(examId)).eq('student_id',studentId).maybeSingle();if(existing)await supabase.from('exam_grades').update(gradeData).eq('id',existing.id);else await supabase.from('exam_grades').insert({...gradeData,created_at:new Date().toISOString()});saved++;}
        showFeedback(`✅ ${saved} grades saved successfully!`,'success');setTimeout(closeGradeModal,1000);
    }catch(error){showFeedback('❌ Failed to save grades: '+error.message,'error');}
}
function getExamTypeLabel(examType){return {'CAT_1':'CAT 1 Assessment','CAT_2':'CAT 2 Assessment','CAT':'Continuous Assessment Test','EXAM':'Final Examination','ASSIGNMENT':'Assignment','END_TERM':'End of Term Exam','SUPPLEMENTARY':'Supplementary Exam'}[examType]||'Assessment';}

function initExams(){
    cacheDomElements();const dateInput=document.getElementById('exam_date');if(dateInput)dateInput.value=new Date().toISOString().split('T')[0];populateProgramDropdowns();loadExams();loadAvailableClassesForExam();
    const program=document.getElementById('exam_program')?.value||'';if(typeof initCreateCourseDropdown==='function')initCreateCourseDropdown(program);
    if(DOM.examSearch)DOM.examSearch.addEventListener('input',filterExamsTable);if(DOM.programFilter)DOM.programFilter.addEventListener('change',filterExamsTable);if(DOM.statusFilter)DOM.statusFilter.addEventListener('change',filterExamsTable);if(DOM.monthFilter)DOM.monthFilter.addEventListener('change',filterExamsTable);
    if(!window.__examDelegationBound){
        window.__examDelegationBound=true;
        document.addEventListener('change',function(e){
            if(!e.target)return;
            if(e.target.id==='exam_program'){console.log('🎯 Program changed via delegation:',e.target.value);updateBlockTermOptions('exam_program','exam_block_term');loadAvailableClassesForExam();selectedStudentsForNotification=[];updateSelectedStudentsDisplay();loadStudentsForNotification();if(typeof updateCreateCourseDropdown==='function')updateCreateCourseDropdown();}
            if(e.target.id==='exam_block_term'){console.log('🎯 Block changed via delegation:',e.target.value);selectedStudentsForNotification=[];updateSelectedStudentsDisplay();loadStudentsForNotification();}
        });
    }
    setTimeout(()=>{const ps=document.getElementById('exam_program');if(ps?.value){updateBlockTermOptions('exam_program','exam_block_term');loadAvailableClassesForExam();}loadStudentsForNotification();},500);
    console.log('🚀 Exams/CATS initialized (delegated events)');
}

window.filterExamsTable=filterExamsTable;window.buildExamNameFromCourse=buildExamNameFromCourse;window.updateCreateCourseDropdown=updateCreateCourseDropdown;window.initCreateCourseDropdown=initCreateCourseDropdown;window.loadCoursesForCreateDropdown=loadCoursesForCreateDropdown;window.filterCreateCourseDropdown=filterCreateCourseDropdown;window.selectCreateCourse=selectCreateCourse;window.initEditCourseDropdown=initEditCourseDropdown;window.selectEditCourse=selectEditCourse;window.setEditCourseValue=setEditCourseValue;
window.updateNotificationCount=updateNotificationCount;window.getNotificationRecipientsForCount=getNotificationRecipientsForCount;window.sendEmailWithBrevo=sendEmailWithBrevo;window.sendEmailWithEdgeFunctionFallback=sendEmailWithEdgeFunctionFallback;window.sendExamNotificationEmail=sendExamNotificationEmail;window.loadStudentsForNotification=loadStudentsForNotification;window.searchStudentsForNotification=searchStudentsForNotification;window.toggleStudentForNotification=toggleStudentForNotification;window.updateSelectedStudentsDisplay=updateSelectedStudentsDisplay;window.debounce=debounce;
window.loadExams=loadExams;window.showExamTab=showExamTab;window.deleteExam=deleteExam;window.closeExam=closeExam;window.openEditExamModal=openEditExamModal;window.saveEditedExam=saveEditedExam;window.exportExamsToCSV=exportExamsToCSV;window.handleAddExam=handleAddExam;window.addCustomBlocks=addCustomBlocks;window.addClass=addClass;window.removeClass=removeClass;window.closeEditModal=closeEditModal;window.getSelectedClasses=getSelectedClasses;window.loadAvailableClassesForExam=loadAvailableClassesForExam;window.populateProgramDropdowns=populateProgramDropdowns;window.escapeHtml=window.escapeHtml||escapeHtml;window.getCurrentUser=getCurrentUser;window.ExamCache=ExamCache;window.initExams=initExams;window.openGradeModal=openGradeModal;window.closeGradeModal=closeGradeModal;window.saveGrades=saveGrades;window.filterGradeStudents=filterGradeStudents;window.updateGradeTotal=updateGradeTotal;window.getExamTypeLabel=getExamTypeLabel;window.updateBlockTermOptions=updateBlockTermOptions;window.DOM=window.DOM||DOM;

console.log('✅ CATS/Exams loaded — delegated events, unified student source, no race conditions.');
