// js/lecturer-dashboard.js
/**
 * NCHSM Lecturer Dashboard Module
 * Handles dashboard metrics, cards, and overview
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
        const profile = window.db?.getUserProfile();
        const welcomeHeader = document.getElementById('welcomeHeader');
        const programSubtitle = document.getElementById('programSubtitle');
        const welcomeBannerText = document.getElementById('welcomeBannerText');
        
        if (welcomeHeader) {
            welcomeHeader.textContent = profile?.full_name || 'Lecturer';
        }
        
        const program = profile?.program || profile?.department || 'KRCHN';
        const programDisplay = Utils.getProgramDisplayName(program);
        
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
            const profile = window.db?.getUserProfile();
            const program = profile?.program || profile?.department;
            
            // Get students
            const { data: students } = await window.db.supabase
                .from('consolidated_user_profiles_table')
                .select('*')
                .eq('role', 'student')
                .eq('program', program);
            
            this.metrics.totalStudents = students?.length || 0;
            
            // Get courses
            const { data: courses } = await window.db.supabase
                .from('courses')
                .select('*')
                .eq('target_program', program)
                .eq('status', 'Active');
            
            this.metrics.totalCourses = courses?.length || 0;
            
            // At-risk students
            this.metrics.atRiskStudents = students?.filter(s => 
                (s.cumulative_absences || 0) > 5 || (s.status || '').toLowerCase() === 'probation'
            ).length || 0;
            
            // Exams due
            const { data: exams } = await window.db.supabase
                .from('exams')
                .select('*')
                .eq('target_program', program)
                .in('status', ['Scheduled', 'InProgress']);
            
            this.metrics.examsDue = exams?.length || 0;
            
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
            const profile = window.db?.getUserProfile();
            const program = profile?.program || profile?.department;
            const today = new Date().toISOString().split('T')[0];
            
            // Today
            const { data: todayData } = await window.db.supabase
                .from('geo_attendance_logs')
                .select('*')
                .gte('check_in_time', `${today}T00:00:00.000Z`)
                .lte('check_in_time', `${today}T23:59:59.999Z`)
                .eq('program', program);
            
            this.attendanceMetrics.today = todayData?.length || 0;
            
            // Week
            const weekRange = Utils.getWeekRange();
            const { data: weekData } = await window.db.supabase
                .from('geo_attendance_logs')
                .select('*')
                .gte('check_in_time', weekRange.start.toISOString())
                .lte('check_in_time', weekRange.end.toISOString())
                .eq('program', program);
            
            this.attendanceMetrics.week = weekData?.length || 0;
            
            // Month rate
            const monthRange = Utils.getMonthRange();
            const { data: monthData } = await window.db.supabase
                .from('geo_attendance_logs')
                .select('student_id')
                .gte('check_in_time', monthRange.start.toISOString())
                .lte('check_in_time', monthRange.end.toISOString())
                .eq('program', program);
            
            const uniqueStudents = [...new Set(monthData?.map(l => l.student_id) || [])];
            const students = await this.getStudents(program);
            const rate = students.length > 0 ? Math.round((uniqueStudents.length / students.length) * 100) : 0;
            this.attendanceMetrics.month = rate;
            
            // Overall
            const { data: overallData } = await window.db.supabase
                .from('geo_attendance_logs')
                .select('*')
                .eq('program', program);
            
            this.attendanceMetrics.overall = overallData?.length || 0;
            
            this.updateAttendanceMetricsUI();
            
        } catch (error) {
            console.error('Failed to load attendance metrics:', error);
        }
    },
    
    async getStudents(program) {
        const { data } = await window.db.supabase
            .from('consolidated_user_profiles_table')
            .select('*')
            .eq('role', 'student')
            .eq('program', program);
        return data || [];
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
        LecturerUI.showNotification('Dashboard refreshed!', 'success');
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => LecturerDashboard.init(), 500);
});

window.LecturerDashboard = LecturerDashboard;
