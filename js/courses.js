// courses.js - FINAL PERFECTED VERSION
(function() {
    'use strict';
    
    console.log('✅ courses.js - Loading with PERFECT TVET/KRCHN logic...');
    
    class CoursesModule {
        constructor() {
            console.log('📚 CoursesModule initialized');
            
            // Store course data
            this.allCourses = [];
            this.activeCourses = [];
            this.completedCourses = [];
            this.currentFilter = 'all';
            this.userProfile = null;
            this.loaded = false;
            
            // User data
            this.program = null;
            this.intakeYear = null;
            this.userBlock = null;      // User's block from profile
            this.userTerm = null;       // User's term from profile
            this.isTVETStudent = false;
            this.programType = null;    // 'TVET' or 'KRCHN'
            
            this.cacheElements();
            this.initializeEventListeners();
            this.updateFilterButtons();
            this.setupLoginListeners();
            
            setTimeout(() => this.tryLoadIfLoggedIn(), 1500);
        }
        
        setupLoginListeners() {
            document.addEventListener('userLoggedIn', (e) => {
                this.userProfile = e.detail?.userProfile;
                this.updateUserData();
                this.loadCourses();
            });
            
            document.addEventListener('userProfileUpdated', (e) => {
                if (e.detail?.userProfile) {
                    this.userProfile = e.detail.userProfile;
                    this.updateUserData();
                    if (!this.loaded) {
                        this.loadCourses();
                    }
                }
            });
            
            document.addEventListener('appReady', () => {
                this.tryLoadIfLoggedIn();
            });
        }
        
        tryLoadIfLoggedIn() {
            const profile = this.getUserProfileFromAnySource();
            
            if (profile) {
                this.userProfile = profile;
                this.updateUserData();
                this.loadCourses();
            } else {
                this.showWaitingForLogin();
            }
        }
        
        updateUserData() {
            if (this.userProfile) {
                // Get program and determine type
                this.program = this.userProfile.program || this.userProfile.course || 'KRCHN';
                this.intakeYear = this.userProfile.intake_year || this.userProfile.year || 2025;
                
                // 🔥 DETERMINE PROGRAM TYPE
                const programStr = String(this.program).toUpperCase().trim();
                this.isTVETStudent = programStr.includes('TVET');
                this.programType = this.isTVETStudent ? 'TVET' : 'KRCHN';
                
                // 🔥 GET BLOCK/TERM BASED ON PROGRAM TYPE
                if (this.isTVETStudent) {
                    // TVET students: Use term from profile, fallback to block
                    this.userTerm = this.userProfile.term || this.userProfile.block || 'Term1';
                    this.userBlock = null; // Not used for TVET
                    console.log('🎯 TVET student - Term:', this.userTerm);
                } else {
                    // KRCHN students: Use block from profile
                    this.userBlock = this.userProfile.block || 'A';
                    this.userTerm = null; // Not used for KRCHN
                    console.log('🎯 KRCHN student - Block:', this.userBlock);
                }
                
                console.log('✅ User data updated:', {
                    program: this.program,
                    programType: this.programType,
                    isTVET: this.isTVETStudent,
                    intakeYear: this.intakeYear,
                    block: this.userBlock,
                    term: this.userTerm
                });
                
                return true;
            }
            return false;
        }
        
        getUserProfileFromAnySource() {
            const sources = [
                () => window.db?.currentUserProfile,
                () => window.currentUserProfile,
                () => window.databaseModule?.currentUserProfile,
                () => {
                    try {
                        return JSON.parse(localStorage.getItem('userProfile'));
                    } catch (e) {
                        return null;
                    }
                }
            ];
            
            for (const source of sources) {
                try {
                    const profile = source();
                    if (profile && (profile.full_name || profile.email || profile.id || profile.user_id)) {
                        return profile;
                    }
                } catch (e) {
                    // Continue
                }
            }
            return null;
        }
        
        cacheElements() {
            this.activeGrid = document.getElementById('active-courses-grid');
            this.completedTable = document.getElementById('completed-courses-table');
            this.activeEmpty = document.getElementById('active-empty');
            this.completedEmpty = document.getElementById('completed-empty');
            this.activeCount = document.getElementById('active-count');
            this.completedCount = document.getElementById('completed-count');
            this.programIndicator = document.getElementById('courses-program-indicator');
        }
        
        initializeEventListeners() {
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
                this.showError('Please log in to view courses');
                return;
            }
            
            this.showLoading();
            
            try {
                if (!this.updateUserData()) {
                    throw new Error('Failed to update user data');
                }
                
                const supabase = window.db?.supabase;
                
                if (!supabase) {
                    throw new Error('Database connection not available');
                }
                
                console.log('🔍 Fetching courses for:', {
                    programType: this.programType,
                    intakeYear: this.intakeYear,
                    block: this.userBlock,
                    term: this.userTerm
                });
                
                // 🔥 STEP 1: Build base query
                let query = supabase
                    .from('courses')
                    .select('*')
                    .eq('intake_year', String(this.intakeYear))
                    .order('course_name', { ascending: true });
                
                // 🔥 STEP 2: Filter by target_program
                if (this.programType === 'TVET') {
                    query = query.eq('target_program', 'TVET');
                } else {
                    // KRCHN or other non-TVET programs
                    query = query.or('target_program.eq.KRCHN,target_program.is.null');
                }
                
                // 🔥 STEP 3: Filter by block/term based on program type
                if (this.programType === 'TVET' && this.userTerm) {
                    // TVET: Match block field with term value (e.g., block = 'Term1')
                    query = query.eq('block', this.userTerm);
                } else if (this.programType === 'KRCHN' && this.userBlock) {
                    // KRCHN: Match block field with block value (e.g., block = 'A')
                    query = query.eq('block', this.userBlock);
                }
                
                let { data: courses, error } = await query;
                
                if (error) throw error;
                
                console.log(`📊 Found ${courses?.length || 0} courses with primary filter`);
                
                // 🔥 STEP 4: If no courses found, try fallback
                if (!courses || courses.length === 0) {
                    console.log('⚠️ No courses found, trying fallback...');
                    
                    // Fallback: Same program filter but no block/term restriction
                    let fallbackQuery = supabase
                        .from('courses')
                        .select('*')
                        .eq('intake_year', String(this.intakeYear))
                        .order('course_name', { ascending: true });
                    
                    if (this.programType === 'TVET') {
                        fallbackQuery = fallbackQuery.eq('target_program', 'TVET');
                    } else {
                        fallbackQuery = fallbackQuery.or('target_program.eq.KRCHN,target_program.is.null');
                    }
                    
                    const fallbackResult = await fallbackQuery;
                    
                    if (fallbackResult.error) throw fallbackResult.error;
                    
                    courses = fallbackResult.data;
                    console.log(`📊 Found ${courses?.length || 0} courses via fallback`);
                }
                
                // 🔥 STEP 5: Process and display courses
                if (courses && courses.length > 0) {
                    this.processCoursesData(courses);
                    this.applyDataFilter();
                    this.updateProgramIndicator();
                    this.loaded = true;
                    this.dispatchModuleReadyEvent();
                    this.triggerDashboardUpdate();
                    console.log('✅ Courses loaded successfully');
                } else {
                    this.showNoCoursesFound();
                }
                
            } catch (error) {
                console.error('❌ Error loading courses:', error);
                this.showError(error.message);
            }
        }
        
        processCoursesData(courses) {
            console.log('🔍 Processing courses data...');
            
            this.allCourses = courses.map(course => {
                const isCompleted = course.status === 'Completed' || course.status === 'Passed';
                const isTVETCourse = course.target_program === 'TVET';
                const programType = course.target_program || 'General';
                
                // 🔥 Format the block/term display based on program type
                let blockDisplay = course.block || 'General';
                if (isTVETCourse) {
                    // For TVET courses, show "Term: X"
                    blockDisplay = `Term: ${course.block || 'General'}`;
                } else {
                    // For KRCHN courses, show "Block: X"
                    blockDisplay = `Block: ${course.block || 'General'}`;
                }
                
                return {
                    ...course,
                    isCompleted,
                    isTVETCourse,
                    displayName: course.course_name || 'Unnamed Course',
                    programType: programType,
                    blockDisplay: blockDisplay,
                    formattedCreatedAt: course.created_at ? 
                        new Date(course.created_at).toLocaleDateString('en-US', { 
                            year: 'numeric', month: 'short', day: 'numeric' 
                        }) : '--',
                    programBadgeClass: isTVETCourse ? 'badge-tvet' : 'badge-krchn',
                    programIcon: isTVETCourse ? 'fa-tools' : 'fa-graduation-cap',
                    programText: isTVETCourse ? 'TVET Program' : 'KRCHN Program'
                };
            });
            
            // Log the distribution
            const tvetCount = this.allCourses.filter(c => c.target_program === 'TVET').length;
            const krchnCount = this.allCourses.filter(c => c.target_program === 'KRCHN').length;
            const otherCount = this.allCourses.filter(c => !c.target_program || !['TVET', 'KRCHN'].includes(c.target_program)).length;
            
            console.log(`✅ Processed ${this.allCourses.length} courses:`, {
                TVET: tvetCount,
                KRCHN: krchnCount,
                Other: otherCount
            });
        }
        
        updateProgramIndicator() {
            if (this.programIndicator) {
                const badgeClass = this.isTVETStudent ? 'badge-tvet' : 'badge-krchn';
                const icon = this.isTVETStudent ? 'fa-tools' : 'fa-graduation-cap';
                const typeText = this.isTVETStudent ? 'TVET' : 'KRCHN';
                const blockTermText = this.isTVETStudent ? 
                    `Term: ${this.userTerm}` : 
                    `Block: ${this.userBlock}`;
                
                this.programIndicator.innerHTML = `
                    <span class="badge ${badgeClass}">
                        <i class="fas ${icon}"></i>
                        ${typeText} Student
                        <span class="ms-2">${blockTermText}</span>
                        <small class="ms-2 opacity-75">
                            (${this.allCourses.length} courses)
                        </small>
                    </span>
                `;
            }
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
            this.updateCounts();
            this.updateEmptyStates();
        }
        
        displayTables() {
            this.displayActiveCourses();
            this.displayCompletedCourses();
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
                    
                    <!-- 🔥 Course name with program UNDERNEATH -->
                    <h4 class="course-title">${this.escapeHtml(course.displayName)}</h4>
                    <div class="course-program-display">
                        <span class="program-badge ${course.programBadgeClass}">
                            <i class="fas ${course.programIcon}"></i> 
                            ${this.escapeHtml(course.programText)}
                        </span>
                        <span class="course-block-term ms-2">
                            <i class="fas ${course.isTVETCourse ? 'fa-calendar-alt' : 'fa-th-large'}"></i>
                            ${this.escapeHtml(course.blockDisplay)}
                        </span>
                    </div>
                    
                    <div class="course-meta">
                        <span class="course-intake">
                            <i class="far fa-calendar"></i> Intake: ${this.escapeHtml(course.intake_year || 'N/A')}
                        </span>
                        ${course.duration_minutes ? `
                            <span class="course-duration">
                                <i class="far fa-clock"></i> ${course.duration_minutes} min
                            </span>
                        ` : ''}
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
                    <!-- 🔥 Single column with course name and program -->
                    <td>
                        <div>
                            <strong>${this.escapeHtml(course.displayName)}</strong>
                            <div class="program-display ${course.programBadgeClass}">
                                <i class="fas ${course.programIcon}"></i> 
                                ${this.escapeHtml(course.programText)}
                                <span class="ms-2">
                                    <i class="fas ${course.isTVETCourse ? 'fa-calendar-alt' : 'fa-th-large'}"></i>
                                    ${this.escapeHtml(course.blockDisplay)}
                                </span>
                            </div>
                        </div>
                    </td>
                    <td><code>${this.escapeHtml(course.unit_code || 'N/A')}</code></td>
                    <td class="text-center">${this.escapeHtml(course.intake_year || 'N/A')}</td>
                    <td class="text-center">${course.formattedCreatedAt}</td>
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
            const programType = this.isTVETStudent ? 'TVET' : 'KRCHN';
            const blockTerm = this.isTVETStudent ? `Term: ${this.userTerm}` : `Block: ${this.userBlock}`;
            
            const loadingHTML = `
                <div style="text-align: center; padding: 40px;">
                    <div class="loading-spinner"></div>
                    <p>Loading ${programType} courses...</p>
                    <small class="text-muted">
                        ${blockTerm} | Intake: ${this.intakeYear}
                    </small>
                </div>
            `;
            
            if (this.activeGrid) this.activeGrid.innerHTML = loadingHTML;
            if (this.completedTable) {
                this.completedTable.innerHTML = `
                    <tr><td colspan="5">${loadingHTML}</td></tr>
                `;
            }
        }
        
        showNoCoursesFound() {
            const programType = this.isTVETStudent ? 'TVET' : 'KRCHN';
            const blockTerm = this.isTVETStudent ? `Term: ${this.userTerm}` : `Block: ${this.userBlock}`;
            
            const noCoursesHTML = `
                <div style="text-align: center; padding: 40px;">
                    <div style="font-size: 48px; color: #9ca3af; margin-bottom: 20px;">
                        <i class="fas fa-book-open"></i>
                    </div>
                    <h4>No Courses Found</h4>
                    <p class="text-muted">
                        No ${programType} courses found for:<br>
                        • Intake Year: ${this.intakeYear}<br>
                        • ${blockTerm}<br>
                        • Program: ${this.program}
                    </p>
                    <button onclick="window.coursesModule.loadCourses()" class="btn btn-primary mt-3">
                        <i class="fas fa-sync-alt"></i> Try Again
                    </button>
                </div>
            `;
            
            if (this.activeGrid) this.activeGrid.innerHTML = noCoursesHTML;
            if (this.completedTable) {
                this.completedTable.innerHTML = `
                    <tr><td colspan="5">${noCoursesHTML}</td></tr>
                `;
            }
        }
        
        showError(message) {
            const errorHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${message}</p>
                    <small class="text-muted">
                        Program: ${this.program} (${this.isTVETStudent ? 'TVET' : 'KRCHN'})
                    </small>
                    <br>
                    <button onclick="window.coursesModule.loadCourses()" class="btn btn-sm btn-outline-primary mt-2">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </div>
            `;
            
            if (this.activeGrid) this.activeGrid.innerHTML = errorHTML;
            if (this.completedTable) {
                this.completedTable.innerHTML = `
                    <tr><td colspan="5">${errorHTML}</td></tr>
                `;
            }
        }
        
        dispatchModuleReadyEvent() {
            const event = new CustomEvent('coursesModuleReady', {
                detail: {
                    courses: this.allCourses,
                    activeCount: this.activeCourses.length,
                    completedCount: this.completedCourses.length,
                    isTVETStudent: this.isTVETStudent,
                    program: this.program,
                    programType: this.programType,
                    timestamp: new Date().toISOString()
                }
            });
            document.dispatchEvent(event);
        }
        
        triggerDashboardUpdate() {
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
                isTVETStudent: this.isTVETStudent,
                programType: this.programType
            };
        }
        
        getActiveCourseCount() {
            return this.activeCourses.length;
        }
        
        getAllCourses() {
            return this.allCourses;
        }
        
        refresh() {
            this.loaded = false;
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
                        <div style="font-size: 48px; color: #667eea; margin-bottom: 20px;">
                            <i class="fas fa-user-clock"></i>
                        </div>
                        <h3 style="margin-bottom: 10px;">Waiting for Login</h3>
                        <p style="color: #6b7280; margin-bottom: 30px;">
                            Please log in to view your courses
                        </p>
                        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; display: inline-block;">
                            <p style="margin: 0; color: #4b5563;">
                                <strong>Course Filtering Logic:</strong><br>
                                • TVET students: See TVET courses filtered by Term<br>
                                • KRCHN students: See KRCHN courses filtered by Block<br>
                                • Program shown under course name
                            </p>
                        </div>
                    </div>
                `;
            }
        }
    }
    
    // Create global instance
    window.coursesModule = new CoursesModule();
    
    // Global functions
    window.getActiveCourseCount = () => window.coursesModule?.getActiveCourseCount() || 0;
    window.getAllCourses = () => window.coursesModule?.getAllCourses() || [];
    window.loadCourses = () => window.coursesModule?.refresh();
    window.getCoursesProgramInfo = () => {
        if (window.coursesModule) {
            return {
                isTVETStudent: window.coursesModule.isTVETStudent,
                programType: window.coursesModule.programType,
                program: window.coursesModule.program,
                activeCount: window.coursesModule.activeCourses?.length || 0
            };
        }
        return {
            isTVETStudent: false,
            programType: 'Unknown',
            program: 'Unknown',
            activeCount: 0
        };
    };
    
    console.log('✅ Courses module ready with PERFECT TVET/KRCHN logic!');
})();
