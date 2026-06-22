// dashboard.js - COMPLETE WORKING VERSION WITH ONE-CALL OPTIMIZATION + CACHING
class DashboardModule {
    constructor(supabaseClient) {
        console.log('🚀 Initializing DashboardModule...');
        
        this.sb = supabaseClient || window.sb || window.db?.supabase;
        this.userId = null;
        this.userProfile = null;
        this.autoRefreshInterval = null;
        
        // 🔥 Cache configuration
        this.CACHE_DURATION = 120000; // 2 minutes
        this.cacheKey = null;
        
        this.metrics = {
            attendance: { rate: 0, verified: 0, total: 0, pending: 0, points: 0 },
            resources: 0,
            examCard: { approved: 0, eligible: false },
            nurseiq: { progress: 0, accuracy: 0, questions: 0 },
            courses: 0,
            exams: 'No upcoming exams',
            xp: { current: 0, max: 100, level: 1, percent: 0 },
            nextExam: null
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
            announcementText: document.getElementById('student-announcement'),
            // ✅ Added next exam widget elements
            nextExamWidget: document.querySelector('.next-exam-widget'),
            nextExamDetails: document.getElementById('next-exam-details')
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
                this.saveToCache();
            }
        });
        
        document.addEventListener('attendanceCheckedIn', () => {
            this.loadAllMetrics();
        });
        
        document.querySelectorAll('.leaderboard-tabs span').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.leaderboard-tabs span').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const period = tab.innerText.trim().toLowerCase();
                this.loadLeaderboardData(period);
            });
        });
        
        const viewAll = document.querySelector('.view-all');
        if (viewAll) {
            viewAll.addEventListener('click', () => {
                this.showToast('All achievements feature coming soon!', 2000);
            });
        }
    }
    
    async initialize(userId, userProfile) {
        console.log('👤 Dashboard initializing...');
        
        this.userId = userId;
        this.userProfile = userProfile;
        this.cacheKey = `dashboard_${this.userId}`;
        
        if (!userId || !userProfile) return false;
        
        if (this.elements.welcomeStudentName && userProfile.full_name) {
            this.elements.welcomeStudentName.innerText = userProfile.full_name;
        }
        
        this.updateTimeGreeting();
        
        if (this.elements.currentBlock) {
            this.elements.currentBlock.innerText = userProfile.block || 'Introductory';
        }
        if (this.elements.programName) {
            this.elements.programName.innerText = userProfile.program || 'KRCHN';
        }
        if (this.elements.intakeYear) {
            this.elements.intakeYear.innerText = userProfile.intake_year || '2026';
        }
        
        await this.loadAllMetrics();
        this.startAutoRefresh();
        
        return true;
    }
    
    updateTimeGreeting() {
        const hour = new Date().getHours();
        let greeting = '';
        
        if (hour >= 5 && hour < 12) greeting = 'Good Morning';
        else if (hour >= 12 && hour < 17) greeting = 'Good Afternoon';
        else if (hour >= 17 && hour < 21) greeting = 'Good Evening';
        else greeting = 'Good Night';
        
        const welcomeH1 = document.querySelector('.welcome h1');
        const studentName = this.elements.welcomeStudentName?.innerText || 'Student';
        if (welcomeH1) {
            welcomeH1.innerHTML = `${greeting}, ${studentName}! 🎉`;
        }
    }
    
    // ============================================================
    // 🔥 ONE API CALL WITH CACHING
    // ============================================================
    async loadAllMetrics() {
        console.log('📊 Loading dashboard metrics...');
        
        // ✅ CHECK CACHE FIRST
        if (this.cacheKey) {
            const cached = localStorage.getItem(this.cacheKey);
            if (cached) {
                try {
                    const { data, timestamp } = JSON.parse(cached);
                    if (Date.now() - timestamp < this.CACHE_DURATION) {
                        this.metrics = data;
                        this.updateUIFromMetrics();
                        console.log('✅ Dashboard loaded from CACHE (2x faster!)');
                        // Still refresh in background
                        this.loadFreshData();
                        return;
                    }
                } catch (e) { /* ignore */ }
            }
        }
        
        // Fetch fresh data
        await this.loadFreshData();
    }
    
    // Separate function for fresh data
    async loadFreshData() {
        console.log('📊 Loading fresh dashboard data...');
        
        try {
            // Try RPC first
            const { data, error } = await this.sb.rpc('get_student_dashboard', {
                p_user_id: this.userId
            });
            
            if (error) throw error;
            
            // Update metrics
            this.metrics.attendance = data.attendance || { rate: 0, verified: 0, total: 0, pending: 0, points: 0 };
            this.metrics.attendance.points = (this.metrics.attendance.verified || 0) * 10;
            
            this.metrics.examCard = data.examCard || { approved: 0, eligible: false };
            this.metrics.nurseiq = data.nurseiq || { questions: 0, accuracy: 0, progress: 0 };
            this.metrics.nurseiq.progress = this.metrics.nurseiq.questions > 0 ? Math.min(Math.round((this.metrics.nurseiq.questions / 105) * 100), 100) : 0;
            this.metrics.exams = data.exam?.title || 'No upcoming exams';
            this.metrics.resources = data.resources || 0;
            this.metrics.courses = data.examCard?.approved || 0;
            
            // Update XP
            const attendancePoints = (this.metrics.attendance.verified || 0) * 10;
            const nurseIQPoints = this.metrics.nurseiq.questions || 0;
            const totalXP = attendancePoints + nurseIQPoints;
            const maxXP = 100;
            const currentXP = totalXP % maxXP;
            const level = Math.floor(totalXP / maxXP) + 1;
            const percent = (currentXP / maxXP) * 100;
            this.metrics.xp = { current: currentXP, max: maxXP, level, percent, total: totalXP };
            
            // Save to cache
            this.saveToCache();
            
            // Update UI
            this.updateUIFromMetrics();
            
            // Update announcement
            if (this.elements.announcementText && data.announcement) {
                this.elements.announcementText.innerHTML = data.announcement;
            } else if (this.elements.announcementText) {
                this.elements.announcementText.innerHTML = 'Welcome to your dashboard! Stay tuned for updates.';
            }
            
            // Update XP elements
            if (this.elements.userLevel) this.elements.userLevel.innerText = level;
            if (this.elements.userXp) this.elements.userXp.innerText = currentXP;
            if (this.elements.userXpMax) this.elements.userXpMax.innerText = maxXP;
            if (this.elements.xpProgressFill) this.elements.xpProgressFill.style.width = percent + '%';
            
            // Update exam status
            const approved = this.metrics.examCard?.approved || 0;
            if (this.elements.examStatus) {
                this.elements.examStatus.innerText = approved > 0 ? 'ELIGIBLE' : 'NOT ELIGIBLE';
                this.elements.examStatus.style.color = approved > 0 ? '#059669' : '#dc2626';
            }
            if (this.elements.approvedUnits) this.elements.approvedUnits.innerText = approved;
            if (this.elements.activeCourses) this.elements.activeCourses.innerText = approved;
            
            // ✅ Updated: Call the standalone exam update
            await this.updateExamsMetric();
            
            console.log('✅ Dashboard loaded from DATABASE');
            
            // Load secondary data
            await Promise.all([
                this.loadLeaderboardData('all'),
                this.loadQuickNextClass()
            ]);
            
        } catch (error) {
            console.error('Dashboard error:', error);
            // Fallback: load individually if batch fails
            await this.loadIndividualMetrics();
        }
    }
    
    // Save metrics to cache
    saveToCache() {
        if (!this.cacheKey) return;
        try {
            localStorage.setItem(this.cacheKey, JSON.stringify({
                data: this.metrics,
                timestamp: Date.now()
            }));
        } catch (e) { /* ignore */ }
    }
    
    // Fallback method (keep this for safety)
    async loadIndividualMetrics() {
        console.log('⚠️ Falling back to individual metrics...');
        await Promise.all([
            this.loadAttendanceMetrics(),
            this.loadResourcesMetrics(),
            this.loadExamCardMetrics(),
            this.loadNurseIQMetrics(),
            this.updateExamsMetric(),
            this.loadXPMetrics(),
            this.loadAnnouncement()
        ]);
        this.updateUIFromMetrics();
        this.saveToCache();
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
        } catch (error) {
            console.error('Resources error:', error);
            this.metrics.resources = 0;
        }
    }
    
    async loadNurseIQMetrics() {
        if (!this.userId || !this.sb) return;
        
        try {
            let totalQuestions = 0;
            let correctAnswers = 0;
            
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
            
            this.metrics.nurseiq = { progress: progressPercent, accuracy: accuracy, questions: totalQuestions };
            
        } catch (error) {
            console.error('NurseIQ error:', error);
            this.metrics.nurseiq = { progress: 0, accuracy: 0, questions: 0 };
        }
    }
    
    // ============================================================
    // 🆕 UPDATED: EXAM METRICS WITH WIDGET SUPPORT
    // ============================================================
    async updateExamsMetric() {
        let upcomingText = 'No upcoming exams';
        
        try {
            if (!this.userProfile) return;
            
            const kenyaNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
            const todayStr = kenyaNow.toISOString().split('T')[0];
            
            console.log('📅 Checking upcoming exams for:', {
                program: this.userProfile.program,
                block: this.userProfile.block,
                intake: this.userProfile.intake_year,
                today: todayStr,
                now: kenyaNow.toISOString()
            });
            
            // ✅ Get ALL exams for this student
            const { data: exams, error } = await this.sb
                .from('exams')
                .select('*')
                .eq('program_type', this.userProfile.program)
                .eq('block', this.userProfile.block)
                .eq('intake_year', this.userProfile.intake_year)
                .order('exam_date', { ascending: true })
                .order('exam_start_time', { ascending: true });
            
            if (error) {
                console.error('Exams query error:', error);
                throw error;
            }
            
            console.log(`📊 Found ${exams?.length || 0} exams for this student`);
            
            if (!exams || exams.length === 0) {
                upcomingText = 'No exams scheduled';
                if (this.elements.upcomingExam) {
                    this.elements.upcomingExam.innerText = upcomingText;
                }
                // ✅ Update widget with no exams
                this.updateNextExamWidget(null);
                return;
            }
            
            // ✅ Process exams to find upcoming ones
            let upcomingExams = [];
            let currentExams = [];
            let completedExams = [];
            
            exams.forEach(exam => {
                try {
                    const examDate = new Date(exam.exam_date);
                    const examTime = exam.exam_start_time || '00:00:00';
                    const [hours, minutes] = examTime.split(':').map(Number);
                    examDate.setHours(hours || 0, minutes || 0, 0, 0);
                    
                    // Compare with current Kenya time
                    const examDateTime = examDate;
                    const isUpcoming = examDateTime > kenyaNow;
                    const isToday = examDateTime.toDateString() === kenyaNow.toDateString();
                    const isPast = examDateTime < kenyaNow;
                    
                    const examDisplayName = exam.exam_name || exam.title || 'Exam';
                    
                    console.log(`📝 ${examDisplayName}:`, {
                        date: examDateTime.toISOString(),
                        now: kenyaNow.toISOString(),
                        isUpcoming,
                        isToday,
                        isPast,
                        status: exam.status
                    });
                    
                    if (isUpcoming || (isToday && !isPast)) {
                        upcomingExams.push(exam);
                    } else if (isPast && exam.status !== 'Completed') {
                        if (isToday) {
                            currentExams.push(exam);
                        } else {
                            completedExams.push(exam);
                        }
                    } else {
                        completedExams.push(exam);
                    }
                    
                } catch (e) {
                    console.error('Error processing exam:', exam.id, e);
                }
            });
            
            // ✅ Sort upcoming by date (closest first)
            upcomingExams.sort((a, b) => {
                const dateA = new Date(`${a.exam_date}T${a.exam_start_time || '00:00:00'}`);
                const dateB = new Date(`${b.exam_date}T${b.exam_start_time || '00:00:00'}`);
                return dateA - dateB;
            });
            
            console.log(`📊 Upcoming: ${upcomingExams.length}, Current: ${currentExams.length}, Completed: ${completedExams.length}`);
            
            // ✅ UPDATE THE WIDGET AND DISPLAY
            if (upcomingExams.length > 0) {
                const nextExam = upcomingExams[0];
                const examDate = new Date(nextExam.exam_date);
                const formattedDate = examDate.toLocaleDateString('en-KE', {
                    timeZone: 'Africa/Nairobi',
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                });
                const examTitle = nextExam.exam_name || nextExam.title || 'Exam';
                upcomingText = `${examTitle} - ${formattedDate}`;
                
                // ✅ Store next exam for widget
                this.metrics.nextExam = nextExam;
                
                // ✅ Update the widget
                this.updateNextExamWidget(nextExam);
                
            } else if (currentExams.length > 0) {
                const todayExam = currentExams[0];
                const examTitle = todayExam.exam_name || todayExam.title || 'Exam';
                upcomingText = `📅 ${examTitle} - Today`;
                this.metrics.nextExam = todayExam;
                this.updateNextExamWidget(todayExam);
                
            } else if (completedExams.length > 0) {
                const lastExam = completedExams[completedExams.length - 1];
                const examTitle = lastExam.exam_name || lastExam.title || 'Exam';
                upcomingText = `✅ ${examTitle} (Completed)`;
                this.metrics.nextExam = null;
                this.updateNextExamWidget(null);
                
            } else {
                upcomingText = 'No upcoming exams';
                this.metrics.nextExam = null;
                this.updateNextExamWidget(null);
            }
            
            // ✅ Update the UI
            this.metrics.exams = upcomingText;
            if (this.elements.upcomingExam) {
                this.elements.upcomingExam.innerText = upcomingText;
            }
            
            // ✅ Dispatch event for other components
            document.dispatchEvent(new CustomEvent('examsUpdated', {
                detail: { 
                    upcoming: upcomingExams, 
                    current: currentExams, 
                    completed: completedExams,
                    nextExam: this.metrics.nextExam
                }
            }));
            
        } catch (error) {
            console.error('Exams error:', error);
            if (this.elements.upcomingExam) {
                this.elements.upcomingExam.innerText = 'Error loading exams';
            }
            this.updateNextExamWidget(null);
        }
    }
    
    // ============================================================
    // 🆕 NEXT EXAM WIDGET
    // ============================================================
    updateNextExamWidget(exam) {
        const container = document.querySelector('.next-exam-widget');
        if (!container) {
            console.warn('⚠️ Next exam widget container not found');
            return;
        }
        
        const detailsContainer = document.getElementById('next-exam-details');
        const statusContainer = document.getElementById('dashboard-exam-status');
        
        if (!exam) {
            if (detailsContainer) {
                detailsContainer.innerHTML = `
                    <div style="text-align: center; padding: 10px;">
                        <p style="font-size: 0.8rem; color: #64748B;">No upcoming exams</p>
                        <p style="font-size: 0.7rem; color: #94A3B8; margin-top: 4px;">Check back later for new assessments</p>
                    </div>
                `;
            }
            if (statusContainer) {
                statusContainer.innerText = 'No Exams';
                statusContainer.style.color = '#64748B';
            }
            return;
        }
        
        // Determine exam type
        const isCatExam = exam.exam_type?.toUpperCase().includes('CAT') || false;
        const isFinalExam = exam.exam_type?.toUpperCase() === 'EXAM' || 
                           exam.exam_type?.toUpperCase() === 'FINAL' || 
                           exam.exam_type?.toUpperCase() === 'END_TERM';
        
        // Calculate total marks
        let totalMarks = 30;
        if (isCatExam) {
            totalMarks = 30;
        } else if (isFinalExam) {
            totalMarks = 70;
        } else {
            totalMarks = exam.total_marks || exam.marks_out_of || 100;
        }
        
        const passMark = exam.pass_mark || Math.round(totalMarks * 0.6);
        const examDate = new Date(exam.exam_date);
        const formattedDate = examDate.toLocaleDateString('en-KE', {
            timeZone: 'Africa/Nairobi',
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
        
        // Determine badge style
        let badgeClass = 'exam-badge';
        let badgeText = 'EXAM';
        let badgeBg = '#DBEAFE';
        let badgeColor = '#1E40AF';
        
        if (isCatExam) {
            badgeText = 'CAT';
            badgeBg = '#FEF3C7';
            badgeColor = '#92400E';
        } else if (isFinalExam) {
            badgeText = 'FINAL';
            badgeBg = '#D1FAE5';
            badgeColor = '#065F46';
        }
        
        // Format time
        const examTime = exam.exam_start_time || '00:00:00';
        const formattedTime = examTime.substring(0, 5);
        
        if (detailsContainer) {
            detailsContainer.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px; padding: 8px 0;">
                    <div style="background: ${badgeBg}; padding: 6px 12px; border-radius: 8px; flex-shrink: 0;">
                        <span style="font-weight: 700; font-size: 0.75rem; color: ${badgeColor};">
                            ${badgeText}
                        </span>
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: 600; font-size: 0.9rem; color: #0A3D62; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${this.escapeHtml(exam.exam_name || exam.title)}
                        </div>
                        <div style="font-size: 0.7rem; color: #64748B; display: flex; flex-wrap: wrap; gap: 8px; margin-top: 2px;">
                            <span>📅 ${formattedDate}</span>
                            <span>⏰ ${formattedTime}</span>
                            <span>📊 ${totalMarks} marks</span>
                            <span>🎯 ${passMark} marks (60%)</span>
                            <span>⏳ ${exam.duration_minutes || 30} min</span>
                        </div>
                    </div>
                </div>
            `;
        }
        
        if (statusContainer) {
            const timeUntil = this.getTimeUntilExam(examDate);
            statusContainer.innerText = `⏳ ${timeUntil}`;
            statusContainer.style.color = '#F59E0B';
        }
        
        // Make the whole widget clickable to go to exams tab
        container.style.cursor = 'pointer';
        container.onclick = () => {
            const examsTab = document.querySelector('[data-tab="exams"]');
            if (examsTab) examsTab.click();
        };
    }
    
    // ============================================================
    // 🕐 GET TIME UNTIL EXAM
    // ============================================================
    getTimeUntilExam(examDate) {
        const now = new Date();
        const diffMs = examDate - now;
        
        if (diffMs < 0) {
            return 'Expired';
        }
        
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        if (diffDays > 0) {
            return `${diffDays}d ${diffHours}h`;
        } else if (diffHours > 0) {
            return `${diffHours}h ${diffMinutes}m`;
        } else if (diffMinutes > 0) {
            return `${diffMinutes}m`;
        } else {
            return 'Starting soon!';
        }
    }
    
    async loadAnnouncement() {
        if (!this.userProfile || !this.sb) return;
        
        try {
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
                .select('id, full_name, login_count, block, program, last_login')
                .eq('role', 'student');
            
            if (period === 'weekly') {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                query = query.gte('last_login', weekAgo.toISOString());
            } else if (period === 'monthly') {
                const monthAgo = new Date();
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                query = query.gte('last_login', monthAgo.toISOString());
            }
            
            const { data: students, error } = await query;
            if (error) throw error;
            
            if (!students || students.length === 0) {
                container.innerHTML = '<div class="empty-slim">No data yet</div>';
                return;
            }
            
            const scoredStudents = await Promise.all(students.map(async (student) => {
                let loginPoints = (student.login_count || 0) * 10;
                
                const { data: attendance } = await this.sb
                    .from('geo_attendance_logs')
                    .select('is_verified')
                    .eq('student_id', student.id);
                
                const verifiedCount = attendance?.filter(a => a.is_verified === true).length || 0;
                const attendancePoints = verifiedCount * 10;
                
                let nurseIQPoints = 0;
                const { data: progress } = await this.sb
                    .from('user_progress')
                    .select('progress_data')
                    .eq('user_id', student.id)
                    .maybeSingle();
                
                if (progress?.progress_data?.answers) {
                    nurseIQPoints = Object.values(progress.progress_data.answers).filter(a => a.answered).length;
                }
                
                const { data: attempts } = await this.sb
                    .from('nurseiq_attempts')
                    .select('score, total_questions')
                    .eq('student_id', student.id);
                
                if (attempts && attempts.length > 0) {
                    let attemptPoints = 0;
                    attempts.forEach(a => {
                        attemptPoints += a.score || 0;
                    });
                    if (attemptPoints > nurseIQPoints) nurseIQPoints = attemptPoints;
                }
                
                const totalPoints = loginPoints + attendancePoints + nurseIQPoints;
                return { ...student, loginPoints, attendancePoints, nurseIQPoints, totalPoints };
            }));
            
            scoredStudents.sort((a, b) => b.totalPoints - a.totalPoints);
            const topStudents = scoredStudents.slice(0, 10);
            
            container.innerHTML = topStudents.map((student, index) => {
                const rankIcon = index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : (index + 1).toString();
                const name = student.full_name?.split(' ')[0] || 'Student';
                return `
                    <div class="leader-slim">
                        <span class="rank">${rankIcon}</span>
                        <span class="name">${this.escapeHtml(name)}</span>
                        <span class="pts">${student.totalPoints} pts</span>
                    </div>
                `;
            }).join('');
            
        } catch (error) {
            console.error('Leaderboard error:', error);
            container.innerHTML = '<div class="error-slim">Failed to load</div>';
        }
    }
    
    async loadQuickNextClass() {
        console.log('📅 Loading next UNFINISHED class...');
        
        try {
            const studentBlock = this.userProfile?.block;
            if (!studentBlock) {
                console.log('No block found');
                return;
            }
            
            const now = new Date();
            const todayDate = now.toISOString().split('T')[0];
            const currentTime = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:00`;
            
            console.log(`Current: ${todayDate} at ${currentTime}`);
            
            const { data: futureClasses, error } = await this.sb
                .from('timetables')
                .select('*')
                .eq('block', studentBlock)
                .gte('class_date', todayDate)
                .order('class_date', { ascending: true })
                .order('start_time', { ascending: true });
            
            if (error) {
                console.error('Query error:', error);
                return;
            }
            
            if (!futureClasses || futureClasses.length === 0) {
                console.log('No upcoming classes found');
                const card = document.getElementById('quick-next-class');
                if (card) card.style.display = 'none';
                return;
            }
            
            let nextClass = null;
            
            for (const cls of futureClasses) {
                const classDateTime = new Date(`${cls.class_date}T${cls.start_time}`);
                if (classDateTime > now) {
                    nextClass = cls;
                    break;
                }
            }
            
            if (!nextClass) {
                console.log('No future classes (all today are done)');
                const card = document.getElementById('quick-next-class');
                if (card) card.style.display = 'none';
                return;
            }
            
            const classDate = new Date(nextClass.class_date);
            const isToday = classDate.toDateString() === now.toDateString();
            const startTime = nextClass.start_time?.substring(0,5) || 'TBA';
            const endTime = nextClass.end_time?.substring(0,5) || 'TBA';
            
            const formattedDate = classDate.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
            });
            
            console.log(`✅ NEXT CLASS: ${nextClass.session_name} on ${formattedDate} at ${startTime}`);
            
            const timeEl = document.getElementById('quick-next-class-time');
            const nameEl = document.getElementById('quick-next-class-name');
            const codeEl = document.getElementById('quick-next-class-code');
            const lecturerEl = document.getElementById('quick-next-class-lecturer');
            const venueEl = document.getElementById('quick-next-class-venue');
            const daySpan = document.getElementById('quick-next-class-day');
            const dayContainer = document.getElementById('quick-next-class-day-container');
            
            if (timeEl) timeEl.innerHTML = `${startTime} — ${endTime}`;
            if (nameEl) nameEl.innerHTML = nextClass.session_name || nextClass.course_name;
            if (codeEl) codeEl.innerHTML = nextClass.course_name || studentBlock;
            
            let lecturerName = nextClass.lecturer_name || 'TBA';
            if (lecturerName !== 'TBA' && lecturerName !== '—') {
                lecturerName = lecturerName.split(' ').slice(0,2).join(' ');
            }
            if (lecturerEl) lecturerEl.innerHTML = lecturerName;
            if (venueEl) venueEl.innerHTML = nextClass.venue || 'TBD';
            
            if (daySpan) {
                if (isToday) {
                    if (dayContainer) dayContainer.classList.add('today');
                    daySpan.innerHTML = 'TODAY';
                } else {
                    if (dayContainer) dayContainer.classList.remove('today');
                    daySpan.innerHTML = formattedDate;
                }
            }
            
            const card = document.getElementById('quick-next-class');
            if (card) {
                card.style.display = 'block';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }
            
            if (card) {
                card.onclick = () => {
                    const calendarTab = document.querySelector('[data-tab="calendar"]');
                    if (calendarTab) calendarTab.click();
                };
            }
            
        } catch (error) {
            console.error('Error loading next class:', error);
            const card = document.getElementById('quick-next-class');
            if (card) card.style.display = 'none';
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
        
        if (this.elements.attendanceRate) this.elements.attendanceRate.innerText = m.attendance.rate + '%';
        if (this.elements.verifiedCount) this.elements.verifiedCount.innerText = m.attendance.verified;
        if (this.elements.totalCount) this.elements.totalCount.innerText = m.attendance.total;
        if (this.elements.pendingCount) this.elements.pendingCount.innerText = m.attendance.pending;
        if (this.elements.attendancePoints) this.elements.attendancePoints.innerText = m.attendance.points;
        
        const rate = m.attendance.rate || 0;
        const percentEl = document.querySelector('.attendance-percent');
        if (percentEl) {
            percentEl.classList.remove('attendance-critical', 'attendance-warning', 'attendance-good');
            if (rate < 50) percentEl.classList.add('attendance-critical');
            else if (rate < 75) percentEl.classList.add('attendance-warning');
            else percentEl.classList.add('attendance-good');
        }
        
        const warningText = document.getElementById('warning-text');
        if (warningText) {
            if (rate < 50) warningText.innerText = 'CRITICAL';
            else if (rate < 75) warningText.innerText = 'BELOW 75%';
            else warningText.innerText = 'GOOD';
        }
        
        const approved = m.examCard.approved || 0;
        if (this.elements.activeCourses) this.elements.activeCourses.innerText = approved;
        if (this.elements.examStatus) {
            this.elements.examStatus.innerText = approved > 0 ? 'ELIGIBLE' : 'NOT ELIGIBLE';
            this.elements.examStatus.style.color = approved > 0 ? '#059669' : '#dc2626';
        }
        if (this.elements.approvedUnits) this.elements.approvedUnits.innerText = approved;
        
        if (this.elements.nurseiqProgress) this.elements.nurseiqProgress.innerText = m.nurseiq.progress + '%';
        if (this.elements.nurseiqAccuracy) this.elements.nurseiqAccuracy.innerText = m.nurseiq.accuracy + '%';
        if (this.elements.nurseiqQuestions) this.elements.nurseiqQuestions.innerText = m.nurseiq.questions;
        if (this.elements.nurseiqPoints) this.elements.nurseiqPoints.innerText = m.nurseiq.questions;
        
        if (this.elements.resources) this.elements.resources.innerText = m.resources;
        if (this.elements.upcomingExam) this.elements.upcomingExam.innerText = m.exams;
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
            if (!document.hidden) {
                // Refresh in background without blocking UI
                this.loadFreshData();
            }
        }, 120000); // 2 minutes
    }
    
    async refreshAll() {
        console.log('🔄 Manual refresh...');
        // Force refresh by clearing cache
        if (this.cacheKey) {
            localStorage.removeItem(this.cacheKey);
        }
        await this.loadFreshData();
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
                padding: 8px 16px;
                border-radius: 40px;
                font-size: 12px;
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

console.log('✅ Dashboard module ready with caching');
