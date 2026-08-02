/**
 * FINANCE MODULE - CONFIGURATION
 * Central configuration for the finance module
 * Uses Supabase directly (no REST API needed)
 */

const FINANCE_CONFIG = {
    // ===== SUPABASE CONFIGURATION =====
    SUPABASE_URL: 'https://lwhtjozfsmbyihenfunw.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk',
    
    // ===== TABLE NAMES =====
    TABLES: {
        USER_PROFILES: 'consolidated_user_profiles_table',
        PAYMENTS: 'finance_payments',
        FEE_STRUCTURE: 'finance_fee_structure',
        STUDENT_ACCOUNTS: 'finance_student_accounts',
        TRANSACTIONS: 'finance_transactions',
        AUDIT_LOGS: 'finance_audit_logs'
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
            PAID: 'paid',
            PARTIAL: 'partial',
            OUTSTANDING: 'outstanding',
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
    },
    
    // ===== PERIOD DEFINITIONS =====
    PERIODS: {
        KRCHN: [
            'Year 1 - Semester 1',
            'Year 1 - Semester 2',
            'Year 1 - Semester 3',
            'Year 2 - Semester 1',
            'Year 2 - Semester 2',
            'Year 2 - Semester 3',
            'Year 3 - Semester 1',
            'Year 3 - Semester 2',
            'Year 3 - Semester 3'
        ],
        TVET_DIPLOMA: [
            'Year 1 - Term 1',
            'Year 1 - Term 2',
            'Year 1 - Term 3',
            'Year 2 - Term 1',
            'Year 2 - Term 2',
            'Year 2 - Term 3'
        ],
        TVET_CERTIFICATE: [
            'Year 1 - Term 1',
            'Year 1 - Term 2',
            'Year 1 - Term 3'
        ]
    },
    
    // ===== FEE AMOUNTS =====
    FEES: {
        KRCHN: {
            INTRODUCTORY: 94100,
            STANDARD: 64100
        },
        TVET: {
            TERM_1: 57100,
            STANDARD: 47000
        }
    }
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get current user from session storage
 */
function getCurrentFinanceUser() {
    try {
        const user = JSON.parse(localStorage.getItem('finance_user') || 'null');
        if (user) return user;
        const sessionUser = JSON.parse(sessionStorage.getItem('finance_user') || 'null');
        return sessionUser;
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
    const allowedRoles = [FINANCE_CONFIG.ROLES.SUPER_ADMIN, FINANCE_CONFIG.ROLES.ADMIN, FINANCE_CONFIG.ROLES.FINANCE_OFFICER];
    return allowedRoles.includes(role);
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
    if (amount === null || amount === undefined) return `${FINANCE_CONFIG.APP.CURRENCY_SYMBOL} 0`;
    return `${FINANCE_CONFIG.APP.CURRENCY_SYMBOL} ${Number(amount).toLocaleString('en-KE', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    })}`;
}

/**
 * Format date
 */
function formatDate(date) {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
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
    if (isNaN(d.getTime())) return '-';
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

/**
 * Get periods for a program type
 */
function getProgramPeriods(programType, programLevel = 'diploma') {
    if (programType === 'KRCHN') {
        return FINANCE_CONFIG.PERIODS.KRCHN;
    } else if (programType === 'TVET') {
        if (programLevel === 'certificate') {
            return FINANCE_CONFIG.PERIODS.TVET_CERTIFICATE;
        }
        return FINANCE_CONFIG.PERIODS.TVET_DIPLOMA;
    }
    return FINANCE_CONFIG.PERIODS.KRCHN;
}

/**
 * Get fee amount for a period
 */
function getFeeAmount(programType, periodIndex, programLevel = 'diploma') {
    if (programType === 'KRCHN') {
        return periodIndex === 0 ? FINANCE_CONFIG.FEES.KRCHN.INTRODUCTORY : FINANCE_CONFIG.FEES.KRCHN.STANDARD;
    } else if (programType === 'TVET') {
        return periodIndex === 0 ? FINANCE_CONFIG.FEES.TVET.TERM_1 : FINANCE_CONFIG.FEES.TVET.STANDARD;
    }
    return FINANCE_CONFIG.FEES.KRCHN.STANDARD;
}

/**
 * Get total program fees
 */
function getTotalProgramFees(programType, programLevel = 'diploma') {
    const periods = getProgramPeriods(programType, programLevel);
    let total = 0;
    periods.forEach((period, index) => {
        total += getFeeAmount(programType, index, programLevel);
    });
    return total;
}

// Make config globally available
window.FINANCE_CONFIG = FINANCE_CONFIG;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        FINANCE_CONFIG, 
        getCurrentFinanceUser, 
        isFinanceAuthenticated, 
        formatCurrency, 
        formatDate, 
        formatDateTime,
        getProgramPeriods,
        getFeeAmount,
        getTotalProgramFees
    };
}

console.log('✅ Finance Config loaded');
console.log('📊 Version:', FINANCE_CONFIG.APP.VERSION);
console.log('📋 Tables:', Object.keys(FINANCE_CONFIG.TABLES).join(', '));
console.log('💰 Currency:', FINANCE_CONFIG.APP.CURRENCY);
