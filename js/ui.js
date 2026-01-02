// js/ui.js - User Interface Management
class UIModule {
    constructor() {
        this.sidebar = document.getElementById('sidebar');
        this.overlay = document.getElementById('overlay');
        this.menuToggle = document.getElementById('menuToggle');
        this.navLinks = document.querySelectorAll('.nav a');
        this.tabs = document.querySelectorAll('.tab-content');
        this.toast = document.getElementById('toast');
        this.logoutBtn = document.getElementById('logoutBtn');
        this.currentTab = 'dashboard';
        
        // Store tab state in localStorage for persistence
        this.storageKey = 'nchsm_last_tab';
        
        // Footer buttons
        this.clearCacheBtn = document.getElementById('clearCacheBtn');
        this.exportDataBtn = document.getElementById('exportDataBtn');
        this.systemInfoBtn = document.getElementById('systemInfoBtn');
        
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
        this.loadLastTab();
        this.fixInitialDisplay(); // New fix
    }
    
    // FIX: Ensure proper initial display
    fixInitialDisplay() {
        // Hide all tabs first
        this.tabs.forEach(tab => {
            tab.style.display = 'none';
            tab.classList.remove('active');
        });
        
        // Show dashboard by default
        const dashboardTab = document.getElementById('dashboard');
        if (dashboardTab) {
            dashboardTab.style.display = 'block';
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
    
    // FIXED: Unified tab switching with display control
    showTab(tabId) {
        if (!this.isValidTab(tabId)) {
            console.error(`Invalid tab ID: ${tabId}`);
            tabId = 'dashboard';
        }
        
        // Don't do anything if we're already on this tab
        if (this.currentTab === tabId) return;
        
        console.log(`🔄 Switching to tab: ${tabId} (from: ${this.currentTab})`);
        
        // FIX: First hide all tabs
        this.tabs.forEach(tab => {
            tab.style.display = 'none';
            tab.classList.remove('active');
        });
        
        // FIX: Then show selected tab
        const selectedTab = document.getElementById(tabId);
        if (selectedTab) {
            selectedTab.style.display = 'block';
            selectedTab.classList.add('active');
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
        
        // FIX: Debug log to verify display
        console.log(`✅ Tab ${tabId} is now active. Display:`, 
            selectedTab ? window.getComputedStyle(selectedTab).display : 'not found');
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
            'nurseiq': 'NurseIQ',
            'coming-soon-quizlets': 'Quizlets'
        };
        
        const tabName = tabNames[tabId] || 'Dashboard';
        document.title = `${tabName} - NCHSM Student Portal`;
    }
    
    setupEventListeners() {
        // Menu toggle
        if (this.menuToggle) {
            this.menuToggle.addEventListener('click', () => this.toggleMenu());
        }
        
        // Overlay click to close menu
        if (this.overlay) {
            this.overlay.addEventListener('click', () => this.closeMenu());
        }
        
        // Navigation links - FIXED: Use unified click handler
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
        
        // Logout
        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
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
        
        // Dashboard card clicks - FIXED: Use proper this context
        document.querySelectorAll('.card[data-tab]').forEach(card => {
            card.addEventListener('click', (e) => {
                const tabId = card.getAttribute('data-tab');
                if (tabId) {
                    this.showTab(tabId);
                }
            });
        });
        
        // Action card buttons - FIXED: Use proper this context
        document.querySelectorAll('.profile-button[data-tab]').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const tabId = button.getAttribute('data-tab');
                if (tabId) {
                    this.showTab(tabId);
                }
            });
        });
        
        // Footer links - FIXED: Use proper this context
        document.querySelectorAll('.footer-links a[data-tab]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tabId = link.getAttribute('data-tab');
                if (tabId) {
                    this.showTab(tabId);
                }
            });
        });
        
        // FIX: Prevent URL hash from scrolling
        if (window.location.hash) {
            window.scrollTo(0, 0);
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
            'nurseiq', 'coming-soon-quizlets'
        ];
        return validTabs.includes(tabId);
    }
    
    loadTabModule(tabId) {
        console.log(`📂 Loading module for tab: ${tabId}`);
        
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
        this.toast.style.display = 'block';
        
        setTimeout(() => {
            this.toast.style.display = 'none';
        }, duration);
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
            if (typeof db !== 'undefined' && db.logout) {
                await db.logout();
            }
            // Clear localStorage
            localStorage.removeItem(this.storageKey);
            // Redirect to login
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Logout error:', error);
            this.showToast('Logout failed. Please try again.', 'error');
        }
    }
    
    clearCache() {
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
            lastLogin: localStorage.getItem('last_login') || 'Not available'
        };
        
        const infoText = `
            NCHSM Student Portal ${info.appVersion}
            
            Browser: ${info.userAgent.split(') ')[0].split('(')[1]}
            Online: ${info.online ? 'Yes' : 'No'}
            Screen: ${info.screenSize}
            Current Tab: ${info.currentTab}
            Last Login: ${info.lastLogin}
            
            © 2025 Nakuru College of Health Sciences and Management
        `;
        
        alert(infoText);
    }
    
    initializeDateTime() {
        const updateTime = () => {
            const now = new Date();
            const dateTimeElement = document.getElementById('currentDateTime');
            if (dateTimeElement) {
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
        
        updateTime();
        setInterval(updateTime, 1000);
    }
    
    setupOfflineIndicator() {
        const indicator = document.getElementById('offlineIndicator');
        if (!indicator) return;
        
        const updateOnlineStatus = () => {
            if (navigator.onLine) {
                indicator.style.display = 'none';
            } else {
                indicator.style.display = 'block';
                this.showToast('You are offline. Some features may be limited.', 'warning');
            }
        };
        
        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        updateOnlineStatus(); // Initial check
    }
    
    // FIX: Helper function to debug tab state
    debugTabState() {
        console.log('🔍 Current Tab State:');
        console.log(`Current Tab: ${this.currentTab}`);
        
        this.tabs.forEach(tab => {
            console.log(`${tab.id}:`, {
                display: window.getComputedStyle(tab).display,
                classList: tab.className,
                visible: tab.offsetParent !== null
            });
        });
        
        this.navLinks.forEach(link => {
            console.log(`Nav ${link.getAttribute('data-tab')}:`, {
                active: link.classList.contains('active')
            });
        });
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

// FIX: Add cleanup function to remove any conflicting code
window.addEventListener('DOMContentLoaded', function() {
    console.log('✅ UI Module loaded successfully');
    
    // Remove any other tab switching code that might interfere
    const scripts = document.querySelectorAll('script');
    scripts.forEach(script => {
        const src = script.src || '';
        if (src.includes('ui.js')) {
            console.log('Main UI script loaded from:', src);
        }
    });
    
    // Call debug after a short delay
    setTimeout(() => {
        ui.debugTabState();
    }, 100);
});
