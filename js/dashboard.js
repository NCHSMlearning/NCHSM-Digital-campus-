// dashboard.js - COMPLETE WORKING VERSION WITH EXAMS FROM exams_with_courses
// INCLUDES: Attendance Points (verified × 10), Color Coding, All Metrics

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
            lastLoginCount: document.getElementById('dashboard-login-count'),
            // NEW ELEMENTS FOR MODERN DASHBOARD
            attendancePoints: document.getElementById('attendance-points-value'),
            userLevel: document.getElementById('user-level'),
            userXp: document.getElementById('user-xp'),
            userXpMax: document.getElementById('user-xp-max'),
            xpProgressFill: document.getElementById('xp-progress-fill'),
            attendanceWarningBadge: document.getElementById('attendance-warning-badge'),
            warningText: document.getElementById('warning-text'),
            attendancePercentElement: document.querySelector('.attendance-percent')
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
        
        const cards = document.querySelectorAll('.stat-card, .mini-card, .attendance-card-modern');
        
        cards.forEach(card => {
            const newCard = card.cloneNode(true);
            if (card.parentNode) {
                card.parentNode.replaceChild(newCard, card);
            }
            
            let tabToOpen = newCard.getAttribute('data-tab');
            if (newCard.classList && newCard.classList.contains('nurseiq-card')) tabToOpen = 'nurseiq';
            if (newCard.classList && newCard.classList.contains('examcard-card')) tabToOpen = 'hub-exam-card';
            
            const finalTab = tabMapping[tabToOpen] || tabToOpen;
            
            if (finalTab) {
                newCard.addEventListener('click', (e) => {
                    if (e.target.closest('button') || e.target.closest('a')) return;
                    if (typeof window.showTab === 'function') {
                        window.showTab(finalTab);
                    }
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
            this.loadExamCardMetrics(),
            this.loadNurseIQMetrics(),
            this.updateCoursesMetric(),
            this.updateExamsMetric(),
            this.loadLastLoginInfo(),
            this.loadXPMetrics()
        ]);
        
        this.updateUIFromMetrics();
        
        console.log(`✅ All metrics loaded in ${(performance.now() - startTime).toFixed(0)}ms`);
        this.displaySummary();
    }
    
    async loadXPMetrics() {
        // Calculate XP from attendance points and NurseIQ
        const attendancePoints = (this.metrics.attendance.verified || 0) * 10;
        const nurseIQPoints = this.metrics.nurseiq.questions || 0;
        const totalXP = attendancePoints + nurseIQPoints;
        
        const maxXP = 100;
        const currentXP = totalXP % maxXP;
        const level = Math.floor(totalXP / maxXP) + 1;
        const percent = (currentXP / maxXP) * 100;
        
        this.metrics.xp = {
            current: currentXP,
            max: maxXP,
            level: level,
            percent: percent,
            total: totalXP
        };
        
        console.log(`⭐ XP: Level ${level} · ${currentXP}/${maxXP} XP (${percent}%)`);
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
            if (isNaN(utcDate.getTime())) return 'Invalid date';
            
            return utcDate.toLocaleString('en-KE', {
                timeZone: 'Africa/Nairobi',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch (error) {
            return new Date(utcTimestamp).toLocaleString();
        }
    }
    
    getRelativeTime(utcTimestamp) {
        if (!utcTimestamp) return 'Never';
        
        const now = new Date();
        const utcDate = new Date(utcTimestamp);
        if (isNaN(utcDate.getTime())) return 'Invalid date';
        
        const diffMs = now - utcDate;
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
    
    // ========== ATTENDANCE POINTS CALCULATION (NEW) ==========
    calculateAttendancePoints() {
        const verified = this.metrics.attendance.verified || 0;
        const points = verified * 10;
        this.metrics.attendance.points = points;
        
        // Update UI
        if (this.elements.attendancePoints) {
            this.elements.attendancePoints.innerText = points;
        }
        
        console.log(`🎯 Attendance Points: ${points} (${verified} verified × 10)`);
        return points;
    }
    
    // ========== ATTENDANCE COLOR CODING (NEW) ==========
    updateAttendanceColor() {
        const rate = this.metrics.attendance.rate || 0;
        const percentEl = this.elements.attendancePercentElement || document.querySelector('.attendance-percent');
        const warningBadge = this.elements.attendanceWarningBadge || document.getElementById('attendance-warning-badge');
        const warningText = this.elements.warningText || document.getElementById('warning-text');
        
        if (percentEl) {
            // Remove existing classes
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
        
        // Attendance Points & Color
        this.calculateAttendancePoints();
        this.updateAttendanceColor();
        
        // Courses
        if (this.elements.activeCourses) this.elements.activeCourses.innerText = m.courses;
        
        // Exam Card
        if (this.elements.dashboardExamStatus) {
            this.elements.dashboardExamStatus.innerText = m.examCard.eligible ? 'ELIGIBLE' : 'NOT ELIGIBLE';
            this.elements.dashboardExamStatus.style.color = m.examCard.eligible ? '#059669' : '#dc2626';
        }
        if (this.elements.dashboardApprovedUnits) this.elements.dashboardApprovedUnits.innerText = m.examCard.approved;
        
        // NurseIQ
        if (this.elements.nurseiqProgress) this.elements.nurseiqProgress.innerText = m.nurseiq.progress + '%';
        if (this.elements.nurseiqAccuracy) this.elements.nurseiqAccuracy.innerText = m.nurseiq.accuracy + '%';
        if (this.elements.nurseiqQuestions) this.elements.nurseiqQuestions.innerText = m.nurseiq.questions;
        
        // Resources
        if (this.elements.newResources) this.elements.newResources.innerText = m.resources;
        
        // Upcoming Exam
        if (this.elements.upcomingExam) this.elements.upcomingExam.innerText = m.exams;
        
        // XP Display
        if (this.elements.userLevel) this.elements.userLevel.innerText = m.xp.level;
        if (this.elements.userXp) this.elements.userXp.innerText = m.xp.current;
        if (this.elements.userXpMax) this.elements.userXpMax.innerText = m.xp.max;
        if (this.elements.xpProgressFill) this.elements.xpProgressFill.style.width = m.xp.percent + '%';
        
        // Last Login
        if (this.elements.lastLoginTime) {
            this.elements.lastLoginTime.innerHTML = `
                <div class="last-login-container">
                    <div class="last-login-datetime">${m.lastLogin.formatted}</div>
                    <div class="last-login-relative">${m.lastLogin.relative}</div>
                    <div class="last-login-count">🔐 ${m.lastLogin.loginCount} total logins</div>
                </div>
            `;
        }
        
        // Profile Info
        if (this.userProfile) {
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
            
            this.metrics.attendance = { rate, verified, total, pending: total - verified, points: verified * 10 };
            
            console.log(`📊 Attendance: ${rate}% (${verified}/${total}) → ${verified * 10} points`);
            
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
            }
            
            const { data: generalResources, error: genError } = await this.sb
                .from('resources')
                .select('id')
                .eq('target_program', 'General')
                .eq('block', this.userProfile.block);
            
            if (!genError && generalResources) {
                allResources = [...allResources, ...generalResources];
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
            
            console.log(`📇 Exam Card: ${approved} approved units`);
            
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
                    return;
                }
            }
        } catch (e) {}
        
        if (typeof window.getNurseIQDashboardMetrics === 'function') {
            const metrics = window.getNurseIQDashboardMetrics();
            if (metrics) {
                this.updateNurseIQMetric(metrics);
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
        let examDetails = null;
        
        try {
            console.log('🔍 Fetching upcoming exams from exams_with_courses...');
            
            if (!this.userProfile) {
                console.log('No user profile yet, skipping exam fetch');
                this.metrics.exams = upcomingText;
                return;
            }
            
            const today = new Date().toISOString().split('T')[0];
            
            const { data: exams, error } = await this.sb
                .from('exams_with_courses')
                .select('*')
                .in('status', ['published', 'Upcoming', 'InProgress'])
                .gte('exam_date', today)
                .order('exam_date', { ascending: true })
                .limit(10);
            
            if (error) {
                console.error('Exams query error:', error);
                this.metrics.exams = upcomingText;
                return;
            }
            
            console.log(`Found ${exams?.length || 0} upcoming exams`);
            
            if (!exams || exams.length === 0) {
                this.metrics.exams = upcomingText;
                return;
            }
            
            const matchingExams = exams.filter(exam => {
                let programMatch = true;
                if (exam.program_type && exam.program_type !== 'General') {
                    programMatch = exam.program_type === this.userProfile.program;
                }
                
                let blockMatch = true;
                if (exam.block_term && exam.block_term !== 'General') {
                    blockMatch = exam.block_term === this.userProfile.block;
                }
                
                let intakeMatch = true;
                if (exam.intake_year && exam.intake_year != this.userProfile.intake_year) {
                    intakeMatch = false;
                }
                
                return programMatch && blockMatch && intakeMatch;
            });
            
            console.log(`Matching exams: ${matchingExams.length}`);
            
            if (matchingExams && matchingExams.length > 0) {
                const upcomingExam = matchingExams[0];
                
                const examDate = new Date(upcomingExam.exam_date);
                const options = { weekday: 'short', month: 'short', day: 'numeric' };
                const formattedDate = examDate.toLocaleDateString('en-KE', options);
                
                let timeString = '';
                if (upcomingExam.exam_start_time) {
                    const timeParts = upcomingExam.exam_start_time.split(':');
                    const examTime = new Date();
                    examTime.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]));
                    timeString = examTime.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
                }
                
                upcomingText = timeString 
                    ? `${upcomingExam.exam_name} - ${formattedDate} at ${timeString}`
                    : `${upcomingExam.exam_name} - ${formattedDate}`;
                
                examDetails = {
                    id: upcomingExam.id,
                    name: upcomingExam.exam_name,
                    date: upcomingExam.exam_date,
                    time: upcomingExam.exam_start_time,
                    formatted: upcomingText
                };
                
                console.log(`📝 Upcoming exam: ${upcomingText}`);
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
    
    updateExamsMetricWithDetails(details) {
        if (details && details.upcomingExam) {
            this.metrics.exams = details.upcomingExam;
            this.metrics.upcomingExamDetails = details;
            if (this.elements.upcomingExam) {
                this.elements.upcomingExam.textContent = details.upcomingExam;
            }
        } else {
            this.updateExamsMetric();
        }
    }
    
    displaySummary() {
        console.log('\n═══════════════════════════════════════');
        console.log('📊 DASHBOARD SUMMARY');
        console.log('═══════════════════════════════════════');
        console.log(`   Attendance Rate: ${this.metrics.attendance.rate}% (${this.metrics.attendance.verified}/${this.metrics.attendance.total})`);
        console.log(`   Attendance Points: ${this.metrics.attendance.points} (${this.metrics.attendance.verified} × 10)`);
        console.log(`   Active Courses: ${this.metrics.courses}`);
        console.log(`   Resources: ${this.metrics.resources}`);
        console.log(`   Exam Card: ${this.metrics.examCard.eligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'} (${this.metrics.examCard.approved} units)`);
        console.log(`   NurseIQ: ${this.metrics.nurseiq.progress}% progress, ${this.metrics.nurseiq.accuracy}% accuracy`);
        console.log(`   Upcoming Exam: ${this.metrics.exams}`);
        console.log(`   XP: Level ${this.metrics.xp.level} · ${this.metrics.xp.current}/${this.metrics.xp.max} XP`);
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
        console.log(`📝 Upcoming Exam: ${this.metrics.exams}`);
        console.log(`🎯 Attendance Points: ${this.metrics.attendance.points}`);
        console.log(`⭐ XP Level: ${this.metrics.xp.level}`);
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

window.getExamsDashboardMetrics = async function() {
    if (dashboardModule && dashboardModule.metrics.upcomingExamDetails) {
        return dashboardModule.metrics.upcomingExamDetails;
    }
    return { upcomingExam: 'No upcoming exams' };
};

window.getAttendancePoints = function() {
    if (dashboardModule) {
        return dashboardModule.metrics.attendance.points;
    }
    return 0;
};

window.getXPMetrics = function() {
    if (dashboardModule) {
        return dashboardModule.metrics.xp;
    }
    return { level: 1, current: 0, max: 100, percent: 0 };
};

window.DashboardModule = DashboardModule;
window.initDashboardModule = initDashboardModule;
window.refreshDashboard = () => dashboardModule?.refreshAll();

console.log('✅ Dashboard module ready - QUERIES exams_with_courses table | INCLUDES attendance points');
