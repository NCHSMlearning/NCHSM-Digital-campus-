// js/exam-card.js - Fixed to work with your existing table structure

(function() {
    'use strict';
    
    console.log('📇 Exam Card module loading...');
    
    class ExamCardModule {
        constructor() {
            this.approvedUnits = [];
            this.userProfile = null;
            this.loaded = false;
            this.userBlock = null;
            this.userId = null;
            this.isLoading = false;
            
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.cacheElements());
            } else {
                this.cacheElements();
            }
            
            this.setupEventListeners();
            setTimeout(() => this.tryLoadIfLoggedIn(), 500);
        }
        
        cacheElements() {
            this.examCardContent = document.getElementById('exam-card-content-standalone');
            this.dashboardExamStatus = document.getElementById('dashboard-exam-status');
            this.dashboardApprovedUnits = document.getElementById('dashboard-approved-units');
            
            console.log('📇 Elements cached:', {
                examCardContent: !!this.examCardContent,
                dashboardExamStatus: !!this.dashboardExamStatus,
                dashboardApprovedUnits: !!this.dashboardApprovedUnits
            });
        }
        
        setupEventListeners() {
            document.addEventListener('appReady', () => {
                console.log('📇 appReady received');
                this.tryLoadIfLoggedIn();
            });
            
            document.addEventListener('profileLoaded', (e) => {
                if (e.detail?.profile) {
                    this.userProfile = e.detail.profile;
                    this.updateUserData();
                    this.loadExamCard();
                }
            });
            
            // Listen for unit registration changes
            document.addEventListener('unitRegistrationReady', () => {
                console.log('📇 Unit registration updated, reloading exam card');
                this.loadExamCard();
            });
            
            document.querySelectorAll('[data-tab="hub-exam-card"]').forEach(link => {
                link.addEventListener('click', () => {
                    console.log('📇 Exam card tab clicked');
                    setTimeout(() => this.loadExamCard(), 100);
                });
            });
        }
        
        tryLoadIfLoggedIn() {
            const profile = this.getUserProfileFromSources();
            if (profile) {
                this.userProfile = profile;
                this.updateUserData();
                this.loadExamCard();
            } else if (this.examCardContent && !this.loaded) {
                this.showNoSession();
            }
        }
        
        getUserProfileFromSources() {
            const sources = [
                () => window.db?.currentUserProfile,
                () => window.currentUserProfile,
                () => window.databaseModule?.currentUserProfile,
                () => window.app?.user,
                () => {
                    try {
                        const data = localStorage.getItem('userProfile');
                        return data ? JSON.parse(data) : null;
                    } catch (e) { return null; }
                },
                () => {
                    try {
                        const data = localStorage.getItem('nchsm_user');
                        return data ? JSON.parse(data) : null;
                    } catch (e) { return null; }
                }
            ];
            
            for (const source of sources) {
                try {
                    const profile = source();
                    if (profile && (profile.id || profile.user_id || profile.student_id)) {
                        return profile;
                    }
                } catch (e) {}
            }
            return null;
        }
        
        updateUserData() {
            if (this.userProfile) {
                this.userId = this.userProfile.user_id || this.userProfile.id || this.userProfile.student_id;
                this.userBlock = this.userProfile.block || this.userProfile.current_block || this.userProfile.term;
                console.log('📇 User data updated:', { userId: this.userId, block: this.userBlock });
                return true;
            }
            return false;
        }
        
        async loadExamCard() {
            if (this.isLoading) {
                console.log('📇 Already loading, skipping');
                return;
            }
            
            if (!this.userProfile || !this.userId) {
                const profile = this.getUserProfileFromSources();
                if (profile) {
                    this.userProfile = profile;
                    this.updateUserData();
                } else {
                    this.showNoSession();
                    return;
                }
            }
            
            this.isLoading = true;
            this.showLoading();
            
            try {
                const success = await this.loadApprovedUnitsFromDB();
                
                if (success) {
                    await this.updateDashboard();
                    this.displayExamCard();
                    this.loaded = true;
                } else {
                    this.showError('Unable to load approved units. Please ensure you have registered units.');
                }
            } catch (error) {
                console.error('📇 Error loading exam card:', error);
                this.showError(error.message || 'Failed to load exam card data');
            } finally {
                this.isLoading = false;
            }
        }
        
        async loadApprovedUnitsFromDB() {
            const supabase = window.db?.supabase || window.supabase;
            
            if (!supabase) {
                console.error('📇 Supabase not available');
                return false;
            }
            
            try {
                // First, get the student's ID from the users table if needed
                let studentId = this.userId;
                
                // Try to find by student_id field first (from users table)
                let { data: userData, error: userError } = await supabase
                    .from('consolidated_user_profiles_table')
                    .select('id')
                    .eq('student_id', this.userProfile?.student_id)
                    .maybeSingle();
                
                if (userError) {
                    console.log('📇 User lookup error:', userError);
                }
                
                const actualUserId = userData?.id || studentId;
                
                console.log('📇 Looking for approved units with student_id:', actualUserId);
                
                // Query approved unit registrations - using the same fields as unit-registration.js
                const { data, error } = await supabase
                    .from('student_unit_registrations')
                    .select('*')
                    .eq('student_id', actualUserId)
                    .eq('status', 'approved');
                
                if (error) {
                    console.error('📇 Database error:', error);
                    return false;
                }
                
                this.approvedUnits = data || [];
                console.log('📇 Loaded', this.approvedUnits.length, 'approved units');
                
                // Log the first unit to see its structure
                if (this.approvedUnits.length > 0) {
                    console.log('📇 Sample approved unit:', this.approvedUnits[0]);
                }
                
                return true;
                
            } catch (error) {
                console.error('📇 Exception loading units:', error);
                return false;
            }
        }
        
        async updateDashboard() {
            const approvedCount = this.approvedUnits.length;
            const isEligible = approvedCount > 0;
            
            if (this.dashboardExamStatus) {
                this.dashboardExamStatus.textContent = isEligible ? 'ELIGIBLE' : 'NOT ELIGIBLE';
            }
            if (this.dashboardApprovedUnits) {
                this.dashboardApprovedUnits.textContent = approvedCount;
            }
        }
        
        displayExamCard() {
            if (!this.examCardContent) return;
            
            const student = this.userProfile;
            const approvedUnits = this.approvedUnits;
            const isEligible = approvedUnits.length > 0;
            const currentDate = new Date().toLocaleDateString('en-KE', {
                year: 'numeric', month: 'long', day: 'numeric'
            });
            const examPeriod = this.getExamPeriod();
            const currentBlock = this.userBlock || student?.block || 'Current Block';
            
            const logoUrl = 'https://raw.githubusercontent.com/NCHSMlearning/e-learning/main/images/Logo_NCHSM.png';
            
            let html = `
                <div class="exam-card-container" id="exam-card-print">
                    <div class="exam-card">
                        <div class="exam-card-header">
                            <div class="logo-area">
                                <img src="${logoUrl}" alt="NCHSM Logo" class="exam-logo" onerror="this.style.display='none'">
                            </div>
                            <div class="header-text">
                                <h2>NAKURU COLLEGE OF HEALTH SCIENCES AND MANAGEMENT</h2>
                                <p class="exam-title">EXAMINATION CARD</p>
                                <p class="exam-period">${examPeriod}</p>
                            </div>
                            <div class="badge-area">
                                <span class="block-badge">${this.escapeHtml(currentBlock)}</span>
                                <span class="eligibility-badge ${isEligible ? 'eligible' : 'ineligible'}">
                                    ${isEligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}
                                </span>
                            </div>
                        </div>
                        
                        <div class="exam-card-body">
                            <div class="student-info-grid">
                                <div class="info-row">
                                    <div class="info-field"><label>Student Name:</label><span class="field-value">${this.escapeHtml(student?.full_name || 'Not Available')}</span></div>
                                    <div class="info-field"><label>Student ID:</label><span class="field-value">${this.escapeHtml(student?.student_id || 'N/A')}</span></div>
                                </div>
                                <div class="info-row">
                                    <div class="info-field"><label>Program:</label><span class="field-value">${this.escapeHtml(student?.program || 'KRCHN')}</span></div>
                                    <div class="info-field"><label>Intake Year:</label><span class="field-value">${student?.intake_year || 'N/A'}</span></div>
                                </div>
                                <div class="info-row">
                                    <div class="info-field"><label>Current Block:</label><span class="field-value"><strong>${this.escapeHtml(currentBlock)}</strong></span></div>
                                    <div class="info-field"><label>Approved Units:</label><span class="field-value">${approvedUnits.length}</span></div>
                                </div>
                                <div class="info-row">
                                    <div class="info-field"><label>Card Issued:</label><span class="field-value">${currentDate}</span></div>
                                    <div class="info-field"><label>Status:</label><span class="field-value ${isEligible ? 'status-eligible' : 'status-ineligible'}">${isEligible ? 'Cleared' : 'Pending Registration'}</span></div>
                                </div>
                            </div>
                            
                            <div class="status-message ${isEligible ? 'msg-success' : 'msg-warning'}">
                                <i class="fas ${isEligible ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i>
                                <p>${isEligible ? `You are cleared to sit for the ${currentBlock} examinations. You have ${approvedUnits.length} approved unit(s).` : 'No approved units found. Please complete unit registration through the Learning Hub.'}</p>
                            </div>
            `;
            
            if (approvedUnits.length > 0) {
                html += `
                    <div class="units-section">
                        <h4>Approved Examination Units</h4>
                        <p class="instruction-note"><i class="fas fa-info-circle"></i> Present this card to each lecturer BEFORE the exam for signature verification.</p>
                        <div class="table-wrapper">
                            <table class="units-table">
                                <thead>
                                    <tr>
                                        <th width="5%">#</th>
                                        <th width="20%">Unit Code</th>
                                        <th width="35%">Unit Name</th>
                                        <th width="8%">Credits</th>
                                        <th width="17%">Lecturer's Signature</th>
                                        <th width="15%">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                `;
                
                approvedUnits.forEach((unit, index) => {
                    const unitName = this.escapeHtml(unit.unit_name || '');
                    const unitCode = this.escapeHtml(unit.unit_code || '');
                    const credits = unit.credits || 3;
                    
                    html += `
                        <tr>
                            <td class="text-center">${index + 1}</td>
                            <td><strong>${unitCode}</strong></td>
                            <td>${unitName}</td>
                            <td class="text-center">${credits}</td>
                            <td class="signature-cell"><span class="signature-line">_________________</span></td>
                            <td class="date-cell"><span class="date-line">___________</span></td>
                        </tr>
                    `;
                });
                
                const totalCredits = approvedUnits.reduce((sum, u) => sum + (parseInt(u.credits) || 3), 0);
                
                html += `
                                </tbody>
                            </table>
                        </div>
                        <div class="units-summary">
                            <span class="summary-badge">Total Units: ${approvedUnits.length}</span>
                            <span class="summary-badge">Total Credits: ${totalCredits}</span>
                        </div>
                    </div>
                `;
            } else {
                html += `
                    <div class="empty-units">
                        <i class="fas fa-book-open"></i>
                        <h4>No Approved Units</h4>
                        <p>You have not registered for any units or your registration is pending approval.</p>
                        <button class="btn-register" data-tab="hub-register">Go to Unit Registration</button>
                    </div>
                `;
            }
            
            html += `
                        <div class="signatures-section">
                            <div class="signature-item">
                                <div class="signature-placeholder">_________________________</div>
                                <p class="signature-label">Finance Officer</p>
                                <small>(Fee Clearance)</small>
                            </div>
                            <div class="signature-item">
                                <div class="signature-placeholder">_________________________</div>
                                <p class="signature-label">HOD - Nursing</p>
                                <small>(Head of Department)</small>
                            </div>
                            <div class="official-stamp">
                                <div class="stamp">OFFICIAL STAMP</div>
                            </div>
                        </div>
                        
                        <div class="declaration-section">
                            <h5>Candidate's Declaration</h5>
                            <p>I confirm that I have obtained the necessary signatures and will abide by all examination rules and regulations.</p>
                            <div class="student-signature">
                                <div class="signature-placeholder">_________________________</div>
                                <p class="signature-label">Student's Signature & Date</p>
                            </div>
                        </div>
                        
                        <div class="exam-rules">
                            <h5><i class="fas fa-gavel"></i> Examination Rules & Regulations</h5>
                            <ul>
                                <li><i class="fas fa-check-circle"></i> Present this card to each lecturer BEFORE the exam for signature</li>
                                <li><i class="fas fa-check-circle"></i> Must be verified by Finance Officer and HOD Nursing</li>
                                <li><i class="fas fa-check-circle"></i> Must be presented at each examination venue</li>
                                <li><i class="fas fa-check-circle"></i> No electronic devices allowed in examination halls</li>
                                <li><i class="fas fa-check-circle"></i> Arrive at least 30 minutes before scheduled exam time</li>
                                <li><i class="fas fa-check-circle"></i> Impersonation leads to automatic disqualification</li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div class="print-action">
                    <button id="print-exam-card-btn" class="btn-print" ${!isEligible ? 'disabled' : ''}>
                        <i class="fas fa-print"></i> Print Exam Card
                    </button>
                </div>
            `;
            
            this.examCardContent.innerHTML = html;
            
            const printBtn = document.getElementById('print-exam-card-btn');
            if (printBtn && isEligible) {
                const newBtn = printBtn.cloneNode(true);
                printBtn.parentNode.replaceChild(newBtn, printBtn);
                newBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.printExamCard();
                });
            }
            
            const registerBtn = this.examCardContent.querySelector('.btn-register');
            if (registerBtn) {
                registerBtn.addEventListener('click', () => {
                    if (window.showTab) window.showTab('hub-register');
                });
            }
        }
        
        getExamPeriod() {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth();
            
            if (month >= 2 && month <= 5) {
                return `March - June ${year} (Trimester 1)`;
            } else if (month >= 6 && month <= 9) {
                return `July - October ${year} (Trimester 2)`;
            } else {
                if (month === 0 || month === 1) {
                    return `November ${year - 1} - February ${year} (Trimester 3)`;
                }
                return `November - February ${year}/${year + 1} (Trimester 3)`;
            }
        }
        
        printExamCard() {
            const printContent = document.getElementById('exam-card-print');
            if (!printContent) return;
            
            const printWindow = window.open('', '_blank');
            
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>NCHSM Exam Card - ${this.userProfile?.full_name || 'Student'}</title>
                    <meta charset="UTF-8">
                    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { font-family: 'Inter', sans-serif; background: white; padding: 20px; }
                        .exam-card-container { max-width: 1000px; margin: 0 auto; }
                        .exam-card { border: 2px solid #4C1D95; border-radius: 12px; overflow: hidden; }
                        .exam-card-header { background: linear-gradient(135deg, #4C1D95, #7c3aed); color: white; padding: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; }
                        .logo-area img { height: 60px; width: auto; }
                        .header-text { text-align: center; }
                        .header-text h2 { font-size: 18px; margin-bottom: 5px; }
                        .badge-area .block-badge, .badge-area .eligibility-badge { padding: 4px 12px; border-radius: 20px; font-size: 12px; margin-left: 10px; }
                        .eligibility-badge.eligible { background: #10b981; }
                        .eligibility-badge.ineligible { background: #ef4444; }
                        .exam-card-body { padding: 20px; }
                        .student-info-grid { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
                        .info-row { display: flex; gap: 20px; margin-bottom: 10px; }
                        .info-field { flex: 1; }
                        .info-field label { font-size: 11px; color: #6b7280; display: block; }
                        .info-field .field-value { font-size: 14px; font-weight: 600; }
                        .status-message { padding: 12px; border-radius: 8px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
                        .status-message.msg-success { background: #d1fae5; color: #065f46; }
                        .status-message.msg-warning { background: #fed7aa; color: #92400e; }
                        .units-table { width: 100%; border-collapse: collapse; font-size: 12px; }
                        .units-table th, .units-table td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
                        .units-table th { background: #f3f4f6; font-weight: 600; }
                        .signature-cell, .date-cell { text-align: center; }
                        .signature-line, .date-line { font-family: monospace; letter-spacing: 1px; }
                        .signatures-section { display: flex; justify-content: space-between; margin: 20px 0; padding-top: 15px; border-top: 1px solid #e5e7eb; }
                        .signature-item { text-align: center; }
                        .signature-placeholder { width: 180px; border-top: 1px solid #000; margin-bottom: 5px; }
                        .official-stamp .stamp { border: 1px solid #4C1D95; padding: 5px 12px; border-radius: 4px; font-size: 10px; color: #4C1D95; }
                        .declaration-section { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0; }
                        .student-signature { text-align: right; margin-top: 10px; }
                        .exam-rules { background: #f8f9fa; padding: 15px; border-radius: 8px; font-size: 11px; }
                        .exam-rules ul { padding-left: 20px; margin-top: 8px; }
                        .exam-rules li { margin-bottom: 4px; }
                        .print-action { text-align: center; margin-top: 15px; }
                        .btn-print { background: #4C1D95; color: white; border: none; padding: 10px 24px; border-radius: 6px; cursor: pointer; }
                        .btn-print:disabled { opacity: 0.5; cursor: not-allowed; }
                        @media print { .print-action { display: none; } body { padding: 0; } }
                    </style>
                </head>
                <body>${printContent.outerHTML}<script>window.onload=function(){setTimeout(function(){window.print();window.close();},300)};<\/script></body>
                </html>
            `);
            printWindow.document.close();
        }
        
        showLoading() {
            if (this.examCardContent) {
                this.examCardContent.innerHTML = `
                    <div class="loading-container">
                        <div class="loading-spinner"></div>
                        <p>Loading exam card...</p>
                    </div>
                `;
            }
        }
        
        showError(message) {
            if (this.examCardContent) {
                this.examCardContent.innerHTML = `
                    <div class="error-container">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>Unable to Load Exam Card</h3>
                        <p>${this.escapeHtml(message)}</p>
                        <button class="btn-retry" onclick="window.examCardModule?.loadExamCard()">Retry</button>
                    </div>
                `;
            }
        }
        
        showNoSession() {
            if (this.examCardContent && !this.loaded) {
                this.examCardContent.innerHTML = `
                    <div class="info-container">
                        <i class="fas fa-spinner fa-pulse"></i>
                        <h3>Waiting for Login</h3>
                        <p>Please log in to view your exam card.</p>
                    </div>
                `;
            }
        }
        
        escapeHtml(str) {
            if (!str) return '';
            return str.replace(/[&<>]/g, function(m) {
                if (m === '&') return '&amp;';
                if (m === '<') return '&lt;';
                if (m === '>') return '&gt;';
                return m;
            });
        }
        
        refresh() {
            console.log('📇 Manual refresh requested');
            this.loaded = false;
            this.loadExamCard();
        }
    }
    
    window.examCardModule = new ExamCardModule();
    window.loadExamCard = () => window.examCardModule?.loadExamCard();
    window.printExamCard = () => window.examCardModule?.printExamCard();
    window.refreshExamCard = () => window.examCardModule?.refresh();
    
    console.log('✅ Exam Card module ready');
})();
