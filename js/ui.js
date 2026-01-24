// js/ui.js - COMPLETE FIXED User Interface Management
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
        
        // Define tab paths (URLs without .html extension)
        this.tabPaths = {
            'dashboard': '/dashboard',
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
        
        // Profile dropdown elements - CRITICAL FIX
        this.profileTrigger = document.querySelector('.profile-trigger');
        this.dropdownMenu = document.querySelector('.dropdown-menu');
        
        // Log found elements
        console.log('📋 UI Elements found:');
        console.log('- Profile trigger:', !!this.profileTrigger);
        console.log('- Dropdown menu:', !!this.dropdownMenu);
        console.log('- Header user name:', !!this.headerUserName);
        console.log('- Header profile photo:', !!this.headerProfilePhoto);
        
        // Supabase client reference
        this.supabase = window.supabase || window.db?.supabase;
        
        // Initialize
        this.initialize();
    }
    
    async initialize() {
        console.log('🔧 Initializing UI...');
        
        // 1. Clean up styles FIRST
        this.cleanupInitialStyles();
        
        // 2. Setup all event listeners
        this.setupEventListeners();
        
        // 3. Setup navigation
        this.setupPathNavigation();
        this.setupTabChangeListener();
        
        // 4. Initialize utilities
        this.initializeDateTime();
        this.setupOfflineIndicator();
        this.setupMobileMenuVisibility();
        this.loadLastTab();
        
        // 5. Load initial user data
        await this.loadInitialUserData();
        
        console.log('✅ UIModule fully initialized');
    }
    
    // CRITICAL FIX: Remove all inline styles first
    cleanupInitialStyles() {
        console.log('🧹 Cleaning up initial styles...');
        
        // Remove all inline styles from tabs
        this.tabs.forEach(tab => {
            tab.style.removeProperty('display');
            tab.style.removeProperty('opacity');
            tab.style.removeProperty('visibility');
            tab.style.removeProperty('position');
            tab.classList.remove('active');
        });
        
        // Remove active class from all nav links
        this.navLinks.forEach(link => {
            link.classList.remove('active');
        });
        
        // Initialize dropdown menu properly
        if (this.dropdownMenu) {
            this.dropdownMenu.style.display = 'none'; // Start hidden
            this.dropdownMenu.classList.remove('show');
        }
        
        // Ensure sidebar starts closed on mobile
        if (window.innerWidth <= 768 && this.sidebar) {
            this.sidebar.classList.remove('active');
        }
        
        console.log('✅ Styles cleaned up');
    }
    
    // NEW: Setup path-based navigation instead of hash-based
    setupPathNavigation() {
        console.log('🔗 Setting up path navigation...');
        
        // Handle initial page load
        window.addEventListener('load', () => {
            const path = this.getCurrentPath();
            console.log('🔗 Current path:', path);
            
            // Determine tab from path
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
                    // Update URL to match the tab
                    this.updateURLForTab(tabId);
                } else {
                    console.log('🎯 Defaulting to dashboard');
                    tabId = 'dashboard';
                    this.showTab(tabId);
                    this.updateURLForTab(tabId);
                }
            }
        });
        
        // Handle browser back/forward buttons
        window.addEventListener('popstate', () => {
            const path = this.getCurrentPath();
            console.log('🔗 Popstate event, current path:', path);
            
            const tabId = this.getTabFromPath(path);
            if (tabId && this.isValidTab(tabId)) {
                console.log(`🎯 Popstate showing tab: ${tabId}`);
                this.showTab(tabId, true); // Pass true to indicate it's from popstate
                localStorage.setItem(this.storageKey, tabId);
            }
        });
    }
    
    // Get current path without hash
    getCurrentPath() {
        // Remove hash and query parameters
        let path = window.location.pathname;
        
        // Remove .html extension if present
        path = path.replace(/\.html$/, '');
        
        // Remove trailing slash
        path = path.replace(/\/$/, '');
        
        // Handle root path
        if (path === '' || path === '/index' || path === '/') {
            return '/dashboard';
        }
        
        return path;
    }
    
    // Get tab ID from path
    getTabFromPath(path) {
        // Remove leading slash
        const cleanPath = path.startsWith('/') ? path.substring(1) : path;
        
        // Find matching tab
        for (const [tabId, tabPath] of Object.entries(this.tabPaths)) {
            const cleanTabPath = tabPath.startsWith('/') ? tabPath.substring(1) : tabPath;
            if (cleanPath === cleanTabPath) {
                return tabId;
            }
        }
        
        // Try direct match with tab ID
        if (this.isValidTab(cleanPath)) {
            return cleanPath;
        }
        
        return null;
    }
    
    // Update URL for a tab
    updateURLForTab(tabId) {
        if (!this.isValidTab(tabId)) return;
        
        const path = this.tabPaths[tabId] || '/dashboard';
        const currentPath = this.getCurrentPath();
        const expectedPath = path.startsWith('/') ? path.substring(1) : path;
        const currentCleanPath = currentPath.startsWith('/') ? currentPath.substring(1) : currentPath;
        
        // Only update if current path doesn't match
        if (expectedPath !== currentCleanPath) {
            const newURL = `${window.location.origin}${path}`;
            console.log(`🔗 Updating URL to: ${newURL}`);
            
            // Use pushState to update URL without reload
            window.history.pushState({ tabId }, '', newURL);
        }
    }
    
    loadLastTab() {
        const lastTab = localStorage.getItem(this.storageKey);
        if (lastTab && this.isValidTab(lastTab)) {
            this.currentTab = lastTab;
        }
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
            this.updateURLForTab(tabId);
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
        
        // Navigation links - UPDATE: Use path navigation
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tabId = link.getAttribute('data-tab');
                console.log(`📱 Nav clicked: ${tabId}`);
                
                if (tabId) {
                    this.showTab(tabId);
                    this.closeMenu();
                }
            });
        });
        console.log(`✅ Added ${this.navLinks.length} nav link listeners`);
        
        // Header logout button - CRITICAL FIX
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
        
        // Setup profile dropdown - CRITICAL FIX
        this.setupProfileDropdown();
        
        // Dashboard card clicks
        setTimeout(() => {
            const cards = document.querySelectorAll('.stat-card[data-tab]');
            cards.forEach(card => {
                card.addEventListener('click', (e) => {
                    e.preventDefault();
                    const tabId = card.getAttribute('data-tab');
                    console.log(`📱 Card clicked: ${tabId}`);
                    
                    if (tabId) {
                        this.showTab(tabId);
                    }
                });
            });
            console.log(`✅ Added ${cards.length} card click listeners`);
        }, 1000);
        
        console.log('✅ All event listeners setup complete');
    }
    
    // FIXED PROFILE DROPDOWN - Works with your HTML
    setupProfileDropdown() {
        console.log('📋 Setting up profile dropdown...');
        
        if (!this.profileTrigger || !this.dropdownMenu) {
            console.error('❌ Profile dropdown elements not found!');
            console.log('- Profile trigger exists:', !!this.profileTrigger);
            console.log('- Dropdown menu exists:', !!this.dropdownMenu);
            return;
        }
        
        console.log('✅ Found dropdown elements');
        
        // CRITICAL: Remove inline style first
        this.dropdownMenu.style.display = 'none';
        
        // Add click handler to profile trigger
        this.profileTrigger.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('👤 Profile dropdown clicked');
            
            // Toggle dropdown visibility
            const isVisible = this.dropdownMenu.style.display === 'block';
            this.dropdownMenu.style.display = isVisible ? 'none' : 'block';
            
            // Rotate arrow icon
            const arrow = this.profileTrigger.querySelector('.dropdown-icon');
            if (arrow) {
                arrow.style.transform = isVisible ? 'rotate(0deg)' : 'rotate(180deg)';
                arrow.style.transition = 'transform 0.3s ease';
            }
            
            console.log(`📋 Dropdown ${isVisible ? 'hidden' : 'shown'}`);
        });
        
        // Close dropdown when clicking elsewhere
        document.addEventListener('click', (e) => {
            if (!this.profileTrigger.contains(e.target) && !this.dropdownMenu.contains(e.target)) {
                this.dropdownMenu.style.display = 'none';
                
                // Reset arrow rotation
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
                
                // Reset arrow
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
    
    // ... [rest of the methods remain the same] ...
    
    // Force show tab (emergency fallback)
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

// Event listeners for user updates
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 DOM fully loaded');
    
    // Ensure UI is ready
    if (!window.ui) {
        window.ui = new UIModule();
    }
    
    // Load user data after a short delay
    setTimeout(() => {
        if (window.ui && window.currentUserId) {
            window.ui.updateAllUserInfo();
        }
    }, 1000);
});

// Listen for app ready event
document.addEventListener('appReady', function(e) {
    console.log('🎉 App ready event received', e.detail);
    
    if (window.ui && e.detail?.userProfile) {
        window.ui.updateAllUserInfo(e.detail.userProfile);
    }
});

// Listen for profile photo updates
document.addEventListener('profilePhotoUpdated', function(e) {
    console.log('📸 Profile photo updated event received', e.detail);
    if (window.ui && e.detail?.photoUrl) {
        localStorage.setItem('userProfilePhoto', e.detail.photoUrl);
        if (window.ui.headerProfilePhoto) {
            window.ui.headerProfilePhoto.src = e.detail.photoUrl;
        }
    }
});

// Listen for user profile updates
document.addEventListener('userProfileUpdated', function(e) {
    console.log('👤 User profile updated event received', e.detail);
    if (window.ui && e.detail?.userProfile) {
        window.ui.updateAllUserInfo(e.detail.userProfile);
    }
});

// Debug helper
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

console.log('✅ UI Module loaded successfully');

// Add this at the VERY END of your ui.js file:
// Force dashboard to load on first app start
window.addEventListener('load', function() {
    console.log('📱 Page fully loaded - checking dashboard...');
    
    // Wait for everything to settle
    setTimeout(() => {
        const dashboardTab = document.getElementById('dashboard');
        const isDashboardActive = dashboardTab && dashboardTab.classList.contains('active');
        
        if (!isDashboardActive && window.ui) {
            console.log('🎯 Dashboard not active - forcing it...');
            window.ui.showTab('dashboard');
        }
    }, 1000);
});

// Also force dashboard when appReady event fires
document.addEventListener('appReady', function() {
    console.log('🎉 App ready - ensuring dashboard is shown...');
    
    setTimeout(() => {
        if (window.ui) {
            window.ui.showTab('dashboard');
        }
    }, 500);
});
