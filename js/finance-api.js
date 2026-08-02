/**
 * FINANCE MODULE - API COMMUNICATION LAYER
 * Handles all API calls to the backend
 * Communicates with both Super Admin and Student Dashboards
 */

class FinanceAPI {
    constructor() {
        this.baseUrl = FINANCE_CONFIG.API.BASE_URL;
        this.token = this.getToken();
    }

    /**
     * Get authentication token
     */
    getToken() {
        const user = getCurrentFinanceUser();
        return user ? user.token : null;
    }

    /**
     * Get headers for API requests
     */
    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': this.token ? `Bearer ${this.token}` : '',
            'X-API-Key': FINANCE_CONFIG.API_KEY || '',
        };
    }

    /**
     * Make API request
     */
    async request(endpoint, method = 'GET', data = null) {
        const url = this.baseUrl + endpoint;
        const options = {
            method: method,
            headers: this.getHeaders(),
        };

        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            
            if (response.status === 401) {
                // Unauthorized - redirect to login
                showToast('Session expired. Please login again.', 'error');
                setTimeout(() => {
                    window.location.href = 'financelogin.html';
                }, 1500);
                throw new Error('Unauthorized');
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }

    // ===== AUTHENTICATION =====

    /**
     * Login user
     */
    async login(email, password) {
        return this.request('/auth/login', 'POST', { email, password });
    }

    /**
     * Verify token
     */
    async verifyToken() {
        return this.request('/auth/verify', 'GET');
    }

    /**
     * Logout user
     */
    async logout() {
        return this.request('/auth/logout', 'POST');
    }

    // ===== STUDENT ACCOUNTS =====

    /**
     * Get all students (Admin only)
     */
    async getStudents(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/students?${query}`, 'GET');
    }

    /**
     * Get student account details
     */
    async getStudentAccount(studentId) {
        return this.request(`/students/${studentId}/account`, 'GET');
    }

    /**
     * Get student transactions
     */
    async getStudentTransactions(studentId, params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/students/${studentId}/transactions?${query}`, 'GET');
    }

    /**
     * Get student balance
     */
    async getStudentBalance(studentId) {
        return this.request(`/students/${studentId}/balance`, 'GET');
    }

    // ===== PAYMENTS =====

    /**
     * Get all payments (Admin only)
     */
    async getPayments(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/payments?${query}`, 'GET');
    }

    /**
     * Get payment details
     */
    async getPayment(paymentId) {
        return this.request(`/payments/${paymentId}`, 'GET');
    }

    /**
     * Record payment
     */
    async recordPayment(data) {
        return this.request('/payments/record', 'POST', data);
    }

    /**
     * Update payment
     */
    async updatePayment(paymentId, data) {
        return this.request(`/payments/${paymentId}`, 'PUT', data);
    }

    /**
     * Delete payment
     */
    async deletePayment(paymentId) {
        return this.request(`/payments/${paymentId}`, 'DELETE');
    }

    // ===== FEE STRUCTURE =====

    /**
     * Get fee structure
     */
    async getFeeStructure(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/fee-structure?${query}`, 'GET');
    }

    /**
     * Create fee structure
     */
    async createFeeStructure(data) {
        return this.request('/fee-structure', 'POST', data);
    }

    /**
     * Update fee structure
     */
    async updateFeeStructure(id, data) {
        return this.request(`/fee-structure/${id}`, 'PUT', data);
    }

    /**
     * Delete fee structure
     */
    async deleteFeeStructure(id) {
        return this.request(`/fee-structure/${id}`, 'DELETE');
    }

    // ===== TRANSACTIONS =====

    /**
     * Get all transactions
     */
    async getTransactions(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/transactions?${query}`, 'GET');
    }

    /**
     * Get transaction details
     */
    async getTransaction(transactionId) {
        return this.request(`/transactions/${transactionId}`, 'GET');
    }

    // ===== REPORTS =====

    /**
     * Generate report
     */
    async generateReport(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/reports/generate?${query}`, 'GET');
    }

    /**
     * Export report
     */
    async exportReport(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/reports/export?${query}`, 'GET');
    }

    // ===== SETTINGS =====

    /**
     * Get settings
     */
    async getSettings() {
        return this.request('/settings', 'GET');
    }

    /**
     * Update settings
     */
    async updateSettings(data) {
        return this.request('/settings', 'PUT', data);
    }

    // ===== DASHBOARD =====

    /**
     * Get dashboard data
     */
    async getDashboardData(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/dashboard?${query}`, 'GET');
    }

    /**
     * Get dashboard stats
     */
    async getDashboardStats() {
        return this.request('/dashboard/stats', 'GET');
    }

    // ===== BULK OPERATIONS =====

    /**
     * Bulk promote students
     */
    async bulkPromoteStudents(data) {
        return this.request('/students/bulk-promote', 'POST', data);
    }

    /**
     * Bulk update fee structure
     */
    async bulkUpdateFeeStructure(data) {
        return this.request('/fee-structure/bulk-update', 'POST', data);
    }

    // ===== EXPORT FUNCTIONS =====

    /**
     * Export data to CSV
     */
    async exportToCSV(type, params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/export/${type}?${query}`, 'GET');
    }

    /**
     * Export data to Excel
     */
    async exportToExcel(type, params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/export/${type}/excel?${query}`, 'GET');
    }
}

// ===== API INSTANCE =====
const financeAPI = new FinanceAPI();

// ===== STUDENT DASHBOARD FUNCTIONS =====

/**
 * Student: View my account balance
 */
async function studentGetBalance() {
    try {
        const user = getCurrentFinanceUser();
        if (!user) throw new Error('Not authenticated');
        
        const data = await financeAPI.getStudentBalance(user.id);
        return data;
    } catch (error) {
        console.error('Error getting student balance:', error);
        throw error;
    }
}

/**
 * Student: View my payment history
 */
async function studentGetPayments(params = {}) {
    try {
        const user = getCurrentFinanceUser();
        if (!user) throw new Error('Not authenticated');
        
        return await financeAPI.getStudentTransactions(user.id, params);
    } catch (error) {
        console.error('Error getting student payments:', error);
        throw error;
    }
}

/**
 * Student: View my fee structure
 */
async function studentGetFeeStructure() {
    try {
        const user = getCurrentFinanceUser();
        if (!user) throw new Error('Not authenticated');
        
        return await financeAPI.getFeeStructure({
            program: user.program,
            intake: user.intake
        });
    } catch (error) {
        console.error('Error getting fee structure:', error);
        throw error;
    }
}

/**
 * Student: View my dashboard
 */
async function studentGetDashboard() {
    try {
        const user = getCurrentFinanceUser();
        if (!user) throw new Error('Not authenticated');
        
        const [balance, payments, feeStructure] = await Promise.all([
            financeAPI.getStudentBalance(user.id),
            financeAPI.getStudentTransactions(user.id, { limit: 10 }),
            financeAPI.getFeeStructure({ program: user.program })
        ]);
        
        return {
            balance,
            payments,
            feeStructure,
            summary: {
                totalPaid: payments.reduce((sum, p) => sum + p.amount, 0),
                totalDue: feeStructure.reduce((sum, f) => sum + f.amount, 0)
            }
        };
    } catch (error) {
        console.error('Error getting student dashboard:', error);
        throw error;
    }
}

// ===== SUPER ADMIN FUNCTIONS =====

/**
 * Admin: Get all students with accounts
 */
async function adminGetAllStudents(params = {}) {
    try {
        if (!isFinanceAdmin()) throw new Error('Admin access required');
        return await financeAPI.getStudents(params);
    } catch (error) {
        console.error('Error getting all students:', error);
        throw error;
    }
}

/**
 * Admin: Get all payments
 */
async function adminGetAllPayments(params = {}) {
    try {
        if (!isFinanceAdmin()) throw new Error('Admin access required');
        return await financeAPI.getPayments(params);
    } catch (error) {
        console.error('Error getting all payments:', error);
        throw error;
    }
}

/**
 * Admin: Get financial report
 */
async function adminGenerateReport(params = {}) {
    try {
        if (!isFinanceAdmin()) throw new Error('Admin access required');
        return await financeAPI.generateReport(params);
    } catch (error) {
        console.error('Error generating report:', error);
        throw error;
    }
}

/**
 * Admin: Bulk promote students
 */
async function adminBulkPromote(data) {
    try {
        if (!isFinanceAdmin()) throw new Error('Admin access required');
        return await financeAPI.bulkPromoteStudents(data);
    } catch (error) {
        console.error('Error bulk promoting:', error);
        throw error;
    }
}

// ===== COMMUNICATION BETWEEN MODULES =====

/**
 * Send data to Super Admin Dashboard
 */
function sendToSuperAdmin(data) {
    try {
        // Store in localStorage for cross-module communication
        localStorage.setItem('finance_to_superadmin', JSON.stringify({
            timestamp: new Date().toISOString(),
            data: data
        }));
        
        // Dispatch custom event for real-time communication
        window.dispatchEvent(new CustomEvent('financeDataUpdate', {
            detail: data
        }));
        
        console.log('Data sent to Super Admin:', data);
    } catch (error) {
        console.error('Error sending data to Super Admin:', error);
    }
}

/**
 * Send data to Student Dashboard
 */
function sendToStudentDashboard(data) {
    try {
        localStorage.setItem('finance_to_student', JSON.stringify({
            timestamp: new Date().toISOString(),
            data: data
        }));
        
        window.dispatchEvent(new CustomEvent('studentFinanceUpdate', {
            detail: data
        }));
        
        console.log('Data sent to Student Dashboard:', data);
    } catch (error) {
        console.error('Error sending data to Student Dashboard:', error);
    }
}

/**
 * Listen for data from Super Admin
 */
function listenToSuperAdmin(callback) {
    window.addEventListener('financeDataUpdate', function(e) {
        callback(e.detail);
    });
    
    // Also check localStorage for missed messages
    const stored = localStorage.getItem('finance_from_superadmin');
    if (stored) {
        try {
            const data = JSON.parse(stored);
            callback(data);
            localStorage.removeItem('finance_from_superadmin');
        } catch (e) {
            console.warn('Invalid stored data:', e);
        }
    }
}

/**
 * Listen for data from Student Dashboard
 */
function listenToStudentDashboard(callback) {
    window.addEventListener('studentFinanceUpdate', function(e) {
        callback(e.detail);
    });
    
    const stored = localStorage.getItem('finance_from_student');
    if (stored) {
        try {
            const data = JSON.parse(stored);
            callback(data);
            localStorage.removeItem('finance_from_student');
        } catch (e) {
            console.warn('Invalid stored data:', e);
        }
    }
}

// ===== EXPORT =====
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        financeAPI,
        studentGetBalance,
        studentGetPayments,
        studentGetFeeStructure,
        studentGetDashboard,
        adminGetAllStudents,
        adminGetAllPayments,
        adminGenerateReport,
        adminBulkPromote,
        sendToSuperAdmin,
        sendToStudentDashboard,
        listenToSuperAdmin,
        listenToStudentDashboard
    };
}

console.log('✅ Finance API Communication Layer loaded');
console.log('🔗 Base URL:', FINANCE_CONFIG.API.BASE_URL);
console.log('🔑 Token present:', !!financeAPI.token);
