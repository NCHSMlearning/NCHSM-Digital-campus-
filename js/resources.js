// resources.js - Premium READ-ONLY High-Quality Resource Viewer with Block Filter & Refresh Button

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
let isLoading = false;

// High-quality rendering settings
const RENDER_SETTINGS = {
    defaultScale: 1.8,
    minScale: 0.8,
    maxScale: 4.0,
    quality: 'high',
    enableAnnotations: true,
    enhanceText: true
};

// Helper functions
function getSupabaseClient() {
    const client = window.db?.supabase;
    if (!client || typeof client.from !== 'function') {
        console.error('❌ No valid Supabase client available');
        return null;
    }
    return client;
}

function getUserProfile() {
    return window.db?.currentUserProfile || 
           window.currentUserProfile || 
           window.userProfile || 
           {};
}

function getCurrentUserId() {
    return window.db?.currentUserId || window.currentUserId;
}

// Initialize PDF.js with high-quality settings
async function initializePDFJS() {
    if (pdfjsLoaded) return true;
    
    return new Promise((resolve, reject) => {
        if (typeof window.pdfjsLib !== 'undefined') {
            console.log('✅ PDF.js already loaded');
            pdfjsLib = window.pdfjsLib;
            
            if (pdfjsLib.GlobalWorkerOptions) {
                pdfjsLib.GlobalWorkerOptions.workerSrc = 
                    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            }
            
            pdfjsLib.disableTextLayer = false;
            pdfjsLib.disableRange = true;
            
            pdfjsLoaded = true;
            resolve(true);
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => {
            pdfjsLib = window.pdfjsLib;
            if (pdfjsLib.GlobalWorkerOptions) {
                pdfjsLib.GlobalWorkerOptions.workerSrc = 
                    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            }
            pdfjsLoaded = true;
            resolve(true);
        };
        script.onerror = () => reject(new Error('Failed to load PDF viewer'));
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

function createBlockFilterUI() {
    const resourcesHeader = document.querySelector('#resources .resources-header');
    if (!resourcesHeader) return;
    if (document.getElementById('block-resource-filter')) return;
    
    const blockFilterHTML = `
        <div class="block-filter-card premium-card">
            <div class="filter-header">
                <div class="filter-title">
                    <i class="fas fa-layer-group"></i>
                    <span>Filter by Block</span>
                </div>
                <div class="current-block-indicator">
                    <i class="fas fa-user-graduate"></i>
                    <span>Your Block: <strong id="current-user-block">Loading...</strong></span>
                </div>
            </div>
            
            <div class="filter-controls-group">
                <div class="filter-select-wrapper">
                    <select id="block-resource-filter" class="premium-select">
                        ${getAllBlocks().map(block => `
                            <option value="${block.value}">${block.label}</option>
                        `).join('')}
                    </select>
                </div>
                
                <button id="refresh-block-resources" class="refresh-block-btn" title="Refresh Resources for this Block">
                    <i class="fas fa-sync-alt"></i>
                    <span>Refresh</span>
                </button>
            </div>
            
            <div class="filter-info">
                <i class="fas fa-info-circle"></i>
                <span>Select a block and click Refresh to load materials</span>
            </div>
        </div>
    `;
    
    const h2 = resourcesHeader.querySelector('h2');
    if (h2 && h2.nextSibling) {
        h2.insertAdjacentHTML('afterend', blockFilterHTML);
    } else {
        resourcesHeader.insertAdjacentHTML('beforeend', blockFilterHTML);
    }
    
    const blockFilter = document.getElementById('block-resource-filter');
    const refreshBtn = document.getElementById('refresh-block-resources');
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            if (isLoading) return;
            
            const selectedBlock = blockFilter.value;
            const selectedLabel = blockFilter.options[blockFilter.selectedIndex]?.text || 'selected block';
            
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Loading...</span>';
            
            currentBlockFilter = selectedBlock;
            await loadAllResourcesForBlocks();
            
            showToast(`📚 Loaded ${filteredResources.length} resources for ${selectedLabel}`, 'success');
            
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i><span>Refresh</span>';
        });
    }
    
    if (blockFilter) {
        blockFilter.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                refreshBtn.click();
            }
        });
    }
    
    const userProfile = getUserProfile();
    const userBlock = userProfile?.block || 'Introductory';
    const blockDisplay = document.getElementById('current-user-block');
    if (blockDisplay) blockDisplay.textContent = userBlock;
    
    let userBlockValue = 'all';
    for (const [value, keywords] of Object.entries(BLOCK_MAPPING)) {
        if (keywords.some(k => userBlock.toLowerCase().includes(k.toLowerCase()))) {
            userBlockValue = value;
            break;
        }
    }
    
    if (userBlockValue !== 'all' && blockFilter) {
        blockFilter.value = userBlockValue;
        currentBlockFilter = userBlockValue;
    }
}

// Load all resources from all blocks
async function loadAllResourcesForBlocks() {
    if (isLoading) return;
    
    console.log('📁 Loading read-only resources...');
    
    const userProfile = getUserProfile();
    const supabaseClient = getSupabaseClient();
    
    if (!supabaseClient) {
        const resourcesGrid = document.getElementById('resources-grid');
        if (resourcesGrid) showError(resourcesGrid, 'Database connection error');
        return;
    }
    
    const resourcesGrid = document.getElementById('resources-grid');
    if (!resourcesGrid) return;
    
    isLoading = true;
    showLoading(resourcesGrid, 'Loading resources...');
    currentResources = [];

    try {
        const program = userProfile?.program;
        const intakeYear = userProfile?.intake_year;

        if (!program || !intakeYear) {
            resourcesGrid.innerHTML = '<div class="error-state premium">Missing enrollment details</div>';
            isLoading = false;
            return;
        }

        const { data: resources, error } = await supabaseClient
            .from('resources')
            .select('id, title, file_path, file_url, program_type, block, intake, uploaded_by_name, created_at, description, file_type')
            .eq('program_type', program)
            .eq('intake', intakeYear)
            .order('created_at', { ascending: false });

        if (error) throw error;

        currentResources = resources || [];
        populateCourseFilter();
        await filterResourcesByBlock();

    } catch (err) {
        console.error("Error loading resources:", err);
        showError(resourcesGrid, `Error: ${err.message}`);
    } finally {
        isLoading = false;
    }
}

async function filterResourcesByBlock() {
    if (!currentResources.length) {
        await loadAllResourcesForBlocks();
        return;
    }
    
    let filtered = [...currentResources];
    
    if (currentBlockFilter !== 'all') {
        const targetKeywords = BLOCK_MAPPING[currentBlockFilter] || [];
        
        filtered = filtered.filter(resource => {
            const resourceBlock = (resource.block || '').toString().toLowerCase();
            return targetKeywords.some(keyword => 
                resourceBlock.includes(keyword.toLowerCase())
            );
        });
    }
    
    const searchTerm = document.getElementById('resource-search')?.value.toLowerCase() || '';
    if (searchTerm) {
        filtered = filtered.filter(r => 
            (r.title || '').toLowerCase().includes(searchTerm) ||
            (r.description || '').toLowerCase().includes(searchTerm)
        );
    }
    
    const typeFilter = document.getElementById('resource-filter')?.value || 'all';
    if (typeFilter !== 'all') {
        filtered = filtered.filter(r => getFileType(r.file_path) === typeFilter);
    }
    
    const courseFilter = document.getElementById('course-filter')?.value || 'all';
    if (courseFilter !== 'all') {
        filtered = filtered.filter(r => r.program_type === courseFilter);
    }
    
    filteredResources = filtered;
    renderResourcesGrid();
    updateResourceCountDisplay();
}

function renderResourcesGrid() {
    const resourcesGrid = document.getElementById('resources-grid');
    if (!resourcesGrid) return;

    if (filteredResources.length === 0) {
        resourcesGrid.innerHTML = `
            <div class="empty-state premium">
                <i class="fas fa-folder-open"></i>
                <h3>No Resources Found</h3>
                <p>No resources match your current filters.</p>
                <button onclick="document.getElementById('block-resource-filter').value='all'; document.getElementById('refresh-block-resources').click();" class="premium-btn">
                    <i class="fas fa-eye"></i> View All Blocks
                </button>
            </div>
        `;
        return;
    }

    resourcesGrid.innerHTML = filteredResources.map(resource => `
        <div class="resource-card premium-card" data-id="${resource.id}">
            <div class="resource-preview">
                <div class="preview-icon ${getFileType(resource.file_path)}">
                    <i class="${getFileIcon(resource.file_path)}"></i>
                </div>
            </div>
            <div class="resource-details">
                <h3 class="resource-title">${escapeHtml(resource.title)}</h3>
                <p class="resource-description">${escapeHtml(resource.description || 'No description available')}</p>
                <div class="resource-meta">
                    <span class="meta-tag">
                        <i class="fas fa-calendar"></i> ${new Date(resource.created_at).toLocaleDateString()}
                    </span>
                    <span class="meta-tag block-tag ${getBlockTagClass(resource.block)}">
                        <i class="fas ${getBlockIcon(resource.block)}"></i> ${escapeHtml(resource.block || 'General')}
                    </span>
                    <span class="meta-tag read-only-badge">
                        <i class="fas fa-eye"></i> Read Only
                    </span>
                </div>
            </div>
            <div class="resource-actions">
                <button class="action-btn view-btn" onclick="openResource(${resource.id})">
                    <i class="fas fa-eye"></i> Read Now
                </button>
            </div>
        </div>
    `).join('');
}

function updateResourceCountDisplay() {
    const blockFilter = document.getElementById('block-resource-filter');
    const refreshBtn = document.getElementById('refresh-block-resources');
    
    if (blockFilter && refreshBtn) {
        const selectedBlock = blockFilter.value;
        const selectedLabel = blockFilter.options[blockFilter.selectedIndex]?.text || '';
        
        if (currentBlockFilter !== 'all') {
            refreshBtn.classList.add('active-filter');
            refreshBtn.setAttribute('data-count', filteredResources.length);
        } else {
            refreshBtn.classList.remove('active-filter');
        }
    }
}

function getBlockTagClass(block) {
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

function getBlockIcon(block) {
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

function populateCourseFilter() {
    const courseFilter = document.getElementById('course-filter');
    if (!courseFilter) return;

    const courses = [...new Set(currentResources.map(r => r.program_type).filter(Boolean))];
    courseFilter.innerHTML = '<option value="all">All Courses</option>';
    courses.forEach(course => {
        const option = document.createElement('option');
        option.value = course;
        option.textContent = course;
        courseFilter.appendChild(option);
    });
}

// ==================== READ-ONLY HIGH-QUALITY VIEWER ====================

async function openResource(resourceId) {
    const resource = currentResources.find(r => r.id == resourceId);
    if (!resource) {
        showToast('Resource not found', 'error');
        return;
    }

    currentResource = resource;
    const fileType = getFileType(resource.file_path);
    
    if (fileType === 'pdf') {
        await openReadOnlyPDF(resource);
    } else if (fileType === 'image') {
        openReadOnlyImage(resource);
    } else if (fileType === 'video') {
        openReadOnlyVideo(resource);
    } else {
        openReadOnlyDocument(resource);
    }
}

async function openReadOnlyPDF(resource) {
    try {
        await initializePDFJS();
        createReadOnlyPDFViewer(resource);
        await loadHighQualityPDF(resource.file_url);
    } catch (error) {
        console.error('PDF error:', error);
        showToast('Failed to load PDF: ' + error.message, 'error');
    }
}

function createReadOnlyPDFViewer(resource) {
    const existingModal = document.getElementById('readonly-pdf-modal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'readonly-pdf-modal';
    modal.className = 'readonly-pdf-modal';
    modal.innerHTML = `
        <div class="readonly-pdf-container">
            <div class="readonly-pdf-header">
                <div class="pdf-title-section">
                    <i class="fas fa-file-pdf"></i>
                    <div>
                        <h3>${escapeHtml(resource.title)}</h3>
                        <span class="readonly-status">Read Only Mode</span>
                    </div>
                </div>
                <div class="pdf-header-actions">
                    <button class="pdf-header-btn" id="fullscreen-btn" title="Fullscreen">
                        <i class="fas fa-expand"></i>
                    </button>
                    <button class="pdf-header-btn" id="close-readonly-pdf" title="Close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            
            <div class="readonly-pdf-body">
                <div id="pdf-loading" class="pdf-loading-overlay">
                    <div class="loading-spinner premium"></div>
                    <p>Loading high-quality document...</p>
                </div>
                
                <div id="pdf-error" class="pdf-error-overlay" style="display: none;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Failed to Load Document</h3>
                    <p id="pdf-error-message"></p>
                    <button id="retry-pdf-btn" class="premium-btn">Retry</button>
                </div>
                
                <div id="pdf-viewer-area" class="pdf-viewer-area" style="display: none;">
                    <div class="pdf-canvas-wrapper" id="pdf-canvas-wrapper">
                        <canvas id="readonly-pdf-canvas" class="readonly-pdf-canvas"></canvas>
                    </div>
                </div>
            </div>
            
            <div class="readonly-pdf-footer">
                <div class="pdf-nav-controls">
                    <button id="pdf-first-page" class="pdf-nav-btn" title="First Page">
                        <i class="fas fa-fast-backward"></i>
                    </button>
                    <button id="pdf-prev-page" class="pdf-nav-btn" title="Previous Page">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    
                    <div class="pdf-page-indicator">
                        <input type="number" id="pdf-page-number" min="1" value="1">
                        <span>/</span>
                        <span id="pdf-total-pages">1</span>
                    </div>
                    
                    <button id="pdf-next-page" class="pdf-nav-btn" title="Next Page">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                    <button id="pdf-last-page" class="pdf-nav-btn" title="Last Page">
                        <i class="fas fa-fast-forward"></i>
                    </button>
                </div>
                
                <div class="pdf-zoom-controls">
                    <button id="pdf-zoom-out" class="pdf-zoom-btn" title="Zoom Out">
                        <i class="fas fa-search-minus"></i>
                    </button>
                    <span id="pdf-zoom-percent" class="pdf-zoom-percent">150%</span>
                    <button id="pdf-zoom-in" class="pdf-zoom-btn" title="Zoom In">
                        <i class="fas fa-search-plus"></i>
                    </button>
                    <button id="pdf-fit-width" class="pdf-zoom-btn" title="Fit to Width">
                        <i class="fas fa-expand-arrows-alt"></i>
                    </button>
                    <button id="pdf-actual-size" class="pdf-zoom-btn" title="Actual Size">
                        <i class="fas fa-percent"></i>
                    </button>
                </div>
                
                <div class="readonly-warning">
                    <i class="fas fa-lock"></i>
                    <span>Protected Document - No Download Available</span>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    addReadOnlyPDFStyles();
    setupReadOnlyPDFEvents();
    modal.style.display = 'flex';
}

function addReadOnlyPDFStyles() {
    const styleId = 'readonly-pdf-styles';
    if (document.getElementById(styleId)) return;
    
    const styles = `
        .readonly-pdf-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.95);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            backdrop-filter: blur(8px);
        }
        .readonly-pdf-container {
            width: 95%;
            height: 95%;
            background: #1a1a2e;
            border-radius: 20px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
        }
        .readonly-pdf-header {
            padding: 16px 24px;
            background: linear-gradient(135deg, #16213e 0%, #1a1a2e 100%);
            border-bottom: 1px solid rgba(255,255,255,0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .pdf-title-section {
            display: flex;
            align-items: center;
            gap: 12px;
            color: white;
        }
        .pdf-title-section i {
            font-size: 24px;
            color: #ef4444;
        }
        .pdf-title-section h3 {
            margin: 0;
            font-size: 1rem;
            font-weight: 500;
        }
        .readonly-status {
            font-size: 11px;
            background: #4C1D95;
            padding: 4px 10px;
            border-radius: 20px;
            margin-left: 10px;
        }
        .readonly-pdf-body {
            flex: 1;
            overflow: auto;
            background: #2d2d3a;
            position: relative;
        }
        .pdf-viewer-area {
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            padding: 20px;
        }
        .pdf-canvas-wrapper {
            display: flex;
            justify-content: center;
            background: #2d2d3a;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        }
        .readonly-pdf-canvas {
            display: block;
            margin: 0 auto;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            background: white;
            border-radius: 4px;
        }
        .readonly-pdf-footer {
            background: linear-gradient(135deg, #16213e 0%, #1a1a2e 100%);
            border-top: 1px solid rgba(255,255,255,0.1);
            padding: 12px 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 15px;
        }
        .pdf-nav-controls, .pdf-zoom-controls {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .pdf-nav-btn, .pdf-zoom-btn {
            background: rgba(255,255,255,0.1);
            border: none;
            color: white;
            width: 40px;
            height: 40px;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 16px;
        }
        .pdf-nav-btn:hover, .pdf-zoom-btn:hover {
            background: #4C1D95;
            transform: translateY(-2px);
        }
        .pdf-page-indicator {
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(255,255,255,0.1);
            padding: 6px 12px;
            border-radius: 8px;
            color: white;
        }
        #pdf-page-number {
            width: 50px;
            padding: 6px;
            border-radius: 6px;
            border: none;
            text-align: center;
            font-size: 14px;
            font-weight: 600;
            background: white;
        }
        .pdf-zoom-percent {
            color: white;
            font-weight: 600;
            min-width: 60px;
            text-align: center;
        }
        .readonly-warning {
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(76, 29, 149, 0.3);
            padding: 8px 16px;
            border-radius: 40px;
            color: #a78bfa;
            font-size: 12px;
        }
        .pdf-loading-overlay, .pdf-error-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            background: #2d2d3a;
            z-index: 10;
        }
        .loading-spinner.premium {
            width: 60px;
            height: 60px;
            border: 4px solid rgba(255,255,255,0.2);
            border-top-color: #4C1D95;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        .read-only-badge {
            background: #4C1D95 !important;
            color: white !important;
        }
        @media (max-width: 768px) {
            .readonly-pdf-container {
                width: 98%;
                height: 96%;
            }
            .pdf-nav-btn, .pdf-zoom-btn {
                width: 36px;
                height: 36px;
            }
            .readonly-pdf-footer {
                padding: 10px 16px;
            }
        }
        @media (max-width: 640px) {
            .readonly-pdf-footer {
                flex-direction: column;
            }
        }
    `;
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = styles;
    document.head.appendChild(style);
}

function setupReadOnlyPDFEvents() {
    const modal = document.getElementById('readonly-pdf-modal');
    const closeBtn = document.getElementById('close-readonly-pdf');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            cleanupPDF();
        });
    }
    
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', toggleFullscreen);
    }
    
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
                cleanupPDF();
            }
        });
    }
    
    document.getElementById('pdf-first-page')?.addEventListener('click', () => goToPDFPage(1));
    document.getElementById('pdf-prev-page')?.addEventListener('click', () => goToPDFPage(currentPDFPage - 1));
    document.getElementById('pdf-next-page')?.addEventListener('click', () => goToPDFPage(currentPDFPage + 1));
    document.getElementById('pdf-last-page')?.addEventListener('click', () => goToPDFPage(totalPDFPages));
    
    document.getElementById('pdf-zoom-in')?.addEventListener('click', () => zoomPDF(1.2));
    document.getElementById('pdf-zoom-out')?.addEventListener('click', () => zoomPDF(0.8));
    document.getElementById('pdf-fit-width')?.addEventListener('click', fitToWidth);
    document.getElementById('pdf-actual-size')?.addEventListener('click', () => {
        pdfScale = 1.0;
        updateZoomDisplay();
        renderPDFPage(currentPDFPage);
    });
    
    const pageInput = document.getElementById('pdf-page-number');
    pageInput?.addEventListener('change', () => {
        const page = parseInt(pageInput.value);
        if (page >= 1 && page <= totalPDFPages) {
            goToPDFPage(page);
        }
    });
    
    document.addEventListener('keydown', handlePDFKeyboard);
}

async function loadHighQualityPDF(pdfUrl) {
    try {
        showPDFLoading();
        
        const loadingTask = pdfjsLib.getDocument({
            url: pdfUrl,
            cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
            cMapPacked: true,
            enableXfa: true,
            verbosity: 0
        });
        
        currentPDFDoc = await loadingTask.promise;
        totalPDFPages = currentPDFDoc.numPages;
        
        document.getElementById('pdf-total-pages').textContent = totalPDFPages;
        document.getElementById('pdf-page-number').max = totalPDFPages;
        
        hidePDFLoading();
        showPDFViewer();
        
        pdfScale = 1.5;
        await renderPDFPage(1);
        
    } catch (error) {
        console.error('PDF loading error:', error);
        showPDFError('Failed to load document: ' + error.message);
    }
}

async function renderPDFPage(pageNum) {
    if (!currentPDFDoc || pageNum < 1 || pageNum > totalPDFPages) return;
    
    if (pageRendering) {
        pageNumPending = pageNum;
        return;
    }
    
    pageRendering = true;
    
    try {
        const page = await currentPDFDoc.getPage(pageNum);
        const canvas = document.getElementById('readonly-pdf-canvas');
        if (!canvas) {
            pageRendering = false;
            return;
        }
        
        const ctx = canvas.getContext('2d', { alpha: false });
        const wrapper = document.getElementById('pdf-canvas-wrapper');
        const viewport = page.getViewport({ scale: 1 });
        const scale = pdfScale;
        const scaledViewport = page.getViewport({ scale: scale });
        
        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = scaledViewport.width * pixelRatio;
        canvas.height = scaledViewport.height * pixelRatio;
        canvas.style.width = scaledViewport.width + 'px';
        canvas.style.height = scaledViewport.height + 'px';
        
        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        
        const renderContext = {
            canvasContext: ctx,
            viewport: scaledViewport,
            enableWebGL: true,
            renderInteractiveForms: true,
            background: 'white'
        };
        
        await page.render(renderContext).promise;
        
        currentPDFPage = pageNum;
        document.getElementById('pdf-page-number').value = pageNum;
        updateZoomDisplay();
        updatePDFNavButtons();
        
    } catch (error) {
        console.error('Render error:', error);
        showPDFError('Failed to render page');
    }
    
    pageRendering = false;
    
    if (pageNumPending !== null) {
        renderPDFPage(pageNumPending);
        pageNumPending = null;
    }
}

function goToPDFPage(pageNum) {
    if (pageNum < 1) pageNum = 1;
    if (pageNum > totalPDFPages) pageNum = totalPDFPages;
    renderPDFPage(pageNum);
}

function zoomPDF(factor) {
    pdfScale *= factor;
    pdfScale = Math.max(0.5, Math.min(pdfScale, 4.0));
    updateZoomDisplay();
    renderPDFPage(currentPDFPage);
}

function fitToWidth() {
    const canvas = document.getElementById('readonly-pdf-canvas');
    const wrapper = document.getElementById('pdf-canvas-wrapper');
    if (!canvas || !wrapper || !currentPDFDoc) return;
    
    const containerWidth = wrapper.clientWidth - 40;
    currentPDFDoc.getPage(currentPDFPage).then(page => {
        const originalViewport = page.getViewport({ scale: 1 });
        pdfScale = containerWidth / originalViewport.width;
        pdfScale = Math.max(0.8, Math.min(pdfScale, 3.0));
        updateZoomDisplay();
        renderPDFPage(currentPDFPage);
    });
}

function updateZoomDisplay() {
    const percent = Math.round(pdfScale * 100);
    const zoomDisplay = document.getElementById('pdf-zoom-percent');
    if (zoomDisplay) zoomDisplay.textContent = percent + '%';
}

function updatePDFNavButtons() {
    const firstBtn = document.getElementById('pdf-first-page');
    const prevBtn = document.getElementById('pdf-prev-page');
    const nextBtn = document.getElementById('pdf-next-page');
    const lastBtn = document.getElementById('pdf-last-page');
    
    if (firstBtn) firstBtn.disabled = currentPDFPage <= 1;
    if (prevBtn) prevBtn.disabled = currentPDFPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPDFPage >= totalPDFPages;
    if (lastBtn) lastBtn.disabled = currentPDFPage >= totalPDFPages;
}

function showPDFLoading() {
    const loading = document.getElementById('pdf-loading');
    const error = document.getElementById('pdf-error');
    const viewer = document.getElementById('pdf-viewer-area');
    if (loading) loading.style.display = 'flex';
    if (error) error.style.display = 'none';
    if (viewer) viewer.style.display = 'none';
}

function hidePDFLoading() {
    const loading = document.getElementById('pdf-loading');
    if (loading) loading.style.display = 'none';
}

function showPDFViewer() {
    const viewer = document.getElementById('pdf-viewer-area');
    if (viewer) viewer.style.display = 'flex';
}

function showPDFError(message) {
    const loading = document.getElementById('pdf-loading');
    const error = document.getElementById('pdf-error');
    const viewer = document.getElementById('pdf-viewer-area');
    const errorMsg = document.getElementById('pdf-error-message');
    
    if (loading) loading.style.display = 'none';
    if (error) error.style.display = 'flex';
    if (viewer) viewer.style.display = 'none';
    if (errorMsg) errorMsg.textContent = message;
    
    const retryBtn = document.getElementById('retry-pdf-btn');
    if (retryBtn && currentResource) {
        retryBtn.onclick = () => loadHighQualityPDF(currentResource.file_url);
    }
}

function toggleFullscreen() {
    const container = document.querySelector('.readonly-pdf-container');
    if (!container) return;
    
    if (!document.fullscreenElement) {
        container.requestFullscreen();
        const fullscreenBtn = document.getElementById('fullscreen-btn');
        if (fullscreenBtn) fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
    } else {
        document.exitFullscreen();
        const fullscreenBtn = document.getElementById('fullscreen-btn');
        if (fullscreenBtn) fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
    }
}

function handlePDFKeyboard(e) {
    const modal = document.getElementById('readonly-pdf-modal');
    if (!modal || modal.style.display !== 'flex') return;
    
    switch(e.key) {
        case 'ArrowLeft':
            e.preventDefault();
            goToPDFPage(currentPDFPage - 1);
            break;
        case 'ArrowRight':
            e.preventDefault();
            goToPDFPage(currentPDFPage + 1);
            break;
        case 'Escape':
            e.preventDefault();
            modal.style.display = 'none';
            cleanupPDF();
            break;
        case '+':
        case '=':
            if (e.ctrlKey) {
                e.preventDefault();
                zoomPDF(1.2);
            }
            break;
        case '-':
            if (e.ctrlKey) {
                e.preventDefault();
                zoomPDF(0.8);
            }
            break;
        case '0':
            if (e.ctrlKey) {
                e.preventDefault();
                pdfScale = 1.0;
                updateZoomDisplay();
                renderPDFPage(currentPDFPage);
            }
            break;
    }
}

function cleanupPDF() {
    if (currentPDFDoc) {
        currentPDFDoc.destroy();
        currentPDFDoc = null;
    }
    currentPDFPage = 1;
    totalPDFPages = 0;
    pdfScale = 1.5;
    pageRendering = false;
    pageNumPending = null;
    document.removeEventListener('keydown', handlePDFKeyboard);
}

// Image viewer
function openReadOnlyImage(resource) {
    const modal = document.createElement('div');
    modal.className = 'image-modal-premium';
    modal.innerHTML = `
        <div class="image-modal-container">
            <div class="image-modal-header">
                <h3>${escapeHtml(resource.title)}</h3>
                <button class="image-modal-close" onclick="this.closest('.image-modal-premium').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="image-modal-body">
                <img src="${resource.file_url}" alt="${escapeHtml(resource.title)}">
            </div>
            <div class="image-modal-footer">
                <div class="protected-notice">
                    <i class="fas fa-lock"></i> Protected Image - No Download
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Add styles if not exist
    if (!document.getElementById('image-modal-styles')) {
        const style = document.createElement('style');
        style.id = 'image-modal-styles';
        style.textContent = `
            .image-modal-premium {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.95);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
            }
            .image-modal-container {
                max-width: 90vw;
                max-height: 90vh;
                background: #1a1a2e;
                border-radius: 20px;
                overflow: hidden;
            }
            .image-modal-header {
                padding: 15px 20px;
                background: linear-gradient(135deg, #16213e 0%, #1a1a2e 100%);
                color: white;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .image-modal-header h3 {
                margin: 0;
                font-size: 1rem;
            }
            .image-modal-close {
                background: rgba(255,255,255,0.1);
                border: none;
                color: white;
                width: 32px;
                height: 32px;
                border-radius: 8px;
                cursor: pointer;
            }
            .image-modal-body {
                padding: 20px;
                display: flex;
                justify-content: center;
                background: #2d2d3a;
            }
            .image-modal-body img {
                max-width: calc(90vw - 40px);
                max-height: calc(70vh - 40px);
                object-fit: contain;
                border-radius: 12px;
            }
            .image-modal-footer {
                padding: 12px 20px;
                background: linear-gradient(135deg, #16213e 0%, #1a1a2e 100%);
                text-align: center;
                color: #a78bfa;
                font-size: 12px;
            }
        `;
        document.head.appendChild(style);
    }
}

// Video viewer
function openReadOnlyVideo(resource) {
    const modal = document.createElement('div');
    modal.className = 'video-modal-premium';
    modal.innerHTML = `
        <div class="video-modal-container">
            <div class="video-modal-header">
                <h3>${escapeHtml(resource.title)}</h3>
                <button class="video-modal-close" onclick="this.closest('.video-modal-premium').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="video-modal-body">
                <video controls controlslist="nodownload noplaybackrate" disablepictureinpicture>
                    <source src="${resource.file_url}" type="video/mp4">
                    Your browser does not support video playback.
                </video>
            </div>
            <div class="video-modal-footer">
                <div class="protected-notice">
                    <i class="fas fa-lock"></i> Protected Video - No Download
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    if (!document.getElementById('video-modal-styles')) {
        const style = document.createElement('style');
        style.id = 'video-modal-styles';
        style.textContent = `
            .video-modal-premium {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.95);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
            }
            .video-modal-container {
                max-width: 90vw;
                max-height: 90vh;
                background: #1a1a2e;
                border-radius: 20px;
                overflow: hidden;
            }
            .video-modal-header {
                padding: 15px 20px;
                background: linear-gradient(135deg, #16213e 0%, #1a1a2e 100%);
                color: white;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .video-modal-header h3 {
                margin: 0;
                font-size: 1rem;
            }
            .video-modal-close {
                background: rgba(255,255,255,0.1);
                border: none;
                color: white;
                width: 32px;
                height: 32px;
                border-radius: 8px;
                cursor: pointer;
            }
            .video-modal-body {
                padding: 20px;
                background: #2d2d3a;
            }
            .video-modal-body video {
                max-width: calc(90vw - 40px);
                max-height: calc(70vh - 40px);
                border-radius: 12px;
            }
            .video-modal-footer {
                padding: 12px 20px;
                background: linear-gradient(135deg, #16213e 0%, #1a1a2e 100%);
                text-align: center;
                color: #a78bfa;
                font-size: 12px;
            }
            video::-internal-media-controls-download-button {
                display: none;
            }
            video::-webkit-media-controls-enclosure {
                overflow: hidden;
            }
        `;
        document.head.appendChild(style);
    }
}

function openReadOnlyDocument(resource) {
    window.open(resource.file_url + '#toolbar=0', '_blank');
}

// Filter resources
function filterResources() {
    filterResourcesByBlock();
}

// Utility functions
function getFileType(filePath) {
    if (!filePath) return 'unknown';
    const ext = filePath.split('.').pop().toLowerCase();
    if (ext === 'pdf') return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)) return 'image';
    if (['mp4', 'avi', 'mov', 'wmv', 'webm'].includes(ext)) return 'video';
    return 'file';
}

function getFileIcon(filePath) {
    const type = getFileType(filePath);
    switch(type) {
        case 'pdf': return 'fas fa-file-pdf';
        case 'image': return 'fas fa-file-image';
        case 'video': return 'fas fa-file-video';
        default: return 'fas fa-file-alt';
    }
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showLoading(element, message) {
    if (element) {
        element.innerHTML = `
            <div class="loading-state-premium">
                <div class="loading-spinner premium"></div>
                <p>${message}</p>
            </div>
        `;
    }
}

function showError(element, message) {
    if (element) {
        element.innerHTML = `
            <div class="error-state-premium">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error</h3>
                <p>${message}</p>
                <button onclick="loadAllResourcesForBlocks()" class="premium-btn">Retry</button>
            </div>
        `;
    }
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = message;
        toast.style.display = 'block';
        toast.style.backgroundColor = type === 'error' ? '#dc2626' : '#10b981';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 3000);
    } else {
        console.log(message);
    }
}

// Initialize module
function initializeResourcesModule() {
    console.log('📁 Initializing Premium Resources Module...');
    createBlockFilterUI();
    
    const resourceSearch = document.getElementById('resource-search');
    const resourceFilter = document.getElementById('resource-filter');
    const courseFilter = document.getElementById('course-filter');
    
    if (resourceSearch) resourceSearch.addEventListener('input', filterResources);
    if (resourceFilter) resourceFilter.addEventListener('change', filterResources);
    if (courseFilter) courseFilter.addEventListener('change', filterResources);
    
    const resourcesTab = document.querySelector('.nav a[data-tab="resources"]');
    if (resourcesTab) {
        resourcesTab.addEventListener('click', () => {
            if (getCurrentUserId()) {
                loadAllResourcesForBlocks();
            }
        });
    }
    
    const currentTab = localStorage.getItem('nchsm_last_tab');
    if (currentTab === 'resources' && getCurrentUserId()) {
        loadAllResourcesForBlocks();
    }
}

// Global exports
window.loadAllResources = loadAllResourcesForBlocks;
window.openResource = openResource;
window.filterResources = filterResources;
window.initializeResourcesModule = initializeResourcesModule;

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeResourcesModule);
} else {
    initializeResourcesModule();
}
