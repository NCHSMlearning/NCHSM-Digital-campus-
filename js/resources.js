// resources.js - Enhanced Resources System with Bottom Controls PDF Viewer

// *************************************************************************
// *** ENHANCED RESOURCES SYSTEM - VIEW ONLY ***
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

// Initialize PDF.js
async function initializePDFJS() {
    if (pdfjsLoaded) return true;
    
    return new Promise((resolve, reject) => {
        // Check if PDF.js is already loaded
        if (typeof window.pdfjsLib !== 'undefined') {
            console.log('✅ PDF.js already loaded');
            pdfjsLib = window.pdfjsLib;
            
            // Set worker source
            if (pdfjsLib.GlobalWorkerOptions) {
                pdfjsLib.GlobalWorkerOptions.workerSrc = 
                    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            }
            
            pdfjsLoaded = true;
            resolve(true);
            return;
        }
        
        // Load PDF.js from CDN
        console.log('📥 Loading PDF.js...');
        
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.id = 'pdfjs-script';
        
        script.onload = () => {
            console.log('✅ PDF.js loaded');
            pdfjsLib = window.pdfjsLib;
            
            // Set worker source
            if (pdfjsLib.GlobalWorkerOptions) {
                pdfjsLib.GlobalWorkerOptions.workerSrc = 
                    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            }
            
            pdfjsLoaded = true;
            resolve(true);
        };
        
        script.onerror = (error) => {
            console.error('❌ Failed to load PDF.js:', error);
            reject(new Error('Failed to load PDF viewer'));
        };
        
        document.head.appendChild(script);
    });
}

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

// Global variables
let currentResources = [];
let filteredResources = [];

// Load resources
async function loadResources() {
    console.log('📁 Loading resources...');
    
    const userProfile = getUserProfile();
    const userId = getCurrentUserId();
    const supabaseClient = getSupabaseClient();
    
    if (!supabaseClient) {
        const resourcesGrid = document.getElementById('resources-grid');
        if (resourcesGrid) {
            showError(resourcesGrid, 'Database connection error');
        }
        return;
    }
    
    const resourcesGrid = document.getElementById('resources-grid');
    if (!resourcesGrid) return;
    
    showLoading(resourcesGrid, 'Loading resources...');
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
        showError(resourcesGrid, `Error loading resources: ${err.message}`);
    }
}

// Render resources grid
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
        // Initialize PDF.js if not already loaded
        await initializePDFJS();
        
        // Create PDF viewer modal with bottom controls
        createPDFViewerModal(resource);
        
        // Load the PDF
        await loadPDFDocument(resource.file_url);
        
    } catch (error) {
        console.error('PDF error:', error);
        showToast('Failed to load PDF: ' + error.message, 'error');
    }
}

// Create PDF viewer modal with bottom controls
function createPDFViewerModal(resource) {
    // Remove existing modal if any
    const existingModal = document.getElementById('pdf-viewer-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'pdf-viewer-modal';
    modal.className = 'pdf-modal';
    modal.innerHTML = `
        <div class="pdf-modal-content">
            <!-- Header (only title and close button) -->
            <div class="pdf-modal-header">
                <div class="pdf-title">
                    <h3>${escapeHtml(resource.title)}</h3>
                </div>
                <button class="close-pdf-btn" id="close-pdf-btn" title="Close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <!-- Main viewer body -->
            <div class="pdf-viewer-body">
                <!-- Loading -->
                <div id="pdf-loading" class="pdf-loading">
                    <div class="loading-spinner"></div>
                    <p>Loading PDF document...</p>
                </div>
                
                <!-- Error -->
                <div id="pdf-error" class="pdf-error" style="display: none;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Failed to load PDF</h3>
                    <p id="pdf-error-message"></p>
                    <button id="retry-pdf-btn" class="btn btn-primary">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </div>
                
                <!-- PDF Viewer -->
                <div id="pdf-viewer" class="pdf-viewer" style="display: none;">
                    <!-- PDF Canvas Container -->
                    <div class="pdf-canvas-container">
                        <canvas id="pdf-canvas"></canvas>
                    </div>
                    
                    <!-- CONTROLS AT BOTTOM -->
                    <div class="pdf-controls-bottom">
                        <!-- Page Navigation -->
                        <div class="page-navigation">
                            <button id="pdf-first" class="control-btn" title="First Page">
                                <i class="fas fa-fast-backward"></i>
                            </button>
                            <button id="pdf-prev" class="control-btn" title="Previous Page">
                                <i class="fas fa-chevron-left"></i>
                            </button>
                            
                            <div class="page-info">
                                <input type="number" id="pdf-page-num" min="1" value="1" 
                                       title="Page number">
                                <span class="page-separator">/</span>
                                <span id="pdf-total-pages">1</span>
                            </div>
                            
                            <button id="pdf-next" class="control-btn" title="Next Page">
                                <i class="fas fa-chevron-right"></i>
                            </button>
                            <button id="pdf-last" class="control-btn" title="Last Page">
                                <i class="fas fa-fast-forward"></i>
                            </button>
                        </div>
                        
                        <!-- Zoom Controls -->
                        <div class="zoom-controls">
                            <button id="pdf-zoom-out" class="control-btn" title="Zoom Out">
                                <i class="fas fa-search-minus"></i>
                            </button>
                            <span class="zoom-display" id="pdf-zoom-level">100%</span>
                            <button id="pdf-zoom-in" class="control-btn" title="Zoom In">
                                <i class="fas fa-search-plus"></i>
                            </button>
                            <button id="pdf-zoom-fit" class="control-btn" title="Fit to Width">
                                <i class="fas fa-expand-arrows-alt"></i>
                            </button>
                            <button id="pdf-zoom-reset" class="control-btn" title="Reset Zoom">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add CSS for PDF viewer with bottom controls
    addPDFViewerCSSBottom();
    
    // Set up event listeners
    setupPDFViewerEvents(resource);
    
    // Show modal
    modal.style.display = 'flex';
}

// Add PDF viewer CSS with bottom controls
function addPDFViewerCSSBottom() {
    const styleId = 'pdf-viewer-bottom-styles';
    if (document.getElementById(styleId)) return;
    
    const styles = `
        .pdf-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.9);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 2000;
            padding: 10px;
        }
        
        .pdf-modal-content {
            background: white;
            border-radius: 8px;
            width: 100%;
            max-width: 1000px;
            max-height: 95vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        
        .pdf-modal-header {
            padding: 12px 20px;
            background: #2d3748;
            color: white;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #4a5568;
        }
        
        .pdf-title h3 {
            margin: 0;
            font-size: 1rem;
            color: white;
            font-weight: 600;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 80%;
        }
        
        .close-pdf-btn {
            background: #4a5568;
            color: white;
            border: none;
            width: 36px;
            height: 36px;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2rem;
            transition: background 0.3s;
        }
        
        .close-pdf-btn:hover {
            background: #718096;
        }
        
        .pdf-viewer-body {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            background: #f7fafc;
        }
        
        .pdf-loading, .pdf-error {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 40px 20px;
            text-align: center;
        }
        
        .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #e2e8f0;
            border-top-color: #4C1D95;
            border-radius: 50%;
            margin: 0 auto 15px;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        .pdf-error i {
            font-size: 2.5rem;
            color: #e53e3e;
            margin-bottom: 15px;
        }
        
        .pdf-error h3 {
            color: #c53030;
            margin-bottom: 10px;
            font-size: 1.2rem;
        }
        
        .pdf-error p {
            color: #718096;
            margin-bottom: 20px;
            max-width: 400px;
        }
        
        .btn {
            padding: 10px 20px;
            border-radius: 6px;
            border: none;
            cursor: pointer;
            font-weight: 600;
            font-size: 0.9rem;
        }
        
        .btn-primary {
            background: #4C1D95;
            color: white;
        }
        
        .btn-primary:hover {
            background: #3c1680;
        }
        
        /* PDF Viewer */
        .pdf-viewer {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        
        .pdf-canvas-container {
            flex: 1;
            overflow: auto;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            padding: 20px;
            background: #f7fafc;
        }
        
        #pdf-canvas {
            max-width: 100%;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            border-radius: 4px;
            background: white;
        }
        
        /* BOTTOM CONTROLS */
        .pdf-controls-bottom {
            background: white;
            border-top: 1px solid #e2e8f0;
            padding: 15px 20px;
            display: flex;
            flex-direction: column;
            gap: 15px;
            box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
        }
        
        .page-navigation {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }
        
        .zoom-controls {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }
        
        .control-btn {
            background: #4C1D95;
            color: white;
            border: none;
            width: 40px;
            height: 40px;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }
        
        .control-btn:hover {
            background: #3c1680;
            transform: translateY(-1px);
        }
        
        .control-btn:disabled {
            background: #cbd5e1;
            cursor: not-allowed;
            transform: none;
        }
        
        .page-info {
            display: flex;
            align-items: center;
            gap: 5px;
            margin: 0 15px;
        }
        
        #pdf-page-num {
            width: 50px;
            padding: 8px;
            border: 2px solid #cbd5e1;
            border-radius: 4px;
            text-align: center;
            font-weight: 600;
            font-size: 0.9rem;
        }
        
        #pdf-page-num:focus {
            outline: none;
            border-color: #4C1D95;
        }
        
        .page-separator {
            color: #718096;
            font-weight: 600;
        }
        
        #pdf-total-pages {
            font-weight: 600;
            color: #2d3748;
            min-width: 30px;
        }
        
        .zoom-display {
            min-width: 50px;
            text-align: center;
            font-weight: 600;
            color: #2d3748;
            margin: 0 10px;
        }
        
        @media (max-width: 768px) {
            .pdf-modal {
                padding: 5px;
            }
            
            .pdf-modal-content {
                max-height: 98vh;
                border-radius: 4px;
            }
            
            .pdf-modal-header {
                padding: 10px 15px;
            }
            
            .pdf-title h3 {
                font-size: 0.9rem;
            }
            
            .close-pdf-btn {
                width: 32px;
                height: 32px;
                font-size: 1rem;
            }
            
            .pdf-canvas-container {
                padding: 10px;
            }
            
            .pdf-controls-bottom {
                padding: 12px 15px;
                gap: 12px;
            }
            
            .control-btn {
                width: 36px;
                height: 36px;
            }
            
            #pdf-page-num {
                width: 45px;
                padding: 6px;
                font-size: 0.85rem;
            }
        }
        
        @media (max-width: 480px) {
            .pdf-controls-bottom {
                flex-direction: column;
                gap: 10px;
            }
            
            .page-navigation, .zoom-controls {
                gap: 8px;
            }
            
            .control-btn {
                width: 32px;
                height: 32px;
            }
            
            #pdf-page-num {
                width: 40px;
                padding: 5px;
            }
        }
    `;
    
    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
}

// Setup PDF viewer events
function setupPDFViewerEvents(resource) {
    const modal = document.getElementById('pdf-viewer-modal');
    const closeBtn = document.getElementById('close-pdf-btn');
    
    // Close modal
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        cleanupPDF();
    });
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            cleanupPDF();
        }
    });
    
    // Setup PDF controls
    setupPDFControls();
}

// Setup PDF controls
function setupPDFControls() {
    const firstBtn = document.getElementById('pdf-first');
    const prevBtn = document.getElementById('pdf-prev');
    const nextBtn = document.getElementById('pdf-next');
    const lastBtn = document.getElementById('pdf-last');
    const pageNumInput = document.getElementById('pdf-page-num');
    const zoomOutBtn = document.getElementById('pdf-zoom-out');
    const zoomInBtn = document.getElementById('pdf-zoom-in');
    const zoomFitBtn = document.getElementById('pdf-zoom-fit');
    const zoomResetBtn = document.getElementById('pdf-zoom-reset');
    
    // Navigation
    firstBtn.addEventListener('click', () => goToPage(1));
    prevBtn.addEventListener('click', () => goToPage(currentPDFPage - 1));
    nextBtn.addEventListener('click', () => goToPage(currentPDFPage + 1));
    lastBtn.addEventListener('click', () => goToPage(totalPDFPages));
    
    pageNumInput.addEventListener('change', () => {
        const page = parseInt(pageNumInput.value);
        if (page >= 1 && page <= totalPDFPages) {
            goToPage(page);
        }
    });
    
    // Zoom controls
    zoomOutBtn.addEventListener('click', () => zoomPDF(0.8));
    zoomInBtn.addEventListener('click', () => zoomPDF(1.25));
    zoomFitBtn.addEventListener('click', fitToWidth);
    zoomResetBtn.addEventListener('click', () => {
        pdfScale = 1.0;
        updateZoomDisplay();
        renderPage(currentPDFPage);
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', handlePDFKeyboard);
}

// Load PDF document
async function loadPDFDocument(pdfUrl) {
    try {
        showLoadingState();
        
        const loadingTask = pdfjsLib.getDocument({
            url: pdfUrl,
            cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
            cMapPacked: true
        });
        
        currentPDFDoc = await loadingTask.promise;
        totalPDFPages = currentPDFDoc.numPages;
        
        // Update total pages display
        document.getElementById('pdf-total-pages').textContent = totalPDFPages;
        document.getElementById('pdf-page-num').max = totalPDFPages;
        
        // Hide loading, show viewer
        hideLoadingState();
        showViewer();
        
        // Render first page
        await renderPage(1);
        
    } catch (error) {
        console.error('PDF loading error:', error);
        showErrorState('Failed to load PDF: ' + error.message);
    }
}

// Show loading state
function showLoadingState() {
    document.getElementById('pdf-loading').style.display = 'flex';
    document.getElementById('pdf-error').style.display = 'none';
    document.getElementById('pdf-viewer').style.display = 'none';
}

// Show error state
function showErrorState(message) {
    document.getElementById('pdf-loading').style.display = 'none';
    document.getElementById('pdf-error').style.display = 'flex';
    document.getElementById('pdf-error-message').textContent = message;
    document.getElementById('pdf-viewer').style.display = 'none';
    
    // Retry button
    document.getElementById('retry-pdf-btn').onclick = () => {
        const modal = document.getElementById('pdf-viewer-modal');
        if (modal) {
            modal.style.display = 'none';
            setTimeout(() => {
                if (currentResources) {
                    const resource = currentResources.find(r => r.file_url === pdfUrl);
                    if (resource) openPDF(resource);
                }
            }, 100);
        }
    };
}

// Hide loading, show viewer
function hideLoadingState() {
    document.getElementById('pdf-loading').style.display = 'none';
    document.getElementById('pdf-error').style.display = 'none';
}

function showViewer() {
    document.getElementById('pdf-viewer').style.display = 'flex';
}

// Render PDF page
async function renderPage(pageNum) {
    if (!currentPDFDoc || pageNum < 1 || pageNum > totalPDFPages) {
        return;
    }
    
    if (pageRendering) {
        pageNumPending = pageNum;
        return;
    }
    
    pageRendering = true;
    
    try {
        const page = await currentPDFDoc.getPage(pageNum);
        const canvas = document.getElementById('pdf-canvas');
        const ctx = canvas.getContext('2d');
        const container = document.querySelector('.pdf-canvas-container');
        
        // Calculate scale to fit container
        const containerWidth = container.clientWidth - 40; // Account for padding
        const viewport = page.getViewport({ scale: 1 });
        
        // Auto-fit to width on first render
        if (pdfScale === 1.0) {
            pdfScale = Math.min(containerWidth / viewport.width, 2.0);
        }
        
        // Apply scale
        const scaledViewport = page.getViewport({ scale: pdfScale });
        
        // Set canvas dimensions
        canvas.height = scaledViewport.height;
        canvas.width = scaledViewport.width;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Set white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Render page
        const renderContext = {
            canvasContext: ctx,
            viewport: scaledViewport
        };
        
        await page.render(renderContext).promise;
        
        // Update current page
        currentPDFPage = pageNum;
        document.getElementById('pdf-page-num').value = pageNum;
        
        // Update navigation buttons
        updateNavigationButtons();
        
        // Update zoom display
        updateZoomDisplay();
        
        // Scroll to top of canvas container
        container.scrollTop = 0;
        
    } catch (error) {
        console.error('Page render error:', error);
        showErrorState('Failed to render page: ' + error.message);
    }
    
    pageRendering = false;
    
    if (pageNumPending !== null) {
        renderPage(pageNumPending);
        pageNumPending = null;
    }
}

// Go to specific page
function goToPage(pageNum) {
    if (pageNum < 1) pageNum = 1;
    if (pageNum > totalPDFPages) pageNum = totalPDFPages;
    
    renderPage(pageNum);
}

// Update navigation buttons
function updateNavigationButtons() {
    const firstBtn = document.getElementById('pdf-first');
    const prevBtn = document.getElementById('pdf-prev');
    const nextBtn = document.getElementById('pdf-next');
    const lastBtn = document.getElementById('pdf-last');
    
    firstBtn.disabled = currentPDFPage <= 1;
    prevBtn.disabled = currentPDFPage <= 1;
    nextBtn.disabled = currentPDFPage >= totalPDFPages;
    lastBtn.disabled = currentPDFPage >= totalPDFPages;
}

// Zoom PDF
function zoomPDF(factor) {
    pdfScale *= factor;
    pdfScale = Math.max(0.5, Math.min(pdfScale, 3.0)); // Limit zoom
    updateZoomDisplay();
    renderPage(currentPDFPage);
}

// Update zoom display
function updateZoomDisplay() {
    document.getElementById('pdf-zoom-level').textContent = 
        Math.round(pdfScale * 100) + '%';
}

// Fit to width
function fitToWidth() {
    const canvas = document.getElementById('pdf-canvas');
    const container = document.querySelector('.pdf-canvas-container');
    
    if (!currentPDFDoc || !container) return;
    
    // Get current page to calculate width
    const page = currentPDFDoc.getPage(currentPDFPage);
    page.then(p => {
        const viewport = p.getViewport({ scale: 1 });
        const containerWidth = container.clientWidth - 40; // Account for padding
        
        pdfScale = containerWidth / viewport.width;
        pdfScale = Math.max(0.5, Math.min(pdfScale, 3.0));
        
        updateZoomDisplay();
        renderPage(currentPDFPage);
    });
}

// Handle keyboard navigation
function handlePDFKeyboard(e) {
    const modal = document.getElementById('pdf-viewer-modal');
    if (!modal || modal.style.display !== 'flex') return;
    
    switch(e.key) {
        case 'ArrowLeft':
            e.preventDefault();
            goToPage(currentPDFPage - 1);
            break;
        case 'ArrowRight':
            e.preventDefault();
            goToPage(currentPDFPage + 1);
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
                zoomPDF(1.25);
            }
            break;
        case '-':
            if (e.ctrlKey) {
                e.preventDefault();
                zoomPDF(0.8);
            }
            break;
    }
}

// Cleanup PDF resources
function cleanupPDF() {
    if (currentPDFDoc) {
        currentPDFDoc.destroy();
        currentPDFDoc = null;
    }
    currentPDFPage = 1;
    totalPDFPages = 0;
    pdfScale = 1.0;
    pageRendering = false;
    pageNumPending = null;
    
    // Remove event listeners
    document.removeEventListener('keydown', handlePDFKeyboard);
}

// Open other resource types
function openOtherResource(resource) {
    const fileType = getFileType(resource.file_path);
    
    let viewerHTML = '';
    
    switch(fileType) {
        case 'image':
            viewerHTML = `
                <div class="image-viewer">
                    <div class="viewer-header">
                        <h3>${escapeHtml(resource.title)}</h3>
                    </div>
                    <div class="image-container">
                        <img src="${resource.file_url}" alt="${escapeHtml(resource.title)}" 
                             style="max-width: 100%; max-height: 70vh;">
                    </div>
                </div>
            `;
            break;
        case 'video':
            viewerHTML = `
                <div class="video-viewer">
                    <div class="viewer-header">
                        <h3>${escapeHtml(resource.title)}</h3>
                    </div>
                    <div class="video-container">
                        <video controls style="width: 100%; max-height: 70vh;">
                            <source src="${resource.file_url}" type="video/mp4">
                            Your browser does not support video playback.
                        </video>
                    </div>
                </div>
            `;
            break;
        default:
            viewerHTML = `
                <div class="generic-viewer">
                    <div class="viewer-header">
                        <h3>${escapeHtml(resource.title)}</h3>
                    </div>
                    <div class="viewer-content">
                        <p>This file type cannot be previewed in the browser.</p>
                    </div>
                </div>
            `;
    }
    
    // Create modal for other resource types
    createGenericModal(resource.title, viewerHTML);
}

// Create generic modal
function createGenericModal(title, content) {
    const modalId = 'resource-modal-' + Date.now();
    
    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'resource-modal';
    modal.innerHTML = `
        <div class="resource-modal-content">
            <button class="close-modal-btn" onclick="this.closest('.resource-modal').remove()">
                <i class="fas fa-times"></i>
            </button>
            ${content}
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Filter resources
function filterResources() {
    const searchTerm = document.getElementById('resource-search')?.value.toLowerCase() || '';
    const typeFilter = document.getElementById('resource-filter')?.value || 'all';
    const courseFilter = document.getElementById('course-filter')?.value || 'all';

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

// Utility functions
function getFileType(filePath) {
    if (!filePath) return 'unknown';
    const ext = filePath.split('.').pop().toLowerCase();
    
    if (ext === 'pdf') return 'pdf';
    if (['doc', 'docx'].includes(ext)) return 'doc';
    if (['ppt', 'pptx'].includes(ext)) return 'ppt';
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)) return 'image';
    if (['mp4', 'avi', 'mov', 'wmv', 'webm'].includes(ext)) return 'video';
    if (['mp3', 'wav', 'ogg'].includes(ext)) return 'audio';
    
    return 'file';
}

function getFileIcon(filePath) {
    const type = getFileType(filePath);
    
    switch(type) {
        case 'pdf': return 'fas fa-file-pdf';
        case 'doc': return 'fas fa-file-word';
        case 'ppt': return 'fas fa-file-powerpoint';
        case 'image': return 'fas fa-file-image';
        case 'video': return 'fas fa-file-video';
        case 'audio': return 'fas fa-file-audio';
        default: return 'fas fa-file';
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
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error</h3>
                <p>${message}</p>
            </div>
        `;
    }
}

function showToast(message, type = 'info') {
    if (window.ui && window.ui.showToast) {
        window.ui.showToast(message, type);
    } else {
        alert(message);
    }
}

// Set up event listeners
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

// Global exports
window.loadResources = loadResources;
window.openResource = openResource;
window.filterResources = filterResources;
window.closeReader = () => {
    const modal = document.getElementById('pdf-viewer-modal');
    if (modal) modal.style.display = 'none';
    cleanupPDF();
};
window.initializeResourcesModule = initializeResourcesModule;

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeResourcesModule);
} else {
    initializeResourcesModule();
}
