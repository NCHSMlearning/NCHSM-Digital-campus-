// =====================================================
// SMART ACCOUNTS DASHBOARD - Complete Fee Management
// =====================================================

// Supabase Connection
const SB_URL = 'https://lwhtjozfsmbyihenfunw.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk';
let db = null;
let currentStaff = null;
let allStudents = [];
let allPayments = [];
let feeStructure = {};

// Default fee per block
const DEFAULT_FEES = {
    'KRCHN': { 'Introductory': 45000, 'Block 1': 45000, 'Block 2': 45000, 'Block 3': 45000, 'Block 4': 45000, 'Block 5': 45000, 'Block 6': 45000, 'Final': 45000 },
    'TVET': { 'Introductory': 35000, 'Term 1': 35000, 'Term 2': 35000, 'Term 3': 35000, 'Term 4': 35000, 'Term 5': 35000, 'Term 6': 35000, 'Final': 35000 }
};

// =====================================================
// INITIALIZATION
// =====================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('Smart Accounts loading...');
    
    if (typeof supabase !== 'undefined') {
        db = supabase.createClient(SB_URL, SB_KEY);
    }
    
    checkAuth();
    setupEventListeners();
});

async function checkAuth() {
    if (!db) return;
    
    const session = await db.auth.getSession();
    if (!session.data.session) {
        window.location.href = 'login.html';
        return;
    }
    
    const { data: profile } = await db
        .from('consolidated_user_profiles_table')
        .select('*')
        .eq('email', session.data.session.user.email)
        .single();
    
    if (profile) {
        currentStaff = profile;
        document.getElementById('currentUser').innerText = profile.full_name || profile.email;
        
        // Only accounts, admin, superadmin can access
        if (!['accounts', 'admin', 'superadmin'].includes(profile.role)) {
            alert('Access denied. Accounts department only.');
            window.location.href = 'login.html';
            return;
        }
    }
    
    await loadAllData();
}

function setupEventListeners() {
    // Smart filters
    document.getElementById('smartSearch')?.addEventListener('keyup', renderTable);
    document.getElementById('filterProgram')?.addEventListener('change', function() { updateBlockFilter(); renderTable(); });
    document.getElementById('filterBlock')?.addEventListener('change', renderTable);
    document.getElementById('filterIntake')?.addEventListener('change', renderTable);
    document.getElementById('filterStatus')?.addEventListener('change', renderTable);
    document.getElementById('sortBy')?.addEventListener('change', renderTable);
    
    // Set default date
    var today = new Date().toISOString().split('T')[0];
    var dateInput = document.getElementById('paymentDate');
    if (dateInput) dateInput.value = today;
}

// =====================================================
// LOAD ALL DATA
// =====================================================
async function loadAllData() {
    if (!db) return;
    
    // Load fee structure
    const { data: fees } = await db.from('fee_structure').select('*');
    if (fees) {
        feeStructure = {};
        fees.forEach(f => {
            if (!feeStructure[f.program]) feeStructure[f.program] = {};
            feeStructure[f.program][f.block] = f.amount;
        });
    }
    
    // Load students
    const { data: students } = await db
        .from('consolidated_user_profiles_table')
        .select('*')
        .eq('role', 'student')
        .eq('status', 'approved')
        .order('full_name');
    allStudents = students || [];
    
    // Load payments
    const { data: payments } = await db.from('fee_payments').select('*, recorded_by_user:recorded_by(full_name)').order('payment_date', { ascending: false });
    allPayments = payments || [];
    
    // Populate dropdowns
    populateStudentDropdown();
    populateIntakeFilter();
    updateBlockFilter();
    
    // Load stats and table
    updateStats();
    renderTable();
    loadRecentPayments();
}

function getStudentFees(student) {
    var program = student.program || 'KRCHN';
    var block = student.block || 'Introductory';
    if (feeStructure[program] && feeStructure[program][block]) {
        return feeStructure[program][block];
    }
    if (DEFAULT_FEES[program] && DEFAULT_FEES[program][block]) {
        return DEFAULT_FEES[program][block];
    }
    return 45000;
}

function getStudentPaid(studentId) {
    var paid = 0;
    for (var i = 0; i < allPayments.length; i++) {
        if (allPayments[i].student_id === studentId) {
            paid += parseFloat(allPayments[i].amount);
        }
    }
    return paid;
}

function getLastPaymentDate(studentId) {
    var lastDate = null;
    for (var i = 0; i < allPayments.length; i++) {
        if (allPayments[i].student_id === studentId) {
            var d = new Date(allPayments[i].payment_date);
            if (!lastDate || d > lastDate) lastDate = d;
        }
    }
    return lastDate;
}

// =====================================================
// POPULATE DROPDOWNS
// =====================================================
function populateStudentDropdown() {
    var select = document.getElementById('studentId');
    if (!select) return;
    select.innerHTML = '<option value="">-- Select Student --</option>';
    for (var i = 0; i < allStudents.length; i++) {
        var s = allStudents[i];
        select.innerHTML += '<option value="' + s.user_id + '">' + escapeHtml(s.full_name) + ' (' + s.program + ' - ' + (s.intake_year || 'N/A') + ')</option>';
    }
}

function populateIntakeFilter() {
    var select = document.getElementById('filterIntake');
    if (!select) return;
    var years = {};
    for (var i = 0; i < allStudents.length; i++) {
        var y = allStudents[i].intake_year;
        if (y) years[y] = true;
    }
    select.innerHTML = '<option value="all">All Years</option>';
    for (var y in years) {
        select.innerHTML += '<option value="' + y + '">' + y + '</option>';
    }
}

function updateBlockFilter() {
    var program = document.getElementById('filterProgram').value;
    var select = document.getElementById('filterBlock');
    if (!select) return;
    
    var blocks = [];
    if (program === 'KRCHN') {
        blocks = ['Introductory', 'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Block 6', 'Final'];
    } else if (program === 'TVET') {
        blocks = ['Introductory', 'Term 1', 'Term 2', 'Term 3', 'Term 4', 'Term 5', 'Term 6', 'Final'];
    } else {
        // Get unique blocks from all students
        var unique = {};
        for (var i = 0; i < allStudents.length; i++) {
            var b = allStudents[i].block;
            if (b) unique[b] = true;
        }
        blocks = Object.keys(unique).sort();
    }
    
    select.innerHTML = '<option value="all">All Blocks</option>';
    for (var i = 0; i < blocks.length; i++) {
        select.innerHTML += '<option value="' + blocks[i] + '">' + blocks[i] + '</option>';
    }
}

// =====================================================
// SMART TABLE RENDERING WITH FILTERS
// =====================================================
function renderTable() {
    var tbody = document.getElementById('tableBody');
    if (!tbody) return;
    
    // Get filters
    var search = (document.getElementById('smartSearch')?.value || '').toLowerCase();
    var programFilter = document.getElementById('filterProgram')?.value || 'all';
    var blockFilter = document.getElementById('filterBlock')?.value || 'all';
    var intakeFilter = document.getElementById('filterIntake')?.value || 'all';
    var statusFilter = document.getElementById('filterStatus')?.value || 'all';
    var sortBy = document.getElementById('sortBy')?.value || 'name';
    
    // Build student data with balances
    var studentData = [];
    for (var i = 0; i < allStudents.length; i++) {
        var s = allStudents[i];
        var fees = getStudentFees(s);
        var paid = getStudentPaid(s.user_id);
        var balance = fees - paid;
        var lastPayment = getLastPaymentDate(s.user_id);
        var status = 'unpaid';
        if (balance <= 0) status = 'paid';
        else if (paid > 0) status = 'partial';
        
        // Check overdue (no payment in 30+ days)
        var isOverdue = false;
        if (balance > 0 && lastPayment) {
            var daysSince = (new Date() - lastPayment) / (1000 * 3600 * 24);
            if (daysSince > 30) isOverdue = true;
        } else if (balance > 0 && !lastPayment) {
            isOverdue = true;
        }
        if (isOverdue) status = 'overdue';
        
        studentData.push({
            id: s.user_id,
            name: s.full_name,
            email: s.email,
            program: s.program,
            intake: s.intake_year || '-',
            block: s.block || 'Introductory',
            fees: fees,
            paid: paid,
            balance: balance,
            status: status,
            lastPayment: lastPayment,
            lastPaymentDate: lastPayment ? lastPayment.toISOString().split('T')[0] : '-'
        });
    }
    
    // Apply filters
    var filtered = [];
    for (var i = 0; i < studentData.length; i++) {
        var s = studentData[i];
        
        if (search && !s.name.toLowerCase().includes(search) && !s.email.toLowerCase().includes(search) && !s.id.toLowerCase().includes(search)) continue;
        if (programFilter !== 'all' && s.program !== programFilter) continue;
        if (blockFilter !== 'all' && s.block !== blockFilter) continue;
        if (intakeFilter !== 'all' && s.intake !== intakeFilter) continue;
        if (statusFilter !== 'all' && s.status !== statusFilter) continue;
        
        filtered.push(s);
    }
    
    // Sort
    if (sortBy === 'name') filtered.sort(function(a,b) { return a.name.localeCompare(b.name); });
    else if (sortBy === 'balance_high') filtered.sort(function(a,b) { return b.balance - a.balance; });
    else if (sortBy === 'balance_low') filtered.sort(function(a,b) { return a.balance - b.balance; });
    
    document.getElementById('recordCount').innerText = filtered.length + ' students shown';
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="12" style="text-align:center;padding:40px;">No students match your filters</td></tr>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < filtered.length; i++) {
        var s = filtered[i];
        var statusClass = 'badge-paid';
        var statusText = 'Paid';
        if (s.status === 'partial') { statusClass = 'badge-partial'; statusText = 'Partial'; }
        else if (s.status === 'unpaid') { statusClass = 'badge-unpaid'; statusText = 'Unpaid'; }
        else if (s.status === 'overdue') { statusClass = 'badge-overdue'; statusText = 'Overdue'; }
        
        var balanceClass = s.balance > 0 ? 'text-danger' : 'text-success';
        
        html += '<tr>';
        html += '<td>' + (i+1) + '</td>';
        html += '<td><strong>' + escapeHtml(s.name) + '</strong><br><small style="color:#666;">' + escapeHtml(s.email) + '</small></td>';
        html += '<td>' + s.id.substring(0,8) + '...</td>';
        html += '<td>' + escapeHtml(s.program) + '</td>';
        html += '<td>' + escapeHtml(s.intake) + '</td>';
        html += '<td>' + escapeHtml(s.block) + '</td>';
        html += '<td>KES ' + s.fees.toLocaleString() + '</td>';
        html += '<td>KES ' + s.paid.toLocaleString() + '</td>';
        html += '<td class="' + balanceClass + '">KES ' + s.balance.toLocaleString() + '</td>';
        html += '<td><span class="badge ' + statusClass + '">' + statusText + '</span></td>';
        html += '<td>' + s.lastPaymentDate + '</td>';
        html += '<td><button class="btn btn-outline" style="padding:4px 8px;font-size:11px;" onclick="showHistory(\'' + s.id + '\')"><i class="fas fa-history"></i> History</button> ';
        html += '<button class="btn btn-primary" style="padding:4px 8px;font-size:11px;" onclick="quickPay(\'' + s.id + '\')"><i class="fas fa-plus"></i> Pay</button></td>';
        html += '</tr>';
    }
    
    tbody.innerHTML = html;
}

// =====================================================
// STATISTICS
// =====================================================
function updateStats() {
    var totalFees = 0, totalPaid = 0;
    for (var i = 0; i < allStudents.length; i++) {
        var s = allStudents[i];
        var fees = getStudentFees(s);
        var paid = getStudentPaid(s.user_id);
        totalFees += fees;
        totalPaid += paid;
    }
    var outstanding = totalFees - totalPaid;
    var rate = totalFees > 0 ? ((totalPaid / totalFees) * 100).toFixed(1) : 0;
    
    document.getElementById('totalStudents').innerText = allStudents.length;
    document.getElementById('totalFeesDue').innerHTML = 'KES ' + totalFees.toLocaleString();
    document.getElementById('totalCollected').innerHTML = 'KES ' + totalPaid.toLocaleString();
    document.getElementById('outstandingBalance').innerHTML = 'KES ' + outstanding.toLocaleString();
    document.getElementById('collectionRate').innerHTML = rate + '%';
}

// =====================================================
// RECORD PAYMENT
// =====================================================
window.recordPayment = async function() {
    var studentId = document.getElementById('studentId').value;
    var amount = parseFloat(document.getElementById('amount').value);
    var method = document.getElementById('paymentMethod').value;
    var reference = document.getElementById('reference').value;
    var paymentDate = document.getElementById('paymentDate').value;
    var period = document.getElementById('period').value;
    var notes = document.getElementById('notes').value;
    
    if (!studentId) { alert('Select a student'); return; }
    if (!amount || isNaN(amount) || amount <= 0) { alert('Enter valid amount'); return; }
    if (!paymentDate) { alert('Select payment date'); return; }
    
    var receiptNo = 'RCT-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
    
    var paymentData = {
        student_id: studentId,
        amount: amount,
        payment_method: method,
        reference: reference || null,
        payment_date: paymentDate,
        period: period,
        notes: notes || null,
        receipt_no: receiptNo,
        recorded_by: currentStaff?.user_id,
        created_at: new Date().toISOString()
    };
    
    try {
        const { error } = await db.from('fee_payments').insert([paymentData]);
        if (error) throw error;
        
        // Reload data
        const { data: newPayments } = await db.from('fee_payments').select('*').order('payment_date', { ascending: false });
        allPayments = newPayments || [];
        
        updateStats();
        renderTable();
        loadRecentPayments();
        
        // Show receipt
        showReceipt(receiptNo, studentId, amount, paymentDate, method, reference);
        
        // Clear amount field only
        document.getElementById('amount').value = '';
        document.getElementById('reference').value = '';
        document.getElementById('notes').value = '';
        
        alert('✅ Payment recorded! Receipt: ' + receiptNo);
        
    } catch(err) {
        alert('Error: ' + err.message);
    }
};

window.quickPay = function(studentId) {
    var select = document.getElementById('studentId');
    if (select) select.value = studentId;
    document.getElementById('amount').focus();
    document.getElementById('paymentDate').value = new Date().toISOString().split('T')[0];
    // Scroll to payment form
    document.querySelector('.card:first-of-type').scrollIntoView({ behavior: 'smooth' });
};

window.clearPaymentForm = function() {
    document.getElementById('studentId').value = '';
    document.getElementById('amount').value = '';
    document.getElementById('reference').value = '';
    document.getElementById('notes').value = '';
    document.getElementById('paymentDate').value = new Date().toISOString().split('T')[0];
};

// =====================================================
// HISTORY & RECEIPTS
// =====================================================
window.showHistory = async function(studentId) {
    var student = null;
    for (var i = 0; i < allStudents.length; i++) {
        if (allStudents[i].user_id === studentId) {
            student = allStudents[i];
            break;
        }
    }
    if (!student) return;
    
    var studentPayments = [];
    for (var i = 0; i < allPayments.length; i++) {
        if (allPayments[i].student_id === studentId) studentPayments.push(allPayments[i]);
    }
    studentPayments.sort(function(a,b) { return new Date(b.payment_date) - new Date(a.payment_date); });
    
    var fees = getStudentFees(student);
    var paid = getStudentPaid(studentId);
    var balance = fees - paid;
    
    var html = '<div style="margin-bottom:20px;"><h4>' + escapeHtml(student.full_name) + '</h4>';
    html += '<p><strong>Email:</strong> ' + escapeHtml(student.email) + '<br>';
    html += '<strong>Program:</strong> ' + escapeHtml(student.program) + '<br>';
    html += '<strong>Intake:</strong> ' + (student.intake_year || 'N/A') + '<br>';
    html += '<strong>Block:</strong> ' + (student.block || 'Introductory') + '</p></div>';
    
    html += '<div style="background:#f8fafc;padding:15px;border-radius:12px;margin-bottom:20px;display:flex;justify-content:space-around;">';
    html += '<div><strong>Total Fees</strong><br>KES ' + fees.toLocaleString() + '</div>';
    html += '<div><strong>Total Paid</strong><br>KES ' + paid.toLocaleString() + '</div>';
    html += '<div><strong>Balance</strong><br><span class="' + (balance > 0 ? 'text-danger' : 'text-success') + '">KES ' + balance.toLocaleString() + '</span></div>';
    html += '</div>';
    
    if (studentPayments.length === 0) {
        html += '<p>No payment records found.</p>';
    } else {
        html += '<table style="width:100%;border-collapse:collapse;"><thead><tr style="background:#f1f5f9;"><th>Date</th><th>Amount</th><th>Method</th><th>Reference</th><th>Receipt No</th></tr></thead><tbody>';
        for (var i = 0; i < studentPayments.length; i++) {
            var p = studentPayments[i];
            html += '<tr><td>' + p.payment_date + '</td><td>KES ' + parseFloat(p.amount).toLocaleString() + '</td><td>' + escapeHtml(p.payment_method) + '</td><td>' + (p.reference || '-') + '</td><td><code>' + p.receipt_no + '</code></td></tr>';
        }
        html += '</tbody></table>';
    }
    
    document.getElementById('historyBody').innerHTML = html;
    document.getElementById('historyModal').style.display = 'flex';
};

window.printHistory = function() {
    var content = document.getElementById('historyBody').innerHTML;
    var win = window.open('', '_blank');
    win.document.write('<html><head><title>Payment History</title><style>body{font-family:Arial;padding:20px;} table{border-collapse:collapse;width:100%;} th,td{border:1px solid #ddd;padding:8px;}</style></head><body>' + content + '</body></html>');
    win.document.close();
    win.print();
};

async function showReceipt(receiptNo, studentId, amount, date, method, reference) {
    var student = null;
    for (var i = 0; i < allStudents.length; i++) {
        if (allStudents[i].user_id === studentId) { student = allStudents[i]; break; }
    }
    if (!student) return;
    
    var html = '<div class="receipt-box" style="text-align:center;">';
    html += '<img src="https://raw.githubusercontent.com/NCHSMlearning/e-learning/main/images/Logo_NCHSM.png" style="width:60px;margin-bottom:10px;">';
    html += '<h3>NAKURU COLLEGE OF HEALTH SCIENCES</h3>';
    html += '<p>Official Payment Receipt</p>';
    html += '<hr>';
    html += '<p><strong>Receipt No:</strong> ' + receiptNo + '</p>';
    html += '<p><strong>Date:</strong> ' + date + '</p>';
    html += '<p><strong>Student:</strong> ' + escapeHtml(student.full_name) + '</p>';
    html += '<p><strong>Program:</strong> ' + escapeHtml(student.program) + '</p>';
    html += '<hr>';
    html += '<h2 style="color:#059669;">KES ' + parseFloat(amount).toLocaleString() + '</h2>';
    html += '<p><strong>Method:</strong> ' + method + '</p>';
    html += '<p><strong>Reference:</strong> ' + (reference || 'N/A') + '</p>';
    html += '<hr>';
    html += '<p style="font-size:11px;">Thank you for your payment!</p>';
    html += '</div>';
    
    document.getElementById('receiptBody').innerHTML = html;
    document.getElementById('receiptModal').style.display = 'flex';
}

window.printReceipt = function() {
    var content = document.getElementById('receiptBody').innerHTML;
    var win = window.open('', '_blank');
    win.document.write('<html><head><title>Payment Receipt</title><style>body{font-family:Arial;padding:20px;}</style></head><body>' + content + '</body></html>');
    win.document.close();
    win.print();
};

// =====================================================
// RECENT PAYMENTS
// =====================================================
async function loadRecentPayments() {
    var tbody = document.getElementById('recentPaymentsBody');
    if (!tbody) return;
    
    var recent = allPayments.slice(0, 20);
    if (recent.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;">No payments yet</td></tr>';
        return;
    }
    
    // Get student names
    var studentNames = {};
    for (var i = 0; i < allStudents.length; i++) {
        studentNames[allStudents[i].user_id] = allStudents[i].full_name;
    }
    
    var html = '';
    for (var i = 0; i < recent.length; i++) {
        var p = recent[i];
        html += '<tr>';
        html += '<td>' + p.payment_date + '</td>';
        html += '<td>' + escapeHtml(studentNames[p.student_id] || 'Unknown') + '</td>';
        html += '<td>KES ' + parseFloat(p.amount).toLocaleString() + '</td>';
        html += '<td>' + escapeHtml(p.payment_method) + '</td>';
        html += '<td>' + (p.reference || '-') + '</td>';
        html += '<td><code>' + p.receipt_no + '</code></td>';
        html += '<td>' + (p.recorded_by_user?.full_name || p.recorded_by || 'System') + '</td>';
        html += '</tr>';
    }
    tbody.innerHTML = html;
}

window.viewAllPayments = function() {
    var html = '<table style="width:100%;border-collapse:collapse;"><thead><tr><th>Date</th><th>Student</th><th>Amount</th><th>Method</th><th>Reference</th><th>Receipt</th></tr></thead><tbody>';
    for (var i = 0; i < allPayments.length; i++) {
        var p = allPayments[i];
        var student = '';
        for (var j = 0; j < allStudents.length; j++) {
            if (allStudents[j].user_id === p.student_id) { student = allStudents[j].full_name; break; }
        }
        html += '<tr><td>' + p.payment_date + '</td><td>' + escapeHtml(student) + '</td><td>KES ' + parseFloat(p.amount).toLocaleString() + '</td><td>' + escapeHtml(p.payment_method) + '</td><td>' + (p.reference || '-') + '</td><td>' + p.receipt_no + '</td></tr>';
    }
    html += '</tbody></table>';
    document.getElementById('historyBody').innerHTML = html;
    document.getElementById('historyModal').style.display = 'flex';
};

// =====================================================
// EXPORT FUNCTIONS
// =====================================================
window.exportToExcel = function() {
    var table = document.getElementById('studentsTable');
    var wb = XLSX.utils.book_new();
    var ws = XLSX.utils.table_to_sheet(table, { raw: true });
    XLSX.utils.book_append_sheet(wb, ws, 'Student_Accounts');
    XLSX.writeFile(wb, 'NCHSM_Accounts_' + new Date().toISOString().split('T')[0] + '.xlsx');
};

window.exportToCSV = function() {
    var table = document.getElementById('studentsTable');
    var rows = table.querySelectorAll('tr');
    var csv = [];
    for (var i = 0; i < rows.length; i++) {
        var row = [];
        var cols = rows[i].querySelectorAll('td, th');
        for (var j = 0; j < cols.length; j++) {
            var text = cols[j].innerText.replace(/"/g, '""');
            row.push('"' + text + '"');
        }
        csv.push(row.join(','));
    }
    var blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'NCHSM_Accounts_' + new Date().toISOString().split('T')[0] + '.csv';
    link.click();
    URL.revokeObjectURL(link.href);
};

window.printReport = function() {
    window.print();
};

// =====================================================
// REFRESH
// =====================================================
window.refreshData = async function() {
    const { data: students } = await db.from('consolidated_user_profiles_table').select('*').eq('role', 'student').eq('status', 'approved');
    const { data: payments } = await db.from('fee_payments').select('*').order('payment_date', { ascending: false });
    allStudents = students || [];
    allPayments = payments || [];
    populateStudentDropdown();
    populateIntakeFilter();
    updateBlockFilter();
    updateStats();
    renderTable();
    loadRecentPayments();
    alert('Data refreshed!');
};

// =====================================================
// UTILITIES
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
    if (db) await db.auth.signOut();
    localStorage.clear();
    window.location.href = 'login.html';
};
