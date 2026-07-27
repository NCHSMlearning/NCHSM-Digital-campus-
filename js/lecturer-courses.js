// js/lecturer-courses.js - COMPLETE FIXED VERSION
/**
 * NCHSM Lecturer Courses Module
 * Uses the same unit assignments as the marks system
 * Dynamically finds the correct lecturer ID from assignments
 * Uses ilike for partial name matching
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
    lecturerAssignmentId: null,
    
    async init() {
        console.log('📚 Initializing Lecturer Courses...');
        await this.resolveLecturerId();
        await this.loadCourses();
        this.populateFilters();
        this.setupEventListeners();
        this.updateStats();
        console.log('✅ Lecturer Courses initialized');
    },
    
    // ============================================
    // RESOLVE THE CORRECT LECTURER ID - FIXED WITH ilike
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
            
            // ✅ Use ilike for partial name matching
            const { data: nameData, error: nameError } = await supabase
                .from('lecturer_subject_assignments')
                .select('lecturer_id, lecturer_name')
                .ilike('lecturer_name', `%${fullName}%`);
            
            if (!nameError && nameData && nameData.length > 0) {
                console.log('📋 Found matches:', nameData);
                
                // First priority: non-STAFF ID (UUID format)
                const nonStaff = nameData.find(l => !l.lecturer_id.toString().startsWith('STAFF'));
                if (nonStaff) {
                    this.lecturerAssignmentId = nonStaff.lecturer_id;
                    console.log('✅ Found non-STAFF ID by partial name match:', this.lecturerAssignmentId);
                    return;
                }
                
                // Second priority: STAFF ID
                this.lecturerAssignmentId = nameData[0].lecturer_id;
                console.log('⚠️ Found STAFF ID by partial name match:', this.lecturerAssignmentId);
                return;
            }
            
            // Fallback to auth ID
            this.lecturerAssignmentId = authId;
            console.log('⚠️ Falling back to auth ID:', this.lecturerAssignmentId);
            
        } catch (error) {
            console.error('Error resolving lecturer ID:', error);
            this.lecturerAssignmentId = null;
        }
    },
    
    // ============================================
    // LOAD COURSES - FIXED
    // ============================================
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
            
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) {
                console.warn('Supabase not available');
                this.courses = [];
                this.filteredCourses = [];
                this.renderTable();
                this.updateStats();
                return;
            }
            
            const lecturerId = this.lecturerAssignmentId || profile.user_id;
            console.log('🔍 Using lecturer ID for courses:', lecturerId);
            
            let units = [];
            
            // ✅ Get assignments from lecturer_subject_assignments
            const { data: assignments, error } = await supabase
                .from('lecturer_subject_assignments')
                .select('*')
                .eq('lecturer_id', String(lecturerId));
            
            if (error) {
                console.error('Error loading assignments:', error);
                this.courses = [];
                this.filteredCourses = [];
                this.renderTable();
                this.updateStats();
                return;
            }
            
            console.log('📊 Found assignments:', assignments?.length || 0);
            
            if (assignments && assignments.length > 0) {
                console.log('📋 Assignment details:', assignments);
                
                units = assignments.map((a, index) => ({
                    id: a.id || `unit_${index}`,
                    unit_id: a.id || `unit_${index}`,
                    unit_code: a.subject_code || 'N/A',
                    course_name: a.subject_name || 'Unnamed Unit',
                    target_program: a.program || profile.program || 'KRCHN',
                    block: a.block || 'N/A',
                    intake_year: a.academic_year || new Date().getFullYear().toString(),
                    status: this.determineStatus(a),
                    credits: 0,
                    student_count: 0,
                    source: 'assignments',
                    raw: a
                }));
                
                console.log('✅ Processed units from assignments:', units.length);
            }
            
            // ✅ If no units, try units_catalog by program (fallback)
            if (units.length === 0) {
                console.log('🔄 No assignments found, trying units_catalog for program:', profile.program);
                
                try {
                    const { data, error } = await supabase
                        .from('units_catalog')
                        .select('*')
                        .eq('program', profile.program)
                        .eq('status', 'active')
                        .order('unit_code', { ascending: true });
                    
                    if (!error && data && data.length > 0) {
                        console.log('📚 Found units in units_catalog:', data.length);
                        units = data.map((u, index) => ({
                            id: u.id || `catalog_${index}`,
                            unit_id: u.id || `catalog_${index}`,
                            unit_code: u.unit_code || 'N/A',
                            course_name: u.unit_name || 'Unnamed Unit',
                            target_program: u.program || profile.program,
                            block: u.block || 'N/A',
                            intake_year: u.year ? String(u.year) : new Date().getFullYear().toString(),
                            status: 'active',
                            credits: u.credits || 0,
                            unit_type: u.unit_type || 'Core',
                            student_count: 0,
                            source: 'catalog',
                            raw: u
                        }));
                    }
                } catch (e) {
                    console.warn('Error getting units from units_catalog:', e.message);
                }
            }
            
            // ✅ Set courses
            this.courses = units;
            this.filteredCourses = [...this.courses];
            
            // ✅ Get student counts for each unit
            await this.loadStudentCounts();
            
            // ✅ Apply initial filters
            this.applyFilters();
            
            // ✅ Update stats
            this.updateStats();
            
            const badge = document.getElementById('courseCountBadge');
            if (badge) {
                badge.textContent = this.courses.length;
            }
            
            console.log(`✅ Loaded ${this.courses.length} total units`);
            
        } catch (error) {
            console.error('Failed to load courses:', error);
            this.courses = [];
            this.filteredCourses = [];
            this.renderTable();
            this.updateStats();
        }
    },
    
    // ============================================
    // DETERMINE STATUS - FIXED
    // ============================================
    determineStatus(assignment) {
        const currentYear = new Date().getFullYear().toString();
        const year = assignment.academic_year || '';
        
        if (!year || year === 'N/A' || year === '') return 'active';
        if (year === currentYear) return 'active';
        if (parseInt(year) < parseInt(currentYear)) return 'completed';
        if (parseInt(year) > parseInt(currentYear)) return 'upcoming';
        return 'active';
    },
    
    // ============================================
    // LOAD STUDENT COUNTS PER UNIT - FIXED
    // ============================================
    async loadStudentCounts() {
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) return;
            
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const program = profile?.program || 'KRCHN';
            
            // ✅ Get actual student counts per unit from student_unit_registrations
            for (let course of this.courses) {
                try {
                    const { count: studentCount, error } = await supabase
                        .from('student_unit_registrations')
                        .select('*', { count: 'exact', head: true })
                        .eq('unit_name', course.course_name)
                        .eq('program', program)
                        .eq('status', 'approved');
                    
                    if (!error) {
                        course.student_count = studentCount || 0;
                    } else {
                        // Fallback: get total students in program
                        const { count: totalStudents } = await supabase
                            .from('consolidated_user_profiles_table')
                            .select('*', { count: 'exact', head: true })
                            .eq('program', program)
                            .eq('role', 'student');
                        
                        course.student_count = totalStudents || 0;
                    }
                } catch (e) {
                    console.warn(`Error getting student count for ${course.course_name}:`, e.message);
                    course.student_count = 0;
                }
            }
            
            console.log('📊 Student counts loaded for all units');
            
        } catch (error) {
            console.error('Error loading student counts:', error);
        }
    },
    
    // ============================================
    // POPULATE FILTERS - FIXED
    // ============================================
    populateFilters() {
        const years = [...new Set(this.courses.map(c => c.intake_year).filter(b => b && b !== 'N/A'))].sort().reverse();
        const intakeFilter = document.getElementById('intakeYearFilter');
        if (intakeFilter) {
            intakeFilter.innerHTML = '<option value="">All Years</option>' +
                years.map(y => `<option value="${y}">${y}</option>`).join('');
            
            const currentYear = new Date().getFullYear().toString();
            if (years.includes(currentYear)) {
                intakeFilter.value = currentYear;
            } else if (years.length > 0) {
                intakeFilter.value = years[0];
            }
        }
        
        const blocks = [...new Set(this.courses.map(c => c.block).filter(Boolean))];
        const blockFilter = document.getElementById('academicPeriodFilter');
        if (blockFilter) {
            blockFilter.innerHTML = '<option value="">All Blocks</option>' +
                blocks.map(b => `<option value="${b}">${b}</option>`).join('');
        }
        
        const yearEl = document.getElementById('currentAcademicYear');
        if (yearEl) {
            yearEl.textContent = new Date().getFullYear();
        }
    },
    
    // ============================================
    // RENDER TABLE - FIXED
    // ============================================
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
            const countDisplay = document.getElementById('courseCountDisplay');
            if (countDisplay) countDisplay.textContent = '0';
            return;
        }
        
        const currentYear = new Date().getFullYear().toString();
        
        tbody.innerHTML = courses.map((course, index) => {
            const studentCount = course.student_count || 0;
            const isPast = course.intake_year && course.intake_year !== 'N/A' && parseInt(course.intake_year) < parseInt(currentYear);
            const rowStyle = isPast ? 'opacity: 0.7;' : '';
            
            let status = course.status || 'active';
            if (isPast && status !== 'completed') status = 'completed';
            
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
            
            const statusColor = statusColors[status] || '#6b7280';
            const statusLabel = statusLabels[status] || status;
            
            // ✅ Use course.id or fallback
            const courseId = course.id || course.unit_id || `course_${index}`;
            
            return `
                <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s; ${rowStyle}" 
                    onmouseover="this.style.background='#f8fafc'" 
                    onmouseout="this.style.background='transparent'">
                    <td style="padding: 14px 18px;">
                        <span style="font-weight: 700; color: #4C1D95; font-size: 13px;">${this.escapeHtml(course.unit_code || 'N/A')}</span>
                        ${course.credits ? `<span style="font-size: 10px; color: #94a3b8; display: block;">${course.credits} Credits</span>` : ''}
                    </td>
                    <td style="padding: 14px 18px; font-weight: 600; color: #1e293b;">
                        ${this.escapeHtml(course.course_name || 'N/A')}
                        ${course.source ? `<div style="font-size: 10px; color: #94a3b8; font-weight: 400; margin-top: 2px;">Source: ${this.escapeHtml(course.source)}</div>` : ''}
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
                            <button onclick="LecturerCourses.manageCourse('${courseId}')" 
                                    style="background: #4C1D95; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;"
                                    onmouseover="this.style.background='#5b21b6'" onmouseout="this.style.background='#4C1D95'">
                                <i class="fas fa-chart-bar"></i> Manage
                            </button>
                            <button onclick="LecturerCourses.viewStudents('${courseId}')" 
                                    style="background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;"
                                    onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'">
                                <i class="fas fa-users"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
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
    
    // ============================================
    // UPDATE STATS - FIXED
    // ============================================
    updateStats() {
        const courses = this.courses;
        const currentYear = new Date().getFullYear().toString();
        
        // Total units
        const totalCourses = courses.length;
        const totalEl = document.getElementById('totalCoursesCount2');
        if (totalEl) totalEl.textContent = totalCourses;
        
        // Total students (sum of all unit enrollments)
        let totalStudents = 0;
        courses.forEach(c => {
            totalStudents += c.student_count || 0;
        });
        const studentsEl = document.getElementById('totalStudentsCount2');
        if (studentsEl) studentsEl.textContent = totalStudents;
        
        // Active units (current year)
        const active = courses.filter(c => {
            const year = c.intake_year;
            return year === currentYear || year === 'N/A' || year === '' || c.status === 'active';
        }).length;
        const activeEl = document.getElementById('activeCoursesCount');
        if (activeEl) activeEl.textContent = active;
        
        // Completed units (past years)
        const completed = courses.filter(c => {
            const year = c.intake_year;
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
        
        console.log(`📊 Stats: ${totalCourses} total, ${active} active, ${completed} completed, ${totalStudents} students`);
    },
    
    // ============================================
    // APPLY FILTERS - FIXED
    // ============================================
    applyFilters() {
        const intake = document.getElementById('intakeYearFilter')?.value || '';
        const block = document.getElementById('academicPeriodFilter')?.value || '';
        const status = document.getElementById('statusFilter')?.value || '';
        const search = document.getElementById('courseSearch')?.value?.toLowerCase() || '';
        
        this.filteredCourses = this.courses.filter(course => {
            const matchIntake = !intake || course.intake_year === intake;
            const matchBlock = !block || course.block === block;
            const matchStatus = !status || course.status === status;
            const matchSearch = !search || 
                course.course_name?.toLowerCase().includes(search) ||
                course.unit_code?.toLowerCase().includes(search) ||
                course.target_program?.toLowerCase().includes(search) ||
                course.block?.toLowerCase().includes(search);
            
            return matchIntake && matchBlock && matchStatus && matchSearch;
        });
        
        this.renderTable();
    },
    
    // ============================================
    // SETUP EVENT LISTENERS - FIXED
    // ============================================
    setupEventListeners() {
        ['intakeYearFilter', 'academicPeriodFilter', 'statusFilter'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', () => this.applyFilters());
            }
        });
        
        const searchInput = document.getElementById('courseSearch');
        if (searchInput) {
            let timeout;
            searchInput.addEventListener('input', () => {
                clearTimeout(timeout);
                timeout = setTimeout(() => this.applyFilters(), 300);
            });
        }
        
        const searchBtn = document.getElementById('courseSearchBtn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.applyFilters());
        }
        
        const clearBtn = document.getElementById('clearCourseFilters');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearFilters());
        }
    },
    
    // ============================================
    // CLEAR FILTERS - FIXED
    // ============================================
    clearFilters() {
        const filterIds = ['intakeYearFilter', 'academicPeriodFilter', 'statusFilter'];
        filterIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        
        const searchEl = document.getElementById('courseSearch');
        if (searchEl) searchEl.value = '';
        
        this.filteredCourses = [...this.courses];
        this.renderTable();
        
        window.showNotification('Filters cleared!', 'info');
    },
    
    // ============================================
    // MANAGE COURSE - FIXED
    // ============================================
    manageCourse(courseId) {
        const course = this.courses.find(c => c.id === courseId || c.unit_id === courseId);
        if (!course) {
            window.showNotification('Course not found.', 'error');
            return;
        }
        
        // Navigate to marks entry for this unit
        if (typeof showTab === 'function') {
            showTab('marks');
        }
        
        // Store selected unit in session storage
        sessionStorage.setItem('selectedUnit', course.course_name);
        sessionStorage.setItem('selectedUnitBlock', course.block);
        sessionStorage.setItem('selectedUnitCode', course.unit_code);
        
        window.showNotification(`📚 Managing: ${course.course_name} - Redirecting to marks entry...`, 'success');
        
        // Trigger marks load
        setTimeout(() => {
            if (typeof loadMarksEntry === 'function') {
                loadMarksEntry();
            }
        }, 500);
    },
    
    // ============================================
    // VIEW STUDENTS - FIXED
    // ============================================
    viewStudents(courseId) {
        const course = this.courses.find(c => c.id === courseId || c.unit_id === courseId);
        if (!course) {
            window.showNotification('Course not found.', 'error');
            return;
        }
        
        window.showNotification(`👥 Viewing students for: ${course.course_name} (${course.student_count || 0} students)`, 'info');
        
        if (typeof showTab === 'function') {
            showTab('my-students');
        }
        
        sessionStorage.setItem('selectedCourseId', courseId);
        sessionStorage.setItem('selectedCourseName', course.course_name);
        sessionStorage.setItem('selectedUnitForStudents', course.course_name);
    },
    
    // ============================================
    // EXPORT COURSES - FIXED
    // ============================================
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
    
    // ============================================
    // ESCAPE HTML
    // ============================================
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    // ============================================
    // REFRESH
    // ============================================
    async refresh() {
        await this.resolveLecturerId();
        await this.loadCourses();
        this.populateFilters();
        this.applyFilters();
        this.updateStats();
        window.showNotification('Units refreshed!', 'success');
    }
};

// ============================================
// INITIALIZE ON DOM READY
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => LecturerCourses.init(), 550);
});

// ============================================
// GLOBAL EXPOSURE
// ============================================
window.LecturerCourses = LecturerCourses;
window.applyCourseFilters = () => LecturerCourses.applyFilters();
window.clearCourseFilters = () => LecturerCourses.clearFilters();
window.searchCourses = () => LecturerCourses.applyFilters();
window.exportCourses = () => LecturerCourses.exportCourses();
window.manageCourse = (id) => LecturerCourses.manageCourse(id);
window.viewCourseStudents = (id) => LecturerCourses.viewStudents(id);

console.log('✅ LecturerCourses module loaded - Complete fix with ilike name matching');
console.log('✅ Available functions: applyCourseFilters, clearCourseFilters, searchCourses, exportCourses, manageCourse, viewCourseStudents');
