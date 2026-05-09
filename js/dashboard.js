// Optimized Dashboard Module - Fast Loading
class DashboardModule {
    constructor(supabaseClient) {
        console.log('🚀 Initializing DashboardModule...');
        
        this.sb = supabaseClient || window.sb || window.db?.supabase;
        this.userId = null;
        this.userProfile = null;
        this.autoRefreshInterval = null;
        
        // Cache for metrics
        this.metricsCache = {
            attendance: null,
            resources: null,
            examCard: null,
            nurseiq: null,
            courses: null,
            exams: null,
            lastUpdated: {}
        };
        
        // Track loading to prevent duplicates
        this.loadingStates = {
            attendance: false,
            resources: false,
            examCard: false,
            nurseiq: false
        };
        
        this.cacheElements();
        this.setupEventListeners();
        this.startLiveClock();
        
        console.log('✅ DashboardModule initialized');
    }
    
    cacheElements() {
        this.elements = {
            welcomeHeader: document.getElementById('welcome-header'),
            welcomeMessage: document.getElementById('student-welcome-message'),
            studentAnnouncement: document.getElementById('student-announcement'),
            attendanceRate: document.getElementById('dashboard-attendance-rate'),
            verifiedCount: document.getElementById('dashboard-verified-count'),
            totalCount: document.getElementById('dashboard-total-count'),
            pendingCount: document.getElementById('dashboard-pending-count'),
            upcomingExam: document.getElementById('dashboard-upcoming-exam'),
            activeCourses: document.getElementById('dashboard-active-courses'),
            newResources: document.getElementById('dashboard-new-resources'),
            dashboardExamStatus: document.getElementById('dashboard-exam-status'),
            dashboardApprovedUnits: document.getElementById('dashboard-approved-units'),
            dashboardCurrentSemester: document.getElementById('dashboard-current-semester'),
            nurseiqProgress: document.getElementById('dashboard-nurseiq-progress'),
            nurseiqAccuracy: document.getElementById('dashboard-nurseiq-accuracy'),
            nurseiqQuestions: document.getElementById('dashboard-nurseiq-questions'),
            attendanceCard: document.querySelector('.stat-card[data-tab="attendance"]'),
            examsCard: document.querySelector('.stat-card[data-tab="cats"]'),
            coursesCard: document.querySelector('.stat-card[data-tab="courses"]'),
            resourcesCard: document.querySelector('.stat-card[data-tab="resources"]'),
            headerTime: document.getElementById('header-time'),
            headerUserName: document.getElementById('header-user-name'),
            headerProfilePhoto: document.getElementById('header-profile-photo'),
            headerRefresh: document.getElementById('header-refresh'),
            currentDateTime: document.getElementById('currentDateTime')
        };
    }
    
    setupEventListeners() {
        let debounceTimer;
        
        // Debounced events
        document.addEventListener('attendanceCheckedIn', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => this.loadAttendanceMetrics(true), 100);
        });
        
        document.addEventListener('coursesModuleReady', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => this.handleCoursesReady(e.detail), 100);
        });
        
        document.addEventListener('examsModuleReady', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => this.handleExamsReady(e.detail), 100);
        });
        
        document.addEventListener('nurseiqMetricsUpdated', (e) => {
            if (e.detail) this.updateNurseIQUI(e.detail);
        });
        
        if (this.elements.headerRefresh) {
            this.elements.headerRefresh.addEventListener('click', () => this.refreshDashboard(true));
        }
        
        this.addCardClickHandlers();
    }
    
    async initialize(userId, userProfile) {
        console.log('👤 Dashboard initializing...');
        
        this.userId = userId;
        this.userProfile = userProfile;
        
        if (!userId || !userProfile) return false;
        
        this.updateAllUserInfo();
        this.showLoadingStates();
        this.startAutoRefresh();
        
        // Load everything in parallel
        await this.loadDashboardData();
        
        setTimeout(() => this.addCardClickHandlers(), 500);
        return true;
    }
    
    async loadDashboardData(forceRefresh = false) {
        const startTime = performance.now();
        
        const shouldRefresh = (key) => {
            if (forceRefresh) return true;
            const lastUpdate = this.metricsCache.lastUpdated[key];
            if (!lastUpdate) return true;
            return (Date.now() - lastUpdate) > 120000; // 2 minutes cache
        };
        
        const promises = [];
        
        if (shouldRefresh('attendance') && !this.loadingStates.attendance) {
            promises.push(this.loadAttendanceMetrics());
        }
        if (shouldRefresh('resources') && !this.loadingStates.resources) {
            promises.push(this.loadResourceMetrics());
        }
        if (shouldRefresh('examCard') && !this.loadingStates.examCard) {
            promises.push(this.loadExamCardData());
        }
        if (shouldRefresh('nurseiq') && !this.loadingStates.nurseiq) {
            promises.push(this.loadNurseIQMetrics());
        }
        
        await Promise.allSettled(promises);
        
        // Fast module data (from memory)
        this.tryLoadCourses();
        this.tryLoadExams();
        
        console.log(`✅ Dashboard loaded in ${(performance.now() - startTime).toFixed(0)}ms`);
        this.updateAllCardsAppearance();
    }
    
    async loadAttendanceMetrics(forceRefresh = false) {
        if (!forceRefresh && this.metricsCache.attendance) {
            this.updateAttendanceUI(this.metricsCache.attendance);
            return;
        }
        if (this.loadingStates.attendance) return;
        
        this.loadingStates.attendance = true;
        
        if (!this.userId || !this.sb) {
            this.showErrorState('attendance');
            this.loadingStates.attendance = false;
            return;
        }
        
        try {
            const { data: logs, error } = await this.sb
                .from('geo_attendance_logs')
                .select('is_verified')
                .eq('student_id', this.userId)
                .limit(500);
            
            if (error) throw error;
            
            const totalLogs = logs?.length || 0;
            const verifiedCount = logs?.filter(l => l.is_verified === true).length || 0;
            const attendanceRate = totalLogs > 0 ? Math.round((verifiedCount / totalLogs) * 100) : 0;
            
            this.metricsCache.attendance = { attendanceRate, verifiedCount, totalCount: totalLogs, pendingCount: totalLogs - verifiedCount };
            this.metricsCache.lastUpdated.attendance = Date.now();
            this.updateAttendanceUI(this.metricsCache.attendance);
            
        } catch (error) {
            console.error('Attendance error:', error);
            this.showErrorState('attendance');
        } finally {
            this.loadingStates.attendance = false;
        }
    }
    
    updateAttendanceUI(data) {
        if (!data) return;
        if (this.elements.attendanceRate) this.elements.attendanceRate.textContent = `${data.attendanceRate}%`;
        if (this.elements.verifiedCount) this.elements.verifiedCount.textContent = data.verifiedCount;
        if (this.elements.totalCount) this.elements.totalCount.textContent = data.totalCount;
        if (this.elements.pendingCount) this.elements.pendingCount.textContent = data.pendingCount;
        this.updateCardAppearance('attendance', data.attendanceRate);
    }
    
    async loadResourceMetrics(forceRefresh = false) {
        if (!forceRefresh && this.metricsCache.resources) {
            this.updateResourcesUI(this.metricsCache.resources);
            return;
        }
        if (this.loadingStates.resources) return;
        
        this.loadingStates.resources = true;
        
        if (!this.userProfile || !this.sb) {
            this.showErrorState('resources');
            this.loadingStates.resources = false;
            return;
        }
        
        try {
            const { data: resources, error } = await this.sb
                .from('resources')
                .select('id')
                .eq('target_program', this.userProfile.program)
                .eq('block', this.userProfile.block)
                .eq('intake_year', this.userProfile.intake_year)
                .limit(1);
            
            if (error) throw error;
            
            const resourceCount = resources?.length || 0;
            this.metricsCache.resources = { count: resourceCount };
            this.metricsCache.lastUpdated.resources = Date.now();
            this.updateResourcesUI(this.metricsCache.resources);
            
        } catch (error) {
            console.error('Resources error:', error);
            this.showErrorState('resources');
        } finally {
            this.loadingStates.resources = false;
        }
    }
    
    updateResourcesUI(data) {
        if (!data || !this.elements.newResources) return;
        this.elements.newResources.textContent = data.count;
        this.updateCardAppearance('resources', data.count);
    }
    
    async loadExamCardData(forceRefresh = false) {
        if (!forceRefresh && this.metricsCache.examCard) {
            this.updateExamCardUI(this.metricsCache.examCard);
            return;
        }
        if (this.loadingStates.examCard) return;
        
        this.loadingStates.examCard = true;
        
        if (!this.userId || !this.sb) {
            this.loadingStates.examCard = false;
            return;
        }
        
        try {
            const { data: student } = await this.sb
                .from('consolidated_user_profiles_table')
                .select('block')
                .eq('user_id', this.userId)
                .single();
            
            const { data: registrations } = await this.sb
                .from('student_unit_registrations')
                .select('id')
                .eq('student_id', this.userId)
                .eq('status', 'approved');
            
            const approvedCount = registrations?.length || 0;
            const isEligible = approvedCount > 0;
            const currentSemester = student?.block || 'Current Semester';
            
            this.metricsCache.examCard = { approvedCount, isEligible, currentSemester };
            this.metricsCache.lastUpdated.examCard = Date.now();
            this.updateExamCardUI(this.metricsCache.examCard);
            
        } catch (error) {
            console.error('Exam card error:', error);
        } finally {
            this.loadingStates.examCard = false;
        }
    }
    
    updateExamCardUI(data) {
        if (!data) return;
        if (this.elements.dashboardExamStatus) {
            this.elements.dashboardExamStatus.textContent = data.isEligible ? 'ELIGIBLE' : 'NOT ELIGIBLE';
            this.elements.dashboardExamStatus.style.color = data.isEligible ? '#059669' : '#dc2626';
        }
        if (this.elements.dashboardApprovedUnits) this.elements.dashboardApprovedUnits.textContent = data.approvedCount;
        if (this.elements.dashboardCurrentSemester) this.elements.dashboardCurrentSemester.textContent = data.currentSemester;
    }
    
    async loadNurseIQMetrics() {
        try {
            const cached = localStorage.getItem('nurseiq_dashboard_metrics');
            if (cached) {
                const metrics = JSON.parse(cached);
                if (Date.now() - (metrics.timestamp || 0) < 300000) { // 5 min cache
                    this.updateNurseIQUI(metrics);
                    return;
                }
            }
        } catch (e) {}
        
        if (typeof window.getNurseIQDashboardMetrics === 'function') {
            const metrics = window.getNurseIQDashboardMetrics();
            if (metrics) this.updateNurseIQUI(metrics);
        }
    }
    
    updateNurseIQUI(metrics) {
        if (!metrics) return;
        if (this.elements.nurseiqProgress) this.elements.nurseiqProgress.textContent = `${metrics.progress || 0}%`;
        if (this.elements.nurseiqAccuracy) this.elements.nurseiqAccuracy.textContent = `${metrics.accuracy || 0}%`;
        if (this.elements.nurseiqQuestions) this.elements.nurseiqQuestions.textContent = metrics.totalAnswered || 0;
        this.updateCardAppearance('nurseiq', metrics.progress || 0);
    }
    
    tryLoadCourses() {
        let activeCount = 0;
        
        if (window.coursesModule?.getActiveCourseCount) {
            activeCount = window.coursesModule.getActiveCourseCount();
        } else if (window.coursesModule?.courses?.length > 0) {
            activeCount = window.coursesModule.courses.filter(c => !c.status?.includes('Completed')).length;
        }
        
        if (this.elements.activeCourses) {
            this.elements.activeCourses.textContent = activeCount;
            this.updateCardAppearance('courses', activeCount);
        }
    }
    
    tryLoadExams() {
        let metrics = null;
        
        if (typeof window.getExamsDashboardMetrics === 'function') {
            metrics = window.getExamsDashboardMetrics();
        }
        
        if (metrics && this.elements.upcomingExam) {
            const upcomingText = metrics.upcomingExam || 'No upcoming exams';
            this.elements.upcomingExam.textContent = upcomingText.length > 25 ? upcomingText.substring(0, 22) + '...' : upcomingText;
            this.updateCardAppearance('exams', metrics.upcomingCount || 0);
        }
    }
    
    updateCardAppearance(type, value) {
        const cardMap = {
            'attendance': this.elements.attendanceCard,
            'courses': this.elements.coursesCard,
            'resources': this.elements.resourcesCard,
            'exams': this.elements.examsCard
        };
        
        const card = cardMap[type];
        if (!card) return;
        
        const thresholds = {
            'attendance': { high: 80, medium: 60, low: 0 },
            'courses': { high: 5, medium: 1, low: 0 },
            'resources': { high: 10, medium: 5, low: 1 },
            'exams': { high: 3, medium: 1, low: 0 }
        };
        
        const t = thresholds[type];
        if (!t) return;
        
        card.classList.remove('card-success', 'card-warning', 'card-danger');
        
        if (value >= t.high) card.classList.add('card-success');
        else if (value >= t.medium) card.classList.add('card-warning');
        else if (value >= t.low) card.classList.add('card-danger');
    }
    
    updateAllCardsAppearance() {
        requestAnimationFrame(() => {
            const attendanceRate = parseInt(this.elements.attendanceRate?.textContent?.replace('%', '') || '0');
            const activeCourses = parseInt(this.elements.activeCourses?.textContent || '0');
            const resourceCount = parseInt(this.elements.newResources?.textContent || '0');
            const upcomingExam = this.elements.upcomingExam?.textContent;
            
            this.updateCardAppearance('attendance', attendanceRate);
            this.updateCardAppearance('courses', activeCourses);
            this.updateCardAppearance('resources', resourceCount);
            
            if (upcomingExam && upcomingExam !== 'Loading...' && upcomingExam !== 'No upcoming exams') {
                this.updateCardAppearance('exams', 1);
            }
        });
    }
    
    handleCoursesReady(detail) {
        let activeCount = detail?.activeCount || 
                         window.coursesModule?.getActiveCourseCount?.() || 0;
        
        if (this.elements.activeCourses) {
            this.elements.activeCourses.textContent = activeCount;
            this.updateCardAppearance('courses', activeCount);
        }
    }
    
    handleExamsReady(detail) {
        let metrics = detail?.metrics || 
                     (typeof window.getExamsDashboardMetrics === 'function' ? window.getExamsDashboardMetrics() : null);
        
        if (metrics && this.elements.upcomingExam) {
            const upcomingText = metrics.upcomingExam || 'No upcoming exams';
            this.elements.upcomingExam.textContent = upcomingText.length > 25 ? upcomingText.substring(0, 22) + '...' : upcomingText;
            this.updateCardAppearance('exams', metrics.upcomingCount || 0);
        }
    }
    
    addCardClickHandlers() {
        const cards = document.querySelectorAll('.stat-card');
        cards.forEach(card => {
            card.removeEventListener('click', this.handleCardClick);
            card.addEventListener('click', (e) => {
                if (e.target.closest('button, a')) return;
                const tab = card.getAttribute('data-tab');
                if (tab && typeof window.showTab === 'function') window.showTab(tab);
            });
        });
    }
    
    updateAllUserInfo() {
        if (!this.userProfile) return;
        
        const studentName = this.userProfile.full_name || 'Student';
        
        if (this.elements.headerUserName) this.elements.headerUserName.textContent = studentName;
        
        if (this.elements.welcomeHeader) {
            const hour = new Date().getHours();
            const greeting = hour >= 5 && hour < 12 ? 'Good Morning' :
                           hour >= 12 && hour < 17 ? 'Good Afternoon' :
                           hour >= 17 && hour < 21 ? 'Good Evening' : 'Good Night';
            this.elements.welcomeHeader.textContent = `${greeting}, ${studentName}!`;
        }
        
        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(studentName.replace(/\s/g, '+'))}&background=667eea&color=fff&size=100`;
        if (this.elements.headerProfilePhoto) this.elements.headerProfilePhoto.src = avatarUrl;
    }
    
    showLoadingStates() {
        const loadingTexts = {
            attendanceRate: '--%',
            verifiedCount: '--',
            totalCount: '--',
            pendingCount: '--',
            upcomingExam: 'Loading...',
            activeCourses: '--',
            newResources: '--',
            nurseiqProgress: '--%',
            nurseiqAccuracy: '--%',
            nurseiqQuestions: '--',
            dashboardExamStatus: '--'
        };
        
        for (const [key, value] of Object.entries(loadingTexts)) {
            if (this.elements[key]) this.elements[key].textContent = value;
        }
    }
    
    showErrorState(metric) {
        const errors = {
            attendance: { attendanceRate: 'Error%', verifiedCount: '--', totalCount: '--', pendingCount: '--' },
            resources: { newResources: '0' }
        };
        
        const errorData = errors[metric];
        if (errorData) {
            for (const [key, value] of Object.entries(errorData)) {
                if (this.elements[key]) this.elements[key].textContent = value;
            }
        }
    }
    
    startLiveClock() {
        if (this.elements.headerTime) {
            const updateTime = () => {
                this.elements.headerTime.textContent = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            };
            updateTime();
            setInterval(updateTime, 60000);
        }
    }
    
    startAutoRefresh() {
        if (this.autoRefreshInterval) clearInterval(this.autoRefreshInterval);
        
        this.autoRefreshInterval = setInterval(() => {
            if (!document.hidden) this.loadDashboardData(false);
        }, 180000); // 3 minutes
        
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) this.loadDashboardData(false);
        });
    }
    
    async refreshDashboard(forceRefresh = true) {
        console.log('🔄 Refreshing dashboard...');
        if (forceRefresh) {
            this.metricsCache = { attendance: null, resources: null, examCard: null, nurseiq: null, courses: null, exams: null, lastUpdated: {} };
            this.showLoadingStates();
        }
        await this.loadDashboardData(forceRefresh);
    }
}

// Initialize
let dashboardModule = null;

function initDashboardModule(supabaseClient) {
    const client = supabaseClient || window.sb || window.db?.supabase;
    if (!client) return null;
    
    dashboardModule = new DashboardModule(client);
    return dashboardModule;
}

window.DashboardModule = DashboardModule;
window.initDashboardModule = initDashboardModule;
window.refreshDashboard = () => dashboardModule?.refreshDashboard(true);
