// js/exam-card.js - COMPLETELY FIXED v3

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
        }
        
        setupEventListeners() {
            document.addEventListener('appReady', () => this.tryLoadIfLoggedIn());
            document.addEventListener('profileLoaded', (e) => {
                if (e.detail?.profile) {
                    this.userProfile = e.detail.profile;
                    this.updateUserData();
                    this.loadExamCard();
                }
            });
            document.addEventListener('unitRegistrationReady', () => this.loadExamCard());
            document.querySelectorAll('[data-tab="hub-exam-card"]').forEach(link => {
                link.addEventListener('click', () => setTimeout(() => this.loadExamCard(), 100));
            });
        }
        
        tryLoadIfLoggedIn() {
            const profile = this.getUserProfileFromSources();
            if (profile) {
                this.userProfile = profile;
                this.updateUserData();
                this.loadExamCard();
            } else if (this.examCardContent && !this.loaded) {
                this.showDemoCard();
            }
        }
        
        getUserProfileFromSources() {
            const sources = [
                () => window.db?.currentUserProfile,
                () => window.currentUserProfile,
                () => window.databaseModule?.currentUserProfile,
                () => window.app?.user,
                () => { try { return JSON.parse(localStorage.getItem('userProfile')); } catch(e) { return null; } },
                () => { try { return JSON.parse(localStorage.getItem('nchsm_user')); } catch(e) { return null; } }
            ];
            for (const source of sources) {
                try {
                    const profile = source();
                    if (profile && (profile.id || profile.user_id || profile.student_id)) return profile;
                } catch(e) {}
            }
            return null;
        }
        
        updateUserData() {
            if (this.userProfile) {
                this.userId = this.userProfile.user_id || this.userProfile.id || this.userProfile.student_id;
                this.userBlock = this.userProfile.block || this.userProfile.current_block || this.userProfile.term;
                return true;
            }
            return false;
        }
        
        async loadExamCard() {
            if (this.isLoading) return;
            if (!this.userProfile) { this.showDemoCard(); return; }
            
            this.isLoading = true;
            this.showLoading();
            
            try {
                const success = await this.loadApprovedUnitsFromDB();
                if (success) {
                    await this.updateDashboard();
                    this.displayExamCard();
                    this.loaded = true;
                } else {
                    this.showDemoCard();
                }
            } catch (error) {
                this.showDemoCard();
            } finally {
                this.isLoading = false;
            }
        }
        
        async loadApprovedUnitsFromDB() {
            const supabase = window.db?.supabase || window.supabase;
            if (!supabase) return false;
            
            try {
                let actualUserId = this.userId;
                let studentIdValue = this.userProfile?.student_id;
                
                if (studentIdValue) {
                    const { data: userData } = await supabase
                        .from('consolidated_user_profiles_table')
                        .select('user_id')
                        .eq('student_id', studentIdValue)
                        .maybeSingle();
                    if (userData?.user_id) actualUserId = userData.user_id;
                }
                
                const { data, error } = await supabase
                    .from('student_unit_registrations')
                    .select('*')
                    .eq('student_id', actualUserId)
                    .eq('status', 'approved');
                
                if (error) throw error;
                this.approvedUnits = data || [];
                return true;
            } catch (error) {
                return false;
            }
        }
        
        async updateDashboard() {
            const approvedCount = this.approvedUnits.length;
            if (this.dashboardExamStatus) {
                this.dashboardExamStatus.textContent = approvedCount > 0 ? 'ELIGIBLE' : 'NOT ELIGIBLE';
                this.dashboardExamStatus.style.color = approvedCount > 0 ? '#059669' : '#dc2626';
            }
            if (this.dashboardApprovedUnits) this.dashboardApprovedUnits.textContent = approvedCount;
        }
        
        displayExamCard() {
            if (!this.examCardContent) return;
            
            const student = this.userProfile;
            const approvedUnits = this.approvedUnits;
            const isEligible = approvedUnits.length > 0;
            const currentDate = new Date().toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' });
            const examPeriod = this.getExamPeriod();
            const currentBlock = this.userBlock || student?.block || 'Current Block';
            
            const logoUrl = 'https://raw.githubusercontent.com/NCHSMlearning/e-learning/main/images/Logo_NCHSM.png';
            
            let html = `
                <style>
                    .exam-card-fixed { max-width: 1000px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 20px 35px -10px rgba(0,0,0,0.1); overflow: hidden; }
                    .exam-card-fixed .card-header { background: linear-gradient(135deg, #4C1D95, #7c3aed); color: white; padding: 20px 25px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; }
                    .exam-card-fixed .logo-area img { height: 65px; width: auto; }
                    .exam-card-fixed .header-text { text-align: center; }
                    .exam-card-fixed .header-text h2 { font-size: 18px; margin-bottom: 5px; letter-spacing: 1px; }
                    .exam-card-fixed .header-text .exam-title { font-size: 22px; font-weight: 800; letter-spacing: 2px; margin: 5px 0; }
                    .exam-card-fixed .header-text .exam-period { font-size: 13px; opacity: 0.9; }
                    .exam-card-fixed .badge-area .block-badge, .exam-card-fixed .badge-area .eligibility-badge { padding: 6px 14px; border-radius: 30px; font-size: 12px; font-weight: 600; margin-left: 10px; }
                    .exam-card-fixed .eligibility-badge.eligible { background: #10b981; }
                    .exam-card-fixed .eligibility-badge.ineligible { background: #ef4444; }
                    .exam-card-fixed .card-body { padding: 20px 25px; }
                    
                    /* COMPACT BIO DATA SECTION - Reduced spacing */
                    .exam-card-fixed .student-info-compact { background: #f8fafc; border-radius: 12px; padding: 12px 18px; margin-bottom: 15px; border: 1px solid #e2e8f0; }
                    .exam-card-fixed .info-grid-compact { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 20px; }
                    .exam-card-fixed .info-field-compact { display: flex; justify-content: space-between; align-items: baseline; padding: 4px 0; border-bottom: 1px dashed #e2e8f0; }
                    .exam-card-fixed .info-field-compact label { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
                    .exam-card-fixed .info-field-compact .field-value { font-size: 13px; font-weight: 600; color: #1e293b; }
                    
                    /* NO CLEARANCE MESSAGE - Removed completely */
                    
                    .exam-card-fixed .units-section { margin-top: 20px; }
                    .exam-card-fixed .units-section h4 { font-size: 14px; margin-bottom: 8px; color: #4C1D95; }
                    .exam-card-fixed .instruction-note { font-size: 11px; color: #6b7280; margin-bottom: 12px; }
                    .exam-card-fixed .units-table { width: 100%; border-collapse: collapse; font-size: 12px; }
                    .exam-card-fixed .units-table th, .exam-card-fixed .units-table td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; }
                    .exam-card-fixed .units-table th { background: #f1f5f9; font-weight: 700; font-size: 11px; text-transform: uppercase; }
                    .exam-card-fixed .signature-line, .exam-card-fixed .date-line { font-family: monospace; letter-spacing: 1px; color: #475569; }
                    
                    /* THREE SIGNATURES ON ONE LINE */
                    .exam-card-fixed .signatures-row { display: flex; justify-content: space-between; gap: 15px; margin: 20px 0; padding: 15px 0 10px; border-top: 2px solid #e2e8f0; }
                    .exam-card-fixed .signature-item-one { flex: 1; text-align: center; }
                    .exam-card-fixed .signature-placeholder { width: 100%; border-top: 1px solid #334155; margin: 8px 0 5px; padding-top: 5px; font-family: monospace; color: #64748b; font-size: 11px; }
                    .exam-card-fixed .signature-label { font-weight: 700; font-size: 11px; margin: 5px 0 2px; color: #1e293b; }
                    .exam-card-fixed .signature-sub { font-size: 9px; color: #6b7280; }
                    
                    .exam-card-fixed .official-stamp { text-align: center; margin: 10px 0; }
                    .exam-card-fixed .official-stamp .stamp { border: 1.5px solid #4C1D95; padding: 6px 15px; border-radius: 6px; font-size: 10px; font-weight: 700; color: #4C1D95; display: inline-block; }
                    
                    .exam-card-fixed .declaration-section { background: #fef3c7; padding: 12px 15px; border-radius: 10px; margin: 15px 0; }
                    .exam-card-fixed .declaration-section h5 { font-size: 12px; margin-bottom: 6px; }
                    .exam-card-fixed .declaration-section p { font-size: 11px; }
                    .exam-card-fixed .student-signature { text-align: right; margin-top: 8px; }
                    .exam-card-fixed .student-signature .signature-placeholder { width: 200px; margin-left: auto; }
                    
                    .exam-card-fixed .exam-rules { background: #f8fafc; padding: 12px 15px; border-radius: 10px; font-size: 10px; border: 1px solid #e2e8f0; }
                    .exam-card-fixed .exam-rules h5 { font-size: 11px; margin-bottom: 8px; }
                    .exam-card-fixed .exam-rules ul { padding-left: 18px; }
                    .exam-card-fixed .exam-rules li { margin-bottom: 3px; }
                    
                    .print-action { text-align: center; margin-top: 20px; }
                    .btn-print-fixed { background: #4C1D95; color: white; border: none; padding: 12px 30px; border-radius: 40px; cursor: pointer; font-weight: 600; font-size: 14px; transition: all 0.2s; }
                    .btn-print-fixed:hover { background: #3b1580; transform: translateY(-1px); }
                    .btn-print-fixed:disabled { opacity: 0.5; cursor: not-allowed; }
                    @media print { .print-action { display: none; } .exam-card-fixed { box-shadow: none; margin: 0; } }
                </style>
                
                <div class="exam-card-fixed" id="exam-card-print-fixed">
                    <div class="card-header">
                        <div class="logo-area"><img src="${logoUrl}" alt="NCHSM Logo" class="exam-logo" onerror="this.style.display='none'"></div>
                        <div class="header-text">
                            <h2>NAKURU COLLEGE OF HEALTH SCIENCES AND MANAGEMENT</h2>
                            <div class="exam-title">EXAMINATION CARD</div>
                            <div class="exam-period">${this.escapeHtml(examPeriod)}</div>
                        </div>
                        <div class="badge-area">
                            <span class="block-badge">${this.escapeHtml(currentBlock)}</span>
                            <span class="eligibility-badge ${isEligible ? 'eligible' : 'ineligible'}">${isEligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}</span>
                        </div>
                    </div>
                    
                    <div class="card-body">
                        <!-- COMPACT BIO DATA SECTION - Reduced space, no clearance message -->
                        <div class="student-info-compact">
                            <div class="info-grid-compact">
                                <div class="info-field-compact"><label>Student Name:</label><span class="field-value">${this.escapeHtml(student?.full_name || 'Not Available')}</span></div>
                                <div class="info-field-compact"><label>Student ID:</label><span class="field-value">${this.escapeHtml(student?.student_id || 'N/A')}</span></div>
                                <div class="info-field-compact"><label>Program:</label><span class="field-value">${this.escapeHtml(student?.program || 'KRCHN')}</span></div>
                                <div class="info-field-compact"><label>Intake Year:</label><span class="field-value">${student?.intake_year || 'N/A'}</span></div>
                                <div class="info-field-compact"><label>Current Block:</label><span class="field-value"><strong>${this.escapeHtml(currentBlock)}</strong></span></div>
                                <div class="info-field-compact"><label>Approved Units:</label><span class="field-value">${approvedUnits.length}</span></div>
                                <div class="info-field-compact"><label>Card Issued:</label><span class="field-value">${currentDate}</span></div>
                                <div class="info-field-compact"><label>Status:</label><span class="field-value" style="color:${isEligible ? '#059669' : '#dc2626'}">${isEligible ? 'Cleared' : 'Pending'}</span></div>
                            </div>
                        </div>
                        
                        <!-- NO CLEARANCE MESSAGE - REMOVED as requested -->
            `;
            
            if (approvedUnits.length > 0) {
                html += `
                    <div class="units-section">
                        <h4>📋 Approved Examination Units</h4>
                        <p class="instruction-note"><i class="fas fa-info-circle"></i> Present this card to each lecturer BEFORE the exam for signature verification.</p>
                        <table class="units-table">
                            <thead>
                                <tr><th>#</th><th>Unit Code</th><th>Unit Name</th><th>Credits</th><th>Lecturer's Signature</th><th>Date</th></tr>
                            </thead>
                            <tbody>
                `;
                
                approvedUnits.forEach((unit, index) => {
                    const unitName = this.escapeHtml(unit.unit_name || unit.name || '');
                    const unitCode = this.escapeHtml(unit.unit_code || unit.code || '');
                    const credits = unit.credits || 3;
                    
                    html += `<tr>
                        <td class="text-center">${index + 1}</td>
                        <td><strong>${unitCode}</strong></td>
                        <td>${unitName}</td>
                        <td class="text-center">${credits}</td>
                        <td class="signature-cell"><span class="signature-line">_________________</span></td>
                        <td class="date-cell"><span class="date-line">___________</span></td>
                    </tr>`;
                });
                
                const totalCredits = approvedUnits.reduce((sum, u) => sum + (parseInt(u.credits) || 3), 0);
                html += `<tr style="background:#f1f5f9;"><td colspan="3"><strong>Total</strong></td><td class="text-center"><strong>${totalCredits}</strong></td><td colspan="2"></td></tr>`;
                
                html += `
                            </tbody>
                        </table>
                    </div>
                `;
            } else {
                html += `<div style="text-align:center; padding:30px; background:#fef2f2; border-radius:12px;"><i class="fas fa-exclamation-triangle" style="font-size:40px; color:#dc2626;"></i><h4 style="margin-top:10px;">No Approved Units</h4><p>You have not registered for any units or your registration is pending approval.</p></div>`;
            }
            
            // THREE SIGNATURES ON ONE LINE - HOD, Principal, Finance Officer
            html += `
                        <!-- THREE SIGNATURES IN ONE ROW -->
                        <div class="signatures-row">
                            <div class="signature-item-one">
                                <div class="signature-placeholder">_________________________</div>
                                <div class="signature-label">HOD - Nursing</div>
                                <div class="signature-sub">(Head of Department)</div>
                            </div>
                            <div class="signature-item-one">
                                <div class="signature-placeholder">_________________________</div>
                                <div class="signature-label">Principal</div>
                                <div class="signature-sub">(College Principal)</div>
                            </div>
                            <div class="signature-item-one">
                                <div class="signature-placeholder">_________________________</div>
                                <div class="signature-label">Finance Officer</div>
                                <div class="signature-sub">(Fee Clearance)</div>
                            </div>
                        </div>
                        
                        <div class="official-stamp">
                            <div class="stamp">OFFICIAL STAMP</div>
                        </div>
                        
                        <div class="declaration-section">
                            <h5>📝 Candidate's Declaration</h5>
                            <p>I confirm that I have obtained the necessary signatures and will abide by all examination rules and regulations.</p>
                            <div class="student-signature">
                                <div class="signature-placeholder">_________________________</div>
                                <div class="signature-label">Student's Signature & Date</div>
                            </div>
                        </div>
                        
                        <div class="exam-rules">
                            <h5><i class="fas fa-gavel"></i> Examination Rules & Regulations</h5>
                            <ul>
                                <li><i class="fas fa-check-circle"></i> Present this card to each lecturer BEFORE the exam for signature</li>
                                <li><i class="fas fa-check-circle"></i> Must be verified by HOD, Principal, and Finance Officer</li>
                                <li><i class="fas fa-check-circle"></i> Must be presented at each examination venue</li>
                                <li><i class="fas fa-check-circle"></i> No electronic devices allowed in examination halls</li>
                                <li><i class="fas fa-check-circle"></i> Arrive at least 30 minutes before scheduled exam time</li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div class="print-action">
                    <button class="btn-print-fixed" id="print-exam-card-fixed-btn" ${!isEligible ? 'disabled' : ''}>
                        <i class="fas fa-print"></i> Print Exam Card
                    </button>
                </div>
            `;
            
            this.examCardContent.innerHTML = html;
            
            const printBtn = document.getElementById('print-exam-card-fixed-btn');
            if (printBtn && isEligible) {
                const newBtn = printBtn.cloneNode(true);
                printBtn.parentNode.replaceChild(newBtn, printBtn);
                newBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.printExamCard();
                });
            }
        }
        
        showDemoCard() {
            if (!this.examCardContent) return;
            
            // Demo student data for preview
            const demoStudent = {
                full_name: 'Kevin Tiong\'i',
                student_id: 'nschm0087',
                program: 'KRCHN',
                intake_year: '2026',
                block: 'Introductory'
            };
            this.userProfile = demoStudent;
            this.userBlock = 'Introductory';
            
            // Demo approved units
            this.approvedUnits = [
                { unit_code: 'NUR 101', unit_name: 'Introduction to Nursing', credits: 3 },
                { unit_code: 'NUR 102', unit_name: 'Anatomy & Physiology', credits: 3 },
                { unit_code: 'NUR 103', unit_name: 'Medical Terminology', credits: 2 }
            ];
            
            this.displayExamCard();
        }
        
        getExamPeriod() {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth();
            if (month >= 2 && month <= 5) return `March - June ${year} (Trimester 1)`;
            if (month >= 6 && month <= 9) return `July - October ${year} (Trimester 2)`;
            return `November - February ${year}/${year + 1} (Trimester 3)`;
        }
        
        printExamCard() {
            const printContent = document.getElementById('exam-card-print-fixed');
            if (!printContent) return;
            
            const printWindow = window.open('', '_blank');
            const styles = document.querySelector('style')?.innerHTML || '';
            
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>NCHSM Exam Card</title>
                    <meta charset="UTF-8">
                    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { font-family: 'Inter', sans-serif; background: white; padding: 20px; }
                        ${styles}
                        .print-action { display: none; }
                        .exam-card-fixed { box-shadow: none; margin: 0; }
                    </style>
                </head>
                <body>${printContent.outerHTML}
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                            window.close();
                        }, 300);
                    };
                <\/script>
                </body>
                </html>
            `);
            printWindow.document.close();
        }
        
        showLoading() {
            if (this.examCardContent) {
                this.examCardContent.innerHTML = `<div style="text-align:center; padding:50px;"><div class="loading-spinner"></div><p>Loading exam card...</p></div>`;
            }
        }
        
        showDemoCard() { this.displayExamCard(); }
        
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
    
    window.fixedExamCardModule = new ExamCardModule();
    window.examCardModule = window.fixedExamCardModule;
    window.loadExamCard = () => window.examCardModule?.loadExamCard();
    window.printExamCard = () => window.examCardModule?.printExamCard();
    window.refreshExamCard = () => window.examCardModule?.refresh();
    
    console.log('✅ FIXED Exam Card module ready - Signatures on one line, clearance message removed, compact layout');
})();
