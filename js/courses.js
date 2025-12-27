// courses.js - Courses Management for NCHSM Digital Student Dashboard

// *************************************************************************
// *** COURSES MANAGEMENT SYSTEM ***
// *************************************************************************

// Helper function for safe Supabase client access
function getSupabaseClient() {
    const client = window.db?.supabase;
    if (!client || typeof client.from !== 'function') {
        console.error('❌ No valid Supabase client available');
        return null;
    }
    return client;
}

// Helper function for safe user profile access
function getUserProfile() {
    return window.db?.currentUserProfile || 
           window.currentUserProfile || 
           window.userProfile || 
           {};
}

// Helper function for safe user ID access
function getCurrentUserId() {
    return window.db?.currentUserId || window.currentUserId;
}

let cachedCourses = [];

// Load courses for the current student
async function loadCourses() {
    const tableBody = document.getElementById('courses-table');
    if (!tableBody) return;
    AppUtils.showLoading(tableBody, 'Loading courses...');

    // Get user profile safely
    const userProfile = getUserProfile();
    const userId = getCurrentUserId();
    
    // Get Supabase client safely
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) {
        AppUtils.showError(tableBody, 'Database connection error');
        return;
    }
    
    const program = userProfile?.program;
    const department = userProfile?.department;
    const block = userProfile?.block;
    const intakeYear = userProfile?.intake_year;

    if ((!program && !department) || !intakeYear) {
        tableBody.innerHTML = `<tr><td colspan="4">
            Missing program/department or intake year info. 
            Program: ${program || 'undefined'}, 
            Department: ${department || 'undefined'},
            Intake Year: ${intakeYear || 'undefined'}
            Cannot load courses.
        </td></tr>`;
        cachedCourses = [];
        return;
    }

    try {
        const blockFilter = `block.eq.${block},block.is.null,block.eq.General`;

        let programFilter;
        
        if (program === 'TVET' || department === 'TVET') {
            programFilter = `target_program.eq.TVET`;
        } else if (program === 'KRCHN') {
            programFilter = `target_program.eq.KRCHN`;
        } else if (department === 'Nursing') {
            programFilter = `target_program.eq.Nursing`;
        } else if (department === 'Clinical Medicine') {
            programFilter = `target_program.eq.Clinical Medicine`;
        } else if (department === 'Management') {
            programFilter = `target_program.eq.Management`;
        } else {
            programFilter = `target_program.eq.${program}`;
        }

        const { data: courses, error } = await supabaseClient
            .from('courses')
            .select('*')
            .or(programFilter)
            .eq('intake_year', intakeYear)
            .or(blockFilter)
            .order('course_name', { ascending: true });

        if (error) throw error;

        cachedCourses = courses || [];
        
        tableBody.innerHTML = '';
        if (cachedCourses.length > 0) {
            cachedCourses.forEach(c => {
                tableBody.innerHTML += `
                    <tr>
                        <td>${escapeHtml(c.course_name) || 'N/A'}</td>
                        <td>${escapeHtml(c.unit_code) || 'N/A'}</td>
                        <td>${escapeHtml(c.description) || 'N/A'}</td>
                        <td>${escapeHtml(c.status) || 'N/A'}</td>
                    </tr>
                `;
            });
        } else {
            tableBody.innerHTML = `<tr><td colspan="4">
                No courses found for: ${program || department} 
                (Program: ${program || 'undefined'}, Department: ${department || 'undefined'})
                <br>Intake Year: ${intakeYear}, Block: ${block}
            </td></tr>`;
        }

    } catch (error) {
        console.error("❌ Failed to load courses:", error);
        AppUtils.showError(tableBody, `Error loading courses: ${error.message}`);
        cachedCourses = [];
    }

    if (typeof loadDashboardMetrics === "function") {
        loadDashboardMetrics(userId);
    }
}

// Load courses for attendance target selection
async function loadClassTargets() {
    // Get user profile safely
    const userProfile = getUserProfile();
    
    // Get Supabase client safely
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) return;
    
    const program = userProfile?.program || userProfile?.department;
    const intakeYear = userProfile?.intake_year;
    const block = userProfile?.block || null;

    if (!program || !intakeYear) {
        cachedCourses = [];
        return;
    }

    try {
        let query = supabaseClient.from('courses_sections')
            .select('id, name, code, latitude, longitude')
            .eq('program', program)
            .eq('intake_year', intakeYear);

        if (block) query = query.or(`block.eq.${block},block.is.null`);
        else query = query.is('block', null);

        const { data, error } = await query.order('name');
        if (error) throw error;

        cachedCourses = (data || []).map(c => ({
            id: c.id,
            name: c.name,
            code: c.code,
            latitude: c.latitude,
            longitude: c.longitude
        }));
    } catch (error) {
        console.error("Error loading class targets:", error);
        cachedCourses = [];
    }
}

// Load courses metrics for dashboard
async function loadCoursesMetrics() {
    try {
        if (cachedCourses.length === 0) {
            await loadCourses();
        }
        return { count: cachedCourses.length };
    } catch (error) {
        console.error("Error loading courses metrics:", error);
        return { count: 0 };
    }
}

// Utility to safely escape HTML
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// *************************************************************************
// *** COURSE-RELATED HELPER FUNCTIONS ***
// *************************************************************************

// Get course by ID
function getCourseById(courseId) {
    return cachedCourses.find(course => course.id === courseId);
}

// Get course by name
function getCourseByName(courseName) {
    return cachedCourses.find(course => 
        course.course_name === courseName || course.name === courseName
    );
}

// Filter courses by program
function filterCoursesByProgram(program) {
    return cachedCourses.filter(course => course.program_type === program);
}

// Filter courses by block
function filterCoursesByBlock(block) {
    return cachedCourses.filter(course => course.block === block);
}

// Get active courses
function getActiveCourses() {
    return cachedCourses.filter(course => course.status === 'Active');
}

// Get course statistics
function getCourseStatistics() {
    const total = cachedCourses.length;
    const active = cachedCourses.filter(c => c.status === 'Active').length;
    const inactive = cachedCourses.filter(c => c.status === 'Inactive').length;
    
    return {
        total,
        active,
        inactive,
        activePercentage: total > 0 ? Math.round((active / total) * 100) : 0
    };
}

// Refresh courses data
async function refreshCourses() {
    console.log("🔄 Refreshing courses data...");
    await loadCourses();
    await loadClassTargets();
    return cachedCourses;
}

// *************************************************************************
// *** COURSE SCHEDULE FUNCTIONS ***
// *************************************************************************

// Load course schedule for academic calendar
async function loadCourseSchedule() {
    const userProfile = getUserProfile();
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) return [];
    
    const program = userProfile?.program || userProfile?.department;
    const block = userProfile?.block;
    const intakeYear = userProfile?.intake_year;

    if (!program || !block || !intakeYear) return [];

    try {
        const { data: schedule, error } = await supabaseClient
            .from('course_schedule')
            .select('*')
            .eq('program', program)
            .eq('block', block)
            .eq('intake_year', intakeYear)
            .order('day_of_week', { ascending: true })
            .order('start_time', { ascending: true });

        if (error) throw error;

        return schedule || [];
    } catch (error) {
        console.error("Error loading course schedule:", error);
        return [];
    }
}

// Get today's courses
async function getTodaysCourses() {
    const schedule = await loadCourseSchedule();
    const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Adjust for Kenyan schedule (if needed)
    const dayMapping = {
        0: 'Sunday',
        1: 'Monday',
        2: 'Tuesday',
        3: 'Wednesday',
        4: 'Thursday',
        5: 'Friday',
        6: 'Saturday'
    };
    
    const todaysDay = dayMapping[today];
    return schedule.filter(session => session.day_of_week === todaysDay);
}

// Get upcoming courses (next 7 days)
async function getUpcomingCourses() {
    const schedule = await loadCourseSchedule();
    const now = new Date();
    const upcoming = [];
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() + i);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        
        const daysSessions = schedule.filter(session => session.day_of_week === dayName);
        daysSessions.forEach(session => {
            upcoming.push({
                date: date.toISOString().split('T')[0],
                day: dayName,
                ...session
            });
        });
    }
    
    return upcoming;
}

// *************************************************************************
// *** COURSE MATERIALS FUNCTIONS ***
// *************************************************************************

// Load course materials
async function loadCourseMaterials(courseId) {
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) return [];
    
    try {
        const { data: materials, error } = await supabaseClient
            .from('course_materials')
            .select('*')
            .eq('course_id', courseId)
            .order('uploaded_at', { ascending: false });

        if (error) throw error;

        return materials || [];
    } catch (error) {
        console.error("Error loading course materials:", error);
        return [];
    }
}

// Get recent course materials (last 7 days)
async function getRecentCourseMaterials(days = 7) {
    const userProfile = getUserProfile();
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) return [];
    
    const program = userProfile?.program || userProfile?.department;
    const block = userProfile?.block;
    const intakeYear = userProfile?.intake_year;

    if (!program || !block || !intakeYear) return [];

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    try {
        // First get courses for this student
        const { data: courses, error: coursesError } = await supabaseClient
            .from('courses')
            .select('id')
            .eq('program_type', program)
            .eq('block', block)
            .eq('intake_year', intakeYear);

        if (coursesError) throw coursesError;

        const courseIds = courses.map(c => c.id);
        
        if (courseIds.length === 0) return [];

        // Then get recent materials for these courses
        const { data: materials, error: materialsError } = await supabaseClient
            .from('course_materials')
            .select('*')
            .in('course_id', courseIds)
            .gte('uploaded_at', cutoffDate.toISOString())
            .order('uploaded_at', { ascending: false });

        if (materialsError) throw materialsError;

        return materials || [];
    } catch (error) {
        console.error("Error loading recent course materials:", error);
        return [];
    }
}

// *************************************************************************
// *** COURSE ASSIGNMENTS FUNCTIONS ***
// *************************************************************************

// Load course assignments
async function loadCourseAssignments(courseId) {
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) return [];
    
    try {
        const { data: assignments, error } = await supabaseClient
            .from('assignments')
            .select('*')
            .eq('course_id', courseId)
            .eq('is_active', true)
            .order('due_date', { ascending: true });

        if (error) throw error;

        return assignments || [];
    } catch (error) {
        console.error("Error loading course assignments:", error);
        return [];
    }
}

// Get upcoming assignments
async function getUpcomingAssignments() {
    const userProfile = getUserProfile();
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) return [];
    
    const program = userProfile?.program || userProfile?.department;
    const block = userProfile?.block;
    const intakeYear = userProfile?.intake_year;

    if (!program || !block || !intakeYear) return [];

    const now = new Date();
    const oneWeekFromNow = new Date(now);
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

    try {
        // First get courses for this student
        const { data: courses, error: coursesError } = await supabaseClient
            .from('courses')
            .select('id, course_name')
            .eq('program_type', program)
            .eq('block', block)
            .eq('intake_year', intakeYear);

        if (coursesError) throw coursesError;

        const courseIds = courses.map(c => c.id);
        
        if (courseIds.length === 0) return [];

        // Then get upcoming assignments for these courses
        const { data: assignments, error: assignmentsError } = await supabaseClient
            .from('assignments')
            .select('*')
            .in('course_id', courseIds)
            .eq('is_active', true)
            .gte('due_date', now.toISOString())
            .lte('due_date', oneWeekFromNow.toISOString())
            .order('due_date', { ascending: true });

        if (assignmentsError) throw assignmentsError;

        // Map assignments with course names
        return assignments.map(assignment => {
            const course = courses.find(c => c.id === assignment.course_id);
            return {
                ...assignment,
                course_name: course?.course_name || 'Unknown Course'
            };
        });
    } catch (error) {
        console.error("Error loading upcoming assignments:", error);
        return [];
    }
}

// *************************************************************************
// *** COURSE GRADES FUNCTIONS ***
// *************************************************************************

// Load course grades
async function loadCourseGrades(courseId) {
    const userId = getCurrentUserId();
    const supabaseClient = getSupabaseClient();
    if (!userId || !supabaseClient) return [];

    try {
        const { data: grades, error } = await supabaseClient
            .from('exam_grades')
            .select('*')
            .eq('student_id', userId)
            .eq('course_id', courseId)
            .order('graded_at', { ascending: false });

        if (error) throw error;

        return grades || [];
    } catch (error) {
        console.error("Error loading course grades:", error);
        return [];
    }
}

// Calculate course average grade
async function calculateCourseAverage(courseId) {
    const grades = await loadCourseGrades(courseId);
    
    if (grades.length === 0) return null;
    
    const total = grades.reduce((sum, grade) => {
        return sum + (grade.total_score || 0);
    }, 0);
    
    return (total / grades.length).toFixed(1);
}

// *************************************************************************
// *** COURSE ATTENDANCE FUNCTIONS ***
// *************************************************************************

// Load course attendance
async function loadCourseAttendance(courseId) {
    const userId = getCurrentUserId();
    const supabaseClient = getSupabaseClient();
    if (!userId || !supabaseClient) return [];

    try {
        const { data: attendance, error } = await supabaseClient
            .from('geo_attendance_logs')
            .select('*')
            .eq('student_id', userId)
            .eq('course_id', courseId)
            .order('check_in_time', { ascending: false });

        if (error) throw error;

        return attendance || [];
    } catch (error) {
        console.error("Error loading course attendance:", error);
        return [];
    }
}

// Calculate course attendance rate
async function calculateCourseAttendanceRate(courseId) {
    const attendance = await loadCourseAttendance(courseId);
    
    if (attendance.length === 0) return 0;
    
    const verified = attendance.filter(a => a.is_verified === true).length;
    return Math.round((verified / attendance.length) * 100);
}

// *************************************************************************
// *** COURSE ANALYTICS FUNCTIONS ***
// *************************************************************************

// Get course performance analytics
async function getCourseAnalytics(courseId) {
    const [grades, attendance, assignments] = await Promise.all([
        loadCourseGrades(courseId),
        loadCourseAttendance(courseId),
        loadCourseAssignments(courseId)
    ]);
    
    const averageGrade = await calculateCourseAverage(courseId);
    const attendanceRate = await calculateCourseAttendanceRate(courseId);
    
    const completedAssignments = assignments.filter(a => 
        a.status === 'Submitted' || a.status === 'Graded'
    ).length;
    
    const assignmentCompletionRate = assignments.length > 0 
        ? Math.round((completedAssignments / assignments.length) * 100)
        : 0;
    
    return {
        averageGrade,
        attendanceRate,
        assignmentCompletionRate,
        totalAssignments: assignments.length,
        completedAssignments,
        totalGrades: grades.length,
        totalAttendance: attendance.length,
        verifiedAttendance: attendance.filter(a => a.is_verified).length
    };
}

// *************************************************************************
// *** COURSE EXPORT FUNCTIONS ***
// *************************************************************************

// Export course data to CSV
function exportCourseDataToCSV() {
    if (cachedCourses.length === 0) {
        AppUtils.showToast('No course data to export', 'warning');
        return;
    }
    
    const csvContent = [
        ['Course Name', 'Unit Code', 'Description', 'Status', 'Program', 'Block', 'Intake Year'],
        ...cachedCourses.map(course => [
            course.course_name || '',
            course.unit_code || '',
            course.description || '',
            course.status || '',
            course.program_type || '',
            course.block || '',
            course.intake_year || ''
        ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `courses-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    AppUtils.showToast('Course data exported successfully', 'success');
}

// Export course schedule to ICS
async function exportCourseScheduleToICS() {
    const schedule = await loadCourseSchedule();
    
    if (schedule.length === 0) {
        AppUtils.showToast('No schedule data to export', 'warning');
        return;
    }
    
    let icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//NCHSM//Course Schedule//EN',
        'CALSCALE:GREGORIAN'
    ];
    
    schedule.forEach((session, index) => {
        // Create a sample date for the event (using next occurrence of the day)
        const now = new Date();
        const daysUntilNextSession = (session.day_of_week_number - now.getDay() + 7) % 7;
        const eventDate = new Date(now);
        eventDate.setDate(eventDate.getDate() + daysUntilNextSession);
        
        const startTime = session.start_time || '09:00:00';
        const endTime = session.end_time || '10:00:00';
        
        const startDateTime = `${eventDate.toISOString().split('T')[0]}T${startTime.replace(':', '')}00`;
        const endDateTime = `${eventDate.toISOString().split('T')[0]}T${endTime.replace(':', '')}00`;
        
        icsContent.push(
            'BEGIN:VEVENT',
            `UID:${index}@nchsm.ac.ke`,
            `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
            `DTSTART:${startDateTime}`,
            `DTEND:${endDateTime}`,
            `SUMMARY:${session.course_name || 'Course Session'}`,
            `DESCRIPTION:${session.description || ''}`,
            `LOCATION:${session.venue || 'NCHSM Campus'}`,
            'END:VEVENT'
        );
    });
    
    icsContent.push('END:VCALENDAR');
    
    const blob = new Blob([icsContent.join('\n')], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `course-schedule-${new Date().toISOString().split('T')[0]}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    AppUtils.showToast('Course schedule exported successfully', 'success');
}

// *************************************************************************
// *** INITIALIZATION AND GLOBAL EXPORTS ***
// *************************************************************************

// Initialize courses module
function initializeCoursesModule() {
    console.log('📚 Initializing Courses Module...');
    
    // Set up event listeners for courses tab
    const coursesTab = document.querySelector('.nav a[data-tab="courses"]');
    if (coursesTab) {
        coursesTab.addEventListener('click', () => {
            if (getCurrentUserId()) {
                loadCourses();
            }
        });
    }
    
    // Set up refresh button (if exists)
    const refreshBtn = document.getElementById('refresh-courses-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshCourses);
    }
    
    // Set up export button (if exists)
    const exportBtn = document.getElementById('export-courses-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportCourseDataToCSV);
    }
    
    // Set up schedule export button (if exists)
    const exportScheduleBtn = document.getElementById('export-schedule-btn');
    if (exportScheduleBtn) {
        exportScheduleBtn.addEventListener('click', exportCourseScheduleToICS);
    }
    
    console.log('✅ Courses Module initialized');
}

// Make functions globally available
window.loadCourses = loadCourses;
window.loadClassTargets = loadClassTargets;
window.loadCoursesMetrics = loadCoursesMetrics;
window.refreshCourses = refreshCourses;
window.getCourseById = getCourseById;
window.getCourseByName = getCourseByName;
window.filterCoursesByProgram = filterCoursesByProgram;
window.filterCoursesByBlock = filterCoursesByBlock;
window.getActiveCourses = getActiveCourses;
window.getCourseStatistics = getCourseStatistics;
window.loadCourseSchedule = loadCourseSchedule;
window.getTodaysCourses = getTodaysCourses;
window.getUpcomingCourses = getUpcomingCourses;
window.loadCourseMaterials = loadCourseMaterials;
window.getRecentCourseMaterials = getRecentCourseMaterials;
window.loadCourseAssignments = loadCourseAssignments;
window.getUpcomingAssignments = getUpcomingAssignments;
window.loadCourseGrades = loadCourseGrades;
window.calculateCourseAverage = calculateCourseAverage;
window.loadCourseAttendance = loadCourseAttendance;
window.calculateCourseAttendanceRate = calculateCourseAttendanceRate;
window.getCourseAnalytics = getCourseAnalytics;
window.exportCourseDataToCSV = exportCourseDataToCSV;
window.exportCourseScheduleToICS = exportCourseScheduleToICS;
window.initializeCoursesModule = initializeCoursesModule;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCoursesModule);
} else {
    initializeCoursesModule();
}
