// js/app.js
class App {
    constructor() {
        this.supabase = null;
        this.currentUserId = null;
        this.currentUserProfile = null;
        this.modules = {};
    }
    
    async initialize() {
        try {
            // Initialize Supabase
            this.supabase = supabase.createClient(
                window.APP_CONFIG.SUPABASE_URL,
                window.APP_CONFIG.SUPABASE_ANON_KEY
            );
            
            // Initialize modules
            this.initModules();
            
            // Start application
            await this.start();
            
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError('Failed to initialize application');
        }
    }
    
    initModules() {
        // Initialize all modules
        this.modules.auth = new AuthModule(this.supabase);
        this.modules.ui = new UIModule();
        this.modules.dashboard = new DashboardModule(this.supabase);
        this.modules.profile = new ProfileModule(this.supabase);
        this.modules.attendance = new AttendanceModule(this.supabase);
        this.modules.courses = new CoursesModule(this.supabase);
        this.modules.exams = new ExamsModule(this.supabase);
        this.modules.resources = new ResourcesModule(this.supabase);
        this.modules.calendar = new CalendarModule(this.supabase);
        this.modules.messages = new MessagesModule(this.supabase);
        this.modules.nurseiq = new NurseIQModule(this.supabase);
        
        // Make modules accessible via app object
        Object.assign(this, this.modules);
    }
    
    async start() {
        // Check authentication
        const isAuthenticated = await this.auth.checkAuthentication();
        if (!isAuthenticated) {
            window.location.href = "login.html";
            return;
        }
        
        // Set current user
        this.currentUserId = this.auth.currentUserId;
        this.currentUserProfile = this.auth.currentUserProfile;
        
        // Initialize UI
        this.ui.initialize();
        
        // Load dashboard
        await this.dashboard.load();
        
        // Show dashboard tab
        this.ui.showTab('dashboard');
    }
    
    showError(message) {
        const toast = document.createElement('div');
        toast.className = 'toast error';
        toast.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }
}
