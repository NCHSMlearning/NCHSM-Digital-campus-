// dashboard.js - COMPLETE WORKING VERSION WITH GOOGLE ANALYTICS
// ============================================================
// FIXES APPLIED:
// 1. ✅ TOTAL POINTS now includes Gamification Bonus from RPC
// 2. ✅ XP calculation uses RPC data
// 3. ✅ Leaderboard shows correct points
// 4. ✅ Streak system working
// 5. ✅ Time greeting fixed for Kenya time
// 6. ✅ Navigation working
// 7. ✅ My Units support
// 8. ✅ Uses total_points from RPC
// 9. ✅ NURSEIQ POINTS DISPLAY FIXED - Shows 34 instead of 0
// 10. ✅ GOOGLE ANALYTICS INTEGRATION - Full tracking
// ============================================================

class DashboardModule {
    constructor(supabaseClient) {
        console.log('🚀 Initializing DashboardModule...');
        
        const candidates = [
            supabaseClient,
            window.sb,
            window.supabaseClient,
            window.db?.supabase,
            window.NCHSMLogin?.supabase,
            window.supabase
        ];
        this.sb = candidates.find(client =>
            client &&
            typeof client.from === 'function' &&
            client.auth &&
            typeof client.auth.getSession === 'function'
        ) || null;
        this.userId = null;
        this.userProfile = null;
        this.autoRefreshInterval = null;
        this.gamificationPoints = 0;
        this.totalPoints = 0;
        this.nurseIQPoints = 0;
         
        this.CACHE_DURATION = 120000;
        this.cacheKey = null;
        
        this.metrics = {
            attendance: { rate: 0, verified: 0, total: 0, pending: 0, points: 0 },
            resources: 0,
            examCard: { approved: 0, eligible: false },
            nurseiq: { progress: 0, accuracy: 0, questions: 0, points: 0, score: 0 },
            courses: 0,
            exams: 'No upcoming exams',
            xp: { current: 0, max: 100, level: 1, percent: 0, total: 0 },
            nextExam: null,
            reviews: { total: 0, avg: 0, pending: 0 },
            newsletter: { subscribed: false, latest: null },
            login: { count: 0, points: 0, streak: 0, maxStreak: 0, streakRestores: 0 },
            gamification: { points: 0, achievements: [] },
            totalPoints: 0,
            nurseiqPoints: 0
        };
        
        // ============================================================
        // 📊 GOOGLE ANALYTICS CONFIG
        // ============================================================
        this.GA_MEASUREMENT_ID = 'G-WTZRYGB8PE'; // Your Measurement ID
        
        this.cacheElements();
        this.setupEventListeners();
        this.setupClickableStats();
        this.startLiveClock();
        
        console.log('✅ DashboardModule initialized');
    }
    
    // ============================================================
    // 🕐 TIME HELPERS - FIXED FOR KENYA TIME
    // ============================================================
    
    getKenyaNow() {
        const now = new Date();
        return new Date(now.toLocaleString('en-US', { 
            timeZone: 'Africa/Nairobi' 
        }));
    }
    
    formatKenyaDate(date) {
        if (!date) return 'N/A';
        const d = new Date(date);
        return d.toLocaleDateString('en-KE', {
            timeZone: 'Africa/Nairobi',
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }
    
    formatKenyaTime(date) {
        if (!date) return 'N/A';
        const d = new Date(date);
        return d.toLocaleTimeString('en-KE', {
            timeZone: 'Africa/Nairobi',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    }
    
    getTimeAgo(date) {
        if (!date) return 'First login';
        try {
            const kenyaTime = new Date(new Date(date).toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
            const now = this.getKenyaNow();
            const diffMs = now - kenyaTime;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);
            
            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
            if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
            return this.formatKenyaDate(date);
        } catch (error) {
            return 'Unknown';
        }
    }
    
    // ============================================================
    // 🔧 TIME GREETING - FIXED TO USE ACTUAL TIME
    // ============================================================
    
    updateTimeGreeting() {
        const kenyaNow = this.getKenyaNow();
        const hour = kenyaNow.getHours();
        let greeting = '';
        let emoji = '';
        
        if (hour >= 5 && hour < 12) {
            greeting = 'Good Morning';
            emoji = '☀️';
        } else if (hour >= 12 && hour < 17) {
            greeting = 'Good Afternoon';
            emoji = '🌤️';
        } else if (hour >= 17 && hour < 21) {
            greeting = 'Good Evening';
            emoji = '🌅';
        } else {
            greeting = 'Good Night';
            emoji = '🌙';
        }
        if (this.elements.dashboardHeroGreeting) {
            this.elements.dashboardHeroGreeting.textContent = greeting;
        }
        if (this.elements.dashboardHeroName) {
            this.elements.dashboardHeroName.textContent =
                this.userProfile?.full_name || this.elements.welcomeStudentName?.textContent || 'Student';
        }
        if (this.elements.dashboardHeroEmoji) {
            this.elements.dashboardHeroEmoji.textContent = '👋';
        }

        const headerTime = this.elements.headerTime || document.getElementById('header-time-dashboard');
        if (headerTime) {
            headerTime.textContent = kenyaNow.toLocaleTimeString('en-KE', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
                timeZone: 'Africa/Nairobi'
            });
        }
        
        console.log(`🕐 Time greeting updated: ${greeting} (${hour}:00)`);
    }
    
    // ============================================================
    // 📦 CACHE ELEMENTS
    // ============================================================
    
    cacheElements() {
        this.elements = {
            attendanceRate: document.getElementById('dashboard-attendance-rate'),
            verifiedCount: document.getElementById('dashboard-verified-count'),
            totalCount: document.getElementById('dashboard-total-count'),
            pendingCount: document.getElementById('dashboard-pending-count'),
            attendancePoints: document.getElementById('attendance-points-value'),
            activeCourses: document.getElementById('dashboard-active-courses'),
            examStatus: document.getElementById('dashboard-exam-status'),
            approvedUnits: document.getElementById('dashboard-approved-units'),
            resources: document.getElementById('dashboard-new-resources'),
            upcomingExam: document.getElementById('dashboard-upcoming-exam'),
            nurseiqProgress: document.getElementById('dashboard-nurseiq-progress'),
            nurseiqAccuracy: document.getElementById('dashboard-nurseiq-accuracy'),
            nurseiqQuestions: document.getElementById('dashboard-nurseiq-questions'),
            nurseiqPoints: document.getElementById('dashboard-nurseiq-points'),
            welcomeStudentName: document.getElementById('welcome-student-name'),
            currentBlock: document.getElementById('dashboard-current-block-value'),
            programName: document.getElementById('dashboard-program-name'),
            intakeYear: document.getElementById('dashboard-intake-year'),
            userLevel: document.getElementById('user-level'),
            userXp: document.getElementById('user-xp'),
            userXpMax: document.getElementById('user-xp-max'),
            xpProgressFill: document.getElementById('xp-progress-fill'),
            announcementText: document.getElementById('student-announcement'),
            reviewsAvg: document.getElementById('dashboard-reviews-avg'),
            reviewsTotal: document.getElementById('dashboard-reviews-total'),
            reviewsPending: document.getElementById('dashboard-reviews-pending'),
            newsletterStatus: document.getElementById('dashboard-newsletter-status'),
            newsletterLatest: document.getElementById('dashboard-newsletter-latest'),
            nextExamWidget: document.querySelector('.next-exam-widget'),
            nextExamDetails: document.getElementById('next-exam-details'),
            lastLoginTime: document.getElementById('last-login-time'),
            headerTime: document.getElementById('header-time') || document.getElementById('header-time-dashboard'),
            dashboardLastUpdated: document.getElementById('dashboard-last-updated'),
            dashboardStudentId: document.getElementById('dashboard-student-id'),
            dailyStreakDisplay: document.getElementById('daily-streak-display'),
            dailyStreakValue: document.getElementById('daily-streak-value'),
            streakStatusText: document.getElementById('streak-status-text'),
            streakProgressFill: document.getElementById('streak-progress-fill'),
            streakRestoreBtn: document.getElementById('streak-restore-btn'),
            streakEmoji: document.getElementById('streak-emoji'),
            streakLights: document.querySelectorAll('.streak-light'),
            streakMilestones: document.querySelectorAll('.milestone'),
            loginPointsDisplay: document.getElementById('login-points-display'),
            loginCountDisplay: document.getElementById('login-count-display'),
            totalPointsDisplay: document.getElementById('total-points-display'),
            gamificationPointsDisplay: document.getElementById('gamification-points-display'),
            nurseiqStatsDisplay: document.querySelector('.nurseiq-stats') || document.getElementById('nurseiq-stats'),

            dashboardNurseIQPoints: document.getElementById('dashboard-nurseiq-points'),
            progressAttendance: document.getElementById('dashboard-attendance-rate'),
            progressAssignments: document.getElementById('dashboard-verified-count'),
            progressExams: document.getElementById('dashboard-pending-count'),
            progressOverall: document.getElementById('dashboard-upcoming-exam'),
            progressAttendanceRing: document.getElementById('nd-ring-attendance'),
            progressAssignmentsRing: document.getElementById('nd-ring-verified'),
            progressExamsRing: document.getElementById('nd-ring-pending'),
            progressOverallRing: document.getElementById('nd-ring-exams'),
            dashboardEvents: document.querySelector('.nchsm-events'),
            dashboardCourses: document.querySelector('.nchsm-courses'),
            dashboardLeaderboard: document.querySelector('.nchsm-leaderboard'),
            dashboardHeroGreeting: document.getElementById('greeting-text'),
            dashboardHeroName: document.getElementById('welcome-student-name'),
            dashboardHeroEmoji: document.getElementById('greeting-emoji'),
            dashboardHeroMessage: document.getElementById('student-welcome-message')
        };
    }
    
    // ============================================================
    // 🖱️ CLICKABLE STATS - COMPLETE FIX
    // ============================================================
    
    setupClickableStats() {
        console.log('🖱️ Setting up clickable stats...');
        
        const navigateToSection = (tabId, sourceElement) => {
            console.log(`📍 Navigating to: ${tabId}`);
            this.navigateTo(tabId);
            
            if (sourceElement) {
                sourceElement.style.transition = 'box-shadow 0.3s ease';
                sourceElement.style.boxShadow = '0 0 0 3px #4C1D95, 0 4px 15px rgba(76, 29, 149, 0.3)';
                setTimeout(() => { sourceElement.style.boxShadow = ''; }, 2000);
            }
        };
        
        document.querySelectorAll('.attendance-card').forEach(el => {
            el.style.cursor = 'pointer';
            el.title = 'Click to view Attendance';
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                navigateToSection('attendance', el);
            });
        });
        
        document.querySelectorAll('.mini-card[data-tab]').forEach(el => {
            const tabId = el.dataset.tab;
            el.style.cursor = 'pointer';
            el.title = `Click to view ${tabId.replace('-', ' ')}`;
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                navigateToSection(tabId, el);
            });
        });
        
        document.querySelectorAll('.nchsm-action[data-tab], .nchsm-view-btn[data-tab]').forEach(el => {
            if (el.dataset.dashboardBound === '1') return;
            el.dataset.dashboardBound = '1';
            const tabId = el.dataset.tab;
            el.style.cursor = 'pointer';
            el.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                navigateToSection(tabId, el);
            });
        });

        document.querySelectorAll('.action-btn[data-tab]').forEach(el => {
            const tabId = el.dataset.tab;
            el.style.cursor = 'pointer';
            el.title = `Click to view ${tabId.replace('-', ' ')}`;
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                navigateToSection(tabId, el);
            });
        });
        
        const nextExamWidget = document.querySelector('.next-exam-widget');
        if (nextExamWidget) {
            nextExamWidget.style.cursor = 'pointer';
            nextExamWidget.title = 'Click to view Exams';
            nextExamWidget.addEventListener('click', (e) => {
                e.stopPropagation();
                navigateToSection('cats', nextExamWidget);
            });
        }
        
        document.querySelectorAll('.xp-area').forEach(el => {
            el.style.cursor = 'pointer';
            el.title = 'Click to view Profile';
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                navigateToSection('profile', el);
            });
        });
        
        const announcement = document.querySelector('.announcement');
        if (announcement) {
            announcement.style.cursor = 'pointer';
            announcement.title = 'Click to view Messages';
            announcement.addEventListener('click', (e) => {
                e.stopPropagation();
                navigateToSection('messages', announcement);
            });
        }
        
        const restoreBtn = document.getElementById('streak-restore-btn');
        if (restoreBtn) {
            restoreBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.restoreStreak();
            });
        }
        
        console.log('✅ Clickable stats configured');
    }
    
    // ============================================================
    // 🔄 NAVIGATE TO TAB - COMPLETE FIX
    // ============================================================
    
    navigateTo(section) {
        console.log(`📍 Navigating to: ${section}`);
        
        // ✅ Track navigation with Google Analytics
        this.trackPageView(section);
        this.trackFeatureUsage('tab_' + section);
        
        const tabMap = {
            'attendance': 'attendance',
            'cats': 'cats',
            'hub-courses': 'hub-courses',
            'my-units': 'hub-courses',
            'myunits': 'hub-courses',
            'courses': 'hub-courses',
            'profile': 'profile',
            'resources': 'resources',
            'nurseiq': 'nurseiq',
            'hub-exam-card': 'hub-exam-card',
            'examCard': 'hub-exam-card',
            'exams': 'cats',
            'calendar': 'calendar',
            'dashboard': 'dashboard',
            'reviews': 'reviews',
            'newsletter': 'newsletter',
            'streak': 'profile',
            'messages': 'messages',
            'support-tickets': 'support-tickets',
            'finance': 'finance',
            'hub-register': 'hub-register',
            'hub-lecture-card': 'hub-lecture-card'
        };
        
        const tabName = tabMap[section] || section;
        
        const navLink = document.querySelector(`.nav a[data-tab="${tabName}"]`);
        if (navLink) {
            navLink.click();
            this.showToast(`📂 ${section.replace('-', ' ').toUpperCase()}`, 1500);
            return;
        }
        
        const tabContent = document.getElementById(tabName);
        if (tabContent) {
            document.querySelectorAll('.tab-content').forEach(t => {
                t.classList.remove('active');
                t.style.display = 'none';
            });
            
            tabContent.classList.add('active');
            tabContent.style.display = 'block';
            
            document.querySelectorAll('.nav a').forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('data-tab') === tabName) {
                    link.classList.add('active');
                }
            });
            
            this.showToast(`📂 ${section.replace('-', ' ').toUpperCase()}`, 1500);
            return;
        }
        
        this.showToast(`📂 ${section.replace('-', ' ').toUpperCase()} section`, 2000);
    }
    
    // ============================================================
    // 🎯 EVENT LISTENERS
    // ============================================================
    
    setupEventListeners() {
        document.addEventListener('nurseiqMetricsUpdated', (e) => {
            if (e.detail) {
                this.metrics.nurseiq = {
                    progress: e.detail.progress || 0,
                    accuracy: e.detail.accuracy || 0,
                    questions: e.detail.totalQuestions || 0,
                    points: e.detail.points || 0
                };
                this.updateUIFromMetrics();
                this.saveToCache();
                
                // ✅ Track NurseIQ activity
                this.trackNurseIQActivity('practice', e.detail.correct || 0, e.detail.totalQuestions || 0);
            }
        });
        
        document.addEventListener('attendanceCheckedIn', (e) => {
            this.loadAllMetrics();
            // ✅ Track attendance check-in
            if (e.detail) {
                this.trackAttendanceCheckin(e.detail.sessionType || 'class', e.detail.location || 'unknown');
            }
        });
        
        document.addEventListener('reviewsUpdated', () => {
            this.loadReviewsSnapshot();
        });
        
        document.addEventListener('newsletterUpdated', () => {
            this.loadNewsletterSnapshot();
        });
        
        document.querySelectorAll('.leaderboard-tabs span').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.leaderboard-tabs span').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const period = tab.innerText.trim().toLowerCase();
                this.loadLeaderboardData(period);
            });
        });
        
        // ✅ Track when user leaves the page
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.trackEngagement('session_end', Date.now());
            }
        });
    }
    
    // ============================================================
    // 📊 GOOGLE ANALYTICS TRACKING METHODS
    // ============================================================
    
    /**
     * Initialize Google Analytics tracking
     * Call this after user login
     */
    initAnalytics() {
        // Check if gtag is loaded
        if (typeof gtag === 'undefined') {
            console.warn('⚠️ Google Analytics not loaded');
            return;
        }
        
        // Set user ID for cross-device tracking
        if (this.userId) {
            gtag('config', this.GA_MEASUREMENT_ID, {
                'user_id': this.userId
            });
        }
        
        console.log('📊 Google Analytics initialized for user:', this.userId);
    }

    /**
     * Track page/tab views
     * Call this when user navigates between tabs
     */
    trackPageView(tabName) {
        if (typeof gtag === 'undefined') return;
        
        const pageTitle = tabName.charAt(0).toUpperCase() + tabName.slice(1);
        gtag('event', 'page_view', {
            'page_title': pageTitle,
            'page_path': '/tab/' + tabName,
            'engagement_time_msec': 100
        });
        
        console.log(`📊 Page view tracked: ${pageTitle}`);
    }

    /**
     * Track user login
     * Call this when user successfully logs in
     */
    trackUserLogin(email) {
        if (typeof gtag === 'undefined') return;
        
        gtag('event', 'login', {
            'method': 'email',
            'user_id': this.userId
        });
        
        console.log('📊 User login tracked');
    }

    /**
     * Track exam completions
     * Call this when a student completes an exam
     */
    trackExamCompletion(courseName, score, totalMarks) {
        if (typeof gtag === 'undefined') return;
        
        const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
        
        gtag('event', 'exam_completed', {
            'event_category': 'Assessment',
            'event_label': courseName,
            'value': percentage
        });
        
        console.log(`📊 Exam tracked: ${courseName} - ${percentage}%`);
    }

    /**
     * Track attendance check-in
     * Call this when a student checks in
     */
    trackAttendanceCheckin(sessionType, location) {
        if (typeof gtag === 'undefined') return;
        
        gtag('event', 'attendance_checkin', {
            'event_category': 'Attendance',
            'event_label': sessionType,
            'value': 1
        });
        
        console.log(`📊 Attendance tracked: ${sessionType}`);
    }

    /**
     * Track resource views/downloads
     * Call this when a student views or downloads a resource
     */
    trackResourceAction(action, resourceName, resourceType) {
        if (typeof gtag === 'undefined') return;
        
        gtag('event', 'resource_' + action, {
            'event_category': 'Resources',
            'event_label': resourceName,
            'resource_type': resourceType || 'unknown'
        });
        
        console.log(`📊 Resource tracked: ${action} - ${resourceName}`);
    }

    /**
     * Track finance/payment activity
     * Call this when a student makes a payment
     */
    trackPayment(amount, method, period) {
        if (typeof gtag === 'undefined') return;
        
        gtag('event', 'payment', {
            'event_category': 'Finance',
            'event_label': method,
            'value': amount,
            'period': period || 'current'
        });
        
        console.log(`📊 Payment tracked: KES ${amount} via ${method}`);
    }

    /**
     * Track course registration
     * Call this when a student registers for units
     */
    trackCourseRegistration(units, count) {
        if (typeof gtag === 'undefined') return;
        
        gtag('event', 'course_registration', {
            'event_category': 'Enrollment',
            'event_label': units.join(', '),
            'value': count
        });
        
        console.log(`📊 Course registration tracked: ${count} units`);
    }

    /**
     * Track NurseIQ activity
     * Call this when a student answers questions
     */
    trackNurseIQActivity(action, correct, total) {
        if (typeof gtag === 'undefined') return;
        
        gtag('event', 'nurseiq_' + action, {
            'event_category': 'NurseIQ',
            'event_label': `${correct}/${total} correct`,
            'value': Math.round((correct/total) * 100)
        });
        
        console.log(`📊 NurseIQ tracked: ${action} - ${correct}/${total}`);
    }

    /**
     * Track user engagement (time spent on page)
     * Call this periodically or on tab switches
     */
    trackEngagement(action, duration) {
        if (typeof gtag === 'undefined') return;
        
        gtag('event', 'engagement', {
            'event_category': 'User Activity',
            'event_label': action,
            'value': duration || 0
        });
    }

    /**
     * Track errors/exceptions
     * Call this when errors occur
     */
    trackError(errorMessage, errorSource) {
        if (typeof gtag === 'undefined') return;
        
        gtag('event', 'exception', {
            'description': errorMessage,
            'fatal': false,
            'source': errorSource || 'dashboard'
        });
    }

    /**
     * Track feature usage
     * Call this for any feature a student uses
     */
    trackFeatureUsage(featureName) {
        if (typeof gtag === 'undefined') return;
        
        gtag('event', 'feature_used', {
            'event_category': 'Features',
            'event_label': featureName,
            'value': 1
        });
        
        console.log(`📊 Feature tracked: ${featureName}`);
    }

    /**
     * Track newsletter subscription
     */
    trackNewsletterAction(action) {
        if (typeof gtag === 'undefined') return;
        
        gtag('event', 'newsletter_' + action, {
            'event_category': 'Newsletter'
        });
        
        console.log(`📊 Newsletter action tracked: ${action}`);
    }

    /**
     * Track review submission
     */
    trackReviewSubmission(category, rating) {
        if (typeof gtag === 'undefined') return;
        
        gtag('event', 'review_submitted', {
            'event_category': 'Reviews',
            'event_label': category,
            'value': rating
        });
        
        console.log(`📊 Review tracked: ${category} - ${rating} stars`);
    }
    
    // ============================================================
    // 🚀 INITIALIZE
    // ============================================================
    
    async initialize(userId, userProfile) {
        console.log('👤 Dashboard initializing...');
        
        this.userId = userId;
        this.userProfile = userProfile;
        this.cacheKey = `dashboard_${this.userId}`;

        const displayName = userProfile?.full_name || 'Student';
        ['header-user-name','sidebarUserName'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = displayName;
        });
        
        if (!userId || !userProfile) return false;
        
        if (this.elements.welcomeStudentName && userProfile.full_name) {
            this.elements.welcomeStudentName.innerText = userProfile.full_name;
        }
        
        await this.fetchGamificationPoints();
        
        this.updateTimeGreeting();
        this.updateLastLoginDisplay();
        
        if (this.elements.currentBlock) {
            this.elements.currentBlock.innerText = userProfile.block || 'Introductory';
        }
        if (this.elements.programName) {
            this.elements.programName.innerText = userProfile.program || 'Not assigned';
        }
        if (this.elements.intakeYear) {
            this.elements.intakeYear.innerText = userProfile.intake_year || 'Not assigned';
        }
        if (this.elements.dashboardStudentId) {
            this.elements.dashboardStudentId.innerText = userProfile.student_id || userProfile.user_id?.substring(0, 8) || 'N/A';
        }
        
        // ============================================================
        // 🔥 GOOGLE ANALYTICS INITIALIZATION
        // ============================================================
        this.initAnalytics();
        this.trackUserLogin(userProfile.email || userId);
        this.trackFeatureUsage('dashboard_view');
        console.log('📊 Google Analytics tracking enabled for user:', userId);
        
        await this.loadAllMetrics();
        this.startAutoRefresh();
        
        // ✅ FIX: Ensure NurseIQ is displayed after loading
        setTimeout(() => {
            this.fixNurseIQDisplay();
        }, 1500);
        
        return true;
    }
    
    // ============================================================
    // 🔧 FIX NURSEIQ POINTS DISPLAY
    // ============================================================
    
    async fixNurseIQDisplay() {
        console.log('🔧 Fixing NurseIQ display...');
        
        try {
            if (!this.userId || !this.sb) {
                console.warn('⚠️ Cannot fix NurseIQ: No userId or Supabase client');
                return;
            }
            
            // Get NurseIQ points from database directly
            const { data, error } = await this.sb
                .from('consolidated_user_profiles_table')
                .select('nurseiq_points, total_points, gamification_points, login_count')
                .eq('user_id', this.userId)
                .single();
            
            if (error) {
                console.error('Error fetching NurseIQ:', error);
                // Try fallback from RPC
                const { data: rpcData } = await this.sb.rpc('get_student_dashboard', {
                    p_user_id: this.userId
                });
                if (rpcData) {
                    const points = rpcData?.nurseiq?.points || 0;
                    this.nurseIQPoints = points;
                    this.metrics.nurseiq.points = points;
                    if (this.elements.nurseiqPoints) {
                        this.elements.nurseiqPoints.innerText = points;
                    }
                    console.log(`✅ NurseIQ points from RPC: ${points}`);
                    return;
                }
                return;
            }
            
            const nurseiqPoints = data?.nurseiq_points || 0;
            const totalPoints = data?.total_points || 0;
            const gamificationPoints = data?.gamification_points || 0;
            const loginCount = data?.login_count || 0;
            
            console.log(`📊 Database NurseIQ: ${nurseiqPoints}`);
            console.log(`📊 Database Total: ${totalPoints}`);
            console.log(`🏆 Gamification: ${gamificationPoints}`);
            
            // Store in metrics
            this.nurseIQPoints = nurseiqPoints;
            this.metrics.nurseiqPoints = nurseiqPoints;
            this.metrics.totalPoints = totalPoints;
            this.gamificationPoints = gamificationPoints;
            
            if (this.metrics.nurseiq) {
                this.metrics.nurseiq.points = nurseiqPoints;
            }
            
            // ✅ Update the UI elements directly
            if (this.elements.nurseiqPoints) {
                this.elements.nurseiqPoints.innerText = nurseiqPoints;
            }
            if (this.elements.dashboardNurseIQPoints) {
                this.elements.dashboardNurseIQPoints.textContent = nurseiqPoints;
            }
            if (!this.elements.nurseiqPoints && !this.elements.dashboardNurseIQPoints) {
                console.warn('⚠️ NurseIQ points element not found');
            }
            
            if (this.elements.totalPointsDisplay) {
                this.elements.totalPointsDisplay.innerText = totalPoints;
                console.log(`✅ Total points set to: ${totalPoints}`);
            }
            
            if (this.elements.gamificationPointsDisplay) {
                this.elements.gamificationPointsDisplay.innerText = gamificationPoints;
            }
            
            // ✅ Update login count display
            if (this.elements.loginCountDisplay) {
                this.elements.loginCountDisplay.innerText = loginCount;
            }
            
            // ✅ Update login points (10 per login)
            const loginPoints = loginCount * 10;
            if (this.elements.loginPointsDisplay) {
                this.elements.loginPointsDisplay.innerText = loginPoints;
            }
            
            // ✅ Update the XP stats
            this.updateNurseIQStats(nurseiqPoints);
            
            // ✅ Update leaderboard
            this.loadLeaderboardData('all');
            
        } catch (error) {
            console.error('Error fixing NurseIQ display:', error);
        }
    }
    
    // ============================================================
    // 📊 UPDATE NURSEIQ STATS IN THE UI
    // ============================================================
    
    updateNurseIQStats(points) {
        console.log('📊 Updating NurseIQ stats...');
        
        // Update the NurseIQ card if it exists
        const nurseiqCard = document.querySelector('.mini-card[data-tab="nurseiq"]') || 
                           document.querySelector('.nurseiq-card');
        if (nurseiqCard) {
            const valueElement = nurseiqCard.querySelector('.stat-value') || 
                               nurseiqCard.querySelector('.value') || 
                               nurseiqCard.querySelector('.points');
            if (valueElement) {
                valueElement.textContent = `${points} pts`;
                console.log(`✅ Updated NurseIQ card to: ${points} pts`);
            }
        }
        
        // Update XP stats area
        const xpStats = document.querySelector('.xp-stats') || document.querySelector('.stats-grid');
        if (xpStats) {
            const items = xpStats.querySelectorAll('.stat-item');
            items.forEach(item => {
                const label = item.querySelector('.stat-label') || item.querySelector('.label');
                if (label && label.textContent.toLowerCase().includes('nurseiq')) {
                    const value = item.querySelector('.stat-value') || item.querySelector('.value');
                    if (value) {
                        value.textContent = `${points} pts`;
                        console.log(`✅ Updated XP stat to: ${points} pts`);
                    }
                }
            });
        }
    }
    
    // ============================================================
    // 🏆 FETCH GAMIFICATION POINTS
    // ============================================================
    
    async fetchGamificationPoints() {
        if (!this.userId || !this.sb) return 0;
        
        try {
            const { data, error } = await this.sb
                .from('consolidated_user_profiles_table')
                .select('gamification_points, earned_badges, total_points, nurseiq_points')
                .eq('user_id', this.userId)
                .single();
            
            if (error) throw error;
            
            this.gamificationPoints = data?.gamification_points || 0;
            this.totalPoints = data?.total_points || 0;
            this.nurseIQPoints = data?.nurseiq_points || 0;
            
            this.metrics.gamification.points = this.gamificationPoints;
            this.metrics.gamification.achievements = data?.earned_badges || [];
            this.metrics.totalPoints = this.totalPoints;
            this.metrics.nurseiqPoints = this.nurseIQPoints;
            
            if (this.metrics.nurseiq) {
                this.metrics.nurseiq.points = this.nurseIQPoints;
            }
            
            console.log(`🏆 Gamification points: ${this.gamificationPoints}`);
            console.log(`💰 Total points: ${this.totalPoints}`);
            console.log(`🧠 NurseIQ points: ${this.nurseIQPoints}`);
            
            return this.gamificationPoints;
            
        } catch (error) {
            console.error('Error fetching gamification points:', error);
            return 0;
        }
    }
    
    // ============================================================
    // 📊 CALCULATE TOTAL POINTS - FIXED!
    // ============================================================
    
    calculateTotalPoints() {
        // Use stored total points from RPC if available
        if (this.metrics.totalPoints > 0) {
            return this.metrics.totalPoints;
        }
        
        // Fallback calculation
        const loginPoints = (this.metrics.login?.count || 0) * 10;
        const attendancePoints = (this.metrics.attendance?.verified || 0) * 10;
        const nurseIQPoints = this.metrics.nurseiq?.points || this.nurseIQPoints || 0;
        const gamificationPoints = this.gamificationPoints || 0;
        
        return loginPoints + attendancePoints + nurseIQPoints + gamificationPoints;
    }
    
    // ============================================================
    // 👤 LAST LOGIN DISPLAY
    // ============================================================
    
    updateLastLoginDisplay() {
        const element = this.elements.lastLoginTime;
        if (!element) return;
        
        this.sb
            .from('user_sessions')
            .select('login_time, device_info')
            .eq('user_id', this.userId)
            .order('login_time', { ascending: false })
            .limit(1)
            .then(({ data, error }) => {
                if (error || !data || data.length === 0) {
                    element.textContent = 'First login';
                    return;
                }
                
                const loginTime = data[0].login_time;
                const deviceInfo = data[0].device_info || 'Unknown Device';
                
                const loginDate = new Date(loginTime);
                const timeStr = loginDate.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                    timeZone: 'Africa/Nairobi'
                });
                const dateStr = loginDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    timeZone: 'Africa/Nairobi'
                });
                
                element.textContent = `${dateStr} at ${timeStr} from ${deviceInfo}`;
            })
            .catch(() => {
                element.textContent = 'Could not load';
            });
    }
    
    // ============================================================
    // 🔥 DAILY STREAK
    // ============================================================
    
    async calculateDailyStreak() {
        try {
            if (!this.userId || !this.sb) return { streak: 0, maxStreak: 0, restores: 0 };
            
            const { data: sessions, error } = await this.sb
                .from('user_sessions')
                .select('login_time')
                .eq('user_id', this.userId)
                .order('login_time', { ascending: false });
            
            if (error) throw error;
            if (!sessions || sessions.length === 0) {
                return { streak: 0, maxStreak: 0, restores: 0 };
            }
            
            const uniqueDates = [];
            const seenDates = new Set();
            
            for (const session of sessions) {
                const loginDate = new Date(session.login_time);
                loginDate.setHours(0, 0, 0, 0);
                const dateKey = loginDate.toISOString().split('T')[0];
                
                if (!seenDates.has(dateKey)) {
                    seenDates.add(dateKey);
                    uniqueDates.push(loginDate);
                }
            }
            
            uniqueDates.sort((a, b) => b - a);
            
            const today = this.getKenyaNow();
            today.setHours(0, 0, 0, 0);
            
            let currentStreak = 0;
            let maxStreak = 0;
            
            if (uniqueDates.length > 0) {
                const lastLogin = uniqueDates[0];
                const diffDays = Math.floor((today - lastLogin) / (1000 * 60 * 60 * 24));
                
                if (diffDays === 0 || diffDays === 1) {
                    currentStreak = 1;
                    
                    for (let i = 1; i < uniqueDates.length; i++) {
                        const prevDate = uniqueDates[i];
                        const expectedDate = new Date(lastLogin);
                        expectedDate.setDate(expectedDate.getDate() - i);
                        expectedDate.setHours(0, 0, 0, 0);
                        
                        if (prevDate.getTime() === expectedDate.getTime()) {
                            currentStreak++;
                        } else {
                            break;
                        }
                    }
                } else if (diffDays > 1) {
                    const { data: profile } = await this.sb
                        .from('consolidated_user_profiles_table')
                        .select('streak_data')
                        .eq('user_id', this.userId)
                        .single();
                    
                    const streakData = profile?.streak_data || {};
                    const restoresUsed = streakData.restores_used || 0;
                    
                    if (restoresUsed < 3 && streakData.current_streak > 0) {
                        currentStreak = streakData.current_streak || 0;
                    } else {
                        currentStreak = 0;
                    }
                }
                
                const { data: profile } = await this.sb
                    .from('consolidated_user_profiles_table')
                    .select('streak_data')
                    .eq('user_id', this.userId)
                    .single();
                
                const streakData = profile?.streak_data || {};
                maxStreak = Math.max(currentStreak, streakData.max_streak || 0);
                
                await this.sb
                    .from('consolidated_user_profiles_table')
                    .update({
                        streak_data: {
                            current_streak: currentStreak,
                            max_streak: maxStreak,
                            restores_used: streakData.restores_used || 0,
                            last_login_date: today.toISOString().split('T')[0]
                        }
                    })
                    .eq('user_id', this.userId);
            }
            
            const { data: profile } = await this.sb
                .from('consolidated_user_profiles_table')
                .select('streak_data')
                .eq('user_id', this.userId)
                .single();
            
            const streakData = profile?.streak_data || {};
            const restoresUsed = streakData.restores_used || 0;
            
            return { 
                streak: currentStreak, 
                maxStreak: maxStreak, 
                restores: restoresUsed,
                maxRestores: 3
            };
            
        } catch (error) {
            console.error('Error calculating streak:', error);
            return { streak: 0, maxStreak: 0, restores: 0, maxRestores: 3 };
        }
    }
    
    async restoreStreak() {
        console.log('🔥 Restoring streak...');
        
        if (!this.userId || !this.sb) {
            this.showToast('❌ Please log in first', 2000);
            return;
        }
        
        try {
            const { data: profile } = await this.sb
                .from('consolidated_user_profiles_table')
                .select('streak_data')
                .eq('user_id', this.userId)
                .single();
            
            let streakData = profile?.streak_data || {};
            let restoresUsed = streakData.restores_used || 0;
            let currentStreak = streakData.current_streak || 0;
            
            if (restoresUsed >= 3) {
                this.showToast('❌ No restores remaining! Max 3 per month.', 3000);
                return;
            }
            
            if (currentStreak === 0) {
                this.showToast('❌ No streak to restore! Start logging in daily.', 3000);
                return;
            }
            
            restoresUsed++;
            
            await this.sb
                .from('consolidated_user_profiles_table')
                .update({
                    streak_data: {
                        current_streak: currentStreak,
                        max_streak: streakData.max_streak || 0,
                        restores_used: restoresUsed,
                        last_login_date: this.getKenyaNow().toISOString().split('T')[0]
                    }
                })
                .eq('user_id', this.userId);
            
            this.metrics.login.streak = currentStreak;
            this.metrics.login.streakRestores = restoresUsed;
            
            this.updateStreakUI();
            
            this.showToast(`✅ Streak restored! You have ${3 - restoresUsed} restores left.`, 3000);
            
            await this.loadFreshData();
            
        } catch (error) {
            console.error('Error restoring streak:', error);
            this.showToast('❌ Failed to restore streak. Try again.', 2000);
        }
    }
    
    // ============================================================
    // 🎨 UPDATE STREAK UI
    // ============================================================
    
    updateStreakUI() {
        const streak = this.metrics.login.streak || 0;
        const restoresLeft = 3 - (this.metrics.login.streakRestores || 0);
        
        if (this.elements.dailyStreakDisplay) {
            this.elements.dailyStreakDisplay.innerText = streak;
        }
        if (this.elements.dailyStreakValue) {
            this.elements.dailyStreakValue.innerText = streak;
        }
        
        const lights = document.querySelectorAll('.streak-light');
        const lightCount = Math.min(streak, 5);
        
        lights.forEach((light, index) => {
            if (index < lightCount) {
                light.classList.add('active');
            } else {
                light.classList.remove('active');
            }
        });
        
        const fireEmoji = document.getElementById('streak-emoji');
        if (fireEmoji) {
            if (streak >= 1) {
                fireEmoji.style.opacity = '1';
                if (streak >= 30) {
                    fireEmoji.textContent = '🔥🔥🔥';
                } else if (streak >= 14) {
                    fireEmoji.textContent = '🔥🔥';
                } else {
                    fireEmoji.textContent = '🔥';
                }
            } else {
                fireEmoji.style.opacity = '0.3';
                fireEmoji.textContent = '🔥';
            }
        }
        
        const progressFill = document.getElementById('streak-progress-fill');
        if (progressFill) {
            let progress = 0;
            if (streak >= 30) {
                progress = 100;
            } else if (streak >= 1) {
                progress = Math.min((streak / 30) * 100, 100);
            }
            progressFill.style.width = progress + '%';
        }
        
        document.querySelectorAll('.milestone').forEach(el => {
            const day = parseInt(el.dataset.day);
            el.classList.remove('active', 'reached');
            if (streak >= day) {
                el.classList.add('reached');
            } else if (streak === day - 1) {
                el.classList.add('active');
            }
        });
        
        const statusText = document.getElementById('streak-status-text');
        if (statusText) {
            if (streak === 0) {
                statusText.textContent = '✨ Login today to start your streak!';
            } else if (streak === 1) {
                statusText.textContent = '🔥 Your streak has started! Keep going!';
            } else if (streak >= 30) {
                statusText.textContent = `👑 ${streak} days! You're a LEGEND! 🎉`;
            } else if (streak >= 14) {
                statusText.textContent = `💎 ${streak} days! You're on FIRE! 🔥`;
            } else if (streak >= 7) {
                statusText.textContent = `🌿 ${streak} days! You're growing strong! 💪`;
            } else if (streak >= 3) {
                statusText.textContent = `🌱 ${streak} days! Keep the momentum going!`;
            } else {
                statusText.textContent = `🔥 ${streak} day${streak > 1 ? 's' : ''}! Keep logging in!`;
            }
        }
        
        const restoreBtn = document.getElementById('streak-restore-btn');
        if (restoreBtn) {
            if (streak > 0 && restoresLeft > 0) {
                restoreBtn.style.display = 'inline-flex';
                restoreBtn.innerHTML = `💫 Restore (${restoresLeft} left)`;
            } else if (streak === 0 && restoresLeft > 0) {
                restoreBtn.style.display = 'inline-flex';
                restoreBtn.innerHTML = `💫 Start Streak (${restoresLeft} left)`;
            } else {
                restoreBtn.style.display = 'none';
            }
        }
    }
    
    // ============================================================
    // 📊 LOAD ALL METRICS
    // ============================================================
    
    async loadAllMetrics() {
        console.log('📊 Loading dashboard metrics...');

        if (this.cacheKey) {
            const cached = localStorage.getItem(this.cacheKey);
            if (cached) {
                try {
                    const { data, timestamp } = JSON.parse(cached);
                    if (data && Date.now() - timestamp < this.CACHE_DURATION) {
                        this.metrics = data;
                        this.updateUIFromMetrics();
                        console.log('ℹ️ Showing cached dashboard values while fresh data loads...');
                    }
                } catch (e) {
                    console.warn('⚠️ Ignoring invalid dashboard cache:', e);
                }
            }
        }

        return await this.loadFreshData();
    }

    // ============================================================
    // 📊 LOAD FRESH DATA - FIXED TO USE RPC DATA
    // ============================================================
    
    async loadFreshData() {
        console.log('📊 Loading fresh dashboard data...');
        
        try {
            if (!this.userId) {
                throw new Error('Dashboard user ID is not available.');
            }

            if (!this.sb ||
                typeof this.sb.from !== 'function' ||
                !this.sb.auth ||
                typeof this.sb.auth.getSession !== 'function') {
                throw new Error('Dashboard Supabase client is unavailable.');
            }

            const { data: sessionData, error: sessionError } = await this.sb.auth.getSession();
            if (sessionError) throw sessionError;
            if (!sessionData?.session?.user?.id) {
                throw new Error('No authenticated user session for dashboard.');
            }

            if (sessionData.session.user.id !== this.userId) {
                console.warn('⚠️ Dashboard user ID changed; synchronizing...');
                this.userId = sessionData.session.user.id;
                this.cacheKey = `dashboard_${this.userId}`;
            }

            const { data, error } = await this.sb.rpc('get_student_dashboard', {
                p_user_id: this.userId
            });
            
            if (error) throw error;
            
            // ✅ Store total points from RPC
            this.metrics.totalPoints = Number(data?.total_points ?? 0);
            this.totalPoints = this.metrics.totalPoints;

            // If the RPC omits point fields, recover them from the student's profile.
            // This does not fabricate values; it only reads the existing profile totals.
            try {
                const { data: profilePoints } = await this.sb
                    .from('consolidated_user_profiles_table')
                    .select('login_count, gamification_points, total_points, nurseiq_points, full_name')
                    .eq('user_id', this.userId)
                    .maybeSingle();
                if (profilePoints) {
                    if (!this.metrics.totalPoints && profilePoints.total_points != null) {
                        this.metrics.totalPoints = Number(profilePoints.total_points) || 0;
                        this.totalPoints = this.metrics.totalPoints;
                    }
                    if (!this.gamificationPoints && profilePoints.gamification_points != null) {
                        this.gamificationPoints = Number(profilePoints.gamification_points) || 0;
                    }
                    if (!this.nurseIQPoints && profilePoints.nurseiq_points != null) {
                        this.nurseIQPoints = Number(profilePoints.nurseiq_points) || 0;
                    }
                    if ((!data?.login?.count || !data?.login?.points) && profilePoints.login_count != null) {
                        const count = Number(profilePoints.login_count) || 0;
                        this.metrics.login = { ...(this.metrics.login || {}), count, points: count * 10 };
                    }
                    if (profilePoints.full_name && this.userProfile) {
                        this.userProfile.full_name = this.userProfile.full_name || profilePoints.full_name;
                    }
                }
            } catch (profilePointError) {
                console.warn('Profile point fallback unavailable:', profilePointError);
            }
            
            // ✅ Store gamification data
            this.gamificationPoints = Number(data?.gamification?.points ?? this.gamificationPoints ?? 0);
            this.metrics.gamification = {
                points: this.gamificationPoints,
                achievements: data?.gamification?.badges || []
            };
            
            // ✅ Login data
            const loginCount = data?.login?.count || 0;
            const loginPoints = data?.login?.points || 0;
            
            this.metrics.login = { 
                count: loginCount, 
                points: loginPoints, 
                streak: data?.login?.streak || 0,
                maxStreak: data?.login?.maxStreak || 0,
                streakRestores: data?.login?.restores || 0
            };
            
            // Attendance data
            this.metrics.attendance = data.attendance || { 
                rate: 0, verified: 0, total: 0, pending: 0, points: 0 
            };
            this.metrics.attendance.points = (this.metrics.attendance.verified || 0) * 10;
            
            // Exam card data
            this.metrics.examCard = data.examCard || { approved: 0, eligible: false };
            
            // ✅ FIXED: NurseIQ data - PRESERVE ALL FIELDS
            this.metrics.nurseiq = {
                questions: data?.nurseiq?.questions || 0,
                score: data?.nurseiq?.score || 0,
                accuracy: data?.nurseiq?.accuracy || 0,
                progress: data?.nurseiq?.progress || 0,
                points: Number(data?.nurseiq?.points ?? this.nurseIQPoints ?? 0)
            };
            
            // Store NurseIQ points separately for easy access
            this.nurseIQPoints = this.metrics.nurseiq.points;
            this.metrics.nurseiqPoints = this.nurseIQPoints;

            this.metrics.assignments = this.firstNumeric(data, [
                'assignments', 'assignment', 'assignment_score', 'assignments_score',
                'assignment_percentage', 'assignments_percentage'
            ]);
            this.metrics.examScore = this.firstNumeric(data, [
                'examScore', 'exam_score', 'exam_percentage', 'exams_percentage'
            ]);
            this.metrics.overall = this.firstNumeric(data, [
                'overall', 'overall_score', 'overall_percentage'
            ]);

            // If progress is 0 but questions > 0, calculate it
            if (this.metrics.nurseiq.questions > 0 && this.metrics.nurseiq.progress === 0) {
                this.metrics.nurseiq.progress = Math.min(Math.round((this.metrics.nurseiq.questions / 105) * 100), 100);
            }
            
            console.log('📊 NurseIQ loaded:', this.metrics.nurseiq);
            console.log('🧠 NurseIQ Points:', this.nurseIQPoints);
            
            // XP data
            this.metrics.xp = data.xp || { 
                current: 0, 
                max: 100, 
                level: 1, 
                percent: 0, 
                total: 0 
            };
            this.metrics.xp.percent = (this.metrics.xp.current / this.metrics.xp.max) * 100;
            
            // Exam/resources data
            this.metrics.exams = data?.exam?.title || 'No upcoming exams';
            this.metrics.resources = Number(data?.resources ?? 0);

            // Courses are independent from exam-card approvals.
            let courseCount = Number(data?.courses ?? 0);
            try {
                if (window.db && typeof window.db.getCourses === 'function') {
                    const courses = await window.db.getCourses();
                    if (Array.isArray(courses)) courseCount = courses.length;
                }
            } catch (courseError) {
                console.warn('⚠️ Could not refresh course count:', courseError);
            }
            this.metrics.courses = courseCount;
            
            console.log(`💰 Total Points from RPC: ${this.metrics.totalPoints}`);
            console.log(`🏆 Gamification from RPC: ${this.gamificationPoints}`);
            console.log(`📊 Level from RPC: ${this.metrics.xp.level}`);
            console.log(`🔥 Streak from RPC: ${this.metrics.login.streak}`);
            console.log(`🧠 NurseIQ Points from RPC: ${this.nurseIQPoints}`);
            
            // Load reviews and newsletter
            await this.loadReviewsSnapshot();
            await this.loadNewsletterSnapshot();
            
            // ✅ Update UI
            this.saveToCache();
            this.updateUIFromMetrics();
            this.updateStreakUI();
            
            // ✅ FIX: Force NurseIQ display
            await this.fixNurseIQDisplay();
            
            // Update announcement
            if (this.elements.announcementText) {
                this.elements.announcementText.textContent = data?.announcement || 'No new announcements at this time.';
            }
            
            // Update last updated time
            if (this.elements.dashboardLastUpdated) {
                const now = this.getKenyaNow();
                this.elements.dashboardLastUpdated.textContent = now.toLocaleTimeString('en-KE', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true,
                    timeZone: 'Africa/Nairobi'
                });
            }
            
            // Update exams
            await this.updateExamsMetric();
            
            console.log('✅ Dashboard loaded from DATABASE');
            
            // Load leaderboard and next class
            await Promise.all([
                this.loadLeaderboardData('all'),
                this.loadQuickNextClass()
            ]);
            
        } catch (error) {
            console.error('Dashboard error:', error);
            await this.loadIndividualMetrics();
        }
    }
    
    // ============================================================
    // 🔄 INDIVIDUAL METRICS (FALLBACK)
    // ============================================================
    
    async loadIndividualMetrics() {
        console.log('⚠️ Falling back to individual metrics...');
        
        if (this.userId && this.sb) {
            try {
                const { data: profileData } = await this.sb
                    .from('consolidated_user_profiles_table')
                    .select('login_count, gamification_points, total_points, nurseiq_points')
                    .eq('user_id', this.userId)
                    .single();
                
                const loginCount = profileData?.login_count || 0;
                this.gamificationPoints = profileData?.gamification_points || 0;
                this.metrics.totalPoints = profileData?.total_points || 0;
                this.nurseIQPoints = profileData?.nurseiq_points || 0;
                
                const streakData = await this.calculateDailyStreak();
                this.metrics.login = { 
                    count: loginCount, 
                    points: loginCount * 10, 
                    streak: streakData.streak,
                    maxStreak: streakData.maxStreak,
                    streakRestores: streakData.restores
                };
                this.metrics.gamification.points = this.gamificationPoints;
                this.metrics.nurseiqPoints = this.nurseIQPoints;
                
                console.log(`🧠 Fallback NurseIQ: ${this.nurseIQPoints}`);
            } catch (e) {
                console.warn('Could not fetch profile data:', e);
            }
        }
        
        await Promise.all([
            this.loadAttendanceMetrics(),
            this.loadResourcesMetrics(),
            this.loadExamCardMetrics(),
            this.loadNurseIQMetrics(),
            this.updateExamsMetric(),
            this.loadXPMetrics(),
            this.loadAnnouncement(),
            this.loadReviewsSnapshot(),
            this.loadNewsletterSnapshot(),
            this.loadDashboardCourses(),
            this.loadDashboardEvents()
        ]);
        this.updateUIFromMetrics();
        this.updateStreakUI();
        this.saveToCache();
        
        // ✅ FIX: Force NurseIQ display after fallback
        await this.fixNurseIQDisplay();
    }
    
    async loadAttendanceMetrics() {
        if (!this.userId || !this.sb) return;
        
        try {
            const { data: logs, error } = await this.sb
                .from('geo_attendance_logs')
                .select('is_verified')
                .eq('student_id', this.userId);
            
            if (error) throw error;
            
            const total = logs?.length || 0;
            const verified = logs?.filter(l => l.is_verified === true).length || 0;
            const rate = total > 0 ? Math.round((verified / total) * 100) : 0;
            
            this.metrics.attendance = { rate, verified, total, pending: total - verified, points: verified * 10 };
            
        } catch (error) {
            console.error('Attendance error:', error);
        }
    }
    
    async loadExamCardMetrics() {
        if (!this.userId || !this.sb) return;
        
        try {
            const { data: registrations, error } = await this.sb
                .from('student_unit_registrations')
                .select('id, status')
                .eq('student_id', this.userId);
            
            if (error) throw error;
            
            const approved = registrations?.filter(r => r.status === 'approved').length || 0;
            this.metrics.examCard = { approved, eligible: approved > 0 };
            
        } catch (error) {
            console.error('Exam card error:', error);
            this.metrics.examCard = { approved: 0, eligible: false };
        }
    }
    
    async loadResourcesMetrics() {
        if (!this.sb) return;
        
        try {
            const { count, error } = await this.sb
                .from('resources')
                .select('*', { count: 'exact', head: true });
            
            this.metrics.resources = count || 0;
        } catch (error) {
            console.error('Resources error:', error);
            this.metrics.resources = 0;
        }
    }
    
    async loadNurseIQMetrics() {
        if (!this.userId || !this.sb) return;
        
        try {
            let totalQuestions = 0;
            let correctAnswers = 0;
            
            // Get from attempts table
            const { data: attempts, error: attError } = await this.sb
                .from('nurseiq_attempts')
                .select('score, total_questions')
                .eq('student_id', this.userId);
            
            if (!attError && attempts && attempts.length > 0) {
                let attemptQuestions = 0;
                let attemptScore = 0;
                attempts.forEach(a => {
                    attemptQuestions += a.total_questions || 0;
                    attemptScore += a.score || 0;
                });
                
                totalQuestions = attemptQuestions;
                correctAnswers = attemptScore;
            }
            
            // Also check user_progress
            const { data: progress, error: progError } = await this.sb
                .from('user_progress')
                .select('progress_data')
                .eq('user_id', this.userId)
                .maybeSingle();
            
            if (!progError && progress && progress.progress_data) {
                const answers = progress.progress_data.answers || {};
                let progQuestions = 0;
                let progCorrect = 0;
                Object.values(answers).forEach(answer => {
                    if (answer.answered) {
                        progQuestions++;
                        if (answer.correct) progCorrect++;
                    }
                });
                
                if (progQuestions > totalQuestions) {
                    totalQuestions = progQuestions;
                    correctAnswers = progCorrect;
                }
            }
            
            const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
            const progressPercent = totalQuestions > 0 ? Math.min(Math.round((totalQuestions / 105) * 100), 100) : 0;
            const points = correctAnswers * 2;
            
            this.metrics.nurseiq = { 
                progress: progressPercent, 
                accuracy: accuracy, 
                questions: totalQuestions,
                score: correctAnswers,
                points: points
            };
            this.nurseIQPoints = points;
            this.metrics.nurseiqPoints = points;
            
            console.log(`🧠 NurseIQ calculated: ${points} pts (${correctAnswers} correct × 2)`);
            
        } catch (error) {
            console.error('NurseIQ error:', error);
            this.metrics.nurseiq = { progress: 0, accuracy: 0, questions: 0, score: 0, points: 0 };
        }
    }
    
    // ============================================================
    // ⭐ REVIEWS SNAPSHOT
    // ============================================================
    
    async loadReviewsSnapshot() {
        console.log('⭐ Loading reviews snapshot...');
        
        try {
            if (!this.sb) return;
            
            const { count: totalReviews, error: totalError } = await this.sb
                .from('student_reviews')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'approved');
            
            if (totalError) throw totalError;
            
            const { data: ratings, error: ratingError } = await this.sb
                .from('student_reviews')
                .select('rating')
                .eq('status', 'approved');
            
            if (ratingError) throw ratingError;
            
            const avgRating = ratings && ratings.length > 0 
                ? (ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / ratings.length).toFixed(1)
                : '0.0';
            
            const { count: userPending, error: pendingError } = await this.sb
                .from('student_reviews')
                .select('*', { count: 'exact', head: true })
                .eq('student_id', this.userId)
                .eq('status', 'pending');
            
            if (pendingError) throw pendingError;
            
            this.metrics.reviews = {
                total: totalReviews || 0,
                avg: parseFloat(avgRating),
                pending: userPending || 0
            };
            
            this.updateReviewsUI();
            
        } catch (error) {
            console.error('Error loading reviews snapshot:', error);
        }
    }
    
    updateReviewsUI() {
        const m = this.metrics.reviews;
        
        if (this.elements.reviewsAvg) {
            this.elements.reviewsAvg.textContent = m.avg.toFixed(1);
        }
        if (this.elements.reviewsTotal) {
            this.elements.reviewsTotal.textContent = m.total;
        }
        if (this.elements.reviewsPending) {
            this.elements.reviewsPending.textContent = m.pending;
        }
        
        const badge = document.getElementById('reviewsBadge');
        if (badge) {
            if (m.pending > 0) {
                badge.textContent = m.pending > 99 ? '99+' : m.pending;
                badge.style.display = 'inline-block';
                badge.style.background = '#ef4444';
                badge.style.color = 'white';
                badge.style.padding = '0 8px';
                badge.style.borderRadius = '20px';
                badge.style.fontSize = '10px';
            } else {
                badge.style.display = 'none';
            }
        }
    }
    
    // ============================================================
    // 📧 NEWSLETTER SNAPSHOT
    // ============================================================
    
    async loadNewsletterSnapshot() {
        console.log('📧 Loading newsletter snapshot...');
        
        try {
            if (!this.sb) return;
            
            const { data: subscription, error: subError } = await this.sb
                .from('newsletter_subscribers')
                .select('status')
                .eq('user_id', this.userId)
                .maybeSingle();
            
            if (subError) throw subError;
            
            const { data: latestNews, error: newsError } = await this.sb
                .from('newsletters')
                .select('subject, sent_at')
                .order('sent_at', { ascending: false })
                .limit(1);
            
            if (newsError) throw newsError;
            
            this.metrics.newsletter = {
                subscribed: subscription?.status === 'active',
                latest: latestNews?.[0] || null
            };
            
            this.updateNewsletterUI();
            
        } catch (error) {
            console.error('Error loading newsletter snapshot:', error);
        }
    }
    
    updateNewsletterUI() {
        const m = this.metrics.newsletter;
        
        if (this.elements.newsletterStatus) {
            this.elements.newsletterStatus.textContent = m.subscribed ? '✅ Subscribed' : '📧 Not Subscribed';
            this.elements.newsletterStatus.style.color = m.subscribed ? '#10b981' : '#f59e0b';
        }
        
        if (this.elements.newsletterLatest) {
            if (m.latest) {
                const date = new Date(m.latest.sent_at).toLocaleDateString();
                this.elements.newsletterLatest.textContent = `${m.latest.subject} (${date})`;
            } else {
                this.elements.newsletterLatest.textContent = 'No newsletters yet';
            }
        }
        
        const badge = document.getElementById('newsletterBadge');
        if (badge) {
            if (m.subscribed) {
                badge.textContent = '✓';
                badge.style.display = 'inline-block';
                badge.style.background = '#10b981';
                badge.style.color = 'white';
                badge.style.padding = '0 8px';
                badge.style.borderRadius = '20px';
                badge.style.fontSize = '10px';
            } else {
                badge.textContent = '✕';
                badge.style.display = 'inline-block';
                badge.style.background = '#6b7280';
                badge.style.color = 'white';
                badge.style.padding = '0 8px';
                badge.style.borderRadius = '20px';
                badge.style.fontSize = '10px';
            }
        }
    }
    
    // ============================================================
    // 📝 UPDATE EXAMS METRIC
    // ============================================================
    
    async updateExamsMetric() {
        let upcomingText = 'No upcoming exams';
        
        try {
            if (!this.userProfile) return;
            
            const kenyaNow = this.getKenyaNow();
            const userBlock = this.userProfile.block || this.userProfile.current_block || 'Introductory';
            
            const { data: exams, error } = await this.sb
                .from('exams')
                .select('*')
                .eq('program_type', this.userProfile.program)
                .eq('intake_year', this.userProfile.intake_year)
                .or(`block.eq.${userBlock},block_term.eq.${userBlock}`)
                .order('exam_date', { ascending: true })
                .order('exam_start_time', { ascending: true });
            
            if (error) {
                console.error('Exams query error:', error);
                if (this.elements.upcomingExam) {
                    this.elements.upcomingExam.innerText = 'Error loading exams';
                }
                this.updateNextExamWidget(null);
                return;
            }
            
            if (!exams || exams.length === 0) {
                upcomingText = 'No exams scheduled';
                if (this.elements.upcomingExam) {
                    this.elements.upcomingExam.innerText = upcomingText;
                }
                this.updateNextExamWidget(null);
                return;
            }
            
            let upcomingExams = [];
            let currentExams = [];
            let completedExams = [];
            
            exams.forEach(exam => {
                try {
                    const examDate = new Date(exam.exam_date);
                    const examTime = exam.exam_start_time || '00:00:00';
                    const [hours, minutes] = examTime.split(':').map(Number);
                    examDate.setHours(hours || 0, minutes || 0, 0, 0);
                    
                    const examDateTime = examDate;
                    const isUpcoming = examDateTime > kenyaNow;
                    const isToday = examDateTime.toDateString() === kenyaNow.toDateString();
                    const isPast = examDateTime < kenyaNow;
                    
                    if (isUpcoming || (isToday && !isPast)) {
                        upcomingExams.push(exam);
                    } else if (isPast && exam.status !== 'Completed') {
                        if (isToday) currentExams.push(exam);
                        else completedExams.push(exam);
                    } else {
                        completedExams.push(exam);
                    }
                    
                } catch (e) {
                    console.error('Error processing exam:', exam.id, e);
                }
            });
            
            upcomingExams.sort((a, b) => {
                const dateA = new Date(`${a.exam_date}T${a.exam_start_time || '00:00:00'}`);
                const dateB = new Date(`${b.exam_date}T${b.exam_start_time || '00:00:00'}`);
                return dateA - dateB;
            });
            
            if (upcomingExams.length > 0) {
                const nextExam = upcomingExams[0];
                const examDate = new Date(nextExam.exam_date);
                const formattedDate = this.formatKenyaDate(examDate);
                const examTitle = nextExam.exam_name || nextExam.title || 'Exam';
                upcomingText = `${examTitle} - ${formattedDate}`;
                this.metrics.nextExam = nextExam;
                this.updateNextExamWidget(nextExam);
                
            } else if (currentExams.length > 0) {
                const todayExam = currentExams[0];
                const examTitle = todayExam.exam_name || todayExam.title || 'Exam';
                upcomingText = `📅 ${examTitle} - Today`;
                this.metrics.nextExam = todayExam;
                this.updateNextExamWidget(todayExam);
                
            } else if (completedExams.length > 0) {
                const lastExam = completedExams[completedExams.length - 1];
                const examTitle = lastExam.exam_name || lastExam.title || 'Exam';
                upcomingText = `✅ ${examTitle} (Completed)`;
                this.metrics.nextExam = null;
                this.updateNextExamWidget(null);
                
            } else {
                upcomingText = 'No upcoming exams';
                this.metrics.nextExam = null;
                this.updateNextExamWidget(null);
            }
            
            this.metrics.exams = upcomingText;
            if (this.elements.upcomingExam) {
                this.elements.upcomingExam.innerText = upcomingText;
            }
            
        } catch (error) {
            console.error('Exams error:', error);
            if (this.elements.upcomingExam) {
                this.elements.upcomingExam.innerText = 'Error loading exams';
            }
            this.updateNextExamWidget(null);
        }
    }
    
    updateNextExamWidget(exam) {
        const container = document.querySelector('.next-exam-widget');
        if (!container) return;
        
        const detailsContainer = document.getElementById('next-exam-details');
        const statusContainer = document.getElementById('dashboard-exam-status');
        
        if (!exam) {
            if (detailsContainer) {
                detailsContainer.innerHTML = `
                    <div style="text-align: center; padding: 10px;">
                        <p style="font-size: 0.8rem; color: #64748B;">No upcoming exams</p>
                        <p style="font-size: 0.7rem; color: #94A3B8; margin-top: 4px;">Check back later for new assessments</p>
                    </div>
                `;
            }
            if (statusContainer) {
                statusContainer.innerText = 'No Exams';
                statusContainer.style.color = '#64748B';
            }
            return;
        }
        
        const isCatExam = exam.exam_type?.toUpperCase().includes('CAT') || false;
        const isFinalExam = exam.exam_type?.toUpperCase() === 'EXAM' || 
                           exam.exam_type?.toUpperCase() === 'FINAL' || 
                           exam.exam_type?.toUpperCase() === 'END_TERM';
        
        let totalMarks = 30;
        if (isCatExam) totalMarks = 30;
        else if (isFinalExam) totalMarks = 70;
        else totalMarks = exam.total_marks || exam.marks_out_of || 100;
        
        const passMark = exam.pass_mark || Math.round(totalMarks * 0.6);
        const examDate = new Date(exam.exam_date);
        const formattedDate = this.formatKenyaDate(examDate);
        
        let badgeText = 'EXAM';
        let badgeBg = '#DBEAFE';
        let badgeColor = '#1E40AF';
        
        if (isCatExam) {
            badgeText = 'CAT';
            badgeBg = '#FEF3C7';
            badgeColor = '#92400E';
        } else if (isFinalExam) {
            badgeText = 'FINAL';
            badgeBg = '#D1FAE5';
            badgeColor = '#065F46';
        }
        
        const timeUntil = this.getTimeUntilExam(examDate);
        const examTime = exam.exam_start_time || '00:00:00';
        const displayTime = examTime.substring(0, 5);
        
        if (detailsContainer) {
            detailsContainer.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px; padding: 8px 0;">
                    <div style="background: ${badgeBg}; padding: 6px 12px; border-radius: 8px; flex-shrink: 0;">
                        <span style="font-weight: 700; font-size: 0.75rem; color: ${badgeColor};">
                            ${badgeText}
                        </span>
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: 600; font-size: 0.9rem; color: #0A3D62; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${this.escapeHtml(exam.exam_name || exam.title || 'Exam')}
                        </div>
                        <div style="font-size: 0.7rem; color: #64748B; display: flex; flex-wrap: wrap; gap: 8px; margin-top: 2px;">
                            <span>📅 ${formattedDate}</span>
                            <span>⏰ ${displayTime}</span>
                            <span>📊 ${totalMarks} marks</span>
                            <span>🎯 ${passMark} marks (60%)</span>
                            <span>⏳ ${exam.duration_minutes || 30} min</span>
                        </div>
                    </div>
                </div>
            `;
        }
        
        if (statusContainer) {
            statusContainer.innerText = `⏳ ${timeUntil}`;
            statusContainer.style.color = '#F59E0B';
        }
        
        container.style.cursor = 'pointer';
        container.onclick = () => {
            this.navigateTo('cats');
        };
    }
    
    getTimeUntilExam(examDate) {
        const now = this.getKenyaNow();
        const diffMs = examDate - now;
        
        if (diffMs < 0) return 'Expired';
        
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        if (diffDays > 0) return `${diffDays}d ${diffHours}h`;
        else if (diffHours > 0) return `${diffHours}h ${diffMinutes}m`;
        else if (diffMinutes > 0) return `${diffMinutes}m`;
        else return 'Starting soon!';
    }
    
    async loadAnnouncement() {
        if (!this.userProfile || !this.sb) return;
        
        try {
            const userBlock = this.userProfile.block || 'Introductory';
            const userIntake = this.userProfile.intake_year || new Date().getFullYear();
            const userProgram = this.userProfile.program || 'Not assigned';
            
            const { data: announcements, error } = await this.sb
                .from('announcements')
                .select('*')
                .eq('is_active', true)
                .eq('program', userProgram)
                .eq('intake_year', userIntake)
                .in('target_block', [userBlock, 'All', 'General'])
                .order('created_at', { ascending: false })
                .limit(1);
            
            if (error) throw error;
            
            if (this.elements.announcementText) {
                if (announcements && announcements.length > 0) {
                    this.elements.announcementText.innerHTML = announcements[0].message || announcements[0].content || 'No new announcements';
                } else {
                    this.elements.announcementText.textContent = 'No new announcements at this time.';
                }
            }
            
        } catch (error) {
            console.error('Announcement error:', error);
            if (this.elements.announcementText) {
                this.elements.announcementText.textContent = 'No new announcements at this time.';
            }
        }
    }
    
    // ============================================================
    // 🏆 LEADERBOARD - FIXED
    // ============================================================
    
    async loadLeaderboardData(period = 'all') {
        const container = this.elements?.dashboardLeaderboard || document.querySelector('.nchsm-leaderboard');
        if (!container || !this.sb) return;

        container.querySelectorAll('.leader-row:not(.leader-head)').forEach(row => row.remove());

        try {
            const { data: users, error } = await this.sb
                .from('consolidated_user_profiles_table')
                .select('id, full_name, login_count, gamification_points, total_points, earned_badges')
                .eq('role', 'student')
                .order('total_points', { ascending: false })
                .limit(10);

            if (error) throw error;

            if (!users || users.length === 0) {
                container.insertAdjacentHTML(
                    'beforeend',
                    '<div class="leader-row"><span>—</span><strong>No students found</strong><b>—</b></div>'
                );
                return;
            }

            users.forEach((user, index) => {
                const rank = index + 1;
                const points = Number(user.total_points ?? 0);
                const current = String(user.id) === String(this.userId) || String(user.user_id ?? '') === String(this.userId);

                const row = document.createElement('div');
                row.className = `leader-row${current ? ' leader-current' : ''}`;

                const rankEl = document.createElement('b');
                rankEl.className = `rank rank-${rank}`;
                rankEl.textContent = rank;

                const nameEl = document.createElement('strong');
                nameEl.textContent = user.full_name || 'Student';

                if (current) {
                    const you = document.createElement('span');
                    you.className = 'leader-you';
                    you.textContent = ' You';
                    nameEl.appendChild(you);
                }

                const pointsEl = document.createElement('b');
                pointsEl.textContent = Number.isFinite(points) ? points.toLocaleString() : '0';

                row.append(rankEl, nameEl, pointsEl);
                container.appendChild(row);
            });

            this.metrics.leaderboard = users.map((u, i) => ({
                rank: i + 1,
                userId: u.id,
                name: u.full_name || 'Student',
                points: Number(u.total_points ?? 0)
            }));
        } catch (error) {
            console.error('Leaderboard error:', error);
            container.insertAdjacentHTML(
                'beforeend',
                '<div class="leader-row"><span>—</span><strong>Unable to load leaderboard</strong><b>—</b></div>'
            );
        }
    }

    // ============================================================
    // 📚 REDESIGNED DASHBOARD COURSES
    // ============================================================

    async loadDashboardCourses() {
        const container = this.elements?.dashboardCourses || document.querySelector('.nchsm-courses');
        if (!container || !this.sb || !this.userId) return;

        try {
            let courses = [];

            // The dashboard card is "Currently enrolled units", so read the student's
            // actual registrations first. No demo/static course names are inserted.
            const { data: registrations, error: regError } = await this.sb
                .from('student_unit_registrations')
                .select('unit_code, unit_name, status, block, created_at, submitted_date')
                .eq('student_id', this.userId)
                .order('created_at', { ascending: false });

            if (!regError && Array.isArray(registrations)) {
                courses = registrations
                    .filter(r => !r.status || ['approved','active','registered','pending'].includes(String(r.status).toLowerCase()))
                    .map(r => ({
                        code: r.unit_code || '',
                        name: r.unit_name || ''
                    }))
                    .filter(c => c.code || c.name);
            }

            // Fall back to the existing database module if registrations are unavailable.
            if (!courses.length && window.db && typeof window.db.getCourses === 'function') {
                const result = await window.db.getCourses();
                if (Array.isArray(result)) {
                    courses = result.map(course => ({
                        code: course.unit_code || course.course_code || course.code || '',
                        name: course.unit_name || course.course_name || course.name || course.title || ''
                    })).filter(c => c.code || c.name);
                }
            }

            const normalized = courses.slice(0, 4);
            container.innerHTML = '';

            if (!normalized.length) {
                container.innerHTML = '<div class="course-row"><span class="course-code code-blue">—</span><strong>No enrolled units</strong><i class="fas fa-chevron-right" aria-hidden="true"></i></div>';
                return;
            }

            const codeClasses = ['code-blue', 'code-green', 'code-purple', 'code-orange'];
            normalized.forEach((course, index) => {
                const row = document.createElement('div');
                row.className = 'course-row';
                const code = document.createElement('span');
                code.className = `course-code ${codeClasses[index % codeClasses.length]}`;
                code.textContent = course.code || 'UNIT';
                const name = document.createElement('strong');
                name.textContent = course.name || course.code || 'Unit';
                const icon = document.createElement('i');
                icon.className = 'fas fa-chevron-right';
                icon.setAttribute('aria-hidden', 'true');
                row.append(code, name, icon);
                row.addEventListener('click', () => this.navigateTo('hub-courses'));
                container.appendChild(row);
            });
        } catch (error) {
            console.error('Dashboard courses error:', error);
            container.innerHTML = '<div class="course-row"><span class="course-code code-blue">—</span><strong>Unable to load units</strong><i class="fas fa-exclamation-circle" aria-hidden="true"></i></div>';
        }
    }

    // ============================================================
    // 📅 REDESIGNED DASHBOARD EVENTS
    // ============================================================

    async loadDashboardEvents() {
        const container = this.elements?.dashboardEvents || document.querySelector('.nchsm-events');
        if (!container || !this.sb) return;

        try {
            const studentBlock = this.userProfile?.block || this.userProfile?.current_block;

            let query = this.sb
                .from('timetables')
                .select('*')
                .gte('class_date', this.getKenyaNow().toISOString().split('T')[0])
                .order('class_date', { ascending: true })
                .order('start_time', { ascending: true })
                .limit(8);

            if (studentBlock) query = query.eq('block', studentBlock);

            const { data: events, error } = await query;
            if (error) throw error;

            const now = this.getKenyaNow();
            const upcoming = (events || []).filter(event => {
                if (!event.class_date) return false;
                const date = new Date(`${event.class_date}T${event.start_time || '00:00:00'}`);
                return date >= now;
            }).slice(0, 2);

            container.innerHTML = '';

            if (!upcoming.length) {
                container.innerHTML =
                    '<div class="nchsm-event"><div class="event-date"><b>DATE</b><strong>—</strong></div><div class="event-info"><strong>No upcoming events</strong><span>Check the Academic Calendar for updates.</span></div></div>';
                return;
            }

            upcoming.forEach((event, index) => {
                const d = new Date(`${event.class_date}T00:00:00`);
                const month = d.toLocaleDateString('en-KE', { month: 'short', timeZone: 'Africa/Nairobi' }).toUpperCase();
                const day = d.toLocaleDateString('en-KE', { day: '2-digit', timeZone: 'Africa/Nairobi' });
                const startTime = (event.start_time || '').slice(0, 5) || '—';
                const endTime = (event.end_time || '').slice(0, 5) || '';
                const title = event.session_name || event.course_name || event.title || 'Scheduled session';
                const venue = event.venue || event.location || 'Venue TBA';

                const row = document.createElement('div');
                row.className = 'nchsm-event';

                const date = document.createElement('div');
                date.className = 'event-date';

                const label = document.createElement('b');
                label.textContent = index === 0 ? 'NEXT' : month;

                const dayEl = document.createElement('strong');
                dayEl.textContent = day;
                date.append(label, dayEl);

                const info = document.createElement('div');
                info.className = 'event-info';

                const titleEl = document.createElement('strong');
                titleEl.textContent = title;

                const details = document.createElement('span');
                const clock = document.createElement('i');
                clock.className = 'fas fa-clock';
                clock.setAttribute('aria-hidden', 'true');

                const location = document.createElement('i');
                location.className = 'fas fa-location-dot';
                location.setAttribute('aria-hidden', 'true');

                details.append(
                    clock,
                    document.createTextNode(` ${startTime}${endTime ? ` — ${endTime}` : ''} `),
                    location,
                    document.createTextNode(` ${venue}`)
                );

                info.append(titleEl, details);
                row.append(date, info);
                row.addEventListener('click', () => this.navigateTo('calendar'));
                container.appendChild(row);
            });
        } catch (error) {
            console.error('Dashboard events error:', error);
            container.innerHTML = '<div class="nchsm-event"><div class="event-date"><b>DATE</b><strong>—</strong></div><div class="event-info"><strong>Unable to load events</strong><span>Open the Academic Calendar for details.</span></div></div>';
        }
    }

    // ============================================================
    // 📅 NEXT CLASS
    // ============================================================
    
    async loadQuickNextClass() {
        console.log('📅 Loading next class...');
        
        try {
            const studentBlock = this.userProfile?.block;
            if (!studentBlock) {
                console.log('No block found');
                return;
            }
            
            const now = this.getKenyaNow();
            const todayDate = now.toISOString().split('T')[0];
            
            const { data: futureClasses, error } = await this.sb
                .from('timetables')
                .select('*')
                .eq('block', studentBlock)
                .gte('class_date', todayDate)
                .order('class_date', { ascending: true })
                .order('start_time', { ascending: true });
            
            if (error) {
                console.error('Query error:', error);
                return;
            }
            
            if (!futureClasses || futureClasses.length === 0) {
                console.log('No upcoming classes found');
                const card = document.getElementById('quick-next-class');
                if (card) card.style.display = 'none';
                return;
            }
            
            let nextClass = null;
            for (const cls of futureClasses) {
                const classDateTime = new Date(`${cls.class_date}T${cls.start_time}`);
                if (classDateTime > now) {
                    nextClass = cls;
                    break;
                }
            }
            
            if (!nextClass) {
                console.log('No future classes');
                const card = document.getElementById('quick-next-class');
                if (card) card.style.display = 'none';
                return;
            }
            
            const classDate = new Date(nextClass.class_date);
            const isToday = classDate.toDateString() === now.toDateString();
            const startTime = nextClass.start_time?.substring(0,5) || 'TBA';
            const endTime = nextClass.end_time?.substring(0,5) || 'TBA';
            const formattedDate = this.formatKenyaDate(classDate);
            
            const timeEl = document.getElementById('quick-next-class-time');
            const nameEl = document.getElementById('quick-next-class-name');
            const codeEl = document.getElementById('quick-next-class-code');
            const lecturerEl = document.getElementById('quick-next-class-lecturer');
            const venueEl = document.getElementById('quick-next-class-venue');
            const daySpan = document.getElementById('quick-next-class-day');
            const dayContainer = document.getElementById('quick-next-class-day-container');
            
            if (timeEl) timeEl.innerHTML = `${startTime} — ${endTime}`;
            if (nameEl) nameEl.innerHTML = nextClass.session_name || nextClass.course_name;
            if (codeEl) codeEl.innerHTML = nextClass.course_name || studentBlock;
            
            let lecturerName = nextClass.lecturer_name || 'TBA';
            if (lecturerName !== 'TBA' && lecturerName !== '—') {
                lecturerName = lecturerName.split(' ').slice(0,2).join(' ');
            }
            if (lecturerEl) lecturerEl.innerHTML = lecturerName;
            if (venueEl) venueEl.innerHTML = nextClass.venue || 'TBD';
            
            if (daySpan) {
                if (isToday) {
                    if (dayContainer) dayContainer.classList.add('today');
                    daySpan.innerHTML = 'TODAY';
                } else {
                    if (dayContainer) dayContainer.classList.remove('today');
                    daySpan.innerHTML = formattedDate;
                }
            }
            
            const card = document.getElementById('quick-next-class');
            if (card) {
                card.style.display = 'block';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
                card.onclick = () => { this.navigateTo('calendar'); };
            }
            
        } catch (error) {
            console.error('Error loading next class:', error);
            const card = document.getElementById('quick-next-class');
            if (card) card.style.display = 'none';
        }
    }
    
    // ============================================================
    // 📊 XP METRICS
    // ============================================================
    
    async loadXPMetrics() {
        let loginCount = 0;
        let gamificationPoints = 0;
        let nurseIQPoints = 0;
        
        if (this.userId && this.sb) {
            try {
                const { data } = await this.sb
                    .from('consolidated_user_profiles_table')
                    .select('login_count, gamification_points, total_points, nurseiq_points')
                    .eq('user_id', this.userId)
                    .single();
                loginCount = data?.login_count || 0;
                gamificationPoints = data?.gamification_points || 0;
                this.metrics.totalPoints = data?.total_points || 0;
                this.gamificationPoints = gamificationPoints;
                nurseIQPoints = data?.nurseiq_points || 0;
                this.nurseIQPoints = nurseIQPoints;
            } catch (e) {
                console.warn('Could not fetch login count for XP:', e);
            }
        }
        
        const loginPoints = loginCount * 10;
        const attendancePoints = (this.metrics.attendance.verified || 0) * 10;
        const totalXP = loginPoints + attendancePoints + nurseIQPoints + gamificationPoints;
        
        const maxXP = 100;
        const currentXP = totalXP % maxXP;
        const level = Math.floor(totalXP / maxXP) + 1;
        const percent = (currentXP / maxXP) * 100;
        
        this.metrics.xp = { current: currentXP, max: maxXP, level, percent, total: totalXP };
        this.metrics.login = { count: loginCount, points: loginPoints };
        if (!Number.isFinite(Number(this.metrics.totalPoints)) || this.metrics.totalPoints === 0) {
            this.metrics.totalPoints = totalXP;
        }
        
        if (this.elements.userLevel) this.elements.userLevel.innerText = level;
        if (this.elements.userXp) this.elements.userXp.innerText = currentXP;
        if (this.elements.userXpMax) this.elements.userXpMax.innerText = maxXP;
        if (this.elements.xpProgressFill) this.elements.xpProgressFill.style.width = percent + '%';
    }
    
    // ============================================================
    // 🎨 UPDATE UI FROM METRICS - FIXED!
    // ============================================================
    
    firstNumeric(source, keys) {
        for (const key of keys) {
            const value = Number(source?.[key]);
            if (Number.isFinite(value) && value >= 0 && value <= 100) return Math.round(value);
        }
        return null;
    }

    getProgressValue(metrics, keys) {
        for (const key of keys) {
            const value = Number(metrics?.[key]);
            if (Number.isFinite(value) && value >= 0 && value <= 100) return Math.round(value);

            const nested = Number(metrics?.academic?.[key]);
            if (Number.isFinite(nested) && nested >= 0 && nested <= 100) return Math.round(nested);
        }
        return null;
    }

    setProgressRing(valueEl, ringEl, value) {
        if (value == null || !Number.isFinite(Number(value))) {
            if (valueEl) valueEl.textContent = '--%';
            if (ringEl) ringEl.style.strokeDashoffset = '251.33';
            return;
        }

        const pct = Math.max(0, Math.min(100, Number(value)));
        if (valueEl) valueEl.textContent = `${pct}%`;

        if (ringEl) {
            const circumference = 2 * Math.PI * 40;
            ringEl.style.strokeDasharray = circumference.toFixed(2);
            ringEl.style.strokeDashoffset = (circumference * (1 - pct / 100)).toFixed(2);
        }
    }

    updateUIFromMetrics() {
        const m = this.metrics || {};
        const attendance = m.attendance || {};
        const nurseiq = m.nurseiq || {};
        const login = m.login || {};
        const xp = m.xp || {};

        const setText = (el, value, fallback = '0') => {
            if (el) el.textContent = value ?? fallback;
        };

        if (this.elements.dashboardHeroName) {
            this.elements.dashboardHeroName.textContent = this.userProfile?.full_name || 'Student';
        }

        setText(this.elements.userLevel, xp.level || 1);
        setText(this.elements.userXp, xp.current || 0);
        setText(this.elements.userXpMax, xp.max || 100);

        if (this.elements.xpProgressFill) {
            this.elements.xpProgressFill.style.width =
                `${Math.max(0, Math.min(100, Number(xp.percent) || 0))}%`;
        }

        setText(this.elements.dashboardNurseIQPoints, nurseiq.points ?? this.nurseIQPoints ?? 0);
        setText(this.elements.attendancePoints, attendance.points ?? 0);
        setText(this.elements.loginPointsDisplay, login.points ?? 0);
        setText(this.elements.loginCountDisplay, login.count ?? 0);
        setText(this.elements.totalPointsDisplay, this.metrics.totalPoints ?? this.calculateTotalPoints());

        const attendanceRate = Number(attendance.rate);

        this.setProgressRing(
            this.elements.progressAttendance,
            this.elements.progressAttendanceRing,
            Number.isFinite(attendanceRate) ? attendanceRate : null
        );

        this.setProgressRing(
            this.elements.progressAssignments,
            this.elements.progressAssignmentsRing,
            this.getProgressValue(m, ['assignments', 'assignment', 'assignment_score', 'assignments_score'])
        );

        this.setProgressRing(
            this.elements.progressExams,
            this.elements.progressExamsRing,
            this.getProgressValue(m, ['examScore', 'exam_score', 'exam_percentage', 'exams_percentage'])
        );

        this.setProgressRing(
            this.elements.progressOverall,
            this.elements.progressOverallRing,
            this.getProgressValue(m, ['overall', 'overall_score', 'overall_percentage'])
        );

        // Existing compatibility hooks.
        setText(this.elements.attendanceRate, Number.isFinite(attendanceRate) ? `${attendanceRate}%` : '--%');
        setText(this.elements.verifiedCount, attendance.verified ?? 0);
        setText(this.elements.totalCount, attendance.total ?? 0);
        setText(this.elements.pendingCount, attendance.pending ?? 0);
        setText(this.elements.activeCourses, m.courses ?? 0);
        setText(this.elements.approvedUnits, m.examCard?.approved ?? 0);
        setText(this.elements.resources, m.resources ?? 0);
        setText(this.elements.upcomingExam, m.exams || 'No upcoming exams');

        const warningText = document.getElementById('warning-text');
        if (warningText) {
            warningText.textContent =
                !Number.isFinite(attendanceRate) ? '—' :
                attendanceRate < 50 ? 'CRITICAL' :
                attendanceRate < 75 ? 'BELOW 75%' : 'GOOD';
        }

        if (this.elements.dashboardLastUpdated) {
            this.elements.dashboardLastUpdated.textContent =
                this.getKenyaNow().toLocaleTimeString('en-KE', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true,
                    timeZone: 'Africa/Nairobi'
                });
        }

        this.updateNurseIQStats(nurseiq.points ?? this.nurseIQPoints ?? 0);
    }

    // ============================================================
    // 💾 SAVE TO CACHE
    // ============================================================
    
    saveToCache() {
        if (!this.cacheKey) return;
        try {
            localStorage.setItem(this.cacheKey, JSON.stringify({
                data: this.metrics,
                timestamp: Date.now()
            }));
            console.log('💾 Dashboard data cached successfully');
        } catch (e) {
            console.debug('Cache save skipped:', e.message);
        }
    }
    
    // ============================================================
    // ⏰ LIVE CLOCK
    // ============================================================
    
    startLiveClock() {
        const headerTime = this.elements.headerTime;
        if (headerTime) {
            const updateTime = () => {
                const kenyaNow = this.getKenyaNow();
                headerTime.textContent = kenyaNow.toLocaleTimeString('en-KE', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true,
                    timeZone: 'Africa/Nairobi'
                });
            };
            updateTime();
            setInterval(updateTime, 60000);
        }
    }
    
    startAutoRefresh() {
        if (this.autoRefreshInterval) clearInterval(this.autoRefreshInterval);
        this.autoRefreshInterval = setInterval(() => {
            if (!document.hidden) {
                this.loadFreshData();
            }
        }, 120000);
    }
    
    async refreshAll() {
        console.log('🔄 Manual refresh — forcing fresh Supabase data...');

        if (this.cacheKey) localStorage.removeItem(this.cacheKey);

        const freshClient = [
            window.sb,
            window.supabaseClient,
            window.db?.supabase,
            window.NCHSMLogin?.supabase,
            this.sb
        ].find(client =>
            client &&
            typeof client.from === 'function' &&
            client.auth &&
            typeof client.auth.getSession === 'function'
        );

        if (freshClient) this.sb = freshClient;

        await this.loadFreshData();
        this.showToast('🔄 Dashboard refreshed from database!', 1500);
    }

    showToast(message, duration = 2000) {
        let toast = document.getElementById('custom-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'custom-toast';
            toast.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: #0B2A4A;
                color: white;
                padding: 8px 16px;
                border-radius: 40px;
                font-size: 12px;
                z-index: 10000;
                white-space: nowrap;
            `;
            document.body.appendChild(toast);
        }
        toast.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`;
        toast.style.display = 'block';
        setTimeout(() => toast.style.display = 'none', duration);
    }
    
    escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }
}

// ============================================================
// 🚀 INITIALIZE
// ============================================================

let dashboardModule = null;

function initDashboardModule(supabaseClient) {
    const candidates = [
        supabaseClient,
        window.sb,
        window.supabaseClient,
        window.db?.supabase,
        window.NCHSMLogin?.supabase,
        window.supabase
    ];

    const client = candidates.find(candidate =>
        candidate &&
        typeof candidate.from === 'function' &&
        candidate.auth &&
        typeof candidate.auth.getSession === 'function'
    );

    if (!client) {
        console.error('❌ No valid Supabase client for dashboard');
        return null;
    }

    dashboardModule = new DashboardModule(client);
    return dashboardModule;
}
window.DashboardModule = DashboardModule;
window.initDashboardModule = initDashboardModule;
window.refreshDashboard = () => dashboardModule?.refreshAll();

console.log('✅ Dashboard module COMPLETE with all fixes!');
console.log('   - ✅ Total Points uses RPC data');
console.log('   - ✅ Gamification included in totals');
console.log('   - ✅ XP calculation uses all sources');
console.log('   - ✅ Leaderboard shows correct points');
console.log('   - ✅ Streak system working');
console.log('   - ✅ Time greeting fixed for Kenya time');
console.log('   - ✅ Navigation working');
console.log('   - ✅ My Units support');
console.log('   - ✅ NURSEIQ POINTS DISPLAY FIXED!');
console.log('   - ✅ GOOGLE ANALYTICS INTEGRATED!');
console.log('   - ✅ Measurement ID: G-WTZRYGB8PE');
