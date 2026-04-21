// database.js - Complete database operations with GitHub Secrets
class Database {
    constructor() {
        this.supabase = null;
        this.currentUserId = null;
        this.currentUserProfile = null;
        this.cachedData = {
            courses: [],
            exams: [],
            clinicalAreas: [],
            resources: [],
            messages: []
        };
        this.isInitialized = false;
        this.profileModule = null;
    }
    
    // Initialize database connection with GitHub Secrets
    async initialize() {
        if (this.isInitialized) {
            console.log('✅ Database already initialized');
            return this.supabase;
        }
        
        try {
            console.log('🚀 Initializing database connection...');
            
            // 1. Check if configuration is loaded
            if (!window.APP_CONFIG) {
                throw new Error('Configuration not loaded. config.js must be loaded before database.js');
            }
            
            // 2. Validate configuration
            if (!window.APP_CONFIG.SUPABASE_URL || !window.APP_CONFIG.SUPABASE_ANON_KEY) {
                throw new Error('Missing Supabase credentials in configuration');
            }
            
            console.log('🔧 Using Supabase project:', window.APP_CONFIG.SUPABASE_URL);
            console.log('📦 Environment:', window.APP_CONFIG.ENVIRONMENT || 'production');
            console.log('🏗️ Build:', window.APP_CONFIG.BUILD_TIME);
            console.log('🔑 Commit:', window.APP_CONFIG.COMMIT_SHA?.substring(0, 7) || 'unknown');
            
            // 3. Initialize Supabase client
            this.supabase = supabase.createClient(
                window.APP_CONFIG.SUPABASE_URL,
                window.APP_CONFIG.SUPABASE_ANON_KEY,
                {
                    auth: {
                        persistSession: true,
                        autoRefreshToken: true,
                        detectSessionInUrl: true
                    },
                    global: {
                        headers: {
                            'x-application-name': 'nchsm-student-portal',
                            'x-version': window.APP_CONFIG.COMMIT_SHA || 'unknown',
                            'x-environment': window.APP_CONFIG.ENVIRONMENT || 'production'
                        }
                    }
                }
            );
            
            // 4. Test connection
            await this.testConnection();
            
            this.isInitialized = true;
            console.log('✅ Database connection established successfully');
            
            return this.supabase;
            
        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            this.showConfigurationError(error);
            throw error;
        }
    }
    
    // Test database connection
    async testConnection() {
        try {
            // Simple test query
            const { error } = await this.supabase.auth.getSession();
            
            if (error) {
                throw new Error('Supabase authentication failed: ' + error.message);
            }
            
            console.log('🔌 Database connection test passed');
            return true;
            
        } catch (error) {
            console.error('🔌 Database connection test failed:', error.message);
            
            // Provide helpful error messages
            if (error.message.includes('JWT')) {
                throw new Error('Invalid Supabase API key. Check your SUPABASE_ANON_KEY in GitHub Secrets.');
            } else if (error.message.includes('fetch')) {
                throw new Error('Network error. Check your SUPABASE_URL in GitHub Secrets.');
            } else if (error.message.includes('CORS')) {
                throw new Error('CORS error. Add your domain to Supabase CORS settings.');
            } else {
                throw error;
            }
        }
    }
    
    // Show configuration error UI
    showConfigurationError(error) {
        const errorHtml = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                padding: 20px;
                font-family: 'Inter', sans-serif;
            ">
                <div style="
                    background: white;
                    border-radius: 16px;
                    padding: 40px;
                    max-width: 600px;
                    width: 100%;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    text-align: center;
                ">
                    <div style="margin-bottom: 30px;">
                        <div style="
                            width: 80px;
                            height: 80px;
                            background: #ef4444;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin: 0 auto 20px;
                        ">
                            <i class="fas fa-database" style="font-size: 36px; color: white;"></i>
                        </div>
                        <h1 style="color: #1f2937; margin-bottom: 10px;">Configuration Error</h1>
                        <p style="color: #6b7280; margin-bottom: 20px;">
                            Failed to load application configuration.
                        </p>
                    </div>
                    
                    <div style="
                        background: #f3f4f6;
                        border-radius: 12px;
                        padding: 20px;
                        margin-bottom: 30px;
                        text-align: left;
                    ">
                        <h3 style="color: #374151; margin-bottom: 10px;">Error Details:</h3>
                        <code style="
                            background: #1f2937;
                            color: #10b981;
                            padding: 10px;
                            border-radius: 6px;
                            display: block;
                            font-family: monospace;
                            font-size: 14px;
                            overflow-x: auto;
                        ">
                            ${error.message}
                        </code>
                    </div>
                    
                    <div style="
                        background: #f0f9ff;
                        border-radius: 12px;
                        padding: 20px;
                        margin-bottom: 30px;
                        text-align: left;
                        border-left: 4px solid #0ea5e9;
                    ">
                        <h3 style="color: #0369a1; margin-bottom: 10px;">
                            <i class="fas fa-info-circle"></i> How to Fix:
                        </h3>
                        <ol style="color: #374151; margin-left: 20px;">
                            <li>Check if <strong>config.js</strong> file exists</li>
                            <li>Verify GitHub Secrets are properly set (SUPABASE_URL, SUPABASE_ANON_KEY)</li>
                            <li>Check browser console for detailed errors</li>
                            <li>Ensure GitHub Actions workflow generated config.js</li>
                        </ol>
                    </div>
                    
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button onclick="window.location.reload()" style="
                            background: #4f46e5;
                            color: white;
                            border: none;
                            padding: 12px 24px;
                            border-radius: 8px;
                            cursor: pointer;
                            font-weight: 600;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                        ">
                            <i class="fas fa-redo"></i> Try Again
                        </button>
                        
                        <button onclick="showGitHubSecretsHelp()" style="
                            background: #6b7280;
                            color: white;
                            border: none;
                            padding: 12px 24px;
                            border-radius: 8px;
                            cursor: pointer;
                            font-weight: 600;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                        ">
                            <i class="fas fa-question-circle"></i> GitHub Secrets Help
                        </button>
                    </div>
                    
                    ${window.APP_CONFIG ? `
                    <div style="margin-top: 20px; color: #9ca3af; font-size: 12px;">
                        <i class="fas fa-code-branch"></i> 
                        Build: ${window.APP_CONFIG.BUILD_TIME} | 
                        Commit: ${window.APP_CONFIG.COMMIT_SHA?.substring(0, 7) || 'unknown'} |
                        Config: ${window.APP_CONFIG.SUPABASE_URL ? 'Loaded' : 'Missing'}
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        document.body.innerHTML = errorHtml;
    }
    
    // === AUTHENTICATION FUNCTIONS ===
    async checkAuth() {
        try {
            console.log('🔐 Checking authentication...');
            const { data: { session }, error } = await this.supabase.auth.getSession();
            
            if (error) {
                console.error('Session error:', error);
                window.location.href = "login.html";
                return false;
            }
            
            if (!session || !session.user) {
                console.warn('No active session found');
                window.location.href = "login.html";
                return false;
            }
            
            this.currentUserId = session.user.id;
            console.log('✅ User authenticated:', this.currentUserId);
            
            await this.loadUserProfile();
            return true;
            
        } catch (error) {
            console.error('Auth check failed:', error);
            window.location.href = "login.html";
            return false;
        }
    }
    
    async loadUserProfile() {
        try {
            console.log('👤 Loading user profile...');
            
            const { data: profile, error } = await this.supabase
                .from('consolidated_user_profiles_table')
                .select('*')
                .eq('user_id', this.currentUserId)
                .single();
            
            if (error) throw error;
            
            this.currentUserProfile = profile;
            console.log('✅ User profile loaded:', profile.full_name);
            
            // Make user data globally accessible
            window.currentUserId = this.currentUserId;
            window.currentUser = profile;
            window.userProfile = profile;
            window.db = this;
            
            console.log('🌐 Global user data set:', {
                id: window.currentUserId,
                name: profile.full_name,
                studentId: profile.student_id || profile.reg_no,
                email: profile.email
            });
            
            return profile;
            
        } catch (error) {
            console.error('Failed to load profile:', error);
            this.currentUserProfile = {};
            
            // Still set global variables
            window.currentUserId = this.currentUserId;
            window.currentUser = {};
            window.userProfile = {};
            
            return {};
        }
    }
    
    // Load profile data (called when profile tab is activated)
    async loadProfileData() {
        console.log('🔄 Database.loadProfileData() called');
        
        if (this.profileModule) {
            console.log('🎯 Loading profile via module...');
            await this.profileModule.loadProfile();
        } else if (typeof window.loadProfile === 'function') {
            console.log('🎯 Loading profile via global function...');
            await window.loadProfile();
        } else if (this.currentUserId && this.supabase) {
            console.log('🎯 Loading profile directly...');
            await this.loadUserProfile();
        }
    }
    
    async logout() {
        try {
            this.supabase.realtime.channels.forEach(channel => this.supabase.removeChannel(channel));
            await this.supabase.auth.signOut();
            window.location.href = "login.html";
        } catch (error) {
            console.error("Logout error:", error);
            window.location.href = "login.html";
        }
    }
    
    // === DASHBOARD FUNCTIONS ===
    async getDashboardMetrics() {
        const userId = this.currentUserId;
        
        try {
            // Attendance metrics
            const { data: logs, error: logsError } = await this.supabase
                .from('geo_attendance_logs')
                .select('is_verified')
                .eq('student_id', userId);
            
            const totalLogs = logs?.length || 0;
            const verifiedCount = logs?.filter(l => l.is_verified === true).length || 0;
            const attendanceRate = totalLogs > 0 ? Math.round((verifiedCount / totalLogs) * 100) : 0;
            
            // Courses count
            const courses = await this.getCourses();
            const coursesCount = courses.length;
            
            // Upcoming exams
            const exams = await this.getExams();
            const upcomingExams = exams
                .filter(exam => new Date(exam.exam_date) > new Date())
                .sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date));
            
            // New resources (last 7 days)
            const resources = await this.getResources();
            const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
            const newResourcesCount = resources.filter(r => r.created_at >= oneWeekAgo).length;
            
            return {
                attendance: {
                    rate: attendanceRate,
                    verified: verifiedCount,
                    total: totalLogs,
                    pending: totalLogs - verifiedCount
                },
                courses: coursesCount,
                upcomingExam: upcomingExams[0],
                newResources: newResourcesCount
            };
            
        } catch (error) {
            console.error('Failed to get dashboard metrics:', error);
            return null;
        }
    }
    
    // === COURSES FUNCTIONS ===
    async getCourses() {
        if (this.cachedData.courses.length > 0) {
            return this.cachedData.courses;
        }
        
        const program = this.currentUserProfile?.program || this.currentUserProfile?.department;
        const intakeYear = this.currentUserProfile?.intake_year;
        const block = this.currentUserProfile?.block;
        
        if (!program || !intakeYear) {
            return [];
        }
        
        try {
            const blockFilter = `block.eq.${block},block.is.null,block.eq.General`;
            const programFilter = `target_program.eq.${program}`;
            
            const { data: courses, error } = await this.supabase
                .from('courses')
                .select('*')
                .or(programFilter)
                .eq('intake_year', intakeYear)
                .or(blockFilter)
                .order('course_name', { ascending: true });
            
            if (error) throw error;
            
            this.cachedData.courses = courses || [];
            return this.cachedData.courses;
            
        } catch (error) {
            console.error("Failed to load courses:", error);
            return [];
        }
    }
    
    // === EXAMS FUNCTIONS ===
    async getExams() {
        if (this.cachedData.exams.length > 0) {
            return this.cachedData.exams;
        }
        
        const program = this.currentUserProfile?.program || this.currentUserProfile?.department;
        const block = this.currentUserProfile?.block;
        const intakeYear = this.currentUserProfile?.intake_year;
        const studentId = this.currentUserId;
        
        if (!program || !intakeYear) {
            return [];
        }
        
        try {
            // Fetch exams
            const { data: exams, error: examsError } = await this.supabase
                .from('exams_with_courses')
                .select(`
                    id,
                    exam_name,
                    exam_type,  
                    exam_date,
                    status,
                    block_term,
                    program_type,
                    exam_link,
                    course_name
                `)
                .or(`program_type.eq.${program},program_type.eq.General`)
                .or(`block_term.eq.${block},block_term.is.null,block_term.eq.General`)
                .eq('intake_year', intakeYear)
                .order('exam_date', { ascending: true });
            
            if (examsError) throw examsError;
            
            // Fetch grades
            const { data: grades, error: gradesError } = await this.supabase
                .from('exam_grades')
                .select(`
                    exam_id,
                    student_id,
                    cat_1_score,
                    cat_2_score,
                    exam_score,
                    total_score,
                    result_status,
                    marks,
                    graded_by,
                    graded_at
                `)
                .eq('student_id', studentId)
                .eq('question_id', '00000000-0000-0000-0000-000000000000')
                .order('graded_at', { ascending: false });
            
            if (gradesError) throw gradesError;
            
            // Combine exams with grades
            this.cachedData.exams = exams.map(exam => {
                const grade = grades?.find(g => String(g.exam_id) === String(exam.id));
                return { ...exam, grade: grade || null };
            });
            
            return this.cachedData.exams;
            
        } catch (error) {
            console.error('Failed to load exams:', error);
            return [];
        }
    }
    
    // === ATTENDANCE FUNCTIONS ===
    async getClinicalTargets() {
        if (this.cachedData.clinicalAreas.length > 0) {
            return this.cachedData.clinicalAreas;
        }
        
        const program = this.currentUserProfile?.program || this.currentUserProfile?.department;
        const intakeYear = this.currentUserProfile?.intake_year;
        const blockTerm = this.currentUserProfile?.block || null;
        
        if (!program || !intakeYear) {
            return [];
        }
        
        try {
            const { data: areaData, error: areaError } = await this.supabase
                .from('clinical_areas')
                .select('id, name, latitude, longitude, block, program, intake_year')
                .ilike('program', program)
                .ilike('intake_year', intakeYear)
                .or(blockTerm ? `block.ilike.${blockTerm},block.is.null` : 'block.is.null');
            
            if (areaError) throw areaError;
            
            const { data: nameData, error: nameError } = await this.supabase
                .from('clinical_names')
                .select('id, uuid, clinical_area_name, latitude, longitude, program, intake_year, block_term')
                .ilike('program', program)
                .ilike('intake_year', intakeYear)
                .or(blockTerm ? `block_term.ilike.${blockTerm},block_term.is.null` : 'block_term.is.null');
            
            if (nameError) throw nameError;
            
            const mappedNames = (nameData || []).map(n => ({
                id: n.uuid,
                original_id: n.id,
                name: n.clinical_area_name,
                latitude: n.latitude,
                longitude: n.longitude,
                block: n.block_term || null
            }));
            
            this.cachedData.clinicalAreas = [...(areaData || []), ...mappedNames]
                .filter((v, i, a) => a.findIndex(t => t.name === v.name) === i)
                .sort((a, b) => a.name.localeCompare(b.name));
            
            return this.cachedData.clinicalAreas;
            
        } catch (error) {
            console.error("Error loading clinical areas:", error);
            return [];
        }
    }
    
    async getClassTargets() {
        const program = this.currentUserProfile?.program || this.currentUserProfile?.department;
        const intakeYear = this.currentUserProfile?.intake_year;
        const block = this.currentUserProfile?.block || null;
        
        if (!program || !intakeYear) {
            return [];
        }
        
        try {
            let query = this.supabase.from('courses_sections')
                .select('id, name, code, latitude, longitude')
                .eq('program', program)
                .eq('intake_year', intakeYear);
            
            if (block) query = query.or(`block.eq.${block},block.is.null`);
            else query = query.is('block', null);
            
            const { data, error } = await query.order('name');
            
            if (error) throw error;
            
            return (data || []).map(c => ({
                id: c.id,
                name: c.name,
                code: c.code,
                latitude: c.latitude,
                longitude: c.longitude
            }));
            
        } catch (error) {
            console.error("Error loading class targets:", error);
            return [];
        }
    }
    
    async getAttendanceHistory() {
        try {
            const { data: logs, error } = await this.supabase
                .from('geo_attendance_logs')
                .select('check_in_time, session_type, target_name, is_verified')
                .eq('student_id', this.currentUserId)
                .order('check_in_time', { ascending: false })
                .limit(100);
            
            if (error) throw error;
            return logs || [];
            
        } catch (error) {
            console.error("Failed to load attendance history:", error);
            return [];
        }
    }
    
    async checkInAttendance(sessionType, targetId, targetName, location, studentProgram) {
        try {
            const deviceId = localStorage.getItem('device_id') || crypto.randomUUID();
            localStorage.setItem('device_id', deviceId);
            
            const checkInTime = new Date().toISOString();
            
            // Find target to get coordinates
            const targets = sessionType === 'Clinical' ? 
                await this.getClinicalTargets() : 
                await this.getClassTargets();
            
            const target = targets.find(t => t.id === targetId);
            
            if (!target || (target.latitude === null || target.longitude === null)) {
                throw new Error('Target location coordinates not found');
            }
            
            // Calculate distance
            const R = 6371000; // Earth radius in meters
            const toRad = x => x * Math.PI / 180;
            const dLat = toRad(location.lat - target.latitude);
            const dLon = toRad(location.lon - target.longitude);
            const lat1 = toRad(location.lat);
            const lat2 = toRad(target.latitude);
            const a = Math.sin(dLat/2)**2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon/2)**2;
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distanceMeters = R * c;
            const isVerified = distanceMeters <= 200; // 200m radius
            
            // RPC call to insert check-in
            const { error } = await this.supabase.rpc('check_in_and_defer_fk', {
                p_student_id: this.currentUserId,
                p_check_in_time: checkInTime,
                p_session_type: sessionType === 'Clinical' ? 'Clinical' : 'Class',
                p_target_id: target.id,
                p_target_name: target.name,
                p_latitude: location.lat,
                p_longitude: location.lon,
                p_accuracy_m: location.acc,
                p_location_friendly_name: location.friendly,
                p_program: studentProgram,
                p_block: this.currentUserProfile.block,
                p_intake_year: this.currentUserProfile.intake_year,
                p_device_id: deviceId,
                p_is_verified: isVerified,
                p_course_id: sessionType === 'Class' ? target.id : null,
                p_student_name: this.currentUserProfile.full_name || 'Unknown Student'
            });
            
            if (error) throw error;
            return { success: true, verified: isVerified };
            
        } catch (error) {
            console.error('Check-in failed:', error);
            return { success: false, error: error.message };
        }
    }
    
    // === RESOURCES FUNCTIONS ===
    async getResources() {
        if (this.cachedData.resources.length > 0) {
            return this.cachedData.resources;
        }
        
        const program = this.currentUserProfile?.program;
        const block = this.currentUserProfile?.block;
        const intakeYear = this.currentUserProfile?.intake_year;
        
        if (!program || !intakeYear || !block) {
            return [];
        }
        
        try {
            const { data: resources, error } = await this.supabase
                .from('resources')
                .select('id, title, file_path, file_url, program_type, block, intake, uploaded_by_name, created_at, description, file_type')
                .eq('program_type', program)
                .eq('block', block)
                .eq('intake', intakeYear)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            this.cachedData.resources = resources || [];
            return this.cachedData.resources;
            
        } catch (err) {
            console.error("Error loading resources:", err);
            return [];
        }
    }
    
    // === MESSAGES FUNCTIONS ===
    async getMessages() {
        if (this.cachedData.messages.length > 0) {
            return this.cachedData.messages;
        }
        
        const program = this.currentUserProfile?.program || this.currentUserProfile?.department;
        
        try {
            // Load personal messages
            const { data: personalMessages, error: personalError } = await this.supabase
                .from('student_messages')
                .select('*')
                .or(`recipient_id.eq.${this.currentUserId},recipient_program.eq.${program}`)
                .order('created_at', { ascending: false });
            
            if (personalError) throw personalError;
            
            // Load official announcements
            const { data: notifications, error: notifError } = await this.supabase
                .from('notifications')
                .select('*')
                .or(`target_program.eq.${program},target_program.is.null`)
                .order('created_at', { ascending: false });
            
            if (notifError) throw notifError;
            
            // Combine messages
            this.cachedData.messages = [
                ...(personalMessages || []).map(m => ({ ...m, type: 'Personal' })),
                ...(notifications || []).map(n => ({ ...n, type: 'Announcement' }))
            ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            
            return this.cachedData.messages;
            
        } catch (error) {
            console.error("Failed to load messages:", error);
            return [];
        }
    }
    
    async sendMessage(message) {
        try {
            const { data, error } = await this.supabase
                .from('student_messages')
                .insert({
                    student_id: this.currentUserId,
                    student_name: this.currentUserProfile.full_name,
                    student_program: this.currentUserProfile.program || this.currentUserProfile.department,
                    message: message,
                    created_at: new Date().toISOString(),
                    is_read: false
                });
            
            if (error) throw error;
            return { success: true };
            
        } catch (error) {
            console.error("Failed to send message:", error);
            return { success: false, error: error.message };
        }
    }
    
    // === CALENDAR FUNCTIONS ===
    async getCalendarEvents() {
        const program = this.currentUserProfile?.program || this.currentUserProfile?.department;
        const block = this.currentUserProfile?.block;
        const intakeYear = this.currentUserProfile?.intake_year;
        
        if (!program || !block || !intakeYear) {
            return [];
        }
        
        try {
            const { data: events, error } = await this.supabase
                .from('calendar_events')
                .select('event_name, event_date, type, description, target_program, target_block, target_intake_year')
                .or(`target_program.eq.${program},target_program.eq.General`)
                .or(`target_block.eq.${block},target_block.is.null`)
                .eq('target_intake_year', intakeYear);
            
            if (error) throw error;
            
            // Add exams to calendar
            const exams = await this.getExams();
            const examEvents = exams.map(exam => ({
                event_name: exam.exam_name,
                event_date: exam.exam_date,
                type: 'Exam',
                description: `${exam.status || 'Scheduled'} - Block ${exam.block_term}`
            }));
            
            return [...(events || []), ...examEvents]
                .sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
            
        } catch (error) {
            console.error("Failed to load calendar events:", error);
            return [];
        }
    }
    
    // === NURSEIQ FUNCTIONS ===
    async getNurseIQQuestions(courseId = null) {
        try {
            let query = this.supabase
                .from('medical_assessments')
                .select(`
                    *,
                    courses (
                        id,
                        course_name,
                        unit_code,
                        color,
                        description
                    )
                `)
                .eq('is_active', true)
                .eq('is_published', true);
            
            if (courseId) {
                query = query.eq('course_id', courseId);
            }
            
            const { data: questions, error } = await query;
            
            if (error) throw error;
            return questions || [];
            
        } catch (error) {
            console.error('Error loading NurseIQ questions:', error);
            return [];
        }
    }
    
    async getNurseIQCourses() {
        try {
            const questions = await this.getNurseIQQuestions();
            
            // Group by course
            const coursesMap = {};
            questions.forEach(question => {
                const courseId = question.course_id || 'general';
                const courseName = question.courses?.course_name || 'General Nursing';
                const unitCode = question.courses?.unit_code || 'KRCHN';
                
                if (!coursesMap[courseId]) {
                    coursesMap[courseId] = {
                        id: courseId,
                        name: courseName,
                        unit_code: unitCode,
                        color: question.courses?.color || '#4f46e5',
                        description: question.courses?.description || '',
                        questions: [],
                        stats: {
                            total: 0,
                            active: 0,
                            hard: 0,
                            medium: 0,
                            easy: 0,
                            lastUpdated: null
                        }
                    };
                }
                
                coursesMap[courseId].questions.push(question);
                coursesMap[courseId].stats.total++;
                coursesMap[courseId].stats.active++;
                
                // Count by difficulty
                if (question.difficulty === 'hard') coursesMap[courseId].stats.hard++;
                else if (question.difficulty === 'medium') coursesMap[courseId].stats.medium++;
                else if (question.difficulty === 'easy') coursesMap[courseId].stats.easy++;
                
                // Track last updated
                if (question.updated_at) {
                    const updatedDate = new Date(question.updated_at);
                    if (!coursesMap[courseId].stats.lastUpdated || updatedDate > coursesMap[courseId].stats.lastUpdated) {
                        coursesMap[courseId].stats.lastUpdated = updatedDate;
                    }
                }
            });
            
            return Object.values(coursesMap);
            
        } catch (error) {
            console.error('Error loading NurseIQ courses:', error);
            return [];
        }
    }
    
    // === UTILITY FUNCTIONS ===
    clearCache() {
        this.cachedData = {
            courses: [],
            exams: [],
            clinicalAreas: [],
            resources: [],
            messages: []
        };
        console.log('🧹 Cache cleared');
    }
    
    async updateProfile(updates) {
        try {
            const { error } = await this.supabase
                .from('consolidated_user_profiles_table')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', this.currentUserId);
            
            if (error) throw error;
            
            // Update cached profile
            this.currentUserProfile = { ...this.currentUserProfile, ...updates };
            
            // Also update global reference
            if (window.currentUser) {
                window.currentUser = { ...window.currentUser, ...updates };
            }
            
            return { success: true };
            
        } catch (error) {
            console.error('Failed to update profile:', error);
            return { success: false, error: error.message };
        }
    }
    
    async uploadPassportPhoto(file) {
        try {
            const fileExt = file.name.split('.').pop();
            const filePath = `${this.currentUserId}.${fileExt}`;
            
            // Upload to storage
            const { error: uploadError } = await this.supabase.storage
                .from('passports')
                .upload(filePath, file, { cacheControl: '3600', upsert: true });
            
            if (uploadError) throw uploadError;
            
            // Update profile with photo URL
            const { error: updateError } = await this.supabase
                .from('consolidated_user_profiles_table')
                .update({ 
                    passport_url: filePath,
                    updated_at: new Date().toISOString() 
                })
                .eq('user_id', this.currentUserId);
            
            if (updateError) throw updateError;
            
            // Update cached profile
            if (this.currentUserProfile) {
                this.currentUserProfile.passport_url = filePath;
            }
            
            return { success: true, filePath };
            
        } catch (error) {
            console.error('Failed to upload photo:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Get current user profile for other modules
    getCurrentUserProfile() {
        return this.currentUserProfile;
    }
    
    // Get database instance
    getInstance() {
        return this;
    }
}

// ========== GLOBAL INITIALIZATION ==========

// Create global instance
window.db = new Database();

// Helper function to make database globally accessible
window.getDatabase = async function() {
    if (!window.db.supabase) {
        await window.db.initialize();
    }
    return window.db;
};

// Make sure the database is initialized when needed
window.initDatabase = async function() {
    try {
        console.log('🔧 Initializing database via global function...');
        const dbInstance = await window.db.initialize();
        console.log('✅ Database init result:', dbInstance ? 'Success' : 'Failed');
        return dbInstance;
    } catch (error) {
        console.error('❌ Database initialization error:', error);
        return null;
    }
};

// Helper function for GitHub Secrets help
function showGitHubSecretsHelp() {
    const helpText = `
# GitHub Secrets Configuration

## Required Secrets:
1. SUPABASE_URL - Your Supabase project URL
   Example: https://lwhtjozfsmbyihenfunw.supabase.co

2. SUPABASE_ANON_KEY - Your Supabase anonymous key
   Example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

3. LOCATIONIQ_API_KEY - LocationIQ API key (optional for geolocation)

## How to Add Secrets:
1. Go to your GitHub repository
2. Click Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add each secret with the correct name and value

## Verification:
After adding secrets, push your code. GitHub Actions will:
1. Generate config.js from your secrets
2. Deploy to GitHub Pages
3. Your app will connect to Supabase automatically
    `;
    
    alert(helpText);
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 database.js loaded - DOM ready');
    // The main app will call window.db.initialize() when needed
});
