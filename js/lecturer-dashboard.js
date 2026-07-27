// js/lecturer-dashboard.js - COMPLETE FIXED VERSION with Student Data
/**
 * NCHSM Lecturer Dashboard Module
 * Uses dedicated lecturer database with correct ID resolution
 * Includes assigned students data
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
    lecturerUuid: null,
    assignedUnits: [],
    assignedStudents: [],
    
    async init() {
        console.log('📊 Initializing Lecturer Dashboard...');
        try {
            await this.resolveLecturerId();
            await this.loadAssignedUnits();
            await this.loadAssignedStudents();
            await this.loadMetrics();
            await this.loadAttendanceMetrics();
            this.updateWelcomeBanner();
            await this.loadCharts();
            this.setupEventListeners();
            console.log('✅ Lecturer Dashboard initialized');
            console.log(`📚 ${this.assignedUnits.length} assigned units`);
            console.log(`👨‍🎓 ${this.assignedStudents.length} assigned students`);
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
            
            this.lecturerUuid = authId;
            
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
            
            // Get ALL assignments for this lecturer by name
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
            
            console.log(`📚 Loaded ${this.assignedUnits.length} assigned units:`, 
                this.assignedUnits.map(u => u.subject_name));
            
        } catch (error) {
            console.error('Failed to load assigned units:', error);
            this.assignedUnits = [];
        }
    },
    
    // ============================================
    // LOAD ASSIGNED STUDENTS - NEW
    // ============================================
    async loadAssignedStudents() {
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) return;
            
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const program = profile?.program || profile?.department || 'KRCHN';
            
            // Get unit names from assigned units
            const unitNames = this.assignedUnits.map(u => u.subject_name);
            
            if (unitNames.length === 0) {
                console.log('No assigned units, skipping student load');
                this.assignedStudents = [];
                return;
            }
            
            console.log(`🔍 Loading students for units:`, unitNames);
            
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
            
            // Get unique student IDs
            const studentIds = [...new Set(enrollments?.map(e => e.student_id) || [])];
            
            if (studentIds.length === 0) {
                console.log('No students enrolled in assigned units');
                this.assignedStudents = [];
                return;
            }
            
            // Get student profiles
            const { data: students, error: studentError } = await supabase
                .from('consolidated_user_profiles_table')
                .select('user_id, student_id, full_name, program, block, intake_year, email, phone')
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
            console.log('👨‍🎓 Students:', this.assignedStudents.map(s => `${s.full_name} (${s.student_id})`));
            
        } catch (error) {
            console.error('Failed to load assigned students:', error);
            this.assignedStudents = [];
        }
    },
    
    // ============================================
    // UPDATE WELCOME BANNER
    // ============================================
    updateWelcomeBanner() {
        const profile = window.lecturerDB?.getCurrentUserProfile();
        const welcomeHeader = document.getElementById('welcomeHeader');
        const programSubtitle = document.getElementById('programSubtitle');
        const welcomeBannerText = document.getElementById('welcomeBannerText');
        const currentDateTime = document.getElementById('currentDateTime');
        const studentCountDisplay = document.getElementById('studentCountDisplay');
        const unitCountDisplay = document.getElementById('unitCountDisplay');
        
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
                `You have ${this.assignedUnits.length} assigned units and ${this.assignedStudents.length} students.`;
        }
        
        const badge = document.getElementById('userProgramBadge');
        if (badge) {
            badge.textContent = programDisplay;
        }
        
        // Update student and unit count in header
        if (studentCountDisplay) {
            studentCountDisplay.textContent = this.assignedStudents.length || 0;
        }
        if (unitCountDisplay) {
            unitCountDisplay.textContent = this.assignedUnits.length || 0;
        }
        
        // Update date/time
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
    // LOAD METRICS - FIXED WITH STUDENT DATA
    // ============================================
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
            
            // Get students in this program (all students, not just assigned)
            const { data: allStudents, error: studentError } = await supabase
                .from('consolidated_user_profiles_table')
                .select('*')
                .eq('role', 'student')
                .eq('program', program);
            
            if (studentError) {
                console.error('Error loading students:', studentError);
                return;
            }
            
            // Update metrics with student data
            this.metrics.totalStudents = this.assignedStudents.length || allStudents?.length || 0;
            
            // Get courses assigned to this lecturer
            const lecturerId = this.lecturerAssignmentId || profile.user_id;
            const { data: assignments, error: assignError } = await supabase
                .from('lecturer_subject_assignments')
                .select('*')
                .eq('lecturer_id', String(lecturerId));
            
            if (assignError) {
                console.error('Error loading assignments:', assignError);
                return;
            }
            
            this.metrics.totalCourses = assignments?.length || this.assignedUnits.length || 0;
            
            // At risk students (based on attendance or marks)
            const atRisk = this.assignedStudents.filter(s => {
                // Check if student has low attendance or marks
                return (s.absences || 0) > 5 || (s.cumulative_absences || 0) > 5;
            });
            this.metrics.atRiskStudents = atRisk.length || 0;
            
            // Exams due
            const { data: exams, error: examError } = await supabase
                .from('cats_exams')
                .select('*')
                .eq('program', program)
                .eq('status', 'Scheduled');
            
            if (examError) {
                console.error('Error loading exams:', examError);
                return;
            }
            
            this.metrics.examsDue = exams?.length || 0;
            
            // Pending attendance (students who haven't checked in today)
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
            const lecturerId2 = this.lecturerUuid || profile.user_id;
            const { data: messages } = await supabase
                .from('messages')
                .select('id')
                .eq('receiver_id', lecturerId2)
                .eq('is_read', false);
            
            this.metrics.unreadMessages = messages?.length || 0;
            
            this.updateMetricCards();
            
            // Update badges
            const badge = document.getElementById('studentCountBadge');
            if (badge) {
                badge.textContent = this.metrics.totalStudents;
            }
            
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
            'examsDueCount': this.metrics.examsDue,
            'pendingAttendanceCount': this.metrics.pendingAttendance,
            'unreadMessagesCount': this.metrics.unreadMessages
        };
        
        Object.keys(elements).forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = elements[id];
            }
        });
        
        // Update the assigned students count in header
        const studentDisplay = document.getElementById('assignedStudentCount');
        if (studentDisplay) {
            studentDisplay.textContent = this.metrics.totalStudents;
        }
    },
    
    // ============================================
    // LOAD ATTENDANCE METRICS
    // ============================================
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
    
    // ============================================
    // CHARTS - FIXED WITH STUDENT DATA
    // ============================================
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
    
    // ============================================
    // SETUP EVENT LISTENERS
    // ============================================
    setupEventListeners() {
        // Refresh button
        const refreshBtn = document.querySelector('[data-action="refresh-dashboard"]') || 
                          document.getElementById('refreshDashboardBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refresh());
        }
    },
    
    // ============================================
    // REFRESH
    // ============================================
    async refresh() {
        console.log('🔄 Refreshing dashboard...');
        await this.resolveLecturerId();
        await this.loadAssignedUnits();
        await this.loadAssignedStudents();
        await this.loadMetrics();
        await this.loadAttendanceMetrics();
        await this.loadCharts();
        this.updateWelcomeBanner();
        if (window.LecturerUI) {
            window.LecturerUI.showNotification('Dashboard refreshed!', 'success');
        }
        console.log('✅ Dashboard refreshed');
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

console.log('✅ LecturerDashboard module loaded - Uses correct ID resolution');
console.log('✅ Includes assigned units and students data');
