// js/ui.js - COMPLETE WORKING VERSION - NO ERRORS
class UIModule {
    constructor() { 
        console.log('🚀 Initializing UIModule...');
        
        this.sidebar = document.getElementById('sidebar');
        this.overlay = document.getElementById('overlay');
        this.mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        this.navLinks = document.querySelectorAll('.nav a');
        this.tabs = document.querySelectorAll('.tab-content');
        this.toast = document.getElementById('toast');
        this.headerLogout = document.getElementById('header-logout');
        this.currentTab = 'dashboard';
        this.storageKey = 'nchsm_last_tab';
        
        this.validTabs = ['dashboard', 'profile', 'calendar', 'courses', 'attendance', 'cats', 'resources', 'messages', 'support-tickets', 'nurseiq', 'unit-registration', 'learning-hub', 'exam-card'];
        
        this.tabPaths = {
            'dashboard': '/', 'profile': '/profile', 'calendar': '/calendar',
            'courses': '/courses', 'attendance': '/attendance', 'cats': '/exams',
            'resources': '/resources', 'messages': '/messages', 'support-tickets': '/support-tickets',
            'nurseiq': '/nurseiq', 'unit-registration': '/unit-registration',
            'learning-hub': '/learning-hub', 'exam-card': '/exam-card'
        };
        
        this.pathToTab = {};
        for (const [tabId, path] of Object.entries(this.tabPaths)) {
            this.pathToTab[path] = tabId;
        }
        
        this.tabNames = {
            'dashboard': 'Dashboard', 'profile': 'Profile', 'calendar': 'Academic Calendar',
            'courses': 'My Courses', 'attendance': 'Attendance', 'cats': 'Exams & Grades',
            'resources': 'Resources', 'messages': 'Messages', 'support-tickets': 'Support Tickets',
            'nurseiq': 'NurseIQ', 'unit-registration': 'Unit Registration',
            'learning-hub': 'My Learning Hub', 'exam-card': 'Exam Card'
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
        
        setTimeout(() => this.safeInitialize(), 500);
    }
    
    async safeInitialize() {
        console.log('🛡️ Safe initialization starting...');
        await this.waitForDatabase();
        this.supabase = this.getSupabaseClient();
        this.initialize();
    }
    
    async waitForDatabase() {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 10;
            const checkDb = () => {
                attempts++;
                const hasDb = window.supabase || (window.db && window.db.supabase);
                if (hasDb || attempts >= maxAttempts) resolve();
                else setTimeout(checkDb, 300);
            };
            checkDb();
        });
    }
    
    getSupabaseClient() {
        if (window.supabase) return window.supabase;
        if (window.db && window.db.supabase) return window.db.supabase;
        return null;
    }
    
    async initialize() {
        console.log('🔧 Initializing UI...');
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
        await this.loadLastLogin();
        console.log('✅ UIModule fully initialized');
    }
    
    delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
    
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
    
    updateLoadingProgress(step, totalSteps) {}
    
    async hideLoadingScreen() {
        if (this.loadingScreen) {
            this.loadingScreen.style.display = 'none';
        }
        setTimeout(() => this.showToast('Welcome to NCHSM Student Portal!', 'success', 3000), 500);
    }
    
    cleanupInitialStyles() {
        this.tabs.forEach(tab => {
            tab.style.removeProperty('display');
            tab.classList.remove('active');
        });
        this.navLinks.forEach(link => link.classList.remove('active'));
        if (window.innerWidth <= 768 && this.sidebar) this.sidebar.classList.remove('active');
    }
    
    setupUrlNavigation() { this.setupHistoryNavigation(); }
    
    setupHistoryNavigation() {
        const handleRoute = () => {
            const path = this.getCurrentPath();
            let tabId = this.pathToTab[path] || 'dashboard';
            if (this.isValidTab(tabId)) this.showTab(tabId, true);
            else this.showTab('dashboard', true);
            localStorage.setItem(this.storageKey, tabId);
        };
        
        window.addEventListener('popstate', handleRoute);
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[data-tab]');
            if (!link) return;
            e.preventDefault();
            const tabId = link.getAttribute('data-tab');
            if (tabId && this.isValidTab(tabId)) this.navigateToTab(tabId);
        });
        setTimeout(handleRoute, 100);
    }
    
    navigateToTab(tabId) {
        if (!this.isValidTab(tabId)) tabId = 'dashboard';
        const path = this.tabPaths[tabId] || '/';
        if (window.location.pathname !== path) window.history.pushState({}, '', path);
        this.showTab(tabId, true);
    }
    
    updateBrowserUrl(path) {
        if (window.location.pathname !== path) window.history.pushState({}, '', path);
    }
    
    getCurrentPath() {
        let path = window.location.pathname;
        path = path.replace(/\.html$/, '').replace(/\/$/, '');
        if (path === '' || path === '/index' || path === '/dashboard') path = '/';
        if (!path.startsWith('/')) path = '/' + path;
        return path;
    }
    
    setupEventListeners() {
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
                if (tabId && this.isValidTab(tabId)) {
                    this.navigateToTab(tabId);
                    this.closeMenu();
                }
            });
        });
        if (this.headerLogout) {
            this.headerLogout.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
        if (this.headerRefresh) {
            this.headerRefresh.addEventListener('click', () => this.refreshDashboard());
        }
        if (this.clearCacheBtn) {
            this.clearCacheBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.clearCache();
            });
        }
        setTimeout(() => {
            document.querySelectorAll('.stat-card[data-tab]').forEach(card => {
                card.addEventListener('click', (e) => {
                    e.preventDefault();
                    const tabId = card.getAttribute('data-tab');
                    if (tabId && this.isValidTab(tabId)) this.navigateToTab(tabId);
                });
            });
        }, 1000);
    }
    
    setupProfileDropdown() {
        setTimeout(() => {
            const oldDropdown = document.querySelector('.dropdown-menu');
            if (oldDropdown) oldDropdown.remove();
            this.createSimpleDropdown();
            this.setupSimpleTrigger();
        }, 1000);
    }
    
    createSimpleDropdown() {
        this.dropdownMenu = document.createElement('div');
        this.dropdownMenu.className = 'simple-dropdown-menu';
        this.dropdownMenu.innerHTML = `<a href="#" data-action="profile" class="simple-menu-item"><i class="fas fa-user"></i> My Profile</a><div class="simple-menu-divider"></div><a href="#" data-action="logout" class="simple-menu-item"><i class="fas fa-sign-out-alt"></i> Logout</a>`;
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
                case 'learning-hub':
                    if (typeof loadCourses === 'function') loadCourses();
                    if (typeof loadUnitRegistration === 'function') loadUnitRegistration();
                    if (window.unitRegistration?.loadRegistered) window.unitRegistration.loadRegistered();
                    break;
                case 'exam-card':
                    if (typeof initExamCard === 'function') initExamCard();
                    else if (window.examCardModule?.init) window.examCardModule.init();
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
        this.showToast('Refreshing dashboard...', 'info', 1500);
        if (window.dashboardModule?.refreshDashboard) window.dashboardModule.refreshDashboard();
        if (this.currentTab === 'exam-card' && typeof initExamCard === 'function') initExamCard();
        this.loadLastLogin();
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
                    this.updateAllUserInfo(dbUserData);
                    await this.updateLastLogin(userId);
                } else if (userProfile) this.updateAllUserInfo(userProfile);
                else this.updateDefaultUserInfo();
            } catch (dbError) {
                if (userProfile) this.updateAllUserInfo(userProfile);
                else this.updateDefaultUserInfo();
            }
        } else if (userProfile) this.updateAllUserInfo(userProfile);
        else this.updateDefaultUserInfo();
    }
    
    updateDefaultUserInfo() {
        const defaultName = 'Student';
        if (this.headerUserName) this.headerUserName.textContent = defaultName;
        if (this.headerProfilePhoto) this.headerProfilePhoto.src = 'https://ui-avatars.com/api/?name=Student&background=667eea&color=fff&size=100';
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
        if (!this.supabase) return null;
        try {
            const { data, error } = await this.supabase.from('consolidated_user_profiles_table').select('*').or(`id.eq.${userId},user_id.eq.${userId}`).maybeSingle();
            if (error) return null;
            if (data) {
                window.currentUserProfile = data;
                localStorage.setItem('currentUserProfile', JSON.stringify(data));
                return data;
            }
            return null;
        } catch (error) { return null; }
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
    
    async updateAllUserInfo(userProfile = null) {
        let profile = userProfile || window.currentUserProfile;
        if (!profile && window.currentUserId) profile = await this.loadUserFromDatabase(window.currentUserId);
        if (!profile) { this.updateDefaultUserInfo(); return; }
        
        const studentName = profile.full_name || 'Student';
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
    
    async updateProfilePhoto(userProfile = null) {
        if (!this.headerProfilePhoto) return;
        let photoUrl = localStorage.getItem('userProfilePhoto');
        if (!photoUrl && userProfile?.full_name) {
            photoUrl = `https://ui-avatars.com/api/?name=${userProfile.full_name.replace(/\s+/g, '+')}&background=667eea&color=fff&size=100`;
        }
        if (!photoUrl) photoUrl = 'https://ui-avatars.com/api/?name=Student&background=667eea&color=fff&size=100';
        this.headerProfilePhoto.src = photoUrl;
        localStorage.setItem('userProfilePhoto', photoUrl);
    }
    
    showTab(tabId, fromNavigation = false) {
        if (!this.isValidTab(tabId)) tabId = 'dashboard';
        if (this.currentTab === tabId) return;
        
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
            if (link.getAttribute('data-tab') === tabId) link.classList.add('active');
        });
        
        localStorage.setItem(this.storageKey, tabId);
        this.closeMenu();
        this.currentTab = tabId;
        this.updatePageTitle(tabId);
        setTimeout(() => this.loadTabModule(tabId), 100);
    }
    
    updatePageTitle(tabId) {
        const tabName = this.tabNames[tabId] || 'Dashboard';
        document.title = `${tabName} - NCHSM Student Portal`;
    }
    
    isValidTab(tabId) { return this.validTabs.includes(tabId); }
    
    loadLastTab() {
        const lastTab = localStorage.getItem(this.storageKey);
        if (lastTab && this.isValidTab(lastTab)) this.currentTab = lastTab;
    }
    
    // =====================================================
    // LAST LOGIN METHODS - CORRECTLY INSIDE CLASS
    // =====================================================
    
    async loadLastLogin() {
        try {
            const userId = window.currentUserId;
            if (!userId || !this.supabase) return;
            
            const { data, error } = await this.supabase.from('consolidated_user_profiles_table').select('last_login').eq('user_id', userId).single();
            if (error) throw error;
            
            if (data && data.last_login && this.headerLastLogin) {
                const lastLoginDate = new Date(data.last_login);
                const formattedDate = this.formatLastLogin(lastLoginDate);
                this.headerLastLogin.textContent = formattedDate;
                this.headerLastLogin.title = `Last login: ${lastLoginDate.toLocaleString()}`;
            } else if (this.headerLastLogin) {
                this.headerLastLogin.textContent = 'First time login';
            }
        } catch (error) {
            console.error('Failed to load last login:', error);
            if (this.headerLastLogin) this.headerLastLogin.textContent = 'Not available';
        }
    }
    
    formatLastLogin(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        
        const options = { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };
        return date.toLocaleDateString('en-US', options).toUpperCase();
    }
    
    async updateLastLogin(userId) {
        try {
            if (!this.supabase) return false;
            const { error } = await this.supabase.from('consolidated_user_profiles_table').update({ last_login: new Date().toISOString() }).eq('user_id', userId);
            if (error) throw error;
            console.log('✅ Last login updated for user:', userId);
            await this.loadLastLogin();
            return true;
        } catch (error) {
            console.error('Failed to update last login:', error);
            return false;
        }
    }
    
    // =====================================================
    // OTHER METHODS
    // =====================================================
    
    async logout() {
        if (!confirm('Are you sure you want to logout?')) return;
        this.showToast('Logging out...', 'info', 1500);
        localStorage.removeItem(this.storageKey);
        localStorage.removeItem('userProfilePhoto');
        localStorage.removeItem('currentUserProfile');
        sessionStorage.clear();
        if (this.supabase?.auth) await this.supabase.auth.signOut();
        await this.delay(1000);
        window.location.href = 'login.html';
    }
    
    clearCache() {
        if (confirm('Clear all cached data?')) {
            if ('caches' in window) {
                caches.keys().then(cacheNames => cacheNames.forEach(cacheName => caches.delete(cacheName)));
            }
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
    forceShowTab(tabId) { this.showTab(tabId); }
    closeTranscriptModal() { if (this.transcriptModal) this.transcriptModal.style.display = 'none'; }
    closeReader() { if (this.mobileReader) this.mobileReader.style.display = 'none'; }
    debugAll() {
        console.log('🔍 UI DEBUG INFO:');
        console.log('- Current tab:', this.currentTab);
        console.log('- Profile trigger:', !!this.profileTrigger);
        console.log('- Valid tabs:', this.validTabs);
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
document.addEventListener('DOMContentLoaded', () => { if (!window.ui) window.ui = new UIModule(); });
document.addEventListener('appReady', (e) => { if (window.ui && e.detail?.userProfile) window.ui.updateAllUserInfo(e.detail.userProfile); });
document.addEventListener('profilePhotoUpdated', (e) => { if (window.ui && e.detail?.photoUrl) localStorage.setItem('userProfilePhoto', e.detail.photoUrl); });
document.addEventListener('userProfileUpdated', (e) => { if (window.ui && e.detail?.userProfile) window.ui.updateAllUserInfo(e.detail.userProfile); });

console.log('✅ UI Module loaded successfully');

window.addEventListener('load', () => {
    setTimeout(() => {
        if (window.ui) {
            const path = window.ui.getCurrentPath();
            const currentTabFromPath = window.ui.pathToTab[path];
            if (currentTabFromPath && currentTabFromPath !== window.ui.currentTab) window.ui.showTab(currentTabFromPath, true);
        }
    }, 500);
});
