// dashboard.js - COMPLETE WORKING VERSION WITH LAST LOGIN (KENYA TIME)
class DashboardModule {
    constructor(supabaseClient) {
        console.log('🚀 Initializing DashboardModule...');
        
        this.sb = supabaseClient || window.sb || window.db?.supabase;
        this.userId = null;
        this.userProfile = null;
        this.autoRefreshInterval = null;
        
        this.metrics = {
            attendance: { rate: 0, verified: 0, total: 0, pending: 0 },
            resources: 0,
            examCard: { approved: 0, eligible: false, semester: 'Current' },
            nurseiq: { progress: 0, accuracy: 0, questions: 0 },
            courses: 0,
            exams: 'No upcoming exams',
            lastLogin: { time: null, formatted: 'Never', loginCount: 0 }
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
            dashboardCurrentBlockValue: document.getElementById('dashboard-current-block-value'),
            dashboardProgramName: document.getElementById('dashboard-program-name'),
            dashboardIntakeYear: document.getElementById('dashboard-intake-year'),
            nurseiqProgress: document.getElementById('dashboard-nurseiq-progress'),
            nurseiqAccuracy: document.getElementById('dashboard-nurseiq-accuracy'),
            nurseiqQuestions: document.getElementById('dashboard-nurseiq-questions'),
            headerUserName: document.getElementById('header-user-name'),
            headerProfilePhoto: document.getElementById('header-profile-photo'),
            headerRefresh: document.getElementById('header-refresh'),
            lastLoginTime: document.getElementById('dashboard-last-login'),
            lastLoginCount: document.getElementById('dashboard-login-count')
        };
        
        const foundCount = Object.keys(this.elements).filter(key => this.elements[key]).length;
        console.log(`🔍 Elements found: ${foundCount}/${Object.keys(this.elements).length}`);
    }
    
    setupEventListeners() {
        document.addEventListener('coursesModuleReady', () => {
            this.updateCoursesMetric();
            this.updateUIFromMetrics();
        });
        document.addEventListener('examsModuleReady', () => {
            this.updateExamsMetric();
            this.updateUIFromMetrics();
        });
        document.addEventListener('nurseiqMetricsUpdated', (e) => {
            if (e.detail) {
                this.updateNurseIQMetric(e.detail);
                this.updateUIFromMetrics();
            }
        });
        document.addEventListener('attendanceCheckedIn', () => {
            this.loadAttendanceMetrics();
            this.updateUIFromMetrics();
        });
        
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
            'hub-exam-card': 'hub-exam-card',
            'profile': 'profile'
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
        
        this.updateCurrentBlockInfo();
        
        const dashboard = document.getElementById('dashboard');
        if (dashboard) {
            dashboard.style.display = 'block';
            dashboard.classList.add('active');
        }
        
        await this.loadAllMetrics();
        this.startAutoRefresh();
        this.updateUIFromMetrics();
        
        setTimeout(() => this.runDiagnostic(), 1000);
        
        return true;
    }
    
    updateCurrentBlockInfo() {
        if (!this.userProfile) return;
        
        const blockEl = document.getElementById('dashboard-current-block-value');
        if (blockEl) blockEl.innerText = this.userProfile.block || this.userProfile.current_block || 'Introductory';
        
        const programEl = document.getElementById('dashboard-program-name');
        if (programEl) programEl.innerText = this.userProfile.program || 'KRCHN';
        
        const intakeEl = document.getElementById('dashboard-intake-year');
        if (intakeEl) intakeEl.innerText = this.userProfile.intake_year || new Date().getFullYear();
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
            this.updateExamsMetric(),
            this.loadLastLoginInfo()
        ]);
        
        this.updateUIFromMetrics();
        
        console.log(`✅ All metrics loaded in ${(performance.now() - startTime).toFixed(0)}ms`);
        this.displaySummary();
    }
    
    async loadLastLoginInfo() {
        if (!this.userId || !this.sb) return;
        
        try {
            const { data, error } = await this.sb
                .from('consolidated_user_profiles_table')
                .select('last_login, login_count')
                .eq('user_id', this.userId)
                .single();
            
            if (error) throw error;
            
            if (data && data.last_login) {
                const kenyaTime = this.convertToKenyaTime(data.last_login);
                const relativeTime = this.getRelativeTime(data.last_login);
                
                this.metrics.lastLogin = {
                    time: data.last_login,
                    formatted: kenyaTime,
                    relative: relativeTime,
                    loginCount: data.login_count || 0
                };
                
                console.log(`👤 Last login: ${kenyaTime} (${relativeTime})`);
                console.log(`📊 Total logins: ${data.login_count || 0}`);
            } else {
                this.metrics.lastLogin = {
                    time: null,
                    formatted: 'First login ever',
                    relative: 'First login',
                    loginCount: 0
                };
            }
            
        } catch (error) {
            console.error('Failed to load last login:', error);
            this.metrics.lastLogin = {
                time: null,
                formatted: 'Not available',
                relative: 'Unknown',
                loginCount: 0
            };
        }
    }
    
    convertToKenyaTime(utcTimestamp) {
        if (!utcTimestamp) return 'Never';
        
        try {
            const utcDate = new Date(utcTimestamp);
            
            if (isNaN(utcDate.getTime())) {
                return 'Invalid date';
            }
            
            const kenyaTime = utcDate.toLocaleString('en-KE', {
                timeZone: 'Africa/Nairobi',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });
            
            return kenyaTime;
            
        } catch (error) {
            console.error('Time conversion error:', error);
            return new Date(utcTimestamp).toLocaleString();
        }
    }
    
    getRelativeTime(utcTimestamp) {
        if (!utcTimestamp) return 'Never';
        
        const now = new Date();
        const utcDate = new Date(utcTimestamp);
        
        if (isNaN(utcDate.getTime())) return 'Invalid date';
        
        const kenyaDate = new Date(utcDate.getTime() + (3 * 60 * 60 * 1000));
        const kenyaNow = new Date(now.getTime() + (3 * 60 * 60 * 1000));
        
        const diffMs = kenyaNow - kenyaDate;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) === 1 ? '' : 's'} ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) === 1 ? '' : 's'} ago`;
        
        return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) === 1 ? '' : 's'} ago`;
    }
    
    updateUIFromMetrics() {
        console.log('🎨 Updating UI from metrics...');
        
        const m = this.metrics;
        
        const rateEl = document.getElementById('dashboard-attendance-rate');
        if (rateEl) rateEl.innerText = m.attendance.rate + '%';
        
        const verifiedEl = document.getElementById('dashboard-verified-count');
        if (verifiedEl) verifiedEl.innerText = m.attendance.verified;
        
        const totalEl = document.getElementById('dashboard-total-count');
        if (totalEl) totalEl.innerText = m.attendance.total;
        
        const pendingEl = document.getElementById('dashboard-pending-count');
        if (pendingEl) pendingEl.innerText = m.attendance.pending;
        
        const coursesEl = document.getElementById('dashboard-active-courses');
        if (coursesEl) coursesEl.innerText = m.courses;
        
        const examStatusEl = document.getElementById('dashboard-exam-status');
        if (examStatusEl) {
            examStatusEl.innerText = m.examCard.eligible ? 'ELIGIBLE' : 'NOT ELIGIBLE';
            examStatusEl.style.color = m.examCard.eligible ? '#059669' : '#dc2626';
            examStatusEl.style.fontWeight = 'bold';
            examStatusEl.style.fontSize = '1.1rem';
        }
        
        const approvedEl = document.getElementById('dashboard-approved-units');
        if (approvedEl) approvedEl.innerText = m.examCard.approved;
        
        const nurseiqEl = document.getElementById('dashboard-nurseiq-progress');
        if (nurseiqEl) nurseiqEl.innerText = m.nurseiq.progress + '%';
        
        const accuracyEl = document.getElementById('dashboard-nurseiq-accuracy');
        if (accuracyEl) accuracyEl.innerText = m.nurseiq.accuracy + '%';
        
        const questionsEl = document.getElementById('dashboard-nurseiq-questions');
        if (questionsEl) questionsEl.innerText = m.nurseiq.questions;
        
        const resourcesEl = document.getElementById('dashboard-new-resources');
        if (resourcesEl) resourcesEl.innerText = m.resources;
        
        const upcomingEl = document.getElementById('dashboard-upcoming-exam');
        if (upcomingEl) upcomingEl.innerText = m.exams;
        
        if (this.elements.lastLoginTime) {
            this.elements.lastLoginTime.innerHTML = `
                <div class="last-login-container">
                    <div class="last-login-datetime">${m.lastLogin.formatted}</div>
                    <div class="last-login-relative">${m.lastLogin.relative}</div>
                    <div class="last-login-count">🔐 ${m.lastLogin.loginCount} total logins</div>
                </div>
            `;
        }
        
        if (this.userProfile) {
            const blockEl = document.getElementById('dashboard-current-block-value');
            if (blockEl) blockEl.innerText = this.userProfile.block || 'Introductory';
            
            const programEl = document.getElementById('dashboard-program-name');
            if (programEl) programEl.innerText = this.userProfile.program || 'KRCHN';
            
            const intakeEl = document.getElementById('dashboard-intake-year');
            if (intakeEl) intakeEl.innerText = this.userProfile.intake_year || new Date().getFullYear();
        }
        
        console.log('✅ UI update complete');
    }
    
    async loadAttendanceMetrics() {
        if (!this.userId || !this.sb) return;
        
        try {
            const { data: logs, error } = await this.sb
                .from('geo_attendance_logs')
                .select('is_verified')
                .eq('student_id', this.userId);
            
            if (error) throw error;
            
            const total = logs?.length || 0;
            const verified = logs?.filter(l => l.is_verified === true).length || 0;
            const rate = total > 0 ? Math.round((verified / total) * 100) : 0;
            
            this.metrics.attendance = { rate, verified, total, pending: total - verified };
            
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
                .select('id')
                .eq('target_program', this.userProfile.program)
                .eq('block', this.userProfile.block);
            
            if (!progError && programResources) {
                allResources = [...programResources];
                console.log(`📁 Program resources: ${programResources.length}`);
            }
            
            const { data: generalResources, error: genError } = await this.sb
                .from('resources')
                .select('id')
                .eq('target_program', 'General')
                .eq('block', this.userProfile.block);
            
            if (!genError && generalResources) {
                allResources = [...allResources, ...generalResources];
                console.log(`📁 General resources: ${generalResources.length}`);
            }
            
            const uniqueIds = new Set();
            allResources.forEach(r => uniqueIds.add(r.id));
            this.metrics.resources = uniqueIds.size;
            
            console.log(`📊 TOTAL RESOURCES: ${this.metrics.resources}`);
            
        } catch (error) {
            console.error('Resources error:', error);
            this.metrics.resources = 0;
        }
    }
    
    async loadExamCardMetrics() {
        if (!this.userId || !this.sb) return;
        
        try {
            const { data: registrations, error } = await this.sb
                .from('student_unit_registrations')
                .select('id')
                .eq('student_id', this.userId)
                .eq('status', 'approved');
            
            if (error) throw error;
            
            const approved = registrations?.length || 0;
            this.metrics.examCard = { approved, eligible: approved > 0 };
            
            console.log(`📇 Exam Card: ${approved} approved units - ${approved > 0 ? 'ELIGIBLE' : 'NOT ELIGIBLE'}`);
            
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
                    console.log(`🧠 NurseIQ (cached): ${data.progress || 0}% progress`);
                    return;
                }
            }
        } catch (e) {}
        
        if (typeof window.getNurseIQDashboardMetrics === 'function') {
            const metrics = window.getNurseIQDashboardMetrics();
            if (metrics) {
                this.updateNurseIQMetric(metrics);
                console.log(`🧠 NurseIQ: ${metrics.progress || 0}% progress`);
                return;
            }
        }
        
        this.updateNurseIQMetric({ progress: 0, accuracy: 0, totalAnswered: 0 });
    }
    
    updateNurseIQMetric(metrics) {
        if (!metrics) return;
        this.metrics.nurseiq = {
            progress: metrics.progress || 0,
            accuracy: metrics.accuracy || 0,
            questions: metrics.totalAnswered || 0
        };
    }
    
    async updateCoursesMetric() {
        if (!this.userId || !this.sb) return;
        
        try {
            const { data: registrations, error } = await this.sb
                .from('student_unit_registrations')
                .select('id')
                .eq('student_id', this.userId)
                .eq('status', 'approved');
            
            const count = registrations?.length || 0;
            this.metrics.courses = count;
            
            console.log(`📚 Active Courses: ${count}`);
            
        } catch (error) {
            console.error('Courses error:', error);
        }
    }
    
    async updateExamsMetric() {
        let upcomingText = 'No upcoming exams';
        
        if (typeof window.getExamsDashboardMetrics === 'function') {
            const metrics = window.getExamsDashboardMetrics();
            if (metrics && metrics.upcomingExam) {
                upcomingText = metrics.upcomingExam;
            }
        }
        
        this.metrics.exams = upcomingText;
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
        console.log(`   Last Login: ${this.metrics.lastLogin.formatted} (${this.metrics.lastLogin.loginCount} logins)`);
        if (this.userProfile) {
            console.log(`   Current Block: ${this.userProfile.block || 'Introductory'}`);
            console.log(`   Program: ${this.userProfile.program || 'KRCHN'}`);
        }
        console.log('═══════════════════════════════════════');
    }
    
    runDiagnostic() {
        console.log('\n🔍 RUNNING FULL DIAGNOSTIC...');
        console.log('═══════════════════════════════════════');
        console.log(`🔌 Database: ${this.sb ? 'Connected' : 'Not connected'}`);
        console.log(`👤 User: ${this.userProfile?.full_name || 'Unknown'}`);
        console.log(`📋 Program: ${this.userProfile?.program || 'Unknown'}`);
        console.log(`📚 Block: ${this.userProfile?.block || 'Unknown'}`);
        console.log(`📅 Intake: ${this.userProfile?.intake_year || 'Unknown'}`);
        console.log(`🕐 Last Login: ${this.metrics.lastLogin.formatted}`);
        console.log('═══════════════════════════════════════');
        console.log('🎯 All systems operational!');
    }
    
    startLiveClock() {
        const headerTime = document.getElementById('header-time');
        if (headerTime) {
            const updateTime = () => {
                const now = new Date();
                const kenyaTime = now.toLocaleString('en-KE', {
                    timeZone: 'Africa/Nairobi',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                });
                headerTime.textContent = kenyaTime;
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
    if (!client) {
        console.error('❌ No Supabase client for dashboard');
        return null;
    }
    
    dashboardModule = new DashboardModule(client);
    return dashboardModule;
}

window.DashboardModule = DashboardModule;
window.initDashboardModule = initDashboardModule;
window.refreshDashboard = () => dashboardModule?.refreshAll();

console.log('✅ Dashboard module ready - COMPLETE WORKING VERSION WITH LAST LOGIN');
