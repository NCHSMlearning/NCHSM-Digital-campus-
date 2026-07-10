// ============================================
// COMPLETE REVIEWS SYSTEM
// ============================================

let allReviews = [];
let currentPage = 1;
const REVIEWS_PER_PAGE = 10;
let selectedComponent = '';
let reviewRating = 0;
let currentFilter = {
    category: 'all',
    rating: 'all',
    sort: 'newest',
    search: ''
};

// ============================================
// INITIALIZE REVIEWS
// ============================================

function initReviewsModule() {
    console.log('⭐ Initializing Reviews Module...');
    
    loadReviews();
    loadSiteRating();
    loadReviewStats();
    
    // Event Listeners
    document.getElementById('writeReviewBtn')?.addEventListener('click', openReviewModal);
    document.getElementById('closeReviewModal')?.addEventListener('click', closeReviewModal);
    document.getElementById('cancelReviewBtn')?.addEventListener('click', closeReviewModal);
    document.getElementById('closeDetailModal')?.addEventListener('click', closeDetailModal);
    document.getElementById('studentReviewForm')?.addEventListener('submit', submitReview);
    document.getElementById('loadMoreReviewsBtn')?.addEventListener('click', loadMoreReviews);
    document.getElementById('refreshReviewsBtn')?.addEventListener('click', () => {
        loadReviews();
        loadSiteRating();
        loadReviewStats();
    });
    
    // Character counter
    document.getElementById('reviewTextInput')?.addEventListener('input', function() {
        const count = document.getElementById('reviewCharCount');
        if (count) count.textContent = this.value.length;
    });
    
    // Search input
    document.getElementById('reviewSearchInput')?.addEventListener('keyup', function(e) {
        if (e.key === 'Enter') {
            currentFilter.search = this.value;
            loadReviews();
        }
    });
    
    console.log('✅ Reviews Module initialized');
}

// ============================================
// LOAD REVIEWS
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
        let query = window.db.supabase
            .from('student_reviews')
            .select('*, student:student_id(full_name, program, profile_photo_url)')
            .eq('status', 'approved')
            .order('created_at', { ascending: false });
        
        // Apply filters
        if (currentFilter.category !== 'all') {
            query = query.eq('component_type', currentFilter.category);
        }
        
        if (currentFilter.rating !== 'all') {
            query = query.eq('rating', parseInt(currentFilter.rating));
        }
        
        if (currentFilter.search) {
            query = query.or(`review.ilike.%${currentFilter.search}%, review_title.ilike.%${currentFilter.search}%, component_name.ilike.%${currentFilter.search}%`);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        allReviews = data || [];
        
        // Apply sorting
        allReviews.sort((a, b) => {
            switch(currentFilter.sort) {
                case 'oldest':
                    return new Date(a.created_at) - new Date(b.created_at);
                case 'highest':
                    return (b.rating || 0) - (a.rating || 0);
                case 'lowest':
                    return (a.rating || 0) - (b.rating || 0);
                case 'helpful':
                    return (b.helpful_count || 0) - (a.helpful_count || 0);
                default: // newest
                    return new Date(b.created_at) - new Date(a.created_at);
            }
        });
        
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
                <i class="fas fa-star" style="font-size: 48px; color: #d1d5db;"></i>
                <h3>No Reviews Found</h3>
                <p>Be the first to share your experience!</p>
                <button onclick="openReviewModal()" class="btn-primary">
                    <i class="fas fa-pen"></i> Write a Review
                </button>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = reviews.map(review => {
        const stars = getStarHTML(review.rating || 0);
        const name = review.is_anonymous ? 'Anonymous Student' : (review.student?.full_name || 'Student');
        const avatar = review.is_anonymous ? null : review.student?.profile_photo_url;
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
        
        return `
            <div class="review-card-premium" onclick="openReviewDetail('${review.id}')">
                <div class="review-card-header">
                    <div class="reviewer-info">
                        ${!review.is_anonymous && avatar ? 
                            `<img src="${avatar}" alt="${name}" class="reviewer-avatar">` :
                            `<div class="reviewer-avatar-placeholder">${name.charAt(0).toUpperCase()}</div>`
                        }
                        <div class="reviewer-details">
                            <span class="reviewer-name">${name}</span>
                            <span class="reviewer-program">${review.student?.program || ''}</span>
                        </div>
                    </div>
                    <div class="review-category-badge">
                        ${categoryIcon} ${categoryLabel}
                        ${componentDisplay ? `<span class="component-tag">${componentDisplay}</span>` : ''}
                    </div>
                </div>
                
                <div class="review-card-body">
                    <div class="review-rating">${stars}</div>
                    ${review.review_title ? `<h4 class="review-title">${review.review_title}</h4>` : ''}
                    <p class="review-text">${review.review.length > 200 ? review.review.substring(0, 200) + '...' : review.review}</p>
                    
                    ${review.pros ? `
                        <div class="review-pros">
                            <i class="fas fa-thumbs-up" style="color: #10b981;"></i>
                            <span>${review.pros}</span>
                        </div>
                    ` : ''}
                    
                    ${review.cons ? `
                        <div class="review-cons">
                            <i class="fas fa-thumbs-down" style="color: #ef4444;"></i>
                            <span>${review.cons}</span>
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
        const { data, error } = await window.db.supabase
            .from('student_reviews')
            .select('rating')
            .eq('component_type', 'site')
            .eq('status', 'approved');
        
        if (error) throw error;
        
        const ratings = data || [];
        const count = ratings.length;
        const avg = count > 0 ? (ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / count) : 0;
        
        document.getElementById('siteAvgScore').textContent = avg.toFixed(1);
        document.getElementById('siteRatingCount').textContent = count;
        
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
        
        if (count > 0) {
            document.getElementById('siteRatingText').textContent = `${avg.toFixed(1)} average from ${count} reviews`;
        }
        
    } catch (error) {
        console.error('Error loading site rating:', error);
    }
}

// ============================================
// UPDATE STATS
// ============================================

async function updateReviewStats() {
    try {
        const { data, error } = await window.db.supabase
            .from('student_reviews')
            .select('rating, helpful_count, status')
            .eq('status', 'approved');
        
        if (error) throw error;
        
        const reviews = data || [];
        const total = reviews.length;
        const avg = total > 0 ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / total) : 0;
        const helpful = reviews.reduce((sum, r) => sum + (r.helpful_count || 0), 0);
        
        document.getElementById('avgRatingDisplay').textContent = avg.toFixed(1);
        document.getElementById('totalReviewsDisplay').textContent = total;
        document.getElementById('helpfulCountDisplay').textContent = helpful;
        
        // Pending reviews count (for the student's own pending reviews)
        const { data: pending, error: pendingError } = await window.db.supabase
            .from('student_reviews')
            .select('id', { count: 'exact' })
            .eq('student_id', window.currentUserId)
            .eq('status', 'pending');
        
        if (!pendingError) {
            document.getElementById('pendingReviewsDisplay').textContent = pending?.length || 0;
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
    
    const component = document.getElementById('selectedComponent').value;
    const rating = parseInt(document.getElementById('reviewRatingValue').value);
    const title = document.getElementById('reviewTitleInput').value.trim();
    const review = document.getElementById('reviewTextInput').value.trim();
    const pros = document.getElementById('reviewPros').value.trim();
    const cons = document.getElementById('reviewCons').value.trim();
    const suggestions = document.getElementById('reviewSuggestions').value.trim();
    const anonymous = document.getElementById('anonymousReview').checked;
    const componentName = document.getElementById('componentNameInput').value.trim();
    
    // Validation
    if (!component) {
        showReviewError('Please select what you are reviewing');
        return;
    }
    
    if (rating === 0) {
        showReviewError('Please select a rating');
        return;
    }
    
    if (review.length < 10) {
        showReviewError('Please write at least 10 characters');
        return;
    }
    
    const btn = document.getElementById('submitReviewBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    
    try {
        const { data, error } = await window.db.supabase
            .from('student_reviews')
            .insert([{
                student_id: window.currentUserId,
                component_type: component,
                component_name: componentName || null,
                rating: rating,
                review_title: title || null,
                review: review,
                pros: pros || null,
                cons: cons || null,
                suggestions: suggestions || null,
                is_anonymous: anonymous,
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

// ============================================
// HELPER FUNCTIONS
// ============================================

function showReviewError(message) {
    const feedback = document.getElementById('reviewFormFeedback');
    feedback.style.display = 'block';
    feedback.style.background = '#fee2e2';
    feedback.style.color = '#991b1b';
    feedback.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
}

function selectComponent(value) {
    selectedComponent = value;
    document.getElementById('selectedComponent').value = value;
    
    // Update UI
    document.querySelectorAll('.component-option').forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.value === value);
    });
    
    // Show component details
    const details = document.getElementById('componentDetails');
    details.style.display = 'block';
    
    const label = document.getElementById('componentNameLabel');
    const select = document.getElementById('componentNameSelect');
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
    
    label.textContent = labels[value] || 'Name';
    
    // For courses, load from database
    if (value === 'course') {
        loadCoursesForReview();
        select.style.display = 'block';
        input.style.display = 'none';
    } else {
        select.style.display = 'none';
        input.style.display = 'block';
        input.placeholder = `Enter ${labels[value] || 'name'}...`;
    }
    
    // Hide error
    document.getElementById('componentError').style.display = 'none';
}

async function loadCoursesForReview() {
    try {
        const { data, error } = await window.db.supabase
            .from('courses')
            .select('id, course_name')
            .limit(50);
        
        if (error) throw error;
        
        const select = document.getElementById('componentNameSelect');
        select.innerHTML = '<option value="">Select a course...</option>';
        data?.forEach(course => {
            const option = document.createElement('option');
            option.value = course.id;
            option.textContent = course.course_name;
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error loading courses:', error);
    }
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
    document.getElementById('ratingText').textContent = labels[rating] || 'Select a rating';
    document.getElementById('ratingError').style.display = 'none';
}

function rateSite(rating) {
    // Quick site rating - opens modal with site pre-selected
    openReviewModal();
    selectComponent('site');
    setReviewRating(rating);
    
    // Highlight site option
    document.querySelectorAll('.component-option').forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.value === 'site');
    });
}

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

function filterByCategory(category) {
    currentFilter.category = category;
    document.querySelectorAll('.cat-filter').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === category);
    });
    document.getElementById('reviewCategoryFilter').value = category;
    loadReviews();
}

function applyFilters() {
    currentFilter.category = document.getElementById('reviewCategoryFilter').value;
    currentFilter.rating = document.getElementById('reviewRatingFilter').value;
    currentFilter.sort = document.getElementById('reviewSortFilter').value;
    currentFilter.search = document.getElementById('reviewSearchInput').value;
    loadReviews();
}

function openReviewModal() {
    document.getElementById('writeReviewModal').style.display = 'flex';
    document.getElementById('reviewFormFeedback').style.display = 'none';
}

function closeReviewModal() {
    document.getElementById('writeReviewModal').style.display = 'none';
    document.getElementById('studentReviewForm').reset();
    document.getElementById('componentDetails').style.display = 'none';
    document.querySelectorAll('.component-option').forEach(opt => opt.classList.remove('selected'));
    document.querySelectorAll('#starRatingLarge span').forEach(star => {
        star.textContent = '☆';
        star.style.color = '#d1d5db';
    });
    document.getElementById('ratingText').textContent = 'Select a rating';
    document.getElementById('reviewRatingValue').value = 0;
}

function openReviewDetail(reviewId) {
    const review = allReviews.find(r => r.id === reviewId);
    if (!review) return;
    
    const modal = document.getElementById('reviewDetailModal');
    const body = document.getElementById('reviewDetailBody');
    const title = document.getElementById('detailReviewTitle');
    
    title.textContent = review.review_title || 'Review Details';
    
    const stars = getStarHTML(review.rating || 0);
    const date = new Date(review.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    body.innerHTML = `
        <div class="detail-review-header">
            <div class="detail-rating">${stars}</div>
            <div class="detail-meta">
                <span class="detail-category">${review.component_type}</span>
                ${review.component_name ? `<span class="detail-component">${review.component_name}</span>` : ''}
                <span class="detail-date">${date}</span>
            </div>
        </div>
        ${review.review_title ? `<h4 class="detail-title">${review.review_title}</h4>` : ''}
        <p class="detail-review">${review.review}</p>
        
        ${review.pros ? `
            <div class="detail-section pros">
                <h5><i class="fas fa-thumbs-up" style="color: #10b981;"></i> What went well</h5>
                <p>${review.pros}</p>
            </div>
        ` : ''}
        
        ${review.cons ? `
            <div class="detail-section cons">
                <h5><i class="fas fa-thumbs-down" style="color: #ef4444;"></i> Could improve</h5>
                <p>${review.cons}</p>
            </div>
        ` : ''}
        
        ${review.suggestions ? `
            <div class="detail-section suggestions">
                <h5><i class="fas fa-lightbulb" style="color: #f59e0b;"></i> Suggestions</h5>
                <p>${review.suggestions}</p>
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
    
    modal.style.display = 'flex';
}

function closeDetailModal() {
    document.getElementById('reviewDetailModal').style.display = 'none';
}

async function markHelpful(reviewId) {
    try {
        const { error } = await window.db.supabase.rpc('mark_review_helpful', {
            review_id: reviewId,
            user_id: window.currentUserId
        });
        
        if (error) throw error;
        
        // Update local data
        const review = allReviews.find(r => r.id === reviewId);
        if (review) {
            review.helpful_count = (review.helpful_count || 0) + 1;
        }
        
        loadReviews();
        updateReviewStats();
        
    } catch (error) {
        console.error('Error marking helpful:', error);
        // If RPC doesn't exist, use direct update
        try {
            const { data: existing } = await window.db.supabase
                .from('review_helpful')
                .select('id')
                .eq('review_id', reviewId)
                .eq('user_id', window.currentUserId)
                .maybeSingle();
            
            if (existing) {
                alert('You already marked this as helpful');
                return;
            }
            
            await window.db.supabase
                .from('review_helpful')
                .insert([{
                    review_id: reviewId,
                    user_id: window.currentUserId
                }]);
            
            const { data: review } = await window.db.supabase
                .from('student_reviews')
                .select('helpful_count')
                .eq('id', reviewId)
                .single();
            
            await window.db.supabase
                .from('student_reviews')
                .update({ helpful_count: (review?.helpful_count || 0) + 1 })
                .eq('id', reviewId);
            
            loadReviews();
            updateReviewStats();
            
        } catch (err) {
            console.error('Error:', err);
        }
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
        // Fallback: copy to clipboard
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            alert('Link copied to clipboard! Share it with others.');
        }).catch(() => {});
    }
}

function loadMoreReviews() {
    currentPage++;
    const start = (currentPage - 1) * REVIEWS_PER_PAGE;
    const end = start + REVIEWS_PER_PAGE;
    const moreReviews = allReviews.slice(start, end);
    
    if (moreReviews.length > 0) {
        const grid = document.getElementById('reviewsGrid');
        grid.innerHTML += moreReviews.map(review => {
            // Reuse the same card template
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
                                <span class="reviewer-name">${name}</span>
                                <span class="reviewer-program">${review.student?.program || ''}</span>
                            </div>
                        </div>
                        <div class="review-category-badge">
                            ${review.component_type || 'General'}
                        </div>
                    </div>
                    <div class="review-card-body">
                        <div class="review-rating">${stars}</div>
                        ${review.review_title ? `<h4 class="review-title">${review.review_title}</h4>` : ''}
                        <p class="review-text">${review.review.substring(0, 200)}...</p>
                    </div>
                    <div class="review-card-footer">
                        <span class="review-date"><i class="fas fa-clock"></i> ${date}</span>
                    </div>
                </div>
            `;
        }).join('');
        
        updateLoadMoreButton();
    }
}

function updateLoadMoreButton() {
    const container = document.getElementById('loadMoreContainer');
    if (allReviews.length > currentPage * REVIEWS_PER_PAGE) {
        container.style.display = 'block';
    } else {
        container.style.display = 'none';
    }
}

// ============================================
// EXPOSE FUNCTIONS GLOBALLY
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
window.openReviewModal = openReviewModal;
window.closeReviewModal = closeReviewModal;
window.openReviewDetail = openReviewDetail;
window.closeDetailModal = closeDetailModal;
window.markHelpful = markHelpful;
window.shareReview = shareReview;
window.loadMoreReviews = loadMoreReviews;
window.getStarHTML = getStarHTML;

console.log('✅ Complete Reviews System loaded!');
