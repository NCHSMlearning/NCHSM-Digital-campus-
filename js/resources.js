// *************************************************************************
// *** ENHANCED RESOURCES SYSTEM - VIEW ONLY ***
// *************************************************************************

let currentResources = [];
let filteredResources = [];
let currentReaderResource = null;

// Enhanced loadResources function
async function loadResources() {
    if (!currentUserProfile) await loadProfile(currentUserId);
    
    const resourcesGrid = document.getElementById('resources-grid');
    if (!resourcesGrid) return;
    
    AppUtils.showLoading(resourcesGrid, 'Loading resources...');
    currentResources = [];

    try {
        const program = currentUserProfile?.program;
        const block = currentUserProfile?.block;
        const intakeYear = currentUserProfile?.intake_year;

        if (!program || !intakeYear || !block) {
            resourcesGrid.innerHTML = '<div class="error-state">Missing enrollment details</div>';
            return;
        }

        const { data: resources, error } = await sb
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
        loadDashboardMetrics(currentUserId);
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
    const resource = currentResources.find(r => r.id == resourceId);
    if (!resource) return;

    currentReaderResource = resource;

    const reader = document.getElementById('mobile-reader');
    const readerTitle = document.getElementById('reader-title');
    const readerContent = document.getElementById('reader-content');

    if (!reader || !readerTitle || !readerContent) return;

    // Show reader
    reader.style.display = 'block';
    readerTitle.textContent = resource.title;

    // Load content based on file type
    const fileType = getFileType(resource.file_path);
    
    if (fileType === 'pdf') {
        await loadPDFInReader(resource, readerContent);
    } else if (['doc', 'docx', 'ppt', 'pptx'].includes(fileType)) {
        loadOfficeInReader(resource, readerContent);
    } else if (fileType === 'video') {
        loadVideoInReader(resource, readerContent);
    } else {
        loadFallbackView(resource, readerContent);
    }
}

window.openResource = openResource; // Make globally available

// Close mobile reader
function closeReader() {
    const reader = document.getElementById('mobile-reader');
    if (reader) {
        reader.style.display = 'none';
        currentReaderResource = null;
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

// PDF loading for mobile - VIEW ONLY - HIGH QUALITY + FIXED NAVIGATION
async function loadPDFInReader(resource, container) {
    container.innerHTML = `
        <div class="pdf-mobile-viewer">
            <div class="view-only-notice">
                <i class="fas fa-eye"></i>
                <span>View Only - Content cannot be downloaded</span>
            </div>
            <!-- PDF CONTENT FIRST -->
            <div class="pdf-container-mobile">
                <canvas id="pdf-canvas-mobile"></canvas>
            </div>
            <!-- NAVIGATION CONTROLS AT THE BOTTOM -->
            <div class="pdf-controls-mobile">
                <button onclick="changePDFPage(-1)" class="pdf-nav-btn">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <span class="pdf-page-info">Page: <span id="current-page">1</span> of <span id="total-pages">1</span></span>
                <button onclick="changePDFPage(1)" class="pdf-nav-btn">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        </div>
    `;

    try {
        const pdfDoc = await pdfjsLib.getDocument(resource.file_url).promise;
        let currentPage = 1;
        let pdfScale = 1.8;
        
        document.getElementById('total-pages').textContent = pdfDoc.numPages;
        
        function renderPage(pageNum) {
            pdfDoc.getPage(pageNum).then(page => {
                const canvas = document.getElementById('pdf-canvas-mobile');
                const ctx = canvas.getContext('2d');
                const container = document.querySelector('.pdf-container-mobile');
                
                const containerWidth = container.clientWidth - 40;
                const maxContainerHeight = window.innerHeight * 0.7;
                
                const viewport = page.getViewport({ scale: 1 });
                
                const scaleX = containerWidth / viewport.width;
                const scaleY = maxContainerHeight / viewport.height;
                const optimalScale = Math.min(scaleX, scaleY, pdfScale) * (window.devicePixelRatio || 1);
                
                const scaledViewport = page.getViewport({ scale: optimalScale });
                
                canvas.width = scaledViewport.width;
                canvas.height = scaledViewport.height;
                
                canvas.style.width = (scaledViewport.width / (window.devicePixelRatio || 1)) + 'px';
                canvas.style.height = (scaledViewport.height / (window.devicePixelRatio || 1)) + 'px';
                
                const renderContext = {
                    canvasContext: ctx,
                    viewport: scaledViewport,
                    enableWebGL: true,
                    intent: 'display',
                    renderInteractiveForms: false,
                    imageLayer: false
                };
                
                page.render(renderContext).promise.then(() => {
                    document.getElementById('current-page').textContent = pageNum;
                });
            }).catch(error => {
                console.error('Error rendering page:', error);
                container.innerHTML = `
                    <div class="error-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>Failed to render PDF page</h3>
                        <p>${error.message}</p>
                    </div>
                `;
            });
        }
        
        window.changePDFPage = function(delta) {
            const newPage = currentPage + delta;
            if (newPage >= 1 && newPage <= pdfDoc.numPages) {
                currentPage = newPage;
                renderPage(currentPage);
            }
        };
        
        window.zoomPDF = function(zoomIn) {
            if (zoomIn) {
                pdfScale = Math.min(pdfScale + 0.25, 3.0);
            } else {
                pdfScale = Math.max(pdfScale - 0.25, 0.5);
            }
            renderPage(currentPage);
        };
        
        renderPage(currentPage);
        
        document.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowLeft') {
                changePDFPage(-1);
            } else if (e.key === 'ArrowRight') {
                changePDFPage(1);
            } else if (e.key === '+' || e.key === '=') {
                zoomPDF(true);
            } else if (e.key === '-' || e.key === '_') {
                zoomPDF(false);
            }
        });
        
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
document.getElementById('resource-search').addEventListener('input', filterResources);
document.getElementById('resource-filter').addEventListener('change', filterResources);
document.getElementById('course-filter').addEventListener('change', filterResources);

// Make functions globally available
window.closeReader = closeReader;
window.filterResources = filterResources;
window.changePDFPage = function() {}; // Placeholder
window.zoomPDF = function() {}; // Placeholder
