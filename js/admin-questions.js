// ============================================================
// 📁 js/admin-questions.js
// SUPER ADMIN - Question Bank + Pending Questions Approval
// ============================================================

// ============================================================
// 📝 QUESTION BANK - CRUD
// ============================================================

let currentQuestions = [];
let currentQuestionExamId = null;

// ============================================================
// LOAD EXAMS FOR QUESTIONS
// ============================================================
async function loadExamsForQuestions() {
    console.log('📚 Loading exams for question bank...');
    try {
        const { data, error } = await window.supabase
            .from('exams')
            .select('id, title, exam_name')
            .order('title');

        if (error) throw error;

        const select = document.getElementById('questionExamSelect');
        if (!select) {
            console.warn('⚠️ questionExamSelect not found');
            return;
        }
        
        select.innerHTML = '<option value="">-- Select an exam --</option>';
        
        if (data && data.length > 0) {
            data.forEach(exam => {
                const option = document.createElement('option');
                option.value = exam.id;
                option.textContent = exam.title || exam.exam_name || 'Untitled Exam';
                select.appendChild(option);
            });

            // Auto-select first exam
            select.value = data[0].id;
            await loadQuestionsForExam();
        }
        console.log(`✅ Loaded ${data?.length || 0} exams`);
    } catch (error) {
        console.error('Error loading exams:', error);
        showToast('❌ Error loading exams: ' + error.message, 'error');
    }
}

// ============================================================
// LOAD QUESTIONS FOR SELECTED EXAM
// ============================================================
async function loadQuestionsForExam() {
    const select = document.getElementById('questionExamSelect');
    if (!select) {
        console.warn('⚠️ questionExamSelect not found');
        return;
    }
    
    const examId = select.value;
    console.log('📝 Loading questions for exam:', examId);

    if (!examId) {
        const body = document.getElementById('questionsBody');
        if (body) {
            body.innerHTML = `
                <tr><td colspan="6" style="text-align:center; padding:30px; color:#94a3b8;">
                    <i class="fas fa-info-circle"></i> Select an exam to view questions
                </td></tr>
            `;
        }
        const table = document.getElementById('questionsTable');
        const loading = document.getElementById('questionsLoading');
        const countDisplay = document.getElementById('questionCountDisplay');
        const totalMarks = document.getElementById('questionTotalMarks');
        
        if (table) table.style.display = 'table';
        if (loading) loading.style.display = 'none';
        if (countDisplay) countDisplay.textContent = '0';
        if (totalMarks) totalMarks.textContent = '0';
        return;
    }

    currentQuestionExamId = examId;

    try {
        const loading = document.getElementById('questionsLoading');
        const table = document.getElementById('questionsTable');
        
        if (loading) {
            loading.style.display = 'block';
            loading.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading questions...';
        }
        if (table) table.style.display = 'none';

        const { data, error } = await window.supabase
            .from('exam_questions')
            .select('*')
            .eq('exam_id', parseInt(examId))
            .order('question_number', { ascending: true });

        if (error) throw error;

        currentQuestions = data || [];
        renderQuestionsTable(currentQuestions);
        updateQuestionStats(currentQuestions);
        
        const countDisplay = document.getElementById('questionCountDisplay');
        const totalMarksEl = document.getElementById('questionTotalMarks');
        
        if (countDisplay) countDisplay.textContent = currentQuestions.length;
        if (totalMarksEl) {
            const totalMarks = currentQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);
            totalMarksEl.textContent = totalMarks;
        }

        // Update badge
        const badge = document.getElementById('questionBankBadge');
        if (badge) badge.textContent = currentQuestions.length;

        console.log(`✅ Loaded ${currentQuestions.length} questions for exam ${examId}`);
    } catch (error) {
        console.error('Error loading questions:', error);
        showToast('❌ Error loading questions: ' + error.message, 'error');
        const loading = document.getElementById('questionsLoading');
        if (loading) {
            loading.innerHTML = '❌ Error loading questions';
            loading.style.color = '#DC2626';
        }
    }
}

// ============================================================
// RENDER QUESTIONS TABLE
// ============================================================
function renderQuestionsTable(questions) {
    const tbody = document.getElementById('questionsBody');
    const table = document.getElementById('questionsTable');
    const loading = document.getElementById('questionsLoading');

    if (!tbody) return;

    if (!questions || questions.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="6" style="text-align:center; padding:30px; color:#94a3b8;">
                <i class="fas fa-plus-circle" style="font-size:24px; display:block; margin-bottom:8px;"></i>
                No questions found. Click "Add Question" to create one.
            </td></tr>
        `;
        if (table) table.style.display = 'table';
        if (loading) loading.style.display = 'none';
        return;
    }

    let html = '';
    questions.forEach((q, index) => {
        const isMcq = q.option_a || q.option_b || q.option_c || q.option_d;
        const type = isMcq ? 'Multiple Choice' : 'Essay';
        const correct = q.correct_answer || 'N/A';
        const questionText = q.question_text.length > 60 ? q.question_text.substring(0, 60) + '...' : q.question_text;

        html += `
            <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 8px 12px; text-align: center; font-weight: 600; color: #94a3b8;">${index + 1}</td>
                <td style="padding: 8px 12px; color: #1e293b;">${questionText}</td>
                <td style="padding: 8px 12px; text-align: center;">
                    <span style="padding: 2px 10px; border-radius: 20px; font-size: 10px; font-weight: 600; background: ${isMcq ? '#DBEAFE' : '#FEF3C7'}; color: ${isMcq ? '#1E40AF' : '#92400E'};">
                        ${type}
                    </span>
                </td>
                <td style="padding: 8px 12px; text-align: center; font-weight: 600;">${q.marks || 1}</td>
                <td style="padding: 8px 12px; text-align: center; font-weight: 600; color: ${correct !== 'N/A' ? '#059669' : '#94a3b8'};">
                    ${correct}
                </td>
                <td style="padding: 8px 12px; text-align: center;">
                    <button onclick="editQuestion('${q.id}')" style="background: #E0E7FF; color: #3730A3; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 11px; margin-right: 4px;">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button onclick="deleteQuestion('${q.id}')" style="background: #FEE2E2; color: #991B1B; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 11px;">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    if (table) table.style.display = 'table';
    if (loading) loading.style.display = 'none';
}

// ============================================================
// UPDATE QUESTION STATS
// ============================================================
function updateQuestionStats(questions) {
    const container = document.getElementById('questionStats');
    if (!container) return;
    
    const total = questions ? questions.length : 0;
    const mcqCount = questions ? questions.filter(q => q.option_a || q.option_b || q.option_c || q.option_d).length : 0;
    const essayCount = total - mcqCount;
    const totalMarks = questions ? questions.reduce((sum, q) => sum + (q.marks || 1), 0) : 0;

    container.innerHTML = `
        <div style="background: white; border-radius: 10px; padding: 14px 16px; border: 1px solid #e5e7eb; text-align: center;">
            <div style="font-size: 0.6rem; color: #94a3b8; text-transform: uppercase;">Total Questions</div>
            <div style="font-size: 1.5rem; font-weight: 700; color: #0A3D62;">${total}</div>
        </div>
        <div style="background: white; border-radius: 10px; padding: 14px 16px; border: 1px solid #e5e7eb; text-align: center;">
            <div style="font-size: 0.6rem; color: #94a3b8; text-transform: uppercase;">Multiple Choice</div>
            <div style="font-size: 1.5rem; font-weight: 700; color: #1E40AF;">${mcqCount}</div>
        </div>
        <div style="background: white; border-radius: 10px; padding: 14px 16px; border: 1px solid #e5e7eb; text-align: center;">
            <div style="font-size: 0.6rem; color: #94a3b8; text-transform: uppercase;">Essay</div>
            <div style="font-size: 1.5rem; font-weight: 700; color: #92400E;">${essayCount}</div>
        </div>
        <div style="background: white; border-radius: 10px; padding: 14px 16px; border: 1px solid #e5e7eb; text-align: center;">
            <div style="font-size: 0.6rem; color: #94a3b8; text-transform: uppercase;">Total Marks</div>
            <div style="font-size: 1.5rem; font-weight: 700; color: #059669;">${totalMarks}</div>
        </div>
    `;
}

// ============================================================
// OPEN ADD QUESTION MODAL
// ============================================================
function openAddQuestion() {
    console.log('📝 openAddQuestion called');
    
    const examSelect = document.getElementById('questionExamSelect');
    if (!examSelect || !examSelect.value) {
        showToast('⚠️ Please select an exam first', 'warning');
        return;
    }

    // Reset form
    document.getElementById('questionModalTitle').textContent = 'Add New Question';
    document.getElementById('questionId').value = '';
    document.getElementById('questionExamId').value = examSelect.value;
    document.getElementById('questionText').value = '';
    document.getElementById('optionA').value = '';
    document.getElementById('optionB').value = '';
    document.getElementById('optionC').value = '';
    document.getElementById('optionD').value = '';
    document.getElementById('correctAnswer').value = '';
    document.getElementById('questionType').value = 'multiple_choice';
    document.getElementById('questionMarks').value = '1';
    document.getElementById('maxChars').value = '5000';
    
    toggleQuestionType();
    document.getElementById('questionModal').style.display = 'flex';
    console.log('✅ Question modal opened');
}

// ============================================================
// EDIT QUESTION
// ============================================================
async function editQuestion(questionId) {
    console.log('📝 editQuestion called for:', questionId);
    try {
        const { data, error } = await window.supabase
            .from('exam_questions')
            .select('*')
            .eq('id', questionId)
            .single();

        if (error) throw error;

        document.getElementById('questionModalTitle').textContent = 'Edit Question';
        document.getElementById('questionId').value = data.id;
        document.getElementById('questionExamId').value = data.exam_id;
        document.getElementById('questionType').value = data.question_type || 'multiple_choice';
        document.getElementById('questionText').value = data.question_text || '';
        document.getElementById('optionA').value = data.option_a || '';
        document.getElementById('optionB').value = data.option_b || '';
        document.getElementById('optionC').value = data.option_c || '';
        document.getElementById('optionD').value = data.option_d || '';
        document.getElementById('correctAnswer').value = data.correct_answer || '';
        document.getElementById('questionMarks').value = data.marks || 1;
        document.getElementById('maxChars').value = data.max_characters || 5000;

        toggleQuestionType();
        document.getElementById('questionModal').style.display = 'flex';
    } catch (error) {
        console.error('Error loading question:', error);
        showToast('❌ Error loading question: ' + error.message, 'error');
    }
}

// ============================================================
// TOGGLE QUESTION TYPE
// ============================================================
function toggleQuestionType() {
    const type = document.getElementById('questionType');
    if (!type) return;
    
    const mcqOptions = document.getElementById('mcqOptions');
    const essayOptions = document.getElementById('essayOptions');

    if (type.value === 'essay') {
        if (mcqOptions) mcqOptions.style.display = 'none';
        if (essayOptions) essayOptions.style.display = 'block';
    } else {
        if (mcqOptions) mcqOptions.style.display = 'block';
        if (essayOptions) essayOptions.style.display = 'none';
    }
}

// ============================================================
// SAVE QUESTION
// ============================================================
async function saveQuestion() {
    console.log('📝 saveQuestion called');
    
    const id = document.getElementById('questionId')?.value;
    const examId = parseInt(document.getElementById('questionExamId')?.value);
    const questionType = document.getElementById('questionType')?.value;
    const questionText = document.getElementById('questionText')?.value?.trim();
    const optionA = document.getElementById('optionA')?.value?.trim();
    const optionB = document.getElementById('optionB')?.value?.trim();
    const optionC = document.getElementById('optionC')?.value?.trim();
    const optionD = document.getElementById('optionD')?.value?.trim();
    const correctAnswer = document.getElementById('correctAnswer')?.value;
    const marks = parseInt(document.getElementById('questionMarks')?.value) || 1;
    const maxChars = parseInt(document.getElementById('maxChars')?.value) || 5000;

    // Validation
    if (!questionText) {
        showToast('⚠️ Please enter the question text', 'warning');
        return;
    }

    if (questionType === 'multiple_choice') {
        if (!optionA || !optionB) {
            showToast('⚠️ Please enter at least options A and B', 'warning');
            return;
        }
        if (!correctAnswer) {
            showToast('⚠️ Please select the correct answer', 'warning');
            return;
        }
    }

    const questionData = {
        exam_id: examId,
        question_type: questionType,
        question_text: questionText,
        option_a: optionA || null,
        option_b: optionB || null,
        option_c: optionC || null,
        option_d: optionD || null,
        correct_answer: correctAnswer || null,
        marks: marks,
        max_characters: maxChars,
        updated_at: new Date().toISOString()
    };

    try {
        let result;
        if (id) {
            console.log('📝 Updating question:', id);
            result = await window.supabase
                .from('exam_questions')
                .update(questionData)
                .eq('id', id);
        } else {
            console.log('📝 Creating new question');
            // Get next question number
            const { data: existing } = await window.supabase
                .from('exam_questions')
                .select('question_number')
                .eq('exam_id', examId)
                .order('question_number', { ascending: false })
                .limit(1);
            
            const nextNumber = existing && existing.length > 0 ? (existing[0].question_number || 0) + 1 : 1;
            questionData.question_number = nextNumber;
            questionData.created_at = new Date().toISOString();
            
            result = await window.supabase
                .from('exam_questions')
                .insert([questionData]);
        }

        if (result.error) {
            console.error('❌ Supabase error:', result.error);
            throw result.error;
        }

        console.log('✅ Question saved successfully!');
        showToast(`✅ Question ${id ? 'updated' : 'created'} successfully!`, 'success');
        
        // Close modal
        closeQuestionModal();
        
        // Reload questions
        await loadQuestionsForExam();
        
        // Update badge
        const badge = document.getElementById('questionBankBadge');
        if (badge) badge.textContent = currentQuestions.length;
        
    } catch (error) {
        console.error('❌ Error saving question:', error);
        showToast('❌ Error saving question: ' + error.message, 'error');
    }
}

// ============================================================
// DELETE QUESTION
// ============================================================
async function deleteQuestion(questionId) {
    console.log('🗑️ deleteQuestion called for:', questionId);
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
        const { error } = await window.supabase
            .from('exam_questions')
            .delete()
            .eq('id', questionId);
            
        if (error) throw error;

        showToast('✅ Question deleted successfully!', 'success');
        await loadQuestionsForExam();
        
        const badge = document.getElementById('questionBankBadge');
        if (badge) badge.textContent = currentQuestions.length;
    } catch (error) {
        console.error('Error deleting question:', error);
        showToast('❌ Error deleting question: ' + error.message, 'error');
    }
}

// ============================================================
// CLOSE QUESTION MODAL
// ============================================================
function closeQuestionModal() {
    const modal = document.getElementById('questionModal');
    if (modal) modal.style.display = 'none';
    console.log('📝 Question modal closed');
}

// ============================================================
// REFRESH QUESTIONS
// ============================================================
function refreshQuestions() {
    console.log('🔄 Refreshing questions...');
    loadExamsForQuestions();
    showToast('🔄 Refreshing questions...', 'info');
}

// ============================================================
// 📋 PENDING QUESTIONS - APPROVAL
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
    groups.forEach((group) => {
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
// ✅ EXPOSE ALL FUNCTIONS GLOBALLY
// ============================================================

// Question Bank Functions
window.loadExamsForQuestions = loadExamsForQuestions;
window.loadQuestionsForExam = loadQuestionsForExam;
window.renderQuestionsTable = renderQuestionsTable;
window.updateQuestionStats = updateQuestionStats;
window.openAddQuestion = openAddQuestion;
window.editQuestion = editQuestion;
window.toggleQuestionType = toggleQuestionType;
window.saveQuestion = saveQuestion;
window.deleteQuestion = deleteQuestion;
window.closeQuestionModal = closeQuestionModal;
window.refreshQuestions = refreshQuestions;

// Pending Questions Functions
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

console.log('✅ Admin Questions + Pending Questions module loaded!');
