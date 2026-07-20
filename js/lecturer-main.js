// js/lecturer-main.js
/**
 * NCHSM Lecturer Main Entry Point
 * Loads all modules and initializes the application
 */

// Wait for DOM and all scripts to load
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Starting Lecturer Portal...');
    
    // Check if Utils is available
    if (typeof window.Utils === 'undefined') {
        console.warn('⚠️ Utils not found, creating fallback...');
        window.Utils = {
            formatDate: function(date) {
                if (!date) return 'N/A';
                return new Date(date).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric'
                });
            },
            formatDateTime: function(date) {
                if (!date) return 'N/A';
                return new Date(date).toLocaleString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                });
            },
            getAcademicBlocks: function(program) {
                const structure = {
                    'KRCHN': ['Introductory', 'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Final'],
                    'TVET': ['Introductory', 'Term 1', 'Term 2', 'Term 3', 'Term 4', 'Term 5', 'Term 6', 'Final']
                };
                return structure[program] || structure['KRCHN'];
            },
            calculateGrade: function(score) {
                if (!score && score !== 0) return '-';
                if (score >= 80) return 'A';
                if (score >= 75) return 'A-';
                if (score >= 70) return 'B+';
                if (score >= 65) return 'B';
                if (score >= 60) return 'B-';
                if (score >= 55) return 'C+';
                if (score >= 50) return 'C';
                if (score >= 45) return 'C-';
                if (score >= 40) return 'D+';
                if (score >= 35) return 'D';
                return 'E';
            },
            escapeHtml: function(str) {
                if (!str) return '';
                return String(str)
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;');
            }
        };
        console.log('✅ Utils fallback created in main');
    }
    
    // Check configuration first
    if (typeof window.APP_CONFIG === 'undefined' || !window.APP_CONFIG.SUPABASE_URL) {
        console.error('❌ Configuration not loaded properly');
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: #ef4444; color: white;
            display: flex; align-items: center; justify-content: center;
            font-family: 'Inter', sans-serif; padding: 20px; z-index: 9999;
            text-align: center; flex-direction: column;
        `;
        errorDiv.innerHTML = `
            <h1>⚠️ Configuration Error</h1>
            <p>config.js not loaded correctly. Please check the console.</p>
            <button onclick="window.location.reload()" style="
                margin-top: 20px; padding: 10px 30px;
                background: white; color: #ef4444; border: none;
                border-radius: 8px; font-size: 16px; cursor: pointer;
            ">Reload Page</button>
        `;
        document.body.prepend(errorDiv);
        return;
    }
    
    try {
        // 1. Initialize database
        if (!window.db || !window.db.supabase) {
            if (window.db && typeof window.db.initialize === 'function') {
                await window.db.initialize();
            } else {
                console.error('❌ Database not initialized');
                throw new Error('Database not initialized');
            }
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
        if (window.db && typeof window.db.loadUserProfile === 'function') {
            await window.db.loadUserProfile();
        }
        const profile = window.db?.getUserProfile();
        
        // 4. Verify lecturer role
        if (profile) {
            const allowedRoles = ['lecturer', 'admin', 'superadmin'];
            if (!allowedRoles.includes(profile.role)) {
                console.warn('User is not a lecturer. Role:', profile.role);
                window.location.href = 'login.html';
                return;
            }
        }
        
        // 5. Dispatch app ready event
        document.dispatchEvent(new CustomEvent('appReady'));
        
        // 6. Load initial tab from URL or storage
        const savedTab = localStorage.getItem('nchsm_current_tab') || 'dashboard';
        if (window.LecturerUI) {
            window.LecturerUI.showTab(savedTab);
        }
        
        console.log('✅ Lecturer Portal started successfully!');
        
    } catch (error) {
        console.error('❌ Failed to start Lecturer Portal:', error);
        if (window.LecturerUI) {
            window.LecturerUI.showNotification('Failed to start application: ' + error.message, 'error');
        }
    }
});

// Export all modules
window.LecturerModules = {
    UI: window.LecturerUI,
    Profile: window.LecturerProfile,
    Dashboard: window.LecturerDashboard,
    Courses: window.LecturerCourses,
    Students: window.LecturerStudents,
    Sessions: window.LecturerSessions,
    Attendance: window.LecturerAttendance,
    Exams: window.LecturerExams,
    Marks: window.LecturerMarks,
    Resources: window.LecturerResources,
    Messages: window.LecturerMessages
};

console.log('✅ Lecturer main entry point loaded');
