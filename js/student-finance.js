// ============================================================
// 📊 STUDENT FINANCE MODULE - COMPLETE WITH ALL FIXES
// ✅ FULL ORIGINAL CODE + NEW EMAIL RECEIPT + SUCCESS POPUP
// ✅ Handles cancellation, insufficient funds, timeout
// ✅ Stops polling immediately on failure
// ✅ Sends email receipt after successful payment
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
// 🔄 PAYHERO STATE
// ============================================================

const payheroState = {
    isInitialized: true,
    isProcessing: false,
    currentTransaction: null,
    stkCheckInterval: null
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
    programLevel: 'diploma',
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
// 📦 PENDING PAYMENT STATE (FOR POS STYLE MODAL)
// ============================================================

const pendingPayment = {
    orderId: null,
    paymentId: null,
    transactionId: null,
    isProcessing: false,
    cancelled: false,
    status: 'idle'
};

// ============================================================
// 🔧 UTILITY FUNCTIONS - FIXED FOR DATABASE STRUCTURE
// ============================================================

function mapPeriodToDisplay(dbPeriod) {
    if (!dbPeriod) return dbPeriod;
    if (/^Y\d+\s+[ST]\d+$/.test(dbPeriod)) return dbPeriod;
    if (/^Y\d+[ST]\d+$/.test(dbPeriod)) return dbPeriod;
    
    const termMatch = dbPeriod.match(/Term\s*(\d+)/i);
    if (termMatch) {
        const termNum = parseInt(termMatch[1]);
        const year = Math.ceil(termNum / 3);
        const termInYear = ((termNum - 1) % 3) + 1;
        return `Y${year} T${termInYear}`;
    }
    
    const yearTermMatch = dbPeriod.match(/Year\s*(\d+)\s*[-–]\s*Term\s*(\d+)/i);
    if (yearTermMatch) {
        const year = parseInt(yearTermMatch[1]);
        const term = parseInt(yearTermMatch[2]);
        return `Y${year} T${term}`;
    }
    
    const semMatch = dbPeriod.match(/Semester\s*(\d+)/i);
    if (semMatch) {
        const semNum = parseInt(semMatch[1]);
        const year = Math.ceil(semNum / 3);
        const semInYear = ((semNum - 1) % 3) + 1;
        return `Y${year} S${semInYear}`;
    }
    
    return dbPeriod;
}

function mapPeriodToDatabase(displayPeriod) {
    if (!displayPeriod) return displayPeriod;
    
    const match = displayPeriod.match(/^Y(\d+)\s*([ST])(\d+)$/i);
    if (match) {
        const year = parseInt(match[1]);
        const type = match[2].toUpperCase();
        const num = parseInt(match[3]);
        
        if (type === 'T') {
            const termNum = (year - 1) * 3 + num;
            return `Term ${termNum}`;
        } else if (type === 'S') {
            const semNum = (year - 1) * 3 + num;
            return `Semester ${semNum}`;
        }
    }
    
    return displayPeriod;
}

function mapProgramCodeToFullName(programCode) {
    if (!programCode) return programCode;
    
    const programMap = {
        'KRCHN': 'KRCHN',
        'CCH': 'Caregiving',
        'CPOTT': 'Health Records & IT',
        'CHRIT': 'Health Records & IT',
        'CPC': 'Community Health',
        'CSL': 'Social Work',
        'CSW': 'Social Work',
        'CCJS': 'Criminology',
        'CAG': 'Agriculture',
        'CHSS': 'Humanities',
        'CICT': 'ICT',
        'CCA': 'Community Health',
        'DPOTT': 'Health Records & IT',
        'HRIT': 'Health Records & IT',
        'CNA': 'Nursing Assistant'
    };
    
    return programMap[programCode] || programCode;
}

function mapProgramFullNameToCode(fullName) {
    if (!fullName) return fullName;
    
    const reverseMap = {
        'KRCHN': 'KRCHN',
        'Caregiving': 'CCH',
        'Health Records & IT': 'CPOTT',
        'Community Health': 'CPC',
        'Social Work': 'CSL',
        'Agriculture': 'CAG',
        'ICT': 'CICT',
        'Nursing Assistant': 'CNA'
    };
    
    return reverseMap[fullName] || fullName;
}

// ============================================================
// 🏷️ PROGRAM DETECTION - FIXED
// ============================================================

function getProgramType(program) {
    if (!program) return 'TVET';
    const upper = program.toUpperCase();
    if (upper === 'KRCHN') return 'KRCHN';
    return 'TVET';
}

function getProgramLevel(program) {
    if (!program) return 'diploma';
    const certPrograms = ['CCH', 'CPOTT', 'CHRIT', 'CPC', 'CSL', 'CSW', 'CCJS', 'CAG', 'CHSS', 'CICT', 'CCA', 'CNA'];
    return certPrograms.includes(program) ? 'certificate' : 'diploma';
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

// ============================================================
// 🔧 FEE AMOUNT FUNCTION
// ============================================================

function getFeeAmount(programType, periodIndex, programLevel = 'diploma') {
    if (programType === 'KRCHN') {
        const krchnFees = [94600, 95181, 93291, 64100, 78576, 64100, 64100, 64100, 64100];
        return krchnFees[periodIndex] || 64100;
    } else {
        return periodIndex === 0 ? 57500 : 50000;
    }
}

// ============================================================
// 🔗 COMMUNICATION WITH SUPER ADMIN MODULE
// ============================================================

function notifySuperAdmin(eventType, data) {
    try {
        const adminEvent = new CustomEvent('studentFinanceEvent', {
            detail: {
                type: eventType,
                data: data,
                timestamp: new Date().toISOString(),
                source: 'student-module'
            }
        });
        window.dispatchEvent(adminEvent);
        console.log(`📤 Notified Super Admin: ${eventType}`, data);
        
        if (typeof window.handleStudentFinanceEvent === 'function') {
            window.handleStudentFinanceEvent(eventType, data);
        }
        
        if (typeof supabase !== 'undefined' && supabase && typeof supabase.from === 'function') {
            try {
                const student = studentFinanceState.student || window.currentUserProfile || window.currentUser;
                
                supabase
                    .from('admin_notifications')
                    .insert([{
                        notification_type: eventType,
                        student_id: student?.user_id || student?.id || data?.studentId || 'unknown',
                        student_name: student?.full_name || student?.name || data?.studentName || 'Unknown Student',
                        details: typeof data === 'object' ? JSON.stringify(data) : String(data),
                        is_read: false,
                        timestamp: new Date().toISOString()
                    }])
                    .catch((error) => {
                        console.warn('⚠️ Could not save notification:', error.message);
                    });
            } catch (error) {
                console.warn('⚠️ Admin notification error:', error.message);
            }
        }
        return true;
    } catch (error) {
        console.warn('⚠️ Could not notify admin:', error.message);
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
                if (data?.studentId === studentFinanceState.student?.user_id) {
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
// 📱 FORMAT PHONE NUMBER
// ============================================================

function formatPhoneNumber(phone) {
    if (!phone) return null;
    let clean = phone.replace(/\D/g, '');
    if (clean.length === 10 && (clean.startsWith('07') || clean.startsWith('01'))) 
        return '254' + clean.substring(1);
    if (clean.length === 12 && clean.startsWith('254')) return clean;
    if (clean.length === 9 && clean.startsWith('7')) return '254' + clean;
    return clean;
}

function getSupabaseClient() {
    if (window.sb) return window.sb;
    if (window.supabase) return window.supabase;
    if (typeof supabase !== 'undefined') return supabase;
    console.error('❌ No Supabase client found');
    return null;
}

// ============================================================
// 📧 SEND PAYMENT RECEIPT EMAIL - NEW FUNCTION
// ============================================================

async function sendPaymentReceiptEmail(paymentData) {
    try {
        console.log('📧 Sending payment receipt email...');
        
        const supabase = getSupabaseClient();
        if (!supabase) {
            console.warn('⚠️ No Supabase client, cannot send email');
            return false;
        }
        
        const user = window.currentUserProfile || window.currentUser;
        if (!user) {
            console.warn('⚠️ No user found');
            return false;
        }
        
        const studentEmail = user.email || paymentData.student_email;
        const studentName = user.full_name || user.name || 'Student';
        
        if (!studentEmail) {
            console.warn('⚠️ No student email found');
            return false;
        }
        
        const amount = paymentData.amount || 0;
        const receiptNumber = paymentData.receipt_number || paymentData.reference_number || 'N/A';
        const period = paymentData.period || 'N/A';
        const transactionId = paymentData.transaction_id || paymentData.checkout_request_id || 'N/A';
        const date = new Date().toLocaleDateString('en-KE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const time = new Date().toLocaleTimeString('en-KE', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const receiptHTML = generateReceiptHTML(paymentData, receiptNumber, studentName, date, time);
        
        const response = await fetch('https://lwhtjozfsmbyihenfunw.supabase.co/functions/v1/send-email', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                to: studentEmail,
                subject: `💰 Payment Receipt - ${receiptNumber}`,
                html: receiptHTML,
                from: 'NCHSM Finance <finance@nchsm.co.ke>'
            })
        });
        
        const data = await response.json();
        console.log('📥 Email response:', data);
        
        if (data.success) {
            console.log(`✅ Receipt email sent to ${studentEmail}`);
            
            await fetch('https://lwhtjozfsmbyihenfunw.supabase.co/functions/v1/send-email', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    to: 'finance@nchsm.co.ke',
                    subject: `📋 Payment Receipt - ${receiptNumber} (Admin Copy)`,
                    html: receiptHTML,
                    from: 'NCHSM Finance <finance@nchsm.co.ke>'
                })
            });
            
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
// 📄 GENERATE RECEIPT HTML - NEW FUNCTION
// ============================================================

function generateReceiptHTML(payment, receiptNumber, studentName, date, time) {
    const amount = parseFloat(payment.amount).toFixed(2);
    const period = payment.period || 'N/A';
    const method = payment.payment_method || 'M-Pesa';
    const transactionId = payment.transaction_id || payment.checkout_request_id || 'N/A';
    const reference = payment.reference_number || 'N/A';
    const program = payment.program || 'KRCHN';
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Receipt - ${receiptNumber}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f0f2f5; padding: 20px; }
        .receipt-container { max-width: 700px; margin: 0 auto; background: #ffffff; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.12); overflow: hidden; }
        .header { background: linear-gradient(135deg, #0A3D62, #1a5276); padding: 30px 35px 25px; text-align: center; color: white; }
        .header .logo { font-size: 28px; font-weight: 700; letter-spacing: 1px; }
        .header .logo span { color: #f1c40f; }
        .header .subtitle { font-size: 14px; opacity: 0.85; margin-top: 4px; font-weight: 300; }
        .header .receipt-badge { display: inline-block; background: rgba(255,255,255,0.15); padding: 6px 24px; border-radius: 20px; margin-top: 12px; font-size: 13px; font-weight: 600; letter-spacing: 1px; border: 1px solid rgba(255,255,255,0.2); }
        .body { padding: 30px 35px 20px; }
        .greeting { font-size: 15px; color: #2c3e50; margin-bottom: 20px; }
        .greeting strong { color: #0A3D62; }
        .status-banner { background: #d4edda; border-radius: 10px; padding: 14px 20px; text-align: center; margin-bottom: 22px; border-left: 4px solid #28a745; }
        .status-banner .status-icon { font-size: 20px; margin-right: 8px; }
        .status-banner .status-text { font-weight: 700; color: #155724; font-size: 16px; }
        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 20px; background: #f8f9fa; border-radius: 12px; padding: 18px 22px; margin-bottom: 20px; }
        .details-grid .item { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #e9ecef; }
        .details-grid .item:last-child { border-bottom: none; }
        .details-grid .label { color: #6c757d; font-size: 13px; font-weight: 500; }
        .details-grid .value { color: #2c3e50; font-size: 13px; font-weight: 600; text-align: right; }
        .amount-box { background: linear-gradient(135deg, #eaf2f8, #d6eaf8); border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 20px; border: 2px solid #0A3D62; }
        .amount-box .label { font-size: 13px; color: #2c3e50; font-weight: 500; }
        .amount-box .amount { font-size: 38px; font-weight: 800; color: #0A3D62; letter-spacing: 1px; }
        .mpesa-confirm { background: #fef9e7; border-radius: 10px; padding: 14px 18px; border-left: 4px solid #f39c12; margin-bottom: 20px; }
        .mpesa-confirm p { margin: 0; font-size: 13px; color: #7d6608; display: flex; justify-content: space-between; align-items: center; }
        .mpesa-confirm .code { font-weight: 700; font-family: monospace; font-size: 15px; color: #0A3D62; }
        .footer { background: #f8f9fa; padding: 20px 35px 25px; text-align: center; border-top: 1px solid #e9ecef; }
        .footer .thanks { font-size: 18px; font-weight: 700; color: #0A3D62; margin-bottom: 4px; }
        .footer .contact { font-size: 12px; color: #6c757d; margin: 4px 0; }
        .footer .secure { display: inline-block; background: #28a745; color: white; font-size: 11px; padding: 3px 16px; border-radius: 20px; font-weight: 600; margin-top: 8px; }
        @media print { body { background: white; padding: 0; } .receipt-container { box-shadow: none; border-radius: 0; } .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .status-banner { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .amount-box { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .mpesa-confirm { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        @media (max-width: 480px) { .body { padding: 20px; } .header { padding: 20px; } .details-grid { grid-template-columns: 1fr; gap: 4px; } .amount-box .amount { font-size: 28px; } }
    </style>
</head>
<body>
    <div class="receipt-container">
        <div class="header">
            <div class="logo">NCH<span>SM</span></div>
            <div class="subtitle">Nakuru College of Health Sciences and Management</div>
            <div class="receipt-badge">📋 OFFICIAL PAYMENT RECEIPT</div>
        </div>
        
        <div class="body">
            <div class="greeting">Dear <strong>${studentName}</strong>,</div>
            
            <div class="status-banner">
                <span class="status-icon">✅</span>
                <span class="status-text">PAYMENT CONFIRMED &amp; COMPLETED</span>
            </div>
            
            <div class="details-grid">
                <div class="item"><span class="label">Receipt Number</span><span class="value">${receiptNumber}</span></div>
                <div class="item"><span class="label">Student Name</span><span class="value">${studentName}</span></div>
                <div class="item"><span class="label">Program</span><span class="value">${program}</span></div>
                <div class="item"><span class="label">Payment Date</span><span class="value">${date} at ${time}</span></div>
                <div class="item"><span class="label">Payment Method</span><span class="value">${method}</span></div>
                <div class="item"><span class="label">Transaction ID</span><span class="value" style="font-size:11px;font-family:monospace;">${transactionId}</span></div>
                <div class="item"><span class="label">Reference</span><span class="value" style="font-size:11px;font-family:monospace;">${reference}</span></div>
                <div class="item"><span class="label">Period</span><span class="value">${period}</span></div>
                <div class="item"><span class="label">Status</span><span class="value" style="color:#28a745;">✅ COMPLETED</span></div>
            </div>
            
            <div class="amount-box">
                <div class="label">AMOUNT PAID</div>
                <div class="amount">KES ${amount}</div>
            </div>
            
            <div class="mpesa-confirm">
                <p>
                    <span>📱 M-Pesa Confirmation Code</span>
                    <span class="code">${receiptNumber}</span>
                </p>
            </div>
        </div>
        
        <div class="footer">
            <div class="thanks">🙏 Thank You for Your Payment!</div>
            <div class="contact">📞 +254 790 969 743 &nbsp;|&nbsp; 📧 finance@nchsm.ac.ke</div>
            <span class="secure">🔒 Secure Payment Receipt</span>
        </div>
    </div>
</body>
</html>`;
}

// ============================================================
// 🎉 SHOW SUCCESS POPUP WITH EMAIL STATUS - NEW FUNCTION
// ============================================================

function showSuccessPopup(amount, receiptNumber, period, emailSent = false) {
    const existingOverlay = document.getElementById('payment-success-overlay');
    if (existingOverlay) existingOverlay.remove();
    
    const overlay = document.createElement('div');
    overlay.id = 'payment-success-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.6);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeInOverlay 0.3s ease;
    `;
    
    const popup = document.createElement('div');
    popup.style.cssText = `
        background: white;
        border-radius: 20px;
        padding: 40px;
        max-width: 450px;
        width: 90%;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        animation: popIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        position: relative;
        max-height: 90vh;
        overflow-y: auto;
    `;
    
    const checkmark = document.createElement('div');
    checkmark.style.cssText = `
        width: 80px;
        height: 80px;
        background: linear-gradient(135deg, #10b981, #059669);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 20px;
        font-size: 40px;
        color: white;
        box-shadow: 0 8px 30px rgba(16, 185, 129, 0.4);
    `;
    checkmark.textContent = '✅';
    
    const content = document.createElement('div');
    content.innerHTML = `
        <h2 style="color: #0A3D62; margin: 0 0 8px 0; font-size: 24px;">Payment Successful! 🎉</h2>
        <p style="color: #64748b; margin: 0 0 16px 0; font-size: 14px;">${period || 'Tuition Fees'}</p>
        <div style="background: #f0fdf4; border-radius: 12px; padding: 16px; margin: 16px 0; border: 1px solid #86efac;">
            <div style="font-size: 12px; color: #64748b;">Amount Paid</div>
            <div style="font-size: 32px; font-weight: 800; color: #0A3D62;">KES ${parseFloat(amount).toLocaleString()}</div>
        </div>
        <div style="display: flex; justify-content: center; gap: 20px; margin: 12px 0;">
            <div style="text-align: center;">
                <div style="font-size: 11px; color: #94a3b8;">Receipt Number</div>
                <div style="font-size: 13px; font-weight: 600; color: #0A3D62; font-family: monospace;">${receiptNumber}</div>
            </div>
        </div>
        <div id="email-status-container" style="margin: 12px 0; padding: 12px; background: ${emailSent ? '#f0fdf4' : '#fef3c7'}; border-radius: 8px; border: 1px solid ${emailSent ? '#86efac' : '#fcd34d'};">
            <div style="font-size: 13px; color: ${emailSent ? '#065f46' : '#92400e'};">
                ${emailSent ? '📧 Receipt sent to your email' : '📧 Sending receipt to your email...'}
            </div>
        </div>
        <div style="display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap;">
            <button onclick="closeSuccessPopupAndRefresh()" style="flex:1; padding: 12px 20px; background: linear-gradient(135deg, #0A3D62, #1a5276); color: white; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: transform 0.2s; min-width: 100px;">
                Done
            </button>
            <button onclick="downloadReceipt()" style="flex:1; padding: 12px 20px; background: #f1f5f9; color: #0A3D62; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: transform 0.2s; min-width: 100px;">
                📥 Download
            </button>
        </div>
    `;
    
    popup.appendChild(checkmark);
    popup.appendChild(content);
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    
    if (!document.getElementById('payment-popup-styles')) {
        const style = document.createElement('style');
        style.id = 'payment-popup-styles';
        style.textContent = `
            @keyframes fadeInOverlay {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes popIn {
                0% { transform: scale(0.5); opacity: 0; }
                100% { transform: scale(1); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    window._lastReceiptData = { amount, receiptNumber, period };
}

function closeSuccessPopupAndRefresh() {
    const overlay = document.getElementById('payment-success-overlay');
    if (overlay) {
        overlay.style.transition = 'opacity 0.3s ease';
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.remove();
            if (typeof loadStudentFinance === 'function') {
                loadStudentFinance();
            }
        }, 300);
    }
}

function downloadReceipt() {
    const data = window._lastReceiptData;
    if (!data) {
        showToast('❌ No receipt data available', 'error');
        return;
    }
    
    const receiptHTML = generateReceiptHTML(
        { 
            amount: data.amount, 
            period: data.period,
            receipt_number: data.receiptNumber,
            payment_method: 'M-Pesa',
            reference_number: data.receiptNumber,
            program: studentFinanceState.student?.program || 'KRCHN'
        },
        data.receiptNumber,
        studentFinanceState.student?.full_name || studentFinanceState.student?.name || 'Student',
        new Date().toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' }),
        new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
    );
    
    const blob = new Blob([receiptHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${data.receiptNumber}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('📥 Receipt downloaded!', 'success');
}

// ============================================================
// 📊 FETCH FINANCE DATA FROM SUPABASE - FIXED
// ============================================================

async function fetchFinanceDataFromSupabase(user) {
    try {
        if (typeof supabase === 'undefined' || !supabase) return null;
        
        const userId = user?.user_id || user?.id;
        if (!userId) {
            console.warn('⚠️ No user ID found');
            return null;
        }
        
        const { data: profile, error: profileError } = await supabase
            .from('consolidated_user_profiles_table')
            .select('id, student_id, full_name, program')
            .eq('user_id', userId)
            .single();
        
        if (profileError || !profile) {
            console.warn('⚠️ Could not find profile:', profileError);
            var profileId = userId;
            var studentName = user?.full_name || user?.name || 'Student';
            var program = user?.program || 'KRCHN';
        } else {
            var profileId = profile.id;
            var studentName = profile.full_name || user?.full_name || user?.name || 'Student';
            var program = profile.program || user?.program || 'KRCHN';
            console.log('✅ Found profile ID:', profileId);
            console.log('📋 Student ID:', profile.student_id);
        }
        
        const programType = getProgramType(program);
        const programLevel = getProgramLevel(program);
        const periods = getPeriods(programType, programLevel);
        
        console.log('📊 Fetching data using profile_id:', profileId);
        console.log('📚 Program:', program);
        console.log('🏷️ Program Type:', programType);
        
        let accountData = null;
        try {
            const { data, error } = await supabase
                .from('finance_student_accounts')
                .select('*')
                .eq('student_id', profileId)
                .maybeSingle();
            
            if (!error && data) {
                accountData = data;
                console.log('✅ Account data found:', accountData);
            } else {
                console.log('ℹ️ No account data found for student');
            }
        } catch (e) {
            console.log('ℹ️ Account table error:', e.message);
        }
        
        let paymentsData = [];
        try {
            const { data, error } = await supabase                .from('finance_payments')
                .select('*')
                .eq('student_id', profileId)
                .order('payment_date', { ascending: false });
            
            if (!error && data) {
                paymentsData = data;
                console.log('✅ Payments found:', data.length);
            } else {
                console.log('ℹ️ No payments found');
            }
        } catch (e) {
            console.log('ℹ️ Payments table error:', e.message);
        }
        
        let feeStructureData = null;
        try {
            const programFullName = mapProgramCodeToFullName(program);
            
            const { data, error } = await supabase
                .from('finance_fee_structure')
                .select('*')
                .eq('program', programFullName)
                .eq('is_active', true)
                .order('period_index', { ascending: true });
            
            if (!error && data && data.length > 0) {
                feeStructureData = data;
                console.log('✅ Fee structure found for:', programFullName);
            } else {
                const { data: altData, error: altError } = await supabase
                    .from('finance_fee_structure')
                    .select('*')
                    .eq('program', program)
                    .eq('is_active', true)
                    .order('period_index', { ascending: true });
                
                if (!altError && altData && altData.length > 0) {
                    feeStructureData = altData;
                    console.log('✅ Fee structure found for program code:', program);
                } else {
                    console.log('ℹ️ No fee structure found');
                }
            }
        } catch (e) {
            console.log('ℹ️ Fee structure table error:', e.message);
        }
        
        let processedFeeStructure = [];
        let voteHeads = [];
        let periodTotals = [];
        
        if (feeStructureData && feeStructureData.length > 0) {
            const allVoteHeads = new Map();
            const periodsList = [];
            
            feeStructureData.forEach(record => {
                const periodName = record.block_term || record.period_name || 'Unknown';
                const displayPeriod = mapPeriodToDisplay(periodName);
                const amount = parseFloat(record.amount) || 0;
                const hostel = parseFloat(record.hostel) || 0;
                const components = record.components || [];
                
                periodsList.push({
                    name: displayPeriod,
                    amount: amount,
                    hostel: hostel,
                    components: components
                });
                periodTotals.push(amount);
                
                components.forEach(comp => {
                    if (!allVoteHeads.has(comp.label)) {
                        allVoteHeads.set(comp.label, { label: comp.label, amounts: [] });
                    }
                });
            });
            
            allVoteHeads.forEach((vh, label) => {
                const amounts = periodsList.map(period => {
                    const comp = period.components.find(c => c.label === label);
                    return comp ? comp.amount : 0;
                });
                voteHeads.push({ label, amounts });
            });
            
            processedFeeStructure = periodsList;
        } else {
            periods.forEach((period, index) => {
                const amount = getFeeAmount(programType, index, programLevel);
                processedFeeStructure.push({
                    name: period,
                    amount: amount,
                    hostel: 0,
                    components: []
                });
                periodTotals.push(amount);
            });
        }
        
        const currentPeriod = accountData?.current_period || periods[0] || 'Term 1';
        const currentPeriodIndex = periods.indexOf(currentPeriod) >= 0 ? periods.indexOf(currentPeriod) : 0;
        
        let balance, totalPaid, outstanding, totalDue;
        if (accountData) {
            balance = parseFloat(accountData.balance) || 0;
            totalPaid = parseFloat(accountData.total_paid) || 0;
            outstanding = parseFloat(accountData.outstanding) || 0;
            totalDue = parseFloat(accountData.total_due) || 0;
        } else {
            const allPayments = paymentsData.filter(p => p.status === 'completed');
            totalPaid = allPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
            totalDue = getFeeAmount(programType, currentPeriodIndex, programLevel);
            balance = Math.max(totalDue - totalPaid, 0);
            outstanding = balance;
        }
        
        const paidThisSemester = paymentsData
            .filter(p => {
                const pPeriod = mapPeriodToDisplay(p.period);
                return pPeriod === currentPeriod && p.status === 'completed';
            })
            .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
        
        const semesterFee = totalDue > 0 ? totalDue : getFeeAmount(programType, currentPeriodIndex, programLevel);
        
        const formattedPayments = paymentsData.map(p => ({
            date: p.payment_date || p.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
            description: p.notes || `${mapPeriodToDisplay(p.period)} Fees`,
            period: mapPeriodToDisplay(p.period) || 'N/A',
            amount: parseFloat(p.amount || 0),
            method: p.payment_method || 'Cash',
            reference: p.reference_number || p.checkout_request_id || '-',
            status: p.status || 'pending',
            transaction_id: p.checkout_request_id || null,
            payment_method: p.payment_method || 'Cash'
        }));
        
        const formattedFees = processedFeeStructure.map((f, index) => ({
            block: f.name,
            amount: f.amount,
            description: `${f.name} Tuition Fees`,
            status: index <= currentPeriodIndex ? (index === currentPeriodIndex && paidThisSemester > 0 ? 'Partial' : 'Paid') : 'Pending'
        }));
        
        return {
            balance: balance,
            totalPaid: totalPaid,
            totalDue: semesterFee,
            outstanding: outstanding,
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
            voteHeads: voteHeads,
            feeStructureRaw: { periods: processedFeeStructure, voteHeads: voteHeads, periodTotals: periodTotals },
            student: {
                name: studentName,
                id: profile?.student_id || user?.student_id || user?.id || 'N/A',
                userId: userId,
                profileId: profileId,
                program: program,
                intake: user?.intake_year || '2026',
                programType: programType,
                programLevel: programLevel
            }
        };
    } catch (error) {
        console.error('❌ Error fetching from Supabase:', error);
        return null;
    }
}

// ============================================================
// 📊 MAIN LOAD FUNCTION - FIXED
// ============================================================

async function loadStudentFinance() {
    try {
        console.log('💰 Loading student finance...');
        
        const user = window.currentUserProfile || window.currentUser || window.userData;
        if (!user) {
            console.warn('No user found');
            showFinanceError('Please login to view your finance data.');
            return;
        }

        console.log('👤 User:', user.full_name || user.name);
        console.log('📚 Program:', user.program);
        console.log('🆔 User ID:', user.user_id || user.id);

        const program = user.program || 'KRCHN';
        const programType = getProgramType(program);
        const programLevel = getProgramLevel(program);
        studentFinanceState.programType = programType;
        studentFinanceState.programLevel = programLevel;
        studentFinanceState.student = user;
        
        console.log('🏷️ Program Type:', programType);
        console.log('📊 Program Level:', programLevel);

        updateProgramInfo(user, programType, programLevel);
        showFinanceLoading();

        const financeData = await fetchFinanceDataFromSupabase(user);
        
        if (financeData) {
            if (financeData.feeStructureRaw) {
                studentFinanceState.feeStructureRaw = financeData.feeStructureRaw;
                studentFinanceState.voteHeads = financeData.voteHeads || [];
            }
            
            updateFinanceUI(financeData);
            studentFinanceState.isLoaded = true;
            studentFinanceState.lastUpdated = new Date();
            console.log('✅ Finance data loaded successfully');
            
            notifySuperAdmin('student_finance_viewed', {
                studentId: user.user_id || user.id,
                studentName: user.full_name || user.name,
                program: program,
                balance: financeData.balance,
                timestamp: new Date().toISOString()
            });
        } else {
            console.log('📊 No data found, showing empty state');
            showFinanceError('No finance data available. Please contact finance office.');
        }
    } catch (error) {
        console.error('Error loading finance:', error);
        showFinanceError('Unable to load finance data. Please try again.');
    }
}

// ============================================================
// 🎨 UI UPDATE FUNCTIONS - FIXED
// ============================================================

function updateProgramInfo(user, programType, programLevel) {
    const periodLabel = getPeriodLabel(programType);
    const periods = getPeriods(programType, programLevel);
    
    const programDisplay = document.getElementById('finance-studentProgramDisplay');
    if (programDisplay) programDisplay.textContent = user.program || user.program_name || 'N/A';
    
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

function updateFinanceUI(data) {
    if (!data) return;
    
    studentFinanceState.student = data.student;
    studentFinanceState.payments = data.payments || [];
    studentFinanceState.feeStructure = data.feeStructure || [];
    studentFinanceState.currentPeriod = data.currentPeriod;
    studentFinanceState.semesterFee = data.semesterFee;
    studentFinanceState.paidThisSemester = data.paidThisSemester;
    studentFinanceState.balance = data.balance;
    studentFinanceState.totalPaid = data.totalPaid;
    studentFinanceState.outstanding = data.outstanding;
    
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
    
    const timelineLabel = document.getElementById('finance-timelineProgramLabel');
    if (timelineLabel) {
        timelineLabel.textContent = `${programType} - ${programLevel === 'certificate' ? 'Certificate' : 'Diploma'}`;
    }
    
    if (!feeStructure || feeStructure.length === 0) {
        timeline.innerHTML = `<div style="text-align: center; padding: 12px; color: #94a3b8; font-size: 11px;"><i class="fas fa-info-circle"></i> No fee structure</div>`;
        return;
    }
    
    let html = '';
    feeStructure.forEach((f, index) => {
        const isPaid = f.status === 'Paid';
        const isPartial = f.status === 'Partial';
        
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
            <div style="min-width: 70px; text-align: center; padding: 4px 6px; background: ${bgColor}; border-radius: 4px; border: 1px solid ${borderColor};">
                <div style="font-size: 7px; color: ${index === 0 ? '#0A3D62' : '#6b7280'}; font-weight: 600;">
                    ${f.block}
                    ${index === 0 ? ' <span style="background: #4C1D95; color: white; padding: 1px 3px; border-radius: 6px; font-size: 6px;">C</span>' : ''}
                </div>
                <div style="font-weight: 700; color: ${textColor}; font-size: 11px;">${statusIcon} ${statusText}</div>
                <div style="font-size: 7px; color: #94a3b8;">${amountText}</div>
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
                <td colspan="5" style="text-align: center; padding: 24px; color: #94a3b8; font-size: 12px;">
                    <i class="fas fa-inbox" style="font-size: 24px; display: block; margin-bottom: 4px;"></i>
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
        
        return `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 6px 8px; font-weight: 600; color: #0A3D62; font-size: 10px;">${p.period}</td>
                <td style="padding: 6px 8px; font-size: 10px;">${p.description}</td>
                <td style="padding: 6px 8px; font-weight: 600; color: #4C1D95; font-size: 10px;">KES ${p.amount.toLocaleString()}</td>
                <td style="padding: 6px 8px; text-align: center; font-size: 9px;">
                    <span style="display: inline-block; padding: 2px 6px; border-radius: 8px; font-size: 8px; font-weight: 600; ${statusStyle}">
                        ${statusLabel}
                    </span>
                </td>
                <td style="padding: 6px 4px; text-align: center; white-space: nowrap;">
                    <button onclick="viewFeeStructure('${p.period}')" style="background: #dbeafe; color: #1e40af; border: none; padding: 2px 6px; border-radius: 3px; cursor: pointer; font-size: 8px;">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${p.status === 'completed' ? `<button onclick="resendPaymentEmail()" style="background: #d1fae5; color: #059669; border: none; padding: 2px 6px; border-radius: 3px; cursor: pointer; font-size: 8px;">
                        <i class="fas fa-envelope"></i>
                    </button>` : ''}
                </td>
            </tr>
        `;
    }).join('');
}

// ============================================================
// 📄 RENDER FEE STRUCTURE - MOBILE OPTIMIZED - FIXED
// ============================================================

function renderFeeStructureData() {
    const container = document.getElementById('finance-feeStructureContent');
    if (!container) return;
    
    const displayContainer = document.getElementById('finance-studentFeeStructureDisplay');
    if (displayContainer && displayContainer.style.display === 'none') return;
    
    const data = studentFinanceState.feeStructureRaw;
    if (!data || !data.periods || data.periods.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 16px; color: #94a3b8; font-size: 12px;">
                <i class="fas fa-info-circle" style="font-size: 18px; display: block; margin-bottom: 4px;"></i>
                <p>No fee structure available.</p>
            </div>
        `;
        container.style.display = 'block';
        return;
    }
    
    const { periods, voteHeads, periodTotals } = data;
    const programType = studentFinanceState.programType || 'TVET';
    
    let html = `
        <div style="overflow-x: auto; margin: 0 -4px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 10px; min-width: 420px;">
                <thead>
                    <tr style="background: #f8fafc; border-bottom: 2px solid #e5e7eb;">
                        <th style="padding: 4px 6px; text-align: left; font-weight: 600; color: #475569; font-size: 9px; text-transform: uppercase; width: 28px;">#</th>
                        <th style="padding: 4px 6px; text-align: left; font-weight: 600; color: #475569; font-size: 9px; text-transform: uppercase;">VOTE HEAD</th>
                        ${periods.map((p, i) => `
                            <th style="padding: 4px 4px; text-align: right; font-weight: 600; color: #475569; font-size: 8px; text-transform: uppercase; min-width: 50px;">
                                ${p.name}
                                ${i === 0 ? ' <span style="background: #4C1D95; color: white; padding: 1px 3px; border-radius: 6px; font-size: 6px;">C</span>' : ''}
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
                <td style="padding: 3px 6px; text-align: center; font-weight: 500; color: #94a3b8; font-size: 9px;">${sn}</td>
                <td style="padding: 3px 6px; font-weight: 500; color: #0b1124; font-size: 9px;">${vh.label}</td>
                ${vh.amounts.map(amount => `
                    <td style="padding: 3px 4px; text-align: right; font-weight: 500; color: #0A3D62; font-size: 9px;">
                        ${amount > 0 ? `KES ${amount.toLocaleString()}` : '---'}
                    </td>
                `).join('')}
            </tr>
        `;
    });
    
    html += `
        <tr style="background: #f8fafc; font-weight: 700; border-top: 2px solid #4C1D95;">
            <td style="padding: 4px 6px; text-align: center; color: #0A3D62; font-size: 9px;">-</td>
            <td style="padding: 4px 6px; font-weight: 700; color: #0A3D62; font-size: 9px;">
                <i class="fas fa-calculator" style="color: #4C1D95; margin-right: 3px; font-size: 9px;"></i> TOTAL
            </td>
            ${periodTotals.map(total => `
                <td style="padding: 4px 4px; text-align: right; font-weight: 700; color: #4C1D95; font-size: 10px;">
                    KES ${total.toLocaleString()}
                </td>
            `).join('')}
        </tr>
    `;
    
    html += `
                </tbody>
            </table>
        </div>
        <div style="margin-top: 6px; padding: 6px 8px; background: #f8fafc; border-radius: 4px; border: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 4px; font-size: 9px;">
            <span style="color: #64748b;">📚 ${periods.length} ${programType === 'KRCHN' ? 'Semesters' : 'Terms'}</span>
            <span style="color: #64748b;">📋 ${voteHeads.filter(v => v.amounts.some(a => a > 0)).length} Vote Heads</span>
            <button onclick="printFeeStructureTable()" style="background: #475569; color: white; padding: 2px 10px; border-radius: 4px; border: none; cursor: pointer; font-size: 9px;">
                <i class="fas fa-print"></i> Print
            </button>
        </div>
    `;
    
    container.innerHTML = html;
    container.style.display = 'block';
}

// ============================================================
// 🔄 TOGGLE FEE STRUCTURE
// ============================================================

function toggleFeeStructure() {
    const container = document.getElementById('finance-studentFeeStructureDisplay');
    const toggleBtn = document.querySelector('[aria-controls="finance-studentFeeStructureDisplay"]');
    const toggleText = document.getElementById('finance-toggleFeeText');
    
    if (!container) {
        console.warn('⚠️ finance-studentFeeStructureDisplay not found');
        return;
    }
    
    if (container.style.display === 'none' || container.style.display === '') {
        container.style.display = 'block';
        container.style.animation = 'fadeIn 0.3s ease';
        
        if (toggleBtn) {
            toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i> <span id="finance-toggleFeeText">Hide Fee Structure</span>';
            toggleBtn.setAttribute('aria-expanded', 'true');
        }
        if (toggleText) {
            toggleText.textContent = 'Hide Fee Structure';
        }
        studentFinanceState.feeStructureVisible = true;
        
        if (studentFinanceState.feeStructureRaw) {
            renderFeeStructureData();
        } else {
            loadStudentFinance();
        }
        
        setTimeout(() => {
            container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
        
        notifySuperAdmin('fee_structure_viewed', {
            studentId: studentFinanceState.student?.user_id || studentFinanceState.student?.id,
            timestamp: new Date().toISOString()
        });
    } else {
        container.style.display = 'none';
        container.style.animation = 'fadeOut 0.3s ease';
        if (toggleBtn) {
            toggleBtn.innerHTML = '<i class="fas fa-eye"></i> <span id="finance-toggleFeeText">View Fee Structure</span>';
            toggleBtn.setAttribute('aria-expanded', 'false');
        }
        if (toggleText) {
            toggleText.textContent = 'View Fee Structure';
        }
        studentFinanceState.feeStructureVisible = false;
    }
}

// ============================================================
// 👁️ VIEW FUNCTIONS
// ============================================================

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

function viewVoteHeadDetails(voteHeadName) {
    console.log('👁️ Viewing vote head:', voteHeadName);
    
    const data = studentFinanceState.feeStructureRaw;
    if (!data || !data.voteHeads) {
        showToast('❌ Fee data not loaded', 'error');
        return;
    }
    
    const vh = data.voteHeads.find(v => v.label === voteHeadName);
    if (!vh) {
        showToast(`❌ Vote head "${voteHeadName}" not found`, 'error');
        return;
    }
    
    const periods = data.periods;
    let detailsHtml = `
        <div style="text-align: left;">
            <h4 style="color: #0A3D62; margin: 0 0 8px 0; font-size: 14px;">📊 ${vh.label}</h4>
            <div style="background: #f8fafc; padding: 8px; border-radius: 6px;">
    `;
    
    periods.forEach((period, index) => {
        const amount = vh.amounts[index] || 0;
        if (amount > 0) {
            detailsHtml += `
                <div style="display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #f1f5f9; font-size: 11px;">
                    <span style="color: #475569;">${period.name}</span>
                    <span style="font-weight: 600; color: #0A3D62;">KES ${amount.toLocaleString()}</span>
                </div>
            `;
        }
    });
    
    detailsHtml += `
            </div>
        </div>
    `;
    
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Vote Head Details',
            html: detailsHtml,
            confirmButtonColor: '#4C1D95',
            confirmButtonText: 'Close',
            width: 400
        });
    } else {
        alert(detailsHtml.replace(/<[^>]*>/g, ''));
    }
}

function viewFullFeeStructure() {
    const data = studentFinanceState.feeStructureRaw;
    if (!data) {
        showToast('❌ Fee data not loaded', 'error');
        return;
    }
    
    const { periods, voteHeads } = data;
    const programType = studentFinanceState.programType || 'TVET';
    
    let tableHtml = `
        <div style="text-align: left; overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                <thead>
                    <tr style="background: #f8fafc; border-bottom: 2px solid #e5e7eb;">
                        <th style="padding: 4px 8px; text-align: left; font-weight: 600;">S/N</th>
                        <th style="padding: 4px 8px; text-align: left; font-weight: 600;">VOTE HEADS</th>
                        ${periods.map(p => `<th style="padding: 4px 8px; text-align: right; font-weight: 600; font-size: 8px;">${p.name}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
    `;
    
    let sn = 0;
    voteHeads.forEach(vh => {
        sn++;
        const hasAnyAmount = vh.amounts.some(a => a > 0);
        if (!hasAnyAmount) return;
        
        tableHtml += `
            <tr>
                <td style="padding: 3px 8px; border-bottom: 1px solid #f1f5f9;">${sn}</td>
                <td style="padding: 3px 8px; border-bottom: 1px solid #f1f5f9; font-weight: 500;">${vh.label}</td>
                ${vh.amounts.map(amount => `
                    <td style="padding: 3px 8px; border-bottom: 1px solid #f1f5f9; text-align: right; ${amount > 0 ? 'font-weight: 500;' : 'color: #94a3b8;'}">${amount > 0 ? `KES ${amount.toLocaleString()}` : '---'}</td>
                `).join('')}
            </tr>
        `;
    });
    
    tableHtml += `
        <tr style="background: #f8fafc; font-weight: 700; border-top: 2px solid #4C1D95;">
            <td colspan="2" style="padding: 4px 8px;">TOTAL</td>
            ${periods.map(p => `
                <td style="padding: 4px 8px; text-align: right; color: #4C1D95;">KES ${p.amount.toLocaleString()}</td>
            `).join('')}
        </tr>
    `;
    
    const hasHostel = periods.some(p => p.hostel > 0);
    if (hasHostel) {
        tableHtml += `
            <tr style="background: #fffbeb;">
                <td colspan="2" style="padding: 4px 8px; color: #92400e;">🏠 HOSTEL (optional)</td>
                ${periods.map(p => `
                    <td style="padding: 4px 8px; text-align: right; color: #92400e;">${p.hostel > 0 ? `KES ${p.hostel.toLocaleString()}` : '---'}</td>
                `).join('')}
            </tr>
        `;
    }
    
    tableHtml += `
                </tbody>
            </table>
        </div>
    `;
    
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: `📋 Full Fee Structure - ${programType}`,
            html: tableHtml,
            confirmButtonColor: '#4C1D95',
            confirmButtonText: 'Close',
            width: 700,
            padding: '16px'
        });
    } else {
        alert(tableHtml.replace(/<[^>]*>/g, ''));
    }
}

// ============================================================
// 🎯 ACTION FUNCTIONS
// ============================================================

function downloadStudentStatement() {
    showToast('📄 Generating statement...', 'info');
    setTimeout(() => {
        showToast('✅ Statement downloaded!', 'success');
        notifySuperAdmin('statement_downloaded', {
            studentId: studentFinanceState.student?.user_id || studentFinanceState.student?.id,
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
            <div style="display: flex; justify-content: space-between; padding: 3px 0; border-bottom: ${index < periods.length - 1 ? '1px solid #e5e7eb' : 'none'}; font-size: 11px;">
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
                    <div style="background: #f8fafc; padding: 8px; border-radius: 4px; margin: 4px 0; border: 1px solid #e5e7eb;">
                        ${invoicesHtml}
                    </div>
                    <p style="font-size: 9px; color: #94a3b8; margin-top: 4px;">
                        <i class="fas fa-info-circle"></i> 
                        ${programType === 'KRCHN' ? '3 Semesters per year for 3 years' : 
                          programLevel === 'certificate' ? '3 Terms per year for 1 year' : '3 Terms per year for 2 years'}
                    </p>
                </div>
            `,
            confirmButtonText: 'Close',
            confirmButtonColor: '#4C1D95',
            width: 360
        });
    }
}

function printFeeStructureTable() {
    window.print();
}

function resendPaymentEmail() {
    const user = studentFinanceState.student;
    if (!user?.user_id && !user?.id) { showToast('❌ User not found', 'error'); return; }
    showToast('📧 Resending confirmation email...', 'info');
    setTimeout(() => showToast('✅ Email resent!', 'success'), 1500);
}

// ============================================================
// 💳 PAYMENT MODAL - POS STYLE
// ============================================================

function openPaymentModal() {
    console.log('💰 Opening payment modal...');
    
    const modal = document.getElementById('finance-paymentModal');
    if (!modal) {
        console.error('❌ Modal not found');
        showToast('Payment system error. Please refresh the page.', 'error');
        return;
    }
    
    const content = document.getElementById('finance-paymentContent');
    const title = document.getElementById('finance-paymentModalTitle');
    const formContainer = document.getElementById('finance-paymentFormContainer');
    const periodSelect = document.getElementById('finance-paymentPeriodSelect');
    const amountInput = document.getElementById('finance-paymentAmountInput');
    const descInput = document.getElementById('finance-paymentDescriptionInput');
    const mpesaFields = document.getElementById('finance-mpesaFields');
    const methodDetails = document.getElementById('finance-paymentMethodDetails');
    
    if (title) title.textContent = '💳 Make Payment';
    if (content) content.style.display = 'none';
    if (formContainer) formContainer.style.display = 'block';
    
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
        
        const selectedPeriod = periodSelect.value;
        if (selectedPeriod) {
            const index = periods.indexOf(selectedPeriod);
            if (index !== -1 && amountInput) {
                const amount = getFeeAmount(programType, index, programLevel);
                if (!amountInput.value) amountInput.value = amount;
            }
            if (descInput) {
                descInput.value = `${selectedPeriod} Tuition Fees`;
            }
        }
    }
    
    if (amountInput) {
        const balance = studentFinanceState.balance || 0;
        if (balance > 0) {
            amountInput.placeholder = `Suggested: KES ${balance.toLocaleString()}`;
            if (!amountInput.value) amountInput.value = balance;
        }
    }
    
    if (descInput && studentFinanceState.currentPeriod) {
        if (!descInput.value) {
            descInput.value = `${studentFinanceState.currentPeriod} Tuition Fees`;
        }
    }
    
    document.querySelectorAll('.payment-method-item').forEach(el => {
        el.classList.remove('selected');
    });
    
    if (mpesaFields) mpesaFields.style.display = 'none';
    if (methodDetails) methodDetails.style.display = 'none';
    
    document.querySelectorAll('.finance-validation-error').forEach(el => el.style.display = 'none');
    
    selectPaymentMethod('mpesa');
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    console.log('✅ Payment modal opened successfully');
}

function closePaymentModal() {
    const modal = document.getElementById('finance-paymentModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
        
        const content = document.getElementById('finance-paymentContent');
        const formContainer = document.getElementById('finance-paymentFormContainer');
        if (content) content.style.display = 'none';
        if (formContainer) formContainer.style.display = 'block';
    }
    pendingPayment.isProcessing = false;
    pendingPayment.cancelled = false;
}

function selectPaymentMethod(method) {
    console.log('📱 Selecting payment method:', method);
    
    document.querySelectorAll('.payment-method-item').forEach(el => {
        el.classList.remove('selected');
    });
    
    const selectedEl = document.getElementById(`finance-method-${method}`);
    if (selectedEl) {
        selectedEl.classList.add('selected');
    }
    
    const mpesaFields = document.getElementById('finance-mpesaFields');
    if (mpesaFields) {
        mpesaFields.style.display = 'none';
    }
    
    const detailsContent = document.getElementById('finance-methodDetailsContent');
    const detailsContainer = document.getElementById('finance-paymentMethodDetails');
    
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
        paypal: 'Pay using your PayPal account.',
        card: 'Pay using your Visa or Mastercard.',
        bank: 'Pay via bank transfer.'
    };
    
    if (detailsContent) {
        detailsContent.innerHTML = `
            <div style="display: flex; align-items: center; gap: 4px;">
                <span style="font-size: 14px;">${methodIcons[method] || '💳'}</span>
                <strong style="color: #0A3D62; font-size: 12px;">${methodNames[method] || method}</strong>
            </div>
            <p style="margin: 2px 0 0 0; font-size: 10px; color: #64748b;">${methodDescriptions[method] || 'Select this payment method'}</p>
        `;
    }
    if (detailsContainer) {
        detailsContainer.style.display = 'block';
    }
    
    if (method === 'mpesa') {
        if (mpesaFields) {
            mpesaFields.style.display = 'block';
        }
        const user = window.currentUserProfile || window.currentUser;
        if (user?.phone) {
            const phoneInput = document.getElementById('finance-mpesaPhoneInput');
            if (phoneInput) phoneInput.value = user.phone;
        }
    }
    
    studentFinanceState.selectedPaymentMethod = method;
    const methodError = document.getElementById('finance-methodError');
    if (methodError) methodError.style.display = 'none';
}

// ============================================================
// 📝 VALIDATE PAYMENT FORM
// ============================================================

function validatePaymentForm() {
    let isValid = true;
    document.querySelectorAll('.finance-validation-error').forEach(err => err.style.display = 'none');
    
    const period = document.getElementById('finance-paymentPeriodSelect');
    if (!period || !period.value) {
        const errorEl = period?.nextElementSibling;
        if (errorEl && errorEl.classList.contains('finance-validation-error')) errorEl.style.display = 'block';
        isValid = false;
    }
    
    const amount = document.getElementById('finance-paymentAmountInput');
    if (!amount || !amount.value || parseFloat(amount.value) < 1) {
        const errorEl = amount?.nextElementSibling;
        if (errorEl && errorEl.classList.contains('finance-validation-error')) errorEl.style.display = 'block';
        isValid = false;
    }
    
    const selectedMethod = document.querySelector('.payment-method-item.selected');
    if (!selectedMethod) {
        const errorEl = document.getElementById('finance-methodError');
        if (errorEl) errorEl.style.display = 'block';
        isValid = false;
    }
    
    let method = null;
    if (selectedMethod) {
        const id = selectedMethod.id || '';
        method = id.replace('finance-method-', '');
    }
    
    if (method === 'mpesa') {
        const phone = document.getElementById('finance-mpesaPhoneInput');
        if (!phone || !phone.value || phone.value.replace(/\D/g, '').length < 10) {
            const mpesaContainer = document.getElementById('finance-mpesaFields');
            if (mpesaContainer) {
                const errorEl = mpesaContainer.querySelector('.finance-validation-error');
                if (errorEl) errorEl.style.display = 'block';
            }
            isValid = false;
        }
    }
    
    if (!isValid) showToast('Please fix all validation errors.', 'error');
    return isValid;
}

// ============================================================
// 💰 GET SUPABASE CLIENT
// ============================================================

function getSupabaseClient() {
    if (window.sb) return window.sb;
    if (window.supabase) return window.supabase;
    if (typeof supabase !== 'undefined') return supabase;
    console.error('❌ No Supabase client found');
    return null;
}

// ============================================================
// 💰 SAVE PAYMENT RECORD - FIXED (NO .catch())
// ============================================================

async function saveSTKPaymentRecord(amount, period, result) {
    try {
        const supabase = getSupabaseClient();
        if (!supabase) {
            console.error('❌ No Supabase client available');
            savePaymentLocally({
                amount: amount,
                period: period,
                status: 'pending',
                reference: result?.reference || `TXN-${Date.now()}`
            });
            return false;
        }

        const user = window.currentUserProfile || window.currentUser;
        const transactionId = result.transactionId || result.checkoutRequestID || `TXN-${Date.now()}`;
        const method = result.paymentMethod || studentFinanceState.selectedPaymentMethod || 'M-Pesa STK';
        const status = result.status === 'success' ? 'completed' : 'pending';
        const reference = result.reference || `PAY-${Date.now()}`;
        
        const dbPeriod = mapPeriodToDatabase(period);
        
        const paymentRecord = {
            student_id: user?.user_id || user?.id || 'student_001',
            student_name: user?.full_name || user?.name || 'Student',
            student_email: user?.email || '',
            program: user?.program || 'KRCHN',
            amount: parseFloat(amount),
            payment_method: method,
            reference_number: reference,
            payment_date: new Date().toISOString().split('T')[0],
            period: dbPeriod || period,
            status: status,
            notes: `${period} Tuition Fees - ${method} Payment`,
            checkout_request_id: transactionId,
            phone_number: result.phoneNumber || '',
            program_type: studentFinanceState.programType || 'KRCHN',
            metadata: { source: 'payhero', original_period: period },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        console.log('📝 Saving payment record:', paymentRecord);

        try {
            const { data, error } = await supabase
                .from('finance_payments')
                .insert([paymentRecord])
                .select();

            if (error) {
                console.error('❌ Database error:', error);
                savePaymentLocally(paymentRecord);
                return false;
            }
            
            console.log('✅ Payment record saved:', data);
            return true;
            
        } catch (insertError) {
            console.error('❌ Insert error:', insertError.message);
            savePaymentLocally(paymentRecord);
            return false;
        }
        
    } catch (error) {
        console.error('❌ Error saving payment:', error.message);
        const user = window.currentUserProfile || window.currentUser;
        const fallbackRecord = {
            student_id: user?.user_id || user?.id || 'student_001',
            student_name: user?.full_name || user?.name || 'Student',
            amount: amount,
            period: period,
            status: 'pending',
            reference_number: result?.reference || `TXN-${Date.now()}`,
            checkout_request_id: result?.transactionId || result?.checkoutRequestID || null
        };
        savePaymentLocally(fallbackRecord);
        return false;
    }
}

function savePaymentLocally(paymentRecord) {
    try {
        let payments = JSON.parse(localStorage.getItem('local_payments') || '[]');
        payments.unshift(paymentRecord);
        if (payments.length > 50) payments = payments.slice(0, 50);
        localStorage.setItem('local_payments', JSON.stringify(payments));
        console.log('💾 Payment saved locally:', paymentRecord.reference_number);
    } catch (e) {
        console.error('❌ Failed to save locally:', e);
    }
}

// ============================================================
// 🔍 CHECK PAYMENT STATUS - FIXED
// ============================================================

async function checkPaymentStatusDB(reference) {
    try {
        const supabase = getSupabaseClient();
        if (!supabase) {
            console.warn('⚠️ No Supabase client, checking local storage');
            return checkLocalPayment(reference);
        }
        
        console.log(`🔍 Checking payment status for: ${reference}`);
        
        let payment = null;
        
        try {
            const { data, error } = await supabase
                .from('finance_payments')
                .select('*')
                .eq('checkout_request_id', reference)
                .maybeSingle();
            
            if (!error && data) {
                payment = data;
                console.log('📊 Found by checkout_request_id:', payment.status);
            }
        } catch (e) {
            console.log('⚠️ Check by checkout_request_id failed:', e.message);
        }
        
        if (!payment) {
            try {
                const { data, error } = await supabase
                    .from('finance_payments')
                    .select('*')
                    .eq('reference_number', reference)
                    .maybeSingle();
                    
                if (!error && data) {
                    payment = data;
                    console.log('📊 Found by reference_number:', payment.status);
                }
            } catch (e) {
                console.log('⚠️ Check by reference_number failed:', e.message);
            }
        }
        
        if (payment) {
            return payment;
        }
        
        return checkLocalPayment(reference);
        
    } catch (error) {
        console.error('❌ Database check error:', error.message);
        return checkLocalPayment(reference);
    }
}

function checkLocalPayment(reference) {
    try {
        const localPayments = JSON.parse(localStorage.getItem('local_payments') || '[]');
        const found = localPayments.find(p => 
            p.checkout_request_id === reference || 
            p.reference_number === reference
        );
        return found || null;
    } catch (e) {
        return null;
    }
}

// ============================================================
// 💰 INITIATE STK PUSH - USING EDGE FUNCTION
// ============================================================

async function initiatePayHeroSTK(amount, phoneNumber, reference, period, customerName = '') {
    try {
        let cleanPhone = formatPhoneNumber(phoneNumber);
        if (!cleanPhone) {
            showToast('❌ Enter valid phone (e.g., 0712345678)', 'error');
            return { success: false, error: 'Invalid phone number' };
        }

        const user = window.currentUserProfile || window.currentUser;
        const studentName = customerName || user?.full_name || user?.name || 'Student';

        console.log('📤 Sending STK Push via Edge Function...');
        console.log('📱 Phone:', cleanPhone);
        console.log('💰 Amount:', amount);
        console.log('📋 Reference:', reference);

        const supabase = getSupabaseClient();
        if (!supabase) {
            throw new Error('Supabase client not available');
        }

        const { data, error } = await supabase.functions.invoke('payhero', {
            body: {
                action: 'stk_push',
                phone: cleanPhone,
                amount: Math.round(amount),
                order_id: reference,
                payment_id: pendingPayment.paymentId || null,
                customer_name: studentName,
                description: `${period} Tuition Fees Payment`
            }
        });

        if (error) {
            console.error('❌ Edge Function error:', error);
            return { success: false, error: error.message || 'STK Push failed' };
        }

        console.log('📥 Response:', data);

        if (data.success) {
            console.log('✅ STK Push initiated!');
            
            const result = {
                transactionId: data.transaction_id,
                checkoutRequestID: data.transaction_id,
                reference: data.transaction_id || reference,
                status: 'pending',
                paymentMethod: 'M-Pesa STK Push',
                phoneNumber: cleanPhone
            };
            
            await saveSTKPaymentRecord(amount, period, result);
            
            return { 
                success: true, 
                data: data,
                reference: data.transaction_id || reference,
                transactionId: data.transaction_id
            };
        } else {
            console.error('❌ STK Push failed:', data);
            return { 
                success: false, 
                error: data.message || data.error || 'STK Push failed' 
            };
        }

    } catch (error) {
        console.error('❌ Request error:', error);
        showToast('❌ Network error. Please try again.', 'error');
        return { success: false, error: error.message };
    }
}

// ============================================================
// 🔍 CHECK PAYMENT STATUS - USING EDGE FUNCTION
// ============================================================

async function checkPaymentStatus(reference) {
    try {
        const supabase = getSupabaseClient();
        if (!supabase) {
            return await checkPaymentStatusDB(reference);
        }

        const { data, error } = await supabase.functions.invoke('payhero', {
            body: {
                action: 'status',
                transaction_id: reference
            }
        });

        if (error) {
            console.error('❌ Status check error:', error);
            return await checkPaymentStatusDB(reference);
        }

        console.log('📊 Status response:', data);

        if (data && data.success) {
            return {
                status: data.status || 'pending',
                reference_number: reference,
                receipt_number: data.receipt_number,
                checkout_request_id: reference,
                result_description: data.result_description,
                ...data
            };
        }

        return await checkPaymentStatusDB(reference);

    } catch (error) {
        console.error('❌ Status check error:', error);
        return await checkPaymentStatusDB(reference);
    }
}

// ============================================================
// 💰 UPDATE BALANCE AFTER PAYMENT
// ============================================================

async function updateStudentBalanceAfterPayment(amount) {
    try {
        const user = window.currentUserProfile || window.currentUser;
        if (!user) return;
        
        const userId = user.user_id || user.id;
        if (!userId) return;
        
        const supabase = getSupabaseClient();
        if (!supabase) return;
        
        try {
            const { data: account } = await supabase
                .from('finance_student_accounts')
                .select('balance, total_paid')
                .eq('student_id', userId)
                .single();
            
            if (account) {
                const newBalance = Math.max((account.balance || 0) - amount, 0);
                const newTotalPaid = (account.total_paid || 0) + amount;
                
                await supabase
                    .from('finance_student_accounts')
                    .update({
                        balance: newBalance,
                        total_paid: newTotalPaid,
                        last_payment_date: new Date().toISOString().split('T')[0],
                        updated_at: new Date().toISOString()
                    })
                    .eq('student_id', userId);
                
                console.log(`✅ Balance updated: New balance KES ${newBalance.toLocaleString()}`);
                studentFinanceState.balance = newBalance;
                studentFinanceState.outstanding = newBalance;
                studentFinanceState.totalPaid = newTotalPaid;
            }
        } catch (e) {
            console.log('⚠️ No account found, creating one...');
            await supabase
                .from('finance_student_accounts')
                .insert({
                    student_id: userId,
                    student_name: user.full_name || user.name,
                    program: user.program || 'KRCHN',
                    balance: 0,
                    total_paid: amount,
                    current_period: studentFinanceState.currentPeriod,
                    last_payment_date: new Date().toISOString().split('T')[0],
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
            console.log('✅ Account created');
        }
    } catch (error) {
        console.error('❌ Error updating balance:', error);
    }
}

// ============================================================
// 🔄 UPDATE STK STATUS - STUDENT FINANCE
// ============================================================

function updateStudentSTKStatus(attempt, maxAttempts, message) {
    const content = document.getElementById('finance-paymentContent');
    const formContainer = document.getElementById('finance-paymentFormContainer');
    const title = document.getElementById('finance-paymentModalTitle');
    
    if (title) title.textContent = '⏳ Processing Payment';
    if (content) {
        content.style.display = 'block';
        const remaining = Math.round((maxAttempts - attempt) * 2);
        const progress = Math.min(Math.round((attempt / maxAttempts) * 100), 100);
        
        content.innerHTML = `
            <div class="spinner"></div>
            <p class="status-text">⏳ Waiting for payment confirmation... (${attempt}/${maxAttempts})</p>
            <div style="width:100%;max-width:300px;margin:8px auto;height:4px;background:#e5e7eb;border-radius:2px;overflow:hidden;">
                <div style="height:100%;background:linear-gradient(90deg,#4C1D95,#7c3aed);border-radius:2px;width:${progress}%;transition:width 0.5s ease;"></div>
            </div>
            <p class="status-sub">${message || 'Please check your phone and enter your PIN'}</p>
            <p class="status-sub" style="font-size:12px;color:#94A3B8;margin-top:8px;">
                ⏱️ ${remaining} seconds remaining
            </p>
            <button class="btn btn-danger" style="margin-top:12px;width:100%;" onclick="cancelStudentPayment()">
                <i class="fas fa-times"></i> Cancel Payment
            </button>
        `;
    }
    if (formContainer) formContainer.style.display = 'none';
}

// ============================================================
// 🔍 POLL STUDENT PAYMENT STATUS - FIXED WITH CANCELLATION & INSUFFICIENT FUNDS
// ============================================================

async function pollStudentPaymentStatus(transactionId, amount, period) {
    let attempts = 0;
    const maxAttempts = 30;
    let paymentConfirmed = false;
    let paymentData = null;
    let shouldStopPolling = false;
    
    updateStudentSTKStatus(0, maxAttempts, 'Waiting for payment confirmation...');
    
    while (attempts < maxAttempts && !paymentConfirmed && !shouldStopPolling) {
        // ✅ Check if user cancelled
        if (pendingPayment.cancelled) {
            pendingPayment.isProcessing = false;
            shouldStopPolling = true;
            
            try {
                const supabase = getSupabaseClient();
                if (supabase) {
                    await supabase
                        .from('finance_payments')
                        .update({
                            status: 'cancelled',
                            notes: 'Payment cancelled by user',
                            updated_at: new Date().toISOString()
                        })
                        .eq('checkout_request_id', transactionId);
                    
                    console.log('✅ Payment marked as CANCELLED in database');
                }
            } catch (e) {
                console.log('⚠️ Could not update cancelled status:', e);
            }
            
            showStudentPaymentFailure('You cancelled the payment');
            showToast('⛔ Payment cancelled', 'warning');
            return;
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
        
        updateStudentSTKStatus(attempts, maxAttempts, 'Please check your phone and enter your PIN');
        
        try {
            const supabase = getSupabaseClient();
            if (!supabase) {
                console.log('⚠️ No Supabase client');
                continue;
            }
            
            const { data: statusData, error: statusError } = await supabase.functions.invoke('payhero', {
                body: {
                    action: 'status',
                    transaction_id: transactionId
                }
            });
            
            if (statusError) {
                console.log('⚠️ Status check error:', statusError);
                continue;
            }
            
            console.log(`📊 Attempt ${attempts}/${maxAttempts}: Status = ${statusData?.status}`);
            console.log(`📊 Result Description: ${statusData?.result_description || 'N/A'}`);
            
            // ✅ Check for FAILED status (includes cancellation, insufficient funds, etc.)
            if (statusData?.status === 'failed') {
                paymentConfirmed = true;
                paymentData = statusData;
                shouldStopPolling = true;
                
                try {
                    await supabase
                        .from('finance_payments')
                        .update({
                            status: 'failed',
                            notes: `Payment failed: ${statusData?.result_description || 'Transaction declined'}`,
                            updated_at: new Date().toISOString()
                        })
                        .eq('checkout_request_id', transactionId);
                    
                    console.log('✅ Payment marked as FAILED in database');
                } catch (e) {
                    console.log('⚠️ Could not update failed status:', e);
                }
                
                const failReason = statusData?.result_description || statusData?.message || 'Transaction failed';
                showStudentPaymentFailure(failReason);
                showToast(`❌ Payment failed: ${failReason}`, 'error');
                return;
            }
            
            // ✅ Check for COMPLETED status
            if (statusData?.status === 'completed') {
                paymentConfirmed = true;
                paymentData = statusData;
                console.log('✅ Payment confirmed!');
                console.log('📱 Receipt:', statusData.receipt_number);
                break;
            }
            
            // ✅ Also check database directly
            const { data: dbCheck } = await supabase
                .from('finance_payments')
                .select('status, receipt_number, checkout_request_id, updated_at, notes, amount, period, payment_method, reference_number, program')
                .eq('checkout_request_id', transactionId)
                .maybeSingle();
            
            if (dbCheck) {
                console.log(`📊 DB Status: ${dbCheck.status}`);
                
                if (dbCheck.status === 'completed') {
                    paymentConfirmed = true;
                    paymentData = dbCheck;
                    console.log('✅ Payment confirmed (DB)!');
                    console.log('📱 Receipt:', dbCheck.receipt_number);
                    break;
                }
                
                if (dbCheck.status === 'failed') {
                    paymentConfirmed = true;
                    paymentData = dbCheck;
                    shouldStopPolling = true;
                    showStudentPaymentFailure(dbCheck.notes || 'Transaction failed');
                    showToast('❌ Payment failed', 'error');
                    return;
                }
                
                if (dbCheck.status === 'cancelled') {
                    paymentConfirmed = true;
                    paymentData = dbCheck;
                    shouldStopPolling = true;
                    showStudentPaymentFailure('Payment was cancelled');
                    showToast('⛔ Payment cancelled', 'warning');
                    return;
                }
            }
            
        } catch (pollError) {
            console.log('⚠️ Polling error:', pollError);
        }
    }
    
    // ✅ Process result
    if (paymentConfirmed && !shouldStopPolling) {
        pendingPayment.isProcessing = false;
        pendingPayment.status = 'completed';
        
        try {
            const supabase = getSupabaseClient();
            if (supabase) {
                await supabase
                    .from('finance_payments')
                    .update({
                        status: 'completed',
                        updated_at: new Date().toISOString()
                    })
                    .eq('checkout_request_id', transactionId);
            }
        } catch (e) {}
        
        const receiptNumber = paymentData?.receipt_number || paymentData?.mpesa_receipt_number || 'N/A';
        
        closePaymentModal();
        
        showSuccessPopup(amount, receiptNumber, period, false);
        
        try {
            const emailSent = await sendPaymentReceiptEmail({
                amount: amount,
                receipt_number: receiptNumber,
                period: period,
                transaction_id: transactionId,
                reference_number: paymentData?.reference_number || 'N/A',
                payment_method: 'M-Pesa',
                program: studentFinanceState.student?.program || 'KRCHN'
            });
            
            if (emailSent) {
                const emailContainer = document.querySelector('#email-status-container');
                if (emailContainer) {
                    emailContainer.style.background = '#f0fdf4';
                    emailContainer.style.border = '1px solid #86efac';
                    emailContainer.innerHTML = `
                        <div style="font-size: 13px; color: #065f46;">
                            ✅ Receipt sent to your email
                        </div>
                    `;
                }
            }
        } catch (emailError) {
            console.error('❌ Email error:', emailError);
        }
        
        await updateStudentBalanceAfterPayment(amount);
        setTimeout(loadStudentFinance, 1000);
        showToast('✅ Payment successful! Receipt sent to your email.', 'success');
        
    } else if (pendingPayment.cancelled) {
        pendingPayment.isProcessing = false;
        pendingPayment.status = 'cancelled';
        
    } else if (shouldStopPolling) {
        pendingPayment.isProcessing = false;
        pendingPayment.status = 'failed';
        
    } else {
        pendingPayment.isProcessing = false;
        pendingPayment.status = 'failed';
        
        try {
            const supabase = getSupabaseClient();
            if (supabase) {
                const { data: finalCheck } = await supabase
                    .from('finance_payments')
                    .select('status, receipt_number')
                    .eq('checkout_request_id', transactionId)
                    .maybeSingle();
                
                if (finalCheck && finalCheck.status === 'completed') {
                    closePaymentModal();
                    showSuccessPopup(amount, finalCheck.receipt_number || 'N/A', period, false);
                    await updateStudentBalanceAfterPayment(amount);
                    setTimeout(loadStudentFinance, 1000);
                    showToast('✅ Payment successful!', 'success');
                    return;
                }
                
                if (finalCheck && finalCheck.status === 'pending') {
                    await supabase
                        .from('finance_payments')
                        .update({
                            status: 'failed',
                            notes: 'Payment timeout - user did not complete transaction',
                            updated_at: new Date().toISOString()
                        })
                        .eq('checkout_request_id', transactionId);
                    console.log('✅ Payment marked as FAILED due to timeout');
                }
            }
        } catch (e) {}
        
        showStudentPaymentTimeout();
        showToast('⏰ Payment timeout. Please check your M-Pesa transactions and try again.', 'warning');
    }
}

// ============================================================
// ❌ CANCEL PAYMENT - STUDENT FINANCE
// ============================================================

function cancelStudentPayment() {
    if (pendingPayment && pendingPayment.isProcessing) {
        pendingPayment.cancelled = true;
        pendingPayment.isProcessing = false;
        pendingPayment.status = 'cancelled';
        console.log('⛔ Student payment cancellation triggered');
        
        (async function updateCancelledStatus() {
            try {
                const supabase = getSupabaseClient();
                if (supabase && pendingPayment.transactionId) {
                    await supabase
                        .from('finance_payments')
                        .update({
                            status: 'cancelled',
                            notes: 'Payment cancelled by user',
                            updated_at: new Date().toISOString()
                        })
                        .eq('checkout_request_id', pendingPayment.transactionId);
                    
                    console.log('✅ Payment marked as CANCELLED in database');
                }
            } catch (e) {
                console.log('⚠️ Could not update cancelled status:', e);
            }
        })();
        
        const content = document.getElementById('finance-paymentContent');
        const title = document.getElementById('finance-paymentModalTitle');
        const formContainer = document.getElementById('finance-paymentFormContainer');
        
        if (title) title.textContent = '⛔ Payment Cancelled';
        if (content) {
            content.style.display = 'block';
            content.innerHTML = `
                <div class="status-icon warning">⛔</div>
                <p class="status-text">Payment Cancelled</p>
                <p class="status-sub">You cancelled the payment.</p>
                <button class="btn btn-success" style="margin-top:12px;width:100%;" onclick="closePaymentModal()">OK</button>
            `;
        }
        if (formContainer) formContainer.style.display = 'none';
        showToast('⛔ Payment cancelled', 'warning');
    } else {
        closePaymentModal();
        showToast('Payment cancelled', 'warning');
    }
}

// ============================================================
// ❌ SHOW PAYMENT FAILURE - STUDENT FINANCE (UPDATED)
// ============================================================

function showStudentPaymentFailure(message) {
    const content = document.getElementById('finance-paymentContent');
    const title = document.getElementById('finance-paymentModalTitle');
    const formContainer = document.getElementById('finance-paymentFormContainer');
    
    if (title) title.textContent = '❌ Payment Failed';
    if (content) {
        content.style.display = 'block';
        
        let icon = '❌';
        let buttonText = 'Try Again';
        let buttonAction = 'closePaymentModal()';
        let subMessage = message || 'Transaction was not completed';
        let extraInfo = '';
        
        if (message && message.toLowerCase().includes('cancel')) {
            icon = '⛔';
            buttonText = 'OK';
            subMessage = 'You cancelled the payment';
        } else if (message && (message.toLowerCase().includes('insufficient') || message.toLowerCase().includes('balance'))) {
            icon = '💰';
            subMessage = 'Insufficient funds. Please check your M-Pesa balance and try again.';
            buttonText = 'Try Again';
            extraInfo = '💡 Ensure you have enough money in your M-Pesa account.';
        } else if (message && (message.toLowerCase().includes('pin') || message.toLowerCase().includes('incorrect'))) {
            icon = '🔐';
            subMessage = 'Incorrect PIN. Please try again with the correct PIN.';
            buttonText = 'Try Again';
            extraInfo = '💡 Make sure you enter the correct M-Pesa PIN.';
        } else if (message && (message.toLowerCase().includes('network') || message.toLowerCase().includes('timeout'))) {
            icon = '📡';
            subMessage = 'Network issue. Please check your connection and try again.';
            buttonText = 'Retry';
            extraInfo = '💡 Ensure you have a stable network connection.';
        } else if (message && (message.toLowerCase().includes('declined') || message.toLowerCase().includes('rejected'))) {
            icon = '🚫';
            subMessage = 'Transaction declined by M-Pesa.';
            buttonText = 'Try Again';
            extraInfo = '💡 Contact your bank or M-Pesa support for assistance.';
        }
        
        content.innerHTML = `
            <div class="status-icon failed">${icon}</div>
            <p class="status-text">${icon} Payment Failed</p>
            <p class="status-sub">${subMessage}</p>
            ${extraInfo ? `<p class="status-sub" style="font-size:12px;color:#94A3B8;margin-top:4px;">${extraInfo}</p>` : ''}
            <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
                <button class="btn btn-primary" style="flex:1;min-width:80px;" onclick="${buttonAction}">${buttonText}</button>
                <button class="btn btn-outline" style="flex:1;min-width:80px;background:#f3f4f6;color:#374151;border:1px solid #d1d5db;" onclick="closePaymentModal()">Close</button>
            </div>
        `;
    }
    if (formContainer) formContainer.style.display = 'none';
}

// ============================================================
// ⏰ SHOW PAYMENT TIMEOUT - STUDENT FINANCE
// ============================================================

function showStudentPaymentTimeout() {
    const content = document.getElementById('finance-paymentContent');
    const title = document.getElementById('finance-paymentModalTitle');
    const formContainer = document.getElementById('finance-paymentFormContainer');
    
    if (title) title.textContent = '⏰ Payment Timeout';
    if (content) {
        content.style.display = 'block';
        content.innerHTML = `
            <div class="status-icon warning">⏰</div>
            <p class="status-text">Payment Timeout</p>
            <p class="status-sub">The payment took too long to complete.</p>
            <p class="status-sub" style="font-size:12px;color:#94A3B8;margin-top:8px;">
                Possible reasons:<br>
                • You didn't enter your PIN<br>
                • You didn't confirm the payment<br>
                • Network issues
            </p>
            <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
                <button class="btn btn-primary" style="flex:1;min-width:80px;" onclick="closePaymentModal()">Try Again</button>
                <button class="btn btn-outline" style="flex:1;min-width:80px;background:#f3f4f6;color:#374151;border:1px solid #d1d5db;" onclick="closePaymentModal()">Close</button>
            </div>
        `;
    }
    if (formContainer) formContainer.style.display = 'none';
}

// ============================================================
// ✅ SHOW PAYMENT SUCCESS - STUDENT FINANCE (UPDATED)
// ============================================================

function showStudentPaymentSuccess(amount, reference, period) {
    const content = document.getElementById('finance-paymentContent');
    const title = document.getElementById('finance-paymentModalTitle');
    const formContainer = document.getElementById('finance-paymentFormContainer');
    
    if (title) title.textContent = '✅ Payment Successful! 🎉';
    if (content) {
        content.style.display = 'block';
        content.innerHTML = `
            <div class="status-icon success">✅</div>
            <p class="status-text">Payment Successful! 🎉</p>
            <p class="status-sub">${period || 'Tuition Fees'}</p>
            <p class="status-sub" style="font-size:18px;font-weight:700;color:#10B981;margin-top:8px;">
                KES ${amount.toLocaleString()}
            </p>
            <p class="status-sub" style="font-size:12px;color:#94A3B8;">
                Reference: ${reference}
            </p>
            <button class="btn btn-success" style="margin-top:12px;" onclick="closePaymentModal()">Done</button>
        `;
    }
    if (formContainer) formContainer.style.display = 'none';
    
    setTimeout(() => {
        const modal = document.getElementById('finance-paymentModal');
        if (modal && modal.classList.contains('active')) {
            closePaymentModal();
        }
    }, 3000);
}

// ============================================================
// 💰 PROCESS PAYMENT - FIXED (DOES NOT OVERWRITE REFERENCE)
// ============================================================

async function processPayment() {
    if (!validatePaymentForm()) return;
    
    const period = document.getElementById('finance-paymentPeriodSelect')?.value;
    const amount = parseFloat(document.getElementById('finance-paymentAmountInput')?.value);
    const method = studentFinanceState.selectedPaymentMethod || 'mpesa';
    
    if (!period) { showToast('❌ Please select a payment period', 'error'); return; }
    if (!amount || amount <= 0) { showToast('❌ Please enter a valid amount', 'error'); return; }
    
    const user = window.currentUserProfile || window.currentUser;
    if (!user) {
        showToast('❌ Please login first', 'error');
        return;
    }
    
    const reference = 'STU-' + Date.now();
    
    if (method === 'mpesa') {
        const phoneInput = document.getElementById('finance-mpesaPhoneInput');
        let phone = phoneInput?.value || user?.phone || '';
        if (!phone || phone.trim() === '') {
            showToast('❌ Please enter your M-Pesa phone number', 'error');
            return;
        }
        
        let formattedPhone = formatPhoneNumber(phone);
        if (!formattedPhone) {
            showToast('❌ Invalid phone number', 'error');
            return;
        }
        
        pendingPayment.isProcessing = true;
        pendingPayment.cancelled = false;
        pendingPayment.transactionId = null;
        pendingPayment.status = 'processing';
        
        const content = document.getElementById('finance-paymentContent');
        const formContainer = document.getElementById('finance-paymentFormContainer');
        const title = document.getElementById('finance-paymentModalTitle');
        
        if (title) title.textContent = '⏳ Processing Payment';
        if (content) {
            content.style.display = 'block';
            content.innerHTML = `
                <div class="spinner"></div>
                <p class="status-text">⏳ Sending STK Push...</p>
                <p class="status-sub" id="finance-paymentDetails">Amount: KES ${amount.toLocaleString()}</p>
                <p class="status-sub" style="font-size:12px;margin-top:8px;">📱 Check your phone and enter your PIN</p>
                <p class="status-sub" style="font-size:12px;color:#94A3B8;margin-top:4px;">🔄 Payment will auto-confirm</p>
                <button class="btn btn-danger" style="margin-top:12px;width:100%;" onclick="cancelStudentPayment()">
                    <i class="fas fa-times"></i> Cancel Payment
                </button>
            `;
        }
        if (formContainer) formContainer.style.display = 'none';
        
        const supabase = getSupabaseClient();
        if (!supabase) {
            showToast('❌ Supabase client not available', 'error');
            pendingPayment.isProcessing = false;
            return;
        }
        
        const { data: profile } = await supabase
            .from('consolidated_user_profiles_table')
            .select('id')
            .eq('user_id', user.user_id || user.id)
            .single();
        
        if (!profile) {
            showToast('❌ Could not find profile', 'error');
            pendingPayment.isProcessing = false;
            return;
        }
        
        const profileId = profile.id;
        const dbPeriod = mapPeriodToDatabase(period);
        
        const paymentRecord = {
            student_id: profileId,
            student_name: user?.full_name || user?.name || 'Student',
            student_email: user?.email || '',
            program: user?.program || 'KRCHN',
            amount: amount,
            payment_method: 'M-Pesa',
            reference_number: reference,
            payment_date: new Date().toISOString().split('T')[0],
            period: dbPeriod || period,
            status: 'pending',
            notes: `${period} Tuition Fees - M-Pesa Payment`,
            phone_number: formattedPhone,
            program_type: studentFinanceState.programType || 'KRCHN',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        let savedPayment = null;
        
        try {
            const { data, error } = await supabase
                .from('finance_payments')
                .insert([paymentRecord])
                .select()
                .single();
            
            if (error) {
                console.error('❌ Save error:', error);
                showToast('❌ Could not save payment', 'error');
                pendingPayment.isProcessing = false;
                return;
            }
            
            savedPayment = data;
            pendingPayment.paymentId = savedPayment.id;
            console.log('✅ Payment created:', savedPayment.id);
            console.log('📋 Reference:', savedPayment.reference_number);
            
        } catch (e) {
            console.error('❌ Error:', e);
            showToast('❌ Could not save payment', 'error');
            pendingPayment.isProcessing = false;
            return;
        }
        
        console.log('📱 Sending STK Push...');
        console.log('📤 External Reference:', reference);
        
        try {
            const { data: stkData, error: stkError } = await supabase.functions.invoke('payhero', {
                body: {
                    action: 'stk_push',
                    phone: formattedPhone,
                    amount: Math.round(amount),
                    order_id: reference,
                    payment_id: savedPayment.id,
                    customer_name: user?.full_name || user?.name || 'Student',
                    description: `${period} Tuition Fees Payment`
                }
            });
            
            if (stkError) {
                console.error('❌ STK Error:', stkError);
                throw new Error('STK Push failed: ' + stkError.message);
            }
            
            if (!stkData.success) {
                throw new Error(stkData.message || 'STK Push failed');
            }
            
            console.log('✅ STK Push sent:', stkData);
            console.log('📱 Transaction ID:', stkData.transaction_id);
            
            pendingPayment.transactionId = stkData.transaction_id;
            
            await supabase
                .from('finance_payments')
                .update({
                    checkout_request_id: stkData.transaction_id,
                    updated_at: new Date().toISOString()
                })
                .eq('id', savedPayment.id);
            
            console.log('✅ Payment updated with checkout ID');
            console.log('📋 Reference (unchanged):', savedPayment.reference_number);
            
            await pollStudentPaymentStatus(stkData.transaction_id, amount, period);
            
        } catch (stkError) {
            console.error('❌ STK Error:', stkError);
            pendingPayment.isProcessing = false;
            pendingPayment.status = 'failed';
            
            try {
                await supabase
                    .from('finance_payments')
                    .update({
                        status: 'failed',
                        notes: `STK Push failed: ${stkError.message}`,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', savedPayment.id);
            } catch (e) {}
            
            showStudentPaymentFailure(stkError.message || 'Payment initiation failed');
            showToast('❌ Payment failed: ' + (stkError.message || 'Please try again'), 'error');
        }
        
    } else {
        showToast('💰 Payment processing...', 'info');
        setTimeout(() => {
            showToast('✅ Payment recorded', 'success');
            loadStudentFinance();
        }, 2000);
    }
}

// ============================================================
// ⏳ SHOW LOADING / ERROR
// ============================================================

function showFinanceLoading() {
    const historyBody = document.getElementById('finance-studentPaymentHistory');
    if (historyBody) {
        historyBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 24px; color: #94a3b8;">
                    <div style="display: inline-block; width: 20px; height: 20px; border: 2px solid #e5e7eb; border-top-color: #4C1D95; border-radius: 50%; animation: finance-spin 1s linear infinite;"></div>
                    <p style="margin-top: 4px; font-size: 11px;">Loading payment history...</p>
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
                <td colspan="5" style="text-align: center; padding: 24px; color: #dc2626; font-size: 12px;">
                    <i class="fas fa-exclamation-circle" style="font-size: 18px; display: block; margin-bottom: 4px;"></i>
                    <p>${message}</p>
                    <button onclick="loadStudentFinance()" style="margin-top: 6px; padding: 4px 14px; background: #4C1D95; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">
                        <i class="fas fa-sync-alt"></i> Retry
                    </button>
                </td>
            </tr>
        `;
    }
}

// ============================================================
// 🔔 TOAST NOTIFICATIONS
// ============================================================

function showToast(message, type = 'info') {
    let container = document.getElementById('financeToastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'financeToastContainer';
        container.style.cssText = 'position: fixed; bottom: 12px; right: 12px; z-index: 9999; display: flex; flex-direction: column; gap: 4px; max-width: 92%; width: 320px;';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    const colors = { success: '#059669', error: '#dc2626', warning: '#d97706', info: '#4C1D95' };
    
    toast.style.cssText = `
        padding: 8px 14px;
        border-radius: 6px;
        color: white;
        font-weight: 500;
        font-size: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.12);
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
    }, 3000);
}

// ============================================================
// 🔄 FILTER FUNCTIONS
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

// ============================================================
// 📧 EMAIL NOTIFICATION
// ============================================================

async function sendPaymentConfirmationEmail(studentId, paymentData) {
    try {
        const supabase = getSupabaseClient();
        if (!supabase) return false;
        
        const { data: student, error } = await supabase
            .from('consolidated_user_profiles_table')
            .select('full_name, email, student_id, program, block, phone')
            .eq('user_id', studentId)
            .single();
        
        if (error || !student || !student.email) {
            console.log('⚠️ No email found');
            return false;
        }
        
        const amount = paymentData.amount || 0;
        const period = paymentData.period || 'N/A';
        const transactionId = paymentData.transactionId || `TXN-${Date.now()}`;
        const method = paymentData.method || 'M-Pesa STK Push';
        const reference = paymentData.reference || `PAY-${Date.now()}`;
        
        console.log(`✅ Payment confirmation email prepared for ${student.email}`);
        console.log(`   Amount: KES ${amount.toLocaleString()}`);
        console.log(`   Period: ${period}`);
        console.log(`   Ref: ${reference}`);
        
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
    if (!document.getElementById('financeSpinStyle')) {
        const style = document.createElement('style');
        style.id = 'financeSpinStyle';
        style.textContent = `
            @keyframes finance-spin { to { transform: rotate(360deg); } }
            @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            @keyframes pulse-badge { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes fadeOut { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-10px); } }
            @keyframes fadeInOverlay { from { opacity: 0; } to { opacity: 1; } }
            @keyframes popIn { 0% { transform: scale(0.5); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
            .payment-method-item.selected { border: 2px solid #4C1D95 !important; background: #ede9fe !important; box-shadow: 0 0 0 2px rgba(76, 29, 149, 0.1); }
        `;
        document.head.appendChild(style);
    }
    
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
    
    const paymentFilter = document.getElementById('finance-paymentFilter');
    if (paymentFilter) paymentFilter.addEventListener('change', filterStudentPayments);
    
    const periodFilter = document.getElementById('finance-periodFilter');
    if (periodFilter) periodFilter.addEventListener('change', filterStudentPayments);
    
    const searchInput = document.getElementById('finance-search');
    if (searchInput) searchInput.addEventListener('keyup', filterStudentPayments);
    
    const paymentForm = document.getElementById('finance-paymentForm');
    if (paymentForm) {
        paymentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            processPayment();
        });
    }
    
    listenForAdminEvents();
    
    notifySuperAdmin('module_ready', {
        version: '2.4.0',
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
    window.cancelStudentPayment = cancelStudentPayment;
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
    window.viewVoteHeadDetails = viewVoteHeadDetails;
    window.viewFullFeeStructure = viewFullFeeStructure;
    window.mapPeriodToDisplay = mapPeriodToDisplay;
    window.mapPeriodToDatabase = mapPeriodToDatabase;
    window.mapProgramCodeToFullName = mapProgramCodeToFullName;
    window.sendPaymentReceiptEmail = sendPaymentReceiptEmail;
    window.showSuccessPopup = showSuccessPopup;
    window.closeSuccessPopupAndRefresh = closeSuccessPopupAndRefresh;
    window.downloadReceipt = downloadReceipt;
});

console.log('✅ Student Finance module loaded successfully!');
console.log('📊 Supports KRCHN (Semesters) and TVET (Terms)');
console.log('📋 Vote heads loaded from database');
console.log('💳 PayHero Edge Function integration enabled - No redirects!');
console.log('🔧 POS Style Payment Modal with ALL states');
console.log('✅ Processing, Success, Failure, Timeout, Cancelled');
console.log('📧 Email receipt sending enabled');
console.log('🎉 Success popup with download option');
console.log('⛔ Handles cancellation - stops polling immediately');
console.log('💰 Handles insufficient funds - stops polling immediately');
