// js/app.js - Fixed Version
class App {
    constructor() {
        this.supabase = null;
        this.currentUserId = null;
        this.currentUserProfile = null;
        this.modules = {};
        this.isInitialized = false;
        
        // Store data in localStorage for persistence
        this.STORAGE_KEYS = {
            USER_ID: 'app_user_id',
            USER_PROFILE: 'app_user_profile',
            LAST_TAB: 'app_last_tab'
        };
    }
    
    async initialize() {
        try {
            console.log('🚀 Initializing Application...');
            
            // Initialize Supabase
            this.supabase = supabase.createClient(
                window.APP_CONFIG.SUPABASE_URL,
                window.APP_CONFIG.SUPABASE_ANON_KEY
            );
            
            // Initialize modules
            await this.initModules();
            
            // Start application
            await this.start();
            
            console.log('✅ Application initialized successfully');
            this.isInitialized = true;
            
        } catch (error) {
            console.error('❌ Failed to initialize app:', error);
            this.showError('Failed to initialize application');
            
            // Try to redirect to login if auth fails
            setTimeout(() => {
                if (!this.currentUserId) {
                    window.location.href = "login.html";
                }
            }, 3000);
        }
    }
    
    async initModules() {
        console.log('🔧 Initializing modules...');
        
        // Initialize Auth module first (handles authentication)
        this.modules.auth = new AuthModule(this.supabase);
        
        // Check authentication before initializing other modules
        const isAuthenticated = await this.modules.auth.checkAuthentication();
        
        if (!isAuthenticated) {
            console.warn('⚠️ User not authenticated');
            window.location.href = "login.html";
            return;
        }
        
        // Set current user from auth module
        this.currentUserId = this.modules.auth.currentUserId;
        this.currentUserProfile = this.modules.auth.currentUserProfile;
        
        // Store user data for persistence
        this.saveUserDataToStorage();
        
        // Now initialize other modules
        this.modules.ui = new UIModule();
        this.modules.dashboard = new DashboardModule(this.supabase);
        this.modules.profile = new ProfileModule(this.supabase);
        this.modules.attendance = new AttendanceModule(this.supabase);
        this.modules.courses = new CoursesModule(this.supabase);
        this.modules.exams = new ExamsModule(this.supabase);
        this.modules.resources = new ResourcesModule(this.supabase);
        this.modules.calendar = new CalendarModule(this.supabase);
        this.modules.messages = new MessagesModule(this.supabase);
        this.modules.nurseiq = new NurseIQModule(this.supabase);
        
        console.log(`✅ Modules initialized for user: ${this.currentUserProfile?.full_name}`);
        
        // Make modules accessible via app object
        Object.assign(this, this.modules);
    }
    
    async start() {
        console.log('🏁 Starting application...');
        
        // Initialize UI
        if (this.modules.ui) {
            this.ui.initialize();
        }
        
        // Load user data from storage if available (for page refreshes)
        this.loadUserDataFromStorage();
        
        // Initialize dashboard with user data
        if (this.modules.dashboard && this.currentUserId && this.currentUserProfile) {
            console.log('📊 Initializing dashboard with user data...');
            await this.dashboard.initialize(this.currentUserId, this.currentUserProfile);
        }
        
        // Initialize other modules with user data
        this.initializeOtherModules();
        
        // Restore last active tab
        this.restoreLastTab();
        
        // Set up beforeunload to save state
        this.setupBeforeUnload();
        
        console.log('🎯 Application started successfully');
    }
    
    initializeOtherModules() {
        console.log('🔧 Initializing other modules with user data...');
        
        // Initialize profile module
        if (this.modules.profile && this.currentUserProfile) {
            this.profile.initialize(this.currentUserId, this.currentUserProfile);
        }
        
        // Initialize attendance module
        if (this.modules.attendance && this.currentUserId) {
            this.attendance.initialize(this.currentUserId, this.currentUserProfile);
        }
        
        // Initialize courses module
        if (this.modules.courses && this.currentUserProfile) {
            this.courses.initialize(this.currentUserId, this.currentUserProfile);
        }
        
        // Initialize exams module
        if (this.modules.exams && this.currentUserProfile) {
            this.exams.initialize(this.currentUserId, this.currentUserProfile);
        }
        
        // Initialize resources module
        if (this.modules.resources && this.currentUserProfile) {
            this.resources.initialize(this.currentUserId, this.currentUserProfile);
        }
        
        // Initialize calendar module
        if (this.modules.calendar && this.currentUserProfile) {
            this.calendar.initialize(this.currentUserId, this.currentUserProfile);
        }
        
        // Initialize messages module
        if (this.modules.messages && this.currentUserId) {
            this.messages.initialize(this.currentUserId, this.currentUserProfile);
        }
        
        // Initialize nurseiq module
        if (this.modules.nurseiq && this.currentUserId) {
            this.nurseiq.initialize(this.currentUserId, this.currentUserProfile);
        }
    }
    
    // Save user data to localStorage for persistence
    saveUserDataToStorage() {
        try {
            if (this.currentUserId) {
                localStorage.setItem(this.STORAGE_KEYS.USER_ID, this.currentUserId);
            }
            
            if (this.currentUserProfile) {
                localStorage.setItem(this.STORAGE_KEYS.USER_PROFILE, JSON.stringify(this.currentUserProfile));
            }
            
            console.log('💾 User data saved to storage');
        } catch (error) {
            console.warn('⚠️ Could not save user data to storage:', error);
        }
    }
    
    // Load user data from localStorage
    loadUserDataFromStorage() {
        try {
            const savedUserId = localStorage.getItem(this.STORAGE_KEYS.USER_ID);
            const savedUserProfile = localStorage.getItem(this.STORAGE_KEYS.USER_PROFILE);
            
            if (savedUserId && !this.currentUserId) {
                this.currentUserId = savedUserId;
            }
            
            if (savedUserProfile && !this.currentUserProfile) {
                this.currentUserProfile = JSON.parse(savedUserProfile);
            }
            
            if (savedUserId || savedUserProfile) {
                console.log('💾 Loaded user data from storage');
            }
        } catch (error) {
            console.warn('⚠️ Could not load user data from storage:', error);
        }
    }
    
    // Save current tab to localStorage
    saveCurrentTab(tabId) {
        try {
            localStorage.setItem(this.STORAGE_KEYS.LAST_TAB, tabId);
        } catch (error) {
            console.warn('⚠️ Could not save current tab:', error);
        }
    }
    
    // Restore last active tab
    restoreLastTab() {
        try {
            const lastTab = localStorage.getItem(this.STORAGE_KEYS.LAST_TAB);
            if (lastTab && this.modules.ui && this.modules.ui.showTab) {
                // Show last tab after a short delay
                setTimeout(() => {
                    this.ui.showTab(lastTab);
                }, 100);
            } else {
                // Default to dashboard tab
                this.ui.showTab('dashboard');
            }
        } catch (error) {
            console.warn('⚠️ Could not restore last tab:', error);
            this.ui.showTab('dashboard');
        }
    }
    
    // Setup beforeunload to save state
    setupBeforeUnload() {
        window.addEventListener('beforeunload', () => {
            this.saveUserDataToStorage();
            
            // Save current tab if UI module is available
            if (this.modules.ui && this.modules.ui.currentTab) {
                this.saveCurrentTab(this.ui.currentTab);
            }
        });
        
        // Also save on visibility change (tab switch)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.saveUserDataToStorage();
            }
        });
    }
    
    // Refresh all modules (call this on page refresh button)
    async refreshAll() {
        console.log('🔄 Refreshing all application data...');
        
        // Show loading indicator
        this.showToast('Refreshing application data...', 'info');
        
        try {
            // Clear caches
            this.clearCaches();
            
            // Re-initialize modules
            await this.initializeOtherModules();
            
            // Refresh dashboard
            if (this.modules.dashboard && this.dashboard.refreshDashboard) {
                await this.dashboard.refreshDashboard();
            }
            
            // Show success message
            this.showToast('Application refreshed successfully!', 'success');
            
        } catch (error) {
            console.error('❌ Error refreshing application:', error);
            this.showToast('Failed to refresh application', 'error');
        }
    }
    
    // Clear caches
    clearCaches() {
        // Clear localStorage cache
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('cache_')) {
                localStorage.removeItem(key);
            }
        });
        
        console.log('🗑️ Cleared application caches');
    }
    
    // Show toast notification
    showToast(message, type = 'info') {
        // Use UI module if available, otherwise create basic toast
        if (this.modules.ui && this.modules.ui.showToast) {
            this.ui.showToast(message, type);
        } else {
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.innerHTML = `
                <i class="fas fa-${type === 'success' ? 'check-circle' : 
                                  type === 'error' ? 'exclamation-circle' : 
                                  type === 'warning' ? 'exclamation-triangle' : 
                                  'info-circle'}"></i>
                ${message}
            `;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 4000);
        }
    }
    
    // Show error message
    showError(message) {
        this.showToast(message, 'error');
    }
    
    // Logout user
    async logout() {
        try {
            // Clear localStorage
            Object.keys(this.STORAGE_KEYS).forEach(key => {
                localStorage.removeItem(this.STORAGE_KEYS[key]);
            });
            
            // Clear all app-related localStorage items
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('app_')) {
                    localStorage.removeItem(key);
                }
            });
            
            // Clear sessionStorage
            sessionStorage.clear();
            
            // Call auth module logout if available
            if (this.modules.auth && this.modules.auth.logout) {
                await this.auth.logout();
            }
            
            // Redirect to login
            window.location.href = "login.html";
            
        } catch (error) {
            console.error('❌ Logout error:', error);
            window.location.href = "login.html";
        }
    }
    
    // Check if app is initialized
    isAppInitialized() {
        return this.isInitialized;
    }
    
    // Get current user info
    getCurrentUser() {
        return {
            id: this.currentUserId,
            profile: this.currentUserProfile
        };
    }
    
    // Update user profile (called from other modules)
    updateUserProfile(newProfile) {
        this.currentUserProfile = { ...this.currentUserProfile, ...newProfile };
        this.saveUserDataToStorage();
        
        // Notify all modules of profile update
        this.notifyModulesOfProfileUpdate();
    }
    
    // Notify all modules of profile update
    notifyModulesOfProfileUpdate() {
        // Notify dashboard
        if (this.modules.dashboard && this.dashboard.updateUserProfile) {
            this.dashboard.updateUserProfile(this.currentUserProfile);
        }
        
        // Notify profile module
        if (this.modules.profile && this.profile.updateUserProfile) {
            this.profile.updateUserProfile(this.currentUserProfile);
        }
        
        // Dispatch global event
        document.dispatchEvent(new CustomEvent('userProfileUpdated', {
            detail: { profile: this.currentUserProfile }
        }));
    }
}

// Create global app instance
let app = null;

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 DOM ready, initializing app...');
    
    // Check if APP_CONFIG is available
    if (!window.APP_CONFIG || !window.APP_CONFIG.SUPABASE_URL) {
        console.error('❌ APP_CONFIG not found or incomplete');
        document.body.innerHTML = `
            <div style="padding: 20px; text-align: center;">
                <h1 style="color: #ef4444;">Configuration Error</h1>
                <p>Application configuration is missing or incomplete.</p>
                <button onclick="location.reload()" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Retry
                </button>
            </div>
        `;
        return;
    }
    
    // Initialize app
    app = new App();
    app.initialize();
    
    // Make app globally accessible
    window.app = app;
    
    // Add refresh button handler
    const refreshBtn = document.getElementById('global-refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            if (app && app.refreshAll) {
                app.refreshAll();
            } else {
                location.reload();
            }
        });
    }
    
    // Add logout button handler
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (app && app.logout) {
                app.logout();
            } else {
                window.location.href = "login.html";
            }
        });
    }
});

// Global refresh function
function refreshApp() {
    if (window.app && window.app.refreshAll) {
        window.app.refreshAll();
    } else {
        location.reload();
    }
}

// Global logout function
function logoutApp() {
    if (window.app && window.app.logout) {
        window.app.logout();
    } else {
        window.location.href = "login.html";
    }
}

// Expose global functions
window.refreshApp = refreshApp;
window.logoutApp = logoutApp;

console.log('🏁 App module loaded');
