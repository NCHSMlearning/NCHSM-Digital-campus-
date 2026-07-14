// ============================================
// REVIEWS & NEWSLETTER MODULE - KRCHN & TVET SUPPORT
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
// PROGRAM TYPES
// ============================================

const PROGRAM_TYPES = {
    KRCHN: 'KRCHN',
    TVET: 'TVET'
};

const TVET_PROGRAMS = [
    'DPOTT', 'DCH', 'DHRIT', 'DSL', 'DSW', 'DCJS', 'DHSS', 'DICT', 'DME',
    'CPOTT', 'CCH', 'CHRIT', 'CPC', 'CSL', 'CSW', 'CCJS', 'CAG', 'CHSS', 'CICT',
    'ACH', 'AAG', 'ASW', 'CCA', 'PTE'
];

function isTVETProgram(programCode) {
    if (!programCode) return false;
    return TVET_PROGRAMS.includes(programCode.toUpperCase());
}

function getProgramType(programCode) {
    if (!programCode) return 'KRCHN';
    if (programCode === 'KRCHN') return 'KRCHN';
    if (isTVETProgram(programCode)) return 'TVET';
    return 'KRCHN';
}

function getProgramDisplayName(programCode) {
    const names = {
        'KRCHN': '🎓 KRCHN Nursing',
        'DPOTT': 'Diploma in Perioperative Theatre Technology',
        'DCH': 'Diploma in Community Health',
        'DHRIT': 'Diploma in Health Records and IT',
        'DSL': 'Diploma in Science Lab',
        'DSW': 'Diploma in Social Work',
        'DCJS': 'Diploma in Criminal Justice',
        'DHSS': 'Diploma in Health Support Services',
        'DICT': 'Diploma in ICT',
        'DME': 'Diploma in Medical Engineering',
        'CPOTT': 'Certificate in Perioperative Theatre Technology',
        'CCH': 'Certificate in Community Health',
        'CHRIT': 'Certificate in Health Records and IT',
        'CPC': 'Certificate in Patient Care',
        'CSL': 'Certificate in Science Lab',
        'CSW': 'Certificate in Social Work',
        'CCJS': 'Certificate in Criminal Justice',
        'CAG': 'Certificate in Agriculture',
        'CHSS': 'Certificate in Health Support Services',
        'CICT': 'Certificate in ICT',
        'ACH': 'Artisan in Community Health',
        'AAG': 'Artisan in Agriculture',
        'ASW': 'Artisan in Social Work',
        'CCA': 'Certificate in Computer Applications',
        'PTE': 'TVET/CDACC (PTE)'
    };
    return names[programCode] || programCode;
}

function getBlockDisplay(block, programType) {
    if (!block) return 'N/A';
    if (programType === 'TVET') {
        return block.startsWith('Term') ? block : `Term ${block}`;
    }
    return block;
}

// ============================================
// INITIALIZE
// ============================================

function initReviewsModule() {
    console.log('⭐ Initializing Reviews Module...');
    
    try {
        // Reset filter state
        currentFilter.category = 'all';
        currentFilter.rating = 'all';
        currentFilter.sort = 'newest';
        currentFilter.search = '';
        currentFilter.program = 'all';
        currentFilter.block = 'all';
        currentPage = 1;
        
        // Load data
        loadReviews();
        loadSiteRating();
        updateReviewStats();
        
        // Setup category filters
        initCategoryFilters();
        
        // Event listeners
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
        
        // Filter listeners
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
        
        // Program filter
        const programFilter = document.getElementById('reviewProgramFilter');
        if (programFilter) {
            programFilter.removeEventListener('change', applyFilters);
            programFilter.addEventListener('change', applyFilters);
        }
        
        // Block filter
        const blockFilter = document.getElementById('reviewBlockFilter');
        if (blockFilter) {
            blockFilter.removeEventListener('change', applyFilters);
            blockFilter.addEventListener('change', applyFilters);
        }
        
        // Load more
        const loadMoreBtn = document.getElementById('loadMoreReviewsBtn');
        if (loadMoreBtn) {
            loadMoreBtn.removeEventListener('click', loadMoreReviews);
            loadMoreBtn.addEventListener('click', loadMoreReviews);
        }
        
        // Add reset button if not exists
        addResetButton();
        
        console.log('✅ Reviews Module initialized');
        
    } catch (error) {
        console.error('Error initializing reviews:', error);
    }
}

// ============================================
// ADD RESET BUTTON
// ============================================

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
// SMART LOAD REVIEWS - SUPPORTS BOTH KRCHN & TVET
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
        
        // Get current user's block and program
        const currentUser = window.currentUserProfile || window.currentUserId;
        const userBlock = currentUser?.block || 'Block 1';
        const userProgram = currentUser?.program || 'KRCHN';
        const userProgramType = getProgramType(userProgram);
        
        console.log('📊 User Program:', userProgram);
        console.log('📊 User Program Type:', userProgramType);
        console.log('📊 User Block:', userBlock);
        console.log('📊 Current Filters:', currentFilter);
        
        // Start with base query - ONLY approved reviews
        let query = supabase
            .from('student_reviews')
            .select('*, student:student_id(full_name, program, block, profile_photo_url)')
            .eq('status', 'approved');
        
        // Apply category filter
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
        
        // ============================================
        // 🔥 SMART FILTERING: ACADEMIC VS SITE
        // ============================================
        
        // If filtering by a specific category
        if (currentFilter.category && currentFilter.category !== 'all') {
            // Academic categories: filter by block and program type
            const academicCategories = ['course', 'lecturer', 'facility', 'library', 'administration', 'online', 'clinical', 'general'];
            
            if (academicCategories.includes(currentFilter.category)) {
                // Academic reviews - filter by user's block and program
                console.log('📊 Academic review - filtering by block:', userBlock);
                console.log('📊 Academic review - filtering by program type:', userProgramType);
                query = query
                    .eq('target_block', userBlock)
                    .eq('target_program_type', userProgramType);
            } 
            // Site reviews - show ALL
            else if (currentFilter.category === 'site') {
                console.log('📊 Site review - showing ALL');
                // No additional filters - all site reviews visible
            }
        }
        
        // Apply rating filter
        if (currentFilter.rating && currentFilter.rating !== 'all') {
            const ratingValue = parseInt(currentFilter.rating);
            console.log('📊 Filtering by rating:', ratingValue);
            query = query.eq('rating', ratingValue);
        }
        
        // Apply search filter
        if (currentFilter.search && currentFilter.search.trim() !== '') {
            const searchTerm = currentFilter.search.trim();
            console.log('📊 Searching for:', searchTerm);
            query = query.or(`review.ilike.%${searchTerm}%, review_title.ilike.%${searchTerm}%, component_name.ilike.%${searchTerm}%`);
        }
        
        // Apply sorting
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
        
        // ============================================
        // 🔥 POST-FETCH FILTERING FOR "ALL" CATEGORY
        // ============================================
        
        let filteredReviews = data || [];
        
        // If "all" category, filter academic by block in JavaScript
        if (!currentFilter.category || currentFilter.category === 'all') {
            const academicCategories = ['course', 'lecturer', 'facility', 'library', 'administration', 'online', 'clinical', 'general'];
            
            filteredReviews = filteredReviews.filter(review => {
                // Site reviews - always show
                if (review.component_type === 'site') {
                    return true;
                }
                // Academic reviews - only show if matches user's block and program type
                if (academicCategories.includes(review.component_type)) {
                    const reviewBlock = review.target_block || review.block || 'Block 1';
                    const reviewProgramType = review.target_program_type || review.program_type || 'KRCHN';
                    // Check if both block and program type match
                    return reviewBlock === userBlock && reviewProgramType === userProgramType;
                }
                return true;
            });
        }
        
        allReviews = filteredReviews;
        console.log(`✅ Found ${allReviews.length} reviews (filtered for block: ${userBlock}, program type: ${userProgramType})`);
        
        // Update filter results count
        updateFilterResultsCount(allReviews.length);
        
        // Render reviews
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
        
        // Determine program type badge
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
                    
                    <!-- Block & Program Badge -->
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
        
        // Update site stars
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
        
        // Get approved reviews
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
        
        // Get user's pending reviews
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
// SUBMIT REVIEW
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
    
    // Validation
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
        const userProgram = currentUser?.program || 'KRCHN';
        const userBlock = currentUser?.block || 'Block 1';
        const userProgramType = getProgramType(userProgram);
        
        if (!userId) throw new Error('User not logged in');
        
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
        
        // Show success
        const feedback = document.getElementById('reviewFormFeedback');
        feedback.style.display = 'block';
        feedback.style.background = '#d1fae5';
        feedback.style.color = '#065f46';
        feedback.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <strong>Review Submitted!</strong>
            <p>Thank you for your feedback. Your review will be reviewed and published soon.</p>
        `;
        
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
        
        // Reset stars
        document.querySelectorAll('#starRatingLarge span').forEach(star => {
            star.textContent = '☆';
            star.style.color = '#d1d5db';
        });
        
        // Reset component options
        document.querySelectorAll('.component-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        
        // Close modal after delay
        setTimeout(() => {
            closeReviewModal();
            loadReviews();
            loadSiteRating();
            updateReviewStats();
        }, 3000);
        
    } catch (error) {
        showReviewError('Error submitting review: ' + error.message);
        console.error('Error:', error);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Review';
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
    
    // Update UI
    document.querySelectorAll('.component-option').forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.value === value);
    });
    
    // Show component details
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
    
    // Hide error
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
    
    // Update active state on quick filter buttons
    document.querySelectorAll('.cat-filter').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === category);
    });
    
    // Update the dropdown filter
    const filterEl = document.getElementById('reviewCategoryFilter');
    if (filterEl) {
        filterEl.value = category;
    }
    
    // Update current filter state
    currentFilter.category = category;
    currentPage = 1;
    
    // Reload reviews
    loadReviews();
}

function applyFilters() {
    const categoryEl = document.getElementById('reviewCategoryFilter');
    const ratingEl = document.getElementById('reviewRatingFilter');
    const sortEl = document.getElementById('reviewSortFilter');
    const searchEl = document.getElementById('reviewSearchInput');
    const programEl = document.getElementById('reviewProgramFilter');
    const blockEl = document.getElementById('reviewBlockFilter');
    
    // Get values
    const category = categoryEl ? categoryEl.value : 'all';
    const rating = ratingEl ? ratingEl.value : 'all';
    const sort = sortEl ? sortEl.value : 'newest';
    const search = searchEl ? searchEl.value : '';
    const program = programEl ? programEl.value : 'all';
    const block = blockEl ? blockEl.value : 'all';
    
    console.log('🔍 Applying filters:', { category, rating, sort, search, program, block });
    
    // Update current filter state
    currentFilter.category = category;
    currentFilter.rating = rating;
    currentFilter.sort = sort;
    currentFilter.search = search;
    currentFilter.program = program;
    currentFilter.block = block;
    
    // Reset to page 1 when filters change
    currentPage = 1;
    
    // Reload reviews with filters
    loadReviews();
}

function resetFilters() {
    console.log('🔄 Resetting all filters');
    
    // Reset filter state
    currentFilter.category = 'all';
    currentFilter.rating = 'all';
    currentFilter.sort = 'newest';
    currentFilter.search = '';
    currentFilter.program = 'all';
    currentFilter.block = 'all';
    currentPage = 1;
    
    // Reset UI elements
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
    if (programFilter) programFilter.value = 'all';
    if (blockFilter) blockFilter.value = 'all';
    
    // Reset quick filter buttons
    document.querySelectorAll('.cat-filter').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === 'all');
    });
    
    // Reload reviews
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
    
    // Reset form
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
        
        // Check if already marked
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
        
        // Add helpful vote
        const { error: insertError } = await supabase
            .from('review_helpful')
            .insert([{
                review_id: reviewId,
                user_id: userId
            }]);
        
        if (insertError) throw insertError;
        
        // Update review count
        const review = allReviews.find(r => r.id === reviewId);
        if (review) {
            review.helpful_count = (review.helpful_count || 0) + 1;
        }
        
        // Update in database
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
window.getBlockDisplay = getBlockDisplay;
window.TVET_PROGRAMS = TVET_PROGRAMS;

console.log('✅ Reviews & Newsletter module loaded (KRCHN & TVET support)');
