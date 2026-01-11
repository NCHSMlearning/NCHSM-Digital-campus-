// dashboard.js - FIXED VERSION (WITH PENDING UPDATES)
class DashboardModule {
    constructor(supabaseClient) {
        console.log('🚀 Initializing FIXED DashboardModule...');
        this.sb = supabaseClient;
        this.userId = null;
        this.userProfile = null;
        
        // 🔥 FIXED CACHE with pending updates
        this.attendanceCache = {
            data: null,
            lastUpdated: 0,
            ttl: 60000,
            pendingUpdates: 0 // 🔥 NEW: Track optimistic updates
        };
        
        this.coursesCache = { data: null, lastUpdated: 0, ttl: 30000 };
        this.examsCache = { data: null, lastUpdated: 0, ttl: 60000 };
        this.resourcesCache = { data: null, lastUpdated: 0, ttl: 30000 };
        
        // Dashboard elements
        this.cacheElements();
        
        // Initialize with FIXED listeners
        this.setupFixedListeners();
        this.startLiveClock();
        
        console.log('✅ FIXED DashboardModule initialized');
    }
    
    cacheElements() {
        this.elements = {
            attendanceRate: document.getElementById('dashboard-attendance-rate'),
            verifiedCount: document.getElementById('dashboard-verified-count'),
            totalCount: document.getElementById('dashboard-total-count'),
            pendingCount: document.getElementById('dashboard-pending-count'),
            upcomingExam: document.getElementById('dashboard-upcoming-exam'),
            activeCourses: document.getElementById('dashboard-active-courses'),
            newResources: document.getElementById('dashboard-new-resources'),
            nurseiqProgress: document.getElementById('dashboard-nurseiq-progress'),
            nurseiqAccuracy: document.getElementById('dashboard-nurseiq-accuracy'),
            nurseiqQuestions: document.getElementById('dashboard-nurseiq-questions')
        };
    }
    
    // 🔥 FIXED: Better event handling
    setupFixedListeners() {
        console.log('🔧 Setting up FIXED listeners...');
        
        // ATTENDANCE: Handle with pending updates
        document.addEventListener('attendanceCheckedIn', (e) => {
            console.log('🎯 Attendance check-in event received:', e.detail);
            
            // 🔥 CRITICAL FIX: Increment pending updates
            this.attendanceCache.pendingUpdates = (this.attendanceCache.pendingUpdates || 0) + 1;
            
            // Update UI INSTANTLY with pending consideration
            this.updateAttendanceUIWithPending();
            
            // Refresh data but respect pending updates
            setTimeout(() => this.loadAttendanceMetricsWithPending(), 500);
        });
        
        // COURSES: Direct update
        document.addEventListener('coursesUpdated', (e) => {
            console.log('📚 Courses updated event');
            if (e.detail?.courses) {
                this.updateCoursesUIFromEvent(e.detail);
            }
        });
        
        // Refresh button
        const refreshBtn = document.getElementById('refreshDashboardBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshDashboard());
        }
    }
    
    // 🔥 NEW: Update UI considering pending check-ins
    updateAttendanceUIWithPending() {
        if (!this.attendanceCache.data) return;
        
        const baseData = this.attendanceCache.data;
        const pendingUpdates = this.attendanceCache.pendingUpdates || 0;
        
        // Calculate new values with pending updates
        const newVerified = baseData.verified + pendingUpdates; // Assuming all pending become verified
        const newTotal = baseData.total + pendingUpdates;
        const newRate = newTotal > 0 ? Math.round((newVerified / newTotal) * 100) : 0;
        const newPending = baseData.pending; // Keep pending count (these are old pending, not new check-ins)
        
        console.log(`📊 UI Update with ${pendingUpdates} pending:`, {
            base: `${baseData.rate}% (${baseData.verified}/${baseData.total})`,
            withPending: `${newRate}% (${newVerified}/${newTotal})`
        });
        
        // Update UI
        this.updateAttendanceUI(newRate, newVerified, newTotal, newPending);
    }
    
    // 🔥 FIXED: Load attendance with pending consideration
    async loadAttendanceMetricsWithPending() {
        if (!this.userId) return;
        
        try {
            // Fetch fresh data
            const { data: logs, error } = await this.sb
                .from('geo_attendance_logs')
                .select('is_verified')
                .eq('student_id', this.userId);
            
            if (error) throw error;
            
            // Process data
            const totalLogs = logs?.length || 0;
            const verifiedCount = logs?.filter(l => l.is_verified === true).length || 0;
            const pendingCount = logs?.filter(l => !l.is_verified).length || 0;
            const attendanceRate = totalLogs > 0 ? Math.round((verifiedCount / totalLogs) * 100) : 0;
            
            // 🔥 CRITICAL: Reset pending updates when we get fresh data
            this.attendanceCache.pendingUpdates = 0;
            
            // Update cache
            this.attendanceCache.data = {
                rate: attendanceRate,
                verified: verifiedCount,
                total: totalLogs,
                pending: pendingCount
            };
            this.attendanceCache.lastUpdated = Date.now();
            
            // Update UI with REAL data
            this.updateAttendanceUI(attendanceRate, verifiedCount, totalLogs, pendingCount);
            
            console.log(`✅ Attendance data refreshed: ${attendanceRate}%`);
            
        } catch (error) {
            console.error('❌ Error loading attendance:', error);
        }
    }
    
    // 🔥 ULTRA-FAST: Initialize with user data
    async initialize(userId, userProfile) {
        this.userId = userId;
        this.userProfile = userProfile;
        
        if (!userId || !userProfile) {
            console.error('❌ Missing user data');
            return false;
        }
        
        // Show loading states
        this.showLoadingStates();
        
        // Load ALL metrics IN PARALLEL for fastest load
        await this.loadDashboardFast();
        
        return true;
    }
    
    // 🔥 ULTRA-FAST: Load dashboard (parallel loading)
    async loadDashboardFast() {
        console.log('⚡ Loading dashboard FAST...');
        
        try {
            // Load ALL metrics in parallel (no waiting)
            const promises = [
                this.loadAttendanceMetricsWithPending(), // 🔥 Use fixed version
                this.loadCourseMetricsFast(),
                this.loadExamMetricsFast(),
                this.loadResourceMetricsFast(),
                this.loadNurseIQMetricsFast()
            ];
            
            // Don't wait for all to complete - update as they come
            promises.forEach(p => p.catch(e => console.warn('Background load failed:', e)));
            
            console.log('⚡ Dashboard loading started (non-blocking)');
            
        } catch (error) {
            console.error('❌ Error loading dashboard:', error);
        }
    }
    
    // 🔥 INSTANT: Update UI immediately
    updateAttendanceUI(rate, verified, total, pending) {
        // Update ALL elements in one synchronous operation
        if (this.elements.attendanceRate) {
            this.elements.attendanceRate.textContent = `${rate}%`;
            this.elements.attendanceRate.style.color = 
                rate >= 80 ? '#10B981' : rate >= 60 ? '#F59E0B' : '#EF4444';
        }
        
        if (this.elements.verifiedCount) this.elements.verifiedCount.textContent = verified;
        if (this.elements.totalCount) this.elements.totalCount.textContent = total;
        if (this.elements.pendingCount) this.elements.pendingCount.textContent = pending;
        
        console.log(`⚡ Attendance UI updated: ${rate}% (${verified}/${total})`);
    }
    
    // 🔥 ULTRA-FAST: Course metrics
    async loadCourseMetricsFast() {
        // Check cache
        if (this.coursesCache.data && 
            Date.now() - this.coursesCache.lastUpdated < this.coursesCache.ttl) {
            this.updateCoursesUIFromCache();
            return;
        }
        
        try {
            if (!this.userProfile) return;
            
            const { data: courses, error } = await this.sb
                .from('courses')
                .select('id, status')
                .or(`target_program.eq.${this.userProfile?.program},target_program.is.null`)
                .eq('intake_year', this.userProfile?.intake_year)
                .eq('status', 'Active');
            
            if (error) throw error;
            
            const activeCount = courses?.length || 0;
            
            // Update cache
            this.coursesCache.data = { activeCount };
            this.coursesCache.lastUpdated = Date.now();
            
            // Update UI
            if (this.elements.activeCourses) {
                this.elements.activeCourses.textContent = activeCount;
            }
            
        } catch (error) {
            console.error('❌ Fast course load error:', error);
        }
    }
    
    // 🔥 INSTANT: Update courses from event data
    updateCoursesUIFromEvent(eventData) {
        if (eventData.courses) {
            const activeCount = eventData.courses.filter(c => 
                c.status === 'Active' || !c.status
            ).length;
            
            if (this.elements.activeCourses) {
                this.elements.activeCourses.textContent = activeCount;
            }
            
            // Update cache
            this.coursesCache.data = { activeCount };
            this.coursesCache.lastUpdated = Date.now();
        }
    }
    
    updateCoursesUIFromCache() {
        if (this.coursesCache.data && this.elements.activeCourses) {
            this.elements.activeCourses.textContent = this.coursesCache.data.activeCount;
        }
    }
    
    // 🔥 ULTRA-FAST: Exam metrics
    async loadExamMetricsFast() {
        if (this.examsCache.data && 
            Date.now() - this.examsCache.lastUpdated < this.examsCache.ttl) {
            this.updateExamsUIFromCache();
            return;
        }
        
        try {
            if (!this.userProfile) return;
            
            const today = new Date().toISOString().split('T')[0];
            
            const { data: exams, error } = await this.sb
                .from('exams_with_courses')
                .select('exam_name, exam_date')
                .or(`program_type.eq.${this.userProfile?.program},program_type.is.null`)
                .or(`block_term.eq.${this.userProfile?.block},block_term.is.null`)
                .eq('intake_year', this.userProfile?.intake_year)
                .gte('exam_date', today)
                .order('exam_date', { ascending: true })
                .limit(1);
            
            if (error) throw error;
            
            let examText = 'None';
            let examColor = '#6B7280';
            
            if (exams && exams.length > 0) {
                const examDate = new Date(exams[0].exam_date);
                const today = new Date();
                const diffDays = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));
                
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
            this.examsCache.data = { text: examText, color: examColor };
            this.examsCache.lastUpdated = Date.now();
            
            // Update UI
            if (this.elements.upcomingExam) {
                this.elements.upcomingExam.textContent = examText;
                this.elements.upcomingExam.style.color = examColor;
            }
            
        } catch (error) {
            console.error('❌ Fast exam load error:', error);
        }
    }
    
    updateExamsUIFromCache() {
        if (this.examsCache.data && this.elements.upcomingExam) {
            this.elements.upcomingExam.textContent = this.examsCache.data.text;
            this.elements.upcomingExam.style.color = this.examsCache.data.color;
        }
    }
    
    // 🔥 ULTRA-FAST: Resource metrics
    async loadResourceMetricsFast() {
        if (this.resourcesCache.data && 
            Date.now() - this.resourcesCache.lastUpdated < this.resourcesCache.ttl) {
            this.updateResourcesUIFromCache();
            return;
        }
        
        try {
            if (!this.userProfile) return;
            
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            
            const { data: resources, error } = await this.sb
                .from('resources')
                .select('created_at')
                .eq('target_program', this.userProfile?.program)
                .eq('block', this.userProfile?.block)
                .eq('intake_year', this.userProfile?.intake_year)
                .gte('created_at', oneWeekAgo.toISOString());
            
            if (error) throw error;
            
            const newCount = resources?.length || 0;
            
            // Update cache
            this.resourcesCache.data = { newCount };
            this.resourcesCache.lastUpdated = Date.now();
            
            // Update UI
            if (this.elements.newResources) {
                this.elements.newResources.textContent = newCount;
            }
            
        } catch (error) {
            console.error('❌ Fast resource load error:', error);
        }
    }
    
    updateResourcesUIFromCache() {
        if (this.resourcesCache.data && this.elements.newResources) {
            this.elements.newResources.textContent = this.resourcesCache.data.newCount;
        }
    }
    
    // 🔥 FAST: NurseIQ metrics
    async loadNurseIQMetricsFast() {
        if (!this.userId) return;
        
        try {
            const { data: assessments, error } = await this.sb
                .from('user_assessment_progress')
                .select('is_correct')
                .eq('user_id', this.userId);
            
            if (error) throw error;
            
            const totalQuestions = assessments?.length || 0;
            const correctAnswers = assessments?.filter(a => a.is_correct === true).length || 0;
            const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
            const targetQuestions = 100;
            const progress = Math.min(Math.round((totalQuestions / targetQuestions) * 100), 100);
            
            // Update UI
            if (this.elements.nurseiqProgress) this.elements.nurseiqProgress.textContent = `${progress}%`;
            if (this.elements.nurseiqAccuracy) this.elements.nurseiqAccuracy.textContent = `${accuracy}%`;
            if (this.elements.nurseiqQuestions) this.elements.nurseiqQuestions.textContent = totalQuestions;
            
        } catch (error) {
            console.error('❌ Fast NurseIQ load error:', error);
        }
    }
    
    // 🔥 ULTRA-FAST: Refresh dashboard
    refreshDashboard() {
        console.log('🔄 Dashboard refresh');
        
        // Clear pending updates
        this.attendanceCache.pendingUpdates = 0;
        
        // Clear all caches for fresh data
        this.attendanceCache.lastUpdated = 0;
        this.coursesCache.lastUpdated = 0;
        this.examsCache.lastUpdated = 0;
        this.resourcesCache.lastUpdated = 0;
        
        // Show loading states briefly
        if (this.elements.attendanceRate) {
            const originalText = this.elements.attendanceRate.textContent;
            this.elements.attendanceRate.textContent = '...';
            setTimeout(() => {
                this.elements.attendanceRate.textContent = originalText;
            }, 300);
        }
        
        // Load all metrics in background
        setTimeout(() => {
            this.loadAttendanceMetricsWithPending();
            this.loadCourseMetricsFast();
            this.loadExamMetricsFast();
            this.loadResourceMetricsFast();
            this.loadNurseIQMetricsFast();
        }, 100);
        
        // Show toast if available
        if (window.AppUtils?.showToast) {
            window.AppUtils.showToast('Dashboard refreshed!', 'success');
        }
    }
    
    showLoadingStates() {
        // Minimal loading states
        if (this.elements.attendanceRate) this.elements.attendanceRate.textContent = '...';
        if (this.elements.activeCourses) this.elements.activeCourses.textContent = '...';
        if (this.elements.upcomingExam) this.elements.upcomingExam.textContent = '...';
        if (this.elements.newResources) this.elements.newResources.textContent = '...';
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
    
    // Public method for other modules
    updateMetricInstantly(metric, value) {
        console.log(`⚡ Instant metric update: ${metric} = ${value}`);
        
        switch(metric) {
            case 'attendance':
                if (this.elements.attendanceRate) {
                    this.elements.attendanceRate.textContent = `${value}%`;
                }
                break;
            case 'courses':
                if (this.elements.activeCourses) {
                    this.elements.activeCourses.textContent = value;
                }
                break;
        }
    }
}

// Create global instance
let dashboardModule = null;

// Initialize dashboard module
function initDashboardModule(supabaseClient) {
    if (!supabaseClient) return null;
    
    dashboardModule = new DashboardModule(supabaseClient);
    return dashboardModule;
}

// Make functions globally available
window.DashboardModule = DashboardModule;
window.initDashboardModule = initDashboardModule;

console.log('✅ FIXED Dashboard module loaded');
