// ============================================================
// 📝 LECTURER QUESTIONS - WITH OWNERSHIP CHECK
// Lecturers can ONLY see and edit questions for exams THEY created
// ============================================================

const LecturerQuestions = {
    // HTML-safe output helper used by bulk preview and question rendering
    esc: function(value) {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },
    currentQuestions: [],
    currentExamId: null,
    lecturerUuid: null,
    lecturerAssignmentId: null,

    /**
     * Initialize the question bank
     */
    init: function() {
        console.log('📝 LecturerQuestions initialized');
        this.resolveLecturerId();
        this.loadExams();
    },

    /**
     * Resolve the correct lecturer ID
     */
    resolveLecturerId: function() {
        try {
            const profile = window.lecturerDB?.getCurrentUserProfile();
            if (profile) {
                this.lecturerUuid = profile.user_id;
                console.log('👤 Lecturer UUID:', this.lecturerUuid);
            } else {
                const session = localStorage.getItem('staffSession');
                if (session) {
                    const data = JSON.parse(session);
                    this.lecturerUuid = data.user_id || data.id;
                    console.log('👤 Lecturer UUID (from session):', this.lecturerUuid);
                }
            }
        } catch (error) {
            console.error('Error resolving lecturer ID:', error);
        }
    },

    /**
     * Get supabase client
     */
    getSupabase: function() {
        const sb = window.supabase || 
                   window.supabaseClient || 
                   window._supabase || 
                   window.sb;
        
        if (sb && typeof sb.from === 'function') {
            return sb;
        }
        
        if (window.lecturerDB?.supabase) {
            return window.lecturerDB.supabase;
        }
        
        console.error('❌ No supabase client available');
        return null;
    },

    /**
     * Load exams - ONLY SHOW EXAMS CREATED BY THIS LECTURER
     */
    loadExams: async function() {
        const select = document.getElementById('lecQuestionExamSelect');
        if (!select) {
            console.warn('⚠️ lecQuestionExamSelect not found');
            return;
        }

        try {
            console.log('📚 Loading exams created by lecturer...');
            
            if (!this.lecturerUuid) {
                this.resolveLecturerId();
            }
            
            const sb = this.getSupabase();
            if (!sb) {
                select.innerHTML = '<option value="">-- System error --</option>';
                return;
            }
            
            const lecturerId = this.lecturerUuid;
            
            if (!lecturerId) {
                select.innerHTML = '<option value="">-- Please login --</option>';
                return;
            }
            
            console.log('🔍 Filtering exams by created_by:', lecturerId);
            
            // ✅ ONLY get exams created by this lecturer
            // NOTE: 'unit' column does not exist on exams table.
            const { data, error } = await sb
                .from('exams')
                .select('id, title, exam_name, status, created_by')
                .eq('created_by', lecturerId)
                .order('title');
            
            if (error) {
                console.error('❌ Error fetching exams:', error);
                select.innerHTML = '<option value="">-- Error loading exams --</option>';
                return;
            }
            
            console.log('📚 Exams found:', data?.length || 0);
            
            // Populate dropdown
            select.innerHTML = '<option value="">-- Select an exam --</option>';
            
            if (data && data.length > 0) {
                data.forEach(exam => {
                    const option = document.createElement('option');
                    option.value = exam.id;
                    const displayName = exam.title || exam.exam_name || 'Untitled Exam';
                    option.textContent = displayName;
                    select.appendChild(option);
                });
                
                // Auto-select first exam
                select.value = data[0].id;
                console.log('✅ Selected:', data[0].title || data[0].exam_name);
                
                // Load questions for the selected exam
                await this.loadQuestions();
                
            } else {
                select.innerHTML = '<option value="">-- No exams created --</option>';
                console.log('⚠️ No exams created by this lecturer');
                
                // Show helpful message
                const container = document.getElementById('lecQuestionStats');
                if (container) {
                    container.innerHTML = `
                        <div style="background: #fef3c7; padding: 20px; border-radius: 12px; text-align: center; border: 1px solid #fde68a; grid-column: 1 / -1;">
                            <i class="fas fa-info-circle" style="font-size: 24px; color: #d97706; display: block; margin-bottom: 8px;"></i>
                            <p style="color: #92400e; font-weight: 500;">You haven't created any exams yet.</p>
                            <p style="color: #92400e; font-size: 13px;">Create an exam first, then you can add questions to it.</p>
                        </div>
                    `;
                }
            }

        } catch (error) {
            console.error('❌ Error loading exams:', error);
            const select = document.getElementById('lecQuestionExamSelect');
            if (select) {
                select.innerHTML = '<option value="">-- Error loading exams --</option>';
            }
        }
    },

    /**
     * Get lecturer data from session
     */
    getLecturerData: function() {
        try {
            const session = localStorage.getItem('staffSession');
            if (session) {
                return JSON.parse(session);
            }
            const profile = localStorage.getItem('userProfile');
            if (profile) {
                return JSON.parse(profile);
            }
            return {};
        } catch (e) {
            return {};
        }
    },

    /**
     * Load questions for selected exam - ONLY IF LECTURER OWNS THE EXAM
     */
    loadQuestions: async function() {
        const select = document.getElementById('lecQuestionExamSelect');
        const examId = select?.value;

        if (!examId) {
            const tbody = document.getElementById('lecQuestionsTable');
            if (tbody) {
                tbody.innerHTML = `
                    <tr><td colspan="6" style="text-align:center; padding:30px; color:#94a3b8;">
                        <i class="fas fa-info-circle" style="font-size:24px; display:block; margin-bottom:8px;"></i>
                        Select an exam to view questions
                    </td></tr>
                `;
            }
            this.updateCounts(0, 0);
            return;
        }

        this.currentExamId = examId;

        try {
            const tbody = document.getElementById('lecQuestionsTable');
            if (tbody) {
                tbody.innerHTML = `
                    <tr><td colspan="6" style="text-align:center; padding:30px; color:#94a3b8;">
                        <div style="display:inline-block; width:30px; height:30px; border:3px solid #e2e8f0; border-top:3px solid #4C1D95; border-radius:50%; animation:spin 1s linear infinite;"></div>
                        <p style="margin:10px 0 0 0;">Loading questions...</p>
                    </td></tr>
                `;
            }

            const sb = this.getSupabase();
            if (!sb) {
                throw new Error('Supabase client not available');
            }

            // ✅ First verify the lecturer owns this exam
            const { data: examCheck, error: examError } = await sb
                .from('exams')
                .select('created_by')
                .eq('id', parseInt(examId))
                .single();

            if (examError) {
                throw new Error('Exam not found');
            }

            // ✅ Check ownership - ONLY if created_by matches lecturer UUID
            if (examCheck.created_by !== this.lecturerUuid) {
                tbody.innerHTML = `
                    <tr><td colspan="6" style="text-align:center; padding:30px; color:#dc2626;">
                        <i class="fas fa-lock" style="font-size:24px; display:block; margin-bottom:8px;"></i>
                        <strong>Access Denied</strong>
                        <p style="margin:4px 0 0 0; font-size:13px; color:#94a3b8;">You can only view questions for exams you created.</p>
                    </td></tr>
                `;
                this.updateCounts(0, 0);
                return;
            }

            // ✅ Load questions for the exam
            const { data, error } = await sb
                .from('exam_questions')
                .select('*')
                .eq('exam_id', parseInt(examId))
                .order('question_number', { ascending: true });

            if (error) throw error;

            this.currentQuestions = data || [];
            this.renderQuestions(this.currentQuestions);
            this.updateStats(this.currentQuestions);

            // Update counts
            const totalMarks = this.currentQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);
            this.updateCounts(this.currentQuestions.length, totalMarks);

        } catch (error) {
            console.error('Error loading questions:', error);
            const tbody = document.getElementById('lecQuestionsTable');
            if (tbody) {
                tbody.innerHTML = `
                    <tr><td colspan="6" style="text-align:center; padding:20px; color:#dc2626;">
                        ❌ Error loading questions: ${error.message}
                    </td></tr>
                `;
            }
        }
    },

    /**
     * Update question counts display
     */
    updateCounts: function(count, marks) {
        const countEl = document.getElementById('lecQuestionCount');
        const marksEl = document.getElementById('lecQuestionTotalMarks');
        const displayEl = document.getElementById('lecQuestionCountDisplay');
        if (countEl) countEl.textContent = count;
        if (marksEl) marksEl.textContent = marks;
        if (displayEl) displayEl.textContent = count;
    },

    /**
     * Render questions in the table
     */
    renderQuestions: function(questions) {
        const tbody = document.getElementById('lecQuestionsTable');
        if (!tbody) return;

        if (!questions || questions.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="6" style="text-align:center; padding:30px; color:#94a3b8;">
                    <i class="fas fa-plus-circle" style="font-size:24px; display:block; margin-bottom:8px;"></i>
                    No questions found. Click "Add Question" to create one.
                </td></tr>
            `;
            return;
        }

        let html = '';
        questions.forEach((q, index) => {
            const isMcq = q.question_type === 'mcq' || q.question_type === 'multiple_choice';
            const type = isMcq ? 'Multiple Choice' : 'Essay';
            const questionText = q.question_text.length > 60 ? q.question_text.substring(0, 60) + '...' : q.question_text;

            // Status badge
            const statusMap = {
                'pending': { label: '⏳ Pending', class: 'status-pending' },
                'approved': { label: '✅ Approved', class: 'status-approved' },
                'rejected': { label: '❌ Rejected', class: 'status-rejected' }
            };
            const status = statusMap[q.status] || statusMap.pending;
            const canEdit = q.status === 'pending' || q.status === 'rejected';

            html += `
                <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 10px 12px; text-align: center; font-weight: 600; color: #94a3b8;">${index + 1}</td>
                    <td style="padding: 10px 12px; color: #1e293b;">${questionText}</td>
                    <td style="padding: 10px 12px;">
                        <span style="padding: 2px 10px; border-radius: 20px; font-size: 10px; font-weight: 600; background: ${isMcq ? '#DBEAFE' : '#FEF3C7'}; color: ${isMcq ? '#1E40AF' : '#92400E'};">
                            ${type}
                        </span>
                    </td>
                    <td style="padding: 10px 12px; text-align: center; font-weight: 600;">${q.marks || 1}</td>
                    <td style="padding: 10px 12px; text-align: center;">
                        <span style="padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; 
                            ${q.status === 'approved' ? 'background: #d1fae5; color: #065f46;' : 
                              q.status === 'pending' ? 'background: #fef3c7; color: #92400e;' : 
                              'background: #fee2e2; color: #991b1b;'}">
                            ${status.label}
                        </span>
                        ${q.rejection_reason ? `<br><small style="color:#dc2626; font-size:10px;">${q.rejection_reason}</small>` : ''}
                    </td>
                    <td style="padding: 10px 12px; text-align: center;">
                        ${canEdit ? `
                            <button onclick="LecturerQuestions.editQuestion('${q.id}')" style="background: #4C1D95; color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 11px; margin-right: 4px;">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button onclick="LecturerQuestions.deleteQuestion('${q.id}')" style="background: #dc2626; color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 11px;">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : `
                            <button onclick="LecturerQuestions.viewQuestion('${q.id}')" style="background: #3b82f6; color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 11px;">
                                <i class="fas fa-eye"></i> View
                            </button>
                        `}
                        ${q.status === 'rejected' ? `
                            <button onclick="LecturerQuestions.resubmitQuestion('${q.id}')" style="background: #f59e0b; color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 11px; margin-top: 4px; display:block;">
                                <i class="fas fa-redo"></i> Resubmit
                            </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    },

    /**
     * Update statistics
     */
    updateStats: function(questions) {
        const total = questions ? questions.length : 0;
        const pending = questions ? questions.filter(q => q.status === 'pending').length : 0;
        const approved = questions ? questions.filter(q => q.status === 'approved').length : 0;
        const rejected = questions ? questions.filter(q => q.status === 'rejected').length : 0;

        const totalEl = document.getElementById('lecTotalQuestions');
        const pendingEl = document.getElementById('lecPendingQuestionsStat');
        const approvedEl = document.getElementById('lecApprovedQuestionsStat');
        const rejectedEl = document.getElementById('lecRejectedQuestionsStat');
        const pendingBadge = document.getElementById('lecPendingQuestions');
        const approvedBadge = document.getElementById('lecApprovedQuestions');

        if (totalEl) totalEl.textContent = total;
        if (pendingEl) pendingEl.textContent = pending;
        if (approvedEl) approvedEl.textContent = approved;
        if (rejectedEl) rejectedEl.textContent = rejected;
        if (pendingBadge) pendingBadge.textContent = pending;
        if (approvedBadge) approvedBadge.textContent = approved;
    },

    /**
     * Refresh function
     */
    refresh: function() {
        console.log('🔄 Refreshing questions...');
        this.resolveLecturerId();
        this.loadExams();
        if (window.showToast) {
            window.showToast('✅ Questions refreshed', 'success');
        }
    },

    /**
     * Open Add Question Modal
     */

    requireSelectedExam: function() {
        const select = document.getElementById('lecQuestionExamSelect');
        const examId = select && select.value;

        if (!examId) {
            if (window.showToast) {
                window.showToast('⚠️ Please select an exam first before uploading questions.', 'warning');
            } else {
                alert('Please select an exam first before uploading questions.');
            }
            return false;
        }

        this.currentExamId = examId;
        return true;
    },

    openAddModal: function() {
        if (!this.requireSelectedExam()) return;
        const examSelect = document.getElementById('lecQuestionExamSelect');
        if (!examSelect || !examSelect.value) {
            if (window.showToast) {
                window.showToast('⚠️ Please select an exam first', 'warning');
            }
            return;
        }

        // Reset form
        document.getElementById('lecQuestionModalTitle').textContent = 'Add New Question';
        document.getElementById('lecQuestionId').value = '';
        document.getElementById('lecQuestionExamId').value = examSelect.value;
        document.getElementById('lecQuestionText').value = '';
        document.getElementById('lecOptionA').value = '';
        document.getElementById('lecOptionB').value = '';
        document.getElementById('lecOptionC').value = '';
        document.getElementById('lecOptionD').value = '';
        document.getElementById('lecCorrectAnswer').value = '';
        document.getElementById('lecQuestionType').value = 'mcq';
        document.getElementById('lecQuestionMarks').value = '1';
        document.getElementById('lecMaxChars').value = '500';
        
        this.toggleType();
        document.getElementById('lecQuestionModal').style.display = 'flex';
    },

    /**
     * Toggle between MCQ and Essay fields
     */
    toggleType: function() {
        const type = document.getElementById('lecQuestionType');
        const mcqOptions = document.getElementById('lecMcqOptions');
        const essayOptions = document.getElementById('lecEssayOptions');

        if (!type || !mcqOptions || !essayOptions) return;

        if (type.value === 'essay' || type.value === 'written') {
            mcqOptions.style.display = 'none';
            essayOptions.style.display = 'block';
        } else {
            mcqOptions.style.display = 'block';
            essayOptions.style.display = 'none';
        }
    },

    /**
     * Edit a question
     */
    editQuestion: async function(questionId) {
        try {
            const sb = this.getSupabase();
            if (!sb) throw new Error('Supabase not available');

            const { data, error } = await sb
                .from('exam_questions')
                .select('*')
                .eq('id', questionId)
                .single();

            if (error) throw error;

            document.getElementById('lecQuestionModalTitle').textContent = 'Edit Question';
            document.getElementById('lecQuestionId').value = data.id;
            document.getElementById('lecQuestionExamId').value = data.exam_id;
            document.getElementById('lecQuestionType').value = data.question_type || 'mcq';
            document.getElementById('lecQuestionText').value = data.question_text || '';
            document.getElementById('lecOptionA').value = data.option_a || '';
            document.getElementById('lecOptionB').value = data.option_b || '';
            document.getElementById('lecOptionC').value = data.option_c || '';
            document.getElementById('lecOptionD').value = data.option_d || '';
            document.getElementById('lecCorrectAnswer').value = data.correct_answer || '';
            document.getElementById('lecQuestionMarks').value = data.marks || 1;
            document.getElementById('lecMaxChars').value = data.max_chars || 500;

            this.toggleType();
            document.getElementById('lecQuestionModal').style.display = 'flex';

        } catch (error) {
            console.error('Error loading question:', error);
            if (window.showToast) {
                window.showToast('❌ Error loading question: ' + error.message, 'error');
            }
        }
    },

    /**
     * Save question (Create or Update)
     */
    saveQuestion: async function() {
        const id = document.getElementById('lecQuestionId')?.value;
        const examId = parseInt(document.getElementById('lecQuestionExamId')?.value);
        const questionType = document.getElementById('lecQuestionType')?.value;
        const questionText = document.getElementById('lecQuestionText')?.value?.trim();
        const optionA = document.getElementById('lecOptionA')?.value?.trim();
        const optionB = document.getElementById('lecOptionB')?.value?.trim();
        const optionC = document.getElementById('lecOptionC')?.value?.trim();
        const optionD = document.getElementById('lecOptionD')?.value?.trim();
        const correctAnswer = document.getElementById('lecCorrectAnswer')?.value;
        const marks = parseInt(document.getElementById('lecQuestionMarks')?.value) || 1;
        const maxChars = parseInt(document.getElementById('lecMaxChars')?.value) || 500;

        // Validation
        if (!questionText) {
            if (window.showToast) window.showToast('⚠️ Please enter the question text', 'warning');
            return;
        }

        if (questionType === 'mcq' || questionType === 'multiple_choice') {
            if (!optionA || !optionB) {
                if (window.showToast) window.showToast('⚠️ Please enter at least options A and B', 'warning');
                return;
            }
            if (!correctAnswer) {
                if (window.showToast) window.showToast('⚠️ Please select the correct answer', 'warning');
                return;
            }
        }

        // Get lecturer data
        const lecturerData = this.getLecturerData();
        const lecturerId = this.lecturerUuid || lecturerData.staff_id || lecturerData.id || lecturerData.user_id;

        // Get next question number
        let nextNumber = 1;
        if (!id) {
            const sb = this.getSupabase();
            if (sb) {
                const { data: existing } = await sb
                    .from('exam_questions')
                    .select('question_number')
                    .eq('exam_id', examId)
                    .order('question_number', { ascending: false })
                    .limit(1);
                
                nextNumber = existing && existing.length > 0 ? (existing[0].question_number || 0) + 1 : 1;
            }
        }

        const questionData = {
            exam_id: examId,
            question_number: nextNumber,
            question_type: questionType,
            question_text: questionText,
            option_a: optionA || null,
            option_b: optionB || null,
            option_c: optionC || null,
            option_d: optionD || null,
            correct_answer: correctAnswer || null,
            marks: marks,
            max_chars: maxChars,
            status: 'pending',
            created_by: 'lecturer',
            lecturer_id: lecturerId,
            submitted_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        try {
            const sb = this.getSupabase();
            if (!sb) throw new Error('Supabase not available');

            let result;
            if (id) {
                // Update existing - check ownership first
                const { data: existing } = await sb
                    .from('exam_questions')
                    .select('status')
                    .eq('id', id)
                    .single();

                const newStatus = existing?.status === 'rejected' ? 'pending' : existing?.status;
                
                const updateData = {
                    ...questionData,
                    status: newStatus || 'pending',
                    resubmitted_at: existing?.status === 'rejected' ? new Date().toISOString() : null,
                    updated_at: new Date().toISOString()
                };
                delete updateData.question_number;

                result = await sb
                    .from('exam_questions')
                    .update(updateData)
                    .eq('id', id);
            } else {
                // Create new
                result = await sb
                    .from('exam_questions')
                    .insert([questionData]);
            }

            if (result.error) throw result.error;

            if (window.showToast) {
                window.showToast('✅ Question submitted for admin approval!', 'success');
            }
            
            this.closeModal();
            await this.loadQuestions();

        } catch (error) {
            console.error('Error saving question:', error);
            if (window.showToast) {
                window.showToast('❌ Error saving question: ' + error.message, 'error');
            }
        }
    },

    /**
     * Delete a question
     */
    deleteQuestion: async function(questionId) {
        if (!confirm('Are you sure you want to delete this question?')) return;

        try {
            const sb = this.getSupabase();
            if (!sb) throw new Error('Supabase not available');

            const { error } = await sb
                .from('exam_questions')
                .delete()
                .eq('id', questionId);

            if (error) throw error;

            if (window.showToast) {
                window.showToast('✅ Question deleted successfully!', 'success');
            }
            await this.loadQuestions();

        } catch (error) {
            console.error('Error deleting question:', error);
            if (window.showToast) {
                window.showToast('❌ Error deleting question: ' + error.message, 'error');
            }
        }
    },

    /**
     * View a question (read-only)
     */
    viewQuestion: async function(questionId) {
        try {
            const sb = this.getSupabase();
            if (!sb) throw new Error('Supabase not available');

            const { data, error } = await sb
                .from('exam_questions')
                .select('*')
                .eq('id', questionId)
                .single();

            if (error) throw error;

            const isMcq = data.question_type === 'mcq' || data.question_type === 'multiple_choice';
            let details = `📝 Question Details\n\n`;
            details += `Question: ${data.question_text}\n\n`;
            details += `Type: ${isMcq ? 'Multiple Choice' : 'Essay'}\n`;
            details += `Marks: ${data.marks || 1}\n`;
            details += `Status: ${data.status || 'Pending'}\n`;
            
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
            console.error('Error viewing question:', error);
            if (window.showToast) {
                window.showToast('❌ Error loading question', 'error');
            }
        }
    },

    /**
     * Resubmit a rejected question
     */
    resubmitQuestion: async function(questionId) {
        if (!confirm('Resubmit this question for admin approval?')) return;

        try {
            const sb = this.getSupabase();
            if (!sb) throw new Error('Supabase not available');

            const { error } = await sb
                .from('exam_questions')
                .update({
                    status: 'pending',
                    rejection_reason: null,
                    resubmitted_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', questionId);

            if (error) throw error;

            if (window.showToast) {
                window.showToast('✅ Question resubmitted for approval!', 'success');
            }
            await this.loadQuestions();

        } catch (error) {
            console.error('Error resubmitting question:', error);
            if (window.showToast) {
                window.showToast('❌ Error resubmitting question: ' + error.message, 'error');
            }
        }
    },

    /**
     * ============================================================
     * BULK QUESTION IMPORT - FULL DOCUMENT PASTE / EXCEL / CSV
     * ============================================================
     */
    bulkParsedQuestions: [],

    getSelectedExamId: function() {
        const select = document.getElementById('lecQuestionExamSelect');
        return select?.value || this.currentExamId || '';
    },

    verifyExamOwnership: async function(examId) {
        const sb = this.getSupabase();
        if (!sb) throw new Error('Supabase not available');

        if (!this.lecturerUuid) this.resolveLecturerId();
        if (!this.lecturerUuid) throw new Error('Lecturer session not found. Please login again.');

        const { data, error } = await sb
            .from('exams')
            .select('id, title, exam_name, created_by')
            .eq('id', parseInt(examId, 10))
            .single();

        if (error) throw error;
        if (!data || data.created_by !== this.lecturerUuid) {
            throw new Error('Access denied. You can only add questions to exams you created.');
        }
        return data;
    },

    openPasteBulkModal: async function() {
        const examId = this.getSelectedExamId();
        if (!examId) {
            if (window.showToast) window.showToast('⚠️ Please select an exam first', 'warning');
            return;
        }

        try {
            await this.verifyExamOwnership(examId);
            const modal = document.getElementById('lecBulkPasteModal');
            const textarea = document.getElementById('lecBulkPasteText');
            const preview = document.getElementById('lecBulkPastePreview');
            const uploadBtn = document.getElementById('lecBulkPasteUploadBtn');

            if (textarea) textarea.value = '';
            if (preview) preview.innerHTML = '<div style="padding:20px;text-align:center;color:#94a3b8;">Paste your questions, then click <strong>Parse & Preview</strong>.</div>';
            if (uploadBtn) uploadBtn.disabled = true;
            this.bulkParsedQuestions = [];
            this.currentExamId = examId;
            if (modal) modal.style.display = 'flex';
        } catch (error) {
            console.error('Bulk paste ownership check failed:', error);
            if (window.showToast) window.showToast('❌ ' + error.message, 'error');
        }
    },

    closePasteBulkModal: function() {
        const modal = document.getElementById('lecBulkPasteModal');
        if (modal) modal.style.display = 'none';
        this.bulkParsedQuestions = [];
        const uploadBtn = document.getElementById('lecBulkPasteUploadBtn');
        if (uploadBtn) uploadBtn.disabled = true;
    },

    openBulkUploadModal: function() {
        if (!this.requireSelectedExam()) return;
        const examId = this.getSelectedExamId();
        if (!examId) {
            if (window.showToast) window.showToast('⚠️ Please select an exam first', 'warning');
            return;
        }

        // Build the Excel/CSV modal dynamically so no additional HTML is required.
        let modal = document.getElementById('lecBulkFileModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'lecBulkFileModal';
            modal.style.cssText = 'display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.65);z-index:10001;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
            modal.innerHTML = `
                <div style="background:#fff;border-radius:16px;width:95%;max-width:700px;max-height:90vh;overflow:auto;box-shadow:0 20px 70px rgba(0,0,0,.35);">
                    <div style="padding:20px 24px;border-bottom:1px solid #e5e7eb;background:#f8fafc;display:flex;justify-content:space-between;align-items:center;">
                        <div>
                            <h3 style="margin:0;color:#0A3D62;font-size:19px;"><i class="fas fa-file-excel"></i> Excel / CSV Question Upload</h3>
                            <p style="margin:4px 0 0;color:#64748b;font-size:12px;">Upload a question bank using the supported columns.</p>
                        </div>
                        <button type="button" onclick="LecturerQuestions.closeBulkUploadModal()" style="background:none;border:none;font-size:28px;cursor:pointer;color:#94a3b8;">&times;</button>
                    </div>
                    <div style="padding:24px;">
                        <div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:12px 15px;border-radius:8px;margin-bottom:16px;color:#1e40af;font-size:13px;">
                            Columns: <strong>Question</strong>, <strong>Type</strong>, <strong>Marks</strong>, <strong>Option A</strong>, <strong>Option B</strong>, <strong>Option C</strong>, <strong>Option D</strong>, <strong>Correct Answer</strong>, <strong>Max Characters</strong>.
                        </div>
                        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;">
                            <button type="button" onclick="LecturerQuestions.downloadBulkTemplate()" style="padding:10px 16px;border:none;border-radius:8px;background:#0A3D62;color:#fff;cursor:pointer;font-weight:600;"><i class="fas fa-download"></i> Download Template</button>
                            <label style="padding:10px 16px;border-radius:8px;background:#059669;color:#fff;cursor:pointer;font-weight:600;display:inline-flex;align-items:center;gap:7px;">
                                <i class="fas fa-upload"></i> Choose File
                                <input id="lecBulkFileInput" type="file" accept=".xlsx,.xls,.csv" style="display:none;" onchange="LecturerQuestions.previewBulkFile(event)">
                            </label>
                        </div>
                        <div id="lecBulkFilePreview" style="min-height:120px;border:2px dashed #cbd5e1;border-radius:10px;padding:16px;color:#64748b;text-align:center;">Choose an Excel or CSV file to preview.</div>
                        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:18px;padding-top:16px;border-top:1px solid #e5e7eb;">
                            <button type="button" onclick="LecturerQuestions.closeBulkUploadModal()" style="padding:10px 20px;border:2px solid #e2e8f0;border-radius:8px;background:#fff;color:#64748b;cursor:pointer;font-weight:600;">Cancel</button>
                            <button type="button" id="lecBulkFileUploadBtn" disabled onclick="LecturerQuestions.uploadBulkFileQuestions()" style="padding:10px 22px;border:none;border-radius:8px;background:linear-gradient(135deg,#059669,#10b981);color:#fff;cursor:pointer;font-weight:600;"><i class="fas fa-cloud-upload-alt"></i> Upload All</button>
                        </div>
                    </div>
                </div>`;
            document.body.appendChild(modal);
        }

        modal.style.display = 'flex';
        const preview = document.getElementById('lecBulkFilePreview');
        if (preview) preview.innerHTML = 'Choose an Excel or CSV file to preview.';
        const btn = document.getElementById('lecBulkFileUploadBtn');
        if (btn) btn.disabled = true;
        this.bulkFileQuestions = [];
        this.currentExamId = examId;
    },

    closeBulkUploadModal: function() {
        const modal = document.getElementById('lecBulkFileModal');
        if (modal) modal.style.display = 'none';
        this.bulkFileQuestions = [];
    },

    normalizeBulkType: function(value, hasOptions) {
        const v = String(value || '').trim().toLowerCase().replace(/[-_ ]/g, '');
        if (v === 'essay' || v === 'written' || v === 'writtenanswer' || v === 'subjective' || v === 'shortanswer') return 'essay';
        if (v === 'mcq' || v === 'multiplechoice' || v === 'multiplechoicequestion') return 'multiple_choice';
        return hasOptions ? 'multiple_choice' : 'essay';
    },

    normalizeCorrectAnswer: function(value) {
        const raw = String(value || '').trim();
        if (!raw) return '';
        const m = raw.match(/^\s*([ABCD])(?:\s*[.)\-:]|\s|$)/i);
        return m ? m[1].toUpperCase() : raw.toUpperCase();
    },

    parsePastedQuestions: function(text) {
        if (!this.requireSelectedExam()) return;
        const source = String(text || '').replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ');
        if (!source.trim()) return [];

        const lines = source.split('\n').map(line => line.trimEnd());
        const starts = [];
        const startRegex = /^\s*(?:question\s*)?(\d{1,4})\s*[.)\-:]\s*(.*)$/i;
        lines.forEach((line, index) => {
            const m = line.match(startRegex);
            if (m) starts.push({ index, number: parseInt(m[1], 10), first: m[2] || '' });
        });

        // Also support documents where "Question 1" is on its own line.
        if (!starts.length) {
            lines.forEach((line, index) => {
                const m = line.match(/^\s*question\s+(\d+)\s*$/i);
                if (m) starts.push({ index, number: parseInt(m[1], 10), first: '' });
            });
        }

        if (!starts.length) throw new Error('No numbered questions were detected. Use formats such as "1.", "1)" or "Question 1:".');

        const questions = [];
        starts.forEach((start, i) => {
            const end = i + 1 < starts.length ? starts[i + 1].index : lines.length;
            const block = lines.slice(start.index, end);
            const q = {
                source_number: start.number,
                question_text: start.first.trim(),
                question_type: '',
                option_a: '', option_b: '', option_c: '', option_d: '',
                correct_answer: '',
                marks: 1,
                max_chars: 5000
            };

            let questionLines = [];
            let currentOption = null;
            let metadataStarted = false;

            const optionRegex = /^\s*([A-D])\s*[.)\-:]\s*(.*)$/i;
            const answerRegex = /^\s*(?:correct\s*answer|answer|ans)\s*[:.)\-]?\s*(.*)$/i;
            const marksRegex = /^\s*(?:marks?|score|points?)\s*[:=\-]?\s*(\d+(?:\.\d+)?)\s*$/i;
            const typeRegex = /^\s*(?:type|question\s*type)\s*[:=\-]?\s*(.+)$/i;
            const maxCharsRegex = /^\s*(?:max(?:imum)?\s*chars?|max(?:imum)?\s*characters?)\s*[:=\-]?\s*(\d+)\s*$/i;

            for (let j = 0; j < block.length; j++) {
                let line = block[j].trim();
                if (j === 0) line = q.question_text;
                if (!line) continue;

                let m = line.match(optionRegex);
                if (m) {
                    currentOption = m[1].toLowerCase();
                    q['option_' + currentOption] = m[2].trim();
                    metadataStarted = true;
                    continue;
                }

                m = line.match(answerRegex);
                if (m) {
                    q.correct_answer = this.normalizeCorrectAnswer(m[1]);
                    metadataStarted = true;
                    continue;
                }

                m = line.match(marksRegex);
                if (m) {
                    q.marks = Math.max(1, parseFloat(m[1]) || 1);
                    metadataStarted = true;
                    continue;
                }

                m = line.match(typeRegex);
                if (m) {
                    q.question_type = this.normalizeBulkType(m[1], !!(q.option_a || q.option_b));
                    metadataStarted = true;
                    continue;
                }

                m = line.match(maxCharsRegex);
                if (m) {
                    q.max_chars = Math.max(100, parseInt(m[1], 10) || 5000);
                    metadataStarted = true;
                    continue;
                }

                // Common inline form: "Correct answer is B".
                m = line.match(/^\s*(?:correct\s+answer|answer)\s+is\s*[:\-]?\s*([ABCD])/i);
                if (m) {
                    q.correct_answer = m[1].toUpperCase();
                    metadataStarted = true;
                    continue;
                }

                if (currentOption && !metadataStarted) {
                    q['option_' + currentOption] += (q['option_' + currentOption] ? ' ' : '') + line;
                } else if (currentOption && metadataStarted && !/^\s*(?:answer|correct|marks?|score|points?|type|max)/i.test(line)) {
                    q['option_' + currentOption] += (q['option_' + currentOption] ? ' ' : '') + line;
                } else if (!metadataStarted) {
                    questionLines.push(line);
                }
            }

            if (questionLines.length) {
                q.question_text = [q.question_text, ...questionLines.filter(x => x !== q.question_text)].filter(Boolean).join('\n').trim();
            }

            const hasOptions = !!(q.option_a || q.option_b);
            q.question_type = this.normalizeBulkType(q.question_type, hasOptions);
            questions.push(q);
        });

        return questions;
    },

    renderBulkPreview: function(questions, targetId) {
        const target = document.getElementById(targetId || 'lecBulkPastePreview');
        if (!target) return;
        if (!questions.length) {
            target.innerHTML = '<div style="padding:20px;text-align:center;color:#dc2626;">No questions detected.</div>';
            return;
        }

        let html = `<div style="margin-bottom:10px;padding:10px;background:#f0fdf4;border-radius:8px;color:#166534;font-size:13px;"><strong>${questions.length}</strong> questions detected. Review the preview before uploading.</div>`;
        questions.forEach((q, i) => {
            const mcq = q.question_type === 'multiple_choice';
            html += `<div style="border:1px solid #e2e8f0;border-radius:10px;padding:12px;margin-bottom:10px;background:#fff;">
                <div style="font-weight:700;color:#0A3D62;margin-bottom:6px;">${i + 1}. ${this.esc(q.question_text)}</div>
                ${mcq ? `<div style="font-size:12px;color:#475569;line-height:1.6;">
                    ${q.option_a ? `<div>A. ${this.esc(q.option_a)}</div>` : ''}
                    ${q.option_b ? `<div>B. ${this.esc(q.option_b)}</div>` : ''}
                    ${q.option_c ? `<div>C. ${this.esc(q.option_c)}</div>` : ''}
                    ${q.option_d ? `<div>D. ${this.esc(q.option_d)}</div>` : ''}
                    <div style="margin-top:4px;color:#166534;font-weight:600;">Answer: ${this.esc(q.correct_answer || 'Not supplied')}</div>
                </div>` : '<div style="font-size:12px;color:#92400e;">Essay / Written Answer</div>'}
                <div style="font-size:11px;color:#64748b;margin-top:6px;">Marks: ${q.marks} ${!mcq ? ' · Max characters: ' + q.max_chars : ''}</div>
            </div>`;
        });
        target.innerHTML = html;
    },

    previewPastedQuestions: async function() {
        const examId = this.getSelectedExamId();
        const textarea = document.getElementById('lecBulkPasteText');
        if (!examId || !textarea) return;

        try {
            await this.verifyExamOwnership(examId);
            const questions = this.parsePastedQuestions(textarea.value);
            const errors = [];
            questions.forEach((q, i) => {
                if (!q.question_text) errors.push(`Question ${i + 1}: missing question text`);
                if (q.question_type === 'multiple_choice') {
                    if (!q.option_a || !q.option_b) errors.push(`Question ${i + 1}: MCQ requires at least options A and B`);
                    if (!q.correct_answer || !/^[ABCD]$/.test(q.correct_answer)) errors.push(`Question ${i + 1}: valid Correct Answer A-D is required`);
                }
            });

            if (errors.length) {
                const preview = document.getElementById('lecBulkPastePreview');
                if (preview) preview.innerHTML = `<div style="padding:14px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;color:#991b1b;"><strong>Please correct these issues:</strong><ul style="margin:8px 0 0 18px;">${errors.slice(0, 20).map(e => `<li>${this.esc(e)}</li>`).join('')}</ul></div>`;
                const btn = document.getElementById('lecBulkPasteUploadBtn');
                if (btn) btn.disabled = true;
                this.bulkParsedQuestions = [];
                return;
            }

            this.bulkParsedQuestions = questions;
            this.renderBulkPreview(questions, 'lecBulkPastePreview');
            const btn = document.getElementById('lecBulkPasteUploadBtn');
            if (btn) btn.disabled = questions.length === 0;
            if (window.showToast) window.showToast(`✅ ${questions.length} questions detected`, 'success');
        } catch (error) {
            console.error('Error parsing pasted questions:', error);
            if (window.showToast) window.showToast('❌ ' + error.message, 'error');
        }
    },

    getNextQuestionNumber: async function(sb, examId) {
        const { data, error } = await sb
            .from('exam_questions')
            .select('question_number')
            .eq('exam_id', parseInt(examId, 10))
            .order('question_number', { ascending: false })
            .limit(1);
        if (error) throw error;
        return data && data.length ? (parseInt(data[0].question_number, 10) || 0) + 1 : 1;
    },

    buildBulkRows: function(questions, examId, startNumber, lecturerId) {
        const now = new Date().toISOString();
        return questions.map((q, index) => ({
            exam_id: parseInt(examId, 10),
            question_number: startNumber + index,
            question_type: q.question_type,
            question_text: q.question_text,
            option_a: q.option_a || null,
            option_b: q.option_b || null,
            option_c: q.option_c || null,
            option_d: q.option_d || null,
            correct_answer: q.correct_answer || null,
            marks: Number(q.marks) || 1,
            max_chars: Number(q.max_chars) || 5000,
            status: 'pending',
            created_by: 'lecturer',
            lecturer_id: lecturerId,
            submitted_at: now,
            updated_at: now
        }));
    },

    insertBulkRows: async function(sb, rows) {
        const inserted = [];
        for (let i = 0; i < rows.length; i += 100) {
            const batch = rows.slice(i, i + 100);
            const { data, error } = await sb.from('exam_questions').insert(batch).select('id');
            if (error) throw error;
            inserted.push(...(data || []));
        }
        return inserted;
    },

    uploadPastedQuestions: async function() {
        const examId = this.getSelectedExamId();
        if (!examId || !this.bulkParsedQuestions.length) {
            if (window.showToast) window.showToast('⚠️ Parse the questions first', 'warning');
            return;
        }

        const button = document.getElementById('lecBulkPasteUploadBtn');
        if (button) { button.disabled = true; button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...'; }

        try {
            await this.verifyExamOwnership(examId);
            const sb = this.getSupabase();
            const lecturerData = this.getLecturerData();
            const lecturerId = this.lecturerUuid || lecturerData.staff_id || lecturerData.id || lecturerData.user_id;
            if (!lecturerId) throw new Error('Lecturer identity not found. Please login again.');

            const startNumber = await this.getNextQuestionNumber(sb, examId);
            const rows = this.buildBulkRows(this.bulkParsedQuestions, examId, startNumber, lecturerId);
            await this.insertBulkRows(sb, rows);

            if (window.showToast) window.showToast(`✅ ${rows.length} questions submitted for Admin Approval`, 'success');
            this.closePasteBulkModal();
            await this.loadQuestions();
        } catch (error) {
            console.error('Bulk question upload failed:', error);
            if (window.showToast) window.showToast('❌ Bulk upload failed: ' + error.message, 'error');
        } finally {
            if (button) { button.disabled = false; button.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload All Questions'; }
        }
    },

    parseTabularRows: function(rows) {
        if (!rows || !rows.length) return [];
        const normalized = rows.map(row => {
            const out = {};
            Object.keys(row || {}).forEach(key => {
                out[String(key).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')] = row[key];
            });
            return out;
        });

        return normalized.map((r, index) => {
            const get = (...keys) => {
                for (const key of keys) {
                    if (r[key] !== undefined && r[key] !== null && String(r[key]).trim() !== '') return String(r[key]).trim();
                }
                return '';
            };
            const q = {
                source_number: parseInt(get('question_number', 'number', 'no', 'question_no'), 10) || index + 1,
                question_text: get('question', 'question_text', 'questiontext'),
                option_a: get('option_a', 'a'), option_b: get('option_b', 'b'), option_c: get('option_c', 'c'), option_d: get('option_d', 'd'),
                correct_answer: this.normalizeCorrectAnswer(get('correct_answer', 'answer', 'correct')),
                marks: Math.max(1, parseFloat(get('marks', 'mark', 'points')) || 1),
                max_chars: Math.max(100, parseInt(get('max_characters', 'max_characters', 'max_chars'), 10) || 5000)
            };
            q.question_type = this.normalizeBulkType(get('type', 'question_type'), !!(q.option_a || q.option_b));
            return q;
        }).filter(q => q.question_text);
    },

    previewBulkFile: async function(event) {
        const file = event?.target?.files?.[0];
        if (!file) return;
        const preview = document.getElementById('lecBulkFilePreview');
        const button = document.getElementById('lecBulkFileUploadBtn');
        if (button) button.disabled = true;
        if (preview) preview.innerHTML = '<div style="padding:20px;color:#64748b;"><i class="fas fa-spinner fa-spin"></i> Reading file...</div>';

        try {
            if (typeof XLSX === 'undefined') throw new Error('Excel reader (XLSX) is not loaded on this page. Use the Paste Full Question Paper option or load SheetJS/XLSX first.');
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
            const questions = this.parseTabularRows(rows);
            const errors = [];
            questions.forEach((q, i) => {
                if (q.question_type === 'multiple_choice') {
                    if (!q.option_a || !q.option_b) errors.push(`Question ${i + 1}: MCQ requires options A and B`);
                    if (!/^[ABCD]$/.test(q.correct_answer || '')) errors.push(`Question ${i + 1}: Correct Answer must be A, B, C or D`);
                }
            });
            if (!questions.length) throw new Error('No questions were found in the file.');
            if (errors.length) throw new Error(errors.slice(0, 10).join(' | '));

            this.bulkFileQuestions = questions;
            this.renderBulkPreview(questions, 'lecBulkFilePreview');
            if (button) button.disabled = false;
        } catch (error) {
            console.error('Error reading bulk file:', error);
            this.bulkFileQuestions = [];
            if (preview) preview.innerHTML = `<div style="padding:16px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;color:#991b1b;">❌ ${this.esc(error.message)}</div>`;
        }
    },

    downloadBulkTemplate: function() {
        const headers = ['Question #', 'Question', 'Type', 'Marks', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Answer', 'Max Characters'];
        const sample = [[1, 'What is the normal adult pulse rate?', 'Multiple Choice', 1, '40-60 bpm', '60-100 bpm', '100-140 bpm', '140-180 bpm', 'B', '5000']];
        try {
            if (typeof XLSX !== 'undefined') {
                const ws = XLSX.utils.aoa_to_sheet([headers, ...sample]);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Questions');
                XLSX.writeFile(wb, 'Lecturer_Question_Bank_Template.xlsx');
            } else {
                const csv = [headers, ...sample].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'Lecturer_Question_Bank_Template.csv';
                document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Template download failed:', error);
            if (window.showToast) window.showToast('❌ Could not create template', 'error');
        }
    },

    uploadBulkFileQuestions: async function() {
        const examId = this.getSelectedExamId();
        if (!examId || !this.bulkFileQuestions?.length) return;
        const button = document.getElementById('lecBulkFileUploadBtn');
        if (button) { button.disabled = true; button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...'; }

        try {
            await this.verifyExamOwnership(examId);
            const sb = this.getSupabase();
            const lecturerData = this.getLecturerData();
            const lecturerId = this.lecturerUuid || lecturerData.staff_id || lecturerData.id || lecturerData.user_id;
            if (!lecturerId) throw new Error('Lecturer identity not found.');
            const startNumber = await this.getNextQuestionNumber(sb, examId);
            const rows = this.buildBulkRows(this.bulkFileQuestions, examId, startNumber, lecturerId);
            await this.insertBulkRows(sb, rows);
            if (window.showToast) window.showToast(`✅ ${rows.length} questions submitted for Admin Approval`, 'success');
            this.closeBulkUploadModal();
            await this.loadQuestions();
        } catch (error) {
            console.error('Excel/CSV bulk upload failed:', error);
            if (window.showToast) window.showToast('❌ Bulk upload failed: ' + error.message, 'error');
        } finally {
            if (button) { button.disabled = false; button.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload All'; }
        }
    },

    /**
     * Close the modal
     */
    closeModal: function() {
        document.getElementById('lecQuestionModal').style.display = 'none';
    },

    /**
     * Export questions to CSV
     */
    exportQuestions: function() {
        if (!this.currentQuestions || this.currentQuestions.length === 0) {
            if (window.showToast) {
                window.showToast('No questions to export', 'warning');
            }
            return;
        }

        const data = this.currentQuestions.map(q => ({
            'Question #': q.question_number || '',
            'Question': q.question_text,
            'Type': q.question_type || 'mcq',
            'Marks': q.marks || 1,
            'Status': q.status || 'pending',
            'Option A': q.option_a || '',
            'Option B': q.option_b || '',
            'Option C': q.option_c || '',
            'Option D': q.option_d || '',
            'Correct Answer': q.correct_answer || ''
        }));

        try {
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Questions');
            XLSX.writeFile(wb, `Questions_${new Date().toISOString().split('T')[0]}.xlsx`);

            if (window.showToast) {
                window.showToast(`✅ Exported ${data.length} questions`, 'success');
            }
        } catch (error) {
            console.error('Error exporting:', error);
            // Fallback to CSV
            this.exportQuestionsCSV(data);
        }
    },

    /**
     * Export as CSV fallback
     */
    exportQuestionsCSV: function(data) {
        const headers = ['Question #', 'Question', 'Type', 'Marks', 'Status', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Answer'];
        const csv = [
            headers.join(','),
            ...data.map(row => headers.map(h => `"${(row[h] || '').replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Questions_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (window.showToast) {
            window.showToast(`✅ Exported ${data.length} questions`, 'success');
        }
    }
};

// ============================================================
// ✅ EXPOSE FUNCTIONS GLOBALLY
// ============================================================
window.LecturerQuestions = LecturerQuestions;

// Individual functions for inline onclick handlers
window.loadLecturerQuestions = function() {
    if (window.LecturerQuestions) {
        window.LecturerQuestions.init();
    }
};

window.refreshLecturerQuestions = function() {
    if (window.LecturerQuestions) {
        window.LecturerQuestions.refresh();
    }
};

console.log('✅ LecturerQuestions loaded - Ownership check enabled');
console.log('🔒 Lecturers can only see/edit their OWN exams');
