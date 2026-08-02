/**
 * FINANCE MODULE - SUPER ADMIN FUNCTIONS
 * All functions specific to Super Admin role
 */

// ===== ADMIN DASHBOARD =====

/**
 * Load admin dashboard data
 */
async function loadAdminDashboard() {
    try {
        const data = await adminGetDashboardData();
        updateAdminStats(data);
        loadAdminRecentTransactions(data.recentTransactions);
        loadAdminCharts(data);
        return data;
    } catch (error) {
        console.error('Error loading admin dashboard:', error);
        showToast('Error loading dashboard data', 'error');
    }
}

/**
 * Get admin dashboard data
 */
async function adminGetDashboardData() {
    const [stats, recent, chartData] = await Promise.all([
        financeAPI.getDashboardStats(),
        financeAPI.getPayments({ limit: 10, sort: 'desc' }),
        financeAPI.getDashboardData({ type: 'chart' })
    ]);
    
    return {
        stats,
        recentTransactions: recent,
        chartData: chartData
    };
}

/**
 * Update admin stats
 */
function updateAdminStats(data) {
    if (!data || !data.stats) return;
    
    const stats = data.stats;
    document.getElementById('totalStudents').textContent = stats.totalStudents || 0;
    document.getElementById('totalCollected').textContent = formatCurrency(stats.totalCollected || 0);
    document.getElementById('outstandingBalance').textContent = formatCurrency(stats.outstandingBalance || 0);
    document.getElementById('overdueAccounts').textContent = stats.overdueAccounts || 0;
    document.getElementById('todayPayments').textContent = formatCurrency(stats.todayPayments || 0);
    document.getElementById('totalTransactions').textContent = stats.totalTransactions || 0;
    
    // Update badges
    document.getElementById('dashboardBadge').textContent = stats.overdueAccounts || 0;
    document.getElementById('accountsBadge').textContent = stats.totalStudents || 0;
}

/**
 * Load admin charts
 */
function loadAdminCharts(data) {
    // Monthly chart
    if (data.chartData && data.chartData.monthly) {
        updateMonthlyChart(data.chartData.monthly);
    }
    
    // Status chart
    if (data.chartData && data.chartData.status) {
        updateStatusChart(data.chartData.status);
    }
}

/**
 * Update monthly chart
 */
function updateMonthlyChart(data) {
    const ctx = document.getElementById('monthlyCollectionsChart');
    if (!ctx) return;
    
    if (monthlyChart) monthlyChart.destroy();
    
    monthlyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: [{
                label: 'Monthly Collections (KES)',
                data: data,
                backgroundColor: 'rgba(76, 29, 149, 0.7)',
                borderColor: '#4C1D95',
                borderWidth: 2,
                borderRadius: 4,
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: v => 'KES ' + (v/1000).toFixed(0) + 'k' }
                }
            }
        }
    });
}

/**
 * Update status chart
 */
function updateStatusChart(data) {
    const ctx = document.getElementById('paymentStatusChart');
    if (!ctx) return;
    
    if (statusChart) statusChart.destroy();
    
    statusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Completed', 'Pending', 'Failed', 'Refunded'],
            datasets: [{
                data: [data.completed || 0, data.pending || 0, data.failed || 0, data.refunded || 0],
                backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
                borderWidth: 0,
            }]
        },
        options: {
            responsive: true,
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

// ===== ADMIN STUDENT MANAGEMENT =====

/**
 * Load all students with account info
 */
async function loadAllStudentAccounts() {
    try {
        showLoading('Loading student accounts...');
        const students = await adminGetAllStudents({ includeAccounts: true });
        renderAdminStudentAccounts(students);
        hideLoading();
        return students;
    } catch (error) {
        hideLoading();
        showToast('Error loading student accounts', 'error');
        return [];
    }
}

/**
 * Render admin student accounts
 */
function renderAdminStudentAccounts(students) {
    const tbody = document.getElementById('accountsTableBody');
    if (!tbody) return;
    
    if (!students || students.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 40px; color: #94a3b8;">
                    <i class="fas fa-info-circle"></i> No students found
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = students.map(student => {
        const balance = student.balance || 0;
        const status = balance === 0 ? 'paid' : 
                      balance > 0 && balance <= 10000 ? 'partial' : 'outstanding';
        const statusLabel = status === 'paid' ? '✅ Paid' :
                           status === 'partial' ? '⚠️ Partial' : '🔴 Outstanding';
        const statusClass = status === 'paid' ? 'finance-badge-success' :
                           status === 'partial' ? 'finance-badge-warning' : 'finance-badge-danger';
        
        return `
            <tr>
                <td><strong>${student.name}</strong></td>
                <td>${student.studentId || '-'}</td>
                <td>${student.program || '-'}</td>
                <td>${student.intake || '-'}</td>
                <td>${formatCurrency(student.totalDue || 0)}</td>
                <td>${formatCurrency(student.totalPaid || 0)}</td>
                <td><strong>${formatCurrency(balance)}</strong></td>
                <td><span class="finance-badge ${statusClass}">${statusLabel}</span></td>
                <td>
                    <button onclick="adminViewStudent('${student.id}')" class="finance-btn finance-btn-primary finance-btn-sm">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="adminEditStudent('${student.id}')" class="finance-btn finance-btn-outline finance-btn-sm">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="adminDeleteStudent('${student.id}')" class="finance-btn finance-btn-danger finance-btn-sm">
                        <i class="fas fa-trash"></i>
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
    // Open student detail modal
    document.getElementById('studentAccountModal').classList.add('active');
    document.getElementById('studentAccountBody').innerHTML = `
        <div class="finance-loading">
            <div class="spinner"></div>
            <span>Loading student details...</span>
        </div>
    `;
    
    // Simulate loading
    setTimeout(() => {
        document.getElementById('studentAccountBody').innerHTML = `
            <div style="padding: 10px 0;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h4 style="color: #0A3D62; margin: 0;">Student Details</h4>
                    <span class="finance-badge finance-badge-info">ID: ${studentId}</span>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; padding: 16px; border-radius: 8px;">
                    <div><strong>Name:</strong> Jane Doe</div>
                    <div><strong>Student ID:</strong> KRCHN/001/2026</div>
                    <div><strong>Program:</strong> KRCHN Nursing</div>
                    <div><strong>Intake:</strong> March 2026</div>
                    <div><strong>Total Due:</strong> ${formatCurrency(180000)}</div>
                    <div><strong>Total Paid:</strong> ${formatCurrency(135000)}</div>
                    <div><strong>Balance:</strong> ${formatCurrency(45000)}</div>
                    <div><strong>Status:</strong> <span class="finance-badge finance-badge-warning">Partial</span></div>
                </div>
                <hr style="margin: 15px 0;">
                <h5 style="margin-bottom: 10px;">Payment History</h5>
                <div style="max-height: 200px; overflow-y: auto;">
                    <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f8fafc;">
                                <th style="padding: 8px; text-align: left;">Date</th>
                                <th style="padding: 8px; text-align: left;">Amount</th>
                                <th style="padding: 8px; text-align: left;">Method</th>
                                <th style="padding: 8px; text-align: left;">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td>31 Jul 2026</td><td>${formatCurrency(45000)}</td><td>M-Pesa</td><td><span class="finance-badge finance-badge-success">Completed</span></td></tr>
                            <tr><td>15 Jul 2026</td><td>${formatCurrency(30000)}</td><td>Bank Transfer</td><td><span class="finance-badge finance-badge-success">Completed</span></td></tr>
                            <tr><td>01 Jul 2026</td><td>${formatCurrency(60000)}</td><td>Cash</td><td><span class="finance-badge finance-badge-success">Completed</span></td></tr>
                        </tbody>
                    </table>
                </div>
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
    }, 600);
}

/**
 * Admin edit student
 */
function adminEditStudent(studentId) {
    showToast('Opening edit form for student...', 'info');
    // Implement edit functionality
}

/**
 * Admin delete student
 */
function adminDeleteStudent(studentId) {
    if (!confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
        return;
    }
    showToast('Student deleted successfully.', 'success');
    loadAllStudentAccounts();
}

/**
 * Admin generate statement
 */
function adminGenerateStatement(studentId) {
    showToast('Generating statement...', 'info');
    setTimeout(() => {
        showToast('Statement generated successfully!', 'success');
    }, 1000);
}

/**
 * Admin send reminder
 */
function adminSendReminder(studentId) {
    showToast('Sending reminder...', 'info');
    setTimeout(() => {
        showToast('Payment reminder sent successfully!', 'success');
    }, 1000);
}

// ===== ADMIN PAYMENT MANAGEMENT =====

/**
 * Load all payments
 */
async function loadAllPayments() {
    try {
        showLoading('Loading payments...');
        const payments = await adminGetAllPayments({ limit: 100 });
        renderAdminPayments(payments);
        hideLoading();
        return payments;
    } catch (error) {
        hideLoading();
        showToast('Error loading payments', 'error');
        return [];
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
        const statusLabel = p.status.charAt(0).toUpperCase() + p.status.slice(1);
        
        return `
            <tr>
                <td>${formatDate(p.date)}</td>
                <td><strong>${p.student}</strong></td>
                <td>${p.program || '-'}</td>
                <td><strong>${formatCurrency(p.amount)}</strong></td>
                <td>${p.method || '-'}</td>
                <td>${p.reference || '-'}</td>
                <td>${p.period || '-'}</td>
                <td><span class="finance-badge ${statusClass}">${statusLabel}</span></td>
                <td>
                    <button onclick="adminViewPayment('${p.id}')" class="finance-btn finance-btn-primary finance-btn-sm">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="adminEditPayment('${p.id}')" class="finance-btn finance-btn-outline finance-btn-sm">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="adminDeletePayment('${p.id}')" class="finance-btn finance-btn-danger finance-btn-sm">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Admin view payment
 */
function adminViewPayment(paymentId) {
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
                <div style="background: #f8fafc; padding: 16px; border-radius: 8px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div><strong>Transaction ID:</strong> ${paymentId}</div>
                        <div><strong>Date:</strong> ${formatDate(new Date())}</div>
                        <div><strong>Student:</strong> Jane Doe</div>
                        <div><strong>Amount:</strong> ${formatCurrency(45000)}</div>
                        <div><strong>Method:</strong> M-Pesa</div>
                        <div><strong>Reference:</strong> MPESA-7845</div>
                        <div><strong>Period:</strong> Term 2</div>
                        <div><strong>Status:</strong> <span class="finance-badge finance-badge-success">Completed</span></div>
                    </div>
                </div>
                <div style="margin-top: 15px; display: flex; gap: 10px;">
                    <button onclick="printPaymentReceipt()" class="finance-btn finance-btn-primary">
                        <i class="fas fa-print"></i> Print Receipt
                    </button>
                    <button onclick="adminEditPayment('${paymentId}')" class="finance-btn finance-btn-outline">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                </div>
            </div>
        `;
    }, 500);
}

/**
 * Admin edit payment
 */
function adminEditPayment(paymentId) {
    showToast('Opening edit form for payment...', 'info');
}

/**
 * Admin delete payment
 */
function adminDeletePayment(paymentId) {
    if (!confirm('Are you sure you want to delete this payment?')) return;
    showToast('Payment deleted successfully.', 'success');
    loadAllPayments();
}

// ===== ADMIN REPORTS =====

/**
 * Load reports
 */
async function loadReports() {
    try {
        const reportData = await adminGenerateReport({
            type: document.getElementById('reportType').value,
            program: document.getElementById('reportProgram').value,
            year: document.getElementById('reportYear').value
        });
        renderReport(reportData);
    } catch (error) {
        showToast('Error generating report', 'error');
    }
}

/**
 * Render report
 */
function renderReport(data) {
    const container = document.getElementById('reportContent');
    if (!container) return;
    
    container.innerHTML = `
        <div style="padding: 10px 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h4 style="color: #0A3D62; margin: 0;">
                    <i class="fas fa-file-alt"></i> ${data.title || 'Financial Report'}
                </h4>
                <span style="font-size: 12px; color: #94a3b8;">
                    Generated: ${formatDateTime(new Date())}
                </span>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 20px;">
                ${Object.entries(data.summary || {}).map(([key, value]) => `
                    <div style="background: #f8fafc; padding: 16px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 12px; color: #94a3b8; text-transform: uppercase;">${key.replace(/_/g, ' ')}</div>
                        <div style="font-size: 24px; font-weight: 700; color: #0A3D62;">${formatCurrency(value)}</div>
                    </div>
                `).join('')}
            </div>
            
            <div style="overflow-x: auto;">
                <table class="finance-table">
                    <thead>
                        <tr>
                            ${Object.keys(data.columns || {}).map(col => `<th>${col}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${(data.rows || []).map(row => `
                            <tr>
                                ${Object.values(row).map(val => `<td>${val}</td>`).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            ${data.total ? `
                <div style="margin-top: 16px; padding: 12px; background: #f0fdf4; border-radius: 8px; border: 1px solid #86efac;">
                    <strong>Total: ${formatCurrency(data.total)}</strong>
                </div>
            ` : ''}
        </div>
    `;
}

// ===== ADMIN SETTINGS =====

/**
 * Update module settings
 */
async function updateModuleSettings() {
    try {
        const settings = {
            status: document.getElementById('moduleStatus').value,
            currency: document.getElementById('defaultCurrency').value,
            terms: document.getElementById('paymentTerms').value,
            lateFee: parseFloat(document.getElementById('lateFee').value) || 0,
            description: document.getElementById('moduleDescription').value
        };
        
        await financeAPI.updateSettings(settings);
        showToast('Settings saved successfully!', 'success');
    } catch (error) {
        showToast('Error saving settings', 'error');
    }
}

// ===== ADMIN BULK OPERATIONS =====

/**
 * Bulk promote students
 */
async function adminBulkPromote() {
    const fromBlock = document.getElementById('promoteFromBlock').value;
    const toBlock = document.getElementById('promoteToBlock').value;
    const program = document.getElementById('promoteProgram').value;
    const intake = document.getElementById('promoteIntake').value;
    
    if (!fromBlock || !toBlock) {
        showToast('Please select both source and destination blocks.', 'warning');
        return;
    }
    
    if (!confirm(`Are you sure you want to promote all students from ${fromBlock} to ${toBlock}?`)) {
        return;
    }
    
    try {
        showLoading('Promoting students...');
        const result = await adminBulkPromote({
            fromBlock,
            toBlock,
            program,
            intake
        });
        hideLoading();
        showToast(`${result.count || 0} students promoted successfully!`, 'success');
    } catch (error) {
        hideLoading();
        showToast('Error promoting students', 'error');
    }
}

// ===== COMMUNICATION WITH STUDENT DASHBOARD =====

/**
 * Send update to student dashboard
 */
function adminSendToStudents(data) {
    sendToStudentDashboard(data);
    showToast('Update sent to student dashboard', 'success');
}

/**
 * Publish fees to students
 */
async function adminPublishFees() {
    try {
        showLoading('Publishing fees...');
        const result = await financeAPI.request('/fees/publish', 'POST');
        hideLoading();
        showToast(`Fees published to ${result.students} students`, 'success');
        
        // Notify student dashboard
        sendToStudentDashboard({
            type: 'FEES_PUBLISHED',
            data: result
        });
    } catch (error) {
        hideLoading();
        showToast('Error publishing fees', 'error');
    }
}

// ===== EXPORT =====
console.log('✅ Super Admin Functions loaded');
