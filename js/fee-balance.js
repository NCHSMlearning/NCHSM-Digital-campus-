// ====================================================
// FEE BALANCE MODULE - Student Portal
// ====================================================

let currentStudentId = null;

// Initialize Fee Balance Module
async function initFeeBalance() {
    console.log('💰 Initializing Fee Balance module...');
    
    if (!window.currentUserId) {
        console.error('No user ID found');
        return;
    }
    
    currentStudentId = window.currentUserId;
    
    // Load fee data
    await loadStudentFeeData();
    await loadPaymentHistory();
}

// Load student fee data from database
async function loadStudentFeeData() {
    try {
        // Get student profile
        const { data: student, error: studentError } = await window.supabase
            .from('consolidated_user_profiles_table')
            .select('*')
            .eq('user_id', currentStudentId)
            .single();
        
        if (studentError) throw studentError;
        
        // Get fee structure for student's program and block
        const block = student.block || 'Introductory';
        const { data: feeConfig, error: feeError } = await window.supabase
            .from('fee_structure')
            .select('amount')
            .eq('program', student.program)
            .eq('block', block)
            .single();
        
        const totalDue = feeConfig ? feeConfig.amount : 0;
        
        // Get total paid from fee_payments
        const { data: payments, error: paymentError } = await window.supabase
            .from('fee_payments')
            .select('amount')
            .eq('student_id', currentStudentId);
        
        const totalPaid = payments ? payments.reduce((sum, p) => sum + parseFloat(p.amount), 0) : 0;
        const outstanding = totalDue - totalPaid;
        
        // Update dashboard cards
        updateDashboardFeeCards(totalDue, totalPaid, outstanding);
        
        // Update fee balance tab
        updateFeeBalanceTab(totalDue, totalPaid, outstanding);
        
        // Update exam card eligibility
        updateExamCardEligibility(outstanding);
        
        return { totalDue, totalPaid, outstanding };
        
    } catch (error) {
        console.error('Error loading fee data:', error);
        return { totalDue: 0, totalPaid: 0, outstanding: 0 };
    }
}

// Update dashboard fee cards
function updateDashboardFeeCards(totalDue, totalPaid, outstanding) {
    const feeBalanceEl = document.getElementById('dashboard-fee-balance');
    const totalFeesEl = document.getElementById('dashboard-total-fees');
    const totalPaidEl = document.getElementById('dashboard-total-paid');
    const feeStatusEl = document.getElementById('dashboard-fee-status');
    
    if (feeBalanceEl) {
        feeBalanceEl.textContent = `KES ${outstanding.toLocaleString()}`;
        feeBalanceEl.style.color = outstanding > 0 ? '#dc2626' : '#059669';
    }
    
    if (totalFeesEl) totalFeesEl.textContent = `KES ${totalDue.toLocaleString()}`;
    if (totalPaidEl) totalPaidEl.textContent = `KES ${totalPaid.toLocaleString()}`;
    
    if (feeStatusEl) {
        if (outstanding <= 0) {
            feeStatusEl.textContent = 'PAID ✅';
            feeStatusEl.className = 'fee-status-paid';
        } else {
            feeStatusEl.textContent = `PENDING (KES ${outstanding.toLocaleString()})`;
            feeStatusEl.className = 'fee-status-pending';
        }
    }
}

// Update Fee Balance Tab
function updateFeeBalanceTab(totalDue, totalPaid, outstanding) {
    const totalDueEl = document.getElementById('fee-total-due');
    const totalPaidEl = document.getElementById('fee-total-paid');
    const outstandingEl = document.getElementById('fee-outstanding');
    const statusTextEl = document.getElementById('fee-status-text');
    
    if (totalDueEl) totalDueEl.textContent = `KES ${totalDue.toLocaleString()}`;
    if (totalPaidEl) totalPaidEl.textContent = `KES ${totalPaid.toLocaleString()}`;
    
    if (outstandingEl) {
        outstandingEl.textContent = `KES ${outstanding.toLocaleString()}`;
        if (outstanding > 0) {
            outstandingEl.style.color = '#dc2626';
        } else {
            outstandingEl.style.color = '#059669';
        }
    }
    
    if (statusTextEl) {
        if (outstanding <= 0) {
            statusTextEl.innerHTML = '<span class="fee-status-paid">✅ Fee Status: CLEARED</span>';
        } else if (outstanding > 0 && outstanding <= 10000) {
            statusTextEl.innerHTML = '<span class="fee-status-pending">⚠️ Fee Status: LOW BALANCE - Please clear before exams</span>';
        } else {
            statusTextEl.innerHTML = '<span class="fee-status-overdue">❌ Fee Status: OUTSTANDING - Exam card restricted</span>';
        }
    }
}

// Load payment history
async function loadPaymentHistory() {
    const tbody = document.getElementById('payment-history-body');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr class="loading-row"><td colspan="6"><div class="loading-spinner"></div> Loading payment history...</td></tr>';
    
    try {
        const { data: payments, error } = await window.supabase
            .from('fee_payments')
            .select('*')
            .eq('student_id', currentStudentId)
            .order('payment_date', { ascending: false });
        
        if (error) throw error;
        
        if (!payments || payments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No payment records found.</td></tr>';
            return;
        }
        
        let html = '';
        for (const payment of payments) {
            html += `
                <tr>
                    <td>${payment.payment_date || 'N/A'}</td>
                    <td>${payment.receipt_no || 'N/A'}</td>
                    <td>KES ${parseFloat(payment.amount).toLocaleString()}</td>
                    <td>${payment.payment_method || 'N/A'}</td>
                    <td>${payment.reference || '-'}</td>
                    <td>${payment.period || '-'}</td>
                </tr>
            `;
        }
        
        tbody.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading payment history:', error);
        tbody.innerHTML = '<tr><td colspan="6" style="color: red;">Error loading payment history</td></tr>';
    }
}

// Update exam card eligibility
function updateExamCardEligibility(outstanding) {
    const examStatusEl = document.getElementById('dashboard-exam-status');
    const registeredUnitsEl = document.getElementById('dashboard-registered-units');
    
    if (examStatusEl) {
        if (outstanding <= 0) {
            examStatusEl.textContent = 'ELIGIBLE ✅';
            examStatusEl.style.color = '#059669';
        } else {
            examStatusEl.textContent = 'NOT ELIGIBLE ❌';
            examStatusEl.style.color = '#dc2626';
        }
    }
    
    // Load registered units count
    loadRegisteredUnitsCount();
}

// Load registered units count for dashboard
async function loadRegisteredUnitsCount() {
    try {
        const { data: registrations, error } = await window.supabase
            .from('student_unit_registrations')
            .select('id')
            .eq('student_id', currentStudentId)
            .eq('status', 'approved');
        
        const count = registrations ? registrations.length : 0;
        
        const registeredUnitsEl = document.getElementById('dashboard-registered-units');
        if (registeredUnitsEl) registeredUnitsEl.textContent = count;
        
    } catch (error) {
        console.error('Error loading registered units:', error);
    }
}

// Export functions for global access
window.initFeeBalance = initFeeBalance;
window.loadStudentFeeData = loadStudentFeeData;
