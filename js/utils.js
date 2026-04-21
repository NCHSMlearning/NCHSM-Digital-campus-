// utils.js - Simple Utility Functions from NCHSM Dashboard

// Utility to safely escape HTML
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Simple AppUtils object from the original code
const AppUtils = {
    // Show loading state
    showLoading(element, message = 'Loading...') {
        if (element) {
            element.innerHTML = `<div class="loading-state">${message}</div>`;
        }
    },

    // Show error state
    showError(element, message) {
        if (element) {
            element.innerHTML = `<div class="error-state">${message}</div>`;
        }
    },

    // Safe API call wrapper
    async safeApiCall(apiCall, errorMessage = 'Operation failed') {
        try {
            return await apiCall();
        } catch (error) {
            console.error(errorMessage, error);
            this.showToast(errorMessage, 'error');
            return null;
        }
    },

    // Toast notification
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 4000);
    }
};

// Get device ID function
function getDeviceId() {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
}

// Calculate distance using Haversine formula (for attendance)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in meters
    const toRad = x => x * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const lat1Rad = toRad(lat1);
    const lat2Rad = toRad(lat2);
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon/2)**2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Format date utility
function formatDate(dateString, format = 'medium') {
    const date = new Date(dateString);
    if (!dateString || isNaN(date)) return 'N/A';
    
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (format === 'relative') {
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }
    
    const options = {
        short: { month: 'short', day: 'numeric' },
        medium: { month: 'short', day: 'numeric', year: 'numeric' },
        long: { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' },
        time: { hour: '2-digit', minute: '2-digit' }
    };
    
    return date.toLocaleDateString('en-US', options[format] || options.medium);
}

// Cache implementation (simple)
const cache = {
    data: new Map(),
    set(key, value, ttl = 5 * 60 * 1000) { // 5 minutes default
        this.data.set(key, {
            value,
            expiry: Date.now() + ttl,
            timestamp: new Date().toISOString()
        });
    },
    get(key) {
        const item = this.data.get(key);
        if (!item) return null;
        if (Date.now() > item.expiry) {
            this.data.delete(key);
            return null;
        }
        return item.value;
    },
    clear() {
        this.data.clear();
    }
};
// ========== SPA ROUTER - Handle page refreshes and deep linking ==========
const SPA_ROUTER = {
    // Valid tabs in your app
    validTabs: ['dashboard', 'profile', 'calendar', 'learning-hub', 'attendance', 'cats', 'resources', 'messages', 'support-tickets', 'nurseiq'],
    
    // Get current tab from URL hash
    getCurrentTabFromHash() {
        let hash = window.location.hash.substring(1);
        
        // Remove any query parameters
        if (hash.includes('?')) {
            hash = hash.split('?')[0];
        }
        
        // Validate tab
        if (hash && this.validTabs.includes(hash)) {
            return hash;
        }
        
        // Default to dashboard
        return 'dashboard';
    },
    
    // Show the correct tab based on URL
    showTabFromURL() {
        const targetTab = this.getCurrentTabFromHash();
        console.log('📍 Loading tab from URL:', targetTab);
        
        // Function to actually show the tab
        const activateTab = () => {
            if (window.ui && typeof window.ui.showTab === 'function') {
                window.ui.showTab(targetTab);
            } else {
                // Fallback: manually show tab
                document.querySelectorAll('.tab-content').forEach(tab => {
                    tab.classList.remove('active');
                    tab.hidden = true;
                });
                
                const targetElement = document.getElementById(targetTab);
                if (targetElement) {
                    targetElement.classList.add('active');
                    targetElement.hidden = false;
                }
                
                // Update active nav link
                document.querySelectorAll('.nav a').forEach(link => {
                    link.classList.remove('active');
                    const linkTab = link.getAttribute('data-tab');
                    if (linkTab === targetTab) {
                        link.classList.add('active');
                    }
                });
            }
        };
        
        // Try immediately, or wait for app to load
        if (window.ui && window.ui.showTab) {
            activateTab();
        } else {
            document.addEventListener('appReady', activateTab);
            // Also try DOMContentLoaded
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', activateTab);
            } else {
                activateTab();
            }
        }
    },
    
    // Update URL when tab changes (without page reload)
    updateURL(tab) {
        let newUrl = window.location.pathname;
        
        if (tab && tab !== 'dashboard') {
            newUrl = window.location.pathname + '#' + tab;
        }
        
        // Update URL without triggering reload
        if (window.location.pathname + window.location.hash !== newUrl) {
            history.pushState({ tab: tab }, '', newUrl);
        }
    },
    
    // Initialize router
    init() {
        // Listen for hash changes (browser back/forward)
        window.addEventListener('hashchange', () => {
            const tab = this.getCurrentTabFromHash();
            if (window.ui && typeof window.ui.showTab === 'function') {
                window.ui.showTab(tab);
            } else {
                // Fallback
                document.querySelectorAll('.tab-content').forEach(t => {
                    t.classList.remove('active');
                    t.hidden = true;
                });
                const targetTab = document.getElementById(tab);
                if (targetTab) {
                    targetTab.classList.add('active');
                    targetTab.hidden = false;
                }
            }
        });
        
        // Listen for popstate (back/forward buttons)
        window.addEventListener('popstate', () => {
            const tab = this.getCurrentTabFromHash();
            if (window.ui && typeof window.ui.showTab === 'function') {
                window.ui.showTab(tab);
            }
        });
        
        // Override the global showTab function if it exists
        if (window.ui && window.ui.showTab) {
            const originalShowTab = window.ui.showTab;
            window.ui.showTab = (tab) => {
                this.updateURL(tab);
                return originalShowTab.call(window.ui, tab);
            };
        }
        
        // Watch for tab clicks on navigation
        document.addEventListener('click', (e) => {
            const link = e.target.closest('.nav a, [data-tab]');
            if (link && link.getAttribute('data-tab')) {
                const tab = link.getAttribute('data-tab');
                if (tab && this.validTabs.includes(tab)) {
                    e.preventDefault();
                    this.updateURL(tab);
                    
                    if (window.ui && typeof window.ui.showTab === 'function') {
                        window.ui.showTab(tab);
                    } else {
                        // Fallback
                        document.querySelectorAll('.tab-content').forEach(t => {
                            t.classList.remove('active');
                            t.hidden = true;
                        });
                        const targetTab = document.getElementById(tab);
                        if (targetTab) {
                            targetTab.classList.add('active');
                            targetTab.hidden = false;
                        }
                        document.querySelectorAll('.nav a').forEach(navLink => {
                            navLink.classList.remove('active');
                        });
                        link.classList.add('active');
                    }
                }
            }
        });
        
        // Initialize - show correct tab on page load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.showTabFromURL());
        } else {
            this.showTabFromURL();
        }
        
        // Also handle when app is ready
        document.addEventListener('appReady', () => this.showTabFromURL());
        
        console.log('✅ SPA Router initialized');
    }
};

// Initialize router when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SPA_ROUTER.init());
} else {
    SPA_ROUTER.init();
}

// Export router globally
window.SPA_ROUTER = SPA_ROUTER;
// Export the utilities
window.escapeHtml = escapeHtml;
window.AppUtils = AppUtils;
window.getDeviceId = getDeviceId;
window.calculateDistance = calculateDistance;
window.formatDate = formatDate;
window.cache = cache;
