// js/exam-card.js - Compact Exam Card Module

(function() {
    'use strict';
    
    console.log('📇 Exam Card module loading...');
    
    class ExamCardModule {
        constructor() {
            this.approvedUnits = [];
            this.userProfile = null;
            this.loaded = false;
            this.userBlock = null;
            
            this.cacheElements();
            this.setupEventListeners();
            setTimeout(() => this.tryLoadIfLoggedIn(), 1500);
        }
        
        cacheElements() {
            this.examCardContent = document.getElementById('exam-card-content');
            this.dashboardExamStatus = document.getElementById('dashboard-exam-status');
            this.dashboardApprovedUnits = document.getElementById('dashboard-approved-units');
        }
        
        setupEventListeners() {
            document.addEventListener('userLoggedIn', (e) => {
                this.userProfile = e.detail?.userProfile;
                this.updateUserData();
                this.loadExamCard();
            });
            document.addEventListener('appReady', () => this.tryLoadIfLoggedIn());
            document.addEventListener('unitRegistrationReady', () => {
                if (this.userProfile) this.loadExamCard();
            });
        }
        
        tryLoadIfLoggedIn() {
            const profile = this.getUserProfileFromAnySource();
            if (profile) {
                this.userProfile = profile;
                this.updateUserData();
                this.loadExamCard();
            } else {
                this.showWaitingForLogin();
            }
        }
        
        getUserProfileFromAnySource() {
            const sources = [
                () => window.db?.currentUserProfile,
                () => window.currentUserProfile,
                () => window.databaseModule?.currentUserProfile,
                () => {
                    try {
                        return JSON.parse(localStorage.getItem('userProfile'));
                    } catch (e) {
                        return null;
                    }
                }
            ];
            for (const source of sources) {
                try {
                    const profile = source();
                    if (profile && (profile.full_name || profile.email)) return profile;
                } catch (e) {}
            }
            return null;
        }
        
        updateUserData() {
            if (this.userProfile) {
                this.userBlock = this.userProfile.block || this.userProfile.term || 'Introductory';
                return true;
            }
            return false;
        }
        
        async loadExamCard() {
            if (!this.userProfile) {
                this.showWaitingForLogin();
                return;
            }
            this.showLoading();
            
            try {
                this.updateUserData();
                const supabase = window.db?.supabase;
                if (!supabase) throw new Error('Database connection not available');
                
                await this.loadApprovedUnits(supabase);
                await this.updateDashboard();
                this.loaded = true;
                this.displayExamCard();
            } catch (error) {
                console.error('Error loading exam card:', error);
                this.showError(error.message);
            }
        }
        
        async loadApprovedUnits(supabase) {
            const studentId = this.userProfile?.user_id || this.userProfile?.id;
            if (!studentId) {
                this.approvedUnits = [];
                return;
            }
            
            try {
                let query = supabase
                    .from('student_unit_registrations')
                    .select('*')
                    .eq('student_id', studentId)
                    .eq('status', 'approved');
                
                if (this.userBlock && this.userBlock !== 'Unknown') {
                    query = query.eq('block', this.userBlock);
                }
                
                const { data, error } = await query.order('unit_code', { ascending: true });
                if (error) throw error;
                this.approvedUnits = data || [];
            } catch (error) {
                console.error('Error loading approved units:', error);
                this.approvedUnits = [];
            }
        }
        
        async updateDashboard() {
            const approvedCount = this.approvedUnits.length;
            const isEligible = approvedCount > 0;
            
            if (this.dashboardExamStatus) {
                this.dashboardExamStatus.textContent = isEligible ? 'ELIGIBLE' : 'NOT ELIGIBLE';
                this.dashboardExamStatus.style.color = isEligible ? '#059669' : '#dc2626';
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
            const currentSemester = this.userBlock || 'Current Semester';
            const eligibilityClass = isEligible ? 'eligible' : 'not-eligible';
            
            const logoUrl = 'https://nakurucollegeofhealth.ac.ke/wp-content/uploads/elementor/thumbs/Logo_NCHSM-removebg-preview-rbgbmxl6t3pmf4d2oozt1o24i7v01gn3sjnh2ny6lk.png';
            
            let html = `
                <div class="exam-card-template" id="exam-card-print">
                    <div class="exam-card-header">
                        <div class="logo-wrapper"><img src="${logoUrl}" alt="Logo" class="exam-card-logo" onerror="this.style.display='none'"></div>
                        <h2>NAKURU COLLEGE OF HEALTH SCIENCES AND MANAGEMENT</h2>
                        <p>EXAMINATION CARD - ${examPeriod}</p>
                        <div><span class="semester-badge">${currentSemester}</span>
                        <span class="eligibility-badge ${eligibilityClass}">${isEligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}</span></div>
                    </div>
                    
                    <div class="exam-card-body">
                        <div class="exam-info-grid">
                            <div><label>Student Name:</label><div class="value">${this.escapeHtml(student.full_name || 'N/A')}</div></div>
                            <div><label>Student ID:</label><div class="value">${student.student_id || student.user_id?.substring(0, 8) || 'N/A'}</div></div>
                            <div><label>Program:</label><div class="value">${this.escapeHtml(student.program || 'N/A')}</div></div>
                            <div><label>Intake Year:</label><div class="value">${student.intake_year || 'N/A'}</div></div>
                            <div><label>Current Block:</label><div class="value"><strong>${currentSemester}</strong></div></div>
                            <div><label>Approved Units:</label><div class="value">${approvedUnits.length} unit(s)</div></div>
                            <div><label>Card Issued:</label><div class="value">${currentDate}</div></div>
                        </div>
                        
                        <div class="status-message ${eligibilityClass}">
                            <i class="fas ${isEligible ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i>
                            <p>${isEligible ? `You are cleared to sit for ${currentSemester} examinations. You have ${approvedUnits.length} approved unit(s).` : 'No approved units found. Please register units.'}</p>
                        </div>
            `;
            
            if (approvedUnits.length > 0) {
                html += `
                        <h4>Approved Units for ${currentSemester} Examination</h4>
                        <p class="unit-count-info"><strong>Instructions:</strong> Present this card to each lecturer BEFORE the exam for signature.</p>
                        <div class="table-responsive">
                            <table class="registered-units-table">
                                <thead><tr>
                                    <th width="5%">#</th>
                                    <th width="20%">Unit Code</th>
                                    <th width="35%">Unit Name</th>
                                    <th width="8%">Credits</th>
                                    <th width="17%">Lecturer's Signature</th>
                                    <th width="15%">Date</th>
                                </tr></thead>
                                <tbody>
                `;
                
                approvedUnits.forEach((unit, index) => {
                    let unitName = this.escapeHtml(unit.unit_name || '');
                    let unitCode = this.escapeHtml(unit.unit_code || '');
                    let credits = unit.credits || 3;
                    if (typeof credits === 'string') credits = credits.replace(/学分/g, '').trim();
                    
                    html += `<tr>
                        <td class="text-center">${index + 1}</td>
                        <td><strong>${unitCode}</strong></td>
                        <td>${unitName}</td>
                        <td class="text-center">${credits}</td>
                        <td class="signature-cell"><span class="signature-placeholder">_______________</span></td>
                        <td class="date-cell"><span class="date-placeholder">_________</span></td>
                    </tr>`;
                });
                
                html += `
                                </tbody>
                            </table>
                        </div>
                        
                        <div class="unit-summary">
                            <span class="summary-badge">Total Units: ${approvedUnits.length}</span>
                            <span class="summary-badge">Total Credits: ${approvedUnits.reduce((sum, u) => sum + (parseInt(u.credits) || 3), 0)}</span>
                        </div>
                `;
            } else {
                html += `<div class="no-units-warning"><i class="fas fa-exclamation-circle"></i><h4>No Approved Units</h4><p>Please register units through the Learning Hub.</p><button onclick="window.ui.showTab('learning-hub')" class="btn-primary">Go to Learning Hub</button></div>`;
            }
            
            html += `
                        <div class="signature-section">
                            <div class="signature-line"><span>_________________________</span><p>Finance Officer</p><small>(Fee Clearance)</small></div>
                            <div class="signature-line"><span>_________________________</span><p>HOD - Nursing</p><small>(Head of Department)</small></div>
                            <div class="stamp"><div class="stamp-text">OFFICIAL STAMP</div></div>
                        </div>
                        
                        <div class="declaration-section">
                            <h5>Candidate's Declaration</h5>
                            <p>I confirm that I have obtained the necessary signatures and will abide by all examination rules.</p>
                            <div class="student-signature-line"><span>_________________________</span><p>Student's Signature & Date</p></div>
                        </div>
                        
                        <div class="exam-rules">
                            <h5>Examination Rules:</h5>
                            <ul>
                                <li>Present this card to each lecturer BEFORE the exam for signature</li>
                                <li>Must be verified by Finance Officer and HOD Nursing</li>
                                <li>Must be presented at each examination venue</li>
                                <li>No electronic devices allowed in examination halls</li>
                                <li>Arrive at least 30 minutes before scheduled exam time</li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div style="text-align: center; margin-top: 15px;">
                    <button id="print-exam-card" class="print-btn" ${!isEligible ? 'disabled' : ''}>
                        <i class="fas fa-print"></i> Print Exam Card
                    </button>
                </div>
            `;
            
            this.examCardContent.innerHTML = html;
            
            const printBtn = document.getElementById('print-exam-card');
            if (printBtn && isEligible) {
                printBtn.addEventListener('click', () => this.printExamCard());
            }
        }
        
      getExamPeriod() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    // Trimester 1: March - June (months 2, 3, 4, 5)
    if (month >= 2 && month <= 5) {
        return `March - June ${year} (Trimester 1)`;
    }
    // Trimester 2: July - October (months 6, 7, 8, 9)
    else if (month >= 6 && month <= 9) {
        return `July - October ${year} (Trimester 2)`;
    }
    // Trimester 3: November - February (months 10, 11, 0, 1)
    else {
        // For November-February, check if we need next year for Feb
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
                    <title>NCHSM Exam Card</title>
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { font-family: Arial, sans-serif; padding: 15px; background: white; }
                        .exam-card-template { max-width: 1000px; margin: 0 auto; border: 2px solid #4C1D95; border-radius: 8px; overflow: hidden; }
                        .exam-card-header { background: linear-gradient(135deg, #4C1D95, #7c3aed); color: white; padding: 15px; text-align: center; }
                        .exam-card-header h2 { font-size: 18px; }
                        .exam-card-header p { font-size: 12px; }
                        .logo-wrapper { text-align: center; margin-bottom: 8px; }
                        .exam-card-logo { max-width: 60px; }
                        .semester-badge, .eligibility-badge { display: inline-block; padding: 3px 12px; border-radius: 20px; font-size: 11px; margin: 5px; }
                        .semester-badge { background: rgba(255,255,255,0.2); }
                        .eligibility-badge.eligible { background: #059669; }
                        .eligibility-badge.not-eligible { background: #dc2626; }
                        .exam-card-body { padding: 15px; }
                        .exam-info-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 8px; margin-bottom: 15px; background: #f8f9fa; padding: 12px; border-radius: 6px; font-size: 12px; }
                        .exam-info-item label { font-size: 10px; color: #6b7280; display: block; }
                        .exam-info-item .value { font-size: 13px; font-weight: 600; }
                        .status-message { padding: 10px; border-radius: 6px; margin-bottom: 15px; display: flex; align-items: center; gap: 8px; font-size: 12px; }
                        .status-message.eligible { background: #d1fae5; color: #059669; }
                        .status-message.not-eligible { background: #fee2e2; color: #dc2626; }
                        h4 { font-size: 14px; margin: 10px 0 5px; }
                        .unit-count-info { font-size: 11px; background: #fef3c7; padding: 5px 8px; border-radius: 4px; margin-bottom: 10px; }
                        .registered-units-table { width: 100%; border-collapse: collapse; font-size: 10px; }
                        .registered-units-table th, .registered-units-table td { padding: 6px 4px; border: 1px solid #e5e7eb; text-align: left; }
                        .registered-units-table th { background: #f9fafb; font-weight: 600; }
                        .text-center { text-align: center; }
                        .signature-placeholder, .date-placeholder { font-family: monospace; border-bottom: 1px solid #9ca3af; padding: 0 5px; }
                        .signature-section { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 15px; margin: 15px 0; padding-top: 10px; border-top: 1px solid #e5e7eb; }
                        .signature-line { text-align: center; min-width: 140px; }
                        .signature-line span { display: inline-block; width: 160px; border-top: 1px solid #000; margin-bottom: 5px; }
                        .signature-line p { font-size: 10px; margin: 3px 0; }
                        .signature-line small { font-size: 8px; }
                        .stamp-text { border: 1px solid #4C1D95; padding: 3px 8px; border-radius: 4px; font-size: 9px; color: #4C1D95; }
                        .declaration-section { margin: 15px 0; padding: 10px; background: #fef3c7; border-radius: 6px; }
                        .declaration-section h5 { font-size: 12px; margin-bottom: 5px; }
                        .declaration-section p { font-size: 10px; }
                        .student-signature-line { margin-top: 10px; text-align: right; }
                        .student-signature-line span { display: inline-block; width: 180px; border-top: 1px solid #000; }
                        .student-signature-line p { font-size: 9px; margin-top: 3px; }
                        .exam-rules { background: #f8f9fa; padding: 10px; border-radius: 6px; font-size: 10px; }
                        .exam-rules h5 { font-size: 11px; margin-bottom: 5px; }
                        .exam-rules ul { padding-left: 18px; }
                        .exam-rules li { margin-bottom: 2px; }
                        .summary-badge { display: inline-block; background: #f3f4f6; padding: 3px 10px; border-radius: 15px; font-size: 11px; margin-right: 8px; }
                        .print-btn { background: #4C1D95; color: white; border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer; font-size: 12px; margin-top: 10px; }
                        .print-btn:disabled { opacity: 0.5; cursor: not-allowed; }
                        @media print { .print-btn { display: none; } body { padding: 0; } }
                    </style>
                </head>
                <body>${printContent.outerHTML}<script>window.onload=function(){window.print();setTimeout(function(){window.close();},500)}<\/script></body>
                </html>
            `);
            printWindow.document.close();
        }
        
        showLoading() {
            if (this.examCardContent) {
                this.examCardContent.innerHTML = `<div class="loading-state"><div class="loading-spinner"></div><p>Loading exam card...</p></div>`;
            }
        }
        
        showError(message) {
            if (this.examCardContent) {
                this.examCardContent.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Error</h3><p>${this.escapeHtml(message)}</p><button onclick="location.reload()" class="btn-primary">Retry</button></div>`;
            }
        }
        
        showWaitingForLogin() {
            if (this.examCardContent && !this.loaded) {
                this.examCardContent.innerHTML = `<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><h3>Waiting for Login</h3><p>Please log in to view your exam card.</p></div>`;
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
            this.loaded = false;
            this.loadExamCard();
        }
    }
    
    window.examCardModule = new ExamCardModule();
    window.initExamCard = () => window.examCardModule?.refresh();
    window.loadExamCard = () => window.examCardModule?.loadExamCard();
    window.printExamCard = () => window.examCardModule?.printExamCard();
    
    console.log('✅ Exam Card module ready!');
})();
