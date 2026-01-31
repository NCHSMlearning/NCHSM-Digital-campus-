// courses.js - UPDATED WITH STRICT TVET FILTERING
(function() {
    'use strict';
    
    console.log('✅ courses.js - Loading with TVET program support...');
    
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
            
            // User data with TVET detection
            this.program = 'KRCHN';
            this.intakeYear = 2025;
            this.block = 'A';
            this.term = 'Term 1';
            this.isTVETStudent = false; // 🔥 NEW: Track TVET status
            
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
                this.updateUserData();
                this.loadCourses();
            });
            
            // Listen for profile updates
            document.addEventListener('userProfileUpdated', (e) => {
                console.log('🔄 User profile updated event received');
                if (e.detail?.userProfile) {
                    this.userProfile = e.detail.userProfile;
                    this.updateUserData();
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
                this.updateUserData();
                this.loadCourses();
            } else {
                console.log('⏳ No user profile found yet, waiting for login...');
                this.showWaitingForLogin();
            }
        }
        
        updateUserData() {
            if (this.userProfile) {
                this.program = this.userProfile.program || 'KRCHN';
                this.intakeYear = this.userProfile.intake_year || 2025;
                this.block = this.userProfile.block || 'A';
                this.term = this.userProfile.term || 'Term 1';
                
                // 🔥 DETERMINE IF STUDENT IS IN TVET PROGRAM
                this.isTVETStudent = this.checkIfTVETStudent(this.program);
                
                console.log('🎯 Updated user data for courses:', {
                    program: this.program,
                    isTVET: this.isTVETStudent,
                    intakeYear: this.intakeYear,
                    block: this.block,
                    term: this.term
                });
                
                return true;
            }
            return false;
        }
        
        // 🔥 NEW: Check if student is in TVET program (same logic as exams.js)
        checkIfTVETStudent(program) {
            if (!program) return false;
            
            const programUpper = program.toUpperCase().trim();
            
            // TVET program identifiers (case-insensitive)
            const tvetIdentifiers = [
                'TVET',
                'TIVET', // Old typo
                'TECHNICAL',
                'VOCATIONAL',
                'CRAFT',
                'ARTISAN',
                'DIPLOMA',
                'CERTIFICATE',
                'SKILLS',
                'TRADE'
            ];
            
            // Course-specific TVET indicators
            const tvetCourseIndicators = [
                'BASIC NURSING SKILLS',
                'NURSING SKILLS',
                'PRACTICAL',
                'WORKSHOP',
                'LAB',
                'CLINICAL'
            ];
            
            // Check if program name contains any TVET identifier
            const isTVETProgram = tvetIdentifiers.some(identifier => 
                programUpper.includes(identifier)
            );
            
            // Also check if program name indicates TVET based on keywords
            const hasTVETKeywords = tvetCourseIndicators.some(keyword =>
                programUpper.includes(keyword)
            );
            
            return isTVETProgram || hasTVETKeywords;
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
            
            // Program indicator (optional)
            this.programIndicator = document.getElementById('courses-program-indicator');
            
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
            
            // Program filter buttons (if any)
            document.getElementById('filter-tvet-courses')?.addEventListener('click', (e) => {
                e.preventDefault();
                this.filterByProgram('TVET');
            });
            
            document.getElementById('filter-krchn-courses')?.addEventListener('click', (e) => {
                e.preventDefault();
                this.filterByProgram('KRCHN');
            });
            
            document.getElementById('filter-all-courses')?.addEventListener('click', (e) => {
                e.preventDefault();
                this.filterByProgram('ALL');
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
                // Ensure user data is updated
                this.updateUserData();
                
                console.log('🎯 Loading courses for:', { 
                    program: this.program, 
                    isTVET: this.isTVETStudent,
                    intakeYear: this.intakeYear,
                    name: this.userProfile.full_name 
                });
                
                // Get Supabase client
                const supabase = window.db?.supabase;
                
                if (!supabase) {
                    throw new Error('Database connection not available');
                }
                
                // 🔥 STRICT FILTERING: Build query based on student type
                let query = supabase
                    .from('courses')
                    .select('*')
                    .order('course_name', { ascending: true });
                
                // 1. Filter by intake year
                query = query.eq('intake_year', this.intakeYear);
                
                // 2. 🔥 CRITICAL: Filter by target_program based on student type
                if (this.isTVETStudent) {
                    // TVET students see TVET courses
                    console.log('🎯 Loading TVET courses for TVET student');
                    query = query.eq('target_program', 'TVET');
                } else {
                    // KRCHN students see KRCHN courses
                    console.log('🎯 Loading KRCHN courses for KRCHN student');
                    query = query.eq('target_program', 'KRCHN');
                }
                
                // 3. Filter by block/term (more flexible)
                if (this.isTVETStudent) {
                    // TVET students use term
                    query = query.or(
                        `block.eq.${this.term},block.is.null,block.eq.General`
                    );
                } else {
                    // KRCHN students use block
                    query = query.or(
                        `block.eq.${this.block},block.is.null,block.eq.General`
                    );
                }
                
                // Fetch courses
                const { data: courses, error } = await query;
                
                if (error) throw error;
                
                console.log(`📊 Found ${courses?.length || 0} courses with strict filtering`);
                
                // If no courses found, try alternative approach
                if (!courses || courses.length === 0) {
                    console.log('⚠️ No courses found with strict filter, trying broader search...');
                    
                    // Try broader search without program filter
                    const { data: allCourses, error: allError } = await supabase
                        .from('courses')
                        .select('*')
                        .eq('intake_year', this.intakeYear)
                        .or(`block.eq.${this.block},block.eq.${this.term},block.is.null,block.eq.General`)
                        .order('course_name', { ascending: true });
                    
                    if (allError) throw allError;
                    
                    if (allCourses && allCourses.length > 0) {
                        courses = allCourses;
                        console.log(`📊 Found ${courses.length} courses via broader search`);
                    }
                }
                
                // Process course data
                this.processCoursesData(courses || []);
                
                // Apply current filter and display
                this.applyDataFilter();
                
                // Update program indicator
                this.updateProgramIndicator();
                
                // Trigger dashboard update
                this.triggerDashboardUpdate();
                
                // Mark as loaded
                this.loaded = true;
                
                // Dispatch module ready event for dashboard
                this.dispatchModuleReadyEvent();
                
                console.log('✅ Courses loaded successfully with strict filtering');
                
            } catch (error) {
                console.error('❌ Error loading courses:', error);
                this.showError(error.message);
            }
        }
        
        // 🔥 NEW: Update UI to show program type
        updateProgramIndicator() {
            if (this.programIndicator) {
                const programText = this.program || 'Unknown Program';
                const programType = this.isTVETStudent ? 'TVET' : 'KRCHN';
                const badgeClass = this.isTVETStudent ? 'badge-tvet' : 'badge-krchn';
                
                this.programIndicator.innerHTML = `
                    <span class="badge ${badgeClass}">
                        <i class="fas ${this.isTVETStudent ? 'fa-tools' : 'fa-graduation-cap'}"></i>
                        ${programType}: ${programText}
                    </span>
                `;
            }
        }
        
        // 🔥 NEW: Filter by program type
        filterByProgram(programType) {
            console.log(`🎯 Filtering courses by program: ${programType}`);
            
            // Update active button
            document.querySelectorAll('.course-program-filter-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            document.getElementById(`filter-${programType.toLowerCase()}-courses`)?.classList.add('active');
            
            // Apply filter
            if (programType === 'ALL') {
                this.activeCourses = this.allCourses.filter(course => 
                    !course.isCompleted && course.status !== 'Completed'
                );
                this.completedCourses = this.allCourses.filter(course => 
                    course.isCompleted || course.status === 'Completed'
                );
            } else {
                this.activeCourses = this.allCourses.filter(course => 
                    !course.isCompleted && 
                    course.status !== 'Completed' && 
                    course.target_program === programType
                );
                this.completedCourses = this.allCourses.filter(course => 
                    (course.isCompleted || course.status === 'Completed') && 
                    course.target_program === programType
                );
            }
            
            // Update display
            this.displayTables();
            this.updateCounts();
            this.updateEmptyStates();
        }
        
        dispatchModuleReadyEvent() {
            const event = new CustomEvent('coursesModuleReady', {
                detail: {
                    courses: this.allCourses,
                    activeCount: this.activeCourses.length,
                    completedCount: this.completedCourses.length,
                    isTVETStudent: this.isTVETStudent,
                    program: this.program,
                    timestamp: new Date().toISOString()
                }
            });
            document.dispatchEvent(event);
            console.log('📢 Dispatched coursesModuleReady event for dashboard');
        }
        
        processCoursesData(courses) {
            this.allCourses = courses.map(course => {
                const isCompleted = course.status === 'Completed' || course.status === 'Passed';
                const isTVETCourse = course.target_program === 'TVET';
                
                return {
                    ...course,
                    isCompleted,
                    isTVETCourse,
                    formattedCreatedAt: course.created_at ? 
                        new Date(course.created_at).toLocaleDateString('en-US', { 
                            year: 'numeric', month: 'short', day: 'numeric' 
                        }) : '--',
                    programBadgeClass: isTVETCourse ? 'badge-tvet' : 'badge-krchn',
                    programIcon: isTVETCourse ? 'fa-tools' : 'fa-graduation-cap'
                };
            });
            
            // Log program distribution
            const tvetCount = this.allCourses.filter(c => c.target_program === 'TVET').length;
            const krchnCount = this.allCourses.filter(c => c.target_program === 'KRCHN').length;
            const otherCount = this.allCourses.filter(c => !c.target_program || !['TVET', 'KRCHN'].includes(c.target_program)).length;
            
            console.log(`✅ Processed ${this.allCourses.length} courses (TVET: ${tvetCount}, KRCHN: ${krchnCount}, Other: ${otherCount})`);
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
                    <div class="course-meta">
                        <span class="badge ${course.programBadgeClass}">
                            <i class="fas ${course.programIcon}"></i> ${course.target_program || 'General'}
                        </span>
                        <span class="course-block">${this.escapeHtml(course.block || 'General')}</span>
                    </div>
                    <div class="course-description">
                        ${this.escapeHtml(course.description || 'No description available')}
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
                    <td class="text-center">
                        <span class="badge ${course.programBadgeClass}">
                            <i class="fas ${course.programIcon}"></i> ${course.target_program || 'General'}
                        </span>
                    </td>
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
                    <small class="text-muted">Program: ${this.program} (${this.isTVETStudent ? 'TVET' : 'KRCHN'})</small>
                </div>
            `;
            
            if (this.activeGrid) this.activeGrid.innerHTML = loadingHTML;
            if (this.completedTable) {
                this.completedTable.innerHTML = `
                    <tr><td colspan="7">${loadingHTML}</td></tr>
                `;
            }
        }
        
        showError(message) {
            const errorHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${message}</p>
                    <small class="text-muted">Program: ${this.program} (${this.isTVETStudent ? 'TVET' : 'KRCHN'})</small>
                    <br>
                    <button onclick="window.coursesModule.loadCourses()" class="btn btn-sm">
                        Retry
                    </button>
                </div>
            `;
            
            if (this.activeGrid) this.activeGrid.innerHTML = errorHTML;
            if (this.completedTable) {
                this.completedTable.innerHTML = `
                    <tr><td colspan="7">${errorHTML}</td></tr>
                `;
            }
        }
        
        triggerDashboardUpdate() {
            console.log('📊 Sending courses data to dashboard...');
            
            const event = new CustomEvent('coursesUpdated', {
                detail: {
                    courses: this.allCourses,
                    activeCount: this.activeCourses.length,
                    completedCount: this.completedCourses.length,
                    isTVETStudent: this.isTVETStudent,
                    program: this.program,
                    timestamp: new Date().toISOString()
                }
            });
            document.dispatchEvent(event);
            
            window.coursesData = {
                allCourses: this.allCourses,
                activeCount: this.activeCourses.length,
                loaded: this.loaded,
                isTVETStudent: this.isTVETStudent
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
                        <div class="program-info" style="background: #f3f4f6; padding: 20px; border-radius: 8px; display: inline-block;">
                            <p style="margin: 0; color: #4b5563;">
                                <strong>Expected program types:</strong><br>
                                • TVET (Technical & Vocational)<br>
                                • KRCHN (Registered Nursing)<br>
                                <small>Your courses will filter based on your program</small>
                            </p>
                        </div>
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
    
    // 🔥 NEW: Get program type for dashboard
    window.getCoursesProgramInfo = () => {
        if (window.coursesModule) {
            return {
                isTVETStudent: window.coursesModule.isTVETStudent,
                program: window.coursesModule.program,
                activeCount: window.coursesModule.activeCourses?.length || 0
            };
        }
        return {
            isTVETStudent: false,
            program: 'Unknown',
            activeCount: 0
        };
    };
    
    console.log('✅ Courses module ready with STRICT TVET FILTERING!');
})();
