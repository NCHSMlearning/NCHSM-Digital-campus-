// dashboard.js - Dashboard functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize dashboard if we're on the dashboard tab
    if (document.getElementById('dashboard').classList.contains('active')) {
        loadDashboard();
    }
    
    // Setup dashboard card click events
    setupDashboardEvents();
});

// Global function to load dashboard
window.loadDashboard = async function() {
    try {
        console.log('Loading dashboard data...');
        
        // Show loading state
        document.getElementById('dashboard-attendance-rate').textContent = '...';
        document.getElementById('dashboard-upcoming-exam').textContent = 'Loading...';
        document.getElementById('dashboard-active-courses').textContent = '0';
        document.getElementById('dashboard-new-resources').textContent = '0';
        
        // Load user data first
        await loadUserWelcome();
        
        // Load all dashboard data in parallel
        await Promise.all([
            loadAttendanceStats(),
            loadUpcomingExams(),
            loadCourseCount(),
            loadNewResourcesCount(),
            loadAnnouncements(),
            loadNurseIQStats(),
            checkMissingPassport()
        ]);
        
        // Update time display
        updateDateTime();
        setInterval(updateDateTime, 60000); // Update every minute
        
        console.log('Dashboard loaded successfully');
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showToast('Failed to load dashboard data', 'error');
    }
};

// Setup dashboard event listeners
function setupDashboardEvents() {
    // Dashboard card clicks
    document.querySelectorAll('.card[data-tab]').forEach(card => {
        card.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            if (typeof showTab === 'function') {
                showTab(tabId);
            }
        });
    });
    
    // Action card buttons
    document.querySelectorAll('.profile-button[data-tab]').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent card click
            const tabId = this.getAttribute('data-tab');
            if (typeof showTab === 'function') {
                showTab(tabId);
            }
        });
    });
}

// Load user welcome message
async function loadUserWelcome() {
    try {
        const user = await db.getCurrentUserProfile();
        if (user) {
            const welcomeHeader = document.getElementById('welcome-header');
            const welcomeMessage = document.getElementById('student-welcome-message');
            
            if (welcomeHeader) {
                welcomeHeader.textContent = `Welcome back, ${user.full_name || 'Student'}!`;
            }
            
            if (welcomeMessage) {
                const now = new Date();
                const hour = now.getHours();
                let greeting = 'Good Day';
                
                if (hour < 12) greeting = 'Good Morning';
                else if (hour < 18) greeting = 'Good Afternoon';
                else greeting = 'Good Evening';
                
                welcomeMessage.textContent = `${greeting}! Access your courses, schedule, and check your attendance status.`;
            }
            
            // Update profile photo in header if available
            if (user.passport_photo_url) {
                const headerPhoto = document.getElementById('header-passport-preview');
                if (headerPhoto) {
                    headerPhoto.src = user.passport_photo_url;
                }
            }
        }
    } catch (error) {
        console.error('Error loading user welcome:', error);
    }
}

// Load attendance statistics
async function loadAttendanceStats() {
    try {
        const attendance = await db.getAttendanceStats();
        const rateElement = document.getElementById('dashboard-attendance-rate');
        const verifiedElement = document.getElementById('dashboard-verified-count');
        const totalElement = document.getElementById('dashboard-total-count');
        const pendingElement = document.getElementById('dashboard-pending-count');
        
        if (rateElement && attendance) {
            const attendanceRate = attendance.attendance_rate || 0;
            rateElement.textContent = `${attendanceRate}%`;
            
            // Color code based on rate
            if (attendanceRate >= 80) {
                rateElement.style.color = 'var(--color-success)';
            } else if (attendanceRate >= 60) {
                rateElement.style.color = 'var(--color-warning)';
            } else {
                rateElement.style.color = 'var(--color-alert)';
            }
        }
        
        if (verifiedElement) verifiedElement.textContent = attendance?.verified_checkins || '0';
        if (totalElement) totalElement.textContent = attendance?.total_checkins || '0';
        if (pendingElement) pendingElement.textContent = attendance?.pending_checkins || '0';
        
    } catch (error) {
        console.error('Error loading attendance stats:', error);
    }
}

// Load upcoming exams
async function loadUpcomingExams() {
    try {
        const exams = await db.getUpcomingExams();
        const upcomingElement = document.getElementById('dashboard-upcoming-exam');
        
        if (upcomingElement && exams && exams.length > 0) {
            const nextExam = exams[0]; // Get the closest exam
            const examDate = new Date(nextExam.exam_date);
            const today = new Date();
            const diffTime = examDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays <= 0) {
                upcomingElement.textContent = 'Today';
                upcomingElement.style.color = 'var(--color-alert)';
            } else if (diffDays <= 7) {
                upcomingElement.textContent = `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
                upcomingElement.style.color = '#F97316'; // Orange
            } else {
                upcomingElement.textContent = examDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                });
                upcomingElement.style.color = '#F97316';
            }
        } else {
            upcomingElement.textContent = 'No upcoming exams';
            upcomingElement.style.color = '#6B7280';
        }
        
    } catch (error) {
        console.error('Error loading upcoming exams:', error);
        document.getElementById('dashboard-upcoming-exam').textContent = 'Error loading';
    }
}

// Load course count
async function loadCourseCount() {
    try {
        const courses = await db.getCourses();
        const coursesElement = document.getElementById('dashboard-active-courses');
        
        if (coursesElement && courses) {
            const activeCourses = courses.filter(course => 
                course.status === 'Active' || course.status === 'In Progress'
            );
            coursesElement.textContent = activeCourses.length.toString();
        }
        
    } catch (error) {
        console.error('Error loading course count:', error);
    }
}

// Load new resources count (last 7 days)
async function loadNewResourcesCount() {
    try {
        const resources = await db.getResources();
        const resourcesElement = document.getElementById('dashboard-new-resources');
        
        if (resourcesElement && resources) {
            const now = new Date();
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            
            const newResources = resources.filter(resource => {
                const resourceDate = new Date(resource.created_at);
                return resourceDate >= sevenDaysAgo;
            });
            
            resourcesElement.textContent = newResources.length.toString();
        }
        
    } catch (error) {
        console.error('Error loading resources count:', error);
    }
}

// Load announcements
async function loadAnnouncements() {
    try {
        const announcements = await db.getAnnouncements();
        const announcementElement = document.getElementById('student-announcement');
        const announcementCard = document.getElementById('latest-announcement-card');
        
        if (announcements && announcements.length > 0) {
            const latestAnnouncement = announcements[0];
            
            // Update banner
            if (announcementElement) {
                announcementElement.textContent = latestAnnouncement.message;
            }
            
            // Update announcement card
            if (announcementCard) {
                announcementCard.style.display = 'block';
                document.getElementById('announcement-title').textContent = latestAnnouncement.title;
                document.getElementById('announcement-body').textContent = 
                    latestAnnouncement.message.length > 150 
                    ? latestAnnouncement.message.substring(0, 150) + '...'
                    : latestAnnouncement.message;
                
                const date = new Date(latestAnnouncement.created_at);
                document.getElementById('announcement-date').textContent = 
                    date.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                    });
                
                document.getElementById('announcement-status').textContent = 
                    latestAnnouncement.priority || 'General';
                document.getElementById('announcement-status').style.color = 
                    latestAnnouncement.priority === 'Urgent' ? 'var(--color-alert)' : 
                    latestAnnouncement.priority === 'High' ? 'var(--color-warning)' : 
                    'var(--color-primary)';
            }
        }
        
    } catch (error) {
        console.error('Error loading announcements:', error);
    }
}

// Load NurseIQ statistics
async function loadNurseIQStats() {
    try {
        const stats = await db.getNurseIQStats();
        const progressElement = document.getElementById('dashboard-nurseiq-progress');
        const accuracyElement = document.getElementById('dashboard-nurseiq-accuracy');
        const questionsElement = document.getElementById('dashboard-nurseiq-questions');
        const actionCard = document.getElementById('nurseiq-action-card');
        const badgeElement = document.getElementById('nurseiqBadge');
        
        if (stats) {
            // Update progress
            if (progressElement) {
                const progress = stats.progress || 0;
                progressElement.textContent = `${progress}%`;
                progressElement.style.color = progress >= 70 ? 'var(--color-success)' : 
                                            progress >= 40 ? 'var(--color-warning)' : 
                                            'var(--color-alert)';
            }
            
            // Update accuracy
            if (accuracyElement) {
                const accuracy = stats.accuracy || 0;
                accuracyElement.textContent = `${accuracy}%`;
            }
            
            // Update questions count
            if (questionsElement) {
                questionsElement.textContent = stats.questions_completed || '0';
            }
            
            // Update badge
            if (badgeElement && stats.pending_practice) {
                badgeElement.textContent = stats.pending_practice;
                badgeElement.style.display = 'inline-block';
            }
            
            // Show action card if needed
            if (actionCard) {
                if (stats.progress < 50 || stats.accuracy < 60) {
                    actionCard.style.display = 'block';
                    const messageElement = document.getElementById('nurseiq-action-message');
                    if (messageElement) {
                        if (stats.progress < 30) {
                            messageElement.textContent = 'Start your NurseIQ practice to build your knowledge base.';
                        } else if (stats.accuracy < 60) {
                            messageElement.textContent = 'Improve your accuracy by practicing more questions.';
                        } else {
                            messageElement.textContent = 'Complete your NurseIQ assessments to improve your scores.';
                        }
                    }
                }
            }
        }
        
    } catch (error) {
        console.error('Error loading NurseIQ stats:', error);
    }
}

// Check for missing passport photo
async function checkMissingPassport() {
    try {
        const user = await db.getCurrentUserProfile();
        const passportCard = document.getElementById('action-passport');
        
        if (passportCard && user && !user.passport_photo_url) {
            passportCard.style.display = 'block';
        }
        
    } catch (error) {
        console.error('Error checking passport:', error);
    }
}

// Update date and time display
function updateDateTime() {
    const dateTimeElement = document.getElementById('currentDateTime');
    if (!dateTimeElement) return;
    
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    };
    
    dateTimeElement.textContent = now.toLocaleDateString('en-US', options);
}

// Toast notification function (if not already defined)
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) {
        // Create toast if it doesn't exist
        const toastDiv = document.createElement('div');
        toastDiv.className = `toast ${type}`;
        toastDiv.textContent = message;
        toastDiv.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(toastDiv);
        
        setTimeout(() => {
            toastDiv.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toastDiv.remove(), 300);
        }, 3000);
        return;
    }
    
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// Add CSS for toast animations
if (!document.querySelector('style[data-toast-styles]')) {
    const style = document.createElement('style');
    style.setAttribute('data-toast-styles', 'true');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// Export functions to global scope
window.loadDashboard = loadDashboard;
window.loadUserWelcome = loadUserWelcome;
window.loadAttendanceStats = loadAttendanceStats;
window.loadUpcomingExams = loadUpcomingExams;
window.loadCourseCount = loadCourseCount;
window.loadNewResourcesCount = loadNewResourcesCount;
window.loadAnnouncements = loadAnnouncements;
window.loadNurseIQStats = loadNurseIQStats;
window.checkMissingPassport = checkMissingPassport;
window.updateDateTime = updateDateTime;
