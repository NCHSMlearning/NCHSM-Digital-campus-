// resources.js - Premium READ-ONLY High-Quality Resource Viewer with Block Filter & Refresh Button

let pdfjsLib = null;
let pdfjsLoaded = false;
let currentPDFDoc = null;
let currentPDFPage = 1;
let totalPDFPages = 0;
let pdfScale = 1.5;
let pageRendering = false;
let pageNumPending = null;
let currentResource = null;

// Global variables
let currentResources = [];
let filteredResources = [];
let currentBlockFilter = 'all';
let isLoading = false;

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

// Initialize PDF.js
async function initializePDFJS() {
    if (pdfjsLoaded) return true;
    
    return new Promise((resolve, reject) => {
        if (typeof window.pdfjsLib !== 'undefined') {
            pdfjsLib = window.pdfjsLib;
            if (pdfjsLib.GlobalWorkerOptions) {
                pdfjsLib.GlobalWorkerOptions.workerSrc = 
                    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            }
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
            await loadAllResources();
            
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

// Load all resources
async function loadAllResources() {
    if (isLoading) return;
    
    const supabaseClient = getSupabaseClient();
    const userProfile = getUserProfile();
    
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
            resourcesGrid.innerHTML = '<div class="empty-state">Missing enrollment details</div>';
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
        filterResources();

    } catch (err) {
        console.error("Error loading resources:", err);
        showError(resourcesGrid, `Error: ${err.message}`);
    } finally {
        isLoading = false;
    }
}

// Filter resources
function filterResources() {
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
    renderResources();
}

// Render resources
function renderResources() {
    const resourcesGrid = document.getElementById('resources-grid');
    if (!resourcesGrid) return;

    if (filteredResources.length === 0) {
        resourcesGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <h3>No Resources Found</h3>
                <p>No resources match your current filters.</p>
                <button onclick="resetAndRefresh()" class="premium-btn">
                    <i class="fas fa-eye"></i> View All Blocks
                </button>
            </div>
        `;
        return;
    }

    resourcesGrid.innerHTML = filteredResources.map(resource => `
        <div class="resource-card">
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
                    <span class="meta-tag block-tag">
                        <i class="fas fa-layer-group"></i> ${escapeHtml(resource.block || 'General')}
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
    
    // Update course filter
    const courses = [...new Set(currentResources.map(r => r.program_type).filter(Boolean))];
    const courseFilter = document.getElementById('course-filter');
    if (courseFilter) {
        const currentValue = courseFilter.value;
        courseFilter.innerHTML = '<option value="all">All Courses</option>' +
            courses.map(c => `<option value="${c}" ${currentValue === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('');
    }
}

// Open resource
async function openResource(resourceId) {
    const resource = currentResources.find(r => r.id == resourceId);
    if (!resource) {
        showToast('Resource not found', 'error');
        return;
    }

    currentResource = resource;
    const fileType = getFileType(resource.file_path);
    
    if (fileType === 'pdf') {
        await initializePDFJS();
        window.open(resource.file_url + '#toolbar=0', '_blank');
    } else {
        window.open(resource.file_url, '_blank');
    }
}

// Reset and refresh function
window.resetAndRefresh = function() {
    const blockFilter = document.getElementById('block-resource-filter');
    if (blockFilter) {
        blockFilter.value = 'all';
    }
    currentBlockFilter = 'all';
    const refreshBtn = document.getElementById('refresh-block-resources');
    if (refreshBtn) {
        refreshBtn.click();
    }
};

// Setup event listeners
function setupEventListeners() {
    const searchInput = document.getElementById('resource-search');
    const typeFilter = document.getElementById('resource-filter');
    const courseFilter = document.getElementById('course-filter');
    
    if (searchInput) searchInput.addEventListener('input', () => filterResources());
    if (typeFilter) typeFilter.addEventListener('change', () => filterResources());
    if (courseFilter) courseFilter.addEventListener('change', () => filterResources());
}

// Helper functions
function getFileType(filePath) {
    if (!filePath) return 'file';
    const ext = filePath.split('.').pop().toLowerCase();
    if (ext === 'pdf') return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
    if (['mp4', 'webm', 'avi', 'mov'].includes(ext)) return 'video';
    return 'file';
}

function getFileIcon(filePath) {
    const type = getFileType(filePath);
    const icons = {
        'pdf': 'fas fa-file-pdf',
        'image': 'fas fa-file-image',
        'video': 'fas fa-file-video',
        'file': 'fas fa-file-alt'
    };
    return icons[type] || icons.file;
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
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>${message}</p>
            </div>
        `;
    }
}

function showError(element, message) {
    if (element) {
        element.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error</h3>
                <p>${message}</p>
                <button onclick="loadAllResources()" class="premium-btn">Retry</button>
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
    console.log('📁 Initializing Resources Module with Refresh Button...');
    
    createBlockFilterUI();
    setupEventListeners();
    
    // Load resources when tab is clicked
    const resourcesTab = document.querySelector('.nav a[data-tab="resources"]');
    if (resourcesTab) {
        resourcesTab.addEventListener('click', () => {
            if (getUserProfile()?.id) {
                loadAllResources();
            }
        });
    }
    
    // Load if already on resources page
    const currentTab = localStorage.getItem('nchsm_last_tab');
    if (currentTab === 'resources' && getUserProfile()?.id) {
        loadAllResources();
    }
    
    console.log('✅ Resources Module initialized');
}

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeResourcesModule);
} else {
    initializeResourcesModule();
}

// Exports
window.loadAllResources = loadAllResources;
window.openResource = openResource;
window.filterResources = filterResources;
window.resetAndRefresh = resetAndRefresh;
