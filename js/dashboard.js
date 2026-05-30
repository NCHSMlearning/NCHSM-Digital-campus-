// dashboard.js - COMPLETE FIXED VERSION
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
            examCard: { approved: 0, eligible: false },
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
    }
    
    setupEventListeners() {
        document.addEventListener('nurseiqMetricsUpdated', (e) => {
            if (e.detail) {
                this.metrics.nurseiq = {
                    progress: e.detail.progress || 0,
                    accuracy: e.detail.accuracy || 0,
                    questions: e.detail.totalQuestions || 0
                };
                this.updateUIFromMetrics();
            }
        });
        
        document.addEventListener('attendanceCheckedIn', () => {
            this.loadAttendanceMetrics();
            this.updateUIFromMetrics();
        });
        
        if (this.elements.headerRefresh) {
            this.elements.headerRefresh.addEventListener('click', () => this.refreshAll());
        }
        
        this.addCardClickHandlers();
    }
    
    addCardClickHandlers() {
        const cards = document.querySelectorAll('.stat-card, .mini-card, .attendance-card');
        cards.forEach(card => {
            const newCard = card.cloneNode(true);
            if (card.parentNode) card.parentNode.replaceChild(newCard, card);
            const tabToOpen = newCard.getAttribute('data-tab');
            if (tabToOpen) {
                newCard.addEventListener('click', (e) => {
                    if (e.target.closest('button') || e.target.closest('a')) return;
                    if (typeof window.showTab === 'function') window.showTab(tabToOpen);
                });
                newCard.style.cursor = 'pointer';
            }
        });
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
        
        this.updateTimeGreeting();
        this.updateCurrentBlockInfo();
        
        await this.loadAllMetrics();
        this.startAutoRefresh();
        this.updateUIFromMetrics();
        
        // Initialize interactive components
        setTimeout(() => {
            this.initLeaderboardTabs();
            this.initWeekButtons();
            this.initAchievements();
            this.loadTimetableData('all');
        }, 1000);
        
        // Force dashboard visible
        setTimeout(() => {
            const dash = document.getElementById('dashboard');
            if (dash) {
                dash.style.display = 'block';
                dash.classList.add('active');
            }
        }, 100);
        
        return true;
    }
    
    updateTimeGreeting() {
        const hour = new Date().getHours();
        let greeting = hour >= 5 && hour < 12 ? 'Good Morning' :
                      hour >= 12 && hour < 17 ? 'Good Afternoon' :
                      hour >= 17 && hour < 21 ? 'Good Evening' : 'Good Night';
        
        const welcomeH1 = document.querySelector('.welcome h1');
        const studentName = this.elements.welcomeStudentName?.innerText || 'Student';
        if (welcomeH1) welcomeH1.innerHTML = `${greeting}, ${studentName}! 🎉`;
    }
    
    updateCurrentBlockInfo() {
        if (!this.userProfile) return;
        
        if (this.elements.dashboardCurrentBlockValue) {
            this.elements.dashboardCurrentBlockValue.innerText = this.userProfile.block || 'Introductory';
        }
        if (this.elements.dashboardProgramName) {
            this.elements.dashboardProgramName.innerText = this.userProfile.program || 'KRCHN';
        }
        if (this.elements.dashboardIntakeYear) {
            this.elements.dashboardIntakeYear.innerText = this.userProfile.intake_year || new Date().getFullYear();
        }
    }
    
    async loadAllMetrics() {
        console.log('📊 Loading all dashboard metrics...');
        
        await Promise.allSettled([
            this.loadAttendanceMetrics(),
            this.loadResourcesMetrics(),
            this.loadExamCardMetrics(),
            this.loadNurseIQMetrics(),
            this.updateExamsMetric(),
            this.loadLastLoginInfo(),
            this.loadXPMetrics()
        ]);
        
        this.updateUIFromMetrics();
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
            
        } catch (error) {
            console.error('Attendance error:', error);
        }
    }
    
    async loadExamCardMetrics() {
        if (!this.userId || !this.sb) return;
        
        try {
            const { data: registrations, error } = await this.sb
                .from('student_unit_registrations')
                .select('id, status')
                .eq('student_id', this.userId);
            
            if (error) throw error;
            
            const approved = registrations?.filter(r => r.status === 'approved').length || 0;
            this.metrics.examCard = { approved, eligible: approved > 0 };
            this.metrics.courses = approved;
            
            console.log(`📇 Exam Card: ${approved} approved units - ${approved > 0 ? 'ELIGIBLE' : 'NOT ELIGIBLE'}`);
            
        } catch (error) {
            console.error('Exam card error:', error);
            this.metrics.examCard = { approved: 0, eligible: false };
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
            
        } catch (error) {
            console.error('Resources error:', error);
            this.metrics.resources = 0;
        }
    }
    
   async loadNurseIQMetrics() {
    if (!this.userId || !this.sb) return;
    
    try {
        console.log('🧠 Loading NurseIQ metrics from user_progress...');
        
        // Read from user_progress table (where NurseIQ saves data)
        const { data: progress, error } = await this.sb
            .from('user_progress')
            .select('progress_data')
            .eq('user_id', this.userId)
            .maybeSingle();
        
        let totalQuestions = 0;
        let correctAnswers = 0;
        
        if (!error && progress && progress.progress_data) {
            const answers = progress.progress_data.answers || {};
            
            // Count answered questions
            Object.values(answers).forEach(answer => {
                if (answer.answered) {
                    totalQuestions++;
                    if (answer.correct) correctAnswers++;
                }
            });
            
            console.log(`📊 Found ${totalQuestions} answered questions, ${correctAnswers} correct`);
        }
        
        // Also check nurseiq_attempts for additional data
        const { data: attempts, error: attErr } = await this.sb
            .from('nurseiq_attempts')
            .select('score, total_questions')
            .eq('student_id', this.userId);
        
        if (!attErr && attempts && attempts.length > 0) {
            let attemptQuestions = 0;
            let attemptScore = 0;
            attempts.forEach(a => {
                attemptQuestions += a.total_questions || 0;
                attemptScore += a.score || 0;
            });
            
            if (attemptQuestions > totalQuestions) {
                totalQuestions = attemptQuestions;
                correctAnswers = attemptScore;
            }
        }
        
        const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
        const progressPercent = totalQuestions > 0 ? Math.min(Math.round((totalQuestions / 105) * 100), 100) : 0;
        
        this.metrics.nurseiq = {
            progress: progressPercent,
            accuracy: accuracy,
            questions: totalQuestions
        };
        
        console.log(`🧠 NurseIQ: ${progressPercent}% progress, ${accuracy}% accuracy, ${totalQuestions} questions`);
        
        // Update UI immediately
        if (this.elements.nurseiqProgress) this.elements.nurseiqProgress.innerText = progressPercent + '%';
        if (this.elements.nurseiqAccuracy) this.elements.nurseiqAccuracy.innerText = accuracy + '%';
        if (this.elements.nurseiqQuestions) this.elements.nurseiqQuestions.innerText = totalQuestions;
        if (this.elements.nurseiqPoints) this.elements.nurseiqPoints.innerText = totalQuestions;
        
    } catch (error) {
        console.error('NurseIQ error:', error);
        this.metrics.nurseiq = { progress: 0, accuracy: 0, questions: 0 };
    }
}
   async updateExamsMetric() {
    let upcomingText = 'No upcoming exams';
    
    try {
        if (!this.userProfile) return;
        
        const today = new Date().toISOString().split('T')[0];
        
        const { data: exams, error } = await this.sb
            .from('exams_with_courses')
            .select('exam_name, exam_date')
            .eq('program_type', this.userProfile.program)
            .gte('exam_date', today)
            .order('exam_date', { ascending: true })
            .limit(1);
        
        if (error) throw error;
        
        if (exams && exams.length > 0) {
            const examDate = new Date(exams[0].exam_date).toLocaleDateString();
            upcomingText = `${exams[0].exam_name} - ${examDate}`;
        }
        
    } catch (error) {
        console.error('Exams error:', error);
    }
    
    this.metrics.exams = upcomingText;
    
    // ========== ADD THIS LINE TO UPDATE UI ==========
    const upcomingExamEl = document.getElementById('dashboard-upcoming-exam');
    if (upcomingExamEl) {
        upcomingExamEl.innerText = upcomingText;
    }
}
    async loadXPMetrics() {
        const attendancePoints = (this.metrics.attendance.verified || 0) * 10;
        const nurseIQPoints = this.metrics.nurseiq.questions || 0;
        const totalXP = attendancePoints + nurseIQPoints;
        
        const maxXP = 100;
        const currentXP = totalXP % maxXP;
        const level = Math.floor(totalXP / maxXP) + 1;
        const percent = (currentXP / maxXP) * 100;
        
        this.metrics.xp = { current: currentXP, max: maxXP, level, percent, total: totalXP };
    }
    
    async loadLastLoginInfo() {
        if (!this.userId || !this.sb) return;
        
        try {
            const { data, error } = await this.sb
                .from('consolidated_user_profiles_table')
                .select('last_login, login_count')
                .eq('user_id', this.userId)
                .single();
            
            if (!error && data) {
                this.metrics.lastLogin = {
                    time: data.last_login,
                    formatted: data.last_login ? new Date(data.last_login).toLocaleString() : 'Never',
                    loginCount: data.login_count || 0
                };
            }
        } catch (error) {
            console.error('Last login error:', error);
        }
    }
    
    updateUIFromMetrics() {
        const m = this.metrics;
        
        // Attendance
        if (this.elements.attendanceRate) this.elements.attendanceRate.innerText = m.attendance.rate + '%';
        if (this.elements.verifiedCount) this.elements.verifiedCount.innerText = m.attendance.verified;
        if (this.elements.totalCount) this.elements.totalCount.innerText = m.attendance.total;
        if (this.elements.pendingCount) this.elements.pendingCount.innerText = m.attendance.pending;
        if (this.elements.attendancePoints) this.elements.attendancePoints.innerText = m.attendance.points;
        
        // Attendance color
        const rate = m.attendance.rate || 0;
        const percentEl = document.querySelector('.attendance-percent');
        if (percentEl) {
            percentEl.classList.remove('attendance-critical', 'attendance-warning', 'attendance-good');
            if (rate < 50) percentEl.classList.add('attendance-critical');
            else if (rate < 75) percentEl.classList.add('attendance-warning');
            else percentEl.classList.add('attendance-good');
        }
        
        // Exam Card & Courses
        const approved = m.examCard.approved || 0;
        if (this.elements.activeCourses) this.elements.activeCourses.innerText = approved;
        if (this.elements.dashboardExamStatus) {
            this.elements.dashboardExamStatus.innerText = approved > 0 ? 'ELIGIBLE' : 'NOT ELIGIBLE';
            this.elements.dashboardExamStatus.style.color = approved > 0 ? '#059669' : '#dc2626';
        }
        if (this.elements.dashboardApprovedUnits) this.elements.dashboardApprovedUnits.innerText = approved;
        
        // NurseIQ
        if (this.elements.nurseiqProgress) this.elements.nurseiqProgress.innerText = m.nurseiq.progress + '%';
        if (this.elements.nurseiqAccuracy) this.elements.nurseiqAccuracy.innerText = m.nurseiq.accuracy + '%';
        if (this.elements.nurseiqQuestions) this.elements.nurseiqQuestions.innerText = m.nurseiq.questions;
        if (this.elements.nurseiqPoints) this.elements.nurseiqPoints.innerText = m.nurseiq.questions;
        
        // Resources
        if (this.elements.newResources) this.elements.newResources.innerText = m.resources;
        
        // Upcoming Exam
        if (this.elements.upcomingExam) this.elements.upcomingExam.innerText = m.exams;
        
        // XP
        if (this.elements.userLevel) this.elements.userLevel.innerText = m.xp.level;
        if (this.elements.userXp) this.elements.userXp.innerText = m.xp.current;
        if (this.elements.userXpMax) this.elements.userXpMax.innerText = m.xp.max;
        if (this.elements.xpProgressFill) this.elements.xpProgressFill.style.width = m.xp.percent + '%';
        
        console.log('✅ UI update complete');
    }
    
    // ========== INTERACTIVE COMPONENTS ==========
    initLeaderboardTabs() {
        const tabsContainer = document.querySelector('.leaderboard-tabs');
        if (!tabsContainer) return;
        
        const tabs = tabsContainer.querySelectorAll('span');
        tabs.forEach(tab => {
            tab.style.cursor = 'pointer';
            tab.style.padding = '4px 12px';
            tab.style.borderRadius = '20px';
            tab.addEventListener('click', () => {
                tabs.forEach(t => {
                    t.classList.remove('active');
                    t.style.background = 'transparent';
                });
                tab.classList.add('active');
                tab.style.background = '#FDB913';
                tab.style.color = '#0B2A4A';
                console.log(`📊 Leaderboard: ${tab.innerText}`);
            });
        });
        if (tabs[0]) {
            tabs[0].classList.add('active');
            tabs[0].style.background = '#FDB913';
            tabs[0].style.color = '#0B2A4A';
        }
    }
    
    initWeekButtons() {
        const weekButtons = document.querySelectorAll('.week-btn');
        weekButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                weekButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                console.log(`📅 Week: ${btn.innerText}`);
            });
        });
    }
    
    initAchievements() {
        const items = document.querySelectorAll('.achieve-item');
        items.forEach(item => {
            item.style.cursor = 'pointer';
            item.addEventListener('click', () => {
                const name = item.querySelector('strong')?.innerText || 'Achievement';
                console.log(`🏆 ${name}`);
            });
        });
        
        const viewAll = document.querySelector('.section-title .view-all');
        if (viewAll) {
            viewAll.style.cursor = 'pointer';
            viewAll.addEventListener('click', () => console.log('🏆 View all achievements'));
        }
    }
    
    async loadTimetableData(week) {
        const container = document.getElementById('timetable-container');
        const loading = document.getElementById('timetable-loading');
        const empty = document.getElementById('timetable-empty');
        
        if (loading) loading.style.display = 'block';
        if (container) container.style.display = 'none';
        
        setTimeout(() => {
            if (loading) loading.style.display = 'none';
            if (container) {
                container.style.display = 'block';
                container.innerHTML = `
                    <div class="timetable-entry" style="display:flex; justify-content:space-between; padding:12px 0;">
                        <span><i class="fas fa-calendar-day"></i> Monday 9:00 AM</span>
                        <span>Clinical Rotation</span>
                        <span>Room 101</span>
                    </div>
                    <div class="timetable-entry" style="display:flex; justify-content:space-between; padding:12px 0;">
                        <span><i class="fas fa-calendar-day"></i> Wednesday 2:00 PM</span>
                        <span>Nursing Leadership</span>
                        <span>Hall B</span>
                    </div>
                `;
            }
        }, 500);
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

console.log('✅ Dashboard module ready - COMPLETE FIXED VERSION');
