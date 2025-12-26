// js/dashboard.js - Dashboard Management Module
class DashboardModule {
    constructor(supabaseClient) {
        this.sb = supabaseClient;
        this.userId = null;
        this.userProfile = null;
        
        // Dashboard elements
        this.welcomeHeader = document.getElementById('welcome-header');
        this.welcomeMessage = document.getElementById('student-welcome-message');
        this.studentAnnouncement = document.getElementById('student-announcement');
        
        // Stats elements
        this.dashboardAttendanceRate = document.getElementById('dashboard-attendance-rate');
        this.dashboardVerifiedCount = document.getElementById('dashboard-verified-count');
        this.dashboardTotalCount = document.getElementById('dashboard-total-count');
        this.dashboardPendingCount = document.getElementById('dashboard-pending-count');
        this.dashboardUpcomingExam = document.getElementById('dashboard-upcoming-exam');
        this.dashboardActiveCourses = document.getElementById('dashboard-active-courses');
        this.dashboardNewResources = document.getElementById('dashboard-new-resources');
        
        // NurseIQ elements
        this.dashboardNurseiqProgress = document.getElementById('dashboard-nurseiq-progress');
        this.dashboardNurseiqAccuracy = document.getElementById('dashboard-nurseiq-accuracy');
        this.dashboardNurseiqQuestions = document.getElementById('dashboard-nurseiq-questions');
        this.nurseiqActionCard = document.getElementById('nurseiq-action-card');
        this.nurseiqActionMessage = document.getElementById('nurseiq-action-message');
        this.nurseiqBadge = document.getElementById('nurseiqBadge');
        
        // Action cards
        this.actionPassport = document.getElementById('action-passport');
        this.latestAnnouncementCard = document.getElementById('latest-announcement-card');
        this.announcementTitle = document.getElementById('announcement-title');
        this.announcementBody = document.getElementById('announcement-body');
        this.announcementDate = document.getElementById('announcement-date');
        this.announcementStatus = document.getElementById('announcement-status');
        
        // Current time display
        this.currentDateTime = document.getElementById('currentDateTime');
        
        this.initializeElements();
    }
    
    initializeElements() {
        // Setup dashboard card click events
        this.setupDashboardEvents();
        
        // Start live clock
        this.startLiveClock();
    }
    
    setupDashboardEvents() {
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
    
    // Initialize with user ID and profile
    initialize(userId, userProfile) {
        this.userId = userId;
        this.userProfile = userProfile;
        
        if (userId && userProfile) {
            this.loadDashboard();
        }
    }
    
    // Main dashboard loading function
    async loadDashboard() {
        try {
            console.log('Loading dashboard data...');
            
            // Show loading state
            this.showLoadingStates();
            
            // Load user welcome
            this.loadUserWelcome();
            
            // Load all dashboard data in parallel
            await Promise.allSettled([
                this.loadAttendanceStats(),
                this.loadUpcomingExams(),
                this.loadCourseCount(),
                this.loadNewResourcesCount(),
                this.loadAnnouncements(),
                this.loadNurseIQStats(),
                this.checkMissingPassport(),
                this.loadLatestOfficialAnnouncement()
            ]);
            
            console.log('Dashboard loaded successfully');
            
        } catch (error) {
            console.error('Error loading dashboard:', error);
            if (window.showToast) {
                showToast('Failed to load dashboard data', 'error');
            }
        }
    }
    
    showLoadingStates() {
        if (this.dashboardAttendanceRate) this.dashboardAttendanceRate.textContent = '...';
        if (this.dashboardUpcomingExam) this.dashboardUpcomingExam.textContent = 'Loading...';
        if (this.dashboardActiveCourses) this.dashboardActiveCourses.textContent = '0';
        if (this.dashboardNewResources) this.dashboardNewResources.textContent = '0';
        if (this.dashboardNurseiqProgress) this.dashboardNurseiqProgress.textContent = '--%';
        if (this.dashboardNurseiqAccuracy) this.dashboardNurseiqAccuracy.textContent = '--%';
        if (this.dashboardNurseiqQuestions) this.dashboardNurseiqQuestions.textContent = '0';
    }
    
    loadUserWelcome() {
        if (!this.userProfile) return;
        
        const welcomeHeader = document.getElementById('welcome-header');
        const welcomeMessage = document.getElementById('student-welcome-message');
        
        if (welcomeHeader) {
            welcomeHeader.textContent = `Welcome back, ${this.userProfile.full_name || 'Student'}!`;
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
        if (this.userProfile.passport_url) {
            const headerPhoto = document.getElementById('header-passport-preview');
            if (headerPhoto) {
                const photoUrl = `${window.APP_CONFIG.SUPABASE_URL}/storage/v1/object/public/passports/${this.userProfile.passport_url}?t=${new Date().getTime()}`;
                headerPhoto.src = photoUrl;
                headerPhoto.onerror = function() {
                    this.onerror = null;
                    this.src = 'https://dummyimage.com/150x150/cccccc/000000.png&text=NO+PHOTO';
                };
            }
        }
    }
    
    // Load attendance statistics
    async loadAttendanceStats() {
        try {
            const { data: logs, error } = await this.sb
                .from('geo_attendance_logs')
                .select('is_verified')
                .eq('student_id', this.userId);
            
            if (error) throw error;
            
            const totalLogs = logs.length;
            const verifiedCount = logs.filter(l => l.is_verified === true).length;
            const pendingCount = logs.filter(l => !l.is_verified).length;
            const attendanceRate = totalLogs > 0 ? Math.round((verifiedCount / totalLogs) * 100) : 0;
            
            // Update UI
            if (this.dashboardAttendanceRate) {
                this.dashboardAttendanceRate.textContent = `${attendanceRate}%`;
                
                // Color code based on rate
                if (attendanceRate >= 80) {
                    this.dashboardAttendanceRate.style.color = 'var(--color-success)';
                } else if (attendanceRate >= 60) {
                    this.dashboardAttendanceRate.style.color = 'var(--color-warning)';
                } else {
                    this.dashboardAttendanceRate.style.color = 'var(--color-alert)';
                }
            }
            
            if (this.dashboardVerifiedCount) this.dashboardVerifiedCount.textContent = verifiedCount;
            if (this.dashboardTotalCount) this.dashboardTotalCount.textContent = totalLogs;
            if (this.dashboardPendingCount) this.dashboardPendingCount.textContent = pendingCount;
            
        } catch (error) {
            console.error('Error loading attendance stats:', error);
        }
    }
    
    // Load upcoming exams
    async loadUpcomingExams() {
        try {
            // Fetch exams for this student
            const { data: exams, error } = await this.sb
                .from('exams_with_courses')
                .select('exam_name, exam_date')
                .or(`program_type.eq.${this.userProfile?.program || this.userProfile?.department},program_type.eq.General`)
                .or(`block_term.eq.${this.userProfile?.block},block_term.is.null,block_term.eq.General`)
                .eq('intake_year', this.userProfile?.intake_year)
                .gte('exam_date', new Date().toISOString().split('T')[0])
                .order('exam_date', { ascending: true })
                .limit(1);
            
            if (error) throw error;
            
            if (this.dashboardUpcomingExam) {
                if (exams && exams.length > 0) {
                    const nextExam = exams[0];
                    const examDate = new Date(nextExam.exam_date);
                    const today = new Date();
                    const diffTime = examDate - today;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    if (diffDays <= 0) {
                        this.dashboardUpcomingExam.textContent = 'Today';
                        this.dashboardUpcomingExam.style.color = 'var(--color-alert)';
                    } else if (diffDays <= 7) {
                        this.dashboardUpcomingExam.textContent = `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
                        this.dashboardUpcomingExam.style.color = '#F97316';
                    } else {
                        this.dashboardUpcomingExam.textContent = examDate.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                        });
                        this.dashboardUpcomingExam.style.color = '#F97316';
                    }
                } else {
                    this.dashboardUpcomingExam.textContent = 'No upcoming exams';
                    this.dashboardUpcomingExam.style.color = '#6B7280';
                }
            }
            
        } catch (error) {
            console.error('Error loading upcoming exams:', error);
            if (this.dashboardUpcomingExam) {
                this.dashboardUpcomingExam.textContent = 'Error loading';
            }
        }
    }
    
    // Load course count
    async loadCourseCount() {
        try {
            const { data: courses, error } = await this.sb
                .from('courses')
                .select('status')
                .or(`target_program.eq.${this.userProfile?.program || this.userProfile?.department},target_program.eq.General`)
                .or(`block.eq.${this.userProfile?.block},block.is.null,block.eq.General`)
                .eq('intake_year', this.userProfile?.intake_year);
            
            if (error) throw error;
            
            if (this.dashboardActiveCourses && courses) {
                const activeCourses = courses.filter(course => 
                    course.status === 'Active' || course.status === 'In Progress'
                );
                this.dashboardActiveCourses.textContent = activeCourses.length.toString();
            }
            
        } catch (error) {
            console.error('Error loading course count:', error);
        }
    }
    
    // Load new resources count (last 7 days)
    async loadNewResourcesCount() {
        try {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            
            const { data: resources, error } = await this.sb
                .from('resources')
                .select('created_at')
                .eq('program_type', this.userProfile?.program || this.userProfile?.department)
                .eq('block', this.userProfile?.block)
                .eq('intake', this.userProfile?.intake_year)
                .gte('created_at', oneWeekAgo.toISOString());
            
            if (error) throw error;
            
            if (this.dashboardNewResources && resources) {
                this.dashboardNewResources.textContent = resources.length.toString();
            }
            
        } catch (error) {
            console.error('Error loading resources count:', error);
        }
    }
    
    // Load announcements
    async loadAnnouncements() {
        try {
            const { data: announcements, error } = await this.sb
                .from('notifications')
                .select('*')
                .or(`target_program.eq.${this.userProfile?.program || this.userProfile?.department},target_program.is.null`)
                .order('created_at', { ascending: false })
                .limit(5);
            
            if (error) throw error;
            
            // Update system messages card
            if (announcements && announcements.length > 0) {
                const latestAnnouncement = announcements[0];
                
                if (this.latestAnnouncementCard) {
                    this.latestAnnouncementCard.style.display = 'block';
                    
                    if (this.announcementTitle) {
                        this.announcementTitle.textContent = latestAnnouncement.subject || latestAnnouncement.title || 'New Announcement';
                    }
                    
                    if (this.announcementBody) {
                        const message = latestAnnouncement.message || latestAnnouncement.body || '';
                        this.announcementBody.textContent = message.length > 150 
                            ? message.substring(0, 150) + '...'
                            : message;
                    }
                    
                    if (this.announcementDate) {
                        const date = new Date(latestAnnouncement.created_at);
                        this.announcementDate.textContent = date.toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                        });
                    }
                    
                    if (this.announcementStatus) {
                        const priority = latestAnnouncement.priority || 'General';
                        this.announcementStatus.textContent = priority;
                        this.announcementStatus.style.color = 
                            priority === 'Urgent' ? 'var(--color-alert)' : 
                            priority === 'High' ? 'var(--color-warning)' : 
                            'var(--color-primary)';
                    }
                }
            }
            
        } catch (error) {
            console.error('Error loading announcements:', error);
        }
    }
    
    // Load latest official announcement
    async loadLatestOfficialAnnouncement() {
        try {
            const { data: announcements, error } = await this.sb
                .from('notifications')
                .select('*')
                .eq('subject', 'Official Announcement')
                .order('created_at', { ascending: false })
                .limit(1);
            
            if (error) throw error;
            
            if (this.studentAnnouncement) {
                if (announcements && announcements.length > 0) {
                    this.studentAnnouncement.textContent = announcements[0].message;
                } else {
                    this.studentAnnouncement.textContent = 'No official announcements at this time.';
                }
            }
            
        } catch (error) {
            console.error('Error loading official announcement:', error);
        }
    }
    
    // Load NurseIQ statistics
    async loadNurseIQStats() {
        try {
            // Fetch NurseIQ stats for the user
            const { data: stats, error } = await this.sb
                .from('nurseiq_user_stats')
                .select('*')
                .eq('student_id', this.userId)
                .single();
            
            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
                throw error;
            }
            
            const nurseiqStats = stats || {
                progress: 0,
                accuracy: 0,
                questions_completed: 0,
                pending_practice: 0
            };
            
            // Update progress
            if (this.dashboardNurseiqProgress) {
                const progress = nurseiqStats.progress || 0;
                this.dashboardNurseiqProgress.textContent = `${progress}%`;
                this.dashboardNurseiqProgress.style.color = progress >= 70 ? 'var(--color-success)' : 
                                                          progress >= 40 ? 'var(--color-warning)' : 
                                                          'var(--color-alert)';
            }
            
            // Update accuracy
            if (this.dashboardNurseiqAccuracy) {
                const accuracy = nurseiqStats.accuracy || 0;
                this.dashboardNurseiqAccuracy.textContent = `${accuracy}%`;
            }
            
            // Update questions count
            if (this.dashboardNurseiqQuestions) {
                this.dashboardNurseiqQuestions.textContent = nurseiqStats.questions_completed || '0';
            }
            
            // Update badge
            if (this.nurseiqBadge && nurseiqStats.pending_practice) {
                this.nurseiqBadge.textContent = nurseiqStats.pending_practice;
                this.nurseiqBadge.style.display = 'inline-block';
            }
            
            // Show action card if needed
            if (this.nurseiqActionCard) {
                if (nurseiqStats.progress < 50 || nurseiqStats.accuracy < 60) {
                    this.nurseiqActionCard.style.display = 'block';
                    
                    if (this.nurseiqActionMessage) {
                        if (nurseiqStats.progress < 30) {
                            this.nurseiqActionMessage.textContent = 'Start your NurseIQ practice to build your knowledge base.';
                        } else if (nurseiqStats.accuracy < 60) {
                            this.nurseiqActionMessage.textContent = 'Improve your accuracy by practicing more questions.';
                        } else {
                            this.nurseiqActionMessage.textContent = 'Complete your NurseIQ assessments to improve your scores.';
                        }
                    }
                }
            }
            
        } catch (error) {
            console.error('Error loading NurseIQ stats:', error);
        }
    }
    
    // Check for missing passport photo
    checkMissingPassport() {
        if (this.actionPassport && this.userProfile && !this.userProfile.passport_url) {
            this.actionPassport.style.display = 'block';
        }
    }
    
    // Start live clock for dashboard
    startLiveClock() {
        const updateTime = () => {
            if (!this.currentDateTime) return;
            
            const now = new Date();
            const options = { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            };
            
            this.currentDateTime.textContent = now.toLocaleDateString('en-US', options);
        };
        
        updateTime();
        setInterval(updateTime, 1000);
    }
    
    // Update user profile (called when profile is updated)
    updateUserProfile(userProfile) {
        this.userProfile = userProfile;
        this.loadUserWelcome();
        this.checkMissingPassport();
    }
    
    // Refresh specific dashboard sections
    async refreshDashboard() {
        try {
            await Promise.allSettled([
                this.loadAttendanceStats(),
                this.loadUpcomingExams(),
                this.loadCourseCount(),
                this.loadNewResourcesCount(),
                this.loadAnnouncements(),
                this.loadNurseIQStats()
            ]);
            
            if (window.showToast) {
                showToast('Dashboard refreshed', 'success');
            }
        } catch (error) {
            console.error('Error refreshing dashboard:', error);
        }
    }
}

// Create global instance and export functions
let dashboardModule = null;

// Initialize dashboard module
function initDashboardModule(supabaseClient, userId, userProfile) {
    dashboardModule = new DashboardModule(supabaseClient);
    dashboardModule.initialize(userId, userProfile);
    return dashboardModule;
}

// Global function to load dashboard
async function loadDashboard() {
    if (dashboardModule) {
        await dashboardModule.loadDashboard();
    }
}

// Global function to refresh dashboard
async function refreshDashboard() {
    if (dashboardModule) {
        await dashboardModule.refreshDashboard();
    }
}

// Make functions globally available
window.DashboardModule = DashboardModule;
window.initDashboardModule = initDashboardModule;
window.loadDashboard = loadDashboard;
window.refreshDashboard = refreshDashboard;

// Auto-initialize when DOM is ready and dashboard tab is active
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the dashboard tab
    if (document.getElementById('dashboard')?.classList.contains('active')) {
        console.log('Dashboard tab active, will load when user data is available...');
    }
    
    // Setup refresh button if it exists
    const refreshBtn = document.getElementById('refreshDashboardBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            if (window.refreshDashboard) {
                refreshDashboard();
            }
        });
    }
});
