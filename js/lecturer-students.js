// js/lecturer-students.js
/**
 * NCHSM Lecturer Students Module
 * Uses dedicated lecturer database with correct ID resolution
 * Shows students based on assigned units
 */

const LecturerStudents = {
    students: [],
    filteredStudents: [],
    filters: {
        intake: 'all',
        block: 'all',
        status: 'all',
        risk: 'all',
        search: ''
    },
    lecturerAssignmentId: null,
    assignedUnits: [],
    
    async init() {
        console.log('👥 Initializing Lecturer Students...');
        await this.resolveLecturerId();
        await this.loadAssignedUnits();
        await this.loadStudents();
        this.setupEventListeners();
        this.updateStats();
        console.log('✅ Lecturer Students initialized');
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
                    
                    // BIG BONUS for non-STAFF IDs
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
            
            // Fallback: use auth ID
            this.lecturerAssignmentId = authId;
            console.log('⚠️ Falling back to auth ID:', this.lecturerAssignmentId);
            
        } catch (error) {
            console.error('Error resolving lecturer ID:', error);
            this.lecturerAssignmentId = null;
        }
    },
    
    // ============================================
    // LOAD ASSIGNED UNITS
    // ============================================
    async loadAssignedUnits() {
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) return;
            
            const profile = window.lecturerDB?.getCurrentUserProfile();
            if (!profile) return;
            
            const lecturerId = this.lecturerAssignmentId || profile.user_id;
            
            const { data: assignments, error } = await supabase
                .from('lecturer_subject_assignments')
                .select('subject_name, subject_code, block, program, academic_year')
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
    
    async loadStudents() {
        try {
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const program = profile?.program || profile?.department;
            
            if (!program) {
                console.warn('No program found for lecturer');
                return;
            }
            
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) {
                console.warn('Supabase not available');
                return;
            }
            
            // Get students in the program
            const { data: students, error } = await supabase
                .from('consolidated_user_profiles_table')
                .select('*')
                .eq('role', 'student')
                .eq('program', program)
                .order('full_name', { ascending: true });
            
            if (error) {
                console.error('Error loading students:', error);
                return;
            }
            
            this.students = students || [];
            
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
                    // Mark which students are registered to assigned units
                    const registeredStudentIds = new Set(registrations.map(r => r.student_id));
                    this.students.forEach(s => {
                        s.isRegistered = registeredStudentIds.has(s.user_id);
                    });
                }
            }
            
            this.filteredStudents = [...this.students];
            
            this.populateFilters();
            this.renderTable();
            this.updateStats();
            
            // Update badge
            const badge = document.getElementById('studentCountBadge');
            if (badge) {
                badge.textContent = this.students.length;
            }
            
            console.log(`✅ Loaded ${this.students.length} students`);
            
        } catch (error) {
            console.error('Failed to load students:', error);
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Failed to load students: ' + error.message, 'error');
            }
        }
    },
    
    populateFilters() {
        // Intake years
        const years = [...new Set(this.students.map(s => s.intake_year).filter(Boolean))].sort().reverse();
        const intakeFilter = document.getElementById('studentIntakeFilter');
        if (intakeFilter) {
            intakeFilter.innerHTML = '<option value="all">All Intakes</option>' +
                years.map(y => `<option value="${y}">${y}</option>`).join('');
        }
        
        // Blocks
        const blocks = [...new Set(this.students.map(s => s.block).filter(Boolean))];
        const blockFilter = document.getElementById('studentBlockFilter');
        if (blockFilter) {
            blockFilter.innerHTML = '<option value="all">All Blocks</option>' +
                blocks.map(b => `<option value="${b}">${b}</option>`).join('');
        }
    },
    
    renderTable() {
        const tbody = document.getElementById('studentsTableBody');
        if (!tbody) return;
        
        const students = this.filteredStudents;
        
        if (!students || students.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="padding: 50px 20px; text-align: center; color: #94a3b8;">
                        <i class="fas fa-users" style="font-size: 48px; display: block; margin-bottom: 15px; color: #e2e8f0;"></i>
                        <h3 style="color: #475569; margin: 0 0 8px 0;">No Students Found</h3>
                        <p style="margin: 0; font-size: 14px;">${this.students.length === 0 ? 'No students in your program.' : 'Try adjusting your filters.'}</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = students.map(student => {
            const status = (student.status || 'Active').toLowerCase();
            const atRisk = (student.cumulative_absences || 0) > 5 || status === 'probation';
            const regNo = student.student_id || student.admission_number || student.user_id?.substring(0, 8) || 'N/A';
            const isRegistered = student.isRegistered !== false;
            
            const statusColors = {
                'active': '#10b981',
                'probation': '#f59e0b',
                'inactive': '#ef4444'
            };
            
            const statusLabels = {
                'active': '✅ Active',
                'probation': '⚠️ Probation',
                'inactive': '❌ Inactive'
            };
            
            const statusColor = statusColors[status] || '#6b7280';
            const statusLabel = statusLabels[status] || status;
            
            return `
                <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s; ${atRisk ? 'background: #fef2f2;' : ''}" 
                    onmouseover="this.style.background='${atRisk ? '#fee2e2' : '#f8fafc'}'" 
                    onmouseout="this.style.background='${atRisk ? '#fef2f2' : 'transparent'}'">
                    <td style="padding: 14px 18px; font-weight: 500; color: #1e293b;">
                        ${atRisk ? '⚠️ ' : ''}${this.escapeHtml(student.full_name || 'N/A')}
                        ${!isRegistered ? '<span style="font-size: 10px; color: #94a3b8; display: block;">Not registered to any assigned unit</span>' : ''}
                    </td>
                    <td style="padding: 14px 18px; font-weight: 600; color: #4C1D95;">
                        ${this.escapeHtml(regNo)}
                    </td>
                    <td style="padding: 14px 18px; color: #475569;">
                        ${this.escapeHtml(student.email || 'N/A')}
                    </td>
                    <td style="padding: 14px 18px;">
                        <span style="background: #ede9fe; padding: 2px 10px; border-radius: 12px; font-size: 12px; color: #5b21b6;">
                            ${this.escapeHtml(student.program || 'N/A')}
                        </span>
                    </td>
                    <td style="padding: 14px 18px; color: #475569;">
                        ${this.escapeHtml(student.intake_year || 'N/A')}
                    </td>
                    <td style="padding: 14px 18px;">
                        <span style="background: ${statusColor}20; color: ${statusColor}; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 500;">
                            ${statusLabel}
                        </span>
                    </td>
                    <td style="padding: 14px 18px; text-align: center; color: ${(student.cumulative_absences || 0) > 3 ? '#ef4444' : '#10b981'}; font-weight: 600;">
                        ${student.cumulative_absences || 0}
                    </td>
                    <td style="padding: 14px 18px; text-align: center;">
                        <div style="display: flex; gap: 6px; justify-content: center; flex-wrap: wrap;">
                            <button onclick="LecturerStudents.viewStudent('${student.user_id}')" 
                                    style="background: #4C1D95; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;"
                                    onmouseover="this.style.background='#5b21b6'" onmouseout="this.style.background='#4C1D95'">
                                <i class="fas fa-eye"></i> View
                            </button>
                            <button onclick="LecturerStudents.messageStudent('${student.user_id}', '${this.escapeHtml(student.full_name || '')}')" 
                                    style="background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;"
                                    onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'">
                                <i class="fas fa-envelope"></i>
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
                filterCount.textContent = `Showing all ${total} students`;
            } else {
                filterCount.textContent = `Showing ${students.length} of ${total} students`;
            }
        }
    },
    
    updateStats() {
        const total = this.students.length;
        const filtered = this.filteredStudents.length;
        const atRisk = this.students.filter(s => 
            (s.cumulative_absences || 0) > 5 || (s.status || '').toLowerCase() === 'probation'
        ).length;
        const active = this.students.filter(s => (s.status || 'Active').toLowerCase() === 'active').length;
        const probation = this.students.filter(s => (s.status || '').toLowerCase() === 'probation').length;
        
        // Stats cards
        const totalEl = document.getElementById('totalStudentsStat');
        if (totalEl) totalEl.textContent = total;
        
        const activeEl = document.getElementById('activeStudentsStat');
        if (activeEl) activeEl.textContent = active;
        
        const atRiskEl = document.getElementById('atRiskStudentsStat');
        if (atRiskEl) atRiskEl.textContent = atRisk;
        
        const enrolledEl = document.getElementById('enrolledUnitsStat');
        if (enrolledEl) enrolledEl.textContent = this.assignedUnits.length || 0;
        
        // Stats bar
        const statsEl = document.getElementById('studentStats');
        if (statsEl) {
            document.getElementById('studentTotalDisplay').textContent = filtered;
            document.getElementById('studentActiveDisplay').textContent = active;
            document.getElementById('studentRiskDisplay').textContent = atRisk;
            document.getElementById('studentProbationDisplay').textContent = probation;
        }
        
        // Badge
        const badge = document.getElementById('studentCountBadge');
        if (badge) {
            badge.textContent = total;
        }
        
        const badge2 = document.getElementById('studentCountBadge2');
        if (badge2) {
            badge2.textContent = total;
        }
    },
    
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
                (risk === 'at-risk' && ((student.cumulative_absences || 0) > 5 || (student.status || '').toLowerCase() === 'probation'));
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
    },
    
    viewStudent(userId) {
        const student = this.students.find(s => s.user_id === userId);
        if (!student) {
            window.showNotification('Student not found.', 'error');
            return;
        }
        
        // Create a modal or show student details
        const message = `
📋 Student Details
━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 Name: ${student.full_name || 'N/A'}
🎓 Reg No: ${student.student_id || student.admission_number || 'N/A'}
📧 Email: ${student.email || 'N/A'}
📚 Program: ${student.program || 'N/A'}
📅 Intake: ${student.intake_year || 'N/A'}
📊 Status: ${student.status || 'Active'}
📉 Absences: ${student.cumulative_absences || 0}
${student.phone ? `📱 Phone: ${student.phone}` : ''}
${student.block ? `📋 Block: ${student.block}` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━
        `;
        
        alert(message);
    },
    
    messageStudent(userId, fullName) {
        const targetSelect = document.getElementById('msgTarget');
        if (targetSelect) {
            for (let i = 0; i < targetSelect.options.length; i++) {
                if (targetSelect.options[i].value === userId) {
                    targetSelect.value = userId;
                    break;
                }
            }
        }
        if (typeof showTab === 'function') {
            showTab('messages');
        }
        window.showNotification(`Ready to message ${fullName}`, 'info');
    },
    
    exportStudents() {
        const students = this.filteredStudents || this.students;
        if (students.length === 0) {
            window.showNotification('No students to export.', 'warning');
            return;
        }
        
        const headers = ['Name', 'Reg No', 'Email', 'Program', 'Intake', 'Block', 'Status', 'Absences'];
        const rows = students.map(s => [
            s.full_name || 'N/A',
            s.student_id || s.admission_number || 'N/A',
            s.email || 'N/A',
            s.program || 'N/A',
            s.intake_year || 'N/A',
            s.block || 'N/A',
            s.status || 'Active',
            s.cumulative_absences || 0
        ]);
        
        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `students_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        window.showNotification('✅ Students exported successfully!', 'success');
    },
    
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
        
        window.showNotification('Filters cleared!', 'info');
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
        await this.loadStudents();
        this.updateStats();
        window.showNotification('Students refreshed!', 'success');
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => LecturerStudents.init(), 650);
});

// Make functions globally accessible
window.LecturerStudents = LecturerStudents;
window.applyStudentFilters = () => LecturerStudents.applyFilters();
window.clearStudentFilters = () => LecturerStudents.clearFilters();
window.exportStudentList = () => LecturerStudents.exportStudents();

console.log('✅ LecturerStudents module loaded - Same ID resolution as other modules');
