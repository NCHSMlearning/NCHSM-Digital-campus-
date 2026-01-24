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
        this.setupHashNavigation();
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
    
    // NEW: Load initial user data from database
    async loadInitialUserData() {
        console.log('👤 Loading initial user data...');
        
        try {
            // Wait for user to be authenticated
            if (!window.currentUserId && window.db?.currentUserId) {
                window.currentUserId = window.db.currentUserId;
            }
            
            if (!window.currentUserProfile && window.db?.currentUserProfile) {
                window.currentUserProfile = window.db.currentUserProfile;
            }
            
            if (window.currentUserId && this.supabase) {
                // Load fresh data from consolidated_user_profiles_table
                const userData = await this.loadUserFromDatabase(window.currentUserId);
                if (userData) {
                    this.updateAllUserInfo(userData);
                } else {
                    // Fallback to cached data
                    this.updateAllUserInfo(window.currentUserProfile);
                }
            } else if (window.currentUserProfile) {
                // Use cached profile
                this.updateAllUserInfo(window.currentUserProfile);
            }
        } catch (error) {
            console.error('❌ Error loading initial user data:', error);
        }
    }
    
    // NEW: Load user data from consolidated_user_profiles_table
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
                
                // Cache the data
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
    
    setupHashNavigation() {
        console.log('🔗 Setting up hash navigation...');
        
        // Handle initial page load
        window.addEventListener('load', () => {
            const hash = window.location.hash.substring(1);
            console.log('🔗 Initial hash:', hash);
            
            if (hash && this.isValidTab(hash)) {
                console.log(`🎯 Showing tab from hash: ${hash}`);
                this.showTab(hash);
            } else {
                const lastTab = localStorage.getItem(this.storageKey);
                console.log(`💾 Saved last tab: ${lastTab}`);
                
                if (lastTab && this.isValidTab(lastTab)) {
                    this.showTab(lastTab);
                    window.location.hash = lastTab;
                } else {
                    console.log('🎯 Defaulting to dashboard');
                    this.showTab('dashboard');
                }
            }
        });
        
        // Handle browser back/forward buttons
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.substring(1);
            console.log('🔗 Hash changed to:', hash);
            
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
        console.log(`📱 showTab(${tabId}) called`);
        
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
        
        // Update URL hash
        if (window.location.hash.substring(1) !== tabId) {
            history.replaceState(null, null, `#${tabId}`);
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
                fromHashChange: false
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
    
    setupTabChangeListener() {
        window.addEventListener('tabChanged', (e) => {
            console.log(`🔄 Tab changed to: ${e.detail.tabId}`);
            this.loadTabModule(e.detail.tabId);
        });
    }
    
    isValidTab(tabId) {
        const validTabs = [
            'dashboard', 'profile', 'calendar', 'courses', 
            'attendance', 'cats', 'resources', 'messages', 
            'support-tickets', 'nurseiq'
        ];
        return validTabs.includes(tabId);
    }
    
    loadTabModule(tabId) {
        console.log(`📦 Loading module for tab: ${tabId}`);
        
        window.dispatchEvent(new CustomEvent('loadModule', { detail: { tabId } }));
        
        // Load specific tab data based on available functions
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
        
        // Clear dashboard cache
        if (window.db && window.db.clearCache) {
            window.db.clearCache('dashboard');
        }
        
        // Reload dashboard data
        if (window.dashboardModule && window.dashboardModule.refreshDashboard) {
            window.dashboardModule.refreshDashboard();
        } else if (typeof loadDashboard === 'function') {
            loadDashboard();
        }
    }
    
    // Toast notifications
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
    
    // UPDATED: Get profile photo from database
    async getProfilePhotoFromDatabase(userId) {
        try {
            if (!this.supabase) {
                console.warn('⚠️ No Supabase client available');
                return null;
            }
            
            // Query consolidated_user_profiles_table
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
            
            // Check if passport_url exists and is valid
            if (userProfile.passport_url && userProfile.passport_url.trim() !== '') {
                console.log('📸 Found passport_url in database:', userProfile.passport_url);
                return userProfile.passport_url;
            }
            
            // Fallback to generated avatar
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
    
    // UPDATED: Update ALL user information
    async updateAllUserInfo(userProfile = null) {
        console.log('👤 Updating all user info...');
        
        try {
            let profile = userProfile || window.currentUserProfile || window.db?.currentUserProfile;
            
            if (!profile && window.currentUserId) {
                // Load from database
                profile = await this.loadUserFromDatabase(window.currentUserId);
            }
            
            if (!profile) {
                console.warn('⚠️ No user profile available');
                return;
            }
            
            console.log('📝 User profile data:', profile);
            
            const studentName = profile.full_name || 'Student';
            
            // Update header user name
            if (this.headerUserName) {
                this.headerUserName.textContent = studentName;
                console.log(`✅ Header name updated: ${studentName}`);
            }
            
            // Update profile photo
            await this.updateProfilePhoto(profile);
            
            // Update welcome header
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
            
            // Update profile page name field
            const profileName = document.getElementById('profile-name');
            if (profileName && !profileName.value && studentName !== 'Student') {
                profileName.value = studentName;
            }
            
            // Update student ID in profile page
            const studentIdField = document.getElementById('profile-student-id');
            if (studentIdField && profile.student_id && !studentIdField.value) {
                studentIdField.value = profile.student_id;
            }
            
            console.log('✅ All user info updated');
            
        } catch (error) {
            console.error('❌ Error updating user info:', error);
        }
    }
    
    // UPDATED: Profile photo loading with database priority
    async updateProfilePhoto(userProfile = null) {
        console.log('📸 Updating profile photo...');
        
        if (!this.headerProfilePhoto) {
            console.error('❌ Header profile photo element not found!');
            return;
        }
        
        try {
            let photoUrl = null;
            
            // 1. Try to get from database first
            if (window.currentUserId) {
                photoUrl = await this.getProfilePhotoFromDatabase(window.currentUserId);
            }
            
            // 2. Try from userProfile object
            if (!photoUrl && userProfile?.passport_url) {
                photoUrl = userProfile.passport_url;
                console.log('📸 Using passport_url from userProfile object');
            }
            
            // 3. Try localStorage cache
            if (!photoUrl) {
                photoUrl = localStorage.getItem('userProfilePhoto');
                if (photoUrl) {
                    console.log('📸 Using cached photo from localStorage');
                }
            }
            
            // 4. Generate from name
            if (!photoUrl && userProfile?.full_name) {
                const nameForAvatar = userProfile.full_name.replace(/\s+/g, '+');
                photoUrl = `https://ui-avatars.com/api/?name=${nameForAvatar}&background=667eea&color=fff&size=100`;
                console.log('📸 Generated avatar from name:', userProfile.full_name);
            }
            
            // 5. Default avatar
            if (!photoUrl) {
                photoUrl = 'https://ui-avatars.com/api/?name=Student&background=667eea&color=fff&size=100';
                console.log('📸 Using default avatar');
            }
            
            console.log('📸 Final photo URL:', photoUrl);
            
            // Update header photo
            this.headerProfilePhoto.src = photoUrl;
            this.headerProfilePhoto.onerror = () => {
                console.error('❌ Failed to load profile photo, using fallback');
                const fallbackUrl = 'https://ui-avatars.com/api/?name=Student&background=667eea&color=fff&size=100';
                this.headerProfilePhoto.src = fallbackUrl;
            };
            
            // Update all other profile photos
            const allProfilePhotos = document.querySelectorAll('img[alt*="profile"], img[alt*="avatar"], .user-avatar img, .profile-photo');
            allProfilePhotos.forEach(img => {
                if (img !== this.headerProfilePhoto && img.tagName === 'IMG') {
                    img.src = photoUrl;
                }
            });
            
            // Cache the photo URL
            localStorage.setItem('userProfilePhoto', photoUrl);
            
            console.log('✅ Profile photo updated');
            
        } catch (error) {
            console.error('❌ Error updating profile photo:', error);
            
            // Emergency fallback
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
            // Confirmation
            const confirmLogout = confirm('Are you sure you want to logout?\n\nYou will need to sign in again to access the portal.');
            if (!confirmLogout) return;
            
            this.showToast('Logging out...', 'info', 1500);
            
            // Clear data
            localStorage.removeItem(this.storageKey);
            localStorage.removeItem('userProfilePhoto');
            localStorage.removeItem('currentUserProfile');
            
            // Clear all localStorage except maybe some settings
            const keysToKeep = [];
            Object.keys(localStorage).forEach(key => {
                if (!keysToKeep.includes(key)) {
                    localStorage.removeItem(key);
                }
            });
            
            sessionStorage.clear();
            
            // Clear cookies
            document.cookie.split(";").forEach(c => {
                document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
            });
            
            // Sign out from Supabase
            if (window.supabase) {
                await window.supabase.auth.signOut();
            } else if (window.db?.supabase) {
                await window.db.supabase.auth.signOut();
            }
            
            // Wait for toast to show
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Redirect to login
            window.location.href = 'login.html';
            
        } catch (error) {
            console.error('Logout error:', error);
            // Fallback redirect
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
            
            // Clear localStorage but keep essential data
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
