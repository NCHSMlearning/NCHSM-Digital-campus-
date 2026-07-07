// resources.js - Premium Resource Module with Professional Filtering
// SUPPORTS BOTH TVET (Terms) AND KRCHN (Blocks) WITH DYNAMIC PROGRAM DETECTION

class ResourcesModule {
    constructor() {
        // DOM Elements
        this.resourcesGrid = null;
        this.resourcesGridContainer = null;
        this.blockFilter = null;
        this.refreshBtn = null;
        this.searchInput = null;
        this.typeFilter = null;
        this.courseFilter = null;
        this.yearFilter = null;
        this.resourceTypeTabs = null;
        this.resourceCount = null;
        this.programIndicator = null;
        this.filterLabel = null;
        
        // New UI Elements for dynamic display
        this.programNameDisplay = null;
        this.blockTermValue = null;
        this.blockTermDisplay = null;
        this.filterTitle = null;
        this.filterSubtitle = null;
        this.filterInfoText = null;
        this.currentBlockLabel = null;
        this.intakeYearValue = null;
        this.programDisplayBadge = null;
        
        // State variables
        this.allResources = [];
        this.filteredResources = [];
        this.currentBlockFilter = 'all';
        this.currentResourceType = 'all';
        this.currentSearchTerm = '';
        this.currentFileType = 'all';
        this.currentCourse = 'all';
        this.currentYear = 'all';
        this.isLoading = false;
        this.supabaseClient = null;
        
        // Debounce timers
        this.searchDebounceTimer = null;
        this.filterChangeTimer = null;
        
        // Program detection
        this.userProgram = 'krchn'; // 'krchn' or 'tvet'
        this.userProgramDisplay = 'KRCHN Nursing';
        this.userBlock = 'Introductory';
        this.userTerm = 1;
        this.userIntakeYear = 2025;
        this.userId = null;
        this.isTVETStudent = false;
        
        // TVET Program Codes
        this.TVET_PROGRAMS = [
            'DPOTT', 'DCH', 'DHRIT', 'DSL', 'DSW', 'DCJS', 'DHSS', 'DICT', 'DME',
            'CPOTT', 'CCH', 'CHRIT', 'CPC', 'CSL', 'CSW', 'CCJS', 'CAG', 'CHSS', 'CICT',
            'ACH', 'AAG', 'ASW', 'CCA', 'PTE'
        ];
        
        // KRCHN Block Mapping
        this.BLOCK_MAPPING = {
            'all': ['All'],
            'introductory': ['Introductory', 'Intro', 'Foundation', 'Block 0'],
            'block1': ['Block 1', 'Block1', 'B1'],
            'block2': ['Block 2', 'Block2', 'B2'],
            'block3': ['Block 3', 'Block3', 'B3'],
            'block4': ['Block 4', 'Block4', 'B4'],
            'block5': ['Block 5', 'Block5', 'B5'],
            'final': ['Final', 'Final Block', 'Block 6']
        };
        
        // TVET Term Mapping
        this.TERM_MAPPING = {
            'all': ['All'],
            'term1': ['Term 1', 'Term1', 'Trimester 1', 'Semester 1'],
            'term2': ['Term 2', 'Term2', 'Trimester 2', 'Semester 2'],
            'term3': ['Term 3', 'Term3', 'Trimester 3', 'Semester 3'],
            'term4': ['Term 4', 'Term4', 'Trimester 4', 'Semester 4'],
            'term5': ['Term 5', 'Term5', 'Trimester 5', 'Semester 5'],
            'term6': ['Term 6', 'Term6', 'Trimester 6', 'Semester 6'],
            'final': ['Final', 'Final Term', 'Graduating']
        };
        
        // Term number mapping (for integer term columns)
        this.TERM_NUMBER_MAP = {
            'term1': 1,
            'term2': 2,
            'term3': 3,
            'term4': 4,
            'term5': 5,
            'term6': 6,
            'final': 7
        };
        
        this.initializeElements();
    }
    
    // ==================== INITIALIZATION ====================
    initializeElements() {
        // Get DOM elements
        this.resourcesGrid = document.getElementById('student-resources-grid');
        if (!this.resourcesGrid) this.resourcesGrid = document.getElementById('resources-grid');
        
        this.resourcesGridContainer = document.querySelector('.resources-grid-container') || this.resourcesGrid?.parentElement;
        
        this.blockFilter = document.getElementById('student-block-resource-filter');
        this.refreshBtn = document.getElementById('student-refresh-block-resources');
        this.searchInput = document.getElementById('student-resource-search');
        this.typeFilter = document.getElementById('student-resource-type-filter');
        this.courseFilter = document.getElementById('student-course-filter');
        this.yearFilter = document.getElementById('student-year-filter');
        this.resourceCount = document.getElementById('resource-count');
        this.resourceTypeTabs = document.querySelectorAll('.type-tab');
        this.programIndicator = document.getElementById('resource-program-indicator');
        this.filterLabel = document.getElementById('block-filter-label');
        
        // New UI Elements
        this.programNameDisplay = document.getElementById('program-name-display');
        this.blockTermValue = document.getElementById('block-term-value');
        this.blockTermDisplay = document.getElementById('block-term-display');
        this.filterTitle = document.getElementById('filter-title');
        this.filterSubtitle = document.getElementById('filter-subtitle');
        this.filterInfoText = document.getElementById('filter-info-text');
        this.currentBlockLabel = document.getElementById('current-block-label');
        this.intakeYearValue = document.getElementById('intake-year-value');
        this.programDisplayBadge = document.getElementById('program-display-badge');
        this.studentCurrentBlock = document.getElementById('student-current-user-block');
        
        // Setup event listeners
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // ============================================
        // PROFESSIONAL FILTERING - MATCHING AWAY EXAM
        // ============================================
        
        // 1. SEARCH WITH DEBOUNCE
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => {
                clearTimeout(this.searchDebounceTimer);
                this.searchDebounceTimer = setTimeout(() => {
                    this.currentSearchTerm = this.searchInput.value.trim();
                    this.applyFilters();
                }, 300);
            });
            
            this.searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.searchInput.value = '';
                    this.currentSearchTerm = '';
                    this.applyFilters();
                }
            });
        }
        
        // 2. FILTER CHANGES WITH DEBOUNCE
        const filterElements = [this.typeFilter, this.courseFilter, this.yearFilter, this.blockFilter];
        filterElements.forEach(filter => {
            if (filter) {
                filter.addEventListener('change', () => {
                    clearTimeout(this.filterChangeTimer);
                    this.filterChangeTimer = setTimeout(() => {
                        this.updateFilterStates();
                        this.applyFilters();
                    }, 100);
                });
            }
        });
        
        // 3. TYPE TABS
        if (this.resourceTypeTabs) {
            this.resourceTypeTabs.forEach(tab => {
                tab.addEventListener('click', (e) => {
                    e.preventDefault();
                    const type = tab.getAttribute('data-type') || 'all';
                    this.filterResourcesByType(type);
                });
            });
        }
        
        // 4. REFRESH BUTTON
        if (this.refreshBtn) {
            const newRefreshBtn = this.refreshBtn.cloneNode(true);
            this.refreshBtn.parentNode.replaceChild(newRefreshBtn, this.refreshBtn);
            this.refreshBtn = newRefreshBtn;
            this.refreshBtn.addEventListener('click', () => {
                if (this.isLoading) return;
                this.showSkeletonCards(6);
                this.loadResources();
            });
        }
        
        // 5. Listen for program changes
        document.addEventListener('nurseiqProgramChanged', (e) => {
            if (e.detail) {
                this.userProgram = e.detail.isTVET ? 'tvet' : 'krchn';
                this.isTVETStudent = e.detail.isTVET || false;
                this.userProgramDisplay = e.detail.displayName || 'KRCHN Nursing';
                this.updateUIForProgram();
                this.updateBlockFilterOptions();
                this.loadResources();
            }
        });
    }
    
    // ==================== PROGRAM DETECTION ====================
    detectUserProgram() {
        console.log('🔍 Detecting user program for resources...');
        let profile = null;
        
        // Try to get profile from various sources
        if (window.currentUserProfile) profile = window.currentUserProfile;
        else if (window.db?.currentUserProfile) profile = window.db.currentUserProfile;
        else if (window.userProfile) profile = window.userProfile;
        else if (window.profileModule?.userProfile) profile = window.profileModule.userProfile;
        
        if (!profile) {
            try {
                const savedProfile = localStorage.getItem('userProfile');
                if (savedProfile) profile = JSON.parse(savedProfile);
            } catch (e) {}
        }
        
        if (profile) {
            console.log('📊 User profile data for resources:', profile);
            
            // Get userId
            this.userId = profile.user_id || profile.id || (window.getCurrentUserId ? window.getCurrentUserId() : null);
            
            // Get program
            const programCode = String(profile.program || profile.course || '').toUpperCase().trim();
            
            if (this.TVET_PROGRAMS.includes(programCode)) {
                this.userProgram = 'tvet';
                this.isTVETStudent = true;
                this.userProgramDisplay = window.PROGRAM_DISPLAY_NAMES?.[programCode] || programCode || 'TVET Program';
                this.userTerm = profile.term || 1;
                this.userBlock = null;
                console.log(`✅ Detected TVET: ${programCode} - ${this.userProgramDisplay}, Term: ${this.userTerm}`);
            } else if (programCode === 'KRCHN' || programCode.includes('NURSING')) {
                this.userProgram = 'krchn';
                this.isTVETStudent = false;
                this.userProgramDisplay = 'KRCHN Nursing';
                this.userBlock = profile.block || 'Introductory';
                this.userTerm = null;
                console.log(`✅ Detected KRCHN Nursing, Block: ${this.userBlock}`);
            } else {
                // Default to KRCHN
                this.userProgram = 'krchn';
                this.isTVETStudent = false;
                this.userProgramDisplay = 'KRCHN Nursing';
                this.userBlock = profile.block || 'Introductory';
                this.userTerm = null;
                console.log('⚠️ Defaulting to KRCHN Nursing');
            }
            
            // Get intake year
            this.userIntakeYear = profile.intake_year || profile.intake || 2025;
            
            console.log(`📋 User: ${this.userProgramDisplay}, ${this.isTVETStudent ? 'Term' : 'Block'}: ${this.isTVETStudent ? this.userTerm : this.userBlock}, Intake: ${this.userIntakeYear}`);
            
            // Update UI
            this.updateUIForProgram();
            this.updateBlockFilterOptions();
            this.updateBlockDisplay();
            
            return this.userProgram;
        }
        
        // Fallback: try to detect from URL or localStorage
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('mode') === 'tvet' || urlParams.get('program') === 'tvet') {
            this.userProgram = 'tvet';
            this.isTVETStudent = true;
            this.userProgramDisplay = 'TVET Program';
            this.userTerm = 1;
            this.userBlock = null;
            this.updateUIForProgram();
            this.updateBlockFilterOptions();
            this.updateBlockDisplay();
            return 'tvet';
        }
        
        const storedMode = localStorage.getItem('nurseiq_program_mode');
        if (storedMode === 'tvet') {
            this.userProgram = 'tvet';
            this.isTVETStudent = true;
            this.userProgramDisplay = 'TVET (Stored)';
            this.userTerm = 1;
            this.userBlock = null;
            this.updateUIForProgram();
            this.updateBlockFilterOptions();
            this.updateBlockDisplay();
            return 'tvet';
        }
        
        console.log('⚠️ No program detected, defaulting to KRCHN');
        this.userProgram = 'krchn';
        this.isTVETStudent = false;
        this.userProgramDisplay = 'KRCHN Nursing (Default)';
        this.userBlock = 'Introductory';
        this.userTerm = null;
        this.updateUIForProgram();
        this.updateBlockFilterOptions();
        this.updateBlockDisplay();
        return 'krchn';
    }
    
    // ==================== UPDATE UI FOR PROGRAM ====================
    updateUIForProgram() {
        const isTVET = this.isTVETStudent || this.userProgram === 'tvet';
        
        console.log(`🔄 Updating UI for: ${isTVET ? 'TVET' : 'KRCHN'}`);
        
        // 1. Update program badge
        if (this.programDisplayBadge) {
            if (isTVET) {
                this.programDisplayBadge.style.background = '#1a7a5a';
                this.programDisplayBadge.innerHTML = `<i class="fas fa-tools"></i> <span id="program-name-display">${this.userProgramDisplay || 'TVET Program'}</span>`;
            } else {
                this.programDisplayBadge.style.background = '#4C1D95';
                this.programDisplayBadge.innerHTML = `<i class="fas fa-graduation-cap"></i> <span id="program-name-display">${this.userProgramDisplay || 'KRCHN Nursing'}</span>`;
            }
        }
        
        // 2. Update program name display
        if (this.programNameDisplay) {
            this.programNameDisplay.textContent = this.userProgramDisplay || (isTVET ? 'TVET Program' : 'KRCHN Nursing');
        }
        
        // 3. Update block/term display
        if (this.blockTermDisplay && this.blockTermValue) {
            if (isTVET) {
                const termNumber = this.userTerm || 1;
                this.blockTermDisplay.style.background = '#fef3c7';
                this.blockTermDisplay.style.color = '#78350f';
                this.blockTermDisplay.innerHTML = `<i class="fas fa-calendar-alt"></i> <span id="block-term-value">Term ${termNumber}</span>`;
                this.blockTermValue.textContent = `Term ${termNumber}`;
            } else {
                const blockName = this.userBlock || 'Introductory';
                this.blockTermDisplay.style.background = '#dbeafe';
                this.blockTermDisplay.style.color = '#1e40af';
                this.blockTermDisplay.innerHTML = `<i class="fas fa-layer-group"></i> <span id="block-term-value">${blockName}</span>`;
                this.blockTermValue.textContent = blockName;
            }
        }
        
        // 4. Update filter title and labels
        if (this.filterTitle) {
            this.filterTitle.textContent = isTVET ? 'Filter by Term' : 'Filter by Block';
        }
        if (this.filterSubtitle) {
            this.filterSubtitle.textContent = isTVET ? 'Select academic term to view materials' : 'Select academic block to view materials';
        }
        if (this.filterInfoText) {
            this.filterInfoText.textContent = isTVET ? 'Select a term and click Refresh to load materials' : 'Select a block and click Refresh to load materials';
        }
        if (this.currentBlockLabel) {
            this.currentBlockLabel.textContent = isTVET ? 'Your Term: ' : 'Your Block: ';
        }
        
        // 5. Update intake year
        if (this.intakeYearValue) {
            this.intakeYearValue.textContent = this.userIntakeYear || 2026;
        }
        
        console.log(`✅ UI updated for ${isTVET ? 'TVET' : 'KRCHN'}`);
    }
    
    // ==================== UPDATE BLOCK DISPLAY ====================
    updateBlockDisplay() {
        const blockDisplay = this.studentCurrentBlock || document.getElementById('student-current-user-block');
        if (!blockDisplay) return;
        
        const isTVET = this.isTVETStudent || this.userProgram === 'tvet';
        
        if (isTVET) {
            const termNumber = this.userTerm || 1;
            blockDisplay.textContent = `Term ${termNumber}`;
        } else {
            const blockName = this.userBlock || 'Introductory';
            blockDisplay.textContent = blockName;
        }
        
        console.log('✅ Block display updated to:', blockDisplay.textContent);
    }
    
    // ==================== DYNAMIC BLOCK/TERM FILTER ====================
    updateBlockFilterOptions() {
        if (!this.blockFilter) return;
        
        const isTVET = this.isTVETStudent || this.userProgram === 'tvet';
        
        // Clear existing options
        this.blockFilter.innerHTML = '';
        
        // Add "All" option
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = isTVET ? '📚 All Terms' : '📚 All Blocks';
        this.blockFilter.appendChild(allOption);
        
        if (isTVET) {
            // TVET Terms
            const terms = [
                { value: 'term1', label: '📘 Term 1' },
                { value: 'term2', label: '📗 Term 2' },
                { value: 'term3', label: '📕 Term 3' },
                { value: 'term4', label: '📙 Term 4' },
                { value: 'term5', label: '📒 Term 5' },
                { value: 'term6', label: '📓 Term 6' },
                { value: 'final', label: '🏆 Final Term' }
            ];
            
            terms.forEach(term => {
                const option = document.createElement('option');
                option.value = term.value;
                option.textContent = term.label;
                this.blockFilter.appendChild(option);
            });
            
            // Auto-select user's term if available
            if (this.userTerm) {
                const termKey = this.getTermKeyFromNumber(this.userTerm);
                if (termKey) {
                    this.blockFilter.value = termKey;
                    this.currentBlockFilter = termKey;
                }
            }
            
            console.log('✅ Updated filter to TVET Terms');
            
        } else {
            // KRCHN Blocks
            const blocks = [
                { value: 'introductory', label: '🚀 Introductory' },
                { value: 'block1', label: '📖 Block 1' },
                { value: 'block2', label: '📗 Block 2' },
                { value: 'block3', label: '📘 Block 3' },
                { value: 'block4', label: '📙 Block 4' },
                { value: 'block5', label: '📕 Block 5' },
                { value: 'final', label: '🏆 Final Block' }
            ];
            
            blocks.forEach(block => {
                const option = document.createElement('option');
                option.value = block.value;
                option.textContent = block.label;
                this.blockFilter.appendChild(option);
            });
            
            // Auto-select user's block if available
            if (this.userBlock) {
                const userBlockLower = this.userBlock.toLowerCase();
                for (const [key, keywords] of Object.entries(this.BLOCK_MAPPING)) {
                    if (keywords.some(k => userBlockLower.includes(k.toLowerCase()))) {
                        this.blockFilter.value = key;
                        this.currentBlockFilter = key;
                        break;
                    }
                }
            }
            
            console.log('✅ Updated filter to KRCHN Blocks');
        }
        
        // Store the current filter value
        this.currentBlockFilter = this.blockFilter.value || 'all';
    }
    
    // ==================== HELPER FUNCTIONS ====================
    getTermKeyFromNumber(termNumber) {
        const map = {
            1: 'term1',
            2: 'term2',
            3: 'term3',
            4: 'term4',
            5: 'term5',
            6: 'term6',
            7: 'final'
        };
        return map[termNumber] || null;
    }
    
    getTermNumberFromKey(termKey) {
        return this.TERM_NUMBER_MAP[termKey] || null;
    }
    
    // ==================== FILTER STATE MANAGEMENT ====================
    updateFilterStates() {
        this.currentBlockFilter = this.blockFilter?.value || 'all';
        this.currentFileType = this.typeFilter?.value || 'all';
        this.currentCourse = this.courseFilter?.value || 'all';
        this.currentYear = this.yearFilter?.value || 'all';
    }
    
    // ==================== SUPABASE CLIENT ====================
    getSupabaseClient() {
        if (this.supabaseClient) return this.supabaseClient;
        
        if (window.NCHSMLogin && window.NCHSMLogin.supabase) {
            this.supabaseClient = window.NCHSMLogin.supabase;
            console.log('✅ Resources: Using existing connection from login');
            return this.supabaseClient;
        }
        
        if (window.db && window.db.supabase && typeof window.db.supabase.from === 'function') {
            this.supabaseClient = window.db.supabase;
            console.log('✅ Resources: Using existing connection from db');
            return this.supabaseClient;
        }
        
        if (window.supabase && typeof window.supabase.from === 'function') {
            this.supabaseClient = window.supabase;
            if (!window.db) window.db = {};
            window.db.supabase = this.supabaseClient;
            console.log('✅ Resources: Using global window.supabase');
            return this.supabaseClient;
        }
        
        console.error('❌ Cannot initialize Supabase client');
        return null;
    }
    
    // ==================== USER PROFILE ====================
    async getUserProfile() {
        if (window.currentUserProfile?.program) {
            console.log('📋 Using cached user profile:', window.currentUserProfile);
            return window.currentUserProfile;
        }
        
        const supabase = this.getSupabaseClient();
        if (!supabase) return {};
        
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.warn('No authenticated user found');
                return {};
            }
            
            console.log('🔍 Fetching profile for user:', user.id);
            this.userId = user.id;
            
            let { data: profile, error } = await supabase
                .from('consolidated_user_profiles_table')
                .select('program, intake_year, block, full_name, role, student_id, term, program_type')
                .eq('user_id', user.id)
                .maybeSingle();
            
            if (error) {
                console.warn('Error fetching from consolidated_user_profiles_table:', error);
            }
            
            if (profile) {
                console.log('✅ Profile found:', profile);
                const correctProfile = {
                    program: profile.program,
                    intake_year: profile.intake_year,
                    block: profile.block,
                    full_name: profile.full_name,
                    role: profile.role,
                    student_id: profile.student_id,
                    term: profile.term,
                    program_type: profile.program_type
                };
                window.currentUserProfile = correctProfile;
                if (window.db) window.db.currentUserProfile = correctProfile;
                return correctProfile;
            }
            
            // Fallback
            const { data: fallbackProfile, error: fallbackError } = await supabase
                .from('profiles')
                .select('program, intake_year, block, full_name, role, student_id')
                .eq('id', user.id)
                .maybeSingle();
            
            if (fallbackProfile) {
                console.log('✅ Profile found in fallback table:', fallbackProfile);
                const correctProfile = {
                    program: fallbackProfile.program,
                    intake_year: fallbackProfile.intake_year,
                    block: fallbackProfile.block,
                    full_name: fallbackProfile.full_name,
                    role: fallbackProfile.role,
                    student_id: fallbackProfile.student_id
                };
                window.currentUserProfile = correctProfile;
                if (window.db) window.db.currentUserProfile = correctProfile;
                return correctProfile;
            }
            
            console.warn('No profile found for user');
            return {};
            
        } catch (err) {
            console.error('Error loading profile:', err);
            return {};
        }
    }
    
    // ==================== LOADING STATES ====================
    showSkeletonCards(count = 6) {
        if (!this.resourcesGrid) return;
        
        let skeletonHtml = '';
        for (let i = 0; i < count; i++) {
            skeletonHtml += `
                <div class="resource-card skeleton">
                    <div class="resource-preview">
                        <div class="preview-icon skeleton-shimmer"></div>
                        <div class="skeleton-badge"></div>
                    </div>
                    <div class="resource-details">
                        <div class="skeleton-title"></div>
                        <div class="skeleton-text"></div>
                        <div class="skeleton-text short"></div>
                        <div class="skeleton-meta">
                            <div class="skeleton-tag"></div>
                            <div class="skeleton-tag"></div>
                        </div>
                    </div>
                    <div class="resource-actions">
                        <div class="skeleton-button"></div>
                    </div>
                </div>
            `;
        }
        
        this.resourcesGrid.innerHTML = skeletonHtml;
        this.addSkeletonStyles();
    }
    
    addSkeletonStyles() {
        if (document.getElementById('skeleton-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'skeleton-styles';
        styles.textContent = `
            .skeleton-shimmer {
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                background-size: 200% 100%;
                animation: shimmer 1.5s infinite;
            }
            @keyframes shimmer {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }
            .skeleton-title {
                height: 20px;
                width: 70%;
                background: #e5e7eb;
                border-radius: 8px;
                margin-bottom: 12px;
            }
            .skeleton-text {
                height: 14px;
                width: 100%;
                background: #e5e7eb;
                border-radius: 6px;
                margin-bottom: 8px;
            }
            .skeleton-text.short {
                width: 60%;
            }
            .skeleton-meta {
                display: flex;
                gap: 8px;
                margin-top: 12px;
            }
            .skeleton-tag {
                height: 24px;
                width: 70px;
                background: #e5e7eb;
                border-radius: 20px;
            }
            .skeleton-button {
                height: 40px;
                width: 100%;
                background: #e5e7eb;
                border-radius: 40px;
            }
            .skeleton-badge {
                position: absolute;
                top: 12px;
                right: 12px;
                width: 80px;
                height: 24px;
                background: #e5e7eb;
                border-radius: 20px;
            }
            .resource-card.skeleton {
                pointer-events: none;
                opacity: 0.7;
            }
        `;
        document.head.appendChild(styles);
    }
    
    showError(message, showRetry = true) {
        if (!this.resourcesGrid) return;
        
        this.resourcesGrid.innerHTML = `
            <div class="error-state-premium">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Unable to Load Resources</h3>
                <p>${message}</p>
                ${showRetry ? '<button onclick="window.resourcesModule?.retryLoad()" class="premium-btn"><i class="fas fa-sync-alt"></i> Retry</button>' : ''}
            </div>
        `;
        
        this.showToast(message, 'error');
    }
    
    showEmptyState() {
        if (!this.resourcesGrid) return;
        
        const searchTerm = this.currentSearchTerm || '';
        const hasFilters = this.currentBlockFilter !== 'all' || 
                          this.currentFileType !== 'all' || 
                          this.currentCourse !== 'all' || 
                          this.currentYear !== 'all';
        
        const isTVET = this.isTVETStudent || this.userProgram === 'tvet';
        const filterType = isTVET ? 'term' : 'block';
        
        let emptyMessage = 'No resources match your current filters.';
        let subMessage = 'Try adjusting your search or filter criteria.';
        
        if (this.currentResourceType === 'pastpaper') {
            emptyMessage = `No past papers available for your ${isTVET ? 'TVET' : 'KRCHN'} program.`;
            subMessage = 'Check back later or contact admin for assistance.';
        } else if (this.currentResourceType === 'material') {
            emptyMessage = `No learning materials available for your ${isTVET ? 'TVET' : 'KRCHN'} program.`;
            subMessage = 'New materials may be added soon.';
        } else if (searchTerm && hasFilters) {
            emptyMessage = `No resources found matching "${searchTerm}" and selected filters.`;
            subMessage = 'Try clearing your search or filters.';
        } else if (searchTerm) {
            emptyMessage = `No resources found matching "${searchTerm}".`;
            subMessage = 'Try a different search term.';
        } else if (hasFilters) {
            emptyMessage = `No resources match your selected ${filterType} or filters.`;
            subMessage = 'Try adjusting your filter selections.';
        }
        
        this.resourcesGrid.innerHTML = `
            <div class="empty-state-premium">
                <i class="fas fa-folder-open"></i>
                <h3>${emptyMessage}</h3>
                <p>${subMessage}</p>
                <button onclick="window.resourcesModule?.resetFilters()" class="premium-btn">
                    <i class="fas fa-eye"></i> Reset Filters
                </button>
            </div>
        `;
    }
    
    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = message;
            toast.style.display = 'block';
            toast.style.backgroundColor = type === 'error' ? '#dc2626' : type === 'success' ? '#10b981' : '#3b82f6';
            toast.style.color = 'white';
            toast.style.padding = '12px 20px';
            toast.style.borderRadius = '8px';
            toast.style.position = 'fixed';
            toast.style.bottom = '20px';
            toast.style.right = '20px';
            toast.style.zIndex = '1000';
            setTimeout(() => {
                toast.style.display = 'none';
            }, 3000);
        } else {
            console.log(message);
        }
    }
    
    // ==================== RESOURCE LOADING ====================
    async loadResources() {
        if (this.isLoading) return;
        
        console.log('📁 Loading resources...');
        
        // Detect program first
        this.detectUserProgram();
        
        const userProfile = await this.getUserProfile();
        const supabase = this.getSupabaseClient();
        
        if (!supabase) {
            this.showError('Database connection error');
            return;
        }
        
        if (!this.resourcesGrid) return;
        
        this.isLoading = true;
        this.showSkeletonCards(6);
        
        try {
            let program = userProfile?.program || this.userProgramDisplay;
            let intakeYear = userProfile?.intake_year || this.userIntakeYear;
            
            // Determine program type for filtering
            const isTVET = this.isTVETStudent || this.userProgram === 'tvet';
            const filterValue = isTVET ? this.userTerm : this.userBlock;
            
            console.log(`📊 Fetching resources for: ${program} (${isTVET ? 'TVET' : 'KRCHN'}) - ${isTVET ? 'Term' : 'Block'}: ${filterValue} - ${intakeYear}`);
            
            // Build query - filter by program type and intake
            let query = supabase
                .from('resources')
                .select('*')
                .eq('intake', String(intakeYear))
                .order('created_at', { ascending: false });
            
            // If TVET, filter by TVET program types
            if (isTVET) {
                const tvetPrograms = this.TVET_PROGRAMS;
                query = query.in('program_type', tvetPrograms);
                
                // Filter by term number (integer)
                if (this.userTerm) {
                    query = query.eq('term', this.userTerm);
                }
            } else {
                // For KRCHN, filter by KRCHN program type
                query = query.eq('program_type', 'KRCHN');
                
                // Filter by block (text)
                if (this.userBlock && this.userBlock !== 'General') {
                    const blockPattern = this.userBlock.toLowerCase();
                    query = query.or(`block.ilike.%${blockPattern}%, block_term.ilike.%${blockPattern}%`);
                }
            }
            
            const { data: resources, error } = await query;
            
            if (error) throw error;
            
            this.allResources = resources || [];
            console.log(`✅ Loaded ${this.allResources.length} resources for ${isTVET ? 'TVET' : 'KRCHN'}`);
            
            // Update past paper count badge
            this.updatePastPaperCount();
            
            // Populate filters
            this.populateFilters();
            
            // Apply filters and render
            this.filterResources();
            
            // Update dashboard count
            this.updateDashboardResourceCount();
            
        } catch (err) {
            console.error('Error loading resources:', err);
            this.showError(err.message);
        } finally {
            this.isLoading = false;
        }
    }
    
    // ==================== FILTER RESOURCES ====================
    filterResources() {
        if (!this.allResources.length) {
            this.showEmptyState();
            return;
        }
        
        let filtered = [...this.allResources];
        
        // Filter by resource type
        if (this.currentResourceType !== 'all') {
            filtered = filtered.filter(r => r.resource_type === this.currentResourceType);
        }
        
        // Filter by block/term - use appropriate mapping
        const isTVET = this.isTVETStudent || this.userProgram === 'tvet';
        const mapping = isTVET ? this.TERM_MAPPING : this.BLOCK_MAPPING;
        
        if (this.currentBlockFilter !== 'all') {
            const targetKeywords = mapping[this.currentBlockFilter] || [];
            const termNumber = isTVET ? this.getTermNumberFromKey(this.currentBlockFilter) : null;
            
            filtered = filtered.filter(resource => {
                // For TVET, check term number (integer) or term text
                if (isTVET && termNumber !== null) {
                    // Check if resource has term number matching
                    if (resource.term === termNumber) {
                        return true;
                    }
                    // Also check text fields for term keywords
                    const resourceTerm = (resource.term_text || resource.term_name || resource.block_term || '').toString().toLowerCase();
                    return targetKeywords.some(keyword => resourceTerm.includes(keyword.toLowerCase()));
                }
                
                // For KRCHN, check block text
                const resourceBlock = (resource.block || resource.block_term || '').toString().toLowerCase();
                return targetKeywords.some(keyword => resourceBlock.includes(keyword.toLowerCase()));
            });
        }
        
        // Filter by search term
        const searchTerm = this.currentSearchTerm.toLowerCase();
        if (searchTerm) {
            filtered = filtered.filter(r => {
                const titleMatch = (r.title || '').toLowerCase().includes(searchTerm);
                const courseMatch = (r.course_name || '').toLowerCase().includes(searchTerm);
                const descMatch = (r.description || '').toLowerCase().includes(searchTerm);
                const blockMatch = (r.block || r.term || '').toString().toLowerCase().includes(searchTerm);
                return titleMatch || courseMatch || descMatch || blockMatch;
            });
        }
        
        // Filter by file type
        const fileTypeFilter = this.currentFileType;
        if (fileTypeFilter !== 'all') {
            filtered = filtered.filter(r => this.getFileType(r.file_path) === fileTypeFilter);
        }
        
        // Filter by course
        if (this.currentCourse !== 'all') {
            filtered = filtered.filter(r => (r.course_name || r.program_type) === this.currentCourse);
        }
        
        // Filter by year
        if (this.currentYear !== 'all') {
            if (this.currentResourceType === 'pastpaper') {
                filtered = filtered.filter(r => r.pastpaper_year == this.currentYear);
            } else {
                filtered = filtered.filter(r => r.intake == this.currentYear);
            }
        }
        
        this.filteredResources = filtered;
        this.renderResources();
        this.updateResourceCount();
    }
    
    // ==================== RENDER RESOURCES ====================
    renderResources() {
        if (!this.resourcesGrid) return;
        
        if (this.filteredResources.length === 0) {
            this.showEmptyState();
            return;
        }
        
        const isTVET = this.isTVETStudent || this.userProgram === 'tvet';
        
        let html = '';
        for (const resource of this.filteredResources) {
            const isPastPaper = resource.resource_type === 'pastpaper';
            const isResourceTVET = this.TVET_PROGRAMS.includes(resource.program_type || '');
            
            const typeBadge = isPastPaper ? 
                '<span class="pastpaper-badge"><i class="fas fa-history"></i> Past Paper</span>' : 
                '<span class="material-badge"><i class="fas fa-book"></i> Material</span>';
            
            const programBadge = isResourceTVET ?
                `<span class="tvet-badge"><i class="fas fa-tools"></i> TVET</span>` :
                `<span class="krchn-badge"><i class="fas fa-graduation-cap"></i> KRCHN</span>`;
            
            const yearDisplay = isPastPaper ? resource.pastpaper_year : resource.intake;
            const examTypeDisplay = isPastPaper && resource.exam_type ? this.getExamTypeLabel(resource.exam_type) : '';
            const courseDisplay = resource.course_name ? `<small class="course-name">📚 ${this.escapeHtml(resource.course_name)}</small>` : '';
            
            // Show either block or term based on program
            const blockOrTerm = resource.block || resource.term || resource.block_term || 'General';
            const blockOrTermLabel = isResourceTVET ? 'Term' : 'Block';
            
            html += `
                <div class="resource-card" data-id="${resource.id}">
                    <div class="resource-preview">
                        <div class="preview-icon ${this.getFileType(resource.file_path)}">
                            <i class="${this.getFileIcon(resource.file_path)}"></i>
                        </div>
                        ${typeBadge}
                        ${programBadge}
                    </div>
                    <div class="resource-details">
                        <h3 class="resource-title">${this.escapeHtml(resource.title)}${courseDisplay ? '<br>' + courseDisplay : ''}</h3>
                        <p class="resource-description">${this.escapeHtml(resource.description || 'No description available')}</p>
                        <div class="resource-meta">
                            <span class="meta-tag year-tag">
                                <i class="fas fa-calendar"></i> ${this.escapeHtml(yearDisplay || 'N/A')}
                            </span>
                            ${examTypeDisplay ? `<span class="meta-tag exam-type-tag">
                                <i class="fas fa-file-alt"></i> ${examTypeDisplay}
                            </span>` : ''}
                            <span class="meta-tag block-tag ${this.getBlockTagClass(blockOrTerm, isResourceTVET)}">
                                <i class="fas ${this.getBlockIcon(blockOrTerm, isResourceTVET)}"></i> 
                                ${blockOrTermLabel}: ${this.escapeHtml(blockOrTerm)}
                            </span>
                            <span class="meta-tag read-only-badge">
                                <i class="fas fa-eye"></i> Read Only
                            </span>
                        </div>
                    </div>
                    <div class="resource-actions">
                        <button class="action-btn view-btn" onclick="resourcesModule.openResource(${resource.id})">
                            <i class="fas fa-eye"></i> Read Now
                        </button>
                    </div>
                </div>
            `;
        }
        
        this.resourcesGrid.innerHTML = html;
        
        // Add staggered animation
        const cards = this.resourcesGrid.querySelectorAll('.resource-card');
        cards.forEach((card, index) => {
            card.style.animation = `fadeInUp 0.4s ease forwards ${index * 0.05}s`;
        });
    }
    
    updateResourceCount() {
        const countEl = document.getElementById('resource-count-display') || this.resourceCount;
        if (countEl) {
            countEl.textContent = `${this.filteredResources.length} resources`;
        }
    }
    
    // ==================== HELPER FUNCTIONS ====================
    populateFilters() {
        // Populate course filter
        if (this.courseFilter) {
            const courses = [...new Set(this.allResources.map(r => r.course_name || r.program_type).filter(Boolean))];
            this.courseFilter.innerHTML = '<option value="all">All Courses</option>';
            courses.sort().forEach(course => {
                const option = document.createElement('option');
                option.value = course;
                option.textContent = course;
                this.courseFilter.appendChild(option);
            });
        }
        
        // Populate year filter
        if (this.yearFilter) {
            const years = [...new Set(this.allResources.map(r => r.intake || r.pastpaper_year).filter(Boolean))];
            this.yearFilter.innerHTML = '<option value="all">All Years</option>';
            years.sort((a, b) => b - a).forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                this.yearFilter.appendChild(option);
            });
        }
    }
    
    updatePastPaperCount() {
        const pastpaperCount = this.allResources.filter(r => r.resource_type === 'pastpaper').length;
        const badge = document.getElementById('student-pastpaper-count');
        if (badge) badge.textContent = pastpaperCount;
    }
    
    updateDashboardResourceCount() {
        const totalResources = this.allResources.length;
        const dashboardResourcesEl = document.getElementById('dashboard-new-resources');
        if (dashboardResourcesEl) {
            dashboardResourcesEl.innerText = totalResources;
        }
        
        if (window.dashboardModule && window.dashboardModule.metrics) {
            window.dashboardModule.metrics.resources = totalResources;
            if (window.dashboardModule.updateUIFromMetrics) {
                window.dashboardModule.updateUIFromMetrics();
            }
        }
    }
    
    filterResourcesByType(type) {
        this.currentResourceType = type;
        
        const buttons = document.querySelectorAll('.type-tab');
        buttons.forEach(btn => {
            const btnType = btn.getAttribute('data-type');
            if (btnType === type) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        if (this.searchInput) this.searchInput.value = '';
        this.currentSearchTerm = '';
        if (this.typeFilter) this.typeFilter.value = 'all';
        if (this.yearFilter) this.yearFilter.value = 'all';
        
        this.filterResources();
    }
    
    resetFilters() {
        if (this.blockFilter) this.blockFilter.value = 'all';
        if (this.searchInput) this.searchInput.value = '';
        this.currentSearchTerm = '';
        if (this.typeFilter) this.typeFilter.value = 'all';
        if (this.courseFilter) this.courseFilter.value = 'all';
        if (this.yearFilter) this.yearFilter.value = 'all';
        
        this.currentBlockFilter = 'all';
        this.currentResourceType = 'all';
        this.currentFileType = 'all';
        this.currentCourse = 'all';
        this.currentYear = 'all';
        
        const buttons = document.querySelectorAll('.type-tab');
        buttons.forEach(btn => {
            if (btn.getAttribute('data-type') === 'all') {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        this.filterResources();
    }
    
    retryLoad() {
        this.loadResources();
    }
    
    // ==================== UTILITY FUNCTIONS ====================
    getFileType(filePath) {
        if (!filePath) return 'unknown';
        const ext = filePath.split('.').pop().toLowerCase();
        if (ext === 'pdf') return 'pdf';
        if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)) return 'image';
        if (['mp4', 'avi', 'mov', 'wmv', 'webm'].includes(ext)) return 'video';
        return 'file';
    }
    
    getFileIcon(filePath) {
        const type = this.getFileType(filePath);
        const icons = { pdf: 'fa-file-pdf', image: 'fa-file-image', video: 'fa-file-video' };
        return `fas ${icons[type] || 'fa-file-alt'}`;
    }
    
    getExamTypeLabel(examType) {
        const labels = {
            'CAT_1': 'CAT 1',
            'CAT_2': 'CAT 2',
            'CAT': 'CAT',
            'END_TERM': 'End of Term',
            'FINAL': 'Final Exam',
            'SUPPLEMENTARY': 'Supplementary',
            'SPECIAL': 'Special Exam'
        };
        return labels[examType] || examType;
    }
    
    getBlockTagClass(blockOrTerm, isTVET = false) {
        if (!blockOrTerm) return 'tag-general';
        const b = String(blockOrTerm).toLowerCase();
        
        if (isTVET) {
            // TVET Terms
            if (b.includes('term 1') || b.includes('trimester 1') || b.includes('semester 1') || b === '1') return 'tag-block1';
            if (b.includes('term 2') || b.includes('trimester 2') || b.includes('semester 2') || b === '2') return 'tag-block2';
            if (b.includes('term 3') || b.includes('trimester 3') || b.includes('semester 3') || b === '3') return 'tag-block3';
            if (b.includes('term 4') || b.includes('trimester 4') || b.includes('semester 4') || b === '4') return 'tag-block4';
            if (b.includes('term 5') || b.includes('trimester 5') || b.includes('semester 5') || b === '5') return 'tag-block5';
            if (b.includes('term 6') || b.includes('trimester 6') || b.includes('semester 6') || b === '6') return 'tag-block5';
            if (b.includes('final') || b.includes('graduating') || b === '7') return 'tag-final';
            return 'tag-general';
        }
        
        // KRCHN Blocks
        if (b.includes('intro')) return 'tag-intro';
        if (b.includes('block 1') || b.includes('block1') || b === '1') return 'tag-block1';
        if (b.includes('block 2') || b.includes('block2') || b === '2') return 'tag-block2';
        if (b.includes('block 3') || b.includes('block3') || b === '3') return 'tag-block3';
        if (b.includes('block 4') || b.includes('block4') || b === '4') return 'tag-block4';
        if (b.includes('block 5') || b.includes('block5') || b === '5') return 'tag-block5';
        if (b.includes('final') || b.includes('graduating') || b === '6') return 'tag-final';
        return 'tag-general';
    }
    
    getBlockIcon(blockOrTerm, isTVET = false) {
        if (!blockOrTerm) return 'fa-layer-group';
        const b = String(blockOrTerm).toLowerCase();
        
        if (isTVET) {
            // TVET Terms
            if (b.includes('term 1') || b.includes('trimester 1') || b === '1') return 'fa-flag-checkered';
            if (b.includes('term 2') || b.includes('trimester 2') || b === '2') return 'fa-book';
            if (b.includes('term 3') || b.includes('trimester 3') || b === '3') return 'fa-book-open';
            if (b.includes('term 4') || b.includes('trimester 4') || b === '4') return 'fa-chalkboard-user';
            if (b.includes('term 5') || b.includes('trimester 5') || b === '5') return 'fa-stethoscope';
            if (b.includes('term 6') || b.includes('trimester 6') || b === '6') return 'fa-user-nurse';
            if (b.includes('final') || b.includes('graduating') || b === '7') return 'fa-graduation-cap';
            return 'fa-layer-group';
        }
        
        // KRCHN Blocks
        if (b.includes('intro')) return 'fa-flag-checkered';
        if (b.includes('block 1') || b.includes('block1') || b === '1') return 'fa-book';
        if (b.includes('block 2') || b.includes('block2') || b === '2') return 'fa-book-open';
        if (b.includes('block 3') || b.includes('block3') || b === '3') return 'fa-chalkboard-user';
        if (b.includes('block 4') || b.includes('block4') || b === '4') return 'fa-stethoscope';
        if (b.includes('block 5') || b.includes('block5') || b === '5') return 'fa-user-nurse';
        if (b.includes('final')) return 'fa-graduation-cap';
        return 'fa-layer-group';
    }
    
    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
    
    // ==================== RESOURCE OPENING ====================
    async openResource(resourceId) {
        const resource = this.allResources.find(r => r.id == resourceId);
        
        if (!resource) {
            this.showToast('Resource not found', 'error');
            return;
        }
        
        this.currentResource = resource;
        const fileType = this.getFileType(resource.file_path);
        
        if (fileType === 'pdf') {
            await this.openPDFInModal(resource);
        } else if (fileType === 'image') {
            this.openImageInModal(resource);
        } else if (fileType === 'video') {
            this.openVideoInModal(resource);
        } else {
            window.open(resource.file_url, '_blank');
        }
    }
    
    // ==================== PDF VIEWER ====================
    async openPDFInModal(resource) {
        try {
            await this.initializePDFJS();
            this.createPDFViewerModal(resource);
            await this.loadPDFInModal(resource.file_url);
        } catch (error) {
            console.error('PDF error:', error);
            this.showToast('Failed to load PDF: ' + error.message, 'error');
        }
    }
    
    async initializePDFJS() {
        if (this.pdfjsLoaded) return true;
        
        return new Promise((resolve, reject) => {
            if (typeof window.pdfjsLib !== 'undefined' && window.pdfjsLib) {
                this.pdfjsLib = window.pdfjsLib;
                if (this.pdfjsLib.GlobalWorkerOptions) {
                    this.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                }
                this.pdfjsLoaded = true;
                console.log('✅ PDF.js already loaded');
                resolve(true);
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.onload = () => {
                this.pdfjsLib = window.pdfjsLib;
                if (this.pdfjsLib && this.pdfjsLib.GlobalWorkerOptions) {
                    this.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                }
                this.pdfjsLoaded = true;
                resolve(true);
            };
            script.onerror = () => reject(new Error('Failed to load PDF.js'));
            document.head.appendChild(script);
        });
    }
    
    createPDFViewerModal(resource) {
        const existingModal = document.getElementById('pdf-viewer-modal');
        if (existingModal) existingModal.remove();
        
        const modal = document.createElement('div');
        modal.id = 'pdf-viewer-modal';
        modal.className = 'pdf-viewer-modal';
        modal.innerHTML = `
            <div class="pdf-modal-container">
                <div class="pdf-modal-header">
                    <div class="pdf-modal-title">
                        <i class="fas fa-file-pdf"></i>
                        <span>${this.escapeHtml(resource.title)}</span>
                    </div>
                    <div class="pdf-modal-actions">
                        <button class="pdf-modal-btn close-pdf-modal" title="Close"><i class="fas fa-times"></i></button>
                    </div>
                </div>
                <div class="pdf-modal-body">
                    <div id="pdf-loading-modal" class="pdf-loading-modal">
                        <div class="loading-spinner"></div>
                        <p>Loading document...</p>
                    </div>
                    <div id="pdf-error-modal" class="pdf-error-modal" style="display: none;">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>Failed to Load Document</h3>
                        <p id="pdf-error-message-modal"></p>
                        <button id="retry-pdf-modal" class="btn-primary">Retry</button>
                    </div>
                    <div id="pdf-viewer-modal-area" class="pdf-viewer-modal-area" style="display: none;">
                        <canvas id="pdf-canvas-modal" class="pdf-canvas-modal"></canvas>
                    </div>
                </div>
                <div class="pdf-modal-footer">
                    <div class="pdf-nav-controls">
                        <button class="pdf-nav-btn" id="pdf-prev-modal"><i class="fas fa-chevron-left"></i></button>
                        <span class="pdf-page-info">
                            <input type="number" id="pdf-page-modal" value="1" min="1"> / <span id="pdf-total-modal">1</span>
                        </span>
                        <button class="pdf-nav-btn" id="pdf-next-modal"><i class="fas fa-chevron-right"></i></button>
                    </div>
                    <div class="pdf-protected-badge">
                        <i class="fas fa-lock"></i> Read Only - No Download
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.addPDFModalStyles();
        this.setupPDFModalEvents();
        modal.style.display = 'flex';
    }
    
    addPDFModalStyles() {
        if (document.getElementById('pdf-modal-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'pdf-modal-styles';
        styles.textContent = `
            .pdf-viewer-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.95);
                display: none;
                justify-content: center;
                align-items: center;
                z-index: 100000;
            }
            .pdf-modal-container {
                width: 95%;
                height: 90%;
                background: #1a1a2e;
                border-radius: 16px;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                box-shadow: 0 20px 40px rgba(0,0,0,0.5);
            }
            .pdf-modal-header {
                padding: 12px 20px;
                background: linear-gradient(135deg, #16213e, #1a1a2e);
                border-bottom: 1px solid rgba(255,255,255,0.1);
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-shrink: 0;
            }
            .pdf-modal-title {
                display: flex;
                align-items: center;
                gap: 10px;
                color: white;
                font-weight: 500;
                font-size: 14px;
            }
            .pdf-modal-title i {
                color: #ef4444;
            }
            .pdf-modal-actions {
                display: flex;
                gap: 10px;
            }
            .pdf-modal-btn {
                background: rgba(255,255,255,0.1);
                border: none;
                color: white;
                width: 36px;
                height: 36px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 16px;
            }
            .pdf-modal-btn:hover {
                background: #4C1D95;
            }
            .pdf-modal-body {
                flex: 1;
                overflow: auto;
                background: #2d2d3a;
                position: relative;
            }
            .pdf-viewer-modal-area {
                display: flex;
                justify-content: center;
                padding: 20px;
                min-height: 100%;
                align-items: flex-start;
            }
            .pdf-canvas-modal {
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                background: white;
                border-radius: 4px;
                max-width: 100%;
                height: auto;
            }
            .pdf-modal-footer {
                padding: 12px 20px;
                background: linear-gradient(135deg, #16213e, #1a1a2e);
                border-top: 1px solid rgba(255,255,255,0.1);
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-shrink: 0;
            }
            .pdf-nav-controls {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .pdf-nav-btn {
                background: rgba(255,255,255,0.1);
                border: none;
                color: white;
                width: 36px;
                height: 36px;
                border-radius: 6px;
                cursor: pointer;
            }
            .pdf-nav-btn:hover {
                background: #4C1D95;
            }
            .pdf-page-info {
                display: flex;
                align-items: center;
                gap: 8px;
                color: white;
                font-size: 14px;
            }
            #pdf-page-modal {
                width: 50px;
                padding: 6px;
                border-radius: 6px;
                border: none;
                text-align: center;
                background: rgba(255,255,255,0.1);
                color: white;
                font-size: 14px;
            }
            .pdf-protected-badge {
                background: rgba(76,29,149,0.3);
                padding: 6px 12px;
                border-radius: 20px;
                color: #a78bfa;
                font-size: 12px;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .loading-spinner {
                width: 40px;
                height: 40px;
                border: 3px solid rgba(255,255,255,0.2);
                border-top-color: #4C1D95;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 15px;
            }
            .pdf-loading-modal, .pdf-error-modal {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100%;
                color: white;
                padding: 20px;
            }
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            @keyframes fadeInUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(styles);
    }
    
    setupPDFModalEvents() {
        const modal = document.getElementById('pdf-viewer-modal');
        const closeBtn = document.querySelector('.close-pdf-modal');
        const prevBtn = document.getElementById('pdf-prev-modal');
        const nextBtn = document.getElementById('pdf-next-modal');
        const pageInput = document.getElementById('pdf-page-modal');
        
        if (closeBtn) closeBtn.onclick = () => { modal.style.display = 'none'; this.cleanupPDFModal(); };
        if (modal) modal.onclick = (e) => { if (e.target === modal) { modal.style.display = 'none'; this.cleanupPDFModal(); } };
        if (prevBtn) prevBtn.onclick = () => this.goToPDFPage(this.currentPDFPage - 1);
        if (nextBtn) nextBtn.onclick = () => this.goToPDFPage(this.currentPDFPage + 1);
        if (pageInput) {
            pageInput.addEventListener('change', () => {
                const page = parseInt(pageInput.value);
                if (page >= 1 && page <= this.totalPDFPages) this.goToPDFPage(page);
            });
        }
    }
    
    async loadPDFInModal(pdfUrl) {
        try {
            const loadingDiv = document.getElementById('pdf-loading-modal');
            const errorDiv = document.getElementById('pdf-error-modal');
            const viewerDiv = document.getElementById('pdf-viewer-modal-area');
            
            if (loadingDiv) loadingDiv.style.display = 'flex';
            if (errorDiv) errorDiv.style.display = 'none';
            if (viewerDiv) viewerDiv.style.display = 'none';
            
            const loadingTask = this.pdfjsLib.getDocument({
                url: pdfUrl,
                cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
                cMapPacked: true,
                verbosity: 0
            });
            
            this.currentPDFDoc = await loadingTask.promise;
            this.totalPDFPages = this.currentPDFDoc.numPages;
            
            const totalSpan = document.getElementById('pdf-total-modal');
            const pageInput = document.getElementById('pdf-page-modal');
            if (totalSpan) totalSpan.textContent = this.totalPDFPages;
            if (pageInput) pageInput.max = this.totalPDFPages;
            
            if (loadingDiv) loadingDiv.style.display = 'none';
            if (viewerDiv) viewerDiv.style.display = 'flex';
            
            await this.renderPDFPage(1);
            
        } catch (error) {
            console.error('PDF loading error:', error);
            const loadingDiv = document.getElementById('pdf-loading-modal');
            const errorDiv = document.getElementById('pdf-error-modal');
            const errorMsg = document.getElementById('pdf-error-message-modal');
            const retryBtn = document.getElementById('retry-pdf-modal');
            
            if (loadingDiv) loadingDiv.style.display = 'none';
            if (errorDiv) errorDiv.style.display = 'flex';
            if (errorMsg) errorMsg.textContent = error.message;
            if (retryBtn) retryBtn.onclick = () => this.loadPDFInModal(pdfUrl);
        }
    }
    
    async renderPDFPage(pageNum) {
        if (!this.currentPDFDoc || pageNum < 1 || pageNum > this.totalPDFPages) return;
        if (this.pageRendering) { this.pageNumPending = pageNum; return; }
        this.pageRendering = true;
        
        try {
            const page = await this.currentPDFDoc.getPage(pageNum);
            const canvas = document.getElementById('pdf-canvas-modal');
            if (!canvas) { this.pageRendering = false; return; }
            const ctx = canvas.getContext('2d', { alpha: false });
            
            const viewerArea = document.getElementById('pdf-viewer-modal-area');
            const containerWidth = viewerArea ? viewerArea.clientWidth - 40 : window.innerWidth - 40;
            const maxWidth = Math.min(containerWidth, 1200);
            
            const viewport = page.getViewport({ scale: 1 });
            const scale = Math.min((maxWidth / viewport.width), 1.5);
            const scaledViewport = page.getViewport({ scale: scale });
            
            const dpr = window.devicePixelRatio || 1;
            const effectiveDPR = Math.min(dpr, 2);
            
            canvas.width = scaledViewport.width * effectiveDPR;
            canvas.height = scaledViewport.height * effectiveDPR;
            canvas.style.width = scaledViewport.width + 'px';
            canvas.style.height = scaledViewport.height + 'px';
            
            ctx.setTransform(effectiveDPR, 0, 0, effectiveDPR, 0, 0);
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            const renderContext = {
                canvasContext: ctx,
                viewport: scaledViewport,
                background: 'white'
            };
            
            await page.render(renderContext).promise;
            
            this.currentPDFPage = pageNum;
            const pageInput = document.getElementById('pdf-page-modal');
            if (pageInput) pageInput.value = pageNum;
            
        } catch (error) {
            console.error('Render error:', error);
        }
        
        this.pageRendering = false;
        if (this.pageNumPending !== null) {
            this.renderPDFPage(this.pageNumPending);
            this.pageNumPending = null;
        }
    }
    
    goToPDFPage(pageNum) {
        if (pageNum < 1) pageNum = 1;
        if (pageNum > this.totalPDFPages) pageNum = this.totalPDFPages;
        this.renderPDFPage(pageNum);
    }
    
    cleanupPDFModal() {
        if (this.currentPDFDoc) {
            this.currentPDFDoc.destroy();
            this.currentPDFDoc = null;
        }
        this.currentPDFPage = 1;
        this.totalPDFPages = 0;
        this.pageRendering = false;
        this.pageNumPending = null;
    }
    
    // ==================== IMAGE/VIDEO VIEWER ====================
    openImageInModal(resource) {
        const modal = document.createElement('div');
        modal.className = 'image-viewer-modal';
        modal.innerHTML = `
            <div class="image-modal-container">
                <div class="image-modal-header">
                    <span>${this.escapeHtml(resource.title)}</span>
                    <button class="close-image-modal"><i class="fas fa-times"></i></button>
                </div>
                <div class="image-modal-body">
                    <img src="${resource.file_url}" alt="${this.escapeHtml(resource.title)}">
                </div>
                <div class="image-modal-footer">
                    <i class="fas fa-lock"></i> Protected Image - No Download
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.style.display = 'flex';
        modal.querySelector('.close-image-modal').onclick = () => modal.remove();
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    }
    
    openVideoInModal(resource) {
        const modal = document.createElement('div');
        modal.className = 'video-viewer-modal';
        modal.innerHTML = `
            <div class="video-modal-container">
                <div class="video-modal-header">
                    <span>${this.escapeHtml(resource.title)}</span>
                    <button class="close-video-modal"><i class="fas fa-times"></i></button>
                </div>
                <div class="video-modal-body">
                    <video controls controlslist="nodownload" disablepictureinpicture>
                        <source src="${resource.file_url}" type="video/mp4">
                        Your browser does not support video playback.
                    </video>
                </div>
                <div class="video-modal-footer">
                    <i class="fas fa-lock"></i> Protected Video - No Download
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.style.display = 'flex';
        modal.querySelector('.close-video-modal').onclick = () => modal.remove();
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    }
    
    // ==================== INITIALIZATION ====================
    async initialize() {
        console.log('📁 Initializing Student Resources Module (TVET Terms + KRCHN Blocks)...');
        
        let attempts = 0;
        const maxAttempts = 30;
        
        // First, detect program
        this.detectUserProgram();
        
        // Try to get user profile
        const userProfile = await this.getUserProfile();
        
        const checkAndInit = async () => {
            attempts++;
            
            const hasDb = window.db && window.db.supabase;
            const hasUserProfile = window.currentUserProfile && window.currentUserProfile.program;
            
            if (hasDb && hasUserProfile) {
                console.log('✅ Database and user ready, loading resources...');
                await this.loadResources();
            } else if (userProfile && userProfile.program) {
                console.log('✅ User profile found via direct fetch, loading resources...');
                await this.loadResources();
            } else if (attempts < maxAttempts) {
                console.log(`⏳ Waiting for user profile... (attempt ${attempts}/${maxAttempts})`);
                setTimeout(checkAndInit, 500);
            } else {
                console.error('❌ Timeout waiting for user profile');
                if (this.resourcesGrid) {
                    this.resourcesGrid.innerHTML = `
                        <div class="error-state-premium">
                            <i class="fas fa-user-slash"></i>
                            <h3>Unable to Load Profile</h3>
                            <p>Please refresh the page or contact support if the issue persists.</p>
                            <button onclick="location.reload()" class="premium-btn">
                                <i class="fas fa-sync-alt"></i> Refresh Page
                            </button>
                        </div>
                    `;
                }
            }
        };
        
        // Also try to get from window.db.loadUserProfile if available
        if (window.db && typeof window.db.loadUserProfile === 'function' && !window.currentUserProfile) {
            try {
                await window.db.loadUserProfile();
            } catch (e) {
                console.warn('Could not load user profile via db:', e);
            }
        }
        
        checkAndInit();
    }
}

// ==================== GLOBAL INSTANCE ====================
let resourcesModule = null;

function initResourcesModule() {
    if (!document.getElementById('student-resources-grid') && !document.getElementById('resources-grid')) {
        console.log('Resources grid not found, skipping initialization');
        return null;
    }
    
    if (resourcesModule) {
        return resourcesModule;
    }
    
    try {
        resourcesModule = new ResourcesModule();
        resourcesModule.initialize();
        window.resourcesModule = resourcesModule;
        return resourcesModule;
    } catch (error) {
        console.error('Resources init error:', error);
        return null;
    }
}

// Make functions globally available
window.filterStudentResourceType = (type) => {
    if (resourcesModule) {
        resourcesModule.filterResourcesByType(type);
    }
};

window.openResourceInline = (id) => {
    if (resourcesModule) {
        resourcesModule.openResource(id);
    }
};

window.resetResourceFilters = () => {
    if (resourcesModule) {
        resourcesModule.resetFilters();
    }
};

// ==================== AUTO-INITIALIZATION ====================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => initResourcesModule(), 500);
    });
} else {
    setTimeout(() => initResourcesModule(), 500);
}

document.addEventListener('appReady', () => {
    setTimeout(() => initResourcesModule(), 300);
});

console.log('✅ Resources module loaded - TVET (Terms) + KRCHN (Blocks) with professional filtering!');
