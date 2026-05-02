// js/ui.js - COMPLETE WORKING VERSION WITH CLEAN URLs (NO HASHES)
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
        
        this.validTabs = ['dashboard', 'profile', 'calendar', 'courses', 'attendance', 'cats', 'resources', 'messages', 'support-tickets', 'nurseiq', 'unit-registration', 'learning-hub', 'exam-card'];
        
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
        await this.delay(800);
        await this.loadInitialUserData();
        await this.delay(800);
        await this.hideLoadingScreen();
        await this.loadLastLogin();
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
        if (window.innerWidth <= 768 && this.sidebar) this.sidebar.classList.remove('active');
    }
    
    // ============================================
    // CLEAN URL NAVIGATION - NO HASHES
    // ============================================
    
    setupUrlNavigation() { 
        this.setupHistoryNavigation(); 
    }
    
    setupHistoryNavigation() {
        const handleRoute = () => {
            // Get tab from pathname (no hashes!)
            let tabId = 'dashboard';
            let path = window.location.pathname;
            
            // Remove /student prefix
            if (path.startsWith('/student/')) {
                path = path.replace('/student/', '');
            } else if (path === '/student') {
                path = '';
            }
            path = path.replace(/\/$/, '');
            
            if (path && this.validTabs.includes(path)) {
                tabId = path;
            }
            
            if (this.isValidTab(tabId)) {
                this.showTab(tabId, true);
            } else {
                this.showTab('dashboard', true);
            }
            localStorage.setItem(this.storageKey, tabId);
        };
        
        window.addEventListener('popstate', handleRoute);
        
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[data-tab]');
            if (!link) return;
            e.preventDefault();
            const tabId = link.getAttribute('data-tab');
            if (tabId && this.isValidTab(tabId)) {
                this.navigateToTab(tabId);
            }
        });
        
        setTimeout(handleRoute, 100);
    }
    
    navigateToTab(tabId) {
        if (!this.isValidTab(tabId)) tabId = 'dashboard';
        
        // Build clean URL without hash
        let newUrl = '/student';
        if (tabId !== 'dashboard') {
            newUrl = `/student/${tabId}`;
        }
        
        if (window.location.pathname !== newUrl) {
            history.pushState({}, '', newUrl);
        }
        this.showTab(tabId, true);
    }
    
    getCurrentPath() {
        let path = window.location.pathname;
        if (path.startsWith('/student/')) {
            path = path.replace('/student/', '');
        } else if (path === '/student') {
            path = '';
        }
        path = path.replace(/\/$/, '');
        return path && this.validTabs.includes(path) ? path : 'dashboard';
    }
    
    // ============================================
    // EVENT LISTENERS
    // ============================================
    
    setupEventListeners() {
        if (this.mobileMenuToggle) this.mobileMenuToggle.addEventListener('click', () => this.toggleMenu());
        if (this.overlay) this.overlay.addEventListener('click', () => this.closeMenu());
        
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
        
        if (this.headerLogout) this.headerLogout.addEventListener('click', (e) => { e.preventDefault(); this.logout(); });
        if (this.headerRefresh) this.headerRefresh.addEventListener('click', () => this.refreshDashboard());
        if (this.clearCacheBtn) this.clearCacheBtn.addEventListener('click', (e) => { e.preventDefault(); this.clearCache(); });
        if (this.exportDataBtn) this.exportDataBtn.addEventListener('click', (e) => { e.preventDefault(); this.exportData(); });
        if (this.systemInfoBtn) this.systemInfoBtn.addEventListener('click', (e) => { e.preventDefault(); this.showSystemInfo(); });
        
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
    
    showTab(tabId, fromNavigation = false) {
        if (!this.isValidTab(tabId)) tabId = 'dashboard';
        if (this.currentTab === tabId && !fromNavigation) return;
        
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
        
        // Update last login when showing dashboard
        if (tabId === 'dashboard') {
            setTimeout(() => {
                this.updateLastLogin(window.currentUserId);
                this.updateProfilePhoto();
            }, 500);
        }
        
        setTimeout(() => this.loadTabModule(tabId), 100);
    }
    
    updatePageTitle(tabId) {
        const tabName = this.tabNames[tabId] || 'Dashboard';
        document.title = `${tabName} - NCHSM Student Portal`;
    }
    
    isValidTab(tabId) { return this.validTabs.includes(tabId); }
    
    loadLastTab() {
        const lastTab = localStorage.getItem(this.storageKey);
        if (lastTab && this.isValidTab(lastTab)) {
            this.currentTab = lastTab;
        }
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
        this.updateProfilePhoto();
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
                    await this.updateLastLogin(userId);
                    await this.updateProfilePhoto(dbUserData);
                } else if (userProfile) {
                    this.updateAllUserInfo(userProfile);
                    await this.updateLastLogin(userId);
                    await this.updateProfilePhoto(userProfile);
                } else {
                    this.updateDefaultUserInfo();
                }
            } catch (dbError) {
                if (userProfile) {
                    this.updateAllUserInfo(userProfile);
                    await this.updateLastLogin(userId);
                    await this.updateProfilePhoto(userProfile);
                } else {
                    this.updateDefaultUserInfo();
                }
            }
        } else if (userProfile) {
            this.updateAllUserInfo(userProfile);
            if (userId) await this.updateLastLogin(userId);
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
            
            const { data, error } = await this.supabase
                .from('consolidated_user_profiles_table')
                .select('last_login')
                .eq('user_id', userId)
                .single();
            
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
            if (!userId || !this.supabase) return false;
            const now = new Date().toISOString();
            const { error } = await this.supabase
                .from('consolidated_user_profiles_table')
                .update({ last_login: now })
                .eq('user_id', userId);
            if (error) throw error;
            console.log('✅ Last login updated:', new Date(now).toLocaleString());
            await this.loadLastLogin();
            return true;
        } catch (error) {
            console.error('Failed to update last login:', error);
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
                confirmButtonText: '<i class="fas fa-sign-out-alt"></i> Yes, Logout',
                cancelButtonText: '<i class="fas fa-times"></i> Cancel',
                background: 'white',
                backdrop: true,
                allowOutsideClick: false,
                allowEscapeKey: true
            });
            
            if (result.isConfirmed) {
                this.showToast('Logging out...', 'info', 1500);
                
                Swal.fire({
                    title: 'Logging out...',
                    text: 'Please wait while we secure your session',
                    icon: 'info',
                    showConfirmButton: false,
                    allowOutsideClick: false,
                    didOpen: () => { Swal.showLoading(); }
                });
                
                localStorage.removeItem(this.storageKey);
                localStorage.removeItem('userProfilePhoto');
                localStorage.removeItem('currentUserProfile');
                sessionStorage.clear();
                
                if (this.supabase?.auth) {
                    await this.supabase.auth.signOut();
                }
                
                await this.delay(1000);
                
                Swal.fire({
                    title: 'Goodbye!',
                    text: 'You have been successfully logged out.',
                    icon: 'success',
                    confirmButtonColor: '#4C1D95',
                    confirmButtonText: '<i class="fas fa-arrow-right"></i> Return to Login',
                    timer: 2000,
                    showConfirmButton: true
                }).then(() => {
                    window.location.href = 'login.html';
                });
            }
        } else {
            if (confirm('Are you sure you want to logout?')) {
                localStorage.removeItem(this.storageKey);
                localStorage.removeItem('userProfilePhoto');
                localStorage.removeItem('currentUserProfile');
                sessionStorage.clear();
                if (this.supabase?.auth) await this.supabase.auth.signOut();
                window.location.href = 'login.html';
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
        console.log('- Profile trigger:', !!this.profileTrigger);
        console.log('- Valid tabs:', this.validTabs);
        console.log('- Current path:', window.location.pathname);
    }
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

console.log('✅ UI Module loaded successfully');
