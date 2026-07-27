// js/lecturer-exams.js - FIXED with multi-ID support
/**
 * NCHSM Lecturer Exams Module
 * Uses exams table with UUID created_by
 * Handles multiple lecturer IDs (UUID, STAFF101, STAFF102)
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
            
            const authId = profile.user_id;
            const fullName = profile.full_name;
            
            console.log('🔍 Auth ID (UUID):', authId);
            console.log('🔍 Lecturer name:', fullName);
            
            // Store UUID for exams (created_by is UUID)
            this.lecturerUuid = authId;
            
            // Find all lecturer IDs by name
            const { data: assignments, error: assignError } = await supabase
                .from('lecturer_subject_assignments')
                .select('lecturer_id, lecturer_name')
                .ilike('lecturer_name', `%${fullName}%`);
            
            if (!assignError && assignments && assignments.length > 0) {
                console.log('📋 Found lecturer assignments by name:', assignments);
                
                // Try to find STAFF ID first (non-UUID)
                const staffId = assignments.find(a => {
                    const id = a.lecturer_id;
                    return id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id));
                });
                
                if (staffId) {
                    this.lecturerAssignmentId = staffId.lecturer_id;
                    console.log('✅ Found STAFF ID:', this.lecturerAssignmentId);
                } else {
                    this.lecturerAssignmentId = assignments[0].lecturer_id;
                    console.log('⚠️ Using first match ID:', this.lecturerAssignmentId);
                }
                
                // Also try STAFF102 directly if not found
                if (!this.lecturerAssignmentId || this.lecturerAssignmentId === authId) {
                    const { data: staffCheck } = await supabase
                        .from('lecturer_subject_assignments')
                        .select('lecturer_id')
                        .eq('lecturer_id', 'STAFF102')
                        .limit(1);
                    
                    if (staffCheck && staffCheck.length > 0) {
                        this.lecturerAssignmentId = 'STAFF102';
                        console.log('✅ Found STAFF102 directly:', this.lecturerAssignmentId);
                    }
                }
                
                return;
            }
            
            // Fallback to auth ID
            this.lecturerAssignmentId = authId;
            console.log('⚠️ Falling back to auth ID:', this.lecturerAssignmentId);
            
        } catch (error) {
            console.error('Error resolving lecturer ID:', error);
            this.lecturerAssignmentId = null;
            this.lecturerUuid = null;
        }
    },
    
    // ============================================
    // LOAD ASSIGNED UNITS - GET ALL UNITS FOR THE LECTURER
    // ============================================
    async loadAssignedUnits() {
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) {
                console.warn('⚠️ Supabase not available');
                return;
            }
            
            const profile = window.lecturerDB?.getCurrentUserProfile();
            if (!profile) {
                console.warn('⚠️ No lecturer profile found');
                return;
            }
            
            const fullName = profile.full_name;
            console.log('🔍 Loading assigned units for exams:', fullName);
            
            // ✅ Get ALL assignments for this lecturer by name
            const { data: assignments, error } = await supabase
                .from('lecturer_subject_assignments')
                .select('subject_name, subject_code, block, program, academic_year, lecturer_id')
                .ilike('lecturer_name', `%${fullName}%`);
            
            if (error) {
                console.error('❌ Error loading assigned units:', error);
                this.assignedUnits = [];
                return;
            }
            
            // ✅ Filter to KRCHN program
            const krchnUnits = assignments?.filter(u => u.program === 'KRCHN') || [];
            const allUnits = assignments || [];
            this.assignedUnits = krchnUnits.length > 0 ? krchnUnits : allUnits;
            
            console.log(`📚 Loaded ${this.assignedUnits.length} assigned units for exams:`, 
                this.assignedUnits.map(u => `${u.subject_name} (${u.lecturer_id})`));
            
        } catch (error) {
            console.error('❌ Failed to load assigned units:', error);
            this.assignedUnits = [];
        }
    },
    
   // ============================================
// LOAD EXAMS - Show ALL KRCHN exams
// ============================================
async loadExams() {
    try {
        const profile = window.lecturerDB?.getCurrentUserProfile();
        const program = profile?.program || profile?.department;
        
        if (!program) {
            console.warn('No program found');
            return;
        }
        
        const supabase = window.lecturerDB?.supabase;
        if (!supabase) {
            console.warn('Supabase not available');
            return;
        }
        
        console.log('🔍 Loading ALL exams for program:', program);
        
        // ✅ Show ALL exams for the program (not just created by this lecturer)
        const { data: exams, error } = await supabase
            .from('exams')
            .select('*')
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
        
        console.log(`✅ Loaded ${this.exams.length} KRCHN exams`);
        
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
    
  // ============================================
// RENDER EXAMS - WITH OWNERSHIP CHECK
// ============================================
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
    
    // ✅ Get the current lecturer's UUID
    const profile = window.lecturerDB?.getCurrentUserProfile();
    const currentLecturerUuid = this.lecturerUuid || profile?.user_id;
    
    const statusColors = {
        'Scheduled': '#f59e0b',
        'InProgress': '#3b82f6',
        'Completed': '#10b981',
        'Cancelled': '#ef4444',
        'published': '#10b981',
        'Upcoming': '#f59e0b'
    };
    
    const statusIcons = {
        'Scheduled': '📅',
        'InProgress': '🔄',
        'Completed': '✅',
        'Cancelled': '❌',
        'published': '✅',
        'Upcoming': '⏳'
    };
    
    const approvalBadges = {
        'pending': '<span style="background: #fef3c7; color: #92400e; padding: 2px 10px; border-radius: 12px; font-size: 10px;">⏳ Pending</span>',
        'approved': '<span style="background: #d1fae5; color: #065f46; padding: 2px 10px; border-radius: 12px; font-size: 10px;">✅ Approved</span>',
        'rejected': '<span style="background: #fee2e2; color: #991b1b; padding: 2px 10px; border-radius: 12px; font-size: 10px;">❌ Rejected</span>',
        'draft': '<span style="background: #e5e7eb; color: #6b7280; padding: 2px 10px; border-radius: 12px; font-size: 10px;">📝 Draft</span>'
    };
    
    tbody.innerHTML = exams.map(exam => {
        // ✅ Check if this exam was created by the current lecturer
        const isOwner = exam.created_by === currentLecturerUuid;
        
        const unit = exam.unit_name || exam.course_name || exam.course_code || 'General';
        const dateTime = exam.exam_date ? (this.formatDate(exam.exam_date)) + (exam.exam_start_time ? ' ' + exam.exam_start_time : '') : 'N/A';
        const status = exam.status || 'Scheduled';
        const statusColor = statusColors[status] || '#6b7280';
        const statusIcon = statusIcons[status] || '📌';
        const approvalStatus = exam.approval_status || 'draft';
        const approvalBadge = approvalBadges[approvalStatus] || approvalBadges.draft;
        
        let actions = '';
        
        // ✅ Only show Edit/Delete buttons if the lecturer owns this exam
        if (isOwner) {
            if (approvalStatus === 'draft' || approvalStatus === 'pending') {
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
            
            if (approvalStatus === 'approved' || status === 'published' || status === 'Completed') {
                actions += `
                    <button onclick="LecturerExams.gradeExam('${exam.id}')" 
                            style="background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;">
                        <i class="fas fa-check-circle"></i> Grade
                    </button>
                `;
            }
        } else {
            // ❌ Not owner - show read-only indicator
            actions = `<span style="color: #94a3b8; font-size: 11px;">👤 Another Lecturer</span>`;
        }
        
        return `
            <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s; ${!isOwner ? 'opacity: 0.75;' : ''}" 
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
                <td style="padding: 14px 18px; color: #475569;">
                    ${this.escapeHtml(unit)}
                </td>
                <td style="padding: 14px 18px; color: #475569;">
                    ${this.escapeHtml(exam.target_program || exam.program_type || 'N/A')}/${this.escapeHtml(exam.block || exam.block_term || 'N/A')}
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
        
        console.log('📝 Populating exam form for program:', program);
        
        // Program
        const programSelect = document.getElementById('examProgram');
        if (programSelect && program) {
            programSelect.innerHTML = `<option value="${program}">${program}</option>`;
        }
        
        // Blocks from assigned units
        const blocks = [...new Set(this.assignedUnits.map(u => u.block).filter(Boolean))];
        const blockSelect = document.getElementById('examBlockTerm');
        if (blockSelect) {
            if (blocks.length > 0) {
                blockSelect.innerHTML = '<option value="">-- Select Block/Term --</option>' +
                    blocks.map(b => `<option value="${b}">${b}</option>`).join('');
            } else {
                blockSelect.innerHTML = '<option value="">-- No blocks assigned --</option>';
            }
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
                    `<option value="${u.subject_name}">${u.subject_code ? u.subject_code + ' - ' : ''}${u.subject_name} ${u.block ? '(' + u.block + ')' : ''}</option>`
                ).join('');
            console.log(`✅ Loaded ${units.length} units for exam form`);
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
                            `<option value="${u.subject_name}">${u.subject_code ? u.subject_code + ' - ' : ''}${u.subject_name} ${u.block ? '(' + u.block + ')' : ''}</option>`
                        ).join('');
                }
            });
        }
    },
    
   // ============================================
// FILTER EXAMS - FIXED
// ============================================
filterExams() {
    const searchTerm = document.getElementById('examSearch')?.value?.toLowerCase() || '';
    const typeFilter = document.getElementById('examTypeFilter')?.value || 'all';
    const statusFilter = document.getElementById('examStatusFilter')?.value || 'all';
    const blockFilter = document.getElementById('examBlockFilter')?.value || 'all';
    
    const filtered = this.exams.filter(exam => {
        // Search filter
        let match = true;
        if (searchTerm) {
            const searchable = `${exam.exam_name || ''} ${exam.title || ''} ${exam.exam_type || ''} ${exam.block || ''}`.toLowerCase();
            match = searchable.includes(searchTerm);
        }
        
        // Type filter
        if (match && typeFilter !== 'all') {
            match = (exam.exam_type || '').toLowerCase() === typeFilter;
        }
        
        // Status filter
        if (match && statusFilter !== 'all') {
            match = (exam.status || '').toLowerCase() === statusFilter;
        }
        
        // Block filter
        if (match && blockFilter !== 'all') {
            match = (exam.block || '').toLowerCase() === blockFilter;
        }
        
        return match;
    });
    
    this.filteredExams = filtered;
    this.renderExams();
    
    // Update count
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
            this.isProcessing = false;
            return;
        }
        
        try {
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const supabase = window.lecturerDB?.supabase;
            
            if (!supabase) {
                throw new Error('Database connection not available');
            }
            
            // ✅ Use UUID for created_by
            const lecturerUuid = this.lecturerUuid || profile?.user_id;
            
            if (!lecturerUuid) {
                throw new Error('No UUID found for lecturer');
            }
            
            const examData = {
                exam_name: formData.title,
                title: formData.title,
                exam_date: formData.date,
                exam_type: formData.type,
                target_program: formData.program,
                program_type: formData.program,
                intake_year: parseInt(formData.intake),
                block: formData.block,
                block_term: formData.block,
                course_name: formData.unit || null,
                unit_name: formData.unit || null,
                exam_start_time: formData.startTime || null,
                duration_minutes: parseInt(formData.duration),
                status: formData.status || 'Scheduled',
                online_link: formData.link || null,
                exam_link: formData.link || null,
                venue: formData.venue || null,
                created_by: lecturerUuid,
                approval_status: 'pending',
                created_at: new Date().toISOString()
            };
            
            console.log('📤 Creating exam with UUID created_by:', lecturerUuid);
            
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
    
   // ============================================
// EDIT EXAM - WITH OWNERSHIP CHECK
// ============================================
async editExam(examId) {
    const exam = this.exams.find(e => e.id === examId);
    if (!exam) {
        window.showNotification('Exam not found.', 'error');
        return;
    }
    
    // ✅ Check if the current lecturer owns this exam
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
            if (!supabase) {
                throw new Error('Database connection not available');
            }
            
            const { error } = await supabase
                .from('exams')
                .update({ exam_name: newTitle, title: newTitle })
                .eq('id', examId)
                .eq('created_by', currentLecturerUuid); // ✅ Only if owner
            
            if (error) throw error;
            
            window.showNotification('✅ Exam updated!', 'success');
            await this.loadExams();
            
        } catch (error) {
            console.error('Error updating exam:', error);
            window.showNotification('Failed to update exam: ' + error.message, 'error');
        }
    }
},
    
  // ============================================
// DELETE EXAM - WITH OWNERSHIP CHECK
// ============================================
async deleteExam(examId) {
    const exam = this.exams.find(e => e.id === examId);
    if (!exam) {
        window.showNotification('Exam not found.', 'error');
        return;
    }
    
    // ✅ Check if the current lecturer owns this exam
    const profile = window.lecturerDB?.getCurrentUserProfile();
    const currentLecturerUuid = this.lecturerUuid || profile?.user_id;
    
    if (exam.created_by !== currentLecturerUuid) {
        window.showNotification('❌ You can only delete exams you created.', 'warning');
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
            .eq('id', examId)
            .eq('created_by', currentLecturerUuid); // ✅ Extra safety - only if owner
        
        if (error) throw error;
        
        window.showNotification('✅ Exam deleted!', 'success');
        await this.loadExams();
        
    } catch (error) {
        console.error('Error deleting exam:', error);
        window.showNotification('Failed to delete exam: ' + error.message, 'error');
    }
},
   // ============================================
// GRADE EXAM - WITH OWNERSHIP CHECK
// ============================================
async gradeExam(examId) {
    const exam = this.exams.find(e => e.id === examId);
    if (!exam) {
        window.showNotification('Exam not found.', 'error');
        return;
    }
    
    // ✅ Check if the current lecturer owns this exam
    const profile = window.lecturerDB?.getCurrentUserProfile();
    const currentLecturerUuid = this.lecturerUuid || profile?.user_id;
    
    if (exam.created_by !== currentLecturerUuid) {
        window.showNotification('❌ You can only grade exams you created.', 'warning');
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
            e.course_name || e.unit_name || e.course_code || 'N/A',
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

// ============================================
// GLOBAL EXPOSURE - COMPLETE FIX
// ============================================

// Make ALL functions globally accessible
window.LecturerExams = LecturerExams;
window.deleteExam = (id) => LecturerExams.deleteExam(id);
window.editExam = (id) => LecturerExams.editExam(id);
window.gradeExam = (id) => LecturerExams.gradeExam(id);
window.searchExams = () => LecturerExams.filterExams();
window.exportExams = () => LecturerExams.exportExams();
window.loadExams = () => LecturerExams.loadExams();
window.refreshExams = () => LecturerExams.refresh();

console.log('✅ LecturerExams module loaded - Multi-ID support (UUID, STAFF101, STAFF102)');
console.log('✅ Available functions:');
console.log('  - deleteExam(id)');
console.log('  - editExam(id)');
console.log('  - gradeExam(id)');
console.log('  - searchExams()');
console.log('  - exportExams()');
console.log('  - loadExams()');
console.log('  - refreshExams()');

// ============================================
// INITIALIZE ON DOM READY
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => LecturerExams.init(), 800);
});
