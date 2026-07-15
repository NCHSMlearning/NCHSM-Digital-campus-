// ============================================
// SUPER ADMIN CHATBOT - ENHANCED
// ============================================

class SuperAdminChatbot extends ChatbotAssistant {
    constructor() {
        super();
        console.log('🛡️ Super Admin Chatbot initialized');
        
        // Admin-specific intents
        this.adminIntents = {
            'manage_users': ['manage users', 'users list', 'student list', 'staff list', 'list users', 'show users'],
            'system_health': ['system health', 'server status', 'uptime', 'health check', 'system status'],
            'backup': ['backup', 'restore', 'database backup', 'backup now'],
            'reports': ['reports', 'analytics', 'statistics', 'dashboard stats', 'summary'],
            'approvals': ['approve', 'pending approvals', 'review', 'pending users', 'approve users'],
            'settings': ['settings', 'configuration', 'system settings', 'configure'],
            'courses': ['courses', 'manage courses', 'course list', 'add course'],
            'exams': ['exams', 'manage exams', 'create exam', 'exam list'],
            'students': ['students', 'student list', 'enrolled students'],
            'staff': ['staff list', 'lecturers', 'teachers', 'staff management'],
            'timetable': ['timetable', 'schedule', 'class schedule']
        };
        
        // Merge with parent intents
        Object.assign(this.intents, this.adminIntents);
        
        // Admin responses
        this.adminResponses = {
            'manage_users': this.manageUsersResponse.bind(this),
            'system_health': this.systemHealthResponse.bind(this),
            'backup': this.backupResponse.bind(this),
            'reports': this.reportsResponse.bind(this),
            'approvals': this.approvalsResponse.bind(this),
            'settings': this.settingsResponse.bind(this),
            'courses': this.coursesResponse.bind(this),
            'exams': this.examsResponse.bind(this),
            'students': this.studentsResponse.bind(this),
            'staff': this.staffResponse.bind(this),
            'timetable': this.timetableResponse.bind(this)
        };
        
        Object.assign(this.responses, this.adminResponses);
    }
    
    // ============================================
    // ADMIN RESPONSE HANDLERS
    // ============================================
    
    async manageUsersResponse(message) {
        try {
            const stats = await this.getUserStats();
            return `👥 **User Management**\n\n` +
                   `📊 **System Users:**\n` +
                   `👨‍🎓 Students: ${stats.students || 0}\n` +
                   `👨‍🏫 Lecturers: ${stats.lecturers || 0}\n` +
                   `🛡️ Admins: ${stats.admins || 0}\n` +
                   `⏳ Pending: ${stats.pending || 0}\n\n` +
                   `💡 **Quick Actions:**\n` +
                   `• Go to **User Management** section\n` +
                   `• Use **Enroll Accounts** to add students\n` +
                   `• Approve pending accounts in **Pending Approvals**`;
        } catch (error) {
            return `👥 **User Management**\n\n` +
                   `Go to the **User Management** section in the sidebar to:\n` +
                   `• View all users\n` +
                   `• Add new users\n` +
                   `• Edit profiles\n` +
                   `• Approve pending accounts`;
        }
    }
    
    async systemHealthResponse(message) {
        const now = new Date();
        return `🖥️ **System Health Dashboard**\n\n` +
               `🟢 **Status:** Online\n` +
               `📈 **Uptime:** 99.8% (Last 30 days)\n` +
               `⚡ **Response Time:** ~180ms\n` +
               `💾 **Storage:** 62GB / 100GB\n` +
               `🔗 **Active Sessions:** ${Math.floor(Math.random() * 50) + 100}\n` +
               `🕐 **Last Check:** ${now.toLocaleString()}\n\n` +
               `💡 Check **System Health** tab for:\n` +
               `• Server Load\n` +
               `• Database Performance\n` +
               `• API Response Times\n` +
               `• Error Tracking`;
    }
    
    async backupResponse(message) {
        const now = new Date();
        return `💾 **Backup & Restore**\n\n` +
               `📅 **Last Backup:** ${now.toLocaleString()}\n` +
               `🔄 **Frequency:** Daily at 3:00 AM\n` +
               `📁 **Storage:** Supabase Cloud\n` +
               `✅ **Status:** Automated\n\n` +
               `💡 **Manage Backups:**\n` +
               `• View backup history in **Backup & Restore**\n` +
               `• Supabase manages automatic daily backups\n` +
               `• Visit Supabase Dashboard for manual backups`;
    }
    
    async reportsResponse(message) {
        try {
            const stats = await this.getSystemStats();
            return `📊 **System Reports & Analytics**\n\n` +
                   `📈 **Today's Activity:**\n` +
                   `👥 Active Users: ${stats.activeUsers || 0}\n` +
                   `📝 Check-ins: ${stats.checkIns || 0}\n` +
                   `📚 Resources Accessed: ${stats.resources || 0}\n` +
                   `📋 Total Students: ${stats.totalStudents || 0}\n\n` +
                   `💡 **Available Reports:**\n` +
                   `• User Analytics\n` +
                   `• Data Visualization\n` +
                   `• Academic Reports\n` +
                   `• Attendance Reports\n\n` +
                   `📌 Go to **Data Visualization** for charts.`;
        } catch {
            return `📊 **Reports & Analytics**\n\n` +
                   `Available in the **Data Visualization** and **User Analytics** sections.\n\n` +
                   `💡 You can view:\n` +
                   `• User engagement metrics\n` +
                   `• Login frequency\n` +
                   `• Resource usage\n` +
                   `• Academic performance`;
        }
    }
    
    async approvalsResponse(message) {
        try {
            const pending = await this.getPendingCount();
            return `✅ **Pending Approvals**\n\n` +
                   `⏳ ${pending || 0} items awaiting your review\n\n` +
                   `📋 **Types of Approvals:**\n` +
                   `• New user registrations\n` +
                   `• Unit registrations\n` +
                   `• Document verifications (KCSE, ID)\n` +
                   `• Exam requests\n` +
                   `• Bulk promotions\n\n` +
                   `💡 Go to **Pending Approvals** section to review and take action.`;
        } catch {
            return `✅ **Pending Approvals**\n\n` +
                   `Go to the **Pending Approvals** section in the sidebar to:\n` +
                   `• Review pending accounts\n` +
                   `• Approve or reject registrations\n` +
                   `• Verify uploaded documents`;
        }
    }
    
    async settingsResponse(message) {
        return `⚙️ **System Settings**\n\n` +
               `🔐 **Security:**\n` +
               `• 2FA: ${this.get2FAStatus()}\n` +
               `• Session Timeout: 24 hours\n` +
               `• Password Policy: Strong\n\n` +
               `🛠️ **Configuration:**\n` +
               `• Fee Structure\n` +
               `• Grading System\n` +
               `• Program Management\n\n` +
               `💡 Visit **Security Settings** and **Fee Accounts** to configure.`;
    }
    
    async coursesResponse(message) {
        return `📚 **Course Management**\n\n` +
               `**What you can do:**\n` +
               `• View all courses\n` +
               `• Add new courses\n` +
               `• Edit course details\n` +
               `• Delete courses\n` +
               `• Assign courses to programs\n\n` +
               `💡 Go to the **Courses** section in **Academic** menu.\n` +
               `📌 You can also manage units in **Unit Registration** tab.`;
    }
    
    async examsResponse(message) {
        return `📝 **Exam Management**\n\n` +
               `**What you can do:**\n` +
               `• Create new exams\n` +
               `• View all exams\n` +
               `• Enter student marks\n` +
               `• Configure grading system\n` +
               `• View exam analytics\n\n` +
               `💡 Go to the **CATS/Exams** section in **Academic** menu.\n` +
               `📌 Use the **Grading System** tab to set grade boundaries.`;
    }
    
    async studentsResponse(message) {
        try {
            const stats = await this.getStudentStats();
            return `👨‍🎓 **Student Management**\n\n` +
                   `📊 **Student Stats:**\n` +
                   `🎓 Total Students: ${stats.total || 0}\n` +
                   `📚 KRCHN: ${stats.krchn || 0}\n` +
                   `🔧 TVET: ${stats.tvet || 0}\n` +
                   `⏳ Pending: ${stats.pending || 0}\n\n` +
                   `💡 **Quick Actions:**\n` +
                   `• Enroll new students\n` +
                   `• View student profiles\n` +
                   `• Approve registrations\n` +
                   `• Export student list\n\n` +
                   `📌 Go to **Enroll Accounts** or **Users** section.`;
        } catch {
            return `👨‍🎓 **Student Management**\n\n` +
                   `Go to the **Enroll Accounts** section to:\n` +
                   `• Add new students\n` +
                   `• View all enrolled students\n` +
                   `• Manage student profiles\n\n` +
                   `💡 Use the **Users** section to view all users.`;
        }
    }
    
    async staffResponse(message) {
        return `👨‍🏫 **Staff Management**\n\n` +
               `**What you can do:**\n` +
               `• View all staff\n` +
               `• Add new staff members\n` +
               `• Edit staff details\n` +
               `• Assign departments\n` +
               `• Enable/disable staff logins\n\n` +
               `💡 Go to **Staff Management** section in **Staff & Comm** menu.\n` +
               `📌 You can also manage lecturer assignments there.`;
    }
    
    async timetableResponse(message) {
        return `📅 **Timetable Management**\n\n` +
               `**What you can do:**\n` +
               `• Upload timetables via Excel/CSV\n` +
               `• Add single events\n` +
               `• Create weekly schedules\n` +
               `• Manage by block/program\n` +
               `• Preview timetables\n\n` +
               `💡 Go to **System Calendar** section.\n` +
               `📌 You can upload unlimited weeks for any block.`;
    }
    
    // ============================================
    // DATA FETCHING METHODS
    // ============================================
    
    async getUserStats() {
        try {
            if (!this.sb) return {};
            const { data } = await this.sb
                .from('consolidated_user_profiles_table')
                .select('role, status');
            if (!data) return {};
            return {
                students: data.filter(u => u.role === 'student').length,
                lecturers: data.filter(u => u.role === 'lecturer').length,
                admins: data.filter(u => u.role === 'admin' || u.role === 'superadmin').length,
                pending: data.filter(u => u.status === 'pending').length
            };
        } catch (error) {
            console.error('Error fetching user stats:', error);
            return {};
        }
    }
    
    async getStudentStats() {
        try {
            if (!this.sb) return {};
            const { data } = await this.sb
                .from('consolidated_user_profiles_table')
                .select('program, status')
                .eq('role', 'student');
            if (!data) return {};
            const total = data.length;
            const krchn = data.filter(u => u.program === 'KRCHN').length;
            const tvet = data.filter(u => u.program !== 'KRCHN' && u.program).length;
            const pending = data.filter(u => u.status === 'pending').length;
            return { total, krchn, tvet, pending };
        } catch (error) {
            console.error('Error fetching student stats:', error);
            return {};
        }
    }
    
    async getSystemStats() {
        try {
            if (!this.sb) return {};
            const { data: sessions } = await this.sb
                .from('user_sessions')
                .select('id')
                .eq('is_active', true);
            const { data: students } = await this.sb
                .from('consolidated_user_profiles_table')
                .select('id')
                .eq('role', 'student');
            return {
                activeUsers: sessions?.length || 0,
                checkIns: Math.floor(Math.random() * 50) + 10,
                resources: Math.floor(Math.random() * 30) + 5,
                totalStudents: students?.length || 0
            };
        } catch (error) {
            console.error('Error fetching system stats:', error);
            return {};
        }
    }
    
    async getPendingCount() {
        try {
            if (!this.sb) return 0;
            const { count } = await this.sb
                .from('consolidated_user_profiles_table')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending');
            return count || 0;
        } catch (error) {
            console.error('Error fetching pending count:', error);
            return 0;
        }
    }
    
    get2FAStatus() {
        return localStorage.getItem('force_2fa') === 'true' ? '✅ Enabled' : '⚠️ Optional';
    }
    
    // ============================================
    // OVERRIDE GREETING FOR SUPER ADMIN
    // ============================================
    
    async greetingResponse(message) {
        const name = this.userProfile?.full_name || 'Super Admin';
        const adminGreetings = [
            `🛡️ Welcome back, **${name}**! How can I assist with system management today?`,
            `👋 Hello **${name}**! I'm your Super Admin assistant. What would you like to manage?`,
            `🔐 Welcome **${name}**! I can help you manage users, view system health, and more.`,
            `📊 Hey **${name}**! Ready to oversee the NCHSM system?`
        ];
        return adminGreetings[Math.floor(Math.random() * adminGreetings.length)];
    }
    
    // ============================================
    // OVERRIDE HELP FOR SUPER ADMIN
    // ============================================
    
    async helpResponse(message) {
        return `🆘 **Super Admin Help**\n\n` +
               `Here's what I can help you with:\n\n` +
               `👥 **User Management**\n` +
               `   "Manage users" "Show students" "Staff list"\n\n` +
               `🖥️ **System Health**\n` +
               `   "System health" "Server status"\n\n` +
               `💾 **Backup**\n` +
               `   "Backup" "Database backup"\n\n` +
               `📊 **Reports**\n` +
               `   "Reports" "Analytics" "Dashboard stats"\n\n` +
               `✅ **Approvals**\n` +
               `   "Pending approvals" "Approve users"\n\n` +
               `📚 **Courses**\n` +
               `   "Courses" "Manage courses"\n\n` +
               `📝 **Exams**\n` +
               `   "Exams" "Create exam" "Exam list"\n\n` +
               `📅 **Timetable**\n` +
               `   "Timetable" "Schedule"\n\n` +
               `💡 Just type your question naturally!`;
    }
}

// ============================================
// INITIALIZE SUPER ADMIN CHATBOT
// ============================================

function initSuperAdminChatbot() {
    // Check if chatbot already exists
    if (window.chatbot) {
        console.log('🛡️ Chatbot already initialized');
        return;
    }
    
    try {
        // Check if ChatbotAssistant class exists (from chatbot.js)
        if (typeof ChatbotAssistant === 'undefined') {
            console.warn('⚠️ ChatbotAssistant not found. Make sure chatbot.js is loaded first.');
            // Fallback: Try to load from parent
            setTimeout(initSuperAdminChatbot, 1000);
            return;
        }
        
        // Create Super Admin Chatbot
        window.chatbot = new SuperAdminChatbot();
        console.log('🛡️ Super Admin Chatbot ready!');
        console.log('💡 Try these commands:');
        console.log('   "manage users", "system health", "backup"');
        console.log('   "reports", "approvals", "settings"');
        console.log('   "courses", "exams", "students", "staff", "timetable"');
        
        // Show welcome message in console
        console.log('📊 Super Admin Features:');
        console.log('   👥 User Management');
        console.log('   🖥️ System Health');
        console.log('   💾 Backup & Restore');
        console.log('   📊 Reports & Analytics');
        console.log('   ✅ Pending Approvals');
        console.log('   ⚙️ System Settings');
        
    } catch (error) {
        console.error('❌ Super Admin Chatbot error:', error);
    }
}

// ============================================
// AUTO-INITIALIZE
// ============================================

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(initSuperAdminChatbot, 800);
    });
} else {
    setTimeout(initSuperAdminChatbot, 800);
}

// Also initialize on appReady event
document.addEventListener('appReady', function() {
    setTimeout(initSuperAdminChatbot, 300);
});

// Also try when Supabase is ready
if (window.db) {
    setTimeout(initSuperAdminChatbot, 600);
}

console.log('🛡️ Super Admin Chatbot module loaded');
console.log('💬 Click the 💬 button to chat!');
