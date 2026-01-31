// courses.js - FIXED VERSION - WAITS FOR LOGIN EVENTS
(function() {
    'use strict';
    
    console.log('✅ courses.js - Loading with login event listening...');
    
    class CoursesModule {
        constructor() {
            console.log('📚 CoursesModule initialized - WAITING for login events');
            
            // Store course data
            this.allCourses = [];
            this.activeCourses = [];
            this.completedCourses = [];
            this.currentFilter = 'all';
            this.userProfile = null;
            this.loaded = false;
            
            // Cache DOM elements
            this.cacheElements();
            
            // Initialize event listeners
            this.initializeEventListeners();
            this.updateFilterButtons();
            
            // ✅ CRITICAL FIX: Set up login event listeners
            this.setupEventListeners();
            
            // Try to load if user is already logged in
            setTimeout(() => this.tryLoadIfLoggedIn(), 1500);
        }
        
        setupEventListeners() {
            console.log('👂 Setting up login event listeners...');
            
            // 1. Listen for user login events
            document.addEventListener('userLoggedIn', (e) => {
                console.log('🎉 USER LOGGED IN EVENT RECEIVED!');
                console.log('User profile:', e.detail?.userProfile);
                this.userProfile = e.detail?.userProfile;
                this.loadCourses();
            });
            
            // 2. Listen for profile updates
            document.addEventListener('userProfileUpdated', (e) => {
                console.log('🔄 User profile updated event received');
                if (e.detail?.userProfile) {
                    this.userProfile = e.detail.userProfile;
                    if (!this.loaded) {
                        this.loadCourses();
                    }
                }
            });
            
            // 3. Listen for app ready events
            document.addEventListener('appReady', (e) => {
                console.log('🚀 App ready event received');
                if (e.detail?.userProfile && !this.userProfile) {
                    this.userProfile = e.detail.userProfile;
                    this.loadCourses();
                }
            });
            
            // 4. Listen for tab change to courses
            document.addEventListener('tabChanged', (e) => {
                if (e.detail?.tabId === 'courses' && !this.loaded && this.userProfile) {
                    console.log('📱 Switched to courses tab, loading...');
                    this.loadCourses();
                }
            });
        }
        
        tryLoadIfLoggedIn() {
            console.log('🔍 Checking if user is already logged in...');
            
            // Check all possible sources for user profile
            const profile = this.getUserProfileFromAnySource();
            
            if (profile) {
                console.log('✅ User already logged in:', profile.full_name || profile.email);
                this.userProfile = profile;
                this.loadCourses();
            } else {
                console.log('⏳ No user profile found yet, waiting for login...');
                // Show waiting message
                this.showWaitingForLogin();
            }
        }
        
        getUserProfileFromAnySource() {
            // Check all possible sources in order
            const sources = [
                () => window.databaseModule?.currentUserProfile,
                () => window.currentUserProfile,
                () => window.db?.currentUserProfile,
                () => {
                    try {
                        const stored = localStorage.getItem('currentUserProfile');
                        return stored ? JSON.parse(stored) : null;
                    } catch (e) {
                        return null;
                    }
                },
                () => {
                    try {
                        const stored = sessionStorage.getItem('currentUserProfile');
                        return stored ? JSON.parse(stored) : null;
                    } catch (e) {
                        return null;
                    }
                },
                () => window.profileModule?.userProfile
            ];
            
            for (const source of sources) {
                try {
                    const profile = source();
                    if (profile && (profile.full_name || profile.email || profile.id || profile.user_id)) {
                        console.log('📋 Found profile in source');
                        return profile;
                    }
                } catch (e) {
                    // Continue
                }
            }
            
            return null;
        }
        
        showWaitingForLogin() {
            // Show waiting message in courses container
            const coursesContainer = document.getElementById('courses-container');
            if (coursesContainer && !this.loaded) {
                coursesContainer.innerHTML = `
                    <div style="text-align: center; padding: 60px 20px;">
                        <div class="waiting-icon" style="font-size: 48px; color: #667eea; margin-bottom: 20px;">
                            <i class="fas fa-user-clock"></i>
                        </div>
                        <h3 style="margin-bottom: 10px;">Waiting for Login</h3>
                        <p style="color: #6b7280; margin-bottom: 30px;">
                            Please log in to view your courses
                        </p>
                        <div class="loading-dots">
                            <span></span><span></span><span></span>
                        </div>
                    </div>
                `;
            }
        }
        
        cacheElements() {
            console.log('🔍 Caching DOM elements...');
            
            // Grid and table containers
            this.activeGrid = document.getElementById('active-courses-grid');
            this.completedTable = document.getElementById('completed-courses-table');
            
            // Empty states
            this.activeEmpty = document.getElementById('active-empty');
            this.completedEmpty = document.getElementById('completed-empty');
            
            // Count elements
            this.activeCount = document.getElementById('active-count');
            this.completedCount = document.getElementById('completed-count');
            this.completedCredits = document.getElementById('completed-credits-total');
            
            // Header stats
            this.activeHeaderCount = document.getElementById('active-courses-count');
            this.completedHeaderCount = document.getElementById('completed-courses-count');
            this.totalCreditsHeader = document.getElementById('total-credits');
            
            // Summary elements
            this.completedGPA = document.getElementById('completed-gpa');
            this.highestGrade = document.getElementById('highest-grade');
            this.averageGrade = document.getElementById('average-grade');
            this.firstCourseDate = document.getElementById('first-course-date');
            this.latestCourseDate = document.getElementById('latest-course-date');
            this.completionRate = document.getElementById('completion-rate');
        }
        
        initializeEventListeners() {
            console.log('🔌 Setting up event listeners...');
            
            // Filter buttons
            const filterButtons = [
                { id: 'view-all-courses', filter: 'all' },
                { id: 'view-active-only', filter: 'active' },
                { id: 'view-completed-only', filter: 'completed' }
            ];
            
            filterButtons.forEach(({ id, filter }) => {
                const button = document.getElementById(id);
                if (button) {
                    button.addEventListener('click', (e) => {
                        e.preventDefault();
                        if (!this.userProfile) {
                            this.showError('Please log in first');
                            return;
                        }
                        this.applyFilter(filter);
                    });
                }
            });
            
            // Refresh button
            const refreshBtn = document.getElementById('refresh-courses-btn');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (!this.userProfile) {
                        this.showError('Please log in first');
                        return;
                    }
                    this.loadCourses();
                });
            }
            
            // Listen for dashboard events
            document.addEventListener('refreshCourses', () => {
                if (this.userProfile) {
                    this.loadCourses();
                }
            });
        }
        
        async loadCourses() {
            console.log('📥 Loading courses...');
            
            if (!this.userProfile) {
                console.error('❌ Cannot load courses: No user profile');
                this.showError('Please log in to view courses');
                return;
            }
            
            // Show loading state
            this.showLoading();
            
            try {
                const userProfile = this.userProfile;
                const program = userProfile.program || 'KRCHN';
                const intakeYear = userProfile.intake_year || 2025;
                const block = userProfile.block || 'A';
                const term = userProfile.term || 'Term 1';
                
                console.log('🎯 Loading courses for:', { 
                    program, 
                    intakeYear, 
                    name: userProfile.full_name 
                });
                
                // Get Supabase client
                const supabase = window.databaseModule?.supabase || 
                               window.db?.supabase || 
                               window.supabase;
                
                if (!supabase) {
                    throw new Error('Database connection not available');
                }
                
                // Build query based on program type
                let query = supabase
                    .from('courses')
                    .select('*')
                    .eq('intake_year', intakeYear)
                    .order('course_name', { ascending: true });
                
                const isTVET = this.isTVETProgram(program);
                
                if (isTVET) {
                    query = query
                        .eq('target_program', program)
                        .or(`block.eq.${term},block.eq.General,block.is.null`);
                } else {
                    query = query
                        .or(`target_program.eq.${program},target_program.eq.General`)
                        .or(`block.eq.${block},block.is.null,block.eq.General`);
                }
                
                // Fetch courses
                const { data: courses, error } = await query;
                
                if (error) throw error;
                
                console.log(`📊 Found ${courses?.length || 0} courses`);
                
                // Process course data
                this.processCoursesData(courses || []);
                
                // Apply current filter and display
                this.applyDataFilter();
                
                // Update dashboard
                this.triggerDashboardUpdate();
                
                // Mark as loaded
                this.loaded = true;
                
                // Show success
                if (window.AppUtils?.showToast) {
                    window.AppUtils.showToast('Courses loaded successfully', 'success');
                }
                
            } catch (error) {
                console.error('❌ Error loading courses:', error);
                this.showError(error.message);
            }
        }
        
        applyFilter(filterType) {
            if (!this.userProfile) {
                this.showError('Please log in first');
                return;
            }
            
            this.currentFilter = filterType;
            this.updateFilterButtons();
            this.showFilteredSections();
            this.applyDataFilter();
        }
        
        updateFilterButtons() {
            const buttons = {
                'all': document.getElementById('view-all-courses'),
                'active': document.getElementById('view-active-only'),
                'completed': document.getElementById('view-completed-only')
            };
            
            Object.values(buttons).forEach(button => {
                if (button) button.classList.remove('active');
            });
            
            const currentButton = buttons[this.currentFilter];
            if (currentButton) {
                currentButton.classList.add('active');
            }
        }
        
        showFilteredSections() {
            const activeSection = document.querySelector('.courses-section:not(.completed-section)');
            const completedSection = document.querySelector('.completed-section');
            
            if (!activeSection || !completedSection) return;
            
            switch(this.currentFilter) {
                case 'active':
                    activeSection.style.display = 'block';
                    completedSection.style.display = 'none';
                    break;
                case 'completed':
                    activeSection.style.display = 'none';
                    completedSection.style.display = 'block';
                    break;
                default:
                    activeSection.style.display = 'block';
                    completedSection.style.display = 'block';
            }
        }
        
        applyDataFilter() {
            this.activeCourses = this.allCourses.filter(course => 
                !course.isCompleted && course.status !== 'Completed'
            );
            this.completedCourses = this.allCourses.filter(course => 
                course.isCompleted || course.status === 'Completed'
            );
            
            if (this.currentFilter === 'active') {
                this.completedCourses = [];
            } else if (this.currentFilter === 'completed') {
                this.activeCourses = [];
            }
            
            this.displayTables();
        }
        
        processCoursesData(courses) {
            this.allCourses = courses.map(course => {
                const isCompleted = course.status === 'Completed' || course.status === 'Passed';
                const createdAt = course.created_at ? new Date(course.created_at) : null;
                const completedDate = course.completed_date ? new Date(course.completed_date) : null;
                
                return {
                    ...course,
                    isCompleted,
                    createdAt,
                    completedDate,
                    formattedCreatedAt: createdAt ? createdAt.toLocaleDateString('en-US', { 
                        year: 'numeric', month: 'short', day: 'numeric' 
                    }) : '--',
                    formattedCompletedDate: completedDate ? completedDate.toLocaleDateString('en-US', { 
                        year: 'numeric', month: 'short', day: 'numeric' 
                    }) : '--'
                };
            });
            
            console.log(`✅ Processed ${this.allCourses.length} courses`);
        }
        
        displayTables() {
            this.displayActiveCourses();
            this.displayCompletedCourses();
            this.updateCounts();
            this.updateEmptyStates();
            this.updateSummary();
        }
        
        displayActiveCourses() {
            if (!this.activeGrid) return;
            
            if (this.activeCourses.length === 0) {
                this.activeGrid.innerHTML = '';
                return;
            }
            
            const html = this.activeCourses.map(course => `
                <div class="course-card" data-course-id="${course.id}">
                    <div class="course-header">
                        <span class="course-code">${this.escapeHtml(course.unit_code || 'N/A')}</span>
                        <span class="status-badge ${course.isCompleted ? 'completed' : 'active'}">
                            ${this.escapeHtml(course.status || 'Active')}
                        </span>
                    </div>
                    <h4 class="course-title">${this.escapeHtml(course.course_name || 'Unnamed Course')}</h4>
                    <p class="course-description">${this.escapeHtml(this.truncateText(course.description || 'No description', 120))}</p>
                    <div class="course-footer">
                        <div class="course-credits">
                            <i class="fas fa-star"></i>
                            <span>${course.credits || 3} Credits</span>
                        </div>
                        <div class="course-meta">
                            <span class="course-block">${this.escapeHtml(course.block || 'General')}</span>
                        </div>
                    </div>
                    <div class="course-actions">
                        <button class="btn btn-sm btn-outline view-materials" onclick="window.coursesModule.viewCourseMaterials('${course.id}')">
                            <i class="fas fa-file-alt"></i> Materials
                        </button>
                        <button class="btn btn-sm btn-primary view-schedule" onclick="window.coursesModule.viewCourseSchedule('${course.id}')">
                            <i class="fas fa-calendar"></i> Schedule
                        </button>
                    </div>
                </div>
            `).join('');
            
            this.activeGrid.innerHTML = html;
        }
        
        displayCompletedCourses() {
            if (!this.completedTable) return;
            
            if (this.completedCourses.length === 0) {
                this.completedTable.innerHTML = '';
                return;
            }
            
            const html = this.completedCourses.map(course => `
                <tr>
                    <td>
                        <strong>${this.escapeHtml(course.course_name || 'Unnamed Course')}</strong>
                        ${course.description ? `<br><small class="text-muted">${this.escapeHtml(this.truncateText(course.description, 80))}</small>` : ''}
                    </td>
                    <td><code>${this.escapeHtml(course.unit_code || 'N/A')}</code></td>
                    <td class="text-center">${course.credits || 3}</td>
                    <td class="text-center">${this.escapeHtml(course.block || 'General')}</td>
                    <td>${course.formattedCompletedDate}</td>
                    <td class="text-center">
                        <span class="status-badge completed">
                            <i class="fas fa-check-circle"></i> ${this.escapeHtml(course.status || 'Completed')}
                        </span>
                    </td>
                </tr>
            `).join('');
            
            this.completedTable.innerHTML = html;
        }
        
        updateCounts() {
            if (this.activeCount) {
                this.activeCount.textContent = `${this.activeCourses.length} course${this.activeCourses.length !== 1 ? 's' : ''}`;
            }
            
            if (this.completedCount) {
                this.completedCount.textContent = `${this.completedCourses.length} course${this.completedCourses.length !== 1 ? 's' : ''}`;
            }
            
            if (this.activeHeaderCount) {
                this.activeHeaderCount.textContent = this.activeCourses.length;
            }
            
            if (this.completedHeaderCount) {
                this.completedHeaderCount.textContent = this.completedCourses.length;
            }
            
            const totalCredits = this.allCourses.reduce((sum, course) => sum + (course.credits || 0), 0);
            const completedCredits = this.completedCourses.reduce((sum, course) => sum + (course.credits || 0), 0);
            
            if (this.totalCreditsHeader) {
                this.totalCreditsHeader.textContent = totalCredits;
            }
            
            if (this.completedCredits) {
                this.completedCredits.textContent = `${completedCredits} credit${completedCredits !== 1 ? 's' : ''} earned`;
            }
        }
        
        updateEmptyStates() {
            if (this.activeEmpty) {
                this.activeEmpty.style.display = this.activeCourses.length === 0 ? 'block' : 'none';
            }
            
            if (this.completedEmpty) {
                this.completedEmpty.style.display = this.completedCourses.length === 0 ? 'block' : 'none';
            }
        }
        
        updateSummary() {
            if (this.completedCourses.length === 0) {
                if (this.completedGPA) this.completedGPA.textContent = '--';
                if (this.highestGrade) this.highestGrade.textContent = '--';
                if (this.averageGrade) this.averageGrade.textContent = '--';
                if (this.firstCourseDate) this.firstCourseDate.textContent = '--';
                if (this.latestCourseDate) this.latestCourseDate.textContent = '--';
                if (this.completionRate) this.completionRate.textContent = '0%';
                return;
            }
            
            const dates = this.completedCourses
                .filter(c => c.completedDate || c.createdAt)
                .map(c => c.completedDate || c.createdAt)
                .sort((a, b) => a - b);
            
            if (dates.length > 0) {
                const firstDate = dates[0];
                const latestDate = dates[dates.length - 1];
                
                if (this.firstCourseDate) {
                    this.firstCourseDate.textContent = firstDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                }
                
                if (this.latestCourseDate) {
                    this.latestCourseDate.textContent = latestDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                }
            }
            
            if (this.completionRate) {
                const totalExpectedCourses = this.allCourses.length || 1;
                const completionRate = Math.round((this.completedCourses.length / totalExpectedCourses) * 100);
                this.completionRate.textContent = `${completionRate}%`;
            }
        }
        
        showLoading() {
            if (this.activeGrid) {
                this.activeGrid.innerHTML = `
                    <div class="course-card loading">
                        <div class="loading-content">
                            <div class="loading-spinner"></div>
                            <p>Loading courses...</p>
                        </div>
                    </div>
                `;
            }
            
            if (this.completedTable) {
                this.completedTable.innerHTML = `
                    <tr class="loading">
                        <td colspan="6">
                            <div class="loading-content">
                                <div class="loading-spinner"></div>
                                <p>Loading courses...</p>
                            </div>
                        </td>
                    </tr>
                `;
            }
        }
        
        showError(message) {
            if (this.activeGrid) {
                this.activeGrid.innerHTML = `
                    <div class="course-card error">
                        <div class="error-content">
                            <i class="fas fa-exclamation-circle"></i>
                            <p>${message}</p>
                            <button onclick="window.coursesModule.loadCourses()" class="btn btn-sm btn-primary">
                                <i class="fas fa-redo"></i> Retry
                            </button>
                        </div>
                    </div>
                `;
            }
        }
        
        isTVETProgram(program) {
            const tvetPrograms = ['TVET', 'TVET NURSING', 'TVET NURSING(A)', 'TVET NURSING(B)', 
                                'CRAFT CERTIFICATE', 'ARTISAN', 'DIPLOMA IN TVET'];
            return tvetPrograms.some(tvet => program?.toUpperCase().includes(tvet));
        }
        
        triggerDashboardUpdate() {
            const event = new CustomEvent('coursesUpdated', {
                detail: {
                    courses: this.allCourses,
                    activeCount: this.activeCourses.length,
                    completedCount: this.completedCourses.length,
                    timestamp: new Date().toISOString()
                }
            });
            document.dispatchEvent(event);
        }
        
        truncateText(text, maxLength) {
            if (!text) return '';
            if (text.length <= maxLength) return text;
            return text.substring(0, maxLength) + '...';
        }
        
        escapeHtml(str) {
            if (!str) return '';
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }
        
        // Public methods
        refresh() {
            if (this.userProfile) {
                this.loadCourses();
            } else {
                this.showError('Please log in first');
            }
        }
    }
    
    // Create global instance
    window.coursesModule = new CoursesModule();
    
    // Global functions
    window.loadCourses = () => {
        if (window.coursesModule) {
            window.coursesModule.refresh();
        }
    };
    
    console.log('✅ Courses module ready - Listening for login events!');
})();
