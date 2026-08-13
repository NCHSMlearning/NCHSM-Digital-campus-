/*******************************************************
 * 13. EXAMS/CATS MANAGEMENT - COMPLETE WITH EMAIL NOTIFICATIONS
 * ✅ Edit Exam saving fixed
 * ✅ Course names showing properly
 * ✅ Date format fixed
 * ✅ Pass marks fixed
 * ✅ Status colors fixed
 * ✅ All CRUD operations working
 * ✅ Searchable course dropdowns (Create & Edit)
 * ✅ Grade management with modal
 * ✅ Assigned classes management
 * ✅ Email notifications with student selection
 * ✅ Student count loads on page load
 * ✅ Course search works properly
 * ✅ Specific student selection working
 * ✅ filterExamsTable exposed globally
 * ✅ getSb() replaced with window.sb
 * ✅ PROPER BLOCK FILTERING - Only shows students in selected block
 * ✅ sendEmailWithBrevo function defined
 * ✅ Edge Function email sending
 * ✅ Fallback email support
 *******************************************************/

// ============================================
// CONFIGURATION
// ============================================
const EXAM_CONFIG = {
    CACHE_TTL: 60000,
    BATCH_SIZE: 50,
    DEBOUNCE_DELAY: 300
};

// ============================================
// CACHE SYSTEM
// ============================================
const ExamCache = {
    _cache: {},
    
    get(key) {
        const item = this._cache[key];
        if (!item) return null;
        if (Date.now() - item.timestamp > EXAM_CONFIG.CACHE_TTL) {
            delete this._cache[key];
            return null;
        }
        return item.data;
    },
    
    set(key, data) {
        this._cache[key] = { data, timestamp: Date.now() };
    },
    
    clear() {
        this._cache = {};
    }
};

// ============================================
// DOM CACHE - MUST BE DECLARED FIRST
// ============================================
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

// ============================================
// DEBOUNCE HELPER - GLOBAL
// ============================================
function debounce(fn, delay = 300) {
    let timer;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}
window.debounce = debounce;

// ============================================
// 📧 SEND EMAIL VIA EDGE FUNCTION
// ============================================

async function sendEmailWithBrevo(to, subject, htmlContent) {
    try {
        const supabase = window.sb || window.supabase;
        if (!supabase) {
            console.error('❌ Supabase client not available');
            return { success: false, error: 'Supabase not available' };
        }
        
        // Get session token
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
            console.error('❌ No session:', sessionError);
            // Try with anon key fallback
            return await sendEmailWithEdgeFunctionFallback(to, subject, htmlContent);
        }
        
        console.log(`📧 Sending email via Edge Function to: ${to}`);
        
        const response = await fetch(
            'https://lwhtjozfsmbyihenfunw.supabase.co/functions/v1/send-email',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    to: to,
                    subject: subject,
                    html: htmlContent,
                    from: 'NCHSM Exam Office <noreply@nakurucollegeofhealthelearning.site>'
                })
            }
        );
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            console.log(`✅ Email sent to ${to}`);
            return { success: true, data };
        } else {
            console.error('❌ Email failed:', data.error || 'Unknown error');
            return { success: false, error: data.error || 'Unknown error' };
        }
        
    } catch (error) {
        console.error('❌ Email error:', error);
        // Try fallback
        return await sendEmailWithEdgeFunctionFallback(to, subject, htmlContent);
    }
}

// ============================================
// 📧 FALLBACK: Edge Function with Anon Key
// ============================================

async function sendEmailWithEdgeFunctionFallback(to, subject, htmlContent) {
    try {
        console.log(`📧 Sending email via Edge Function (fallback) to: ${to}`);
        
        const response = await fetch(
            'https://lwhtjozfsmbyihenfunw.supabase.co/functions/v1/send-email',
            {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    to: to,
                    subject: subject,
                    html: htmlContent,
                    from: 'NCHSM Exam Office <noreply@nakurucollegeofhealthelearning.site>'
                })
            }
        );
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            console.log(`✅ Email sent to ${to} (fallback)`);
            return { success: true, data };
        } else {
            console.error('❌ Email failed (fallback):', data);
            return { success: false, error: data.error || 'Unknown error' };
        }
        
    } catch (error) {
        console.error('❌ Email error (fallback):', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// 📧 EXAM NOTIFICATION FUNCTIONS
// ============================================

async function sendExamNotificationEmail(examData, recipients) {
    if (!recipients || recipients.length === 0) {
        console.log('📧 No recipients to notify');
        return { sent: 0, total: 0, failed: 0 };
    }
    
    console.log(`📧 Sending exam notification to ${recipients.length} students...`);
    
    // Prepare email content
    const examDate = examData.exam_date ? new Date(examData.exam_date).toLocaleDateString('en-KE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }) : 'TBD';
    
    const examTime = examData.exam_start_time || 'TBD';
    const examLink = examData.online_link || examData.exam_link || '#';
    const examTitle = examData.title || examData.exam_name || 'New Exam';
    const examType = examData.exam_type || 'EXAM';
    const examTypeLabel = getExamTypeLabel(examType);
    
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Exam Posted</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, sans-serif; margin: 0; padding: 0; background: #f0f4f8; }
        .container { max-width: 580px; margin: 0 auto; padding: 20px; }
        .card { background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #0A3D62, #1a5276); padding: 30px 35px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 24px; }
        .header p { margin: 4px 0 0; opacity: 0.8; }
        .body { padding: 30px 35px; }
        .greeting { background: #e8f4f8; border-radius: 12px; padding: 16px; margin-bottom: 20px; border-left: 4px solid #10b981; }
        .greeting p { margin: 0; font-size: 16px; color: #0A3D62; }
        .details { background: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 20px; }
        .details h4 { margin: 0 0 12px 0; color: #1e293b; }
        .details table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .details td { padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
        .details .label { color: #64748B; font-weight: 500; }
        .details .value { color: #0A3D62; font-weight: 600; text-align: right; }
        .details tr:last-child td { border-bottom: none; }
        .btn { display: inline-block; background: #0A3D62; color: white; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 16px; }
        .footer { background: #F8FAFC; padding: 20px; text-align: center; border-top: 1px solid #E2E8F0; font-size: 0.85rem; color: #64748B; }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="header">
                <h1>📝 ${examTypeLabel} Posted!</h1>
                <p>Nakuru College of Health Sciences and Management</p>
            </div>
            
            <div class="body">
                <div class="greeting">
                    <p>👋 <strong>Dear Student,</strong></p>
                    <p style="margin: 8px 0 0; color: #1e293b;">
                        A new exam has been posted for your program. Please review the details below.
                    </p>
                </div>
                
                <div class="details">
                    <h4>📋 Exam Details</h4>
                    <table>
                        <tr><td class="label">📝 Exam Title</td><td class="value"><strong>${escapeHtml(examTitle)}</strong></td></tr>
                        <tr><td class="label">🎓 Program</td><td class="value">${escapeHtml(examData.target_program || examData.program_type || 'N/A')}</td></tr>
                        <tr><td class="label">📚 Block/Term</td><td class="value">${escapeHtml(examData.block || 'N/A')}</td></tr>
                        <tr><td class="label">📅 Date</td><td class="value">${examDate}</td></tr>
                        <tr><td class="label">⏰ Time</td><td class="value">${examTime}</td></tr>
                        <tr><td class="label">⏱️ Duration</td><td class="value">${examData.duration_minutes || 'N/A'} minutes</td></tr>
                        <tr><td class="label">📊 Total Marks</td><td class="value">${examData.marks_out_of || examData.total_marks || 100}</td></tr>
                        <tr><td class="label">✅ Pass Mark</td><td class="value">${examData.pass_mark || 50}%</td></tr>
                        ${examLink && examLink !== '#' ? `<tr><td class="label">🔗 Exam Link</td><td class="value"><a href="${escapeHtml(examLink)}" target="_blank">Click Here</a></td></tr>` : ''}
                    </table>
                </div>
                
                ${examLink && examLink !== '#' ? `
                <div style="text-align: center; margin: 20px 0;">
                    <a href="${escapeHtml(examLink)}" target="_blank" class="btn">🚪 Take Exam</a>
                </div>` : ''}
                
                <div style="background: #fef3c7; border-radius: 12px; padding: 12px 16px; border-left: 4px solid #f59e0b; margin-top: 16px;">
                    <p style="margin: 0; font-size: 13px; color: #78350F;">
                        <i class="fas fa-info-circle"></i> 
                        <strong>Important:</strong> Please ensure you have a stable internet connection before starting the exam.
                    </p>
                </div>
            </div>
            
            <div class="footer">
                <p>📞 +254 790 969 743 &nbsp;|&nbsp; 📧 admin@nchsm.co.ke</p>
                <p style="font-size:0.75rem;">© ${new Date().getFullYear()} Nakuru College of Health Sciences and Management</p>
            </div>
        </div>
    </div>
</body>
</html>`;
    
    // Send emails
    let sentCount = 0;
    let failedCount = 0;
    
    for (const student of recipients) {
        if (!student.email) {
            failedCount++;
            continue;
        }
        
        try {
            const result = await sendEmailWithBrevo(
                student.email,
                `📝 ${examTypeLabel}: ${examTitle}`,
                emailHtml
            );
            
            if (result.success) {
                sentCount++;
            } else {
                failedCount++;
                console.error(`Failed to send to ${student.email}:`, result.error);
            }
            
            // Small delay to avoid rate limiting
            await new Promise(r => setTimeout(r, 200));
            
        } catch (error) {
            console.error(`Failed to send to ${student.email}:`, error);
            failedCount++;
        }
    }
    
    console.log(`✅ Exam notifications sent: ${sentCount} sent, ${failedCount} failed`);
    
    // Save notification record
    try {
        const supabase = window.sb || window.supabase;
        if (supabase) {
            await supabase.from('exam_notifications').insert([{
                exam_id: examData.id,
                recipients: recipients.length,
                sent_count: sentCount,
                failed_count: failedCount,
                sent_at: new Date().toISOString()
            }]);
        }
    } catch (error) {
        console.warn('Could not save notification record:', error);
    }
    
    return { sent: sentCount, failed: failedCount, total: recipients.length };
}

// ============================================
// 📧 STUDENT SELECTION FOR EMAIL NOTIFICATIONS
// ============================================

let selectedStudentsForNotification = [];
let allStudentsForProgram = [];

// Toggle student selection visibility
document.addEventListener('DOMContentLoaded', function() {
    const notifyTarget = document.getElementById('exam_notify_target');
    if (notifyTarget) {
        notifyTarget.addEventListener('change', function() {
            const container = document.getElementById('specific_students_container');
            if (this.value === 'specific') {
                container.style.display = 'block';
            } else {
                container.style.display = 'none';
            }
        });
    }
    
    // Load students when program or block changes
    const programSelect = document.getElementById('exam_program');
    const blockSelect = document.getElementById('exam_block_term');
    
    if (programSelect) {
        programSelect.addEventListener('change', loadStudentsForNotification);
    }
    if (blockSelect) {
        blockSelect.addEventListener('change', loadStudentsForNotification);
    }
    
    // ✅ Load students on page load after a delay
    setTimeout(function() {
        const program = programSelect?.value;
        if (program) {
            loadStudentsForNotification();
        }
    }, 1000);
});

// ============================================
// 🔥 LOAD STUDENTS FOR NOTIFICATION - WITH BLOCK FILTER
// ============================================

async function loadStudentsForNotification() {
    const program = document.getElementById('exam_program')?.value;
    const block = document.getElementById('exam_block_term')?.value;
    
    // ✅ Debug logging
    console.log('📋 Loading students for:', { program, block });
    
    if (!program) {
        allStudentsForProgram = [];
        const countEl = document.getElementById('student_notify_count');
        if (countEl) countEl.textContent = '0 students';
        return;
    }
    
    try {
        const supabase = window.sb || window.supabase;
        if (!supabase) return;
        
        let query = supabase
            .from('consolidated_user_profiles_table')
            .select('user_id, full_name, email, program, block')
            .eq('role', 'student')
            .eq('status', 'approved')
            .eq('program', program);
        
        // ✅ FIX: Only filter by block if a specific block is selected
        if (block && block !== '' && block !== '-- Select --' && block !== '-- Select Block/Term --') {
            query = query.eq('block', block);
            console.log(`📋 Filtering by block: ${block}`);
        } else {
            console.log('📋 No block filter applied - showing all students in program');
        }
        
        const { data, error } = await query.limit(500);
        
        if (error) throw error;
        
        allStudentsForProgram = data || [];
        console.log(`✅ Loaded ${allStudentsForProgram.length} students for notification`);
        
        // Show sample students
        if (allStudentsForProgram.length > 0) {
            console.log('📋 Sample students:', allStudentsForProgram.slice(0, 3).map(s => s.full_name));
        }
        
        // Update count
        const countEl = document.getElementById('student_notify_count');
        if (countEl) {
            countEl.textContent = `${allStudentsForProgram.length} students`;
        }
        
        // Update selected students display
        updateSelectedStudentsDisplay();
        
    } catch (error) {
        console.error('Error loading students:', error);
        allStudentsForProgram = [];
        const countEl = document.getElementById('student_notify_count');
        if (countEl) countEl.textContent = '0 students';
    }
}

// ============================================
// SEARCH STUDENTS FOR NOTIFICATION
// ============================================

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
        resultsContainer.innerHTML = '<div style="padding: 8px; color: #94a3b8; text-align: center;">No students found</div>';
        resultsContainer.style.display = 'block';
        return;
    }
    
    let html = '';
    filtered.slice(0, 20).forEach(student => {
        const isSelected = selectedStudentsForNotification.some(s => s.user_id === student.user_id);
        html += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; border-bottom: 1px solid #f1f5f9; ${isSelected ? 'background: #dbeafe;' : ''}">
                <div>
                    <strong style="font-size: 13px;">${escapeHtml(student.full_name)}</strong>
                    <span style="font-size: 11px; color: #6b7280; margin-left: 8px;">${escapeHtml(student.email)}</span>
                </div>
                <button onclick="toggleStudentForNotification('${student.user_id}')" 
                        style="padding: 2px 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; background: ${isSelected ? '#dc2626' : '#059669'}; color: white;">
                    ${isSelected ? 'Remove' : 'Add'}
                </button>
            </div>
        `;
    });
    
    if (filtered.length > 20) {
        html += `<div style="padding: 6px; text-align: center; color: #94a3b8; font-size: 12px;">+ ${filtered.length - 20} more students</div>`;
    }
    
    resultsContainer.innerHTML = html;
    resultsContainer.style.display = 'block';
}

// ============================================
// TOGGLE STUDENT FOR NOTIFICATION
// ============================================

function toggleStudentForNotification(studentId) {
    const student = allStudentsForProgram.find(s => s.user_id === studentId);
    if (!student) return;
    
    const index = selectedStudentsForNotification.findIndex(s => s.user_id === studentId);
    
    if (index > -1) {
        selectedStudentsForNotification.splice(index, 1);
    } else {
        selectedStudentsForNotification.push(student);
    }
    
    updateSelectedStudentsDisplay();
    searchStudentsForNotification();
}

// ============================================
// UPDATE SELECTED STUDENTS DISPLAY
// ============================================

function updateSelectedStudentsDisplay() {
    const container = document.getElementById('selected_students_list');
    if (!container) return;
    
    if (!selectedStudentsForNotification || selectedStudentsForNotification.length === 0) {
        container.innerHTML = '<span style="font-size: 12px; color: #94a3b8;"><i class="fas fa-info-circle"></i> No students selected</span>';
        return;
    }
    
    let html = '';
    selectedStudentsForNotification.forEach(student => {
        html += `
            <span style="background: #dbeafe; color: #1e40af; padding: 2px 10px; border-radius: 16px; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;">
                ${escapeHtml(student.full_name)}
                <span onclick="toggleStudentForNotification('${student.user_id}')" style="cursor: pointer; color: #dc2626; font-weight: 700; margin-left: 4px;">&times;</span>
            </span>
        `;
    });
    
    container.innerHTML = html;
}

// ============================================
// GET NOTIFICATION RECIPIENTS - WITH BLOCK FILTER
// ============================================

function getNotificationRecipients() {
    const target = document.getElementById('exam_notify_target')?.value || 'all';
    const program = document.getElementById('exam_program')?.value;
    const block = document.getElementById('exam_block_term')?.value;
    
    let recipients = [];
    
    // ✅ Always filter by the selected block
    switch(target) {
        case 'all':
            // All students in program + block
            recipients = allStudentsForProgram.filter(s => {
                if (block && block !== '' && block !== '-- Select --') {
                    return s.block === block;
                }
                return true;
            });
            break;
        case 'program':
            // All students in program (regardless of block)
            recipients = allStudentsForProgram;
            break;
        case 'block':
            // All students in specific block
            recipients = allStudentsForProgram.filter(s => {
                if (block && block !== '' && block !== '-- Select --') {
                    return s.block === block;
                }
                return true;
            });
            break;
        case 'specific':
            recipients = selectedStudentsForNotification;
            break;
        default:
            recipients = allStudentsForProgram.filter(s => {
                if (block && block !== '' && block !== '-- Select --') {
                    return s.block === block;
                }
                return true;
            });
    }
    
    console.log(`📧 Recipients: ${recipients.length} students (target: ${target}, block: ${block})`);
    return recipients;
}

// ============================================
// LOAD EXAMS - FIXED (Properly attaches course data)
// ============================================
async function loadExams(forceRefresh = false) {
    console.log('📝 Loading exams...');
    
    // ✅ Call cacheDomElements FIRST to initialize DOM
    cacheDomElements();
    
    if (!DOM.examsTbody) {
        console.warn('⚠️ exams-table-body not found in DOM');
        return;
    }
    
    // Check cache
    if (!forceRefresh) {
        const cached = ExamCache.get('exams_list');
        if (cached) {
            renderExamsTable(cached);
            renderStudentExams(cached);
            updateExamStats(cached);
            return;
        }
    }
    
    DOM.examsTbody.innerHTML = `
        <tr>
            <td colspan="12" style="padding: 40px; text-align: center; color: #94a3b8;">
                <div class="loading-spinner" style="margin: 0 auto 12px;"></div>
                <p style="margin-top: 10px; font-size: 13px;">Loading exams...</p>
            </td>
        </tr>
    `;

    try {
        const supabase = window.sb || window.supabase;
        if (!supabase) throw new Error('Supabase client not available');
        
        const { data: exams, error } = await supabase
            .from('exams')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200);

        if (error) throw error;
        
        console.log(`✅ Loaded ${exams?.length || 0} exams`);
        
        const { data: allCourses, error: coursesError } = await supabase
            .from('courses')
            .select('id, course_name, name, unit_code, target_program');
        
        if (coursesError) {
            console.error('Error fetching courses:', coursesError);
        } else {
            const courseMap = {};
            allCourses?.forEach(c => { courseMap[c.id] = c; });
            window._courseMap = courseMap;
            
            let attachedCount = 0;
            exams.forEach(exam => {
                if (exam.course_id && courseMap[exam.course_id]) {
                    exam.course = courseMap[exam.course_id];
                    attachedCount++;
                }
            });
            
            console.log(`✅ Loaded ${allCourses?.length || 0} courses`);
            console.log(`✅ Attached course data to ${attachedCount} exams`);
        }

        ExamCache.set('exams_list', exams || []);
        
        renderExamsTable(exams || []);
        renderStudentExams(exams || []);
        updateExamStats(exams || []);
        
    } catch (error) {
        console.error('Error loading exams:', error);
        DOM.examsTbody.innerHTML = `
            <tr>
                <td colspan="12" style="padding: 30px; text-align: center; color: #dc2626; font-size: 13px;">
                    <i class="fas fa-exclamation-circle"></i> Failed to load exams: ${error.message}
                    <br>
                    <button onclick="loadExams(true)" style="margin-top: 10px; padding: 6px 16px; background: #7c3aed; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-sync-alt"></i> Retry
                    </button>
                </td>
            </tr>
        `;
    }
}

// ============================================
// UPDATE EXAM STATS
// ============================================
function updateExamStats(exams) {
    if (!exams) exams = [];
    
    const total = exams.length;
    const published = exams.filter(e => e.status === 'published' || e.status === 'Published').length;
    const inProgress = exams.filter(e => e.status === 'InProgress' || e.status === 'In Progress').length;
    const draft = exams.filter(e => e.status === 'Draft' || e.status === 'draft' || !e.status).length;
    
    const statValues = document.querySelectorAll('.exam-stat-value');
    if (statValues && statValues.length >= 4) {
        statValues[0].textContent = total;
        statValues[1].textContent = published;
        statValues[2].textContent = inProgress;
        statValues[3].textContent = draft;
    }
    
    console.log(`📊 Exam Stats: Total=${total}, Published=${published}, InProgress=${inProgress}, Draft=${draft}`);
}

// ============================================
// GET STATUS BADGE
// ============================================
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
        'closed': { bg: '#fee2e2', color: '#991b1b', icon: '🔒', label: 'Closed' },
        'Approved': { bg: '#d1fae5', color: '#065f46', icon: '✅', label: 'Approved' },
        'approved': { bg: '#d1fae5', color: '#065f46', icon: '✅', label: 'Approved' },
        'Pending': { bg: '#fef3c7', color: '#92400e', icon: '⏳', label: 'Pending' },
        'pending': { bg: '#fef3c7', color: '#92400e', icon: '⏳', label: 'Pending' },
        'Rejected': { bg: '#fee2e2', color: '#991b1b', icon: '❌', label: 'Rejected' },
        'rejected': { bg: '#fee2e2', color: '#991b1b', icon: '❌', label: 'Rejected' }
    };
    
    const s = statusMap[status] || statusMap['Draft'];
    return `<span style="display: inline-flex; align-items: center; gap: 4px; background: ${s.bg}; color: ${s.color}; padding: 2px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; border: 1px solid ${s.color}33;">
        ${s.icon} ${s.label}
    </span>`;
}

// ============================================
// RENDER EXAMS TABLE - FULLY FIXED
// ============================================
function renderExamsTable(exams) {
    if (!DOM.examsTbody) return;
    
    if (!exams || exams.length === 0) {
        DOM.examsTbody.innerHTML = `
            <tr>
                <td colspan="12" style="padding: 40px; text-align: center; color: #94a3b8;">
                    <i class="fas fa-info-circle" style="font-size: 24px; display: block; margin-bottom: 8px;"></i>
                    No exams found. Create your first exam!
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    
    for (const e of exams) {
        let courseName = 'N/A';
        if (e.course?.course_name) {
            courseName = e.course.course_name;
        } else if (e.course?.name) {
            courseName = e.course.name;
        } else if (e.course?.unit_code) {
            courseName = e.course.unit_code;
        } else if (e.course_name) {
            courseName = e.course_name;
        } else if (e.unit_name) {
            courseName = e.unit_name;
        } else if (e.subject_name) {
            courseName = e.subject_name;
        } else if (e.course_id && window._courseMap && window._courseMap[e.course_id]) {
            const c = window._courseMap[e.course_id];
            courseName = c.course_name || c.name || c.unit_code || 'Unknown Course';
        } else if (e.course_id) {
            courseName = `Course ID: ${String(e.course_id).substring(0, 8)}...`;
        }
        
        const title = e.title || e.exam_name || 'Untitled';
        const type = e.exam_type || 'N/A';
        const programDisplay = e.target_program || e.program_type || 'N/A';
        const marksOutOf = e.marks_out_of || e.total_marks || 100;
        const passMark = e.pass_mark || 50;
        
        let formattedDate = 'N/A';
        let formattedTime = 'N/A';
        const examDate = e.exam_date || e.created_at;
        
        if (examDate) {
            try {
                const d = new Date(examDate);
                if (!isNaN(d.getTime())) {
                    formattedDate = d.toLocaleDateString('en-KE', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                }
            } catch (err) {
                formattedDate = examDate || 'N/A';
            }
        }
        
        if (e.exam_start_time) {
            try {
                const timeStr = e.exam_start_time;
                if (timeStr && timeStr.includes(':')) {
                    const parts = timeStr.split(':');
                    formattedTime = parts[0] + ':' + parts[1];
                }
            } catch (err) {
                formattedTime = e.exam_start_time || 'N/A';
            }
        }
        
        const intakeDisplay = e.intake_year ? `${e.intake_year}${e.intake_month ? ' ' + e.intake_month : ''}` : 'N/A';
        const blockDisplay = e.block || e.block_term || 'N/A';
        const duration = e.duration_minutes || 'N/A';
        const durationDisplay = duration !== 'N/A' ? duration + 'm' : 'N/A';
        const status = e.status || 'draft';
        const link = e.online_link || e.exam_link;
        
        html += `
            <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.15s;" 
                onmouseover="this.style.background='#f8fafc'" 
                onmouseout="this.style.background='transparent'"
                data-program="${escapeHtml(programDisplay)}"
                data-status="${escapeHtml(status)}"
                data-month="${escapeHtml(e.intake_month || '')}">
                
                <td style="padding: 8px 10px; font-size: 12px; text-align: center;">
                    <span style="display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: 600; background: ${type === 'EXAM' ? '#dbeafe' : '#fef3c7'}; color: ${type === 'EXAM' ? '#1e40af' : '#92400e'};">
                        ${escapeHtml(type)}
                    </span>
                </td>
                <td style="padding: 8px 10px; font-size: 12px;">${escapeHtml(programDisplay)}</td>
                <td style="padding: 8px 10px; font-size: 12px;">${escapeHtml(courseName)}</td>
                <td style="padding: 8px 10px; font-weight: 500; font-size: 13px;">${escapeHtml(title)}</td>
                <td style="padding: 8px 10px; text-align: center; font-weight: 600;">${marksOutOf}</td>
                <td style="padding: 8px 10px; text-align: center; font-weight: 600; color: ${parseInt(passMark) >= 50 ? '#059669' : '#dc2626'};">${passMark}%</td>
                <td style="padding: 8px 10px; font-size: 12px;">
                    <div>${formattedDate}</div>
                    <div style="font-size: 10px; color: #94a3b8;">${formattedTime}</div>
                </td>
                <td style="padding: 8px 10px; text-align: center; font-size: 12px;">${durationDisplay}</td>
                <td style="padding: 8px 10px; font-size: 12px; text-align: center;">${escapeHtml(intakeDisplay)}</td>
                <td style="padding: 8px 10px; font-size: 12px; text-align: center;">${escapeHtml(blockDisplay)}</td>
                <td style="padding: 8px 10px; text-align: center;">${getStatusBadge(status)}</td>
                <td style="padding: 8px 10px; text-align: center; white-space: nowrap;">
                    <button onclick="openEditExamModal('${e.id}')" class="btn-sm" style="padding: 4px 10px; font-size: 11px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="openGradeModal('${e.id}')" class="btn-sm" style="padding: 4px 10px; font-size: 11px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer;" title="Grade">
                        <i class="fas fa-check-double"></i>
                    </button>
                    ${status !== 'Completed' && status !== 'Closed' && status !== 'completed' ? `
                    <button onclick="closeExam('${e.id}')" class="btn-sm" style="padding: 4px 10px; font-size: 11px; background: #f59e0b; color: white; border: none; border-radius: 4px; cursor: pointer;" title="Close">
                        <i class="fas fa-lock"></i>
                    </button>` : ''}
                    <button onclick="deleteExam('${e.id}', '${escapeHtml(title)}')" class="btn-sm" style="padding: 4px 10px; font-size: 11px; background: #dc2626; color: white; border: none; border-radius: 4px; cursor: pointer;" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                    ${link ? `<a href="${escapeHtml(link)}" target="_blank" class="btn-sm" style="padding: 4px 10px; font-size: 11px; background: #059669; color: white; border: none; border-radius: 4px; text-decoration: none; display: inline-block;" title="Open Link">
                        <i class="fas fa-external-link-alt"></i>
                    </a>` : ''}
                </td>
            </tr>
        `;
    }
    
    DOM.examsTbody.innerHTML = html;
    console.log(`✅ Rendered ${exams.length} exams`);
}

// ============================================
// RENDER STUDENT EXAMS
// ============================================
function renderStudentExams(exams) {
    if (!DOM.studentExams) return;
    
    const published = exams.filter(e => 
        e.status === 'Published' || e.status === 'published' || 
        e.status === 'Upcoming' || e.status === 'InProgress'
    );
    
    if (published.length === 0) {
        DOM.studentExams.innerHTML = `
            <p style="color: #94a3b8; padding: 20px; text-align: center; font-size: 14px;">
                <i class="fas fa-info-circle"></i> No published assessments available.
            </p>
        `;
        return;
    }
    
    let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px;">';
    
    const displayExams = published.slice(0, 6);
    for (const exam of displayExams) {
        const dateStr = exam.exam_date ? new Date(exam.exam_date).toLocaleDateString() : '';
        const statusClass = exam.status === 'Upcoming' ? 'upcoming' : 
                           exam.status === 'InProgress' ? 'in-progress' : 'completed';
        const borderColor = statusClass === 'upcoming' ? '#f59e0b' : 
                           statusClass === 'in-progress' ? '#3b82f6' : '#10b981';
        const link = exam.online_link || exam.exam_link;
        const courseName = exam.course?.course_name || exam.course_name || exam.subject_name || 'N/A';
        
        html += `
            <div style="background: white; border-radius: 12px; padding: 14px 16px; border-left: 4px solid ${borderColor}; border: 1px solid #f1f5f9;">
                <h4 style="margin: 0 0 6px 0; font-size: 14px; font-weight: 700; color: #0f172a;">${escapeHtml(exam.title)}</h4>
                <div style="font-size: 12px; color: #94a3b8; margin-bottom: 6px;">${escapeHtml(courseName)}</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2px 14px; font-size: 12px; color: #475569;">
                    <span><strong>Type:</strong> ${escapeHtml(exam.exam_type)}</span>
                    <span><strong>Duration:</strong> ${exam.duration_minutes || 'N/A'}m</span>
                    <span><strong>Date:</strong> ${dateStr}</span>
                    <span><strong>Marks:</strong> ${exam.marks_out_of || exam.total_marks || 100}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; flex-wrap: wrap; gap: 6px;">
                    <span style="font-size: 11px; font-weight: 500; color: ${borderColor};">
                        ${exam.status}
                    </span>
                    ${link ? `<a href="${escapeHtml(link)}" target="_blank" style="background: linear-gradient(135deg, #7c3aed, #6d28d9); color: white; padding: 4px 16px; border-radius: 20px; text-decoration: none; font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                        <i class="fas fa-external-link-alt" style="font-size: 10px;"></i> Take Exam
                    </a>` : ''}
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    DOM.studentExams.innerHTML = html;
}

// ============================================
// GET PROGRAM OPTIONS
// ============================================
function getProgramOptions() {
    const groups = [
        { label: '🎓 KRCHN Nursing', programs: ['KRCHN - Kenya Registered Community Health Nursing'] },
        { label: '🎯 TVET Diploma', programs: [
            'DPOTT - Diploma in Perioperative Theatre Technology',
            'DCH - Diploma in Community Health',
            'DHRIT - Diploma in Health Records and IT',
            'DSL - Diploma in Science Lab',
            'DSW - Diploma in Social Work',
            'DCJS - Diploma in Criminal Justice',
            'DHSS - Diploma in Health Support Services',
            'DICT - Diploma in ICT',
            'DME - Diploma in Medical Engineering'
        ]},
        { label: '📜 TVET Certificate', programs: [
            'CPOTT - Certificate in Perioperative Theatre Technology',
            'CCH - Certificate in Community Health',
            'CHRIT - Certificate in Health Records and IT',
            'CPC - Certificate in Patient Care',
            'CSL - Certificate in Science Lab',
            'CSW - Certificate in Social Work',
            'CCJS - Certificate in Criminal Justice',
            'CAG - Certificate in Agriculture',
            'CHSS - Certificate in Health Support Services',
            'CICT - Certificate in ICT'
        ]},
        { label: '🔧 Artisan', programs: [
            'ACH - Artisan in Community Health',
            'AAG - Artisan in Agriculture',
            'ASW - Artisan in Social Work'
        ]},
        { label: '📊 Other', programs: [
            'CCA - Certificate in Computer Applications',
            'PTE - TVET/CDACC (PTE)'
        ]}
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

// ============================================
// POPULATE PROGRAM DROPDOWNS
// ============================================
function populateProgramDropdowns() {
    const examProgram = document.getElementById('exam_program');
    const editExamProgram = document.getElementById('edit_exam_program');
    
    const options = getProgramOptions();
    if (examProgram) {
        examProgram.innerHTML = '<option value="">-- Select Program --</option>' + options;
    }
    if (editExamProgram) {
        if (!editExamProgram.querySelector('option[value=""]')) {
            editExamProgram.innerHTML = '<option value="">-- Select Program --</option>' + options;
        }
    }
}

// ============================================
// LOAD CLASSES FOR EXAM - WITH TVET SUPPORT
// ============================================
async function loadAvailableClassesForExam() {
    if (!DOM.classSelector) return;
    
    // Get current program from the exam form
    const programSelect = document.getElementById('exam_program');
    const program = programSelect?.value || 'KRCHN';
    const isTVET = isTVETProgram(program);
    const programLevel = getProgramLevel(program);
    const isDiploma = programLevel === 'DIPLOMA';
    const isCertificate = programLevel === 'CERTIFICATE';
    
    // Build options based on program type
    let options = [];
    let blockLabel = 'Block';
    
    if (isTVET) {
        blockLabel = 'Term';
        if (isDiploma) {
            // Diploma TVET: Year 1 Term 1 to Year 2 Term 3
            options = [
                { value: 'Y1T1', label: 'Year 1 Term 1' },
                { value: 'Y1T2', label: 'Year 1 Term 2' },
                { value: 'Y1T3', label: 'Year 1 Term 3' },
                { value: 'Y2T1', label: 'Year 2 Term 1' },
                { value: 'Y2T2', label: 'Year 2 Term 2' },
                { value: 'Y2T3', label: 'Year 2 Term 3' }
            ];
        } else if (isCertificate) {
            // Certificate TVET: Year 1 Term 1 to Term 3
            options = [
                { value: 'Y1T1', label: 'Year 1 Term 1' },
                { value: 'Y1T2', label: 'Year 1 Term 2' },
                { value: 'Y1T3', label: 'Year 1 Term 3' }
            ];
        } else {
            // Other TVET
            options = [
                { value: 'Introductory', label: 'Introductory Term' },
                { value: 'Term1', label: 'Term 1' },
                { value: 'Term2', label: 'Term 2' },
                { value: 'Term3', label: 'Term 3' },
                { value: 'Term4', label: 'Term 4' },
                { value: 'Term5', label: 'Term 5' },
                { value: 'Term6', label: 'Term 6' },
                { value: 'Final', label: 'Final Term' }
            ];
        }
    } else {
        // KRCHN Blocks
        options = [
            { value: 'Introductory', label: 'Introductory Block' },
            { value: 'Block 1', label: 'Block 1' },
            { value: 'Block 2', label: 'Block 2' },
            { value: 'Block 3', label: 'Block 3' },
            { value: 'Block 4', label: 'Block 4' },
            { value: 'Block 5', label: 'Block 5' },
            { value: 'Block 6', label: 'Block 6' },
            { value: 'Final', label: 'Final Block' }
        ];
    }
    
    DOM.classSelector.innerHTML = `
        <p style="color:#6b7280;font-size:12px;margin:0 0 8px 0;grid-column:1/-1;">
            <i class="fas fa-info-circle"></i> Select ${blockLabel}s:
        </p>
        <div style="display:flex;flex-wrap:wrap;gap:8px;grid-column:1/-1;">
            ${options.map(opt => `
                <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;">
                    <input type="checkbox" class="exam-class-checkbox" value="${opt.value}">
                    <span>${opt.label}</span>
                </label>
            `).join('')}
        </div>
        <div style="display:flex;gap:6px;grid-column:1/-1;margin-top:4px;">
            <input type="text" id="customBlocksInput" placeholder="Custom ${blockLabel}s (comma)" 
                   style="flex:1;padding:6px 12px;border-radius:6px;border:1px solid #ddd;font-size:12px;">
            <button onclick="addCustomBlocks()" style="padding:6px 14px;background:#7c3aed;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:12px;">
                Add
            </button>
        </div>
    `;
}

function addCustomBlocks() {
    const input = document.getElementById('customBlocksInput');
    if (!input?.value.trim()) return;
    
    const blocks = input.value.split(',').map(b => b.trim()).filter(Boolean);
    const container = DOM.classSelector;
    const div = container.querySelector('div:first-child') || container;
    
    blocks.forEach(block => {
        const label = document.createElement('label');
        label.style.cssText = 'display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;';
        label.innerHTML = `
            <input type="checkbox" class="exam-class-checkbox" value="${escapeHtml(block)}">
            <span>${escapeHtml(block)}</span>
        `;
        div.appendChild(label);
    });
    input.value = '';
}

function getSelectedClasses() {
    const selected = [];
    document.querySelectorAll('.exam-class-checkbox:checked').forEach(cb => {
        selected.push(cb.value);
    });
    return selected;
}

// ============================================
// CREATE EXAM WITH EMAIL NOTIFICATION - WITH BLOCK FILTERING
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
        course: document.getElementById('exam_course_id')?.value || null,
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
    
    // ✅ Get notification settings
    const notifyStudents = document.getElementById('exam_notify_students')?.checked || false;
    const notifyTarget = document.getElementById('exam_notify_target')?.value || 'all';
    
    // Get recipients for notification - WITH BLOCK FILTER
    let recipients = [];
    if (notifyStudents) {
        const program = fields.program;
        const block = fields.block;
        
        if (notifyTarget === 'specific') {
            recipients = selectedStudentsForNotification;
        } else {
            // Load students based on selection
            const supabase = window.sb || window.supabase;
            if (supabase) {
                let query = supabase
                    .from('consolidated_user_profiles_table')
                    .select('user_id, full_name, email, program, block')
                    .eq('role', 'student')
                    .eq('status', 'approved')
                    .eq('program', program);
                
                // ✅ FIX: ALWAYS filter by block for 'all' and 'block' targets
                if (notifyTarget === 'all' || notifyTarget === 'block') {
                    if (block && block !== '' && block !== '-- Select --' && block !== '-- Select Block/Term --') {
                        query = query.eq('block', block);
                        console.log(`📋 Loading students for block: ${block}`);
                    }
                }
                // 'program' target = all students in program (no block filter)
                
                const { data } = await query.limit(500);
                recipients = data || [];
                console.log(`📧 Found ${recipients.length} students for notification`);
            }
        }
    }

    try {
        const supabase = window.sb || window.supabase;
        if (!supabase) {
            throw new Error('Supabase client not available');
        }
        
        const examData = {
            title: fields.title,
            exam_name: fields.title,
            exam_type: fields.type,
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
        
        const examId = data?.[0]?.id;
        examData.id = examId;

        // ✅ Send email notifications
        let emailResult = { sent: 0, total: 0 };
        if (notifyStudents && recipients.length > 0) {
            emailResult = await sendExamNotificationEmail(examData, recipients);
        }

        // Show feedback with notification status
        let feedbackMsg = `✅ "${fields.title}" created successfully!`;
        if (notifyStudents) {
            if (recipients.length > 0) {
                feedbackMsg += ` 📧 ${emailResult.sent} email notifications sent to ${recipients.length} students.`;
                if (emailResult.failed > 0) {
                    feedbackMsg += ` ⚠️ ${emailResult.failed} failed.`;
                }
            } else {
                feedbackMsg += ` ⚠️ No students found to notify.`;
            }
        }
        showFeedback(feedbackMsg, 'success');
        
        if (e.target) e.target.reset();
        
        // Reset selected students
        selectedStudentsForNotification = [];
        updateSelectedStudentsDisplay();
        document.getElementById('exam_notify_students').checked = true;
        
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
// OPEN EDIT EXAM MODAL - COMPLETE FIX
// ============================================
async function openEditExamModal(id) {
    console.log('📝 Opening edit modal for exam:', id);
    
    try {
        const supabase = window.sb || window.supabase;
        if (!supabase) {
            throw new Error('Supabase client not available');
        }
        
        const { data: exam, error } = await supabase
            .from('exams')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        
        console.log('✅ Exam loaded:', exam.title);
        console.log('📋 Exam data:', exam);
        
        const modal = document.getElementById('examEditModal');
        if (!modal) {
            console.error('❌ examEditModal not found');
            showFeedback('Edit modal not found', 'error');
            return;
        }
        
        // Populate all fields
        const idEl = document.getElementById('edit_exam_id');
        if (idEl) idEl.value = exam.id;
        
        const titleEl = document.getElementById('edit_exam_title');
        if (titleEl) titleEl.value = exam.title || exam.exam_name || '';
        
        const typeEl = document.getElementById('edit_exam_type');
        if (typeEl) typeEl.value = exam.exam_type || 'CAT';
        
        const statusEl = document.getElementById('edit_exam_status');
        if (statusEl) statusEl.value = exam.status || 'Upcoming';
        
        const basisEl = document.getElementById('edit_exam_basis');
        if (basisEl) basisEl.value = exam.exam_basis || 'ordinary';
        
        const dateEl = document.getElementById('edit_exam_date');
        if (dateEl && exam.exam_date) {
            const d = new Date(exam.exam_date);
            if (!isNaN(d.getTime())) {
                dateEl.value = d.toISOString().split('T')[0];
            }
        }
        
        const startTimeEl = document.getElementById('edit_exam_start_time');
        if (startTimeEl && exam.exam_start_time) {
            const timeStr = exam.exam_start_time;
            if (timeStr && timeStr.includes(':')) {
                startTimeEl.value = timeStr.substring(0, 5);
            }
        }
        
        const durationEl = document.getElementById('edit_exam_duration');
        if (durationEl) durationEl.value = exam.duration_minutes || 60;
        
        const deadlineEl = document.getElementById('edit_exam_deadline');
        if (deadlineEl) deadlineEl.value = exam.marks_entry_deadline || '';
        
        const programEl = document.getElementById('edit_exam_program');
        if (programEl) {
            const program = exam.target_program || exam.program_type || '';
            programEl.value = program;
            console.log('✅ Program set to:', program);
            
            if (typeof initEditCourseDropdown === 'function') {
                await initEditCourseDropdown(program, exam.course_id);
            }
        }
        
        const blockEl = document.getElementById('edit_exam_block');
        if (blockEl) blockEl.value = exam.block || exam.block_term || '';
        
        const intakeEl = document.getElementById('edit_exam_intake');
        if (intakeEl) intakeEl.value = exam.intake_year || '';
        
        const monthEl = document.getElementById('edit_exam_intake_month');
        if (monthEl) monthEl.value = exam.intake_month || '';
        
        const outOfEl = document.getElementById('edit_exam_out_of');
        if (outOfEl) outOfEl.value = exam.marks_out_of || exam.total_marks || 100;
        
        const passMarkEl = document.getElementById('edit_exam_pass_mark');
        if (passMarkEl) passMarkEl.value = exam.pass_mark || 50;
        
        const minFeeEl = document.getElementById('edit_exam_min_fee');
        if (minFeeEl) minFeeEl.value = exam.min_fee_balance || 0;
        
        const linkEl = document.getElementById('edit_exam_link');
        if (linkEl) linkEl.value = exam.online_link || exam.exam_link || '';
        
        const courseEl = document.getElementById('edit_exam_course');
        if (courseEl && exam.course_id) {
            courseEl.value = exam.course_id;
        }
        
        const courseSearchEl = document.getElementById('editCourseSearchInput');
        if (courseSearchEl && exam.course_id && window._courseMap) {
            const course = window._courseMap[exam.course_id];
            if (course) {
                const displayName = course.course_name || course.name || '';
                const unitCode = course.unit_code || course.code || '';
                courseSearchEl.value = displayName + (unitCode ? ` (${unitCode})` : '');
                
                const displayEl = document.getElementById('editSelectedCourseDisplay');
                const nameEl = document.getElementById('editSelectedCourseName');
                if (displayEl && nameEl) {
                    displayEl.style.display = 'inline';
                    nameEl.textContent = displayName + (unitCode ? ` (${unitCode})` : '');
                }
            }
        }
        
        if (typeof renderAssignedClasses === 'function') {
            renderAssignedClasses(exam.id, exam.assigned_classes || []);
        }
        
        modal.style.display = 'flex';
        console.log('✅ Edit modal opened with all data!');
        
    } catch (error) {
        console.error('❌ Error in openEditExamModal:', error);
        showFeedback('❌ Failed to load exam: ' + error.message, 'error');
    }
}

// ============================================
// SAVE EDITED EXAM - COMPLETE FIX
// ============================================
async function saveEditedExam(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    console.log('💾 Saving exam changes...');
    
    const idEl = document.getElementById('edit_exam_id');
    if (!idEl || !idEl.value) {
        showFeedback('❌ Exam ID not found', 'error');
        return;
    }
    
    const id = idEl.value;
    console.log('📋 Exam ID:', id);
    
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
        marks_out_of: parseInt(document.getElementById('edit_exam_out_of')?.value) || 100,
        total_marks: parseInt(document.getElementById('edit_exam_out_of')?.value) || 100,
        MARKS: String(parseInt(document.getElementById('edit_exam_out_of')?.value) || 100),
        pass_mark: parseInt(document.getElementById('edit_exam_pass_mark')?.value) || 50,
        min_fee_balance: parseInt(document.getElementById('edit_exam_min_fee')?.value) || 0,
        online_link: document.getElementById('edit_exam_link')?.value?.trim() || null,
        exam_link: document.getElementById('edit_exam_link')?.value?.trim() || null,
        updated_at: new Date().toISOString()
    };
    
    Object.keys(data).forEach(k => {
        if (data[k] === undefined || data[k] === null || data[k] === '') {
            delete data[k];
        }
    });
    
    console.log('📤 Update data:', data);
    
    let saveBtn = document.querySelector('#editExamForm button[type="submit"]') || 
                  document.querySelector('#examEditModal .btn-action') ||
                  document.querySelector('#examEditModal .btn-primary');
    
    if (!saveBtn) {
        const buttons = document.querySelectorAll('#examEditModal button');
        for (const btn of buttons) {
            if (btn.textContent.toLowerCase().includes('save')) {
                saveBtn = btn;
                break;
            }
        }
    }
    
    const originalText = saveBtn?.textContent || 'Save Changes';
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    }
    
    try {
        const supabase = window.sb || window.supabase;
        if (!supabase) {
            throw new Error('Supabase client not available');
        }
        
        const { error } = await supabase
            .from('exams')
            .update(data)
            .eq('id', id);
        
        if (error) {
            console.error('❌ Database error:', error);
            throw error;
        }
        
        console.log('✅ Exam updated successfully!');
        showFeedback('✅ Exam updated successfully!', 'success');
        
        ExamCache.clear();
        await loadExams(true);
        closeEditModal();
        
    } catch (error) {
        console.error('❌ Error saving exam:', error);
        showFeedback('❌ Failed to save: ' + error.message, 'error');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
        }
    }
}

// ============================================
// RENDER ASSIGNED CLASSES
// ============================================
function renderAssignedClasses(examId, classes) {
    const container = document.getElementById('edit_exam_classes_container');
    if (!container) return;
    
    container.innerHTML = `
        <label style="font-weight:600;font-size:11px;text-transform:uppercase;color:#475569;display:block;margin-bottom:4px;">Assigned Blocks</label>
        <div style="display:flex;flex-wrap:wrap;gap:6px;padding:8px;background:#f8fafc;border-radius:8px;min-height:32px;border:1px solid #e2e8f0;">
            ${classes && classes.length > 0 ? classes.map(c => `
                <span style="background:#7c3aed;color:#fff;padding:2px 12px;border-radius:16px;font-size:11px;display:inline-flex;align-items:center;gap:4px;">
                    ${escapeHtml(c)}
                    <span onclick="removeClass('${examId}','${escapeHtml(c)}')" style="cursor:pointer;color:#fca5a5;font-weight:700;">&times;</span>
                </span>
            `).join('') : '<span style="color:#94a3b8;font-size:12px;">No blocks assigned</span>'}
        </div>
        <div style="display:flex;gap:6px;margin-top:6px;">
            <input type="text" id="edit_exam_add_class" placeholder="Add block" style="flex:1;padding:6px 10px;border-radius:6px;border:1px solid #e2e8f0;font-size:12px;">
            <button onclick="addClass('${examId}')" style="padding:6px 14px;background:#7c3aed;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:12px;">
                <i class="fas fa-plus"></i>
            </button>
        </div>
    `;
}

// ============================================
// ADD/REMOVE CLASS
// ============================================
async function addClass(examId) {
    const input = document.getElementById('edit_exam_add_class');
    if (!input?.value.trim()) return;
    
    const className = input.value.trim();
    
    try {
        const supabase = window.sb || window.supabase;
        if (!supabase) {
            throw new Error('Supabase client not available');
        }
        
        const { data: exam } = await supabase.from('exams').select('assigned_classes').eq('id', examId).single();
        const current = exam?.assigned_classes || [];
        if (current.includes(className)) {
            showFeedback('Already assigned', 'warning');
            return;
        }
        current.push(className);
        await supabase.from('exams').update({ assigned_classes: current }).eq('id', examId);
        showFeedback(`✅ Added "${className}"`, 'success');
        input.value = '';
        renderAssignedClasses(examId, current);
    } catch (e) {
        showFeedback(`Error: ${e.message}`, 'error');
    }
}

async function removeClass(examId, className) {
    if (!confirm(`Remove "${className}"?`)) return;
    
    try {
        const supabase = window.sb || window.supabase;
        if (!supabase) {
            throw new Error('Supabase client not available');
        }
        
        const { data: exam } = await supabase.from('exams').select('assigned_classes').eq('id', examId).single();
        const current = (exam?.assigned_classes || []).filter(c => c !== className);
        await supabase.from('exams').update({ assigned_classes: current }).eq('id', examId);
        showFeedback(`✅ Removed "${className}"`, 'success');
        renderAssignedClasses(examId, current);
    } catch (e) {
        showFeedback(`Error: ${e.message}`, 'error');
    }
}

// ============================================
// DELETE EXAM
// ============================================
async function deleteExam(id, name) {
    if (!confirm(`Delete "${name}"?`)) return;
    
    try {
        const supabase = window.sb || window.supabase;
        if (!supabase) {
            throw new Error('Supabase client not available');
        }
        
        const { error } = await supabase.from('exams').delete().eq('id', id);
        if (error) throw error;
        ExamCache.clear();
        showFeedback(`✅ "${name}" deleted`, 'success');
        loadExams(true);
    } catch (e) {
        showFeedback(`Delete failed: ${e.message}`, 'error');
    }
}

// ============================================
// CLOSE EXAM
// ============================================
async function closeExam(id) {
    if (!confirm('Close this exam?')) return;
    
    try {
        const supabase = window.sb || window.supabase;
        if (!supabase) {
            throw new Error('Supabase client not available');
        }
        
        const { error } = await supabase
            .from('exams')
            .update({ status: 'Completed', updated_at: new Date().toISOString() })
            .eq('id', id);
        if (error) throw error;
        ExamCache.clear();
        showFeedback('✅ Exam closed', 'success');
        loadExams(true);
    } catch (e) {
        showFeedback(`Failed: ${e.message}`, 'error');
    }
}

// ============================================
// CLOSE EDIT MODAL
// ============================================
function closeEditModal() {
    const modal = document.getElementById('examEditModal');
    if (modal) {
        modal.style.display = 'none';
        const form = document.getElementById('editExamForm');
        if (form) form.reset();
    }
}

// ============================================
// FILTER EXAMS TABLE - GLOBAL
// ============================================
const filterExamsTable = debounce(function() {
    const search = document.getElementById('exam-search')?.value?.toLowerCase() || '';
    const program = document.getElementById('exam_filter_program')?.value || '';
    const status = document.getElementById('exam_filter_status')?.value || '';
    const month = document.getElementById('exam_filter_intake_month')?.value || '';
    
    const rows = document.querySelectorAll('#exams-table-body tr');
    rows.forEach(row => {
        if (row.querySelector('td[colspan]')) return;
        const cells = row.querySelectorAll('td');
        if (cells.length < 12) return;
        
        const title = cells[3]?.textContent?.toLowerCase() || '';
        const prog = cells[1]?.textContent || '';
        const stat = cells[10]?.textContent || '';
        const intake = cells[8]?.textContent || '';
        
        let show = true;
        if (search && !title.includes(search)) show = false;
        if (program && !prog.includes(program)) show = false;
        if (status && !stat.toLowerCase().includes(status.toLowerCase())) show = false;
        if (month && !intake.includes(month)) show = false;
        row.style.display = show ? '' : 'none';
    });
}, 300);

// ============================================
// EXPORT EXAMS
// ============================================
function exportExamsToCSV() {
    const rows = document.querySelectorAll('#exams-table-body tr');
    const visible = Array.from(rows).filter(r => r.style.display !== 'none' && !r.querySelector('td[colspan]'));
    
    if (visible.length === 0) {
        showFeedback('No exams to export', 'warning');
        return;
    }
    
    let csv = 'Type,Program,Course,Title,Out Of,Pass Mark,Date,Duration,Intake,Block,Status\n';
    visible.forEach(row => {
        const cols = row.querySelectorAll('td');
        if (cols.length >= 11) {
            const data = [];
            for (let i = 0; i < 11; i++) {
                data.push(`"${String(cols[i]?.textContent || '').replace(/"/g,'""').trim()}"`);
            }
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
// SHOW EXAM TAB - WITH BLOCK CHANGE LISTENER
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
        btn.className = 'exam-tab-btn active';
        btn.style.background = 'linear-gradient(135deg, #7c3aed, #6d28d9)';
        btn.style.color = 'white';
        btn.style.boxShadow = '0 4px 16px rgba(124,58,237,0.3)';
        loadExams();
    } else if (tab === 'create') {
        document.getElementById('examCreateTab').style.display = 'block';
        const btn = document.getElementById('examCreateTabBtn');
        btn.className = 'exam-tab-btn active';
        btn.style.background = 'linear-gradient(135deg, #7c3aed, #6d28d9)';
        btn.style.color = 'white';
        btn.style.boxShadow = '0 4px 16px rgba(124,58,237,0.3)';
        loadAvailableClassesForExam();
        
        const programSelect = document.getElementById('exam_program');
        const program = programSelect?.value || '';
        if (typeof initCreateCourseDropdown === 'function') {
            initCreateCourseDropdown(program);
        }
        
        // ✅ Add program change listener
        if (programSelect) {
            // Remove old listeners to avoid duplicates
            const newProgramSelect = programSelect.cloneNode(true);
            programSelect.parentNode.replaceChild(newProgramSelect, programSelect);
            const freshProgramSelect = document.getElementById('exam_program');
            
            freshProgramSelect.addEventListener('change', function() {
                const program = this.value;
                console.log('📋 Create Exam: Program changed to', program);
                if (typeof updateCreateCourseDropdown === 'function') {
                    updateCreateCourseDropdown();
                }
                // ✅ Load students when program changes
                loadStudentsForNotification();
            });
        }
        
        // ✅ Add block change listener
        const blockSelect = document.getElementById('exam_block_term');
        if (blockSelect) {
            // Remove old listeners to avoid duplicates
            const newBlockSelect = blockSelect.cloneNode(true);
            blockSelect.parentNode.replaceChild(newBlockSelect, blockSelect);
            const freshBlockSelect = document.getElementById('exam_block_term');
            
            freshBlockSelect.addEventListener('change', function() {
                console.log('📋 Block changed to:', this.value);
                loadStudentsForNotification();
            });
        }
        
        // ✅ Force load students when Create tab is shown
        setTimeout(function() {
            loadStudentsForNotification();
        }, 800);
    }
}

// ============================================
// GET CURRENT USER
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
        if (!supabase) {
            console.warn('Supabase client not available');
            return null;
        }
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase
                .from('consolidated_user_profiles_table')
                .select('*')
                .eq('user_id', user.id)
                .single();
            if (profile) {
                window.currentUserProfile = profile;
                sessionStorage.setItem('currentUserProfile', JSON.stringify(profile));
                return profile;
            }
        }
        return null;
    } catch (e) {
        console.warn('Error getting current user:', e);
        return null;
    }
}

// ============================================
// SEARCHABLE COURSE DROPDOWNS - CREATE
// ============================================
let createCoursesData = [];

async function initCreateCourseDropdown(program = '') {
    console.log('🔍 Initializing create course dropdown...');
    
    const input = document.getElementById('createCourseSearchInput');
    const list = document.getElementById('createCourseDropdownList');
    const hidden = document.getElementById('exam_course_id');
    
    if (!input || !list) return;
    
    await loadCoursesForCreateDropdown(program);
    
    const newInput = input.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);
    const freshInput = document.getElementById('createCourseSearchInput');
    
    freshInput.addEventListener('input', function() {
        filterCreateCourseDropdown(this.value.toLowerCase().trim());
    });
    
    freshInput.addEventListener('focus', function() {
        document.getElementById('createCourseDropdownList').classList.add('show');
        filterCreateCourseDropdown(this.value.toLowerCase().trim());
    });
    
    freshInput.addEventListener('blur', function() {
        setTimeout(() => {
            document.getElementById('createCourseDropdownList').classList.remove('show');
        }, 200);
    });
    
    freshInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const firstItem = document.querySelector('#createCourseDropdownList .dropdown-item');
            if (firstItem) firstItem.click();
            e.preventDefault();
        }
        if (e.key === 'Escape') {
            document.getElementById('createCourseDropdownList').classList.remove('show');
        }
    });
    
    filterCreateCourseDropdown('');
    console.log('✅ Create course dropdown initialized');
}

async function loadCoursesForCreateDropdown(program = '') {
    try {
        const supabase = window.sb || window.supabase;
        if (!supabase) {
            console.error('❌ Supabase client not available');
            createCoursesData = [];
            return;
        }
        
        let query = supabase
            .from('courses')
            .select('id, course_name, unit_code, code, name, target_program');
        
        if (program && program !== '') {
            query = query.eq('target_program', program);
        }
        
        const { data, error } = await query.order('course_name', { ascending: true });
        if (error) throw error;
        
        createCoursesData = data || [];
        console.log(`✅ Loaded ${createCoursesData.length} courses for create`);
        filterCreateCourseDropdown('');
    } catch (error) {
        console.error('Error loading courses:', error);
        createCoursesData = [];
    }
}

function filterCreateCourseDropdown(searchTerm = '') {
    const list = document.getElementById('createCourseDropdownList');
    if (!list) return;
    
    let filtered = createCoursesData;
    if (searchTerm) {
        filtered = createCoursesData.filter(c => {
            const name = (c.course_name || c.name || '').toLowerCase();
            const code = (c.unit_code || c.code || '').toLowerCase();
            return name.includes(searchTerm) || code.includes(searchTerm);
        });
    }
    
    if (filtered.length === 0) {
        list.innerHTML = `<div class="no-results"><i class="fas fa-search"></i> No courses found</div>`;
        list.classList.add('show');
        return;
    }
    
    let html = '';
    const displayItems = filtered.slice(0, 50);
    
    displayItems.forEach(course => {
        const displayName = course.course_name || course.name || 'Untitled';
        const unitCode = course.unit_code || course.code || '';
        const programTag = course.target_program ? `[${course.target_program}]` : '';
        
        html += `
            <div class="dropdown-item" 
                 onclick="selectCreateCourse('${course.id}', '${escapeHtml(displayName)}', '${escapeHtml(unitCode)}', '${escapeHtml(programTag)}')">
                <span>${escapeHtml(displayName)}</span>
                <span style="display:flex;gap:6px;align-items:center;">
                    ${unitCode ? `<span class="course-code">${escapeHtml(unitCode)}</span>` : ''}
                    ${programTag ? `<span class="program-tag">${escapeHtml(programTag)}</span>` : ''}
                </span>
            </div>
        `;
    });
    
    if (filtered.length > 50) {
        html += `<div class="no-results" style="font-size:12px;">And ${filtered.length - 50} more</div>`;
    }
    
    list.innerHTML = html;
    list.classList.add('show');
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
}

function updateCreateCourseDropdown() {
    const programSelect = document.getElementById('exam_program');
    const program = programSelect?.value || '';
    loadCoursesForCreateDropdown(program);
    filterCreateCourseDropdown('');
    
    const input = document.getElementById('createCourseSearchInput');
    const hidden = document.getElementById('exam_course_id');
    const display = document.getElementById('createSelectedCourseDisplay');
    if (input) input.value = '';
    if (hidden) hidden.value = '';
    if (display) display.style.display = 'none';
}

// ============================================
// SEARCHABLE COURSE DROPDOWNS - EDIT
// ============================================
let editCoursesData = [];

async function initEditCourseDropdown(program = '', selectedId = '') {
    console.log('🔍 Initializing edit course dropdown...');
    
    const input = document.getElementById('editCourseSearchInput');
    const list = document.getElementById('editCourseDropdownList');
    const hidden = document.getElementById('edit_exam_course');
    
    if (!input || !list) return;
    
    await loadCoursesForEditDropdown(program);
    
    const newInput = input.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);
    const freshInput = document.getElementById('editCourseSearchInput');
    
    freshInput.addEventListener('input', function() {
        filterEditCourseDropdown(this.value.toLowerCase().trim());
    });
    
    freshInput.addEventListener('focus', function() {
        document.getElementById('editCourseDropdownList').classList.add('show');
        filterEditCourseDropdown(this.value.toLowerCase().trim());
    });
    
    freshInput.addEventListener('blur', function() {
        setTimeout(() => {
            document.getElementById('editCourseDropdownList').classList.remove('show');
        }, 200);
    });
    
    freshInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const firstItem = document.querySelector('#editCourseDropdownList .dropdown-item');
            if (firstItem) firstItem.click();
            e.preventDefault();
        }
        if (e.key === 'Escape') {
            document.getElementById('editCourseDropdownList').classList.remove('show');
        }
    });
    
    if (selectedId) {
        setEditCourseValue(selectedId);
    }
    
    filterEditCourseDropdown('');
    console.log('✅ Edit course dropdown initialized');
}

async function loadCoursesForEditDropdown(program = '') {
    try {
        const supabase = window.sb || window.supabase;
        if (!supabase) {
            console.error('❌ Supabase client not available');
            editCoursesData = [];
            return;
        }
        
        let query = supabase
            .from('courses')
            .select('id, course_name, unit_code, code, name, target_program');
        
        if (program && program !== '') {
            query = query.eq('target_program', program);
        }
        
        const { data, error } = await query.order('course_name', { ascending: true });
        if (error) throw error;
        
        editCoursesData = data || [];
        console.log(`✅ Loaded ${editCoursesData.length} courses for edit`);
        filterEditCourseDropdown('');
    } catch (error) {
        console.error('Error loading courses:', error);
        editCoursesData = [];
    }
}

function filterEditCourseDropdown(searchTerm = '') {
    let list = document.getElementById('editCourseDropdownList');
    if (!list) {
        list = document.getElementById('courseDropdownList');
    }
    if (!list) return;
    
    let filtered = editCoursesData;
    if (searchTerm) {
        filtered = editCoursesData.filter(c => {
            const name = (c.course_name || c.name || '').toLowerCase();
            const code = (c.unit_code || c.code || '').toLowerCase();
            return name.includes(searchTerm) || code.includes(searchTerm);
        });
    }
    
    if (filtered.length === 0) {
        list.innerHTML = `<div class="no-results"><i class="fas fa-search"></i> No courses found</div>`;
        list.classList.add('show');
        return;
    }
    
    let html = '';
    const displayItems = filtered.slice(0, 50);
    
    displayItems.forEach(course => {
        const displayName = course.course_name || course.name || 'Untitled';
        const unitCode = course.unit_code || course.code || '';
        const programTag = course.target_program ? `[${course.target_program}]` : '';
        
        html += `
            <div class="dropdown-item" 
                 onclick="selectEditCourse('${course.id}', '${escapeHtml(displayName)}', '${escapeHtml(unitCode)}', '${escapeHtml(programTag)}')">
                <span>${escapeHtml(displayName)}</span>
                <span style="display:flex;gap:6px;align-items:center;">
                    ${unitCode ? `<span class="course-code">${escapeHtml(unitCode)}</span>` : ''}
                    ${programTag ? `<span class="program-tag">${escapeHtml(programTag)}</span>` : ''}
                </span>
            </div>
        `;
    });
    
    if (filtered.length > 50) {
        html += `<div class="no-results" style="font-size:12px;">And ${filtered.length - 50} more</div>`;
    }
    
    list.innerHTML = html;
    list.classList.add('show');
}

function selectEditCourse(courseId, courseName, courseCode, programTag) {
    const input = document.getElementById('editCourseSearchInput') || document.getElementById('courseSearchInput');
    const hidden = document.getElementById('edit_exam_course');
    const list = document.getElementById('editCourseDropdownList') || document.getElementById('courseDropdownList');
    const display = document.getElementById('editSelectedCourseDisplay') || document.getElementById('selectedCourseDisplay');
    const nameDisplay = document.getElementById('editSelectedCourseName') || document.getElementById('selectedCourseName');
    
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
    
    const course = editCoursesData.find(c => c.id === courseId);
    if (!course) return;
    
    const input = document.getElementById('editCourseSearchInput') || document.getElementById('courseSearchInput');
    const hidden = document.getElementById('edit_exam_course');
    const display = document.getElementById('editSelectedCourseDisplay') || document.getElementById('selectedCourseDisplay');
    const nameDisplay = document.getElementById('editSelectedCourseName') || document.getElementById('selectedCourseName');
    
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
// GRADE MODAL FUNCTIONS
// ============================================

async function openGradeModal(examId, examName = '') {
    try {
        console.log('🎯 Opening grade modal for exam:', examId);
        
        const supabase = window.sb || window.supabase;
        if (!supabase) {
            showFeedback('❌ Supabase client not available', 'error');
            return;
        }
        
        const currentUser = await getCurrentUser();
        
        if (!currentUser || !currentUser.user_id) {
            showFeedback('❌ You must be logged in to grade exams.', 'error');
            return;
        }

        const { data: exam, error: examError } = await supabase
            .from('exams')
            .select('*')
            .eq('id', examId)
            .single();

        if (examError || !exam) {
            showFeedback('❌ Error loading exam details.', 'error');
            return;
        }

        const programField = exam.target_program || exam.program_type;
        const blockField = exam.block || exam.block_term;
        
        let query = supabase
            .from('consolidated_user_profiles_table')
            .select('user_id, full_name, email, program, intake_year, block')
            .eq('role', 'student')
            .eq('status', 'approved');
        
        if (programField) {
            query = query.eq('program', programField);
        }
        if (exam.intake_year) {
            query = query.eq('intake_year', String(exam.intake_year));
        }
        if (blockField) {
            query = query.eq('block', blockField);
        }
        
        const { data: students, error: studentError } = await query.limit(200);

        if (studentError || !students || students.length === 0) {
            showFeedback('⚠️ No students found for this exam criteria.', 'warning');
            return;
        }

        const { data: existingGrades } = await supabase
            .from('exam_grades')
            .select('*')
            .eq('exam_id', examId);

        const examType = exam.exam_type || 'EXAM';
        const modalHtml = buildGradeModalHTML(exam, students, existingGrades || [], currentUser, examType);
        showGradeModal(modalHtml);

        showFeedback(`✅ Grading modal loaded for ${students.length} students`, 'success');
        
    } catch (error) {
        console.error('Error opening grade modal:', error);
        showFeedback('❌ Failed to load grading: ' + error.message, 'error');
    }
}

function buildGradeModalHTML(exam, students, existingGrades, currentUser, examType) {
    const examTypeLabel = getExamTypeLabel(examType);
    const marksOutOf = exam.marks_out_of || exam.total_marks || 100;
    const passMark = exam.pass_mark || 50;
    const examTitle = exam.title || exam.exam_name || 'Assessment';
    
    let tableHeaders = '';
    let tableRows = '';
    
    switch(examType) {
        case 'CAT_1':
            tableHeaders = `<th>Student</th><th>Email</th><th>CAT 1 (max 30)</th><th>Status</th>`;
            tableRows = students.map(s => {
                const grade = existingGrades?.find(g => g.student_id === s.user_id) || {};
                return `<tr data-name="${s.full_name.toLowerCase()}" data-email="${(s.email||'').toLowerCase()}" data-id="${s.user_id}">
                    <td><strong>${escapeHtml(s.full_name)}</strong></td>
                    <td>${escapeHtml(s.email || '')}</td>
                    <td><input type="number" min="0" max="30" step="0.5" id="cat1-${s.user_id}" value="${grade.cat_1_score ?? ''}" placeholder="0-30" class="grade-input"></td>
                    <td><select id="status-${s.user_id}" class="status-select">
                        <option value="Scheduled" ${grade.result_status === 'Scheduled' ? 'selected' : ''}>⏳ Scheduled</option>
                        <option value="InProgress" ${grade.result_status === 'InProgress' ? 'selected' : ''}>🔄 In Progress</option>
                        <option value="Final" ${grade.result_status === 'Final' ? 'selected' : ''}>✅ Final</option>
                    </select></td>
                </tr>`;
            }).join('');
            break;
            
        case 'CAT_2':
            tableHeaders = `<th>Student</th><th>Email</th><th>CAT 2 (max 30)</th><th>Status</th>`;
            tableRows = students.map(s => {
                const grade = existingGrades?.find(g => g.student_id === s.user_id) || {};
                return `<tr data-name="${s.full_name.toLowerCase()}" data-email="${(s.email||'').toLowerCase()}" data-id="${s.user_id}">
                    <td><strong>${escapeHtml(s.full_name)}</strong></td>
                    <td>${escapeHtml(s.email || '')}</td>
                    <td><input type="number" min="0" max="30" step="0.5" id="cat2-${s.user_id}" value="${grade.cat_2_score ?? ''}" placeholder="0-30" class="grade-input"></td>
                    <td><select id="status-${s.user_id}" class="status-select">
                        <option value="Scheduled" ${grade.result_status === 'Scheduled' ? 'selected' : ''}>⏳ Scheduled</option>
                        <option value="InProgress" ${grade.result_status === 'InProgress' ? 'selected' : ''}>🔄 In Progress</option>
                        <option value="Final" ${grade.result_status === 'Final' ? 'selected' : ''}>✅ Final</option>
                    </select></td>
                </tr>`;
            }).join('');
            break;
            
        default:
            tableHeaders = `<th>Student</th><th>Email</th><th>CAT 1 (max 30)</th><th>CAT 2 (max 30)</th><th>Final (max ${marksOutOf})</th><th>Total</th><th>Status</th>`;
            tableRows = students.map(s => {
                const grade = existingGrades?.find(g => g.student_id === s.user_id) || {};
                return `<tr data-name="${s.full_name.toLowerCase()}" data-email="${(s.email||'').toLowerCase()}" data-id="${s.user_id}">
                    <td><strong>${escapeHtml(s.full_name)}</strong></td>
                    <td>${escapeHtml(s.email || '')}</td>
                    <td><input type="number" min="0" max="30" step="0.5" id="cat1-${s.user_id}" value="${grade.cat_1_score ?? ''}" placeholder="0-30" class="grade-input" oninput="updateGradeTotal('${s.user_id}')"></td>
                    <td><input type="number" min="0" max="30" step="0.5" id="cat2-${s.user_id}" value="${grade.cat_2_score ?? ''}" placeholder="0-30" class="grade-input" oninput="updateGradeTotal('${s.user_id}')"></td>
                    <td><input type="number" min="0" max="${marksOutOf}" step="0.5" id="final-${s.user_id}" value="${grade.exam_score ?? ''}" placeholder="0-${marksOutOf}" class="grade-input" oninput="updateGradeTotal('${s.user_id}')"></td>
                    <td><input type="number" min="0" max="100" step="0.1" id="total-${s.user_id}" value="" placeholder="Auto" readonly class="total-input"></td>
                    <td><select id="status-${s.user_id}" class="status-select">
                        <option value="Scheduled" ${grade.result_status === 'Scheduled' ? 'selected' : ''}>⏳ Scheduled</option>
                        <option value="InProgress" ${grade.result_status === 'InProgress' ? 'selected' : ''}>🔄 In Progress</option>
                        <option value="Final" ${grade.result_status === 'Final' ? 'selected' : ''}>✅ Final</option>
                    </select></td>
                </tr>`;
            }).join('');
    }
    
    return `
    <div class="modal-overlay" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn 0.3s ease;">
        <div class="modal-content" style="background:white;border-radius:16px;max-width:1000px;width:100%;max-height:90vh;overflow-y:auto;padding:0;box-shadow:0 20px 60px rgba(0,0,0,0.3);animation:slideUp 0.3s ease;">
            <div class="modal-header" style="padding:16px 24px;border-bottom:2px solid #4C1D95;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;background:white;z-index:10;border-radius:16px 16px 0 0;">
                <div>
                    <h3 style="margin:0;color:#4C1D95;">
                        <i class="fas fa-check-double"></i> ${examTypeLabel}: ${escapeHtml(examTitle)}
                    </h3>
                    <p style="margin:2px 0 0;font-size:12px;color:#94a3b8;">
                        ${escapeHtml(exam.program_type || exam.target_program || 'N/A')} | Block: ${escapeHtml(exam.block || exam.block_term || 'N/A')} | ${exam.intake_year || 'N/A'}
                        | Pass: ${passMark}% | Students: ${students.length}
                    </p>
                </div>
                <button onclick="closeGradeModal()" style="background:none;border:none;font-size:28px;cursor:pointer;color:#6b7280;">&times;</button>
            </div>
            
            <div class="modal-body" style="padding:16px 24px;">
                <div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap;">
                    <input type="text" id="gradeSearch" placeholder="🔍 Search by name or email..." 
                           style="flex:1;min-width:200px;padding:8px 14px;border-radius:8px;border:1px solid #e2e8f0;font-size:13px;"
                           oninput="filterGradeStudents()">
                    <span style="font-size:12px;color:#94a3b8;display:flex;align-items:center;">
                        <i class="fas fa-users"></i> ${students.length} students
                    </span>
                </div>
                
                <div style="overflow-x:auto;max-height:50vh;overflow-y:auto;">
                    <table style="width:100%;border-collapse:collapse;font-size:13px;">
                        <thead style="position:sticky;top:0;z-index:5;">
                            <tr style="background:#f8fafc;border-bottom:2px solid #e5e7eb;">
                                ${tableHeaders}
                            </tr>
                        </thead>
                        <tbody id="gradeTableBody">
                            ${tableRows}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="modal-footer" style="padding:16px 24px;border-top:1px solid #e5e7eb;display:flex;gap:12px;justify-content:flex-end;border-radius:0 0 16px 16px;">
                <button onclick="saveGrades('${exam.id}')" class="btn-action" style="background:#10b981;color:white;border:none;padding:10px 24px;border-radius:8px;cursor:pointer;font-weight:600;">
                    <i class="fas fa-save"></i> Save Grades
                </button>
                <button onclick="closeGradeModal()" style="background:#e5e7eb;color:#475569;border:none;padding:10px 24px;border-radius:8px;cursor:pointer;font-weight:600;">
                    Cancel
                </button>
            </div>
        </div>
    </div>`;
}

function showGradeModal(modalHtml) {
    const existingModal = document.getElementById('gradeModal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'gradeModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:10000;';
    modal.innerHTML = modalHtml;
    document.body.appendChild(modal);
}

function closeGradeModal() {
    const modal = document.getElementById('gradeModal');
    if (modal) modal.remove();
}

function filterGradeStudents() {
    const search = document.getElementById('gradeSearch')?.value?.toLowerCase() || '';
    const rows = document.querySelectorAll('#gradeTableBody tr');
    rows.forEach(row => {
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
        if (!supabase) {
            showFeedback('❌ Supabase client not available', 'error');
            return;
        }
        
        const rows = document.querySelectorAll('#gradeTableBody tr');
        const currentUser = await getCurrentUser();
        
        if (!currentUser) {
            showFeedback('❌ Please login first', 'error');
            return;
        }
        
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
            
            const { data: existing } = await supabase
                .from('exam_grades')
                .select('id')
                .eq('exam_id', parseInt(examId))
                .eq('student_id', studentId)
                .maybeSingle();
            
            if (existing) {
                await supabase
                    .from('exam_grades')
                    .update(gradeData)
                    .eq('id', existing.id);
            } else {
                await supabase
                    .from('exam_grades')
                    .insert({
                        ...gradeData,
                        created_at: new Date().toISOString()
                    });
            }
            
            saved++;
        }
        
        showFeedback(`✅ ${saved} grades saved successfully!`, 'success');
        setTimeout(closeGradeModal, 1000);
        
    } catch (error) {
        console.error('Error saving grades:', error);
        showFeedback('❌ Failed to save grades: ' + error.message, 'error');
    }
}

function getExamTypeLabel(examType) {
    const labels = {
        'CAT_1': 'CAT 1 Assessment',
        'CAT_2': 'CAT 2 Assessment',
        'CAT': 'Continuous Assessment Test',
        'EXAM': 'Final Examination',
        'ASSIGNMENT': 'Assignment',
        'END_TERM': 'End of Term Exam',
        'SUPPLEMENTARY': 'Supplementary Exam'
    };
    return labels[examType] || 'Assessment';
}

// ============================================
// POPULATE EXAM COURSE SELECTS
// ============================================
async function populateExamCourseSelects(program, selected = '') {
    console.log('📚 populateExamCourseSelects called with:', program, selected);
    
    const select = document.getElementById('exam_course_id');
    if (!select) {
        console.warn('⚠️ exam_course_id not found');
        return;
    }
    
    select.innerHTML = '<option value="">-- Optional: Select Course --</option>';
    
    if (!program) {
        try {
            const supabase = window.sb || window.supabase;
            if (!supabase) {
                console.warn('Supabase client not available');
                return;
            }
            
            const { data, error } = await supabase
                .from('courses')
                .select('id, course_name, target_program, unit_code')
                .order('course_name', { ascending: true })
                .limit(100);
            
            if (!error && data) {
                data.forEach(course => {
                    const option = document.createElement('option');
                    option.value = course.id;
                    option.textContent = `${course.course_name} (${course.unit_code || 'N/A'}) - ${course.target_program || 'General'}`;
                    if (selected && course.id === selected) {
                        option.selected = true;
                    }
                    select.appendChild(option);
                });
                console.log(`✅ Loaded ${data.length} courses`);
            }
        } catch (error) {
            console.error('Error loading courses:', error);
        }
        return;
    }
    
    try {
        const supabase = window.sb || window.supabase;
        if (!supabase) {
            console.warn('Supabase client not available');
            return;
        }
        
        const { data, error } = await supabase
            .from('courses')
            .select('id, course_name, target_program, unit_code')
            .eq('target_program', program)
            .order('course_name', { ascending: true });
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            console.log(`No courses found for program: ${program}`);
            const { data: allCourses } = await supabase
                .from('courses')
                .select('id, course_name, target_program, unit_code')
                .limit(100);
            
            if (allCourses && allCourses.length > 0) {
                allCourses.forEach(course => {
                    const option = document.createElement('option');
                    option.value = course.id;
                    const displayName = course.course_name || 'Untitled';
                    option.textContent = `${displayName} (${course.unit_code || 'N/A'}) - ${course.target_program || 'General'}`;
                    if (selected && course.id === selected) {
                        option.selected = true;
                    }
                    select.appendChild(option);
                });
                console.log(`✅ Loaded ${allCourses.length} courses as fallback`);
                return;
            }
            return;
        }
        
        data.forEach(course => {
            const option = document.createElement('option');
            option.value = course.id;
            option.textContent = `${course.course_name} (${course.unit_code || 'N/A'})`;
            if (selected && course.id === selected) {
                option.selected = true;
            }
            select.appendChild(option);
        });
        
        console.log(`✅ Loaded ${data.length} courses for program: ${program}`);
        
    } catch (error) {
        console.error('Error loading courses:', error);
    }
}

// ============================================
// INIT
// ============================================
function initExams() {
    // ✅ Initialize DOM FIRST
    cacheDomElements();
    
    const dateInput = document.getElementById('exam_date');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
    
    populateProgramDropdowns();
    
    loadExams();
    loadAvailableClassesForExam();
    
    const programSelect = document.getElementById('exam_program');
    const blockSelect = document.getElementById('exam_block_term');
    const program = programSelect?.value || '';
    
    if (typeof initCreateCourseDropdown === 'function') {
        initCreateCourseDropdown(program);
    }
    
    if (DOM.examSearch) DOM.examSearch.addEventListener('input', filterExamsTable);
    if (DOM.programFilter) DOM.programFilter.addEventListener('change', filterExamsTable);
    if (DOM.statusFilter) DOM.statusFilter.addEventListener('change', filterExamsTable);
    if (DOM.monthFilter) DOM.monthFilter.addEventListener('change', filterExamsTable);
    
    // ✅ Load students for notification when program/block changes
    if (programSelect) {
        // Remove old listeners to avoid duplicates
        const newProgramSelect = programSelect.cloneNode(true);
        programSelect.parentNode.replaceChild(newProgramSelect, programSelect);
        const freshProgramSelect = document.getElementById('exam_program');
        
        freshProgramSelect.addEventListener('change', function() {
            // Update block dropdown
            updateBlockTermOptions('exam_program', 'exam_block_term');
            // Update class checkboxes
            loadAvailableClassesForExam();
            // Load students for notification
            loadStudentsForNotification();
            // Update course dropdown
            if (typeof updateCreateCourseDropdown === 'function') {
                updateCreateCourseDropdown();
            }
        });
    }
    
    if (blockSelect) {
        // Remove old listeners to avoid duplicates
        const newBlockSelect = blockSelect.cloneNode(true);
        blockSelect.parentNode.replaceChild(newBlockSelect, blockSelect);
        const freshBlockSelect = document.getElementById('exam_block_term');
        freshBlockSelect.addEventListener('change', loadStudentsForNotification);
    }
    
    // ✅ Set initial block dropdown and class checkboxes
    setTimeout(function() {
        if (programSelect?.value) {
            updateBlockTermOptions('exam_program', 'exam_block_term');
            loadAvailableClassesForExam();
        }
        loadStudentsForNotification();
    }, 500);
    
    console.log('🚀 Exams/CATS Management initialized with email notifications and block filtering!');
}

// ============================================
// 🔧 EXPOSE GLOBALLY - FIX ALL REFERENCES
// ============================================

// 1. Filter function
window.filterExamsTable = filterExamsTable;

// 2. Course dropdown functions
window.updateCreateCourseDropdown = updateCreateCourseDropdown;
window.initCreateCourseDropdown = initCreateCourseDropdown;
window.loadCoursesForCreateDropdown = loadCoursesForCreateDropdown;
window.filterCreateCourseDropdown = filterCreateCourseDropdown;
window.selectCreateCourse = selectCreateCourse;
window.initEditCourseDropdown = initEditCourseDropdown;
window.selectEditCourse = selectEditCourse;
window.setEditCourseValue = setEditCourseValue;

// 3. Email notification functions
window.sendEmailWithBrevo = sendEmailWithBrevo;
window.sendEmailWithEdgeFunctionFallback = sendEmailWithEdgeFunctionFallback;
window.sendExamNotificationEmail = sendExamNotificationEmail;
window.loadStudentsForNotification = loadStudentsForNotification;
window.searchStudentsForNotification = searchStudentsForNotification;
window.toggleStudentForNotification = toggleStudentForNotification;
window.updateSelectedStudentsDisplay = updateSelectedStudentsDisplay;
window.getNotificationRecipients = getNotificationRecipients;

// 4. Make sure debounce is global
window.debounce = debounce;

// 5. Make sure createCoursesData is global
window.createCoursesData = createCoursesData;
window.editCoursesData = editCoursesData;

// 6. Main functions
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
window.showFeedback = showFeedback;
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
window.populateExamCourseSelects = populateExamCourseSelects;
window.updateBlockTermOptions = updateBlockTermOptions;

// 7. DOM is already global
window.DOM = DOM;

console.log('✅ CATS/Exams loaded (complete fixed version with email notifications, searchable dropdowns, and block filtering)!');
