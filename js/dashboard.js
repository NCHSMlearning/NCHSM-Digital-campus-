// js/dashboard.js - Dashboard Management Module (Complete Working Version)
class DashboardModule {
    constructor(supabaseClient) {
        console.log('🚀 Initializing DashboardModule...');
        this.sb = supabaseClient;
        this.userId = null;
        this.userProfile = null;
        
        // Store cached data
        this.cachedCourses = [];
        this.cachedExams = [];
        this.cachedResources = [];
        
        // Dashboard elements - Check if they exist
        this.welcomeHeader = this.getElement('welcome-header');
        this.welcomeMessage = this.getElement('student-welcome-message');
        this.studentAnnouncement = this.getElement('student-announcement');
        
        // Stats elements
        this.dashboardAttendanceRate = this.getElement('dashboard-attendance-rate');
        this.dashboardVerifiedCount = this.getElement('dashboard-verified-count');
        this.dashboardTotalCount = this.getElement('dashboard-total-count');
        this.dashboardPendingCount = this.getElement('dashboard-pending-count');
        this.dashboardUpcomingExam = this.getElement('dashboard-upcoming-exam');
        this.dashboardActiveCourses = this.getElement('dashboard-active-courses');
        this.dashboardNewResources = this.getElement('dashboard-new-resources');
        
        // Action cards
        this.actionPassport = this.getElement('action-passport');
        
        // Live clock
        this.currentDateTime = this.getElement('currentDateTime');
        
        // Initialize
        this.setupEventListeners();
        this.startLiveClock();
        
        console.log('✅ DashboardModule initialized');
    }
    
    // Helper to safely get elements
    getElement(id) {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`⚠️ Element #${id} not found`);
        }
        return element;
    }
    
    // Setup event listeners
    setupEventListeners() {
        // Dashboard card clicks
        document.querySelectorAll('.card[data-tab]').forEach(card => {
            card.addEventListener('click', (e) => {
                const tabId = card.getAttribute('data-tab');
                console.log(`Dashboard card clicked: ${tabId}`);
                
                // Prevent default if it's a link
                if (card.tagName === 'A') {
                    e.preventDefault();
                }
                
                // Show the tab if showTab function exists
                if (typeof showTab === 'function') {
                    showTab(tabId);
                } else if (window.app && window.app.ui && typeof window.app.ui.showTab === 'function') {
                    window.app.ui.showTab(tabId);
                }
            });
        });
        
        // Refresh button
        const refreshBtn = document.getElementById('refreshDashboardBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshDashboard());
        }
        
        // Listen for data updates from other modules
        this.setupDataUpdateListeners();
    }
    
    // Listen for data updates from other modules
    setupDataUpdateListeners() {
        // Listen for attendance check-in
        document.addEventListener('attendanceCheckedIn', () => {
            console.log('🔄 Dashboard: Attendance check-in detected');
            this.loadAttendanceMetrics();
        });
        
        // Listen for profile updates
        document.addEventListener('profileUpdated', () => {
            console.log('🔄 Dashboard: Profile updated');
            this.loadProfilePhoto();
        });
        
        // Listen for course data updates
        document.addEventListener('coursesUpdated', (e) => {
            if (e.detail && e.detail.courses) {
                this.cachedCourses = e.detail.courses;
                this.loadCourseMetrics();
            }
        });
        
        // Listen for exam data updates
        document.addEventListener('examsUpdated', (e) => {
            if (e.detail && e.detail.exams) {
                this.cachedExams = e.detail.exams;
                this.loadExamMetrics();
            }
        });
        
        // Listen for resource data updates
        document.addEventListener('resourcesUpdated', (e) => {
            if (e.detail && e.detail.resources) {
                this.cachedResources = e.detail.resources;
                this.loadResourceMetrics();
            }
        });
    }
    
    // Main function to initialize with user data
    async initialize(userId, userProfile) {
        console.log('👤 Dashboard initializing with user:', { userId, profile: userProfile?.full_name });
        
        this.userId = userId;
        this.userProfile = userProfile;
        
        if (!userId || !userProfile) {
            console.error('❌ Dashboard: Missing user data');
            return false;
        }
        
        // Show loading states
        this.showLoadingStates();
        
        // Load all dashboard data
        await this.loadDashboard();
        
        return true;
    }
    
    // Main dashboard loading function
    async loadDashboard() {
        console.log('📊 Loading dashboard data...');
        
        try {
            // Load all metrics in parallel
            const loadPromises = [
                this.loadWelcomeDetails(),
                this.loadStudentMessage(),
                this.loadLatestOfficialAnnouncement(),
                this.loadAttendanceMetrics(),
                this.loadCourseMetrics(),
                this.loadExamMetrics(),
                this.loadResourceMetrics(),
                this.loadProfilePhoto(),
                this.loadSystemMessages()
            ];
            
            await Promise.allSettled(loadPromises);
            
            console.log('✅ Dashboard loaded successfully');
            
        } catch (error) {
            console.error('❌ Error loading dashboard:', error);
            this.showErrorStates();
        }
    }
    
    // Show loading states
    showLoadingStates() {
        this.setText(this.dashboardAttendanceRate, '...');
        this.setText(this.dashboardVerifiedCount, '...');
        this.setText(this.dashboardTotalCount, '...');
        this.setText(this.dashboardPendingCount, '...');
        this.setText(this.dashboardUpcomingExam, 'Loading...');
        this.setText(this.dashboardActiveCourses, '...');
        this.setText(this.dashboardNewResources, '...');
    }
    
    // Show error states
    showErrorStates() {
        this.setText(this.dashboardAttendanceRate, 'Error');
        this.setText(this.dashboardUpcomingExam, 'Error');
        this.setText(this.dashboardActiveCourses, '0');
        this.setText(this.dashboardNewResources, '0');
    }
    
    // Helper to set text safely
    setText(element, text) {
        if (element) element.textContent = text;
    }
    
    // Load welcome details with live clock
    loadWelcomeDetails() {
        if (!this.userProfile || !this.welcomeHeader) return;
        
        const studentName = this.userProfile.full_name || 'Student';
        
        const getGreeting = (hour) => {
            if (hour >= 5 && hour < 12) return "Good Morning";
            if (hour >= 12 && hour < 17) return "Good Afternoon";
            if (hour >= 17 && hour < 21) return "Good Evening";
            return "Good Night";
        };
        
        const updateHeader = () => {
            const now = new Date();
            const hour = now.getHours();
            
            this.welcomeHeader.textContent = `${getGreeting(hour)}, ${studentName}!`;
        };
        
        // Initialize and update every minute
        updateHeader();
        setInterval(updateHeader, 60000);
    }
    
    // Start live clock for current time display
    startLiveClock() {
        if (!this.currentDateTime) return;
        
        const updateTime = () => {
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
            
            this.currentDateTime.textContent = now.toLocaleDateString('en-US', options);
        };
        
        updateTime();
        setInterval(updateTime, 60000); // Update every minute
    }
    
    // Load student welcome message
    async loadStudentMessage() {
        if (!this.welcomeMessage) return;
        
        try {
            const { data, error } = await this.sb
                .from('app_settings')
                .select('value')
                .eq('key', 'student_welcome')
                .maybeSingle();
            
            if (error) throw error;
            
            if (data && data.value) {
                this.welcomeMessage.innerHTML = data.value;
            } else {
                this.welcomeMessage.textContent = 'Welcome to your student dashboard! Access your courses, schedule, and check your attendance status.';
            }
        } catch (error) {
            console.error('❌ Failed to load student message:', error);
            this.welcomeMessage.textContent = 'Welcome back! Check your courses and attendance.';
        }
    }
    
    // Load latest official announcement
    async loadLatestOfficialAnnouncement() {
        if (!this.studentAnnouncement) return;
        
        try {
            const { data, error } = await this.sb
                .from('notifications')
                .select('*')
                .eq('subject', 'Official Announcement')
                .order('created_at', { ascending: false })
                .limit(1);
            
            if (error) throw error;
            
            if (data && data.length > 0) {
                this.studentAnnouncement.textContent = data[0].message;
            } else {
                this.studentAnnouncement.textContent = 'No official announcements at this time.';
            }
        } catch (error) {
            console.error('❌ Failed to load official announcement:', error);
            this.studentAnnouncement.textContent = 'No announcements available.';
        }
    }
    
    // Load attendance metrics
    async loadAttendanceMetrics() {
        console.log('📊 Loading attendance metrics...');
        
        if (!this.userId) {
            console.warn('⚠️ No user ID for attendance metrics');
            return;
        }
        
        try {
            // Fetch attendance logs
            const { data: logs, error } = await this.sb
                .from('geo_attendance_logs')
                .select('is_verified')
                .eq('student_id', this.userId);
            
            if (error) {
                console.error('❌ Database error loading attendance:', error);
                return;
            }
            
            console.log(`📋 Found ${logs?.length || 0} attendance logs`);
            
            // Calculate metrics
            const totalLogs = logs?.length || 0;
            const verifiedCount = logs?.filter(l => l.is_verified === true).length || 0;
            const pendingCount = logs?.filter(l => !l.is_verified).length || 0;
            const attendanceRate = totalLogs > 0 ? Math.round((verifiedCount / totalLogs) * 100) : 0;
            
            console.log('📈 Attendance stats:', { 
                totalLogs, 
                verifiedCount, 
                pendingCount, 
                attendanceRate 
            });
            
            // Update UI
            this.setText(this.dashboardAttendanceRate, `${attendanceRate}%`);
            this.setText(this.dashboardVerifiedCount, verifiedCount);
            this.setText(this.dashboardTotalCount, totalLogs);
            this.setText(this.dashboardPendingCount, pendingCount);
            
            // Color code attendance rate
            if (this.dashboardAttendanceRate) {
                if (attendanceRate >= 80) {
                    this.dashboardAttendanceRate.style.color = '#10B981'; // Green
                } else if (attendanceRate >= 60) {
                    this.dashboardAttendanceRate.style.color = '#F59E0B'; // Orange
                } else {
                    this.dashboardAttendanceRate.style.color = '#EF4444'; // Red
                }
            }
            
        } catch (error) {
            console.error('❌ Error loading attendance stats:', error);
        }
    }
    
    // Load course metrics
    async loadCourseMetrics() {
        console.log('📚 Loading course metrics...');
        
        try {
            let courses = this.cachedCourses;
            
            // If no cached courses, fetch from database
            if (!courses || courses.length === 0) {
                console.log('📥 Fetching courses from database...');
                
                const { data, error } = await this.sb
                    .from('courses')
                    .select('id, course_name, status, target_program, intake_year')
                    .or(`target_program.eq.${this.userProfile?.program || this.userProfile?.department},target_program.eq.General`)
                    .eq('intake_year', this.userProfile?.intake_year || '2024');
                
                if (error) {
                    console.error('❌ Database error loading courses:', error);
                    return;
                }
                
                courses = data || [];
                this.cachedCourses = courses;
                
                // Dispatch event for other modules
                document.dispatchEvent(new CustomEvent('coursesUpdated', {
                    detail: { courses }
                }));
            }
            
            console.log(`📋 Found ${courses.length} courses`);
            
            // Count active courses
            const activeCourses = courses.filter(course => 
                course.status === 'Active' || course.status === 'In Progress' || !course.status
            );
            
            console.log(`📈 Active courses: ${activeCourses.length}`);
            
            // Update UI
            this.setText(this.dashboardActiveCourses, activeCourses.length);
            
        } catch (error) {
            console.error('❌ Error loading course metrics:', error);
            this.setText(this.dashboardActiveCourses, '0');
        }
    }
    
    // Load exam metrics
    async loadExamMetrics() {
        console.log('📝 Loading exam metrics...');
        
        try {
            let exams = this.cachedExams;
            
            // If no cached exams, fetch from database
            if (!exams || exams.length === 0) {
                console.log('📥 Fetching exams from database...');
                
                const { data, error } = await this.sb
                    .from('exams_with_courses')
                    .select('exam_name, exam_date, program_type, block_term, intake_year')
                    .or(`program_type.eq.${this.userProfile?.program || this.userProfile?.department},program_type.eq.General`)
                    .or(`block_term.eq.${this.userProfile?.block},block_term.is.null,block_term.eq.General`)
                    .eq('intake_year', this.userProfile?.intake_year || '2024')
                    .gte('exam_date', new Date().toISOString().split('T')[0])
                    .order('exam_date', { ascending: true });
                
                if (error) {
                    console.error('❌ Database error loading exams:', error);
                    return;
                }
                
                exams = data || [];
                this.cachedExams = exams;
                
                // Dispatch event for other modules
                document.dispatchEvent(new CustomEvent('examsUpdated', {
                    detail: { exams }
                }));
            }
            
            console.log(`📋 Found ${exams.length} upcoming exams`);
            
            // Find next exam
            const upcomingExams = exams.filter(exam => new Date(exam.exam_date) > new Date());
            const nextExam = upcomingExams[0];
            
            // Update UI
            if (this.dashboardUpcomingExam) {
                if (nextExam) {
                    const examDate = new Date(nextExam.exam_date);
                    const today = new Date();
                    const diffTime = examDate - today;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    if (diffDays <= 0) {
                        this.dashboardUpcomingExam.textContent = 'Today';
                        this.dashboardUpcomingExam.style.color = '#EF4444';
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
                    
                    console.log(`📅 Next exam: ${nextExam.exam_name} in ${diffDays} days`);
                } else {
                    this.dashboardUpcomingExam.textContent = 'No upcoming exams';
                    this.dashboardUpcomingExam.style.color = '#6B7280';
                    console.log('📅 No upcoming exams found');
                }
            }
            
        } catch (error) {
            console.error('❌ Error loading exam metrics:', error);
            this.setText(this.dashboardUpcomingExam, 'Error loading');
        }
    }
    
    // Load resource metrics (last 7 days)
    async loadResourceMetrics() {
        console.log('📁 Loading resource metrics...');
        
        try {
            let resources = this.cachedResources;
            
            // If no cached resources or we need fresh data for last 7 days
            if (!resources || resources.length === 0) {
                console.log('📥 Fetching resources from database...');
                
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                
                const { data, error } = await this.sb
                    .from('resources')
                    .select('created_at, program_type, block, intake')
                    .eq('program_type', this.userProfile?.program || this.userProfile?.department)
                    .eq('block', this.userProfile?.block)
                    .eq('intake', this.userProfile?.intake_year || '2024')
                    .gte('created_at', oneWeekAgo.toISOString());
                
                if (error) {
                    console.error('❌ Database error loading resources:', error);
                    return;
                }
                
                resources = data || [];
                this.cachedResources = resources;
                
                // Dispatch event for other modules
                document.dispatchEvent(new CustomEvent('resourcesUpdated', {
                    detail: { resources }
                }));
            }
            
            // Filter resources from last 7 days
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            const newResources = resources.filter(r => new Date(r.created_at) >= oneWeekAgo);
            
            console.log(`📈 New resources (last 7 days): ${newResources.length}`);
            
            // Update UI
            this.setText(this.dashboardNewResources, newResources.length);
            
        } catch (error) {
            console.error('❌ Error loading resource metrics:', error);
            this.setText(this.dashboardNewResources, '0');
        }
    }
    
    // Load system messages
    async loadSystemMessages() {
        const card = document.getElementById('latest-announcement-card');
        const titleElement = document.getElementById('announcement-title');
        const bodyElement = document.getElementById('announcement-body');
        const dateElement = document.getElementById('announcement-date');
        const statusElement = document.getElementById('announcement-status');
        
        if (!card || !this.userProfile?.program) return;
        
        card.style.display = 'none';
        
        try {
            const { data: messages, error } = await this.sb
                .from('notifications')
                .select('created_at, subject, message, is_read, target_program')
                .or(`target_program.eq.${this.userProfile.program},target_program.is.null`)
                .order('created_at', { ascending: false })
                .limit(1);
            
            if (error) throw error;
            
            if (messages && messages.length > 0) {
                const latestMsg = messages[0];
                const date = new Date(latestMsg.created_at).toLocaleDateString('en-GB');
                const statusColor = !latestMsg.is_read ? '#EF4444' : '#10B981';
                const statusText = !latestMsg.is_read ? 'New' : 'Seen';
                const cardBorderColor = !latestMsg.is_read ? '#EF4444' : '#3B82F6';
                
                if (titleElement) titleElement.textContent = (latestMsg.subject || 'New Announcement').toUpperCase();
                if (bodyElement) bodyElement.textContent = latestMsg.message;
                if (dateElement) dateElement.textContent = date;
                if (statusElement) {
                    statusElement.textContent = `Status: ${statusText}`;
                    statusElement.style.color = statusColor;
                }
                
                card.style.display = 'block';
                card.style.borderLeftColor = cardBorderColor;
                
                console.log('📢 Loaded system message:', latestMsg.subject);
                
            } else {
                card.style.display = 'none';
                console.log('📭 No system messages found');
            }
            
        } catch (error) {
            console.error('❌ Error loading system messages:', error);
            card.style.display = 'none';
        }
    }
    
    // Load profile photo
    async loadProfilePhoto() {
        console.log('🖼️ Loading profile photo...');
        
        const passportImg = document.getElementById('passport-preview');
        const headerPassportImg = document.getElementById('header-passport-preview');
        const passportCard = this.actionPassport;
        
        const photoUrl = this.userProfile?.passport_url;
        
        // Show/hide passport upload card
        if (passportCard) {
            passportCard.style.display = photoUrl ? 'none' : 'block';
        }
        
        // Determine the photo source
        let finalPhotoSrc = 'https://dummyimage.com/150x150/cccccc/000000.png&text=NO+PHOTO';
        
        if (photoUrl) {
            // Construct proper Supabase URL
            const supabaseUrl = window.APP_CONFIG?.SUPABASE_URL || 'https://api.supabase.co';
            finalPhotoSrc = `${supabaseUrl}/storage/v1/object/public/passports/${photoUrl}?t=${new Date().getTime()}`;
            console.log('📸 Profile photo URL:', finalPhotoSrc);
        }
        
        // Update both profile and header images
        const updateImage = (imgElement) => {
            if (imgElement) {
                imgElement.src = finalPhotoSrc;
                imgElement.onerror = function() {
                    console.warn('⚠️ Failed to load profile photo, using fallback');
                    this.onerror = null;
                    this.src = 'https://dummyimage.com/150x150/cccccc/000000.png&text=NO+PHOTO';
                };
            }
        };
        
        updateImage(passportImg);
        updateImage(headerPassportImg);
    }
    
    // Refresh dashboard - manually trigger update
    async refreshDashboard() {
        console.log('🔄 Manually refreshing dashboard...');
        
        // Show toast notification
        if (window.showToast) {
            showToast('Refreshing dashboard data...', 'info');
        }
        
        // Clear caches to force fresh data
        this.cachedCourses = [];
        this.cachedExams = [];
        this.cachedResources = [];
        
        // Show loading states
        this.showLoadingStates();
        
        // Reload all metrics
        await this.loadDashboard();
        
        // Show success message
        if (window.showToast) {
            showToast('Dashboard refreshed successfully!', 'success');
        }
        
        console.log('✅ Dashboard refreshed');
    }
    
    // Update user profile (called when profile is updated)
    updateUserProfile(userProfile) {
        console.log('👤 Dashboard: Updating user profile');
        this.userProfile = userProfile;
        
        // Refresh relevant sections
        this.loadWelcomeDetails();
        this.loadProfilePhoto();
        
        // If user ID changed, reload attendance metrics
        if (userProfile.id && userProfile.id !== this.userId) {
            this.userId = userProfile.id;
            this.loadAttendanceMetrics();
        }
    }
    
    // Update cached data from other modules
    updateCachedData(type, data) {
        console.log(`📦 Dashboard: Updating cached ${type} data`);
        
        switch (type) {
            case 'courses':
                this.cachedCourses = data;
                this.loadCourseMetrics();
                break;
            case 'exams':
                this.cachedExams = data;
                this.loadExamMetrics();
                break;
            case 'resources':
                this.cachedResources = data;
                this.loadResourceMetrics();
                break;
        }
    }
}

// Create global instance
let dashboardModule = null;

// Initialize dashboard module
function initDashboardModule(supabaseClient) {
    console.log('🚀 Initializing dashboard module...');
    
    if (!supabaseClient) {
        console.error('❌ Supabase client required for dashboard');
        return null;
    }
    
    dashboardModule = new DashboardModule(supabaseClient);
    return dashboardModule;
}

// Function to load dashboard with user data
async function loadDashboardWithUser(userId, userProfile) {
    if (!dashboardModule) {
        console.error('❌ Dashboard module not initialized');
        return false;
    }
    
    return await dashboardModule.initialize(userId, userProfile);
}

// Function to refresh dashboard
function refreshDashboard() {
    if (dashboardModule) {
        dashboardModule.refreshDashboard();
    } else {
        console.warn('⚠️ Dashboard module not initialized');
    }
}

// Function to update user profile
function updateDashboardProfile(userProfile) {
    if (dashboardModule) {
        dashboardModule.updateUserProfile(userProfile);
    }
}

// Function to update cached data
function updateDashboardCache(type, data) {
    if (dashboardModule) {
        dashboardModule.updateCachedData(type, data);
    }
}

// Auto-initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 DOM ready, checking dashboard...');
    
    // Check if dashboard elements exist
    const hasDashboardElements = document.getElementById('dashboard-attendance-rate') || 
                                 document.getElementById('dashboard');
    
    if (hasDashboardElements) {
        console.log('✅ Dashboard elements found');
        
        // Initialize when supabase client is available
        const initDashboard = () => {
            if (window.sb && !dashboardModule) {
                initDashboardModule(window.sb);
                
                // If user data is already available, load it
                if (window.currentUserProfile && window.currentUserId) {
                    console.log('👤 Found existing user data, loading dashboard...');
                    setTimeout(() => {
                        loadDashboardWithUser(window.currentUserId, window.currentUserProfile);
                    }, 1000);
                }
            }
        };
        
        // Try immediately
        initDashboard();
        
        // Also try after a delay in case supabase loads later
        setTimeout(initDashboard, 2000);
    } else {
        console.log('📭 No dashboard elements found on this page');
    }
});

// Listen for tab changes to refresh dashboard when it becomes active
document.addEventListener('tabChanged', function(e) {
    if (e.detail && e.detail.tabId === 'dashboard') {
        console.log('📊 Dashboard tab activated');
        
        if (dashboardModule) {
            // Refresh dashboard data when tab is switched to
            setTimeout(() => {
                dashboardModule.refreshDashboard();
            }, 500);
        } else if (window.sb) {
            // Initialize if not already done
            initDashboardModule(window.sb);
            
            if (window.currentUserProfile && window.currentUserId) {
                setTimeout(() => {
                    loadDashboardWithUser(window.currentUserId, window.currentUserProfile);
                }, 500);
            }
        }
    }
});

// Make functions globally available
window.DashboardModule = DashboardModule;
window.initDashboardModule = initDashboardModule;
window.loadDashboardWithUser = loadDashboardWithUser;
window.refreshDashboard = refreshDashboard;
window.updateDashboardProfile = updateDashboardProfile;
window.updateDashboardCache = updateDashboardCache;

console.log('🏁 Dashboard module loaded');
