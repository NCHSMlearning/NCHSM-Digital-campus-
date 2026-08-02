/**
 * FINANCE MODULE - MAIN APPLICATION
 * Core application logic for the finance dashboard
 * Uses financeAPI for all Supabase operations
 */

// ============================================================
// GLOBALS
// ============================================================
let monthlyChart = null;
let statusChart = null;
let allAccounts = [];
let allPayments = [];
let allTransactions = [];
let allFeeStructures = [];

// ============================================================
// INITIALIZATION
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('💰 Finance Module starting...');
    
    // HIDE .html EXTENSION
    if (window.location.pathname.endsWith('.html')) {
        const cleanPath = window.location.pathname.replace(/\.html$/, '');
        window.history.replaceState({}, '', cleanPath);
    }
    
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
    setTimeout(loadAllData, 500);
});

// ============================================================
// DATE HELPERS
// ============================================================

function updateCurrentDate() {
    const dateDisplay = document.getElementById('currentDate');
    if (dateDisplay) {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateDisplay.textContent = now.toLocaleDateString('en-KE', options);
    }
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-KE', options);
}

function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const options = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };
    return date.toLocaleDateString('en-KE', options);
}

function formatCurrency(amount) {
    if (amount === null || amount === undefined) return 'KES 0';
    return 'KES ' + parseFloat(amount).toLocaleString();
}

// ============================================================
// USER AUTHENTICATION
// ============================================================

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

function isFinanceAuthenticated() {
    const user = getFinanceUser();
    if (!user) return false;
    if (!user.token) return false;
    return true;
}

// ============================================================
// TAB NAVIGATION
// ============================================================

function initFinanceTabs() {
    console.log('🔧 Initializing tabs...');
    
    const tabLinks = document.querySelectorAll('.finance-nav a[data-tab]');
    console.log('📋 Found nav links:', tabLinks.length);
    
    tabLinks.forEach(link => {
        const newLink = link.cloneNode(true);
        link.parentNode.replaceChild(newLink, link);
        
        const tabId = newLink.getAttribute('data-tab');
        newLink.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔗 Nav link clicked:', tabId);
            showFinanceTab(tabId);
        });
        console.log('✅ Nav link attached:', tabId);
    });
    
    setTimeout(() => {
        showFinanceTab('dashboard');
    }, 100);
}

function showFinanceTab(tabId) {
    console.log('📂 Opening tab:', tabId);
    
    document.querySelectorAll('.finance-nav a[data-tab]').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-tab') === tabId) {
            link.classList.add('active');
        }
    });
    
    document.querySelectorAll('.finance-tab-content, .tab-content').forEach(tab => {
        tab.style.display = 'none';
        tab.classList.remove('active');
    });
    
    const target = document.getElementById(`tab-${tabId}`);
    if (target) {
        target.style.display = 'block';
        target.classList.add('active');
        console.log('✅ Tab opened:', tabId);
    } else {
        console.warn('⚠️ Tab not found:', tabId);
    }
    
    loadTabData(tabId);
}

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

function toggleSidebar() {
    const sidebar = document.getElementById('financeSidebar');
    if (sidebar) {
        sidebar.classList.toggle('open');
        console.log('Sidebar open?', sidebar.classList.contains('open'));
    }
}

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

function goToMainDashboard() {
    window.location.href = '/home';
}

document.addEventListener('DOMContentLoaded', function() {
    const toggleBtn = document.querySelector('.finance-mobile-toggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            toggleSidebar();
        });
        console.log('✅ Toggle button attached');
    }
});

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

async function loadAllData() {
    try {
        if (typeof window.financeAPI === 'undefined') {
            console.warn('⚠️ financeAPI not loaded yet, waiting...');
            setTimeout(loadAllData, 500);
            return;
        }
        
        console.log('📊 Loading all data...');
        await loadDashboardData();
        await loadAccounts();
        await loadPayments();
        await loadFeeStructure();
        await loadTransactions();
        console.log('✅ All data loaded');
    } catch (error) {
        console.error('❌ Error loading data:', error);
        showToast('Error loading data. Please refresh.', 'error');
    }
}

// ============================================================
// DASHBOARD
// ============================================================

async function loadDashboardData() {
    console.log('📊 Loading dashboard data...');
    
    try {
        if (typeof window.financeAPI === 'undefined') {
            throw new Error('financeAPI not available');
        }
        
        const stats = await window.financeAPI.getDashboardStats();
        console.log('📊 Stats received:', stats);
        
        document.getElementById('totalStudents').textContent = stats.totalStudents || 0;
        document.getElementById('totalCollected').textContent = formatCurrency(stats.totalCollected || 0);
        document.getElementById('outstandingBalance').textContent = formatCurrency(stats.outstandingBalance || 0);
        document.getElementById('overdueAccounts').textContent = stats.overdueAccounts || 0;
        document.getElementById('todayPayments').textContent = formatCurrency(stats.todayPayments || 0);
        document.getElementById('totalTransactions').textContent = stats.totalTransactions || 0;
        
        document.getElementById('dashboardBadge').textContent = stats.overdueAccounts || 0;
        document.getElementById('accountsBadge').textContent = stats.totalStudents || 0;
        
        await loadRecentTransactions();
        await loadCharts();
        
        console.log('✅ Dashboard loaded');
        
    } catch (error) {
        console.error('❌ Error loading dashboard:', error);
        showToast('Error loading dashboard data', 'error');
    }
}

async function loadRecentTransactions() {
    try {
        if (typeof window.financeAPI === 'undefined') {
            return;
        }
        
        const transactions = await window.financeAPI.getPayments({ limit: 10 });
        renderRecentTransactions(transactions || []);
    } catch (error) {
        console.error('❌ Error loading recent transactions:', error);
    }
}

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
        const statusClass = t.status === 'completed' ? 'finance-badge-success' :
                           t.status === 'pending' ? 'finance-badge-warning' : 'finance-badge-danger';
        const statusLabel = t.status ? t.status.charAt(0).toUpperCase() + t.status.slice(1) : 'Pending';
        
        return `
            <tr>
                <td>${formatDate(t.payment_date)}</td>
                <td><strong>${t.student_name || 'N/A'}</strong></td>
                <td>${t.program || '-'}</td>
                <td><strong>${formatCurrency(t.amount)}</strong></td>
                <td>${t.payment_method || '-'}</td>
                <td>
                    <span class="finance-badge ${statusClass}">${statusLabel}</span>
                </td>
            </tr>
        `;
    }).join('');
}

async function loadCharts() {
    try {
        if (monthlyChart) {
            monthlyChart.destroy();
            monthlyChart = null;
        }
        if (statusChart) {
            statusChart.destroy();
            statusChart = null;
        }

        let payments = [];
        if (typeof window.financeAPI !== 'undefined') {
            payments = await window.financeAPI.getPayments({ limit: 500 });
        }
        
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthlyTotals = new Array(12).fill(0);
        
        payments.forEach(p => {
            if (p.payment_date) {
                const date = new Date(p.payment_date);
                const month = date.getMonth();
                monthlyTotals[month] += parseFloat(p.amount) || 0;
            }
        });

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

        const statusCounts = { completed: 0, pending: 0, failed: 0, refunded: 0 };
        payments.forEach(p => {
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

        console.log('✅ Charts loaded');

    } catch (error) {
        console.error('❌ Error loading charts:', error);
    }
}

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

async function loadAccounts() {
    console.log('📊 Loading student accounts...');
    
    try {
        if (typeof window.financeAPI === 'undefined') {
            return;
        }
        
        const accounts = await window.financeAPI.getStudentAccounts();
        allAccounts = accounts || [];
        renderAccounts(allAccounts);
        console.log('✅ Student accounts loaded:', allAccounts.length);
    } catch (error) {
        console.error('❌ Error loading accounts:', error);
        showToast('Error loading student accounts', 'error');
    }
}

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
        const statusClass = status === 'paid' ? 'finance-badge-success' :
                           status === 'partial' ? 'finance-badge-warning' : 'finance-badge-danger';

        return `
            <tr>
                <td><strong>${acc.student_name || 'N/A'}</strong></td>
                <td>${acc.student_id || '-'}</td>
                <td>${acc.program || '-'}</td>
                <td>${acc.intake_year || '-'}</td>
                <td>${formatCurrency(acc.total_fees_due)}</td>
                <td>${formatCurrency(acc.total_paid)}</td>
                <td><strong>${formatCurrency(balance)}</strong></td>
                <td><span class="finance-badge ${statusClass}">${statusLabel}</span></td>
                <td>
                    <button onclick="viewStudentAccount('${acc.student_id}')" class="finance-btn finance-btn-primary finance-btn-sm">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="viewStudentPayments('${acc.student_id}')" class="finance-btn finance-btn-outline finance-btn-sm">
                        <i class="fas fa-receipt"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

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

function resetAccountFilters() {
    document.getElementById('accountSearch').value = '';
    document.getElementById('accountStatusFilter').value = 'all';
    document.getElementById('accountProgramFilter').value = 'all';
    renderAccounts(allAccounts);
}

function refreshAccounts() {
    loadAccounts();
    showToast('Accounts refreshed!', 'success');
}

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

async function loadStudentDropdown() {
    try {
        if (typeof window.financeAPI === 'undefined') {
            return;
        }
        
        const students = await window.financeAPI.getStudents();
        
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
    }
}

async function loadPayments() {
    console.log('💳 Loading payments...');
    
    try {
        if (typeof window.financeAPI === 'undefined') {
            return;
        }
        
        const payments = await window.financeAPI.getPayments();
        allPayments = payments || [];
        renderPayments(allPayments);
        console.log('✅ Payments loaded:', allPayments.length);
    } catch (error) {
        console.error('❌ Error loading payments:', error);
        showToast('Error loading payment history', 'error');
    }
}

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
                <td><span class="finance-badge ${statusClass}">${statusLabel}</span></td>
                <td>
                    <button onclick="viewPaymentDetails('${p.id}')" class="finance-btn finance-btn-primary finance-btn-sm">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="deletePayment('${p.id}')" class="finance-btn finance-btn-danger finance-btn-sm">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

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
        if (typeof window.financeAPI === 'undefined') {
            showToast('Finance API not available', 'error');
            return;
        }

        const student = allAccounts.find(a => a.student_id === studentId);
        if (!student) {
            showToast('Student not found. Please select a valid student.', 'error');
            return;
        }

        const paymentData = {
            studentId: studentId,
            studentName: student.student_name || 'Student',
            studentEmail: student.student_email || '',
            program: student.program || 'KRCHN',
            amount: amount,
            method: method,
            reference: reference,
            date: date,
            period: period,
            notes: notes
        };

        await window.financeAPI.recordPayment(paymentData);

        showToast(`Payment of ${formatCurrency(amount)} recorded successfully!`, 'success');
        
        document.getElementById('paymentForm')?.reset();
        document.getElementById('paymentDate').value = new Date().toISOString().split('T')[0];
        
        loadAllData();

    } catch (error) {
        console.error('❌ Error recording payment:', error);
        showToast('Error recording payment: ' + error.message, 'error');
    }
}

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
            const statusClass = payment.status === 'completed' ? 'finance-badge-success' :
                               payment.status === 'pending' ? 'finance-badge-warning' : 'finance-badge-danger';
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
                        <div><strong>Status:</strong> <span class="finance-badge ${statusClass}">${statusLabel}</span></div>
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

async function deletePayment(paymentId) {
    if (!confirm('Are you sure you want to delete this payment? This action cannot be undone.')) {
        return;
    }

    try {
        if (typeof window.financeAPI !== 'undefined') {
            await window.financeAPI.deletePayment(paymentId);
        }
        showToast('Payment deleted successfully.', 'success');
        loadAllData();
    } catch (error) {
        console.error('Error deleting payment:', error);
        showToast('Error deleting payment: ' + error.message, 'error');
    }
}

// ============================================================
// FEE STRUCTURE - COMPLETE WITH EDITABLE COMPONENTS
// ============================================================

async function loadFeeStructure() {
    console.log('📋 Loading fee structure...');
    
    try {
        if (typeof window.financeAPI === 'undefined') {
            console.warn('⚠️ financeAPI not available');
            showToast('Finance API not available', 'error');
            return;
        }
        
        const fees = await window.financeAPI.getFeeStructure();
        console.log('📊 Raw fee data:', fees);
        
        if (!fees || fees.length === 0) {
            console.warn('⚠️ No fee structures found');
            const container = document.getElementById('feeStructureCardsContainer');
            if (container) {
                container.innerHTML = `
                    <div style="text-align:center;padding:60px;color:#94a3b8;">
                        <i class="fas fa-file-invoice" style="font-size:48px;display:block;margin-bottom:16px;"></i>
                        <h3>No Fee Structures Found</h3>
                        <p>Click "New Fee Structure" to create one</p>
                        <button onclick="openAddFeeModal()" class="btn-action btn-primary" style="margin-top:12px;">
                            <i class="fas fa-plus"></i> Create Fee Structure
                        </button>
                    </div>
                `;
            }
            return;
        }
        
        allFeeStructures = fees;
        renderFeeStructureCards(allFeeStructures);
        console.log('✅ Fee structure loaded:', allFeeStructures.length);
        
    } catch (error) {
        console.error('❌ Error loading fee structure:', error);
        showToast('Error loading fee structure: ' + error.message, 'error');
        
        const container = document.getElementById('feeStructureCardsContainer');
        if (container) {
            container.innerHTML = `
                <div style="text-align:center;padding:60px;color:#dc2626;">
                    <i class="fas fa-exclamation-circle" style="font-size:48px;display:block;margin-bottom:16px;"></i>
                    <h3>Error Loading Fee Structures</h3>
                    <p>${error.message}</p>
                    <button onclick="loadFeeStructure()" class="btn-action btn-primary" style="margin-top:12px;">
                        <i class="fas fa-sync"></i> Retry
                    </button>
                </div>
            `;
        }
    }
}

function renderFeeStructureCards(fees) {
    const container = document.getElementById('feeStructureCardsContainer');
    if (!container) {
        console.warn('⚠️ Container not found: feeStructureCardsContainer');
        return;
    }
    
    console.log('📊 Rendering fee structures:', fees.length);
    
    if (!fees || fees.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:60px;color:#94a3b8;">
                <i class="fas fa-file-invoice" style="font-size:48px;display:block;margin-bottom:16px;"></i>
                <h3>No Fee Structures</h3>
                <p>Click "New Fee Structure" to create one</p>
                <button onclick="openAddFeeModal()" class="btn-action btn-primary" style="margin-top:12px;">
                    <i class="fas fa-plus"></i> Create Fee Structure
                </button>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    fees.forEach(fee => {
        const components = fee.components || [];
        const terms = fee.terms || [];
        const payment = fee.payment || {};
        
        html += `
            <div class="fee-structure-pdf-card">
                <!-- HEADER -->
                <div class="fee-pdf-header">
                    <div>
                        <div class="program-title">
                            ${fee.program || 'N/A'}
                            <small>${fee.level || ''} ${fee.program_code ? '· ' + fee.program_code : ''}</small>
                        </div>
                        <div style="font-size:12px;color:#6b7280;margin-top:4px;">
                            ${fee.block_term || fee.duration || ''}
                        </div>
                    </div>
                    <div class="program-meta">
                        <span>📅 ${fee.duration || 'N/A'}</span>
                        <span>💻 ${fee.mode || 'Physical/Online'}</span>
                        <span>🏷️ Total: <strong>KES ${(fee.total || 0).toLocaleString()}</strong></span>
                        <span class="badge ${fee.is_active !== false ? 'badge-success' : 'badge-danger'}">
                            ${fee.is_active !== false ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </div>
                
                <!-- BODY -->
                <div class="fee-pdf-body">
                    <div class="fee-section">
                        <h5>📋 Fee Components</h5>
                        ${components.length > 0 ? components.map(c => `
                            <div class="fee-item">
                                <span class="fee-label">${c.label || c.name || 'N/A'}</span>
                                <span class="fee-amount">KES ${(c.amount || 0).toLocaleString()}</span>
                            </div>
                        `).join('') : '<div style="color:#94a3b8;font-size:13px;">No components defined</div>'}
                    </div>
                    
                    <div class="fee-section">
                        <h5>📌 Payment Information</h5>
                        <div style="font-size:13px;color:#475569;margin-bottom:12px;">
                            <div><strong>M-Pesa:</strong> ${payment.mpesa || 'N/A'}</div>
                            <div><strong>Bank:</strong> ${payment.bank || 'N/A'}</div>
                            <div><strong>Email:</strong> ${payment.email || 'N/A'}</div>
                            <div><strong>WhatsApp:</strong> ${payment.whatsapp || 'N/A'}</div>
                        </div>
                        
                        <h5 style="margin-top:12px;">📜 Terms</h5>
                        <ul style="font-size:12px;color:#64748b;padding-left:16px;margin:8px 0 0 0;line-height:1.6;">
                            ${terms.length > 0 ? terms.slice(0, 3).map(t => `<li>${t}</li>`).join('') : '<li>No terms defined</li>'}
                            ${terms.length > 3 ? `<li>+${terms.length - 3} more</li>` : ''}
                        </ul>
                    </div>
                    
                    <div class="fee-total">
                        <span>💰 TOTAL FEES</span>
                        <span class="amount">KES ${(fee.total || 0).toLocaleString()}</span>
                    </div>
                    
                    ${fee.hostel ? `
                        <div style="grid-column:1/-1;background:#fef3c7;border-radius:8px;padding:10px 16px;display:flex;justify-content:space-between;font-size:14px;border:1px solid #f59e0b;">
                            <span>🏠 HOSTEL FEE (OPTIONAL)</span>
                            <span><strong>KES ${(fee.hostel || 0).toLocaleString()}</strong> <span class="hostel-fee">Optional</span></span>
                        </div>
                    ` : ''}
                </div>
                
                <!-- FOOTER -->
                <div class="fee-pdf-footer">
                    <div class="payment-info">
                        <span><strong>📱 Paybill:</strong> 247247</span>
                        <span><strong>📧 Email:</strong> nchsmfinance@gmail.com</span>
                    </div>
                    <div style="display:flex;gap:12px;">
                        <span>🔒 Secure Payment</span>
                        <span>📄 Fees Subject to Review</span>
                    </div>
                </div>
                
                <!-- ACTIONS -->
                <div class="fee-pdf-actions">
                    <button onclick="openEditFeeModal('${fee.id}')" class="finance-btn finance-btn-primary finance-btn-sm">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button onclick="duplicateFeeStructure('${fee.id}')" class="finance-btn finance-btn-outline finance-btn-sm">
                        <i class="fas fa-copy"></i> Duplicate
                    </button>
                    <button onclick="deleteFeeStructure('${fee.id}')" class="finance-btn finance-btn-danger finance-btn-sm">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ============================================================
// FEE STRUCTURE MODAL FUNCTIONS
// ============================================================

function openAddFeeModal() {
    const modal = document.getElementById('feeStructureModal');
    const title = document.getElementById('feeModalTitle');
    const form = document.getElementById('feeStructureForm');
    
    if (form) form.reset();
    document.getElementById('feeStructureId').value = '';
    title.innerHTML = '<i class="fas fa-plus-circle"></i> Add Fee Structure';
    
    // Set default values
    const blockTermInput = document.getElementById('fee_block_term');
    if (blockTermInput) blockTermInput.value = 'Term 1';
    
    const intakeYearInput = document.getElementById('fee_intake_year');
    if (intakeYearInput) intakeYearInput.value = '2026';
    
    const hostelInput = document.getElementById('fee_hostel');
    if (hostelInput) hostelInput.value = 18000;
    
    const statusInput = document.getElementById('fee_status');
    if (statusInput) statusInput.value = 'active';
    
    // Reset components
    document.getElementById('feeComponentsContainer').innerHTML = `
        <div class="fee-component-row" style="display: grid; grid-template-columns: 1fr 120px 40px; gap: 8px; margin-bottom: 8px;">
            <input type="text" class="form-control comp-name" placeholder="Component name" value="TUITION FEE">
            <input type="number" class="form-control comp-amount" placeholder="Amount" value="30000">
            <button type="button" onclick="removeFeeComponentRow(this)" class="btn-action btn-danger btn-xs" style="padding: 4px 8px;">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="fee-component-row" style="display: grid; grid-template-columns: 1fr 120px 40px; gap: 8px; margin-bottom: 8px;">
            <input type="text" class="form-control comp-name" placeholder="Component name" value="ADMISSION FEE">
            <input type="number" class="form-control comp-amount" placeholder="Amount" value="3000">
            <button type="button" onclick="removeFeeComponentRow(this)" class="btn-action btn-danger btn-xs" style="padding: 4px 8px;">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="fee-component-row" style="display: grid; grid-template-columns: 1fr 120px 40px; gap: 8px; margin-bottom: 8px;">
            <input type="text" class="form-control comp-name" placeholder="Component name" value="CAUTION FEE">
            <input type="number" class="form-control comp-amount" placeholder="Amount" value="3000">
            <button type="button" onclick="removeFeeComponentRow(this)" class="btn-action btn-danger btn-xs" style="padding: 4px 8px;">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Reset terms
    document.getElementById('feeTermsContainer').innerHTML = `
        <div class="fee-term-row" style="display: grid; grid-template-columns: 1fr 40px; gap: 8px; margin-bottom: 8px;">
            <input type="text" class="form-control term-text" placeholder="Enter term" value="All fees are non-refundable once a student has commenced training.">
            <button type="button" onclick="removeFeeTermRow(this)" class="btn-action btn-danger btn-xs" style="padding: 4px 8px;">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="fee-term-row" style="display: grid; grid-template-columns: 1fr 40px; gap: 8px; margin-bottom: 8px;">
            <input type="text" class="form-control term-text" placeholder="Enter term" value="Payments must be made via M-Pesa Pay bill or bank deposit only. CASH NOT ACCEPTED.">
            <button type="button" onclick="removeFeeTermRow(this)" class="btn-action btn-danger btn-xs" style="padding: 4px 8px;">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    updateFeeTotalPreview();
    modal.classList.add('active');
}

function openEditFeeModal(feeId) {
    const fee = allFeeStructures.find(f => f.id === feeId);
    if (!fee) {
        showToast('Fee structure not found', 'error');
        return;
    }
    
    const modal = document.getElementById('feeStructureModal');
    const title = document.getElementById('feeModalTitle');
    
    title.innerHTML = '<i class="fas fa-edit"></i> Edit Fee Structure';
    document.getElementById('feeStructureId').value = feeId;
    
    // Populate basic info
    document.getElementById('fee_program_name').value = fee.program || '';
    document.getElementById('fee_program_code').value = fee.program_code || '';
    document.getElementById('fee_level').value = fee.level || 'Diploma';
    document.getElementById('fee_duration').value = fee.duration || '';
    document.getElementById('fee_mode').value = fee.mode || 'Physical/Online';
    document.getElementById('fee_block_term').value = fee.block_term || 'Term 1';
    document.getElementById('fee_intake_year').value = fee.intake_year || '2026';
    document.getElementById('fee_hostel').value = fee.hostel || 18000;
    document.getElementById('fee_status').value = fee.is_active !== false ? 'active' : 'inactive';
    
    // Populate payment info
    document.getElementById('fee_mpesa').value = fee.payment?.mpesa || 'BUSINESS NO: 247247 | ACCOUNT: 219337#AdmNo';
    document.getElementById('fee_bank').value = fee.payment?.bank || 'Equity Bank | Branch: Nakuru | A/C: 0130200214036';
    document.getElementById('fee_email').value = fee.payment?.email || 'nchsmfinance@gmail.com';
    document.getElementById('fee_whatsapp').value = fee.payment?.whatsapp || '+254 103614355 | +254 703345771';
    
    // Populate components
    const compContainer = document.getElementById('feeComponentsContainer');
    compContainer.innerHTML = '';
    if (fee.components && fee.components.length > 0) {
        fee.components.forEach(comp => {
            compContainer.innerHTML += `
                <div class="fee-component-row" style="display: grid; grid-template-columns: 1fr 120px 40px; gap: 8px; margin-bottom: 8px;">
                    <input type="text" class="form-control comp-name" placeholder="Component name" value="${comp.label || comp.name || ''}">
                    <input type="number" class="form-control comp-amount" placeholder="Amount" value="${comp.amount || 0}">
                    <button type="button" onclick="removeFeeComponentRow(this)" class="btn-action btn-danger btn-xs" style="padding: 4px 8px;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        });
    }
    
    // Populate terms
    const termContainer = document.getElementById('feeTermsContainer');
    termContainer.innerHTML = '';
    if (fee.terms && fee.terms.length > 0) {
        fee.terms.forEach(term => {
            termContainer.innerHTML += `
                <div class="fee-term-row" style="display: grid; grid-template-columns: 1fr 40px; gap: 8px; margin-bottom: 8px;">
                    <input type="text" class="form-control term-text" placeholder="Enter term" value="${term.replace(/"/g, '&quot;')}">
                    <button type="button" onclick="removeFeeTermRow(this)" class="btn-action btn-danger btn-xs" style="padding: 4px 8px;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        });
    }
    
    updateFeeTotalPreview();
    modal.classList.add('active');
}

function closeFeeStructureModal() {
    document.getElementById('feeStructureModal').classList.remove('active');
}

// ============================================================
// FEE COMPONENT ROW FUNCTIONS
// ============================================================

function addFeeComponentRow() {
    const container = document.getElementById('feeComponentsContainer');
    const row = document.createElement('div');
    row.className = 'fee-component-row';
    row.style.cssText = 'display: grid; grid-template-columns: 1fr 120px 40px; gap: 8px; margin-bottom: 8px;';
    row.innerHTML = `
        <input type="text" class="form-control comp-name" placeholder="Component name">
        <input type="number" class="form-control comp-amount" placeholder="Amount">
        <button type="button" onclick="removeFeeComponentRow(this)" class="btn-action btn-danger btn-xs" style="padding: 4px 8px;">
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(row);
    updateFeeTotalPreview();
}

function removeFeeComponentRow(button) {
    const row = button.closest('.fee-component-row');
    if (row) {
        row.remove();
        updateFeeTotalPreview();
    }
}

function addFeeTermRow() {
    const container = document.getElementById('feeTermsContainer');
    const row = document.createElement('div');
    row.className = 'fee-term-row';
    row.style.cssText = 'display: grid; grid-template-columns: 1fr 40px; gap: 8px; margin-bottom: 8px;';
    row.innerHTML = `
        <input type="text" class="form-control term-text" placeholder="Enter term">
        <button type="button" onclick="removeFeeTermRow(this)" class="btn-action btn-danger btn-xs" style="padding: 4px 8px;">
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(row);
}

function removeFeeTermRow(button) {
    const row = button.closest('.fee-term-row');
    if (row) {
        row.remove();
    }
}

function updateFeeTotalPreview() {
    const amounts = document.querySelectorAll('.comp-amount');
    let total = 0;
    amounts.forEach(input => {
        const val = parseFloat(input.value) || 0;
        total += val;
    });
    document.getElementById('feeTotalPreview').textContent = 'KES ' + total.toLocaleString();
}

// ============================================================
// SAVE FEE STRUCTURE (Full)
// ============================================================

async function saveFeeStructureFull() {
    const feeId = document.getElementById('feeStructureId').value || null;
    
    // Get basic info
    const program = document.getElementById('fee_program_name').value.trim();
    const programCode = document.getElementById('fee_program_code').value.trim();
    const level = document.getElementById('fee_level').value;
    const duration = document.getElementById('fee_duration').value.trim();
    const mode = document.getElementById('fee_mode').value;
    const blockTerm = document.getElementById('fee_block_term').value.trim();
    const intakeYear = document.getElementById('fee_intake_year').value;
    const hostel = parseFloat(document.getElementById('fee_hostel').value) || 0;
    const status = document.getElementById('fee_status').value;
    
    if (!program) {
        showToast('Please enter the program name', 'warning');
        return;
    }
    
    if (!blockTerm) {
        showToast('Please enter the block/term', 'warning');
        return;
    }
    
    // Get components
    const compNames = document.querySelectorAll('.comp-name');
    const compAmounts = document.querySelectorAll('.comp-amount');
    const components = [];
    let total = 0;
    
    compNames.forEach((input, index) => {
        const name = input.value.trim();
        const amount = parseFloat(compAmounts[index]?.value) || 0;
        if (name) {
            components.push({ label: name, amount: amount });
            total += amount;
        }
    });
    
    if (components.length === 0) {
        showToast('Please add at least one fee component', 'warning');
        return;
    }
    
    // Get terms
    const termInputs = document.querySelectorAll('.term-text');
    const terms = [];
    termInputs.forEach(input => {
        const text = input.value.trim();
        if (text) {
            terms.push(text);
        }
    });
    
    // Get payment info
    const payment = {
        mpesa: document.getElementById('fee_mpesa').value.trim() || 'BUSINESS NO: 247247 | ACCOUNT: 219337#AdmNo',
        bank: document.getElementById('fee_bank').value.trim() || 'Equity Bank | Branch: Nakuru | A/C: 0130200214036',
        email: document.getElementById('fee_email').value.trim() || 'nchsmfinance@gmail.com',
        whatsapp: document.getElementById('fee_whatsapp').value.trim() || '+254 103614355 | +254 703345771'
    };
    
    const feeData = {
        program: program,
        program_code: programCode,
        level: level,
        duration: duration,
        mode: mode,
        block_term: blockTerm,
        intake_year: intakeYear,
        total: total,
        hostel: hostel,
        components: components,
        terms: terms,
        payment: payment,
        is_active: status === 'active'
    };
    
    try {
        if (feeId) {
            await window.financeAPI.updateFeeStructure(feeId, feeData);
            showToast('Fee structure updated successfully!', 'success');
        } else {
            await window.financeAPI.createFeeStructure(feeData);
            showToast('Fee structure added successfully!', 'success');
        }
        
        closeFeeStructureModal();
        await loadFeeStructure();
        
    } catch (error) {
        console.error('❌ Error saving fee structure:', error);
        showToast('Error saving: ' + error.message, 'error');
    }
}

// ============================================================
// DUPLICATE FEE STRUCTURE (Template)
// ============================================================

async function duplicateFeeStructure(feeId) {
    const fee = allFeeStructures.find(f => f.id === feeId);
    if (!fee) {
        showToast('Fee structure not found', 'error');
        return;
    }
    
    try {
        const newFee = {
            ...fee,
            program: fee.program + ' (Copy)',
            program_code: fee.program_code + '_copy',
            is_active: true
        };
        delete newFee.id;
        delete newFee.created_at;
        delete newFee.updated_at;
        
        await window.financeAPI.createFeeStructure(newFee);
        showToast('Fee structure duplicated successfully!', 'success');
        await loadFeeStructure();
    } catch (error) {
        console.error('❌ Error duplicating fee structure:', error);
        showToast('Error duplicating: ' + error.message, 'error');
    }
}

// ============================================================
// DELETE FEE STRUCTURE
// ============================================================

async function deleteFeeStructure(feeId) {
    if (!confirm('Are you sure you want to delete this fee structure? This action cannot be undone.')) {
        return;
    }
    
    try {
        await window.financeAPI.deleteFeeStructure(feeId);
        showToast('Fee structure deleted successfully!', 'success');
        await loadFeeStructure();
    } catch (error) {
        console.error('❌ Error deleting fee structure:', error);
        showToast('Error deleting: ' + error.message, 'error');
    }
}

function refreshFeeStructure() {
    loadFeeStructure();
    showToast('Fee structure refreshed!', 'success');
}

// ============================================================
// TRANSACTIONS
// ============================================================

async function loadTransactions() {
    console.log('📋 Loading transactions...');
    
    try {
        if (typeof window.financeAPI === 'undefined') {
            return;
        }
        
        const transactions = await window.financeAPI.getTransactions();
        allTransactions = transactions || [];
        renderTransactions(allTransactions);
        console.log('✅ Transactions loaded:', allTransactions.length);
    } catch (error) {
        console.error('❌ Error loading transactions:', error);
        showToast('Error loading transactions', 'error');
    }
}

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

function resetTransactionFilters() {
    document.getElementById('transactionSearch').value = '';
    document.getElementById('transactionStatusFilter').value = 'all';
    document.getElementById('transactionDateFrom').value = '';
    document.getElementById('transactionDateTo').value = '';
    renderTransactions(allTransactions);
}

function viewTransaction(transactionId) {
    showToast('Viewing transaction: ' + transactionId, 'info');
}

// ============================================================
// SETTINGS
// ============================================================

function loadSettings() {
    const status = localStorage.getItem('finance_module_status') || 'active';
    const currency = localStorage.getItem('finance_currency') || 'KES';
    const terms = localStorage.getItem('finance_terms') || '30';
    const lateFee = localStorage.getItem('finance_late_fee') || '5';
    
    const statusEl = document.getElementById('moduleStatus');
    const currencyEl = document.getElementById('defaultCurrency');
    const termsEl = document.getElementById('paymentTerms');
    const lateFeeEl = document.getElementById('lateFee');
    
    if (statusEl) statusEl.value = status;
    if (currencyEl) currencyEl.value = currency;
    if (termsEl) termsEl.value = terms;
    if (lateFeeEl) lateFeeEl.value = lateFee;
}

function saveSettings() {
    const status = document.getElementById('moduleStatus')?.value || 'active';
    const currency = document.getElementById('defaultCurrency')?.value || 'KES';
    const terms = document.getElementById('paymentTerms')?.value || '30';
    const lateFee = document.getElementById('lateFee')?.value || '5';
    
    localStorage.setItem('finance_module_status', status);
    localStorage.setItem('finance_currency', currency);
    localStorage.setItem('finance_terms', terms);
    localStorage.setItem('finance_late_fee', lateFee);
    
    showToast('Settings saved successfully!', 'success');
}

// ============================================================
// REPORTS
// ============================================================

function generateReport() {
    showToast('Generating report...', 'info');
    document.getElementById('reportContent').innerHTML = `
        <div style="padding: 30px; text-align: center;">
            <i class="fas fa-file-alt" style="font-size: 32px; color: #4C1D95; margin-bottom: 10px; display: block;"></i>
            <h3 style="color: #0A3D62;">Financial Report</h3>
            <p style="color: #64748b;">Report generated successfully. Use export buttons to download.</p>
            <div style="margin-top: 20px; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; text-align: left;">
                <div><strong>Total Students:</strong> ${document.getElementById('totalStudents')?.textContent || '0'}</div>
                <div><strong>Total Collected:</strong> ${document.getElementById('totalCollected')?.textContent || 'KES 0'}</div>
                <div><strong>Outstanding:</strong> ${document.getElementById('outstandingBalance')?.textContent || 'KES 0'}</div>
                <div><strong>Overdue:</strong> ${document.getElementById('overdueAccounts')?.textContent || '0'}</div>
            </div>
        </div>
    `;
}

function exportReportToPDF() {
    showToast('Exporting PDF...', 'info');
}

function exportReportToCSV() {
    showToast('Exporting CSV...', 'info');
}

// ============================================================
// EXPORT FUNCTIONS
// ============================================================

function exportAccountsToCSV() {
    showToast('Exporting accounts to CSV...', 'info');
}

function exportPaymentsToCSV() {
    showToast('Exporting payments to CSV...', 'info');
}

function exportAllData() {
    showToast('Exporting all data...', 'info');
}

function backupData() {
    showToast('Backup created!', 'success');
}

function clearCache() {
    showToast('Cache cleared!', 'success');
}

function resetModule() {
    if (confirm('Are you sure you want to reset the module? This cannot be undone!')) {
        showToast('Module reset!', 'warning');
    }
}

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================

function showToast(message, type = 'info') {
    const container = document.getElementById('financeToastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `finance-toast finance-toast-${type}`;
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

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

document.addEventListener('click', function(e) {
    document.querySelectorAll('.finance-modal.active').forEach(modal => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        document.querySelectorAll('.finance-modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
    }
});

// ============================================================
// INITIALIZATION COMPLETE
// ============================================================

console.log('✅ Finance Module initialized successfully!');
console.log('📊 Version:', window.FINANCE_CONFIG?.APP?.VERSION || '2.0.0');
console.log('🔐 User authenticated:', isFinanceAuthenticated());
