// =====================================================
// NCHSM ACCOUNTS DASHBOARD - Complete Fee Management
// =====================================================

// Supabase Configuration
const SUPABASE_URL = 'https://lwhtjozfsmbyihenfunw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.sb = sb;

// Global Variables
let currentUser = null;
let allStudents = [];
let allPayments = [];
let feeStructure = {};

// =====================================================
// UTILITY FUNCTIONS
// =====================================================
function showAlert(message, type = 'success') {
    const alertDiv = document.getElementById('alertMessage');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i> ${message}`;
    alertDiv.style.display = 'flex';
    setTimeout(() => {
        alertDiv.style.display = 'none';
    }, 5000);
}

function formatCurrency(amount) {
    return `KES ${(amount || 0).toLocaleString()}`;
}

function getStatusBadge(balance, lastPaymentDate) {
    if (balance <= 0) return '<span class="badge badge-paid">✅ Paid in Full</span>';
    
    if (lastPaymentDate) {
        const daysSince = (new Date() - new Date(lastPaymentDate)) / (1000 * 3600 * 24);
        if (daysSince > 30) return '<span class="badge badge-overdue">⏰ Overdue</span>';
    }
    return '<span class="badge badge-partial">⚠️ Partial</span>';
}

// =====================================================
// LOAD FEE STRUCTURE
// =====================================================
async function loadFeeStructure() {
    const { data, error } = await sb.from('fee_structure').select('*');
    if (!error && data) {
        feeStructure = {};
        data.forEach(f => {
            feeStructure[`${f.program}_${f.block}`] = f.amount;
        });
    }
}

function getStudentFees(student) {
    const key = `${student.program}_${student.block || 'Introductory'}`;
    return feeStructure[key] || 45000; // Default 45,000 KES
}

// =====================================================
// LOAD STUDENTS
// =====================================================
async function loadStudents() {
    const { data, error } = await sb
        .from('consolidated_user_profiles_table')
        .select('user_id, full_name, email, program, intake_year, block, phone')
        .eq('role', 'student')
        .eq('status', 'approved')
        .order('full_name');
    
    if (error) {
        console.error('Error loading students:', error);
        return [];
    }
    return data || [];
}

// =====================================================
// LOAD PAYMENTS
// =====================================================
async function loadPayments() {
    const { data, error } = await sb
        .from('fee_payments')
        .select('*, recorded_by_user:recorded_by(full_name)')
        .order('payment_date', { ascending: false });
    
    if (error) {
        console.error('Error loading payments:', error);
        return [];
    }
    return data || [];
}

// =====================================================
// CALCULATE STUDENT BALANCE
// =====================================================
async function calculateStudentBalance(studentId) {
    const totalFees = 45000; // Default, will be refined
    const { data: payments } = await sb
        .from('fee_payments')
        .select('amount')
        .eq('student_id', studentId);
    
    const totalPaid = payments ? payments.reduce((sum, p) => sum + parseFloat(p.amount), 0) : 0;
    return totalFees - totalPaid;
}

// =====================================================
// LOAD DASHBOARD DATA
// =====================================================
async function loadDashboardData() {
    try {
        // Load students
        allStudents = await loadStudents();
        document.getElementById('totalStudents').textContent = allStudents.length;
        
        // Load payments
        allPayments = await loadPayments();
        
        // Load fee structure
        await loadFeeStructure();
        
        // Calculate totals
        let totalFeesDue = 0;
        let totalCollected = 0;
        
        for (const student of allStudents) {
            const fees = getStudentFees(student);
            totalFeesDue += fees;
            
            const studentPayments = allPayments.filter(p => p.student_id === student.user_id);
            const paid = studentPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
            totalCollected += paid;
        }
        
        const outstanding = totalFeesDue - totalCollected;
        
        document.getElementById('totalFeesDue').innerHTML = formatCurrency(totalFeesDue);
        document.getElementById('totalCollected').innerHTML = formatCurrency(totalCollected);
        document.getElementById('outstandingBalance').innerHTML = formatCurrency(outstanding);
        
        // Populate student dropdown
        const studentSelect = document.getElementById('studentId');
        studentSelect.innerHTML = '<option value="">-- Select Student --</option>';
        allStudents.forEach(s => {
            studentSelect.innerHTML += `<option value="${s.user_id}">${escapeHtml(s.full_name)} (${s.program} - ${s.intake_year || 'N/A'})</option>`;
        });
        
        // Set default date
        document.getElementById('paymentDate').value = new Date().toISOString().split('T')[0];
        
        // Load accounts table
        await loadAccountsTable();
        
        // Load recent payments
        await loadRecentPayments();
        
    } catch (error) {
        console.error('Dashboard error:', error);
        showAlert('Error loading dashboard data', 'error');
    }
}

// =====================================================
// LOAD ACCOUNTS TABLE
// =====================================================
async function loadAccountsTable() {
    const tbody = document.getElementById('accountsTableBody');
    tbody.innerHTML = '<tr><td colspan="11" style="text-align: center;"><div class="loading-spinner"></div> Loading...<\/td><\/tr>';
    
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('statusFilter')?.value || 'all';
    const programFilter = document.getElementById('programFilter')?.value || 'all';
    
    let filteredStudents = [...allStudents];
    
    // Apply filters
    if (searchTerm) {
        filteredStudents = filteredStudents.filter(s => 
            s.full_name.toLowerCase().includes(searchTerm) || 
            s.email.toLowerCase().includes(searchTerm) ||
            s.user_id.toLowerCase().includes(searchTerm)
        );
    }
    
    if (programFilter !== 'all') {
        filteredStudents = filteredStudents.filter(s => s.program === programFilter);
    }
    
    // Calculate balances and filter by status
    const studentsWithBalance = [];
    for (const student of filteredStudents) {
        const fees = getStudentFees(student);
        const studentPayments = allPayments.filter(p => p.student_id === student.user_id);
        const paid = studentPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const balance = fees - paid;
        const lastPaymentDate = studentPayments.length > 0 ? studentPayments[0].payment_date : null;
        
        let include = true;
        if (statusFilter === 'paid' && balance > 0) include = false;
        if (statusFilter === 'partial' && (balance <= 0 || balance >= fees)) include = false;
        if (statusFilter === 'unpaid' && paid > 0) include = false;
        if (statusFilter === 'overdue' && (!lastPaymentDate || (new Date() - new Date(lastPaymentDate)) / (1000 * 3600 * 24) <= 30)) include = false;
        
        if (include) {
            studentsWithBalance.push({ ...student, fees, paid, balance, lastPaymentDate });
        }
    }
    
    if (studentsWithBalance.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" style="text-align: center; padding: 40px;">No students found.<\/td><\/tr>';
        return;
    }
    
    tbody.innerHTML = '';
    studentsWithBalance.forEach((s, idx) => {
        const statusHtml = getStatusBadge(s.balance, s.lastPaymentDate);
        const balanceClass = s.balance < 0 ? 'text-success' : (s.balance > 0 ? 'text-danger' : '');
        
        tbody.innerHTML += `<tr>
            <td>${idx + 1}<\/td>
            <td><strong>${escapeHtml(s.full_name)}</strong><br><small style="color:#64748b;">${escapeHtml(s.email)}</small><\/td>
            <td>${s.user_id.substring(0, 8)}...<\/td>
            <td>${escapeHtml(s.program)}<\/td>
            <td>${escapeHtml(s.intake_year || '-')}<\/td>
            <td>${formatCurrency(s.fees)}<\/td>
            <td>${formatCurrency(s.paid)}<\/td>
            <td class="${balanceClass}">${formatCurrency(s.balance)}<\/td>
            <td>${statusHtml}<\/td>
            <td>${s.lastPaymentDate ? new Date(s.lastPaymentDate).toLocaleDateString() : '-'}<\/td>
            <td>
                <button class="btn-outline" style="padding: 4px 8px; font-size: 11px;" onclick="viewPaymentHistory('${s.user_id}')">
                    <i class="fas fa-history"></i> History
                </button>
             <\/td>
        </tr>`;
    });
}

// =====================================================
// LOAD RECENT PAYMENTS
// =====================================================
async function loadRecentPayments() {
    const tbody = document.getElementById('recentPaymentsBody');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;"><div class="loading-spinner"></div> Loading...<\/td><\/tr>';
    
    const recentPayments = allPayments.slice(0, 20);
    
    if (recentPayments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;">No payments recorded yet.<\/td><\/tr>';
        return;
    }
    
    // Get student names
    const studentIds = [...new Set(recentPayments.map(p => p.student_id))];
    const { data: students } = await sb.from('consolidated_user_profiles_table').select('user_id, full_name').in('user_id', studentIds);
    const studentMap = {};
    if (students) students.forEach(s => studentMap[s.user_id] = s.full_name);
    
    tbody.innerHTML = '';
    recentPayments.forEach(p => {
        tbody.innerHTML += `<tr>
            <td>${new Date(p.payment_date).toLocaleDateString()}<\/td>
            <td><strong>${escapeHtml(studentMap[p.student_id] || 'Unknown')}</strong><\/td>
            <td>${formatCurrency(p.amount)}<\/td>
            <td>${escapeHtml(p.payment_method)}<\/td>
            <td>${escapeHtml(p.reference || '-')}<\/td>
            <td><code>${escapeHtml(p.receipt_no || '-')}</code><\/td>
            <td>${escapeHtml(p.recorded_by_user?.full_name || p.recorded_by || 'System')}<\/td>
        </tr>`;
    });
}

// =====================================================
// RECORD PAYMENT
// =====================================================
document.getElementById('paymentForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const studentId = document.getElementById('studentId').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const method = document.getElementById('paymentMethod').value;
    const reference = document.getElementById('reference').value;
    const paymentDate = document.getElementById('paymentDate').value;
    const period = document.getElementById('period').value;
    const notes = document.getElementById('notes').value;
    
    if (!studentId) {
        showAlert('Please select a student', 'error');
        return;
    }
    
    if (!amount || isNaN(amount) || amount <= 0) {
        showAlert('Please enter a valid amount', 'error');
        return;
    }
    
    if (!paymentDate) {
        showAlert('Please select a payment date', 'error');
        return;
    }
    
    // Generate receipt number
    const receiptNo = `RCPT-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    
    const paymentData = {
        student_id: studentId,
        amount: amount,
        payment_method: method,
        reference: reference || null,
        payment_date: paymentDate,
        period: period,
        notes: notes || null,
        receipt_no: receiptNo,
        recorded_by: currentUser?.user_id,
        created_at: new Date().toISOString()
    };
    
    try {
        const { error } = await sb.from('fee_payments').insert([paymentData]);
        if (error) throw error;
        
        // Reload data
        allPayments = await loadPayments();
        await loadAccountsTable();
        await loadRecentPayments();
        await loadDashboardData();
        
        // Show receipt
        showReceipt(receiptNo, studentId, amount, paymentDate, method, reference);
        
        // Reset form
        document.getElementById('amount').value = '';
        document.getElementById('reference').value = '';
        document.getElementById('notes').value = '';
        
        showAlert(`✅ Payment recorded successfully! Receipt: ${receiptNo}`, 'success');
        
    } catch (error) {
        console.error('Payment error:', error);
        showAlert(`Error: ${error.message}`, 'error');
    }
});

// =====================================================
// VIEW PAYMENT HISTORY
// =====================================================
window.viewPaymentHistory = async function(studentId) {
    const student = allStudents.find(s => s.user_id === studentId);
    if (!student) return;
    
    const studentPayments = allPayments.filter(p => p.student_id === studentId).sort((a,b) => new Date(b.payment_date) - new Date(a.payment_date));
    const fees = getStudentFees(student);
    const totalPaid = studentPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const balance = fees - totalPaid;
    
    let paymentsHtml = '';
    if (studentPayments.length === 0) {
        paymentsHtml = '<p style="text-align: center; padding: 20px;">No payment records found.</p>';
    } else {
        paymentsHtml = '<table style="width:100%;"><thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Reference</th><th>Receipt</th></tr></thead><tbody>';
        studentPayments.forEach(p => {
            paymentsHtml += `<tr>
                <td>${new Date(p.payment_date).toLocaleDateString()}</td>
                <td>${formatCurrency(p.amount)}</td>
                <td>${escapeHtml(p.payment_method)}</td>
                <td>${escapeHtml(p.reference || '-')}</td>
                <td><code>${escapeHtml(p.receipt_no)}</code></td>
            </tr>`;
        });
        paymentsHtml += '</tbody></table>';
    }
    
    const modalBody = document.getElementById('paymentHistoryBody');
    modalBody.innerHTML = `
        <div style="margin-bottom: 20px;">
            <h4>${escapeHtml(student.full_name)}</h4>
            <p><strong>Student ID:</strong> ${student.user_id.substring(0, 8)}...<br>
            <strong>Program:</strong> ${escapeHtml(student.program)}<br>
            <strong>Intake:</strong> ${escapeHtml(student.intake_year || 'N/A')}</p>
        </div>
        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                <div><strong>Total Fees:</strong><br>${formatCurrency(fees)}</div>
                <div><strong>Total Paid:</strong><br>${formatCurrency(totalPaid)}</div>
                <div><strong>Balance:</strong><br>${formatCurrency(balance)}</div>
            </div>
        </div>
        <h4>Payment History</h4>
        ${paymentsHtml}
    `;
    
    document.getElementById('paymentHistoryModal').style.display = 'flex';
};

// =====================================================
// SHOW RECEIPT
// =====================================================
async function showReceipt(receiptNo, studentId, amount, date, method, reference) {
    const student = allStudents.find(s => s.user_id === studentId);
    if (!student) return;
    
    const receiptHtml = `
        <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://raw.githubusercontent.com/NCHSMlearning/e-learning/main/images/Logo_NCHSM.png" style="width: 60px; margin-bottom: 10px;">
            <h3>NAKURU COLLEGE OF HEALTH SCIENCES AND MANAGEMENT</h3>
            <p>Official Payment Receipt</p>
        </div>
        <div style="border-top: 1px dashed #ccc; border-bottom: 1px dashed #ccc; padding: 10px 0; margin: 10px 0;">
            <p><strong>Receipt No:</strong> ${receiptNo}</p>
            <p><strong>Date:</strong> ${new Date(date).toLocaleDateString()}</p>
            <p><strong>Student Name:</strong> ${escapeHtml(student.full_name)}</p>
            <p><strong>Student ID:</strong> ${student.user_id.substring(0, 8)}...</p>
            <p><strong>Program:</strong> ${escapeHtml(student.program)}</p>
        </div>
        <div style="text-align: center; padding: 15px; background: #f0fdf4; border-radius: 8px; margin: 10px 0;">
            <h2 style="color: #059669;">${formatCurrency(amount)}</h2>
            <p>Amount Paid</p>
        </div>
        <div style="margin: 10px 0;">
            <p><strong>Payment Method:</strong> ${method}</p>
            <p><strong>Reference:</strong> ${reference || 'N/A'}</p>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 11px; color: #666;">
            <p>This is a computer-generated receipt. Thank you for your payment!</p>
        </div>
    `;
    
    document.getElementById('receiptBody').innerHTML = receiptHtml;
    document.getElementById('receiptModal').style.display = 'flex';
}

window.printReceiptContent = function() {
    const receiptContent = document.getElementById('receiptBody').innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head><title>Payment Receipt</title>
        <style>body { font-family: Arial, sans-serif; padding: 40px; }</style>
        </head>
        <body>${receiptContent}</body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
};

// =====================================================
// EXPORT TO EXCEL
// =====================================================
window.exportToExcel = function() {
    const rows = document.querySelectorAll('#accountsTableBody tr');
    const data = [];
    
    // Headers
    data.push(['#', 'Student Name', 'Student ID', 'Email', 'Program', 'Intake', 'Total Fees (KES)', 'Paid (KES)', 'Balance (KES)', 'Status', 'Last Payment']);
    
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 10) {
            data.push([
                cells[0]?.innerText || '',
                cells[1]?.innerText.split('\n')[0] || '',
                cells[2]?.innerText || '',
                '',
                cells[3]?.innerText || '',
                cells[4]?.innerText || '',
                cells[5]?.innerText.replace('KES', '').trim() || '0',
                cells[6]?.innerText.replace('KES', '').trim() || '0',
                cells[7]?.innerText.replace('KES', '').trim() || '0',
                cells[8]?.innerText || '',
                cells[9]?.innerText || ''
            ]);
        }
    });
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Student_Accounts');
    XLSX.writeFile(wb, `NCHSM_Accounts_${new Date().toISOString().split('T')[0]}.xlsx`);
    showAlert('Export completed!', 'success');
};

window.printReport = function() {
    window.print();
};

// =====================================================
// REFRESH DATA
// =====================================================
window.refreshData = async function() {
    showAlert('Refreshing data...', 'info');
    allStudents = await loadStudents();
    allPayments = await loadPayments();
    await loadAccountsTable();
    await loadRecentPayments();
    await loadDashboardData();
    showAlert('Data refreshed!', 'success');
};

// =====================================================
// UTILITY FUNCTIONS
// =====================================================
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

window.closeModal = function(modalId) {
    document.getElementById(modalId).style.display = 'none';
};

window.logout = async function() {
    await sb.auth.signOut();
    localStorage.clear();
    window.location.href = 'login.html';
};

// =====================================================
// INITIALIZATION
// =====================================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 NCHSM Accounts Dashboard Initializing...');
    
    // Check authentication
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }
    
    // Get user profile
    const { data: profile } = await sb.from('consolidated_user_profiles_table').select('*').eq('user_id', session.user.id).single();
    if (profile) {
        currentUser = profile;
        document.getElementById('currentUserDisplay').textContent = profile.full_name || profile.email;
        
        // Check if user has permission (accounts staff or admin)
        if (!['admin', 'superadmin', 'accounts'].includes(profile.role)) {
            showAlert('You do not have permission to access this page.', 'error');
            setTimeout(() => window.location.href = 'dashboard.html', 2000);
            return;
        }
    }
    
    // Load dashboard data
    await loadDashboardData();
    
    // Set up filters
    document.getElementById('searchInput')?.addEventListener('input', loadAccountsTable);
    document.getElementById('statusFilter')?.addEventListener('change', loadAccountsTable);
    document.getElementById('programFilter')?.addEventListener('change', loadAccountsTable);
    
    console.log('✅ Accounts Dashboard Ready');
});
