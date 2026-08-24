// ============================================
// js/lecturer-dashboard.js - COMPLETE UPGRADED VERSION WITH TVET SUPPORT
// ============================================
// NCHSM Lecturer Dashboard Module
// Features: Metrics, Charts, Top Students, Alerts, Progress, Activity, 
// Clinical Hours, Early Warning System, Attendance Deep Dive, Auto-refresh
// Supports both Nursing (KRCHN) and TVET programs
// ============================================

const LecturerDashboard = {
    // ─── STATE ───
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
        overall: 0,
        present: 0,
        absent: 0,
        pending: 0,
        lectureCount: 0,
        clinicalCount: 0,
        labCount: 0,
        campusCount: 0,
        hospitalCount: 0
    },
    clinicalMetrics: {
        percent: 0,
        completed: 0,
        required: 1500,
        onTrack: 0,
        atRisk: 0,
        critical: 0
    },
    riskMetrics: {
        high: 0,
        medium: 0,
        low: 0,
        students: []
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
    currentProgram: null,
    isTVET: false, // ✅ Added TVET flag
    
    // ─── GET CURRENT PROGRAM ───
    getCurrentProgram() {
        try {
            // 1. Try from window variable (set by lecturer-main.js)
            if (window.CURRENT_PROGRAM) {
                this.currentProgram = window.CURRENT_PROGRAM;
                this.isTVET = window.IS_TVET || false;
                localStorage.setItem('lecturerProgram', this.currentProgram);
                localStorage.setItem('isTVET', JSON.stringify(this.isTVET));
                return this.currentProgram;
            }
            
            // 2. Try from profile
            const profile = window.lecturerDB?.getCurrentUserProfile();
            if (profile?.program) {
                this.currentProgram = profile.program;
                this.isTVET = this.currentProgram !== 'KRCHN';
                localStorage.setItem('lecturerProgram', this.currentProgram);
                localStorage.setItem('isTVET', JSON.stringify(this.isTVET));
                return this.currentProgram;
            }
            
            // 3. Try from department
            if (profile?.department) {
                this.currentProgram = profile.department;
                this.isTVET = this.currentProgram !== 'KRCHN';
                localStorage.setItem('lecturerProgram', this.currentProgram);
                localStorage.setItem('isTVET', JSON.stringify(this.isTVET));
                return this.currentProgram;
            }
            
            // 4. Try from localStorage
            const stored = localStorage.getItem('lecturerProgram');
            if (stored) {
                this.currentProgram = stored;
                const storedTVET = localStorage.getItem('isTVET');
                this.isTVET = storedTVET === 'true';
                return stored;
            }
            
            // 5. Final fallback
            console.warn('⚠️ No program found, using KRCHN as fallback');
            this.currentProgram = 'KRCHN';
            this.isTVET = false;
            return 'KRCHN';
        } catch (e) {
            console.warn('⚠️ Error getting program:', e);
            this.currentProgram = 'KRCHN';
            this.isTVET = false;
            return 'KRCHN';
        }
    },
    
    // ─── GET PASSING THRESHOLD ───
    getPassingThreshold() {
        return this.isTVET ? 50 : 60;
    },
    
    // ─── GET GRADE FOR SCORE ───
    getGrade(score) {
        if (this.isTVET) {
            // TVET Grading: A(80%) B(65%) C(50%) E(0%)
            if (score >= 80) return { grade: 'A', points: 4.0, remarks: 'MASTERY', color: '#065f46' };
            if (score >= 65) return { grade: 'B', points: 3.0, remarks: 'PROFICIENT', color: '#1e40af' };
            if (score >= 50) return { grade: 'C', points: 2.0, remarks: 'COMPETENT', color: '#92400e' };
            return { grade: 'E', points: 0.0, remarks: 'NOT YET COMPETENT', color: '#991b1b' };
        } else {
            // Nursing Grading: A(75%) B(65%) C(60%) D(0%)
            if (score >= 75) return { grade: 'A', points: 4.0, remarks: 'Distinction', color: '#065f46' };
            if (score >= 65) return { grade: 'B', points: 3.0, remarks: 'Credit', color: '#1e40af' };
            if (score >= 60) return { grade: 'C', points: 2.0, remarks: 'Pass', color: '#92400e' };
            return { grade: 'D', points: 0.0, remarks: 'Fail', color: '#991b1b' };
        }
    },
    
    // ─── GET GRADING REFERENCE ───
    getGradingReference() {
        if (this.isTVET) {
            return {
                name: 'TVET Competency-Based Grading',
                icon: '🔧',
                color: '#8b5cf6',
                passingScore: 50,
                grades: [
                    { grade: 'A', range: '80-100%', points: 4.0, remarks: 'MASTERY' },
                    { grade: 'B', range: '65-79%', points: 3.0, remarks: 'PROFICIENT' },
                    { grade: 'C', range: '50-64%', points: 2.0, remarks: 'COMPETENT' },
                    { grade: 'E', range: '0-49%', points: 0.0, remarks: 'NOT YET COMPETENT' }
                ]
            };
        } else {
            return {
                name: 'Nursing Grading System',
                icon: '🎓',
                color: '#4C1D95',
                passingScore: 60,
                grades: [
                    { grade: 'A', range: '75-100%', points: 4.0, remarks: 'Distinction' },
                    { grade: 'B', range: '65-74%', points: 3.0, remarks: 'Credit' },
                    { grade: 'C', range: '60-64%', points: 2.0, remarks: 'Pass' },
                    { grade: 'D', range: '0-59%', points: 0.0, remarks: 'Fail' }
                ]
            };
        }
    },
    
    // ─── INIT ───
    async init() {
        console.log('📊 Initializing Lecturer Dashboard...');
        const program = this.getCurrentProgram();
        const typeLabel = this.isTVET ? 'TVET' : 'Nursing';
        console.log(`📚 Current Program: ${program} (${typeLabel})`);
        
        try {
            await this.resolveLecturerId();
            await this.loadAssignedUnits();
            await this.loadAssignedStudents();
            await this.loadMetrics();
            await this.loadAttendanceMetrics();
            await this.loadClinicalHours();
            await this.loadRiskData();
            this.updateWelcomeBanner();
            this.loadQuickStats();
            await this.loadCourseProgress();
            await this.loadTopStudents();
            await this.loadAttendanceAlerts();
            await this.loadIntelligentAlerts();
            await this.loadRecentActivity();
            await this.loadCharts();
            this.setupEventListeners();
            this.startAutoRefresh();
            this.updateLastUpdated();
            this.updateProgramBadge();
            this.updateDashboardGradingInfo();
            console.log('✅ Lecturer Dashboard initialized');
            console.log(`📚 ${this.assignedUnits.length} assigned units`);
            console.log(`👨‍🎓 ${this.assignedStudents.length} assigned students`);
            console.log(`🎯 Program: ${this.currentProgram} (${typeLabel})`);
            console.log(`📊 Grading: ${this.isTVET ? 'TVET (Pass: 50%)' : 'Nursing (Pass: 60%)'}`);
        } catch (error) {
            console.error('❌ Dashboard initialization error:', error);
        }
    },
    
    // ─── UPDATE DASHBOARD GRADING INFO ───
    updateDashboardGradingInfo() {
        const gradingInfo = document.getElementById('gradingSystemInfo');
        if (gradingInfo) {
            if (this.isTVET) {
                gradingInfo.innerHTML = `
                    <span style="background: #8b5cf6; color: white; padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 600;">
                        🔧 TVET Grading: A(80%) B(65%) C(50%) E(0%)
                    </span>
                `;
                gradingInfo.style.display = 'inline-block';
            } else {
                gradingInfo.innerHTML = `
                    <span style="background: #4C1D95; color: white; padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 600;">
                        🎓 Nursing Grading: A(75%) B(65%) C(60%) D(0%)
                    </span>
                `;
                gradingInfo.style.display = 'inline-block';
            }
        }
        
        // Update passing threshold display
        const thresholdDisplay = document.getElementById('passingThresholdDisplay');
        if (thresholdDisplay) {
            const threshold = this.getPassingThreshold();
            thresholdDisplay.textContent = `Passing: ≥${threshold}%`;
        }
    },
    
    // ─── UPDATE PROGRAM BADGE ───
    updateProgramBadge() {
        const program = this.getCurrentProgram();
        const typeLabel = this.isTVET ? 'TVET' : 'Nursing';
        const emoji = this.isTVET ? '🔧' : '🎓';
        const displayText = `${emoji} ${program} (${typeLabel})`;
        
        // Update sidebar program badge
        const badge = document.getElementById('userProgramBadge');
        if (badge) {
            badge.textContent = displayText;
            badge.style.background = this.isTVET ? 'rgba(139,92,246,0.3)' : 'rgba(76,29,149,0.3)';
            badge.style.border = this.isTVET ? '1px solid #8b5cf6' : '1px solid #4C1D95';
        }
        
        // Update program display in attendance section
        const programDisplay = document.getElementById('programDisplayName');
        if (programDisplay) {
            programDisplay.textContent = `${program} (${typeLabel})`;
        }
        
        // Update program subtitle
        const subtitle = document.getElementById('programSubtitle');
        if (subtitle) {
            subtitle.textContent = `${emoji} Program: ${program} (${typeLabel})`;
        }
        
        // Update program badge in dashboard header
        const programBadge = document.querySelector('.program-badge');
        if (programBadge) {
            programBadge.textContent = displayText;
            programBadge.style.background = this.isTVET ? '#8b5cf6' : '#4C1D95';
        }
        
        // Update program type badge in top banner
        const programTypeBadge = document.getElementById('programTypeBadge');
        if (programTypeBadge) {
            programTypeBadge.textContent = typeLabel;
            programTypeBadge.style.background = this.isTVET ? 'rgba(139,92,246,0.3)' : 'rgba(76,29,149,0.3)';
        }
        
        // Store for other parts of the app
        window.lecturerProgram = program;
        window.IS_TVET = this.isTVET;
        localStorage.setItem('lecturerProgram', program);
        localStorage.setItem('isTVET', JSON.stringify(this.isTVET));
    },
    
    // ─── RESOLVE LECTURER ID ───
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
            
            const { data: assignments, error: assignError } = await supabase
                .from('lecturer_subject_assignments')
                .select('lecturer_id, lecturer_name')
                .ilike('lecturer_name', `%${fullName}%`);
            
            if (!assignError && assignments && assignments.length > 0) {
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
    
    // ─── LOAD ASSIGNED UNITS ───
    async loadAssignedUnits() {
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) return;
            
            const profile = window.lecturerDB?.getCurrentUserProfile();
            if (!profile) return;
            
            const fullName = profile.full_name;
            const program = this.getCurrentProgram();
            
            const { data: assignments, error } = await supabase
                .from('lecturer_subject_assignments')
                .select('subject_name, subject_code, block, program, academic_year, lecturer_id')
                .ilike('lecturer_name', `%${fullName}%`);
            
            if (error) {
                console.error('Error loading assigned units:', error);
                this.assignedUnits = [];
                return;
            }
            
            // Filter by current program
            const programUnits = assignments?.filter(u => u.program === program) || [];
            this.assignedUnits = programUnits.length > 0 ? programUnits : (assignments || []);
            
            console.log(`📚 Loaded ${this.assignedUnits.length} assigned units for program ${program}`);
            console.log(`📚 TVET Mode: ${this.isTVET}`);
            
        } catch (error) {
            console.error('Failed to load assigned units:', error);
            this.assignedUnits = [];
        }
    },
    
    // ─── LOAD ASSIGNED STUDENTS ───
    async loadAssignedStudents() {
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) return;
            
            const program = this.getCurrentProgram();
            
            const unitNames = this.assignedUnits.map(u => u.subject_name);
            
            if (unitNames.length === 0) {
                this.assignedStudents = [];
                return;
            }
            
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
            
            const { data: students, error: studentError } = await supabase
                .from('consolidated_user_profiles_table')
                .select('user_id, student_id, full_name, program, block, intake_year, email, phone, gender')
                .in('user_id', studentIds)
                .eq('role', 'student')
                .eq('program', program);
            
            if (studentError) {
                console.error('Error loading student profiles:', studentError);
                this.assignedStudents = [];
                return;
            }
            
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
            
            console.log(`👨‍🎓 Loaded ${this.assignedStudents.length} assigned students for program ${program}`);
            
        } catch (error) {
            console.error('Failed to load assigned students:', error);
            this.assignedStudents = [];
        }
    },
    
    // ─── LOAD METRICS ───
    async loadMetrics() {
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) return;
            
            const program = this.getCurrentProgram();
            const threshold = this.getPassingThreshold();
            
            this.metrics.totalStudents = this.assignedStudents.length || 0;
            this.metrics.totalCourses = this.assignedUnits.length || 0;
            
            // At risk students (from risk data)
            const atRisk = this.assignedStudents.filter(s => {
                return (s.absences || 0) > 5 || (s.cumulative_absences || 0) > 5;
            });
            this.metrics.atRiskStudents = atRisk.length || 0;
           // ✅ FIXED: Use 'target_program' instead of 'program'
            const { data: exams, error: examError } = await supabase
                .from('cats_exams')
                .select('*')
                .eq('target_program', program)  // ✅ Changed from 'program' to 'target_program'
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
            
            // Avg performance - uses dynamic threshold
            const studentIds = this.assignedStudents.map(s => s.user_id);
            if (studentIds.length > 0) {
                const { data: marks } = await supabase
                    .from('student_marks')
                    .select('final_score')
                    .in('student_id', studentIds)
                    .eq('program', program);
                
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
    
    // ─── UPDATE METRIC CARDS ───
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
    },
    
    // ─── LOAD QUICK STATS ───
    loadQuickStats() {
        const container = document.getElementById('quickStatsContainer');
        if (!container) return;
        
        const totalStudents = this.assignedStudents.length || this.metrics.totalStudents || 0;
        const totalUnits = this.assignedUnits.length || this.metrics.totalCourses || 0;
        const avgStudentsPerUnit = totalUnits > 0 ? Math.round(totalStudents / totalUnits) : 0;
        const totalEnrollments = totalStudents * totalUnits;
        const programs = [...new Set(this.assignedStudents.map(s => s.program).filter(Boolean))];
        const typeLabel = this.isTVET ? 'TVET' : 'Nursing';
        const emoji = this.isTVET ? '🔧' : '🎓';
        
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; background: #f8fafc; border-radius: 12px; padding: 15px 20px; border: 1px solid #e5e7eb;">
                <div style="text-align: center;">
                    <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Program</div>
                    <div style="font-size: 20px; font-weight: 700; color: ${this.isTVET ? '#7c3aed' : '#4C1D95'};">${emoji} ${typeLabel}</div>
                </div>
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
                    <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Passing</div>
                    <div style="font-size: 20px; font-weight: 700; color: ${this.isTVET ? '#8b5cf6' : '#10b981'};">≥${this.getPassingThreshold()}%</div>
                </div>
            </div>
        `;
    },
    
    // ─── LOAD ATTENDANCE METRICS ───
    async loadAttendanceMetrics() {
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) return;
            
            const program = this.getCurrentProgram();
            
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];
            
            // Today's attendance
            const { data: todayLogs } = await supabase
                .from('geo_attendance_logs')
                .select('*')
                .eq('program', program)
                .gte('check_in_time', `${todayStr}T00:00:00.000Z`)
                .lte('check_in_time', `${todayStr}T23:59:59.999Z`);
            
            const logs = todayLogs || [];
            this.attendanceMetrics.today = logs.length;
            this.attendanceMetrics.present = logs.filter(l => l.attendance_status === 'Present' || l.status === 'present').length;
            this.attendanceMetrics.absent = logs.filter(l => l.attendance_status === 'Absent' || l.status === 'absent').length;
            this.attendanceMetrics.pending = this.assignedStudents.length - logs.length;
            
            // Session type breakdown
            this.attendanceMetrics.lectureCount = logs.filter(l => l.session_type === 'Lecture' || l.session_type === 'Class').length;
            this.attendanceMetrics.clinicalCount = logs.filter(l => l.session_type === 'Clinical').length;
            this.attendanceMetrics.labCount = logs.filter(l => l.session_type === 'Lab').length;
            
            // Location breakdown
            this.attendanceMetrics.campusCount = logs.filter(l => 
                l.location && l.location.toLowerCase().includes('kiamunyi')
            ).length;
            this.attendanceMetrics.hospitalCount = logs.filter(l => 
                l.location && l.location.toLowerCase().includes('hospital')
            ).length;
            
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
            'overallAttendanceTotal': this.attendanceMetrics.overall,
            'todayPresent': this.attendanceMetrics.present,
            'todayAbsent': this.attendanceMetrics.absent,
            'todayPending': this.attendanceMetrics.pending,
            'lectureAttendance': this.attendanceMetrics.lectureCount,
            'clinicalAttendance': this.attendanceMetrics.clinicalCount,
            'labAttendance': this.attendanceMetrics.labCount
        };
        
        Object.keys(elements).forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = elements[id];
            }
        });
        
        // Location breakdown
        const locationEl = document.getElementById('locationBreakdown');
        if (locationEl) {
            locationEl.textContent = `🏫 ${this.attendanceMetrics.campusCount} · 🏥 ${this.attendanceMetrics.hospitalCount}`;
        }
        
        const dateDisplay = document.getElementById('todayDateDisplay');
        if (dateDisplay) {
            dateDisplay.textContent = new Date().toLocaleDateString('en-GB', {
                weekday: 'short',
                day: 'numeric',
                month: 'short'
            });
        }
    },
    
    // ─── LOAD CLINICAL HOURS ───
    async loadClinicalHours() {
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) return;
            
            const program = this.getCurrentProgram();
            
            const studentIds = this.assignedStudents.map(s => s.user_id);
            
            if (studentIds.length === 0) {
                this.updateClinicalUI(0, 0, 0, 0, 0);
                return;
            }
            
            const { data: logs } = await supabase
                .from('clinical_hours_logs')
                .select('student_id, hours_completed')
                .in('student_id', studentIds)
                .eq('program', program);
            
            const totalHours = logs?.reduce((sum, l) => sum + (l.hours_completed || 0), 0) || 0;
            const required = 1500;
            const percent = Math.min(Math.round((totalHours / required) * 100), 100);
            
            // Student distribution
            const studentHours = {};
            logs?.forEach(l => {
                studentHours[l.student_id] = (studentHours[l.student_id] || 0) + (l.hours_completed || 0);
            });
            
            let onTrack = 0, atRisk = 0, critical = 0;
            Object.values(studentHours).forEach(hours => {
                const pct = (hours / required) * 100;
                if (pct >= 80) onTrack++;
                else if (pct >= 60) atRisk++;
                else critical++;
            });
            
            this.clinicalMetrics = {
                percent,
                completed: totalHours,
                required,
                onTrack,
                atRisk,
                critical
            };
            
            this.updateClinicalUI(percent, totalHours, onTrack, atRisk, critical);
            
        } catch (error) {
            console.error('Failed to load clinical hours:', error);
        }
    },
    
    updateClinicalUI(percent, completed, onTrack, atRisk, critical) {
        const elements = {
            'clinicalHoursPercent': percent + '%',
            'clinicalHoursCompleted': completed,
            'clinicalOnTrack': onTrack,
            'clinicalAtRisk': atRisk,
            'clinicalCritical': critical
        };
        
        Object.keys(elements).forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = elements[id];
            }
        });
        
        // Progress ring
        const ring = document.getElementById('clinicalRing');
        if (ring) {
            const circumference = 314;
            const offset = circumference - (percent / 100) * circumference;
            ring.style.strokeDashoffset = offset;
        }
        
        // Progress bar
        const bar = document.getElementById('clinicalHoursBar');
        if (bar) {
            bar.style.width = Math.min(percent, 100) + '%';
        }
    },
    
    // ─── LOAD RISK DATA ───
    async loadRiskData() {
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) return;
            
            const program = this.getCurrentProgram();
            const studentIds = this.assignedStudents.map(s => s.user_id);
            
            if (studentIds.length === 0) {
                this.updateRiskUI([], 0, 0, 0);
                return;
            }
            
            // Get attendance data for risk calculation
            const { data: attendance } = await supabase
                .from('geo_attendance_logs')
                .select('student_id, attendance_status')
                .in('student_id', studentIds)
                .eq('program', program);
            
            // Get marks data
            const { data: marks } = await supabase
                .from('student_marks')
                .select('student_id, final_score')
                .in('student_id', studentIds)
                .eq('program', program);
            
            // Calculate risk scores
            const riskMap = {};
            const threshold = this.getPassingThreshold();
            
            studentIds.forEach(id => {
                const student = this.assignedStudents.find(s => s.user_id === id);
                const studentAttendance = attendance?.filter(a => a.student_id === id) || [];
                const studentMarks = marks?.filter(m => m.student_id === id) || [];
                
                const absences = studentAttendance.filter(a => 
                    a.attendance_status === 'Absent' || a.attendance_status === 'absent'
                ).length;
                
                const avgScore = studentMarks.length > 0 
                    ? studentMarks.reduce((sum, m) => sum + (m.final_score || 0), 0) / studentMarks.length
                    : 0;
                
                const submissions = studentMarks.length;
                const totalStudents = studentIds.length;
                const submissionRate = totalStudents > 0 ? (submissions / totalStudents) * 100 : 0;
                
                // Risk score algorithm
                let riskScore = 0;
                riskScore += Math.min(absences * 10, 50);
                riskScore += Math.max((100 - avgScore) * 0.3, 0);
                riskScore += Math.max((100 - submissionRate) * 0.2, 0);
                
                const isPassing = avgScore >= threshold;
                
                riskMap[id] = {
                    name: student?.full_name || 'Unknown',
                    absences,
                    avgScore: Math.round(avgScore),
                    submissionRate: Math.round(submissionRate),
                    riskScore: Math.round(riskScore),
                    riskLevel: riskScore > 50 ? 'high' : (riskScore > 25 ? 'medium' : 'low'),
                    isPassing
                };
            });
            
            const riskStudents = Object.entries(riskMap).map(([id, data]) => ({ id, ...data }));
            
            this.riskMetrics.high = riskStudents.filter(s => s.riskLevel === 'high').length;
            this.riskMetrics.medium = riskStudents.filter(s => s.riskLevel === 'medium').length;
            this.riskMetrics.low = riskStudents.filter(s => s.riskLevel === 'low').length;
            this.riskMetrics.students = riskStudents.sort((a, b) => b.riskScore - a.riskScore);
            
            this.updateRiskUI(riskStudents, this.riskMetrics.high, this.riskMetrics.medium, this.riskMetrics.low);
            
        } catch (error) {
            console.error('Failed to load risk data:', error);
        }
    },
    
    updateRiskUI(students, high, medium, low) {
        const elements = {
            'highRiskCount': high,
            'mediumRiskCount': medium,
            'lowRiskCount': low
        };
        
        Object.keys(elements).forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = elements[id];
            }
        });
        
        const container = document.getElementById('riskStudentList');
        if (!container) return;
        
        if (students.length === 0) {
            container.innerHTML = '<p style="color: #94a3b8; text-align: center; padding: 10px;">No risk data available.</p>';
            return;
        }
        
        // Show top 5 at-risk students
        const topRisk = students.filter(s => s.riskLevel !== 'low').slice(0, 5);
        
        if (topRisk.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 10px; color: #10b981;">
                    <i class="fas fa-check-circle"></i> All students are low risk!
                </div>
            `;
            return;
        }
        
        container.innerHTML = topRisk.map(s => {
            const colors = {
                high: { bg: '#fef2f2', border: '#dc2626', text: '#dc2626', label: '🔴 HIGH' },
                medium: { bg: '#fffbeb', border: '#f59e0b', text: '#d97706', label: '🟡 MEDIUM' }
            };
            const c = colors[s.riskLevel] || colors.medium;
            const passingEmoji = s.isPassing ? '✅' : '❌';
            
            return `
                <div style="display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: ${c.bg}; border-radius: 8px; margin-bottom: 6px; border-left: 3px solid ${c.border};">
                    <span style="font-weight: 600; color: ${c.text}; font-size: 11px;">${c.label}</span>
                    <span style="flex: 1; font-size: 13px; color: #1e293b; font-weight: 500;">${s.name}</span>
                    <span style="font-size: 12px; color: #64748b;">${s.absences} absences</span>
                    <span style="font-size: 12px; font-weight: 600; color: ${s.isPassing ? '#10b981' : '#ef4444'};">${s.avgScore}% ${passingEmoji}</span>
                </div>
            `;
        }).join('');
    },
    
    // ─── UPDATE WELCOME BANNER ───
    updateWelcomeBanner() {
        const profile = window.lecturerDB?.getCurrentUserProfile();
        const program = this.getCurrentProgram();
        const typeLabel = this.isTVET ? 'TVET' : 'Nursing';
        const emoji = this.isTVET ? '🔧' : '🎓';
        const threshold = this.getPassingThreshold();
        
        const welcomeHeader = document.getElementById('welcomeHeader');
        const welcomeBannerText = document.getElementById('welcomeBannerText');
        const studentCountDisplay = document.getElementById('studentCountDisplay');
        const unitCountDisplay = document.getElementById('unitCountDisplay');
        
        if (welcomeHeader) {
            welcomeHeader.textContent = profile?.full_name || 'Lecturer';
        }
        
        if (welcomeBannerText) {
            const totalStudents = this.assignedStudents.length || 0;
            const totalUnits = this.assignedUnits.length || 0;
            const atRisk = this.riskMetrics.high || 0;
            const riskMsg = atRisk > 0 ? `⚠️ ${atRisk} at-risk students need attention.` : '✅ All students on track!';
            welcomeBannerText.textContent = 
                `${emoji} Welcome back! You have ${totalUnits} assigned units with ${totalStudents} students. ${riskMsg} (${typeLabel} - Passing: ≥${threshold}%)`;
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
        
        // Update program subtitle
        const subtitle = document.getElementById('programSubtitle');
        if (subtitle) {
            subtitle.textContent = `${emoji} Program: ${program} (${typeLabel}) · Passing: ≥${threshold}%`;
        }
    },
    
    // ─── LOAD COURSE PROGRESS ───
    async loadCourseProgress() {
        try {
            const container = document.getElementById('courseProgressList');
            if (!container) return;
            
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) return;
            
            const program = this.getCurrentProgram();
            const threshold = this.getPassingThreshold();
            
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
                const passingCount = validScores.filter(s => s >= threshold).length;
                const passRate = studentCount > 0 ? Math.round((passingCount / studentCount) * 100) : 0;
                
                return { unit, avgScore, studentCount, completionRate, totalStudents, passRate };
            }));
            
            container.innerHTML = progressData.map(p => {
                const color = p.avgScore >= 70 ? '#10b981' : (p.avgScore >= 50 ? '#f59e0b' : '#ef4444');
                const passEmoji = p.passRate >= 80 ? '🌟' : (p.passRate >= 50 ? '📈' : '⚠️');
                const statusLabel = p.avgScore >= 70 ? '✅ Excellent' : (p.avgScore >= 50 ? '⚡ Good' : '⚠️ Needs Improvement');
                return `
                    <div style="margin-bottom: 14px; padding: 10px 12px; background: #f8fafc; border-radius: 10px; border: 1px solid #e5e7eb;">
                        <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;">
                            <span style="color: #1e293b; font-weight: 600;">${p.unit}</span>
                            <span style="color: ${color}; font-weight: 600;">
                                ${p.avgScore}% avg · ${statusLabel}
                            </span>
                        </div>
                        <div style="background: #e5e7eb; border-radius: 8px; height: 8px; overflow: hidden;">
                            <div class="progress-bar" style="background: ${color}; width: ${p.avgScore}%; height: 100%; border-radius: 8px; transition: width 1.5s ease;"></div>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; margin-top: 4px;">
                            <span>📊 ${p.completionRate}% completion</span>
                            <span>📝 ${p.studentCount} submissions</span>
                            <span>👨‍🎓 ${p.totalStudents} enrolled</span>
                            <span>${passEmoji} ${p.passRate}% passing</span>
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
    
    // ─── LOAD TOP STUDENTS ───
    async loadTopStudents() {
        try {
            const container = document.getElementById('topStudentsList');
            if (!container) return;
            
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) return;
            
            const program = this.getCurrentProgram();
            const studentIds = this.assignedStudents.map(s => s.user_id);
            
            if (studentIds.length === 0) {
                container.innerHTML = '<p style="color: #94a3b8; text-align: center; padding: 20px;">No students assigned yet.</p>';
                return;
            }
            
            const { data: marks } = await supabase
                .from('student_marks')
                .select('student_id, student_name, final_score, subject_name')
                .in('student_id', studentIds)
                .eq('program', program)
                .order('final_score', { ascending: false })
                .limit(5);
            
            if (!marks || marks.length === 0) {
                container.innerHTML = '<p style="color: #94a3b8; text-align: center; padding: 20px;">No marks data available yet.</p>';
                return;
            }
            
            const threshold = this.getPassingThreshold();
            
            container.innerHTML = marks.map((m, i) => {
                const medals = ['🥇', '🥈', '🥉'];
                const medalColors = ['#fcd34d', '#d1d5db', '#fca5a5'];
                const bgColors = ['#fef3c7', '#f3f4f6', '#fee2e2'];
                const isTop3 = i < 3;
                const gradeInfo = this.getGrade(m.final_score || 0);
                const isPassing = (m.final_score || 0) >= threshold;
                
                return `
                    <div style="display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
                        <span style="font-size: 20px;">${isTop3 ? medals[i] : (i + 1)}</span>
                        <div style="flex: 1;">
                            <div style="font-weight: 600; font-size: 14px; color: #1e293b;">${m.student_name || 'Unknown'}</div>
                            <div style="font-size: 11px; color: #94a3b8;">${m.subject_name || 'General'} · Grade: ${gradeInfo.grade}</div>
                        </div>
                        <div style="text-align: right;">
                            <span style="font-weight: 700; color: ${isPassing ? '#10b981' : '#ef4444'}; font-size: 18px;">
                                ${m.final_score || 0}%
                            </span>
                            <div style="font-size: 10px; color: ${isPassing ? '#10b981' : '#ef4444'};">
                                ${isPassing ? '✅ Passed' : '❌ Failed'} · ${gradeInfo.remarks}
                            </div>
                        </div>
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
    
    // ─── LOAD ATTENDANCE ALERTS ───
    async loadAttendanceAlerts() {
        try {
            const container = document.getElementById('attendanceAlerts');
            if (!container) return;
            
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) return;
            
            const program = this.getCurrentProgram();
            const studentIds = this.assignedStudents.map(s => s.user_id);
            
            if (studentIds.length === 0) {
                container.innerHTML = '<p style="color: #94a3b8; text-align: center; padding: 20px;">No students assigned yet.</p>';
                return;
            }
            
            const { data: absences } = await supabase
                .from('geo_attendance_logs')
                .select('student_id, student_name, attendance_status, check_in_time')
                .in('student_id', studentIds)
                .eq('program', program)
                .eq('attendance_status', 'Absent')
                .gte('check_in_time', new Date(Date.now() - 7*24*60*60*1000).toISOString());
            
            // Count absences per student
            const absenceCount = {};
            absences?.forEach(a => {
                if (!absenceCount[a.student_id]) {
                    absenceCount[a.student_id] = { name: a.student_name || 'Unknown', count: 0 };
                }
                absenceCount[a.student_id].count++;
            });
            
            const alertStudents = Object.entries(absenceCount)
                .filter(([_, data]) => data.count > 2)
                .sort((a, b) => b[1].count - a[1].count)
                .slice(0, 5);
            
            if (alertStudents.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: #10b981;">
                        <i class="fas fa-check-circle" style="font-size: 24px; display: block; margin-bottom: 8px;"></i>
                        <span style="font-size: 13px;">No attendance alerts! All students have good attendance.</span>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = alertStudents.map(([_, data]) => `
                <div style="display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: #fef2f2; border-radius: 8px; margin-bottom: 6px; border-left: 3px solid #ef4444;">
                    <i class="fas fa-exclamation-triangle" style="color: #ef4444; font-size: 14px;"></i>
                    <span style="flex: 1; font-size: 13px; color: #1e293b; font-weight: 500;">${data.name}</span>
                    <span style="font-size: 12px; color: #ef4444; font-weight: 600; background: #fee2e2; padding: 2px 12px; border-radius: 12px;">
                        ${data.count} absences this week
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
    
    // ─── LOAD INTELLIGENT ALERTS ───
    async loadIntelligentAlerts() {
        try {
            const container = document.getElementById('intelligentAlerts');
            if (!container) return;
            
            const threshold = this.getPassingThreshold();
            const typeLabel = this.isTVET ? 'TVET' : 'Nursing';
            const emoji = this.isTVET ? '🔧' : '🎓';
            
            const alerts = [];
            
            // Check clinical hours
            if (this.clinicalMetrics.critical > 0) {
                alerts.push({
                    type: 'critical',
                    icon: '🚨',
                    message: `${this.clinicalMetrics.critical} students are critically below clinical hours requirement (${this.clinicalMetrics.percent}% completion)`
                });
            }
            
            // Check high risk students
            if (this.riskMetrics.high > 0) {
                alerts.push({
                    type: 'warning',
                    icon: '⚠️',
                    message: `${this.riskMetrics.high} students are at HIGH risk - immediate intervention recommended (${typeLabel} passing: ≥${threshold}%)`
                });
            }
            
            // Check pending attendance
            if (this.metrics.pendingAttendance > 20) {
                alerts.push({
                    type: 'warning',
                    icon: '📌',
                    message: `${this.metrics.pendingAttendance} students have not checked in today - attendance pending`
                });
            }
            
            // Check exams due
            if (this.metrics.examsDue > 0) {
                alerts.push({
                    type: 'info',
                    icon: '📝',
                    message: `${this.metrics.examsDue} exams/CATs are scheduled and awaiting grading`
                });
            }
            
            // Check submissions
            const unitNames = this.assignedUnits.map(u => u.subject_name);
            if (unitNames.length > 0) {
                alerts.push({
                    type: 'success',
                    icon: '✅',
                    message: `${unitNames.length} units assigned - all courses are active (${typeLabel} grading)`
                });
            }
            
            // Check if all is clear
            if (alerts.length === 0) {
                alerts.push({
                    type: 'success',
                    icon: '🎉',
                    message: `${emoji} All systems clear! Your ${typeLabel} dashboard is up to date.`
                });
            }
            
            container.innerHTML = alerts.slice(0, 5).map(a => {
                const classes = {
                    critical: 'alert-critical',
                    warning: 'alert-warning',
                    info: 'alert-info',
                    success: 'alert-success'
                };
                return `
                    <div class="alert-modern ${classes[a.type] || 'alert-info'}" style="padding: 10px 14px; border-radius: 10px; margin-bottom: 6px; display: flex; align-items: center; gap: 12px; border-left: 4px solid transparent;">
                        <span style="font-size: 18px;">${a.icon}</span>
                        <span style="font-size: 13px; color: #1e293b;">${a.message}</span>
                    </div>
                `;
            }).join('');
            
        } catch (error) {
            console.error('Failed to load intelligent alerts:', error);
            const container = document.getElementById('intelligentAlerts');
            if (container) {
                container.innerHTML = '<p style="color: #94a3b8; text-align: center; padding: 20px;">No alerts available</p>';
            }
        }
    },
    
    // ─── LOAD RECENT ACTIVITY ───
    async loadRecentActivity() {
        try {
            const container = document.getElementById('recentActivityList');
            if (!container) return;
            
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) return;
            
            const program = this.getCurrentProgram();
            
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
                    const sessionType = a.session_type || 'class';
                    activities.push({
                        type: 'attendance',
                        icon: 'fa-clipboard-check',
                        color: '#10b981',
                        message: `${a.student_name || 'Student'} checked in for ${sessionType.toLowerCase()}`,
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
                        message: `Exam "${e.exam_name || e.title || 'Untitled'}" was created`,
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
                        message: `Session "${s.session_title || s.title || 'Untitled'}" was scheduled`,
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
    
    // ─── TIME AGO HELPER ───
    timeAgo(date) {
        const now = new Date();
        const diff = Math.floor((now - date) / 1000);
        
        if (diff < 60) return 'Just now';
        if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
        if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
        if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    },
    
    // ─── UPDATE LAST UPDATED ───
    updateLastUpdated() {
        const el = document.getElementById('lastUpdatedTime');
        if (el) {
            const now = new Date();
            el.textContent = `Last updated: ${now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
        }
    },
    
    // ─── START AUTO REFRESH ───
    startAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        this.refreshInterval = setInterval(() => {
            this.refresh();
        }, 30000);
        console.log('🔄 Auto-refresh started (30s interval)');
    },
    
    // ─── CHARTS ───
    async loadCharts() {
        console.log('📊 Loading lecturer charts...');
        
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) return;
            
            const program = this.getCurrentProgram();
            const typeLabel = this.isTVET ? 'TVET' : 'Nursing';
            const emoji = this.isTVET ? '🔧' : '🎓';
            
            // Get students in this program
            const { data: students } = await supabase
                .from('consolidated_user_profiles_table')
                .select('*')
                .eq('role', 'student')
                .eq('program', program);
            
            // ─── 1. GENDER DISTRIBUTION CHART ───
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
                            backgroundColor: this.isTVET ? ['#7c3aed', '#8b5cf6', '#a78bfa'] : ['#4C1D95', '#FDB913', '#94a3b8'],
                            borderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: { padding: 15, font: { size: 12, weight: '500' } }
                            },
                            title: {
                                display: true,
                                text: `${emoji} Gender Distribution - ${program} (${typeLabel})`,
                                font: { size: 14, weight: '700' },
                                padding: { bottom: 10 },
                                color: '#0F172A'
                            }
                        }
                    }
                });
                console.log('✅ Gender distribution chart updated');
            }
            
            // ─── 2. PERFORMANCE CHART ───
            const studentIds = students?.map(s => s.user_id) || [];
            let marksData = [];
            if (studentIds.length > 0) {
                const { data: marks } = await supabase
                    .from('student_marks')
                    .select('*')
                    .in('student_id', studentIds)
                    .eq('program', program);
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
                
                const colors = this.isTVET ? 
                    ['#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'] :
                    ['#4C1D95', '#667eea', '#764ba2', '#8b5cf6', '#FDB913'];
                
                this.chartInstances.performance = new Chart(ctx1, {
                    type: 'bar',
                    data: {
                        labels: subjectNames.length > 0 ? subjectNames : ['No Data'],
                        datasets: [{
                            label: `Average Score (%) - ${typeLabel}`,
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
                                text: `${emoji} Performance by Subject - ${program} (${typeLabel})`,
                                font: { size: 14, weight: '700' },
                                padding: { bottom: 10 },
                                color: '#0F172A'
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                max: 100,
                                title: {
                                    display: true,
                                    text: 'Average Score (%)',
                                    font: { weight: '500' }
                                }
                            }
                        }
                    }
                });
                console.log('✅ Performance chart updated with', subjectNames.length, 'subjects');
            }
            
            // ─── 3. ATTENDANCE TREND CHART ───
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
                            label: `Attendance - ${typeLabel}`,
                            data: attendanceData,
                            borderColor: this.isTVET ? '#8b5cf6' : '#4C1D95',
                            backgroundColor: this.isTVET ? 'rgba(139,92,246,0.1)' : 'rgba(76, 29, 149, 0.1)',
                            fill: true,
                            tension: 0.4,
                            pointBackgroundColor: this.isTVET ? '#8b5cf6' : '#4C1D95',
                            pointBorderColor: this.isTVET ? '#8b5cf6' : '#4C1D95',
                            pointRadius: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            title: {
                                display: true,
                                text: `${emoji} Attendance Trend - ${program} (${typeLabel})`,
                                font: { size: 14, weight: '700' },
                                padding: { bottom: 10 },
                                color: '#0F172A'
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: 'Students Present',
                                    font: { weight: '500' }
                                }
                            }
                        }
                    }
                });
                console.log('✅ Attendance trend chart updated');
            }
            
            console.log(`✅ All charts updated for ${program} (${typeLabel})`);
            
        } catch (error) {
            console.error('❌ Error loading charts:', error);
        }
    },
    
    // ─── SETUP EVENT LISTENERS ───
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
                e.preventDefault();
                this.refresh();
            }
        });
        
        console.log('✅ Event listeners setup complete');
    },
    
    // ─── REFRESH ───
    async refresh() {
        if (this.isRefreshing) return;
        this.isRefreshing = true;
        
        console.log('🔄 Refreshing dashboard...');
        
        try {
            // Refresh program first
            this.getCurrentProgram();
            
            await this.resolveLecturerId();
            await this.loadAssignedUnits();
            await this.loadAssignedStudents();
            await this.loadMetrics();
            await this.loadAttendanceMetrics();
            await this.loadClinicalHours();
            await this.loadRiskData();
            this.updateWelcomeBanner();
            this.loadQuickStats();
            await this.loadCourseProgress();
            await this.loadTopStudents();
            await this.loadAttendanceAlerts();
            await this.loadIntelligentAlerts();
            await this.loadRecentActivity();
            await this.loadCharts();
            this.updateLastUpdated();
            this.updateProgramBadge();
            this.updateDashboardGradingInfo();
            
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Dashboard refreshed successfully!', 'success');
            }
            console.log('✅ Dashboard refreshed');
        } catch (error) {
            console.error('❌ Refresh error:', error);
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Error refreshing dashboard', 'error');
            }
        } finally {
            this.isRefreshing = false;
        }
    },
    
    // ─── DESTROY ───
    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
        
        Object.keys(this.chartInstances).forEach(key => {
            if (this.chartInstances[key]) {
                this.chartInstances[key].destroy();
                this.chartInstances[key] = null;
            }
        });
        
        console.log('🗑️ Dashboard destroyed');
    }
};

// ─── INITIALIZE ───
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => LecturerDashboard.init(), 500);
});

// ─── GLOBAL EXPOSURE ───
window.LecturerDashboard = LecturerDashboard;
window.refreshDashboard = () => LecturerDashboard.refresh();

console.log('✅ LecturerDashboard module loaded - Complete upgraded version');
console.log('📊 Features:');
console.log('   • Metrics & Stats Cards');
console.log('   • Clinical Hours Tracker');
console.log('   • Attendance Deep Dive (Present/Absent/Pending/Location)');
console.log('   • Early Warning System (Risk Monitoring)');
console.log('   • Course Progress with Visual Bars');
console.log('   • Top Students Ranking');
console.log('   • Intelligent Alerts');
console.log('   • Attendance Alerts');
console.log('   • Recent Activity Feed');
console.log('   • Charts (Performance, Distribution, Trend)');
console.log('   • Auto-refresh every 30 seconds');
console.log('   • Keyboard shortcut: Ctrl+R to refresh');
console.log('   • TVET/Nursing Support: ✅ Enabled');
