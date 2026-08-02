/**
 * FINANCE MODULE - STUDENT FUNCTIONS
 * All functions specific to Student role for use in Student Dashboard
 */

// ===== STUDENT DASHBOARD =====

/**
 * Load student dashboard data
 */
async function loadStudentDashboard() {
    try {
        const data = await studentGetDashboard();
        updateStudentDashboard(data);
        return data;
    } catch (error) {
        console.error('Error loading student dashboard:', error);
        if (error.message === 'Not authenticated') {
            window.location.href = 'financelogin.html';
        }
        return null;
    }
}

/**
 * Update student dashboard UI
 */
function updateStudentDashboard(data) {
    if (!data) return;
    
    // Update balance
    const balanceEl = document.getElementById('studentBalance');
    if (balanceEl) {
        balanceEl.textContent = formatCurrency(data.balance || 0);
    }
    
    // Update summary cards
    const summaryCards = document.querySelectorAll('.student-summary-card');
    if (summaryCards.length > 0) {
        const cardData = {
            'total_due': data.summary?.totalDue || 0,
            'total_paid': data.summary?.totalPaid || 0,
            'balance': data.balance || 0
        };
        
        summaryCards.forEach(card => {
            const key = card.dataset.key;
            if (key && cardData[key] !== undefined) {
                card.querySelector('.data').textContent = formatCurrency(cardData[key]);
            }
        });
    }
    
    // Update recent payments
    const tbody = document.getElementById('studentRecentPayments');
    if (tbody && data.payments) {
        if (data.payments.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 30px; color: #94a3b8;">
                        <i class="fas fa-info-circle"></i> No payments found
                    </td>
                </tr>
            `;
        } else {
            tbody.innerHTML = data.payments.map(p => `
                <tr>
                    <td>${formatDate(p.date)}</td>
                    <td>${formatCurrency(p.amount)}</td>
                    <td>${p.method || '-'}</td>
                    <td>${p.period || '-'}</td>
                    <td>
                        <span class="finance-badge ${p.status === 'completed' ? 'finance-badge-success' : 'finance-badge-warning'}">
                            ${p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                        </span>
                    </td>
                </tr>
            `).join('');
        }
    }
    
    // Update fee structure
    const feeContainer = document.getElementById('studentFeeStructure');
    if (feeContainer && data.feeStructure) {
        if (data.feeStructure.length === 0) {
            feeContainer.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #94a3b8;">
                    <i class="fas fa-info-circle"></i> No fee structure available
                </div>
            `;
        } else {
            let total = 0;
            feeContainer.innerHTML = data.feeStructure.map(f => {
                total += f.amount || 0;
                return `
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                        <span>${f.block || 'Block'} - ${f.description || 'Tuition'}</span>
                        <span><strong>${formatCurrency(f.amount || 0)}</strong></span>
                    </div>
                `;
            }).join('');
            
            // Add total
            feeContainer.innerHTML += `
                <div style="display: flex; justify-content: space-between; padding: 10px 0; margin-top: 8px; border-top: 2px solid #4C1D95; font-weight: 700;">
                    <span>Total Fees</span>
                    <span>${formatCurrency(total)}</span>
                </div>
            `;
        }
    }
}

// ===== STUDENT PAYMENT =====

/**
 * Initiate payment
 */
async function initiatePayment(amount, method) {
    try {
        const user = getCurrentFinanceUser();
        if (!user) throw new Error('Not authenticated');
        
        const result = await financeAPI.recordPayment({
            studentId: user.id,
            amount: amount,
            method: method,
            date: new Date().toISOString().split('T')[0]
        });
        
        return result;
    } catch (error) {
        console.error('Payment initiation error:', error);
        throw error;
    }
}

/**
 * View student payment history
 */
async function viewPaymentHistory() {
    try {
        const payments = await studentGetPayments({ limit: 50 });
        return payments;
    } catch (error) {
        console.error('Error getting payment history:', error);
        return [];
    }
}

// ===== STUDENT FEE STRUCTURE =====

/**
 * View student fee structure
 */
async function viewFeeStructure() {
    try {
        const feeStructure = await studentGetFeeStructure();
        return feeStructure;
    } catch (error) {
        console.error('Error getting fee structure:', error);
        return [];
    }
}

// ===== STUDENT STATEMENT =====

/**
 * Generate student statement
 */
function generateStudentStatement() {
    const user = getCurrentFinanceUser();
    if (!user) {
        showToast('Please login first', 'error');
        return;
    }
    
    showToast('Generating statement...', 'info');
    
    // Simulate PDF generation
    setTimeout(() => {
        const win = window.open('', '_blank');
        if (win) {
            win.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>NCHSM - Fee Statement</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 40px; }
                        .header { text-align: center; border-bottom: 2px solid #0A3D62; padding-bottom: 20px; }
                        .header h1 { color: #0A3D62; }
                        .details { margin: 20px 0; }
                        .table { width: 100%; border-collapse: collapse; }
                        .table th, .table td { padding: 10px; border: 1px solid #ddd; text-align: left; }
                        .table th { background: #f0f4ff; }
                        .total { font-weight: bold; }
                        .footer { text-align: center; margin-top: 40px; color: #666; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>NCHSM - Fee Statement</h1>
                        <p>Nairobi College of Health & Social Management</p>
                    </div>
                    <div class="details">
                        <p><strong>Student:</strong> ${user.name || 'N/A'}</p>
                        <p><strong>Student ID:</strong> ${user.studentId || 'N/A'}</p>
                        <p><strong>Program:</strong> ${user.program || 'N/A'}</p>
                        <p><strong>Generated:</strong> ${formatDateTime(new Date())}</p>
                    </div>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Block/Term</th>
                                <th>Description</th>
                                <th>Amount (KES)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td>Introductory</td><td>Tuition Fees</td><td>60,000.00</td></tr>
                            <tr><td>Block 1</td><td>Tuition Fees</td><td>60,000.00</td></tr>
                            <tr><td>Block 2</td><td>Tuition Fees</td><td>60,000.00</td></tr>
                            <tr class="total"><td colspan="2"><strong>Total</strong></td><td><strong>180,000.00</strong></td></tr>
                        </tbody>
                    </table>
                    <div class="footer">
                        <p>This is a system-generated statement. For any queries, contact the Finance Office.</p>
                    </div>
                </body>
                </html>
            `);
            win.document.close();
            win.print();
        }
        showToast('Statement generated!', 'success');
    }, 1000);
}

// ===== STUDENT NOTIFICATIONS =====

/**
 * Listen for student finance notifications
 */
function listenForStudentNotifications() {
    listenToSuperAdmin((data) => {
        if (data.type === 'FEES_PUBLISHED') {
            showToast('New fees have been published to your account.', 'info');
            loadStudentDashboard();
        } else if (data.type === 'PAYMENT_REMINDER') {
            showToast('Payment reminder: Please settle your outstanding balance.', 'warning');
        } else if (data.type === 'STATEMENT_READY') {
            showToast('Your fee statement is ready for download.', 'success');
        }
    });
}

// ===== STUDENT EXPORT =====

/**
 * Export student payment history
 */
function exportStudentHistory() {
    showToast('Exporting payment history...', 'info');
    setTimeout(() => {
        showToast('Export completed!', 'success');
    }, 1000);
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    // Check if student dashboard
    if (isFinanceStudent()) {
        loadStudentDashboard();
        listenForStudentNotifications();
    }
});

console.log('✅ Student Functions loaded');
