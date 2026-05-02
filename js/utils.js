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

// Export the utilities
window.escapeHtml = escapeHtml;
window.AppUtils = AppUtils;
window.getDeviceId = getDeviceId;
window.calculateDistance = calculateDistance;
window.formatDate = formatDate;
window.cache = cache;

// ========== SPA ROUTER - CLEAN URL NAVIGATION (NO DUPLICATE HASHTAGS) ==========
const SPA_ROUTER = {
    // Valid tabs in your app
    validTabs: ['dashboard', 'profile', 'calendar', 'learning-hub', 'attendance', 'cats', 'resources', 'messages', 'support-tickets', 'nurseiq', 'exam-card'],
    
    // Get current tab from URL hash only (clean method)
    getCurrentTab() {
        // ONLY check hash - ignore pathname to avoid duplicates
        let hash = window.location.hash.substring(1);
        
        // Remove any query parameters
        if (hash.includes('?')) {
            hash = hash.split('?')[0];
        }
        
        // Remove any duplicate hashtags (if somehow there are multiple #)
        if (hash.includes('#')) {
            hash = hash.split('#')[0];
        }
        
        // Validate tab from hash
        if (hash && this.validTabs.includes(hash)) {
            return hash;
        }
        
        // Default to dashboard
        return 'dashboard';
    },
    
    // Show the correct tab based on URL
    showTabFromURL() {
        const targetTab = this.getCurrentTab();
        console.log('📍 Loading tab from URL:', targetTab);
        
        // Function to actually show the tab
        const activateTab = () => {
            // Try using UI module first
            if (window.ui && typeof window.ui.showTab === 'function') {
                // Only call showTab if it's different from current
                if (window.ui.currentTab !== targetTab) {
                    window.ui.showTab(targetTab);
                }
            } 
            // Fallback: manually show tab
            else {
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
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', activateTab);
            } else {
                activateTab();
            }
        }
    },
    
    // Update URL when tab changes (clean - no duplicates)
    updateURL(tab) {
        // Use ONLY hash for navigation - clean and simple
        let newUrl = '/student';
        
        if (tab && tab !== 'dashboard') {
            newUrl = '/student#' + tab;
        } else {
            newUrl = '/student';
        }
        
        // Update URL without triggering reload
        const currentUrl = window.location.pathname + window.location.hash;
        if (currentUrl !== newUrl) {
            history.pushState({ tab: tab }, '', newUrl);
        }
    },
    
    // Navigate to a specific tab
    navigateTo(tab) {
        if (tab && this.validTabs.includes(tab)) {
            this.updateURL(tab);
            
            // Show the tab
            if (window.ui && typeof window.ui.showTab === 'function') {
                if (window.ui.currentTab !== tab) {
                    window.ui.showTab(tab);
                }
            } else {
                this.showTabFromURL();
            }
        }
    },
    
    // Initialize router
    init() {
        console.log('🔄 Initializing SPA Router...');
        
        // Listen for hash changes (browser back/forward)
        window.addEventListener('hashchange', () => {
            const tab = this.getCurrentTab();
            if (window.ui && typeof window.ui.showTab === 'function') {
                if (window.ui.currentTab !== tab) {
                    window.ui.showTab(tab);
                }
            }
        });
        
        // Listen for popstate (back/forward buttons)
        window.addEventListener('popstate', () => {
            const tab = this.getCurrentTab();
            if (window.ui && typeof window.ui.showTab === 'function') {
                if (window.ui.currentTab !== tab) {
                    window.ui.showTab(tab);
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

// Helper function for smooth navigation
window.navigateToTab = (tabId) => {
    if (SPA_ROUTER.validTabs.includes(tabId)) {
        SPA_ROUTER.navigateTo(tabId);
    }
};

// Log successful load
console.log('✅ utils.js loaded with SPA Router');
