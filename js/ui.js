// js/ui.js - COMPLETE WORKING VERSION WITH EXAM CARD AND LAST LOGIN
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
        
        // Define valid tabs - ADDED exam-card
        this.validTabs = [
            'dashboard', 'profile', 'calendar', 'courses', 'attendance', 
            'cats', 'resources', 'messages', 'support-tickets', 'nurseiq', 
            'unit-registration', 'learning-hub', 'exam-card'
        ];
        
        // Define clean URL paths
        this.tabPaths = {
            'dashboard': '/', 'profile': '/profile', 'calendar': '/calendar',
            'courses': '/courses', 'attendance': '/attendance', 'cats': '/exams',
            'resources': '/resources', 'messages': '/messages', 
            'support-tickets': '/support-tickets', 'nurseiq': '/nurseiq',
            'unit-registration': '/unit-registration', 'learning-hub': '/learning-hub',
            'exam-card': '/exam-card'
        };
        
        // Reverse lookup
        this.pathToTab = {};
        for (const [tabId, path] of Object.entries(this.tabPaths)) {
            this.pathToTab[path] = tabId;
        }
        
        // Tab display names
        this.tabNames = {
            'dashboard': 'Dashboard', 'profile': 'Profile', 'calendar': 'Academic Calendar',
            'courses': 'My Courses', 'attendance': 'Attendance', 'cats': 'Exams & Grades',
            'resources': 'Resources', 'messages': 'Messages', 'support-tickets': 'Support Tickets',
            'nurseiq': 'NurseIQ', 'unit-registration': 'Unit Registration',
            'learning-hub': 'My Learning Hub', 'exam-card': 'Exam Card'
        };
        
        // Footer buttons
        this.clearCacheBtn = document.getElementById('clearCacheBtn');
        this.exportDataBtn = document.getElementById('exportDataBtn');
        this.systemInfoBtn = document.getElementById('systemInfoBtn');
        
        // Header elements
        this.headerRefresh = document.getElementById('header-refresh');
        this.headerUserName = document.getElementById('header-user-name');
        this.headerProfilePhoto = document.getElementById('header-profile-photo');
        this.headerTime = document.getElementById('header-time');
        this.headerLastLogin = document.getElementById('header-last-login');
        
        // Modal elements
        this.transcriptModal = document.getElementById('transcript-modal');
        this.closeTranscriptBtn = document.getElementById('closeTranscriptBtn');
        this.closeTranscriptModalBtn = document.getElementById('closeTranscriptModalBtn');
        
        // Reader elements
        this.readerBackBtn = document.getElementById('readerBackBtn');
        this.mobileReader = document.getElementById('mobile-reader');
        
        // Loading screen elements
        this.loadingScreen = document.getElementById('loading-screen');
        this.progressFill = document.getElementById('progress-fill');
        this.progressText = document.getElementById('progress-text');
        this.statusSteps = document.getElementById('status-steps');
        this.funFact = document.getElementById('fun-fact');
        
        // Profile dropdown elements
        this.profileTrigger = null;
        this.dropdownMenu = null;
        
        // Supabase client reference
        this.supabase = null;
        
        // Initialize with delay
        setTimeout(() => this.safeInitialize(), 500);
    }
    
    async safeInitialize() {
        console.log('🛡️ Safe initialization starting...');
        
        // Wait for database module
        await this.waitForDatabase();
        
        // Small delay to ensure Supabase is ready
        await this.delay(500);
        
        // Get Supabase client
        this.supabase = this.getSupabaseClient();
        
        if (!this.supabase) {
            console.warn('⚠️ Supabase client not available, using limited mode');
        } else {
            console.log('✅ Supabase client obtained successfully');
        }
        
        // Initialize UI
        this.initialize();
    }
    
    async waitForDatabase() {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 15;
            
            const checkDb = () => {
                attempts++;
                const hasDb = window.supabase || (window.db && window.db.supabase) || window.sb;
                
                if (hasDb || attempts >= maxAttempts) {
                    console.log(`Database check complete after ${attempts} attempts`);
                    resolve();
                } else {
                    setTimeout(checkDb, 300);
                }
            };
            
            checkDb();
        });
    }
    
    getSupabaseClient() {
        console.log('🔍 Looking for Supabase client...');
        
        // Try multiple sources to get the Supabase client
        if (window.supabase && typeof window.supabase.from === 'function') {
            console.log('✅ Using window.supabase');
            return window.supabase;
        }
        
        if (window.sb && typeof window.sb.from === 'function') {
            console.log('✅ Using window.sb');
            return window.sb;
        }
        
        if (window.db && window.db.supabase && typeof window.db.supabase.from === 'function') {
            console.log('✅ Using window.db.supabase');
            return window.db.supabase;
        }
        
        if (window.databaseModule && window.databaseModule.supabase && typeof window.databaseModule.supabase.from === 'function') {
            console.log('✅ Using window.databaseModule.supabase');
            return window.databaseModule.supabase;
        }
        
        console.error('❌ No valid Supabase client found');
        console.log('Available:', {
            hasWindowSupabase: !!window.supabase,
            hasWindowSb: !!window.sb,
            hasWindowDb: !!window.db,
            hasWindowDbSupabase: !!(window.db && window.db.supabase)
        });
        return null;
    }
    
    async initialize() {
        console.log('🔧 Initializing UI...');
        
        // Setup loading
        this.setupAppLoading();
        this.updateLoadingProgress(0, 5);
        await this.delay(300);
        
        this.cleanupInitialStyles();
        this.updateLoadingProgress(1, 5);
        await this.delay(300);
        
        this.setupEventListeners();
        this.setupProfileDropdown();
        this.updateLoadingProgress(2, 5);
        await this.delay(400);
        
        this.setupUrlNavigation();
        this.setupTabChangeListener();
        this.updateLoadingProgress(3, 5);
        await this.delay(300);
        
        this.initializeDateTime();
        this.setupOfflineIndicator();
        this.setupMobileMenuVisibility();
        this.loadLastTab();
        this.updateLoadingProgress(4, 5);
        await this.delay(800);
        
        await this.loadInitialUserData();
        this.updateLoadingProgress(5, 5);
        await this.delay(800);
        
        await this.hideLoadingScreen();
        
        // Load last login after everything is ready
        await this.loadLastLogin();
        
        console.log('✅ UIModule fully initialized');
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    setupAppLoading() {
        console.log('📱 Setting up app-style loading...');
        
        if (!this.loadingScreen) {
            console.warn('⚠️ No loading screen found, creating fallback');
            this.createFallbackLoadingScreen();
            return;
        }
        
        this.loadingScreen.classList.add('app-splash');
        
        const welcomeText = this.loadingScreen.querySelector('.welcome-text h1');
        if (welcomeText) welcomeText.textContent = 'NCHSM Portal';
        
        const subtitle = this.loadingScreen.querySelector('.subtitle');
        if (subtitle) subtitle.textContent = 'Your Academic Hub';
        
        if (!this.loadingScreen.querySelector('.app-version')) {
            const versionEl = document.createElement('div');
            versionEl.className = 'app-version';
            versionEl.textContent = 'v2.1';
            const container = this.loadingScreen.querySelector('.loading-container');
            if (container) container.appendChild(versionEl);
        }
        
        console.log('✅ App-style loading configured');
    }
    
    createFallbackLoadingScreen() {
        const fallback = document.createElement('div');
        fallback.id = 'loading-fallback';
        fallback.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            color: white;
            font-family: Arial, sans-serif;
        `;
        
        fallback.innerHTML = `
            <div style="text-align: center;">
                <h1 style="font-size: 2.5rem; margin-bottom: 1rem;">NCHSM Portal</h1>
                <p style="opacity: 0.8;">Your Academic Hub</p>
                <div style="margin-top: 2rem; width: 200px; height: 4px; background: rgba(255,255,255,0.2); border-radius: 2px; overflow: hidden;">
                    <div id="fallback-progress" style="width: 0%; height: 100%; background: white; transition: width 0.3s;"></div>
                </div>
                <p id="fallback-status" style="margin-top: 1rem;">Loading...</p>
            </div>
        `;
        
        document.body.appendChild(fallback);
        this.loadingScreen = fallback;
        this.progressFill = document.getElementById('fallback-progress');
        this.progressText = document.getElementById('fallback-status');
    }
    
    updateLoadingProgress(step, totalSteps = 5) {
        if (!this.loadingScreen || !this.progressFill || !this.progressText) return;
        
        const percentage = Math.min((step / totalSteps) * 100, 100);
        this.progressFill.style.transition = 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
        this.progressFill.style.width = `${percentage}%`;
        
        const loadingMessages = [
            'Launching Portal...', 'Loading Your Profile...', 'Preparing Dashboard...',
            'Syncing Data...', 'Finalizing Setup...', 'Ready!'
        ];
        
        if (step >= 0 && step < loadingMessages.length) {
            this.progressText.textContent = loadingMessages[step];
            this.progressText.style.opacity = '0';
            this.progressText.style.transform = 'translateY(5px)';
            setTimeout(() => {
                this.progressText.style.opacity = '1';
                this.progressText.style.transform = 'translateY(0)';
                this.progressText.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            }, 50);
        }
        
        if (this.statusSteps) {
            const steps = [
                { text: 'System Check', icon: 'fa-cogs' },
                { text: 'User Auth', icon: 'fa-user-shield' },
                { text: 'Data Sync', icon: 'fa-sync' },
                { text: 'UI Setup', icon: 'fa-palette' },
                { text: 'Ready', icon: 'fa-check-circle' }
            ];
            
            this.statusSteps.innerHTML = '';
            steps.forEach((stepData, index) => {
                const stepEl = document.createElement('div');
                stepEl.className = `status-step ${index < step ? 'completed' : ''}`;
                stepEl.innerHTML = `
                    <i class="fas ${index < step ? 'fa-check-circle' : stepData.icon}"></i>
                    <span>${stepData.text}</span>
                `;
                this.statusSteps.appendChild(stepEl);
            });
        }
        
        if (this.funFact) {
            const funFacts = [
                'Pro Tip: Bookmark important resources for quick access.',
                'Did you know? You can access course materials offline!',
                'Hot Tip: Use NurseIQ daily for exam preparation.',
                'Remember: Regular attendance improves performance.',
                'Tip: Enable notifications for deadline reminders.'
            ];
            
            if (step < funFacts.length) {
                this.funFact.innerHTML = `<i class="fas fa-lightbulb"></i><span>${funFacts[step]}</span>`;
                this.funFact.style.opacity = '0';
                setTimeout(() => {
                    this.funFact.style.opacity = '1';
                    this.funFact.style.transition = 'opacity 0.5s ease';
                }, 300);
            }
        }
        
        console.log(`📊 Loading progress: ${step}/${totalSteps} (${percentage}%)`);
    }
    
    async hideLoadingScreen() {
        console.log('🎬 Hiding loading screen...');
        
        if (!this.loadingScreen) {
            console.log('⚠️ No loading screen to hide');
            return;
        }
        
        this.loadingScreen.classList.add('loading-exit');
        await this.delay(800);
        
        if (this.loadingScreen.id === 'loading-fallback') {
            this.loadingScreen.remove();
        } else {
            this.loadingScreen.style.display = 'none';
        }
        
        const mainContent = document.querySelector('.main-content, .app-container');
        if (mainContent) {
            mainContent.style.opacity = '0';
            mainContent.style.display = 'block';
            setTimeout(() => {
                mainContent.style.opacity = '1';
                mainContent.style.transition = 'opacity 0.5s ease';
            }, 100);
        }
        
        setTimeout(() => {
            this.showToast('Welcome to NCHSM Student Portal!', 'success', 3000);
        }, 500);
        
        console.log('✅ Loading screen hidden gracefully');
    }
    
    cleanupInitialStyles() {
        console.log('🧹 Cleaning up initial styles...');
        
        this.tabs.forEach(tab => {
            tab.style.removeProperty('display');
            tab.style.removeProperty('opacity');
            tab.style.removeProperty('visibility');
            tab.style.removeProperty('position');
            tab.classList.remove('active');
        });
        
        this.navLinks.forEach(link => link.classList.remove('active'));
        
        if (window.innerWidth <= 768 && this.sidebar) {
            this.sidebar.classList.remove('active');
        }
        
        console.log('✅ Styles cleaned up');
    }
    
    setupUrlNavigation() {
        console.log('🔗 Setting up clean URL navigation...');
        this.setupHistoryNavigation();
    }
    
    setupHistoryNavigation() {
        console.log('🔗 Setting up history-based navigation...');
        
        const handleRoute = () => {
            const path = this.getCurrentPath();
            console.log('📍 Current path:', path);
            
            let tabId = this.pathToTab[path] || 'dashboard';
            
            if (this.isValidTab(tabId)) {
                console.log(`🎯 Showing tab from path: ${tabId} (${path})`);
                this.showTab(tabId, true);
            } else {
                console.warn(`⚠️ Invalid path: ${path}, defaulting to dashboard`);
                tabId = 'dashboard';
                if (path !== '/') this.updateBrowserUrl('/');
                this.showTab(tabId, true);
            }
            
            localStorage.setItem(this.storageKey, tabId);
        };
        
        const originalShowTab = this.showTab.bind(this);
        this.showTab = function(tabId, fromNavigation = false) {
            if (this.currentTab === tabId) return;
            originalShowTab(tabId, fromNavigation);
            if (!fromNavigation) {
                const path = this.tabPaths[tabId] || '/';
                this.updateBrowserUrl(path);
            }
        }.bind(this);
        
        window.addEventListener('popstate', handleRoute);
        
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[data-tab]');
            if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
            
            const href = link.getAttribute('href');
            if (href && (href === '#' || href.startsWith('#'))) {
                e.preventDefault();
                const tabId = link.getAttribute('data-tab');
                if (tabId && this.isValidTab(tabId)) this.navigateToTab(tabId);
            }
        });
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => setTimeout(handleRoute, 100));
        } else {
            setTimeout(handleRoute, 100);
        }
    }
    
    navigateToTab(tabId) {
        console.log(`🚀 Navigating to tab: ${tabId}`);
        
        if (!this.isValidTab(tabId)) {
            console.warn(`⚠️ Invalid tab: ${tabId}`);
            tabId = 'dashboard';
        }
        
        const path = this.tabPaths[tabId] || '/';
        this.updateBrowserUrl(path);
        this.showTab(tabId, true);
    }
    
    updateBrowserUrl(path) {
        const fullPath = window.location.origin + path;
        if (window.location.pathname !== path) {
            console.log(`📝 Updating URL to: ${path}`);
            window.history.pushState({}, '', fullPath);
        }
    }
    
    getCurrentPath() {
        let path = window.location.pathname;
        path = path.replace(/\.html$/, '');
        path = path.replace(/\/$/, '');
        if (path === '' || path === '/index' || path === '/dashboard') path = '/';
        if (!path.startsWith('/')) path = '/' + path;
        return path;
    }
    
    setupEventListeners() {
        console.log('🔧 Setting up event listeners...');
        
        if (this.mobileMenuToggle) {
            this.mobileMenuToggle.addEventListener('click', () => this.toggleMenu());
        }
        
        if (this.overlay) {
            this.overlay.addEventListener('click', () => this.closeMenu());
        }
        
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tabId = link.getAttribute('data-tab');
                console.log(`📱 Nav clicked: ${tabId}`);
                if (tabId && this.isValidTab(tabId)) {
                    this.navigateToTab(tabId);
                    this.closeMenu();
                }
            });
        });
        
        if (this.headerLogout) {
            this.headerLogout.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('🔐 Header logout clicked');
                this.logout();
            });
        }
        
        if (this.headerRefresh) {
            this.headerRefresh.addEventListener('click', () => {
                console.log('🔄 Header refresh clicked');
                this.refreshDashboard();
            });
        }
        
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
        
        if (this.closeTranscriptBtn) {
            this.closeTranscriptBtn.addEventListener('click', () => this.closeTranscriptModal());
        }
        
        if (this.closeTranscriptModalBtn) {
            this.closeTranscriptModalBtn.addEventListener('click', () => this.closeTranscriptModal());
        }
        
        if (this.transcriptModal) {
            this.transcriptModal.addEventListener('click', (e) => {
                if (e.target === this.transcriptModal) this.closeTranscriptModal();
            });
        }
        
        if (this.readerBackBtn) {
            this.readerBackBtn.addEventListener('click', () => this.closeReader());
        }
        
        setTimeout(() => {
            const cards = document.querySelectorAll('.stat-card[data-tab]');
            cards.forEach(card => {
                card.addEventListener('click', (e) => {
                    e.preventDefault();
                    const tabId = card.getAttribute('data-tab');
                    console.log(`📱 Card clicked: ${tabId}`);
                    if (tabId && this.isValidTab(tabId)) this.navigateToTab(tabId);
                });
            });
        }, 1000);
        
        console.log('✅ All event listeners setup complete');
    }
    
    setupProfileDropdown() {
        console.log('🎯 Setting up SIMPLE working dropdown...');
        
        setTimeout(() => {
            const oldDropdown = document.querySelector('.dropdown-menu');
            if (oldDropdown) oldDropdown.remove();
            this.createSimpleDropdown();
            this.setupSimpleTrigger();
            console.log('✅ SIMPLE dropdown setup complete');
        }, 1000);
    }
    
    createSimpleDropdown() {
        this.dropdownMenu = document.createElement('div');
        this.dropdownMenu.className = 'simple-dropdown-menu';
        this.dropdownMenu.id = 'simple-profile-dropdown';
        
        this.dropdownMenu.innerHTML = `
            <a href="#" class="simple-menu-item" data-action="profile">
                <i class="fas fa-user"></i> My Profile
            </a>
            <div class="simple-menu-divider"></div>
            <a href="#" class="simple-menu-item" data-action="logout">
                <i class="fas fa-sign-out-alt"></i> Logout
            </a>
        `;
        
        this.dropdownMenu.style.cssText = `
            display: none;
            position: absolute;
            top: 50px;
            right: 0;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            min-width: 200px;
            z-index: 1001;
            padding: 8px 0;
        `;
        
        const items = this.dropdownMenu.querySelectorAll('.simple-menu-item');
        items.forEach(item => {
            item.style.cssText = `
                display: block;
                padding: 10px 16px;
                color: #374151;
                text-decoration: none;
                font-size: 14px;
                cursor: pointer;
            `;
            
            item.onmouseenter = () => item.style.background = '#f9fafb';
            item.onmouseleave = () => item.style.background = 'transparent';
            
            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.dropdownMenu.style.display = 'none';
                if (item.dataset.action === 'logout') this.logout();
                else if (item.dataset.action === 'profile') this.navigateToTab('profile');
            });
        });
        
        const logoutItem = this.dropdownMenu.querySelector('[data-action="logout"]');
        if (logoutItem) logoutItem.style.color = '#ef4444';
        
        const dropdownContainer = document.querySelector('.user-profile-dropdown, .header-right');
        if (dropdownContainer) dropdownContainer.appendChild(this.dropdownMenu);
        else document.body.appendChild(this.dropdownMenu);
    }
    
    setupSimpleTrigger() {
        this.profileTrigger = document.querySelector('.profile-trigger, .header-profile, [data-profile]');
        
        if (!this.profileTrigger) {
            console.error('❌ No profile trigger found');
            return;
        }
        
        const cleanTrigger = this.profileTrigger.cloneNode(true);
        this.profileTrigger.parentNode.replaceChild(cleanTrigger, this.profileTrigger);
        this.profileTrigger = cleanTrigger;
        
        this.profileTrigger.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🎯 Profile clicked - Toggling dropdown');
            this.dropdownMenu.style.display = this.dropdownMenu.style.display === 'block' ? 'none' : 'block';
        });
        
        document.addEventListener('click', (e) => {
            if (this.dropdownMenu.style.display === 'block' &&
                !this.profileTrigger.contains(e.target) && 
                !this.dropdownMenu.contains(e.target)) {
                this.dropdownMenu.style.display = 'none';
            }
        });
        
        this.profileTrigger.onmouseenter = null;
        this.profileTrigger.onmouseover = null;
        this.profileTrigger.onmouseleave = null;
    }
    
    loadTabModule(tabId) {
        console.log(`📦 Loading module for tab: ${tabId}`);
        
        window.dispatchEvent(new CustomEvent('loadModule', { detail: { tabId } }));
        
        setTimeout(() => {
            switch(tabId) {
                case 'dashboard':
                    if (typeof loadDashboard === 'function') loadDashboard();
                    else if (window.dashboardModule?.loadDashboard) window.dashboardModule.loadDashboard();
                    break;
                case 'profile':
                    if (typeof loadProfile === 'function') loadProfile();
                    else if (window.profileModule?.loadProfileData) window.profileModule.loadProfileData();
                    break;
                case 'calendar':
                    if (typeof loadAcademicCalendar === 'function') loadAcademicCalendar();
                    break;
                case 'courses':
                    if (typeof loadCourses === 'function') loadCourses();
                    break;
                case 'learning-hub':
                    console.log('📦 Loading Unified Learning Hub (Courses + Registration)');
                    if (typeof loadCourses === 'function') loadCourses();
                    if (typeof loadUnitRegistration === 'function') loadUnitRegistration();
                    if (window.unitRegistration && typeof window.unitRegistration.loadRegistered === 'function') {
                        window.unitRegistration.loadRegistered();
                        window.unitRegistration.loadUnits();
                    }
                    break;
                case 'attendance':
                    if (typeof loadAttendance === 'function') loadAttendance();
                    else if (window.attendanceModule?.loadAttendanceData) window.attendanceModule.loadAttendanceData();
                    break;
                case 'cats':
                    if (typeof loadExams === 'function') loadExams();
                    break;
                case 'resources':
                    if (typeof loadResources === 'function') loadResources();
                    break;
                case 'messages':
                    if (typeof loadMessages === 'function') loadMessages();
                    break;
                case 'nurseiq':
                    if (typeof loadNurseIQ === 'function') loadNurseIQ();
                    break;
                case 'support-tickets':
                    if (typeof loadSupportTickets === 'function') loadSupportTickets();
                    break;
                case 'unit-registration':
                    console.log('📦 Loading Unit Registration module');
                    if (typeof loadUnitRegistration === 'function') loadUnitRegistration();
                    else if (window.unitRegistration && typeof window.unitRegistration.loadRegistered === 'function') {
                        window.unitRegistration.loadRegistered();
                        window.unitRegistration.loadUnits();
                    }
                    break;
                case 'exam-card':
                    console.log('📇 Loading Exam Card module...');
                    if (typeof initExamCard === 'function') initExamCard();
                    else if (window.examCardModule && typeof window.examCardModule.refresh === 'function') window.examCardModule.refresh();
                    else if (window.examCardModule) window.examCardModule.init();
                    else {
                        console.warn('⚠️ examCardModule not found');
                        const container = document.getElementById('exam-card-content');
                        if (container) {
                            container.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Loading exam card module...</p></div>';
                        }
                    }
                    break;
                default:
                    console.log(`No specific loader for tab: ${tabId}`);
            }
        }, 300);
    }
    
    toggleMenu() {
        if (this.sidebar.classList.contains('active')) this.closeMenu();
        else this.openMenu();
    }
    
    openMenu() {
        if (this.sidebar) this.sidebar.classList.add('active');
        if (this.overlay) this.overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    closeMenu() {
        if (this.sidebar) this.sidebar.classList.remove('active');
        if (this.overlay) this.overlay.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
    
    refreshDashboard() {
        console.log('🔄 Refreshing dashboard...');
        this.showToast('Refreshing dashboard...', 'info', 1500);
        
        if (window.db && window.db.clearCache) window.db.clearCache('dashboard');
        if (window.dashboardModule && window.dashboardModule.refreshDashboard) window.dashboardModule.refreshDashboard();
        else if (typeof loadDashboard === 'function') loadDashboard();
        
        if (this.currentTab === 'exam-card' && typeof initExamCard === 'function') initExamCard();
        this.loadLastLogin();
    }
    
    showToast(message, type = 'info', duration = 3000) {
        const existingToasts = document.querySelectorAll('.custom-toast');
        existingToasts.forEach(toast => toast.remove());
        
        const toast = document.createElement('div');
        toast.className = `custom-toast toast-${type}`;
        
        const maxLength = 100;
        const displayMessage = message.length > maxLength ? message.substring(0, maxLength) + '...' : message;
        toast.textContent = displayMessage;
        
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${this.getToastColor(type)};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 9999;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            max-width: 350px;
            width: auto;
            min-width: 200px;
            max-height: 120px;
            overflow: hidden;
            word-wrap: break-word;
            word-break: break-word;
            font-size: 14px;
            line-height: 1.4;
            opacity: 0;
            transform: translateY(20px);
            transition: opacity 0.3s ease, transform 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        }, 10);
        
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
        console.log('👤 Loading initial user data...');
        await this.delay(1000);
        
        try {
            const userId = window.currentUserId || (window.db && window.db.currentUserId);
            const userProfile = window.currentUserProfile || (window.db && window.db.currentUserProfile);
            
            console.log('👤 User data sources:', { userId: !!userId, userProfile: !!userProfile });
            
            if (userId && this.supabase) {
                try {
                    const dbUserData = await this.loadUserFromDatabase(userId);
                    if (dbUserData) {
                        this.updateAllUserInfo(dbUserData);
                        // Update last login timestamp
                        await this.updateLastLogin(userId);
                    } else if (userProfile) {
                        this.updateAllUserInfo(userProfile);
                        await this.updateLastLogin(userId);
                    } else {
                        this.updateDefaultUserInfo();
                    }
                } catch (dbError) {
                    console.warn('⚠️ Database load failed, using cached data');
                    if (userProfile) {
                        this.updateAllUserInfo(userProfile);
                        await this.updateLastLogin(userId);
                    } else {
                        this.updateDefaultUserInfo();
                    }
                }
            } else if (userProfile) {
                this.updateAllUserInfo(userProfile);
                if (userId) await this.updateLastLogin(userId);
            } else {
                this.updateDefaultUserInfo();
            }
        } catch (error) {
            console.error('❌ Error loading initial user data:', error);
            this.updateDefaultUserInfo();
        }
    }
    
    updateDefaultUserInfo() {
        console.log('👤 Setting default user info');
        
        const defaultName = 'Student';
        
        if (this.headerUserName) this.headerUserName.textContent = defaultName;
        if (this.headerProfilePhoto) {
            this.headerProfilePhoto.src = 'https://ui-avatars.com/api/?name=Student&background=667eea&color=fff&size=100';
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
    
    async loadUserFromDatabase(userId) {
        if (!this.supabase || typeof this.supabase.from !== 'function') {
            console.warn('⚠️ Supabase client not available for database query');
            return null;
        }
        
        try {
            console.log('🔍 Querying consolidated_user_profiles_table for user:', userId);
            
            const { data: userProfile, error } = await this.supabase
                .from('consolidated_user_profiles_table')
                .select('*')
                .or(`id.eq.${userId},user_id.eq.${userId}`)
                .maybeSingle();
            
            if (error) {
                console.error('❌ Database query error:', error);
                return null;
            }
            
            if (userProfile) {
                console.log('✅ User data loaded from database');
                window.currentUserProfile = userProfile;
                localStorage.setItem('currentUserProfile', JSON.stringify(userProfile));
                return userProfile;
            }
            
            console.warn('⚠️ No user profile found in database');
            return null;
        } catch (error) {
            console.error('❌ Error loading user from database:', error);
            return null;
        }
    }
    
    setupMobileMenuVisibility() {
        if (!this.mobileMenuToggle) return;
        
        const updateVisibility = () => {
            if (window.innerWidth <= 768) {
                this.mobileMenuToggle.style.display = 'flex';
            } else {
                this.mobileMenuToggle.style.display = 'none';
                this.closeMenu();
            }
        };
        
        updateVisibility();
        window.addEventListener('resize', updateVisibility);
    }
    
    async updateAllUserInfo(userProfile = null) {
        console.log('👤 Updating all user info...');
        
        try {
            let profile = userProfile || window.currentUserProfile || (window.db && window.db.currentUserProfile);
            
            if (!profile && window.currentUserId) {
                profile = await this.loadUserFromDatabase(window.currentUserId);
            }
            
            if (!profile) {
                console.warn('⚠️ No user profile available');
                this.updateDefaultUserInfo();
                return;
            }
            
            const studentName = profile.full_name || 'Student';
            
            if (this.headerUserName) this.headerUserName.textContent = studentName;
            
            await this.updateProfilePhoto(profile);
            
            const welcomeHeader = document.getElementById('welcome-header');
            if (welcomeHeader) {
                const getGreeting = (hour) => {
                    if (hour >= 5 && hour < 12) return "Good Morning";
                    if (hour >= 12 && hour < 17) return "Good Afternoon";
                    if (hour >= 17 && hour < 21) return "Good Evening";
                    return "Good Night";
                };
                
                const now = new Date();
                const hour = now.getHours();
                welcomeHeader.textContent = `${getGreeting(hour)}, ${studentName}!`;
            }
            
            console.log('✅ All user info updated');
        } catch (error) {
            console.error('❌ Error updating user info:', error);
            this.updateDefaultUserInfo();
        }
    }
    
    async updateProfilePhoto(userProfile = null) {
        if (!this.headerProfilePhoto) return;
        
        try {
            let photoUrl = localStorage.getItem('userProfilePhoto');
            
            if (!photoUrl && userProfile?.passport_url) {
                photoUrl = userProfile.passport_url;
            }
