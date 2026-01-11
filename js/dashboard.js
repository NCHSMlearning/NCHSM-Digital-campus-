// dashboard.js - REAL FINAL VERSION (BASED ON OUR CONSOLE FIXES)
class DashboardModule {
    constructor(supabaseClient) {
        console.log('🚀 Initializing DashboardModule (Real Final)...');
        
        // 🔥 ACTUAL FIX FROM CONSOLE: Get Supabase from window.db.supabase
        this.sb = supabaseClient || window.sb || window.db?.supabase;
        
        if (!this.sb) {
            console.error('❌ Dashboard: No Supabase client!');
            console.log('   Available: window.db.supabase =', !!window.db?.supabase);
            console.log('   Available: window.sb =', !!window.sb);
            
            // 🔥 ACTUAL FIX FROM CONSOLE: Try to auto-fix
            if (window.db?.supabase && !window.sb) {
                console.log('🔧 Auto-fixing: Setting window.sb = window.db.supabase');
                window.sb = window.db.supabase;
                this.sb = window.db.supabase;
            }
        } else {
            console.log('✅ Dashboard: Supabase client ready');
        }
        
        this.userId = null;
        this.userProfile = null;
        
        // Cache elements
        this.cacheElements();
        
        // Setup
        this.setupEventListeners();
        this.startLiveClock();
        
        console.log('✅ DashboardModule initialized');
    }
    
    cacheElements() {
        // Get ALL dashboard elements
        this.elements = {
            // Welcome section
            welcomeHeader: document.getElementById('welcome-header'),
            welcomeMessage: document.getElementById('student-welcome-message'),
            studentAnnouncement: document.getElementById('student-announcement'),
            
            // Stats (THESE ARE THE ONES SHOWING --%)
            attendanceRate: document.getElementById('dashboard-attendance-rate'),
            verifiedCount: document.getElementById('dashboard-verified-count'),
            totalCount: document.getElementById('dashboard-total-count'),
            pendingCount: document.getElementById('dashboard-pending-count'),
            upcomingExam: document.getElementById('dashboard-upcoming-exam'),
            activeCourses: document.getElementById('dashboard-active-courses'),
            newResources: document.getElementById('dashboard-new-resources'),
            
            // NurseIQ
            nurseiqProgress: document.getElementById('dashboard-nurseiq-progress'),
            nurseiqAccuracy: document.getElementById('dashboard-nurseiq-accuracy'),
            nurseiqQuestions: document.getElementById('dashboard-nurseiq-questions'),
            
            // Time
            currentDateTime: document.getElementById('currentDateTime')
        };
        
        console.log('🔍 Cached dashboard elements:', Object.keys(this.elements).filter(k => this.elements[k]));
    }
    
    setupEventListeners() {
        console.log('🔧 Setting up dashboard event listeners...');
        
        // 🔥 FROM CONSOLE: This event updates attendance
        document.addEventListener('attendanceCheckedIn', () => {
            console.log('📊 Dashboard: attendanceCheckedIn event received');
            this.loadAttendanceMetrics();
        });
        
        // 🔥 FROM CONSOLE: This event updates courses
        document.addEventListener('coursesUpdated', (e) => {
            console.log('📚 Dashboard: coursesUpdated event received');
            this.loadCourseMetrics();
        });
        
        // Refresh button
        const refreshBtn = document.getElementById('refreshDashboardBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshDashboard());
        }
        
        // Auto-refresh every 30 seconds (like we set in console)
        setInterval(() => {
            if (this.userId) {
                console.log('⏰ Auto-refreshing dashboard...');
                this.refreshDashboard();
            }
        }, 30000);
    }
    
    async initialize(userId, userProfile) {
        console.log('👤 Dashboard initializing with user:', userId);
        
        this.userId = userId;
        this.userProfile = userProfile;
        
        if (!userId || !userProfile) {
            console.error('❌ Dashboard: Missing user data');
            return false;
        }
        
        // Show loading states (shows ... instead of --%)
        this.showLoadingStates();
        
        // Load all dashboard data
        await this.loadDashboard();
        
        return true;
    }
    
    async loadDashboard() {
        console.log('📊 Loading complete dashboard data...');
        
        try {
            // Load in parallel (like we tested in console)
            await Promise.allSettled([
                this.loadWelcomeDetails(),
                this.loadStudentMessage(),
                this.loadLatestOfficialAnnouncement(),
                this.loadAttendanceMetrics(),
                this.loadCourseMetrics(),
                this.loadExamMetrics(),
                this.loadResourceMetrics(),
                this.loadNurseIQMetrics()
            ]);
            
            console.log('✅ Dashboard loaded successfully');
            
        } catch (error) {
            console.error('❌ Error loading dashboard:', error);
            this.showErrorStates();
        }
    }
    
    // 🔥 FROM CONSOLE: This fixed attendance showing 36%
    async loadAttendanceMetrics() {
        console.log('📊 Loading attendance metrics...');
        
        if (!this.userId || !this.sb) {
            console.warn('⚠️ Cannot load attendance: No user ID or Supabase');
            this.showErrorState('attendance');
            return;
        }
        
        try {
            const { data: logs, error } = await this.sb
                .from('geo_attendance_logs')
                .select('is_verified')
                .eq('student_id', this.userId);
            
            if (error) {
                console.error('❌ Attendance query error:', error);
                this.showErrorState('attendance');
                return;
            }
            
            // 🔥 THIS IS WHAT WE SAW IN CONSOLE: 4 verified out of 11 = 36%
            const totalLogs = logs?.length || 0;
            const verifiedCount = logs?.filter(l => l.is_verified === true).length || 0;
            const pendingCount = logs?.filter(l => !l.is_verified).length || 0;
            const attendanceRate = totalLogs > 0 ? Math.round((verifiedCount / totalLogs) * 100) : 0;
            
            // Update UI
            if (this.elements.attendanceRate) {
                this.elements.attendanceRate.textContent = `${attendanceRate}%`;
                this.elements.attendanceRate.style.color = 
                    attendanceRate >= 80 ? '#10B981' : 
                    attendanceRate >= 60 ? '#F59E0B' : '#EF4444';
            }
            
            if (this.elements.verifiedCount) this.elements.verifiedCount.textContent = verifiedCount;
            if (this.elements.totalCount) this.elements.totalCount.textContent = totalLogs;
            if (this.elements.pendingCount) this.elements.pendingCount.textContent = pendingCount;
            
            console.log(`✅ Attendance: ${attendanceRate}% (${verifiedCount}/${totalLogs})`);
            
        } catch (error) {
            console.error('❌ Error loading attendance:', error);
            this.showErrorState('attendance');
        }
    }
    
    // 🔥 FROM CONSOLE: This fixed courses showing 12
    async loadCourseMetrics() {
        console.log('📚 Loading course metrics...');
        
        if (!this.userProfile || !this.sb) {
            console.warn('⚠️ Cannot load courses: No user profile or Supabase');
            this.showErrorState('courses');
            return;
        }
        
        try {
            const { data: courses, error } = await this.sb
                .from('courses')
                .select('id, status')
                .or(`target_program.eq.${this.userProfile.program},target_program.is.null`)
                .eq('intake_year', this.userProfile.intake_year)
                .eq('status', 'Active');
            
            if (error) {
                console.error('❌ Courses query error:', error);
                this.showErrorState('courses');
                return;
            }
            
            const activeCount = courses?.length || 0;
            
            if (this.elements.activeCourses) {
                this.elements.activeCourses.textContent = activeCount;
            }
            
            console.log(`✅ Courses: ${activeCount} active`);
            
        } catch (error) {
            console.error('❌ Error loading courses:', error);
            this.showErrorState('courses');
        }
    }
    
    async loadExamMetrics() {
        console.log('📝 Loading exam metrics...');
        
        if (!this.userProfile || !this.sb) {
            console.warn('⚠️ Cannot load exams: No user profile or Supabase');
            this.showErrorState('exams');
            return;
        }
        
        try {
            const today = new Date().toISOString().split('T')[0];
            const { data: exams, error } = await this.sb
                .from('exams_with_courses')
                .select('exam_name, exam_date')
                .or(`program_type.eq.${this.userProfile.program},program_type.is.null`)
                .or(`block_term.eq.${this.userProfile.block},block_term.is.null`)
                .eq('intake_year', this.userProfile.intake_year)
                .gte('exam_date', today)
                .order('exam_date', { ascending: true })
                .limit(1);
            
            if (error) {
                console.error('❌ Exams query error:', error);
                this.showErrorState('exams');
                return;
            }
            
            let examText = 'None';
            let examColor = '#6B7280';
            
            if (exams && exams.length > 0) {
                const examDate = new Date(exams[0].exam_date);
                const diffDays = Math.ceil((examDate - new Date()) / (1000 * 60 * 60 * 24));
                
                if (diffDays <= 0) {
                    examText = 'Today';
                    examColor = '#EF4444';
                } else if (diffDays <= 7) {
                    examText = `${diffDays}d`;
                    examColor = '#F97316';
                } else {
                    examText = examDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    examColor = '#F97316';
                }
            }
            
            if (this.elements.upcomingExam) {
                this.elements.upcomingExam.textContent = examText;
                this.elements.upcomingExam.style.color = examColor;
            }
            
            console.log(`✅ Exams: ${examText}`);
            
        } catch (error) {
            console.error('❌ Error loading exams:', error);
            this.showErrorState('exams');
        }
    }
    
    async loadResourceMetrics() {
        console.log('📁 Loading resource metrics...');
        
        if (!this.userProfile || !this.sb) {
            console.warn('⚠️ Cannot load resources: No user profile or Supabase');
            this.showErrorState('resources');
            return;
        }
        
        try {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            
            const { data: resources, error } = await this.sb
                .from('resources')
                .select('created_at')
                .eq('target_program', this.userProfile.program)
                .eq('block', this.userProfile.block)
                .eq('intake_year', this.userProfile.intake_year)
                .gte('created_at', oneWeekAgo.toISOString());
            
            if (error) {
                console.error('❌ Resources query error:', error);
                this.showErrorState('resources');
                return;
            }
            
            const newCount = resources?.length || 0;
            
            if (this.elements.newResources) {
                this.elements.newResources.textContent = newCount;
            }
            
            console.log(`✅ Resources: ${newCount} new`);
            
        } catch (error) {
            console.error('❌ Error loading resources:', error);
            this.showErrorState('resources');
        }
    }
    
    async loadNurseIQMetrics() {
        console.log('🧠 Loading NurseIQ metrics...');
        
        if (!this.userId || !this.sb) {
            console.warn('⚠️ Cannot load NurseIQ: No user ID or Supabase');
            this.showErrorState('nurseiq');
            return;
        }
        
        try {
            const { data: assessments, error } = await this.sb
                .from('user_assessment_progress')
                .select('is_correct')
                .eq('user_id', this.userId);
            
            if (error) {
                console.error('❌ NurseIQ query error:', error);
                this.showErrorState('nurseiq');
                return;
            }
            
            const totalQuestions = assessments?.length || 0;
            const correctAnswers = assessments?.filter(a => a.is_correct === true).length || 0;
            const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
            const targetQuestions = 100;
            const progress = Math.min(Math.round((totalQuestions / targetQuestions) * 100), 100);
            
            if (this.elements.nurseiqProgress) this.elements.nurseiqProgress.textContent = `${progress}%`;
            if (this.elements.nurseiqAccuracy) this.elements.nurseiqAccuracy.textContent = `${accuracy}%`;
            if (this.elements.nurseiqQuestions) this.elements.nurseiqQuestions.textContent = totalQuestions;
            
            console.log(`✅ NurseIQ: ${progress}% progress, ${accuracy}% accuracy`);
            
        } catch (error) {
            console.error('❌ Error loading NurseIQ:', error);
            this.showErrorState('nurseiq');
        }
    }
    
    async loadLatestOfficialAnnouncement() {
        if (!this.elements.studentAnnouncement || !this.sb) return;
        
        try {
            const { data, error } = await this.sb
                .from('notifications')
                .select('*')
                .eq('subject', 'Official Announcement')
                .order('created_at', { ascending: false })
                .limit(1);
            
            if (error) throw error;
            
            if (data && data.length > 0) {
                this.elements.studentAnnouncement.textContent = data[0].message;
            } else {
                this.elements.studentAnnouncement.textContent = 'No official announcements at this time.';
            }
        } catch (error) {
            console.error('❌ Failed to load announcement:', error);
            this.elements.studentAnnouncement.textContent = 'No announcements available.';
        }
    }
    
    loadWelcomeDetails() {
        if (!this.userProfile || !this.elements.welcomeHeader) return;
        
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
            this.elements.welcomeHeader.textContent = `${getGreeting(hour)}, ${studentName}!`;
        };
        
        updateHeader();
        setInterval(updateHeader, 60000);
    }
    
    async loadStudentMessage() {
        if (!this.elements.welcomeMessage || !this.sb) return;
        
        try {
            const { data, error } = await this.sb
                .from('app_settings')
                .select('value')
                .eq('key', 'student_welcome')
                .maybeSingle();
            
            if (error) throw error;
            
            if (data && data.value) {
                this.elements.welcomeMessage.innerHTML = data.value;
            } else {
                this.elements.welcomeMessage.textContent = 'Welcome to your student dashboard! Access your courses, schedule, and check your attendance status.';
            }
        } catch (error) {
            console.error('❌ Failed to load student message:', error);
            this.elements.welcomeMessage.textContent = 'Welcome back! Check your courses and attendance.';
        }
    }
    
    showLoadingStates() {
        // Show loading for all stats
        if (this.elements.attendanceRate) this.elements.attendanceRate.textContent = '...';
        if (this.elements.verifiedCount) this.elements.verifiedCount.textContent = '...';
        if (this.elements.totalCount) this.elements.totalCount.textContent = '...';
        if (this.elements.pendingCount) this.elements.pendingCount.textContent = '...';
        if (this.elements.upcomingExam) this.elements.upcomingExam.textContent = '...';
        if (this.elements.activeCourses) this.elements.activeCourses.textContent = '...';
        if (this.elements.newResources) this.elements.newResources.textContent = '...';
        if (this.elements.nurseiqProgress) this.elements.nurseiqProgress.textContent = '...';
        if (this.elements.nurseiqAccuracy) this.elements.nurseiqAccuracy.textContent = '...';
        if (this.elements.nurseiqQuestions) this.elements.nurseiqQuestions.textContent = '...';
        
        // Announcement
        if (this.elements.studentAnnouncement) {
            this.elements.studentAnnouncement.textContent = 'Loading latest announcement...';
        }
    }
    
    showErrorStates() {
        // Show error states
        if (this.elements.attendanceRate) this.elements.attendanceRate.textContent = '--%';
        if (this.elements.upcomingExam) this.elements.upcomingExam.textContent = 'Error';
        if (this.elements.activeCourses) this.elements.activeCourses.textContent = '0';
        if (this.elements.newResources) this.elements.newResources.textContent = '0';
        if (this.elements.nurseiqProgress) this.elements.nurseiqProgress.textContent = '--%';
        if (this.elements.nurseiqAccuracy) this.elements.nurseiqAccuracy.textContent = '--%';
        if (this.elements.nurseiqQuestions) this.elements.nurseiqQuestions.textContent = '0';
    }
    
    showErrorState(metric) {
        switch(metric) {
            case 'attendance':
                if (this.elements.attendanceRate) this.elements.attendanceRate.textContent = '--%';
                break;
            case 'courses':
                if (this.elements.activeCourses) this.elements.activeCourses.textContent = '0';
                break;
            case 'exams':
                if (this.elements.upcomingExam) this.elements.upcomingExam.textContent = 'Error';
                break;
            case 'resources':
                if (this.elements.newResources) this.elements.newResources.textContent = '0';
                break;
            case 'nurseiq':
                if (this.elements.nurseiqProgress) this.elements.nurseiqProgress.textContent = '--%';
                if (this.elements.nurseiqAccuracy) this.elements.nurseiqAccuracy.textContent = '--%';
                if (this.elements.nurseiqQuestions) this.elements.nurseiqQuestions.textContent = '0';
                break;
        }
    }
    
    startLiveClock() {
        if (!this.elements.currentDateTime) return;
        
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
            
            this.elements.currentDateTime.textContent = now.toLocaleDateString('en-US', options);
        };
        
        updateTime();
        setInterval(updateTime, 60000);
    }
    
    async refreshDashboard() {
        console.log('🔄 Manually refreshing dashboard...');
        
        this.showLoadingStates();
        
        await Promise.allSettled([
            this.loadAttendanceMetrics(),
            this.loadCourseMetrics(),
            this.loadExamMetrics(),
            this.loadResourceMetrics(),
            this.loadNurseIQMetrics()
        ]);
        
        console.log('✅ Dashboard refreshed');
    }
}

// Create global instance
let dashboardModule = null;

// Initialize dashboard module
function initDashboardModule(supabaseClient) {
    console.log('🎯 initDashboardModule called');
    
    // Use provided client or find it
    const client = supabaseClient || window.sb || window.db?.supabase;
    
    if (!client) {
        console.error('❌ initDashboardModule: No Supabase client found!');
        console.log('   Trying to auto-fix...');
        
        if (window.db?.supabase && !window.sb) {
            console.log('🔧 Auto-fixing: window.sb = window.db.supabase');
            window.sb = window.db.supabase;
            dashboardModule = new DashboardModule(window.db.supabase);
        } else {
            console.error('❌ Cannot create dashboard: No Supabase available');
            return null;
        }
    } else {
        dashboardModule = new DashboardModule(client);
    }
    
    return dashboardModule;
}

// Global functions
window.DashboardModule = DashboardModule;
window.initDashboardModule = initDashboardModule;
window.refreshDashboard = () => {
    if (dashboardModule) {
        dashboardModule.refreshDashboard();
    } else {
        console.warn('⚠️ Dashboard module not initialized');
    }
};

// Auto-initialize when ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 Dashboard auto-init checking...');
    
    const hasDashboard = document.getElementById('dashboard-attendance-rate');
    
    if (hasDashboard) {
        console.log('✅ Dashboard elements found');
        
        const tryInit = () => {
            if ((window.sb || window.db?.supabase) && 
                window.currentUserId && 
                window.currentUserProfile && 
                !dashboardModule) {
                
                console.log('🎯 Auto-initializing dashboard...');
                const client = window.sb || window.db.supabase;
                dashboardModule = initDashboardModule(client);
                
                if (dashboardModule) {
                    dashboardModule.initialize(
                        window.currentUserId,
                        window.currentUserProfile
                    );
                }
            }
        };
        
        // Try multiple times (like we did in console)
        tryInit();
        setTimeout(tryInit, 1000);
        setTimeout(tryInit, 3000);
    }
});

console.log('✅ REAL FINAL Dashboard module loaded (based on console fixes)');
