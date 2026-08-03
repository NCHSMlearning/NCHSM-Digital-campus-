// js/unit-registration.js - Complete Version
// Matches the updated HTML section with Supplementary Exam Support

(function() {
    'use strict';
    
    console.log('✅ unit-registration.js - Loading with Supabase integration...');
    
    class UnitRegistrationModule {
        constructor() {
            console.log('🔧 UnitRegistrationModule initialized');
            
            // Store data
            this.allUnits = [];
            this.registeredUnits = [];
            this.availableUnits = [];
            this.userProfile = null;
            this.loaded = false;
            this.maxUnits = 15;
            this.isSubmitting = false;
            
            // User data
            this.programCode = null;
            this.programType = null;
            this.intakeYear = null;
            this.intakeMonth = null;
            this.userBlock = null;
            this.userTerm = null;
            this.isTVETStudent = false;
            
            // ✅ Supplementary exam tracking
            this.supplementaryUnits = [];
            this.failedUnits = [];
            this.hasSupplementaryEligibility = false;
            
            // DOM elements
            this.cacheElements();
            
            // Initialize event listeners
            this.initializeEventListeners();
            
            // Set up login event listeners
            this.setupLoginListeners();
            
            // Try to load if user is already logged in
            setTimeout(() => this.tryLoadIfLoggedIn(), 1500);
        }
        
        // ============================================
        // 👤 LOGIN LISTENERS
        // ============================================
        
        setupLoginListeners() {
            document.addEventListener('userLoggedIn', (e) => {
                console.log('👤 USER LOGGED IN EVENT RECEIVED!');
                this.userProfile = e.detail?.userProfile;
                this.updateUserData();
                this.loadUnits();
            });
            
            document.addEventListener('userProfileUpdated', (e) => {
                if (e.detail?.userProfile) {
                    this.userProfile = e.detail.userProfile;
                    this.updateUserData();
                    if (!this.loaded) {
                        this.loadUnits();
                    }
                }
            });
            
            document.addEventListener('appReady', () => {
                console.log('📱 App ready event received');
                this.tryLoadIfLoggedIn();
            });
        }
        
        tryLoadIfLoggedIn() {
            const profile = this.getUserProfileFromAnySource();
            
            if (profile) {
                console.log('👤 User already logged in:', profile.full_name || profile.email);
                this.userProfile = profile;
                this.updateUserData();
                this.loadUnits();
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
                () => {
                    try {
                        const stored = localStorage.getItem('userProfile');
                        return stored ? JSON.parse(stored) : null;
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
                    console.log('Profile source error:', e.message);
                }
            }
            
            return null;
        }
        
        // ============================================
        // 🔧 USER DATA UPDATE
        // ============================================
        
        updateUserData() {
            if (this.userProfile) {
                let programFromProfile = this.userProfile.program || 'KRCHN';
                
                // TVET Program Codes
                const tvetPrograms = [
                    'DPOTT', 'DCH', 'DHRIT', 'DSL', 'DSW', 'DCJS', 'DHSS', 'DICT', 'DME',
                    'CPOTT', 'CCH', 'CHRIT', 'CPC', 'CSL', 'CSW', 'CCJS', 'CAG', 'CHSS', 'CICT',
                    'ACH', 'AAG', 'ASW', 'CCA', 'PTE', 'TVET'
                ];
                
                if (tvetPrograms.includes(programFromProfile) || programFromProfile === 'TVET') {
                    this.isTVETStudent = true;
                    this.programCode = programFromProfile;
                    console.log('🔧 TVET Student detected. Program:', this.programCode);
                } else {
                    this.isTVETStudent = false;
                    this.programCode = 'KRCHN';
                    console.log('🎓 KRCHN Student detected');
                }
                
                this.intakeYear = this.userProfile.intake_year || 2025;
                this.intakeMonth = this.userProfile.intake_month || null;
                
                // Set block/term based on student type
                if (this.isTVETStudent) {
                    this.userTerm = this.userProfile.term || this.userProfile.block || 'Year 1 Term 1';
                    this.userBlock = null;
                } else {
                    this.userBlock = this.userProfile.block || 'Block 1';
                    this.userTerm = null;
                }
                
                console.log('📊 User data updated:', {
                    programCode: this.programCode,
                    programType: this.isTVETStudent ? 'TVET' : 'KRCHN',
                    intake: this.intakeYear,
                    intakeMonth: this.intakeMonth,
                    blockTerm: this.isTVETStudent ? this.userTerm : this.userBlock
                });
                
                return true;
            }
            return false;
        }
        
        // ============================================
        // 📦 CACHE DOM ELEMENTS
        // ============================================
        
        cacheElements() {
            this.availableBody = document.getElementById('availableUnitsBody');
            this.registeredBody = document.getElementById('registeredUnitsBody');
            this.blockFilter = document.getElementById('BlockFilter');
            this.unitTypeFilter = document.getElementById('UnitTypeFilter');
            this.regType = document.getElementById('RegType');
            this.refreshBtn = document.getElementById('refreshUnitsBtn');
            this.submitBtn = document.getElementById('submitRegistrationBtn');
            this.selectAllCheckbox = document.getElementById('selectAllUnits');
            
            // ✅ Registration Status Badge
            this.registrationBadge = document.getElementById('registrationStatusBadge');
            this.registrationStatusText = document.getElementById('registrationStatusText');
        }
        
        // ============================================
        // 🎛️ EVENT LISTENERS
        // ============================================
        
        initializeEventListeners() {
            if (this.refreshBtn) {
                this.refreshBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (!this.userProfile) {
                        this.showError('Please log in first');
                        return;
                    }
                    this.loadUnits();
                });
            }
            
            if (this.submitBtn) {
                this.submitBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (!this.userProfile) {
                        this.showError('Please log in first');
                        return;
                    }
                    if (this.isSubmitting) {
                        console.log('⏳ Submission already in progress...');
                        return;
                    }
                    this.submitRegistration();
                });
            }
            
            if (this.selectAllCheckbox) {
                this.selectAllCheckbox.addEventListener('change', () => this.selectAllUnits());
            }
            
            if (this.blockFilter) {
                this.blockFilter.addEventListener('change', () => {
                    if (this.regType?.value) {
                        this.loadAvailableUnits();
                    }
                });
            }
            
            if (this.unitTypeFilter) {
                this.unitTypeFilter.addEventListener('change', () => {
                    if (this.regType?.value) {
                        this.loadAvailableUnits();
                    }
                });
            }
            
            if (this.regType) {
                this.regType.addEventListener('change', () => {
                    if (this.regType.value) {
                        this.loadAvailableUnits();
                        // ✅ Update UI based on registration type
                        this.updateRegistrationTypeUI(this.regType.value);
                    }
                });
            }
        }
        
        // ============================================
        // 🎨 UPDATE UI BASED ON REGISTRATION TYPE
        // ============================================
        
        updateRegistrationTypeUI(regType) {
            const isSupplementary = regType === 'Supplementary';
            const infoText = document.getElementById('registrationInfoText');
            const warningBox = document.getElementById('registrationWarning');
            
            if (isSupplementary) {
                if (infoText) {
                    infoText.innerHTML = `
                        <i class="fas fa-info-circle" style="color: #f59e0b;"></i>
                        Supplementary Registration: You can re-register for units you previously failed.
                        <strong>Max 3 units allowed.</strong>
                    `;
                    infoText.style.display = 'block';
                }
                if (warningBox) {
                    warningBox.innerHTML = `
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>Supplementary registration is for students who need to retake failed units. 
                        Please select the units you wish to retake. These will be marked as Supplementary.</span>
                    `;
                    warningBox.style.display = 'flex';
                }
                // Show failed units if available
                this.showFailedUnitsForSupplementary();
            } else {
                if (infoText) {
                    infoText.innerHTML = `
                        <i class="fas fa-info-circle" style="color: #3B82F6;"></i>
                        Normal Registration: Select up to ${this.maxUnits} units for the current trimester.
                        <strong>${this.isTVETStudent ? 'TVET' : 'KRCHN'}</strong> program.
                    `;
                    infoText.style.display = 'block';
                }
                if (warningBox) {
                    warningBox.style.display = 'none';
                }
            }
        }
        
        // ============================================
        // 📊 SHOW FAILED UNITS FOR SUPPLEMENTARY
        // ============================================
        
        async showFailedUnitsForSupplementary() {
            try {
                const supabase = window.db?.supabase;
                const studentId = this.userProfile?.user_id || this.userProfile?.id;
                
                if (!studentId || !supabase) return;
                
                // Get failed units from exam grades
                const { data: failedExams, error } = await supabase
                    .from('exam_grades')
                    .select('exam_id, marks, total_score, result_status')
                    .eq('student_id', studentId)
                    .eq('question_id', '00000000-0000-0000-0000-000000000000')
                    .eq('result_status', 'FAIL');
                
                if (error) throw error;
                
                this.failedUnits = failedExams || [];
                this.hasSupplementaryEligibility = this.failedUnits.length > 0;
                
                // Get unit details for failed exams
                if (this.failedUnits.length > 0) {
                    const examIds = this.failedUnits.map(e => e.exam_id);
                    const { data: exams, error: examError } = await supabase
                        .from('exams')
                        .select('id, exam_name, course_name, unit_code, block_term')
                        .in('id', examIds);
                    
                    if (!examError && exams) {
                        // Store supplementary units with details
                        this.supplementaryUnits = exams.map(exam => {
                            const grade = this.failedUnits.find(e => e.exam_id === exam.id);
                            return {
                                ...exam,
                                marks: grade?.marks || 0,
                                total_score: grade?.total_score || 0
                            };
                        });
                    }
                }
                
                // Update the UI to show failed units
                this.updateSupplementaryUI();
                
            } catch (error) {
                console.error('Error loading failed units:', error);
            }
        }
        
        updateSupplementaryUI() {
            const container = document.getElementById('supplementaryUnitsContainer');
            const countBadge = document.getElementById('supplementaryCount');
            
            if (!container) return;
            
            if (this.supplementaryUnits.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: #94a3b8;">
                        <i class="fas fa-check-circle" style="color: #10b981; font-size: 24px; display: block; margin-bottom: 8px;"></i>
                        <p>No failed units found. You are eligible for normal registration.</p>
                    </div>
                `;
                if (countBadge) countBadge.textContent = '0';
                return;
            }
            
            let html = `
                <div style="margin-bottom: 12px; padding: 12px; background: #fef3c7; border-radius: 8px; border: 1px solid #f59e0b;">
                    <i class="fas fa-exclamation-triangle" style="color: #f59e0b;"></i>
                    <span style="font-weight: 600; color: #92400e;">You have ${this.supplementaryUnits.length} failed unit(s) eligible for supplementary registration.</span>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; max-height: 200px; overflow-y: auto;">
            `;
            
            this.supplementaryUnits.forEach((unit, index) => {
                const isRegistered = this.registeredUnits.some(u => u.unit_code === unit.unit_code && u.reg_type === 'Supplementary');
                html += `
                    <div style="padding: 8px 12px; background: ${isRegistered ? '#d1fae5' : '#f8fafc'}; border-radius: 6px; border: 1px solid ${isRegistered ? '#10b981' : '#e5e7eb'}; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong>${this.escapeHtml(unit.unit_code || unit.exam_name)}</strong>
                            <div style="font-size: 11px; color: #64748b;">${this.escapeHtml(unit.course_name || unit.exam_name)}</div>
                        </div>
                        <div>
                            ${isRegistered ? 
                                '<span style="color: #10b981; font-size: 11px; font-weight: 600;">✅ Registered</span>' :
                                `<span style="font-size: 11px; color: #dc2626;">Score: ${unit.marks}%</span>`
                            }
                        </div>
                    </div>
                `;
            });
            
            html += `</div>`;
            
            container.innerHTML = html;
            if (countBadge) countBadge.textContent = this.supplementaryUnits.length;
        }
        
        // ============================================
        // 📥 LOAD UNITS
        // ============================================
        
        async loadUnits() {
            console.log('📥 Loading units...');
            
            if (!this.userProfile) {
                this.showError('Please log in to register units');
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
                
                await this.loadRegisteredUnits(supabase);
                await this.loadAvailableUnits(supabase);
                await this.loadMaxUnits(supabase);
                await this.loadBlocks(supabase);
                
                // ✅ Load supplementary eligibility
                await this.showFailedUnitsForSupplementary();
                
                this.loaded = true;
                this.dispatchModuleReadyEvent();
                console.log('✅ Units loaded successfully');
                
            } catch (error) {
                console.error('❌ Error loading units:', error);
                this.showError(error.message);
            }
        }
        
        async loadRegisteredUnits(supabase) {
            const studentId = this.userProfile?.user_id || this.userProfile?.id;
            
            if (!studentId) {
                this.registeredUnits = [];
                this.displayRegisteredUnits();
                return;
            }
            
            try {
                const { data, error } = await supabase
                    .from('student_unit_registrations')
                    .select('*')
                    .eq('student_id', studentId)
                    .order('submitted_date', { ascending: false });
                
                if (error) throw error;
                
                this.registeredUnits = data || [];
                this.displayRegisteredUnits();
                this.updateRegistrationStatus();
                
            } catch (error) {
                console.error('Error loading registered units:', error);
                this.registeredUnits = [];
                this.displayRegisteredUnits();
            }
        }
        
        // ============================================
        // 📊 UPDATE REGISTRATION STATUS
        // ============================================
        
        updateRegistrationStatus() {
            const pendingCount = this.registeredUnits.filter(u => u.status === 'pending').length;
            const approvedCount = this.registeredUnits.filter(u => u.status === 'approved').length;
            const supplementaryCount = this.registeredUnits.filter(u => u.reg_type === 'Supplementary').length;
            
            const statusBadge = document.getElementById('registrationStatusBadge');
            const statusText = document.getElementById('registrationStatusText');
            
            if (statusBadge && statusText) {
                if (pendingCount > 0) {
                    statusBadge.style.background = '#fef3c7';
                    statusBadge.style.color = '#92400e';
                    statusText.textContent = `${pendingCount} Pending Approval`;
                } else if (approvedCount > 0) {
                    statusBadge.style.background = '#d1fae5';
                    statusBadge.style.color = '#065f46';
                    statusText.textContent = `${approvedCount} Approved`;
                } else {
                    statusBadge.style.background = '#e2e8f0';
                    statusBadge.style.color = '#64748b';
                    statusText.textContent = 'No Registrations';
                }
            }
            
            // Update supplementary badge
            const suppBadge = document.getElementById('supplementaryCount');
            if (suppBadge) {
                suppBadge.textContent = supplementaryCount;
            }
        }
        
        async loadAvailableUnits(supabase) {
            const regType = this.regType?.value;
            
            if (!regType) {
                if (this.availableBody) {
                    this.availableBody.innerHTML = '<tr><td colspan="7" style="text-align:center">Please select Registration Type first</td></tr>';
                }
                return;
            }
            
            try {
                let query = supabase
                    .from('units_catalog')
                    .select('*')
                    .eq('status', 'active');
                
                // Filter by program
                if (this.programCode) {
                    if (this.isTVETStudent) {
                        query = query.eq('program', this.programCode);
                        console.log('Filtering for TVET program:', this.programCode);
                    } else {
                        query = query.eq('program', 'KRCHN');
                        console.log('Filtering for KRCHN program');
                    }
                }
                
                // Filter by block/term
                const block = this.blockFilter?.value;
                if (block && block !== "") {
                    query = query.eq('block', block);
                }
                
                // Filter by unit type
                const unitType = this.unitTypeFilter?.value;
                if (unitType && unitType !== "") {
                    query = query.eq('unit_type', unitType);
                }
                
                const { data, error } = await query.order('block', { ascending: true }).order('unit_code', { ascending: true });
                
                if (error) throw error;
                
                this.allUnits = data || [];
                console.log('Available units loaded:', this.allUnits.length, 'units for', this.isTVETStudent ? 'TVET' : 'KRCHN');
                this.displayAvailableUnits();
                
            } catch (error) {
                console.error('Error loading available units:', error);
                if (this.availableBody) {
                    this.availableBody.innerHTML = '<tr><td colspan="7" style="text-align:center">Error loading units</td></tr>';
                }
            }
        }
        
        // ============================================
        // 📊 DISPLAY AVAILABLE UNITS
        // ============================================
        
        displayAvailableUnits() {
            if (!this.availableBody) return;
            
            const registeredCodes = new Set(this.registeredUnits.map(u => u.unit_code));
            const pendingCodes = new Set(this.registeredUnits.filter(u => u.status === 'pending').map(u => u.unit_code));
            const regType = this.regType?.value;
            const isSupplementary = regType === 'Supplementary';
            
            // ✅ For supplementary, only show failed units
            let displayUnits = this.allUnits;
            if (isSupplementary) {
                const failedUnitCodes = this.supplementaryUnits.map(u => u.unit_code || u.exam_name);
                displayUnits = this.allUnits.filter(u => failedUnitCodes.includes(u.unit_code));
            }
            
            if (displayUnits.length === 0) {
                let message = isSupplementary ? 
                    'No failed units available for supplementary registration. You are eligible for normal registration.' :
                    'No units available for your program.';
                if (this.isTVETStudent) {
                    message = 'No TVET units found for your program. Please contact administrator.';
                }
                this.availableBody.innerHTML = `<tr><td colspan="7" style="text-align:center">${message}</td></tr>`;
                return;
            }
            
            let html = '';
            for (const unit of displayUnits) {
                const isRegistered = registeredCodes.has(unit.unit_code);
                const isPending = pendingCodes.has(unit.unit_code);
                
                let statusText = '';
                let statusClass = '';
                
                if (isRegistered) {
                    if (isPending) {
                        statusText = 'Pending';
                        statusClass = 'status-pending';
                    } else {
                        statusText = 'Approved';
                        statusClass = 'status-approved';
                    }
                } else {
                    statusText = 'Available';
                    statusClass = 'status-available';
                }
                
                // ✅ Show supplementary badge for failed units
                const isFailed = this.supplementaryUnits.some(u => u.unit_code === unit.unit_code || u.exam_name === unit.unit_code);
                const suppBadge = isFailed && !isRegistered ? '<span style="background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 12px; font-size: 9px; font-weight: 600; margin-left: 4px;">Supplementary</span>' : '';
                
                html += `<tr>
                    <td style="text-align:center">${!isRegistered ? `<input type="checkbox" class="unit-checkbox" data-code="${this.escapeHtml(unit.unit_code)}">` : '—'}</td>
                    <td><strong>${this.escapeHtml(unit.unit_code)}</strong> ${suppBadge}</td>
                    <td>${this.escapeHtml(unit.unit_name)}</td>
                    <td>${this.escapeHtml(unit.block)}</td>
                    <td><span class="type-badge">${this.escapeHtml(unit.unit_type || 'Core')}</span></td>
                    <td>${unit.credits || 3}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                </tr>`;
            }
            
            this.availableBody.innerHTML = html;
            this.updateSelectedCount();
            this.attachCheckboxEvents();
        }
        
        // ============================================
        // 📊 DISPLAY REGISTERED UNITS
        // ============================================
        
        displayRegisteredUnits() {
            if (!this.registeredBody) return;
            
            if (this.registeredUnits.length === 0) {
                this.registeredBody.innerHTML = '<tr><td colspan="7" style="text-align:center">No units registered yet. Select units above and submit for approval.</td></tr>';
                return;
            }
            
            let html = '';
            for (const unit of this.registeredUnits) {
                const statusClass = unit.status === 'approved' ? 'status-approved' : 'status-pending';
                const statusText = unit.status === 'approved' ? 'Approved' : 'Pending';
                const isSupplementary = unit.reg_type === 'Supplementary';
                const regBadge = isSupplementary ? '<span style="background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 12px; font-size: 9px; font-weight: 600; margin-left: 4px;">Supplementary</span>' : '';
                
                html += `<tr>
                    <td><strong>${this.escapeHtml(unit.unit_code)}</strong> ${regBadge}</td>
                    <td>${this.escapeHtml(unit.unit_name)}</td>
                    <td>${this.escapeHtml(unit.block)}</td>
                    <td>${this.escapeHtml(unit.reg_type || 'Normal')}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td>${unit.approval_date || '—'}</td>
                    <td>${unit.status === 'pending' ? `<button class="btn-drop" onclick="window.dropUnit('${unit.unit_code}')"><i class="fas fa-trash"></i> Drop</button>` : '—'}</td>
                </tr>`;
            }
            
            this.registeredBody.innerHTML = html;
            
            // Update counts
            const approvedCount = this.registeredUnits.filter(u => u.status === 'approved').length;
            const pendingCount = this.registeredUnits.filter(u => u.status === 'pending').length;
            const approvedSpan = document.getElementById('approved-units-count');
            const pendingSpan = document.getElementById('pending-units-count');
            if (approvedSpan) approvedSpan.textContent = approvedCount;
            if (pendingSpan) pendingSpan.textContent = pendingCount;
            
            // Update badge
            const badge = document.getElementById('unitRegBadge');
            if (badge) {
                if (pendingCount > 0) {
                    badge.textContent = pendingCount;
                    badge.style.display = 'inline-block';
                } else {
                    badge.style.display = 'none';
                }
            }
        }
        
        // ============================================
        // ✅ SELECT ALL / UPDATE COUNT
        // ============================================
        
        updateSelectedCount() {
            const checkboxes = document.querySelectorAll('.unit-checkbox:checked');
            const count = checkboxes.length;
            const selectedSpan = document.getElementById('selected-units-count');
            if (selectedSpan) selectedSpan.textContent = count;
            
            const currentTotal = this.registeredUnits.filter(u => u.status === 'pending' || u.status === 'approved').length;
            const warning = document.getElementById('maxUnitsWarning');
            if (warning) {
                warning.style.display = (count + currentTotal > this.maxUnits) ? 'block' : 'none';
            }
        }
        
        attachCheckboxEvents() {
            const checkboxes = document.querySelectorAll('.unit-checkbox');
            checkboxes.forEach(cb => {
                cb.removeEventListener('change', () => this.updateSelectedCount());
                cb.addEventListener('change', () => this.updateSelectedCount());
            });
        }
        
        selectAllUnits() {
            const checkboxes = document.querySelectorAll('.unit-checkbox');
            const isChecked = this.selectAllCheckbox?.checked || false;
            
            checkboxes.forEach(cb => {
                cb.checked = isChecked;
            });
            
            this.updateSelectedCount();
        }
        
        // ============================================
        // 📤 SUBMIT REGISTRATION - WITH SUPPLEMENTARY SUPPORT
        // ============================================
        
        async submitRegistration() {
            if (this.isSubmitting) {
                console.log('⏳ Submission already in progress...');
                this.showError('Please wait, your registration is already being processed.', 'warning');
                return;
            }
            
            const regType = this.regType?.value;
            if (!regType) {
                this.showError('Please select Registration Type', 'warning');
                return;
            }
            
            const selectedCheckboxes = document.querySelectorAll('.unit-checkbox:checked');
            const selectedCodes = Array.from(selectedCheckboxes).map(cb => cb.dataset.code);
            
            if (selectedCodes.length === 0) {
                this.showError('No units selected', 'warning');
                return;
            }
            
            // ✅ For supplementary: Validate max 3 units
            if (regType === 'Supplementary') {
                const existingSupp = this.registeredUnits.filter(u => u.reg_type === 'Supplementary').length;
                if (selectedCodes.length + existingSupp > 3) {
                    this.showError('You can only register up to 3 supplementary units total.', 'warning');
                    return;
                }
            }
            
            // Check if any selected units are already registered
            const alreadyRegistered = [];
            const newUnits = [];
            
            for (const code of selectedCodes) {
                const existing = this.registeredUnits.find(u => u.unit_code === code);
                if (existing) {
                    alreadyRegistered.push(code);
                } else {
                    newUnits.push(code);
                }
            }
            
            if (newUnits.length === 0) {
                this.showError(`All selected units are already registered.\n\nAlready registered: ${alreadyRegistered.join(', ')}`, 'warning');
                document.querySelectorAll('.unit-checkbox:checked').forEach(cb => cb.checked = false);
                this.updateSelectedCount();
                return;
            }
            
            if (alreadyRegistered.length > 0) {
                const confirmResult = await Swal.fire({
                    title: '⚠️ Some Units Already Registered',
                    html: `The following units are already registered and will be skipped:<br><br>
                           <strong>${alreadyRegistered.join(', ')}</strong><br><br>
                           Proceed with ${newUnits.length} new unit(s)?`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: `Yes, Register ${newUnits.length} Unit(s)`,
                    cancelButtonText: 'Cancel'
                });
                
                if (!confirmResult.isConfirmed) return;
            }
            
            const currentTotal = this.registeredUnits.filter(u => u.status === 'pending' || u.status === 'approved').length;
            if (newUnits.length + currentTotal > this.maxUnits && regType !== 'Supplementary') {
                this.showError(`You can only register up to ${this.maxUnits} units total. You currently have ${currentTotal} units.`, 'warning');
                return;
            }
            
            const confirmResult = await Swal.fire({
                title: 'Confirm Registration',
                text: `Submit ${newUnits.length} unit(s) for ${regType} registration?${alreadyRegistered.length > 0 ? ` (${alreadyRegistered.length} already registered, skipped)` : ''}`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Yes, Submit',
                cancelButtonText: 'Cancel'
            });
            
            if (!confirmResult.isConfirmed) return;
            
            this.isSubmitting = true;
            this.disableSubmitButton(true);
            
            Swal.fire({ 
                title: 'Submitting...', 
                allowOutsideClick: false, 
                didOpen: () => { Swal.showLoading(); } 
            });
            
            try {
                const supabase = window.db?.supabase;
                const studentId = this.userProfile?.user_id || this.userProfile?.id;
                
                const { data: units, error: unitsError } = await supabase
                    .from('units_catalog')
                    .select('*')
                    .in('unit_code', newUnits);
                
                if (unitsError) throw unitsError;
                
                const registrations = units.map(unit => ({
                    student_id: studentId,
                    unit_code: unit.unit_code,
                    unit_name: unit.unit_name,
                    program: unit.program,
                    block: unit.block,
                    intake_year: this.intakeYear,
                    intake_month: this.intakeMonth,
                    reg_type: regType,
                    status: 'pending',
                    submitted_date: new Date().toISOString(),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    credits: unit.credits || 3
                }));
                
                // Check for duplicates one more time
                const { data: existingRegs } = await supabase
                    .from('student_unit_registrations')
                    .select('unit_code')
                    .eq('student_id', studentId)
                    .in('unit_code', newUnits);
                
                const existingCodes = new Set((existingRegs || []).map(r => r.unit_code));
                const finalRegistrations = registrations.filter(r => !existingCodes.has(r.unit_code));
                
                if (finalRegistrations.length === 0) {
                    Swal.close();
                    this.showError('No new units to register. All selected units are already registered.', 'warning');
                    document.querySelectorAll('.unit-checkbox:checked').forEach(cb => cb.checked = false);
                    this.updateSelectedCount();
                    this.isSubmitting = false;
                    this.disableSubmitButton(false);
                    return;
                }
                
                const { error } = await supabase
                    .from('student_unit_registrations')
                    .insert(finalRegistrations);
                
                if (error) {
                    if (error.code === '23505') {
                        Swal.close();
                        this.showError('Some units were already registered. Please refresh and try again.', 'warning');
                        await this.loadUnits();
                        this.isSubmitting = false;
                        this.disableSubmitButton(false);
                        return;
                    }
                    throw error;
                }
                
                Swal.close();
                Swal.fire('Success', `${finalRegistrations.length} unit(s) submitted for ${regType} approval!${alreadyRegistered.length > 0 ? ` (${alreadyRegistered.length} already registered, skipped)` : ''}`, 'success');
                
                document.querySelectorAll('.unit-checkbox:checked').forEach(cb => cb.checked = false);
                if (this.selectAllCheckbox) this.selectAllCheckbox.checked = false;
                this.updateSelectedCount();
                
                await this.loadUnits();
                
                document.dispatchEvent(new CustomEvent('unitRegistrationReady', {
                    detail: { 
                        approvedCount: this.registeredUnits.filter(u => u.status === 'approved').length,
                        supplementaryCount: this.registeredUnits.filter(u => u.reg_type === 'Supplementary').length
                    }
                }));
                
            } catch (error) {
                Swal.close();
                console.error('Error submitting registration:', error);
                this.showError(`Failed to submit: ${error.message}`, 'error');
            } finally {
                this.isSubmitting = false;
                this.disableSubmitButton(false);
            }
        }
        
        // ============================================
        // 🔘 DISABLE SUBMIT BUTTON
        // ============================================
        
        disableSubmitButton(disabled) {
            if (this.submitBtn) {
                this.submitBtn.disabled = disabled;
                this.submitBtn.style.opacity = disabled ? '0.6' : '1';
                this.submitBtn.style.cursor = disabled ? 'not-allowed' : 'pointer';
                if (disabled) {
                    this.submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
                } else {
                    this.submitBtn.innerHTML = '<i class="fas fa-check"></i> Submit Registration';
                }
            }
        }
        
        // ============================================
        // 🗑️ DROP UNIT
        // ============================================
        
        async dropUnit(unitCode) {
            const confirmResult = await Swal.fire({
                title: 'Drop Unit?',
                text: `Are you sure you want to drop unit ${unitCode}?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes, Drop',
                cancelButtonText: 'Cancel'
            });
            
            if (!confirmResult.isConfirmed) return;
            
            Swal.fire({ title: 'Processing...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
            
            try {
                const supabase = window.db?.supabase;
                const studentId = this.userProfile?.user_id || this.userProfile?.id;
                
                const { data: existing } = await supabase
                    .from('student_unit_registrations')
                    .select('id, status')
                    .eq('student_id', studentId)
                    .eq('unit_code', unitCode)
                    .eq('status', 'pending')
                    .maybeSingle();
                
                if (!existing) {
                    Swal.close();
                    this.showError('Unit not found or already approved.', 'warning');
                    return;
                }
                
                const { error } = await supabase
                    .from('student_unit_registrations')
                    .delete()
                    .eq('id', existing.id);
                
                if (error) throw error;
                
                Swal.close();
                Swal.fire('Success', `Unit ${unitCode} dropped successfully!`, 'success');
                await this.loadUnits();
                
                document.dispatchEvent(new CustomEvent('unitRegistrationReady', {
                    detail: { 
                        approvedCount: this.registeredUnits.filter(u => u.status === 'approved').length,
                        supplementaryCount: this.registeredUnits.filter(u => u.reg_type === 'Supplementary').length
                    }
                }));
                
            } catch (error) {
                Swal.close();
                console.error('Error dropping unit:', error);
                this.showError(`Failed to drop: ${error.message}`, 'error');
            }
        }
        
        // ============================================
        // 📊 LOAD MAX UNITS
        // ============================================
        
        async loadMaxUnits(supabase) {
            try {
                const { data, error } = await supabase
                    .from('app_settings')
                    .select('value')
                    .eq('key', 'max_units_per_trimester')
                    .maybeSingle();
                
                if (!error && data) {
                    this.maxUnits = parseInt(data.value);
                }
            } catch (error) {
                console.log('Using default max units: 15');
            }
            
            const maxUnitsSpan = document.getElementById('maxUnitsAllowed');
            if (maxUnitsSpan) {
                maxUnitsSpan.textContent = this.maxUnits;
            }
        }
        
        // ============================================
        // 📚 LOAD BLOCKS
        // ============================================
        
        async loadBlocks(supabase) {
            try {
                let query = supabase
                    .from('units_catalog')
                    .select('block')
                    .eq('status', 'active');
                
                if (this.programCode) {
                    if (this.isTVETStudent) {
                        query = query.eq('program', this.programCode);
                    } else {
                        query = query.eq('program', 'KRCHN');
                    }
                }
                
                const { data, error } = await query;
                
                if (error) throw error;
                
                let blocks = [...new Set(data.map(u => u.block))];
                
                // Sort blocks properly
                if (this.isTVETStudent) {
                    blocks.sort((a, b) => {
                        const matchA = a.match(/Year (\d+) Term (\d+)/);
                        const matchB = b.match(/Year (\d+) Term (\d+)/);
                        if (matchA && matchB) {
                            if (matchA[1] !== matchB[1]) return parseInt(matchA[1]) - parseInt(matchB[1]);
                            return parseInt(matchA[2]) - parseInt(matchB[2]);
                        }
                        return a.localeCompare(b);
                    });
                } else {
                    blocks.sort((a, b) => {
                        const matchA = a.match(/Block (\d+)/);
                        const matchB = b.match(/Block (\d+)/);
                        if (matchA && matchB) {
                            return parseInt(matchA[1]) - parseInt(matchB[1]);
                        }
                        return a.localeCompare(b);
                    });
                }
                
                let options = '<option value="">All Blocks</option>';
                blocks.forEach(block => {
                    options += `<option value="${this.escapeHtml(block)}">${this.escapeHtml(block)}</option>`;
                });
                
                if (this.blockFilter) {
                    this.blockFilter.innerHTML = options;
                    
                    if (this.isTVETStudent && this.userTerm) {
                        if (blocks.includes(this.userTerm)) {
                            this.blockFilter.value = this.userTerm;
                        }
                    } else if (!this.isTVETStudent && this.userBlock) {
                        if (blocks.includes(this.userBlock)) {
                            this.blockFilter.value = this.userBlock;
                        }
                    }
                }
                
                console.log('📚 Blocks loaded for', this.isTVETStudent ? 'TVET' : 'KRCHN', ':', blocks);
                
            } catch (error) {
                console.error('Error loading blocks:', error);
            }
        }
        
        // ============================================
        // 🔄 UTILITY FUNCTIONS
        // ============================================
        
        showLoading() {
            if (this.availableBody) {
                this.availableBody.innerHTML = '<tr><td colspan="7"><div class="loading-spinner"></div> Loading units...</td></tr>';
            }
            if (this.registeredBody) {
                this.registeredBody.innerHTML = '<tr><td colspan="7"><div class="loading-spinner"></div> Loading your registered units...</td></tr>';
            }
        }
        
        showError(message, type = 'error') {
            if (type === 'warning') {
                Swal.fire('Warning', message, 'warning');
            } else {
                Swal.fire('Error', message, 'error');
            }
        }
        
        showWaitingForLogin() {
            const container = document.querySelector('#hub-register');
            if (container && !this.loaded) {
                console.log('⏳ Waiting for login to load unit registration');
            }
        }
        
        dispatchModuleReadyEvent() {
            const event = new CustomEvent('unitRegistrationReady', {
                detail: {
                    totalUnits: this.allUnits.length,
                    registeredCount: this.registeredUnits.length,
                    approvedCount: this.registeredUnits.filter(u => u.status === 'approved').length,
                    pendingCount: this.registeredUnits.filter(u => u.status === 'pending').length,
                    supplementaryCount: this.registeredUnits.filter(u => u.reg_type === 'Supplementary').length,
                    maxUnits: this.maxUnits,
                    isTVETStudent: this.isTVETStudent,
                    programCode: this.programCode,
                    intakeYear: this.intakeYear,
                    intakeMonth: this.intakeMonth,
                    block: this.userBlock,
                    term: this.userTerm,
                    hasSupplementaryEligibility: this.hasSupplementaryEligibility,
                    timestamp: new Date().toISOString()
                }
            });
            document.dispatchEvent(event);
        }
        
        escapeHtml(str) {
            if (!str) return '';
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }
        
        refresh() {
            this.loaded = false;
            this.loadUnits();
        }
        
        getStudentProgramInfo() {
            return {
                programCode: this.programCode,
                programType: this.isTVETStudent ? 'TVET' : 'KRCHN',
                intakeYear: this.intakeYear,
                intakeMonth: this.intakeMonth,
                block: this.userBlock,
                term: this.userTerm,
                hasSupplementaryEligibility: this.hasSupplementaryEligibility,
                supplementaryUnits: this.supplementaryUnits.length
            };
        }
    }
    
    // ============================================
    // 🚀 CREATE GLOBAL INSTANCE
    // ============================================
    
    window.unitRegistrationModule = new UnitRegistrationModule();
    
    // Global functions
    window.dropUnit = (unitCode) => window.unitRegistrationModule?.dropUnit(unitCode);
    window.loadUnitRegistration = () => window.unitRegistrationModule?.refresh();
    window.getUnitRegistrationInfo = () => window.unitRegistrationModule?.getStudentProgramInfo() || {};
    
    console.log('✅ Unit Registration module ready with Supplementary Exam support!');
})();
