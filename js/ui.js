// js/ui.js - COMPLETE User Interface Management with App-Style Loading
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
        
        // Store tab state in localStorage for persistence
        this.storageKey = 'nchsm_last_tab';
        
        // Define valid tabs
        this.validTabs = [
            'dashboard', 'profile', 'calendar', 'courses', 
            'attendance', 'cats', 'resources', 'messages', 
            'support-tickets', 'nurseiq'
        ];
        
        // Define clean URL paths for each tab
        this.tabPaths = {
            'dashboard': '/',
            'profile': '/profile', 
            'calendar': '/calendar',
            'courses': '/courses',
            'attendance': '/attendance',
            'cats': '/exams',
            'resources': '/resources',
            'messages': '/messages',
            'support-tickets': '/support-tickets',
            'nurseiq': '/nurseiq'
        };
        
        // Reverse lookup for paths
        this.pathToTab = {
            '/': 'dashboard',
            '/profile': 'profile',
            '/calendar': 'calendar',
            '/courses': 'courses',
            '/attendance': 'attendance',
            '/exams': 'cats',
            '/resources': 'resources',
            '/messages': 'messages',
            '/support-tickets': 'support-tickets',
            '/nurseiq': 'nurseiq'
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
        
        // Modal elements
        this.transcriptModal = document.getElementById('transcript-modal');
        this.closeTranscriptBtn = document.getElementById('closeTranscriptBtn');
        this.closeTranscriptModalBtn = document.getElementById('closeTranscriptModalBtn');
        
        // Reader elements
        this.readerBackBtn = document.getElementById('readerBackBtn');
        this.mobileReader = document.getElementById('mobile-reader');
        
        // Profile dropdown elements
        this.profileTrigger = document.querySelector('.profile-trigger');
        this.dropdownMenu = document.querySelector('.dropdown-menu');
        
        // Loading screen elements
        this.loadingScreen = document.getElementById('loading-screen');
        this.progressFill = document.getElementById('progress-fill');
        this.progressText = document.getElementById('progress-text');
        this.statusSteps = document.getElementById('status-steps');
        this.funFact = document.getElementById('fun-fact');
        
        // Supabase client reference
        this.supabase = window.supabase || window.db?.supabase;
        
        // Initialize
        this.initialize();
    }
    
    async initialize() {
        console.log('🔧 Initializing UI with app-style loading...');
        
        // 🔥 STEP 1: Start app-style loading
        this.setupAppLoading();
        this.updateLoadingProgress(0, 5);
        
        // 🔥 STEP 2: Clean up styles
        await this.delay(300);
        this.cleanupInitialStyles();
        this.updateLoadingProgress(1, 5);
        
        // 🔥 STEP 3: Setup event listeners
        await this.delay(300);
        this.setupEventListeners();
        this.updateLoadingProgress(2, 5);
        
        // 🔥 STEP 4: Setup proper URL navigation
        await this.delay(400);
        this.setupUrlNavigation();
        this.setupTabChangeListener();
        this.updateLoadingProgress(3, 5);
        
        // 🔥 STEP 5: Initialize utilities
        await this.delay(300);
        this.initializeDateTime();
        this.setupOfflineIndicator();
        this.setupMobileMenuVisibility();
        this.loadLastTab();
        this.updateLoadingProgress(4, 5);
        
        // 🔥 STEP 6: Load user data
        await this.delay(500);
        await this.loadInitialUserData();
        this.updateLoadingProgress(5, 5);
        
        // 🔥 STEP 7: Hide loading screen
        await this.delay(800);
        await this.hideLoadingScreen();
        
        console.log('✅ UIModule fully initialized');
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    setupAppLoading() {
        console.log('📱 Setting up app-style loading...');
        
        if (!this.loadingScreen) {
            console.warn('⚠️ No loading screen found');
            return;
        }
        
        this.loadingScreen.classList.add('app-splash');
        
        const welcomeText = this.loadingScreen.querySelector('.welcome-text h1');
        if (welcomeText) {
            welcomeText.textContent = 'NCHSM Portal';
        }
        
        const subtitle = this.loadingScreen.querySelector('.subtitle');
        if (subtitle) {
            subtitle.textContent = 'Your Academic Hub';
        }
        
        if (!this.loadingScreen.querySelector('.app-version')) {
            const versionEl = document.createElement('div');
            versionEl.className = 'app-version';
            versionEl.textContent = 'v2.1';
            this.loadingScreen.querySelector('.loading-container').appendChild(versionEl);
        }
        
        console.log('✅ App-style loading configured');
    }
    
    updateLoadingProgress(step, totalSteps = 5) {
        if (!this.loadingScreen || !this.progressFill || !this.progressText) return;
        
        const percentage = Math.min((step / totalSteps) * 100, 100);
        
        this.progressFill.style.transition = 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
        this.progressFill.style.width = `${percentage}%`;
        
        const loadingMessages = [
            'Launching Portal...',
            'Loading Your Profile...',
            'Preparing Dashboard...',
            'Syncing Data...',
            'Finalizing Setup...',
            'Ready!'
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
        
        this.loadingScreen.style.display = 'none';
        
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
        
        this.navLinks.forEach(link => {
            link.classList.remove('active');
        });
        
        if (this.dropdownMenu) {
            this.dropdownMenu.style.display = 'none';
            this.dropdownMenu.classList.remove('show');
        }
        
        if (window.innerWidth <= 768 && this.sidebar) {
            this.sidebar.classList.remove('active');
        }
        
        console.log('✅ Styles cleaned up');
    }
    
    // FIXED: Setup URL navigation that works with server
    setupUrlNavigation() {
        console.log('🔗 Setting up URL navigation...');
        
        // Check if we're coming from login redirect
        const hasHash = window.location.hash;
        if (hasHash) {
            const tabId = hasHash.replace('#', '');
            console.log(`🔗 Found hash in URL: ${tabId}`);
            
            if (this.isValidTab(tabId)) {
                // Clean the URL by replacing hash with clean path
                setTimeout(() => {
                    this.showTab(tabId);
                    this.updateUrlForTab(tabId);
                }, 100);
                return;
            }
        }
        
        // Handle normal page load
        window.addEventListener('load', () => {
            const path = this.getCurrentPath();
            console.log('🔗 Initial path:', path);
            
            let tabId = this.getTabFromPath(path);
            console.log(`📊 Determined tab from path: ${tabId}`);
            
            if (tabId && this.isValidTab(tabId)) {
                console.log(`🎯 Showing tab from path: ${tabId}`);
                this.showTab(tabId);
            } else {
                const lastTab = localStorage.getItem(this.storageKey);
                console.log(`💾 Saved last tab: ${lastTab}`);
                
                if (lastTab && this.isValidTab(lastTab)) {
                    tabId = lastTab;
                    this.showTab(tabId);
                    this.updateUrlForTab(tabId);
                } else {
                    console.log('🎯 Defaulting to dashboard');
                    tabId = 'dashboard';
                    this.showTab(tabId);
                    this.updateUrlForTab(tabId);
                }
            }
        });
        
        // Handle browser back/forward
        window.addEventListener('popstate', (event) => {
            console.log('🔗 Popstate event triggered');
            const newPath = this.getCurrentPath();
            console.log('🔗 New path from popstate:', newPath);
            
            const newTabId = this.getTabFromPath(newPath);
            if (newTabId && this.isValidTab(newTabId)) {
                console.log(`🎯 Popstate showing tab: ${newTabId}`);
                this.showTab(newTabId, true);
                localStorage.setItem(this.storageKey, newTabId);
            }
        });
    }
    
    getCurrentPath() {
        let path = window.location.pathname;
        
        // Remove .html extension
        path = path.replace(/\.html$/, '');
        
        // Remove trailing slash
        path = path.replace(/\/$/, '');
        
        // Handle root path
        if (path === '' || path === '/index' || path === '/') {
            console.log('🏠 Root path detected');
            return '/';
        }
        
        return path;
    }
    
    getTabFromPath(path) {
        // Remove leading slash for comparison
        const cleanPath = path.startsWith('/') ? path.substring(1) : path;
        
        // Handle root path
        if (path === '/' || cleanPath === '') {
            return 'dashboard';
        }
        
        // Check pathToTab mapping
        if (this.pathToTab[path]) {
            return this.pathToTab[path];
        }
        
        // Try with leading slash
        const pathWithSlash = path.startsWith('/') ? path : `/${path}`;
        if (this.pathToTab[pathWithSlash]) {
            return this.pathToTab[pathWithSlash];
        }
        
        // Try tab ID directly
        if (this.isValidTab(cleanPath)) {
            return cleanPath;
        }
        
        console.log(`❓ No tab found for path: ${cleanPath}`);
        return null;
    }
    
    updateUrlForTab(tabId) {
        if (!this.isValidTab(tabId)) return;
        
        const path = this.tabPaths[tabId] || '/';
        const currentPath = this.getCurrentPath();
        
        // Remove any hash from current URL
        if (window.location.hash) {
            window.location.hash = '';
        }
        
        // Only update if different
        if (path !== currentPath) {
            const newUrl = `${window.location.origin}${path}`;
            console.log(`🔗 Updating URL to: ${newUrl}`);
            
            // Use replaceState instead of pushState on initial load
            window.history.replaceState({ tabId }, '', newUrl);
        }
    }
    
    loadLastTab() {
        const lastTab = localStorage.getItem(this.storageKey);
        if (lastTab && this.isValidTab(lastTab)) {
            this.currentTab = lastTab;
        }
    }
    
    isValidTab(tabId) {
        return this.validTabs.includes(tabId);
    }
    
    showTab(tabId, fromPopstate = false) {
        console.log(`📱 showTab(${tabId}, fromPopstate: ${fromPopstate}) called`);
        
        if (!this.isValidTab(tabId)) {
            console.warn(`⚠️ Invalid tab: ${tabId}, defaulting to dashboard`);
            tabId = 'dashboard';
        }
        
        if (this.currentTab === tabId && !fromPopstate) {
            console.log(`⚠️ Tab ${tabId} is already active`);
            return;
        }
        
        // Hide all tabs
        this.tabs.forEach(tab => {
            tab.style.removeProperty('display');
            tab.classList.remove('active');
        });
        
        // Show selected tab
        const selectedTab = document.getElementById(tabId);
        if (selectedTab) {
            selectedTab.classList.add('active');
            console.log(`✅ Tab ${tabId} activated`);
        } else {
            console.error(`❌ Tab element not found: ${tabId}`);
            return;
        }
        
        // Update navigation
        this.navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-tab') === tabId) {
                link.classList.add('active');
            }
        });
        
        // Update URL if not from popstate
        if (!fromPopstate) {
            this.updateUrlForTab(tabId);
        }
        
        // Save tab state
        localStorage.setItem(this.storageKey, tabId);
        this.closeMenu();
        
        // Dispatch event
        const previousTab = this.currentTab;
        this.currentTab = tabId;
        
        window.dispatchEvent(new CustomEvent('tabChanged', { 
            detail: { 
                tabId, 
                previousTab,
                fromPopstate
            }
        }));
        
        // Update page title
        this.updatePageTitle(tabId);
        
        // Load tab data
        setTimeout(() => this.loadTabModule(tabId), 100);
        
        console.log(`✅ Successfully switched to tab: ${tabId}`);
    }
    
    updatePageTitle(tabId) {
        const tabNames = {
            'dashboard': 'Dashboard',
            'profile': 'Profile',
            'calendar': 'Academic Calendar',
            'courses': 'My Courses',
            'attendance': 'Attendance',
            'cats': 'Exams & Grades',
            'resources': 'Resources',
            'messages': 'Messages',
            'support-tickets': 'Support Tickets',
            'nurseiq': 'NurseIQ'
        };
        
        const tabName = tabNames[tabId] || 'Dashboard';
        document.title = `${tabName} - NCHSM Student Portal`;
    }
    
    setupEventListeners() {
        console.log('🔧 Setting up event listeners...');
        
        // Mobile menu toggle
        if (this.mobileMenuToggle) {
            this.mobileMenuToggle.addEventListener('click', () => this.toggleMenu());
            console.log('✅ Mobile menu toggle listener added');
        }
        
        // Overlay click to close menu
        if (this.overlay) {
            this.overlay.addEventListener('click', () => this.closeMenu());
            console.log('✅ Overlay listener added');
        }
        
        // Navigation links
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tabId = link.getAttribute('data-tab');
                console.log(`📱 Nav clicked: ${tabId}`);
                
                if (tabId && this.isValidTab(tabId)) {
                    this.showTab(tabId);
                    this.closeMenu();
                }
            });
        });
        console.log(`✅ Added ${this.navLinks.length} nav link listeners`);
        
        // Header logout button
        if (this.headerLogout) {
            console.log('🔐 Header logout button found');
            this.headerLogout.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('🔐 Logout clicked');
                this.logout();
            });
        } else {
            console.error('❌ Header logout button not found!');
        }
        
        // Header refresh button
        if (this.headerRefresh) {
            this.headerRefresh.addEventListener('click', () => {
                console.log('🔄 Header refresh clicked');
                this.refreshDashboard();
            });
        }
        
        // Footer buttons
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
        
        // Transcript modal
        if (this.closeTranscriptBtn) {
            this.closeTranscriptBtn.addEventListener('click', () => this.closeTranscriptModal());
        }
        
        if (this.closeTranscriptModalBtn) {
            this.closeTranscriptModalBtn.addEventListener('click', () => this.closeTranscriptModal());
        }
        
        if (this.transcriptModal) {
            this.transcriptModal.addEventListener('click', (e) => {
                if (e.target === this.transcriptModal) {
                    this.closeTranscriptModal();
                }
            });
        }
        
        // Reader back button
        if (this.readerBackBtn) {
            this.readerBackBtn.addEventListener('click', () => this.closeReader());
        }
        
        // Setup profile dropdown - FIXED VERSION
        this.setupProfileDropdown();
        
        // Dashboard card clicks
        setTimeout(() => {
            const cards = document.querySelectorAll('.stat-card[data-tab]');
            cards.forEach(card => {
                card.addEventListener('click', (e) => {
                    e.preventDefault();
                    const tabId = card.getAttribute('data-tab');
                    console.log(`📱 Card clicked: ${tabId}`);
                    
                    if (tabId && this.isValidTab(tabId)) {
                        this.showTab(tabId);
                    }
                });
            });
            console.log(`✅ Added ${cards.length} card click listeners`);
        }, 1000);
        
        console.log('✅ All event listeners setup complete');
    }
    
    // FIXED: Profile dropdown with proper event handling
    setupProfileDropdown() {
        console.log('📋 Setting up profile dropdown...');
        
        if (!this.profileTrigger || !this.dropdownMenu) {
            console.error('❌ Profile dropdown elements not found!');
            console.log('- Profile trigger exists:', !!this.profileTrigger);
            console.log('- Dropdown menu exists:', !!this.dropdownMenu);
            return;
        }
        
        console.log('✅ Found dropdown elements');
        
        // Clone to remove existing listeners
        const newProfileTrigger = this.profileTrigger.cloneNode(true);
        this.profileTrigger.parentNode.replaceChild(newProfileTrigger, this.profileTrigger);
        this.profileTrigger = newProfileTrigger;
        
        // Reset dropdown
        this.dropdownMenu.style.display = 'none';
        
        // Add event handler
        this.profileTrigger.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('👤 Profile dropdown clicked (UI.js)');
            
            const isVisible = this.dropdownMenu.style.display === 'block';
            this.dropdownMenu.style.display = isVisible ? 'none' : 'block';
            
            const arrow = this.profileTrigger.querySelector('.dropdown-icon');
            if (arrow) {
                arrow.style.transform = isVisible ? 'rotate(0deg)' : 'rotate(180deg)';
                arrow.style.transition = 'transform 0.3s ease';
            }
            
            console.log(`📋 Dropdown ${isVisible ? 'hidden' : 'shown'}`);
        });
        
        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (this.dropdownMenu && 
                !this.profileTrigger.contains(e.target) && 
                !this.dropdownMenu.contains(e.target)) {
                this.dropdownMenu.style.display = 'none';
                
                const arrow = this.profileTrigger.querySelector('.dropdown-icon');
                if (arrow) {
                    arrow.style.transform = 'rotate(0deg)';
                }
            }
        });
        
        // Handle dropdown links
        const profileLink = this.dropdownMenu.querySelector('a[data-tab="profile"]');
        if (profileLink) {
            profileLink.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('👤 Profile link clicked in dropdown');
                this.showTab('profile');
                this.dropdownMenu.style.display = 'none';
                
                const arrow = this.profileTrigger.querySelector('.dropdown-icon');
                if (arrow) {
                    arrow.style.transform = 'rotate(0deg)';
                }
            });
        }
        
        // Handle logout in dropdown
        const dropdownLogout = this.dropdownMenu.querySelector('#header-logout');
        if (dropdownLogout) {
            dropdownLogout.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('🔐 Logout from dropdown clicked');
                this.logout();
            });
        }
        
        console.log('✅ Profile dropdown setup complete');
    }
    
    setupTabChangeListener() {
        window.addEventListener('tabChanged', (e) => {
            console.log(`🔄 Tab changed to: ${e.detail.tabId}`);
            this.loadTabModule(e.detail.tabId);
        });
    }
    
    loadTabModule(tabId) {
        console.log(`📦 Loading module for tab: ${tabId}`);
        
        window.dispatchEvent(new CustomEvent('loadModule', { detail: { tabId } }));
        
        setTimeout(() => {
            switch(tabId) {
                case 'dashboard':
                    if (typeof loadDashboard === 'function') {
                        loadDashboard();
                    } else if (window.dashboardModule && window.dashboardModule.loadDashboard) {
                        window.dashboardModule.loadDashboard();
                    }
                    break;
                case 'profile':
                    if (typeof loadProfile === 'function') {
                        loadProfile();
                    }
                    break;
                case 'calendar':
                    if (typeof loadAcademicCalendar === 'function') {
                        loadAcademicCalendar();
                    }
                    break;
                case 'courses':
                    if (typeof loadCourses === 'function') {
                        loadCourses();
                    }
                    break;
                case 'attendance':
                    if (typeof loadAttendance === 'function') {
                        loadAttendance();
                    } else if (window.attendanceModule && window.attendanceModule.loadAttendanceData) {
                        window.attendanceModule.loadAttendanceData();
                    }
                    break;
                case 'cats':
                    if (typeof loadExams === 'function') {
                        loadExams();
                    }
                    break;
                case 'resources':
                    if (typeof loadResources === 'function') {
                        loadResources();
                    }
                    break;
                case 'messages':
                    if (typeof loadMessages === 'function') {
                        loadMessages();
                    }
                    break;
                case 'nurseiq':
                    if (typeof loadNurseIQ === 'function') {
                        loadNurseIQ();
                    }
                    break;
            }
        }, 300);
    }
    
    toggleMenu() {
        if (this.sidebar.classList.contains('active')) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
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
        
        if (window.db && window.db.clearCache) {
            window.db.clearCache('dashboard');
        }
        
        if (window.dashboardModule && window.dashboardModule.refreshDashboard) {
            window.dashboardModule.refreshDashboard();
        } else if (typeof loadDashboard === 'function') {
            loadDashboard();
        }
    }
    
    showToast(message, type = 'info', duration = 3000) {
        const existingToasts = document.querySelectorAll('.custom-toast');
        existingToasts.forEach(toast => toast.remove());
        
        const toast = document.createElement('div');
        toast.className = `custom-toast toast-${type}`;
        
        const maxLength = 100;
        const displayMessage = message.length > maxLength 
            ? message.substring(0, maxLength) + '...' 
            : message;
        
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
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
    }
    
    getToastColor(type) {
        const colors = {
            'info': '#4C1D95',
            'success': '#10B981',
            'warning': '#F59E0B',
            'error': '#EF4444'
        };
        return colors[type] || colors.info;
    }
    
    async loadInitialUserData() {
        console.log('👤 Loading initial user data...');
        
        try {
            if (!window.currentUserId && window.db?.currentUserId) {
                window.currentUserId = window.db.currentUserId;
            }
            
            if (!window.currentUserProfile && window.db?.currentUserProfile) {
                window.currentUserProfile = window.db.currentUserProfile;
            }
            
            if (window.currentUserId && this.supabase) {
                const userData = await this.loadUserFromDatabase(window.currentUserId);
                if (userData) {
                    this.updateAllUserInfo(userData);
                } else {
                    this.updateAllUserInfo(window.currentUserProfile);
                }
            } else if (window.currentUserProfile) {
                this.updateAllUserInfo(window.currentUserProfile);
            }
        } catch (error) {
            console.error('❌ Error loading initial user data:', error);
        }
    }
    
    async loadUserFromDatabase(userId) {
        try {
            if (!this.supabase) {
                console.warn('⚠️ No Supabase client available');
                return null;
            }
            
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
                console.log('✅ User data loaded from database:', {
                    id: userProfile.id,
                    name: userProfile.full_name,
                    email: userProfile.email,
                    studentId: userProfile.student_id
                });
                
                window.currentUserProfile = userProfile;
                localStorage.setItem('currentUserProfile', JSON.stringify(userProfile));
                
                return userProfile;
            }
            
            console.warn('⚠️ No user profile found in database for ID:', userId);
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
    
    async getProfilePhotoFromDatabase(userId) {
        try {
            if (!this.supabase) {
                console.warn('⚠️ No Supabase client available');
                return null;
            }
            
            const { data: userProfile, error } = await this.supabase
                .from('consolidated_user_profiles_table')
                .select('passport_url, full_name')
                .or(`id.eq.${userId},user_id.eq.${userId}`)
                .maybeSingle();
            
            if (error) {
                console.error('❌ Error fetching user profile:', error);
                return null;
            }
            
            if (!userProfile) {
                console.warn('⚠️ No user profile found for ID:', userId);
                return null;
            }
            
            if (userProfile.passport_url && userProfile.passport_url.trim() !== '') {
                console.log('📸 Found passport_url in database:', userProfile.passport_url);
                return userProfile.passport_url;
            }
            
            const nameForAvatar = userProfile.full_name 
                ? userProfile.full_name.replace(/\s+/g, '+')
                : 'Student';
            
            const avatarUrl = `https://ui-avatars.com/api/?name=${nameForAvatar}&background=667eea&color=fff&size=100`;
            console.log('📸 Using generated avatar for:', userProfile.full_name);
            
            return avatarUrl;
            
        } catch (error) {
            console.error('❌ Error getting profile photo:', error);
            return null;
        }
    }
    
    async updateAllUserInfo(userProfile = null) {
        console.log('👤 Updating all user info...');
        
        try {
            let profile = userProfile || window.currentUserProfile || window.db?.currentUserProfile;
            
            if (!profile && window.currentUserId) {
                profile = await this.loadUserFromDatabase(window.currentUserId);
            }
            
            if (!profile) {
                console.warn('⚠️ No user profile available');
                return;
            }
            
            console.log('📝 User profile data:', profile);
            
            const studentName = profile.full_name || 'Student';
            
            if (this.headerUserName) {
                this.headerUserName.textContent = studentName;
                console.log(`✅ Header name updated: ${studentName}`);
            }
            
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
            
            const profileName = document.getElementById('profile-name');
            if (profileName && !profileName.value && studentName !== 'Student') {
                profileName.value = studentName;
            }
            
            const studentIdField = document.getElementById('profile-student-id');
            if (studentIdField && profile.student_id && !studentIdField.value) {
                studentIdField.value = profile.student_id;
            }
            
            console.log('✅ All user info updated');
            
        } catch (error) {
            console.error('❌ Error updating user info:', error);
        }
    }
    
    async updateProfilePhoto(userProfile = null) {
        console.log('📸 Updating profile photo...');
        
        if (!this.headerProfilePhoto) {
            console.error('❌ Header profile photo element not found!');
            return;
        }
        
        try {
            let photoUrl = null;
            
            if (window.currentUserId) {
                photoUrl = await this.getProfilePhotoFromDatabase(window.currentUserId);
            }
            
            if (!photoUrl && userProfile?.passport_url) {
                photoUrl = userProfile.passport_url;
                console.log('📸 Using passport_url from userProfile object');
            }
            
            if (!photoUrl) {
                photoUrl = localStorage.getItem('userProfilePhoto');
                if (photoUrl) {
                    console.log('📸 Using cached photo from localStorage');
                }
            }
            
            if (!photoUrl && userProfile?.full_name) {
                const nameForAvatar = userProfile.full_name.replace(/\s+/g, '+');
                photoUrl = `https://ui-avatars.com/api/?name=${nameForAvatar}&background=667eea&color=fff&size=100`;
                console.log('📸 Generated avatar from name:', userProfile.full_name);
            }
            
            if (!photoUrl) {
                photoUrl = 'https://ui-avatars.com/api/?name=Student&background=667eea&color=fff&size=100';
                console.log('📸 Using default avatar');
            }
            
            console.log('📸 Final photo URL:', photoUrl);
            
            this.headerProfilePhoto.src = photoUrl;
            this.headerProfilePhoto.onerror = () => {
                console.error('❌ Failed to load profile photo, using fallback');
                const fallbackUrl = 'https://ui-avatars.com/api/?name=Student&background=667eea&color=fff&size=100';
                this.headerProfilePhoto.src = fallbackUrl;
            };
            
            const allProfilePhotos = document.querySelectorAll('img[alt*="profile"], img[alt*="avatar"], .user-avatar img, .profile-photo');
            allProfilePhotos.forEach(img => {
                if (img !== this.headerProfilePhoto && img.tagName === 'IMG') {
                    img.src = photoUrl;
                }
            });
            
            localStorage.setItem('userProfilePhoto', photoUrl);
            
            console.log('✅ Profile photo updated');
            
        } catch (error) {
            console.error('❌ Error updating profile photo:', error);
            
            const fallbackUrl = 'https://ui-avatars.com/api/?name=Student&background=667eea&color=fff&size=100';
            this.headerProfilePhoto.src = fallbackUrl;
        }
    }
    
    showTranscriptModal(examData) {
        if (!this.transcriptModal) return;
        
        document.getElementById('transcript-exam-name').textContent = examData.name || 'Exam Transcript';
        document.getElementById('transcript-cat1').textContent = examData.cat1 !== null ? `${examData.cat1}/30` : '--';
        document.getElementById('transcript-cat2').textContent = examData.cat2 !== null ? `${examData.cat2}/30` : '--';
        document.getElementById('transcript-final').textContent = examData.final !== null ? `${examData.final}/40` : '--';
        document.getElementById('transcript-total').textContent = examData.total ? `${examData.total}/100` : '--';
        
        const status = examData.total >= 50 ? 'PASS' : 'FAIL';
        const statusElement = document.getElementById('transcript-status');
        statusElement.textContent = status;
        statusElement.style.color = status === 'PASS' ? '#10B981' : '#EF4444';
        
        this.transcriptModal.style.display = 'flex';
    }
    
    closeTranscriptModal() {
        if (this.transcriptModal) {
            this.transcriptModal.style.display = 'none';
        }
    }
    
    openReader(resource) {
        if (!this.mobileReader) return;
        
        document.getElementById('reader-title').textContent = resource.title;
        const content = document.getElementById('reader-content');
        content.innerHTML = `
            <div class="resource-meta">
                <span><i class="fas fa-book"></i> ${resource.course || 'General'}</span>
                <span><i class="fas fa-calendar"></i> ${new Date(resource.created_at).toLocaleDateString()}</span>
                <span><i class="fas fa-file"></i> ${resource.type || 'PDF'}</span>
            </div>
            <div class="resource-description">
                <p>${resource.description || 'No description available.'}</p>
            </div>
            <div class="resource-preview">
                <p><strong>Note:</strong> This is a view-only preview. Download the full resource for offline access.</p>
            </div>
        `;
        
        this.mobileReader.style.display = 'block';
    }
    
    closeReader() {
        if (this.mobileReader) {
            this.mobileReader.style.display = 'none';
        }
    }
    
    async logout() {
        try {
            const confirmLogout = confirm('Are you sure you want to logout?\n\nYou will need to sign in again to access the portal.');
            if (!confirmLogout) return;
            
            this.showToast('Logging out...', 'info', 1500);
            
            localStorage.removeItem(this.storageKey);
            localStorage.removeItem('userProfilePhoto');
            localStorage.removeItem('currentUserProfile');
            
            const keysToKeep = [];
            Object.keys(localStorage).forEach(key => {
                if (!keysToKeep.includes(key)) {
                    localStorage.removeItem(key);
                }
            });
            
            sessionStorage.clear();
            
            document.cookie.split(";").forEach(c => {
                document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
            });
            
            if (window.supabase) {
                await window.supabase.auth.signOut();
            } else if (window.db?.supabase) {
                await window.db.supabase.auth.signOut();
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            window.location.href = 'login.html';
            
        } catch (error) {
            console.error('Logout error:', error);
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 500);
        }
    }
    
    clearCache() {
        if (confirm('Clear all cached data?\n\nThis will not delete your account or personal data.')) {
            if ('caches' in window) {
                caches.keys().then(cacheNames => {
                    cacheNames.forEach(cacheName => {
                        caches.delete(cacheName);
                    });
                    this.showToast('Cache cleared successfully!', 'success');
                }).catch(error => {
                    this.showToast('Error clearing cache', 'error');
                });
            } else {
                this.showToast('Cache API not supported', 'warning');
            }
            
            const keysToKeep = ['nchsm_last_tab', 'userProfilePhoto', 'currentUserProfile'];
            const keysToRemove = [];
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (!keysToKeep.includes(key)) {
                    keysToRemove.push(key);
                }
            }
            
            keysToRemove.forEach(key => localStorage.removeItem(key));
            this.showToast('Local storage cleared', 'success');
        }
    }
    
    exportData() {
        this.showToast('Export feature coming soon', 'info');
    }
    
    showSystemInfo() {
        const info = {
            appVersion: 'v2.1',
            userAgent: navigator.userAgent,
            online: navigator.onLine,
            screenSize: `${window.innerWidth} x ${window.innerHeight}`,
            currentTab: this.currentTab,
            localStorageSize: `${JSON.stringify(localStorage).length} bytes`,
            currentUser: window.currentUserProfile?.full_name || 'Not logged in'
        };
        
        const infoText = `
            NCHSM Student Portal ${info.appVersion}
            
            Browser: ${info.userAgent}
            Online: ${info.online ? 'Yes' : 'No'}
            Screen: ${info.screenSize}
            Current Tab: ${info.currentTab}
            User: ${info.currentUser}
            Storage: ${info.localStorageSize}
            
            © 2026 Nakuru College of Health Sciences and Management
        `;
        
        alert(infoText);
    }
    
    initializeDateTime() {
        console.log('⏰ Initializing date/time...');
        
        const updateHeaderTime = () => {
            if (this.headerTime) {
                const now = new Date();
                const timeString = now.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                });
                this.headerTime.textContent = timeString;
            }
        };
        
        updateHeaderTime();
        setInterval(updateHeaderTime, 60000);
        
        const updateFullDateTime = () => {
            const dateTimeElement = document.getElementById('currentDateTime');
            if (dateTimeElement) {
                const now = new Date();
                dateTimeElement.textContent = now.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true
                });
            }
        };
        
        updateFullDateTime();
        setInterval(updateFullDateTime, 1000);
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
    
    forceShowTab(tabId) {
        console.log(`🚨 Force showing tab: ${tabId}`);
        
        this.tabs.forEach(tab => {
            tab.style.display = 'none';
            tab.classList.remove('active');
        });
        
        const selectedTab = document.getElementById(tabId);
        if (selectedTab) {
            selectedTab.style.display = 'block';
            selectedTab.classList.add('active');
        }
        
        this.navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-tab') === tabId) {
                link.classList.add('active');
            }
        });
        
        this.currentTab = tabId;
        this.updatePageTitle(tabId);
        
        console.log(`✅ Force show complete: ${tabId}`);
    }
}

// Create global instance
window.ui = new UIModule();

// Export functions to window for backward compatibility
window.toggleMenu = () => window.ui?.toggleMenu();
window.closeMenu = () => window.ui?.closeMenu();
window.showTab = (tabId) => window.ui?.showTab(tabId);
window.showToast = (message, type, duration) => window.ui?.showToast(message, type, duration);
window.logout = () => window.ui?.logout();
window.forceShowTab = (tabId) => window.ui?.forceShowTab(tabId);
window.refreshDashboard = () => window.ui?.refreshDashboard();

document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 DOM fully loaded');
    
    if (!window.ui) {
        window.ui = new UIModule();
    }
    
    setTimeout(() => {
        if (window.ui && window.currentUserId) {
            window.ui.updateAllUserInfo();
        }
    }, 1000);
});

document.addEventListener('appReady', function(e) {
    console.log('🎉 App ready event received', e.detail);
    
    if (window.ui && e.detail?.userProfile) {
        window.ui.updateAllUserInfo(e.detail.userProfile);
    }
});

document.addEventListener('profilePhotoUpdated', function(e) {
    console.log('📸 Profile photo updated event received', e.detail);
    if (window.ui && e.detail?.photoUrl) {
        localStorage.setItem('userProfilePhoto', e.detail.photoUrl);
        if (window.ui.headerProfilePhoto) {
            window.ui.headerProfilePhoto.src = e.detail.photoUrl;
        }
    }
});

document.addEventListener('userProfileUpdated', function(e) {
    console.log('👤 User profile updated event received', e.detail);
    if (window.ui && e.detail?.userProfile) {
        window.ui.updateAllUserInfo(e.detail.userProfile);
    }
});

window.debugUI = function() {
    console.log('🔍 UI Debug Info:');
    console.log('- Current tab:', window.ui?.currentTab);
    console.log('- Profile trigger:', !!window.ui?.profileTrigger);
    console.log('- Dropdown menu:', !!window.ui?.dropdownMenu);
    console.log('- Header photo:', window.ui?.headerProfilePhoto?.src);
    console.log('- Header name:', window.ui?.headerUserName?.textContent);
    console.log('- Current user ID:', window.currentUserId);
    console.log('- Current user profile:', window.currentUserProfile);
};

console.log('✅ UI Module loaded successfully with App-Style Loading');

window.addEventListener('load', function() {
    console.log('📱 Page fully loaded - checking dashboard...');
    
    setTimeout(() => {
        const dashboardTab = document.getElementById('dashboard');
        const isDashboardActive = dashboardTab && dashboardTab.classList.contains('active');
        
        if (!isDashboardActive && window.ui) {
            console.log('🎯 Dashboard not active - forcing it...');
            window.ui.showTab('dashboard');
        }
    }, 1000);
});

document.addEventListener('appReady', function() {
    console.log('🎉 App ready - ensuring dashboard is shown...');
    
    setTimeout(() => {
        if (window.ui) {
            window.ui.showTab('dashboard');
        }
    }, 500);
});
