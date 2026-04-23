// js/exam-card.js - Exam Card Module
// Displays ONLY approved registered units for the current semester

(function() {
    'use strict';
    
    console.log('📇 Exam Card module loading...');
    
    class ExamCardModule {
        constructor() {
            console.log('📇 ExamCardModule initialized');
            
            // Store data
            this.approvedUnits = [];
            this.userProfile = null;
            this.loaded = false;
            
            // User data
            this.programCode = null;
            this.intakeYear = null;
            this.userBlock = null;
            
            // DOM elements
            this.cacheElements();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Try to load if user is already logged in
            setTimeout(() => this.tryLoadIfLoggedIn(), 1500);
        }
        
        cacheElements() {
            this.examCardContent = document.getElementById('exam-card-content');
            this.dashboardExamStatus = document.getElementById('dashboard-exam-status');
            this.dashboardApprovedUnits = document.getElementById('dashboard-approved-units');
        }
        
        setupEventListeners() {
            // Listen for login events
            document.addEventListener('userLoggedIn', (e) => {
                console.log('🎉 USER LOGGED IN EVENT RECEIVED!');
                this.userProfile = e.detail?.userProfile;
                this.updateUserData();
                this.loadExamCard();
            });
            
            document.addEventListener('userProfileUpdated', (e) => {
                if (e.detail?.userProfile) {
                    this.userProfile = e.detail.userProfile;
                    this.updateUserData();
                    this.loadExamCard();
                }
            });
            
            document.addEventListener('appReady', () => {
                console.log('🚀 App ready event received');
                this.tryLoadIfLoggedIn();
            });
            
            // Listen for unit registration updates
            document.addEventListener('unitRegistrationReady', (e) => {
                console.log('📚 Unit registration updated, refreshing exam card...');
                if (this.userProfile) {
                    this.loadExamCard();
                }
            });
        }
        
        tryLoadIfLoggedIn() {
            const profile = this.getUserProfileFromAnySource();
            
            if (profile) {
                console.log('✅ User already logged in:', profile.full_name || profile.email);
                this.userProfile = profile;
                this.updateUserData();
                this.loadExamCard();
            } else {
                console.log('⏳ No user profile found yet, waiting for login...');
                this.showWaitingForLogin();
            }
        }
        
        getUserProfileFromAnySource() {
            const sources = [
                () => window.db?.currentUserProfile,
                () => window.currentUserProfile,
                () => window.databaseModule?.currentUserProfile,
                () => window.unitRegistrationModule?.userProfile,
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
                    if (profile && (profile.full_name || profile.email || profile.id || profile.user_id)) {
                        return profile;
                    }
                } catch (e) {
                    console.log('⚠️ Profile source error:', e.message);
                }
            }
            
            return null;
        }
        
        updateUserData() {
            if (this.userProfile) {
                this.programCode = this.userProfile.program || 'KRCHN';
                this.intakeYear = this.userProfile.intake_year || 2025;
                this.userBlock = this.userProfile.block || this.userProfile.term || 'A';
                
                console.log('🎯 Exam Card user data updated:', {
                    program: this.programCode,
                    intake: this.intakeYear,
                    block: this.userBlock
                });
                
                return true;
            }
            return false;
        }
        
        async loadExamCard() {
            console.log('📇 Loading exam card...');
            
            if (!this.userProfile) {
                this.showWaitingForLogin();
                return;
            }
            
            this.showLoading();
            
            try {
                if (!this.updateUserData()) {
                    throw new Error('Failed to update user data');
                }
                
                const supabase = window.db?.supabase;
                
                if (!supabase) {
                    throw new Error('Database connection not available');
                }
                
                await this.loadApprovedUnits(supabase);
                await this.updateDashboard();
                
                this.loaded = true;
                this.displayExamCard();
                
                console.log(`✅ Exam card loaded: ${this.approvedUnits.length} approved units`);
                
            } catch (error) {
                console.error('❌ Error loading exam card:', error);
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
                // Get ONLY approved units for current student
                let query = supabase
                    .from('student_unit_registrations')
                    .select('*')
                    .eq('student_id', studentId)
                    .eq('status', 'approved');
                
                // Filter by current block if available
                if (this.userBlock && this.userBlock !== 'Unknown') {
                    query = query.eq('block', this.userBlock);
                }
                
                const { data, error } = await query.order('unit_code', { ascending: true });
                
                if (error) throw error;
                
                this.approvedUnits = data || [];
                
                console.log(`📇 Found ${this.approvedUnits.length} approved units`);
                
            } catch (error) {
                console.error('Error loading approved units:', error);
                this.approvedUnits = [];
            }
        }
        
        async updateDashboard() {
            const approvedCount = this.approvedUnits.length;
            const isEligible = approvedCount > 0;
            
            if (this.dashboardExamStatus) {
                this.dashboardExamStatus.textContent = isEligible ? 'ELIGIBLE ✅' : 'NOT ELIGIBLE ❌';
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
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            const examPeriod = this.getExamPeriod();
            const currentSemester = this.userBlock || 'Current Semester';
            const eligibilityStatus = isEligible ? 'ELIGIBLE' : 'NOT ELIGIBLE';
            const eligibilityClass = isEligible ? 'eligible' : 'not-eligible';
            
            let eligibilityMessage = '';
            if (!isEligible) {
                eligibilityMessage = `❌ No approved unit registrations found for ${currentSemester}. Please register units through the Learning Hub and wait for admin approval.`;
            } else {
                eligibilityMessage = `✅ You are cleared to sit for ${currentSemester} examinations. You have ${approvedUnits.length} approved unit(s) for this semester.`;
            }
            
            // Group units by block for better organization
            const unitsByBlock = {};
            approvedUnits.forEach(unit => {
                const block = unit.block || currentSemester;
                if (!unitsByBlock[block]) unitsByBlock[block] = [];
                unitsByBlock[block].push(unit);
            });
            
            let html = `
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
            `;
            
            if (approvedUnits.length > 0) {
                html += `
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
                `;
                
                approvedUnits.forEach((unit, index) => {
                    html += `
                        <tr>
                            <td>${index + 1}</td>
                            <td><strong>${this.escapeHtml(unit.unit_code)}</strong></td>
                            <td>${this.escapeHtml(unit.unit_name)}</td>
                            <td>${this.escapeHtml(unit.block || currentSemester)}</td>
                            <td>${unit.reg_type || 'Normal'}</td>
                            <td><span class="status-approved">✓ Approved for ${currentSemester}</span></td>
                        </tr>
                    `;
                });
                
                html += `
                                </tbody>
                            </table>
                        </div>
                        
                        <div class="unit-summary">
                            <div class="summary-badge">
                                <span class="summary-label">Total Units (${currentSemester}):</span>
                                <span class="summary-value">${approvedUnits.length}</span>
                            </div>
                        </div>
                `;
            } else {
                html += `
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
                `;
            }
            
            html += `
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
            
            this.examCardContent.innerHTML = html;
            
            // Add print functionality
            const printBtn = document.getElementById('print-exam-card');
            if (printBtn && isEligible) {
                printBtn.addEventListener('click', () => this.printExamCard());
            }
        }
        
        getExamPeriod() {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth();
            
            if (month >= 0 && month <= 3) return `March - April ${year} (Trimester 1)`;
            if (month >= 4 && month <= 7) return `July - August ${year} (Trimester 2)`;
            return `November - December ${year} (Trimester 3)`;
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
        }
        
        showLoading() {
            if (this.examCardContent) {
                this.examCardContent.innerHTML = `
                    <div class="loading-state">
                        <div class="loading-spinner"></div>
                        <p>Loading exam card information...</p>
                    </div>
                `;
            }
        }
        
        showError(message) {
            if (this.examCardContent) {
                this.examCardContent.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>Error Loading Exam Card</h3>
                        <p>${this.escapeHtml(message)}</p>
                        <button onclick="location.reload()" class="btn-primary">Retry</button>
                    </div>
                `;
            }
        }
        
        showWaitingForLogin() {
            if (this.examCardContent && !this.loaded) {
                this.examCardContent.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-spinner fa-spin"></i>
                        <h3>Waiting for Login</h3>
                        <p>Please log in to view your exam card.</p>
                    </div>
                `;
            }
        }
        
        escapeHtml(str) {
            if (!str) return '';
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }
        
        refresh() {
            this.loaded = false;
            this.loadExamCard();
        }
    }
    
    // Create global instance
    window.examCardModule = new ExamCardModule();
    
    // Global functions
    window.initExamCard = () => window.examCardModule?.refresh();
    window.loadExamCard = () => window.examCardModule?.loadExamCard();
    window.printExamCard = () => window.examCardModule?.printExamCard();
    
    console.log('✅ Exam Card module ready!');
})();
