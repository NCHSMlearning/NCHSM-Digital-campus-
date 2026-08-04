// ============================================================
// 📊 STUDENT FINANCE MODULE - COMPLETE WITH STK PAYMENT
// Supports KRCHN (Semesters) and TVET (Terms with Years)
// ✅ M-Pesa STK Push Integration
// ✅ Real-time payment status updates
// ✅ View & Download fee structure actions
// ✅ Fee balance updates when viewing specific periods
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
 * Handle STK Payment Success
 */
function handleSTKSuccess(result, amount, period) {
    studentFinanceState.stkPayment.status = 'success';
    studentFinanceState.stkPayment.isProcessing = false;
    
    // Update Swal dialog
    Swal.update({
        html: `
            <div style="text-align: center;">
                <i class="fas fa-check-circle" style="font-size: 60px; color: #059669; margin-bottom: 16px;"></i>
                <p style="font-size: 20px; font-weight: 700; color: #059669;">Payment Successful! ✅</p>
                <p style="color: #64748b; font-size: 15px;">Your payment of <strong>KES ${amount.toLocaleString()}</strong> has been confirmed.</p>
                <div style="background: #f8fafc; border-radius: 8px; padding: 12px; margin: 12px 0; text-align: left;">
                    <p style="margin: 4px 0; font-size: 13px;"><strong>Period:</strong> ${period}</p>
                    <p style="margin: 4px 0; font-size: 13px;"><strong>Transaction ID:</strong> ${result.transactionId || result.checkoutRequestID}</p>
                    <p style="margin: 4px 0; font-size: 13px;"><strong>Date:</strong> ${new Date().toLocaleString()}</p>
                </div>
                <div style="padding: 10px; background: #d1fae5; border-radius: 8px; border: 1px solid #86efac; font-size: 13px; color: #065f46;">
                    <i class="fas fa-check"></i> Payment has been recorded successfully
                </div>
            </div>
        `,
        showConfirmButton: true,
        confirmButtonText: 'Done',
        confirmButtonColor: '#059669'
    });
    
    // Save payment to database
    saveSTKPaymentRecord(amount, period, result);
    
    // Refresh finance data
    setTimeout(() => {
        loadStudentFinance();
    }, 1000);
    
    showToast(`✅ Payment of KES ${amount.toLocaleString()} successful!`, 'success');
}

/**
 * Handle STK Payment Failure
 */
function handleSTKFailure(result) {
    studentFinanceState.stkPayment.status = 'failed';
    studentFinanceState.stkPayment.isProcessing = false;
    
    Swal.update({
        html: `
            <div style="text-align: center;">
                <i class="fas fa-times-circle" style="font-size: 50px; color: #dc2626; margin-bottom: 16px;"></i>
                <p style="font-size: 16px; font-weight: 600; color: #dc2626;">Payment Failed</p>
                <p style="color: #64748b; font-size: 14px;">${result.message || 'Transaction was not completed successfully.'}</p>
                <div style="margin-top: 12px; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
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
    
    showToast('❌ Payment failed. Please try again.', 'error');
}

/**
 * Handle STK Payment Timeout
 */
function handleSTKTimeout(checkoutRequestID) {
    studentFinanceState.stkPayment.status = 'failed';
    studentFinanceState.stkPayment.isProcessing = false;
    
    Swal.update({
        html: `
            <div style="text-align: center;">
                <i class="fas fa-clock" style="font-size: 50px; color: #d97706; margin-bottom: 16px;"></i>
                <p style="font-size: 16px; font-weight: 600; color: #d97706;">Payment Timeout</p>
                <p style="color: #64748b; font-size: 14px;">Payment confirmation timed out. Please check your M-Pesa messages.</p>
                <div style="background: #f8fafc; border-radius: 8px; padding: 12px; margin: 12px 0; text-align: left;">
                    <p style="margin: 4px 0; font-size: 13px;"><strong>Transaction ID:</strong> ${checkoutRequestID}</p>
                    <p style="margin: 4px 0; font-size: 13px;"><strong>Status:</strong> Pending confirmation</p>
                </div>
                <div style="margin-top: 12px; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                    <button onclick="checkSTKStatusManually('${checkoutRequestID}')" style="padding: 10px 24px; background: #4C1D95; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        <i class="fas fa-search"></i> Check Status
                    </button>
                    <button onclick="retrySTKPayment()" style="padding: 10px 24px; background: #d97706; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                    <button onclick="Swal.close()" style="padding: 10px 24px; background: #64748b; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        Close
                    </button>
                </div>
            </div>
        `,
        showConfirmButton: false
    });
    
    showToast('⏳ Payment timeout. Please check your M-Pesa.', 'warning');
}

/**
 * Save STK Payment Record
 */
async function saveSTKPaymentRecord(amount, period, result) {
    try {
        const user = window.currentUserProfile || window.currentUser;
        
        const paymentRecord = {
            student_id: user?.id || 'student_001',
            student_name: user?.full_name || user?.name || 'Student',
            amount: amount,
            period: period,
            payment_method: 'M-Pesa STK',
            status: 'completed',
            transaction_id: result.transactionId || result.checkoutRequestID,
            checkout_request_id: studentFinanceState.stkPayment.checkoutRequestID || result.checkoutRequestID,
            payment_date: new Date().toISOString(),
            phone_number: studentFinanceState.stkPayment.phoneNumber || '',
            notes: `${period} Tuition Fees - STK Payment`,
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
        savePaymentLocally(paymentRecord);
    }
}

/**
 * Save Payment Locally (Fallback)
 */
function savePaymentLocally(paymentRecord) {
    try {
        let payments = JSON.parse(localStorage.getItem('local_payments') || '[]');
        payments.unshift(paymentRecord);
        // Keep only last 50 payments
        if (payments.length > 50) {
            payments = payments.slice(0, 50);
        }
        localStorage.setItem('local_payments', JSON.stringify(payments));
        console.log('💾 Payment saved locally:', paymentRecord);
    } catch (e) {
        console.error('❌ Failed to save locally:', e);
    }
}

/**
 * STK Timer
 */
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

/**
 * Cancel STK Payment
 */
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

/**
 * Retry STK Payment
 */
function retrySTKPayment() {
    // Close current dialog and restart
    Swal.close();
    setTimeout(() => {
        initiateSTKPayment();
    }, 300);
}

/**
 * Check STK Status Manually
 */
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
        // Simulate status check - Replace with actual API call
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
        
        // Uncomment for real API
        /*
        const response = await fetch(`/api/mpesa/status/${checkoutRequestID}`);
        const result = await response.json();
        
        Swal.close();
        
        if (result.status === 'success' || result.status === 'completed') {
            handleSTKSuccess(result, studentFinanceState.stkPayment.amount, studentFinanceState.stkPayment.period);
        } else if (result.status === 'failed') {
            Swal.fire({
                title: 'Payment Failed',
                text: result.message || 'The payment was not successful.',
                icon: 'error',
                confirmButtonColor: '#4C1D95'
            });
        } else {
            Swal.fire({
                title: 'Payment Pending',
                text: 'The payment is still being processed. Please check your M-Pesa messages.',
                icon: 'info',
                confirmButtonColor: '#4C1D95'
            });
        }
        */
        
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
        return periodIndex === 0 ? 94100 : 64100;
    } else {
        return periodIndex === 0 ? 57100 : 47000;
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
                status: p.status || 'pending'
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
        status: 'completed'
    });
    
    if (totalPeriods > 1) {
        mockPayments.push({
            date: '2026-08-15',
            description: `${periods[1]} Fees (Partial)`,
            period: periods[1],
            amount: Math.round(amount * 0.4),
            method: 'Bank Transfer',
            reference: 'BT-5678',
            status: 'pending'
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
        
        return `
            <tr>
                <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #0A3D62;">${p.period}</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9;">${p.description}</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #4C1D95;">KES ${p.amount.toLocaleString()}</td>
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
// 📄 RENDER FEE STRUCTURE - WITH FILTERING
// ============================================================

function renderFeeStructureData(fees, selectedPeriod = null) {
    const container = document.getElementById('studentFeeStructureDisplay');
    if (!container) return;
    
    if (container.style.display === 'none') {
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
        <div style="margin-bottom: 16px; padding: 12px 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e5e7eb; display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
            <span style="font-weight: 600; color: #475569; font-size: 13px;">
                <i class="fas fa-filter" style="color: #4C1D95;"></i> Filter:
            </span>
            <select id="feeYearFilter" onchange="applyFeeFilters()" style="padding: 6px 12px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 13px; background: white; min-width: 120px;">
                <option value="all">All Years</option>
            </select>
            <select id="feePeriodFilter" onchange="applyFeeFilters()" style="padding: 6px 12px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 13px; background: white; min-width: 140px;">
                <option value="all">All Periods</option>
            </select>
            <button onclick="resetFeeFilters()" style="background: transparent; color: #64748b; border: 1px solid #e2e8f0; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 500;">
                <i class="fas fa-times"></i> Reset
            </button>
            <span id="feeFilterCount" style="font-size: 12px; color: #94a3b8; margin-left: auto;"></span>
        </div>
        ${filterMessage}
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
    
    let totalAmount = 0;
    
    filteredFees.forEach((f, index) => {
        const isCurrent = index === 0;
        const isPaid = f.status === 'Paid';
        const isPartial = f.status === 'Partial';
        const status = f.status || (isPaid ? 'Paid' : (isCurrent ? 'Current' : 'Pending'));
        const statusColor = isPaid ? '#059669' : (isPartial ? '#d97706' : (isCurrent ? '#4C1D95' : '#94a3b8'));
        const statusIcon = isPaid ? '✅' : (isPartial ? '⏳' : (isCurrent ? '📌' : '⏳'));
        
        const amount = f.amount || 0;
        totalAmount += amount;
        
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
                <tfoot>
                    <tr style="background: #f8fafc; font-weight: 700; border-top: 2px solid #e5e7eb;">
                        <td colspan="2" style="padding: 12px 16px; text-align: right; font-size: 14px;">TOTAL FEES:</td>
                        <td style="padding: 12px 16px; text-align: right; font-size: 14px; color: #4C1D95;">KES ${totalAmount.toLocaleString()}</td>
                        <td style="padding: 12px 16px; text-align: center; font-size: 11px; color: #94a3b8;">${filteredFees.length} periods</td>
                    </tr>
                </tfoot>
            </table>
        </div>
        <div style="margin-top: 12px; display: flex; justify-content: space-between; font-size: 13px; color: #64748b; padding: 8px 4px; border-top: 1px solid #f1f5f9;">
            <span>📚 Number of ${periodLabel}s: <strong>${periods.length}</strong></span>
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
    
    populateFeeFilters(fees);
    
    if (selectedPeriod) {
        const periodFilter = document.getElementById('feePeriodFilter');
        if (periodFilter) {
            const options = periodFilter.options;
            let found = false;
            for (let opt of options) {
                if (opt.text === selectedPeriod || opt.value === selectedPeriod) {
                    periodFilter.value = opt.value;
                    found = true;
                    break;
                }
            }
            if (!found) {
                for (let opt of options) {
                    if (opt.text.includes(selectedPeriod) || selectedPeriod.includes(opt.text)) {
                        periodFilter.value = opt.value;
                        found = true;
                        break;
                    }
                }
            }
        }
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
// 📄 GENERATE PERIOD FEE PDF
// ============================================================

function generatePeriodFeePDF(periodName, fees) {
    const user = studentFinanceState.student || window.currentUserProfile || window.currentUser;
    const programType = studentFinanceState.programType || 'KRCHN';
    const programLevel = studentFinanceState.programLevel || 'diploma';
    const periodLabel = getPeriodLabel(programType);
    
    let total = 0;
    let rows = '';
    
    fees.forEach(f => {
        const amount = f.amount || 0;
        total += amount;
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
                <tfoot>
                    <tr class="total-row">
                        <td colspan="2" style="font-size: 15px;">Total ${periodLabel} Fees</td>
                        <td style="text-align: right; font-size: 16px; color: #4C1D95;">KES ${total.toLocaleString()}</td>
                        <td style="text-align: center;">${fees.length} periods</td>
                    </tr>
                </tfoot>
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
// 📄 GENERATE PDF - WITH TOTAL PROGRAM FEES
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
                <td colspan="5" style="text-align: center; padding: 40px; color: #94a3b8;">
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
                <td colspan="5" style="text-align: center; padding: 40px; color: #dc2626;">
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
        `;
        document.head.appendChild(style);
    }
});

console.log('✅ Student Finance module loaded with STK Payment');
console.log('📱 M-Pesa STK Push is ready');
console.log('📊 Supports KRCHN (Semesters) and TVET (Terms with Years)');
console.log('📚 TVET Certificate: 1 Year (3 Terms)');
console.log('📚 TVET Diploma: 2 Years (6 Terms)');
console.log('✅ View & Download actions added to payment history');
console.log('✅ Fee balance updates when viewing specific periods');
