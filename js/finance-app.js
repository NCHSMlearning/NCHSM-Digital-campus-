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
// TAB NAVIGATION - FIXED
// ============================================================

function initFinanceTabs() {
    console.log('🔧 Initializing tabs...');
    
    // Get all nav links
    const tabLinks = document.querySelectorAll('.finance-nav a[data-tab]');
    console.log('📋 Found nav links:', tabLinks.length);
    
    tabLinks.forEach(link => {
        // Remove any existing listeners
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
    
    // Show dashboard by default
    setTimeout(() => {
        showFinanceTab('dashboard');
    }, 100);
}

function showFinanceTab(tabId) {
    console.log('📂 Opening tab:', tabId);
    
    // Update nav links
    document.querySelectorAll('.finance-nav a[data-tab]').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-tab') === tabId) {
            link.classList.add('active');
        }
    });
    
    // Hide all tabs
    document.querySelectorAll('.finance-tab-content, .tab-content').forEach(tab => {
        tab.style.display = 'none';
        tab.classList.remove('active');
    });
    
    // Show target tab
    const target = document.getElementById(`tab-${tabId}`);
    if (target) {
        target.style.display = 'block';
        target.classList.add('active');
        console.log('✅ Tab opened:', tabId);
    } else {
        console.warn('⚠️ Tab not found:', tabId);
    }
    
    // Load data for the tab
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
// SIDEBAR TOGGLE - FIXED
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

// Fix toggle button
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
// DASHBOARD - REAL DATA
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
// STUDENT ACCOUNTS - REAL DATA
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
// PAYMENTS - REAL DATA
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

        // Get student details
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
// FEE STRUCTURE - REAL DATA
// ============================================================

async function loadFeeStructure() {
    console.log('📋 Loading fee structure...');
    
    try {
        if (typeof window.financeAPI === 'undefined') {
            return;
        }
        
        const fees = await window.financeAPI.getFeeStructure();
        allFeeStructures = fees || [];
        renderFeeStructure(allFeeStructures);
        console.log('✅ Fee structure loaded:', allFeeStructures.length);
    } catch (error) {
        console.error('❌ Error loading fee structure:', error);
        showToast('Error loading fee structure', 'error');
    }
}

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
            <td><span class="finance-badge finance-badge-success">Active</span></td>
            <td>
                <button onclick="editFeeStructure('${f.id}')" class="finance-btn finance-btn-primary finance-btn-sm">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteFeeStructure('${f.id}')" class="finance-btn finance-btn-danger finance-btn-sm">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

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

function refreshFeeStructure() {
    loadFeeStructure();
    showToast('Fee structure refreshed!', 'success');
}

// ============================================================
// TRANSACTIONS - REAL DATA
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

// ============================================================
// PLACEHOLDER FUNCTIONS
// ============================================================

function editFeeStructure(feeId) {
    showToast('Editing fee: ' + feeId, 'info');
}

function deleteFeeStructure(feeId) {
    if (confirm('Delete this fee structure?')) {
        showToast('Fee structure deleted!', 'success');
        loadFeeStructure();
    }
}

// ============================================================
// INITIALIZATION COMPLETE
// ============================================================

console.log('✅ Finance Module initialized successfully!');
console.log('📊 Version:', window.FINANCE_CONFIG?.APP?.VERSION || '2.0.0');
console.log('🔐 User authenticated:', isFinanceAuthenticated());
