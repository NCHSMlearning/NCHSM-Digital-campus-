// js/lecturer-exams.js - FIXED: matches actual exams table schema
/**
 * NCHSM Lecturer Exams Module
 * Uses exams table with UUID created_by
 * Columns: title, exam_name, course_id, course_code, target_program,
 *          program_type, block, block_term, intake_year, intake_month,
 *          marks_out_of, pass_mark, min_fee_balance, duration_minutes,
 *          exam_date, exam_start_time, marks_entry_deadline,
 *          online_link, exam_link, exam_basis, status, approval_status,
 *          created_by, description
 */

const LecturerExams = {
    exams: [],
    lecturerAssignmentId: null,
    lecturerUuid: null,
    assignedUnits: [],
    isProcessing: false,

    async init() {
        console.log('📝 Initializing Lecturer Exams...');
        await this.resolveLecturerId();
        await this.loadAssignedUnits();
        await this.loadExams();
        this.populateExamForm();
        this.setupEventListeners();
        this.updateStats();
        console.log('✅ Lecturer Exams initialized');
    },

    async resolveLecturerId() {
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) { console.warn('Supabase not available'); return; }

            const profile = window.lecturerDB?.getCurrentUserProfile();
            if (!profile) { console.warn('No lecturer profile found'); return; }

            const authId = profile.user_id;
            const fullName = profile.full_name;

            console.log('🔍 Auth ID (UUID):', authId);
            console.log('🔍 Lecturer name:', fullName);

            this.lecturerUuid = authId;

            const { data: assignments, error: assignError } = await supabase
                .from('lecturer_subject_assignments')
                .select('lecturer_id, lecturer_name')
                .ilike('lecturer_name', `%${fullName}%`);

            if (!assignError && assignments && assignments.length > 0) {
                const staffId = assignments.find(a => {
                    const id = a.lecturer_id;
                    return id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id));
                });
                this.lecturerAssignmentId = staffId ? staffId.lecturer_id : assignments[0].lecturer_id;
                console.log('✅ Lecturer assignment ID:', this.lecturerAssignmentId);
                return;
            }

            this.lecturerAssignmentId = authId;
            console.log('⚠️ Falling back to auth ID:', this.lecturerAssignmentId);

        } catch (error) {
            console.error('Error resolving lecturer ID:', error);
            this.lecturerAssignmentId = null;
            this.lecturerUuid = null;
        }
    },

    async loadAssignedUnits() {
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) return;
            const profile = window.lecturerDB?.getCurrentUserProfile();
            if (!profile) return;

            const fullName = profile.full_name;
            console.log('🔍 Loading assigned units for exams:', fullName);

            const { data: assignments, error } = await supabase
                .from('lecturer_subject_assignments')
                .select('subject_name, subject_code, block, program, academic_year, lecturer_id')
                .ilike('lecturer_name', `%${fullName}%`);

            if (error) {
                console.error('❌ Error loading assigned units:', error);
                this.assignedUnits = [];
                return;
            }

            const krchnUnits = assignments?.filter(u => u.program === 'KRCHN') || [];
            this.assignedUnits = krchnUnits.length > 0 ? krchnUnits : (assignments || []);

            console.log(`📚 Loaded ${this.assignedUnits.length} assigned units`);
        } catch (error) {
            console.error('❌ Failed to load assigned units:', error);
            this.assignedUnits = [];
        }
    },

    async loadExams() {
        try {
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const program = profile?.program || profile?.department;

            if (!program) { console.warn('No program found'); return; }

            const supabase = window.lecturerDB?.supabase;
            if (!supabase) { console.warn('Supabase not available'); return; }

            console.log('🔍 Loading ALL exams for program:', program);

            // ✅ No .unit / .unit_name / .course_name in the select — they don't exist.
            const { data: exams, error } = await supabase
                .from('exams')
                .select('id, title, exam_name, exam_type, exam_date, exam_start_time, ' +
                        'duration_minutes, status, approval_status, created_by, ' +
                        'target_program, program_type, block, block_term, ' +
                        'intake_year, intake_month, course_id, course_code, ' +
                        'marks_out_of, total_marks, pass_mark, min_fee_balance, ' +
                        'online_link, exam_link, marks_entry_deadline, exam_basis')
                .eq('target_program', program)
                .order('exam_date', { ascending: false });

            if (error) {
                console.error('Error loading exams:', error);
                this.exams = [];
                this.filteredExams = [];
                this.renderExams();
                this.updateStats();
                return;
            }

            this.exams = exams || [];
            this.filteredExams = this.exams;
            this.renderExams();
            this.updateStats();
            console.log(`✅ Loaded ${this.exams.length} exams`);
        } catch (error) {
            console.error('Failed to load exams:', error);
            this.exams = [];
            this.filteredExams = [];
            this.renderExams();
            this.updateStats();
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Failed to load exams: ' + error.message, 'error');
            }
        }
    },

    renderExams() {
        const tbody = document.getElementById('examsTable');
        if (!tbody) return;

        const exams = this.filteredExams || this.exams;

        if (!exams || exams.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="padding: 50px 20px; text-align: center; color: #94a3b8;">
                        <i class="fas fa-file-alt" style="font-size: 48px; display: block; margin-bottom: 15px; color: #e2e8f0;"></i>
                        <h3 style="color: #475569; margin: 0 0 8px 0;">No Exams Created</h3>
                        <p style="margin: 0; font-size: 14px;">Create your first exam or CAT using the form above.</p>
                    </td>
                </tr>
            `;
            return;
        }

        const profile = window.lecturerDB?.getCurrentUserProfile();
        const currentLecturerUuid = this.lecturerUuid || profile?.user_id;

        const statusColors = {
            'Scheduled': '#f59e0b', 'InProgress': '#3b82f6', 'Completed': '#10b981',
            'Cancelled': '#ef4444', 'published': '#10b981', 'Upcoming': '#f59e0b'
        };
        const statusIcons = {
            'Scheduled': '📅', 'InProgress': '🔄', 'Completed': '✅',
            'Cancelled': '❌', 'published': '✅', 'Upcoming': '⏳'
        };
        const approvalBadges = {
            'pending': '<span style="background: #fef3c7; color: #92400e; padding: 2px 10px; border-radius: 12px; font-size: 10px;">⏳ Pending</span>',
            'approved': '<span style="background: #d1fae5; color: #065f46; padding: 2px 10px; border-radius: 12px; font-size: 10px;">✅ Approved</span>',
            'rejected': '<span style="background: #fee2e2; color: #991b1b; padding: 2px 10px; border-radius: 12px; font-size: 10px;">❌ Rejected</span>',
            'draft': '<span style="background: #e5e7eb; color: #6b7280; padding: 2px 10px; border-radius: 12px; font-size: 10px;">📝 Draft</span>'
        };

        tbody.innerHTML = exams.map(exam => {
            const isOwner = exam.created_by === currentLecturerUuid;

            // ✅ Only read columns that actually exist
            const unit = exam.course_code || exam.course_id || '—';
            const dateTime = exam.exam_date
                ? this.formatDate(exam.exam_date) + (exam.exam_start_time ? ' ' + exam.exam_start_time : '')
                : 'N/A';
            const status = exam.status || 'Scheduled';
            const statusColor = statusColors[status] || '#6b7280';
            const statusIcon = statusIcons[status] || '📌';
            const approvalStatus = exam.approval_status || 'draft';
            const approvalBadge = approvalBadges[approvalStatus] || approvalBadges.draft;

            let actions = '';
            if (isOwner) {
                if (approvalStatus === 'draft' || approvalStatus === 'pending') {
                    actions += `
                        <button onclick="LecturerExams.editExam('${exam.id}')"
                                style="background: #4C1D95; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="LecturerExams.deleteExam('${exam.id}')"
                                style="background: #fee2e2; color: #dc2626; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">
                            <i class="fas fa-trash"></i>
                        </button>
                    `;
                }
                if (approvalStatus === 'approved' || status === 'published' || status === 'Completed') {
                    actions += `
                        <button onclick="LecturerExams.gradeExam('${exam.id}')"
                                style="background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">
                            <i class="fas fa-check-circle"></i> Grade
                        </button>
                    `;
                }
            } else {
                actions = `<span style="color: #94a3b8; font-size: 11px;">👤 Another Lecturer</span>`;
            }

            return `
                <tr style="border-bottom: 1px solid #f1f5f9; ${!isOwner ? 'opacity: 0.75;' : ''}"
                    onmouseover="this.style.background='#f8fafc'"
                    onmouseout="this.style.background='transparent'">
                    <td style="padding: 14px 18px;">
                        <span style="background: #ede9fe; padding: 2px 10px; border-radius: 12px; font-size: 12px; color: #5b21b6;">
                            ${this.escapeHtml(exam.exam_type || 'N/A')}
                        </span>
                        ${!isOwner ? '<span style="font-size: 10px; color: #94a3b8; margin-left: 4px;">🔒</span>' : ''}
                    </td>
                    <td style="padding: 14px 18px; font-weight: 600; color: #1e293b;">
                        ${this.escapeHtml(exam.exam_name || exam.title || 'Untitled Exam')}
                        <div style="font-size: 10px; margin-top: 2px;">${approvalBadge}</div>
                    </td>
                    <td style="padding: 14px 18px; color: #475569;">${this.escapeHtml(unit)}</td>
                    <td style="padding: 14px 18px; color: #475569;">
                        ${this.escapeHtml(exam.target_program || exam.program_type || 'N/A')}/${this.escapeHtml(exam.block || exam.block_term || 'N/A')}
                    </td>
                    <td style="padding: 14px 18px; color: #475569; font-size: 13px;">${dateTime}</td>
                    <td style="padding: 14px 18px; color: #475569;">
                        ${exam.duration_minutes ? exam.duration_minutes + ' mins' : 'N/A'}
                    </td>
                    <td style="padding: 14px 18px;">
                        <span style="background: ${statusColor}20; color: ${statusColor}; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 500;">
                            ${statusIcon} ${status}
                        </span>
                    </td>
                    <td style="padding: 14px 18px; text-align: center;">
                        <div style="display: flex; gap: 6px; justify-content: center; flex-wrap: wrap;">
                            ${actions || '<span style="color: #94a3b8; font-size: 12px;">Read-only</span>'}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        const countDisplay = document.getElementById('examCountDisplay');
        if (countDisplay) countDisplay.textContent = this.exams.length;
    },

    updateStats() {
        const exams = this.exams;
        const total = exams.length;
        const scheduled = exams.filter(e => e.status === 'Scheduled' || e.status === 'Upcoming').length;
        const completed = exams.filter(e => e.status === 'Completed' || e.status === 'published').length;
        const pending = exams.filter(e => e.status === 'InProgress' || e.status === 'Pending').length;

        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        set('totalExamsStat', total);
        set('scheduledExamsStat', scheduled);
        set('completedExamsStat', completed);
        set('pendingExamsStat', pending);
        set('examCountBadge2', total);
        set('examCountDisplay', total);
    },

    populateExamForm() {
        const profile = window.lecturerDB?.getCurrentUserProfile();
        const program = profile?.program || profile?.department;
        console.log('📝 Populating exam form for program:', program);

        const programSelect = document.getElementById('examProgram');
        if (programSelect && program) {
            programSelect.innerHTML = `<option value="${program}">${program}</option>`;
        }

        const blocks = [...new Set(this.assignedUnits.map(u => u.block).filter(Boolean))];
        const blockSelect = document.getElementById('examBlockTerm');
        if (blockSelect) {
            blockSelect.innerHTML = blocks.length > 0
                ? '<option value="">-- Select Block/Term --</option>' +
                  blocks.map(b => `<option value="${b}">${b}</option>`).join('')
                : '<option value="">-- No blocks assigned --</option>';
        }

        this.loadUnitsForForm();

        const dateInput = document.getElementById('examDate');
        if (dateInput) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 7);
            dateInput.value = tomorrow.toISOString().split('T')[0];
        }
    },

    loadUnitsForForm() {
        const unitSelect = document.getElementById('examUnit');
        if (!unitSelect) return;

        const units = this.assignedUnits;
        if (units && units.length > 0) {
            unitSelect.innerHTML = '<option value="">-- Select Unit (Optional) --</option>' +
                units.map(u =>
                    `<option value="${u.subject_code || u.subject_name}">${u.subject_code ? u.subject_code + ' - ' : ''}${u.subject_name}${u.block ? ' (' + u.block + ')' : ''}</option>`
                ).join('');
        } else {
            unitSelect.innerHTML = '<option value="">-- No units assigned --</option>';
        }
    },

    setupEventListeners() {
        const form = document.getElementById('addExamForm');
        if (form) {
            const newForm = form.cloneNode(true);
            form.parentNode.replaceChild(newForm, form);
            newForm.addEventListener('submit', (e) => this.handleAddExam(e));
        }

        const searchInput = document.getElementById('examSearch');
        if (searchInput) {
            let timeout;
            searchInput.addEventListener('input', () => {
                clearTimeout(timeout);
                timeout = setTimeout(() => this.filterExams(), 300);
            });
        }
        document.getElementById('examSearchBtn')?.addEventListener('click', () => this.filterExams());

        const blockSelect = document.getElementById('examBlockTerm');
        if (blockSelect) {
            blockSelect.addEventListener('change', () => {
                const block = blockSelect.value;
                const unitSelect = document.getElementById('examUnit');
                if (unitSelect) {
                    const filtered = this.assignedUnits.filter(u => u.block === block || !block);
                    unitSelect.innerHTML = '<option value="">-- Select Unit (Optional) --</option>' +
                        filtered.map(u =>
                            `<option value="${u.subject_code || u.subject_name}">${u.subject_code ? u.subject_code + ' - ' : ''}${u.subject_name}${u.block ? ' (' + u.block + ')' : ''}</option>`
                        ).join('');
                }
            });
        }
    },

    filterExams() {
        const searchTerm = document.getElementById('examSearch')?.value?.toLowerCase() || '';
        const typeFilter = document.getElementById('examTypeFilter')?.value || 'all';
        const statusFilter = document.getElementById('examStatusFilter')?.value || 'all';
        const blockFilter = document.getElementById('examBlockFilter')?.value || 'all';

        const filtered = this.exams.filter(exam => {
            let match = true;
            if (searchTerm) {
                const searchable = `${exam.exam_name || ''} ${exam.title || ''} ${exam.exam_type || ''} ${exam.block || ''}`.toLowerCase();
                match = searchable.includes(searchTerm);
            }
            if (match && typeFilter !== 'all') match = (exam.exam_type || '').toLowerCase() === typeFilter;
            if (match && statusFilter !== 'all') match = (exam.status || '').toLowerCase() === statusFilter;
            if (match && blockFilter !== 'all') match = (exam.block || '').toLowerCase() === blockFilter;
            return match;
        });

        this.filteredExams = filtered;
        this.renderExams();
        const countDisplay = document.getElementById('examCountDisplay');
        if (countDisplay) countDisplay.textContent = filtered.length;
    },

    async handleAddExam(e) {
        if (this.isProcessing) return;
        this.isProcessing = true;

        e.preventDefault();
        const btn = e.submitter || e.target.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';

        const formData = {
            title: document.getElementById('examTitle')?.value?.trim(),
            date: document.getElementById('examDate')?.value,
            type: document.getElementById('examType')?.value,
            program: document.getElementById('examProgram')?.value,
            intake: document.getElementById('examIntake')?.value,
            block: document.getElementById('examBlockTerm')?.value,
            unit: document.getElementById('examUnit')?.value,   // subject_code or subject_name
            startTime: document.getElementById('examStartTime')?.value,
            duration: document.getElementById('examDurationMinutes')?.value,
            status: document.getElementById('examStatus')?.value,
            link: document.getElementById('examLink')?.value,
            venue: document.getElementById('examVenue')?.value  // will go into description, not a column
        };

        const required = ['title', 'date', 'type', 'program', 'intake', 'block', 'duration'];
        if (required.some(f => !formData[f])) {
            window.showNotification('Please fill all required fields.', 'error');
            btn.disabled = false;
            btn.innerHTML = originalText;
            this.isProcessing = false;
            return;
        }

        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) throw new Error('Database connection not available');

            const lecturerUuid = this.lecturerUuid || window.lecturerDB?.getCurrentUserProfile()?.user_id;
            if (!lecturerUuid) throw new Error('No UUID found for lecturer');

            // ✅ ONLY columns that exist on the exams table.
            // - unit/course_name/unit_name/venue are NOT columns.
            // - we store the selected unit as course_code (text) and put any
            //   free-form venue into description so nothing is lost.
            const descriptionParts = [];
            if (formData.venue) descriptionParts.push('Venue: ' + formData.venue);
            if (formData.unit) descriptionParts.push('Unit: ' + formData.unit);

            const examData = {
                title: formData.title,
                exam_name: formData.title,
                exam_date: formData.date,
                exam_type: formData.type,
                target_program: formData.program,
                program_type: formData.program,
                intake_year: parseInt(formData.intake, 10),
                block: formData.block,
                block_term: formData.block,
                course_code: formData.unit || null,   // ✅ real column
                exam_start_time: formData.startTime || null,
                duration_minutes: parseInt(formData.duration, 10),
                status: formData.status || 'Scheduled',
                online_link: formData.link || null,
                exam_link: formData.link || null,
                description: descriptionParts.join('\n') || null,
                created_by: lecturerUuid,
                approval_status: 'pending',
                created_at: new Date().toISOString()
            };

            console.log('📤 Creating exam with columns:', Object.keys(examData));

            const { data: result, error } = await supabase
                .from('exams')
                .insert([examData])
                .select();

            if (error) {
                console.error('DB Error:', error);
                throw new Error('Failed to create exam: ' + error.message);
            }

            window.showNotification('✅ Exam created! Waiting for admin approval.', 'success');
            e.target.reset();
            this.populateExamForm();
            await this.loadExams();

        } catch (error) {
            console.error('Error creating exam:', error);
            window.showNotification('Failed to create exam: ' + error.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
            this.isProcessing = false;
        }
    },

    async editExam(examId) {
        const exam = this.exams.find(e => e.id === examId);
        if (!exam) { window.showNotification('Exam not found.', 'error'); return; }

        const profile = window.lecturerDB?.getCurrentUserProfile();
        const currentLecturerUuid = this.lecturerUuid || profile?.user_id;

        if (exam.created_by !== currentLecturerUuid) {
            window.showNotification('❌ You can only edit exams you created.', 'warning');
            return;
        }

        const newTitle = prompt('Edit Exam Title:', exam.exam_name || exam.title || '');
        if (newTitle !== null && newTitle !== (exam.exam_name || exam.title)) {
            try {
                const supabase = window.lecturerDB?.supabase;
                if (!supabase) throw new Error('Database connection not available');

                const { error } = await supabase
                    .from('exams')
                    .update({ exam_name: newTitle, title: newTitle })
                    .eq('id', examId)
                    .eq('created_by', currentLecturerUuid);

                if (error) throw error;

                window.showNotification('✅ Exam updated!', 'success');
                await this.loadExams();
            } catch (error) {
                console.error('Error updating exam:', error);
                window.showNotification('Failed to update exam: ' + error.message, 'error');
            }
        }
    },

    async deleteExam(examId) {
        const exam = this.exams.find(e => e.id === examId);
        if (!exam) { window.showNotification('Exam not found.', 'error'); return; }

        const profile = window.lecturerDB?.getCurrentUserProfile();
        const currentLecturerUuid = this.lecturerUuid || profile?.user_id;

        if (exam.created_by !== currentLecturerUuid) {
            window.showNotification('❌ You can only delete exams you created.', 'warning');
            return;
        }

        if (!confirm(`Delete exam "${exam.exam_name || exam.title || 'Exam'}"?`)) return;

        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) throw new Error('Database connection not available');

            const { error } = await supabase
                .from('exams')
                .delete()
                .eq('id', examId)
                .eq('created_by', currentLecturerUuid);

            if (error) throw error;

            window.showNotification('✅ Exam deleted!', 'success');
            await this.loadExams();
        } catch (error) {
            console.error('Error deleting exam:', error);
            window.showNotification('Failed to delete exam: ' + error.message, 'error');
        }
    },

    async gradeExam(examId) {
        const exam = this.exams.find(e => e.id === examId);
        if (!exam) { window.showNotification('Exam not found.', 'error'); return; }

        const profile = window.lecturerDB?.getCurrentUserProfile();
        const currentLecturerUuid = this.lecturerUuid || profile?.user_id;

        if (exam.created_by !== currentLecturerUuid) {
            window.showNotification('❌ You can only grade exams you created.', 'warning');
            return;
        }

        window.showNotification(`📝 Grading: ${exam.exam_name || exam.title || 'Exam'} - Feature coming soon!`, 'info');
    },

    exportExams() {
        const exams = this.exams;
        if (exams.length === 0) { window.showNotification('No exams to export.', 'warning'); return; }

        const headers = ['Type', 'Title', 'Unit', 'Program', 'Block', 'Date', 'Duration', 'Status'];
        const rows = exams.map(e => [
            e.exam_type || 'N/A',
            e.exam_name || e.title || 'N/A',
            e.course_code || e.course_id || 'N/A',   // ✅ real columns only
            e.target_program || e.program_type || 'N/A',
            e.block || e.block_term || 'N/A',
            e.exam_date || 'N/A',
            e.duration_minutes ? e.duration_minutes + ' mins' : 'N/A',
            e.status || 'Scheduled'
        ]);

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `exams_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        window.showNotification('✅ Exams exported successfully!', 'success');
    },

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch { return dateString; }
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    async refresh() {
        await this.resolveLecturerId();
        await this.loadAssignedUnits();
        await this.loadExams();
        this.populateExamForm();
        this.updateStats();
        window.showNotification('Exams refreshed!', 'success');
    }
};

window.LecturerExams = LecturerExams;
window.deleteExam = (id) => LecturerExams.deleteExam(id);
window.editExam = (id) => LecturerExams.editExam(id);
window.gradeExam = (id) => LecturerExams.gradeExam(id);
window.searchExams = () => LecturerExams.filterExams();
window.exportExams = () => LecturerExams.exportExams();
window.loadExams = () => LecturerExams.loadExams();
window.refreshExams = () => LecturerExams.refresh();

document.addEventListener('DOMContentLoaded', function () {
    setTimeout(() => LecturerExams.init(), 800);
});

console.log('✅ LecturerExams module loaded - schema-aligned');
