// js/lecturer-students.js - READ-ONLY VERSION WITH TVET SUPPORT
// ============================================
// NCHSM Lecturer Students Module
// READ-ONLY: Lecturers can ONLY view students and upload supporting documents
// No editing, deleting, or modifying student records
// Supports both Nursing (KRCHN) and TVET programs
// ============================================

const LecturerStudents = {
    students: [],
    filteredStudents: [],
    selectedStudentId: null,
    currentStudent: null,
    uploads: [],
    filters: {
        intake: 'all',
        block: 'all',
        status: 'all',
        risk: 'all',
        search: ''
    },
    lecturerAssignmentId: null,
    assignedUnits: [],
    isRefreshing: false,
    isTVET: false,
    currentProgram: 'KRCHN',
    
    // ─── PROGRAM TYPE DETECTION ───
    getProgramType() {
        return window.CURRENT_PROGRAM_TYPE || 'KRCHN';
    },
    
    isTVETProgram() {
        return this.getProgramType() === 'TVET';
    },
    
    getBlockDisplay(blockValue) {
        if (!blockValue) return 'N/A';
        
        const programType = this.getProgramType();
        if (programType === 'TVET') {
            const match = blockValue.match(/^Y(\d)T(\d)$/);
            if (match) {
                const year = parseInt(match[1]);
                const term = parseInt(match[2]);
                const termNames = ['', 'First', 'Second', 'Third'];
                return `Year ${year} ${termNames[term] || term} Term`;
            }
            if (blockValue.includes('Term')) return blockValue;
            if (blockValue === 'Introductory') return '🌟 Introductory Term';
            return blockValue;
        } else {
            if (blockValue.startsWith('Block ')) return blockValue;
            if (blockValue === 'Introductory') return '🌟 Introductory Block';
            if (blockValue === 'Final') return '🏆 Final Block';
            return `Block ${blockValue}`;
        }
    },
    
    getProgramTypeLabel() {
        return this.isTVETProgram() ? '🔧 TVET' : '🎓 Nursing';
    },
    
    getProgramEmoji() {
        return this.isTVETProgram() ? '🔧' : '🎓';
    },
    
    // ─── INIT ───
    async init() {
        console.log('👥 Initializing Lecturer Students (Read-Only)...');
        this.currentProgram = this.getProgramType();
        this.isTVET = this.isTVETProgram();
        console.log(`📚 Program Type: ${this.getProgramTypeLabel()}`);
        
        try {
            await this.resolveLecturerId();
            await this.loadAssignedUnits();
            await this.loadStudents();
            await this.loadUploads();
            this.setupEventListeners();
            this.updateStats();
            this.setupBulkUpload();
            this.updateProgramBadge();
            console.log('✅ Lecturer Students initialized (Read-Only mode)');
            console.log(`👨‍🎓 ${this.students.length} students loaded (${this.getProgramTypeLabel()})`);
            console.log(`📁 ${this.uploads.length} uploads found`);
        } catch (error) {
            console.error('❌ Students initialization error:', error);
        }
    },
    
    // ─── UPDATE PROGRAM BADGE ───
    updateProgramBadge() {
        const typeLabel = this.getProgramTypeLabel();
        const emoji = this.getProgramEmoji();
        
        // Update the subtitle
        const subtitle = document.getElementById('programSubtitle');
        if (subtitle) {
            subtitle.textContent = `${emoji} ${typeLabel} - ${this.students.length} students`;
        }
        
        // Update any program badge
        const badge = document.getElementById('userProgramBadge');
        if (badge) {
            badge.textContent = `${this.currentProgram} (${typeLabel})`;
            badge.style.background = this.isTVET ? 'rgba(139,92,246,0.3)' : 'rgba(76,29,149,0.3)';
            badge.style.border = this.isTVET ? '1px solid #8b5cf6' : '1px solid #4C1D95';
        }
    },
    
    // ─── RESOLVE LECTURER ID ───
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
            
            console.log('🔍 Auth ID:', authId);
            console.log('🔍 Lecturer name:', fullName);
            
            // Try to find by name in lecturer_subject_assignments
            const { data, error } = await supabase
                .from('lecturer_subject_assignments')
                .select('lecturer_id, lecturer_name')
                .eq('lecturer_name', fullName)
                .limit(1);
            
            if (!error && data && data.length > 0) {
                this.lecturerAssignmentId = data[0].lecturer_id;
                console.log('✅ Found lecturer ID by name:', this.lecturerAssignmentId);
                return;
            }
            
            // Try partial name match with scoring
            const nameParts = fullName.toLowerCase().split(' ');
            const { data: allLecturers, error: allError } = await supabase
                .from('lecturer_subject_assignments')
                .select('lecturer_id, lecturer_name')
                .order('created_at', { ascending: false });
            
            if (!allError && allLecturers && allLecturers.length > 0) {
                let bestMatch = null;
                let bestScore = -1;
                
                for (const lecturer of allLecturers) {
                    const lecturerName = lecturer.lecturer_name || '';
                    const lecturerId = lecturer.lecturer_id;
                    let score = 0;
                    
                    const lecturerNameLower = lecturerName.toLowerCase();
                    for (const part of nameParts) {
                        if (part.length > 1 && lecturerNameLower.includes(part)) {
                            score += 5;
                        }
                    }
                    
                    if (lecturerNameLower === fullName.toLowerCase()) {
                        score += 20;
                    }
                    
                    if (!lecturerId.toString().startsWith('STAFF')) {
                        score += 50;
                    }
                    
                    if (lecturerId.toString().includes('-')) {
                        score += 30;
                    }
                    
                    if (score > bestScore) {
                        bestScore = score;
                        bestMatch = lecturerId;
                    }
                }
                
                if (bestMatch) {
                    this.lecturerAssignmentId = bestMatch;
                    console.log(`✅ Selected lecturer ID with score ${bestScore}:`, this.lecturerAssignmentId);
                    return;
                }
            }
            
            this.lecturerAssignmentId = authId;
            console.log('⚠️ Falling back to auth ID:', this.lecturerAssignmentId);
            
        } catch (error) {
            console.error('Error resolving lecturer ID:', error);
            this.lecturerAssignmentId = null;
        }
    },
    
    // ─── LOAD ASSIGNED UNITS ───
    async loadAssignedUnits() {
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) return;
            
            const profile = window.lecturerDB?.getCurrentUserProfile();
            if (!profile) return;
            
            const lecturerId = this.lecturerAssignmentId || profile.user_id;
            const program = this.currentProgram || profile.program || 'KRCHN';
            
            const { data: assignments, error } = await supabase
                .from('lecturer_subject_assignments')
                .select('subject_name, subject_code, block, program, academic_year')
                .eq('lecturer_id', lecturerId)
                .eq('program', program);
            
            if (error) {
                console.error('Error loading assigned units:', error);
                return;
            }
            
            this.assignedUnits = assignments || [];
            console.log(`📚 Loaded ${this.assignedUnits.length} assigned units (${this.getProgramTypeLabel()})`);
            
        } catch (error) {
            console.error('Failed to load assigned units:', error);
        }
    },
    
    // ─── LOAD STUDENTS ───
async loadStudents() {
    try {
        const profile = window.lecturerDB?.getCurrentUserProfile();
        const program = this.currentProgram || profile?.program || profile?.department || 'KRCHN';
        
        const supabase = window.lecturerDB?.supabase;
        if (!supabase) {
            console.warn('Supabase not available');
            return;
        }
        
        // ✅ FIX: Include BOTH 'active' AND 'approved' statuses
        const { data: students, error } = await supabase
            .from('consolidated_user_profiles_table')
            .select('*')
            .eq('role', 'student')
            .eq('program', program)
            .in('status', ['active', 'approved'])  // ← ADD THIS LINE
            .order('full_name', { ascending: true });
        
        if (error) {
            console.error('Error loading students:', error);
            return;
        }
        
        this.students = students || [];
        
        // Add block display for TVET
        this.students.forEach(s => {
            s.block_display = this.getBlockDisplay(s.block);
        });
        
        // Get student registrations for assigned units
        if (this.assignedUnits.length > 0) {
            const unitNames = this.assignedUnits.map(u => u.subject_name);
            const blocks = [...new Set(this.assignedUnits.map(u => u.block))];
            
            const { data: registrations, error: regError } = await supabase
                .from('student_unit_registrations')
                .select('student_id, unit_name, block, status')
                .eq('program', program)
                .eq('status', 'approved')
                .in('block', blocks)
                .in('unit_name', unitNames);
            
            if (!regError && registrations) {
                const registeredStudentIds = new Set(registrations.map(r => r.student_id));
                this.students.forEach(s => {
                    s.isRegistered = registeredStudentIds.has(s.user_id);
                    s.enrolledUnits = registrations
                        .filter(r => r.student_id === s.user_id)
                        .map(r => r.unit_name);
                });
            }
        }
        
        // Get risk data
        await this.loadRiskData();
        
        this.filteredStudents = [...this.students];
        
        this.populateFilters();
        this.renderTable();
        this.updateStats();
        this.updateProgramBadge();
        
        // Update badge
        const badge = document.getElementById('studentCountBadge');
        if (badge) badge.textContent = this.students.length;
        const badge2 = document.getElementById('studentCountBadge2');
        if (badge2) badge2.textContent = this.students.length;
        
        console.log(`✅ Loaded ${this.students.length} students (${this.getProgramTypeLabel()})`);
        
    } catch (error) {
        console.error('Failed to load students:', error);
        if (window.LecturerUI) {
            window.LecturerUI.showNotification('Failed to load students: ' + error.message, 'error');
        }
    }
},
    // ─── LOAD RISK DATA ───
    async loadRiskData() {
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) return;
            
            const studentIds = this.students.map(s => s.user_id);
            if (studentIds.length === 0) return;
            
            // Get attendance data
            const { data: attendance } = await supabase
                .from('geo_attendance_logs')
                .select('student_id, attendance_status')
                .in('student_id', studentIds);
            
            // Get marks data
            const { data: marks } = await supabase
                .from('student_marks')
                .select('student_id, final_score')
                .in('student_id', studentIds);
            
            // Calculate risk for each student
            const threshold = this.isTVET ? 50 : 60;
            
            this.students.forEach(student => {
                const studentAttendance = attendance?.filter(a => a.student_id === student.user_id) || [];
                const studentMarks = marks?.filter(m => m.student_id === student.user_id) || [];
                
                const absences = studentAttendance.filter(a => 
                    a.attendance_status === 'Absent' || a.attendance_status === 'absent'
                ).length;
                
                const avgScore = studentMarks.length > 0 
                    ? studentMarks.reduce((sum, m) => sum + (m.final_score || 0), 0) / studentMarks.length
                    : 0;
                
                // Risk score calculation
                let riskScore = 0;
                riskScore += Math.min(absences * 10, 50);
                riskScore += Math.max((100 - avgScore) * 0.3, 0);
                
                student.absences = absences;
                student.avgScore = Math.round(avgScore);
                student.riskScore = Math.round(riskScore);
                student.riskLevel = riskScore > 50 ? 'high' : (riskScore > 25 ? 'medium' : 'low');
                student.isPassing = avgScore >= threshold;
                student.passingThreshold = threshold;
            });
            
        } catch (error) {
            console.error('Failed to load risk data:', error);
        }
    },
    
    // ─── LOAD UPLOADS ───
    async loadUploads() {
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) return;
            
            const { data: uploads, error } = await supabase
                .from('student_uploads')
                .select('*')
                .order('uploaded_at', { ascending: false });
            
            if (error) {
                console.error('Error loading uploads:', error);
                return;
            }
            
            this.uploads = uploads || [];
            this.updateUploadStats();
            
        } catch (error) {
            console.error('Failed to load uploads:', error);
        }
    },
    
    // ─── UPDATE UPLOAD STATS ───
    updateUploadStats() {
        const el = document.getElementById('totalUploadsStat');
        if (el) {
            el.textContent = this.uploads.length || 0;
        }
    },
    
    // ─── POPULATE FILTERS ───
    populateFilters() {
        // Intake years
        const years = [...new Set(this.students.map(s => s.intake_year).filter(Boolean))].sort().reverse();
        const intakeFilter = document.getElementById('studentIntakeFilter');
        if (intakeFilter) {
            intakeFilter.innerHTML = '<option value="all">All Intakes</option>' +
                years.map(y => `<option value="${y}">${y}</option>`).join('');
        }
        
        // Blocks with display names (TVET support)
        const blocks = [...new Set(this.students.map(s => s.block).filter(Boolean))];
        const blockFilter = document.getElementById('studentBlockFilter');
        if (blockFilter) {
            blockFilter.innerHTML = '<option value="all">All Blocks</option>' +
                blocks.map(b => {
                    const displayName = this.getBlockDisplay(b);
                    return `<option value="${b}">${displayName}</option>`;
                }).join('');
        }
        
        // Update block filter label
        const blockLabel = document.querySelector('#studentBlockFilter-label');
        if (blockLabel) {
            const blockType = this.isTVET ? 'Term' : 'Block';
            blockLabel.innerHTML = `<i class="fas fa-layer-group" style="color: #4F46E5; width: 16px;"></i> ${blockType}`;
        }
    },
    
    // ─── RENDER TABLE ───
    renderTable() {
        const tbody = document.getElementById('studentsTableBody');
        if (!tbody) return;
        
        const students = this.filteredStudents;
        const typeLabel = this.getProgramTypeLabel();
        const emoji = this.getProgramEmoji();
        const threshold = this.isTVET ? 50 : 60;
        
        if (!students || students.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="padding: 50px 20px; text-align: center; color: #94a3b8;">
                        <i class="fas fa-users" style="font-size: 48px; display: block; margin-bottom: 15px; color: #e2e8f0;"></i>
                        <h3 style="color: #475569; margin: 0 0 8px 0;">No Students Found</h3>
                        <p style="margin: 0; font-size: 14px;">${this.students.length === 0 ? `No students in your ${typeLabel} program.` : 'Try adjusting your filters.'}</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = students.map(student => {
            const status = (student.status || 'Active');
            const statusClass = status.toLowerCase();
            const riskLevel = student.riskLevel || 'low';
            const regNo = student.student_id || student.admission_number || student.user_id?.substring(0, 8) || 'N/A';
            const isRegistered = student.isRegistered !== false;
            const initials = this.getInitials(student.full_name);
            const blockDisplay = student.block_display || this.getBlockDisplay(student.block);
            const isPassing = student.isPassing !== undefined ? student.isPassing : student.avgScore >= threshold;
            
            const riskColors = {
                high: { bg: '#fef2f2', border: '#dc2626' },
                medium: { bg: '#fffbeb', border: '#f59e0b' },
                low: { bg: '#f0fdf4', border: '#10b981' }
            };
            const riskColor = riskColors[riskLevel] || riskColors.low;
            
            return `
                <tr style="border-bottom: 1px solid #f1f5f9; transition: all 0.2s; ${riskLevel === 'high' ? 'background: #fef2f2;' : riskLevel === 'medium' ? 'background: #fffbeb;' : ''}" 
                    onmouseover="this.style.background='${riskLevel === 'high' ? '#fee2e2' : riskLevel === 'medium' ? '#fef3c7' : '#f8fafc'}'" 
                    onmouseout="this.style.background='${riskLevel === 'high' ? '#fef2f2' : riskLevel === 'medium' ? '#fffbeb' : 'transparent'}'">
                    <td style="padding: 12px 16px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #4F46E5, #7C3AED); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 14px; flex-shrink: 0;">
                                ${initials}
                            </div>
                            <div>
                                <div style="font-weight: 600; color: #0F172A;">${this.escapeHtml(student.full_name || 'N/A')}</div>
                                ${!isRegistered ? '<span style="font-size: 10px; color: #94a3b8;">⚠️ Not registered</span>' : ''}
                                ${this.isTVET ? '<span style="font-size: 9px; color: #8b5cf6; margin-left: 4px;">🔧 TVET</span>' : ''}
                            </div>
                        </div>
                    </td>
                    <td style="padding: 12px 16px; font-weight: 600; color: #4F46E5; font-size: 13px;">
                        ${this.escapeHtml(regNo)}
                    </td>
                    <td style="padding: 12px 16px; color: #475569; font-size: 13px;">
                        ${this.escapeHtml(student.email || 'N/A')}
                    </td>
                    <td style="padding: 12px 16px;">
                        <span style="background: ${this.isTVET ? '#EDE9FE' : '#DBEAFE'}; color: ${this.isTVET ? '#7C3AED' : '#1E40AF'}; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;">
                            ${this.escapeHtml(student.program || 'N/A')}
                        </span>
                    </td>
                    <td style="padding: 12px 16px; color: #475569; font-size: 13px;">
                        ${this.escapeHtml(student.intake_year || 'N/A')}
                    </td>
                    <td style="padding: 12px 16px; font-size: 13px;">
                        ${this.escapeHtml(blockDisplay)}
                        ${this.isTVET ? `<div style="font-size: 9px; color: #8b5cf6;">TVET Term</div>` : ''}
                    </td>
                    <td style="padding: 12px 16px;">
                        <span class="status-badge status-${statusClass}">
                            ${status === 'Active' ? '🟢 Active' : status === 'Probation' ? '🟡 Probation' : status === 'Inactive' ? '🔴 Inactive' : '🔵 ' + status}
                        </span>
                    </td>
                    <td style="padding: 12px 16px;">
                        <span class="risk-badge risk-${riskLevel}" style="background: ${riskColor.bg}; border: 1px solid ${riskColor.border};">
                            ${riskLevel === 'high' ? '🔴 High' : riskLevel === 'medium' ? '🟡 Medium' : '🟢 Low'}
                            ${student.avgScore > 0 ? ` (${student.avgScore}%)` : ''}
                            ${!isPassing && student.avgScore > 0 ? ` ⚠️` : ''}
                        </span>
                    </td>
                    <td style="padding: 12px 16px; text-align: center;">
                        <div style="display: flex; gap: 6px; justify-content: center; flex-wrap: wrap;">
                            <button onclick="LecturerStudents.openStudentModal('${student.user_id}')" 
                                    class="action-btn action-btn-view" style="padding: 6px 12px;">
                                <i class="fas fa-eye"></i> View
                            </button>
                            <button onclick="LecturerStudents.messageStudent('${student.user_id}')" 
                                    class="action-btn action-btn-message" style="padding: 6px 12px;">
                                <i class="fas fa-envelope"></i>
                            </button>
                            <button onclick="LecturerStudents.openStudentModal('${student.user_id}')" 
                                    class="action-btn action-btn-upload" style="padding: 6px 12px;">
                                <i class="fas fa-upload"></i> Upload
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
        // Update table count
        const countDisplay = document.getElementById('studentTableCount');
        if (countDisplay) {
            countDisplay.textContent = students.length;
        }
        
        const filterCount = document.getElementById('studentFilterCount');
        if (filterCount) {
            const total = this.students.length;
            if (students.length === total) {
                filterCount.textContent = `Showing all ${total} students (${typeLabel})`;
            } else {
                filterCount.textContent = `Showing ${students.length} of ${total} students (${typeLabel})`;
            }
        }
    },
    
    // ─── GET INITIALS ───
    getInitials(name) {
        if (!name) return '?';
        const parts = name.split(' ');
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    },
    
    // ─── UPDATE STATS ───
    updateStats() {
        const total = this.students.length;
        const filtered = this.filteredStudents.length;
        const atRisk = this.students.filter(s => (s.riskLevel || 'low') === 'high').length;
        const active = this.students.filter(s => (s.status || 'Active') === 'Active').length;
        const probation = this.students.filter(s => (s.status || '') === 'Probation').length;
        const programs = [...new Set(this.students.map(s => s.program).filter(Boolean))];
        const typeLabel = this.getProgramTypeLabel();
        const emoji = this.getProgramEmoji();
        const threshold = this.isTVET ? 50 : 60;
        
        // Stats cards
        const totalEl = document.getElementById('totalStudentsStat');
        if (totalEl) totalEl.textContent = total;
        
        const activeEl = document.getElementById('activeStudentsStat');
        if (activeEl) activeEl.textContent = active;
        
        const atRiskEl = document.getElementById('atRiskStudentsStat');
        if (atRiskEl) atRiskEl.textContent = atRisk;
        
        const programEl = document.getElementById('programCountStat');
        if (programEl) programEl.textContent = programs.length || 0;
        
        // Stats bar
        const totalDisplay = document.getElementById('studentTotalDisplay');
        if (totalDisplay) totalDisplay.textContent = filtered;
        
        const activeDisplay = document.getElementById('studentActiveDisplay');
        if (activeDisplay) activeDisplay.textContent = active;
        
        const riskDisplay = document.getElementById('studentRiskDisplay');
        if (riskDisplay) riskDisplay.textContent = atRisk;
        
        const probationDisplay = document.getElementById('studentProbationDisplay');
        if (probationDisplay) probationDisplay.textContent = probation;
        
        // Badges
        const badge = document.getElementById('studentCountBadge');
        if (badge) badge.textContent = total;
        const badge2 = document.getElementById('studentCountBadge2');
        if (badge2) badge2.textContent = total;
        
        // Update subtitle
        const subtitle = document.getElementById('programSubtitle');
        if (subtitle) {
            subtitle.textContent = `${emoji} ${typeLabel} - ${total} students (Passing: ≥${threshold}%)`;
        }
    },
    
    // ─── OPEN STUDENT MODAL ───
    openStudentModal(userId) {
        const student = this.students.find(s => s.user_id === userId);
        if (!student) {
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Student not found.', 'error');
            }
            return;
        }
        
        this.currentStudent = student;
        this.selectedStudentId = userId;
        
        const blockDisplay = student.block_display || this.getBlockDisplay(student.block);
        const threshold = this.isTVET ? 50 : 60;
        const isPassing = student.avgScore ? student.avgScore >= threshold : false;
        const typeLabel = this.getProgramTypeLabel();
        
        // Fill modal with student data
        document.getElementById('modalStudentName').textContent = student.full_name || 'Student Profile';
        document.getElementById('modalFullName').textContent = student.full_name || 'N/A';
        document.getElementById('modalRegNo').textContent = student.student_id || student.admission_number || 'N/A';
        document.getElementById('modalStudentId').textContent = student.user_id || 'N/A';
        document.getElementById('modalProgram').textContent = student.program || 'N/A';
        document.getElementById('modalIntake').textContent = student.intake_year || 'N/A';
        document.getElementById('modalBlock').textContent = blockDisplay || student.block || 'N/A';
        document.getElementById('modalEmail').textContent = student.email || 'N/A';
        document.getElementById('modalPhone').textContent = student.phone || 'N/A';
        
        // Program type badge in modal
        const programBadge = document.querySelector('.modal-program-badge');
        if (programBadge) {
            programBadge.textContent = typeLabel;
            programBadge.style.background = this.isTVET ? '#8b5cf6' : '#4C1D95';
        }
        
        // Status
        const statusEl = document.getElementById('modalStatus');
        const status = student.status || 'Active';
        statusEl.textContent = status;
        statusEl.className = 'status-badge status-' + status.toLowerCase();
        
        // Risk
        const riskEl = document.getElementById('modalRisk');
        const risk = student.riskLevel || 'low';
        riskEl.textContent = risk === 'high' ? '🔴 High Risk' : risk === 'medium' ? '🟡 Medium Risk' : '🟢 Low Risk';
        riskEl.className = 'risk-badge risk-' + risk;
        
        // Passing status
        const passingEl = document.getElementById('modalPassingStatus');
        if (passingEl) {
            if (student.avgScore) {
                passingEl.textContent = isPassing ? '✅ Passing' : '❌ Failing';
                passingEl.style.color = isPassing ? '#10b981' : '#ef4444';
                passingEl.style.fontWeight = '600';
            } else {
                passingEl.textContent = 'No marks';
                passingEl.style.color = '#94a3b8';
            }
        }
        
        // Passing threshold
        const thresholdEl = document.getElementById('modalThreshold');
        if (thresholdEl) {
            thresholdEl.textContent = `Passing: ≥${threshold}% (${typeLabel})`;
        }
        
        // Avatar
        const initials = this.getInitials(student.full_name);
        document.getElementById('modalAvatar').textContent = initials;
        
        // Units
        const unitsEl = document.getElementById('modalUnits');
        if (student.enrolledUnits && student.enrolledUnits.length > 0) {
            unitsEl.innerHTML = student.enrolledUnits.map(u => 
                `<span style="background: ${this.isTVET ? '#EDE9FE' : '#EEF2FF'}; padding: 2px 10px; border-radius: 12px; font-size: 12px; color: ${this.isTVET ? '#7C3AED' : '#4F46E5'}; margin: 2px; display: inline-block;">${this.escapeHtml(u)}</span>`
            ).join('');
        } else {
            unitsEl.textContent = 'No units enrolled';
            unitsEl.style.color = '#94a3b8';
        }
        
        // Load uploads for this student
        this.loadStudentUploads(userId);
        
        // Show modal
        document.getElementById('studentModal').classList.add('active');
        document.body.style.overflow = 'hidden';
    },
    
    // ─── LOAD STUDENT UPLOADS ───
    async loadStudentUploads(studentId) {
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) return;
            
            const { data: uploads, error } = await supabase
                .from('student_uploads')
                .select('*')
                .eq('student_id', studentId)
                .order('uploaded_at', { ascending: false });
            
            if (error) {
                console.error('Error loading student uploads:', error);
                return;
            }
            
            this.renderStudentUploads(uploads || []);
            
        } catch (error) {
            console.error('Failed to load student uploads:', error);
        }
    },
    
    // ─── RENDER STUDENT UPLOADS ───
    renderStudentUploads(uploads) {
        const container = document.getElementById('modalUploads');
        if (!container) return;
        
        if (!uploads || uploads.length === 0) {
            container.innerHTML = '<p style="color: #94A3B8; font-size: 13px;">No documents found for this student.</p>';
            return;
        }
        
        container.innerHTML = uploads.map(u => {
            const fileExt = u.file_name?.split('.').pop()?.toLowerCase() || '';
            const iconClass = ['pdf'].includes(fileExt) ? 'pdf' : 
                             ['doc', 'docx'].includes(fileExt) ? 'doc' : 
                             ['jpg', 'jpeg', 'png', 'gif'].includes(fileExt) ? 'img' : 'other';
            const icon = ['pdf'].includes(fileExt) ? 'fa-file-pdf' : 
                         ['doc', 'docx'].includes(fileExt) ? 'fa-file-word' : 
                         ['jpg', 'jpeg', 'png', 'gif'].includes(fileExt) ? 'fa-file-image' : 'fa-file';
            
            const size = u.file_size ? (u.file_size / 1024).toFixed(1) + ' KB' : 'N/A';
            const date = u.uploaded_at ? new Date(u.uploaded_at).toLocaleDateString() : 'N/A';
            const status = u.status || 'Pending Approval';
            
            return `
                <div class="upload-item">
                    <div class="file-icon ${iconClass}">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="file-info">
                        <div class="name">${this.escapeHtml(u.file_name || 'Untitled')}</div>
                        <div class="meta">${size} • ${date} • <span style="color: #F59E0B;">${status}</span></div>
                    </div>
                    <div class="file-download" onclick="LecturerStudents.downloadFile('${u.id}')">
                        <i class="fas fa-download"></i>
                    </div>
                    <!-- No delete button - read-only -->
                </div>
            `;
        }).join('');
    },
    
    // ─── CLOSE STUDENT MODAL ───
    closeStudentModal() {
        document.getElementById('studentModal').classList.remove('active');
        document.body.style.overflow = 'auto';
        this.currentStudent = null;
        this.selectedStudentId = null;
    },
    
    // ─── HANDLE FILE UPLOAD ───
    async handleFileUpload(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        
        const studentId = this.selectedStudentId;
        if (!studentId) {
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('No student selected.', 'error');
            }
            return;
        }
        
        for (const file of files) {
            await this.uploadFile(studentId, file);
        }
        
        // Reset file input
        event.target.value = '';
        
        // Reload uploads
        await this.loadStudentUploads(studentId);
        await this.loadUploads();
    },
    
    // ─── UPLOAD FILE (FOR APPROVAL) ───
    async uploadFile(studentId, file) {
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) return;
            
            const profile = window.lecturerDB?.getCurrentUserProfile();
            
            const { data, error } = await supabase
                .from('student_uploads')
                .insert({
                    student_id: studentId,
                    file_name: file.name,
                    file_size: file.size,
                    file_type: file.type,
                    uploaded_by: profile?.user_id || 'unknown',
                    uploaded_by_name: profile?.full_name || 'Lecturer',
                    uploaded_at: new Date().toISOString(),
                    status: 'Pending Approval'
                });
            
            if (error) {
                console.error('Error uploading file:', error);
                if (window.LecturerUI) {
                    window.LecturerUI.showNotification('Failed to upload: ' + file.name, 'error');
                }
                return;
            }
            
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('✅ Uploaded: ' + file.name + ' (Pending Approval)', 'success');
            }
            
            // Update uploads count
            this.uploads.push(data);
            this.updateUploadStats();
            
        } catch (error) {
            console.error('Failed to upload file:', error);
        }
    },
    
    // ─── DOWNLOAD FILE ───
    downloadFile(uploadId) {
        if (window.LecturerUI) {
            window.LecturerUI.showNotification('Download functionality coming soon.', 'info');
        }
        console.log('Download file:', uploadId);
    },
    
    // ─── SETUP BULK UPLOAD ───
    setupBulkUpload() {
        const dropzone = document.getElementById('bulkDropzone');
        if (!dropzone) return;
        
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });
        
        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        });
        
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleBulkFile({ target: { files } });
            }
        });
    },
    
    // ─── HANDLE BULK FILE ───
    handleBulkFile(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        
        const file = files[0];
        if (!file.name.endsWith('.csv')) {
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Please upload a CSV file.', 'error');
            }
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            this.parseCSV(text);
        };
        reader.readAsText(file);
    },
    
    // ─── PARSE CSV ───
    parseCSV(text) {
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('CSV file is empty or invalid.', 'error');
            }
            return;
        }
        
        // Parse headers
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const requiredHeaders = ['full_name', 'student_id', 'program', 'intake_year'];
        const missing = requiredHeaders.filter(h => !headers.includes(h));
        
        if (missing.length > 0) {
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Missing required columns: ' + missing.join(', '), 'error');
            }
            return;
        }
        
        // Parse data
        const students = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            const student = {};
            headers.forEach((h, index) => {
                student[h] = values[index] || '';
            });
            students.push(student);
        }
        
        this.processBulkUpload(students);
    },
    
    // ─── PROCESS BULK UPLOAD (FOR APPROVAL) ───
    async processBulkUpload(students) {
        const progressContainer = document.getElementById('bulkUploadProgress');
        const progressBar = document.getElementById('bulkProgressBar');
        const progressText = document.getElementById('bulkProgressText');
        
        progressContainer.style.display = 'block';
        
        const supabase = window.lecturerDB?.supabase;
        if (!supabase) return;
        
        const profile = window.lecturerDB?.getCurrentUserProfile();
        const typeLabel = this.getProgramTypeLabel();
        
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < students.length; i++) {
            const s = students[i];
            const progress = Math.round(((i + 1) / students.length) * 100);
            progressBar.style.width = progress + '%';
            progressText.textContent = `Processing... ${progress}% (${i + 1}/${students.length}) - ${typeLabel}`;
            
            try {
                const { data, error } = await supabase
                    .from('pending_student_uploads')
                    .insert({
                        full_name: s.full_name,
                        student_id: s.student_id,
                        program: s.program || this.currentProgram || 'KRCHN',
                        intake_year: s.intake_year,
                        block: s.block || '',
                        block_display: this.getBlockDisplay(s.block),
                        email: s.email || '',
                        phone: s.phone || '',
                        gender: s.gender || '',
                        uploaded_by: profile?.user_id || 'unknown',
                        uploaded_by_name: profile?.full_name || 'Lecturer',
                        uploaded_at: new Date().toISOString(),
                        status: 'Pending Approval',
                        program_type: this.getProgramTypeLabel(),
                        is_tvet: this.isTVET
                    });
                
                if (error) {
                    console.error('Error submitting student:', s, error);
                    errorCount++;
                } else {
                    successCount++;
                }
            } catch (error) {
                console.error('Error processing student:', s, error);
                errorCount++;
            }
        }
        
        // Final progress
        progressBar.style.width = '100%';
        progressText.textContent = `✅ Complete! ${successCount} students submitted for approval, ${errorCount} errors. (${typeLabel})`;
        
        if (window.LecturerUI) {
            window.LecturerUI.showNotification(`✅ ${successCount} ${typeLabel} students submitted for approval!`, 'success');
        }
        
        setTimeout(() => {
            this.closeBulkUpload();
        }, 3000);
    },
    
    // ─── SHOW UPLOADS ───
    showUploads() {
        document.getElementById('bulkUploadModal').classList.add('active');
        document.body.style.overflow = 'hidden';
    },
    
    // ─── CLOSE BULK UPLOAD ───
    closeBulkUpload() {
        document.getElementById('bulkUploadModal').classList.remove('active');
        document.body.style.overflow = 'auto';
        document.getElementById('bulkUploadProgress').style.display = 'none';
        document.getElementById('bulkProgressBar').style.width = '0%';
    },
    
    // ─── APPLY FILTERS ───
    applyFilters() {
        const intake = document.getElementById('studentIntakeFilter')?.value || 'all';
        const block = document.getElementById('studentBlockFilter')?.value || 'all';
        const status = document.getElementById('studentStatusFilter')?.value || 'all';
        const risk = document.getElementById('studentRiskFilter')?.value || 'all';
        const search = document.getElementById('studentSearch')?.value?.toLowerCase() || '';
        
        this.filteredStudents = this.students.filter(student => {
            const matchIntake = intake === 'all' || student.intake_year === intake;
            const matchBlock = block === 'all' || student.block === block;
            const matchStatus = status === 'all' || (student.status || 'Active') === status;
            const matchRisk = risk === 'all' || 
                (risk === 'at-risk' && (student.riskLevel || 'low') === 'high') ||
                (risk === 'low-risk' && (student.riskLevel || 'low') === 'low');
            const matchSearch = !search || 
                student.full_name?.toLowerCase().includes(search) || 
                student.student_id?.toLowerCase().includes(search) ||
                student.admission_number?.toLowerCase().includes(search) ||
                student.email?.toLowerCase().includes(search);
            
            return matchIntake && matchBlock && matchStatus && matchRisk && matchSearch;
        });
        
        this.renderTable();
        this.updateStats();
    },
    
    // ─── CLEAR FILTERS ───
    clearFilters() {
        const filterIds = ['studentIntakeFilter', 'studentBlockFilter', 'studentStatusFilter', 'studentRiskFilter'];
        filterIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = 'all';
        });
        
        const searchEl = document.getElementById('studentSearch');
        if (searchEl) searchEl.value = '';
        
        this.filteredStudents = [...this.students];
        this.renderTable();
        this.updateStats();
        
        if (window.LecturerUI) {
            window.LecturerUI.showNotification('Filters cleared!', 'info');
        }
    },
    
    // ─── SETUP EVENT LISTENERS ───
    setupEventListeners() {
        ['studentIntakeFilter', 'studentBlockFilter', 'studentStatusFilter', 'studentRiskFilter'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', () => this.applyFilters());
            }
        });
        
        const searchInput = document.getElementById('studentSearch');
        if (searchInput) {
            let timeout;
            searchInput.addEventListener('input', () => {
                clearTimeout(timeout);
                timeout = setTimeout(() => this.applyFilters(), 300);
            });
        }
        
        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeStudentModal();
                this.closeBulkUpload();
            }
        });
        
        // Close modal on overlay click
        const modal = document.getElementById('studentModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeStudentModal();
                }
            });
        }
        
        const bulkModal = document.getElementById('bulkUploadModal');
        if (bulkModal) {
            bulkModal.addEventListener('click', (e) => {
                if (e.target === bulkModal) {
                    this.closeBulkUpload();
                }
            });
        }
    },
    
    // ─── MESSAGE STUDENT ───
    messageStudent(userId) {
        const student = this.students.find(s => s.user_id === userId);
        if (!student) {
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Student not found.', 'error');
            }
            return;
        }
        
        // Switch to messages tab
        if (typeof showTab === 'function') {
            showTab('messages');
        }
        
        // Set target student
        const targetSelect = document.getElementById('msgTarget');
        if (targetSelect) {
            for (let i = 0; i < targetSelect.options.length; i++) {
                if (targetSelect.options[i].value === userId) {
                    targetSelect.value = userId;
                    break;
                }
            }
        }
        
        if (window.LecturerUI) {
            window.LecturerUI.showNotification(`Ready to message ${student.full_name} (${this.getProgramTypeLabel()})`, 'info');
        }
    },
    
    // ─── EXPORT STUDENTS ───
    exportStudents() {
        const students = this.filteredStudents || this.students;
        if (students.length === 0) {
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('No students to export.', 'warning');
            }
            return;
        }
        
        const typeLabel = this.getProgramTypeLabel();
        const threshold = this.isTVET ? 50 : 60;
        
        const headers = ['Name', 'Reg No', 'Email', 'Program', 'Intake', 'Block', 'Block Display', 'Status', 'Risk Level', 'Absences', 'Avg Score', 'Passing', 'Program Type'];
        const rows = students.map(s => {
            const blockDisplay = s.block_display || this.getBlockDisplay(s.block);
            const isPassing = s.avgScore ? s.avgScore >= threshold : false;
            return [
                s.full_name || 'N/A',
                s.student_id || s.admission_number || 'N/A',
                s.email || 'N/A',
                s.program || 'N/A',
                s.intake_year || 'N/A',
                s.block || 'N/A',
                blockDisplay,
                s.status || 'Active',
                s.riskLevel || 'low',
                s.absences || 0,
                s.avgScore || 'N/A',
                isPassing ? 'PASS' : 'FAIL',
                typeLabel
            ];
        });
        
        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `students_${typeLabel}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        if (window.LecturerUI) {
            window.LecturerUI.showNotification(`✅ ${typeLabel} students exported successfully!`, 'success');
        }
    },
    
    // ─── ESCAPE HTML ───
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    // ─── REFRESH ───
    async refresh() {
        if (this.isRefreshing) return;
        this.isRefreshing = true;
        
        try {
            await this.resolveLecturerId();
            await this.loadAssignedUnits();
            await this.loadStudents();
            await this.loadUploads();
            this.updateStats();
            this.updateProgramBadge();
            if (window.LecturerUI) {
                window.LecturerUI.showNotification(`${this.getProgramTypeLabel()} students refreshed!`, 'success');
            }
        } catch (error) {
            console.error('Refresh error:', error);
        } finally {
            this.isRefreshing = false;
        }
    },
    
    // ─── DESTROY ───
    destroy() {
        console.log('🗑️ LecturerStudents destroyed');
    }
};

// ─── GLOBAL FUNCTIONS ───
function applyStudentFilters() {
    LecturerStudents.applyFilters();
}

function clearStudentFilters() {
    LecturerStudents.clearFilters();
}

function exportStudentList() {
    LecturerStudents.exportStudents();
}

function openStudentModal(userId) {
    LecturerStudents.openStudentModal(userId);
}

function closeStudentModal() {
    LecturerStudents.closeStudentModal();
}

function sendMessageToStudent() {
    if (LecturerStudents.currentStudent) {
        LecturerStudents.messageStudent(LecturerStudents.currentStudent.user_id);
        LecturerStudents.closeStudentModal();
    }
}

function handleFileUpload(event) {
    LecturerStudents.handleFileUpload(event);
}

function showUploads() {
    LecturerStudents.showUploads();
}

function closeBulkUpload() {
    LecturerStudents.closeBulkUpload();
}

function handleBulkFile(event) {
    LecturerStudents.handleBulkFile(event);
}

function handleBulkDrop(event) {
    event.preventDefault();
    const dropzone = document.getElementById('bulkDropzone');
    if (dropzone) dropzone.classList.remove('dragover');
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        LecturerStudents.handleBulkFile({ target: { files } });
    }
}

function handleBulkDragOver(event) {
    event.preventDefault();
    const dropzone = document.getElementById('bulkDropzone');
    if (dropzone) dropzone.classList.add('dragover');
}

function processBulkUpload() {
    if (window.LecturerUI) {
        window.LecturerUI.showNotification('Please select a CSV file first.', 'info');
    }
    document.getElementById('bulkFileInput')?.click();
}

function filterByStatus(status) {
    const filter = document.getElementById('studentStatusFilter');
    if (filter) {
        filter.value = status;
        LecturerStudents.applyFilters();
    }
}

function filterByRisk(risk) {
    const filter = document.getElementById('studentRiskFilter');
    if (filter) {
        filter.value = risk;
        LecturerStudents.applyFilters();
    }
}

function filterByProgram(program) {
    if (window.LecturerUI) {
        window.LecturerUI.showNotification('Showing all students for ' + program, 'info');
    }
    clearStudentFilters();
}

// ─── INITIALIZE ───
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => LecturerStudents.init(), 650);
});

// ─── EXPOSE GLOBALLY ───
window.LecturerStudents = LecturerStudents;
window.applyStudentFilters = applyStudentFilters;
window.clearStudentFilters = clearStudentFilters;
window.exportStudentList = exportStudentList;
window.openStudentModal = openStudentModal;
window.closeStudentModal = closeStudentModal;
window.sendMessageToStudent = sendMessageToStudent;
window.handleFileUpload = handleFileUpload;
window.showUploads = showUploads;
window.closeBulkUpload = closeBulkUpload;
window.handleBulkFile = handleBulkFile;
window.handleBulkDrop = handleBulkDrop;
window.handleBulkDragOver = handleBulkDragOver;
window.processBulkUpload = processBulkUpload;
window.filterByStatus = filterByStatus;
window.filterByRisk = filterByRisk;
window.filterByProgram = filterByProgram;

console.log('✅ LecturerStudents module loaded - READ-ONLY mode');
console.log('📋 Features: View students, Upload documents for approval, Export');
console.log('🔒 No edit/delete capabilities');
console.log('📊 TVET Support: Enabled');
