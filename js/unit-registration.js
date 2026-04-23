// js/unit-registration.js - Works like courses.js (NO EMOJIS)
(function() {
    'use strict';
    
    console.log('✅ unit-registration.js - Loading with Supabase integration...');
    
    class UnitRegistrationModule {
        constructor() {
            console.log('📚 UnitRegistrationModule initialized');
            
            // Store data
            this.allUnits = [];
            this.registeredUnits = [];
            this.availableUnits = [];
            this.userProfile = null;
            this.loaded = false;
            this.maxUnits = 15;
            
            // User data
            this.programCode = null;
            this.programType = null;
            this.intakeYear = null;
            this.userBlock = null;
            this.userTerm = null;
            this.isTVETStudent = false;
            
            // DOM elements
            this.cacheElements();
            
            // Initialize event listeners
            this.initializeEventListeners();
            
            // Set up login event listeners
            this.setupLoginListeners();
            
            // Try to load if user is already logged in
            setTimeout(() => this.tryLoadIfLoggedIn(), 1500);
        }
        
        setupLoginListeners() {
            document.addEventListener('userLoggedIn', (e) => {
                console.log('🎉 USER LOGGED IN EVENT RECEIVED!');
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
                console.log('🚀 App ready event received');
                this.tryLoadIfLoggedIn();
            });
        }
        
        tryLoadIfLoggedIn() {
            const profile = this.getUserProfileFromAnySource();
            
            if (profile) {
                console.log('✅ User already logged in:', profile.full_name || profile.email);
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
                const programFromProfile = this.userProfile.program || 'KRCHN';
                this.intakeYear = this.userProfile.intake_year || 2025;
                this.programCode = programFromProfile;
                
                // Determine if TVET student
                const tvetPrograms = ['DPOTT', 'DCH', 'DHRIT', 'DSL', 'DSW', 'DCJS', 'DHSS', 'DICT', 'DME',
                                      'CPOTT', 'CCH', 'CHRIT', 'CPC', 'CSL', 'CSW', 'CCJS', 'CAG', 'CHSS', 'CICT',
                                      'ACH', 'AAG', 'ASW', 'CCA', 'PTE'];
                this.isTVETStudent = tvetPrograms.includes(programFromProfile);
                
                // Set block/term
                if (this.isTVETStudent) {
                    this.userTerm = this.userProfile.term || this.userProfile.block || 'Term1';
                    this.userBlock = null;
                } else {
                    this.userBlock = this.userProfile.block || 'A';
                    this.userTerm = null;
                }
                
                console.log('🎯 User data updated:', {
                    program: this.programCode,
                    type: this.isTVETStudent ? 'TVET' : 'KRCHN',
                    intake: this.intakeYear,
                    blockTerm: this.isTVETStudent ? this.userTerm : this.userBlock
                });
                
                return true;
            }
            return false;
        }
        
        cacheElements() {
            this.availableBody = document.getElementById('availableUnitsBody');
            this.registeredBody = document.getElementById('registeredUnitsBody');
            this.selectedCount = document.getElementById('selected-units-count');
            this.approvedCount = document.getElementById('approved-units-count');
            this.pendingCount = document.getElementById('pending-units-count');
            this.maxUnitsSpan = document.getElementById('maxUnitsAllowed');
            this.blockFilter = document.getElementById('BlockFilter');
            this.unitTypeFilter = document.getElementById('UnitTypeFilter');
            this.regType = document.getElementById('RegType');
            this.refreshBtn = document.getElementById('refreshUnitsBtn');
            this.submitBtn = document.getElementById('submitRegistrationBtn');
            this.selectAllCheckbox = document.getElementById('selectAllUnits');
        }
        
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
                    this.submitRegistration();
                });
            }
            
            if (this.selectAllCheckbox) {
                this.selectAllCheckbox.addEventListener('change', () => this.selectAllUnits());
            }
            
            if (this.blockFilter) {
                this.blockFilter.addEventListener('change', () => this.loadAvailableUnits());
            }
            
            if (this.unitTypeFilter) {
                this.unitTypeFilter.addEventListener('change', () => this.loadAvailableUnits());
            }
            
            if (this.regType) {
                this.regType.addEventListener('change', () => this.loadAvailableUnits());
            }
        }
        
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
                
                const approved = this.registeredUnits.filter(u => u.status === 'approved').length;
                const pending = this.registeredUnits.filter(u => u.status === 'pending').length;
                
                if (this.approvedCount) this.approvedCount.textContent = approved;
                if (this.pendingCount) this.pendingCount.textContent = pending;
                
                // Update badge
                const badge = document.getElementById('unitRegBadge');
                if (badge) {
                    if (pending > 0) {
                        badge.textContent = pending;
                        badge.style.display = 'inline-block';
                    } else {
                        badge.style.display = 'none';
                    }
                }
                
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
                    this.availableBody.innerHTML = '<tr><td colspan="8" style="text-align:center">Please select Registration Type first</td></tr>';
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
                    query = query.eq('program', this.programCode);
                }
                
                // Filter by block
                const block = this.blockFilter?.value;
                if (block && block !== "") {
                    query = query.eq('block', block);
                } else if (this.isTVETStudent && this.userTerm) {
                    query = query.eq('block', this.userTerm);
                } else if (!this.isTVETStudent && this.userBlock) {
                    query = query.eq('block', this.userBlock);
                }
                
                // Filter by unit type
                const unitType = this.unitTypeFilter?.value;
                if (unitType && unitType !== "") {
                    query = query.eq('unit_type', unitType);
                }
                
                const { data, error } = await query.order('block', { ascending: true }).order('unit_code', { ascending: true });
                
                if (error) throw error;
                
                this.allUnits = data || [];
                this.displayAvailableUnits();
                
            } catch (error) {
                console.error('Error loading available units:', error);
                if (this.availableBody) {
                    this.availableBody.innerHTML = '<tr><td colspan="8" style="text-align:center">Error loading units</td></tr>';
                }
            }
        }
        
        displayAvailableUnits() {
            if (!this.availableBody) return;
            
            const registeredCodes = new Set(this.registeredUnits.map(u => u.unit_code));
            
            if (this.allUnits.length === 0) {
                this.availableBody.innerHTML = '<tr><td colspan="8" style="text-align:center">No units available for your program</td></tr>';
                return;
            }
            
            let html = '';
            for (const unit of this.allUnits) {
                const isRegistered = registeredCodes.has(unit.unit_code);
                const isPending = this.registeredUnits.some(u => u.unit_code === unit.unit_code && u.status === 'pending');
                
                let statusText = '';
                let statusClass = '';
                
                if (isRegistered) {
                    if (isPending) {
                        statusText = 'Pending';
                        statusClass = 'status-pending';
                    } else {
                        statusText = 'Registered';
                        statusClass = 'status-approved';
                    }
                } else {
                    statusText = 'Available';
                    statusClass = 'status-available';
                }
                
                html += `<tr>
                    <td>${!isRegistered ? `<input type="checkbox" class="unit-checkbox" data-code="${unit.unit_code}">` : '—'}</td>
                    <td><strong>${this.escapeHtml(unit.unit_code)}</strong></td>
                    <td>${this.escapeHtml(unit.unit_name)}</td>
                    <td>${this.escapeHtml(unit.block)}</td>
                    <td><span class="status-badge status-registered">${this.escapeHtml(unit.unit_type || 'Core')}</span></td>
                    <td>${unit.credits || 3}</td>
                    <td>${this.escapeHtml(unit.prerequisites || 'None')}</td>
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
                
                html += `<tr>
                    <td><strong>${this.escapeHtml(unit.unit_code)}</strong></td>
                    <td>${this.escapeHtml(unit.unit_name)}</td>
                    <td>${this.escapeHtml(unit.block)}</td>
                    <td>${this.escapeHtml(unit.reg_type || 'Normal')}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td>${unit.approval_date || '—'}</td>
                    <td>${unit.status === 'pending' ? `<button class="action-btn-drop" onclick="window.dropUnit('${unit.unit_code}')"><i class="fas fa-trash"></i> Drop</button>` : '—'}</td>
                </tr>`;
            }
            
            this.registeredBody.innerHTML = html;
        }
        
        updateSelectedCount() {
            const checkboxes = document.querySelectorAll('.unit-checkbox:checked');
            const count = checkboxes.length;
            if (this.selectedCount) this.selectedCount.textContent = count;
            
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
        
        async submitRegistration() {
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
            
            const currentTotal = this.registeredUnits.filter(u => u.status === 'pending' || u.status === 'approved').length;
            if (selectedCodes.length + currentTotal > this.maxUnits) {
                this.showError(`You can only register up to ${this.maxUnits} units total. You currently have ${currentTotal} units.`, 'warning');
                return;
            }
            
            const confirmResult = await Swal.fire({
                title: 'Confirm Registration',
                text: `Submit ${selectedCodes.length} unit(s) for approval?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Yes, Submit',
                cancelButtonText: 'Cancel'
            });
            
            if (!confirmResult.isConfirmed) return;
            
            Swal.fire({ title: 'Submitting...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
            
            try {
                const supabase = window.db?.supabase;
                const studentId = this.userProfile?.user_id || this.userProfile?.id;
                
                // Get unit details
                const { data: units, error: unitsError } = await supabase
                    .from('units_catalog')
                    .select('*')
                    .in('unit_code', selectedCodes);
                
                if (unitsError) throw unitsError;
                
                const registrations = units.map(unit => ({
                    student_id: studentId,
                    unit_code: unit.unit_code,
                    unit_name: unit.unit_name,
                    program: unit.program,
                    block: unit.block,
                    reg_type: regType,
                    status: 'pending',
                    submitted_date: new Date().toISOString()
                }));
                
                const { error } = await supabase
                    .from('student_unit_registrations')
                    .insert(registrations);
                
                if (error) throw error;
                
                Swal.close();
                Swal.fire('Success', `${registrations.length} unit(s) submitted for approval!`, 'success');
                
                // Clear selections
                document.querySelectorAll('.unit-checkbox:checked').forEach(cb => cb.checked = false);
                
                // Refresh data
                await this.loadUnits();
                
                // Dispatch event to update exam card
                document.dispatchEvent(new CustomEvent('unitRegistrationReady', {
                    detail: { approvedCount: this.registeredUnits.filter(u => u.status === 'approved').length }
                }));
                
            } catch (error) {
                Swal.close();
                console.error('Error submitting registration:', error);
                this.showError(`Failed to submit: ${error.message}`, 'error');
            }
        }
        
        async dropUnit(unitCode) {
            const confirmResult = await Swal.fire({
                title: 'Drop Unit?',
                text: 'Are you sure you want to drop this unit?',
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
                
                const { error } = await supabase
                    .from('student_unit_registrations')
                    .delete()
                    .eq('student_id', studentId)
                    .eq('unit_code', unitCode)
                    .eq('status', 'pending');
                
                if (error) throw error;
                
                Swal.close();
                Swal.fire('Success', 'Unit dropped successfully!', 'success');
                await this.loadUnits();
                
                // Dispatch event to update exam card
                document.dispatchEvent(new CustomEvent('unitRegistrationReady', {
                    detail: { approvedCount: this.registeredUnits.filter(u => u.status === 'approved').length }
                }));
                
            } catch (error) {
                Swal.close();
                console.error('Error dropping unit:', error);
                this.showError(`Failed to drop: ${error.message}`, 'error');
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
            
            if (this.maxUnitsSpan) {
                this.maxUnitsSpan.textContent = this.maxUnits;
            }
        }
        
        async loadBlocks(supabase) {
            try {
                const { data, error } = await supabase
                    .from('units_catalog')
                    .select('block')
                    .eq('status', 'active');
                
                if (error) throw error;
                
                const blocks = [...new Set(data.map(u => u.block))];
                let options = '<option value="">All Blocks</option>';
                blocks.sort().forEach(block => {
                    options += `<option value="${this.escapeHtml(block)}">${this.escapeHtml(block)}</option>`;
                });
                
                if (this.blockFilter) {
                    this.blockFilter.innerHTML = options;
                }
                
            } catch (error) {
                console.error('Error loading blocks:', error);
            }
        }
        
        showLoading() {
            if (this.availableBody) {
                this.availableBody.innerHTML = '<tr class="loading-row"><td colspan="8"><div class="loading-spinner"></div> Loading units...</td></tr>';
            }
            if (this.registeredBody) {
                this.registeredBody.innerHTML = '<tr class="loading-row"><td colspan="7"><div class="loading-spinner"></div> Loading your registered units...</td></tr>';
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
            const container = document.querySelector('#unit-registration');
            if (container && !this.loaded) {
                console.log('Waiting for login to load unit registration');
            }
        }
        
        dispatchModuleReadyEvent() {
            const event = new CustomEvent('unitRegistrationReady', {
                detail: {
                    totalUnits: this.allUnits.length,
                    registeredCount: this.registeredUnits.length,
                    approvedCount: this.registeredUnits.filter(u => u.status === 'approved').length,
                    pendingCount: this.registeredUnits.filter(u => u.status === 'pending').length,
                    maxUnits: this.maxUnits,
                    isTVETStudent: this.isTVETStudent,
                    programCode: this.programCode,
                    intakeYear: this.intakeYear,
                    block: this.userBlock,
                    term: this.userTerm,
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
                block: this.userBlock,
                term: this.userTerm
            };
        }
    }
    
    // Create global instance
    window.unitRegistrationModule = new UnitRegistrationModule();
    
    // Global functions
    window.dropUnit = (unitCode) => window.unitRegistrationModule?.dropUnit(unitCode);
    window.loadUnitRegistration = () => window.unitRegistrationModule?.refresh();
    window.getUnitRegistrationInfo = () => window.unitRegistrationModule?.getStudentProgramInfo() || {};
    
    console.log('✅ Unit Registration module ready!');
})();
