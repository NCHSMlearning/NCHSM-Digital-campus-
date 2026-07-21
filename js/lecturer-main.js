// js/lecturer-main.js
/**
 * NCHSM Lecturer Main Entry Point
 * Uses dedicated lecturer database
 */

console.log('🚀 Lecturer Main loading...');

// Wait for DOM to load
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
            },
            getProgramDisplayName: function(programCode) {
                const names = {
                    'KRCHN': 'KRCHN Nursing',
                    'DPOTT': 'Diploma in Perioperative Theatre Technology',
                    'DCH': 'Diploma in Community Health',
                    'DHRIT': 'Diploma in Health Records and IT',
                    'DSL': 'Diploma in Science Lab',
                    'DSW': 'Diploma in Social Work',
                    'DCJS': 'Diploma in Criminal Justice',
                    'DHSS': 'Diploma in Health Support Services',
                    'DICT': 'Diploma in ICT',
                    'DME': 'Diploma in Medical Engineering'
                };
                return names[programCode] || programCode;
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
        // ==========================================
        // USE LECTURER DB - NOT THE STUDENT DB
        // ==========================================
        
        // 1. Wait for lecturerDB to be available
        let retries = 0;
        const maxRetries = 20;
        
        console.log('⏳ Waiting for lecturerDB...');
        while (typeof window.lecturerDB === 'undefined' && retries < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 200));
            retries++;
        }
        
        if (typeof window.lecturerDB === 'undefined') {
            throw new Error('lecturerDB not loaded after ' + maxRetries + ' retries');
        }
        console.log('✅ lecturerDB found');
        
        // 2. Initialize lecturer database
        if (!window.lecturerDB.isInitialized) {
            console.log('📦 Initializing lecturer database...');
            await window.lecturerDB.initialize();
        }
        console.log('✅ lecturerDB initialized:', window.lecturerDB.isInitialized);
        
        // 3. Check authentication using lecturerDB
        console.log('🔐 Checking authentication...');
        const isAuthenticated = await window.lecturerDB.checkAuth();
        
        if (!isAuthenticated) {
            console.warn('⚠️ Not authenticated, redirecting to login...');
            window.location.href = 'login.html';
            return;
        }
        console.log('✅ Authenticated');
        
        // 4. Get profile from lecturerDB
        const profile = window.lecturerDB.getCurrentUserProfile();
        console.log('👤 Profile:', profile?.full_name || 'No profile');
        
        if (!profile) {
            console.warn('⚠️ No lecturer profile found');
            window.location.href = 'login.html';
            return;
        }
        
        // 5. Verify lecturer role
        const allowedRoles = ['lecturer', 'admin', 'superadmin'];
        if (!allowedRoles.includes(profile.role)) {
            console.warn('❌ User is not a lecturer. Role:', profile.role);
            if (profile.role === 'student') {
                window.location.href = 'student.html';
            } else {
                window.location.href = 'login.html';
            }
            return;
        }
        
        console.log('✅ Lecturer authenticated:', profile.full_name);
        console.log('📚 Program:', profile.program || profile.department);
        
        // 6. Update UI with lecturer info
        const program = profile.program || profile.department || 'KRCHN';
        const programDisplay = window.Utils?.getProgramDisplayName(program) || program;
        
        // Update welcome header
        const welcomeHeader = document.getElementById('welcomeHeader');
        if (welcomeHeader) welcomeHeader.textContent = profile.full_name || 'Lecturer';
        
        // Update program subtitle
        const programSubtitle = document.getElementById('programSubtitle');
        if (programSubtitle) {
            programSubtitle.textContent = `Dashboard filtered for ${programDisplay}`;
        }
        
        // Update program badge
        const programBadge = document.getElementById('userProgramBadge');
        if (programBadge) programBadge.textContent = programDisplay;
        
        // Update welcome banner
        const welcomeBanner = document.getElementById('welcomeBannerText');
        if (welcomeBanner) {
            welcomeBanner.textContent = `Welcome to your Lecturer Dashboard for ${programDisplay}`;
        }
        
        // 7. Dispatch app ready event
        document.dispatchEvent(new CustomEvent('appReady'));
        
        // 8. Load initial tab from URL or storage
        const savedTab = localStorage.getItem('nchsm_current_tab') || 'dashboard';
        if (window.LecturerUI) {
            console.log('📂 Loading tab:', savedTab);
            window.LecturerUI.showTab(savedTab);
        }
        
        console.log('✅ Lecturer Portal started successfully!');
        
    } catch (error) {
        console.error('❌ Failed to start Lecturer Portal:', error);
        // Show error on page
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: #ef4444; color: white;
            display: flex; align-items: center; justify-content: center;
            font-family: 'Inter', sans-serif; padding: 20px; z-index: 9999;
            text-align: center; flex-direction: column;
        `;
        errorDiv.innerHTML = `
            <h1>⚠️ Error Starting Lecturer Portal</h1>
            <p style="max-width: 500px;">${error.message}</p>
            <p style="font-size:14px;margin-top:10px;color:#fca5a5;">Check browser console for details</p>
            <button onclick="window.location.reload()" style="
                margin-top: 20px; padding: 10px 30px;
                background: white; color: #ef4444; border: none;
                border-radius: 8px; font-size: 16px; cursor: pointer;
            ">Reload Page</button>
        `;
        document.body.prepend(errorDiv);
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
