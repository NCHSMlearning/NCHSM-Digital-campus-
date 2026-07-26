// js/lecturer-exams.js
/**
 * NCHSM Lecturer Exams Module
 * Uses the exams table with correct column names
 * Includes admin approval workflow
 */

const LecturerExams = {
    exams: [],
    lecturerAssignmentId: null,
    assignedUnits: [],
    
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
    
    // ============================================
    // RESOLVE THE CORRECT LECTURER ID
    // ============================================
    async resolveLecturerId() {
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) {
                console.warn('Supabase not available');
                return;
            }
            
            const profile = window.lecturerDB?.getCurrentUserProfile();
            if (!profile) {
                console.warn('No lecturer profile found');
                return;
            }
            
            const fullName = profile.full_name;
            const authId = profile.user_id;
            
            console.log('🔍 Auth ID:', authId);
            console.log('🔍 Lecturer name:', fullName);
            
            // Use ilike for partial name matching
            const { data: nameData, error: nameError } = await supabase
                .from('lecturer_subject_assignments')
                .select('lecturer_id, lecturer_name')
                .ilike('lecturer_name', `%${fullName}%`);
            
            if (!nameError && nameData && nameData.length > 0) {
                const nonStaff = nameData.find(l => !l.lecturer_id.toString().startsWith('STAFF'));
                if (nonStaff) {
                    this.lecturerAssignmentId = nonStaff.lecturer_id;
                    console.log('✅ Found non-STAFF ID by partial name match:', this.lecturerAssignmentId);
                    return;
                }
                this.lecturerAssignmentId = nameData[0].lecturer_id;
                console.log('⚠️ Found STAFF ID by partial name match:', this.lecturerAssignmentId);
                return;
            }
            
            this.lecturerAssignmentId = authId;
            console.log('⚠️ Falling back to auth ID:', this.lecturerAssignmentId);
            
        } catch (error) {
            console.error('Error resolving lecturer ID:', error);
            this.lecturerAssignmentId = null;
        }
    },
    
    // ============================================
    // LOAD ASSIGNED UNITS (for form dropdown)
    // ============================================
    async loadAssignedUnits() {
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) return;
            
            const profile = window.lecturerDB?.getCurrentUserProfile();
            if (!profile) return;
            
            const lecturerId = this.lecturerAssignmentId || profile.user_id;
            
            // ✅ Use correct column names - check if 'program' or 'program_type' exists
            const { data: assignments, error } = await supabase
                .from('lecturer_subject_assignments')
                .select('subject_name, subject_code, block, program, program_type, target_program, academic_year')
                .eq('lecturer_id', lecturerId);
            
            if (error) {
                console.error('Error loading assigned units:', error);
                return;
            }
            
            this.assignedUnits = assignments || [];
            console.log(`📚 Loaded ${this.assignedUnits.length} assigned units`);
            
        } catch (error) {
            console.error('Failed to load assigned units:', error);
        }
    },
    
    // ============================================
    // LOAD EXAMS - USING exams TABLE (FIXED)
    // ============================================
    async loadExams() {
        try {
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const program = profile?.program || profile?.department;
            const lecturerId = this.lecturerAssignmentId || profile?.user_id;
            
            if (!program) {
                console.warn('No program found');
                return;
            }
            
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) {
                console.warn('Supabase not available');
                return;
            }
            
            console.log('🔍 Loading exams for program:', program);
            console.log('🔍 Lecturer ID:', lecturerId);
            
            // ✅ FIXED: Use target_program instead of program
            // ✅ Also use created_by to filter by lecturer
            let { data: exams, error } = await supabase
                .from('exams')
                .select('*')
                .eq('target_program', program)  // ✅ FIXED: target_program
                .eq('created_by', lecturerId)
                .order('exam_date', { ascending: false });
            
            // ✅ If no exams found with created_by, try without it
            if (error || !exams || exams.length === 0) {
                console.log('⚠️ No exams with created_by filter, trying without...');
                const { data: allExams, error: allError } = await supabase
                    .from('exams')
                    .select('*')
                    .eq('target_program', program)  // ✅ FIXED: target_program
                    .order('exam_date', { ascending: false });
                
                if (allError) {
                    // ✅ Try program_type as fallback
                    console.log('⚠️ Trying program_type as fallback...');
                    const { data: typeExams, error: typeError } = await supabase
                        .from('exams')
                        .select('*')
                        .eq('program_type', program)  // ✅ FIXED: program_type
                        .order('exam_date', { ascending: false });
                    
                    if (typeError) {
                        console.error('❌ All queries failed:', typeError);
                        this.exams = [];
                    } else {
                        this.exams = typeExams || [];
                    }
                } else {
                    this.exams = allExams || [];
                }
            } else {
                this.exams = exams || [];
            }
            
            this.renderExams();
            this.updateStats();
            
            console.log(`✅ Loaded ${this.exams.length} exams`);
            
        } catch (error) {
            console.error('Failed to load exams:', error);
            this.exams = [];
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
        
        const exams = this.exams;
        
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
        
        const statusColors = {
            'Scheduled': '#f59e0b',
            'InProgress': '#3b82f6',
            'Completed': '#10b981',
            'Cancelled': '#ef4444',
            'upcoming': '#f59e0b',
            'active': '#3b82f6',
            'finished': '#10b981'
        };
        
        const statusIcons = {
            'Scheduled': '📅',
            'InProgress': '🔄',
            'Completed': '✅',
            'Cancelled': '❌',
            'upcoming': '📅',
            'active': '🔄',
            'finished': '✅'
        };
        
        const approvalBadges = {
            'pending': '<span style="background: #fef3c7; color: #92400e; padding: 2px 10px; border-radius: 12px; font-size: 10px;">⏳ Pending</span>',
            'approved': '<span style="background: #d1fae5; color: #065f46; padding: 2px 10px; border-radius: 12px; font-size: 10px;">✅ Approved</span>',
            'rejected': '<span style="background: #fee2e2; color: #991b1b; padding: 2px 10px; border-radius: 12px; font-size: 10px;">❌ Rejected</span>',
            'draft': '<span style="background: #e5e7eb; color: #6b7280; padding: 2px 10px; border-radius: 12px; font-size: 10px;">📝 Draft</span>'
        };
        
        tbody.innerHTML = exams.map(exam => {
            const unit = exam.course_name || exam.course_code || 'General';
            const dateTime = exam.exam_date ? (this.formatDate(exam.exam_date)) + (exam.exam_start_time ? ' ' + exam.exam_start_time : '') : 'N/A';
            const status = exam.status || 'Scheduled';
            const statusColor = statusColors[status] || '#6b7280';
            const statusIcon = statusIcons[status] || '📌';
            const isOwner = exam.created_by === this.lecturerAssignmentId || exam.created_by === window.lecturerDB?.getCurrentUserId();
            const approvalStatus = exam.approval_status || 'pending';
            const approvalBadge = approvalBadges[approvalStatus] || approvalBadges.pending;
            
            let actions = '';
            
            if (isOwner && (approvalStatus === 'pending' || approvalStatus === 'draft')) {
                actions += `
                    <button onclick="LecturerExams.editExam('${exam.id}')" 
                            style="background: #4C1D95; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="LecturerExams.deleteExam('${exam.id}')" 
                            style="background: #fee2e2; color: #dc2626; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;">
                        <i class="fas fa-trash"></i>
                    </button>
                `;
            }
            
            if (approvalStatus === 'approved' || status === 'Completed' || status === 'finished') {
                actions += `
                    <button onclick="LecturerExams.gradeExam('${exam.id}')" 
                            style="background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;">
                        <i class="fas fa-check-circle"></i> Grade
                    </button>
                `;
            }
            
            // ✅ Show exam link if available
            const examLink = exam.online_link || exam.exam_link;
            const linkHtml = examLink ? `
                <a href="${examLink}" target="_blank" 
                   style="background: #0A3D62; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
                    <i class="fas fa-external-link-alt"></i> Link
                </a>
            ` : '';
            
            return `
                <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;" 
                    onmouseover="this.style.background='#f8fafc'" 
                    onmouseout="this.style.background='transparent'">
                    <td style="padding: 14px 18px;">
                        <span style="background: #ede9fe; padding: 2px 10px; border-radius: 12px; font-size: 12px; color: #5b21b6;">
                            ${this.escapeHtml(exam.exam_type || 'N/A')}
                        </span>
                    </td>
                    <td style="padding: 14px 18px; font-weight: 600; color: #1e293b;">
                        ${this.escapeHtml(exam.exam_name || exam.title || 'Untitled Exam')}
                        <div style="font-size: 10px; margin-top: 2px;">${approvalBadge}</div>
                    </td>
                    <td style="padding: 14px 18px; color: #475569;">
                        ${this.escapeHtml(unit)}
                    </td>
                    <td style="padding: 14px 18px; color: #475569;">
                        ${this.escapeHtml(exam.target_program || exam.program_type || 'N/A')}/${this.escapeHtml(exam.block_term || exam.block || 'N/A')}
                    </td>
                    <td style="padding: 14px 18px; color: #475569; font-size: 13px;">
                        ${dateTime}
                    </td>
                    <td style="padding: 14px 18px; color: #475569;">
                        ${exam.duration_minutes ? exam.duration_minutes + ' mins' : 'N/A'}
                    </td>
                    <td style="padding: 14px 18px;">
                        <span style="background: ${statusColor}20; color: ${statusColor}; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 500;">
                            ${statusIcon} ${status}
                        </span>
                        ${linkHtml}
                    </td>
                    <td style="padding: 14px 18px; text-align: center;">
                        <div style="display: flex; gap: 6px; justify-content: center; flex-wrap: wrap;">
                            ${actions || '<span style="color: #94a3b8; font-size: 12px;">No actions</span>'}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },
    
    updateStats() {
        const exams = this.exams;
        const total = exams.length;
        const scheduled = exams.filter(e => e.status === 'Scheduled' || e.status === 'upcoming' || e.status === 'pending').length;
        const completed = exams.filter(e => e.status === 'Completed' || e.status === 'finished').length;
        const pending = exams.filter(e => e.status === 'InProgress' || e.status === 'active' || e.status === 'Pending').length;
        
        const totalEl = document.getElementById('totalExamsStat');
        if (totalEl) totalEl.textContent = total;
        
        const scheduledEl = document.getElementById('scheduledExamsStat');
        if (scheduledEl) scheduledEl.textContent = scheduled;
        
        const completedEl = document.getElementById('completedExamsStat');
        if (completedEl) completedEl.textContent = completed;
        
        const pendingEl = document.getElementById('pendingExamsStat');
        if (pendingEl) pendingEl.textContent = pending;
        
        const badge = document.getElementById('examCountBadge2');
        if (badge) badge.textContent = total;
        
        const countDisplay = document.getElementById('examCountDisplay');
        if (countDisplay) countDisplay.textContent = total;
    },
    
    populateExamForm() {
        const profile = window.lecturerDB?.getCurrentUserProfile();
        const program = profile?.program || profile?.department;
        
        // Program
        const programSelect = document.getElementById('examProgram');
        if (programSelect && program) {
            programSelect.innerHTML = `<option value="${program}">${program}</option>`;
        }
        
        // Blocks from assigned units
        const blocks = [...new Set(this.assignedUnits.map(u => u.block).filter(Boolean))];
        const blockSelect = document.getElementById('examBlockTerm');
        if (blockSelect) {
            blockSelect.innerHTML = '<option value="">-- Select Block/Term --</option>' +
                blocks.map(b => `<option value="${b}">${b}</option>`).join('');
        }
        
        // Units from assigned units
        this.loadUnitsForForm();
        
        // Set default date
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
                    `<option value="${u.subject_name}">${u.subject_code ? u.subject_code + ' - ' : ''}${u.subject_name}</option>`
                ).join('');
        } else {
            unitSelect.innerHTML = '<option value="">-- No units assigned --</option>';
        }
    },
    
    setupEventListeners() {
        const form = document.getElementById('addExamForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleAddExam(e));
        }
        
        const searchInput = document.getElementById('examSearch');
        if (searchInput) {
            let timeout;
            searchInput.addEventListener('input', () => {
                clearTimeout(timeout);
                timeout = setTimeout(() => this.filterExams(), 300);
            });
        }
        
        const searchBtn = document.getElementById('examSearchBtn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.filterExams());
        }
        
        // Block change -> update units
        const blockSelect = document.getElementById('examBlockTerm');
        if (blockSelect) {
            blockSelect.addEventListener('change', () => {
                const block = blockSelect.value;
                const unitSelect = document.getElementById('examUnit');
                if (unitSelect) {
                    const filtered = this.assignedUnits.filter(u => u.block === block || !block);
                    unitSelect.innerHTML = '<option value="">-- Select Unit (Optional) --</option>' +
                        filtered.map(u => 
                            `<option value="${u.subject_name}">${u.subject_code ? u.subject_code + ' - ' : ''}${u.subject_name}</option>`
                        ).join('');
                }
            });
        }
    },
    
    filterExams() {
        const searchTerm = document.getElementById('examSearch')?.value?.toLowerCase() || '';
        const rows = document.querySelectorAll('#examsTable tr');
        let visibleCount = 0;
        
        rows.forEach(row => {
            const text = row.textContent?.toLowerCase() || '';
            const match = text.includes(searchTerm);
            row.style.display = match ? '' : 'none';
            if (match) visibleCount++;
        });
        
        const countDisplay = document.getElementById('examCountDisplay');
        if (countDisplay) countDisplay.textContent = visibleCount;
    },
    
    async handleAddExam(e) {
        e.preventDefault();
        const btn = e.submitter || e.target.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
        
        const formData = {
            title: document.getElementById('examTitle')?.value,
            date: document.getElementById('examDate')?.value,
            type: document.getElementById('examType')?.value,
            program: document.getElementById('examProgram')?.value,
            intake: document.getElementById('examIntake')?.value,
            block: document.getElementById('examBlockTerm')?.value,
            unit: document.getElementById('examUnit')?.value,
            startTime: document.getElementById('examStartTime')?.value,
            duration: document.getElementById('examDurationMinutes')?.value,
            status: document.getElementById('examStatus')?.value,
            link: document.getElementById('examLink')?.value,
            venue: document.getElementById('examVenue')?.value
        };
        
        const required = ['title', 'date', 'type', 'program', 'intake', 'block', 'duration'];
        if (required.some(f => !formData[f])) {
            window.showNotification('Please fill all required fields.', 'error');
            btn.disabled = false;
            btn.innerHTML = originalText;
            return;
        }
        
        try {
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const lecturerId = this.lecturerAssignmentId || profile?.user_id;
            const supabase = window.lecturerDB?.supabase;
            
            if (!supabase) {
                throw new Error('Database connection not available');
            }
            
            // ✅ Use exams table with correct column names
            const { data: result, error } = await supabase
                .from('exams')
                .insert({
                    exam_name: formData.title,
                    title: formData.title,
                    exam_date: formData.date,
                    exam_type: formData.type,
                    target_program: formData.program,  // ✅ FIXED: target_program
                    program_type: formData.program,     // ✅ FIXED: program_type
                    intake_year: parseInt(formData.intake),
                    block_term: formData.block,         // ✅ FIXED: block_term
                    block: formData.block,
                    course_name: formData.unit || null,
                    course_code: formData.unit || null,
                    exam_start_time: formData.startTime || null,
                    duration_minutes: parseInt(formData.duration),
                    status: formData.status || 'Scheduled',
                    online_link: formData.link || null,
                    exam_link: formData.link || null,
                    venue: formData.venue || null,
                    created_by: lecturerId,             // ✅ FIXED: created_by
                    approval_status: 'pending',
                    created_at: new Date().toISOString()
                })
                .select();
            
            if (error) throw error;
            
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
        }
    },
    
    async editExam(examId) {
        const exam = this.exams.find(e => e.id === examId);
        if (!exam) {
            window.showNotification('Exam not found.', 'error');
            return;
        }
        
        const newTitle = prompt('Edit Exam Title:', exam.exam_name || exam.title || '');
        if (newTitle !== null && newTitle !== (exam.exam_name || exam.title)) {
            try {
                const supabase = window.lecturerDB?.supabase;
                if (!supabase) {
                    throw new Error('Database connection not available');
                }
                
                const { error } = await supabase
                    .from('exams')
                    .update({ exam_name: newTitle, title: newTitle })
                    .eq('id', examId);
                
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
        if (!exam) {
            window.showNotification('Exam not found.', 'error');
            return;
        }
        
        if (!confirm(`Delete exam "${exam.exam_name || exam.title || 'Exam'}"?`)) return;
        
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) {
                throw new Error('Database connection not available');
            }
            
            const { error } = await supabase
                .from('exams')
                .delete()
                .eq('id', examId);
            
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
        if (!exam) {
            window.showNotification('Exam not found.', 'error');
            return;
        }
        
        window.showNotification(`📝 Grading: ${exam.exam_name || exam.title || 'Exam'} - Feature coming soon!`, 'info');
        console.log('Grading exam:', exam);
    },
    
    exportExams() {
        const exams = this.exams;
        if (exams.length === 0) {
            window.showNotification('No exams to export.', 'warning');
            return;
        }
        
        const headers = ['Type', 'Title', 'Unit', 'Program', 'Block', 'Date', 'Duration', 'Status'];
        const rows = exams.map(e => [
            e.exam_type || 'N/A',
            e.exam_name || e.title || 'N/A',
            e.course_name || e.course_code || 'N/A',
            e.target_program || e.program_type || 'N/A',
            e.block_term || e.block || 'N/A',
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
            const date = new Date(dateString);
            return date.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        } catch {
            return dateString;
        }
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

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => LecturerExams.init(), 800);
});

// Make globally accessible
window.LecturerExams = LecturerExams;
window.searchExams = () => LecturerExams.filterExams();
window.exportExams = () => LecturerExams.exportExams();

console.log('✅ LecturerExams module loaded - Using exams table with correct columns');
