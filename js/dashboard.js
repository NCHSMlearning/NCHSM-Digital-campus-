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
        
        // Cache elements
        this.cacheElements();
        
        // Setup
        this.setupEventListeners();
        this.startLiveClock();
        
        console.log('✅ DashboardModule initialized');
    }
    
    cacheElements() {
        // Get ALL dashboard elements
        this.elements = {
            // Welcome section
            welcomeHeader: document.getElementById('welcome-header'),
            welcomeMessage: document.getElementById('student-welcome-message'),
            studentAnnouncement: document.getElementById('student-announcement'),
            
            // Stats (dashboard cards) - Updated to match HTML
            attendanceRate: document.getElementById('dashboard-attendance-rate'),
            verifiedCount: document.getElementById('dashboard-verified-count'),
            totalCount: document.getElementById('dashboard-total-count'),
            pendingCount: document.getElementById('dashboard-pending-count'),
            upcomingExam: document.getElementById('dashboard-upcoming-exam'),
            activeCourses: document.getElementById('dashboard-active-courses'),
            newResources: document.getElementById('dashboard-new-resources'),
            
            // NurseIQ
            nurseiqProgress: document.getElementById('dashboard-nurseiq-progress'),
            nurseiqAccuracy: document.getElementById('dashboard-nurseiq-accuracy'),
            nurseiqQuestions: document.getElementById('dashboard-nurseiq-questions'),
            
            // Card elements
            attendanceCard: document.querySelector('.stat-card[data-tab="attendance"]'),
            examsCard: document.querySelector('.stat-card[data-tab="cats"]'),
            coursesCard: document.querySelector('.stat-card[data-tab="courses"]'),
            resourcesCard: document.querySelector('.stat-card[data-tab="resources"]'),
            nurseiqCard: document.querySelector('.stat-card.nurseiq-card'),
            
            // Grid container
            dashboardGrid: document.querySelector('.cards-grid'),
            
            // Time (in footer)
            currentDateTime: document.getElementById('currentDateTime'),
            
            // HEADER elements
            headerTime: document.getElementById('header-time'),
            headerUserName: document.getElementById('header-user-name'),
            headerProfilePhoto: document.getElementById('header-profile-photo'),
            headerRefresh: document.getElementById('header-refresh')
        };
        
        console.log('🔍 Cached dashboard elements:', Object.keys(this.elements).filter(k => this.elements[k]));
    }
    
    setupEventListeners() {
        console.log('🔧 Setting up dashboard event listeners...');
        
        // Listen for attendance events
        document.addEventListener('attendanceCheckedIn', () => {
            console.log('📊 Dashboard: attendanceCheckedIn event received');
            this.loadAttendanceMetrics();
        });
        
        // Listen for courses events
        document.addEventListener('coursesUpdated', (e) => {
            console.log('📚 Dashboard: coursesUpdated event received with data:', e.detail);
            
            if (e.detail && e.detail.activeCount !== undefined) {
                this.cachedCourses = e.detail.courses || [];
                
                // Update dashboard count
                if (this.elements.activeCourses) {
                    this.elements.activeCourses.textContent = e.detail.activeCount;
                    this.updateCardAppearance('courses', e.detail.activeCount);
                }
                
                console.log(`✅ Courses updated from event: ${e.detail.activeCount} active`);
            } else {
                console.log('⚠️ No detail in event, falling back to query');
                this.loadCourseMetrics();
            }
        });
        
        // Listen for courses module initialization
        document.addEventListener('coursesModuleReady', () => {
            console.log('📚 Dashboard: coursesModuleReady event received');
            if (window.coursesModule) {
                this.syncWithCoursesModule();
            }
        });
        
        // Listen for profile photo updates
        document.addEventListener('profilePhotoUpdated', (e) => {
            console.log('📸 Dashboard: profilePhotoUpdated event received', e.detail);
            this.updateProfilePhoto(e.detail?.photoUrl);
        });
        
        // Listen for profile updates
        document.addEventListener('profileUpdated', () => {
            console.log('👤 Dashboard: profileUpdated event received');
            if (window.currentUserProfile) {
                this.userProfile = window.currentUserProfile;
                this.updateHeaderWithUserData();
            }
        });
        
        // 🔥 FIX: Listen for NurseIQ metrics updates
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
        
        // 🔥 FIX: Add click handlers to ALL cards for tab switching
        this.addCardClickHandlers();
        
        console.log('✅ Event listeners setup complete');
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
        
        this.userId = userId;
        this.userProfile = userProfile;
        
        if (!userId || !userProfile) {
            console.error('❌ Dashboard: Missing user data');
            return false;
        }
        
        // UPDATE HEADER FIRST
        this.updateHeaderWithUserData();
        
        // Show loading states
        this.showLoadingStates();
        
        // Load all dashboard data
        await this.loadDashboard();
        
        // Try to sync with courses module
        setTimeout(() => {
            this.syncWithCoursesModule();
        }, 1000);
        
        // 🔥 FIX: Re-add click handlers after content loads
        setTimeout(() => {
            this.addCardClickHandlers();
        }, 1500);
        
        return true;
    }
    
    async loadDashboard() {
        console.log('📊 Loading complete dashboard data...');
        
        try {
            // Load in parallel
            await Promise.allSettled([
                this.loadWelcomeDetails(),
                this.loadStudentMessage(),
                this.loadLatestOfficialAnnouncement(),
                this.loadAttendanceMetrics(),
                this.loadCourseMetrics(),
                this.loadExamMetrics(),
                this.loadResourceMetrics(),
                this.loadNurseIQMetrics()
            ]);
            
            console.log('✅ Dashboard loaded successfully');
            
            // Apply grid animations after data loads
            this.animateGridCards();
            
        } catch (error) {
            console.error('❌ Error loading dashboard:', error);
            this.showErrorStates();
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
                else card.classList.add('card-danger');
                break;
            case 'courses':
                if (value === 0) {
                    card.classList.add('card-warning');
                    // Add warning icon
                    const valueEl = card.querySelector('.stat-value');
                    if (valueEl && !valueEl.querySelector('.warning-icon')) {
                        valueEl.innerHTML = `<i class="fas fa-exclamation-triangle warning-icon mr-1"></i>${value}`;
                    }
                } else if (value >= 5) {
                    card.classList.add('card-success');
                }
                break;
            case 'resources':
                if (value >= 5) card.classList.add('card-success');
                break;
            case 'nurseiq':
                const progress = parseInt(this.elements.nurseiqProgress?.textContent || '0');
                if (progress >= 75) card.classList.add('card-success');
                else if (progress >= 50) card.classList.add('card-warning');
                else if (progress > 0) card.classList.add('card-danger');
                break;
        }
    }
    
    // 🔥 UPDATED: Update header with user data
    updateHeaderWithUserData() {
        console.log('👤 Updating header with user data...');
        
        if (!this.userProfile) return;
        
        // Update user name in header
        if (this.elements.headerUserName && this.userProfile.full_name) {
            this.elements.headerUserName.textContent = this.userProfile.full_name;
        }
        
        // Update header profile photo
        if (this.elements.headerProfilePhoto) {
            this.updateProfilePhoto();
        }
        
        // Update welcome message
        if (this.elements.welcomeHeader && this.userProfile.full_name) {
            const getGreeting = (hour) => {
                if (hour >= 5 && hour < 12) return "Good Morning";
                if (hour >= 12 && hour < 17) return "Good Afternoon";
                if (hour >= 17 && hour < 21) return "Good Evening";
                return "Good Night";
            };
            
            const now = new Date();
            const hour = now.getHours();
            this.elements.welcomeHeader.textContent = `${getGreeting(hour)}, ${this.userProfile.full_name}!`;
        }
    }
    
    // 🔥 UPDATED: Update profile photo with fallback chain
    updateProfilePhoto(photoUrl = null) {
        if (!this.elements.headerProfilePhoto) return;
        
        console.log('📸 Updating header profile photo...');
        
        // Priority 1: Use provided photoUrl (from event)
        if (photoUrl) {
            this.elements.headerProfilePhoto.src = photoUrl;
            console.log('✅ Using photo from event:', photoUrl);
            return;
        }
        
        // Priority 2: Check userProfile for profile_photo_url or passport_url
        if (this.userProfile?.profile_photo_url) {
            this.elements.headerProfilePhoto.src = this.userProfile.profile_photo_url;
            console.log('✅ Using profile_photo_url from userProfile:', this.userProfile.profile_photo_url);
            return;
        }
        
        if (this.userProfile?.passport_url) {
            this.elements.headerProfilePhoto.src = this.userProfile.passport_url;
            console.log('✅ Using passport_url from userProfile:', this.userProfile.passport_url);
            return;
        }
        
        // Priority 3: Check localStorage
        const cachedPhoto = localStorage.getItem('userProfilePhoto');
        if (cachedPhoto) {
            this.elements.headerProfilePhoto.src = cachedPhoto;
            console.log('✅ Using cached profile photo from localStorage');
            return;
        }
        
        // Priority 4: Check window.currentUserProfile
        if (window.currentUserProfile?.profile_photo_url) {
            this.elements.headerProfilePhoto.src = window.currentUserProfile.profile_photo_url;
            console.log('✅ Using profile photo from window.currentUserProfile');
            return;
        }
        
        // Priority 5: Try to fetch from database
        if (this.userId && this.sb) {
            this.fetchProfilePhotoFromDB();
            return;
        }
        
        // Final fallback: Generate avatar from name
        this.useGeneratedAvatar();
    }
    
    // 🔥 Fetch profile photo from database
    async fetchProfilePhotoFromDB() {
        if (!this.userId || !this.sb) return;
        
        try {
            console.log('🔍 Fetching profile photo from database...');
            
            // Try consolidated_user_profiles_table first
            const { data: consolidatedData, error: consolidatedError } = await this.sb
                .from('consolidated_user_profiles_table')
                .select('passport_url')
                .eq('user_id', this.userId)
                .maybeSingle();
            
            if (!consolidatedError && consolidatedData?.passport_url) {
                console.log('✅ Found photo in consolidated table:', consolidatedData.passport_url);
                this.elements.headerProfilePhoto.src = consolidatedData.passport_url;
                
                // Cache the result
                this.userProfile.profile_photo_url = consolidatedData.passport_url;
                localStorage.setItem('userProfilePhoto', consolidatedData.passport_url);
                
                if (window.currentUserProfile) {
                    window.currentUserProfile.profile_photo_url = consolidatedData.passport_url;
                }
                return;
            }
            
            // Fallback to profiles table
            const { data: profileData, error: profileError } = await this.sb
                .from('profiles')
                .select('profile_photo_url')
                .eq('id', this.userId)
                .maybeSingle();
            
            if (!profileError && profileData?.profile_photo_url) {
                console.log('✅ Found photo in profiles table:', profileData.profile_photo_url);
                this.elements.headerProfilePhoto.src = profileData.profile_photo_url;
                
                // Cache the result
                this.userProfile.profile_photo_url = profileData.profile_photo_url;
                localStorage.setItem('userProfilePhoto', profileData.profile_photo_url);
                
                if (window.currentUserProfile) {
                    window.currentUserProfile.profile_photo_url = profileData.profile_photo_url;
                }
                return;
            }
            
            console.log('ℹ️ No profile photo found in any table');
            this.useGeneratedAvatar();
            
        } catch (error) {
            console.error('❌ Error in fetchProfilePhotoFromDB:', error);
            this.useGeneratedAvatar();
        }
    }
    
    // Helper: Use generated avatar
    useGeneratedAvatar() {
        if (!this.elements.headerProfilePhoto) return;
        
        if (this.userProfile?.full_name) {
            const nameForAvatar = this.userProfile.full_name.replace(/\s+/g, '+');
            this.elements.headerProfilePhoto.src = `https://ui-avatars.com/api/?name=${nameForAvatar}&background=667eea&color=fff&size=100`;
        } else {
            this.elements.headerProfilePhoto.src = 'https://ui-avatars.com/api/?name=Student&background=667eea&color=fff&size=100';
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
                // Apply color classes for value display
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
    
    async loadCourseMetrics() {
        console.log('📚 Loading course metrics...');
        
        // Try to get data from courses.js module first
        if (window.coursesModule && window.coursesModule.getActiveCourseCount) {
            const activeCount = window.coursesModule.getActiveCourseCount();
            console.log(`📚 Got active courses from coursesModule: ${activeCount}`);
            
            if (this.elements.activeCourses) {
                this.elements.activeCourses.textContent = activeCount;
                this.updateCardAppearance('courses', activeCount);
            }
            return;
        }
        
        // Try cached data
        if (this.cachedCourses.length > 0) {
            const activeCount = this.cachedCourses.filter(course => {
                const isCompleted = course.status === 'Completed' || course.status === 'Passed';
                return !isCompleted && course.status !== 'Completed';
            }).length;
            
            console.log(`📚 Using cached courses: ${activeCount} active`);
            
            if (this.elements.activeCourses) {
                this.elements.activeCourses.textContent = activeCount;
                this.updateCardAppearance('courses', activeCount);
            }
            return;
        }
        
        // Fallback to query
        if (!this.userProfile || !this.sb) {
            console.warn('⚠️ Cannot load courses: No user profile or Supabase');
            this.showErrorState('courses');
            return;
        }
        
        try {
            const program = this.userProfile.program || 'KRCHN';
            const intakeYear = this.userProfile.intake_year || 2025;
            const block = this.userProfile.block || 'A';
            const term = this.userProfile.term || 'Term 1';
            
            console.log('🎯 Loading courses for:', { program, intakeYear, block, term });
            
            let query = this.sb
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
            
            const { data: courses, error } = await query;
            
            if (error) {
                console.error('❌ Courses query error:', error);
                this.showErrorState('courses');
                return;
            }
            
            const activeCourses = courses?.filter(course => {
                const isCompleted = course.status === 'Completed' || course.status === 'Passed';
                return !isCompleted && course.status !== 'Completed';
            }) || [];
            
            const activeCount = activeCourses.length;
            
            if (this.elements.activeCourses) {
                this.elements.activeCourses.textContent = activeCount;
                this.updateCardAppearance('courses', activeCount);
            }
            
            console.log(`✅ Courses: ${activeCount} active`);
            
        } catch (error) {
            console.error('❌ Error loading courses:', error);
            this.showErrorState('courses');
        }
    }
    
    isTVETProgram(program) {
        if (!program) return false;
        const tvetPrograms = ['TVET', 'TVET NURSING', 'TVET NURSING(A)', 'TVET NURSING(B)', 
                            'CRAFT CERTIFICATE', 'ARTISAN', 'DIPLOMA IN TVET'];
        return tvetPrograms.some(tvet => program.toUpperCase().includes(tvet));
    }
    async loadExamMetrics() {
    console.log('📝 Loading exam metrics...');
    
    // METHOD 1: Try to get from exams module (preferred)
    if (typeof window.getExamsDashboardMetrics === 'function') {
        try {
            const metrics = window.getExamsDashboardMetrics();
            console.log('📊 Got metrics from exams module:', metrics);
            this.updateExamsUI(metrics);
            return;
        } catch (error) {
            console.warn('Could not get metrics from exams module:', error);
        }
    }
    
    // METHOD 2: Try to get from localStorage
    try {
        const cachedMetrics = localStorage.getItem('exams_dashboard_metrics');
        if (cachedMetrics) {
            const metrics = JSON.parse(cachedMetrics);
            console.log('📊 Using cached exams metrics:', metrics);
            this.updateExamsUI(metrics);
            return;
        }
    } catch (error) {
        console.warn('Could not parse cached metrics:', error);
    }
    
    // METHOD 3: Fallback to database query (your existing code)
    if (!this.userProfile || !this.sb) {
        console.warn('⚠️ Cannot load exams: No user profile or Supabase');
        this.showErrorState('exams');
        return;
    }
    
    try {
        const today = new Date().toISOString().split('T')[0];
        const { data: exams, error } = await this.sb
            .from('exams_with_courses')
            .select('exam_name, exam_date')
            .or(`program_type.eq.${this.userProfile.program},program_type.is.null`)
            .or(`block_term.eq.${this.userProfile.block},block_term.is.null`)
            .eq('intake_year', this.userProfile.intake_year)
            .gte('exam_date', today)
            .order('exam_date', { ascending: true })
            .limit(1);
        
        if (error) {
            console.error('❌ Exams query error:', error);
            this.showErrorState('exams');
            return;
        }
        
        let examText = 'None';
        
        if (exams && exams.length > 0) {
            const examDate = new Date(exams[0].exam_date);
            const diffDays = Math.ceil((examDate - new Date()) / (1000 * 60 * 60 * 24));
            
            if (diffDays <= 0) {
                examText = 'Today';
            } else if (diffDays <= 7) {
                examText = `${diffDays}d`;
            } else {
                examText = examDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }
        }
        
        const metrics = {
            upcomingExam: examText,
            gradedExams: 0,
            averageScore: 0,
            bestScore: 0,
            passRate: 0,
            lastUpdated: new Date().toISOString()
        };
        
        this.updateExamsUI(metrics);
        
        console.log(`✅ Exams: ${examText}`);
        
    } catch (error) {
        console.error('❌ Error loading exams:', error);
        this.showErrorState('exams');
    }
}

// 🔥 ADD THIS NEW METHOD to DashboardModule class:
updateExamsUI(metrics) {
    if (!metrics) return;
    
    const upcomingExam = metrics.upcomingExam || 'None';
    
    if (this.elements.upcomingExam) {
        this.elements.upcomingExam.textContent = upcomingExam;
        // Apply color classes
        if (upcomingExam === 'Today') {
            this.elements.upcomingExam.classList.add('dashboard-stat-low');
            this.elements.upcomingExam.classList.remove('dashboard-stat-medium', 'dashboard-stat-high');
        } else if (upcomingExam.includes('d') && parseInt(upcomingExam) <= 7) {
            this.elements.upcomingExam.classList.add('dashboard-stat-medium');
            this.elements.upcomingExam.classList.remove('dashboard-stat-low', 'dashboard-stat-high');
        } else {
            this.elements.upcomingExam.classList.remove('dashboard-stat-low', 'dashboard-stat-medium', 'dashboard-stat-high');
        }
    }
    
    // You can also update other exam metrics if you want to show more on dashboard
    if (metrics.gradedExams > 0) {
        console.log(`📊 Exams Summary: ${metrics.gradedExams} graded, ${metrics.averageScore}% avg`);
    }
    
    console.log(`✅ Exams UI Updated: Next exam - ${upcomingExam}`);
}
    
    async loadResourceMetrics() {
        console.log('📁 Loading resource metrics...');
        
        if (!this.userProfile || !this.sb) {
            console.warn('⚠️ Cannot load resources: No user profile or Supabase');
            this.showErrorState('resources');
            return;
        }
        
        try {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            
            const { data: resources, error } = await this.sb
                .from('resources')
                .select('created_at')
                .eq('target_program', this.userProfile.program)
                .eq('block', this.userProfile.block)
                .eq('intake_year', this.userProfile.intake_year)
                .gte('created_at', oneWeekAgo.toISOString());
            
            if (error) {
                console.error('❌ Resources query error:', error);
                this.showErrorState('resources');
                return;
            }
            
            const newCount = resources?.length || 0;
            
            if (this.elements.newResources) {
                this.elements.newResources.textContent = newCount;
                this.updateCardAppearance('resources', newCount);
            }
            
            console.log(`✅ Resources: ${newCount} new`);
            
        } catch (error) {
            console.error('❌ Error loading resources:', error);
            this.showErrorState('resources');
        }
    }
    
    // 🔥 UPDATED: Enhanced NurseIQ Metrics with multiple sources
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
        
        // METHOD 3: Fallback to database query
        if (!this.userId || !this.sb) {
            console.warn('⚠️ Cannot load NurseIQ: No user ID or Supabase');
            this.showErrorState('nurseiq');
            return;
        }
        
        try {
            const { data: assessments, error } = await this.sb
                .from('user_assessment_progress')
                .select('is_correct')
                .eq('user_id', this.userId);
            
            if (error) {
                console.error('❌ NurseIQ query error:', error);
                this.showErrorState('nurseiq');
                return;
            }
            
            const totalQuestions = assessments?.length || 0;
            const correctAnswers = assessments?.filter(a => a.is_correct === true).length || 0;
            const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
            const targetQuestions = 100;
            const progress = Math.min(Math.round((totalQuestions / targetQuestions) * 100), 100);
            
            const metrics = {
                totalAnswered: totalQuestions,
                totalCorrect: correctAnswers,
                accuracy: accuracy,
                progress: progress,
                recentActivity: 0,
                streak: 0,
                lastUpdated: new Date().toISOString()
            };
            
            this.updateNurseIQUI(metrics);
            
            console.log(`✅ NurseIQ (DB): ${progress}% progress, ${accuracy}% accuracy`);
            
        } catch (error) {
            console.error('❌ Error loading NurseIQ:', error);
            this.showErrorState('nurseiq');
        }
    }
    
    // 🔥 NEW: Update NurseIQ UI with metrics
    updateNurseIQUI(metrics) {
        if (!metrics) return;
        
        const progress = metrics.progress || 0;
        const accuracy = metrics.accuracy || 0;
        const totalQuestions = metrics.totalAnswered || 0;
        
        if (this.elements.nurseiqProgress) {
            this.elements.nurseiqProgress.textContent = `${progress}%`;
            // Apply color classes
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
                .order('created_at', { ascending: false })
                .limit(1);
            
            if (error) throw error;
            
            if (data && data.length > 0) {
                this.elements.studentAnnouncement.textContent = data[0].message;
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
    
    // Sync directly with courses module
    syncWithCoursesModule() {
        console.log('🔄 Syncing dashboard with courses module...');
        
        if (window.coursesModule) {
            const activeCount = window.coursesModule.getActiveCourseCount 
                ? window.coursesModule.getActiveCourseCount() 
                : 0;
            
            if (this.elements.activeCourses) {
                this.elements.activeCourses.textContent = activeCount;
                this.updateCardAppearance('courses', activeCount);
            }
            
            console.log(`✅ Synced: ${activeCount} active courses from coursesModule`);
            
            if (window.coursesModule.getAllCourses) {
                this.cachedCourses = window.coursesModule.getAllCourses();
            }
            
        } else {
            console.log('⚠️ coursesModule not available yet, will retry...');
            setTimeout(() => this.syncWithCoursesModule(), 2000);
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
            nurseiqQuestions: '...'
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
    
    async refreshDashboard() {
        console.log('🔄 Manually refreshing dashboard...');
        
        this.showLoadingStates();
        
        await Promise.allSettled([
            this.loadAttendanceMetrics(),
            this.loadCourseMetrics(),
            this.loadExamMetrics(),
            this.loadResourceMetrics(),
            this.loadNurseIQMetrics()
        ]);
        
        console.log('✅ Dashboard refreshed');
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
        
        document.addEventListener('coursesModuleReady', tryInit);
        
        document.addEventListener('profilePhotoUpdated', (e) => {
            console.log('📸 Profile photo updated globally', e.detail);
            if (dashboardModule?.elements?.headerProfilePhoto) {
                dashboardModule.updateProfilePhoto(e.detail?.photoUrl);
            }
        });
    }
});

console.log('✅ Dashboard module loaded');
