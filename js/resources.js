// *************************************************************************
// *** ENHANCED RESOURCES SYSTEM - VIEW ONLY ***
// *************************************************************************

// PDF.js LIBRARY FIX - Ensure it's available globally
let pdfjsLib = window.pdfjsLib || null;

// Wait for PDF.js to load if not already available
function ensurePDFJSLoaded() {
    return new Promise((resolve, reject) => {
        // Check if PDF.js is already loaded
        if (typeof pdfjsLib !== 'undefined' && pdfjsLib !== null) {
            console.log('✅ PDF.js already loaded');
            // Set worker source
            pdfjsLib.GlobalWorkerOptions.workerSrc = 
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            resolve(pdfjsLib);
            return;
        }

        // Try to load it dynamically
        console.log('📥 Loading PDF.js dynamically...');
        
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.id = 'pdfjs-script';
        
        script.onload = () => {
            console.log('✅ PDF.js loaded');
            pdfjsLib = window.pdfjsLib;
            
            // Load worker
            const workerScript = document.createElement('script');
            workerScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            workerScript.id = 'pdfjs-worker-script';
            
            workerScript.onload = () => {
                console.log('✅ PDF.js worker loaded');
                pdfjsLib.GlobalWorkerOptions.workerSrc = 
                    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                resolve(pdfjsLib);
            };
            
            workerScript.onerror = () => {
                console.warn('⚠️ PDF.js worker failed to load, continuing without');
                resolve(pdfjsLib);
            };
            
            document.head.appendChild(workerScript);
        };
        
        script.onerror = (error) => {
            console.error('❌ Failed to load PDF.js:', error);
            reject(new Error('PDF.js failed to load'));
        };
        
        document.head.appendChild(script);
    });
}

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
let currentPDFScale = 1.8; // Increased default scale for bigger display

// Enhanced loadResources function
async function loadResources() {
    console.log('📁 Loading resources...');
    
    // Ensure PDF.js is loaded
    try {
        await ensurePDFJSLoaded();
    } catch (error) {
        console.warn('⚠️ PDF.js warning:', error.message);
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

    // Show reader with full-screen style
    reader.style.display = 'block';
    reader.style.background = '#ffffff';
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
        } else if (['jpg', 'jpeg', 'png', 'gif'].includes(fileType)) {
            loadImageViewer(resource, readerContent);
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

// Close mobile reader
function closeReader() {
    const reader = document.getElementById('mobile-reader');
    if (reader) {
        reader.style.display = 'none';
        currentReaderResource = null;
        currentPDFDoc = null;
        currentPDFPage = 1;
        currentPDFScale = 1.8;
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
    if (['mp4', 'avi', 'mov', 'wmv', 'webm'].includes(ext)) return 'video';
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)) return 'image';
    
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

// PDF loading for mobile - VIEW ONLY - HIGH QUALITY + BIG DISPLAY
async function loadPDFInReader(resource, container) {
    console.log('📄 Loading PDF:', resource.title);
    
    // Check if PDF.js is available
    if (!pdfjsLib) {
        try {
            await ensurePDFJSLoaded();
        } catch (error) {
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
            <div class="pdf-viewer-header">
                <div class="view-only-notice">
                    <i class="fas fa-eye"></i>
                    <span>View Only - Cannot be downloaded</span>
                </div>
                <div class="pdf-viewer-actions">
                    <button id="open-external-btn" class="pdf-action-btn" title="Open in New Tab">
                        <i class="fas fa-external-link-alt"></i>
                    </button>
                </div>
            </div>
            
            <!-- BIG PDF CONTAINER -->
            <div class="pdf-container-large">
                <canvas id="pdf-canvas-mobile"></canvas>
            </div>
            
            <!-- ENHANCED NAVIGATION CONTROLS -->
            <div class="pdf-controls-enhanced">
                <div class="control-group">
                    <button id="prev-page-btn" class="pdf-control-btn" title="Previous Page">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <div class="page-info">
                        <span id="current-page">1</span> / <span id="total-pages">...</span>
                    </div>
                    <button id="next-page-btn" class="pdf-control-btn" title="Next Page">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
                
                <div class="control-group">
                    <button id="zoom-out-btn" class="pdf-control-btn" title="Zoom Out">
                        <i class="fas fa-search-minus"></i>
                    </button>
                    <div class="zoom-info">
                        <span id="zoom-level">${Math.round(currentPDFScale * 100)}%</span>
                    </div>
                    <button id="zoom-in-btn" class="pdf-control-btn" title="Zoom In">
                        <i class="fas fa-search-plus"></i>
                    </button>
                </div>
                
                <div class="control-group">
                    <button id="fit-width-btn" class="pdf-control-btn" title="Fit to Width">
                        <i class="fas fa-arrows-alt-h"></i>
                    </button>
                    <button id="fit-height-btn" class="pdf-control-btn" title="Fit to Height">
                        <i class="fas fa-arrows-alt-v"></i>
                    </button>
                    <button id="reset-zoom-btn" class="pdf-control-btn" title="Reset Zoom">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                </div>
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
        
        // Set up event listeners for ALL controls
        setupPDFControls(resource);
        
        // Keyboard navigation
        document.addEventListener('keydown', handlePDFKeyboardNavigation);
        
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

// Setup ALL PDF control buttons
function setupPDFControls(resource) {
    // Navigation buttons
    document.getElementById('prev-page-btn').onclick = () => changePDFPage(-1);
    document.getElementById('next-page-btn').onclick = () => changePDFPage(1);
    
    // Zoom buttons
    document.getElementById('zoom-in-btn').onclick = () => zoomPDF(true);
    document.getElementById('zoom-out-btn').onclick = () => zoomPDF(false);
    document.getElementById('reset-zoom-btn').onclick = () => resetZoom();
    document.getElementById('fit-width-btn').onclick = () => fitToWidth();
    document.getElementById('fit-height-btn').onclick = () => fitToHeight();
    
    // External open button
    document.getElementById('open-external-btn').onclick = () => {
        window.open(resource.file_url, '_blank');
    };
}

// Render PDF page with HIGH QUALITY
async function renderPDFPage(pageNum) {
    if (!currentPDFDoc || pageNum < 1 || pageNum > currentPDFDoc.numPages) {
        return;
    }
    
    try {
        const page = await currentPDFDoc.getPage(pageNum);
        const canvas = document.getElementById('pdf-canvas-mobile');
        const context = canvas.getContext('2d', { alpha: false });
        const container = document.querySelector('.pdf-container-large');
        
        // Get high DPI for retina displays
        const pixelRatio = window.devicePixelRatio || 1;
        
        // Get container dimensions
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight || window.innerHeight * 0.75;
        
        // Get viewport at scale 1
        const viewport = page.getViewport({ scale: 1 });
        
        // Calculate scale for BIG display
        let scale = currentPDFScale;
        
        // Apply pixel ratio for high DPI
        scale *= pixelRatio;
        
        const scaledViewport = page.getViewport({ scale });
        
        // Set canvas dimensions with high DPI
        canvas.height = Math.floor(scaledViewport.height);
        canvas.width = Math.floor(scaledViewport.width);
        
        // Set display dimensions (CSS) - BIG DISPLAY
        canvas.style.height = Math.floor(scaledViewport.height / pixelRatio) + 'px';
        canvas.style.width = Math.floor(scaledViewport.width / pixelRatio) + 'px';
        
        // Set canvas to HIGH QUALITY rendering
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        // Set background to white
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Render page with high quality
        const renderContext = {
            canvasContext: context,
            viewport: scaledViewport,
            enableWebGL: true,
            intent: 'display',
            renderInteractiveForms: false
        };
        
        await page.render(renderContext).promise;
        
        // Update page counter
        document.getElementById('current-page').textContent = pageNum;
        currentPDFPage = pageNum;
        
        // Update zoom level display
        document.getElementById('zoom-level').textContent = `${Math.round(currentPDFScale * 100)}%`;
        
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
        currentPDFScale = Math.min(currentPDFScale + 0.25, 4.0);
    } else {
        currentPDFScale = Math.max(currentPDFScale - 0.25, 0.5);
    }
    renderPDFPage(currentPDFPage);
}

// Reset zoom to default
function resetZoom() {
    currentPDFScale = 1.8;
    renderPDFPage(currentPDFPage);
}

// Fit to width
function fitToWidth() {
    if (!currentPDFDoc) return;
    
    const container = document.querySelector('.pdf-container-large');
    if (!container) return;
    
    // We'll implement this in the next render
    // For now, set a scale that fits width
    currentPDFScale = 2.0;
    renderPDFPage(currentPDFPage);
}

// Fit to height
function fitToHeight() {
    if (!currentPDFDoc) return;
    
    const container = document.querySelector('.pdf-container-large');
    if (!container) return;
    
    currentPDFScale = 1.5;
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
            if (e.ctrlKey || e.metaKey) {
                zoomPDF(true);
            }
            break;
        case '-':
        case '_':
            e.preventDefault();
            if (e.ctrlKey || e.metaKey) {
                zoomPDF(false);
            }
            break;
        case '0':
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                resetZoom();
            }
            break;
        case 'Escape':
            closeReader();
            break;
    }
}

// Image viewer for image files
function loadImageViewer(resource, container) {
    container.innerHTML = `
        <div class="image-viewer">
            <div class="view-only-notice">
                <i class="fas fa-eye"></i>
                <span>View Only - Content cannot be downloaded</span>
            </div>
            <div class="image-container">
                <img src="${resource.file_url}" alt="${escapeHtml(resource.title)}" 
                     style="max-width: 100%; max-height: 70vh; border-radius: 8px;">
            </div>
            <p class="view-only-message" style="text-align: center; margin-top: 15px; color: #6B7280;">
                <i class="fas fa-info-circle"></i> This image is view-only and cannot be downloaded.
            </p>
        </div>
    `;
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
            <div class="video-container">
                <video controls style="width: 100%; max-height: 70vh; border-radius: 8px;">
                    <source src="${resource.file_url}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
            </div>
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
                <div class="viewer-actions">
                    <button onclick="window.open('${resource.file_url}', '_blank')" class="profile-button">
                        <i class="fas fa-external-link-alt"></i> Open File
                    </button>
                </div>
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
    
    // Ensure PDF.js is loaded
    ensurePDFJSLoaded().then(() => {
        console.log('✅ PDF.js ready for Resources');
    }).catch(error => {
        console.warn('⚠️ PDF.js warning:', error.message);
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
window.openResource = openResource;
window.closeReader = closeReader;
window.filterResources = filterResources;
window.changePDFPage = changePDFPage;
window.zoomPDF = zoomPDF;
window.resetZoom = resetZoom;
window.fitToWidth = fitToWidth;
window.fitToHeight = fitToHeight;
window.initializeResourcesModule = initializeResourcesModule;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeResourcesModule);
} else {
    initializeResourcesModule();
}

// Add CSS for enhanced PDF viewer
const pdfViewerCSS = `
<style>
    .pdf-mobile-viewer {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: #ffffff;
    }
    
    .pdf-viewer-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px;
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
    }
    
    .view-only-notice {
        background: #fef3c7;
        color: #92400e;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 0.9rem;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .pdf-action-btn {
        background: #4C1D95;
        color: white;
        border: none;
        border-radius: 6px;
        padding: 10px;
        cursor: pointer;
        transition: background 0.3s;
    }
    
    .pdf-action-btn:hover {
        background: #3c1680;
    }
    
    .pdf-container-large {
        flex: 1;
        overflow: auto;
        padding: 20px;
        display: flex;
        justify-content: center;
        align-items: flex-start;
        min-height: 500px;
        background: #f8fafc;
    }
    
    #pdf-canvas-mobile {
        max-width: 100%;
        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        border-radius: 8px;
        background: white;
    }
    
    .pdf-controls-enhanced {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px;
        background: #ffffff;
        border-top: 1px solid #e2e8f0;
        gap: 20px;
        flex-wrap: wrap;
    }
    
    .control-group {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .pdf-control-btn {
        background: #4C1D95;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 12px;
        cursor: pointer;
        transition: all 0.3s;
        min-width: 50px;
    }
    
    .pdf-control-btn:hover {
        background: #3c1680;
        transform: translateY(-2px);
    }
    
    .page-info, .zoom-info {
        background: #f1f5f9;
        padding: 8px 16px;
        border-radius: 6px;
        font-weight: 600;
        min-width: 80px;
        text-align: center;
    }
    
    .image-viewer, .video-viewer, .office-viewer, .fallback-viewer {
        padding: 20px;
        text-align: center;
    }
    
    .image-container, .video-container {
        margin: 20px 0;
    }
    
    .viewer-actions {
        margin: 20px 0;
    }
    
    @media (max-width: 768px) {
        .pdf-controls-enhanced {
            flex-direction: column;
            gap: 15px;
        }
        
        .control-group {
            width: 100%;
            justify-content: center;
        }
        
        .pdf-container-large {
            padding: 10px;
        }
    }
</style>
`;

// Inject the CSS
document.head.insertAdjacentHTML('beforeend', pdfViewerCSS);
