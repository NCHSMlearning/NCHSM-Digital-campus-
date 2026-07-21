// js/lecturer-dashboard.js
/**
 * NCHSM Lecturer Dashboard Module
 * Uses dedicated lecturer database
 */

const LecturerDashboard = {
    metrics: {
        totalStudents: 0,
        totalCourses: 0,
        atRiskStudents: 0,
        pendingAttendance: 0,
        examsDue: 0,
        unreadMessages: 0
    },
    attendanceMetrics: {
        today: 0,
        week: 0,
        month: 0,
        overall: 0
    },
    
    async init() {
        console.log('📊 Initializing Lecturer Dashboard...');
        try {
            await this.loadMetrics();
            await this.loadAttendanceMetrics();
            this.updateWelcomeBanner();
            console.log('✅ Lecturer Dashboard initialized');
        } catch (error) {
            console.error('❌ Dashboard initialization error:', error);
        }
    },
    
    updateWelcomeBanner() {
        // ✅ Use lecturerDB instead of db
        const profile = window.lecturerDB?.getCurrentUserProfile();
        const welcomeHeader = document.getElementById('welcomeHeader');
        const programSubtitle = document.getElementById('programSubtitle');
        const welcomeBannerText = document.getElementById('welcomeBannerText');
        
        if (welcomeHeader) {
            welcomeHeader.textContent = profile?.full_name || 'Lecturer';
        }
        
        const program = profile?.program || profile?.department || 'KRCHN';
        // ✅ Use LecturerUtils instead of Utils
        const programDisplay = window.LecturerUtils?.getProgramDisplayName(program) || program;
        
        if (programSubtitle) {
            programSubtitle.textContent = `Dashboard filtered for ${programDisplay}`;
        }
        
        if (welcomeBannerText) {
            welcomeBannerText.textContent = 
                `This dashboard is filtered to your program: ${programDisplay}. ` +
                `The card data below highlights urgent tasks requiring your attention.`;
        }
        
        const badge = document.getElementById('userProgramBadge');
        if (badge) {
            badge.textContent = programDisplay;
        }
    },
    
    async loadMetrics() {
        try {
            // ✅ Use lecturerDB instead of db
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const program = profile?.program || profile?.department;
            
            if (!program) {
                console.warn('No program found for lecturer');
                return;
            }
            
            // ✅ Use lecturerDB's built-in getStudents method
            const students = await window.lecturerDB.getStudents(program);
            this.metrics.totalStudents = students.length;
            
            // ✅ Use lecturerDB's built-in getCourses method
            const courses = await window.lecturerDB.getCourses(program);
            this.metrics.totalCourses = courses.length;
            
            // At-risk students
            this.metrics.atRiskStudents = students.filter(s => 
                (s.cumulative_absences || 0) > 5 || (s.status || '').toLowerCase() === 'probation'
            ).length || 0;
            
            // ✅ Use lecturerDB's built-in getExams method
            const exams = await window.lecturerDB.getExams(program);
            this.metrics.examsDue = exams.filter(e => 
                e.status === 'Scheduled' || e.status === 'InProgress'
            ).length || 0;
            
            this.updateMetricCards();
            
            const badge = document.getElementById('studentCountBadge');
            if (badge) {
                badge.textContent = this.metrics.totalStudents;
            }
            
        } catch (error) {
            console.error('Failed to load metrics:', error);
        }
    },
    
    updateMetricCards() {
        const elements = {
            'totalStudentsCount': this.metrics.totalStudents,
            'totalCoursesCount': this.metrics.totalCourses,
            'studentsAtRiskCount': this.metrics.atRiskStudents,
            'examsDueCount': this.metrics.examsDue
        };
        
        Object.keys(elements).forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = elements[id];
            }
        });
    },
    
    async loadAttendanceMetrics() {
        try {
            // ✅ Use lecturerDB instead of db
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const program = profile?.program || profile?.department;
            
            if (!program) return;
            
            const today = new Date();
            
            // ✅ Use lecturerDB's built-in getAttendance method
            const todayLogs = await window.lecturerDB.getAttendance(program, today);
            this.attendanceMetrics.today = todayLogs.filter(l => l.session_type !== 'Lecturer Check-in').length;
            
            // Weekly attendance
            const weekRange = window.LecturerUtils?.getWeekRange() || this.getWeekRange();
            const weekLogs = await window.lecturerDB.getAttendance(program);
            this.attendanceMetrics.week = weekLogs.filter(l => {
                const date = new Date(l.check_in_time);
                return date >= weekRange.start && date <= weekRange.end && l.session_type !== 'Lecturer Check-in';
            }).length;
            
            // Monthly rate
            const monthRange = window.LecturerUtils?.getMonthRange() || this.getMonthRange();
            const monthLogs = await window.lecturerDB.getAttendance(program);
            const uniqueStudents = [...new Set(monthLogs.map(l => l.student_id))];
            const students = await window.lecturerDB.getStudents(program);
            const rate = students.length > 0 ? Math.round((uniqueStudents.length / students.length) * 100) : 0;
            this.attendanceMetrics.month = rate;
            
            // Overall
            const overallLogs = await window.lecturerDB.getAttendance(program);
            this.attendanceMetrics.overall = overallLogs.filter(l => l.session_type !== 'Lecturer Check-in').length;
            
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
    
    getMonthRange() {
        const today = new Date();
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        const end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
        return { start, end };
    },
    
    updateAttendanceMetricsUI() {
        const elements = {
            'todayAttendanceTotal': this.attendanceMetrics.today,
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
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        }
    },
    
    async refresh() {
        await this.loadMetrics();
        await this.loadAttendanceMetrics();
        if (window.LecturerUI) {
            window.LecturerUI.showNotification('Dashboard refreshed!', 'success');
        }
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => LecturerDashboard.init(), 500);
});

window.LecturerDashboard = LecturerDashboard;
