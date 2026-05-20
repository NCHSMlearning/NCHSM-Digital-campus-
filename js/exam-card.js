// js/exam-card.js - COMPLETELY FIXED v4 (Print Design Fixed)

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
            
            // Generate table rows for units
            let tableRows = '';
            let totalCredits = 0;
            approvedUnits.forEach((unit, index) => {
                const unitName = this.escapeHtml(unit.unit_name || unit.name || '');
                const unitCode = this.escapeHtml(unit.unit_code || unit.code || '');
                const credits = unit.credits || 3;
                totalCredits += credits;
                tableRows += `
                    <tr>
                        <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: center;">${index + 1}</td>
                        <td style="padding: 8px 10px; border: 1px solid #e2e8f0;"><strong>${unitCode}</strong></td>
                        <td style="padding: 8px 10px; border: 1px solid #e2e8f0;">${unitName}</td>
                        <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: center;">${credits}</td>
                        <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: center;"><span style="font-family: monospace; letter-spacing: 1px;">_________________</span></td>
                        <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: center;"><span style="font-family: monospace;">___________</span></td>
                    </tr>
                `;
            });
            
            let html = `
                <div class="exam-card-print-container" id="exam-card-print-fixed">
                    <div class="exam-card-print">
                        <!-- HEADER -->
                        <div class="print-header">
                            <div class="print-logo">
                                <img src="${logoUrl}" alt="NCHSM Logo" style="height: 70px; width: auto;">
                            </div>
                            <div class="print-title">
                                <h2>NAKURU COLLEGE OF HEALTH SCIENCES AND MANAGEMENT</h2>
                                <div class="exam-title-big">EXAMINATION CARD</div>
                                <div class="exam-period-print">${this.escapeHtml(examPeriod)}</div>
                            </div>
                            <div class="print-badges">
                                <span class="print-block-badge">${this.escapeHtml(currentBlock)}</span>
                                <span class="print-status-badge ${isEligible ? 'eligible' : 'ineligible'}">${isEligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}</span>
                            </div>
                        </div>
                        
                        <!-- BIO DATA COMPACT -->
                        <div class="print-bio">
                            <table class="bio-table">
                                <tr><td class="bio-label">Student Name:</td><td class="bio-value">${this.escapeHtml(student?.full_name || 'Not Available')}</td>
                                <td class="bio-label">Student ID:</td><td class="bio-value">${this.escapeHtml(student?.student_id || 'N/A')}</td></tr>
                                <tr><td class="bio-label">Program:</td><td class="bio-value">${this.escapeHtml(student?.program || 'KRCHN')}</td>
                                <td class="bio-label">Intake Year:</td><td class="bio-value">${student?.intake_year || 'N/A'}</td></tr>
                                <tr><td class="bio-label">Current Block:</td><td class="bio-value"><strong>${this.escapeHtml(currentBlock)}</strong></td>
                                <td class="bio-label">Approved Units:</td><td class="bio-value">${approvedUnits.length}</td></tr>
                                <tr><td class="bio-label">Card Issued:</td><td class="bio-value">${currentDate}</td>
                                <td class="bio-label">Status:</td><td class="bio-value" style="color:${isEligible ? '#059669' : '#dc2626'}">${isEligible ? 'Cleared' : 'Pending'}</td></tr>
                            </table>
                        </div>
                        
                        <!-- UNITS TABLE -->
                        <div class="print-units">
                            <h4>📋 Approved Examination Units</h4>
                            <table class="units-table-print">
                                <thead>
                                    <tr>
                                        <th style="width:5%">#</th>
                                        <th style="width:20%">Unit Code</th>
                                        <th style="width:35%">Unit Name</th>
                                        <th style="width:8%">Credits</th>
                                        <th style="width:17%">Lecturer's Signature</th>
                                        <th style="width:15%">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${tableRows}
                                    <tr style="background: #f1f5f9;">
                                        <td colspan="3"><strong>Total</strong></td>
                                        <td style="text-align: center;"><strong>${totalCredits}</strong></td>
                                        <td colspan="2"></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        
                        <!-- THREE SIGNATURES ON ONE LINE -->
                        <div class="print-signatures-row">
                            <div class="print-signature-item">
                                <div class="print-signature-line">_________________________</div>
                                <div class="print-signature-label">HOD - Nursing</div>
                                <div class="print-signature-sub">(Head of Department)</div>
                            </div>
                            <div class="print-signature-item">
                                <div class="print-signature-line">_________________________</div>
                                <div class="print-signature-label">Principal</div>
                                <div class="print-signature-sub">(College Principal)</div>
                            </div>
                            <div class="print-signature-item">
                                <div class="print-signature-line">_________________________</div>
                                <div class="print-signature-label">Finance Officer</div>
                                <div class="print-signature-sub">(Fee Clearance)</div>
                            </div>
                        </div>
                        
                        <div class="print-stamp">
                            <div class="official-stamp-print">OFFICIAL STAMP</div>
                        </div>
                        
                        <div class="print-declaration">
                            <h5>📝 Candidate's Declaration</h5>
                            <p>I confirm that I have obtained the necessary signatures and will abide by all examination rules and regulations.</p>
                            <div class="print-student-signature">
                                <div class="print-signature-line" style="width: 250px; margin-left: auto;">_________________________</div>
                                <div class="print-signature-label" style="text-align: right;">Student's Signature & Date</div>
                            </div>
                        </div>
                        
                        <div class="print-rules">
                            <h5><i class="fas fa-gavel"></i> Examination Rules & Regulations</h5>
                            <ul>
                                <li>Present this card to each lecturer BEFORE the exam for signature</li>
                                <li>Must be verified by HOD, Principal, and Finance Officer</li>
                                <li>Must be presented at each examination venue</li>
                                <li>No electronic devices allowed in examination halls</li>
                                <li>Arrive at least 30 minutes before scheduled exam time</li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div class="print-action-buttons">
                    <button class="btn-print-card" id="print-exam-card-btn">
                        <i class="fas fa-print"></i> Print Exam Card
                    </button>
                </div>
            `;
            
            this.examCardContent.innerHTML = html;
            
            // Add print styles to the page
            this.addPrintStyles();
            
            const printBtn = document.getElementById('print-exam-card-btn');
            if (printBtn && isEligible) {
                const newBtn = printBtn.cloneNode(true);
                printBtn.parentNode.replaceChild(newBtn, printBtn);
                newBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.printExamCardFixed();
                });
            }
        }
        
        addPrintStyles() {
            // Remove existing print style if any
            const existingStyle = document.getElementById('exam-card-print-styles');
            if (existingStyle) existingStyle.remove();
            
            const style = document.createElement('style');
            style.id = 'exam-card-print-styles';
            style.textContent = `
                /* Screen styles for exam card */
                .exam-card-print-container {
                    max-width: 1000px;
                    margin: 0 auto;
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 20px 35px -10px rgba(0,0,0,0.1);
                    overflow: hidden;
                }
                .exam-card-print {
                    background: white;
                }
                .print-header {
                    background: linear-gradient(135deg, #4C1D95, #7c3aed);
                    color: white;
                    padding: 20px 25px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                }
                .print-title { text-align: center; }
                .print-title h2 { font-size: 18px; margin-bottom: 5px; }
                .exam-title-big { font-size: 24px; font-weight: 800; letter-spacing: 2px; margin: 5px 0; }
                .exam-period-print { font-size: 13px; opacity: 0.9; }
                .print-block-badge, .print-status-badge { padding: 6px 14px; border-radius: 30px; font-size: 12px; font-weight: 600; margin-left: 10px; background: rgba(255,255,255,0.2); }
                .print-status-badge.eligible { background: #10b981; }
                .print-status-badge.ineligible { background: #ef4444; }
                
                .print-bio { padding: 15px 25px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
                .bio-table { width: 100%; border-collapse: collapse; }
                .bio-table td { padding: 6px 8px; }
                .bio-label { font-size: 11px; font-weight: 600; color: #64748b; width: 110px; }
                .bio-value { font-size: 13px; font-weight: 600; color: #1e293b; }
                
                .print-units { padding: 15px 25px; }
                .print-units h4 { color: #4C1D95; margin-bottom: 10px; font-size: 14px; }
                .units-table-print { width: 100%; border-collapse: collapse; font-size: 12px; }
                .units-table-print th, .units-table-print td { border: 1px solid #e2e8f0; padding: 8px 10px; }
                .units-table-print th { background: #f1f5f9; font-weight: 700; }
                
                .print-signatures-row { display: flex; justify-content: space-between; gap: 20px; padding: 15px 25px; border-top: 2px solid #e2e8f0; margin-top: 10px; }
                .print-signature-item { flex: 1; text-align: center; }
                .print-signature-line { border-top: 1px solid #334155; margin: 8px 0 5px; padding-top: 5px; font-family: monospace; }
                .print-signature-label { font-weight: 700; font-size: 11px; }
                .print-signature-sub { font-size: 9px; color: #6b7280; }
                
                .print-stamp { text-align: center; padding: 5px 25px; }
                .official-stamp-print { border: 1.5px solid #4C1D95; padding: 6px 15px; border-radius: 6px; font-size: 10px; font-weight: 700; color: #4C1D95; display: inline-block; }
                
                .print-declaration { background: #fef3c7; margin: 10px 25px; padding: 12px 15px; border-radius: 10px; }
                .print-declaration h5 { font-size: 12px; margin-bottom: 6px; }
                .print-declaration p { font-size: 11px; }
                .print-student-signature { text-align: right; margin-top: 10px; }
                
                .print-rules { background: #f8fafc; margin: 10px 25px 20px; padding: 12px 15px; border-radius: 10px; font-size: 10px; border: 1px solid #e2e8f0; }
                .print-rules ul { padding-left: 18px; }
                .print-rules li { margin-bottom: 3px; }
                
                .print-action-buttons { text-align: center; margin-top: 20px; }
                .btn-print-card { background: #4C1D95; color: white; border: none; padding: 12px 30px; border-radius: 40px; cursor: pointer; font-weight: 600; font-size: 14px; }
                .btn-print-card:hover { background: #3b1580; }
                .btn-print-card:disabled { opacity: 0.5; cursor: not-allowed; }
                
                /* PRINT STYLES - Keep design exactly the same */
                @media print {
                    body { background: white; padding: 0; margin: 0; }
                    .print-action-buttons { display: none; }
                    .exam-card-print-container { box-shadow: none; margin: 0; border-radius: 0; }
                    .print-header { background: #4C1D95; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .print-status-badge.eligible { background: #10b981; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .print-bio { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .units-table-print th { background: #f1f5f9; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .print-declaration { background: #fef3c7; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .print-rules { background: #f8fafc; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .official-stamp-print { border-color: #4C1D95; }
                    .print-signature-line { border-top-color: #000; }
                }
            `;
            document.head.appendChild(style);
        }
        
        printExamCardFixed() {
            const printContent = document.getElementById('exam-card-print-fixed');
            if (!printContent) return;
            
            // Get all styles
            const styles = document.getElementById('exam-card-print-styles')?.innerHTML || '';
            
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>NCHSM Exam Card - ${this.userProfile?.full_name || 'Student'}</title>
                    <meta charset="UTF-8">
                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
                    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                    <style>
                        * {
                            margin: 0;
                            padding: 0;
                            box-sizing: border-box;
                        }
                        body {
                            font-family: 'Inter', sans-serif;
                            background: white;
                            padding: 20px;
                        }
                        ${styles}
                        .print-action-buttons {
                            display: none;
                        }
                        @media print {
                            body {
                                padding: 0;
                                margin: 0;
                            }
                        }
                    </style>
                </head>
                <body>
                    ${printContent.outerHTML}
                    <script>
                        window.onload = function() {
                            setTimeout(function() {
                                window.print();
                                window.close();
                            }, 500);
                        };
                    <\/script>
                </body>
                </html>
            `);
            printWindow.document.close();
        }
        
        showDemoCard() {
            if (!this.examCardContent) return;
            
            const demoStudent = {
                full_name: 'Kevin Tiong\'i',
                student_id: 'nschm0087',
                program: 'KRCHN',
                intake_year: '2026',
                block: 'Introductory'
            };
            this.userProfile = demoStudent;
            this.userBlock = 'Introductory';
            
            this.approvedUnits = [
                { unit_code: 'NUR 101', unit_name: 'Introduction to Nursing', credits: 3 },
                { unit_code: 'NUR 102', unit_name: 'Anatomy & Physiology', credits: 3 },
                { unit_code: 'NUR 103', unit_name: 'Medical Terminology', credits: 2 },
                { unit_code: 'NUR 104', unit_name: 'Pharmacology Basics', credits: 3 },
                { unit_code: 'NUR 105', unit_name: 'Patient Care Skills', credits: 3 }
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
        
        showLoading() {
            if (this.examCardContent) {
                this.examCardContent.innerHTML = `<div style="text-align:center; padding:50px;"><div class="loading-spinner"></div><p>Loading exam card...</p></div>`;
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
    window.loadExamCard = () => window.examCardModule?.loadExamCard();
    window.printExamCard = () => window.examCardModule?.printExamCardFixed();
    window.refreshExamCard = () => window.examCardModule?.refresh();
    
    console.log('✅ FIXED Exam Card module ready - Print design preserved!');
})();
