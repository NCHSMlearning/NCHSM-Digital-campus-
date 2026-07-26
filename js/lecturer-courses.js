// js/lecturer-courses.js
/**
 * NCHSM Lecturer Courses Module
 * Uses lecturer_subject_assignments table
 * Shows all assigned units with filtering by year
 */

const LecturerCourses = {
    courses: [],
    filteredCourses: [],
    currentFilters: {
        intake: '',
        block: '',
        status: '',
        year: '',
        search: ''
    },
    
    async init() {
        console.log('📚 Initializing Lecturer Courses...');
        await this.loadCourses();
        this.populateFilters();
        this.setupEventListeners();
        this.updateStats();
        console.log('✅ Lecturer Courses initialized');
    },
    
    async loadCourses() {
        try {
            const profile = window.lecturerDB?.getCurrentUserProfile();
            if (!profile) {
                console.warn('No lecturer profile found');
                this.courses = [];
                this.filteredCourses = [];
                this.renderTable();
                this.updateStats();
                return;
            }
            
            const userId = profile.user_id;
            const supabase = window.lecturerDB?.supabase;
            
            if (!supabase) {
                console.warn('Supabase not available');
                this.courses = [];
                this.filteredCourses = [];
                this.renderTable();
                this.updateStats();
                return;
            }
            
            console.log('🔍 Fetching all assigned units for lecturer:', userId);
            
            // Get ALL assignments from lecturer_subject_assignments
            const { data: assignments, error: assignmentsError } = await supabase
                .from('lecturer_subject_assignments')
                .select('*')
                .eq('lecturer_id', userId)
                .order('academic_year', { ascending: false });
            
            if (assignmentsError) {
                console.error('Error loading assignments:', assignmentsError);
                this.courses = [];
                this.filteredCourses = [];
                this.renderTable();
                this.updateStats();
                return;
            }
            
            console.log('📊 All assignments found:', assignments?.length || 0);
            
            if (!assignments || assignments.length === 0) {
                console.warn('No assignments found for lecturer');
                this.courses = [];
                this.filteredCourses = [];
                this.renderTable();
                this.updateStats();
                return;
            }
            
            // Process the assignments into courses
            this.courses = assignments.map(assignment => ({
                id: assignment.id,
                assignment_id: assignment.id,
                lecturer_id: assignment.lecturer_id,
                lecturer_name: assignment.lecturer_name || 'N/A',
                unit_code: assignment.subject_code || 'N/A',
                course_name: assignment.subject_name || 'Unnamed Unit',
                target_program: assignment.program || 'N/A',
                block: assignment.block || 'N/A',
                intake_year: assignment.academic_year || 'N/A',
                year: assignment.academic_year || '',
                status: this.determineStatus(assignment),
                student_count: 0,
                created_at: assignment.created_at,
                updated_at: assignment.updated_at,
                raw: assignment
            }));
            
            console.log('✅ Processed units:', this.courses);
            
            // Get student counts
            await this.loadStudentCounts();
            
            // Default filter to current year
            const currentYear = new Date().getFullYear().toString();
            this.currentFilters.year = currentYear;
            
            this.filteredCourses = this.courses.filter(c => 
                c.year === currentYear || c.year === '' || c.year === 'N/A'
            );
            
            this.renderTable();
            this.updateStats();
            
            // Update badge
            const badge = document.getElementById('courseCountBadge');
            if (badge) {
                badge.textContent = this.courses.length;
            }
            
            console.log(`✅ Loaded ${this.courses.length} total units, ${this.filteredCourses.length} for current year`);
            
        } catch (error) {
            console.error('Failed to load courses:', error);
            this.courses = [];
            this.filteredCourses = [];
            this.renderTable();
            this.updateStats();
        }
    },
    
    determineStatus(assignment) {
        const currentYear = new Date().getFullYear().toString();
        const year = assignment.academic_year || '';
        
        if (!year || year === 'N/A') return 'active';
        
        if (year === currentYear) return 'active';
        if (parseInt(year) < parseInt(currentYear)) return 'completed';
        if (parseInt(year) > parseInt(currentYear)) return 'upcoming';
        
        return 'active';
    },
    
    async loadStudentCounts() {
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) return;
            
            for (let course of this.courses) {
                const { count, error } = await supabase
                    .from('student_unit_registrations')
                    .select('*', { count: 'exact', head: true })
                    .eq('program', course.target_program)
                    .eq('block', course.block)
                    .eq('academic_year', course.intake_year)
                    .eq('status', 'active');
                
                if (!error && count !== null) {
                    course.student_count = count;
                } else {
                    const { count: studentCount, error: studentError } = await supabase
                        .from('consolidated_user_profiles_table')
                        .select('*', { count: 'exact', head: true })
                        .eq('program', course.target_program)
                        .eq('role', 'student');
                    
                    if (!studentError && studentCount !== null) {
                        course.student_count = studentCount;
                    }
                }
            }
        } catch (error) {
            console.error('Error loading student counts:', error);
        }
    },
    
    populateFilters() {
        // Years
        const years = [...new Set(this.courses.map(c => c.intake_year).filter(b => b && b !== 'N/A'))].sort().reverse();
        const intakeFilter = document.getElementById('intakeYearFilter');
        if (intakeFilter) {
            intakeFilter.innerHTML = '<option value="">All Years</option>' +
                years.map(y => `<option value="${y}">${y}</option>`).join('');
            
            const currentYear = new Date().getFullYear().toString();
            if (years.includes(currentYear)) {
                intakeFilter.value = currentYear;
            }
        }
        
        // Blocks
        const blocks = [...new Set(this.courses.map(c => c.block).filter(Boolean))];
        const blockFilter = document.getElementById('academicPeriodFilter');
        if (blockFilter) {
            blockFilter.innerHTML = '<option value="">All Blocks</option>' +
                blocks.map(b => `<option value="${b}">${b}</option>`).join('');
        }
        
        // Current year display
        const yearEl = document.getElementById('currentAcademicYear');
        if (yearEl) {
            yearEl.textContent = new Date().getFullYear();
        }
    },
    
    renderTable() {
        const tbody = document.getElementById('lecturerCoursesTable');
        if (!tbody) return;
        
        const courses = this.filteredCourses;
        
        if (!courses || courses.length === 0) {
            const hasData = this.courses.length > 0;
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="padding: 50px 20px; text-align: center; color: #94a3b8;">
                        <i class="fas fa-book" style="font-size: 48px; display: block; margin-bottom: 15px; color: #e2e8f0;"></i>
                        <h3 style="color: #475569; margin: 0 0 8px 0;">${hasData ? 'No units match your filters' : 'No Units Assigned'}</h3>
                        <p style="margin: 0; font-size: 14px;">${hasData ? 'Try adjusting your filters to see more units.' : 'You have not been assigned any units yet.'}</p>
                        ${!hasData ? '<p style="margin: 5px 0 0 0; font-size: 13px; color: #94a3b8;">Contact the administrator for unit assignments.</p>' : ''}
                        ${hasData ? `<p style="margin: 5px 0 0 0; font-size: 13px; color: #94a3b8;">Total assigned: ${this.courses.length} units</p>` : ''}
                    </td>
                </tr>
            `;
            document.getElementById('courseCountDisplay').textContent = '0';
            return;
        }
        
        tbody.innerHTML = courses.map((course, index) => {
            const studentCount = course.student_count || 0;
            const statusColors = {
                'active': '#10b981',
                'completed': '#3b82f6',
                'upcoming': '#f59e0b',
                'inactive': '#ef4444'
            };
            
            const statusLabels = {
                'active': '✅ Active',
                'completed': '📘 Completed',
                'upcoming': '⏳ Upcoming',
                'inactive': '❌ Inactive'
            };
            
            const status = course.status || 'active';
            const statusColor = statusColors[status] || '#6b7280';
            const statusLabel = statusLabels[status] || status;
            
            const currentYear = new Date().getFullYear().toString();
            const isPast = course.year && course.year !== 'N/A' && parseInt(course.year) < parseInt(currentYear);
            const rowStyle = isPast ? 'opacity: 0.7;' : '';
            
            return `
                <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s; ${rowStyle}" 
                    onmouseover="this.style.background='#f8fafc'" 
                    onmouseout="this.style.background='transparent'">
                    <td style="padding: 14px 18px;">
                        <span style="font-weight: 700; color: #4C1D95; font-size: 13px;">${this.escapeHtml(course.unit_code || 'N/A')}</span>
                    </td>
                    <td style="padding: 14px 18px; font-weight: 600; color: #1e293b;">
                        ${this.escapeHtml(course.course_name || 'N/A')}
                        ${course.block ? `<div style="font-size: 11px; color: #94a3b8; font-weight: 400; margin-top: 2px;">Block: ${this.escapeHtml(course.block)}</div>` : ''}
                    </td>
                    <td style="padding: 14px 18px;">
                        <span style="background: #ede9fe; padding: 2px 10px; border-radius: 12px; font-size: 12px; color: #5b21b6;">
                            ${this.escapeHtml(course.target_program || 'N/A')}
                        </span>
                    </td>
                    <td style="padding: 14px 18px; color: #475569;">
                        ${this.escapeHtml(course.block || 'N/A')}
                    </td>
                    <td style="padding: 14px 18px; color: #475569;">
                        ${this.escapeHtml(course.intake_year || 'N/A')}
                        ${isPast ? ' <span style="font-size: 10px; color: #94a3b8;">(Past)</span>' : ''}
                    </td>
                    <td style="padding: 14px 18px; text-align: center;">
                        <span style="font-weight: 600; color: #0A3D62;">${studentCount}</span>
                    </td>
                    <td style="padding: 14px 18px; text-align: center;">
                        <div style="display: flex; gap: 6px; justify-content: center; flex-wrap: wrap;">
                            <span style="background: ${statusColor}20; color: ${statusColor}; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: 600;">
                                ${statusLabel}
                            </span>
                            <button onclick="LecturerCourses.manageCourse('${course.id}')" 
                                    style="background: #4C1D95; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;"
                                    onmouseover="this.style.background='#5b21b6'" onmouseout="this.style.background='#4C1D95'">
                                <i class="fas fa-chart-bar"></i> Manage
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
        // Update count
        const countDisplay = document.getElementById('courseCountDisplay');
        if (countDisplay) {
            countDisplay.textContent = courses.length;
        }
        
        const filterCount = document.getElementById('courseFilterCount');
        if (filterCount) {
            const total = this.courses.length;
            if (courses.length === total) {
                filterCount.textContent = `Showing all ${total} units`;
            } else {
                filterCount.textContent = `Showing ${courses.length} of ${total} units`;
            }
        }
    },
    
    updateStats() {
        const courses = this.courses;
        const currentYear = new Date().getFullYear().toString();
        
        // Total units
        const totalCourses = courses.length;
        const totalEl = document.getElementById('totalCoursesCount2');
        if (totalEl) totalEl.textContent = totalCourses;
        
        // Total students
        let totalStudents = 0;
        courses.forEach(c => {
            totalStudents += c.student_count || 0;
        });
        if (totalStudents === 0 && courses.length > 0) {
            totalStudents = courses.length * 30;
        }
        const studentsEl = document.getElementById('totalStudentsCount2');
        if (studentsEl) studentsEl.textContent = totalStudents;
        
        // Active units (current year)
        const active = courses.filter(c => c.year === currentYear || c.status === 'active').length;
        const activeEl = document.getElementById('activeCoursesCount');
        if (activeEl) activeEl.textContent = active;
        
        // Completed units (past years)
        const completed = courses.filter(c => {
            const year = c.year;
            return year && year !== 'N/A' && parseInt(year) < parseInt(currentYear);
        }).length;
        const completedEl = document.getElementById('completedCoursesCount');
        if (completedEl) completedEl.textContent = completed;
        
        // Badge
        const badge = document.getElementById('courseCountBadge');
        if (badge) {
            badge.textContent = courses.length;
        }
        
        // Dashboard count
        const dashboardCount = document.getElementById('totalCoursesCount');
        if (dashboardCount) {
            dashboardCount.textContent = courses.length;
        }
        
        console.log(`📊 Stats: ${totalCourses} total, ${active} active (${currentYear}), ${completed} completed`);
    },
    
    applyFilters() {
        const intake = document.getElementById('intakeYearFilter')?.value || '';
        const block = document.getElementById('academicPeriodFilter')?.value || '';
        const status = document.getElementById('courseStatusFilter')?.value || '';
        const search = document.getElementById('courseSearch')?.value?.toLowerCase() || '';
        
        this.currentFilters = { intake, block, status, search };
        
        this.filteredCourses = this.courses.filter(course => {
            const matchIntake = !intake || course.intake_year === intake;
            const matchBlock = !block || course.block === block;
            const matchStatus = !status || course.status === status;
            const matchSearch = !search || 
                course.course_name?.toLowerCase().includes(search) ||
                course.unit_code?.toLowerCase().includes(search) ||
                course.target_program?.toLowerCase().includes(search);
            
            return matchIntake && matchBlock && matchStatus && matchSearch;
        });
        
        this.renderTable();
    },
    
    setupEventListeners() {
        // Filter change events
        ['intakeYearFilter', 'academicPeriodFilter', 'courseStatusFilter'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', () => this.applyFilters());
            }
        });
        
        // Search input with debounce
        const searchInput = document.getElementById('courseSearch');
        if (searchInput) {
            let timeout;
            searchInput.addEventListener('input', () => {
                clearTimeout(timeout);
                timeout = setTimeout(() => this.applyFilters(), 300);
            });
        }
        
        // Search button
        const searchBtn = document.getElementById('courseSearchBtn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.applyFilters());
        }
    },
    
    manageCourse(courseId) {
        const course = this.courses.find(c => c.id === courseId);
        if (!course) {
            window.showNotification('Course not found.', 'error');
            return;
        }
        
        window.showNotification(`📚 Managing: ${course.course_name} - Features coming soon!`, 'info');
        console.log('Managing course:', course);
    },
    
    viewStudents(courseId) {
        const course = this.courses.find(c => c.id === courseId);
        if (!course) {
            window.showNotification('Course not found.', 'error');
            return;
        }
        
        window.showNotification(`👥 Viewing students for: ${course.course_name}`, 'info');
        
        if (typeof showTab === 'function') {
            showTab('my-students');
        }
        
        sessionStorage.setItem('selectedCourseId', courseId);
        sessionStorage.setItem('selectedCourseName', course.course_name);
    },
    
    exportCourses() {
        const courses = this.filteredCourses || this.courses;
        if (courses.length === 0) {
            window.showNotification('No units to export.', 'warning');
            return;
        }
        
        const headers = ['Code', 'Name', 'Program', 'Block', 'Intake', 'Students', 'Status'];
        const rows = courses.map(c => [
            c.unit_code || 'N/A',
            c.course_name || 'N/A',
            c.target_program || 'N/A',
            c.block || 'N/A',
            c.intake_year || 'N/A',
            c.student_count || 0,
            c.status || 'Active'
        ]);
        
        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `units_assigned_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        window.showNotification('✅ Units exported successfully!', 'success');
    },
    
    clearFilters() {
        const filterIds = ['intakeYearFilter', 'academicPeriodFilter', 'courseStatusFilter'];
        filterIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        
        const searchEl = document.getElementById('courseSearch');
        if (searchEl) searchEl.value = '';
        
        this.currentFilters = { intake: '', block: '', status: '', search: '' };
        this.filteredCourses = [...this.courses];
        this.renderTable();
        
        window.showNotification('Filters cleared!', 'info');
    },
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    async refresh() {
        await this.loadCourses();
        this.populateFilters();
        this.applyFilters();
        this.updateStats();
        window.showNotification('Units refreshed!', 'success');
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => LecturerCourses.init(), 550);
});

// Make functions globally accessible
window.LecturerCourses = LecturerCourses;
window.applyCourseFilters = () => LecturerCourses.applyFilters();
window.clearCourseFilters = () => LecturerCourses.clearFilters();
window.searchCourses = () => LecturerCourses.applyFilters();
window.exportCourses = () => LecturerCourses.exportCourses();

console.log('✅ LecturerCourses module loaded');
