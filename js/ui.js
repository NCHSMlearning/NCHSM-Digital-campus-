// js/ui.js - User Interface Management
class UIModule {
    constructor() {
        this.sidebar = document.getElementById('sidebar');
        this.overlay = document.getElementById('overlay');
        this.mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        this.navLinks = document.querySelectorAll('.nav a');
        this.tabs = document.querySelectorAll('.tab-content');
        this.toast = document.getElementById('toast');
        this.logoutBtn = document.getElementById('logoutBtn');
        this.headerLogout = document.getElementById('header-logout');
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
        this.setupMobileMenuVisibility();
        this.loadLastTab();
        this.fixInitialDisplay();
    }
    
    fixInitialDisplay() {
        // Remove all inline styles first
        this.tabs.forEach(tab => {
            tab.style.removeProperty('display');
            tab.classList.remove('active');
        });
        
        // Show dashboard by default
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
    
    setupHashNavigation() {
        // Handle initial page load
        window.addEventListener('load', () => {
            const hash = window.location.hash.substring(1);
            
            if (hash && this.isValidTab(hash)) {
                this.showTab(hash);
            } else {
                const lastTab = localStorage.getItem(this.storageKey);
                if (lastTab && this.isValidTab(lastTab)) {
                    this.showTab(lastTab);
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
                localStorage.setItem(this.storageKey, hash);
            }
        });
    }
    
    loadLastTab() {
        const lastTab = localStorage.getItem(this.storageKey);
        if (lastTab && this.isValidTab(lastTab)) {
            this.currentTab = lastTab;
        }
    }
    
    showTab(tabId) {
        if (!this.isValidTab(tabId)) {
            console.error(`Invalid tab ID: ${tabId}`);
            tabId = 'dashboard';
        }
        
        if (this.currentTab === tabId) return;
        
        console.log(`🔄 Switching to tab: ${tabId} (from: ${this.currentTab})`);
        
        this.tabs.forEach(tab => {
            tab.style.removeProperty('display');
            tab.classList.remove('active');
        });
        
        const selectedTab = document.getElementById(tabId);
        if (selectedTab) {
            selectedTab.classList.add('active');
        }
        
        this.navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-tab') === tabId) {
                link.classList.add('active');
            }
        });
        
        if (window.location.hash.substring(1) !== tabId) {
            history.replaceState(null, null, `#${tabId}`);
        }
        
        localStorage.setItem(this.storageKey, tabId);
        this.closeMenu();
        
        const previousTab = this.currentTab;
        this.currentTab = tabId;
        
        window.dispatchEvent(new CustomEvent('tabChanged', { 
            detail: { 
                tabId, 
                previousTab,
                fromHashChange: false
            }
        }));
        
        this.updatePageTitle(tabId);
        
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
            'support-tickets', 
            'nurseiq': 'NurseIQ'
        };
        
        const tabName = tabNames[tabId] || 'Dashboard';
        document.title = `${tabName} - NCHSM Student Portal`;
    }
    
    setupEventListeners() {
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
        
        window.dispatchEvent(new CustomEvent('loadModule', { detail: { tabId } }));
        
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
            this.showTab('dashboard');
        }
    }
    
    // FIXED: Toast notifications with proper sizing
    showToast(message, type = 'info', duration = 3000) {
        // Remove existing toasts
        const existingToasts = document.querySelectorAll('.custom-toast');
        existingToasts.forEach(toast => toast.remove());
        
        // Create toast
        const toast = document.createElement('div');
        toast.className = `custom-toast toast-${type}`;
        
        // Truncate long messages
        const maxLength = 100;
        const displayMessage = message.length > maxLength 
            ? message.substring(0, maxLength) + '...' 
            : message;
        
        toast.textContent = displayMessage;
        
        // Apply styling
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
        
        // Animate in
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        }, 10);
        
        // Remove after duration
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
    
    updateHeaderInfo(userProfile) {
        if (userProfile) {
            if (this.headerUserName && userProfile.full_name) {
                this.headerUserName.textContent = userProfile.full_name;
            }
            this.updateHeaderProfilePhoto(userProfile);
        }
    }
    
    updateHeaderProfilePhoto(userProfile) {
        if (!this.headerProfilePhoto) return;
        
        const savedPhoto = localStorage.getItem('userProfilePhoto');
        if (savedPhoto) {
            this.headerProfilePhoto.src = savedPhoto;
        } else {
            const nameForAvatar = userProfile.full_name ? 
                userProfile.full_name.replace(/\s+/g, '') : 
                'Student';
            this.headerProfilePhoto.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(nameForAvatar)}&background=667eea&color=fff&size=100`;
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
        statusElement.style.color = status === 'PASS' ? 'var(--color-success)' : 'var(--color-alert)';
        
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
    
    // FIXED: Logout method without GitHub errors
    async logout() {
        try {
            // Clean logout confirmation
            const confirmLogout = confirm('Are you sure you want to logout?\n\nYou will need to sign in again to access the portal.');
            if (!confirmLogout) return;
            
            this.showToast('Logging out...', 'info', 1500);
            
            // Clear local storage items
            const itemsToKeep = ['nchsm_last_tab', 'userProfilePhoto'];
            Object.keys(localStorage).forEach(key => {
                if (!itemsToKeep.includes(key)) {
                    localStorage.removeItem(key);
                }
            });
            
            // Clear session storage
            sessionStorage.clear();
            
            // Clear cookies
            document.cookie.split(";").forEach(c => {
                document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
            });
            
            // Wait for toast to show
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Redirect to login page
            window.location.href = 'login.html';
            
        } catch (error) {
            console.error('Logout error:', error);
            // Fallback redirect if something fails
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
                    console.error('Error clearing cache:', error);
                    this.showToast('Error clearing cache', 'error');
                });
            } else {
                this.showToast('Cache API not supported', 'warning');
            }
            
            const keepKeys = ['nchsm_last_tab', 'userProfilePhoto'];
            const keysToRemove = [];
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (!keepKeys.includes(key)) {
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
            
            © 2026 Nakuru College of Health Sciences and Management
        `;
        
        alert(infoText);
    }
    
    initializeDateTime() {
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
    
    forceShowTab(tabId) {
        console.log(`🚨 Force showing tab: ${tabId}`);
        
        this.tabs.forEach(tab => {
            tab.style.setProperty('display', 'none', 'important');
            tab.classList.remove('active');
        });
        
        const selectedTab = document.getElementById(tabId);
        if (selectedTab) {
            selectedTab.style.setProperty('display', 'block', 'important');
            selectedTab.classList.add('active');
        }
        
        this.navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-tab') === tabId) {
                link.classList.add('active');
            }
        });
        
        this.currentTab = tabId;
    }
}

// Create global instance
window.ui = new UIModule();

// Export functions to window for backward compatibility
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
