// js/lecturer-database.js
/**
 * NCHSM Lecturer Database Module
 * Dedicated database operations for lecturer dashboard only
 * Does NOT interfere with student database
 */

class LecturerDatabase {
    constructor() {
        this.supabase = null;
        this.currentUserId = null;
        this.currentUserProfile = null;
        this.isInitialized = false;
        this.cachedData = {
            students: [],
            courses: [],
            exams: [],
            sessions: [],
            resources: [],
            messages: [],
            marks: [],
            nckMarks: []
        };
    }
    
    // Initialize database connection
    async initialize() {
        if (this.isInitialized) {
            console.log('✅ Lecturer Database already initialized');
            return this.supabase;
        }
        
        try {
            console.log('🚀 Initializing Lecturer Database...');
            
            // Check configuration
            if (!window.APP_CONFIG || !window.APP_CONFIG.SUPABASE_URL) {
                throw new Error('Configuration not loaded');
            }
            
            // Create Supabase client
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
                            'x-application-name': 'nchsm-lecturer-portal',
                            'x-role': 'lecturer'
                        }
                    }
                }
            );
            
            // Test connection
            await this.testConnection();
            
            this.isInitialized = true;
            console.log('✅ Lecturer Database initialized successfully');
            return this.supabase;
            
        } catch (error) {
            console.error('❌ Lecturer Database initialization failed:', error);
            throw error;
        }
    }
    
    // Test connection
    async testConnection() {
        try {
            const { error } = await this.supabase.auth.getSession();
            if (error) throw error;
            console.log('🔌 Lecturer Database connection test passed');
            return true;
        } catch (error) {
            console.error('🔌 Lecturer Database connection test failed:', error.message);
            throw error;
        }
    }
    
    // ==========================================
    // AUTHENTICATION - LECTURER SPECIFIC
    // ==========================================
    
    async checkAuth() {
        try {
            console.log('🔐 Checking lecturer authentication...');
            const { data: { session }, error } = await this.supabase.auth.getSession();
            
            if (error) {
                console.error('Session error:', error);
                return false;
            }
            
            if (!session || !session.user) {
                console.warn('No active session found');
                return false;
            }
            
            this.currentUserId = session.user.id;
            console.log('✅ Lecturer authenticated:', this.currentUserId);
            
            await this.loadLecturerProfile();
            
            return true;
            
        } catch (error) {
            console.error('Auth check failed:', error);
            return false;
        }
    }
    
    // Load lecturer profile
    async loadLecturerProfile() {
        try {
            console.log('👤 Loading lecturer profile...');
            
            // Get user profile with lecturer role check
            const { data: profile, error } = await this.supabase
                .from('consolidated_user_profiles_table')
                .select('*')
                .eq('user_id', this.currentUserId)
                .maybeSingle();
            
            if (error) {
                console.error('Error loading profile:', error);
                return null;
            }
            
            if (!profile) {
                console.warn('⚠️ No profile found for lecturer');
                return null;
            }
            
            // Verify lecturer role
            const allowedRoles = ['lecturer', 'admin', 'superadmin'];
            if (!allowedRoles.includes(profile.role)) {
                console.warn('❌ User is not a lecturer. Role:', profile.role);
                return null;
            }
            
            this.currentUserProfile = profile;
            console.log('✅ Lecturer profile loaded:', profile.full_name);
            console.log('📚 Program:', profile.program || profile.department);
            
            return profile;
            
        } catch (error) {
            console.error('Failed to load lecturer profile:', error);
            return null;
        }
    }
    
    // Get current user
    getCurrentUserId() {
        return this.currentUserId;
    }
    
    getCurrentUserProfile() {
        return this.currentUserProfile;
    }
    
    // ==========================================
    // LECTURER-SPECIFIC DATA OPERATIONS
    // ==========================================
    
    // Get students by program
    async getStudents(program) {
        if (this.cachedData.students.length > 0) {
            return this.cachedData.students;
        }
        
        try {
            const { data, error } = await this.supabase
                .from('consolidated_user_profiles_table')
                .select('*')
                .eq('role', 'student')
                .eq('program', program)
                .order('full_name', { ascending: true });
            
            if (error) throw error;
            
            this.cachedData.students = data || [];
            return this.cachedData.students;
            
        } catch (error) {
            console.error('Failed to get students:', error);
            return [];
        }
    }
    
    // Get courses by program
    async getCourses(program) {
        if (this.cachedData.courses.length > 0) {
            return this.cachedData.courses;
        }
        
        try {
            const { data, error } = await this.supabase
                .from('courses')
                .select('*')
                .eq('target_program', program)
                .eq('status', 'Active')
                .order('course_name', { ascending: true });
            
            if (error) throw error;
            
            this.cachedData.courses = data || [];
            return this.cachedData.courses;
            
        } catch (error) {
            console.error('Failed to get courses:', error);
            return [];
        }
    }
    
    // Get exams by program
    async getExams(program) {
        if (this.cachedData.exams.length > 0) {
            return this.cachedData.exams;
        }
        
        try {
            const { data, error } = await this.supabase
                .from('exams')
                .select('*, course:course_id(course_name, unit_code)')
                .eq('target_program', program)
                .order('exam_date', { ascending: false });
            
            if (error) throw error;
            
            this.cachedData.exams = data || [];
            return this.cachedData.exams;
            
        } catch (error) {
            console.error('Failed to get exams:', error);
            return [];
        }
    }
    
    // Get sessions by lecturer
    async getSessions(lecturerId, program) {
        if (this.cachedData.sessions.length > 0) {
            return this.cachedData.sessions;
        }
        
        try {
            const { data, error } = await this.supabase
                .from('scheduled_sessions')
                .select('*')
                .eq('lecturer_id', lecturerId)
                .eq('target_program', program)
                .order('session_date', { ascending: true });
            
            if (error) throw error;
            
            this.cachedData.sessions = data || [];
            return this.cachedData.sessions;
            
        } catch (error) {
            console.error('Failed to get sessions:', error);
            return [];
        }
    }
    
    // Get attendance logs for program
    async getAttendance(program, date = null) {
        try {
            let query = this.supabase
                .from('geo_attendance_logs')
                .select(`
                    *,
                    student:student_id (
                        full_name,
                        student_id,
                        program,
                        block,
                        intake_year
                    )
                `)
                .eq('program', program);
            
            if (date) {
                const dateStr = date.toISOString().split('T')[0];
                query = query
                    .gte('check_in_time', `${dateStr}T00:00:00.000Z`)
                    .lte('check_in_time', `${dateStr}T23:59:59.999Z`);
            }
            
            const { data, error } = await query
                .order('check_in_time', { ascending: false })
                .limit(100);
            
            if (error) throw error;
            
            return data || [];
            
        } catch (error) {
            console.error('Failed to get attendance:', error);
            return [];
        }
    }
    
    // Get resources by program
    async getResources(program) {
        if (this.cachedData.resources.length > 0) {
            return this.cachedData.resources;
        }
        
        try {
            const { data, error } = await this.supabase
                .from('resources')
                .select('*')
                .eq('target_program', program)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            this.cachedData.resources = data || [];
            return this.cachedData.resources;
            
        } catch (error) {
            console.error('Failed to get resources:', error);
            return [];
        }
    }
    
    // Get messages sent by lecturer
    async getMessages(lecturerId) {
        if (this.cachedData.messages.length > 0) {
            return this.cachedData.messages;
        }
        
        try {
            const { data, error } = await this.supabase
                .from('messages')
                .select('*')
                .eq('sender_id', lecturerId)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            this.cachedData.messages = data || [];
            return this.cachedData.messages;
            
        } catch (error) {
            console.error('Failed to get messages:', error);
            return [];
        }
    }
    
    // Get marks for a block/subject
    async getMarks(block, subject) {
        try {
            const { data, error } = await this.supabase
                .from('student_marks')
                .select('*')
                .eq('block', block)
                .eq('subject_name', subject);
            
            if (error) throw error;
            
            return data || [];
            
        } catch (error) {
            console.error('Failed to get marks:', error);
            return [];
        }
    }
    
    // Get NCK marks for a block
    async getNCKMarks(block, sheet) {
        try {
            const { data, error } = await this.supabase
                .from('nck_marks')
                .select('*')
                .eq('block', block)
                .eq('subject_name', sheet);
            
            if (error) throw error;
            
            return data || [];
            
        } catch (error) {
            console.error('Failed to get NCK marks:', error);
            return [];
        }
    }
    
    // ==========================================
    // LECTURER ACTIONS - INSERT/UPDATE/DELETE
    // ==========================================
    
    // Create a session
    async createSession(data) {
        try {
            const { data: result, error } = await this.supabase
                .from('scheduled_sessions')
                .insert({
                    session_title: data.title,
                    session_date: data.date,
                    session_time: data.time,
                    target_program: data.program,
                    block_term: data.block,
                    course_id: data.course,
                    lecturer_id: this.currentUserId,
                    lecturer_name: this.currentUserProfile?.full_name || 'Lecturer',
                    approval_status: 'pending',
                    created_at: new Date().toISOString()
                })
                .select();
            
            if (error) throw error;
            
            this.clearCache('sessions');
            return { success: true, data: result };
            
        } catch (error) {
            console.error('Failed to create session:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Create an exam
    async createExam(data) {
        try {
            const { data: result, error } = await this.supabase
                .from('exams')
                .insert({
                    exam_name: data.title,
                    exam_date: data.date,
                    exam_start_time: data.startTime || null,
                    exam_type: data.type,
                    online_link: data.link || null,
                    duration_minutes: parseInt(data.duration),
                    target_program: data.program,
                    course_id: data.course || null,
                    intake_year: data.intake,
                    block_term: data.block,
                    status: data.status,
                    approval_status: 'draft',
                    created_by: this.currentUserId,
                    created_at: new Date().toISOString()
                })
                .select();
            
            if (error) throw error;
            
            this.clearCache('exams');
            return { success: true, data: result };
            
        } catch (error) {
            console.error('Failed to create exam:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Upload a resource
    async uploadResource(file, data) {
        try {
            const filePath = `${data.program}/${data.intake}/${data.block}/${file.name}`;
            
            // Upload to storage
            const { error: uploadError } = await this.supabase.storage
                .from('resources')
                .upload(filePath, file, { cacheControl: '3600', upsert: true });
            
            if (uploadError) throw uploadError;
            
            // Get public URL
            const { data: urlData } = this.supabase.storage
                .from('resources')
                .getPublicUrl(filePath);
            
            // Insert into database
            const { data: result, error: insertError } = await this.supabase
                .from('resources')
                .insert({
                    title: data.title,
                    file_name: file.name,
                    file_path: filePath,
                    file_url: urlData.publicUrl,
                    file_size: file.size,
                    file_type: file.type || file.name.split('.').pop(),
                    program_type: data.program,
                    target_program: data.program,
                    intake: data.intake,
                    block: data.block,
                    block_term: data.block,
                    category: data.category || 'General',
                    uploaded_by: this.currentUserId,
                    uploaded_by_name: this.currentUserProfile?.full_name || 'Lecturer',
                    approval_status: 'pending',
                    created_at: new Date().toISOString()
                })
                .select();
            
            if (insertError) throw insertError;
            
            this.clearCache('resources');
            return { success: true, data: result };
            
        } catch (error) {
            console.error('Failed to upload resource:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Send a message
    async sendMessage(data) {
        try {
            const { data: result, error } = await this.supabase
                .from('messages')
                .insert({
                    sender_id: this.currentUserId,
                    sender_role: 'lecturer',
                    topic: data.subject,
                    body: data.message,
                    message: data.message,
                    recipient_role: 'student',
                    target_program: this.currentUserProfile?.program,
                    target_group: data.target === 'all-students' ? 'all-students' : 'specific-user',
                    receiver_id: data.target === 'all-students' ? null : data.target,
                    approval_status: 'pending',
                    created_at: new Date().toISOString(),
                    inserted_at: new Date().toISOString()
                })
                .select();
            
            if (error) throw error;
            
            this.clearCache('messages');
            return { success: true, data: result };
            
        } catch (error) {
            console.error('Failed to send message:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Save internal marks
    async saveMarks(markData) {
        try {
            const { error } = await this.supabase
                .from('student_marks')
                .upsert(markData, { onConflict: 'admission_number,subject_name,block' });
            
            if (error) throw error;
            
            this.clearCache('marks');
            return { success: true };
            
        } catch (error) {
            console.error('Failed to save marks:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Save NCK marks
    async saveNCKMarks(markData) {
        try {
            const { error } = await this.supabase
                .from('nck_marks')
                .upsert(markData, { onConflict: 'admission_number,subject_name,block' });
            
            if (error) throw error;
            
            this.clearCache('nckMarks');
            return { success: true };
            
        } catch (error) {
            console.error('Failed to save NCK marks:', error);
            return { success: false, error: error.message };
        }
    }
    
    // ==========================================
    // CACHE MANAGEMENT
    // ==========================================
    
    clearCache(type = null) {
        if (type) {
            this.cachedData[type] = [];
        } else {
            Object.keys(this.cachedData).forEach(key => {
                this.cachedData[key] = [];
            });
        }
        console.log('🧹 Lecturer cache cleared');
    }
    
    // ==========================================
    // LOGOUT - LECTURER SPECIFIC
    // ==========================================
    
    async logout() {
        try {
            // Clear cache
            this.clearCache();
            
            // Sign out
            await this.supabase.auth.signOut();
            
            // Clear local data
            this.currentUserId = null;
            this.currentUserProfile = null;
            this.isInitialized = false;
            
            // Redirect to login
            window.location.href = 'login.html';
            
        } catch (error) {
            console.error('Logout error:', error);
            window.location.href = 'login.html';
        }
    }
}

// ============================================
// CREATE GLOBAL INSTANCE
// ============================================

const lecturerDB = new LecturerDatabase();

// Expose globally
window.lecturerDB = lecturerDB;

console.log('✅ Lecturer Database module loaded');
