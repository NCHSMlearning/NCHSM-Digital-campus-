// js/exam-card.js - Exam Card Module
// Displays ONLY approved registered units for the CURRENT semester/block

let examCardModule = {
    currentStudentId: null,
    supabase: null,
    currentBlock: null,
    currentIntakeYear: null,
    
    async init() {
        console.log('📇 Initializing Exam Card module...');
        
        this.supabase = window.supabase || window.db?.supabase;
        this.currentStudentId = window.currentUserId;
        
        if (!this.currentStudentId || !this.supabase) {
            console.error('Exam Card: Missing user ID or Supabase');
            return;
        }
        
        // Get current student's block and intake year
        await this.getCurrentStudentInfo();
        
        await this.loadExamCard();
        await this.updateDashboardExamCard();
    },
    
    async getCurrentStudentInfo() {
        try {
            const { data: student, error } = await this.supabase
                .from('consolidated_user_profiles_table')
                .select('block, intake_year, program, full_name, student_id')
                .eq('user_id', this.currentStudentId)
                .single();
            
            if (!error && student) {
                this.currentBlock = student.block;
                this.currentIntakeYear = student.intake_year;
                this.studentInfo = student;
                console.log(`📇 Current semester: Block ${this.currentBlock}, Intake: ${this.currentIntakeYear}`);
            }
        } catch (error) {
            console.error('Error getting student info:', error);
        }
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
            
            if (studentError) throw studentError;
            
            // IMPORTANT: Get ONLY APPROVED units for CURRENT BLOCK/TERM
            // Filter by: status = 'approved' AND block = current student block
            let query = this.supabase
                .from('student_unit_registrations')
                .select('*')
                .eq('student_id', this.currentStudentId)
                .eq('status', 'approved');
            
            // If student has a current block, filter by it
            if (student.block && student.block !== 'Unknown') {
                query = query.eq('block', student.block);
                console.log(`📇 Filtering units for current block: ${student.block}`);
            }
            
            const { data: registrations, error: regError } = await query
                .order('unit_code', { ascending: true });
            
            if (regError) throw regError;
            
            const approvedUnits = registrations || [];
            const hasApprovedUnits = approvedUnits.length > 0;
            
            // Determine exam eligibility (has approved units for current semester)
            const isEligible = hasApprovedUnits;
            
            // Generate exam card HTML
            const examCardHTML = this.generateExamCardHTML(student, approvedUnits, isEligible);
            container.innerHTML = examCardHTML;
            
            // Add print functionality
            const printBtn = document.getElementById('print-exam-card');
            if (printBtn) {
                printBtn.addEventListener('click', () => this.printExamCard());
            }
            
            console.log(`📇 Exam card loaded: ${approvedUnits.length} approved units for ${student.block}`);
            
        } catch (error) {
            console.error('Error loading exam card:', error);
            container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Error Loading Exam Card</h3><p>' + error.message + '</p></div>';
        }
    },
    
    async updateDashboardExamCard() {
        try {
            // Get student info first
            const { data: student } = await this.supabase
                .from('consolidated_user_profiles_table')
                .select('block')
                .eq('user_id', this.currentStudentId)
                .single();
            
            // Build query for current semester only
            let query = this.supabase
                .from('student_unit_registrations')
                .select('id')
                .eq('student_id', this.currentStudentId)
                .eq('status', 'approved');
            
            if (student && student.block && student.block !== 'Unknown') {
                query = query.eq('block', student.block);
            }
            
            const { data: registrations, error } = await query;
            
            const approvedCount = registrations?.length || 0;
            const isEligible = approvedCount > 0;
            
            const examStatusEl = document.getElementById('dashboard-exam-status');
            const approvedUnitsEl = document.getElementById('dashboard-approved-units');
            const currentSemesterEl = document.getElementById('dashboard-current-semester');
            
            if (examStatusEl) {
                examStatusEl.textContent = isEligible ? 'ELIGIBLE ✅' : 'NOT ELIGIBLE ❌';
                examStatusEl.style.color = isEligible ? '#059669' : '#dc2626';
            }
            
            if (approvedUnitsEl) {
                approvedUnitsEl.textContent = approvedCount;
            }
            
            if (currentSemesterEl && student) {
                currentSemesterEl.textContent = student.block || 'Not Assigned';
            }
            
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
        const currentSemester = student.block || 'Current Semester';
        const eligibilityStatus = isEligible ? 'ELIGIBLE' : 'NOT ELIGIBLE';
        const eligibilityClass = isEligible ? 'eligible' : 'not-eligible';
        
        let eligibilityMessage = '';
        if (!isEligible) {
            if (approvedUnits.length === 0) {
                eligibilityMessage = `❌ No approved unit registrations found for ${currentSemester}. Please register units through the Learning Hub and wait for admin approval.`;
            } else {
                eligibilityMessage = `⚠️ Please ensure all requirements are met before exams.`;
            }
        } else {
            eligibilityMessage = `✅ You are cleared to sit for ${currentSemester} examinations. You have ${approvedUnits.length} approved unit(s) for this semester.`;
        }
        
        // Count units by type for current semester only
        const coreUnits = approvedUnits.filter(u => u.unit_type === 'Core' || u.reg_type === 'Core');
        const electiveUnits = approvedUnits.filter(u => u.unit_type === 'Elective' || u.reg_type === 'Elective');
        
        return `
            <div class="exam-card-template" id="exam-card-print">
                <div class="exam-card-header">
                    <h2>NAKURU COLLEGE OF HEALTH SCIENCES AND MANAGEMENT</h2>
                    <p>EXAMINATION CARD - ${examPeriod}</p>
                    <div class="semester-badge">${currentSemester}</div>
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
                            <div class="value"><strong>${currentSemester}</strong></div>
                        </div>
                        <div class="exam-info-item">
                            <label>Approved Units:</label>
                            <div class="value">${approvedUnits.length} unit(s) for this semester</div>
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
                        <h4>📋 Approved Units for ${currentSemester} Examination</h4>
                        <p class="unit-count-info">You have been approved to sit for the following ${approvedUnits.length} unit(s) in ${currentSemester}:</p>
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
                                            <td>${this.escapeHtml(unit.block || currentSemester)}</td>
                                            <td>${unit.reg_type || 'Normal'}</td>
                                            <td><span class="status-approved">✓ Approved for ${currentSemester}</span></td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                        
                        <div class="unit-summary">
                            <div class="summary-badge">
                                <span class="summary-label">Total Units (${currentSemester}):</span>
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
                            <h4>No Approved Units for ${currentSemester}</h4>
                            <p>You don't have any approved unit registrations for the current semester (${currentSemester}). Please:</p>
                            <ol>
                                <li>Go to <strong>My Learning Hub</strong> tab</li>
                                <li>Select units for ${currentSemester}</li>
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
                                <li>This card is valid ONLY for ${currentSemester} examinations</li>
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
                    <i class="fas fa-print"></i> ${isEligible ? `Print Exam Card (${currentSemester})` : 'Exam Card Unavailable - No Approved Units for Current Semester'}
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
                <title>NCHSM Exam Card - ${this.currentBlock || 'Current Semester'}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Inter', Arial, sans-serif; padding: 20px; background: white; }
                    .exam-card-template { max-width: 900px; margin: 0 auto; border: 2px solid #4C1D95; border-radius: 12px; overflow: hidden; }
                    .exam-card-header { background: linear-gradient(135deg, #4C1D95, #7c3aed); color: white; padding: 25px; text-align: center; }
                    .exam-card-header h2 { font-size: 20px; margin-bottom: 5px; }
                    .semester-badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 12px; margin-top: 8px; }
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
