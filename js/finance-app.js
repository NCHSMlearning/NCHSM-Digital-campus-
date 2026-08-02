/**
 * FINANCE MODULE - MAIN APPLICATION
 * Core application logic for the finance dashboard
 */

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    // Set current date
    updateCurrentDate();
    
    // Initialize tabs
    initFinanceTabs();
    
    // Load dashboard data
    if (isFinanceAuthenticated()) {
        loadDashboardData();
        
        // Load initial data for other tabs
        setTimeout(() => {
            if (document.getElementById('tab-accounts')) loadAccounts();
            if (document.getElementById('tab-payments')) loadPayments();
            if (document.getElementById('tab-fee-structure')) loadFeeStructure();
            if (document.getElementById('tab-transactions')) loadTransactions();
        }, 500);
    }
});

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
 * Initialize finance tabs
 */
function initFinanceTabs() {
    const tabLinks = document.querySelectorAll('.finance-nav a[data-tab]');
    const tabContents = document.querySelectorAll('.finance-tab-content');
    
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

/**
 * Refresh all finance data
 */
function refreshFinanceData() {
    showToast('Refreshing data...', 'info');
    loadDashboardData();
    loadAccounts();
    loadPayments();
    loadFeeStructure();
    loadTransactions();
    
    setTimeout(() => {
        showToast('Data refreshed successfully!', 'success');
    }, 1000);
}

// ===== DASHBOARD =====

/**
 * Load dashboard data
 */
async function loadDashboardData() {
    try {
        // Simulate API call - replace with actual API
        const data = await simulateDashboardData();
        
        // Update stats
        document.getElementById('totalStudents').textContent = data.totalStudents;
        document.getElementById('totalCollected').textContent = formatCurrency(data.totalCollected);
        document.getElementById('outstandingBalance').textContent = formatCurrency(data.outstandingBalance);
        document.getElementById('overdueAccounts').textContent = data.overdueAccounts;
        document.getElementById('todayPayments').textContent = formatCurrency(data.todayPayments);
        document.getElementById('totalTransactions').textContent = data.totalTransactions;
        
        // Update badges
        document.getElementById('dashboardBadge').textContent = data.overdueAccounts;
        document.getElementById('accountsBadge').textContent = data.totalStudents;
        
        // Load recent transactions
        loadRecentTransactions(data.recentTransactions);
        
        // Initialize charts
        initializeCharts(data);
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showToast('Error loading dashboard data', 'error');
    }
}

/**
 * Simulate dashboard data
 */
function simulateDashboardData() {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                totalStudents: 145,
                totalCollected: 2845000,
                outstandingBalance: 1560000,
                overdueAccounts: 23,
                todayPayments: 128000,
                totalTransactions: 876,
                recentTransactions: [
                    { date: '2026-07-31', student: 'Jane Doe', program: 'KRCHN', amount: 45000, method: 'M-Pesa', status: 'completed' },
                    { date: '2026-07-31', student: 'John Smith', program: 'DPOTT', amount: 32000, method: 'Cash', status: 'completed' },
                    { date: '2026-07-30', student: 'Mary Wanjiru', program: 'DCH', amount: 28000, method: 'Bank Transfer', status: 'pending' },
                    { date: '2026-07-30', student: 'Peter Ochieng', program: 'KRCHN', amount: 55000, method: 'M-Pesa', status: 'completed' },
                    { date: '2026-07-29', student: 'Sarah Kimani', program: 'DSW', amount: 21000, method: 'Card', status: 'completed' }
                ],
                monthlyData: [180000, 220000, 195000, 280000, 310000, 245000, 290000, 350000, 320000, 280000, 260000, 284500],
                statusData: { completed: 65, pending: 20, failed: 10, refunded: 5 }
            });
        }, 800);
    });
}

/**
 * Load recent transactions
 */
function loadRecentTransactions(transactions) {
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
    
    tbody.innerHTML = transactions.map(t => `
        <tr>
            <td>${formatDate(t.date)}</td>
            <td><strong>${t.student}</strong></td>
            <td>${t.program}</td>
            <td><strong>${formatCurrency(t.amount)}</strong></td>
            <td>${t.method}</td>
            <td>
                <span class="finance-badge ${t.status === 'completed' ? 'finance-badge-success' : t.status === 'pending' ? 'finance-badge-warning' : 'finance-badge-danger'}">
                    ${t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                </span>
            </td>
        </tr>
    `).join('');
}

// ===== CHARTS =====

let monthlyChart = null;
let statusChart = null;

/**
 * Initialize charts
 */
function initializeCharts(data) {
    // Monthly Collections Chart
    const monthlyCtx = document.getElementById('monthlyCollectionsChart');
    if (monthlyCtx) {
        if (monthlyChart) monthlyChart.destroy();
        
        monthlyChart = new Chart(monthlyCtx, {
            type: 'bar',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: [{
                    label: 'Monthly Collections (KES)',
                    data: data.monthlyData || [],
                    backgroundColor: 'rgba(76, 29, 149, 0.7)',
                    borderColor: '#4C1D95',
                    borderWidth: 2,
                    borderRadius: 4,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'KES ' + (value / 1000).toFixed(0) + 'k';
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Payment Status Chart
    const statusCtx = document.getElementById('paymentStatusChart');
    if (statusCtx) {
        if (statusChart) statusChart.destroy();
        
        const statusData = data.statusData || { completed: 65, pending: 20, failed: 10, refunded: 5 };
        
        statusChart = new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: ['Completed', 'Pending', 'Failed', 'Refunded'],
                datasets: [{
                    data: [statusData.completed, statusData.pending, statusData.failed, statusData.refunded],
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
                        labels: {
                            padding: 15,
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    }
                },
                cutout: '60%'
            }
        });
    }
}

// ===== STUDENT ACCOUNTS =====

/**
 * Load student accounts
 */
async function loadAccounts() {
    try {
        const data = await simulateAccountsData();
        renderAccounts(data);
    } catch (error) {
        console.error('Error loading accounts:', error);
        showToast('Error loading student accounts', 'error');
    }
}

/**
 * Simulate accounts data
 */
function simulateAccountsData() {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve([
                { id: 1, name: 'Jane Doe', studentId: 'KRCHN/001/2026', program: 'KRCHN', intake: 'March 2026', totalDue: 180000, totalPaid: 135000, balance: 45000 },
                { id: 2, name: 'John Smith', studentId: 'DPOTT/023/2026', program: 'DPOTT', intake: 'March 2026', totalDue: 150000, totalPaid: 150000, balance: 0 },
                { id: 3, name: 'Mary Wanjiru', studentId: 'DCH/045/2025', program: 'DCH', intake: 'March 2025', totalDue: 160000, totalPaid: 120000, balance: 40000 },
                { id: 4, name: 'Peter Ochieng', studentId: 'KRCHN/089/2025', program: 'KRCHN', intake: 'March 2025', totalDue: 180000, totalPaid: 180000, balance: 0 },
                { id: 5, name: 'Sarah Kimani', studentId: 'DSW/012/2026', program: 'DSW', intake: 'March 2026', totalDue: 140000, totalPaid: 98000, balance: 42000 },
                { id: 6, name: 'David Mwangi', studentId: 'KRCHN/034/2026', program: 'KRCHN', intake: 'March 2026', totalDue: 180000, totalPaid: 90000, balance: 90000 },
                { id: 7, name: 'Grace Akinyi', studentId: 'DHRIT/056/2025', program: 'DHRIT', intake: 'March 2025', totalDue: 145000, totalPaid: 145000, balance: 0 },
                { id: 8, name: 'Michael Odhiambo', studentId: 'KRCHN/078/2024', program: 'KRCHN', intake: 'March 2024', totalDue: 180000, totalPaid: 180000, balance: 0 },
            ]);
        }, 600);
    });
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
        const status = acc.balance === 0 ? 'paid' : 
                      acc.balance > 0 && acc.balance <= 10000 ? 'partial' : 'outstanding';
        const statusLabel = status === 'paid' ? '✅ Paid' :
                           status === 'partial' ? '⚠️ Partial' : '🔴 Outstanding';
        const statusClass = status === 'paid' ? 'finance-badge-success' :
                           status === 'partial' ? 'finance-badge-warning' : 'finance-badge-danger';
        
        return `
            <tr>
                <td><strong>${acc.name}</strong></td>
                <td>${acc.studentId}</td>
                <td>${acc.program}</td>
                <td>${acc.intake}</td>
                <td>${formatCurrency(acc.totalDue)}</td>
                <td>${formatCurrency(acc.totalPaid)}</td>
                <td><strong>${formatCurrency(acc.balance)}</strong></td>
                <td><span class="finance-badge ${statusClass}">${statusLabel}</span></td>
                <td>
                    <button onclick="viewStudentAccount(${acc.id})" class="finance-btn finance-btn-primary finance-btn-sm">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="viewStudentPayments(${acc.id})" class="finance-btn finance-btn-outline finance-btn-sm">
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
    // Implement filtering logic
    showToast('Filter applied', 'info');
}

/**
 * Reset account filters
 */
function resetAccountFilters() {
    document.getElementById('accountSearch').value = '';
    document.getElementById('accountStatusFilter').value = 'all';
    document.getElementById('accountProgramFilter').value = 'all';
    loadAccounts();
}

/**
 * View student account
 */
function viewStudentAccount(studentId) {
    // Open student account modal
    document.getElementById('studentAccountModal').classList.add('active');
    document.getElementById('studentAccountBody').innerHTML = `
        <div class="finance-loading">
            <div class="spinner"></div>
            <span>Loading student account...</span>
        </div>
    `;
    
    // Simulate loading
    setTimeout(() => {
        document.getElementById('studentAccountBody').innerHTML = `
            <div style="padding: 10px 0;">
                <h4 style="color: #0A3D62; margin-bottom: 15px;">Student: Jane Doe</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div><strong>Student ID:</strong> KRCHN/001/2026</div>
                    <div><strong>Program:</strong> KRCHN Nursing</div>
                    <div><strong>Intake:</strong> March 2026</div>
                    <div><strong>Balance:</strong> ${formatCurrency(45000)}</div>
                </div>
                <hr style="margin: 15px 0;">
                <h5 style="margin-bottom: 10px;">Payment History</h5>
                <ul style="list-style: none; padding: 0;">
                    <li style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between;">
                        <span>31 Jul 2026 - M-Pesa</span>
                        <span><strong>${formatCurrency(45000)}</strong></span>
                    </li>
                    <li style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between;">
                        <span>15 Jul 2026 - Bank Transfer</span>
                        <span><strong>${formatCurrency(30000)}</strong></span>
                    </li>
                    <li style="padding: 8px 0; display: flex; justify-content: space-between;">
                        <span>01 Jul 2026 - Cash</span>
                        <span><strong>${formatCurrency(60000)}</strong></span>
                    </li>
                </ul>
            </div>
        `;
    }, 600);
}

// ===== PAYMENTS =====

/**
 * Load payments
 */
async function loadPayments() {
    try {
        const data = await simulatePaymentsData();
        renderPayments(data);
    } catch (error) {
        console.error('Error loading payments:', error);
        showToast('Error loading payment history', 'error');
    }
}

/**
 * Simulate payments data
 */
function simulatePaymentsData() {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve([
                { id: 1, date: '2026-07-31', student: 'Jane Doe', program: 'KRCHN', amount: 45000, method: 'M-Pesa', reference: 'MPESA-7845', period: 'Term 2', status: 'completed' },
                { id: 2, date: '2026-07-31', student: 'John Smith', program: 'DPOTT', amount: 32000, method: 'Cash', reference: 'CASH-1234', period: 'Term 2', status: 'completed' },
                { id: 3, date: '2026-07-30', student: 'Mary Wanjiru', program: 'DCH', amount: 28000, method: 'Bank Transfer', reference: 'BT-5678', period: 'Term 2', status: 'pending' },
                { id: 4, date: '2026-07-30', student: 'Peter Ochieng', program: 'KRCHN', amount: 55000, method: 'M-Pesa', reference: 'MPESA-9012', period: 'Term 2', status: 'completed' },
                { id: 5, date: '2026-07-29', student: 'Sarah Kimani', program: 'DSW', amount: 21000, method: 'Card', reference: 'CRD-3456', period: 'Term 1', status: 'completed' },
                { id: 6, date: '2026-07-28', student: 'David Mwangi', program: 'KRCHN', amount: 30000, method: 'M-Pesa', reference: 'MPESA-7890', period: 'Term 2', status: 'failed' },
                { id: 7, date: '2026-07-28', student: 'Grace Akinyi', program: 'DHRIT', amount: 25000, method: 'Bank Transfer', reference: 'BT-2345', period: 'Term 2', status: 'completed' },
            ]);
        }, 600);
    });
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
        const statusClass = p.status === 'completed' ? 'finance-badge-success' :
                           p.status === 'pending' ? 'finance-badge-warning' : 'finance-badge-danger';
        const statusLabel = p.status.charAt(0).toUpperCase() + p.status.slice(1);
        
        return `
            <tr>
                <td>${formatDate(p.date)}</td>
                <td><strong>${p.student}</strong></td>
                <td>${p.program}</td>
                <td><strong>${formatCurrency(p.amount)}</strong></td>
                <td>${p.method}</td>
                <td>${p.reference || '-'}</td>
                <td>${p.period}</td>
                <td><span class="finance-badge ${statusClass}">${statusLabel}</span></td>
                <td>
                    <button onclick="viewPaymentDetails(${p.id})" class="finance-btn finance-btn-primary finance-btn-sm">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="deletePayment(${p.id})" class="finance-btn finance-btn-danger finance-btn-sm">
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
    const form = document.getElementById('paymentForm');
    const student = document.getElementById('paymentStudent').value;
    const amount = document.getElementById('paymentAmount').value;
    const method = document.getElementById('paymentMethod').value;
    const reference = document.getElementById('paymentReference').value;
    const date = document.getElementById('paymentDate').value;
    const period = document.getElementById('paymentPeriod').value;
    const notes = document.getElementById('paymentNotes').value;
    
    if (!student || !amount || !date) {
        showToast('Please fill in all required fields.', 'warning');
        return;
    }
    
    try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        showToast('Payment recorded successfully!', 'success');
        form.reset();
        loadPayments();
        loadDashboardData();
        
    } catch (error) {
        console.error('Error recording payment:', error);
        showToast('Error recording payment. Please try again.', 'error');
    }
}

/**
 * View payment details
 */
function viewPaymentDetails(paymentId) {
    document.getElementById('paymentDetailModal').classList.add('active');
    document.getElementById('paymentDetailBody').innerHTML = `
        <div class="finance-loading">
            <div class="spinner"></div>
            <span>Loading payment details...</span>
        </div>
    `;
    
    setTimeout(() => {
        document.getElementById('paymentDetailBody').innerHTML = `
            <div style="padding: 10px 0;">
                <h4 style="color: #0A3D62; margin-bottom: 15px;">Payment Receipt</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: #f8fafc; padding: 16px; border-radius: 8px;">
                    <div><strong>Transaction ID:</strong> PAY-${paymentId}-${Date.now().toString(36)}</div>
                    <div><strong>Date:</strong> ${formatDate(new Date())}</div>
                    <div><strong>Student:</strong> Jane Doe</div>
                    <div><strong>Amount:</strong> ${formatCurrency(45000)}</div>
                    <div><strong>Method:</strong> M-Pesa</div>
                    <div><strong>Reference:</strong> MPESA-7845</div>
                    <div><strong>Period:</strong> Term 2</div>
                    <div><strong>Status:</strong> <span class="finance-badge finance-badge-success">Completed</span></div>
                </div>
                ${notes ? `<div style="margin-top: 12px;"><strong>Notes:</strong> ${notes}</div>` : ''}
            </div>
        `;
    }, 500);
}

/**
 * Delete payment
 */
function deletePayment(paymentId) {
    if (!confirm('Are you sure you want to delete this payment? This action cannot be undone.')) {
        return;
    }
    
    showToast('Payment deleted successfully.', 'success');
    loadPayments();
}

// ===== FEE STRUCTURE =====

/**
 * Load fee structure
 */
async function loadFeeStructure() {
    try {
        const data = await simulateFeeStructureData();
        renderFeeStructure(data);
    } catch (error) {
        console.error('Error loading fee structure:', error);
        showToast('Error loading fee structure', 'error');
    }
}

/**
 * Simulate fee structure data
 */
function simulateFeeStructureData() {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve([
                { id: 1, program: 'KRCHN', block: 'Introductory', year: '2026', amount: 60000, description: 'Tuition fees for Introductory Block' },
                { id: 2, program: 'KRCHN', block: 'Block 1', year: '2026', amount: 60000, description: 'Tuition fees for Block 1' },
                { id: 3, program: 'KRCHN', block: 'Block 2', year: '2026', amount: 60000, description: 'Tuition fees for Block 2' },
                { id: 4, program: 'DPOTT', block: 'Introductory', year: '2026', amount: 50000, description: 'Tuition fees for Introductory Block' },
                { id: 5, program: 'DCH', block: 'Introductory', year: '2026', amount: 50000, description: 'Tuition fees for Introductory Block' },
            ]);
        }, 500);
    });
}

/**
 * Render fee structure
 */
function renderFeeStructure(items) {
    const tbody = document.getElementById('feeStructureTableBody');
    if (!tbody) return;
    
    if (!items || items.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: #94a3b8;">
                    <i class="fas fa-info-circle"></i> No fee structure configured
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = items.map(item => `
        <tr>
            <td><strong>${item.program}</strong></td>
            <td>${item.block}</td>
            <td>${item.year}</td>
            <td><strong>${formatCurrency(item.amount)}</strong></td>
            <td>${item.description || '-'}</td>
            <td><span class="finance-badge finance-badge-success">Active</span></td>
            <td>
                <button onclick="editFeeStructure(${item.id})" class="finance-btn finance-btn-primary finance-btn-sm">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteFeeStructure(${item.id})" class="finance-btn finance-btn-danger finance-btn-sm">
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
    const program = document.getElementById('feeProgram').value;
    const block = document.getElementById('feeBlock').value;
    const year = document.getElementById('feeIntakeYear').value;
    const amount = document.getElementById('feeAmount').value;
    const description = document.getElementById('feeDescription').value;
    
    if (!program || !block || !year || !amount) {
        showToast('Please fill in all required fields.', 'warning');
        return;
    }
    
    showToast('Fee structure saved successfully!', 'success');
    document.getElementById('feeStructureForm').reset();
    loadFeeStructure();
}

// ===== TRANSACTIONS =====

/**
 * Load transactions
 */
async function loadTransactions() {
    try {
        const data = await simulateTransactionsData();
        renderTransactions(data);
    } catch (error) {
        console.error('Error loading transactions:', error);
        showToast('Error loading transactions', 'error');
    }
}

/**
 * Simulate transactions data
 */
function simulateTransactionsData() {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve([
                { id: 'TXN-001', date: '2026-07-31 14:30', student: 'Jane Doe', program: 'KRCHN', amount: 45000, method: 'M-Pesa', reference: 'MPESA-7845', status: 'completed' },
                { id: 'TXN-002', date: '2026-07-31 11:15', student: 'John Smith', program: 'DPOTT', amount: 32000, method: 'Cash', reference: 'CASH-1234', status: 'completed' },
                { id: 'TXN-003', date: '2026-07-30 16:45', student: 'Mary Wanjiru', program: 'DCH', amount: 28000, method: 'Bank Transfer', reference: 'BT-5678', status: 'pending' },
                { id: 'TXN-004', date: '2026-07-30 09:20', student: 'Peter Ochieng', program: 'KRCHN', amount: 55000, method: 'M-Pesa', reference: 'MPESA-9012', status: 'completed' },
                { id: 'TXN-005', date: '2026-07-29 13:00', student: 'Sarah Kimani', program: 'DSW', amount: 21000, method: 'Card', reference: 'CRD-3456', status: 'completed' },
            ]);
        }, 500);
    });
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
        const statusClass = t.status === 'completed' ? 'finance-badge-success' :
                           t.status === 'pending' ? 'finance-badge-warning' : 'finance-badge-danger';
        const statusLabel = t.status.charAt(0).toUpperCase() + t.status.slice(1);
        
        return `
            <tr>
                <td><strong>${t.id}</strong></td>
                <td>${formatDateTime(t.date)}</td>
                <td><strong>${t.student}</strong></td>
                <td>${t.program}</td>
                <td><strong>${formatCurrency(t.amount)}</strong></td>
                <td>${t.method}</td>
                <td>${t.reference || '-'}</td>
                <td><span class="finance-badge ${statusClass}">${statusLabel}</span></td>
                <td>
                    <button onclick="viewTransaction('${t.id}')" class="finance-btn finance-btn-primary finance-btn-sm">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// ===== SETTINGS =====

/**
 * Load settings
 */
function loadSettings() {
    // Load settings from storage or defaults
    const moduleStatus = localStorage.getItem('finance_module_status') || 'active';
    document.getElementById('moduleStatus').value = moduleStatus;
    
    const currency = localStorage.getItem('finance_currency') || 'KES';
    document.getElementById('defaultCurrency').value = currency;
    
    const terms = localStorage.getItem('finance_terms') || '30';
    document.getElementById('paymentTerms').value = terms;
    
    const lateFee = localStorage.getItem('finance_late_fee') || '5';
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

// ===== TOAST NOTIFICATIONS =====

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('financeToastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `finance-toast finance-toast-${type}`;
    
    // Icon based on type
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    toast.innerHTML = `
        <i class="fas ${icons[type] || icons.info}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ===== MODAL HELPERS =====

/**
 * Close modal
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

// Close modals on outside click
document.addEventListener('click', function(e) {
    document.querySelectorAll('.finance-modal.active').forEach(modal => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});

// Close modals on ESC key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        document.querySelectorAll('.finance-modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
    }
});

// ===== EXPORT FUNCTIONS =====

/**
 * Export accounts to CSV
 */
function exportAccountsToCSV() {
    showToast('Exporting accounts to CSV...', 'info');
    // Implement CSV export logic
}

/**
 * Export payments to CSV
 */
function exportPaymentsToCSV() {
    showToast('Exporting payments to CSV...', 'info');
}

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
                <div><strong>Total Students:</strong> 145</div>
                <div><strong>Total Collected:</strong> ${formatCurrency(2845000)}</div>
                <div><strong>Outstanding:</strong> ${formatCurrency(1560000)}</div>
                <div><strong>Pass Rate:</strong> 78%</div>
            </div>
        </div>
    `;
}

// ===== INITIALIZATION =====

// Set default date for payment date
document.addEventListener('DOMContentLoaded', function() {
    const paymentDate = document.getElementById('paymentDate');
    if (paymentDate) {
        const today = new Date().toISOString().split('T')[0];
        paymentDate.value = today;
    }
});

console.log('Finance Module initialized successfully!');
console.log('Version:', FINANCE_CONFIG.APP.VERSION);
console.log('User authenticated:', isFinanceAuthenticated());
