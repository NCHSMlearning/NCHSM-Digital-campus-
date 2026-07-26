// ============================================================
// LECTURER UI MODULE - COMPLETE FIXED VERSION
// ============================================================

// ============================================================
// GLOBAL FUNCTIONS (NO toggleDropdown - using Super Admin style)
// ============================================================

// ============================================================
// LOGOUT WITH NICE MODAL
// ============================================================

// Open logout modal
window.openLogoutModal = function() {
    const modal = document.getElementById('logoutModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    } else {
        // Fallback if modal doesn't exist
        if (confirm('Are you sure you want to logout?')) {
            performLogout();
        }
    }
};

// Close logout modal
window.closeLogoutModal = function() {
    const modal = document.getElementById('logoutModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
};

// Perform actual logout
window.performLogout = function() {
    // Show loading
    if (typeof window.showLoading === 'function') {
        window.showLoading('Logging out...');
    }
    
    // Clear storage
    localStorage.removeItem('lecturerEmail');
    sessionStorage.removeItem('lecturerEmail');
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    localStorage.removeItem('supabase.auth.token');
    
    // Use lecturerDB if available
    if (window.lecturerDB && typeof window.lecturerDB.logout === 'function') {
        window.lecturerDB.logout();
    } else {
        if (typeof window.hideLoading === 'function') {
            window.hideLoading();
        }
        window.location.href = 'login.html';
    }
};

// Confirm logout (called from modal button)
window.confirmLogout = function() {
    // Close modal first
    if (typeof window.closeLogoutModal === 'function') {
        window.closeLogoutModal();
    }
    
    // Perform logout after a tiny delay for smooth transition
    setTimeout(function() {
        performLogout();
    }, 200);
};

// Main logout function - overrides the old one
window.logout = function(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    // Try to open the nice modal
    if (document.getElementById('logoutModal')) {
        if (typeof window.openLogoutModal === 'function') {
            window.openLogoutModal();
            return;
        }
    }
    
    // Fallback to old confirm
    if (confirm('Are you sure you want to logout?')) {
        performLogout();
    }
};

// Close modal on Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modal = document.getElementById('logoutModal');
        if (modal && modal.style.display === 'flex') {
            if (typeof window.closeLogoutModal === 'function') {
                window.closeLogoutModal();
            }
        }
    }
});

// Close modal on outside click
document.addEventListener('click', function(e) {
    const modal = document.getElementById('logoutModal');
    if (modal && modal.style.display === 'flex') {
        const content = modal.querySelector('.modal-content');
        if (content && !content.contains(e.target)) {
            if (typeof window.closeLogoutModal === 'function') {
                window.closeLogoutModal();
            }
        }
    }
});

console.log('✅ Logout modal functions loaded');

// ============================================================
// CLOSE MODAL FUNCTION
// ============================================================

// Define closeModal function
if (typeof window.closeModal === 'undefined') {
    window.closeModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    };
}

// ============================================================
// NOTIFICATION FUNCTIONS
// ============================================================

// Define showNotification function
if (typeof window.showNotification === 'undefined') {
    window.showNotification = function(message, type) {
        type = type || 'info';
        const colors = {
            success: '#059669',
            error: '#dc2626',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        
        document.querySelectorAll('.custom-notification').forEach(el => el.remove());
        
        const notification = document.createElement('div');
        notification.className = 'custom-notification';
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; padding: 14px 24px;
            background: ${colors[type] || '#3b82f6'}; color: white;
            border-radius: 10px; font-weight: 500; z-index: 100000;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            max-width: 450px; font-size: 14px;
            animation: slideIn 0.3s ease-out;
            border-left: 4px solid rgba(255,255,255,0.3);
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(20px)';
            notification.style.transition = 'all 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    };
}

// Define showLoading function
if (typeof window.showLoading === 'undefined') {
    window.showLoading = function(message) {
        message = message || 'Loading...';
        let overlay = document.getElementById('loadingOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loadingOverlay';
            overlay.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.6); z-index: 9999;
                display: flex; align-items: center; justify-content: center;
                flex-direction: column;
            `;
            overlay.innerHTML = `
                <div style="background: white; padding: 30px 40px; border-radius: 12px; text-align: center; min-width: 200px;">
                    <div class="loading-spinner" style="border: 4px solid #e2e8f0; border-top: 4px solid #4C1D95; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 15px;"></div>
                    <p style="color: #1e293b; font-weight: 500;" id="loadingMessage">${message}</p>
                </div>
            `;
            document.body.appendChild(overlay);
        } else {
            const msg = document.getElementById('loadingMessage');
            if (msg) msg.textContent = message;
            overlay.style.display = 'flex';
        }
    };
}

// Define hideLoading function
if (typeof window.hideLoading === 'undefined') {
    window.hideLoading = function() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.style.display = 'none';
    };
}

// Add animation styles if not present
(function addGlobalStyles() {
    if (document.getElementById('lecturerGlobalStyles')) return;
    const style = document.createElement('style');
    style.id = 'lecturerGlobalStyles';
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(20px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        /* Dropdown styles - Super Admin style */
        .nav-dropdown {
            position: relative;
        }
        .nav-dropdown .dropdown-menu {
            display: none !important;
            list-style: none;
            padding: 4px 0 4px 20px;
            margin: 0;
            background: rgba(255,255,255,0.05);
            border-left: 2px solid rgba(253,185,19,0.3);
            border-radius: 0 0 8px 8px;
            min-width: 200px;
            position: absolute;
            top: 100%;
            left: 0;
            z-index: 999999;
        }
        .nav-dropdown.open .dropdown-menu {
            display: block !important;
            animation: dropdownSlide 0.3s ease;
        }
        .nav-dropdown.open > a {
            background: rgba(255,255,255,0.1) !important;
            border-left: 3px solid #FDB913 !important;
        }
        .nav-dropdown.open > a i.fa-chevron-down {
            transform: rotate(180deg);
        }
        .nav-dropdown > a i.fa-chevron-down {
            transition: transform 0.3s ease;
        }
        .nav-dropdown .dropdown-menu li a {
            display: flex !important;
            align-items: center !important;
            gap: 12px;
            padding: 8px 14px 8px 30px !important;
            border-radius: 8px;
            color: rgba(255,255,255,0.85) !important;
            text-decoration: none;
            font-size: 13px;
            transition: all 0.2s;
        }
        .nav-dropdown .dropdown-menu li a:hover {
            background: rgba(255,255,255,0.1) !important;
            color: #FDB913 !important;
        }
        .nav-dropdown .dropdown-menu li a i {
            width: 18px;
            text-align: center;
            font-size: 12px;
        }
        @keyframes dropdownSlide {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(style);
})();

console.log('✅ Global functions registered for lecturer');

// ============================================================
// DROPDOWN TOGGLE - SAME AS SUPER ADMIN (NO toggleDropdown function)
// ============================================================
(function() {
    function initDropdowns() {
        const dropdownToggles = document.querySelectorAll('.nav-dropdown > a');
        dropdownToggles.forEach(toggle => {
            toggle.removeEventListener('click', handleDropdownClick);
            toggle.addEventListener('click', handleDropdownClick);
        });
    }
    
    function handleDropdownClick(e) {
        e.preventDefault();
        e.stopPropagation();
        const parentLi = this.closest('.nav-dropdown');
        
        // Close all other dropdowns
        document.querySelectorAll('.nav-dropdown').forEach(dropdown => {
            if (dropdown !== parentLi) {
                dropdown.classList.remove('open');
            }
        });
        
        // Toggle current dropdown
        parentLi.classList.toggle('open');
    }
    
    function closeDropdownsOnClickOutside(e) {
        if (!e.target.closest('.nav-dropdown')) {
            document.querySelectorAll('.nav-dropdown').forEach(dropdown => {
                dropdown.classList.remove('open');
            });
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            initDropdowns();
            document.addEventListener('click', closeDropdownsOnClickOutside);
        });
    } else {
        initDropdowns();
        document.addEventListener('click', closeDropdownsOnClickOutside);
    }
})();

// ============================================================
// LECTURER UI CLASS
// ============================================================

const LecturerUI = {
    currentTab: 'dashboard',
    sidebarOpen: false,
    
    // Tab ID mapping
    tabMapping: {
        'dashboard': 'dashboard-content',
        'profile': 'profile-content',
        'my-courses': 'my-courses-content',
        'my-students': 'my-students-content',
        'sessions': 'sessions-content',
        'attendance': 'attendance-content',
        'cats': 'cats-content',
        'marks-management': 'marks-management-content',
        'resources': 'resources-content',
        'reports': 'reports-content',
        'nurse-iq': 'nurse-iq-content',
        'messages': 'messages-content',
        'calendar': 'calendar-content',
        'settings': 'settings-content'
    },
    
    // Initialize UI
    init() {
        console.log('🎨 Initializing Lecturer UI...');
        this.setupEventListeners();
        this.setupMobileNav();
        this.setupDropdowns();
        this.loadTheme();
        this.updateCurrentDate();
        console.log('✅ Lecturer UI initialized');
    },
    
    // ============================================
    // SETUP EVENT LISTENERS - FIXED FOR #mainNav
    // ============================================
    
    setupEventListeners() {
        console.log('🎯 Setting up event listeners...');
        
        // ============================================
        // FIX: Sidebar navigation using #mainNav
        // ============================================
        
        // Get all sidebar links from #mainNav
        const sidebarLinks = document.querySelectorAll('#mainNav a[data-tab]');
        console.log(`🔗 Found ${sidebarLinks.length} sidebar links`);
        
        sidebarLinks.forEach(link => {
            const tab = link.getAttribute('data-tab');
            
            // Remove any existing event listeners by cloning
            const newLink = link.cloneNode(true);
            link.parentNode.replaceChild(newLink, link);
            
            // Add click handler
            newLink.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log(`🖱️ CLICKED: ${tab}`);
                
                // Close dropdown if inside one
                const parent = this.closest('.nav-dropdown');
                if (parent) {
                    parent.classList.remove('open');
                    const menu = parent.querySelector('.dropdown-menu');
                    if (menu) menu.style.display = 'none';
                }
                
                // Show tab
                if (window.LecturerUI && typeof window.LecturerUI.showTab === 'function') {
                    window.LecturerUI.showTab(tab);
                } else {
                    console.error('❌ LecturerUI.showTab not found');
                    // Fallback: manual tab switching
                    document.querySelectorAll('.tab-content').forEach(el => {
                        el.style.display = 'none';
                        el.classList.remove('active');
                    });
                    const target = document.getElementById(tab + '-content') || document.getElementById(tab);
                    if (target) {
                        target.style.display = 'block';
                        target.classList.add('active');
                        console.log(`✅ Manual fallback: ${tab}`);
                    }
                }
            });
        });
        
        // ============================================
        // FIX: Dropdown toggles using #mainNav
        // ============================================
        
        document.querySelectorAll('#mainNav .dropdown-toggle').forEach(toggle => {
            // Remove existing listeners
            const newToggle = toggle.cloneNode(true);
            toggle.parentNode.replaceChild(newToggle, toggle);
            
            newToggle.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('📂 Toggle dropdown');
                
                const parent = this.closest('.nav-dropdown');
                if (parent) {
                    parent.classList.toggle('open');
                    const menu = parent.querySelector('.dropdown-menu');
                    if (menu) {
                        menu.style.display = parent.classList.contains('open') ? 'block' : 'none';
                    }
                }
            });
        });
        
        // ============================================
        // Card clicks
        // ============================================
        
        document.querySelectorAll('.card[data-tab]').forEach(card => {
            card.addEventListener('click', () => {
                const tab = card.getAttribute('data-tab');
                console.log(`🃏 Card clicked: ${tab}`);
                this.showTab(tab);
            });
        });
        
        // ============================================
        // Logout - UPDATED to use nice modal
        // ============================================
        
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Use the nice logout modal
                if (typeof window.openLogoutModal === 'function') {
                    window.openLogoutModal();
                } else {
                    // Fallback
                    if (confirm('Are you sure you want to logout?')) {
                        if (window.lecturerDB && typeof window.lecturerDB.logout === 'function') {
                            window.lecturerDB.logout();
                        } else {
                            window.location.href = 'login.html';
                        }
                    }
                }
            });
        }
        
        // ============================================
        // Notification button
        // ============================================
        
        const notifBtn = document.getElementById('notificationBtn');
        if (notifBtn) {
            notifBtn.addEventListener('click', () => {
                this.showNotification('Notifications feature coming soon!', 'info');
            });
        }
        
        // ============================================
        // Help button
        // ============================================
        
        const helpBtn = document.getElementById('helpBtn');
        if (helpBtn) {
            helpBtn.addEventListener('click', () => {
                this.showNotification('Help documentation is being prepared.', 'info');
            });
        }
        
        // ============================================
        // Close modals on overlay click
        // ============================================
        
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });
        
        // ============================================
        // Close modals with Escape key
        // ============================================
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
        
        console.log('✅ All event listeners setup complete!');
    },
    
    // Setup mobile navigation
    setupMobileNav() {
        const toggle = document.getElementById('mobileNavToggle');
        const sidebar = document.getElementById('sidebar');
        
        if (toggle && sidebar) {
            // Remove any existing listeners
            const newToggle = toggle.cloneNode(true);
            toggle.parentNode.replaceChild(newToggle, toggle);
            
            newToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleSidebar();
            });
        }
        
        // Close sidebar on outside click
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                const sidebar = document.getElementById('sidebar');
                const toggle = document.getElementById('mobileNavToggle');
                if (sidebar && !sidebar.contains(e.target) && !toggle?.contains(e.target)) {
                    this.toggleSidebar(false);
                }
            }
        });
    },
    
    // Toggle sidebar
    toggleSidebar(forceState) {
        const sidebar = document.getElementById('sidebar');
        const toggle = document.getElementById('mobileNavToggle');
        
        if (!sidebar) return;
        
        if (forceState !== undefined) {
            this.sidebarOpen = forceState;
        } else {
            this.sidebarOpen = !this.sidebarOpen;
        }
        
        sidebar.classList.toggle('active', this.sidebarOpen);
        sidebar.classList.toggle('open', this.sidebarOpen);
        
        if (toggle) {
            toggle.setAttribute('aria-expanded', this.sidebarOpen);
        }
        
        document.body.style.overflow = this.sidebarOpen ? 'hidden' : '';
    },
    
    // ============================================
    // DROPDOWN MANAGEMENT
    // ============================================
    
    setupDropdowns() {
        console.log('📂 Setting up dropdowns...');
        // Just close dropdowns on outside click - the main handler is already in the IIFE above
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.nav-dropdown')) {
                document.querySelectorAll('.nav-dropdown.open').forEach(dropdown => {
                    dropdown.classList.remove('open');
                    const menu = dropdown.querySelector('.dropdown-menu');
                    if (menu) menu.style.display = 'none';
                });
            }
        });
    },
    
    // Load theme preference
    loadTheme() {
        const savedTheme = localStorage.getItem('nchsm_theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
        }
    },
    
    // Toggle theme
    toggleTheme() {
        const isDark = document.body.classList.toggle('dark-theme');
        localStorage.setItem('nchsm_theme', isDark ? 'dark' : 'light');
        return isDark;
    },
    
    // ==========================================
    // TAB MANAGEMENT
    // ==========================================
    
    showTab(tabId) {
        console.log('📂 Opening tab:', tabId);
        
        // Update URL using SPA Router if available
        if (window.SPA_ROUTER && typeof window.SPA_ROUTER.updateURL === 'function') {
            window.SPA_ROUTER.updateURL(tabId);
        }
        
        // Get the actual section ID from mapping
        const sectionId = this.tabMapping[tabId] || tabId;
        console.log('📌 Looking for section:', sectionId);
        
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.style.display = 'none';
            tab.classList.remove('active');
        });
        
        // Show target tab
        const target = document.getElementById(sectionId);
        if (target) {
            target.style.display = 'block';
            target.classList.add('active');
            console.log('✅ Tab opened:', sectionId);
        } else {
            console.warn('⚠️ Tab not found:', sectionId);
            const fallback = document.querySelector(`.tab-content[data-tab="${tabId}"]`);
            if (fallback) {
                fallback.style.display = 'block';
                fallback.classList.add('active');
                console.log('✅ Tab opened via fallback:', tabId);
            }
        }
        
        // Update nav links - using #mainNav
        document.querySelectorAll('#mainNav a[data-tab]').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-tab') === tabId) {
                link.classList.add('active');
            }
        });
        
        // Update current tab
        this.currentTab = tabId;
        
        // Save state
        localStorage.setItem('nchsm_current_tab', tabId);
        
        // Load section data
        this.loadSectionData(tabId);
        
        // Close mobile sidebar
        if (window.innerWidth <= 768) {
            this.toggleSidebar(false);
        }
    },
    
    // Load data for a specific section
    loadSectionData(tabId) {
        console.log('📊 Loading data for tab:', tabId);
        
        this.closeAllModals();
        
        switch (tabId) {
            case 'dashboard':
                console.log('🔄 Loading dashboard...');
                if (window.LecturerDashboard) {
                    if (typeof window.LecturerDashboard.loadMetrics === 'function') {
                        window.LecturerDashboard.loadMetrics();
                    }
                    if (typeof window.LecturerDashboard.loadAttendanceMetrics === 'function') {
                        window.LecturerDashboard.loadAttendanceMetrics();
                    }
                } else {
                    console.warn('⚠️ LecturerDashboard not found');
                    this.updateDashboardStats();
                }
                break;
                
            case 'profile':
                console.log('👤 Loading profile...');
                if (window.LecturerProfile && typeof window.LecturerProfile.loadProfile === 'function') {
                    window.LecturerProfile.loadProfile();
                }
                break;
                
            case 'my-courses':
                console.log('📚 Loading courses...');
                if (window.LecturerCourses && typeof window.LecturerCourses.loadCourses === 'function') {
                    window.LecturerCourses.loadCourses();
                }
                break;
                
            case 'my-students':
                console.log('👨‍🎓 Loading students...');
                if (window.LecturerStudents && typeof window.LecturerStudents.loadStudents === 'function') {
                    window.LecturerStudents.loadStudents();
                }
                break;
                
            case 'sessions':
                console.log('📅 Loading sessions...');
                if (window.LecturerSessions && typeof window.LecturerSessions.loadSessions === 'function') {
                    window.LecturerSessions.loadSessions();
                }
                break;
                
            case 'attendance':
                console.log('📋 Loading attendance...');
                if (window.LecturerAttendance && typeof window.LecturerAttendance.loadAttendance === 'function') {
                    window.LecturerAttendance.loadAttendance();
                }
                break;
                
            case 'cats':
                console.log('📝 Loading exams...');
                if (window.LecturerExams && typeof window.LecturerExams.loadExams === 'function') {
                    window.LecturerExams.loadExams();
                }
                break;
       
case 'marks-management':
    console.log('📊 Loading marks management...');
    
    // ✅ Call the standalone functions directly - THEY WORK!
    if (typeof detectLecturerProgram === 'function') {
        detectLecturerProgram().then(() => {
            if (typeof loadMEBlocks === 'function') loadMEBlocks();
            if (typeof loadMESubjects === 'function') loadMESubjects();
            if (typeof loadMarksEntry === 'function') loadMarksEntry();
        });
    } else {
        console.warn('⚠️ detectLecturerProgram not found');
    }
    break;
                
            case 'resources':
                console.log('📎 Loading resources...');
                if (window.LecturerResources && typeof window.LecturerResources.loadResources === 'function') {
                    window.LecturerResources.loadResources();
                }
                break;
                
            case 'messages':
                console.log('💬 Loading messages...');
                if (window.LecturerMessages && typeof window.LecturerMessages.loadMessages === 'function') {
                    window.LecturerMessages.loadMessages();
                }
                break;
                
            default:
                console.log('No specific loader for tab:', tabId);
        }
    },
    
    // Fallback method to update dashboard stats directly
    updateDashboardStats() {
        console.log('📊 Updating dashboard stats (fallback)...');
        const stats = {
            'totalStudentsCount': '0',
            'totalCoursesCount': '0',
            'studentsAtRiskCount': '0',
            'pendingAttendanceCount': '0',
            'examsDueCount': '0',
            'unreadMessagesCount': '0',
            'todayAttendanceTotal': '0',
            'weeklyAttendanceTotal': '0',
            'monthlyAttendanceRate': '0%',
            'overallAttendanceTotal': '0'
        };
        
        Object.keys(stats).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = stats[id];
        });
    },
    
    // ==========================================
    // MODAL MANAGEMENT
    // ==========================================
    
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    },
    
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    },
    
    closeAllModals() {
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
            modal.style.display = 'none';
        });
        document.body.style.overflow = '';
    },
    
    // ==========================================
    // NOTIFICATIONS
    // ==========================================
    
    showNotification(message, type) {
        type = type || 'success';
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
            return;
        }
        const el = document.getElementById('feedbackMessage');
        if (el) {
            el.textContent = message;
            el.className = 'feedback-' + type;
            el.style.display = 'block';
            if (type !== 'error') {
                setTimeout(() => {
                    el.style.display = 'none';
                }, 5000);
            }
        } else {
            this.createToast(message, type);
        }
    },
    
    createToast(message, type) {
        type = type || 'info';
        const colors = {
            success: '#059669',
            error: '#dc2626',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed; top: 20px; right: 20px; padding: 14px 24px;
            background: ${colors[type] || '#3b82f6'}; color: white;
            border-radius: 10px; font-weight: 500; z-index: 100000;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            max-width: 450px; font-size: 14px;
            animation: slideIn 0.3s ease-out;
            border-left: 4px solid rgba(255,255,255,0.3);
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(20px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    },
    
    showLoading(message) {
        message = message || 'Loading...';
        if (typeof window.showLoading === 'function') {
            window.showLoading(message);
            return;
        }
        this.showNotification(message, 'info');
    },
    
    hideLoading() {
        if (typeof window.hideLoading === 'function') {
            window.hideLoading();
            return;
        }
        const el = document.getElementById('feedbackMessage');
        if (el) {
            el.style.display = 'none';
        }
    },
    
    showGlobalLoading(show) {
        let overlay = document.getElementById('globalLoadingOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'globalLoadingOverlay';
            overlay.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.5); z-index: 9999;
                display: none; flex-direction: column;
                justify-content: center; align-items: center;
                color: white; font-size: 1.2rem;
            `;
            overlay.innerHTML = `
                <div class="loading-spinner"></div>
                <p style="margin-top:10px;">Loading...</p>
            `;
            document.body.appendChild(overlay);
        }
        overlay.style.display = show ? 'flex' : 'none';
    },
    
    // ==========================================
    // TABLE HELPERS
    // ==========================================
    
    filterTable(inputId, tableId, columnsToSearch) {
        columnsToSearch = columnsToSearch || [0];
        const filter = document.getElementById(inputId)?.value?.toUpperCase() || '';
        const tbody = document.getElementById(tableId);
        if (!tbody) return 0;
        const rows = tbody.querySelectorAll('tr');
        let visible = 0;
        rows.forEach(row => {
            if (row.querySelectorAll('td').length === 0) {
                row.style.display = '';
                return;
            }
            let matches = false;
            const cells = row.querySelectorAll('td');
            for (let i = 0; i < columnsToSearch.length; i++) {
                const td = cells[columnsToSearch[i]];
                if (td) {
                    const text = (td.textContent || td.innerText || '').toUpperCase();
                    if (text.includes(filter)) {
                        matches = true;
                        break;
                    }
                }
            }
            row.style.display = matches ? '' : 'none';
            if (matches) visible++;
        });
        return visible;
    },
    
    // ==========================================
    // FORM HELPERS
    // ==========================================
    
    populateSelect(selectElement, data, valueKey, textKey, defaultText) {
        defaultText = defaultText || 'Select';
        if (!selectElement) return;
        selectElement.innerHTML = `<option value="">-- ${defaultText} --</option>`;
        if (!data || !data.length) return;
        data.forEach(item => {
            const value = item[valueKey] || item.id || '';
            const text = item[textKey] || item.name || value;
            const option = document.createElement('option');
            option.value = value;
            option.textContent = text;
            selectElement.appendChild(option);
        });
    },
    
    getFormData(formId) {
        const form = document.getElementById(formId);
        if (!form) return {};
        const formData = new FormData(form);
        const data = {};
        for (const [key, value] of formData.entries()) {
            if (value instanceof File) {
                data[key] = value;
            } else {
                data[key] = value.trim();
            }
        }
        return data;
    },
    
    setFormData(formId, data) {
        const form = document.getElementById(formId);
        if (!form) return;
        Object.keys(data).forEach(key => {
            const input = form.querySelector(`[name="${key}"]`) || document.getElementById(key);
            if (input) {
                if (input.type === 'checkbox') {
                    input.checked = !!data[key];
                } else if (input.type !== 'file') {
                    input.value = data[key] || '';
                }
            }
        });
    },
    
    // ==========================================
    // DATE HELPERS FOR UI
    // ==========================================
    
    updateCurrentDate() {
        const el = document.getElementById('currentDate');
        if (el) {
            el.textContent = new Date().toLocaleDateString('en-GB', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        }
    }
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM Ready - Initializing Lecturer UI...');
    const checkDb = setInterval(() => {
        if (window.lecturerDB && window.lecturerDB.isInitialized) {
            clearInterval(checkDb);
            LecturerUI.init();
            document.dispatchEvent(new CustomEvent('uiReady'));
            console.log('✅ UI Ready event dispatched');
        }
    }, 100);
    setTimeout(() => {
        if (!document.querySelector('.sidebar .nav')) {
            console.log('⏳ Fallback initialization...');
            LecturerUI.init();
        }
    }, 3000);
});

// Make globally accessible
window.LecturerUI = LecturerUI;

console.log('✅ Lecturer UI module loaded');
console.log('✅ toggleDropdown: REMOVED (using Super Admin style)');
console.log('✅ logout modal functions loaded');
console.log('✅ showNotification:', typeof window.showNotification);
console.log('✅ showLoading:', typeof window.showLoading);
console.log('✅ hideLoading:', typeof window.hideLoading);
