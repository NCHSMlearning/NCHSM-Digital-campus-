// js/dashboard.js - Integrated Dashboard Management Module
class DashboardModule {
    constructor(supabaseClient) {
        this.sb = supabaseClient;
        this.userId = null;
        this.userProfile = null;
        this.cachedCourses = [];
        this.cachedExams = [];
        this.cachedResources = [];
        
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
        
        // Initialize
        this.initialize();
    }
    
    // Initialize the module
    async initialize() {
        console.log('🔧 Initializing DashboardModule...');
        this.setupEventListeners();
        
        // Load cached data first
        await this.loadCachedData();
        
        // Start live clock
        this.startLiveClock();
    }
    
    // Setup event listeners
    setupEventListeners() {
        // Dashboard card clicks
        document.querySelectorAll('.card[data-tab]').forEach(card => {
            card.addEventListener('click', function() {
                const tabId = this.getAttribute('data-tab');
                console.log(`Dashboard card clicked: ${tabId}`);
                if (typeof showTab === 'function') {
                    showTab(tabId);
                }
            });
        });
        
        // Refresh button
        const refreshBtn = document.getElementById('refreshDashboardBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshDashboard());
        }
        
        // Listen for attendance check-ins (if attendance module exists)
        if (window.attendanceModule) {
            console.log('📡 Listening for attendance check-ins...');
            document.addEventListener('attendanceCheckedIn', () => {
                console.log('🔄 Attendance check-in detected, refreshing dashboard...');
                this.loadAttendanceMetrics(this.userId);
            });
        }
    }
    
    // Load cached data
    async loadCachedData() {
        try {
            // These should be loaded from your main app
            if (window.cachedCourses) {
                this.cachedCourses = window.cachedCourses;
            }
            
            if (window.cachedExams) {
                this.cachedExams = window.cachedExams;
            }
            
            if (window.cachedResources) {
                this.cachedResources = window.cachedResources;
            }
            
            console.log('📦 Loaded cached data:', {
                courses: this.cachedCourses.length,
                exams: this.cachedExams.length,
                resources: this.cachedResources.length
            });
        } catch (error) {
            console.error('❌ Error loading cached data:', error);
        }
    }
    
    // Main function to initialize with user data
    async initializeWithUser(userId, userProfile) {
        this.userId = userId;
        this.userProfile = userProfile;
        
        console.log('👤 Dashboard initialized with user:', {
            userId,
            name: userProfile?.full_name
        });
        
        if (userId && userProfile) {
            await this.loadDashboard();
            return true;
        }
        return false;
    }
    
    // Main dashboard loading function
    async loadDashboard() {
        try {
            console.log('📊 Loading dashboard data...');
            
            // Show loading states
            this.showLoadingStates();
            
            // Load welcome section
            this.loadWelcomeDetails();
            
            // Load all metrics in parallel
            await Promise.allSettled([
                this.loadAttendanceMetrics(),
                this.loadStudentMessage(),
                this.loadLatestOfficialAnnouncement(),
                this.loadSystemMessages(),
                this.loadProfilePhoto(),
                this.loadCourseMetrics(),
                this.loadExamMetrics(),
                this.loadResourceMetrics()
            ]);
            
            console.log('✅ Dashboard loaded successfully');
            
        } catch (error) {
            console.error('❌ Error loading dashboard:', error);
            this.showErrorStates();
        }
    }
    
    // Show loading states
    showLoadingStates() {
        if (this.dashboardAttendanceRate) this.dashboardAttendanceRate.textContent = '--%';
        if (this.dashboardVerifiedCount) this.dashboardVerifiedCount.textContent = '0';
        if (this.dashboardTotalCount) this.dashboardTotalCount.textContent = '0';
        if (this.dashboardPendingCount) this.dashboardPendingCount.textContent = '0';
        if (this.dashboardUpcomingExam) this.dashboardUpcomingExam.textContent = 'Loading...';
        if (this.dashboardActiveCourses) this.dashboardActiveCourses.textContent = '0';
        if (this.dashboardNewResources) this.dashboardNewResources.textContent = '0';
    }
    
    // Show error states
    showErrorStates() {
        if (this.dashboardAttendanceRate) this.dashboardAttendanceRate.textContent = 'Err';
        if (this.dashboardUpcomingExam) this.dashboardUpcomingExam.textContent = 'Error';
        if (this.dashboardActiveCourses) this.dashboardActiveCourses.textContent = '0';
        if (this.dashboardNewResources) this.dashboardNewResources.textContent = '0';
    }
    
    // Load welcome details with live clock
    loadWelcomeDetails() {
        if (!this.userProfile) return;
        
        const studentName = this.userProfile.full_name || 'Student';
        
        function getGreeting(hour) {
            if (hour >= 5 && hour < 12) return "Good Morning";
            if (hour >= 12 && hour < 17) return "Good Afternoon";
            if (hour >= 17 && hour < 21) return "Good Evening";
            return "Good Night";
        }
        
        const updateHeader = () => {
            if (!this.welcomeHeader) return;
            
            const now = new Date();
            const hour = now.getHours();
            const minute = now.getMinutes().toString().padStart(2, '0');
            const second = now.getSeconds().toString().padStart(2, '0');
            
            this.welcomeHeader.textContent = `${getGreeting(hour)}, ${studentName}`;
            
            // Update time separately if you want it
            if (this.currentDateTime) {
                this.currentDateTime.textContent = `${hour.toString().padStart(2,'0')}:${minute}:${second}`;
            }
        };
        
        // Initialize and start the live clock
        updateHeader();
        setInterval(updateHeader.bind(this), 1000);
    }
    
    // Start live clock for current time display
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
    
    // Load student message from app_settings
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
                this.welcomeMessage.textContent = 'Welcome to your student dashboard!';
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
        if (!this.userId) return;
        
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
                    this.dashboardAttendanceRate.style.color = '#10B981';
                } else if (attendanceRate >= 60) {
                    this.dashboardAttendanceRate.style.color = '#F59E0B';
                } else {
                    this.dashboardAttendanceRate.style.color = '#EF4444';
                }
            }
            
            if (this.dashboardVerifiedCount) this.dashboardVerifiedCount.textContent = verifiedCount;
            if (this.dashboardTotalCount) this.dashboardTotalCount.textContent = totalLogs;
            if (this.dashboardPendingCount) this.dashboardPendingCount.textContent = pendingCount;
            
            console.log('✅ Attendance metrics updated:', { attendanceRate, verifiedCount, totalLogs });
            
        } catch (error) {
            console.error('❌ Error loading attendance stats:', error);
        }
    }
    
    // Load course metrics
    async loadCourseMetrics() {
        try {
            // Use cached courses or fetch from database
            let courses = this.cachedCourses;
            
            if (!courses || courses.length === 0) {
                const { data, error } = await this.sb
                    .from('courses')
                    .select('id, course_name, status')
                    .or(`target_program.eq.${this.userProfile?.program || this.userProfile?.department},target_program.eq.General`)
                    .eq('intake_year', this.userProfile?.intake_year);
                
                if (error) throw error;
                courses = data || [];
            }
            
            const activeCourses = courses.filter(course => 
                course.status === 'Active' || course.status === 'In Progress'
            );
            
            if (this.dashboardActiveCourses) {
                this.dashboardActiveCourses.textContent = activeCourses.length.toString();
            }
            
        } catch (error) {
            console.error('❌ Error loading course count:', error);
        }
    }
    
    // Load exam metrics
    async loadExamMetrics() {
        try {
            // Use cached exams or fetch from database
            let exams = this.cachedExams;
            
            if (!exams || exams.length === 0) {
                const { data, error } = await this.sb
                    .from('exams_with_courses')
                    .select('exam_name, exam_date')
                    .or(`program_type.eq.${this.userProfile?.program || this.userProfile?.department},program_type.eq.General`)
                    .or(`block_term.eq.${this.userProfile?.block},block_term.is.null,block_term.eq.General`)
                    .eq('intake_year', this.userProfile?.intake_year)
                    .gte('exam_date', new Date().toISOString().split('T')[0])
                    .order('exam_date', { ascending: true })
                    .limit(1);
                
                if (error) throw error;
                exams = data || [];
            }
            
            if (this.dashboardUpcomingExam) {
                if (exams && exams.length > 0) {
                    const nextExam = exams[0];
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
                } else {
                    this.dashboardUpcomingExam.textContent = 'No upcoming exams';
                    this.dashboardUpcomingExam.style.color = '#6B7280';
                }
            }
            
        } catch (error) {
            console.error('❌ Error loading upcoming exams:', error);
            if (this.dashboardUpcomingExam) {
                this.dashboardUpcomingExam.textContent = 'Error loading';
            }
        }
    }
    
    // Load resource metrics (last 7 days)
    async loadResourceMetrics() {
        try {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            
            // Use cached resources or fetch from database
            let resources = this.cachedResources;
            
            if (!resources || resources.length === 0) {
                const { data, error } = await this.sb
                    .from('resources')
                    .select('created_at')
                    .eq('program_type', this.userProfile?.program || this.userProfile?.department)
                    .eq('block', this.userProfile?.block)
                    .eq('intake', this.userProfile?.intake_year)
                    .gte('created_at', oneWeekAgo.toISOString());
                
                if (error) throw error;
                resources = data || [];
            }
            
            if (this.dashboardNewResources) {
                this.dashboardNewResources.textContent = resources.length.toString();
            }
            
        } catch (error) {
            console.error('❌ Error loading resources count:', error);
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
                
            } else {
                card.style.display = 'none';
            }
            
        } catch (error) {
            console.error('❌ Error loading system messages:', error);
            card.style.display = 'none';
        }
    }
    
    // Load profile photo
    async loadProfilePhoto() {
        const passportImg = document.getElementById('passport-preview');
        const headerPassportImg = document.getElementById('header-passport-preview');
        const passportCard = document.getElementById('action-passport');
        
        const photoUrl = this.userProfile?.passport_url;
        
        if (passportCard) {
            passportCard.style.display = photoUrl ? 'none' : 'block';
        }
        
        // Determine the photo source
        let finalPhotoSrc = 'https://dummyimage.com/150x150/cccccc/000000.png&text=NO+PHOTO';
        
        if (photoUrl) {
            // Construct proper Supabase URL
            const supabaseUrl = window.APP_CONFIG?.SUPABASE_URL || 'https://api.supabase.co';
            finalPhotoSrc = `${supabaseUrl}/storage/v1/object/public/passports/${photoUrl}?t=${new Date().getTime()}`;
        }
        
        // Update both profile and header images
        if (passportImg) {
            passportImg.src = finalPhotoSrc;
            passportImg.onerror = function() {
                this.onerror = null;
                this.src = 'https://dummyimage.com/150x150/cccccc/000000.png&text=NO+PHOTO';
            };
        }
        
        if (headerPassportImg) {
            headerPassportImg.src = finalPhotoSrc;
            headerPassportImg.onerror = function() {
                this.onerror = null;
                this.src = 'https://dummyimage.com/150x150/cccccc/000000.png&text=NO+PHOTO';
            };
        }
    }
    
    // Refresh dashboard
    async refreshDashboard() {
        console.log('🔄 Refreshing dashboard...');
        
        if (window.AppUtils && window.AppUtils.showLoading) {
            AppUtils.showToast('Refreshing dashboard...', 'info');
        }
        
        try {
            await this.loadDashboard();
            
            if (window.AppUtils && window.AppUtils.showToast) {
                AppUtils.showToast('Dashboard refreshed', 'success');
            }
            
        } catch (error) {
            console.error('❌ Error refreshing dashboard:', error);
            
            if (window.AppUtils && window.AppUtils.showToast) {
                AppUtils.showToast('Failed to refresh dashboard', 'error');
            }
        }
    }
    
    // Update user profile
    updateUserProfile(userProfile) {
        this.userProfile = userProfile;
        console.log('👤 Dashboard user profile updated');
        
        // Refresh relevant sections
        this.loadWelcomeDetails();
        this.loadProfilePhoto();
        
        // Update metrics if user ID changed
        if (userProfile.id && userProfile.id !== this.userId) {
            this.userId = userProfile.id;
            this.loadAttendanceMetrics();
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

// Global function to load dashboard with user data
async function loadDashboardWithUser(userId, userProfile) {
    if (!dashboardModule) {
        console.error('❌ Dashboard module not initialized');
        return false;
    }
    
    return await dashboardModule.initializeWithUser(userId, userProfile);
}

// Global function to refresh dashboard
function refreshDashboard() {
    if (dashboardModule) {
        dashboardModule.refreshDashboard();
    } else {
        console.warn('⚠️ Dashboard module not initialized');
    }
}

// Global function to update user profile
function updateDashboardProfile(userProfile) {
    if (dashboardModule) {
        dashboardModule.updateUserProfile(userProfile);
    }
}

// Auto-initialize when dashboard tab is active
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 DOM ready, checking dashboard...');
    
    // Check if we're on dashboard page
    const dashboardTab = document.getElementById('dashboard');
    if (dashboardTab && dashboardTab.classList.contains('active')) {
        console.log('📍 Dashboard tab is active');
        
        // Wait for supabase client to be available
        setTimeout(() => {
            if (window.sb && !dashboardModule) {
                initDashboardModule(window.sb);
                
                // If user data is already available, load it
                if (window.currentUserProfile && window.currentUserId) {
                    setTimeout(() => {
                        loadDashboardWithUser(window.currentUserId, window.currentUserProfile);
                    }, 500);
                }
            }
        }, 1000);
    }
});

// Listen for tab changes
document.addEventListener('tabChanged', function(e) {
    if (e.detail && e.detail.tabId === 'dashboard' && !dashboardModule) {
        console.log('📊 Dashboard tab opened, initializing...');
        
        if (window.sb) {
            initDashboardModule(window.sb);
            
            if (window.currentUserProfile && window.currentUserId) {
                setTimeout(() => {
                    loadDashboardWithUser(window.currentUserId, window.currentUserProfile);
                }, 300);
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

console.log('🏁 Dashboard module loaded and ready');
