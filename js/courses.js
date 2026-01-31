// courses.js - FIXED VERSION
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
            
            // Set up login event listeners
            this.setupLoginListeners();
            
            // Try to load if user is already logged in
            setTimeout(() => this.tryLoadIfLoggedIn(), 1500);
        }
        
        setupLoginListeners() {
            console.log('👂 Setting up login event listeners...');
            
            // Listen for user login events
            document.addEventListener('userLoggedIn', (e) => {
                console.log('🎉 USER LOGGED IN EVENT RECEIVED!');
                this.userProfile = e.detail?.userProfile;
                this.loadCourses();
            });
            
            // Listen for profile updates
            document.addEventListener('userProfileUpdated', (e) => {
                console.log('🔄 User profile updated event received');
                if (e.detail?.userProfile) {
                    this.userProfile = e.detail.userProfile;
                    if (!this.loaded) {
                        this.loadCourses();
                    }
                }
            });
            
            // Listen for app ready events
            document.addEventListener('appReady', () => {
                console.log('🚀 App ready event received');
                this.tryLoadIfLoggedIn();
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
                this.showWaitingForLogin();
            }
        }
        
        getUserProfileFromAnySource() {
            // Check all possible sources in order
            const sources = [
                () => window.db?.currentUserProfile,
                () => window.currentUserProfile,
                () => window.databaseModule?.currentUserProfile
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
            
            console.log('Active grid found:', !!this.activeGrid);
            console.log('Completed table found:', !!this.completedTable);
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
                
                // Get Supabase client - FIXED: Use window.db.supabase
                const supabase = window.db?.supabase;
                
                if (!supabase) {
                    throw new Error('Database connection not available. supabase is:', typeof supabase);
                }
                
                // Build query
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
                
                // Trigger dashboard update
                this.triggerDashboardUpdate();
                
                // Mark as loaded
                this.loaded = true;
                
                // Dispatch module ready event for dashboard
                this.dispatchModuleReadyEvent();
                
                console.log('✅ Courses loaded successfully');
                
            } catch (error) {
                console.error('❌ Error loading courses:', error);
                this.showError(error.message);
            }
        }
        
        dispatchModuleReadyEvent() {
            const event = new CustomEvent('coursesModuleReady', {
                detail: {
                    courses: this.allCourses,
                    activeCount: this.activeCourses.length,
                    completedCount: this.completedCourses.length,
                    timestamp: new Date().toISOString()
                }
            });
            document.dispatchEvent(event);
            console.log('📢 Dispatched coursesModuleReady event for dashboard');
        }
        
        processCoursesData(courses) {
            this.allCourses = courses.map(course => {
                const isCompleted = course.status === 'Completed' || course.status === 'Passed';
                
                return {
                    ...course,
                    isCompleted,
                    formattedCreatedAt: course.created_at ? 
                        new Date(course.created_at).toLocaleDateString('en-US', { 
                            year: 'numeric', month: 'short', day: 'numeric' 
                        }) : '--'
                };
            });
            
            console.log(`✅ Processed ${this.allCourses.length} courses`);
        }
        
        applyFilter(filterType) {
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
        
        displayTables() {
            this.displayActiveCourses();
            this.displayCompletedCourses();
            this.updateCounts();
            this.updateEmptyStates();
        }
        
        displayActiveCourses() {
            if (!this.activeGrid) return;
            
            if (this.activeCourses.length === 0) {
                this.activeGrid.innerHTML = '';
                return;
            }
            
            const html = this.activeCourses.map(course => `
                <div class="course-card">
                    <div class="course-header">
                        <span class="course-code">${this.escapeHtml(course.unit_code || 'N/A')}</span>
                        <span class="status-badge ${course.isCompleted ? 'completed' : 'active'}">
                            ${course.status || 'Active'}
                        </span>
                    </div>
                    <h4 class="course-title">${this.escapeHtml(course.course_name || 'Unnamed Course')}</h4>
                    <div class="course-footer">
                        <div class="course-meta">
                            <span class="course-block">${this.escapeHtml(course.block || 'General')}</span>
                        </div>
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
                    <td><strong>${this.escapeHtml(course.course_name || 'Unnamed Course')}</strong></td>
                    <td><code>${this.escapeHtml(course.unit_code || 'N/A')}</code></td>
                    <td class="text-center">${course.credits || 3}</td>
                    <td class="text-center">${this.escapeHtml(course.block || 'General')}</td>
                    <td>${course.formattedCreatedAt}</td>
                    <td class="text-center">
                        <span class="status-badge completed">Completed</span>
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
        }
        
        updateEmptyStates() {
            if (this.activeEmpty) {
                this.activeEmpty.style.display = this.activeCourses.length === 0 ? 'block' : 'none';
            }
            
            if (this.completedEmpty) {
                this.completedEmpty.style.display = this.completedCourses.length === 0 ? 'block' : 'none';
            }
        }
        
        showLoading() {
            const loadingHTML = `
                <div style="text-align: center; padding: 40px;">
                    <div class="loading-spinner"></div>
                    <p>Loading your courses...</p>
                </div>
            `;
            
            if (this.activeGrid) this.activeGrid.innerHTML = loadingHTML;
            if (this.completedTable) {
                this.completedTable.innerHTML = `
                    <tr><td colspan="6">${loadingHTML}</td></tr>
                `;
            }
        }
        
        showError(message) {
            const errorHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${message}</p>
                    <button onclick="window.coursesModule.loadCourses()" class="btn btn-sm">
                        Retry
                    </button>
                </div>
            `;
            
            if (this.activeGrid) this.activeGrid.innerHTML = errorHTML;
            if (this.completedTable) {
                this.completedTable.innerHTML = `
                    <tr><td colspan="6">${errorHTML}</td></tr>
                `;
            }
        }
        
        isTVETProgram(program) {
            if (!program) return false;
            const tvetPrograms = ['TVET', 'TVET NURSING', 'TVET NURSING(A)', 'TVET NURSING(B)', 
                                'CRAFT CERTIFICATE', 'ARTISAN', 'DIPLOMA IN TVET'];
            return tvetPrograms.some(tvet => program.toUpperCase().includes(tvet));
        }
        
        triggerDashboardUpdate() {
            console.log('📊 Sending courses data to dashboard...');
            
            const event = new CustomEvent('coursesUpdated', {
                detail: {
                    courses: this.allCourses,
                    activeCount: this.activeCourses.length,
                    completedCount: this.completedCourses.length,
                    timestamp: new Date().toISOString()
                }
            });
            document.dispatchEvent(event);
            
            window.coursesData = {
                allCourses: this.allCourses,
                activeCount: this.activeCourses.length,
                loaded: this.loaded
            };
        }
        
        getActiveCourseCount() {
            return this.activeCourses.length;
        }
        
        getAllCourses() {
            return this.allCourses;
        }
        
        refresh() {
            this.loadCourses();
        }
        
        escapeHtml(str) {
            if (!str) return '';
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }
        
        showWaitingForLogin() {
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
                    </div>
                `;
            }
        }
    }
    
    // Create global instance
    window.coursesModule = new CoursesModule();
    
    // Global functions for dashboard access
    window.getActiveCourseCount = () => {
        return window.coursesModule?.getActiveCourseCount() || 0;
    };
    
    window.getAllCourses = () => {
        return window.coursesModule?.getAllCourses() || [];
    };
    
    window.loadCourses = () => {
        if (window.coursesModule) {
            window.coursesModule.refresh();
        }
    };
    
    console.log('✅ Courses module ready - Listening for login events!');
})();
