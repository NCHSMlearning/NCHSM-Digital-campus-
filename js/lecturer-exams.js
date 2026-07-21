// js/lecturer-exams.js
/**
 * NCHSM Lecturer Exams Module
 * Uses dedicated lecturer database
 */

const LecturerExams = {
    exams: [],
    
    async init() {
        console.log('📝 Initializing Lecturer Exams...');
        await this.loadExams();
        this.populateExamForm();
        this.setupEventListeners();
        console.log('✅ Lecturer Exams initialized');
    },
    
    async loadExams() {
        try {
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const program = profile?.program || profile?.department;
            
            if (!program) {
                console.warn('No program found');
                return;
            }
            
            this.exams = await window.lecturerDB.getExams(program);
            this.renderExams();
            console.log(`✅ Loaded ${this.exams.length} exams`);
            
        } catch (error) {
            console.error('Failed to load exams:', error);
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Failed to load exams: ' + error.message, 'error');
            }
        }
    },
    
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
            const dateTime = exam.exam_date ? window.LecturerUtils?.formatDate(exam.exam_date) || exam.exam_date : 'N/A';
            const statusClass = (exam.status || 'Scheduled').toLowerCase();
            const isOwner = exam.created_by === window.lecturerDB?.getCurrentUserId();
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
            
            // ❌ REMOVED: Exam link button
            
            const approvalBadge = {
                'draft': ' <span class="badge badge-warning">📝 Draft</span>',
                'published': ' <span class="badge badge-success">📢 Published</span>',
                'rejected': ' <span class="badge badge-danger">❌ Rejected</span>'
            }[approvalStatus] || '';
            
            return `
                <tr>
                    <td><span class="exam-type-badge">${window.LecturerUtils?.escapeHtml(exam.exam_type || 'N/A') || exam.exam_type || 'N/A'}</span></td>
                    <td><strong>${window.LecturerUtils?.escapeHtml(exam.exam_name || 'N/A') || exam.exam_name || 'N/A'}</strong>${approvalBadge}</td>
                    <td>${window.LecturerUtils?.escapeHtml(course) || course}</td>
                    <td>${window.LecturerUtils?.escapeHtml(exam.target_program || 'N/A') || exam.target_program || 'N/A'}/${window.LecturerUtils?.escapeHtml(exam.block_term || 'N/A') || exam.block_term || 'N/A'}</td>
                    <td>${dateTime}</td>
                    <td>${exam.duration_minutes ? exam.duration_minutes + ' mins' : 'N/A'}</td>
                    <td><span class="status-${statusClass}">${window.LecturerUtils?.escapeHtml(exam.status || 'Scheduled') || exam.status || 'Scheduled'}</span></td>
                    <td>${actions || '<span style="color:#9ca3af;">No actions</span>'}</td>
                </tr>
            `;
        }).join('');
    },
    
    populateExamForm() {
        const profile = window.lecturerDB?.getCurrentUserProfile();
        const program = profile?.program || profile?.department;
        
        const programSelect = document.getElementById('examProgram');
        if (programSelect && program) {
            programSelect.innerHTML = `<option value="${program}">${program}</option>`;
        }
        
        const blocks = window.LecturerUtils?.getAcademicBlocks(program) || ['Introductory', 'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Final'];
        const blockSelect = document.getElementById('examBlockTerm');
        if (blockSelect) {
            blockSelect.innerHTML = '<option value="">-- Select Block/Term --</option>' +
                blocks.map(b => `<option value="${b}">${b}</option>`).join('');
        }
        
        this.loadCoursesForForm();
    },
    
    async loadCoursesForForm() {
        try {
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const program = profile?.program || profile?.department;
            
            if (!program) {
                console.warn('No program found for courses');
                return;
            }
            
            const courses = await window.lecturerDB.getCourses(program);
            
            const courseSelect = document.getElementById('examCourseId');
            if (courseSelect) {
                courseSelect.innerHTML = '<option value="">-- Select Course (Optional) --</option>' +
                    courses.map(c => 
                        `<option value="${c.id}">${window.LecturerUtils?.escapeHtml(c.course_name) || c.course_name}</option>`
                    ).join('');
            }
            
        } catch (error) {
            console.error('Failed to load courses for form:', error);
        }
    },
    
    setupEventListeners() {
        const form = document.getElementById('addExamForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleAddExam(e));
        }
        
        const searchInput = document.getElementById('examSearch');
        if (searchInput) {
            searchInput.addEventListener('keyup', () => {
                if (window.LecturerUI) {
                    window.LecturerUI.filterTable('examSearch', 'examsTable', [1, 2, 3]);
                }
            });
        }
        
        const editForm = document.getElementById('editExamForm');
        if (editForm) {
            editForm.addEventListener('submit', (e) => this.handleEditExam(e));
        }
        
        document.getElementById('closeExamEditModal')?.addEventListener('click', () => {
            if (window.LecturerUI) {
                window.LecturerUI.closeModal('examEditModal');
            }
        });
    },
    
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
            status: document.getElementById('examStatus')?.value
        };
        
        // ❌ REMOVED: examLink from formData
        
        const required = ['title', 'date', 'type', 'program', 'intake', 'block', 'duration'];
        if (required.some(f => !formData[f])) {
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Please fill all required fields.', 'error');
            }
            btn.disabled = false;
            btn.textContent = 'Create Exam Record';
            return;
        }
        
        try {
            const result = await window.lecturerDB.createExam(formData);
            
            if (!result.success) {
                throw new Error(result.error);
            }
            
            if (typeof window.requestAdminApproval === 'function') {
                await window.requestAdminApproval(
                    'create_exam',
                    {
                        exam_id: result.data[0]?.id,
                        title: formData.title,
                        type: formData.type,
                        program: formData.program,
                        block: formData.block,
                        intake: formData.intake
                    },
                    'Created exam: ' + formData.title,
                    result.data[0]?.id
                );
            }
            
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('✅ Exam created! Waiting for admin approval.', 'success');
            }
            e.target.reset();
            if (formData.program) document.getElementById('examProgram').value = formData.program;
            await this.loadExams();
            
        } catch (error) {
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Failed: ' + error.message, 'error');
            }
        } finally {
            btn.disabled = false;
            btn.textContent = 'Create Exam Record';
        }
    },
    
    async editExam(examId) {
        const exam = this.exams.find(e => e.id === examId);
        if (!exam) {
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Exam not found.', 'error');
            }
            return;
        }
        
        document.getElementById('editExamId').value = exam.id;
        document.getElementById('editExamTitle').value = exam.exam_name || '';
        document.getElementById('editExamDate').value = exam.exam_date || '';
        document.getElementById('editExamStatus').value = exam.status || 'Scheduled';
        
        if (window.LecturerUI) {
            window.LecturerUI.openModal('examEditModal');
        }
    },
    
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
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Title and date required.', 'error');
            }
            btn.disabled = false;
            btn.textContent = 'Save Changes';
            return;
        }
        
        try {
            await window.lecturerDB.supabase
                .from('exams')
                .update({
                    exam_name: title,
                    exam_date: date,
                    status: status
                })
                .eq('id', id);
            
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('✅ Exam updated!', 'success');
                window.LecturerUI.closeModal('examEditModal');
            }
            await this.loadExams();
            
        } catch (error) {
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Failed: ' + error.message, 'error');
            }
        } finally {
            btn.disabled = false;
            btn.textContent = 'Save Changes';
        }
    },
    
    async deleteExam(examId) {
        const exam = this.exams.find(e => e.id === examId);
        if (!confirm(`Delete exam "${exam?.exam_name || 'Exam'}"?`)) return;
        
        try {
            await window.lecturerDB.supabase
                .from('exams')
                .delete()
                .eq('id', examId);
            
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('✅ Exam deleted!', 'success');
            }
            await this.loadExams();
            
        } catch (error) {
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Delete failed: ' + error.message, 'error');
            }
        }
    },
    
    async gradeExam(examId) {
        const exam = this.exams.find(e => e.id === examId);
        if (!exam) {
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Exam not found.', 'error');
            }
            return;
        }
        
        const profile = window.lecturerDB?.getCurrentUserProfile();
        const program = profile?.program || profile?.department;
        
        const { data: students } = await window.lecturerDB.supabase
            .from('consolidated_user_profiles_table')
            .select('*')
            .eq('role', 'student')
            .eq('program', program)
            .eq('intake_year', exam.intake_year)
            .eq('block', exam.block_term);
        
        if (!students?.length) {
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('No students found for this exam.', 'warning');
            }
            return;
        }
        
        const { data: existing } = await window.lecturerDB.supabase
            .from('exam_grades')
            .select('*')
            .eq('exam_id', examId);
        
        const modalContent = this.buildGradeModal(exam, students, existing || []);
        const modal = document.getElementById('gradeModal');
        if (modal) {
            modal.querySelector('.modal-content').innerHTML = modalContent;
            modal.style.display = 'block';
            modal.classList.add('active');
        }
    },
    
    buildGradeModal(exam, students, existing) {
        const studentRows = students.map(s => {
            const g = existing.find(e => e.student_id === s.user_id) || {};
            return `
                <tr>
                    <td>${window.LecturerUtils?.escapeHtml(s.full_name) || s.full_name || 'N/A'}</td>
                    <td>${window.LecturerUtils?.escapeHtml(s.student_id || s.user_id.substring(0, 8)) || s.student_id || 'N/A'}</td>
                    <td><input type="number" min="0" max="30" step="0.5" id="cat1-${s.user_id}" value="${g.cat_1_score || ''}" class="grade-input"></td>
                    <td><input type="number" min="0" max="30" step="0.5" id="cat2-${s.user_id}" value="${g.cat_2_score || ''}" class="grade-input"></td>
                    <td><input type="number" min="0" max="100" step="0.5" id="final-${s.user_id}" value="${g.exam_score || ''}" class="grade-input"></td>
                    <td><input type="number" id="total-${s.user_id}" value="${g.total_score || ''}" readonly class="total-input"></td>
                    <td><span id="grade-${s.user_id}" class="grade-letter">${window.LecturerUtils?.calculateGrade(g.total_score) || '-'}</span></td>
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
            <span class="close" onclick="if(window.LecturerUI) window.LecturerUI.closeModal('gradeModal')">&times;</span>
            <h3><i class="fas fa-check-circle"></i> Grade: ${window.LecturerUtils?.escapeHtml(exam.exam_name) || exam.exam_name || 'N/A'}</h3>
            <div style="background:#f8f9fa;padding:15px;border-radius:8px;margin-bottom:15px;">
                <p><strong>Course:</strong> ${window.LecturerUtils?.escapeHtml(exam.course?.course_name || 'General') || 'General'}</p>
                <p><strong>Program:</strong> ${window.LecturerUtils?.escapeHtml(exam.target_program) || exam.target_program || 'N/A'} | Block ${window.LecturerUtils?.escapeHtml(exam.block_term) || exam.block_term || 'N/A'} | ${window.LecturerUtils?.escapeHtml(exam.intake_year) || exam.intake_year || 'N/A'}</p>
                <p><strong>Type:</strong> ${window.LecturerUtils?.escapeHtml(exam.exam_type) || exam.exam_type || 'N/A'} | <strong>Date:</strong> ${window.LecturerUtils?.formatDate(exam.exam_date) || exam.exam_date || 'N/A'}</p>
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
                <button class="btn btn-delete" onclick="if(window.LecturerUI) window.LecturerUI.closeModal('gradeModal')">
                    <i class="fas fa-times"></i> Close
                </button>
            </div>
        `;
    },
    
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
                    graded_by: window.lecturerDB?.getCurrentUserId(),
                    question_id: '00000000-0000-0000-0000-000000000000'
                });
            }
        }
        
        if (!grades.length) {
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('No grades to save.', 'info');
            }
            return;
        }
        
        try {
            await window.lecturerDB.supabase
                .from('exam_grades')
                .upsert(grades, { onConflict: 'exam_id,student_id,question_id' });
            
            if (window.LecturerUI) {
                window.LecturerUI.showNotification(`✅ Saved ${grades.length} grades!`, 'success');
                window.LecturerUI.closeModal('gradeModal');
            }
            await this.loadExams();
            
        } catch (error) {
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Failed to save grades: ' + error.message, 'error');
            }
        }
    },
    
    async refresh() {
        await this.loadExams();
        if (window.LecturerUI) {
            window.LecturerUI.showNotification('Exams refreshed!', 'success');
        }
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => LecturerExams.init(), 800);
});

window.LecturerExams = LecturerExams;
