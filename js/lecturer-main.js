// js/lecturer-main.js
/**
 * NCHSM Lecturer Main Entry Point
 * Loads all modules and initializes the application
 */

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Starting Lecturer Portal...');
    
    try {
        // 1. Initialize database
        if (!window.db || !window.db.supabase) {
            await window.db?.initialize();
        }
        
        // 2. Check authentication
        if (window.db && typeof window.db.checkAuth === 'function') {
            const isAuthenticated = await window.db.checkAuth();
            if (!isAuthenticated) {
                window.location.href = 'login.html';
                return;
            }
        }
        
        // 3. Load user profile
        await window.db?.loadUserProfile();
        const profile = window.db?.getUserProfile();
        
        // 4. Verify lecturer role
        if (profile && profile.role !== 'lecturer' && profile.role !== 'admin' && profile.role !== 'superadmin') {
            console.warn('User is not a lecturer. Role:', profile.role);
            window.location.href = 'login.html';
            return;
        }
        
        // 5. Dispatch app ready event
        document.dispatchEvent(new CustomEvent('appReady'));
        
        // 6. Initialize UI (already done by LecturerUI)
        
        console.log('✅ Lecturer Portal started successfully!');
        
    } catch (error) {
        console.error('❌ Failed to start Lecturer Portal:', error);
        LecturerUI?.showNotification('Failed to start application: ' + error.message, 'error');
    }
});

// Re-export all modules
window.LecturerModules = {
    UI: LecturerUI,
    Profile: LecturerProfile,
    Dashboard: LecturerDashboard,
    Courses: LecturerCourses,
    Students: LecturerStudents,
    Sessions: LecturerSessions,
    Attendance: LecturerAttendance,
    Exams: LecturerExams,
    Marks: LecturerMarks,
    Resources: LecturerResources,
    Messages: LecturerMessages
};
