class DashboardModule {
    constructor(supabaseClient) {
        console.log('🚀 Initializing DashboardModule...');
        
        // Get Supabase from window.db.supabase
        this.sb = supabaseClient || window.sb || window.db?.supabase;
        
        if (!this.sb) {
            console.error('❌ Dashboard: No Supabase client!');
            console.log('   Available: window.db.supabase =', !!window.db?.supabase);
            console.log('   Available: window.sb =', !!window.sb);
            
            // Try to auto-fix
            if (window.db?.supabase && !window.sb) {
                console.log('🔧 Auto-fixing: Setting window.sb = window.db.supabase');
                window.sb = window.db.supabase;
                this.sb = window.db.supabase;
            }
        } else {
            console.log('✅ Dashboard: Supabase client ready');
        }
        
        this.userId = null;
        this.userProfile = null;
        this.cachedCourses = [];
        this.autoRefreshInterval = null;
        
        // Cache elements
        this.cacheElements();
        
        // Setup - WITHOUT dropdown handlers
        this.setupEventListeners();
        this.startLiveClock();
        
        console.log('✅ DashboardModule initialized');
    }
    
    cacheElements() {
        console.log('🔍 Caching dashboard elements...');
        
        // Get ALL dashboard elements using multiple selectors
        this.elements = {
            // Welcome section
            welcomeHeader: document.getElementById('welcome-header'),
            welcomeMessage: document.getElementById('student-welcome-message'),
            studentAnnouncement: document.getElementById('student-announcement'),
            
            // Stats (dashboard cards)
            attendanceRate: document.getElementById('dashboard-attendance-rate'),
            verifiedCount: document.getElementById('dashboard-verified-count'),
            totalCount: document.getElementById('dashboard-total-count'),
            pendingCount: document.getElementById('dashboard-pending-count'),
            upcomingExam: document.getElementById('dashboard-upcoming-exam'),
            activeCourses: document.getElementById('dashboard-active-courses'),
            newResources: document.getElementById('dashboard-new-resources'),
            
            // Exam Card elements
            dashboardExamStatus: document.getElementById('dashboard-exam-status'),
            dashboardApprovedUnits: document.getElementById('dashboard-approved-units'),
            dashboardCurrentSemester: document.getElementById('dashboard-current-semester'),
            
            // NurseIQ
            nurseiqProgress: document.getElementById('dashboard-nurseiq-progress'),
            nurseiqAccuracy: document.getElementById('dashboard-nurseiq-accuracy'),
            nurseiqQuestions: document.getElementById('dashboard-nurseiq-questions'),
            
            // Card elements
            attendanceCard: document.querySelector('.stat-card[data-tab="attendance"]'),
            examsCard: document.querySelector('.stat-card[data-tab="cats"]'),
            coursesCard: document.querySelector('.stat-card[data-tab="courses"]'),
            resourcesCard: document.querySelector('.stat-card[data-tab="resources"]'),
            examCardCard: document.querySelector('.stat-card[data-tab="exam-card"]'),
            nurseiqCard: document.querySelector('.stat-card.nurseiq-card'),
            
            // Grid container
            dashboardGrid: document.querySelector('.cards-grid'),
            
            // Time (in footer)
            currentDateTime: document.getElementById('currentDateTime'),
            
            // HEADER elements
            headerTime: document.getElementById('header-time'),
            headerUserName: document.getElementById('header-user-name'),
            headerProfilePhoto: document.getElementById('header-profile-photo'),
            headerRefresh: document.getElementById('header-refresh'),
            
            // Mobile menu toggle
            mobileMenuToggle: document.getElementById('mobile-menu-toggle'),
            
            // Additional common selectors
            studentNameDisplay: document.getElementById('student-name-display'),
            userDisplayName: document.getElementById('user-display-name'),
            userName: document.getElementById('user-name'),
            studentProfilePic: document.getElementById('student-profile-pic')
        };
        
        // Log found elements
        const foundElements = Object.keys(this.elements).filter(k => this.elements[k]);
        console.log('✅ Found elements:', foundElements);
        
        if (foundElements.length === 0) {
            console.warn('⚠️ No dashboard elements found! Check HTML structure.');
        }
    }
    
    setupEventListeners() {
        console.log('🔧 Setting up dashboard event listeners...');
        
        // Listen for attendance events
        document.addEventListener('attendanceCheckedIn', () => {
            console.log('📊 Dashboard: attendanceCheckedIn event received');
            this.loadAttendanceMetrics();
        });
        
        // Listen for courses module ready event
        document.addEventListener('coursesModuleReady', (e) => {
            console.log('📚 Dashboard: coursesModuleReady event received with data:', e.detail);
            this.handleCoursesReady(e.detail);
        });
        
        // Listen for exams module ready event
        document.addEventListener('examsModuleReady', (e) => {
            console.log('📝 Dashboard: examsModuleReady event received with data:', e.detail);
            this.handleExamsReady(e.detail);
        });
        
        // Listen for profile photo updates
        document.addEventListener('profilePhotoUpdated', (e) => {
            console.log('📸 Dashboard: profilePhotoUpdated event received', e.detail);
            this.updateAllProfilePhotos(e.detail?.photoUrl);
        });
        
        // Listen for profile updates
        document.addEventListener('profileUpdated', () => {
            console.log('👤 Dashboard: profileUpdated event received');
            if (window.currentUserProfile) {
                this.userProfile = window.currentUserProfile;
                this.updateAllUserInfo();
            }
        });
        
        // Listen for NurseIQ metrics updates
        document.addEventListener('nurseiqMetricsUpdated', (e) => {
            console.log('🧠 Dashboard: NurseIQ metrics updated event received', e.detail);
            if (e.detail) {
                this.updateNurseIQUI(e.detail);
            }
        });
        
        // Header refresh button
        if (this.elements.headerRefresh) {
            this.elements.headerRefresh.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('🔄 Header refresh button clicked');
                this.refreshDashboard();
            });
        }
        
        // Dashboard refresh button
        const refreshBtn = document.getElementById('refreshDashboardBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshDashboard());
        }
        
        // Add click handlers to ALL cards for tab switching
        this.addCardClickHandlers();
        
        console.log('✅ Event listeners setup complete');
    }
    
    // Handle courses when they're ready
    handleCoursesReady(detail = null) {
        console.log('📚 Handling courses ready...');
        
        let activeCount = 0;
        
        if (detail && detail.activeCount !== undefined) {
            activeCount = detail.activeCount;
            console.log(`✅ Got active count from event: ${activeCount}`);
        } else if (window.coursesModule && window.coursesModule.getActiveCourseCount) {
            activeCount = window.coursesModule.getActiveCourseCount();
            console.log(`✅ Got active count from module: ${activeCount}`);
        } else if (window.coursesModule?.courses?.length > 0) {
            activeCount = window.coursesModule.courses.filter(c => 
                !c.status || !c.status.includes('Completed')
            ).length;
            console.log(`✅ Calculated active count: ${activeCount}`);
        }
        
        // Update UI immediately
        if (this.elements.activeCourses) {
            this.elements.activeCourses.textContent = activeCount;
            this.updateCardAppearance('courses', activeCount);
            
            // Dispatch update event
            const event = new CustomEvent('dashboardCoursesUpdated', {
                detail: { activeCount: activeCount }
            });
            document.dispatchEvent(event);
        }
        
        console.log(`✅ Courses updated: ${activeCount} active`);
    }
    
    // Handle exams when they're ready
    handleExamsReady(detail = null) {
        console.log('📝 Handling exams ready...');
        
        let metrics = null;
        
        if (detail && detail.metrics) {
            metrics = detail.metrics;
            console.log('✅ Got metrics from event:', metrics);
        } else if (typeof window.getExamsDashboardMetrics === 'function') {
            try {
                metrics = window.getExamsDashboardMetrics();
                console.log('✅ Got metrics from global function:', metrics);
            } catch (error) {
                console.warn('❌ Could not get exams metrics:', error);
            }
        }
        
        if (metrics) {
            this.updateExamsUI(metrics);
            
            // Cache the metrics
            try {
                localStorage.setItem('exams_dashboard_metrics', JSON.stringify({
                    ...metrics,
                    timestamp: new Date().toISOString()
                }));
            } catch (e) {
                console.warn('Could not cache metrics:', e);
            }
            
            // Dispatch update event
            const event = new CustomEvent('dashboardExamsUpdated', {
                detail: metrics
            });
            document.dispatchEvent(event);
        }
        
        console.log('✅ Exams metrics updated');
    }
    
    // Load Exam Card Dashboard Data - NO EMOJIS
    async loadExamCardDashboardData() {
        console.log('📇 Loading exam card dashboard data...');
        
        try {
            if (!this.userId || !this.sb) {
                console.warn('Cannot load exam card data: No user ID or Supabase');
                return;
            }
            
            // Get student's current block
            const { data: student, error: studentError } = await this.sb
                .from('consolidated_user_profiles_table')
                .select('block')
                .eq('user_id', this.userId)
                .single();
            
            if (studentError) {
                console.warn('Could not get student block:', studentError);
            }
            
            // Query for approved units
            let query = this.sb
                .from('student_unit_registrations')
                .select('id')
                .eq('student_id', this.userId)
                .eq('status', 'approved');
            
            // Filter by current block if available
            if (student && student.block && student.block !== 'Unknown') {
                query = query.eq('block', student.block);
            }
            
            const { data: registrations, error } = await query;
            
            if (error) throw error;
            
            const approvedCount = registrations?.length || 0;
            const isEligible = approvedCount > 0;
            const currentSemester = student?.block || 'Current Semester';
            
            // Update dashboard elements - NO EMOJIS
            if (this.elements.dashboardExamStatus) {
                this.elements.dashboardExamStatus.textContent = isEligible ? 'ELIGIBLE' : 'NOT ELIGIBLE';
                this.elements.dashboardExamStatus.style.color = isEligible ? '#059669' : '#dc2626';
            }
            
            if (this.elements.dashboardApprovedUnits) {
                this.elements.dashboardApprovedUnits.textContent = approvedCount;
            }
            
            if (this.elements.dashboardCurrentSemester) {
                this.elements.dashboardCurrentSemester.textContent = currentSemester;
            }
            
            console.log(`📇 Exam card data loaded: ${approvedCount} approved units for ${currentSemester}`);
            
        } catch (error) {
            console.error('Error loading exam card dashboard data:', error);
        }
    }
    
    addCardClickHandlers() {
        // Add click handlers to all stat cards
        const cards = document.querySelectorAll('.stat-card');
        cards.forEach(card => {
            // Remove any existing click handlers to prevent duplicates
            card.removeEventListener('click', this.handleCardClick);
            
            // Add new click handler
            card.addEventListener('click', (e) => {
                // Don't trigger if clicking on interactive elements inside card
                if (e.target.tagName === 'BUTTON' || 
                    e.target.tagName === 'A' || 
                    e.target.closest('button') || 
                    e.target.closest('a')) {
                    return;
                }
                
                const tab = card.getAttribute('data-tab');
                if (tab) {
                    console.log(`📱 Card clicked: ${tab}`);
                    this.switchToTab(tab);
                } else if (card.classList.contains('nurseiq-card')) {
                    console.log('🧠 NurseIQ card clicked');
                    this.switchToTab('nurseiq');
                } else if (card.classList.contains('examcard-card')) {
                    console.log('📇 Exam card clicked');
                    this.switchToTab('exam-card');
                }
            });
            
            // Add keyboard support
            card.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    const tab = card.getAttribute('data-tab');
                    if (tab) {
                        console.log(`📱 Card activated: ${tab}`);
                        this.switchToTab(tab);
                        e.preventDefault();
                    } else if (card.classList.contains('nurseiq-card')) {
                        console.log('🧠 NurseIQ card activated');
                        this.switchToTab('nurseiq');
                        e.preventDefault();
                    } else if (card.classList.contains('examcard-card')) {
                        console.log('📇 Exam card activated');
                        this.switchToTab('exam-card');
                        e.preventDefault();
                    }
                }
            });
            
            // Add hover effects
            card.addEventListener('mouseenter', () => {
                card.style.cursor = 'pointer';
                card.style.transform = 'translateY(-2px)';
                card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                card.style.transition = 'all 0.2s ease';
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0)';
                card.style.boxShadow = '';
            });
        });
        
        console.log(`✅ Added click handlers to ${cards.length} cards`);
    }
    
    switchToTab(tabName) {
        console.log(`🔄 Switching to tab: ${tabName}`);
        
        // Add visual feedback
        const activeTab = document.querySelector(`.nav-link[href="#${tabName}"]`);
        if (activeTab) {
            // Simulate click on the actual tab
            activeTab.click();
        } else {
            // Fallback: dispatch event to switch tabs
            const event = new CustomEvent('switchTab', {
                detail: { tab: tabName }
            });
            document.dispatchEvent(event);
        }
        
        // Highlight the clicked card
        this.highlightClickedCard(tabName);
    }
    
    highlightClickedCard(tabName) {
        // Remove highlight from all cards
        document.querySelectorAll('.stat-card').forEach(card => {
            card.classList.remove('card-clicked');
        });
        
        // Add highlight to clicked card
        let card;
        if (tabName === 'nurseiq') {
            card = document.querySelector('.stat-card.nurseiq-card');
        } else if (tabName === 'exam-card') {
            card = document.querySelector('.stat-card.examcard-card');
        } else {
            card = document.querySelector(`.stat-card[data-tab="${tabName}"]`);
        }
        
        if (card) {
            card.classList.add('card-clicked');
            // Remove highlight after 1 second
            setTimeout(() => {
                card.classList.remove('card-clicked');
            }, 1000);
        }
    }
    
    async initialize(userId, userProfile) {
        console.log('👤 Dashboard initializing with user:', userId);
        console.log('👤 User profile data:', userProfile);
        
        this.userId = userId;
        this.userProfile = userProfile;
        
        if (!userId || !userProfile) {
            console.error('❌ Dashboard: Missing user data');
            return false;
        }
        
        // Update ALL user info immediately
        console.log('🔄 Updating all user info...');
        this.updateAllUserInfo();
        
        // Show loading states
        this.showLoadingStates();
        
        // Start auto-refresh for real-time updates
        this.startAutoRefresh();
        
        // Load dashboard with SMART timing
        console.log('📊 Loading ALL dashboard data with smart timing...');
        await this.initializeDashboardWithSmartTiming();
        
        // Schedule delayed updates for modules that take time
        this.scheduleDelayedUpdates();
        
        // Re-add click handlers after content loads
        setTimeout(() => {
            this.addCardClickHandlers();
        }, 1500);
        
        return true;
    }
    
    // Initialize dashboard with smart timing
    async initializeDashboardWithSmartTiming() {
        console.log('🔄 Initializing dashboard with smart timing...');
        
        // PHASE 1: Load IMMEDIATE data (fast)
        console.log('⚡ Phase 1: Loading immediate data...');
        await Promise.allSettled([
            this.loadWelcomeDetails(),
            this.loadStudentMessage(),
            this.loadLatestOfficialAnnouncement(),
            this.loadAttendanceMetrics(),
            this.loadResourceMetrics(true),
            this.loadExamCardDashboardData()
        ]);
        
        // PHASE 2: Try to load courses (might be ready)
        console.log('📚 Phase 2: Trying to load courses...');
        await this.tryLoadCourses();
        
        // PHASE 3: Try to load exams (might be ready)
        console.log('📝 Phase 3: Trying to load exams...');
        await this.tryLoadExams();
        
        // PHASE 4: Load NurseIQ
        console.log('🧠 Phase 4: Loading NurseIQ...');
        await this.loadNurseIQMetrics();
        
        // PHASE 5: Final UI updates
        console.log('🎨 Phase 5: Final UI updates...');
        this.animateGridCards();
        this.updateAllCardsAppearance();
        
        console.log('✅ Dashboard initialization complete');
    }
    
    // Try to load courses with multiple attempts
    async tryLoadCourses() {
        console.log('🔄 Trying to load courses...');
        
        // ATTEMPT 1: Check if courses module is already ready
        if (window.coursesModule && window.coursesModule.courses && window.coursesModule.courses.length > 0) {
            console.log('✅ Courses module already loaded, using it');
            this.handleCoursesReady();
            return;
        }
        
        // ATTEMPT 2: Wait a bit for courses module
        console.log('⏳ Waiting 1 second for courses module...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (window.coursesModule && window.coursesModule.courses && window.coursesModule.courses.length > 0) {
            console.log('✅ Courses module loaded after 1s');
            this.handleCoursesReady();
            return;
        }
        
        // ATTEMPT 3: Try direct database query (fallback)
        console.log('📡 Falling back to database query for courses...');
        await this.loadCourseMetricsFromDB();
    }
    
    // Try to load exams with multiple attempts
    async tryLoadExams() {
        console.log('🔄 Trying to load exams...');
        
        // ATTEMPT 1: Check if exams module is already ready
        if (window.examsModule && window.examsModule.allExams && window.examsModule.allExams.length > 0) {
            console.log('✅ Exams module already loaded, using it');
            this.handleExamsReady();
            return;
        }
        
        // ATTEMPT 2: Wait a bit for exams module
        console.log('⏳ Waiting 1 second for exams module...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (window.examsModule && window.examsModule.allExams && window.examsModule.allExams.length > 0) {
            console.log('✅ Exams module loaded after 1s');
            this.handleExamsReady();
            return;
        }
        
        // ATTEMPT 3: Try cached metrics
        console.log('💾 Trying cached exam metrics...');
        const cached = this.getCachedExamMetrics();
        if (cached) {
            console.log('✅ Using cached exam metrics');
            this.updateExamsUI(cached);
            return;
        }
        
        // ATTEMPT 4: Try direct database query (fallback)
        console.log('📡 Falling back to database query for exams...');
        await this.loadExamMetricsFromDB();
    }
    
    // Schedule delayed updates for modules that take longer
    scheduleDelayedUpdates() {
        console.log('⏰ Scheduling delayed updates...');
        
        // Update after 2 seconds (courses might be loading)
        setTimeout(() => {
            console.log('🔄 2s delayed update: Checking courses...');
            if (window.coursesModule && window.coursesModule.courses && window.coursesModule.courses.length > 0) {
                console.log('✅ Courses now available, updating dashboard');
                this.handleCoursesReady();
            }
        }, 2000);
        
        // Update after 3 seconds (exams might be loading)
        setTimeout(() => {
            console.log('🔄 3s delayed update: Checking exams...');
            if (window.examsModule && window.examsModule.allExams && window.examsModule.allExams.length > 0) {
                console.log('✅ Exams now available, updating dashboard');
                this.handleExamsReady();
            } else if (typeof window.getExamsDashboardMetrics === 'function') {
                try {
                    const metrics = window.getExamsDashboardMetrics();
                    if (metrics && metrics.upcomingExam !== undefined) {
                        console.log('✅ Got exams metrics after 3s');
                        this.updateExamsUI(metrics);
                    }
                } catch (error) {
                    console.warn('Could not get exams metrics:', error);
                }
            }
        }, 3000);
        
        // Update exam card data after 3 seconds
        setTimeout(() => {
            console.log('📇 3s delayed update: Refreshing exam card data...');
            this.loadExamCardDashboardData();
        }, 3000);
        
        // Final update after 5 seconds
        setTimeout(() => {
            console.log('🔄 5s final update: Refreshing all metrics...');
            this.updateAllCardsAppearance();
            this.loadExamCardDashboardData();
            
            // Force check one more time
            if (window.coursesModule) {
                this.handleCoursesReady();
            }
            if (typeof window.getExamsDashboardMetrics === 'function') {
                try {
                    const metrics = window.getExamsDashboardMetrics();
                    this.updateExamsUI(metrics);
                } catch (error) {
                    console.warn('Final exam check failed:', error);
                }
            }
        }, 5000);
    }
    
    // Update ALL user information (name, photo, dropdown, etc.)
    updateAllUserInfo() {
        console.log('👤 Updating ALL user information...');
        
        if (!this.userProfile) {
            console.warn('⚠️ No user profile available');
            return;
        }
        
        const studentName = this.userProfile.full_name || 'Student';
        console.log('📝 Setting name to:', studentName);
        
        // Update header user name
        if (this.elements.headerUserName) {
            this.elements.headerUserName.textContent = studentName;
            console.log('✅ Updated header-user-name');
        }
        
        // Update welcome header
        if (this.elements.welcomeHeader) {
            const getGreeting = (hour) => {
                if (hour >= 5 && hour < 12) return "Good Morning";
                if (hour >= 12 && hour < 17) return "Good Afternoon";
                if (hour >= 17 && hour < 21) return "Good Evening";
                return "Good Night";
            };
            
            const now = new Date();
            const hour = now.getHours();
            this.elements.welcomeHeader.textContent = `${getGreeting(hour)}, ${studentName}!`;
        }
        
        // Update profile photos
        this.updateAllProfilePhotos();
    }
    
    // Update ALL profile photo elements
    updateAllProfilePhotos(photoUrl = null) {
        console.log('📸 Updating ALL profile photos...');
        
        let finalPhotoUrl = photoUrl;
        
        // Determine which photo URL to use
        if (!finalPhotoUrl) {
            const nameForAvatar = this.userProfile?.full_name?.replace(/\s+/g, '+') || 'Student';
            finalPhotoUrl = `https://ui-avatars.com/api/?name=${nameForAvatar}&background=667eea&color=fff&size=100`;
        }
        
        console.log('✅ Using photo URL:', finalPhotoUrl);
        
        // Update specific profile photo elements
        if (this.elements.headerProfilePhoto) {
            this.elements.headerProfilePhoto.src = finalPhotoUrl;
            this.elements.headerProfilePhoto.onerror = () => {
                const nameForAvatar = this.userProfile?.full_name?.replace(/\s+/g, '+') || 'Student';
                this.elements.headerProfilePhoto.src = `https://ui-avatars.com/api/?name=${nameForAvatar}&background=667eea&color=fff&size=100`;
            };
        }
        
        if (this.elements.studentProfilePic) {
            this.elements.studentProfilePic.src = finalPhotoUrl;
        }
        
        // Cache the photo URL
        localStorage.setItem('userProfilePhoto', finalPhotoUrl);
    }
    
    // Get cached exam metrics
    getCachedExamMetrics() {
        try {
            const cached = localStorage.getItem('exams_dashboard_metrics');
            if (cached) {
                const metrics = JSON.parse(cached);
                const cachedTime = new Date(metrics.timestamp || 0);
                const now = new Date();
                const hoursDiff = (now - cachedTime) / (1000 * 60 * 60);
                
                // Use if less than 2 hours old
                if (hoursDiff < 2) {
                    console.log('💾 Using cached exam metrics (', hoursDiff.toFixed(1), 'hours old)');
                    return metrics;
                }
            }
        } catch (error) {
            console.warn('Could not parse cached metrics:', error);
        }
        return null;
    }
    
    // Load course metrics from database (fallback)
    async loadCourseMetricsFromDB() {
        if (!this.userProfile || !this.sb) {
            console.warn('⚠️ Cannot load courses: No user profile or Supabase');
            this.showErrorState('courses');
            return;
        }
        
        try {
            const program = this.userProfile.program || 'KRCHN';
            const intakeYear = this.userProfile.intake_year || 2025;
            const block = this.userProfile.block || 'A';
            
            let query = this.sb
                .from('courses')
                .select('*')
                .eq('intake_year', intakeYear)
                .order('course_name', { ascending: true });
            
            const isTVET = this.isTVETProgram(program);
            
            if (isTVET) {
                query = query
                    .eq('target_program', program)
                    .or(`block.eq.${this.userProfile.term || 'Term 1'},block.eq.General,block.is.null`);
            } else {
                query = query
                    .or(`target_program.eq.${program},target_program.eq.General`)
                    .or(`block.eq.${block},block.is.null,block.eq.General`);
            }
            
            const { data: courses, error } = await query;
            
            if (error) throw error;
            
            const activeCount = courses?.filter(course => {
                const isCompleted = course.status === 'Completed' || course.status === 'Passed';
                return !isCompleted && course.status !== 'Completed';
            }).length || 0;
            
            if (this.elements.activeCourses) {
                this.elements.activeCourses.textContent = activeCount;
                this.updateCardAppearance('courses', activeCount);
            }
            
            console.log(`✅ Courses (DB): ${activeCount} active`);
            
        } catch (error) {
            console.error('❌ Error loading courses from DB:', error);
            this.showErrorState('courses');
        }
    }
    
    // Load exam metrics from database (fallback)
    async loadExamMetricsFromDB() {
        if (!this.userProfile || !this.sb) {
            console.warn('⚠️ Cannot load exams: No user profile or Supabase');
            this.showErrorState('exams');
            return;
        }
        
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Query the 'exams' table directly
            const { data: exams, error } = await this.sb
                .from('exams')
                .select('exam_name, exam_date, status, exam_type, block_term')
                .eq('intake_year', this.userProfile.intake_year)
                .or(`target_program.eq.${this.userProfile.program},target_program.is.null,target_program.eq.General`)
                .or(`block_term.eq.${this.userProfile.block},block_term.is.null,block_term.eq.General`)
                .order('exam_date', { ascending: true })
                .limit(5);
            
            if (error) throw error;
            
            let upcomingText = 'None';
            let upcomingCount = 0;
            let upcomingExamName = '';
            
            if (exams && exams.length > 0) {
                // Filter exams that are upcoming (not completed)
                const upcomingExams = exams.filter(exam => {
                    if (exam.status === 'Completed') return false;
                    const examDate = new Date(exam.exam_date);
                    return examDate >= today;
                });
                
                upcomingCount = upcomingExams.length;
                
                if (upcomingExams.length > 0) {
                    upcomingExams.sort((a, b) => {
                        const dateA = new Date(a.exam_date);
                        const dateB = new Date(b.exam_date);
                        return dateA - dateB;
                    });
                    
                    const nextExam = upcomingExams[0];
                    upcomingExamName = nextExam.exam_name || 'Exam';
                    const examDate = new Date(nextExam.exam_date);
                    const diffDays = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));
                    
                    if (diffDays <= 0) upcomingText = 'Today';
                    else if (diffDays === 1) upcomingText = 'Tomorrow';
                    else if (diffDays <= 7) upcomingText = `${diffDays}d`;
                    else if (diffDays <= 30) upcomingText = `${Math.floor(diffDays / 7)}w`;
                    else upcomingText = examDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    
                    if (upcomingCount > 1) {
                        upcomingText += ` (+${upcomingCount - 1})`;
                    }
                }
            }
            
            const metrics = {
                upcomingExam: upcomingText,
                upcomingExamName: upcomingExamName,
                upcomingCount: upcomingCount,
                gradedExams: 0,
                averageScore: 0,
                bestScore: 0,
                passRate: 0,
                lastUpdated: new Date().toISOString()
            };
            
            this.updateExamsUI(metrics);
            
            console.log(`✅ Exams (DB): ${upcomingText} (${upcomingCount} active)`);
            
        } catch (error) {
            console.error('❌ Error loading exams from DB:', error);
            this.showErrorState('exams');
            
            // Set default values on error
            const metrics = {
                upcomingExam: 'Error loading',
                upcomingExamName: '',
                upcomingCount: 0,
                gradedExams: 0,
                averageScore: 0,
                bestScore: 0,
                passRate: 0,
                lastUpdated: new Date().toISOString()
            };
            this.updateExamsUI(metrics);
        }
    }
    
    // Animate grid cards appearance
    animateGridCards() {
        const cards = document.querySelectorAll('.stat-card');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }
    
    // Update ALL cards appearance
    updateAllCardsAppearance() {
        console.log('🎨 Updating all cards appearance...');
        
        // Attendance card
        const attendanceRate = parseInt(this.elements.attendanceRate?.textContent?.replace('%', '') || '0');
        this.updateCardAppearance('attendance', attendanceRate);
        
        // Courses card
        const activeCourses = parseInt(this.elements.activeCourses?.textContent || '0');
        this.updateCardAppearance('courses', activeCourses);
        
        // Resources card
        const resourceCount = parseInt(this.elements.newResources?.textContent || '0');
        this.updateCardAppearance('resources', resourceCount);
        
        // NurseIQ card
        const nurseiqProgress = parseInt(this.elements.nurseiqProgress?.textContent?.replace('%', '') || '0');
        this.updateCardAppearance('nurseiq', nurseiqProgress);
        
        // Exams card - color based on upcoming exam
        const upcomingExam = this.elements.upcomingExam?.textContent;
        if (upcomingExam === 'Today') {
            if (this.elements.examsCard) {
                this.elements.examsCard.classList.add('card-danger');
                this.elements.examsCard.classList.remove('card-warning', 'card-success');
            }
        } else if (upcomingExam && (upcomingExam.includes('d') || upcomingExam.includes('w'))) {
            if (this.elements.examsCard) {
                this.elements.examsCard.classList.add('card-warning');
                this.elements.examsCard.classList.remove('card-danger', 'card-success');
            }
        } else {
            if (this.elements.examsCard) {
                this.elements.examsCard.classList.remove('card-danger', 'card-warning', 'card-success');
            }
        }
    }
    
    // Update card appearance based on data
    updateCardAppearance(type, value) {
        const card = this.elements[`${type}Card`];
        if (!card) return;
        
        // Remove existing color classes
        card.classList.remove('card-success', 'card-warning', 'card-danger');
        
        // Add color based on value
        switch(type) {
            case 'attendance':
                if (value >= 80) card.classList.add('card-success');
                else if (value >= 60) card.classList.add('card-warning');
                else if (value > 0) card.classList.add('card-danger');
                break;
            case 'courses':
                if (value === 0) {
                    card.classList.add('card-warning');
                } else if (value >= 5) {
                    card.classList.add('card-success');
                }
                break;
            case 'resources':
                if (value >= 10) card.classList.add('card-success');
                else if (value >= 5) card.classList.add('card-warning');
                else if (value > 0) card.classList.add('card-danger');
                break;
            case 'nurseiq':
                if (value >= 75) card.classList.add('card-success');
                else if (value >= 50) card.classList.add('card-warning');
                else if (value > 0) card.classList.add('card-danger');
                break;
        }
    }
    
    async loadAttendanceMetrics() {
        console.log('📊 Loading attendance metrics...');
        
        if (!this.userId || !this.sb) {
            console.warn('⚠️ Cannot load attendance: No user ID or Supabase');
            this.showErrorState('attendance');
            return;
        }
        
        try {
            const { data: logs, error } = await this.sb
                .from('geo_attendance_logs')
                .select('is_verified')
                .eq('student_id', this.userId);
            
            if (error) {
                console.error('❌ Attendance query error:', error);
                this.showErrorState('attendance');
                return;
            }
            
            const totalLogs = logs?.length || 0;
            const verifiedCount = logs?.filter(l => l.is_verified === true).length || 0;
            const pendingCount = logs?.filter(l => !l.is_verified).length || 0;
            const attendanceRate = totalLogs > 0 ? Math.round((verifiedCount / totalLogs) * 100) : 0;
            
            // Update UI
            if (this.elements.attendanceRate) {
                this.elements.attendanceRate.textContent = `${attendanceRate}%`;
                if (attendanceRate >= 80) {
                    this.elements.attendanceRate.classList.add('dashboard-stat-high');
                    this.elements.attendanceRate.classList.remove('dashboard-stat-medium', 'dashboard-stat-low');
                } else if (attendanceRate >= 60) {
                    this.elements.attendanceRate.classList.add('dashboard-stat-medium');
                    this.elements.attendanceRate.classList.remove('dashboard-stat-high', 'dashboard-stat-low');
                } else {
                    this.elements.attendanceRate.classList.add('dashboard-stat-low');
                    this.elements.attendanceRate.classList.remove('dashboard-stat-high', 'dashboard-stat-medium');
                }
            }
            
            if (this.elements.verifiedCount) this.elements.verifiedCount.textContent = verifiedCount;
            if (this.elements.totalCount) this.elements.totalCount.textContent = totalLogs;
            if (this.elements.pendingCount) this.elements.pendingCount.textContent = pendingCount;
            
            // Update card appearance
            this.updateCardAppearance('attendance', attendanceRate);
            
            console.log(`✅ Attendance: ${attendanceRate}% (${verifiedCount}/${totalLogs})`);
            
        } catch (error) {
            console.error('❌ Error loading attendance:', error);
            this.showErrorState('attendance');
        }
    }
    
    isTVETProgram(program) {
        if (!program) return false;
        const tvetPrograms = ['TVET', 'TVET NURSING', 'TVET NURSING(A)', 'TVET NURSING(B)', 
                            'CRAFT CERTIFICATE', 'ARTISAN', 'DIPLOMA IN TVET'];
        return tvetPrograms.some(tvet => program.toUpperCase().includes(tvet));
    }
    
    // updateExamsUI - NO EMOJIS
    updateExamsUI(metrics) {
        if (!metrics) return;
        
        const upcomingText = metrics.upcomingExam || 'No upcoming exams';
        const upcomingName = metrics.upcomingExamName || '';
        const upcomingCount = metrics.upcomingCount || 0;
        
        if (this.elements.upcomingExam) {
            let displayText = upcomingText;
            
            if (upcomingName && upcomingName !== 'None' && upcomingName !== '' && !displayText.includes(upcomingName)) {
                if (upcomingCount === 1) {
                    displayText = upcomingName;
                } else if (upcomingCount > 1) {
                    displayText = `${upcomingName} (+${upcomingCount - 1})`;
                }
            }
            
            const maxLength = 25;
            if (displayText.length > maxLength) {
                displayText = displayText.substring(0, maxLength - 3) + '...';
            }
            
            this.elements.upcomingExam.textContent = displayText;
            this.elements.upcomingExam.title = upcomingText;
            
            let tooltipText = '';
            if (upcomingCount === 0) {
                tooltipText = 'No upcoming exams';
            } else if (upcomingCount === 1) {
                tooltipText = `${upcomingName}`;
                if (upcomingText.includes('Today')) tooltipText += ' (Today)';
                if (upcomingText.includes('Tomorrow')) tooltipText += ' (Tomorrow)';
            } else {
                tooltipText = `${upcomingCount} upcoming exams - Next: ${upcomingName}`;
            }
            this.elements.upcomingExam.title = tooltipText;
            
            if (upcomingText.includes('Today') || displayText.includes('Today')) {
                this.elements.upcomingExam.classList.add('dashboard-stat-low');
                this.elements.upcomingExam.classList.remove('dashboard-stat-medium', 'dashboard-stat-high');
            } else if (upcomingText.includes('Tomorrow') || upcomingText.includes('1d') || upcomingText.includes('2d')) {
                this.elements.upcomingExam.classList.add('dashboard-stat-medium');
                this.elements.upcomingExam.classList.remove('dashboard-stat-low', 'dashboard-stat-high');
            } else {
                this.elements.upcomingExam.classList.remove('dashboard-stat-low', 'dashboard-stat-medium', 'dashboard-stat-high');
            }
        }
        
        this.updateCardAppearance('exams', upcomingCount > 0 ? 1 : 0);
        
        console.log(`✅ Exams UI Updated: ${upcomingText} (${upcomingCount} active)`);
    }
    
    // Load resource metrics
    async loadResourceMetrics(allResources = true) {
        console.log('📁 Loading resource metrics...');
        
        if (!this.userProfile || !this.sb) {
            console.warn('⚠️ Cannot load resources: No user profile or Supabase');
            this.showErrorState('resources');
            return;
        }
        
        try {
            let query = this.sb
                .from('resources')
                .select('id')
                .eq('target_program', this.userProfile.program)
                .eq('block', this.userProfile.block)
                .eq('intake_year', this.userProfile.intake_year);
            
            const { data: resources, error } = await query;
            
            if (error) {
                console.error('❌ Resources query error:', error);
                this.showErrorState('resources');
                return;
            }
            
            const resourceCount = resources?.length || 0;
            
            if (this.elements.newResources) {
                this.elements.newResources.textContent = resourceCount;
                this.elements.newResources.title = allResources
                    ? `Total available resources: ${resourceCount}`
                    : `New resources (last 7 days): ${resourceCount}`;
                this.updateCardAppearance('resources', resourceCount);
            }
            
            console.log(`✅ Resources: ${resourceCount} total available`);
            
        } catch (error) {
            console.error('❌ Error loading resources:', error);
            this.showErrorState('resources');
        }
    }
    
    // Enhanced NurseIQ Metrics with multiple sources
    async loadNurseIQMetrics() {
        console.log('🧠 Loading NurseIQ metrics...');
        
        // METHOD 1: Try to get from localStorage (fastest)
        try {
            const cachedMetrics = localStorage.getItem('nurseiq_dashboard_metrics');
            if (cachedMetrics) {
                const metrics = JSON.parse(cachedMetrics);
                console.log('📊 Using cached NurseIQ metrics:', metrics);
                this.updateNurseIQUI(metrics);
                return;
            }
        } catch (error) {
            console.warn('Could not parse cached metrics:', error);
        }
        
        // METHOD 2: Try to get from NurseIQ module
        if (typeof window.getNurseIQDashboardMetrics === 'function') {
            try {
                const metrics = window.getNurseIQDashboardMetrics();
                console.log('📊 Got metrics from NurseIQ module:', metrics);
                this.updateNurseIQUI(metrics);
                return;
            } catch (error) {
                console.warn('Could not get metrics from NurseIQ module:', error);
            }
        }
        
        // METHOD 3: Fallback to default
        const metrics = {
            totalAnswered: 0,
            totalCorrect: 0,
            accuracy: 0,
            progress: 0,
            recentActivity: 0,
            streak: 0,
            lastUpdated: new Date().toISOString()
        };
        
        this.updateNurseIQUI(metrics);
        console.log('✅ NurseIQ: Using default metrics');
    }
    
    // Update NurseIQ UI with metrics
    updateNurseIQUI(metrics) {
        if (!metrics) return;
        
        const progress = metrics.progress || 0;
        const accuracy = metrics.accuracy || 0;
        const totalQuestions = metrics.totalAnswered || 0;
        
        if (this.elements.nurseiqProgress) {
            this.elements.nurseiqProgress.textContent = `${progress}%`;
            if (progress >= 75) {
                this.elements.nurseiqProgress.classList.add('dashboard-stat-high');
                this.elements.nurseiqProgress.classList.remove('dashboard-stat-medium', 'dashboard-stat-low');
            } else if (progress >= 50) {
                this.elements.nurseiqProgress.classList.add('dashboard-stat-medium');
                this.elements.nurseiqProgress.classList.remove('dashboard-stat-high', 'dashboard-stat-low');
            } else if (progress > 0) {
                this.elements.nurseiqProgress.classList.add('dashboard-stat-low');
                this.elements.nurseiqProgress.classList.remove('dashboard-stat-high', 'dashboard-stat-medium');
            } else {
                this.elements.nurseiqProgress.classList.remove('dashboard-stat-high', 'dashboard-stat-medium', 'dashboard-stat-low');
            }
        }
        
        if (this.elements.nurseiqAccuracy) {
            this.elements.nurseiqAccuracy.textContent = `${accuracy}%`;
        }
        if (this.elements.nurseiqQuestions) {
            this.elements.nurseiqQuestions.textContent = totalQuestions;
        }
        
        // Update card appearance
        this.updateCardAppearance('nurseiq', progress);
        
        console.log(`✅ NurseIQ UI Updated: ${progress}% progress, ${accuracy}% accuracy`);
    }
    
    async loadLatestOfficialAnnouncement() {
        if (!this.elements.studentAnnouncement || !this.sb) return;
        
        try {
            const { data, error } = await this.sb
                .from('notifications')
                .select('*')
                .eq('subject', 'Official Announcement')
                .eq('message_type', true)
                .order('created_at', { ascending: false })
                .limit(1);
            
            if (error) throw error;
            
            if (data && data.length > 0) {
                this.elements.studentAnnouncement.textContent = data[0].message;
                const date = new Date(data[0].created_at);
                this.elements.studentAnnouncement.title = `Posted on ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
            } else {
                this.elements.studentAnnouncement.textContent = 'No official announcements at this time.';
            }
        } catch (error) {
            console.error('❌ Failed to load announcement:', error);
            this.elements.studentAnnouncement.textContent = 'No announcements available.';
        }
    }
    
    loadWelcomeDetails() {
        if (!this.userProfile || !this.elements.welcomeHeader) return;
        
        const studentName = this.userProfile.full_name || 'Student';
        
        const getGreeting = (hour) => {
            if (hour >= 5 && hour < 12) return "Good Morning";
            if (hour >= 12 && hour < 17) return "Good Afternoon";
            if (hour >= 17 && hour < 21) return "Good Evening";
            return "Good Night";
        };
        
        const updateHeader = () => {
            const now = new Date();
            const hour = now.getHours();
            this.elements.welcomeHeader.textContent = `${getGreeting(hour)}, ${studentName}!`;
        };
        
        updateHeader();
        setInterval(updateHeader, 60000);
    }
    
    async loadStudentMessage() {
        if (!this.elements.welcomeMessage || !this.sb) return;
        
        try {
            const { data, error } = await this.sb
                .from('app_settings')
                .select('value')
                .eq('key', 'student_welcome')
                .maybeSingle();
            
            if (error) throw error;
            
            if (data && data.value) {
                this.elements.welcomeMessage.innerHTML = data.value;
            } else {
                this.elements.welcomeMessage.textContent = 'Welcome to your student dashboard! Access your courses, schedule, and check your attendance status.';
            }
        } catch (error) {
            console.error('❌ Failed to load student message:', error);
            this.elements.welcomeMessage.textContent = 'Welcome back! Check your courses and attendance.';
        }
    }
    
    showLoadingStates() {
        // Show loading for all stats
        const loadingTexts = {
            attendanceRate: '...%',
            verifiedCount: '...',
            totalCount: '...',
            pendingCount: '...',
            upcomingExam: '...',
            activeCourses: '...',
            newResources: '...',
            nurseiqProgress: '...%',
            nurseiqAccuracy: '...%',
            nurseiqQuestions: '...',
            dashboardExamStatus: '...',
            dashboardApprovedUnits: '...',
            dashboardCurrentSemester: '...'
        };
        
        for (const [key, value] of Object.entries(loadingTexts)) {
            if (this.elements[key]) {
                this.elements[key].textContent = value;
            }
        }
        
        // Announcement
        if (this.elements.studentAnnouncement) {
            this.elements.studentAnnouncement.textContent = 'Loading latest announcement...';
        }
        
        // Header time
        if (this.elements.headerTime) {
            this.elements.headerTime.textContent = 'Loading...';
        }
    }
    
    showErrorStates() {
        // Show error states
        const errorTexts = {
            attendanceRate: '--%',
            verifiedCount: '--',
            totalCount: '--',
            pendingCount: '--',
            upcomingExam: 'Error',
            activeCourses: '0',
            newResources: '0',
            nurseiqProgress: '--%',
            nurseiqAccuracy: '--%',
            nurseiqQuestions: '0'
        };
        
        for (const [key, value] of Object.entries(errorTexts)) {
            if (this.elements[key]) {
                this.elements[key].textContent = value;
            }
        }
    }
    
    showErrorState(metric) {
        const errorMap = {
            'attendance': {
                attendanceRate: '--%',
                verifiedCount: '--',
                totalCount: '--',
                pendingCount: '--'
            },
            'courses': { activeCourses: '0' },
            'exams': { upcomingExam: 'Error' },
            'resources': { newResources: '0' },
            'nurseiq': {
                nurseiqProgress: '--%',
                nurseiqAccuracy: '--%',
                nurseiqQuestions: '0'
            }
        };
        
        if (errorMap[metric]) {
            for (const [key, value] of Object.entries(errorMap[metric])) {
                if (this.elements[key]) {
                    this.elements[key].textContent = value;
                }
            }
        }
    }
    
    startLiveClock() {
        // Update header time
        if (this.elements.headerTime) {
            const updateHeaderTime = () => {
                const now = new Date();
                const timeString = now.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                });
                this.elements.headerTime.textContent = timeString;
            };
            
            updateHeaderTime();
            setInterval(updateHeaderTime, 60000);
        }
        
        // Update footer time (if exists)
        if (this.elements.currentDateTime) {
            const updateFooterTime = () => {
                const now = new Date();
                const options = { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                };
                
                this.elements.currentDateTime.textContent = now.toLocaleDateString('en-US', options);
            };
            
            updateFooterTime();
            setInterval(updateFooterTime, 60000);
        }
    }
    
    // Start auto-refresh for real-time updates
    startAutoRefresh() {
        console.log('⏰ Starting auto-refresh (every 2 minutes)...');
        
        // Clear any existing interval
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }
        
        // Refresh dashboard every 2 minutes (120000 ms)
        this.autoRefreshInterval = setInterval(() => {
            console.log('🔄 Auto-refreshing dashboard...');
            this.refreshDashboard(false);
        }, 120000);
        
        // Also refresh when tab becomes visible
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                console.log('👁️ Tab became visible, refreshing dashboard...');
                this.refreshDashboard(false);
            }
        });
    }
    
    async refreshDashboard(silent = false) {
        if (!silent) {
            console.log('🔄 Manually refreshing dashboard...');
            this.showLoadingStates();
        }
        
        await Promise.allSettled([
            this.loadAttendanceMetrics(),
            this.loadResourceMetrics(true),
            this.loadNurseIQMetrics(),
            this.loadExamCardDashboardData()
        ]);
        
        // Also try to update courses and exams if modules are ready
        if (window.coursesModule) {
            this.handleCoursesReady();
        }
        if (window.examsModule) {
            this.handleExamsReady();
        }
        
        this.updateAllCardsAppearance();
        
        if (!silent) {
            console.log('✅ Dashboard refreshed');
        }
    }
}

// Create global instance
let dashboardModule = null;

// Initialize dashboard module
function initDashboardModule(supabaseClient) {
    console.log('🎯 initDashboardModule called');
    
    const client = supabaseClient || window.sb || window.db?.supabase;
    
    if (!client) {
        console.error('❌ initDashboardModule: No Supabase client found!');
        
        if (window.db?.supabase && !window.sb) {
            console.log('🔧 Auto-fixing: window.sb = window.db.supabase');
            window.sb = window.db.supabase;
            dashboardModule = new DashboardModule(window.db.supabase);
        } else {
            console.error('❌ Cannot create dashboard: No Supabase available');
            return null;
        }
    } else {
        dashboardModule = new DashboardModule(client);
    }
    
    return dashboardModule;
}

// Global functions
window.DashboardModule = DashboardModule;
window.initDashboardModule = initDashboardModule;
window.refreshDashboard = () => {
    if (dashboardModule) {
        dashboardModule.refreshDashboard();
    } else {
        console.warn('⚠️ Dashboard module not initialized');
    }
};

// Auto-initialize when ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 Dashboard auto-init checking...');
    
    const hasDashboard = document.getElementById('dashboard-attendance-rate');
    
    if (hasDashboard) {
        console.log('✅ Dashboard elements found');
        
        const tryInit = () => {
            if ((window.sb || window.db?.supabase) && 
                window.currentUserId && 
                window.currentUserProfile && 
                !dashboardModule) {
                
                console.log('🎯 Auto-initializing dashboard...');
                const client = window.sb || window.db.supabase;
                dashboardModule = initDashboardModule(client);
                
                if (dashboardModule) {
                    dashboardModule.initialize(
                        window.currentUserId,
                        window.currentUserProfile
                    );
                    
                    setTimeout(() => {
                        const event = new CustomEvent('dashboardReady');
                        document.dispatchEvent(event);
                    }, 500);
                }
            }
        };
        
        // Try multiple times
        tryInit();
        setTimeout(tryInit, 1000);
        setTimeout(tryInit, 3000);
        
        // Listen for courses module ready
        document.addEventListener('coursesModuleReady', (e) => {
            console.log('📚 coursesModuleReady event globally received');
            if (dashboardModule) {
                dashboardModule.handleCoursesReady(e.detail);
            }
        });
        
        // Listen for exams module ready
        document.addEventListener('examsModuleReady', (e) => {
            console.log('📝 examsModuleReady event globally received');
            if (dashboardModule) {
                dashboardModule.handleExamsReady(e.detail);
            }
        });
    }
});

// Force dashboard to show on first load
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 DOM loaded - checking dashboard visibility...');
    
    setTimeout(() => {
        const dashboardTab = document.getElementById('dashboard');
        const isDashboardVisible = dashboardTab && 
            (dashboardTab.classList.contains('active') || 
             getComputedStyle(dashboardTab).display !== 'none');
        
        if (!isDashboardVisible && window.ui) {
            console.log('🚨 Dashboard not visible - forcing it to show...');
            window.ui.showTab('dashboard');
            dashboardTab.style.display = 'block';
            dashboardTab.classList.add('active');
            
            document.querySelectorAll('.tab-content:not(#dashboard)').forEach(tab => {
                tab.style.display = 'none';
                tab.classList.remove('active');
            });
        }
    }, 1500);
});

// Listen for appReady event and force dashboard
document.addEventListener('appReady', function(e) {
    console.log('🎉 App ready - ensuring dashboard shows...');
    
    setTimeout(() => {
        if (window.ui) {
            window.ui.showTab('dashboard');
        } else {
            const dashboard = document.getElementById('dashboard');
            if (dashboard) {
                dashboard.style.display = 'block';
                dashboard.classList.add('active');
            }
        }
    }, 500);
});

// Emergency: If still not showing after 3 seconds
setTimeout(() => {
    const dashboard = document.getElementById('dashboard');
    if (dashboard && getComputedStyle(dashboard).display === 'none') {
        console.log('🚨 EMERGENCY: Dashboard still hidden after 3s - forcing display');
        dashboard.style.display = 'block';
        dashboard.style.visibility = 'visible';
        dashboard.style.opacity = '1';
        dashboard.classList.add('active');
        
        document.querySelectorAll('.tab-content:not(#dashboard)').forEach(tab => {
            tab.style.display = 'none';
        });
    }
}, 3000);
