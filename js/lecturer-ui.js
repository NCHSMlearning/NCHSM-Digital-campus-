// js/lecturer-ui.js
/**
 * NCHSM Lecturer UI Module
 * Handles UI interactions, modals, tabs, and notifications
 */

const LecturerUI = {
    currentTab: 'dashboard',
    sidebarOpen: false,
    
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
    
    // Setup main event listeners
    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.nav a[data-tab]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = link.getAttribute('data-tab');
                this.showTab(tab);
                
                // Close mobile sidebar
                if (window.innerWidth <= 768) {
                    this.toggleSidebar(false);
                }
            });
        });
        
        // Card clicks
        document.querySelectorAll('.card[data-tab]').forEach(card => {
            card.addEventListener('click', () => {
                const tab = card.getAttribute('data-tab');
                this.showTab(tab);
            });
        });
        
        // ✅ Logout - Use lecturerDB
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                if (confirm('Are you sure you want to logout?')) {
                    if (window.lecturerDB && typeof window.lecturerDB.logout === 'function') {
                        await window.lecturerDB.logout();
                    } else {
                        window.location.href = 'login.html';
                    }
                }
            });
        }
        
        // Notification button
        const notifBtn = document.getElementById('notificationBtn');
        if (notifBtn) {
            notifBtn.addEventListener('click', () => {
                this.showNotification('Notifications feature coming soon!', 'info');
            });
        }
        
        // Help button
        const helpBtn = document.getElementById('helpBtn');
        if (helpBtn) {
            helpBtn.addEventListener('click', () => {
                this.showNotification('Help documentation is being prepared.', 'info');
            });
        }
        
        // Close modals on overlay click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });
        
        // Close modals with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
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
    // DROPDOWN MANAGEMENT - FIXED
    // ============================================
    
    setupDropdowns() {
        console.log('📂 Setting up dropdowns...');
        
        // Method 1: Handle onclick="toggleDropdown(event)" from HTML
        if (typeof window.toggleDropdown === 'undefined') {
            window.toggleDropdown = function(event) {
                event.preventDefault();
                event.stopPropagation();
                
                const parentLi = event.currentTarget.closest('.nav-dropdown');
                if (!parentLi) return;
                
                // Close all other dropdowns
                document.querySelectorAll('.nav-dropdown.open').forEach(dropdown => {
                    if (dropdown !== parentLi) {
                        dropdown.classList.remove('open');
                        const menu = dropdown.querySelector('.dropdown-menu');
                        if (menu) menu.style.display = 'none';
                    }
                });
                
                // Toggle current dropdown
                const isOpen = parentLi.classList.contains('open');
                parentLi.classList.toggle('open');
                const menu = parentLi.querySelector('.dropdown-menu');
                if (menu) {
                    menu.style.display = isOpen ? 'none' : 'block';
                }
            };
        }
        
        // Method 2: Also support the class-based approach
        document.querySelectorAll('.nav-dropdown .dropdown-toggle').forEach(toggle => {
            // Remove existing listener to avoid duplicates
            toggle.removeEventListener('click', this.handleDropdownClick);
            toggle.addEventListener('click', this.handleDropdownClick.bind(this));
        });
        
        // Close dropdowns on outside click
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
    
    handleDropdownClick(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const parentLi = e.currentTarget.closest('.nav-dropdown');
        if (!parentLi) return;
        
        // Close all other dropdowns
        document.querySelectorAll('.nav-dropdown.open').forEach(dropdown => {
            if (dropdown !== parentLi) {
                dropdown.classList.remove('open');
                const menu = dropdown.querySelector('.dropdown-menu');
                if (menu) menu.style.display = 'none';
            }
        });
        
        // Toggle current dropdown
        const isOpen = parentLi.classList.contains('open');
        parentLi.classList.toggle('open');
        const menu = parentLi.querySelector('.dropdown-menu');
        if (menu) {
            menu.style.display = isOpen ? 'none' : 'block';
        }
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
        
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.style.display = 'none';
            tab.classList.remove('active');
        });
        
        // Show target tab
        let target = document.getElementById(tabId);
        if (!target) {
            target = document.getElementById(tabId + '-content');
        }
        if (target) {
            target.style.display = 'block';
            target.classList.add('active');
        }
        
        // Update nav links
        document.querySelectorAll('.nav a[data-tab]').forEach(link => {
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
        // Close any open modals
        this.closeAllModals();
        
        // Load data based on tab
        switch (tabId) {
            case 'dashboard':
                if (window.LecturerDashboard) {
                    window.LecturerDashboard.loadMetrics();
                    window.LecturerDashboard.loadAttendanceMetrics();
                }
                break;
            case 'profile':
                if (window.LecturerProfile) {
                    window.LecturerProfile.loadProfile();
                }
                break;
            case 'my-courses':
                if (window.LecturerCourses) {
                    window.LecturerCourses.loadCourses();
                }
                break;
            case 'my-students':
                if (window.LecturerStudents) {
                    window.LecturerStudents.loadStudents();
                }
                break;
            case 'attendance':
                if (window.LecturerAttendance) {
                    window.LecturerAttendance.loadAttendance();
                }
                break;
            case 'cats':
                if (window.LecturerExams) {
                    window.LecturerExams.loadExams();
                }
                break;
            case 'marks-management':
                if (window.LecturerMarks) {
                    window.LecturerMarks.loadMarksManagement();
                }
                break;
            case 'resources':
                if (window.LecturerResources) {
                    window.LecturerResources.loadResources();
                }
                break;
            case 'messages':
                if (window.LecturerMessages) {
                    window.LecturerMessages.loadMessages();
                }
                break;
            case 'sessions':
                if (window.LecturerSessions) {
                    window.LecturerSessions.loadSessions();
                }
                break;
            default:
                console.log('No specific loader for tab:', tabId);
        }
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
    
    showNotification(message, type = 'success') {
        // Try using AppUtils first
        if (window.AppUtils && typeof window.AppUtils.showToast === 'function') {
            window.AppUtils.showToast(message, type);
            return;
        }
        
        // Try using the global showNotification
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
            return;
        }
        
        // Fallback to feedback message
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
            // Create a toast notification
            this.createToast(message, type);
        }
    },
    
    createToast(message, type = 'info') {
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
    
    showLoading(message = 'Loading...') {
        this.showNotification(message, 'info');
    },
    
    hideLoading() {
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
    
    filterTable(inputId, tableId, columnsToSearch = [0]) {
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
            for (let i = 0; i < columnsToSearch.length; i++) {
                const td = row.querySelectorAll('td')[columnsToSearch[i]];
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
    
    populateSelect(selectElement, data, valueKey, textKey, defaultText = 'Select') {
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
// GLOBAL TOGGLE DROPDOWN FUNCTION
// ============================================

// This handles the onclick="toggleDropdown(event)" from HTML
window.toggleDropdown = function(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const parentLi = event.currentTarget.closest('.nav-dropdown');
    if (!parentLi) return;
    
    // Close all other dropdowns
    document.querySelectorAll('.nav-dropdown.open').forEach(dropdown => {
        if (dropdown !== parentLi) {
            dropdown.classList.remove('open');
            const menu = dropdown.querySelector('.dropdown-menu');
            if (menu) menu.style.display = 'none';
        }
    });
    
    // Toggle current dropdown
    const isOpen = parentLi.classList.contains('open');
    parentLi.classList.toggle('open');
    const menu = parentLi.querySelector('.dropdown-menu');
    if (menu) {
        menu.style.display = isOpen ? 'none' : 'block';
    }
};

// ============================================
// INITIALIZATION
// ============================================

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Wait for lecturerDB to be ready
    const checkDb = setInterval(() => {
        if (window.lecturerDB && window.lecturerDB.isInitialized) {
            clearInterval(checkDb);
            LecturerUI.init();
            
            // Dispatch event that UI is ready
            document.dispatchEvent(new CustomEvent('uiReady'));
            console.log('✅ UI Ready event dispatched');
        }
    }, 100);
    
    // Fallback: initialize after 2 seconds even if DB not ready
    setTimeout(() => {
        if (!document.querySelector('.sidebar .nav')) {
            LecturerUI.init();
        }
    }, 2000);
});

// Make globally accessible
window.LecturerUI = LecturerUI;

console.log('✅ Lecturer UI module loaded');
