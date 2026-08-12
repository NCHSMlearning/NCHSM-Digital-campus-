// js/ui.js - COMPLETE PRODUCTION VERSION
// All features working: Dashboard, Profile, Courses, Units, Exams, 
// Finance, Attendance, Messages, Tickets, Reviews, Newsletter, NurseIQ,
// Resources, Calendar, Academic Reports, Lecture Card, Exam Card,
// Online Learning, Supplementary Registration, Enrollment, DR CYON

class UIModule {
    constructor() {
        console.log('🚀 Initializing Complete UIModule...');
        
        // ===== CORE ELEMENTS =====
        this.sidebar = document.getElementById('sidebar');
        this.overlay = document.getElementById('overlay');
        this.mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        this.navLinks = document.querySelectorAll('.nav a, .nav-premium a, .dropdown-submenu a, .dropdown-submenu-premium a');
        this.tabs = document.querySelectorAll('.tab-content');
        this.toast = document.getElementById('toast');
        this.headerLogout = document.getElementById('header-logout');
        this.currentTab = 'dashboard';
        this.storageKey = 'nchsm_last_tab';
        this.supabase = null;
        this.currentUser = null;
        this.reviewsBadgeInterval = null;
        
        // ===== COMPLETE VALID TABS =====
        this.validTabs = [
            'dashboard', 'profile', 'calendar', 'finance', 'enrollment',
            'hub-register', 'hub-courses', 'hub-lecture-card', 'hub-exam-card',
            'hub-online-learning', 'cats', 'academic-reports',
            'nurseiq', 'resources', 'attendance', 'messages',
            'support-tickets', 'reviews', 'newsletter',
            'courses', 'unit-registration', 'exam-card', 'supplementary'
        ];
        
        // ===== COMPLETE TAB NAMES =====
        this.tabNames = {
            'dashboard': 'Dashboard',
            'profile': 'Profile',
            'calendar': 'Academic Calendar',
            'finance': 'My Finance',
            'enrollment': 'Enrollment',
            'hub-register': 'Register Units',
            'hub-courses': 'My Units',
            'hub-lecture-card': 'Lecture Card',
            'hub-exam-card': 'Exam Card',
            'hub-online-learning': 'Online Learning',
            'cats': 'Exams & Grades',
            'academic-reports': 'Academic Reports',
            'nurseiq': 'NurseIQ',
            'resources': 'Resources',
            'attendance': 'Attendance',
            'messages': 'Messages',
            'support-tickets': 'Support Tickets',
            'reviews': 'Reviews',
            'newsletter': 'Newsletter',
            'courses': 'My Units',
            'unit-registration': 'Register Units',
            'exam-card': 'Exam Card',
            'supplementary': 'Supplementary Registration'
        };
        
        // ===== CACHE OTHER ELEMENTS =====
        this.clearCacheBtn = document.getElementById('clearCacheBtn');
        this.exportDataBtn = document.getElementById('exportDataBtn');
        this.systemInfoBtn = document.getElementById('systemInfoBtn');
        this.headerRefresh = document.getElementById('header-refresh');
        this.headerUserName = document.getElementById('header-user-name');
        this.headerProfilePhoto = document.getElementById('header-profile-photo');
        this.headerTime = document.getElementById('header-time');
        this.headerLastLogin = document.getElementById('header-last-login');
        this.transcriptModal = document.getElementById('transcript-modal');
        this.closeTranscriptBtn = document.getElementById('closeTranscriptBtn');
        this.closeTranscriptModalBtn = document.getElementById('closeTranscriptModalBtn');
        this.readerBackBtn = document.getElementById('readerBackBtn');
        this.mobileReader = document.getElementById('mobile-reader');
        this.loadingScreen = document.getElementById('loading-screen');
        this.progressFill = document.getElementById('progress-fill');
        this.progressText = document.getElementById('progress-text');
        this.statusSteps = document.getElementById('status-steps');
        this.funFact = document.getElementById('fun-fact');
        this.profileTrigger = null;
        this.dropdownMenu = null;
        
        // ============================================
        // 🚀 AUTO-UPDATE SIDEBAR ON LOAD
        // ============================================
        setTimeout(() => this.updateSidebarUserData(), 800);
        document.addEventListener('appReady', () => setTimeout(() => this.updateSidebarUserData(), 300));
        document.addEventListener('dashboardUpdated', () => setTimeout(() => this.updateSidebarUserData(), 300));
        document.addEventListener('profileUpdated', () => setTimeout(() => this.updateSidebarUserData(), 300));
        
        // ============================================
        // 🚀 START INITIALIZATION
        // ============================================
        setTimeout(() => this.safeInitialize(), 500);
    }
    
    // ============================================================
    // 🔌 DATABASE CONNECTION
    // ============================================================
    
    getSupabaseClient() {
        if (window.supabase && typeof window.supabase.from === 'function') return window.supabase;
        if (window.sb && typeof window.sb.from === 'function') return window.sb;
        if (window.db && window.db.supabase && typeof window.db.supabase.from === 'function') return window.db.supabase;
        return null;
    }
    
    async safeInitialize() {
        console.log('🛡️ Safe initialization starting...');
        await this.waitForDatabase();
        await this.delay(500);
        this.supabase = this.getSupabaseClient();
        this.initialize();
    }
    
    async waitForDatabase() {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 15;
            const checkDb = () => {
                attempts++;
                const hasDb = window.supabase || (window.db && window.db.supabase) || window.sb;
                if (hasDb || attempts >= maxAttempts) resolve();
                else setTimeout(checkDb, 300);
            };
            checkDb();
        });
    }
    
    delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
    
    // ============================================================
    // 🚀 INITIALIZATION
    // ============================================================
    
    async initialize() {
        console.log('🔧 Initializing Complete UI...');
        
        // 1. Setup app loading
        this.setupAppLoading();
        await this.delay(300);
        
        // 2. Cleanup initial styles
        this.cleanupInitialStyles();
        await this.delay(300);
        
        // 3. Setup all event listeners
        this.setupEventListeners();
        this.setupProfileDropdown();
        await this.delay(400);
        
        // 4. Setup navigation
        this.setupUrlNavigation();
        this.setupTabChangeListener();
        await this.delay(300);
        
        // 5. Initialize time and offline
        this.initializeDateTime();
        this.setupOfflineIndicator();
        this.setupMobileMenuVisibility();
        
        // 6. Load last tab
        this.loadLastTab();
        
        // 7. Start reviews badge updater
        this.startReviewsBadgeUpdater();
        
        // 8. Force dashboard visible
        setTimeout(() => {
            const dashboard = document.getElementById('dashboard');
            if (dashboard) {
                dashboard.style.display = 'block';
                dashboard.classList.add('active');
                console.log('✅ Dashboard forced visible after load');
            }
            document.querySelectorAll('.tab-content').forEach(tab => {
                if (tab.id !== 'dashboard') {
                    tab.style.display = 'none';
                    tab.classList.remove('active');
                }
            });
        }, 200);
        
        // 9. Load user data
        await this.delay(800);
        await this.loadInitialUserData();
        await this.delay(800);
        await this.hideLoadingScreen();
        
        // 10. Initialize all modules
        this.initAllModules();
        
        console.log('✅ UIModule fully initialized!');
        console.log('📌 Available tabs:', this.validTabs);
        console.log('📌 DR CYON Integration: Active');
        console.log('📌 Reviews & Newsletter: Active');
        console.log('📌 Finance Module: Active');
        console.log('📌 Enrollment Module: Active');
    }
    
    // ============================================================
    // 🔧 INITIALIZE ALL MODULES
    // ============================================================
    
    initAllModules() {
        console.log('🔧 Initializing all modules...');
        
        setTimeout(() => {
            // Database
            if (window.db && typeof window.db.initialize === 'function') {
                window.db.initialize();
            }
            
            // Dashboard
            if (window.dashboardModule && typeof window.dashboardModule.initialize === 'function') {
                window.dashboardModule.initialize();
            }
            
            // Profile
            if (window.profileModule && typeof window.profileModule.initialize === 'function') {
                window.profileModule.initialize();
            }
            
            // Attendance
            if (window.attendanceModule && typeof window.attendanceModule.initialize === 'function') {
                window.attendanceModule.initialize();
            }
            
            // Resources
            if (window.resourcesModule && typeof window.resourcesModule.initialize === 'function') {
                window.resourcesModule.initialize();
            }
            
            // NurseIQ
            if (window.nurseiqModule && typeof window.nurseiqModule.initialize === 'function') {
                window.nurseiqModule.initialize();
            }
            
            // Exams
            if (window.examsModule && typeof window.examsModule.initialize === 'function') {
                window.examsModule.initialize();
            }
            
            // Unit Registration
            if (window.unitRegistrationModule && typeof window.unitRegistrationModule.initialize === 'function') {
                window.unitRegistrationModule.initialize();
            }
            
            // Reviews & Newsletter
            if (window.reviewsModule && typeof window.reviewsModule.initialize === 'function') {
                window.reviewsModule.initialize();
            }
            
            // Finance
            if (window.studentFinanceModule && typeof window.studentFinanceModule.initialize === 'function') {
                window.studentFinanceModule.initialize();
            }
            
            // Exam Card
            if (window.examCardModule && typeof window.examCardModule.initialize === 'function') {
                window.examCardModule.initialize();
            }
            
            // Lecture Card
            if (window.lectureCardModule && typeof window.lectureCardModule.initialize === 'function') {
                window.lectureCardModule.initialize();
            }
            
            // Courses
            if (window.coursesModule && typeof window.coursesModule.initialize === 'function') {
                window.coursesModule.initialize();
            }
            
            // Academic Reports
            if (window.academicReportsModule && typeof window.academicReportsModule.initialize === 'function') {
                window.academicReportsModule.initialize();
            }
            
            // Messages
            if (window.messagesModule && typeof window.messagesModule.initialize === 'function') {
                window.messagesModule.initialize();
            }
            
            // Support Tickets
            if (window.ticketsModule && typeof window.ticketsModule.initialize === 'function') {
                window.ticketsModule.initialize();
            }
            
            // Calendar
            if (window.calendarModule && typeof window.calendarModule.initialize === 'function') {
                window.calendarModule.initialize();
            }
            
            // ===== NEW: ENROLLMENT MODULE =====
            if (window.initEnrollment && typeof window.initEnrollment === 'function') {
                console.log('📋 Initializing Enrollment module...');
                setTimeout(window.initEnrollment, 100);
            } else if (window.enrollmentModule && typeof window.enrollmentModule.initialize === 'function') {
                window.enrollmentModule.initialize();
            }
            
            console.log('✅ All modules initialized!');
        }, 500);
    }
    
    // ============================================================
    // 📋 TAB NAVIGATION - COMPLETE
    // ============================================================
    
    showTab(tabId, fromNavigation = false) {
        if (!this.isValidTab(tabId)) tabId = 'dashboard';
        
        if (this.currentTab === tabId && !fromNavigation) return;
        
        console.log(`📂 Showing tab: ${tabId}`);
        
        if (this.isMenuOpen()) {
            console.log('🔒 Closing mobile menu before showing tab...');
            this.closeMenu();
        }
        
        this.tabs.forEach(tab => {
            tab.style.display = 'none';
            tab.classList.remove('active');
        });
        
        const selectedTab = document.getElementById(tabId);
        if (selectedTab) {
            selectedTab.style.display = 'block';
            selectedTab.classList.add('active');
        } else {
            console.error(`❌ Tab element not found: ${tabId}`);
            const dashboard = document.getElementById('dashboard');
            if (dashboard) {
                dashboard.style.display = 'block';
                dashboard.classList.add('active');
            }
        }
        
        this.navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-tab') === tabId) link.classList.add('active');
        });
        
        localStorage.setItem(this.storageKey, tabId);
        this.currentTab = tabId;
        this.updatePageTitle(tabId);
        
        if (fromNavigation) {
            let newUrl = tabId === 'dashboard' ? '/student' : `/student/${tabId}`;
            if (window.location.pathname !== newUrl) {
                history.pushState({}, '', newUrl);
            }
        }
        
        // Load tab module
        setTimeout(() => {
            if (tabId === 'supplementary') {
                console.log('📋 Loading Supplementary tab...');
                if (typeof loadSupplementaryTab === 'function') {
                    loadSupplementaryTab();
                } else if (window.unitRegistrationModule && typeof window.unitRegistrationModule.loadSupplementaryData === 'function') {
                    window.unitRegistrationModule.loadSupplementaryData();
                }
            }
            this.loadTabModule(tabId);
        }, 100);
    }
    
    navigateToTab(tabId) {
        if (!this.isValidTab(tabId)) tabId = 'dashboard';
        console.log(`🖱️ Navigating to tab: ${tabId}`);
        
        let newUrl = tabId === 'dashboard' ? '/student' : `/student/${tabId}`;
        if (window.location.pathname !== newUrl) {
            history.pushState({}, '', newUrl);
        }
        this.showTab(tabId, true);
    }
    
    isValidTab(tabId) {
        return this.validTabs.includes(tabId);
    }
    
    updatePageTitle(tabId) {
        const tabName = this.tabNames[tabId] || 'Dashboard';
        document.title = `${tabName} - NCHSM Student Portal`;
    }
    
    // ============================================================
    // 📦 TAB MODULE LOADER - COMPLETE
    // ============================================================
    
    loadTabModule(tabId) {
        console.log(`📦 Loading module for tab: ${tabId}`);
        setTimeout(() => {
            switch(tabId) {
                case 'dashboard':
                    if (window.dashboardModule?.loadDashboard) window.dashboardModule.loadDashboard();
                    else if (typeof loadDashboard === 'function') loadDashboard();
                    break;
                    
                case 'profile':
                    if (window.profileModule?.loadProfileData) window.profileModule.loadProfileData();
                    else if (typeof loadProfile === 'function') loadProfile();
                    break;
                    
                case 'hub-courses':
                case 'courses':
                    if (window.coursesModule?.loadCourses) window.coursesModule.loadCourses();
                    else if (typeof loadCourses === 'function') loadCourses();
                    break;
                    
                case 'hub-register':
                case 'unit-registration':
                    if (window.unitRegistrationModule?.loadUnits) window.unitRegistrationModule.loadUnits();
                    else if (typeof loadUnits === 'function') loadUnits();
                    break;
                    
                case 'supplementary':
                    console.log('📋 Loading Supplementary Registration...');
                    if (window.unitRegistrationModule?.loadSupplementaryData) {
                        window.unitRegistrationModule.loadSupplementaryData();
                    } else if (typeof loadSupplementaryTab === 'function') {
                        loadSupplementaryTab();
                    }
                    break;
                    
                case 'hub-online-learning':
                    this.loadOnlineLearningTab();
                    break;
                    
                case 'hub-exam-card':
                case 'exam-card':
                    if (window.examCardModule?.loadExamCard) window.examCardModule.loadExamCard();
                    else if (typeof initExamCard === 'function') initExamCard();
                    else if (typeof loadExamCard === 'function') loadExamCard();
                    break;
                    
                case 'hub-lecture-card':
                    if (window.lectureCardModule?.loadLectureCard) window.lectureCardModule.loadLectureCard();
                    else if (typeof initLectureCard === 'function') initLectureCard();
                    else if (typeof loadLectureCard === 'function') loadLectureCard();
                    break;
                    
                case 'cats':
                    if (window.examsModule?.loadExams) window.examsModule.loadExams();
                    else if (typeof loadExams === 'function') loadExams();
                    break;
                    
                case 'resources':
                    if (window.resourcesModule?.loadAllResources) window.resourcesModule.loadAllResources();
                    else if (typeof loadResources === 'function') loadResources();
                    break;
                    
                case 'nurseiq':
                    if (window.nurseiqModule?.loadCourses) window.nurseiqModule.loadCourses();
                    else if (typeof loadNurseIQ === 'function') loadNurseIQ();
                    break;
                    
                case 'academic-reports':
                    if (window.academicReportsModule?.loadReports) window.academicReportsModule.loadReports();
                    else if (typeof loadAcademicReports === 'function') loadAcademicReports();
                    break;
                    
                case 'calendar':
                    if (window.calendarModule?.loadCalendar) window.calendarModule.loadCalendar();
                    else if (typeof loadCalendar === 'function') loadCalendar();
                    break;
                    
                case 'attendance':
                    if (window.attendanceModule?.loadAttendanceHistory) window.attendanceModule.loadAttendanceHistory();
                    else if (typeof loadAttendance === 'function') loadAttendance();
                    break;
                    
                case 'messages':
                    if (window.messagesModule?.loadMessages) window.messagesModule.loadMessages();
                    else if (typeof loadMessages === 'function') loadMessages();
                    break;
                    
                case 'support-tickets':
                    if (window.ticketsModule?.loadTickets) window.ticketsModule.loadTickets();
                    else if (typeof loadTickets === 'function') loadTickets();
                    break;
                    
                case 'finance':
                    console.log('💰 Loading Finance module...');
                    if (window.studentFinanceModule?.loadFinance) {
                        window.studentFinanceModule.loadFinance();
                    } else if (typeof loadStudentFinance === 'function') {
                        loadStudentFinance();
                    }
                    break;
                    
                case 'enrollment':
                    console.log('📋 Loading Enrollment module...');
                    if (window.initEnrollment && typeof window.initEnrollment === 'function') {
                        window.initEnrollment();
                    } else if (window.enrollmentModule && typeof window.enrollmentModule.loadEnrollment === 'function') {
                        window.enrollmentModule.loadEnrollment();
                    } else if (typeof initEnrollment === 'function') {
                        initEnrollment();
                    }
                    break;
                    
                case 'reviews':
                    console.log('⭐ Loading Reviews module...');
                    if (window.reviewsModule?.loadReviews) {
                        window.reviewsModule.loadReviews();
                    } else if (typeof initReviewsModule === 'function') {
                        initReviewsModule();
                    } else if (typeof loadReviews === 'function') {
                        loadReviews();
                    }
                    if (typeof loadSiteRating === 'function') loadSiteRating();
                    if (typeof updateReviewStats === 'function') updateReviewStats();
                    break;
                    
                case 'newsletter':
                    console.log('📧 Loading Newsletter module...');
                    if (window.newsletterModule?.loadNewsletters) {
                        window.newsletterModule.loadNewsletters();
                    } else if (typeof loadNewsletters === 'function') {
                        loadNewsletters();
                    }
                    if (typeof loadNewsletterStatus === 'function') {
                        loadNewsletterStatus();
                    }
                    break;
                    
                default:
                    console.log(`No specific loader for tab: ${tabId}`);
            }
        }, 300);
    }
    
    loadOnlineLearningTab() {
        const container = document.getElementById('hub-online-learning');
        if (!container) return;
        if (!container.innerHTML || container.innerHTML.trim() === '') {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px;">
                    <i class="fas fa-video" style="font-size: 64px; color: #4f46e5; margin-bottom: 20px;"></i>
                    <h2 style="color: #1e293b;">Online Learning</h2>
                    <p style="color: #64748b;">Video lessons, quizzes, and study materials coming soon...</p>
                    <div style="width: 300px; max-width: 80%; height: 8px; background: #e5e7eb; border-radius: 4px; margin: 20px auto;">
                        <div style="width: 65%; height: 100%; background: #4f46e5; border-radius: 4px;"></div>
                    </div>
                    <p style="color: #6b7280; font-size: 14px;">Development in progress - 65% complete</p>
                    <div style="display: flex; gap: 12px; justify-content: center; margin-top: 16px; flex-wrap: wrap;">
                        <span style="background: #d1fae5; color: #065f46; padding: 4px 14px; border-radius: 20px; font-size: 12px;">📹 12 Videos</span>
                        <span style="background: #dbeafe; color: #1e40af; padding: 4px 14px; border-radius: 20px; font-size: 12px;">📝 8 Quizzes</span>
                        <span style="background: #fef3c7; color: #92400e; padding: 4px 14px; border-radius: 20px; font-size: 12px;">📚 15 Resources</span>
                        <span style="background: #f3e8ff; color: #6d28d9; padding: 4px 14px; border-radius: 20px; font-size: 12px;">🤖 DR CYON Ready</span>
                    </div>
                </div>
            `;
        }
    }
    
    // ============================================================
    // 🔄 URL NAVIGATION
    // ============================================================
    
    setupUrlNavigation() {
        const handleRoute = () => {
            let tabId = 'dashboard';
            let path = window.location.pathname;
            
            if (path === '/student') {
                path = '';
            } else if (path.startsWith('/student/')) {
                path = path.replace('/student/', '');
            }
            path = path.replace(/\/$/, '');
            
            if (path && this.isValidTab(path)) {
                tabId = path;
            } else {
                const lastTab = localStorage.getItem(this.storageKey);
                if (lastTab && this.isValidTab(lastTab)) {
                    tabId = lastTab;
                }
            }
            
            if (this.isValidTab(tabId)) {
                this.showTab(tabId, false);
            }
        };
        
        window.addEventListener('popstate', handleRoute);
        setTimeout(handleRoute, 100);
    }
    
    setupTabChangeListener() {}
    
    loadLastTab() {
        this.currentTab = 'dashboard';
        localStorage.setItem(this.storageKey, 'dashboard');
        
        const dashboard = document.getElementById('dashboard');
        if (dashboard) {
            dashboard.style.display = 'block';
            dashboard.classList.add('active');
            console.log('📊 Dashboard activated on page load');
        }
        
        this.tabs.forEach(tab => {
            if (tab.id !== 'dashboard') {
                tab.style.display = 'none';
                tab.classList.remove('active');
            }
        });
        
        this.navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-tab') === 'dashboard') {
                link.classList.add('active');
            }
        });
    }
    
    // ============================================================
    // 🖱️ EVENT LISTENERS - COMPLETE
    // ============================================================
    
    setupEventListeners() {
        console.log('🔧 Setting up event listeners...');
    
        // Mobile menu toggle
        if (this.mobileMenuToggle) {
            try {
                const newToggle = this.mobileMenuToggle.cloneNode(true);
                this.mobileMenuToggle.parentNode.replaceChild(newToggle, this.mobileMenuToggle);
                this.mobileMenuToggle = newToggle;
                this.mobileMenuToggle.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.toggleMenu();
                });
                console.log('✅ Mobile toggle setup complete');
            } catch (error) {
                console.warn('⚠️ Could not setup mobile toggle:', error);
            }
        } else {
            console.warn('⚠️ Mobile menu toggle not found - skipping');
        }
    
        // Overlay click
        if (this.overlay) {
            try {
                const newOverlay = this.overlay.cloneNode(true);
                this.overlay.parentNode.replaceChild(newOverlay, this.overlay);
                this.overlay = newOverlay;
                this.overlay.addEventListener('click', () => {
                    this.closeMenu();
                });
                console.log('✅ Overlay click setup complete');
            } catch (error) {
                console.warn('⚠️ Could not setup overlay:', error);
            }
        }
    
        // Dropdown toggle setup
        this.setupDropdownToggle();
    
        // SIDEBAR NAVIGATION LINKS - COMPLETE
        const allNavLinks = document.querySelectorAll(
            '.nav a[data-tab], .dropdown-submenu a[data-tab], ' +
            '.footer-links a[data-tab], .nav-premium a[data-tab], ' +
            '.dropdown-submenu-premium a[data-tab], #sidebar a[data-tab]'
        );
        console.log(`🔗 Found ${allNavLinks.length} navigation links`);
    
        allNavLinks.forEach(link => {
            try {
                if (link.classList.contains('dropdown-toggle') || 
                    link.classList.contains('dropdown-toggle-premium')) {
                    return;
                }
    
                const tabId = link.getAttribute('data-tab');
                if (!tabId || !this.isValidTab(tabId)) return;
    
                const newLink = link.cloneNode(true);
                link.parentNode.replaceChild(newLink, link);
    
                newLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log(`🖱️ Link clicked: ${tabId}`);
                    if (this.isMenuOpen()) this.closeMenu();
                    this.navigateToTab(tabId);
                });
            } catch (error) {
                console.warn('⚠️ Could not setup link:', error);
            }
        });
    
        // Header logout
        if (this.headerLogout) {
            try {
                const newLogout = this.headerLogout.cloneNode(true);
                this.headerLogout.parentNode.replaceChild(newLogout, this.headerLogout);
                this.headerLogout = newLogout;
                this.headerLogout.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.logout();
                });
                console.log('✅ Logout button setup complete');
            } catch (error) {
                console.warn('⚠️ Could not setup logout:', error);
            }
        }
    
        // Header refresh
        if (this.headerRefresh) {
            try {
                const newRefresh = this.headerRefresh.cloneNode(true);
                this.headerRefresh.parentNode.replaceChild(newRefresh, this.headerRefresh);
                this.headerRefresh = newRefresh;
                this.headerRefresh.addEventListener('click', () => this.refreshDashboard());
                console.log('✅ Refresh button setup complete');
            } catch (error) {
                console.warn('⚠️ Could not setup refresh:', error);
            }
        }
    
        // Utility buttons
        if (this.clearCacheBtn) {
            this.clearCacheBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.clearCache();
            });
        }
    
        if (this.exportDataBtn) {
            this.exportDataBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.exportData();
            });
        }
    
        if (this.systemInfoBtn) {
            this.systemInfoBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSystemInfo();
            });
        }
    
        // Dashboard stat cards
        setTimeout(() => {
            document.querySelectorAll('.stat-card[data-tab]').forEach(card => {
                try {
                    const newCard = card.cloneNode(true);
                    card.parentNode.replaceChild(newCard, card);
                    newCard.addEventListener('click', (e) => {
                        e.preventDefault();
                        const tabId = newCard.getAttribute('data-tab');
                        if (tabId && this.isValidTab(tabId)) {
                            if (this.isMenuOpen()) this.closeMenu();
                            this.navigateToTab(tabId);
                        }
                    });
                } catch (error) {}
            });
        }, 1000);
    
        // Close menu on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isMenuOpen()) {
                this.closeMenu();
            }
        });
    
        // Close menu on resize
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && this.isMenuOpen()) {
                this.closeMenu();
            }
        });
    
        console.log('✅ Event listeners setup complete');
    }
    
    // ============================================================
    // 📂 DROPDOWN TOGGLE
    // ============================================================
    
    setupDropdownToggle() {
        const dropdownParent = document.querySelector('.has-dropdown, .has-dropdown-premium');
        const dropdownToggle = document.querySelector('.has-dropdown > a, .has-dropdown-premium > .dropdown-toggle-premium');
        const dropdownMenu = document.querySelector('.dropdown-submenu, .dropdown-submenu-premium');
        
        if (!dropdownToggle || !dropdownMenu) {
            console.warn('⚠️ Dropdown elements not found');
            return;
        }
        
        console.log('✅ Found dropdown elements, setting up toggle...');
        
        const newToggle = dropdownToggle.cloneNode(true);
        dropdownToggle.parentNode.replaceChild(newToggle, dropdownToggle);
        
        newToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const parent = newToggle.closest('.has-dropdown, .has-dropdown-premium');
            if (parent) {
                const isOpen = parent.classList.contains('open');
                
                document.querySelectorAll('.has-dropdown.open, .has-dropdown-premium.open').forEach(drop => {
                    if (drop !== parent) {
                        drop.classList.remove('open');
                        const submenu = drop.querySelector('.dropdown-submenu, .dropdown-submenu-premium');
                        if (submenu) submenu.style.display = 'none';
                    }
                });
                
                if (isOpen) {
                    parent.classList.remove('open');
                    dropdownMenu.style.display = 'none';
                } else {
                    parent.classList.add('open');
                    dropdownMenu.style.display = 'block';
                }
            }
        });
        
        const menuItems = dropdownMenu.querySelectorAll('a[data-tab]');
        menuItems.forEach(item => {
            const newItem = item.cloneNode(true);
            item.parentNode.replaceChild(newItem, item);
            
            newItem.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    if (dropdownParent) dropdownParent.classList.remove('open');
                    if (dropdownMenu) dropdownMenu.style.display = 'none';
                }
            });
        });
        
        console.log('✅ Dropdown toggle setup complete');
    }
    
    // ============================================================
    // 👤 PROFILE DROPDOWN
    // ============================================================
    
    setupProfileDropdown() {
        setTimeout(() => {
            const oldDropdown = document.querySelector('.dropdown-menu, .simple-dropdown-menu');
            if (oldDropdown) oldDropdown.remove();
            this.createSimpleDropdown();
            this.setupSimpleTrigger();
        }, 1000);
    }
    
    createSimpleDropdown() {
        this.dropdownMenu = document.createElement('div');
        this.dropdownMenu.className = 'simple-dropdown-menu';
        this.dropdownMenu.innerHTML = `
            <div style="padding:12px 16px; border-bottom:1px solid #f1f5f9;">
                <div style="font-weight:600; color:#0F172A;">${this.getUserName()}</div>
                <div style="font-size:12px; color:#94a3b8;">${this.getUserProgram()}</div>
            </div>
            <a href="#" data-action="profile" class="simple-menu-item"><i class="fas fa-user"></i> My Profile</a>
            <a href="#" data-action="dashboard" class="simple-menu-item"><i class="fas fa-home"></i> Dashboard</a>
            <div class="simple-menu-divider" style="height:1px;background:#f1f5f9;margin:4px 0;"></div>
            <a href="#" data-action="logout" class="simple-menu-item" style="color:#dc2626;"><i class="fas fa-sign-out-alt"></i> Logout</a>
        `;
        this.dropdownMenu.style.cssText = 'display:none;position:absolute;top:50px;right:0;background:white;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,0.12);min-width:220px;z-index:1001;padding:8px 0;overflow:hidden';
        
        this.dropdownMenu.querySelectorAll('.simple-menu-item').forEach(item => {
            item.style.cssText = 'display:block;padding:10px 16px;color:#374151;text-decoration:none;font-size:14px;cursor:pointer;transition:background 0.2s';
            item.onmouseenter = () => item.style.background = '#f8fafc';
            item.onmouseleave = () => item.style.background = 'transparent';
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.dropdownMenu.style.display = 'none';
                if (item.dataset.action === 'logout') this.logout();
                else if (item.dataset.action === 'profile') this.navigateToTab('profile');
                else if (item.dataset.action === 'dashboard') this.navigateToTab('dashboard');
            });
        });
        
        const container = document.querySelector('.user-profile-dropdown, .header-right, .profile-trigger-container');
        if (container) {
            container.style.position = 'relative';
            container.appendChild(this.dropdownMenu);
        } else {
            document.body.appendChild(this.dropdownMenu);
        }
    }
    
    getUserName() {
        return window.currentUserProfile?.full_name || 
               window.currentUserProfile?.name || 
               'Student';
    }
    
    getUserProgram() {
        return window.currentUserProfile?.program || 
               window.currentUserProfile?.program_type || 
               'KRCHN';
    }
    
    setupSimpleTrigger() {
        this.profileTrigger = document.querySelector('.profile-trigger, .header-profile, [data-profile]');
        if (!this.profileTrigger) {
            this.profileTrigger = document.querySelector('.profile-avatar')?.closest('.profile-trigger, [data-profile]');
        }
        if (!this.profileTrigger) return;
        
        const cleanTrigger = this.profileTrigger.cloneNode(true);
        this.profileTrigger.parentNode.replaceChild(cleanTrigger, this.profileTrigger);
        this.profileTrigger = cleanTrigger;
        this.profileTrigger.style.cursor = 'pointer';
        
        this.profileTrigger.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.dropdownMenu.style.display = this.dropdownMenu.style.display === 'block' ? 'none' : 'block';
        });
        
        document.addEventListener('click', (e) => {
            if (this.dropdownMenu && this.dropdownMenu.style.display === 'block' &&
                !this.profileTrigger.contains(e.target) && 
                !this.dropdownMenu.contains(e.target)) {
                this.dropdownMenu.style.display = 'none';
            }
        });
    }
    
    // ============================================================
    // 📱 MOBILE MENU
    // ============================================================
    
    isMenuOpen() {
        return (this.sidebar && (this.sidebar.classList.contains('active') || this.sidebar.classList.contains('open')));
    }
    
    openMenu() {
        if (this.sidebar) {
            this.sidebar.classList.add('active');
            this.sidebar.classList.add('open');
        }
        if (this.overlay) {
            this.overlay.classList.add('active');
            this.overlay.style.display = 'block';
            this.overlay.style.backdropFilter = 'none';
            this.overlay.style.webkitBackdropFilter = 'none';
            this.overlay.style.background = 'rgba(0, 0, 0, 0.4)';
        }
        document.body.style.overflow = 'hidden';
        document.body.style.backdropFilter = 'none';
        document.body.style.webkitBackdropFilter = 'none';
        document.body.style.filter = 'none';
        console.log('📱 Mobile menu opened - NO BLUR');
    }
    
    closeMenu() {
        if (this.sidebar) {
            this.sidebar.classList.remove('active');
            this.sidebar.classList.remove('open');
        }
        if (this.overlay) {
            this.overlay.classList.remove('active');
            this.overlay.style.display = 'none';
            this.overlay.style.backdropFilter = 'none';
            this.overlay.style.webkitBackdropFilter = 'none';
            this.overlay.style.background = 'rgba(0, 0, 0, 0)';
        }
        document.body.style.overflow = '';
        document.body.style.backdropFilter = 'none';
        document.body.style.webkitBackdropFilter = 'none';
        document.body.style.filter = 'none';
        console.log('📱 Mobile menu closed - NO BLUR');
    }
    
    toggleMenu() {
        if (this.isMenuOpen()) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }
    
    // ============================================================
    // ⭐ REVIEWS BADGE UPDATER
    // ============================================================
    
    startReviewsBadgeUpdater() {
        setTimeout(() => this.updateReviewsBadge(), 500);
        if (this.reviewsBadgeInterval) {
            clearInterval(this.reviewsBadgeInterval);
        }
        this.reviewsBadgeInterval = setInterval(() => {
            this.updateReviewsBadge();
        }, 30000);
    }
    
    async updateReviewsBadge() {
        try {
            const supabase = this.getSupabaseClient();
            if (!supabase) return;
            
            const reviewsTab = document.getElementById('reviews');
            if (!reviewsTab) return;
            
            // Get pending reviews count
            const { count, error } = await supabase
                .from('student_reviews')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending');
            
            if (error) throw error;
            
            const badge = document.getElementById('reviewsBadge');
            if (badge) {
                if (count > 0) {
                    badge.textContent = count > 99 ? '99+' : count;
                    badge.style.display = 'inline-block';
                    badge.style.background = '#ef4444';
                    badge.style.color = 'white';
                    badge.style.padding = '0 8px';
                    badge.style.borderRadius = '20px';
                    badge.style.fontSize = '10px';
                    badge.style.fontWeight = '600';
                    badge.style.marginLeft = '8px';
                } else {
                    badge.style.display = 'none';
                }
            }
            
            // Supplementary badge
            try {
                const { count: suppCount } = await supabase
                    .from('student_unit_registrations')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'pending')
                    .in('reg_type', ['Supplementary', 'Resit', 'Retake']);
                
                const suppBadge = document.getElementById('suppTabBadge');
                if (suppBadge) {
                    if (suppCount > 0) {
                        suppBadge.textContent = suppCount > 99 ? '99+' : suppCount;
                        suppBadge.style.display = 'inline-block';
                        suppBadge.style.background = '#B45309';
                        suppBadge.style.color = 'white';
                        suppBadge.style.padding = '0 8px';
                        suppBadge.style.borderRadius = '20px';
                        suppBadge.style.fontSize = '10px';
                        suppBadge.style.fontWeight = '600';
                        suppBadge.style.marginLeft = '8px';
                    } else {
                        suppBadge.style.display = 'none';
                    }
                }
            } catch (suppError) {}
            
            // Newsletter badge
            try {
                const userId = window.currentUserId;
                if (userId) {
                    const { count: subCount, error: subError } = await supabase
                        .from('newsletter_subscribers')
                        .select('*', { count: 'exact', head: true })
                        .eq('user_id', userId);
                    
                    if (!subError) {
                        const nlBadge = document.getElementById('newsletterBadge');
                        if (nlBadge) {
                            if (subCount > 0) {
                                nlBadge.textContent = '✓';
                                nlBadge.style.display = 'inline-block';
                                nlBadge.style.background = '#10b981';
                                nlBadge.style.color = 'white';
                                nlBadge.style.padding = '0 8px';
                                nlBadge.style.borderRadius = '20px';
                                nlBadge.style.fontSize = '10px';
                                nlBadge.style.marginLeft = '8px';
                            } else {
                                nlBadge.textContent = '✕';
                                nlBadge.style.display = 'inline-block';
                                nlBadge.style.background = '#6b7280';
                                nlBadge.style.color = 'white';
                                nlBadge.style.padding = '0 8px';
                                nlBadge.style.borderRadius = '20px';
                                nlBadge.style.fontSize = '10px';
                                nlBadge.style.marginLeft = '8px';
                            }
                        }
                    }
                }
            } catch (nlError) {}
            
            // ===== NEW: Enrollment badge =====
            try {
                const userId = window.currentUserId;
                if (userId) {
                    const { count: enrCount, error: enrError } = await supabase
                        .from('student_requests')
                        .select('*', { count: 'exact', head: true })
                        .eq('student_id', userId)
                        .eq('status', 'pending');
                    
                    if (!enrError) {
                        const enrBadge = document.getElementById('enrPendingBadge');
                        if (enrBadge) {
                            if (enrCount > 0) {
                                enrBadge.textContent = enrCount > 99 ? '99+' : enrCount;
                                enrBadge.style.display = 'inline-block';
                                enrBadge.style.background = '#f59e0b';
                                enrBadge.style.color = '#0A3D62';
                                enrBadge.style.padding = '0 8px';
                                enrBadge.style.borderRadius = '20px';
                                enrBadge.style.fontSize = '10px';
                                enrBadge.style.fontWeight = '600';
                                enrBadge.style.marginLeft = '8px';
                            } else {
                                enrBadge.textContent = '0';
                                enrBadge.style.display = 'inline-block';
                                enrBadge.style.background = '#e5e7eb';
                                enrBadge.style.color = '#6b7280';
                                enrBadge.style.padding = '0 8px';
                                enrBadge.style.borderRadius = '20px';
                                enrBadge.style.fontSize = '10px';
                                enrBadge.style.fontWeight = '600';
                                enrBadge.style.marginLeft = '8px';
                            }
                        }
                    }
                }
            } catch (enrError) {
                console.warn('Could not update enrollment badge:', enrError);
            }
            
        } catch (error) {
            console.warn('Could not update badges:', error);
        }
    }
    
    // ============================================================
    // 👤 USER DATA MANAGEMENT
    // ============================================================
    
    setupAppLoading() {
        if (!this.loadingScreen) {
            this.createFallbackLoadingScreen();
            return;
        }
        this.loadingScreen.classList.add('app-splash');
        const welcomeText = this.loadingScreen.querySelector('.welcome-text h1');
        if (welcomeText) welcomeText.textContent = 'NCHSM Portal';
        const subtitle = this.loadingScreen.querySelector('.subtitle');
        if (subtitle) subtitle.textContent = 'Your Academic Hub';
    }
    
    createFallbackLoadingScreen() {
        const fallback = document.createElement('div');
        fallback.id = 'loading-fallback';
        fallback.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);display:flex;justify-content:center;align-items:center;z-index:9999;color:white';
        fallback.innerHTML = '<div style="text-align:center"><h1>NCHSM Portal</h1><p>Loading...</p></div>';
        document.body.appendChild(fallback);
        this.loadingScreen = fallback;
    }
    
    async hideLoadingScreen() {
        if (this.loadingScreen) this.loadingScreen.style.display = 'none';
        setTimeout(() => this.showToast('Welcome to NCHSM Student Portal!', 'success', 3000), 500);
    }
    
    cleanupInitialStyles() {
        this.tabs.forEach(tab => {
            tab.style.removeProperty('display');
            tab.classList.remove('active');
        });
        this.navLinks.forEach(link => link.classList.remove('active'));
        if (window.innerWidth <= 768 && this.sidebar) this.sidebar.classList.remove('active', 'open');
    }
    
    async loadInitialUserData() {
        await this.delay(1000);
        const userId = window.currentUserId;
        const userProfile = window.currentUserProfile;
        
        if (userId && this.supabase) {
            try {
                const dbUserData = await this.loadUserFromDatabase(userId);
                if (dbUserData) {
                    window.currentUserProfile = dbUserData;
                    this.updateAllUserInfo(dbUserData);
                    await this.loadLastLogin();
                    await this.updateProfilePhoto(dbUserData);
                } else if (userProfile) {
                    this.updateAllUserInfo(userProfile);
                    await this.loadLastLogin();
                    await this.updateProfilePhoto(userProfile);
                } else {
                    this.updateDefaultUserInfo();
                }
            } catch (dbError) {
                if (userProfile) {
                    this.updateAllUserInfo(userProfile);
                    await this.loadLastLogin();
                    await this.updateProfilePhoto(userProfile);
                } else {
                    this.updateDefaultUserInfo();
                }
            }
        } else if (userProfile) {
            this.updateAllUserInfo(userProfile);
            if (userId) {
                await this.loadLastLogin();
            }
            await this.updateProfilePhoto(userProfile);
        } else {
            this.updateDefaultUserInfo();
        }
    }
    
    async loadUserFromDatabase(userId) {
        if (!this.supabase) return null;
        try {
            const { data, error } = await this.supabase
                .from('consolidated_user_profiles_table')
                .select('*')
                .or(`id.eq.${userId},user_id.eq.${userId}`)
                .maybeSingle();
            if (error) return null;
            return data;
        } catch (error) { return null; }
    }
    
    async updateAllUserInfo(userProfile = null) {
        let profile = userProfile || window.currentUserProfile;
        if (!profile && window.currentUserId) profile = await this.loadUserFromDatabase(window.currentUserId);
        if (!profile) { this.updateDefaultUserInfo(); return; }
        
        const studentName = profile.full_name || profile.email?.split('@')[0] || 'Student';
        if (this.headerUserName) this.headerUserName.textContent = studentName;
        
        await this.updateProfilePhoto(profile);
        
        const welcomeHeader = document.getElementById('welcome-header');
        if (welcomeHeader) {
            const now = new Date();
            const hour = now.getHours();
            const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
            welcomeHeader.textContent = `${greeting}, ${studentName}!`;
        }
        
        // Update sidebar
        this.updateSidebarUserData();
    }
    
    updateDefaultUserInfo() {
        const defaultName = 'Student';
        if (this.headerUserName) this.headerUserName.textContent = defaultName;
        if (this.headerProfilePhoto) {
            this.headerProfilePhoto.src = 'https://ui-avatars.com/api/?name=Student&background=4C1D95&color=fff&size=100&bold=true';
        }
        if (this.headerLastLogin) this.headerLastLogin.textContent = 'Not available';
        const welcomeHeader = document.getElementById('welcome-header');
        if (welcomeHeader) {
            const now = new Date();
            const hour = now.getHours();
            const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
            welcomeHeader.textContent = `${greeting}, ${defaultName}!`;
        }
    }
    
    async updateProfilePhoto(userProfile = null) {
        if (!this.headerProfilePhoto) return;
        
        try {
            let profile = userProfile || window.currentUserProfile;
            let photoUrl = null;
            const supabaseStorageUrl = 'https://lwhtjozfsmbyihenfunw.supabase.co/storage/v1/object/public/passports/';
            
            if ((!profile || !profile.passport_url) && window.currentUserId && this.supabase) {
                const { data } = await this.supabase
                    .from('consolidated_user_profiles_table')
                    .select('full_name, passport_url')
                    .eq('user_id', window.currentUserId)
                    .single();
                profile = data;
            }
            
            if (profile && profile.passport_url) {
                if (profile.passport_url.startsWith('http')) {
                    photoUrl = profile.passport_url;
                } else {
                    photoUrl = supabaseStorageUrl + profile.passport_url;
                }
                console.log('✅ Using passport photo from database');
            }
            
            if (!photoUrl) {
                photoUrl = localStorage.getItem('userProfilePhoto');
            }
            
            if (!photoUrl) {
                const name = profile?.full_name || profile?.email?.split('@')[0] || 'Student';
                const cleanName = name.replace(/\s+/g, '+');
                photoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=4C1D95&color=fff&size=100&bold=true&length=2`;
                console.log('🎨 Using generated avatar');
            }
            
            this.headerProfilePhoto.src = photoUrl;
            this.headerProfilePhoto.alt = profile?.full_name || 'Profile';
            
            this.headerProfilePhoto.onerror = () => {
                console.warn('⚠️ Failed to load image, using fallback avatar');
                const name = profile?.full_name || 'Student';
                this.headerProfilePhoto.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name.substring(0, 2))}&background=4C1D95&color=fff&size=100&bold=true`;
            };
            
            if (photoUrl && !photoUrl.includes('ui-avatars')) {
                localStorage.setItem('userProfilePhoto', photoUrl);
            }
            
        } catch (error) {
            console.error('❌ Error updating profile photo:', error);
            this.headerProfilePhoto.src = 'https://ui-avatars.com/api/?name=User&background=4C1D95&color=fff&size=100&bold=true';
        }
    }
    
    async loadLastLogin() {
        try {
            const userId = window.currentUserId;
            if (!userId || !this.supabase) return;
            
            const { data, error } = await this.supabase
                .from('consolidated_user_profiles_table')
                .select('last_login, login_count')
                .eq('user_id', userId)
                .single();
            
            if (error) {
                console.warn('Error loading last login:', error);
                if (this.headerLastLogin) this.headerLastLogin.textContent = 'Not available';
                return;
            }
            
            if (this.headerLastLogin) {
                if (data && data.last_login) {
                    const lastLoginDate = new Date(data.last_login);
                    const timeString = lastLoginDate.toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit',
                        hour12: true 
                    });
                    this.headerLastLogin.textContent = timeString;
                    this.headerLastLogin.title = `Last login: ${lastLoginDate.toLocaleString()}`;
                    console.log('✅ Last login time loaded:', timeString);
                } else {
                    this.headerLastLogin.textContent = 'First login';
                }
            }
            
        } catch (error) {
            console.error('Failed to load last login:', error);
            if (this.headerLastLogin) this.headerLastLogin.textContent = 'Error';
        }
    }
    
    async updateLastLogin(userId) {
        try {
            if (!userId || !this.supabase) return false;
            
            const now = new Date().toISOString();
            
            const { data: currentData, error: fetchError } = await this.supabase
                .from('consolidated_user_profiles_table')
                .select('login_count')
                .eq('user_id', userId)
                .single();
            
            if (fetchError) {
                console.warn('Could not fetch current login data:', fetchError);
            }
            
            const currentCount = currentData?.login_count || 0;
            const newCount = currentCount + 1;
            
            const { error: updateError } = await this.supabase
                .from('consolidated_user_profiles_table')
                .update({ 
                    last_login: now,
                    login_count: newCount,
                    updated_at: now
                })
                .eq('user_id', userId);
            
            if (updateError) {
                console.error('Failed to update last login:', updateError);
                return false;
            }
            
            console.log(`✅ Last login updated to: ${new Date(now).toLocaleTimeString()}`);
            console.log(`📊 Total logins: ${newCount}`);
            
            await this.loadLastLogin();
            return true;
            
        } catch (error) {
            console.error('Error updating last login:', error);
            return false;
        }
    }
    
    async recordNewLogin(userId) {
        try {
            if (!userId || !this.supabase) return false;
            
            const lastUpdateKey = `nchsm_last_update_${userId}`;
            const lastUpdateDate = localStorage.getItem(lastUpdateKey);
            const today = new Date().toDateString();
            
            if (lastUpdateDate !== today) {
                console.log('🆕 New day - updating last login...');
                localStorage.setItem(lastUpdateKey, today);
                return await this.updateLastLogin(userId);
            } else {
                console.log('📅 Already updated today - just loading saved time');
                await this.loadLastLogin();
                return true;
            }
        } catch (error) {
            console.error('Error recording login:', error);
            return false;
        }
    }
    
    // ============================================================
    // 📊 SIDEBAR USER DATA UPDATE
    // ============================================================
    
    updateSidebarUserData() {
        console.log('🔄 Updating sidebar user data...');
        
        const userData = window.currentUserProfile || {};
        
        // 1. Update name
        const userName = document.getElementById('sidebarUserName');
        if (userName) {
            userName.textContent = userData.full_name || userData.name || 'Student';
        }
        
        // 2. Update program
        const userProgram = document.getElementById('sidebarUserProgram');
        if (userProgram) {
            userProgram.textContent = userData.program || userData.program_type || 'KRCHN';
        }
        
        // 3. Update avatar
        const avatar = document.getElementById('sidebar-avatar');
        if (avatar) {
            const name = (userData.full_name || 'Student').replace(/\s+/g, '+');
            avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4C1D95&color=fff&size=100&bold=true`;
        }
        
        // 4. Update last login
        const lastLoginTime = document.getElementById('sidebar-last-login-time');
        if (lastLoginTime) {
            const now = new Date();
            const date = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            lastLoginTime.textContent = `${date} at ${time}`;
        }
        
        // 5. Update device
        const deviceEl = document.getElementById('sidebar-last-login-device');
        if (deviceEl) {
            const ua = navigator.userAgent;
            let device = 'Desktop';
            if (/mobile/i.test(ua)) device = 'Mobile';
            else if (/tablet/i.test(ua)) device = 'Tablet';
            let browser = 'Chrome';
            if (ua.includes('Firefox')) browser = 'Firefox';
            else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
            else if (ua.includes('Edge')) browser = 'Edge';
            else if (ua.includes('Opera')) browser = 'Opera';
            deviceEl.textContent = `${browser} (${device})`;
        }
        
        // 6. Update XP
        const xpLevel = document.getElementById('sidebarUserLevel');
        const xpValue = document.getElementById('sidebarUserXP');
        const xpProgress = document.getElementById('sidebarXPProgress');
        const nextLevel = document.getElementById('sidebarNextLevel');
        
        if (window.dashboardModule && window.dashboardModule.metrics) {
            const metrics = window.dashboardModule.metrics;
            if (xpLevel) xpLevel.textContent = metrics.xp?.level || 1;
            if (xpValue) xpValue.textContent = `${metrics.xp?.current || 0} XP`;
            if (xpProgress) xpProgress.style.width = (metrics.xp?.percent || 0) + '%';
            if (nextLevel) nextLevel.textContent = (metrics.xp?.level || 1) + 1;
        } else {
            // Fallback: try to get from DOM
            const levelEl = document.getElementById('user-level');
            const xpEl = document.getElementById('user-xp');
            const progressEl = document.getElementById('xp-progress-fill');
            
            if (xpLevel) xpLevel.textContent = levelEl?.textContent || '1';
            if (xpValue) xpValue.textContent = `${xpEl?.textContent || '0'} XP`;
            if (xpProgress) xpProgress.style.width = progressEl?.style.width || '0%';
            if (nextLevel) nextLevel.textContent = parseInt(xpLevel?.textContent || '1') + 1;
        }
        
        console.log('✅ Sidebar user data updated');
    }
    
    // ============================================================
    // 🔄 REFRESH DASHBOARD
    // ============================================================
    
    refreshDashboard() {
        this.showToast('🔄 Refreshing dashboard...', 'info', 1500);
        if (window.dashboardModule?.refreshDashboard) window.dashboardModule.refreshDashboard();
        if (this.currentTab === 'exam-card' && typeof initExamCard === 'function') initExamCard();
        this.updateProfilePhoto();
        this.updateReviewsBadge();
        this.updateSidebarUserData();
        // Refresh current tab module
        this.loadTabModule(this.currentTab);
    }
    
    // ============================================================
    // 📊 TOAST NOTIFICATIONS
    // ============================================================
    
    showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `custom-toast toast-${type}`;
        toast.textContent = message.length > 100 ? message.substring(0, 100) + '...' : message;
        toast.style.cssText = `position:fixed;bottom:20px;right:20px;background:${this.getToastColor(type)};color:white;padding:12px 20px;border-radius:8px;z-index:9999;box-shadow:0 4px 15px rgba(0,0,0,0.2);max-width:350px;font-size:14px;opacity:0;transform:translateY(20px);transition:all 0.3s ease`;
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '1'; toast.style.transform = 'translateY(0)'; }, 10);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
    
    getToastColor(type) {
        const colors = { 'info': '#4C1D95', 'success': '#10B981', 'warning': '#F59E0B', 'error': '#EF4444' };
        return colors[type] || colors.info;
    }
    
    // ============================================================
    // 🔐 LOGOUT
    // ============================================================
    
    async logout() {
        if (typeof Swal !== 'undefined') {
            const result = await Swal.fire({
                title: 'Ready to Leave?',
                text: 'Are you sure you want to logout from NCHSM Student Portal?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#4C1D95',
                cancelButtonColor: '#6b7280',
                confirmButtonText: 'Yes, Logout',
                cancelButtonText: 'Cancel',
                background: 'white'
            });
            
            if (result.isConfirmed) {
                localStorage.removeItem(this.storageKey);
                localStorage.removeItem('userProfilePhoto');
                localStorage.removeItem('currentUserProfile');
                sessionStorage.clear();
                
                if (this.supabase?.auth) {
                    await this.supabase.auth.signOut();
                }
                
                await this.delay(500);
                window.location.href = '/login';
            }
        } else {
            if (confirm('Are you sure you want to logout?')) {
                localStorage.removeItem(this.storageKey);
                localStorage.removeItem('userProfilePhoto');
                localStorage.removeItem('currentUserProfile');
                sessionStorage.clear();
                if (this.supabase?.auth) await this.supabase.auth.signOut();
                window.location.href = '/login';
            }
        }
    }
    
    // ============================================================
    // 🛠️ UTILITY FUNCTIONS
    // ============================================================
    
    initializeDateTime() {
        const updateHeaderTime = () => {
            if (this.headerTime) {
                this.headerTime.textContent = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            }
        };
        updateHeaderTime();
        setInterval(updateHeaderTime, 60000);
    }
    
    setupOfflineIndicator() {
        const indicator = document.getElementById('offlineIndicator');
        if (!indicator) return;
        const updateOnlineStatus = () => {
            if (navigator.onLine) {
                indicator.style.display = 'none';
                this.showToast('You are back online!', 'success', 2000);
            } else {
                indicator.style.display = 'block';
                this.showToast('You are offline. Some features may be limited.', 'warning');
            }
        };
        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        updateOnlineStatus();
    }
    
    setupMobileMenuVisibility() {
        if (!this.mobileMenuToggle) return;
        const updateVisibility = () => {
            this.mobileMenuToggle.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
            if (window.innerWidth > 768) this.closeMenu();
        };
        updateVisibility();
        window.addEventListener('resize', updateVisibility);
    }
    
    clearCache() {
        if (confirm('Clear all cached data?')) {
            if ('caches' in window) {
                caches.keys().then(cacheNames => cacheNames.forEach(cacheName => caches.delete(cacheName)));
            }
            localStorage.removeItem('userProfilePhoto');
            localStorage.removeItem('currentUserProfile');
            this.showToast('🧹 Cache cleared!', 'success');
        }
    }
    
    exportData() { this.showToast('📤 Export feature coming soon', 'info'); }
    
    showSystemInfo() {
        alert(`NCHSM Student Portal v3.0\n\nBrowser: ${navigator.userAgent}\nOnline: ${navigator.onLine ? 'Yes' : 'No'}\nCurrent Tab: ${this.currentTab}\nUser: ${window.currentUserProfile?.full_name || 'Not logged in'}\n\n🔗 DR CYON: Active\n⭐ Reviews: ${this.data?.reviews?.length || 0}\n📧 Newsletter: ${this.data?.newsletters?.length || 0}\n📋 Enrollment: ${this.data?.enrollment?.length || 0}\n\n© 2026 Nakuru College of Health Sciences and Management`);
    }
    
    forceShowTab(tabId) { this.showTab(tabId); }
    closeTranscriptModal() { if (this.transcriptModal) this.transcriptModal.style.display = 'none'; }
    closeReader() { if (this.mobileReader) this.mobileReader.style.display = 'none'; }
    
    debugAll() {
        console.log('🔍 UI DEBUG INFO:');
        console.log('- Current tab:', this.currentTab);
        console.log('- Menu open:', this.isMenuOpen());
        console.log('- Sidebar classes:', this.sidebar ? this.sidebar.className : 'no sidebar');
        console.log('- Overlay visible:', this.overlay ? this.overlay.style.display : 'no overlay');
        console.log('- Valid tabs:', this.validTabs);
        console.log('- Current path:', window.location.pathname);
        console.log('- Supabase client:', !!this.supabase);
        console.log('- Current user:', this.currentUser);
        
        const dropdown = document.querySelector('.has-dropdown, .has-dropdown-premium');
        const dropdownMenu = document.querySelector('.dropdown-submenu, .dropdown-submenu-premium');
        console.log('- Dropdown exists:', !!dropdown);
        console.log('- Dropdown menu exists:', !!dropdownMenu);
        if (dropdown) {
            console.log('- Dropdown open class:', dropdown.classList.contains('open'));
        }
    }
}

// ============================================================
// 🚀 PREMIUM SIDEBAR HANDLER
// ============================================================

function initPremiumSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const toggle = document.getElementById('mobile-menu-toggle');
    const collapseBtn = document.getElementById('sidebarCollapseBtn');
    
    console.log('🔧 Initializing Premium Sidebar...');
    
    if (!sidebar) {
        console.warn('⚠️ Sidebar not found');
        return;
    }

    // Fix sidebar z-index and pointer events
    sidebar.style.zIndex = '9999';
    sidebar.style.pointerEvents = 'auto';
    sidebar.style.overflowY = 'auto';
    sidebar.style.overflowX = 'hidden';
    sidebar.style.maxHeight = '100vh';
    console.log('✅ Sidebar z-index and scroll fixed');
    
    // Fix overlay
    if (overlay) {
        overlay.style.zIndex = '9998';
        overlay.style.pointerEvents = 'auto';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.background = 'rgba(0, 0, 0, 0.5)';
        overlay.style.backdropFilter = 'none';
        overlay.style.display = 'none';
        console.log('✅ Overlay z-index and pointer events fixed');
    }

    // Fix nav links
    document.querySelectorAll('.nav-premium a, .dropdown-submenu-premium a').forEach(link => {
        link.style.pointerEvents = 'auto';
        link.style.position = 'relative';
        link.style.zIndex = '9999';
        link.style.cursor = 'pointer';
        link.style.opacity = '1';
        link.style.visibility = 'visible';
    });

    // Mobile toggle
    if (toggle) {
        const newToggle = toggle.cloneNode(true);
        toggle.parentNode.replaceChild(newToggle, toggle);
        
        newToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const isOpen = sidebar.classList.contains('active') || sidebar.classList.contains('open');
            
            if (isOpen) {
                sidebar.classList.remove('active', 'open');
                if (overlay) {
                    overlay.classList.remove('active', 'show');
                    overlay.style.display = 'none';
                }
                document.body.style.overflow = '';
                document.body.style.position = '';
                console.log('📱 Sidebar CLOSED');
            } else {
                sidebar.classList.add('active', 'open');
                if (overlay) {
                    overlay.classList.add('active', 'show');
                    overlay.style.display = 'block';
                }
                document.body.style.overflow = 'hidden';
                document.body.style.position = 'fixed';
                console.log('📱 Sidebar OPENED');
            }
        });
        
        console.log('✅ Mobile toggle fixed');
    }

    // Overlay close
    if (overlay) {
        const newOverlay = overlay.cloneNode(true);
        overlay.parentNode.replaceChild(newOverlay, overlay);
        
        newOverlay.addEventListener('click', function() {
            if (sidebar.classList.contains('active') || sidebar.classList.contains('open')) {
                sidebar.classList.remove('active', 'open');
                this.classList.remove('active', 'show');
                this.style.display = 'none';
                document.body.style.overflow = '';
                document.body.style.position = '';
                console.log('📱 Sidebar closed via overlay');
            }
        });
    }

    // Nav links
    document.querySelectorAll('.nav-premium a[data-tab], .dropdown-submenu-premium a[data-tab]').forEach(link => {
        const newLink = link.cloneNode(true);
        link.parentNode.replaceChild(newLink, link);
        
        newLink.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const tabId = this.getAttribute('data-tab');
            console.log(`🖱️ Link clicked: ${tabId}`);
            
            if (window.innerWidth <= 768) {
                const sidebarEl = document.querySelector('.sidebar-premium');
                const overlayEl = document.getElementById('overlay');
                if (sidebarEl) {
                    sidebarEl.classList.remove('active', 'open');
                }
                if (overlayEl) {
                    overlayEl.classList.remove('active', 'show');
                    overlayEl.style.display = 'none';
                }
                document.body.style.overflow = '';
                document.body.style.position = '';
            }
            
            if (window.showTab) {
                window.showTab(tabId);
            } else if (window.ui && window.ui.showTab) {
                window.ui.showTab(tabId);
            } else {
                document.querySelectorAll('.tab-content').forEach(t => {
                    t.style.display = 'none';
                    t.classList.remove('active');
                });
                const target = document.getElementById(tabId);
                if (target) {
                    target.style.display = 'block';
                    target.classList.add('active');
                }
                document.querySelectorAll('.nav-premium a, .dropdown-submenu-premium a').forEach(l => {
                    l.classList.remove('active');
                });
                this.classList.add('active');
            }
        });
    });
    
    console.log('✅ All nav links fixed and clickable');

    // Collapse button
    if (collapseBtn) {
        collapseBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            sidebar.classList.toggle('collapsed');
            const icon = this.querySelector('i');
            if (icon) {
                if (sidebar.classList.contains('collapsed')) {
                    icon.className = 'fas fa-chevron-right';
                } else {
                    icon.className = 'fas fa-chevron-left';
                }
            }
            localStorage.setItem('sidebar_collapsed', sidebar.classList.contains('collapsed'));
        });
        
        if (localStorage.getItem('sidebar_collapsed') === 'true') {
            sidebar.classList.add('collapsed');
            const icon = collapseBtn.querySelector('i');
            if (icon) icon.className = 'fas fa-chevron-right';
        }
    }

    // Close on Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && (sidebar.classList.contains('active') || sidebar.classList.contains('open'))) {
            sidebar.classList.remove('active', 'open');
            if (overlay) {
                overlay.classList.remove('active', 'show');
                overlay.style.display = 'none';
            }
            document.body.style.overflow = '';
            document.body.style.position = '';
            console.log('📱 Sidebar closed via Escape');
        }
    });

    // Close on resize
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768 && (sidebar.classList.contains('active') || sidebar.classList.contains('open'))) {
            sidebar.classList.remove('active', 'open');
            if (overlay) {
                overlay.classList.remove('active', 'show');
                overlay.style.display = 'none';
            }
            document.body.style.overflow = '';
            document.body.style.position = '';
        }
    });

    // Dropdown toggle
    const dropdownToggles = document.querySelectorAll('.has-dropdown-premium > .dropdown-toggle-premium');
    dropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const parent = this.closest('.has-dropdown-premium');
            const submenu = parent.querySelector('.dropdown-submenu-premium');
            
            if (!parent || !submenu) return;
            
            document.querySelectorAll('.has-dropdown-premium.open').forEach(drop => {
                if (drop !== parent) {
                    drop.classList.remove('open');
                    const menu = drop.querySelector('.dropdown-submenu-premium');
                    if (menu) menu.style.display = 'none';
                }
            });
            
            const isOpen = parent.classList.contains('open');
            if (isOpen) {
                parent.classList.remove('open');
                submenu.style.display = 'none';
            } else {
                parent.classList.add('open');
                submenu.style.display = 'block';
            }
        });
    });

    console.log('✅ Premium Sidebar fully initialized with all fixes!');
}

// ============================================================
// 🚀 INITIALIZE UI MODULE
// ============================================================

// Initialize Sidebar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(initPremiumSidebar, 100);
    });
} else {
    setTimeout(initPremiumSidebar, 100);
}

// Create UI instance
window.ui = new UIModule();

// Global function exports
window.toggleMenu = () => window.ui?.toggleMenu?.();
window.closeMenu = () => window.ui?.closeMenu?.();
window.showTab = (tabId) => window.ui?.showTab?.(tabId);
window.navigateToTab = (tabId) => window.ui?.navigateToTab?.(tabId);
window.showToast = (message, type, duration) => window.ui?.showToast?.(message, type, duration);
window.logout = () => window.ui?.logout?.();
window.forceShowTab = (tabId) => window.ui?.forceShowTab?.(tabId);
window.refreshDashboard = () => window.ui?.refreshDashboard?.();
window.debugUI = () => window.ui?.debugAll?.();
window.updateSidebar = () => window.ui?.updateSidebarUserData?.();

// Event listeners
document.addEventListener('DOMContentLoaded', () => { 
    if (!window.ui) window.ui = new UIModule(); 
});

document.addEventListener('appReady', (e) => { 
    if (window.ui && e.detail?.userProfile) {
        window.ui.updateAllUserInfo(e.detail.userProfile);
        window.ui.updateSidebarUserData();
    }
});

document.addEventListener('profilePhotoUpdated', (e) => { 
    if (window.ui && e.detail?.photoUrl) {
        window.ui.updateProfilePhoto();
    }
});

document.addEventListener('dashboardUpdated', () => {
    if (window.ui) window.ui.updateSidebarUserData();
});

document.addEventListener('profileUpdated', () => {
    if (window.ui) window.ui.updateSidebarUserData();
});

// Auto-update sidebar
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(window.updateSidebar, 1500);
});

document.addEventListener('appReady', () => {
    setTimeout(window.updateSidebar, 500);
});

console.log('✅ COMPLETE UI Module loaded successfully!');
console.log('📌 All features: Dashboard, Profile, Finance, Enrollment, Attendance,');
console.log('📌 Messages, Tickets, Reviews, Newsletter, NurseIQ,');
console.log('📌 Resources, Calendar, Academic Reports, Lecture Card,');
console.log('📌 Exam Card, Online Learning, Supplementary Registration');
console.log('📌 DR CYON Integration: ACTIVE');
console.log('📌 Use showTab("tab-name") to navigate');
console.log('📌 Use showToast("message", "type") for notifications');

// ============================================================
// 🔧 FIX: ACCESS SIDEBAR FROM PARENT PAGE
// ============================================================

function fixParentSidebar() {
    try {
        const parent = window.parent;
        if (parent === window) {
            console.log('📌 Not in an iframe, sidebar is in this page');
            return;
        }
        
        console.log('📌 Page is in an iframe, accessing parent sidebar...');
        
        const parentDoc = parent.document;
        const sidebar = parentDoc.getElementById('sidebar');
        
        if (!sidebar) {
            console.log('❌ Sidebar not found in parent');
            return;
        }
        
        console.log('✅ Sidebar found in parent! Fixing links...');
        
        const links = sidebar.querySelectorAll('a[data-tab]');
        console.log(`📊 Found ${links.length} links in parent sidebar`);
        
        links.forEach(link => {
            const tabId = link.getAttribute('data-tab');
            if (!tabId || link.classList.contains('dropdown-toggle')) return;
            
            const newLink = link.cloneNode(true);
            link.parentNode.replaceChild(newLink, link);
            
            newLink.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log(`🖱️ Parent sidebar clicked: ${tabId}`);
                
                const iframe = parentDoc.querySelector('iframe');
                if (iframe) {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                    
                    iframeDoc.querySelectorAll('.tab-content').forEach(t => {
                        t.style.display = 'none';
                        t.classList.remove('active');
                    });
                    
                    const target = iframeDoc.getElementById(tabId);
                    if (target) {
                        target.style.display = 'block';
                        target.classList.add('active');
                        console.log(`✅ Tab "${tabId}" opened in iframe`);
                    }
                }
            });
        });
        
        console.log('✅ Parent sidebar links fixed!');
        
    } catch (error) {
        console.warn('⚠️ Could not access parent:', error.message);
    }
}

setTimeout(fixParentSidebar, 1000);
setTimeout(fixParentSidebar, 3000);
