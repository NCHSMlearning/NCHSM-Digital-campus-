// courses.js - ENHANCED VERSION WITH IMPROVED FILTERING FOR COMPLETED COURSES
(function() {
    'use strict';
    
    console.log('✅ courses.js - Loading with enhanced filtering...');
    
    class CoursesModule {
        constructor() {
            console.log('📚 CoursesModule initialized');
            
            // Define ALL TVET program codes from your school
            this.TVET_PROGRAMS = [
                // Diploma Programs (6-24 months)
                'DPOTT', 'DCH', 'DHRIT', 'DSL', 'DSW', 'DCJS', 'DHSS', 'DICT', 'DME',
                
                // Certificate Programs (3-12 months)
                'CPOTT', 'CCH', 'CHRIT', 'CPC', 'CSL', 'CSW', 'CCJS', 'CAG', 'CHSS', 'CICT',
                
                // Artisan Programs (2-12 months)
                'ACH', 'AAG', 'ASW',
                
                // Other TVET Programs
                'CCA', 'PTE'
            ];
            
            // Program display names mapping
            this.PROGRAM_DISPLAY_NAMES = {
                // KRCHN
                'KRCHN': 'KRCHN Nursing',
                
                // TVET Diplomas
                'DPOTT': 'Diploma in Perioperative Theatre Technology',
                'DCH': 'Diploma in Community Health',
                'DHRIT': 'Diploma in Health Records and IT',
                'DSL': 'Diploma in Science Lab',
                'DSW': 'Diploma in Social Work and Community Development',
                'DCJS': 'Diploma in Criminal Justice',
                'DHSS': 'Diploma in Health Support Services',
                'DICT': 'Diploma in Information & Communication Technology',
                'DME': 'Diploma in Medical Engineering',
                
                // TVET Certificates
                'CPOTT': 'Certificate in Perioperative Theatre Technology',
                'CCH': 'Certificate in Community Health',
                'CHRIT': 'Certificate in Health Records and IT',
                'CPC': 'Certificate in Patient Care',
                'CSL': 'Certificate in Science Lab',
                'CSW': 'Certificate in Social Work and Community Development',
                'CCJS': 'Certificate in Criminal Justice',
                'CAG': 'Certificate in Agriculture',
                'CHSS': 'Certificate in Health Support Services',
                'CICT': 'Certificate in Information & Communication Technology',
                
                // TVET Artisan
                'ACH': 'Artisan in Community Health',
                'AAG': 'Artisan in Agriculture',
                'ASW': 'Artisan in Social Work and Community Development',
                
                // Other TVET
                'CCA': 'Certificate in Computer Applications (CCA)',
                'PTE': 'TVET/CDACC (PTE)'
            };
            
            // Store course data
            this.allCourses = [];
            this.activeCourses = [];
            this.completedCourses = [];
            this.currentFilter = 'all';
            this.userProfile = null;
            this.loaded = false;
            
            // User data
            this.programCode = null;
            this.programName = null;
            this.programType = null;
            this.programLevel = null;
            this.intakeYear = null;
            this.userBlock = null;
            this.userTerm = null;
            this.isTVETStudent = false;
            
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
            document.addEventListener('userLoggedIn', (e) => {
                console.log('🎉 USER LOGGED IN EVENT RECEIVED!');
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
                console.log('🚀 App ready event received');
                this.tryLoadIfLoggedIn();
            });
        }
        
        tryLoadIfLoggedIn() {
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
        
        determineProgramType(programCode) {
            if (!programCode) return { type: 'KRCHN', level: 'KRCHN' };
            
            const code = String(programCode).toUpperCase().trim();
            
            if (this.TVET_PROGRAMS.includes(code)) {
                let level = 'CERTIFICATE';
                if (code.startsWith('D')) level = 'DIPLOMA';
                if (code.startsWith('A')) level = 'ARTISAN';
                if (code === 'CCA' || code === 'PTE') level = 'OTHER';
                
                return {
                    type: 'TVET',
                    level: level,
                    code: code
                };
            }
            
            if (code === 'KRCHN') {
                return { type: 'KRCHN', level: 'KRCHN', code: 'KRCHN' };
            }
            
            return { type: 'KRCHN', level: 'KRCHN', code: 'KRCHN' };
        }
        
        updateUserData() {
            if (this.userProfile) {
                const programFromProfile = this.userProfile.program || 
                                         this.userProfile.course || 
                                         'KRCHN';
                
                this.intakeYear = this.userProfile.intake_year || 
                                 this.userProfile.year || 
                                 2025;
                
                const programInfo = this.determineProgramType(programFromProfile);
                
                this.programCode = programInfo.code;
                this.programType = programInfo.type;
                this.programLevel = programInfo.level;
                this.isTVETStudent = (this.programType === 'TVET');
                this.programName = this.PROGRAM_DISPLAY_NAMES[this.programCode] || programFromProfile;
                
                if (this.isTVETStudent) {
                    this.userTerm = this.userProfile.term || 
                                   this.userProfile.block || 
                                   'Term1';
                    this.userBlock = null;
                    console.log('🎯 TVET Student:', {
                        code: this.programCode,
                        level: this.programLevel,
                        name: this.programName,
                        term: this.userTerm
                    });
                } else {
                    this.userBlock = this.userProfile.block || 'A';
                    this.userTerm = null;
                    console.log('🎯 KRCHN Student:', {
                        code: this.programCode,
                        name: this.programName,
                        block: this.userBlock
                    });
                }
                
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
                    console.log('⚠️ Profile source error:', e.message);
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
            
            this.filterAllBtn = document.getElementById('view-all-courses');
            this.filterActiveBtn = document.getElementById('view-active-only');
            this.filterCompletedBtn = document.getElementById('view-completed-only');
        }
        
        initializeEventListeners() {
            if (this.filterAllBtn) {
                this.filterAllBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (!this.userProfile) {
                        this.showError('Please log in first');
                        return;
                    }
                    this.applyFilter('all');
                });
            }
            
            if (this.filterActiveBtn) {
                this.filterActiveBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (!this.userProfile) {
                        this.showError('Please log in first');
                        return;
                    }
                    this.applyFilter('active');
                });
            }
            
            if (this.filterCompletedBtn) {
                this.filterCompletedBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (!this.userProfile) {
                        this.showError('Please log in first');
                        return;
                    }
                    this.applyFilter('completed');
                });
            }
            
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
                    programCode: this.programCode,
                    programType: this.programType,
                    level: this.programLevel,
                    intakeYear: this.intakeYear,
                    block: this.userBlock,
                    term: this.userTerm
                });
                
                // Build query with proper filters
                let query = supabase
                    .from('courses')
                    .select('*')
                    .order('course_name', { ascending: true });
                
                // FILTER 1: Filter by intake year (applies to ALL courses - active AND completed)
                if (this.intakeYear) {
                    query = query.eq('intake_year', String(this.intakeYear));
                    console.log(`📅 Filtering by intake year: ${this.intakeYear}`);
                }
                
                // FILTER 2: Filter by program type (KRCHN or TVET)
                if (this.isTVETStudent) {
                    query = query.eq('target_program', 'TVET');
                    console.log(`🎯 Filtering by TVET program`);
                } else {
                    query = query.or('target_program.eq.KRCHN,target_program.is.null');
                    console.log(`🎯 Filtering by KRCHN program`);
                }
                
                // Execute first query to get all courses matching program and intake year
                let { data: allProgramCourses, error: firstError } = await query;
                
                if (firstError) throw firstError;
                
                console.log(`📊 Found ${allProgramCourses?.length || 0} courses matching program and intake year`);
                
                // FILTER 3: Apply block/term filter to BOTH active AND completed courses
                let filteredCourses = allProgramCourses;
                
                if (this.isTVETStudent && this.userTerm) {
                    // TVET: Filter by term (applies to all courses - both active and completed)
                    filteredCourses = allProgramCourses.filter(course => 
                        course.block === this.userTerm
                    );
                    console.log(`📚 TVET - Filtered by term '${this.userTerm}': ${filteredCourses.length} courses remaining`);
                } else if (!this.isTVETStudent && this.userBlock) {
                    // KRCHN: Filter by block (applies to all courses - both active and completed)
                    filteredCourses = allProgramCourses.filter(course => 
                        course.block === this.userBlock
                    );
                    console.log(`📚 KRCHN - Filtered by block '${this.userBlock}': ${filteredCourses.length} courses remaining`);
                }
                
                // If no courses found with strict filters, try a more lenient approach
                if (filteredCourses.length === 0 && allProgramCourses.length > 0) {
                    console.log('⚠️ No courses found with block/term filter, showing all program courses as fallback');
                    filteredCourses = allProgramCourses;
                }
                
                if (filteredCourses && filteredCourses.length > 0) {
                    this.processCoursesData(filteredCourses);
                    this.applyDataFilter();
                    this.updateProgramIndicator();
                    this.loaded = true;
                    this.dispatchModuleReadyEvent();
                    this.triggerDashboardUpdate();
                    console.log('✅ Courses loaded successfully with filters:', {
                        total: filteredCourses.length,
                        active: this.activeCourses.length,
                        completed: this.completedCourses.length,
                        intakeYear: this.intakeYear,
                        blockTerm: this.isTVETStudent ? this.userTerm : this.userBlock
                    });
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
                
                let programDisplay, programBadgeClass, programIcon, levelText;
                
                if (isTVETCourse) {
                    programDisplay = 'TVET Program';
                    programBadgeClass = 'badge-tvet';
                    programIcon = 'fa-tools';
                    levelText = ` (${this.programLevel})`;
                } else {
                    programDisplay = 'KRCHN Program';
                    programBadgeClass = 'badge-krchn';
                    programIcon = 'fa-graduation-cap';
                    levelText = '';
                }
                
                let durationDisplay = '';
                if (course.duration_minutes) {
                    const hours = Math.floor(course.duration_minutes / 60);
                    const minutes = course.duration_minutes % 60;
                    if (hours > 0) {
                        durationDisplay = `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`;
                    } else {
                        durationDisplay = `${minutes}m`;
                    }
                }
                
                return {
                    ...course,
                    isCompleted,
                    isTVETCourse,
                    displayName: course.course_name || 'Unnamed Course',
                    programDisplay: programDisplay + levelText,
                    programBadgeClass,
                    programIcon,
                    programLevel: this.programLevel,
                    durationDisplay,
                    formattedCreatedAt: course.completed_at || course.created_at ? 
                        new Date(course.completed_at || course.created_at).toLocaleDateString('en-US', { 
                            year: 'numeric', month: 'short', day: 'numeric' 
                        }) : '--',
                    credits: course.credits || 3
                };
            });
            
            const tvetCount = this.allCourses.filter(c => c.target_program === 'TVET').length;
            const krchnCount = this.allCourses.filter(c => c.target_program === 'KRCHN').length;
            
            console.log(`✅ Processed ${this.allCourses.length} courses:`, {
                TVET: tvetCount,
                KRCHN: krchnCount,
                program: this.programName,
                intakeYear: this.intakeYear,
                blockTerm: this.isTVETStudent ? this.userTerm : this.userBlock
            });
        }
        
        updateProgramIndicator() {
            if (this.programIndicator) {
                const badgeClass = this.isTVETStudent ? 'badge-tvet' : 'badge-krchn';
                const icon = this.isTVETStudent ? 'fa-tools' : 'fa-graduation-cap';
                
                let programText = this.programName;
                if (this.isTVETStudent && this.programLevel !== 'OTHER') {
                    programText = `${this.programLevel} - ${this.programName}`;
                }
                
                const blockTermText = this.isTVETStudent ? 
                    `Term: ${this.userTerm}` : 
                    `Block: ${this.userBlock}`;
                
                this.programIndicator.innerHTML = `
                    <span class="badge ${badgeClass}">
                        <i class="fas ${icon}"></i>
                        ${this.escapeHtml(programText)}
                        <span class="ms-2">${blockTermText}</span>
                        <small class="ms-2 opacity-75">
                            (${this.allCourses.length} courses total)
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
            
            console.log(`🔍 Filter applied: ${filterType} - Active: ${this.activeCourses.length}, Completed: ${this.completedCourses.length}`);
        }
        
        updateFilterButtons() {
            if (this.filterAllBtn) this.filterAllBtn.classList.remove('active');
            if (this.filterActiveBtn) this.filterActiveBtn.classList.remove('active');
            if (this.filterCompletedBtn) this.filterCompletedBtn.classList.remove('active');
            
            switch(this.currentFilter) {
                case 'all':
                    if (this.filterAllBtn) this.filterAllBtn.classList.add('active');
                    break;
                case 'active':
                    if (this.filterActiveBtn) this.filterActiveBtn.classList.add('active');
                    break;
                case 'completed':
                    if (this.filterCompletedBtn) this.filterCompletedBtn.classList.add('active');
                    break;
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
            // Filter active courses (NOT completed)
            this.activeCourses = this.allCourses.filter(course => 
                !course.isCompleted && course.status !== 'Completed' && course.status !== 'Passed'
            );
            
            // Filter completed courses (IS completed)
            this.completedCourses = this.allCourses.filter(course => 
                course.isCompleted || course.status === 'Completed' || course.status === 'Passed'
            );
            
            // Apply view filter
            if (this.currentFilter === 'active') {
                this.completedCourses = [];
            } else if (this.currentFilter === 'completed') {
                this.activeCourses = [];
            }
            
            console.log(`📊 Data filter applied - Active: ${this.activeCourses.length}, Completed: ${this.completedCourses.length}`);
            
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
                    
                    <!-- COURSE NAME -->
                    <h4 class="course-title">${this.escapeHtml(course.displayName)}</h4>
                    
                    <!-- PROGRAM UNDER COURSE NAME -->
                    <div class="course-program-display">
                        <span class="program-badge ${course.programBadgeClass}">
                            <i class="fas ${course.programIcon}"></i> 
                            ${this.escapeHtml(course.programDisplay)}
                        </span>
                        ${this.isTVETStudent && course.programLevel && course.programLevel !== 'OTHER' ? `
                            <span class="program-level">
                                <i class="fas fa-certificate"></i> ${this.escapeHtml(course.programLevel)}
                            </span>
                        ` : ''}
                    </div>
                    
                    <div class="course-meta">
                        <span class="course-term-block">
                            <i class="fas ${course.isTVETCourse ? 'fa-calendar-alt' : 'fa-th-large'}"></i>
                            ${this.escapeHtml(course.block || 'General')}
                        </span>
                        <span class="course-intake">
                            <i class="far fa-calendar"></i> ${this.escapeHtml(course.intake_year || 'N/A')}
                        </span>
                        ${course.durationDisplay ? `
                            <span class="course-duration">
                                <i class="far fa-clock"></i> ${course.durationDisplay}
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
            
            // PERFECT COLUMN ARRANGEMENT FOR COMPLETED COURSES:
            // 1. Course Name (with Program UNDER it)
            // 2. Unit Code
            // 3. Credits
            // 4. Term Column (Block or Term)
            // 5. Completion Date
            // 6. Status
            
            const html = this.completedCourses.map(course => `
                <tr>
                    <!-- COLUMN 1: COURSE NAME WITH PROGRAM UNDERNEATH -->
                    <td>
                        <div class="course-name-with-program">
                            <strong class="course-name-title">${this.escapeHtml(course.displayName)}</strong>
                            <div class="program-under-name ${course.programBadgeClass}">
                                <i class="fas ${course.programIcon}"></i> 
                                ${this.escapeHtml(course.programDisplay)}
                            </div>
                        </div>
                    </td>
                    
                    <!-- COLUMN 2: UNIT CODE -->
                    <td>
                        <code class="unit-code-display">${this.escapeHtml(course.unit_code || 'N/A')}</code>
                    </td>
                    
                    <!-- COLUMN 3: CREDITS -->
                    <td class="text-center credits-column">
                        <span class="credits-badge">${course.credits || 3}</span>
                    </td>
                    
                    <!-- COLUMN 4: TERM/BLOCK COLUMN -->
                    <td class="text-center term-column">
                        <span class="term-block-display">
                            <i class="fas ${course.isTVETCourse ? 'fa-calendar-alt' : 'fa-th-large'}"></i>
                            ${this.escapeHtml(course.block || 'General')}
                        </span>
                        <small class="text-muted d-block">
                            (Intake: ${course.intake_year || 'N/A'})
                        </small>
                    </td>
                    
                    <!-- COLUMN 5: COMPLETION DATE -->
                    <td class="text-center completion-date">
                        <i class="far fa-check-circle text-success"></i>
                        ${course.formattedCreatedAt}
                    </td>
                    
                    <!-- COLUMN 6: STATUS -->
                    <td class="text-center status-column">
                        <span class="status-badge completed">Completed</span>
                    </td>
                </tr>
            `).join('');
            
            this.completedTable.innerHTML = html;
            
            // Update credits earned
            this.updateCreditsEarned();
        }
        
        updateCreditsEarned() {
            const creditsEarnedElement = document.getElementById('credits-earned');
            if (creditsEarnedElement) {
                const totalCredits = this.completedCourses.reduce((sum, course) => {
                    return sum + (course.credits || 0);
                }, 0);
                creditsEarnedElement.textContent = `${totalCredits} credits earned`;
            }
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
            const programText = this.programName ? ` for ${this.programName}` : '';
            
            const loadingHTML = `
                <div style="text-align: center; padding: 40px;">
                    <div class="loading-spinner"></div>
                    <p>Loading ${programType} courses${programText}...</p>
                    <small class="text-muted">
                        ${blockTerm} | Intake: ${this.intakeYear}
                    </small>
                </div>
            `;
            
            if (this.activeGrid) this.activeGrid.innerHTML = loadingHTML;
            if (this.completedTable) {
                this.completedTable.innerHTML = `
                    <tr><td colspan="6">${loadingHTML}</td></tr>
                `;
            }
        }
        
        showNoCoursesFound() {
            const programType = this.isTVETStudent ? 'TVET' : 'KRCHN';
            const blockTerm = this.isTVETStudent ? `Term: ${this.userTerm}` : `Block: ${this.userBlock}`;
            const programText = this.programName ? ` for ${this.programName}` : '';
            
            const noCoursesHTML = `
                <div style="text-align: center; padding: 40px;">
                    <div style="font-size: 48px; color: #9ca3af; margin-bottom: 20px;">
                        <i class="fas fa-book-open"></i>
                    </div>
                    <h4>No Courses Found</h4>
                    <p class="text-muted">
                        No ${programType} courses found${programText}<br>
                        <strong>Applied Filters:</strong><br>
                        • Intake Year: ${this.intakeYear}<br>
                        • ${blockTerm}<br>
                        • Program Code: ${this.programCode}<br><br>
                        <small>Note: Both active and completed courses are filtered by intake year and block/term.</small>
                    </p>
                    <button onclick="window.coursesModule.loadCourses()" class="btn btn-primary mt-3">
                        <i class="fas fa-sync-alt"></i> Try Again
                    </button>
                </div>
            `;
            
            if (this.activeGrid) this.activeGrid.innerHTML = noCoursesHTML;
            if (this.completedTable) {
                this.completedTable.innerHTML = `
                    <tr><td colspan="6">${noCoursesHTML}</td></tr>
                `;
            }
        }
        
        showError(message) {
            const errorHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${message}</p>
                    <small class="text-muted">
                        Program: ${this.programName || this.programCode} (${this.isTVETStudent ? 'TVET' : 'KRCHN'})
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
                    <tr><td colspan="6">${errorHTML}</td></tr>
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
                    programCode: this.programCode,
                    programName: this.programName,
                    programLevel: this.programLevel,
                    intakeYear: this.intakeYear,
                    block: this.userBlock,
                    term: this.userTerm,
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
                    programCode: this.programCode,
                    programName: this.programName,
                    intakeYear: this.intakeYear,
                    block: this.userBlock,
                    term: this.userTerm,
                    timestamp: new Date().toISOString()
                }
            });
            document.dispatchEvent(event);
            
            window.coursesData = {
                allCourses: this.allCourses,
                activeCount: this.activeCourses.length,
                completedCount: this.completedCourses.length,
                loaded: this.loaded,
                isTVETStudent: this.isTVETStudent,
                programCode: this.programCode,
                programName: this.programName,
                programLevel: this.programLevel,
                intakeYear: this.intakeYear,
                block: this.userBlock,
                term: this.userTerm
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
                                <strong>Course Display Format:</strong><br>
                                • Course Name with Program underneath<br>
                                • Term/Block in separate column<br>
                                • Perfect column arrangement for completed courses<br>
                                • Both active and completed courses filtered by intake year and block/term
                            </p>
                        </div>
                    </div>
                `;
            }
        }
        
        getStudentProgramInfo() {
            return {
                programCode: this.programCode,
                programName: this.programName,
                programType: this.programType,
                programLevel: this.programLevel,
                isTVETStudent: this.isTVETStudent,
                intakeYear: this.intakeYear,
                block: this.userBlock,
                term: this.userTerm
            };
        }
        
        // New method to get completed courses with current filters
        getCompletedCourses() {
            return this.completedCourses;
        }
        
        // New method to get active courses with current filters
        getActiveCourses() {
            return this.activeCourses;
        }
        
        // Method to check if filters are being applied to completed courses
        getAppliedFilters() {
            return {
                intakeYear: this.intakeYear,
                block: this.userBlock,
                term: this.userTerm,
                programType: this.programType,
                programCode: this.programCode
            };
        }
    }
    
    // Create global instance
    window.coursesModule = new CoursesModule();
    
    // Global functions
    window.getActiveCourseCount = () => window.coursesModule?.getActiveCourseCount() || 0;
    window.getAllCourses = () => window.coursesModule?.getAllCourses() || [];
    window.getCompletedCourses = () => window.coursesModule?.getCompletedCourses() || [];
    window.getActiveCourses = () => window.coursesModule?.getActiveCourses() || [];
    window.getAppliedFilters = () => window.coursesModule?.getAppliedFilters() || {};
    window.loadCourses = () => window.coursesModule?.refresh();
    window.getCoursesProgramInfo = () => window.coursesModule?.getStudentProgramInfo() || {
        programCode: 'Unknown',
        programName: 'Unknown Program',
        programType: 'Unknown',
        programLevel: 'Unknown',
        isTVETStudent: false,
        intakeYear: 2025,
        block: null,
        term: null
    };
    window.getTVETPrograms = () => window.coursesModule?.TVET_PROGRAMS || [];
    
    console.log('✅ Courses module ready with ENHANCED FILTERING for completed courses!');
})();
