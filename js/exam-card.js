// js/exam-card.js - COMPACT v7.3 (FIXED: Download button opens print dialog for Save as PDF)

(function() {
    'use strict';
    
    // =====================================================
    // CONFIGURATION
    // =====================================================
    const CONFIG = {
        LOGO_URL: 'https://raw.githubusercontent.com/NCHSMlearning/e-learning/main/images/Logo_NCHSM.png',
        DEFAULT_CREDITS: 3,
        LOAD_DELAY: 500,
        PRINT_CLOSE_DELAY: 500,
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
        
        // ========== INITIALIZATION ==========
        init() {
            this.cacheElements();
            this.setupEventListeners();
            setTimeout(() => this.tryLoadIfLoggedIn(), CONFIG.LOAD_DELAY);
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
        
        // ========== DOWNLOAD AS PDF - Opens print dialog for Save as PDF ==========
        downloadExamCardAsPDF() {
            const cardElement = document.getElementById('exam-card-print-area');
            if (!cardElement) {
                alert('Exam card not found. Please refresh and try again.');
                return;
            }
            
            // Show loading state on button
            const downloadBtn = document.getElementById('downloadExamCardBtn');
            const originalText = downloadBtn?.innerHTML || 'Download PDF';
            if (downloadBtn) {
                downloadBtn.innerHTML = '⏳ Preparing...';
                downloadBtn.disabled = true;
            }
            
            // Get styles
            const styles = document.getElementById('exam-card-compact-styles')?.innerHTML || '';
            
            // Clone the card
            const cloneCard = cardElement.cloneNode(true);
            
            // Remove action buttons from clone
            const actionButtons = cloneCard.querySelectorAll('.action-buttons');
            actionButtons.forEach(btn => btn.remove());
            
            // Create print window content
            const printContent = `
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
                        .action-buttons, .download-btn, .print-btn {
                            display: none !important;
                        }
                        .exam-card-wrapper {
                            max-width: 800px;
                            margin: 0 auto;
                        }
                        @media print {
                            body {
                                padding: 0;
                                margin: 0;
                            }
                            .exam-card-wrapper {
                                margin: 0;
                                padding: 10px;
                            }
                            .card-header {
                                background: #1e3a5f !important;
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                            }
                            .status-badge.eligible {
                                background: #10b981 !important;
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                            }
                        }
                    </style>
                </head>
                <body>
                    ${cloneCard.outerHTML}
                    <script>
                        // Auto-trigger print dialog when window loads
                        window.onload = function() {
                            // Small delay to ensure rendering is complete
                            setTimeout(function() {
                                window.print();
                                // Close window after print dialog is closed
                                window.onafterprint = function() {
                                    window.close();
                                };
                                // Fallback close after 10 seconds if user doesn't close
                                setTimeout(function() {
                                    window.close();
                                }, 10000);
                            }, 500);
                        };
                    <\/script>
                </body>
                </html>
            `;
            
            // Open new window and write content
            const printWindow = window.open('', '_blank');
            printWindow.document.write(printContent);
            printWindow.document.close();
            
            // Reset button
            setTimeout(() => {
                if (downloadBtn) {
                    downloadBtn.innerHTML = originalText;
                    downloadBtn.disabled = false;
                }
            }, 2000);
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
                        .action-buttons, .download-btn, .print-btn {
                            display: none !important;
                        }
                        .exam-card-wrapper {
                            max-width: 800px;
                            margin: 0 auto;
                        }
                        @media print {
                            body {
                                padding: 0;
                                margin: 0;
                            }
                            .card-header {
                                background: #1e3a5f !important;
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                            }
                            .status-badge.eligible {
                                background: #10b981 !important;
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                            }
                        }
                    </style>
                </head>
                <body>
                    ${cloneCard.outerHTML}
                    <script>
                        window.onload = function() {
                            setTimeout(function() {
                                window.print();
                                setTimeout(function() {
                                    window.close();
                                }, 500);
                            }, 200);
                        };
                    <\/script>
                </body>
                </html>
            `);
            printWindow.document.close();
        }
        
        // ========== UI RENDERING ==========
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
                    <td class="signature-cell">____________</td>
                </tr>
            `).join('');
            
            const html = `
                <div class="exam-card-wrapper" id="exam-card-print-area">
                    <div class="exam-card-compact">
                        <div class="card-header">
                            <img src="${CONFIG.LOGO_URL}" alt="Logo" class="card-logo" onerror="this.style.display='none'">
                            <div class="header-text">
                                <div class="institution">NAKURU COLLEGE OF HEALTH SCIENCES AND MANAGEMENT</div>
                                <div class="card-title">EXAMINATION CARD</div>
                            </div>
                            <div class="status-badge ${isEligible ? 'eligible' : 'ineligible'}">
                                ${isEligible ? '✓ ELIGIBLE' : '✗ NOT ELIGIBLE'}
                            </div>
                        </div>
                        
                        <div class="info-grid">
                            <div class="info-item"><span class="info-label">Name:</span> ${this.escapeHtml(student?.full_name || 'Not Available')}</div>
                            <div class="info-item"><span class="info-label">ID:</span> ${this.escapeHtml(student?.student_id || 'N/A')}</div>
                            <div class="info-item"><span class="info-label">Program:</span> ${this.escapeHtml(student?.program || 'KRCHN')}</div>
                            <div class="info-item"><span class="info-label">Block:</span> <strong>${this.escapeHtml(currentBlock)}</strong></div>
                            <div class="info-item"><span class="info-label">Units:</span> ${approvedUnits.length} | Credits: ${totalCredits}</div>
                            <div class="info-item"><span class="info-label">Issued:</span> ${this.formatDate()}</div>
                        </div>
                        
                        ${approvedUnits.length > 0 ? `
                            <table class="units-table">
                                <thead>
                                    <tr>
                                        <th width="5%">#</th>
                                        <th width="20%">Code</th>
                                        <th width="45%">Unit Name</th>
                                        <th width="8%">Cr</th>
                                        <th width="22%">Lecturer's Sign</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${tableRows}
                                    <tr class="total-row">
                                        <td colspan="3"><strong>TOTAL</strong></td>
                                        <td class="text-center"><strong>${totalCredits}</strong></td>
                                        <td></td>
                                    </tr>
                                </tbody>
                            </table>
                        ` : '<div class="no-units">No approved units found</div>'}
                        
                        <div class="signatures-row">
                            <div class="signature"><div class="sign-line"></div><div>HOD Nursing</div></div>
                            <div class="signature"><div class="sign-line"></div><div>Principal</div></div>
                            <div class="signature"><div class="sign-line"></div><div>Finance Officer</div></div>
                        </div>
                        
                        <div class="card-footer">
                            <div class="rule-text">📌 Present at each exam | 🚫 No electronics | ⏰ Arrive 30 mins early</div>
                            <div class="student-sign">
                                <span>Student Signature: _________________</span>
                            </div>
                        </div>
                    </div>
                    
                    ${isEligible ? `
                        <div class="action-buttons">
                            <button class="download-btn" id="downloadExamCardBtn">📄 Save as PDF</button>
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
                    this.downloadExamCardAsPDF();
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
                .exam-card-wrapper {
                    max-width: 800px;
                    margin: 0 auto;
                    font-family: 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
                }
                .exam-card-compact {
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                }
                .card-header {
                    background: linear-gradient(135deg, #1e3a5f, #2c5a8c);
                    color: white;
                    padding: 12px 20px;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }
                .card-logo {
                    height: 50px;
                    width: auto;
                    background: white;
                    padding: 5px;
                    border-radius: 8px;
                    object-fit: contain;
                }
                .header-text {
                    flex: 1;
                }
                .institution {
                    font-size: 11px;
                    opacity: 0.9;
                    letter-spacing: 0.5px;
                }
                .card-title {
                    font-size: 18px;
                    font-weight: 800;
                    letter-spacing: 1px;
                    margin-top: 2px;
                }
                .status-badge {
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 11px;
                    font-weight: 700;
                    white-space: nowrap;
                }
                .status-badge.eligible {
                    background: #10b981;
                }
                .status-badge.ineligible {
                    background: #dc2626;
                }
                .info-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 8px 15px;
                    padding: 12px 20px;
                    background: #f8fafc;
                    border-bottom: 1px solid #e2e8f0;
                    font-size: 12px;
                }
                .info-item {
                    color: #334155;
                }
                .info-label {
                    font-weight: 600;
                    color: #64748b;
                    margin-right: 5px;
                }
                .units-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 11px;
                }
                .units-table th {
                    background: #f1f5f9;
                    padding: 8px 8px;
                    text-align: left;
                    font-weight: 700;
                    color: #1e293b;
                    border-bottom: 1px solid #e2e8f0;
                }
                .units-table td {
                    padding: 6px 8px;
                    border-bottom: 1px solid #f1f5f9;
                }
                .text-center {
                    text-align: center;
                }
                .signature-cell {
                    font-family: monospace;
                    font-size: 10px;
                    color: #94a3b8;
                }
                .total-row {
                    background: #f8fafc;
                    font-weight: 600;
                    border-top: 1px solid #e2e8f0;
                }
                .no-units {
                    padding: 20px;
                    text-align: center;
                    color: #ef4444;
                    font-size: 13px;
                }
                .signatures-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 12px 20px;
                    background: white;
                    border-top: 1px solid #e2e8f0;
                    gap: 15px;
                }
                .signature {
                    flex: 1;
                    text-align: center;
                    font-size: 10px;
                    color: #475569;
                }
                .sign-line {
                    border-top: 1px solid #334155;
                    margin-bottom: 6px;
                    padding-top: 4px;
                }
                .card-footer {
                    padding: 10px 20px;
                    background: #fefce8;
                    border-top: 1px solid #e2e8f0;
                    font-size: 10px;
                }
                .rule-text {
                    color: #854d0e;
                    margin-bottom: 8px;
                    text-align: center;
                }
                .student-sign {
                    display: flex;
                    justify-content: flex-end;
                    align-items: center;
                    padding-top: 5px;
                    border-top: 1px dashed #e2e8f0;
                }
                .action-buttons {
                    display: flex;
                    gap: 15px;
                    justify-content: center;
                    margin-top: 20px;
                }
                .download-btn, .print-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 24px;
                    border: none;
                    border-radius: 40px;
                    font-weight: 600;
                    font-size: 13px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    font-family: inherit;
                }
                .download-btn {
                    background: #059669;
                    color: white;
                }
                .download-btn:hover {
                    background: #047857;
                    transform: scale(1.02);
                }
                .print-btn {
                    background: #1e3a5f;
                    color: white;
                }
                .print-btn:hover {
                    background: #2c5a8c;
                    transform: scale(1.02);
                }
                .download-btn:disabled, .print-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                }
                @media print {
                    body * { visibility: hidden; }
                    .exam-card-wrapper, .exam-card-wrapper * { visibility: visible; }
                    .exam-card-wrapper { position: absolute; top: 0; left: 0; width: 100%; margin: 0; padding: 10px; }
                    .action-buttons, .download-btn, .print-btn { display: none !important; }
                    .card-header { background: #1e3a5f !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .status-badge.eligible { background: #10b981 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
                @media (max-width: 600px) {
                    .info-grid { grid-template-columns: repeat(2, 1fr); gap: 6px 10px; font-size: 11px; padding: 10px 15px; }
                    .card-header { padding: 10px 15px; gap: 10px; }
                    .card-logo { height: 40px; }
                    .card-title { font-size: 14px; }
                    .institution { font-size: 9px; }
                    .signatures-row { flex-direction: column; gap: 10px; }
                    .student-sign { justify-content: center; }
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
    window.downloadExamCardAsPDF = () => window.examCardModule?.downloadExamCardAsPDF();
    window.refreshExamCard = () => window.examCardModule?.refresh();
    
    console.log('✅ Exam Card module ready - Save as PDF button works!');
})();
