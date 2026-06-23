// js/exam-card.js - v10.0 (Production ready - Full A4 optimized)

(function() {
    'use strict';
    
    const CONFIG = {
        LOGO_URL: 'https://raw.githubusercontent.com/NCHSMlearning/e-learning/main/images/Logo_NCHSM.png',
        DEFAULT_CREDITS: 3,
        LOAD_DELAY: 500,
        DB_TIMEOUT: 10000,
        MAX_UNITS_DISPLAY: 20,
        PDF_SCALE: 2.5,
        A4: {
            WIDTH_MM: 210,
            HEIGHT_MM: 297,
            MARGIN_MM: 20,
            DPI: 96,
            get PIXEL_WIDTH() { return this.WIDTH_MM * this.DPI / 25.4; },
            get PIXEL_HEIGHT() { return this.HEIGHT_MM * this.DPI / 25.4; }
        }
    };
    
    /**
     * @typedef {Object} UnitRegistration
     * @property {string} unit_code
     * @property {string} unit_name
     * @property {number} credits
     * @property {string} status
     */
    
    /**
     * @typedef {Object} PastExamRecord
     * @property {string} id
     * @property {string} period
     * @property {number} units
     * @property {number} credits
     * @property {string} date
     * @property {string} status
     * @property {Array<UnitRegistration>} units_list
     */
    
    class ExamCardModule {
        constructor() {
            // State
            this.approvedUnits = [];
            this.userProfile = null;
            this.loaded = false;
            this.userBlock = null;
            this.userId = null;
            this.isLoading = false;
            this.pastExamRecords = [];
            this._boundHandlers = {};
            
            // Initialize
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.init());
            } else {
                this.init();
            }
        }
        
        // ============================================
        // INITIALIZATION
        // ============================================
        
        init() {
            this.cacheElements();
            this.setupEventListeners();
            this.loadRequiredLibraries();
            this.loadPastExamRecords();
            setTimeout(() => this.tryLoadIfLoggedIn(), CONFIG.LOAD_DELAY);
        }
        
        cacheElements() {
            this.examCardContent = document.getElementById('exam-card-content-standalone');
            this.dashboardExamStatus = document.getElementById('dashboard-exam-status');
            this.dashboardApprovedUnits = document.getElementById('dashboard-approved-units');
        }
        
        setupEventListeners() {
            // Bound handlers for cleanup
            this._boundHandlers = {
                appReady: () => this.tryLoadIfLoggedIn(),
                profileLoaded: (e) => {
                    if (e.detail?.profile) {
                        this.userProfile = e.detail.profile;
                        this.updateUserData();
                        this.loadExamCard();
                    }
                },
                unitRegistrationReady: () => this.loadExamCard(),
                tabClick: () => setTimeout(() => this.loadExamCard(), 100)
            };
            
            document.addEventListener('appReady', this._boundHandlers.appReady);
            document.addEventListener('profileLoaded', this._boundHandlers.profileLoaded);
            document.addEventListener('unitRegistrationReady', this._boundHandlers.unitRegistrationReady);
            
            document.querySelectorAll('[data-tab="hub-exam-card"]').forEach(link => {
                link.addEventListener('click', this._boundHandlers.tabClick);
            });
            
            // Keyboard shortcuts
            document.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.key === 'p' && this.loaded) {
                    // Allow native print dialog
                }
            });
        }
        
        destroy() {
            // Cleanup event listeners
            document.removeEventListener('appReady', this._boundHandlers.appReady);
            document.removeEventListener('profileLoaded', this._boundHandlers.profileLoaded);
            document.removeEventListener('unitRegistrationReady', this._boundHandlers.unitRegistrationReady);
            
            document.querySelectorAll('[data-tab="hub-exam-card"]').forEach(link => {
                link.removeEventListener('click', this._boundHandlers.tabClick);
            });
            
            // Clear references for GC
            this.approvedUnits = [];
            this.userProfile = null;
            this.pastExamRecords = [];
            this.examCardContent = null;
        }
        
        // ============================================
        // UTILITY FUNCTIONS
        // ============================================
        
        cleanText(str) {
            if (!str) return '';
            return str.replace(/&amp;/g, '&')
                      .replace(/&#x27;/g, "'")
                      .replace(/&quot;/g, '"')
                      .replace(/&lt;/g, '<')
                      .replace(/&gt;/g, '>')
                      .replace(/&amp;amp;/g, '&')
                      .replace(/&amp;quot;/g, '"')
                      .replace(/&amp;#x27;/g, "'")
                      .trim();
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
        
        isExamOver() {
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            
            const examEndDates = {
                'Trimester 1': new Date(currentYear, 5, 30),
                'Trimester 2': new Date(currentYear, 9, 30),
                'Trimester 3': new Date(currentYear + 1, 1, 28)
            };
            
            const period = this.getExamPeriod();
            let endDate;
            
            if (period.includes('Trimester 1')) {
                endDate = examEndDates['Trimester 1'];
            } else if (period.includes('Trimester 2')) {
                endDate = examEndDates['Trimester 2'];
            } else {
                endDate = examEndDates['Trimester 3'];
            }
            
            return now > endDate;
        }
        
        // ============================================
        // LIBRARY LOADING
        // ============================================
        
        loadRequiredLibraries() {
            const libraries = [
                { name: 'html2canvas', url: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', check: () => typeof html2canvas !== 'undefined' },
                { name: 'jspdf', url: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', check: () => typeof jspdf !== 'undefined' }
            ];
            
            libraries.forEach(lib => {
                if (!lib.check()) {
                    const script = document.createElement('script');
                    script.src = lib.url;
                    script.async = true;
                    document.head.appendChild(script);
                }
            });
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
        
        // ============================================
        // USER PROFILE MANAGEMENT
        // ============================================
        
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
        
        tryLoadIfLoggedIn() {
            const profile = this.getUserProfileFromSources();
            if (profile) {
                this.userProfile = profile;
                this.updateUserData();
                this.loadExamCard();
            } else {
                this.showLoginMessage();
            }
        }
        
        // ============================================
        // DATA FETCHING
        // ============================================
        
        async loadExamCard() {
            if (this.isLoading) return;
            if (!this.userProfile) { 
                this.tryLoadIfLoggedIn();
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
                    this.showNoUnitsMessage();
                }
            } catch (error) {
                console.warn('Failed to load exam card:', error);
                this.showErrorMessage();
            } finally {
                this.isLoading = false;
            }
        }
        
        async loadApprovedUnitsFromDB() {
            const supabase = window.db?.supabase || window.supabase;
            if (!supabase) {
                console.warn('Supabase not available');
                return false;
            }
            
            try {
                // Get actual user ID
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
                
                // Fetch with timeout
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Database timeout')), CONFIG.DB_TIMEOUT)
                );
                
                const fetchPromise = supabase
                    .from('student_unit_registrations')
                    .select('*')
                    .eq('student_id', actualUserId)
                    .eq('status', 'approved');
                
                const result = await Promise.race([fetchPromise, timeoutPromise]);
                const { data, error } = result;
                
                if (error) throw error;
                
                this.approvedUnits = data || [];
                return true;
            } catch (error) {
                console.error('DB error:', error);
                this.showError(`Database error: ${error.message || 'Unknown error'}`);
                return false;
            }
        }
        
        async loadPastExamRecords() {
            try {
                const supabase = window.db?.supabase || window.supabase;
                if (!supabase) return;
                
                const { data, error } = await supabase
                    .from('past_exam_records')
                    .select('*')
                    .eq('student_id', this.userId)
                    .order('created_at', { ascending: false })
                    .limit(10);
                
                if (!error && data) {
                    this.pastExamRecords = data;
                    this.displayPastExams();
                }
            } catch (error) {
                // Silently fail - not critical
                console.debug('Past exams not available:', error);
            }
        }
        
        // ============================================
        // UI UPDATES
        // ============================================
        
        async updateDashboard() {
            const approvedCount = this.approvedUnits.length;
            const examOver = this.isExamOver();
            
            if (this.dashboardExamStatus) {
                if (examOver) {
                    this.dashboardExamStatus.textContent = 'COMPLETED ✓';
                    this.dashboardExamStatus.style.color = '#059669';
                } else {
                    this.dashboardExamStatus.textContent = approvedCount > 0 ? 'ELIGIBLE' : 'NOT ELIGIBLE';
                    this.dashboardExamStatus.style.color = approvedCount > 0 ? '#059669' : '#dc2626';
                }
            }
            if (this.dashboardApprovedUnits) {
                this.dashboardApprovedUnits.textContent = approvedCount;
            }
        }
        
        showLoginMessage() {
            if (this.examCardContent) {
                this.examCardContent.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #64748b;">
                        <div style="font-size: 48px; margin-bottom: 16px;">🔒</div>
                        <h3 style="color: #1e3a5f;">Please Login</h3>
                        <p>You need to be logged in to view your exam card.</p>
                    </div>
                `;
            }
        }
        
        showLoading() {
            if (this.examCardContent) {
                this.examCardContent.innerHTML = `
                    <div style="text-align:center; padding:30px;">
                        <div style="display:inline-block; width:30px; height:30px; border:3px solid #e2e8f0; border-top-color:#1e3a5f; border-radius:50%; animation:spin 0.6s linear infinite;"></div>
                        <p style="margin-top:10px; font-size:12px; color:#64748b;">Loading exam card...</p>
                    </div>
                    <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
                `;
            }
        }
        
        showNoUnitsMessage() {
            if (this.examCardContent) {
                this.examCardContent.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #64748b;">
                        <div style="font-size: 48px; margin-bottom: 16px;">📋</div>
                        <h3 style="color: #1e3a5f;">No Approved Units</h3>
                        <p>You don't have any approved units for this exam period.</p>
                        <p style="font-size: 13px; margin-top: 8px;">Please contact the academic office for assistance.</p>
                    </div>
                `;
            }
        }
        
        showErrorMessage() {
            if (this.examCardContent) {
                this.examCardContent.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #64748b;">
                        <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                        <h3 style="color: #dc2626;">Error Loading Exam Card</h3>
                        <p>Unable to load your exam card at this time.</p>
                        <button onclick="window.examCardModule?.loadExamCard()" style="
                            margin-top: 16px;
                            padding: 8px 24px;
                            background: #1e3a5f;
                            color: white;
                            border: none;
                            border-radius: 8px;
                            cursor: pointer;
                            font-weight: 500;
                        ">Retry</button>
                    </div>
                `;
            }
        }
        
        showError(message) {
            if (this.examCardContent) {
                this.examCardContent.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #64748b;">
                        <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
                        <h3 style="color: #dc2626;">Error</h3>
                        <p>${this.cleanText(message)}</p>
                        <button onclick="window.examCardModule?.loadExamCard()" style="
                            margin-top: 16px;
                            padding: 8px 24px;
                            background: #1e3a5f;
                            color: white;
                            border: none;
                            border-radius: 8px;
                            cursor: pointer;
                            font-weight: 500;
                        ">Retry</button>
                    </div>
                `;
            }
        }
        
        // ============================================
        // EXAM CARD DISPLAY
        // ============================================
        
        displayExamCard() {
            if (!this.examCardContent) return;
            
            const student = this.userProfile;
            const approvedUnits = this.approvedUnits;
            const isEligible = approvedUnits.length > 0;
            const examOver = this.isExamOver();
            const currentBlock = this.userBlock || student?.block || 'Current Block';
            
            const totalCredits = approvedUnits.reduce((sum, unit) => sum + (unit.credits || CONFIG.DEFAULT_CREDITS), 0);
            
            // Calculate optimal table height for A4
            const unitCount = approvedUnits.length;
            const needsCompression = unitCount > CONFIG.MAX_UNITS_DISPLAY;
            
            // Build table rows with compression if needed
            let tableRows = '';
            let displayUnits = approvedUnits;
            let compressedCount = 0;
            
            if (needsCompression) {
                displayUnits = approvedUnits.slice(0, CONFIG.MAX_UNITS_DISPLAY);
                compressedCount = approvedUnits.length - CONFIG.MAX_UNITS_DISPLAY;
            }
            
            tableRows = displayUnits.map((unit, index) => {
                const unitName = this.cleanText(unit.unit_name || unit.name || '');
                const unitCode = this.cleanText(unit.unit_code || unit.code || '');
                return `
                    <tr>
                        <td class="text-center">${index + 1}</td>
                        <td><strong>${unitCode}</strong></td>
                        <td>${unitName}</td>
                        <td class="text-center">${unit.credits || CONFIG.DEFAULT_CREDITS}</td>
                        <td class="signature-cell">
                            <div class="signature-line"></div>
                        </td>
                    </tr>
                `;
            }).join('');
            
            // Add compression row if needed
            if (compressedCount > 0) {
                tableRows += `
                    <tr class="compressed-row">
                        <td colspan="5" style="text-align:center; font-style:italic; color:#64748b; padding:8px; background:#f8fafc;">
                            + ${compressedCount} more ${compressedCount === 1 ? 'unit' : 'units'} registered
                        </td>
                    </tr>
                `;
            }
            
            // Status badge
            let statusBadge = '';
            if (examOver) {
                statusBadge = `<div class="status-badge completed">✅ COMPLETED</div>`;
            } else {
                statusBadge = `<div class="status-badge ${isEligible ? 'eligible' : 'ineligible'}">
                    ${isEligible ? '✅ ELIGIBLE' : '❌ NOT ELIGIBLE'}
                </div>`;
            }
            
            // Build the HTML
            const html = `
                <div class="exam-card-wrapper" id="exam-card-print-area">
                    <div class="exam-card-compact" role="region" aria-label="Examination Card">
                        <!-- Header -->
                        <div class="card-header">
                            <img src="${CONFIG.LOGO_URL}" alt="NCHSM Logo" class="card-logo" onerror="this.style.display='none'">
                            <div class="header-text">
                                <div class="institution">NAKURU COLLEGE OF HEALTH SCIENCES AND MANAGEMENT</div>
                                <div class="card-title">EXAMINATION CARD</div>
                                <div class="card-subtitle">${examOver ? '(Historical Record)' : '(Exam Entry Permit)'}</div>
                            </div>
                            ${statusBadge}
                        </div>
                        
                        <!-- Info Grid -->
                        <div class="info-grid">
                            <div class="info-item"><span class="info-label">Name:</span> ${this.cleanText(student?.full_name || 'Not Available')}</div>
                            <div class="info-item"><span class="info-label">REG NO.:</span> ${this.cleanText(student?.student_id || 'N/A')}</div>
                            <div class="info-item"><span class="info-label">Program:</span> ${this.cleanText(student?.program || 'N/A')}</div>
                            <div class="info-item"><span class="info-label">Current Block:</span> <strong>${this.cleanText(currentBlock)}</strong></div>
                            <div class="info-item"><span class="info-label">Registered Units:</span> <strong>${approvedUnits.length}</strong></div>
                            <div class="info-item"><span class="info-label">Total Credits:</span> <strong>${totalCredits}</strong></div>
                            <div class="info-item"><span class="info-label">Exam Period:</span> ${this.getExamPeriod()}</div>
                            <div class="info-item"><span class="info-label">Date Issued:</span> ${this.formatDate()}</div>
                            <div class="info-item"><span class="info-label">Valid Until:</span> ${examOver ? 'Completed' : 'End of Exam Period'}</div>
                        </div>
                        
                        <!-- Units Table -->
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
                        
                        <!-- Signatures -->
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
                        
                        <!-- Footer -->
                        <div class="card-footer">
                            <div class="rules-header">📋 EXAMINATION RULES & REGULATIONS</div>
                            <div class="rules-list">
                                <div class="rule-item">• Present your exam card at each examination hall</div>
                                <div class="rule-item">• No electronic devices allowed in examination room</div>
                                <div class="rule-item">• Arrive 30 minutes before examination start time</div>
                                <div class="rule-item">• Mobile phones must be switched off and stored</div>
                                <div class="rule-item">• No unauthorized materials allowed</div>
                            </div>
                            
                            <div class="student-section">
                                <div class="student-declaration">
                                    I hereby confirm that I have read and understood the examination rules and regulations.
                                </div>
                                
                                <div class="student-sign-line">
                                    <span class="student-label">Student Signature:</span>
                                    <span class="signature-line-inline"></span>
                                    <span class="student-date">Date: ${this.formatDate()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    ${!examOver && isEligible ? `
                        <div class="action-buttons">
                            <button class="download-btn" id="downloadExamCardBtn" aria-label="Download PDF">
                                📥 Download PDF
                            </button>
                            <button class="print-btn" id="printExamCardBtn" aria-label="Print Card">
                                🖨️ Print Card
                            </button>
                            <button class="preview-btn" id="previewExamCardBtn" aria-label="Preview A4">
                                👁️ A4 Preview
                            </button>
                        </div>
                    ` : ''}
                    
                    ${examOver ? `
                        <div style="text-align: center; margin-top: 12px; font-size: 11px; color: #64748b;">
                            📜 This is a historical record from the ${this.getExamPeriod()}
                        </div>
                    ` : ''}
                </div>
            `;
            
            this.examCardContent.innerHTML = html;
            this.addCompactStyles();
            
            // Setup buttons
            this.setupActionButtons();
            
            // Load past exams
            this.loadPastExamRecords();
        }
        
        setupActionButtons() {
            const downloadBtn = document.getElementById('downloadExamCardBtn');
            const printBtn = document.getElementById('printExamCardBtn');
            const previewBtn = document.getElementById('previewExamCardBtn');
            
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
            
            if (previewBtn) {
                previewBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.previewA4();
                });
            }
        }
        
        // ============================================
        // STYLES
        // ============================================
        
        addCompactStyles() {
            const existingStyle = document.getElementById('exam-card-compact-styles');
            if (existingStyle) existingStyle.remove();
            
            const style = document.createElement('style');
            style.id = 'exam-card-compact-styles';
            style.textContent = `
                /* Base Styles */
                .exam-card-wrapper { 
                    max-width: 850px; 
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
                    padding: 15px 20px; 
                    display: flex; 
                    align-items: center; 
                    gap: 15px; 
                }
                .card-logo { 
                    height: 55px; 
                    width: auto; 
                    background: white; 
                    padding: 5px; 
                    border-radius: 8px; 
                    object-fit: contain; 
                }
                .header-text { flex: 1; }
                .institution { 
                    font-size: 12px; 
                    opacity: 0.9; 
                    letter-spacing: 0.5px; 
                }
                .card-title { 
                    font-size: 22px; 
                    font-weight: 800; 
                    letter-spacing: 1px; 
                    margin-top: 2px; 
                }
                .card-subtitle { 
                    font-size: 10px; 
                    opacity: 0.8; 
                    margin-top: 2px; 
                }
                .status-badge { 
                    padding: 5px 15px; 
                    border-radius: 20px; 
                    font-size: 12px; 
                    font-weight: 700; 
                    white-space: nowrap; 
                }
                .status-badge.eligible { background: #10b981; }
                .status-badge.ineligible { background: #dc2626; }
                .status-badge.completed { background: #059669; }
                
                /* Info Grid */
                .info-grid { 
                    display: grid; 
                    grid-template-columns: repeat(3, 1fr); 
                    gap: 10px 20px; 
                    padding: 15px 20px; 
                    background: #f8fafc; 
                    border-bottom: 1px solid #e2e8f0; 
                    font-size: 12px; 
                }
                .info-item { color: #334155; }
                .info-label { 
                    font-weight: 600; 
                    color: #64748b; 
                    margin-right: 8px; 
                }
                
                /* Units Table */
                .units-table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    font-size: 11px; 
                }
                .units-table th { 
                    background: #f1f5f9; 
                    padding: 10px 8px; 
                    text-align: left; 
                    font-weight: 700; 
                    border-bottom: 2px solid #cbd5e1; 
                }
                .units-table td { 
                    padding: 10px 8px; 
                    border-bottom: 1px solid #e2e8f0; 
                    vertical-align: top; 
                }
                .text-center { text-align: center; }
                
                .signature-cell { padding: 5px 0; }
                .signature-line { 
                    width: 90%; 
                    margin: 8px auto; 
                    border-top: 1px solid #333; 
                }
                
                .total-row { 
                    background: #f8fafc; 
                    font-weight: 600; 
                    border-top: 2px solid #cbd5e1; 
                }
                .compressed-row td {
                    font-style: italic;
                    color: #64748b;
                    background: #f8fafc;
                }
                .no-units { 
                    padding: 30px; 
                    text-align: center; 
                    color: #ef4444; 
                    font-size: 14px; 
                }
                
                /* Signatures */
                .signatures-row { 
                    display: flex; 
                    justify-content: space-between; 
                    padding: 15px 20px; 
                    gap: 20px; 
                    border-top: 1px solid #e2e8f0; 
                    background: white; 
                }
                .signature { 
                    flex: 1; 
                    text-align: center; 
                    font-size: 11px; 
                    color: #475569; 
                }
                .sign-line { 
                    width: 80%; 
                    margin: 8px auto; 
                    border-top: 1px solid #334155; 
                    padding-top: 12px; 
                }
                
                /* Footer */
                .card-footer { 
                    padding: 15px 20px; 
                    background: #fefce8; 
                    border-top: 1px solid #e2e8f0; 
                }
                .rules-header { 
                    font-weight: 700; 
                    font-size: 12px; 
                    color: #854d0e; 
                    margin-bottom: 10px; 
                }
                .rules-list { margin-bottom: 15px; }
                .rule-item { 
                    font-size: 10px; 
                    color: #713f12; 
                    margin-bottom: 4px; 
                }
                
                .student-section { 
                    border-top: 1px dashed #e2e8f0; 
                    padding-top: 12px; 
                    margin-top: 5px; 
                }
                .student-declaration { 
                    font-size: 10px; 
                    color: #475569; 
                    margin: 10px 0; 
                    text-align: center; 
                }
                .student-sign-line { 
                    display: flex; 
                    align-items: center; 
                    gap: 10px; 
                    margin: 12px 0 8px 0; 
                }
                .student-label { 
                    font-weight: 600; 
                    font-size: 11px; 
                    color: #334155; 
                    min-width: 110px; 
                }
                .student-date {
                    font-size: 11px;
                    color: #64748b;
                    margin-left: auto;
                }
                .signature-line-inline { 
                    display: inline-block; 
                    flex: 1; 
                    border-top: 1px solid #333; 
                    max-width: 60%; 
                }
                
                /* Action Buttons */
                .action-buttons { 
                    display: flex; 
                    gap: 15px; 
                    justify-content: center; 
                    margin-top: 20px; 
                }
                .download-btn, .print-btn, .preview-btn { 
                    display: inline-flex; 
                    align-items: center; 
                    gap: 8px; 
                    padding: 10px 24px; 
                    border: none; 
                    border-radius: 40px; 
                    font-weight: 600; 
                    font-size: 13px; 
                    cursor: pointer; 
                    transition: all 0.2s;
                }
                .download-btn { background: #059669; color: white; }
                .download-btn:hover { background: #047857; transform: scale(1.02); }
                .print-btn { background: #1e3a5f; color: white; }
                .print-btn:hover { background: #2c5a8c; transform: scale(1.02); }
                .preview-btn { background: #6b7280; color: white; }
                .preview-btn:hover { background: #4b5563; transform: scale(1.02); }
                
                /* Print Styles */
                @media print {
                    body * { visibility: hidden; }
                    .exam-card-wrapper, .exam-card-wrapper * { visibility: visible; }
                    .exam-card-wrapper { 
                        position: absolute; 
                        top: 0; 
                        left: 0; 
                        width: 100%; 
                        margin: 0; 
                        padding: 10px; 
                    }
                    .action-buttons, button { display: none !important; }
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
                    .status-badge.completed { 
                        background: #059669 !important; 
                        -webkit-print-color-adjust: exact; 
                        print-color-adjust: exact; 
                    }
                    .signature-line, .sign-line, .signature-line-inline { 
                        width: 80% !important;
                        margin: 8px auto !important;
                        border-top: 2px solid #000 !important;
                        -webkit-print-color-adjust: exact; 
                        print-color-adjust: exact; 
                    }
                    .signature-cell .signature-line {
                        width: 90% !important;
                        margin: 8px auto !important;
                    }
                    .exam-card-compact {
                        border: 1px solid #000 !important;
                        border-radius: 0 !important;
                    }
                }
                
                /* Responsive */
                @media (max-width: 600px) {
                    .info-grid { 
                        grid-template-columns: repeat(2, 1fr); 
                        gap: 6px 10px; 
                        padding: 10px 15px; 
                    }
                    .card-header { 
                        padding: 10px 15px; 
                        gap: 10px; 
                    }
                    .card-logo { height: 40px; }
                    .card-title { font-size: 16px; }
                    .signatures-row { 
                        flex-direction: column; 
                        gap: 15px; 
                    }
                    .action-buttons { 
                        flex-direction: column; 
                        gap: 10px; 
                        padding: 0 10px; 
                    }
                    .download-btn, .print-btn, .preview-btn { 
                        justify-content: center; 
                        width: 100%; 
                    }
                    .student-sign-line {
                        flex-wrap: wrap;
                    }
                    .student-date {
                        margin-left: 0;
                        width: 100%;
                        text-align: center;
                    }
                }
                
                /* Preview Modal */
                .preview-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    padding: 20px;
                }
                .preview-modal {
                    background: white;
                    border-radius: 12px;
                    padding: 20px;
                    max-width: 90vw;
                    max-height: 90vh;
                    overflow: auto;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                }
                .preview-modal .exam-card-compact {
                    max-width: 794px;
                    margin: 0 auto;
                }
                .preview-close {
                    position: sticky;
                    top: 0;
                    float: right;
                    background: none;
                    border: none;
                    font-size: 32px;
                    cursor: pointer;
                    color: #94a3b8;
                    z-index: 10;
                }
                .preview-close:hover {
                    color: #1e293b;
                }
            `;
            document.head.appendChild(style);
        }
        
        // ============================================
        // PAST EXAM RECORDS
        // ============================================
        
        displayPastExams() {
            if (this.pastExamRecords.length === 0) return;
            
            const tableRows = this.pastExamRecords.map((record, index) => {
                return `
                    <tr>
                        <td style="padding: 8px 10px; text-align: center; border-bottom: 1px solid #e2e8f0;">${index + 1}</td>
                        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0;">${this.cleanText(record.period || record.exam_period || 'N/A')}</td>
                        <td style="padding: 8px 10px; text-align: center; border-bottom: 1px solid #e2e8f0;">${record.units || record.total_units || 0}</td>
                        <td style="padding: 8px 10px; text-align: center; border-bottom: 1px solid #e2e8f0;">${record.credits || record.total_credits || 0}</td>
                        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0;">${this.formatDate(new Date(record.date || record.completed_date || Date.now()))}</td>
                        <td style="padding: 8px 10px; text-align: center; border-bottom: 1px solid #e2e8f0;">
                            <span style="background: #059669; color: white; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: 600;">
                                ${record.status || 'Completed'}
                            </span>
                        </td>
                        <td style="padding: 8px 10px; text-align: center; border-bottom: 1px solid #e2e8f0;">
                            <button class="view-exam-btn" data-exam-id="${record.id}" style="
                                background: #1e3a5f;
                                color: white;
                                border: none;
                                padding: 4px 14px;
                                border-radius: 20px;
                                font-size: 11px;
                                cursor: pointer;
                                font-weight: 500;
                                transition: all 0.2s;
                            ">
                                📄 View
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
            
            const pastExamsHTML = `
                <div class="past-exams-section" style="margin-top: 30px; border-top: 2px solid #e2e8f0; padding-top: 20px;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                        <h3 style="font-size: 16px; color: #1e3a5f; margin: 0;">
                            📚 Past Exam Records
                        </h3>
                        <span style="background: #e2e8f0; color: #475569; padding: 2px 10px; border-radius: 12px; font-size: 11px;">
                            ${this.pastExamRecords.length} records
                        </span>
                    </div>
                    <div style="overflow-x: auto;">
                        <table style="
                            width: 100%;
                            border-collapse: collapse;
                            font-size: 12px;
                            background: white;
                            border-radius: 8px;
                            overflow: hidden;
                            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
                        ">
                            <thead>
                                <tr style="background: #f1f5f9;">
                                    <th style="padding: 10px 10px; text-align: center; font-weight: 600; border-bottom: 2px solid #cbd5e1;">#</th>
                                    <th style="padding: 10px 10px; text-align: left; font-weight: 600; border-bottom: 2px solid #cbd5e1;">Exam Period</th>
                                    <th style="padding: 10px 10px; text-align: center; font-weight: 600; border-bottom: 2px solid #cbd5e1;">Units</th>
                                    <th style="padding: 10px 10px; text-align: center; font-weight: 600; border-bottom: 2px solid #cbd5e1;">Credits</th>
                                    <th style="padding: 10px 10px; text-align: left; font-weight: 600; border-bottom: 2px solid #cbd5e1;">Date</th>
                                    <th style="padding: 10px 10px; text-align: center; font-weight: 600; border-bottom: 2px solid #cbd5e1;">Status</th>
                                    <th style="padding: 10px 10px; text-align: center; font-weight: 600; border-bottom: 2px solid #cbd5e1;">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tableRows}
                            </tbody>
                        </table>
                    </div>
                    <div style="margin-top: 10px; font-size: 11px; color: #94a3b8; text-align: center;">
                        Click "View" to see the full exam card for each past period
                    </div>
                </div>
            `;
            
            const examCardWrapper = document.querySelector('.exam-card-wrapper');
            if (examCardWrapper) {
                const existingPast = examCardWrapper.querySelector('.past-exams-section');
                if (existingPast) existingPast.remove();
                
                const pastSection = document.createElement('div');
                pastSection.className = 'past-exams-section';
                pastSection.innerHTML = pastExamsHTML;
                examCardWrapper.appendChild(pastSection);
                
                pastSection.querySelectorAll('.view-exam-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const examId = btn.dataset.examId;
                        this.viewPastExam(examId);
                    });
                    
                    btn.addEventListener('mouseenter', () => {
                        btn.style.background = '#2c5a8c';
                        btn.style.transform = 'scale(1.02)';
                    });
                    btn.addEventListener('mouseleave', () => {
                        btn.style.background = '#1e3a5f';
                        btn.style.transform = 'scale(1)';
                    });
                });
            }
        }
        
        // ============================================
        // PAST EXAM VIEWER
        // ============================================
        
        viewPastExam(examId) {
            const record = this.pastExamRecords.find(r => r.id == examId);
            if (!record) {
                alert('Record not found');
                return;
            }
            
            // Build units list for past exam
            let unitsList = '';
            const units = record.units_list || [];
            if (units.length > 0) {
                unitsList = units.map((unit, i) => `
                    <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f1f5f9; font-size: 12px;">
                        <span>${i + 1}. ${this.cleanText(unit.unit_code || '')} - ${this.cleanText(unit.unit_name || '')}</span>
                        <span style="font-weight: 600;">${unit.credits || 0} cr</span>
                    </div>
                `).join('');
            }
            
            const modal = document.createElement('div');
            modal.className = 'preview-overlay';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-label', 'Past Exam Record');
            
            modal.innerHTML = `
                <div class="preview-modal">
                    <button class="preview-close" aria-label="Close">×</button>
                    
                    <h3 style="color: #1e3a5f; margin: 0 0 20px 0; font-size: 18px;">
                        📄 Past Exam Record
                    </h3>
                    
                    <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px;">
                            <div><strong style="color: #64748b;">Period:</strong> ${this.cleanText(record.period || record.exam_period || 'N/A')}</div>
                            <div><strong style="color: #64748b;">Units Registered:</strong> ${record.units || record.total_units || 0}</div>
                            <div><strong style="color: #64748b;">Total Credits:</strong> ${record.credits || record.total_credits || 0}</div>
                            <div><strong style="color: #64748b;">Date:</strong> ${this.formatDate(new Date(record.date || record.completed_date || Date.now()))}</div>
                            <div style="grid-column: span 2;"><strong style="color: #64748b;">Status:</strong> <span style="color: #059669; font-weight: 600;">${record.status || 'Completed'}</span></div>
                        </div>
                    </div>
                    
                    ${unitsList ? `
                        <div style="margin-bottom: 16px;">
                            <h4 style="font-size: 13px; color: #1e3a5f; margin: 0 0 8px 0;">📋 Units Registered</h4>
                            <div style="background: #f8fafc; border-radius: 8px; padding: 12px; max-height: 300px; overflow-y: auto;">
                                ${unitsList}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <button onclick="this.closest('.preview-overlay').remove()" style="
                            flex: 1;
                            padding: 10px;
                            border: 1px solid #e2e8f0;
                            border-radius: 8px;
                            background: white;
                            cursor: pointer;
                            font-weight: 500;
                            min-width: 100px;
                        ">Close</button>
                        <button onclick="window.examCardModule.downloadPastExamPDF('${examId}')" style="
                            flex: 1;
                            padding: 10px;
                            border: none;
                            border-radius: 8px;
                            background: #1e3a5f;
                            color: white;
                            cursor: pointer;
                            font-weight: 500;
                            min-width: 100px;
                        ">📥 Download PDF</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });
            
            modal.querySelector('.preview-close').addEventListener('click', () => {
                modal.remove();
            });
            
            modal.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') modal.remove();
            });
        }
        
        // ============================================
        // PDF GENERATION
        // ============================================
        
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
                
                const cloneCard = this.prepareCardForPrint(cardElement);
                
                // Calculate optimal scale based on content for A4
                const scale = this.calculateOptimalScale(cloneCard);
                
                const tempContainer = this.createTempContainer(cloneCard);
                document.body.appendChild(tempContainer);
                
                await new Promise(resolve => setTimeout(resolve, 300));
                
                const canvas = await html2canvas(cloneCard, {
                    scale: scale,
                    backgroundColor: '#ffffff',
                    logging: false,
                    useCORS: true,
                    allowTaint: false,
                    width: CONFIG.A4.PIXEL_WIDTH,
                    height: CONFIG.A4.PIXEL_HEIGHT,
                });
                
                document.body.removeChild(tempContainer);
                
                const { jsPDF } = window.jspdf;
                const imgData = canvas.toDataURL('image/png', 1.0);
                
                const margin = CONFIG.A4.MARGIN_MM;
                const imgWidth = CONFIG.A4.WIDTH_MM - (margin * 2);
                const pageHeight = CONFIG.A4.HEIGHT_MM;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                
                const pdf = new jsPDF('p', 'mm', 'a4');
                
                pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
                
                // Handle multi-page if content overflows
                if (imgHeight > (pageHeight - margin * 2)) {
                    let position = -(pageHeight - margin * 2);
                    let heightLeft = imgHeight - (pageHeight - margin * 2);
                    while (heightLeft > 0) {
                        pdf.addPage();
                        pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
                        position -= (pageHeight - margin * 2);
                        heightLeft -= (pageHeight - margin * 2);
                    }
                }
                
                // Add footer note for historical records
                if (this.isExamOver()) {
                    pdf.setFontSize(8);
                    pdf.setTextColor(100, 100, 100);
                    pdf.text('This is a historical record of units registered for this exam period', margin + 5, pageHeight - 10);
                }
                
                const studentName = this.userProfile?.full_name || 'Student';
                const safeName = studentName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const date = this.formatDate().replace(/[, ]/g, '_');
                const suffix = this.isExamOver() ? '_historical_record' : '';
                pdf.save(`Exam_Card_${safeName}_${date}${suffix}.pdf`);
                
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
        
        calculateOptimalScale(element) {
            const contentHeight = element.scrollHeight;
            const contentWidth = element.scrollWidth;
            const maxHeight = CONFIG.A4.PIXEL_HEIGHT * 1.1; // 10% buffer
            const maxWidth = CONFIG.A4.PIXEL_WIDTH * 1.1;
            
            let scale = CONFIG.PDF_SCALE;
            
            if (contentHeight > maxHeight || contentWidth > maxWidth) {
                const heightScale = maxHeight / contentHeight;
                const widthScale = maxWidth / contentWidth;
                scale = Math.min(heightScale, widthScale, 3);
            }
            
            return Math.max(scale, 1.5); // Minimum scale
        }
        
        prepareCardForPrint(cardElement) {
            const cloneCard = cardElement.cloneNode(true);
            
            // Remove action buttons
            const actionButtons = cloneCard.querySelectorAll('.action-buttons');
            actionButtons.forEach(btn => btn.remove());
            
            // Remove all buttons
            const allButtons = cloneCard.querySelectorAll('button');
            allButtons.forEach(btn => btn.style.display = 'none');
            
            // Remove past exams section
            const pastSection = cloneCard.querySelector('.past-exams-section');
            if (pastSection) pastSection.remove();
            
            // Ensure signature lines are visible
            const signatureLines = cloneCard.querySelectorAll('.signature-line, .sign-line, .signature-line-inline');
            signatureLines.forEach(line => {
                line.style.width = '80%';
                line.style.margin = '8px auto';
                line.style.borderTop = '2px solid #000';
                line.style.height = '2px';
            });
            
            return cloneCard;
        }
        
        createTempContainer(element) {
            const container = document.createElement('div');
            container.style.position = 'absolute';
            container.style.left = '-9999px';
            container.style.top = '-9999px';
            container.style.width = `${CONFIG.A4.PIXEL_WIDTH}px`;
            container.style.backgroundColor = 'white';
            container.style.padding = '50px 40px';
            container.style.boxSizing = 'border-box';
            container.appendChild(element);
            return container;
        }
        
        // ============================================
        // A4 PREVIEW
        // ============================================
        
        previewA4() {
            const cardElement = document.getElementById('exam-card-print-area');
            if (!cardElement) return;
            
            const cloneCard = this.prepareCardForPrint(cardElement);
            
            const overlay = document.createElement('div');
            overlay.className = 'preview-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-label', 'A4 Preview');
            
            overlay.innerHTML = `
                <div class="preview-modal">
                    <button class="preview-close" aria-label="Close">×</button>
                    <div style="text-align: center; margin-bottom: 15px;">
                        <h3 style="color: #1e3a5f; margin: 0;">📄 A4 Preview</h3>
                        <p style="color: #64748b; font-size: 12px; margin: 5px 0 0 0;">
                            This is how your exam card will look when printed on A4 paper
                        </p>
                    </div>
                    <div style="border: 2px dashed #cbd5e1; border-radius: 8px; padding: 20px; background: #f8fafc;">
                        ${cloneCard.outerHTML}
                    </div>
                    <div style="display: flex; gap: 10px; margin-top: 15px; justify-content: center; flex-wrap: wrap;">
                        <button onclick="this.closest('.preview-overlay').remove()" style="
                            padding: 8px 24px;
                            border: 1px solid #e2e8f0;
                            border-radius: 8px;
                            background: white;
                            cursor: pointer;
                            font-weight: 500;
                        ">Close</button>
                        <button onclick="window.examCardModule.downloadExamCardDirect()" style="
                            padding: 8px 24px;
                            border: none;
                            border-radius: 8px;
                            background: #059669;
                            color: white;
                            cursor: pointer;
                            font-weight: 500;
                        ">📥 Download PDF</button>
                        <button onclick="window.examCardModule.printExamCard()" style="
                            padding: 8px 24px;
                            border: none;
                            border-radius: 8px;
                            background: #1e3a5f;
                            color: white;
                            cursor: pointer;
                            font-weight: 500;
                        ">🖨️ Print</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(overlay);
            
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) overlay.remove();
            });
            
            overlay.querySelector('.preview-close').addEventListener('click', () => {
                overlay.remove();
            });
            
            overlay.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') overlay.remove();
            });
        }
        
        // ============================================
        // PRINT FUNCTIONALITY
        // ============================================
        
        printExamCard() {
            const printContent = document.getElementById('exam-card-print-area');
            if (!printContent) return;
            
            const styles = document.getElementById('exam-card-compact-styles')?.innerHTML || '';
            const cloneCard = this.prepareCardForPrint(printContent);
            
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                alert('Please allow popups to print the exam card.');
                return;
            }
            
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Exam Card - ${this.userProfile?.full_name || 'Student'}</title>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        ${styles}
                        body {
                            font-family: 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
                            padding: 0;
                            margin: 0;
                            background: white;
                        }
                        .action-buttons, button {
                            display: none !important;
                        }
                        .exam-card-wrapper {
                            max-width: 794px;
                            margin: 0 auto;
                            padding: 10px;
                        }
                        .past-exams-section {
                            display: none !important;
                        }
                        .signature-line, .sign-line, .signature-line-inline {
                            width: 80% !important;
                            margin: 8px auto !important;
                            border-top: 2px solid #000 !important;
                            height: 2px !important;
                        }
                        .signature-cell .signature-line {
                            width: 90% !important;
                            margin: 8px auto !important;
                        }
                        @media print {
                            body { padding: 0; margin: 0; }
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
                            .status-badge.completed { 
                                background: #059669 !important; 
                                -webkit-print-color-adjust: exact; 
                                print-color-adjust: exact; 
                            }
                            .past-exams-section { display: none !important; }
                            .signature-line, .sign-line, .signature-line-inline {
                                width: 80% !important;
                                margin: 8px auto !important;
                                border-top: 2px solid #000 !important;
                                height: 2px !important;
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                            }
                            .exam-card-compact {
                                border: 1px solid #000 !important;
                                border-radius: 0 !important;
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
                                setTimeout(function() { window.close(); }, 500);
                            }, 300);
                        };
                    <\/script>
                </body>
                </html>
            `);
            printWindow.document.close();
        }
        
        // ============================================
        // PAST EXAM PDF
        // ============================================
        
        async downloadPastExamPDF(examId) {
            const record = this.pastExamRecords.find(r => r.id == examId);
            if (!record) {
                alert('Record not found');
                return;
            }
            
            // Generate a simple PDF for past exam
            try {
                await this.waitForLibraries();
                
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF('p', 'mm', 'a4');
                const margin = 20;
                let y = margin;
                
                // Title
                pdf.setFontSize(18);
                pdf.setTextColor(30, 58, 95);
                pdf.text('PAST EXAM RECORD', margin, y);
                y += 12;
                
                pdf.setFontSize(12);
                pdf.setTextColor(100, 116, 139);
                pdf.text(`Period: ${record.period || record.exam_period || 'N/A'}`, margin, y);
                y += 8;
                pdf.text(`Date: ${this.formatDate(new Date(record.date || record.completed_date || Date.now()))}`, margin, y);
                y += 8;
                pdf.text(`Units: ${record.units || record.total_units || 0}`, margin, y);
                y += 8;
                pdf.text(`Credits: ${record.credits || record.total_credits || 0}`, margin, y);
                y += 8;
                pdf.text(`Status: ${record.status || 'Completed'}`, margin, y);
                y += 15;
                
                // Units list
                const units = record.units_list || [];
                if (units.length > 0) {
                    pdf.setFontSize(14);
                    pdf.setTextColor(30, 58, 95);
                    pdf.text('Units Registered:', margin, y);
                    y += 10;
                    
                    pdf.setFontSize(10);
                    pdf.setTextColor(71, 85, 105);
                    units.forEach((unit, i) => {
                        const line = `${i + 1}. ${unit.unit_code || ''} - ${unit.unit_name || ''} (${unit.credits || 0} cr)`;
                        const lines = pdf.splitTextToSize(line, 170);
                        pdf.text(lines, margin, y);
                        y += 6 * lines.length;
                    });
                }
                
                // Footer
                const pageHeight = pdf.internal.pageSize.height;
                pdf.setFontSize(8);
                pdf.setTextColor(148, 163, 184);
                pdf.text('Generated from NCHSM Exam Card System', margin, pageHeight - 10);
                
                // Save
                const studentName = this.userProfile?.full_name || 'Student';
                const safeName = studentName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                pdf.save(`Past_Exam_${safeName}_${record.period || 'record'}.pdf`);
                
            } catch (error) {
                console.error('Failed to generate past exam PDF:', error);
                alert('Failed to generate PDF. Please try again.');
            }
        }
        
        // ============================================
        // REFRESH FUNCTION
        // ============================================
        
        refresh() {
            this.loaded = false;
            this.loadExamCard();
        }
    }
    
    // ============================================
    // EXPOSE GLOBALLY
    // ============================================
    
    const examCardModule = new ExamCardModule();
    window.examCardModule = examCardModule;
    
    // Expose functions globally
    window.loadExamCard = () => examCardModule?.loadExamCard();
    window.printExamCard = () => examCardModule?.printExamCard();
    window.downloadExamCard = () => examCardModule?.downloadExamCardDirect();
    window.previewExamCard = () => examCardModule?.previewA4();
    window.refreshExamCard = () => examCardModule?.refresh();
    window.viewPastExam = (id) => examCardModule?.viewPastExam(id);
    window.downloadPastExamPDF = (id) => examCardModule?.downloadPastExamPDF(id);
    
    console.log('✅ Exam Card module v10.0 ready - Full A4 optimized');
    
    // Export for testing
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { ExamCardModule };
    }
})();
