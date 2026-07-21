// js/lecturer-courses.js
/**
 * NCHSM Lecturer Courses Module
 * Uses dedicated lecturer database
 */

const LecturerCourses = {
    courses: [],
    filteredCourses: [],
    
    async init() {
        console.log('📚 Initializing Lecturer Courses...');
        await this.loadCourses();
        this.setupEventListeners();
        console.log('✅ Lecturer Courses initialized');
    },
    
    async loadCourses() {
        try {
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const program = profile?.program || profile?.department;
            
            if (!program) {
                console.warn('No program found for lecturer');
                return;
            }
            
            // ✅ Use lecturerDB
            const courses = await window.lecturerDB.getCourses(program);
            this.courses = courses;
            this.filteredCourses = [...this.courses];
            
            this.populateFilters();
            this.renderTable();
            
            console.log(`✅ Loaded ${this.courses.length} courses`);
            
        } catch (error) {
            console.error('Failed to load courses:', error);
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Failed to load courses: ' + error.message, 'error');
            }
        }
    },
    
    populateFilters() {
        const years = [...new Set(this.courses.map(c => c.intake_year).filter(Boolean))].sort().reverse();
        
        const intakeFilter = document.getElementById('intakeYearFilter');
        if (intakeFilter) {
            intakeFilter.innerHTML = '<option value="">All Intake Years</option>' +
                years.map(y => `<option value="${y}">${y}</option>`).join('');
        }
        
        const profile = window.lecturerDB?.getCurrentUserProfile();
        const program = profile?.program || 'KRCHN';
        const blocks = window.LecturerUtils?.getAcademicBlocks(program) || ['Introductory', 'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Final'];
        
        const periodFilter = document.getElementById('academicPeriodFilter');
        const label = document.getElementById('academicPeriodLabel');
        if (periodFilter) {
            const labelText = program === 'KRCHN' ? 'Filter by Block:' : 'Filter by Term:';
            if (label) label.textContent = labelText;
            
            periodFilter.innerHTML = '<option value="">All ' + (program === 'KRCHN' ? 'Blocks' : 'Terms') + '</option>' +
                blocks.map(b => `<option value="${b}">${b}</option>`).join('');
        }
    },
    
    renderTable() {
        const tbody = document.getElementById('lecturerCoursesTable');
        if (!tbody) return;
        
        const courses = this.filteredCourses;
        
        if (!courses.length) {
            tbody.innerHTML = '<tr><td colspan="7">No courses found.</td></tr>';
            return;
        }
        
        // Get students for course counts
        const allStudents = window.LecturerStudents?.students || [];
        
        tbody.innerHTML = courses.map(course => {
            const students = allStudents.filter(s => {
                const matchProgram = s.program === course.target_program;
                const matchIntake = !course.intake_year || s.intake_year === course.intake_year;
                return matchProgram && matchIntake;
            });
            
            return `
                <tr>
                    <td><strong>${window.LecturerUtils?.escapeHtml(course.unit_code || 'N/A') || course.unit_code || 'N/A'}</strong></td>
                    <td>${window.LecturerUtils?.escapeHtml(course.course_name || 'N/A') || course.course_name || 'N/A'}</td>
                    <td><span class="program-badge">${window.LecturerUtils?.escapeHtml(course.target_program || 'N/A') || course.target_program || 'N/A'}</span></td>
                    <td>${window.LecturerUtils?.escapeHtml(course.block || 'N/A') || course.block || 'N/A'}</td>
                    <td>${window.LecturerUtils?.escapeHtml(course.intake_year || 'N/A') || course.intake_year || 'N/A'}</td>
                    <td>${students.length} students</td>
                    <td>
                        <button class="btn btn-action btn-small" 
                                onclick="LecturerCourses.manageCourse('${course.id}')">
                            <i class="fas fa-chart-bar"></i> Manage
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },
    
    applyFilters() {
        const intake = document.getElementById('intakeYearFilter')?.value || '';
        const period = document.getElementById('academicPeriodFilter')?.value || '';
        const search = document.getElementById('courseSearch')?.value?.toLowerCase() || '';
        
        this.filteredCourses = this.courses.filter(course => {
            const matchIntake = !intake || course.intake_year === intake;
            const matchPeriod = !period || course.block === period;
            const matchSearch = !search || 
                course.course_name?.toLowerCase().includes(search) ||
                course.unit_code?.toLowerCase().includes(search);
            
            return matchIntake && matchPeriod && matchSearch;
        });
        
        this.renderTable();
    },
    
    setupEventListeners() {
        ['intakeYearFilter', 'academicPeriodFilter'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', () => this.applyFilters());
        });
        
        const searchInput = document.getElementById('courseSearch');
        if (searchInput) {
            searchInput.addEventListener('keyup', () => this.applyFilters());
        }
        
        const searchBtn = document.getElementById('courseSearchBtn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.applyFilters());
        }
    },
    
    manageCourse(courseId) {
        const course = this.courses.find(c => c.id === courseId);
        if (!course) {
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Course not found.', 'error');
            }
            return;
        }
        if (window.LecturerUI) {
            window.LecturerUI.showNotification(`Managing course: ${course.course_name} - Feature coming soon.`, 'info');
        }
    },
    
    async refresh() {
        await this.loadCourses();
        if (window.LecturerUI) {
            window.LecturerUI.showNotification('Courses refreshed!', 'success');
        }
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => LecturerCourses.init(), 550);
});

window.LecturerCourses = LecturerCourses;
