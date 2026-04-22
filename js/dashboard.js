// dashboard.js - COMPLETE UPDATED VERSION with Fee Balance & Exam Card
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
            
            // NEW: Fee Balance elements
            dashboardFeeBalance: document.getElementById('dashboard-fee-balance'),
            dashboardTotalFees: document.getElementById('dashboard-total-fees'),
            dashboardTotalPaid: document.getElementById('dashboard-total-paid'),
            dashboardFeeStatus: document.getElementById('dashboard-fee-status'),
            
            // NEW: Exam Card elements
            dashboardExamStatus: document.getElementById('dashboard-exam-status'),
            dashboardRegisteredUnits: document.getElementById('dashboard-registered-units'),
            
            // NurseIQ
            nurseiqProgress: document.getElementById('dashboard-nurseiq-progress'),
            nurseiqAccuracy: document.getElementById('dashboard-nurseiq-accuracy'),
            nurseiqQuestions: document.getElementById('dashboard-nurseiq-questions'),
            
            // Card elements
            attendanceCard: document.querySelector('.stat-card[data-tab="attendance"]'),
            examsCard: document.querySelector('.stat-card[data-tab="cats"]'),
            coursesCard: document.querySelector('.stat-card[data-tab="courses"]'),
            resourcesCard: document.querySelector('.stat-card[data-tab="resources"]'),
            feeCard: document.querySelector('.stat-card[data-tab="fee-balance"]'),
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
        
        // 🔥 NEW: Listen for fee payment recorded event
        document.addEventListener('feePaymentRecorded', () => {
            console.log('💰 Dashboard: feePaymentRecorded event received');
            this.loadFeeBalanceData();
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
    
    // 🔥 NEW: Load Fee Balance Data
    async loadFeeBalanceData() {
        console.log('💰 Loading fee balance data...');
        
        if (!this.userId || !this.sb) {
            console.warn('⚠️ Cannot load fee data: No user ID or Supabase');
            return;
        }
        
        try {
            // Get student profile for program and block
            const { data: student, error: studentError } = await this.sb
                .from('consolidated_user_profiles_table')
                .select('program, block, intake_year')
                .eq('user_id', this.userId)
                .single();
            
            if (studentError) throw studentError;
            
            const block = student.block || 'Introductory';
            
            // Get fee structure amount
            const { data: feeConfig, error: feeError } = await this.sb
                .from('fee_structure')
                .select('amount')
                .eq('program', student.program)
                .eq('block', block)
                .single();
            
            const totalDue = feeConfig ? feeConfig.amount : 0;
            
            // Get total paid
            const { data: payments, error: paymentError } = await this.sb
                .from('fee_payments')
                .select('amount')
                .eq('student_id', this.userId);
            
            const totalPaid = payments ? payments.reduce((sum, p) => sum + parseFloat(p.amount), 0) : 0;
            const outstanding = totalDue - totalPaid;
            
            // Update dashboard fee cards
            if (this.elements.dashboardFeeBalance) {
                this.elements.dashboardFeeBalance.textContent = `KES ${outstanding.toLocaleString()}`;
                this.elements.dashboardFeeBalance.style.color = outstanding > 0 ? '#dc2626' : '#059669';
            }
            
            if (this.elements.dashboardTotalFees) {
                this.elements.dashboardTotalFees.textContent = `KES ${totalDue.toLocaleString()}`;
            }
            
            if (this.elements.dashboardTotalPaid) {
                this.elements.dashboardTotalPaid.textContent = `KES ${totalPaid.toLocaleString()}`;
            }
            
            if (this.elements.dashboardFeeStatus) {
                if (outstanding <= 0) {
                    this.elements.dashboardFeeStatus.textContent = 'PAID ✅';
                    this.elements.dashboardFeeStatus.className = 'fee-status-paid';
                } else {
                    this.elements.dashboardFeeStatus.textContent = `PENDING (KES ${outstanding.toLocaleString()})`;
                    this.elements.dashboardFeeStatus.className = 'fee-status-pending';
                }
            }
            
            // Update exam eligibility based on fee status
            this.updateExamEligibility(outstanding);
            
            console.log(`💰 Fee data loaded: Due=${totalDue}, Paid=${totalPaid}, Outstanding=${outstanding}`);
            
        } catch (error) {
            console.error('❌ Error loading fee data:', error);
        }
    }
    
    // 🔥 NEW: Load Registered Units Count
    async loadRegisteredUnitsCount() {
        console.log('📚 Loading registered units count...');
        
        if (!this.userId || !this.sb) return;
        
        try {
            const { data: registrations, error } = await this.sb
                .from('student_unit_registrations')
                .select('id')
                .eq('student_id', this.userId)
                .eq('status', 'approved');
            
            const count = registrations ? registrations.length : 0;
            
            if (this.elements.dashboardRegisteredUnits) {
                this.elements.dashboardRegisteredUnits.textContent = count;
            }
            
            console.log(`📚 Registered units: ${count}`);
            
        } catch (error) {
            console.error('Error loading registered units:', error);
        }
    }
    
    // 🔥 NEW: Update Exam Eligibility
    updateExamEligibility(outstanding) {
        console.log('📇 Updating exam eligibility...');
        
        if (this.elements.dashboardExamStatus) {
            if (outstanding <= 0) {
                this.elements.dashboardExamStatus.textContent = 'ELIGIBLE ✅';
                this.elements.dashboardExamStatus.style.color = '#059669';
            } else {
                this.elements.dashboardExamStatus.textContent = 'NOT ELIGIBLE ❌';
                this.elements.dashboardExamStatus.style.color = '#dc2626';
            }
        }
        
        // Also load registered units count
        this.loadRegisteredUnitsCount();
    }
    
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
                } else if (card.classList.contains('fee-card')) {
                    console.log('💰 Fee card clicked');
                    this.switchToTab('fee-balance');
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
                    } else if (card.classList.contains('fee-card')) {
                        console.log('💰 Fee card activated');
                        this.switchToTab('fee-balance');
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
        } else if (tabName === 'fee-balance') {
            card = document.querySelector('.stat-card.fee-card');
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
            this.loadFeeBalanceData(),        // 🔥 NEW: Load fee balance
            this.loadRegisteredUnitsCount()   // 🔥 NEW: Load registered units
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
        
        // Update fee data again after 3 seconds
        setTimeout(() => {
            console.log('💰 3s delayed update: Refreshing fee data...');
            this.loadFeeBalanceData();
            this.loadRegisteredUnitsCount();
        }, 3000);
        
        // Final update after 5 seconds
        setTimeout(() => {
            console.log('🔄 5s final update: Refreshing all metrics...');
            this.updateAllCardsAppearance();
            this.loadFeeBalanceData();
            this.loadRegisteredUnitsCount();
            
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
    
    async loadExamMetricsFromDB() {
        if (!this.userProfile || !this.sb) {
            console.warn('⚠️ Cannot load exams: No user profile or Supabase');
            this.showErrorState('exams');
            return;
        }
        
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const { data: exams, error } = await this.sb
                .from('exams_with_courses')
                .select('exam_name, exam_date, due_date, status, exam_type')
                .eq('intake_year', this.userProfile.intake_year)
                .or(`program_type.eq.${this.userProfile.program},program_type.is.null,program_type.eq.General`)
                .or(`block_term.eq.${this.userProfile.block},block_term.is.null,block_term.eq.General`)
                .order('exam_date', { ascending: true })
                .limit(5);
            
            if (error) throw error;
            
            let upcomingText = 'None';
            let upcomingCount = 0;
            
            if (exams && exams.length > 0) {
                upcomingCount = exams.length;
                
                // Find upcoming exams
                const upcomingExams = exams.filter(exam => {
                    const examDate = new Date(exam.exam_date || exam.due_date);
                    return examDate >= today;
                });
                
                if (upcomingExams.length > 0) {
                    upcomingExams.sort((a, b) => {
                        const dateA = new Date(a.exam_date || a.due_date);
                        const dateB = new Date(b.exam_date || b.due_date);
                        return dateA - dateB;
                    });
                    
                    const nextExam = upcomingExams[0];
                    const examDate = new Date(nextExam.exam_date || nextExam.due_date);
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
        }
    }
    
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
        
        // Fee card - color based on outstanding balance
        const feeBalance = this.elements.dashboardFeeBalance?.textContent?.replace('KES', '').replace(/,/g, '').trim();
        const balance = parseInt(feeBalance) || 0;
        if (this.elements.feeCard) {
            if (balance <= 0) {
                this.elements.feeCard.classList.add('card-success');
            } else if (balance > 0 && balance <= 10000) {
                this.elements.feeCard.classList.add('card-warning');
            } else {
                this.elements.feeCard.classList.add('card-danger');
            }
        }
        
        // Exam card - color based on eligibility
        const examStatus = this.elements.dashboardExamStatus?.textContent;
        if (this.elements.examCardCard) {
            if (examStatus === 'ELIGIBLE ✅') {
                this.elements.examCardCard.classList.add('card-success');
            } else {
                this.elements.examCardCard.classList.add('card-danger');
            }
        }
        
        // Exams card - color based on upcoming exam
        const upcomingExam = this.elements.upcomingExam?.textContent;
        if (this.elements.examsCard) {
            if (upcomingExam === 'Today') {
                this.elements.examsCard.classList.add('card-danger');
                this.elements.examsCard.classList.remove('card-warning', 'card-success');
            } else if (upcomingExam && (upcomingExam.includes('d') || upcomingExam.includes('w'))) {
                this.elements.examsCard.classList.add('card-warning');
                this.elements.exams
