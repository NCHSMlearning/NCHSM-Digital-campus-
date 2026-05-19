// resources.js - Premium READ-ONLY High-Quality Resource Viewer with Past Papers Support
// Supports: Learning Materials & Past Papers with type filtering

let pdfjsLib = null;
let pdfjsLoaded = false;
let currentPDFDoc = null;
let currentPDFPage = 1;
let totalPDFPages = 0;
let pdfScale = 1.5;
let isRendering = false;
let pageRendering = false;
let pageNumPending = null;
let currentResource = null;

// Global variables
let currentResources = [];
let filteredResources = [];
let currentBlockFilter = 'all';
let currentResourceType = 'all';
let isLoading = false;
let supabaseClient = null;

// ==================== SUPABASE INITIALIZATION ====================
function initSupabaseClient() {
    if (supabaseClient) return supabaseClient;
    
    if (window.db?.supabase && typeof window.db.supabase.from === 'function') {
        console.log('✅ Using existing Supabase client from window.db');
        supabaseClient = window.db.supabase;
        return supabaseClient;
    }
    
    if (window.supabase && typeof window.supabase.from === 'function') {
        console.log('✅ Using existing Supabase client from window.supabase');
        supabaseClient = window.supabase;
        if (!window.db) window.db = {};
        window.db.supabase = supabaseClient;
        return supabaseClient;
    }
    
    if (window.APP_CONFIG?.SUPABASE_URL && window.APP_CONFIG?.SUPABASE_ANON_KEY) {
        try {
            const { createClient } = window.supabaseJs || window.supabase || {};
            if (createClient) {
                console.log('✅ Creating new Supabase client from config');
                supabaseClient = createClient(
                    window.APP_CONFIG.SUPABASE_URL,
                    window.APP_CONFIG.SUPABASE_ANON_KEY
                );
                if (!window.db) window.db = {};
                window.db.supabase = supabaseClient;
                return supabaseClient;
            }
        } catch (e) {
            console.error('Failed to create Supabase client:', e);
        }
    }
    
    console.error('❌ Cannot initialize Supabase client');
    return null;
}

function getSupabaseClient() {
    if (supabaseClient) return supabaseClient;
    return initSupabaseClient();
}

// ==================== USER PROFILE ====================
async function getUserProfile() {
    if (window.currentUserProfile?.program) {
        return window.currentUserProfile;
    }
    
    const supabase = getSupabaseClient();
    if (!supabase) return {};
    
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) return {};
        
        const { data } = await supabase
            .from('consolidated_user_profiles_table')
            .select('program, intake_year, block')
            .eq('email', user.email)
            .single();
        
        if (data) {
            const correctProfile = {
                program: data.program,
                intake_year: data.intake_year,
                block: data.block
            };
            window.currentUserProfile = correctProfile;
            if (window.db) window.db.currentUserProfile = correctProfile;
            return correctProfile;
        }
    } catch (err) {
        console.error('Error loading profile:', err);
    }
    
    return {};
}

// ==================== UPDATE DASHBOARD ====================
function updateDashboardResourceCount() {
    const totalResources = currentResources.length;
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
    
    const event = new CustomEvent('resourcesUpdated', {
        detail: { count: totalResources, resources: currentResources }
    });
    document.dispatchEvent(event);
}

// ==================== PDF.JS INITIALIZATION - FIXED ====================
async function initializePDFJS() {
    if (pdfjsLoaded) return true;
    
    return new Promise((resolve, reject) => {
        // Check if PDF.js is already available
        if (typeof window.pdfjsLib !== 'undefined' && window.pdfjsLib) {
            pdfjsLib = window.pdfjsLib;
            // Force worker configuration - check if GlobalWorkerOptions exists
            if (pdfjsLib.GlobalWorkerOptions) {
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            }
            pdfjsLoaded = true;
            console.log('✅ PDF.js already loaded and configured');
            resolve(true);
            return;
        }
        
        // If not available, load it
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => {
            pdfjsLib = window.pdfjsLib;
            if (pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            }
            pdfjsLoaded = true;
            console.log('✅ PDF.js loaded and configured from CDN');
            resolve(true);
        };
        script.onerror = () => reject(new Error('Failed to load PDF.js'));
        document.head.appendChild(script);
    });
}

// ==================== BLOCK FILTER FUNCTIONS ====================
const BLOCK_MAPPING = {
    'introductory': ['Introductory', 'Intro', 'Foundation', 'Block 0'],
    'block1': ['Block 1', 'Block1', 'B1'],
    'block2': ['Block 2', 'Block2', 'B2'],
    'block3': ['Block 3', 'Block3', 'B3'],
    'block4': ['Block 4', 'Block4', 'B4'],
    'block5': ['Block 5', 'Block5', 'B5'],
    'final': ['Final', 'Final Block', 'Block 6']
};

function getAllBlocks() {
    return [
        { value: 'all', label: '📚 All Blocks', icon: 'fa-layer-group' },
        { value: 'introductory', label: '🎓 Introductory Block', icon: 'fa-flag-checkered' },
        { value: 'block1', label: '📖 Block 1', icon: 'fa-book' },
        { value: 'block2', label: '📗 Block 2', icon: 'fa-book-open' },
        { value: 'block3', label: '📘 Block 3', icon: 'fa-chalkboard-user' },
        { value: 'block4', label: '📙 Block 4', icon: 'fa-stethoscope' },
        { value: 'block5', label: '📕 Block 5', icon: 'fa-user-nurse' },
        { value: 'final', label: '🏆 Final Block', icon: 'fa-graduation-cap' }
    ];
}

// ==================== RESOURCE TYPE FILTERING ====================
function filterResourcesByType(type) {
    currentResourceType = type;
    
    // Update button styles
    const buttons = document.querySelectorAll('.type-tab');
    buttons.forEach(function(btn) {
        var btnType = btn.getAttribute('data-type');
        if (btnType === type) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Update past paper count badge
    if (type === 'pastpaper') {
        var pastpaperCount = currentResources.filter(function(r) { return r.resource_type === 'pastpaper'; }).length;
        var badge = document.getElementById('student-pastpaper-count');
        if (badge) badge.textContent = pastpaperCount;
    }
    
    // Reset search
    var searchInput = document.getElementById('student-resource-search');
    if (searchInput) searchInput.value = '';
    
    // Re-filter resources
    filterResourcesByBlock();
}

window.filterStudentResourceType = filterResourcesByType;

async function createBlockFilterUI() {
    var resourcesHeader = document.querySelector('#resources .resources-header');
    if (!resourcesHeader) return;
    
    var existingFilter = document.getElementById('student-block-resource-filter');
    if (existingFilter) return;
    
    var userProfile = await getUserProfile();
    var userBlock = userProfile?.block || 'Introductory';
    
    var blockDisplay = document.getElementById('student-current-user-block');
    if (blockDisplay) blockDisplay.textContent = userBlock;
    
    var refreshBtn = document.getElementById('student-refresh-block-resources');
    var blockFilter = document.getElementById('student-block-resource-filter');
    
    if (refreshBtn) {
        var newRefreshBtn = refreshBtn.cloneNode(true);
        refreshBtn.parentNode.replaceChild(newRefreshBtn, refreshBtn);
        newRefreshBtn.addEventListener('click', async function() {
            if (isLoading) return;
            currentBlockFilter = blockFilter ? blockFilter.value : 'all';
            await loadAllResourcesForBlocks();
            showToast('📚 Loaded ' + filteredResources.length + ' resources', 'success');
        });
    }
    
    if (blockFilter) {
        var userBlockValue = 'all';
        for (var value in BLOCK_MAPPING) {
            var keywords = BLOCK_MAPPING[value];
            if (keywords.some(function(k) { return userBlock.toLowerCase().includes(k.toLowerCase()); })) {
                userBlockValue = value;
                break;
            }
        }
        if (userBlockValue !== 'all') {
            blockFilter.value = userBlockValue;
            currentBlockFilter = userBlockValue;
        }
        
        blockFilter.addEventListener('change', function() {
            currentBlockFilter = blockFilter.value;
        });
    }
}

// ==================== RESOURCE LOADING ====================
async function loadAllResourcesForBlocks() {
    if (isLoading) return;
    
    console.log('📁 Loading read-only resources with past papers...');
    
    var userProfile = await getUserProfile();
    var supabaseClient = getSupabaseClient();
    
    var resourcesGrid = document.getElementById('student-resources-grid');
    if (!resourcesGrid) resourcesGrid = document.getElementById('resources-grid');
    
    if (!supabaseClient) {
        if (resourcesGrid) showError(resourcesGrid, 'Database connection error');
        return;
    }
    
    if (!resourcesGrid) return;
    
    isLoading = true;
    showLoading(resourcesGrid, 'Loading resources...');
    currentResources = [];
    
    try {
        var program = userProfile?.program;
        var intakeYear = userProfile?.intake_year;
        
        if (!program || !intakeYear) {
            resourcesGrid.innerHTML = '<div class="error-state premium">Missing enrollment details. Please contact admin.</div>';
            isLoading = false;
            return;
        }
        
        console.log('📊 Fetching resources for: ' + program + ' - ' + intakeYear);
        
        var query = supabaseClient
            .from('resources')
            .select('id, title, file_path, file_url, program_type, block, intake, uploaded_by_name, created_at, description, file_type, resource_type, pastpaper_year, exam_type, course_name')
            .eq('program_type', program)
            .eq('intake', intakeYear)
            .order('created_at', { ascending: false });
        
        var result = await query;
        var resources = result.data;
        var error = result.error;
        
        if (error) throw error;
        
        currentResources = resources || [];
        console.log('✅ Loaded ' + currentResources.length + ' resources');
        
        var pastpaperCount = currentResources.filter(function(r) { return r.resource_type === 'pastpaper'; }).length;
        var badge = document.getElementById('student-pastpaper-count');
        if (badge) badge.textContent = pastpaperCount;
        
        var filtered = [...currentResources];
        
        if (currentResourceType !== 'all') {
            filtered = filtered.filter(function(resource) { return resource.resource_type === currentResourceType; });
        }
        
        if (currentBlockFilter !== 'all') {
            var targetKeywords = BLOCK_MAPPING[currentBlockFilter] || [];
            filtered = filtered.filter(function(resource) {
                var resourceBlock = (resource.block || '').toString().toLowerCase();
                return targetKeywords.some(function(keyword) { return resourceBlock.includes(keyword.toLowerCase()); });
            });
        }
        
        var searchTerm = document.getElementById('student-resource-search')?.value.toLowerCase() || '';
        if (searchTerm) {
            filtered = filtered.filter(function(r) {
                var titleMatch = (r.title || '').toLowerCase().includes(searchTerm);
                var courseMatch = (r.course_name || '').toLowerCase().includes(searchTerm);
                var descMatch = (r.description || '').toLowerCase().includes(searchTerm);
                return titleMatch || courseMatch || descMatch;
            });
        }
        
        var fileTypeFilter = document.getElementById('student-resource-type-filter')?.value || 'all';
        if (fileTypeFilter !== 'all') {
            filtered = filtered.filter(function(r) { return getFileType(r.file_path) === fileTypeFilter; });
        }
        
        var yearFilter = document.getElementById('student-year-filter')?.value || 'all';
        if (yearFilter !== 'all') {
            if (currentResourceType === 'pastpaper') {
                filtered = filtered.filter(function(r) { return r.pastpaper_year == yearFilter; });
            } else {
                filtered = filtered.filter(function(r) { return r.intake == yearFilter; });
            }
        }
        
        filteredResources = filtered;
        renderResourcesGrid();
        updateDashboardResourceCount();
        
    } catch (err) {
        console.error('Error loading resources:', err);
        showError(resourcesGrid, 'Error: ' + err.message);
    } finally {
        isLoading = false;
    }
}

function renderResourcesGrid() {
    var resourcesGrid = document.getElementById('student-resources-grid');
    if (!resourcesGrid) resourcesGrid = document.getElementById('resources-grid');
    if (!resourcesGrid) return;
    
    if (filteredResources.length === 0) {
        var emptyMessage = 'No resources match your current filters.';
        if (currentResourceType === 'pastpaper') {
            emptyMessage = 'No past papers available for your block. Check back later or contact admin.';
        } else if (currentResourceType === 'material') {
            emptyMessage = 'No learning materials available for your block.';
        }
        
        resourcesGrid.innerHTML = '<div class="empty-state premium">' +
            '<i class="fas fa-folder-open"></i>' +
            '<h3>No Resources Found</h3>' +
            '<p>' + emptyMessage + '</p>' +
            '<button onclick="location.reload()" class="premium-btn">' +
            '<i class="fas fa-sync-alt"></i> Refresh</button>' +
            '</div>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < filteredResources.length; i++) {
        var resource = filteredResources[i];
        var isPastPaper = resource.resource_type === 'pastpaper';
        var typeBadge = isPastPaper ? 
            '<span class="pastpaper-badge"><i class="fas fa-history"></i> Past Paper</span>' : 
            '<span class="material-badge"><i class="fas fa-book"></i> Material</span>';
        
        var yearDisplay = isPastPaper ? resource.pastpaper_year : resource.intake;
        var examTypeDisplay = isPastPaper && resource.exam_type ? getExamTypeLabel(resource.exam_type) : '';
        var courseDisplay = isPastPaper && resource.course_name ? '<br><small class="course-name">📚 ' + escapeHtml(resource.course_name) + '</small>' : '';
        
        html += '<div class="resource-card premium-card" data-id="' + resource.id + '">' +
            '<div class="resource-preview">' +
            '<div class="preview-icon ' + getFileType(resource.file_path) + '">' +
            '<i class="' + getFileIcon(resource.file_path) + '"></i>' +
            '</div>' +
            typeBadge +
            '</div>' +
            '<div class="resource-details">' +
            '<h3 class="resource-title">' + escapeHtml(resource.title) + courseDisplay + '</h3>' +
            '<p class="resource-description">' + escapeHtml(resource.description || 'No description available') + '</p>' +
            '<div class="resource-meta">' +
            '<span class="meta-tag year-tag">' +
            '<i class="fas fa-calendar"></i> ' + escapeHtml(yearDisplay || 'N/A') +
            '</span>';
        
        if (isPastPaper && examTypeDisplay) {
            html += '<span class="meta-tag exam-type-tag">' +
                '<i class="fas fa-file-alt"></i> ' + examTypeDisplay +
                '</span>';
        }
        
        html += '<span class="meta-tag block-tag ' + getBlockTagClass(resource.block) + '">' +
            '<i class="fas ' + getBlockIcon(resource.block) + '"></i> ' + escapeHtml(resource.block || 'General') +
            '</span>' +
            '<span class="meta-tag read-only-badge">' +
            '<i class="fas fa-eye"></i> Read Only' +
            '</span>' +
            '</div>' +
            '</div>' +
            '<div class="resource-actions">' +
            '<button class="action-btn view-btn" onclick="openResourceInline(' + resource.id + ')">' +
            '<i class="fas fa-eye"></i> Read Now' +
            '</button>' +
            '</div>' +
            '</div>';
    }
    
    resourcesGrid.innerHTML = html;
}

function getExamTypeLabel(examType) {
    var labels = {
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

function getBlockTagClass(block) {
    if (!block) return 'tag-general';
    var b = block.toLowerCase();
    if (b.includes('intro')) return 'tag-intro';
    if (b.includes('block 1')) return 'tag-block1';
    if (b.includes('block 2')) return 'tag-block2';
    if (b.includes('block 3')) return 'tag-block3';
    if (b.includes('block 4')) return 'tag-block4';
    if (b.includes('block 5')) return 'tag-block5';
    if (b.includes('final')) return 'tag-final';
    return 'tag-general';
}

function getBlockIcon(block) {
    if (!block) return 'fa-layer-group';
    var b = block.toLowerCase();
    if (b.includes('intro')) return 'fa-flag-checkered';
    if (b.includes('block 1')) return 'fa-book';
    if (b.includes('block 2')) return 'fa-book-open';
    if (b.includes('block 3')) return 'fa-chalkboard-user';
    if (b.includes('block 4')) return 'fa-stethoscope';
    if (b.includes('block 5')) return 'fa-user-nurse';
    if (b.includes('final')) return 'fa-graduation-cap';
    return 'fa-layer-group';
}

// ==================== RESOURCE VIEWER ====================
async function openResourceInline(resourceId) {
    var resource = null;
    for (var i = 0; i < currentResources.length; i++) {
        if (currentResources[i].id == resourceId) {
            resource = currentResources[i];
            break;
        }
    }
    
    if (!resource) {
        showToast('Resource not found', 'error');
        return;
    }
    currentResource = resource;
    
    var fileType = getFileType(resource.file_path);
    
    if (fileType === 'pdf') {
        await openPDFInModal(resource);
    } else if (fileType === 'image') {
        openImageInModal(resource);
    } else if (fileType === 'video') {
        openVideoInModal(resource);
    } else {
        window.open(resource.file_url, '_blank');
    }
}

window.openResource = openResourceInline;

async function openPDFInModal(resource) {
    try {
        await initializePDFJS();
        createPDFViewerModal(resource);
        await loadPDFInModal(resource.file_url);
    } catch (error) {
        console.error('PDF error:', error);
        showToast('Failed to load PDF: ' + error.message, 'error');
    }
}

function createPDFViewerModal(resource) {
    var existingModal = document.getElementById('pdf-viewer-modal');
    if (existingModal) existingModal.remove();
    
    var modal = document.createElement('div');
    modal.id = 'pdf-viewer-modal';
    modal.className = 'pdf-viewer-modal';
    modal.innerHTML = '<div class="pdf-modal-container">' +
        '<div class="pdf-modal-header">' +
        '<div class="pdf-modal-title">' +
        '<i class="fas fa-file-pdf"></i>' +
        '<span>' + escapeHtml(resource.title) + '</span>' +
        '</div>' +
        '<div class="pdf-modal-actions">' +
        '<button class="pdf-modal-btn" id="pdf-fullscreen-btn" title="Fullscreen"><i class="fas fa-expand"></i></button>' +
        '<button class="pdf-modal-btn close-pdf-modal" title="Close"><i class="fas fa-times"></i></button>' +
        '</div>' +
        '</div>' +
        '<div class="pdf-modal-body">' +
        '<div id="pdf-loading-modal" class="pdf-loading-modal">' +
        '<div class="loading-spinner"></div>' +
        '<p>Loading document...</p>' +
        '</div>' +
        '<div id="pdf-error-modal" class="pdf-error-modal" style="display: none;">' +
        '<i class="fas fa-exclamation-triangle"></i>' +
        '<h3>Failed to Load Document</h3>' +
        '<p id="pdf-error-message-modal"></p>' +
        '<button id="retry-pdf-modal" class="btn-primary">Retry</button>' +
        '</div>' +
        '<div id="pdf-viewer-modal-area" class="pdf-viewer-modal-area" style="display: none;">' +
        '<canvas id="pdf-canvas-modal" class="pdf-canvas-modal"></canvas>' +
        '</div>' +
        '</div>' +
        '<div class="pdf-modal-footer">' +
        '<div class="pdf-nav-controls">' +
        '<button class="pdf-nav-btn" id="pdf-first-modal" title="First Page"><i class="fas fa-fast-backward"></i></button>' +
        '<button class="pdf-nav-btn" id="pdf-prev-modal" title="Previous"><i class="fas fa-chevron-left"></i></button>' +
        '<span class="pdf-page-info">' +
        '<input type="number" id="pdf-page-modal" value="1" min="1"> / <span id="pdf-total-modal">1</span>' +
        '</span>' +
        '<button class="pdf-nav-btn" id="pdf-next-modal" title="Next"><i class="fas fa-chevron-right"></i></button>' +
        '<button class="pdf-nav-btn" id="pdf-last-modal" title="Last Page"><i class="fas fa-fast-forward"></i></button>' +
        '</div>' +
        '<div class="pdf-zoom-controls">' +
        '<button class="pdf-zoom-btn" id="pdf-zoom-out-modal"><i class="fas fa-search-minus"></i></button>' +
        '<span id="pdf-zoom-percent-modal">100%</span>' +
        '<button class="pdf-zoom-btn" id="pdf-zoom-in-modal"><i class="fas fa-search-plus"></i></button>' +
        '</div>' +
        '<div class="pdf-protected-badge">' +
        '<i class="fas fa-lock"></i> Read Only - No Download' +
        '</div>' +
        '</div>' +
        '</div>';
    
    document.body.appendChild(modal);
    addPDFModalStyles();
    setupPDFModalEvents();
    modal.style.display = 'flex';
}

function addPDFModalStyles() {
    if (document.getElementById('pdf-modal-styles')) return;
    
    var styles = document.createElement('style');
    styles.id = 'pdf-modal-styles';
    styles.textContent = '.pdf-viewer-modal{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.95);display:none;justify-content:center;align-items:center;z-index:100000;}' +
        '.pdf-modal-container{width:95%;height:90%;background:#1a1a2e;border-radius:16px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.5);}' +
        '.pdf-modal-header{padding:12px 20px;background:linear-gradient(135deg,#16213e,#1a1a2e);border-bottom:1px solid rgba(255,255,255,0.1);display:flex;justify-content:space-between;align-items:center;}' +
        '.pdf-modal-title{display:flex;align-items:center;gap:10px;color:white;font-weight:500;}' +
        '.pdf-modal-title i{font-size:20px;color:#ef4444;}' +
        '.pdf-modal-actions{display:flex;gap:10px;}' +
        '.pdf-modal-btn{background:rgba(255,255,255,0.1);border:none;color:white;width:36px;height:36px;border-radius:8px;cursor:pointer;font-size:16px;}' +
        '.pdf-modal-btn:hover{background:#4C1D95;}' +
        '.pdf-modal-body{flex:1;overflow:auto;background:#2d2d3a;position:relative;}' +
        '.pdf-viewer-modal-area{display:flex;justify-content:center;padding:20px;min-height:100%;}' +
        '.pdf-canvas-modal{box-shadow:0 4px 20px rgba(0,0,0,0.3);background:white;border-radius:4px;max-width:100%;height:auto;}' +
        '.pdf-modal-footer{padding:12px 20px;background:linear-gradient(135deg,#16213e,#1a1a2e);border-top:1px solid rgba(255,255,255,0.1);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;}' +
        '.pdf-nav-controls,.pdf-zoom-controls{display:flex;align-items:center;gap:8px;}' +
        '.pdf-nav-btn,.pdf-zoom-btn{background:rgba(255,255,255,0.1);border:none;color:white;width:36px;height:36px;border-radius:6px;cursor:pointer;}' +
        '.pdf-nav-btn:hover,.pdf-zoom-btn:hover{background:#4C1D95;}' +
        '.pdf-page-info{display:flex;align-items:center;gap:8px;color:white;}' +
        '#pdf-page-modal{width:50px;padding:6px;border-radius:6px;border:none;text-align:center;}' +
        '.pdf-protected-badge{background:rgba(76,29,149,0.3);padding:6px 12px;border-radius:20px;color:#a78bfa;font-size:12px;}' +
        '.loading-spinner{width:40px;height:40px;border:3px solid rgba(255,255,255,0.2);border-top-color:#4C1D95;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 15px;}' +
        '@keyframes spin{to{transform:rotate(360deg);}}' +
        '@media (max-width:768px){.pdf-modal-container{width:98%;height:95%;}.pdf-nav-btn,.pdf-zoom-btn{width:32px;height:32px;}.pdf-modal-footer{padding:10px 15px;}}';
    document.head.appendChild(styles);
}

function setupPDFModalEvents() {
    var modal = document.getElementById('pdf-viewer-modal');
    var closeBtn = document.querySelector('.close-pdf-modal');
    var fullscreenBtn = document.getElementById('pdf-fullscreen-btn');
    
    if (closeBtn) closeBtn.onclick = function() { modal.style.display = 'none'; cleanupPDFModal(); };
    if (fullscreenBtn) fullscreenBtn.onclick = togglePDFFullscreen;
    if (modal) modal.onclick = function(e) { if (e.target === modal) { modal.style.display = 'none'; cleanupPDFModal(); } };
    
    var firstBtn = document.getElementById('pdf-first-modal');
    var prevBtn = document.getElementById('pdf-prev-modal');
    var nextBtn = document.getElementById('pdf-next-modal');
    var lastBtn = document.getElementById('pdf-last-modal');
    var zoomInBtn = document.getElementById('pdf-zoom-in-modal');
    var zoomOutBtn = document.getElementById('pdf-zoom-out-modal');
    
    if (firstBtn) firstBtn.onclick = function() { goToPDFModalPage(1); };
    if (prevBtn) prevBtn.onclick = function() { goToPDFModalPage(currentPDFPage - 1); };
    if (nextBtn) nextBtn.onclick = function() { goToPDFModalPage(currentPDFPage + 1); };
    if (lastBtn) lastBtn.onclick = function() { goToPDFModalPage(totalPDFPages); };
    if (zoomInBtn) zoomInBtn.onclick = function() { zoomPDFModal(1.2); };
    if (zoomOutBtn) zoomOutBtn.onclick = function() { zoomPDFModal(0.8); };
    
    var pageInput = document.getElementById('pdf-page-modal');
    if (pageInput) {
        pageInput.addEventListener('change', function() {
            var page = parseInt(pageInput.value);
            if (page >= 1 && page <= totalPDFPages) goToPDFModalPage(page);
        });
    }
}

async function loadPDFInModal(pdfUrl) {
    try {
        var loadingDiv = document.getElementById('pdf-loading-modal');
        var errorDiv = document.getElementById('pdf-error-modal');
        var viewerDiv = document.getElementById('pdf-viewer-modal-area');
        
        if (loadingDiv) loadingDiv.style.display = 'flex';
        if (errorDiv) errorDiv.style.display = 'none';
        if (viewerDiv) viewerDiv.style.display = 'none';
        
        var loadingTask = pdfjsLib.getDocument({ 
            url: pdfUrl, 
            cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
            cMapPacked: true,
            verbosity: 0
        });
        currentPDFDoc = await loadingTask.promise;
        totalPDFPages = currentPDFDoc.numPages;
        
        var totalSpan = document.getElementById('pdf-total-modal');
        var pageInput = document.getElementById('pdf-page-modal');
        if (totalSpan) totalSpan.textContent = totalPDFPages;
        if (pageInput) pageInput.max = totalPDFPages;
        
        if (loadingDiv) loadingDiv.style.display = 'none';
        if (viewerDiv) viewerDiv.style.display = 'flex';
        pdfScale = 1.0;
        updateZoomDisplayModal();
        await renderPDFModalPage(1);
    } catch (error) {
        console.error('PDF loading error:', error);
        var loadingDiv = document.getElementById('pdf-loading-modal');
        var errorDiv = document.getElementById('pdf-error-modal');
        var errorMsg = document.getElementById('pdf-error-message-modal');
        var retryBtn = document.getElementById('retry-pdf-modal');
        
        if (loadingDiv) loadingDiv.style.display = 'none';
        if (errorDiv) errorDiv.style.display = 'flex';
        if (errorMsg) errorMsg.textContent = error.message;
        if (retryBtn) retryBtn.onclick = function() { loadPDFInModal(pdfUrl); };
    }
}

async function renderPDFModalPage(pageNum) {
    if (!currentPDFDoc || pageNum < 1 || pageNum > totalPDFPages) return;
    if (pageRendering) { pageNumPending = pageNum; return; }
    pageRendering = true;
    
    try {
        var page = await currentPDFDoc.getPage(pageNum);
        var canvas = document.getElementById('pdf-canvas-modal');
        if (!canvas) { pageRendering = false; return; }
        var ctx = canvas.getContext('2d', { alpha: false });
        var viewport = page.getViewport({ scale: pdfScale });
        var pixelRatio = window.devicePixelRatio || 1;
        canvas.width = viewport.width * pixelRatio;
        canvas.height = viewport.height * pixelRatio;
        canvas.style.width = viewport.width + 'px';
        canvas.style.height = viewport.height + 'px';
        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        
        await page.render({ canvasContext: ctx, viewport: viewport, background: 'white' }).promise;
        
        currentPDFPage = pageNum;
        var pageInput = document.getElementById('pdf-page-modal');
        if (pageInput) pageInput.value = pageNum;
        updatePDFModalNavButtons();
    } catch (error) {
        console.error('Render error:', error);
    }
    
    pageRendering = false;
    if (pageNumPending !== null) { renderPDFModalPage(pageNumPending); pageNumPending = null; }
}

function goToPDFModalPage(pageNum) {
    if (pageNum < 1) pageNum = 1;
    if (pageNum > totalPDFPages) pageNum = totalPDFPages;
    renderPDFModalPage(pageNum);
}

function zoomPDFModal(factor) {
    pdfScale = pdfScale * factor;
    if (pdfScale < 0.5) pdfScale = 0.5;
    if (pdfScale > 3.0) pdfScale = 3.0;
    updateZoomDisplayModal();
    renderPDFModalPage(currentPDFPage);
}

function updateZoomDisplayModal() {
    var percent = Math.round(pdfScale * 100);
    var zoomDisplay = document.getElementById('pdf-zoom-percent-modal');
    if (zoomDisplay) zoomDisplay.textContent = percent + '%';
}

function updatePDFModalNavButtons() {
    var firstBtn = document.getElementById('pdf-first-modal');
    var prevBtn = document.getElementById('pdf-prev-modal');
    var nextBtn = document.getElementById('pdf-next-modal');
    var lastBtn = document.getElementById('pdf-last-modal');
    if (firstBtn) firstBtn.disabled = currentPDFPage <= 1;
    if (prevBtn) prevBtn.disabled = currentPDFPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPDFPage >= totalPDFPages;
    if (lastBtn) lastBtn.disabled = currentPDFPage >= totalPDFPages;
}

function togglePDFFullscreen() {
    var container = document.querySelector('.pdf-modal-container');
    if (!container) return;
    if (!document.fullscreenElement) {
        container.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

function cleanupPDFModal() {
    if (currentPDFDoc) {
        currentPDFDoc.destroy();
        currentPDFDoc = null;
    }
    currentPDFPage = 1;
    totalPDFPages = 0;
    pdfScale = 1.0;
    pageRendering = false;
    pageNumPending = null;
}

function openImageInModal(resource) {
    var modal = document.createElement('div');
    modal.className = 'image-viewer-modal';
    modal.innerHTML = '<div class="image-modal-container">' +
        '<div class="image-modal-header">' +
        '<span>' + escapeHtml(resource.title) + '</span>' +
        '<button class="close-image-modal"><i class="fas fa-times"></i></button>' +
        '</div>' +
        '<div class="image-modal-body">' +
        '<img src="' + resource.file_url + '" alt="' + escapeHtml(resource.title) + '">' +
        '</div>' +
        '<div class="image-modal-footer">' +
        '<i class="fas fa-lock"></i> Protected Image - No Download' +
        '</div>' +
        '</div>';
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    modal.querySelector('.close-image-modal').onclick = function() { modal.remove(); };
    modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
}

function openVideoInModal(resource) {
    var modal = document.createElement('div');
    modal.className = 'video-viewer-modal';
    modal.innerHTML = '<div class="video-modal-container">' +
        '<div class="video-modal-header">' +
        '<span>' + escapeHtml(resource.title) + '</span>' +
        '<button class="close-video-modal"><i class="fas fa-times"></i></button>' +
        '</div>' +
        '<div class="video-modal-body">' +
        '<video controls controlslist="nodownload" disablepictureinpicture>' +
        '<source src="' + resource.file_url + '" type="video/mp4">' +
        'Your browser does not support video playback.' +
        '</video>' +
        '</div>' +
        '<div class="video-modal-footer">' +
        '<i class="fas fa-lock"></i> Protected Video - No Download' +
        '</div>' +
        '</div>';
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    modal.querySelector('.close-video-modal').onclick = function() { modal.remove(); };
    modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
}

window.filterStudentResources = function() {
    loadAllResourcesForBlocks();
};

// ==================== UTILITY FUNCTIONS ====================
function getFileType(filePath) {
    if (!filePath) return 'unknown';
    var ext = filePath.split('.').pop().toLowerCase();
    if (ext === 'pdf') return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)) return 'image';
    if (['mp4', 'avi', 'mov', 'wmv', 'webm'].includes(ext)) return 'video';
    return 'file';
}

function getFileIcon(filePath) {
    var type = getFileType(filePath);
    var icons = { pdf: 'fa-file-pdf', image: 'fa-file-image', video: 'fa-file-video' };
    return 'fas ' + (icons[type] || 'fa-file-alt');
}

function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showLoading(element, message) {
    if (element) element.innerHTML = '<div class="loading-state-premium"><div class="loading-spinner premium"></div><p>' + message + '</p></div>';
}

function showError(element, message) {
    if (element) element.innerHTML = '<div class="error-state-premium"><i class="fas fa-exclamation-triangle"></i><h3>Error</h3><p>' + message + '</p><button onclick="location.reload()" class="premium-btn">Retry</button></div>';
}

function showToast(message, type) {
    type = type || 'info';
    var toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = message;
        toast.style.display = 'block';
        toast.style.backgroundColor = type === 'error' ? '#dc2626' : '#10b981';
        setTimeout(function() { toast.style.display = 'none'; }, 3000);
    } else {
        console.log(message);
    }
}

function filterResourcesByBlock() {
    loadAllResourcesForBlocks();
}
window.filterResources = filterResourcesByBlock;

// ==================== INITIALIZATION ====================
async function initializeResourcesModule() {
    console.log('📁 Initializing Student Resources Module with Past Papers...');
    
    // Don't try to configure pdfjsLib here - it will be configured when needed
    
    var attempts = 0;
    var maxAttempts = 30;
    
    function checkAndInit() {
        attempts++;
        
        if (window.db && window.db.supabase && window.currentUserProfile && window.currentUserProfile.program) {
            console.log('✅ Database and user ready, loading resources...');
            initSupabaseClient();
            createBlockFilterUI().then(function() {
                loadAllResourcesForBlocks();
            });
        } else if (attempts < maxAttempts) {
            setTimeout(checkAndInit, 500);
        } else {
            console.error('❌ Timeout waiting for dependencies');
            var grid = document.getElementById('student-resources-grid');
            if (grid) {
                grid.innerHTML = '<div class="error-state">Unable to load resources. Please refresh the page.</div>';
            }
        }
    }
    
    checkAndInit();
}

// Make functions global
window.loadAllResources = loadAllResourcesForBlocks;
window.openResourceInline = openResourceInline;
window.filterResourcesByType = filterResourcesByType;
window.filterStudentResourceType = filterResourcesByType;
window.filterStudentResources = filterStudentResources;
window.initializeResourcesModule = initializeResourcesModule;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeResourcesModule);
} else {
    setTimeout(initializeResourcesModule, 500);
}
