// js/lecturer-courses.js
/**
 * NCHSM Lecturer Courses Module
 * Handles course management, filtering, and display
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
            const profile = window.db?.getUserProfile();
            const program = profile?.program || profile?.department;
            
            if (!program) {
                console.warn('No program found for lecturer');
                return;
            }
            
            const { data, error } = await window.db.supabase
                .from('courses')
                .select('*')
                .eq('target_program', program)
                .eq('status', 'Active')
                .order('course_name', { ascending: true });
            
            if (error) throw error;
            
            this.courses = data || [];
            this.filteredCourses = [...this.courses];
            
            this.populateFilters();
            this.renderTable();
            
            console.log(`✅ Loaded ${this.courses.length} courses`);
            
        } catch (error) {
            console.error('Failed to load courses:', error);
            LecturerUI.showNotification('Failed to load courses: ' + error.message, 'error');
        }
    },
    
    populateFilters() {
        const years = [...new Set(this.courses.map(c => c.intake_year).filter(Boolean))].sort().reverse();
        
        const intakeFilter = document.getElementById('intakeYearFilter');
        if (intakeFilter) {
            intakeFilter.innerHTML = '<option value="">All Intake Years</option>' +
                years.map(y => `<option value="${y}">${y}</option>`).join('');
        }
        
        const profile = window.db?.getUserProfile();
        const program = profile?.program || 'KRCHN';
        const blocks = Utils.getAcademicBlocks(program);
        
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
                    <td><strong>${Utils.escapeHtml(course.unit_code || 'N/A')}</strong></td>
                    <td>${Utils.escapeHtml(course.course_name || 'N/A')}</td>
                    <td><span class="program-badge">${Utils.escapeHtml(course.target_program || 'N/A')}</span></td>
                    <td>${Utils.escapeHtml(course.block || 'N/A')}</td>
                    <td>${Utils.escapeHtml(course.intake_year || 'N/A')}</td>
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
        // Filter changes
        ['intakeYearFilter', 'academicPeriodFilter'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', () => this.applyFilters());
        });
        
        // Search
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
            LecturerUI.showNotification('Course not found.', 'error');
            return;
        }
        LecturerUI.showNotification(`Managing course: ${course.course_name} - Feature coming soon.`, 'info');
    },
    
    async refresh() {
        await this.loadCourses();
        LecturerUI.showNotification('Courses refreshed!', 'success');
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => LecturerCourses.init(), 550);
});

window.LecturerCourses = LecturerCourses;
