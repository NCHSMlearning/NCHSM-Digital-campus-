// resources.js - ULTRA-FAST Premium READ-ONLY Resource Viewer with Block Filter

let pdfjsLib = null;
let currentPDFDoc = null;
let currentPDFPage = 1;
let totalPDFPages = 0;
let pdfScale = 1.5;

// Global variables with performance optimizations
let currentResources = [];
let filteredResources = [];
let currentBlockFilter = 'all';
let isLoading = false;
let renderTimeout = null;
let searchDebounceTimeout = null;

// Cache system
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let resourceCache = null;

// Virtual scrolling
let currentPage = 1;
const ITEMS_PER_PAGE = 12;
let totalFilteredCount = 0;

// DOM Elements cache
let cachedElements = {};

// High-quality rendering settings
const RENDER_SETTINGS = {
    defaultScale: 1.8,
    minScale: 0.8,
    maxScale: 4.0,
    quality: 'high'
};

// ==================== HELPER FUNCTIONS ====================

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

// ==================== BLOCK MAPPING ====================

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

// ==================== CACHE MANAGEMENT ====================

function getCachedResources(program, intake) {
    if (!resourceCache) return null;
    if (resourceCache.program === program && 
        resourceCache.intake === intake &&
        (Date.now() - resourceCache.timestamp) < CACHE_DURATION) {
        console.log('📦 Using cached resources');
        return resourceCache.data;
    }
    return null;
}

function setCachedResources(program, intake, data) {
    resourceCache = {
        program: program,
        intake: intake,
        data: data,
        timestamp: Date.now()
    };
}

function clearCache() {
    resourceCache = null;
    console.log('🗑️ Cache cleared');
}

// ==================== UI CREATION (FAST) ====================

function createBlockFilterUI() {
    const resourcesHeader = document.querySelector('#resources .resources-header');
    if (!resourcesHeader) return;
    if (document.getElementById('block-resource-filter')) return;
    
    const blockFilterHTML = `
        <div class="block-filter-card premium-card" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 20px; margin-bottom: 25px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; margin-bottom: 15px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <i class="fas fa-layer-group" style="color: #a78bfa; font-size: 20px;"></i>
                    <span style="color: white; font-weight: 600;">Filter by Block</span>
                </div>
                <div style="display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.05); padding: 8px 16px; border-radius: 40px;">
                    <i class="fas fa-user-graduate" style="color: #a78bfa;"></i>
                    <span style="color: white; font-size: 14px;">Your Block: <strong id="current-user-block" style="color: #c084fc;">Loading...</strong></span>
                </div>
            </div>
            
            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 200px;">
                    <select id="block-resource-filter" class="premium-select" style="width: 100%; padding: 12px 16px; border-radius: 12px; background: #0f0f23; color: white; border: 1px solid rgba(255,255,255,0.1);">
                        ${getAllBlocks().map(block => `<option value="${block.value}">${block.label}</option>`).join('')}
                    </select>
                </div>
                
                <button id="refresh-block-resources" style="background: linear-gradient(135deg, #4C1D95 0%, #7c3aed 100%); border: none; padding: 12px 24px; border-radius: 12px; color: white; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: transform 0.2s;">
                    <i class="fas fa-sync-alt"></i>
                    <span>Refresh</span>
                </button>
            </div>
            
            <div style="margin-top: 12px; display: flex; align-items: center; gap: 8px; font-size: 12px; color: #a78bfa;">
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
    
    cacheElements();
    attachEventListeners();
    
    // Auto-select user's block
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
    
    const blockFilter = document.getElementById('block-resource-filter');
    if (blockFilter && userBlockValue !== 'all') {
        blockFilter.value = userBlockValue;
        currentBlockFilter = userBlockValue;
    }
}

function cacheElements() {
    cachedElements = {
        resourcesGrid: document.getElementById('resources-grid'),
        resourceSearch: document.getElementById('resource-search'),
        resourceFilter: document.getElementById('resource-filter'),
        courseFilter: document.getElementById('course-filter'),
        blockFilter: document.getElementById('block-resource-filter'),
        refreshBtn: document.getElementById('refresh-block-resources')
    };
}

function attachEventListeners() {
    if (cachedElements.refreshBtn) {
        cachedElements.refreshBtn.addEventListener('click', async () => {
            if (isLoading) return;
            await loadAllResourcesForBlocks();
        });
    }
    
    if (cachedElements.resourceSearch) {
        cachedElements.resourceSearch.addEventListener('input', () => {
            clearTimeout(searchDebounceTimeout);
            searchDebounceTimeout = setTimeout(() => filterResourcesByBlock(), 300);
        });
    }
    
    if (cachedElements.resourceFilter) {
        cachedElements.resourceFilter.addEventListener('change', () => filterResourcesByBlock());
    }
    
    if (cachedElements.courseFilter) {
        cachedElements.courseFilter.addEventListener('change', () => filterResourcesByBlock());
    }
}

// ==================== FAST RESOURCE LOADING ====================

async function loadAllResourcesForBlocks() {
    if (isLoading) {
        console.log('⏳ Already loading, skipping...');
        return;
    }
    
    const userProfile = getUserProfile();
    const supabaseClient = getSupabaseClient();
    
    if (!supabaseClient || !cachedElements.resourcesGrid) {
        if (cachedElements.resourcesGrid) showError('Database connection error');
        return;
    }
    
    const program = userProfile?.program;
    const intakeYear = userProfile?.intake_year;

    if (!program || !intakeYear) {
        if (cachedElements.resourcesGrid) {
            cachedElements.resourcesGrid.innerHTML = '<div class="error-state premium">Missing enrollment details</div>';
        }
        return;
    }
    
    // Check cache first
    const cached = getCachedResources(program, intakeYear);
    if (cached) {
        currentResources = cached;
        populateCourseFilterFast();
        await filterResourcesByBlock();
        return;
    }
    
    isLoading = true;
    showLoading('Loading resources...');
    
    try {
        // Optimized query with better performance
        const { data: resources, error } = await supabaseClient
            .from('resources')
            .select('id, title, file_path, file_url, program_type, block, intake, uploaded_by_name, created_at, description, file_type')
            .eq('program_type', program)
            .eq('intake', intakeYear)
            .order('created_at', { ascending: false })
            .limit(200); // Limit for performance
            
        if (error) throw error;
        
        currentResources = resources || [];
        setCachedResources(program, intakeYear, currentResources);
        populateCourseFilterFast();
        await filterResourcesByBlock();
        
    } catch (err) {
        console.error("Error loading resources:", err);
        showError(`Error: ${err.message}`);
    } finally {
        isLoading = false;
    }
}

function populateCourseFilterFast() {
    if (!cachedElements.courseFilter) return;
    
    const courses = [...new Set(currentResources.map(r => r.program_type).filter(Boolean))];
    const currentValue = cachedElements.courseFilter.value;
    
    cachedElements.courseFilter.innerHTML = '<option value="all">All Courses</option>';
    courses.forEach(course => {
        const option = document.createElement('option');
        option.value = course;
        option.textContent = course;
        cachedElements.courseFilter.appendChild(option);
    });
    
    if (currentValue && courses.includes(currentValue)) {
        cachedElements.courseFilter.value = currentValue;
    }
}

// ==================== FAST FILTERING ====================

async function filterResourcesByBlock() {
    if (!currentResources.length) {
        await loadAllResourcesForBlocks();
        return;
    }
    
    // Clear any pending render
    if (renderTimeout) clearTimeout(renderTimeout);
    
    let filtered = [...currentResources];
    const blockFilterValue = cachedElements.blockFilter?.value || currentBlockFilter;
    currentBlockFilter = blockFilterValue;
    
    // Apply block filter efficiently
    if (currentBlockFilter !== 'all') {
        const targetKeywords = BLOCK_MAPPING[currentBlockFilter] || [];
        filtered = filtered.filter(resource => {
            const resourceBlock = (resource.block || '').toString().toLowerCase();
            return targetKeywords.some(keyword => 
                resourceBlock.includes(keyword.toLowerCase())
            );
        });
    }
    
    // Apply search filter
    const searchTerm = cachedElements.resourceSearch?.value.toLowerCase() || '';
    if (searchTerm) {
        filtered = filtered.filter(r => 
            (r.title || '').toLowerCase().includes(searchTerm) ||
            (r.description || '').toLowerCase().includes(searchTerm)
        );
    }
    
    // Apply type filter
    const typeFilter = cachedElements.resourceFilter?.value || 'all';
    if (typeFilter !== 'all') {
        filtered = filtered.filter(r => getFileType(r.file_path) === typeFilter);
    }
    
    // Apply course filter
    const courseFilter = cachedElements.courseFilter?.value || 'all';
    if (courseFilter !== 'all') {
        filtered = filtered.filter(r => r.program_type === courseFilter);
    }
    
    filteredResources = filtered;
    totalFilteredCount = filteredResources.length;
    currentPage = 1;
    
    // Debounce rendering for better performance
    renderTimeout = setTimeout(() => renderResourcesGrid(), 50);
    updateResourceCountDisplay();
}

// ==================== VIRTUAL SCROLL RENDERING ====================

function renderResourcesGrid() {
    if (!cachedElements.resourcesGrid) return;
    
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const pageItems = filteredResources.slice(startIndex, endIndex);
    const hasMore = endIndex < filteredResources.length;
    
    if (filteredResources.length === 0) {
        cachedElements.resourcesGrid.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; background: rgba(255,255,255,0.02); border-radius: 20px;">
                <i class="fas fa-folder-open" style="font-size: 48px; color: #a78bfa; margin-bottom: 20px; display: inline-block;"></i>
                <h3 style="color: white; margin-bottom: 10px;">No Resources Found</h3>
                <p style="color: rgba(255,255,255,0.6);">No resources match your current filters.</p>
                <button onclick="window.resetFilters()" style="margin-top: 20px; background: linear-gradient(135deg, #4C1D95 0%, #7c3aed 100%); border: none; padding: 10px 20px; border-radius: 10px; color: white; cursor: pointer;">
                    <i class="fas fa-eye"></i> View All Blocks
                </button>
            </div>
        `;
        return;
    }
    
    // Batch DOM operations using DocumentFragment
    const fragment = document.createDocumentFragment();
    const gridContainer = document.createElement('div');
    gridContainer.style.display = 'grid';
    gridContainer.style.gridTemplateColumns = 'repeat(auto-fill, minmax(320px, 1fr))';
    gridContainer.style.gap = '20px';
    
    pageItems.forEach(resource => {
        const card = createResourceCard(resource);
        gridContainer.appendChild(card);
    });
    
    fragment.appendChild(gridContainer);
    
    // Add load more button if needed
    if (hasMore) {
        const loadMoreDiv = document.createElement('div');
        loadMoreDiv.style.gridColumn = '1 / -1';
        loadMoreDiv.style.textAlign = 'center';
        loadMoreDiv.style.marginTop = '20px';
        loadMoreDiv.innerHTML = `
            <button onclick="window.loadMoreResources()" style="background: rgba(255,255,255,0.1); border: none; padding: 12px 30px; border-radius: 40px; color: white; cursor: pointer; transition: all 0.3s;">
                <i class="fas fa-arrow-down"></i> Load More (${filteredResources.length - endIndex} remaining)
            </button>
        `;
        fragment.appendChild(loadMoreDiv);
    }
    
    // Clear and update
    cachedElements.resourcesGrid.innerHTML = '';
    cachedElements.resourcesGrid.appendChild(fragment);
}

function createResourceCard(resource) {
    const card = document.createElement('div');
    card.className = 'resource-card premium-card';
    card.style.cssText = `
        background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);
        border-radius: 16px;
        padding: 20px;
        backdrop-filter: blur(10px);
        transition: transform 0.2s, box-shadow 0.2s;
        cursor: pointer;
        border: 1px solid rgba(255,255,255,0.1);
    `;
    card.onmouseenter = () => {
        card.style.transform = 'translateY(-5px)';
        card.style.boxShadow = '0 20px 40px rgba(0,0,0,0.3)';
    };
    card.onmouseleave = () => {
        card.style.transform = 'translateY(0)';
        card.style.boxShadow = 'none';
    };
    card.onclick = () => openResource(resource.id);
    
    const fileType = getFileType(resource.file_path);
    const fileIcon = getFileIcon(resource.file_path);
    const blockClass = getBlockTagClass(resource.block);
    const blockIcon = getBlockIcon(resource.block);
    
    card.innerHTML = `
        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
            <div style="width: 50px; height: 50px; background: ${fileType === 'pdf' ? '#ef4444' : fileType === 'image' ? '#10b981' : '#3b82f6'}; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                <i class="${fileIcon}" style="font-size: 24px; color: white;"></i>
            </div>
            <div style="flex: 1;">
                <h3 style="color: white; font-size: 16px; margin: 0 0 5px 0; font-weight: 600;">${escapeHtml(resource.title)}</h3>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <span style="background: ${getBlockColor(resource.block)}; padding: 4px 10px; border-radius: 20px; font-size: 11px; color: white; display: inline-flex; align-items: center; gap: 5px;">
                        <i class="fas ${blockIcon}"></i> ${escapeHtml(resource.block || 'General')}
                    </span>
                    <span style="background: #4C1D95; padding: 4px 10px; border-radius: 20px; font-size: 11px; color: white; display: inline-flex; align-items: center; gap: 5px;">
                        <i class="fas fa-eye"></i> Read Only
                    </span>
                </div>
            </div>
        </div>
        <p style="color: rgba(255,255,255,0.7); font-size: 13px; line-height: 1.5; margin: 0 0 15px 0;">${escapeHtml(resource.description || 'No description available')}</p>
        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1);">
            <span style="color: rgba(255,255,255,0.5); font-size: 11px;">
                <i class="fas fa-calendar"></i> ${new Date(resource.created_at).toLocaleDateString()}
            </span>
            <button style="background: linear-gradient(135deg, #4C1D95 0%, #7c3aed 100%); border: none; padding: 8px 16px; border-radius: 8px; color: white; font-size: 13px; cursor: pointer; transition: transform 0.2s;">
                <i class="fas fa-eye"></i> Read Now
            </button>
        </div>
    `;
    
    return card;
}

function getBlockColor(block) {
    if (!block) return '#6b7280';
    const b = block.toLowerCase();
    if (b.includes('intro')) return '#f59e0b';
    if (b.includes('block 1')) return '#3b82f6';
    if (b.includes('block 2')) return '#10b981';
    if (b.includes('block 3')) return '#8b5cf6';
    if (b.includes('block 4')) return '#ec4899';
    if (b.includes('block 5')) return '#06b6d4';
    if (b.includes('final')) return '#ef4444';
    return '#6b7280';
}

function loadMoreResources() {
    currentPage++;
    renderResourcesGrid();
}

function resetFilters() {
    if (cachedElements.blockFilter) cachedElements.blockFilter.value = 'all';
    if (cachedElements.resourceSearch) cachedElements.resourceSearch.value = '';
    if (cachedElements.resourceFilter) cachedElements.resourceFilter.value = 'all';
    if (cachedElements.courseFilter) cachedElements.courseFilter.value = 'all';
    currentBlockFilter = 'all';
    filterResourcesByBlock();
}

function updateResourceCountDisplay() {
    const refreshBtn = cachedElements.refreshBtn;
    if (refreshBtn) {
        const count = filteredResources.length;
        refreshBtn.setAttribute('data-count', count);
        if (count > 0 && currentBlockFilter !== 'all') {
            refreshBtn.style.position = 'relative';
        }
    }
}

// ==================== READ-ONLY PDF VIEWER (OPTIMIZED) ====================

async function initializePDFJS() {
    if (typeof window.pdfjsLib !== 'undefined') {
        pdfjsLib = window.pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        return true;
    }
    
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => {
            pdfjsLib = window.pdfjsLib;
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            resolve(true);
        };
        document.head.appendChild(script);
    });
}

async function openResource(resourceId) {
    const resource = currentResources.find(r => r.id == resourceId);
    if (!resource) {
        showToast('Resource not found', 'error');
        return;
    }
    
    const fileType = getFileType(resource.file_path);
    
    if (fileType === 'pdf') {
        await openReadOnlyPDF(resource);
    } else if (fileType === 'image') {
        openReadOnlyImage(resource);
    } else if (fileType === 'video') {
        openReadOnlyVideo(resource);
    } else {
        window.open(resource.file_url + '#toolbar=0', '_blank');
    }
}

async function openReadOnlyPDF(resource) {
    await initializePDFJS();
    createReadOnlyPDFViewer(resource);
    await loadHighQualityPDF(resource.file_url);
}

function createReadOnlyPDFViewer(resource) {
    const existingModal = document.getElementById('readonly-pdf-modal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'readonly-pdf-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.95); display: flex; justify-content: center;
        align-items: center; z-index: 10000; backdrop-filter: blur(8px);
    `;
    modal.innerHTML = `
        <div style="width: 95%; height: 95%; background: #1a1a2e; border-radius: 20px; display: flex; flex-direction: column; overflow: hidden;">
            <div style="padding: 16px 24px; background: linear-gradient(135deg, #16213e 0%, #1a1a2e 100%); border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 12px; color: white;">
                    <i class="fas fa-file-pdf" style="font-size: 24px; color: #ef4444;"></i>
                    <div>
                        <h3 style="margin: 0; font-size: 1rem;">${escapeHtml(resource.title)}</h3>
                        <span style="font-size: 11px; background: #4C1D95; padding: 4px 10px; border-radius: 20px;">Read Only Mode</span>
                    </div>
                </div>
                <button id="close-readonly-pdf" style="background: rgba(255,255,255,0.1); border: none; width: 36px; height: 36px; border-radius: 8px; color: white; cursor: pointer;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div style="flex: 1; overflow: auto; background: #2d2d3a; position: relative;">
                <div id="pdf-loading" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; background: #2d2d3a;">
                    <div style="width: 60px; height: 60px; border: 4px solid rgba(255,255,255,0.2); border-top-color: #4C1D95; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <p style="color: white; margin-top: 20px;">Loading high-quality document...</p>
                </div>
                <div id="pdf-viewer-area" style="display: none; justify-content: center; padding: 20px;">
                    <canvas id="readonly-pdf-canvas" style="display: block; margin: 0 auto; box-shadow: 0 4px 20px rgba(0,0,0,0.3); background: white; border-radius: 4px;"></canvas>
                </div>
            </div>
            
            <div style="background: linear-gradient(135deg, #16213e 0%, #1a1a2e 100%); border-top: 1px solid rgba(255,255,255,0.1); padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <button id="pdf-prev-page" style="background: rgba(255,255,255,0.1); border: none; width: 40px; height: 40px; border-radius: 8px; color: white; cursor: pointer;">◀</button>
                    <div style="display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.1); padding: 6px 12px; border-radius: 8px;">
                        <input type="number" id="pdf-page-number" min="1" value="1" style="width: 50px; padding: 6px; border-radius: 6px; text-align: center;">
                        <span style="color: white;">/</span>
                        <span id="pdf-total-pages" style="color: white;">1</span>
                    </div>
                    <button id="pdf-next-page" style="background: rgba(255,255,255,0.1); border: none; width: 40px; height: 40px; border-radius: 8px; color: white; cursor: pointer;">▶</button>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <button id="pdf-zoom-out" style="background: rgba(255,255,255,0.1); border: none; width: 40px; height: 40px; border-radius: 8px; color: white; cursor: pointer;">-</button>
                    <span id="pdf-zoom-percent" style="color: white; min-width: 60px; text-align: center;">150%</span>
                    <button id="pdf-zoom-in" style="background: rgba(255,255,255,0.1); border: none; width: 40px; height: 40px; border-radius: 8px; color: white; cursor: pointer;">+</button>
                </div>
                <div style="display: flex; align-items: center; gap: 8px; background: rgba(76,29,149,0.3); padding: 8px 16px; border-radius: 40px;">
                    <i class="fas fa-lock" style="color: #a78bfa;"></i>
                    <span style="color: #a78bfa; font-size: 12px;">Protected - No Download</span>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
    
    // Event listeners
    document.getElementById('close-readonly-pdf').onclick = () => {
        modal.remove();
        if (currentPDFDoc) currentPDFDoc.destroy();
    };
    document.getElementById('pdf-prev-page').onclick = () => goToPDFPage(currentPDFPage - 1);
    document.getElementById('pdf-next-page').onclick = () => goToPDFPage(currentPDFPage + 1);
    document.getElementById('pdf-zoom-in').onclick = () => zoomPDF(1.2);
    document.getElementById('pdf-zoom-out').onclick = () => zoomPDF(0.8);
    document.getElementById('pdf-page-number').onchange = (e) => goToPDFPage(parseInt(e.target.value));
    
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

async function loadHighQualityPDF(pdfUrl) {
    try {
        const loadingTask = pdfjsLib.getDocument({
            url: pdfUrl,
            cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
            cMapPacked: true
        });
        
        currentPDFDoc = await loadingTask.promise;
        totalPDFPages = currentPDFDoc.numPages;
        
        document.getElementById('pdf-total-pages').textContent = totalPDFPages;
        document.getElementById('pdf-page-number').max = totalPDFPages;
        document.getElementById('pdf-loading').style.display = 'none';
        document.getElementById('pdf-viewer-area').style.display = 'flex';
        
        pdfScale = 1.5;
        await renderPDFPage(1);
        
    } catch (error) {
        document.getElementById('pdf-loading').innerHTML = `<p style="color: red;">Failed to load: ${error.message}</p>`;
    }
}

async function renderPDFPage(pageNum) {
    if (!currentPDFDoc || pageNum < 1 || pageNum > totalPDFPages) return;
    
    const page = await currentPDFDoc.getPage(pageNum);
    const canvas = document.getElementById('readonly-pdf-canvas');
    const viewport = page.getViewport({ scale: pdfScale });
    
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = viewport.width + 'px';
    canvas.style.height = viewport.height + 'px';
    
    await page.render({
        canvasContext: canvas.getContext('2d'),
        viewport: viewport
    }).promise;
    
    currentPDFPage = pageNum;
    document.getElementById('pdf-page-number').value = pageNum;
    document.getElementById('pdf-zoom-percent').textContent = Math.round(pdfScale * 100) + '%';
}

function goToPDFPage(pageNum) {
    if (pageNum < 1) pageNum = 1;
    if (pageNum > totalPDFPages) pageNum = totalPDFPages;
    renderPDFPage(pageNum);
}

function zoomPDF(factor) {
    pdfScale = Math.max(0.5, Math.min(pdfScale * factor, 4.0));
    renderPDFPage(currentPDFPage);
}

// ==================== IMAGE/VIDEO VIEWERS ====================

function openReadOnlyImage(resource) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.95); display: flex; justify-content: center; align-items: center; z-index: 10000;';
    modal.innerHTML = `
        <div style="max-width: 90vw; max-height: 90vh; background: #1a1a2e; border-radius: 20px; overflow: hidden;">
            <div style="padding: 15px 20px; background: linear-gradient(135deg, #16213e 0%, #1a1a2e 100%); display: flex; justify-content: space-between; align-items: center;">
                <h3 style="color: white; margin: 0;">${escapeHtml(resource.title)}</h3>
                <button onclick="this.closest('div').parentElement.remove()" style="background: rgba(255,255,255,0.1); border: none; width: 32px; height: 32px; border-radius: 8px; color: white; cursor: pointer;">✕</button>
            </div>
            <div style="padding: 20px; background: #2d2d3a;">
                <img src="${resource.file_url}" style="max-width: calc(90vw - 40px); max-height: calc(70vh - 40px); border-radius: 12px;">
            </div>
            <div style="padding: 12px 20px; text-align: center; color: #a78bfa; font-size: 12px;">
                <i class="fas fa-lock"></i> Protected Image - No Download
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

function openReadOnlyVideo(resource) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.95); display: flex; justify-content: center; align-items: center; z-index: 10000;';
    modal.innerHTML = `
        <div style="max-width: 90vw; max-height: 90vh; background: #1a1a2e; border-radius: 20px; overflow: hidden;">
            <div style="padding: 15px 20px; background: linear-gradient(135deg, #16213e 0%, #1a1a2e 100%); display: flex; justify-content: space-between; align-items: center;">
                <h3 style="color: white; margin: 0;">${escapeHtml(resource.title)}</h3>
                <button onclick="this.closest('div').parentElement.remove()" style="background: rgba(255,255,255,0.1); border: none; width: 32px; height: 32px; border-radius: 8px; color: white; cursor: pointer;">✕</button>
            </div>
            <div style="padding: 20px; background: #2d2d3a;">
                <video controls controlslist="nodownload" style="max-width: calc(90vw - 40px); max-height: calc(70vh - 40px); border-radius: 12px;">
                    <source src="${resource.file_url}">
                </video>
            </div>
            <div style="padding: 12px 20px; text-align: center; color: #a78bfa; font-size: 12px;">
                <i class="fas fa-lock"></i> Protected Video - No Download
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

// ==================== UTILITY FUNCTIONS ====================

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
    const icons = { pdf: 'fa-file-pdf', image: 'fa-file-image', video: 'fa-file-video' };
    return `fas ${icons[type] || 'fa-file-alt'}`;
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

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showLoading(message) {
    if (cachedElements.resourcesGrid) {
        cachedElements.resourcesGrid.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <div style="width: 60px; height: 60px; border: 4px solid rgba(255,255,255,0.2); border-top-color: #4C1D95; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
                <p style="color: white; margin-top: 20px;">${message}</p>
            </div>
        `;
    }
}

function showError(message) {
    if (cachedElements.resourcesGrid) {
        cachedElements.resourcesGrid.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; background: rgba(255,255,255,0.02); border-radius: 20px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #ef4444; margin-bottom: 20px; display: inline-block;"></i>
                <h3 style="color: white;">Error</h3>
                <p style="color: rgba(255,255,255,0.6);">${message}</p>
                <button onclick="window.loadAllResourcesForBlocks()" style="margin-top: 20px; background: linear-gradient(135deg, #4C1D95 0%, #7c3aed 100%); border: none; padding: 10px 20px; border-radius: 10px; color: white; cursor: pointer;">Retry</button>
            </div>
        `;
    }
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; background: ${type === 'error' ? '#dc2626' : '#10b981'};
        color: white; padding: 12px 24px; border-radius: 12px; z-index: 10001;
        animation: slideIn 0.3s ease; font-size: 14px; font-weight: 500;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ==================== INITIALIZATION ====================

function initializeResourcesModule() {
    console.log('⚡ Initializing Ultra-Fast Resources Module...');
    createBlockFilterUI();
    
    const resourcesTab = document.querySelector('.nav a[data-tab="resources"]');
    if (resourcesTab) {
        resourcesTab.addEventListener('click', () => {
            if (getCurrentUserId() && !currentResources.length) {
                loadAllResourcesForBlocks();
            }
        });
    }
    
    const currentTab = localStorage.getItem('nchsm_last_tab');
    if (currentTab === 'resources' && getCurrentUserId()) {
        loadAllResourcesForBlocks();
    }
    
    // Preload on idle time
    if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
            if (getCurrentUserId()) loadAllResourcesForBlocks();
        });
    } else {
        setTimeout(() => {
            if (getCurrentUserId()) loadAllResourcesForBlocks();
        }, 100);
    }
}

// Expose globals
window.loadAllResourcesForBlocks = loadAllResourcesForBlocks;
window.loadAllResources = loadAllResourcesForBlocks;
window.openResource = openResource;
window.filterResourcesByBlock = filterResourcesByBlock;
window.resetFilters = resetFilters;
window.loadMoreResources = loadMoreResources;
window.clearCache = clearCache;
window.initializeResourcesModule = initializeResourcesModule;

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeResourcesModule);
} else {
    initializeResourcesModule();
}
