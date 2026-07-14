// ============================================
// REVIEWS & NEWSLETTER MODULE - COMPLETE
// WITH AUTO PROGRAM DETECTION & SUBMIT POPUP
// ============================================

// ============================================
// TVET PROGRAM CODES
// ============================================

if (typeof window.TVET_PROGRAMS === 'undefined') {
    window.TVET_PROGRAMS = [
        'DPOTT', 'DCH', 'DHRIT', 'DSL', 'DSW', 'DCJS', 'DHSS', 'DICT', 'DME',
        'CPOTT', 'CCH', 'CHRIT', 'CPC', 'CSL', 'CSW', 'CCJS', 'CAG', 'CHSS', 'CICT',
        'ACH', 'AAG', 'ASW', 'CCA', 'PTE'
    ];
}

const TVET_CODES = window.TVET_PROGRAMS;

// ============================================
// PROGRAM DISPLAY NAMES
// ============================================

const PROGRAM_NAMES = {
    'KRCHN': '🎓 KRCHN Nursing',
    'DPOTT': 'DPOTT - Perioperative Theatre Technology',
    'DCH': 'DCH - Community Health',
    'DHRIT': 'DHRIT - Health Records and IT',
    'DSL': 'DSL - Science Lab',
    'DSW': 'DSW - Social Work',
    'DCJS': 'DCJS - Criminal Justice',
    'DHSS': 'DHSS - Health Support Services',
    'DICT': 'DICT - ICT',
    'DME': 'DME - Medical Engineering',
    'CPOTT': 'CPOTT - Certificate Perioperative Theatre',
    'CCH': 'CCH - Certificate Community Health',
    'CHRIT': 'CHRIT - Certificate Health Records',
    'CPC': 'CPC - Certificate Patient Care',
    'CSL': 'CSL - Certificate Science Lab',
    'CSW': 'CSW - Certificate Social Work',
    'CCJS': 'CCJS - Certificate Criminal Justice',
    'CAG': 'CAG - Certificate Agriculture',
    'CHSS': 'CHSS - Certificate Health Support Services',
    'CICT': 'CICT - Certificate ICT',
    'ACH': 'ACH - Artisan Community Health',
    'AAG': 'AAG - Artisan Agriculture',
    'ASW': 'ASW - Artisan Social Work',
    'CCA': 'CCA - Certificate Computer Applications',
    'PTE': 'PTE - TVET/CDACC'
};

// ============================================
// PROGRAM STATE
// ============================================

let userProgram = 'krchn';
let userProgramCode = 'KRCHN';
let userProgramDisplay = 'KRCHN Nursing';
let userBlock = 'Block 1';
let userTerm = null;
let isTVETStudent = false;
let userIntakeYear = 2025;
let userProgramType = 'KRCHN';

// ============================================
// GLOBAL VARIABLES
// ============================================

let allReviews = [];
let selectedComponent = '';
let reviewRating = 0;
let currentPage = 1;
const REVIEWS_PER_PAGE = 10;

// ============================================
// FILTER STATE
// ============================================

const currentFilter = {
    category: 'all',
    rating: 'all',
    sort: 'newest',
    search: '',
    program: 'all',
    block: 'all'
};

// ============================================
// PROGRAM DETECTION
// ============================================

function detectUserProgram() {
    console.log('🔍 Detecting user program for reviews...');
    
    let profile = null;
    if (window.currentUserProfile) profile = window.currentUserProfile;
    else if (window.db?.currentUserProfile) profile = window.db.currentUserProfile;
    else if (window.userProfile) profile = window.userProfile;
    else if (window.profileModule?.userProfile) profile = window.profileModule.userProfile;
    
    if (!profile) {
        try {
            const savedProfile = localStorage.getItem('userProfile');
            if (savedProfile) profile = JSON.parse(savedProfile);
        } catch (e) {}
    }
    
    if (profile) {
        const programCode = String(profile.program || profile.course || '').toUpperCase().trim();
        
        if (TVET_CODES.includes(programCode)) {
            isTVETStudent = true;
            userProgram = 'tvet';
            userProgramCode = programCode;
            userProgramDisplay = PROGRAM_NAMES[programCode] || `${programCode} (TVET)`;
            userProgramType = 'TVET';
            userBlock = profile.block || 'Term 1';
            userTerm = extractTermNumber(userBlock);
            userIntakeYear = profile.intake_year || profile.intake || 2025;
            console.log(`✅ TVET Student detected: ${userProgramDisplay}, Term: ${userTerm || 'Not set'}`);
        } else {
            isTVETStudent = false;
            userProgram = 'krchn';
            userProgramCode = 'KRCHN';
            userProgramDisplay = 'KRCHN Nursing';
            userProgramType = 'KRCHN';
            userBlock = profile.block || 'Block 1';
            userTerm = null;
            userIntakeYear = profile.intake_year || profile.intake || 2025;
            console.log(`✅ KRCHN Student detected: Block ${userBlock}`);
        }
        
        updateUserProgramUI();
        return userProgram;
    }
    
    console.log('⚠️ No profile found, defaulting to KRCHN');
    userProgram = 'krchn';
    userProgramCode = 'KRCHN';
    userProgramDisplay = 'KRCHN Nursing';
    userProgramType = 'KRCHN';
    userBlock = 'Block 1';
    userTerm = null;
    isTVETStudent = false;
    updateUserProgramUI();
    return 'krchn';
}

function extractTermNumber(block) {
    if (!block) return 1;
    const termMatch = block.match(/Term\s*(\d+)/i);
    if (termMatch) return parseInt(termMatch[1]);
    if (block.toLowerCase().includes('introductory')) return 1;
    if (block.toLowerCase().includes('final')) return 7;
    return 1;
}

function updateUserProgramUI() {
    const blockDisplay = document.getElementById('userCurrentBlock');
    if (blockDisplay) {
        if (isTVETStudent) {
            blockDisplay.textContent = `Term ${userTerm || 1}`;
        } else {
            blockDisplay.textContent = userBlock || 'Block 1';
        }
    }
    
    const programFilter = document.getElementById('reviewProgramFilter');
    if (programFilter) {
        if (isTVETStudent) {
            programFilter.value = 'TVET';
        } else {
            programFilter.value = 'KRCHN';
        }
    }
}

function isTVETProgram(programCode) {
    if (!programCode) return false;
    return TVET_CODES.includes(programCode.toUpperCase());
}

function getProgramType(programCode) {
    if (!programCode) return 'KRCHN';
    if (programCode === 'KRCHN') return 'KRCHN';
    if (isTVETProgram(programCode)) return 'TVET';
    return 'KRCHN';
}

function getProgramDisplayName(programCode) {
    return PROGRAM_NAMES[programCode] || programCode || 'Unknown Program';
}

// ============================================
// INITIALIZE
// ============================================

function initReviewsModule() {
    console.log('⭐ Initializing Reviews Module...');
    
    try {
        detectUserProgram();
        
        currentFilter.category = 'all';
        currentFilter.rating = 'all';
        currentFilter.sort = 'newest';
        currentFilter.search = '';
        currentFilter.program = isTVETStudent ? 'TVET' : 'KRCHN';
        currentFilter.block = 'all';
        currentPage = 1;
        
        loadReviews();
        loadSiteRating();
        updateReviewStats();
        initCategoryFilters();
        
        const writeBtn = document.getElementById('writeReviewBtn');
        if (writeBtn) {
            writeBtn.removeEventListener('click', openReviewModal);
            writeBtn.addEventListener('click', openReviewModal);
        }
        
        const closeBtn = document.getElementById('closeReviewModal');
        if (closeBtn) {
            closeBtn.removeEventListener('click', closeReviewModal);
            closeBtn.addEventListener('click', closeReviewModal);
        }
        
        const cancelBtn = document.getElementById('cancelReviewBtn');
        if (cancelBtn) {
            cancelBtn.removeEventListener('click', closeReviewModal);
            cancelBtn.addEventListener('click', closeReviewModal);
        }
        
        const refreshBtn = document.getElementById('refreshReviewsBtn');
        if (refreshBtn) {
            refreshBtn.removeEventListener('click', refreshReviews);
            refreshBtn.addEventListener('click', refreshReviews);
        }
        
        const form = document.getElementById('studentReviewForm');
        if (form) {
            form.removeEventListener('submit', submitReview);
            form.addEventListener('submit', submitReview);
        }
        
        const reviewText = document.getElementById('reviewTextInput');
        if (reviewText) {
            reviewText.removeEventListener('input', updateCharCount);
            reviewText.addEventListener('input', updateCharCount);
        }
        
        const categoryFilter = document.getElementById('reviewCategoryFilter');
        if (categoryFilter) {
            categoryFilter.removeEventListener('change', applyFilters);
            categoryFilter.addEventListener('change', applyFilters);
        }
        
        const ratingFilter = document.getElementById('reviewRatingFilter');
        if (ratingFilter) {
            ratingFilter.removeEventListener('change', applyFilters);
            ratingFilter.addEventListener('change', applyFilters);
        }
        
        const sortFilter = document.getElementById('reviewSortFilter');
        if (sortFilter) {
            sortFilter.removeEventListener('change', applyFilters);
            sortFilter.addEventListener('change', applyFilters);
        }
        
        const searchInput = document.getElementById('reviewSearchInput');
        if (searchInput) {
            searchInput.removeEventListener('keyup', handleSearch);
            searchInput.addEventListener('keyup', handleSearch);
        }
        
        const programFilter = document.getElementById('reviewProgramFilter');
        if (programFilter) {
            programFilter.removeEventListener('change', applyFilters);
            programFilter.addEventListener('change', applyFilters);
        }
        
        const blockFilter = document.getElementById('reviewBlockFilter');
        if (blockFilter) {
            blockFilter.removeEventListener('change', applyFilters);
            blockFilter.addEventListener('change', applyFilters);
        }
        
        const loadMoreBtn = document.getElementById('loadMoreReviewsBtn');
        if (loadMoreBtn) {
            loadMoreBtn.removeEventListener('click', loadMoreReviews);
            loadMoreBtn.addEventListener('click', loadMoreReviews);
        }
        
        addResetButton();
        
        console.log(`✅ Reviews Module initialized for ${userProgramDisplay}`);
        
    } catch (error) {
        console.error('Error initializing reviews:', error);
    }
}

function addResetButton() {
    const filterBar = document.querySelector('.reviews-filters-premium');
    if (!filterBar) return;
    if (document.getElementById('resetFiltersBtn')) return;
    
    const resetBtn = document.createElement('button');
    resetBtn.id = 'resetFiltersBtn';
    resetBtn.className = 'btn-secondary';
    resetBtn.innerHTML = '<i class="fas fa-undo"></i> Reset';
    resetBtn.style.cssText = 'padding: 8px 16px; border-radius: 8px; border: 1px solid #e2e8f0; background: white; cursor: pointer; font-size: 13px;';
    resetBtn.addEventListener('click', resetFilters);
    filterBar.appendChild(resetBtn);
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getSupabaseClient() {
    return window.supabase || window.sb || window.db?.supabase || null;
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        if (m === '"') return '&quot;';
        return m;
    });
}

function updateCharCount() {
    const input = document.getElementById('reviewTextInput');
    const count = document.getElementById('reviewCharCount');
    if (input && count) {
        count.textContent = input.value.length;
    }
}

function handleSearch(e) {
    if (e.key === 'Enter') {
        applyFilters();
    }
}

function refreshReviews() {
    currentPage = 1;
    loadReviews();
    loadSiteRating();
    updateReviewStats();
}

// ============================================
// LOAD REVIEWS WITH AUTO PROGRAM FILTERING
// ============================================

async function loadReviews() {
    const grid = document.getElementById('reviewsGrid');
    if (!grid) return;
    
    grid.innerHTML = `
        <div class="loading-state-premium">
            <div class="loading-spinner-premium"></div>
            <p>Loading reviews...</p>
        </div>
    `;
    
    try {
        const supabase = getSupabaseClient();
        if (!supabase) {
            grid.innerHTML = '<div class="error-state-premium">Database connection error</div>';
            return;
        }
        
        detectUserProgram();
        
        const currentUser = window.currentUserProfile || window.currentUserId;
        const userBlock = currentUser?.block || userBlock || 'Block 1';
        const userProgram = currentUser?.program || userProgramCode || 'KRCHN';
        const userProgramType = isTVETStudent ? 'TVET' : 'KRCHN';
        
        console.log('📊 User Program Type:', userProgramType);
        console.log('📊 User Block:', userBlock);
        console.log('📊 Is TVET Student:', isTVETStudent);
        console.log('📊 Current Filters:', currentFilter);
        
        let query = supabase
            .from('student_reviews')
            .select('*, student:student_id(full_name, program, block, profile_photo_url)')
            .eq('status', 'approved');
        
        if (isTVETStudent) {
            query = query.eq('target_program_type', 'TVET');
        } else {
            query = query.eq('target_program_type', 'KRCHN');
        }
        
        if (currentFilter.category && currentFilter.category !== 'all') {
            const categoryMap = {
                'site': 'site',
                'course': 'course',
                'lecturer': 'lecturer',
                'facility': 'facility',
                'library': 'library',
                'administration': 'administration',
                'online': 'online',
                'clinical': 'clinical',
                'general': 'general'
            };
            const mappedCategory = categoryMap[currentFilter.category] || currentFilter.category;
            console.log('📊 Filtering by category:', mappedCategory);
            query = query.eq('component_type', mappedCategory);
        }
        
        if (currentFilter.category && currentFilter.category !== 'all' && currentFilter.category !== 'site') {
            query = query.eq('target_block', userBlock);
        }
        
        if (currentFilter.rating && currentFilter.rating !== 'all') {
            const ratingValue = parseInt(currentFilter.rating);
            console.log('📊 Filtering by rating:', ratingValue);
            query = query.eq('rating', ratingValue);
        }
        
        if (currentFilter.search && currentFilter.search.trim() !== '') {
            const searchTerm = currentFilter.search.trim();
            console.log('📊 Searching for:', searchTerm);
            query = query.or(`review.ilike.%${searchTerm}%, review_title.ilike.%${searchTerm}%, component_name.ilike.%${searchTerm}%`);
        }
        
        if (currentFilter.sort === 'newest') {
            query = query.order('created_at', { ascending: false });
        } else if (currentFilter.sort === 'oldest') {
            query = query.order('created_at', { ascending: true });
        } else if (currentFilter.sort === 'highest') {
            query = query.order('rating', { ascending: false });
        } else if (currentFilter.sort === 'lowest') {
            query = query.order('rating', { ascending: true });
        } else if (currentFilter.sort === 'helpful') {
            query = query.order('helpful_count', { ascending: false });
        } else {
            query = query.order('created_at', { ascending: false });
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        allReviews = data || [];
        console.log(`✅ Found ${allReviews.length} reviews`);
        
        updateFilterResultsCount(allReviews.length);
        renderReviews(allReviews.slice(0, REVIEWS_PER_PAGE));
        updateLoadMoreButton();
        updateReviewStats();
        
    } catch (error) {
        console.error('Error loading reviews:', error);
        grid.innerHTML = `
            <div class="error-state-premium">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Error Loading Reviews</h3>
                <p>${error.message}</p>
                <button onclick="loadReviews()" class="btn-secondary">Retry</button>
            </div>
        `;
    }
}

// ============================================
// RENDER REVIEWS
// ============================================

function renderReviews(reviews) {
    const grid = document.getElementById('reviewsGrid');
    if (!grid) return;
    
    if (!reviews || reviews.length === 0) {
        grid.innerHTML = `
            <div class="empty-state-premium">
                <i class="fas fa-search" style="font-size: 48px; color: #d1d5db;"></i>
                <h3>No Reviews Found</h3>
                <p>Try adjusting your filters or be the first to share your experience!</p>
                <div style="margin-top: 15px; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                    <button onclick="resetFilters()" class="btn-secondary">Reset Filters</button>
                    <button onclick="openReviewModal()" class="btn-primary">
                        <i class="fas fa-pen"></i> Write a Review
                    </button>
                </div>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = reviews.map(review => {
        const stars = getStarHTML(review.rating || 0);
        const name = review.is_anonymous ? 'Anonymous Student' : (review.student?.full_name || 'Student');
        const date = new Date(review.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        const categoryIcons = {
            'site': '🌐',
            'course': '📚',
            'lecturer': '👨‍🏫',
            'facility': '🏛️',
            'library': '📖',
            'administration': '🏢',
            'online': '💻',
            'clinical': '🏥',
            'general': '⭐'
        };
        
        const categoryIcon = categoryIcons[review.component_type] || '📝';
        const categoryLabel = review.component_type ? review.component_type.charAt(0).toUpperCase() + review.component_type.slice(1) : 'General';
        const componentDisplay = review.component_name ? `on ${review.component_name}` : '';
        
        const programType = review.target_program_type || review.program_type || 'KRCHN';
        const isTVET = programType === 'TVET';
        const programBadge = isTVET ? '🔧 TVET' : '🎓 KRCHN';
        const blockDisplay = review.target_block || review.block || 'N/A';
        
        return `
            <div class="review-card-premium" onclick="openReviewDetail('${review.id}')">
                <div class="review-card-header">
                    <div class="reviewer-info">
                        ${!review.is_anonymous && review.student?.profile_photo_url ? 
                            `<img src="${review.student.profile_photo_url}" alt="${name}" class="reviewer-avatar">` :
                            `<div class="reviewer-avatar-placeholder">${name.charAt(0).toUpperCase()}</div>`
                        }
                        <div class="reviewer-details">
                            <span class="reviewer-name">${escapeHtml(name)}</span>
                            <span class="reviewer-program">${review.student?.program || ''}</span>
                        </div>
                    </div>
                    <div class="review-category-badge">
                        ${categoryIcon} ${categoryLabel}
                        ${componentDisplay ? `<span class="component-tag">${escapeHtml(componentDisplay)}</span>` : ''}
                    </div>
                </div>
                
                <div class="review-card-body">
                    <div class="review-rating">${stars}</div>
                    ${review.review_title ? `<h4 class="review-title">${escapeHtml(review.review_title)}</h4>` : ''}
                    
                    <div class="review-meta-badges" style="display: flex; gap: 6px; flex-wrap: wrap; margin: 6px 0;">
                        ${review.target_block ? `
                            <span class="block-tag" style="background: #e2e8f0; padding: 2px 10px; border-radius: 12px; font-size: 11px; color: #475569;">
                                <i class="fas fa-layer-group"></i> ${escapeHtml(blockDisplay)}
                            </span>
                        ` : ''}
                        ${review.target_program_type ? `
                            <span class="program-tag" style="background: ${isTVET ? '#fef3c7' : '#dbeafe'}; padding: 2px 10px; border-radius: 12px; font-size: 11px; color: ${isTVET ? '#92400e' : '#1e40af'};">
                                ${programBadge}
                            </span>
                        ` : ''}
                    </div>
                    
                    <p class="review-text">${review.review.length > 200 ? review.review.substring(0, 200) + '...' : escapeHtml(review.review)}</p>
                    
                    ${review.pros ? `
                        <div class="review-pros">
                            <i class="fas fa-thumbs-up" style="color: #10b981;"></i>
                            <span>${escapeHtml(review.pros)}</span>
                        </div>
                    ` : ''}
                    
                    ${review.cons ? `
                        <div class="review-cons">
                            <i class="fas fa-thumbs-down" style="color: #ef4444;"></i>
                            <span>${escapeHtml(review.cons)}</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="review-card-footer">
                    <span class="review-date"><i class="fas fa-clock"></i> ${date}</span>
                    <div class="review-actions">
                        <button class="helpful-btn" onclick="event.stopPropagation(); markHelpful('${review.id}')">
                            <i class="fas fa-thumbs-up"></i> 
                            <span>${review.helpful_count || 0}</span>
                        </button>
                        <button class="share-btn" onclick="event.stopPropagation(); shareReview('${review.id}')">
                            <i class="fas fa-share-alt"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// LOAD SITE RATING
// ============================================

async function loadSiteRating() {
    try {
        const supabase = getSupabaseClient();
        if (!supabase) return;
        
        const { data: reviews, error } = await supabase
            .from('student_reviews')
            .select('rating')
            .eq('status', 'approved')
            .eq('component_type', 'site');
        
        if (error) throw error;
        
        const ratings = reviews || [];
        const count = ratings.length;
        const avg = count > 0 ? (ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / count) : 0;
        
        const avgEl = document.getElementById('siteAvgScore');
        const countEl = document.getElementById('siteRatingCount');
        if (avgEl) avgEl.textContent = avg.toFixed(1);
        if (countEl) countEl.textContent = count;
        
        const siteStars = document.querySelectorAll('#siteStars span');
        siteStars.forEach((star, index) => {
            if (index < Math.round(avg)) {
                star.textContent = '★';
                star.style.color = '#f59e0b';
            } else {
                star.textContent = '☆';
                star.style.color = '#d1d5db';
            }
        });
        
        const ratingText = document.getElementById('siteRatingText');
        if (ratingText) {
            ratingText.textContent = count > 0 ? `${avg.toFixed(1)} average from ${count} reviews` : 'Tap a star to rate the site';
        }
        
    } catch (error) {
        console.error('Error loading site rating:', error);
    }
}

// ============================================
// UPDATE REVIEW STATS
// ============================================

async function updateReviewStats() {
    try {
        const supabase = getSupabaseClient();
        if (!supabase) return;
        
        const { data: reviews, error } = await supabase
            .from('student_reviews')
            .select('rating, helpful_count, status')
            .eq('status', 'approved');
        
        if (error) throw error;
        
        const total = reviews?.length || 0;
        const avg = total > 0 ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / total) : 0;
        const helpful = reviews?.reduce((sum, r) => sum + (r.helpful_count || 0), 0) || 0;
        
        const avgEl = document.getElementById('avgRatingDisplay');
        const totalEl = document.getElementById('totalReviewsDisplay');
        const helpfulEl = document.getElementById('helpfulCountDisplay');
        
        if (avgEl) avgEl.textContent = avg.toFixed(1);
        if (totalEl) totalEl.textContent = total;
        if (helpfulEl) helpfulEl.textContent = helpful;
        
        const currentUser = window.currentUserProfile || window.currentUserId;
        if (currentUser) {
            const userId = currentUser.user_id || currentUser;
            const { data: pending, error: pendingError } = await supabase
                .from('student_reviews')
                .select('id', { count: 'exact' })
                .eq('student_id', userId)
                .eq('status', 'pending');
            
            if (!pendingError) {
                const pendingEl = document.getElementById('pendingReviewsDisplay');
                if (pendingEl) pendingEl.textContent = pending?.length || 0;
            }
        }
        
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

// ============================================
// SUBMIT REVIEW WITH BEAUTIFUL POPUP
// ============================================

async function submitReview(e) {
    e.preventDefault();
    
    const component = document.getElementById('selectedComponent')?.value;
    const rating = parseInt(document.getElementById('reviewRatingValue')?.value || 0);
    const title = document.getElementById('reviewTitleInput')?.value?.trim() || '';
    const review = document.getElementById('reviewTextInput')?.value?.trim();
    const pros = document.getElementById('reviewPros')?.value?.trim() || '';
    const cons = document.getElementById('reviewCons')?.value?.trim() || '';
    const suggestions = document.getElementById('reviewSuggestions')?.value?.trim() || '';
    const anonymous = document.getElementById('anonymousReview')?.checked || false;
    const componentName = document.getElementById('componentNameInput')?.value?.trim() || '';
    
    if (!component) {
        showReviewError('Please select what you are reviewing');
        return;
    }
    
    if (rating === 0) {
        showReviewError('Please select a rating');
        return;
    }
    
    if (!review || review.length < 10) {
        showReviewError('Please write at least 10 characters');
        return;
    }
    
    const btn = document.getElementById('submitReviewBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    
    try {
        const supabase = getSupabaseClient();
        if (!supabase) throw new Error('Database connection error');
        
        const currentUser = window.currentUserProfile || window.currentUserId;
        const userId = currentUser?.user_id || currentUser;
        
        if (!userId) throw new Error('User not logged in');
        
        const userProgram = currentUser?.program || userProgramCode || 'KRCHN';
        const userBlock = currentUser?.block || userBlock || 'Block 1';
        const userProgramType = isTVETStudent ? 'TVET' : 'KRCHN';
        
        const { data, error } = await supabase
            .from('student_reviews')
            .insert([{
                student_id: userId,
                component_type: component,
                component_name: componentName || null,
                rating: rating,
                review_title: title || null,
                review: review,
                pros: pros || null,
                cons: cons || null,
                suggestions: suggestions || null,
                is_anonymous: anonymous,
                target_block: userBlock,
                target_program: userProgram,
                target_program_type: userProgramType,
                status: 'pending',
                created_at: new Date().toISOString()
            }]);
        
        if (error) throw error;
        
        // ============================================
        // 🎉 BEAUTIFUL SUCCESS POPUP
        // ============================================
        
        // Close the review modal first
        closeReviewModal();
        
        // Create popup overlay
        const overlay = document.createElement('div');
        overlay.id = 'reviewSuccessPopup';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.6);
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 100000;
            animation: fadeInOverlay 0.4s ease;
        `;
        
        // Create popup card
        overlay.innerHTML = `
            <div class="review-success-card" style="
                background: white;
                border-radius: 24px;
                max-width: 480px;
                width: 90%;
                padding: 40px 35px;
                text-align: center;
                box-shadow: 0 25px 60px rgba(0,0,0,0.3);
                animation: popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
                position: relative;
                overflow: hidden;
            ">
                <!-- Background decoration -->
                <div style="
                    position: absolute;
                    top: -60px;
                    right: -60px;
                    width: 200px;
                    height: 200px;
                    background: radial-gradient(circle, rgba(16, 185, 129, 0.1), transparent 70%);
                    border-radius: 50%;
                "></div>
                <div style="
                    position: absolute;
                    bottom: -80px;
                    left: -80px;
                    width: 250px;
                    height: 250px;
                    background: radial-gradient(circle, rgba(102, 126, 234, 0.08), transparent 70%);
                    border-radius: 50%;
                "></div>
                
                <!-- Success Icon -->
                <div style="
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #10b981, #059669);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 20px;
                    box-shadow: 0 8px 30px rgba(16, 185, 129, 0.3);
                    position: relative;
                    z-index: 1;
                ">
                    <i class="fas fa-check" style="color: white; font-size: 36px;"></i>
                </div>
                
                <!-- Success Text -->
                <h2 style="
                    font-size: 24px;
                    font-weight: 700;
                    color: #1e293b;
                    margin: 0 0 8px;
                    position: relative;
                    z-index: 1;
                ">🎉 Review Submitted!</h2>
                
                <p style="
                    color: #64748b;
                    font-size: 15px;
                    line-height: 1.6;
                    margin: 0 0 6px;
                    position: relative;
                    z-index: 1;
                ">
                    Thank you for sharing your feedback!
                </p>
                <p style="
                    color: #94a3b8;
                    font-size: 13px;
                    margin: 0 0 20px;
                    position: relative;
                    z-index: 1;
                ">
                    Your review has been submitted and is pending approval.
                </p>
                
                <!-- Rating Summary -->
                <div style="
                    background: #f8fafc;
                    border-radius: 12px;
                    padding: 15px 20px;
                    margin-bottom: 20px;
                    position: relative;
                    z-index: 1;
                ">
                    <div style="display: flex; justify-content: center; gap: 4px; font-size: 24px; margin-bottom: 4px;">
                        ${getStarHTML(rating)}
                    </div>
                    <span style="font-size: 13px; color: #64748b;">
                        ${rating} out of 5 stars
                    </span>
                    ${anonymous ? '<span style="margin-left: 10px; font-size: 12px; color: #94a3b8;">· 🤫 Anonymous</span>' : ''}
                </div>
                
                <!-- Review Preview -->
                <div style="
                    background: #f1f5f9;
                    border-radius: 12px;
                    padding: 15px 18px;
                    margin-bottom: 25px;
                    text-align: left;
                    position: relative;
                    z-index: 1;
                ">
                    <p style="
                        font-size: 14px;
                        color: #1e293b;
                        margin: 0 0 4px;
                        font-weight: 500;
                    ">
                        ${escapeHtml(title || 'Your Review')}
                    </p>
                    <p style="
                        font-size: 13px;
                        color: #475569;
                        margin: 0;
                        line-height: 1.5;
                    ">
                        "${escapeHtml(review.length > 120 ? review.substring(0, 120) + '...' : review)}"
                    </p>
                </div>
                
                <!-- Action Buttons -->
                <div style="display: flex; gap: 12px; position: relative; z-index: 1; flex-wrap: wrap; justify-content: center;">
                    <button onclick="closeSuccessPopup()" style="
                        flex: 1;
                        min-width: 120px;
                        padding: 12px 24px;
                        background: linear-gradient(135deg, #4C1D95, #6d28d9);
                        color: white;
                        border: none;
                        border-radius: 12px;
                        font-size: 15px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s;
                    "
                    onmouseover="this.style.transform='scale(1.02)'; this.style.boxShadow='0 4px 20px rgba(76,29,149,0.3)'"
                    onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'"
                    >
                        <i class="fas fa-thumbs-up"></i> View Reviews
                    </button>
                    <button onclick="closeSuccessPopup(); openReviewModal();" style="
                        flex: 1;
                        min-width: 120px;
                        padding: 12px 24px;
                        background: #f1f5f9;
                        color: #1e293b;
                        border: none;
                        border-radius: 12px;
                        font-size: 15px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s;
                    "
                    onmouseover="this.style.background='#e2e8f0'"
                    onmouseout="this.style.background='#f1f5f9'"
                    >
                        <i class="fas fa-pen"></i> Write Another
                    </button>
                </div>
                
                <!-- Close button -->
                <button onclick="closeSuccessPopup()" style="
                    position: absolute;
                    top: 12px;
                    right: 16px;
                    background: none;
                    border: none;
                    font-size: 24px;
                    color: #94a3b8;
                    cursor: pointer;
                    transition: all 0.2s;
                    z-index: 2;
                "
                onmouseover="this.style.color='#ef4444'"
                onmouseout="this.style.color='#94a3b8'"
                >
                    ×
                </button>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Add keyframe animations
        if (!document.getElementById('review-popup-styles')) {
            const styles = document.createElement('style');
            styles.id = 'review-popup-styles';
            styles.textContent = `
                @keyframes fadeInOverlay {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes popIn {
                    0% { transform: scale(0.8); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes slideUp {
                    from { transform: translateY(30px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .review-success-card .rating-stars {
                    animation: slideUp 0.5s ease 0.2s both;
                }
            `;
            document.head.appendChild(styles);
        }
        
        // Auto-close after 8 seconds
        setTimeout(() => {
            const popup = document.getElementById('reviewSuccessPopup');
            if (popup) {
                popup.style.opacity = '0';
                popup.style.transition = 'opacity 0.3s';
                setTimeout(() => popup.remove(), 400);
            }
        }, 8000);
        
        // Reset form
        document.getElementById('selectedComponent').value = '';
        document.getElementById('reviewRatingValue').value = 0;
        document.getElementById('reviewTitleInput').value = '';
        document.getElementById('reviewTextInput').value = '';
        document.getElementById('reviewPros').value = '';
        document.getElementById('reviewCons').value = '';
        document.getElementById('reviewSuggestions').value = '';
        document.getElementById('anonymousReview').checked = false;
        document.getElementById('componentNameInput').value = '';
        document.getElementById('ratingText').textContent = 'Select a rating';
        document.getElementById('reviewCharCount').textContent = '0';
        document.getElementById('componentDetails').style.display = 'none';
        
        document.querySelectorAll('#starRatingLarge span').forEach(star => {
            star.textContent = '☆';
            star.style.color = '#d1d5db';
        });
        
        document.querySelectorAll('.component-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        
        // Refresh reviews after popup
        setTimeout(() => {
            loadReviews();
            loadSiteRating();
            updateReviewStats();
        }, 500);
        
    } catch (error) {
        showReviewError('Error submitting review: ' + error.message);
        console.error('Error:', error);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Review';
    }
}

// ============================================
// CLOSE SUCCESS POPUP
// ============================================

function closeSuccessPopup() {
    const popup = document.getElementById('reviewSuccessPopup');
    if (popup) {
        popup.style.opacity = '0';
        popup.style.transition = 'opacity 0.3s';
        setTimeout(() => popup.remove(), 400);
    }
}

function showReviewError(message) {
    const feedback = document.getElementById('reviewFormFeedback');
    if (feedback) {
        feedback.style.display = 'block';
        feedback.style.background = '#fee2e2';
        feedback.style.color = '#991b1b';
        feedback.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    }
}

// ============================================
// COMPONENT SELECTION
// ============================================

function selectComponent(value) {
    selectedComponent = value;
    document.getElementById('selectedComponent').value = value;
    
    document.querySelectorAll('.component-option').forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.value === value);
    });
    
    const details = document.getElementById('componentDetails');
    if (details) details.style.display = 'block';
    
    const label = document.getElementById('componentNameLabel');
    const input = document.getElementById('componentNameInput');
    
    const labels = {
        'site': 'What aspect of the site?',
        'course': 'Course Name',
        'lecturer': 'Lecturer Name',
        'facility': 'Facility Name',
        'library': 'Library Service',
        'administration': 'Administration Department',
        'online': 'Online Learning Platform',
        'clinical': 'Clinical Placement',
        'general': 'Topic'
    };
    
    if (label) label.textContent = labels[value] || 'Name';
    if (input) {
        input.placeholder = `Enter ${labels[value] || 'name'}...`;
        input.style.display = 'block';
        input.value = '';
    }
    
    const errorEl = document.getElementById('componentError');
    if (errorEl) errorEl.style.display = 'none';
}

function setReviewRating(rating) {
    reviewRating = rating;
    document.getElementById('reviewRatingValue').value = rating;
    
    const stars = document.querySelectorAll('#starRatingLarge span');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.textContent = '★';
            star.style.color = '#f59e0b';
        } else {
            star.textContent = '☆';
            star.style.color = '#d1d5db';
        }
    });
    
    const labels = ['', '⭐ Poor', '⭐ Fair', '⭐ Good', '⭐ Very Good', '⭐ Excellent'];
    const ratingText = document.getElementById('ratingText');
    if (ratingText) ratingText.textContent = labels[rating] || 'Select a rating';
    
    const errorEl = document.getElementById('ratingError');
    if (errorEl) errorEl.style.display = 'none';
}

function rateSite(rating) {
    openReviewModal();
    selectComponent('site');
    setReviewRating(rating);
    
    document.querySelectorAll('.component-option').forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.value === 'site');
    });
}

// ============================================
// STAR HTML HELPER
// ============================================

function getStarHTML(rating) {
    let html = '';
    for (let i = 0; i < 5; i++) {
        if (i < rating) {
            html += '<i class="fas fa-star" style="color: #f59e0b; font-size: 14px;"></i>';
        } else {
            html += '<i class="far fa-star" style="color: #d1d5db; font-size: 14px;"></i>';
        }
    }
    return html;
}

// ============================================
// FILTERS
// ============================================

function filterByCategory(category) {
    console.log('📊 Quick filter by category:', category);
    
    document.querySelectorAll('.cat-filter').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === category);
    });
    
    const filterEl = document.getElementById('reviewCategoryFilter');
    if (filterEl) {
        filterEl.value = category;
    }
    
    currentFilter.category = category;
    currentPage = 1;
    loadReviews();
}

function applyFilters() {
    const categoryEl = document.getElementById('reviewCategoryFilter');
    const ratingEl = document.getElementById('reviewRatingFilter');
    const sortEl = document.getElementById('reviewSortFilter');
    const searchEl = document.getElementById('reviewSearchInput');
    const programEl = document.getElementById('reviewProgramFilter');
    const blockEl = document.getElementById('reviewBlockFilter');
    
    const category = categoryEl ? categoryEl.value : 'all';
    const rating = ratingEl ? ratingEl.value : 'all';
    const sort = sortEl ? sortEl.value : 'newest';
    const search = searchEl ? searchEl.value : '';
    const program = programEl ? programEl.value : 'all';
    const block = blockEl ? blockEl.value : 'all';
    
    console.log('🔍 Applying filters:', { category, rating, sort, search, program, block });
    
    currentFilter.category = category;
    currentFilter.rating = rating;
    currentFilter.sort = sort;
    currentFilter.search = search;
    currentFilter.program = program;
    currentFilter.block = block;
    currentPage = 1;
    loadReviews();
}

function resetFilters() {
    console.log('🔄 Resetting all filters');
    
    currentFilter.category = 'all';
    currentFilter.rating = 'all';
    currentFilter.sort = 'newest';
    currentFilter.search = '';
    currentFilter.program = isTVETStudent ? 'TVET' : 'KRCHN';
    currentFilter.block = 'all';
    currentPage = 1;
    
    const categoryFilter = document.getElementById('reviewCategoryFilter');
    const ratingFilter = document.getElementById('reviewRatingFilter');
    const sortFilter = document.getElementById('reviewSortFilter');
    const searchInput = document.getElementById('reviewSearchInput');
    const programFilter = document.getElementById('reviewProgramFilter');
    const blockFilter = document.getElementById('reviewBlockFilter');
    
    if (categoryFilter) categoryFilter.value = 'all';
    if (ratingFilter) ratingFilter.value = 'all';
    if (sortFilter) sortFilter.value = 'newest';
    if (searchInput) searchInput.value = '';
    if (programFilter) programFilter.value = isTVETStudent ? 'TVET' : 'KRCHN';
    if (blockFilter) blockFilter.value = 'all';
    
    document.querySelectorAll('.cat-filter').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === 'all');
    });
    
    loadReviews();
}

// ============================================
// INITIALIZE CATEGORY FILTERS
// ============================================

function initCategoryFilters() {
    const categoryButtons = document.querySelectorAll('.cat-filter');
    categoryButtons.forEach(btn => {
        btn.removeEventListener('click', categoryClickHandler);
        btn.addEventListener('click', categoryClickHandler);
    });
}

function categoryClickHandler() {
    const category = this.dataset.category;
    filterByCategory(category);
}

// ============================================
// UPDATE FILTER RESULTS COUNT
// ============================================

function updateFilterResultsCount(count) {
    let resultsEl = document.getElementById('filterResultsCount');
    
    if (!resultsEl) {
        const filterBar = document.querySelector('.reviews-filters-premium');
        if (filterBar) {
            resultsEl = document.createElement('span');
            resultsEl.id = 'filterResultsCount';
            resultsEl.className = 'filter-results-count';
            resultsEl.style.cssText = 'font-size: 13px; color: #64748b; margin-left: 10px; font-weight: 500;';
            filterBar.appendChild(resultsEl);
        }
    }
    
    if (resultsEl) {
        resultsEl.textContent = `${count} review${count !== 1 ? 's' : ''} found`;
    }
}

// ============================================
// MODAL FUNCTIONS
// ============================================

function openReviewModal() {
    const modal = document.getElementById('writeReviewModal');
    if (modal) {
        modal.style.display = 'flex';
        const feedback = document.getElementById('reviewFormFeedback');
        if (feedback) feedback.style.display = 'none';
    }
}

function closeReviewModal() {
    const modal = document.getElementById('writeReviewModal');
    if (modal) modal.style.display = 'none';
    
    const form = document.getElementById('studentReviewForm');
    if (form) form.reset();
    
    const details = document.getElementById('componentDetails');
    if (details) details.style.display = 'none';
    
    document.querySelectorAll('.component-option').forEach(opt => opt.classList.remove('selected'));
    document.querySelectorAll('#starRatingLarge span').forEach(star => {
        star.textContent = '☆';
        star.style.color = '#d1d5db';
    });
    
    const ratingText = document.getElementById('ratingText');
    if (ratingText) ratingText.textContent = 'Select a rating';
    
    document.getElementById('reviewRatingValue').value = 0;
}

function openReviewDetail(reviewId) {
    const review = allReviews.find(r => r.id === reviewId);
    if (!review) return;
    
    const modal = document.getElementById('reviewDetailModal');
    const body = document.getElementById('reviewDetailBody');
    const title = document.getElementById('detailReviewTitle');
    
    if (title) title.textContent = review.review_title || 'Review Details';
    
    const stars = getStarHTML(review.rating || 0);
    const date = new Date(review.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    if (body) {
        body.innerHTML = `
            <div class="detail-review-header">
                <div class="detail-rating">${stars}</div>
                <div class="detail-meta">
                    <span class="detail-category">${review.component_type || 'General'}</span>
                    ${review.component_name ? `<span class="detail-component">${escapeHtml(review.component_name)}</span>` : ''}
                    <span class="detail-date">${date}</span>
                </div>
            </div>
            ${review.review_title ? `<h4 class="detail-title">${escapeHtml(review.review_title)}</h4>` : ''}
            <p class="detail-review">${escapeHtml(review.review)}</p>
            
            ${review.pros ? `
                <div class="detail-section pros">
                    <h5><i class="fas fa-thumbs-up" style="color: #10b981;"></i> What went well</h5>
                    <p>${escapeHtml(review.pros)}</p>
                </div>
            ` : ''}
            
            ${review.cons ? `
                <div class="detail-section cons">
                    <h5><i class="fas fa-thumbs-down" style="color: #ef4444;"></i> Could improve</h5>
                    <p>${escapeHtml(review.cons)}</p>
                </div>
            ` : ''}
            
            ${review.suggestions ? `
                <div class="detail-section suggestions">
                    <h5><i class="fas fa-lightbulb" style="color: #f59e0b;"></i> Suggestions</h5>
                    <p>${escapeHtml(review.suggestions)}</p>
                </div>
            ` : ''}
            
            <div class="detail-footer">
                <span class="detail-helpful">
                    <i class="fas fa-thumbs-up"></i> ${review.helpful_count || 0} people found this helpful
                </span>
                <button class="helpful-btn" onclick="markHelpful('${review.id}')">
                    <i class="fas fa-thumbs-up"></i> Helpful
                </button>
            </div>
        `;
    }
    
    if (modal) modal.style.display = 'flex';
}

function closeDetailModal() {
    const modal = document.getElementById('reviewDetailModal');
    if (modal) modal.style.display = 'none';
}

// ============================================
// HELPFUL & SHARE
// ============================================

async function markHelpful(reviewId) {
    try {
        const supabase = getSupabaseClient();
        if (!supabase) return;
        
        const currentUser = window.currentUserProfile || window.currentUserId;
        const userId = currentUser?.user_id || currentUser;
        
        if (!userId) {
            alert('Please login to mark reviews as helpful');
            return;
        }
        
        const { data: existing, error: checkError } = await supabase
            .from('review_helpful')
            .select('id')
            .eq('review_id', reviewId)
            .eq('user_id', userId)
            .maybeSingle();
        
        if (checkError) throw checkError;
        
        if (existing) {
            alert('You already marked this as helpful');
            return;
        }
        
        const { error: insertError } = await supabase
            .from('review_helpful')
            .insert([{
                review_id: reviewId,
                user_id: userId
            }]);
        
        if (insertError) throw insertError;
        
        const review = allReviews.find(r => r.id === reviewId);
        if (review) {
            review.helpful_count = (review.helpful_count || 0) + 1;
        }
        
        await supabase
            .from('student_reviews')
            .update({ helpful_count: review?.helpful_count || 1 })
            .eq('id', reviewId);
        
        loadReviews();
        updateReviewStats();
        
    } catch (error) {
        console.error('Error marking helpful:', error);
        alert('Error: ' + error.message);
    }
}

function shareReview(reviewId) {
    if (navigator.share) {
        navigator.share({
            title: 'NCHSM Student Review',
            text: 'Check out this review on NCHSM Student Portal!',
            url: window.location.href
        }).catch(() => {});
    } else {
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            alert('Link copied to clipboard! Share it with others.');
        }).catch(() => {});
    }
}

// ============================================
// LOAD MORE
// ============================================

function loadMoreReviews() {
    currentPage++;
    const start = (currentPage - 1) * REVIEWS_PER_PAGE;
    const end = start + REVIEWS_PER_PAGE;
    const moreReviews = allReviews.slice(start, end);
    
    if (moreReviews.length > 0) {
        const grid = document.getElementById('reviewsGrid');
        if (grid) {
            const existingCards = grid.innerHTML;
            grid.innerHTML = existingCards + moreReviews.map(review => {
                const stars = getStarHTML(review.rating || 0);
                const name = review.is_anonymous ? 'Anonymous Student' : (review.student?.full_name || 'Student');
                const date = new Date(review.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
                
                return `
                    <div class="review-card-premium" onclick="openReviewDetail('${review.id}')">
                        <div class="review-card-header">
                            <div class="reviewer-info">
                                <div class="reviewer-avatar-placeholder">${name.charAt(0).toUpperCase()}</div>
                                <div class="reviewer-details">
                                    <span class="reviewer-name">${escapeHtml(name)}</span>
                                    <span class="reviewer-program">${review.student?.program || ''}</span>
                                </div>
                            </div>
                            <div class="review-category-badge">${review.component_type || 'General'}</div>
                        </div>
                        <div class="review-card-body">
                            <div class="review-rating">${stars}</div>
                            ${review.review_title ? `<h4 class="review-title">${escapeHtml(review.review_title)}</h4>` : ''}
                            <p class="review-text">${escapeHtml(review.review.substring(0, 200))}...</p>
                        </div>
                        <div class="review-card-footer">
                            <span class="review-date"><i class="fas fa-clock"></i> ${date}</span>
                        </div>
                    </div>
                `;
            }).join('');
        }
        updateLoadMoreButton();
    }
}

function updateLoadMoreButton() {
    const container = document.getElementById('loadMoreContainer');
    if (container) {
        if (allReviews.length > currentPage * REVIEWS_PER_PAGE) {
            container.style.display = 'block';
        } else {
            container.style.display = 'none';
        }
    }
}

// ============================================
// EXPOSE FUNCTIONS
// ============================================

window.initReviewsModule = initReviewsModule;
window.loadReviews = loadReviews;
window.loadSiteRating = loadSiteRating;
window.updateReviewStats = updateReviewStats;
window.submitReview = submitReview;
window.selectComponent = selectComponent;
window.setReviewRating = setReviewRating;
window.rateSite = rateSite;
window.filterByCategory = filterByCategory;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.openReviewModal = openReviewModal;
window.closeReviewModal = closeReviewModal;
window.openReviewDetail = openReviewDetail;
window.closeDetailModal = closeDetailModal;
window.markHelpful = markHelpful;
window.shareReview = shareReview;
window.loadMoreReviews = loadMoreReviews;
window.getStarHTML = getStarHTML;
window.getSupabaseClient = getSupabaseClient;
window.escapeHtml = escapeHtml;
window.refreshReviews = refreshReviews;
window.initCategoryFilters = initCategoryFilters;
window.updateFilterResultsCount = updateFilterResultsCount;
window.isTVETProgram = isTVETProgram;
window.getProgramType = getProgramType;
window.getProgramDisplayName = getProgramDisplayName;
window.closeSuccessPopup = closeSuccessPopup;

console.log('✅ Reviews & Newsletter module loaded with beautiful submit popup!');
