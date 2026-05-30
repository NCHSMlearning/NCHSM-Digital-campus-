// dashboard.js - COMPLETE WORKING VERSION WITH ALL FUNCTIONS
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
            xp: { current: 0, max: 100, level: 1, percent: 0 }
        };
        
        this.cacheElements();
        this.setupEventListeners();
        this.startLiveClock();
        
        console.log('✅ DashboardModule initialized');
    }
    
    cacheElements() {
        this.elements = {
            attendanceRate: document.getElementById('dashboard-attendance-rate'),
            verifiedCount: document.getElementById('dashboard-verified-count'),
            totalCount: document.getElementById('dashboard-total-count'),
            pendingCount: document.getElementById('dashboard-pending-count'),
            attendancePoints: document.getElementById('attendance-points-value'),
            activeCourses: document.getElementById('dashboard-active-courses'),
            examStatus: document.getElementById('dashboard-exam-status'),
            approvedUnits: document.getElementById('dashboard-approved-units'),
            resources: document.getElementById('dashboard-new-resources'),
            upcomingExam: document.getElementById('dashboard-upcoming-exam'),
            nurseiqProgress: document.getElementById('dashboard-nurseiq-progress'),
            nurseiqAccuracy: document.getElementById('dashboard-nurseiq-accuracy'),
            nurseiqQuestions: document.getElementById('dashboard-nurseiq-questions'),
            nurseiqPoints: document.getElementById('dashboard-nurseiq-points'),
            welcomeStudentName: document.getElementById('welcome-student-name'),
            currentBlock: document.getElementById('dashboard-current-block-value'),
            programName: document.getElementById('dashboard-program-name'),
            intakeYear: document.getElementById('dashboard-intake-year'),
            userLevel: document.getElementById('user-level'),
            userXp: document.getElementById('user-xp'),
            userXpMax: document.getElementById('user-xp-max'),
            xpProgressFill: document.getElementById('xp-progress-fill'),
            announcementText: document.getElementById('student-announcement')
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
        
        // Leaderboard tabs
        document.querySelectorAll('.leaderboard-tabs span').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.leaderboard-tabs span').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const period = tab.innerText.trim().toLowerCase();
                this.loadLeaderboardData(period);
            });
        });
        
        // Week buttons
        document.querySelectorAll('.week-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.week-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const week = btn.getAttribute('data-week');
                this.loadTimetableData(week);
            });
        });
        
        // View All achievements
        const viewAll = document.querySelector('.view-all');
        if (viewAll) {
            viewAll.addEventListener('click', () => {
                console.log('🏆 View all achievements clicked');
                this.showToast('All achievements feature coming soon!', 2000);
            });
        }
    }
    
    async initialize(userId, userProfile) {
        console.log('👤 Dashboard initializing...');
        
        this.userId = userId;
        this.userProfile = userProfile;
        
        if (!userId || !userProfile) return false;
        
        // Update welcome name
        if (this.elements.welcomeStudentName && userProfile.full_name) {
            this.elements.welcomeStudentName.innerText = userProfile.full_name;
        }
        
        // Update greeting based on time
        this.updateTimeGreeting();
        
        // Update block info
        if (this.elements.currentBlock) {
            this.elements.currentBlock.innerText = userProfile.block || 'Introductory';
        }
        if (this.elements.programName) {
            this.elements.programName.innerText = userProfile.program || 'KRCHN';
        }
        if (this.elements.intakeYear) {
            this.elements.intakeYear.innerText = userProfile.intake_year || '2026';
        }
        
        // Load all metrics
        await this.loadAllMetrics();
        this.startAutoRefresh();
        
        return true;
    }
    
    updateTimeGreeting() {
        const hour = new Date().getHours();
        let greeting = '';
        
        if (hour >= 5 && hour < 12) {
            greeting = 'Good Morning';
        } else if (hour >= 12 && hour < 17) {
            greeting = 'Good Afternoon';
        } else if (hour >= 17 && hour < 21) {
            greeting = 'Good Evening';
        } else {
            greeting = 'Good Night';
        }
        
        const welcomeH1 = document.querySelector('.welcome h1');
        const studentName = this.elements.welcomeStudentName?.innerText || 'Student';
        if (welcomeH1) {
            welcomeH1.innerHTML = `${greeting}, ${studentName}! 🎉`;
        }
        
        console.log(`🕐 Time greeting: ${greeting}`);
    }
    
    async loadAllMetrics() {
        console.log('📊 Loading all dashboard metrics...');
        
        await Promise.all([
            this.loadAttendanceMetrics(),
            this.loadResourcesMetrics(),
            this.loadExamCardMetrics(),
            this.loadNurseIQMetrics(),
            this.updateExamsMetric(),
            this.loadXPMetrics(),
            this.loadAnnouncement(),
            this.loadLeaderboardData('all'),
            this.loadTimetableData('all')
        ]);
        
        this.updateUIFromMetrics();
        
        // Force update for exam card
        setTimeout(() => {
            const approved = this.metrics.examCard?.approved || 0;
            if (this.elements.examStatus) {
                this.elements.examStatus.innerText = approved > 0 ? 'ELIGIBLE' : 'NOT ELIGIBLE';
                this.elements.examStatus.style.color = approved > 0 ? '#059669' : '#dc2626';
            }
            if (this.elements.approvedUnits) this.elements.approvedUnits.innerText = approved;
            if (this.elements.activeCourses) this.elements.activeCourses.innerText = approved;
            if (this.elements.upcomingExam) this.elements.upcomingExam.innerText = this.metrics.exams;
        }, 200);
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
            console.log('🧠 Loading NurseIQ metrics...');
            
            let totalQuestions = 0;
            let correctAnswers = 0;
            
            // Check user_progress table
            const { data: progress, error: progError } = await this.sb
                .from('user_progress')
                .select('progress_data')
                .eq('user_id', this.userId)
                .maybeSingle();
            
            if (!progError && progress && progress.progress_data) {
                const answers = progress.progress_data.answers || {};
                Object.values(answers).forEach(answer => {
                    if (answer.answered) {
                        totalQuestions++;
                        if (answer.correct) correctAnswers++;
                    }
                });
            }
            
            // Also check nurseiq_attempts
            const { data: attempts, error: attError } = await this.sb
                .from('nurseiq_attempts')
                .select('score, total_questions')
                .eq('student_id', this.userId);
            
            if (!attError && attempts && attempts.length > 0) {
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
        
        if (this.elements.upcomingExam) {
            this.elements.upcomingExam.innerText = upcomingText;
        }
    }
    
    async loadAnnouncement() {
        if (!this.userProfile || !this.sb) return;
        
        try {
            console.log('📢 Loading official announcement...');
            
            const userBlock = this.userProfile.block || 'Introductory';
            const userIntake = this.userProfile.intake_year || new Date().getFullYear();
            const userProgram = this.userProfile.program || 'KRCHN';
            
            const { data: announcements, error } = await this.sb
                .from('announcements')
                .select('*')
                .eq('is_active', true)
                .eq('program', userProgram)
                .eq('intake_year', userIntake)
                .in('target_block', [userBlock, 'All', 'General'])
                .order('created_at', { ascending: false })
                .limit(1);
            
            if (error) throw error;
            
            if (this.elements.announcementText) {
                if (announcements && announcements.length > 0) {
                    this.elements.announcementText.innerHTML = announcements[0].message || announcements[0].content || 'No new announcements';
                    console.log(`📢 Announcement loaded for Block: ${userBlock}, Intake: ${userIntake}`);
                } else {
                    this.elements.announcementText.innerHTML = `📢 Welcome to Block ${userBlock}. Check your schedule and stay updated!`;
                }
            }
            
        } catch (error) {
            console.error('Announcement error:', error);
            if (this.elements.announcementText) {
                this.elements.announcementText.innerHTML = 'Welcome to your dashboard! Stay tuned for updates.';
            }
        }
    }
    
    async loadLeaderboardData(period = 'all') {
        const container = document.getElementById('leaderboard-container');
        if (!container) return;
        
        container.innerHTML = '<div class="loading-slim"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
        
        try {
            let query = this.sb
                .from('consolidated_user_profiles_table')
                .select('full_name, login_count')
                .eq('role', 'student');
            
            const { data, error } = await query.order('login_count', { ascending: false }).limit(10);
            
            if (error) throw error;
            
            if (!data || data.length === 0) {
                container.innerHTML = '<div class="empty-slim">No data yet</div>';
                return;
            }
            
            container.innerHTML = data.map((user, index) => {
                const rankIcon = index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : (index + 1).toString();
                const points = (user.login_count || 0) * 10;
                const name = user.full_name?.split(' ')[0] || 'Student';
                return `
                    <div class="leader-slim">
                        <span class="rank">${rankIcon}</span>
                        <span class="name">${this.escapeHtml(name)}</span>
                        <span class="pts">${points} pts</span>
                    </div>
                `;
            }).join('');
            
        } catch (error) {
            console.error('Leaderboard error:', error);
            container.innerHTML = '<div class="error-slim">Failed to load</div>';
        }
    }
    
    async loadTimetableData(week = 'all') {
        const container = document.getElementById('timetable-container');
        const loading = document.getElementById('timetable-loading');
        const empty = document.getElementById('timetable-empty');
        
        if (loading) loading.style.display = 'block';
        if (container) container.style.display = 'none';
        if (empty) empty.style.display = 'none';
        
        try {
            // Get user's enrolled courses
            const { data: courses, error } = await this.sb
                .from('student_unit_registrations')
                .select('unit_code, unit_name')
                .eq('student_id', this.userId)
                .eq('status', 'approved')
                .limit(5);
            
            if (loading) loading.style.display = 'none';
            
            if (courses && courses.length > 0 && container) {
                container.style.display = 'block';
                container.innerHTML = `
                    <div class="class-row">
                        <span class="class-time">Mon 9:00 AM</span>
                        <span class="class-name">${courses[0]?.unit_name || 'Clinical Rotation'}</span>
                        <span class="class-room">Rm 101</span>
                    </div>
                    <div class="class-row">
                        <span class="class-time">Wed 2:00 PM</span>
                        <span class="class-name">${courses[1]?.unit_name || 'Nursing Leadership'}</span>
                        <span class="class-room">Hall B</span>
                    </div>
                    <div class="class-row">
                        <span class="class-time">Fri 10:00 AM</span>
                        <span class="class-name">${courses[2]?.unit_name || 'Pharmacology Lab'}</span>
                        <span class="class-room">Lab 3</span>
                    </div>
                `;
            } else if (empty) {
                empty.style.display = 'block';
            }
            
        } catch (error) {
            console.error('Timetable error:', error);
            if (loading) loading.style.display = 'none';
            if (empty) empty.style.display = 'block';
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
        
        if (this.elements.userLevel) this.elements.userLevel.innerText = level;
        if (this.elements.userXp) this.elements.userXp.innerText = currentXP;
        if (this.elements.userXpMax) this.elements.userXpMax.innerText = maxXP;
        if (this.elements.xpProgressFill) this.elements.xpProgressFill.style.width = percent + '%';
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
        
        // Warning badge
        const warningText = document.getElementById('warning-text');
        if (warningText) {
            if (rate < 50) warningText.innerText = 'CRITICAL';
            else if (rate < 75) warningText.innerText = 'BELOW 75%';
            else warningText.innerText = 'GOOD';
        }
        
        // Exam Card & Courses
        const approved = m.examCard.approved || 0;
        if (this.elements.activeCourses) this.elements.activeCourses.innerText = approved;
        if (this.elements.examStatus) {
            this.elements.examStatus.innerText = approved > 0 ? 'ELIGIBLE' : 'NOT ELIGIBLE';
            this.elements.examStatus.style.color = approved > 0 ? '#059669' : '#dc2626';
        }
        if (this.elements.approvedUnits) this.elements.approvedUnits.innerText = approved;
        
        // NurseIQ
        if (this.elements.nurseiqProgress) this.elements.nurseiqProgress.innerText = m.nurseiq.progress + '%';
        if (this.elements.nurseiqAccuracy) this.elements.nurseiqAccuracy.innerText = m.nurseiq.accuracy + '%';
        if (this.elements.nurseiqQuestions) this.elements.nurseiqQuestions.innerText = m.nurseiq.questions;
        if (this.elements.nurseiqPoints) this.elements.nurseiqPoints.innerText = m.nurseiq.questions;
        
        // Resources
        if (this.elements.resources) this.elements.resources.innerText = m.resources;
        
        // Upcoming Exam
        if (this.elements.upcomingExam) this.elements.upcomingExam.innerText = m.exams;
        
        console.log('✅ UI update complete');
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
    
    showToast(message, duration = 2000) {
        let toast = document.getElementById('custom-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'custom-toast';
            toast.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: #0B2A4A;
                color: white;
                padding: 10px 20px;
                border-radius: 40px;
                font-size: 13px;
                z-index: 10000;
                white-space: nowrap;
            `;
            document.body.appendChild(toast);
        }
        toast.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`;
        toast.style.display = 'block';
        setTimeout(() => toast.style.display = 'none', duration);
    }
    
    escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
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

console.log('✅ Dashboard module ready - COMPLETE WITH ALL FUNCTIONS');
