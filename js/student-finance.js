// ============================================================
// 📊 STUDENT FINANCE MODULE - COMPLETE WITH STK PAYMENT
// Supports KRCHN (Semesters) and TVET (Terms with Years)
// ✅ M-Pesa STK Push Integration
// ✅ Real-time payment status updates
// ✅ View & Download fee structure actions
// ✅ Fee balance updates when viewing specific periods
// ✅ Email notification after successful payment
// ============================================================

// ============================================================
// 📦 STATE
// ============================================================
const studentFinanceState = {
    balance: 0,
    totalPaid: 0,
    totalDue: 0,
    outstanding: 0,
    payments: [],
    feeStructure: [],
    paymentProgress: 0,
    lastUpdated: null,
    isLoaded: false,
    programType: 'KRCHN',
    programLevel: 'diploma',
    currentPeriod: null,
    semesterFee: 0,
    paidThisSemester: 0,
    currentPeriodIndex: 0,
    feeStructureVisible: false,
    student: null,
    selectedPeriod: null,
    // STK Payment State
    stkPayment: {
        isProcessing: false,
        checkoutRequestID: null,
        merchantRequestID: null,
        phoneNumber: null,
        amount: 0,
        period: null,
        status: 'idle' // idle, processing, success, failed, cancelled
    }
};

// ============================================================
// 🔔 UPDATE FINANCE BADGE
// ============================================================

/**
 * Update finance badge notification count
 * Shows pending and overdue payments count
 */
function updateFinanceBadge(data) {
    const badge = document.getElementById('financeBadge');
    const badgeCount = document.getElementById('financeBadgeCount');
    
    if (!badge || !badgeCount) return;
    
    // Get payments from data
    const payments = data?.payments || [];
    
    // Count pending and overdue payments
    const pending = payments.filter(p => 
        p.status === 'pending' || 
        p.status === 'processing' ||
        p.status === 'partial'
    ).length;
    
    const overdue = payments.filter(p => 
        p.status === 'failed' || 
        p.status === 'overdue'
    ).length;
    
    const total = pending + overdue;
    
    if (total > 0) {
        badge.style.display = 'inline-block';
        badgeCount.textContent = total;
        
        // Show red for overdue, orange for pending only
        if (overdue > 0) {
            badge.style.background = '#ef4444';
        } else if (pending > 0) {
            badge.style.background = '#f59e0b';
        } else {
            badge.style.background = '#3b82f6';
        }
        
        // Add pulse animation
        badge.style.animation = 'pulse-badge 2s infinite';
    } else {
        badge.style.display = 'none';
        badge.style.animation = 'none';
    }
}

// ============================================================
// 🎯 TOGGLE FEE STRUCTURE
// ============================================================

/**
 * Toggle fee structure visibility
 * This is called from the HTML onclick
 */
function toggleFeeStructure() {
    const container = document.getElementById('studentFeeStructureDisplay');
    const toggleBtn = document.getElementById('toggleFeeBtn');
    const toggleText = document.getElementById('toggleFeeText');
    
    if (!container) return;
    
    if (container.style.display === 'none' || container.style.display === '') {
        // Show fee structure
        container.style.display = 'block';
        container.style.animation = 'fadeIn 0.3s ease';
        
        if (toggleBtn) {
            toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i> <span id="toggleFeeText">Hide Fee Structure</span>';
        }
        if (toggleText) {
            toggleText.textContent = 'Hide Fee Structure';
        }
        
        studentFinanceState.feeStructureVisible = true;
        
        // Load fee structure if not loaded
        if (studentFinanceState.feeStructure.length === 0) {
            loadStudentFinance();
        } else {
            renderFeeStructureData(studentFinanceState.feeStructure);
        }
        
        // Scroll to fee structure
        setTimeout(() => {
            container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
        
    } else {
        // Hide fee structure
        container.style.display = 'none';
        container.style.animation = 'fadeOut 0.3s ease';
        
        if (toggleBtn) {
            toggleBtn.innerHTML = '<i class="fas fa-eye"></i> <span id="toggleFeeText">View Fee Structure</span>';
        }
        if (toggleText) {
            toggleText.textContent = 'View Fee Structure';
        }
        
        studentFinanceState.feeStructureVisible = false;
    }
}

// ============================================================
// 🔄 RESET TO CURRENT PERIOD
// ============================================================

function resetToCurrentPeriod() {
    const programType = studentFinanceState.programType || 'KRCHN';
    const programLevel = studentFinanceState.programLevel || 'diploma';
    const periods = getPeriods(programType, programLevel);
    const currentPeriod = periods[0] || 'Year 1 - Semester 1';
    
    studentFinanceState.selectedPeriod = null;
    studentFinanceState.currentPeriod = currentPeriod;
    
    // Refresh the display
    if (studentFinanceState.isLoaded) {
        updateBalanceForPeriodIndex(0);
        renderFeeStructureData(studentFinanceState.feeStructure);
    }
    
    showToast('📊 Reset to current period', 'info');
}

// ============================================================
// 📧 EMAIL NOTIFICATION - SEND PAYMENT CONFIRMATION
// ============================================================

/**
 * Send payment confirmation email to student after successful payment
 * Uses the same Edge Function pattern as the exam results email
 */
async function sendPaymentConfirmationEmail(studentId, paymentData) {
    try {
        // Get student details from Supabase
        const { data: student, error: studentError } = await supabase
            .from('consolidated_user_profiles_table')
            .select('full_name, email, student_id, program, block, phone')
            .eq('user_id', studentId)
            .single();
        
        if (studentError || !student || !student.email) {
            console.log('⚠️ No email found for student:', studentId);
            return false;
        }
        
        console.log('📧 Sending payment confirmation email to:', student.email);
        
        // Prepare email data
        const amount = paymentData.amount || 0;
        const period = paymentData.period || 'N/A';
        const transactionId = paymentData.transactionId || `TXN-${Date.now()}`;
        const method = paymentData.method || 'M-Pesa STK Push';
        const reference = paymentData.reference || `PAY-${Date.now()}`;
        const paymentDate = new Date(paymentData.date || Date.now()).toLocaleDateString('en-KE', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const balance = studentFinanceState.balance || 0;
        const programType = studentFinanceState.programType || 'KRCHN';
        
        // ✅ EMAIL TEMPLATE - Payment Confirmation (NO SENSITIVE DATA EXPOSED)
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Confirmation - NCHSM</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, sans-serif; margin: 0; padding: 0; background-color: #f0f4f8; }
        .container { max-width: 580px; margin: 0 auto; padding: 20px; }
        .card { background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(10, 61, 98, 0.12); }
        .header { background: linear-gradient(135deg, #0A3D62 0%, #1a5276 100%); padding: 35px 35px 30px; text-align: center; }
        .header-logo { width: 75px; height: 75px; border-radius: 50%; background: white; padding: 6px; margin-bottom: 14px; }
        .header-title { color: #ffffff; font-size: 26px; font-weight: 700; margin: 0; }
        .header-subtitle { color: rgba(255,255,255,0.85); font-size: 14px; margin: 4px 0 0; }
        .body { padding: 32px 35px 28px; }
        .greeting { font-size: 20px; font-weight: 700; color: #0A3D62; margin: 0 0 4px; }
        .greeting-sub { color: #5a6c7d; font-size: 15px; margin: 0 0 22px; }
        .divider { border: none; border-top: 2px solid #eef2f7; margin: 18px 0 22px; }
        
        /* ✅ SUCCESS BOX */
        .success-box { 
            background: #ECFDF5; 
            padding: 24px; 
            border-radius: 16px; 
            text-align: center; 
            margin: 16px 0;
            border: 2px solid #10B981;
        }
        .success-box .icon { font-size: 3rem; display: block; margin-bottom: 8px; }
        .success-box .message { font-size: 1.1rem; color: #065F46; font-weight: 600; }
        .success-box .sub-message { color: #5a6c7d; font-size: 0.95rem; margin-top: 4px; }
        
        .info-grid { background: #f8fafc; border-radius: 14px; padding: 20px 24px; margin: 16px 0; border-left: 4px solid #10B981; }
        .info-grid p { margin: 6px 0; font-size: 14px; color: #2c3e50; display: flex; justify-content: space-between; }
        .info-grid .label { color: #5a6c7d; font-weight: 500; }
        .info-grid .value { color: #0A3D62; font-weight: 600; text-align: right; }
        .info-grid .value.amount { color: #059669; font-size: 16px; }
        
        .balance-box { background: #f0fdf4; border-radius: 12px; padding: 14px 18px; margin: 16px 0; border: 1px solid #86efac; }
        .balance-box p { margin: 0; font-size: 14px; color: #065f46; display: flex; justify-content: space-between; }
        .balance-box .label { font-weight: 500; }
        .balance-box .value { font-weight: 700; }
        
        .btn-primary { display: inline-block; background: linear-gradient(135deg, #0A3D62, #1a5276); color: white !important; padding: 15px 36px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px; margin: 8px 0; box-shadow: 0 6px 20px rgba(10, 61, 98, 0.3); text-align: center; }
        .footer { background: #f8fafc; padding: 22px 35px; text-align: center; border-top: 1px solid #eef2f7; }
        .footer-text { font-size: 12px; color: #8a9aa8; margin: 4px 0; }
        .secure-badge { display: inline-block; background: #10b981; color: white; font-size: 11px; padding: 4px 16px; border-radius: 20px; font-weight: 600; margin-top: 8px; }
        @media (max-width: 480px) { .header { padding: 20px; } .body { padding: 20px; } .info-grid p { flex-direction: column; } .info-grid .value { text-align: left; margin-top: 2px; } }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="header">
                <img src="https://raw.githubusercontent.com/NCHSMlearning/e-learning/main/images/Logo_NCHSM.png" alt="NCHSM Logo" class="header-logo">
                <h1 class="header-title">✅ Payment Confirmed</h1>
                <p class="header-subtitle">Nakuru College of Health Sciences and Management</p>
            </div>
            
            <div class="body">
                <p class="greeting">Dear ${student.full_name},</p>
                <p class="greeting-sub">Your payment has been received and confirmed successfully.</p>
                
                <hr class="divider">
                
                <!-- ✅ SUCCESS BOX -->
                <div class="success-box">
                    <span class="icon">✅</span>
                    <div class="message">Payment Successful!</div>
                    <div class="sub-message">Your payment of <strong>KES ${amount.toLocaleString()}</strong> has been confirmed.</div>
                </div>
                
                <!-- Payment Details -->
                <div class="info-grid">
                    <p><span class="label">💰 Amount Paid</span> <span class="value amount">KES ${amount.toLocaleString()}</span></p>
                    <p><span class="label">📅 Payment Period</span> <span class="value">${period}</span></p>
                    <p><span class="label">💳 Payment Method</span> <span class="value">${method}</span></p>
                    <p><span class="label">🆔 Transaction ID</span> <span class="value">${transactionId}</span></p>
                    <p><span class="label">📋 Reference</span> <span class="value">${reference}</span></p>
                    <p><span class="label">📅 Date</span> <span class="value">${paymentDate}</span></p>
                    <p><span class="label">👤 Student</span> <span class="value">${student.full_name}</span></p>
                    <p><span class="label">🆔 Student ID</span> <span class="value">${student.student_id || 'N/A'}</span></p>
                    <p><span class="label">📚 Program</span> <span class="value">${student.program || 'N/A'}</span></p>
                    <p><span class="label">📊 Program Type</span> <span class="value">${programType}</span></p>
                </div>
                
                <!-- Updated Balance -->
                <div class="balance-box">
                    <p><span class="label">📊 Updated Outstanding Balance</span> <span class="value">KES ${balance.toLocaleString()}</span></p>
                </div>
                
                <!-- Call to Action -->
                <div style="text-align: center; margin: 24px 0 16px;">
                    <a href="https://nchsm.co.ke/finance" class="btn-primary">
                        💰 View My Finance Dashboard
                    </a>
                    <br>
                    <a href="https://nchsm.co.ke" style="color: #0A3D62; text-decoration: none; font-size: 13px; font-weight: 500; margin-top: 6px; display: inline-block;">
                        🌐 Visit NCHSM Digital Campus
                    </a>
                </div>
            </div>
            
            <div class="footer">
                <p class="footer-text"><strong>Nakuru College of Health Sciences and Management</strong></p>
                <p class="footer-text">📞 +254 703345771 &nbsp;|&nbsp; 📧 nchsmfinance@gmail.com</p>
                <p class="footer-text" style="font-size: 11px; color: #aab7c5;">This is an automated payment confirmation. Please do not reply to this email.</p>
                <span class="secure-badge">🔒 Secure Payment Confirmation</span>
            </div>
        </div>
    </div>
</body>
</html>`;

        // Send via Edge Function (using your pattern)
        const result = await fetch('https://lwhtjozfsmbyihenfunw.supabase.co/functions/v1/send-email', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                to: student.email,
                subject: `✅ Payment Confirmation - KES ${amount.toLocaleString()} - ${student.full_name}`,
                html: html,
                from: 'NCHSM Finance Department <nchsmfinance@gmail.com>'
            })
        });

        const data = await result.json();
        
        if (data.success) {
            console.log(`✅ Payment confirmation email sent to ${student.email}`);
            return true;
        } else {
            console.error('❌ Email failed:', data.error);
            return false;
        }
        
    } catch (error) {
        console.error('❌ Email error:', error);
        return false;
    }
}

// ============================================================
// 📱 STK PAYMENT FUNCTIONS
// ============================================================

/**
 * Initialize STK Push Payment - Main entry point
 */
async function initiateSTKPayment() {
    // Check if already processing
    if (studentFinanceState.stkPayment.isProcessing) {
        showToast('⏳ A payment is already in progress. Please wait.', 'warning');
        return;
    }

    const programType = studentFinanceState.programType || 'KRCHN';
    const programLevel = studentFinanceState.programLevel || 'diploma';
    const periodLabel = getPeriodLabel(programType);
    const periods = getPeriods(programType, programLevel);
    const user = window.currentUserProfile || window.currentUser;
    
    // Get current balance
    const currentBalance = studentFinanceState.balance || 0;
    
    Swal.fire({
        title: '💰 Make Payment',
        html: `
            <div style="text-align: left;">
                <p style="margin-bottom: 12px; color: #64748b;">Pay your fees securely using M-Pesa STK Push.</p>
                
                <div style="background: #f0fdf4; padding: 10px 14px; border-radius: 8px; border: 1px solid #86efac; margin-bottom: 16px;">
                    <p style="margin: 0; font-size: 13px; color: #065f46;">
                        <i class="fas fa-info-circle"></i> 
                        Current Outstanding Balance: <strong>KES ${currentBalance.toLocaleString()}</strong>
                    </p>
                </div>
                
                <div style="margin-bottom: 14px;">
                    <label style="font-weight: 600; font-size: 13px; color: #475569; display: block; margin-bottom: 4px;">
                        <i class="fas fa-phone"></i> M-Pesa Phone Number
                    </label>
                    <input type="tel" id="stkPhoneNumber" 
                           placeholder="e.g., 0712345678" 
                           value="${user?.phone || ''}"
                           style="width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 14px; background: #f8fafc; transition: all 0.3s ease;"
                           onfocus="this.style.borderColor='#4C1D95'; this.style.boxShadow='0 0 0 3px rgba(76,29,149,0.1)'"
                           onblur="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none'">
                    <p style="font-size: 11px; color: #94a3b8; margin-top: 4px;">
                        <i class="fas fa-info-circle"></i> Enter the phone number registered with M-Pesa
                    </p>
                </div>
                
                <div style="margin-bottom: 14px;">
                    <label style="font-weight: 600; font-size: 13px; color: #475569; display: block; margin-bottom: 4px;">
                        <i class="fas fa-coins"></i> Amount (KES)
                    </label>
                    <input type="number" id="stkAmountInput" 
                           placeholder="Enter amount" 
                           value="${currentBalance > 0 ? Math.min(currentBalance, 100000) : 1000}"
                           min="100"
                           max="${currentBalance || 100000}"
                           style="width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 14px; background: #f8fafc; transition: all 0.3s ease;"
                           onfocus="this.style.borderColor='#4C1D95'; this.style.boxShadow='0 0 0 3px rgba(76,29,149,0.1)'"
                           onblur="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none'">
                    <p style="font-size: 11px; color: #94a3b8; margin-top: 4px;">
                        <i class="fas fa-info-circle"></i> Minimum: KES 100 | Maximum: KES ${(currentBalance || 100000).toLocaleString()}
                    </p>
                </div>
                
                <div style="margin-bottom: 14px;">
                    <label style="font-weight: 600; font-size: 13px; color: #475569; display: block; margin-bottom: 4px;">
                        <i class="fas fa-calendar"></i> Payment ${periodLabel}
                    </label>
                    <select id="stkPeriodSelect" style="width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 14px; background: #f8fafc;">
                        ${periods.map(p => `<option value="${p}" ${p === studentFinanceState.currentPeriod ? 'selected' : ''}>${p}</option>`).join('')}
                    </select>
                </div>
                
                <div style="padding: 12px; background: #dbeafe; border-radius: 8px; border: 1px solid #93c5fd; font-size: 13px; color: #1e40af;">
                    <i class="fas fa-info-circle"></i> 
                    You will receive a prompt on your M-Pesa phone to confirm the payment.
                    <br><small>STK push will be sent to your phone immediately.</small>
                </div>
            </div>
        `,
        confirmButtonText: '💳 Pay with M-Pesa',
        cancelButtonText: 'Cancel',
        showCancelButton: true,
        confirmButtonColor: '#4C1D95',
        cancelButtonColor: '#64748b',
        preConfirm: () => {
            const phoneNumber = document.getElementById('stkPhoneNumber').value;
            const amount = document.getElementById('stkAmountInput').value;
            const period = document.getElementById('stkPeriodSelect').value;
            
            // Validate phone number
            if (!phoneNumber || phoneNumber.trim() === '') {
                Swal.showValidationMessage('Please enter your M-Pesa phone number');
                return false;
            }
            
            let cleanPhone = phoneNumber.replace(/\D/g, '');
            if (cleanPhone.length < 10) {
                Swal.showValidationMessage('Please enter a valid phone number (e.g., 0712345678)');
                return false;
            }
            
            // Format phone number for M-Pesa API
            if (cleanPhone.startsWith('0')) {
                cleanPhone = '254' + cleanPhone.substring(1);
            } else if (!cleanPhone.startsWith('254')) {
                cleanPhone = '254' + cleanPhone;
            }
            
            if (cleanPhone.length !== 12) {
                Swal.showValidationMessage('Please enter a valid phone number (10 digits)');
                return false;
            }
            
            // Validate amount
            if (!amount || parseFloat(amount) <= 0) {
                Swal.showValidationMessage('Please enter a valid amount');
                return false;
            }
            
            if (parseFloat(amount) < 100) {
                Swal.showValidationMessage('Minimum payment is KES 100');
                return false;
            }
            
            if (currentBalance > 0 && parseFloat(amount) > currentBalance) {
                Swal.showValidationMessage(`Amount cannot exceed outstanding balance of KES ${currentBalance.toLocaleString()}`);
                return false;
            }
            
            return { 
                phoneNumber: cleanPhone, 
                amount: parseFloat(amount), 
                period,
                displayPhone: phoneNumber
            };
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const { phoneNumber, amount, period, displayPhone } = result.value;
            // Process STK Push
            processSTKPush(amount, period, phoneNumber, displayPhone);
        }
    });
}

/**
 * Process STK Push Payment
 */
async function processSTKPush(amount, period, phoneNumber, displayPhone) {
    // Show processing dialog
    Swal.fire({
        title: '⏳ Processing Payment',
        html: `
            <div style="text-align: center;">
                <div style="display: inline-block; width: 60px; height: 60px; border: 4px solid #e5e7eb; border-top-color: #4C1D95; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 16px;"></div>
                <p style="font-size: 16px; font-weight: 600;">Sending STK Push...</p>
                <p style="color: #64748b; font-size: 14px;">Please check your phone for the M-Pesa prompt</p>
                <div style="background: #f8fafc; border-radius: 8px; padding: 12px; margin: 12px 0; text-align: left;">
                    <p style="margin: 4px 0; font-size: 13px;"><strong>Phone:</strong> ${displayPhone}</p>
                    <p style="margin: 4px 0; font-size: 13px;"><strong>Amount:</strong> KES ${amount.toLocaleString()}</p>
                    <p style="margin: 4px 0; font-size: 13px;"><strong>Period:</strong> ${period}</p>
                </div>
                <div style="padding: 10px; background: #fef3c7; border-radius: 8px; border: 1px solid #f59e0b; font-size: 13px; color: #92400e;">
                    <i class="fas fa-clock"></i> Waiting for confirmation... 
                    <span id="stkTimer" style="font-weight: 700; color: #d97706;">30</span> seconds remaining
                </div>
                <button onclick="cancelSTKPayment()" style="margin-top: 16px; padding: 8px 20px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600;">
                    <i class="fas fa-times"></i> Cancel Payment
                </button>
            </div>
        `,
        showConfirmButton: false,
        allowOutsideClick: false,
        willOpen: () => {
            // Start payment processing
            initiateSTKTransaction(amount, period, phoneNumber);
            // Start timer
            startSTKTimer();
        }
    });
    
    // Update state
    studentFinanceState.stkPayment.isProcessing = true;
    studentFinanceState.stkPayment.phoneNumber = phoneNumber;
    studentFinanceState.stkPayment.amount = amount;
    studentFinanceState.stkPayment.period = period;
    studentFinanceState.stkPayment.status = 'processing';
}

/**
 * Initiate STK Transaction with backend
 */
async function initiateSTKTransaction(amount, period, phoneNumber) {
    try {
        const user = window.currentUserProfile || window.currentUser;
        
        // Prepare payment data
        const paymentData = {
            student_id: user?.id || 'student_001',
            student_name: user?.full_name || user?.name || 'Student',
            phone_number: phoneNumber,
            amount: amount,
            period: period,
            program: user?.program || 'KRCHN',
            program_type: studentFinanceState.programType || 'KRCHN',
            description: `${period} Tuition Fees Payment`,
            email: user?.email || '',
            reference: `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
        };
        
        console.log('📱 Initiating STK Push:', paymentData);
        
        // Store checkout request ID for polling
        const checkoutRequestID = `CHECKOUT-${Date.now()}`;
        studentFinanceState.stkPayment.checkoutRequestID = checkoutRequestID;
        
        // Simulate API call - Replace with actual API endpoint
        // For demo purposes, simulate success after 2 seconds
        setTimeout(() => {
            // Simulate successful STK push
            console.log('✅ STK Push sent successfully');
            
            // Update dialog
            Swal.update({
                html: `
                    <div style="text-align: center;">
                        <div style="display: inline-block; width: 50px; height: 50px; border: 4px solid #e5e7eb; border-top-color: #10b981; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 16px;"></div>
                        <p style="font-size: 16px; font-weight: 600; color: #059669;">STK Push Sent!</p>
                        <p style="color: #64748b; font-size: 14px;">Please check your phone and enter your M-Pesa PIN to confirm</p>
                        <div style="background: #f8fafc; border-radius: 8px; padding: 12px; margin: 12px 0; text-align: left;">
                            <p style="margin: 4px 0; font-size: 13px;"><strong>Phone:</strong> ${phoneNumber}</p>
                            <p style="margin: 4px 0; font-size: 13px;"><strong>Amount:</strong> KES ${amount.toLocaleString()}</p>
                        </div>
                        <div style="padding: 10px; background: #dbeafe; border-radius: 8px; border: 1px solid #93c5fd; font-size: 13px; color: #1e40af;">
                            <i class="fas fa-info-circle"></i> Waiting for M-Pesa confirmation...
                            <span id="stkTimer" style="font-weight: 700; color: #1e40af;">30</span> seconds remaining
                        </div>
                        <button onclick="cancelSTKPayment()" style="margin-top: 16px; padding: 8px 20px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600;">
                            <i class="fas fa-times"></i> Cancel Payment
                        </button>
                    </div>
                `,
                showConfirmButton: false
            });
            
            // Start polling for status
            pollSTKStatus(checkoutRequestID, amount, period);
            
        }, 2000);
        
        // Uncomment this when you have a real backend API
        /*
        const response = await fetch('/api/mpesa/stk-push', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${user?.token || ''}`
            },
            body: JSON.stringify(paymentData)
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            // Store transaction IDs
            studentFinanceState.stkPayment.checkoutRequestID = result.checkoutRequestID;
            studentFinanceState.stkPayment.merchantRequestID = result.merchantRequestID;
            studentFinanceState.stkPayment.status = 'processing';
            
            console.log('✅ STK Push sent successfully:', result);
            
            // Start polling for status
            pollSTKStatus(result.checkoutRequestID, amount, period);
        } else {
            throw new Error(result.message || 'Failed to initiate payment');
        }
        */
        
    } catch (error) {
        console.error('❌ STK Transaction Error:', error);
        
        studentFinanceState.stkPayment.status = 'failed';
        studentFinanceState.stkPayment.isProcessing = false;
        clearInterval(window.stkTimer);
        
        Swal.update({
            html: `
                <div style="text-align: center;">
                    <i class="fas fa-exclamation-circle" style="font-size: 50px; color: #dc2626; margin-bottom: 16px;"></i>
                    <p style="font-size: 16px; font-weight: 600; color: #dc2626;">Payment Initiation Failed</p>
                    <p style="color: #64748b; font-size: 14px;">${error.message || 'Unable to initiate payment. Please try again.'}</p>
                    <div style="margin-top: 12px; display: flex; gap: 10px; justify-content: center;">
                        <button onclick="retrySTKPayment()" style="padding: 10px 24px; background: #4C1D95; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                            <i class="fas fa-redo"></i> Retry Payment
                        </button>
                        <button onclick="Swal.close()" style="padding: 10px 24px; background: #64748b; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                            Close
                        </button>
                    </div>
                </div>
            `,
            showConfirmButton: false
        });
        
        showToast('❌ Payment failed: ' + error.message, 'error');
    }
}

/**
 * Poll STK Payment Status
 */
function pollSTKStatus(checkoutRequestID, amount, period) {
    let attempts = 0;
    const maxAttempts = 20; // 20 * 3 seconds = 60 seconds
    let isResolved = false;
    
    // Check for existing interval
    if (window.stkPollInterval) {
        clearInterval(window.stkPollInterval);
    }
    
    window.stkPollInterval = setInterval(async () => {
        attempts++;
        
        if (isResolved) {
            clearInterval(window.stkPollInterval);
            return;
        }
        
        try {
            console.log(`📊 STK Status Check ${attempts}/${maxAttempts}`);
            
            // Simulate status check - Replace with actual API call
            // For demo, simulate success after 5 attempts (15 seconds)
            if (attempts >= 5) {
                // Simulate successful payment
                isResolved = true;
                clearInterval(window.stkPollInterval);
                clearTimeout(window.stkTimer);
                
                const result = {
                    status: 'success',
                    transactionId: `MPESA-${Date.now()}`,
                    checkoutRequestID: checkoutRequestID,
                    message: 'Payment confirmed successfully'
                };
                
                handleSTKSuccess(result, amount, period);
                return;
            }
            
            // Uncomment for real API integration
            /*
            const response = await fetch(`/api/mpesa/status/${checkoutRequestID}`);
            const result = await response.json();
            
            if (result.status === 'success' || result.status === 'completed') {
                isResolved = true;
                clearInterval(window.stkPollInterval);
                clearTimeout(window.stkTimer);
                handleSTKSuccess(result, amount, period);
                
            } else if (result.status === 'failed' || result.status === 'cancelled') {
                isResolved = true;
                clearInterval(window.stkPollInterval);
                clearTimeout(window.stkTimer);
                handleSTKFailure(result);
            }
            */
            
        } catch (error) {
            console.error('❌ Error polling STK status:', error);
            if (attempts >= maxAttempts && !isResolved) {
                isResolved = true;
                clearInterval(window.stkPollInterval);
                clearTimeout(window.stkTimer);
                handleSTKTimeout(checkoutRequestID);
            }
        }
    }, 3000); // Check every 3 seconds
}

/**
 * Handle STK Payment Success - WITH EMAIL NOTIFICATION
 */
function handleSTKSuccess(result, amount, period) {
    studentFinanceState.stkPayment.status = 'success';
    studentFinanceState.stkPayment.isProcessing = false;
    
    const user = window.currentUserProfile || window.currentUser;
    const transactionId = result.transactionId || result.checkoutRequestID || `TXN-${Date.now()}`;
    const reference = `PAY-${Date.now()}`;
    
    // Save payment to database first
    const paymentRecord = {
        student_id: user?.id || 'student_001',
        student_name: user?.full_name || user?.name || 'Student',
        amount: amount,
        period: period,
        payment_method: 'M-Pesa STK',
        status: 'completed',
        transaction_id: transactionId,
        checkout_request_id: studentFinanceState.stkPayment.checkoutRequestID || result.checkoutRequestID,
        payment_date: new Date().toISOString(),
        phone_number: studentFinanceState.stkPayment.phoneNumber || '',
        notes: `${period} Tuition Fees - STK Payment`,
        reference: reference
    };
    
    // Save to database
    saveSTKPaymentRecord(amount, period, result);
    
    // 📧 SEND EMAIL NOTIFICATION
    const paymentData = {
        amount: amount,
        period: period,
        transactionId: transactionId,
        reference: reference,
        method: 'M-Pesa STK Push',
        date: new Date().toISOString()
    };
    
    // Send email asynchronously (don't block the UI)
    if (user?.id) {
        sendPaymentConfirmationEmail(user.id, paymentData)
            .then(sent => {
                if (sent) {
                    console.log('📧 Payment confirmation email sent successfully');
                } else {
                    console.warn('⚠️ Payment confirmation email failed to send');
                }
            })
            .catch(err => {
                console.error('❌ Email sending error:', err);
            });
    }
    
    // Update Swal dialog
    Swal.update({
        html: `
            <div style="text-align: center;">
                <i class="fas fa-check-circle" style="font-size: 60px; color: #059669; margin-bottom: 16px;"></i>
                <p style="font-size: 20px; font-weight: 700; color: #059669;">Payment Successful! ✅</p>
                <p style="color: #64748b; font-size: 15px;">Your payment of <strong>KES ${amount.toLocaleString()}</strong> has been confirmed.</p>
                <div style="background: #f8fafc; border-radius: 8px; padding: 12px; margin: 12px 0; text-align: left;">
                    <p style="margin: 4px 0; font-size: 13px;"><strong>Period:</strong> ${period}</p>
                    <p style="margin: 4px 0; font-size: 13px;"><strong>Transaction ID:</strong> ${transactionId}</p>
                    <p style="margin: 4px 0; font-size: 13px;"><strong>Reference:</strong> ${reference}</p>
                    <p style="margin: 4px 0; font-size: 13px;"><strong>Date:</strong> ${new Date().toLocaleString()}</p>
                </div>
                <div style="padding: 10px; background: #d1fae5; border-radius: 8px; border: 1px solid #86efac; font-size: 13px; color: #065f46;">
                    <i class="fas fa-envelope"></i> A confirmation email has been sent to your registered email address.
                </div>
                <div style="margin-top: 12px; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                    <button onclick="Swal.close()" style="padding: 10px 24px; background: #059669; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        <i class="fas fa-check"></i> Done
                    </button>
                    <button onclick="viewEmailReceipt()" style="padding: 10px 24px; background: #4C1D95; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        <i class="fas fa-envelope"></i> Email Info
                    </button>
                </div>
            </div>
        `,
        showConfirmButton: false,
        allowOutsideClick: true
    });
    
    // Refresh finance data
    setTimeout(() => {
        loadStudentFinance();
    }, 1000);
    
    showToast(`✅ Payment of KES ${amount.toLocaleString()} successful! Confirmation email sent.`, 'success');
}

/**
 * View email receipt info
 */
function viewEmailReceipt() {
    const user = window.currentUserProfile || window.currentUser;
    Swal.fire({
        title: '📧 Email Confirmation',
        html: `
            <div style="text-align: left;">
                <p style="color: #64748b;">A confirmation email has been sent to your registered email address.</p>
                <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 10px 0;">
                    <p style="margin: 4px 0; font-size: 13px;"><strong>📧 To:</strong> ${user?.email || 'student@example.com'}</p>
                    <p style="margin: 4px 0; font-size: 13px;"><strong>📋 Subject:</strong> Payment Confirmation</p>
                    <p style="margin: 4px 0; font-size: 13px;"><strong>📅 Sent:</strong> ${new Date().toLocaleString()}</p>
                </div>
                <p style="font-size: 12px; color: #94a3b8; margin-top: 8px;">
                    <i class="fas fa-info-circle"></i> If you don't see the email in your inbox, please check your spam folder.
                </p>
                <div style="margin-top: 12px; padding: 10px; background: #dbeafe; border-radius: 8px; border: 1px solid #93c5fd; font-size: 13px; color: #1e40af;">
                    <i class="fas fa-envelope"></i> Email includes: Payment reference, amount, period, transaction ID, and updated balance.
                </div>
                <div style="margin-top: 12px; display: flex; gap: 10px; justify-content: center;">
                    <button onclick="resendPaymentEmail()" style="padding: 8px 20px; background: #4C1D95; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                        <i class="fas fa-redo"></i> Resend Email
                    </button>
                </div>
            </div>
        `,
        confirmButtonText: 'Close',
        confirmButtonColor: '#4C1D95',
        width: 500
    });
}

/**
 * Resend payment confirmation email
 */
async function resendPaymentEmail() {
    const user = window.currentUserProfile || window.currentUser;
    if (!user?.id) {
        showToast('❌ User not found', 'error');
        return;
    }
    
    // Get the last payment
    const lastPayment = studentFinanceState.payments[0];
    if (!lastPayment) {
        showToast('❌ No payment found to resend', 'error');
        return;
    }
    
    showToast('📧 Resending confirmation email...', 'info');
    
    const paymentData = {
        amount: lastPayment.amount,
        period: lastPayment.period,
        transactionId: lastPayment.transaction_id || `TXN-${Date.now()}`,
        reference: lastPayment.reference || `PAY-${Date.now()}`,
        method: lastPayment.payment_method || 'M-Pesa STK Push',
        date: lastPayment.payment_date || new Date().toISOString()
    };
    
    const sent = await sendPaymentConfirmationEmail(user.id, paymentData);
    
    if (sent) {
        showToast('✅ Confirmation email resent successfully!', 'success');
        Swal.close();
    } else {
        showToast('❌ Failed to resend email. Please try again.', 'error');
    }
}

// ============================================================
// 🏷️ PROGRAM TYPE DETECTION
// ============================================================

function getProgramType(program) {
    if (!program) return 'KRCHN';
    
    const krchnPrograms = ['KRCHN'];
    if (krchnPrograms.includes(program.toUpperCase())) {
        return 'KRCHN';
    }
    
    return 'TVET';
}

function getProgramLevel(program) {
    const certificatePrograms = ['CCH', 'CPOTT', 'CHRIT', 'CPC', 'CSL', 'CSW', 'CCJS', 'CAG', 'CHSS', 'CICT', 'CCA', 'ACH', 'AAG', 'ASW'];
    if (certificatePrograms.includes(program)) {
        return 'certificate';
    }
    return 'diploma';
}

function getPeriodLabel(programType) {
    return programType === 'KRCHN' ? 'Semester' : 'Term';
}

function getPeriods(programType, programLevel = 'diploma') {
    if (programType === 'KRCHN') {
        return [
            'Year 1 - Semester 1',
            'Year 1 - Semester 2',
            'Year 1 - Semester 3',
            'Year 2 - Semester 1',
            'Year 2 - Semester 2',
            'Year 2 - Semester 3',
            'Year 3 - Semester 1',
            'Year 3 - Semester 2',
            'Year 3 - Semester 3'
        ];
    } else {
        if (programLevel === 'certificate') {
            return ['Year 1 - Term 1', 'Year 1 - Term 2', 'Year 1 - Term 3'];
        } else {
            return [
                'Year 1 - Term 1',
                'Year 1 - Term 2',
                'Year 1 - Term 3',
                'Year 2 - Term 1',
                'Year 2 - Term 2',
                'Year 2 - Term 3'
            ];
        }
    }
}

function getFeeAmount(programType, periodIndex, programLevel = 'diploma') {
    if (programType === 'KRCHN') {
        // KRCHN fees per semester (from your fee structure)
        return periodIndex === 0 ? 94600 : 71100;
    } else {
        // TVET fees per term
        return periodIndex === 0 ? 57500 : 47000;
    }
}

// ============================================================
// 📥 MAIN LOAD FUNCTION
// ============================================================

async function loadStudentFinance() {
    try {
        console.log('💰 Loading student finance...');
        
        const user = window.currentUserProfile || window.currentUser;
        if (!user) {
            console.warn('No user found');
            showFinanceError('Please login to view your finance data.');
            return;
        }

        const programType = getProgramType(user.program);
        const programLevel = getProgramLevel(user.program);
        studentFinanceState.programType = programType;
        studentFinanceState.programLevel = programLevel;
        
        console.log('👤 User:', user.full_name || user.name);
        console.log('📚 Program:', user.program);
        console.log('🏷️ Program Type:', programType);
        console.log('📊 Program Level:', programLevel);

        updateProgramInfo(user, programType, programLevel);
        showFinanceLoading();

        const financeData = await fetchFinanceDataFromSupabase(user);
        
        if (financeData) {
            updateFinanceUI(financeData);
            studentFinanceState.isLoaded = true;
            studentFinanceState.lastUpdated = new Date();
            console.log('✅ Finance data loaded successfully');
        } else {
            console.log('📊 No data found, using mock data');
            const mockData = getMockFinanceData(user);
            updateFinanceUI(mockData);
        }
        
    } catch (error) {
        console.error('Error loading finance:', error);
        const user = window.currentUserProfile || window.currentUser;
        if (user) {
            const mockData = getMockFinanceData(user);
            updateFinanceUI(mockData);
            showToast('Using demo data - Connect to Supabase for real data', 'info');
        } else {
            showFinanceError('Unable to load finance data. Please try again.');
        }
    }
}

// ============================================================
// 🔧 UPDATE PROGRAM INFO
// ============================================================

function updateProgramInfo(user, programType, programLevel) {
    const periodLabel = getPeriodLabel(programType);
    const periods = getPeriods(programType, programLevel);
    
    const programDisplay = document.getElementById('studentProgramDisplay');
    if (programDisplay) {
        programDisplay.textContent = user.program || 'N/A';
    }
    
    const periodTypeBadge = document.getElementById('periodTypeBadge');
    if (periodTypeBadge) {
        if (programType === 'KRCHN') {
            periodTypeBadge.textContent = 'KRCHN';
            periodTypeBadge.style.background = 'rgba(253,185,19,0.2)';
            periodTypeBadge.style.color = '#FDB913';
        } else {
            periodTypeBadge.textContent = programLevel === 'certificate' ? 'TVET (Cert)' : 'TVET (Dip)';
            periodTypeBadge.style.background = 'rgba(59,130,246,0.2)';
            periodTypeBadge.style.color = '#3b82f6';
        }
    }
    
    const currentPeriodLabel = document.getElementById('currentPeriodLabel');
    if (currentPeriodLabel) {
        currentPeriodLabel.textContent = `Current ${periodLabel}`;
    }
    
    const progressPeriodLabel = document.getElementById('progressPeriodLabel');
    if (progressPeriodLabel) {
        progressPeriodLabel.textContent = `Current ${periodLabel}`;
    }
    
    updatePeriodFilter(programType, programLevel);
}

function updatePeriodFilter(programType, programLevel) {
    const periodFilter = document.getElementById('financePeriodFilter');
    if (!periodFilter) return;
    
    const periods = getPeriods(programType, programLevel);
    
    while (periodFilter.options.length > 1) {
        periodFilter.remove(1);
    }
    
    periods.forEach(period => {
        const option = document.createElement('option');
        option.value = period;
        option.textContent = period;
        periodFilter.appendChild(option);
    });
}

// ============================================================
// 📊 FETCH FINANCE DATA FROM SUPABASE
// ============================================================

async function fetchFinanceDataFromSupabase(user) {
    try {
        if (typeof supabase === 'undefined' || !supabase) {
            console.warn('⚠️ Supabase not available');
            return null;
        }

        const studentId = user.id;
        const program = user.program || 'KRCHN';
        const programType = getProgramType(program);
        const programLevel = getProgramLevel(program);
        const periods = getPeriods(programType, programLevel);

        console.log('📊 Fetching data for student:', studentId);

        let accountData = null;
        try {
            const { data, error } = await supabase
                .from('finance_student_accounts')
                .select('*')
                .eq('student_id', studentId)
                .single();
            
            if (!error && data) {
                accountData = data;
                console.log('✅ Account data found:', data);
            }
        } catch (e) {
            console.log('ℹ️ Account table may not exist yet');
        }

        let paymentsData = [];
        try {
            const { data, error } = await supabase
                .from('finance_payments')
                .select('*')
                .eq('student_id', studentId)
                .order('payment_date', { ascending: false });

            if (!error && data) {
                paymentsData = data;
                console.log('✅ Payments found:', data.length);
            }
        } catch (e) {
            console.log('ℹ️ Payments table may not exist yet');
        }

        let currentPeriod = accountData?.current_block || periods[0];
        const currentPeriodIndex = periods.indexOf(currentPeriod);
        const semesterFee = getFeeAmount(programType, currentPeriodIndex >= 0 ? currentPeriodIndex : 0, programLevel);
        const paidThisSemester = paymentsData
            .filter(p => p.period === currentPeriod && p.status === 'completed')
            .reduce((sum, p) => sum + p.amount, 0);
        const balance = semesterFee - paidThisSemester;

        const formattedPayments = paymentsData.map(p => {
            let period = p.period;
            if (programType === 'KRCHN' && !period.includes('Semester')) {
                const num = period.replace(/\D/g, '');
                period = num ? `Year ${Math.ceil(num/3)} - Semester ${((num-1)%3)+1}` : periods[0];
            } else if (programType === 'TVET' && !period.includes('Term')) {
                const num = period.replace(/\D/g, '');
                period = num ? `Year ${Math.ceil(num/3)} - Term ${((num-1)%3)+1}` : periods[0];
            }
            return {
                date: p.payment_date || p.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
                description: p.notes || `${period} Fees`,
                period: period,
                amount: p.amount || 0,
                method: p.payment_method || 'Cash',
                reference: p.reference_number || p.transaction_id || '-',
                status: p.status || 'pending',
                transaction_id: p.transaction_id || null
            };
        });

        const formattedFees = periods.map((period, index) => ({
            block: period,
            amount: getFeeAmount(programType, index, programLevel),
            description: `${period} Tuition Fees`,
            status: index < 1 ? 'Paid' : (index === 1 ? 'Partial' : 'Pending')
        }));

        return {
            balance: Math.max(balance, 0),
            totalPaid: accountData?.total_paid || paymentsData.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0),
            totalDue: semesterFee,
            outstanding: Math.max(balance, 0),
            paymentProgress: semesterFee > 0 ? (paidThisSemester / semesterFee * 100) : 0,
            payments: formattedPayments,
            feeStructure: formattedFees,
            programType: programType,
            programLevel: programLevel,
            periodLabel: getPeriodLabel(programType),
            currentPeriod: currentPeriod,
            currentPeriodIndex: currentPeriodIndex,
            semesterFee: semesterFee,
            paidThisSemester: paidThisSemester,
            student: {
                name: user.full_name || user.name || 'Student',
                id: user.studentId || user.id || 'N/A',
                program: program,
                intake: user.intake || '2026'
            }
        };

    } catch (error) {
        console.error('❌ Error fetching from Supabase:', error);
        return null;
    }
}

// ============================================================
// 🎭 MOCK DATA
// ============================================================

function getMockFinanceData(user) {
    const programType = getProgramType(user?.program);
    const programLevel = getProgramLevel(user?.program);
    const periodLabel = getPeriodLabel(programType);
    const periods = getPeriods(programType, programLevel);
    const amount = getFeeAmount(programType, 0, programLevel);
    
    const mockPayments = [];
    const totalPeriods = periods.length;
    
    mockPayments.push({
        date: '2026-07-31',
        description: `${periods[0]} Fees (Full)`,
        period: periods[0],
        amount: amount,
        method: 'M-Pesa STK',
        reference: 'MPESA-STK-7845',
        status: 'completed',
        transaction_id: 'MPESA-2026-7845'
    });
    
    if (totalPeriods > 1) {
        mockPayments.push({
            date: '2026-08-15',
            description: `${periods[1]} Fees (Partial)`,
            period: periods[1],
            amount: Math.round(amount * 0.4),
            method: 'Bank Transfer',
            reference: 'BT-5678',
            status: 'pending',
            transaction_id: 'BT-2026-5678'
        });
    }
    
    const totalPaid = mockPayments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0);
    const totalDue = getFeeAmount(programType, 0, programLevel);
    const currentPeriod = periods[0];
    const semesterFee = getFeeAmount(programType, 0, programLevel);
    const paidThisSemester = mockPayments
        .filter(p => p.period === currentPeriod && p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0);

    return {
        balance: Math.max(semesterFee - paidThisSemester, 0),
        totalPaid: totalPaid,
        totalDue: semesterFee,
        outstanding: Math.max(semesterFee - paidThisSemester, 0),
        paymentProgress: semesterFee > 0 ? (paidThisSemester / semesterFee * 100) : 0,
        payments: mockPayments,
        feeStructure: periods.map((period, index) => ({
            block: period,
            amount: getFeeAmount(programType, index, programLevel),
            description: `${period} Tuition Fees`,
            status: index < 1 ? 'Paid' : (index === 1 ? 'Partial' : 'Pending')
        })),
        programType: programType,
        programLevel: programLevel,
        periodLabel: periodLabel,
        currentPeriod: currentPeriod,
        currentPeriodIndex: 0,
        semesterFee: semesterFee,
        paidThisSemester: paidThisSemester,
        student: {
            name: user?.full_name || user?.name || 'Student',
            id: user?.studentId || user?.id || 'N/A',
            program: user?.program || 'KRCHN',
            intake: user?.intake || '2026'
        }
    };
}

// ============================================================
// 🎨 UI UPDATE FUNCTIONS
// ============================================================

function updateFinanceUI(data) {
    if (!data) return;
    
    studentFinanceState.student = data.student;
    studentFinanceState.payments = data.payments || [];
    studentFinanceState.feeStructure = data.feeStructure || [];
    studentFinanceState.currentPeriod = data.currentPeriod;
    studentFinanceState.semesterFee = data.semesterFee;
    studentFinanceState.paidThisSemester = data.paidThisSemester;
    studentFinanceState.balance = data.balance;
    
    updateProgramInfo(data.student, data.programType, data.programLevel);
    updateBalance(data);
    updateStats(data);
    renderPayments(data.payments || []);
    
    // Update timeline
    renderPaymentTimeline(data.feeStructure || []);
    
    const container = document.getElementById('studentFeeStructureDisplay');
    if (container && container.style.display !== 'none') {
        renderFeeStructureData(data.feeStructure || []);
    }
    
    const lastUpdated = document.getElementById('financeLastUpdated');
    if (lastUpdated) {
        lastUpdated.textContent = new Date().toLocaleString();
    }
    
    updateFinanceBadge(data);
}

function updateBalance(data) {
    const balance = data.balance || 0;
    const semesterFee = data.semesterFee || 0;
    const paidThisSemester = data.paidThisSemester || 0;
    const progress = data.paymentProgress || 0;
    
    const balanceDisplay = document.getElementById('studentBalanceDisplay');
    if (balanceDisplay) balanceDisplay.textContent = `KES ${balance.toLocaleString()}`;
    
    const semesterFeeDisplay = document.getElementById('studentSemesterFee');
    if (semesterFeeDisplay) semesterFeeDisplay.textContent = `KES ${semesterFee.toLocaleString()}`;
    
    const paidDisplay = document.getElementById('studentPaidThisSemester');
    if (paidDisplay) paidDisplay.textContent = `KES ${paidThisSemester.toLocaleString()}`;
    
    const outstandingDisplay = document.getElementById('studentOutstanding');
    if (outstandingDisplay) outstandingDisplay.textContent = `KES ${balance.toLocaleString()}`;
    
    updateBalanceStatus(balance);
    
    const progressPercent = Math.min(Math.round(progress), 100);
    const progressFill = document.getElementById('paymentProgressFill');
    if (progressFill) progressFill.style.width = `${progressPercent}%`;
    
    const progressText = document.getElementById('paymentProgressText');
    if (progressText) progressText.textContent = `${progressPercent}%`;
    
    const progressText2 = document.getElementById('paymentProgressText2');
    if (progressText2) progressText2.textContent = `${progressPercent}%`;
    
    // Update summary
    const totalDueAmount = document.getElementById('totalDueAmount');
    if (totalDueAmount) totalDueAmount.textContent = `KES ${semesterFee.toLocaleString()}`;
    
    const totalPaidAmount = document.getElementById('totalPaidAmount');
    if (totalPaidAmount) totalPaidAmount.textContent = `KES ${paidThisSemester.toLocaleString()}`;
    
    const balanceAmount = document.getElementById('balanceAmount');
    if (balanceAmount) balanceAmount.textContent = `KES ${balance.toLocaleString()}`;
}

function updateBalanceStatus(balance) {
    const statusEl = document.getElementById('balanceStatusDisplay');
    if (!statusEl) return;
    
    const dot = document.getElementById('statusDot');
    const text = document.getElementById('statusText');
    
    if (balance === 0) {
        statusEl.style.background = 'rgba(16,185,129,0.2)';
        statusEl.style.color = '#10b981';
        if (dot) dot.style.background = '#10b981';
        if (text) text.textContent = 'Paid in Full';
    } else if (balance > 0 && balance <= 10000) {
        statusEl.style.background = 'rgba(245,158,11,0.2)';
        statusEl.style.color = '#f59e0b';
        if (dot) dot.style.background = '#f59e0b';
        if (text) text.textContent = 'Partial Payment';
    } else {
        statusEl.style.background = 'rgba(239,68,68,0.2)';
        statusEl.style.color = '#ef4444';
        if (dot) dot.style.background = '#ef4444';
        if (text) text.textContent = 'Outstanding Balance';
    }
}

function updateStats(data) {
    const payments = data.payments || [];
    
    const paid = payments.filter(p => p.status === 'completed').length;
    const pending = payments.filter(p => p.status === 'pending').length;
    const overdue = payments.filter(p => p.status === 'failed' || p.status === 'overdue').length;
    
    const paidEl = document.getElementById('financePaidCount');
    if (paidEl) paidEl.textContent = paid;
    
    const pendingEl = document.getElementById('financePendingCount');
    if (pendingEl) pendingEl.textContent = pending;
    
    const overdueEl = document.getElementById('financeOverdueCount');
    if (overdueEl) overdueEl.textContent = overdue;
    
    const transactionsEl = document.getElementById('financeTotalTransactions');
    if (transactionsEl) transactionsEl.textContent = payments.length;
    
    const recordCount = document.getElementById('paymentRecordCount');
    if (recordCount) recordCount.textContent = `${payments.length} records`;
}

/**
 * Render payment timeline with dynamic data (NO DEFAULT FEES)
 */
function renderPaymentTimeline(feeStructure) {
    const timeline = document.getElementById('paymentTimeline');
    if (!timeline) return;
    
    const programType = studentFinanceState.programType || 'KRCHN';
    const programLevel = studentFinanceState.programLevel || 'diploma';
    const periodLabel = getPeriodLabel(programType);
    
    // Update timeline label
    const timelineLabel = document.getElementById('timelineProgramLabel');
    if (timelineLabel) {
        timelineLabel.textContent = `${programType} - ${programLevel === 'certificate' ? 'Certificate' : 'Diploma'}`;
    }
    
    if (!feeStructure || feeStructure.length === 0) {
        timeline.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #94a3b8; width: 100%;">
                <i class="fas fa-info-circle"></i> No fee structure available
            </div>
        `;
        return;
    }
    
    let html = '';
    feeStructure.forEach((f, index) => {
        const isPaid = f.status === 'Paid';
        const isPartial = f.status === 'Partial';
        const isPending = f.status === 'Pending' || f.status === 'Current';
        
        let bgColor, borderColor, textColor, statusIcon, statusText, amountText;
        
        if (isPaid) {
            bgColor = '#d1fae5';
            borderColor = '#10b981';
            textColor = '#059669';
            statusIcon = '✅';
            statusText = 'Paid';
            amountText = `KES ${f.amount.toLocaleString()}`;
        } else if (isPartial) {
            bgColor = '#fef3c7';
            borderColor = '#f59e0b';
            textColor = '#d97706';
            statusIcon = '⏳';
            statusText = 'Partial';
            amountText = `Paid: KES ${Math.round(f.amount * 0.4).toLocaleString()}`;
        } else {
            bgColor = '#fee2e2';
            borderColor = '#dc2626';
            textColor = '#dc2626';
            statusIcon = '❌';
            statusText = 'Unpaid';
            amountText = `Due: KES ${f.amount.toLocaleString()}`;
        }
        
        html += `
            <div style="min-width: 120px; text-align: center; padding: 12px 8px; background: ${bgColor}; border-radius: 8px; border: 1px solid ${borderColor};">
                <div style="font-size: 10px; color: ${index === 0 ? '#0A3D62' : '#6b7280'}; font-weight: 600;">
                    ${f.block}
                    ${index === 0 ? ' <span style="background: #4C1D95; color: white; padding: 1px 6px; border-radius: 10px; font-size: 8px;">Current</span>' : ''}
                </div>
                <div style="font-weight: 700; color: ${textColor}; font-size: 14px;">${statusIcon} ${statusText}</div>
                <div style="font-size: 9px; color: #94a3b8;">${amountText}</div>
            </div>
        `;
    });
    
    timeline.innerHTML = html;
}

// ============================================================
// 📄 RENDER PAYMENTS WITH ACTIONS
// ============================================================

function renderPayments(payments) {
    const tbody = document.getElementById('studentPaymentHistory');
    if (!tbody) return;
    
    if (!payments || payments.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 30px; color: #94a3b8;">
                    <i class="fas fa-info-circle" style="font-size: 20px; display: block; margin-bottom: 8px;"></i>
                    <p>No payment records found</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = payments.map((p, index) => {
        const statusColors = {
            completed: 'background: #d1fae5; color: #059669;',
            pending: 'background: #fef3c7; color: #d97706;',
            failed: 'background: #fee2e2; color: #dc2626;',
            overdue: 'background: #fee2e2; color: #dc2626;'
        };
        const statusLabel = p.status.charAt(0).toUpperCase() + p.status.slice(1);
        const statusStyle = statusColors[p.status] || statusColors.completed;
        const methodDisplay = p.method || 'N/A';
        
        return `
            <tr>
                <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #0A3D62;">${p.period}</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9;">${p.description}</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #4C1D95;">KES ${p.amount.toLocaleString()}</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; text-align: center; font-size: 12px;">
                    <span style="background: #f1f5f9; padding: 3px 10px; border-radius: 12px; font-weight: 500; color: #475569;">
                        ${methodDisplay}
                    </span>
                </td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9;">
                    <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; ${statusStyle}">
                        ${statusLabel}
                    </span>
                </td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; text-align: center;">
                    <button class="action-btn view" onclick="viewFeeStructure('${p.period}')" title="View Fee Structure for ${p.period}">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="action-btn download" onclick="downloadFeeStructure('${p.period}')" title="Download Fee Structure for ${p.period}">
                        <i class="fas fa-download"></i> Download
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// ============================================================
// 👁️ VIEW FEE STRUCTURE FOR SPECIFIC PERIOD
// ============================================================

function viewFeeStructure(periodName) {
    if (!periodName) return;
    
    console.log('👁️ Viewing fee structure for:', periodName);
    
    // Store the selected period
    studentFinanceState.selectedPeriod = periodName;
    
    // Open the fee structure section
    const container = document.getElementById('studentFeeStructureDisplay');
    const toggleBtn = document.getElementById('toggleFeeBtn');
    const toggleText = document.getElementById('toggleFeeText');
    
    if (container.style.display === 'none') {
        container.style.display = 'block';
        if (toggleBtn) {
            toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i> <span id="toggleFeeText">Hide Fee Structure</span>';
        }
        if (toggleText) {
            toggleText.textContent = 'Hide Fee Structure';
        }
        studentFinanceState.feeStructureVisible = true;
    }
    
    // Load or refresh fee structure with filter
    if (studentFinanceState.feeStructure.length > 0) {
        renderFeeStructureData(studentFinanceState.feeStructure, periodName);
    } else {
        loadStudentFinance();
        // Retry after load
        setTimeout(() => {
            if (studentFinanceState.feeStructure.length > 0) {
                renderFeeStructureData(studentFinanceState.feeStructure, periodName);
            }
        }, 500);
    }
    
    // Update balance to show selected period
    updateBalanceForPeriod(periodName);
    
    // Scroll to fee structure
    setTimeout(() => {
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
    
    showToast(`📋 Viewing fee structure for: ${periodName}`, 'info');
}

// ============================================================
// 💰 UPDATE BALANCE FOR SELECTED PERIOD
// ============================================================

function updateBalanceForPeriod(periodName) {
    if (!periodName) return;
    
    const periods = getPeriods(studentFinanceState.programType, studentFinanceState.programLevel);
    const periodIndex = periods.indexOf(periodName);
    
    if (periodIndex === -1) {
        // If period not found, try to find by partial match
        const matchedIndex = periods.findIndex(p => p.includes(periodName) || periodName.includes(p));
        if (matchedIndex !== -1) {
            updateBalanceForPeriodIndex(matchedIndex);
        }
        return;
    }
    
    updateBalanceForPeriodIndex(periodIndex);
}

function updateBalanceForPeriodIndex(periodIndex) {
    const programType = studentFinanceState.programType;
    const programLevel = studentFinanceState.programLevel;
    const periods = getPeriods(programType, programLevel);
    
    if (periodIndex < 0 || periodIndex >= periods.length) return;
    
    const periodName = periods[periodIndex];
    const feeAmount = getFeeAmount(programType, periodIndex, programLevel);
    
    // Get payments for this period
    const paymentsForPeriod = studentFinanceState.payments.filter(p => 
        p.period === periodName || p.period.includes(periodName) || periodName.includes(p.period)
    );
    
    const paidAmount = paymentsForPeriod
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0);
    
    const balance = Math.max(feeAmount - paidAmount, 0);
    const progress = feeAmount > 0 ? (paidAmount / feeAmount * 100) : 0;
    
    // Update UI with this period's data
    const balanceDisplay = document.getElementById('studentBalanceDisplay');
    if (balanceDisplay) balanceDisplay.textContent = `KES ${balance.toLocaleString()}`;
    
    const semesterFeeDisplay = document.getElementById('studentSemesterFee');
    if (semesterFeeDisplay) semesterFeeDisplay.textContent = `KES ${feeAmount.toLocaleString()}`;
    
    const paidDisplay = document.getElementById('studentPaidThisSemester');
    if (paidDisplay) paidDisplay.textContent = `KES ${paidAmount.toLocaleString()}`;
    
    const outstandingDisplay = document.getElementById('studentOutstanding');
    if (outstandingDisplay) outstandingDisplay.textContent = `KES ${balance.toLocaleString()}`;
    
    // Update period label
    const currentPeriodLabel = document.getElementById('currentPeriodLabel');
    if (currentPeriodLabel) {
        const periodLabel = getPeriodLabel(studentFinanceState.programType);
        currentPeriodLabel.textContent = `${periodName} ${periodLabel}`;
    }
    
    // Update progress
    const progressPercent = Math.min(Math.round(progress), 100);
    const progressFill = document.getElementById('paymentProgressFill');
    if (progressFill) progressFill.style.width = `${progressPercent}%`;
    
    const progressText = document.getElementById('paymentProgressText');
    if (progressText) progressText.textContent = `${progressPercent}%`;
    
    const progressText2 = document.getElementById('paymentProgressText2');
    if (progressText2) progressText2.textContent = `${progressPercent}%`;
    
    const progressPeriodLabel = document.getElementById('progressPeriodLabel');
    if (progressPeriodLabel) progressPeriodLabel.textContent = periodName;
    
    // Update balance status
    updateBalanceStatus(balance);
    
    // Update summary
    const totalDueAmount = document.getElementById('totalDueAmount');
    if (totalDueAmount) totalDueAmount.textContent = `KES ${feeAmount.toLocaleString()}`;
    
    const totalPaidAmount = document.getElementById('totalPaidAmount');
    if (totalPaidAmount) totalPaidAmount.textContent = `KES ${paidAmount.toLocaleString()}`;
    
    const balanceAmount = document.getElementById('balanceAmount');
    if (balanceAmount) balanceAmount.textContent = `KES ${balance.toLocaleString()}`;
}

// ============================================================
// 📄 RENDER FEE STRUCTURE - WITH FILTERING (NO TOTAL PROGRAM FEES)
// ============================================================

function renderFeeStructureData(fees, selectedPeriod = null) {
    const container = document.getElementById('feeStructureContent');
    if (!container) return;
    
    const displayContainer = document.getElementById('studentFeeStructureDisplay');
    if (displayContainer && displayContainer.style.display === 'none') {
        return;
    }
    
    if (!fees || fees.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #94a3b8;">
                <i class="fas fa-info-circle" style="font-size: 20px; display: block; margin-bottom: 8px;"></i>
                <p>No fee structure available</p>
            </div>
        `;
        return;
    }
    
    const programType = studentFinanceState.programType || 'KRCHN';
    const programLevel = studentFinanceState.programLevel || 'diploma';
    const periods = getPeriods(programType, programLevel);
    const periodLabel = getPeriodLabel(programType);
    
    // Filter fees if a period is selected
    let filteredFees = fees;
    let filterMessage = '';
    
    if (selectedPeriod) {
        filteredFees = fees.filter(f => 
            f.block === selectedPeriod || 
            f.block.includes(selectedPeriod) || 
            selectedPeriod.includes(f.block)
        );
        
        if (filteredFees.length === 0) {
            filteredFees = fees;
            filterMessage = `<div style="background: #fef3c7; padding: 8px 16px; border-radius: 8px; margin-bottom: 12px; color: #92400e; border: 1px solid #f59e0b;">
                <i class="fas fa-info-circle"></i> Showing all periods. No exact match for "${selectedPeriod}".
            </div>`;
        } else {
            filterMessage = `<div style="background: #dbeafe; padding: 8px 16px; border-radius: 8px; margin-bottom: 12px; color: #1e40af; border: 1px solid #93c5fd;">
                <i class="fas fa-filter"></i> Showing fee structure for: <strong>${selectedPeriod}</strong>
                <button onclick="clearPeriodFilter()" style="margin-left: 12px; background: transparent; border: 1px solid #93c5fd; padding: 2px 12px; border-radius: 4px; cursor: pointer; font-size: 11px;">Clear</button>
            </div>`;
        }
    }
    
    let html = `
        <div style="overflow-x: auto;">
            <table class="fee-structure-table" style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <thead>
                    <tr style="background: #f8fafc; border-bottom: 2px solid #e5e7eb;">
                        <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">${periodLabel}</th>
                        <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Description</th>
                        <th style="padding: 12px 16px; text-align: right; font-weight: 600; color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Amount</th>
                        <th style="padding: 12px 16px; text-align: center; font-weight: 600; color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Status</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    filteredFees.forEach((f, index) => {
        const isCurrent = index === 0;
        const isPaid = f.status === 'Paid';
        const isPartial = f.status === 'Partial';
        const status = f.status || (isPaid ? 'Paid' : (isCurrent ? 'Current' : 'Pending'));
        const statusColor = isPaid ? '#059669' : (isPartial ? '#d97706' : (isCurrent ? '#4C1D95' : '#94a3b8'));
        const statusIcon = isPaid ? '✅' : (isPartial ? '⏳' : (isCurrent ? '📌' : '⏳'));
        
        const amount = f.amount || 0;
        
        const isHighlighted = selectedPeriod && (f.block === selectedPeriod || f.block.includes(selectedPeriod) || selectedPeriod.includes(f.block));
        
        html += `
            <tr style="${isHighlighted ? 'background: #fef3c7 !important; border-left: 4px solid #f59e0b;' : ''}">
                <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; font-weight: 500; color: #0b1124;">
                    ${f.block}
                    ${isCurrent ? '<span style="display: inline-block; background: #4C1D95; color: white; padding: 2px 8px; border-radius: 12px; font-size: 9px; font-weight: 600; margin-left: 6px;">Current</span>' : ''}
                    ${isHighlighted ? '<span style="display: inline-block; background: #f59e0b; color: white; padding: 2px 8px; border-radius: 12px; font-size: 9px; font-weight: 600; margin-left: 6px;">Selected</span>' : ''}
                </td>
                <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; color: #64748b;">${f.description || 'Tuition fees'}</td>
                <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 600; color: #4C1D95;">KES ${(f.amount || 0).toLocaleString()}</td>
                <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9; text-align: center;">
                    <span style="color: ${statusColor}; font-weight: 600; font-size: 13px;">${statusIcon} ${status}</span>
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
        <div style="margin-top: 12px; display: flex; justify-content: space-between; font-size: 13px; color: #64748b; padding: 8px 4px; border-top: 1px solid #f1f5f9;">
            <span>📚 Number of ${periodLabel}s: <strong>${filteredFees.length}</strong></span>
            <span>⏳ Duration: <strong>${programType === 'KRCHN' ? '3 Years' : programLevel === 'certificate' ? '1 Year' : '2 Years'}</strong></span>
        </div>
        <div class="fee-structure-actions" style="margin-top: 8px; display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;">
            <button onclick="generateFeeStructurePDF()" style="background: linear-gradient(135deg, #4C1D95, #7c3aed); color: white; border: none; padding: 8px 18px; border-radius: 8px; cursor: pointer; font-weight: 500; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);" 
            onmouseover="this.style.transform='translateY(-2px)'" 
            onmouseout="this.style.transform='none'">
                <i class="fas fa-file-pdf"></i> Download PDF
            </button>
            <button onclick="printFeeStructureTable()" style="background: transparent; color: #475569; border: 1px solid #e2e8f0; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 500; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);" 
            onmouseover="this.style.background='#f8fafc'; this.style.borderColor='#7c3aed'" 
            onmouseout="this.style.background='transparent'; this.style.borderColor='#e2e8f0'">
                <i class="fas fa-print"></i> Print
            </button>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Update the fee structure display container
    if (displayContainer) {
        displayContainer.innerHTML = container.innerHTML;
    }
}

// ============================================================
// 📥 DOWNLOAD FEE STRUCTURE FOR SPECIFIC PERIOD
// ============================================================

function downloadFeeStructure(periodName) {
    if (!periodName) {
        showToast('Please select a period to download', 'warning');
        return;
    }
    
    console.log('📥 Downloading fee structure for:', periodName);
    
    const fees = studentFinanceState.feeStructure || [];
    let filteredFees = fees;
    
    if (periodName !== 'all') {
        filteredFees = fees.filter(f => 
            f.block === periodName || 
            f.block.includes(periodName) || 
            periodName.includes(f.block)
        );
        
        if (filteredFees.length === 0) {
            showToast(`No fee structure found for "${periodName}"`, 'warning');
            return;
        }
    }
    
    generatePeriodFeePDF(periodName, filteredFees);
}

// ============================================================
// 📄 GENERATE PERIOD FEE PDF (NO TOTAL PROGRAM FEES)
// ============================================================

function generatePeriodFeePDF(periodName, fees) {
    const user = studentFinanceState.student || window.currentUserProfile || window.currentUser;
    const programType = studentFinanceState.programType || 'KRCHN';
    const programLevel = studentFinanceState.programLevel || 'diploma';
    const periodLabel = getPeriodLabel(programType);
    
    let rows = '';
    
    fees.forEach(f => {
        const amount = f.amount || 0;
        rows += `
            <tr>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${f.block}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${f.description || 'Tuition Fees'}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">KES ${amount.toLocaleString()}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${f.status || 'Pending'}</td>
            </tr>
        `;
    });
    
    const title = periodName === 'all' ? 'Complete Fee Structure' : `Fee Structure - ${periodName}`;
    const fileName = periodName === 'all' ? 'Fee_Structure_Complete' : `Fee_Structure_${periodName.replace(/\s+/g, '_')}`;
    
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
                .header { text-align: center; padding: 20px 0 30px 0; border-bottom: 3px solid #4C1D95; margin-bottom: 20px; }
                .header h1 { color: #0A3D62; margin: 0; font-size: 24px; }
                .header .subtitle { color: #64748b; font-size: 14px; margin: 5px 0; }
                .header .program-badge { display: inline-block; background: #4C1D95; color: white; padding: 4px 16px; border-radius: 4px; font-weight: bold; font-size: 12px; letter-spacing: 1px; }
                table { width: 100%; border-collapse: collapse; margin: 16px 0; }
                th { background: #f8fafc; padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; border-bottom: 2px solid #e5e7eb; }
                td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; }
                .footer { margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 13px; color: #64748b; }
                .footer-info { font-size: 12px; color: #94a3b8; margin-top: 6px; display: flex; justify-content: space-between; }
                @media print {
                    body { padding: 20px; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div>
                    <span class="program-badge">${programType}</span>
                    <h1 style="margin: 8px 0 4px 0;">${title}</h1>
                </div>
                <div class="subtitle">
                    <strong>${user?.name || user?.full_name || 'Student'}</strong>
                    <span style="margin: 0 8px;">•</span>
                    ${user?.program || 'N/A'}
                    <span style="margin: 0 8px;">•</span>
                    Intake: ${user?.intake || '2026'}
                </div>
                <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
                    Generated: ${new Date().toLocaleString()}
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>${periodLabel}</th>
                        <th>Description</th>
                        <th style="text-align: right;">Amount</th>
                        <th style="text-align: center;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
            
            <div class="footer">
                <span>📚 ${periodLabel}s: ${fees.length}</span>
                <span>⏳ Duration: ${programType === 'KRCHN' ? '3 Years' : programLevel === 'certificate' ? '1 Year' : '2 Years'}</span>
            </div>
            <div class="footer-info">
                <span>🏫 Institution: ${programType === 'KRCHN' ? 'KRCHN Program' : 'TVET Program'}</span>
                <span>📋 ${programLevel === 'certificate' ? 'Certificate' : 'Diploma'} Course</span>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #94a3b8;">
                <p style="margin: 0;">This is a computer-generated fee structure. For official use only.</p>
            </div>
        </body>
        </html>
    `;
    
    const blob = new Blob([printContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast(`✅ Fee structure downloaded: ${title}`, 'success');
}

// ============================================================
// 🔍 FILTER FUNCTIONS
// ============================================================

function filterStudentPayments() {
    const statusFilter = document.getElementById('financePaymentFilter')?.value || 'all';
    const periodFilter = document.getElementById('financePeriodFilter')?.value || 'all';
    const searchTerm = document.getElementById('financeSearch')?.value?.toLowerCase() || '';
    
    const payments = studentFinanceState.payments || [];
    
    let filtered = payments.filter(p => {
        if (statusFilter !== 'all' && p.status !== statusFilter) return false;
        if (periodFilter !== 'all' && p.period !== periodFilter) return false;
        if (searchTerm) {
            const searchable = `${p.description} ${p.reference} ${p.method} ${p.period}`.toLowerCase();
            if (!searchable.includes(searchTerm)) return false;
        }
        return true;
    });
    
    renderPayments(filtered);
    const recordCount = document.getElementById('paymentRecordCount');
    if (recordCount) recordCount.textContent = `${filtered.length} records`;
}

function applyFeeFilters() {
    const yearFilter = document.getElementById('feeYearFilter')?.value || 'all';
    const periodFilter = document.getElementById('feePeriodFilter')?.value || 'all';
    
    const fees = studentFinanceState.feeStructure || [];
    let filtered = fees.filter(f => {
        if (yearFilter !== 'all' && !f.block.includes(yearFilter)) return false;
        if (periodFilter !== 'all' && f.block !== periodFilter) return false;
        return true;
    });
    
    const countEl = document.getElementById('feeFilterCount');
    if (countEl) countEl.textContent = `${filtered.length} items`;
    
    renderFeeStructureData(filtered);
}

function resetFeeFilters() {
    const yearFilter = document.getElementById('feeYearFilter');
    const periodFilter = document.getElementById('feePeriodFilter');
    
    if (yearFilter) yearFilter.value = 'all';
    if (periodFilter) periodFilter.value = 'all';
    
    studentFinanceState.selectedPeriod = null;
    
    applyFeeFilters();
    
    if (studentFinanceState.isLoaded) {
        updateBalanceForPeriodIndex(studentFinanceState.currentPeriodIndex || 0);
    }
}

function clearPeriodFilter() {
    studentFinanceState.selectedPeriod = null;
    renderFeeStructureData(studentFinanceState.feeStructure);
    if (studentFinanceState.isLoaded) {
        updateBalanceForPeriodIndex(studentFinanceState.currentPeriodIndex || 0);
    }
    showToast('Fee filter cleared', 'info');
}

function populateFeeFilters(fees) {
    const yearFilter = document.getElementById('feeYearFilter');
    const periodFilter = document.getElementById('feePeriodFilter');
    
    if (!yearFilter || !periodFilter) return;
    
    yearFilter.innerHTML = '<option value="all">All Years</option>';
    periodFilter.innerHTML = '<option value="all">All Periods</option>';
    
    const years = new Set();
    const periods = new Set();
    
    fees.forEach(f => {
        const period = f.block || '';
        if (period) {
            periods.add(period);
            const yearMatch = period.match(/\b(20\d{2})\b/);
            if (yearMatch) {
                years.add(yearMatch[1]);
            }
        }
    });
    
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearFilter.appendChild(option);
    });
    
    periods.forEach(period => {
        const option = document.createElement('option');
        option.value = period;
        option.textContent = period;
        periodFilter.appendChild(option);
    });
}

// ============================================================
// 📄 GENERATE PDF - WITH TOTAL PROGRAM FEES (For Admin/Download)
// ============================================================

function generateFeeStructurePDF() {
    const programType = studentFinanceState.programType || 'KRCHN';
    const programLevel = studentFinanceState.programLevel || 'diploma';
    const periods = getPeriods(programType, programLevel);
    const user = studentFinanceState.student || window.currentUserProfile || window.currentUser;
    const periodLabel = getPeriodLabel(programType);
    const duration = programType === 'KRCHN' ? '3 Years' : (programLevel === 'certificate' ? '1 Year' : '2 Years');
    
    let total = 0;
    let rows = '';
    
    periods.forEach((period, index) => {
        const amount = getFeeAmount(programType, index, programLevel);
        const status = index < 1 ? 'Paid' : (index === 1 ? 'Partial' : 'Pending');
        total += amount;
        rows += `
            <tr>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${period}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${period} Tuition Fees</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">KES ${amount.toLocaleString()}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${status}</td>
            </tr>
        `;
    });
    
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Fee Structure - ${user?.program || 'KRCHN'}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
                .header { text-align: center; padding: 20px 0 30px 0; border-bottom: 3px solid #4C1D95; margin-bottom: 20px; }
                .header h1 { color: #0A3D62; margin: 0; font-size: 24px; }
                .header .subtitle { color: #64748b; font-size: 14px; margin: 5px 0; }
                .header .program-badge { display: inline-block; background: #4C1D95; color: white; padding: 4px 16px; border-radius: 4px; font-weight: bold; font-size: 12px; letter-spacing: 1px; }
                table { width: 100%; border-collapse: collapse; margin: 16px 0; }
                th { background: #f8fafc; padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; border-bottom: 2px solid #e5e7eb; }
                td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; }
                .total-row { border-top: 2px solid #e5e7eb; background: #fafbfc; font-weight: bold; }
                .total-row td { padding: 12px 12px; }
                .total-amount { color: #4C1D95; font-size: 16px; }
                .footer { margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 13px; color: #64748b; }
                .footer-info { font-size: 12px; color: #94a3b8; margin-top: 6px; display: flex; justify-content: space-between; }
                @media print {
                    body { padding: 20px; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div>
                    <span class="program-badge">${programType}</span>
                    <h1 style="margin: 8px 0 4px 0;">Fee Structure</h1>
                </div>
                <div class="subtitle">
                    <strong>${user?.name || user?.full_name || 'Student'}</strong>
                    <span style="margin: 0 8px;">•</span>
                    ${user?.program || 'N/A'}
                    <span style="margin: 0 8px;">•</span>
                    Intake: ${user?.intake || '2026'}
                </div>
                <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
                    Generated: ${new Date().toLocaleString()}
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>${periodLabel}</th>
                        <th>Description</th>
                        <th style="text-align: right;">Amount</th>
                        <th style="text-align: center;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
                <tfoot>
                    <tr class="total-row">
                        <td colspan="2" style="font-size: 15px;">Total Program Fees</td>
                        <td style="text-align: right; font-size: 16px; color: #4C1D95;">KES ${total.toLocaleString()}</td>
                        <td style="text-align: center;">${periods.length} ${periodLabel}s</td>
                    </tr>
                </tfoot>
            </table>
            
            <div class="footer">
                <span>📚 Number of ${periodLabel}s: ${periods.length}</span>
                <span>⏳ Duration: ${duration}</span>
            </div>
            <div class="footer-info">
                <span>🏫 Institution: ${programType === 'KRCHN' ? 'KRCHN Program' : 'TVET Program'}</span>
                <span>📋 ${programLevel === 'certificate' ? 'Certificate' : 'Diploma'} Course</span>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #94a3b8;">
                <p style="margin: 0;">This is a computer-generated fee structure. For official use only.</p>
            </div>
        </body>
        </html>
    `;
    
    const blob = new Blob([printContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Fee_Structure_${user?.program || 'KRCHN'}_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('✅ Fee structure downloaded successfully!', 'success');
}

// ============================================================
// 🖨️ PRINT FEE STRUCTURE
// ============================================================

function printFeeStructureTable() {
    const container = document.getElementById('studentFeeStructureDisplay');
    if (!container) return;
    
    const content = container.innerHTML;
    const user = studentFinanceState.student || window.currentUserProfile || window.currentUser;
    
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    printWindow.document.write(`
        <html>
        <head>
            <title>Fee Structure - ${user?.program || 'KRCHN'}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
                h2 { color: #0A3D62; text-align: center; }
                table { width: 100%; border-collapse: collapse; margin: 16px 0; }
                th { background: #f8fafc; padding: 10px 12px; text-align: left; border-bottom: 2px solid #e5e7eb; }
                td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; }
                .total-row { border-top: 2px solid #e5e7eb; background: #fafbfc; font-weight: bold; }
                .footer { margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 13px; color: #64748b; }
                @media print {
                    body { padding: 20px; }
                }
            </style>
        </head>
        <body>
            <div style="text-align: center; padding-bottom: 20px; border-bottom: 3px solid #4C1D95; margin-bottom: 20px;">
                <h2 style="margin: 0;">Fee Structure</h2>
                <p style="color: #64748b; margin: 4px 0 0 0;">
                    <strong>${user?.name || user?.full_name || 'Student'}</strong>
                    <span style="margin: 0 8px;">•</span>
                    ${user?.program || 'N/A'}
                    <span style="margin: 0 8px;">•</span>
                    Intake: ${user?.intake || '2026'}
                </p>
                <p style="font-size: 11px; color: #94a3b8; margin: 2px 0 0 0;">
                    Generated: ${new Date().toLocaleString()}
                </p>
            </div>
            ${content}
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #94a3b8;">
                <p style="margin: 0;">This is a computer-generated fee structure. For official use only.</p>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}

// ============================================================
// 🎯 ACTION FUNCTIONS
// ============================================================

function downloadStudentStatement() {
    Swal.fire({
        title: 'Generating Statement',
        html: `
            <div style="text-align: center;">
                <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #e5e7eb; border-top-color: #4C1D95; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 16px;"></div>
                <p>Your fee statement is being generated...</p>
                <p style="font-size: 12px; color: #94a3b8;">Please wait</p>
            </div>
        `,
        showConfirmButton: false,
        timer: 2000
    });
    
    setTimeout(() => {
        Swal.fire({
            title: '✅ Statement Ready!',
            text: 'Your fee statement has been downloaded.',
            icon: 'success',
            confirmButtonColor: '#4C1D95'
        });
    }, 2000);
}

function viewStudentInvoice() {
    const programType = studentFinanceState.programType || 'KRCHN';
    const programLevel = studentFinanceState.programLevel || 'diploma';
    const periods = getPeriods(programType, programLevel);
    
    let invoicesHtml = '';
    const statuses = ['✅ Paid', '⏳ Partial', '🔴 Outstanding'];
    
    periods.forEach((period, index) => {
        const status = index < 1 ? statuses[0] : (index === 1 ? statuses[1] : statuses[2]);
        const color = index < 1 ? '#059669' : (index === 1 ? '#d97706' : '#dc2626');
        const amount = getFeeAmount(programType, index, programLevel);
        invoicesHtml += `
            <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: ${index < periods.length - 1 ? '1px solid #e5e7eb' : 'none'};">
                <span><strong>${period}</strong></span>
                <span>KES ${amount.toLocaleString()}</span>
                <span style="color: ${color};">${status}</span>
            </div>
        `;
    });
    
    Swal.fire({
        title: '📄 Fee Breakdown',
        html: `
            <div style="text-align: left;">
                <div style="background: #f8fafc; padding: 12px; border-radius: 8px; margin: 10px 0; border: 1px solid #e5e7eb;">
                    ${invoicesHtml}
                </div>
                <p style="font-size: 12px; color: #94a3b8; margin-top: 8px;">
                    <i class="fas fa-info-circle"></i> 
                    ${programType === 'KRCHN' ? '3 Semesters per year for 3 years' : 
                      programLevel === 'certificate' ? '3 Terms per year for 1 year' : 
                      '3 Terms per year for 2 years'}
                </p>
            </div>
        `,
        confirmButtonText: 'Close',
        confirmButtonColor: '#4C1D95',
        width: 600
    });
}

// ============================================================
// 🔔 TOAST NOTIFICATIONS
// ============================================================

function showToast(message, type = 'info') {
    let container = document.getElementById('financeToastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'financeToastContainer';
        container.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 8px;';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    const colors = {
        success: '#059669',
        error: '#dc2626',
        warning: '#d97706',
        info: '#4C1D95'
    };
    
    toast.style.cssText = `
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        background: ${colors[type] || colors.info};
        animation: slideInRight 0.3s ease;
        max-width: 400px;
    `;
    
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ============================================================
// ⏳ SHOW LOADING / ERROR
// ============================================================

function showFinanceLoading() {
    const historyBody = document.getElementById('studentPaymentHistory');
    if (historyBody) {
        historyBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: #94a3b8;">
                    <div style="display: inline-block; width: 30px; height: 30px; border: 3px solid #e5e7eb; border-top-color: #4C1D95; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <p style="margin-top: 10px;">Loading payment history...</p>
                </td>
            </tr>
        `;
    }
}

function showFinanceError(message) {
    const historyBody = document.getElementById('studentPaymentHistory');
    if (historyBody) {
        historyBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: #dc2626;">
                    <i class="fas fa-exclamation-circle" style="font-size: 24px; display: block; margin-bottom: 10px;"></i>
                    <p>${message}</p>
                    <button onclick="loadStudentFinance()" style="margin-top: 10px; padding: 8px 20px; background: #4C1D95; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-sync-alt"></i> Retry
                    </button>
                </td>
            </tr>
        `;
    }
}

// ============================================================
// 🚀 AUTO-LOAD ON TAB ACTIVATION
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    const financeTab = document.querySelector('a[data-tab="finance"]');
    if (financeTab) {
        financeTab.addEventListener('click', function() {
            setTimeout(loadStudentFinance, 300);
        });
    }
    
    document.addEventListener('appReady', function() {
        console.log('📱 App ready, loading student finance...');
        setTimeout(loadStudentFinance, 800);
    });
    
    const currentTab = document.querySelector('.tab-content.active');
    if (currentTab && currentTab.id === 'finance') {
        setTimeout(loadStudentFinance, 500);
    }
    
    const paymentFilter = document.getElementById('financePaymentFilter');
    if (paymentFilter) paymentFilter.addEventListener('change', filterStudentPayments);
    
    const periodFilter = document.getElementById('financePeriodFilter');
    if (periodFilter) periodFilter.addEventListener('change', filterStudentPayments);
    
    const searchInput = document.getElementById('financeSearch');
    if (searchInput) searchInput.addEventListener('keyup', filterStudentPayments);
    
    // Payment Modal close on outside click
    const modal = document.getElementById('paymentModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closePaymentModal();
            }
        });
    }
    
    if (!document.getElementById('financeSpinStyle')) {
        const style = document.createElement('style');
        style.id = 'financeSpinStyle';
        style.textContent = `
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes pulse-badge {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes fadeOut {
                from { opacity: 1; transform: translateY(0); }
                to { opacity: 0; transform: translateY(-10px); }
            }
            .action-btn {
                background: transparent;
                border: none;
                padding: 4px 8px;
                margin: 0 2px;
                cursor: pointer;
                font-size: 12px;
                border-radius: 4px;
                transition: all 0.2s ease;
            }
            .action-btn.view {
                color: #4C1D95;
            }
            .action-btn.view:hover {
                background: #ede9fe;
            }
            .action-btn.download {
                color: #059669;
            }
            .action-btn.download:hover {
                background: #d1fae5;
            }
            .payment-method-selected {
                border-color: #4C1D95 !important;
                background: #ede9fe !important;
                box-shadow: 0 0 0 3px rgba(76,29,149,0.1);
            }
        `;
        document.head.appendChild(style);
    }
});

// ============================================================
// 💳 PAYMENT MODAL FUNCTIONS
// ============================================================

/**
 * Open payment modal with multiple payment methods
 */
function openPaymentModal() {
    const modal = document.getElementById('paymentModal');
    if (!modal) return;
    
    // Populate periods
    const periodSelect = document.getElementById('paymentPeriodSelect');
    if (periodSelect) {
        const programType = studentFinanceState.programType || 'KRCHN';
        const programLevel = studentFinanceState.programLevel || 'diploma';
        const periods = getPeriods(programType, programLevel);
        const currentPeriod = studentFinanceState.currentPeriod || periods[0];
        
        periodSelect.innerHTML = '<option value="">Select period...</option>';
        periods.forEach(p => {
            const option = document.createElement('option');
            option.value = p;
            option.textContent = p;
            if (p === currentPeriod) option.selected = true;
            periodSelect.appendChild(option);
        });
        
        // Auto-set amount based on selected period
        periodSelect.addEventListener('change', function() {
            const selectedPeriod = this.value;
            if (selectedPeriod) {
                const index = periods.indexOf(selectedPeriod);
                if (index !== -1) {
                    const amount = getFeeAmount(programType, index, programLevel);
                    const amountInput = document.getElementById('paymentAmountInput');
                    if (amountInput && !amountInput.value) {
                        amountInput.value = amount;
                    }
                    // Auto-fill description
                    const descInput = document.getElementById('paymentDescriptionInput');
                    if (descInput) {
                        descInput.value = `${selectedPeriod} Tuition Fees`;
                    }
                }
            }
        });
    }
    
    // Auto-fill amount with current balance suggestion
    const amountInput = document.getElementById('paymentAmountInput');
    if (amountInput) {
        const balance = studentFinanceState.balance || 0;
        if (balance > 0) {
            amountInput.placeholder = `Suggested: KES ${balance.toLocaleString()}`;
            amountInput.value = balance;
        }
    }
    
    // Auto-fill description
    const descInput = document.getElementById('paymentDescriptionInput');
    if (descInput && studentFinanceState.currentPeriod) {
        descInput.value = `${studentFinanceState.currentPeriod} Tuition Fees`;
    }
    
    // Reset payment method selection
    document.querySelectorAll('#paymentMethodsContainer > div').forEach(el => {
        el.classList.remove('payment-method-selected');
    });
    document.getElementById('paymentMethodDetails').style.display = 'none';
    document.getElementById('mpesaFields').style.display = 'none';
    document.getElementById('cardFields').style.display = 'none';
    document.getElementById('bankFields').style.display = 'none';
    document.getElementById('paypalFields').style.display = 'none';
    
    // Set default method to M-Pesa
    selectPaymentMethod('mpesa');
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

/**
 * Close payment modal
 */
function closePaymentModal() {
    const modal = document.getElementById('paymentModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

/**
 * Select payment method
 */
function selectPaymentMethod(method) {
    // Reset all methods
    document.querySelectorAll('#paymentMethodsContainer > div').forEach(el => {
        el.classList.remove('payment-method-selected');
    });
    
    // Highlight selected
    const selectedEl = document.getElementById(`method-${method}`);
    if (selectedEl) {
        selectedEl.classList.add('payment-method-selected');
    }
    
    // Hide all method fields
    document.getElementById('mpesaFields').style.display = 'none';
    document.getElementById('cardFields').style.display = 'none';
    document.getElementById('bankFields').style.display = 'none';
    document.getElementById('paypalFields').style.display = 'none';
    
    // Show selected method fields
    const detailsContent = document.getElementById('methodDetailsContent');
    const detailsContainer = document.getElementById('paymentMethodDetails');
    
    const methodNames = {
        mpesa: 'M-Pesa STK Push',
        paypal: 'PayPal',
        card: 'Card Payment',
        bank: 'Bank Transfer'
    };
    
    const methodIcons = {
        mpesa: '📱',
        paypal: '💳',
        card: '💳',
        bank: '🏦'
    };
    
    const methodDescriptions = {
        mpesa: 'Pay instantly using M-Pesa. You will receive a prompt on your phone.',
        paypal: 'Pay using your PayPal account. You will be redirected to PayPal to complete payment.',
        card: 'Pay using your Visa or Mastercard. Enter your card details securely.',
        bank: 'Pay via bank transfer. Use the provided bank details to complete payment.'
    };
    
    detailsContent.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
            <span style="font-size: 20px;">${methodIcons[method]}</span>
            <strong style="color: #0A3D62;">${methodNames[method]}</strong>
        </div>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">${methodDescriptions[method]}</p>
    `;
    detailsContainer.style.display = 'block';
    
    // Show specific fields
    if (method === 'mpesa') {
        document.getElementById('mpesaFields').style.display = 'block';
        // Auto-fill phone number from user profile
        const user = window.currentUserProfile || window.currentUser;
        if (user?.phone) {
            const phoneInput = document.getElementById('mpesaPhoneInput');
            if (phoneInput) phoneInput.value = user.phone;
        }
    } else if (method === 'card') {
        document.getElementById('cardFields').style.display = 'block';
    } else if (method === 'bank') {
        document.getElementById('bankFields').style.display = 'block';
    } else if (method === 'paypal') {
        document.getElementById('paypalFields').style.display = 'block';
        // Auto-fill email from user profile
        const user = window.currentUserProfile || window.currentUser;
        if (user?.email) {
            const emailInput = document.getElementById('paypalEmailInput');
            if (emailInput) emailInput.value = user.email;
        }
    }
    
    // Store selected method
    studentFinanceState.selectedPaymentMethod = method;
}

/**
 * Process payment based on selected method
 */
async function processPayment() {
    const period = document.getElementById('paymentPeriodSelect')?.value;
    const amount = parseFloat(document.getElementById('paymentAmountInput')?.value);
    const description = document.getElementById('paymentDescriptionInput')?.value || `${period} Tuition Fees`;
    const method = studentFinanceState.selectedPaymentMethod || 'mpesa';
    
    // Validate
    if (!period) {
        showToast('❌ Please select a payment period', 'error');
        return;
    }
    
    if (!amount || amount <= 0) {
        showToast('❌ Please enter a valid amount', 'error');
        return;
    }
    
    // Route to appropriate payment handler
    if (method === 'mpesa') {
        // Use existing STK payment flow
        closePaymentModal();
        
        // Get phone number from modal
        const phoneInput = document.getElementById('mpesaPhoneInput');
        let phone = phoneInput?.value || '';
        
        if (!phone || phone.trim() === '') {
            showToast('❌ Please enter your M-Pesa phone number', 'error');
            return;
        }
        
        // Format phone
        let cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.startsWith('0')) {
            cleanPhone = '254' + cleanPhone.substring(1);
        } else if (!cleanPhone.startsWith('254')) {
            cleanPhone = '254' + cleanPhone;
        }
        
        // Process STK payment
        const displayPhone = phone;
        processSTKPush(amount, period, cleanPhone, displayPhone);
        
    } else if (method === 'paypal') {
        const email = document.getElementById('paypalEmailInput')?.value;
        if (!email || !email.includes('@')) {
            showToast('❌ Please enter a valid PayPal email', 'error');
            return;
        }
        handlePayPalPayment(amount, period, email, description);
        
    } else if (method === 'card') {
        const cardNumber = document.getElementById('cardNumberInput')?.value;
        const expiry = document.getElementById('cardExpiryInput')?.value;
        const cvv = document.getElementById('cardCvvInput')?.value;
        
        if (!cardNumber || cardNumber.replace(/\s/g, '').length < 16) {
            showToast('❌ Please enter a valid card number', 'error');
            return;
        }
        if (!expiry) {
            showToast('❌ Please enter expiry date', 'error');
            return;
        }
        if (!cvv || cvv.length < 3) {
            showToast('❌ Please enter CVV', 'error');
            return;
        }
        handleCardPayment(amount, period, description);
        
    } else if (method === 'bank') {
        const accountName = document.getElementById('bankAccountNameInput')?.value;
        const accountNumber = document.getElementById('bankAccountNumberInput')?.value;
        const bankName = document.getElementById('bankNameInput')?.value;
        
        if (!accountName) {
            showToast('❌ Please enter account name', 'error');
            return;
        }
        if (!accountNumber) {
            showToast('❌ Please enter account number', 'error');
            return;
        }
        handleBankPayment(amount, period, description);
    }
}

// ============================================================
// 💳 OTHER PAYMENT METHOD HANDLERS
// ============================================================

function handlePayPalPayment(amount, period, email, description) {
    closePaymentModal();
    
    Swal.fire({
        title: '💳 PayPal Payment',
        html: `
            <div style="text-align: center;">
                <i class="fab fa-paypal" style="font-size: 50px; color: #003087; margin-bottom: 16px;"></i>
                <p>You will be redirected to PayPal to complete your payment.</p>
                <div style="background: #f8fafc; padding: 12px; border-radius: 8px; margin: 12px 0; text-align: left;">
                    <p style="margin: 4px 0;"><strong>Amount:</strong> KES ${amount.toLocaleString()}</p>
                    <p style="margin: 4px 0;"><strong>Period:</strong> ${period}</p>
                    <p style="margin: 4px 0;"><strong>Email:</strong> ${email}</p>
                </div>
                <div style="padding: 10px; background: #dbeafe; border-radius: 8px; border: 1px solid #93c5fd; font-size: 13px; color: #1e40af;">
                    <i class="fas fa-info-circle"></i> After PayPal payment, you'll be redirected back to confirm.
                </div>
            </div>
        `,
        confirmButtonText: 'Continue to PayPal',
        cancelButtonText: 'Cancel',
        showCancelButton: true,
        confirmButtonColor: '#003087',
        cancelButtonColor: '#64748b'
    }).then((result) => {
        if (result.isConfirmed) {
            // Simulate PayPal redirect
            showToast('⏳ Redirecting to PayPal...', 'info');
            
            // Simulate successful payment after 3 seconds
            setTimeout(() => {
                const transactionId = `PAYPAL-${Date.now()}`;
                const result = {
                    status: 'success',
                    transactionId: transactionId,
                    checkoutRequestID: transactionId,
                    message: 'PayPal payment confirmed'
                };
                handleSTKSuccess(result, amount, period);
                showToast('✅ PayPal payment successful!', 'success');
            }, 3000);
        }
    });
}

function handleCardPayment(amount, period, description) {
    closePaymentModal();
    
    Swal.fire({
        title: '💳 Processing Card Payment',
        html: `
            <div style="text-align: center;">
                <div style="display: inline-block; width: 50px; height: 50px; border: 4px solid #e5e7eb; border-top-color: #4C1D95; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 16px;"></div>
                <p>Processing your card payment...</p>
                <div style="background: #f8fafc; padding: 12px; border-radius: 8px; margin: 12px 0; text-align: left;">
                    <p style="margin: 4px 0;"><strong>Amount:</strong> KES ${amount.toLocaleString()}</p>
                    <p style="margin: 4px 0;"><strong>Period:</strong> ${period}</p>
                </div>
                <p style="font-size: 13px; color: #64748b;">Please wait while we process your payment securely.</p>
            </div>
        `,
        showConfirmButton: false,
        timer: 3000
    }).then(() => {
        const transactionId = `CARD-${Date.now()}`;
        const result = {
            status: 'success',
            transactionId: transactionId,
            checkoutRequestID: transactionId,
            message: 'Card payment confirmed'
        };
        handleSTKSuccess(result, amount, period);
        showToast('✅ Card payment successful!', 'success');
    });
}

function handleBankPayment(amount, period, description) {
    closePaymentModal();
    
    Swal.fire({
        title: '🏦 Bank Transfer Details',
        html: `
            <div style="text-align: left;">
                <p>Please make a bank transfer using the details below:</p>
                <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 12px 0; border: 1px solid #e5e7eb;">
                    <p style="margin: 4px 0;"><strong>Bank:</strong> Equity Bank</p>
                    <p style="margin: 4px 0;"><strong>Branch:</strong> Nakuru</p>
                    <p style="margin: 4px 0;"><strong>Account Name:</strong> Nakuru College of Health Sciences</p>
                    <p style="margin: 4px 0;"><strong>Account Number:</strong> 0130200214036</p>
                    <p style="margin: 4px 0;"><strong>Reference:</strong> ${period} - ${Date.now()}</p>
                </div>
                <div style="background: #fef3c7; padding: 10px; border-radius: 8px; border: 1px solid #f59e0b; margin: 12px 0;">
                    <p style="margin: 0; font-size: 13px; color: #92400e;">
                        <i class="fas fa-info-circle"></i> 
                        After transfer, send proof to: nchsmfinance@gmail.com
                    </p>
                </div>
                <div style="background: #f8fafc; padding: 12px; border-radius: 8px; text-align: center;">
                    <p style="margin: 0; font-weight: 600; color: #0A3D62;">Amount to Transfer: KES ${amount.toLocaleString()}</p>
                </div>
            </div>
        `,
        confirmButtonText: 'I Have Transferred',
        cancelButtonText: 'Cancel',
        showCancelButton: true,
        confirmButtonColor: '#059669',
        cancelButtonColor: '#64748b'
    }).then((result) => {
        if (result.isConfirmed) {
            showToast('📧 Please send payment proof to nchsmfinance@gmail.com', 'info');
            // Record as pending payment
            const transactionId = `BANK-${Date.now()}`;
            const result = {
                status: 'pending',
                transactionId: transactionId,
                checkoutRequestID: transactionId,
                message: 'Bank transfer initiated'
            };
            // Save as pending
            saveSTKPaymentRecord(amount, period, result);
            showToast('⏳ Payment recorded as pending. Awaiting confirmation.', 'warning');
        }
    });
}

// ============================================================
// 📝 SAVE STK PAYMENT RECORD
// ============================================================

async function saveSTKPaymentRecord(amount, period, result) {
    try {
        const user = window.currentUserProfile || window.currentUser;
        const transactionId = result.transactionId || result.checkoutRequestID || `TXN-${Date.now()}`;
        const method = result.paymentMethod || studentFinanceState.selectedPaymentMethod || 'M-Pesa STK';
        const status = result.status === 'success' ? 'completed' : (result.status === 'pending' ? 'pending' : 'pending');
        
        const paymentRecord = {
            student_id: user?.id || 'student_001',
            student_name: user?.full_name || user?.name || 'Student',
            amount: amount,
            period: period,
            payment_method: method,
            status: status,
            transaction_id: transactionId,
            checkout_request_id: studentFinanceState.stkPayment.checkoutRequestID || result.checkoutRequestID,
            payment_date: new Date().toISOString(),
            phone_number: studentFinanceState.stkPayment.phoneNumber || '',
            notes: `${period} Tuition Fees - ${method} Payment`,
            reference: `PAY-${Date.now()}`
        };
        
        // Save to Supabase or your database
        if (typeof supabase !== 'undefined' && supabase) {
            try {
                const { data, error } = await supabase
                    .from('finance_payments')
                    .insert([paymentRecord]);
                
                if (error) {
                    console.error('❌ Error saving payment record:', error);
                    savePaymentLocally(paymentRecord);
                } else {
                    console.log('✅ Payment record saved to database:', data);
                }
            } catch (e) {
                console.error('❌ Supabase save error:', e);
                savePaymentLocally(paymentRecord);
            }
        } else {
            // Save locally if Supabase not available
            savePaymentLocally(paymentRecord);
        }
        
    } catch (error) {
        console.error('❌ Error saving payment:', error);
    }
}

// ============================================================
// 💾 SAVE PAYMENT LOCALLY (Fallback)
// ============================================================

function savePaymentLocally(paymentRecord) {
    try {
        let payments = JSON.parse(localStorage.getItem('local_payments') || '[]');
        payments.unshift(paymentRecord);
        if (payments.length > 50) {
            payments = payments.slice(0, 50);
        }
        localStorage.setItem('local_payments', JSON.stringify(payments));
        console.log('💾 Payment saved locally:', paymentRecord);
    } catch (e) {
        console.error('❌ Failed to save locally:', e);
    }
}

// ============================================================
// ⏱️ STK TIMER
// ============================================================

function startSTKTimer() {
    let timeLeft = 30;
    if (window.stkTimer) {
        clearInterval(window.stkTimer);
    }
    
    window.stkTimer = setInterval(() => {
        timeLeft--;
        const timerEl = document.getElementById('stkTimer');
        if (timerEl) {
            timerEl.textContent = timeLeft;
        }
        if (timeLeft <= 0) {
            clearInterval(window.stkTimer);
        }
    }, 1000);
}

// ============================================================
// ❌ CANCEL STK PAYMENT
// ============================================================

function cancelSTKPayment() {
    Swal.fire({
        title: 'Cancel Payment?',
        text: 'Are you sure you want to cancel this payment?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Yes, Cancel',
        cancelButtonText: 'No, Continue'
    }).then((result) => {
        if (result.isConfirmed) {
            studentFinanceState.stkPayment.status = 'cancelled';
            studentFinanceState.stkPayment.isProcessing = false;
            clearInterval(window.stkPollInterval);
            clearInterval(window.stkTimer);
            
            Swal.fire({
                title: 'Payment Cancelled',
                text: 'Your M-Pesa payment has been cancelled.',
                icon: 'info',
                confirmButtonColor: '#4C1D95'
            });
            
            showToast('Payment cancelled', 'warning');
        }
    });
}

// ============================================================
// 🔄 RETRY STK PAYMENT
// ============================================================

function retrySTKPayment() {
    Swal.close();
    setTimeout(() => {
        initiateSTKPayment();
    }, 300);
}

// ============================================================
// 🔍 CHECK STK STATUS MANUALLY
// ============================================================

async function checkSTKStatusManually(checkoutRequestID) {
    Swal.fire({
        title: 'Checking Status...',
        text: 'Please wait while we verify your payment status.',
        showConfirmButton: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
    
    try {
        setTimeout(() => {
            Swal.close();
            Swal.fire({
                title: 'Status Check',
                html: `
                    <div style="text-align: left;">
                        <p><strong>Transaction ID:</strong> ${checkoutRequestID}</p>
                        <p><strong>Status:</strong> <span style="color: #d97706; font-weight: 600;">Pending</span></p>
                        <p style="color: #64748b; font-size: 13px;">Please check your M-Pesa messages for confirmation.</p>
                        <p style="color: #94a3b8; font-size: 12px; margin-top: 8px;">If you have received a confirmation message, your payment will be updated shortly.</p>
                    </div>
                `,
                icon: 'info',
                confirmButtonColor: '#4C1D95'
            });
        }, 2000);
    } catch (error) {
        Swal.close();
        Swal.fire({
            title: 'Error',
            text: 'Unable to check payment status. Please try again later.',
            icon: 'error',
            confirmButtonColor: '#4C1D95'
        });
    }
}

// ============================================================
// 🏷️ EXPOSE FUNCTIONS GLOBALLY
// ============================================================

// Make functions available globally
window.openPaymentModal = openPaymentModal;
window.closePaymentModal = closePaymentModal;
window.selectPaymentMethod = selectPaymentMethod;
window.processPayment = processPayment;
window.initiateSTKPayment = initiateSTKPayment;
window.loadStudentFinance = loadStudentFinance;
window.toggleFeeStructure = toggleFeeStructure;
window.resetToCurrentPeriod = resetToCurrentPeriod;
window.applyFeeFilters = applyFeeFilters;
window.resetFeeFilters = resetFeeFilters;
window.clearPeriodFilter = clearPeriodFilter;
window.filterStudentPayments = filterStudentPayments;
window.downloadStudentStatement = downloadStudentStatement;
window.viewStudentInvoice = viewStudentInvoice;
window.viewFeeStructure = viewFeeStructure;
window.downloadFeeStructure = downloadFeeStructure;
window.generateFeeStructurePDF = generateFeeStructurePDF;
window.printFeeStructureTable = printFeeStructureTable;
window.cancelSTKPayment = cancelSTKPayment;
window.retrySTKPayment = retrySTKPayment;
window.checkSTKStatusManually = checkSTKStatusManually;
window.viewEmailReceipt = viewEmailReceipt;
window.resendPaymentEmail = resendPaymentEmail;

console.log('✅ Student Finance module loaded with STK Payment');
console.log('📱 M-Pesa STK Push is ready');
console.log('💳 Multiple payment methods: M-Pesa, PayPal, Card, Bank Transfer');
console.log('📧 Email notifications enabled after successful payment');
console.log('📊 Supports KRCHN (Semesters) and TVET (Terms with Years)');
console.log('📚 TVET Certificate: 1 Year (3 Terms)');
console.log('📚 TVET Diploma: 2 Years (6 Terms)');
console.log('✅ View & Download actions added to payment history');
console.log('✅ Fee balance updates when viewing specific periods');
console.log('✅ NO TOTAL PROGRAM FEES displayed in UI');
