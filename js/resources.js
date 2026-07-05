// resources.js - Premium Resource Module with Professional Loading States
// Supports: Learning Materials & Past Papers with profile-style loading

class ResourcesModule {
    constructor() {
        // DOM Elements
        this.resourcesGrid = null;
        this.blockFilter = null;
        this.refreshBtn = null;
        this.searchInput = null;
        this.typeFilter = null;
        this.courseFilter = null;
        this.yearFilter = null;
        
        // State variables
        this.currentResources = [];
        this.filteredResources = [];
        this.currentBlockFilter = 'all';
        this.currentResourceType = 'all';
        this.isLoading = false;
        this.supabaseClient = null;
        
        // PDF.js variables
        this.pdfjsLib = null;
        this.pdfjsLoaded = false;
        this.currentPDFDoc = null;
        this.currentPDFPage = 1;
        this.totalPDFPages = 0;
        this.pdfScale = 1.5;
        this.isRendering = false;
        this.pageRendering = false;
        this.pageNumPending = null;
        this.currentResource = null;
        
        // Block mapping
        this.BLOCK_MAPPING = {
            'introductory': ['Introductory', 'Intro', 'Foundation', 'Block 0'],
            'block1': ['Block 1', 'Block1', 'B1'],
            'block2': ['Block 2', 'Block2', 'B2'],
            'block3': ['Block 3', 'Block3', 'B3'],
            'block4': ['Block 4', 'Block4', 'B4'],
            'block5': ['Block 5', 'Block5', 'B5'],
            'final': ['Final', 'Final Block', 'Block 6']
        };
        
        this.initializeElements();
    }
    
    // ==================== INITIALIZATION ====================
    initializeElements() {
        // Get DOM elements
        this.resourcesGrid = document.getElementById('student-resources-grid');
        if (!this.resourcesGrid) this.resourcesGrid = document.getElementById('resources-grid');
        
        this.blockFilter = document.getElementById('student-block-resource-filter');
        this.refreshBtn = document.getElementById('student-refresh-block-resources');
        this.searchInput = document.getElementById('student-resource-search');
        this.typeFilter = document.getElementById('student-resource-type-filter');
        this.courseFilter = document.getElementById('student-course-filter');
        this.yearFilter = document.getElementById('student-year-filter');
        
        // Setup event listeners
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Refresh button
        if (this.refreshBtn) {
            const newRefreshBtn = this.refreshBtn.cloneNode(true);
            this.refreshBtn.parentNode.replaceChild(newRefreshBtn, this.refreshBtn);
            this.refreshBtn = newRefreshBtn;
            this.refreshBtn.addEventListener('click', () => {
                if (this.isLoading) return;
                this.currentBlockFilter = this.blockFilter?.value || 'all';
                this.showSkeletonCards(6);
                this.loadResources();
            });
        }
        
        // Search with debounce
        if (this.searchInput) {
            let debounceTimer;
            this.searchInput.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => this.filterResources(), 500);
            });
        }
        
        // Filter changes
        if (this.typeFilter) {
            this.typeFilter.addEventListener('change', () => this.filterResources());
        }
        
        if (this.courseFilter) {
            this.courseFilter.addEventListener('change', () => this.filterResources());
        }
        
        if (this.yearFilter) {
            this.yearFilter.addEventListener('change', () => this.filterResources());
        }
        
        // Block filter change
        if (this.blockFilter) {
            this.blockFilter.addEventListener('change', () => {
                this.currentBlockFilter = this.blockFilter.value;
                this.filterResources();
            });
        }
    }
    
    // ==================== SUPABASE CLIENT - FIXED ====================
    getSupabaseClient() {
        if (this.supabaseClient) return this.supabaseClient;
        
        // ============================================
        // 🔥 FIX: REUSE EXISTING CONNECTION - NO LEAK!
        // ============================================
        // Try 1: Use connection from login
        if (window.NCHSMLogin && window.NCHSMLogin.supabase) {
            this.supabaseClient = window.NCHSMLogin.supabase;
            console.log('✅ Resources: Using existing connection from login');
            return this.supabaseClient;
        }
        
        // Try 2: Use connection from db
        if (window.db && window.db.supabase && typeof window.db.supabase.from === 'function') {
            this.supabaseClient = window.db.supabase;
            console.log('✅ Resources: Using existing connection from db');
            return this.supabaseClient;
        }
        
        // Try 3: Use global window.supabase
        if (window.supabase && typeof window.supabase.from === 'function') {
            this.supabaseClient = window.supabase;
            if (!window.db) window.db = {};
            window.db.supabase = this.supabaseClient;
            console.log('✅ Resources: Using global window.supabase');
            return this.supabaseClient;
        }
        
        // Try 4: Use config.js if available (fallback - should not happen on dashboard)
        if (window.APP_CONFIG?.SUPABASE_URL && window.APP_CONFIG?.SUPABASE_ANON_KEY) {
            try {
                const { createClient } = window.supabaseJs || window.supabase || {};
                if (createClient) {
                    console.warn('⚠️ Resources: Creating NEW connection (fallback - should not happen)');
                    this.supabaseClient = createClient(
                        window.APP_CONFIG.SUPABASE_URL,
                        window.APP_CONFIG.SUPABASE_ANON_KEY
                    );
                    if (!window.db) window.db = {};
                    window.db.supabase = this.supabaseClient;
                    return this.supabaseClient;
                }
            } catch (e) {
                console.error('Failed to create Supabase client:', e);
            }
        }
        // ============================================
        // END FIX
        // ============================================
        
        console.error('❌ Cannot initialize Supabase client');
        return null;
    }
    
    // ==================== USER PROFILE ====================
    async getUserProfile() {
        // First check if already cached
        if (window.currentUserProfile?.program) {
            console.log('📋 Using cached user profile:', window.currentUserProfile);
            return window.currentUserProfile;
        }
        
        const supabase = this.getSupabaseClient();
        if (!supabase) return {};
        
        try {
            // Try to get from consolidated_user_profiles_table by user_id
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.warn('No authenticated user found');
                return {};
            }
            
            console.log('🔍 Fetching profile for user:', user.id);
            
            // Try to get profile from consolidated_user_profiles_table
            let { data: profile, error } = await supabase
                .from('consolidated_user_profiles_table')
                .select('program, intake_year, block, full_name, role, student_id')
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
                    student_id: profile.student_id
                };
                window.currentUserProfile = correctProfile;
                if (window.db) window.db.currentUserProfile = correctProfile;
                return correctProfile;
            }
            
            // Fallback: try to get from profiles table
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
                ${showRetry ? '<button onclick="location.reload()" class="premium-btn"><i class="fas fa-sync-alt"></i> Refresh Page</button>' : ''}
            </div>
        `;
        
        this.showToast(message, 'error');
    }
    
    showEmptyState() {
        if (!this.resourcesGrid) return;
        
        let emptyMessage = 'No resources match your current filters.';
        if (this.currentResourceType === 'pastpaper') {
            emptyMessage = 'No past papers available for your block. Check back later or contact admin.';
        } else if (this.currentResourceType === 'material') {
            emptyMessage = 'No learning materials available for your block.';
        }
        
        this.resourcesGrid.innerHTML = `
            <div class="empty-state-premium">
                <i class="fas fa-folder-open"></i>
                <h3>No Resources Found</h3>
                <p>${emptyMessage}</p>
                <button onclick="if(window.resourcesModule) window.resourcesModule.resetFilters()" class="premium-btn">
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
            const program = userProfile?.program;
            const intakeYear = userProfile?.intake_year;
            
            if (!program || !intakeYear) {
                this.showError('Missing enrollment details. Please contact admin.');
                this.isLoading = false;
                return;
            }
            
            console.log(`📊 Fetching resources for: ${program} - ${intakeYear}`);
            
            const { data: resources, error } = await supabase
                .from('resources')
                .select('*')
                .eq('program_type', program)
                .eq('intake', intakeYear)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            this.currentResources = resources || [];
            console.log(`✅ Loaded ${this.currentResources.length} resources`);
            
            // Update past paper count badge
            this.updatePastPaperCount();
            
            // Populate course filter
            this.populateCourseFilter();
            
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
    
    filterResources() {
        if (!this.currentResources.length) {
            this.showEmptyState();
            return;
        }
        
        let filtered = [...this.currentResources];
        
        // Filter by resource type
        if (this.currentResourceType !== 'all') {
            filtered = filtered.filter(r => r.resource_type === this.currentResourceType);
        }
        
        // Filter by block
        if (this.currentBlockFilter !== 'all') {
            const targetKeywords = this.BLOCK_MAPPING[this.currentBlockFilter] || [];
            filtered = filtered.filter(resource => {
                const resourceBlock = (resource.block || '').toString().toLowerCase();
                return targetKeywords.some(keyword => resourceBlock.includes(keyword.toLowerCase()));
            });
        }
        
        // Filter by search term
        const searchTerm = this.searchInput?.value.toLowerCase() || '';
        if (searchTerm) {
            filtered = filtered.filter(r => {
                const titleMatch = (r.title || '').toLowerCase().includes(searchTerm);
                const courseMatch = (r.course_name || '').toLowerCase().includes(searchTerm);
                const descMatch = (r.description || '').toLowerCase().includes(searchTerm);
                return titleMatch || courseMatch || descMatch;
            });
        }
        
        // Filter by file type
        const fileTypeFilter = this.typeFilter?.value || 'all';
        if (fileTypeFilter !== 'all') {
            filtered = filtered.filter(r => this.getFileType(r.file_path) === fileTypeFilter);
        }
        
        // Filter by year
        const yearFilter = this.yearFilter?.value || 'all';
        if (yearFilter !== 'all') {
            if (this.currentResourceType === 'pastpaper') {
                filtered = filtered.filter(r => r.pastpaper_year == yearFilter);
            } else {
                filtered = filtered.filter(r => r.intake == yearFilter);
            }
        }
        
        this.filteredResources = filtered;
        this.renderResources();
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
            const typeBadge = isPastPaper ? 
                '<span class="pastpaper-badge"><i class="fas fa-history"></i> Past Paper</span>' : 
                '<span class="material-badge"><i class="fas fa-book"></i> Material</span>';
            
            const yearDisplay = isPastPaper ? resource.pastpaper_year : resource.intake;
            const examTypeDisplay = isPastPaper && resource.exam_type ? this.getExamTypeLabel(resource.exam_type) : '';
            const courseDisplay = isPastPaper && resource.course_name ? `<small class="course-name">📚 ${this.escapeHtml(resource.course_name)}</small>` : '';
            
            html += `
                <div class="resource-card" data-id="${resource.id}">
                    <div class="resource-preview">
                        <div class="preview-icon ${this.getFileType(resource.file_path)}">
                            <i class="${this.getFileIcon(resource.file_path)}"></i>
                        </div>
                        ${typeBadge}
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
                            <span class="meta-tag block-tag ${this.getBlockTagClass(resource.block)}">
                                <i class="fas ${this.getBlockIcon(resource.block)}"></i> ${this.escapeHtml(resource.block || 'General')}
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
    
    // ==================== RESOURCE OPENING ====================
    async openResource(resourceId) {
        const resource = this.currentResources.find(r => r.id == resourceId);
        
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
    
    // ==================== PDF.JS INITIALIZATION ====================
    async initializePDFJS() {
        if (this.pdfjsLoaded) return true;
        
        return new Promise((resolve, reject) => {
            if (typeof window.pdfjsLib !== 'undefined' && window.pdfjsLib) {
                this.pdfjsLib = window.pdfjsLib;
                if (this.pdfjsLib.GlobalWorkerOptions) {
                    this.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                }
                this.pdfjsLoaded = true;
                console.log('✅ PDF.js already loaded and configured');
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
                console.log('✅ PDF.js loaded and configured from CDN');
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
                        <button class="pdf-modal-btn" id="pdf-fullscreen-btn" title="Fullscreen"><i class="fas fa-expand"></i></button>
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
                        <button class="pdf-nav-btn" id="pdf-first-modal"><i class="fas fa-fast-backward"></i></button>
                        <button class="pdf-nav-btn" id="pdf-prev-modal"><i class="fas fa-chevron-left"></i></button>
                        <span class="pdf-page-info">
                            <input type="number" id="pdf-page-modal" value="1" min="1"> / <span id="pdf-total-modal">1</span>
                        </span>
                        <button class="pdf-nav-btn" id="pdf-next-modal"><i class="fas fa-chevron-right"></i></button>
                        <button class="pdf-nav-btn" id="pdf-last-modal"><i class="fas fa-fast-forward"></i></button>
                    </div>
                    <div class="pdf-zoom-controls">
                        <button class="pdf-zoom-btn" id="pdf-zoom-out-modal"><i class="fas fa-search-minus"></i></button>
                        <span id="pdf-zoom-percent-modal">100%</span>
                        <button class="pdf-zoom-btn" id="pdf-zoom-in-modal"><i class="fas fa-search-plus"></i></button>
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
            min-width: 0;
        }
        
        .pdf-modal-title span {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .pdf-modal-title i {
            font-size: 20px;
            color: #ef4444;
            flex-shrink: 0;
        }
        
        .pdf-modal-actions {
            display: flex;
            gap: 10px;
            flex-shrink: 0;
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
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .pdf-modal-btn:hover {
            background: #4C1D95;
        }
        
        .pdf-modal-btn:active {
            transform: scale(0.95);
        }
        
        .pdf-modal-body {
            flex: 1;
            overflow: auto;
            background: #2d2d3a;
            position: relative;
            -webkit-overflow-scrolling: touch;
        }
        
        .pdf-viewer-modal-area {
            display: flex;
            justify-content: center;
            padding: 20px;
            min-height: 100%;
            align-items: flex-start;
        }
        
        /* 🔥 IMPROVED: Better canvas rendering */
        .pdf-canvas-modal {
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            background: white;
            border-radius: 4px;
            max-width: 100%;
            height: auto;
            /* Improved rendering */
            image-rendering: auto;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        
        .pdf-modal-footer {
            padding: 12px 20px;
            background: linear-gradient(135deg, #16213e, #1a1a2e);
            border-top: 1px solid rgba(255,255,255,0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 10px;
            flex-shrink: 0;
        }
        
        .pdf-nav-controls,
        .pdf-zoom-controls {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .pdf-nav-btn,
        .pdf-zoom-btn {
            background: rgba(255,255,255,0.1);
            border: none;
            color: white;
            width: 36px;
            height: 36px;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .pdf-nav-btn:hover,
        .pdf-zoom-btn:hover {
            background: #4C1D95;
        }
        
        .pdf-nav-btn:active,
        .pdf-zoom-btn:active {
            transform: scale(0.95);
        }
        
        .pdf-nav-btn:disabled,
        .pdf-zoom-btn:disabled {
            opacity: 0.3;
            cursor: not-allowed;
            transform: none;
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
            font-weight: 500;
        }
        
        #pdf-page-modal:focus {
            outline: 2px solid #4C1D95;
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
            white-space: nowrap;
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
        
        .pdf-loading-modal,
        .pdf-error-modal {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: white;
            padding: 20px;
        }
        
        .pdf-error-modal i {
            font-size: 48px;
            color: #ef4444;
            margin-bottom: 15px;
        }
        
        .pdf-error-modal h3 {
            margin: 10px 0;
            font-size: 20px;
        }
        
        .pdf-error-modal p {
            color: #9ca3af;
            margin-bottom: 20px;
            text-align: center;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        /* ========== MOBILE OPTIMIZATIONS ========== */
        
        /* Tablets and small screens */
        @media (max-width: 768px) {
            .pdf-modal-container {
                width: 98%;
                height: 95%;
                border-radius: 12px;
            }
            
            .pdf-modal-header {
                padding: 10px 15px;
            }
            
            .pdf-modal-title {
                font-size: 13px;
                max-width: 60%;
            }
            
            .pdf-modal-title i {
                font-size: 18px;
            }
            
            .pdf-nav-btn,
            .pdf-zoom-btn {
                width: 32px;
                height: 32px;
                font-size: 14px;
            }
            
            .pdf-modal-footer {
                padding: 10px 15px;
                flex-direction: column;
                gap: 8px;
            }
            
            .pdf-nav-controls {
                flex-wrap: wrap;
                justify-content: center;
            }
            
            .pdf-page-info {
                font-size: 13px;
            }
            
            #pdf-page-modal {
                width: 40px;
                padding: 4px 6px;
                font-size: 13px;
            }
            
            .pdf-protected-badge {
                font-size: 11px;
                padding: 4px 10px;
            }
            
            .pdf-viewer-modal-area {
                padding: 10px;
            }
            
            /* 🔥 IMPROVED: Better mobile rendering */
            .pdf-canvas-modal {
                image-rendering: -webkit-optimize-contrast;
                image-rendering: crisp-edges;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
            }
        }
        
        /* Small phones */
        @media (max-width: 480px) {
            .pdf-modal-container {
                width: 100%;
                height: 100%;
                border-radius: 0;
            }
            
            .pdf-modal-header {
                padding: 8px 12px;
            }
            
            .pdf-modal-title {
                font-size: 12px;
                max-width: 55%;
            }
            
            .pdf-modal-title i {
                font-size: 16px;
            }
            
            .pdf-modal-btn {
                width: 30px;
                height: 30px;
                font-size: 14px;
            }
            
            .pdf-nav-btn,
            .pdf-zoom-btn {
                width: 28px;
                height: 28px;
                font-size: 12px;
            }
            
            .pdf-modal-footer {
                padding: 8px 10px;
            }
            
            .pdf-page-info {
                font-size: 12px;
            }
            
            #pdf-page-modal {
                width: 35px;
                padding: 3px 4px;
                font-size: 12px;
            }
            
            .pdf-viewer-modal-area {
                padding: 5px;
            }
            
            .pdf-protected-badge {
                font-size: 10px;
                padding: 3px 8px;
            }
        }
        
        /* Landscape phones */
        @media (max-width: 768px) and (orientation: landscape) {
            .pdf-modal-container {
                height: 92%;
                width: 97%;
            }
            
            .pdf-modal-header {
                padding: 6px 12px;
            }
            
            .pdf-modal-title {
                font-size: 12px;
            }
            
            .pdf-modal-footer {
                padding: 6px 12px;
            }
            
            .pdf-viewer-modal-area {
                padding: 5px 10px;
            }
        }
        
        /* High DPI screens (Retina) */
        @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
            .pdf-canvas-modal {
                image-rendering: auto;
            }
        }
        
        /* Dark mode support for system preference */
        @media (prefers-color-scheme: dark) {
            .pdf-modal-body {
                background: #1a1a2e;
            }
        }
    `;
    document.head.appendChild(styles);
}
    
    setupPDFModalEvents() {
        const modal = document.getElementById('pdf-viewer-modal');
        const closeBtn = document.querySelector('.close-pdf-modal');
        const fullscreenBtn = document.getElementById('pdf-fullscreen-btn');
        
        if (closeBtn) closeBtn.onclick = () => { modal.style.display = 'none'; this.cleanupPDFModal(); };
        if (fullscreenBtn) fullscreenBtn.onclick = () => this.togglePDFFullscreen();
        if (modal) modal.onclick = (e) => { if (e.target === modal) { modal.style.display = 'none'; this.cleanupPDFModal(); } };
        
        const firstBtn = document.getElementById('pdf-first-modal');
        const prevBtn = document.getElementById('pdf-prev-modal');
        const nextBtn = document.getElementById('pdf-next-modal');
        const lastBtn = document.getElementById('pdf-last-modal');
        const zoomInBtn = document.getElementById('pdf-zoom-in-modal');
        const zoomOutBtn = document.getElementById('pdf-zoom-out-modal');
        
        if (firstBtn) firstBtn.onclick = () => this.goToPDFPage(1);
        if (prevBtn) prevBtn.onclick = () => this.goToPDFPage(this.currentPDFPage - 1);
        if (nextBtn) nextBtn.onclick = () => this.goToPDFPage(this.currentPDFPage + 1);
        if (lastBtn) lastBtn.onclick = () => this.goToPDFPage(this.totalPDFPages);
        if (zoomInBtn) zoomInBtn.onclick = () => this.zoomPDF(1.2);
        if (zoomOutBtn) zoomOutBtn.onclick = () => this.zoomPDF(0.8);
        
        const pageInput = document.getElementById('pdf-page-modal');
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
        
        // Enhanced PDF loading with better quality settings
        const loadingTask = this.pdfjsLib.getDocument({
            url: pdfUrl,
            cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
            cMapPacked: true,
            verbosity: 0,
            // 🔥 NEW: Better quality settings
            useSystemFonts: true,
            standardFontDataUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/standard_fonts/',
            enableXfa: false, // Disable XFA for better performance
            disableFontFace: false, // Use native fonts
            fontExtraProperties: false, // Reduce font data
        });
        
        this.currentPDFDoc = await loadingTask.promise;
        this.totalPDFPages = this.currentPDFDoc.numPages;
        
        const totalSpan = document.getElementById('pdf-total-modal');
        const pageInput = document.getElementById('pdf-page-modal');
        if (totalSpan) totalSpan.textContent = this.totalPDFPages;
        if (pageInput) pageInput.max = this.totalPDFPages;
        
        if (loadingDiv) loadingDiv.style.display = 'none';
        if (viewerDiv) viewerDiv.style.display = 'flex';
        
        // 🔥 NEW: Set initial scale based on device
        const isMobile = window.innerWidth < 768;
        this.pdfScale = isMobile ? 1.2 : 1.0;
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
        
        // Get container width for responsive sizing
        const viewerArea = document.getElementById('pdf-viewer-modal-area');
        const containerWidth = viewerArea ? viewerArea.clientWidth - 40 : window.innerWidth - 40;
        const maxWidth = Math.min(containerWidth, 1200);
        
        // Calculate base viewport
        const viewport = page.getViewport({ scale: 1 });
        
        // Determine optimal scale
        let scale = this.pdfScale;
        const isMobile = window.innerWidth < 768;
        
        // Auto-fit on mobile with better quality
        if (isMobile && this.pdfScale === 1.0) {
            // Use 1.2x scale for better text clarity on mobile
            const fitScale = ((maxWidth - 20) / viewport.width) * 1.2;
            scale = Math.min(fitScale, 1.8);
        } else if (!isMobile) {
            // Desktop: use higher base scale for crisp text
            scale = Math.max(this.pdfScale, 1.2);
        }
        
        const scaledViewport = page.getViewport({ scale: scale });
        
        // SMART DPR handling
        const dpr = window.devicePixelRatio || 1;
        let effectiveDPR;
        
        if (isMobile) {
            // Mobile: balance quality and performance
            effectiveDPR = Math.min(dpr, 1.5); // Cap at 1.5x for performance
        } else {
            // Desktop: use full DPR but cap at 2x for performance
            effectiveDPR = Math.min(dpr, 2);
        }
        
        // Set canvas with optimal resolution
        canvas.width = scaledViewport.width * effectiveDPR;
        canvas.height = scaledViewport.height * effectiveDPR;
        canvas.style.width = scaledViewport.width + 'px';
        canvas.style.height = scaledViewport.height + 'px';
        
        // Configure canvas for crisp rendering
        ctx.setTransform(effectiveDPR, 0, 0, effectiveDPR, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = isMobile ? 'high' : 'high';
        
        // Render with optimized settings
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
        if (this.pdfScale > 3.0) this.pdfScale = 3.0;
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
    
    togglePDFFullscreen() {
        const container = document.querySelector('.pdf-modal-container');
        if (!container) return;
        if (!document.fullscreenElement) {
            container.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
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
    
    getBlockTagClass(block) {
        if (!block) return 'tag-general';
        const b = block.toLowerCase();
        if (b.includes('intro')) return 'tag-intro';
        if (b.includes('block 1')) return 'tag-block1';
        if (b.includes('block 2')) return 'tag-block2';
        if (b.includes('block 3')) return 'tag-block3';
        if (b.includes('block 4')) return 'tag-block4';
        if (b.includes('block 5')) return 'tag-block5';
        if (b.includes('final')) return 'tag-final';
        return 'tag-general';
    }
    
    getBlockIcon(block) {
        if (!block) return 'fa-layer-group';
        const b = block.toLowerCase();
        if (b.includes('intro')) return 'fa-flag-checkered';
        if (b.includes('block 1')) return 'fa-book';
        if (b.includes('block 2')) return 'fa-book-open';
        if (b.includes('block 3')) return 'fa-chalkboard-user';
        if (b.includes('block 4')) return 'fa-stethoscope';
        if (b.includes('block 5')) return 'fa-user-nurse';
        if (b.includes('final')) return 'fa-graduation-cap';
        return 'fa-layer-group';
    }
    
    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
    
    // ==================== HELPER FUNCTIONS ====================
    updatePastPaperCount() {
        const pastpaperCount = this.currentResources.filter(r => r.resource_type === 'pastpaper').length;
        const badge = document.getElementById('student-pastpaper-count');
        if (badge) badge.textContent = pastpaperCount;
    }
    
    populateCourseFilter() {
        if (!this.courseFilter) return;
        const courses = [...new Set(this.currentResources.map(r => r.program_type).filter(Boolean))];
        this.courseFilter.innerHTML = '<option value="all">All Courses</option>';
        courses.forEach(course => {
            const option = document.createElement('option');
            option.value = course;
            option.textContent = course;
            this.courseFilter.appendChild(option);
        });
    }
    
    updateDashboardResourceCount() {
        const totalResources = this.currentResources.length;
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
        
        // Update button styles
        const buttons = document.querySelectorAll('.type-tab');
        buttons.forEach(btn => {
            const btnType = btn.getAttribute('data-type');
            if (btnType === type) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Reset search and filters
        if (this.searchInput) this.searchInput.value = '';
        if (this.typeFilter) this.typeFilter.value = 'all';
        if (this.yearFilter) this.yearFilter.value = 'all';
        
        this.filterResources();
    }
    
    resetFilters() {
        if (this.blockFilter) this.blockFilter.value = 'all';
        if (this.searchInput) this.searchInput.value = '';
        if (this.typeFilter) this.typeFilter.value = 'all';
        if (this.courseFilter) this.courseFilter.value = 'all';
        if (this.yearFilter) this.yearFilter.value = 'all';
        
        this.currentBlockFilter = 'all';
        this.currentResourceType = 'all';
        
        // Update type tabs
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
        console.log('📁 Initializing Student Resources Module...');
        
        let attempts = 0;
        const maxAttempts = 30;
        
        // First, try to get user profile directly
        const userProfile = await this.getUserProfile();
        
        const checkAndInit = async () => {
            attempts++;
            
            // Check if we have the necessary data
            const hasDb = window.db && window.db.supabase;
            const hasUserProfile = window.currentUserProfile && window.currentUserProfile.program;
            
            if (hasDb && hasUserProfile) {
                console.log('✅ Database and user ready, loading resources...');
                await this.initWithUserProfile(window.currentUserProfile);
            } else if (userProfile && userProfile.program) {
                console.log('✅ User profile found via direct fetch, loading resources...');
                await this.initWithUserProfile(userProfile);
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
                const blockDisplay = document.getElementById('student-current-user-block');
                if (blockDisplay) blockDisplay.textContent = 'Error loading';
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
    
    async initWithUserProfile(userProfile) {
        console.log('👤 User profile loaded:', userProfile);
        
        // Update block display
        const userBlock = userProfile.block || userProfile.current_block || 'Introductory';
        const blockDisplay = document.getElementById('student-current-user-block');
        if (blockDisplay) {
            blockDisplay.textContent = userBlock;
            console.log('✅ Block display updated to:', userBlock);
        }
        
        // Also update dashboard if needed
        const dashboardBlock = document.getElementById('dashboard-current-block-value');
        if (dashboardBlock) {
            dashboardBlock.textContent = userBlock;
        }
        
        const dashboardProgram = document.getElementById('dashboard-program-name');
        if (dashboardProgram && userProfile.program) {
            dashboardProgram.textContent = userProfile.program;
        }
        
        const dashboardIntake = document.getElementById('dashboard-intake-year');
        if (dashboardIntake && userProfile.intake_year) {
            dashboardIntake.textContent = userProfile.intake_year;
        }
        
        // Auto-select user's block in filter
        let userBlockValue = 'all';
        for (const [value, keywords] of Object.entries(this.BLOCK_MAPPING)) {
            if (keywords.some(k => userBlock.toLowerCase().includes(k.toLowerCase()))) {
                userBlockValue = value;
                break;
            }
        }
        
        if (this.blockFilter) {
            if (userBlockValue !== 'all') {
                this.blockFilter.value = userBlockValue;
                this.currentBlockFilter = userBlockValue;
                console.log('✅ Block filter set to:', userBlockValue);
            } else {
                // Try to find matching block by exact name
                const exactMatch = Array.from(this.blockFilter.options).find(opt => 
                    opt.text.toLowerCase().includes(userBlock.toLowerCase())
                );
                if (exactMatch) {
                    this.blockFilter.value = exactMatch.value;
                    this.currentBlockFilter = exactMatch.value;
                    console.log('✅ Block filter set via exact match:', exactMatch.value);
                }
            }
        }
        
        // Load resources
        await this.loadResources();
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
// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => initResourcesModule(), 500);
    });
} else {
    setTimeout(() => initResourcesModule(), 500);
}

// Also initialize when profile is loaded (for dashboard)
document.addEventListener('appReady', () => {
    setTimeout(() => initResourcesModule(), 300);
});

console.log('Resources module loaded with Profile-style loading patterns');
