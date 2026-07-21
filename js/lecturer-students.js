// js/lecturer-students.js
/**
 * NCHSM Lecturer Students Module
 * Uses dedicated lecturer database
 */

const LecturerStudents = {
    students: [],
    filteredStudents: [],
    filters: {
        intake: 'all',
        status: 'all',
        risk: 'all',
        search: ''
    },
    
    async init() {
        console.log('👥 Initializing Lecturer Students...');
        await this.loadStudents();
        this.setupEventListeners();
        console.log('✅ Lecturer Students initialized');
    },
    
    async loadStudents() {
        try {
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const program = profile?.program || profile?.department;
            
            if (!program) {
                console.warn('No program found for lecturer');
                return;
            }
            
            // ✅ Use lecturerDB
            this.students = await window.lecturerDB.getStudents(program);
            this.filteredStudents = [...this.students];
            
            this.populateFilters();
            this.renderTable();
            this.updateStats();
            
            console.log(`✅ Loaded ${this.students.length} students`);
            
        } catch (error) {
            console.error('Failed to load students:', error);
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Failed to load students: ' + error.message, 'error');
            }
        }
    },
    
    populateFilters() {
        const years = [...new Set(this.students.map(s => s.intake_year).filter(Boolean))].sort().reverse();
        
        const intakeFilter = document.getElementById('studentIntakeFilter');
        if (intakeFilter) {
            intakeFilter.innerHTML = '<option value="all">All Intakes</option>' +
                years.map(y => `<option value="${y}">${y}</option>`).join('');
        }
    },
    
    renderTable() {
        const tbody = document.getElementById('studentsTableBody');
        if (!tbody) return;
        
        const students = this.filteredStudents;
        
        if (!students.length) {
            tbody.innerHTML = '<tr><td colspan="8">No students found.</td></tr>';
            return;
        }
        
        tbody.innerHTML = students.map(student => {
            const status = (student.status || 'Active').toLowerCase();
            const atRisk = (student.cumulative_absences || 0) > 5 || status === 'probation';
            const regNo = student.student_id || student.user_id?.substring(0, 8) || 'N/A';
            
            return `
                <tr class="${atRisk ? 'student-at-risk' : ''}">
                    <td>${atRisk ? '⚠️ ' : ''}${window.LecturerUtils?.escapeHtml(student.full_name || 'N/A') || student.full_name || 'N/A'}</td>
                    <td><strong>${window.LecturerUtils?.escapeHtml(regNo) || regNo}</strong></td>
                    <td>${window.LecturerUtils?.escapeHtml(student.email || 'N/A') || student.email || 'N/A'}</td>
                    <td>${window.LecturerUtils?.escapeHtml(student.program || 'N/A') || student.program || 'N/A'}</td>
                    <td>${window.LecturerUtils?.escapeHtml(student.intake_year || 'N/A') || student.intake_year || 'N/A'}</td>
                    <td><span class="student-status-badge status-${status}">${window.LecturerUtils?.escapeHtml(student.status || 'Active') || student.status || 'Active'}</span></td>
                    <td style="color:${(student.cumulative_absences || 0) > 3 ? '#EF4444' : '#10B981'}">
                        ${student.cumulative_absences || 0} days
                    </td>
                    <td>
                        <button class="btn btn-action btn-small" 
                                onclick="LecturerStudents.viewStudent('${student.user_id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-action btn-small" 
                                onclick="LecturerStudents.messageStudent('${student.user_id}', '${window.LecturerUtils?.escapeHtml(student.full_name) || student.full_name || ''}')">
                            <i class="fas fa-envelope"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },
    
    updateStats() {
        const total = this.filteredStudents.length;
        const statsEl = document.getElementById('studentStats');
        if (statsEl) {
            const atRisk = this.students.filter(s => 
                (s.cumulative_absences || 0) > 5 || (s.status || '').toLowerCase() === 'probation'
            ).length;
            statsEl.innerHTML = `Showing ${total} of ${this.students.length} students | ${atRisk} require attention`;
        }
    },
    
    applyFilters() {
        const intake = document.getElementById('studentIntakeFilter')?.value || 'all';
        const status = document.getElementById('studentStatusFilter')?.value || 'all';
        const risk = document.getElementById('studentRiskFilter')?.value || 'all';
        const search = document.getElementById('studentSearch')?.value?.toLowerCase() || '';
        
        this.filteredStudents = this.students.filter(student => {
            const matchIntake = intake === 'all' || student.intake_year === intake;
            const matchStatus = status === 'all' || (student.status || 'Active') === status;
            const matchRisk = risk === 'all' || 
                (risk === 'at-risk' && ((student.cumulative_absences || 0) > 5 || (student.status || '').toLowerCase() === 'probation'));
            const matchSearch = !search || 
                student.full_name?.toLowerCase().includes(search) || 
                student.student_id?.toLowerCase().includes(search) ||
                student.email?.toLowerCase().includes(search);
            
            return matchIntake && matchStatus && matchRisk && matchSearch;
        });
        
        this.renderTable();
        this.updateStats();
    },
    
    setupEventListeners() {
        ['studentIntakeFilter', 'studentStatusFilter', 'studentRiskFilter'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', () => this.applyFilters());
        });
        
        const searchInput = document.getElementById('studentSearch');
        if (searchInput) {
            searchInput.addEventListener('keyup', () => this.applyFilters());
        }
    },
    
    viewStudent(userId) {
        const student = this.students.find(s => s.user_id === userId);
        if (!student) {
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Student not found.', 'error');
            }
            return;
        }
        
        document.getElementById('infoName').textContent = student.full_name || 'N/A';
        document.getElementById('infoRegno').textContent = student.student_id || 'N/A';
        document.getElementById('infoEmail').textContent = student.email || 'N/A';
        document.getElementById('infoProgram').textContent = student.program || 'N/A';
        document.getElementById('infoIntake').textContent = student.intake_year || 'N/A';
        document.getElementById('infoStatus').textContent = student.status || 'Active';
        document.getElementById('infoAbsences').textContent = student.cumulative_absences || '0';
        
        if (window.LecturerUI) {
            window.LecturerUI.openModal('studentInfoModal');
        }
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
        if (window.LecturerUI) {
            window.LecturerUI.showTab('messages');
            window.LecturerUI.showNotification(`Ready to message ${fullName}`, 'info');
        }
    },
    
    async refresh() {
        await this.loadStudents();
        if (window.LecturerUI) {
            window.LecturerUI.showNotification('Students refreshed!', 'success');
        }
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => LecturerStudents.init(), 650);
});

window.LecturerStudents = LecturerStudents;
