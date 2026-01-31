// dashboard.js - COMPLETE Dashboard Module WITHOUT Dropdown Conflicts
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
            
            // HEADER elements - EXACT selectors from your HTML
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
        
        // 🔥 Listen for exams metrics updates
        document.addEventListener('examsMetricsUpdated', (e) => {
            console.log('📝 Dashboard: Exams metrics updated event received', e.detail);
            if (e.detail) {
                this.updateExamsUI(e.detail);
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
    
    // 🔥 REMOVED: setupDropdownBehavior() method completely!
    // The dropdown is handled by ui.js ONLY
    
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
        console.log('👤 User profile data:', userProfile);
        
        this.userId = userId;
        this.userProfile = userProfile;
        
        if (!userId || !userProfile) {
            console.error('❌ Dashboard: Missing user data');
            return false;
        }
        
        // 🔥 UPDATED: Update ALL user info immediately
        console.log('🔄 Updating all user info...');
        this.updateAllUserInfo();
        
        // Show loading states
        this.showLoadingStates();
        
        // 🔥 NEW: Start auto-refresh for real-time updates
        this.startAutoRefresh();
        
        // Load all dashboard data WITHOUT waiting
        console.log('📊 Loading ALL dashboard data automatically...');
        await this.loadDashboard();
        
        // Try to sync with courses module
        setTimeout(() => {
            this.syncWithCoursesModule();
        }, 1000);
        
        // Re-add click handlers after content loads
        setTimeout(() => {
            this.addCardClickHandlers();
        }, 1500);
        
        return true;
    }
    
    // 🔥 NEW: Update ALL user information (name, photo, dropdown, etc.)
    updateAllUserInfo() {
        console.log('👤 Updating ALL user information...');
        
        if (!this.userProfile) {
            console.warn('⚠️ No user profile available');
            return;
        }
        
        const studentName = this.userProfile.full_name || 'Student';
        const studentRole = 'Student'; // Hardcoded or could be from profile
        console.log('📝 Setting name to:', studentName);
        
        // Update header user name (EXACT selector from your HTML)
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
    
    // 🔥 NEW: Update ALL profile photo elements
    updateAllProfilePhotos(photoUrl = null) {
        console.log('📸 Updating ALL profile photos...');
        
        let finalPhotoUrl = photoUrl;
        
        // Determine which photo URL to use
        if (!finalPhotoUrl) {
            // Priority chain for photo URL
            if (this.userProfile?.profile_photo_url) {
                finalPhotoUrl = this.userProfile.profile_photo_url;
            } else if (this.userProfile?.passport_url) {
                finalPhotoUrl = this.userProfile.passport_url;
            } else if (localStorage.getItem('userProfilePhoto')) {
                finalPhotoUrl = localStorage.getItem('userProfilePhoto');
            } else if (window.currentUserProfile?.profile_photo_url) {
                finalPhotoUrl = window.currentUserProfile.profile_photo_url;
            } else {
                const nameForAvatar = this.userProfile?.full_name?.replace(/\s+/g, '+') || 'Student';
                finalPhotoUrl = `https://ui-avatars.com/api/?name=${nameForAvatar}&background=667eea&color=fff&size=100`;
            }
        }
        
        console.log('✅ Using photo URL:', finalPhotoUrl);
        
        // Update specific profile photo elements (avoid dropdown)
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
    
    async loadDashboard() {
        console.log('📊 Loading complete dashboard data...');
        
        try {
            // 🔥 UPDATED: Load ALL metrics in parallel WITHOUT waiting
            const promises = [
                this.loadWelcomeDetails(),
                this.loadStudentMessage(),
                this.loadLatestOfficialAnnouncement(),
                this.loadAttendanceMetrics(),
                this.loadCourseMetrics(),
                this.loadExamMetrics(),
                this.loadResourceMetrics(true), // 🔥 Get ALL resources, not just new ones
                this.loadNurseIQMetrics()
            ];
            
            // Wait for all promises but don't fail if one fails
            const results = await Promise.allSettled(promises);
            
            // Log results
            results.forEach((result, index) => {
                if (result.status === 'rejected') {
                    console.warn(`⚠️ Metric ${index} failed:`, result.reason);
                }
            });
            
            console.log('✅ Dashboard loaded successfully');
            
            // Apply grid animations after data loads
            this.animateGridCards();
            
            // 🔥 NEW: Update all cards appearance
            this.updateAllCardsAppearance();
            
        } catch (error) {
            console.error('❌ Error loading dashboard:', error);
            this.showErrorStates();
        }
    }
    
    // 🔥 NEW: Start auto-refresh for real-time updates
    startAutoRefresh() {
        console.log('⏰ Starting auto-refresh (every 2 minutes)...');
        
        // Clear any existing interval
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }
        
        // Refresh dashboard every 2 minutes (120000 ms)
        this.autoRefreshInterval = setInterval(() => {
            console.log('🔄 Auto-refreshing dashboard...');
            this.refreshDashboard(false); // Silent refresh
        }, 120000); // 2 minutes
        
        // Also refresh when tab becomes visible
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                console.log('👁️ Tab became visible, refreshing dashboard...');
                this.refreshDashboard(false);
            }
        });
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
    
    // 🔥 NEW: Update ALL cards appearance
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
        } else if (upcomingExam && upcomingExam.includes('d') && parseInt(upcomingExam) <= 7) {
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
    
    // 🔥 FIXED: Load exam metrics - NOW checks for ACTIVE exams (current + future)
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
        
        // 🔥 METHOD 3: FIXED DATABASE QUERY - Get ACTIVE exams (ongoing + upcoming)
        if (!this.userProfile || !this.sb) {
            console.warn('⚠️ Cannot load exams: No user profile or Supabase');
            this.showErrorState('exams');
            return;
        }
        
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Start of today
            
            const { data: exams, error } = await this.sb
                .from('exams_with_courses')
                .select(`
                    exam_name, 
                    exam_date, 
                    due_date,
                    status,
                    exam_type,
                    course_name
                `)
                .eq('intake_year', this.userProfile.intake_year)
                .or(`program_type.eq.${this.userProfile.program},program_type.is.null,program_type.eq.General`)
                .or(`block_term.eq.${this.userProfile.block},block_term.is.null,block_term.eq.General`)
                // 🔥 IMPORTANT: Get exams that are ongoing OR upcoming
                .or(`and(exam_date.gte.${today.toISOString()},status.is.null),and(exam_date.lte.${today.toISOString()},due_date.gte.${today.toISOString()}),status.eq.active,status.eq.pending,status.is.null`)
                .order('exam_date', { ascending: true })
                .limit(5); // Get up to 5 active exams
            
            if (error) {
                console.error('❌ Exams query error:', error);
                this.showErrorState('exams');
                return;
            }
            
            console.log('📊 Active exams found:', exams);
            
            let upcomingText = 'None';
            let upcomingCount = 0;
            
            if (exams && exams.length > 0) {
                upcomingCount = exams.length;
                
                // Find the NEXT exam (nearest date)
                const upcomingExams = exams.filter(exam => {
                    const examDate = new Date(exam.exam_date || exam.due_date);
                    return examDate >= today;
                });
                
                if (upcomingExams.length > 0) {
                    // Sort by date
                    upcomingExams.sort((a, b) => {
                        const dateA = new Date(a.exam_date || a.due_date);
                        const dateB = new Date(b.exam_date || b.due_date);
                        return dateA - dateB;
                    });
                    
                    const nextExam = upcomingExams[0];
                    const examDate = new Date(nextExam.exam_date || nextExam.due_date);
                    const diffDays = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));
                    
                    if (diffDays <= 0) {
                        upcomingText = 'Today';
                    } else if (diffDays === 1) {
                        upcomingText = 'Tomorrow';
                    } else if (diffDays <= 7) {
                        upcomingText = `${diffDays}d`;
                    } else if (diffDays <= 30) {
                        const weeks = Math.floor(diffDays / 7);
                        upcomingText = `${weeks}w`;
                    } else {
                        upcomingText = examDate.toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                        });
                    }
                    
                    // Add exam type/count info if multiple
                    if (upcomingCount > 1) {
                        upcomingText += ` (+${upcomingCount - 1})`;
                    }
                } else {
                    // Exams are ongoing (current date is between exam_date and due_date)
                    const ongoingExams = exams.filter(exam => {
                        const startDate = new Date(exam.exam_date || 0);
                        const endDate = new Date(exam.due_date || '9999-12-31');
                        return today >= startDate && today <= endDate;
                    });
                    
                    if (ongoingExams.length > 0) {
                        upcomingText = 'Ongoing';
                        if (ongoingExams.length > 1) {
                            upcomingText += ` (${ongoingExams.length})`;
                        }
                    }
                }
            }
            
            // Also get recent graded exams count
            const { data: grades } = await this.sb
                .from('exam_grades')
                .select('id')
                .eq('student_id', window.currentUserId)
                .not('graded_at', 'is', null);
            
            const gradedExams = grades?.length || 0;
            
            const metrics = {
                upcomingExam: upcomingText,
                upcomingCount: upcomingCount,
                gradedExams: gradedExams,
                averageScore: 0,
                bestScore: 0,
                passRate: 0,
                lastUpdated: new Date().toISOString()
            };
            
            this.updateExamsUI(metrics);
            
            console.log(`✅ Exams: ${upcomingText} (${upcomingCount} active)`);
            
        } catch (error) {
            console.error('❌ Error loading exams:', error);
            this.showErrorState('exams');
        }
    }
    
    // 🔥 Also update the UI update function to show counts
    updateExamsUI(metrics) {
        if (!metrics) return;
        
        const upcomingExam = metrics.upcomingExam || 'None';
        const upcomingCount = metrics.upcomingCount || 0;
        const gradedExams = metrics.gradedExams || 0;
        
        if (this.elements.upcomingExam) {
            this.elements.upcomingExam.textContent = upcomingExam;
            
            // Add tooltip with more info
            let tooltipText = '';
            if (upcomingExam === 'None') {
                tooltipText = 'No active exams';
            } else if (upcomingExam.includes('Ongoing')) {
                tooltipText = `${upcomingCount} exam${upcomingCount > 1 ? 's' : ''} currently active`;
            } else {
                tooltipText = `${upcomingCount} active exam${upcomingCount > 1 ? 's' : ''} (${gradedExams} graded)`;
            }
            this.elements.upcomingExam.title = tooltipText;
            
            // Apply color classes
            if (upcomingExam === 'Today' || upcomingExam === 'Ongoing') {
                this.elements.upcomingExam.classList.add('dashboard-stat-low');
                this.elements.upcomingExam.classList.remove('dashboard-stat-medium', 'dashboard-stat-high');
                
                // Add urgent indicator
                if (!this.elements.upcomingExam.querySelector('.urgent-dot')) {
                    const dot = document.createElement('span');
                    dot.className = 'urgent-dot';
                    
                    // 🔥 FIXED: Set styles individually
                    dot.style.display = 'inline-block';
                    dot.style.width = '8px';
                    dot.style.height = '8px';
                    dot.style.background = '#ef4444';
                    dot.style.borderRadius = '50%';
                    dot.style.marginLeft = '5px';
                    
                    this.elements.upcomingExam.appendChild(dot);
                }
            } else if (upcomingExam.includes('d') || upcomingExam.includes('w')) {
                this.elements.upcomingExam.classList.add('dashboard-stat-medium');
                this.elements.upcomingExam.classList.remove('dashboard-stat-low', 'dashboard-stat-high');
            } else {
                this.elements.upcomingExam.classList.remove('dashboard-stat-low', 'dashboard-stat-medium', 'dashboard-stat-high');
            }
        }
        
        // Update card appearance
        this.updateCardAppearance('exams', upcomingCount > 0 ? 1 : 0);
        
        console.log(`✅ Exams UI Updated: ${upcomingExam} (${upcomingCount} active)`);
    }
    
    // 🔥 UPDATED: Load resource metrics - ALL resources, not just new ones
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
                .select('id, created_at, resource_type')
                .eq('target_program', this.userProfile.program)
                .eq('block', this.userProfile.block)
                .eq('intake_year', this.userProfile.intake_year);
            
            // If we want ALL resources, don't filter by date
            if (!allResources) {
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                query = query.gte('created_at', oneWeekAgo.toISOString());
            }
            
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
            
            // Also update card label if we're showing all resources
            if (allResources && this.elements.resourcesCard) {
                const labelElement = this.elements.resourcesCard.querySelector('.stat-label');
                if (labelElement && !labelElement.textContent.includes('Available')) {
                    labelElement.textContent = 'Available Resources';
                }
            }
            
            console.log(`✅ Resources: ${resourceCount} ${allResources ? 'total available' : 'new'}`);
            
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
    
    // Update NurseIQ UI with metrics
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
                .eq('message_type', true)
                .order('created_at', { ascending: false })
                .limit(1);
            
            if (error) throw error;
            
            if (data && data.length > 0) {
                this.elements.studentAnnouncement.textContent = data[0].message;
                // Add timestamp
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
    
    async refreshDashboard(silent = false) {
        if (!silent) {
            console.log('🔄 Manually refreshing dashboard...');
            this.showLoadingStates();
        }
        
        await Promise.allSettled([
            this.loadAttendanceMetrics(),
            this.loadCourseMetrics(),
            this.loadExamMetrics(),
            this.loadResourceMetrics(true), // 🔥 Get ALL resources
            this.loadNurseIQMetrics()
        ]);
        
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
        
        document.addEventListener('coursesModuleReady', tryInit);
        
        document.addEventListener('profilePhotoUpdated', (e) => {
            console.log('📸 Profile photo updated globally', e.detail);
            if (dashboardModule) {
                dashboardModule.updateAllProfilePhotos(e.detail?.photoUrl);
            }
        });
    }
});

// 🔥 CRITICAL FIX: Force dashboard to show on first load
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 DOM loaded - checking dashboard visibility...');
    
    // Wait for everything to initialize
    setTimeout(() => {
        const dashboardTab = document.getElementById('dashboard');
        const isDashboardVisible = dashboardTab && 
            (dashboardTab.classList.contains('active') || 
             getComputedStyle(dashboardTab).display !== 'none');
        
        if (!isDashboardVisible && window.ui) {
            console.log('🚨 Dashboard not visible - forcing it to show...');
            
            // 1. Use UI module if available
            window.ui.showTab('dashboard');
            
            // 2. Emergency CSS fix
            dashboardTab.style.display = 'block';
            dashboardTab.classList.add('active');
            
            // 3. Hide all other tabs
            document.querySelectorAll('.tab-content:not(#dashboard)').forEach(tab => {
                tab.style.display = 'none';
                tab.classList.remove('active');
            });
        }
    }, 1500); // Wait 1.5 seconds for everything to load
});

// 🔥 ALSO: Listen for appReady event and force dashboard
document.addEventListener('appReady', function(e) {
    console.log('🎉 App ready - ensuring dashboard shows...');
    
    setTimeout(() => {
        if (window.ui) {
            window.ui.showTab('dashboard');
        } else {
            // Fallback
            const dashboard = document.getElementById('dashboard');
            if (dashboard) {
                dashboard.style.display = 'block';
                dashboard.classList.add('active');
            }
        }
    }, 500);
});

// 🔥 EMERGENCY: If still not showing after 3 seconds
setTimeout(() => {
    const dashboard = document.getElementById('dashboard');
    if (dashboard && getComputedStyle(dashboard).display === 'none') {
        console.log('🚨 EMERGENCY: Dashboard still hidden after 3s - forcing display');
        dashboard.style.display = 'block';
        dashboard.style.visibility = 'visible';
        dashboard.style.opacity = '1';
        dashboard.classList.add('active');
        
        // Hide all other tabs
        document.querySelectorAll('.tab-content:not(#dashboard)').forEach(tab => {
            tab.style.display = 'none';
        });
    }
}, 3000);

// 🔥 Add CSS styles for urgent dot animation
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(1.2); }
    }
    
    .urgent-dot {
        display: inline-block;
        width: 8px;
        height: 8px;
        background: #ef4444;
        border-radius: 50%;
        margin-left: 5px;
        animation: pulse 1.5s infinite;
    }
    
    .exam-count-badge {
        font-size: 0.75rem;
        padding: 2px 6px;
        border-radius: 10px;
        margin-left: 5px;
        background: #e5e7eb;
        color: #374151;
    }
    
    .exam-count-badge.today {
        background: #fee2e2;
        color: #991b1b;
    }
`;

// Only add the style once
if (!document.getElementById('dashboard-styles')) {
    style.id = 'dashboard-styles';
    document.head.appendChild(style);
}
