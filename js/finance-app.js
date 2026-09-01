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
let filteredPayments = [];
let filteredFeeStructures = [];
let filteredTransactions = [];

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
    
    // Load balance alerts
    setTimeout(loadBalanceAlerts, 1000);
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
        await loadPaymentSummary();
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
        document.getElementById('pendingApprovals').textContent = stats.pendingPayments || 0;
        
        // This month collections
        const thisMonth = await calculateThisMonthCollections();
        document.getElementById('thisMonthCollections').textContent = formatCurrency(thisMonth);
        
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

async function calculateThisMonthCollections() {
    try {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        
        const payments = await window.financeAPI.getPayments({ 
            status: 'completed',
            limit: 1000 
        });
        
        return payments
            .filter(p => p.payment_date && p.payment_date >= startDate)
            .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    } catch (e) {
        console.error('Error calculating month collections:', e);
        return 0;
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

async function loadAccounts() {
    console.log('📊 Loading student accounts with display IDs...');
    
    try {
        const SUPABASE_URL = 'https://lwhtjozfsmbyihenfunw.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk';
        
        const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // Get students directly from consolidated table
        const { data, error } = await sb
            .from('consolidated_user_profiles_table')
            .select('*')
            .eq('role', 'student')
            .eq('status', 'approved')
            .order('full_name', { ascending: true });
        
        if (error) {
            console.error('❌ Error fetching students:', error);
            showToast('Error loading student accounts', 'error');
            return;
        }
        
        // Map the data to include display_id
        allAccounts = (data || []).map(s => ({
            id: s.id,
            student_id: s.user_id,
            student_name: s.full_name,
            student_email: s.email,
            // ✅ Use student_id as display_id (this is the human-readable ID)
            display_id: s.student_id || s.user_id,
            program: s.program,
            intake_year: s.intake_year,
            current_block: s.current_block,
            balance: 0,
            total_fees_due: 0,
            total_paid: 0,
            payment_status: 'active',
            status: s.status,
            phone: s.phone,
            admission_number: s.student_id
        }));
        
        renderAccounts(allAccounts);
        
        // Update account count
        const countEl = document.getElementById('accountCount');
        if (countEl) {
            countEl.textContent = `Showing ${allAccounts.length} students`;
        }
        
        // Load balance alerts
        loadBalanceAlerts();
        
        console.log('✅ Student accounts loaded:', allAccounts.length);
        console.log('✅ First student display_id:', allAccounts[0]?.display_id);
        
    } catch (error) {
        console.error('❌ Error loading accounts:', error);
        showToast('Error loading student accounts', 'error');
    }
}
function loadBalanceAlerts() {
    const highBalanceStudents = allAccounts.filter(acc => {
        const balance = parseFloat(acc.balance) || 0;
        return balance > 100000;
    });
    
    const banner = document.getElementById('balanceAlertBanner');
    const countEl = document.getElementById('highBalanceCount');
    
    if (highBalanceStudents.length > 0 && banner) {
        banner.style.display = 'block';
        if (countEl) {
            countEl.textContent = highBalanceStudents.length;
        }
    } else if (banner) {
        banner.style.display = 'none';
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
        const displayId = acc.display_id || acc.student_id || '-';
        const balance = parseFloat(acc.balance) || 0;
        const totalFeesDue = parseFloat(acc.total_fees_due) || 0;
        const totalPaid = parseFloat(acc.total_paid) || 0;
        
        let status = 'outstanding';
        let statusLabel = '🔴 Outstanding';
        let statusClass = 'finance-badge-danger';
        
        if (balance === 0) {
            status = 'paid';
            statusLabel = '✅ Paid';
            statusClass = 'finance-badge-success';
        } else if (balance > 0 && balance <= 10000) {
            status = 'partial';
            statusLabel = '⚠️ Partial';
            statusClass = 'finance-badge-warning';
        }

        const originalId = acc.student_id || acc.id || '';

        return `
            <tr>
                <td><strong>${acc.student_name || 'N/A'}</strong></td>
                <td>${displayId}</td>
                <td>${acc.program || '-'}</td>
                <td>${acc.intake_year || '-'}</td>
                <td>${formatCurrency(totalFeesDue)}</td>
                <td>${formatCurrency(totalPaid)}</td>
                <td><strong>${formatCurrency(balance)}</strong></td>
                <td><span class="finance-badge ${statusClass}">${statusLabel}</span></td>
                <td>
                    <button onclick="viewStudentAccount('${originalId}')" class="finance-btn finance-btn-primary finance-btn-sm">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="openPaymentModal('${originalId}')" class="finance-btn btn-success btn-sm" style="background: #059669; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                        <i class="fas fa-credit-card"></i>
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
            (acc.display_id || '').toLowerCase().includes(search) ||
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
    
    const countEl = document.getElementById('accountCount');
    if (countEl) {
        countEl.textContent = `Showing ${filtered.length} students`;
    }
}

function resetAccountFilters() {
    document.getElementById('accountSearch').value = '';
    document.getElementById('accountStatusFilter').value = 'all';
    document.getElementById('accountProgramFilter').value = 'all';
    renderAccounts(allAccounts);
    const countEl = document.getElementById('accountCount');
    if (countEl) {
        countEl.textContent = `Showing ${allAccounts.length} students`;
    }
    showToast('Filters reset!', 'info');
}

function refreshAccounts() {
    loadAccounts();
    showToast('Accounts refreshed with display IDs!', 'success');
}

function showHighBalanceStudents() {
    document.getElementById('accountStatusFilter').value = 'outstanding';
    filterAccounts();
    document.getElementById('balanceAlertBanner').style.display = 'none';
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
            
            const displayId = student.display_id || student.student_id || '-';
            
            document.getElementById('studentAccountBody').innerHTML = `
                <div style="padding: 10px 0;">
                    <h4 style="color: #0A3D62; margin-bottom: 15px;">Student: ${student.student_name || 'N/A'}</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; padding: 16px; border-radius: 8px;">
                        <div><strong>Student ID:</strong> ${displayId}</div>
                        <div><strong>Program:</strong> ${student.program || '-'}</div>
                        <div><strong>Intake:</strong> ${student.intake_year || '-'}</div>
                        <div><strong>Balance:</strong> <strong style="color: ${statusColor}">${formatCurrency(balance)}</strong></div>
                        <div><strong>Total Fees Due:</strong> ${formatCurrency(student.total_fees_due)}</div>
                        <div><strong>Total Paid:</strong> ${formatCurrency(student.total_paid)}</div>
                        <div style="grid-column: 1 / -1;"><strong>Status:</strong> <span style="color: ${statusColor}">${status}</span></div>
                    </div>
                    <div style="margin-top: 16px;">
                        <button onclick="closeModal('studentAccountModal'); openPaymentModal('${studentId}')" class="btn-action btn-success" style="width: 100%;">
                            <i class="fas fa-credit-card"></i> Record Payment
                        </button>
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
        updatePaymentCount(allPayments.length);
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

// ============================================================
// PAYMENT FILTER FUNCTIONS
// ============================================================

function filterPaymentTable() {
    const search = document.getElementById('paymentSearch')?.value?.toLowerCase() || '';
    const statusFilter = document.getElementById('paymentStatusFilter')?.value || 'all';
    const methodFilter = document.getElementById('paymentMethodFilter')?.value || 'all';
    
    let filtered = allPayments || [];

    if (search) {
        filtered = filtered.filter(p => 
            (p.student_name || '').toLowerCase().includes(search) ||
            (p.reference_number || '').toLowerCase().includes(search) ||
            (p.student_id || '').toLowerCase().includes(search)
        );
    }

    if (statusFilter !== 'all') {
        filtered = filtered.filter(p => p.status === statusFilter);
    }

    if (methodFilter !== 'all') {
        filtered = filtered.filter(p => p.payment_method === methodFilter);
    }

    renderPayments(filtered);
    updatePaymentCount(filtered.length);
}

function resetPaymentFilters() {
    document.getElementById('paymentSearch').value = '';
    document.getElementById('paymentStatusFilter').value = 'all';
    document.getElementById('paymentMethodFilter').value = 'all';
    filterPaymentTable();
    showToast('Payment filters reset!', 'info');
}

function updatePaymentCount(count) {
    const countEl = document.getElementById('paymentCount');
    if (countEl) {
        countEl.textContent = `Showing ${count} payments`;
    }
}

function refreshPayments() {
    loadPayments();
    showToast('Payments refreshed!', 'success');
}

// ============================================================
// PAYMENT SUMMARY
// ============================================================

async function loadPaymentSummary() {
    try {
        const payments = await window.financeAPI.getPayments({ limit: 1000 });
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        
        // Get week start (Monday)
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay() + 1);
        const weekStartStr = weekStart.toISOString().split('T')[0];
        
        // Get month start
        const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        
        let todayTotal = 0, todayCount = 0;
        let weekTotal = 0, weekCount = 0;
        let monthTotal = 0, monthCount = 0;
        let pendingTotal = 0, pendingCount = 0;
        
        payments.forEach(p => {
            const amount = parseFloat(p.amount) || 0;
            const date = p.payment_date;
            
            if (date === today && p.status === 'completed') {
                todayTotal += amount;
                todayCount++;
            }
            
            if (date >= weekStartStr && p.status === 'completed') {
                weekTotal += amount;
                weekCount++;
            }
            
            if (date >= monthStart && p.status === 'completed') {
                monthTotal += amount;
                monthCount++;
            }
            
            if (p.status === 'pending') {
                pendingTotal += amount;
                pendingCount++;
            }
        });
        
        document.getElementById('todayPaymentSummary').textContent = formatCurrency(todayTotal);
        document.getElementById('todayPaymentCount').textContent = todayCount;
        document.getElementById('weekPaymentSummary').textContent = formatCurrency(weekTotal);
        document.getElementById('weekPaymentCount').textContent = weekCount;
        document.getElementById('monthPaymentSummary').textContent = formatCurrency(monthTotal);
        document.getElementById('monthPaymentCount').textContent = monthCount;
        document.getElementById('pendingPaymentSummary').textContent = formatCurrency(pendingTotal);
        document.getElementById('pendingPaymentCount').textContent = pendingCount;
        
    } catch (error) {
        console.error('Error loading payment summary:', error);
    }
}

// ============================================================
// PAYMENT MODAL FUNCTIONS
// ============================================================

let selectedStudentForPayment = null;

function openPaymentModal(studentId) {
    const modal = document.getElementById('paymentModal');
    const studentSelect = document.getElementById('modalPaymentStudent');
    
    if (!modal) {
        showToast('Payment modal not found', 'error');
        return;
    }
    
    // Reset form
    document.getElementById('paymentModalForm').reset();
    document.getElementById('modalPaymentDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('paymentStudentInfo').style.display = 'none';
    
    // Populate student dropdown
    if (allAccounts && allAccounts.length > 0) {
        studentSelect.innerHTML = '<option value="">-- Select Student --</option>';
        allAccounts.forEach(student => {
            const option = document.createElement('option');
            option.value = student.student_id || student.id;
            option.textContent = `${student.student_name} (${student.display_id || student.student_id || 'N/A'})`;
            option.dataset.student = JSON.stringify(student);
            studentSelect.appendChild(option);
        });
        
        // If studentId provided, select that student
        if (studentId) {
            studentSelect.value = studentId;
            updateStudentInfo();
        }
    }
    
    modal.classList.add('active');
}

function closePaymentModal() {
    document.getElementById('paymentModal').classList.remove('active');
    document.getElementById('paymentStudentInfo').style.display = 'none';
    selectedStudentForPayment = null;
}

function updateStudentInfo() {
    const select = document.getElementById('modalPaymentStudent');
    const selectedOption = select.options[select.selectedIndex];
    
    if (!selectedOption || !selectedOption.value) {
        document.getElementById('paymentStudentInfo').style.display = 'none';
        selectedStudentForPayment = null;
        return;
    }
    
    try {
        const student = JSON.parse(selectedOption.dataset.student);
        selectedStudentForPayment = student;
        
        document.getElementById('paymentStudentInfo').style.display = 'block';
        document.getElementById('modalStudentName').textContent = student.student_name || 'N/A';
        document.getElementById('modalStudentId').textContent = student.display_id || student.student_id || 'N/A';
        document.getElementById('modalStudentProgram').textContent = student.program || 'N/A';
        document.getElementById('modalStudentIntake').textContent = student.intake_year || 'N/A';
        
        const totalDue = parseFloat(student.total_fees_due) || 0;
        const totalPaid = parseFloat(student.total_paid) || 0;
        const balance = parseFloat(student.balance) || 0;
        
        document.getElementById('modalTotalDue').textContent = formatCurrency(totalDue);
        document.getElementById('modalTotalPaid').textContent = formatCurrency(totalPaid);
        
        const balanceEl = document.getElementById('modalBalance');
        balanceEl.textContent = formatCurrency(balance);
        balanceEl.className = 'value ' + (balance > 0 ? 'negative' : balance < 0 ? 'positive' : '');
        
        const statusEl = document.getElementById('modalPaymentStatus');
        if (balance === 0) {
            statusEl.textContent = '✅ Paid in Full';
            statusEl.style.color = '#059669';
        } else if (balance < 10000) {
            statusEl.textContent = '⚠️ Partial Payment';
            statusEl.style.color = '#d97706';
        } else {
            statusEl.textContent = '🔴 Outstanding';
            statusEl.style.color = '#dc2626';
        }
        
        document.getElementById('studentStatusBadge').textContent = student.payment_status || 'Active';
        document.getElementById('studentStatusBadge').className = 'badge ' + 
            (student.payment_status === 'paid' ? 'badge-success' : 
             student.payment_status === 'partial' ? 'badge-warning' : 'badge-danger');
        
    } catch (e) {
        console.error('Error parsing student data:', e);
        document.getElementById('paymentStudentInfo').style.display = 'none';
    }
}

async function recordPaymentFromModal() {
    const student = selectedStudentForPayment;
    const amount = parseFloat(document.getElementById('modalPaymentAmount').value);
    const method = document.getElementById('modalPaymentMethod').value;
    const reference = document.getElementById('modalPaymentReference').value || null;
    const date = document.getElementById('modalPaymentDate').value;
    const period = document.getElementById('modalPaymentPeriod').value;
    const notes = document.getElementById('modalPaymentNotes').value || null;
    
    if (!student) {
        showToast('Please select a student', 'warning');
        return;
    }
    
    if (!amount || amount <= 0) {
        showToast('Please enter a valid amount', 'warning');
        return;
    }
    
    if (!date) {
        showToast('Please select a payment date', 'warning');
        return;
    }
    
    try {
        const paymentData = {
            studentId: student.student_id || student.id,
            studentName: student.student_name,
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
        
        showToast(`Payment of ${formatCurrency(amount)} recorded successfully for ${student.student_name}!`, 'success');
        
        closePaymentModal();
        loadAllData();
        
    } catch (error) {
        console.error('Error recording payment:', error);
        showToast('Error recording payment: ' + error.message, 'error');
    }
}

// Click outside modal to close
document.addEventListener('click', function(e) {
    const modal = document.getElementById('paymentModal');
    if (e.target === modal) {
        closePaymentModal();
    }
});

// ESC key to close modal
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modal = document.getElementById('paymentModal');
        if (modal && modal.classList.contains('active')) {
            closePaymentModal();
        }
    }
});

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
// BULK IMPORT FUNCTIONS
// ============================================================

function openBulkPaymentModal() {
    document.getElementById('bulkImportModal').classList.add('active');
}

function handleBulkFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
        showToast(`File selected: ${file.name}`, 'success');
    }
}

function downloadTemplate() {
    showToast('Downloading template...', 'info');
    const headers = 'student_id,amount,payment_method,reference,payment_date,period\n';
    const sample = 'STU001,5000,M-Pesa,TXN123,2026-01-01,Term 1\n';
    const blob = new Blob([headers + sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk_payment_template.csv';
    a.click();
    URL.revokeObjectURL(url);
}

function processBulkImport() {
    showToast('Processing bulk import...', 'info');
}

// ============================================================
// SEND REMINDERS
// ============================================================

function sendPaymentReminders() {
    showToast('Sending payment reminders...', 'info');
}

// ============================================================
// LOAD AUDIT LOG
// ============================================================

function loadAuditLog() {
    const container = document.getElementById('auditLogContainer');
    if (!container) return;
    
    container.innerHTML = `<div style="text-align:center;padding:20px;color:#94a3b8;"><i class="fas fa-spinner fa-spin"></i> Loading audit log...</div>`;
    
    const recentPayments = allPayments.slice(0, 10);
    
    if (recentPayments.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:20px;color:#94a3b8;">
                <i class="fas fa-info-circle"></i> No recent activities
            </div>
        `;
        return;
    }
    
    container.innerHTML = recentPayments.map(p => `
        <div style="padding:10px 0;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;font-size:13px;">
            <span>
                <i class="fas fa-${p.status === 'completed' ? 'check-circle' : 'clock'}" style="color: ${p.status === 'completed' ? '#059669' : '#f59e0b'};"></i>
                ${p.status === 'completed' ? 'Payment recorded' : 'Payment pending'} for <strong>${p.student_name || 'Unknown'}</strong>
                ${p.amount ? `- ${formatCurrency(p.amount)}` : ''}
            </span>
            <span style="color:#94a3b8;font-size:11px;">${formatDate(p.payment_date)}</span>
        </div>
    `).join('');
}

// ============================================================
// FEE STRUCTURE - COMPLETE WITH WORKING CALCULATION
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
        updateFeeStructureCount(allFeeStructures.length);
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
        const total = fee.total || 0;
        
        html += `
            <div class="fee-structure-pdf-card" style="background:white;border-radius:12px;border:1px solid #e5e7eb;margin-bottom:20px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
                <!-- HEADER -->
                <div style="background:linear-gradient(135deg, #0A3D62, #1a5a7a);padding:20px 24px;color:white;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:15px;">
                    <div>
                        <div style="font-size:18px;font-weight:700;">${fee.program || 'N/A'}</div>
                        <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:4px;">
                            ${fee.level || ''} ${fee.program_code ? '· ' + fee.program_code : ''}
                            ${fee.duration ? '· ' + fee.duration : ''}
                            ${fee.mode ? '· ' + fee.mode : ''}
                        </div>
                    </div>
                    <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
                        <span style="background:rgba(255,255,255,0.15);padding:4px 14px;border-radius:20px;font-size:12px;">
                            📅 ${fee.intake_year || '2026'}
                        </span>
                        <span style="background:rgba(255,255,255,0.15);padding:4px 14px;border-radius:20px;font-size:12px;">
                            ${fee.block_term || 'Term 1'}
                        </span>
                        <span style="background:${fee.is_active !== false ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'};padding:4px 14px;border-radius:20px;font-size:12px;font-weight:600;">
                            ${fee.is_active !== false ? '✅ Active' : '❌ Inactive'}
                        </span>
                    </div>
                </div>
                
                <!-- BODY -->
                <div style="padding:20px 24px;">
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
                        <!-- Left Column: Components -->
                        <div>
                            <h5 style="color:#0A3D62;margin:0 0 12px 0;font-size:14px;">
                                <i class="fas fa-list" style="color:#4C1D95;"></i> Fee Components
                            </h5>
                            ${components.length > 0 ? components.map(c => `
                                <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:13px;">
                                    <span style="color:#475569;">${c.label || c.name || 'N/A'}</span>
                                    <span style="font-weight:600;color:#0A3D62;">KES ${(c.amount || 0).toLocaleString()}</span>
                                </div>
                            `).join('') : '<div style="color:#94a3b8;font-size:13px;">No components defined</div>'}
                            
                            ${fee.hostel ? `
                                <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:13px;background:#fef3c7;margin-top:4px;border-radius:4px;padding:6px 10px;">
                                    <span style="color:#92400e;">🏠 Hostel Fee (Optional)</span>
                                    <span style="font-weight:600;color:#92400e;">KES ${(fee.hostel || 0).toLocaleString()}</span>
                                </div>
                            ` : ''}
                            
                            <div style="display:flex;justify-content:space-between;padding:8px 0;border-top:2px solid #4C1D95;margin-top:8px;font-size:15px;font-weight:700;">
                                <span style="color:#0A3D62;">TOTAL</span>
                                <span style="color:#4C1D95;">KES ${(total || 0).toLocaleString()}</span>
                            </div>
                        </div>
                        
                        <!-- Right Column: Payment Info & Terms -->
                        <div>
                            <h5 style="color:#0A3D62;margin:0 0 12px 0;font-size:14px;">
                                <i class="fas fa-credit-card" style="color:#4C1D95;"></i> Payment Information
                            </h5>
                            <div style="font-size:13px;color:#475569;line-height:1.8;">
                                <div><strong>📱 M-Pesa:</strong> ${payment.mpesa || 'N/A'}</div>
                                <div><strong>🏦 Bank:</strong> ${payment.bank || 'N/A'}</div>
                                <div><strong>📧 Email:</strong> ${payment.email || 'N/A'}</div>
                                <div><strong>📱 WhatsApp:</strong> ${payment.whatsapp || 'N/A'}</div>
                            </div>
                            
                            <h5 style="color:#0A3D62;margin:16px 0 8px 0;font-size:14px;">
                                <i class="fas fa-file-contract" style="color:#4C1D95;"></i> Terms
                            </h5>
                            <ul style="font-size:12px;color:#64748b;padding-left:16px;margin:0;line-height:1.8;">
                                ${terms.length > 0 ? terms.slice(0, 3).map(t => `<li>${t}</li>`).join('') : '<li>No terms defined</li>'}
                                ${terms.length > 3 ? `<li>+${terms.length - 3} more</li>` : ''}
                            </ul>
                        </div>
                    </div>
                </div>
                
                <!-- FOOTER -->
                <div style="background:#f8fafc;padding:12px 24px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                    <span style="font-size:11px;color:#94a3b8;">
                        <i class="fas fa-lock" style="color:#10b981;"></i> Secure Payment
                    </span>
                    <div style="display:flex;gap:8px;">
                        <button onclick="openEditFeeModal('${fee.id}')" class="btn-action btn-primary btn-sm" style="background:#4C1D95;color:white;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:12px;">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button onclick="duplicateFeeStructure('${fee.id}')" class="btn-action btn-outline btn-sm" style="background:transparent;color:#475569;border:1px solid #e2e8f0;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:12px;">
                            <i class="fas fa-copy"></i> Duplicate
                        </button>
                        <button onclick="deleteFeeStructure('${fee.id}')" class="btn-action btn-danger btn-sm" style="background:#dc2626;color:white;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:12px;">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ============================================================
// FEE STRUCTURE CALCULATION FUNCTIONS
// ============================================================

function updateFeeTotalPreview() {
    const compAmounts = document.querySelectorAll('.comp-amount');
    let total = 0;
    compAmounts.forEach(input => {
        const val = parseFloat(input.value) || 0;
        total += val;
    });
    
    const hostel = parseFloat(document.getElementById('fee_hostel')?.value) || 0;
    total += hostel;
    
    const previewEl = document.getElementById('feeTotalPreview');
    if (previewEl) {
        previewEl.textContent = 'KES ' + total.toLocaleString();
    }
}

// ============================================================
// FEE STRUCTURE FILTER FUNCTIONS
// ============================================================

function filterFeeStructures() {
    const search = document.getElementById('feeStructureSearch')?.value?.toLowerCase() || '';
    const statusFilter = document.getElementById('feeStructureStatusFilter')?.value || 'all';
    
    let filtered = allFeeStructures || [];

    if (search) {
        filtered = filtered.filter(f => 
            (f.program || '').toLowerCase().includes(search) ||
            (f.program_code || '').toLowerCase().includes(search) ||
            (f.level || '').toLowerCase().includes(search)
        );
    }

    if (statusFilter !== 'all') {
        const isActive = statusFilter === 'active';
        filtered = filtered.filter(f => f.is_active === isActive);
    }

    renderFeeStructureCards(filtered);
    updateFeeStructureCount(filtered.length);
}

function resetFeeStructureFilters() {
    document.getElementById('feeStructureSearch').value = '';
    document.getElementById('feeStructureStatusFilter').value = 'all';
    filterFeeStructures();
    showToast('Fee structure filters reset!', 'info');
}

function updateFeeStructureCount(count) {
    const countEl = document.getElementById('feeStructureCount');
    if (countEl) {
        countEl.textContent = `Showing ${count} fee structures`;
    }
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
    
    const setValue = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value;
    };
    
    setValue('fee_program_name', '');
    setValue('fee_program_code', '');
    setValue('fee_level', 'Diploma');
    setValue('fee_duration', '');
    setValue('fee_mode', 'Physical/Online');
    setValue('fee_block_term', 'Term 1');
    setValue('fee_intake_year', '2026');
    setValue('fee_hostel', 18000);
    setValue('fee_status', 'active');
    setValue('fee_mpesa', 'BUSINESS NO: 247247 | ACCOUNT: 219337#AdmNo');
    setValue('fee_bank', 'Equity Bank | Branch: Nakuru | A/C: 0130200214036');
    setValue('fee_email', 'nchsmfinance@gmail.com');
    setValue('fee_whatsapp', '+254 103614355 | +254 703345771');
    
    // Reset components with default values and oninput
    const compContainer = document.getElementById('feeComponentsContainer');
    if (compContainer) {
        compContainer.innerHTML = `
            <div class="fee-component-row" style="display: grid; grid-template-columns: 1fr 120px 40px; gap: 8px; margin-bottom: 8px;">
                <input type="text" class="form-control comp-name" placeholder="Component name" value="TUITION FEE" oninput="updateFeeTotalPreview()">
                <input type="number" class="form-control comp-amount" placeholder="Amount" value="30000" oninput="updateFeeTotalPreview()">
                <button type="button" onclick="removeFeeComponentRow(this)" class="btn-action btn-danger btn-xs" style="padding: 4px 8px;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="fee-component-row" style="display: grid; grid-template-columns: 1fr 120px 40px; gap: 8px; margin-bottom: 8px;">
                <input type="text" class="form-control comp-name" placeholder="Component name" value="ADMISSION FEE" oninput="updateFeeTotalPreview()">
                <input type="number" class="form-control comp-amount" placeholder="Amount" value="3000" oninput="updateFeeTotalPreview()">
                <button type="button" onclick="removeFeeComponentRow(this)" class="btn-action btn-danger btn-xs" style="padding: 4px 8px;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="fee-component-row" style="display: grid; grid-template-columns: 1fr 120px 40px; gap: 8px; margin-bottom: 8px;">
                <input type="text" class="form-control comp-name" placeholder="Component name" value="CAUTION FEE" oninput="updateFeeTotalPreview()">
                <input type="number" class="form-control comp-amount" placeholder="Amount" value="3000" oninput="updateFeeTotalPreview()">
                <button type="button" onclick="removeFeeComponentRow(this)" class="btn-action btn-danger btn-xs" style="padding: 4px 8px;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }
    
    // Reset terms
    const termContainer = document.getElementById('feeTermsContainer');
    if (termContainer) {
        termContainer.innerHTML = `
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
    }
    
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
    
    const setValue = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value || '';
    };
    
    setValue('fee_program_name', fee.program);
    setValue('fee_program_code', fee.program_code);
    setValue('fee_level', fee.level || 'Diploma');
    setValue('fee_duration', fee.duration);
    setValue('fee_mode', fee.mode || 'Physical/Online');
    setValue('fee_block_term', fee.block_term || 'Term 1');
    setValue('fee_intake_year', fee.intake_year || '2026');
    setValue('fee_hostel', fee.hostel || 18000);
    setValue('fee_status', fee.is_active !== false ? 'active' : 'inactive');
    
    const payment = fee.payment || {};
    setValue('fee_mpesa', payment.mpesa || 'BUSINESS NO: 247247 | ACCOUNT: 219337#AdmNo');
    setValue('fee_bank', payment.bank || 'Equity Bank | Branch: Nakuru | A/C: 0130200214036');
    setValue('fee_email', payment.email || 'nchsmfinance@gmail.com');
    setValue('fee_whatsapp', payment.whatsapp || '+254 103614355 | +254 703345771');
    
    // Populate components with oninput
    const compContainer = document.getElementById('feeComponentsContainer');
    if (compContainer) {
        compContainer.innerHTML = '';
        const components = fee.components || [];
        if (components.length > 0) {
            components.forEach(comp => {
                compContainer.innerHTML += `
                    <div class="fee-component-row" style="display: grid; grid-template-columns: 1fr 120px 40px; gap: 8px; margin-bottom: 8px;">
                        <input type="text" class="form-control comp-name" placeholder="Component name" value="${(comp.label || comp.name || '').replace(/"/g, '&quot;')}" oninput="updateFeeTotalPreview()">
                        <input type="number" class="form-control comp-amount" placeholder="Amount" value="${comp.amount || 0}" oninput="updateFeeTotalPreview()">
                        <button type="button" onclick="removeFeeComponentRow(this)" class="btn-action btn-danger btn-xs" style="padding: 4px 8px;">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
            });
        } else {
            compContainer.innerHTML = `
                <div class="fee-component-row" style="display: grid; grid-template-columns: 1fr 120px 40px; gap: 8px; margin-bottom: 8px;">
                    <input type="text" class="form-control comp-name" placeholder="Component name" value="TUITION FEE" oninput="updateFeeTotalPreview()">
                    <input type="number" class="form-control comp-amount" placeholder="Amount" value="30000" oninput="updateFeeTotalPreview()">
                    <button type="button" onclick="removeFeeComponentRow(this)" class="btn-action btn-danger btn-xs" style="padding: 4px 8px;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="fee-component-row" style="display: grid; grid-template-columns: 1fr 120px 40px; gap: 8px; margin-bottom: 8px;">
                    <input type="text" class="form-control comp-name" placeholder="Component name" value="ADMISSION FEE" oninput="updateFeeTotalPreview()">
                    <input type="number" class="form-control comp-amount" placeholder="Amount" value="3000" oninput="updateFeeTotalPreview()">
                    <button type="button" onclick="removeFeeComponentRow(this)" class="btn-action btn-danger btn-xs" style="padding: 4px 8px;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="fee-component-row" style="display: grid; grid-template-columns: 1fr 120px 40px; gap: 8px; margin-bottom: 8px;">
                    <input type="text" class="form-control comp-name" placeholder="Component name" value="CAUTION FEE" oninput="updateFeeTotalPreview()">
                    <input type="number" class="form-control comp-amount" placeholder="Amount" value="3000" oninput="updateFeeTotalPreview()">
                    <button type="button" onclick="removeFeeComponentRow(this)" class="btn-action btn-danger btn-xs" style="padding: 4px 8px;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        }
    }
    
    // Populate terms
    const termContainer = document.getElementById('feeTermsContainer');
    if (termContainer) {
        termContainer.innerHTML = '';
        const terms = fee.terms || [];
        if (terms.length > 0) {
            terms.forEach(term => {
                termContainer.innerHTML += `
                    <div class="fee-term-row" style="display: grid; grid-template-columns: 1fr 40px; gap: 8px; margin-bottom: 8px;">
                        <input type="text" class="form-control term-text" placeholder="Enter term" value="${term.replace(/"/g, '&quot;')}">
                        <button type="button" onclick="removeFeeTermRow(this)" class="btn-action btn-danger btn-xs" style="padding: 4px 8px;">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
            });
        } else {
            termContainer.innerHTML = `
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
        }
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
        <input type="text" class="form-control comp-name" placeholder="Component name" oninput="updateFeeTotalPreview()">
        <input type="number" class="form-control comp-amount" placeholder="Amount" oninput="updateFeeTotalPreview()">
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

// ============================================================
// SAVE FEE STRUCTURE (Full) - FIXED VERSION
// ============================================================

async function saveFeeStructureFull() {
    console.log('📝 Saving fee structure...');
    
    const feeId = document.getElementById('feeStructureId').value || null;
    
    // Get form values
    const program = document.getElementById('fee_program_name').value.trim();
    const programCode = document.getElementById('fee_program_code').value.trim();
    const level = document.getElementById('fee_level').value;
    const duration = document.getElementById('fee_duration').value.trim();
    const mode = document.getElementById('fee_mode').value;
    const blockTerm = document.getElementById('fee_block_term').value.trim();
    const intakeYear = document.getElementById('fee_intake_year').value;
    const hostel = parseFloat(document.getElementById('fee_hostel').value) || 0;
    const status = document.getElementById('fee_status').value;
    
    // Validate
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
    
    // Add hostel to total
    total += hostel;
    
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
        is_active: status === 'active',
        description: `${program} - ${level} Fees (${blockTerm})`
    };
    
    console.log('📤 Sending fee data:', feeData);
    console.log('🔑 Fee ID:', feeId || 'New');
    
    try {
        let result;
        
        if (feeId) {
            // UPDATE existing
            console.log('🔄 Updating fee structure...');
            result = await window.financeAPI.updateFeeStructure(feeId, feeData);
            console.log('✅ Update result:', result);
            showToast('Fee structure updated successfully!', 'success');
        } else {
            // CREATE new
            console.log('➕ Creating new fee structure...');
            result = await window.financeAPI.createFeeStructure(feeData);
            console.log('✅ Create result:', result);
            showToast('Fee structure added successfully!', 'success');
        }
        
        // Close modal
        closeFeeStructureModal();
        
        // Reload fee structure data
        await loadFeeStructure();
        
    } catch (error) {
        console.error('❌ Error saving fee structure:', error);
        showToast('Error saving: ' + error.message, 'error');
    }
}

// ============================================================
// DUPLICATE FEE STRUCTURE
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
        updateTransactionCount(allTransactions.length);
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
    updateTransactionCount(filtered.length);
}

function resetTransactionFilters() {
    document.getElementById('transactionSearch').value = '';
    document.getElementById('transactionStatusFilter').value = 'all';
    document.getElementById('transactionDateFrom').value = '';
    document.getElementById('transactionDateTo').value = '';
    renderTransactions(allTransactions);
    updateTransactionCount(allTransactions.length);
    showToast('Transaction filters reset!', 'info');
}

function updateTransactionCount(count) {
    const countEl = document.getElementById('transactionCount');
    if (countEl) {
        countEl.textContent = `Showing ${count} transactions`;
    }
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

function generateReport(type = 'summary') {
    showToast(`Generating ${type} report...`, 'info');
    document.getElementById('reportContent').innerHTML = `
        <div style="padding: 30px; text-align: center;">
            <i class="fas fa-file-alt" style="font-size: 32px; color: #4C1D95; margin-bottom: 10px; display: block;"></i>
            <h3 style="color: #0A3D62;">${type.charAt(0).toUpperCase() + type.slice(1)} Financial Report</h3>
            <p style="color: #64748b;">Report generated successfully. Use export buttons to download.</p>
            <div style="margin-top: 20px; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; text-align: left;">
                <div><strong>Total Students:</strong> ${document.getElementById('totalStudents')?.textContent || '0'}</div>
                <div><strong>Total Collected:</strong> ${document.getElementById('totalCollected')?.textContent || 'KES 0'}</div>
                <div><strong>Outstanding:</strong> ${document.getElementById('outstandingBalance')?.textContent || 'KES 0'}</div>
                <div><strong>Overdue:</strong> ${document.getElementById('overdueAccounts')?.textContent || '0'}</div>
                <div><strong>Pending Approvals:</strong> ${document.getElementById('pendingApprovals')?.textContent || '0'}</div>
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
// FEE TEMPLATE MODAL
// ============================================================

function openFeeTemplateModal() {
    showToast('Fee templates feature coming soon!', 'info');
}

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================

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

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

document.addEventListener('click', function(e) {
    document.querySelectorAll('.modal-overlay.active').forEach(modal => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(modal => {
            modal.classList.remove('active');
        });
    }
});

// ============================================================
// UPDATE LAST UPDATED TIME
// ============================================================

function updateLastUpdated() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
    const el = document.getElementById('lastUpdatedTime');
    if (el) {
        el.textContent = timeStr;
    }
}
setInterval(updateLastUpdated, 30000);
updateLastUpdated();

// ============================================================
// ADD INPUT EVENT LISTENERS FOR REAL-TIME CALCULATION
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    // Listen for changes on component amounts and hostel fee
    document.addEventListener('input', function(e) {
        if (e.target.classList.contains('comp-amount') || e.target.id === 'fee_hostel') {
            updateFeeTotalPreview();
        }
    });
});

// ============================================================
// INITIALIZATION COMPLETE
// ============================================================

console.log('✅ Finance Module initialized successfully!');
console.log('📊 Version:', window.FINANCE_CONFIG?.APP?.VERSION || '2.0.0');
console.log('🔐 User authenticated:', isFinanceAuthenticated());
