// js/exam-card.js - v8.4 (EXACT layout: Rules + Student Signature)

(function() {
    'use strict';
    
    // =====================================================
    // CONFIGURATION
    // =====================================================
    const CONFIG = {
        LOGO_URL: 'https://raw.githubusercontent.com/NCHSMlearning/e-learning/main/images/Logo_NCHSM.png',
        DEFAULT_CREDITS: 3,
        LOAD_DELAY: 500,
        DEMO_DATA: {
            full_name: 'Kevin Tiong\'i',
            student_id: 'nschm0087',
            program: 'KRCHN',
            intake_year: '2026',
            block: 'Introductory'
        },
        DEMO_UNITS: [
            { unit_code: 'NUR 101', unit_name: 'Introduction to Nursing', credits: 3 },
            { unit_code: 'NUR 102', unit_name: 'Anatomy & Physiology', credits: 3 },
            { unit_code: 'NUR 103', unit_name: 'Medical Terminology', credits: 2 },
            { unit_code: 'NUR 104', unit_name: 'Pharmacology Basics', credits: 3 },
            { unit_code: 'NUR 105', unit_name: 'Patient Care Skills', credits: 3 }
        ]
    };
    
    // =====================================================
    // MAIN CLASS
    // =====================================================
    class ExamCardModule {
        constructor() {
            this.approvedUnits = [];
            this.userProfile = null;
            this.loaded = false;
            this.userBlock = null;
            this.userId = null;
            this.isLoading = false;
            
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.init());
            } else {
                this.init();
            }
        }
        
        // ========== UTILITY METHODS ==========
        escapeHtml(str) {
            if (!str) return '';
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }
        
        formatDate(date = new Date()) {
            return date.toLocaleDateString('en-KE', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
        }
        
        getExamPeriod() {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth();
            
            if (month >= 2 && month <= 5) {
                return `March - June ${year} (Trimester 1)`;
            }
            if (month >= 6 && month <= 9) {
                return `July - October ${year} (Trimester 2)`;
            }
            return `November - February ${year}/${year + 1} (Trimester 3)`;
        }
        
        // ========== INITIALIZATION ==========
        init() {
            this.cacheElements();
            this.setupEventListeners();
            this.loadRequiredLibraries();
            setTimeout(() => this.tryLoadIfLoggedIn(), CONFIG.LOAD_DELAY);
        }
        
        loadRequiredLibraries() {
            if (typeof html2canvas === 'undefined') {
                const script1 = document.createElement('script');
                script1.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
                document.head.appendChild(script1);
            }
            
            if (typeof jspdf === 'undefined') {
                const script2 = document.createElement('script');
                script2.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
                document.head.appendChild(script2);
            }
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
        
        // ========== USER MANAGEMENT ==========
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
        
        // ========== DATA LOADING ==========
        async loadExamCard() {
            if (this.isLoading) return;
            if (!this.userProfile) { 
                this.showDemoCard(); 
                return; 
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
                    this.showDemoCard();
                }
            } catch (error) {
                console.warn('Failed to load exam card:', error);
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
                const studentIdValue = this.userProfile?.student_id;
                
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
                console.error('DB error:', error);
                return false;
            }
        }
        
        async updateDashboard() {
            const approvedCount = this.approvedUnits.length;
            if (this.dashboardExamStatus) {
                this.dashboardExamStatus.textContent = approvedCount > 0 ? 'ELIGIBLE' : 'NOT ELIGIBLE';
                this.dashboardExamStatus.style.color = approvedCount > 0 ? '#059669' : '#dc2626';
            }
            if (this.dashboardApprovedUnits) {
                this.dashboardApprovedUnits.textContent = approvedCount;
            }
        }
        
        // ========== DIRECT PDF DOWNLOAD ==========
        async downloadExamCardDirect() {
            const cardElement = document.getElementById('exam-card-print-area');
            if (!cardElement) {
                alert('Exam card not found. Please refresh and try again.');
                return;
            }
            
            const downloadBtn = document.getElementById('downloadExamCardBtn');
            const originalText = downloadBtn?.innerHTML || '📥 Download PDF';
            if (downloadBtn) {
                downloadBtn.innerHTML = '⏳ Generating PDF...';
                downloadBtn.disabled = true;
            }
            
            try {
                await this.waitForLibraries();
                
                const cloneCard = cardElement.cloneNode(true);
                
                const actionButtons = cloneCard.querySelectorAll('.action-buttons');
                actionButtons.forEach(btn => btn.remove());
                
                const allButtons = cloneCard.querySelectorAll('button');
                allButtons.forEach(btn => btn.style.display = 'none');
                
                const tempContainer = document.createElement('div');
                tempContainer.style.position = 'absolute';
                tempContainer.style.left = '-9999px';
                tempContainer.style.top = '-9999px';
                tempContainer.style.width = '800px';
                tempContainer.style.backgroundColor = 'white';
                tempContainer.appendChild(cloneCard);
                document.body.appendChild(tempContainer);
                
                await new Promise(resolve => setTimeout(resolve, 200));
                
                const canvas = await html2canvas(cloneCard, {
                    scale: 3,
                    backgroundColor: '#ffffff',
                    logging: false,
                    useCORS: true,
                    allowTaint: false
                });
                
                document.body.removeChild(tempContainer);
                
                const { jsPDF } = window.jspdf;
                const imgData = canvas.toDataURL('image/png');
                const imgWidth = 210;
                const pageHeight = 297;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                
                const pdf = new jsPDF('p', 'mm', 'a4');
                let position = 0;
                
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                
                if (imgHeight > pageHeight) {
                    let heightLeft = imgHeight - pageHeight;
                    position = -pageHeight;
                    while (heightLeft > 0) {
                        pdf.addPage();
                        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                        heightLeft -= pageHeight;
                        position -= pageHeight;
                    }
                }
                
                const studentName = this.userProfile?.full_name || 'Student';
                const safeName = studentName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const date = this.formatDate().replace(/[, ]/g, '_');
                pdf.save(`Exam_Card_${safeName}_${date}.pdf`);
                
                if (downloadBtn) {
                    downloadBtn.innerHTML = '✅ Downloaded!';
                    setTimeout(() => {
                        downloadBtn.innerHTML = originalText;
                        downloadBtn.disabled = false;
                    }, 2000);
                }
                
            } catch (error) {
                console.error('PDF generation failed:', error);
                alert('Failed to generate PDF. Please try again.');
                if (downloadBtn) {
                    downloadBtn.innerHTML = originalText;
                    downloadBtn.disabled = false;
                }
            }
        }
        
        waitForLibraries() {
            return new Promise((resolve) => {
                const checkLibraries = setInterval(() => {
                    if (typeof html2canvas !== 'undefined' && window.jspdf && window.jspdf.jsPDF) {
                        clearInterval(checkLibraries);
                        resolve();
                    }
                }, 100);
                
                setTimeout(() => {
                    clearInterval(checkLibraries);
                    resolve();
                }, 10000);
            });
        }
        
        // ========== PRINT FUNCTION ==========
        printExamCard() {
            const printContent = document.getElementById('exam-card-print-area');
            if (!printContent) return;
            
            const styles = document.getElementById('exam-card-compact-styles')?.innerHTML || '';
            const cloneCard = printContent.cloneNode(true);
            const actionButtons = cloneCard.querySelectorAll('.action-buttons');
            actionButtons.forEach(btn => btn.remove());
            
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Exam Card - ${this.userProfile?.full_name || 'Student'}</title>
                    <meta charset="UTF-8">
                    <style>
                        ${styles}
                        body {
                            font-family: 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
                            padding: 20px;
                            margin: 0;
                            background: white;
                        }
                        .action-buttons, button {
                            display: none !important;
                        }
                        .exam-card-wrapper {
                            max-width: 800px;
                            margin: 0 auto;
                        }
                        @media print {
                            body { padding: 0; margin: 0; }
                            .card-header { background: #1e3a5f !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                            .status-badge.eligible { background: #10b981 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        }
                    </style>
                </head>
                <body>
                    ${cloneCard.outerHTML}
                    <script>
                        window.onload = function() {
                            setTimeout(function() {
                                window.print();
                                setTimeout(function() { window.close(); }, 500);
                            }, 200);
                        };
                    <\/script>
                </body>
                </html>
            `);
            printWindow.document.close();
        }
        
        // ========== UI RENDERING WITH EXACT RULES FORMAT ==========
        displayExamCard() {
            if (!this.examCardContent) return;
            
            const student = this.userProfile;
            const approvedUnits = this.approvedUnits;
            const isEligible = approvedUnits.length > 0;
            const currentBlock = this.userBlock || student?.block || 'Current Block';
            
            const totalCredits = approvedUnits.reduce((sum, unit) => sum + (unit.credits || CONFIG.DEFAULT_CREDITS), 0);
            
            const tableRows = approvedUnits.map((unit, index) => `
                <tr>
                    <td class="text-center">${index + 1}</td>
                    <td><strong>${this.escapeHtml(unit.unit_code || unit.code || '')}</strong></td>
                    <td>${this.escapeHtml(unit.unit_name || unit.name || '')}</td>
                    <td class="text-center">${unit.credits || CONFIG.DEFAULT_CREDITS}</td>
                    <td class="signature-cell">
                        <div class="signature-line"></div>
                        <div class="signature-hint">(Lecturer's Signature)</div>
                    </td>
                </tr>
            `).join('');
            
            const html = `
                <div class="exam-card-wrapper" id="exam-card-print-area">
                    <div class="exam-card-compact">
                        <div class="card-header">
                            <div class="header-text">
                                <div class="institution">NAKURU COLLEGE OF HEALTH SCIENCES AND MANAGEMENT</div>
                                <div class="card-title">EXAMINATION CARD</div>
                                <div class="card-subtitle">(Exam Entry Permit)</div>
                            </div>
                            <div class="status-badge ${isEligible ? 'eligible' : 'ineligible'}">
                                ${isEligible ? '✓ ELIGIBLE' : '✗ NOT ELIGIBLE'}
                            </div>
                        </div>
                        
                        <div class="info-grid">
                            <div class="info-item"><span class="info-label">Name:</span> ${this.escapeHtml(student?.full_name || 'Not Available')}</div>
                            <div class="info-item"><span class="info-label">ID Number:</span> ${this.escapeHtml(student?.student_id || 'N/A')}</div>
                            <div class="info-item"><span class="info-label">Program:</span> ${this.escapeHtml(student?.program || 'KRCHN')}</div>
                            <div class="info-item"><span class="info-label">Current Block:</span> <strong>${this.escapeHtml(currentBlock)}</strong></div>
                            <div class="info-item"><span class="info-label">Registered Units:</span> ${approvedUnits.length}</div>
                            <div class="info-item"><span class="info-label">Total Credits:</span> ${totalCredits}</div>
                            <div class="info-item"><span class="info-label">Exam Period:</span> ${this.getExamPeriod()}</div>
                            <div class="info-item"><span class="info-label">Date Issued:</span> ${this.formatDate()}</div>
                            <div class="info-item"><span class="info-label">Valid Until:</span> End of Exam Period</div>
                        </div>
                        
                        ${approvedUnits.length > 0 ? `
                            <table class="units-table">
                                <thead>
                                    <tr>
                                        <th width="5%">#</th>
                                        <th width="18%">Unit Code</th>
                                        <th width="40%">Unit Title</th>
                                        <th width="7%">Cr</th>
                                        <th width="30%">Lecturer's Signature</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${tableRows}
                                    <tr class="total-row">
                                        <td colspan="3"><strong>TOTAL REGISTERED UNITS: ${approvedUnits.length}</strong></td>
                                        <td class="text-center"><strong>${totalCredits}</strong></td>
                                        <td></td>
                                    </tr>
                                </tbody>
                            </table>
                        ` : '<div class="no-units">No approved units found. Please register for units.</div>'}
                        
                        <!-- SIGNATURES SECTION -->
                        <div class="signatures-row">
                            <div class="signature">
                                <div class="sign-line"></div>
                                <div>HOD Nursing</div>
                            </div>
                            <div class="signature">
                                <div class="sign-line"></div>
                                <div>Principal</div>
                            </div>
                            <div class="signature">
                                <div class="sign-line"></div>
                                <div>Finance Officer</div>
                            </div>
                        </div>
                        
                        <!-- RULES AND STUDENT SIGNATURE - EXACT FORMAT -->
                        <div class="card-footer">
                            <div class="rules-header">📋 EXAMINATION RULES & REGULATIONS</div>
                            <div class="rules-list">
                                <div class="rule-item">✓ Present your exam card at each examination hall</div>
                                <div class="rule-item">✓ No electronic devices allowed in examination room</div>
                                <div class="rule-item">✓ Arrive 30 minutes before examination start time</div>
                                <div class="rule-item">✓ Mobile phones must be switched off and stored</div>
                                <div class="rule-item">✓ No unauthorized materials allowed</div>
                            </div>
                            
                            <div class="student-signature-section">
                                <div class="student-sign-line">
                                    <span class="student-label">Student Signature:</span>
                                    <span class="signature-line-inline"></span>
                                </div>
                                <div class="student-declaration">
                                    I hereby confirm that I have read and understood the examination rules and regulations.
                                </div>
                                <div class="student-date">Date: _____________</div>
                            </div>
                        </div>
                    </div>
                    
                    ${isEligible ? `
                        <div class="action-buttons">
                            <button class="download-btn" id="downloadExamCardBtn">📥 Download PDF</button>
                            <button class="print-btn" id="printExamCardBtn">🖨️ Print Card</button>
                        </div>
                    ` : ''}
                </div>
            `;
            
            this.examCardContent.innerHTML = html;
            this.addCompactStyles();
            
            const downloadBtn = document.getElementById('downloadExamCardBtn');
            const printBtn = document.getElementById('printExamCardBtn');
            
            if (downloadBtn) {
                downloadBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.downloadExamCardDirect();
                });
            }
            
            if (printBtn) {
                printBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.printExamCard();
                });
            }
        }
        
        addCompactStyles() {
            const existingStyle = document.getElementById('exam-card-compact-styles');
            if (existingStyle) existingStyle.remove();
            
            const style = document.createElement('style');
            style.id = 'exam-card-compact-styles';
            style.textContent = `
                .exam-card-wrapper { max-width: 850px; margin: 0 auto; font-family: 'Segoe UI', Roboto, sans-serif; }
                .exam-card-compact { background: white; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
                
                .card-header { background: linear-gradient(135deg, #1e3a5f, #2c5a8c); color: white; padding: 15px 20px; display: flex; align-items: center; justify-content: space-between; }
                .header-text { flex: 1; }
                .institution { font-size: 12px; opacity: 0.9; letter-spacing: 0.5px; }
                .card-title { font-size: 22px; font-weight: 800; letter-spacing: 1px; margin-top: 2px; }
                .card-subtitle { font-size: 10px; opacity: 0.8; margin-top: 2px; }
                .status-badge { padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: 700; white-space: nowrap; }
                .status-badge.eligible { background: #10b981; }
                .status-badge.ineligible { background: #dc2626; }
                
                .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px 20px; padding: 15px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
                .info-item { color: #334155; }
                .info-label { font-weight: 600; color: #64748b; margin-right: 8px; }
                
                .units-table { width: 100%; border-collapse: collapse; font-size: 11px; }
                .units-table th { background: #f1f5f9; padding: 10px 8px; text-align: left; font-weight: 700; border-bottom: 2px solid #cbd5e1; }
                .units-table td { padding: 10px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
                .text-center { text-align: center; }
                
                .signature-cell { padding: 5px 0; }
                .signature-line { width: 100%; height: 1px; background: #333; border-top: 1px solid #333; margin: 5px 0; }
                .signature-hint { font-size: 8px; color: #94a3b8; text-align: center; }
                .total-row { background: #f8fafc; font-weight: 600; border-top: 2px solid #cbd5e1; }
                .no-units { padding: 30px; text-align: center; color: #ef4444; font-size: 14px; }
                
                .signatures-row { display: flex; justify-content: space-between; padding: 15px 20px; gap: 20px; border-top: 1px solid #e2e8f0; background: white; }
                .signature { flex: 1; text-align: center; font-size: 11px; color: #475569; }
                .sign-line { border-top: 1px solid #334155; margin-bottom: 8px; padding-top: 12px; width: 100%; }
                
                .card-footer { padding: 15px 20px; background: #fefce8; border-top: 1px solid #e2e8f0; }
                .rules-header { font-weight: 700; font-size: 12px; color: #854d0e; margin-bottom: 10px; }
                .rules-list { margin-bottom: 15px; }
                .rule-item { font-size: 10px; color: #713f12; margin-bottom: 4px; }
                
                .student-signature-section { border-top: 1px dashed #e2e8f0; padding-top: 12px; margin-top: 5px; }
                .student-sign-line { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
                .student-label { font-weight: 600; font-size: 11px; color: #334155; }
                .signature-line-inline { display: inline-block; flex: 1; height: 1px; background: #333; border-top: 1px solid #333; }
                .student-declaration { font-size: 10px; color: #475569; margin: 10px 0; font-style: italic; }
                .student-date { font-size: 10px; color: #64748b; margin-top: 8px; }
                
                .action-buttons { display: flex; gap: 15px; justify-content: center; margin-top: 20px; }
                .download-btn, .print-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 24px; border: none; border-radius: 40px; font-weight: 600; font-size: 13px; cursor: pointer; }
                .download-btn { background: #059669; color: white; }
                .download-btn:hover { background: #047857; transform: scale(1.02); }
                .print-btn { background: #1e3a5f; color: white; }
                .print-btn:hover { background: #2c5a8c; transform: scale(1.02); }
                
                @media print {
                    body * { visibility: hidden; }
                    .exam-card-wrapper, .exam-card-wrapper * { visibility: visible; }
                    .exam-card-wrapper { position: absolute; top: 0; left: 0; width: 100%; margin: 0; padding: 10px; }
                    .action-buttons, button { display: none !important; }
                    .card-header { background: #1e3a5f !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .status-badge.eligible { background: #10b981 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .signature-line, .sign-line, .signature-line-inline { border-top: 1px solid #000 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
                
                @media (max-width: 600px) {
                    .info-grid { grid-template-columns: repeat(2, 1fr); gap: 6px 10px; padding: 10px 15px; }
                    .card-header { padding: 10px 15px; }
                    .card-logo { height: 40px; }
                    .card-title { font-size: 16px; }
                    .signatures-row { flex-direction: column; gap: 15px; }
                    .action-buttons { flex-direction: column; gap: 10px; padding: 0 10px; }
                    .download-btn, .print-btn { justify-content: center; width: 100%; }
                }
            `;
            document.head.appendChild(style);
        }
        
        showDemoCard() {
            if (!this.examCardContent) return;
            this.userProfile = CONFIG.DEMO_DATA;
            this.userBlock = CONFIG.DEMO_DATA.block;
            this.approvedUnits = CONFIG.DEMO_UNITS;
            this.displayExamCard();
        }
        
        showLoading() {
            if (this.examCardContent) {
                this.examCardContent.innerHTML = `
                    <div style="text-align:center; padding:30px;">
                        <div style="display:inline-block; width:30px; height:30px; border:3px solid #e2e8f0; border-top-color:#1e3a5f; border-radius:50%; animation:spin 0.6s linear infinite;"></div>
                        <p style="margin-top:10px; font-size:12px;">Loading exam card...</p>
                    </div>
                    <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
                `;
            }
        }
        
        refresh() {
            this.loaded = false;
            this.loadExamCard();
        }
    }
    
    window.examCardModule = new ExamCardModule();
    window.loadExamCard = () => window.examCardModule?.loadExamCard();
    window.printExamCard = () => window.examCardModule?.printExamCard();
    window.downloadExamCard = () => window.examCardModule?.downloadExamCardDirect();
    window.refreshExamCard = () => window.examCardModule?.refresh();
    
    console.log('✅ Exam Card module ready - Exact rules format!');
})();
