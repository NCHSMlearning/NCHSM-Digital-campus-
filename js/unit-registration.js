// ============================================================
// STUDENT DASHBOARD - UNIT REGISTRATION WITH SUPPLEMENTARY SUPPORT
// FULLY FIXED VERSION - v2.2
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
            
            // Update legend after profile loads
            document.addEventListener('userLoggedIn', () => {
                setTimeout(() => this.updateRegistrationLegend(), 500);
            });
            document.addEventListener('userProfileUpdated', () => {
                setTimeout(() => this.updateRegistrationLegend(), 500);
            });
        }
        
        // ============================================================
        // 📖 UPDATE REGISTRATION LEGEND - DYNAMIC PASS MARKS
        // ============================================================
        
        updateRegistrationLegend() {
            console.log('📖 Updating registration legend...');
            
            const legendContainer = document.getElementById('legend-content');
            const programBadge = document.getElementById('program-badge-legend');
            const passMarkDisplay = document.getElementById('pass-mark-legend');
            
            if (!legendContainer) return;
            
            // Get user profile
            const userProfile = window.currentUserProfile || window.db?.currentUserProfile || this.userProfile;
            const program = userProfile?.program || 'KRCHN';
            
            // Determine if TVET or KRCHN
            const tvetPrograms = ['DPOTT', 'DCH', 'DHRIT', 'DSL', 'DSW', 'DCJS', 'DHSS', 'DICT', 'DME',
                                  'CPOTT', 'CCH', 'CHRIT', 'CPC', 'CSL', 'CSW', 'CCJS', 'CAG', 'CHSS', 'CICT',
                                  'ACH', 'AAG', 'ASW', 'CCA', 'PTE', 'TVET'];
            const isTVET = tvetPrograms.includes(program);
            
            const passMark = isTVET ? 50 : 60;
            const retakeThreshold = 30;
            const programDisplay = isTVET ? 'TVET' : 'KRCHN Nursing';
            const programColor = isTVET ? '#f59e0b' : '#4C1D95';
            const programEmoji = isTVET ? '🔧' : '🎓';
            
            // Update badge
            if (programBadge) {
                programBadge.textContent = `${programEmoji} ${programDisplay}`;
                programBadge.style.background = programColor;
            }
            
            // Update pass mark display
            if (passMarkDisplay) {
                passMarkDisplay.textContent = `🎯 Pass Mark: ${passMark}% (${programDisplay})`;
                passMarkDisplay.style.color = isTVET ? '#92400e' : '#1e40af';
            }
            
            // Build legend HTML
            legendContainer.innerHTML = `
                <!-- Normal Registration -->
                <div style="background: #f0fdf4; border-radius: 8px; padding: 12px 16px; border-left: 4px solid #059669;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="background: #059669; color: white; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: 700;">REGULAR</span>
                        <span style="font-weight: 600; color: #065f46; font-size: 13px;">Normal Registration</span>
                    </div>
                    <p style="margin: 4px 0 0 0; font-size: 12px; color: #475569;">
                        <i class="fas fa-check-circle" style="color: #059669; font-size: 11px;"></i> 
                        First-time enrollment in a unit. Standard registration for current trimester.
                    </p>
                </div>
                
                <!-- Supplementary -->
                <div style="background: #fffbeb; border-radius: 8px; padding: 12px 16px; border-left: 4px solid #f59e0b;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="background: #f59e0b; color: #78350f; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: 700;">SUPP</span>
                        <span style="font-weight: 600; color: #92400e; font-size: 13px;">Supplementary</span>
                    </div>
                    <p style="margin: 4px 0 0 0; font-size: 12px; color: #475569;">
                        <i class="fas fa-redo-alt" style="color: #f59e0b; font-size: 11px;"></i> 
                        <strong>Below ${passMark}% (Failed)</strong> — You are eligible for a supplementary exam. 
                        One additional attempt to pass the unit.
                    </p>
                </div>
                
                <!-- Retake -->
                <div style="background: #fef2f2; border-radius: 8px; padding: 12px 16px; border-left: 4px solid #dc2626;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="background: #dc2626; color: white; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: 700;">RETAKE</span>
                        <span style="font-weight: 600; color: #991b1b; font-size: 13px;">Retake</span>
                    </div>
                    <p style="margin: 4px 0 0 0; font-size: 12px; color: #475569;">
                        <i class="fas fa-sync-alt" style="color: #dc2626; font-size: 11px;"></i> 
                        <strong>Below ${retakeThreshold}%</strong> — You must retake the entire unit. 
                        Full re-enrollment and attendance required.
                    </p>
                </div>
            `;
            
            console.log(`✅ Legend updated for ${programDisplay} (Pass Mark: ${passMark}%, Retake below ${retakeThreshold}%)`);
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
                this.updateRegistrationLegend();
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
            this.registrationBadge = document.getElementById('registration-status-badge');
            this.registrationStatusText = document.getElementById('regStatusText');
            
            // Supplementary tab elements
            this.eligibleBody = document.getElementById('eligibleUnitsBody');
            this.suppRegisteredBody = document.getElementById('suppRegisteredBody');
            this.suppUnitSelect = document.getElementById('suppUnitSelect');
            this.suppRegType = document.getElementById('suppRegType');
            this.registerSuppBtn = document.getElementById('registerSupplementaryBtn');
            this.selectAllSupp = document.getElementById('selectAllSupp');
            this.eligibleCount = document.getElementById('eligibleUnitsCount');
            this.suppRegisteredCount = document.getElementById('suppRegisteredCount');
            this.suppTabBadge = document.getElementById('suppBadge');
            this.selectedSuppCount = document.getElementById('selectedSuppCount');
            
            // Summary elements
            this.pendingCountDisplay = document.getElementById('pendingCountDisplay');
            this.approvedCountDisplay = document.getElementById('approvedCountDisplay');
            this.completedCountDisplay = document.getElementById('completedCountDisplay');
            this.suppCountDisplay = document.getElementById('suppCountDisplay');
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
                    this.updateRegistrationLegend();
                    this.isInitialized = true;
                }
            });
            
            document.addEventListener('userProfileUpdated', (e) => {
                if (e.detail?.userProfile) {
                    console.log('👤 User profile updated');
                    this.userProfile = e.detail.userProfile;
                    this.studentId = this.userProfile.user_id || this.userProfile.id;
                    this.updateUserData();
                    this.updateRegistrationLegend();
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
                    this.updateRegistrationLegend();
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
                this.registerSuppBtn.addEventListener('click', (e) => {
                    e.preventDefault();
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
                    this.updateSuppSelectedCount();
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
            
            // Update selected count when checkboxes change
            document.addEventListener('change', (e) => {
                if (e.target.classList && e.target.classList.contains('supp-unit-checkbox')) {
                    this.updateSuppSelectedCount();
                }
            });
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
                
                // ============================================
                // 🔥 FIX: For Supplementary/Retake, include failed completed units
                // ============================================
                if (regType === 'Supplementary' || regType === 'Retake') {
                    // Get failed units from academic records
                    const failedUnitCodes = this.failedUnits.map(u => u.unit_code || u.exam_name);
                    
                    // Get completed failed units from registrations
                    const completedFailed = this.registeredUnits
                        .filter(u => u.status === 'completed' && 
                            (u.grade === 'FAIL' || u.grade === 'D' || u.grade === 'E' || u.grade === 'F' || 
                             u.grade === 'D+' || u.grade === 'D-' || u.completion_status === 'failed'))
                        .map(u => u.unit_code);
                    
                    // Also get any rejected registrations
                    const rejectedUnits = this.registeredUnits
                        .filter(u => u.status === 'rejected')
                        .map(u => u.unit_code);
                    
                    // Combine all failed unit codes
                    const allFailedCodes = [...new Set([...failedUnitCodes, ...completedFailed, ...rejectedUnits])];
                    
                    // Filter units to only show failed ones that are NOT already pending/approved
                    const pendingOrApproved = this.registeredUnits
                        .filter(u => u.status === 'pending' || u.status === 'approved')
                        .map(u => u.unit_code);
                    
                    this.allUnits = this.allUnits.filter(u => {
                        // Must be in failed list
                        if (!allFailedCodes.includes(u.unit_code)) return false;
                        // Must NOT be pending or approved
                        if (pendingOrApproved.includes(u.unit_code)) return false;
                        return true;
                    });
                } else {
                    // Normal registration: exclude already registered (pending, approved, completed)
                    const registeredCodes = new Set(this.registeredUnits.map(u => u.unit_code));
                    this.allUnits = this.allUnits.filter(u => !registeredCodes.has(u.unit_code));
                }
                
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
            const isSupplementary = regType === 'Supplementary' || regType === 'Retake';
            
            // For supplementary/retake, only show failed units
            let displayUnits = this.allUnits;
            if (isSupplementary) {
                const failedUnitCodes = this.failedUnits.map(u => u.unit_code || u.exam_name);
                displayUnits = this.allUnits.filter(u => failedUnitCodes.includes(u.unit_code));
            }
            
            // Also filter out units that are already pending or approved
            const pendingOrApproved = this.registeredUnits
                .filter(u => u.status === 'pending' || u.status === 'approved')
                .map(u => u.unit_code);
            
            displayUnits = displayUnits.filter(u => !pendingOrApproved.includes(u.unit_code));
            
            // Update count
            const countEl = document.getElementById('availableUnitsCount');
            if (countEl) countEl.textContent = displayUnits.length + ' units';
            
            if (displayUnits.length === 0) {
                let message = isSupplementary ? 
                    'No failed units available for supplementary registration.' :
                    'No units available for your program.';
                if (this.isTVETStudent) {
                    message = 'No TVET units found for your program. Please contact administrator.';
                }
                this.availableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 40px; color: #94a3b8;">${message}</td></tr>`;
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
                
                // Determine which registration type to show
                const failedUnit = this.failedUnits.find(u => u.unit_code === unit.unit_code);
                const regTypeDisplay = failedUnit?.reg_type || regType;
                
                html += `<tr>
                    <td style="text-align:center; padding: 10px 12px;">${!isRegistered ? `<input type="checkbox" class="unit-checkbox" data-code="${this.escapeHtml(unit.unit_code)}">` : '—'}</td>
                    <td style="padding: 10px 12px;"><strong>${this.escapeHtml(unit.unit_code)}</strong> ${suppBadge}</td>
                    <td style="padding: 10px 12px;">${this.escapeHtml(unit.unit_name)}</td>
                    <td style="padding: 10px 12px;">${this.escapeHtml(unit.block)}</td>
                    <td style="padding: 10px 12px; text-align: center;"><span class="type-badge">${this.escapeHtml(unit.unit_type || 'Core')}</span></td>
                    <td style="padding: 10px 12px; text-align: center;">${unit.credits || 3}</td>
                    <td style="padding: 10px 12px; text-align: center;"><span class="status-badge ${statusClass}">${statusText}</span></td>
                </tr>`;
            }
            
            this.availableBody.innerHTML = html;
            this.updateSelectedCount();
            this.attachCheckboxEvents();
        }
        
        displayRegisteredUnits() {
            if (!this.registeredBody) return;
            
            // Update summary counts
            const pendingCount = this.registeredUnits.filter(u => u.status === 'pending').length;
            const approvedCount = this.registeredUnits.filter(u => u.status === 'approved' && u.completion_status !== 'completed' && !u.grade).length;
            const completedCount = this.registeredUnits.filter(u => u.completion_status === 'completed' || u.status === 'completed' || (u.grade && u.grade !== '')).length;
            const suppCount = this.registeredUnits.filter(u => u.reg_type === 'Supplementary' || u.reg_type === 'Resit' || u.reg_type === 'Retake').length;
            
            if (this.pendingCountDisplay) this.pendingCountDisplay.textContent = pendingCount;
            if (this.approvedCountDisplay) this.approvedCountDisplay.textContent = approvedCount;
            if (this.completedCountDisplay) this.completedCountDisplay.textContent = completedCount;
            if (this.suppCountDisplay) this.suppCountDisplay.textContent = suppCount;
            
            // Update registered units count
            const countEl = document.getElementById('registeredUnitsCount');
            if (countEl) countEl.textContent = this.registeredUnits.length + ' units';
            
            if (this.registeredUnits.length === 0) {
                this.registeredBody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; padding: 60px 20px; color: #94a3b8;">
                            <div style="font-size: 48px; margin-bottom: 12px; opacity: 0.3;">
                                <i class="fas fa-clipboard-list"></i>
                            </div>
                            <p style="font-weight: 500; color: #1e293b; margin: 0;">No units registered yet</p>
                            <p style="font-size: 13px; margin: 4px 0 0 0;">Select units above and submit for approval</p>
                        </td>
                    </tr>
                `;
                return;
            }
            
            let html = '';
            for (const unit of this.registeredUnits) {
                // Determine status
                let statusText = '';
                let statusClass = '';
                let statusColor = '';
                let statusBadge = '';
                let rowStyle = '';
                
                const hasGrade = unit.grade && unit.grade !== '' && unit.grade !== null;
                const isPassing = hasGrade && !['FAIL', 'F', 'D', 'D+', 'D-', 'E'].includes(unit.grade);
                const isCompleted = unit.completion_status === 'completed' || unit.status === 'completed' || hasGrade;
                
                if (isCompleted) {
                    statusText = 'Completed';
                    statusClass = 'status-completed';
                    statusColor = '#10b981';
                    rowStyle = 'border-left: 3px solid #10b981;';
                    
                    if (isPassing) {
                        statusBadge = `<span style="background: #d1fae5; color: #065f46; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: 600; margin-left: 6px;">🟢 Passed</span>`;
                    } else {
                        statusBadge = `<span style="background: #fee2e2; color: #991b1b; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: 600; margin-left: 6px;">🔴 Failed</span>`;
                    }
                } else if (unit.status === 'approved') {
                    statusText = 'Approved';
                    statusClass = 'status-approved';
                    statusColor = '#3b82f6';
                    rowStyle = 'border-left: 3px solid #3b82f6;';
                } else if (unit.status === 'pending') {
                    statusText = 'Pending';
                    statusClass = 'status-pending';
                    statusColor = '#f59e0b';
                    rowStyle = 'border-left: 3px solid #f59e0b;';
                } else if (unit.status === 'rejected') {
                    statusText = 'Rejected';
                    statusClass = 'status-rejected';
                    statusColor = '#dc2626';
                    rowStyle = 'border-left: 3px solid #dc2626;';
                } else {
                    statusText = unit.status || 'Unknown';
                    statusClass = 'status-unknown';
                    statusColor = '#6b7280';
                }
                
                // Check if supplementary
                const isSupplementary = unit.reg_type === 'Supplementary' || unit.reg_type === 'Resit' || unit.reg_type === 'Retake';
                const regTypeColor = isSupplementary ? '#B45309' : '#4C1D95';
                const regTypeBg = isSupplementary ? '#fef3c7' : '#e0e7ff';
                
                // Registration type badge
                const regBadge = `<span style="background: ${regTypeBg}; color: ${regTypeColor}; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: 600; white-space: nowrap;">
                                    ${this.escapeHtml(unit.reg_type || 'Normal')}
                                </span>`;
                
                // Completion date
                const dateDisplay = unit.completed_at ? 
                    `<span style="font-size: 12px; color: #059669;"><i class="fas fa-check-circle"></i> ${new Date(unit.completed_at).toLocaleDateString()}</span>` : 
                    (unit.approval_date || (unit.submitted_date ? new Date(unit.submitted_date).toLocaleDateString() : '—'));
                
                // Action buttons
                let actionButtons = '—';
                if (unit.status === 'pending') {
                    actionButtons = `<button class="btn-drop" onclick="window.dropUnit('${unit.unit_code}')" 
                                            style="background: #fee2e2; color: #991b1b; border: none; padding: 4px 12px; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: 600; transition: all 0.2s;">
                                        <i class="fas fa-trash"></i> Drop
                                    </button>`;
                } else if (isCompleted && isSupplementary && unit.status === 'completed') {
                    actionButtons = `<button onclick="window.downloadSupplementaryExamCard('${unit.id}', '${this.escapeHtml(unit.unit_code)}')" 
                                            style="background: #10b981; color: white; border: none; padding: 4px 12px; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: 600;">
                                        <i class="fas fa-download"></i> Card
                                    </button>`;
                }
                
                // Get unit code display with supplementary badge
                let unitCodeDisplay = `<strong style="color: #0A3D62; font-size: 14px;">${this.escapeHtml(unit.unit_code)}</strong>`;
                if (isSupplementary) {
                    unitCodeDisplay += ` <span style="background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 12px; font-size: 9px; font-weight: 600;">${this.escapeHtml(unit.reg_type)}</span>`;
                }
                
                html += `
                    <tr style="border-bottom: 1px solid #f1f5f9; transition: all 0.2s; ${rowStyle}" 
                        onmouseover="this.style.background='#f8fafc'" 
                        onmouseout="this.style.background='transparent'">
                        <td style="padding: 12px 16px;">${unitCodeDisplay}</td>
                        <td style="padding: 12px 16px;">${this.escapeHtml(unit.unit_name)}</td>
                        <td style="padding: 12px 16px; font-size: 13px; color: #475569;">${this.escapeHtml(unit.block)}</td>
                        <td style="padding: 12px 16px; text-align: center;">${regBadge}</td>
                        <td style="padding: 12px 16px; text-align: center;">
                            <span style="background: ${statusColor}15; color: ${statusColor}; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; border: 1px solid ${statusColor}30; display: inline-block;">
                                ${statusText}
                            </span>
                            ${statusBadge}
                        </td>
                        <td style="padding: 12px 16px; text-align: center; font-size: 12px; color: #64748b;">${dateDisplay}</td>
                        <td style="padding: 12px 16px; text-align: center;">${actionButtons}</td>
                    </tr>
                `;
            }
            
            this.registeredBody.innerHTML = html;
        }
        
        updateRegistrationStatus() {
            const pendingCount = this.registeredUnits.filter(u => u.status === 'pending').length;
            
            if (this.registrationBadge && this.registrationStatusText) {
                if (pendingCount > 0) {
                    this.registrationBadge.style.background = '#fef3c7';
                    this.registrationBadge.style.color = '#92400e';
                    this.registrationStatusText.textContent = `${pendingCount} Pending Approval`;
                } else {
                    this.registrationBadge.style.background = '#d1fae5';
                    this.registrationBadge.style.color = '#065f46';
                    this.registrationStatusText.textContent = 'Open';
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
        
        updateSuppSelectedCount() {
            const checkboxes = document.querySelectorAll('.supp-unit-checkbox:checked');
            const count = checkboxes.length;
            if (this.selectedSuppCount) this.selectedSuppCount.textContent = count;
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
            const isSupplementary = regType === 'Supplementary' || regType === 'Retake';
            const infoText = document.getElementById('registrationInfoText');
            const warningBox = document.getElementById('registrationWarning');
            
            if (isSupplementary) {
                if (infoText) {
                    infoText.innerHTML = `
                        <i class="fas fa-info-circle" style="color: #f59e0b;"></i>
                        ${regType} Registration: You can re-register for units you previously failed.
                        <strong>Max 8 units allowed.</strong>
                    `;
                    infoText.style.display = 'block';
                }
                if (warningBox) {
                    warningBox.innerHTML = `
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>${regType} registration is for students who need to retake failed units.</span>
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
                if (existing && (existing.status === 'pending' || existing.status === 'approved')) {
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
                
                const academicYear = new Date().getFullYear().toString();
                const term = this.getCurrentTerm();
                
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
                    updated_at: new Date().toISOString(),
                    credits: unit.credits || 3,
                    academic_year: academicYear,
                    term: term
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
                    '<i class="fas fa-paper-plane"></i> Submit';
            }
        }
        
        // ============================================================
        // GET CURRENT TERM
        // ============================================================
        
        getCurrentTerm() {
            const now = new Date();
            const month = now.getMonth();
            
            if (month >= 0 && month <= 3) return 'Trimester 1';
            if (month >= 4 && month <= 7) return 'Trimester 2';
            return 'Trimester 3';
        }
        
        // ============================================================
        // SUPPLEMENTARY REGISTRATION
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
                    <td colspan="6" style="text-align: center; padding: 40px; color: #94a3b8;">
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
                
                const user = window.currentUserProfile || window.db?.currentUserProfile || this.userProfile;
                if (!user) {
                    this.renderEmptyState(tbody, 'User profile not found. Please refresh and try again.');
                    return;
                }
                
                const admissionNumber = user.student_id || user.admission_number || user.user_id;
                const userProgram = user.program || '';
                
                let failedUnits = [];
                const processed = new Set();
                
                const isTVET = this.isTVETStudent || (window.PROGRAM && window.PROGRAM.isTVET(userProgram));
                const passThreshold = isTVET ? 50 : 60;
                const retakeThreshold = 30;
                
                // ============================================
                // SOURCE 1: student_marks
                // ============================================
                try {
                    const { data: marks, error } = await supabase
                        .from('student_marks')
                        .select('*')
                        .eq('admission_number', admissionNumber)
                        .eq('published', true);
                    
                    if (!error && marks && marks.length > 0) {
                        for (const mark of marks) {
                            const score = mark.final_score || 0;
                            const subjectName = mark.subject_name || 'Unknown';
                            
                            if (score < passThreshold && score > 0 && !processed.has(subjectName)) {
                                processed.add(subjectName);
                                
                                let regType = 'Supplementary';
                                if (score < retakeThreshold) {
                                    regType = 'Retake';
                                }
                                
                                failedUnits.push({
                                    unit_code: this.getUnitCode(subjectName),
                                    unit_name: subjectName,
                                    block: mark.block || 'N/A',
                                    score: score,
                                    reg_type: regType,
                                    grade: mark.grade || 'FAIL',
                                    status: 'Eligible'
                                });
                            }
                        }
                    }
                } catch (e) {
                    console.warn('Error fetching from student_marks:', e);
                }
                
                // ============================================
                // SOURCE 2: Completed failed registrations
                // ============================================
                try {
                    const { data: completedFailed, error } = await supabase
                        .from('student_unit_registrations')
                        .select('*')
                        .eq('student_id', this.studentId)
                        .eq('status', 'completed')
                        .in('grade', ['FAIL', 'D', 'E', 'F'])
                        .or('completion_status.eq.failed');
                    
                    if (!error && completedFailed && completedFailed.length > 0) {
                        for (const reg of completedFailed) {
                            if (!processed.has(reg.unit_code) && !processed.has(reg.unit_name)) {
                                processed.add(reg.unit_code);
                                
                                failedUnits.push({
                                    unit_code: reg.unit_code,
                                    unit_name: reg.unit_name,
                                    block: reg.block || 'N/A',
                                    score: 0,
                                    reg_type: 'Retake',
                                    grade: reg.grade || 'FAIL',
                                    status: 'Eligible',
                                    existing_id: reg.id
                                });
                            }
                        }
                    }
                } catch (e) {
                    console.warn('Error fetching completed failed registrations:', e);
                }
                
                // ============================================
                // SOURCE 3: Rejected registrations
                // ============================================
                try {
                    const { data: rejected, error } = await supabase
                        .from('student_unit_registrations')
                        .select('*')
                        .eq('student_id', this.studentId)
                        .eq('status', 'rejected');
                    
                    if (!error && rejected && rejected.length > 0) {
                        for (const reg of rejected) {
                            if (!processed.has(reg.unit_code)) {
                                processed.add(reg.unit_code);
                                
                                failedUnits.push({
                                    unit_code: reg.unit_code,
                                    unit_name: reg.unit_name,
                                    block: reg.block || 'N/A',
                                    score: 0,
                                    reg_type: reg.reg_type || 'Retake',
                                    grade: 'FAIL',
                                    status: 'Rejected',
                                    existing_id: reg.id
                                });
                            }
                        }
                    }
                } catch (e) {
                    console.warn('Error fetching rejected registrations:', e);
                }
                
                // Store failed units
                this.failedUnits = failedUnits;
                this.hasSupplementaryEligibility = failedUnits.length > 0;
                
                // Render the table
                this.renderEligibleUnitsTable(failedUnits);
                
                // Update counts
                if (this.eligibleCount) {
                    this.eligibleCount.textContent = `${failedUnits.length} units`;
                }
                if (this.suppTabBadge) {
                    this.suppTabBadge.textContent = failedUnits.length;
                }
                
                // Populate dropdown
                if (this.suppUnitSelect) {
                    const availableUnits = failedUnits.filter(u => u.status === 'Eligible' || u.status === 'Rejected');
                    this.suppUnitSelect.innerHTML = '<option value="">-- Select Units (Ctrl+Click) --</option>';
                    availableUnits.forEach(unit => {
                        const opt = document.createElement('option');
                        opt.value = unit.unit_code;
                        opt.textContent = `${unit.unit_code} - ${unit.unit_name} (${unit.reg_type})`;
                        this.suppUnitSelect.appendChild(opt);
                    });
                }
                
                console.log(`✅ Loaded ${failedUnits.length} eligible supplementary units`);
                
            } catch (error) {
                console.error('❌ Error loading eligible units:', error);
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; padding: 40px; color: #dc2626;">
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
                        <td colspan="6" style="text-align: center; padding: 40px; color: #94a3b8;">
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
                const isRegistered = unit.status !== 'Eligible' && unit.status !== 'Rejected';
                const isRejected = unit.status === 'Rejected';
                const canRegister = unit.status === 'Eligible' || unit.status === 'Rejected';
                
                let statusText = unit.status;
                let statusColor = '#10b981';
                let statusBg = '#d1fae5';
                
                if (unit.status === 'Eligible') {
                    statusText = '✅ Eligible';
                    statusColor = '#059669';
                    statusBg = '#d1fae5';
                } else if (unit.status === 'Rejected') {
                    statusText = '❌ Rejected';
                    statusColor = '#dc2626';
                    statusBg = '#fee2e2';
                } else if (unit.status === 'approved') {
                    statusText = '✅ Approved';
                    statusColor = '#059669';
                    statusBg = '#d1fae5';
                } else if (unit.status === 'pending') {
                    statusText = '⏳ Pending';
                    statusColor = '#f59e0b';
                    statusBg = '#fef3c7';
                }
                
                const regTypeDisplay = unit.reg_type === 'Retake' ? 
                    '<span style="background: #dc2626; color: white; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 600;">Retake</span>' :
                    '<span style="background: #f59e0b; color: white; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 600;">Supplementary</span>';
                
                html += `
                    <tr>
                        <td style="padding: 12px 16px; text-align: center;">
                            <input type="checkbox" class="supp-unit-checkbox" data-unit='${JSON.stringify(unit)}' 
                                   ${!canRegister ? 'disabled' : ''} style="width: 16px; height: 16px; cursor: pointer;">
                        </td>
                        <td style="padding: 12px 16px; text-align: left; font-weight: 600; color: #0A3D62;">${this.escapeHtml(unit.unit_code)}</td>
                        <td style="padding: 12px 16px; text-align: left;">${this.escapeHtml(unit.unit_name)}</td>
                        <td style="padding: 12px 16px; text-align: left;">${this.escapeHtml(unit.block)}</td>
                        <td style="padding: 12px 16px; text-align: center;">${regTypeDisplay}</td>
                        <td style="padding: 12px 16px; text-align: center;">
                            <span style="background: ${statusBg}; color: ${statusColor}; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;">
                                ${statusText}
                            </span>
                        </td>
                    </tr>
                `;
            }
            
            tbody.innerHTML = html;
            
            // Update selected count when checkboxes change
            document.querySelectorAll('.supp-unit-checkbox').forEach(cb => {
                cb.addEventListener('change', () => this.updateSuppSelectedCount());
            });
            
            this.updateSuppSelectedCount();
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
                    .in('reg_type', ['Supplementary', 'Retake'])
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
                                       reg.status === 'pending' ? '#f59e0b' : 
                                       reg.status === 'completed' ? '#10b981' : '#dc2626';
                    const statusBg = reg.status === 'approved' ? '#d1fae5' : 
                                    reg.status === 'pending' ? '#fef3c7' : 
                                    reg.status === 'completed' ? '#d1fae5' : '#fee2e2';
                    const statusText = reg.status === 'approved' ? '✅ Approved' : 
                                      reg.status === 'pending' ? '⏳ Pending' : 
                                      reg.status === 'completed' ? '📋 Completed' : '❌ Rejected';
                    const regDate = reg.submitted_date ? new Date(reg.submitted_date).toLocaleDateString() : 'N/A';
                    
                    const canDownloadCard = reg.status === 'approved' || reg.status === 'completed';
                    
                    // Check if passed or failed
                    const hasGrade = reg.grade && reg.grade !== '' && reg.grade !== null;
                    const isPassing = hasGrade && !['FAIL', 'F', 'D', 'D+', 'D-', 'E'].includes(reg.grade);
                    const gradeBadge = hasGrade ? 
                        (isPassing ? '🟢 ' + reg.grade : '🔴 ' + reg.grade) : '';
                    
                    html += `
                        <tr>
                            <td style="padding: 12px 16px; text-align: left; font-weight: 600; color: #0A3D62;">${this.escapeHtml(reg.unit_code)}</td>
                            <td style="padding: 12px 16px; text-align: left;">${this.escapeHtml(reg.unit_name)}</td>
                            <td style="padding: 12px 16px; text-align: left;">${this.escapeHtml(reg.block || 'N/A')}</td>
                            <td style="padding: 12px 16px; text-align: center;">
                                <span style="background: ${reg.reg_type === 'Retake' ? '#dc2626' : '#f59e0b'}; color: white; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;">
                                    ${this.escapeHtml(reg.reg_type)}
                                </span>
                            </td>
                            <td style="padding: 12px 16px; text-align: center;">
                                <span style="background: ${statusBg}; color: ${statusColor}; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;">
                                    ${statusText}
                                    ${gradeBadge ? ' ' + gradeBadge : ''}
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
                                ` : reg.status === 'rejected' ? `
                                    <span style="color: #dc2626; font-size: 11px;">Not Available</span>
                                ` : `
                                    <span style="color: #94a3b8; font-size: 11px;">—</span>
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
        // REGISTER SUPPLEMENTARY UNITS - FIXED VERSION
        // ============================================================
        
        async registerSupplementaryUnits() {
            // Check if we have a registration type selected
            const regType = this.suppRegType?.value;
            if (!regType) {
                this.showError('Please select a registration type (Supplementary or Retake).', 'warning');
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
            
            // Max 8 supplementary units
            if (selectedUnits.length > 8) {
                this.showError('You can only register for a maximum of 8 supplementary units.', 'warning');
                return;
            }
            
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
                const academicYear = new Date().getFullYear().toString();
                const term = this.getCurrentTerm();
                
                let successCount = 0;
                let skippedCount = 0;
                let errorCount = 0;
                
                for (const unit of selectedUnits) {
                    // ============================================
                    // CHECK FOR EXISTING REGISTRATION
                    // ============================================
                    const { data: existing, error: checkError } = await supabase
                        .from('student_unit_registrations')
                        .select('id, status, reg_type, completion_status')
                        .eq('student_id', this.studentId)
                        .eq('unit_code', unit.unit_code)
                        .eq('block', unit.block || user?.block || 'N/A')
                        .maybeSingle();
                    
                    if (checkError) {
                        console.warn('Error checking existing registration:', checkError);
                    }
                    
                    // ============================================
                    // BUILD REGISTRATION OBJECT
                    // ============================================
                    const registration = {
                        student_id: this.studentId,
                        unit_code: unit.unit_code,
                        unit_name: unit.unit_name || unit.exam_name || unit.unit_code,
                        program: this.programCode || user?.program || 'KRCHN',
                        block: unit.block || user?.block || 'N/A',
                        reg_type: regType,
                        status: 'pending',
                        submitted_date: new Date().toISOString(),
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        credits: unit.credits || 3,
                        intake_year: this.intakeYear || user?.intake_year || '2025',
                        academic_year: academicYear,
                        term: term
                    };
                    
                    // ============================================
                    // HANDLE EXISTING REGISTRATION
                    // ============================================
                    if (existing) {
                        console.log(`Unit ${unit.unit_code} already exists with status: ${existing.status}`);
                        
                        if (existing.status === 'rejected') {
                            // Update rejected to pending
                            const { error: updateError } = await supabase
                                .from('student_unit_registrations')
                                .update({
                                    reg_type: regType,
                                    status: 'pending',
                                    rejection_reason: null,
                                    submitted_date: new Date().toISOString(),
                                    updated_at: new Date().toISOString()
                                })
                                .eq('id', existing.id);
                            
                            if (updateError) {
                                console.error(`Error updating ${unit.unit_code}:`, updateError);
                                errorCount++;
                            } else {
                                successCount++;
                                console.log(`✅ Updated ${unit.unit_code} from rejected to pending`);
                            }
                        } else if (existing.status === 'completed' && existing.completion_status === 'completed') {
                            // Already completed - skip
                            this.showInfo(`${unit.unit_code} is already completed. Cannot re-register.`);
                            skippedCount++;
                        } else if (existing.status === 'pending' || existing.status === 'approved') {
                            // Already pending or approved - skip
                            this.showInfo(`${unit.unit_code} is already ${existing.status}. No action needed.`);
                            skippedCount++;
                        } else {
                            // Try upsert as fallback
                            const { error: upsertError } = await supabase
                                .from('student_unit_registrations')
                                .upsert(registration, {
                                    onConflict: 'student_id, unit_code, block'
                                });
                            
                            if (upsertError) {
                                console.error(`Error upserting ${unit.unit_code}:`, upsertError);
                                errorCount++;
                            } else {
                                successCount++;
                            }
                        }
                    } else {
                        // ============================================
                        // INSERT NEW REGISTRATION
                        // ============================================
                        const { error: insertError } = await supabase
                            .from('student_unit_registrations')
                            .insert([registration]);
                        
                        if (insertError) {
                            // Try with different conflict resolution
                            if (insertError.code === '23505') {
                                const { error: upsertError } = await supabase
                                    .from('student_unit_registrations')
                                    .upsert(registration, {
                                        onConflict: 'student_id, unit_code, block'
                                    });
                                
                                if (upsertError) {
                                    console.error(`Error upserting ${unit.unit_code}:`, upsertError);
                                    errorCount++;
                                } else {
                                    successCount++;
                                }
                            } else {
                                console.error(`Error inserting ${unit.unit_code}:`, insertError);
                                errorCount++;
                            }
                        } else {
                            successCount++;
                            console.log(`✅ Inserted ${unit.unit_code} successfully`);
                        }
                    }
                }
                
                // ============================================
                // SHOW RESULTS
                // ============================================
                if (successCount > 0) {
                    this.showSuccess(`${successCount} unit(s) registered successfully! ${skippedCount > 0 ? `${skippedCount} skipped.` : ''}`);
                } else if (skippedCount > 0 && errorCount === 0) {
                    this.showInfo(`${skippedCount} unit(s) already registered. No action needed.`);
                } else if (errorCount > 0) {
                    this.showError(`${errorCount} unit(s) failed to register. Please contact admin.`, 'error');
                }
                
                // Clear selections
                document.querySelectorAll('.supp-unit-checkbox:checked').forEach(cb => cb.checked = false);
                if (this.suppUnitSelect) this.suppUnitSelect.value = '';
                if (this.selectAllSupp) this.selectAllSupp.checked = false;
                this.updateSuppSelectedCount();
                
                // Reload data
                await this.loadSupplementaryData();
                await this.loadUnits();
                await this.updateRegistrationLegend();
                
            } catch (error) {
                console.error('❌ Error registering supplementary units:', error);
                this.showError(`Failed to register: ${error.message}`, 'error');
            } finally {
                this.isSubmitting = false;
                if (this.registerSuppBtn) {
                    this.registerSuppBtn.disabled = false;
                    this.registerSuppBtn.innerHTML = '<i class="fas fa-check-circle"></i> Register Selected Units';
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
                
                const { data: reg, error } = await supabase
                    .from('student_unit_registrations')
                    .select('*')
                    .eq('id', regId)
                    .single();
                
                if (error) throw error;
                if (!reg) throw new Error('Registration not found');
                
                const { data: student, error: studentError } = await supabase
                    .from('consolidated_user_profiles_table')
                    .select('full_name, student_id, program, email, phone')
                    .eq('user_id', this.studentId)
                    .single();
                
                if (studentError) throw studentError;
                
                if (typeof Swal !== 'undefined') Swal.close();
                
                this.showExamCardHTML(reg, student);
                this.showSuccess('Exam card generated successfully!');
                
            } catch (error) {
                console.error('Error downloading exam card:', error);
                if (typeof Swal !== 'undefined') Swal.close();
                this.showError(`Failed to download exam card: ${error.message}`, 'error');
            }
        }
        
        showExamCardHTML(reg, student) {
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
                                <span class="info-label">Student ID:</span>
                                <span class="info-value">${student.student_id || 'N/A'}</span>
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
                                <span class="info-value status-approved">${reg.status.toUpperCase()}</span>
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
                    <\\/script>
                </body>
                </html>
            `);
            win.document.close();
        }
        
        // ============================================================
        // HELPER FUNCTIONS
        // ============================================================
        
        getUnitCode(subjectName) {
            if (!subjectName) return 'N/A';
            
            if (window.getUnitCode) {
                return window.getUnitCode(subjectName);
            }
            
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
        
        renderEmptyState(tbody, message) {
            if (!tbody) return;
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px; color: #94a3b8;">
                        <i class="fas fa-info-circle" style="font-size: 32px; display: block; margin-bottom: 10px;"></i>
                        <p>${message}</p>
                    </td>
                </tr>
            `;
        }
        
        showLoading() {
            if (this.availableBody) {
                this.availableBody.innerHTML = '<tr><td colspan="7"><div class="loading-spinner"></div> Loading units...</td></tr>';
            }
            if (this.registeredBody) {
                this.registeredBody.innerHTML = '<tr><td colspan="8"><div class="loading-spinner"></div> Loading registered units...</td></tr>';
            }
        }
        
        showError(message, type = 'error') {
            if (typeof Swal !== 'undefined') {
                if (type === 'warning') {
                    Swal.fire('Warning', message, 'warning');
                } else if (type === 'info') {
                    Swal.fire('Info', message, 'info');
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
                    approvedCount: this.registeredUnits.filter(u => u.status === 'approved' && u.completion_status !== 'completed').length,
                    pendingCount: this.registeredUnits.filter(u => u.status === 'pending').length,
                    completedCount: this.registeredUnits.filter(u => u.completion_status === 'completed' || u.status === 'completed' || (u.grade && u.grade !== '')).length,
                    supplementaryCount: this.registeredUnits.filter(u => u.reg_type === 'Supplementary' || u.reg_type === 'Retake').length,
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
            this.updateRegistrationLegend();
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
            setTimeout(() => {
                if (window.studentDashboard) {
                    window.studentDashboard.updateRegistrationLegend();
                }
            }, 1000);
        });
    } else {
        window.studentDashboard = new StudentDashboard();
        window.unitRegistrationModule = window.studentDashboard;
        console.log('✅ unitRegistrationModule alias created');
        setTimeout(() => {
            if (window.studentDashboard) {
                window.studentDashboard.updateRegistrationLegend();
            }
        }, 500);
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
            window.studentDashboard.updateRegistrationLegend();
        } else if (tab === 'regular' && window.studentDashboard) {
            window.studentDashboard.loadUnits();
        }
    };
    
    // ============================================================
    // UPDATE LEGEND ON PAGE LOAD
    // ============================================================
    
    document.addEventListener('appReady', () => {
        setTimeout(() => {
            if (window.studentDashboard) {
                window.studentDashboard.updateRegistrationLegend();
            }
        }, 500);
    });
    
    console.log('✅ Student Dashboard ready with Supplementary support!');
    console.log('📌 Use window.studentDashboard or window.unitRegistrationModule to access the API');
    console.log('📖 Dynamic legend shows correct pass marks based on program (KRCHN=60%, TVET=50%)');
    console.log('📌 Supplementary: Below pass mark, Retake: Below 30%');
    console.log('📊 Table now shows: Completed (Passed/Failed), Approved, Pending');
    
})();
