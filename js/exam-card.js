// ====================================================
// EXAM CARD MODULE - Student Portal
// Displays ONLY approved registered units
// ====================================================

let currentExamCardStudentId = null;

// Initialize Exam Card Module
async function initExamCard() {
    console.log('📇 Initializing Exam Card module...');
    
    if (!window.currentUserId) {
        console.error('No user ID found');
        return;
    }
    
    currentExamCardStudentId = window.currentUserId;
    
    // Load exam card when tab is opened
    await loadExamCard();
}

// Main function to load exam card
async function loadExamCard() {
    const container = document.getElementById('exam-card-content');
    if (!container) return;
    
    container.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>Loading exam card...</p></div>';
    
    try {
        // Get student profile
        const { data: student, error: studentError } = await window.supabase
            .from('consolidated_user_profiles_table')
            .select('*')
            .eq('user_id', currentExamCardStudentId)
            .single();
        
        if (studentError) throw studentError;
        
        // Get fee status for eligibility
        const block = student.block || 'Introductory';
        const { data: feeConfig, error: feeError } = await window.supabase
            .from('fee_structure')
            .select('amount')
            .eq('program', student.program)
            .eq('block', block)
            .single();
        
        const totalDue = feeConfig ? feeConfig.amount : 0;
        
        const { data: payments } = await window.supabase
            .from('fee_payments')
            .select('amount')
            .eq('student_id', currentExamCardStudentId);
        
        const totalPaid = payments ? payments.reduce((sum, p) => sum + parseFloat(p.amount), 0) : 0;
        const outstanding = totalDue - totalPaid;
        const isFeeCleared = outstanding <= 0;
        
        // IMPORTANT: Get ONLY APPROVED registered units
        const { data: registrations, error: regError } = await window.supabase
            .from('student_unit_registrations')
            .select('*')
            .eq('student_id', currentExamCardStudentId)
            .eq('status', 'approved')  // ONLY approved units
            .order('unit_code', { ascending: true });
        
        if (regError) throw regError;
        
        const approvedUnits = registrations || [];
        const hasApprovedUnits = approvedUnits.length > 0;
        
        // Determine exam eligibility (fee cleared AND has approved units)
        const isEligible = isFeeCleared && hasApprovedUnits;
        
        // Generate exam card HTML
        const examCardHTML = generateExamCardHTML(student, approvedUnits, isEligible, outstanding);
        container.innerHTML = examCardHTML;
        
        // Add print functionality
        const printBtn = document.getElementById('print-exam-card');
        if (printBtn) {
            printBtn.addEventListener('click', () => printExamCard());
        }
        
    } catch (error) {
        console.error('Error loading exam card:', error);
        container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Error Loading Exam Card</h3><p>' + error.message + '</p></div>';
    }
}

// Generate Exam Card HTML with ONLY approved units
function generateExamCardHTML(student, approvedUnits, isEligible, outstanding) {
    const currentDate = new Date().toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const examPeriod = getExamPeriod();
    const eligibilityStatus = isEligible ? 'ELIGIBLE' : 'NOT ELIGIBLE';
    const eligibilityClass = isEligible ? 'eligible' : 'not-eligible';
    
    let eligibilityMessage = '';
    if (!isEligible) {
        if (outstanding > 0 && approvedUnits.length === 0) {
            eligibilityMessage = `❌ Fee balance of KES ${outstanding.toLocaleString()} outstanding AND no approved units. Please clear fees and register units.`;
        } else if (outstanding > 0) {
            eligibilityMessage = `❌ Fee balance of KES ${outstanding.toLocaleString()} outstanding. Please clear fees to be eligible for exams.`;
        } else if (approvedUnits.length === 0) {
            eligibilityMessage = `❌ No approved unit registrations found. Please register units through the Learning Hub and wait for admin approval.`;
        }
    } else {
        eligibilityMessage = `✅ You are cleared to sit for examinations. You have ${approvedUnits.length} approved unit(s).`;
    }
    
    // Count units by type
    const coreUnits = approvedUnits.filter(u => u.unit_type === 'Core' || u.reg_type === 'Core');
    const electiveUnits = approvedUnits.filter(u => u.unit_type === 'Elective' || u.reg_type === 'Elective');
    
    return `
        <div class="exam-card-template" id="exam-card-print">
            <div class="exam-card-header">
                <h2>NAKURU COLLEGE OF HEALTH SCIENCES AND MANAGEMENT</h2>
                <p>EXAMINATION CARD - ${examPeriod}</p>
                <div class="eligibility-badge ${eligibilityClass}">${eligibilityStatus}</div>
            </div>
            
            <div class="exam-card-body">
                <div class="exam-info-grid">
                    <div class="exam-info-item">
                        <label>Student Name:</label>
                        <div class="value">${escapeHtml(student.full_name || 'N/A')}</div>
                    </div>
                    <div class="exam-info-item">
                        <label>Student ID:</label>
                        <div class="value">${student.student_id || student.user_id?.substring(0, 8) || 'N/A'}</div>
                    </div>
                    <div class="exam-info-item">
                        <label>Program:</label>
                        <div class="value">${escapeHtml(student.program || 'N/A')}</div>
                    </div>
                    <div class="exam-info-item">
                        <label>Intake Year:</label>
                        <div class="value">${student.intake_year || 'N/A'}</div>
                    </div>
                    <div class="exam-info-item">
                        <label>Current Block/Term:</label>
                        <div class="value">${student.block || 'Introductory'}</div>
                    </div>
                    <div class="exam-info-item">
                        <label>Fee Status:</label>
                        <div class="value ${outstanding <= 0 ? 'fee-cleared' : 'fee-pending'}">
                            ${outstanding <= 0 ? 'CLEARED ✅' : `PENDING (KES ${outstanding.toLocaleString()})`}
                        </div>
                    </div>
                    <div class="exam-info-item">
                        <label>Approved Units:</label>
                        <div class="value">${approvedUnits.length} unit(s)</div>
                    </div>
                    <div class="exam-info-item">
                        <label>Card Issued:</label>
                        <div class="value">${currentDate}</div>
                    </div>
                </div>
                
                <div class="status-message ${eligibilityClass}">
                    <i class="fas ${isEligible ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i>
                    <p>${eligibilityMessage}</p>
                </div>
                
                ${approvedUnits.length > 0 ? `
                    <h4>📋 Approved Units for Examination</h4>
                    <p class="unit-count-info">You have been approved to sit for the following ${approvedUnits.length} unit(s):</p>
                    <div class="table-responsive">
                        <table class="registered-units-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Unit Code</th>
                                    <th>Unit Name</th>
                                    <th>Block</th>
                                    <th>Registration Type</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${approvedUnits.map((unit, index) => `
                                    <tr>
                                        <td>${index + 1}</td>
                                        <td><strong>${escapeHtml(unit.unit_code)}</strong></td>
                                        <td>${escapeHtml(unit.unit_name)}</td>
                                        <td>${escapeHtml(unit.block || student.block || 'N/A')}</td>
                                        <td>${unit.reg_type || 'Normal'}</td>
                                        <td><span class="status-approved">✓ Approved</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="unit-summary">
                        <div class="summary-badge">
                            <span class="summary-label">Total Units:</span>
                            <span class="summary-value">${approvedUnits.length}</span>
                        </div>
                        ${coreUnits.length > 0 ? `
                            <div class="summary-badge">
                                <span class="summary-label">Core Units:</span>
                                <span class="summary-value">${coreUnits.length}</span>
                            </div>
                        ` : ''}
                        ${electiveUnits.length > 0 ? `
                            <div class="summary-badge">
                                <span class="summary-label">Elective Units:</span>
                                <span class="summary-value">${electiveUnits.length}</span>
                            </div>
                        ` : ''}
                    </div>
                ` : `
                    <div class="no-units-warning">
                        <i class="fas fa-exclamation-circle"></i>
                        <h4>No Approved Units</h4>
                        <p>You don't have any approved unit registrations. Please:</p>
                        <ol>
                            <li>Go to <strong>My Learning Hub</strong> tab</li>
                            <li>Select units you wish to register for</li>
                            <li>Submit your registration for admin approval</li>
                            <li>Wait for approval confirmation</li>
                        </ol>
                        <button onclick="window.ui.showTab('learning-hub')" class="btn-primary">
                            <i class="fas fa-book"></i> Go to Learning Hub
                        </button>
                    </div>
                `}
                
                <div class="exam-card-footer">
                    <div class="signature-section">
                        <div class="signature-line">
                            <span>_____________________</span>
                            <p>Registrar's Signature</p>
                        </div>
                        <div class="signature-line">
                            <span>_____________________</span>
                            <p>Dean of Academics</p>
                        </div>
                        <div class="stamp">
                            <div class="stamp-text">OFFICIAL STAMP</div>
                        </div>
                    </div>
                    <div class="exam-rules">
                        <h5>📌 Examination Rules:</h5>
                        <ul>
                            <li>This card must be presented at each examination venue</li>
                            <li>Students without valid exam card will not be allowed to sit for exams</li>
                            <li>Keep this card safe throughout the examination period</li>
                            <li>No electronic devices allowed in examination halls</li>
                            <li>Arrive at least 30 minutes before scheduled exam time</li>
                            <li>Carry your student ID card alongside this exam card</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
        <div style="text-align: center; margin-top: 20px;">
            <button id="print-exam-card" class="print-btn" ${!isEligible ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
                <i class="fas fa-print"></i> ${isEligible ? 'Print Exam Card' : 'Exam Card Unavailable - ' + (outstanding > 0 ? 'Clear Fees First' : 'No Approved Units')}
            </button>
        </div>
    `;
}

// Get current exam period
function getExamPeriod() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    if (month >= 0 && month <= 3) return `March - April ${year} (Trimester 1)`;
    if (month >= 4 && month <= 7) return `July - August ${year} (Trimester 2)`;
    return `November - December ${year} (Trimester 3)`;
}

// Print exam card
function printExamCard() {
    const printContent = document.getElementById('exam-card-print');
    if (!printContent) return;
    
    const originalTitle = document.title;
    document.title = 'NCHSM Exam Card';
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>NCHSM Exam Card</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
                    margin: 0;
                    padding: 20px;
                    background: white;
                }
                .exam-card-template {
                    max-width: 900px;
                    margin: 0 auto;
                    border: 2px solid #4C1D95;
                    border-radius: 12px;
                    overflow: hidden;
                    background: white;
                }
                .exam-card-header {
                    background: linear-gradient(135deg, #4C1D95, #7c3aed);
                    color: white;
                    padding: 25px;
                    text-align: center;
                }
                .exam-card-header h2 {
                    margin: 0 0 5px;
                    font-size: 20px;
                    letter-spacing: 1px;
                }
                .exam-card-header p {
                    margin: 5px 0;
                    font-size: 14px;
                    opacity: 0.9;
                }
                .eligibility-badge {
                    display: inline-block;
                    padding: 6px 20px;
                    border-radius: 30px;
                    margin-top: 12px;
                    font-weight: bold;
                    font-size: 14px;
                }
                .eligibility-badge.eligible {
                    background: #059669;
                }
                .eligibility-badge.not-eligible {
                    background: #dc2626;
                }
                .exam-card-body {
                    padding: 25px;
                }
                .exam-info-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 15px;
                    margin-bottom: 25px;
                    background: #f8f9fa;
                    padding: 15px;
                    border-radius: 10px;
                }
                .exam-info-item label {
                    font-size: 11px;
                    color: #6b7280;
                    display: block;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .exam-info-item .value {
                    font-size: 14px;
                    font-weight: 600;
                    color: #1f2937;
                    margin-top: 3px;
                }
                .status-message {
                    padding: 15px;
                    border-radius: 10px;
                    margin-bottom: 25px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .status-message i {
                    font-size: 24px;
                }
                .status-message.eligible {
                    background: #d1fae5;
                    color: #059669;
                }
                .status-message.not-eligible {
                    background: #fee2e2;
                    color: #dc2626;
                }
                .status-message p {
                    margin: 0;
                    font-size: 14px;
                }
                h4 {
                    color: #4C1D95;
                    margin: 0 0 10px 0;
                    font-size: 16px;
                }
                .unit-count-info {
                    font-size: 13px;
                    color: #6b7280;
                    margin-bottom: 15px;
                }
                .registered-units-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                    margin-bottom: 20px;
                }
                .registered-units-table th,
                .registered-units-table td {
                    padding: 10px 8px;
                    text-align: left;
                    border-bottom: 1px solid #e5e7eb;
                    font-size: 13px;
                }
                .registered-units-table th {
                    background: #f9fafb;
                    font-weight: 600;
                    color: #374151;
                }
                .status-approved {
                    color: #059669;
                    font-weight: 500;
                }
                .unit-summary {
                    display: flex;
                    gap: 15px;
                    margin-bottom: 25px;
                    flex-wrap: wrap;
                }
                .summary-badge {
                    background: #f3f4f6;
                    padding: 8px 16px;
                    border-radius: 20px;
                    font-size: 13px;
                }
                .summary-label {
                    color: #6b7280;
                }
                .summary-value {
                    font-weight: bold;
                    color: #4C1D95;
                    margin-left: 5px;
                }
                .no-units-warning {
                    text-align: center;
                    padding: 30px;
                    background: #fffbeb;
                    border-radius: 10px;
                    margin-bottom: 20px;
                }
                .no-units-warning i {
                    font-size: 48px;
                    color: #f59e0b;
                    margin-bottom: 15px;
                }
                .no-units-warning h4 {
                    color: #d97706;
                    margin-bottom: 10px;
                }
                .no-units-warning ol {
                    text-align: left;
                    max-width: 400px;
                    margin: 15px auto;
                    color: #6b7280;
                }
                .btn-primary {
                    background: #4C1D95;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 14px;
                }
                .exam-card-footer {
                    margin-top: 25px;
                    padding-top: 20px;
                    border-top: 1px solid #e5e7eb;
                }
                .signature-section {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 25px;
                    flex-wrap: wrap;
                    gap: 15px;
                }
                .signature-line {
                    text-align: center;
                    min-width: 150px;
                }
                .signature-line span {
                    display: inline-block;
                    width: 160px;
                    border-top: 1px solid #000;
                    margin-bottom: 8px;
                }
                .signature-line p {
                    margin: 5px 0;
                    font-size: 11px;
                    color: #6b7280;
                }
                .stamp {
                    text-align: center;
                }
                .stamp-text {
                    border: 2px solid #4C1D95;
                    padding: 5px 12px;
                    border-radius: 6px;
                    font-size: 10px;
                    color: #4C1D95;
                    font-weight: bold;
                }
                .exam-rules {
                    background: #f8f9fa;
                    padding: 15px;
                    border-radius: 10px;
                }
                .exam-rules h5 {
                    margin: 0 0 10px 0;
                    font-size: 13px;
                    color: #374151;
                }
                .exam-rules ul {
                    margin: 0;
                    padding-left: 20px;
                }
                .exam-rules li {
                    font-size: 11px;
                    margin-bottom: 5px;
                    color: #6b7280;
                }
                .fee-cleared {
                    color: #059669;
                }
                .fee-pending {
                    color: #dc2626;
                }
                .print-btn {
                    background: #4C1D95;
                    color: white;
                    border: none;
                    padding: 12px 30px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                }
                @media print {
                    body {
                        padding: 0;
                    }
                    .print-btn {
                        display: none;
                    }
                    .exam-card-template {
                        border: 1px solid #ddd;
                        box-shadow: none;
                    }
                    .no-units-warning button {
                        display: none;
                    }
                }
            </style>
        </head>
        <body>
            ${printContent.outerHTML}
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() { window.close(); }, 500);
                }
            <\/script>
        </body>
        </html>
    `);
    printWindow.document.close();
    
    document.title = originalTitle;
}

// Escape HTML helper
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Export functions for global access
window.initExamCard = initExamCard;
window.loadExamCard = loadExamCard;
window.printExamCard = printExamCard;
