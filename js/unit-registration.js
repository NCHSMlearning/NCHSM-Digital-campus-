// ============================================================
// STUDENT DASHBOARD - UNIT REGISTRATION WITH SUPPLEMENTARY SUPPORT
// CONNECTED TO ACADEMIC REPORTS DATA
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
            this.isInitialized = false;
            
            // Supplementary data
            this.failedUnits = [];
            this.supplementaryRegistrations = [];
            this.hasSupplementaryEligibility = false;
            
            // DOM cache
            this.cacheElements();
            
            // Initialize
            this.initializeEventListeners();
            
            // Wait for page to be fully loaded and user to be logged in
            console.log('⏳ Waiting for user login...');
            
            // Check if user is already logged in
            this.delayedLoad();
        }
        
        // ============================================================
        // DELAYED LOAD - Wait for auth to be ready
        // ============================================================
        
        delayedLoad() {
            // Try immediately
            if (this.tryLoadUser()) {
                return;
            }
            
            // Try again after 1 second
            setTimeout(() => {
                if (this.tryLoadUser()) {
                    return;
                }
            }, 1000);
            
            // Try again after 3 seconds
            setTimeout(() => {
                if (this.tryLoadUser()) {
                    return;
                }
            }, 3000);
            
            // Final try after 5 seconds
            setTimeout(() => {
                if (!this.isInitialized) {
                    console.warn('⚠️ Could not auto-load user profile. Waiting for login event...');
                    this.showWaitingForLogin();
                }
            }, 5000);
        }
        
        tryLoadUser() {
            const profile = this.getUserProfileFromAnySource();
            
            if (profile && (profile.id || profile.user_id)) {
                console.log('👤 User found:', profile.full_name || profile.email);
                this.userProfile = profile;
                this.studentId = profile.user_id || profile.id;
                this.updateUserData();
                
                // Load all data
                this.loadUnits();
                this.loadSupplementaryData();
                this.isInitialized = true;
                return true;
            }
            return false;
        }
        
        // ============================================================
        // USER PROFILE LOADING
        // ============================================================
        
        getUserProfileFromAnySource() {
            const sources = [
                () => window.db?.currentUserProfile,
                () => window.currentUserProfile,
                () => window.userProfile,
                () => {
                    try {
                        const stored = localStorage.getItem('userProfile');
                        return stored ? JSON.parse(stored) : null;
                    } catch (e) { return null; }
                },
                () => {
                    try {
                        const stored = sessionStorage.getItem('userProfile');
                        return stored ? JSON.parse(stored) : null;
                    } catch (e) { return null; }
                }
            ];
            
            for (const source of sources) {
                try {
                    const profile = source();
                    if (profile && (profile.id || profile.user_id)) {
                        return profile;
                    }
                } catch (e) {
                    console.log('Profile source error:', e.message);
                }
            }
            
            return null;
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
            this.suppTabBadge = document.getElementById('suppBadge');
        }
        
        // ============================================================
        // EVENT LISTENERS
        // ============================================================
        
        initializeEventListeners() {
            // Login events
            document.addEventListener('userLoggedIn', (e) => {
                console.log('👤 User logged in event received');
                this.userProfile = e.detail?.userProfile;
                if (this.userProfile) {
                    this.studentId = this.userProfile.user_id || this.userProfile.id;
                    this.updateUserData();
                    this.loadUnits();
                    this.loadSupplementaryData();
                    this.isInitialized = true;
                }
            });
            
            document.addEventListener('userProfileUpdated', (e) => {
                if (e.detail?.userProfile) {
                    console.log('👤 User profile updated');
                    this.userProfile = e.detail.userProfile;
                    this.studentId = this.userProfile.user_id || this.userProfile.id;
                    this.updateUserData();
                    if (!this.isInitialized) {
                        this.loadUnits();
                        this.loadSupplementaryData();
                        this.isInitialized = true;
                    } else {
                        // Refresh data
                        this.loadUnits();
                        this.loadSupplementaryData();
                    }
                }
            });
            
            // App ready event
            document.addEventListener('appReady', () => {
                console.log('📱 App ready event received');
                if (!this.isInitialized) {
                    this.tryLoadUser();
                }
            });
            
            // Refresh button
            if (this.refreshBtn) {
                this.refreshBtn.addEventListener('click', () => {
                    if (!this.userProfile || !this.isInitialized) {
                        this.showError('Please wait for login to complete');
                        return;
                    }
                    this.loadUnits();
                    this.loadSupplementaryData();
                });
            }
            
            // Submit registration
            if (this.submitBtn) {
                this.submitBtn.addEventListener('click', () => {
                    if (!this.userProfile || !this.isInitialized) {
                        this.showError('Please wait for login to complete');
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
                    if (this.regType?.value && this.isInitialized) {
                        this.loadAvailableUnits();
                    }
                });
            }
            
            if (this.unitTypeFilter) {
                this.unitTypeFilter.addEventListener('change', () => {
                    if (this.regType?.value && this.isInitialized) {
                        this.loadAvailableUnits();
                    }
                });
            }
            
            if (this.regType) {
                this.regType.addEventListener('change', () => {
                    if (this.regType.value && this.isInitialized) {
                        this.loadAvailableUnits();
                        this.updateRegistrationTypeUI(this.regType.value);
                    }
                });
            }
            
            // Supplementary form
            if (this.registerSuppBtn) {
                this.registerSuppBtn.addEventListener('click', () => {
                    if (!this.userProfile || !this.isInitialized) {
                        this.showError('Please wait for login to complete');
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
                if (e.detail?.tabId === 'hub-supplementary' && this.isInitialized) {
                    this.loadSupplementaryData();
                }
                if (e.detail?.tabId === 'hub-register' && this.isInitialized) {
                    this.loadUnits();
                }
            });
            
            // Sub-tab switching for Regular/Supplementary
            this.setupSubTabSwitching();
        }
        
        // ============================================================
        // SUB-TAB SWITCHING
        // ============================================================
        
        setupSubTabSwitching() {
            const subTabs = document.querySelectorAll('.reg-sub-tab');
            const regularContent = document.getElementById('regular-registration');
            const suppContent = document.getElementById('supplementary-registration');
            
            if (!subTabs.length) {
                console.log('No sub-tabs found, skipping setup');
                return;
            }
            
            console.log('🔘 Setting up sub-tab switching...');
            
            // Set default - show regular
            if (regularContent) regularContent.style.display = 'block';
            if (suppContent) suppContent.style.display = 'none';
            
            subTabs.forEach(tab => {
                tab.addEventListener('click', function(e) {
                    e.preventDefault();
                    const tabType = this.dataset.subtab;
                    console.log('🔘 Sub-tab clicked:', tabType);
                    
                    // Remove active class from all tabs
                    subTabs.forEach(t => {
                        t.classList.remove('active');
                        t.style.color = '#6b7280';
                        t.style.borderBottom = '3px solid transparent';
                    });
                    
                    // Add active class to clicked tab
                    this.classList.add('active');
                    this.style.color = '#4C1D95';
                    this.style.borderBottom = '3px solid #4C1D95';
                    
                    // Show corresponding content
                    if (tabType === 'supplementary') {
                        if (regularContent) regularContent.style.display = 'none';
                        if (suppContent) {
                            suppContent.style.display = 'block';
                            console.log('✅ Supplementary tab shown');
                            // Load supplementary data
                            if (window.studentDashboard) {
                                window.studentDashboard.loadSupplementaryData();
                            }
                        }
                    } else {
                        if (suppContent) suppContent.style.display = 'none';
                        if (regularContent) {
                            regularContent.style.display = 'block';
                            console.log('✅ Regular tab shown');
                            // Load regular units
                            if (window.studentDashboard) {
                                window.studentDashboard.loadUnits();
                            }
                        }
                    }
                });
            });
            
            console.log('✅ Sub-tab switching setup complete');
        }
        
        // ============================================================
        // GET SUPABASE CLIENT
        // ============================================================
        
        getSupabase() {
            // Try multiple sources
            if (window.sb) return window.sb;
            if (window.db?.supabase) return window.db.supabase;
            if (window.supabase) return window.supabase;
            return null;
        }
        
        // ============================================================
        // UNIT REGISTRATION - MAIN FUNCTIONS
        // ============================================================
        
        async loadUnits() {
            console.log('📥 Loading units...');
            
            if (!this.userProfile || !this.studentId) {
                console.warn('⚠️ No user profile or student ID available');
                this.showWaitingForLogin();
                return;
            }
            
            this.showLoading();
            
            try {
                const supabase = this.getSupabase();
                if (!supabase) {
                    console.warn('⚠️ Supabase not available, retrying...');
                    setTimeout(() => {
                        if (this.getSupabase()) {
                            this.loadUnits();
                        }
                    }, 2000);
                    return;
                }
                
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
            const regType = this.regType?.value;
            const isSupplementary = regType === 'Supplementary';
            
            // For supplementary, only show failed units
            let displayUnits = this.allUnits;
            if (isSupplementary) {
                const failedUnitCodes = this.failedUnits.map(u => u.unit_code || u.exam_name);
                displayUnits = this.allUnits.filter(u => failedUnitCodes.includes(u.unit_code));
            }
            
            if (displayUnits.length === 0) {
                let message = isSupplementary ? 
                    'No failed units available for supplementary registration.' :
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
                
                // Show supplementary badge for failed units
                const isFailed = this.failedUnits.some(u => u.unit_code === unit.unit_code || u.exam_name === unit.unit_code);
                const suppBadge = isFailed && !isRegistered ? 
                    '<span style="background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 12px; font-size: 9px; font-weight: 600; margin-left: 4px;">Supplementary</span>' : '';
                
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
                const isSupplementary = unit.reg_type === 'Supplementary' || unit.reg_type === 'Resit' || unit.reg_type === 'Retake';
                const regBadge = isSupplementary ? 
                    `<span style="background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 12px; font-size: 9px; font-weight: 600; margin-left: 4px;">${unit.reg_type}</span>` : '';
                
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
                const supabase = this.getSupabase();
                if (!supabase) throw new Error('Database connection not available');
                
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
        // SUPPLEMENTARY REGISTRATION - USING ACADEMIC REPORTS DATA
        // ============================================================
        
        async loadSupplementaryData() {
            console.log('📚 Loading supplementary data...');
            
            if (!this.userProfile || !this.studentId) {
                console.warn('⚠️ No user profile or student ID for supplementary');
                return;
            }
            
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
                        <p>Loading eligible units from academic records...</p>
                    </td>
                </tr>
            `;
            
            try {
                const supabase = this.getSupabase();
                if (!this.studentId || !supabase) {
                    this.renderEmptyState(tbody, 'Please log in to view eligible units.');
                    return;
                }
                
                // Get user profile for admission number
                const user = window.currentUserProfile || window.db?.currentUserProfile || this.userProfile;
                if (!user) {
                    this.renderEmptyState(tbody, 'User profile not found. Please refresh and try again.');
                    return;
                }
                
                const admissionNumber = user.student_id || user.admission_number || user.user_id;
                const userProgram = user.program || '';
                
                console.log('🔍 Looking up grades for:', admissionNumber);
                
                // ============================================
                // METHOD 1: Use student_marks table (same as Academic Reports)
                // ============================================
                let marks = [];
                let dataFound = false;
                
                try {
                    const { data, error } = await supabase
                        .from('student_marks')
                        .select('*')
                        .eq('admission_number', admissionNumber)
                        .eq('published', true)
                        .order('published_at', { ascending: false });
                    
                    if (!error && data && data.length > 0) {
                        marks = data;
                        dataFound = true;
                        console.log('📊 Found marks from student_marks:', marks.length);
                    }
                } catch (e) {
                    console.warn('Error fetching from student_marks:', e);
                }
                
                // ============================================
                // METHOD 2: Use exam_grades as fallback
                // ============================================
                if (!dataFound) {
                    try {
                        const { data, error } = await supabase
                            .from('exam_grades')
                            .select('*')
                            .eq('student_id', this.studentId);
                        
                        if (!error && data && data.length > 0) {
                            marks = data.map(grade => ({
                                subject_name: grade.subject_name || grade.exam_name,
                                final_score: grade.total_score || grade.marks || 0,
                                grade: grade.grade || this.calculateGrade(grade.total_score || grade.marks || 0, userProgram),
                                block: grade.block || 'N/A',
                                academic_year: grade.academic_year || '2024',
                                admission_number: admissionNumber
                            }));
                            dataFound = true;
                            console.log('📊 Found marks from exam_grades:', marks.length);
                        }
                    } catch (e) {
                        console.warn('Error fetching from exam_grades:', e);
                    }
                }
                
                // ============================================
                // METHOD 3: Use academic_reports as fallback
                // ============================================
                if (!dataFound) {
                    try {
                        const { data, error } = await supabase
                            .from('academic_reports')
                            .select('*')
                            .eq('student_id', this.studentId)
                            .eq('status', 'published');
                        
                        if (!error && data && data.length > 0) {
                            marks = data.map(report => ({
                                subject_name: report.unit_name || report.subject_name,
                                final_score: report.total_score || report.marks || 0,
                                grade: report.grade || this.calculateGrade(report.total_score || report.marks || 0, userProgram),
                                block: report.block || report.term || 'N/A',
                                academic_year: report.academic_year || '2024',
                                admission_number: admissionNumber
                            }));
                            dataFound = true;
                            console.log('📊 Found marks from academic_reports:', marks.length);
                        }
                    } catch (e) {
                        console.warn('Error fetching from academic_reports:', e);
                    }
                }
                
                // ============================================
                // PROCESS MARKS - Find failed units
                // ============================================
                const failedUnits = [];
                const processed = new Set();
                
                // Determine pass threshold based on program
                const isTVET = this.isTVETStudent || (window.PROGRAM && window.PROGRAM.isTVET(userProgram));
                const passThreshold = isTVET ? 50 : 60;
                
                console.log(`📊 Pass threshold: ${passThreshold}% (${isTVET ? 'TVET' : 'Nursing'})`);
                
                if (marks && marks.length > 0) {
                    for (const mark of marks) {
                        const score = mark.final_score || mark.total_score || mark.marks || 0;
                        const subjectName = mark.subject_name || mark.unit_name || mark.course_name || 'Unknown';
                        const unitCode = mark.unit_code || mark.subject_code || this.getUnitCode(subjectName) || subjectName.substring(0, 6).toUpperCase();
                        
                        // Check if failed (score < pass threshold)
                        if (score < passThreshold && score > 0 && unitCode && !processed.has(unitCode)) {
                            processed.add(unitCode);
                            
                            // Check if already registered for supplementary
                            const { data: existingReg } = await supabase
                                .from('student_unit_registrations')
                                .select('id, status')
                                .eq('student_id', this.studentId)
                                .eq('unit_code', unitCode)
                                .in('reg_type', ['Supplementary', 'Resit', 'Retake'])
                                .maybeSingle();
                            
                            // Determine registration type based on score
                            let regType = 'Supplementary';
                            if (score < 30) regType = 'Retake';
                            else if (score < 40) regType = 'Resit';
                            
                            failedUnits.push({
                                unit_code: unitCode,
                                unit_name: subjectName,
                                block: mark.block || mark.term || 'N/A',
                                score: score,
                                reg_type: regType,
                                status: existingReg ? existingReg.status : 'Eligible',
                                existing_id: existingReg?.id || null,
                                grade: mark.grade || this.calculateGrade(score, userProgram)
                            });
                        }
                    }
                }
                
                // ============================================
                // If no failed units found, check if all passed
                // ============================================
                if (failedUnits.length === 0 && marks.length > 0) {
                    const allPassed = marks.every(m => (m.final_score || 0) >= passThreshold);
                    if (allPassed) {
                        tbody.innerHTML = `
                            <tr>
                                <td colspan="7" style="text-align: center; padding: 40px; color: #10b981;">
                                    <i class="fas fa-check-circle" style="font-size: 40px; display: block; margin-bottom: 10px;"></i>
                                    <p style="font-weight: 600; font-size: 16px;">All units passed!</p>
                                    <p style="font-size: 13px; color: #6b7280;">You have no failed units requiring supplementary registration.</p>
                                    <p style="font-size: 11px; color: #94a3b8; margin-top: 8px;">You passed all ${marks.length} units with a ${passThreshold}% pass mark.</p>
                                </td>
                            </tr>
                        `;
                        
                        if (this.eligibleCount) this.eligibleCount.textContent = '0 units';
                        if (this.suppTabBadge) this.suppTabBadge.textContent = '0';
                        return;
                    }
                }
                
                // ============================================
                // Store and render results
                // ============================================
                this.failedUnits = failedUnits;
                this.hasSupplementaryEligibility = failedUnits.length > 0;
                this.renderEligibleUnitsTable(failedUnits);
                
                if (this.eligibleCount) {
                    this.eligibleCount.textContent = `${failedUnits.length} units`;
                }
                
                if (this.suppTabBadge) {
                    this.suppTabBadge.textContent = failedUnits.length;
                }
                
                console.log(`✅ Loaded ${failedUnits.length} eligible supplementary units`);
                
                // If no failed units found and no marks found, show appropriate message
                if (failedUnits.length === 0 && marks.length === 0) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="7" style="text-align: center; padding: 40px; color: #94a3b8;">
                                <i class="fas fa-info-circle" style="font-size: 40px; display: block; margin-bottom: 10px;"></i>
                                <p>No academic records found.</p>
                                <p style="font-size: 12px; color: #6b7280;">Your marks will appear here once they are published.</p>
                            </td>
                        </tr>
                    `;
                }
                
            } catch (error) {
                console.error('❌ Error loading eligible units:', error);
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; padding: 40px; color: #dc2626;">
                            <i class="fas fa-exclamation-circle" style="font-size: 40px; display: block; margin-bottom: 10px;"></i>
                            <p>Error loading academic records.</p>
                            <p style="font-size: 12px; color: #6b7280;">${error.message}</p>
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
                const supabase = this.getSupabase();
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
        
        // ============================================================
        // REGISTER SUPPLEMENTARY UNITS
        // ============================================================
        
        async registerSupplementaryUnits() {
            // Check if we have a registration type selected
            const regType = this.suppRegType?.value;
            if (!regType) {
                this.showError('Please select a registration type (Resit/Retake).', 'warning');
                return;
            }
            
            // Get selected units from checkboxes
            const selectedCheckboxes = document.querySelectorAll('.supp-unit-checkbox:checked:not([disabled])');
            const selectedUnits = Array.from(selectedCheckboxes).map(cb => {
                try {
                    return JSON.parse(cb.dataset.unit);
                } catch (e) {
                    return {
                        unit_code: cb.dataset.code || cb.value,
                        unit_name: cb.dataset.name || cb.dataset.unit || 'Unknown'
                    };
                }
            });
            
            // Also check dropdown selection
            const dropDownUnit = this.suppUnitSelect?.value;
            if (dropDownUnit && !selectedUnits.find(u => u.unit_code === dropDownUnit)) {
                const unitData = this.failedUnits.find(u => u.unit_code === dropDownUnit);
                if (unitData) {
                    selectedUnits.push(unitData);
                }
            }
            
            if (selectedUnits.length === 0) {
                this.showError('Please select at least one unit or choose from dropdown.', 'warning');
                return;
            }
            
            // Max 3 supplementary units
            if (selectedUnits.length > 3) {
                this.showError('You can only register for a maximum of 3 supplementary units.', 'warning');
                return;
            }
            
            // Payment reference (optional but recommended)
            const paymentRef = this.suppPaymentRef?.value.trim() || 'N/A';
            
            if (!confirm(`Register ${selectedUnits.length} unit(s) for ${regType}?`)) return;
            
            this.isSubmitting = true;
            if (this.registerSuppBtn) {
                this.registerSuppBtn.disabled = true;
                this.registerSuppBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
            }
            
            try {
                const supabase = this.getSupabase();
                if (!supabase) throw new Error('Database connection not available');
                
                const user = window.currentUserProfile || this.userProfile;
                
                // Create registration records
                const registrations = selectedUnits.map(unit => ({
                    student_id: this.studentId,
                    unit_code: unit.unit_code,
                    unit_name: unit.unit_name || unit.exam_name || unit.unit_code,
                    program: this.programCode || user?.program || 'KRCHN',
                    block: unit.block || user?.block || 'N/A',
                    intake_year: this.intakeYear || user?.intake_year || 2025,
                    reg_type: regType,
                    status: 'pending',
                    payment_reference: paymentRef,
                    submitted_date: new Date().toISOString(),
                    created_at: new Date().toISOString(),
                    credits: unit.credits || 3,
                    admission_number: user?.admission_number || user?.student_id || 'N/A'
                }));
                
                const { error } = await supabase
                    .from('student_unit_registrations')
                    .insert(registrations);
                
                if (error) throw error;
                
                this.showSuccess(`${registrations.length} supplementary unit(s) registered successfully!`);
                
                // Clear selections
                document.querySelectorAll('.supp-unit-checkbox:checked').forEach(cb => cb.checked = false);
                if (this.suppUnitSelect) this.suppUnitSelect.value = '';
                if (this.suppPaymentRef) this.suppPaymentRef.value = '';
                if (this.selectAllSupp) this.selectAllSupp.checked = false;
                
                // Reload data
                await this.loadSupplementaryData();
                await this.loadUnits();
                
            } catch (error) {
                console.error('❌ Error registering supplementary units:', error);
                this.showError(`Failed to register: ${error.message}`, 'error');
            } finally {
                this.isSubmitting = false;
                if (this.registerSuppBtn) {
                    this.registerSuppBtn.disabled = false;
                    this.registerSuppBtn.innerHTML = '<i class="fas fa-check"></i> Register Supplementary Units';
                }
            }
        }
        
        // ============================================================
        // DROP UNIT
        // ============================================================
        
        async dropUnit(unitCode) {
            if (!confirm(`Drop unit ${unitCode}?`)) return;
            
            try {
                const supabase = this.getSupabase();
                if (!supabase) throw new Error('Database connection not available');
                
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
                await this.loadSupplementaryData();
                
            } catch (error) {
                console.error('Error dropping unit:', error);
                this.showError(`Failed to drop: ${error.message}`, 'error');
            }
        }
        
        // ============================================================
        // SUPPLEMENTARY EXAM CARD DOWNLOAD
        // ============================================================
        
        async downloadSupplementaryExamCard(regId, unitCode) {
            try {
                console.log(`📄 Downloading exam card for ${unitCode} (ID: ${regId})`);
                
                // Show loading
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        title: 'Generating Exam Card...',
                        text: 'Please wait while we prepare your exam card.',
                        allowOutsideClick: false,
                        didOpen: () => {
                            Swal.showLoading();
                        }
                    });
                }
                
                const supabase = this.getSupabase();
                if (!supabase) throw new Error('Database connection not available');
                
                // Get the registration details
                const { data: reg, error } = await supabase
                    .from('student_unit_registrations')
                    .select('*')
                    .eq('id', regId)
                    .single();
                
                if (error) throw error;
                if (!reg) throw new Error('Registration not found');
                
                // Get student details
                const { data: student, error: studentError } = await supabase
                    .from('students')
                    .select('full_name, admission_number, program, email, phone')
                    .eq('id', this.studentId)
                    .single();
                
                if (studentError) throw studentError;
                
                if (typeof Swal !== 'undefined') Swal.close();
                
                // Show a printable version
                this.showExamCardHTML(reg, student);
                this.showSuccess('Exam card generated successfully!');
                
            } catch (error) {
                console.error('Error downloading exam card:', error);
                if (typeof Swal !== 'undefined') Swal.close();
                this.showError(`Failed to download exam card: ${error.message}`, 'error');
            }
        }
        
        showExamCardHTML(reg, student) {
            // Create a printable HTML version
            const win = window.open('', '_blank');
            if (!win) {
                this.showError('Please allow popups to view the exam card.', 'warning');
                return;
            }
            
            win.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Supplementary Exam Card - ${reg.unit_code}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 40px; }
                        .card { max-width: 600px; margin: 0 auto; border: 2px solid #4C1D95; padding: 30px; border-radius: 8px; }
                        .header { text-align: center; border-bottom: 2px solid #4C1D95; padding-bottom: 20px; margin-bottom: 20px; }
                        .header h1 { color: #4C1D95; margin: 0; }
                        .header p { margin: 5px 0; color: #666; }
                        .info { margin: 20px 0; }
                        .info-row { display: flex; padding: 8px 0; border-bottom: 1px solid #eee; }
                        .info-label { font-weight: bold; width: 120px; }
                        .info-value { flex: 1; }
                        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #4C1D95; font-size: 12px; color: #666; }
                        .status-approved { color: #059669; font-weight: bold; }
                        .status-pending { color: #f59e0b; font-weight: bold; }
                        .btn-print { display: block; margin: 20px auto; padding: 10px 30px; background: #4C1D95; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
                        .btn-print:hover { background: #3b1580; }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <div class="header">
                            <h1>NCHSM</h1>
                            <p>Nakuru College of Health Sciences and Management</p>
                            <p><strong>SUPPLEMENTARY EXAM CARD</strong></p>
                        </div>
                        <div class="info">
                            <div class="info-row">
                                <span class="info-label">Student Name:</span>
                                <span class="info-value">${student.full_name || 'N/A'}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Admission:</span>
                                <span class="info-value">${student.admission_number || 'N/A'}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Program:</span>
                                <span class="info-value">${student.program || 'N/A'}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Unit Code:</span>
                                <span class="info-value"><strong>${reg.unit_code}</strong></span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Unit Name:</span>
                                <span class="info-value">${reg.unit_name}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Registration Type:</span>
                                <span class="info-value">${reg.reg_type}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Status:</span>
                                <span class="info-value ${reg.status === 'approved' ? 'status-approved' : 'status-pending'}">${reg.status.toUpperCase()}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Registration Date:</span>
                                <span class="info-value">${new Date(reg.submitted_date).toLocaleDateString()}</span>
                            </div>
                        </div>
                        <div class="footer">
                            <p>This exam card is valid for the current supplementary examination period.</p>
                            <p>Please present this card at the examination venue.</p>
                            <p><em>Generated: ${new Date().toLocaleString()}</em></p>
                        </div>
                    </div>
                    <button class="btn-print" onclick="window.print()">🖨️ Print Exam Card</button>
                    <script>
                        setTimeout(() => window.print(), 1000);
                    <\/script>
                </body>
                </html>
            `);
            win.document.close();
        }
        
        // ============================================================
        // HELPER: Get Unit Code from Academic Reports
        // ============================================================
        
        getUnitCode(subjectName) {
            if (!subjectName) return 'N/A';
            
            // Try to get from cached unit codes (from academic-reports.js)
            if (window.getUnitCode) {
                return window.getUnitCode(subjectName);
            }
            
            // Fallback: generate from subject name
            const words = subjectName.split(' ');
            if (words.length === 1) {
                return subjectName.substring(0, 6).toUpperCase();
            }
            
            const skipWords = ['and', 'of', 'for', 'the', 'to', 'with', 'on', 'at'];
            let code = words
                .filter(w => !skipWords.includes(w.toLowerCase()))
                .map(w => w[0])
                .join('')
                .toUpperCase()
                .substring(0, 6);
            
            return code || 'N/A';
        }
        
        // ============================================================
        // HELPER: Calculate Grade
        // ============================================================
        
        calculateGrade(score, program) {
            if (score === null || score === undefined || score === 0) return 'D';
            
            const isTVET = this.isTVETStudent || (window.PROGRAM && window.PROGRAM.isTVET(program));
            
            if (isTVET) {
                if (score >= 75) return 'A';
                if (score >= 65) return 'B';
                if (score >= 50) return 'C';
                return 'FAIL';
            } else {
                if (score >= 75) return 'A';
                if (score >= 65) return 'B';
                if (score >= 60) return 'C';
                return 'D';
            }
        }
        
        // ============================================================
        // HELPER: Render Empty State
        // ============================================================
        
        renderEmptyState(tbody, message) {
            if (!tbody) return;
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: #94a3b8;">
                        <i class="fas fa-info-circle" style="font-size: 32px; display: block; margin-bottom: 10px;"></i>
                        <p>${message}</p>
                    </td>
                </tr>
            `;
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
            if (typeof Swal !== 'undefined') {
                if (type === 'warning') {
                    Swal.fire('Warning', message, 'warning');
                } else {
                    Swal.fire('Error', message, 'error');
                }
            } else {
                alert(message);
            }
        }
        
        showSuccess(message) {
            if (typeof Swal !== 'undefined') {
                Swal.fire('Success', message, 'success');
            } else {
                alert('Success: ' + message);
            }
        }
        
        showInfo(message) {
            if (typeof Swal !== 'undefined') {
                Swal.fire('Info', message, 'info');
            } else {
                alert('Info: ' + message);
            }
        }
        
        showWaitingForLogin() {
            const container = document.querySelector('#hub-register');
            if (container) {
                if (this.isInitialized) return;
                
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
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            window.studentDashboard = new StudentDashboard();
            window.unitRegistrationModule = window.studentDashboard;
            console.log('✅ unitRegistrationModule alias created');
        });
    } else {
        window.studentDashboard = new StudentDashboard();
        window.unitRegistrationModule = window.studentDashboard;
        console.log('✅ unitRegistrationModule alias created');
    }
    
    // ============================================================
    // GLOBAL FUNCTIONS FOR HTML ONCLICK
    // ============================================================
    
    window.dropUnit = (unitCode) => {
        if (window.studentDashboard) {
            window.studentDashboard.dropUnit(unitCode);
        } else {
            console.error('❌ studentDashboard not available');
        }
    };
    
    window.loadUnitRegistration = () => {
        if (window.studentDashboard) {
            window.studentDashboard.refresh();
        }
    };
    
    window.downloadSupplementaryExamCard = (regId, unitCode) => {
        if (window.studentDashboard) {
            window.studentDashboard.downloadSupplementaryExamCard(regId, unitCode);
        } else {
            console.error('❌ studentDashboard not available');
        }
    };
    
    window.registerSupplementaryUnits = () => {
        if (window.studentDashboard) {
            window.studentDashboard.registerSupplementaryUnits();
        } else {
            console.error('❌ studentDashboard not available');
        }
    };
    
    window.switchRegTab = (tab) => {
        console.log('🔄 Switching to tab:', tab);
        const subTabs = document.querySelectorAll('.reg-sub-tab');
        const regularContent = document.getElementById('regular-registration');
        const suppContent = document.getElementById('supplementary-registration');
        
        subTabs.forEach(t => {
            t.classList.remove('active');
            t.style.color = '#6b7280';
            t.style.borderBottom = '3px solid transparent';
        });
        
        const activeTab = document.querySelector(`.reg-sub-tab[data-subtab="${tab}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
            activeTab.style.color = '#4C1D95';
            activeTab.style.borderBottom = '3px solid #4C1D95';
        }
        
        if (regularContent) {
            regularContent.style.display = tab === 'regular' ? 'block' : 'none';
        }
        if (suppContent) {
            suppContent.style.display = tab === 'supplementary' ? 'block' : 'none';
        }
        
        if (tab === 'supplementary' && window.studentDashboard) {
            window.studentDashboard.loadSupplementaryData();
        } else if (tab === 'regular' && window.studentDashboard) {
            window.studentDashboard.loadUnits();
        }
    };
    
    console.log('✅ Student Dashboard ready with Supplementary support!');
    console.log('📌 Use window.studentDashboard or window.unitRegistrationModule to access the API');
})();
