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
        this.dropdownLogoutBtn = null; // NEW: Specific reference to logout button
        
        // Loading screen elements
        this.loadingScreen = document.getElementById('loading-screen');
        this.progressFill = document.getElementById('progress-fill');
        this.progressText = document.getElementById('progress-text');
        this.statusSteps = document.getElementById('status-steps');
        this.funFact = document.getElementById('fun-fact');
        
        // Supabase client reference
        this.supabase = window.supabase || window.db?.supabase;
        
        // Initialize
        setTimeout(() => this.delayedInitialize(), 100);
    }
    
    delayedInitialize() {
        console.log('🕐 Delayed initialization starting...');
        
        // Try to get Supabase client from multiple sources
        this.supabase = window.supabase || 
                        (window.db && window.db.supabase) || 
                        (window.databaseModule && window.databaseModule.supabase);
        
        if (!this.supabase) {
            console.warn('⚠️ Supabase client not yet available, will retry');
            setTimeout(() => this.initialize(), 500);
        } else {
            this.initialize();
        }
    }
    
    async initialize() {
        console.log('🔧 Initializing UI...');
        
        // Step 1: Start loading
        this.setupAppLoading();
        this.updateLoadingProgress(0, 5);
        
        // Step 2: Clean up styles
        await this.delay(300);
        this.cleanupInitialStyles();
        this.updateLoadingProgress(1, 5);
        
        // Step 3: Setup event listeners (including dropdown)
        await this.delay(300);
        this.setupEventListeners();
        this.setupProfileDropdown(); // Setup dropdown here
        this.updateLoadingProgress(2, 5);
        
        // Step 4: Setup URL navigation
        await this.delay(400);
        this.setupUrlNavigation();
        this.setupTabChangeListener();
        this.updateLoadingProgress(3, 5);
        
        // Step 5: Initialize utilities
        await this.delay(300);
        this.initializeDateTime();
        this.setupOfflineIndicator();
        this.setupMobileMenuVisibility();
        this.loadLastTab();
        this.updateLoadingProgress(4, 5);
        
        // Step 6: Load user data
        await this.delay(500);
        await this.loadInitialUserData();
        this.updateLoadingProgress(5, 5);
        
        // Step 7: Hide loading screen
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
            this.loadingScreen.querySelector('.loading-container')?.appendChild(versionEl);
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
        
        // Get fresh dropdown elements
        this.profileTrigger = document.querySelector('.profile-trigger');
        this.dropdownMenu = document.querySelector('.dropdown-menu');
        
        if (this.dropdownMenu) {
            this.dropdownMenu.style.display = 'none';
            this.dropdownMenu.classList.remove('show');
        }
        
        if (window.innerWidth <= 768 && this.sidebar) {
            this.sidebar.classList.remove('active');
        }
        
        console.log('✅ Styles cleaned up');
    }
    
    // FIXED: Simplified URL navigation
    setupUrlNavigation() {
        console.log('🔗 Setting up URL navigation...');
        
        // Always use hash-based for consistency
        console.log('🔗 Using hash-based navigation');
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
        
        // Listen for hash changes
        window.addEventListener('hashchange', handleHashChange);
        
        // Handle initial load
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
    
    // FIXED: Complete event listeners setup
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
        
        // Header logout button (top-right in header)
        if (this.headerLogout) {
            console.log('🔐 Header logout button found');
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
            console.log(`✅ Added ${cards.length} card click listeners`);
        }, 1000);
        
        console.log('✅ All event listeners setup complete');
    }
    
    // FIXED: Profile dropdown with working logout
    setupProfileDropdown() {
        console.log('🎯 Setting up profile dropdown...');
        
        setTimeout(() => {
            // Find dropdown elements
            this.findDropdownElements();
            
            if (!this.profileTrigger || !this.dropdownMenu) {
                console.error('❌ Dropdown elements not found after search');
                return;
            }
            
            console.log('✅ Dropdown elements found:', {
                trigger: this.profileTrigger.tagName,
                menu: this.dropdownMenu.tagName,
                menuChildren: this.dropdownMenu.children.length
            });
            
            // Set initial state
            this.dropdownMenu.style.display = 'none';
            
            // FIXED: Profile trigger click handler
            this.profileTrigger.addEventListener('click', (e) => {
                console.log('👤 Profile trigger clicked');
                e.preventDefault();
                e.stopPropagation();
                
                const isVisible = this.dropdownMenu.style.display === 'block';
                
                if (isVisible) {
                    this.dropdownMenu.style.display = 'none';
                    console.log('📋 Dropdown hidden');
                } else {
                    this.dropdownMenu.style.display = 'block';
                    console.log('📋 Dropdown shown');
                }
                
                // Toggle arrow rotation if exists
                const arrow = this.profileTrigger.querySelector('.dropdown-icon, .fa-chevron-down');
                if (arrow) {
                    arrow.style.transform = isVisible ? 'rotate(0deg)' : 'rotate(180deg)';
                }
            });
            
            // FIXED: Setup dropdown menu items
            this.setupDropdownMenuItems();
            
            // FIXED: Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!this.profileTrigger.contains(e.target) && 
                    !this.dropdownMenu.contains(e.target)) {
                    this.dropdownMenu.style.display = 'none';
                    
                    const arrow = this.profileTrigger.querySelector('.dropdown-icon, .fa-chevron-down');
                    if (arrow) {
                        arrow.style.transform = 'rotate(0deg)';
                    }
                }
            });
            
            console.log('✅ Profile dropdown setup complete');
            
        }, 500); // Delay to ensure DOM is ready
    }
    
    findDropdownElements() {
        // Try multiple selectors
        const triggerSelectors = [
            '.profile-trigger',
            '.header-profile',
            '.user-profile',
            '[data-profile]',
            '.header-user',
            '.user-menu-trigger'
        ];
        
        const menuSelectors = [
            '.dropdown-menu',
            '.profile-dropdown',
            '.user-dropdown',
            '.menu-dropdown',
            '[data-dropdown]',
            '.dropdown-content'
        ];
        
        // Find trigger
        for (const selector of triggerSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                this.profileTrigger = element;
                console.log(`🔍 Found profile trigger with: ${selector}`);
                break;
            }
        }
        
        // Find menu
        for (const selector of menuSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                this.dropdownMenu = element;
                console.log(`🔍 Found dropdown menu with: ${selector}`);
                break;
            }
        }
    }
    
    setupDropdownMenuItems() {
        if (!this.dropdownMenu) return;
        
        console.log('🔧 Setting up dropdown menu items...');
        
        // Find all links/buttons in dropdown
        const menuItems = this.dropdownMenu.querySelectorAll('a, button, [data-action]');
        
        menuItems.forEach((item, index) => {
            console.log(`📋 Menu item ${index + 1}:`, {
                text: item.textContent.trim(),
                tag: item.tagName,
                id: item.id,
                classes: item.className
            });
            
            // Check if this is a logout button
            if (item.textContent.toLowerCase().includes('logout') || 
                item.id.includes('logout') || 
                item.className.includes('logout') ||
                item.getAttribute('data-action') === 'logout') {
                
                console.log('🔐 Found logout item in dropdown');
                
                // Remove any existing listeners
                const newItem = item.cloneNode(true);
                item.parentNode.replaceChild(newItem, item);
                
                // Add logout listener
                newItem.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🔐 Dropdown logout clicked');
                    this.logout();
                });
                
                this.dropdownLogoutBtn = newItem;
            }
            
            // Check if this is a profile link
            else if (item.textContent.toLowerCase().includes('profile') || 
                     item.id.includes('profile') || 
                     item.className.includes('profile') ||
                     item.getAttribute('data-tab') === 'profile') {
                
                console.log('👤 Found profile item in dropdown');
                
                // Remove any existing listeners
                const newItem = item.cloneNode(true);
                item.parentNode.replaceChild(newItem, item);
                
                // Add profile listener
                newItem.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('👤 Dropdown profile clicked');
                    this.showTab('profile');
                    this.dropdownMenu.style.display = 'none';
                });
            }
        });
        
        console.log(`✅ Setup ${menuItems.length} dropdown menu items`);
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
        
        await this.delay(500); // Wait for user data to be ready
        
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
                const dbUserData = await this.loadUserFromDatabase(userId);
                if (dbUserData) {
                    this.updateAllUserInfo(dbUserData);
                } else if (userProfile) {
                    this.updateAllUserInfo(userProfile);
                } else {
                    this.updateDefaultUserInfo();
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
        try {
            if (!this.supabase || typeof this.supabase.from !== 'function') {
                console.warn('⚠️ Supabase client not available');
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
            }
            
            if (!photoUrl && window.currentUserId && this.supabase) {
                try {
                    photoUrl = await this.getProfilePhotoFromDatabase(window.currentUserId);
                } catch (error) {
                    console.log('📸 Database photo fetch failed');
                }
            }
            
            if (!photoUrl && userProfile?.full_name) {
                const nameForAvatar = userProfile.full_name.replace(/\s+/g, '+');
                photoUrl = `https://ui-avatars.com/api/?name=${nameForAvatar}&background=667eea&color=fff&size=100`;
            }
            
            if (!photoUrl) {
                photoUrl = 'https://ui-avatars.com/api/?name=Student&background=667eea&color=fff&size=100';
            }
            
            console.log('📸 Final photo URL:', photoUrl);
            
            this.headerProfilePhoto.src = photoUrl;
            this.headerProfilePhoto.onerror = () => {
                console.error('❌ Failed to load profile photo');
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
    
    async getProfilePhotoFromDatabase(userId) {
        if (!this.supabase || typeof this.supabase.from !== 'function') {
            return null;
        }
        
        try {
            const { data: userProfile, error } = await this.supabase
                .from('consolidated_user_profiles_table')
                .select('passport_url, full_name')
                .or(`id.eq.${userId},user_id.eq.${userId}`)
                .maybeSingle();
            
            if (error || !userProfile) return null;
            
            if (userProfile.passport_url && userProfile.passport_url.trim() !== '') {
                return userProfile.passport_url;
            }
            
            const nameForAvatar = userProfile.full_name?.replace(/\s+/g, '+') || 'Student';
            return `https://ui-avatars.com/api/?name=${nameForAvatar}&background=667eea&color=fff&size=100`;
            
        } catch (error) {
            return null;
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
            
            // Clear all storage
            localStorage.removeItem(this.storageKey);
            localStorage.removeItem('userProfilePhoto');
            localStorage.removeItem('currentUserProfile');
            
            // Keep only essential keys if needed
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (!key.includes('nchsm_keep')) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
            
            sessionStorage.clear();
            
            // Clear cookies
            document.cookie.split(";").forEach(c => {
                document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
            });
            
            // Sign out from Supabase
            if (this.supabase && this.supabase.auth) {
                await this.supabase.auth.signOut();
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
        console.log('- Dropdown items:', this.dropdownMenu?.children.length || 0);
        
        // Log dropdown menu structure
        if (this.dropdownMenu) {
            console.log('📋 Dropdown menu structure:');
            Array.from(this.dropdownMenu.children).forEach((child, i) => {
                console.log(`  ${i + 1}. ${child.tagName} ${child.textContent.trim()}`);
            });
        }
    }
}

// Create global instance
window.ui = new UIModule();

// Export functions to window
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
    
    setTimeout(() => {
        if (window.ui && window.currentUserId) {
            window.ui.updateAllUserInfo();
        }
    }, 1000);
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
