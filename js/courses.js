// courses.js - Courses Management for NCHSM Digital Student Dashboard (Updated for new UI)

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
let currentFilter = 'all';

// Load all courses for the current student
async function loadAllCourses() {
    const userProfile = getUserProfile();
    const userId = getCurrentUserId();
    
    // Get Supabase client safely
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) {
        console.error('❌ No Supabase client');
        return [];
    }
    
    const program = userProfile?.program;
    const department = userProfile?.department;
    const block = userProfile?.block;
    const intakeYear = userProfile?.intake_year;

    if ((!program && !department) || !intakeYear) {
        console.error('❌ Missing program/department or intake year info');
        return [];
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

        console.log('📚 Loading courses with:', {
            program,
            department,
            block,
            intakeYear,
            programFilter,
            blockFilter
        });

        const { data: courses, error } = await supabaseClient
            .from('courses')
            .select('*')
            .or(programFilter)
            .eq('intake_year', intakeYear)
            .or(blockFilter)
            .order('course_name', { ascending: true });

        if (error) throw error;

        return courses || [];
    } catch (error) {
        console.error("❌ Failed to load courses:", error);
        return [];
    }
}

// Load and display courses based on filter
async function loadCourses() {
    console.log('📚 loadCourses called with filter:', currentFilter);
    
    // Show loading states
    showLoadingState('current');
    showLoadingState('completed');
    
    try {
        // Load all courses
        cachedCourses = await loadAllCourses();
        console.log(`✅ Loaded ${cachedCourses.length} total courses`);
        
        if (cachedCourses.length === 0) {
            showEmptyState('current');
            showEmptyState('completed');
            updateHeaderStats(0, 0, 0);
            return;
        }
        
        // Split courses into current and completed
        const currentCourses = cachedCourses.filter(course => 
            course.status !== 'Completed' && course.status !== 'Passed'
        );
        
        const completedCourses = cachedCourses.filter(course => 
            course.status === 'Completed' || course.status === 'Passed'
        );
        
        console.log(`📊 Split: ${currentCourses.length} current, ${completedCourses.length} completed`);
        
        // Update header stats
        updateHeaderStats(cachedCourses.length, currentCourses.length, completedCourses.length);
        
        // Apply filter if needed
        let filteredCurrent = currentCourses;
        let filteredCompleted = completedCourses;
        
        if (currentFilter === 'active') {
            filteredCompleted = [];
        } else if (currentFilter === 'completed') {
            filteredCurrent = [];
        }
        
        // Display courses
        displayCurrentCourses(filteredCurrent);
        displayCompletedCourses(filteredCompleted);
        
        // Calculate and display academic summary
        calculateAcademicSummary(completedCourses);
        
    } catch (error) {
        console.error('❌ Error in loadCourses:', error);
        showErrorState('current', 'Failed to load courses');
        showErrorState('completed', 'Failed to load courses');
    }
}

// Display current courses in grid view
function displayCurrentCourses(courses) {
    const gridContainer = document.getElementById('current-courses-grid');
    const emptyState = document.getElementById('current-empty');
    
    if (!gridContainer) return;
    
    if (courses.length === 0) {
        gridContainer.innerHTML = '';
        showEmptyState('current');
        document.getElementById('current-count').textContent = '0 courses';
        return;
    }
    
    // Update count
    document.getElementById('current-count').textContent = `${courses.length} course${courses.length !== 1 ? 's' : ''}`;
    
    // Clear loading/empty states
    emptyState.style.display = 'none';
    
    // Generate course cards
    gridContainer.innerHTML = courses.map(course => `
        <div class="course-card" data-course-id="${course.id}">
            <div class="course-header">
                <span class="course-code">${escapeHtml(course.unit_code || 'N/A')}</span>
                <span class="status-badge ${getStatusClass(course.status)}">
                    ${escapeHtml(course.status || 'Active')}
                </span>
            </div>
            <h4 class="course-title">${escapeHtml(course.course_name || 'Unnamed Course')}</h4>
            <p class="course-description">${escapeHtml(truncateText(course.description || 'No description available', 120))}</p>
            <div class="course-footer">
                <div class="course-credits">
                    <i class="fas fa-star"></i>
                    <span>${course.credits || 3} Credits</span>
                </div>
                <div class="course-meta">
                    <span class="course-block">${escapeHtml(course.block || 'General')}</span>
                </div>
            </div>
            <div class="course-actions">
                <button class="btn btn-sm btn-outline view-materials" onclick="viewCourseMaterials('${course.id}')">
                    <i class="fas fa-file-alt"></i> Materials
                </button>
                <button class="btn btn-sm btn-primary view-schedule" onclick="viewCourseSchedule('${course.id}')">
                    <i class="fas fa-calendar"></i> Schedule
                </button>
            </div>
        </div>
    `).join('');
    
    hideEmptyState('current');
}

// Display completed courses in table view
function displayCompletedCourses(courses) {
    const tableBody = document.getElementById('completed-courses-table');
    const emptyState = document.getElementById('completed-empty');
    
    if (!tableBody) return;
    
    if (courses.length === 0) {
        tableBody.innerHTML = '';
        showEmptyState('completed');
        document.getElementById('completed-total-count').textContent = '0 courses';
        document.getElementById('completed-credits-total').textContent = '0 credits earned';
        return;
    }
    
    // Calculate total credits
    const totalCredits = courses.reduce((sum, course) => sum + (course.credits || 0), 0);
    
    // Update counts
    document.getElementById('completed-total-count').textContent = `${courses.length} course${courses.length !== 1 ? 's' : ''}`;
    document.getElementById('completed-credits-total').textContent = `${totalCredits} credit${totalCredits !== 1 ? 's' : ''} earned`;
    
    // Clear loading/empty states
    emptyState.style.display = 'none';
    
    // Generate table rows
    tableBody.innerHTML = courses.map(course => {
        // Simulate grade (in real app, this would come from grades table)
        const grade = getRandomGrade();
        const completionDate = getRandomCompletionDate();
        
        return `
            <tr>
                <td>${escapeHtml(course.course_name || 'Unnamed Course')}</td>
                <td><code>${escapeHtml(course.unit_code || 'N/A')}</code></td>
                <td class="grade-${grade}">${grade}</td>
                <td>${course.credits || 3}</td>
                <td>${escapeHtml(course.block || 'General')}</td>
                <td>
                    <span class="status-badge completed">
                        <i class="fas fa-check-circle"></i> Completed
                    </span>
                </td>
            </tr>
        `;
    }).join('');
    
    hideEmptyState('completed');
}

// Calculate and display academic summary
function calculateAcademicSummary(completedCourses) {
    if (completedCourses.length === 0) {
        // Reset all summary values
        document.getElementById('completed-gpa').textContent = '0.00';
        document.getElementById('highest-grade').textContent = '--';
        document.getElementById('average-grade').textContent = '--';
        document.getElementById('first-course-date').textContent = '--';
        document.getElementById('latest-course-date').textContent = '--';
        document.getElementById('completion-rate').textContent = '0%';
        return;
    }
    
    // Simulate GPA calculation (in real app, this would come from grades table)
    const gpa = (3.0 + Math.random() * 1.5).toFixed(2);
    document.getElementById('completed-gpa').textContent = gpa;
    
    // Get random grades for display
    const grades = ['A', 'B+', 'B', 'C+', 'C'];
    const randomGrade = grades[Math.floor(Math.random() * grades.length)];
    document.getElementById('highest-grade').textContent = randomGrade;
    document.getElementById('average-grade').textContent = randomGrade;
    
    // Get completion dates
    const dates = completedCourses
        .filter(c => c.completed_date)
        .map(c => new Date(c.completed_date))
        .sort((a, b) => a - b);
    
    if (dates.length > 0) {
        const firstDate = dates[0];
        const latestDate = dates[dates.length - 1];
        
        document.getElementById('first-course-date').textContent = 
            firstDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        document.getElementById('latest-course-date').textContent = 
            latestDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
    
    // Calculate completion rate
    const totalExpectedCourses = completedCourses.length + Math.floor(Math.random() * 5) + 3;
    const completionRate = Math.round((completedCourses.length / totalExpectedCourses) * 100);
    document.getElementById('completion-rate').textContent = `${completionRate}%`;
}

// Update header statistics
function updateHeaderStats(total, active, completed) {
    const totalElem = document.getElementById('total-courses');
    const activeElem = document.getElementById('active-courses-count');
    const completedElem = document.getElementById('completed-courses-count');
    const creditsElem = document.getElementById('total-credits');
    
    if (totalElem) totalElem.textContent = total;
    if (activeElem) activeElem.textContent = active;
    if (completedElem) completedElem.textContent = completed;
    
    // Calculate total credits (simplified - in real app, sum actual credits)
    if (creditsElem) {
        const totalCredits = Math.floor(total * 3); // Assuming 3 credits per course
        creditsElem.textContent = totalCredits;
    }
}

// Filter courses based on selection
function filterCourses(filterType) {
    currentFilter = filterType;
    
    // Update button states
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeBtn = document.getElementById(`view-${filterType}-only`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    } else if (filterType === 'all') {
        document.getElementById('view-all-courses')?.classList.add('active');
    }
    
    // Reload courses with new filter
    loadCourses();
}

// Switch to view only active courses
function switchToActiveCourses() {
    filterCourses('active');
    // Scroll to active section
    document.querySelector('.courses-section:first-child')?.scrollIntoView({ behavior: 'smooth' });
}

// Switch to view only completed courses
function switchToCompletedCourses() {
    filterCourses('completed');
    // Scroll to completed section
    document.querySelector('.completed-section')?.scrollIntoView({ behavior: 'smooth' });
}

// Switch to view all courses
function switchToAllCourses() {
    filterCourses('all');
}

// Refresh courses
function refreshCourses() {
    console.log('🔄 Refreshing courses...');
    loadCourses();
    AppUtils.showToast('Courses refreshed successfully', 'success');
}

// View course materials (placeholder)
function viewCourseMaterials(courseId) {
    const course = cachedCourses.find(c => c.id === courseId);
    if (course) {
        AppUtils.showToast(`Opening materials for ${course.course_name}`, 'info');
        // In real app, this would open a modal or navigate to materials page
    }
}

// View course schedule (placeholder)
function viewCourseSchedule(courseId) {
    const course = cachedCourses.find(c => c.id === courseId);
    if (course) {
        AppUtils.showToast(`Viewing schedule for ${course.course_name}`, 'info');
        // In real app, this would open a modal with schedule
    }
}

// Show loading state
function showLoadingState(section) {
    if (section === 'current') {
        const grid = document.getElementById('current-courses-grid');
        if (grid) {
            grid.innerHTML = `
                <div class="course-card loading">
                    <div class="loading-content">
                        <div class="loading-spinner"></div>
                        <p>Loading current courses...</p>
                    </div>
                </div>
            `;
        }
    } else if (section === 'completed') {
        const tableBody = document.getElementById('completed-courses-table');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr class="loading">
                    <td colspan="6">
                        <div class="loading-content">
                            <div class="loading-spinner"></div>
                            <p>Loading completed courses...</p>
                        </div>
                    </td>
                </tr>
            `;
        }
    }
}

// Show empty state
function showEmptyState(section) {
    if (section === 'current') {
        const emptyState = document.getElementById('current-empty');
        const grid = document.getElementById('current-courses-grid');
        if (emptyState) emptyState.style.display = 'block';
        if (grid) grid.innerHTML = '';
    } else if (section === 'completed') {
        const emptyState = document.getElementById('completed-empty');
        const tableBody = document.getElementById('completed-courses-table');
        if (emptyState) emptyState.style.display = 'block';
        if (tableBody) tableBody.innerHTML = '';
    }
}

// Hide empty state
function hideEmptyState(section) {
    if (section === 'current') {
        const emptyState = document.getElementById('current-empty');
        if (emptyState) emptyState.style.display = 'none';
    } else if (section === 'completed') {
        const emptyState = document.getElementById('completed-empty');
        if (emptyState) emptyState.style.display = 'none';
    }
}

// Show error state
function showErrorState(section, message) {
    if (section === 'current') {
        const grid = document.getElementById('current-courses-grid');
        if (grid) {
            grid.innerHTML = `
                <div class="course-card error">
                    <div class="error-content">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>${message}</p>
                        <button onclick="refreshCourses()" class="btn btn-sm btn-primary">
                            <i class="fas fa-redo"></i> Retry
                        </button>
                    </div>
                </div>
            `;
        }
    } else if (section === 'completed') {
        const tableBody = document.getElementById('completed-courses-table');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr class="error">
                    <td colspan="6">
                        <div class="error-content">
                            <i class="fas fa-exclamation-circle"></i>
                            <p>${message}</p>
                            <button onclick="refreshCourses()" class="btn btn-sm btn-primary">
                                <i class="fas fa-redo"></i> Retry
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }
    }
}

// Helper function to get status CSS class
function getStatusClass(status) {
    const statusMap = {
        'active': 'active',
        'Active': 'active',
        'in progress': 'active',
        'upcoming': 'upcoming',
        'completed': 'completed',
        'Completed': 'completed',
        'passed': 'completed',
        'Passed': 'completed'
    };
    return statusMap[status?.toLowerCase()] || 'active';
}

// Helper function to truncate text
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Helper function for random grade (for demo)
function getRandomGrade() {
    const grades = ['A', 'B+', 'B', 'C+', 'C', 'D+', 'D'];
    return grades[Math.floor(Math.random() * grades.length)];
}

// Helper function for random completion date (for demo)
function getRandomCompletionDate() {
    const now = new Date();
    const pastDate = new Date(now);
    pastDate.setMonth(pastDate.getMonth() - Math.floor(Math.random() * 12));
    return pastDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
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
// *** INITIALIZATION ***
// *************************************************************************

// Initialize courses module with new UI
function initializeCoursesModule() {
    console.log('📚 Initializing Courses Module with new UI...');
    
    // Set up event listeners for courses tab
    const coursesTab = document.querySelector('.nav a[data-tab="courses"]');
    if (coursesTab) {
        coursesTab.addEventListener('click', () => {
            console.log('📚 Courses tab clicked');
            if (getCurrentUserId()) {
                loadCourses();
            } else {
                console.log('⚠️ No user ID, waiting for login...');
            }
        });
    }
    
    // Set up quick action buttons
    const viewAllBtn = document.getElementById('view-all-courses');
    const viewActiveBtn = document.getElementById('view-active-only');
    const viewCompletedBtn = document.getElementById('view-completed-only');
    const refreshBtn = document.getElementById('refresh-courses-btn');
    
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', () => filterCourses('all'));
        viewAllBtn.classList.add('active'); // Default active
    }
    
    if (viewActiveBtn) {
        viewActiveBtn.addEventListener('click', () => filterCourses('active'));
    }
    
    if (viewCompletedBtn) {
        viewCompletedBtn.addEventListener('click', () => filterCourses('completed'));
    }
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshCourses);
    }
    
    // Set up empty state buttons
    const emptyViewActiveBtn = document.querySelector('#completed-empty .btn');
    if (emptyViewActiveBtn) {
        emptyViewActiveBtn.addEventListener('click', switchToActiveCourses);
    }
    
    console.log('✅ Courses Module initialized');
    
    // Load courses if user is already logged in
    if (getCurrentUserId()) {
        console.log('👤 User logged in, loading courses...');
        loadCourses();
    }
}

// *************************************************************************
// *** GLOBAL EXPORTS ***
// *************************************************************************

// Make functions globally available
window.loadCourses = loadCourses;
window.refreshCourses = refreshCourses;
window.switchToActiveCourses = switchToActiveCourses;
window.switchToCompletedCourses = switchToCompletedCourses;
window.switchToAllCourses = switchToAllCourses;
window.filterCourses = filterCourses;
window.viewCourseMaterials = viewCourseMaterials;
window.viewCourseSchedule = viewCourseSchedule;
window.initializeCoursesModule = initializeCoursesModule;

// Keep original functions for backward compatibility
window.loadClassTargets = async function() {
    console.log('⚠️ loadClassTargets called - using new courses system');
    await loadCourses();
    return cachedCourses;
};

window.loadCoursesMetrics = async function() {
    await loadCourses();
    return { 
        count: cachedCourses.length,
        active: cachedCourses.filter(c => c.status !== 'Completed' && c.status !== 'Passed').length,
        completed: cachedCourses.filter(c => c.status === 'Completed' || c.status === 'Passed').length
    };
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCoursesModule);
} else {
    initializeCoursesModule();
}
