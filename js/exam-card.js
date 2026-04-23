
(function() {
    'use strict';
    
    console.log('📇 Exam Card module loading...');
    
    class ExamCardModule {
        constructor() {
            console.log('📇 ExamCardModule initialized');
            
            this.approvedUnits = [];
            this.userProfile = null;
            this.loaded = false;
            this.programCode = null;
            this.intakeYear = null;
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
                eligibilityMessage = `No approved unit registrations found for ${currentSemester}. Please register units through the Learning Hub and wait for admin approval.`;
            } else {
                eligibilityMessage = `You are cleared to sit for ${currentSemester} examinations. You have ${approvedUnits.length} approved unit(s) for this semester.`;
            }
            
            // Logo URL - Replace with your actual logo URL
            const logoUrl = 'https://nakurucollegeofhealth.ac.ke/wp-content/uploads/elementor/thumbs/Logo_NCHSM-removebg-preview-rbgbmxl6t3pmf4d2oozt1o24i7v01gn3sjnh2ny6lk.png';
            
            let html = `
                <div class="exam-card-template" id="exam-card-print">
                    <div class="exam-card-header">
                        <div class="logo-wrapper">
                            <img src="${logoUrl}" alt="NCHSM Logo" class="exam-card-logo" onerror="this.style.display='none'">
                        </div>
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
                                <div class="value">${approvedUnits.length} unit(s)</div>
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
                        <div class="table-responsive">
                            <table class="registered-units-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Unit Code</th>
                                        <th>Unit Name</th>
                                        <th>Credits</th>
                                        <th>Lecturer's Signature</th>
                                        <th>Date Cleared</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                `;
                
                approvedUnits.forEach((unit, index) => {
                    const signatureId = `signature_${unit.id}_${index}`;
                    const dateId = `date_${unit.id}_${index}`;
                    
                    html += `
                        <tr>
                            <td>${index + 1}</td>
                            <td><strong>${this.escapeHtml(unit.unit_code)}</strong>${this.escapeHtml(unit.unit_name ? '<br><small>' + unit.unit_name + '</small>' : '')}</td>
                            <td>${unit.credits || 3}学分</td>
                            <td class="signature-cell">
                                <div class="signature-field" data-unit-id="${unit.id}">
                                    <span class="lecturer-name-placeholder">_________________</span>
                                    <div class="signature-input-wrapper" style="display: none;">
                                        <input type="text" class="lecturer-signature-input" id="${signatureId}" placeholder="Lecturer Name" style="width: 100%; padding: 4px; font-size: 10px;">
                                        <button class="signature-clear-btn" data-unit-id="${unit.id}" style="margin-top: 2px; padding: 2px 6px; font-size: 10px;">Clear</button>
                                    </div>
                                    <button class="signature-edit-btn" data-unit-id="${unit.id}" style="margin-top: 4px; padding: 2px 8px; font-size: 9px;">Add Signature</button>
                                </div>
                            </td>
                            <td class="date-cell">
                                <div class="date-field">
                                    <span class="date-placeholder">_________</span>
                                    <div class="date-input-wrapper" style="display: none;">
                                        <input type="date" class="lecturer-date-input" id="${dateId}" style="width: 100%; padding: 4px; font-size: 10px;">
                                    </div>
                                    <button class="date-edit-btn" data-unit-id="${unit.id}" style="margin-top: 4px; padding: 2px 8px; font-size: 9px;">Add Date</button>
                                </div>
                            </td>
                            <td><span class="status-approved">✓ Approved</span></td>
                        </tr>
                    `;
                });
                
                html += `
                                </tbody>
                            </table>
                        </div>
                        
                        <div class="unit-summary">
                            <div class="summary-badge">
                                <span class="summary-label">Total Units:</span>
                                <span class="summary-value">${approvedUnits.length}</span>
                            </div>
                        </div>
                `;
            } else {
                html += `
                        <div class="no-units-warning">
                            <i class="fas fa-exclamation-circle"></i>
                            <h4>No Approved Units for ${currentSemester}</h4>
                            <p>You don't have any approved unit registrations. Please:</p>
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
                                <div class="signature-line">
                                    <span>_____________________</span>
                                    <p>Finance Officer</p>
                                    <small>(Fee Clearance)</small>
                                </div>
                                <div class="signature-line">
                                    <span>_____________________</span>
                                    <p>HOD - Nursing</p>
                                    <small>(Head of Department)</small>
                                </div>
                                <div class="stamp">
                                    <div class="stamp-text">OFFICIAL STAMP</div>
                                </div>
                            </div>
                            
                            <div class="declaration-section">
                                <div class="declaration-box">
                                    <h5>📜 Candidate's Declaration</h5>
                                    <p>I hereby confirm that I have been cleared by the respective lecturers for the above units and will abide by all examination rules and regulations.</p>
                                    <div class="student-signature-line">
                                        <span>_____________________</span>
                                        <p>Student's Signature</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="exam-rules">
                                <h5>📌 Examination Rules:</h5>
                                <ul>
                                    <li>This card is valid ONLY for ${currentSemester} examinations</li>
                                    <li><strong>Unit Clearance:</strong> Each unit must be signed off by the respective lecturer</li>
                                    <li><strong>Fee Clearance:</strong> Must be verified by Finance Officer</li>
                                    <li>This card must be presented at each examination venue</li>
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
                        <i class="fas fa-print"></i> ${isEligible ? `Print Exam Card (${currentSemester})` : 'Exam Card Unavailable - No Approved Units'}
                    </button>
                </div>
            `;
            
            this.examCardContent.innerHTML = html;
            
            // Attach signature edit handlers
            this.attachSignatureHandlers();
            
            // Add print functionality
            const printBtn = document.getElementById('print-exam-card');
            if (printBtn && isEligible) {
                printBtn.addEventListener('click', () => this.printExamCard());
            }
            
            // Load saved signatures from localStorage
            this.loadSavedSignatures(approvedUnits);
        }
        
        attachSignatureHandlers() {
            // Signature edit buttons
            document.querySelectorAll('.signature-edit-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const unitId = btn.getAttribute('data-unit-id');
                    const field = document.querySelector(`.signature-field[data-unit-id="${unitId}"]`);
                    if (field) {
                        const placeholder = field.querySelector('.lecturer-name-placeholder');
                        const inputWrapper = field.querySelector('.signature-input-wrapper');
                        const editBtn = field.querySelector('.signature-edit-btn');
                        
                        if (placeholder && inputWrapper) {
                            placeholder.style.display = 'none';
                            inputWrapper.style.display = 'block';
                            editBtn.style.display = 'none';
                            
                            const input = inputWrapper.querySelector('input');
                            if (input && !input.value) {
                                const saved = localStorage.getItem(`lecturer_signature_${unitId}`);
                                if (saved) input.value = saved;
                            }
                        }
                    }
                });
            });
            
            // Clear signature buttons
            document.querySelectorAll('.signature-clear-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const unitId = btn.getAttribute('data-unit-id');
                    const field = document.querySelector(`.signature-field[data-unit-id="${unitId}"]`);
                    if (field) {
                        const placeholder = field.querySelector('.lecturer-name-placeholder');
                        const inputWrapper = field.querySelector('.signature-input-wrapper');
                        const editBtn = field.querySelector('.signature-edit-btn');
                        const input = inputWrapper.querySelector('input');
                        
                        if (input) input.value = '';
                        localStorage.removeItem(`lecturer_signature_${unitId}`);
                        localStorage.removeItem(`lecturer_date_${unitId}`);
                        
                        placeholder.style.display = 'inline';
                        inputWrapper.style.display = 'none';
                        editBtn.style.display = 'inline-block';
                        
                        // Also clear date
                        const dateField = document.querySelector(`.date-field`);
                        if (dateField) {
                            const datePlaceholder = dateField.querySelector('.date-placeholder');
                            const dateInputWrapper = dateField.querySelector('.date-input-wrapper');
                            const dateEditBtn = dateField.querySelector('.date-edit-btn');
                            const dateInput = dateInputWrapper.querySelector('input');
                            if (dateInput) dateInput.value = '';
                            if (datePlaceholder) datePlaceholder.style.display = 'inline';
                            if (dateInputWrapper) dateInputWrapper.style.display = 'none';
                            if (dateEditBtn) dateEditBtn.textContent = 'Add Date';
                        }
                    }
                });
            });
            
            // Save signature on input blur
            document.querySelectorAll('.lecturer-signature-input').forEach(input => {
                input.addEventListener('blur', (e) => {
                    const field = input.closest('.signature-field');
                    if (field) {
                        const unitId = field.getAttribute('data-unit-id');
                        if (unitId && input.value.trim()) {
                            localStorage.setItem(`lecturer_signature_${unitId}`, input.value.trim());
                            
                            const placeholder = field.querySelector('.lecturer-name-placeholder');
                            const inputWrapper = field.querySelector('.signature-input-wrapper');
                            const editBtn = field.querySelector('.signature-edit-btn');
                            
                            if (placeholder) {
                                placeholder.textContent = input.value.trim();
                                placeholder.style.display = 'inline';
                                inputWrapper.style.display = 'none';
                                editBtn.style.display = 'inline-block';
                                editBtn.textContent = 'Edit Signature';
                            }
                        }
                    }
                });
            });
            
            // Date edit buttons
            document.querySelectorAll('.date-edit-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const unitId = btn.getAttribute('data-unit-id');
                    const dateField = btn.closest('.date-field');
                    if (dateField) {
                        const placeholder = dateField.querySelector('.date-placeholder');
                        const inputWrapper = dateField.querySelector('.date-input-wrapper');
                        const dateInput = inputWrapper.querySelector('input');
                        
                        if (placeholder && inputWrapper) {
                            placeholder.style.display = 'none';
                            inputWrapper.style.display = 'block';
                            btn.textContent = 'Save Date';
                            
                            if (dateInput && !dateInput.value) {
                                const saved = localStorage.getItem(`lecturer_date_${unitId}`);
                                if (saved) dateInput.value = saved;
                            }
                        }
                    }
                });
            });
            
            // Save date on change
            document.querySelectorAll('.lecturer-date-input').forEach(input => {
                input.addEventListener('change', (e) => {
                    const dateField = input.closest('.date-field');
                    if (dateField) {
                        const unitId = dateField.closest('tr')?.querySelector('.signature-field')?.getAttribute('data-unit-id');
                        if (unitId && input.value) {
                            localStorage.setItem(`lecturer_date_${unitId}`, input.value);
                            
                            const placeholder = dateField.querySelector('.date-placeholder');
                            const inputWrapper = dateField.querySelector('.date-input-wrapper');
                            const editBtn = dateField.querySelector('.date-edit-btn');
                            
                            if (placeholder) {
                                const formattedDate = new Date(input.value).toLocaleDateString();
                                placeholder.textContent = formattedDate;
                                placeholder.style.display = 'inline';
                                inputWrapper.style.display = 'none';
                                editBtn.textContent = 'Edit Date';
                            }
                        }
                    }
                });
            });
        }
        
        loadSavedSignatures(approvedUnits) {
            approvedUnits.forEach(unit => {
                const savedSignature = localStorage.getItem(`lecturer_signature_${unit.id}`);
                const savedDate = localStorage.getItem(`lecturer_date_${unit.id}`);
                
                if (savedSignature) {
                    const field = document.querySelector(`.signature-field[data-unit-id="${unit.id}"]`);
                    if (field) {
                        const placeholder = field.querySelector('.lecturer-name-placeholder');
                        const editBtn = field.querySelector('.signature-edit-btn');
                        if (placeholder) {
                            placeholder.textContent = savedSignature;
                            editBtn.textContent = 'Edit Signature';
                        }
                    }
                }
                
                if (savedDate) {
                    const row = document.querySelector(`tr:has(.signature-field[data-unit-id="${unit.id}"])`);
                    if (row) {
                        const datePlaceholder = row.querySelector('.date-placeholder');
                        if (datePlaceholder) {
                            const formattedDate = new Date(savedDate).toLocaleDateString();
                            datePlaceholder.textContent = formattedDate;
                        }
                    }
                }
            });
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
            
            // Get the current state of signatures for printing
            const units = document.querySelectorAll('.signature-field');
            units.forEach(unit => {
                const unitId = unit.getAttribute('data-unit-id');
                const savedSignature = localStorage.getItem(`lecturer_signature_${unitId}`);
                if (savedSignature) {
                    const placeholder = unit.querySelector('.lecturer-name-placeholder');
                    if (placeholder && placeholder.textContent !== savedSignature) {
                        placeholder.textContent = savedSignature;
                    }
                }
            });
            
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>NCHSM Exam Card</title>
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { font-family: 'Inter', Arial, sans-serif; padding: 20px; background: white; }
                        .exam-card-template { max-width: 1100px; margin: 0 auto; border: 2px solid #4C1D95; border-radius: 12px; overflow: hidden; }
                        .exam-card-header { background: linear-gradient(135deg, #4C1D95, #7c3aed); color: white; padding: 25px; text-align: center; position: relative; }
                        .logo-wrapper { text-align: center; margin-bottom: 15px; }
                        .exam-card-logo { max-width: 80px; height: auto; }
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
                        .registered-units-table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 20px; }
                        .registered-units-table th, .registered-units-table td { padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
                        .registered-units-table th { background: #f9fafb; font-weight: 600; }
                        .signature-cell, .date-cell { min-width: 100px; }
                        .status-approved { color: #059669; font-weight: 500; }
                        .signature-section { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 20px; margin: 25px 0; }
                        .signature-line { text-align: center; min-width: 120px; }
                        .signature-line span { display: inline-block; width: 140px; border-top: 1px solid #000; margin-bottom: 8px; }
                        .signature-line p { margin: 5px 0; font-size: 10px; }
                        .signature-line small { font-size: 8px; color: #6b7280; }
                        .stamp { text-align: center; }
                        .stamp-text { border: 2px solid #4C1D95; padding: 5px 12px; border-radius: 6px; font-size: 10px; color: #4C1D95; font-weight: bold; }
                        .declaration-section { margin: 20px 0; padding: 15px; background: #fef3c7; border-radius: 8px; border-left: 3px solid #f59e0b; }
                        .student-signature-line { margin-top: 15px; text-align: right; }
                        .student-signature-line span { display: inline-block; width: 200px; border-top: 1px solid #000; margin-top: 10px; }
                        .exam-rules { background: #f8f9fa; padding: 15px; border-radius: 10px; margin-top: 20px; }
                        .exam-rules ul { padding-left: 20px; }
                        .exam-rules li { font-size: 10px; margin-bottom: 4px; }
                        .print-btn, .signature-edit-btn, .date-edit-btn, .signature-clear-btn { display: none; }
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
