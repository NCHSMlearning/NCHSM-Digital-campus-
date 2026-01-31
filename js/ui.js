// js/ui.js - COMPLETE FIXED VERSION
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
        
        // Store tab state
        this.storageKey = 'nchsm_last_tab';
        
        // Define valid tabs
        this.validTabs = [
            'dashboard', 'profile', 'calendar', 'courses', 
            'attendance', 'cats', 'resources', 'messages', 
            'support-tickets', 'nurseiq'
        ];
        
        // Define clean URL paths
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
        
        // Reverse lookup
        this.pathToTab = {};
        for (const [tabId, path] of Object.entries(this.tabPaths)) {
            this.pathToTab[path] = tabId;
        }
        
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
        this.profileTrigger = null;
        this.dropdownMenu = null;
        this.dropdownLogoutBtn = null;
        
        // Loading screen elements
        this.loadingScreen = document.getElementById('loading-screen');
        this.progressFill = document.getElementById('progress-fill');
        this.progressText = document.getElementById('progress-text');
        this.statusSteps = document.getElementById('status-steps');
        this.funFact = document.getElementById('fun-fact');
        
        // Supabase client reference
        this.supabase = null;
        
        // Initialize with delay
        setTimeout(() => this.safeInitialize(), 500);
    }
    
    async safeInitialize() {
        console.log('🛡️ Safe initialization starting...');
        
        // Wait for database module
        await this.waitForDatabase();
        
        // Get Supabase client
        this.supabase = this.getSupabaseClient();
        
        if (!this.supabase) {
            console.warn('⚠️ Supabase client not available, using limited mode');
        }
        
        // Initialize
        this.initialize();
    }
    
    async waitForDatabase() {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 10;
            
            const checkDb = () => {
                attempts++;
                const hasDb = window.supabase || 
                             (window.db && window.db.supabase) ||
                             (window.databaseModule && window.databaseModule.supabase);
                
                if (hasDb || attempts >= maxAttempts) {
                    resolve();
                } else {
                    setTimeout(checkDb, 300);
                }
            };
            
            checkDb();
        });
    }
    
    getSupabaseClient() {
        if (window.supabase && typeof window.supabase.from === 'function') {
            return window.supabase;
        }
        
        if (window.db && window.db.supabase && typeof window.db.supabase.from === 'function') {
            return window.db.supabase;
        }
        
        if (window.databaseModule && window.databaseModule.supabase && typeof window.databaseModule.supabase.from === 'function') {
            return window.databaseModule.supabase;
        }
        
        console.warn('❌ No valid Supabase client found');
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
        this.setupProfileDropdown(); // FIXED DROPDOWN
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
            const container = this.loadingScreen.querySelector('.loading-container');
            if (container) {
                container.appendChild(versionEl);
            }
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
        
        this.navLinks.forEach(link => {
            link.classList.remove('active');
        });
        
        if (window.innerWidth <= 768 && this.sidebar) {
            this.sidebar.classList.remove('active');
        }
        
        console.log('✅ Styles cleaned up');
    }
    
    setupUrlNavigation() {
        console.log('🔗 Setting up URL navigation...');
        this.setupHashNavigation();
    }
    
    setupHashNavigation() {
        console.log('🔗 Setting up hash-based navigation...');
        
        const handleHashChange = () => {
            const hash = window.location.hash.replace('#', '');
            console.log('🔗 Hash changed:', hash || '(empty)');
            
            let tabId = hash || 'dashboard';
            
            if (this.isValidTab(tabId)) {
                console.log(`🎯 Showing tab from hash: ${tabId}`);
                this.showTab(tabId, true);
            } else {
                console.warn(`⚠️ Invalid tab in hash: ${tabId}`);
                tabId = 'dashboard';
                if (window.location.hash !== '#dashboard') {
                    window.location.hash = '#dashboard';
                }
                this.showTab(tabId, true);
            }
            
            localStorage.setItem(this.storageKey, tabId);
        };
        
        window.addEventListener('hashchange', handleHashChange);
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', handleHashChange);
        } else {
            setTimeout(handleHashChange, 500);
        }
        
        // Override showTab to update hash
        const originalShowTab = this.showTab.bind(this);
        this.showTab = function(tabId, fromNavigation = false) {
            if (this.currentTab === tabId) return;
            
            originalShowTab(tabId, fromNavigation);
            
            if (!fromNavigation) {
                const newHash = tabId === 'dashboard' ? '' : `#${tabId}`;
                if (window.location.hash !== newHash) {
                    console.log(`🔗 Updating hash to: ${newHash}`);
                    window.location.hash = newHash;
                }
            }
        }.bind(this);
    }
    
    setupEventListeners() {
        console.log('🔧 Setting up event listeners...');
        
        // Mobile menu toggle
        if (this.mobileMenuToggle) {
            this.mobileMenuToggle.addEventListener('click', () => this.toggleMenu());
        }
        
        // Overlay click to close menu
        if (this.overlay) {
            this.overlay.addEventListener('click', () => this.closeMenu());
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
        
        // Header logout button
        if (this.headerLogout) {
            this.headerLogout.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('🔐 Header logout clicked');
                this.logout();
            });
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
        }, 1000);
        
        console.log('✅ All event listeners setup complete');
    }
    
    // ===== FIXED DROPDOWN METHOD =====
    setupProfileDropdown() {
        console.log('🎯 Setting up profile dropdown (FIXED)...');
        
        setTimeout(() => {
            // Find elements
            this.findDropdownElements();
            
            if (!this.profileTrigger || !this.dropdownMenu) {
                console.error('❌ Dropdown elements not found');
                return;
            }
            
            console.log('✅ Found dropdown elements');
            
            // 1. Remove problematic CSS hover effects
            this.removeProblematicCSS();
            
            // 2. Clone to remove existing listeners
            const cleanTrigger = this.profileTrigger.cloneNode(true);
            const cleanMenu = this.dropdownMenu.cloneNode(true);
            
            this.profileTrigger.parentNode.replaceChild(cleanTrigger, this.profileTrigger);
            this.dropdownMenu.parentNode.replaceChild(cleanMenu, this.dropdownMenu);
            
            this.profileTrigger = cleanTrigger;
            this.dropdownMenu = cleanMenu;
            
            // 3. Set initial state - HIDDEN
            this.dropdownMenu.style.display = 'none';
            
            // 4. Apply styling for visibility
            this.applyDropdownStyles();
            
            // 5. Setup click handler (SINGLE - no conflicts)
            this.setupDropdownClickHandler();
            
            // 6. Setup menu items
            this.setupDropdownMenuItems();
            
            // 7. Close on click outside
            this.setupDropdownCloseHandler();
            
            console.log('✅ Dropdown setup complete - Should work properly now');
            
        }, 1000);
    }
    
    removeProblematicCSS() {
        // Create and immediately remove style to override hover effects
        const style = document.createElement('style');
        style.textContent = `
            /* Cancel all problematic hover effects */
            .user-profile-dropdown:hover .dropdown-menu,
            .profile-trigger:hover ~ .dropdown-menu,
            [class*="dropdown"]:hover [class*="menu"],
            .dropdown-menu:hover {
                display: none !important;
            }
            
            /* Make text visible */
            .dropdown-menu a {
                color: #000000 !important;
            }
            
            .dropdown-menu #header-logout {
                color: #ef4444 !important;
            }
        `;
        document.head.appendChild(style);
        setTimeout(() => style.remove(), 100);
    }
    
    applyDropdownStyles() {
        // Apply guaranteed visible styling
        Object.assign(this.dropdownMenu.style, {
            position: 'absolute',
            top: '50px',
            right: '0',
            background: 'white',
            border: '2px solid #4C1D95',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            minWidth: '200px',
            zIndex: '1001',
            padding: '0',
            opacity: '1',
            visibility: 'visible'
        });
        
        // Ensure all text is visible
        const allElements = this.dropdownMenu.querySelectorAll('*');
        allElements.forEach(el => {
            if (el.tagName === 'A' || el.tagName === 'SPAN' || el.tagName === 'DIV') {
                el.style.color = el.id === 'header-logout' ? '#ef4444' : '#000000';
            }
        });
    }
    
    setupDropdownClickHandler() {
        // Remove all existing handlers by replacing element
        const newTrigger = this.profileTrigger.cloneNode(true);
        this.profileTrigger.parentNode.replaceChild(newTrigger, this.profileTrigger);
        this.profileTrigger = newTrigger;
        
        // Add SINGLE clean handler
        this.profileTrigger.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            console.log('🎯 DROPDOWN CLICK - Toggling');
            
            if (this.dropdownMenu.style.display === 'block') {
                this.dropdownMenu.style.display = 'none';
                console.log('📋 Hidden');
            } else {
                this.dropdownMenu.style.display = 'block';
                console.log('📋 Shown');
            }
            
            return false;
        }, true);
    }
    
    setupDropdownCloseHandler() {
        document.addEventListener('click', (e) => {
            if (this.dropdownMenu.style.display === 'block' &&
                !this.profileTrigger.contains(e.target) && 
                !this.dropdownMenu.contains(e.target)) {
                
                this.dropdownMenu.style.display = 'none';
                console.log('📋 Closed (clicked outside)');
            }
        });
    }
    
    findDropdownElements() {
        // Find trigger
        const triggerSelectors = [
            '.profile-trigger',
            '.header-profile',
            '.user-profile',
            '[data-profile]',
            '.header-user',
            '.user-menu-trigger'
        ];
        
        // Find menu
        const menuSelectors = [
            '.dropdown-menu',
            '.profile-dropdown',
            '.user-dropdown',
            '.menu-dropdown',
            '[data-dropdown]',
            '.dropdown-content'
        ];
        
        for (const selector of triggerSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                this.profileTrigger = element;
                break;
            }
        }
        
        for (const selector of menuSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                this.dropdownMenu = element;
                break;
            }
        }
    }
    
    setupDropdownMenuItems() {
        if (!this.dropdownMenu) return;
        
        console.log('🔧 Setting up dropdown menu items...');
        
        const menuItems = this.dropdownMenu.querySelectorAll('a, button, [data-action]');
        
        menuItems.forEach((item, index) => {
            const text = item.textContent?.trim() || '';
            const tag = item.tagName;
            const id = item.id || '';
            
            console.log(`📋 Menu item ${index + 1}:`, { text, tag, id });
            
            // Clone to remove existing listeners
            const cleanItem = item.cloneNode(true);
            item.parentNode.replaceChild(cleanItem, item);
            
            // Setup click handlers
            cleanItem.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (text.toLowerCase().includes('logout') || id.includes('logout')) {
                    console.log('🔐 Logout clicked');
                    this.dropdownMenu.style.display = 'none';
                    this.logout();
                } else if (text.toLowerCase().includes('profile') || id.includes('profile')) {
                    console.log('👤 Profile clicked');
                    this.dropdownMenu.style.display = 'none';
                    this.showTab('profile');
                } else {
                    console.log(`📋 "${text}" clicked`);
                    this.dropdownMenu.style.display = 'none';
                }
            });
            
            if (id === 'header-logout') {
                this.dropdownLogoutBtn = cleanItem;
            }
        });
        
        console.log(`✅ Setup ${menuItems.length} menu items`);
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
                    } else if (window.profileModule && window.profileModule.loadProfileData) {
                        window.profileModule.loadProfileData();
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
        
        await this.delay(1000);
        
        try {
            const userId = window.currentUserId || 
                          (window.db && window.db.currentUserId) ||
                          (window.databaseModule && window.databaseModule.currentUserId);
            
            const userProfile = window.currentUserProfile || 
                               (window.db && window.db.currentUserProfile) ||
                               (window.databaseModule && window.databaseModule.currentUserProfile);
            
            console.log('👤 User data sources:', { 
                userId: userId ? 'found' : 'not found',
                userProfile: userProfile ? 'found' : 'not found'
            });
            
            if (userId && this.supabase) {
                try {
                    const dbUserData = await this.loadUserFromDatabase(userId);
                    if (dbUserData) {
                        this.updateAllUserInfo(dbUserData);
                    } else if (userProfile) {
                        this.updateAllUserInfo(userProfile);
                    } else {
                        this.updateDefaultUserInfo();
                    }
                } catch (dbError) {
                    console.warn('⚠️ Database load failed, using cached data');
                    if (userProfile) {
                        this.updateAllUserInfo(userProfile);
                    } else {
                        this.updateDefaultUserInfo();
                    }
                }
            } else if (userProfile) {
                this.updateAllUserInfo(userProfile);
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
        
        if (this.headerUserName) {
            this.headerUserName.textContent = defaultName;
        }
        
        if (this.headerProfilePhoto) {
            this.headerProfilePhoto.src = 'https://ui-avatars.com/api/?name=Student&background=667eea&color=fff&size=100';
        }
        
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
                console.log('✅ User data loaded from database:', {
                    id: userProfile.id,
                    name: userProfile.full_name,
                    studentId: userProfile.student_id
                });
                
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
            let profile = userProfile || window.currentUserProfile || window.db?.currentUserProfile;
            
            if (!profile && window.currentUserId) {
                profile = await this.loadUserFromDatabase(window.currentUserId);
            }
            
            if (!profile) {
                console.warn('⚠️ No user profile available');
                this.updateDefaultUserInfo();
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
            this.updateDefaultUserInfo();
        }
    }
    
    async updateProfilePhoto(userProfile = null) {
        console.log('📸 Updating profile photo...');
        
        if (!this.headerProfilePhoto) {
            console.error('❌ Header profile photo element not found!');
            return;
        }
        
        try {
            let photoUrl = localStorage.getItem('userProfilePhoto');
            
            if (!photoUrl && userProfile?.passport_url) {
                photoUrl = userProfile.passport_url;
                console.log('📸 Using passport_url from profile');
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
                this.headerProfilePhoto.src = 'https://ui-avatars.com/api/?name=Student&background=667eea&color=fff&size=100';
                localStorage.setItem('userProfilePhoto', this.headerProfilePhoto.src);
            };
            
            localStorage.setItem('userProfilePhoto', photoUrl);
            
            console.log('✅ Profile photo updated');
            
        } catch (error) {
            console.error('❌ Error updating profile photo:', error);
            this.headerProfilePhoto.src = 'https://ui-avatars.com/api/?name=Student&background=667eea&color=fff&size=100';
        }
    }
    
    showTab(tabId, fromNavigation = false) {
        console.log(`📱 showTab(${tabId}, fromNavigation: ${fromNavigation})`);
        
        if (!this.isValidTab(tabId)) {
            console.warn(`⚠️ Invalid tab: ${tabId}, defaulting to dashboard`);
            tabId = 'dashboard';
        }
        
        if (this.currentTab === tabId) {
            console.log(`⚠️ Tab ${tabId} is already active`);
            return;
        }
        
        // Hide all tabs
        this.tabs.forEach(tab => {
            tab.style.display = 'none';
            tab.classList.remove('active');
        });
        
        // Show selected tab
        const selectedTab = document.getElementById(tabId);
        if (selectedTab) {
            selectedTab.style.display = 'block';
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
        
        // Save state
        localStorage.setItem(this.storageKey, tabId);
        this.closeMenu();
        
        // Dispatch event
        const previousTab = this.currentTab;
        this.currentTab = tabId;
        
        window.dispatchEvent(new CustomEvent('tabChanged', { 
            detail: { 
                tabId, 
                previousTab,
                fromNavigation
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
    
    isValidTab(tabId) {
        return this.validTabs.includes(tabId);
    }
    
    getCurrentPath() {
        let path = window.location.pathname;
        path = path.replace(/\.html$/, '');
        path = path.replace(/\/$/, '');
        if (path === '' || path === '/index') {
            path = '/';
        }
        if (!path.startsWith('/')) {
            path = '/' + path;
        }
        return path;
    }
    
    loadLastTab() {
        const lastTab = localStorage.getItem(this.storageKey);
        if (lastTab && this.isValidTab(lastTab)) {
            this.currentTab = lastTab;
        }
    }
    
    async logout() {
        try {
            const confirmLogout = confirm('Are you sure you want to logout?\n\nYou will need to sign in again to access the portal.');
            if (!confirmLogout) return;
            
            this.showToast('Logging out...', 'info', 1500);
            
            // Clear storage
            localStorage.removeItem(this.storageKey);
            localStorage.removeItem('userProfilePhoto');
            localStorage.removeItem('currentUserProfile');
            
            // Clear all localStorage except config
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (!key.startsWith('nchsm_config')) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
            
            sessionStorage.clear();
            
            // Clear cookies
            document.cookie.split(";").forEach(c => {
                document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
            });
            
            // Sign out from Supabase if available
            if (this.supabase && this.supabase.auth) {
                try {
                    await this.supabase.auth.signOut();
                } catch (authError) {
                    console.warn('⚠️ Supabase signout failed:', authError.message);
                }
            }
            
            await this.delay(1000);
            
            // Redirect to login
            window.location.href = 'login.html';
            
        } catch (error) {
            console.error('Logout error:', error);
            this.showToast('Logout failed, redirecting...', 'error');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1000);
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
            }
            
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
    
    debugAll() {
        console.log('🔍 UI DEBUG INFO:');
        console.log('- Current tab:', this.currentTab);
        console.log('- Profile trigger:', !!this.profileTrigger);
        console.log('- Dropdown menu:', !!this.dropdownMenu);
        console.log('- Dropdown display:', this.dropdownMenu?.style.display);
        console.log('- URL path:', this.getCurrentPath());
        console.log('- URL hash:', window.location.hash);
        console.log('- Current user ID:', window.currentUserId);
    }
}

// Create global instance
window.ui = new UIModule();

// Export functions
window.toggleMenu = () => window.ui?.toggleMenu?.();
window.closeMenu = () => window.ui?.closeMenu?.();
window.showTab = (tabId) => window.ui?.showTab?.(tabId);
window.showToast = (message, type, duration) => window.ui?.showToast?.(message, type, duration);
window.logout = () => window.ui?.logout?.();
window.forceShowTab = (tabId) => window.ui?.forceShowTab?.(tabId);
window.refreshDashboard = () => window.ui?.refreshDashboard?.();
window.debugUI = () => window.ui?.debugAll?.();

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 DOM fully loaded');
    
    if (!window.ui) {
        window.ui = new UIModule();
    }
});

document.addEventListener('appReady', function(e) {
    console.log('🎉 App ready event received');
    
    if (window.ui && e.detail?.userProfile) {
        window.ui.updateAllUserInfo(e.detail.userProfile);
    }
});

document.addEventListener('profilePhotoUpdated', function(e) {
    console.log('📸 Profile photo updated event received');
    if (window.ui && e.detail?.photoUrl) {
        localStorage.setItem('userProfilePhoto', e.detail.photoUrl);
        if (window.ui.headerProfilePhoto) {
            window.ui.headerProfilePhoto.src = e.detail.photoUrl;
        }
    }
});

document.addEventListener('userProfileUpdated', function(e) {
    console.log('👤 User profile updated event received');
    if (window.ui && e.detail?.userProfile) {
        window.ui.updateAllUserInfo(e.detail.userProfile);
    }
});

console.log('✅ UI Module loaded successfully');

// Emergency dashboard loader
window.addEventListener('load', function() {
    console.log('📱 Page fully loaded');
    
    setTimeout(() => {
        const dashboardTab = document.getElementById('dashboard');
        const isDashboardActive = dashboardTab && dashboardTab.classList.contains('active');
        
        if (!isDashboardActive && window.ui) {
            console.log('🎯 Dashboard not active - ensuring it loads...');
            window.ui.showTab('dashboard');
        }
    }, 1500);
});
