// js/exam-card.js - COMPACT v6 (Space Optimized)

(function() {
    'use strict';
    
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
            const events = ['appReady', 'profileLoaded', 'unitRegistrationReady'];
            events.forEach(event => {
                document.addEventListener(event, () => this.tryLoadIfLoggedIn());
            });
            
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
        
        displayExamCard() {
            if (!this.examCardContent) return;
            
            const student = this.userProfile;
            const approvedUnits = this.approvedUnits;
            const isEligible = approvedUnits.length > 0;
            const currentBlock = this.userBlock || student?.block || 'Current Block';
            
            // Calculate total credits
            const totalCredits = approvedUnits.reduce((sum, unit) => sum + (unit.credits || CONFIG.DEFAULT_CREDITS), 0);
            
            // Generate compact table rows
            const tableRows = approvedUnits.map((unit, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td><strong>${this.escapeHtml(unit.unit_code || unit.code || '')}</strong></td>
                    <td>${this.escapeHtml(unit.unit_name || unit.name || '')}</td>
                    <td class="text-center">${unit.credits || CONFIG.DEFAULT_CREDITS}</td>
                    <td class="signature-cell">____________</td>
                </tr>
            `).join('');
            
            const html = `
                <div class="exam-card-wrapper" id="exam-card-print-area">
                    <div class="exam-card-compact">
                        <!-- Header - Compact -->
                        <div class="card-header">
                            <img src="${CONFIG.LOGO_URL}" alt="Logo" class="card-logo">
                            <div class="header-text">
                                <div class="institution">NAKURU COLLEGE OF HEALTH SCIENCES</div>
                                <div class="card-title">EXAMINATION CARD</div>
                            </div>
                            <div class="status-badge ${isEligible ? 'eligible' : 'ineligible'}">
                                ${isEligible ? '✓ ELIGIBLE' : '✗ NOT ELIGIBLE'}
                            </div>
                        </div>
                        
                        <!-- Student Info - Grid Compact -->
                        <div class="info-grid">
                            <div class="info-item"><span class="info-label">Name:</span> ${this.escapeHtml(student?.full_name || 'Not Available')}</div>
                            <div class="info-item"><span class="info-label">ID:</span> ${this.escapeHtml(student?.student_id || 'N/A')}</div>
                            <div class="info-item"><span class="info-label">Program:</span> ${this.escapeHtml(student?.program || 'KRCHN')}</div>
                            <div class="info-item"><span class="info-label">Block:</span> <strong>${this.escapeHtml(currentBlock)}</strong></div>
                            <div class="info-item"><span class="info-label">Units:</span> ${approvedUnits.length} | Credits: ${totalCredits}</div>
                            <div class="info-item"><span class="info-label">Issued:</span> ${utils.formatDate()}</div>
                        </div>
                        
                        <!-- Units Table - Compact -->
                        ${approvedUnits.length > 0 ? `
                            <table class="units-table">
                                <thead>
                                    <tr>
                                        <th width="5%">#</th>
                                        <th width="20%">Code</th>
                                        <th width="50%">Unit Name</th>
                                        <th width="10%">Cr</th>
                                        <th width="15%">Sign</th>
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
                        
                        <!-- Signatures - 3 in one line -->
                        <div class="signatures-row">
                            <div class="signature"><div class="sign-line"></div><div>HOD Nursing</div></div>
                            <div class="signature"><div class="sign-line"></div><div>Principal</div></div>
                            <div class="signature"><div class="sign-line"></div><div>Finance Officer</div></div>
                        </div>
                        
                        <!-- Footer Rules - Single line -->
                        <div class="card-footer">
                            <div class="rule-text">📌 Present at each exam | 🚫 No electronics | ⏰ Arrive 30 mins early</div>
                            <div class="student-sign">
                                <span>Student Signature: _________________</span>
                                <span class="stamp">🔵 OFFICIAL STAMP</span>
                            </div>
                        </div>
                    </div>
                    
                    <button class="print-btn" id="printExamCardBtn">
                        🖨️ Print Card
                    </button>
                </div>
            `;
            
            this.examCardContent.innerHTML = html;
            this.addCompactStyles();
            
            const printBtn = document.getElementById('printExamCardBtn');
            if (printBtn && isEligible) {
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
                /* Compact Card Styles */
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
                
                /* Header */
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
                
                /* Info Grid */
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
                
                /* Units Table */
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
                
                .units-table tr:hover {
                    background: #faf5ff;
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
                
                /* Signatures Row */
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
                
                /* Footer */
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
                    justify-content: space-between;
                    align-items: center;
                    padding-top: 5px;
                    border-top: 1px dashed #e2e8f0;
                }
                
                .stamp {
                    color: #4C1D95;
                    font-weight: 600;
                    font-size: 9px;
                    border: 1px solid #4C1D95;
                    padding: 2px 8px;
                    border-radius: 4px;
                }
                
                /* Print Button */
                .print-btn {
                    display: block;
                    width: fit-content;
                    margin: 20px auto 0;
                    background: #1e3a5f;
                    color: white;
                    border: none;
                    padding: 10px 30px;
                    border-radius: 40px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 13px;
                    transition: all 0.2s;
                }
                
                .print-btn:hover {
                    background: #2c5a8c;
                    transform: scale(1.02);
                }
                
                /* PRINT STYLES */
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    
                    .exam-card-wrapper, .exam-card-wrapper * {
                        visibility: visible;
                    }
                    
                    .exam-card-wrapper {
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        margin: 0;
                        padding: 10px;
                    }
                    
                    .print-btn {
                        display: none;
                    }
                    
                    .exam-card-compact {
                        box-shadow: none;
                        border: 1px solid #ccc;
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
            `;
            document.head.appendChild(style);
        }
        
        printExamCard() {
            const printContent = document.getElementById('exam-card-print-area');
            if (!printContent) return;
            
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Exam Card - ${this.userProfile?.full_name || 'Student'}</title>
                    <meta charset="UTF-8">
                    <style>
                        * {
                            margin: 0;
                            padding: 0;
                            box-sizing: border-box;
                        }
                        body {
                            font-family: 'Segoe UI', Roboto, sans-serif;
                            padding: 20px;
                            background: white;
                        }
                        ${document.getElementById('exam-card-compact-styles')?.innerHTML || ''}
                        .print-btn { display: none; }
                    </style>
                </head>
                <body>
                    ${printContent.outerHTML}
                    <script>
                        window.onload = function() {
                            setTimeout(function() {
                                window.print();
                                window.close();
                            }, ${CONFIG.PRINT_CLOSE_DELAY});
                        };
                    <\/script>
                </body>
                </html>
            `);
            printWindow.document.close();
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
        
        escapeHtml(str) {
            return utils.escapeHtml(str);
        }
        
        refresh() {
            this.loaded = false;
            this.loadExamCard();
        }
    }
    
    // Initialize module
    window.examCardModule = new ExamCardModule();
    window.loadExamCard = () => window.examCardModule?.loadExamCard();
    window.printExamCard = () => window.examCardModule?.printExamCard();
    window.refreshExamCard = () => window.examCardModule?.refresh();
    
    console.log('✅ Compact Exam Card module ready');
})();
