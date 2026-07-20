// js/lecturer-exams.js
/**
 * NCHSM Lecturer Exams Module
 * Handles exam creation, grading, and management
 */

const LecturerExams = {
    exams: [],
    
    // Initialize
    async init() {
        console.log('📝 Initializing Lecturer Exams...');
        await this.loadExams();
        this.populateExamForm();
        this.setupEventListeners();
        console.log('✅ Lecturer Exams initialized');
    },
    
    // Load exams
    async loadExams() {
        try {
            const profile = window.db?.getUserProfile();
            const program = profile?.program || profile?.department;
            const userId = window.db?.getCurrentUserId();
            
            if (!program) {
                console.warn('No program found');
                return;
            }
            
            const { data, error } = await window.db.supabase
                .from('exams')
                .select(`
                    *,
                    course:course_id (
                        course_name,
                        unit_code
                    )
                `)
                .eq('target_program', program)
                .order('exam_date', { ascending: false });
            
            if (error) throw error;
            
            this.exams = data || [];
            this.renderExams();
            console.log(`✅ Loaded ${this.exams.length} exams`);
            
        } catch (error) {
            console.error('Failed to load exams:', error);
            LecturerUI.showNotification('Failed to load exams: ' + error.message, 'error');
        }
    },
    
    // Render exams table
    renderExams() {
        const tbody = document.getElementById('examsTable');
        if (!tbody) return;
        
        const exams = this.exams;
        
        if (!exams.length) {
            tbody.innerHTML = '<tr><td colspan="8">No exams found.</td></tr>';
            return;
        }
        
        tbody.innerHTML = exams.map(exam => {
            const course = exam.course?.course_name || 'General';
            const dateTime = exam.exam_date ? Utils.formatDate(exam.exam_date) : 'N/A';
            const statusClass = (exam.status || 'Scheduled').toLowerCase();
            const isOwner = exam.created_by === window.db?.getCurrentUserId();
            const approvalStatus = exam.approval_status || 'draft';
            
            let actions = '';
            
            if (isOwner && approvalStatus === 'draft') {
                actions += `
                    <button class="btn btn-action btn-small" onclick="LecturerExams.editExam('${exam.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-delete btn-small" onclick="LecturerExams.deleteExam('${exam.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                `;
            }
            
            if (approvalStatus === 'published' || exam.status === 'Published' || exam.status === 'Completed') {
                actions += `
                    <button class="btn btn-action btn-small" onclick="LecturerExams.gradeExam('${exam.id}')" style="background:#10b981;">
                        <i class="fas fa-check-circle"></i>
                    </button>
                `;
            }
            
            if (exam.online_link || exam.exam_link) {
                const link = exam.online_link || exam.exam_link;
                actions += `
                    <a href="${link}" target="_blank" class="btn btn-map btn-small">
                        <i class="fas fa-external-link-alt"></i>
                    </a>
                `;
            }
            
            const approvalBadge = {
                'draft': ' <span class="badge badge-warning">📝 Draft</span>',
                'published': ' <span class="badge badge-success">📢 Published</span>',
                'rejected': ' <span class="badge badge-danger">❌ Rejected</span>'
            }[approvalStatus] || '';
            
            return `
                <tr>
                    <td><span class="exam-type-badge">${Utils.escapeHtml(exam.exam_type || 'N/A')}</span></td>
                    <td><strong>${Utils.escapeHtml(exam.exam_name || 'N/A')}</strong>${approvalBadge}</td>
                    <td>${Utils.escapeHtml(course)}</td>
                    <td>${Utils.escapeHtml(exam.target_program || 'N/A')}/${Utils.escapeHtml(exam.block_term || 'N/A')}</td>
                    <td>${dateTime}</td>
                    <td>${exam.duration_minutes ? exam.duration_minutes + ' mins' : 'N/A'}</td>
                    <td><span class="status-${statusClass}">${Utils.escapeHtml(exam.status || 'Scheduled')}</span></td>
                    <td>${actions || '<span style="color:#9ca3af;">No actions</span>'}</td>
                </tr>
            `;
        }).join('');
    },
    
    // Populate exam form
    populateExamForm() {
        const profile = window.db?.getUserProfile();
        const program = profile?.program || profile?.department;
        
        // Program
        const programSelect = document.getElementById('examProgram');
        if (programSelect && program) {
            programSelect.innerHTML = `<option value="${program}">${program}</option>`;
        }
        
        // Blocks
        const blocks = Utils.getAcademicBlocks(program);
        const blockSelect = document.getElementById('examBlockTerm');
        if (blockSelect) {
            blockSelect.innerHTML = '<option value="">-- Select Block/Term --</option>' +
                blocks.map(b => `<option value="${b}">${b}</option>`).join('');
        }
        
        // Courses
        this.loadCoursesForForm();
    },
    
    // Load courses for form
    async loadCoursesForForm() {
        try {
            const profile = window.db?.getUserProfile();
            const program = profile?.program || profile?.department;
            
            const { data, error } = await window.db.supabase
                .from('courses')
                .select('id, course_name')
                .eq('target_program', program)
                .eq('status', 'Active');
            
            if (error) throw error;
            
            const courseSelect = document.getElementById('examCourseId');
            if (courseSelect) {
                courseSelect.innerHTML = '<option value="">-- Select Course (Optional) --</option>' +
                    (data || []).map(c => 
                        `<option value="${c.id}">${Utils.escapeHtml(c.course_name)}</option>`
                    ).join('');
            }
            
        } catch (error) {
            console.error('Failed to load courses for form:', error);
        }
    },
    
    // Setup event listeners
    setupEventListeners() {
        // Exam form submission
        const form = document.getElementById('addExamForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleAddExam(e));
        }
        
        // Search
        const searchInput = document.getElementById('examSearch');
        if (searchInput) {
            searchInput.addEventListener('keyup', () => {
                LecturerUI.filterTable('examSearch', 'examsTable', [1, 2, 3]);
            });
        }
        
        // Edit exam form
        const editForm = document.getElementById('editExamForm');
        if (editForm) {
            editForm.addEventListener('submit', (e) => this.handleEditExam(e));
        }
        
        // Modal close
        document.getElementById('closeExamEditModal')?.addEventListener('click', () => {
            LecturerUI.closeModal('examEditModal');
        });
    },
    
    // Handle add exam
    async handleAddExam(e) {
        e.preventDefault();
        const btn = e.submitter || e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Creating...';
        
        const formData = {
            title: document.getElementById('examTitle')?.value,
            date: document.getElementById('examDate')?.value,
            type: document.getElementById('examType')?.value,
            program: document.getElementById('examProgram')?.value,
            intake: document.getElementById('examIntake')?.value,
            block: document.getElementById('examBlockTerm')?.value,
            course: document.getElementById('examCourseId')?.value,
            startTime: document.getElementById('examStartTime')?.value,
            duration: document.getElementById('examDurationMinutes')?.value,
            link: document.getElementById('examLink')?.value,
            status: document.getElementById('examStatus')?.value
        };
        
        const required = ['title', 'date', 'type', 'program', 'intake', 'block', 'duration'];
        if (required.some(f => !formData[f])) {
            LecturerUI.showNotification('Please fill all required fields.', 'error');
            btn.disabled = false;
            btn.textContent = 'Create Exam Record';
            return;
        }
        
        try {
            const userId = window.db?.getCurrentUserId();
            
            const { data, error } = await window.db.supabase
                .from('exams')
                .insert({
                    exam_name: formData.title,
                    exam_date: formData.date,
                    exam_start_time: formData.startTime || null,
                    exam_type: formData.type,
                    online_link: formData.link || null,
                    duration_minutes: parseInt(formData.duration),
                    target_program: formData.program,
                    course_id: formData.course || null,
                    intake_year: formData.intake,
                    block_term: formData.block,
                    status: formData.status,
                    approval_status: 'draft',
                    created_by: userId,
                    created_at: new Date().toISOString()
                })
                .select();
            
            if (error) throw error;
            
            // Request admin approval
            if (typeof window.requestAdminApproval === 'function') {
                await window.requestAdminApproval(
                    'create_exam',
                    {
                        exam_id: data[0]?.id,
                        title: formData.title,
                        type: formData.type,
                        program: formData.program,
                        block: formData.block,
                        intake: formData.intake
                    },
                    'Created exam: ' + formData.title,
                    data[0]?.id
                );
            }
            
            LecturerUI.showNotification('✅ Exam created! Waiting for admin approval.', 'success');
            e.target.reset();
            if (formData.program) document.getElementById('examProgram').value = formData.program;
            await this.loadExams();
            
        } catch (error) {
            LecturerUI.showNotification('Failed: ' + error.message, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Create Exam Record';
        }
    },
    
    // Edit exam
    async editExam(examId) {
        const exam = this.exams.find(e => e.id === examId);
        if (!exam) {
            LecturerUI.showNotification('Exam not found.', 'error');
            return;
        }
        
        document.getElementById('editExamId').value = exam.id;
        document.getElementById('editExamTitle').value = exam.exam_name || '';
        document.getElementById('editExamDate').value = exam.exam_date || '';
        document.getElementById('editExamStatus').value = exam.status || 'Scheduled';
        
        LecturerUI.openModal('examEditModal');
    },
    
    // Handle edit exam
    async handleEditExam(e) {
        e.preventDefault();
        const btn = e.submitter || e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Saving...';
        
        const id = document.getElementById('editExamId').value;
        const title = document.getElementById('editExamTitle').value;
        const date = document.getElementById('editExamDate').value;
        const status = document.getElementById('editExamStatus').value;
        
        if (!title || !date) {
            LecturerUI.showNotification('Title and date required.', 'error');
            btn.disabled = false;
            btn.textContent = 'Save Changes';
            return;
        }
        
        try {
            await window.db.supabase
                .from('exams')
                .update({
                    exam_name: title,
                    exam_date: date,
                    status: status
                })
                .eq('id', id);
            
            LecturerUI.showNotification('✅ Exam updated!', 'success');
            LecturerUI.closeModal('examEditModal');
            await this.loadExams();
            
        } catch (error) {
            LecturerUI.showNotification('Failed: ' + error.message, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Save Changes';
        }
    },
    
    // Delete exam
    async deleteExam(examId) {
        const exam = this.exams.find(e => e.id === examId);
        if (!confirm(`Delete exam "${exam?.exam_name || 'Exam'}"?`)) return;
        
        try {
            await window.db.supabase
                .from('exams')
                .delete()
                .eq('id', examId);
            
            LecturerUI.showNotification('✅ Exam deleted!', 'success');
            await this.loadExams();
            
        } catch (error) {
            LecturerUI.showNotification('Delete failed: ' + error.message, 'error');
        }
    },
    
    // Grade exam
    async gradeExam(examId) {
        const exam = this.exams.find(e => e.id === examId);
        if (!exam) {
            LecturerUI.showNotification('Exam not found.', 'error');
            return;
        }
        
        // Get students for this exam
        const profile = window.db?.getUserProfile();
        const program = profile?.program || profile?.department;
        
        const { data: students } = await window.db.supabase
            .from('consolidated_user_profiles_table')
            .select('*')
            .eq('role', 'student')
            .eq('program', program)
            .eq('intake_year', exam.intake_year)
            .eq('block', exam.block_term);
        
        if (!students?.length) {
            LecturerUI.showNotification('No students found for this exam.', 'warning');
            return;
        }
        
        // Get existing grades
        const { data: existing } = await window.db.supabase
            .from('exam_grades')
            .select('*')
            .eq('exam_id', examId);
        
        // Build grade modal
        const modalContent = this.buildGradeModal(exam, students, existing || []);
        const modal = document.getElementById('gradeModal');
        if (modal) {
            modal.querySelector('.modal-content').innerHTML = modalContent;
            modal.style.display = 'block';
            modal.classList.add('active');
        }
    },
    
    // Build grade modal
    buildGradeModal(exam, students, existing) {
        const studentRows = students.map(s => {
            const g = existing.find(e => e.student_id === s.user_id) || {};
            return `
                <tr>
                    <td>${Utils.escapeHtml(s.full_name)}</td>
                    <td>${Utils.escapeHtml(s.student_id || s.user_id.substring(0, 8))}</td>
                    <td><input type="number" min="0" max="30" step="0.5" id="cat1-${s.user_id}" value="${g.cat_1_score || ''}" class="grade-input"></td>
                    <td><input type="number" min="0" max="30" step="0.5" id="cat2-${s.user_id}" value="${g.cat_2_score || ''}" class="grade-input"></td>
                    <td><input type="number" min="0" max="100" step="0.5" id="final-${s.user_id}" value="${g.exam_score || ''}" class="grade-input"></td>
                    <td><input type="number" id="total-${s.user_id}" value="${g.total_score || ''}" readonly class="total-input"></td>
                    <td><span id="grade-${s.user_id}" class="grade-letter">${Utils.calculateGrade(g.total_score)}</span></td>
                    <td>
                        <select id="status-${s.user_id}" class="status-select">
                            <option value="Scheduled" ${g.result_status === 'Scheduled' ? 'selected' : ''}>Scheduled</option>
                            <option value="InProgress" ${g.result_status === 'InProgress' ? 'selected' : ''}>In Progress</option>
                            <option value="Graded" ${g.result_status === 'Graded' ? 'selected' : ''}>Graded</option>
                            <option value="Final" ${g.result_status === 'Final' ? 'selected' : ''}>Final</option>
                        </select>
                    </td>
                </tr>
            `;
        }).join('');
        
        return `
            <span class="close" onclick="LecturerUI.closeModal('gradeModal')">&times;</span>
            <h3><i class="fas fa-check-circle"></i> Grade: ${Utils.escapeHtml(exam.exam_name)}</h3>
            <div style="background:#f8f9fa;padding:15px;border-radius:8px;margin-bottom:15px;">
                <p><strong>Course:</strong> ${Utils.escapeHtml(exam.course?.course_name || 'General')}</p>
                <p><strong>Program:</strong> ${Utils.escapeHtml(exam.target_program)} | Block ${Utils.escapeHtml(exam.block_term)} | ${Utils.escapeHtml(exam.intake_year)}</p>
                <p><strong>Type:</strong> ${Utils.escapeHtml(exam.exam_type)} | <strong>Date:</strong> ${Utils.formatDate(exam.exam_date)}</p>
            </div>
            <div class="table-responsive">
                <table class="grade-table">
                    <thead>
                        <tr>
                            <th>Student Name</th>
                            <th>Student ID</th>
                            <th>CAT 1 (/30)</th>
                            <th>CAT 2 (/30)</th>
                            <th>Final (/100)</th>
                            <th>Total</th>
                            <th>Grade</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody id="gradeTableBody">${studentRows}</tbody>
                </table>
            </div>
            <div class="modal-actions">
                <button class="btn btn-action" onclick="LecturerExams.saveGrades('${exam.id}')">
                    <i class="fas fa-save"></i> Save All Grades
                </button>
                <button class="btn btn-delete" onclick="LecturerUI.closeModal('gradeModal')">
                    <i class="fas fa-times"></i> Close
                </button>
            </div>
        `;
    },
    
    // Save grades
    async saveGrades(examId) {
        const rows = document.querySelectorAll('#gradeTableBody tr');
        const grades = [];
        
        for (const row of rows) {
            const studentId = row.querySelector('input[id^="cat1-"]')?.id.replace('cat1-', '');
            if (!studentId) continue;
            
            const cat1 = document.getElementById(`cat1-${studentId}`)?.value;
            const cat2 = document.getElementById(`cat2-${studentId}`)?.value;
            const final = document.getElementById(`final-${studentId}`)?.value;
            const status = document.getElementById(`status-${studentId}`)?.value;
            
            if (cat1 || cat2 || final) {
                const total = (parseFloat(cat1) || 0) * 0.3 + (parseFloat(cat2) || 0) * 0.3 + (parseFloat(final) || 0) * 0.4;
                grades.push({
                    exam_id: examId,
                    student_id: studentId,
                    cat_1_score: cat1 ? parseFloat(cat1) : null,
                    cat_2_score: cat2 ? parseFloat(cat2) : null,
                    exam_score: final ? parseFloat(final) : null,
                    total_score: total,
                    result_status: status || 'Graded',
                    graded_by: window.db?.getCurrentUserId(),
                    question_id: '00000000-0000-0000-0000-000000000000'
                });
            }
        }
        
        if (!grades.length) {
            LecturerUI.showNotification('No grades to save.', 'info');
            return;
        }
        
        try {
            await window.db.supabase
                .from('exam_grades')
                .upsert(grades, { onConflict: 'exam_id,student_id,question_id' });
            
            LecturerUI.showNotification(`✅ Saved ${grades.length} grades!`, 'success');
            LecturerUI.closeModal('gradeModal');
            await this.loadExams();
            
        } catch (error) {
            LecturerUI.showNotification('Failed to save grades: ' + error.message, 'error');
        }
    },
    
    // Refresh
    async refresh() {
        await this.loadExams();
        LecturerUI.showNotification('Exams refreshed!', 'success');
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => LecturerExams.init(), 800);
});

window.LecturerExams = LecturerExams;
