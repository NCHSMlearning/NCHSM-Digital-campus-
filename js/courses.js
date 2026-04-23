// courses.js - Shows APPROVED units from student_unit_registrations
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
            this.programType = null;
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
            this.activeCountEl = document.getElementById('active-count');
            this.programIndicator = document.getElementById('courses-program-indicator');
            this.refreshBtn = document.getElementById('refresh-courses-btn');
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
                
                // STEP 1: Get approved unit registrations
                let query = supabase
                    .from('student_unit_registrations')
                    .select('*')
                    .eq('student_id', studentId)
                    .eq('status', 'approved');
                
                // Filter by current block/term
                if (this.isTVETStudent && this.userTerm) {
                    query = query.eq('block', this.userTerm);
                } else if (!this.isTVETStudent && this.userBlock) {
                    query = query.eq('block', this.userBlock);
                }
                
                const { data: registrations, error: regError } = await query
                    .order('unit_code', { ascending: true });
                
                if (regError) throw regError;
                
                this.approvedUnits = registrations || [];
                
                console.log(`✅ Found ${this.approvedUnits.length} approved units`);
                
                // Display the approved units
                this.displayActiveCourses();
                this.updateCounts();
                this.updateProgramIndicator();
                
                this.loaded = true;
                this.dispatchModuleReadyEvent();
                
            } catch (error) {
                console.error('❌ Error loading courses:', error);
                this.showError(error.message);
            }
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
                            <span class="status-badge approved">✓ Approved</span>
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
                                ${blockTermLabel}: ${blockTermValue}
                            </span>
                            <span class="course-reg-type">
                                <i class="fas fa-tag"></i>
                                ${unit.reg_type || 'Normal'}
                            </span>
                            <span class="course-approval-date">
                                <i class="fas fa-check-circle"></i>
                                Approved: ${unit.approval_date || 'N/A'}
                            </span>
                        </div>
                        
                        <div class="course-description">
                            ${this.escapeHtml(unit.description || 'No description available')}
                        </div>
                    </div>
                `;
            }
            
            this.activeCoursesGrid.innerHTML = html;
        }
        
        updateCounts() {
            if (this.activeCountEl) {
                this.activeCountEl.textContent = `${this.approvedUnits.length} course${this.approvedUnits.length !== 1 ? 's' : ''}`;
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
                    <div class="error-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>${message}</p>
                        <button onclick="window.coursesModule.loadCourses()" class="btn-primary">Try Again</button>
                    </div>
                `;
            }
        }
        
        showWaitingForLogin() {
            if (this.activeCoursesGrid && !this.loaded) {
                this.activeCoursesGrid.innerHTML = `
                    <div class="waiting-state">
                        <i class="fas fa-spinner fa-spin"></i>
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
    
    console.log('✅ Courses module ready - shows approved units only!');
})();
