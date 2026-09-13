(function () {
    'use strict';

    // ============================================================
    // NCHSM STUDENT BLOG MODULE
    // ============================================================

    console.log('✅ student-blog.js - NCHSM Student Blog Module');

    class StudentBlogModule {
        constructor() {
            console.log('🔧 StudentBlogModule initialized');

            this.TABLE_NAME = 'student_blog_posts';

            this.allPosts = [];
            this.filteredPosts = [];
            this.currentSearch = '';
            this.currentCategory = '';

            this.userProfile = {};
            this.userId = null;

            this.cacheElements();
            this.initializeEventListeners();
            this.initializeUserData();
        }

        // ========================================================
        // DATABASE
        // ========================================================

        getSupabase() {
            return (
                window.db?.supabase ||
                window.supabaseClient ||
                window.sb ||
                null
            );
        }

        // ========================================================
        // DOM ELEMENTS
        // ========================================================

        cacheElements() {
            this.section = document.getElementById('student-blog');
            this.grid = document.getElementById('studentBlogGrid');
            this.searchInput = document.getElementById('studentBlogSearch');
            this.categorySelect = document.getElementById('studentBlogCategory');
            this.createButton = document.getElementById('studentBlogCreateBtn');

            this.modal = document.getElementById('studentBlogModal');
            this.form = document.getElementById('studentBlogForm');

            this.titleInput = document.getElementById('studentBlogTitle');
            this.categoryInput = document.getElementById('studentBlogPostCategory');
            this.imageInput = document.getElementById('studentBlogImage');
            this.contentInput = document.getElementById('studentBlogContent');

            this.submitButton = document.getElementById('studentBlogSubmitBtn');
            this.statusElement = document.getElementById('studentBlogStatus');
        }

        refreshElements() {
            this.cacheElements();
        }

        // ========================================================
        // INITIALIZATION
        // ========================================================

        initializeEventListeners() {
            if (this.searchInput) {
                this.searchInput.addEventListener('input', () => {
                    this.currentSearch =
                        this.searchInput.value.trim().toLowerCase();

                    this.applyFilters();
                });
            }

            if (this.categorySelect) {
                this.categorySelect.addEventListener('change', () => {
                    this.currentCategory = this.categorySelect.value;
                    this.applyFilters();
                });
            }

            if (this.createButton) {
                this.createButton.addEventListener('click', (event) => {
                    event.preventDefault();
                    this.openModal();
                });
            }

            if (this.form) {
                this.form.addEventListener('submit', (event) => {
                    event.preventDefault();
                    this.submitPost();
                });
            }

            document.addEventListener('click', (event) => {
                const closeButton =
                    event.target.closest('[data-blog-close]');

                if (closeButton) {
                    event.preventDefault();
                    this.closeModal();
                    return;
                }

                const readButton =
                    event.target.closest('[data-blog-post-id]');

                if (readButton) {
                    event.preventDefault();
                    this.openPost(readButton.dataset.blogPostId);
                }
            });

            document.addEventListener('keydown', (event) => {
                if (
                    event.key === 'Escape' &&
                    this.modal &&
                    !this.modal.hidden
                ) {
                    this.closeModal();
                }
            });

            document.addEventListener('userDataLoaded', () => {
                this.updateUserData();
            });

            document.addEventListener('appReady', () => {
                this.updateUserData();
            });
        }

        initializeUserData() {
            console.log('👤 Initializing Student Blog user data...');

            this.updateUserData();

            if (!this.userId) {
                const interval = setInterval(() => {
                    if (this.updateUserData()) {
                        clearInterval(interval);
                    }
                }, 1000);

                setTimeout(() => {
                    clearInterval(interval);
                }, 15000);
            }
        }

        updateUserData() {
            if (window.db?.currentUserId) {
                this.userId = window.db.currentUserId;
            }

            if (window.db?.currentUserProfile) {
                this.userProfile = window.db.currentUserProfile;
            }

            return !!this.userId;
        }

        async getCurrentUser() {
            this.updateUserData();

            const supabase = this.getSupabase();

            if (!supabase) {
                throw new Error('Database connection is not available.');
            }

            try {
                const { data, error } =
                    await supabase.auth.getUser();

                if (error) throw error;

                if (data?.user) {
                    this.userId = data.user.id;
                    return data.user;
                }
            } catch (error) {
                console.warn(
                    '⚠️ Could not retrieve authenticated user:',
                    error
                );
            }

            if (this.userId) {
                return {
                    id: this.userId,
                    email: this.userProfile?.email || ''
                };
            }

            return null;
        }

        // ========================================================
        // LOAD POSTS
        // ========================================================

        async loadPosts() {
            console.log('📥 Loading approved Student Blog posts...');

            this.refreshElements();

            if (!this.grid) {
                console.warn('⚠️ Student Blog grid not found.');
                return;
            }

            this.showLoading();

            const supabase = this.getSupabase();

            if (!supabase) {
                this.showError(
                    'Database connection is not available.'
                );
                return;
            }

            try {
                const { data, error } = await supabase
                    .from(this.TABLE_NAME)
                    .select(`
                        id,
                        author_id,
                        author_name,
                        title,
                        slug,
                        category,
                        content,
                        featured_image,
                        status,
                        is_featured,
                        views,
                        created_at,
                        updated_at,
                        published_at
                    `)
                    .eq('status', 'approved')
                    .order('is_featured', {
                        ascending: false
                    })
                    .order('published_at', {
                        ascending: false
                    })
                    .order('created_at', {
                        ascending: false
                    });

                if (error) throw error;

                this.allPosts = Array.isArray(data) ? data : [];

                console.log(
                    `📊 Loaded ${this.allPosts.length} approved blog posts`
                );

                this.applyFilters();

            } catch (error) {
                console.error(
                    '❌ Error loading Student Blog:',
                    error
                );

                this.showError(
                    this.getDatabaseErrorMessage(error)
                );
            }
        }

        // ========================================================
        // FILTERS
        // ========================================================

        applyFilters() {
            const search = this.currentSearch;
            const category = this.currentCategory;

            this.filteredPosts = this.allPosts.filter((post) => {
                const matchesCategory =
                    !category ||
                    String(post.category || '') === category;

                if (!matchesCategory) return false;

                if (!search) return true;

                const searchableText = [
                    post.title,
                    post.category,
                    post.author_name,
                    post.content
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();

                return searchableText.includes(search);
            });

            this.renderPosts();
        }

        // ========================================================
        // RENDER POSTS
        // ========================================================

        renderPosts() {
            if (!this.grid) return;

            if (!this.filteredPosts.length) {
                this.grid.innerHTML = `
                    <div class="student-blog-empty">
                        <i class="fas fa-feather-alt"></i>
                        <h3>No blog posts found</h3>
                        <p>
                            ${
                                this.currentSearch ||
                                this.currentCategory
                                    ? 'Try changing your search or category filter.'
                                    : 'Be the first student to share something with the NCHSM community.'
                            }
                        </p>
                    </div>
                `;
                return;
            }

            this.grid.innerHTML = this.filteredPosts
                .map((post) => this.createPostCard(post))
                .join('');
        }

        createPostCard(post) {
            const id = this.escapeHtml(String(post.id || ''));
            const title =
                this.escapeHtml(post.title || 'Untitled Post');
            const category =
                this.escapeHtml(post.category || 'Other');
            const author =
                this.escapeHtml(
                    post.author_name || 'NCHSM Student'
                );

            const excerpt = this.escapeHtml(
                this.createExcerpt(post.content || '', 180)
            );

            const date = this.escapeHtml(
                this.formatDate(
                    post.published_at || post.created_at
                )
            );

            const image = this.safeImageUrl(
                post.featured_image
            );

            const featuredBadge = post.is_featured
                ? `
                    <span class="student-blog-featured-badge">
                        <i class="fas fa-star"></i> Featured
                    </span>
                `
                : '';

            const imageHtml = image
                ? `
                    <div class="student-blog-card-image">
                        <img
                            src="${image}"
                            alt="${title}"
                            loading="lazy"
                            onerror="this.parentElement.classList.add('image-error'); this.remove();"
                        >
                        ${featuredBadge}
                    </div>
                `
                : `
                    <div class="student-blog-card-image student-blog-card-image-placeholder">
                        <i class="fas fa-feather-alt"></i>
                        ${featuredBadge}
                    </div>
                `;

            return `
                <article
                    class="student-blog-card"
                    data-post-id="${id}"
                >
                    ${imageHtml}

                    <div class="student-blog-card-body">
                        <div class="student-blog-card-meta">
                            <span class="student-blog-category">
                                ${category}
                            </span>
                            <span>${date}</span>
                        </div>

                        <h3>${title}</h3>

                        <p>${excerpt}</p>

                        <div class="student-blog-card-footer">
                            <span class="student-blog-author">
                                <i class="fas fa-user-graduate"></i>
                                ${author}
                            </span>

                            <button
                                type="button"
                                class="student-blog-read-btn"
                                data-blog-post-id="${id}"
                            >
                                Read More
                                <i class="fas fa-arrow-right"></i>
                            </button>
                        </div>
                    </div>
                </article>
            `;
        }

        // ========================================================
        // READ FULL POST
        // ========================================================

        openPost(postId) {
            const post = this.allPosts.find(
                (item) =>
                    String(item.id) === String(postId)
            );

            if (!post) return;

            const title =
                this.escapeHtml(post.title || 'Untitled Post');

            const category =
                this.escapeHtml(post.category || 'Other');

            const author =
                this.escapeHtml(
                    post.author_name || 'NCHSM Student'
                );

            const date = this.escapeHtml(
                this.formatDate(
                    post.published_at || post.created_at
                )
            );

            const content =
                this.formatContent(post.content || '');

            const existing =
                document.getElementById(
                    'studentBlogReaderModal'
                );

            if (existing) existing.remove();

            const modal = document.createElement('div');

            modal.id = 'studentBlogReaderModal';
            modal.className = 'student-blog-modal';

            modal.innerHTML = `
                <div
                    class="student-blog-modal-backdrop"
                    data-blog-reader-close
                ></div>

                <div
                    class="student-blog-modal-card student-blog-reader-card"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="studentBlogReaderTitle"
                >
                    <div class="student-blog-modal-head">
                        <div>
                            <span class="student-blog-kicker">
                                ${category}
                            </span>

                            <h2 id="studentBlogReaderTitle">
                                ${title}
                            </h2>
                        </div>

                        <button
                            type="button"
                            class="student-blog-close"
                            data-blog-reader-close
                            aria-label="Close article"
                        >
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <div class="student-blog-reader-meta">
                        <span>
                            <i class="fas fa-user-graduate"></i>
                            ${author}
                        </span>

                        <span>
                            <i class="far fa-calendar-alt"></i>
                            ${date}
                        </span>
                    </div>

                    ${
                        this.safeImageUrl(post.featured_image)
                            ? `
                                <img
                                    class="student-blog-reader-image"
                                    src="${this.safeImageUrl(post.featured_image)}"
                                    alt="${title}"
                                    onerror="this.style.display='none';"
                                >
                            `
                            : ''
                    }

                    <div class="student-blog-reader-content">
                        ${content}
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
            document.body.classList.add(
                'student-blog-modal-open'
            );

            const closeReader = () => {
                modal.remove();
                document.body.classList.remove(
                    'student-blog-modal-open'
                );
            };

            modal.addEventListener('click', (event) => {
                if (
                    event.target.closest(
                        '[data-blog-reader-close]'
                    )
                ) {
                    closeReader();
                }
            });

            const escapeHandler = (event) => {
                if (event.key === 'Escape') {
                    closeReader();
                    document.removeEventListener(
                        'keydown',
                        escapeHandler
                    );
                }
            };

            document.addEventListener(
                'keydown',
                escapeHandler
            );
        }

        // ========================================================
        // CREATE MODAL
        // ========================================================

        openModal() {
            this.refreshElements();

            if (!this.modal) {
                console.warn(
                    '⚠️ Student Blog modal not found.'
                );
                return;
            }

            this.modal.hidden = false;
            this.modal.removeAttribute('hidden');

            document.body.classList.add(
                'student-blog-modal-open'
            );

            setTimeout(() => {
                if (this.titleInput) {
                    this.titleInput.focus();
                }
            }, 50);
        }

        closeModal() {
            if (!this.modal) return;

            this.modal.hidden = true;
            this.modal.setAttribute('hidden', '');

            document.body.classList.remove(
                'student-blog-modal-open'
            );
        }

        // ========================================================
        // SUBMIT POST
        // ========================================================

        async submitPost() {
            console.log(
                '📤 Submitting Student Blog post...'
            );

            this.refreshElements();

            if (!this.form) return;

            const supabase = this.getSupabase();

            if (!supabase) {
                this.notify(
                    'Database Error',
                    'Database connection is not available.',
                    'error'
                );
                return;
            }

            const user = await this.getCurrentUser();

            if (!user) {
                this.notify(
                    'Login Required',
                    'Please log in before submitting a blog post.',
                    'warning'
                );
                return;
            }

            const title =
                String(this.titleInput?.value || '').trim();

            const category =
                String(this.categoryInput?.value || '').trim();

            const content =
                String(this.contentInput?.value || '').trim();

            const featuredImage =
                String(this.imageInput?.value || '').trim();

            if (!title || !category || !content) {
                this.notify(
                    'Incomplete Post',
                    'Please provide a title, category and content.',
                    'warning'
                );
                return;
            }

            if (title.length < 5) {
                this.notify(
                    'Title Too Short',
                    'Please use a clearer blog title.',
                    'warning'
                );
                return;
            }

            if (content.length < 30) {
                this.notify(
                    'Content Too Short',
                    'Please provide more content before submitting your post.',
                    'warning'
                );
                return;
            }

            if (featuredImage) {
                try {
                    const imageUrl =
                        new URL(featuredImage);

                    if (
                        imageUrl.protocol !== 'http:' &&
                        imageUrl.protocol !== 'https:'
                    ) {
                        throw new Error();
                    }
                } catch {
                    this.notify(
                        'Invalid Image URL',
                        'Please provide a valid HTTPS or HTTP image URL.',
                        'warning'
                    );
                    return;
                }
            }

            this.setSubmitState(true);

            try {
                const authorName =
                    this.getAuthorName(user);

                const slug =
                    await this.createUniqueSlug(title);

                const now =
                    new Date().toISOString();

                const postData = {
                    author_id: user.id,
                    author_name: authorName,
                    title: title,
                    slug: slug,
                    category: category,
                    content: content,
                    featured_image:
                        featuredImage || null,
                    status: 'pending',
                    is_featured: false,
                    views: 0,
                    created_at: now,
                    updated_at: now
                };

                const { data, error } =
                    await supabase
                        .from(this.TABLE_NAME)
                        .insert([postData])
                        .select()
                        .single();

                if (error) throw error;

                console.log(
                    '✅ Student Blog post submitted:',
                    data
                );

                this.form.reset();
                this.closeModal();

                this.notify(
                    'Post Submitted',
                    'Your post has been submitted successfully and is waiting for review.',
                    'success'
                );

                // Pending posts are intentionally not shown
                // in the public student feed.
                await this.loadPosts();

            } catch (error) {
                console.error(
                    '❌ Error submitting Student Blog post:',
                    error
                );

                this.notify(
                    'Submission Failed',
                    this.getDatabaseErrorMessage(error),
                    'error'
                );
            } finally {
                this.setSubmitState(false);
            }
        }

        // ========================================================
        // UNIQUE SLUG
        // ========================================================

        async createUniqueSlug(title) {
            const supabase = this.getSupabase();

            let baseSlug =
                String(title)
                    .toLowerCase()
                    .trim()
                    .replace(/[^a-z0-9\s-]/g, '')
                    .replace(/\s+/g, '-')
                    .replace(/-+/g, '-')
                    .replace(/^-|-$/g, '')
                    .substring(0, 100);

            if (!baseSlug) {
                baseSlug = 'student-post';
            }

            if (!supabase) {
                return `${baseSlug}-${Date.now()}`;
            }

            try {
                const { data, error } =
                    await supabase
                        .from(this.TABLE_NAME)
                        .select('slug')
                        .ilike(
                            'slug',
                            `${baseSlug}%`
                        )
                        .limit(100);

                if (error) {
                    console.warn(
                        '⚠️ Could not check slug uniqueness:',
                        error
                    );

                    return `${baseSlug}-${Date.now()}`;
                }

                const existingSlugs =
                    new Set(
                        (data || []).map(
                            (row) =>
                                String(row.slug || '')
                        )
                    );

                if (!existingSlugs.has(baseSlug)) {
                    return baseSlug;
                }

                let counter = 2;

                while (
                    existingSlugs.has(
                        `${baseSlug}-${counter}`
                    )
                ) {
                    counter++;
                }

                return `${baseSlug}-${counter}`;

            } catch (error) {
                return `${baseSlug}-${Date.now()}`;
            }
        }

        // ========================================================
        // UI STATES
        // ========================================================

        showLoading() {
            if (!this.grid) return;

            this.grid.innerHTML = `
                <div class="student-blog-empty">
                    <i class="fas fa-spinner fa-spin"></i>
                    <h3>Loading posts...</h3>
                    <p>Connecting to the NCHSM blog.</p>
                </div>
            `;
        }

        showError(message) {
            if (!this.grid) return;

            this.grid.innerHTML = `
                <div class="student-blog-empty student-blog-error">
                    <i class="fas fa-exclamation-triangle"></i>

                    <h3>Unable to load the blog</h3>

                    <p>${this.escapeHtml(message)}</p>

                    <button
                        type="button"
                        class="student-blog-primary"
                        id="studentBlogRetryBtn"
                    >
                        <i class="fas fa-sync-alt"></i>
                        Try Again
                    </button>
                </div>
            `;

            const retryButton =
                document.getElementById(
                    'studentBlogRetryBtn'
                );

            if (retryButton) {
                retryButton.addEventListener(
                    'click',
                    () => this.loadPosts()
                );
            }
        }

        setSubmitState(submitting) {
            if (!this.submitButton) return;

            this.submitButton.disabled =
                submitting;

            if (submitting) {
                this.submitButton.innerHTML = `
                    <i class="fas fa-spinner fa-spin"></i>
                    Submitting...
                `;
            } else {
                this.submitButton.innerHTML = `
                    <i class="fas fa-paper-plane"></i>
                    Submit for Review
                `;
            }
        }

        notify(title, message, icon = 'info') {
            if (window.Swal?.fire) {
                window.Swal.fire({
                    title: title,
                    text: message,
                    icon: icon,
                    confirmButtonText: 'OK'
                });

                return;
            }

            window.alert(
                `${title}\n\n${message}`
            );
        }

        // ========================================================
        // HELPERS
        // ========================================================

        createExcerpt(content, maxLength = 180) {
            const plainText =
                String(content)
                    .replace(/<[^>]*>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();

            if (plainText.length <= maxLength) {
                return plainText;
            }

            return (
                plainText
                    .substring(0, maxLength)
                    .trim() + '...'
            );
        }

        formatContent(content) {
            const safe =
                this.escapeHtml(
                    String(content || '')
                );

            return safe
                .split(/\n{2,}/)
                .map(
                    (paragraph) =>
                        `<p>${paragraph.replace(
                            /\n/g,
                            '<br>'
                        )}</p>`
                )
                .join('');
        }

        formatDate(date) {
            if (!date) {
                return 'Date unavailable';
            }

            const parsed = new Date(date);

            if (Number.isNaN(parsed.getTime())) {
                return 'Date unavailable';
            }

            return parsed.toLocaleDateString(
                'en-KE',
                {
                    timeZone: 'Africa/Nairobi',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                }
            );
        }

        safeImageUrl(value) {
            const url =
                String(value || '').trim();

            if (!url) return '';

            try {
                const parsed =
                    new URL(url);

                if (
                    parsed.protocol !== 'http:' &&
                    parsed.protocol !== 'https:'
                ) {
                    return '';
                }

                return this.escapeHtml(
                    parsed.href
                );

            } catch {
                return '';
            }
        }

        getAuthorName(user) {
            const profile =
                this.userProfile || {};

            const metadata =
                user?.user_metadata || {};

            return (
                profile.full_name ||
                profile.fullName ||
                profile.name ||
                metadata.full_name ||
                metadata.fullName ||
                metadata.name ||
                user?.email?.split('@')[0] ||
                'NCHSM Student'
            );
        }

        getDatabaseErrorMessage(error) {
            const rawMessage =
                String(
                    error?.message ||
                    error?.details ||
                    error?.hint ||
                    'An unexpected database error occurred.'
                );

            const lower =
                rawMessage.toLowerCase();

            if (
                lower.includes(
                    'student_blog_posts'
                ) &&
                (
                    lower.includes(
                        'does not exist'
                    ) ||
                    lower.includes(
                        'relation'
                    )
                )
            ) {
                return (
                    'The student_blog_posts table has not been created in Supabase yet.'
                );
            }

            if (
                lower.includes(
                    'row-level security'
                ) ||
                lower.includes('rls') ||
                lower.includes('policy')
            ) {
                return (
                    'Student Blog database permissions are not configured correctly. Check the Supabase RLS policies.'
                );
            }

            return rawMessage;
        }

        escapeHtml(value) {
            return String(value ?? '')
                .replace(/&/g, '&amp;')
                .replace(
                    /</g,
                    '&lt;'
                )
                .replace(
                    />/g,
                    '&gt;'
                )
                .replace(
                    /"/g,
                    '&quot;'
                )
                .replace(
                    /'/g,
                    '&#039;'
                );
        }

        // ========================================================
        // PUBLIC MODULE API
        // ========================================================

        refresh() {
            return this.loadPosts();
        }

        getPosts() {
            return [
                ...this.allPosts
            ];
        }
    }

    // ============================================================
    // MODULE INITIALIZATION
    // ============================================================

    function initializeStudentBlog() {
        if (
            window.studentBlogModule
            instanceof StudentBlogModule
        ) {
            console.log(
                'ℹ️ Student Blog module already initialized.'
            );

            return window.studentBlogModule;
        }

        window.studentBlogModule =
            new StudentBlogModule();

        return window.studentBlogModule;
    }

    if (
        document.readyState === 'loading'
    ) {
        document.addEventListener(
            'DOMContentLoaded',
            initializeStudentBlog
        );
    } else {
        initializeStudentBlog();
    }

})();
