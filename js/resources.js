// ============================================================
// RESOURCES MODULE WITH LMS INTEGRATION
// ============================================================

class ResourcesModule {
    constructor() {
        // ===== DOM Elements =====
        this.resourcesGrid = document.getElementById('student-resources-grid');
        this.blockFilter = document.getElementById('student-block-resource-filter');
        this.refreshBtn = document.getElementById('student-refresh-block-resources');
        this.searchInput = document.getElementById('student-resource-search');
        this.typeFilter = document.getElementById('student-resource-type-filter');
        this.courseFilter = document.getElementById('student-course-filter');
        this.yearFilter = document.getElementById('student-year-filter');
        this.resourceTypeTabs = document.querySelectorAll('.type-tab');
        this.resourceCount = document.getElementById('resource-count-display');
        
        // UI Elements
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
        this.pastpaperCount = document.getElementById('student-pastpaper-count');
        
        // ===== State =====
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
        
        // ===== Program Detection =====
        this.userProgram = 'krchn';
        this.userProgramDisplay = 'KRCHN Nursing';
        this.userProgramCode = 'KRCHN';
        this.userBlock = 'Introductory';
        this.userTerm = 1;
        this.userIntakeYear = 2025;
        this.userId = null;
        this.isTVETStudent = false;
        this.userProfile = null;
        
        // ===== TVET Program Codes =====
        this.TVET_PROGRAMS = [
            'DPOTT', 'DCH', 'DHRIT', 'DSL', 'DSW', 'DCJS', 'DHSS', 'DICT', 'DME',
            'CPOTT', 'CCH', 'CHRIT', 'CPC', 'CSL', 'CSW', 'CCJS', 'CAG', 'CHSS', 'CICT',
            'ACH', 'AAG', 'ASW', 'CCA', 'PTE'
        ];
        
        // ===== Block/Term Mapping =====
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
        
        this.TERM_MAPPING = {
            'all': ['All'],
            'term1': ['Term 1', 'Term1', 'Trimester 1', 'Semester 1', '1'],
            'term2': ['Term 2', 'Term2', 'Trimester 2', 'Semester 2', '2'],
            'term3': ['Term 3', 'Term3', 'Trimester 3', 'Semester 3', '3'],
            'term4': ['Term 4', 'Term4', 'Trimester 4', 'Semester 4', '4'],
            'term5': ['Term 5', 'Term5', 'Trimester 5', 'Semester 5', '5'],
            'term6': ['Term 6', 'Term6', 'Trimester 6', 'Semester 6', '6'],
            'final': ['Final', 'Final Term', 'Graduating', '7']
        };
        
        this.TERM_NUMBER_MAP = {
            'term1': 1,
            'term2': 2,
            'term3': 3,
            'term4': 4,
            'term5': 5,
            'term6': 6,
            'final': 7
        };
        
        // ===== LMS Properties =====
        this.lmsEnabled = true;
        this.courses = [];
        this.modules = [];
        this.lessons = [];
        this.quizzes = [];
        this.assignments = [];
        this.discussions = [];
        this.courseProgress = {};
        this.completedLessons = new Set();
        this.quizResults = {};
        this.earnedBadges = [];
        this.currentCourseId = null;
        this.currentModuleId = null;
        this.currentLessonId = null;
        
        // ===== PDF Viewer =====
        this.pdfjsLib = null;
        this.pdfjsLoaded = false;
        this.currentPDFDoc = null;
        this.currentPDFPage = 1;
        this.totalPDFPages = 0;
        this.pdfScale = 1.5;
        this.isRendering = false;
        this.pageNumPending = null;
        this.currentResource = null;
        this.isFullscreen = false;
        
        // Debounce timers
        this.searchDebounceTimer = null;
        this.filterChangeTimer = null;
        
        this.initializeElements();
    }
    
    // ============================================================
    // INITIALIZATION
    // ============================================================
    initializeElements() {
        console.log('📁 Initializing Student Resources Module with LMS...');
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Detect user program
        this.detectUserProgram();
        
        // Load resources
        this.loadResources();
        
        // Initialize LMS
        this.initializeLMS();
    }
    
    setupEventListeners() {
        // Search with debounce
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
        
        // Filter changes
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
        
        // Type tabs
        if (this.resourceTypeTabs) {
            this.resourceTypeTabs.forEach(tab => {
                tab.addEventListener('click', (e) => {
                    e.preventDefault();
                    const type = tab.getAttribute('data-type') || 'all';
                    this.filterResourcesByType(type);
                });
            });
        }
        
        // Refresh button
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
        
        // Program change event
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
    
    // ============================================================
    // PROGRAM DETECTION
    // ============================================================
    detectUserProgram() {
        console.log('🔍 Detecting user program...');
        
        let profile = null;
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
            this.userProfile = profile;
            this.userId = profile.user_id || profile.id || null;
            const programCode = String(profile.program || profile.course || '').toUpperCase().trim();
            
            if (this.TVET_PROGRAMS.includes(programCode)) {
                this.userProgram = 'tvet';
                this.isTVETStudent = true;
                this.userProgramDisplay = window.PROGRAM_DISPLAY_NAMES?.[programCode] || programCode || 'TVET Program';
                this.userProgramCode = programCode;
                this.userBlock = profile.block || 'Term1';
                this.userTerm = null;
                console.log(`✅ TVET Student: ${programCode}`);
            } else {
                this.userProgram = 'krchn';
                this.isTVETStudent = false;
                this.userProgramDisplay = 'KRCHN Nursing';
                this.userProgramCode = 'KRCHN';
                this.userBlock = profile.block || 'Introductory';
                this.userTerm = null;
                console.log(`✅ KRCHN Student: ${programCode}, Block: ${this.userBlock}`);
            }
            
            this.userIntakeYear = profile.intake_year || profile.intake || 2025;
            
            this.updateUIForProgram();
            this.updateBlockFilterOptions();
            this.updateBlockDisplay();
            return this.userProgram;
        }
        
        // Default fallback
        this.userProgram = 'krchn';
        this.isTVETStudent = false;
        this.userProgramDisplay = 'KRCHN Nursing';
        this.userProgramCode = 'KRCHN';
        this.userBlock = 'Introductory';
        this.userTerm = null;
        this.userIntakeYear = 2025;
        
        this.updateUIForProgram();
        this.updateBlockFilterOptions();
        this.updateBlockDisplay();
        return 'krchn';
    }
    
    async getUserProfile() {
        if (this.userProfile) return this.userProfile;
        if (window.currentUserProfile) return window.currentUserProfile;
        
        const supabase = this.getSupabaseClient();
        if (!supabase) return {};
        
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return {};
            this.userId = user.id;
            
            const { data: profile, error } = await supabase
                .from('consolidated_user_profiles_table')
                .select('program, intake_year, block, full_name, role, student_id, term, program_type')
                .eq('user_id', user.id)
                .maybeSingle();
            
            if (profile) {
                this.userProfile = profile;
                window.currentUserProfile = profile;
                if (window.db) window.db.currentUserProfile = profile;
                this.detectUserProgram();
                return profile;
            }
            return {};
        } catch (err) {
            console.error('Error loading profile:', err);
            return {};
        }
    }
    
    getSupabaseClient() {
        if (this.supabaseClient) return this.supabaseClient;
        
        if (window.NCHSMLogin && window.NCHSMLogin.supabase) {
            this.supabaseClient = window.NCHSMLogin.supabase;
            return this.supabaseClient;
        }
        if (window.db && window.db.supabase && typeof window.db.supabase.from === 'function') {
            this.supabaseClient = window.db.supabase;
            return this.supabaseClient;
        }
        if (window.supabase && typeof window.supabase.from === 'function') {
            this.supabaseClient = window.supabase;
            if (!window.db) window.db = {};
            window.db.supabase = this.supabaseClient;
            return this.supabaseClient;
        }
        return null;
    }
    
    // ============================================================
    // UI UPDATES
    // ============================================================
    updateUIForProgram() {
        const isTVET = this.isTVETStudent || this.userProgram === 'tvet';
        
        // Update program badge
        if (this.programDisplayBadge) {
            if (isTVET) {
                this.programDisplayBadge.style.background = '#1a7a5a';
                this.programDisplayBadge.innerHTML = `<i class="fas fa-tools"></i> <span id="program-name-display">${this.userProgramDisplay || 'TVET Program'}</span>`;
            } else {
                this.programDisplayBadge.style.background = '#4C1D95';
                this.programDisplayBadge.innerHTML = `<i class="fas fa-graduation-cap"></i> <span id="program-name-display">${this.userProgramDisplay || 'KRCHN Nursing'}</span>`;
            }
        }
        
        if (this.programNameDisplay) {
            this.programNameDisplay.textContent = this.userProgramDisplay || (isTVET ? 'TVET Program' : 'KRCHN Nursing');
        }
        
        // Update block/term display
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
        
        // Update filter labels
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
        if (this.intakeYearValue) {
            this.intakeYearValue.textContent = this.userIntakeYear || 2026;
        }
    }
    
    updateBlockDisplay() {
        if (!this.studentCurrentBlock) return;
        const isTVET = this.isTVETStudent || this.userProgram === 'tvet';
        
        if (isTVET) {
            this.studentCurrentBlock.textContent = `Term ${this.userTerm || 1}`;
        } else {
            this.studentCurrentBlock.textContent = this.userBlock || 'Introductory';
        }
    }
    
    updateBlockFilterOptions() {
        if (!this.blockFilter) return;
        const isTVET = this.isTVETStudent || this.userProgram === 'tvet';
        
        this.blockFilter.innerHTML = '';
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = isTVET ? '📚 All Terms' : '📚 All Blocks';
        this.blockFilter.appendChild(allOption);
        
        if (isTVET) {
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
            
            if (this.userTerm) {
                const termKey = this.getTermKeyFromNumber(this.userTerm);
                if (termKey) {
                    this.blockFilter.value = termKey;
                    this.currentBlockFilter = termKey;
                }
            }
        } else {
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
        }
        this.currentBlockFilter = this.blockFilter.value || 'all';
    }
    
    getTermKeyFromNumber(termNumber) {
        const map = { 1: 'term1', 2: 'term2', 3: 'term3', 4: 'term4', 5: 'term5', 6: 'term6', 7: 'final' };
        return map[termNumber] || null;
    }
    
    getTermNumberFromKey(termKey) {
        return this.TERM_NUMBER_MAP[termKey] || null;
    }
    
    updateFilterStates() {
        this.currentBlockFilter = this.blockFilter?.value || 'all';
        this.currentFileType = this.typeFilter?.value || 'all';
        this.currentCourse = this.courseFilter?.value || 'all';
        this.currentYear = this.yearFilter?.value || 'all';
    }
    
   async loadResources() {
    if (this.isLoading) return;
    this.detectUserProgram();
    if (!this.userProfile) await this.getUserProfile();
    
    const supabase = this.getSupabaseClient();
    if (!supabase) {
        this.showError('Database connection error');
        return;
    }
    if (!this.resourcesGrid) return;
    
    this.isLoading = true;
    this.showSkeletonCards(6);
    
    try {
        const isTVET = this.isTVETStudent || this.userProgram === 'tvet';
        const intakeYear = this.userIntakeYear || 2025;
        
        let query = supabase
            .from('resources')
            .select('*')
            .eq('intake', String(intakeYear))
            .order('created_at', { ascending: false });
        
        if (isTVET) {
            const studentProgram = this.userProfile?.program || '';
            if (studentProgram && this.TVET_PROGRAMS.includes(studentProgram)) {
                query = query.eq('program_type', studentProgram);
            } else {
                query = query.in('program_type', this.TVET_PROGRAMS);
            }
        } else {
            query = query.eq('program_type', 'KRCHN');
            if (this.userBlock && this.userBlock !== 'General') {
                const blockPattern = this.userBlock.toLowerCase();
                query = query.or(`block.ilike.%${blockPattern}%, block_term.ilike.%${blockPattern}%`);
            }
        }
        
        const { data: resources, error } = await query;
        if (error) throw error;
        
        this.allResources = resources || [];
        console.log(`✅ Loaded ${this.allResources.length} resources`);
        
        this.updatePastPaperCount();
        this.populateFilters();
        this.applyFilters();
        this.updateDashboardResourceCount();
        
        // ✅ Load LMS courses
        await this.loadCourses();
        
    } catch (err) {
        console.error('Error loading resources:', err);
        this.showError(err.message);
    } finally {
        this.isLoading = false;
    }
}
    
    // ============================================================
    // FILTERS & RENDERING
    // ============================================================
    applyFilters() {
        if (!this.allResources.length) {
            this.showEmptyState();
            return;
        }
        
        let filtered = [...this.allResources];
        const isTVET = this.isTVETStudent || this.userProgram === 'tvet';
        
        // Filter by type (tab)
        if (this.currentResourceType !== 'all') {
            filtered = filtered.filter(r => r.resource_type === this.currentResourceType);
        }
        
        // Filter by block/term
        if (this.currentBlockFilter !== 'all') {
            const mapping = isTVET ? this.TERM_MAPPING : this.BLOCK_MAPPING;
            const targetKeywords = mapping[this.currentBlockFilter] || [];
            const termNumber = isTVET ? this.getTermNumberFromKey(this.currentBlockFilter) : null;
            
            filtered = filtered.filter(resource => {
                if (isTVET && termNumber !== null) {
                    if (resource.term === termNumber) return true;
                    const resourceTerm = (resource.term_text || resource.term_name || resource.block_term || '').toString().toLowerCase();
                    return targetKeywords.some(keyword => resourceTerm.includes(keyword.toLowerCase()));
                }
                const resourceBlock = (resource.block || resource.block_term || '').toString().toLowerCase();
                return targetKeywords.some(keyword => resourceBlock.includes(keyword.toLowerCase()));
            });
        }
        
        // Search
        const searchTerm = this.currentSearchTerm.toLowerCase();
        if (searchTerm) {
            filtered = filtered.filter(r => {
                const title = (r.title || '').toLowerCase();
                const course = (r.course_name || '').toLowerCase();
                const desc = (r.description || '').toLowerCase();
                const block = (r.block || r.term || '').toString().toLowerCase();
                return title.includes(searchTerm) || course.includes(searchTerm) || 
                       desc.includes(searchTerm) || block.includes(searchTerm);
            });
        }
        
        // File type
        if (this.currentFileType !== 'all') {
            filtered = filtered.filter(r => this.getFileType(r.file_path) === this.currentFileType);
        }
        
        // Course
        if (this.currentCourse !== 'all') {
            filtered = filtered.filter(r => (r.course_name || r.program_type) === this.currentCourse);
        }
        
        // Year
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
    
    renderResources() {
        if (!this.resourcesGrid) return;
        if (this.filteredResources.length === 0) {
            this.showEmptyState();
            return;
        }
        
        let html = '';
        for (const resource of this.filteredResources) {
            const isPastPaper = resource.resource_type === 'pastpaper';
            const isResourceTVET = this.TVET_PROGRAMS.includes(resource.program_type || '');
            
            const typeBadge = isPastPaper ? 
                '<span class="resource-badge pastpaper"><i class="fas fa-history"></i> Past Paper</span>' : 
                '<span class="resource-badge material"><i class="fas fa-book"></i> Material</span>';
            
            const programTag = isResourceTVET ?
                `<span class="program-tag tvet"><i class="fas fa-tools"></i> TVET</span>` :
                `<span class="program-tag krchn"><i class="fas fa-graduation-cap"></i> KRCHN</span>`;
            
            const yearDisplay = isPastPaper ? resource.pastpaper_year : resource.intake;
            const examTypeDisplay = isPastPaper && resource.exam_type ? this.getExamTypeLabel(resource.exam_type) : '';
            const courseDisplay = resource.course_name ? `<small class="course-name">📚 ${this.escapeHtml(resource.course_name)}</small>` : '';
            
            const blockOrTerm = resource.block || resource.term || resource.block_term || 'General';
            const blockOrTermLabel = isResourceTVET ? 'Term' : 'Block';
            
            html += `
                <div class="resource-card" data-id="${resource.id}">
                    <div class="resource-preview">
                        <div class="preview-icon ${this.getFileType(resource.file_path)}">
                            <i class="${this.getFileIcon(resource.file_path)}"></i>
                        </div>
                        ${typeBadge}
                        ${programTag}
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
                            <span class="meta-tag ${this.getBlockTagClass(blockOrTerm, isResourceTVET)}">
                                <i class="fas ${this.getBlockIcon(blockOrTerm, isResourceTVET)}"></i> 
                                ${blockOrTermLabel}: ${this.escapeHtml(blockOrTerm)}
                            </span>
                            <span class="meta-tag read-only-badge">
                                <i class="fas fa-eye"></i> Read Only
                            </span>
                        </div>
                    </div>
                    <div class="resource-actions">
                        <button class="action-btn primary" onclick="window.resourcesModule?.openResource(${resource.id})">
                            <i class="fas fa-eye"></i> Read Now
                        </button>
                        ${isPastPaper ? `<button class="action-btn secondary" onclick="window.resourcesModule?.viewPastPaper(${resource.id})">
                            <i class="fas fa-history"></i> View Paper
                        </button>` : ''}
                    </div>
                </div>
            `;
        }
        
        this.resourcesGrid.innerHTML = html;
        const cards = this.resourcesGrid.querySelectorAll('.resource-card');
        cards.forEach((card, index) => {
            card.style.animation = `fadeInUp 0.4s ease forwards ${index * 0.05}s`;
        });
    }
    
    // ============================================================
    // ============================================================
    // LMS - LEARNING MANAGEMENT SYSTEM
    // ============================================================
    // ============================================================
    
  initializeLMS() {
    console.log('🎓 Initializing LMS features...');
    
    // Load LMS courses
    this.loadCourses();
    
    // Setup LMS navigation
    this.setupLMSNavigation();
    
    // Load user progress
    this.loadUserProgress();
    
    // ✅ ADD THIS: Render LMS content
    setTimeout(() => this.renderLMSContent(), 500);
    
    console.log('✅ LMS initialized');
}
    // ============================================================
    // LMS - COURSE MANAGEMENT
    // ============================================================
    
    async loadCourses() {
        const supabase = this.getSupabaseClient();
        if (!supabase) return;
        
        try {
            // Get courses from database
            const { data: courses, error } = await supabase
                .from('lms_courses')
                .select('*')
                .order('order', { ascending: true });
            
            if (error) throw error;
            
            this.courses = courses || [];
            console.log(`📚 Loaded ${this.courses.length} courses`);
            
            // Render courses in sidebar
            this.renderCoursesSidebar();
            
            // If no courses, create sample data
            if (this.courses.length === 0) {
                this.createSampleCourses();
            }
            
        } catch (err) {
            console.error('Error loading courses:', err);
            // Create sample courses for demo
            this.createSampleCourses();
        }
    }
    
    createSampleCourses() {
        console.log('📝 Creating sample courses...');
        
        this.courses = [
            {
                id: 'krchn-nursing',
                title: 'KRCHN Nursing',
                icon: 'fa-heartbeat',
                color: '#4C1D95',
                description: 'Comprehensive nursing program covering all aspects of patient care',
                progress: 45,
                modules: [
                    {
                        id: 'mod-1',
                        title: 'Module 1: Fundamentals',
                        lessons: [
                            {
                                id: 'lesson-1-1',
                                title: 'Introduction to Nursing Practice',
                                type: 'video',
                                duration: '15 min',
                                content: 'Welcome to the foundational module...',
                                videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                                completed: true
                            },
                            {
                                id: 'lesson-1-2',
                                title: 'Nursing Ethics',
                                type: 'document',
                                duration: '20 min',
                                content: 'Ethical principles in nursing...',
                                completed: true
                            },
                            {
                                id: 'lesson-1-3',
                                title: 'Patient Safety',
                                type: 'video',
                                duration: '12 min',
                                content: 'Patient safety protocols...',
                                videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                                completed: false
                            },
                            {
                                id: 'lesson-1-4',
                                title: 'Quiz: Fundamentals',
                                type: 'quiz',
                                duration: '10 min',
                                questions: [
                                    {
                                        id: 'q1',
                                        question: 'What is the primary role of a nurse?',
                                        options: ['Patient care', 'Administration', 'Research', 'Teaching'],
                                        correct: 0
                                    },
                                    {
                                        id: 'q2',
                                        question: 'Which ethical principle means "do no harm"?',
                                        options: ['Autonomy', 'Beneficence', 'Non-maleficence', 'Justice'],
                                        correct: 2
                                    },
                                    {
                                        id: 'q3',
                                        question: 'What is the first step in patient assessment?',
                                        options: ['History taking', 'Physical exam', 'Vital signs', 'Diagnostic tests'],
                                        correct: 0
                                    }
                                ],
                                completed: false
                            }
                        ]
                    },
                    {
                        id: 'mod-2',
                        title: 'Module 2: Clinical Skills',
                        lessons: [
                            {
                                id: 'lesson-2-1',
                                title: 'Vital Signs',
                                type: 'video',
                                duration: '18 min',
                                content: 'How to measure vital signs...',
                                videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                                completed: false
                            },
                            {
                                id: 'lesson-2-2',
                                title: 'Patient Assessment',
                                type: 'document',
                                duration: '25 min',
                                content: 'Comprehensive patient assessment...',
                                completed: false
                            },
                            {
                                id: 'lesson-2-3',
                                title: 'Medication Administration',
                                type: 'video',
                                duration: '15 min',
                                content: 'Safe medication administration...',
                                videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                                completed: false
                            }
                        ]
                    }
                ]
            },
            {
                id: 'tvet-program',
                title: 'TVET Program',
                icon: 'fa-tools',
                color: '#1a7a5a',
                description: 'Technical and Vocational Education and Training',
                progress: 30,
                modules: [
                    {
                        id: 'mod-tvet-1',
                        title: 'Module 1: Core Skills',
                        lessons: [
                            {
                                id: 'lesson-tvet-1-1',
                                title: 'Introduction to TVET',
                                type: 'document',
                                duration: '10 min',
                                content: 'Overview of TVET programs...',
                                completed: true
                            },
                            {
                                id: 'lesson-tvet-1-2',
                                title: 'Safety in the Workplace',
                                type: 'video',
                                duration: '15 min',
                                content: 'Workplace safety guidelines...',
                                videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                                completed: false
                            }
                        ]
                    }
                ]
            },
            {
                id: 'leadership',
                title: 'Leadership & Management',
                icon: 'fa-users',
                color: '#b45309',
                description: 'Develop leadership skills for healthcare management',
                progress: 20,
                modules: [
                    {
                        id: 'mod-lead-1',
                        title: 'Module 1: Leadership Basics',
                        lessons: [
                            {
                                id: 'lesson-lead-1-1',
                                title: 'Leadership Styles',
                                type: 'document',
                                duration: '20 min',
                                content: 'Different leadership styles...',
                                completed: false
                            }
                        ]
                    }
                ]
            }
        ];
        
        // Save to database if possible
        this.saveCoursesToDB();
        
        // Render courses
        this.renderCoursesSidebar();
        this.renderDashboardStats();
        this.renderContinueLearning();
    }
    
   async saveCoursesToDB() {
    const supabase = this.getSupabaseClient();
    if (!supabase) return;
    
    try {
        for (const course of this.courses) {
            // ✅ Only include columns that exist in your table
            const { error } = await supabase
                .from('lms_courses')
                .upsert({
                    id: course.id,
                    title: course.title,
                    icon: course.icon || 'fa-book',
                    color: course.color || '#4C1D95',
                    description: course.description || '',
                    progress: course.progress || 0,
                    modules: course.modules || [],
                    created_at: course.created_at || new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
            
            if (error) console.error('Error saving course:', error);
        }
    } catch (err) {
        console.error('Error saving courses:', err);
    }
}
    // ============================================================
    // LMS - RENDER COURSES SIDEBAR
    // ============================================================
    
    renderCoursesSidebar() {
        const sidebar = document.getElementById('lms-sidebar-nav');
        if (!sidebar) return;
        
        // Check if LMS container exists, if not create it
        if (!document.getElementById('lms-sidebar-nav')) {
            this.createLMSContainer();
            return;
        }
        
        let html = '';
        for (const course of this.courses) {
            const isActive = course.id === this.currentCourseId;
            const progress = course.progress || 0;
            
            html += `
                <div class="lms-course-item ${isActive ? 'active' : ''}" 
                     data-course="${course.id}"
                     onclick="window.resourcesModule?.openCourse('${course.id}')">
                    <div class="course-icon" style="background:${course.color};">
                        <i class="fas ${course.icon}"></i>
                    </div>
                    <div class="course-info">
                        <div class="course-name">${course.title}</div>
                        <div class="course-progress-small">${this.getCompletedLessonsCount(course)} lessons completed</div>
                        <div class="course-progress-bar">
                            <div class="fill" style="width: ${progress}%"></div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        sidebar.innerHTML = html;
    }
    
    getCompletedLessonsCount(course) {
        let count = 0;
        if (course.modules) {
            for (const module of course.modules) {
                if (module.lessons) {
                    for (const lesson of module.lessons) {
                        if (lesson.completed) count++;
                    }
                }
            }
        }
        return count;
    }
    
    // ============================================================
    // LMS - OPEN COURSE
    // ============================================================
    
    openCourse(courseId) {
        this.currentCourseId = courseId;
        
        const course = this.courses.find(c => c.id === courseId);
        if (!course) return;
        
        console.log(`📖 Opening course: ${course.title}`);
        
        // Update sidebar
        this.renderCoursesSidebar();
        
        // Show course view
        this.showView('course');
        
        // Update course header
        const titleEl = document.getElementById('lms-course-title');
        if (titleEl) titleEl.textContent = course.title;
        
        const progressFill = document.getElementById('lms-course-progress-fill');
        const progressText = document.getElementById('lms-course-progress-text');
        if (progressFill) progressFill.style.width = `${course.progress || 0}%`;
        if (progressText) progressText.textContent = `${course.progress || 0}% Complete`;
        
        // Render modules
        this.renderModules(course);
        
        // Open first available lesson
        this.openFirstLesson(course);
    }
    
    renderModules(course) {
        const moduleList = document.getElementById('lms-module-list');
        if (!moduleList) return;
        
        let html = '';
        let lessonIndex = 0;
        
        for (const module of course.modules || []) {
            const completedLessons = module.lessons?.filter(l => l.completed).length || 0;
            const totalLessons = module.lessons?.length || 0;
            const isCompleted = completedLessons === totalLessons && totalLessons > 0;
            
            html += `
                <li>
                    <div class="module-item" onclick="window.resourcesModule?.toggleModule('${module.id}')">
                        <span>📘 ${module.title}</span>
                        <span class="module-badge ${isCompleted ? 'completed' : ''}">
                            ${isCompleted ? '✓ Complete' : `${completedLessons}/${totalLessons} lessons`}
                        </span>
                    </div>
                    <ul class="sub-lessons" id="module-${module.id}">
            `;
            
            for (const lesson of module.lessons || []) {
                const isActive = lesson.id === this.currentLessonId;
                const isCompleted = lesson.completed || false;
                const isLocked = !this.isLessonAccessible(lesson, lessonIndex);
                
                const iconMap = {
                    'video': 'fa-play-circle',
                    'document': 'fa-file-alt',
                    'quiz': 'fa-brain',
                    'assignment': 'fa-tasks'
                };
                
                const statusIcon = isCompleted ? '✓' : (isLocked ? '🔒' : '⏳');
                const statusClass = isCompleted ? 'completed' : (isLocked ? 'locked' : '');
                
                html += `
                    <li>
                        <div class="lesson-item ${isActive ? 'active' : ''}" 
                             onclick="window.resourcesModule?.openLesson('${course.id}', '${module.id}', '${lesson.id}')">
                            <span class="lesson-icon"><i class="fas ${iconMap[lesson.type] || 'fa-file'}" style="color:${this.getLessonColor(lesson.type)};"></i></span>
                            <span>${lesson.title}</span>
                            <span class="lesson-status ${statusClass}">${statusIcon}</span>
                        </div>
                    </li>
                `;
                
                lessonIndex++;
            }
            
            html += `
                    </ul>
                </li>
            `;
        }
        
        moduleList.innerHTML = html;
    }
    
    isLessonAccessible(lesson, index) {
        // First lesson is always accessible
        if (index === 0) return true;
        // Check if previous lesson is completed
        // This is simplified - in real implementation, check actual progress
        return true;
    }
    
    getLessonColor(type) {
        const colors = {
            'video': '#3b82f6',
            'document': '#8b5cf6',
            'quiz': '#ef4444',
            'assignment': '#f59e0b'
        };
        return colors[type] || '#64748b';
    }
    
    toggleModule(moduleId) {
        const moduleEl = document.getElementById(`module-${moduleId}`);
        if (moduleEl) {
            moduleEl.style.display = moduleEl.style.display === 'none' ? '' : 'none';
        }
    }
    
    // ============================================================
    // LMS - OPEN LESSON
    // ============================================================
    
    openLesson(courseId, moduleId, lessonId) {
        this.currentModuleId = moduleId;
        this.currentLessonId = lessonId;
        
        const course = this.courses.find(c => c.id === courseId);
        if (!course) return;
        
        const module = course.modules?.find(m => m.id === moduleId);
        if (!module) return;
        
        const lesson = module.lessons?.find(l => l.id === lessonId);
        if (!lesson) return;
        
        console.log(`📄 Opening lesson: ${lesson.title}`);
        
        // Update lesson content
        this.renderLessonContent(course, module, lesson);
        
        // Update module list
        this.renderModules(course);
    }
    
    renderLessonContent(course, module, lesson) {
        const content = document.getElementById('lms-lesson-content');
        if (!content) return;
        
        let html = `
            <div class="lesson-content-wrapper">
                <div class="lesson-header">
                    <h2>${lesson.title}</h2>
                    <div class="lesson-meta">
                        <i class="fas fa-clock"></i> ${lesson.duration || 'N/A'} • 
                        <i class="fas fa-tag"></i> ${module.title} • 
                        <i class="fas ${this.getLessonIcon(lesson.type)}"></i> ${this.capitalize(lesson.type)}
                        ${lesson.completed ? ' • <span style="color:#10b981;"><i class="fas fa-check-circle"></i> Completed</span>' : ''}
                    </div>
                </div>
                <div class="lesson-body">
        `;
        
        // Render content based on type
        if (lesson.type === 'video' && lesson.videoUrl) {
            html += `
                <div class="video-container">
                    <iframe src="${lesson.videoUrl}" allowfullscreen></iframe>
                </div>
            `;
        }
        
        if (lesson.content) {
            html += `
                <div style="color:#334155;line-height:1.8;">
                    ${lesson.content.replace(/\n/g, '<br>')}
                </div>
            `;
        }
        
        // Render quiz
        if (lesson.type === 'quiz' && lesson.questions) {
            html += this.renderQuizContent(lesson);
        }
        
        html += `
                </div>
                <div class="lesson-actions">
                    ${!lesson.completed && lesson.type !== 'quiz' ? `
                        <button class="action-btn primary" onclick="window.resourcesModule?.markLessonComplete('${course.id}', '${module.id}', '${lesson.id}')">
                            <i class="fas fa-check"></i> Mark Complete
                        </button>
                    ` : ''}
                    ${lesson.type === 'quiz' && !lesson.completed ? `
                        <button class="action-btn primary" onclick="window.resourcesModule?.submitQuiz('${course.id}', '${module.id}', '${lesson.id}')">
                            <i class="fas fa-paper-plane"></i> Submit Quiz
                        </button>
                    ` : ''}
                    ${lesson.type === 'quiz' && lesson.completed ? `
                        <span style="padding:10px 20px;background:#d1fae5;border-radius:40px;color:#065f46;font-weight:500;">
                            <i class="fas fa-check-circle"></i> Quiz Completed
                        </span>
                    ` : ''}
                    <button class="action-btn secondary" onclick="window.resourcesModule?.downloadLesson('${course.id}', '${module.id}', '${lesson.id}')">
                        <i class="fas fa-download"></i> Download
                    </button>
                </div>
            </div>
        `;
        
        content.innerHTML = html;
        
        // Scroll to top
        content.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    renderQuizContent(lesson) {
        let html = `
            <div class="quiz-section" id="quiz-section">
                <h3 style="margin:20px 0 16px;font-size:18px;color:#0f172a;">
                    <i class="fas fa-brain" style="color:#4C1D95;"></i> Quiz: ${lesson.title}
                </h3>
                <p style="color:#64748b;margin-bottom:16px;">Answer all questions below. You need to score 70% to pass.</p>
        `;
        
        for (let i = 0; i < lesson.questions.length; i++) {
            const q = lesson.questions[i];
            html += `
                <div class="quiz-question" data-question="${i}">
                    <div class="question-number">Question ${i + 1} of ${lesson.questions.length}</div>
                    <div class="question-text">${q.question}</div>
                    <div class="quiz-options">
            `;
            
            for (let j = 0; j < q.options.length; j++) {
                const option = q.options[j];
                html += `
                    <label>
                        <input type="radio" name="question_${i}" value="${j}">
                        ${option}
                    </label>
                `;
            }
            
            html += `
                    </div>
                </div>
            `;
        }
        
        html += `
                <button class="quiz-submit-btn" onclick="window.resourcesModule?.submitQuizAnswers('${lesson.id}')">
                    <i class="fas fa-paper-plane"></i> Submit Quiz
                </button>
                <div id="quiz-result" style="display:none;"></div>
            </div>
        `;
        
        return html;
    }
    
    getLessonIcon(type) {
        const icons = {
            'video': 'fa-play-circle',
            'document': 'fa-file-alt',
            'quiz': 'fa-brain',
            'assignment': 'fa-tasks'
        };
        return icons[type] || 'fa-file';
    }
    
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    
    // ============================================================
    // LMS - QUIZ FUNCTIONS
    // ============================================================
    
    submitQuizAnswers(lessonId) {
        // Find the lesson
        let lesson = null;
        let courseId = null;
        let moduleId = null;
        
        for (const course of this.courses) {
            for (const module of course.modules || []) {
                const found = module.lessons?.find(l => l.id === lessonId);
                if (found) {
                    lesson = found;
                    courseId = course.id;
                    moduleId = module.id;
                    break;
                }
            }
            if (lesson) break;
        }
        
        if (!lesson || !lesson.questions) {
            alert('Quiz not found');
            return;
        }
        
        let score = 0;
        const total = lesson.questions.length;
        let allAnswered = true;
        
        for (let i = 0; i < total; i++) {
            const selected = document.querySelector(`input[name="question_${i}"]:checked`);
            if (!selected) {
                allAnswered = false;
                continue;
            }
            
            const answer = parseInt(selected.value);
            if (answer === lesson.questions[i].correct) {
                score++;
                // Mark correct
                const label = selected.closest('label');
                if (label) {
                    label.classList.add('correct');
                    label.classList.remove('selected');
                }
            } else {
                // Show correct answer
                const labels = document.querySelectorAll(`input[name="question_${i}"]`);
                labels.forEach((input, idx) => {
                    const label = input.closest('label');
                    if (idx === lesson.questions[i].correct) {
                        label.classList.add('correct');
                    } else if (input.checked) {
                        label.classList.add('wrong');
                    }
                });
            }
        }
        
        if (!allAnswered) {
            alert('Please answer all questions before submitting.');
            return;
        }
        
        const percentage = Math.round((score / total) * 100);
        const passed = percentage >= 70;
        
        // Show result
        const resultDiv = document.getElementById('quiz-result');
        if (resultDiv) {
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = `
                <div class="quiz-result">
                    <div class="score">${percentage}%</div>
                    <div style="font-size:18px;font-weight:600;color:${passed ? '#10b981' : '#ef4444'};">
                        ${passed ? '🎉 Passed!' : '😅 Keep Learning!'}
                    </div>
                    <div class="feedback">
                        ${passed ? 'Great job! You have mastered this topic.' : 'Review the material and try again.'}
                    </div>
                    <div style="margin-top:8px;font-size:13px;color:#64748b;">
                        ${score} out of ${total} correct
                    </div>
                </div>
            `;
            
            // Disable submit button
            const submitBtn = document.querySelector('.quiz-submit-btn');
            if (submitBtn) submitBtn.disabled = true;
        }
        
        // Save quiz result
        this.quizResults[lessonId] = { score, total, percentage, passed };
        
        // If passed, mark lesson as complete
        if (passed) {
            this.markLessonComplete(courseId, moduleId, lessonId);
        }
    }
    
    submitQuiz(courseId, moduleId, lessonId) {
        // Find the lesson
        const course = this.courses.find(c => c.id === courseId);
        if (!course) return;
        
        const module = course.modules?.find(m => m.id === moduleId);
        if (!module) return;
        
        const lesson = module.lessons?.find(l => l.id === lessonId);
        if (!lesson) return;
        
        // Check if all questions are answered
        const totalQuestions = lesson.questions?.length || 0;
        let answered = 0;
        
        for (let i = 0; i < totalQuestions; i++) {
            const selected = document.querySelector(`input[name="question_${i}"]:checked`);
            if (selected) answered++;
        }
        
        if (answered < totalQuestions) {
            alert(`Please answer all ${totalQuestions} questions before submitting.`);
            return;
        }
        
        this.submitQuizAnswers(lessonId);
    }
    
    // ============================================================
    // LMS - LESSON COMPLETION
    // ============================================================
    
    markLessonComplete(courseId, moduleId, lessonId) {
        const course = this.courses.find(c => c.id === courseId);
        if (!course) return;
        
        const module = course.modules?.find(m => m.id === moduleId);
        if (!module) return;
        
        const lesson = module.lessons?.find(l => l.id === lessonId);
        if (!lesson) return;
        
        // Mark as completed
        lesson.completed = true;
        
        // Update course progress
        this.updateCourseProgress(courseId);
        
        // Add to completed lessons
        this.completedLessons.add(lessonId);
        
        // Check for badge
        this.checkBadges(courseId);
        
        // Update UI
        this.renderModules(course);
        this.renderCoursesSidebar();
        this.renderDashboardStats();
        
        // Show notification
        this.showNotification('🎉 Lesson Completed!', 'Great job! You\'ve completed this lesson.');
        
        // Re-render lesson content
        this.renderLessonContent(course, module, lesson);
    }
    
    updateCourseProgress(courseId) {
        const course = this.courses.find(c => c.id === courseId);
        if (!course) return;
        
        let totalLessons = 0;
        let completedLessons = 0;
        
        for (const module of course.modules || []) {
            for (const lesson of module.lessons || []) {
                totalLessons++;
                if (lesson.completed) completedLessons++;
            }
        }
        
        const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
        course.progress = progress;
        
        // Update UI
        const progressFill = document.getElementById('lms-course-progress-fill');
        const progressText = document.getElementById('lms-course-progress-text');
        if (progressFill) progressFill.style.width = `${progress}%`;
        if (progressText) progressText.textContent = `${progress}% Complete`;
        
        // Update sidebar
        this.renderCoursesSidebar();
        
        // Save progress to database
        this.saveProgress(courseId, progress);
    }
    
    async saveProgress(courseId, progress) {
        const supabase = this.getSupabaseClient();
        if (!supabase) return;
        
        try {
            await supabase
                .from('lms_progress')
                .upsert({
                    user_id: this.userId,
                    course_id: courseId,
                    progress: progress,
                    updated_at: new Date()
                });
        } catch (err) {
            console.error('Error saving progress:', err);
        }
    }
    
    // ============================================================
    // LMS - BADGES
    // ============================================================
    
    checkBadges(courseId) {
        const course = this.courses.find(c => c.id === courseId);
        if (!course) return;
        
        const completedLessons = this.getCompletedLessonsCount(course);
        const totalLessons = this.getTotalLessonsCount(course);
        const progress = course.progress || 0;
        
        // Badge: First Lesson
        if (completedLessons >= 1 && !this.hasBadge('first_lesson')) {
            this.awardBadge('first_lesson', '🎯 First Lesson', 'Completed your first lesson!');
        }
        
        // Badge: Halfway
        if (progress >= 50 && !this.hasBadge('halfway')) {
            this.awardBadge('halfway', '📚 Halfway There', 'Completed 50% of the course!');
        }
        
        // Badge: Course Complete
        if (progress >= 100 && !this.hasBadge('course_complete')) {
            this.awardBadge('course_complete', '🏆 Course Complete', 'You completed the entire course!');
        }
    }
    
    hasBadge(badgeId) {
        return this.earnedBadges.some(b => b.id === badgeId);
    }
    
    awardBadge(id, title, description) {
        this.earnedBadges.push({ id, title, description, earned_at: new Date() });
        this.renderDashboardStats();
        this.showNotification(`🏅 New Badge: ${title}`, description);
    }
    
    getTotalLessonsCount(course) {
        let count = 0;
        for (const module of course.modules || []) {
            count += module.lessons?.length || 0;
        }
        return count;
    }
    
    // ============================================================
    // LMS - DASHBOARD
    // ============================================================
    
    renderDashboardStats() {
        // Courses count
        const coursesEl = document.getElementById('lms-courses-count');
        if (coursesEl) coursesEl.textContent = this.courses.length;
        
        // Lessons completed
        let totalCompleted = 0;
        for (const course of this.courses) {
            totalCompleted += this.getCompletedLessonsCount(course);
        }
        const lessonsEl = document.getElementById('lms-lessons-completed');
        if (lessonsEl) lessonsEl.textContent = totalCompleted;
        
        // Quiz score
        let quizScores = Object.values(this.quizResults);
        let avgScore = 0;
        if (quizScores.length > 0) {
            avgScore = Math.round(quizScores.reduce((a, b) => a + b.percentage, 0) / quizScores.length);
        }
        const scoreEl = document.getElementById('lms-quiz-score');
        if (scoreEl) scoreEl.textContent = `${avgScore}%`;
        
        // Badges
        const badgesEl = document.getElementById('lms-badges-count');
        if (badgesEl) badgesEl.textContent = this.earnedBadges.length;
    }
    
    renderContinueLearning() {
        const container = document.getElementById('lms-continue-learning-list');
        if (!container) return;
        
        let html = '';
        
        for (const course of this.courses) {
            if (course.progress < 100) {
                // Find next incomplete lesson
                let nextLesson = null;
                let nextModule = null;
                
                for (const module of course.modules || []) {
                    for (const lesson of module.lessons || []) {
                        if (!lesson.completed) {
                            nextLesson = lesson;
                            nextModule = module;
                            break;
                        }
                    }
                    if (nextLesson) break;
                }
                
                if (nextLesson) {
                    const remaining = this.getTotalLessonsCount(course) - this.getCompletedLessonsCount(course);
                    html += `
                        <div class="continue-item" onclick="window.resourcesModule?.openCourse('${course.id}')">
                            <div class="item-title">${nextLesson.title}</div>
                            <div class="item-meta">
                                ${course.title} • ${nextModule?.title || ''} • ${remaining} lessons remaining
                            </div>
                        </div>
                    `;
                }
            }
        }
        
        if (!html) {
            html = `
                <div class="continue-item" style="text-align:center;color:#94a3b8;">
                    <div class="item-title">🎉 All caught up!</div>
                    <div class="item-meta">You've completed all your lessons. Great job!</div>
                </div>
            `;
        }
        
        container.innerHTML = html;
    }
    
    // ============================================================
    // LMS - NAVIGATION
    // ============================================================
    
    setupLMSNavigation() {
        // Back button
        const backBtn = document.getElementById('lms-back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.showView('dashboard');
                this.renderDashboardStats();
                this.renderContinueLearning();
            });
        }
        
        // Top nav links
        document.querySelectorAll('.nav-links a[data-view]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = link.getAttribute('data-view');
                this.showView(view);
                
                // Update active state
                document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });
    }
    
    showView(view) {
        // Hide all views
        const dashboard = document.getElementById('lms-dashboard');
        const courseView = document.getElementById('lms-course-view');
        const quizView = document.getElementById('lms-quiz-view');
        const assignmentView = document.getElementById('lms-assignment-view');
        const discussionView = document.getElementById('lms-discussion-view');
        
        if (dashboard) dashboard.style.display = view === 'dashboard' ? '' : 'none';
        if (courseView) courseView.style.display = view === 'course' ? '' : 'none';
        if (quizView) quizView.style.display = view === 'quiz' ? '' : 'none';
        if (assignmentView) assignmentView.style.display = view === 'assignments' ? '' : 'none';
        if (discussionView) discussionView.style.display = view === 'discussions' ? '' : 'none';
        
        // Show/hide resources section
        const resourcesSection = document.getElementById('resources-section');
        if (resourcesSection) {
            resourcesSection.style.display = view === 'resources' ? '' : 'none';
        }
        
        // Update view content
        if (view === 'dashboard') {
            this.renderDashboardStats();
            this.renderContinueLearning();
        }
    }
    
    // ============================================================
    // LMS - CREATE LMS CONTAINER
    // ============================================================
    
    createLMSContainer() {
        // Check if already exists
        if (document.getElementById('lms-container')) return;
        
        const container = document.createElement('div');
        container.id = 'lms-container';
        container.className = 'lms-container';
        container.innerHTML = `
            <div class="lms-layout">
                <aside class="lms-sidebar" id="lms-sidebar">
                    <div class="lms-sidebar-header">
                        <h3><i class="fas fa-graduation-cap"></i> My Courses</h3>
                    </div>
                    <nav class="lms-sidebar-nav" id="lms-sidebar-nav">
                        <!-- Courses populated dynamically -->
                    </nav>
                    <div class="lms-sidebar-footer">
                        <div class="lms-progress-summary">
                            <span>Overall</span>
                            <div class="progress-bar">
                                <div class="fill" id="lms-overall-progress" style="width: 0%"></div>
                            </div>
                            <span class="progress-text" id="lms-overall-progress-text">0%</span>
                        </div>
                    </div>
                </aside>
                <main class="lms-main-content" id="lms-main-content">
                    <!-- Dashboard View -->
                    <div class="lms-dashboard" id="lms-dashboard">
                        <div class="lms-dashboard-header">
                            <h1>👋 Welcome back!</h1>
                            <p>Continue your learning journey. You're making great progress!</p>
                        </div>
                        <div class="lms-stats-grid">
                            <div class="stat-card">
                                <i class="fas fa-book-open"></i>
                                <div class="stat-info">
                                    <span class="stat-number" id="lms-courses-count">0</span>
                                    <span class="stat-label">Courses Enrolled</span>
                                </div>
                            </div>
                            <div class="stat-card">
                                <i class="fas fa-check-circle"></i>
                                <div class="stat-info">
                                    <span class="stat-number" id="lms-lessons-completed">0</span>
                                    <span class="stat-label">Lessons Completed</span>
                                </div>
                            </div>
                            <div class="stat-card">
                                <i class="fas fa-star"></i>
                                <div class="stat-info">
                                    <span class="stat-number" id="lms-quiz-score">0%</span>
                                    <span class="stat-label">Average Quiz Score</span>
                                </div>
                            </div>
                            <div class="stat-card">
                                <i class="fas fa-trophy"></i>
                                <div class="stat-info">
                                    <span class="stat-number" id="lms-badges-count">0</span>
                                    <span class="stat-label">Badges Earned</span>
                                </div>
                            </div>
                        </div>
                        <div class="lms-continue-learning">
                            <h2>📖 Continue Learning</h2>
                            <div class="continue-learning-list" id="lms-continue-learning-list">
                                <!-- Continue learning items -->
                            </div>
                        </div>
                    </div>
                    
                    <!-- Course View -->
                    <div class="lms-course-view" id="lms-course-view" style="display:none;">
                        <div class="lms-course-header">
                            <button class="lms-back-btn" id="lms-back-btn">
                                <i class="fas fa-arrow-left"></i> Back
                            </button>
                            <h1 id="lms-course-title">Course Title</h1>
                            <div class="lms-course-progress">
                                <span id="lms-course-progress-text">0% Complete</span>
                                <div class="progress-bar">
                                    <div class="fill" id="lms-course-progress-fill" style="width: 0%"></div>
                                </div>
                            </div>
                        </div>
                        <div class="lms-course-body">
                            <div class="lms-course-sidebar">
                                <h4>📑 Course Content</h4>
                                <ul class="lms-module-list" id="lms-module-list">
                                    <!-- Modules populated dynamically -->
                                </ul>
                            </div>
                            <div class="lms-lesson-content" id="lms-lesson-content">
                                <div class="lesson-placeholder">
                                    <i class="fas fa-book"></i>
                                    <h3>Select a lesson to begin</h3>
                                    <p>Choose a module and lesson from the sidebar to start learning.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Quiz View -->
                    <div class="lms-quiz-view" id="lms-quiz-view" style="display:none;"></div>
                    
                    <!-- Assignment View -->
                    <div class="lms-assignment-view" id="lms-assignment-view" style="display:none;"></div>
                    
                    <!-- Discussion View -->
                    <div class="lms-discussion-view" id="lms-discussion-view" style="display:none;"></div>
                </main>
            </div>
        `;
        
        // Insert after resources section
        const resourcesSection = document.getElementById('resources');
        if (resourcesSection) {
            resourcesSection.parentNode.insertBefore(container, resourcesSection.nextSibling);
        } else {
            document.querySelector('.lms-wrapper')?.appendChild(container);
        }
        
        // Add LMS styles
        this.addLMSStyles();
        
        // Setup navigation
        this.setupLMSNavigation();
        
        console.log('✅ LMS container created');
    }
    // ============================================================
// LMS - RENDER LMS CONTENT (FIX)
// ============================================================

renderLMSContent() {
    console.log('🎓 Rendering LMS content...');
    
    const container = document.getElementById('lms-container');
    if (!container) {
        console.log('❌ LMS container not found, creating...');
        this.createLMSContainer();
        return;
    }
    
    // Check if courses are loaded
    if (!this.courses || this.courses.length === 0) {
        console.log('⏳ No courses loaded yet, waiting...');
        setTimeout(() => this.renderLMSContent(), 500);
        return;
    }
    
    // Build course sidebar items
    let sidebarItems = '';
    let continueItems = '';
    let totalProgress = 0;
    let totalLessons = 0;
    let completedLessons = 0;
    
    for (const course of this.courses) {
        const completed = this.getCompletedLessonsCount(course);
        const progress = course.progress || 0;
        totalProgress += progress;
        totalLessons += this.getTotalLessonsCount(course);
        completedLessons += completed;
        
        sidebarItems += `
            <div class="lms-course-item" onclick="window.resourcesModule?.openCourse('${course.id}')" style="
                padding: 10px 20px;
                cursor: pointer;
                transition: all 0.2s;
                border-left: 3px solid transparent;
                display: flex;
                align-items: center;
                gap: 12px;
            ">
                <div class="course-icon" style="
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    flex-shrink: 0;
                    color: white;
                    background: ${course.color || '#4C1D95'};
                ">
                    <i class="fas ${course.icon || 'fa-book'}"></i>
                </div>
                <div class="course-info" style="flex:1;min-width:0;">
                    <div class="course-name" style="font-weight:500;font-size:14px;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${course.title}</div>
                    <div class="course-progress-small" style="font-size:12px;color:#64748b;">${completed} lessons completed</div>
                    <div class="course-progress-bar" style="height:3px;background:#e2e8f0;border-radius:4px;margin-top:4px;overflow:hidden;">
                        <div class="fill" style="height:100%;background:#4C1D95;border-radius:4px;transition:width 0.5s ease;width:${progress}%;"></div>
                    </div>
                </div>
            </div>
        `;
        
        // Continue learning items
        if (progress < 100) {
            const nextLesson = course.modules?.[0]?.lessons?.find(l => !l.completed);
            continueItems += `
                <div class="continue-item" onclick="window.resourcesModule?.openCourse('${course.id}')" style="
                    background: #f8fafc;
                    padding: 16px;
                    border-radius: 12px;
                    border: 1px solid #f1f5f9;
                    cursor: pointer;
                    transition: all 0.2s;
                ">
                    <div class="item-title" style="font-weight:600;font-size:14px;color:#0f172a;">${nextLesson?.title || 'Start Learning'}</div>
                    <div class="item-meta" style="font-size:13px;color:#64748b;margin-top:4px;">${course.title} • ${100 - progress}% remaining</div>
                </div>
            `;
        }
    }
    
    if (!continueItems) {
        continueItems = '<div style="color:#94a3b8;text-align:center;padding:20px;">🎉 All caught up!</div>';
    }
    
    const avgProgress = this.courses.length > 0 ? Math.round(totalProgress / this.courses.length) : 0;
    
    // Build complete LMS HTML
    container.innerHTML = `
        <div class="lms-layout" style="display:flex;min-height:500px;">
            <!-- SIDEBAR -->
            <aside class="lms-sidebar" id="lms-sidebar" style="
                width: 280px;
                background: #fafbfc;
                border-right: 1px solid #e2e8f0;
                display: flex;
                flex-direction: column;
                flex-shrink: 0;
            ">
                <div class="lms-sidebar-header" style="
                    padding: 16px 20px;
                    border-bottom: 1px solid #e2e8f0;
                    background: white;
                ">
                    <h3 style="margin:0;font-size:15px;font-weight:600;color:#0f172a;">
                        <i class="fas fa-graduation-cap" style="color:#4C1D95;margin-right:8px;"></i> My Courses
                    </h3>
                </div>
                <nav class="lms-sidebar-nav" id="lms-sidebar-nav" style="flex:1;overflow-y:auto;padding:8px 0;">
                    ${sidebarItems}
                </nav>
                <div class="lms-sidebar-footer" style="
                    padding: 12px 20px;
                    border-top: 1px solid #e2e8f0;
                    background: white;
                ">
                    <div class="lms-progress-summary" style="display:flex;align-items:center;gap:12px;font-size:13px;color:#475569;">
                        <span>Overall</span>
                        <div class="progress-bar" style="flex:1;height:6px;background:#e2e8f0;border-radius:4px;overflow:hidden;">
                            <div class="fill" style="height:100%;background:linear-gradient(90deg,#4C1D95,#7c3aed);border-radius:4px;transition:width 0.5s ease;width:${avgProgress}%;"></div>
                        </div>
                        <span class="progress-text" style="font-weight:600;font-size:13px;color:#4C1D95;min-width:40px;text-align:right;">${avgProgress}%</span>
                    </div>
                </div>
            </aside>
            
            <!-- MAIN CONTENT -->
            <main class="lms-main-content" style="flex:1;padding:24px;overflow-y:auto;background:white;min-height:500px;">
                
                <!-- DASHBOARD -->
                <div class="lms-dashboard" id="lms-dashboard">
                    <div class="lms-dashboard-header" style="margin-bottom:24px;">
                        <h1 style="font-size:24px;font-weight:700;color:#0f172a;margin-bottom:4px;">👋 Welcome back!</h1>
                        <p style="color:#64748b;">Continue your learning journey. You're making great progress!</p>
                    </div>
                    
                    <div class="lms-stats-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:32px;">
                        <div class="stat-card" style="background:#f8fafc;padding:20px;border-radius:12px;display:flex;align-items:center;gap:16px;border:1px solid #f1f5f9;transition:all 0.2s;">
                            <i class="fas fa-book-open" style="font-size:28px;color:#4C1D95;width:48px;height:48px;display:flex;align-items:center;justify-content:center;background:#ede9fe;border-radius:12px;"></i>
                            <div class="stat-info" style="flex:1;">
                                <span class="stat-number" style="display:block;font-size:24px;font-weight:700;color:#0f172a;line-height:1.2;">${this.courses.length}</span>
                                <span class="stat-label" style="font-size:13px;color:#64748b;">Courses Enrolled</span>
                            </div>
                        </div>
                        <div class="stat-card" style="background:#f8fafc;padding:20px;border-radius:12px;display:flex;align-items:center;gap:16px;border:1px solid #f1f5f9;transition:all 0.2s;">
                            <i class="fas fa-check-circle" style="font-size:28px;color:#4C1D95;width:48px;height:48px;display:flex;align-items:center;justify-content:center;background:#ede9fe;border-radius:12px;"></i>
                            <div class="stat-info" style="flex:1;">
                                <span class="stat-number" style="display:block;font-size:24px;font-weight:700;color:#0f172a;line-height:1.2;">${completedLessons}</span>
                                <span class="stat-label" style="font-size:13px;color:#64748b;">Lessons Completed</span>
                            </div>
                        </div>
                        <div class="stat-card" style="background:#f8fafc;padding:20px;border-radius:12px;display:flex;align-items:center;gap:16px;border:1px solid #f1f5f9;transition:all 0.2s;">
                            <i class="fas fa-star" style="font-size:28px;color:#4C1D95;width:48px;height:48px;display:flex;align-items:center;justify-content:center;background:#ede9fe;border-radius:12px;"></i>
                            <div class="stat-info" style="flex:1;">
                                <span class="stat-number" style="display:block;font-size:24px;font-weight:700;color:#0f172a;line-height:1.2;">${Object.keys(this.quizResults).length > 0 ? Math.round(Object.values(this.quizResults).reduce((a,b) => a + b.percentage, 0) / Object.values(this.quizResults).length) : 0}%</span>
                                <span class="stat-label" style="font-size:13px;color:#64748b;">Average Quiz Score</span>
                            </div>
                        </div>
                        <div class="stat-card" style="background:#f8fafc;padding:20px;border-radius:12px;display:flex;align-items:center;gap:16px;border:1px solid #f1f5f9;transition:all 0.2s;">
                            <i class="fas fa-trophy" style="font-size:28px;color:#4C1D95;width:48px;height:48px;display:flex;align-items:center;justify-content:center;background:#ede9fe;border-radius:12px;"></i>
                            <div class="stat-info" style="flex:1;">
                                <span class="stat-number" style="display:block;font-size:24px;font-weight:700;color:#0f172a;line-height:1.2;">${this.earnedBadges.length}</span>
                                <span class="stat-label" style="font-size:13px;color:#64748b;">Badges Earned</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="lms-continue-learning">
                        <h2 style="font-size:18px;font-weight:600;margin-bottom:16px;color:#0f172a;">📖 Continue Learning</h2>
                        <div class="continue-learning-list" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;">
                            ${continueItems}
                        </div>
                    </div>
                </div>
                
                <!-- COURSE VIEW (hidden initially) -->
                <div class="lms-course-view" id="lms-course-view" style="display:none;">
                    <div class="lms-course-header" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid #e2e8f0;">
                        <button class="lms-back-btn" id="lms-back-btn" style="padding:8px 16px;border:none;border-radius:8px;background:#f1f5f9;color:#475569;cursor:pointer;font-size:13px;font-weight:500;transition:all 0.2s;display:flex;align-items:center;gap:8px;">
                            <i class="fas fa-arrow-left"></i> Back
                        </button>
                        <h1 id="lms-course-title" style="flex:1;font-size:22px;font-weight:700;color:#0f172a;margin:0;">Course</h1>
                        <div class="lms-course-progress" style="display:flex;align-items:center;gap:12px;">
                            <span id="lms-course-progress-text" style="font-size:13px;font-weight:500;color:#4C1D95;">0% Complete</span>
                            <div class="progress-bar" style="width:120px;height:6px;background:#e2e8f0;border-radius:4px;overflow:hidden;">
                                <div class="fill" id="lms-course-progress-fill" style="height:100%;background:linear-gradient(90deg,#4C1D95,#7c3aed);border-radius:4px;transition:width 0.5s ease;width:0%;"></div>
                            </div>
                        </div>
                    </div>
                    <div class="lms-course-body" style="display:flex;gap:24px;">
                        <div class="lms-course-sidebar" style="width:280px;flex-shrink:0;">
                            <h4 style="font-size:14px;font-weight:600;color:#475569;margin-bottom:12px;text-transform:uppercase;letter-spacing:0.5px;">📑 Course Content</h4>
                            <ul class="lms-module-list" id="lms-module-list" style="list-style:none;padding:0;"></ul>
                        </div>
                        <div class="lms-lesson-content" id="lms-lesson-content" style="flex:1;min-height:400px;">
                            <div class="lesson-placeholder" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;min-height:300px;color:#94a3b8;text-align:center;">
                                <i class="fas fa-book" style="font-size:48px;margin-bottom:16px;color:#cbd5e1;"></i>
                                <h3 style="font-size:18px;color:#475569;margin-bottom:8px;">Select a lesson to begin</h3>
                                <p style="color:#94a3b8;max-width:400px;">Choose a module and lesson from the sidebar to start learning.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    `;
    
    // Add styles if not present
    if (!document.getElementById('lms-styles')) {
        this.addLMSStyles();
    }
    
    // Setup back button
    const backBtn = document.getElementById('lms-back-btn');
    if (backBtn) {
        backBtn.onclick = () => {
            document.getElementById('lms-dashboard').style.display = 'block';
            document.getElementById('lms-course-view').style.display = 'none';
        };
    }
    
    // Make container visible
    container.style.display = 'block';
    container.style.visibility = 'visible';
    container.style.height = 'auto';
    
    console.log('✅ LMS rendered successfully with', this.courses.length, 'courses');
}
    // ============================================================
    // LMS - STYLES
    // ============================================================
    
    addLMSStyles() {
        if (document.getElementById('lms-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'lms-styles';
        styles.textContent = `
            .lms-container {
                margin-top: 24px;
                background: white;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 1px 3px rgba(0,0,0,0.06);
            }
            .lms-layout { display: flex; min-height: 500px; }
            .lms-sidebar {
                width: 280px;
                background: #fafbfc;
                border-right: 1px solid #e2e8f0;
                display: flex;
                flex-direction: column;
                flex-shrink: 0;
            }
            .lms-sidebar-header {
                padding: 16px 20px;
                border-bottom: 1px solid #e2e8f0;
                background: white;
            }
            .lms-sidebar-header h3 {
                margin: 0;
                font-size: 15px;
                font-weight: 600;
                color: #0f172a;
            }
            .lms-sidebar-header h3 i { color: #4C1D95; margin-right: 8px; }
            .lms-sidebar-nav {
                flex: 1;
                overflow-y: auto;
                padding: 8px 0;
            }
            .lms-sidebar-nav::-webkit-scrollbar { width: 4px; }
            .lms-sidebar-nav::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
            .lms-course-item {
                padding: 10px 20px;
                cursor: pointer;
                transition: all 0.2s;
                border-left: 3px solid transparent;
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .lms-course-item:hover { background: #f1f5f9; }
            .lms-course-item.active {
                background: #ede9fe;
                border-left-color: #4C1D95;
            }
            .lms-course-item .course-icon {
                width: 32px;
                height: 32px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
                flex-shrink: 0;
                color: white;
            }
            .lms-course-item .course-info { flex: 1; min-width: 0; }
            .lms-course-item .course-name {
                font-weight: 500;
                font-size: 14px;
                color: #0f172a;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .lms-course-item .course-progress-small {
                font-size: 12px;
                color: #64748b;
            }
            .lms-course-item .course-progress-bar {
                height: 3px;
                background: #e2e8f0;
                border-radius: 4px;
                margin-top: 4px;
                overflow: hidden;
            }
            .lms-course-item .course-progress-bar .fill {
                height: 100%;
                background: #4C1D95;
                border-radius: 4px;
                transition: width 0.5s ease;
            }
            .lms-sidebar-footer {
                padding: 12px 20px;
                border-top: 1px solid #e2e8f0;
                background: white;
            }
            .lms-progress-summary {
                display: flex;
                align-items: center;
                gap: 12px;
                font-size: 13px;
                color: #475569;
            }
            .lms-progress-summary .progress-bar {
                flex: 1;
                height: 6px;
                background: #e2e8f0;
                border-radius: 4px;
                overflow: hidden;
            }
            .lms-progress-summary .progress-bar .fill {
                height: 100%;
                background: linear-gradient(90deg, #4C1D95, #7c3aed);
                border-radius: 4px;
                transition: width 0.5s ease;
            }
            .lms-progress-summary .progress-text {
                font-weight: 600;
                font-size: 13px;
                color: #4C1D95;
                min-width: 40px;
                text-align: right;
            }
            .lms-main-content {
                flex: 1;
                padding: 24px;
                overflow-y: auto;
                background: white;
                min-height: 500px;
            }
            .lms-dashboard-header { margin-bottom: 24px; }
            .lms-dashboard-header h1 {
                font-size: 24px;
                font-weight: 700;
                color: #0f172a;
                margin-bottom: 4px;
            }
            .lms-dashboard-header p { color: #64748b; }
            .lms-stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 16px;
                margin-bottom: 32px;
            }
            .stat-card {
                background: #f8fafc;
                padding: 20px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                gap: 16px;
                border: 1px solid #f1f5f9;
                transition: all 0.2s;
            }
            .stat-card:hover {
                border-color: #4C1D95;
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            }
            .stat-card i {
                font-size: 28px;
                color: #4C1D95;
                width: 48px;
                height: 48px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #ede9fe;
                border-radius: 12px;
            }
            .stat-card .stat-info { flex: 1; }
            .stat-card .stat-number {
                display: block;
                font-size: 24px;
                font-weight: 700;
                color: #0f172a;
                line-height: 1.2;
            }
            .stat-card .stat-label { font-size: 13px; color: #64748b; }
            .lms-continue-learning { margin-top: 24px; }
            .lms-continue-learning h2 {
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 16px;
                color: #0f172a;
            }
            .continue-learning-list {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                gap: 16px;
            }
            .continue-item {
                background: #f8fafc;
                padding: 16px;
                border-radius: 12px;
                border: 1px solid #f1f5f9;
                cursor: pointer;
                transition: all 0.2s;
            }
            .continue-item:hover {
                border-color: #4C1D95;
                transform: translateY(-2px);
            }
            .continue-item .item-title {
                font-weight: 600;
                font-size: 14px;
                color: #0f172a;
            }
            .continue-item .item-meta {
                font-size: 13px;
                color: #64748b;
                margin-top: 4px;
            }
            .lms-course-header {
                display: flex;
                align-items: center;
                gap: 16px;
                flex-wrap: wrap;
                margin-bottom: 24px;
                padding-bottom: 16px;
                border-bottom: 1px solid #e2e8f0;
            }
            .lms-back-btn {
                padding: 8px 16px;
                border: none;
                border-radius: 8px;
                background: #f1f5f9;
                color: #475569;
                cursor: pointer;
                font-size: 13px;
                font-weight: 500;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .lms-back-btn:hover { background: #e2e8f0; }
            .lms-course-header h1 {
                flex: 1;
                font-size: 22px;
                font-weight: 700;
                color: #0f172a;
                margin: 0;
            }
            .lms-course-progress {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .lms-course-progress span {
                font-size: 13px;
                font-weight: 500;
                color: #4C1D95;
            }
            .lms-course-progress .progress-bar {
                width: 120px;
                height: 6px;
                background: #e2e8f0;
                border-radius: 4px;
                overflow: hidden;
            }
            .lms-course-progress .progress-bar .fill {
                height: 100%;
                background: linear-gradient(90deg, #4C1D95, #7c3aed);
                border-radius: 4px;
                transition: width 0.5s ease;
            }
            .lms-course-body { display: flex; gap: 24px; }
            .lms-course-sidebar {
                width: 280px;
                flex-shrink: 0;
            }
            .lms-course-sidebar h4 {
                font-size: 14px;
                font-weight: 600;
                color: #475569;
                margin-bottom: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .lms-module-list {
                list-style: none;
                padding: 0;
            }
            .lms-module-list li { margin-bottom: 4px; }
            .lms-module-list .module-item {
                padding: 8px 12px;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 13px;
                color: #475569;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .lms-module-list .module-item:hover { background: #f1f5f9; }
            .lms-module-list .module-item .module-badge {
                font-size: 11px;
                padding: 2px 8px;
                border-radius: 12px;
                background: #e2e8f0;
                color: #64748b;
            }
            .lms-module-list .module-item .module-badge.completed {
                background: #d1fae5;
                color: #065f46;
            }
            .lms-module-list .sub-lessons {
                list-style: none;
                padding-left: 20px;
                margin-top: 4px;
            }
            .lms-module-list .sub-lessons li { margin-bottom: 2px; }
            .lms-module-list .sub-lessons .lesson-item {
                padding: 6px 12px;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 13px;
                color: #64748b;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .lms-module-list .sub-lessons .lesson-item:hover { background: #f1f5f9; }
            .lms-module-list .sub-lessons .lesson-item.active {
                background: #ede9fe;
                color: #4C1D95;
            }
            .lms-module-list .sub-lessons .lesson-item .lesson-icon {
                font-size: 12px;
                width: 20px;
                text-align: center;
            }
            .lms-module-list .sub-lessons .lesson-item .lesson-status {
                margin-left: auto;
                font-size: 12px;
            }
            .lms-module-list .sub-lessons .lesson-item .lesson-status.completed { color: #10b981; }
            .lms-module-list .sub-lessons .lesson-item .lesson-status.locked { color: #94a3b8; }
            .lms-lesson-content { flex: 1; min-height: 400px; }
            .lesson-placeholder {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100%;
                min-height: 300px;
                color: #94a3b8;
                text-align: center;
            }
            .lesson-placeholder i {
                font-size: 48px;
                margin-bottom: 16px;
                color: #cbd5e1;
            }
            .lesson-placeholder h3 {
                font-size: 18px;
                color: #475569;
                margin-bottom: 8px;
            }
            .lesson-placeholder p { color: #94a3b8; max-width: 400px; }
            .lesson-content-wrapper {
                padding: 20px;
                background: #fafbfc;
                border-radius: 12px;
                border: 1px solid #f1f5f9;
            }
            .lesson-content-wrapper .lesson-header { margin-bottom: 20px; }
            .lesson-content-wrapper .lesson-header h2 {
                font-size: 20px;
                font-weight: 700;
                color: #0f172a;
                margin-bottom: 4px;
            }
            .lesson-content-wrapper .lesson-header .lesson-meta {
                font-size: 13px;
                color: #64748b;
            }
            .lesson-content-wrapper .lesson-body { margin-bottom: 20px; }
            .lesson-content-wrapper .lesson-body p {
                margin-bottom: 12px;
                color: #334155;
                line-height: 1.8;
            }
            .lesson-content-wrapper .lesson-body .video-container {
                position: relative;
                padding-bottom: 56.25%;
                height: 0;
                overflow: hidden;
                border-radius: 12px;
                margin: 16px 0;
            }
            .lesson-content-wrapper .lesson-body .video-container iframe {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                border: none;
            }
            .lesson-content-wrapper .lesson-actions {
                display: flex;
                gap: 12px;
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid #e2e8f0;
                flex-wrap: wrap;
            }
            .quiz-question {
                background: #f8fafc;
                padding: 20px;
                border-radius: 12px;
                margin-bottom: 16px;
                border: 1px solid #f1f5f9;
            }
            .quiz-question .question-number {
                font-size: 12px;
                font-weight: 600;
                color: #4C1D95;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 8px;
            }
            .quiz-question .question-text {
                font-size: 15px;
                font-weight: 500;
                color: #0f172a;
                margin-bottom: 12px;
            }
            .quiz-options { display: flex; flex-direction: column; gap: 8px; }
            .quiz-options label {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 10px 16px;
                border-radius: 8px;
                border: 2px solid #e2e8f0;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 14px;
                color: #334155;
            }
            .quiz-options label:hover {
                border-color: #4C1D95;
                background: #f8fafc;
            }
            .quiz-options label.selected {
                border-color: #4C1D95;
                background: #ede9fe;
            }
            .quiz-options label.correct {
                border-color: #10b981;
                background: #d1fae5;
            }
            .quiz-options label.wrong {
                border-color: #ef4444;
                background: #fee2e2;
            }
            .quiz-options label input[type="radio"] {
                accent-color: #4C1D95;
                width: 16px;
                height: 16px;
            }
            .quiz-submit-btn {
                padding: 12px 32px;
                border: none;
                border-radius: 40px;
                background: #4C1D95;
                color: white;
                font-weight: 600;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s;
                margin-top: 20px;
            }
            .quiz-submit-btn:hover { background: #3b0f7a; transform: scale(1.02); }
            .quiz-submit-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                transform: none;
            }
            .quiz-result {
                padding: 20px;
                background: #f8fafc;
                border-radius: 12px;
                border: 2px solid #4C1D95;
                text-align: center;
                margin-top: 20px;
            }
            .quiz-result .score {
                font-size: 48px;
                font-weight: 700;
                color: #4C1D95;
            }
            .quiz-result .feedback { margin-top: 8px; color: #475569; }
            
            @media (max-width: 768px) {
                .lms-layout { flex-direction: column; }
                .lms-sidebar {
                    width: 100%;
                    max-height: 300px;
                    border-right: none;
                    border-bottom: 1px solid #e2e8f0;
                }
                .lms-sidebar-nav { max-height: 200px; }
                .lms-main-content { padding: 16px; }
                .lms-stats-grid { grid-template-columns: repeat(2, 1fr); }
                .lms-course-body { flex-direction: column; }
                .lms-course-sidebar { width: 100%; order: -1; }
                .lms-course-header { flex-direction: column; align-items: flex-start; gap: 12px; }
                .lms-course-progress { width: 100%; }
                .lms-course-progress .progress-bar { flex: 1; }
                .continue-learning-list { grid-template-columns: 1fr; }
            }
            @media (max-width: 480px) {
                .lms-stats-grid { grid-template-columns: 1fr; }
                .stat-card { padding: 12px 16px; }
                .lms-main-content { padding: 12px; }
                .lms-course-header h1 { font-size: 18px; }
            }
        `;
        document.head.appendChild(styles);
    }
    
    // ============================================================
    // LMS - LOAD USER PROGRESS
    // ============================================================
    
    async loadUserProgress() {
        const supabase = this.getSupabaseClient();
        if (!supabase || !this.userId) return;
        
        try {
            const { data, error } = await supabase
                .from('lms_progress')
                .select('*')
                .eq('user_id', this.userId);
            
            if (error) throw error;
            
            if (data) {
                for (const progress of data) {
                    const course = this.courses.find(c => c.id === progress.course_id);
                    if (course) {
                        course.progress = progress.progress;
                    }
                }
            }
            
            // Update UI
            this.renderCoursesSidebar();
            this.renderDashboardStats();
            
        } catch (err) {
            console.error('Error loading progress:', err);
        }
    }
    
    // ============================================================
    // UTILITY FUNCTIONS
    // ============================================================
    
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
            if (b.includes('term 1') || b.includes('trimester 1') || b === '1') return 'tag-block1';
            if (b.includes('term 2') || b.includes('trimester 2') || b === '2') return 'tag-block2';
            if (b.includes('term 3') || b.includes('trimester 3') || b === '3') return 'tag-block3';
            if (b.includes('term 4') || b.includes('trimester 4') || b === '4') return 'tag-block4';
            if (b.includes('term 5') || b.includes('trimester 5') || b === '5') return 'tag-block5';
            if (b.includes('term 6') || b.includes('trimester 6') || b === '6') return 'tag-block5';
            if (b.includes('final') || b.includes('graduating') || b === '7') return 'tag-final';
            return 'tag-general';
        }
        if (b.includes('intro')) return 'tag-intro';
        if (b.includes('block 1') || b.includes('block1') || b === '1') return 'tag-block1';
        if (b.includes('block 2') || b.includes('block2') || b === '2') return 'tag-block2';
        if (b.includes('block 3') || b.includes('block3') || b === '3') return 'tag-block3';
        if (b.includes('block 4') || b.includes('block4') || b === '4') return 'tag-block4';
        if (b.includes('block 5') || b.includes('block5') || b === '5') return 'tag-block5';
        if (b.includes('final')) return 'tag-final';
        return 'tag-general';
    }
    
    getBlockIcon(blockOrTerm, isTVET = false) {
        if (!blockOrTerm) return 'fa-layer-group';
        const b = String(blockOrTerm).toLowerCase();
        if (isTVET) {
            if (b.includes('term 1') || b === '1') return 'fa-flag-checkered';
            if (b.includes('term 2') || b === '2') return 'fa-book';
            if (b.includes('term 3') || b === '3') return 'fa-book-open';
            if (b.includes('term 4') || b === '4') return 'fa-chalkboard-user';
            if (b.includes('term 5') || b === '5') return 'fa-stethoscope';
            if (b.includes('term 6') || b === '6') return 'fa-user-nurse';
            if (b.includes('final') || b === '7') return 'fa-graduation-cap';
            return 'fa-layer-group';
        }
        if (b.includes('intro')) return 'fa-flag-checkered';
        if (b.includes('block 1') || b === '1') return 'fa-book';
        if (b.includes('block 2') || b === '2') return 'fa-book-open';
        if (b.includes('block 3') || b === '3') return 'fa-chalkboard-user';
        if (b.includes('block 4') || b === '4') return 'fa-stethoscope';
        if (b.includes('block 5') || b === '5') return 'fa-user-nurse';
        if (b.includes('final') || b === '6') return 'fa-graduation-cap';
        return 'fa-layer-group';
    }
    
    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
    
    showNotification(title, message) {
        const toast = document.createElement('div');
        toast.className = 'lms-notification';
        toast.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            padding: 16px 24px;
            background: #0f172a;
            color: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 999999;
            max-width: 360px;
            animation: slideUp 0.3s ease;
            font-family: 'Inter', sans-serif;
        `;
        toast.innerHTML = `
            <div style="font-weight:600;margin-bottom:4px;">${title}</div>
            <div style="font-size:14px;color:#94a3b8;">${message}</div>
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
    
    // ============================================================
    // SKELETON & LOADING STATES
    // ============================================================
    
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
            @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
            .skeleton-title { height: 20px; width: 70%; background: #e5e7eb; border-radius: 8px; margin-bottom: 12px; }
            .skeleton-text { height: 14px; width: 100%; background: #e5e7eb; border-radius: 6px; margin-bottom: 8px; }
            .skeleton-text.short { width: 60%; }
            .skeleton-meta { display: flex; gap: 8px; margin-top: 12px; }
            .skeleton-tag { height: 24px; width: 70px; background: #e5e7eb; border-radius: 20px; }
            .skeleton-button { height: 40px; width: 100%; background: #e5e7eb; border-radius: 40px; }
            .skeleton-badge { position: absolute; top: 12px; right: 12px; width: 80px; height: 24px; background: #e5e7eb; border-radius: 20px; }
            .resource-card.skeleton { pointer-events: none; opacity: 0.7; }
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
    }
    
    showEmptyState() {
        if (!this.resourcesGrid) return;
        const isTVET = this.isTVETStudent || this.userProgram === 'tvet';
        const filterType = isTVET ? 'term' : 'block';
        this.resourcesGrid.innerHTML = `
            <div class="empty-state-premium">
                <i class="fas fa-folder-open"></i>
                <h3>No Resources Found</h3>
                <p>No resources match your selected ${filterType} or filters.</p>
                <button onclick="window.resourcesModule?.resetFilters()" class="premium-btn">
                    <i class="fas fa-eye"></i> Reset Filters
                </button>
            </div>
        `;
    }
    
    // ============================================================
    // FILTER FUNCTIONS
    // ============================================================
    
    populateFilters() {
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
        if (this.pastpaperCount) this.pastpaperCount.textContent = pastpaperCount;
    }
    
    updateDashboardResourceCount() {
        const totalResources = this.allResources.length;
        const dashboardResourcesEl = document.getElementById('dashboard-new-resources');
        if (dashboardResourcesEl) dashboardResourcesEl.innerText = totalResources;
    }
    
    updateResourceCount() {
        const countEl = document.getElementById('resource-count-display');
        if (countEl) countEl.textContent = `${this.filteredResources.length} resources`;
    }
    
    filterResourcesByType(type) {
        this.currentResourceType = type;
        const buttons = document.querySelectorAll('.type-tab');
        buttons.forEach(btn => {
            const btnType = btn.getAttribute('data-type');
            if (btnType === type) btn.classList.add('active');
            else btn.classList.remove('active');
        });
        if (this.searchInput) this.searchInput.value = '';
        this.currentSearchTerm = '';
        if (this.typeFilter) this.typeFilter.value = 'all';
        if (this.yearFilter) this.yearFilter.value = 'all';
        this.applyFilters();
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
            if (btn.getAttribute('data-type') === 'all') btn.classList.add('active');
            else btn.classList.remove('active');
        });
        this.applyFilters();
    }
    
    retryLoad() { this.loadResources(); }
    
    // ============================================================
    // RESOURCE OPENING
    // ============================================================
    
    async openResource(resourceId) {
        const resource = this.allResources.find(r => r.id == resourceId);
        if (!resource) {
            this.showNotification('Resource not found', 'error');
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
    
    viewPastPaper(resourceId) {
        this.openResource(resourceId);
    }
    
    // ============================================================
    // HIGH-QUALITY PDF VIEWER
    // ============================================================
    
    async openPDFInModal(resource) {
        try {
            await this.initializePDFJS();
            this.createPDFViewerModal(resource);
            await this.loadPDFInModal(resource.file_url);
        } catch (error) {
            console.error('PDF error:', error);
            this.showNotification('Failed to load PDF: ' + error.message, 'error');
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
            <div class="pdf-modal-container" id="pdf-modal-container">
                <div class="pdf-modal-header">
                    <div class="pdf-modal-title">
                        <i class="fas fa-file-pdf" style="color: #ef4444;"></i>
                        <span>${this.escapeHtml(resource.title)}</span>
                    </div>
                    <div class="pdf-modal-actions">
                        <button class="pdf-modal-btn" id="pdf-fullscreen-btn" title="Fullscreen">
                            <i class="fas fa-expand"></i>
                        </button>
                        <button class="pdf-modal-btn" id="pdf-zoom-in-btn" title="Zoom In">
                            <i class="fas fa-search-plus"></i>
                        </button>
                        <button class="pdf-modal-btn" id="pdf-zoom-out-btn" title="Zoom Out">
                            <i class="fas fa-search-minus"></i>
                        </button>
                        <button class="pdf-modal-btn close-pdf-modal" title="Close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <div class="pdf-modal-body" id="pdf-modal-body">
                    <div id="pdf-loading-modal" class="pdf-loading-modal">
                        <div class="loading-spinner"></div>
                        <p>Loading high-quality document...</p>
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
                        <button class="pdf-nav-btn" id="pdf-first-modal" title="First Page">
                            <i class="fas fa-fast-backward"></i>
                        </button>
                        <button class="pdf-nav-btn" id="pdf-prev-modal" title="Previous Page">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <span class="pdf-page-info">
                            <input type="number" id="pdf-page-modal" value="1" min="1">
                            <span>/</span>
                            <span id="pdf-total-modal">1</span>
                        </span>
                        <button class="pdf-nav-btn" id="pdf-next-modal" title="Next Page">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                        <button class="pdf-nav-btn" id="pdf-last-modal" title="Last Page">
                            <i class="fas fa-fast-forward"></i>
                        </button>
                    </div>
                    <div class="pdf-zoom-info">
                        <span id="pdf-zoom-percent-modal">100%</span>
                    </div>
                    <div class="pdf-protected-badge">
                        <i class="fas fa-lock"></i> Read Only
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
                background: rgba(0,0,0,0.92);
                display: none;
                justify-content: center;
                align-items: center;
                z-index: 100000;
                padding: 10px;
            }
            .pdf-modal-container {
                width: 100%;
                height: 100%;
                max-width: 1200px;
                max-height: 98vh;
                background: #1a1a2e;
                border-radius: 16px;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                box-shadow: 0 20px 60px rgba(0,0,0,0.8);
            }
            .pdf-modal-header {
                padding: 12px 20px;
                background: linear-gradient(135deg, #16213e, #1a1a2e);
                border-bottom: 1px solid rgba(255,255,255,0.1);
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-shrink: 0;
                min-height: 56px;
            }
            .pdf-modal-title {
                display: flex;
                align-items: center;
                gap: 12px;
                color: white;
                font-weight: 500;
                font-size: 14px;
                min-width: 0;
                flex: 1;
            }
            .pdf-modal-title span {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .pdf-modal-title i { font-size: 22px; flex-shrink: 0; }
            .pdf-modal-actions {
                display: flex;
                gap: 6px;
                flex-shrink: 0;
            }
            .pdf-modal-btn {
                background: rgba(255,255,255,0.08);
                border: none;
                color: #94a3b8;
                width: 38px;
                height: 38px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 16px;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .pdf-modal-btn:hover {
                background: #4C1D95;
                color: white;
                transform: scale(1.05);
            }
            .pdf-modal-btn:active { transform: scale(0.95); }
            .pdf-modal-body {
                flex: 1;
                overflow: auto;
                background: #1a1a2e;
                position: relative;
            }
            .pdf-viewer-modal-area {
                display: flex;
                justify-content: center;
                padding: 20px;
                min-height: 100%;
                align-items: flex-start;
                background: #2d2d3a;
            }
            .pdf-canvas-modal {
                box-shadow: 0 4px 30px rgba(0,0,0,0.5);
                background: white;
                border-radius: 4px;
                max-width: 100%;
                height: auto;
                image-rendering: auto;
                -webkit-font-smoothing: antialiased;
            }
            .pdf-modal-footer {
                padding: 10px 20px;
                background: linear-gradient(135deg, #16213e, #1a1a2e);
                border-top: 1px solid rgba(255,255,255,0.1);
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-shrink: 0;
                flex-wrap: wrap;
                gap: 8px;
                min-height: 48px;
            }
            .pdf-nav-controls {
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .pdf-nav-btn {
                background: rgba(255,255,255,0.08);
                border: none;
                color: #94a3b8;
                width: 34px;
                height: 34px;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .pdf-nav-btn:hover:not(:disabled) {
                background: #4C1D95;
                color: white;
            }
            .pdf-nav-btn:disabled {
                opacity: 0.3;
                cursor: not-allowed;
            }
            .pdf-page-info {
                display: flex;
                align-items: center;
                gap: 4px;
                color: #94a3b8;
                font-size: 14px;
                margin: 0 8px;
            }
            #pdf-page-modal {
                width: 44px;
                padding: 4px 6px;
                border-radius: 4px;
                border: 1px solid rgba(255,255,255,0.15);
                text-align: center;
                background: rgba(255,255,255,0.05);
                color: white;
                font-size: 14px;
                font-weight: 500;
            }
            #pdf-page-modal:focus {
                outline: 2px solid #4C1D95;
                border-color: #4C1D95;
            }
            .pdf-zoom-info {
                color: #94a3b8;
                font-size: 13px;
                font-weight: 500;
                min-width: 50px;
                text-align: center;
            }
            .pdf-protected-badge {
                background: rgba(76,29,149,0.25);
                padding: 4px 12px;
                border-radius: 20px;
                color: #a78bfa;
                font-size: 11px;
                display: flex;
                align-items: center;
                gap: 6px;
                white-space: nowrap;
            }
            .loading-spinner {
                width: 48px;
                height: 48px;
                border: 4px solid rgba(255,255,255,0.1);
                border-top-color: #4C1D95;
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
                margin: 0 auto 16px;
            }
            .pdf-loading-modal, .pdf-error-modal {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100%;
                color: white;
                padding: 30px;
            }
            .pdf-error-modal i { font-size: 48px; color: #ef4444; margin-bottom: 16px; }
            .pdf-error-modal h3 { margin: 8px 0; font-size: 20px; }
            .pdf-error-modal p { color: #9ca3af; margin-bottom: 16px; text-align: center; }
            .pdf-error-modal .btn-primary {
                padding: 10px 30px;
                background: #4C1D95;
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                cursor: pointer;
                font-weight: 500;
            }
            .pdf-error-modal .btn-primary:hover { background: #5b21b6; }
            @keyframes spin { to { transform: rotate(360deg); } }
            .pdf-viewer-modal:fullscreen .pdf-modal-container {
                max-width: 100%;
                max-height: 100vh;
                border-radius: 0;
            }
            .pdf-viewer-modal:fullscreen .pdf-modal-body { background: #0a0a1a; }
            .pdf-viewer-modal:fullscreen .pdf-viewer-modal-area {
                background: #0a0a1a;
                padding: 10px;
            }
            @media (max-width: 768px) {
                .pdf-viewer-modal { padding: 5px; }
                .pdf-modal-container { max-height: 100vh; border-radius: 8px; }
                .pdf-modal-header { padding: 8px 12px; min-height: 44px; }
                .pdf-modal-title { font-size: 12px; }
                .pdf-modal-title i { font-size: 18px; }
                .pdf-modal-btn { width: 32px; height: 32px; font-size: 14px; }
                .pdf-viewer-modal-area { padding: 10px; }
                .pdf-modal-footer { padding: 6px 10px; gap: 4px; }
                .pdf-nav-btn { width: 28px; height: 28px; font-size: 12px; }
                #pdf-page-modal { width: 34px; font-size: 12px; }
                .pdf-page-info { font-size: 12px; gap: 2px; margin: 0 4px; }
                .pdf-protected-badge { font-size: 10px; padding: 2px 8px; }
                .pdf-zoom-info { font-size: 11px; min-width: 40px; }
            }
        `;
        document.head.appendChild(styles);
    }
    
    setupPDFModalEvents() {
        const modal = document.getElementById('pdf-viewer-modal');
        const closeBtn = document.querySelector('.close-pdf-modal');
        const fullscreenBtn = document.getElementById('pdf-fullscreen-btn');
        const zoomInBtn = document.getElementById('pdf-zoom-in-btn');
        const zoomOutBtn = document.getElementById('pdf-zoom-out-btn');
        const firstBtn = document.getElementById('pdf-first-modal');
        const prevBtn = document.getElementById('pdf-prev-modal');
        const nextBtn = document.getElementById('pdf-next-modal');
        const lastBtn = document.getElementById('pdf-last-modal');
        const pageInput = document.getElementById('pdf-page-modal');
        
        if (closeBtn) closeBtn.onclick = () => { this.closePDFModal(); };
        if (modal) modal.onclick = (e) => { if (e.target === modal) this.closePDFModal(); };
        if (fullscreenBtn) fullscreenBtn.onclick = () => this.togglePDFFullscreen();
        if (zoomInBtn) zoomInBtn.onclick = () => this.zoomPDF(1.2);
        if (zoomOutBtn) zoomOutBtn.onclick = () => this.zoomPDF(0.8);
        if (firstBtn) firstBtn.onclick = () => this.goToPDFPage(1);
        if (prevBtn) prevBtn.onclick = () => this.goToPDFPage(this.currentPDFPage - 1);
        if (nextBtn) nextBtn.onclick = () => this.goToPDFPage(this.currentPDFPage + 1);
        if (lastBtn) lastBtn.onclick = () => this.goToPDFPage(this.totalPDFPages);
        
        if (pageInput) {
            pageInput.addEventListener('change', () => {
                const page = parseInt(pageInput.value);
                if (page >= 1 && page <= this.totalPDFPages) this.goToPDFPage(page);
            });
        }
    }
    
    togglePDFFullscreen() {
        const modal = document.getElementById('pdf-viewer-modal');
        if (!modal) return;
        
        if (document.fullscreenElement) {
            document.exitFullscreen();
            this.isFullscreen = false;
        } else {
            modal.requestFullscreen().catch(err => {
                this.showNotification('Fullscreen mode not supported', 'warning');
            });
            this.isFullscreen = true;
        }
    }
    
    closePDFModal() {
        const modal = document.getElementById('pdf-viewer-modal');
        if (modal) {
            if (document.fullscreenElement) document.exitFullscreen();
            modal.style.display = 'none';
            this.cleanupPDFModal();
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
                verbosity: 0,
                useSystemFonts: true,
                disableFontFace: false,
                fontExtraProperties: false
            });
            
            this.currentPDFDoc = await loadingTask.promise;
            this.totalPDFPages = this.currentPDFDoc.numPages;
            
            const totalSpan = document.getElementById('pdf-total-modal');
            const pageInput = document.getElementById('pdf-page-modal');
            if (totalSpan) totalSpan.textContent = this.totalPDFPages;
            if (pageInput) pageInput.max = this.totalPDFPages;
            
            if (loadingDiv) loadingDiv.style.display = 'none';
            if (viewerDiv) viewerDiv.style.display = 'flex';
            
            const isMobile = window.innerWidth < 768;
            this.pdfScale = isMobile ? 1.0 : 1.3;
            this.updateZoomDisplay();
            
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
            const containerWidth = viewerArea ? viewerArea.clientWidth - 40 : window.innerWidth - 60;
            const maxWidth = Math.min(containerWidth, 1400);
            
            const viewport = page.getViewport({ scale: 1 });
            let scale = this.pdfScale;
            
            if (this.pdfScale === 1.0) {
                const fitScale = (maxWidth - 20) / viewport.width;
                scale = Math.max(fitScale, 0.8);
            }
            
            const scaledViewport = page.getViewport({ scale: scale });
            const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
            
            canvas.width = scaledViewport.width * dpr;
            canvas.height = scaledViewport.height * dpr;
            canvas.style.width = scaledViewport.width + 'px';
            canvas.style.height = scaledViewport.height + 'px';
            
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            const renderContext = {
                canvasContext: ctx,
                viewport: scaledViewport,
                background: 'white',
                enableWebGL: false,
                renderInteractiveForms: false,
                useSystemFonts: true,
            };
            
            await page.render(renderContext).promise;
            
            this.currentPDFPage = pageNum;
            const pageInput = document.getElementById('pdf-page-modal');
            if (pageInput) pageInput.value = pageNum;
            
            this.updatePDFNavButtons();
            
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
    
    zoomPDF(factor) {
        this.pdfScale = this.pdfScale * factor;
        if (this.pdfScale < 0.5) this.pdfScale = 0.5;
        if (this.pdfScale > 4.0) this.pdfScale = 4.0;
        this.updateZoomDisplay();
        this.renderPDFPage(this.currentPDFPage);
    }
    
    updateZoomDisplay() {
        const percent = Math.round(this.pdfScale * 100);
        const zoomDisplay = document.getElementById('pdf-zoom-percent-modal');
        if (zoomDisplay) zoomDisplay.textContent = percent + '%';
    }
    
    updatePDFNavButtons() {
        const firstBtn = document.getElementById('pdf-first-modal');
        const prevBtn = document.getElementById('pdf-prev-modal');
        const nextBtn = document.getElementById('pdf-next-modal');
        const lastBtn = document.getElementById('pdf-last-modal');
        if (firstBtn) firstBtn.disabled = this.currentPDFPage <= 1;
        if (prevBtn) prevBtn.disabled = this.currentPDFPage <= 1;
        if (nextBtn) nextBtn.disabled = this.currentPDFPage >= this.totalPDFPages;
        if (lastBtn) lastBtn.disabled = this.currentPDFPage >= this.totalPDFPages;
    }
    
    cleanupPDFModal() {
        if (this.currentPDFDoc) {
            this.currentPDFDoc.destroy();
            this.currentPDFDoc = null;
        }
        this.currentPDFPage = 1;
        this.totalPDFPages = 0;
        this.pdfScale = 1.0;
        this.pageRendering = false;
        this.pageNumPending = null;
        this.isFullscreen = false;
    }
    
    // ============================================================
    // IMAGE/VIDEO VIEWER
    // ============================================================
    
    openImageInModal(resource) {
        const modal = document.createElement('div');
        modal.className = 'image-viewer-modal';
        modal.innerHTML = `
            <div class="image-modal-container" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.92);z-index:100000;display:flex;align-items:center;justify-content:center;">
                <div style="background:white;border-radius:12px;max-width:90%;max-height:90%;overflow:hidden;position:relative;">
                    <button class="close-image-modal" style="position:absolute;top:10px;right:10px;background:rgba(0,0,0,0.5);color:white;border:none;width:40px;height:40px;border-radius:50%;font-size:24px;cursor:pointer;z-index:10;display:flex;align-items:center;justify-content:center;">×</button>
                    <div style="padding:20px;max-height:85vh;overflow:auto;">
                        <img src="${resource.file_url}" alt="${this.escapeHtml(resource.title)}" style="max-width:100%;max-height:80vh;display:block;margin:0 auto;">
                        <p style="text-align:center;color:#64748b;font-size:13px;margin-top:12px;"><i class="fas fa-lock"></i> Protected Image - No Download</p>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.querySelector('.close-image-modal').onclick = () => modal.remove();
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    }
    
    openVideoInModal(resource) {
        const modal = document.createElement('div');
        modal.className = 'video-viewer-modal';
        modal.innerHTML = `
            <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.92);z-index:100000;display:flex;align-items:center;justify-content:center;">
                <div style="background:white;border-radius:12px;max-width:90%;max-height:90%;overflow:hidden;position:relative;width:800px;">
                    <button class="close-video-modal" style="position:absolute;top:10px;right:10px;background:rgba(0,0,0,0.5);color:white;border:none;width:40px;height:40px;border-radius:50%;font-size:24px;cursor:pointer;z-index:10;display:flex;align-items:center;justify-content:center;">×</button>
                    <div style="padding:20px;">
                        <video controls controlslist="nodownload" disablepictureinpicture style="width:100%;max-height:70vh;border-radius:8px;">
                            <source src="${resource.file_url}" type="video/mp4">
                            Your browser does not support video playback.
                        </video>
                        <p style="text-align:center;color:#64748b;font-size:13px;margin-top:12px;"><i class="fas fa-lock"></i> Protected Video - No Download</p>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.querySelector('.close-video-modal').onclick = () => modal.remove();
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    }
    
    // ============================================================
    // INITIALIZATION
    // ============================================================
    
    async initialize() {
        console.log('📁 Initializing Student Resources Module with LMS...');
        this.detectUserProgram();
        await this.getUserProfile();
        
        // Check if we should create LMS container
        if (document.querySelector('.nav-links a[data-view="courses"]')) {
            this.createLMSContainer();
        }
        
        let attempts = 0;
        const maxAttempts = 30;
        
        const checkAndInit = async () => {
            attempts++;
            const hasDb = window.db && window.db.supabase;
            const hasUserProfile = window.currentUserProfile || this.userProfile;
            
            if (hasDb && hasUserProfile) {
                console.log('✅ Database and user ready, loading resources...');
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
                            <p>Please refresh the page or contact support.</p>
                            <button onclick="location.reload()" class="premium-btn">
                                <i class="fas fa-sync-alt"></i> Refresh Page
                            </button>
                        </div>
                    `;
                }
            }
        };
        
        if (window.db && typeof window.db.loadUserProfile === 'function' && !window.currentUserProfile) {
            try {
                await window.db.loadUserProfile();
            } catch (e) {
                console.warn('Could not load user profile via db:', e);
            }
        }
        
        checkAndInit();
    }
    
    // ============================================================
    // DOWNLOAD LESSON
    // ============================================================
    
    downloadLesson(courseId, moduleId, lessonId) {
        const course = this.courses.find(c => c.id === courseId);
        if (!course) return;
        
        const module = course.modules?.find(m => m.id === moduleId);
        if (!module) return;
        
        const lesson = module.lessons?.find(l => l.id === lessonId);
        if (!lesson) return;
        
        // Create a text file with lesson content
        const content = `
            ${lesson.title}
            ${'='.repeat(lesson.title.length)}
            
            Course: ${course.title}
            Module: ${module.title}
            Duration: ${lesson.duration || 'N/A'}
            
            ${lesson.content || 'No content available'}
            
            ---
            Downloaded from NCHS Learning Management System
            ${new Date().toLocaleString()}
        `;
        
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${lesson.title.replace(/\s+/g, '_')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('📥 Download Started', `Downloading: ${lesson.title}`);
    }
    
    openFirstLesson(course) {
        if (!course.modules || course.modules.length === 0) return;
        
        const firstModule = course.modules[0];
        if (!firstModule.lessons || firstModule.lessons.length === 0) return;
        
        const firstLesson = firstModule.lessons[0];
        this.openLesson(course.id, firstModule.id, firstLesson.id);
    }
}

// ============================================================
// EXPORT / GLOBAL INITIALIZATION
// ============================================================

let resourcesModule = null;

function initResourcesModule() {
    if (resourcesModule) return resourcesModule;
    
    try {
        resourcesModule = new ResourcesModule();
        resourcesModule.initialize();
        window.resourcesModule = resourcesModule;
        console.log('✅ Resources Module with LMS initialized');
        return resourcesModule;
    } catch (error) {
        console.error('Resources init error:', error);
        return null;
    }
}

// ============================================================
// GLOBAL FUNCTIONS FOR RESOURCES MODULE
// ============================================================

// Filter resources by type (called from HTML onclick)
window.filterStudentResourceType = function(type) {
    if (window.resourcesModule) {
        window.resourcesModule.filterResourcesByType(type);
    } else {
        console.warn('Resources module not initialized yet');
    }
};

// Open resource inline
window.openResourceInline = function(id) {
    if (window.resourcesModule) {
        window.resourcesModule.openResource(id);
    }
};

// Reset filters
window.resetResourceFilters = function() {
    if (window.resourcesModule) {
        window.resourcesModule.resetFilters();
    }
};

// Open LMS course
window.openLMSCourse = function(courseId) {
    if (window.resourcesModule) {
        window.resourcesModule.openCourse(courseId);
    }
};

// Mark lesson complete
window.markLessonComplete = function(courseId, moduleId, lessonId) {
    if (window.resourcesModule) {
        window.resourcesModule.markLessonComplete(courseId, moduleId, lessonId);
    }
};

// Refresh resources
window.refreshResources = function() {
    if (window.resourcesModule) {
        window.resourcesModule.loadResources();
    }
};

// Export for debugging
console.log('✅ Resources global functions registered');
// Auto-initialize
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

console.log('✅ Resources Module with LMS loaded!');
