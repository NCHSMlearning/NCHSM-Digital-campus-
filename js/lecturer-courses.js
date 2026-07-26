// ============================================================
// LECTURER COURSES MODULE
// ============================================================

// ============================================================
// GET LECTURER ID - DYNAMIC FROM SESSION
// ============================================================

function getCurrentLecturerId() {
    // Try multiple sources in order
    const sources = [
        // Session storage
        () => sessionStorage.getItem('lecturerId'),
        () => sessionStorage.getItem('userId'),
        // Local storage
        () => localStorage.getItem('lecturerId'),
        () => localStorage.getItem('userId'),
        // Lecturer session object
        () => {
            try {
                const session = JSON.parse(sessionStorage.getItem('lecturerSession') || '{}');
                return session.id || session.lecturer_id || session.userId;
            } catch { return null; }
        },
        () => {
            try {
                const session = JSON.parse(localStorage.getItem('lecturerSession') || '{}');
                return session.id || session.lecturer_id || session.userId;
            } catch { return null; }
        },
        // Global variables
        () => window.currentLecturerId,
        () => window.me_currentLecturer?.profile?.id,
        () => window.me_currentLecturer?.staff?.id,
        // URL parameter (for debugging)
        () => new URLSearchParams(window.location.search).get('lecturerId'),
        () => new URLSearchParams(window.location.search).get('userId')
    ];
    
    for (const source of sources) {
        try {
            const value = source();
            if (value && typeof value === 'string' && value.length > 5) {
                console.log('✅ Found lecturer ID from source:', value.substring(0, 10) + '...');
                return value;
            }
        } catch (e) {
            // Continue to next source
        }
    }
    
    console.error('❌ No lecturer ID found in any session source');
    showNotification('Please log in again', 'error');
    return null;
}

// ============================================================
// GET LECTURER NAME - DYNAMIC FROM SESSION
// ============================================================

function getCurrentLecturerName() {
    const sources = [
        () => sessionStorage.getItem('lecturerName'),
        () => localStorage.getItem('lecturerName'),
        () => {
            try {
                const session = JSON.parse(sessionStorage.getItem('lecturerSession') || '{}');
                return session.name || session.full_name || session.lecturer_name;
            } catch { return null; }
        },
        () => {
            try {
                const session = JSON.parse(localStorage.getItem('lecturerSession') || '{}');
                return session.name || session.full_name || session.lecturer_name;
            } catch { return null; }
        },
        () => window.me_currentLecturer?.profile?.name,
        () => window.me_currentLecturer?.profile?.full_name,
        () => window.me_currentLecturer?.staff?.name,
        () => window.me_currentLecturer?.staff?.full_name
    ];
    
    for (const source of sources) {
        try {
            const value = source();
            if (value) return value;
        } catch (e) {}
    }
    return 'Lecturer';
}

// ============================================================
// GET LECTURER ASSIGNED UNITS - FIXED
// ============================================================

async function getLecturerAssignedUnits(lecturerId = null, block = null) {
    // If no ID provided, get from session
    if (!lecturerId) {
        lecturerId = getCurrentLecturerId();
    }
    
    if (!lecturerId) {
        console.error('❌ No lecturer ID available');
        return [];
    }
    
    console.log('📚 Getting assigned units for lecturer:', lecturerId);
    
    try {
        let query = sb
            .from('lecturer_subject_assignments')
            .select('subject_name, subject_code, block, program, academic_year')
            .eq('lecturer_id', String(lecturerId));
        
        if (block) {
            query = query.eq('block', block);
        }
        
        const { data, error } = await query;
        
        if (error) {
            console.error('❌ Error getting assigned units:', error);
            return [];
        }
        
        console.log(`📚 Found ${data?.length || 0} assigned units`);
        return data || [];
        
    } catch (error) {
        console.error('❌ Error getting assigned units:', error);
        return [];
    }
}

// ============================================================
// LOAD COURSES - DYNAMIC
// ============================================================

async function loadCourses() {
    console.log('📚 Loading courses...');
    
    try {
        // Get lecturer ID from session
        const lecturerId = getCurrentLecturerId();
        
        if (!lecturerId) {
            console.error('❌ No lecturer ID found');
            document.getElementById('courseStats')?.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle"></i>
                    Please log in again to view your courses.
                </div>
            `;
            return;
        }
        
        console.log('🔍 Fetching all assigned units for lecturer:', lecturerId);
        
        const assignments = await getLecturerAssignedUnits(lecturerId);
        
        console.log('📊 All assignments found:', assignments.length);
        
        if (!assignments || assignments.length === 0) {
            console.log('No assignments found for lecturer');
            document.getElementById('courseStats')?.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-info-circle"></i>
                    No units assigned to you yet.
                    <br><small>Please contact the administrator for unit assignments.</small>
                </div>
            `;
            
            document.getElementById('courseList')?.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-book-open"></i>
                    <h3>No Units Assigned</h3>
                    <p>You haven't been assigned to any units.</p>
                </div>
            `;
            
            updateStats(assignments);
            return;
        }
        
        // Render assignments
        renderAssignments(assignments);
        updateStats(assignments);
        
        console.log('✅ Courses loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading courses:', error);
        showNotification('Error loading courses: ' + error.message, 'error');
    }
}

// ============================================================
// RENDER ASSIGNMENTS
// ============================================================

function renderAssignments(assignments) {
    const container = document.getElementById('courseList');
    if (!container) return;
    
    if (!assignments || assignments.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-book-open"></i>
                <h3>No Units Assigned</h3>
                <p>You haven't been assigned to any units yet.</p>
                <p class="text-muted">Please contact the administrator for unit assignments.</p>
            </div>
        `;
        return;
    }
    
    let html = `<div class="course-grid">`;
    
    assignments.forEach((assignment, index) => {
        const subjectName = assignment.subject_name || 'Unnamed Unit';
        const subjectCode = assignment.subject_code || 'N/A';
        const block = assignment.block || 'N/A';
        const program = assignment.program || 'N/A';
        const academicYear = assignment.academic_year || '2025';
        
        html += `
            <div class="course-card">
                <div class="course-header">
                    <span class="course-number">${index + 1}</span>
                    <span class="course-badge">${academicYear}</span>
                </div>
                <div class="course-body">
                    <h4 class="course-title">${subjectName}</h4>
                    <div class="course-meta">
                        <span class="meta-item"><i class="fas fa-code"></i> ${subjectCode}</span>
                        <span class="meta-item"><i class="fas fa-layer-group"></i> ${block}</span>
                        <span class="meta-item"><i class="fas fa-graduation-cap"></i> ${program}</span>
                    </div>
                </div>
                <div class="course-actions">
                    <button onclick="openUnitMarks('${subjectName}', '${block}', '${program}', '${academicYear}')" 
                            class="btn btn-primary btn-sm">
                        <i class="fas fa-pen-alt"></i> Enter Marks
                    </button>
                    <button onclick="viewUnitStudents('${subjectName}', '${block}')" 
                            class="btn btn-secondary btn-sm">
                        <i class="fas fa-users"></i> Students
                    </button>
                </div>
            </div>
        `;
    });
    
    html += `</div>`;
    container.innerHTML = html;
}

// ============================================================
// UPDATE STATS
// ============================================================

function updateStats(assignments) {
    const statsContainer = document.getElementById('courseStats');
    if (!statsContainer) return;
    
    const total = assignments?.length || 0;
    const active = assignments?.filter(a => a.academic_year === '2026').length || 0;
    const completed = assignments?.filter(a => a.academic_year < '2026').length || 0;
    
    statsContainer.innerHTML = `
        <div class="stats-grid">
            <div class="stat-item">
                <span class="stat-number">${total}</span>
                <span class="stat-label">Total Units</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">${active}</span>
                <span class="stat-label">Active (2026)</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">${completed}</span>
                <span class="stat-label">Completed</span>
            </div>
        </div>
    `;
}

// ============================================================
// OPEN UNIT MARKS
// ============================================================

function openUnitMarks(subjectName, block, program, academicYear) {
    console.log('📝 Opening marks for:', subjectName);
    
    // Save current context
    sessionStorage.setItem('currentSubject', subjectName);
    sessionStorage.setItem('currentBlock', block);
    sessionStorage.setItem('currentProgram', program);
    sessionStorage.setItem('currentAcademicYear', academicYear);
    
    // Redirect to marks entry page or open modal
    if (typeof loadMarksEntry === 'function') {
        // If marks module is loaded
        document.getElementById('me_subject_select')?.value = subjectName;
        document.getElementById('me_block_select')?.value = block;
        document.getElementById('me_program_select')?.value = program;
        document.getElementById('me_year_select')?.value = academicYear;
        loadMarksEntry();
    } else {
        // Redirect to marks page
        window.location.href = `lecturer-marks.html?unit=${encodeURIComponent(subjectName)}&block=${encodeURIComponent(block)}`;
    }
}

// ============================================================
// VIEW UNIT STUDENTS
// ============================================================

async function viewUnitStudents(subjectName, block) {
    console.log('👥 Viewing students for:', subjectName);
    
    try {
        const { data: students, error } = await sb
            .from('consolidated_user_profiles_table')
            .select('student_id, full_name, admission_number')
            .eq('block', block)
            .eq('role', 'student');
        
        if (error) throw error;
        
        if (!students || students.length === 0) {
            showNotification('No students found in this block', 'warning');
            return;
        }
        
        // Show in modal or alert
        const studentList = students.map((s, i) => 
            `${i + 1}. ${s.full_name || 'N/A'} (${s.admission_number || s.student_id || 'N/A'})`
        ).join('\n');
        
        alert(`📚 Students in ${subjectName}\n\n${studentList}\n\nTotal: ${students.length} students`);
        
    } catch (error) {
        console.error('Error loading students:', error);
        showNotification('Error loading students: ' + error.message, 'error');
    }
}

// ============================================================
// REFRESH
// ============================================================

async function refresh() {
    console.log('🔄 Refreshing courses...');
    showNotification('Refreshing courses...', 'info');
    await loadCourses();
    showNotification('✅ Courses refreshed!', 'success');
}

// ============================================================
// SETUP EVENT LISTENERS
// ============================================================

function setupEventListeners() {
    // Refresh button
    document.getElementById('refreshBtn')?.addEventListener('click', refresh);
    
    // Auto-refresh on visibility change (optional)
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            // Refresh when tab becomes visible again (optional)
            // loadCourses();
        }
    });
}

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Lecturer Courses Module initializing...');
    console.log('📧 Session check...');
    
    const lecturerId = getCurrentLecturerId();
    
    if (!lecturerId) {
        console.warn('⚠️ No lecturer ID found. Please log in.');
        document.getElementById('courseList')?.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle"></i>
                <strong>Not logged in.</strong>
                <p>Please log in to view your assigned units.</p>
                <button onclick="location.reload()" class="btn btn-primary">
                    <i class="fas fa-sync-alt"></i> Retry
                </button>
            </div>
        `;
        return;
    }
    
    console.log('✅ Lecturer ID found:', lecturerId.substring(0, 10) + '...');
    
    // Load courses
    loadCourses();
    setupEventListeners();
    
    console.log('✅ Lecturer Courses Module initialized');
});

// ============================================================
// EXPOSE GLOBAL FUNCTIONS
// ============================================================

window.getCurrentLecturerId = getCurrentLecturerId;
window.getCurrentLecturerName = getCurrentLecturerName;
window.getLecturerAssignedUnits = getLecturerAssignedUnits;
window.loadCourses = loadCourses;
window.refresh = refresh;
window.openUnitMarks = openUnitMarks;
window.viewUnitStudents = viewUnitStudents;
window.renderAssignments = renderAssignments;
window.updateStats = updateStats;

console.log('✅ Lecturer Courses Module loaded successfully!');
console.log('✅ NO hardcoded IDs - all dynamic from session');
