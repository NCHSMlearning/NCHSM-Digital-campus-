// courses.js - Shows APPROVED units from student_unit_registrations with working stats
(function() {
    'use strict';
    
    console.log('✅ courses.js - Loading approved units from registrations...');
    
    class CoursesModule {
        constructor() {
            console.log('📚 CoursesModule initialized');
            
            // Store data
            this.approvedUnits = [];
            this.userProfile = null;
            this.loaded = false;
            
            // User data
            this.programCode = null;
            this.intakeYear = null;
            this.userBlock = null;
            this.userTerm = null;
            this.isTVETStudent = false;
            
            // DOM elements
            this.cacheElements();
            
            // Initialize event listeners
            this.initializeEventListeners();
            
            // Set up login event listeners
            this.setupLoginListeners();
            
            // Try to load if user is already logged in
            setTimeout(() => this.tryLoadIfLoggedIn(), 1500);
        }
        
        cacheElements() {
            this.activeCoursesGrid = document.getElementById('active-courses-grid');
            this.activeCountEl = document.getElementById('active-courses-count');
            this.completedCountEl = document.getElementById('completed-courses-count');
            this.totalCreditsEl = document.getElementById('total-credits');
            this.completedTable = document.getElementById('completed-courses-table');
            this.programIndicator = document.getElementById('courses-program-indicator');
            this.refreshBtn = document.getElementById('refresh-courses-btn');
            this.viewAllBtn = document.getElementById('view-all-courses');
            this.viewActiveBtn = document.getElementById('view-active-only');
            this.viewCompletedBtn = document.getElementById('view-completed-only');
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
            
            document.addEventListener('unitRegistrationReady', (e) => {
                console.log('📚 Unit registration updated, refreshing courses...');
                if (this.userProfile) {
                    this.loadCourses();
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
        
        getUserProfileFromAnySource() {
            const sources = [
                () => window.db?.currentUserProfile,
                () => window.currentUserProfile,
                () => window.databaseModule?.currentUserProfile,
                () => window.unitRegistrationModule?.userProfile,
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
        
        updateUserData() {
            if (this.userProfile) {
                const programFromProfile = this.userProfile.program || 'KRCHN';
                this.intakeYear = this.userProfile.intake_year || 2025;
                this.programCode = programFromProfile;
                
                const tvetPrograms = ['DPOTT', 'DCH', 'DHRIT', 'DSL', 'DSW', 'DCJS', 'DHSS', 'DICT', 'DME',
                                      'CPOTT', 'CCH', 'CHRIT', 'CPC', 'CSL', 'CSW', 'CCJS', 'CAG', 'CHSS', 'CICT',
                                      'ACH', 'AAG', 'ASW', 'CCA', 'PTE'];
                this.isTVETStudent = tvetPrograms.includes(programFromProfile);
                
                if (this.isTVETStudent) {
                    this.userTerm = this.userProfile.term || this.userProfile.block || 'Term1';
                    this.userBlock = null;
                } else {
                    this.userBlock = this.userProfile.block || 'A';
                    this.userTerm = null;
                }
                
                console.log('🎯 User data updated:', {
                    program: this.programCode,
                    type: this.isTVETStudent ? 'TVET' : 'KRCHN',
                    blockTerm: this.isTVETStudent ? this.userTerm : this.userBlock
                });
                
                return true;
            }
            return false;
        }
        
        initializeEventListeners() {
            if (this.refreshBtn) {
                this.refreshBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (!this.userProfile) {
                        this.showError('Please log in first');
                        return;
                    }
                    this.loadCourses();
                });
            }
            
            if (this.viewAllBtn) {
                this.viewAllBtn.addEventListener('click', () => this.showAllCourses());
            }
            if (this.viewActiveBtn) {
                this.viewActiveBtn.addEventListener('click', () => this.showActiveCourses());
            }
            if (this.viewCompletedBtn) {
                this.viewCompletedBtn.addEventListener('click', () => this.showCompletedCourses());
            }
        }
        
        async loadCourses() {
            console.log('📥 Loading approved courses from registrations...');
            
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
                const studentId = this.userProfile?.user_id || this.userProfile?.id;
                
                if (!supabase || !studentId) {
                    throw new Error('Database connection or student ID not available');
                }
                
                // Get ALL approved units (no block filter)
                let query = supabase
                    .from('student_unit_registrations')
                    .select('*')
                    .eq('student_id', studentId)
                    .eq('status', 'approved');
                
                const { data: registrations, error: regError } = await query
                    .order('unit_code', { ascending: true });
                
                if (regError) throw regError;
                
                this.approvedUnits = registrations || [];
                
                console.log(`✅ Found ${this.approvedUnits.length} approved units`);
                
                // Display the approved units
                this.displayActiveCourses();
                
                // Update all stats
                this.updateStats();
                
                this.loaded = true;
                this.dispatchModuleReadyEvent();
                
                // Also trigger dashboard update
                document.dispatchEvent(new CustomEvent('studentStatsUpdated', {
                    detail: { approvedUnits: this.approvedUnits.length }
                }));
                
            } catch (error) {
                console.error('❌ Error loading courses:', error);
                this.showError(error.message);
            }
        }
        
        // NEW: Update statistics (Active Courses, Completed, Credits Earned)
        updateStats() {
            console.log('📊 Updating course module statistics...');
            
            // Calculate total credits
            let totalCredits = 0;
            for (const unit of this.approvedUnits) {
                // If credits field exists, use it; otherwise default to 3
                totalCredits += unit.credits || 3;
            }
            
            // Update Active Courses count
            if (this.activeCountEl) {
                this.activeCountEl.textContent = this.approvedUnits.length;
            }
            
            // Update Completed Courses count (0 for now - will implement later)
            if (this.completedCountEl) {
                this.completedCountEl.textContent = '0';
            }
            
            // Update Total Credits Earned
            if (this.totalCreditsEl) {
                this.totalCreditsEl.textContent = totalCredits;
            }
            
            console.log(`📊 Stats updated: ${this.approvedUnits.length} active courses, ${totalCredits} credits`);
        }
        
        displayActiveCourses() {
            if (!this.activeCoursesGrid) return;
            
            if (this.approvedUnits.length === 0) {
                this.activeCoursesGrid.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-book-open"></i>
                        <h4>No Approved Units</h4>
                        <p>You don't have any approved units yet.</p>
                        <button onclick="window.ui.showTab('learning-hub')" class="btn-primary">
                            <i class="fas fa-plus-circle"></i> Register Units
                        </button>
                    </div>
                `;
                return;
            }
            
            const blockTermLabel = this.isTVETStudent ? 'Term' : 'Block';
            const blockTermValue = this.isTVETStudent ? this.userTerm : this.userBlock;
            
            let html = '';
            for (const unit of this.approvedUnits) {
                html += `
                    <div class="course-card">
                        <div class="course-header">
                            <span class="course-code">${this.escapeHtml(unit.unit_code)}</span>
                            <span class="status-badge approved">Approved</span>
                        </div>
                        
                        <h4 class="course-title">${this.escapeHtml(unit.unit_name)}</h4>
                        
                        <div class="course-program-display">
                            <span class="program-badge ${this.isTVETStudent ? 'badge-tvet' : 'badge-krchn'}">
                                <i class="fas ${this.isTVETStudent ? 'fa-tools' : 'fa-graduation-cap'}"></i> 
                                ${this.programCode} Program
                            </span>
                        </div>
                        
                        <div class="course-meta">
                            <span class="course-term-block">
                                <i class="fas ${this.isTVETStudent ? 'fa-calendar-alt' : 'fa-th-large'}"></i>
                                ${blockTermLabel}: ${unit.block || blockTermValue}
                            </span>
                            <span class="course-reg-type">
                                <i class="fas fa-tag"></i>
                                ${unit.reg_type || 'Normal'}
                            </span>
                            <span class="course-approval-date">
                                <i class="fas fa-check-circle"></i>
                                Approved: ${unit.approval_date || 'N/A'}
                            </span>
                            <span class="course-credits">
                                <i class="fas fa-star"></i>
                                ${unit.credits || 3} Credits
                            </span>
                        </div>
                    </div>
                `;
            }
            
            this.activeCoursesGrid.innerHTML = html;
        }
        
        showAllCourses() {
            this.displayActiveCourses();
            this.updateFilterButtons('all');
        }
        
        showActiveCourses() {
            this.displayActiveCourses();
            this.updateFilterButtons('active');
        }
        
        showCompletedCourses() {
            // For now, just show message since no completed courses
            if (this.activeCoursesGrid) {
                this.activeCoursesGrid.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-check-circle"></i>
                        <h4>No Completed Courses Yet</h4>
                        <p>Complete your active courses to see them here.</p>
                    </div>
                `;
            }
            this.updateFilterButtons('completed');
        }
        
        updateFilterButtons(activeFilter) {
            if (this.viewAllBtn) {
                this.viewAllBtn.classList.toggle('active', activeFilter === 'all');
            }
            if (this.viewActiveBtn) {
                this.viewActiveBtn.classList.toggle('active', activeFilter === 'active');
            }
            if (this.viewCompletedBtn) {
                this.viewCompletedBtn.classList.toggle('active', activeFilter === 'completed');
            }
        }
        
        updateProgramIndicator() {
            if (this.programIndicator) {
                const badgeClass = this.isTVETStudent ? 'badge-tvet' : 'badge-krchn';
                const icon = this.isTVETStudent ? 'fa-tools' : 'fa-graduation-cap';
                const blockTermText = this.isTVETStudent ? `Term: ${this.userTerm}` : `Block: ${this.userBlock}`;
                
                this.programIndicator.innerHTML = `
                    <span class="badge ${badgeClass}">
                        <i class="fas ${icon}"></i>
                        ${this.programCode} Program
                        <span class="ms-2">${blockTermText}</span>
                        <small class="ms-2 opacity-75">
                            (${this.approvedUnits.length} approved units)
                        </small>
                    </span>
                `;
            }
        }
        
        showLoading() {
            if (this.activeCoursesGrid) {
                this.activeCoursesGrid.innerHTML = `
                    <div style="text-align: center; padding: 40px;">
                        <div class="loading-spinner"></div>
                        <p>Loading your approved courses...</p>
                    </div>
                `;
            }
        }
        
        showError(message) {
            if (this.activeCoursesGrid) {
                this.activeCoursesGrid.innerHTML = `
                    <div class="error-state" style="text-align: center; padding: 40px;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #dc2626; margin-bottom: 15px; display: block;"></i>
                        <p style="color: #dc2626;">${message}</p>
                        <button onclick="window.coursesModule.loadCourses()" class="btn-primary" style="margin-top: 15px;">Try Again</button>
                    </div>
                `;
            }
        }
        
        showWaitingForLogin() {
            if (this.activeCoursesGrid && !this.loaded) {
                this.activeCoursesGrid.innerHTML = `
                    <div class="waiting-state" style="text-align: center; padding: 40px;">
                        <i class="fas fa-spinner fa-spin" style="font-size: 48px; color: #4C1D95; margin-bottom: 15px; display: block;"></i>
                        <p>Please log in to view your courses</p>
                    </div>
                `;
            }
        }
        
        dispatchModuleReadyEvent() {
            const event = new CustomEvent('coursesModuleReady', {
                detail: {
                    courses: this.approvedUnits,
                    activeCount: this.approvedUnits.length,
                    totalCredits: this.approvedUnits.reduce((sum, u) => sum + (u.credits || 3), 0),
                    isTVETStudent: this.isTVETStudent,
                    programCode: this.programCode,
                    intakeYear: this.intakeYear,
                    block: this.userBlock,
                    term: this.userTerm,
                    timestamp: new Date().toISOString()
                }
            });
            document.dispatchEvent(event);
        }
        
        getActiveCourseCount() {
            return this.approvedUnits.length;
        }
        
        getAllCourses() {
            return this.approvedUnits;
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
        
        getStudentProgramInfo() {
            return {
                programCode: this.programCode,
                programType: this.isTVETStudent ? 'TVET' : 'KRCHN',
                intakeYear: this.intakeYear,
                block: this.userBlock,
                term: this.userTerm
            };
        }
    }
    
    // Create global instance
    window.coursesModule = new CoursesModule();
    
    // Global functions
    window.getActiveCourseCount = () => window.coursesModule?.getActiveCourseCount() || 0;
    window.getAllCourses = () => window.coursesModule?.getAllCourses() || [];
    window.loadCourses = () => window.coursesModule?.refresh();
    window.getCoursesProgramInfo = () => window.coursesModule?.getStudentProgramInfo() || {};
    
    console.log('✅ Courses module ready - shows approved units with working stats!');
})();
