// dashboard.js - FINAL VERSION WITH ALL FIXES
class DashboardModule {
    constructor(supabaseClient) {
        console.log('🚀 Initializing FINAL DashboardModule...');
        this.sb = supabaseClient;
        this.userId = null;
        this.userProfile = null;
        
        // Cache for ALL metrics
        this.cache = {
            attendance: { data: null, lastUpdated: 0, ttl: 60000 },
            courses: { data: null, lastUpdated: 0, ttl: 30000 },
            exams: { data: null, lastUpdated: 0, ttl: 60000 },
            resources: { data: null, lastUpdated: 0, ttl: 30000 },
            nurseiq: { data: null, lastUpdated: 0, ttl: 30000 }
        };
        
        // Dashboard elements
        this.cacheElements();
        
        // Initialize listeners for ALL metrics
        this.setupCompleteListeners();
        this.startLiveClock();
        
        console.log('✅ FINAL DashboardModule initialized');
    }
    
    cacheElements() {
        this.elements = {
            // Attendance
            attendanceRate: document.getElementById('dashboard-attendance-rate'),
            verifiedCount: document.getElementById('dashboard-verified-count'),
            totalCount: document.getElementById('dashboard-total-count'),
            pendingCount: document.getElementById('dashboard-pending-count'),
            
            // Courses
            activeCourses: document.getElementById('dashboard-active-courses'),
            
            // Exams
            upcomingExam: document.getElementById('dashboard-upcoming-exam'),
            
            // Resources
            newResources: document.getElementById('dashboard-new-resources'),
            
            // NurseIQ
            nurseiqProgress: document.getElementById('dashboard-nurseiq-progress'),
            nurseiqAccuracy: document.getElementById('dashboard-nurseiq-accuracy'),
            nurseiqQuestions: document.getElementById('dashboard-nurseiq-questions')
        };
    }
    
    // 🔥 COMPLETE: Listeners for ALL metrics
    setupCompleteListeners() {
        console.log('🔧 Setting up COMPLETE listeners...');
        
        // 1. ATTENDANCE - Support BOTH old and new events
        document.addEventListener('attendanceCheckedIn', (e) => {
            console.log('📊 Attendance check-in detected (legacy event)');
            this.loadAttendanceMetrics();
        });
        
        document.addEventListener('refreshAttendance', () => {
            console.log('🔄 Manual attendance refresh requested');
            this.loadAttendanceMetrics();
        });
        
        document.addEventListener('updateDashboardAttendance', () => {
            console.log('📡 Attendance update requested');
            this.loadAttendanceMetrics();
        });
        
        // 2. COURSES - Support BOTH old and new events
        document.addEventListener('coursesUpdated', (e) => {
            console.log('📚 Courses update detected (legacy event)');
            if (e.detail && e.detail.courses) {
                this.updateCoursesFromEvent(e.detail.courses);
            } else {
                this.loadCourseMetrics();
            }
        });
        
        document.addEventListener('refreshCourses', () => {
            console.log('🔄 Manual courses refresh requested');
            this.loadCourseMetrics();
        });
        
        // 3. EXAMS
        document.addEventListener('examsUpdated', (e) => {
            console.log('📝 Exams update detected');
            this.loadExamMetrics();
        });
        
        document.addEventListener('refreshExams', () => {
            console.log('🔄 Manual exams refresh requested');
            this.loadExamMetrics();
        });
        
        // 4. RESOURCES
        document.addEventListener('resourcesUpdated', (e) => {
            console.log('📁 Resources update detected');
            this.loadResourceMetrics();
        });
        
        document.addEventListener('refreshResources', () => {
            console.log('🔄 Manual resources refresh requested');
            this.loadResourceMetrics();
        });
        
        // 5. NURSEIQ
        document.addEventListener('nurseiqUpdated', (e) => {
            console.log('🧠 NurseIQ update detected');
            this.loadNurseIQMetrics();
        });
        
        document.addEventListener('refreshNurseIQ', () => {
            console.log('🔄 Manual NurseIQ refresh requested');
            this.loadNurseIQMetrics();
        });
        
        // UNIVERSAL REFRESH - Support multiple event names
        document.addEventListener('refreshDashboard', () => {
            console.log('🔄 Universal dashboard refresh requested');
            this.refreshAllMetrics();
        });
        
        document.addEventListener('fastDashboardUpdate', () => {
            console.log('⚡ Fast dashboard update requested');
            this.refreshAllMetrics();
        });
        
        document.addEventListener('dashboardRefresh', () => {
            console.log('📡 Dashboard refresh event');
            this.refreshAllMetrics();
        });
        
        // Refresh button
        const refreshBtn = document.getElementById('refreshDashboardBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshAllMetrics());
        }
        
        // Auto-refresh every 30 seconds
        setInterval(() => {
            if (this.userId) {
                console.log('⏰ Auto-refreshing dashboard...');
                this.refreshAllMetrics();
            }
        }, 30000);
    }
    
    // 🔥 COMPLETE: Initialize with user data
    async initialize(userId, userProfile) {
        this.userId = userId;
        this.userProfile = userProfile;
        
        if (!userId || !userProfile) {
            console.error('❌ Missing user data');
            return false;
        }
        
        // Show loading states
        this.showLoadingStates();
        
        // Load ALL metrics
        await this.refreshAllMetrics();
        
        // Dispatch event that dashboard is ready
        document.dispatchEvent(new CustomEvent('dashboardReady', {
            detail: { userId, timestamp: new Date().toISOString() }
        }));
        
        return true;
    }
    
    // 🔥 COMPLETE: Refresh ALL metrics
    async refreshAllMetrics() {
        console.log('🔄 Refreshing ALL dashboard metrics...');
        
        // Show loading indicator
        this.showLoadingStates();
        
        // Load ALL metrics in parallel
        await Promise.allSettled([
            this.loadAttendanceMetrics(),
            this.loadCourseMetrics(),
            this.loadExamMetrics(),
            this.loadResourceMetrics(),
            this.loadNurseIQMetrics()
        ]);
        
        console.log('✅ ALL metrics refreshed');
        
        // Update timestamp
        this.lastRefreshTime = Date.now();
    }
    
    // 1. ATTENDANCE METRICS
    async loadAttendanceMetrics() {
        console.log('📊 Loading attendance metrics...');
        
        if (!this.userId) {
            console.warn('⚠️ No user ID for attendance');
            return;
        }
        
        try {
            const { data: logs, error } = await this.sb
                .from('geo_attendance_logs')
                .select('is_verified')
                .eq('student_id', this.userId);
            
            if (error) {
                console.error('❌ Attendance query error:', error);
                return;
            }
            
            const totalLogs = logs?.length || 0;
            const verifiedCount = logs?.filter(l => l.is_verified === true).length || 0;
            const pendingCount = logs?.filter(l => !l.is_verified).length || 0;
            const attendanceRate = totalLogs > 0 ? Math.round((verifiedCount / totalLogs) * 100) : 0;
            
            // Update cache
            this.cache.attendance.data = {
                rate: attendanceRate,
                verified: verifiedCount,
                total: totalLogs,
                pending: pendingCount
            };
            this.cache.attendance.lastUpdated = Date.now();
            
            // Update UI
            this.updateAttendanceUI(attendanceRate, verifiedCount, totalLogs, pendingCount);
            
            console.log(`✅ Attendance: ${attendanceRate}% (${verifiedCount}/${totalLogs})`);
            
        } catch (error) {
            console.error('❌ Error loading attendance:', error);
        }
    }
    
    updateAttendanceUI(rate, verified, total, pending) {
        if (this.elements.attendanceRate) {
            this.elements.attendanceRate.textContent = `${rate}%`;
            this.elements.attendanceRate.style.color = 
                rate >= 80 ? '#10B981' : 
                rate >= 60 ? '#F59E0B' : '#EF4444';
        }
        
        if (this.elements.verifiedCount) this.elements.verifiedCount.textContent = verified;
        if (this.elements.totalCount) this.elements.totalCount.textContent = total;
        if (this.elements.pendingCount) this.elements.pendingCount.textContent = pending;
    }
    
    // 2. COURSES METRICS
    async loadCourseMetrics() {
        console.log('📚 Loading course metrics...');
        
        if (!this.userProfile) {
            console.warn('⚠️ No user profile for courses');
            return;
        }
        
        try {
            const { data: courses, error } = await this.sb
                .from('courses')
                .select('id, status')
                .or(`target_program.eq.${this.userProfile.program},target_program.is.null`)
                .eq('intake_year', this.userProfile.intake_year)
                .eq('status', 'Active');
            
            if (error) {
                console.error('❌ Courses query error:', error);
                return;
            }
            
            const activeCount = courses?.length || 0;
            
            // Update cache
            this.cache.courses.data = { activeCount };
            this.cache.courses.lastUpdated = Date.now();
            
            // Update UI
            if (this.elements.activeCourses) {
                this.elements.activeCourses.textContent = activeCount;
            }
            
            console.log(`✅ Courses: ${activeCount} active`);
            
        } catch (error) {
            console.error('❌ Error loading courses:', error);
        }
    }
    
    // Helper for legacy events
    updateCoursesFromEvent(courses) {
        const activeCount = courses.filter(c => 
            c.status === 'Active' || !c.status
        ).length;
        
        if (this.elements.activeCourses) {
            this.elements.activeCourses.textContent = activeCount;
        }
        
        // Update cache
        this.cache.courses.data = { activeCount };
        this.cache.courses.lastUpdated = Date.now();
    }
    
    // 3. EXAMS METRICS
    async loadExamMetrics() {
        console.log('📝 Loading exam metrics...');
        
        if (!this.userProfile) {
            console.warn('⚠️ No user profile for exams');
            return;
        }
        
        try {
            const today = new Date().toISOString().split('T')[0];
            const { data: exams, error } = await this.sb
                .from('exams_with_courses')
                .select('exam_name, exam_date')
                .or(`program_type.eq.${this.userProfile.program},program_type.is.null`)
                .or(`block_term.eq.${this.userProfile.block},block_term.is.null`)
                .eq('intake_year', this.userProfile.intake_year)
                .gte('exam_date', today)
                .order('exam_date', { ascending: true })
                .limit(1);
            
            if (error) {
                console.error('❌ Exams query error:', error);
                return;
            }
            
            let examText = 'None';
            let examColor = '#6B7280';
            
            if (exams && exams.length > 0) {
                const examDate = new Date(exams[0].exam_date);
                const diffDays = Math.ceil((examDate - new Date()) / (1000 * 60 * 60 * 24));
                
                if (diffDays <= 0) {
                    examText = 'Today';
                    examColor = '#EF4444';
                } else if (diffDays <= 7) {
                    examText = `${diffDays}d`;
                    examColor = '#F97316';
                } else {
                    examText = examDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    examColor = '#F97316';
                }
            }
            
            // Update cache
            this.cache.exams.data = { text: examText, color: examColor };
            this.cache.exams.lastUpdated = Date.now();
            
            // Update UI
            if (this.elements.upcomingExam) {
                this.elements.upcomingExam.textContent = examText;
                this.elements.upcomingExam.style.color = examColor;
            }
            
            console.log(`✅ Exams: ${examText}`);
            
        } catch (error) {
            console.error('❌ Error loading exams:', error);
        }
    }
    
    // 4. RESOURCES METRICS
    async loadResourceMetrics() {
        console.log('📁 Loading resource metrics...');
        
        if (!this.userProfile) {
            console.warn('⚠️ No user profile for resources');
            return;
        }
        
        try {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            
            const { data: resources, error } = await this.sb
                .from('resources')
                .select('created_at')
                .eq('target_program', this.userProfile.program)
                .eq('block', this.userProfile.block)
                .eq('intake_year', this.userProfile.intake_year)
                .gte('created_at', oneWeekAgo.toISOString());
            
            if (error) {
                console.error('❌ Resources query error:', error);
                return;
            }
            
            const newCount = resources?.length || 0;
            
            // Update cache
            this.cache.resources.data = { newCount };
            this.cache.resources.lastUpdated = Date.now();
            
            // Update UI
            if (this.elements.newResources) {
                this.elements.newResources.textContent = newCount;
            }
            
            console.log(`✅ Resources: ${newCount} new`);
            
        } catch (error) {
            console.error('❌ Error loading resources:', error);
        }
    }
    
    // 5. NURSEIQ METRICS
    async loadNurseIQMetrics() {
        console.log('🧠 Loading NurseIQ metrics...');
        
        if (!this.userId) {
            console.warn('⚠️ No user ID for NurseIQ');
            return;
        }
        
        try {
            const { data: assessments, error } = await this.sb
                .from('user_assessment_progress')
                .select('is_correct')
                .eq('user_id', this.userId);
            
            if (error) {
                console.error('❌ NurseIQ query error:', error);
                return;
            }
            
            const totalQuestions = assessments?.length || 0;
            const correctAnswers = assessments?.filter(a => a.is_correct === true).length || 0;
            const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
            const targetQuestions = 100;
            const progress = Math.min(Math.round((totalQuestions / targetQuestions) * 100), 100);
            
            // Update cache
            this.cache.nurseiq.data = { progress, accuracy, totalQuestions };
            this.cache.nurseiq.lastUpdated = Date.now();
            
            // Update UI
            if (this.elements.nurseiqProgress) this.elements.nurseiqProgress.textContent = `${progress}%`;
            if (this.elements.nurseiqAccuracy) this.elements.nurseiqAccuracy.textContent = `${accuracy}%`;
            if (this.elements.nurseiqQuestions) this.elements.nurseiqQuestions.textContent = totalQuestions;
            
            console.log(`✅ NurseIQ: ${progress}% progress, ${accuracy}% accuracy`);
            
        } catch (error) {
            console.error('❌ Error loading NurseIQ:', error);
        }
    }
    
    showLoadingStates() {
        // Show loading for ALL metrics
        if (this.elements.attendanceRate) this.elements.attendanceRate.textContent = '...';
        if (this.elements.activeCourses) this.elements.activeCourses.textContent = '...';
        if (this.elements.upcomingExam) this.elements.upcomingExam.textContent = '...';
        if (this.elements.newResources) this.elements.newResources.textContent = '...';
        if (this.elements.nurseiqProgress) this.elements.nurseiqProgress.textContent = '...';
        if (this.elements.nurseiqAccuracy) this.elements.nurseiqAccuracy.textContent = '...';
        if (this.elements.nurseiqQuestions) this.elements.nurseiqQuestions.textContent = '...';
    }
    
    startLiveClock() {
        const currentDateTime = document.getElementById('currentDateTime');
        if (!currentDateTime) return;
        
        const updateTime = () => {
            const now = new Date();
            const options = { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            };
            
            currentDateTime.textContent = now.toLocaleDateString('en-US', options);
        };
        
        updateTime();
        setInterval(updateTime, 60000);
    }
    
    // Helper to refresh specific metric
    refreshMetric(metricName) {
        console.log(`🔄 Refreshing ${metricName}...`);
        
        switch(metricName) {
            case 'attendance':
                this.loadAttendanceMetrics();
                break;
            case 'courses':
                this.loadCourseMetrics();
                break;
            case 'exams':
                this.loadExamMetrics();
                break;
            case 'resources':
                this.loadResourceMetrics();
                break;
            case 'nurseiq':
                this.loadNurseIQMetrics();
                break;
            default:
                this.refreshAllMetrics();
        }
    }
    
    // Update user profile
    updateUserProfile(userProfile) {
        console.log('👤 Updating user profile in dashboard');
        this.userProfile = userProfile;
        
        // Refresh metrics that depend on user profile
        this.loadCourseMetrics();
        this.loadExamMetrics();
        this.loadResourceMetrics();
    }
}

// Create global instance
let dashboardModule = null;

// Initialize dashboard module
function initDashboardModule(supabaseClient) {
    if (!supabaseClient) {
        console.error('❌ No Supabase client provided to dashboard');
        return null;
    }
    
    dashboardModule = new DashboardModule(supabaseClient);
    return dashboardModule;
}

// Global functions for ALL metrics
window.DashboardModule = DashboardModule;
window.initDashboardModule = initDashboardModule;

// Helper functions for other modules
window.refreshDashboard = () => {
    if (dashboardModule) {
        dashboardModule.refreshAllMetrics();
    } else {
        console.warn('⚠️ Dashboard module not initialized');
        document.dispatchEvent(new CustomEvent('refreshDashboard'));
    }
};

window.refreshDashboardMetric = (metric) => {
    if (dashboardModule) {
        dashboardModule.refreshMetric(metric);
    } else {
        console.warn('⚠️ Dashboard module not initialized');
    }
};

window.updateDashboardProfile = (userProfile) => {
    if (dashboardModule) {
        dashboardModule.updateUserProfile(userProfile);
    }
};

// Auto-initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 DOM ready, checking dashboard initialization...');
    
    // Check if dashboard elements exist
    const hasDashboardElements = document.getElementById('dashboard-attendance-rate') || 
                                 document.getElementById('dashboard');
    
    if (hasDashboardElements) {
        console.log('✅ Dashboard elements found');
        
        // Initialize when Supabase is available
        const initDashboard = () => {
            if (window.sb && !dashboardModule) {
                console.log('🎯 Initializing dashboard module...');
                initDashboardModule(window.sb);
                
                // If user data is already available, load it
                if (window.currentUserProfile && window.currentUserId) {
                    console.log('👤 Found existing user data, loading dashboard...');
                    setTimeout(() => {
                        if (dashboardModule) {
                            dashboardModule.initialize(
                                window.currentUserId, 
                                window.currentUserProfile
                            );
                        }
                    }, 1000);
                }
            }
        };
        
        // Try immediately
        initDashboard();
        
        // Also try after delays
        setTimeout(initDashboard, 2000);
        setTimeout(initDashboard, 5000);
    }
});

console.log('✅ FINAL Dashboard module loaded - Ready for all metrics!');
