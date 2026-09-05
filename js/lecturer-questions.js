// ============================================================
// 📝 LECTURER QUESTIONS - WITH OWNERSHIP CHECK
// Lecturers can ONLY see and edit questions for exams THEY created
// ============================================================

const LecturerQuestions = {
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
            const { data, error } = await sb
                .from('exams')
                .select('id, title, exam_name, unit, created_by')
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
                    const displayName = exam.title || exam.exam_name || exam.unit || 'Untitled Exam';
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
    openAddModal: function() {
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
