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
                    await window.lecturerDB?.logout();
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
            toggle.addEventListener('click', () => {
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
        const overlay = document.getElementById('overlay');
        
        if (!sidebar) return;
        
        if (forceState !== undefined) {
            this.sidebarOpen = forceState;
        } else {
            this.sidebarOpen = !this.sidebarOpen;
        }
        
        sidebar.classList.toggle('active', this.sidebarOpen);
        sidebar.classList.toggle('open', this.sidebarOpen);
        
        if (overlay) {
            overlay.classList.toggle('active', this.sidebarOpen);
        }
        
        document.body.style.overflow = this.sidebarOpen ? 'hidden' : '';
        
        const toggle = document.getElementById('mobileNavToggle');
        if (toggle) {
            toggle.setAttribute('aria-expanded', this.sidebarOpen);
        }
    },
    
    // Setup dropdown menus
    setupDropdowns() {
        document.querySelectorAll('.nav-dropdown .dropdown-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                const parent = toggle.closest('.nav-dropdown');
                const menu = parent?.querySelector('.dropdown-menu');
                
                if (menu) {
                    const isOpen = menu.style.display === 'block';
                    
                    // Close all other dropdowns
                    document.querySelectorAll('.nav-dropdown .dropdown-menu').forEach(m => {
                        if (m !== menu) {
                            m.style.display = 'none';
                            m.closest('.nav-dropdown')?.classList.remove('open');
                        }
                    });
                    
                    menu.style.display = isOpen ? 'none' : 'block';
                    parent?.classList.toggle('open', !isOpen);
                }
            });
        });
        
        // Close dropdowns on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.nav-dropdown')) {
                document.querySelectorAll('.nav-dropdown .dropdown-menu').forEach(menu => {
                    menu.style.display = 'none';
                    menu.closest('.nav-dropdown')?.classList.remove('open');
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
        
        // Update URL using SPA Router
        if (window.SPA_ROUTER && typeof window.SPA_ROUTER.updateURL === 'function') {
            window.SPA_ROUTER.updateURL(tabId);
        }
        
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.style.display = 'none';
            tab.classList.remove('active');
        });
        
        // Show target tab
        const target = document.getElementById(tabId + '-content');
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
            console.log(`[${type}] ${message}`);
        }
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

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    // ✅ Wait for lecturerDB to be ready
    const checkDb = setInterval(() => {
        if (window.lecturerDB && window.lecturerDB.isInitialized) {
            clearInterval(checkDb);
            LecturerUI.init();
            LecturerUI.updateCurrentDate();
            
            // Dispatch event that UI is ready
            document.dispatchEvent(new CustomEvent('uiReady'));
        }
    }, 100);
});

// Make globally accessible
window.LecturerUI = LecturerUI;
