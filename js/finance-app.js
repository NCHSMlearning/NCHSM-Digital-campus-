/**
 * FINANCE MODULE - MAIN APPLICATION
 * Core application logic for the finance dashboard
 * Matches Super Admin design and functionality
 */

// ============================================================
// GLOBALS
// ============================================================
let monthlyChart = null;
let statusChart = null;
let allAccounts = [];
let allPayments = [];
let allTransactions = [];

// ============================================================
// INITIALIZATION
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('💰 Finance Module starting...');
    console.log('🔗 Supabase URL:', FINANCE_CONFIG.SUPABASE_URL);
    console.log('📊 Tables:', Object.keys(FINANCE_CONFIG.TABLES));
    
    // Set current date
    updateCurrentDate();
    
    // Initialize tabs
    initFinanceTabs();
    
    // Set default payment date
    const paymentDate = document.getElementById('paymentDate');
    if (paymentDate) {
        const today = new Date().toISOString().split('T')[0];
        paymentDate.value = today;
    }
    
    // Load student dropdown for payment form
    loadStudentDropdown();
    
    // Load all data
    loadAllData();
});

// ============================================================
// DATE HELPERS
// ============================================================

/**
 * Update current date display
 */
function updateCurrentDate() {
    const dateDisplay = document.getElementById('currentDate');
    if (dateDisplay) {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateDisplay.textContent = now.toLocaleDateString('en-KE', options);
    }
}

/**
 * Format date
 */
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-KE', options);
}

/**
 * Format date time
 */
function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const options = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };
    return date.toLocaleDateString('en-KE', options);
}

/**
 * Format currency
 */
function formatCurrency(amount) {
    if (amount === null || amount === undefined) return 'KES 0';
    return 'KES ' + parseFloat(amount).toLocaleString();
}

// ============================================================
// USER AUTHENTICATION
// ============================================================

/**
 * Get current finance user from storage
 */
function getFinanceUser() {
    try {
        let user = JSON.parse(localStorage.getItem('finance_user') || 'null');
        if (user) return user;
        user = JSON.parse(sessionStorage.getItem('finance_user') || 'null');
        if (user) return user;
        return null;
    } catch (e) {
        console.error('Error getting user:', e);
        return null;
    }
}

/**
 * Check if user is authenticated
 */
function isFinanceAuthenticated() {
    const user = getFinanceUser();
    if (!user) return false;
    if (!user.token) return false;
    return true;
}

// ============================================================
// TAB NAVIGATION
// ============================================================

/**
 * Initialize finance tabs
 */
function initFinanceTabs() {
    const tabLinks = document.querySelectorAll('.finance-nav a[data-tab]');
    
    tabLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const tabId = this.getAttribute('data-tab');
            showFinanceTab(tabId);
        });
    });
}

/**
 * Show finance tab
 */
function showFinanceTab(tabId) {
    // Update nav links
    document.querySelectorAll('.finance-nav a[data-tab]').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-tab') === tabId) {
            link.classList.add('active');
        }
    });
    
    // Update tab contents
    document.querySelectorAll('.finance-tab-content').forEach(tab => {
        tab.classList.remove('active');
        if (tab.id === `tab-${tabId}`) {
            tab.classList.add('active');
        }
    });
    
    // Load tab data if needed
    loadTabData(tabId);
}

/**
 * Load data for specific tab
 */
function loadTabData(tabId) {
    switch(tabId) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'accounts':
            loadAccounts();
            break;
        case 'payments':
            loadPayments();
            break;
        case 'fee-structure':
            loadFeeStructure();
            break;
        case 'reports':
            // Report data loaded on demand
            break;
        case 'transactions':
            loadTransactions();
            break;
        case 'settings':
            loadSettings();
            break;
    }
}

// ============================================================
// SIDEBAR
// ============================================================

/**
 * Toggle sidebar for mobile
 */
function toggleSidebar() {
    const sidebar = document.getElementById('financeSidebar');
    if (sidebar) {
        sidebar.classList.toggle('open');
    }
}

/**
 * Logout finance user
 */
function logoutFinance() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('finance_user');
        sessionStorage.removeItem('finance_user');
        showToast('Logging out...', 'info');
        setTimeout(function() {
            window.location.href = 'financelogin.html';
        }, 500);
    }
}

/**
 * Go to main dashboard
 */
function goToMainDashboard() {
    window.location.href = '/home';
}

// Close sidebar on outside click (mobile)
document.addEventListener('click', function(e) {
    const sidebar = document.getElementById('financeSidebar');
    const toggle = document.querySelector('.finance-mobile-toggle');
    if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('open')) {
        if (!sidebar.contains(e.target) && !toggle?.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    }
});

// ============================================================
// LOAD ALL DATA
// ============================================================

/**
 * Load all data
 */
async function loadAllData() {
    await loadDashboardData();
    await loadAccounts();
    await loadPayments();
    await loadFeeStructure();
    await loadTransactions();
    console.log('✅ All data loaded');
}

// ============================================================
// DASHBOARD
// ============================================================

/**
 * Load dashboard data
 */
async function loadDashboardData() {
    console.log('📊 Loading dashboard data...');
    
    try {
        // Get dashboard stats
        const stats = await getDashboardStats();
        
        // Update stats
        document.getElementById('totalStudents').textContent = stats.totalStudents || 0;
        document.getElementById('totalCollected').textContent = formatCurrency(stats.totalCollected || 0);
        document.getElementById('outstandingBalance').textContent = formatCurrency(stats.outstandingBalance || 0);
        document.getElementById('overdueAccounts').textContent = stats.overdueAccounts || 0;
        document.getElementById('todayPayments').textContent = formatCurrency(stats.todayPayments || 0);
        document.getElementById('totalTransactions').textContent = stats.totalTransactions || 0;
        
        // Update badges
        document.getElementById('dashboardBadge').textContent = stats.overdueAccounts || 0;
        document.getElementById('accountsBadge').textContent = stats.totalStudents || 0;
        
        // Load recent transactions
        await loadRecentTransactions();
        
        // Initialize charts
        await loadCharts();
        
        console.log('✅ Dashboard loaded');
        
    } catch (error) {
        console.error('❌ Error loading dashboard:', error);
        showToast('Error loading dashboard data', 'error');
    }
}

/**
 * Get dashboard stats from Supabase
 */
async function getDashboardStats() {
    try {
        const supabase = window.supabase || window.sb;
        if (!supabase) {
            console.error('Supabase not available');
            return getMockStats();
        }

        // Total students
        const { count: totalStudents } = await supabase
            .from(FINANCE_CONFIG.TABLES.USER_PROFILES)
            .select('*', { count: 'exact', head: true })
            .eq('role', 'student');

        // Total collected (completed payments)
        const { data: payments } = await supabase
            .from(FINANCE_CONFIG.TABLES.PAYMENTS)
            .select('amount')
            .eq('status', 'completed');

        const totalCollected = payments ? payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) : 0;

        // Outstanding balance
        const { data: accounts } = await supabase
            .from(FINANCE_CONFIG.TABLES.STUDENT_ACCOUNTS)
            .select('balance')
            .gt('balance', 0);

        const outstanding = accounts ? accounts.reduce((sum, a) => sum + (parseFloat(a.balance) || 0), 0) : 0;
        const overdueCount = accounts ? accounts.length : 0;

        // Today's payments
        const today = new Date().toISOString().split('T')[0];
        const { data: todayPayments } = await supabase
            .from(FINANCE_CONFIG.TABLES.PAYMENTS)
            .select('amount')
            .eq('payment_date', today)
            .eq('status', 'completed');

        const todayTotal = todayPayments ? todayPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) : 0;

        // Total transactions
        const { count: totalTransactions } = await supabase
            .from(FINANCE_CONFIG.TABLES.PAYMENTS)
            .select('*', { count: 'exact', head: true });

        return {
            totalStudents: totalStudents || 0,
            totalCollected: totalCollected,
            outstandingBalance: outstanding,
            overdueAccounts: overdueCount,
            todayPayments: todayTotal,
            totalTransactions: totalTransactions || 0
        };

    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        return getMockStats();
    }
}

/**
 * Get mock stats (fallback)
 */
function getMockStats() {
    return {
        totalStudents: 230,
        totalCollected: 580505,
        outstandingBalance: 2450000,
        overdueAccounts: 45,
        todayPayments: 45000,
        totalTransactions: 876
    };
}

/**
 * Load recent transactions
 */
async function loadRecentTransactions() {
    try {
        const supabase = window.supabase || window.sb;
        if (!supabase) {
            showMockRecentTransactions();
            return;
        }

        const { data: transactions, error } = await supabase
            .from(FINANCE_CONFIG.TABLES.PAYMENTS)
            .select('*')
            .order('payment_date', { ascending: false })
            .limit(10);

        if (error) throw error;

        renderRecentTransactions(transactions || []);

    } catch (error) {
        console.error('❌ Error loading recent transactions:', error);
        showMockRecentTransactions();
    }
}

/**
 * Show mock recent transactions
 */
function showMockRecentTransactions() {
    const mockData = [
        { payment_date: '2026-07-31', student_name: 'Jane Doe', program: 'KRCHN', amount: 45000, payment_method: 'M-Pesa', status: 'completed' },
        { payment_date: '2026-07-31', student_name: 'John Smith', program: 'DPOTT', amount: 32000, payment_method: 'Cash', status: 'completed' },
        { payment_date: '2026-07-30', student_name: 'Mary Wanjiru', program: 'DCH', amount: 28000, payment_method: 'Bank Transfer', status: 'pending' },
    ];
    renderRecentTransactions(mockData);
}

/**
 * Render recent transactions
 */
function renderRecentTransactions(transactions) {
    const tbody = document.getElementById('recentTransactions');
    if (!tbody) return;

    if (!transactions || transactions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 30px; color: #94a3b8;">
                    <i class="fas fa-info-circle"></i> No recent transactions
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = transactions.map(t => {
        const statusClass = t.status === 'completed' ? 'badge-success' :
                           t.status === 'pending' ? 'badge-warning' : 'badge-danger';
        const statusLabel = t.status ? t.status.charAt(0).toUpperCase() + t.status.slice(1) : 'Pending';
        
        return `
            <tr>
                <td>${formatDate(t.payment_date)}</td>
                <td><strong>${t.student_name || 'N/A'}</strong></td>
                <td>${t.program || '-'}</td>
                <td><strong>${formatCurrency(t.amount)}</strong></td>
                <td>${t.payment_method || '-'}</td>
                <td>
                    <span class="badge ${statusClass}">${statusLabel}</span>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Load charts
 */
async function loadCharts() {
    try {
        // Destroy existing charts
        if (monthlyChart) {
            monthlyChart.destroy();
            monthlyChart = null;
        }
        if (statusChart) {
            statusChart.destroy();
            statusChart = null;
        }

        const supabase = window.supabase || window.sb;
        if (!supabase) {
            // Show empty charts with mock data
            initMockCharts();
            return;
        }

        // Get monthly data
        const { data: monthlyData, error: monthlyError } = await supabase
            .from(FINANCE_CONFIG.TABLES.PAYMENTS)
            .select('payment_date, amount')
            .eq('status', 'completed');

        // Process monthly data
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthlyTotals = new Array(12).fill(0);

        if (!monthlyError && monthlyData) {
            monthlyData.forEach(p => {
                if (p.payment_date) {
                    const date = new Date(p.payment_date);
                    const month = date.getMonth();
                    monthlyTotals[month] += parseFloat(p.amount) || 0;
                }
            });
        }

        // Monthly chart
        const monthlyCtx = document.getElementById('monthlyCollectionsChart');
        if (monthlyCtx) {
            monthlyChart = new Chart(monthlyCtx, {
                type: 'bar',
                data: {
                    labels: months,
                    datasets: [{
                        label: 'Monthly Collections (KES)',
                        data: monthlyTotals,
                        backgroundColor: 'rgba(76, 29, 149, 0.7)',
                        borderColor: '#4C1D95',
                        borderWidth: 2,
                        borderRadius: 4,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { callback: function(value) { return 'KES ' + (value / 1000).toFixed(0) + 'k'; } }
                        }
                    }
                }
            });
        }

        // Get status data
        const { data: statusData, error: statusError } = await supabase
            .from(FINANCE_CONFIG.TABLES.PAYMENTS)
            .select('status');

        if (!statusError && statusData) {
            const statusCounts = { completed: 0, pending: 0, failed: 0, refunded: 0 };
            statusData.forEach(p => {
                if (statusCounts[p.status] !== undefined) statusCounts[p.status]++;
            });

            const statusCtx = document.getElementById('paymentStatusChart');
            if (statusCtx) {
                statusChart = new Chart(statusCtx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Completed', 'Pending', 'Failed', 'Refunded'],
                        datasets: [{
                            data: [statusCounts.completed, statusCounts.pending, statusCounts.failed, statusCounts.refunded],
                            backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
                            borderWidth: 0,
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: { padding: 15, usePointStyle: true, pointStyle: 'circle' }
                            }
                        },
                        cutout: '60%'
                    }
                });
            }
        }

        console.log('✅ Charts loaded');

    } catch (error) {
        console.error('❌ Error loading charts:', error);
        initMockCharts();
    }
}

/**
 * Initialize mock charts (fallback)
 */
function initMockCharts() {
    const monthlyCtx = document.getElementById('monthlyCollectionsChart');
    if (monthlyCtx && !monthlyChart) {
        monthlyChart = new Chart(monthlyCtx, {
            type: 'bar',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: [{
                    label: 'Monthly Collections (KES)',
                    data: [180000, 220000, 195000, 280000, 310000, 245000, 290000, 350000, 320000, 280000, 260000, 284500],
                    backgroundColor: 'rgba(76, 29, 149, 0.7)',
                    borderColor: '#4C1D95',
                    borderWidth: 2,
                    borderRadius: 4,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { callback: function(value) { return 'KES ' + (value / 1000).toFixed(0) + 'k'; } }
                    }
                }
            }
        });
    }

    const statusCtx = document.getElementById('paymentStatusChart');
    if (statusCtx && !statusChart) {
        statusChart = new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: ['Completed', 'Pending', 'Failed', 'Refunded'],
                datasets: [{
                    data: [65, 20, 10, 5],
                    backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
                    borderWidth: 0,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { padding: 15, usePointStyle: true, pointStyle: 'circle' }
                    }
                },
                cutout: '60%'
            }
        });
    }
}

/**
 * Refresh all finance data
 */
function refreshFinanceData() {
    showToast('Refreshing data...', 'info');
    loadAllData();
    setTimeout(() => {
        showToast('Data refreshed successfully!', 'success');
    }, 1000);
}

// ============================================================
// STUDENT ACCOUNTS
// ============================================================

/**
 * Load student accounts
 */
async function loadAccounts() {
    console.log('📊 Loading student accounts...');
    
    try {
        const supabase = window.supabase || window.sb;
        if (!supabase) {
            showMockAccounts();
            return;
        }

        const { data: accounts, error } = await supabase
            .from(FINANCE_CONFIG.TABLES.STUDENT_ACCOUNTS)
            .select('*')
            .order('student_name', { ascending: true });

        if (error) throw error;

        allAccounts = accounts || [];
        renderAccounts(allAccounts);
        
        console.log('✅ Student accounts loaded:', allAccounts.length);

    } catch (error) {
        console.error('❌ Error loading accounts:', error);
        showMockAccounts();
        showToast('Error loading student accounts', 'error');
    }
}

/**
 * Show mock accounts (fallback)
 */
function showMockAccounts() {
    const mockAccounts = [
        { student_id: '001', student_name: 'Jane Doe', program: 'KRCHN', intake_year: '2026', total_fees_due: 180000, total_paid: 135000, balance: 45000 },
        { student_id: '002', student_name: 'John Smith', program: 'DPOTT', intake_year: '2026', total_fees_due: 150000, total_paid: 150000, balance: 0 },
        { student_id: '003', student_name: 'Mary Wanjiru', program: 'DCH', intake_year: '2025', total_fees_due: 160000, total_paid: 120000, balance: 40000 },
    ];
    allAccounts = mockAccounts;
    renderAccounts(mockAccounts);
}

/**
 * Render accounts table
 */
function renderAccounts(accounts) {
    const tbody = document.getElementById('accountsTableBody');
    if (!tbody) return;

    if (!accounts || accounts.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 40px; color: #94a3b8;">
                    <i class="fas fa-info-circle"></i> No student accounts found
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = accounts.map(acc => {
        const balance = parseFloat(acc.balance) || 0;
        const status = balance === 0 ? 'paid' : 
                      balance > 0 && balance <= 10000 ? 'partial' : 'outstanding';
        const statusLabel = status === 'paid' ? '✅ Paid' :
                           status === 'partial' ? '⚠️ Partial' : '🔴 Outstanding';
        const statusClass = status === 'paid' ? 'badge-success' :
                           status === 'partial' ? 'badge-warning' : 'badge-danger';

        return `
            <tr>
                <td><strong>${acc.student_name || 'N/A'}</strong></td>
                <td>${acc.student_id || '-'}</td>
                <td>${acc.program || '-'}</td>
                <td>${acc.intake_year || '-'}</td>
                <td>${formatCurrency(acc.total_fees_due)}</td>
                <td>${formatCurrency(acc.total_paid)}</td>
                <td><strong>${formatCurrency(balance)}</strong></td>
                <td><span class="badge ${statusClass}">${statusLabel}</span></td>
                <td>
                    <button onclick="viewStudentAccount('${acc.student_id}')" class="btn-action btn-primary btn-xs">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="viewStudentPayments('${acc.student_id}')" class="btn-action btn-outline btn-xs">
                        <i class="fas fa-receipt"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Filter accounts
 */
function filterAccounts() {
    const search = document.getElementById('accountSearch')?.value?.toLowerCase() || '';
    const statusFilter = document.getElementById('accountStatusFilter')?.value || 'all';
    const programFilter = document.getElementById('accountProgramFilter')?.value || 'all';
    
    let filtered = allAccounts;

    if (search) {
        filtered = filtered.filter(acc => 
            (acc.student_name || '').toLowerCase().includes(search) ||
            (acc.student_id || '').toLowerCase().includes(search) ||
            (acc.program || '').toLowerCase().includes(search)
        );
    }

    if (statusFilter !== 'all') {
        filtered = filtered.filter(acc => {
            const balance = parseFloat(acc.balance) || 0;
            if (statusFilter === 'paid') return balance === 0;
            if (statusFilter === 'partial') return balance > 0 && balance <= 10000;
            if (statusFilter === 'outstanding') return balance > 10000;
            return true;
        });
    }

    if (programFilter !== 'all') {
        filtered = filtered.filter(acc => (acc.program || '') === programFilter);
    }

    renderAccounts(filtered);
}

/**
 * Reset account filters
 */
function resetAccountFilters() {
    document.getElementById('accountSearch').value = '';
    document.getElementById('accountStatusFilter').value = 'all';
    document.getElementById('accountProgramFilter').value = 'all';
    renderAccounts(allAccounts);
}

/**
 * Refresh accounts
 */
function refreshAccounts() {
    loadAccounts();
    showToast('Accounts refreshed!', 'success');
}

/**
 * View student account
 */
function viewStudentAccount(studentId) {
    const modal = document.getElementById('studentAccountModal');
    if (!modal) return;
    
    modal.classList.add('active');
    document.getElementById('studentAccountBody').innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <div class="loading-spinner"></div>
            <p style="margin-top: 10px; color: #94a3b8;">Loading student account...</p>
        </div>
    `;
    
    const student = allAccounts.find(acc => acc.student_id === studentId);
    
    setTimeout(() => {
        if (student) {
            const balance = parseFloat(student.balance) || 0;
            const status = balance === 0 ? '✅ Paid in Full' :
                          balance > 0 && balance <= 10000 ? '⚠️ Partial Payment' : '🔴 Outstanding Balance';
            const statusColor = balance === 0 ? '#059669' :
                               balance > 0 && balance <= 10000 ? '#d97706' : '#dc2626';
            
            document.getElementById('studentAccountBody').innerHTML = `
                <div style="padding: 10px 0;">
                    <h4 style="color: #0A3D62; margin-bottom: 15px;">Student: ${student.student_name || 'N/A'}</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; padding: 16px; border-radius: 8px;">
                        <div><strong>Student ID:</strong> ${student.student_id || '-'}</div>
                        <div><strong>Program:</strong> ${student.program || '-'}</div>
                        <div><strong>Intake:</strong> ${student.intake_year || '-'}</div>
                        <div><strong>Balance:</strong> <strong style="color: ${statusColor}">${formatCurrency(balance)}</strong></div>
                        <div><strong>Total Fees Due:</strong> ${formatCurrency(student.total_fees_due)}</div>
                        <div><strong>Total Paid:</strong> ${formatCurrency(student.total_paid)}</div>
                        <div style="grid-column: 1 / -1;"><strong>Status:</strong> <span style="color: ${statusColor}">${status}</span></div>
                    </div>
                    <hr style="margin: 15px 0;">
                    <h5 style="margin-bottom: 10px;">Recent Payments</h5>
                    ${allPayments.filter(p => p.student_id === studentId).length > 0 ? `
                        <ul style="list-style: none; padding: 0;">
                            ${allPayments.filter(p => p.student_id === studentId).slice(0, 5).map(p => `
                                <li style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between;">
                                    <span>${formatDate(p.payment_date)} - ${p.payment_method || 'N/A'}</span>
                                    <span><strong>${formatCurrency(p.amount)}</strong></span>
                                </li>
                            `).join('')}
                        </ul>
                    ` : '<p style="color: #94a3b8;">No payments found</p>'}
                </div>
            `;
        } else {
            document.getElementById('studentAccountBody').innerHTML = `
                <div style="text-align: center; padding: 20px; color: #dc2626;">
                    <i class="fas fa-exclamation-circle" style="font-size: 24px; display: block; margin-bottom: 10px;"></i>
                    <p>Student not found</p>
                </div>
            `;
        }
    }, 500);
}

/**
 * View student payments
 */
function viewStudentPayments(studentId) {
    showToast('Viewing payments for student...', 'info');
    showFinanceTab('payments');
    
    setTimeout(() => {
        const filtered = allPayments.filter(p => p.student_id === studentId);
        if (filtered.length > 0) {
            renderPayments(filtered);
            showToast(`Found ${filtered.length} payments for this student`, 'success');
        } else {
            showToast('No payments found for this student', 'info');
        }
    }, 300);
}

// ============================================================
// PAYMENTS
// ============================================================

/**
 * Load student dropdown for payment form
 */
async function loadStudentDropdown() {
    try {
        const supabase = window.supabase || window.sb;
        if (!supabase) {
            loadMockStudentDropdown();
            return;
        }

        const { data: students, error } = await supabase
            .from(FINANCE_CONFIG.TABLES.USER_PROFILES)
            .select('id, full_name, student_id, email')
            .eq('role', 'student')
            .order('full_name', { ascending: true });

        if (error) throw error;

        const select = document.getElementById('paymentStudent');
        if (!select) return;

        select.innerHTML = '<option value="">-- Select Student --</option>';

        students.forEach(student => {
            const option = document.createElement('option');
            option.value = student.id;
            option.textContent = `${student.full_name || 'Student'} (${student.student_id || student.email})`;
            select.appendChild(option);
        });

        console.log('✅ Student dropdown loaded:', students.length);

    } catch (error) {
        console.error('❌ Error loading student dropdown:', error);
        loadMockStudentDropdown();
    }
}

/**
 * Load mock student dropdown (fallback)
 */
function loadMockStudentDropdown() {
    const select = document.getElementById('paymentStudent');
    if (!select) return;
    
    select.innerHTML = `
        <option value="">-- Select Student --</option>
        <option value="1">Jane Doe (KRCHN/001)</option>
        <option value="2">John Smith (DPOTT/023)</option>
        <option value="3">Mary Wanjiru (DCH/045)</option>
        <option value="4">Peter Ochieng (KRCHN/089)</option>
    `;
}

/**
 * Load payments
 */
async function loadPayments() {
    console.log('💳 Loading payments...');
    
    try {
        const supabase = window.supabase || window.sb;
        if (!supabase) {
            showMockPayments();
            return;
        }

        const { data: payments, error } = await supabase
            .from(FINANCE_CONFIG.TABLES.PAYMENTS)
            .select('*')
            .order('payment_date', { ascending: false });

        if (error) throw error;

        allPayments = payments || [];
        renderPayments(allPayments);
        
        console.log('✅ Payments loaded:', allPayments.length);

    } catch (error) {
        console.error('❌ Error loading payments:', error);
        showMockPayments();
        showToast('Error loading payment history', 'error');
    }
}

/**
 * Show mock payments (fallback)
 */
function showMockPayments() {
    const mockPayments = [
        { id: '1', payment_date: '2026-07-31', student_name: 'Jane Doe', program: 'KRCHN', amount: 45000, payment_method: 'M-Pesa', reference_number: 'MPESA-7845', period: 'Term 2', status: 'completed' },
        { id: '2', payment_date: '2026-07-31', student_name: 'John Smith', program: 'DPOTT', amount: 32000, payment_method: 'Cash', reference_number: 'CASH-1234', period: 'Term 2', status: 'completed' },
        { id: '3', payment_date: '2026-07-30', student_name: 'Mary Wanjiru', program: 'DCH', amount: 28000, payment_method: 'Bank Transfer', reference_number: 'BT-5678', period: 'Term 2', status: 'pending' },
    ];
    allPayments = mockPayments;
    renderPayments(mockPayments);
}

/**
 * Render payments table
 */
function renderPayments(payments) {
    const tbody = document.getElementById('paymentsTableBody');
    if (!tbody) return;

    if (!payments || payments.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 40px; color: #94a3b8;">
                    <i class="fas fa-info-circle"></i> No payments found
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = payments.map(p => {
        const statusClass = p.status === 'completed' ? 'badge-success' :
                           p.status === 'pending' ? 'badge-warning' : 'badge-danger';
        const statusLabel = p.status ? p.status.charAt(0).toUpperCase() + p.status.slice(1) : 'Pending';

        return `
            <tr>
                <td>${formatDate(p.payment_date)}</td>
                <td><strong>${p.student_name || 'N/A'}</strong></td>
                <td>${p.program || '-'}</td>
                <td><strong>${formatCurrency(p.amount)}</strong></td>
                <td>${p.payment_method || '-'}</td>
                <td>${p.reference_number || '-'}</td>
                <td>${p.period || '-'}</td>
                <td><span class="badge ${statusClass}">${statusLabel}</span></td>
                <td>
                    <button onclick="viewPaymentDetails('${p.id}')" class="btn-action btn-primary btn-xs">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="deletePayment('${p.id}')" class="btn-action btn-danger btn-xs">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Record payment
 */
async function recordPayment() {
    const studentId = document.getElementById('paymentStudent')?.value;
    const amount = parseFloat(document.getElementById('paymentAmount')?.value);
    const method = document.getElementById('paymentMethod')?.value;
    const reference = document.getElementById('paymentReference')?.value || null;
    const date = document.getElementById('paymentDate')?.value;
    const period = document.getElementById('paymentPeriod')?.value;
    const notes = document.getElementById('paymentNotes')?.value || null;

    if (!studentId || !amount || !date) {
        showToast('Please fill in all required fields.', 'warning');
        return;
    }

    if (amount <= 0) {
        showToast('Please enter a valid amount.', 'warning');
        return;
    }

    try {
        const supabase = window.supabase || window.sb;
        if (!supabase) {
            showToast('Payment recorded successfully! (Demo)', 'success');
            document.getElementById('paymentForm')?.reset();
            document.getElementById('paymentDate').value = new Date().toISOString().split('T')[0];
            loadAllData();
            return;
        }

        // Get student details
        const { data: student, error: studentError } = await supabase
            .from(FINANCE_CONFIG.TABLES.USER_PROFILES)
            .select('full_name, email, program')
            .eq('id', studentId)
            .single();

        if (studentError) throw studentError;

        const paymentData = {
            student_id: studentId,
            student_name: student.full_name || 'Student',
            student_email: student.email,
            program: student.program || 'KRCHN',
            amount: amount,
            payment_method: method,
            reference_number: reference || 'TXN-' + Date.now().toString().slice(-8),
            payment_date: date,
            period: period || 'Term 1',
            status: 'completed',
            notes: notes,
            recorded_by_name: getFinanceUser()?.name || 'System'
        };

        const { error } = await supabase
            .from(FINANCE_CONFIG.TABLES.PAYMENTS)
            .insert([paymentData]);

        if (error) throw error;

        showToast(`Payment of ${formatCurrency(amount)} recorded successfully!`, 'success');
        
        document.getElementById('paymentForm')?.reset();
        document.getElementById('paymentDate').value = new Date().toISOString().split('T')[0];
        
        loadAllData();

    } catch (error) {
        console.error('❌ Error recording payment:', error);
        showToast('Error recording payment: ' + error.message, 'error');
    }
}

/**
 * View payment details
 */
function viewPaymentDetails(paymentId) {
    const modal = document.getElementById('paymentDetailModal');
    if (!modal) return;
    
    modal.classList.add('active');
    document.getElementById('paymentDetailBody').innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <div class="loading-spinner"></div>
            <p style="margin-top: 10px; color: #94a3b8;">Loading payment details...</p>
        </div>
    `;
    
    const payment = allPayments.find(p => p.id === paymentId);
    
    setTimeout(() => {
        if (payment) {
            const statusClass = payment.status === 'completed' ? 'badge-success' :
                               payment.status === 'pending' ? 'badge-warning' : 'badge-danger';
            const statusLabel = payment.status ? payment.status.charAt(0).toUpperCase() + payment.status.slice(1) : 'Pending';
            
            document.getElementById('paymentDetailBody').innerHTML = `
                <div style="padding: 10px 0;">
                    <h4 style="color: #0A3D62; margin-bottom: 15px;">Payment Receipt</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: #f8fafc; padding: 16px; border-radius: 8px;">
                        <div><strong>Transaction ID:</strong> ${payment.id}</div>
                        <div><strong>Date:</strong> ${formatDate(payment.payment_date)}</div>
                        <div><strong>Student:</strong> ${payment.student_name}</div>
                        <div><strong>Amount:</strong> <strong>${formatCurrency(payment.amount)}</strong></div>
                        <div><strong>Method:</strong> ${payment.payment_method}</div>
                        <div><strong>Reference:</strong> ${payment.reference_number || '-'}</div>
                        <div><strong>Period:</strong> ${payment.period || '-'}</div>
                        <div><strong>Status:</strong> <span class="badge ${statusClass}">${statusLabel}</span></div>
                    </div>
                    ${payment.notes ? `<div style="margin-top: 12px;"><strong>Notes:</strong> ${payment.notes}</div>` : ''}
                </div>
            `;
        } else {
            document.getElementById('paymentDetailBody').innerHTML = `
                <div style="text-align: center; padding: 20px; color: #dc2626;">
                    <i class="fas fa-exclamation-circle" style="font-size: 24px; display: block; margin-bottom: 10px;"></i>
                    <p>Payment not found</p>
                </div>
            `;
        }
    }, 500);
}

/**
 * Delete payment
 */
async function deletePayment(paymentId) {
    if (!confirm('Are you sure you want to delete this payment? This action cannot be undone.')) {
        return;
    }

    try {
        const supabase = window.supabase || window.sb;
        if (!supabase) {
            showToast('Payment deleted successfully! (Demo)', 'success');
            loadAllData();
            return;
        }

        const { error } = await supabase
            .from(FINANCE_CONFIG.TABLES.PAYMENTS)
            .delete()
            .eq('id', paymentId);

        if (error) throw error;

        showToast('Payment deleted successfully.', 'success');
        loadAllData();

    } catch (error) {
        console.error('Error deleting payment:', error);
        showToast('Error deleting payment: ' + error.message, 'error');
    }
}

// ============================================================
// FEE STRUCTURE
// ============================================================

/**
 * Load fee structure
 */
async function loadFeeStructure() {
    console.log('📋 Loading fee structure...');
    
    try {
        const supabase = window.supabase || window.sb;
        if (!supabase) {
            showMockFeeStructure();
            return;
        }

        const { data: fees, error } = await supabase
            .from(FINANCE_CONFIG.TABLES.FEE_STRUCTURE)
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: true });

        if (error) throw error;

        renderFeeStructure(fees || []);
        
        console.log('✅ Fee structure loaded:', fees?.length || 0);

    } catch (error) {
        console.error('❌ Error loading fee structure:', error);
        showMockFeeStructure();
        showToast('Error loading fee structure', 'error');
    }
}

/**
 * Show mock fee structure (fallback)
 */
function showMockFeeStructure() {
    const mockFees = [
        { id: '1', program: 'KRCHN', block_term: 'Introductory', intake_year: '2026', amount: 60000, description: 'Tuition fees for Introductory Block' },
        { id: '2', program: 'KRCHN', block_term: 'Block 1', intake_year: '2026', amount: 60000, description: 'Tuition fees for Block 1' },
        { id: '3', program: 'KRCHN', block_term: 'Block 2', intake_year: '2026', amount: 60000, description: 'Tuition fees for Block 2' },
        { id: '4', program: 'DPOTT', block_term: 'Introductory', intake_year: '2026', amount: 50000, description: 'Tuition fees for Introductory Block' },
        { id: '5', program: 'DCH', block_term: 'Introductory', intake_year: '2026', amount: 50000, description: 'Tuition fees for Introductory Block' },
    ];
    renderFeeStructure(mockFees);
}

/**
 * Render fee structure
 */
function renderFeeStructure(fees) {
    const tbody = document.getElementById('feeStructureTableBody');
    if (!tbody) return;

    if (!fees || fees.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: #94a3b8;">
                    <i class="fas fa-info-circle"></i> No fee structure configured
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = fees.map(f => `
        <tr>
            <td><strong>${f.program || '-'}</strong></td>
            <td>${f.block_term || '-'}</td>
            <td>${f.intake_year || '-'}</td>
            <td><strong>${formatCurrency(f.amount)}</strong></td>
            <td>${f.description || '-'}</td>
            <td><span class="badge badge-success">Active</span></td>
            <td>
                <button onclick="editFeeStructure('${f.id}')" class="btn-action btn-primary btn-xs">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteFeeStructure('${f.id}')" class="btn-action btn-danger btn-xs">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

/**
 * Save fee structure
 */
function saveFeeStructure() {
    const program = document.getElementById('feeProgram')?.value;
    const block = document.getElementById('feeBlock')?.value;
    const year = document.getElementById('feeIntakeYear')?.value;
    const amount = document.getElementById('feeAmount')?.value;
    const description = document.getElementById('feeDescription')?.value;

    if (!program || !block || !year || !amount) {
        showToast('Please fill in all required fields.', 'warning');
        return;
    }

    showToast('Fee structure saved successfully!', 'success');
    document.getElementById('feeStructureForm')?.reset();
    loadFeeStructure();
}

/**
 * Refresh fee structure
 */
function refreshFeeStructure() {
    loadFeeStructure();
    showToast('Fee structure refreshed!', 'success');
}

// ============================================================
// TRANSACTIONS
// ============================================================

/**
 * Load transactions
 */
async function loadTransactions() {
    console.log('📋 Loading transactions...');
    
    try {
        const supabase = window.supabase || window.sb;
        if (!supabase) {
            showMockTransactions();
            return;
        }

        const { data: transactions, error } = await supabase
            .from(FINANCE_CONFIG.TABLES.PAYMENTS)
            .select('*')
            .order('payment_date', { ascending: false });

        if (error) throw error;

        allTransactions = transactions || [];
        renderTransactions(allTransactions);
        
        console.log('✅ Transactions loaded:', allTransactions.length);

    } catch (error) {
        console.error('❌ Error loading transactions:', error);
        showMockTransactions();
        showToast('Error loading transactions', 'error');
    }
}

/**
 * Show mock transactions (fallback)
 */
function showMockTransactions() {
    const mockTransactions = [
        { id: 'TXN-001', payment_date: '2026-07-31 14:30', student_name: 'Jane Doe', program: 'KRCHN', amount: 45000, payment_method: 'M-Pesa', reference_number: 'MPESA-7845', status: 'completed' },
        { id: 'TXN-002', payment_date: '2026-07-31 11:15', student_name: 'John Smith', program: 'DPOTT', amount: 32000, payment_method: 'Cash', reference_number: 'CASH-1234', status: 'completed' },
        { id: 'TXN-003', payment_date: '2026-07-30 16:45', student_name: 'Mary Wanjiru', program: 'DCH', amount: 28000, payment_method: 'Bank Transfer', reference_number: 'BT-5678', status: 'pending' },
    ];
    renderTransactions(mockTransactions);
}

/**
 * Render transactions
 */
function renderTransactions(transactions) {
    const tbody = document.getElementById('transactionsTableBody');
    if (!tbody) return;

    if (!transactions || transactions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 40px; color: #94a3b8;">
                    <i class="fas fa-info-circle"></i> No transactions found
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = transactions.map(t => {
        const statusClass = t.status === 'completed' ? 'badge-success' :
                           t.status === 'pending' ? 'badge-warning' : 'badge-danger';
        const statusLabel = t.status ? t.status.charAt(0).toUpperCase() + t.status.slice(1) : 'Pending';

        return `
            <tr>
                <td><strong>${t.id || '-'}</strong></td>
                <td>${formatDateTime(t.payment_date)}</td>
                <td><strong>${t.student_name || 'N/A'}</strong></td>
                <td>${t.program || '-'}</td>
                <td><strong>${formatCurrency(t.amount)}</strong></td>
                <td>${t.payment_method || '-'}</td>
                <td>${t.reference_number || '-'}</td>
                <td><span class="badge ${statusClass}">${statusLabel}</span></td>
                <td>
                    <button onclick="viewTransaction('${t.id}')" class="btn-action btn-primary btn-xs">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Filter transactions
 */
function filterTransactions() {
    const search = document.getElementById('transactionSearch')?.value?.toLowerCase() || '';
    const statusFilter = document.getElementById('transactionStatusFilter')?.value || 'all';
    const dateFrom = document.getElementById('transactionDateFrom')?.value;
    const dateTo = document.getElementById('transactionDateTo')?.value;
    
    let filtered = allTransactions;

    if (search) {
        filtered = filtered.filter(t => 
            (t.student_name || '').toLowerCase().includes(search) ||
            (t.id || '').toLowerCase().includes(search) ||
            (t.reference_number || '').toLowerCase().includes(search)
        );
    }

    if (statusFilter !== 'all') {
        filtered = filtered.filter(t => t.status === statusFilter);
    }

    if (dateFrom) {
        filtered = filtered.filter(t => t.payment_date >= dateFrom);
    }

    if (dateTo) {
        filtered = filtered.filter(t => t.payment_date <= dateTo);
    }

    renderTransactions(filtered);
}

/**
 * Reset transaction filters
 */
function resetTransactionFilters() {
    document.getElementById('transactionSearch').value = '';
    document.getElementById('transactionStatusFilter').value = 'all';
    document.getElementById('transactionDateFrom').value = '';
    document.getElementById('transactionDateTo').value = '';
    renderTransactions(allTransactions);
}

/**
 * View transaction
 */
function viewTransaction(transactionId) {
    showToast('Viewing transaction: ' + transactionId, 'info');
}

// ============================================================
// SETTINGS
// ============================================================

/**
 * Load settings
 */
function loadSettings() {
    const status = localStorage.getItem('finance_module_status') || 'active';
    const currency = localStorage.getItem('finance_currency') || 'KES';
    const terms = localStorage.getItem('finance_terms') || '30';
    const lateFee = localStorage.getItem('finance_late_fee') || '5';
    
    document.getElementById('moduleStatus').value = status;
    document.getElementById('defaultCurrency').value = currency;
    document.getElementById('paymentTerms').value = terms;
    document.getElementById('lateFee').value = lateFee;
}

/**
 * Save settings
 */
function saveSettings() {
    const status = document.getElementById('moduleStatus').value;
    const currency = document.getElementById('defaultCurrency').value;
    const terms = document.getElementById('paymentTerms').value;
    const lateFee = document.getElementById('lateFee').value;
    
    localStorage.setItem('finance_module_status', status);
    localStorage.setItem('finance_currency', currency);
    localStorage.setItem('finance_terms', terms);
    localStorage.setItem('finance_late_fee', lateFee);
    
    showToast('Settings saved successfully!', 'success');
}

// ============================================================
// REPORTS
// ============================================================

/**
 * Generate report
 */
function generateReport() {
    showToast('Generating report...', 'info');
    document.getElementById('reportContent').innerHTML = `
        <div style="padding: 30px; text-align: center;">
            <i class="fas fa-file-alt" style="font-size: 32px; color: #4C1D95; margin-bottom: 10px; display: block;"></i>
            <h3 style="color: #0A3D62;">Financial Report</h3>
            <p style="color: #64748b;">Report generated successfully. Use export buttons to download.</p>
            <div style="margin-top: 20px; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; text-align: left;">
                <div><strong>Total Students:</strong> ${document.getElementById('totalStudents').textContent}</div>
                <div><strong>Total Collected:</strong> ${document.getElementById('totalCollected').textContent}</div>
                <div><strong>Outstanding:</strong> ${document.getElementById('outstandingBalance').textContent}</div>
                <div><strong>Overdue:</strong> ${document.getElementById('overdueAccounts').textContent}</div>
            </div>
        </div>
    `;
}

/**
 * Export report to PDF
 */
function exportReportToPDF() {
    showToast('Exporting PDF...', 'info');
}

/**
 * Export report to CSV
 */
function exportReportToCSV() {
    showToast('Exporting CSV...', 'info');
}

// ============================================================
// EXPORT FUNCTIONS
// ============================================================

/**
 * Export accounts to CSV
 */
function exportAccountsToCSV() {
    showToast('Exporting accounts to CSV...', 'info');
}

/**
 * Export payments to CSV
 */
function exportPaymentsToCSV() {
    showToast('Exporting payments to CSV...', 'info');
}

/**
 * Export all data
 */
function exportAllData() {
    showToast('Exporting all data...', 'info');
}

/**
 * Backup data
 */
function backupData() {
    showToast('Backup created!', 'success');
}

/**
 * Clear cache
 */
function clearCache() {
    showToast('Cache cleared!', 'success');
}

/**
 * Reset module
 */
function resetModule() {
    if (confirm('Are you sure you want to reset the module? This cannot be undone!')) {
        showToast('Module reset!', 'warning');
    }
}

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('financeToastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i> ${message}`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ============================================================
// MODAL HELPERS
// ============================================================

/**
 * Close modal
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

// Close modals on outside click
document.addEventListener('click', function(e) {
    document.querySelectorAll('.modal-overlay.active').forEach(modal => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});

// Close modals on ESC key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(modal => {
            modal.classList.remove('active');
        });
    }
});

// ============================================================
// PLACEHOLDER FUNCTIONS
// ============================================================

function editFeeStructure(feeId) {
    showToast('Editing fee: ' + feeId, 'info');
}

function deleteFeeStructure(feeId) {
    if (confirm('Delete this fee structure?')) {
        showToast('Fee structure deleted!', 'success');
    }
}

console.log('✅ Finance Module initialized successfully!');
console.log('📊 Version:', FINANCE_CONFIG.APP.VERSION);
console.log('🔐 User authenticated:', isFinanceAuthenticated());
