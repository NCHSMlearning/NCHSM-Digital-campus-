// *************************************************************************
// *** ENHANCED RESOURCES SYSTEM - VIEW ONLY ***
// *************************************************************************

// PDF.js Library Management
let pdfjsLib = null;

// Helper function for safe Supabase client access
function getSupabaseClient() {
    const client = window.db?.supabase;
    if (!client || typeof client.from !== 'function') {
        console.error('❌ No valid Supabase client available');
        return null;
    }
    return client;
}

// Helper function for safe user profile access
function getUserProfile() {
    return window.db?.currentUserProfile || 
           window.currentUserProfile || 
           window.userProfile || 
           {};
}

// Helper function for safe user ID access
function getCurrentUserId() {
    return window.db?.currentUserId || window.currentUserId;
}

let currentResources = [];
let filteredResources = [];
let currentReaderResource = null;
let currentPDFDoc = null;
let currentPDFPage = 1;
let currentPDFScale = 1.5;

// Initialize PDF.js library
async function initializePDFJS() {
    console.log('📚 Initializing PDF.js...');
    
    // Check if already loaded
    if (window.pdfjsLib) {
        pdfjsLib = window.pdfjsLib;
        console.log('✅ PDF.js already available globally');
    } else if (typeof pdfjsLib !== 'undefined') {
        console.log('✅ PDF.js already loaded');
    } else {
        // Try to load from CDN
        console.log('📥 Loading PDF.js from CDN...');
        await loadPDFJSLibrary();
    }
    
    // Set worker source
    if (pdfjsLib && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        console.log('✅ PDF.js worker source set');
    }
    
    return pdfjsLib;
}

// Load PDF.js library dynamically
function loadPDFJSLibrary() {
    return new Promise((resolve, reject) => {
        // Check if already loading
        if (document.getElementById('pdfjs-script')) {
            console.log('PDF.js script already loading');
            resolve();
            return;
        }
        
        // Load main PDF.js library
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.id = 'pdfjs-script';
        
        script.onload = () => {
            console.log('✅ PDF.js library loaded');
            pdfjsLib = window.pdfjsLib;
            
            // Load worker script
            const workerScript = document.createElement('script');
            workerScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            workerScript.id = 'pdfjs-worker-script';
            
            workerScript.onload = () => {
                console.log('✅ PDF.js worker loaded');
                
                // Verify PDF.js is available
                if (typeof pdfjsLib !== 'undefined') {
                    pdfjsLib.GlobalWorkerOptions.workerSrc = 
                        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                    console.log('✅ PDF.js fully initialized');
                    resolve(pdfjsLib);
                } else {
                    console.error('❌ PDF.js not defined after loading');
                    reject(new Error('PDF.js failed to initialize'));
                }
            };
            
            workerScript.onerror = (error) => {
                console.error('❌ Failed to load PDF.js worker:', error);
                // Still try to continue without worker
                if (typeof pdfjsLib !== 'undefined') {
                    resolve(pdfjsLib);
                } else {
                    reject(error);
                }
            };
            
            document.head.appendChild(workerScript);
        };
        
        script.onerror = (error) => {
            console.error('❌ Failed to load PDF.js:', error);
            reject(error);
        };
        
        document.head.appendChild(script);
    });
}

// Enhanced loadResources function
async function loadResources() {
    console.log('📁 Loading resources...');
    
    // Initialize PDF.js first
    try {
        await initializePDFJS();
    } catch (error) {
        console.warn('⚠️ PDF.js initialization warning:', error.message);
    }
    
    const userProfile = getUserProfile();
    const userId = getCurrentUserId();
    const supabaseClient = getSupabaseClient();
    
    if (!supabaseClient) {
        const resourcesGrid = document.getElementById('resources-grid');
        if (resourcesGrid) {
            AppUtils.showError(resourcesGrid, 'Database connection error');
        }
        return;
    }
    
    const resourcesGrid = document.getElementById('resources-grid');
    if (!resourcesGrid) return;
    
    AppUtils.showLoading(resourcesGrid, 'Loading resources...');
    currentResources = [];

    try {
        const program = userProfile?.program;
        const block = userProfile?.block;
        const intakeYear = userProfile?.intake_year;

        if (!program || !intakeYear || !block) {
            resourcesGrid.innerHTML = '<div class="error-state">Missing enrollment details</div>';
            return;
        }

        const { data: resources, error } = await supabaseClient
            .from('resources')
            .select('id, title, file_path, file_url, program_type, block, intake, uploaded_by_name, created_at, description, file_type')
            .eq('program_type', program)
            .eq('block', block)
            .eq('intake', intakeYear)
            .order('created_at', { ascending: false });

        if (error) throw error;

        currentResources = resources || [];
        filteredResources = [...currentResources];
        
        renderResourcesGrid();
        populateCourseFilter();

    } catch (err) {
        console.error("Error loading resources:", err);
        AppUtils.showError(resourcesGrid, `Error loading resources: ${err.message}`);
    }

    if (typeof loadDashboardMetrics === 'function') {
        loadDashboardMetrics(userId);
    }
}

// Render mobile-optimized resources grid - VIEW ONLY
function renderResourcesGrid() {
    const resourcesGrid = document.getElementById('resources-grid');
    if (!resourcesGrid) return;

    if (filteredResources.length === 0) {
        resourcesGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <h3>No Resources Found</h3>
                <p>No resources match your current filters</p>
            </div>
        `;
        return;
    }

    resourcesGrid.innerHTML = filteredResources.map(resource => `
        <div class="resource-card" data-type="${getFileType(resource.file_path)}" data-course="${resource.program_type}">
            <div class="card-header">
                <div class="file-icon ${getFileType(resource.file_path)}">
                    <i class="${getFileIcon(resource.file_path)}"></i>
                </div>
                <div class="card-title">
                    <h3>${escapeHtml(resource.title)}</h3>
                    <span class="file-type">${getFileType(resource.file_path).toUpperCase()}</span>
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
            </div>
        </div>
    `).join('');
}

// Open resource in mobile-optimized reader - VIEW ONLY
async function openResource(resourceId) {
    console.log(`📄 Opening resource ${resourceId}...`);
    
    const resource = currentResources.find(r => r.id == resourceId);
    if (!resource) {
        console.error('Resource not found:', resourceId);
        return;
    }

    currentReaderResource = resource;

    const reader = document.getElementById('mobile-reader');
    const readerTitle = document.getElementById('reader-title');
    const readerContent = document.getElementById('reader-content');

    if (!reader || !readerTitle || !readerContent) {
        console.error('Reader elements not found');
        return;
    }

    // Show reader
    reader.style.display = 'block';
    readerTitle.textContent = resource.title;

    // Clear previous content
    readerContent.innerHTML = '<div class="loading-state"><p>Loading resource...</p></div>';

    // Load content based on file type
    const fileType = getFileType(resource.file_path);
    
    try {
        if (fileType === 'pdf') {
            await loadPDFInReader(resource, readerContent);
        } else if (['doc', 'docx', 'ppt', 'pptx'].includes(fileType)) {
            loadOfficeInReader(resource, readerContent);
        } else if (fileType === 'video') {
            loadVideoInReader(resource, readerContent);
        } else {
            loadFallbackView(resource, readerContent);
        }
    } catch (error) {
        console.error('Error loading resource:', error);
        readerContent.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Failed to load resource</h3>
                <p>${error.message}</p>
                <button onclick="window.open('${resource.file_url}', '_blank')" class="profile-button" style="margin-top: 15px;">
                    <i class="fas fa-external-link-alt"></i> Open in New Tab
                </button>
            </div>
        `;
    }
}

window.openResource = openResource; // Make globally available

// Close mobile reader
function closeReader() {
    const reader = document.getElementById('mobile-reader');
    if (reader) {
        reader.style.display = 'none';
        currentReaderResource = null;
        currentPDFDoc = null;
        currentPDFPage = 1;
    }
}

// Filter resources
function filterResources() {
    const searchTerm = document.getElementById('resource-search').value.toLowerCase();
    const typeFilter = document.getElementById('resource-filter').value;
    const courseFilter = document.getElementById('course-filter').value;

    filteredResources = currentResources.filter(resource => {
        const matchesSearch = resource.title.toLowerCase().includes(searchTerm) || 
                            (resource.description && resource.description.toLowerCase().includes(searchTerm));
        const matchesType = typeFilter === 'all' || getFileType(resource.file_path) === typeFilter;
        const matchesCourse = courseFilter === 'all' || resource.program_type === courseFilter;

        return matchesSearch && matchesType && matchesCourse;
    });

    renderResourcesGrid();
}

// Populate course filter
function populateCourseFilter() {
    const courseFilter = document.getElementById('course-filter');
    if (!courseFilter) return;

    const courses = [...new Set(currentResources.map(r => r.program_type))];
    
    courseFilter.innerHTML = '<option value="all">All Courses</option>';
    courses.forEach(course => {
        const option = document.createElement('option');
        option.value = course;
        option.textContent = course;
        courseFilter.appendChild(option);
    });
}

// Utility functions for resources
function getFileType(filePath) {
    if (!filePath) return 'unknown';
    const ext = filePath.split('.').pop().toLowerCase();
    
    if (ext === 'pdf') return 'pdf';
    if (['doc', 'docx'].includes(ext)) return 'doc';
    if (['ppt', 'pptx'].includes(ext)) return 'slides';
    if (['mp4', 'avi', 'mov', 'wmv'].includes(ext)) return 'video';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return 'image';
    
    return 'file';
}

function getFileIcon(filePath) {
    const type = getFileType(filePath);
    
    switch(type) {
        case 'pdf': return 'fas fa-file-pdf';
        case 'doc': return 'fas fa-file-word';
        case 'slides': return 'fas fa-file-powerpoint';
        case 'video': return 'fas fa-file-video';
        case 'image': return 'fas fa-file-image';
        default: return 'fas fa-file';
    }
}

// PDF loading for mobile - VIEW ONLY
async function loadPDFInReader(resource, container) {
    console.log('📄 Loading PDF:', resource.title);
    
    // Check if PDF.js is available
    if (!pdfjsLib) {
        console.warn('PDF.js not loaded, attempting to initialize...');
        try {
            await initializePDFJS();
        } catch (error) {
            console.error('Failed to initialize PDF.js:', error);
            container.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>PDF Viewer Unavailable</h3>
                    <p>PDF library failed to load. Please refresh the page.</p>
                    <button onclick="window.open('${resource.file_url}', '_blank')" class="profile-button">
                        <i class="fas fa-external-link-alt"></i> Open PDF in New Tab
                    </button>
                </div>
            `;
            return;
        }
    }
    
    container.innerHTML = `
        <div class="pdf-mobile-viewer">
            <div class="view-only-notice">
                <i class="fas fa-eye"></i>
                <span>View Only - Content cannot be downloaded</span>
            </div>
            <!-- PDF CONTAINER -->
            <div class="pdf-container-mobile">
                <canvas id="pdf-canvas-mobile"></canvas>
            </div>
            <!-- NAVIGATION CONTROLS -->
            <div class="pdf-controls-mobile">
                <button id="prev-page-btn" class="pdf-nav-btn">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <span class="pdf-page-info">
                    Page: <span id="current-page">1</span> of <span id="total-pages">...</span>
                </span>
                <button id="next-page-btn" class="pdf-nav-btn">
                    <i class="fas fa-chevron-right"></i>
                </button>
                <button id="zoom-in-btn" class="pdf-nav-btn">
                    <i class="fas fa-search-plus"></i>
                </button>
                <button id="zoom-out-btn" class="pdf-nav-btn">
                    <i class="fas fa-search-minus"></i>
                </button>
            </div>
        </div>
    `;

    try {
        // Load PDF document
        const loadingTask = pdfjsLib.getDocument(resource.file_url);
        const pdfDoc = await loadingTask.promise;
        
        currentPDFDoc = pdfDoc;
        currentPDFPage = 1;
        
        // Update total pages
        document.getElementById('total-pages').textContent = pdfDoc.numPages;
        
        // Render first page
        await renderPDFPage(currentPDFPage);
        
        // Set up event listeners for controls
        document.getElementById('prev-page-btn').onclick = () => changePDFPage(-1);
        document.getElementById('next-page-btn').onclick = () => changePDFPage(1);
        document.getElementById('zoom-in-btn').onclick = () => zoomPDF(true);
        document.getElementById('zoom-out-btn').onclick = () => zoomPDF(false);
        
        // Keyboard navigation
        container.addEventListener('keydown', handlePDFKeyboardNavigation);
        
    } catch (error) {
        console.error('PDF loading error:', error);
        container.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Failed to load PDF</h3>
                <p>${error.message}</p>
                <p class="view-only-message">This resource is view-only and cannot be downloaded.</p>
                <button onclick="window.open('${resource.file_url}', '_blank')" class="profile-button" style="margin-top: 15px;">
                    <i class="fas fa-external-link-alt"></i> Open in New Tab
                </button>
            </div>
        `;
    }
}

// Render PDF page
async function renderPDFPage(pageNum) {
    if (!currentPDFDoc || pageNum < 1 || pageNum > currentPDFDoc.numPages) {
        return;
    }
    
    try {
        const page = await currentPDFDoc.getPage(pageNum);
        const canvas = document.getElementById('pdf-canvas-mobile');
        const context = canvas.getContext('2d');
        const container = document.querySelector('.pdf-container-mobile');
        
        // Calculate dimensions
        const containerWidth = container.clientWidth - 40;
        const containerHeight = Math.min(container.clientHeight, window.innerHeight * 0.6);
        
        const viewport = page.getViewport({ scale: 1 });
        const scale = Math.min(containerWidth / viewport.width, containerHeight / viewport.height, currentPDFScale);
        
        const scaledViewport = page.getViewport({ scale });
        
        // Set canvas dimensions
        canvas.height = scaledViewport.height;
        canvas.width = scaledViewport.width;
        canvas.style.height = scaledViewport.height + 'px';
        canvas.style.width = scaledViewport.width + 'px';
        
        // Clear canvas
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        // Render page
        const renderContext = {
            canvasContext: context,
            viewport: scaledViewport
        };
        
        await page.render(renderContext).promise;
        
        // Update page counter
        document.getElementById('current-page').textContent = pageNum;
        currentPDFPage = pageNum;
        
    } catch (error) {
        console.error('Error rendering PDF page:', error);
        throw error;
    }
}

// Change PDF page
function changePDFPage(delta) {
    if (!currentPDFDoc) return;
    
    const newPage = currentPDFPage + delta;
    if (newPage >= 1 && newPage <= currentPDFDoc.numPages) {
        renderPDFPage(newPage);
    }
}

// Zoom PDF
function zoomPDF(zoomIn) {
    if (zoomIn) {
        currentPDFScale = Math.min(currentPDFScale + 0.25, 3.0);
    } else {
        currentPDFScale = Math.max(currentPDFScale - 0.25, 0.5);
    }
    renderPDFPage(currentPDFPage);
}

// Handle keyboard navigation for PDF
function handlePDFKeyboardNavigation(e) {
    if (!currentPDFDoc) return;
    
    switch(e.key) {
        case 'ArrowLeft':
            e.preventDefault();
            changePDFPage(-1);
            break;
        case 'ArrowRight':
            e.preventDefault();
            changePDFPage(1);
            break;
        case '+':
        case '=':
            e.preventDefault();
            zoomPDF(true);
            break;
        case '-':
        case '_':
            e.preventDefault();
            zoomPDF(false);
            break;
    }
}

// Office files viewer - VIEW ONLY
function loadOfficeInReader(resource, container) {
    container.innerHTML = `
        <div class="office-viewer">
            <div class="view-only-notice">
                <i class="fas fa-eye"></i>
                <span>View Only - Content cannot be downloaded</span>
            </div>
            <div class="viewer-message">
                <i class="fas fa-file-word" style="font-size: 3rem; color: #1D4ED8; margin-bottom: 15px;"></i>
                <h3>Office Document</h3>
                <p>This document can be viewed using the online Office viewer.</p>
                <div class="viewer-actions">
                    <button onclick="window.open('https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(resource.file_url)}', '_blank')" class="profile-button primary">
                        <i class="fas fa-external-link-alt"></i> Open Online Viewer
                    </button>
                </div>
                <p class="view-only-message">This resource is view-only and cannot be downloaded.</p>
            </div>
        </div>
    `;
}

// Video viewer - VIEW ONLY
function loadVideoInReader(resource, container) {
    container.innerHTML = `
        <div class="video-viewer">
            <div class="view-only-notice">
                <i class="fas fa-eye"></i>
                <span>View Only - Content cannot be downloaded</span>
            </div>
            <video controls style="width: 100%; max-height: 70vh; border-radius: 8px;">
                <source src="${resource.file_url}" type="video/mp4">
                Your browser does not support the video tag.
            </video>
            <p class="view-only-message" style="text-align: center; margin-top: 15px; color: #6B7280;">
                <i class="fas fa-info-circle"></i> This video is view-only and cannot be downloaded.
            </p>
        </div>
    `;
}

// Fallback viewer for unsupported files - VIEW ONLY
function loadFallbackView(resource, container) {
    container.innerHTML = `
        <div class="fallback-viewer">
            <div class="view-only-notice">
                <i class="fas fa-eye"></i>
                <span>View Only - Content cannot be downloaded</span>
            </div>
            <div class="viewer-message">
                <i class="fas fa-file" style="font-size: 3rem; color: #6B7280; margin-bottom: 15px;"></i>
                <h3>File Preview Not Available</h3>
                <p>This file type cannot be previewed in the browser.</p>
                <p class="view-only-message">This resource is view-only and cannot be downloaded.</p>
            </div>
        </div>
    `;
}

// Utility function for HTML escaping
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Set up event listeners for resources
document.addEventListener('DOMContentLoaded', function() {
    const resourceSearch = document.getElementById('resource-search');
    const resourceFilter = document.getElementById('resource-filter');
    const courseFilter = document.getElementById('course-filter');
    
    if (resourceSearch) {
        resourceSearch.addEventListener('input', filterResources);
    }
    
    if (resourceFilter) {
        resourceFilter.addEventListener('change', filterResources);
    }
    
    if (courseFilter) {
        courseFilter.addEventListener('change', filterResources);
    }
});

// Initialize resources module
function initializeResourcesModule() {
    console.log('📁 Initializing Resources Module...');
    
    // Initialize PDF.js first
    initializePDFJS().then(() => {
        console.log('✅ PDF.js ready for Resources');
    }).catch(error => {
        console.warn('⚠️ PDF.js initialization warning:', error.message);
    });
    
    // Set up event listeners for resources tab
    const resourcesTab = document.querySelector('.nav a[data-tab="resources"]');
    if (resourcesTab) {
        resourcesTab.addEventListener('click', () => {
            if (getCurrentUserId()) {
                loadResources();
            }
        });
    }
    
    console.log('✅ Resources Module initialized');
}

// Make functions globally available
window.loadResources = loadResources;
window.closeReader = closeReader;
window.filterResources = filterResources;
window.changePDFPage = changePDFPage;
window.zoomPDF = zoomPDF;
window.initializeResourcesModule = initializeResourcesModule;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeResourcesModule);
} else {
    initializeResourcesModule();
}

// Export for module support
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        loadResources,
        openResource,
        closeReader,
        filterResources,
        initializeResourcesModule
    };
}
