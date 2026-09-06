// ============================================================
// 📁 js/admin-pending-questions.js
// SUPER ADMIN - Pending Questions Approval
// ============================================================

let pendingQuestionsData = [];
let expandedLecturers = new Set();

// ============================================================
// LOAD PENDING QUESTIONS
// ============================================================
async function loadPendingQuestions() {
    const container = document.getElementById('pendingQuestionsContainer');
    if (!container) return;

    try {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #94a3b8;">
                <div style="display: inline-block; width: 30px; height: 30px; border: 3px solid #e2e8f0; border-top: 3px solid #4C1D95; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <p style="margin: 10px 0 0 0;">Loading lecturers...</p>
            </div>
        `;

        // Build query
        let query = window.supabase
            .from('exam_questions')
            .select('*, exams(title, exam_name)')
            .order('submitted_at', { ascending: false });

        // Apply filters
        const examFilter = document.getElementById('pendingExamFilter')?.value;
        const statusFilter = document.getElementById('pendingStatusFilter')?.value;
        const searchTerm = document.getElementById('pendingSearch')?.value?.toLowerCase();

        if (examFilter) {
            query = query.eq('exam_id', parseInt(examFilter));
        }
        if (statusFilter) {
            query = query.eq('status', statusFilter);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Filter by search term (client-side)
        let filteredData = data || [];
        if (searchTerm) {
            filteredData = filteredData.filter(q => {
                const lecturerName = (q.lecturer_name || '').toLowerCase();
                return lecturerName.includes(searchTerm);
            });
        }

        // Get lecturer names
        const lecturerIds = filteredData
            .filter(q => q.lecturer_id)
            .map(q => q.lecturer_id);

        let lecturerMap = {};
        if (lecturerIds.length > 0) {
            const { data: lecturers } = await window.supabase
                .from('consolidated_user_profiles_table')
                .select('user_id, full_name, email, program')
                .in('user_id', lecturerIds);
            
            lecturerMap = Object.fromEntries((lecturers || []).map(l => [l.user_id, l]));
        }

        // Add lecturer names to questions
        filteredData = filteredData.map(q => ({
            ...q,
            lecturer_name: q.lecturer_id ? (lecturerMap[q.lecturer_id]?.full_name || 'Unknown Lecturer') : 'Super Admin',
            lecturer_email: q.lecturer_id ? (lecturerMap[q.lecturer_id]?.email || '') : '',
            lecturer_program: q.lecturer_id ? (lecturerMap[q.lecturer_id]?.program || '') : ''
        }));

        pendingQuestionsData = filteredData;

        // Group by lecturer
        const groupedData = groupByLecturer(pendingQuestionsData);
        renderLecturerGroups(groupedData);

        // Update stats
        updatePendingStats(pendingQuestionsData);

        // Update badge
        const pendingCount = pendingQuestionsData.filter(q => q.status === 'pending').length;
        const badge = document.getElementById('pendingQuestionsBadge');
        if (badge) badge.textContent = pendingCount;

    } catch (error) {
        console.error('Error loading pending questions:', error);
        container.innerHTML = `
            <div style="background: #fee2e2; padding: 20px; border-radius: 12px; color: #991b1b; text-align: center;">
                ❌ Error loading questions: ${error.message}
            </div>
        `;
    }
}

// ============================================================
// GROUP BY LECTURER
// ============================================================
function groupByLecturer(questions) {
    const groups = {};
    
    questions.forEach(q => {
        const key = q.lecturer_id || 'superadmin';
        if (!groups[key]) {
            groups[key] = {
                lecturer_id: key,
                lecturer_name: q.lecturer_name || 'Super Admin',
                lecturer_email: q.lecturer_email || '',
                lecturer_program: q.lecturer_program || '',
                questions: [],
                total_pending: 0,
                total_approved: 0,
                total_rejected: 0
            };
        }
        groups[key].questions.push(q);
        
        if (q.status === 'pending') groups[key].total_pending++;
        else if (q.status === 'approved') groups[key].total_approved++;
        else if (q.status === 'rejected') groups[key].total_rejected++;
    });
    
    return Object.values(groups);
}

// ============================================================
// RENDER LECTURER GROUPS
// ============================================================
function renderLecturerGroups(groups) {
    const container = document.getElementById('pendingQuestionsContainer');
    if (!container) return;

    if (groups.length === 0) {
        container.innerHTML = `
            <div style="background: white; border-radius: 12px; padding: 40px; text-align: center; border: 1px solid #e5e7eb;">
                <i class="fas fa-check-circle" style="font-size: 48px; color: #10b981; display: block; margin-bottom: 16px;"></i>
                <h3 style="color: #0A3D62; margin: 0;">All questions reviewed!</h3>
                <p style="color: #94a3b8; margin: 8px 0 0 0;">No pending questions from lecturers.</p>
            </div>
        `;
        return;
    }

    let html = '';
    groups.forEach((group, index) => {
        const isExpanded = expandedLecturers.has(group.lecturer_id);
        const hasPending = group.total_pending > 0;
        
        html += `
            <div style="background: white; border-radius: 12px; margin-bottom: 20px; border: 1px solid ${hasPending ? '#f59e0b' : '#e5e7eb'}; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
                <!-- Lecturer Header -->
                <div style="padding: 16px 20px; background: ${hasPending ? '#fffbeb' : '#f8fafc'}; border-bottom: 1px solid ${hasPending ? '#fde68a' : '#e5e7eb'}; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; cursor: pointer;" onclick="toggleLecturer('${group.lecturer_id}')">
                    <div style="display: flex; align-items: center; gap: 14px;">
                        <div style="width: 44px; height: 44px; border-radius: 50%; background: ${hasPending ? '#f59e0b' : '#4C1D95'}; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 18px;">
                            ${group.lecturer_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div style="font-weight: 700; color: #0A3D62; font-size: 16px;">
                                ${group.lecturer_name}
                                ${group.lecturer_id === 'superadmin' ? ' 👑' : ' 👨‍🏫'}
                            </div>
                            <div style="font-size: 12px; color: #64748b;">
                                ${group.lecturer_email || ''} ${group.lecturer_program ? '| ' + group.lecturer_program : ''}
                            </div>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                        <span style="font-size: 12px; color: #64748b;">
                            <span style="background: #fef3c7; padding: 2px 10px; border-radius: 12px; color: #92400e;">⏳ ${group.total_pending} pending</span>
                            <span style="background: #d1fae5; padding: 2px 10px; border-radius: 12px; color: #065f46; margin-left: 4px;">✅ ${group.total_approved} approved</span>
                            <span style="background: #fee2e2; padding: 2px 10px; border-radius: 12px; color: #991b1b; margin-left: 4px;">❌ ${group.total_rejected} rejected</span>
                        </span>
                        ${hasPending ? `
                            <button onclick="event.stopPropagation(); approveLecturerQuestions('${group.lecturer_id}')" style="background: #10b981; color: white; border: none; padding: 6px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 12px;">
                                <i class="fas fa-check-double"></i> Approve All (${group.total_pending})
                            </button>
                        ` : ''}
                        <span style="font-size: 14px; color: #94a3b8; transition: transform 0.3s;">
                            <i class="fas ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'}"></i>
                        </span>
                    </div>
                </div>

                <!-- Questions List (Collapsible) -->
                <div id="lecturerQuestions_${group.lecturer_id}" style="display: ${isExpanded ? 'block' : 'none'}; padding: 0;">
                    ${isExpanded ? renderPendingQuestionsTable(group.questions) : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ============================================================
// RENDER PENDING QUESTIONS TABLE
// ============================================================
function renderPendingQuestionsTable(questions) {
    if (!questions || questions.length === 0) {
        return `
            <div style="padding: 20px; text-align: center; color: #94a3b8;">
                No questions found
            </div>
        `;
    }

    let html = `
        <div style="overflow-x: auto; padding: 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                    <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                        <th style="padding: 10px 14px; text-align: left; font-weight: 700; color: #475569;">#</th>
                        <th style="padding: 10px 14px; text-align: left; font-weight: 700; color: #475569;">Question</th>
                        <th style="padding: 10px 14px; text-align: left; font-weight: 700; color: #475569;">Exam</th>
                        <th style="padding: 10px 14px; text-align: center; font-weight: 700; color: #475569;">Type</th>
                        <th style="padding: 10px 14px; text-align: center; font-weight: 700; color: #475569;">Marks</th>
                        <th style="padding: 10px 14px; text-align: center; font-weight: 700; color: #475569;">Status</th>
                        <th style="padding: 10px 14px; text-align: center; font-weight: 700; color: #475569; min-width: 120px;">Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;

    questions.forEach((q, index) => {
        const isMcq = q.question_type === 'mcq' || q.question_type === 'multiple_choice';
        const examTitle = q.exams?.title || q.exams?.exam_name || 'Exam ' + q.exam_id;
        const statusColors = {
            'pending': 'background: #fef3c7; color: #92400e;',
            'approved': 'background: #d1fae5; color: #065f46;',
            'rejected': 'background: #fee2e2; color: #991b1b;'
        };
        const statusIcons = {
            'pending': '⏳',
            'approved': '✅',
            'rejected': '❌'
        };
        const isPending = q.status === 'pending';

        html += `
            <tr style="border-bottom: 1px solid #e5e7eb; ${isPending ? 'background: #fffbeb;' : ''}">
                <td style="padding: 8px 12px; text-align: center; font-weight: 600; color: #94a3b8;">${index + 1}</td>
                <td style="padding: 8px 12px; color: #1e293b; max-width: 300px; word-wrap: break-word;">${q.question_text || 'No text'}</td>
                <td style="padding: 8px 12px; font-size: 12px; color: #475569;">${examTitle}</td>
                <td style="padding: 8px 12px; text-align: center;">
                    <span style="padding: 2px 10px; border-radius: 20px; font-size: 10px; font-weight: 600; background: ${isMcq ? '#DBEAFE' : '#FEF3C7'}; color: ${isMcq ? '#1E40AF' : '#92400E'};">
                        ${isMcq ? 'MCQ' : 'Essay'}
                    </span>
                </td>
                <td style="padding: 8px 12px; text-align: center; font-weight: 600;">${q.marks || 1}</td>
                <td style="padding: 8px 12px; text-align: center;">
                    <span style="padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; ${statusColors[q.status] || statusColors.pending}">
                        ${statusIcons[q.status] || '⏳'} ${q.status || 'pending'}
                    </span>
                    ${q.rejection_reason ? `<br><small style="color:#dc2626; font-size:9px;">${q.rejection_reason}</small>` : ''}
                </td>
                <td style="padding: 8px 12px; text-align: center;">
                    ${isPending ? `
                        <button onclick="approveSingleQuestion('${q.id}')" style="background: #10b981; color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 10px; font-weight: 600; margin-right: 4px;">
                            <i class="fas fa-check"></i> Approve
                        </button>
                        <button onclick="openRejectModal('${q.id}')" style="background: #dc2626; color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 10px; font-weight: 600;">
                            <i class="fas fa-times"></i> Reject
                        </button>
                    ` : `
                        <button onclick="viewQuestionDetail('${q.id}')" style="background: #3b82f6; color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 10px; font-weight: 600;">
                            <i class="fas fa-eye"></i> View
                        </button>
                    `}
                </td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    return html;
}

// ============================================================
// TOGGLE LECTURER
// ============================================================
function toggleLecturer(lecturerId) {
    if (expandedLecturers.has(lecturerId)) {
        expandedLecturers.delete(lecturerId);
    } else {
        expandedLecturers.add(lecturerId);
    }
    const groups = groupByLecturer(pendingQuestionsData);
    renderLecturerGroups(groups);
}

// ============================================================
// APPROVE ALL QUESTIONS FOR A LECTURER
// ============================================================
async function approveLecturerQuestions(lecturerId) {
    const lecturerQuestions = pendingQuestionsData.filter(q => q.lecturer_id === lecturerId && q.status === 'pending');
    
    if (lecturerQuestions.length === 0) {
        showToast('No pending questions for this lecturer', 'info');
        return;
    }

    if (!confirm(`Approve all ${lecturerQuestions.length} questions from ${lecturerQuestions[0]?.lecturer_name || 'this lecturer'}?`)) return;

    try {
        const ids = lecturerQuestions.map(q => q.id);
        const { error } = await window.supabase
            .from('exam_questions')
            .update({
                status: 'approved',
                approved_at: new Date().toISOString(),
                approved_by: 'superadmin',
                updated_at: new Date().toISOString()
            })
            .in('id', ids);

        if (error) throw error;

        showToast(`✅ Approved ${ids.length} questions from ${lecturerQuestions[0]?.lecturer_name || 'lecturer'}!`, 'success');
        loadPendingQuestions();

    } catch (error) {
        showToast('❌ Error approving questions: ' + error.message, 'error');
        console.error(error);
    }
}

// ============================================================
// APPROVE SINGLE QUESTION
// ============================================================
async function approveSingleQuestion(questionId) {
    if (!confirm('Approve this question?')) return;

    try {
        const { error } = await window.supabase
            .from('exam_questions')
            .update({
                status: 'approved',
                approved_at: new Date().toISOString(),
                approved_by: 'superadmin',
                updated_at: new Date().toISOString()
            })
            .eq('id', questionId);

        if (error) throw error;

        showToast('✅ Question approved successfully!', 'success');
        loadPendingQuestions();

    } catch (error) {
        showToast('❌ Error approving question: ' + error.message, 'error');
        console.error(error);
    }
}

// ============================================================
// OPEN REJECT MODAL
// ============================================================
function openRejectModal(questionId) {
    document.getElementById('rejectQuestionId').value = questionId;
    document.getElementById('rejectReason').value = '';
    document.getElementById('rejectModal').style.display = 'flex';
}

// ============================================================
// CLOSE REJECT MODAL
// ============================================================
function closeRejectModal() {
    document.getElementById('rejectModal').style.display = 'none';
}

// ============================================================
// CONFIRM REJECT
// ============================================================
async function confirmReject() {
    const questionId = document.getElementById('rejectQuestionId').value;
    const reason = document.getElementById('rejectReason').value.trim();

    if (!reason) {
        showToast('⚠️ Please provide a rejection reason', 'warning');
        return;
    }

    try {
        const { error } = await window.supabase
            .from('exam_questions')
            .update({
                status: 'rejected',
                rejection_reason: reason,
                rejected_at: new Date().toISOString(),
                rejected_by: 'superadmin',
                updated_at: new Date().toISOString()
            })
            .eq('id', questionId);

        if (error) throw error;

        showToast('❌ Question rejected', 'info');
        closeRejectModal();
        loadPendingQuestions();

    } catch (error) {
        showToast('❌ Error rejecting question: ' + error.message, 'error');
        console.error(error);
    }
}

// ============================================================
// UPDATE PENDING STATS
// ============================================================
function updatePendingStats(questions) {
    const total = questions.length;
    const pending = questions.filter(q => q.status === 'pending').length;
    const approved = questions.filter(q => q.status === 'approved').length;
    const rejected = questions.filter(q => q.status === 'rejected').length;
    const lecturers = [...new Set(questions.filter(q => q.lecturer_id).map(q => q.lecturer_id))].length;

    document.getElementById('pendingCount').textContent = pending;
    document.getElementById('approvedCount').textContent = approved;
    document.getElementById('rejectedCount').textContent = rejected;
    document.getElementById('lecturerCount').textContent = lecturers;
}

// ============================================================
// VIEW QUESTION DETAIL
// ============================================================
async function viewQuestionDetail(questionId) {
    try {
        const { data, error } = await window.supabase
            .from('exam_questions')
            .select('*, exams(title, exam_name)')
            .eq('id', questionId)
            .single();

        if (error) throw error;

        const isMcq = data.question_type === 'mcq' || data.question_type === 'multiple_choice';
        const examTitle = data.exams?.title || data.exams?.exam_name || 'Exam ' + data.exam_id;
        
        let details = `📝 Question Details\n\n`;
        details += `Question: ${data.question_text}\n\n`;
        details += `Exam: ${examTitle}\n`;
        details += `Type: ${isMcq ? 'Multiple Choice' : 'Essay'}\n`;
        details += `Marks: ${data.marks || 1}\n`;
        details += `Status: ${data.status || 'pending'}\n`;
        details += `Created By: ${data.created_by || 'Unknown'}\n`;
        details += `Submitted: ${data.submitted_at ? new Date(data.submitted_at).toLocaleString() : '-'}\n`;
        
        if (isMcq) {
            details += `\nOptions:\n`;
            if (data.option_a) details += `A: ${data.option_a}\n`;
            if (data.option_b) details += `B: ${data.option_b}\n`;
            if (data.option_c) details += `C: ${data.option_c}\n`;
            if (data.option_d) details += `D: ${data.option_d}\n`;
            details += `\nCorrect Answer: ${data.correct_answer || 'N/A'}`;
        }

        if (data.rejection_reason) {
            details += `\n\n❌ Rejection Reason: ${data.rejection_reason}`;
        }

        alert(details);

    } catch (error) {
        showToast('Error loading question details', 'error');
        console.error(error);
    }
}

// ============================================================
// ✅ EXPOSE FUNCTIONS GLOBALLY
// ============================================================
window.loadPendingQuestions = loadPendingQuestions;
window.toggleLecturer = toggleLecturer;
window.approveLecturerQuestions = approveLecturerQuestions;
window.approveSingleQuestion = approveSingleQuestion;
window.openRejectModal = openRejectModal;
window.closeRejectModal = closeRejectModal;
window.confirmReject = confirmReject;
window.viewQuestionDetail = viewQuestionDetail;
window.updatePendingStats = updatePendingStats;
window.groupByLecturer = groupByLecturer;
window.renderLecturerGroups = renderLecturerGroups;
window.renderPendingQuestionsTable = renderPendingQuestionsTable;

console.log('✅ Admin Pending Questions module loaded');
