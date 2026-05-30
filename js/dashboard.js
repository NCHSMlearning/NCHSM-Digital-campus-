// dashboard.js - COMPLETE WORKING VERSION WITH ALL FIXES
class DashboardModule {
    constructor(supabaseClient) {
        console.log('🚀 Initializing DashboardModule...');
        
        this.sb = supabaseClient || window.sb || window.db?.supabase;
        this.userId = null;
        this.userProfile = null;
        this.autoRefreshInterval = null;
        
        this.metrics = {
            attendance: { rate: 0, verified: 0, total: 0, pending: 0, points: 0 },
            resources: 0,
            examCard: { approved: 0, eligible: false, semester: 'Current' },
            nurseiq: { progress: 0, accuracy: 0, questions: 0 },
            courses: 0,
            exams: 'No upcoming exams',
            upcomingExamDetails: null,
            lastLogin: { time: null, formatted: 'Never', loginCount: 0 },
            xp: { current: 0, max: 100, level: 1, percent: 0 }
        };
        
        this.cacheElements();
        this.setupEventListeners();
        this.startLiveClock();
        
        console.log('✅ DashboardModule initialized');
    }
    
    cacheElements() {
        this.elements = {
            welcomeHeader: document.getElementById('welcome-header'),
            welcomeStudentName: document.getElementById('welcome-student-name'),
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
            attendancePoints: document.getElementById('attendance-points-value'),
            userLevel: document.getElementById('user-level'),
            userXp: document.getElementById('user-xp'),
            userXpMax: document.getElementById('user-xp-max'),
            xpProgressFill: document.getElementById('xp-progress-fill'),
            attendanceWarningBadge: document.getElementById('attendance-warning-badge'),
            warningText: document.getElementById('warning-text'),
            nurseiqPoints: document.getElementById('dashboard-nurseiq-points')
        };
        
        const foundCount = Object.keys(this.elements).filter(key => this.elements[key]).length;
        console.log(`🔍 Elements found: ${foundCount}/${Object.keys(this.elements).length}`);
    }
    
    setupEventListeners() {
        document.addEventListener('coursesModuleReady', () => {
            this.updateCoursesMetric();
            this.updateUIFromMetrics();
        });
        
        document.addEventListener('examsModuleReady', (e) => {
            if (e.detail) {
                this.updateExamsMetricWithDetails(e.detail);
            } else {
                this.updateExamsMetric();
            }
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
                this.updateExamCardDisplay(e.detail.count);
            }
        });
        
        if (this.elements.headerRefresh) {
            this.elements.headerRefresh.addEventListener('click', () => this.refreshAll());
        }
        
        this.addCardClickHandlers();
    }
    
    updateExamCardDisplay(approvedCount) {
        const examStatusEl = this.elements.dashboardExamStatus;
        const approvedUnitsEl = this.elements.dashboardApprovedUnits;
        const coursesEl = this.elements.activeCourses;
        
        if (examStatusEl) {
            examStatusEl.innerText = approvedCount > 0 ? 'ELIGIBLE' : 'NOT ELIGIBLE';
            examStatusEl.style.color = approvedCount > 0 ? '#059669' : '#dc2626';
        }
        if (approvedUnitsEl) approvedUnitsEl.innerText = approvedCount;
        if (coursesEl) coursesEl.innerText = approvedCount;
        
        this.metrics.examCard = { approved: approvedCount, eligible: approvedCount > 0 };
        this.metrics.courses = approvedCount;
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
        
        const cards = document.querySelectorAll('.stat-card, .mini-card, .attendance-card');
        
        cards.forEach(card => {
            const newCard = card.cloneNode(true);
            if (card.parentNode) card.parentNode.replaceChild(newCard, card);
            
            let tabToOpen = newCard.getAttribute('data-tab');
            if (newCard.classList?.contains('nurseiq-card')) tabToOpen = 'nurseiq';
            if (newCard.classList?.contains('examcard-card')) tabToOpen = 'hub-exam-card';
            
            const finalTab = tabMapping[tabToOpen] || tabToOpen;
            
            if (finalTab) {
                newCard.addEventListener('click', (e) => {
                    if (e.target.closest('button') || e.target.closest('a')) return;
                    if (typeof window.showTab === 'function') window.showTab(finalTab);
                });
                newCard.style.cursor = 'pointer';
            }
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
        
        if (this.elements.welcomeStudentName && userProfile.full_name) {
            this.elements.welcomeStudentName.textContent = userProfile.full_name;
        }
        
        const hour = new Date().getHours();
        const greeting = hour >= 5 && hour < 12 ? 'Good Morning' :
                       hour >= 12 && hour < 17 ? 'Good Afternoon' :
                       hour >= 17 && hour < 21 ? 'Good Evening' : 'Good Night';
        if (this.elements.welcomeHeader) {
            this.elements.welcomeHeader.textContent = `${greeting}, ${userProfile.full_name || 'Student'}! 🎉`;
        }
        
        this.updateCurrentBlockInfo();
        
        await this.loadAllMetrics();
        this.startAutoRefresh();
        this.updateUIFromMetrics();
        
        // Force dashboard visible
        const dash = document.getElementById('dashboard');
        if (dash) {
            dash.style.display = 'block';
            dash.classList.add('active');
        }
        
        setTimeout(() => this.runDiagnostic(), 1000);
        
        return true;
    }
    
    updateCurrentBlockInfo() {
        if (!this.userProfile) return;
        
        const blockEl = this.elements.dashboardCurrentBlockValue;
        if (blockEl) blockEl.innerText = this.userProfile.block || this.userProfile.current_block || 'Introductory';
        
        const programEl = this.elements.dashboardProgramName;
        if (programEl) programEl.innerText = this.userProfile.program || 'KRCHN';
        
        const intakeEl = this.elements.dashboardIntakeYear;
        if (intakeEl) intakeEl.innerText = this.userProfile.intake_year || new Date().getFullYear();
    }
    
    async loadAllMetrics() {
        console.log('📊 Loading all dashboard metrics...');
        const startTime = performance.now();
        
        await Promise.allSettled([
            this.loadAttendanceMetrics(),
            this.loadResourcesMetrics(),
            this.loadExamCardMetrics(),  // FIXED
            this.loadNurseIQMetrics(),    // FIXED
            this.updateCoursesMetric(),   // FIXED
            this.updateExamsMetric(),
            this.loadLastLoginInfo(),
            this.loadXPMetrics()
        ]);
        
        this.updateUIFromMetrics();
        
        // Extra force update for exam card
        setTimeout(() => {
            const approved = this.metrics.examCard?.approved || 0;
            this.updateExamCardDisplay(approved);
        }, 200);
        
        console.log(`✅ All metrics loaded in ${(performance.now() - startTime).toFixed(0)}ms`);
        this.displaySummary();
    }
    
    async loadExamCardMetrics() {
        if (!this.userId || !this.sb) return;
        
        try {
            console.log('📇 Loading exam card metrics...');
            
            const { data: registrations, error } = await this.sb
                .from('student_unit_registrations')
                .select('id, status')
                .eq('student_id', this.userId);
            
            if (error) throw error;
            
            const approved = registrations?.filter(r => r.status === 'approved').length || 0;
            this.metrics.examCard = { approved, eligible: approved > 0 };
            this.metrics.courses = approved;
            
            console.log(`📇 Exam Card: ${approved} approved units - ${approved > 0 ? 'ELIGIBLE' : 'NOT ELIGIBLE'}`);
            
            // Update UI immediately
            this.updateExamCardDisplay(approved);
            
        } catch (error) {
            console.error('Exam card error:', error);
        }
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
            
            if (this.elements.activeCourses) {
                this.elements.activeCourses.innerText = count;
            }
            
        } catch (error) {
            console.error('Courses error:', error);
        }
    }
    
    async loadResourcesMetrics() {
        if (!this.sb) return;
        
        try {
            const { count, error } = await this.sb
                .from('resources')
                .select('*', { count: 'exact', head: true });
            
            this.metrics.resources = count || 0;
            
            console.log(`📁 Resources: ${this.metrics.resources}`);
            
            if (this.elements.newResources) {
                this.elements.newResources.innerText = this.metrics.resources;
            }
            
        } catch (error) {
            console.error('Resources error:', error);
            this.metrics.resources = 0;
        }
    }
    
    async loadNurseIQMetrics() {
        if (!this.userId || !this.sb) return;
        
        try {
            console.log('🧠 Loading NurseIQ metrics...');
            
            const { data: answers, error } = await this.sb
                .from('nurseiq_answers')
                .select('is_correct')
                .eq('student_id', this.userId);
            
            if (error) {
                console.error('NurseIQ query error:', error);
                this.metrics.nurseiq = { progress: 0, accuracy: 0, questions: 0 };
                return;
            }
            
            const totalQuestions = answers?.length || 0;
            const correctAnswers = answers?.filter(a => a.is_correct === true).length || 0;
            const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
            const progress = totalQuestions > 0 ? Math.min(Math.round((totalQuestions / 105) * 100), 100) : 0;
            
            this.metrics.nurseiq = {
                progress: progress,
                accuracy: accuracy,
                questions: totalQuestions
            };
            
            console.log(`🧠 NurseIQ: ${progress}% progress, ${accuracy}% accuracy, ${totalQuestions} questions`);
            
            // Update UI
            if (this.elements.nurseiqProgress) this.elements.nurseiqProgress.innerText = progress + '%';
            if (this.elements.nurseiqAccuracy) this.elements.nurseiqAccuracy.innerText = accuracy + '%';
            if (this.elements.nurseiqQuestions) this.elements.nurseiqQuestions.innerText = totalQuestions;
            if (this.elements.nurseiqPoints) this.elements.nurseiqPoints.innerText = totalQuestions;
            
        } catch (error) {
            console.error('NurseIQ error:', error);
            this.metrics.nurseiq = { progress: 0, accuracy: 0, questions: 0 };
        }
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
            
            this.metrics.attendance = { rate, verified, total, pending: total - verified, points: verified * 10 };
            
            console.log(`📊 Attendance: ${rate}% (${verified}/${total}) → ${verified * 10} points`);
            
            if (this.elements.attendancePoints) {
                this.elements.attendancePoints.innerText = verified * 10;
            }
            
            // Update attendance color
            const percentEl = document.querySelector('.attendance-percent');
            if (percentEl) {
                percentEl.classList.remove('attendance-critical', 'attendance-warning', 'attendance-good');
                if (rate < 50) percentEl.classList.add('attendance-critical');
                else if (rate < 75) percentEl.classList.add('attendance-warning');
                else percentEl.classList.add('attendance-good');
            }
            
        } catch (error) {
            console.error('Attendance error:', error);
        }
    }
    
    async updateExamsMetric() {
        let upcomingText = 'No upcoming exams';
        let examDetails = null;
        
        try {
            console.log('🔍 Fetching upcoming exams...');
            
            if (!this.userProfile) return;
            
            const today = new Date().toISOString().split('T')[0];
            
            const { data: exams, error } = await this.sb
                .from('exams_with_courses')
                .select('*')
                .in('status', ['published', 'Upcoming', 'InProgress'])
                .gte('exam_date', today)
                .order('exam_date', { ascending: true })
                .limit(5);
            
            if (error) throw error;
            
            if (exams && exams.length > 0) {
                const matchingExams = exams.filter(exam => {
                    let programMatch = true;
                    if (exam.program_type && exam.program_type !== 'General') {
                        programMatch = exam.program_type === this.userProfile.program;
                    }
                    let blockMatch = true;
                    if (exam.block_term && exam.block_term !== 'General') {
                        blockMatch = exam.block_term === this.userProfile.block;
                    }
                    return programMatch && blockMatch;
                });
                
                if (matchingExams.length > 0) {
                    const upcomingExam = matchingExams[0];
                    const examDate = new Date(upcomingExam.exam_date).toLocaleDateString();
                    upcomingText = `${upcomingExam.exam_name} - ${examDate}`;
                    examDetails = upcomingExam;
                }
            }
            
        } catch (error) {
            console.error('Error updating exams metric:', error);
        }
        
        this.metrics.exams = upcomingText;
        this.metrics.upcomingExamDetails = examDetails;
        
        if (this.elements.upcomingExam) {
            this.elements.upcomingExam.textContent = upcomingText;
        }
    }
    
    calculateAttendancePoints() {
        const verified = this.metrics.attendance.verified || 0;
        const points = verified * 10;
        this.metrics.attendance.points = points;
        
        if (this.elements.attendancePoints) {
            this.elements.attendancePoints.innerText = points;
        }
        
        return points;
    }
    
    updateAttendanceColor() {
        const rate = this.metrics.attendance.rate || 0;
        const percentEl = document.querySelector('.attendance-percent');
        const warningBadge = this.elements.attendanceWarningBadge;
        const warningText = this.elements.warningText;
        
        if (percentEl) {
            percentEl.classList.remove('attendance-critical', 'attendance-warning', 'attendance-good');
            if (rate < 50) {
                percentEl.classList.add('attendance-critical');
                if (warningBadge) warningBadge.style.display = 'flex';
                if (warningText) warningText.innerText = '⚠️ CRITICAL (<50%)';
            } else if (rate >= 50 && rate < 75) {
                percentEl.classList.add('attendance-warning');
                if (warningBadge) warningBadge.style.display = 'flex';
                if (warningText) warningText.innerText = '⚠️ BELOW 75%';
            } else {
                percentEl.classList.add('attendance-good');
                if (warningBadge) warningBadge.style.display = 'none';
            }
        }
    }
    
    updateUIFromMetrics() {
        console.log('🎨 Updating UI from metrics...');
        
        const m = this.metrics;
        
        // Attendance
        if (this.elements.attendanceRate) this.elements.attendanceRate.innerText = m.attendance.rate + '%';
        if (this.elements.verifiedCount) this.elements.verifiedCount.innerText = m.attendance.verified;
        if (this.elements.totalCount) this.elements.totalCount.innerText = m.attendance.total;
        if (this.elements.pendingCount) this.elements.pendingCount.innerText = m.attendance.pending;
        
        this.calculateAttendancePoints();
        this.updateAttendanceColor();
        
        // Courses & Exam Card
        if (this.elements.activeCourses) this.elements.activeCourses.innerText = m.courses;
        if (this.elements.dashboardExamStatus) {
            this.elements.dashboardExamStatus.innerText = m.examCard.eligible ? 'ELIGIBLE' : 'NOT ELIGIBLE';
            this.elements.dashboardExamStatus.style.color = m.examCard.eligible ? '#059669' : '#dc2626';
        }
        if (this.elements.dashboardApprovedUnits) this.elements.dashboardApprovedUnits.innerText = m.examCard.approved;
        
        // NurseIQ
        if (this.elements.nurseiqProgress) this.elements.nurseiqProgress.innerText = m.nurseiq.progress + '%';
        if (this.elements.nurseiqAccuracy) this.elements.nurseiqAccuracy.innerText = m.nurseiq.accuracy + '%';
        if (this.elements.nurseiqQuestions) this.elements.nurseiqQuestions.innerText = m.nurseiq.questions;
        if (this.elements.nurseiqPoints) this.elements.nurseiqPoints.innerText = m.nurseiq.questions;
        
        // Resources
        if (this.elements.newResources) this.elements.newResources.innerText = m.resources;
        
        // Upcoming Exam
        if (this.elements.upcomingExam) this.elements.upcomingExam.innerText = m.exams;
        
        // XP Display
        if (this.elements.userLevel) this.elements.userLevel.innerText = m.xp.level;
        if (this.elements.userXp) this.elements.userXp.innerText = m.xp.current;
        if (this.elements.userXpMax) this.elements.userXpMax.innerText = m.xp.max;
        if (this.elements.xpProgressFill) this.elements.xpProgressFill.style.width = m.xp.percent + '%';
        
        console.log('✅ UI update complete');
    }
    
    async loadXPMetrics() {
        const attendancePoints = (this.metrics.attendance.verified || 0) * 10;
        const nurseIQPoints = this.metrics.nurseiq.questions || 0;
        const totalXP = attendancePoints + nurseIQPoints;
        
        const maxXP = 100;
        const currentXP = totalXP % maxXP;
        const level = Math.floor(totalXP / maxXP) + 1;
        const percent = (currentXP / maxXP) * 100;
        
        this.metrics.xp = { current: currentXP, max: maxXP, level: level, percent: percent, total: totalXP };
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
                this.metrics.lastLogin = {
                    time: data.last_login,
                    formatted: new Date(data.last_login).toLocaleString(),
                    relative: this.getRelativeTime(data.last_login),
                    loginCount: data.login_count || 0
                };
            }
        } catch (error) {
            console.error('Failed to load last login:', error);
        }
    }
    
    getRelativeTime(utcTimestamp) {
        if (!utcTimestamp) return 'Never';
        const diffMs = new Date() - new Date(utcTimestamp);
        const diffMins = Math.floor(diffMs / (1000 * 60));
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minutes ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} hours ago`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays} days ago`;
    }
    
    startLiveClock() {
        const headerTime = document.getElementById('header-time');
        if (headerTime) {
            const updateTime = () => {
                const now = new Date();
                headerTime.textContent = now.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: true });
            };
            updateTime();
            setInterval(updateTime, 60000);
        }
    }
    
    startAutoRefresh() {
        if (this.autoRefreshInterval) clearInterval(this.autoRefreshInterval);
        this.autoRefreshInterval = setInterval(() => {
            if (!document.hidden) this.loadAllMetrics();
        }, 120000);
    }
    
    async refreshAll() {
        console.log('🔄 Manual refresh...');
        await this.loadAllMetrics();
    }
    
    displaySummary() {
        console.log('\n═══════════════════════════════════════');
        console.log('📊 DASHBOARD SUMMARY');
        console.log('═══════════════════════════════════════');
        console.log(`   Attendance: ${this.metrics.attendance.rate}% (${this.metrics.attendance.verified}/${this.metrics.attendance.total})`);
        console.log(`   Active Courses: ${this.metrics.courses}`);
        console.log(`   Resources: ${this.metrics.resources}`);
        console.log(`   Exam Card: ${this.metrics.examCard.eligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'} (${this.metrics.examCard.approved} units)`);
        console.log(`   NurseIQ: ${this.metrics.nurseiq.progress}% (${this.metrics.nurseiq.questions} questions)`);
        console.log(`   Upcoming Exam: ${this.metrics.exams}`);
        console.log('═══════════════════════════════════════');
    }
    
    runDiagnostic() {
        console.log('\n🔍 DASHBOARD DIAGNOSTIC');
        console.log(`   User: ${this.userProfile?.full_name || 'Unknown'}`);
        console.log(`   Program: ${this.userProfile?.program || 'Unknown'}`);
        console.log(`   Block: ${this.userProfile?.block || 'Unknown'}`);
        console.log(`   Approved Units: ${this.metrics.examCard.approved}`);
        console.log(`   Exam Status: ${this.metrics.examCard.eligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}`);
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
window.getDashboardMetrics = () => dashboardModule?.metrics;

console.log('✅ Dashboard module ready - PERMANENT FIXES APPLIED');
