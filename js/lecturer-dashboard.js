// js/lecturer-dashboard.js
/**
 * NCHSM Lecturer Dashboard Module
 * Uses dedicated lecturer database with correct ID resolution
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
    chartInstances: {
        performance: null,
        distribution: null,
        trend: null,
        programBreakdown: null
    },
    lecturerAssignmentId: null,
    
    async init() {
        console.log('📊 Initializing Lecturer Dashboard...');
        try {
            await this.resolveLecturerId();
            await this.loadMetrics();
            await this.loadAttendanceMetrics();
            this.updateWelcomeBanner();
            await this.loadCharts();
            console.log('✅ Lecturer Dashboard initialized');
        } catch (error) {
            console.error('❌ Dashboard initialization error:', error);
        }
    },
    
    // ============================================
    // RESOLVE LECTURER ID - SAME AS OTHER MODULES
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
            
            // Get ALL lecturers with similar names
            const nameParts = fullName.toLowerCase().split(' ');
            const { data: allLecturers, error: allError } = await supabase
                .from('lecturer_subject_assignments')
                .select('lecturer_id, lecturer_name')
                .order('created_at', { ascending: false });
            
            if (!allError && allLecturers && allLecturers.length > 0) {
                let bestMatch = null;
                let bestScore = -1;
                
                for (const lecturer of allLecturers) {
                    const lecturerName = lecturer.lecturer_name || '';
                    const lecturerId = lecturer.lecturer_id;
                    let score = 0;
                    
                    const lecturerNameLower = lecturerName.toLowerCase();
                    for (const part of nameParts) {
                        if (part.length > 1 && lecturerNameLower.includes(part)) {
                            score += 5;
                        }
                    }
                    
                    if (lecturerNameLower === fullName.toLowerCase()) {
                        score += 20;
                    }
                    
                    // BIG BONUS for non-STAFF IDs
                    if (!lecturerId.toString().startsWith('STAFF')) {
                        score += 50;
                    }
                    
                    if (lecturerId.toString().includes('-')) {
                        score += 30;
                    }
                    
                    if (score > bestScore) {
                        bestScore = score;
                        bestMatch = lecturerId;
                    }
                }
                
                if (bestMatch) {
                    this.lecturerAssignmentId = bestMatch;
                    console.log('✅ Dashboard using lecturer ID:', this.lecturerAssignmentId);
                    return;
                }
            }
            
            this.lecturerAssignmentId = authId;
            console.log('⚠️ Dashboard falling back to auth ID:', this.lecturerAssignmentId);
            
        } catch (error) {
            console.error('Error resolving lecturer ID:', error);
            this.lecturerAssignmentId = null;
        }
    },
    
    updateWelcomeBanner() {
        const profile = window.lecturerDB?.getCurrentUserProfile();
        const welcomeHeader = document.getElementById('welcomeHeader');
        const programSubtitle = document.getElementById('programSubtitle');
        const welcomeBannerText = document.getElementById('welcomeBannerText');
        
        if (welcomeHeader) {
            welcomeHeader.textContent = profile?.full_name || 'Lecturer';
        }
        
        const program = profile?.program || profile?.department || 'KRCHN';
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
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const program = profile?.program || profile?.department;
            
            if (!program) {
                console.warn('No program found for lecturer');
                return;
            }
            
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) {
                console.warn('Supabase not available');
                return;
            }
            
            // Get students in this program
            const { data: students } = await supabase
                .from('consolidated_user_profiles_table')
                .select('*')
                .eq('role', 'student')
                .eq('program', program);
            
            this.metrics.totalStudents = students?.length || 0;
            
            // Get courses assigned to this lecturer using the resolved ID
            const lecturerId = this.lecturerAssignmentId || profile.user_id;
            const { data: assignments } = await supabase
                .from('lecturer_subject_assignments')
                .select('*')
                .eq('lecturer_id', lecturerId);
            
            this.metrics.totalCourses = assignments?.length || 0;
            
            // At risk students (simplified)
            this.metrics.atRiskStudents = students?.filter(s => 
                (s.cumulative_absences || 0) > 5 || (s.status || '').toLowerCase() === 'probation'
            ).length || 0;
            
            // Exams due
            const { data: exams } = await supabase
                .from('cats_exams')
                .select('*')
                .eq('program', program)
                .eq('status', 'Scheduled');
            
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
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const program = profile?.program || profile?.department;
            
            if (!program) return;
            
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
            const weekRange = window.LecturerUtils?.getWeekRange() || this.getWeekRange();
            const { data: weekLogs } = await supabase
                .from('geo_attendance_logs')
                .select('*')
                .eq('program', program);
            
            this.attendanceMetrics.week = weekLogs?.filter(l => {
                const date = new Date(l.check_in_time);
                return date >= weekRange.start && date <= weekRange.end;
            }).length || 0;
            
            // Monthly rate
            const monthRange = window.LecturerUtils?.getMonthRange() || this.getMonthRange();
            const { data: monthLogs } = await supabase
                .from('geo_attendance_logs')
                .select('student_id')
                .eq('program', program);
            
            const uniqueStudents = [...new Set(monthLogs?.map(l => l.student_id) || [])];
            const { data: allStudents } = await supabase
                .from('consolidated_user_profiles_table')
                .select('user_id')
                .eq('role', 'student')
                .eq('program', program);
            
            const totalStudents = allStudents?.length || 1;
            this.attendanceMetrics.month = Math.round((uniqueStudents.length / totalStudents) * 100);
            
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
    
    // ============================================================
    // CHARTS - FIXED WITH CORRECT DATA
    // ============================================================
    
    async loadCharts() {
        console.log('📊 Loading lecturer charts...');
        
        try {
            const profile = window.lecturerDB?.getCurrentUserProfile();
            if (!profile) {
                console.log('❌ No lecturer profile found');
                return;
            }
            
            const program = profile.program || profile.department || 'KRCHN';
            const supabase = window.lecturerDB?.supabase;
            
            if (!supabase) {
                console.log('❌ Supabase not available');
                return;
            }
            
            // Get students in this program
            const { data: students } = await supabase
                .from('consolidated_user_profiles_table')
                .select('*')
                .eq('role', 'student')
                .eq('program', program);
            
            console.log('👨‍🎓 Students in', program, ':', students?.length || 0);
            
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
                                labels: { padding: 15, font: { size: 13 } }
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
            // 2. PERFORMANCE CHART (By Subject/Unit)
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
            
            console.log('📚 Subjects:', subjectNames);
            console.log('📊 Averages:', subjectAverages);
            
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
                
                // Get actual attendance data for the week
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
            
            // ============================================
            // 4. PROGRAM BREAKDOWN CHART
            // ============================================
            const ctx4 = document.getElementById('programBreakdownChart');
            if (ctx4) {
                const { data: allStudents } = await supabase
                    .from('consolidated_user_profiles_table')
                    .select('program')
                    .eq('role', 'student');
                
                const programCounts = {};
                allStudents?.forEach(s => {
                    const p = s.program || 'Unknown';
                    programCounts[p] = (programCounts[p] || 0) + 1;
                });
                
                const programNames = Object.keys(programCounts);
                const programValues = programNames.map(p => programCounts[p]);
                
                if (this.chartInstances.programBreakdown) {
                    this.chartInstances.programBreakdown.destroy();
                }
                this.chartInstances.programBreakdown = new Chart(ctx4, {
                    type: 'bar',
                    data: {
                        labels: programNames,
                        datasets: [{
                            label: 'Students',
                            data: programValues,
                            backgroundColor: ['#4C1D95', '#FDB913', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6'],
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
                                text: 'Students by Program',
                                font: { size: 14, weight: '600' }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: 'Number of Students'
                                }
                            }
                        }
                    }
                });
                console.log('✅ Program breakdown chart updated');
            }
            
            console.log('✅ All charts updated for', program);
            
        } catch (error) {
            console.error('❌ Error loading charts:', error);
        }
    },
    
    async refresh() {
        await this.resolveLecturerId();
        await this.loadMetrics();
        await this.loadAttendanceMetrics();
        await this.loadCharts();
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

console.log('✅ LecturerDashboard module loaded - Uses correct ID resolution');
