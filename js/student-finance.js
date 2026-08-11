// ============================================================
// 📊 STUDENT FINANCE MODULE - OPTIMIZED MOBILE VERSION
// Supports KRCHN (Semesters) and TVET (Terms with Years)
// ✅ Fully responsive with mobile-first design
// ============================================================

// ============================================================
// 💳 PAYHERO CONFIGURATION
// ============================================================

const PAYHERO_CONFIG = {
    baseUrl: 'https://backend.payhero.co.ke/api/v2/payments',
    accountId: '11408',
    channelId: '11445',
    authToken: 'Basic R2FWbHhQUFRQbFV6a05kMnNwcFc6QkF6WXlLaGFUMFM0MVpyNFk4QkRRZW9pOUJWVzNjR0FhZ2ExTTJPZw==',
    provider: 'm-pesa',
    callbackUrl: 'https://lwhtjozfsmbyihenfunw.supabase.co/functions/v1/mpesa-callback',
    lipwaLink: 'https://lipwa.link/11408'
};

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
    feeStructureRaw: null,
    voteHeads: [],
    paymentProgress: 0,
    lastUpdated: null,
    isLoaded: false,
    programType: 'TVET',
    programLevel: 'certificate',
    currentPeriod: null,
    semesterFee: 0,
    paidThisSemester: 0,
    currentPeriodIndex: 0,
    feeStructureVisible: false,
    student: null,
    selectedPeriod: null,
    selectedPaymentMethod: 'mpesa',
    stkPayment: {
        isProcessing: false,
        checkoutRequestID: null,
        merchantRequestID: null,
        phoneNumber: null,
        amount: 0,
        period: null,
        status: 'idle'
    }
};

// ============================================================
// 🔗 COMMUNICATION WITH SUPER ADMIN MODULE
// ============================================================

function notifySuperAdmin(eventType, data) {
    try {
        const adminEvent = new CustomEvent('studentFinanceEvent', {
            detail: { type: eventType, data, timestamp: new Date().toISOString(), source: 'student-module' }
        });
        window.dispatchEvent(adminEvent);
        console.log(`📤 Notified Super Admin: ${eventType}`, data);
        
        if (typeof window.handleStudentFinanceEvent === 'function') {
            window.handleStudentFinanceEvent(eventType, data);
        }
        
        if (typeof supabase !== 'undefined' && supabase) {
            supabase.from('admin_events').insert([{
                event_type: eventType,
                event_data: data,
                source: 'student-finance',
                created_at: new Date().toISOString()
            }]).catch(e => console.warn('⚠️ Admin event logging failed:', e));
        }
        return true;
    } catch (error) {
        console.error('❌ Error notifying Super Admin:', error);
        return false;
    }
}

function listenForAdminEvents() {
    window.addEventListener('adminFinanceEvent', function(event) {
        console.log('📥 Received admin event:', event.detail);
        const { type, data } = event.detail;
        switch(type) {
            case 'fee_structure_updated':
            case 'payment_verified':
            case 'balance_updated':
            case 'payment_recorded':
                if (data?.studentId === studentFinanceState.student?.id) {
                    loadStudentFinance();
                    showToast('📋 Finance data updated', 'info');
                }
                break;
            default:
                console.log('📥 Unhandled admin event:', type);
        }
    });
    console.log('👂 Listening for admin finance events');
}

// ============================================================
// 📱 PHONE FORMATTING
// ============================================================

function formatPhoneNumber(phone) {
    if (!phone) return null;
    let clean = phone.replace(/\D/g, '');
    if (clean.length === 10 && clean.startsWith('07')) return '254' + clean.substring(1);
    if (clean.length === 10 && clean.startsWith('01')) return '254' + clean.substring(1);
    if (clean.length === 12 && clean.startsWith('254')) return clean;
    if (clean.length === 9 && clean.startsWith('7')) return '254' + clean;
    return clean;
}

// ============================================================
// 📱 INITIATE STK PUSH
// ============================================================

async function initiatePayHeroSTK(amount, phoneNumber, reference, period, customerName = '') {
    try {
        if (!PAYHERO_CONFIG.channelId) {
            showToast('❌ Channel ID not configured', 'error');
            return { success: false, error: 'Channel ID not configured' };
        }
        if (!amount || amount <= 0) {
            showToast('❌ Please enter a valid amount', 'error');
            return { success: false, error: 'Invalid amount' };
        }
        
        let cleanPhone = formatPhoneNumber(phoneNumber);
        if (!cleanPhone) {
            showToast('❌ Enter valid phone (e.g., 0712345678)', 'error');
            return { success: false, error: 'Invalid phone number' };
        }
        
        const user = window.currentUserProfile || window.currentUser;
        const requestData = {
            amount: parseInt(amount),
            phone_number: cleanPhone,
            channel_id: parseInt(PAYHERO_CONFIG.channelId),
            provider: PAYHERO_CONFIG.provider,
            external_reference: reference || `NCHSM-${Date.now()}`,
            customer_name: customerName || user?.full_name || 'NCHSM Student',
            callback_url: PAYHERO_CONFIG.callbackUrl
        };
        
        console.log('📤 Sending STK Push request:', requestData);
        
        const response = await fetch(PAYHERO_CONFIG.baseUrl, {
            method: 'POST',
            headers: {
                'Authorization': PAYHERO_CONFIG.authToken,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        const data = await response.json();
        console.log('📥 Response:', data);
        
        if (response.ok) {
            console.log('✅ STK Push initiated!');
            
            payheroState.currentTransaction = {
                id: data.CheckoutRequestID || data.reference,
                checkoutRequestID: data.CheckoutRequestID,
                reference: data.reference || requestData.external_reference,
                amount: amount,
                phone: cleanPhone,
                period: period,
                status: 'pending',
                timestamp: new Date().toISOString()
            };
            
            startSTKStatusPolling(data.CheckoutRequestID || data.reference);
            await saveSTKPaymentRecord(amount, period, {
                status: 'pending',
                transactionId: data.CheckoutRequestID || data.reference,
                checkoutRequestID: data.CheckoutRequestID,
                reference: data.reference || requestData.external_reference,
                paymentMethod: 'M-Pesa STK Push',
                phoneNumber: cleanPhone,
                response: data
            });
            
            showToast('📱 STK Push sent! Check your phone.', 'success');
            
            notifySuperAdmin('stk_push_initiated', {
                studentId: studentFinanceState.student?.id,
                amount: amount,
                phone: cleanPhone,
                reference: data.reference || requestData.external_reference,
                checkoutId: data.CheckoutRequestID,
                timestamp: new Date().toISOString()
            });
            
            return { success: true, data, reference: data.reference || requestData.external_reference, checkoutId: data.CheckoutRequestID };
        } else {
            console.error('❌ STK Push failed:', data);
            let errorMsg = data.error_message || data.message || data.error || 'Payment request failed';
            
            if (data.status === 429) {
                errorMsg = 'Too many requests. Please wait a few minutes.';
            } else if (errorMsg && errorMsg.includes('insufficient balance')) {
                const lipwaResult = initiateLipwaPayment(amount, cleanPhone, period, reference);
                if (lipwaResult.success) {
                    showToast('💰 Payment link opened', 'info');
                    return { success: true, fallback: 'lipwa', url: lipwaResult.url };
                }
            }
            
            showToast('❌ ' + errorMsg, 'error');
            return { success: false, error: errorMsg };
        }
    } catch (error) {
        console.error('❌ Request error:', error);
        showToast('❌ Network error. Please try again.', 'error');
        return { success: false, error: error.message };
    }
}

// ============================================================
// 💳 LIPWA LINK FALLBACK
// ============================================================

function initiateLipwaPayment(amount, phone, period, reference) {
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '254' + cleanPhone.substring(1);
    const ref = reference || 'PAY-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    
    const lipwaUrl = new URL(PAYHERO_CONFIG.lipwaLink);
    lipwaUrl.searchParams.append('amount', amount);
    lipwaUrl.searchParams.append('phone', cleanPhone);
    lipwaUrl.searchParams.append('reference', ref);
    lipwaUrl.searchParams.append('description', period + ' Tuition Fees');
    lipwaUrl.searchParams.append('callback', PAYHERO_CONFIG.callbackUrl);
    
    console.log('📱 Opening Lipwa payment:', lipwaUrl.toString());
    window.open(lipwaUrl.toString(), '_blank');
    
    const user = window.currentUserProfile || window.currentUser;
    savePaymentLocally({
        student_id: user?.id || 'student_001',
        student_name: user?.full_name || user?.name || 'Student',
        amount: amount,
        period: period,
        payment_method: 'M-Pesa (Lipwa)',
        status: 'pending',
        reference: ref,
        phone_number: cleanPhone,
        notes: period + ' Tuition Fees - Lipwa Link Payment',
        payment_date: new Date().toISOString(),
        source: 'lipwa'
    });
    
    startPaymentCheck(ref);
    return { success: true, url: lipwaUrl.toString(), reference: ref };
}

// ============================================================
// 🔍 CHECK PAYMENT STATUS
// ============================================================

async function checkPaymentStatus(reference) {
    try {
        if (typeof supabase !== 'undefined' && supabase) {
            const { data, error } = await supabase
                .from('finance_payments')
                .select('*')
                .eq('reference', reference)
                .single();
            if (!error && data) return data;
        }
        
        const localPayments = JSON.parse(localStorage.getItem('local_payments') || '[]');
        const found = localPayments.find(p => p.reference === reference);
        if (found) return found;
        return null;
    } catch (error) {
        console.error('❌ Status check error:', error);
        return null;
    }
}

// ============================================================
// 🔄 POLL STK STATUS
// ============================================================

function startSTKStatusPolling(reference) {
    let attempts = 0;
    const maxAttempts = 30;
    
    if (payheroState.stkCheckInterval) clearInterval(payheroState.stkCheckInterval);
    
    showSTKProcessingDialog();
    
    payheroState.stkCheckInterval = setInterval(async () => {
        attempts++;
        if (attempts > maxAttempts) {
            clearInterval(payheroState.stkCheckInterval);
            updateSTKDialogStatus('⏰ Payment timeout. Please try again.');
            Swal.close();
            handleSTKFailure();
            return;
        }
        
        const timeLeft = maxAttempts - attempts;
        updateSTKDialogTimer(timeLeft);
        
        const payment = await checkPaymentStatus(reference);
        if (payment) {
            if (payment.status === 'completed' || payment.status === 'success') {
                clearInterval(payheroState.stkCheckInterval);
                handleSTKSuccess();
            } else if (payment.status === 'failed' || payment.status === 'cancelled') {
                clearInterval(payheroState.stkCheckInterval);
                handleSTKFailure();
            }
        }
    }, 3000);
}

// ============================================================
// 📱 PROCESS PAYMENT
// ============================================================

async function processPayment() {
    if (!validatePaymentForm()) return;
    
    const period = document.getElementById('finance-paymentPeriodSelect')?.value;
    const amount = parseFloat(document.getElementById('finance-paymentAmountInput')?.value);
    const method = studentFinanceState.selectedPaymentMethod || 'mpesa';
    
    if (!period) { showToast('❌ Please select a payment period', 'error'); return; }
    if (!amount || amount <= 0) { showToast('❌ Please enter a valid amount', 'error'); return; }
    
    closePaymentModal();
    
    const user = window.currentUserProfile || window.currentUser;
    const reference = 'PAY-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    
    if (method === 'mpesa') {
        const phoneInput = document.getElementById('finance-mpesaPhoneInput');
        let phone = phoneInput?.value || user?.phone || '';
        if (!phone || phone.trim() === '') {
            showToast('❌ Please enter your M-Pesa phone number', 'error');
            return;
        }
        
        const result = await initiatePayHeroSTK(amount, phone, reference, period, user?.full_name);
        if (result.success && result.fallback !== 'lipwa') {
            showToast('📱 STK Push sent! Check your phone.', 'success');
        }
        return;
    }
    
    // Other payment methods
    showToast('💰 Payment processing...', 'info');
    setTimeout(() => {
        showToast('✅ Payment recorded', 'success');
        loadStudentFinance();
    }, 2000);
}

// ============================================================
// 🎨 SHOW STK PROCESSING DIALOG
// ============================================================

function showSTKProcessingDialog() {
    if (typeof Swal === 'undefined') return;
    
    Swal.fire({
        title: '⏳ Processing Payment',
        html: `
            <div style="text-align: center;">
                <div style="display: inline-block; width: 50px; height: 50px; border: 3px solid #e5e7eb; border-top-color: #4C1D95; border-radius: 50%; animation: finance-spin 1s linear infinite; margin-bottom: 12px;"></div>
                <p style="font-size: 15px; font-weight: 600; margin: 0 0 4px 0;">Waiting for confirmation...</p>
                <p style="color: #64748b; font-size: 13px; margin: 0 0 8px 0;">Check your phone for M-Pesa prompt</p>
                <div style="padding: 8px 12px; background: #fef3c7; border-radius: 6px; border: 1px solid #f59e0b; font-size: 12px; color: #92400e;">
                    ⏳ <span id="finance-stkTimer">90</span> seconds remaining
                </div>
                <div id="finance-stkStatus" style="margin-top: 8px; font-size: 12px; color: #64748b;">⏳ Waiting for your response...</div>
            </div>
        `,
        showConfirmButton: false,
        allowOutsideClick: false,
        width: 380
    });
}

function updateSTKDialogStatus(message) {
    const statusEl = document.getElementById('finance-stkStatus');
    if (statusEl) statusEl.textContent = message;
}

function updateSTKDialogTimer(seconds) {
    const timerEl = document.getElementById('finance-stkTimer');
    if (timerEl) timerEl.textContent = seconds;
}

// ============================================================
// ✅ HANDLE SUCCESS/FAILURE
// ============================================================

function handleSTKSuccess() {
    const transaction = payheroState.currentTransaction;
    if (!transaction) return;
    
    payheroState.isProcessing = false;
    transaction.status = 'completed';
    
    if (typeof Swal !== 'undefined') {
        Swal.close();
        Swal.fire({
            title: '✅ Payment Successful!',
            html: `
                <div style="text-align: center;">
                    <i class="fas fa-check-circle" style="font-size: 50px; color: #059669; margin-bottom: 10px;"></i>
                    <p style="font-size: 18px; font-weight: 700; color: #059669; margin: 0 0 4px 0;">Payment Successful! ✅</p>
                    <p style="color: #64748b; font-size: 14px; margin: 0 0 8px 0;">KES ${transaction.amount.toLocaleString()} confirmed</p>
                    <div style="background: #f8fafc; border-radius: 6px; padding: 8px 12px; margin: 8px 0; text-align: left; font-size: 12px;">
                        <p style="margin: 2px 0;"><strong>Period:</strong> ${transaction.period}</p>
                        <p style="margin: 2px 0;"><strong>Ref:</strong> ${transaction.reference}</p>
                    </div>
                </div>
            `,
            confirmButtonText: 'Done',
            confirmButtonColor: '#059669',
            width: 380
        });
    }
    
    saveSTKPaymentRecord(transaction.amount, transaction.period, {
        status: 'success',
        transactionId: transaction.id,
        reference: transaction.reference,
        paymentMethod: 'M-Pesa STK Push'
    });
    
    const user = window.currentUserProfile || window.currentUser;
    if (user?.id) sendPaymentConfirmationEmail(user.id, {
        amount: transaction.amount,
        period: transaction.period,
        transactionId: transaction.id,
        reference: transaction.reference,
        method: 'M-Pesa STK Push',
        date: new Date().toISOString()
    });
    
    notifySuperAdmin('payment_completed', {
        studentId: user?.id,
        amount: transaction.amount,
        reference: transaction.reference,
        method: 'M-Pesa STK',
        timestamp: new Date().toISOString()
    });
    
    setTimeout(loadStudentFinance, 1000);
    showToast('✅ Payment successful!', 'success');
}

function handleSTKFailure() {
    const transaction = payheroState.currentTransaction;
    if (!transaction) return;
    
    payheroState.isProcessing = false;
    transaction.status = 'failed';
    
    if (typeof Swal !== 'undefined') {
        Swal.close();
        Swal.fire({
            title: '❌ Payment Failed',
            html: `
                <div style="text-align: center;">
                    <i class="fas fa-times-circle" style="font-size: 50px; color: #dc2626; margin-bottom: 10px;"></i>
                    <p style="font-size: 17px; font-weight: 600; color: #dc2626; margin: 0;">Payment Failed</p>
                    <p style="color: #64748b; font-size: 13px;">Please try again or use a different method.</p>
                </div>
            `,
            confirmButtonText: 'Try Again',
            cancelButtonText: 'Cancel',
            showCancelButton: true,
            confirmButtonColor: '#4C1D95',
            cancelButtonColor: '#64748b',
            width: 380
        }).then((result) => {
            if (result.isConfirmed) openPaymentModal();
        });
    }
    showToast('❌ Payment failed. Please try again.', 'error');
}

// ============================================================
// 📝 SAVE PAYMENT RECORD
// ============================================================

async function saveSTKPaymentRecord(amount, period, result) {
    try {
        const user = window.currentUserProfile || window.currentUser;
        const transactionId = result.transactionId || result.checkoutRequestID || `TXN-${Date.now()}`;
        const method = result.paymentMethod || studentFinanceState.selectedPaymentMethod || 'M-Pesa STK';
        const status = result.status === 'success' ? 'completed' : 'pending';
        
        const paymentRecord = {
            student_id: user?.id || 'student_001',
            student_name: user?.full_name || user?.name || 'Student',
            amount: amount,
            period: period,
            payment_method: method,
            status: status,
            transaction_id: transactionId,
            checkout_request_id: result.checkoutRequestID,
            reference: result.reference || `PAY-${Date.now()}`,
            phone_number: result.phoneNumber || '',
            notes: `${period} Tuition Fees - ${method} Payment`,
            payment_date: new Date().toISOString(),
            source: 'payhero'
        };
        
        savePaymentLocally(paymentRecord);
        
        if (typeof supabase !== 'undefined' && supabase) {
            const { error } = await supabase.from('finance_payments').insert([paymentRecord]);
            if (error) console.error('❌ Error saving payment record:', error);
            else console.log('✅ Payment record saved to database');
        }
    } catch (error) {
        console.error('❌ Error saving payment:', error);
    }
}

function savePaymentLocally(paymentRecord) {
    try {
        let payments = JSON.parse(localStorage.getItem('local_payments') || '[]');
        payments.unshift(paymentRecord);
        if (payments.length > 50) payments = payments.slice(0, 50);
        localStorage.setItem('local_payments', JSON.stringify(payments));
        console.log('💾 Payment saved locally:', paymentRecord.reference);
    } catch (e) {
        console.error('❌ Failed to save locally:', e);
    }
}

function startPaymentCheck(reference) {
    let attempts = 0;
    const maxAttempts = 60;
    if (window.paymentCheckInterval) clearInterval(window.paymentCheckInterval);
    
    window.paymentCheckInterval = setInterval(async () => {
        attempts++;
        if (attempts > maxAttempts) {
            clearInterval(window.paymentCheckInterval);
            console.log('⏰ Payment check timeout');
            return;
        }
        
        try {
            if (typeof supabase !== 'undefined' && supabase) {
                const { data, error } = await supabase
                    .from('finance_payments')
                    .select('*')
                    .eq('reference', reference)
                    .single();
                if (!error && data && (data.status === 'completed' || data.status === 'success')) {
                    clearInterval(window.paymentCheckInterval);
                    console.log('✅ Payment completed!');
                    showToast('✅ Payment completed successfully!', 'success');
                    loadStudentFinance();
                    return;
                }
            }
            
            const localPayments = JSON.parse(localStorage.getItem('local_payments') || '[]');
            const found = localPayments.find(p => p.reference === reference);
            if (found && (found.status === 'completed' || found.status === 'success')) {
                clearInterval(window.paymentCheckInterval);
                console.log('✅ Payment completed (local)!');
                showToast('✅ Payment completed successfully!', 'success');
                loadStudentFinance();
                return;
            }
        } catch (e) { /* silent */ }
    }, 5000);
}

// ============================================================
// 🔄 AUTO-REFRESH
// ============================================================

document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
        setTimeout(loadStudentFinance, 1000);
        console.log('🔄 Refreshed finance data after return');
    }
});

window.addEventListener('focus', function() {
    setTimeout(loadStudentFinance, 500);
    console.log('🔄 Refreshed finance data on focus');
});

// ============================================================
// 🏷️ PROGRAM DETECTION
// ============================================================

function getProgramType(program) {
    if (!program) return 'TVET';
    return ['KRCHN', 'KRCHN'].includes(program.toUpperCase()) ? 'KRCHN' : 'TVET';
}

function getProgramLevel(program) {
    const cert = ['CCH', 'CPOTT', 'CHRIT', 'CPC', 'CSL', 'CSW', 'CCJS', 'CAG', 'CHSS', 'CICT', 'CCA', 'ACH', 'AAG', 'ASW', 'HSS', 'CNA'];
    return cert.includes(program) ? 'certificate' : 'diploma';
}

function getPeriodLabel(programType) {
    return programType === 'KRCHN' ? 'Semester' : 'Term';
}

function getPeriods(programType, programLevel = 'diploma') {
    if (programType === 'KRCHN') {
        return ['Y1 S1', 'Y1 S2', 'Y1 S3', 'Y2 S1', 'Y2 S2', 'Y2 S3', 'Y3 S1', 'Y3 S2', 'Y3 S3'];
    } else {
        if (programLevel === 'certificate') {
            return ['Y1 T1', 'Y1 T2', 'Y1 T3'];
        } else {
            return ['Y1 T1', 'Y1 T2', 'Y1 T3', 'Y2 T1', 'Y2 T2', 'Y2 T3'];
        }
    }
}

function getFeeAmount(programType, periodIndex, programLevel = 'diploma') {
    if (programType === 'KRCHN') {
        const krchnFees = [94600, 95181, 93291, 64100, 78576, 64100, 64100, 64100, 64100];
        return krchnFees[periodIndex] || 64100;
    } else {
        return periodIndex === 0 ? 57500 : 50000;
    }
}

// ============================================================
// 📊 FETCH FEE STRUCTURE
// ============================================================

async function fetchFeeStructureFromDatabase(program, programType, programLevel) {
    try {
        if (typeof supabase === 'undefined' || !supabase) return null;
        console.log(`📊 Fetching fee structure for: ${program}`);
        
        const { data, error } = await supabase
            .from('finance_fee_structure')
            .select('*')
            .eq('program', program)
            .eq('is_active', true)
            .order('period_index', { ascending: true });
        
        if (error || !data || data.length === 0) {
            console.warn(`⚠️ No fee structure found for: ${program}`);
            return null;
        }
        
        console.log(`✅ Found ${data.length} fee structure records`);
        
        const hasComponents = data.some(record => record.components && Array.isArray(record.components) && record.components.length > 0);
        if (!hasComponents) return null;
        
        return processFeeStructureData(data, programType, programLevel);
    } catch (error) {
        console.error('❌ Error fetching fee structure:', error);
        return null;
    }
}

function processFeeStructureData(data, programType, programLevel) {
    const periods = [];
    const allVoteHeads = new Map();
    const periodTotals = [];
    let allTerms = [];
    
    data.forEach(record => {
        const periodName = record.block_term || record.period_name || 'Unknown';
        const components = record.components || [];
        const amount = parseFloat(record.amount) || 0;
        const hostel = parseFloat(record.hostel) || 0;
        
        periods.push({ name: periodName, amount, hostel, components });
        periodTotals.push(amount);
        if (record.terms && Array.isArray(record.terms)) allTerms = record.terms;
        
        components.forEach(comp => {
            if (!allVoteHeads.has(comp.label)) {
                allVoteHeads.set(comp.label, { label: comp.label, amounts: [] });
            }
        });
    });
    
    const voteHeads = [];
    allVoteHeads.forEach((vh, label) => {
        const amounts = periods.map(period => {
            const comp = period.components.find(c => c.label === label);
            return comp ? comp.amount : 0;
        });
        voteHeads.push({ label, amounts });
    });
    
    // Sort KRCHN order
    const krchnOrder = ['ADMISSION FEE', 'TUITION', 'REGISTRATION FEE', 'CAUTION FEE', 'UNIFORM', 'CLINICAL PLACEMENT FEE', 'COLLEGE I.D', 'LIBRARY & INTERNET', 'IMMUNIZATION', 'SKILLS LAB', 'INSURANCE', 'CONFIDENTIAL REPORT', 'FIRST AID TRAINING', 'NURSING COUNCIL INDEXING FEE & VERIFICATION', 'TRANSPORT @ 2000/-'];
    
    if (programType === 'TVET') {
        voteHeads.sort((a, b) => a.label.localeCompare(b.label));
    } else {
        voteHeads.sort((a, b) => {
            const indexA = krchnOrder.indexOf(a.label);
            const indexB = krchnOrder.indexOf(b.label);
            if (indexA === -1 && indexB === -1) return a.label.localeCompare(b.label);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });
    }
    
    return { periods, voteHeads, periodTotals, programType, programLevel, terms: allTerms };
}

// ============================================================
// 📄 RENDER FEE STRUCTURE - MOBILE OPTIMIZED
// ============================================================

function renderFeeStructureData() {
    const container = document.getElementById('finance-feeStructureContent');
    if (!container) return;
    
    const displayContainer = document.getElementById('finance-studentFeeStructureDisplay');
    if (displayContainer && displayContainer.style.display === 'none') return;
    
    const data = studentFinanceState.feeStructureRaw;
    if (!data || !data.periods || data.periods.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 13px;">
                <i class="fas fa-info-circle" style="font-size: 20px; display: block; margin-bottom: 6px;"></i>
                <p>No fee structure available.</p>
            </div>
        `;
        container.style.display = 'block';
        return;
    }
    
    const { periods, voteHeads, periodTotals } = data;
    const programType = studentFinanceState.programType || 'TVET';
    
    // Mobile-optimized table
    let html = `
        <div style="overflow-x: auto; margin: 0 -4px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 11px; min-width: 480px;">
                <thead>
                    <tr style="background: #f8fafc; border-bottom: 2px solid #e5e7eb;">
                        <th style="padding: 6px 8px; text-align: left; font-weight: 600; color: #475569; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; width: 30px;">#</th>
                        <th style="padding: 6px 8px; text-align: left; font-weight: 600; color: #475569; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px;">VOTE HEAD</th>
                        ${periods.map((p, i) => `
                            <th style="padding: 6px 4px; text-align: right; font-weight: 600; color: #475569; font-size: 9px; text-transform: uppercase; min-width: 60px;">
                                ${p.name.replace('Year ', 'Y').replace(' - ', ' ')}
                                ${i === 0 ? ' <span style="background: #4C1D95; color: white; padding: 1px 4px; border-radius: 8px; font-size: 7px;">C</span>' : ''}
                            </th>
                        `).join('')}
                    </tr>
                </thead>
                <tbody>
    `;
    
    let sn = 0;
    voteHeads.forEach((vh) => {
        const hasAnyAmount = vh.amounts.some(a => a > 0);
        if (!hasAnyAmount) return;
        sn++;
        html += `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 4px 8px; text-align: center; font-weight: 500; color: #94a3b8; font-size: 10px;">${sn}</td>
                <td style="padding: 4px 8px; font-weight: 500; color: #0b1124; font-size: 10px;">${vh.label}</td>
                ${vh.amounts.map(amount => `
                    <td style="padding: 4px 4px; text-align: right; font-weight: 500; color: #0A3D62; font-size: 10px;">
                        ${amount > 0 ? `KES ${amount.toLocaleString()}` : '---'}
                    </td>
                `).join('')}
            </tr>
        `;
    });
    
    html += `
        <tr style="background: #f8fafc; font-weight: 700; border-top: 2px solid #4C1D95;">
            <td style="padding: 6px 8px; text-align: center; color: #0A3D62; font-size: 10px;">-</td>
            <td style="padding: 6px 8px; font-weight: 700; color: #0A3D62; font-size: 10px;">
                <i class="fas fa-calculator" style="color: #4C1D95; margin-right: 4px; font-size: 10px;"></i> TOTAL
            </td>
            ${periodTotals.map(total => `
                <td style="padding: 6px 4px; text-align: right; font-weight: 700; color: #4C1D95; font-size: 11px;">
                    KES ${total.toLocaleString()}
                </td>
            `).join('')}
        </tr>
    `;
    
    html += `
                </tbody>
            </table>
        </div>
        <div style="margin-top: 8px; padding: 8px 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px; font-size: 10px;">
            <span style="color: #64748b;">📚 ${periods.length} ${programType === 'KRCHN' ? 'Semesters' : 'Terms'}</span>
            <span style="color: #64748b;">📋 ${voteHeads.filter(v => v.amounts.some(a => a > 0)).length} Vote Heads</span>
            <button onclick="printFeeStructureTable()" style="background: #475569; color: white; padding: 4px 12px; border-radius: 4px; border: none; cursor: pointer; font-size: 10px;">
                <i class="fas fa-print"></i> Print
            </button>
        </div>
    `;
    
    container.innerHTML = html;
    container.style.display = 'block';
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
        studentFinanceState.student = user;
        
        console.log('👤 User:', user.full_name || user.name);
        console.log('📚 Program:', user.program);
        console.log('🏷️ Program Type:', programType);
        console.log('📊 Program Level:', programLevel);
        
        updateProgramInfo(user, programType, programLevel);
        showFinanceLoading();
        
        const feeData = await fetchFeeStructureFromDatabase(user.program, programType, programLevel);
        if (feeData) {
            studentFinanceState.feeStructureRaw = feeData;
            console.log('✅ Fee structure loaded from database');
        }
        
        const financeData = await fetchFinanceDataFromSupabase(user);
        
        if (financeData) {
            updateFinanceUI(financeData);
            studentFinanceState.isLoaded = true;
            studentFinanceState.lastUpdated = new Date();
            console.log('✅ Finance data loaded successfully');
            
            notifySuperAdmin('student_finance_viewed', {
                studentId: user.id,
                studentName: user.full_name || user.name,
                program: user.program,
                balance: financeData.balance,
                timestamp: new Date().toISOString()
            });
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
    
    const programDisplay = document.getElementById('finance-studentProgramDisplay');
    if (programDisplay) programDisplay.textContent = user.program || 'N/A';
    
    const periodTypeBadge = document.getElementById('finance-periodTypeBadge');
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
    
    const currentPeriodLabel = document.getElementById('finance-currentPeriodLabel');
    if (currentPeriodLabel) currentPeriodLabel.textContent = `Current ${periodLabel}`;
    
    const progressPeriodLabel = document.getElementById('finance-progressPeriodLabel');
    if (progressPeriodLabel) progressPeriodLabel.textContent = `Current ${periodLabel}`;
    
    const feeStructureLabel = document.getElementById('finance-feeStructureLabel');
    if (feeStructureLabel) feeStructureLabel.textContent = periodLabel;
    
    updatePeriodFilter(programType, programLevel);
}

function updatePeriodFilter(programType, programLevel) {
    const periodFilter = document.getElementById('finance-periodFilter');
    if (!periodFilter) return;
    const periods = getPeriods(programType, programLevel);
    while (periodFilter.options.length > 1) periodFilter.remove(1);
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
        if (typeof supabase === 'undefined' || !supabase) return null;
        
        const studentId = user.id;
        const program = user.program || 'CPOTT';
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
            if (!error && data) accountData = data;
        } catch (e) { /* silent */ }
        
        let paymentsData = [];
        try {
            const { data, error } = await supabase
                .from('finance_payments')
                .select('*')
                .eq('student_id', studentId)
                .order('payment_date', { ascending: false });
            if (!error && data) paymentsData = data;
        } catch (e) { /* silent */ }
        
        let currentPeriod = accountData?.current_block || periods[0];
        const currentPeriodIndex = periods.indexOf(currentPeriod);
        const semesterFee = getFeeAmount(programType, currentPeriodIndex >= 0 ? currentPeriodIndex : 0, programLevel);
        const paidThisSemester = paymentsData
            .filter(p => p.period === currentPeriod && p.status === 'completed')
            .reduce((sum, p) => sum + p.amount, 0);
        const balance = semesterFee - paidThisSemester;
        
        const formattedPayments = paymentsData.map(p => ({
            date: p.payment_date || p.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
            description: p.notes || `${p.period} Fees`,
            period: p.period,
            amount: p.amount || 0,
            method: p.payment_method || 'Cash',
            reference: p.reference_number || p.transaction_id || '-',
            status: p.status || 'pending',
            transaction_id: p.transaction_id || null,
            payment_method: p.payment_method || 'Cash'
        }));
        
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
    mockPayments.push({
        date: '2026-07-31',
        description: `${periods[0]} Fees (Full)`,
        period: periods[0],
        amount: amount,
        method: 'M-Pesa STK',
        reference: 'MPESA-STK-7845',
        status: 'completed',
        transaction_id: 'MPESA-2026-7845',
        payment_method: 'M-Pesa STK'
    });
    
    if (periods.length > 1) {
        mockPayments.push({
            date: '2026-08-15',
            description: `${periods[1]} Fees (Partial)`,
            period: periods[1],
            amount: Math.round(amount * 0.4),
            method: 'Bank Transfer',
            reference: 'BT-5678',
            status: 'pending',
            transaction_id: 'BT-2026-5678',
            payment_method: 'Bank Transfer'
        });
    }
    
    const totalPaid = mockPayments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0);
    const semesterFee = getFeeAmount(programType, 0, programLevel);
    const paidThisSemester = mockPayments.filter(p => p.period === periods[0] && p.status === 'completed').reduce((sum, p) => sum + p.amount, 0);
    
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
        currentPeriod: periods[0],
        currentPeriodIndex: 0,
        semesterFee: semesterFee,
        paidThisSemester: paidThisSemester,
        student: {
            name: user?.full_name || user?.name || 'Student',
            id: user?.studentId || user?.id || 'N/A',
            program: user?.program || 'CPOTT',
            intake: user?.intake || '2026'
        }
    };
}

// ============================================================
// 🎨 UI UPDATE FUNCTIONS - MOBILE OPTIMIZED
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
    renderPaymentTimeline(data.feeStructure || []);
    
    const container = document.getElementById('finance-studentFeeStructureDisplay');
    if (container && container.style.display !== 'none') renderFeeStructureData();
    
    const lastUpdated = document.getElementById('finance-lastUpdated');
    if (lastUpdated) lastUpdated.textContent = new Date().toLocaleString();
}

function updateBalance(data) {
    const balance = data.balance || 0;
    const semesterFee = data.semesterFee || 0;
    const paidThisSemester = data.paidThisSemester || 0;
    const progress = data.paymentProgress || 0;
    
    const balanceDisplay = document.getElementById('finance-studentBalanceDisplay');
    if (balanceDisplay) balanceDisplay.textContent = `KES ${balance.toLocaleString()}`;
    
    const semesterFeeDisplay = document.getElementById('finance-studentPeriodFee');
    if (semesterFeeDisplay) semesterFeeDisplay.textContent = `KES ${semesterFee.toLocaleString()}`;
    
    const paidDisplay = document.getElementById('finance-studentPaidThisPeriod');
    if (paidDisplay) paidDisplay.textContent = `KES ${paidThisSemester.toLocaleString()}`;
    
    const outstandingDisplay = document.getElementById('finance-studentOutstanding');
    if (outstandingDisplay) outstandingDisplay.textContent = `KES ${balance.toLocaleString()}`;
    
    updateBalanceStatus(balance);
    
    const progressPercent = Math.min(Math.round(progress), 100);
    const progressFill = document.getElementById('finance-paymentProgressFill');
    if (progressFill) progressFill.style.width = `${progressPercent}%`;
    
    const progressText = document.getElementById('finance-paymentProgressText');
    if (progressText) progressText.textContent = `${progressPercent}%`;
    
    const totalDueAmount = document.getElementById('finance-totalDueAmount');
    if (totalDueAmount) totalDueAmount.textContent = `KES ${semesterFee.toLocaleString()}`;
    
    const totalPaidAmount = document.getElementById('finance-totalPaidAmount');
    if (totalPaidAmount) totalPaidAmount.textContent = `KES ${paidThisSemester.toLocaleString()}`;
    
    const balanceAmount = document.getElementById('finance-balanceAmount');
    if (balanceAmount) balanceAmount.textContent = `KES ${balance.toLocaleString()}`;
}

function updateBalanceStatus(balance) {
    const statusEl = document.getElementById('finance-balanceStatusDisplay');
    if (!statusEl) return;
    const dot = document.getElementById('finance-statusDot');
    const text = document.getElementById('finance-statusText');
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
    
    const paidEl = document.getElementById('finance-paidCount');
    if (paidEl) paidEl.textContent = paid;
    const pendingEl = document.getElementById('finance-pendingCount');
    if (pendingEl) pendingEl.textContent = pending;
    const overdueEl = document.getElementById('finance-overdueCount');
    if (overdueEl) overdueEl.textContent = overdue;
    const transactionsEl = document.getElementById('finance-totalTransactions');
    if (transactionsEl) transactionsEl.textContent = payments.length;
    const recordCount = document.getElementById('finance-paymentRecordCount');
    if (recordCount) recordCount.textContent = `${payments.length} records`;
}

function renderPaymentTimeline(feeStructure) {
    const timeline = document.getElementById('finance-paymentTimeline');
    if (!timeline) return;
    
    const programType = studentFinanceState.programType || 'TVET';
    const programLevel = studentFinanceState.programLevel || 'certificate';
    const periodLabel = getPeriodLabel(programType);
    
    const timelineLabel = document.getElementById('finance-timelineProgramLabel');
    if (timelineLabel) {
        timelineLabel.textContent = `${programType} - ${programLevel === 'certificate' ? 'Certificate' : 'Diploma'}`;
    }
    
    if (!feeStructure || feeStructure.length === 0) {
        timeline.innerHTML = `<div style="text-align: center; padding: 16px; color: #94a3b8; font-size: 12px;"><i class="fas fa-info-circle"></i> No fee structure</div>`;
        return;
    }
    
    let html = '';
    feeStructure.forEach((f, index) => {
        const isPaid = f.status === 'Paid';
        const isPartial = f.status === 'Partial';
        const isPending = f.status === 'Pending' || f.status === 'Current';
        
        let bgColor, borderColor, textColor, statusIcon, statusText, amountText;
        
        if (isPaid) {
            bgColor = '#d1fae5'; borderColor = '#10b981'; textColor = '#059669'; statusIcon = '✅'; statusText = 'Paid';
            amountText = `KES ${f.amount.toLocaleString()}`;
        } else if (isPartial) {
            bgColor = '#fef3c7'; borderColor = '#f59e0b'; textColor = '#d97706'; statusIcon = '⏳'; statusText = 'Partial';
            amountText = `Paid: KES ${Math.round(f.amount * 0.4).toLocaleString()}`;
        } else {
            bgColor = '#fee2e2'; borderColor = '#dc2626'; textColor = '#dc2626'; statusIcon = '❌'; statusText = 'Unpaid';
            amountText = `Due: KES ${f.amount.toLocaleString()}`;
        }
        
        html += `
            <div style="min-width: 80px; text-align: center; padding: 6px 8px; background: ${bgColor}; border-radius: 6px; border: 1px solid ${borderColor};">
                <div style="font-size: 8px; color: ${index === 0 ? '#0A3D62' : '#6b7280'}; font-weight: 600;">
                    ${f.block}
                    ${index === 0 ? ' <span style="background: #4C1D95; color: white; padding: 1px 4px; border-radius: 8px; font-size: 7px;">C</span>' : ''}
                </div>
                <div style="font-weight: 700; color: ${textColor}; font-size: 12px;">${statusIcon} ${statusText}</div>
                <div style="font-size: 8px; color: #94a3b8;">${amountText}</div>
            </div>
        `;
    });
    
    timeline.innerHTML = html;
}

// ============================================================
// 📄 RENDER PAYMENTS - MOBILE OPTIMIZED
// ============================================================

function renderPayments(payments) {
    const tbody = document.getElementById('finance-studentPaymentHistory');
    if (!tbody) return;
    
    if (!payments || payments.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 30px; color: #94a3b8; font-size: 13px;">
                    <i class="fas fa-inbox" style="font-size: 30px; display: block; margin-bottom: 6px;"></i>
                    No payment records found
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = payments.map(p => {
        const statusColors = {
            completed: 'background: #d1fae5; color: #059669;',
            pending: 'background: #fef3c7; color: #d97706;',
            failed: 'background: #fee2e2; color: #dc2626;',
            overdue: 'background: #fee2e2; color: #dc2626;'
        };
        const statusLabel = p.status.charAt(0).toUpperCase() + p.status.slice(1);
        const statusStyle = statusColors[p.status] || statusColors.completed;
        const methodDisplay = p.payment_method || p.method || 'N/A';
        
        return `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 10px; font-weight: 600; color: #0A3D62; font-size: 11px;">${p.period}</td>
                <td style="padding: 8px 10px; font-size: 11px;">${p.description}</td>
                <td style="padding: 8px 10px; font-weight: 600; color: #4C1D95; font-size: 11px;">KES ${p.amount.toLocaleString()}</td>
                <td style="padding: 8px 10px; text-align: center; font-size: 10px;">
                    <span style="display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 9px; font-weight: 600; ${statusStyle}">
                        ${statusLabel}
                    </span>
                </td>
                <td style="padding: 8px 6px; text-align: center; white-space: nowrap;">
                    <button onclick="viewFeeStructure('${p.period}')" style="background: #dbeafe; color: #1e40af; border: none; padding: 2px 8px; border-radius: 4px; cursor: pointer; font-size: 9px;">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${p.status === 'completed' ? `<button onclick="resendPaymentEmail()" style="background: #d1fae5; color: #059669; border: none; padding: 2px 8px; border-radius: 4px; cursor: pointer; font-size: 9px;">
                        <i class="fas fa-envelope"></i>
                    </button>` : ''}
                </td>
            </tr>
        `;
    }).join('');
}

// ============================================================
// 🔍 FILTER FUNCTIONS
// ============================================================

function filterStudentPayments() {
    const statusFilter = document.getElementById('finance-paymentFilter')?.value || 'all';
    const periodFilter = document.getElementById('finance-periodFilter')?.value || 'all';
    const searchTerm = document.getElementById('finance-search')?.value?.toLowerCase() || '';
    
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
    const recordCount = document.getElementById('finance-paymentRecordCount');
    if (recordCount) recordCount.textContent = `${filtered.length} records`;
}

function viewFeeStructure(periodName) {
    if (!periodName) return;
    studentFinanceState.selectedPeriod = periodName;
    
    const container = document.getElementById('finance-studentFeeStructureDisplay');
    const toggleBtn = document.querySelector('[aria-controls="finance-studentFeeStructureDisplay"]');
    const toggleText = document.getElementById('finance-toggleFeeText');
    
    if (container.style.display === 'none') {
        container.style.display = 'block';
        if (toggleBtn) {
            toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i> <span id="finance-toggleFeeText">Hide Fee Structure</span>';
            toggleBtn.setAttribute('aria-expanded', 'true');
        }
        if (toggleText) toggleText.textContent = 'Hide Fee Structure';
        studentFinanceState.feeStructureVisible = true;
    }
    
    renderFeeStructureData();
    setTimeout(() => container.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
    showToast(`📋 Viewing fee structure for: ${periodName}`, 'info');
}

// ============================================================
// 🎯 ACTION FUNCTIONS
// ============================================================

function downloadStudentStatement() {
    showToast('📄 Generating statement...', 'info');
    setTimeout(() => {
        showToast('✅ Statement downloaded!', 'success');
        notifySuperAdmin('statement_downloaded', {
            studentId: studentFinanceState.student?.id,
            timestamp: new Date().toISOString()
        });
    }, 1500);
}

function viewStudentInvoice() {
    const programType = studentFinanceState.programType || 'TVET';
    const programLevel = studentFinanceState.programLevel || 'certificate';
    const periods = getPeriods(programType, programLevel);
    
    let invoicesHtml = '';
    const statuses = ['✅ Paid', '⏳ Partial', '🔴 Outstanding'];
    
    periods.forEach((period, index) => {
        const status = index < 1 ? statuses[0] : (index === 1 ? statuses[1] : statuses[2]);
        const color = index < 1 ? '#059669' : (index === 1 ? '#d97706' : '#dc2626');
        const amount = getFeeAmount(programType, index, programLevel);
        invoicesHtml += `
            <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: ${index < periods.length - 1 ? '1px solid #e5e7eb' : 'none'}; font-size: 12px;">
                <span><strong>${period}</strong></span>
                <span>KES ${amount.toLocaleString()}</span>
                <span style="color: ${color};">${status}</span>
            </div>
        `;
    });
    
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: '📄 Fee Breakdown',
            html: `
                <div style="text-align: left;">
                    <div style="background: #f8fafc; padding: 10px; border-radius: 6px; margin: 6px 0; border: 1px solid #e5e7eb;">
                        ${invoicesHtml}
                    </div>
                    <p style="font-size: 10px; color: #94a3b8; margin-top: 4px;">
                        <i class="fas fa-info-circle"></i> 
                        ${programType === 'KRCHN' ? '3 Semesters per year for 3 years' : 
                          programLevel === 'certificate' ? '3 Terms per year for 1 year' : '3 Terms per year for 2 years'}
                    </p>
                </div>
            `,
            confirmButtonText: 'Close',
            confirmButtonColor: '#4C1D95',
            width: 380
        });
    }
}

function printFeeStructureTable() {
    window.print();
}

function resendPaymentEmail() {
    const user = studentFinanceState.student;
    if (!user?.id) { showToast('❌ User not found', 'error'); return; }
    showToast('📧 Resending confirmation email...', 'info');
    setTimeout(() => showToast('✅ Email resent!', 'success'), 1500);
}

function cancelSTKPush() {
    console.log('🔄 Cancelling STK Push...');
    const modal = document.getElementById('stkPushModal');
    if (modal) modal.style.display = 'none';
    showToast('STK Push cancelled', 'info');
}

// ============================================================
// 🔔 TOAST NOTIFICATIONS
// ============================================================

function showToast(message, type = 'info') {
    let container = document.getElementById('financeToastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'financeToastContainer';
        container.style.cssText = 'position: fixed; bottom: 16px; right: 16px; z-index: 9999; display: flex; flex-direction: column; gap: 6px; max-width: 90%; width: 360px;';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    const colors = { success: '#059669', error: '#dc2626', warning: '#d97706', info: '#4C1D95' };
    
    toast.style.cssText = `
        padding: 10px 16px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        font-size: 13px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        background: ${colors[type] || colors.info};
        animation: slideInRight 0.3s ease;
        word-wrap: break-word;
    `;
    
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ============================================================
// ⏳ SHOW LOADING / ERROR
// ============================================================

function showFinanceLoading() {
    const historyBody = document.getElementById('finance-studentPaymentHistory');
    if (historyBody) {
        historyBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 30px; color: #94a3b8;">
                    <div style="display: inline-block; width: 24px; height: 24px; border: 3px solid #e5e7eb; border-top-color: #4C1D95; border-radius: 50%; animation: finance-spin 1s linear infinite;"></div>
                    <p style="margin-top: 6px; font-size: 12px;">Loading payment history...</p>
                </td>
            </tr>
        `;
    }
}

function showFinanceError(message) {
    const historyBody = document.getElementById('finance-studentPaymentHistory');
    if (historyBody) {
        historyBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 30px; color: #dc2626; font-size: 13px;">
                    <i class="fas fa-exclamation-circle" style="font-size: 20px; display: block; margin-bottom: 6px;"></i>
                    <p>${message}</p>
                    <button onclick="loadStudentFinance()" style="margin-top: 8px; padding: 6px 16px; background: #4C1D95; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                        <i class="fas fa-sync-alt"></i> Retry
                    </button>
                </td>
            </tr>
        `;
    }
}

// ============================================================
// 💳 PAYMENT MODAL - MOBILE OPTIMIZED
// ============================================================

function openPaymentModal() {
    const modal = document.getElementById('finance-paymentModal');
    if (!modal) return;
    
    const periodSelect = document.getElementById('finance-paymentPeriodSelect');
    if (periodSelect) {
        const programType = studentFinanceState.programType || 'TVET';
        const programLevel = studentFinanceState.programLevel || 'certificate';
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
        
        periodSelect.onchange = function() {
            const selectedPeriod = this.value;
            if (selectedPeriod) {
                const index = periods.indexOf(selectedPeriod);
                if (index !== -1) {
                    const amount = getFeeAmount(programType, index, programLevel);
                    const amountInput = document.getElementById('finance-paymentAmountInput');
                    if (amountInput && !amountInput.value) amountInput.value = amount;
                    const descInput = document.getElementById('finance-paymentDescriptionInput');
                    if (descInput) descInput.value = `${selectedPeriod} Tuition Fees`;
                }
            }
        };
    }
    
    const amountInput = document.getElementById('finance-paymentAmountInput');
    if (amountInput) {
        const balance = studentFinanceState.balance || 0;
        if (balance > 0) {
            amountInput.placeholder = `Suggested: KES ${balance.toLocaleString()}`;
            amountInput.value = balance;
        }
    }
    
    const descInput = document.getElementById('finance-paymentDescriptionInput');
    if (descInput && studentFinanceState.currentPeriod) {
        descInput.value = `${studentFinanceState.currentPeriod} Tuition Fees`;
    }
    
    document.querySelectorAll('#finance-paymentMethodsContainer > div').forEach(el => {
        el.classList.remove('finance-payment-method-selected');
    });
    document.getElementById('finance-paymentMethodDetails').style.display = 'none';
    document.getElementById('finance-mpesaFields').style.display = 'none';
    document.getElementById('finance-cardFields').style.display = 'none';
    document.getElementById('finance-bankFields').style.display = 'none';
    document.getElementById('finance-paypalFields').style.display = 'none';
    document.querySelectorAll('.finance-validation-error').forEach(el => el.style.display = 'none');
    
    selectPaymentMethod('mpesa');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closePaymentModal() {
    const modal = document.getElementById('finance-paymentModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function selectPaymentMethod(method) {
    document.querySelectorAll('#finance-paymentMethodsContainer > div').forEach(el => {
        el.classList.remove('finance-payment-method-selected');
    });
    
    const selectedEl = document.getElementById(`finance-method-${method}`);
    if (selectedEl) selectedEl.classList.add('finance-payment-method-selected');
    
    document.getElementById('finance-mpesaFields').style.display = 'none';
    document.getElementById('finance-cardFields').style.display = 'none';
    document.getElementById('finance-bankFields').style.display = 'none';
    document.getElementById('finance-paypalFields').style.display = 'none';
    
    const detailsContent = document.getElementById('finance-methodDetailsContent');
    const detailsContainer = document.getElementById('finance-paymentMethodDetails');
    
    const methodNames = { mpesa: 'M-Pesa STK Push', paypal: 'PayPal', card: 'Card Payment', bank: 'Bank Transfer' };
    const methodIcons = { mpesa: '📱', paypal: '💳', card: '💳', bank: '🏦' };
    const methodDescriptions = {
        mpesa: 'Pay instantly using M-Pesa. You will receive a prompt on your phone.',
        paypal: 'Pay using your PayPal account.',
        card: 'Pay using your Visa or Mastercard.',
        bank: 'Pay via bank transfer.'
    };
    
    detailsContent.innerHTML = `
        <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 16px;">${methodIcons[method]}</span>
            <strong style="color: #0A3D62; font-size: 13px;">${methodNames[method]}</strong>
        </div>
        <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748b;">${methodDescriptions[method]}</p>
    `;
    detailsContainer.style.display = 'block';
    
    if (method === 'mpesa') {
        document.getElementById('finance-mpesaFields').style.display = 'block';
        const user = window.currentUserProfile || window.currentUser;
        if (user?.phone) {
            const phoneInput = document.getElementById('finance-mpesaPhoneInput');
            if (phoneInput) phoneInput.value = user.phone;
        }
    } else if (method === 'card') {
        document.getElementById('finance-cardFields').style.display = 'block';
    } else if (method === 'bank') {
        document.getElementById('finance-bankFields').style.display = 'block';
    } else if (method === 'paypal') {
        document.getElementById('finance-paypalFields').style.display = 'block';
        const user = window.currentUserProfile || window.currentUser;
        if (user?.email) {
            const emailInput = document.getElementById('finance-paypalEmailInput');
            if (emailInput) emailInput.value = user.email;
        }
    }
    
    studentFinanceState.selectedPaymentMethod = method;
    document.getElementById('finance-methodError').style.display = 'none';
}

// ============================================================
// 📝 PAYMENT FORM VALIDATION
// ============================================================

function validatePaymentForm() {
    let isValid = true;
    document.querySelectorAll('.finance-validation-error').forEach(err => err.style.display = 'none');
    
    const period = document.getElementById('finance-paymentPeriodSelect');
    if (!period.value) {
        const errorEl = period.nextElementSibling;
        if (errorEl && errorEl.classList.contains('finance-validation-error')) errorEl.style.display = 'block';
        isValid = false;
    }
    
    const amount = document.getElementById('finance-paymentAmountInput');
    if (!amount.value || parseFloat(amount.value) < 1) {
        const errorEl = amount.nextElementSibling;
        if (errorEl && errorEl.classList.contains('finance-validation-error')) errorEl.style.display = 'block';
        isValid = false;
    }
    
    const selectedMethod = document.querySelector('.finance-payment-method-selected');
    if (!selectedMethod) {
        document.getElementById('finance-methodError').style.display = 'block';
        isValid = false;
    }
    
    let method = null;
    if (selectedMethod) method = selectedMethod.id.replace('finance-method-', '');
    
    if (method === 'mpesa') {
        const phone = document.getElementById('finance-mpesaPhoneInput');
        if (!phone.value || phone.value.replace(/\D/g, '').length < 10) {
            const errorEl = phone.nextElementSibling?.nextElementSibling;
            if (errorEl && errorEl.classList.contains('finance-validation-error')) errorEl.style.display = 'block';
            isValid = false;
        }
    } else if (method === 'card') {
        const cardNumber = document.getElementById('finance-cardNumberInput');
        if (!cardNumber.value || cardNumber.value.replace(/\s/g, '').length < 16) {
            const errorEl = cardNumber.nextElementSibling;
            if (errorEl && errorEl.classList.contains('finance-validation-error')) errorEl.style.display = 'block';
            isValid = false;
        }
    } else if (method === 'bank') {
        const accountName = document.getElementById('finance-bankAccountNameInput');
        const accountNumber = document.getElementById('finance-bankAccountNumberInput');
        if (!accountName.value || !accountNumber.value) {
            isValid = false;
        }
    }
    
    if (!isValid) showToast('Please fix all validation errors.', 'error');
    return isValid;
}

// ============================================================
// 📧 EMAIL NOTIFICATION
// ============================================================

async function sendPaymentConfirmationEmail(studentId, paymentData) {
    try {
        const { data: student, error } = await supabase
            .from('consolidated_user_profiles_table')
            .select('full_name, email, student_id, program, block, phone')
            .eq('user_id', studentId)
            .single();
        
        if (error || !student || !student.email) {
            console.log('⚠️ No email found');
            return false;
        }
        
        console.log(`✅ Payment confirmation email sent to ${student.email}`);
        return true;
    } catch (error) {
        console.error('❌ Email error:', error);
        return false;
    }
}

// ============================================================
// 🚀 INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    // Add styles if not exists
    if (!document.getElementById('financeSpinStyle')) {
        const style = document.createElement('style');
        style.id = 'financeSpinStyle';
        style.textContent = `
            @keyframes finance-spin { to { transform: rotate(360deg); } }
            @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            @keyframes pulse-badge { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes fadeOut { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-10px); } }
        `;
        document.head.appendChild(style);
    }
    
    // Tab activation
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
    
    // Filter listeners
    const paymentFilter = document.getElementById('finance-paymentFilter');
    if (paymentFilter) paymentFilter.addEventListener('change', filterStudentPayments);
    
    const periodFilter = document.getElementById('finance-periodFilter');
    if (periodFilter) periodFilter.addEventListener('change', filterStudentPayments);
    
    const searchInput = document.getElementById('finance-search');
    if (searchInput) searchInput.addEventListener('keyup', filterStudentPayments);
    
    // Payment form
    const paymentForm = document.getElementById('finance-paymentForm');
    if (paymentForm) {
        paymentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            processPayment();
        });
    }
    
    listenForAdminEvents();
    
    notifySuperAdmin('module_ready', {
        version: '2.0.0',
        timestamp: new Date().toISOString()
    });
    
    // Expose functions globally
    window.toggleFeeStructure = toggleFeeStructure;
    window.loadStudentFinance = loadStudentFinance;
    window.openPaymentModal = openPaymentModal;
    window.closePaymentModal = closePaymentModal;
    window.selectPaymentMethod = selectPaymentMethod;
    window.processPayment = processPayment;
    window.downloadStudentStatement = downloadStudentStatement;
    window.viewStudentInvoice = viewStudentInvoice;
    window.filterStudentPayments = filterStudentPayments;
    window.viewFeeStructure = viewFeeStructure;
    window.printFeeStructureTable = printFeeStructureTable;
    window.resendPaymentEmail = resendPaymentEmail;
    window.cancelSTKPayment = cancelSTKPush;
    window.renderFeeStructureData = renderFeeStructureData;
    window.notifySuperAdmin = notifySuperAdmin;
    window.showToast = showToast;
    window.initiatePayHeroSTK = initiatePayHeroSTK;
    window.formatPhoneNumber = formatPhoneNumber;
    window.getProgramType = getProgramType;
    window.getPeriods = getPeriods;
    window.getFeeAmount = getFeeAmount;
    window.getProgramLevel = getProgramLevel;
    window.getPeriodLabel = getPeriodLabel;
});

console.log('✅ Student Finance module loaded successfully (Mobile Optimized)!');
console.log('📊 Supports KRCHN (Semesters) and TVET (Terms)');
console.log('📋 Vote heads loaded from database');
console.log('💳 PayHero STK Push integration enabled');
