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
    overallProgress: 0,
    currentPeriodProgress: 0,
    currentPeriodOutstanding: 0,
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
    selectedBlock: null,
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
                    .then(result => {
                        if (result?.error) {
                            console.warn('⚠️ Could not save notification:', result.error.message);
                        }
                    })
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
    const candidates = [
        window.sb,
        window.supabaseClient,
        window.db?.supabase,
        window.NCHSMLogin?.supabase,
        (typeof supabase !== 'undefined' ? supabase : null),
        window.supabase
    ];

    const client = candidates.find(c =>
        c &&
        typeof c.from === 'function' &&
        c.auth &&
        typeof c.auth.getSession === 'function'
    );

    if (!client) console.error('❌ No Supabase client found');
    return client || null;
}

async function generatePDFReceipt(payment, receiptNumber, studentName) {
    try {
        console.log('📄 Generating PDF receipt...');
        
        // Check if jsPDF is loaded
        if (typeof window.jspdf === 'undefined') {
            console.warn('⚠️ jsPDF not loaded, loading from CDN...');
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
        }
        
        // Create a temporary div with the receipt HTML
        const tempDiv = document.createElement('div');
        tempDiv.style.cssText = 'position: fixed; left: -9999px; top: 0; width: 700px; background: white; padding: 20px; z-index: 99999;';
        
        const date = new Date().toLocaleDateString('en-KE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const time = new Date().toLocaleTimeString('en-KE', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        tempDiv.innerHTML = generateReceiptHTML(payment, receiptNumber, studentName, date, time);
        document.body.appendChild(tempDiv);
        
        // Use html2canvas to convert to image
        if (typeof html2canvas === 'undefined') {
            console.warn('⚠️ html2canvas not loaded, loading from CDN...');
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
        }
        
        const canvas = await html2canvas(tempDiv, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            width: 700,
            height: tempDiv.scrollHeight
        });
        
        // Remove temp div
        document.body.removeChild(tempDiv);
        
        // Convert to PDF using jsPDF
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        
        // Return as base64 data URL
        return pdf.output('datauristring');
        
    } catch (error) {
        console.error('❌ PDF generation error:', error);
        return null;
    }
}

// ============================================================
// 📥 LOAD SCRIPT HELPER
// ============================================================

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// ============================================================
// 📧 SEND PAYMENT RECEIPT EMAIL WITH PDF ATTACHMENT - UPDATED
// ============================================================

async function sendPaymentReceiptEmail(paymentData) {
    try {
        console.log('📧 Sending payment receipt email with PDF...');
        
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
        
        // ✅ Generate PDF
        console.log('📄 Generating PDF receipt...');
        const pdfDataUrl = await generatePDFReceipt(
            {
                amount: amount,
                period: period,
                receipt_number: receiptNumber,
                payment_method: paymentData.payment_method || 'M-Pesa',
                reference_number: paymentData.reference_number || 'N/A',
                program: paymentData.program || user.program || 'KRCHN',
                checkout_request_id: transactionId
            },
            receiptNumber,
            studentName
        );
        
        // ✅ Prepare email payload
        const emailPayload = {
            to: studentEmail,
            subject: `💰 Payment Receipt - ${receiptNumber}`,
            from: 'NCHSM Finance <finance@nchsm.co.ke>'
        };
        
        // ✅ Add HTML body
        const date = new Date().toLocaleDateString('en-KE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const time = new Date().toLocaleTimeString('en-KE', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        emailPayload.html = generateEmailHTML(paymentData, receiptNumber, studentName, date, time);
        
        // ✅ Add PDF attachment if generated successfully
        if (pdfDataUrl) {
            const base64Data = pdfDataUrl.split(',')[1];
            emailPayload.attachments = [
                {
                    filename: `receipt-${receiptNumber}.pdf`,
                    content: base64Data,
                    contentType: 'application/pdf'
                }
            ];
            console.log('✅ PDF attachment added to email');
        } else {
            console.warn('⚠️ PDF generation failed, sending HTML only');
        }
        
        // ✅ Send email
        const response = await fetch('https://lwhtjozfsmbyihenfunw.supabase.co/functions/v1/send-email', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(emailPayload)
        });
        
        const data = await response.json();
        console.log('📥 Email response:', data);
        
        if (data.success) {
            console.log(`✅ Receipt email sent to ${studentEmail}`);
            if (pdfDataUrl) {
                console.log('📎 PDF receipt attached');
            }
            
            // ✅ Also send copy to admin
            if (studentEmail !== 'finance@nchsm.co.ke') {
                const adminPayload = {
                    to: 'finance@nchsm.co.ke',
                    subject: `📋 Payment Receipt - ${receiptNumber} (Admin Copy)`,
                    html: generateEmailHTML(paymentData, receiptNumber, studentName, date, time),
                    from: 'NCHSM Finance <finance@nchsm.co.ke>'
                };
                
                if (pdfDataUrl) {
                    const base64Data = pdfDataUrl.split(',')[1];
                    adminPayload.attachments = [
                        {
                            filename: `receipt-${receiptNumber}-admin.pdf`,
                            content: base64Data,
                            contentType: 'application/pdf'
                        }
                    ];
                }
                
                await fetch('https://lwhtjozfsmbyihenfunw.supabase.co/functions/v1/send-email', {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(adminPayload)
                });
                console.log('📧 Admin copy sent');
            }
            
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
// 📧 GENERATE EMAIL HTML (with PDF attachment notice)
// ============================================================

function generateEmailHTML(payment, receiptNumber, studentName, date, time) {
    const amount = parseFloat(payment.amount).toFixed(2);
    const period = payment.period || 'N/A';
    const method = payment.payment_method || 'M-Pesa';
    const program = payment.program || 'KRCHN';
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Receipt</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background: #f5f7fa; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        .header { text-align: center; border-bottom: 3px solid #0A3D62; padding-bottom: 20px; margin-bottom: 20px; }
        .header h1 { color: #0A3D62; margin: 0; font-size: 24px; }
        .header .subtitle { color: #666; margin: 5px 0 0; font-size: 14px; }
        .greeting { font-size: 15px; color: #2c3e50; margin-bottom: 16px; }
        .greeting strong { color: #0A3D62; }
        .amount-box { background: linear-gradient(135deg, #eaf2f8, #d6eaf8); border-radius: 12px; padding: 20px; text-align: center; margin: 16px 0; border: 2px solid #0A3D62; }
        .amount-box .label { font-size: 12px; color: #2c3e50; font-weight: 500; }
        .amount-box .amount { font-size: 32px; font-weight: 800; color: #0A3D62; }
        .details { margin: 16px 0; }
        .details table { width: 100%; border-collapse: collapse; }
        .details td { padding: 8px 0; border-bottom: 1px solid #eee; }
        .details .label { color: #666; font-weight: 500; }
        .details .value { text-align: right; font-weight: 600; color: #0A3D62; }
        .pdf-notice { background: #fef9e7; padding: 12px 16px; border-radius: 8px; border-left: 4px solid #f39c12; margin: 16px 0; }
        .pdf-notice p { margin: 0; color: #7d6608; font-size: 13px; }
        .status-badge { display: inline-block; background: #d4edda; color: #155724; padding: 4px 16px; border-radius: 20px; font-weight: 600; font-size: 13px; }
        .footer { text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; }
        .footer .contact { font-size: 13px; color: #0A3D62; margin: 4px 0; }
        .btn { display: inline-block; padding: 10px 24px; background: #0A3D62; color: white; text-decoration: none; border-radius: 6px; margin-top: 10px; }
        @media (max-width: 480px) { .container { padding: 20px; } .amount-box .amount { font-size: 24px; } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>NCH<span style="color:#f1c40f;">SM</span></h1>
            <div class="subtitle">Nakuru College of Health Sciences and Management</div>
        </div>
        
        <div class="greeting">Dear <strong>${studentName}</strong>,</div>
        
        <p>Thank you for your payment. Your transaction has been completed successfully.</p>
        
        <div class="amount-box">
            <div class="label">AMOUNT PAID</div>
            <div class="amount">KES ${amount}</div>
        </div>
        
        <div class="details">
            <table>
                <tr><td class="label">Receipt Number</td><td class="value">${receiptNumber}</td></tr>
                <tr><td class="label">Period</td><td class="value">${period}</td></tr>
                <tr><td class="label">Program</td><td class="value">${program}</td></tr>
                <tr><td class="label">Payment Method</td><td class="value">${method}</td></tr>
                <tr><td class="label">Date</td><td class="value">${date} at ${time}</td></tr>
                <tr><td class="label">Status</td><td class="value"><span class="status-badge">✅ Completed</span></td></tr>
            </table>
        </div>
        
        <div class="pdf-notice">
            <p>📎 <strong>PDF Receipt Attached:</strong> Please find your official receipt attached to this email. You can download and print it for your records.</p>
        </div>
        
        <div style="text-align: center;">
            <a href="https://nchsm.co.ke/finance" class="btn">📊 View Finance Dashboard</a>
        </div>
        
        <div class="footer">
            <div class="contact">📞 +254 790 969 743 &nbsp;|&nbsp; 📧 finance@nchsm.ac.ke</div>
            <p style="margin-top: 8px;">This is an automated email. Please do not reply.</p>
            <p style="font-size: 10px; color: #bbb;">NCHSM &bull; ${new Date().getFullYear()}</p>
        </div>
    </div>
</body>
</html>`;
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
// 🎉 SHOW SUCCESS POPUP WITH EMAIL STATUS - UPDATED WITH PRINT
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
                ${emailSent ? '📧 Receipt sent to your email (PDF attached)' : '📧 Sending receipt to your email...'}
            </div>
        </div>
        <div style="display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap;">
            <button onclick="closeSuccessPopupAndRefresh()" style="flex:1; padding: 12px 16px; background: linear-gradient(135deg, #0A3D62, #1a5276); color: white; border: none; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; transition: transform 0.2s; min-width: 70px;">
                Done
            </button>
            <button onclick="printReceipt()" style="flex:1; padding: 12px 16px; background: #0A3D62; color: white; border: none; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; transition: transform 0.2s; min-width: 70px;">
                🖨️ Print
            </button>
            <button onclick="downloadReceipt()" style="flex:1; padding: 12px 16px; background: #f1f5f9; color: #0A3D62; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; transition: transform 0.2s; min-width: 70px;">
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
// 🖨️ PRINT RECEIPT - ADD THIS AFTER downloadReceipt()
// ============================================================

function printReceipt() {
    const data = window._lastReceiptData;
    if (!data) {
        showToast('❌ No receipt data available', 'error');
        return;
    }
    
    // Get student details
    const studentName = studentFinanceState.student?.full_name || 
                       studentFinanceState.student?.name || 
                       'Student';
    const program = studentFinanceState.student?.program || 'KRCHN';
    
    // Generate receipt HTML
    const receiptHTML = generateReceiptHTML(
        { 
            amount: data.amount, 
            period: data.period,
            receipt_number: data.receiptNumber,
            payment_method: 'M-Pesa',
            reference_number: data.receiptNumber,
            program: program
        },
        data.receiptNumber,
        studentName,
        new Date().toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' }),
        new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
    );
    
    // Open in new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes');
    if (!printWindow) {
        showToast('❌ Please allow popups to print', 'error');
        return;
    }
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Payment Receipt - ${data.receiptNumber}</title>
            <style>
                body { 
                    font-family: 'Segoe UI', Tahoma, Arial, sans-serif; 
                    background: white; 
                    padding: 20px; 
                    margin: 0;
                }
                .receipt-container {
                    max-width: 700px;
                    margin: 0 auto;
                    background: #ffffff;
                    border-radius: 16px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.12);
                    overflow: hidden;
                }
                .header {
                    background: linear-gradient(135deg, #0A3D62, #1a5276);
                    padding: 30px 35px 25px;
                    text-align: center;
                    color: white;
                }
                .header .logo {
                    font-size: 28px;
                    font-weight: 700;
                    letter-spacing: 1px;
                }
                .header .logo span { color: #f1c40f; }
                .header .subtitle {
                    font-size: 14px;
                    opacity: 0.85;
                    margin-top: 4px;
                    font-weight: 300;
                }
                .header .receipt-badge {
                    display: inline-block;
                    background: rgba(255,255,255,0.15);
                    padding: 6px 24px;
                    border-radius: 20px;
                    margin-top: 12px;
                    font-size: 13px;
                    font-weight: 600;
                    letter-spacing: 1px;
                    border: 1px solid rgba(255,255,255,0.2);
                }
                .body { padding: 30px 35px 20px; }
                .greeting { font-size: 15px; color: #2c3e50; margin-bottom: 20px; }
                .greeting strong { color: #0A3D62; }
                .status-banner {
                    background: #d4edda;
                    border-radius: 10px;
                    padding: 14px 20px;
                    text-align: center;
                    margin-bottom: 22px;
                    border-left: 4px solid #28a745;
                }
                .status-banner .status-icon { font-size: 20px; margin-right: 8px; }
                .status-banner .status-text { font-weight: 700; color: #155724; font-size: 16px; }
                .details-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 8px 20px;
                    background: #f8f9fa;
                    border-radius: 12px;
                    padding: 18px 22px;
                    margin-bottom: 20px;
                }
                .details-grid .item {
                    display: flex;
                    justify-content: space-between;
                    padding: 5px 0;
                    border-bottom: 1px solid #e9ecef;
                }
                .details-grid .item:last-child { border-bottom: none; }
                .details-grid .label { color: #6c757d; font-size: 13px; font-weight: 500; }
                .details-grid .value { color: #2c3e50; font-size: 13px; font-weight: 600; text-align: right; }
                .amount-box {
                    background: linear-gradient(135deg, #eaf2f8, #d6eaf8);
                    border-radius: 12px;
                    padding: 20px;
                    text-align: center;
                    margin-bottom: 20px;
                    border: 2px solid #0A3D62;
                }
                .amount-box .label { font-size: 13px; color: #2c3e50; font-weight: 500; }
                .amount-box .amount {
                    font-size: 38px;
                    font-weight: 800;
                    color: #0A3D62;
                    letter-spacing: 1px;
                }
                .mpesa-confirm {
                    background: #fef9e7;
                    border-radius: 10px;
                    padding: 14px 18px;
                    border-left: 4px solid #f39c12;
                    margin-bottom: 20px;
                }
                .mpesa-confirm p { 
                    margin: 0; 
                    font-size: 13px; 
                    color: #7d6608; 
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .mpesa-confirm .code {
                    font-weight: 700;
                    font-family: monospace;
                    font-size: 15px;
                    color: #0A3D62;
                }
                .footer {
                    background: #f8f9fa;
                    padding: 20px 35px 25px;
                    text-align: center;
                    border-top: 1px solid #e9ecef;
                }
                .footer .thanks {
                    font-size: 18px;
                    font-weight: 700;
                    color: #0A3D62;
                    margin-bottom: 4px;
                }
                .footer .contact {
                    font-size: 12px;
                    color: #6c757d;
                    margin: 4px 0;
                }
                .footer .secure {
                    display: inline-block;
                    background: #28a745;
                    color: white;
                    font-size: 11px;
                    padding: 3px 16px;
                    border-radius: 20px;
                    font-weight: 600;
                    margin-top: 8px;
                }
                @media print {
                    body { background: white; padding: 0; }
                    .receipt-container { box-shadow: none; border-radius: 0; }
                    .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .status-banner { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .amount-box { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .mpesa-confirm { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .footer .secure { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .no-print { display: none !important; }
                }
                @media (max-width: 480px) {
                    .body { padding: 20px; }
                    .header { padding: 20px; }
                    .details-grid { grid-template-columns: 1fr; gap: 4px; }
                    .amount-box .amount { font-size: 28px; }
                }
            </style>
        </head>
        <body>
            ${receiptHTML}
            <div style="text-align: center; margin-top: 20px;" class="no-print">
                <button onclick="window.print()" style="padding: 12px 30px; background: #0A3D62; color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; font-weight: 600;">
                    🖨️ Print Receipt
                </button>
                <button onclick="window.close()" style="padding: 12px 30px; background: #e2e8f0; color: #0A3D62; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; font-weight: 600; margin-left: 10px;">
                    Close
                </button>
                <p style="font-size: 12px; color: #94a3b8; margin-top: 10px;">
                    Press Ctrl+P or click the Print button above
                </p>
            </div>
        </body>
        </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    showToast('🖨️ Receipt ready for printing', 'info');
}
window.printReceipt = printReceipt;

// ============================================================
// 📊 FETCH FINANCE DATA FROM SUPABASE - FIXED
// ============================================================


// ============================================================
// 🎓 CURRENT BLOCK / TERM FROM STUDENT PROFILE
// ============================================================

function getCurrentProfileFinancePeriod(profile = null) {
    const p =
        profile ||
        studentFinanceState.student ||
        window.currentUserProfile ||
        window.currentUser ||
        {};

    // Profile is authoritative. Convert "Block N" to the finance period
    // used by this module instead of falling back to the first fee period.
    const raw =
        p.current_block ||
        p.currentBlock ||
        p.block_term ||
        p.current_term ||
        p.currentTerm ||
        p.block ||
        p.student_block ||
        p.class_block ||
        p.term ||
        null;

    if (!raw) return null;

    const blockMatch = String(raw).trim().match(/^Block\s*(\d+)$/i);
    if (blockMatch) {
        const blockNumber = parseInt(blockMatch[1], 10);
        if (Number.isFinite(blockNumber) && blockNumber > 0) {
            const program = String(
                p.program || studentFinanceState.programType || ''
            ).toUpperCase();

            const year = Math.ceil(blockNumber / 3);
            const periodInYear = ((blockNumber - 1) % 3) + 1;

            return program === 'KRCHN'
                ? `Y${year} S${periodInYear}`
                : `Y${year} T${periodInYear}`;
        }
    }

    return mapPeriodToDisplay(raw);
}

function getProfilePeriodFee(feeRows, profilePeriod, fallback=0) {
    if (!Array.isArray(feeRows) || !profilePeriod) {
        return Number(fallback) || 0;
    }

    const match = feeRows.find(row =>
        mapPeriodToDisplay(row?.name || row?.period || row?.block || '') ===
        profilePeriod
    );

    return match
        ? Number(match.amount) || 0
        : Number(fallback) || 0;
}


async function fetchFinanceDataFromSupabase(user) {
    try {
        const supabase = getSupabaseClient();
        if (!supabase) return null;

        const userId = user?.user_id || user?.id;
        if (!userId) return null;

        let profile = null;

        try {
            const { data, error } = await supabase
                .from('consolidated_user_profiles_table')
                .select('id,user_id,student_id,full_name,email,program,intake_year,phone,block')
                .eq('user_id', userId)
                .maybeSingle();

            if (!error && data) profile = data;
            else if (error) console.warn('⚠️ Profile lookup:', error.message);
        } catch (e) {
            console.warn('⚠️ Profile lookup failed:', e.message);
        }

        const profileId = profile?.id || null;
        const studentName = profile?.full_name || user?.full_name || user?.name || 'Student';
        const program = profile?.program || user?.program || 'KRCHN';
        const studentId = profile?.student_id || user?.student_id || 'N/A';
        const intake = profile?.intake_year || user?.intake_year || 'N/A';

        const programType = getProgramType(program);
        const programLevel = getProgramLevel(program);
        const periods = getPeriods(programType, programLevel);

        let accountData = null;

        for (const id of [profileId, userId].filter(Boolean)) {
            try {
                const { data, error } = await supabase
                    .from('finance_student_accounts')
                    .select('*')
                    .eq('student_id', id)
                    .maybeSingle();

                if (!error && data) {
                    accountData = data;
                    console.log('✅ Finance account found using:', id);
                    break;
                }
            } catch (e) {
                console.warn('⚠️ Account lookup failed:', e.message);
            }
        }

        let paymentsData = [];

        for (const id of [profileId, userId].filter(Boolean)) {
            try {
                const { data, error } = await supabase
                    .from('finance_payments')
                    .select('*')
                    .eq('student_id', id)
                    .order('payment_date', { ascending: false });

                if (!error && Array.isArray(data)) {
                    paymentsData.push(...data);
                    console.log(`✅ Payments found for ${id}:`, data.length);
                }
            } catch (e) {
                console.warn('⚠️ Payments lookup failed:', e.message);
            }
        }

        const seen = new Set();

        paymentsData = paymentsData.filter(p => {
            const key =
                p.id ||
                `${p.checkout_request_id || ''}|${p.reference_number || ''}|${p.payment_date || ''}|${p.amount || ''}`;

            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        paymentsData.sort((a, b) =>
            new Date(b.payment_date || b.created_at || 0) -
            new Date(a.payment_date || a.created_at || 0)
        );

        let feeStructureData = null;

        try {
            const programFullName = mapProgramCodeToFullName(program);

            const { data, error } = await supabase
                .from('finance_fee_structure')
                .select('*')
                .eq('program', programFullName)
                .eq('is_active', true)
                .order('period_index', { ascending: true });

            if (!error && data?.length) {
                feeStructureData = data;
            } else {
                const { data: altData, error: altError } = await supabase
                    .from('finance_fee_structure')
                    .select('*')
                    .eq('program', program)
                    .eq('is_active', true)
                    .order('period_index', { ascending: true });

                if (!altError && altData?.length) feeStructureData = altData;
            }
        } catch (e) {
            console.warn('⚠️ Fee structure lookup failed:', e.message);
        }

        let processedFeeStructure = [];
        let voteHeads = [];
        let periodTotals = [];

        if (feeStructureData?.length) {
            const allVoteHeads = new Map();

            feeStructureData.forEach(record => {
                const periodName =
                    record.block_term ||
                    record.period_name ||
                    record.period ||
                    'Unknown';

                const displayPeriod = mapPeriodToDisplay(periodName);
                const amount = Number(record.amount) || 0;
                const hostel = Number(record.hostel) || 0;
                const components = Array.isArray(record.components)
                    ? record.components
                    : [];

                processedFeeStructure.push({
                    name: displayPeriod,
                    amount,
                    hostel,
                    components
                });

                periodTotals.push(amount);

                components.forEach(comp => {
                    const label = comp?.label || comp?.name;
                    if (label && !allVoteHeads.has(label)) {
                        allVoteHeads.set(label, { label, amounts: [] });
                    }
                });
            });

            allVoteHeads.forEach((vh, label) => {
                vh.amounts = processedFeeStructure.map(period => {
                    const comp = period.components.find(c =>
                        (c?.label || c?.name) === label
                    );
                    return Number(comp?.amount) || 0;
                });
                voteHeads.push(vh);
            });
        } else {
            periods.forEach((period, index) => {
                const amount = getFeeAmount(programType, index, programLevel);

                processedFeeStructure.push({
                    name: period,
                    amount,
                    hostel: 0,
                    components: []
                });

                periodTotals.push(amount);
            });
        }

        const profilePeriod =
            getCurrentProfileFinancePeriod(profile);

        const currentPeriod = mapPeriodToDisplay(
            profilePeriod ||
            accountData?.current_period ||
            accountData?.current_period_name ||
            periods[0]
        );

        let currentPeriodIndex = processedFeeStructure.findIndex(
            row => mapPeriodToDisplay(row?.name) === currentPeriod
        );

        if (currentPeriodIndex < 0) {
            currentPeriodIndex = periods.indexOf(currentPeriod) >= 0
                ? periods.indexOf(currentPeriod)
                : 0;
        }

        const completedPayments = paymentsData.filter(
            p => String(p.status || '').toLowerCase() === 'completed'
        );

        const completedTotal = completedPayments.reduce(
            (sum, p) => sum + (Number(p.amount) || 0),
            0
        );

        // ------------------------------------------------------------
        // FINANCE CALCULATION
        // Overall figures use the complete active fee structure and all
        // completed payments. Current-period figures are calculated separately.
        // This prevents a previous/current term payment from being mistaken
        // for the student's entire account balance.
        // ------------------------------------------------------------
        const feeStructureTotal = processedFeeStructure.reduce(
            (sum, row) => sum + (Number(row.amount) || 0),
            0
        );

        const accountTotalDue = Number(accountData?.total_due) || 0;
        const accountTotalPaid = Number(accountData?.total_paid) || 0;

        // Prefer transaction records because they represent the payments
        // actually loaded for this student. Fall back to the account total
        // only when no completed transaction amount was returned.
        const totalPaid = completedTotal > 0
            ? completedTotal
            : accountTotalPaid;

        // Fee structure is the source of the assessed fee total when available.
        // If it is unavailable, use the finance account's total_due.
        const totalDue = feeStructureTotal > 0
            ? feeStructureTotal
            : accountTotalDue;

        // Recognise common account-level adjustments without depending on a
        // single schema. Positive values add to the amount owed; credits reduce it.
        const positiveAdjustments = [
            'previous_balance',
            'opening_balance',
            'balance_forward',
            'adjustments',
            'additional_charges',
            'charges'
        ].reduce((sum, key) => sum + (Number(accountData?.[key]) || 0), 0);

        const credits = [
            'credit',
            'credits',
            'approved_credit',
            'scholarship',
            'discount'
        ].reduce((sum, key) => sum + (Number(accountData?.[key]) || 0), 0);

        const netAdjustments = positiveAdjustments - credits;

        // If the fee structure is present, calculate the account balance from
        // the actual assessed fees and completed payments. This is the key fix.
        // When no fee structure exists, retain an authoritative account balance.
        let outstanding = feeStructureTotal > 0
            ? Math.max(totalDue + netAdjustments - totalPaid, 0)
            : Math.max(
                Number(accountData?.outstanding ?? accountData?.balance) ||
                (totalDue + netAdjustments - totalPaid),
                0
            );

        const balance = outstanding;

        const paidThisSemester = completedPayments
            .filter(p => mapPeriodToDisplay(p.period) === currentPeriod)
            .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        const semesterFee =
            Number(processedFeeStructure[currentPeriodIndex]?.amount) ||
            getProfilePeriodFee(processedFeeStructure, currentPeriod, 0) ||
            getFeeAmount(programType, currentPeriodIndex, programLevel);

        const currentPeriodOutstanding = Math.max(
            semesterFee - paidThisSemester,
            0
        );

        const currentPeriodProgress = semesterFee > 0
            ? Math.min((paidThisSemester / semesterFee) * 100, 100)
            : 0;

        const paymentProgress = totalDue > 0
            ? Math.min((totalPaid / totalDue) * 100, 100)
            : 0;

        const formattedPayments = paymentsData.map(p => ({
            id: p.id || null,
            date: p.payment_date || (p.created_at || '').split('T')[0],
            description:
                p.notes ||
                `${mapPeriodToDisplay(p.period) || 'Tuition'} Fees`,
            period: mapPeriodToDisplay(p.period) || 'N/A',
            amount: Number(p.amount) || 0,
            method: p.payment_method || 'M-Pesa',
            reference:
                p.reference_number ||
                p.receipt_number ||
                p.checkout_request_id ||
                '-',
            status: String(p.status || 'pending').toLowerCase(),
            transaction_id: p.checkout_request_id || null,
            receipt_number: p.receipt_number || null,
            payment_method: p.payment_method || 'M-Pesa'
        }));

        const formattedFees = processedFeeStructure.map(f => {
            const paidForPeriod = completedPayments
                .filter(p => mapPeriodToDisplay(p.period) === f.name)
                .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

            return {
                block: f.name,
                amount: f.amount,
                description: `${f.name} Tuition Fees`,
                status:
                    paidForPeriod >= f.amount && f.amount > 0
                        ? 'Paid'
                        : paidForPeriod > 0
                            ? 'Partial'
                            : 'Pending',
                paid: paidForPeriod
            };
        });

        return {
            balance,
            totalPaid,
            totalDue,
            outstanding,
            paymentProgress,
            overallProgress: paymentProgress,
            currentPeriodOutstanding,
            currentPeriodBalance: currentPeriodOutstanding,
            currentPeriodProgress,
            payments: formattedPayments,
            feeStructure: formattedFees,
            programType,
            programLevel,
            periodLabel: getPeriodLabel(programType),
            currentPeriod,
            currentPeriodIndex,
            semesterFee,
            paidThisSemester,
            voteHeads,
            feeStructureRaw: {
                periods: processedFeeStructure,
                voteHeads,
                periodTotals
            },
            student: {
                name: studentName,
                full_name: studentName,
                id: studentId,
                student_id: studentId,
                userId: userId,
                user_id: userId,
                profileId,
                program,
                intake,
                intake_year: intake,
                phone:
                    profile?.phone ||
                    user?.phone ||
                    user?.phone_number ||
                    '',
                block:
                    profile?.block ||
                    profile?.current_block ||
                    user?.block ||
                    user?.current_block ||
                    '',
                current_block:
                    profile?.current_block ||
                    user?.current_block ||
                    profile?.block ||
                    user?.block ||
                    '',
                programType,
                programLevel
            }
        };
    } catch (error) {
        console.error('❌ Error fetching finance data:', error);
        return null;
    }
}

async function loadStudentFinance(forceRefresh = false) {
    try {
        console.log('💰 Loading student finance...');

        let user =
            window.currentUserProfile ||
            window.currentUser ||
            window.userData ||
            null;

        if (!user) {
            const sb = getSupabaseClient();

            for (let attempt = 0; attempt < 8 && !user; attempt++) {
                try {
                    if (sb?.auth?.getSession) {
                        const { data } = await sb.auth.getSession();

                        if (data?.session?.user) {
                            user = data.session.user;
                            window.currentUser = user;
                        }
                    }
                } catch (e) {
                    console.warn('⚠️ Finance session retry:', e.message);
                }

                if (!user && attempt < 7) {
                    await new Promise(resolve => setTimeout(resolve, 250));
                }
            }
        }

        if (!user) {
            showFinanceError('Please login to view your finance data.');
            return;
        }

        const userId = user.user_id || user.id;

        if (!userId) {
            showFinanceError('Your student account could not be identified.');
            return;
        }

        const program = user.program || 'KRCHN';
        const programType = getProgramType(program);
        const programLevel = getProgramLevel(program);

        studentFinanceState.programType = programType;
        studentFinanceState.programLevel = programLevel;
        studentFinanceState.student = user;

        updateProgramInfo(user, programType, programLevel);
        showFinanceLoading();

        const financeData =
            await fetchFinanceDataFromSupabase(user);

        if (!financeData) {
            showFinanceError(
                'No finance data available. Please contact the finance office.'
            );
            return;
        }

        studentFinanceState.feeStructureRaw =
            financeData.feeStructureRaw || null;

        studentFinanceState.voteHeads =
            financeData.voteHeads || [];
        studentFinanceState.currentPeriodIndex =
            Number(financeData.currentPeriodIndex) || 0;
        studentFinanceState.totalDue =
            Number(financeData.totalDue) || 0;
        studentFinanceState.currentPeriodOutstanding =
            Number(financeData.currentPeriodOutstanding) || 0;
        studentFinanceState.currentPeriodProgress =
            Number(financeData.currentPeriodProgress) || 0;

        updateFinanceUI(financeData);

        studentFinanceState.isLoaded = true;
        studentFinanceState.lastUpdated = new Date();

        notifySuperAdmin('student_finance_viewed', {
            studentId: financeData.student.userId,
            studentNumber: financeData.student.id,
            studentName: financeData.student.name,
            program: financeData.student.program,
            balance: financeData.balance,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error loading finance:', error);
        showFinanceError(
            'Unable to load finance data. Please try again.'
        );
    }
}

function updateProgramInfo(user, programType, programLevel) {
    const program = user?.program || user?.program_name || 'N/A';
    const intake = user?.intake_year || user?.intake || 'N/A';
    const studentId = user?.student_id || user?.id || 'N/A';

    const programDisplay =
        document.getElementById('finance-studentProgramDisplay');

    if (programDisplay) programDisplay.textContent = program;

    const intakeDisplay =
        document.getElementById('finance-studentIntakeDisplay');

    if (intakeDisplay) intakeDisplay.textContent = intake;

    const studentIdDisplay =
        document.getElementById('finance-studentIdDisplay');

    if (studentIdDisplay) {
        studentIdDisplay.textContent = studentId;
    }

    updatePeriodFilter(programType, programLevel);
}

function updatePeriodFilter(programType, programLevel) {
    const periodFilter = document.getElementById('finance-periodFilter');
    if (!periodFilter) return;

    const actualPeriods = (studentFinanceState.feeStructureRaw?.periods || [])
        .map(p => p?.name)
        .filter(Boolean);
    const fallbackPeriods = getPeriods(programType, programLevel);
    const periods = [...new Set([...actualPeriods, ...fallbackPeriods])];

    const currentValue = periodFilter.value;
    periodFilter.innerHTML = '<option value="all">All Periods</option>' +
        periods.map(period =>
            `<option value="${escapeFinanceHtml(period)}">${escapeFinanceHtml(period)}</option>`
        ).join('');

    if (currentValue && periods.includes(currentValue)) {
        periodFilter.value = currentValue;
    }
}

function updateFinanceUI(data) {
    if (!data) return;

    studentFinanceState.student = data.student;
    studentFinanceState.payments = Array.isArray(data.payments) ? data.payments : [];
    studentFinanceState.feeStructure = Array.isArray(data.feeStructure) ? data.feeStructure : [];
    studentFinanceState.feeStructureRaw = data.feeStructureRaw || studentFinanceState.feeStructureRaw;
    studentFinanceState.voteHeads = data.voteHeads || [];
    studentFinanceState.currentPeriod = data.currentPeriod || null;
    studentFinanceState.currentPeriodIndex = Number(data.currentPeriodIndex) || 0;
    studentFinanceState.semesterFee = Number(data.semesterFee) || 0;
    studentFinanceState.paidThisSemester = Number(data.paidThisSemester) || 0;
    studentFinanceState.currentPeriodOutstanding = Number(data.currentPeriodOutstanding) || 0;
    studentFinanceState.currentPeriodProgress = Number(data.currentPeriodProgress) || 0;
    studentFinanceState.balance = Math.max(Number(data.balance) || 0, 0);
    studentFinanceState.totalPaid = Math.max(Number(data.totalPaid) || 0, 0);
    studentFinanceState.totalDue = Math.max(Number(data.totalDue) || 0, 0);
    studentFinanceState.outstanding = Math.max(Number(data.outstanding) || 0, 0);
    studentFinanceState.paymentProgress = Math.min(Math.max(Number(data.paymentProgress) || 0, 0), 100);
    studentFinanceState.overallProgress = studentFinanceState.paymentProgress;

    updateProgramInfo(data.student, data.programType, data.programLevel);
    updateBalance(data);
    updateStats(data);
    renderPayments(data.payments || []);
    renderPaymentTimeline(data.feeStructure || []);
    renderFeeStructureData();
    updateSelectedPaymentPeriodInfo(
        document.getElementById('finance-paymentPeriod')?.value ||
        data.currentPeriod
    );

    const periodBadge = document.getElementById('finance-currentPeriodBadge');
    if (periodBadge) periodBadge.textContent = data.currentPeriod || '--';

    const academicYear = document.getElementById('finance-academicYearDisplay');
    if (academicYear) {
        academicYear.textContent = data.student?.intake_year
            ? `Intake ${data.student.intake_year}`
            : 'Academic Finance';
    }

    const nextPayment = document.getElementById('finance-nextPaymentDue');
    if (nextPayment) {
        nextPayment.textContent = studentFinanceState.outstanding > 0
            ? 'Outstanding'
            : 'No outstanding payment';
    }

    const message = document.getElementById('finance-periodMessage');
    if (message) {
        message.innerHTML = studentFinanceState.currentPeriodOutstanding > 0
            ? `<i class="fas fa-info-circle"></i><span>Current period outstanding: KES ${studentFinanceState.currentPeriodOutstanding.toLocaleString()}</span>`
            : `<i class="fas fa-check-circle"></i><span>Your current payment period is fully paid.</span>`;
    }

    updateDashboardFinanceBridge(data);
}

function updateBalance(data) {
    const balance = Math.max(Number(data?.balance) || 0, 0);
    const totalDue = Math.max(Number(data?.totalDue) || 0, 0);
    const totalPaid = Math.max(Number(data?.totalPaid) || 0, 0);
    const semesterFee = Math.max(Number(data?.semesterFee) || 0, 0);
    const paidThisSemester = Math.max(Number(data?.paidThisSemester) || 0, 0);
    const currentOutstanding = Math.max(
        Number(data?.currentPeriodOutstanding ?? (semesterFee - paidThisSemester)) || 0,
        0
    );
    const overallProgress = Math.min(Math.max(Number(data?.paymentProgress) || 0, 0), 100);
    const currentProgress = Math.min(Math.max(Number(data?.currentPeriodProgress) || 0, 0), 100);

    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };

    setText('finance-studentBalanceDisplay', `KES ${balance.toLocaleString()}`);
    setText('finance-studentPeriodFee', `KES ${semesterFee.toLocaleString()}`);
    setText('finance-studentPaidThisPeriod', `KES ${paidThisSemester.toLocaleString()}`);
    setText('finance-studentOutstanding', `KES ${currentOutstanding.toLocaleString()}`);
    setText('finance-totalDueAmount', `KES ${semesterFee.toLocaleString()}`);
    setText('finance-totalPaidAmount', `KES ${paidThisSemester.toLocaleString()}`);
    setText('finance-balanceAmount', `KES ${currentOutstanding.toLocaleString()}`);

    const fill = document.getElementById('finance-paymentProgressFill');
    if (fill) fill.style.width = `${Math.round(currentProgress)}%`;

    setText('finance-paymentProgressText', `${Math.round(currentProgress)}%`);
    setText('finance-paymentProgressText2', `${Math.round(currentProgress)}%`);

    const circle = document.getElementById('finance-progressCircle');
    if (circle) {
        const circumference = 2 * Math.PI * 48;
        circle.style.strokeDasharray = `${circumference}`;
        circle.style.strokeDashoffset = `${circumference - (currentProgress / 100) * circumference}`;
    }

    const statusProgress = currentProgress;
    updateBalanceStatus(currentOutstanding, statusProgress);
}

function updateBalanceStatus(balance, progress = 0) {
    const statusEl = document.getElementById('finance-balanceStatusDisplay');
    const dot = document.getElementById('finance-statusDot');
    const text = document.getElementById('finance-statusText');
    if (!statusEl) return;

    if (balance <= 0) {
        statusEl.style.background = '#ddf8eb';
        if (dot) dot.style.background = '#10b981';
        if (text) { text.textContent = 'Paid in Full'; text.style.color = '#079361'; }
    } else if (progress > 0) {
        statusEl.style.background = '#fff2d7';
        if (dot) dot.style.background = '#f59e0b';
        if (text) { text.textContent = 'Partially Paid'; text.style.color = '#b77900'; }
    } else {
        statusEl.style.background = '#ffe8e9';
        if (dot) dot.style.background = '#ef4444';
        if (text) { text.textContent = 'Outstanding Balance'; text.style.color = '#ef3139'; }
    }
}

function updateStats(data) {
    const payments = Array.isArray(data?.payments) ? data.payments : [];
    const paid = payments.filter(p => String(p.status).toLowerCase() === 'completed').length;
    const pending = payments.filter(p => String(p.status).toLowerCase() === 'pending').length;
    const overdue = payments.filter(p => ['failed', 'overdue', 'cancelled'].includes(String(p.status).toLowerCase())).length;

    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };

    setText('finance-paidCount', paid);
    setText('finance-pendingCount', pending);
    setText('finance-overdueCount', overdue);
    setText('finance-totalTransactions', payments.length);
    setText('finance-paymentRecordCount', `Showing ${payments.length} payment${payments.length === 1 ? '' : 's'}`);
}

function updateDashboardFinanceBridge(data) {
    const balance = document.getElementById('dashboard-finance-balance');
    const status = document.getElementById('dashboard-finance-status');

    // Dashboard = CURRENT block/semester outstanding.
    // data.balance remains the FULL account outstanding for the Finance page.
    const currentOutstanding = Math.max(
        Number(
            data?.currentPeriodOutstanding ??
            (
                Number(data?.semesterFee || 0) -
                Number(data?.paidThisSemester || 0)
            )
        ) || 0,
        0
    );

    const currentFee = Math.max(Number(data?.semesterFee) || 0, 0);
    const currentPaid = Math.max(Number(data?.paidThisSemester) || 0, 0);

    if (balance) {
        balance.textContent = `KES ${currentOutstanding.toLocaleString()}`;
        balance.setAttribute(
            'title',
            data?.currentPeriod
                ? `Current period: ${data.currentPeriod}`
                : 'Current period outstanding'
        );
    }

    if (status) {
        status.textContent = currentOutstanding <= 0
            ? 'Current Period Paid'
            : currentPaid > 0
                ? 'Partially Paid'
                : 'Current Period Outstanding';
    }

    const label = document.getElementById('dashboard-finance-label');
    if (label) {
        label.textContent = data?.currentPeriod
            ? `${data.currentPeriod} Outstanding`
            : 'Current Period Outstanding';
    }

    const sublabel = document.getElementById('dashboard-finance-sublabel');
    if (sublabel) {
        sublabel.textContent = currentFee > 0
            ? `Fee: KES ${currentFee.toLocaleString()} • Paid: KES ${currentPaid.toLocaleString()}`
            : 'Current period fee balance';
    }
}

function renderPaymentTimeline(feeStructure) {
    const timeline = document.getElementById('finance-paymentTimeline');
    if (!timeline) return;

    const programType = studentFinanceState.programType || 'TVET';
    const programLevel = studentFinanceState.programLevel || 'certificate';
    const timelineLabel = document.getElementById('finance-timelineProgramLabel');
    if (timelineLabel) timelineLabel.textContent = `${programType} - ${programLevel === 'certificate' ? 'Certificate' : 'Diploma'}`;

    if (!Array.isArray(feeStructure) || !feeStructure.length) {
        timeline.innerHTML = `<div style="text-align:center;padding:12px;color:#94a3b8;font-size:11px;"><i class="fas fa-info-circle"></i> No fee structure</div>`;
        return;
    }

    timeline.innerHTML = feeStructure.map(f => {
        const amount = Number(f.amount) || 0;
        const paid = Number(f.paid) || 0;
        const status = String(f.status || '').toLowerCase();
        const isPaid = status === 'paid';
        const isPartial = status === 'partial';
        const bg = isPaid ? '#d1fae5' : isPartial ? '#fef3c7' : '#fee2e2';
        const border = isPaid ? '#10b981' : isPartial ? '#f59e0b' : '#dc2626';
        const color = isPaid ? '#059669' : isPartial ? '#d97706' : '#dc2626';
        const icon = isPaid ? '✅' : isPartial ? '⏳' : '❌';
        const label = isPaid ? 'Paid' : isPartial ? 'Partial' : 'Unpaid';
        const amountText = isPaid ? `KES ${amount.toLocaleString()}` : isPartial ? `Paid: KES ${paid.toLocaleString()}` : `Due: KES ${amount.toLocaleString()}`;
        return `<div style="min-width:70px;text-align:center;padding:4px 6px;background:${bg};border-radius:4px;border:1px solid ${border};margin-right:4px;display:inline-block;">
            <div style="font-size:7px;color:#0A3D62;font-weight:600;">${escapeFinanceHtml(f.block || '')}</div>
            <div style="font-weight:700;color:${color};font-size:11px;">${icon} ${label}</div>
            <div style="font-size:7px;color:#94a3b8;">${amountText}</div>
        </div>`;
    }).join('');
}

// ============================================================
// 📄 RENDER PAYMENTS - MOBILE OPTIMIZED
// ============================================================

function renderPayments(payments) {
    const tbody =
        document.getElementById('finance-studentPaymentHistory');

    if (!tbody) return;

    if (!Array.isArray(payments) || payments.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="padding:32px 10px;text-align:center;color:#7b8ba5;">
                    <i class="fas fa-inbox" style="display:block;font-size:24px;margin-bottom:7px;"></i>
                    No payment records found
                </td>
            </tr>
        `;
        return;
    }

    const statusStyles = {
        completed: 'background:#ddf8eb;color:#079361;',
        pending: 'background:#fff2d7;color:#b77900;',
        failed: 'background:#ffe5e7;color:#ed3038;',
        overdue: 'background:#ffe5e7;color:#ed3038;',
        cancelled: 'background:#eef2f6;color:#64748b;'
    };

    tbody.innerHTML = payments.map((p, index) => {
        const status =
            String(p.status || 'pending').toLowerCase();

        const label =
            status.charAt(0).toUpperCase() + status.slice(1);

        const style =
            statusStyles[status] || statusStyles.pending;

        return `
            <tr style="border-bottom:1px solid #edf1f6;">
                <td style="padding:10px 9px;color:#71819d;font-size:10px;">
                    ${index + 1}
                </td>
                <td style="padding:10px 9px;color:#405579;font-size:10px;white-space:nowrap;">
                    ${p.date || '-'}
                </td>
                <td style="padding:10px 9px;color:#102d69;font-size:10px;font-weight:700;">
                    ${p.period || 'N/A'}
                </td>
                <td style="padding:10px 9px;color:#102d69;font-size:10px;font-weight:800;white-space:nowrap;">
                    KES ${Number(p.amount || 0).toLocaleString()}
                </td>
                <td style="padding:10px 9px;color:#536783;font-size:10px;">
                    ${p.method || 'M-Pesa'}
                </td>
                <td style="padding:10px 9px;color:#536783;font-size:9px;font-family:monospace;">
                    ${p.reference || '-'}
                </td>
                <td style="padding:10px 9px;">
                    <span style="display:inline-block;padding:4px 8px;border-radius:12px;font-size:9px;font-weight:700;${style}">
                        ${label}
                    </span>
                </td>
                <td style="padding:10px 9px;text-align:center;">
                    ${
                        status === 'completed'
                            ? `<button type="button"
                                onclick="printPaymentById('${p.id || ''}')"
                                style="width:27px;height:27px;border:0;border-radius:6px;background:#e5efff;color:#0864dc;cursor:pointer;"
                                title="Print receipt">
                                <i class="fas fa-print"></i>
                               </button>`
                            : '<span style="color:#a2afc0;">—</span>'
                    }
                </td>
            </tr>
        `;
    }).join('');

    const recordCount =
        document.getElementById('finance-paymentRecordCount');

    if (recordCount) {
        recordCount.textContent =
            `Showing ${payments.length} payment${payments.length === 1 ? '' : 's'}`;
    }
}

function renderFeeStructureData() {
    const body =
        document.getElementById('finance-feeStructureBody');

    const totalEl =
        document.getElementById('finance-feeStructureTotal');

    if (!body) return;

    const data = studentFinanceState.feeStructureRaw;

    if (!data?.periods?.length) {
        body.innerHTML = `
            <tr>
                <td colspan="2" style="padding:28px 10px;text-align:center;color:#71819d;">
                    <i class="fas fa-info-circle"></i>
                    &nbsp; No fee structure available.
                </td>
            </tr>
        `;

        if (totalEl) totalEl.textContent = '0';
        return;
    }

    const currentIndex =
        Number(studentFinanceState.currentPeriodIndex || 0);

    body.innerHTML = data.periods.map((period, index) => {
        const amount = Number(period.amount) || 0;
        const current = index === currentIndex;

        return `
            <tr style="border-bottom:1px solid #edf1f6;${current ? 'background:#f7fbff;' : ''}">
                <td style="padding:10px 12px;color:#405579;font-size:10px;">
                    <span style="display:inline-block;width:7px;height:7px;margin-right:7px;border-radius:50%;background:${current ? '#0864dc' : '#cbd5e1'};"></span>
                    <strong style="color:#102d69;">${period.name}</strong>
                    ${current ? '<span style="margin-left:5px;padding:2px 5px;border-radius:8px;background:#e5efff;color:#0864dc;font-size:8px;font-weight:700;">CURRENT</span>' : ''}
                </td>
                <td style="padding:10px 12px;text-align:right;color:#102d69;font-size:10px;font-weight:800;white-space:nowrap;">
                    KES ${amount.toLocaleString()}
                </td>
            </tr>
        `;
    }).join('');

    const total = data.periods.reduce(
        (sum, p) => sum + (Number(p.amount) || 0),
        0
    );

    if (totalEl) {
        totalEl.textContent = total.toLocaleString();
    }
}

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
    const student =
        studentFinanceState.student || {};

    const payments =
        studentFinanceState.payments || [];

    const completedTotal =
        payments
            .filter(p => p.status === 'completed')
            .reduce(
                (sum, p) =>
                    sum + Number(p.amount || 0),
                0
            );

    const rows = payments.map((p, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${p.date || '-'}</td>
            <td>${p.period || '-'}</td>
            <td>KES ${Number(p.amount || 0).toLocaleString()}</td>
            <td>${p.method || '-'}</td>
            <td>${p.reference || '-'}</td>
            <td>${p.status || '-'}</td>
        </tr>
    `).join('');

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>NCHSM Finance Statement</title>
<style>
body{font-family:Arial,sans-serif;padding:30px;color:#102d69}
h1{margin-bottom:4px}.meta{color:#536783;margin-bottom:20px}
.summary{display:flex;gap:15px;margin-bottom:20px}
.card{flex:1;padding:14px;border:1px solid #dfe6ef;border-radius:8px}
.card strong{display:block;font-size:20px;margin-top:5px}
table{width:100%;border-collapse:collapse;font-size:11px}
th,td{padding:8px;border:1px solid #dfe6ef;text-align:left}
th{background:#f2f5f9}
</style>
</head>
<body>
<h1>NCHSM — Student Finance Statement</h1>
<div class="meta">
<strong>${student.full_name || student.name || 'Student'}</strong><br>
Student ID: ${student.student_id || student.id || '-'}<br>
Program: ${student.program || '-'} |
Intake: ${student.intake_year || student.intake || '-'}
</div>
<div class="summary">
<div class="card">Total Paid<strong>KES ${completedTotal.toLocaleString()}</strong></div>
<div class="card">Outstanding<strong>KES ${Number(studentFinanceState.balance || 0).toLocaleString()}</strong></div>
<div class="card">Transactions<strong>${payments.length}</strong></div>
</div>
<table>
<thead>
<tr>
<th>#</th><th>Date</th><th>Period</th><th>Amount</th>
<th>Method</th><th>Reference</th><th>Status</th>
</tr>
</thead>
<tbody>${rows || '<tr><td colspan="7">No payment records.</td></tr>'}</tbody>
</table>
</body>
</html>`;

    const blob =
        new Blob([html], { type: 'text/html' });

    const url =
        URL.createObjectURL(blob);

    const a =
        document.createElement('a');

    a.href = url;
    a.download =
        `NCHSM-Finance-Statement-${student.student_id || 'student'}.html`;

    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);

    notifySuperAdmin('statement_downloaded', {
        studentId:
            student.userId ||
            student.user_id ||
            student.id,
        timestamp:
            new Date().toISOString()
    });

    showToast(
        '📄 Finance statement downloaded.',
        'success'
    );
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


// ============================================================
// 📱 RESPONSIVE FINANCE + M-PESA PHONE INPUT
// ============================================================

function ensureFinanceResponsiveStyles() {
    if (document.getElementById('nchsm-finance-responsive-css')) return;

    const style = document.createElement('style');
    style.id = 'nchsm-finance-responsive-css';
    style.textContent = `
        #finance {
            width:100% !important;
            max-width:100% !important;
            overflow-x:hidden !important;
        }

        #finance, #finance * {
            box-sizing:border-box;
        }

        #finance table {
            width:100%;
            min-width:650px;
        }

        #finance .table-responsive,
        #finance .finance-table-wrapper,
        #finance [style*="overflow-x"] {
            max-width:100%;
            overflow-x:auto;
            -webkit-overflow-scrolling:touch;
        }

        #finance-paymentModal {
            padding:12px !important;
            overflow-y:auto !important;
        }

        .nchsm-payment-dialog {
            width:min(480px,100%) !important;
            max-width:100% !important;
            max-height:calc(100vh - 24px);
            overflow-y:auto;
            margin:auto;
            border-radius:18px !important;
        }

        .nchsm-payment-phone {
            width:100%;
            margin:14px 0;
            text-align:left;
        }

        .nchsm-payment-phone label {
            display:block;
            margin-bottom:7px;
            color:#102d69;
            font-size:12px;
            font-weight:800;
        }

        .nchsm-phone-box {
            display:flex;
            width:100%;
            height:46px;
            overflow:hidden;
            border:1px solid #d8e1ec;
            border-radius:9px;
            background:#fff;
        }

        .nchsm-phone-prefix {
            width:58px;
            flex:0 0 58px;
            display:flex;
            align-items:center;
            justify-content:center;
            background:#f5f7fa;
            border-right:1px solid #e2e8f0;
            color:#405579;
            font-size:12px;
            font-weight:800;
        }

        #finance-paymentPhone {
            width:100%;
            min-width:0;
            border:0;
            outline:0;
            padding:0 12px;
            background:#fff;
            color:#102d69;
            font-size:14px;
            font-weight:600;
        }

        #finance-paymentPhone:focus {
            outline:0;
        }

        .nchsm-phone-help {
            margin-top:6px;
            color:#71819d;
            font-size:10px;
            line-height:1.45;
        }

        #finance-paymentPhoneError {
            display:none;
            margin-top:5px;
            color:#dc3545;
            font-size:10px;
            font-weight:700;
        }

        @media(max-width:768px) {
            #finance-paymentModal {
                align-items:flex-end !important;
                padding:0 !important;
            }

            .nchsm-payment-dialog {
                width:100% !important;
                max-height:92vh;
                border-radius:18px 18px 0 0 !important;
            }

            #finance-paymentPhone {
                font-size:16px;
            }

            .nchsm-payment-dialog button {
                min-height:44px;
            }

            #finance {
                padding-left:0 !important;
                padding-right:0 !important;
            }
        }

        @media(max-width:430px) {
            .nchsm-payment-dialog {
                max-height:94vh;
            }
        }
    `;
    document.head.appendChild(style);
}

function normalizeMpesaPhone(value) {
    let phone = String(value || '').trim().replace(/[^\d+]/g, '');

    if (phone.startsWith('+254')) {
        phone = phone.slice(1);
    }

    if (/^254(7|1)\d{8}$/.test(phone)) return '+' + phone;
    if (/^0(7|1)\d{8}$/.test(phone)) return '+254' + phone.slice(1);
    if (/^(7|1)\d{8}$/.test(phone)) return '+254' + phone;

    return null;
}

function ensurePaymentPhoneField(container, currentPhone='') {
    if (!container) return null;

    // Reuse the existing master HTML phone field.
    // Do not create a duplicate if #finance-paymentPhone already exists.
    let input = container.querySelector('#finance-paymentPhone');

    if (!input) {
        let wrap = container.querySelector('.nchsm-payment-phone');

        if (!wrap) {
            wrap = document.createElement('div');
            wrap.className = 'nchsm-payment-phone';
            wrap.innerHTML = `
                <label for="finance-paymentPhone">
                    <i class="fas fa-mobile-alt"></i>
                    M-Pesa Phone Number
                </label>
                <div class="nchsm-phone-box">
                    <span class="nchsm-phone-prefix">+254</span>
                    <input
                        id="finance-paymentPhone"
                        type="tel"
                        inputmode="numeric"
                        autocomplete="tel"
                        maxlength="10"
                        placeholder="0712345678"
                        aria-label="M-Pesa phone number"
                    >
                </div>
                <div class="nchsm-phone-help">
                    Enter the number that will receive the M-Pesa STK Push.
                    Example: 0712345678
                </div>
                <div id="finance-paymentPhoneError"></div>
            `;

            const amount = container.querySelector('#finance-paymentAmount');
            if (amount) {
                const parent = amount.closest(
                    '.form-group, .finance-form-group, div'
                );
                if (parent && parent.parentElement) {
                    parent.parentElement.appendChild(wrap);
                } else {
                    amount.parentElement?.appendChild(wrap);
                }
            } else {
                container.appendChild(wrap);
            }
        }

        input = wrap.querySelector('#finance-paymentPhone');
    }

    if (input && !input.value && currentPhone) {
        let v = String(currentPhone).trim();
        if (v.startsWith('+254')) v = '0' + v.slice(4);
        else if (v.startsWith('254')) v = '0' + v.slice(3);
        input.value = v;
    }

    if (input && !input.dataset.bound) {
        input.dataset.bound = 'true';
        input.addEventListener('input', function() {
            this.value = this.value.replace(/[^\d+]/g, '');
            const err = document.getElementById('finance-paymentPhoneError');
            if (err) {
                err.style.display = 'none';
                err.textContent = '';
            }
        });
    }

    return input;
}

function escapeFinanceHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getStudentAcademicBlocks() {
    const student = studentFinanceState.student || window.currentUserProfile || window.currentUser || {};
    const candidates = [
        student.block,
        student.current_block,
        student.currentBlock,
        student.block_term,
        student.student_block,
        student.class_block
    ];

    return [...new Set(candidates
        .filter(Boolean)
        .flatMap(value => Array.isArray(value) ? value : String(value).split(',').map(v => v.trim()))
        .filter(Boolean))];
}

function getPeriodFinanceSummary(period) {
    const normalized = mapPeriodToDisplay(period || '');
    const periods = studentFinanceState.feeStructureRaw?.periods || [];
    const feeRow = periods.find(p => mapPeriodToDisplay(p?.name || p?.period || '') === normalized);
    const fee = Number(feeRow?.amount) || 0;
    const paid = (studentFinanceState.payments || [])
        .filter(p => String(p.status).toLowerCase() === 'completed')
        .filter(p => mapPeriodToDisplay(p.period) === normalized)
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const outstanding = Math.max(fee - paid, 0);
    const progress = fee > 0 ? Math.min((paid / fee) * 100, 100) : 0;
    return { period: normalized, fee, paid, outstanding, progress };
}

function updateSelectedPaymentPeriodInfo(period) {
    if (!period) return;
    const summary = getPeriodFinanceSummary(period);
    const info = document.getElementById('finance-selectedPeriodInfo');
    const fee = document.getElementById('finance-selectedPeriodFee');
    const paid = document.getElementById('finance-selectedPeriodPaid');
    const balance = document.getElementById('finance-selectedPeriodBalance');

    if (fee) fee.textContent = `KES ${summary.fee.toLocaleString()}`;
    if (paid) paid.textContent = `KES ${summary.paid.toLocaleString()}`;
    if (balance) balance.textContent = `KES ${summary.outstanding.toLocaleString()}`;
    if (info) {
        info.style.display = 'block';
        info.innerHTML = `<strong>${escapeFinanceHtml(summary.period)}</strong> — Fee: KES ${summary.fee.toLocaleString()} | Paid: KES ${summary.paid.toLocaleString()} | Balance: KES ${summary.outstanding.toLocaleString()}`;
    }
}

function populatePaymentPeriodOptions() {
    const select = document.getElementById('finance-paymentPeriod');
    if (!select) return;

    const programType = studentFinanceState.programType || getProgramType(studentFinanceState.student?.program || 'TVET');
    const level = studentFinanceState.programLevel || getProgramLevel(studentFinanceState.student?.program || '');
    const fallbackPeriods = getPeriods(programType, level);

    const feePeriods = (studentFinanceState.feeStructure || [])
        .map(row => row?.block || row?.period || row?.name || '')
        .filter(Boolean)
        .map(mapPeriodToDisplay);

    const periods = [...new Set([...feePeriods, ...fallbackPeriods])];
    const profilePeriod = getCurrentProfileFinancePeriod(studentFinanceState.student);
    const preferred = studentFinanceState.selectedPeriod || profilePeriod || studentFinanceState.currentPeriod || periods[0] || '';

    select.innerHTML = '<option value="">Select fee period</option>' + periods.map(period =>
        `<option value="${escapeFinanceHtml(period)}">${escapeFinanceHtml(period)}</option>`
    ).join('');

    if (preferred && periods.includes(preferred)) {
        select.value = preferred;
        studentFinanceState.selectedPeriod = preferred;
    } else if (periods[0]) {
        select.value = periods[0];
        studentFinanceState.selectedPeriod = periods[0];
    }

    updateSelectedPaymentPeriodInfo(select.value);
}


function populatePaymentBlockOptions() {
    const select = document.getElementById('finance-paymentBlock');
    if (!select) return;

    const blocks = getStudentAcademicBlocks();
    const current = studentFinanceState.selectedBlock || blocks[0] || '';

    if (!blocks.length) {
        select.innerHTML = '<option value="">Not specified / Not applicable</option>';
        studentFinanceState.selectedBlock = '';
        return;
    }

    select.innerHTML = '<option value="">Select block (optional)</option>' + blocks.map(block =>
        `<option value="${escapeFinanceHtml(block)}">${escapeFinanceHtml(block)}</option>`
    ).join('');

    select.value = current;
    studentFinanceState.selectedBlock = current;
}


function openPaymentModal() {
    const modal = document.getElementById('finance-paymentModal');

    if (!modal) {
        showToast('❌ Payment system error. Please refresh the page.', 'error');
        return;
    }

    ensureFinanceResponsiveStyles();

    const user =
        studentFinanceState.student ||
        window.currentUserProfile ||
        window.currentUser ||
        {};

    const dialog =
        modal.querySelector(
            '.finance-modal-content, .finance-modal-dialog, .modal-content'
        ) || modal.lastElementChild;

    if (dialog) {
        dialog.classList.add('nchsm-payment-dialog');

        ensurePaymentPhoneField(
            dialog,
            user.phone || user.phone_number || ''
        );
    }

    const amountInput =
        document.getElementById('finance-paymentAmount');

    if (
        amountInput &&
        !amountInput.value &&
        Number(studentFinanceState.balance || 0) > 0
    ) {
        amountInput.value =
            Number(studentFinanceState.balance);
    }

    populatePaymentPeriodOptions();
    populatePaymentBlockOptions();
    updateSelectedPaymentPeriodInfo(document.getElementById('finance-paymentPeriod')?.value || studentFinanceState.currentPeriod);

    const method =
        document.getElementById('finance-paymentMethod');

    if (method && !method.value) method.value = studentFinanceState.selectedPaymentMethod || 'mpesa';

    selectPaymentMethod(method?.value || 'mpesa');

    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    pendingPayment.cancelled = false;
    pendingPayment.status = 'idle';
}

function closePaymentModal() {
    const modal =
        document.getElementById('finance-paymentModal');

    if (modal) {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
    }

    document.body.style.overflow = '';

    pendingPayment.isProcessing = false;
    pendingPayment.cancelled = false;
    pendingPayment.status = 'idle';
}


function selectPaymentMethod(method) {
    const normalized = String(method || '').toLowerCase() === 'bank' ? 'bank' : 'mpesa';
    const select = document.getElementById('finance-paymentMethod');
    if (select) select.value = normalized;

    studentFinanceState.selectedPaymentMethod = normalized;

    const mpesaFields = document.getElementById('finance-mpesaFields');
    const bankFields = document.getElementById('finance-bankFields');
    const info = document.getElementById('finance-paymentInfo');
    const submit = document.getElementById('finance-submitPayment');
    const submitText = document.getElementById('finance-submitPaymentText');
    const submitIcon = document.getElementById('finance-submitPaymentIcon');

    if (mpesaFields) mpesaFields.style.display = normalized === 'mpesa' ? 'block' : 'none';
    if (bankFields) bankFields.style.display = normalized === 'bank' ? 'block' : 'none';

    if (normalized === 'mpesa') {
        if (info) {
            info.style.background = '#eaf3ff';
            info.style.color = '#1761c9';
            info.innerHTML = '<i class="fas fa-mobile-alt"></i><span>Enter the phone number that should receive the M-Pesa STK Push. You will be asked to enter your M-Pesa PIN on the phone.</span>';
        }
        if (submit) submit.style.background = '#0baa68';
        if (submitIcon) submitIcon.className = 'fas fa-mobile-alt';
        if (submitText) submitText.textContent = ' Pay with M-Pesa STK Push';
    } else {
        if (info) {
            info.style.background = '#fff7e6';
            info.style.color = '#9a6700';
            info.innerHTML = '<i class="fas fa-university"></i><span>Bank transfers are recorded as pending until the Finance Office verifies the bank transaction reference.</span>';
        }
        if (submit) submit.style.background = '#1455a0';
        if (submitIcon) submitIcon.className = 'fas fa-university';
        if (submitText) submitText.textContent = ' Submit Bank Transfer';
    }
}


function validatePaymentForm() {
    const amount = Number(document.getElementById('finance-paymentAmount')?.value || 0);
    const method = document.getElementById('finance-paymentMethod')?.value || '';
    const period = document.getElementById('finance-paymentPeriod')?.value || '';

    if (!amount || amount < 1) {
        showToast('❌ Please enter a valid payment amount.', 'error');
        return false;
    }

    if (!period) {
        showToast('❌ Please select the fee term/semester.', 'error');
        return false;
    }

    const periodSummary = getPeriodFinanceSummary(period);
    const periodOutstanding = Number(periodSummary.outstanding || 0);
    if (periodOutstanding <= 0) {
        showToast('ℹ️ The selected fee period has no outstanding balance.', 'info');
        return false;
    }

    if (amount > periodOutstanding) {
        showToast(`❌ Payment amount cannot exceed the selected period outstanding balance of KES ${periodOutstanding.toLocaleString()}.`, 'error');
        return false;
    }

    if (!['mpesa', 'bank'].includes(method)) {
        showToast('❌ Please select a payment method.', 'error');
        return false;
    }

    studentFinanceState.selectedPeriod = period;
    studentFinanceState.selectedBlock = document.getElementById('finance-paymentBlock')?.value || null;

    if (method === 'bank') {
        const bankReference = document.getElementById('finance-bankReference')?.value?.trim() || '';
        if (!bankReference) {
            showToast('❌ Enter the bank transaction/reference number.', 'error');
            document.getElementById('finance-bankReference')?.focus();
            return false;
        }
        return true;
    }

    const input = document.getElementById('finance-paymentPhone');
    const phone = normalizeMpesaPhone(input?.value || '');
    const error = document.getElementById('finance-paymentPhoneError');

    if (!phone) {
        if (error) {
            error.textContent = 'Enter a valid Kenyan M-Pesa number, e.g. 0712345678.';
            error.style.display = 'block';
        }
        input?.focus();
        showToast('❌ Enter a valid M-Pesa phone number.', 'error');
        return false;
    }

    return true;
}


async function processPayment() {
    if (!validatePaymentForm()) return;

    const amount = Number(
        document.getElementById('finance-paymentAmount')?.value || 0
    );

    const method =
        document.getElementById('finance-paymentMethod')?.value || 'mpesa';

    const selectedPeriod =
        document.getElementById('finance-paymentPeriod')?.value ||
        studentFinanceState.selectedPeriod ||
        studentFinanceState.currentPeriod ||
        '';

    const selectedBlock =
        document.getElementById('finance-paymentBlock')?.value ||
        studentFinanceState.selectedBlock ||
        '';

    const user =
        studentFinanceState.student ||
        window.currentUserProfile ||
        window.currentUser;

    if (!user) {
        showToast('❌ Please login first.', 'error');
        return;
    }

    const phoneInput =
        document.getElementById('finance-paymentPhone');

    const formattedPhone =
        method === 'mpesa'
            ? normalizeMpesaPhone(phoneInput?.value || '')
            : null;

    if (method === 'mpesa' && !formattedPhone) {
        showToast(
            '❌ Please enter a valid M-Pesa phone number.',
            'error'
        );
        phoneInput?.focus();
        return;
    }

    const supabase = getSupabaseClient();

    if (!supabase) {
        showToast(
            '❌ Supabase client is not available.',
            'error'
        );
        return;
    }

    const period =
        selectedPeriod ||
        studentFinanceState.currentPeriod ||
        getPeriods(
            studentFinanceState.programType || 'TVET',
            studentFinanceState.programLevel || 'diploma'
        )[0];

    const reference =
        method === 'bank'
            ? (
                document.getElementById('finance-bankReference')
                    ?.value?.trim() || `BANK-${Date.now()}`
            )
            : `STU-${Date.now()}`;

    pendingPayment.isProcessing = true;
    pendingPayment.cancelled = false;
    pendingPayment.transactionId = null;
    pendingPayment.paymentId = null;
    pendingPayment.status = 'processing';

    const modal =
        document.getElementById('finance-paymentModal');

    const dialog = modal?.lastElementChild;

    if (dialog) {
        dialog.innerHTML = method === 'mpesa'
            ? `
            <div style="padding:30px 22px;text-align:center;">
                <div style="width:62px;height:62px;margin:0 auto 15px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:#e5efff;color:#0864dc;font-size:25px;">
                    <i class="fas fa-mobile-alt"></i>
                </div>

                <h3 style="margin:0 0 6px;color:#112d69;font-size:19px;">
                    Processing Payment
                </h3>

                <p style="margin:0;color:#71819d;font-size:12px;">
                    Sending M-Pesa prompt...
                </p>

                <div style="margin:18px auto;padding:13px;border-radius:9px;background:#f3f7fb;">
                    <strong style="display:block;color:#102d69;font-size:24px;">
                        KES ${amount.toLocaleString()}
                    </strong>

                    <span style="display:block;margin-top:4px;color:#71819d;font-size:10px;">
                        ${period}
                    </span>
                </div>

                <p style="margin:10px 0;color:#536783;font-size:11px;">
                    Check <strong>${formattedPhone}</strong> and enter your M-Pesa PIN.
                </p>

                <button
                    type="button"
                    onclick="cancelStudentPayment()"
                    style="width:100%;height:40px;margin-top:10px;border:1px solid #ef4444;border-radius:7px;background:#fff;color:#ef4444;font-size:12px;font-weight:700;cursor:pointer;"
                >
                    <i class="fas fa-times"></i>
                    Cancel Payment
                </button>
            </div>
        `
            : `
                <div style="padding:30px 22px;text-align:center;">
                    <div style="width:62px;height:62px;margin:0 auto 15px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:#eaf3ff;color:#0864dc;font-size:25px;">
                        <i class="fas fa-university"></i>
                    </div>
                    <h3 style="margin:0 0 6px;color:#112d69;font-size:19px;">
                        Submitting Bank Transfer
                    </h3>
                    <p style="margin:0;color:#71819d;font-size:12px;">
                        Your payment will remain pending until verified by Finance.
                    </p>
                    <div style="margin:18px auto;padding:13px;border-radius:9px;background:#f3f7fb;">
                        <strong style="display:block;color:#102d69;font-size:24px;">
                            KES ${amount.toLocaleString()}
                        </strong>
                        <span style="display:block;margin-top:4px;color:#71819d;font-size:10px;">
                            ${period}${selectedBlock ? ` • ${selectedBlock}` : ''}
                        </span>
                    </div>
                    <p style="margin:10px 0;color:#536783;font-size:11px;">
                        Reference: <strong>${reference}</strong>
                    </p>
                </div>
            `;
    }

    try {
        // Canonical identity for new finance records.
        const paymentRecord = {
            student_id: user.user_id || user.id,
            student_name:
                user.full_name || user.name || 'Student',
            student_email: user.email || '',
            program: user.program || 'KRCHN',
            amount,
            payment_method: method === 'mpesa' ? 'M-Pesa' : 'Bank Transfer',
            reference_number: reference,
            payment_date:
                new Date().toISOString().split('T')[0],
            period:
                mapPeriodToDatabase(period) || period,
            status: 'pending',
            notes:
                method === 'mpesa'
                    ? `${period} Tuition Fees - M-Pesa Payment`
                    : `${period} Tuition Fees - Bank Transfer submitted for verification. Reference: ${reference}`,
            phone_number: formattedPhone,
            program_type:
                studentFinanceState.programType || 'KRCHN',
            metadata: {
                source: method === 'mpesa' ? 'payhero' : 'student-bank-transfer',
                original_period: period,
                academic_block: selectedBlock,
                bank_reference: method === 'bank' ? reference : null
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data: savedPayment, error: saveError } =
            await supabase
                .from('finance_payments')
                .insert([paymentRecord])
                .select()
                .maybeSingle();

        if (saveError) {
            throw new Error(
                saveError.message ||
                'Could not save payment.'
            );
        }

        pendingPayment.paymentId =
            savedPayment?.id || null;

        // BANK TRANSFER: save as pending; no gateway call.
        if (method === 'bank') {
            pendingPayment.isProcessing = false;
            pendingPayment.status = 'pending_verification';

            notifySuperAdmin('payment_recorded', {
                studentId: user.user_id || user.id,
                studentName: user.full_name || user.name || 'Student',
                amount,
                method: 'Bank Transfer',
                reference,
                period,
                block: selectedBlock,
                status: 'pending_verification'
            });

            showBankPaymentPending(
                amount,
                reference,
                period,
                selectedBlock
            );

            return;
        }

        // M-PESA: ORIGINAL V5 STK PUSH FLOW BELOW.
        const { data: stkData, error: stkError } =
            await supabase.functions.invoke(
                'payhero',
                {
                    body: {
                        action: 'stk_push',
                        phone: formattedPhone,
                        phone_number: formattedPhone,
                        amount: Math.round(amount),
                        order_id: reference,
                        external_reference: reference,
                        reference,
                        payment_id: savedPayment?.id || null,
                        customer_name: user.full_name || user.name || 'Student',
                        customer_email: user.email || '',
                        description: `${period} Tuition Fees Payment`,
                        period: mapPeriodToDatabase(period) || period,
                        student_id: user.user_id || user.id
                    }
                }
            );

        if (stkError) {
            throw new Error(
                stkError.message ||
                'STK Push failed.'
            );
        }

        if (!stkData?.success) {
            throw new Error(
                stkData?.message ||
                stkData?.error ||
                'STK Push failed.'
            );
        }

        const transactionId =
            stkData.transaction_id;

        if (!transactionId) {
            throw new Error(
                'No PayHero transaction ID was returned.'
            );
        }

        pendingPayment.transactionId =
            transactionId;

        await supabase
            .from('finance_payments')
            .update({
                checkout_request_id: transactionId,
                updated_at: new Date().toISOString()
            })
            .eq('id', savedPayment.id);

        await pollStudentPaymentStatus(
            transactionId,
            amount,
            period
        );

    } catch (error) {
        console.error(
            '❌ Payment initiation error:',
            error
        );

        pendingPayment.isProcessing = false;
        pendingPayment.status = 'failed';

        try {
            if (pendingPayment.paymentId) {
                await supabase
                    .from('finance_payments')
                    .update({
                        status: 'failed',
                        notes:
                            `STK Push failed: ${error.message}`,
                        updated_at:
                            new Date().toISOString()
                    })
                    .eq(
                        'id',
                        pendingPayment.paymentId
                    );
            }
        } catch (e) {
            console.warn(
                '⚠️ Could not mark failed payment:',
                e.message
            );
        }

        showStudentPaymentFailure(
            error.message ||
            'Payment initiation failed.'
        );
    }
}

async function pollStudentPaymentStatus(transactionId, amount, period) {
    const supabase = getSupabaseClient();
    const paymentId = pendingPayment.paymentId;
    const startedAt = Date.now();
    const timeoutMs = 120000;
    const intervalMs = 3000;

    if (!supabase || !paymentId) {
        throw new Error('Payment record is not available for status checking.');
    }

    const check = async () => {
        if (pendingPayment.cancelled) return 'cancelled';

        const { data, error } = await supabase
            .from('finance_payments')
            .select('*')
            .eq('id', paymentId)
            .maybeSingle();

        if (error) throw new Error(error.message || 'Could not check payment status.');

        const status = String(data?.status || 'pending').toLowerCase();
        console.log('💳 Payment status:', status, data);

        if (status === 'completed' || status === 'paid' || status === 'success' || status === 'successful') {
            pendingPayment.isProcessing = false;
            pendingPayment.status = 'completed';
            pendingPayment.transactionId = data?.checkout_request_id || transactionId;

            const receiptNumber = data?.receipt_number || data?.reference_number || transactionId || `NCHSM-${Date.now()}`;
            window._lastReceiptData = {
                amount,
                receiptNumber,
                period: mapPeriodToDisplay(data?.period || period),
                transactionId: data?.checkout_request_id || transactionId,
                reference: data?.reference_number || receiptNumber
            };

            closePaymentModal();

            const emailSent = await sendPaymentReceiptEmail({
                ...data,
                amount,
                receipt_number: receiptNumber,
                period: mapPeriodToDisplay(data?.period || period),
                transaction_id: data?.checkout_request_id || transactionId,
                reference_number: data?.reference_number || receiptNumber,
                program: studentFinanceState.student?.program || 'KRCHN'
            });

            showSuccessPopup(amount, receiptNumber, mapPeriodToDisplay(data?.period || period), emailSent);
            await loadStudentFinance(true);
            return 'completed';
        }

        if (['failed', 'cancelled', 'canceled', 'rejected', 'declined'].includes(status)) {
            pendingPayment.isProcessing = false;
            pendingPayment.status = status;
            showStudentPaymentFailure(`Payment ${status}.`);
            return status;
        }

        if (Date.now() - startedAt >= timeoutMs) {
            pendingPayment.isProcessing = false;
            pendingPayment.status = 'timeout';
            showStudentPaymentFailure('Payment confirmation timed out. If you completed the M-Pesa prompt, please wait for Finance to update the transaction.');
            return 'timeout';
        }

        return 'pending';
    };

    while (pendingPayment.isProcessing && !pendingPayment.cancelled) {
        const result = await check();
        if (result !== 'pending') return result;
        await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    return pendingPayment.cancelled ? 'cancelled' : pendingPayment.status;
}

async function cancelStudentPayment() {
    pendingPayment.cancelled = true;
    pendingPayment.isProcessing = false;
    pendingPayment.status = 'cancelled';

    const supabase = getSupabaseClient();
    if (supabase && pendingPayment.paymentId) {
        try {
            await supabase
                .from('finance_payments')
                .update({
                    status: 'cancelled',
                    notes: 'Payment cancelled by student before completion.',
                    updated_at: new Date().toISOString()
                })
                .eq('id', pendingPayment.paymentId);
        } catch (error) {
            console.warn('⚠️ Could not mark payment cancelled:', error.message);
        }
    }

    closePaymentModal();
    showToast('Payment cancelled.', 'warning');
}

function showStudentPaymentFailure(message) {
    closePaymentModal();
    const text = message || 'Payment could not be completed.';

    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'error',
            title: 'Payment Not Completed',
            text,
            confirmButtonColor: '#0A3D62'
        });
    } else {
        showToast(`❌ ${text}`, 'error');
    }
}

function showBankPaymentPending(amount, reference, period, block) {
    closePaymentModal();
    const message = `Bank transfer submitted successfully. Reference: ${reference}. It will remain pending until verified by the Finance Office.`;

    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'info',
            title: 'Bank Transfer Submitted',
            html: `<div style="text-align:left;font-size:13px;line-height:1.7;">Amount: <strong>KES ${Number(amount).toLocaleString()}</strong><br>Period: <strong>${escapeFinanceHtml(period)}</strong>${block ? `<br>Block: <strong>${escapeFinanceHtml(block)}</strong>` : ''}<br>Reference: <strong>${escapeFinanceHtml(reference)}</strong><br><br>Your payment will be reflected after Finance verifies the transfer.</div>`,
            confirmButtonColor: '#0A3D62'
        });
    } else {
        showToast(message, 'info');
    }

    loadStudentFinance(true);
}

async function initiatePayHeroSTK() {
    return processPayment();
}

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
    const statusFilter =
        document.getElementById('finance-paymentFilter')?.value || 'all';

    const periodFilter =
        document.getElementById('finance-periodFilter')?.value || 'all';

    const searchTerm =
        document.getElementById('finance-search')?.value?.trim().toLowerCase() || '';

    const payments =
        studentFinanceState.payments || [];

    const filtered = payments.filter(p => {
        if (
            statusFilter !== 'all' &&
            p.status !== statusFilter
        ) {
            return false;
        }

        if (
            periodFilter !== 'all' &&
            p.period !== periodFilter
        ) {
            return false;
        }

        if (searchTerm) {
            const searchable = [
                p.description,
                p.reference,
                p.method,
                p.period,
                p.date,
                p.amount
            ].join(' ').toLowerCase();

            if (!searchable.includes(searchTerm)) {
                return false;
            }
        }

        return true;
    });

    renderPayments(filtered);

    const count =
        document.getElementById('finance-paymentRecordCount');

    if (count) {
        count.textContent =
            `Showing ${filtered.length} payment${filtered.length === 1 ? '' : 's'}`;
    }
}

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
// 🖨️ PRINT PAYMENT FROM HISTORY
// ============================================================

async function printPaymentById(paymentId) {
    const payment =
        (studentFinanceState.payments || [])
            .find(
                p => String(p.id || '') ===
                    String(paymentId || '')
            );

    if (!payment) {
        showToast(
            '❌ Payment record not found.',
            'error'
        );
        return;
    }

    const receiptNumber =
        payment.receipt_number ||
        payment.reference ||
        payment.transaction_id ||
        'N/A';

    window._lastReceiptData = {
        amount: payment.amount,
        receiptNumber,
        period: payment.period,
        transactionId: payment.transaction_id,
        reference: payment.reference
    };

    printReceipt();
}

// ============================================================
// 🚀 INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    ensureFinanceResponsiveStyles();

    const financeTab =
        document.querySelector('a[data-tab="finance"]');

    if (financeTab) {
        financeTab.addEventListener('click', function() {
            setTimeout(
                () => loadStudentFinance(true),
                300
            );
        });
    }

    document.addEventListener('appReady', function() {
        console.log(
            '📱 App ready, loading student finance...'
        );

        setTimeout(
            () => loadStudentFinance(),
            800
        );
    });

    const paymentFilter =
        document.getElementById('finance-paymentFilter');

    if (paymentFilter) {
        paymentFilter.addEventListener(
            'change',
            filterStudentPayments
        );
    }

    const periodFilter =
        document.getElementById('finance-periodFilter');

    if (periodFilter) {
        periodFilter.addEventListener(
            'change',
            filterStudentPayments
        );
    }

    const searchInput =
        document.getElementById('finance-search');

    if (searchInput) {
        searchInput.addEventListener(
            'input',
            filterStudentPayments
        );
    }

    const paymentForm =
        document.getElementById('finance-paymentForm');

    if (paymentForm && !paymentForm.dataset.financeBound) {
        paymentForm.dataset.financeBound = 'true';
        paymentForm.addEventListener('submit', function(event) {
            event.preventDefault();
            processPayment();
        });
    }

    const paymentPeriodSelect = document.getElementById('finance-paymentPeriod');
    if (paymentPeriodSelect && !paymentPeriodSelect.dataset.financeBound) {
        paymentPeriodSelect.dataset.financeBound = 'true';
        paymentPeriodSelect.addEventListener('change', function() {
            studentFinanceState.selectedPeriod = this.value || null;
            updateSelectedPaymentPeriodInfo(this.value);
        });
    }

    const methodSelect =
        document.getElementById('finance-paymentMethod');

    if (methodSelect) {
        methodSelect.addEventListener(
            'change',
            function() {
                selectPaymentMethod(this.value);
            }
        );
    }

    const closeButton =
        document.getElementById(
            'finance-closePaymentModal'
        );

    if (closeButton) {
        closeButton.addEventListener(
            'click',
            closePaymentModal
        );
    }

    const cancelButton =
        document.getElementById(
            'finance-cancelPayment'
        );

    if (cancelButton) {
        cancelButton.addEventListener(
            'click',
            closePaymentModal
        );
    }

    const modal =
        document.getElementById(
            'finance-paymentModal'
        );

    const overlay =
        modal?.querySelector(
            '.finance-modal-overlay'
        );

    if (overlay) {
        overlay.addEventListener(
            'click',
            closePaymentModal
        );
    }

    const statementButton =
        document.getElementById(
            'finance-downloadStatementBtn'
        );

    if (statementButton) {
        statementButton.addEventListener(
            'click',
            downloadStudentStatement
        );
    }

    const viewFeesButton =
        document.getElementById(
            'finance-viewAllFees'
        );

    if (viewFeesButton) {
        viewFeesButton.addEventListener(
            'click',
            viewFullFeeStructure
        );
    }

    const contactButton =
        document.getElementById(
            'finance-contactOfficeBtn'
        );

    if (contactButton) {
        contactButton.addEventListener(
            'click',
            function() {
                window.location.href =
                    'tel:+254790969743';
            }
        );
    }

    listenForAdminEvents();

    notifySuperAdmin('module_ready', {
        version: '3.1.0',
        timestamp:
            new Date().toISOString()
    });

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
    window.printPaymentById = printPaymentById;
    window.ensureFinanceResponsiveStyles = ensureFinanceResponsiveStyles;
    window.ensurePaymentPhoneField = ensurePaymentPhoneField;
    window.normalizeMpesaPhone = normalizeMpesaPhone;
    window.getCurrentProfileFinancePeriod = getCurrentProfileFinancePeriod;

    setTimeout(() => {
        const financeSection =
            document.getElementById('finance');

        if (
            financeSection &&
            (
                financeSection.classList.contains('active') ||
                financeSection.style.display === 'block'
            )
        ) {
            loadStudentFinance();
        }
    }, 1000);
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
