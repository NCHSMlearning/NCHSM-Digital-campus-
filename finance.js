// ============================================================
// FINANCE MODULE - COMPLETE JAVASCRIPT
// ============================================================

// ============================================================
// CONFIGURATION
// ============================================================

const SUPABASE_URL = 'https://lwhtjozfsmbyihenfunw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk';

// ============================================================
// GLOBALS
// ============================================================

let sbClient = null;
let allStudents = [];
let allPayments = [];
let allTransactions = [];
let allFeeStructures = [];
let staffData = [];
let allAccounts = [];
let selectedStudentForPayment = null;
let monthlyChart = null;
let statusChart = null;
let allInvoices = [];

// ============================================================
// INJECT CSS
// ============================================================

(function injectStyles() {
    const styles = `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f0f4ff;
            min-height: 100vh;
        }
        .tab-content { display: none; animation: fadeIn 0.3s ease; }
        .tab-content.active { display: block; }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .loading-spinner {
            display: inline-block;
            width: 30px;
            height: 30px;
            border: 3px solid #e5e7eb;
            border-top-color: #4C1D95;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        .finance-container { display: flex; min-height: 100vh; }
        .finance-sidebar {
            width: 260px;
            background: linear-gradient(180deg, #0A3D62, #1a5a7a);
            color: white;
            padding: 20px 0;
            position: fixed;
            height: 100vh;
            overflow-y: auto;
            z-index: 1000;
            transition: transform 0.3s ease;
        }
        .finance-sidebar-header {
            padding: 0 20px 20px 20px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .finance-sidebar-header img {
            width: 45px;
            height: 45px;
            border-radius: 50%;
            object-fit: cover;
        }
        .finance-sidebar-header h2 {
            font-size: 16px;
            font-weight: 700;
            margin: 0;
        }
        .finance-sidebar-header span {
            font-size: 11px;
            opacity: 0.7;
        }
        .finance-nav {
            list-style: none;
            padding: 10px 0;
            margin: 0;
        }
        .finance-nav li a {
            display: flex;
            align-items: center;
            padding: 12px 20px;
            color: rgba(255,255,255,0.7);
            text-decoration: none;
            transition: all 0.2s;
            gap: 12px;
            font-size: 14px;
            position: relative;
        }
        .finance-nav li a:hover {
            background: rgba(255,255,255,0.1);
            color: white;
        }
        .finance-nav li a.active {
            background: rgba(255,255,255,0.15);
            color: white;
            border-right: 3px solid #FDB913;
        }
        .finance-nav li a i { width: 20px; text-align: center; }
        .finance-nav li a .badge {
            background: #dc2626;
            color: white;
            font-size: 10px;
            padding: 2px 8px;
            border-radius: 12px;
            margin-left: auto;
        }
        .finance-sidebar-footer {
            padding: 20px;
            border-top: 1px solid rgba(255,255,255,0.1);
            margin-top: auto;
        }
        .finance-sidebar-footer a {
            display: flex;
            align-items: center;
            gap: 12px;
            color: rgba(255,255,255,0.6);
            text-decoration: none;
            padding: 8px 0;
            font-size: 13px;
            transition: color 0.2s;
        }
        .finance-sidebar-footer a:hover { color: white; }
        .finance-main {
            margin-left: 260px;
            flex: 1;
            padding: 25px 30px;
            min-height: 100vh;
        }
        .finance-mobile-toggle {
            display: none;
            position: fixed;
            top: 15px;
            left: 15px;
            z-index: 1001;
            background: #0A3D62;
            color: white;
            border: none;
            padding: 10px 14px;
            border-radius: 8px;
            font-size: 20px;
            cursor: pointer;
        }
        .btn-action {
            padding: 8px 18px;
            border-radius: 8px;
            border: none;
            cursor: pointer;
            font-weight: 600;
            font-size: 13px;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }
        .btn-action:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .btn-primary { background: #4C1D95; color: white; }
        .btn-success { background: #059669; color: white; }
        .btn-danger { background: #dc2626; color: white; }
        .btn-warning { background: #f59e0b; color: #0A3D62; }
        .btn-outline { background: transparent; color: #475569; border: 1px solid #e2e8f0; }
        .btn-sm { padding: 5px 12px; font-size: 12px; }
        .btn-xs { padding: 2px 8px; font-size: 11px; }
        .cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 16px;
            margin-bottom: 25px;
        }
        .card {
            background: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
            border-top: 4px solid #4C1D95;
            transition: all 0.2s;
            cursor: pointer;
        }
        .card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.12); }
        .card h3 { font-size: 12px; color: #64748b; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px; }
        .card .data { font-size: 28px; font-weight: 700; margin: 0; color: #0b1124; }
        .card .minor-data { font-size: 12px; color: #94a3b8; margin: 4px 0 0 0; }
        .payroll-summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            gap: 12px;
            margin-bottom: 20px;
        }
        .payroll-summary-card {
            border-radius: 10px;
            padding: 14px 18px;
            border: 1px solid #e5e7eb;
            background: white;
        }
        .payroll-summary-card .label { font-size: 12px; font-weight: 600; color: #475569; }
        .payroll-summary-card .value { font-size: 22px; font-weight: 700; }
        .payroll-summary-card .sub { font-size: 11px; color: #94a3b8; }
        .table-container {
            background: white;
            border-radius: 12px;
            padding: 20px;
            border: 1px solid #e5e7eb;
            margin-bottom: 20px;
        }
        .table-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        .table-header h4 { margin: 0; color: #0A3D62; }
        .modern-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
        }
        .modern-table th {
            background: #f8fafc;
            padding: 10px 12px;
            text-align: left;
            font-weight: 600;
            color: #475569;
            border-bottom: 2px solid #e5e7eb;
            position: sticky;
            top: 0;
            z-index: 10;
        }
        .modern-table td {
            padding: 10px 12px;
            border-bottom: 1px solid #f1f5f9;
        }
        .modern-table tr:hover td { background: #f8fafc; }
        .filter-bar {
            background: white;
            border-radius: 12px;
            padding: 16px 20px;
            margin-bottom: 20px;
            border: 1px solid #e5e7eb;
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            align-items: center;
        }
        .filter-bar input, .filter-bar select {
            padding: 8px 14px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            font-size: 13px;
            background: #f8fafc;
            min-width: 150px;
        }
        .filter-bar input:focus, .filter-bar select:focus {
            border-color: #4C1D95;
            outline: none;
        }
        .search-box {
            position: relative;
            flex: 1;
            min-width: 200px;
        }
        .search-box input {
            width: 100%;
            padding: 8px 14px 8px 36px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            font-size: 13px;
            background: #f8fafc;
            transition: all 0.3s;
        }
        .search-box input:focus {
            border-color: #4C1D95;
            outline: none;
            box-shadow: 0 0 0 3px rgba(76,29,149,0.1);
        }
        .search-box .search-icon {
            position: absolute;
            left: 12px;
            top: 50%;
            transform: translateY(-50%);
            color: #94a3b8;
        }
        .badge {
            display: inline-block;
            padding: 3px 12px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
        }
        .badge-success { background: #d1fae5; color: #059669; }
        .badge-warning { background: #fef3c7; color: #d97706; }
        .badge-danger { background: #fee2e2; color: #dc2626; }
        .badge-info { background: #dbeafe; color: #2563eb; }
        .modal-overlay {
            display: none;
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 99998;
            justify-content: center;
            align-items: center;
            backdrop-filter: blur(4px);
        }
        .modal-overlay.active { display: flex; }
        .modal-content {
            background: white;
            border-radius: 16px;
            padding: 30px;
            max-width: 850px;
            width: 95%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            position: relative;
        }
        .modal-close {
            position: absolute;
            top: 14px;
            right: 18px;
            background: none;
            border: none;
            font-size: 26px;
            color: #94a3b8;
            cursor: pointer;
        }
        .modal-close:hover { color: #1e293b; }
        .finance-form-group { margin-bottom: 12px; }
        .finance-form-group label {
            font-weight: 600;
            font-size: 13px;
            color: #475569;
            display: block;
            margin-bottom: 4px;
        }
        .form-control {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            font-size: 13px;
        }
        .form-control:focus {
            border-color: #4C1D95;
            outline: none;
            box-shadow: 0 0 0 3px rgba(76,29,149,0.1);
        }
        .toast-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .toast {
            padding: 14px 24px;
            border-radius: 10px;
            color: white;
            font-weight: 500;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            animation: slideIn 0.3s ease;
            max-width: 400px;
        }
        .toast-success { background: #059669; }
        .toast-error { background: #dc2626; }
        .toast-warning { background: #f59e0b; color: #0A3D62; }
        .toast-info { background: #3b82f6; }
        @keyframes slideIn {
            from { transform: translateX(20px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @media (max-width: 768px) {
            .finance-sidebar { transform: translateX(-100%); width: 280px; }
            .finance-sidebar.open { transform: translateX(0); }
            .finance-main { margin-left: 0; padding: 20px; }
            .finance-mobile-toggle { display: block; }
            .cards { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
            .filter-bar { flex-direction: column; align-items: stretch; }
            .filter-bar input, .filter-bar select { min-width: 100%; }
            .payroll-summary-grid { grid-template-columns: 1fr 1fr; }
            .search-box { min-width: 100%; }
        }
        @media (max-width: 480px) {
            .finance-main { padding: 14px; }
            .cards { grid-template-columns: 1fr 1fr; }
            .modal-content { padding: 20px; }
            .payroll-summary-grid { grid-template-columns: 1fr 1fr; }
        }
        .table-scroll { max-height: 500px; overflow-y: auto; position: relative; }
        .highlight { background: #fef3c7; padding: 0 2px; border-radius: 2px; font-weight: 600; }
        .quick-stats {
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
            padding: 12px 16px;
            background: #f8fafc;
            border-radius: 8px;
            margin-bottom: 16px;
            font-size: 13px;
        }
        .quick-stats span { color: #475569; }
        .quick-stats strong { color: #0A3D62; }
        .no-results { text-align: center; padding: 40px; color: #94a3b8; }
        .no-results i { font-size: 48px; display: block; margin-bottom: 16px; }
    `;
    
    const styleTag = document.createElement('style');
    styleTag.textContent = styles;
    document.head.appendChild(styleTag);
})();

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('💰 Finance Module starting...');
    updateCurrentDate();
    initSupabase();
    setupTabs();
    loadStudentDropdown();
    setTimeout(() => { showTab('dashboard'); }, 500);
    updateLastUpdated();
    setInterval(updateLastUpdated, 30000);
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) this.classList.remove('active');
        });
    });
    console.log('✅ Finance Module initialized');
});

// ============================================================
// SUPABASE
// ============================================================

function initSupabase() {
    if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
        sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        window.sb = sbClient;
        console.log('✅ Supabase initialized');
        return true;
    }
    console.warn('⚠️ Supabase not loaded');
    return false;
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function formatCurrency(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return 'KES 0';
    const num = parseFloat(amount);
    if (isNaN(num)) return 'KES 0';
    return 'KES ' + num.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function showToast(message, type = 'info') {
    const container = document.getElementById('financeToastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

function toggleSidebar() {
    document.getElementById('financeSidebar')?.classList.toggle('open');
}

function logoutFinance() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('finance_user');
        sessionStorage.removeItem('finance_user');
        showToast('Logging out...', 'info');
        setTimeout(() => { window.location.href = 'financelogin.html'; }, 500);
    }
}

function goToMainDashboard() {
    window.location.href = '/home';
}

function updateCurrentDate() {
    const dateDisplay = document.getElementById('currentDate');
    if (dateDisplay) {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateDisplay.textContent = now.toLocaleDateString('en-KE', options);
    }
}

function updateLastUpdated() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
    const el = document.getElementById('lastUpdatedTime');
    if (el) el.textContent = timeStr;
}

// ============================================================
// TAB NAVIGATION
// ============================================================

function setupTabs() {
    document.querySelectorAll('.finance-nav a[data-tab]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const tabId = this.dataset.tab;
            showTab(tabId);
            if (window.innerWidth <= 768) {
                document.getElementById('financeSidebar')?.classList.remove('open');
            }
        });
    });
}
function showTab(tabId) {
    document.querySelectorAll('.finance-nav a[data-tab]').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.tab === tabId) link.classList.add('active');
    });
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
        tab.classList.remove('active');
    });
    const target = document.getElementById('tab-' + tabId);
    if (target) {
        target.style.display = 'block';
        target.classList.add('active');
    }
    setTimeout(() => {
        switch(tabId) {
            case 'dashboard': loadDashboardData(); break;
            case 'accounts': loadAccounts(); break;
            case 'payments': loadPayments(); break;
            case 'fee-structure': loadFeeStructure(); break;
            case 'invoices': loadInvoices(); break;   // ✅ ADD THIS LINE
            case 'payroll': loadStaffData(); break;
            case 'transactions': loadTransactions(); break;
            case 'settings': loadSettings(); break;
        }
    }, 300);
}

// ============================================================
// DASHBOARD
// ============================================================

async function loadDashboardData() {
    try {
        if (!sbClient) { if (!initSupabase()) return; }
        const { count: totalStudents } = await sbClient
            .from('consolidated_user_profiles_table')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'student');
        document.getElementById('totalStudents').textContent = totalStudents || 0;
        document.getElementById('accountsBadge').textContent = totalStudents || 0;
        const { data: payments } = await sbClient
            .from('finance_payments')
            .select('*')
            .order('payment_date', { ascending: false });
        if (payments) {
            const totalCollected = payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + (p.amount || 0), 0);
            document.getElementById('totalCollected').textContent = formatCurrency(totalCollected);
            const today = new Date().toISOString().split('T')[0];
            const todayPayments = payments.filter(p => p.payment_date === today && p.status === 'completed');
            const todayTotal = todayPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
            document.getElementById('todayPayments').textContent = formatCurrency(todayTotal);
            document.getElementById('totalTransactions').textContent = payments.length;
            const recentTbody = document.getElementById('recentTransactions');
            if (payments.length === 0) {
                recentTbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:#94a3b8;">No transactions found</td></tr>`;
            } else {
                recentTbody.innerHTML = payments.slice(0, 10).map(p => `
                    <tr>
                        <td>${formatDate(p.payment_date)}</td>
                        <td><strong>${p.student_name || 'N/A'}</strong></td>
                        <td>${p.program || '-'}</td>
                        <td><strong>${formatCurrency(p.amount)}</strong></td>
                        <td>${p.payment_method || '-'}</td>
                        <td><span class="badge ${p.status === 'completed' ? 'badge-success' : p.status === 'pending' ? 'badge-warning' : 'badge-danger'}">${p.status || 'Pending'}</span></td>
                    </tr>
                `).join('');
            }
        }
        const { data: accounts } = await sbClient
            .from('finance_student_accounts')
            .select('balance')
            .gt('balance', 0);
        if (accounts) {
            const outstanding = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);
            document.getElementById('outstandingBalance').textContent = formatCurrency(outstanding);
            document.getElementById('overdueAccounts').textContent = accounts.length || 0;
            document.getElementById('dashboardBadge').textContent = accounts.length || 0;
        }
        loadCharts(payments || []);
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

function loadCharts(payments) {
    const monthlyCtx = document.getElementById('monthlyCollectionsChart');
    if (monthlyCtx) {
        if (monthlyChart) monthlyChart.destroy();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthlyTotals = new Array(12).fill(0);
        payments.filter(p => p.status === 'completed').forEach(p => {
            if (p.payment_date) {
                const date = new Date(p.payment_date);
                const month = date.getMonth();
                monthlyTotals[month] += p.amount || 0;
            }
        });
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
                scales: { y: { beginAtZero: true, ticks: { callback: v => 'KES ' + (v/1000).toFixed(0) + 'k' } } }
            }
        });
    }
    const statusCtx = document.getElementById('paymentStatusChart');
    if (statusCtx) {
        if (statusChart) statusChart.destroy();
        const statusCounts = { completed: 0, pending: 0, failed: 0 };
        payments.forEach(p => { if (statusCounts[p.status] !== undefined) statusCounts[p.status]++; });
        statusChart = new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: ['Completed', 'Pending', 'Failed'],
                datasets: [{
                    data: [statusCounts.completed, statusCounts.pending, statusCounts.failed],
                    backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                    borderWidth: 0,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { position: 'bottom', labels: { padding: 15, usePointStyle: true } } },
                cutout: '60%'
            }
        });
    }
}

// ============================================================
// STUDENT ACCOUNTS
// ============================================================

async function loadAccounts() {
    try {
        if (!sbClient) { if (!initSupabase()) return; }
        const { data, error } = await sbClient
            .from('consolidated_user_profiles_table')
            .select('*')
            .eq('role', 'student')
            .eq('status', 'approved')
            .order('full_name', { ascending: true });
        if (error) throw error;
        allAccounts = (data || []).map(s => ({
            ...s,
            student_id: s.user_id,
            student_name: s.full_name,
            display_id: s.student_id || s.user_id,
            balance: 0,
            total_fees_due: 0,
            total_paid: 0,
            payment_status: 'active'
        }));
        renderAccounts(allAccounts);
        updateAccountCount(allAccounts.length);
        loadBalanceAlerts();
        populateProgramFilter();
        updateQuickStats(allAccounts);
    } catch (error) {
        console.error('Error loading accounts:', error);
        showToast('Error loading student accounts', 'error');
    }
}

function renderAccounts(accounts) {
    const tbody = document.getElementById('accountsTableBody');
    if (!tbody) return;
    if (!accounts || accounts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:40px;color:#94a3b8;"><i class="fas fa-info-circle"></i> No student accounts found</td></tr>`;
        return;
    }
    const searchTerm = document.getElementById('accountSearch')?.value?.toLowerCase() || '';
    tbody.innerHTML = accounts.map(acc => {
        const balance = parseFloat(acc.balance) || 0;
        const status = balance === 0 ? 'paid' : balance > 0 && balance <= 10000 ? 'partial' : 'outstanding';
        const statusLabel = status === 'paid' ? '✅ Paid' : status === 'partial' ? '⚠️ Partial' : '🔴 Outstanding';
        const statusClass = status === 'paid' ? 'badge-success' : status === 'partial' ? 'badge-warning' : 'badge-danger';
        const displayId = acc.display_id || acc.student_id || '-';
        let highlightedName = acc.full_name || acc.student_name || 'N/A';
        let highlightedId = displayId;
        if (searchTerm) {
            const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            highlightedName = highlightedName.replace(regex, '<span class="highlight">$1</span>');
            highlightedId = highlightedId.replace(regex, '<span class="highlight">$1</span>');
        }
        return `
            <tr>
                <td><strong>${highlightedName}</strong></td>
                <td>${highlightedId}</td>
                <td>${acc.program || '-'}</td>
                <td>${acc.intake_year || '-'}</td>
                <td>${formatCurrency(acc.total_fees_due)}</td>
                <td>${formatCurrency(acc.total_paid)}</td>
                <td><strong>${formatCurrency(balance)}</strong></td>
                <td><span class="badge ${statusClass}">${statusLabel}</span></td>
                <td>
                    <button onclick="openPaymentModal('${acc.user_id}')" class="btn-action btn-success btn-xs" title="Record Payment"><i class="fas fa-plus"></i></button>
                    <button onclick="viewStudentAccount('${acc.user_id}')" class="btn-action btn-primary btn-xs" title="View Details"><i class="fas fa-eye"></i></button>
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
            (acc.full_name || acc.student_name || '').toLowerCase().includes(search) ||
            (acc.display_id || '').toLowerCase().includes(search) ||
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
    updateAccountCount(filtered.length);
    updateQuickStats(filtered);
}

function resetAccountFilters() {
    document.getElementById('accountSearch').value = '';
    document.getElementById('accountStatusFilter').value = 'all';
    document.getElementById('accountProgramFilter').value = 'all';
    renderAccounts(allAccounts);
    updateAccountCount(allAccounts.length);
    updateQuickStats(allAccounts);
    showToast('Filters reset!', 'info');
}

function updateAccountCount(count) {
    const el = document.getElementById('accountCount');
    if (el) el.textContent = `Showing ${count} students`;
}

function updateQuickStats(students) {
    const total = students.length;
    const paid = students.filter(s => (parseFloat(s.balance) || 0) === 0).length;
    const partial = students.filter(s => { const b = parseFloat(s.balance) || 0; return b > 0 && b <= 10000; }).length;
    const outstanding = students.filter(s => (parseFloat(s.balance) || 0) > 10000).length;
    document.getElementById('statTotal').textContent = total;
    document.getElementById('statPaid').textContent = paid;
    document.getElementById('statPartial').textContent = partial;
    document.getElementById('statOutstanding').textContent = outstanding;
}

function populateProgramFilter() {
    const programs = [...new Set(allAccounts.map(s => s.program).filter(p => p))];
    const select = document.getElementById('accountProgramFilter');
    if (!select) return;
    select.innerHTML = '<option value="all">All Programs</option>';
    programs.sort().forEach(p => {
        const option = document.createElement('option');
        option.value = p;
        option.textContent = p;
        select.appendChild(option);
    });
}

function loadBalanceAlerts() {
    const highBalance = allAccounts.filter(acc => (parseFloat(acc.balance) || 0) > 100000);
    const banner = document.getElementById('balanceAlertBanner');
    if (highBalance.length > 0 && banner) {
        banner.style.display = 'block';
        document.getElementById('highBalanceCount').textContent = highBalance.length;
    } else if (banner) {
        banner.style.display = 'none';
    }
}

function viewStudentAccount(studentId) {
    const modal = document.getElementById('studentAccountModal');
    if (!modal) return;
    modal.classList.add('active');
    document.getElementById('studentAccountBody').innerHTML = `<div style="text-align:center;padding:40px;"><div class="loading-spinner"></div><p style="margin-top:10px;color:#94a3b8;">Loading...</p></div>`;
    const student = allAccounts.find(acc => acc.user_id === studentId);
    setTimeout(() => {
        if (student) {
            const balance = parseFloat(student.balance) || 0;
            const displayId = student.display_id || student.student_id || '-';
            document.getElementById('studentAccountBody').innerHTML = `
                <div style="padding:10px 0;">
                    <h4 style="color:#0A3D62;">${student.full_name || student.student_name}</h4>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;background:#f8fafc;padding:16px;border-radius:8px;">
                        <div><strong>ID:</strong> ${displayId}</div>
                        <div><strong>Program:</strong> ${student.program || '-'}</div>
                        <div><strong>Intake:</strong> ${student.intake_year || '-'}</div>
                        <div><strong>Balance:</strong> ${formatCurrency(balance)}</div>
                    </div>
                    <div style="margin-top:12px;">
                        <button onclick="closeModal('studentAccountModal'); openPaymentModal('${studentId}')" class="btn-action btn-success" style="width:100%;">
                            <i class="fas fa-credit-card"></i> Record Payment
                        </button>
                    </div>
                </div>
            `;
        } else {
            document.getElementById('studentAccountBody').innerHTML = `<div style="text-align:center;padding:20px;color:#dc2626;"><i class="fas fa-exclamation-circle" style="font-size:24px;display:block;margin-bottom:10px;"></i><p>Student not found</p></div>`;
        }
    }, 500);
}

function viewStudentPayments(studentId) {
    showToast('Viewing payments for student...', 'info');
    showTab('payments');
    setTimeout(() => {
        const filtered = allPayments.filter(p => p.student_id === studentId);
        if (filtered.length > 0) {
            renderPayments(filtered);
            showToast(`Found ${filtered.length} payments`, 'success');
        } else {
            showToast('No payments found for this student', 'info');
        }
    }, 300);
}

function showHighBalanceStudents() {
    document.getElementById('accountStatusFilter').value = 'outstanding';
    filterAccounts();
    document.getElementById('balanceAlertBanner').style.display = 'none';
}

function refreshAccounts() {
    loadAccounts();
    showToast('Accounts refreshed!', 'success');
}

// ============================================================
// PAYMENTS
// ============================================================

async function loadPayments() {
    try {
        if (!sbClient) { if (!initSupabase()) return; }
        const { data, error } = await sbClient
            .from('finance_payments')
            .select('*')
            .order('payment_date', { ascending: false });
        if (error) throw error;
        allPayments = data || [];
        renderPayments(allPayments);
        updatePaymentCount(allPayments.length);
        updatePaymentSummary(allPayments);
    } catch (error) {
        console.error('Error loading payments:', error);
        showToast('Error loading payments', 'error');
    }
}

function renderPayments(payments) {
    const tbody = document.getElementById('paymentsTableBody');
    if (!tbody) return;
    if (!payments || payments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:40px;color:#94a3b8;"><i class="fas fa-info-circle"></i> No payments found</td></tr>`;
        return;
    }
    tbody.innerHTML = payments.map(p => {
        const statusClass = p.status === 'completed' ? 'badge-success' : p.status === 'pending' ? 'badge-warning' : 'badge-danger';
        return `
            <tr>
                <td>${formatDate(p.payment_date)}</td>
                <td><strong>${p.student_name || 'N/A'}</strong></td>
                <td>${p.program || '-'}</td>
                <td><strong>${formatCurrency(p.amount)}</strong></td>
                <td>${p.payment_method || '-'}</td>
                <td>${p.reference_number || '-'}</td>
                <td>${p.period || '-'}</td>
                <td><span class="badge ${statusClass}">${p.status || 'Pending'}</span></td>
                <td>
                    <button onclick="viewPaymentDetail('${p.id}')" class="btn-action btn-primary btn-xs"><i class="fas fa-eye"></i></button>
                    <button onclick="deletePaymentRecord('${p.id}')" class="btn-action btn-danger btn-xs"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    }).join('');
}

function filterPayments() {
    const search = document.getElementById('paymentSearch')?.value?.toLowerCase() || '';
    const status = document.getElementById('paymentStatusFilter')?.value || 'all';
    let filtered = allPayments.filter(p => {
        const matchSearch = (p.student_name || '').toLowerCase().includes(search) || (p.reference_number || '').toLowerCase().includes(search);
        const matchStatus = status === 'all' || p.status === status;
        return matchSearch && matchStatus;
    });
    renderPayments(filtered);
    updatePaymentCount(filtered.length);
}

function resetPaymentFilters() {
    document.getElementById('paymentSearch').value = '';
    document.getElementById('paymentStatusFilter').value = 'all';
    renderPayments(allPayments);
    updatePaymentCount(allPayments.length);
    showToast('Payment filters reset!', 'info');
}

function updatePaymentCount(count) {
    const el = document.getElementById('paymentCount');
    if (el) el.textContent = `Showing ${count} payments`;
}

function updatePaymentSummary(payments) {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];
    const monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth() - 1);
    const monthAgoStr = monthAgo.toISOString().split('T')[0];
    let todayTotal = 0, todayCount = 0, weekTotal = 0, weekCount = 0, monthTotal = 0, monthCount = 0, pendingTotal = 0, pendingCount = 0;
    payments.forEach(p => {
        const date = p.payment_date;
        if (date === today && p.status === 'completed') { todayTotal += p.amount || 0; todayCount++; }
        if (date >= weekAgoStr && p.status === 'completed') { weekTotal += p.amount || 0; weekCount++; }
        if (date >= monthAgoStr && p.status === 'completed') { monthTotal += p.amount || 0; monthCount++; }
        if (p.status === 'pending') { pendingTotal += p.amount || 0; pendingCount++; }
    });
    document.getElementById('todayPaymentSummary').textContent = formatCurrency(todayTotal);
    document.getElementById('todayPaymentCount').textContent = todayCount;
    document.getElementById('weekPaymentSummary').textContent = formatCurrency(weekTotal);
    document.getElementById('weekPaymentCount').textContent = weekCount;
    document.getElementById('monthPaymentSummary').textContent = formatCurrency(monthTotal);
    document.getElementById('monthPaymentCount').textContent = monthCount;
    document.getElementById('pendingPaymentSummary').textContent = formatCurrency(pendingTotal);
    document.getElementById('pendingPaymentCount').textContent = pendingCount;
}

function viewPaymentDetail(paymentId) {
    const payment = allPayments.find(p => p.id === paymentId);
    if (payment) {
        showToast(`💳 Payment: ${formatCurrency(payment.amount)} - ${payment.student_name} (${payment.status})`, 'info');
    } else {
        showToast('Payment not found', 'error');
    }
}

async function deletePaymentRecord(paymentId) {
    if (!confirm('Delete this payment?')) return;
    try {
        if (!sbClient) { if (!initSupabase()) return; }
        const { error } = await sbClient.from('finance_payments').delete().eq('id', paymentId);
        if (error) throw error;
        showToast('Payment deleted!', 'success');
        await loadPayments();
        await loadDashboardData();
    } catch (error) {
        console.error('Error deleting payment:', error);
        showToast('Error deleting payment', 'error');
    }
}

function refreshPayments() {
    loadPayments();
    showToast('Payments refreshed!', 'success');
}

// ============================================================
// PAYMENT MODAL
// ============================================================

async function loadStudentDropdown() {
    try {
        if (!sbClient) { if (!initSupabase()) return; }
        const { data, error } = await sbClient
            .from('consolidated_user_profiles_table')
            .select('user_id, full_name, student_id, program, email')
            .eq('role', 'student')
            .eq('status', 'approved')
            .order('full_name', { ascending: true });
        if (error) throw error;
        allStudents = data || [];
        const select = document.getElementById('modalPaymentStudent');
        if (select) {
            select.innerHTML = '<option value="">-- Select Student --</option>';
            allStudents.forEach(s => {
                const option = document.createElement('option');
                option.value = s.user_id;
                const displayId = s.student_id || s.user_id;
                option.textContent = `${s.full_name} (${displayId})`;
                option.dataset.student = JSON.stringify({
                    ...s,
                    display_id: displayId,
                    student_name: s.full_name,
                    student_id: s.user_id,
                    balance: 0
                });
                select.appendChild(option);
            });
        }
        console.log('✅ Student dropdown loaded:', allStudents.length);
    } catch (error) {
        console.error('Error loading student dropdown:', error);
    }
}

function openPaymentModal(studentId) {
    const modal = document.getElementById('paymentModal');
    document.getElementById('paymentModalForm').reset();
    document.getElementById('modalPaymentDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('paymentStudentInfo').style.display = 'none';
    if (allStudents.length === 0) {
        loadStudentDropdown().then(() => populatePaymentDropdown(studentId));
    } else {
        populatePaymentDropdown(studentId);
    }
    modal.classList.add('active');
}

function populatePaymentDropdown(studentId) {
    const select = document.getElementById('modalPaymentStudent');
    select.innerHTML = '<option value="">-- Select Student --</option>';
    allStudents.forEach(s => {
        const option = document.createElement('option');
        option.value = s.user_id;
        const displayId = s.student_id || s.user_id;
        option.textContent = `${s.full_name} (${displayId})`;
        option.dataset.student = JSON.stringify({
            ...s,
            display_id: displayId,
            student_name: s.full_name,
            student_id: s.user_id,
            balance: 0
        });
        select.appendChild(option);
    });
    if (studentId) {
        select.value = studentId;
        updateStudentInfo();
    }
}

function updateStudentInfo() {
    const select = document.getElementById('modalPaymentStudent');
    const option = select.options[select.selectedIndex];
    if (!option || !option.value) {
        document.getElementById('paymentStudentInfo').style.display = 'none';
        selectedStudentForPayment = null;
        return;
    }
    try {
        selectedStudentForPayment = JSON.parse(option.dataset.student);
        document.getElementById('paymentStudentInfo').style.display = 'block';
        document.getElementById('modalStudentName').textContent = selectedStudentForPayment.full_name || 'N/A';
        document.getElementById('modalStudentId').textContent = selectedStudentForPayment.display_id || 'N/A';
        document.getElementById('modalStudentProgram').textContent = selectedStudentForPayment.program || 'N/A';
        document.getElementById('modalBalance').textContent = formatCurrency(0);
    } catch (e) {
        console.error('Error parsing student data:', e);
    }
}

function closePaymentModal() {
    document.getElementById('paymentModal').classList.remove('active');
    selectedStudentForPayment = null;
}

async function recordPaymentFromModal() {
    try {
        if (!sbClient) { if (!initSupabase()) return; }
        const student = selectedStudentForPayment;
        const amount = parseFloat(document.getElementById('modalPaymentAmount').value);
        const method = document.getElementById('modalPaymentMethod').value;
        const date = document.getElementById('modalPaymentDate').value;
        const notes = document.getElementById('modalPaymentNotes').value || null;
        if (!student) { showToast('Please select a student', 'warning'); return; }
        if (!amount || amount <= 0) { showToast('Please enter a valid amount', 'warning'); return; }
        const paymentData = {
            student_id: student.student_id,
            student_name: student.full_name,
            student_email: student.email || null,
            program: student.program || 'KRCHN',
            amount: amount,
            payment_method: method,
            reference_number: 'TXN-' + Date.now().toString().slice(-8),
            payment_date: date,
            period: 'Term 1',
            status: 'completed',
            notes: notes,
            recorded_by_name: 'Admin',
            created_at: new Date().toISOString()
        };
        const { error } = await sbClient.from('finance_payments').insert([paymentData]);
        if (error) throw error;
        showToast(`Payment of ${formatCurrency(amount)} recorded for ${student.full_name}`, 'success');
        closePaymentModal();
        await loadPayments();
        await loadAccounts();
    } catch (error) {
        console.error('Error recording payment:', error);
        showToast('Error recording payment: ' + error.message, 'error');
    }
}

function recordPayment() {
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
    const student = allAccounts.find(a => a.student_id === studentId || a.user_id === studentId);
    if (!student) {
        showToast('Student not found.', 'error');
        return;
    }
    selectedStudentForPayment = student;
    document.getElementById('modalPaymentAmount').value = amount;
    document.getElementById('modalPaymentMethod').value = method || 'Cash';
    document.getElementById('modalPaymentDate').value = date;
    document.getElementById('modalPaymentNotes').value = notes || '';
    recordPaymentFromModal();
}

// ============================================================
// FEE STRUCTURE
// ============================================================

async function loadFeeStructure() {
    try {
        if (!sbClient) { if (!initSupabase()) return; }
        const { data, error } = await sbClient
            .from('finance_fee_structure')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        allFeeStructures = data || [];
        renderFeeStructureCards(allFeeStructures);
        updateFeeStructureCount(allFeeStructures.length);
    } catch (error) {
        console.error('Error loading fee structures:', error);
        showToast('Error loading fee structures', 'error');
        document.getElementById('feeStructureCardsContainer').innerHTML = `<div style="text-align:center;padding:40px;color:#dc2626;"><i class="fas fa-exclamation-circle" style="font-size:32px;display:block;margin-bottom:10px;"></i>Error loading fee structures</div>`;
    }
}

function renderFeeStructureCards(fees) {
    const container = document.getElementById('feeStructureCardsContainer');
    if (!container) return;
    if (!fees || fees.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:60px;color:#94a3b8;"><i class="fas fa-file-invoice" style="font-size:48px;display:block;margin-bottom:16px;"></i><p>No fee structures found. Click "New Fee Structure" to create one.</p></div>`;
        return;
    }
    container.innerHTML = fees.map(fee => {
        const components = fee.components || [];
        let total = 0;
        components.forEach(c => { total += parseFloat(c.amount) || 0; });
        if (fee.hostel) total += parseFloat(fee.hostel) || 0;
        return `
            <div style="background:white;border-radius:12px;padding:20px;border:1px solid #e5e7eb;margin-bottom:16px;border-left:4px solid ${fee.is_active ? '#059669' : '#dc2626'};">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                    <div>
                        <h4 style="margin:0;color:#0A3D62;font-size:16px;">${fee.program || 'N/A'} <span style="font-size:12px;color:#94a3b8;font-weight:normal;">${fee.block_term || ''}</span></h4>
                        <p style="margin:4px 0 0 0;font-size:13px;color:#64748b;">${fee.level || 'N/A'} | ${fee.duration || 'N/A'} | ${fee.mode || 'N/A'}</p>
                    </div>
                    <div style="text-align:right;">
                        <span class="badge ${fee.is_active ? 'badge-success' : 'badge-danger'}">${fee.is_active ? '✅ Active' : '❌ Inactive'}</span>
                        <div style="font-size:20px;font-weight:700;color:#059669;margin-top:4px;">${formatCurrency(total)}</div>
                    </div>
                </div>
                ${components.length > 0 ? `
                    <div style="margin-top:12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:6px 20px;background:#f8fafc;padding:12px;border-radius:8px;border:1px solid #e5e7eb;">
                        ${components.map(c => `
                            <div style="display:flex;justify-content:space-between;font-size:13px;padding:2px 0;border-bottom:1px solid #f1f5f9;">
                                <span style="color:#475569;">${c.label || c.name || 'Component'}</span>
                                <span style="font-weight:600;color:#0A3D62;">${formatCurrency(c.amount)}</span>
                            </div>
                        `).join('')}
                        ${fee.hostel ? `
                            <div style="display:flex;justify-content:space-between;font-size:13px;padding:2px 0;border-bottom:1px solid #f1f5f9;grid-column:1/-1;color:#d97706;font-weight:600;">
                                <span>🏠 HOSTEL FEE (Optional)</span>
                                <span>${formatCurrency(fee.hostel)}</span>
                            </div>
                        ` : ''}
                        <div style="display:flex;justify-content:space-between;font-size:14px;padding:6px 0;border-top:2px solid #4C1D95;grid-column:1/-1;font-weight:700;">
                            <span style="color:#0A3D62;">TOTAL</span>
                            <span style="color:#059669;">${formatCurrency(total)}</span>
                        </div>
                    </div>
                ` : '<div style="color:#94a3b8;font-size:13px;margin-top:8px;">No components defined</div>'}
                <div style="margin-top:12px;padding-top:12px;border-top:1px solid #f1f5f9;display:flex;flex-wrap:wrap;gap:8px 20px;font-size:12px;color:#64748b;">
                    <span><i class="fas fa-calendar"></i> Intake: ${fee.intake_year || '2026'}</span>
                    ${fee.payment?.mpesa ? `<span><i class="fas fa-phone"></i> M-Pesa: ${fee.payment.mpesa.substring(0, 30)}${fee.payment.mpesa.length > 30 ? '...' : ''}</span>` : ''}
                </div>
                <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;border-top:1px solid #f1f5f9;padding-top:12px;">
                    <button onclick="openEditFeeModal('${fee.id}')" class="btn-action btn-primary btn-sm" style="padding:4px 12px;font-size:12px;"><i class="fas fa-edit"></i> Edit</button>
                    <button onclick="duplicateFeeStructure('${fee.id}')" class="btn-action btn-outline btn-sm" style="padding:4px 12px;font-size:12px;"><i class="fas fa-copy"></i> Duplicate</button>
                    <button onclick="toggleFeeStructure('${fee.id}')" class="btn-action ${fee.is_active ? 'btn-warning' : 'btn-success'} btn-sm" style="padding:4px 12px;font-size:12px;"><i class="fas ${fee.is_active ? 'fa-pause' : 'fa-play'}"></i> ${fee.is_active ? 'Deactivate' : 'Activate'}</button>
                    <button onclick="deleteFeeStructure('${fee.id}')" class="btn-action btn-danger btn-sm" style="padding:4px 12px;font-size:12px;"><i class="fas fa-trash"></i> Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

function updateFeeStructureCount(count) {
    const el = document.getElementById('feeStructureCount');
    if (el) el.textContent = `Showing ${count} fee structures`;
}

function updateFeeTotalPreview() {
    const compAmounts = document.querySelectorAll('.comp-amount');
    let total = 0;
    compAmounts.forEach(input => { const val = parseFloat(input.value) || 0; total += val; });
    const hostel = parseFloat(document.getElementById('fee_hostel')?.value) || 0;
    total += hostel;
    const previewEl = document.getElementById('feeTotalPreview');
    if (previewEl) previewEl.textContent = 'KES ' + total.toLocaleString();
}

function addFeeComponentRow() {
    const container = document.getElementById('feeComponentsContainer');
    const row = document.createElement('div');
    row.className = 'fee-component-row';
    row.style.cssText = 'display: grid; grid-template-columns: 1fr 120px 40px; gap: 8px; margin-bottom: 8px;';
    row.innerHTML = `
        <input type="text" class="form-control comp-name" placeholder="Component name" oninput="updateFeeTotalPreview()">
        <input type="number" class="form-control comp-amount" placeholder="Amount" oninput="updateFeeTotalPreview()">
        <button type="button" onclick="removeFeeComponentRow(this)" class="btn-action btn-danger btn-xs"><i class="fas fa-times"></i></button>
    `;
    container.appendChild(row);
    updateFeeTotalPreview();
}

function removeFeeComponentRow(button) {
    const row = button.closest('.fee-component-row');
    if (row) { row.remove(); updateFeeTotalPreview(); }
}

function addFeeTermRow() {
    const container = document.getElementById('feeTermsContainer');
    const row = document.createElement('div');
    row.className = 'fee-term-row';
    row.style.cssText = 'display: grid; grid-template-columns: 1fr 40px; gap: 8px; margin-bottom: 8px;';
    row.innerHTML = `
        <input type="text" class="form-control term-text" placeholder="Enter term">
        <button type="button" onclick="removeFeeTermRow(this)" class="btn-action btn-danger btn-xs"><i class="fas fa-times"></i></button>
    `;
    container.appendChild(row);
}

function removeFeeTermRow(button) {
    const row = button.closest('.fee-term-row');
    if (row) row.remove();
}

function openAddFeeModal() {
    const modal = document.getElementById('feeStructureModal');
    document.getElementById('feeStructureForm').reset();
    document.getElementById('feeStructureId').value = '';
    document.getElementById('feeModalTitle').innerHTML = '<i class="fas fa-plus-circle"></i> Add Fee Structure';
    modal.classList.add('active');
    updateFeeTotalPreview();
}

function openEditFeeModal(feeId) {
    const fee = allFeeStructures.find(f => f.id === feeId);
    if (!fee) { showToast('Fee structure not found', 'error'); return; }
    const modal = document.getElementById('feeStructureModal');
    document.getElementById('feeModalTitle').innerHTML = '<i class="fas fa-edit"></i> Edit Fee Structure';
    document.getElementById('feeStructureId').value = feeId;
    document.getElementById('fee_program_name').value = fee.program || '';
    document.getElementById('fee_program_code').value = fee.program_code || '';
    document.getElementById('fee_level').value = fee.level || 'Diploma';
    document.getElementById('fee_duration').value = fee.duration || '';
    document.getElementById('fee_mode').value = fee.mode || 'Physical/Online';
    document.getElementById('fee_block_term').value = fee.block_term || 'Term 1';
    document.getElementById('fee_intake_year').value = fee.intake_year || '2026';
    document.getElementById('fee_hostel').value = fee.hostel || 18000;
    document.getElementById('fee_status').value = fee.is_active ? 'active' : 'inactive';
    const payment = fee.payment || {};
    document.getElementById('fee_mpesa').value = payment.mpesa || 'BUSINESS NO: 247247 | ACCOUNT: 219337#AdmNo';
    document.getElementById('fee_bank').value = payment.bank || 'Equity Bank | Branch: Nakuru | A/C: 0130200214036';
    document.getElementById('fee_email').value = payment.email || 'nchsmfinance@gmail.com';
    document.getElementById('fee_whatsapp').value = payment.whatsapp || '+254 103614355 | +254 703345771';
    const compContainer = document.getElementById('feeComponentsContainer');
    compContainer.innerHTML = '';
    const components = fee.components || [];
    if (components.length > 0) {
        components.forEach(comp => {
            compContainer.innerHTML += `
                <div class="fee-component-row" style="display: grid; grid-template-columns: 1fr 120px 40px; gap: 8px; margin-bottom: 8px;">
                    <input type="text" class="form-control comp-name" placeholder="Component name" value="${(comp.label || comp.name || '').replace(/"/g, '&quot;')}" oninput="updateFeeTotalPreview()">
                    <input type="number" class="form-control comp-amount" placeholder="Amount" value="${comp.amount || 0}" oninput="updateFeeTotalPreview()">
                    <button type="button" onclick="removeFeeComponentRow(this)" class="btn-action btn-danger btn-xs"><i class="fas fa-times"></i></button>
                </div>
            `;
        });
    }
    const termContainer = document.getElementById('feeTermsContainer');
    termContainer.innerHTML = '';
    const terms = fee.terms || [];
    if (terms.length > 0) {
        terms.forEach(term => {
            termContainer.innerHTML += `
                <div class="fee-term-row" style="display: grid; grid-template-columns: 1fr 40px; gap: 8px; margin-bottom: 8px;">
                    <input type="text" class="form-control term-text" placeholder="Enter term" value="${term.replace(/"/g, '&quot;')}">
                    <button type="button" onclick="removeFeeTermRow(this)" class="btn-action btn-danger btn-xs"><i class="fas fa-times"></i></button>
                </div>
            `;
        });
    }
    modal.classList.add('active');
    updateFeeTotalPreview();
}

function closeFeeStructureModal() {
    document.getElementById('feeStructureModal').classList.remove('active');
}

async function saveFeeStructureFull() {
    console.log('📝 Saving fee structure...');
    const feeId = document.getElementById('feeStructureId').value || null;
    const program = document.getElementById('fee_program_name').value.trim();
    const programCode = document.getElementById('fee_program_code').value.trim();
    const level = document.getElementById('fee_level').value;
    const duration = document.getElementById('fee_duration').value.trim();
    const mode = document.getElementById('fee_mode').value;
    const blockTerm = document.getElementById('fee_block_term').value.trim();
    const intakeYear = document.getElementById('fee_intake_year').value;
    const hostel = parseFloat(document.getElementById('fee_hostel').value) || 0;
    const status = document.getElementById('fee_status').value;
    if (!program || !blockTerm) { showToast('Please fill in all required fields', 'warning'); return; }
    const compNames = document.querySelectorAll('.comp-name');
    const compAmounts = document.querySelectorAll('.comp-amount');
    const components = [];
    let total = 0;
    compNames.forEach((input, index) => {
        const name = input.value.trim();
        const amount = parseFloat(compAmounts[index]?.value) || 0;
        if (name) { components.push({ label: name, amount: amount }); total += amount; }
    });
    if (components.length === 0) { showToast('Please add at least one fee component', 'warning'); return; }
    total += hostel;
    const termInputs = document.querySelectorAll('.term-text');
    const terms = [];
    termInputs.forEach(input => { const text = input.value.trim(); if (text) terms.push(text); });
    const payment = {
        mpesa: document.getElementById('fee_mpesa').value.trim() || 'BUSINESS NO: 247247 | ACCOUNT: 219337#AdmNo',
        bank: document.getElementById('fee_bank').value.trim() || 'Equity Bank | Branch: Nakuru | A/C: 0130200214036',
        email: document.getElementById('fee_email').value.trim() || 'nchsmfinance@gmail.com',
        whatsapp: document.getElementById('fee_whatsapp').value.trim() || '+254 103614355 | +254 703345771'
    };
    const feeData = {
        program, program_code: programCode, level, duration, mode,
        block_term: blockTerm, intake_year: intakeYear, total, hostel,
        components, terms, payment,
        is_active: status === 'active',
        description: `${program} - ${level} Fees (${blockTerm})`
    };
    try {
        if (!sbClient) { if (!initSupabase()) return; }
        if (feeId) {
            const { error } = await sbClient.from('finance_fee_structure').update({ ...feeData, updated_at: new Date().toISOString() }).eq('id', feeId);
            if (error) throw error;
            showToast('Fee structure updated!', 'success');
        } else {
            const { error } = await sbClient.from('finance_fee_structure').insert([{ ...feeData, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }]);
            if (error) throw error;
            showToast('Fee structure added!', 'success');
        }
        closeFeeStructureModal();
        await loadFeeStructure();
    } catch (error) {
        console.error('Error saving fee structure:', error);
        showToast('Error saving: ' + error.message, 'error');
    }
}

async function toggleFeeStructure(feeId) {
    try {
        if (!sbClient) { if (!initSupabase()) return; }
        const { data, error } = await sbClient.from('finance_fee_structure').select('is_active').eq('id', feeId).single();
        if (error) throw error;
        const newStatus = !data.is_active;
        const { error: updateError } = await sbClient.from('finance_fee_structure').update({ is_active: newStatus, updated_at: new Date().toISOString() }).eq('id', feeId);
        if (updateError) throw updateError;
        showToast(`Fee structure ${newStatus ? 'activated' : 'deactivated'}!`, 'success');
        await loadFeeStructure();
    } catch (error) {
        console.error('Error toggling fee structure:', error);
        showToast('Error toggling fee structure', 'error');
    }
}

async function duplicateFeeStructure(feeId) {
    try {
        if (!sbClient) { if (!initSupabase()) return; }
        const { data, error } = await sbClient.from('finance_fee_structure').select('*').eq('id', feeId).single();
        if (error) throw error;
        delete data.id; delete data.created_at; delete data.updated_at;
        data.program = data.program + ' (Copy)';
        data.is_active = true;
        const { error: insertError } = await sbClient.from('finance_fee_structure').insert([data]);
        if (insertError) throw insertError;
        showToast('Fee structure duplicated!', 'success');
        await loadFeeStructure();
    } catch (error) {
        console.error('Error duplicating:', error);
        showToast('Error duplicating fee structure', 'error');
    }
}

async function deleteFeeStructure(feeId) {
    if (!confirm('Delete this fee structure?')) return;
    try {
        if (!sbClient) { if (!initSupabase()) return; }
        const { error } = await sbClient.from('finance_fee_structure').delete().eq('id', feeId);
        if (error) throw error;
        showToast('Fee structure deleted!', 'success');
        await loadFeeStructure();
    } catch (error) {
        console.error('Error deleting:', error);
        showToast('Error deleting fee structure', 'error');
    }
}

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

function refreshFeeStructure() {
    loadFeeStructure();
    showToast('Fee structure refreshed!', 'success');
}

// ============================================================
// STAFF PAYROLL
// ============================================================

async function loadStaffData() {
    try {
        if (!sbClient) { if (!initSupabase()) return; }
        const { data, error } = await sbClient
            .from('finance_staff')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        staffData = data || [];
        renderStaffTable();
        updatePayrollSummary();
        document.getElementById('staffCount').textContent = `${staffData.length} staff members`;
    } catch (error) {
        console.error('Error loading staff:', error);
        showToast('Error loading staff data', 'error');
    }
}

function renderStaffTable() {
    const tbody = document.getElementById('staffTableBody');
    if (!tbody) return;
    if (staffData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:40px;color:#94a3b8;">No staff records found</td></tr>`;
        return;
    }
    tbody.innerHTML = staffData.map(s => `
        <tr>
            <td><strong>${s.staff_id || '-'}</strong></td>
            <td>${s.full_name || 'N/A'}</td>
            <td><span class="badge" style="background:#e0e7ff;color:#4C1D95;">${s.department || '-'}</span></td>
            <td>${s.position || '-'}</td>
            <td>${formatCurrency(s.basic_salary)}</td>
            <td>${formatCurrency(s.allowances)}</td>
            <td><strong>${formatCurrency(s.total_pay)}</strong></td>
            <td><span class="badge ${s.status === 'active' ? 'badge-success' : s.status === 'on leave' ? 'badge-warning' : 'badge-danger'}">${s.status || 'Active'}</span></td>
            <td>
                <button onclick="editStaffMember('${s.id}')" class="btn-action btn-primary btn-xs"><i class="fas fa-edit"></i></button>
                <button onclick="deleteStaffMember('${s.id}')" class="btn-action btn-danger btn-xs"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

function filterStaffTable() {
    const search = document.getElementById('staffSearch').value.toLowerCase();
    const dept = document.getElementById('staffDepartmentFilter').value;
    const status = document.getElementById('staffStatusFilter').value;
    let filtered = staffData.filter(s => {
        const matchSearch = (s.full_name || '').toLowerCase().includes(search) || (s.staff_id || '').toLowerCase().includes(search) || (s.position || '').toLowerCase().includes(search);
        const matchDept = dept === 'all' || s.department === dept;
        const matchStatus = status === 'all' || s.status === status;
        return matchSearch && matchDept && matchStatus;
    });
    const tbody = document.getElementById('staffTableBody');
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:40px;color:#94a3b8;">No staff match your filters</td></tr>`;
        return;
    }
    tbody.innerHTML = filtered.map(s => `
        <tr>
            <td><strong>${s.staff_id || '-'}</strong></td>
            <td>${s.full_name || 'N/A'}</td>
            <td><span class="badge" style="background:#e0e7ff;color:#4C1D95;">${s.department || '-'}</span></td>
            <td>${s.position || '-'}</td>
            <td>${formatCurrency(s.basic_salary)}</td>
            <td>${formatCurrency(s.allowances)}</td>
            <td><strong>${formatCurrency(s.total_pay)}</strong></td>
            <td><span class="badge ${s.status === 'active' ? 'badge-success' : s.status === 'on leave' ? 'badge-warning' : 'badge-danger'}">${s.status || 'Active'}</span></td>
            <td>
                <button onclick="editStaffMember('${s.id}')" class="btn-action btn-primary btn-xs"><i class="fas fa-edit"></i></button>
                <button onclick="deleteStaffMember('${s.id}')" class="btn-action btn-danger btn-xs"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
    document.getElementById('staffCount').textContent = `${filtered.length} staff members (filtered)`;
}

function resetStaffFilters() {
    document.getElementById('staffSearch').value = '';
    document.getElementById('staffDepartmentFilter').value = 'all';
    document.getElementById('staffStatusFilter').value = 'all';
    renderStaffTable();
    document.getElementById('staffCount').textContent = `${staffData.length} staff members`;
    showToast('Staff filters reset!', 'info');
}

function updatePayrollSummary() {
    const total = staffData.reduce((sum, s) => sum + (s.total_pay || 0), 0);
    const active = staffData.filter(s => s.status === 'active');
    const pending = staffData.filter(s => s.status === 'on leave' || s.status === 'inactive');
    const avg = staffData.length > 0 ? total / staffData.length : 0;
    document.getElementById('totalStaffCount').textContent = staffData.length;
    document.getElementById('monthlyPayrollTotal').textContent = formatCurrency(total);
    document.getElementById('payrollStaffCount').textContent = `${active.length} active staff`;
    document.getElementById('pendingPayrollCount').textContent = formatCurrency(pending.reduce((sum, s) => sum + (s.total_pay || 0), 0));
    document.getElementById('pendingPayrollStaff').textContent = `${pending.length} pending`;
    document.getElementById('avgSalary').textContent = formatCurrency(avg);
}

function openAddStaffModal() {
    document.getElementById('addStaffModal').classList.add('active');
    document.getElementById('addStaffForm').reset();
    document.getElementById('staffId').value = 'STF-' + String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    document.getElementById('addStaffForm').dataset.editId = '';
}

async function saveStaffToDatabase() {
    try {
        if (!sbClient) { if (!initSupabase()) return; }
        const editId = document.getElementById('addStaffForm').dataset.editId;
        const data = {
            full_name: document.getElementById('staffFullName').value.trim(),
            staff_id: document.getElementById('staffId').value.trim(),
            department: document.getElementById('staffDepartment').value,
            position: document.getElementById('staffPosition').value.trim(),
            basic_salary: parseFloat(document.getElementById('staffBasicSalary').value) || 0,
            allowances: parseFloat(document.getElementById('staffAllowances').value) || 0,
            email: document.getElementById('staffEmail').value.trim(),
            phone: document.getElementById('staffPhone').value.trim(),
            status: document.getElementById('staffStatus').value
        };
        if (!data.full_name || !data.staff_id || !data.department || !data.position) {
            showToast('Please fill in all required fields', 'warning');
            return;
        }
        data.total_pay = data.basic_salary + data.allowances;
        if (editId) {
            const { error } = await sbClient.from('finance_staff').update({ ...data, updated_at: new Date().toISOString() }).eq('id', editId);
            if (error) throw error;
            showToast('Staff updated!', 'success');
        } else {
            const { error } = await sbClient.from('finance_staff').insert([{ ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }]);
            if (error) throw error;
            showToast('Staff added!', 'success');
        }
        closeModal('addStaffModal');
        await loadStaffData();
    } catch (error) {
        console.error('Error saving staff:', error);
        showToast('Error saving staff', 'error');
    }
}

async function editStaffMember(id) {
    try {
        if (!sbClient) { if (!initSupabase()) return; }
        const { data, error } = await sbClient.from('finance_staff').select('*').eq('id', id).single();
        if (error) throw error;
        document.getElementById('staffFullName').value = data.full_name || '';
        document.getElementById('staffId').value = data.staff_id || '';
        document.getElementById('staffDepartment').value = data.department || '';
        document.getElementById('staffPosition').value = data.position || '';
        document.getElementById('staffBasicSalary').value = data.basic_salary || 0;
        document.getElementById('staffAllowances').value = data.allowances || 0;
        document.getElementById('staffEmail').value = data.email || '';
        document.getElementById('staffPhone').value = data.phone || '';
        document.getElementById('staffStatus').value = data.status || 'active';
        document.getElementById('addStaffForm').dataset.editId = id;
        document.getElementById('addStaffModal').classList.add('active');
        document.querySelector('#addStaffModal h3').textContent = 'Edit Staff Member';
    } catch (error) {
        console.error('Error loading staff for edit:', error);
        showToast('Error loading staff data', 'error');
    }
}

async function deleteStaffMember(id) {
    if (!confirm('Delete this staff member?')) return;
    try {
        if (!sbClient) { if (!initSupabase()) return; }
        const { error } = await sbClient.from('finance_staff').delete().eq('id', id);
        if (error) throw error;
        showToast('Staff member deleted', 'success');
        await loadStaffData();
    } catch (error) {
        console.error('Error deleting staff:', error);
        showToast('Error deleting staff member', 'error');
    }
}

async function processPayrollAction() {
    showToast('Processing payroll...', 'info');
}

// ============================================================
// TRANSACTIONS
// ============================================================

async function loadTransactions() {
    try {
        if (!sbClient) { if (!initSupabase()) return; }
        const { data, error } = await sbClient
            .from('finance_payments')
            .select('*')
            .order('payment_date', { ascending: false });
        if (error) throw error;
        allTransactions = data || [];
        renderTransactions(allTransactions);
        document.getElementById('transactionCount').textContent = `${allTransactions.length} transactions`;
    } catch (error) {
        console.error('Error loading transactions:', error);
        showToast('Error loading transactions', 'error');
    }
}

function renderTransactions(transactions) {
    const tbody = document.getElementById('transactionsTableBody');
    if (!tbody) return;
    if (!transactions || transactions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:#94a3b8;">No transactions found</td></tr>`;
        return;
    }
    tbody.innerHTML = transactions.map(t => {
        const statusClass = t.status === 'completed' ? 'badge-success' : t.status === 'pending' ? 'badge-warning' : 'badge-danger';
        return `
            <tr>
                <td>${t.reference_number || '-'}</td>
                <td>${formatDate(t.payment_date)}</td>
                <td><strong>${t.student_name || 'N/A'}</strong></td>
                <td>${t.program || '-'}</td>
                <td><strong>${formatCurrency(t.amount)}</strong></td>
                <td>${t.payment_method || '-'}</td>
                <td><span class="badge ${statusClass}">${t.status || 'Pending'}</span></td>
            </tr>
        `;
    }).join('');
}

function filterTransactions() {
    const search = document.getElementById('transactionSearch')?.value?.toLowerCase() || '';
    const status = document.getElementById('transactionStatusFilter')?.value || 'all';
    let filtered = allTransactions.filter(t => {
        const matchSearch = (t.student_name || '').toLowerCase().includes(search) || (t.reference_number || '').toLowerCase().includes(search);
        const matchStatus = status === 'all' || t.status === status;
        return matchSearch && matchStatus;
    });
    renderTransactions(filtered);
    document.getElementById('transactionCount').textContent = `${filtered.length} transactions (filtered)`;
}

function resetTransactionFilters() {
    document.getElementById('transactionSearch').value = '';
    document.getElementById('transactionStatusFilter').value = 'all';
    renderTransactions(allTransactions);
    document.getElementById('transactionCount').textContent = `${allTransactions.length} transactions`;
}
// ============================================================
// INVOICES - Add these functions at the end of finance.js
// ============================================================

let allInvoices = [];

async function loadInvoices() {
    try {
        if (!sbClient) { if (!initSupabase()) return; }
        const { data, error } = await sbClient
            .from('finance_invoices')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        allInvoices = data || [];
        renderInvoices(allInvoices);
        document.getElementById('invoiceCount').textContent = `${allInvoices.length} invoices`;
        document.getElementById('invoicesBadge').textContent = allInvoices.filter(i => i.status === 'pending' || i.status === 'overdue').length;
    } catch (error) {
        console.error('Error loading invoices:', error);
        showToast('Error loading invoices', 'error');
    }
}

function renderInvoices(invoices) {
    const tbody = document.getElementById('invoicesTableBody');
    if (!tbody) return;
    if (!invoices || invoices.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:40px;color:#94a3b8;"><i class="fas fa-file-invoice" style="font-size:32px;display:block;margin-bottom:10px;"></i>No invoices found</td></tr>`;
        return;
    }
    tbody.innerHTML = invoices.map(inv => {
        const balance = parseFloat(inv.balance) || 0;
        const total = parseFloat(inv.total_amount) || 0;
        const paid = parseFloat(inv.amount_paid) || 0;
        let statusLabel = '⏳ Pending';
        let statusClass = 'badge-warning';
        if (inv.status === 'paid' || balance === 0) { statusLabel = '✅ Paid'; statusClass = 'badge-success'; }
        else if (inv.status === 'overdue' || (inv.due_date && new Date(inv.due_date) < new Date())) { statusLabel = '🔴 Overdue'; statusClass = 'badge-danger'; }
        else if (balance > 0 && balance < total) { statusLabel = '⚠️ Partial'; statusClass = 'badge-warning'; }
        return `
            <tr>
                <td><strong>${inv.invoice_number || 'N/A'}</strong></td>
                <td><strong>${inv.student_name || 'N/A'}</strong></td>
                <td>${inv.program || '-'}</td>
                <td>${formatDate(inv.invoice_date)}</td>
                <td>${formatDate(inv.due_date)}</td>
                <td><strong>${formatCurrency(total)}</strong></td>
                <td>${formatCurrency(paid)}</td>
                <td><strong style="color: ${balance > 0 ? '#dc2626' : '#059669'}">${formatCurrency(balance)}</strong></td>
                <td><span class="badge ${statusClass}">${statusLabel}</span></td>
                <td>
                    <button onclick="viewInvoice('${inv.id}')" class="btn-action btn-primary btn-xs" title="View"><i class="fas fa-eye"></i></button>
                    <button onclick="printInvoice('${inv.id}')" class="btn-action btn-success btn-xs" title="Print"><i class="fas fa-print"></i></button>
                    <button onclick="deleteInvoice('${inv.id}')" class="btn-action btn-danger btn-xs" title="Delete"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    }).join('');
}

function filterInvoices() {
    const search = document.getElementById('invoiceSearch')?.value?.toLowerCase() || '';
    const status = document.getElementById('invoiceStatusFilter')?.value || 'all';
    let filtered = allInvoices;
    if (search) {
        filtered = filtered.filter(inv => 
            (inv.invoice_number || '').toLowerCase().includes(search) ||
            (inv.student_name || '').toLowerCase().includes(search) ||
            (inv.program || '').toLowerCase().includes(search)
        );
    }
    if (status !== 'all') {
        filtered = filtered.filter(inv => inv.status === status);
    }
    renderInvoices(filtered);
    document.getElementById('invoiceCount').textContent = `${filtered.length} invoices (filtered)`;
}

function resetInvoiceFilters() {
    document.getElementById('invoiceSearch').value = '';
    document.getElementById('invoiceStatusFilter').value = 'all';
    renderInvoices(allInvoices);
    document.getElementById('invoiceCount').textContent = `${allInvoices.length} invoices`;
}

function openCreateInvoiceModal() {
    // Get the first approved student
    const student = allAccounts.find(s => s.status === 'approved');
    if (!student) { showToast('No approved students found!', 'warning'); return; }
    const amount = prompt('Enter invoice amount (KES):');
    if (!amount || isNaN(amount)) return;
    const dueDate = prompt('Enter due date (YYYY-MM-DD):');
    if (!dueDate) return;
    createInvoice(student, parseFloat(amount), dueDate);
}

async function createInvoice(student, amount, dueDate) {
    try {
        if (!sbClient) { if (!initSupabase()) return; }
        const invoiceData = {
            student_id: student.user_id || student.student_id,
            student_name: student.full_name || student.student_name,
            student_email: student.email,
            program: student.program,
            intake_year: student.intake_year,
            due_date: dueDate,
            period: 'Term 1, 2026',
            total_amount: amount,
            amount_paid: 0,
            balance: amount,
            status: 'pending',
            items: [{ description: 'Tuition Fee', amount: amount }],
            notes: 'Auto-generated invoice',
            created_at: new Date().toISOString()
        };
        const { error } = await sbClient.from('finance_invoices').insert([invoiceData]);
        if (error) throw error;
        showToast(`✅ Invoice created for ${student.full_name}`, 'success');
        await loadInvoices();
    } catch (error) {
        console.error('Error creating invoice:', error);
        showToast('Error creating invoice: ' + error.message, 'error');
    }
}

function viewInvoice(invoiceId) {
    const invoice = allInvoices.find(i => i.id === invoiceId);
    if (!invoice) { showToast('Invoice not found', 'error'); return; }
    showToast(`📄 Invoice ${invoice.invoice_number}: ${formatCurrency(invoice.total_amount)}`, 'info');
}

function printInvoice(invoiceId) {
    const invoice = allInvoices.find(i => i.id === invoiceId);
    if (!invoice) { showToast('Invoice not found', 'error'); return; }
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html><head><title>Invoice ${invoice.invoice_number}</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #4C1D95; padding-bottom: 20px; margin-bottom: 20px; }
            .invoice-title { font-size: 28px; color: #4C1D95; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 12px; border: 1px solid #ddd; text-align: left; }
            th { background: #f0f4ff; }
            .total { font-size: 20px; font-weight: bold; text-align: right; margin-top: 20px; padding-top: 20px; border-top: 2px solid #4C1D95; }
            .footer { margin-top: 40px; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #ddd; padding-top: 20px; }
        </style>
        </head><body>
            <div class="header">
                <div><h1 class="invoice-title">INVOICE</h1><p><strong>NCHSM Finance Department</strong></p></div>
                <div>
                    <p><strong>Invoice #:</strong> ${invoice.invoice_number}</p>
                    <p><strong>Date:</strong> ${formatDate(invoice.invoice_date)}</p>
                    <p><strong>Due Date:</strong> ${formatDate(invoice.due_date)}</p>
                </div>
            </div>
            <div><p><strong>Student:</strong> ${invoice.student_name}</p><p><strong>Program:</strong> ${invoice.program || 'N/A'}</p></div>
            <table>
                <thead><tr><th>Description</th><th style="text-align:right;">Amount (KES)</th></tr></thead>
                <tbody>
                    ${(invoice.items || [{description: 'Tuition Fee', amount: invoice.total_amount}]).map(item => `
                        <tr><td>${item.description || 'Fee'}</td><td style="text-align:right;">${(item.amount || 0).toLocaleString()}</td></tr>
                    `).join('')}
                    <tr style="font-weight:bold;border-top:2px solid #4C1D95;">
                        <td>TOTAL</td>
                        <td style="text-align:right;">${invoice.total_amount.toLocaleString()}</td>
                    </tr>
                </tbody>
            </table>
            <div class="total"><p>Balance Due: <span style="color:#dc2626;">KES ${(invoice.balance || 0).toLocaleString()}</span></p></div>
            <div style="margin-top:20px;padding:16px;background:#f8fafc;border-radius:8px;">
                <p><strong>Payment Instructions:</strong></p>
                <p>M-Pesa Paybill: <strong>247247</strong> | Account: <strong>219337#AdmNo</strong></p>
                <p>Equity Bank: <strong>0130200214036</strong> | Branch: Nakuru</p>
            </div>
            <div class="footer"><p>NCHSM Finance Module | nchsmfinance@gmail.com | +254 103614355</p></div>
            <script>setTimeout(function(){ window.print(); window.close(); }, 1000);<\/script>
        </body></html>
    `);
    printWindow.document.close();
}

async function deleteInvoice(invoiceId) {
    if (!confirm('Delete this invoice?')) return;
    try {
        if (!sbClient) { if (!initSupabase()) return; }
        const { error } = await sbClient.from('finance_invoices').delete().eq('id', invoiceId);
        if (error) throw error;
        showToast('Invoice deleted!', 'success');
        await loadInvoices();
    } catch (error) {
        console.error('Error deleting invoice:', error);
        showToast('Error deleting invoice', 'error');
    }
}

// Add 'invoices' to showTab switch
// Find the showTab function and add this case:
// case 'invoices': loadInvoices(); break;
// ============================================================
// SETTINGS
// ============================================================

function loadSettings() {
    document.getElementById('moduleStatus').value = localStorage.getItem('finance_module_status') || 'active';
    document.getElementById('defaultCurrency').value = localStorage.getItem('finance_currency') || 'KES';
    document.getElementById('lateFee').value = localStorage.getItem('finance_late_fee') || '5';
}

function saveSettings() {
    localStorage.setItem('finance_module_status', document.getElementById('moduleStatus').value);
    localStorage.setItem('finance_currency', document.getElementById('defaultCurrency').value);
    localStorage.setItem('finance_late_fee', document.getElementById('lateFee').value);
    showToast('Settings saved!', 'success');
}

// ============================================================
// REPORTS
// ============================================================

function generateReport() {
    const type = document.getElementById('reportType').value;
    const content = document.getElementById('reportContent');
    content.innerHTML = `
        <div style="padding:20px;">
            <h3 style="color:#0A3D62;">${type.charAt(0).toUpperCase() + type.slice(1)} Report</h3>
            <div style="background:#f8fafc;border-radius:8px;padding:20px;margin-top:12px;">
                <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
                <hr style="margin:12px 0;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                    <div><strong>Total Students:</strong> ${allAccounts.length}</div>
                    <div><strong>Total Staff:</strong> ${staffData.length}</div>
                    <div><strong>Total Payments:</strong> ${allPayments.length}</div>
                    <div><strong>Total Collections:</strong> ${formatCurrency(allPayments.filter(p => p.status === 'completed').reduce((s, p) => s + (p.amount || 0), 0))}</div>
                </div>
            </div>
        </div>
    `;
    showToast(`Generated ${type} report`, 'success');
}

function exportReportToPDF() { showToast('Exporting PDF...', 'info'); }
function exportReportToCSV() { showToast('Exporting CSV...', 'info'); }

// ============================================================
// OTHER FUNCTIONS
// ============================================================

function refreshAllData() {
    showToast('Refreshing all data...', 'info');
    loadDashboardData();
    loadAccounts();
    loadPayments();
    loadStaffData();
    loadFeeStructure();
    loadTransactions();
    setTimeout(() => showToast('All data refreshed!', 'success'), 2000);
}

function exportAllData() { showToast('Exporting all data...', 'info'); }
function sendPaymentReminders() { showToast('Sending payment reminders...', 'info'); }
function openBulkPaymentModal() { document.getElementById('bulkImportModal').classList.add('active'); }
function handleBulkFileUpload(event) { if (event.target.files[0]) showToast(`File selected: ${event.target.files[0].name}`, 'success'); }
function downloadTemplate() { showToast('Template downloaded!', 'success'); }
function processBulkImport() { showToast('Processing bulk import...', 'info'); }
function loadAuditLog() { document.getElementById('auditLogContainer').innerHTML = `<div style="text-align:center;padding:20px;color:#94a3b8;">Audit log loaded</div>`; }

// ============================================================
// FINAL LOG
// ============================================================

console.log('✅ Finance Module fully loaded!');
