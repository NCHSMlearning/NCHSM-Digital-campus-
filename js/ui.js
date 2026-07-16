// js/ui.js - COMPLETE WORKING VERSION WITH REVIEWS & NEWSLETTER
class UIModule {
    constructor() {
        console.log('🚀 Initializing UIModule...');
        
        // Cache all elements
        this.sidebar = document.getElementById('sidebar');
        this.overlay = document.getElementById('overlay');
        this.mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        this.navLinks = document.querySelectorAll('.nav a');
        this.tabs = document.querySelectorAll('.tab-content');
        this.toast = document.getElementById('toast');
        this.headerLogout = document.getElementById('header-logout');
        this.currentTab = 'dashboard';
        this.storageKey = 'nchsm_last_tab';
        
        // ========== COMPLETE validTabs with ALL sections ==========
        this.validTabs = [
            'dashboard', 'profile', 'calendar', 'courses', 'attendance', 
            'cats', 'resources', 'messages', 'support-tickets', 'nurseiq', 
            'unit-registration', 'learning-hub', 'exam-card',
            'hub-courses', 'hub-register', 'hub-online-learning', 'hub-exam-card',
            'hub-lecture-card', 'academic-reports',
            'reviews', 'newsletter'  // ✅ ADDED REVIEWS & NEWSLETTER
        ];
        
        // ========== COMPLETE tabNames ==========
        this.tabNames = {
            'dashboard': 'Dashboard', 
            'profile': 'Profile', 
            'calendar': 'Academic Calendar',
            'courses': 'My Courses', 
            'attendance': 'Attendance', 
            'cats': 'Exams & Grades',
            'resources': 'Resources', 
            'messages': 'Messages', 
            'support-tickets': 'Support Tickets',
            'nurseiq': 'NurseIQ', 
            'unit-registration': 'Unit Registration',
            'learning-hub': 'My Learning Hub', 
            'exam-card': 'Exam Card',
            'hub-courses': 'My Courses',
            'hub-register': 'Register Units',
            'hub-online-learning': 'Online Learning',
            'hub-exam-card': 'Exam Card',
            'hub-lecture-card': 'Lecture Card',
            'academic-reports': 'Academic Reports',
            'reviews': 'Reviews',          // ✅ ADDED
            'newsletter': 'Newsletter'     // ✅ ADDED
        };
        
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
        this.supabase = null;
        
        // Reviews badge interval
        this.reviewsBadgeInterval = null;
        
        setTimeout(() => this.safeInitialize(), 500);
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
    
    getSupabaseClient() {
        if (window.supabase && typeof window.supabase.from === 'function') return window.supabase;
        if (window.sb && typeof window.sb.from === 'function') return window.sb;
        if (window.db && window.db.supabase && typeof window.db.supabase.from === 'function') return window.db.supabase;
        return null;
    }
    
    delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
    
    async initialize() {
        console.log('🔧 Initializing UI...');
        this.setupAppLoading();
        await this.delay(300);
        this.cleanupInitialStyles();
        await this.delay(300);
        this.setupEventListeners();
        this.setupProfileDropdown();
        await this.delay(400);
        this.setupUrlNavigation();
        this.setupTabChangeListener();
        await this.delay(300);
        this.initializeDateTime();
        this.setupOfflineIndicator();
        this.setupMobileMenuVisibility();
        this.loadLastTab();
        
        // Start reviews badge updater
        this.startReviewsBadgeUpdater();
        
        // ========== FORCE DASHBOARD VISIBLE AFTER LOAD ==========
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
        
        await this.delay(800);
        await this.loadInitialUserData();
        await this.delay(800);
        await this.hideLoadingScreen();
        console.log('✅ UIModule fully initialized');
    }
    
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
    
    // ============================================
    // MOBILE MENU FUNCTIONS
    // ============================================
    
    isMenuOpen() {
        return (this.sidebar && (this.sidebar.classList.contains('active') || this.sidebar.classList.contains('open')));
    }
    
 // ✅ REPLACE WITH THIS VERSION
openMenu() {
    if (this.sidebar) {
        this.sidebar.classList.add('active');
        this.sidebar.classList.add('open');
    }
    if (this.overlay) {
        this.overlay.classList.add('active');
        this.overlay.style.display = 'block';
        // ✅ NO BLUR
        this.overlay.style.backdropFilter = 'none';
        this.overlay.style.webkitBackdropFilter = 'none';
        this.overlay.style.background = 'rgba(0, 0, 0, 0.4)';
    }
    document.body.style.overflow = 'hidden';
    // ✅ REMOVE this line:
    // document.body.classList.add('menu-open');
    document.body.style.backdropFilter = 'none';
    document.body.style.webkitBackdropFilter = 'none';
    document.body.style.filter = 'none';
    console.log('📱 Mobile menu opened - NO BLUR');
}

   // ✅ REPLACE WITH THIS VERSION
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
    // ✅ REMOVE this line:
    // document.body.classList.remove('menu-open');
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
    
    // ============================================
    // TAB NAVIGATION
    // ============================================
    
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
        
        setTimeout(() => this.loadTabModule(tabId), 100);
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
    
    // ============================================
    // URL NAVIGATION
    // ============================================
    
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
    
    // ============================================
    // EVENT LISTENERS
    // ============================================
    
    setupEventListeners() {
        // Mobile menu toggle
        if (this.mobileMenuToggle) {
            const newToggle = this.mobileMenuToggle.cloneNode(true);
            this.mobileMenuToggle.parentNode.replaceChild(newToggle, this.mobileMenuToggle);
            this.mobileMenuToggle = newToggle;
            this.mobileMenuToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleMenu();
            });
        }
        
        // Overlay click
        if (this.overlay) {
            const newOverlay = this.overlay.cloneNode(true);
            this.overlay.parentNode.replaceChild(newOverlay, this.overlay);
            this.overlay = newOverlay;
            this.overlay.addEventListener('click', () => {
                this.closeMenu();
            });
        }
        
        // Dropdown toggle setup
        this.setupDropdownToggle();
        
        // Sidebar navigation links
        const allNavLinks = document.querySelectorAll('.nav a[data-tab], .dropdown-submenu a[data-tab], .footer-links a[data-tab]');
        console.log(`🔗 Found ${allNavLinks.length} navigation links`);
        
        allNavLinks.forEach(link => {
            const newLink = link.cloneNode(true);
            link.parentNode.replaceChild(newLink, link);
            
            newLink.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const tabId = newLink.getAttribute('data-tab');
                if (tabId && this.isValidTab(tabId)) {
                    console.log(`🖱️ Link clicked: ${tabId}`);
                    if (this.isMenuOpen()) this.closeMenu();
                    this.navigateToTab(tabId);
                }
            });
        });
        
        // Header logout
        if (this.headerLogout) {
            const newLogout = this.headerLogout.cloneNode(true);
            this.headerLogout.parentNode.replaceChild(newLogout, this.headerLogout);
            this.headerLogout = newLogout;
            this.headerLogout.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
        
        // Header refresh
        if (this.headerRefresh) {
            const newRefresh = this.headerRefresh.cloneNode(true);
            this.headerRefresh.parentNode.replaceChild(newRefresh, this.headerRefresh);
            this.headerRefresh = newRefresh;
            this.headerRefresh.addEventListener('click', () => this.refreshDashboard());
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
    
    // ============================================
    // DROPDOWN TOGGLE SETUP
    // ============================================
    
    setupDropdownToggle() {
        const dropdownParent = document.querySelector('.has-dropdown');
        const dropdownToggle = document.querySelector('.has-dropdown > a');
        const dropdownMenu = document.querySelector('.dropdown-submenu');
        
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
            
            const parent = newToggle.closest('.has-dropdown');
            if (parent) {
                const isOpen = parent.classList.contains('open');
                
                document.querySelectorAll('.has-dropdown.open').forEach(drop => {
                    if (drop !== parent) {
                        drop.classList.remove('open');
                        const submenu = drop.querySelector('.dropdown-submenu');
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
            <a href="#" data-action="profile" class="simple-menu-item"><i class="fas fa-user"></i> My Profile</a>
            <div class="simple-menu-divider"></div>
            <a href="#" data-action="logout" class="simple-menu-item"><i class="fas fa-sign-out-alt"></i> Logout</a>
        `;
        this.dropdownMenu.style.cssText = 'display:none;position:absolute;top:50px;right:0;background:white;border:1px solid #e5e7eb;border-radius:8px;box-shadow:0 5px 15px rgba(0,0,0,0.1);min-width:200px;z-index:1001;padding:8px 0';
        
        this.dropdownMenu.querySelectorAll('.simple-menu-item').forEach(item => {
            item.style.cssText = 'display:block;padding:10px 16px;color:#374151;text-decoration:none;font-size:14px;cursor:pointer';
            item.onmouseenter = () => item.style.background = '#f9fafb';
            item.onmouseleave = () => item.style.background = 'transparent';
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.dropdownMenu.style.display = 'none';
                if (item.dataset.action === 'logout') this.logout();
                else if (item.dataset.action === 'profile') this.navigateToTab('profile');
            });
        });
        
        const container = document.querySelector('.user-profile-dropdown, .header-right');
        if (container) container.appendChild(this.dropdownMenu);
        else document.body.appendChild(this.dropdownMenu);
    }
    
    setupSimpleTrigger() {
        this.profileTrigger = document.querySelector('.profile-trigger, .header-profile, [data-profile]');
        if (!this.profileTrigger) return;
        
        const cleanTrigger = this.profileTrigger.cloneNode(true);
        this.profileTrigger.parentNode.replaceChild(cleanTrigger, this.profileTrigger);
        this.profileTrigger = cleanTrigger;
        
        this.profileTrigger.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.dropdownMenu.style.display = this.dropdownMenu.style.display === 'block' ? 'none' : 'block';
        });
        
        document.addEventListener('click', (e) => {
            if (this.dropdownMenu.style.display === 'block' && !this.profileTrigger.contains(e.target) && !this.dropdownMenu.contains(e.target)) {
                this.dropdownMenu.style.display = 'none';
            }
        });
    }
    
    // ============================================
    // REVIEWS BADGE UPDATER
    // ============================================
    
    startReviewsBadgeUpdater() {
        // Initial update
        this.updateReviewsBadge();
        
        // Update every 30 seconds
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
            
            // Check if reviews tab exists first
            const reviewsTab = document.getElementById('reviews');
            if (!reviewsTab) return;
            
            // Get pending reviews count (for badge)
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
                } else {
                    badge.style.display = 'none';
                }
            }
            
            // Also update newsletter badge
            const { count: subCount, error: subError } = await supabase
                .from('newsletter_subscribers')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', window.currentUserId);
            
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
                    } else {
                        nlBadge.textContent = '✕';
                        nlBadge.style.display = 'inline-block';
                        nlBadge.style.background = '#6b7280';
                        nlBadge.style.color = 'white';
                        nlBadge.style.padding = '0 8px';
                        nlBadge.style.borderRadius = '20px';
                        nlBadge.style.fontSize = '10px';
                    }
                }
            }
            
        } catch (error) {
            console.warn('Could not update reviews badge:', error);
        }
    }
    
    // ============================================
    // LOAD TAB MODULE - WITH REVIEWS & NEWSLETTER
    // ============================================
    
    loadTabModule(tabId) {
        console.log(`📦 Loading module for tab: ${tabId}`);
        setTimeout(() => {
            switch(tabId) {
                case 'dashboard':
                    if (window.dashboardModule?.loadDashboard) window.dashboardModule.loadDashboard();
                    break;
                case 'profile':
                    if (window.profileModule?.loadProfileData) window.profileModule.loadProfileData();
                    break;
                case 'hub-courses':
                case 'courses':
                    if (window.coursesModule?.loadCourses) window.coursesModule.loadCourses();
                    break;
                case 'hub-register':
                case 'unit-registration':
                    if (window.unitRegistrationModule?.loadUnits) window.unitRegistrationModule.loadUnits();
                    break;
                case 'hub-online-learning':
                    const onlineContainer = document.getElementById('hub-online-learning');
                    if (onlineContainer && (!onlineContainer.innerHTML || onlineContainer.innerHTML.trim() === '')) {
                        onlineContainer.innerHTML = `
                            <div style="text-align: center; padding: 60px 20px;">
                                <i class="fas fa-video" style="font-size: 64px; color: #4f46e5; margin-bottom: 20px;"></i>
                                <h2>Online Learning</h2>
                                <p>Video lessons, quizzes, and study materials coming soon...</p>
                                <div style="width: 300px; height: 8px; background: #e5e7eb; border-radius: 4px; margin: 20px auto;">
                                    <div style="width: 45%; height: 100%; background: #4f46e5; border-radius: 4px;"></div>
                                </div>
                                <p style="color: #6b7280;">Development in progress - 45% complete</p>
                            </div>
                        `;
                    }
                    break;
                case 'hub-exam-card':
                case 'exam-card':
                    if (window.examCardModule?.loadExamCard) window.examCardModule.loadExamCard();
                    else if (typeof initExamCard === 'function') initExamCard();
                    break;
                case 'hub-lecture-card':
                    if (window.lectureCardModule?.loadLectureCard) window.lectureCardModule.loadLectureCard();
                    else if (typeof initLectureCard === 'function') initLectureCard();
                    break;
                case 'cats':
                    if (window.examsModule?.loadExams) window.examsModule.loadExams();
                    break;
                case 'resources':
                    if (window.resourcesModule?.loadAllResources) window.resourcesModule.loadAllResources();
                    break;
                case 'nurseiq':
                    if (window.nurseiqModule?.loadCourses) window.nurseiqModule.loadCourses();
                    break;
                case 'academic-reports':
                    if (window.academicReportsModule?.loadReports) window.academicReportsModule.loadReports();
                    break;
                case 'calendar':
                    if (window.calendarModule?.loadCalendar) window.calendarModule.loadCalendar();
                    break;
                case 'attendance':
                    if (window.attendanceModule?.loadAttendanceHistory) window.attendanceModule.loadAttendanceHistory();
                    break;
                case 'messages':
                    if (window.messagesModule?.loadMessages) window.messagesModule.loadMessages();
                    break;
                case 'support-tickets':
                    if (window.ticketsModule?.loadTickets) window.ticketsModule.loadTickets();
                    break;
                    
                case 'reviews':
    console.log('⭐ Loading Reviews module...');
    if (typeof initReviewsModule === 'function') {
        initReviewsModule();
    } else {
        console.warn('initReviewsModule not found, loading fallback');
        if (typeof loadReviews === 'function') loadReviews();
        if (typeof loadSiteRating === 'function') loadSiteRating();
        if (typeof updateReviewStats === 'function') updateReviewStats();
    }
    break;
                    
                case 'newsletter':
                    console.log('📧 Loading Newsletter module...');
                    if (window.newsletterModule) {
                        if (typeof window.newsletterModule.loadNewsletters === 'function') {
                            window.newsletterModule.loadNewsletters();
                        }
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
    
    // ============================================
    // ENSURE REVIEWS STYLES ARE LOADED
    // ============================================
    
    ensureReviewsStyles() {
        // Check if reviews styles are already loaded
        if (document.getElementById('reviews-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'reviews-styles';
        style.textContent = `
            /* Reviews Module Styles */
            .reviews-container { padding: 20px; max-width: 1200px; margin: 0 auto; }
            .reviews-header-premium { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; flex-wrap: wrap; gap: 15px; }
            .reviews-header-premium h1 { font-size: 28px; font-weight: 700; color: #1e293b; margin: 0; }
            .reviews-header-premium .subtitle { color: #64748b; margin: 4px 0 0; font-size: 15px; }
            
            .reviews-stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 25px; }
            .stat-card-premium { background: white; padding: 16px 20px; border-radius: 12px; display: flex; align-items: center; gap: 15px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #f1f5f9; }
            .stat-card-premium .stat-number { display: block; font-size: 24px; font-weight: 700; color: #1e293b; }
            .stat-card-premium .stat-label { font-size: 12px; color: #64748b; }
            
            .reviews-grid-premium { display: grid; gap: 20px; }
            .review-card-premium { background: white; border-radius: 16px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #f1f5f9; transition: all 0.3s; cursor: pointer; }
            .review-card-premium:hover { box-shadow: 0 8px 30px rgba(0,0,0,0.08); transform: translateY(-2px); }
            
            .review-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; flex-wrap: wrap; gap: 10px; }
            .reviewer-info { display: flex; align-items: center; gap: 12px; }
            .reviewer-avatar { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid #f1f5f9; }
            .reviewer-avatar-placeholder { width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, #667eea, #764ba2); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 18px; }
            .reviewer-details .reviewer-name { display: block; font-weight: 600; color: #1e293b; font-size: 15px; }
            .reviewer-details .reviewer-program { font-size: 12px; color: #64748b; }
            
            .review-category-badge { background: #f1f5f9; padding: 4px 14px; border-radius: 20px; font-size: 12px; color: #475569; display: inline-flex; align-items: center; gap: 6px; }
            .review-rating { margin-bottom: 8px; }
            .review-title { font-size: 16px; font-weight: 600; color: #1e293b; margin: 0 0 8px; }
            .review-text { color: #475569; line-height: 1.6; font-size: 14px; margin: 0; }
            
            .review-card-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 14px; border-top: 1px solid #f1f5f9; margin-top: 12px; }
            .review-date { font-size: 12px; color: #94a3b8; }
            .helpful-btn { background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 13px; padding: 4px 10px; border-radius: 6px; transition: all 0.2s; display: inline-flex; align-items: center; gap: 4px; }
            .helpful-btn:hover { background: #f1f5f9; color: #667eea; }
            
            .filter-select { padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px; background: white; min-width: 140px; }
            .reviews-filters-premium { display: flex; justify-content: space-between; align-items: center; gap: 15px; margin-bottom: 25px; flex-wrap: wrap; background: white; padding: 16px 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
            .filter-group { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
            .filter-group label { font-size: 13px; color: #475569; font-weight: 500; }
            
            .btn-gradient { background: linear-gradient(135deg, #667eea, #764ba2); border: none; padding: 12px 24px; border-radius: 12px; color: white; font-weight: 600; transition: all 0.3s; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; }
            .btn-gradient:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4); }
            
            .loading-state-premium { text-align: center; padding: 60px 20px; }
            .loading-spinner-premium { width: 40px; height: 40px; border: 3px solid #f1f5f9; border-top-color: #667eea; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
            @keyframes spin { to { transform: rotate(360deg); } }
            
            .empty-state-premium { text-align: center; padding: 60px 20px; }
            .empty-state-premium i { font-size: 48px; color: #d1d5db; }
            .empty-state-premium h3 { margin: 16px 0 8px; color: #1e293b; }
            .empty-state-premium p { color: #64748b; margin-bottom: 20px; }
            
            .site-rating-banner { background: linear-gradient(135deg, #1e293b, #0f172a); border-radius: 16px; padding: 24px 30px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
            .banner-text h3 { color: white; margin: 0; font-size: 18px; }
            .banner-text p { color: rgba(255,255,255,0.7); margin: 4px 0 0; font-size: 14px; }
            .site-stars { font-size: 32px; cursor: pointer; display: flex; gap: 4px; }
            .site-stars span { transition: all 0.2s; color: #d1d5db; }
            .site-stars span:hover { transform: scale(1.2); }
            
            .review-pros, .review-cons { display: flex; align-items: flex-start; gap: 8px; padding: 8px 12px; border-radius: 8px; margin-top: 8px; font-size: 13px; }
            .review-pros { background: #ecfdf5; color: #065f46; }
            .review-cons { background: #fef2f2; color: #991b1b; }
            
            .category-quick-filters { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
            .cat-filter { padding: 8px 16px; border-radius: 20px; border: 1px solid #e2e8f0; background: white; color: #475569; cursor: pointer; transition: all 0.2s; font-size: 13px; font-weight: 500; display: inline-flex; align-items: center; gap: 6px; }
            .cat-filter:hover { border-color: #667eea; color: #667eea; }
            .cat-filter.active { background: #667eea; color: white; border-color: #667eea; }
            
            .component-selector-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
            .component-option { padding: 12px; border: 2px solid #e2e8f0; border-radius: 12px; text-align: center; cursor: pointer; transition: all 0.2s; background: #f8fafc; }
            .component-option:hover { border-color: #667eea; background: #f1f5f9; }
            .component-option.selected { border-color: #667eea; background: #eef2ff; }
            .component-option i { font-size: 24px; color: #667eea; display: block; margin-bottom: 6px; }
            .component-option span { font-size: 13px; font-weight: 500; color: #1e293b; }
            .option-badge { display: block; font-size: 9px; background: #f1f5f9; padding: 2px 8px; border-radius: 10px; margin-top: 4px; color: #64748b; }
            
            .star-rating-large { font-size: 36px; cursor: pointer; display: flex; gap: 6px; }
            .star-rating-large span { transition: all 0.2s; color: #d1d5db; }
            .star-rating-large span:hover { transform: scale(1.2); }
            
            .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: none; align-items: center; justify-content: center; z-index: 9999; padding: 20px; }
            .modal-container-premium { background: white; border-radius: 20px; max-width: 700px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
            .modal-header-premium { padding: 20px 24px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
            .modal-header-premium h3 { margin: 0; font-size: 20px; color: #1e293b; }
            .close-modal-btn { background: none; border: none; font-size: 28px; color: #94a3b8; cursor: pointer; padding: 0 8px; transition: all 0.2s; }
            .close-modal-btn:hover { color: #ef4444; transform: rotate(90deg); }
            .modal-body-premium { padding: 24px; }
            
            .form-input, .form-textarea, .form-select { width: 100%; padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 14px; transition: all 0.2s; font-family: inherit; }
            .form-input:focus, .form-textarea:focus, .form-select:focus { border-color: #667eea; outline: none; box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1); }
            .form-textarea { resize: vertical; min-height: 100px; }
            .char-counter { text-align: right; font-size: 12px; color: #94a3b8; margin-top: 4px; }
            .review-form-premium .form-group { margin-bottom: 20px; }
            .review-form-premium label { display: block; font-weight: 600; color: #1e293b; margin-bottom: 6px; font-size: 14px; }
            .review-form-premium .required { color: #ef4444; }
            .error-text { color: #dc2626; font-size: 13px; margin-top: 4px; }
            .feedback-message { padding: 12px 16px; border-radius: 10px; margin-top: 16px; }
            
            @media (max-width: 768px) {
                .reviews-header-premium { flex-direction: column; align-items: flex-start; }
                .site-rating-banner { flex-direction: column; align-items: flex-start; }
                .reviews-filters-premium { flex-direction: column; align-items: stretch; }
                .filter-group { flex-direction: column; align-items: stretch; }
                .filter-select { min-width: unset; }
                .component-selector-grid { grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); }
                .modal-container-premium { margin: 10px; max-height: 95vh; }
                .review-card-header { flex-direction: column; }
                .category-quick-filters { gap: 5px; }
                .cat-filter { font-size: 12px; padding: 6px 12px; }
                .reviews-stats-row { grid-template-columns: 1fr 1fr; }
            }
            
            @media (max-width: 480px) {
                .reviews-stats-row { grid-template-columns: 1fr; }
            }
        `;
        document.head.appendChild(style);
        console.log('✅ Reviews styles injected');
    }
    
    // ============================================
    // REMAINING UI METHODS
    // ============================================
    
    updatePageTitle(tabId) {
        const tabName = this.tabNames[tabId] || 'Dashboard';
        document.title = `${tabName} - NCHSM Student Portal`;
    }
    
    isValidTab(tabId) { 
        return this.validTabs.includes(tabId); 
    }
    
    loadLastTab() {
        this.currentTab = 'dashboard';
        localStorage.setItem(this.storageKey, 'dashboard');
        
        const dashboard = document.getElementById('dashboard');
        if (dashboard) {
            dashboard.style.display = 'block';
            dashboard.classList.add('active');
            console.log('📊 Dashboard activated on page load');
        }
        
        if (this.tabs) {
            this.tabs.forEach(tab => {
                if (tab.id !== 'dashboard') {
                    tab.style.display = 'none';
                    tab.classList.remove('active');
                }
            });
        }
        
        if (this.navLinks) {
            this.navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('data-tab') === 'dashboard') {
                    link.classList.add('active');
                }
            });
        }
    }
    
    refreshDashboard() {
        this.showToast('Refreshing dashboard...', 'info', 1500);
        if (window.dashboardModule?.refreshDashboard) window.dashboardModule.refreshDashboard();
        if (this.currentTab === 'exam-card' && typeof initExamCard === 'function') initExamCard();
        this.updateProfilePhoto();
        this.updateReviewsBadge();
    }
    
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
            
            console.log('📅 Loading last login for user:', userId);
            
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
            
            console.log('🔄 Updating last login for user:', userId);
            
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
            
            console.log(`📅 Last update recorded: ${lastUpdateDate}, Today: ${today}`);
            
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
    
    clearCache() {
        if (confirm('Clear all cached data?')) {
            if ('caches' in window) {
                caches.keys().then(cacheNames => cacheNames.forEach(cacheName => caches.delete(cacheName)));
            }
            localStorage.removeItem('userProfilePhoto');
            localStorage.removeItem('currentUserProfile');
            this.showToast('Cache cleared!', 'success');
        }
    }
    
    exportData() { this.showToast('Export feature coming soon', 'info'); }
    
    showSystemInfo() {
        alert(`NCHSM Student Portal v2.1\n\nBrowser: ${navigator.userAgent}\nOnline: ${navigator.onLine ? 'Yes' : 'No'}\nCurrent Tab: ${this.currentTab}\nUser: ${window.currentUserProfile?.full_name || 'Not logged in'}\n\n© 2026 Nakuru College of Health Sciences and Management`);
    }
    
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
    
    setupTabChangeListener() {}
    
    setupMobileMenuVisibility() {
        if (!this.mobileMenuToggle) return;
        const updateVisibility = () => {
            this.mobileMenuToggle.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
            if (window.innerWidth > 768) this.closeMenu();
        };
        updateVisibility();
        window.addEventListener('resize', updateVisibility);
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
        
        const dropdown = document.querySelector('.has-dropdown');
        const dropdownMenu = document.querySelector('.dropdown-submenu');
        console.log('- Dropdown exists:', !!dropdown);
        console.log('- Dropdown menu exists:', !!dropdownMenu);
        if (dropdown) {
            console.log('- Dropdown open class:', dropdown.classList.contains('open'));
        }
    }
}
// ============================================
// PREMIUM SIDEBAR HANDLER
// ============================================

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
    
    // 1. Mobile Toggle (Hamburger)
    if (toggle) {
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            sidebar.classList.toggle('active');
            if (overlay) overlay.classList.toggle('active');
            document.body.style.overflow = sidebar.classList.contains('active') ? 'hidden' : '';
            console.log('📱 Sidebar toggled:', sidebar.classList.contains('active'));
        });
    }
    
    // 2. Overlay Close
    if (overlay) {
        overlay.addEventListener('click', function() {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
    
    // 3. Collapse Button (Desktop)
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
        
        // Restore collapsed state
        if (localStorage.getItem('sidebar_collapsed') === 'true') {
            sidebar.classList.add('collapsed');
            const icon = collapseBtn.querySelector('i');
            if (icon) icon.className = 'fas fa-chevron-right';
        }
    }
    
    // 4. Close sidebar when clicking nav links (mobile)
    document.querySelectorAll('.nav-premium a, .dropdown-submenu-premium a').forEach(link => {
        link.addEventListener('click', function() {
            if (window.innerWidth <= 768 && sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
                if (overlay) overlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });
    
    // 5. Close on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
    
    // 6. Close on resize (going from mobile to desktop)
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768 && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
    
    // 7. Click outside to close
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768 && sidebar.classList.contains('active')) {
            const isClickInside = sidebar.contains(e.target);
            const isClickOnToggle = toggle && toggle.contains(e.target);
            
            if (!isClickInside && !isClickOnToggle) {
                sidebar.classList.remove('active');
                if (overlay) overlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        }
    });
    
    // 8. DROPDOWN TOGGLE (Learning Hub)
    const dropdownToggles = document.querySelectorAll('.has-dropdown-premium > .dropdown-toggle-premium');
    dropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const parent = this.closest('.has-dropdown-premium');
            const submenu = parent.querySelector('.dropdown-submenu-premium');
            
            if (!parent || !submenu) return;
            
            // Close other dropdowns
            document.querySelectorAll('.has-dropdown-premium.open').forEach(drop => {
                if (drop !== parent) {
                    drop.classList.remove('open');
                    const menu = drop.querySelector('.dropdown-submenu-premium');
                    if (menu) menu.style.display = 'none';
                }
            });
            
            // Toggle current dropdown
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
    
    console.log('✅ Premium Sidebar initialized');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(initPremiumSidebar, 100);
    });
} else {
    setTimeout(initPremiumSidebar, 100);
}
// Initialize UI Module
window.ui = new UIModule();

// Global function exports
window.toggleMenu = () => window.ui?.toggleMenu?.();
window.closeMenu = () => window.ui?.closeMenu?.();
window.showTab = (tabId) => window.ui?.showTab?.(tabId);
window.showToast = (message, type, duration) => window.ui?.showToast?.(message, type, duration);
window.logout = () => window.ui?.logout?.();
window.forceShowTab = (tabId) => window.ui?.forceShowTab?.(tabId);
window.refreshDashboard = () => window.ui?.refreshDashboard?.();
window.debugUI = () => window.ui?.debugAll?.();

// Event listeners
document.addEventListener('DOMContentLoaded', () => { if (!window.ui) window.ui = new UIModule(); });
document.addEventListener('appReady', (e) => { if (window.ui && e.detail?.userProfile) window.ui.updateAllUserInfo(e.detail.userProfile); });
document.addEventListener('profilePhotoUpdated', (e) => { if (window.ui && e.detail?.photoUrl) window.ui.updateProfilePhoto(); });

console.log('✅ UI Module loaded successfully with Reviews & Newsletter support!');
