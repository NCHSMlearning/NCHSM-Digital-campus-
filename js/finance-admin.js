/**
 * FINANCE MODULE - SUPER ADMIN FUNCTIONS
 * All functions specific to Super Admin role
 * Updated with Staff Payroll management
 */

// ============================================================
// ADMIN DASHBOARD
// ============================================================

/**
 * Load admin dashboard data
 */
async function loadAdminDashboard() {
    try {
        console.log('📊 Loading admin dashboard...');
        
        // Load stats from Supabase
        await loadAdminStats();
        
        // Load recent transactions
        await loadAdminRecentTransactions();
        
        // Load charts
        await loadAdminCharts();
        
        // Load payroll summary
        await loadAdminPayrollSummary();
        
        return true;
    } catch (error) {
        console.error('Error loading admin dashboard:', error);
        showToast('Error loading dashboard data', 'error');
        return false;
    }
}

/**
 * Load admin stats from Supabase
 */
async function loadAdminStats() {
    try {
        if (!window.supabase) {
            console.warn('⚠️ Supabase not available');
            return;
        }
        
        const supabase = window.supabase;
        
        // Get total students
        const { count: totalStudents, error: countError } = await supabase
            .from('consolidated_user_profiles_table')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'student');
        
        if (!countError) {
            document.getElementById('totalStudents').textContent = totalStudents || 0;
            document.getElementById('accountsBadge').textContent = totalStudents || 0;
        }
        
        // Get total collected from payments
        const { data: payments, error: paymentsError } = await supabase
            .from('finance_payments')
            .select('amount')
            .eq('status', 'completed');
        
        if (!paymentsError && payments) {
            const totalCollected = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
            document.getElementById('totalCollected').textContent = formatCurrency(totalCollected);
        }
        
        // Get outstanding balance from student accounts
        const { data: accounts, error: accountsError } = await supabase
            .from('finance_student_accounts')
            .select('balance')
            .gt('balance', 0);
        
        if (!accountsError && accounts) {
            const outstanding = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);
            document.getElementById('outstandingBalance').textContent = formatCurrency(outstanding);
            document.getElementById('overdueAccounts').textContent = accounts.length || 0;
            document.getElementById('dashboardBadge').textContent = accounts.length || 0;
        }
        
        // Get today's payments
        const today = new Date().toISOString().split('T')[0];
        const { data: todayPayments, error: todayError } = await supabase
            .from('finance_payments')
            .select('amount')
            .eq('payment_date', today)
            .eq('status', 'completed');
        
        if (!todayError && todayPayments) {
            const todayTotal = todayPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
            document.getElementById('todayPayments').textContent = formatCurrency(todayTotal);
        }
        
        // Get total transactions
        const { count: totalTransactions, error: transError } = await supabase
            .from('finance_transactions')
            .select('*', { count: 'exact', head: true });
        
        if (!transError) {
            document.getElementById('totalTransactions').textContent = totalTransactions || 0;
        }
        
        // Get staff count
        const { count: totalStaff, error: staffError } = await supabase
            .from('finance_staff')
            .select('*', { count: 'exact', head: true });
        
        if (!staffError) {
            // Update staff count in UI if element exists
            const staffCountEl = document.getElementById('totalStaffCount');
            if (staffCountEl) staffCountEl.textContent = totalStaff || 0;
        }
        
    } catch (error) {
        console.error('Error loading admin stats:', error);
    }
}

/**
 * Load admin payroll summary
 */
async function loadAdminPayrollSummary() {
    try {
        if (!window.supabase) return;
        
        const supabase = window.supabase;
        const currentMonth = new Date().toISOString().slice(0, 7);
        
        // Get active staff count
        const { count: activeStaff, error: activeError } = await supabase
            .from('finance_staff')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active');
        
        if (!activeError && activeStaff !== null) {
            const el = document.getElementById('payrollStaffCount');
            if (el) el.textContent = `${activeStaff} active staff`;
        }
        
        // Get current month payroll total
        const { data: payrollData, error: payrollError } = await supabase
            .from('finance_payroll_records')
            .select('total_pay')
            .eq('period', currentMonth)
            .eq('status', 'approved');
        
        if (!payrollError && payrollData) {
            const total = payrollData.reduce((sum, p) => sum + (p.total_pay || 0), 0);
            const el = document.getElementById('monthlyPayrollTotal');
            if (el) el.textContent = formatCurrency(total);
        }
        
        // Get pending payroll
        const { data: pendingData, error: pendingError } = await supabase
            .from('finance_payroll_records')
            .select('total_pay')
            .eq('status', 'pending');
        
        if (!pendingError && pendingData) {
            const total = pendingData.reduce((sum, p) => sum + (p.total_pay || 0), 0);
            const el = document.getElementById('pendingPayrollCount');
            if (el) el.textContent = formatCurrency(total);
            const countEl = document.getElementById('pendingPayrollStaff');
            if (countEl) countEl.textContent = `${pendingData.length} pending`;
        }
        
        // Get average salary
        const { data: staffData, error: avgError } = await supabase
            .from('finance_staff')
            .select('total_pay')
            .eq('status', 'active');
        
        if (!avgError && staffData && staffData.length > 0) {
            const avg = staffData.reduce((sum, s) => sum + (s.total_pay || 0), 0) / staffData.length;
            const el = document.getElementById('avgSalary');
            if (el) el.textContent = formatCurrency(avg);
        }
        
    } catch (error) {
        console.error('Error loading payroll summary:', error);
    }
}

/**
 * Load admin recent transactions
 */
async function loadAdminRecentTransactions() {
    try {
        if (!window.supabase) return;
        
        const { data: transactions, error } = await window.supabase
            .from('finance_payments')
            .select('*')
            .order('payment_date', { ascending: false })
            .limit(10);
        
        if (error) throw error;
        
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
            const statusColors = {
                completed: 'background:#d1fae5; color:#059669;',
                pending: 'background:#fef3c7; color:#d97706;',
                failed: 'background:#fee2e2; color:#dc2626;'
            };
            return `
                <tr>
                    <td>${formatDate(t.payment_date)}</td>
                    <td><strong>${t.student_name || 'N/A'}</strong></td>
                    <td>${t.program || '-'}</td>
                    <td><strong>${formatCurrency(t.amount)}</strong></td>
                    <td>${t.payment_method || '-'}</td>
                    <td>
                        <span style="display:inline-block;padding:4px 12px;border-radius:12px;font-size:11px;font-weight:600;${statusColors[t.status] || statusColors.pending}">
                            ${t.status ? t.status.charAt(0).toUpperCase() + t.status.slice(1) : 'Pending'}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading recent transactions:', error);
    }
}

/**
 * Load admin charts
 */
async function loadAdminCharts() {
    try {
        if (!window.supabase) return;
        
        // Get monthly data
        const { data: monthlyData, error: monthlyError } = await window.supabase
            .from('finance_payments')
            .select('payment_date, amount')
            .eq('status', 'completed')
            .order('payment_date', { ascending: true });
        
        // Process monthly data
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthlyTotals = new Array(12).fill(0);
        
        if (!monthlyError && monthlyData) {
            monthlyData.forEach(p => {
                if (p.payment_date) {
                    const date = new Date(p.payment_date);
                    const month = date.getMonth();
                    monthlyTotals[month] += p.amount || 0;
                }
            });
        }
        
        // Update monthly chart
        const monthlyCtx = document.getElementById('monthlyCollectionsChart');
        if (monthlyCtx) {
            if (window.monthlyChart) window.monthlyChart.destroy();
            
            window.monthlyChart = new Chart(monthlyCtx, {
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
        const { data: statusData, error: statusError } = await window.supabase
            .from('finance_payments')
            .select('status');
        
        if (!statusError && statusData) {
            const statusCounts = {
                completed: 0,
                pending: 0,
                failed: 0,
                refunded: 0
            };
            
            statusData.forEach(p => {
                if (statusCounts[p.status] !== undefined) {
                    statusCounts[p.status]++;
                }
            });
            
            const statusCtx = document.getElementById('paymentStatusChart');
            if (statusCtx) {
                if (window.statusChart) window.statusChart.destroy();
                
                window.statusChart = new Chart(statusCtx, {
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
        
    } catch (error) {
        console.error('Error loading charts:', error);
    }
}

// ============================================================
// ADMIN STUDENT MANAGEMENT
// ============================================================

/**
 * Load all students with account info from Supabase
 */
async function loadAllStudentAccounts() {
    try {
        console.log('📊 Loading student accounts...');
        showToast('Loading accounts...', 'info');
        
        if (!window.supabase) {
            console.warn('⚠️ Supabase not available');
            return;
        }
        
        // Get all student accounts with user data
        const { data: accounts, error } = await window.supabase
            .from('finance_student_accounts')
            .select(`
                student_id,
                student_name,
                student_email,
                program,
                intake_year,
                current_block,
                total_fees_due,
                total_paid,
                balance,
                outstanding,
                payment_status,
                last_payment_date
            `)
            .order('student_name', { ascending: true });
        
        if (error) {
            console.error('❌ Error loading accounts:', error);
            showToast('Error loading accounts', 'error');
            return;
        }
        
        renderAdminStudentAccounts(accounts || []);
        showToast('Accounts loaded!', 'success');
        
    } catch (error) {
        console.error('❌ Error loading accounts:', error);
        showToast('Error loading accounts', 'error');
    }
}

/**
 * Render admin student accounts
 */
function renderAdminStudentAccounts(accounts) {
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
                <td>${formatCurrency(acc.total_fees_due || 0)}</td>
                <td>${formatCurrency(acc.total_paid || 0)}</td>
                <td><strong>${formatCurrency(balance)}</strong></td>
                <td><span class="finance-badge ${statusClass}">${statusLabel}</span></td>
                <td>
                    <button onclick="adminViewStudent('${acc.student_id}')" class="finance-btn finance-btn-primary finance-btn-sm">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="adminEditStudent('${acc.student_id}')" class="finance-btn finance-btn-outline finance-btn-sm">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Admin view student
 */
function adminViewStudent(studentId) {
    const modal = document.getElementById('studentAccountModal');
    if (!modal) return;
    
    modal.classList.add('active');
    document.getElementById('studentAccountBody').innerHTML = `
        <div class="finance-loading">
            <div class="spinner"></div>
            <span>Loading student details...</span>
        </div>
    `;
    
    // Load student data
    setTimeout(async () => {
        try {
            if (!window.supabase) return;
            
            const { data: account, error } = await window.supabase
                .from('finance_student_accounts')
                .select('*')
                .eq('student_id', studentId)
                .single();
            
            if (error) throw error;
            
            document.getElementById('studentAccountBody').innerHTML = `
                <div style="padding: 10px 0;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h4 style="color: #0A3D62; margin: 0;">Student Details</h4>
                        <span class="finance-badge finance-badge-info">ID: ${studentId}</span>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; padding: 16px; border-radius: 8px;">
                        <div><strong>Name:</strong> ${account.student_name || 'N/A'}</div>
                        <div><strong>Student ID:</strong> ${account.student_id || '-'}</div>
                        <div><strong>Program:</strong> ${account.program || '-'}</div>
                        <div><strong>Intake:</strong> ${account.intake_year || '-'}</div>
                        <div><strong>Total Due:</strong> ${formatCurrency(account.total_fees_due || 0)}</div>
                        <div><strong>Total Paid:</strong> ${formatCurrency(account.total_paid || 0)}</div>
                        <div><strong>Balance:</strong> ${formatCurrency(account.balance || 0)}</div>
                        <div><strong>Status:</strong> <span class="finance-badge ${account.balance === 0 ? 'finance-badge-success' : 'finance-badge-warning'}">${account.payment_status || 'N/A'}</span></div>
                    </div>
                    <hr style="margin: 15px 0;">
                    <div style="margin-top: 15px; display: flex; gap: 10px;">
                        <button onclick="adminGenerateStatement('${studentId}')" class="finance-btn finance-btn-primary">
                            <i class="fas fa-file-invoice"></i> Generate Statement
                        </button>
                        <button onclick="adminSendReminder('${studentId}')" class="finance-btn finance-btn-warning">
                            <i class="fas fa-bell"></i> Send Reminder
                        </button>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error loading student details:', error);
            document.getElementById('studentAccountBody').innerHTML = `
                <div style="padding: 20px; text-align: center; color: #dc2626;">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Error loading student details</p>
                </div>
            `;
        }
    }, 500);
}

// ============================================================
// ADMIN PAYMENT MANAGEMENT
// ============================================================

/**
 * Load all payments from Supabase
 */
async function loadAllPayments() {
    try {
        console.log('💳 Loading payments...');
        
        if (!window.supabase) {
            console.warn('⚠️ Supabase not available');
            return;
        }
        
        const { data: payments, error } = await window.supabase
            .from('finance_payments')
            .select('*')
            .order('payment_date', { ascending: false });
        
        if (error) throw error;
        
        renderAdminPayments(payments || []);
        
    } catch (error) {
        console.error('❌ Error loading payments:', error);
        showToast('Error loading payments', 'error');
    }
}

/**
 * Render admin payments
 */
function renderAdminPayments(payments) {
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
                    <button onclick="adminViewPayment('${p.id}')" class="finance-btn finance-btn-primary finance-btn-sm">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="adminDeletePayment('${p.id}')" class="finance-btn finance-btn-danger finance-btn-sm">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// ============================================================
// ADMIN STAFF MANAGEMENT (NEW)
// ============================================================

/**
 * Load all staff from Supabase
 */
async function loadAllStaff() {
    try {
        console.log('👔 Loading staff data...');
        showToast('Loading staff data...', 'info');
        
        if (!window.supabase) {
            console.warn('⚠️ Supabase not available');
            return;
        }
        
        const { data: staff, error } = await window.supabase
            .from('finance_staff')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        renderAdminStaff(staff || []);
        showToast('Staff data loaded!', 'success');
        
    } catch (error) {
        console.error('❌ Error loading staff:', error);
        showToast('Error loading staff data', 'error');
    }
}

/**
 * Render admin staff table
 */
function renderAdminStaff(staff) {
    const tbody = document.getElementById('staffTableBody');
    if (!tbody) return;
    
    if (!staff || staff.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 40px; color: #94a3b8;">
                    <i class="fas fa-info-circle"></i> No staff members found
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = staff.map(s => {
        const statusClass = s.status === 'active' ? 'finance-badge-success' :
                           s.status === 'on leave' ? 'finance-badge-warning' : 'finance-badge-danger';
        const statusLabel = s.status ? s.status.charAt(0).toUpperCase() + s.status.slice(1) : 'Active';
        
        return `
            <tr>
                <td><strong>${s.staff_id || '-'}</strong></td>
                <td>${s.full_name || 'N/A'}</td>
                <td>${s.department || '-'}</td>
                <td>${s.position || '-'}</td>
                <td>${formatCurrency(s.basic_salary || 0)}</td>
                <td>${formatCurrency(s.allowances || 0)}</td>
                <td><strong>${formatCurrency(s.total_pay || 0)}</strong></td>
                <td><span class="finance-badge ${statusClass}">${statusLabel}</span></td>
                <td>
                    <button onclick="adminEditStaff('${s.id}')" class="finance-btn finance-btn-primary finance-btn-sm">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="adminDeleteStaff('${s.id}')" class="finance-btn finance-btn-danger finance-btn-sm">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    // Update count
    const countEl = document.getElementById('staffCount');
    if (countEl) countEl.textContent = `${staff.length} staff members`;
}

/**
 * Admin add staff - opens modal
 */
function adminAddStaff() {
    const modal = document.getElementById('addStaffModal');
    if (!modal) return;
    
    // Reset form
    document.getElementById('addStaffForm').reset();
    document.getElementById('staffId').value = 'STF-' + String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    
    modal.classList.add('active');
}

/**
 * Admin edit staff
 */
async function adminEditStaff(id) {
    try {
        if (!window.supabase) return;
        
        const { data: staff, error } = await window.supabase
            .from('finance_staff')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        
        // Fill form
        document.getElementById('staffFullName').value = staff.full_name || '';
        document.getElementById('staffId').value = staff.staff_id || '';
        document.getElementById('staffDepartment').value = staff.department || '';
        document.getElementById('staffPosition').value = staff.position || '';
        document.getElementById('staffBasicSalary').value = staff.basic_salary || 0;
        document.getElementById('staffAllowances').value = staff.allowances || 0;
        document.getElementById('staffEmail').value = staff.email || '';
        document.getElementById('staffPhone').value = staff.phone || '';
        document.getElementById('staffStatus').value = staff.status || 'active';
        
        // Show modal
        const modal = document.getElementById('addStaffModal');
        if (modal) {
            modal.classList.add('active');
            document.getElementById('addStaffForm').dataset.editId = id;
        }
        
    } catch (error) {
        console.error('Error loading staff for edit:', error);
        showToast('Error loading staff data', 'error');
    }
}

/**
 * Admin delete staff
 */
async function adminDeleteStaff(id) {
    if (!confirm('Are you sure you want to delete this staff member? This action cannot be undone.')) return;
    
    try {
        if (!window.supabase) return;
        
        const { error } = await window.supabase
            .from('finance_staff')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        showToast('Staff member deleted successfully', 'success');
        await loadAllStaff();
        
    } catch (error) {
        console.error('Error deleting staff:', error);
        showToast('Error deleting staff member', 'error');
    }
}

/**
 * Save staff from modal
 */
async function adminSaveStaff() {
    try {
        const form = document.getElementById('addStaffForm');
        const editId = form.dataset.editId || null;
        
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
        
        // Validate
        if (!data.full_name || !data.staff_id || !data.department || !data.position) {
            showToast('Please fill in all required fields', 'warning');
            return;
        }
        
        if (!window.supabase) {
            showToast('Database connection not available', 'error');
            return;
        }
        
        if (editId) {
            // Update
            const { error } = await window.supabase
                .from('finance_staff')
                .update({
                    full_name: data.full_name,
                    staff_id: data.staff_id,
                    department: data.department,
                    position: data.position,
                    basic_salary: data.basic_salary,
                    allowances: data.allowances,
                    total_pay: data.basic_salary + data.allowances,
                    email: data.email || null,
                    phone: data.phone || null,
                    status: data.status,
                    updated_at: new Date().toISOString()
                })
                .eq('id', editId);
            
            if (error) throw error;
            showToast('Staff updated successfully', 'success');
        } else {
            // Add new
            const { error } = await window.supabase
                .from('finance_staff')
                .insert([{
                    full_name: data.full_name,
                    staff_id: data.staff_id,
                    department: data.department,
                    position: data.position,
                    basic_salary: data.basic_salary,
                    allowances: data.allowances,
                    total_pay: data.basic_salary + data.allowances,
                    email: data.email || null,
                    phone: data.phone || null,
                    status: data.status,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }]);
            
            if (error) throw error;
            showToast('Staff added successfully', 'success');
        }
        
        // Close modal and reload
        document.getElementById('addStaffModal').classList.remove('active');
        form.dataset.editId = '';
        await loadAllStaff();
        
    } catch (error) {
        console.error('Error saving staff:', error);
        showToast('Error saving staff data', 'error');
    }
}

// ============================================================
// ADMIN PAYROLL MANAGEMENT (NEW)
// ============================================================

/**
 * Load all payroll records
 */
async function loadAllPayroll() {
    try {
        console.log('💰 Loading payroll data...');
        
        if (!window.supabase) return;
        
        const { data: payroll, error } = await window.supabase
            .from('finance_payroll_records')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        renderAdminPayroll(payroll || []);
        
    } catch (error) {
        console.error('Error loading payroll:', error);
        showToast('Error loading payroll data', 'error');
    }
}

/**
 * Render admin payroll
 */
function renderAdminPayroll(payroll) {
    const tbody = document.getElementById('payrollTableBody');
    if (!tbody) return;
    
    if (!payroll || payroll.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: #94a3b8;">
                    <i class="fas fa-info-circle"></i> No payroll records found
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = payroll.map(p => {
        const statusClass = p.status === 'approved' ? 'finance-badge-success' :
                           p.status === 'pending' ? 'finance-badge-warning' : 'finance-badge-danger';
        const statusLabel = p.status ? p.status.charAt(0).toUpperCase() + p.status.slice(1) : 'Pending';
        
        return `
            <tr>
                <td>${p.staff_name || 'N/A'}</td>
                <td>${p.department || '-'}</td>
                <td>${p.position || '-'}</td>
                <td>${p.period || '-'}</td>
                <td>${formatCurrency(p.basic_salary || 0)}</td>
                <td>${formatCurrency(p.allowances || 0)}</td>
                <td><strong>${formatCurrency(p.total_pay || 0)}</strong></td>
                <td><span class="finance-badge ${statusClass}">${statusLabel}</span></td>
            </tr>
        `;
    }).join('');
}

/**
 * Process payroll for current month
 */
async function adminProcessPayroll() {
    try {
        if (!confirm('Process payroll for all active staff for this month?')) return;
        
        showToast('Processing payroll...', 'info');
        
        if (!window.supabase) {
            showToast('Database connection not available', 'error');
            return;
        }
        
        const currentMonth = new Date().toISOString().slice(0, 7);
        
        // Get active staff
        const { data: staff, error: staffError } = await window.supabase
            .from('finance_staff')
            .select('*')
            .eq('status', 'active');
        
        if (staffError) throw staffError;
        
        if (!staff || staff.length === 0) {
            showToast('No active staff found', 'warning');
            return;
        }
        
        // Check existing payroll
        const { data: existing, error: existingError } = await window.supabase
            .from('finance_payroll_records')
            .select('staff_id')
            .eq('period', currentMonth);
        
        if (existingError) throw existingError;
        
        const existingIds = new Set(existing?.map(p => p.staff_id) || []);
        const newRecords = staff
            .filter(s => !existingIds.has(s.id))
            .map(s => ({
                staff_id: s.id,
                staff_name: s.full_name,
                department: s.department,
                position: s.position,
                period: currentMonth,
                basic_salary: s.basic_salary || 0,
                allowances: s.allowances || 0,
                total_pay: (s.basic_salary || 0) + (s.allowances || 0),
                status: 'pending',
                notes: 'Auto-generated payroll',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }));
        
        if (newRecords.length === 0) {
            showToast('Payroll already processed for this month', 'info');
            return;
        }
        
        const { error: insertError } = await window.supabase
            .from('finance_payroll_records')
            .insert(newRecords);
        
        if (insertError) throw insertError;
        
        showToast(`Payroll processed for ${newRecords.length} staff members`, 'success');
        await loadAllPayroll();
        await loadAdminPayrollSummary();
        
    } catch (error) {
        console.error('Error processing payroll:', error);
        showToast('Error processing payroll', 'error');
    }
}

/**
 * Approve payroll record
 */
async function adminApprovePayroll(id) {
    try {
        if (!window.supabase) return;
        
        const { error } = await window.supabase
            .from('finance_payroll_records')
            .update({
                status: 'approved',
                approved_at: new Date().toISOString()
            })
            .eq('id', id);
        
        if (error) throw error;
        
        showToast('Payroll approved', 'success');
        await loadAllPayroll();
        await loadAdminPayrollSummary();
        
    } catch (error) {
        console.error('Error approving payroll:', error);
        showToast('Error approving payroll', 'error');
    }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function formatCurrency(amount) {
    return 'KES ' + (amount || 0).toLocaleString();
}

function formatDate(date) {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ============================================================
// EXPORT
// ============================================================
console.log('✅ Super Admin Functions loaded with Staff Payroll');
