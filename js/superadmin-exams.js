/********************************** *********************
 * 13. EXAMS/CATS MANAGEMENT - COMPLETE
 * ✅ Course capture (course_name, course_code, course_id)
 * ✅ Students filtered by REGISTERED UNITS
 * ✅ Auto main exam detection (from exam_type)
 * ✅ Publish button gates student visibility
 * ✅ Main exams sync to student_marks on publish
 * ✅ Practice assessments (CAT/OSCE/etc) stay in exams table only
 *******************************************************/

// ============================================
// FEEDBACK / TOAST
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
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateY(10px)'; setTimeout(() => toast.remove(), 220); }, type === 'error' ? 5000 : 3500);
}
window.showFeedback = window.showFeedback || showFeedback;

// ============================================
// 🎯 MAIN EXAM DETECTION (AUTO)
// ============================================
function isMainExamType(examType) {
    if (!examType) return false;
    const type = String(examType).toUpperCase().trim();
    return ['EXAM', 'END_TERM', 'FINAL', 'SUPPLEMENTARY', 'MAIN_EXAM'].includes(type);
}
window.isMainExamType = isMainExamType;

// ============================================
// BLOCK / TERM DROPDOWN
// ============================================
function updateBlockTermOptions(programSelectId, blockTermSelectId) {
    const programSelect = document.getElementById(programSelectId);
    const blockTermSelect = document.getElementById(blockTermSelectId);

    if (!programSelect || !blockTermSelect) {
        console.warn(`updateBlockTermOptions: Missing elements`);
        return;
    }

    const programCode = programSelect.value;
    const currentValue = blockTermSelect.value;

    const getType = typeof window.getProgramType === 'function' ? window.getProgramType : (code => code === 'KRCHN' ? 'KRCHN' : 'TVET');
    const tvetCheck = typeof window.isTVETProgram === 'function' ? window.isTVETProgram : (code => ['DPOTT','DCH','DHRIT','DSL','DSW','DCJS','DHSS','DICT','DME','CPOTT','CCH','CHRIT','CPC','CSL','CSW','CCJS','CAG','CHSS','CICT','ACH','AAG','ASW','CCA','PTE'].includes(String(code || '').toUpperCase()));
    const getLevel = typeof window.getProgramLevel === 'function' ? window.getProgramLevel : (code => String(code || '').toUpperCase().startsWith('D') ? 'DIPLOMA' : 'CERTIFICATE');

    blockTermSelect.innerHTML = '<option value="">-- Select Block/Term --</option>';
    if (!programCode) return;

    const programType = getType(programCode);
    let options = [];

    if (programType === 'KRCHN' || programCode === 'KRCHN') {
        options = [
            {value:'Introductory',text:'🌟 Introductory Block'},{value:'Block 1',text:'📘 Block 1'},{value:'Block 2',text:'📗 Block 2'},{value:'Block 3',text:'📒 Block 3'},{value:'Block 4',text:'📙 Block 4'},{value:'Block 5',text:'📕 Block 5'},{value:'Block 6',text:'📚 Block 6'},{value:'Final',text:'🏆 Final Block'}
        ];
    } else if (programType === 'TVET' || tvetCheck(programCode)) {
        const level = getLevel(programCode);
        if (level === 'DIPLOMA') {
            options = [{value:'Y1T1',text:'📘 Year 1 Term 1'},{value:'Y1T2',text:'📗 Year 1 Term 2'},{value:'Y1T3',text:'📒 Year 1 Term 3'},{value:'Y2T1',text:'📙 Year 2 Term 1'},{value:'Y2T2',text:'📕 Year 2 Term 2'},{value:'Y2T3',text:'📚 Year 2 Term 3'}];
        } else if (level === 'CERTIFICATE') {
            options = [{value:'Y1T1',text:'📘 Year 1 Term 1'},{value:'Y1T2',text:'📗 Year 1 Term 2'},{value:'Y1T3',text:'📒 Year 1 Term 3'}];
        } else {
            options = [{value:'Introductory',text:'🌟 Introductory Term'},{value:'Term1',text:'📘 Term 1'},{value:'Term2',text:'📗 Term 2'},{value:'Term3',text:'📒 Term 3'},{value:'Term4',text:'📙 Term 4'},{value:'Term5',text:'📕 Term 5'},{value:'Term6',text:'📚 Term 6'},{value:'Final',text:'🏆 Final Term'}];
        }
    } else {
        options = [{value:'Introductory',text:'🌟 Introductory'},{value:'Block 1',text:'📘 Block 1'},{value:'Block 2',text:'📗 Block 2'},{value:'Block 3',text:'📒 Block 3'},{value:'Block 4',text:'📙 Block 4'},{value:'Final',text:'🏆 Final'}];
    }

    options.push({value:'General',text:'📋 General'});
    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.text;
        blockTermSelect.appendChild(option);
    });

    if (currentValue && Array.from(blockTermSelect.options).some(o => o.value === currentValue)) {
        blockTermSelect.value = currentValue;
    }
}
window.updateBlockTermOptions = updateBlockTermOptions;

// ============================================
// PROGRAM HELPERS
// ============================================
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

function isTVETProgram(programCode) {
    if (!programCode) return false;
    const code = String(programCode).toUpperCase().trim();
    if (code === 'KRCHN') return false;
    const tvetCodes = ['DPOTT','DCH','DHRIT','DSL','DSW','DCJS','DHSS','DICT','DME','CPOTT','CCH','CHRIT','CPC','CSL','CSW','CCJS','CAG','CHSS','CICT','CCA','ACH','AAG','ASW','PTE','COMT','CCG'];
    return tvetCodes.includes(code);
}

function getProgramType(programCode) {
    if (!programCode) return 'KRCHN';
    const code = String(programCode).toUpperCase().trim();
    if (code === 'KRCHN') return 'KRCHN';
    return isTVETProgram(code) ? 'TVET' : 'KRCHN';
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

window.escapeHtml = window.escapeHtml || escapeHtml;
window.isTVETProgram = window.isTVETProgram || isTVETProgram;
window.getProgramType = window.getProgramType || getProgramType;
window.getProgramLevel = window.getProgramLevel || getProgramLevel;

// ============================================
// CONFIG / CACHE
// ============================================
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

const DOM = {
    examsTbody: null, studentExams: null, examSearch: null,
    programFilter: null, statusFilter: null, monthFilter: null,
    examForm: null, classSelector: null, courseSelect: null
};

function cacheDomElements() {
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

// ============================================
// EMAIL FUNCTIONS
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
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk',
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
    const examLink = examData.online_link || examData.exam_link || '#';
    const examTitle = examData.title || examData.exam_name || 'New Exam';
    const examTypeLabel = getExamTypeLabel(examData.exam_type || 'EXAM');
    const isMain = isMainExamType(examData.exam_type);
    
    const emailHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
        body{font-family:'Segoe UI',sans-serif;margin:0;padding:0;background:#f0f4f8;}
        .container{max-width:580px;margin:0 auto;padding:20px;}
        .card{background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.1);}
        .header{background:linear-gradient(135deg,#0A3D62,#1a5276);padding:30px 35px;text-align:center;color:#fff;}
        .header h1{margin:0;font-size:24px;}
        .body{padding:30px 35px;}
        .greeting{background:#e8f4f8;border-radius:12px;padding:16px;margin-bottom:20px;border-left:4px solid ${isMain?'#10b981':'#f59e0b'};}
        .details{background:#f8fafc;border-radius:12px;padding:16px;}
        .details table{width:100%;border-collapse:collapse;font-size:14px;}
        .details td{padding:8px 0;border-bottom:1px solid #e2e8f0;}
        .details .label{color:#64748B;font-weight:500;}
        .details .value{color:#0A3D62;font-weight:600;text-align:right;}
        .badge{display:inline-block;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:700;}
        .btn{display:inline-block;background:#0A3D62;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;}
        .footer{background:#F8FAFC;padding:20px;text-align:center;border-top:1px solid #E2E8F0;font-size:0.85rem;color:#64748B;}
    </style></head><body>
    <div class="container"><div class="card">
    <div class="header"><h1>📝 ${examTypeLabel} Posted!</h1><p>Nakuru College of Health Sciences and Management</p></div>
    <div class="body">
        <div class="greeting">
            <p>👋 <strong>Dear Student,</strong></p>
            <p style="margin:8px 0 0;color:#1e293b;">
                A new <span class="badge" style="background:${isMain?'#d1fae5':'#fef3c7'};color:${isMain?'#065f46':'#92400e'};">${isMain?'MAIN EXAM':'PRACTICE'}</span> has been posted.
            </p>
        </div>
        <div class="details"><table>
            <tr><td class="label">📝 Title</td><td class="value"><strong>${escapeHtml(examTitle)}</strong></td></tr>
            <tr><td class="label">📚 Unit</td><td class="value">${escapeHtml(examData.course_name || 'N/A')}</td></tr>
            <tr><td class="label">🎓 Program</td><td class="value">${escapeHtml(examData.target_program || 'N/A')}</td></tr>
            <tr><td class="label">📅 Date</td><td class="value">${examDate}</td></tr>
            <tr><td class="label">⏰ Time</td><td class="value">${examData.exam_start_time || 'TBD'}</td></tr>
            <tr><td class="label">⏱️ Duration</td><td class="value">${examData.duration_minutes || 'N/A'} min</td></tr>
            <tr><td class="label">📊 Marks</td><td class="value">${examData.marks_out_of || 100}</td></tr>
            <tr><td class="label">✅ Pass Mark</td><td class="value">${examData.pass_mark || 50}%</td></tr>
        </table></div>
        ${examLink !== '#' ? `<div style="text-align:center;margin:20px 0;"><a href="${escapeHtml(examLink)}" class="btn">🚪 Take Exam</a></div>` : ''}
    </div>
    <div class="footer"><p>📞 +254 790 969 743 | 📧 admin@nchsm.co.ke</p></div>
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
        if (supabase) {
            await supabase.from('exam_notifications').insert([{ exam_id: examData.id, recipients: recipients.length, sent_count: sentCount, failed_count: failedCount, sent_at: new Date().toISOString() }]);
        }
    } catch (error) {}
    
    return { sent: sentCount, failed: failedCount, total: recipients.length };
}

// ============================================
// STUDENT SELECTION FOR NOTIFICATION
// ============================================
let selectedStudentsForNotification = [];
let allStudentsForProgram = [];

document.addEventListener('DOMContentLoaded', function() {
    const notifyTarget = document.getElementById('exam_notify_target');
    if (notifyTarget) {
        notifyTarget.addEventListener('change', function() {
            const container = document.getElementById('specific_students_container');
            if (container) container.style.display = this.value === 'specific' ? 'block' : 'none';
        });
    }
});

// ============================================
// 🔥 LOAD REGISTERED STUDENTS
// ============================================
async function loadStudentsForNotification() {
    const program = document.getElementById('exam_program')?.value;
    const block = document.getElementById('exam_block_term')?.value;
    const selectedCourseId = document.getElementById('exam_course_id')?.value;
    
    console.log('📋 Loading registered students for:', { program, block, selectedCourseId });
    
    if (!program) {
        allStudentsForProgram = [];
        const countEl = document.getElementById('student_notify_count');
        if (countEl) countEl.textContent = '0 students';
        return;
    }
    
    try {
        const supabase = window.sb || window.supabase;
        if (!supabase) return;
        
        let studentUuids = null;
        
        if (selectedCourseId) {
            const { data: course } = await supabase.from('courses').select('course_name, unit_code').eq('id', selectedCourseId).maybeSingle();
            if (course) {
                const unitName = course.course_name;
                const unitCode = course.unit_code;
                
                console.log(`📚 Filtering by registered unit: "${unitName}" (${unitCode})`);
                
                let regQuery = supabase.from('student_unit_registrations').select('student_id, unit_code, unit_name, status').eq('status', 'approved');
                if (unitName) regQuery = regQuery.or(`unit_name.eq.${unitName},unit_code.eq.${unitCode}`);
                else if (unitCode) regQuery = regQuery.eq('unit_code', unitCode);
                
                const { data: regs, error: regError } = await regQuery;
                if (!regError && regs && regs.length > 0) {
                    studentUuids = regs.map(r => r.student_id);
                    console.log(`📚 Found ${studentUuids.length} registered students`);
                }
            }
        }
        
        let query = supabase
            .from('consolidated_user_profiles_table')
            .select('user_id, full_name, email, program, block, student_id, admission_number')
            .eq('role', 'student')
            .eq('program', program);
        
        if (block && block !== '' && block !== '-- Select --' && block !== '-- Select Block/Term --') {
            query = query.eq('block', block);
        }
        if (studentUuids && studentUuids.length > 0) {
            query = query.in('user_id', studentUuids);
        }
        
        const { data, error } = await query.limit(500);
        if (error) throw error;
        
        allStudentsForProgram = data || [];
        console.log(`✅ Loaded ${allStudentsForProgram.length} students`);
        
        const countEl = document.getElementById('student_notify_count');
        if (countEl) {
            countEl.textContent = `${allStudentsForProgram.length} ${studentUuids ? 'registered students' : 'students'}`;
        }
        
        updateSelectedStudentsDisplay();
        
    } catch (error) {
        console.error('Error loading students:', error);
        allStudentsForProgram = [];
    }
}

function searchStudentsForNotification() {
    const searchTerm = document.getElementById('exam_student_search')?.value?.toLowerCase() || '';
    const resultsContainer = document.getElementById('student_search_results');
    if (!resultsContainer) return;
    
    let filtered = allStudentsForProgram;
    if (searchTerm) {
        filtered = allStudentsForProgram.filter(s => 
            (s.full_name || '').toLowerCase().includes(searchTerm) ||
            (s.email || '').toLowerCase().includes(searchTerm)
        );
    }
    
    if (filtered.length === 0) {
        resultsContainer.innerHTML = '<div style="padding:8px;color:#94a3b8;text-align:center;">No students found</div>';
        resultsContainer.style.display = 'block';
        return;
    }
    
    let html = '';
    filtered.slice(0, 20).forEach(student => {
        const isSelected = selectedStudentsForNotification.some(s => s.user_id === student.user_id);
        html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;border-bottom:1px solid #f1f5f9;${isSelected ? 'background:#dbeafe;' : ''}">
            <div><strong style="font-size:13px;">${escapeHtml(student.full_name)}</strong><span style="font-size:11px;color:#6b7280;margin-left:8px;">${escapeHtml(student.email)}</span></div>
            <button onclick="toggleStudentForNotification('${student.user_id}')" style="padding:2px 12px;border:none;border-radius:4px;cursor:pointer;font-size:11px;background:${isSelected ? '#dc2626' : '#059669'};color:white;">${isSelected ? 'Remove' : 'Add'}</button>
        </div>`;
    });
    resultsContainer.innerHTML = html;
    resultsContainer.style.display = 'block';
}

function toggleStudentForNotification(studentId) {
    const student = allStudentsForProgram.find(s => s.user_id === studentId);
    if (!student) return;
    const index = selectedStudentsForNotification.findIndex(s => s.user_id === studentId);
    if (index > -1) selectedStudentsForNotification.splice(index, 1);
    else selectedStudentsForNotification.push(student);
    updateSelectedStudentsDisplay();
    searchStudentsForNotification();
}

function updateSelectedStudentsDisplay() {
    const container = document.getElementById('selected_students_list');
    if (!container) return;
    if (!selectedStudentsForNotification || selectedStudentsForNotification.length === 0) {
        container.innerHTML = '<span style="font-size:12px;color:#94a3b8;"><i class="fas fa-info-circle"></i> No students selected</span>';
        return;
    }
    container.innerHTML = selectedStudentsForNotification.map(student =>
        `<span style="background:#dbeafe;color:#1e40af;padding:2px 10px;border-radius:16px;font-size:12px;display:inline-flex;align-items:center;gap:4px;margin:2px;">${escapeHtml(student.full_name)}<span onclick="toggleStudentForNotification('${student.user_id}')" style="cursor:pointer;color:#dc2626;font-weight:700;">&times;</span></span>`
    ).join('');
}

// ============================================
// LOAD EXAMS
// ============================================
async function loadExams(forceRefresh = false) {
    cacheDomElements();
    if (!DOM.examsTbody) return;
    
    if (!forceRefresh) {
        const cached = ExamCache.get('exams_list');
        if (cached) {
            renderExamsTable(cached);
            renderStudentExams(cached);
            updateExamStats(cached);
            return;
        }
    }
    
    DOM.examsTbody.innerHTML = `<tr><td colspan="13" style="padding:40px;text-align:center;color:#94a3b8;"><div style="display:inline-block;width:36px;height:36px;border:3px solid #e2e8f0;border-top-color:#7c3aed;border-radius:50%;animation:spin 0.8s linear infinite;"></div><p style="margin-top:12px;">Loading...</p></td></tr>`;

    try {
        const supabase = window.sb || window.supabase;
        if (!supabase) throw new Error('Supabase not available');
        
        const { data: exams, error } = await supabase.from('exams').select('*').order('created_at', { ascending: false }).limit(200);
        if (error) throw error;
        
        const { data: allCourses } = await supabase.from('courses').select('id, course_name, name, unit_code, target_program');
        if (allCourses) {
            const courseMap = {};
            allCourses.forEach(c => { courseMap[c.id] = c; });
            window._courseMap = courseMap;
        }

        ExamCache.set('exams_list', exams || []);
        renderExamsTable(exams || []);
        renderStudentExams(exams || []);
        updateExamStats(exams || []);
        
    } catch (error) {
        console.error('Error loading exams:', error);
        DOM.examsTbody.innerHTML = `<tr><td colspan="13" style="padding:30px;text-align:center;color:#dc2626;"><i class="fas fa-exclamation-circle"></i> Failed: ${error.message}</td></tr>`;
    }
}

function updateExamStats(exams) {
    if (!exams) exams = [];
    const total = exams.length;
    const published = exams.filter(e => e.status === 'Published' || e.status === 'published').length;
    const inProgress = exams.filter(e => e.status === 'InProgress' || e.status === 'In Progress').length;
    const draft = exams.filter(e => e.status === 'Draft' || e.status === 'draft' || !e.status).length;
    
    const statValues = document.querySelectorAll('.exam-stat-value');
    if (statValues && statValues.length >= 4) {
        statValues[0].textContent = total;
        statValues[1].textContent = published;
        statValues[2].textContent = inProgress;
        statValues[3].textContent = draft;
    }
}

function getStatusBadge(status) {
    const statusMap = {
        'Published': { bg: '#d1fae5', color: '#065f46', icon: '✅', label: 'Published' },
        'published': { bg: '#d1fae5', color: '#065f46', icon: '✅', label: 'Published' },
        'Upcoming': { bg: '#dbeafe', color: '#1e40af', icon: '📅', label: 'Upcoming' },
        'upcoming': { bg: '#dbeafe', color: '#1e40af', icon: '📅', label: 'Upcoming' },
        'InProgress': { bg: '#fef3c7', color: '#92400e', icon: '⏳', label: 'In Progress' },
        'In Progress': { bg: '#fef3c7', color: '#92400e', icon: '⏳', label: 'In Progress' },
        'Completed': { bg: '#d1fae5', color: '#065f46', icon: '✅', label: 'Completed' },
        'completed': { bg: '#d1fae5', color: '#065f46', icon: '✅', label: 'Completed' },
        'Draft': { bg: '#f3f4f6', color: '#6b7280', icon: '📝', label: 'Draft' },
        'draft': { bg: '#f3f4f6', color: '#6b7280', icon: '📝', label: 'Draft' },
        'Closed': { bg: '#fee2e2', color: '#991b1b', icon: '🔒', label: 'Closed' },
        'closed': { bg: '#fee2e2', color: '#991b1b', icon: '🔒', label: 'Closed' }
    };
    const s = statusMap[status] || statusMap['Draft'];
    return `<span style="display:inline-flex;align-items:center;gap:4px;background:${s.bg};color:${s.color};padding:2px 12px;border-radius:12px;font-size:11px;font-weight:600;border:1px solid ${s.color}33;">${s.icon} ${s.label}</span>`;
}

// ============================================
// RENDER EXAMS TABLE (with Purpose + Publish)
// ============================================
function renderExamsTable(exams) {
    if (!DOM.examsTbody) return;
    
    if (!exams || exams.length === 0) {
        DOM.examsTbody.innerHTML = `<tr><td colspan="13" style="padding:40px;text-align:center;color:#94a3b8;"><i class="fas fa-info-circle" style="font-size:24px;display:block;margin-bottom:8px;"></i>No exams found. Create your first exam!</td></tr>`;
        return;
    }

    let html = '';
    
    for (const e of exams) {
        let courseName = e.course_name || 'N/A';
        if (courseName === 'N/A' && e.course_id && window._courseMap?.[e.course_id]) {
            const c = window._courseMap[e.course_id];
            courseName = c.course_name || c.name || c.unit_code || 'Unknown';
        }
        
        const title = e.title || e.exam_name || 'Untitled';
        const type = e.exam_type || 'N/A';
        const programDisplay = e.target_program || e.program_type || 'N/A';
        const marksOutOf = e.marks_out_of || e.total_marks || 100;
        const passMark = e.pass_mark || 50;
        const isMain = e.is_main_exam === true || isMainExamType(type);
        
        let formattedDate = 'N/A', formattedTime = 'N/A';
        if (e.exam_date) {
            const d = new Date(e.exam_date);
            if (!isNaN(d.getTime())) formattedDate = d.toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });
        }
        if (e.exam_start_time?.includes(':')) formattedTime = e.exam_start_time.substring(0, 5);
        
        const intakeDisplay = e.intake_year ? `${e.intake_year}${e.intake_month ? ' ' + e.intake_month : ''}` : 'N/A';
        const blockDisplay = e.block || e.block_term || 'N/A';
        const durationDisplay = e.duration_minutes ? e.duration_minutes + 'm' : 'N/A';
        const status = e.status || 'draft';
        const link = e.online_link || e.exam_link;
        
        const purposeBadge = isMain
            ? '<span style="display:inline-flex;align-items:center;gap:4px;background:#ede9fe;color:#5b21b6;padding:2px 10px;border-radius:12px;font-size:10px;font-weight:700;">🎯 MAIN EXAM</span>'
            : '<span style="display:inline-flex;align-items:center;gap:4px;background:#f1f5f9;color:#64748b;padding:2px 10px;border-radius:12px;font-size:10px;font-weight:700;">📝 PRACTICE</span>';
        
        const canPublish = status !== 'Published' && status !== 'published' && status !== 'Completed' && status !== 'Closed';
        const canClose = status !== 'Completed' && status !== 'Closed' && status !== 'Published' && status !== 'published';
        
        html += `<tr style="border-bottom:1px solid #f1f5f9;"
                data-program="${escapeHtml(programDisplay)}"
                data-status="${escapeHtml(status)}"
                data-month="${escapeHtml(e.intake_month || '')}">
            <td style="padding:8px 10px;text-align:center;">
                <span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:10px;font-weight:600;background:${type === 'EXAM' ? '#dbeafe' : '#fef3c7'};color:${type === 'EXAM' ? '#1e40af' : '#92400e'};">${escapeHtml(type)}</span>
            </td>
            <td style="padding:8px 10px;font-size:12px;">${escapeHtml(programDisplay)}</td>
            <td style="padding:8px 10px;font-size:12px;">${escapeHtml(courseName)}</td>
            <td style="padding:8px 10px;font-weight:500;font-size:13px;">${escapeHtml(title)}</td>
            <td style="padding:8px 10px;text-align:center;font-weight:600;">${marksOutOf}</td>
            <td style="padding:8px 10px;text-align:center;font-weight:600;color:${parseInt(passMark) >= 50 ? '#059669' : '#dc2626'};">${passMark}%</td>
            <td style="padding:8px 10px;font-size:12px;"><div>${formattedDate}</div><div style="font-size:10px;color:#94a3b8;">${formattedTime}</div></td>
            <td style="padding:8px 10px;text-align:center;font-size:12px;">${durationDisplay}</td>
            <td style="padding:8px 10px;font-size:12px;text-align:center;">${escapeHtml(intakeDisplay)}</td>
            <td style="padding:8px 10px;font-size:12px;text-align:center;">${escapeHtml(blockDisplay)}</td>
            <td style="padding:8px 10px;text-align:center;">${purposeBadge}</td>
            <td style="padding:8px 10px;text-align:center;">${getStatusBadge(status)}</td>
            <td style="padding:8px 10px;text-align:center;white-space:nowrap;">
                <button onclick="openEditExamModal('${e.id}')" class="btn-sm" style="padding:4px 10px;font-size:11px;background:#3b82f6;color:white;border:none;border-radius:4px;cursor:pointer;" title="Edit"><i class="fas fa-edit"></i></button>
                <button onclick="openGradeModal('${e.id}')" class="btn-sm" style="padding:4px 10px;font-size:11px;background:#10b981;color:white;border:none;border-radius:4px;cursor:pointer;" title="Grade"><i class="fas fa-check-double"></i></button>
                ${canPublish ? `<button onclick="releaseExamResults('${e.id}')" class="btn-sm" style="padding:4px 10px;font-size:11px;background:#8b5cf6;color:white;border:none;border-radius:4px;cursor:pointer;" title="Publish — Make visible to students"><i class="fas fa-check-circle"></i> Publish</button>` : ''}
                ${canClose ? `<button onclick="closeExam('${e.id}')" class="btn-sm" style="padding:4px 10px;font-size:11px;background:#f59e0b;color:white;border:none;border-radius:4px;cursor:pointer;" title="Close"><i class="fas fa-lock"></i></button>` : ''}
                <button onclick="deleteExam('${e.id}', '${escapeHtml(title)}')" class="btn-sm" style="padding:4px 10px;font-size:11px;background:#dc2626;color:white;border:none;border-radius:4px;cursor:pointer;" title="Delete"><i class="fas fa-trash"></i></button>
                ${link ? `<a href="${escapeHtml(link)}" target="_blank" class="btn-sm" style="padding:4px 10px;font-size:11px;background:#059669;color:white;border:none;border-radius:4px;text-decoration:none;display:inline-block;" title="Open"><i class="fas fa-external-link-alt"></i></a>` : ''}
            </td>
        </tr>`;
    }
    
    DOM.examsTbody.innerHTML = html;
}

function renderStudentExams(exams) {
    if (!DOM.studentExams) return;
    
    const published = exams.filter(e => 
        e.status === 'Published' || e.status === 'published' || 
        e.status === 'Upcoming' || e.status === 'InProgress'
    );
    
    if (published.length === 0) {
        DOM.studentExams.innerHTML = `<p style="color:#94a3b8;padding:20px;text-align:center;font-size:14px;"><i class="fas fa-info-circle"></i> No published assessments available.</p>`;
        return;
    }
    
    let html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px;">';
    
    for (const exam of published.slice(0, 6)) {
        const dateStr = exam.exam_date ? new Date(exam.exam_date).toLocaleDateString() : '';
        const statusClass = exam.status === 'Upcoming' ? 'upcoming' : exam.status === 'InProgress' ? 'in-progress' : 'completed';
        const borderColor = statusClass === 'upcoming' ? '#f59e0b' : statusClass === 'in-progress' ? '#3b82f6' : '#10b981';
        const link = exam.online_link || exam.exam_link;
        const courseName = exam.course_name || 'N/A';
        const isMain = exam.is_main_exam === true || isMainExamType(exam.exam_type);
        
        html += `<div style="background:white;border-radius:12px;padding:14px 16px;border-left:4px solid ${borderColor};border:1px solid #f1f5f9;">
            <h4 style="margin:0 0 6px 0;font-size:14px;font-weight:700;color:#0f172a;">${escapeHtml(exam.title)}</h4>
            <div style="font-size:12px;color:#94a3b8;margin-bottom:6px;">${escapeHtml(courseName)} ${isMain ? '<span style="color:#7c3aed;font-weight:700;margin-left:4px;">🎯</span>' : ''}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 14px;font-size:12px;color:#475569;">
                <span><strong>Type:</strong> ${escapeHtml(exam.exam_type)}</span>
                <span><strong>Duration:</strong> ${exam.duration_minutes || 'N/A'}m</span>
                <span><strong>Date:</strong> ${dateStr}</span>
                <span><strong>Marks:</strong> ${exam.marks_out_of || 100}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;flex-wrap:wrap;gap:6px;">
                <span style="font-size:11px;font-weight:500;color:${borderColor};">${exam.status}</span>
                ${link ? `<a href="${escapeHtml(link)}" target="_blank" style="background:linear-gradient(135deg,#7c3aed,#6d28d9);color:white;padding:4px 16px;border-radius:20px;text-decoration:none;font-size:12px;font-weight:600;">Take Exam</a>` : ''}
            </div>
        </div>`;
    }
    
    html += '</div>';
    DOM.studentExams.innerHTML = html;
}

// ============================================
// PROGRAM OPTIONS
// ============================================
function getProgramOptions() {
    const groups = [
        { label: '🎓 KRCHN Nursing', programs: ['KRCHN - Kenya Registered Community Health Nursing'] },
        { label: '🎯 TVET Diploma', programs: ['DPOTT - Diploma in Perioperative Theatre Technology','DCH - Diploma in Community Health','DHRIT - Diploma in Health Records and IT','DSL - Diploma in Science Lab','DSW - Diploma in Social Work','DCJS - Diploma in Criminal Justice','DHSS - Diploma in Health Support Services','DICT - Diploma in ICT','DME - Diploma in Medical Engineering'] },
        { label: '📜 TVET Certificate', programs: ['CPOTT - Certificate in Perioperative Theatre Technology','CCH - Certificate in Community Health','CHRIT - Certificate in Health Records and IT','CPC - Certificate in Patient Care','CSL - Certificate in Science Lab','CSW - Certificate in Social Work','CCJS - Certificate in Criminal Justice','CAG - Certificate in Agriculture','CHSS - Certificate in Health Support Services','CICT - Certificate in ICT'] },
        { label: '🔧 Artisan', programs: ['ACH - Artisan in Community Health','AAG - Artisan in Agriculture','ASW - Artisan in Social Work'] },
        { label: '📊 Other', programs: ['CCA - Certificate in Computer Applications','PTE - TVET/CDACC (PTE)'] }
    ];
    
    let html = '';
    groups.forEach(g => {
        html += `<optgroup label="${g.label}">`;
        g.programs.forEach(p => {
            const code = p.split(' - ')[0];
            html += `<option value="${code}">${p}</option>`;
        });
        html += '</optgroup>';
    });
    return html;
}

function populateProgramDropdowns() {
    const examProgram = document.getElementById('exam_program');
    const editExamProgram = document.getElementById('edit_exam_program');
    const options = getProgramOptions();
    if (examProgram) examProgram.innerHTML = '<option value="">-- Select Program --</option>' + options;
    if (editExamProgram && !editExamProgram.querySelector('option[value=""]')) {
        editExamProgram.innerHTML = '<option value="">-- Select Program --</option>' + options;
    }
}

async function loadAvailableClassesForExam() {
    if (!DOM.classSelector) return;
    
    const program = document.getElementById('exam_program')?.value || 'KRCHN';
    const isTVET = isTVETProgram(program);
    const level = getProgramLevel(program);
    
    let options = [];
    let blockLabel = 'Block';
    
    if (isTVET) {
        blockLabel = 'Term';
        if (level === 'DIPLOMA') options = [{value:'Y1T1',label:'Year 1 Term 1'},{value:'Y1T2',label:'Year 1 Term 2'},{value:'Y1T3',label:'Year 1 Term 3'},{value:'Y2T1',label:'Year 2 Term 1'},{value:'Y2T2',label:'Year 2 Term 2'},{value:'Y2T3',label:'Year 2 Term 3'}];
        else if (level === 'CERTIFICATE') options = [{value:'Y1T1',label:'Year 1 Term 1'},{value:'Y1T2',label:'Year 1 Term 2'},{value:'Y1T3',label:'Year 1 Term 3'}];
        else options = [{value:'Introductory',label:'Introductory Term'},{value:'Term1',label:'Term 1'},{value:'Term2',label:'Term 2'},{value:'Term3',label:'Term 3'},{value:'Term4',label:'Term 4'},{value:'Term5',label:'Term 5'},{value:'Term6',label:'Term 6'},{value:'Final',label:'Final Term'}];
    } else {
        options = [{value:'Introductory',label:'Introductory Block'},{value:'Block 1',label:'Block 1'},{value:'Block 2',label:'Block 2'},{value:'Block 3',label:'Block 3'},{value:'Block 4',label:'Block 4'},{value:'Block 5',label:'Block 5'},{value:'Block 6',label:'Block 6'},{value:'Final',label:'Final Block'}];
    }
    
    DOM.classSelector.innerHTML = `
        <p style="color:#6b7280;font-size:12px;margin:0 0 8px 0;grid-column:1/-1;"><i class="fas fa-info-circle"></i> Select ${blockLabel}s:</p>
        <div style="display:flex;flex-wrap:wrap;gap:8px;grid-column:1/-1;">
            ${options.map(opt => `<label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;"><input type="checkbox" class="exam-class-checkbox" value="${opt.value}"><span>${opt.label}</span></label>`).join('')}
        </div>
        <div style="display:flex;gap:6px;grid-column:1/-1;margin-top:4px;">
            <input type="text" id="customBlocksInput" placeholder="Custom ${blockLabel}s" style="flex:1;padding:6px 12px;border-radius:6px;border:1px solid #ddd;font-size:12px;">
            <button onclick="addCustomBlocks()" style="padding:6px 14px;background:#7c3aed;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:12px;">Add</button>
        </div>
    `;
}

function addCustomBlocks() {
    const input = document.getElementById('customBlocksInput');
    if (!input?.value.trim()) return;
    const blocks = input.value.split(',').map(b => b.trim()).filter(Boolean);
    const div = DOM.classSelector.querySelector('div:first-child') || DOM.classSelector;
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
// ✅ CREATE EXAM — Auto-detects main exam
// ============================================
async function handleAddExam(e) {
    e.preventDefault();
    const btn = e.submitter;
    if (!btn) return;
    
    const original = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Creating...';

    const selectedCourse = window.selectedSuperAdminCreateCourse;
    
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
        course: document.getElementById('exam_course_id')?.value || null,
        courseName: selectedCourse?.name || null,
        courseCode: selectedCourse?.code || null,
        outOf: parseInt(document.getElementById('exam_out_of')?.value) || 100,
        passMark: parseInt(document.getElementById('exam_pass_mark')?.value) || 50,
        minFee: parseInt(document.getElementById('exam_min_fee')?.value) || 0,
        link: document.getElementById('exam_link')?.value.trim() || null
    };

    if (!fields.title || !fields.program || !fields.date || !fields.intake || !fields.block || !fields.type || isNaN(fields.duration)) {
        showFeedback('Please fill all required fields.', 'error');
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
        recipients = notifyTarget === 'specific' ? selectedStudentsForNotification : allStudentsForProgram;
    }

    try {
        const supabase = window.sb || window.supabase;
        if (!supabase) throw new Error('Supabase not available');
        
        const isMainExam = isMainExamType(fields.type);
        
        const examData = {
            title: fields.title,
            exam_name: fields.title,
            exam_type: fields.type,
            is_main_exam: isMainExam,
            status: fields.status.toLowerCase(),
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
            course_id: fields.course,
            course_name: fields.courseName,
            course_code: fields.courseCode,
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

        const { data, error } = await supabase.from('exams').insert(examData).select('id');
        if (error) throw error;
        
        examData.id = data?.[0]?.id;

        let emailResult = { sent: 0, total: 0 };
        if (notifyStudents && recipients.length > 0) {
            emailResult = await sendExamNotificationEmail(examData, recipients);
        }

        let feedbackMsg = `✅ "${fields.title}" created as ${isMainExam ? '🎯 MAIN EXAM' : '📝 PRACTICE'}!`;
        if (notifyStudents && recipients.length > 0) {
            feedbackMsg += ` 📧 ${emailResult.sent} notifications sent.`;
        }
        showFeedback(feedbackMsg, 'success');
        
        if (e.target) e.target.reset();
        
        selectedStudentsForNotification = [];
        updateSelectedStudentsDisplay();
        const notifyCheck = document.getElementById('exam_notify_students');
        if (notifyCheck) notifyCheck.checked = true;
        
        window.selectedSuperAdminCreateCourse = null;
        const csi = document.getElementById('createCourseSearchInput');
        if (csi) csi.value = '';
        const chi = document.getElementById('exam_course_id');
        if (chi) chi.value = '';
        const cd = document.getElementById('createSelectedCourseDisplay');
        if (cd) cd.style.display = 'none';
        
        ExamCache.clear();
        loadExams(true);
        
    } catch (error) {
        showFeedback(`Failed: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = original;
    }
}

// ============================================
// EDIT EXAM
// ============================================
async function openEditExamModal(id) {
    try {
        const supabase = window.sb || window.supabase;
        if (!supabase) throw new Error('Supabase not available');
        
        const { data: exam, error } = await supabase.from('exams').select('*').eq('id', id).single();
        if (error) throw error;
        
        const modal = document.getElementById('examEditModal');
        if (!modal) { showFeedback('Edit modal not found', 'error'); return; }
        
        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
        
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
        setVal('edit_exam_course', exam.course_id || '');
        
        if (exam.course_name || exam.course_id) {
            window.selectedSuperAdminEditCourse = { id: exam.course_id, name: exam.course_name || '', code: exam.course_code || '' };
            const courseSearchEl = document.getElementById('editCourseSearchInput');
            if (courseSearchEl && exam.course_name) {
                courseSearchEl.value = exam.course_name + (exam.course_code ? ` (${exam.course_code})` : '');
                const displayEl = document.getElementById('editSelectedCourseDisplay');
                const nameEl = document.getElementById('editSelectedCourseName');
                if (displayEl && nameEl) { displayEl.style.display = 'inline'; nameEl.textContent = courseSearchEl.value; }
            }
        }
        
        if (typeof initEditCourseDropdown === 'function') await initEditCourseDropdown(exam.target_program || '', exam.course_id);
        if (typeof renderAssignedClasses === 'function') renderAssignedClasses(exam.id, exam.assigned_classes || []);
        
        modal.style.display = 'flex';
        
    } catch (error) {
        showFeedback('❌ Failed to load exam: ' + error.message, 'error');
    }
}

async function saveEditedExam(event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    
    const idEl = document.getElementById('edit_exam_id');
    if (!idEl || !idEl.value) { showFeedback('❌ Exam ID missing', 'error'); return; }
    
    const id = idEl.value;
    const selectedCourse = window.selectedSuperAdminEditCourse;
    const examType = document.getElementById('edit_exam_type')?.value || 'CAT';
    
    const data = {
        title: document.getElementById('edit_exam_title')?.value?.trim() || '',
        exam_name: document.getElementById('edit_exam_title')?.value?.trim() || '',
        exam_type: examType,
        is_main_exam: isMainExamType(examType),
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
        course_name: selectedCourse?.name || null,
        course_code: selectedCourse?.code || null,
        marks_out_of: parseInt(document.getElementById('edit_exam_out_of')?.value) || 100,
        total_marks: parseInt(document.getElementById('edit_exam_out_of')?.value) || 100,
        MARKS: String(parseInt(document.getElementById('edit_exam_out_of')?.value) || 100),
        pass_mark: parseInt(document.getElementById('edit_exam_pass_mark')?.value) || 50,
        min_fee_balance: parseInt(document.getElementById('edit_exam_min_fee')?.value) || 0,
        online_link: document.getElementById('edit_exam_link')?.value?.trim() || null,
        exam_link: document.getElementById('edit_exam_link')?.value?.trim() || null,
        updated_at: new Date().toISOString()
    };
    
    Object.keys(data).forEach(k => { if (data[k] === undefined || data[k] === null || data[k] === '') delete data[k]; });
    if (!data.course_name && !selectedCourse) { delete data.course_name; delete data.course_code; }
    
    let saveBtn = document.querySelector('#editExamForm button[type="submit"]') || document.querySelector('#examEditModal .btn-action');
    if (!saveBtn) {
        for (const btn of document.querySelectorAll('#examEditModal button')) {
            if (btn.textContent.toLowerCase().includes('save')) { saveBtn = btn; break; }
        }
    }
    
    const originalText = saveBtn?.textContent || 'Save';
    if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...'; }
    
    try {
        const supabase = window.sb || window.supabase;
        if (!supabase) throw new Error('Supabase not available');
        
        const { error } = await supabase.from('exams').update(data).eq('id', id);
        if (error) throw error;
        
        showFeedback('✅ Exam updated!', 'success');
        window.selectedSuperAdminEditCourse = null;
        ExamCache.clear();
        await loadExams(true);
        closeEditModal();
        
    } catch (error) {
        showFeedback('❌ Failed: ' + error.message, 'error');
        if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = originalText; }
    }
}

function renderAssignedClasses(examId, classes) {
    const container = document.getElementById('edit_exam_classes_container');
    if (!container) return;
    container.innerHTML = `
        <label style="font-weight:600;font-size:11px;text-transform:uppercase;color:#475569;display:block;margin-bottom:4px;">Assigned Blocks</label>
        <div style="display:flex;flex-wrap:wrap;gap:6px;padding:8px;background:#f8fafc;border-radius:8px;min-height:32px;border:1px solid #e2e8f0;">
            ${classes && classes.length > 0 ? classes.map(c => `<span style="background:#7c3aed;color:#fff;padding:2px 12px;border-radius:16px;font-size:11px;display:inline-flex;align-items:center;gap:4px;">${escapeHtml(c)}<span onclick="removeClass('${examId}','${escapeHtml(c)}')" style="cursor:pointer;color:#fca5a5;font-weight:700;">&times;</span></span>`).join('') : '<span style="color:#94a3b8;font-size:12px;">No blocks assigned</span>'}
        </div>
        <div style="display:flex;gap:6px;margin-top:6px;">
            <input type="text" id="edit_exam_add_class" placeholder="Add block" style="flex:1;padding:6px 10px;border-radius:6px;border:1px solid #e2e8f0;font-size:12px;">
            <button onclick="addClass('${examId}')" style="padding:6px 14px;background:#7c3aed;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:12px;"><i class="fas fa-plus"></i></button>
        </div>`;
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
        await supabase.from('exams').update({ assigned_classes: current }).eq('id', examId);
        showFeedback(`✅ Added`, 'success');
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
        await supabase.from('exams').update({ assigned_classes: current }).eq('id', examId);
        showFeedback(`✅ Removed`, 'success');
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
        showFeedback(`✅ Deleted`, 'success');
        loadExams(true);
    } catch (e) { showFeedback(`Delete failed: ${e.message}`, 'error'); }
}

async function closeExam(id) {
    if (!confirm('Close this exam?')) return;
    try {
        const supabase = window.sb || window.supabase;
        const { error } = await supabase.from('exams').update({ status: 'Closed', updated_at: new Date().toISOString() }).eq('id', id);
        if (error) throw error;
        ExamCache.clear();
        showFeedback('✅ Exam closed', 'success');
        loadExams(true);
    } catch (e) { showFeedback(`Failed: ${e.message}`, 'error'); }
}

function closeEditModal() {
    const modal = document.getElementById('examEditModal');
    if (modal) { modal.style.display = 'none'; const form = document.getElementById('editExamForm'); if (form) form.reset(); }
    window.selectedSuperAdminEditCourse = null;
}

const filterExamsTable = debounce(function() {
    const search = document.getElementById('exam-search')?.value?.toLowerCase() || '';
    const program = document.getElementById('exam_filter_program')?.value || '';
    const status = document.getElementById('exam_filter_status')?.value || '';
    const month = document.getElementById('exam_filter_intake_month')?.value || '';
    
    document.querySelectorAll('#exams-table-body tr').forEach(row => {
        if (row.querySelector('td[colspan]')) return;
        const cells = row.querySelectorAll('td');
        if (cells.length < 12) return;
        
        const title = cells[3]?.textContent?.toLowerCase() || '';
        const prog = cells[1]?.textContent || '';
        const stat = cells[11]?.textContent || '';
        const intake = cells[8]?.textContent || '';
        
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
    if (visible.length === 0) { showFeedback('No exams to export', 'warning'); return; }
    
    let csv = 'Type,Program,Course,Title,Out Of,Pass Mark,Date,Duration,Intake,Block,Purpose,Status\n';
    visible.forEach(row => {
        const cols = row.querySelectorAll('td');
        if (cols.length >= 12) {
            const data = [];
            for (let i = 0; i < 12; i++) data.push(`"${String(cols[i]?.textContent || '').replace(/"/g,'""').trim()}"`);
            csv += data.join(',') + '\n';
        }
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `exams_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
    showFeedback('✅ Exported!', 'success');
}

function showExamTab(tab) {
    document.querySelectorAll('.exam-tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.exam-tab-btn').forEach(btn => { btn.className = 'exam-tab-btn'; btn.style.background = 'transparent'; btn.style.color = '#334155'; btn.style.boxShadow = 'none'; });
    
    if (tab === 'list') {
        document.getElementById('examListTab').style.display = 'block';
        const btn = document.getElementById('examListTabBtn');
        btn.className = 'exam-tab-btn active';
        btn.style.background = 'linear-gradient(135deg, #7c3aed, #6d28d9)';
        btn.style.color = 'white';
        loadExams();
    } else if (tab === 'create') {
        document.getElementById('examCreateTab').style.display = 'block';
        const btn = document.getElementById('examCreateTabBtn');
        btn.className = 'exam-tab-btn active';
        btn.style.background = 'linear-gradient(135deg, #7c3aed, #6d28d9)';
        btn.style.color = 'white';
        loadAvailableClassesForExam();
        
        const programSelect = document.getElementById('exam_program');
        if (typeof initCreateCourseDropdown === 'function') initCreateCourseDropdown(programSelect?.value || '');
        
        setTimeout(loadStudentsForNotification, 800);
    }
}

async function getCurrentUser() {
    try {
        if (window.currentUserProfile?.user_id) return window.currentUserProfile;
        const stored = sessionStorage.getItem('currentUserProfile');
        if (stored) { const u = JSON.parse(stored); if (u?.user_id) return u; }
        const supabase = window.sb || window.supabase;
        if (!supabase) return null;
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase.from('consolidated_user_profiles_table').select('*').eq('user_id', user.id).single();
            if (profile) { window.currentUserProfile = profile; sessionStorage.setItem('currentUserProfile', JSON.stringify(profile)); return profile; }
        }
        return null;
    } catch (e) { return null; }
}

// ============================================
// COURSE DROPDOWNS
// ============================================
let createCoursesData = [];
let editCoursesData = [];

function normalizeSuperAdminCourse(row) {
    row = row || {};
    return {
        id: row.id,
        code: row.course_code || row.code || row.unit_code || row.courseCode || '',
        name: row.course_name || row.name || row.unit_name || row.title || row.course || '',
        program: row.program || row.program_code || row.target_program || ''
    };
}

async function fetchSuperAdminCourses() {
    const supabase = window.sb || window.supabase;
    if (!supabase) return [];
    try {
        const { data, error } = await supabase.from('courses').select('*').limit(1000);
        if (error) throw error;
        return (data || []).map(normalizeSuperAdminCourse);
    } catch (error) { return []; }
}

function courseMatchesProgram(course, program) {
    if (!program) return true;
    return !course.program || String(course.program).toLowerCase() === String(program).toLowerCase();
}

function renderSuperAdminCourseResults(list, courses, searchTerm, selectFn, programOverride = '') {
    if (!list) return;
    const query = String(searchTerm || '').trim().toLowerCase();
    
    let filtered = courses.filter(c => {
        const activeProgram = programOverride || document.getElementById('exam_program')?.value || '';
        if (!courseMatchesProgram(c, activeProgram)) return false;
        if (!query) return true;
        return String(c.code || '').toLowerCase().includes(query) || String(c.name || '').toLowerCase().includes(query) || String(c.program || '').toLowerCase().includes(query);
    });
    
    if (!filtered.length) {
        list.innerHTML = '<div style="padding:12px;text-align:center;color:#94a3b8;font-size:13px;"><i class="fas fa-search"></i> No matching courses</div>';
        list.style.display = 'block';
        return;
    }
    
    filtered = filtered.slice(0, 50);
    
    list.innerHTML = filtered.map(course => {
        const title = course.name || course.code || 'Unnamed';
        return `<div class="dropdown-item" data-course-id="${course.id}" style="padding:9px 14px;cursor:pointer;border-bottom:1px solid #f1f5f9;font-size:13px;display:flex;justify-content:space-between;gap:10px;">
            <div><strong style="color:#334155;">${escapeHtml(title)}</strong>${course.code ? '<span style="font-size:11px;color:#94a3b8;margin-left:8px;">' + escapeHtml(course.code) + '</span>' : ''}</div>
            ${course.program ? '<span style="font-size:10px;background:#ede9fe;color:#5b21b6;padding:2px 7px;border-radius:10px;">' + escapeHtml(course.program) + '</span>' : ''}
        </div>`;
    }).join('');
    
    list.querySelectorAll('[data-course-id]').forEach(item => {
        item.addEventListener('click', () => {
            const course = courses.find(c => String(c.id) === String(item.dataset.courseId));
            if (course) selectFn(course);
        });
    });
    
    list.style.display = 'block';
}

async function initCreateCourseDropdown(program = '') {
    const input = document.getElementById('createCourseSearchInput');
    const list = document.getElementById('createCourseDropdownList');
    if (!input || !list) return;
    
    createCoursesData = await fetchSuperAdminCourses();
    
    if (!input.dataset.bound) {
        input.dataset.bound = '1';
        input.addEventListener('input', () => filterCreateCourseDropdown(input.value));
        input.addEventListener('focus', () => filterCreateCourseDropdown(input.value));
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') { const first = list.querySelector('[data-course-id]'); if (first) first.click(); e.preventDefault(); }
            if (e.key === 'Escape') list.style.display = 'none';
        });
    }
    filterCreateCourseDropdown('');
}

function filterCreateCourseDropdown(searchTerm = '') {
    const list = document.getElementById('createCourseDropdownList');
    if (!list) return;
    renderSuperAdminCourseResults(list, createCoursesData, searchTerm, selectCreateCourseObject, document.getElementById('exam_program')?.value || '');
}

function selectCreateCourseObject(course) {
    const input = document.getElementById('createCourseSearchInput');
    const hidden = document.getElementById('exam_course_id');
    const list = document.getElementById('createCourseDropdownList');
    const display = document.getElementById('createSelectedCourseDisplay');
    const nameDisplay = document.getElementById('createSelectedCourseName');
    
    window.selectedSuperAdminCreateCourse = course;
    const label = course.name + (course.code ? ` (${course.code})` : '');
    
    if (input) input.value = label;
    if (hidden) hidden.value = course.id || '';
    if (list) list.style.display = 'none';
    if (display && nameDisplay) { display.style.display = 'inline'; nameDisplay.textContent = label; }
    
    if (typeof loadStudentsForNotification === 'function') loadStudentsForNotification();
}

function selectCreateCourse(courseId, courseName, courseCode) {
    selectCreateCourseObject({ id: courseId, name: courseName || '', code: courseCode || '', program: '' });
}

async function updateCreateCourseDropdown() {
    if (!createCoursesData.length) createCoursesData = await fetchSuperAdminCourses();
    ['createCourseSearchInput', 'exam_course_id'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const display = document.getElementById('createSelectedCourseDisplay');
    if (display) display.style.display = 'none';
    window.selectedSuperAdminCreateCourse = null;
    filterCreateCourseDropdown('');
}

async function initEditCourseDropdown(program = '', selectedId = '') {
    const input = document.getElementById('editCourseSearchInput');
    const list = document.getElementById('editCourseDropdownList');
    if (!input || !list) return;
    
    editCoursesData = await fetchSuperAdminCourses();
    
    if (!input.dataset.bound) {
        input.dataset.bound = '1';
        input.addEventListener('input', () => filterEditCourseDropdown(input.value));
        input.addEventListener('focus', () => filterEditCourseDropdown(input.value));
    }
    
    if (selectedId) setEditCourseValue(selectedId);
    else filterEditCourseDropdown('');
}

function filterEditCourseDropdown(searchTerm = '') {
    const list = document.getElementById('editCourseDropdownList');
    if (!list) return;
    renderSuperAdminCourseResults(list, editCoursesData, searchTerm, selectEditCourseObject, document.getElementById('edit_exam_program')?.value || '');
}

function selectEditCourseObject(course) {
    const input = document.getElementById('editCourseSearchInput');
    const hidden = document.getElementById('edit_exam_course');
    const list = document.getElementById('editCourseDropdownList');
    const display = document.getElementById('editSelectedCourseDisplay');
    const nameDisplay = document.getElementById('editSelectedCourseName');
    
    window.selectedSuperAdminEditCourse = course;
    const label = course.name + (course.code ? ` (${course.code})` : '');
    
    if (input) input.value = label;
    if (hidden) hidden.value = course.id || '';
    if (list) list.style.display = 'none';
    if (display && nameDisplay) { display.style.display = 'inline'; nameDisplay.textContent = label; }
}

function selectEditCourse(courseId, courseName, courseCode) {
    selectEditCourseObject({ id: courseId, name: courseName || '', code: courseCode || '', program: '' });
}

function setEditCourseValue(courseId) {
    if (!courseId) return;
    const course = editCoursesData.find(c => String(c.id) === String(courseId));
    if (!course) { const hidden = document.getElementById('edit_exam_course'); if (hidden) hidden.value = courseId; return; }
    selectEditCourseObject(course);
}

// ============================================
// GRADE MODAL
// ============================================
async function openGradeModal(examId) {
    try {
        const supabase = window.sb || window.supabase;
        if (!supabase) { showFeedback('❌ Supabase not available', 'error'); return; }
        
        const currentUser = await getCurrentUser();
        if (!currentUser?.user_id) { showFeedback('❌ Login required', 'error'); return; }

        const { data: exam, error: examError } = await supabase.from('exams').select('*').eq('id', examId).single();
        if (examError || !exam) { showFeedback('❌ Exam not found', 'error'); return; }

        const programField = exam.target_program || exam.program_type;
        const blockField = exam.block || exam.block_term;
        const unitName = exam.course_name;
        const unitCode = exam.course_code;
        
        let registeredStudentUuids = null;
        
        if (unitName || unitCode) {
            let regQuery = supabase.from('student_unit_registrations').select('student_id, unit_code, unit_name').eq('status', 'approved');
            if (unitName && unitCode) regQuery = regQuery.or(`unit_name.eq.${unitName},unit_code.eq.${unitCode}`);
            else if (unitName) regQuery = regQuery.eq('unit_name', unitName);
            else regQuery = regQuery.eq('unit_code', unitCode);
            
            const { data: regs } = await regQuery;
            if (regs && regs.length > 0) registeredStudentUuids = regs.map(r => r.student_id);
        }
        
        let query = supabase.from('consolidated_user_profiles_table')
            .select('user_id, full_name, email, program, intake_year, block')
            .eq('role', 'student');
        
        if (programField) query = query.eq('program', programField);
        if (exam.intake_year) query = query.eq('intake_year', String(exam.intake_year));
        if (blockField) query = query.eq('block', blockField);
        if (registeredStudentUuids && registeredStudentUuids.length > 0) query = query.in('user_id', registeredStudentUuids);
        
        const { data: students, error: studentError } = await query.limit(200);

        if (studentError || !students?.length) {
            showFeedback('⚠️ No students found for this exam.', 'warning');
            return;
        }

        const { data: existingGrades } = await supabase.from('exam_grades').select('*').eq('exam_id', examId);
        const examType = exam.exam_type || 'EXAM';
        const modalHtml = buildGradeModalHTML(exam, students, existingGrades || [], currentUser, examType);
        showGradeModal(modalHtml);
        showFeedback(`✅ Grading modal loaded for ${students.length} students`, 'success');
        
    } catch (error) {
        showFeedback('❌ ' + error.message, 'error');
    }
}

function buildGradeModalHTML(exam, students, existingGrades, currentUser, examType) {
    const examTypeLabel = getExamTypeLabel(examType);
    const marksOutOf = exam.marks_out_of || 100;
    const passMark = exam.pass_mark || 50;
    const examTitle = exam.title || exam.exam_name || 'Assessment';
    const isMain = exam.is_main_exam === true || isMainExamType(examType);
    
    let tableHeaders = '';
    let tableRows = '';
    
    if (examType === 'CAT_1') {
        tableHeaders = `<th>Student</th><th>Email</th><th>CAT 1 (max 30)</th><th>Status</th>`;
        tableRows = students.map(s => {
            const g = existingGrades?.find(x => x.student_id === s.user_id) || {};
            return `<tr data-name="${s.full_name.toLowerCase()}" data-email="${(s.email||'').toLowerCase()}" data-id="${s.user_id}">
                <td><strong>${escapeHtml(s.full_name)}</strong></td>
                <td>${escapeHtml(s.email || '')}</td>
                <td><input type="number" min="0" max="30" step="0.5" id="cat1-${s.user_id}" value="${g.cat_1_score ?? ''}" class="grade-input"></td>
                <td><select id="status-${s.user_id}" class="status-select">
                    <option value="Scheduled" ${g.result_status === 'Scheduled' ? 'selected' : ''}>Scheduled</option>
                    <option value="InProgress" ${g.result_status === 'InProgress' ? 'selected' : ''}>In Progress</option>
                    <option value="Final" ${g.result_status === 'Final' ? 'selected' : ''}>Final</option>
                </select></td>
            </tr>`;
        }).join('');
    } else if (examType === 'CAT_2') {
        tableHeaders = `<th>Student</th><th>Email</th><th>CAT 2 (max 30)</th><th>Status</th>`;
        tableRows = students.map(s => {
            const g = existingGrades?.find(x => x.student_id === s.user_id) || {};
            return `<tr data-name="${s.full_name.toLowerCase()}" data-email="${(s.email||'').toLowerCase()}" data-id="${s.user_id}">
                <td><strong>${escapeHtml(s.full_name)}</strong></td>
                <td>${escapeHtml(s.email || '')}</td>
                <td><input type="number" min="0" max="30" step="0.5" id="cat2-${s.user_id}" value="${g.cat_2_score ?? ''}" class="grade-input"></td>
                <td><select id="status-${s.user_id}" class="status-select">
                    <option value="Scheduled" ${g.result_status === 'Scheduled' ? 'selected' : ''}>Scheduled</option>
                    <option value="InProgress" ${g.result_status === 'InProgress' ? 'selected' : ''}>In Progress</option>
                    <option value="Final" ${g.result_status === 'Final' ? 'selected' : ''}>Final</option>
                </select></td>
            </tr>`;
        }).join('');
    } else {
        tableHeaders = `<th>Student</th><th>Email</th><th>CAT 1 (max 30)</th><th>CAT 2 (max 30)</th><th>Final (max ${marksOutOf})</th><th>Total</th><th>Status</th>`;
        tableRows = students.map(s => {
            const g = existingGrades?.find(x => x.student_id === s.user_id) || {};
            return `<tr data-name="${s.full_name.toLowerCase()}" data-email="${(s.email||'').toLowerCase()}" data-id="${s.user_id}">
                <td><strong>${escapeHtml(s.full_name)}</strong></td>
                <td>${escapeHtml(s.email || '')}</td>
                <td><input type="number" min="0" max="30" step="0.5" id="cat1-${s.user_id}" value="${g.cat_1_score ?? ''}" class="grade-input" oninput="updateGradeTotal('${s.user_id}')"></td>
                <td><input type="number" min="0" max="30" step="0.5" id="cat2-${s.user_id}" value="${g.cat_2_score ?? ''}" class="grade-input" oninput="updateGradeTotal('${s.user_id}')"></td>
                <td><input type="number" min="0" max="${marksOutOf}" step="0.5" id="final-${s.user_id}" value="${g.exam_score ?? ''}" class="grade-input" oninput="updateGradeTotal('${s.user_id}')"></td>
                <td><input type="number" min="0" max="100" step="0.1" id="total-${s.user_id}" value="" readonly class="total-input"></td>
                <td><select id="status-${s.user_id}" class="status-select">
                    <option value="Scheduled" ${g.result_status === 'Scheduled' ? 'selected' : ''}>Scheduled</option>
                    <option value="InProgress" ${g.result_status === 'InProgress' ? 'selected' : ''}>In Progress</option>
                    <option value="Final" ${g.result_status === 'Final' ? 'selected' : ''}>Final</option>
                </select></td>
            </tr>`;
        }).join('');
    }
    
    return `
    <div class="modal-overlay" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;">
        <div class="modal-content" style="background:white;border-radius:16px;max-width:1000px;width:100%;max-height:90vh;overflow-y:auto;padding:0;">
            <div class="modal-header" style="padding:16px 24px;border-bottom:2px solid #4C1D95;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;background:white;z-index:10;">
                <div>
                    <h3 style="margin:0;color:#4C1D95;">
                        <i class="fas fa-check-double"></i> ${examTypeLabel}: ${escapeHtml(examTitle)}
                        ${isMain ? '<span style="margin-left:8px;font-size:11px;background:#ede9fe;color:#5b21b6;padding:2px 10px;border-radius:12px;">🎯 MAIN EXAM</span>' : '<span style="margin-left:8px;font-size:11px;background:#f1f5f9;color:#64748b;padding:2px 10px;border-radius:12px;">📝 PRACTICE</span>'}
                    </h3>
                    <p style="margin:2px 0 0;font-size:12px;color:#94a3b8;">
                        ${escapeHtml(exam.target_program || '')} | Unit: ${escapeHtml(exam.course_name || 'N/A')} | Block: ${escapeHtml(exam.block || '')} | Pass: ${passMark}% | Students: ${students.length}
                    </p>
                </div>
                <button onclick="closeGradeModal()" style="background:none;border:none;font-size:28px;cursor:pointer;color:#6b7280;">&times;</button>
            </div>
            <div class="modal-body" style="padding:16px 24px;">
                <input type="text" id="gradeSearch" placeholder="🔍 Search..." oninput="filterGradeStudents()" style="width:100%;padding:8px 14px;border-radius:8px;border:1px solid #e2e8f0;font-size:13px;margin-bottom:12px;">
                <div style="overflow-x:auto;max-height:50vh;overflow-y:auto;">
                    <table style="width:100%;border-collapse:collapse;font-size:13px;">
                        <thead style="position:sticky;top:0;z-index:5;">
                            <tr style="background:#f8fafc;border-bottom:2px solid #e5e7eb;">${tableHeaders}</tr>
                        </thead>
                        <tbody id="gradeTableBody">${tableRows}</tbody>
                    </table>
                </div>
            </div>
            <div class="modal-footer" style="padding:16px 24px;border-top:1px solid #e5e7eb;display:flex;gap:12px;justify-content:flex-end;">
                <button onclick="saveGrades('${exam.id}')" style="background:#10b981;color:white;border:none;padding:10px 24px;border-radius:8px;cursor:pointer;font-weight:600;">
                    <i class="fas fa-save"></i> Save Grades
                </button>
                <button onclick="closeGradeModal()" style="background:#e5e7eb;color:#475569;border:none;padding:10px 24px;border-radius:8px;cursor:pointer;font-weight:600;">Cancel</button>
            </div>
        </div>
    </div>`;
}

function showGradeModal(html) {
    const old = document.getElementById('gradeModal');
    if (old) old.remove();
    const m = document.createElement('div');
    m.id = 'gradeModal';
    m.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:10000;';
    m.innerHTML = html;
    document.body.appendChild(m);
}

function closeGradeModal() { const m = document.getElementById('gradeModal'); if (m) m.remove(); }

function filterGradeStudents() {
    const search = document.getElementById('gradeSearch')?.value?.toLowerCase() || '';
    document.querySelectorAll('#gradeTableBody tr').forEach(row => {
        const name = row.getAttribute('data-name') || '';
        const email = row.getAttribute('data-email') || '';
        row.style.display = (name.includes(search) || email.includes(search)) ? '' : 'none';
    });
}

function updateGradeTotal(studentId) {
    const cat1 = parseFloat(document.getElementById(`cat1-${studentId}`)?.value) || 0;
    const cat2 = parseFloat(document.getElementById(`cat2-${studentId}`)?.value) || 0;
    const finalExam = parseFloat(document.getElementById(`final-${studentId}`)?.value) || 0;
    const total = ((cat1 + cat2 + finalExam) / 160) * 100;
    const totalInput = document.getElementById(`total-${studentId}`);
    if (totalInput) totalInput.value = total.toFixed(2);
}

async function saveGrades(examId) {
    try {
        const supabase = window.sb || window.supabase;
        if (!supabase) { showFeedback('❌ Supabase not available', 'error'); return; }
        
        const rows = document.querySelectorAll('#gradeTableBody tr');
        const currentUser = await getCurrentUser();
        if (!currentUser) { showFeedback('❌ Login required', 'error'); return; }
        
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
            
            const { data: existing } = await supabase.from('exam_grades').select('id').eq('exam_id', parseInt(examId)).eq('student_id', studentId).maybeSingle();
            
            if (existing) await supabase.from('exam_grades').update(gradeData).eq('id', existing.id);
            else await supabase.from('exam_grades').insert({ ...gradeData, created_at: new Date().toISOString() });
            
            saved++;
        }
        
        showFeedback(`✅ ${saved} grades saved!`, 'success');
        setTimeout(closeGradeModal, 1000);
        
    } catch (error) {
        showFeedback('❌ ' + error.message, 'error');
    }
}

function getExamTypeLabel(examType) {
    const labels = {
        'CAT_1': 'CAT 1',
        'CAT_2': 'CAT 2',
        'CAT': 'CAT',
        'EXAM': 'Final Examination',
        'ASSIGNMENT': 'Assignment',
        'END_TERM': 'End of Term Exam',
        'SUPPLEMENTARY': 'Supplementary Exam',
        'OSCE': 'OSCE',
        'PRACTICAL': 'Practical',
        'QUIZ': 'Quiz'
    };
    return labels[examType] || 'Assessment';
}

// ============================================
// 🔓 PUBLISH EXAM RESULTS
// Auto-syncs to student_marks ONLY for main exams
// ============================================
async function releaseExamResults(examId) {
    try {
        const supabase = window.sb || window.supabase;
        if (!supabase) { showFeedback('❌ Supabase not available', 'error'); return; }
        
        const currentUser = await getCurrentUser();
        if (!currentUser?.user_id) { showFeedback('❌ Login required', 'error'); return; }
        
        const { data: exam, error: examError } = await supabase.from('exams').select('*').eq('id', examId).single();
        if (examError || !exam) throw new Error('Exam not found');
        
        const isMainExam = exam.is_main_exam === true || isMainExamType(exam.exam_type);
        
        const confirmMsg = isMainExam
            ? `Publish results for this MAIN EXAM?\n\n✅ Students will see their grades\n✅ Marks will be added to Marks Entry\n✅ Marks will appear in Academic Reports`
            : `Publish results for this ${exam.exam_type || 'assessment'}?\n\n✅ Students will see their scores\nⓘ Practice assessment — marks will NOT sync to Marks Entry`;
        
        if (!confirm(confirmMsg)) return;
        
        showFeedback('📤 Publishing...', 'info');
        
        const { data: grades, error: gradesError } = await supabase.from('exam_grades').select('*').eq('exam_id', examId);
        if (gradesError) throw gradesError;
        
        if (!grades || grades.length === 0) {
            showFeedback('⚠️ No grades found. Grade the exam first.', 'warning');
            return;
        }
        
        const now = new Date().toISOString();
        
        const { error: releaseError } = await supabase.from('exam_grades').update({
            result_status: 'Released',
            released: true,
            released_at: now,
            released_by: currentUser.user_id,
            published: true,
            published_at: now
        }).eq('exam_id', examId);
        
        if (releaseError) throw releaseError;
        
        await supabase.from('exams').update({
            status: 'Published',
            published_at: now,
            published_by: currentUser.user_id
        }).eq('id', examId);
        
        let syncResult = { synced: 0, errors: 0, total: 0 };
        if (isMainExam) {
            console.log('🎯 MAIN EXAM — syncing to student_marks...');
            syncResult = await syncGradesToMarksEntry(examId, exam, grades);
        } else {
            console.log('📝 Practice — skipping sync');
        }
        
        ExamCache.clear();
        
        let msg = `✅ Published! ${grades.length} grades visible to students.`;
        if (isMainExam) {
            msg += ` 📝 ${syncResult.synced} marks synced to Marks Entry.`;
            if (syncResult.errors > 0) msg += ` ⚠️ ${syncResult.errors} errors.`;
        } else {
            msg += ` ⓘ Practice assessment — no Marks Entry sync.`;
        }
        showFeedback(msg, 'success');
        
        loadExams(true);
        
    } catch (error) {
        console.error('❌ Publish error:', error);
        showFeedback('❌ Failed: ' + error.message, 'error');
    }
}

async function syncGradesToMarksEntry(examId, exam, grades) {
    const supabase = window.sb || window.supabase;
    if (!supabase) throw new Error('Supabase not available');
    
    let synced = 0, errors = 0;
    
    console.log(`🔗 Syncing ${grades.length} grades to student_marks...`);
    
    let unitName = exam.course_name;
    if (!unitName && exam.course_id) {
        const { data: course } = await supabase.from('courses').select('course_name').eq('id', exam.course_id).maybeSingle();
        unitName = course?.course_name || 'Unknown Unit';
    }
    
    const block = exam.block || exam.block_term || 'General';
    const academicYear = exam.intake_year || new Date().getFullYear();
    const isCat = (exam.exam_type || '').toUpperCase().includes('CAT');
    const assessmentType = isCat ? 'cat_only' : 'full';
    
    for (const grade of grades) {
        try {
            const { data: profile, error: profileError } = await supabase
                .from('consolidated_user_profiles_table')
                .select('user_id, student_id, admission_number, full_name')
                .eq('user_id', grade.student_id)
                .maybeSingle();
            
            if (profileError || !profile) { errors++; continue; }
            
            const rawAdmission = profile.admission_number || profile.student_id;
            const isUUID = rawAdmission && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(rawAdmission));
            
            if (isUUID || !rawAdmission) { errors++; continue; }
            
            const realAdmission = rawAdmission;
            const cat1 = parseFloat(grade.cat_1_score) || 0;
            const cat2 = parseFloat(grade.cat_2_score) || 0;
            const examScore = parseFloat(grade.exam_score) || 0;
            
            let total = 0;
            if (assessmentType === 'cat_only') {
                total = Math.round(((cat1 + cat2) / 60) * 100 * 10) / 10;
            } else {
                total = Math.round(((cat1 + cat2) / 60 * 30 + examScore) * 10) / 10;
            }
            total = Math.min(total, 100);
            
            const isTVET = exam.target_program && exam.target_program !== 'KRCHN';
            let gradeLetter;
            if (isTVET) gradeLetter = total >= 80 ? 'A' : total >= 65 ? 'B' : total >= 50 ? 'C' : 'E';
            else gradeLetter = total >= 75 ? 'A' : total >= 65 ? 'B' : total >= 60 ? 'C' : 'D';
            
            const markRecord = {
                admission_number: realAdmission,
                student_id: profile.user_id,
                student_name: profile.full_name || 'Unknown',
                block: block,
                subject_name: unitName,
                assessment_type: assessmentType,
                cat1_score: cat1,
                cat2_score: cat2,
                exam_score: examScore,
                final_score: total,
                grade: gradeLetter,
                academic_year: parseInt(academicYear),
                program: exam.target_program || exam.program_type || 'KRCHN',
                approval_status: 'approved',
                published: true,
                published_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            const { data: existing } = await supabase.from('student_marks')
                .select('id')
                .eq('admission_number', realAdmission)
                .eq('subject_name', unitName)
                .eq('block', block)
                .eq('academic_year', parseInt(academicYear))
                .maybeSingle();
            
            if (existing) {
                const { error: updateError } = await supabase.from('student_marks').update(markRecord).eq('id', existing.id);
                if (updateError) throw updateError;
            } else {
                markRecord.created_at = new Date().toISOString();
                const { error: insertError } = await supabase.from('student_marks').insert(markRecord);
                if (insertError) throw insertError;
            }
            
            synced++;
            console.log(`   ✅ ${profile.full_name} | ${realAdmission} | ${total}% | ${gradeLetter}`);
            
        } catch (err) {
            errors++;
            console.error(`   ❌ Sync failed for ${grade.student_id}:`, err);
        }
    }
    
    console.log(`🔗 Sync complete: ${synced} synced, ${errors} errors`);
    return { synced, errors, total: grades.length };
}

// ============================================
// INIT
// ============================================
function initExams() {
    cacheDomElements();
    
    const dateInput = document.getElementById('exam_date');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
    
    populateProgramDropdowns();
    loadExams();
    loadAvailableClassesForExam();
    
    const programSelect = document.getElementById('exam_program');
    const blockSelect = document.getElementById('exam_block_term');
    
    if (typeof initCreateCourseDropdown === 'function') initCreateCourseDropdown(programSelect?.value || '');
    
    if (DOM.examSearch) DOM.examSearch.addEventListener('input', filterExamsTable);
    if (DOM.programFilter) DOM.programFilter.addEventListener('change', filterExamsTable);
    if (DOM.statusFilter) DOM.statusFilter.addEventListener('change', filterExamsTable);
    if (DOM.monthFilter) DOM.monthFilter.addEventListener('change', filterExamsTable);
    
    if (programSelect) {
        const newPS = programSelect.cloneNode(true);
        programSelect.parentNode.replaceChild(newPS, programSelect);
        document.getElementById('exam_program').addEventListener('change', function() {
            updateBlockTermOptions('exam_program', 'exam_block_term');
            loadAvailableClassesForExam();
            loadStudentsForNotification();
            if (typeof updateCreateCourseDropdown === 'function') updateCreateCourseDropdown();
        });
    }
    
    if (blockSelect) {
        const newBS = blockSelect.cloneNode(true);
        blockSelect.parentNode.replaceChild(newBS, blockSelect);
        document.getElementById('exam_block_term').addEventListener('change', loadStudentsForNotification);
    }
    
    setTimeout(() => {
        if (programSelect?.value) { updateBlockTermOptions('exam_program', 'exam_block_term'); loadAvailableClassesForExam(); }
        loadStudentsForNotification();
    }, 500);
    
    console.log('🚀 Exams/CATS initialized with auto-main-exam detection!');
}

// ============================================
// EXPOSE GLOBALLY
// ============================================
window.filterExamsTable = filterExamsTable;
window.updateCreateCourseDropdown = updateCreateCourseDropdown;
window.initCreateCourseDropdown = initCreateCourseDropdown;
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
window.createCoursesData = createCoursesData;
window.editCoursesData = editCoursesData;
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
window.showFeedback = window.showFeedback || showFeedback;
window.escapeHtml = escapeHtml;
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
window.isMainExamType = isMainExamType;
window.releaseExamResults = releaseExamResults;
window.syncGradesToMarksEntry = syncGradesToMarksEntry;
window.DOM = window.DOM || DOM;

console.log('✅ CATS/Exams loaded — auto main exam detection + publish gating ready!');
