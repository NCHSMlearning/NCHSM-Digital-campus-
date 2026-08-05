// ============================================================
// STUDENT DASHBOARD - UNIT REGISTRATION WITH SUPPLEMENTARY SUPPORT
// COMPLETELY REBUILT - v3.0
// ============================================================

(function() {
    'use strict';
    
    console.log('✅ Student Dashboard v3.0 loading...');
    
    // ============================================================
    // MAIN STUDENT CONTROLLER
    // ============================================================
    
    class StudentDashboard {
        constructor() {
            console.log('🔧 Initializing Student Dashboard v3.0...');
            
            // User data
            this.userProfile = null;
            this.studentId = null;
            this.programCode = null;
            this.isTVETStudent = false;
            this.intakeYear = null;
            
            // Unit registration data
            this.registeredUnits = [];
            this.allUnits = [];
            this.maxUnits = 15;
            this.isSubmitting = false;
            this.isInitialized = false;
            
            // Supplementary data
            this.failedUnits = [];
            this.supplementaryRegistrations = [];
            
            // Unit code cache (same as Academic Reports)
            this.unitCodeCache = {};
            
            // DOM cache
            this.cacheElements();
            
            // Initialize
            this.initializeEventListeners();
            this.delayedLoad();
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
            
            // Supplementary tab elements
            this.eligibleBody = document.getElementById('eligibleUnitsBody');
            this.suppRegisteredBody = document.getElementById('suppRegisteredBody');
            this.suppRegType = document.getElementById('suppRegType');
            this.registerSuppBtn = document.getElementById('registerSupplementaryBtn');
            this.selectAllSupp = document.getElementById('selectAllSupp');
            this.eligibleCount = document.getElementById('eligibleUnitsCount');
            this.suppRegisteredCount = document.getElementById('suppRegisteredCount');
            this.suppTabBadge = document.getElementById('suppBadge');
            this.selectedSuppCount = document.getElementById('selectedSuppCount');
            this.downloadAllBtn = document.getElementById('downloadAllSuppExamCardsBtn');
            this.downloadSuppCount = document.getElementById('downloadSuppCount');
            
            // Summary elements
            this.pendingCountDisplay = document.getElementById('pendingCountDisplay');
            this.approvedCountDisplay = document.getElementById('approvedCountDisplay');
            this.completedCountDisplay = document.getElementById('completedCountDisplay');
            this.suppCountDisplay = document.getElementById('suppCountDisplay');
        }
        
        // ============================================================
        // DELAYED LOAD
        // ============================================================
        
        delayedLoad() {
            if (this.tryLoadUser()) return;
            
            setTimeout(() => {
                if (this.tryLoadUser()) return;
            }, 1000);
            
            setTimeout(() => {
                if (this.tryLoadUser()) return;
            }, 3000);
            
            setTimeout(() => {
                if (!this.isInitialized) {
                    console.warn('⚠️ Could not auto-load user profile');
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
                
                // Load unit codes cache (same as Academic Reports)
                this.fetchUnitCodes();
                
                this.loadUnits();
                this.loadSupplementaryData();
                this.updateRegistrationLegend();
                this.isInitialized = true;
                return true;
            }
            return false;
        }
        
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
            
            const tvetPrograms = ['DPOTT', 'DCH', 'DHRIT', 'DSL', 'DSW', 'DCJS', 'DHSS', 'DICT', 'DME',
                                  'CPOTT', 'CCH', 'CHRIT', 'CPC', 'CSL', 'CSW', 'CCJS', 'CAG', 'CHSS', 'CICT',
                                  'ACH', 'AAG', 'ASW', 'CCA', 'PTE', 'TVET'];
            
            this.programCode = this.userProfile.program || 'KRCHN';
            this.isTVETStudent = tvetPrograms.includes(this.programCode);
            this.intakeYear = this.userProfile.intake_year || 2025;
            
            console.log('📊 User data updated:', {
                program: this.programCode,
                type: this.isTVETStudent ? 'TVET' : 'KRCHN'
            });
        }
        
        // ============================================================
        // GET SUPABASE
        // ============================================================
        
        getSupabase() {
            if (window.sb) return window.sb;
            if (window.db?.supabase) return window.db.supabase;
            if (window.supabase) return window.supabase;
            return null;
        }
        
        // ============================================================
        // FETCH UNIT CODES CACHE - SAME AS ACADEMIC REPORTS
        // ============================================================
        
        async fetchUnitCodes() {
            try {
                const supabase = this.getSupabase();
                if (!supabase) return {};
                
                const { data, error } = await supabase
                    .from('units_catalog')
                    .select('unit_name, unit_code')
                    .eq('program', this.programCode || 'KRCHN');
                
                if (error) throw error;
                
                this.unitCodeCache = {};
                data.forEach(item => {
                    this.unitCodeCache[item.unit_name] = item.unit_code;
                });
                
                console.log(`📊 Cached ${Object.keys(this.unitCodeCache).length} unit codes`);
                return this.unitCodeCache;
            } catch (error) {
                console.error('❌ Error fetching unit codes:', error);
                return {};
            }
        }
        
        // ============================================================
        // GET UNIT CODE - SAME AS ACADEMIC REPORTS (NO HARDCODING!)
        // ============================================================
        
        getUnitCode(subjectName) {
            if (!subjectName) return 'N/A';
            
            // Check cache first
            if (this.unitCodeCache && this.unitCodeCache[subjectName]) {
                return this.unitCodeCache[subjectName];
            }
            
            // Check partial match in cache
            if (this.unitCodeCache) {
                for (const [name, code] of Object.entries(this.unitCodeCache)) {
                    if (subjectName.includes(name) || name.includes(subjectName)) {
                        return code;
                    }
                }
            }
            
            // ✅ Special handling (same as Academic Reports)
            if (subjectName.includes('Medical Surgical Nursing II')) {
                const specialty = subjectName.split(':')[1]?.trim() || '';
                if (specialty.includes('Gastrointestinal') || specialty.includes('Hepatobiliary')) return 'NCHSGN 201';
                if (specialty.includes('Orodental')) return 'NCHSGN 202';
                if (specialty.includes('Renal') || specialty.includes('Genito-Urinary')) return 'NCHSGN 203';
                return 'NCHSGN 2XX';
            }
            
            if (subjectName.includes('Medical Surgical Nursing III')) {
                const specialty = subjectName.split(':')[1]?.trim() || '';
                if (specialty.includes('Endocrine')) return 'NCHSGN 209';
                if (specialty.includes('Neurological')) return 'NCHSGN 210';
                return 'NCHSGN 2XX';
            }
            
            if (subjectName.includes('Midwifery')) {
                if (subjectName.includes('I')) return 'NCHSMW 110';
                if (subjectName.includes('II')) return 'NCHSMW 123';
                if (subjectName.includes('III')) return 'NCHSMW 205';
                if (subjectName.includes('IV')) return 'NCHSMW 214';
                return 'NCHSMW 2XX';
            }
            
            if (subjectName.includes('Community Health')) {
                if (subjectName.includes('I')) return 'NCHSCH 125';
                return 'NCHSCH 2XX';
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
                .toUpperCase();
            
            if (code.length > 6) {
                code = code.substring(0, 6);
            }
            
            return code || 'N/A';
        }
        
        // ============================================================
        // UPDATE REGISTRATION LEGEND
        // ============================================================
        
        updateRegistrationLegend() {
            const legendContainer = document.getElementById('legend-content');
            const programBadge = document.getElementById('program-badge-legend');
            const passMarkDisplay = document.getElementById('pass-mark-legend');
            
            if (!legendContainer) return;
            
            const userProfile = window.currentUserProfile || window.db?.currentUserProfile || this.userProfile;
            const program = userProfile?.program || 'KRCHN';
            
            const tvetPrograms = ['DPOTT', 'DCH', 'DHRIT', 'DSL', 'DSW', 'DCJS', 'DHSS', 'DICT', 'DME',
                                  'CPOTT', 'CCH', 'CHRIT', 'CPC', 'CSL', 'CSW', 'CCJS', 'CAG', 'CHSS', 'CICT',
                                  'ACH', 'AAG', 'ASW', 'CCA', 'PTE', 'TVET'];
            const isTVET = tvetPrograms.includes(program);
            
            const passMark = isTVET ? 50 : 60;
            const retakeThreshold = 30;
            const programDisplay = isTVET ? 'TVET' : 'KRCHN Nursing';
            
            if (programBadge) {
                programBadge.textContent = `${isTVET ? '🔧' : '🎓'} ${programDisplay}`;
                programBadge.style.background = isTVET ? '#f59e0b' : '#4C1D95';
            }
            
            if (passMarkDisplay) {
                passMarkDisplay.textContent = `🎯 Pass Mark: ${passMark}% (${programDisplay})`;
            }
            
            legendContainer.innerHTML = `
                <div style="background: #f0fdf4; border-radius: 8px; padding: 12px 16px; border-left: 4px solid #059669;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="background: #059669; color: white; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: 700;">REGULAR</span>
                        <span style="font-weight: 600; color: #065f46; font-size: 13px;">Normal Registration</span>
                    </div>
                    <p style="margin: 4px 0 0 0; font-size: 12px; color: #475569;">
                        <i class="fas fa-check-circle" style="color: #059669; font-size: 11px;"></i> 
                        First-time enrollment in a unit.
                    </p>
                </div>
                <div style="background: #fffbeb; border-radius: 8px; padding: 12px 16px; border-left: 4px solid #f59e0b;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="background: #f59e0b; color: #78350f; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: 700;">SUPP</span>
                        <span style="font-weight: 600; color: #92400e; font-size: 13px;">Supplementary</span>
                    </div>
                    <p style="margin: 4px 0 0 0; font-size: 12px; color: #475569;">
                        <i class="fas fa-redo-alt" style="color: #f59e0b; font-size: 11px;"></i> 
                        <strong>Below ${passMark}%</strong> — One extra exam attempt.
                    </p>
                </div>
                <div style="background: #fef2f2; border-radius: 8px; padding: 12px 16px; border-left: 4px solid #dc2626;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="background: #dc2626; color: white; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: 700;">RETAKE</span>
                        <span style="font-weight: 600; color: #991b1b; font-size: 13px;">Retake</span>
                    </div>
                    <p style="margin: 4px 0 0 0; font-size: 12px; color: #475569;">
                        <i class="fas fa-sync-alt" style="color: #dc2626; font-size: 11px;"></i> 
                        <strong>Below ${retakeThreshold}%</strong> — Full re-enrollment required.
                    </p>
                </div>
            `;
        }
        
        // ============================================================
        // EVENT LISTENERS
        // ============================================================
        
        initializeEventListeners() {
            document.addEventListener('userLoggedIn', (e) => {
                this.userProfile = e.detail?.userProfile;
                if (this.userProfile) {
                    this.studentId = this.userProfile.user_id || this.userProfile.id;
                    this.updateUserData();
                    this.fetchUnitCodes();
                    this.loadUnits();
                    this.loadSupplementaryData();
                    this.updateRegistrationLegend();
                    this.isInitialized = true;
                }
            });
            
            document.addEventListener('userProfileUpdated', (e) => {
                if (e.detail?.userProfile) {
                    this.userProfile = e.detail.userProfile;
                    this.studentId = this.userProfile.user_id || this.userProfile.id;
                    this.updateUserData();
                    this.updateRegistrationLegend();
                    if (!this.isInitialized) {
                        this.fetchUnitCodes();
                        this.loadUnits();
                        this.loadSupplementaryData();
                        this.isInitialized = true;
                    }
                }
            });
            
            document.addEventListener('appReady', () => {
                if (!this.isInitialized) this.tryLoadUser();
            });
            
            document.addEventListener('tabChanged', (e) => {
                if (e.detail?.tabId === 'hub-supplementary' && this.isInitialized) {
                    this.loadSupplementaryData();
                }
                if (e.detail?.tabId === 'hub-register' && this.isInitialized) {
                    this.loadUnits();
                }
            });
            
            // Refresh button
            if (this.refreshBtn) {
                this.refreshBtn.addEventListener('click', () => {
                    if (!this.isInitialized) return;
                    this.loadUnits();
                    this.loadSupplementaryData();
                });
            }
            
            // Submit registration
            if (this.submitBtn) {
                this.submitBtn.addEventListener('click', () => {
                    if (!this.isInitialized) return;
                    this.submitRegistration();
                });
            }
            
            // Select all
            if (this.selectAllCheckbox) {
                this.selectAllCheckbox.addEventListener('change', () => this.selectAllUnits());
            }
            
            // Registration type filter
            if (this.regType) {
                this.regType.addEventListener('change', () => {
                    if (this.regType.value && this.isInitialized) {
                        this.loadAvailableUnits();
                    }
                });
            }
            
            // Block filter
            if (this.blockFilter) {
                this.blockFilter.addEventListener('change', () => {
                    if (this.regType?.value && this.isInitialized) {
                        this.loadAvailableUnits();
                    }
                });
            }
            
            // Unit type filter
            if (this.unitTypeFilter) {
                this.unitTypeFilter.addEventListener('change', () => {
                    if (this.regType?.value && this.isInitialized) {
                        this.loadAvailableUnits();
                    }
                });
            }
            
            // Supplementary listeners
            this.setupSupplementaryListeners();
            
            // Sub-tab switching
            this.setupSubTabSwitching();
        }
        
        // ============================================================
        // SUB-TAB SWITCHING
        // ============================================================
        
        setupSubTabSwitching() {
            const subTabs = document.querySelectorAll('.reg-sub-tab');
            const regularContent = document.getElementById('regular-registration');
            const suppContent = document.getElementById('supplementary-registration');
            
            if (!subTabs.length) return;
            
            subTabs.forEach(tab => {
                tab.addEventListener('click', function(e) {
                    e.preventDefault();
                    const tabType = this.dataset.subtab;
                    
                    subTabs.forEach(t => {
                        t.classList.remove('active');
                        t.style.color = '#6b7280';
                        t.style.borderBottom = '3px solid transparent';
                    });
                    
                    this.classList.add('active');
                    this.style.color = '#4C1D95';
                    this.style.borderBottom = '3px solid #4C1D95';
                    
                    if (tabType === 'supplementary') {
                        if (regularContent) regularContent.style.display = 'none';
                        if (suppContent) {
                            suppContent.style.display = 'block';
                            if (window.studentDashboard) {
                                window.studentDashboard.loadSupplementaryData();
                            }
                        }
                    } else {
                        if (suppContent) suppContent.style.display = 'none';
                        if (regularContent) {
                            regularContent.style.display = 'block';
                            if (window.studentDashboard) {
                                window.studentDashboard.loadUnits();
                            }
                        }
                    }
                });
            });
        }
        
        // ============================================================
        // SUPPLEMENTARY LISTENERS
        // ============================================================
        
        setupSupplementaryListeners() {
            // Registration type change
            if (this.suppRegType) {
                this.suppRegType.addEventListener('change', () => {
                    this.loadEligibleUnits();
                });
            }
            
            // Refresh button
            const refreshBtn = document.getElementById('refreshSuppUnitsBtn');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => {
                    this.loadEligibleUnits();
                });
            }
            
            // Clear selection
            const clearBtn = document.getElementById('clearSuppSelectionBtn');
            if (clearBtn) {
                clearBtn.addEventListener('click', () => {
                    document.querySelectorAll('.supp-unit-checkbox').forEach(cb => cb.checked = false);
                    this.updateSuppCount();
                });
            }
            
            // Select all
            if (this.selectAllSupp) {
                this.selectAllSupp.addEventListener('change', () => {
                    document.querySelectorAll('.supp-unit-checkbox:not([disabled])').forEach(cb => {
                        cb.checked = this.selectAllSupp.checked;
                    });
                    this.updateSuppCount();
                });
            }
            
            // Register button
            if (this.registerSuppBtn) {
                this.registerSuppBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (!this.isInitialized) {
                        this.showError('Please wait for login to complete');
                        return;
                    }
                    this.registerSupplementaryUnits();
                });
            }
        }
        
        // ============================================================
        // LOAD UNITS - REGULAR REGISTRATION
        // ============================================================
        
        async loadUnits() {
            console.log('📥 Loading units...');
            
            if (!this.userProfile || !this.studentId) {
                console.warn('⚠️ No user profile');
                return;
            }
            
            try {
                const supabase = this.getSupabase();
                if (!supabase) {
                    setTimeout(() => this.loadUnits(), 2000);
                    return;
                }
                
                await this.loadRegisteredUnits(supabase);
                await this.loadAvailableUnits(supabase);
                await this.loadMaxUnits(supabase);
                await this.loadBlocks(supabase);
                
                console.log('✅ Units loaded successfully');
                
            } catch (error) {
                console.error('❌ Error loading units:', error);
            }
        }
        
        async loadRegisteredUnits(supabase) {
            try {
                const { data, error } = await supabase
                    .from('student_unit_registrations')
                    .select('*')
                    .eq('student_id', this.studentId)
                    .order('submitted_date', { ascending: false });
                
                if (error) throw error;
                
                this.registeredUnits = data || [];
                this.displayRegisteredUnits();
                
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
                    this.availableBody.innerHTML = '<tr><td colspan="7" style="text-align:center">Select Registration Type first</td></tr>';
                }
                return;
            }
            
            try {
                let query = supabase
                    .from('units_catalog')
                    .select('*')
                    .eq('status', 'active');
                
                if (this.programCode) {
                    query = query.eq('program', this.isTVETStudent ? this.programCode : 'KRCHN');
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
                
                // Filter based on registration type
                const registeredCodes = new Set(this.registeredUnits.map(u => u.unit_code));
                this.allUnits = this.allUnits.filter(u => !registeredCodes.has(u.unit_code));
                
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
                    query = query.eq('program', this.isTVETStudent ? this.programCode : 'KRCHN');
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
                    const userBlock = this.userProfile?.block;
                    if (userBlock && blocks.includes(userBlock)) {
                        this.blockFilter.value = userBlock;
                    }
                }
                
            } catch (error) {
                console.error('Error loading blocks:', error);
            }
        }
        
        // ============================================================
        // DISPLAY FUNCTIONS - REGULAR REGISTRATION
        // ============================================================
        
        displayAvailableUnits() {
            if (!this.availableBody) return;
            
            const regType = this.regType?.value;
            const isSupplementary = regType === 'Supplementary' || regType === 'Retake';
            
            let displayUnits = this.allUnits;
            if (isSupplementary) {
                const failedCodes = new Set(this.failedUnits.map(u => u.unit_code));
                displayUnits = this.allUnits.filter(u => failedCodes.has(u.unit_code));
            }
            
            if (displayUnits.length === 0) {
                this.availableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:40px; color:#94a3b8;">No units available</td></tr>`;
                return;
            }
            
            let html = '';
            for (const unit of displayUnits) {
                const isRegistered = this.registeredUnits.some(u => u.unit_code === unit.unit_code);
                const isFailed = this.failedUnits.some(u => u.unit_code === unit.unit_code);
                const suppBadge = isFailed && !isRegistered ? 
                    '<span style="background:#fef3c7; color:#92400e; padding:2px 8px; border-radius:12px; font-size:9px; font-weight:600; margin-left:4px;">Retake</span>' : '';
                
                html += `<tr>
                    <td style="text-align:center; padding:10px 12px;">${!isRegistered ? `<input type="checkbox" class="unit-checkbox" data-code="${this.escapeHtml(unit.unit_code)}">` : '—'}</td>
                    <td style="padding:10px 12px;"><strong>${this.escapeHtml(unit.unit_code)}</strong> ${suppBadge}</td>
                    <td style="padding:10px 12px;">${this.escapeHtml(unit.unit_name)}</td>
                    <td style="padding:10px 12px;">${this.escapeHtml(unit.block)}</td>
                    <td style="padding:10px 12px; text-align:center;">${this.escapeHtml(unit.unit_type || 'Core')}</td>
                    <td style="padding:10px 12px; text-align:center;">${unit.credits || 3}</td>
                    <td style="padding:10px 12px; text-align:center;"><span class="status-badge status-available">Available</span></td>
                </tr>`;
            }
            
            this.availableBody.innerHTML = html;
            this.updateSelectedCount();
            this.attachCheckboxEvents();
        }
        
        displayRegisteredUnits() {
            if (!this.registeredBody) return;
            
            const pendingCount = this.registeredUnits.filter(u => u.status === 'pending').length;
            const approvedCount = this.registeredUnits.filter(u => u.status === 'approved' && !u.grade).length;
            const completedCount = this.registeredUnits.filter(u => u.status === 'completed' || u.grade).length;
            const suppCount = this.registeredUnits.filter(u => u.reg_type === 'Supplementary' || u.reg_type === 'Retake').length;
            
            if (this.pendingCountDisplay) this.pendingCountDisplay.textContent = pendingCount;
            if (this.approvedCountDisplay) this.approvedCountDisplay.textContent = approvedCount;
            if (this.completedCountDisplay) this.completedCountDisplay.textContent = completedCount;
            if (this.suppCountDisplay) this.suppCountDisplay.textContent = suppCount;
            
            const countEl = document.getElementById('registeredUnitsCount');
            if (countEl) countEl.textContent = this.registeredUnits.length + ' units';
            
            if (this.registeredUnits.length === 0) {
                this.registeredBody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align:center; padding:60px 20px; color:#94a3b8;">
                            <div style="font-size:48px; margin-bottom:12px; opacity:0.3;"><i class="fas fa-clipboard-list"></i></div>
                            <p style="font-weight:500; color:#1e293b;">No units registered yet</p>
                        </td>
                    </tr>
                `;
                return;
            }
            
            let html = '';
            for (const unit of this.registeredUnits) {
                const hasGrade = unit.grade && unit.grade !== '';
                const isPassing = hasGrade && !['FAIL', 'F', 'D', 'E'].includes(unit.grade);
                const isCompleted = unit.status === 'completed' || hasGrade;
                
                let statusText = unit.status || 'Pending';
                let statusColor = '#f59e0b';
                let statusBg = '#fef3c7';
                let statusBadge = '';
                
                if (isCompleted) {
                    statusText = 'Completed';
                    statusColor = '#10b981';
                    statusBg = '#d1fae5';
                    statusBadge = isPassing ? 
                        '<span style="background:#d1fae5; color:#065f46; padding:2px 10px; border-radius:12px; font-size:10px; font-weight:600;">🟢 Passed</span>' :
                        '<span style="background:#fee2e2; color:#991b1b; padding:2px 10px; border-radius:12px; font-size:10px; font-weight:600;">🔴 Failed</span>';
                } else if (unit.status === 'approved') {
                    statusText = 'Approved';
                    statusColor = '#3b82f6';
                    statusBg = '#dbeafe';
                } else if (unit.status === 'rejected') {
                    statusText = 'Rejected';
                    statusColor = '#dc2626';
                    statusBg = '#fee2e2';
                }
                
                const isSupplementary = unit.reg_type === 'Supplementary' || unit.reg_type === 'Retake';
                const regBadge = `<span style="background:${isSupplementary ? '#fef3c7' : '#e0e7ff'}; color:${isSupplementary ? '#B45309' : '#4C1D95'}; padding:2px 10px; border-radius:12px; font-size:10px; font-weight:600;">
                    ${this.escapeHtml(unit.reg_type || 'Normal')}
                </span>`;
                
                const dateDisplay = unit.completed_at ? 
                    new Date(unit.completed_at).toLocaleDateString() : 
                    (unit.submitted_date ? new Date(unit.submitted_date).toLocaleDateString() : '—');
                
                let actionButtons = '—';
                if (unit.status === 'pending') {
                    actionButtons = `<button onclick="window.dropUnit('${unit.unit_code}')" 
                        style="background:#fee2e2; color:#991b1b; border:none; padding:4px 12px; border-radius:6px; cursor:pointer; font-size:11px; font-weight:600;">
                        <i class="fas fa-trash"></i> Drop
                    </button>`;
                }
                
                html += `<tr>
                    <td style="padding:12px 16px;"><strong>${this.escapeHtml(unit.unit_code)}</strong></td>
                    <td style="padding:12px 16px;">${this.escapeHtml(unit.unit_name)}</td>
                    <td style="padding:12px 16px;">${this.escapeHtml(unit.block)}</td>
                    <td style="padding:12px 16px; text-align:center;">${regBadge}</td>
                    <td style="padding:12px 16px; text-align:center;">
                        <span style="background:${statusBg}; color:${statusColor}; padding:4px 14px; border-radius:20px; font-size:12px; font-weight:600;">
                            ${statusText}
                        </span>
                        ${statusBadge}
                    </td>
                    <td style="padding:12px 16px; text-align:center; font-size:12px;">${dateDisplay}</td>
                    <td style="padding:12px 16px; text-align:center;">${actionButtons}</td>
                </tr>`;
            }
            
            this.registeredBody.innerHTML = html;
        }
        
        updateSelectedCount() {
            const count = document.querySelectorAll('.unit-checkbox:checked').length;
            const selectedSpan = document.getElementById('selected-units-count');
            if (selectedSpan) selectedSpan.textContent = count;
        }
        
        attachCheckboxEvents() {
            document.querySelectorAll('.unit-checkbox').forEach(cb => {
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
        
        // ============================================================
        // SUBMIT REGULAR REGISTRATION
        // ============================================================
        
        async submitRegistration() {
            if (this.isSubmitting) {
                this.showError('Please wait...', 'warning');
                return;
            }
            
            const regType = this.regType?.value;
            if (!regType) {
                this.showError('Select Registration Type', 'warning');
                return;
            }
            
            const selectedCodes = Array.from(document.querySelectorAll('.unit-checkbox:checked')).map(cb => cb.dataset.code);
            if (selectedCodes.length === 0) {
                this.showError('No units selected', 'warning');
                return;
            }
            
            const currentTotal = this.registeredUnits.filter(u => u.status === 'pending' || u.status === 'approved').length;
            if (selectedCodes.length + currentTotal > this.maxUnits) {
                this.showError(`Max ${this.maxUnits} units allowed`, 'warning');
                return;
            }
            
            if (!confirm(`Submit ${selectedCodes.length} unit(s) for ${regType}?`)) return;
            
            this.isSubmitting = true;
            if (this.submitBtn) {
                this.submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
                this.submitBtn.disabled = true;
            }
            
            try {
                const supabase = this.getSupabase();
                if (!supabase) throw new Error('Database not available');
                
                const { data: units, error: unitsError } = await supabase
                    .from('units_catalog')
                    .select('*')
                    .in('unit_code', selectedCodes);
                
                if (unitsError) throw unitsError;
                
                const academicYear = new Date().getFullYear().toString();
                const term = this.getCurrentTerm();
                
                const registrations = units.map(unit => ({
                    student_id: this.studentId,
                    unit_code: unit.unit_code,
                    unit_name: unit.unit_name,
                    program: unit.program || this.programCode,
                    block: unit.block || this.userProfile?.block,
                    reg_type: regType,
                    status: 'pending',
                    submitted_date: new Date().toISOString(),
                    created_at: new Date().toISOString(),
                    credits: unit.credits || 3,
                    intake_year: this.intakeYear,
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
                this.showError(error.message, 'error');
            } finally {
                this.isSubmitting = false;
                if (this.submitBtn) {
                    this.submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit';
                    this.submitBtn.disabled = false;
                }
            }
        }
        
        disableSubmitButton(disabled) {
            if (this.submitBtn) {
                this.submitBtn.disabled = disabled;
                this.submitBtn.style.opacity = disabled ? '0.6' : '1';
            }
        }
        
        // ============================================================
        // GET CURRENT TERM
        // ============================================================
        
        getCurrentTerm() {
            const month = new Date().getMonth();
            if (month >= 0 && month <= 3) return 'Trimester 1';
            if (month >= 4 && month <= 7) return 'Trimester 2';
            return 'Trimester 3';
        }
        
        // ============================================================
        // SUPPLEMENTARY - LOAD ELIGIBLE UNITS (NO HARDCODING!)
        // ============================================================
        
        async loadSupplementaryData() {
            console.log('📚 Loading supplementary data...');
            
            if (!this.userProfile || !this.studentId) {
                console.warn('⚠️ No user profile');
                return;
            }
            
            await this.loadStudentSupplementaryRegistrations();
            
            if (this.suppRegType?.value) {
                await this.loadEligibleUnits();
            }
        }
        
        async loadEligibleUnits() {
            const regType = this.suppRegType?.value;
            const tbody = this.eligibleBody;
            const countEl = this.eligibleCount;
            const availableCountEl = document.getElementById('suppAvailableCount');
            const loadingIndicator = document.getElementById('suppLoadingIndicator');
            const infoBox = document.getElementById('regTypeInfo');
            const infoText = document.getElementById('regTypeInfoText');
            const selectAll = this.selectAllSupp;
            
            if (!regType) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; padding: 40px; color: #94a3b8;">
                            <i class="fas fa-hand-pointer" style="font-size: 32px; display: block; margin-bottom: 10px;"></i>
                            <p>Select a Registration Type above</p>
                        </td>
                    </tr>
                `;
                if (countEl) countEl.textContent = '0 units';
                if (availableCountEl) availableCountEl.textContent = '0';
                if (infoBox) infoBox.style.display = 'none';
                return;
            }
            
            if (loadingIndicator) loadingIndicator.style.display = 'inline-block';
            
            if (infoBox) {
                infoBox.style.display = 'block';
                infoText.textContent = `Showing units eligible for ${regType}. Select units to register.`;
                infoBox.style.background = regType === 'Supplementary' ? '#fffbeb' : '#fef2f2';
                infoBox.style.borderLeft = `3px solid ${regType === 'Supplementary' ? '#f59e0b' : '#dc2626'}`;
            }
            
            try {
                const supabase = this.getSupabase();
                if (!supabase) throw new Error('Database not available');
                
                const user = this.userProfile || window.currentUserProfile;
                const admissionNumber = user?.student_id || user?.admission_number || user?.user_id;
                const userId = this.studentId;
                
                if (!admissionNumber || !userId) {
                    throw new Error('User not found');
                }
                
                console.log(`🔍 Loading ${regType} units for:`, admissionNumber);
                
                // ✅ STEP 1: Get marks
                const { data: marks, error } = await supabase
                    .from('student_marks')
                    .select('*')
                    .eq('admission_number', admissionNumber)
                    .eq('published', true);
                
                if (error) throw error;
                
                if (!marks || marks.length === 0) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="7" style="text-align: center; padding: 40px; color: #94a3b8;">
                                <i class="fas fa-info-circle" style="font-size: 32px; display: block; margin-bottom: 10px;"></i>
                                <p>No academic records found.</p>
                            </td>
                        </tr>
                    `;
                    if (countEl) countEl.textContent = '0 units';
                    if (availableCountEl) availableCountEl.textContent = '0';
                    return;
                }
                
                console.log('📊 Marks found:', marks);
                
                // ✅ STEP 2: Ensure unit codes are cached
                if (!this.unitCodeCache || Object.keys(this.unitCodeCache).length === 0) {
                    await this.fetchUnitCodes();
                }
                
                // ✅ STEP 3: Get units catalog for building index
                const { data: catalog, error: catalogError } = await supabase
                    .from('units_catalog')
                    .select('unit_code, unit_name')
                    .eq('program', this.programCode || 'KRCHN');
                
                if (catalogError) {
                    console.warn('Could not load catalog:', catalogError);
                }
                
                // ✅ STEP 4: Build subject to unit code mapping from catalog (NO HARDCODING!)
                const subjectToUnitCode = {};
                if (catalog) {
                    catalog.forEach(unit => {
                        const unitName = unit.unit_name || '';
                        const unitCode = unit.unit_code || '';
                        
                        if (unitName) {
                            subjectToUnitCode[unitName] = unitCode;
                            
                            const shortName = unitName.replace(/^(NCHSGN|NCHSCH|NCHSM)\s+/, '');
                            if (shortName !== unitName) {
                                subjectToUnitCode[shortName] = unitCode;
                            }
                            
                            const words = unitName.split(' ');
                            if (words.length >= 3) {
                                const key = words.slice(0, 3).join(' ');
                                subjectToUnitCode[key] = unitCode;
                            }
                        }
                    });
                }
                
                console.log('📋 Subject to Unit Code mapping (from catalog):', subjectToUnitCode);
                
                // Determine thresholds
                const isTVET = this.isTVETStudent;
                const passThreshold = isTVET ? 50 : 60;
                const retakeThreshold = 30;
                
                // Filter marks
                let eligibleUnits = [];
                let processedUnits = new Set();
                
                for (const mark of marks) {
                    const score = mark.final_score || 0;
                    const subjectName = mark.subject_name || 'Unknown';
                    
                    if (processedUnits.has(subjectName)) continue;
                    
                    let isEligible = false;
                    let determinedType = '';
                    
                    if (regType === 'Supplementary') {
                        if (score >= retakeThreshold && score < passThreshold) {
                            isEligible = true;
                            determinedType = 'Supplementary';
                        }
                    } else if (regType === 'Retake') {
                        if (score < retakeThreshold && score > 0) {
                            isEligible = true;
                            determinedType = 'Retake';
                        }
                    }
                    
                    if (isEligible) {
                        processedUnits.add(subjectName);
                        
                        // ✅ STEP 5: Get unit code (NO HARDCODING!)
                        let unitCode = mark.unit_code || subjectToUnitCode[subjectName];
                        
                        if (!unitCode) {
                            for (const [key, code] of Object.entries(subjectToUnitCode)) {
                                if (subjectName.includes(key) || key.includes(subjectName)) {
                                    unitCode = code;
                                    break;
                                }
                            }
                        }
                        
                        if (!unitCode) {
                            unitCode = this.getUnitCode(subjectName);
                        }
                        
                        console.log(`📝 Mapping: "${subjectName}" → "${unitCode}" (score: ${score}%)`);
                        
                        // Check if already registered
                        const { data: existing } = await supabase
                            .from('student_unit_registrations')
                            .select('id, status')
                            .eq('student_id', userId)
                            .eq('unit_code', unitCode)
                            .maybeSingle();
                        
                        let status = 'Eligible';
                        let isRegistered = false;
                        
                        if (existing) {
                            isRegistered = true;
                            if (existing.status === 'pending') status = '⏳ Pending';
                            else if (existing.status === 'approved') status = '✅ Approved';
                            else if (existing.status === 'completed') status = '📋 Completed';
                            else if (existing.status === 'rejected') status = '❌ Rejected';
                        }
                        
                        eligibleUnits.push({
                            unit_code: unitCode,
                            unit_name: subjectName,
                            block: mark.block || 'N/A',
                            score: score,
                            reg_type: determinedType,
                            grade: mark.grade || 'FAIL',
                            status: status,
                            is_registered: isRegistered,
                            existing_id: existing?.id || null
                        });
                    }
                }
                
                this.failedUnits = eligibleUnits;
                this.renderEligibleTable(eligibleUnits);
                
                const availableCount = eligibleUnits.filter(u => !u.is_registered).length;
                if (countEl) countEl.textContent = `${eligibleUnits.length} units`;
                if (availableCountEl) availableCountEl.textContent = eligibleUnits.length;
                if (this.suppTabBadge) this.suppTabBadge.textContent = eligibleUnits.length;
                
                if (selectAll) {
                    selectAll.checked = false;
                    selectAll.disabled = eligibleUnits.length === 0;
                }
                
                console.log(`✅ Loaded ${eligibleUnits.length} units (${availableCount} available)`);
                
            } catch (error) {
                console.error('❌ Error loading units:', error);
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; padding: 40px; color: #dc2626;">
                            <i class="fas fa-exclamation-circle" style="font-size: 32px; display: block; margin-bottom: 10px;"></i>
                            <p>Error: ${error.message}</p>
                        </td>
                    </tr>
                `;
            } finally {
                if (loadingIndicator) loadingIndicator.style.display = 'none';
            }
        }
        
        // ============================================================
        // RENDER ELIGIBLE TABLE
        // ============================================================
        
        renderEligibleTable(units) {
            const tbody = this.eligibleBody;
            if (!tbody) return;
            
            if (!units || units.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; padding: 40px; color: #94a3b8;">
                            <i class="fas fa-check-circle" style="font-size: 32px; color: #10b981; display: block; margin-bottom: 10px;"></i>
                            <p>No eligible units found.</p>
                        </td>
                    </tr>
                `;
                return;
            }
            
            let html = '';
            for (const unit of units) {
                const canRegister = !unit.is_registered;
                const isRegistered = unit.is_registered;
                
                let statusText = unit.status;
                let statusColor = '#059669';
                let statusBg = '#d1fae5';
                
                if (unit.status === 'Eligible') {
                    statusText = '✅ Eligible';
                    statusColor = '#059669';
                    statusBg = '#d1fae5';
                } else if (unit.status === '❌ Rejected') {
                    statusText = '❌ Rejected';
                    statusColor = '#dc2626';
                    statusBg = '#fee2e2';
                } else if (unit.status === '✅ Approved') {
                    statusText = '✅ Approved';
                    statusColor = '#059669';
                    statusBg = '#d1fae5';
                } else if (unit.status === '⏳ Pending') {
                    statusText = '⏳ Pending';
                    statusColor = '#f59e0b';
                    statusBg = '#fef3c7';
                } else if (unit.status === '📋 Completed') {
                    statusText = '📋 Completed';
                    statusColor = '#3b82f6';
                    statusBg = '#dbeafe';
                }
                
                let scoreDisplay = 'N/A';
                if (unit.score > 0) {
                    const scoreColor = unit.score < 30 ? '#dc2626' : unit.score < 60 ? '#f59e0b' : '#10b981';
                    scoreDisplay = `<span style="font-weight: 700; color: ${scoreColor};">${unit.score}%</span>`;
                }
                
                const regTypeBadge = unit.reg_type === 'Retake' ? 
                    '<span style="background: #dc2626; color: white; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 600;">Retake</span>' :
                    '<span style="background: #f59e0b; color: white; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 600;">Supplementary</span>';
                
                html += `
                    <tr style="border-bottom: 1px solid #f1f5f9; ${isRegistered ? 'opacity: 0.6;' : ''}">
                        <td style="padding: 12px 16px; text-align: center;">
                            <input type="checkbox" class="supp-unit-checkbox" data-unit='${JSON.stringify(unit)}' 
                                   ${!canRegister ? 'disabled' : ''} style="width: 16px; height: 16px; cursor: pointer;">
                        </td>
                        <td style="padding: 12px 16px; font-weight: 600; color: #0A3D62;">${this.escapeHtml(unit.unit_code)}</td>
                        <td style="padding: 12px 16px;">${this.escapeHtml(unit.unit_name)}</td>
                        <td style="padding: 12px 16px;">${this.escapeHtml(unit.block)}</td>
                        <td style="padding: 12px 16px; text-align: center;">${scoreDisplay}</td>
                        <td style="padding: 12px 16px; text-align: center;">${regTypeBadge}</td>
                        <td style="padding: 12px 16px; text-align: center;">
                            <span style="background: ${statusBg}; color: ${statusColor}; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;">
                                ${statusText}
                            </span>
                        </td>
                    </tr>
                `;
            }
            
            tbody.innerHTML = html;
            
            document.querySelectorAll('.supp-unit-checkbox').forEach(cb => {
                cb.addEventListener('change', () => this.updateSuppCount());
            });
            
            this.updateSuppCount();
        }
        
        updateSuppCount() {
            const count = document.querySelectorAll('.supp-unit-checkbox:checked').length;
            if (this.selectedSuppCount) this.selectedSuppCount.textContent = count;
        }
        
        // ============================================================
        // LOAD STUDENT SUPPLEMENTARY REGISTRATIONS
        // ============================================================
        
        async loadStudentSupplementaryRegistrations() {
            const tbody = this.suppRegisteredBody;
            if (!tbody) return;
            
            try {
                const supabase = this.getSupabase();
                if (!this.studentId || !supabase) {
                    this.updateDownloadButton(0);
                    return;
                }
                
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
                            <td colspan="6" style="text-align: center; padding: 40px; color: #94a3b8;">
                                <i class="fas fa-inbox" style="font-size: 40px; display: block; margin-bottom: 10px;"></i>
                                <p>No supplementary registrations found.</p>
                            </td>
                        </tr>
                    `;
                    if (this.suppRegisteredCount) this.suppRegisteredCount.textContent = '0';
                    this.updateDownloadButton(0);
                    return;
                }
                
                let html = '';
                let approvedCount = 0;
                
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
                    
                    if (reg.status === 'approved' || reg.status === 'completed') {
                        approvedCount++;
                    }
                    
                    html += `
                        <tr>
                            <td style="padding: 12px 16px; font-weight: 600; color: #0A3D62;">${this.escapeHtml(reg.unit_code)}</td>
                            <td style="padding: 12px 16px;">${this.escapeHtml(reg.unit_name)}</td>
                            <td style="padding: 12px 16px;">${this.escapeHtml(reg.block || 'N/A')}</td>
                            <td style="padding: 12px 16px; text-align: center;">
                                <span style="background: ${reg.reg_type === 'Retake' ? '#dc2626' : '#f59e0b'}; color: white; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;">
                                    ${this.escapeHtml(reg.reg_type)}
                                </span>
                            </td>
                            <td style="padding: 12px 16px; text-align: center;">
                                <span style="background: ${statusBg}; color: ${statusColor}; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;">
                                    ${statusText}
                                </span>
                            </td>
                            <td style="padding: 12px 16px; text-align: center;">${regDate}</td>
                        </tr>
                    `;
                }
                
                tbody.innerHTML = html;
                if (this.suppRegisteredCount) {
                    this.suppRegisteredCount.textContent = this.supplementaryRegistrations.length;
                }
                
                this.updateDownloadButton(approvedCount);
                
            } catch (error) {
                console.error('❌ Error loading supplementary registrations:', error);
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; padding: 40px; color: #dc2626;">
                            <i class="fas fa-exclamation-circle" style="font-size: 40px; display: block; margin-bottom: 10px;"></i>
                            Error: ${error.message}
                        </td>
                    </tr>
                `;
                this.updateDownloadButton(0);
            }
        }
        
        // ============================================================
        // UPDATE DOWNLOAD BUTTON
        // ============================================================
        
        updateDownloadButton(approvedCount) {
            const downloadBtn = this.downloadAllBtn;
            const countBadge = this.downloadSuppCount;
            
            if (downloadBtn) {
                downloadBtn.style.display = 'flex';
                if (countBadge) countBadge.textContent = approvedCount || 0;
                
                if (approvedCount > 0) {
                    downloadBtn.style.opacity = '1';
                    downloadBtn.style.cursor = 'pointer';
                    downloadBtn.removeAttribute('disabled');
                    downloadBtn.title = '📥 Download exam card with all approved units';
                } else {
                    downloadBtn.style.opacity = '0.5';
                    downloadBtn.style.cursor = 'not-allowed';
                    downloadBtn.setAttribute('disabled', 'disabled');
                    downloadBtn.title = '⛔ No approved units available';
                }
            }
        }
        
        // ============================================================
        // REGISTER SUPPLEMENTARY UNITS
        // ============================================================
        
        async registerSupplementaryUnits() {
            const regType = this.suppRegType?.value;
            if (!regType) {
                this.showError('Please select a registration type.', 'warning');
                return;
            }
            
            const selectedCheckboxes = document.querySelectorAll('.supp-unit-checkbox:checked');
            if (selectedCheckboxes.length === 0) {
                this.showError('Please select at least one unit.', 'warning');
                return;
            }
            
            if (selectedCheckboxes.length > 8) {
                this.showError('Maximum 8 units allowed.', 'warning');
                return;
            }
            
            const selectedUnits = [];
            selectedCheckboxes.forEach(cb => {
                try {
                    const unit = JSON.parse(cb.dataset.unit);
                    selectedUnits.push(unit);
                } catch (e) {
                    console.error('Error parsing unit:', e);
                }
            });
            
            if (!confirm(`Register ${selectedUnits.length} unit(s) for ${regType}?`)) return;
            
            this.isSubmitting = true;
            if (this.registerSuppBtn) {
                this.registerSuppBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
                this.registerSuppBtn.disabled = true;
            }
            
            try {
                const supabase = this.getSupabase();
                if (!supabase) throw new Error('Database not available');
                
                const user = this.userProfile || window.currentUserProfile;
                const academicYear = new Date().getFullYear().toString();
                const term = this.getCurrentTerm();
                
                let successCount = 0;
                let skippedCount = 0;
                let errorCount = 0;
                
                for (const unit of selectedUnits) {
                    const { data: existing } = await supabase
                        .from('student_unit_registrations')
                        .select('id, status')
                        .eq('student_id', this.studentId)
                        .eq('unit_code', unit.unit_code)
                        .maybeSingle();
                    
                    if (existing) {
                        if (existing.status === 'pending' || existing.status === 'approved') {
                            console.log(`⚠️ ${unit.unit_code} already ${existing.status}`);
                            skippedCount++;
                            continue;
                        }
                        
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
                            console.log(`✅ Updated ${unit.unit_code} to pending`);
                        }
                    } else {
                        const registration = {
                            student_id: this.studentId,
                            unit_code: unit.unit_code,
                            unit_name: unit.unit_name || unit.unit_code,
                            program: this.programCode || user?.program || 'KRCHN',
                            block: unit.block || user?.block || 'N/A',
                            reg_type: regType,
                            status: 'pending',
                            submitted_date: new Date().toISOString(),
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                            credits: 3,
                            intake_year: this.intakeYear || '2025',
                            academic_year: academicYear,
                            term: term
                        };
                        
                        const { error: insertError } = await supabase
                            .from('student_unit_registrations')
                            .insert([registration]);
                        
                        if (insertError) {
                            console.error(`Error inserting ${unit.unit_code}:`, insertError);
                            errorCount++;
                        } else {
                            successCount++;
                            console.log(`✅ Inserted ${unit.unit_code} as ${regType}`);
                        }
                    }
                }
                
                if (successCount > 0) {
                    this.showSuccess(`${successCount} unit(s) registered successfully!`);
                } else if (skippedCount > 0 && errorCount === 0) {
                    this.showInfo(`${skippedCount} unit(s) already registered.`);
                } else if (errorCount > 0) {
                    this.showError(`${errorCount} unit(s) failed to register. Contact admin.`, 'error');
                }
                
                document.querySelectorAll('.supp-unit-checkbox:checked').forEach(cb => cb.checked = false);
                if (this.selectAllSupp) this.selectAllSupp.checked = false;
                this.updateSuppCount();
                
                await this.loadSupplementaryData();
                await this.loadUnits();
                
            } catch (error) {
                console.error('❌ Error:', error);
                this.showError(error.message, 'error');
            } finally {
                this.isSubmitting = false;
                if (this.registerSuppBtn) {
                    this.registerSuppBtn.innerHTML = '<i class="fas fa-check-circle"></i> Register Selected';
                    this.registerSuppBtn.disabled = false;
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
                if (!supabase) throw new Error('Database not available');
                
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
                
                this.showSuccess(`Unit ${unitCode} dropped!`);
                await this.loadUnits();
                await this.loadSupplementaryData();
                
            } catch (error) {
                console.error('Error dropping unit:', error);
                this.showError(error.message, 'error');
            }
        }
        
        // ============================================================
        // HELPER FUNCTIONS
        // ============================================================
        
        escapeHtml(str) {
            if (!str) return '';
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }
        
        showError(message, type = 'error') {
            if (typeof Swal !== 'undefined') {
                if (type === 'warning') Swal.fire('Warning', message, 'warning');
                else if (type === 'info') Swal.fire('Info', message, 'info');
                else Swal.fire('Error', message, 'error');
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
            if (container && !this.isInitialized) {
                container.innerHTML = `
                    <div style="text-align:center; padding:60px 20px;">
                        <i class="fas fa-user-lock" style="font-size:48px; color:#94a3b8; margin-bottom:16px;"></i>
                        <h3 style="color:#1e293b;">Please Log In</h3>
                        <p style="color:#94a3b8;">You need to be logged in to register for units.</p>
                        <button onclick="window.location.href='login.html'" 
                            style="padding:10px 24px; background:#4C1D95; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:600;">
                            <i class="fas fa-sign-in-alt"></i> Go to Login
                        </button>
                    </div>
                `;
            }
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
        });
    } else {
        window.studentDashboard = new StudentDashboard();
        window.unitRegistrationModule = window.studentDashboard;
    }
    
    // ============================================================
    // GLOBAL FUNCTIONS
    // ============================================================
    
    window.dropUnit = (unitCode) => {
        if (window.studentDashboard) window.studentDashboard.dropUnit(unitCode);
        else console.error('❌ studentDashboard not available');
    };
    
    window.switchRegTab = (tab) => {
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
        
        if (regularContent) regularContent.style.display = tab === 'regular' ? 'block' : 'none';
        if (suppContent) suppContent.style.display = tab === 'supplementary' ? 'block' : 'none';
        
        if (tab === 'supplementary' && window.studentDashboard) {
            window.studentDashboard.loadSupplementaryData();
        } else if (tab === 'regular' && window.studentDashboard) {
            window.studentDashboard.loadUnits();
        }
    };
    
    console.log('✅ Student Dashboard v3.0 ready!');
    console.log('📌 Use window.studentDashboard to access');
    console.log('📊 NO hardcoded unit mappings - uses Academic Reports logic');
    
})();

// ============================================================
// SUPPLEMENTARY EXAM CARD - STANDALONE WITH STYLES
// ============================================================

// Escape HTML helper
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ============================================================
// GENERATE SUPPLEMENTARY EXAM CARD HTML
// ============================================================

function generateSupplementaryExamCardHTML(registrations, student) {
    const today = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // Detect TVET
    const tvetPrograms = ['DPOTT', 'DCH', 'DHRIT', 'DSL', 'DSW', 'DCJS', 'DHSS', 'DICT', 'DME',
                          'CPOTT', 'CCH', 'CHRIT', 'CPC', 'CSL', 'CSW', 'CCJS', 'CAG', 'CHSS', 'CICT',
                          'ACH', 'AAG', 'ASW', 'CCA', 'PTE', 'TVET'];
    const program = student?.program || 'KRCHN';
    const isTVET = tvetPrograms.includes(program);
    const hodTitle = isTVET ? `HOD ${program}` : 'HOD Nursing';
    const blockLabel = isTVET ? 'Current Term:' : 'Current Block:';
    const blockValue = student?.block || student?.term || 'N/A';
    const studentTypeBadge = isTVET ? 
        `<span style="background: #f59e0b; color: #78350f; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: 600; margin-left: 10px;">TVET</span>` :
        `<span style="background: #2563eb; color: white; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: 600; margin-left: 10px;">KRCHN</span>`;
    
    const totalCredits = registrations.reduce((sum, unit) => sum + (unit.credits || 3), 0);
    
    let tableRows = '';
    registrations.forEach((unit, index) => {
        const unitName = unit.unit_name || unit.name || 'N/A';
        const unitCode = unit.unit_code || unit.code || 'N/A';
        const regType = unit.reg_type || 'Supplementary';
        const credits = unit.credits || 3;
        const status = unit.status || 'Approved';
        
        const hasGrade = unit.grade && unit.grade !== '';
        const isPassing = hasGrade && !['FAIL', 'F', 'D', 'E'].includes(unit.grade);
        const gradeDisplay = hasGrade ? (isPassing ? `🟢 ${unit.grade}` : `🔴 ${unit.grade}`) : '⏳ Pending';
        
        tableRows += `
            <tr>
                <td class="text-center">${index + 1}</td>
                <td><strong>${escapeHtml(unitCode)}</strong></td>
                <td>${escapeHtml(unitName)}</td>
                <td class="text-center">${credits}</td>
                <td class="text-center">
                    <span style="background: ${regType === 'Retake' ? '#dc2626' : '#f59e0b'}; color: white; padding: 2px 10px; border-radius: 4px; font-size: 9px; font-weight: 600; display: inline-block;">
                        ${regType}
                    </span>
                </td>
                <td class="text-center">
                    <span style="background: ${status === 'pending' ? '#fef3c7' : '#d1fae5'}; color: ${status === 'pending' ? '#92400e' : '#065f46'}; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 600; display: inline-block;">
                        ${status === 'pending' ? '⏳ Pending' : '✅ Approved'}
                    </span>
                    <br>
                    <span style="font-size: 10px; font-weight: 600; color: ${isPassing ? '#10b981' : '#dc2626'};">${gradeDisplay}</span>
                </td>
                <td class="signature-cell">
                    <div class="signature-line"></div>
                    <span style="font-size: 9px; color: #94a3b8;">Lecturer's Signature</span>
                </td>
            </tr>
        `;
    });
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Supplementary Exam Card - ${escapeHtml(student?.full_name || 'Student')}</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; 
            padding: 40px; 
            background: #f8fafc; 
        }
        .exam-card-wrapper { 
            max-width: 850px; 
            margin: 0 auto; 
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
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
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
            background: #10b981;
            white-space: nowrap; 
        }
        
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
        
        .signature-cell { 
            padding: 5px 0; 
            text-align: center;
            vertical-align: middle;
        }
        .signature-line { 
            width: 90%; 
            margin: 8px auto; 
            border-top: 2px solid #000; 
            height: 2px;
        }
        .signature-cell span {
            display: block;
            margin-top: 2px;
        }
        
        .total-row { 
            background: #f8fafc; 
            font-weight: 600; 
            border-top: 2px solid #cbd5e1; 
        }
        
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
            border-top: 2px solid #000; 
            height: 2px;
            padding-top: 12px; 
        }
        
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
            border-top: 2px solid #000; 
            max-width: 60%; 
            height: 2px;
        }
        
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
            .card-header { 
                background: #1e3a5f !important; 
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact; 
            }
            .status-badge { 
                background: #10b981 !important; 
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
            .exam-card-compact {
                border: 1px solid #000 !important;
                border-radius: 0 !important;
            }
        }
        
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
            .student-sign-line {
                flex-wrap: wrap;
            }
            .student-date {
                margin-left: 0;
                width: 100%;
                text-align: center;
            }
        }
    </style>
</head>
<body>
    <div class="exam-card-wrapper">
        <div class="exam-card-compact">
            <!-- Header -->
            <div class="card-header">
                <img src="https://raw.githubusercontent.com/NCHSMlearning/e-learning/main/images/Logo_NCHSM.png" alt="NCHSM Logo" class="card-logo" onerror="this.style.display='none'">
                <div class="header-text">
                    <div class="institution">NAKURU COLLEGE OF HEALTH SCIENCES AND MANAGEMENT</div>
                    <div class="card-title">
                        SUPPLEMENTARY / RETAKE EXAM CARD
                        ${studentTypeBadge}
                    </div>
                    <div class="card-subtitle">(Exam Entry Permit)</div>
                </div>
                <div class="status-badge">✅ ELIGIBLE</div>
            </div>
            
            <!-- Info Grid -->
            <div class="info-grid">
                <div class="info-item"><span class="info-label">Name:</span> ${escapeHtml(student?.full_name || 'Not Available')}</div>
                <div class="info-item"><span class="info-label">REG NO.:</span> ${escapeHtml(student?.student_id || student?.admission_number || 'N/A')}</div>
                <div class="info-item"><span class="info-label">Program:</span> ${escapeHtml(student?.program || 'N/A')}</div>
                <div class="info-item"><span class="info-label">${blockLabel}</span> <strong>${escapeHtml(blockValue)}</strong></div>
                <div class="info-item"><span class="info-label">Registered Units:</span> <strong>${registrations.length}</strong></div>
                <div class="info-item"><span class="info-label">Total Credits:</span> <strong>${totalCredits}</strong></div>
                <div class="info-item"><span class="info-label">Exam Period:</span> ${new Date().getMonth() >= 2 && new Date().getMonth() <= 5 ? 'March - June (Trimester 1)' : new Date().getMonth() >= 6 && new Date().getMonth() <= 9 ? 'July - October (Trimester 2)' : 'November - February (Trimester 3)'}</div>
                <div class="info-item"><span class="info-label">Date Issued:</span> ${today}</div>
                <div class="info-item"><span class="info-label">Valid Until:</span> End of Exam Period</div>
            </div>
            
            <!-- Units Table -->
            <table class="units-table">
                <thead>
                    <tr>
                        <th width="5%">#</th>
                        <th width="15%">Unit Code</th>
                        <th width="30%">Unit Title</th>
                        <th width="7%">Cr</th>
                        <th width="10%">Type</th>
                        <th width="15%">Status/Grade</th>
                        <th width="18%">Lecturer's Signature</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                    <tr class="total-row">
                        <td colspan="3"><strong>TOTAL REGISTERED UNITS: ${registrations.length}</strong></td>
                        <td class="text-center"><strong>${totalCredits}</strong></td>
                        <td></td>
                        <td></td>
                        <td></td>
                    </tr>
                </tbody>
            </table>
            
            <!-- Signatures -->
            <div class="signatures-row">
                <div class="signature">
                    <div class="sign-line"></div>
                    <div style="font-weight: 600; font-size: 12px;">${hodTitle}</div>
                    <div style="font-size: 9px; color: #94a3b8;">Head of Department</div>
                </div>
                <div class="signature">
                    <div class="sign-line"></div>
                    <div style="font-weight: 600; font-size: 12px;">Principal</div>
                    <div style="font-size: 9px; color: #94a3b8;">NCHSM</div>
                </div>
                <div class="signature">
                    <div class="sign-line"></div>
                    <div style="font-weight: 600; font-size: 12px;">Finance Officer</div>
                    <div style="font-size: 9px; color: #94a3b8;">NCHSM</div>
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
                        <span class="student-date">Date: ${today}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        setTimeout(function() {
            window.print();
        }, 1500);
    <\/script>
</body>
</html>
    `;
}

// ============================================================
// DOWNLOAD SUPPLEMENTARY EXAM CARD
// ============================================================

window.downloadSupplementaryExamCard = async function() {
    console.log('📄 Generating Supplementary Exam Card...');
    
    try {
        const user = window.currentUserProfile || window.userProfile;
        const userId = user?.user_id || user?.id;
        
        if (!userId) {
            alert('User not found. Please login again.');
            return;
        }
        
        const supabase = window.sb || window.supabase;
        if (!supabase) {
            alert('Database not available.');
            return;
        }
        
        // ✅ Get approved supplementary/retake registrations WITHOUT grades
        const { data: registrations, error } = await supabase
            .from('student_unit_registrations')
            .select('*')
            .eq('student_id', userId)
            .in('reg_type', ['Supplementary', 'Retake'])
            .eq('status', 'approved')
            .is('grade', null)
            .order('submitted_date', { ascending: false });
        
        if (error) throw error;
        
        if (!registrations || registrations.length === 0) {
            alert('No approved supplementary units without grades found.\n\nUnits with grades (Pass or Fail) are considered completed.');
            return;
        }
        
        console.log(`✅ Found ${registrations.length} approved supplementary units without grades`);
        
        // Show progress overlay
        const overlay = document.createElement('div');
        overlay.id = 'examCardProgressOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            backdrop-filter: blur(4px);
        `;
        overlay.innerHTML = `
            <div style="background:white;border-radius:16px;padding:30px 40px;max-width:350px;width:90%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
                <div style="margin-bottom:15px;">
                    <div style="width:50px;height:50px;border:4px solid #e2e8f0;border-top-color:#B45309;border-radius:50%;animation:spin 0.6s linear infinite;margin:0 auto;"></div>
                </div>
                <h3 style="color:#0A3D62;font-size:16px;">📄 Generating Exam Card</h3>
                <p style="color:#64748b;font-size:13px;">Found ${registrations.length} unit(s)</p>
                <p style="color:#94a3b8;font-size:12px;">${registrations.map(u => u.unit_code).join(', ')}</p>
            </div>
        `;
        document.body.appendChild(overlay);
        
        // Generate HTML
        const html = generateSupplementaryExamCardHTML(registrations, user);
        
        // Open window
        const win = window.open('', '_blank', 'width=794,height=1123');
        if (!win) {
            overlay.remove();
            alert('Please allow popups to view the exam card.');
            return;
        }
        
        win.document.write(html);
        win.document.close();
        
        setTimeout(() => {
            overlay.remove();
            win.print();
        }, 1500);
        
    } catch (error) {
        console.error('❌ Error:', error);
        alert('Error: ' + error.message);
    }
};

// ============================================================
// UPDATE SUPPLEMENTARY DOWNLOAD BUTTON
// ============================================================

window.updateSupplementaryDownloadButton = async function() {
    try {
        const user = window.currentUserProfile || window.userProfile;
        const userId = user?.user_id || user?.id;
        
        if (!userId) return;
        
        const supabase = window.sb || window.supabase;
        if (!supabase) return;
        
        // ✅ Count approved units WITHOUT grades
        const { data, error } = await supabase
            .from('student_unit_registrations')
            .select('id')
            .eq('student_id', userId)
            .in('reg_type', ['Supplementary', 'Retake'])
            .eq('status', 'approved')
            .is('grade', null);
        
        if (error) throw error;
        
        const count = data?.length || 0;
        const button = document.getElementById('downloadAllSuppExamCardsBtn');
        const badge = document.getElementById('downloadSuppCount');
        
        if (button) {
            button.style.display = 'flex';
            if (badge) badge.textContent = count;
            
            if (count > 0) {
                button.style.opacity = '1';
                button.removeAttribute('disabled');
                button.title = `📥 Download exam card (${count} approved units)`;
                button.onclick = function(e) {
                    e.preventDefault();
                    const btn = this;
                    const originalText = btn.innerHTML;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
                    btn.disabled = true;
                    btn.style.opacity = '0.6';
                    
                    window.downloadSupplementaryExamCard().finally(() => {
                        btn.innerHTML = originalText;
                        btn.disabled = false;
                        btn.style.opacity = '1';
                    });
                };
                console.log(`✅ Download button enabled: ${count} units available`);
            } else {
                button.style.opacity = '0.5';
                button.setAttribute('disabled', 'disabled');
                button.title = '⛔ No approved units without grades available';
                button.onclick = null;
                console.log('⛔ Download button disabled: 0 units available');
            }
        }
    } catch (error) {
        console.error('Error updating download button:', error);
    }
};

// ============================================================
// INITIALIZE ON PAGE LOAD
// ============================================================

setTimeout(() => {
    window.updateSupplementaryDownloadButton();
}, 1500);

console.log('✅ Supplementary Exam Card standalone ready!');
console.log('📌 Click "Download Exam Card" in Supplementary tab');
console.log('📊 Shows ONLY approved units WITHOUT grades');
