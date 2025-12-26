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
