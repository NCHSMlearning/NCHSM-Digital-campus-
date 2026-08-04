// ============================================================
// STUDENT DASHBOARD - COMPLETE WITH SUPPLEMENTARY REGISTRATION
// ============================================================

(function() {
    'use strict';
    
    console.log('✅ Student Dashboard loading with Supplementary support...');
    
    // ============================================================
    // MAIN STUDENT CONTROLLER
    // ============================================================
    
    class StudentDashboard {
        constructor() {
            console.log('🔧 Initializing Student Dashboard...');
            
            // User data
            this.userProfile = null;
            this.studentId = null;
            this.programCode = null;
            this.isTVETStudent = false;
            this.intakeYear = null;
            
            // Unit registration data
            this.registeredUnits = [];
            this.availableUnits = [];
            this.allUnits = [];
            this.maxUnits = 15;
            this.isSubmitting = false;
            
            // Supplementary data
            this.failedUnits = [];
            this.supplementaryRegistrations = [];
            this.hasSupplementaryEligibility = false;
            
            // DOM cache
            this.cacheElements();
            
            // Initialize
            this.initializeEventListeners();
            this.loadUserProfile();
            
            console.log('✅ Student Dashboard initialized');
        }
        
        // ============================================================
        // DOM ELEMENT CACHING
        // ============================================================
        
        cacheElements() {
            // Registration tab elements
            this.availableBody = document.getElementById('availableUnitsBody');
            this.registeredBody = document.getElementById('registeredUnitsBody');
            this.blockFilter = document.getElementById('BlockFilter');
            this.unitTypeFilter = document.getElementById('UnitTypeFilter');
            this.regType = document.getElementById('RegType');
            this.refreshBtn = document.getElementById('refreshUnitsBtn');
            this.submitBtn = document.getElementById('submitRegistrationBtn');
            this.selectAllCheckbox = document.getElementById('selectAllUnits');
            this.registrationBadge = document.getElementById('registrationStatusBadge');
            this.registrationStatusText = document.getElementById('registrationStatusText');
            
            // Supplementary tab elements
            this.eligibleBody = document.getElementById('eligibleUnitsBody');
            this.suppRegisteredBody = document.getElementById('suppRegisteredBody');
            this.suppUnitSelect = document.getElementById('suppUnitSelect');
            this.suppRegType = document.getElementById('suppRegType');
            this.suppPaymentRef = document.getElementById('suppPaymentRef');
            this.registerSuppBtn = document.getElementById('registerSupplementaryBtn');
            this.selectAllSupp = document.getElementById('selectAllSupp');
            this.eligibleCount = document.getElementById('eligibleUnitsCount');
            this.suppRegisteredCount = document.getElementById('suppRegisteredCount');
            this.suppTabBadge = document.getElementById('suppTabBadge');
        }
        
        // ============================================================
        // USER PROFILE LOADING
        // ============================================================
        
        loadUserProfile() {
            // Try multiple sources
            const sources = [
                () => window.db?.currentUserProfile,
                () => window.currentUserProfile,
                () => {
                    try {
                        const stored = localStorage.getItem('userProfile');
                        return stored ? JSON.parse(stored) : null;
                    } catch (e) { return null; }
                },
                () => {
                    const stored = sessionStorage.getItem('userProfile');
                    return stored ? JSON.parse(stored) : null;
                }
            ];
            
            for (const source of sources) {
                try {
                    const profile = source();
                    if (profile && (profile.id || profile.user_id)) {
                        this.userProfile = profile;
                        this.studentId = profile.user_id || profile.id;
                        this.updateUserData();
                        console.log('✅ User profile loaded:', this.userProfile.full_name || this.userProfile.email);
                        
                        // Load data
                        this.loadUnits();
                        this.loadSupplementaryData();
                        return;
                    }
                } catch (e) {
                    console.log('Profile source error:', e.message);
                }
            }
            
            console.log('⏳ Waiting for user login...');
            this.showWaitingForLogin();
        }
        
        updateUserData() {
            if (!this.userProfile) return;
            
            // Determine program type
            const tvetPrograms = [
                'DPOTT', 'DCH', 'DHRIT', 'DSL', 'DSW', 'DCJS', 'DHSS', 'DICT', 'DME',
                'CPOTT', 'CCH', 'CHRIT', 'CPC', 'CSL', 'CSW', 'CCJS', 'CAG', 'CHSS', 'CICT',
                'ACH', 'AAG', 'ASW', 'CCA', 'PTE', 'TVET'
            ];
            
            this.programCode = this.userProfile.program || 'KRCHN';
            this.isTVETStudent = tvetPrograms.includes(this.programCode);
            this.intakeYear = this.userProfile.intake_year || 2025;
            
            console.log('📊 User data updated:', {
                program: this.programCode,
                type: this.isTVETStudent ? 'TVET' : 'KRCHN',
                intake: this.intakeYear
            });
        }
        
        // ============================================================
        // EVENT LISTENERS
        // ============================================================
        
        initializeEventListeners() {
            // Login events
            document.addEventListener('userLoggedIn', (e) => {
                console.log('👤 User logged in event received');
                this.userProfile = e.detail?.userProfile;
                this.studentId = this.userProfile?.user_id || this.userProfile?.id;
                this.updateUserData();
                this.loadUnits();
                this.loadSupplementaryData();
            });
            
            document.addEventListener('userProfileUpdated', (e) => {
                if (e.detail?.userProfile) {
                    this.userProfile = e.detail.userProfile;
                    this.studentId = this.userProfile?.user_id || this.userProfile?.id;
                    this.updateUserData();
                    this.loadUnits();
                    this.loadSupplementaryData();
                }
            });
            
            // Refresh button
            if (this.refreshBtn) {
                this.refreshBtn.addEventListener('click', () => {
                    if (!this.userProfile) {
                        this.showError('Please log in first');
                        return;
                    }
                    this.loadUnits();
                    this.loadSupplementaryData();
                });
            }
            
            // Submit registration
            if (this.submitBtn) {
                this.submitBtn.addEventListener('click', () => {
                    if (!this.userProfile) {
                        this.showError('Please log in first');
                        return;
                    }
                    this.submitRegistration();
                });
            }
            
            // Select all
            if (this.selectAllCheckbox) {
                this.selectAllCheckbox.addEventListener('change', () => this.selectAllUnits());
            }
            
            // Filters
            if (this.blockFilter) {
                this.blockFilter.addEventListener('change', () => {
                    if (this.regType?.value) this.loadAvailableUnits();
                });
            }
            
            if (this.unitTypeFilter) {
                this.unitTypeFilter.addEventListener('change', () => {
                    if (this.regType?.value) this.loadAvailableUnits();
                });
            }
            
            if (this.regType) {
                this.regType.addEventListener('change', () => {
                    if (this.regType.value) {
                        this.loadAvailableUnits();
                        this.updateRegistrationTypeUI(this.regType.value);
                    }
                });
            }
            
            // Supplementary form
            if (this.registerSuppBtn) {
                this.registerSuppBtn.addEventListener('click', () => {
                    if (!this.userProfile) {
                        this.showError('Please log in first');
                        return;
                    }
                    this.registerSupplementaryUnits();
                });
            }
            
            if (this.selectAllSupp) {
                this.selectAllSupp.addEventListener('change', () => {
                    document.querySelectorAll('.supp-unit-checkbox:not([disabled])').forEach(cb => {
                        cb.checked = this.selectAllSupp.checked;
                    });
                });
            }
            
            // Tab switching - load supplementary data when tab is shown
            document.addEventListener('tabChanged', (e) => {
                if (e.detail?.tabId === 'hub-supplementary') {
                    this.loadSupplementaryData();
                }
                if (e.detail?.tabId === 'hub-register') {
                    this.loadUnits();
                }
            });
        }
        
        // ============================================================
        // UNIT REGISTRATION - MAIN FUNCTIONS
        // ============================================================
        
        async loadUnits() {
            console.log('📥 Loading units...');
            
            if (!this.userProfile) {
                this.showError('Please log in to register units');
                return;
            }
            
            this.showLoading();
            
            try {
                const supabase = window.db?.supabase;
                if (!supabase) throw new Error('Database connection not available');
                
                await this.loadRegisteredUnits(supabase);
                await this.loadAvailableUnits(supabase);
                await this.loadMaxUnits(supabase);
                await this.loadBlocks(supabase);
                
                this.dispatchReadyEvent();
                console.log('✅ Units loaded successfully');
                
            } catch (error) {
                console.error('❌ Error loading units:', error);
                this.showError(error.message);
            }
        }
        
        async loadRegisteredUnits(supabase) {
            if (!this.studentId) {
                this.registeredUnits = [];
                this.displayRegisteredUnits();
                return;
            }
            
            try {
                const { data, error } = await supabase
                    .from('student_unit_registrations')
                    .select('*')
                    .eq('student_id', this.studentId)
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
                
                if (this.programCode) {
                    if (this.isTVETStudent) {
                        query = query.eq('program', this.programCode);
                    } else {
                        query = query.eq('program', 'KRCHN');
                    }
                }
                
                const block = this.blockFilter?.value;
                if (block && block !== "") {
                    query = query.eq('block', block);
                }
                
                const unitType = this.unitTypeFilter?.value;
                if (unitType && unitType !== "") {
                    query = query.eq('unit_type', unitType);
                }
                
                const { data, error } = await query.order('block').order('unit_code');
                
                if (error) throw error;
                
                this.allUnits = data || [];
                this.displayAvailableUnits();
                
            } catch (error) {
                console.error('Error loading available units:', error);
                if (this.availableBody) {
                    this.availableBody.innerHTML = '<tr><td colspan="7" style="text-align:center">Error loading units</td></tr>';
                }
            }
        }
        
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
            if (maxUnitsSpan) maxUnitsSpan.textContent = this.maxUnits;
        }
        
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
                blocks.sort();
                
                let options = '<option value="">All Blocks</option>';
                blocks.forEach(block => {
                    options += `<option value="${this.escapeHtml(block)}">${this.escapeHtml(block)}</option>`;
                });
                
                if (this.blockFilter) {
                    this.blockFilter.innerHTML = options;
                    
                    // Set current block if available
                    const userBlock = this.isTVETStudent ? 
                        this.userProfile?.term : this.userProfile?.block;
                    if (userBlock && blocks.includes(userBlock)) {
                        this.blockFilter.value = userBlock;
                    }
                }
                
            } catch (error) {
                console.error('Error loading blocks:', error);
            }
        }
        
        // ============================================================
        // DISPLAY FUNCTIONS
        // ============================================================
        
        displayAvailableUnits() {
            if (!this.availableBody) return;
            
            const registeredCodes = new Set(this.registeredUnits.map(u => u.unit_code));
            const pendingCodes = new Set(this.registeredUnits.filter(u => u.status === 'pending').map(u => u.unit_code));
            
            if (this.allUnits.length === 0) {
                this.availableBody.innerHTML = `<tr><td colspan="7" style="text-align:center">No units available for your program.</td></tr>`;
                return;
            }
            
            let html = '';
            for (const unit of this.allUnits) {
                const isRegistered = registeredCodes.has(unit.unit_code);
                const isPending = pendingCodes.has(unit.unit_code);
                
                let statusText = isRegistered ? (isPending ? 'Pending' : 'Approved') : 'Available';
                let statusClass = isRegistered ? (isPending ? 'status-pending' : 'status-approved') : 'status-available';
                
                html += `<tr>
                    <td style="text-align:center">${!isRegistered ? `<input type="checkbox" class="unit-checkbox" data-code="${this.escapeHtml(unit.unit_code)}">` : '—'}</td>
                    <td><strong>${this.escapeHtml(unit.unit_code)}</strong></td>
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
        
        displayRegisteredUnits() {
            if (!this.registeredBody) return;
            
            if (this.registeredUnits.length === 0) {
                this.registeredBody.innerHTML = '<tr><td colspan="7" style="text-align:center">No units registered yet.</td></tr>';
                return;
            }
            
            let html = '';
            for (const unit of this.registeredUnits) {
                const statusClass = unit.status === 'approved' ? 'status-approved' : 'status-pending';
                const statusText = unit.status === 'approved' ? 'Approved' : 'Pending';
                const isSupplementary = unit.reg_type === 'Supplementary';
                const regBadge = isSupplementary ? 
                    '<span style="background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 12px; font-size: 9px; font-weight: 600; margin-left: 4px;">Supplementary</span>' : '';
                
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
        }
        
        updateRegistrationStatus() {
            const pendingCount = this.registeredUnits.filter(u => u.status === 'pending').length;
            const approvedCount = this.registeredUnits.filter(u => u.status === 'approved').length;
            
            if (this.registrationBadge && this.registrationStatusText) {
                if (pendingCount > 0) {
                    this.registrationBadge.style.background = '#fef3c7';
                    this.registrationBadge.style.color = '#92400e';
                    this.registrationStatusText.textContent = `${pendingCount} Pending Approval`;
                } else if (approvedCount > 0) {
                    this.registrationBadge.style.background = '#d1fae5';
                    this.registrationBadge.style.color = '#065f46';
                    this.registrationStatusText.textContent = `${approvedCount} Approved`;
                } else {
                    this.registrationBadge.style.background = '#e2e8f0';
                    this.registrationBadge.style.color = '#64748b';
                    this.registrationStatusText.textContent = 'No Registrations';
                }
            }
        }
        
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
            document.querySelectorAll('.unit-checkbox').forEach(cb => {
                cb.removeEventListener('change', () => this.updateSelectedCount());
                cb.addEventListener('change', () => this.updateSelectedCount());
            });
        }
        
        selectAllUnits() {
            const isChecked = this.selectAllCheckbox?.checked || false;
            document.querySelectorAll('.unit-checkbox').forEach(cb => {
                cb.checked = isChecked;
            });
            this.updateSelectedCount();
        }
        
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
                        <span>Supplementary registration is for students who need to retake failed units.</span>
                    `;
                    warningBox.style.display = 'flex';
                }
            } else {
                if (infoText) {
                    infoText.innerHTML = `
                        <i class="fas fa-info-circle" style="color: #3B82F6;"></i>
                        Normal Registration: Select up to ${this.maxUnits} units for the current trimester.
                    `;
                    infoText.style.display = 'block';
                }
                if (warningBox) warningBox.style.display = 'none';
            }
        }
        
        // ============================================================
        // SUBMIT REGISTRATION
        // ============================================================
        
        async submitRegistration() {
            if (this.isSubmitting) {
                this.showError('Please wait, registration is being processed.', 'warning');
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
                this.showError(`All selected units are already registered.`, 'warning');
                document.querySelectorAll('.unit-checkbox:checked').forEach(cb => cb.checked = false);
                this.updateSelectedCount();
                return;
            }
            
            const currentTotal = this.registeredUnits.filter(u => u.status === 'pending' || u.status === 'approved').length;
            if (newUnits.length + currentTotal > this.maxUnits) {
                this.showError(`You can only register up to ${this.maxUnits} units total.`, 'warning');
                return;
            }
            
            if (!confirm(`Submit ${newUnits.length} unit(s) for ${regType} registration?`)) return;
            
            this.isSubmitting = true;
            this.disableSubmitButton(true);
            
            try {
                const supabase = window.db?.supabase;
                
                const { data: units, error: unitsError } = await supabase
                    .from('units_catalog')
                    .select('*')
                    .in('unit_code', newUnits);
                
                if (unitsError) throw unitsError;
                
                const registrations = units.map(unit => ({
                    student_id: this.studentId,
                    unit_code: unit.unit_code,
                    unit_name: unit.unit_name,
                    program: unit.program,
                    block: unit.block,
                    intake_year: this.intakeYear,
                    reg_type: regType,
                    status: 'pending',
                    submitted_date: new Date().toISOString(),
                    created_at: new Date().toISOString(),
                    credits: unit.credits || 3
                }));
                
                const { error } = await supabase
                    .from('student_unit_registrations')
                    .insert(registrations);
                
                if (error) throw error;
                
                this.showSuccess(`${registrations.length} unit(s) submitted for ${regType} approval!`);
                
                document.querySelectorAll('.unit-checkbox:checked').forEach(cb => cb.checked = false);
                if (this.selectAllCheckbox) this.selectAllCheckbox.checked = false;
                this.updateSelectedCount();
                
                await this.loadUnits();
                
            } catch (error) {
                console.error('Error submitting registration:', error);
                this.showError(`Failed to submit: ${error.message}`, 'error');
            } finally {
                this.isSubmitting = false;
                this.disableSubmitButton(false);
            }
        }
        
        disableSubmitButton(disabled) {
            if (this.submitBtn) {
                this.submitBtn.disabled = disabled;
                this.submitBtn.style.opacity = disabled ? '0.6' : '1';
                this.submitBtn.innerHTML = disabled ? 
                    '<i class="fas fa-spinner fa-spin"></i> Submitting...' :
                    '<i class="fas fa-check"></i> Submit Registration';
            }
        }
        
        // ============================================================
        // SUPPLEMENTARY REGISTRATION
        // ============================================================
        
        async loadSupplementaryData() {
            console.log('📚 Loading supplementary data...');
            await this.loadEligibleSupplementaryUnits();
            await this.loadStudentSupplementaryRegistrations();
        }
        
        async loadEligibleSupplementaryUnits() {
            const tbody = this.eligibleBody;
            if (!tbody) return;
            
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: #94a3b8;">
                        <div style="width: 30px; height: 30px; border: 3px solid #e5e7eb; border-top-color: #B45309; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 10px;"></div>
                        <p>Loading eligible units...</p>
                    </td>
                </tr>
            `;
            
            try {
                const supabase = window.db?.supabase;
                if (!this.studentId || !supabase) throw new Error('Student ID or Supabase not available');
                
                // Get student's exam grades
                const { data: grades, error: gradeError } = await supabase
                    .from('exam_grades')
                    .select('*, exams:exam_id(unit_code, course_name, block_term, exam_name, program_type)')
                    .eq('student_id', this.studentId);
                
                if (gradeError) throw gradeError;
                
                // Find failed units (score < 50)
                const failedUnits = [];
                const processed = new Set();
                
                if (grades) {
                    for (const grade of grades) {
                        const score = grade.total_score || grade.marks || 0;
                        const unitCode = grade.exams?.unit_code || grade.subject_name || grade.exam_name;
                        
                        if (score < 50 && unitCode && !processed.has(unitCode)) {
                            processed.add(unitCode);
                            
                            // Check if already registered for supplementary
                            const { data: existingReg } = await supabase
                                .from('student_unit_registrations')
                                .select('id, status')
                                .eq('student_id', this.studentId)
                                .eq('unit_code', unitCode)
                                .in('reg_type', ['Supplementary', 'Resit', 'Retake'])
                                .maybeSingle();
                            
                            // Determine registration type
                            let regType = 'Supplementary';
                            if (score < 30) regType = 'Retake';
                            else if (score < 40) regType = 'Resit';
                            
                            failedUnits.push({
                                unit_code: unitCode,
                                unit_name: grade.exams?.course_name || grade.subject_name || unitCode,
                                block: grade.exams?.block_term || 'N/A',
                                score: score,
                                reg_type: regType,
                                status: existingReg ? existingReg.status : 'Eligible',
                                existing_id: existingReg?.id || null
                            });
                        }
                    }
                }
                
                this.failedUnits = failedUnits;
                this.hasSupplementaryEligibility = failedUnits.length > 0;
                
                // Render
                this.renderEligibleUnitsTable(failedUnits);
                
                if (this.eligibleCount) {
                    this.eligibleCount.textContent = `${failedUnits.length} units`;
                }
                
                // Update badge
                if (this.suppTabBadge) {
                    const pendingCount = this.registeredUnits.filter(u => 
                        u.reg_type === 'Supplementary' && u.status === 'pending'
                    ).length;
                    if (pendingCount > 0) {
                        this.suppTabBadge.textContent = pendingCount;
                        this.suppTabBadge.style.display = 'inline-block';
                    } else {
                        this.suppTabBadge.style.display = 'none';
                    }
                }
                
                console.log(`✅ Loaded ${failedUnits.length} eligible supplementary units`);
                
            } catch (error) {
                console.error('❌ Error loading eligible units:', error);
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; padding: 40px; color: #dc2626;">
                            <i class="fas fa-exclamation-circle" style="font-size: 40px; display: block; margin-bottom: 10px;"></i>
                            Error: ${error.message}
                        </td>
                    </tr>
                `;
            }
        }
        
        renderEligibleUnitsTable(units) {
            const tbody = this.eligibleBody;
            if (!tbody) return;
            
            if (units.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; padding: 40px; color: #94a3b8;">
                            <i class="fas fa-check-circle" style="font-size: 40px; color: #10b981; display: block; margin-bottom: 10px;"></i>
                            <p>No eligible units for supplementary registration.</p>
                            <p style="font-size: 12px;">All your units have been passed or already registered.</p>
                        </td>
                    </tr>
                `;
                return;
            }
            
            let html = '';
            for (const unit of units) {
                const isRegistered = unit.status !== 'Eligible';
                const statusText = unit.status === 'approved' ? '✅ Approved' : 
                                  unit.status === 'pending' ? '⏳ Pending' : '✅ Eligible';
                const statusColor = unit.status === 'approved' ? '#059669' : 
                                   unit.status === 'pending' ? '#f59e0b' : '#10b981';
                
                html += `
                    <tr>
                        <td style="padding: 12px 16px; text-align: center;">
                            <input type="checkbox" class="supp-unit-checkbox" data-unit='${JSON.stringify(unit)}' 
                                   ${isRegistered ? 'disabled' : ''} style="width: 16px; height: 16px; cursor: pointer;">
                        </td>
                        <td style="padding: 12px 16px; text-align: left; font-weight: 600; color: #0A3D62;">${this.escapeHtml(unit.unit_code)}</td>
                        <td style="padding: 12px 16px; text-align: left;">${this.escapeHtml(unit.unit_name)}</td>
                        <td style="padding: 12px 16px; text-align: left;">${this.escapeHtml(unit.block)}</td>
                        <td style="padding: 12px 16px; text-align: center;">
                            <span style="color: ${unit.score < 40 ? '#dc2626' : '#f59e0b'}; font-weight: 600;">${unit.score}%</span>
                        </td>
                        <td style="padding: 12px 16px; text-align: center;">
                            <span style="background: #fef3c7; color: #92400e; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;">
                                ${unit.reg_type}
                            </span>
                        </td>
                        <td style="padding: 12px 16px; text-align: center;">
                            <span style="background: ${isRegistered ? '#fef3c7' : '#d1fae5'}; color: ${statusColor}; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;">
                                ${statusText}
                            </span>
                        </td>
                    </tr>
                `;
            }
            
            tbody.innerHTML = html;
            
            // Populate dropdown
            if (this.suppUnitSelect) {
                const availableUnits = units.filter(u => u.status === 'Eligible');
                this.suppUnitSelect.innerHTML = '<option value="">-- Select Unit --</option>';
                availableUnits.forEach(unit => {
                    const opt = document.createElement('option');
                    opt.value = unit.unit_code;
                    opt.textContent = `${unit.unit_code} - ${unit.unit_name} (${unit.reg_type})`;
                    this.suppUnitSelect.appendChild(opt);
                });
            }
        }
        
        async loadStudentSupplementaryRegistrations() {
            const tbody = this.suppRegisteredBody;
            if (!tbody) return;
            
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: #94a3b8;">
                        <div style="width: 30px; height: 30px; border: 3px solid #e5e7eb; border-top-color: #D97706; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 10px;"></div>
                        <p>Loading supplementary registrations...</p>
                    </td>
                </tr>
            `;
            
            try {
                const supabase = window.db?.supabase;
                if (!this.studentId || !supabase) return;
                
                const { data: registrations, error } = await supabase
                    .from('student_unit_registrations')
                    .select('*')
                    .eq('student_id', this.studentId)
                    .in('reg_type', ['Supplementary', 'Resit', 'Retake'])
                    .order('submitted_date', { ascending: false });
                
                if (error) throw error;
                
                this.supplementaryRegistrations = registrations || [];
                
                if (this.supplementaryRegistrations.length === 0) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="7" style="text-align: center; padding: 40px; color: #94a3b8;">
                                <i class="fas fa-inbox" style="font-size: 40px; display: block; margin-bottom: 10px;"></i>
                                <p>No supplementary registrations found.</p>
                            </td>
                        </tr>
                    `;
                    if (this.suppRegisteredCount) this.suppRegisteredCount.textContent = '0';
                    return;
                }
                
                let html = '';
                for (const reg of this.supplementaryRegistrations) {
                    const statusColor = reg.status === 'approved' ? '#059669' : 
                                       reg.status === 'pending' ? '#f59e0b' : '#dc2626';
                    const statusBg = reg.status === 'approved' ? '#d1fae5' : 
                                    reg.status === 'pending' ? '#fef3c7' : '#fee2e2';
                    const statusText = reg.status === 'approved' ? '✅ Approved' : 
                                      reg.status === 'pending' ? '⏳ Pending' : '❌ Rejected';
                    const regDate = reg.submitted_date ? new Date(reg.submitted_date).toLocaleDateString() : 'N/A';
                    
                    const canDownloadCard = reg.status === 'approved';
                    
                    html += `
                        <tr>
                            <td style="padding: 12px 16px; text-align: left; font-weight: 600; color: #0A3D62;">${this.escapeHtml(reg.unit_code)}</td>
                            <td style="padding: 12px 16px; text-align: left;">${this.escapeHtml(reg.unit_name)}</td>
                            <td style="padding: 12px 16px; text-align: left;">${this.escapeHtml(reg.block || 'N/A')}</td>
                            <td style="padding: 12px 16px; text-align: center;">
                                <span style="background: #fef3c7; color: #92400e; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;">
                                    ${this.escapeHtml(reg.reg_type)}
                                </span>
                            </td>
                            <td style="padding: 12px 16px; text-align: center;">
                                <span style="background: ${statusBg}; color: ${statusColor}; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;">
                                    ${statusText}
                                </span>
                            </td>
                            <td style="padding: 12px 16px; text-align: center;">${regDate}</td>
                            <td style="padding: 12px 16px; text-align: center;">
                                ${canDownloadCard ? `
                                    <button onclick="window.downloadSupplementaryExamCard('${reg.id}', '${this.escapeHtml(reg.unit_code)}')" 
                                            style="background: #10b981; color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 11px;">
                                        <i class="fas fa-download"></i> Exam Card
                                    </button>
                                ` : reg.status === 'pending' ? `
                                    <span style="color: #6b7280; font-size: 11px;">Awaiting Approval</span>
                                ` : `
                                    <span style="color: #dc2626; font-size: 11px;">Not Available</span>
                                `}
                            </td>
                        </tr>
                    `;
                }
                
                tbody.innerHTML = html;
                if (this.suppRegisteredCount) {
                    this.suppRegisteredCount.textContent = this.supplementaryRegistrations.length;
                }
                
            } catch (error) {
                console.error('❌ Error loading supplementary registrations:', error);
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; padding: 40px; color: #dc2626;">
                            <i class="fas fa-exclamation-circle" style="font-size: 40px; display: block; margin-bottom: 10px;"></i>
                            Error: ${error.message}
                        </td>
                    </tr>
                `;
            }
        }
        
        async registerSupplementaryUnits() {
            const submitBtn = this.registerSuppBtn;
            const originalText = submitBtn?.innerHTML || 'Register';
            
            if (this.isSubmitting) {
                this.showError('Please wait, registration is being processed.', 'warning');
                return;
            }
            
            // Get selected units
            const selectedCheckboxes = document.querySelectorAll('.supp-unit-checkbox:checked');
            const selectedUnits = [];
            selectedCheckboxes.forEach(cb => {
                try {
                    const unitData = JSON.parse(cb.dataset.unit);
                    selectedUnits.push(unitData);
                } catch (e) {
                    console.warn('Could not parse unit data:', e);
                }
            });
            
            // Check dropdown
            const select = this.suppUnitSelect;
            const regType = this.suppRegType?.value;
            const paymentRef = this.suppPaymentRef?.value?.trim();
            
            if (select && select.value) {
                const existing = selectedUnits.find(u => u.unit_code === select.value);
                if (!existing) {
                    const matchingUnit = this.failedUnits.find(u => u.unit_code === select.value);
                    if (matchingUnit) {
                        selectedUnits.push(matchingUnit);
                    } else {
                        selectedUnits.push({
                            unit_code: select.value,
                            unit_name: select.options[select.selectedIndex]?.text?.split('-')[1]?.trim() || select.value,
                            reg_type: regType || 'Supplementary',
                            score: 0,
                            block: 'N/A'
                        });
                    }
                }
            }
            
            if (selectedUnits.length === 0) {
                this.showError('⚠️ Please select at least one unit to register.', 'warning');
                return;
            }
            
            // Validate max 3 supplementary units
            const existingSupp = this.registeredUnits.filter(u => u.reg_type === 'Supplementary').length;
            if (selectedUnits.length + existingSupp > 3) {
                this.showError('You can only register up to 3 supplementary units total.', 'warning');
                return;
            }
            
            const unitNames = selectedUnits.map(u => `${u.unit_code} (${u.reg_type || 'Supplementary'})`).join(', ');
            if (!confirm(`Register for ${selectedUnits.length} supplementary unit(s)?\n\n${unitNames}`)) return;
            
            this.isSubmitting = true;
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';
            }
            
            try {
                const supabase = window.db?.supabase;
                let successCount = 0;
                let errorCount = 0;
                
                for (const unit of selectedUnits) {
                    try {
                        const { data: existing } = await supabase
                            .from('student_unit_registrations')
                            .select('id')
                            .eq('student_id', this.studentId)
                            .eq('unit_code', unit.unit_code)
                            .in('reg_type', ['Supplementary', 'Resit', 'Retake'])
                            .neq('status', 'rejected')
                            .maybeSingle();
                        
                        if (existing) {
                            console.log(`⚠️ Already registered for ${unit.unit_code}`);
                            continue;
                        }
                        
                        const regData = {
                            student_id: this.studentId,
                            unit_code: unit.unit_code,
                            unit_name: unit.unit_name || 'Unknown Unit',
                            block: unit.block || null,
                            reg_type: unit.reg_type || regType || 'Supplementary',
                            status: 'pending',
                            payment_reference: paymentRef || null,
                            submitted_date: new Date().toISOString().split('T')[0],
                            created_at: new Date().toISOString()
                        };
                        
                        const { error } = await supabase
                            .from('student_unit_registrations')
                            .insert([regData]);
                        
                        if (error) throw error;
                        successCount++;
                        
                    } catch (err) {
                        console.error(`Error registering ${unit.unit_code}:`, err);
                        errorCount++;
                    }
                }
                
                if (successCount > 0) {
                    this.showSuccess(`✅ Successfully registered for ${successCount} supplementary unit(s)!`);
                    
                    await this.loadUnits();
                    await this.loadSupplementaryData();
                    
                    if (select) select.value = '';
                    if (this.suppPaymentRef) this.suppPaymentRef.value = '';
                    document.querySelectorAll('.supp-unit-checkbox:checked').forEach(cb => cb.checked = false);
                    
                } else {
                    this.showError(`❌ Registration failed. ${errorCount} error(s) occurred.`, 'error');
                }
                
            } catch (error) {
                console.error('❌ Registration error:', error);
                this.showError(`❌ Registration failed: ${error.message}`, 'error');
            } finally {
                this.isSubmitting = false;
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                }
            }
        }
        
        // ============================================================
        // SUPPLEMENTARY EXAM CARD DOWNLOAD
        // ============================================================
        
        async downloadSupplementaryExamCard(regId, unitCode) {
            try {
                this.showInfo('📥 Generating exam card...');
                
                const supabase = window.db?.supabase;
                
                const { data: registration, error: regError } = await supabase
                    .from('student_unit_registrations')
                    .select('*')
                    .eq('id', regId)
                    .single();
                
                if (regError) throw regError;
                
                const { data: profile, error: profileError } = await supabase
                    .from('consolidated_user_profiles_table')
                    .select('*')
                    .eq('user_id', this.studentId)
                    .single();
                
                if (profileError) throw profileError;
                
                const examCardHTML = this.generateExamCardHTML(registration, profile);
                
                const win = window.open('', '_blank', 'width=600,height=800');
                if (win) {
                    win.document.write(examCardHTML);
                    win.document.close();
                    this.showSuccess('✅ Exam card generated!');
                } else {
                    const blob = new Blob([examCardHTML], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Supplementary_Exam_Card_${unitCode}_${new Date().toISOString().split('T')[0]}.html`;
                    a.click();
                    URL.revokeObjectURL(url);
                    this.showSuccess('✅ Exam card downloaded!');
                }
                
            } catch (error) {
                console.error('❌ Error generating exam card:', error);
                this.showError(`❌ Error: ${error.message}`, 'error');
            }
        }
        
        generateExamCardHTML(registration, profile) {
            return `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Supplementary Exam Card - ${registration.unit_code}</title>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 40px; background: #f0f4f8; }
                        .card { max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; padding: 30px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); border: 2px solid #B45309; }
                        .header { text-align: center; border-bottom: 2px solid #B45309; padding-bottom: 15px; margin-bottom: 20px; }
                        .header h1 { color: #B45309; margin: 0; font-size: 24px; }
                        .header p { color: #6b7280; margin: 5px 0 0; }
                        .details { margin: 20px 0; }
                        .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
                        .label { color: #6b7280; font-weight: 500; }
                        .value { font-weight: 600; color: #1e293b; }
                        .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; background: #fef3c7; color: #92400e; }
                        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
                        .warning { text-align: center; margin: 20px 0; padding: 10px; background: #fef3c7; border-radius: 8px; }
                        .warning p { margin: 0; color: #92400e; font-size: 13px; }
                        @media print { body { background: white; padding: 20px; } .card { box-shadow: none; } }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <div class="header">
                            <h1>📋 Supplementary Exam Card</h1>
                            <p>Nakuru College of Health Sciences and Management</p>
                        </div>
                        
                        <div class="details">
                            <div class="row">
                                <span class="label">👤 Student Name</span>
                                <span class="value">${profile?.full_name || 'N/A'}</span>
                            </div>
                            <div class="row">
                                <span class="label">🆔 Student ID</span>
                                <span class="value">${profile?.student_id || profile?.user_id?.substring(0, 8) || 'N/A'}</span>
                            </div>
                            <div class="row">
                                <span class="label">📚 Program</span>
                                <span class="value">${profile?.program || 'N/A'}</span>
                            </div>
                            <div class="row">
                                <span class="label">📌 Block/Term</span>
                                <span class="value">${registration.block || 'N/A'}</span>
                            </div>
                            <div class="row">
                                <span class="label">📖 Unit Code</span>
                                <span class="value">${registration.unit_code}</span>
                            </div>
                            <div class="row">
                                <span class="label">📝 Unit Name</span>
                                <span class="value">${registration.unit_name}</span>
                            </div>
                            <div class="row">
                                <span class="label">📋 Registration Type</span>
                                <span class="value"><span class="badge">${registration.reg_type}</span></span>
                            </div>
                            <div class="row">
                                <span class="label">📅 Registration Date</span>
                                <span class="value">${registration.submitted_date || 'N/A'}</span>
                            </div>
                            <div class="row">
                                <span class="label">✅ Status</span>
                                <span class="value" style="color: #059669;">Approved</span>
                            </div>
                        </div>
                        
                        <div class="warning">
                            <p>⚠️ This is a supplementary exam. Please bring this card to the exam hall.</p>
                        </div>
                        
                        <div class="footer">
                            <p>Generated on ${new Date().toLocaleString()}</p>
                            <p style="font-size: 10px;">This is a computer-generated document. No signature required.</p>
                        </div>
                    </div>
                    <script>window.print();<\/script>
                </body>
                </html>
            `;
        }
        
        // ============================================================
        // DROP UNIT
        // ============================================================
        
        async dropUnit(unitCode) {
            if (!confirm(`Drop unit ${unitCode}?`)) return;
            
            try {
                const supabase = window.db?.supabase;
                
                const { data: existing } = await supabase
                    .from('student_unit_registrations')
                    .select('id')
                    .eq('student_id', this.studentId)
                    .eq('unit_code', unitCode)
                    .eq('status', 'pending')
                    .maybeSingle();
                
                if (!existing) {
                    this.showError('Unit not found or already approved.', 'warning');
                    return;
                }
                
                const { error } = await supabase
                    .from('student_unit_registrations')
                    .delete()
                    .eq('id', existing.id);
                
                if (error) throw error;
                
                this.showSuccess(`Unit ${unitCode} dropped successfully!`);
                await this.loadUnits();
                
            } catch (error) {
                console.error('Error dropping unit:', error);
                this.showError(`Failed to drop: ${error.message}`, 'error');
            }
        }
        
        // ============================================================
        // UTILITY FUNCTIONS
        // ============================================================
        
        showLoading() {
            if (this.availableBody) {
                this.availableBody.innerHTML = '<tr><td colspan="7"><div class="loading-spinner"></div> Loading units...</td></tr>';
            }
            if (this.registeredBody) {
                this.registeredBody.innerHTML = '<tr><td colspan="7"><div class="loading-spinner"></div> Loading registered units...</td></tr>';
            }
        }
        
        showError(message, type = 'error') {
            if (type === 'warning') {
                Swal.fire('Warning', message, 'warning');
            } else {
                Swal.fire('Error', message, 'error');
            }
        }
        
        showSuccess(message) {
            Swal.fire('Success', message, 'success');
        }
        
        showInfo(message) {
            Swal.fire('Info', message, 'info');
        }
        
        showWaitingForLogin() {
            const container = document.querySelector('#hub-register');
            if (container) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 60px 20px;">
                        <i class="fas fa-user-lock" style="font-size: 48px; color: #94a3b8; margin-bottom: 16px; display: block;"></i>
                        <h3 style="color: #1e293b;">Please Log In</h3>
                        <p style="color: #94a3b8;">You need to be logged in to register for units.</p>
                        <button onclick="window.location.href='login.html'" style="padding: 10px 24px; background: #4C1D95; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                            <i class="fas fa-sign-in-alt"></i> Go to Login
                        </button>
                    </div>
                `;
            }
        }
        
        dispatchReadyEvent() {
            document.dispatchEvent(new CustomEvent('unitRegistrationReady', {
                detail: {
                    totalUnits: this.allUnits.length,
                    registeredCount: this.registeredUnits.length,
                    approvedCount: this.registeredUnits.filter(u => u.status === 'approved').length,
                    pendingCount: this.registeredUnits.filter(u => u.status === 'pending').length,
                    supplementaryCount: this.registeredUnits.filter(u => u.reg_type === 'Supplementary').length,
                    maxUnits: this.maxUnits,
                    isTVETStudent: this.isTVETStudent,
                    programCode: this.programCode,
                    hasSupplementaryEligibility: this.hasSupplementaryEligibility,
                    failedUnits: this.failedUnits.length
                }
            }));
        }
        
        escapeHtml(str) {
            if (!str) return '';
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }
        
        refresh() {
            this.loadUnits();
            this.loadSupplementaryData();
        }
    }
    
    // ============================================================
    // INSTANTIATE
    // ============================================================
    
    const studentDashboard = new StudentDashboard();
    
    // Global functions for HTML onclick
    window.dropUnit = (unitCode) => studentDashboard.dropUnit(unitCode);
    window.loadUnitRegistration = () => studentDashboard.refresh();
    window.downloadSupplementaryExamCard = (regId, unitCode) => 
        studentDashboard.downloadSupplementaryExamCard(regId, unitCode);
    
    // Expose the instance
    window.studentDashboard = studentDashboard;
    
    console.log('✅ Student Dashboard ready with Supplementary support!');
    
})();
