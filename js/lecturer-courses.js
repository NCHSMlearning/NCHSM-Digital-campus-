// js/lecturer-courses.js - Updated Stats Function
/**
 * NCHSM Lecturer Courses Module
 * Uses dedicated lecturer database
 * Enhanced with filtering, search, export and stats
 */

const LecturerCourses = {
    courses: [],
    filteredCourses: [],
    currentFilters: {
        intake: '',
        block: '',
        status: '',
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
            const program = profile?.program || profile?.department;
            
            if (!program) {
                console.warn('No program found for lecturer');
                return;
            }
            
            // Get courses from database
            const supabase = window.lecturerDB?.supabase;
            if (supabase) {
                const { data: courses, error } = await supabase
                    .from('unit_assignments')
                    .select(`
                        id,
                        unit_id,
                        block,
                        intake_year,
                        units:unit_id (
                            id,
                            code,
                            name,
                            program,
                            description
                        ),
                        lecturer_id
                    `)
                    .eq('lecturer_id', profile.user_id);
                
                if (!error) {
                    this.courses = courses?.map(c => ({
                        id: c.id,
                        unit_id: c.unit_id,
                        unit_code: c.units?.code || 'N/A',
                        course_name: c.units?.name || 'N/A',
                        target_program: c.units?.program || program,
                        block: c.block || 'N/A',
                        intake_year: c.intake_year || 'N/A',
                        description: c.units?.description || '',
                        status: c.status || 'active'
                    })) || [];
                } else {
                    console.error('Error loading courses:', error);
                    this.courses = this.getMockCourses(program);
                }
            } else {
                this.courses = this.getMockCourses(program);
            }
            
            this.filteredCourses = [...this.courses];
            this.renderTable();
            this.updateStats();
            
            // Update badge
            const badge = document.getElementById('courseCountBadge');
            if (badge) {
                badge.textContent = this.courses.length;
            }
            
            console.log(`✅ Loaded ${this.courses.length} courses`);
            
        } catch (error) {
            console.error('Failed to load courses:', error);
            this.courses = this.getMockCourses();
            this.filteredCourses = [...this.courses];
            this.renderTable();
            this.updateStats();
        }
    },
    
    getMockCourses(program) {
        return [
            {
                id: 'mock-1',
                unit_code: 'MH101',
                course_name: 'Maternal Health',
                target_program: program || 'KRCHN',
                block: 'Block 1',
                intake_year: '2025',
                description: 'Comprehensive maternal health nursing course',
                status: 'active',
                student_count: 45
            },
            {
                id: 'mock-2',
                unit_code: 'CS102',
                course_name: 'Clinical Skills',
                target_program: program || 'KRCHN',
                block: 'Block 1',
                intake_year: '2025',
                description: 'Essential clinical nursing skills',
                status: 'active',
                student_count: 42
            },
            {
                id: 'mock-3',
                unit_code: 'MHN201',
                course_name: 'Mental Health Nursing',
                target_program: program || 'KRCHN',
                block: 'Block 2',
                intake_year: '2024',
                description: 'Mental health assessment and care',
                status: 'completed',
                student_count: 38
            }
        ];
    },
    
    populateFilters() {
        // Intake years
        const years = [...new Set(this.courses.map(c => c.intake_year).filter(Boolean))].sort().reverse();
        const intakeFilter = document.getElementById('intakeYearFilter');
        if (intakeFilter) {
            intakeFilter.innerHTML = '<option value="">All Intake Years</option>' +
                years.map(y => `<option value="${y}">${y}</option>`).join('');
        }
        
        // Blocks
        const profile = window.lecturerDB?.getCurrentUserProfile();
        const program = profile?.program || 'KRCHN';
        const blocks = window.LecturerUtils?.getAcademicBlocks(program) || ['Introductory', 'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Final'];
        const blockFilter = document.getElementById('academicPeriodFilter');
        const label = document.getElementById('academicPeriodLabel');
        if (blockFilter) {
            const labelText = program === 'KRCHN' ? 'Filter by Block:' : 'Filter by Term:';
            if (label) label.textContent = labelText;
            
            blockFilter.innerHTML = '<option value="">All ' + (program === 'KRCHN' ? 'Blocks' : 'Terms') + '</option>' +
                blocks.map(b => `<option value="${b}">${b}</option>`).join('');
        }
        
        // Set current year
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
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="padding: 50px 20px; text-align: center; color: #94a3b8;">
                        <i class="fas fa-book" style="font-size: 48px; display: block; margin-bottom: 15px; color: #e2e8f0;"></i>
                        <h3 style="color: #475569; margin: 0 0 8px 0;">No Courses Found</h3>
                        <p style="margin: 0; font-size: 14px;">${this.courses.length === 0 ? 'No courses assigned to you yet.' : 'Try adjusting your filters.'}</p>
                        ${this.courses.length === 0 ? '<p style="margin: 5px 0 0 0; font-size: 13px; color: #94a3b8;">Contact the administrator for course assignments.</p>' : ''}
                    </td>
                </tr>
            `;
            document.getElementById('courseCountDisplay').textContent = '0';
            return;
        }
        
        // Get students for course counts
        const allStudents = window.LecturerStudents?.students || [];
        
        tbody.innerHTML = courses.map((course, index) => {
            const students = allStudents.filter(s => {
                const matchProgram = s.program === course.target_program;
                const matchIntake = !course.intake_year || s.intake_year === parseInt(course.intake_year);
                return matchProgram && matchIntake;
            });
            
            const studentCount = students.length || course.student_count || 0;
            const statusColors = {
                'active': '#10b981',
                'completed': '#3b82f6',
                'pending': '#f59e0b'
            };
            
            const statusLabels = {
                'active': 'Active',
                'completed': 'Completed',
                'pending': 'Pending'
            };
            
            const status = course.status || 'active';
            
            return `
                <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;${index % 2 === 0 ? '' : ''}" 
                    onmouseover="this.style.background='#f8fafc'" 
                    onmouseout="this.style.background='transparent'">
                    <td style="padding: 14px 18px;">
                        <span style="font-weight: 700; color: #4C1D95; font-size: 13px;">${this.escapeHtml(course.unit_code || 'N/A')}</span>
                    </td>
                    <td style="padding: 14px 18px; font-weight: 600; color: #1e293b;">
                        ${this.escapeHtml(course.course_name || 'N/A')}
                        ${course.description ? `<div style="font-size: 11px; color: #94a3b8; font-weight: 400; margin-top: 2px;">${this.escapeHtml(course.description)}</div>` : ''}
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
                    </td>
                    <td style="padding: 14px 18px; text-align: center;">
                        <span style="font-weight: 600; color: #0A3D62;">${studentCount}</span>
                    </td>
                    <td style="padding: 14px 18px; text-align: center;">
                        <div style="display: flex; gap: 6px; justify-content: center; flex-wrap: wrap;">
                            <button onclick="LecturerCourses.manageCourse('${course.id}')" 
                                    style="background: #4C1D95; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;"
                                    onmouseover="this.style.background='#5b21b6'" onmouseout="this.style.background='#4C1D95'">
                                <i class="fas fa-chart-bar"></i> Manage
                            </button>
                            <button onclick="LecturerCourses.viewStudents('${course.id}')" 
                                    style="background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;"
                                    onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'">
                                <i class="fas fa-users"></i>
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
                filterCount.textContent = `Showing all ${total} courses`;
            } else {
                filterCount.textContent = `Showing ${courses.length} of ${total} courses`;
            }
        }
    },
    
    updateStats() {
        const courses = this.courses;
        
        // Calculate total courses
        const totalCourses = courses.length;
        const totalEl = document.getElementById('totalCoursesCount2');
        if (totalEl) totalEl.textContent = totalCourses;
        
        // Calculate total students (sum of student counts)
        let totalStudents = 0;
        courses.forEach(c => {
            // If student_count is available use it, otherwise estimate
            const count = c.student_count || 0;
            totalStudents += count;
        });
        // If no student_count, estimate based on course count
        if (totalStudents === 0 && courses.length > 0) {
            // Try to get actual student counts from LecturerStudents
            const allStudents = window.LecturerStudents?.students || [];
            if (allStudents.length > 0) {
                // Count unique students per course
                totalStudents = allStudents.length;
            } else {
                totalStudents = courses.length * 35; // Average class size
            }
        }
        const studentsEl = document.getElementById('totalStudentsCount2');
        if (studentsEl) studentsEl.textContent = totalStudents;
        
        // Calculate active courses
        const active = courses.filter(c => c.status === 'active' || !c.status).length;
        const activeEl = document.getElementById('activeCoursesCount');
        if (activeEl) activeEl.textContent = active;
        
        // Calculate completed courses
        const completed = courses.filter(c => c.status === 'completed').length;
        const completedEl = document.getElementById('completedCoursesCount');
        if (completedEl) completedEl.textContent = completed;
        
        // Update badge
        const badge = document.getElementById('courseCountBadge');
        if (badge) {
            badge.textContent = courses.length;
        }
        
        // Update the main total courses count on dashboard if exists
        const dashboardCount = document.getElementById('totalCoursesCount');
        if (dashboardCount) {
            dashboardCount.textContent = courses.length;
        }
        
        console.log(`📊 Stats updated: ${totalCourses} courses, ${totalStudents} students, ${active} active, ${completed} completed`);
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
            const matchStatus = !status || course.status === status || (status === 'active' && !course.status);
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
        
        // Show course management modal or navigate
        window.showNotification(`📚 Managing: ${course.course_name} - Features coming soon!`, 'info');
        console.log('Managing course:', course);
    },
    
    viewStudents(courseId) {
        const course = this.courses.find(c => c.id === courseId);
        if (!course) {
            window.showNotification('Course not found.', 'error');
            return;
        }
        
        // Switch to students tab with filter
        const message = `👥 Viewing students for: ${course.course_name}`;
        window.showNotification(message, 'info');
        
        // Try to switch to students tab
        if (typeof showTab === 'function') {
            showTab('my-students');
        }
        
        // Store selected course for filtering
        sessionStorage.setItem('selectedCourseId', courseId);
    },
    
    exportCourses() {
        const courses = this.filteredCourses || this.courses;
        if (courses.length === 0) {
            window.showNotification('No courses to export.', 'warning');
            return;
        }
        
        // Create CSV
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
        a.download = `my_courses_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        window.showNotification('✅ Courses exported successfully!', 'success');
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
        window.showNotification('Courses refreshed!', 'success');
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
