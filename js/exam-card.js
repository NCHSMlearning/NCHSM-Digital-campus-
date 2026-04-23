// js/exam-card.js - Exam Card Module
// Displays ONLY approved registered units where course status is ACTIVE

let examCardModule = {
    currentStudentId: null,
    supabase: null,
    
    async init() {
        console.log('📇 Initializing Exam Card module...');
        
        this.supabase = window.supabase || window.db?.supabase;
        this.currentStudentId = window.currentUserId;
        
        if (!this.currentStudentId || !this.supabase) {
            console.error('Exam Card: Missing user ID or Supabase');
            return;
        }
        
        await this.loadExamCard();
        await this.updateDashboardExamCard();
    },
    
    async loadExamCard() {
        const container = document.getElementById('exam-card-content');
        if (!container) return;
        
        container.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>Loading exam card...</p></div>';
        
        try {
            // Get student profile
            const { data: student, error: studentError } = await this.supabase
                .from('consolidated_user_profiles_table')
                .select('*')
                .eq('user_id', this.currentStudentId)
                .single();
            
            if (studentError) {
                console.error('Student fetch error:', studentError);
                throw studentError;
            }
            
            console.log('📇 Student found:', student.full_name);
            
            // STEP 1: Get ALL approved registrations first
            const { data: registrations, error: regError } = await this.supabase
                .from('student_unit_registrations')
                .select('*')
                .eq('student_id', this.currentStudentId)
                .eq('status', 'approved')
                .order('unit_code', { ascending: true });
            
            if (regError) {
                console.error('Registrations fetch error:', regError);
                throw regError;
            }
            
            console.log(`📇 Found ${registrations?.length || 0} approved registrations`);
            
            // STEP 2: Filter to only include units where course is ACTIVE
            let approvedUnits = [];
            
            if (registrations && registrations.length > 0) {
                // Get all course codes from registrations
                const unitCodes = registrations.map(r => r.unit_code);
                
                if (unitCodes.length > 0) {
                    // Query courses table to check which units are ACTIVE
                    const { data: activeCourses, error: courseError } = await this.supabase
                        .from('courses')
                        .select('unit_code, status')
                        .in('unit_code', unitCodes)
                        .eq('status', 'Active');
                    
                    if (courseError) {
                        console.error('Course fetch error:', courseError);
                        // If course query fails, still show registrations (fallback)
                        approvedUnits = registrations;
                    } else {
                        // Create set of active unit codes
                        const activeUnitCodes = new Set(activeCourses.map(c => c.unit_code));
                        console.log(`📇 Active courses found: ${activeUnitCodes.size}`);
                        
                        // Filter registrations to only active units
                        approvedUnits = registrations.filter(reg => activeUnitCodes.has(reg.unit_code));
                        
                        console.log(`📇 After filtering: ${approvedUnits.length} approved AND active units`);
                        
                        // Log which units were filtered out
                        const filteredOut = registrations.filter(reg => !activeUnitCodes.has(reg.unit_code));
                        if (filteredOut.length > 0) {
                            console.log('⚠️ Filtered out (inactive courses):', filteredOut.map(u => u.unit_code).join(', '));
                        }
                    }
                } else {
                    approvedUnits = registrations;
                }
            }
            
            const hasApprovedUnits = approvedUnits.length > 0;
            const isEligible = hasApprovedUnits;
            
            // Generate exam card HTML
            const examCardHTML = this.generateExamCardHTML(student, approvedUnits, isEligible);
            container.innerHTML = examCardHTML;
            
            // Add print functionality
            const printBtn = document.getElementById('print-exam-card');
            if (printBtn) {
                const newPrintBtn = printBtn.cloneNode(true);
                printBtn.parentNode.replaceChild(newPrintBtn, printBtn);
                newPrintBtn.addEventListener('click', () => this.printExamCard());
            }
            
            console.log(`📇 Exam card loaded: ${approvedUnits.length} approved & active units`);
            
        } catch (error) {
            console.error('Error loading exam card:', error);
            container.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Error Loading Exam Card</h3><p>${error.message}</p><button onclick="location.reload()" class="btn-primary">Retry</button></div>`;
        }
    },
    
    async updateDashboardExamCard() {
        try {
            // Get approved registrations
            const { data: registrations, error: regError } = await this.supabase
                .from('student_unit_registrations')
                .select('unit_code')
                .eq('student_id', this.currentStudentId)
                .eq('status', 'approved');
            
            if (regError) throw regError;
            
            let approvedCount = 0;
            
            if (registrations && registrations.length > 0) {
                // Check which units have active course status
                const unitCodes = registrations.map(r => r.unit_code);
                
                const { data: activeCourses, error: courseError } = await this.supabase
                    .from('courses')
                    .select('unit_code')
                    .in('unit_code', unitCodes)
                    .eq('status', 'Active');
                
                if (!courseError && activeCourses) {
                    approvedCount = activeCourses.length;
                } else {
                    approvedCount = registrations.length;
                }
            }
            
            const isEligible = approvedCount > 0;
            
            const examStatusEl = document.getElementById('dashboard-exam-status');
            const approvedUnitsEl = document.getElementById('dashboard-approved-units');
            
            if (examStatusEl) {
                examStatusEl.textContent = isEligible ? 'ELIGIBLE ✅' : 'NOT ELIGIBLE ❌';
                examStatusEl.style.color = isEligible ? '#059669' : '#dc2626';
            }
            
            if (approvedUnitsEl) {
                approvedUnitsEl.textContent = approvedCount;
            }
            
            console.log(`📇 Dashboard updated: ${approvedCount} approved & active units`);
            
        } catch (error) {
            console.error('Error updating dashboard exam card:', error);
        }
    },
    
    generateExamCardHTML(student, approvedUnits, isEligible) {
        const currentDate = new Date().toLocaleDateString('en-KE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        const examPeriod = this.getExamPeriod();
        const eligibilityStatus = isEligible ? 'ELIGIBLE' : 'NOT ELIGIBLE';
        const eligibilityClass = isEligible ? 'eligible' : 'not-eligible';
        
        let eligibilityMessage = '';
        if (!isEligible) {
            eligibilityMessage = `❌ No approved unit registrations found with active course status. Please register units through the Learning Hub and wait for admin approval.`;
        } else {
            eligibilityMessage = `✅ You are cleared to sit for examinations. You have ${approvedUnits.length} approved unit(s) with active course status.`;
        }
        
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
                            <div class="value">${this.escapeHtml(student.full_name || 'N/A')}</div>
                        </div>
                        <div class="exam-info-item">
                            <label>Student ID:</label>
                            <div class="value">${student.student_id || student.user_id?.substring(0, 8) || 'N/A'}</div>
                        </div>
                        <div class="exam-info-item">
                            <label>Program:</label>
                            <div class="value">${this.escapeHtml(student.program || 'N/A')}</div>
                        </div>
                        <div class="exam-info-item">
                            <label>Intake Year:</label>
                            <div class="value">${student.intake_year || 'N/A'}</div>
                        </div>
                        <div class="exam-info-item">
                            <label>Current Block/Term:</label>
                            <div class="value">${student.block || 'Not Assigned'}</div>
                        </div>
                        <div class="exam-info-item">
                            <label>Approved & Active Units:</label>
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
                        <h4>📋 Approved Units for Examination (Active Courses Only)</h4>
                        <p class="unit-count-info">You have been approved to sit for the following ${approvedUnits.length} unit(s) with active course status:</p>
                        <div class="table-responsive">
                            <table class="registered-units-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Unit Code</th>
                                        <th>Unit Name</th>
                                        <th>Block/Term</th>
                                        <th>Registration Type</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${approvedUnits.map((unit, index) => `
                                        <tr>
                                            <td>${index + 1}</td>
                                            <td><strong>${this.escapeHtml(unit.unit_code)}</strong></td>
                                            <td>${this.escapeHtml(unit.unit_name)}</td>
                                            <td>${this.escapeHtml(unit.block || 'N/A')}</td>
                                            <td>${unit.reg_type || 'Normal'}</td>
                                            <td><span class="status-approved">✓ Approved & Active</span></td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                        
                        <div class="unit-summary">
                            <div class="summary-badge">
                                <span class="summary-label">Total Eligible Units:</span>
                                <span class="summary-value">${approvedUnits.length}</span>
                            </div>
                        </div>
                    ` : `
                        <div class="no-units-warning">
                            <i class="fas fa-exclamation-circle"></i>
                            <h4>No Eligible Units</h4>
                            <p>You don't have any approved units with active course status. This could be because:</p>
                            <ol>
                                <li>Your registered units are pending approval</li>
                                <li>The courses are not currently active</li>
                                <li>You haven't registered for any units</li>
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
                                <li>This card is valid ONLY for units with active course status</li>
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
                    <i class="fas fa-print"></i> ${isEligible ? 'Print Exam Card' : 'Exam Card Unavailable - No Eligible Units'}
                </button>
            </div>
        `;
    },
    
    getExamPeriod() {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        
        if (month >= 0 && month <= 3) return `March - April ${year} (Trimester 1)`;
        if (month >= 4 && month <= 7) return `July - August ${year} (Trimester 2)`;
        return `November - December ${year} (Trimester 3)`;
    },
    
    printExamCard() {
        const printContent = document.getElementById('exam-card-print');
        if (!printContent) return;
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>NCHSM Exam Card</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Inter', Arial, sans-serif; padding: 20px; background: white; }
                    .exam-card-template { max-width: 900px; margin: 0 auto; border: 2px solid #4C1D95; border-radius: 12px; overflow: hidden; }
                    .exam-card-header { background: linear-gradient(135deg, #4C1D95, #7c3aed); color: white; padding: 25px; text-align: center; }
                    .exam-card-header h2 { font-size: 20px; margin-bottom: 5px; }
                    .eligibility-badge { display: inline-block; padding: 6px 20px; border-radius: 30px; margin-top: 12px; font-weight: bold; }
                    .eligibility-badge.eligible { background: #059669; }
                    .eligibility-badge.not-eligible { background: #dc2626; }
                    .exam-card-body { padding: 25px; }
                    .exam-info-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 15px; margin-bottom: 25px; background: #f8f9fa; padding: 15px; border-radius: 10px; }
                    .exam-info-item label { font-size: 11px; color: #6b7280; display: block; }
                    .exam-info-item .value { font-size: 14px; font-weight: 600; margin-top: 3px; }
                    .status-message { padding: 15px; border-radius: 10px; margin-bottom: 25px; display: flex; align-items: center; gap: 12px; }
                    .status-message.eligible { background: #d1fae5; color: #059669; }
                    .status-message.not-eligible { background: #fee2e2; color: #dc2626; }
                    .registered-units-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                    .registered-units-table th, .registered-units-table td { padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
                    .registered-units-table th { background: #f9fafb; }
                    .status-approved { color: #059669; }
                    .signature-section { display: flex; justify-content: space-between; margin-top: 25px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
                    .signature-line { text-align: center; }
                    .signature-line span { display: inline-block; width: 160px; border-top: 1px solid #000; margin-bottom: 8px; }
                    .stamp-text { border: 2px solid #4C1D95; padding: 5px 12px; border-radius: 6px; font-size: 10px; color: #4C1D95; font-weight: bold; }
                    .exam-rules { background: #f8f9fa; padding: 15px; border-radius: 10px; margin-top: 20px; }
                    .exam-rules ul { padding-left: 20px; }
                    @media print { body { padding: 0; } .print-btn { display: none; } }
                </style>
            </head>
            <body>${printContent.outerHTML}<script>window.onload=function(){window.print();setTimeout(function(){window.close();},500)}<\/script></body>
            </html>
        `);
        printWindow.document.close();
    },
    
    escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }
};

// Initialize when tab is shown
window.initExamCard = () => examCardModule.init();
window.examCardModule = examCardModule;
