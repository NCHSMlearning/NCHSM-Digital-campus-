// dashboard.js - Complete Working Dashboard Module
class DashboardModule {
    constructor(supabaseClient) {
        console.log('🚀 Initializing DashboardModule...');
        
        this.sb = supabaseClient || window.sb || window.db?.supabase;
        this.userId = null;
        this.userProfile = null;
        this.autoRefreshInterval = null;
        
        // Cache for metrics
        this.metrics = {
            attendance: { rate: 0, verified: 0, total: 0, pending: 0 },
            resources: 0,
            examCard: { approved: 0, eligible: false, semester: 'Current' },
            nurseiq: { progress: 0, accuracy: 0, questions: 0 },
            courses: 0,
            exams: 'Loading...'
        };
        
        this.cacheElements();
        this.setupEventListeners();
        this.startLiveClock();
        
        console.log('✅ DashboardModule initialized');
    }
    
    cacheElements() {
        this.elements = {
            welcomeHeader: document.getElementById('welcome-header'),
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
            headerUserName: document.getElementById('header-user-name'),
            headerProfilePhoto: document.getElementById('header-profile-photo'),
            headerRefresh: document.getElementById('header-refresh')
        };
    }
    
    setupEventListeners() {
        // Listen for module ready events
        document.addEventListener('coursesModuleReady', () => this.updateCoursesMetric());
        document.addEventListener('examsModuleReady', () => this.updateExamsMetric());
        document.addEventListener('nurseiqMetricsUpdated', (e) => {
            if (e.detail) this.updateNurseIQMetric(e.detail);
        });
        document.addEventListener('attendanceCheckedIn', () => this.loadAttendanceMetrics());
        
        // Refresh button
        if (this.elements.headerRefresh) {
            this.elements.headerRefresh.addEventListener('click', () => this.refreshAll());
        }
        
        // Card click handlers
        this.addCardClickHandlers();
    }
    
    async initialize(userId, userProfile) {
        console.log('👤 Dashboard initializing...');
        
        this.userId = userId;
        this.userProfile = userProfile;
        
        if (!userId || !userProfile) return false;
        
        // Update user info
        if (this.elements.headerUserName && userProfile.full_name) {
            this.elements.headerUserName.textContent = userProfile.full_name;
        }
        
        const hour = new Date().getHours();
        const greeting = hour >= 5 && hour < 12 ? 'Good Morning' :
                       hour >= 12 && hour < 17 ? 'Good Afternoon' :
                       hour >= 17 && hour < 21 ? 'Good Evening' : 'Good Night';
        if (this.elements.welcomeHeader) {
            this.elements.welcomeHeader.textContent = `${greeting}, ${userProfile.full_name || 'Student'}!`;
        }
        
        // Load all metrics in parallel
        await this.loadAllMetrics();
        
        // Start auto-refresh every 2 minutes
        this.startAutoRefresh();
        
        return true;
    }
    
    async loadAllMetrics() {
        console.log('📊 Loading all dashboard metrics...');
        const startTime = performance.now();
        
        // Run all in parallel
        await Promise.allSettled([
            this.loadAttendanceMetrics(),
            this.loadResourcesMetrics(),
            this.loadExamCardMetrics(),
            this.loadNurseIQMetrics(),
            this.updateCoursesMetric(),
            this.updateExamsMetric()
        ]);
        
        console.log(`✅ All metrics loaded in ${(performance.now() - startTime).toFixed(0)}ms`);
    }
    
    async loadAttendanceMetrics() {
        if (!this.userId || !this.sb) return;
        
        try {
            const { data: logs, error } = await this.sb
                .from('geo_attendance_logs')
                .select('is_verified')
                .eq('student_id', this.userId)
                .limit(500);
            
            if (error) throw error;
            
            const total = logs?.length || 0;
            const verified = logs?.filter(l => l.is_verified === true).length || 0;
            const rate = total > 0 ? Math.round((verified / total) * 100) : 0;
            
            this.metrics.attendance = { rate, verified, total, pending: total - verified };
            this.updateAttendanceUI();
            
        } catch (error) {
            console.error('Attendance error:', error);
        }
    }
    
    updateAttendanceUI() {
        const a = this.metrics.attendance;
        if (this.elements.attendanceRate) this.elements.attendanceRate.textContent = `${a.rate}%`;
        if (this.elements.verifiedCount) this.elements.verifiedCount.textContent = a.verified;
        if (this.elements.totalCount) this.elements.totalCount.textContent = a.total;
        if (this.elements.pendingCount) this.elements.pendingCount.textContent = a.pending;
    }
    
    async loadResourcesMetrics() {
        if (!this.userProfile || !this.sb) return;
        
        try {
            // Get ALL resources for this student's program AND block
            // NO time filter - show everything!
            const { data: resources, error } = await this.sb
                .from('resources')
                .select('id')
                .eq('target_program', this.userProfile.program)
                .eq('block', this.userProfile.block)
                .eq('intake_year', this.userProfile.intake_year);
            
            if (!error) {
                this.metrics.resources = resources?.length || 0;
                if (this.elements.newResources) {
                    this.elements.newResources.textContent = this.metrics.resources;
                    // Add title attribute to show it's total resources
                    this.elements.newResources.title = `Total resources available: ${this.metrics.resources}`;
                }
                console.log(`✅ Resources loaded: ${this.metrics.resources} total`);
            }
            
            // Also try to get general resources if no program-specific ones
            if (this.metrics.resources === 0) {
                const { data: generalResources } = await this.sb
                    .from('resources')
                    .select('id')
                    .eq('target_program', 'General')
                    .eq('block', this.userProfile.block);
                
                if (generalResources && generalResources.length > 0) {
                    this.metrics.resources = generalResources.length;
                    if (this.elements.newResources) {
                        this.elements.newResources.textContent = this.metrics.resources;
                    }
                    console.log(`✅ General resources loaded: ${this.metrics.resources}`);
                }
            }
            
        } catch (error) {
            console.error('Resources error:', error);
            if (this.elements.newResources) {
                this.elements.newResources.textContent = '0';
            }
        }
    }
    
    async loadExamCardMetrics() {
        if (!this.userId || !this.sb) return;
        
        try {
            // Get student block
            const { data: student } = await this.sb
                .from('consolidated_user_profiles_table')
                .select('block')
                .eq('user_id', this.userId)
                .single();
            
            // Get approved units
            const { data: registrations } = await this.sb
                .from('student_unit_registrations')
                .select('id')
                .eq('student_id', this.userId)
                .eq('status', 'approved');
            
            const approved = registrations?.length || 0;
            const semester = student?.block || 'Current Semester';
            
            this.metrics.examCard = { 
                approved, 
                eligible: approved > 0,
                semester: semester
            };
            this.updateExamCardUI();
            
        } catch (error) {
            console.error('Exam card error:', error);
        }
    }
    
    updateExamCardUI() {
        const e = this.metrics.examCard;
        if (this.elements.dashboardExamStatus) {
            this.elements.dashboardExamStatus.textContent = e.eligible ? 'ELIGIBLE' : 'NOT ELIGIBLE';
            this.elements.dashboardExamStatus.style.color = e.eligible ? '#059669' : '#dc2626';
        }
        if (this.elements.dashboardApprovedUnits) {
            this.elements.dashboardApprovedUnits.textContent = e.approved;
        }
        if (this.elements.dashboardCurrentSemester) {
            this.elements.dashboardCurrentSemester.textContent = e.semester;
        }
    }
    
    async loadNurseIQMetrics() {
        // Try to get from localStorage first (fastest)
        try {
            const cached = localStorage.getItem('nurseiq_dashboard_metrics');
            if (cached) {
                const data = JSON.parse(cached);
                if (Date.now() - (data.timestamp || 0) < 300000) {
                    this.updateNurseIQMetric(data);
                    return;
                }
            }
        } catch (e) {}
        
        // Try from global function
        if (typeof window.getNurseIQDashboardMetrics === 'function') {
            const metrics = window.getNurseIQDashboardMetrics();
            if (metrics) {
                this.updateNurseIQMetric(metrics);
                return;
            }
        }
        
        // Try from nurseiq module directly
        if (window.nurseiqModule) {
            let progress = 0, accuracy = 0, questions = 0;
            if (window.nurseiqModule.getProgress) progress = window.nurseiqModule.getProgress();
            if (window.nurseiqModule.getAccuracy) accuracy = window.nurseiqModule.getAccuracy();
            if (window.nurseiqModule.getTotalQuestions) questions = window.nurseiqModule.getTotalQuestions();
            
            this.updateNurseIQMetric({ progress, accuracy, totalAnswered: questions });
            return;
        }
        
        // Default values
        this.updateNurseIQMetric({ progress: 0, accuracy: 0, totalAnswered: 0 });
    }
    
    updateNurseIQMetric(metrics) {
        if (!metrics) return;
        this.metrics.nurseiq = {
            progress: metrics.progress || 0,
            accuracy: metrics.accuracy || 0,
            questions: metrics.totalAnswered || 0
        };
        
        if (this.elements.nurseiqProgress) {
            this.elements.nurseiqProgress.textContent = `${this.metrics.nurseiq.progress}%`;
        }
        if (this.elements.nurseiqAccuracy) {
            this.elements.nurseiqAccuracy.textContent = `${this.metrics.nurseiq.accuracy}%`;
        }
        if (this.elements.nurseiqQuestions) {
            this.elements.nurseiqQuestions.textContent = this.metrics.nurseiq.questions;
        }
    }
    
    updateCoursesMetric() {
        let activeCount = 0;
        
        if (window.coursesModule) {
            if (window.coursesModule.getActiveCourseCount) {
                activeCount = window.coursesModule.getActiveCourseCount();
            } else if (window.coursesModule.courses) {
                activeCount = window.coursesModule.courses.filter(c => 
                    !c.status || !c.status.includes('Completed')
                ).length;
            }
        }
        
        this.metrics.courses = activeCount;
        if (this.elements.activeCourses) {
            this.elements.activeCourses.textContent = activeCount;
        }
    }
    
    updateExamsMetric() {
        let upcomingText = 'No upcoming exams';
        
        if (typeof window.getExamsDashboardMetrics === 'function') {
            const metrics = window.getExamsDashboardMetrics();
            if (metrics && metrics.upcomingExam) {
                upcomingText = metrics.upcomingExam;
            }
        } else if (window.examsModule && window.examsModule.getUpcomingExam) {
            const exam = window.examsModule.getUpcomingExam();
            if (exam) upcomingText = exam.name || 'Upcoming exam';
        }
        
        this.metrics.exams = upcomingText;
        if (this.elements.upcomingExam) {
            this.elements.upcomingExam.textContent = upcomingText;
        }
    }
    
    addCardClickHandlers() {
        const cards = document.querySelectorAll('.stat-card');
        cards.forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('button, a')) return;
                const tab = card.getAttribute('data-tab');
                if (tab && typeof window.showTab === 'function') {
                    window.showTab(tab);
                }
            });
        });
    }
    
    startLiveClock() {
        if (this.elements.headerTime) {
            const updateTime = () => {
                const now = new Date();
                this.elements.headerTime.textContent = now.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                });
            };
            updateTime();
            setInterval(updateTime, 60000);
        }
    }
    
    startAutoRefresh() {
        if (this.autoRefreshInterval) clearInterval(this.autoRefreshInterval);
        
        this.autoRefreshInterval = setInterval(() => {
            if (!document.hidden) {
                console.log('🔄 Auto-refreshing dashboard...');
                this.loadAllMetrics();
            }
        }, 120000); // Refresh every 2 minutes
    }
    
    async refreshAll() {
        console.log('🔄 Manual refresh...');
        await this.loadAllMetrics();
    }
}

// Initialize dashboard module globally
let dashboardModule = null;

function initDashboardModule(supabaseClient) {
    const client = supabaseClient || window.sb || window.db?.supabase;
    if (!client) {
        console.error('❌ No Supabase client for dashboard');
        return null;
    }
    
    dashboardModule = new DashboardModule(client);
    return dashboardModule;
}

// Expose globally
window.DashboardModule = DashboardModule;
window.initDashboardModule = initDashboardModule;
window.refreshDashboard = () => dashboardModule?.refreshAll();
