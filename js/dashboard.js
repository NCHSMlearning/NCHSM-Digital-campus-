// dashboard.js - UPDATED FOR NEW HEADER
class DashboardModule {
    constructor(supabaseClient) {
        console.log('🚀 Initializing DashboardModule (with Header Integration)...');
        
        // Get Supabase from window.db.supabase
        this.sb = supabaseClient || window.sb || window.db?.supabase;
        
        if (!this.sb) {
            console.error('❌ Dashboard: No Supabase client!');
            console.log('   Available: window.db.supabase =', !!window.db?.supabase);
            console.log('   Available: window.sb =', !!window.sb);
            
            // Try to auto-fix
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
        this.cachedCourses = []; // Cache courses data
        
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
            
            // Stats (dashboard cards)
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
            
            // Time (in footer)
            currentDateTime: document.getElementById('currentDateTime'),
            
            // 🔥 NEW: Header elements
            headerTime: document.getElementById('header-time'),
            headerUserName: document.getElementById('header-user-name'),
            headerProfilePhoto: document.getElementById('header-profile-photo'),
            headerRefresh: document.getElementById('header-refresh')
        };
        
        console.log('🔍 Cached dashboard elements:', Object.keys(this.elements).filter(k => this.elements[k]));
    }
    
    setupEventListeners() {
        console.log('🔧 Setting up dashboard event listeners...');
        
        // Listen for attendance events
        document.addEventListener('attendanceCheckedIn', () => {
            console.log('📊 Dashboard: attendanceCheckedIn event received');
            this.loadAttendanceMetrics();
        });
        
        // Listen for courses events
        document.addEventListener('coursesUpdated', (e) => {
            console.log('📚 Dashboard: coursesUpdated event received with data:', e.detail);
            
            if (e.detail && e.detail.activeCount !== undefined) {
                this.cachedCourses = e.detail.courses || [];
                
                // Update dashboard count directly from courses.js data
                if (this.elements.activeCourses) {
                    this.elements.activeCourses.textContent = e.detail.activeCount;
                }
                
                console.log(`✅ Courses updated from event: ${e.detail.activeCount} active`);
                
                // Update any other course-based metrics
                this.updateCourseBasedMetrics();
            } else {
                // Fallback to query
                console.log('⚠️ No detail in event, falling back to query');
                this.loadCourseMetrics();
            }
        });
        
        // Listen for courses module initialization
        document.addEventListener('coursesModuleReady', () => {
            console.log('📚 Dashboard: coursesModuleReady event received');
            // Sync with courses module
            if (window.coursesModule) {
                this.syncWithCoursesModule();
            }
        });
        
        // Header refresh button
        if (this.elements.headerRefresh) {
            this.elements.headerRefresh.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('🔄 Header refresh button clicked');
                this.refreshDashboard();
            });
        }
        
        // Dashboard refresh button
        const refreshBtn = document.getElementById('refreshDashboardBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshDashboard());
        }
        
        // Auto-refresh every 30 seconds
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
        
        // 🔥 UPDATE HEADER FIRST (immediate visual feedback)
        this.updateHeaderWithUserData();
        
        // Show loading states
        this.showLoadingStates();
        
        // Load all dashboard data
        await this.loadDashboard();
        
        // Try to sync with courses module if available
        setTimeout(() => {
            this.syncWithCoursesModule();
        }, 1000);
        
        return true;
    }
    
    async loadDashboard() {
        console.log('📊 Loading complete dashboard data...');
        
        try {
            // Load in parallel
            await Promise.allSettled([
                this.loadWelcomeDetails(),
                this.loadStudentMessage(),
                this.loadLatestOfficialAnnouncement(),
                this.loadAttendanceMetrics(),
                this.loadCourseMetrics(), // Will use cached data if available
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
    
    // 🔥 NEW: Update header with user data
    updateHeaderWithUserData() {
        console.log('👤 Updating header with user data...');
        
        if (!this.userProfile) return;
        
        // Update user name in header
        if (this.elements.headerUserName && this.userProfile.full_name) {
            this.elements.headerUserName.textContent = this.userProfile.full_name;
        }
        
        // Update header profile photo
        if (this.elements.headerProfilePhoto && this.userProfile.full_name) {
            const nameForAvatar = this.userProfile.full_name.replace(/\s+/g, '');
            this.elements.headerProfilePhoto.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(nameForAvatar)}&background=667eea&color=fff&size=100`;
            this.elements.headerProfilePhoto.alt = this.userProfile.full_name;
        }
        
        // Update welcome message
        if (this.elements.welcomeHeader && this.userProfile.full_name) {
            const getGreeting = (hour) => {
                if (hour >= 5 && hour < 12) return "Good Morning";
                if (hour >= 12 && hour < 17) return "Good Afternoon";
                if (hour >= 17 && hour < 21) return "Good Evening";
                return "Good Night";
            };
            
            const now = new Date();
            const hour = now.getHours();
            this.elements.welcomeHeader.textContent = `${getGreeting(hour)}, ${this.userProfile.full_name}!`;
        }
    }
    
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
    
    async loadCourseMetrics() {
        console.log('📚 Loading course metrics...');
        
        // FIRST: Try to get data from courses.js module
        if (window.coursesModule && window.coursesModule.getActiveCourseCount) {
            const activeCount = window.coursesModule.getActiveCourseCount();
            console.log(`📚 Got active courses from coursesModule: ${activeCount}`);
            
            if (this.elements.activeCourses) {
                this.elements.activeCourses.textContent = activeCount;
            }
            return;
        }
        
        // SECOND: Try to use cached data from coursesUpdated event
        if (this.cachedCourses.length > 0) {
            const activeCount = this.cachedCourses.filter(course => {
                const isCompleted = course.status === 'Completed' || course.status === 'Passed';
                return !isCompleted && course.status !== 'Completed';
            }).length;
            
            console.log(`📚 Using cached courses: ${activeCount} active`);
            
            if (this.elements.activeCourses) {
                this.elements.activeCourses.textContent = activeCount;
            }
            return;
        }
        
        // THIRD: Fallback to query
        if (!this.userProfile || !this.sb) {
            console.warn('⚠️ Cannot load courses: No user profile or Supabase');
            this.showErrorState('courses');
            return;
        }
        
        try {
            const program = this.userProfile.program || 'KRCHN';
            const intakeYear = this.userProfile.intake_year || 2025;
            const block = this.userProfile.block || 'A';
            const term = this.userProfile.term || 'Term 1';
            
            console.log('🎯 Loading courses for:', { program, intakeYear, block, term });
            
            // EXACT SAME QUERY LOGIC AS COURSES.JS
            let query = this.sb
                .from('courses')
                .select('*')
                .eq('intake_year', intakeYear)
                .order('course_name', { ascending: true });
            
            const isTVET = this.isTVETProgram(program);
            
            if (isTVET) {
                // TVET filtering
                query = query
                    .eq('target_program', program)
                    .or(`block.eq.${term},block.eq.General,block.is.null`);
            } else {
                // KRCHN filtering
                query = query
                    .or(`target_program.eq.${program},target_program.eq.General`)
                    .or(`block.eq.${block},block.is.null,block.eq.General`);
            }
            
            const { data: courses, error } = await query;
            
            if (error) {
                console.error('❌ Courses query error:', error);
                this.showErrorState('courses');
                return;
            }
            
            // EXACT SAME FILTERING LOGIC AS COURSES.JS
            const activeCourses = courses?.filter(course => {
                const isCompleted = course.status === 'Completed' || course.status === 'Passed';
                return !isCompleted && course.status !== 'Completed';
            }) || [];
            
            const activeCount = activeCourses.length;
            
            if (this.elements.activeCourses) {
                this.elements.activeCourses.textContent = activeCount;
            }
            
            console.log(`✅ Courses: ${activeCount} active (using courses.js logic)`);
            
        } catch (error) {
            console.error('❌ Error loading courses:', error);
            this.showErrorState('courses');
        }
    }
    
    isTVETProgram(program) {
        if (!program) return false;
        const tvetPrograms = ['TVET', 'TVET NURSING', 'TVET NURSING(A)', 'TVET NURSING(B)', 
                            'CRAFT CERTIFICATE', 'ARTISAN', 'DIPLOMA IN TVET'];
        return tvetPrograms.some(tvet => program.toUpperCase().includes(tvet));
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
    
    // Sync directly with courses module
    syncWithCoursesModule() {
        console.log('🔄 Syncing dashboard with courses module...');
        
        if (window.coursesModule) {
            // Get the active course count directly from courses module
            const activeCount = window.coursesModule.getActiveCourseCount 
                ? window.coursesModule.getActiveCourseCount() 
                : 0;
            
            if (this.elements.activeCourses) {
                this.elements.activeCourses.textContent = activeCount;
            }
            
            console.log(`✅ Synced: ${activeCount} active courses from coursesModule`);
            
            // If courses module has all courses, cache them
            if (window.coursesModule.getAllCourses) {
                this.cachedCourses = window.coursesModule.getAllCourses();
            }
            
            // Trigger an update to ensure consistency
            this.triggerMetricsUpdate();
            
        } else {
            console.log('⚠️ coursesModule not available yet, will retry...');
            setTimeout(() => this.syncWithCoursesModule(), 2000);
        }
    }
    
    // Update other metrics that depend on courses
    updateCourseBasedMetrics() {
        if (this.cachedCourses.length > 0) {
            // Update any other metrics that might use course data
            console.log(`📊 Course-based metrics updated with ${this.cachedCourses.length} courses`);
        }
    }
    
    // Trigger metrics update
    triggerMetricsUpdate() {
        const event = new CustomEvent('dashboardMetricsUpdated', {
            detail: {
                activeCourses: this.elements.activeCourses?.textContent,
                timestamp: new Date().toISOString()
            }
        });
        document.dispatchEvent(event);
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
        
        // Header time
        if (this.elements.headerTime) {
            this.elements.headerTime.textContent = 'Loading...';
        }
    }
    
    showErrorStates() {
        // Show error states
        if (this.elements.attendanceRate) this.elements.attendanceRate.textContent = '--%';
        if (this.elements.verifiedCount) this.elements.verifiedCount.textContent = '--';
        if (this.elements.totalCount) this.elements.totalCount.textContent = '--';
        if (this.elements.pendingCount) this.elements.pendingCount.textContent = '--';
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
                if (this.elements.verifiedCount) this.elements.verifiedCount.textContent = '--';
                if (this.elements.totalCount) this.elements.totalCount.textContent = '--';
                if (this.elements.pendingCount) this.elements.pendingCount.textContent = '--';
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
        // Update header time
        if (this.elements.headerTime) {
            const updateHeaderTime = () => {
                const now = new Date();
                const timeString = now.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                });
                this.elements.headerTime.textContent = timeString;
            };
            
            updateHeaderTime();
            setInterval(updateHeaderTime, 60000);
        }
        
        // Update footer time (if exists)
        if (this.elements.currentDateTime) {
            const updateFooterTime = () => {
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
            
            updateFooterTime();
            setInterval(updateFooterTime, 60000);
        }
    }
    
    async refreshDashboard() {
        console.log('🔄 Manually refreshing dashboard...');
        
        this.showLoadingStates();
        
        await Promise.allSettled([
            this.loadAttendanceMetrics(),
            this.loadCourseMetrics(), // Will use cached/synced data first
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

// Global sync function
window.syncDashboardCourses = () => {
    if (dashboardModule) {
        dashboardModule.syncWithCoursesModule();
    } else if (window.coursesModule) {
        // Force dashboard to match courses module
        const activeCount = window.coursesModule.getActiveCourseCount 
            ? window.coursesModule.getActiveCourseCount() 
            : 0;
        
        const activeElement = document.getElementById('dashboard-active-courses');
        if (activeElement) {
            activeElement.textContent = activeCount;
        }
        console.log(`✅ Manual sync: Dashboard courses = ${activeCount}`);
    }
};

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
                    
                    // Dispatch ready event
                    setTimeout(() => {
                        const event = new CustomEvent('dashboardReady');
                        document.dispatchEvent(event);
                    }, 500);
                }
            } else {
                // If courses module loads first, sync with it
                if (window.coursesModule && !dashboardModule) {
                    console.log('📚 Courses module loaded first, syncing when dashboard ready');
                }
            }
        };
        
        // Try multiple times
        tryInit();
        setTimeout(tryInit, 1000);
        setTimeout(tryInit, 3000);
        
        // Also sync when courses module is ready
        document.addEventListener('coursesModuleReady', tryInit);
    }
});

console.log('✅ UPDATED Dashboard module loaded (with Header Integration)');
