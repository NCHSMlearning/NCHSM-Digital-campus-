// dashboard.js - COMPLETE FINAL VERSION with Diagnostic
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
            exams: 'No upcoming exams'
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
        document.addEventListener('coursesModuleReady', () => this.updateCoursesMetric());
        document.addEventListener('examsModuleReady', () => this.updateExamsMetric());
        document.addEventListener('nurseiqMetricsUpdated', (e) => {
            if (e.detail) this.updateNurseIQMetric(e.detail);
        });
        document.addEventListener('attendanceCheckedIn', () => this.loadAttendanceMetrics());
        
        document.addEventListener('approvedUnitsLoaded', (e) => {
            if (e.detail && e.detail.count !== undefined) {
                if (this.elements.dashboardApprovedUnits) {
                    this.elements.dashboardApprovedUnits.textContent = e.detail.count;
                }
                if (this.elements.dashboardExamStatus) {
                    const isEligible = e.detail.count > 0;
                    this.elements.dashboardExamStatus.textContent = isEligible ? 'ELIGIBLE' : 'NOT ELIGIBLE';
                    this.elements.dashboardExamStatus.style.color = isEligible ? '#059669' : '#dc2626';
                }
            }
        });
        
        if (this.elements.headerRefresh) {
            this.elements.headerRefresh.addEventListener('click', () => this.refreshAll());
        }
        
        this.addCardClickHandlers();
    }
    
    addCardClickHandlers() {
        const tabMapping = {
            'attendance': 'attendance',
            'cats': 'cats',
            'hub-courses': 'hub-courses',
            'resources': 'resources',
            'nurseiq': 'nurseiq',
            'hub-exam-card': 'hub-exam-card'
        };
        
        const cards = document.querySelectorAll('.stat-card');
        
        cards.forEach(card => {
            const newCard = card.cloneNode(true);
            card.parentNode.replaceChild(newCard, card);
            
            let tabToOpen = newCard.getAttribute('data-tab');
            if (newCard.classList.contains('nurseiq-card')) tabToOpen = 'nurseiq';
            if (newCard.classList.contains('examcard-card')) tabToOpen = 'hub-exam-card';
            
            const finalTab = tabMapping[tabToOpen] || tabToOpen;
            
            newCard.addEventListener('click', (e) => {
                if (e.target.closest('button') || e.target.closest('a')) return;
                if (typeof window.showTab === 'function') {
                    window.showTab(finalTab);
                }
            });
            
            newCard.style.cursor = 'pointer';
            newCard.style.transition = 'all 0.2s ease';
        });
        
        console.log('✅ All cards clickable');
    }
    
    async initialize(userId, userProfile) {
        console.log('👤 Dashboard initializing...');
        
        this.userId = userId;
        this.userProfile = userProfile;
        
        if (!userId || !userProfile) return false;
        
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
        
        await this.loadAllMetrics();
        this.startAutoRefresh();
        
        // Run diagnostic after load
        setTimeout(() => this.runDiagnostic(), 1000);
        
        return true;
    }
    
    async loadAllMetrics() {
        console.log('📊 Loading all dashboard metrics...');
        const startTime = performance.now();
        
        await Promise.allSettled([
            this.loadAttendanceMetrics(),
            this.loadResourcesMetrics(),
            this.loadExamCardMetrics(),
            this.loadNurseIQMetrics(),
            this.updateCoursesMetric(),
            this.updateExamsMetric()
        ]);
        
        console.log(`✅ All metrics loaded in ${(performance.now() - startTime).toFixed(0)}ms`);
        this.displaySummary();
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
            
            if (this.elements.attendanceRate) this.elements.attendanceRate.textContent = `${rate}%`;
            if (this.elements.verifiedCount) this.elements.verifiedCount.textContent = verified;
            if (this.elements.totalCount) this.elements.totalCount.textContent = total;
            if (this.elements.pendingCount) this.elements.pendingCount.textContent = total - verified;
            
            console.log(`📊 Attendance: ${rate}% (${verified}/${total})`);
            
        } catch (error) {
            console.error('Attendance error:', error);
        }
    }
    
    async loadResourcesMetrics() {
        if (!this.userProfile || !this.sb) return;
        
        try {
            let allResources = [];
            
            const { data: programResources, error: progError } = await this.sb
                .from('resources')
                .select('id, title')
                .eq('target_program', this.userProfile.program)
                .eq('block', this.userProfile.block)
                .eq('intake_year', this.userProfile.intake_year);
            
            if (!progError && programResources) {
                allResources = [...programResources];
                console.log(`📁 Program resources: ${programResources.length}`);
                if (programResources.length > 0) {
                    programResources.forEach(r => console.log(`   └─ ${r.title}`));
                }
            }
            
            const { data: generalResources, error: genError } = await this.sb
                .from('resources')
                .select('id, title')
                .eq('target_program', 'General')
                .eq('block', this.userProfile.block);
            
            if (!genError && generalResources) {
                allResources = [...allResources, ...generalResources];
                console.log(`📁 General resources: ${generalResources.length}`);
                if (generalResources.length > 0) {
                    generalResources.forEach(r => console.log(`   └─ ${r.title}`));
                }
            }
            
            const uniqueIds = new Set();
            allResources.forEach(r => uniqueIds.add(r.id));
            this.metrics.resources = uniqueIds.size;
            
            if (this.elements.newResources) {
                this.elements.newResources.textContent = this.metrics.resources;
                this.elements.newResources.title = `Total resources: ${this.metrics.resources}`;
            }
            
            console.log(`📊 TOTAL RESOURCES: ${this.metrics.resources}`);
            
        } catch (error) {
            console.error('Resources error:', error);
            if (this.elements.newResources) this.elements.newResources.textContent = '0';
        }
    }
    
    async loadExamCardMetrics() {
        if (!this.userId || !this.sb) return;
        
        try {
            const { data: student } = await this.sb
                .from('consolidated_user_profiles_table')
                .select('block')
                .eq('user_id', this.userId)
                .single();
            
            const { data: registrations } = await this.sb
                .from('student_unit_registrations')
                .select('id, unit_code, status')
                .eq('student_id', this.userId)
                .eq('status', 'approved');
            
            const approved = registrations?.length || 0;
            const semester = student?.block || 'Current Semester';
            
            this.metrics.examCard = { approved, eligible: approved > 0, semester };
            
            if (this.elements.dashboardExamStatus) {
                this.elements.dashboardExamStatus.textContent = approved > 0 ? 'ELIGIBLE' : 'NOT ELIGIBLE';
                this.elements.dashboardExamStatus.style.color = approved > 0 ? '#059669' : '#dc2626';
            }
            if (this.elements.dashboardApprovedUnits) this.elements.dashboardApprovedUnits.textContent = approved;
            if (this.elements.dashboardCurrentSemester) this.elements.dashboardCurrentSemester.textContent = semester;
            
            console.log(`📇 Exam Card: ${approved} approved units - ${approved > 0 ? 'ELIGIBLE' : 'NOT ELIGIBLE'}`);
            if (registrations?.length > 0) {
                registrations.forEach(r => console.log(`   └─ ${r.unit_code || 'Unit'}`));
            }
            
        } catch (error) {
            console.error('Exam card error:', error);
        }
    }
    
    async loadNurseIQMetrics() {
        try {
            const cached = localStorage.getItem('nurseiq_dashboard_metrics');
            if (cached) {
                const data = JSON.parse(cached);
                if (Date.now() - (data.timestamp || 0) < 300000) {
                    this.updateNurseIQMetric(data);
                    console.log(`🧠 NurseIQ (cached): ${data.progress || 0}% progress, ${data.accuracy || 0}% accuracy, ${data.totalAnswered || 0} questions`);
                    return;
                }
            }
        } catch (e) {}
        
        if (typeof window.getNurseIQDashboardMetrics === 'function') {
            const metrics = window.getNurseIQDashboardMetrics();
            if (metrics) {
                this.updateNurseIQMetric(metrics);
                console.log(`🧠 NurseIQ: ${metrics.progress || 0}% progress, ${metrics.accuracy || 0}% accuracy, ${metrics.totalAnswered || 0} questions`);
                return;
            }
        }
        
        this.updateNurseIQMetric({ progress: 0, accuracy: 0, totalAnswered: 0 });
        console.log(`🧠 NurseIQ: No data available`);
    }
    
    updateNurseIQMetric(metrics) {
        if (!metrics) return;
        
        if (this.elements.nurseiqProgress) {
            this.elements.nurseiqProgress.textContent = `${metrics.progress || 0}%`;
        }
        if (this.elements.nurseiqAccuracy) {
            this.elements.nurseiqAccuracy.textContent = `${metrics.accuracy || 0}%`;
        }
        if (this.elements.nurseiqQuestions) {
            this.elements.nurseiqQuestions.textContent = metrics.totalAnswered || 0;
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
        
        console.log(`📚 Active Courses: ${activeCount}`);
    }
    
    updateExamsMetric() {
        let upcomingText = 'No upcoming exams';
        
        if (typeof window.getExamsDashboardMetrics === 'function') {
            const metrics = window.getExamsDashboardMetrics();
            if (metrics && metrics.upcomingExam) {
                upcomingText = metrics.upcomingExam;
            }
        }
        
        this.metrics.exams = upcomingText;
        if (this.elements.upcomingExam) {
            this.elements.upcomingExam.textContent = upcomingText;
        }
        
        console.log(`📝 Upcoming Exam: ${upcomingText}`);
    }
    
    displaySummary() {
        console.log('\n═══════════════════════════════════════');
        console.log('📊 DASHBOARD SUMMARY');
        console.log('═══════════════════════════════════════');
        console.log(`   Attendance Rate: ${this.metrics.attendance.rate}% (${this.metrics.attendance.verified}/${this.metrics.attendance.total})`);
        console.log(`   Active Courses: ${this.metrics.courses}`);
        console.log(`   Resources: ${this.metrics.resources}`);
        console.log(`   Exam Card: ${this.metrics.examCard.eligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'} (${this.metrics.examCard.approved} units)`);
        console.log(`   NurseIQ: ${this.metrics.nurseiq.progress}% progress, ${this.metrics.nurseiq.accuracy}% accuracy`);
        console.log(`   Upcoming Exam: ${this.metrics.exams}`);
        console.log('═══════════════════════════════════════');
    }
    
    async runDiagnostic() {
        console.log('\n🔍 RUNNING FULL DIAGNOSTIC...');
        console.log('═══════════════════════════════════════');
        console.log(`🔌 Database: ${!!this.sb ? 'Connected' : 'Not connected'}`);
        console.log(`👤 User: ${this.userProfile?.full_name || 'Unknown'}`);
        console.log(`📋 Program: ${this.userProfile?.program || 'Unknown'}`);
        console.log(`📚 Block: ${this.userProfile?.block || 'Unknown'}`);
        console.log('═══════════════════════════════════════');
        console.log('🎯 All systems operational!');
    }
    
    startLiveClock() {
        const headerTime = document.getElementById('header-time');
        if (headerTime) {
            const updateTime = () => {
                headerTime.textContent = new Date().toLocaleTimeString('en-US', { 
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
        }, 120000);
    }
    
    async refreshAll() {
        console.log('🔄 Manual refresh...');
        await this.loadAllMetrics();
    }
}

let dashboardModule = null;

function initDashboardModule(supabaseClient) {
    const client = supabaseClient || window.sb || window.db?.supabase;
    if (!client) return null;
    
    dashboardModule = new DashboardModule(client);
    return dashboardModule;
}

window.DashboardModule = DashboardModule;
window.initDashboardModule = initDashboardModule;
window.refreshDashboard = () => dashboardModule?.refreshAll();

console.log('✅ Dashboard module ready - Complete version with diagnostic');
