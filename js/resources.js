// resources.js - Enhanced Resources System with Block Filter & Bottom Controls PDF Viewer

// *************************************************************************
// *** ENHANCED RESOURCES SYSTEM - WITH BLOCK FILTER ***
// *************************************************************************

// PDF.js configuration
let pdfjsLib = null;
let pdfjsLoaded = false;
let currentPDFDoc = null;
let currentPDFPage = 1;
let totalPDFPages = 0;
let pdfScale = 1.0;
let isRendering = false;
let pageRendering = false;
let pageNumPending = null;

// Global variables
let currentResources = [];
let filteredResources = [];
let currentBlockFilter = 'all';

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

// Initialize PDF.js
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

// Block filter configuration
const BLOCK_MAPPING = {
    'introductory': ['Introductory', 'Intro', 'Foundation', 'Block 0', 'Intro Block'],
    'block1': ['Block 1', 'Block1', 'B1', 'First Block'],
    'block2': ['Block 2', 'Block2', 'B2', 'Second Block'],
    'block3': ['Block 3', 'Block3', 'B3', 'Third Block'],
    'block4': ['Block 4', 'Block4', 'B4', 'Fourth Block'],
    'block5': ['Block 5', 'Block5', 'B5', 'Fifth Block'],
    'final': ['Final', 'Final Block', 'Block 6', 'Graduation Block']
};

// Get all available blocks for filter dropdown
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

// Create block filter UI
function createBlockFilterUI() {
    const resourcesHeader = document.querySelector('#resources .resources-header');
    if (!resourcesHeader) return;
    
    // Check if block filter already exists
    if (document.getElementById('block-resource-filter')) return;
    
    const blockFilterHTML = `
        <div class="block-filter-card" style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 16px; padding: 20px; margin-bottom: 25px; border: 1px solid #bae6fd;">
            <div style="display: flex; align-items: center; gap: 15px; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-layer-group" style="font-size: 24px; color: #4C1D95;"></i>
                    <span style="font-weight: 600; color: #1e1b4b;">Filter by Block:</span>
                </div>
                <div style="flex: 1; min-width: 200px;">
                    <select id="block-resource-filter" class="modern-select" style="background: white; border-radius: 12px; padding: 12px 16px; font-weight: 500; width: 100%;">
                        ${getAllBlocks().map(block => `
                            <option value="${block.value}" data-icon="${block.icon}">
                                ${block.label}
                            </option>
                        `).join('')}
                    </select>
                </div>
                <div class="current-block-indicator" style="background: #4C1D95; color: white; padding: 8px 16px; border-radius: 20px; font-size: 13px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-user-graduate"></i>
                    <span>Your Block: <strong id="current-user-block">Loading...</strong></span>
                </div>
            </div>
            <div style="margin-top: 12px; font-size: 13px; color: #475569; display: flex; gap: 20px; flex-wrap: wrap;">
                <span><i class="fas fa-info-circle"></i> Select any block to view its materials</span>
                <span><i class="fas fa-download"></i> Previously hidden materials are now accessible</span>
                <span><i class="fas fa-chart-line"></i> Study ahead or review past blocks</span>
            </div>
        </div>
    `;
    
    // Insert after the header h2
    const h2 = resourcesHeader.querySelector('h2');
    if (h2 && h2.nextSibling) {
        h2.insertAdjacentHTML('afterend', blockFilterHTML);
    } else {
        resourcesHeader.insertAdjacentHTML('beforeend', blockFilterHTML);
    }
    
    // Set up event listener for block filter
    const blockFilter = document.getElementById('block-resource-filter');
    if (blockFilter) {
        blockFilter.addEventListener('change', (e) => {
            currentBlockFilter = e.target.value;
            filterResourcesByBlock();
            
            // Show feedback
            const selectedLabel = blockFilter.options[blockFilter.selectedIndex]?.text || 'selected block';
            showToast(`Showing resources for ${selectedLabel}`, 'info');
        });
    }
    
    // Set user's current block
    const userProfile = getUserProfile();
    const userBlock = userProfile?.block || 'Introductory';
    const blockDisplay = document.getElementById('current-user-block');
    if (blockDisplay) {
        blockDisplay.textContent = userBlock;
    }
    
    // Find matching filter value for user's block
    let userBlockValue = 'all';
    for (const [value, keywords] of Object.entries(BLOCK_MAPPING)) {
        if (keywords.some(k => userBlock.toLowerCase().includes(k.toLowerCase()))) {
            userBlockValue = value;
            break;
        }
    }
    
    // Set default to user's block (not 'all')
    if (userBlockValue !== 'all' && blockFilter) {
        blockFilter.value = userBlockValue;
        currentBlockFilter = userBlockValue;
    }
}

// Filter resources by selected block
async function filterResourcesByBlock() {
    if (!currentResources.length) {
        await loadAllResourcesForBlocks();
        return;
    }
    
    let filtered = [...currentResources];
    
    // Apply block filter
    if (currentBlockFilter !== 'all') {
        const targetKeywords = BLOCK_MAPPING[currentBlockFilter] || [];
        
        filtered = filtered.filter(resource => {
            const resourceBlock = (resource.block || resource.course_block || resource.block_name || '').toString().toLowerCase();
            return targetKeywords.some(keyword => 
                resourceBlock.includes(keyword.toLowerCase())
            );
        });
    }
    
    // Apply search filter
    const searchTerm = document.getElementById('resource-search')?.value.toLowerCase() || '';
    if (searchTerm) {
        filtered = filtered.filter(r => 
            (r.title || '').toLowerCase().includes(searchTerm) ||
            (r.description || '').toLowerCase().includes(searchTerm) ||
            (r.program_type || '').toLowerCase().includes(searchTerm)
        );
    }
    
    // Apply type filter
    const typeFilter = document.getElementById('resource-filter')?.value || 'all';
    if (typeFilter !== 'all') {
        filtered = filtered.filter(r => getFileType(r.file_path) === typeFilter);
    }
    
    // Apply course filter
    const courseFilter = document.getElementById('course-filter')?.value || 'all';
    if (courseFilter !== 'all') {
        filtered = filtered.filter(r => r.program_type === courseFilter);
    }
    
    filteredResources = filtered;
    renderResourcesGrid();
    updateResourceStats();
}

// Load all resources across all blocks (removes block restriction)
async function loadAllResourcesForBlocks() {
    console.log('📁 Loading resources from all blocks...');
    
    const userProfile = getUserProfile();
    const supabaseClient = getSupabaseClient();
    
    if (!supabaseClient) {
        const resourcesGrid = document.getElementById('resources-grid');
        if (resourcesGrid) showError(resourcesGrid, 'Database connection error');
        return;
    }
    
    const resourcesGrid = document.getElementById('resources-grid');
    if (!resourcesGrid) return;
    
    showLoading(resourcesGrid, 'Loading resources from all blocks...');
    currentResources = [];

    try {
        const program = userProfile?.program;
        const intakeYear = userProfile?.intake_year;

        if (!program || !intakeYear) {
            resourcesGrid.innerHTML = '<div class="error-state">Missing enrollment details</div>';
            return;
        }

        // IMPORTANT: Remove the block filter from the query
        // This loads resources from ALL blocks (Introductory through Final)
        const { data: resources, error } = await supabaseClient
            .from('resources')
            .select('id, title, file_path, file_url, program_type, block, intake, uploaded_by_name, created_at, description, file_type')
            .eq('program_type', program)
            .eq('intake', intakeYear)
            .order('created_at', { ascending: false });

        if (error) throw error;

        currentResources = resources || [];
        
        // Populate course filter
        populateCourseFilter();
        
        // Apply current block filter
        await filterResourcesByBlock();

    } catch (err) {
        console.error("Error loading resources:", err);
        showError(resourcesGrid, `Error loading resources: ${err.message}`);
    }
}

// Update resource statistics
function updateResourceStats() {
    const totalCount = document.getElementById('total-resources-count');
    const filteredCount = document.getElementById('filtered-resources-count');
    const lastUpdated = document.getElementById('resources-last-updated');
    
    if (totalCount) totalCount.textContent = currentResources.length;
    if (filteredCount) filteredCount.textContent = filteredResources.length;
    if (lastUpdated) lastUpdated.textContent = new Date().toLocaleString();
}

// Render resources grid (modified to show block badge)
function renderResourcesGrid() {
    const resourcesGrid = document.getElementById('resources-grid');
    if (!resourcesGrid) return;

    if (filteredResources.length === 0) {
        resourcesGrid.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 60px 20px;">
                <i class="fas fa-folder-open" style="font-size: 64px; color: #cbd5e1; margin-bottom: 20px;"></i>
                <h3 style="color: #4b5563;">No Resources Found</h3>
                <p style="color: #6b7280; margin-bottom: 20px;">No resources match your current filters.</p>
                <button onclick="document.getElementById('block-resource-filter').value='all'; currentBlockFilter='all'; filterResourcesByBlock();" 
                        class="btn-primary" style="padding: 10px 20px; background: #4C1D95; color: white; border: none; border-radius: 8px; cursor: pointer;">
                    <i class="fas fa-eye"></i> View All Blocks
                </button>
            </div>
        `;
        return;
    }

    resourcesGrid.innerHTML = filteredResources.map(resource => {
        const blockName = resource.block || 'General';
        const blockBadgeClass = getBlockBadgeClass(blockName);
        
        return `
        <div class="resource-card" data-type="${getFileType(resource.file_path)}" data-course="${resource.program_type}" data-block="${blockName}">
            <div class="card-header">
                <div class="file-icon ${getFileType(resource.file_path)}">
                    <i class="${getFileIcon(resource.file_path)}"></i>
                </div>
                <div class="card-title">
                    <h3>${escapeHtml(resource.title)}</h3>
                    <div class="title-badges">
                        <span class="file-type">${getFileType(resource.file_path).toUpperCase()}</span>
                        <span class="block-badge ${blockBadgeClass}">
                            <i class="fas ${getBlockIcon(blockName)}"></i> ${escapeHtml(blockName)}
                        </span>
                    </div>
                </div>
            </div>
            
            <div class="card-body">
                <p class="card-description">${escapeHtml(resource.description || 'No description available')}</p>
                
                <div class="card-meta">
                    <div class="meta-item">
                        <i class="fas fa-calendar"></i>
                        <span>${new Date(resource.created_at).toLocaleDateString()}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-user"></i>
                        <span>${escapeHtml(resource.uploaded_by_name || 'Admin')}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-book"></i>
                        <span>${escapeHtml(resource.program_type)}</span>
                    </div>
                </div>
            </div>
            
            <div class="card-footer">
                <button class="card-btn primary" onclick="openResource(${resource.id})">
                    <i class="fas fa-eye"></i> View Resource
                </button>
                <button class="card-btn secondary" onclick="downloadResource('${resource.file_url}', '${escapeHtml(resource.title)}')">
                    <i class="fas fa-download"></i> Download
                </button>
            </div>
        </div>
    `}).join('');
}

// Helper functions for block badges
function getBlockBadgeClass(blockName) {
    const blockLower = blockName.toLowerCase();
    if (blockLower.includes('introductory')) return 'badge-intro';
    if (blockLower.includes('block 1')) return 'badge-block1';
    if (blockLower.includes('block 2')) return 'badge-block2';
    if (blockLower.includes('block 3')) return 'badge-block3';
    if (blockLower.includes('block 4')) return 'badge-block4';
    if (blockLower.includes('block 5')) return 'badge-block5';
    if (blockLower.includes('final')) return 'badge-final';
    return 'badge-general';
}

function getBlockIcon(blockName) {
    const blockLower = blockName.toLowerCase();
    if (blockLower.includes('introductory')) return 'fa-flag-checkered';
    if (blockLower.includes('block 1')) return 'fa-book';
    if (blockLower.includes('block 2')) return 'fa-book-open';
    if (blockLower.includes('block 3')) return 'fa-chalkboard-user';
    if (blockLower.includes('block 4')) return 'fa-stethoscope';
    if (blockLower.includes('block 5')) return 'fa-user-nurse';
    if (blockLower.includes('final')) return 'fa-graduation-cap';
    return 'fa-layer-group';
}

// Download resource function
async function downloadResource(fileUrl, fileName) {
    try {
        const response = await fetch(fileUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName || 'download';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Download started', 'success');
    } catch (error) {
        console.error('Download error:', error);
        showToast('Failed to download file', 'error');
    }
}

// Populate course filter
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

// Open resource
async function openResource(resourceId) {
    console.log(`📄 Opening resource ${resourceId}...`);
    
    const resource = currentResources.find(r => r.id == resourceId);
    if (!resource) {
        console.error('Resource not found:', resourceId);
        showToast('Resource not found', 'error');
        return;
    }

    const fileType = getFileType(resource.file_path);
    
    if (fileType === 'pdf') {
        await openPDF(resource);
    } else {
        openOtherResource(resource);
    }
}

// Open PDF with proper viewer
async function openPDF(resource) {
    try {
        await initializePDFJS();
        createPDFViewerModal(resource);
        await loadPDFDocument(resource.file_url);
    } catch (error) {
        console.error('PDF error:', error);
        showToast('Failed to load PDF: ' + error.message, 'error');
    }
}

// Create PDF viewer modal with bottom controls (keep your existing implementation)
function createPDFViewerModal(resource) {
    // ... (keep your existing implementation)
}

// Add CSS for block badges
function addBlockBadgeStyles() {
    const styleId = 'block-badge-styles';
    if (document.getElementById(styleId)) return;
    
    const styles = `
        .title-badges {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 5px;
        }
        
        .block-badge {
            font-size: 11px;
            padding: 3px 10px;
            border-radius: 20px;
            font-weight: 500;
            display: inline-flex;
            align-items: center;
            gap: 5px;
        }
        
        .badge-intro { background: #dbeafe; color: #1e40af; }
        .badge-block1 { background: #dcfce7; color: #166534; }
        .badge-block2 { background: #fef3c7; color: #92400e; }
        .badge-block3 { background: #fce7f3; color: #9d174d; }
        .badge-block4 { background: #e0e7ff; color: #3730a3; }
        .badge-block5 { background: #cffafe; color: #0e7490; }
        .badge-final { background: #fef08a; color: #854d0e; }
        .badge-general { background: #f3f4f6; color: #374151; }
        
        .card-footer {
            display: flex;
            gap: 10px;
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #e5e7eb;
        }
        
        .card-btn {
            padding: 8px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            transition: all 0.2s;
        }
        
        .card-btn.primary {
            background: #4C1D95;
            color: white;
            border: none;
            flex: 1;
        }
        
        .card-btn.primary:hover {
            background: #3c1680;
        }
        
        .card-btn.secondary {
            background: #f3f4f6;
            color: #4b5563;
            border: 1px solid #e5e7eb;
        }
        
        .card-btn.secondary:hover {
            background: #e5e7eb;
        }
    `;
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = styles;
    document.head.appendChild(style);
}

// Filter resources (search and type)
function filterResources() {
    filterResourcesByBlock();
}

// Show loading
function showLoading(element, message) {
    if (element) {
        element.innerHTML = `
            <div class="loading-state" style="text-align: center; padding: 60px 20px;">
                <div class="loading-spinner" style="width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top-color: #4C1D95; border-radius: 50%; margin: 0 auto 15px; animation: spin 1s linear infinite;"></div>
                <p>${message}</p>
            </div>
        `;
    }
}

function showError(element, message) {
    if (element) {
        element.innerHTML = `
            <div class="error-state" style="text-align: center; padding: 60px 20px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #ef4444; margin-bottom: 15px;"></i>
                <h3 style="color: #dc2626;">Error</h3>
                <p>${message}</p>
                <button onclick="location.reload()" style="margin-top: 15px; padding: 8px 16px; background: #4C1D95; color: white; border: none; border-radius: 6px; cursor: pointer;">Retry</button>
            </div>
        `;
    }
}

function showToast(message, type = 'info') {
    if (window.ui && window.ui.showToast) {
        window.ui.showToast(message, type);
    } else {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = message;
            toast.style.display = 'block';
            toast.style.backgroundColor = type === 'error' ? '#ef4444' : '#10b981';
            setTimeout(() => {
                toast.style.display = 'none';
            }, 3000);
        } else {
            alert(message);
        }
    }
}

function getFileType(filePath) {
    if (!filePath) return 'unknown';
    const ext = filePath.split('.').pop().toLowerCase();
    if (ext === 'pdf') return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
    if (['mp4', 'webm', 'avi'].includes(ext)) return 'video';
    return 'file';
}

function getFileIcon(filePath) {
    const type = getFileType(filePath);
    const icons = {
        'pdf': 'fas fa-file-pdf',
        'image': 'fas fa-file-image',
        'video': 'fas fa-file-video',
        'file': 'fas fa-file'
    };
    return icons[type] || icons.file;
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Initialize resources module
function initializeResourcesModule() {
    console.log('📁 Initializing Resources Module with Block Filter...');
    
    addBlockBadgeStyles();
    createBlockFilterUI();
    
    // Set up event listeners for filters
    const resourceSearch = document.getElementById('resource-search');
    const resourceFilter = document.getElementById('resource-filter');
    const courseFilter = document.getElementById('course-filter');
    
    if (resourceSearch) resourceSearch.addEventListener('input', filterResources);
    if (resourceFilter) resourceFilter.addEventListener('change', filterResources);
    if (courseFilter) courseFilter.addEventListener('change', filterResources);
    
    // Load resources when tab is shown
    const resourcesTab = document.querySelector('.nav a[data-tab="resources"]');
    if (resourcesTab) {
        resourcesTab.addEventListener('click', () => {
            if (getCurrentUserId()) {
                loadAllResourcesForBlocks();
            }
        });
    }
    
    // Also load if already on resources page
    const currentTab = localStorage.getItem('nchsm_last_tab');
    if (currentTab === 'resources' && getCurrentUserId()) {
        loadAllResourcesForBlocks();
    }
    
    console.log('✅ Resources Module initialized with Block Filter');
}

// Global exports
window.loadResources = loadAllResourcesForBlocks;
window.openResource = openResource;
window.filterResources = filterResources;
window.downloadResource = downloadResource;
window.initializeResourcesModule = initializeResourcesModule;

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeResourcesModule);
} else {
    initializeResourcesModule();
}
