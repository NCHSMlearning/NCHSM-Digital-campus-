/**
 * FINANCE MODULE - CONFIGURATION
 * Central configuration for the finance module
 */

const FINANCE_CONFIG = {
    // ===== API ENDPOINTS =====
    API: {
        BASE_URL: window.location.origin + '/api/finance',
        LOGIN: '/auth/login',
        LOGOUT: '/auth/logout',
        VERIFY: '/auth/verify',
        
        // Student Accounts
        STUDENTS: '/students',
        STUDENT_ACCOUNT: '/students/:id/account',
        STUDENT_TRANSACTIONS: '/students/:id/transactions',
        
        // Payments
        PAYMENTS: '/payments',
        PAYMENT: '/payments/:id',
        RECORD_PAYMENT: '/payments/record',
        
        // Fee Structure
        FEE_STRUCTURE: '/fee-structure',
        FEE_STRUCTURE_ITEM: '/fee-structure/:id',
        
        // Reports
        REPORTS: '/reports',
        REPORT_GENERATE: '/reports/generate',
        REPORT_EXPORT: '/reports/export',
        
        // Transactions
        TRANSACTIONS: '/transactions',
        TRANSACTION: '/transactions/:id',
        
        // Settings
        SETTINGS: '/settings',
    },
    
    // ===== APP CONFIGURATION =====
    APP: {
        NAME: 'NCHSM Finance Module',
        VERSION: '2.0.0',
        CURRENCY: 'KES',
        CURRENCY_SYMBOL: 'KES',
        DATE_FORMAT: 'YYYY-MM-DD',
        TIME_FORMAT: 'HH:mm',
    },
    
    // ===== DEFAULT SETTINGS =====
    DEFAULTS: {
        LATE_FEE_PERCENTAGE: 5,
        PAYMENT_TERMS_DAYS: 30,
        PASS_MARK: 50,
        MAX_RETRIES: 3,
        CACHE_DURATION: 300, // seconds
    },
    
    // ===== STATUS OPTIONS =====
    STATUS: {
        PAYMENT: {
            COMPLETED: 'completed',
            PENDING: 'pending',
            FAILED: 'failed',
            REFUNDED: 'refunded',
        },
        ACCOUNT: {
            ACTIVE: 'active',
            INACTIVE: 'inactive',
            BLOCKED: 'blocked',
            OVERDUE: 'overdue',
        },
        MODULE: {
            ACTIVE: 'active',
            MAINTENANCE: 'maintenance',
            DISABLED: 'disabled',
        }
    },
    
    // ===== ROLES =====
    ROLES: {
        SUPER_ADMIN: 'superadmin',
        ADMIN: 'admin',
        FINANCE_OFFICER: 'finance_officer',
        STUDENT: 'student',
    },
    
    // ===== MESSAGES =====
    MESSAGES: {
        LOGIN_SUCCESS: 'Login successful! Redirecting...',
        LOGIN_ERROR: 'Invalid email or password. Please try again.',
        LOGOUT_SUCCESS: 'Logged out successfully.',
        SAVE_SUCCESS: 'Saved successfully!',
        SAVE_ERROR: 'Error saving. Please try again.',
        DELETE_SUCCESS: 'Deleted successfully!',
        DELETE_ERROR: 'Error deleting. Please try again.',
        PAYMENT_SUCCESS: 'Payment recorded successfully!',
        PAYMENT_ERROR: 'Error recording payment. Please try again.',
        NETWORK_ERROR: 'Network error. Please check your connection.',
        SESSION_EXPIRED: 'Your session has expired. Please login again.',
        UNAUTHORIZED: 'You are not authorized to perform this action.',
    }
};

// ===== HELPER FUNCTIONS =====

/**
 * Get API URL for an endpoint
 */
function getApiUrl(endpoint, params = {}) {
    let url = FINANCE_CONFIG.API.BASE_URL + endpoint;
    
    // Replace path parameters
    Object.keys(params).forEach(key => {
        url = url.replace(`:${key}`, params[key]);
    });
    
    return url;
}

/**
 * Get current user from session storage
 */
function getCurrentFinanceUser() {
    try {
        const user = JSON.parse(sessionStorage.getItem('finance_user') || 'null');
        return user;
    } catch (e) {
        return null;
    }
}

/**
 * Check if user is authenticated
 */
function isFinanceAuthenticated() {
    const user = getCurrentFinanceUser();
    return user && user.token && user.email;
}

/**
 * Get user role
 */
function getUserRole() {
    const user = getCurrentFinanceUser();
    return user ? user.role : null;
}

/**
 * Check if user has admin privileges
 */
function isFinanceAdmin() {
    const role = getUserRole();
    return role === FINANCE_CONFIG.ROLES.SUPER_ADMIN || 
           role === FINANCE_CONFIG.ROLES.ADMIN || 
           role === FINANCE_CONFIG.ROLES.FINANCE_OFFICER;
}

/**
 * Check if user is student
 */
function isFinanceStudent() {
    return getUserRole() === FINANCE_CONFIG.ROLES.STUDENT;
}

/**
 * Format currency
 */
function formatCurrency(amount) {
    return `${FINANCE_CONFIG.APP.CURRENCY_SYMBOL} ${Number(amount).toLocaleString('en-KE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

/**
 * Format date
 */
function formatDate(date) {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Format datetime
 */
function formatDateTime(date) {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Generate random ID
 */
function generateId() {
    return 'FIN-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();
}

/**
 * Debounce function for search inputs
 */
function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FINANCE_CONFIG, getApiUrl, getCurrentFinanceUser, isFinanceAuthenticated, formatCurrency, formatDate, formatDateTime };
}
