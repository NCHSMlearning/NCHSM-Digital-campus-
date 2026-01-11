// js/ui.js - User Interface Management
class UIModule {
    constructor() {
        this.sidebar = document.getElementById('sidebar');
        this.overlay = document.getElementById('overlay');
        this.mobileMenuToggle = document.getElementById('mobile-menu-toggle'); // FIXED: Changed from menuToggle
        this.navLinks = document.querySelectorAll('.nav a');
        this.tabs = document.querySelectorAll('.tab-content');
        this.toast = document.getElementById('toast');
        this.logoutBtn = document.getElementById('logoutBtn');
        this.headerLogout = document.getElementById('header-logout'); // NEW: Header logout button
        this.currentTab = 'dashboard';
        
        // Store tab state in localStorage for persistence
        this.storageKey = 'nchsm_last_tab';
        
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
        
        // Initialize
        this.initialize();
    }
    
    initialize() {
        this.setupEventListeners();
        this.setupHashNavigation();
        this.setupTabChangeListener();
        this.initializeDateTime();
        this.setupOfflineIndicator();
        this.setupMobileMenuVisibility(); // NEW: Control mobile menu visibility
        this.loadLastTab();
        this.fixInitialDisplay();
    }
    
    // FIXED: Ensure proper initial display WITHOUT inline styles
    fixInitialDisplay() {
        // Remove all inline styles first
        this.tabs.forEach(tab => {
            tab.style.removeProperty('display');
            tab.classList.remove('active');
        });
        
        // Show dashboard by default - CSS will handle display via .active class
        const dashboardTab = document.getElementById('dashboard');
        if (dashboardTab) {
            dashboardTab.classList.add('active');
        }
        
        // Set active nav link
        this.navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-tab') === 'dashboard') {
                link.classList.add('active');
            }
        });
    }
    
    // NEW: Setup mobile menu toggle visibility
    setupMobileMenuVisibility() {
        if (!this.mobileMenuToggle) return;
        
        const updateVisibility = () => {
            if (window.innerWidth <= 768) {
                this.mobileMenuToggle.style.display = 'flex';
            } else {
                this.mobileMenuToggle.style.display = 'none';
                this.closeMenu(); // Ensure menu is closed on desktop
            }
        };
        
        // Initial check
        updateVisibility();
        
        // Update on resize
        window.addEventListener('resize', updateVisibility);
    }
    
    setupHashNavigation() {
        // Handle initial page load
        window.addEventListener('load', () => {
            // First check URL hash
            const hash = window.location.hash.substring(1);
            
            // If hash exists and is valid, use it
            if (hash && this.isValidTab(hash)) {
                this.showTab(hash);
            } 
            // Otherwise check localStorage for last tab
            else {
                const lastTab = localStorage.getItem(this.storageKey);
                if (lastTab && this.isValidTab(lastTab)) {
                    this.showTab(lastTab);
                    // Update URL hash to match
                    window.location.hash = lastTab;
                } else {
                    this.showTab('dashboard');
                }
            }
        });
        
        // Handle browser back/forward buttons
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.substring(1);
            if (hash && this.isValidTab(hash)) {
                this.showTab(hash);
                // Save to localStorage
                localStorage.setItem(this.storageKey, hash);
            }
        });
    }
    
    loadLastTab() {
        // Load last active tab from localStorage on init
        const lastTab = localStorage.getItem(this.storageKey);
        if (lastTab && this.isValidTab(lastTab)) {
            this.currentTab = lastTab;
        }
    }
    
    // FIXED: Unified tab switching WITHOUT inline styles
    showTab(tabId) {
        if (!this.isValidTab(tabId)) {
            console.error(`Invalid tab ID: ${tabId}`);
            tabId = 'dashboard';
        }
        
        // Don't do anything if we're already on this tab
        if (this.currentTab === tabId) return;
        
        console.log(`🔄 Switching to tab: ${tabId} (from: ${this.currentTab})`);
        
        // FIXED: Remove inline styles and use CSS classes only
        this.tabs.forEach(tab => {
            // Remove any inline display style
            tab.style.removeProperty('display');
            tab.classList.remove('active');
        });
        
        // FIXED: Show selected tab using CSS class only
        const selectedTab = document.getElementById(tabId);
        if (selectedTab) {
            selectedTab.classList.add('active');
            
            // Debug: Check if CSS is working
            setTimeout(() => {
                const computedDisplay = window.getComputedStyle(selectedTab).display;
                console.log(`✅ Tab ${tabId} is now active. CSS display: ${computedDisplay}, Height: ${selectedTab.offsetHeight}px`);
                
                // If still hidden, add temporary debug styling
                if (computedDisplay === 'none' || selectedTab.offsetHeight === 0) {
                    console.warn(`⚠️ Tab ${tabId} still not visible. Adding debug styling...`);
                    selectedTab.style.border = '3px solid red';
                    selectedTab.style.backgroundColor = '#fff0f0';
                }
            }, 10);
        }
        
        // Update navigation links
        this.navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-tab') === tabId) {
                link.classList.add('active');
            }
        });
        
        // Update URL hash WITHOUT triggering hashchange
        if (window.location.hash.substring(1) !== tabId) {
            history.replaceState(null, null, `#${tabId}`);
        }
        
        // Save to localStorage
        localStorage.setItem(this.storageKey, tabId);
        
        // Close mobile menu if open
        this.closeMenu();
        
        // Store previous tab for reference
        const previousTab = this.currentTab;
        this.currentTab = tabId;
        
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('tabChanged', { 
            detail: { 
                tabId, 
                previousTab,
                fromHashChange: false
            }
        }));
        
        // Update page title based on tab
        this.updatePageTitle(tabId);
        
        // Force a reflow to ensure CSS is applied
        if (selectedTab) {
            void selectedTab.offsetHeight;
        }
    }
    
    updatePageTitle(tabId) {
        const tabNames = {
            'dashboard': 'Dashboard',
            'profile': 'Profile',
            'calendar': 'Academic Calendar',
            'courses': 'My Courses',
            'attendance': 'Attendance',
            'cats': 'CATS/Exams',
            'resources': 'Resources',
            'messages': 'Messages',
            'nurseiq': 'NurseIQ'
        };
        
        const tabName = tabNames[tabId] || 'Dashboard';
        document.title = `${tabName} - NCHSM Student Portal`;
    }
    
    setupEventListeners() {
        // Mobile menu toggle - FIXED: Using correct ID
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
                if (tabId) {
                    this.showTab(tabId);
                    this.closeMenu();
                }
            });
        });
        
        // Logout - Both sidebar and header logout buttons
        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
        
        if (this.headerLogout) {
            this.headerLogout.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
        
        // Header refresh button
        if (this.headerRefresh) {
            this.headerRefresh.addEventListener('click', () => this.refreshDashboard());
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
        document.querySelectorAll('.card[data-tab]').forEach(card => {
            card.addEventListener('click', (e) => {
                const tabId = card.getAttribute('data-tab');
                if (tabId) {
                    this.showTab(tabId);
                }
            });
        });
        
        // Action card buttons
        document.querySelectorAll('.profile-button[data-tab]').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const tabId = button.getAttribute('data-tab');
                if (tabId) {
                    this.showTab(tabId);
                }
            });
        });
        
        // Footer links
        document.querySelectorAll('.footer-links a[data-tab]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tabId = link.getAttribute('data-tab');
                if (tabId) {
                    this.showTab(tabId);
                }
            });
        });
        
        // Profile dropdown in header
        this.setupProfileDropdown();
        
        // Prevent URL hash from scrolling
        if (window.location.hash) {
            window.scrollTo(0, 0);
        }
    }
    
    // NEW: Setup profile dropdown functionality
    setupProfileDropdown() {
        const profileTrigger = document.querySelector('.profile-trigger');
        const dropdownMenu = document.querySelector('.dropdown-menu');
        
        if (profileTrigger && dropdownMenu) {
            profileTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdownMenu.classList.toggle('show');
            });
            
            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!profileTrigger.contains(e.target) && !dropdownMenu.contains(e.target)) {
                    dropdownMenu.classList.remove('show');
                }
            });
            
            // Profile link in dropdown
            const profileLink = dropdownMenu.querySelector('a[data-tab="profile"]');
            if (profileLink) {
                profileLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showTab('profile');
                    dropdownMenu.classList.remove('show');
                });
            }
        }
    }
    
    setupTabChangeListener() {
        window.addEventListener('tabChanged', (e) => {
            console.log(`📢 Tab changed to: ${e.detail.tabId}`);
            this.loadTabModule(e.detail.tabId);
        });
    }
    
    isValidTab(tabId) {
        const validTabs = [
            'dashboard', 'profile', 'calendar', 'courses', 
            'attendance', 'cats', 'resources', 'messages', 
            'nurseiq'
        ];
        return validTabs.includes(tabId);
    }
    
    loadTabModule(tabId) {
        console.log(`📂 Loading module for tab: ${tabId}`);
        
        // Dispatch event for modules to listen to
        window.dispatchEvent(new CustomEvent('loadModule', { detail: { tabId } }));
        
        // Also call specific functions for backward compatibility
        switch(tabId) {
            case 'dashboard':
                if (typeof loadDashboard === 'function') {
                    console.log('Loading dashboard...');
                    loadDashboard();
                }
                break;
            case 'profile':
                if (typeof loadProfile === 'function') {
                    console.log('Loading profile...');
                    loadProfile();
                }
                break;
            case 'calendar':
                if (typeof loadAcademicCalendar === 'function') {
                    console.log('Loading calendar...');
                    loadAcademicCalendar();
                }
                break;
            case 'courses':
                if (typeof loadCourses === 'function') {
                    console.log('Loading courses...');
                    loadCourses();
                }
                break;
            case 'attendance':
                if (typeof loadAttendance === 'function') {
                    console.log('Loading attendance...');
                    loadAttendance();
                }
                break;
            case 'cats':
                if (typeof loadExams === 'function') {
                    console.log('Loading exams...');
                    loadExams();
                }
                break;
            case 'resources':
                if (typeof loadResources === 'function') {
                    console.log('Loading resources...');
                    loadResources();
                }
                break;
            case 'messages':
                if (typeof loadMessages === 'function') {
                    console.log('Loading messages...');
                    loadMessages();
                }
                break;
            case 'nurseiq':
                if (typeof loadNurseIQ === 'function') {
                    console.log('Loading NurseIQ...');
                    loadNurseIQ();
                }
                break;
        }
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
    
    // NEW: Refresh dashboard function
    refreshDashboard() {
        this.showToast('Refreshing dashboard...', 'info', 1500);
        
        // Clear dashboard cache
        if (window.db && window.db.clearCache) {
            window.db.clearCache('dashboard');
        }
        
        // Reload dashboard data
        if (this.currentTab === 'dashboard') {
            this.loadTabModule('dashboard');
        } else {
            // If not on dashboard, switch to it
            this.showTab('dashboard');
        }
    }
    
    // Toast notifications
    showToast(message, type = 'info', duration = 3000) {
        if (!this.toast) {
            // Create toast dynamically
            const toast = document.createElement('div');
            toast.id = 'toast';
            toast.className = 'toast';
            toast.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: #4C1D95;
                color: white;
                padding: 12px 24px;
                border-radius: 6px;
                z-index: 9999;
                display: none;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                max-width: 400px;
                word-wrap: break-word;
            `;
            document.body.appendChild(toast);
            this.toast = toast;
        }
        
        this.toast.textContent = message;
        this.toast.className = `toast ${type}`;
        
        // Set colors based on type
        const colors = {
            'info': '#4C1D95',
            'success': '#10B981',
            'warning': '#F59E0B',
            'error': '#EF4444'
        };
        
        this.toast.style.background = colors[type] || colors.info;
        this.toast.style.display = 'block';
        
        setTimeout(() => {
            this.toast.style.display = 'none';
        }, duration);
    }
    
    // NEW: Update header information
    updateHeaderInfo(userProfile) {
        if (userProfile) {
            // Update header name
            if (this.headerUserName && userProfile.full_name) {
                this.headerUserName.textContent = userProfile.full_name;
            }
            
            // Update header profile photo
            this.updateHeaderProfilePhoto(userProfile);
        }
    }
    
    // NEW: Update header profile photo
    updateHeaderProfilePhoto(userProfile) {
        if (!this.headerProfilePhoto) return;
        
        // Check if user has a saved photo in localStorage
        const savedPhoto = localStorage.getItem('userProfilePhoto');
        if (savedPhoto) {
            this.headerProfilePhoto.src = savedPhoto;
        } else {
            // Fallback to avatar based on name
            const nameForAvatar = userProfile.full_name ? 
                userProfile.full_name.replace(/\s+/g, '') : 
                'Student';
            this.headerProfilePhoto.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(nameForAvatar)}&background=667eea&color=fff&size=100`;
        }
    }
    
    // Modal functions
    showTranscriptModal(examData) {
        if (!this.transcriptModal) return;
        
        // Populate modal with exam data
        document.getElementById('transcript-exam-name').textContent = examData.name || 'Exam Transcript';
        document.getElementById('transcript-cat1').textContent = examData.cat1 !== null ? `${examData.cat1}/30` : '--';
        document.getElementById('transcript-cat2').textContent = examData.cat2 !== null ? `${examData.cat2}/30` : '--';
        document.getElementById('transcript-final').textContent = examData.final !== null ? `${examData.final}/40` : '--';
        document.getElementById('transcript-total').textContent = examData.total ? `${examData.total}/100` : '--';
        
        // Determine status
        const status = examData.total >= 50 ? 'PASS' : 'FAIL';
        const statusElement = document.getElementById('transcript-status');
        statusElement.textContent = status;
        statusElement.style.color = status === 'PASS' ? 'var(--color-success)' : 'var(--color-alert)';
        
        this.transcriptModal.style.display = 'flex';
    }
    
    closeTranscriptModal() {
        if (this.transcriptModal) {
            this.transcriptModal.style.display = 'none';
        }
    }
    
    // Reader functions
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
    
    // Utility functions
    async logout() {
        try {
            // Confirm logout
            const confirmLogout = confirm('Are you sure you want to logout?');
            if (!confirmLogout) return;
            
            this.showToast('Logging out...', 'info');
            
            // Clear tab state
            localStorage.removeItem(this.storageKey);
            
            if (typeof db !== 'undefined' && db.logout) {
                await db.logout();
            } else {
                // Fallback logout
                localStorage.clear();
                sessionStorage.clear();
            }
            
            // Redirect to login
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Logout error:', error);
            this.showToast('Logout failed. Please try again.', 'error');
        }
    }
    
    clearCache() {
        if (confirm('Clear all cached data? This will not delete your account.')) {
            if ('caches' in window) {
                caches.keys().then(cacheNames => {
                    cacheNames.forEach(cacheName => {
                        caches.delete(cacheName);
                    });
                    this.showToast('Cache cleared successfully!', 'success');
                }).catch(error => {
                    console.error('Error clearing cache:', error);
                    this.showToast('Error clearing cache', 'error');
                });
            } else {
                this.showToast('Cache API not supported', 'warning');
            }
            
            // Clear localStorage except auth data
            const keepKeys = ['nchsm_last_tab', 'userProfilePhoto', 'nchsm_user_profile'];
            const keysToRemove = [];
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (!keepKeys.includes(key)) {
                    keysToRemove.push(key);
                }
            }
            
            keysToRemove.forEach(key => localStorage.removeItem(key));
        }
    }
    
    exportData() {
        // Implementation for data export
        this.showToast('Export feature coming soon', 'info');
    }
    
    showSystemInfo() {
        const info = {
            appVersion: 'v2.1',
            userAgent: navigator.userAgent,
            online: navigator.onLine,
            screenSize: `${window.innerWidth} x ${window.innerHeight}`,
            currentTab: this.currentTab,
            lastLogin: localStorage.getItem('last_login') || 'Not available',
            localStorageSize: `${JSON.stringify(localStorage).length} bytes`
        };
        
        const infoText = `
            NCHSM Student Portal ${info.appVersion}
            
            Browser: ${info.userAgent}
            Online: ${info.online ? 'Yes' : 'No'}
            Screen: ${info.screenSize}
            Current Tab: ${info.currentTab}
            Last Login: ${info.lastLogin}
            Storage: ${info.localStorageSize}
            
            © 2025 Nakuru College of Health Sciences and Management
        `;
        
        alert(infoText);
    }
    
    // NEW: Header time update
    initializeDateTime() {
        // Update header time
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
        
        // Initial update
        updateHeaderTime();
        
        // Update every minute
        setInterval(updateHeaderTime, 60000);
        
        // Also update general date/time if element exists
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
        updateOnlineStatus(); // Initial check
    }
    
    // Helper function to debug tab state
    debugTabState() {
        console.log('🔍 Current Tab State:');
        console.log(`Current Tab: ${this.currentTab}`);
        
        this.tabs.forEach(tab => {
            console.log(`${tab.id}:`, {
                display: window.getComputedStyle(tab).display,
                classList: Array.from(tab.classList),
                hasInlineStyle: tab.style.display ? true : false,
                offsetHeight: tab.offsetHeight,
                visible: tab.offsetParent !== null
            });
        });
        
        this.navLinks.forEach(link => {
            console.log(`Nav ${link.getAttribute('data-tab')}:`, {
                active: link.classList.contains('active')
            });
        });
    }
    
    // NEW: Emergency fallback if CSS isn't working
    forceShowTab(tabId) {
        console.log(`🚨 Force showing tab: ${tabId}`);
        
        // Hide all tabs with !important
        this.tabs.forEach(tab => {
            tab.style.setProperty('display', 'none', 'important');
            tab.classList.remove('active');
        });
        
        // Show selected tab with !important
        const selectedTab = document.getElementById(tabId);
        if (selectedTab) {
            selectedTab.style.setProperty('display', 'block', 'important');
            selectedTab.classList.add('active');
        }
        
        // Update navigation links
        this.navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-tab') === tabId) {
                link.classList.add('active');
            }
        });
        
        // Update current tab
        this.currentTab = tabId;
    }
}

// Create global instance
window.ui = new UIModule();

// Also export functions to window for backward compatibility
window.toggleMenu = () => ui.toggleMenu();
window.closeMenu = () => ui.closeMenu();
window.showTab = (tabId) => ui.showTab(tabId);
window.showToast = (message, type, duration) => ui.showToast(message, type, duration);
window.logout = () => ui.logout();
window.forceShowTab = (tabId) => ui.forceShowTab(tabId);
window.refreshDashboard = () => ui.refreshDashboard();

// Add cleanup function
window.addEventListener('DOMContentLoaded', function() {
    console.log('✅ UI Module loaded successfully');
    
    // Remove any inline display styles that might have been set before
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.removeProperty('display');
    });
    
    // Call debug after a short delay
    setTimeout(() => {
        ui.debugTabState();
        
        // If dashboard isn't visible, force it
        const dashboardTab = document.getElementById('dashboard');
        if (dashboardTab && dashboardTab.offsetHeight === 0) {
            console.warn('⚠️ Dashboard not visible, forcing display...');
            ui.forceShowTab('dashboard');
        }
    }, 100);
});

// Event listener for profile photo updates
window.addEventListener('profilePhotoUpdated', function(e) {
    if (ui && ui.headerProfilePhoto && e.detail && e.detail.photoUrl) {
        ui.headerProfilePhoto.src = e.detail.photoUrl;
    }
});

// Event listener for user profile updates
window.addEventListener('userProfileUpdated', function(e) {
    if (ui && e.detail && e.detail.userProfile) {
        ui.updateHeaderInfo(e.detail.userProfile);
    }
});
