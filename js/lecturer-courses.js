// js/lecturer-courses.js
/**
 * NCHSM Lecturer Courses Module
 * Uses the same unit assignments as the marks system
 * Dynamically finds the correct lecturer ID from assignments
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
    // Store the resolved lecturer ID
    lecturerAssignmentId: null,
    
    async init() {
        console.log('📚 Initializing Lecturer Courses...');
        // First, resolve the correct lecturer ID
        await this.resolveLecturerId();
        // Then load courses
        await this.loadCourses();
        this.populateFilters();
        this.setupEventListeners();
        this.updateStats();
        console.log('✅ Lecturer Courses initialized');
    },
    
    // ============================================
    // RESOLVE THE CORRECT LECTURER ID - SAME AS MARKS MODULE
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
            const email = profile.email;
            
            console.log('🔍 Auth ID:', authId);
            console.log('🔍 Lecturer name:', fullName);
            console.log('🔍 Lecturer email:', email);
            
            // FIRST: Try to find by name in lecturer_subject_assignments
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
            
            // SECOND: Try partial name match
            const nameParts = fullName.split(' ');
            const { data: allLecturers, error: allError } = await supabase
                .from('lecturer_subject_assignments')
                .select('lecturer_id, lecturer_name')
                .order('created_at', { ascending: false });
            
            if (!allError && allLecturers && allLecturers.length > 0) {
                for (const lecturer of allLecturers) {
                    const lecturerName = lecturer.lecturer_name || '';
                    for (const part of nameParts) {
                        if (part.length > 2 && lecturerName.toLowerCase().includes(part.toLowerCase())) {
                            this.lecturerAssignmentId = lecturer.lecturer_id;
                            console.log('✅ Found lecturer by partial name match:', this.lecturerAssignmentId);
                            return;
                        }
                    }
                }
                
                // If no match, use the most recent lecturer
                this.lecturerAssignmentId = allLecturers[0].lecturer_id;
                console.log('⚠️ Using most recent lecturer ID:', this.lecturerAssignmentId);
                return;
            }
            
            // Fallback: use auth ID
            this.lecturerAssignmentId = authId;
            console.log('⚠️ Falling back to auth ID:', this.lecturerAssignmentId);
            
        } catch (error) {
            console.error('Error resolving lecturer ID:', error);
            this.lecturerAssignmentId = null;
        }
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
            
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) {
                console.warn('Supabase not available');
                this.courses = [];
                this.filteredCourses = [];
                this.renderTable();
                this.updateStats();
                return;
            }
            
            // Use the resolved lecturer ID (same as marks module)
            const lecturerId = this.lecturerAssignmentId || profile.user_id;
            console.log('🔍 Using lecturer ID for courses:', lecturerId);
            
            let units = [];
            
            // Get from lecturer_subject_assignments using the resolved ID
            try {
                const { data, error } = await supabase
                    .from('lecturer_subject_assignments')
                    .select('*')
                    .eq('lecturer_id', lecturerId);
                
                if (!error && data && data.length > 0) {
                    console.log('📊 Found assignments:', data.length);
                    console.log('📋 Assignment details:', data);
                    
                    units = data.map(a => ({
                        id: a.id,
                        unit_id: a.id,
                        unit_code: a.subject_code || 'N/A',
                        course_name: a.subject_name || 'Unnamed Unit',
                        target_program: a.program || profile.program,
                        block: a.block || 'N/A',
                        intake_year: a.academic_year || new Date().getFullYear().toString(),
                        status: this.determineStatus(a),
                        credits: 0,
                        student_count: 0,
                        source: 'assignments',
                        raw: a
                    }));
                    
                    console.log('✅ Processed units from assignments:', units.length);
                } else {
                    console.log('📊 No assignments found for lecturer ID:', lecturerId);
                }
            } catch (e) {
                console.warn('Error querying lecturer_subject_assignments:', e.message);
            }
            
            // If no units, try to get from marks system
            if (units.length === 0) {
                console.log('🔄 No assignments found, checking marks system...');
                
                try {
                    // Try to get assigned units from the marks module
                    if (window.lecturerMarks && window.lecturerMarks.assignedUnits) {
                        const assignedUnits = window.lecturerMarks.assignedUnits || [];
                        if (assignedUnits.length > 0) {
                            console.log('📚 Found assigned units from marks system:', assignedUnits.length);
                            units = assignedUnits.map(u => ({
                                id: u.id || `unit-${Date.now()}-${Math.random()}`,
                                unit_id: u.id,
                                unit_code: u.unit_code || u.code || 'N/A',
                                course_name: u.unit_name || u.name || 'Unnamed Unit',
                                target_program: u.program || profile.program,
                                block: u.block || 'N/A',
                                intake_year: u.year || u.academic_year || new Date().getFullYear().toString(),
                                status: 'active',
                                credits: u.credits || 0,
                                student_count: 0,
                                source: 'marks',
                                raw: u
                            }));
                        }
                    }
                } catch (e) {
                    console.warn('Error getting units from marks system:', e.message);
                }
            }
            
            // If still no units, try units_catalog by program (fallback)
            if (units.length === 0) {
                console.log('🔄 Trying units_catalog for program:', profile.program);
                
                try {
                    const { data, error } = await supabase
                        .from('units_catalog')
                        .select('*')
                        .eq('program', profile.program)
                        .eq('status', 'active')
                        .order('unit_code', { ascending: true });
                    
                    if (!error && data && data.length > 0) {
                        console.log('📚 Found units in units_catalog:', data.length);
                        units = data.map(u => ({
                            id: u.id,
                            unit_id: u.id,
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
            
            // Set courses
            this.courses = units;
            this.filteredCourses = [...this.courses];
            
            // Get student counts
            await this.loadStudentCounts();
            
            // Filter by current year
            const currentYear = new Date().getFullYear().toString();
            const yearFiltered = this.courses.filter(c => {
                const year = c.intake_year;
                return year === currentYear || year === '' || year === 'N/A' || year === '2025' || year === '2026';
            });
            
            if (yearFiltered.length > 0) {
                this.filteredCourses = yearFiltered;
            }
            
            // Update the intake filter
            const intakeFilter = document.getElementById('intakeYearFilter');
            if (intakeFilter) {
                const years = [...new Set(this.courses.map(c => c.intake_year).filter(b => b && b !== 'N/A'))].sort().reverse();
                if (years.includes(currentYear)) {
                    intakeFilter.value = currentYear;
                } else if (years.length > 0) {
                    intakeFilter.value = years[0];
                }
            }
            
            this.renderTable();
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
            
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const program = profile?.program || 'KRCHN';
            
            const { count: totalStudents, error } = await supabase
                .from('consolidated_user_profiles_table')
                .select('*', { count: 'exact', head: true })
                .eq('program', program)
                .eq('role', 'student');
            
            const studentCount = (error || !totalStudents) ? 0 : totalStudents;
            
            for (let course of this.courses) {
                course.student_count = studentCount;
            }
            
            console.log(`📊 Student count for ${program}: ${studentCount}`);
            
        } catch (error) {
            console.error('Error loading student counts:', error);
        }
    },
    
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
        
        const currentYear = new Date().getFullYear().toString();
        
        tbody.innerHTML = courses.map((course, index) => {
            const studentCount = course.student_count || 0;
            const isPast = course.intake_year && course.intake_year !== 'N/A' && parseInt(course.intake_year) < parseInt(currentYear);
            const isFuture = course.intake_year && course.intake_year !== 'N/A' && parseInt(course.intake_year) > parseInt(currentYear);
            const rowStyle = isPast ? 'opacity: 0.7;' : '';
            
            let status = course.status || 'active';
            if (isPast) status = 'completed';
            else if (isFuture) status = 'upcoming';
            
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
        
        // Upcoming units (future years)
        const upcoming = courses.filter(c => {
            const year = c.intake_year;
            return year && year !== 'N/A' && parseInt(year) > parseInt(currentYear);
        }).length;
        
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
        
        console.log(`📊 Stats: ${totalCourses} total, ${active} active (${currentYear}), ${completed} completed, ${upcoming} upcoming`);
    },
    
    applyFilters() {
        const intake = document.getElementById('intakeYearFilter')?.value || '';
        const block = document.getElementById('academicPeriodFilter')?.value || '';
        const search = document.getElementById('courseSearch')?.value?.toLowerCase() || '';
        
        this.filteredCourses = this.courses.filter(course => {
            const matchIntake = !intake || course.intake_year === intake;
            const matchBlock = !block || course.block === block;
            const matchSearch = !search || 
                course.course_name?.toLowerCase().includes(search) ||
                course.unit_code?.toLowerCase().includes(search) ||
                course.target_program?.toLowerCase().includes(search);
            
            return matchIntake && matchBlock && matchSearch;
        });
        
        this.renderTable();
    },
    
    setupEventListeners() {
        ['intakeYearFilter', 'academicPeriodFilter'].forEach(id => {
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
        const filterIds = ['intakeYearFilter', 'academicPeriodFilter'];
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
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    async refresh() {
        await this.resolveLecturerId();
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

console.log('✅ LecturerCourses module loaded - Same ID resolution as marks module');
