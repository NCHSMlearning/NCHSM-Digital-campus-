// js/lecturer-dashboard.js - COMPLETE UPGRADED VERSION
/**
 * NCHSM Lecturer Dashboard Module
 * Complete with all features: Metrics, Charts, Top Students, Alerts, Progress, Activity
 */

const LecturerDashboard = {
    metrics: {
        totalStudents: 0,
        totalCourses: 0,
        atRiskStudents: 0,
        pendingAttendance: 0,
        examsDue: 0,
        unreadMessages: 0,
        avgPerformance: 0
    },
    attendanceMetrics: {
        today: 0,
        week: 0,
        month: 0,
        overall: 0
    },
    chartInstances: {
        performance: null,
        distribution: null,
        trend: null
    },
    lecturerAssignmentId: null,
    lecturerUuid: null,
    assignedUnits: [],
    assignedStudents: [],
    isRefreshing: false,
    refreshInterval: null,
    
    async init() {
        console.log('📊 Initializing Lecturer Dashboard...');
        try {
            await this.resolveLecturerId();
            await this.loadAssignedUnits();
            await this.loadAssignedStudents();
            await this.loadMetrics();
            await this.loadAttendanceMetrics();
            this.updateWelcomeBanner();
            this.loadQuickStats();
            await this.loadCourseProgress();
            await this.loadTopStudents();
            await this.loadAttendanceAlerts();
            await this.loadRecentActivity();
            await this.loadCharts();
            this.setupEventListeners();
            this.startAutoRefresh();
            this.updateLastUpdated();
            console.log('✅ Lecturer Dashboard initialized');
            console.log(`📚 ${this.assignedUnits.length} assigned units`);
            console.log(`👨‍🎓 ${this.assignedStudents.length} assigned students`);
        } catch (error) {
            console.error('❌ Dashboard initialization error:', error);
        }
    },
    
    // ============================================
    // RESOLVE LECTURER ID
    // ============================================
    async resolveLecturerId() {
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) return;
            
            const profile = window.lecturerDB?.getCurrentUserProfile();
            if (!profile) return;
            
            const fullName = profile.full_name;
            const authId = profile.user_id;
            
            console.log('🔍 Dashboard - Auth ID:', authId);
            console.log('🔍 Dashboard - Lecturer name:', fullName);
            
            this.lecturerUuid = authId;
            
            // Try to find from lecturer_subject_assignments
            const { data: assignments, error: assignError } = await supabase
                .from('lecturer_subject_assignments')
                .select('lecturer_id, lecturer_name')
                .ilike('lecturer_name', `%${fullName}%`);
            
            if (!assignError && assignments && assignments.length > 0) {
                // Try to find non-STAFF ID first
                const nonStaff = assignments.find(a => !a.lecturer_id.toString().startsWith('STAFF'));
                if (nonStaff) {
                    this.lecturerAssignmentId = nonStaff.lecturer_id;
                    console.log('✅ Dashboard using non-STAFF ID:', this.lecturerAssignmentId);
                    return;
                }
                this.lecturerAssignmentId = assignments[0].lecturer_id;
                console.log('✅ Dashboard using STAFF ID:', this.lecturerAssignmentId);
                return;
            }
            
            this.lecturerAssignmentId = authId;
            console.log('⚠️ Dashboard falling back to auth ID:', this.lecturerAssignmentId);
            
        } catch (error) {
            console.error('Error resolving lecturer ID:', error);
            this.lecturerAssignmentId = null;
        }
    },
    
    // ============================================
    // LOAD ASSIGNED UNITS
    // ============================================
    async loadAssignedUnits() {
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) return;
            
            const profile = window.lecturerDB?.getCurrentUserProfile();
            if (!profile) return;
            
            const fullName = profile.full_name;
            
            const { data: assignments, error } = await supabase
                .from('lecturer_subject_assignments')
                .select('subject_name, subject_code, block, program, academic_year, lecturer_id')
                .ilike('lecturer_name', `%${fullName}%`);
            
            if (error) {
                console.error('Error loading assigned units:', error);
                this.assignedUnits = [];
                return;
            }
            
            // Filter to KRCHN program
            const krchnUnits = assignments?.filter(u => u.program === 'KRCHN') || [];
            this.assignedUnits = krchnUnits.length > 0 ? krchnUnits : (assignments || []);
            
            console.log(`📚 Loaded ${this.assignedUnits.length} assigned units`);
            
        } catch (error) {
            console.error('Failed to load assigned units:', error);
            this.assignedUnits = [];
        }
    },
    
    // ============================================
    // LOAD ASSIGNED STUDENTS
    // ============================================
    async loadAssignedStudents() {
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) return;
            
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const program = profile?.program || profile?.department || 'KRCHN';
            
            const unitNames = this.assignedUnits.map(u => u.subject_name);
            
            if (unitNames.length === 0) {
                this.assignedStudents = [];
                return;
            }
            
            // Get students enrolled in these units
            const { data: enrollments, error: enrollError } = await supabase
                .from('student_unit_registrations')
                .select('student_id, unit_name, status')
                .in('unit_name', unitNames)
                .eq('program', program)
                .eq('status', 'approved');
            
            if (enrollError) {
                console.error('Error loading enrollments:', enrollError);
                this.assignedStudents = [];
                return;
            }
            
            const studentIds = [...new Set(enrollments?.map(e => e.student_id) || [])];
            
            if (studentIds.length === 0) {
                this.assignedStudents = [];
                return;
            }
            
            // Get student profiles
            const { data: students, error: studentError } = await supabase
                .from('consolidated_user_profiles_table')
                .select('user_id, student_id, full_name, program, block, intake_year, email, phone, gender')
                .in('user_id', studentIds)
                .eq('role', 'student');
            
            if (studentError) {
                console.error('Error loading student profiles:', studentError);
                this.assignedStudents = [];
                return;
            }
            
            // Map enrollments to students
            const enrollmentMap = {};
            enrollments?.forEach(e => {
                if (!enrollmentMap[e.student_id]) {
                    enrollmentMap[e.student_id] = [];
                }
                enrollmentMap[e.student_id].push(e.unit_name);
            });
            
            this.assignedStudents = (students || []).map(s => ({
                ...s,
                units_enrolled: enrollmentMap[s.user_id] || [],
                unit_count: (enrollmentMap[s.user_id] || []).length
            }));
            
            console.log(`👨‍🎓 Loaded ${this.assignedStudents.length} assigned students`);
            
        } catch (error) {
            console.error('Failed to load assigned students:', error);
            this.assignedStudents = [];
        }
    },
    
    // ============================================
    // LOAD METRICS
    // ============================================
    async loadMetrics() {
        try {
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const program = profile?.program || profile?.department || 'KRCHN';
            
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) return;
            
            // Total students (assigned)
            this.metrics.totalStudents = this.assignedStudents.length || 0;
            
            // Total courses
            this.metrics.totalCourses = this.assignedUnits.length || 0;
            
            // At risk students (based on attendance or marks)
            const atRisk = this.assignedStudents.filter(s => {
                return (s.absences || 0) > 5 || (s.cumulative_absences || 0) > 5;
            });
            this.metrics.atRiskStudents = atRisk.length || 0;
            
            // Exams due
            const { data: exams, error: examError } = await supabase
                .from('cats_exams')
                .select('*')
                .eq('program', program)
                .eq('status', 'Scheduled');
            
            if (!examError) {
                this.metrics.examsDue = exams?.length || 0;
            }
            
            // Pending attendance
            const today = new Date().toISOString().split('T')[0];
            const { data: todayLogs } = await supabase
                .from('geo_attendance_logs')
                .select('student_id')
                .eq('program', program)
                .gte('check_in_time', `${today}T00:00:00.000Z`)
                .lte('check_in_time', `${today}T23:59:59.999Z`);
            
            const checkedIn = new Set(todayLogs?.map(l => l.student_id) || []);
            const pending = this.assignedStudents.filter(s => !checkedIn.has(s.user_id));
            this.metrics.pendingAttendance = pending.length || 0;
            
            // Unread messages
            const lecturerId = this.lecturerUuid || profile.user_id;
            const { data: messages } = await supabase
                .from('messages')
                .select('id')
                .eq('receiver_id', lecturerId)
                .eq('is_read', false);
            
            this.metrics.unreadMessages = messages?.length || 0;
            
            // Avg performance
            const studentIds = this.assignedStudents.map(s => s.user_id);
            if (studentIds.length > 0) {
                const { data: marks } = await supabase
                    .from('student_marks')
                    .select('final_score')
                    .in('student_id', studentIds);
                
                const validScores = marks?.filter(m => m.final_score > 0) || [];
                if (validScores.length > 0) {
                    const avg = validScores.reduce((a, b) => a + b.final_score, 0) / validScores.length;
                    this.metrics.avgPerformance = Math.round(avg);
                }
            }
            
            this.updateMetricCards();
            
        } catch (error) {
            console.error('Failed to load metrics:', error);
        }
    },
    
    // ============================================
    // UPDATE METRIC CARDS
    // ============================================
    updateMetricCards() {
        const elements = {
            'totalStudentsCount': this.metrics.totalStudents,
            'totalCoursesCount': this.metrics.totalCourses,
            'studentsAtRiskCount': this.metrics.atRiskStudents,
            'pendingAttendanceCount': this.metrics.pendingAttendance,
            'examsDueCount': this.metrics.examsDue,
            'unreadMessagesCount': this.metrics.unreadMessages,
            'avgPerformance': this.metrics.avgPerformance + '%'
        };
        
        Object.keys(elements).forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = elements[id];
            }
        });
        
        // Update badges
        const badge = document.getElementById('studentCountBadge');
        if (badge) {
            badge.textContent = this.metrics.totalStudents;
        }
    },
    
    // ============================================
    // LOAD QUICK STATS
    // ============================================
    loadQuickStats() {
        const container = document.getElementById('quickStatsContainer');
        if (!container) return;
        
        const totalStudents = this.assignedStudents.length || this.metrics.totalStudents || 0;
        const totalUnits = this.assignedUnits.length || this.metrics.totalCourses || 0;
        const avgStudentsPerUnit = totalUnits > 0 ? Math.round(totalStudents / totalUnits) : 0;
        const totalEnrollments = totalStudents * totalUnits;
        const programs = [...new Set(this.assignedStudents.map(s => s.program).filter(Boolean))];
        
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; background: #f8fafc; border-radius: 12px; padding: 15px 20px; border: 1px solid #e5e7eb;">
                <div style="text-align: center;">
                    <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Avg/Unit</div>
                    <div style="font-size: 20px; font-weight: 700; color: #0A3D62;">${avgStudentsPerUnit}</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Enrollments</div>
                    <div style="font-size: 20px; font-weight: 700; color: #0A3D62;">${totalEnrollments}</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Units</div>
                    <div style="font-size: 20px; font-weight: 700; color: #0A3D62;">${totalUnits}</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Programs</div>
                    <div style="font-size: 20px; font-weight: 700; color: #0A3D62;">${programs.length}</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Student Load</div>
                    <div style="font-size: 20px; font-weight: 700; color: ${totalStudents > 50 ? '#10b981' : '#f59e0b'};">${totalStudents}</div>
                </div>
            </div>
        `;
    },
    
    // ============================================
    // LOAD ATTENDANCE METRICS
    // ============================================
    async loadAttendanceMetrics() {
        try {
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const program = profile?.program || profile?.department || 'KRCHN';
            
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) return;
            
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];
            
            // Today's attendance
            const { data: todayLogs } = await supabase
                .from('geo_attendance_logs')
                .select('*')
                .eq('program', program)
                .gte('check_in_time', `${todayStr}T00:00:00.000Z`)
                .lte('check_in_time', `${todayStr}T23:59:59.999Z`);
            
            this.attendanceMetrics.today = todayLogs?.length || 0;
            
            // Weekly attendance
            const weekRange = this.getWeekRange();
            const { data: weekLogs } = await supabase
                .from('geo_attendance_logs')
                .select('*')
                .eq('program', program);
            
            this.attendanceMetrics.week = weekLogs?.filter(l => {
                const date = new Date(l.check_in_time);
                return date >= weekRange.start && date <= weekRange.end;
            }).length || 0;
            
            // Monthly rate
            const { data: monthLogs } = await supabase
                .from('geo_attendance_logs')
                .select('student_id')
                .eq('program', program);
            
            const uniqueStudents = [...new Set(monthLogs?.map(l => l.student_id) || [])];
            const totalStudents = this.assignedStudents.length || this.metrics.totalStudents || 1;
            this.attendanceMetrics.month = totalStudents > 0 ? Math.round((uniqueStudents.length / totalStudents) * 100) : 0;
            
            // Overall
            this.attendanceMetrics.overall = monthLogs?.length || 0;
            
            this.updateAttendanceMetricsUI();
            
        } catch (error) {
            console.error('Failed to load attendance metrics:', error);
        }
    },
    
    getWeekRange() {
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        const start = new Date(today);
        start.setDate(diff);
        start.setHours(0, 0, 0, 0);
        const end = new Date(today);
        end.setDate(diff + 6);
        end.setHours(23, 59, 59, 999);
        return { start, end };
    },
    
    updateAttendanceMetricsUI() {
        const elements = {
            'todayAttendanceTotal': this.attendanceMetrics.today,
            'todayAttendanceTotal2': this.attendanceMetrics.today,
            'weeklyAttendanceTotal': this.attendanceMetrics.week,
            'monthlyAttendanceRate': this.attendanceMetrics.month + '%',
            'overallAttendanceTotal': this.attendanceMetrics.overall
        };
        
        Object.keys(elements).forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = elements[id];
            }
        });
        
        const dateDisplay = document.getElementById('todayDateDisplay');
        if (dateDisplay) {
            dateDisplay.textContent = new Date().toLocaleDateString('en-GB', {
                weekday: 'short',
                day: 'numeric',
                month: 'short'
            });
        }
    },
    
    // ============================================
    // UPDATE WELCOME BANNER
    // ============================================
    updateWelcomeBanner() {
        const profile = window.lecturerDB?.getCurrentUserProfile();
        const welcomeHeader = document.getElementById('welcomeHeader');
        const welcomeBannerText = document.getElementById('welcomeBannerText');
        const studentCountDisplay = document.getElementById('studentCountDisplay');
        const unitCountDisplay = document.getElementById('unitCountDisplay');
        const programSubtitle = document.getElementById('programSubtitle');
        
        if (welcomeHeader) {
            welcomeHeader.textContent = profile?.full_name || 'Lecturer';
        }
        
        const program = profile?.program || profile?.department || 'KRCHN';
        const programDisplay = window.LecturerUtils?.getProgramDisplayName(program) || program;
        
        if (programSubtitle) {
            programSubtitle.textContent = `Dashboard filtered for ${programDisplay}`;
        }
        
        if (welcomeBannerText) {
            const totalStudents = this.assignedStudents.length || 0;
            const totalUnits = this.assignedUnits.length || 0;
            welcomeBannerText.textContent = 
                `Welcome back! You have ${totalUnits} assigned units with ${totalStudents} students. ` +
                `Quick actions are available below to help you manage your courses efficiently.`;
        }
        
        const badge = document.getElementById('userProgramBadge');
        if (badge) {
            badge.textContent = programDisplay;
        }
        
        if (studentCountDisplay) {
            studentCountDisplay.textContent = this.assignedStudents.length || 0;
        }
        if (unitCountDisplay) {
            unitCountDisplay.textContent = this.assignedUnits.length || 0;
        }
        
        // Update date/time
        const currentDateTime = document.getElementById('currentDateTime');
        if (currentDateTime) {
            const now = new Date();
            currentDateTime.textContent = now.toLocaleDateString('en-GB', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            }) + ' · ' + now.toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    },
    
    // ============================================
    // LOAD COURSE PROGRESS
    // ============================================
    async loadCourseProgress() {
        try {
            const container = document.getElementById('courseProgressList');
            if (!container) return;
            
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) return;
            
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const program = profile?.program || profile?.department || 'KRCHN';
            
            const unitNames = this.assignedUnits.map(u => u.subject_name);
            
            if (unitNames.length === 0) {
                container.innerHTML = '<p style="color: #94a3b8; text-align: center; padding: 20px;">No courses assigned.</p>';
                return;
            }
            
            const progressData = await Promise.all(unitNames.map(async (unit) => {
                const { data: marks } = await supabase
                    .from('student_marks')
                    .select('final_score')
                    .eq('subject_name', unit)
                    .eq('program', program);
                
                const validScores = marks?.filter(m => m.final_score > 0) || [];
                const avgScore = validScores.length > 0 
                    ? Math.round(validScores.reduce((a, b) => a + b.final_score, 0) / validScores.length) 
                    : 0;
                const studentCount = validScores.length;
                const totalStudents = this.assignedStudents.length || 0;
                const completionRate = totalStudents > 0 ? Math.round((studentCount / totalStudents) * 100) : 0;
                
                return { unit, avgScore, studentCount, completionRate, totalStudents };
            }));
            
            container.innerHTML = progressData.map(p => {
                const color = p.avgScore >= 70 ? '#10b981' : (p.avgScore >= 50 ? '#f59e0b' : '#ef4444');
                return `
                    <div style="margin-bottom: 14px;">
                        <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;">
                            <span style="color: #1e293b; font-weight: 500;">${p.unit}</span>
                            <span style="color: ${color}; font-weight: 600;">
                                ${p.avgScore}% avg (${p.studentCount}/${p.totalStudents} students)
                            </span>
                        </div>
                        <div style="background: #f1f5f9; border-radius: 8px; height: 8px; overflow: hidden;">
                            <div class="progress-bar" style="background: ${color}; width: ${p.avgScore}%; height: 100%; border-radius: 8px; transition: width 1.5s ease;"></div>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; margin-top: 2px;">
                            <span>${p.completionRate}% completion</span>
                            <span>${p.studentCount} submissions</span>
                        </div>
                    </div>
                `;
            }).join('');
            
        } catch (error) {
            console.error('Failed to load course progress:', error);
            const container = document.getElementById('courseProgressList');
            if (container) {
                container.innerHTML = '<p style="color: #ef4444; text-align: center; padding: 20px;">Error loading progress</p>';
            }
        }
    },
    
    // ============================================
    // LOAD TOP STUDENTS
    // ============================================
    async loadTopStudents() {
        try {
            const container = document.getElementById('topStudentsList');
            if (!container) return;
            
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) return;
            
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const program = profile?.program || profile?.department || 'KRCHN';
            
            const studentIds = this.assignedStudents.map(s => s.user_id);
            
            if (studentIds.length === 0) {
                container.innerHTML = '<p style="color: #94a3b8; text-align: center; padding: 20px;">No students assigned yet.</p>';
                return;
            }
            
            // Get top performing students
            const { data: marks } = await supabase
                .from('student_marks')
                .select('student_id, student_name, final_score, subject_name')
                .in('student_id', studentIds)
                .order('final_score', { ascending: false })
                .limit(5);
            
            if (!marks || marks.length === 0) {
                container.innerHTML = '<p style="color: #94a3b8; text-align: center; padding: 20px;">No marks data available yet.</p>';
                return;
            }
            
            container.innerHTML = marks.map((m, i) => {
                const medalColors = ['#fcd34d', '#d1d5db', '#fca5a5'];
                const textColors = ['#92400e', '#374151', '#991b1b'];
                const bgColors = ['#fef3c7', '#f3f4f6', '#fee2e2'];
                const isTop3 = i < 3;
                
                return `
                    <div style="display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
                        <span style="background: ${isTop3 ? medalColors[i] : '#e5e7eb'}; 
                                     color: ${isTop3 ? textColors[i] : '#6b7280'}; 
                                     width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; 
                                     font-weight: bold; font-size: 13px;">
                            ${i + 1}
                        </span>
                        <div style="flex: 1;">
                            <div style="font-weight: 500; font-size: 14px; color: #1e293b;">${m.student_name || 'Unknown'}</div>
                            <div style="font-size: 11px; color: #94a3b8;">${m.subject_name || 'General'}</div>
                        </div>
                        <span style="font-weight: 700; color: ${m.final_score >= 70 ? '#10b981' : m.final_score >= 50 ? '#f59e0b' : '#ef4444'}; font-size: 16px;">
                            ${m.final_score || 0}%
                        </span>
                    </div>
                `;
            }).join('');
            
        } catch (error) {
            console.error('Failed to load top students:', error);
            const container = document.getElementById('topStudentsList');
            if (container) {
                container.innerHTML = '<p style="color: #ef4444; text-align: center; padding: 20px;">Error loading top students</p>';
            }
        }
    },
    
    // ============================================
    // LOAD ATTENDANCE ALERTS
    // ============================================
    async loadAttendanceAlerts() {
        try {
            const container = document.getElementById('attendanceAlerts');
            if (!container) return;
            
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) return;
            
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const program = profile?.program || profile?.department || 'KRCHN';
            
            const studentIds = this.assignedStudents.map(s => s.user_id);
            
            if (studentIds.length === 0) {
                container.innerHTML = '<p style="color: #94a3b8; text-align: center; padding: 20px;">No students assigned yet.</p>';
                return;
            }
            
            // Get students with multiple absences in the last 7 days
            const { data: absences } = await supabase
                .from('geo_attendance_logs')
                .select('student_id, student_name, COUNT(*) as absence_count')
                .in('student_id', studentIds)
                .eq('attendance_status', 'Absent')
                .gte('check_in_time', new Date(Date.now() - 7*24*60*60*1000).toISOString())
                .group_by('student_id, student_name')
                .having('COUNT(*) > 2')
                .order('absence_count', { ascending: false })
                .limit(5);
            
            if (!absences || absences.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: #10b981;">
                        <i class="fas fa-check-circle" style="font-size: 24px; display: block; margin-bottom: 8px;"></i>
                        <span style="font-size: 13px;">No attendance alerts! All students have good attendance.</span>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = absences.map(a => `
                <div style="display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: #fef2f2; border-radius: 8px; margin-bottom: 6px; border-left: 3px solid #ef4444;">
                    <i class="fas fa-exclamation-triangle" style="color: #ef4444; font-size: 14px;"></i>
                    <span style="flex: 1; font-size: 13px; color: #1e293b; font-weight: 500;">${a.student_name || 'Unknown'}</span>
                    <span style="font-size: 12px; color: #ef4444; font-weight: 600; background: #fee2e2; padding: 2px 10px; border-radius: 12px;">
                        ${a.absence_count} absences
                    </span>
                </div>
            `).join('');
            
        } catch (error) {
            console.error('Failed to load attendance alerts:', error);
            const container = document.getElementById('attendanceAlerts');
            if (container) {
                container.innerHTML = '<p style="color: #ef4444; text-align: center; padding: 20px;">Error loading alerts</p>';
            }
        }
    },
    
    // ============================================
    // LOAD RECENT ACTIVITY
    // ============================================
    async loadRecentActivity() {
        try {
            const container = document.getElementById('recentActivityList');
            if (!container) return;
            
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) return;
            
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const program = profile?.program || profile?.department || 'KRCHN';
            
            const activities = [];
            
            // Get recent attendance
            const { data: recentAttendance } = await supabase
                .from('geo_attendance_logs')
                .select('*')
                .eq('program', program)
                .order('check_in_time', { ascending: false })
                .limit(3);
            
            if (recentAttendance && recentAttendance.length > 0) {
                recentAttendance.forEach(a => {
                    activities.push({
                        type: 'attendance',
                        icon: 'fa-clipboard-check',
                        color: '#10b981',
                        message: `${a.student_name || 'Student'} checked in for ${a.session_type || 'class'}`,
                        time: a.check_in_time
                    });
                });
            }
            
            // Get recent exams
            const { data: recentExams } = await supabase
                .from('cats_exams')
                .select('*')
                .eq('program', program)
                .order('created_at', { ascending: false })
                .limit(2);
            
            if (recentExams && recentExams.length > 0) {
                recentExams.forEach(e => {
                    activities.push({
                        type: 'exam',
                        icon: 'fa-file-alt',
                        color: '#8b5cf6',
                        message: `Exam "${e.exam_name || e.title}" was created`,
                        time: e.created_at
                    });
                });
            }
            
            // Get recent sessions
            const { data: recentSessions } = await supabase
                .from('scheduled_sessions')
                .select('*')
                .eq('target_program', program)
                .order('created_at', { ascending: false })
                .limit(2);
            
            if (recentSessions && recentSessions.length > 0) {
                recentSessions.forEach(s => {
                    activities.push({
                        type: 'session',
                        icon: 'fa-calendar-plus',
                        color: '#f59e0b',
                        message: `Session "${s.session_title || s.title}" was scheduled`,
                        time: s.created_at
                    });
                });
            }
            
            // Sort by time (newest first)
            activities.sort((a, b) => new Date(b.time) - new Date(a.time));
            
            if (activities.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: #94a3b8;">
                        <i class="fas fa-inbox" style="font-size: 24px; display: block; margin-bottom: 8px;"></i>
                        <span style="font-size: 13px;">No recent activity found.</span>
                    </div>
                `;
                return;
            }
            
            // Show top 5 activities
            const topActivities = activities.slice(0, 5);
            
            container.innerHTML = topActivities.map(a => {
                const timeAgo = this.timeAgo(new Date(a.time));
                return `
                    <div style="display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
                        <div style="background: ${a.color}20; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                            <i class="fas ${a.icon}" style="color: ${a.color}; font-size: 14px;"></i>
                        </div>
                        <div style="flex: 1;">
                            <div style="font-size: 13px; color: #1e293b;">${a.message}</div>
                            <div style="font-size: 11px; color: #94a3b8;">${timeAgo}</div>
                        </div>
                    </div>
                `;
            }).join('');
            
        } catch (error) {
            console.error('Failed to load recent activity:', error);
            const container = document.getElementById('recentActivityList');
            if (container) {
                container.innerHTML = '<p style="color: #ef4444; text-align: center; padding: 20px;">Error loading activity</p>';
            }
        }
    },
    
    // ============================================
    // TIME AGO HELPER
    // ============================================
    timeAgo(date) {
        const now = new Date();
        const diff = Math.floor((now - date) / 1000);
        
        if (diff < 60) return 'Just now';
        if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
        if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
        if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    },
    
    // ============================================
    // UPDATE LAST UPDATED
    // ============================================
    updateLastUpdated() {
        const el = document.getElementById('lastUpdatedTime');
        if (el) {
            const now = new Date();
            el.textContent = `Last updated: ${now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
        }
    },
    
    // ============================================
    // START AUTO REFRESH
    // ============================================
    startAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        this.refreshInterval = setInterval(() => {
            this.refresh();
        }, 30000);
        console.log('🔄 Auto-refresh started (30s interval)');
    },
    
    // ============================================
    // CHARTS
    // ============================================
    async loadCharts() {
        console.log('📊 Loading lecturer charts...');
        
        try {
            const profile = window.lecturerDB?.getCurrentUserProfile();
            if (!profile) return;
            
            const program = profile.program || profile.department || 'KRCHN';
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) return;
            
            // Get students in this program
            const { data: students } = await supabase
                .from('consolidated_user_profiles_table')
                .select('*')
                .eq('role', 'student')
                .eq('program', program);
            
            // ============================================
            // 1. GENDER DISTRIBUTION CHART
            // ============================================
            const maleCount = students?.filter(s => s.gender === 'Male' || s.gender === 'M').length || 0;
            const femaleCount = students?.filter(s => s.gender === 'Female' || s.gender === 'F').length || 0;
            const otherCount = students?.filter(s => s.gender && !['Male', 'M', 'Female', 'F'].includes(s.gender)).length || 0;
            
            const ctx2 = document.getElementById('studentDistributionChart');
            if (ctx2) {
                if (this.chartInstances.distribution) {
                    this.chartInstances.distribution.destroy();
                }
                this.chartInstances.distribution = new Chart(ctx2, {
                    type: 'doughnut',
                    data: {
                        labels: ['Male', 'Female', 'Other'],
                        datasets: [{
                            data: [maleCount, femaleCount, otherCount],
                            backgroundColor: ['#4C1D95', '#FDB913', '#94a3b8'],
                            borderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: { padding: 15, font: { size: 12 } }
                            },
                            title: {
                                display: true,
                                text: `Gender Distribution - ${program}`,
                                font: { size: 14, weight: '600' },
                                padding: { bottom: 10 }
                            }
                        }
                    }
                });
                console.log('✅ Gender distribution chart updated');
            }
            
            // ============================================
            // 2. PERFORMANCE CHART
            // ============================================
            const studentIds = students?.map(s => s.user_id) || [];
            let marksData = [];
            if (studentIds.length > 0) {
                const { data: marks } = await supabase
                    .from('student_marks')
                    .select('*')
                    .in('student_id', studentIds);
                marksData = marks || [];
            }
            
            const subjectMarks = {};
            marksData.forEach(m => {
                const subject = m.subject_name || 'Unknown';
                if (!subjectMarks[subject]) {
                    subjectMarks[subject] = [];
                }
                subjectMarks[subject].push(m.final_score || m.score || 0);
            });
            
            const subjectNames = Object.keys(subjectMarks);
            const subjectAverages = subjectNames.map(name => {
                const scores = subjectMarks[name];
                const validScores = scores.filter(s => s > 0);
                if (validScores.length === 0) return 0;
                return Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length);
            });
            
            const ctx1 = document.getElementById('performanceChart');
            if (ctx1) {
                if (this.chartInstances.performance) {
                    this.chartInstances.performance.destroy();
                }
                
                const colors = ['#4C1D95', '#667eea', '#764ba2', '#8b5cf6', '#FDB913', '#10b981', '#ef4444', '#3b82f6'];
                
                this.chartInstances.performance = new Chart(ctx1, {
                    type: 'bar',
                    data: {
                        labels: subjectNames.length > 0 ? subjectNames : ['No Data'],
                        datasets: [{
                            label: 'Average Score (%)',
                            data: subjectAverages.length > 0 ? subjectAverages : [0],
                            backgroundColor: subjectNames.map((_, i) => colors[i % colors.length]),
                            borderRadius: 8
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            title: {
                                display: true,
                                text: `Performance by Subject - ${program}`,
                                font: { size: 14, weight: '600' },
                                padding: { bottom: 10 }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                max: 100,
                                title: {
                                    display: true,
                                    text: 'Average Score (%)'
                                }
                            }
                        }
                    }
                });
                console.log('✅ Performance chart updated with', subjectNames.length, 'subjects');
            }
            
            // ============================================
            // 3. ATTENDANCE TREND CHART
            // ============================================
            const ctx3 = document.getElementById('attendanceTrendChart');
            if (ctx3) {
                if (this.chartInstances.trend) {
                    this.chartInstances.trend.destroy();
                }
                
                const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                const attendanceData = [];
                
                for (let i = 6; i >= 0; i--) {
                    const date = new Date();
                    date.setDate(date.getDate() - i);
                    const dateStr = date.toISOString().split('T')[0];
                    
                    const { data: dayLogs } = await supabase
                        .from('geo_attendance_logs')
                        .select('*')
                        .eq('program', program)
                        .gte('check_in_time', `${dateStr}T00:00:00.000Z`)
                        .lte('check_in_time', `${dateStr}T23:59:59.999Z`);
                    
                    attendanceData.push(dayLogs?.length || 0);
                }
                
                this.chartInstances.trend = new Chart(ctx3, {
                    type: 'line',
                    data: {
                        labels: weekDays,
                        datasets: [{
                            label: 'Attendance',
                            data: attendanceData,
                            borderColor: '#4C1D95',
                            backgroundColor: 'rgba(76, 29, 149, 0.1)',
                            fill: true,
                            tension: 0.4,
                            pointBackgroundColor: '#4C1D95'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            title: {
                                display: true,
                                text: `Attendance Trend - ${program}`,
                                font: { size: 14, weight: '600' },
                                padding: { bottom: 10 }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: 'Students Present'
                                }
                            }
                        }
                    }
                });
                console.log('✅ Attendance trend chart updated');
            }
            
            console.log('✅ All charts updated for', program);
            
        } catch (error) {
            console.error('❌ Error loading charts:', error);
        }
    },
    
    // ============================================
    // SETUP EVENT LISTENERS
    // ============================================
    setupEventListeners() {
        // Quick action cards already use onclick in HTML
        // Stats cards already use onclick in HTML
        
        // Additional keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'r') {
                e.preventDefault();
                this.refresh();
            }
        });
        
        console.log('✅ Event listeners setup complete');
    },
    
    // ============================================
    // REFRESH
    // ============================================
    async refresh() {
        if (this.isRefreshing) return;
        this.isRefreshing = true;
        
        console.log('🔄 Refreshing dashboard...');
        
        try {
            await this.resolveLecturerId();
            await this.loadAssignedUnits();
            await this.loadAssignedStudents();
            await this.loadMetrics();
            await this.loadAttendanceMetrics();
            this.updateWelcomeBanner();
            this.loadQuickStats();
            await this.loadCourseProgress();
            await this.loadTopStudents();
            await this.loadAttendanceAlerts();
            await this.loadRecentActivity();
            await this.loadCharts();
            this.updateLastUpdated();
            
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Dashboard refreshed!', 'success');
            }
            console.log('✅ Dashboard refreshed');
        } catch (error) {
            console.error('❌ Refresh error:', error);
        } finally {
            this.isRefreshing = false;
        }
    },
    
    // ============================================
    // DESTROY (Cleanup)
    // ============================================
    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
        
        // Destroy chart instances
        Object.keys(this.chartInstances).forEach(key => {
            if (this.chartInstances[key]) {
                this.chartInstances[key].destroy();
                this.chartInstances[key] = null;
            }
        });
        
        console.log('🗑️ Dashboard destroyed');
    }
};

// ============================================
// INITIALIZE ON DOM READY
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => LecturerDashboard.init(), 500);
});

// ============================================
// GLOBAL EXPOSURE
// ============================================
window.LecturerDashboard = LecturerDashboard;
window.refreshDashboard = () => LecturerDashboard.refresh();

console.log('✅ LecturerDashboard module loaded - Complete upgraded version');
console.log('📊 Features: Metrics, Charts, Top Students, Alerts, Progress, Activity, Auto-refresh');
