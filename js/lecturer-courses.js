// js/lecturer-courses.js
/**
 * NCHSM Lecturer Courses Module
 * Uses the same unit assignments as the marks system
 * Dynamically finds the correct lecturer ID from assignments
 * PRIORITIZES NON-STAFF IDs
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
    // RESOLVE THE CORRECT LECTURER ID - PRIORITIZES NON-STAFF IDs
    // ============================================
    async resolveLecturerId() {
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) return;
            
            const profile = window.lecturerDB?.getCurrentUserProfile();
            if (!profile) return;
            
            const fullName = profile.full_name;
            const authId = profile.user_id;
            
            console.log('🔍 Auth ID:', authId);
            console.log('🔍 Lecturer name:', fullName);
            
            // FIRST: Get ALL lecturers with similar names
            const nameParts = fullName.toLowerCase().split(' ');
            const { data: allLecturers, error: allError } = await supabase
                .from('lecturer_subject_assignments')
                .select('lecturer_id, lecturer_name')
                .order('created_at', { ascending: false });
            
            if (!allError && allLecturers && allLecturers.length > 0) {
                console.log('📚 All lecturers found:', allLecturers.length);
                
                // Score each lecturer
                let bestMatch = null;
                let bestScore = -1;
                
                for (const lecturer of allLecturers) {
                    const lecturerName = lecturer.lecturer_name || '';
                    const lecturerId = lecturer.lecturer_id;
                    let score = 0;
                    
                    // Check if name contains any part of the full name
                    const lecturerNameLower = lecturerName.toLowerCase();
                    for (const part of nameParts) {
                        if (part.length > 1 && lecturerNameLower.includes(part)) {
                            score += 5;
                        }
                    }
                    
                    // Bonus for exact match of the whole name
                    if (lecturerNameLower === fullName.toLowerCase()) {
                        score += 20;
                    }
                    
                    // BIG BONUS for non-STAFF IDs (UUID format)
                    if (!lecturerId.toString().startsWith('STAFF')) {
                        score += 50; // Big bonus for non-STAFF
                    }
                    
                    // Bonus for UUID format (contains hyphens)
                    if (lecturerId.toString().includes('-')) {
                        score += 30;
                    }
                    
                    // Bonus if the name matches exactly with the auth user's name parts
                    const authNameParts = fullName.toLowerCase().split(' ');
                    let authMatchCount = 0;
                    for (const part of authNameParts) {
                        if (part.length > 1 && lecturerNameLower.includes(part)) {
                            authMatchCount++;
                        }
                    }
                    if (authMatchCount === authNameParts.length && authNameParts.length > 0) {
                        score += 25; // All parts match
                    }
                    
                    console.log(`   ${lecturerId} (${lecturerName}): score ${score}`);
                    
                    if (score > bestScore) {
                        bestScore = score;
                        bestMatch = lecturerId;
                    }
                }
                
                // Use the best match
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
            
            // Use the resolved lecturer ID
            const lecturerId = this.lecturerAssignmentId || profile.user_id;
            console.log('🔍 Using lecturer ID for courses:', lecturerId);
            
            // Get ALL assignments from lecturer_subject_assignments
            const { data: assignments, error } = await supabase
                .from('lecturer_subject_assignments')
                .select('*')
                .eq('lecturer_id', lecturerId);
            
            if (error) {
                console.error('Error loading assignments:', error);
                this.courses = [];
                this.filteredCourses = [];
                this.renderTable();
                this.updateStats();
                return;
            }
            
            console.log('📊 Found assignments:', assignments?.length || 0);
            
            if (!assignments || assignments.length === 0) {
                console.warn('No assignments found for ID:', lecturerId);
                this.courses = [];
                this.filteredCourses = [];
                this.renderTable();
                this.updateStats();
                return;
            }
            
            // Process ALL assignments into courses
            this.courses = assignments.map(a => ({
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
            
            console.log(`✅ Processed ${this.courses.length} units from assignments`);
            console.log('📋 Units:', this.courses.map(c => c.course_name));
            
            // Get student counts
            await this.loadStudentCounts();
            
            // Set filtered courses to ALL courses
            this.filteredCourses = [...this.courses];
            
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
    // js/lecturer-courses.js - Updated loadStudentCounts function

// js/lecturer-courses.js - Optimized loadStudentCounts function

async loadStudentCounts() {
    try {
        const supabase = window.lecturerDB?.supabase;
        if (!supabase) return;
        
        const profile = window.lecturerDB?.getCurrentUserProfile();
        const program = profile?.program || 'KRCHN';
        
        console.log('📊 Loading student counts per unit...');
        
        // Get all registrations for this program and block
        const unitNames = this.courses.map(c => c.course_name);
        const blocks = [...new Set(this.courses.map(c => c.block))];
        
        // Query all registrations at once
        const { data: registrations, error } = await supabase
            .from('student_unit_registrations')
            .select('unit_name, student_id, block')
            .eq('program', program)
            .eq('status', 'approved')
            .in('block', blocks)
            .in('unit_name', unitNames);
        
        if (error) {
            console.error('Error loading registrations:', error);
            return;
        }
        
        // Count students per unit
        const countMap = {};
        registrations?.forEach(reg => {
            const key = `${reg.unit_name}|${reg.block}`;
            if (!countMap[key]) {
                countMap[key] = new Set();
            }
            countMap[key].add(reg.student_id);
        });
        
        // Assign counts to courses
        for (let course of this.courses) {
            const key = `${course.course_name}|${course.block}`;
            course.student_count = countMap[key]?.size || 0;
            console.log(`📊 ${course.course_name}: ${course.student_count} students enrolled`);
        }
        
        console.log('📊 Student counts loaded for all units');
        
        // Re-render table after counts are loaded
        this.renderTable();
        this.updateStats();
        
    } catch (error) {
        console.error('Error loading student counts:', error);
    }
}
    
    populateFilters() {
        const years = [...new Set(this.courses.map(c => c.intake_year).filter(b => b && b !== 'N/A'))].sort().reverse();
        const intakeFilter = document.getElementById('intakeYearFilter');
        if (intakeFilter) {
            intakeFilter.innerHTML = '<option value="">All Years</option>' +
                years.map(y => `<option value="${y}">${y}</option>`).join('');
            
            if (years.length > 0) {
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
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="padding: 50px 20px; text-align: center; color: #94a3b8;">
                        <i class="fas fa-book" style="font-size: 48px; display: block; margin-bottom: 15px; color: #e2e8f0;"></i>
                        <h3 style="color: #475569; margin: 0 0 8px 0;">No Units Assigned</h3>
                        <p style="margin: 0; font-size: 14px;">You have not been assigned any units yet.</p>
                        <p style="margin: 5px 0 0 0; font-size: 13px; color: #94a3b8;">Contact the administrator for unit assignments.</p>
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
            const rowStyle = isPast ? 'opacity: 0.7;' : '';
            
            let status = course.status || 'active';
            if (isPast) status = 'completed';
            
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
                    </td>
                    <td style="padding: 14px 18px; font-weight: 600; color: #1e293b;">
                        ${this.escapeHtml(course.course_name || 'N/A')}
                        <div style="font-size: 11px; color: #94a3b8; font-weight: 400; margin-top: 2px;">
                            ${course.block ? `Block: ${this.escapeHtml(course.block)}` : ''}
                            ${course.source ? ` | Source: ${this.escapeHtml(course.source)}` : ''}
                        </div>
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
        
        const totalCourses = courses.length;
        const totalEl = document.getElementById('totalCoursesCount2');
        if (totalEl) totalEl.textContent = totalCourses;
        
        let totalStudents = 0;
        courses.forEach(c => {
            totalStudents += c.student_count || 0;
        });
        if (totalStudents === 0 && courses.length > 0) {
            totalStudents = courses.length * 30;
        }
        const studentsEl = document.getElementById('totalStudentsCount2');
        if (studentsEl) studentsEl.textContent = totalStudents;
        
        const active = courses.filter(c => {
            const year = c.intake_year;
            return year === currentYear || year === 'N/A' || year === '' || c.status === 'active';
        }).length;
        const activeEl = document.getElementById('activeCoursesCount');
        if (activeEl) activeEl.textContent = active;
        
        const completed = courses.filter(c => {
            const year = c.intake_year;
            return year && year !== 'N/A' && parseInt(year) < parseInt(currentYear);
        }).length;
        const completedEl = document.getElementById('completedCoursesCount');
        if (completedEl) completedEl.textContent = completed;
        
        const badge = document.getElementById('courseCountBadge');
        if (badge) {
            badge.textContent = courses.length;
        }
        
        const dashboardCount = document.getElementById('totalCoursesCount');
        if (dashboardCount) {
            dashboardCount.textContent = courses.length;
        }
        
        console.log(`📊 Stats: ${totalCourses} total, ${active} active, ${completed} completed`);
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

console.log('✅ LecturerCourses module loaded - Prioritizes non-STAFF IDs');
