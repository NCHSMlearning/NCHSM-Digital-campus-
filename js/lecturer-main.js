// js/lecturer-main.js
/**
 * NCHSM Lecturer Main Entry Point
 * Uses dedicated lecturer database
 * Handles both UUID and text ID formats
 * Supports both Nursing (KRCHN) and TVET programs
 */

console.log('🚀 Lecturer Main loading...');

// ============================================================
// PROGRAM TYPE DETECTION & HELPERS
// ============================================================

// Determine program type from code
function getProgramType(programCode) {
    if (!programCode) return 'KRCHN';
    const upper = programCode.toUpperCase();
    
    // Nursing programs
    if (upper === 'KRCHN') return 'KRCHN';
    
    // TVET Programs (Diploma, Certificate, Artisan)
    const tvetPrograms = [
        // Diplomas
        'DPOTT', 'DCH', 'DHRIT', 'DSL', 'DSW', 'DCJS', 'DHSS', 'DICT', 'DME',
        // Certificates
        'CPOTT', 'CCH', 'CHRIT', 'CPC', 'CSL', 'CSW', 'CCJS', 'CAG', 'CHSS', 'CICT',
        // Artisan
        'ACH', 'AAG', 'ASW',
        // Other TVET
        'CCA', 'PTE'
    ];
    
    if (tvetPrograms.includes(upper)) return 'TVET';
    
    return 'KRCHN'; // Default
}

// Get program level (DIPLOMA, CERTIFICATE, ARTISAN)
function getProgramLevel(programCode) {
    if (!programCode) return 'DIPLOMA';
    const upper = programCode.toUpperCase();
    
    if (upper.startsWith('D')) return 'DIPLOMA';
    if (upper.startsWith('C')) return 'CERTIFICATE';
    if (upper.startsWith('A')) return 'ARTISAN';
    
    return 'DIPLOMA';
}

// Check if program is TVET
function isTVETProgram(programCode) {
    return getProgramType(programCode) === 'TVET';
}

// Check if program is Nursing
function isNursingProgram(programCode) {
    return getProgramType(programCode) === 'KRCHN';
}

// Get academic blocks/terms for a program
function getAcademicBlocks(programCode) {
    const programType = getProgramType(programCode);
    const programLevel = getProgramLevel(programCode);
    
    let options = [];
    
    if (programType === 'KRCHN') {
        // KRCHN Nursing Blocks
        options = [
            { value: 'Introductory', text: '🌟 Introductory Block' },
            { value: 'Block 1', text: '📘 Block 1' },
            { value: 'Block 2', text: '📗 Block 2' },
            { value: 'Block 3', text: '📒 Block 3' },
            { value: 'Block 4', text: '📙 Block 4' },
            { value: 'Block 5', text: '📕 Block 5' },
            { value: 'Block 6', text: '📚 Block 6' },
            { value: 'Final', text: '🏆 Final Block' }
        ];
    } else if (programType === 'TVET') {
        if (programLevel === 'DIPLOMA') {
            options = [
                { value: 'Y1T1', text: '📘 Year 1 Term 1' },
                { value: 'Y1T2', text: '📗 Year 1 Term 2' },
                { value: 'Y1T3', text: '📒 Year 1 Term 3' },
                { value: 'Y2T1', text: '📙 Year 2 Term 1' },
                { value: 'Y2T2', text: '📕 Year 2 Term 2' },
                { value: 'Y2T3', text: '📚 Year 2 Term 3' }
            ];
        } else if (programLevel === 'CERTIFICATE') {
            options = [
                { value: 'Y1T1', text: '📘 Year 1 Term 1' },
                { value: 'Y1T2', text: '📗 Year 1 Term 2' },
                { value: 'Y1T3', text: '📒 Year 1 Term 3' }
            ];
        } else if (programLevel === 'ARTISAN') {
            options = [
                { value: 'Y1T1', text: '📘 Year 1 Term 1' },
                { value: 'Y1T2', text: '📗 Year 1 Term 2' }
            ];
        } else {
            options = [
                { value: 'Introductory', text: '🌟 Introductory Term' },
                { value: 'Term1', text: '📘 Term 1' },
                { value: 'Term2', text: '📗 Term 2' },
                { value: 'Term3', text: '📒 Term 3' },
                { value: 'Term4', text: '📙 Term 4' },
                { value: 'Term5', text: '📕 Term 5' },
                { value: 'Term6', text: '📚 Term 6' },
                { value: 'Final', text: '🏆 Final Term' }
            ];
        }
    }
    
    return options;
}

// Calculate grade based on program type
function calculateGrade(score, programType = 'KRCHN') {
    if (score === null || score === undefined || isNaN(score)) {
        return { grade: '-', gradePoint: 0, status: 'N/A' };
    }
    
    const numScore = parseFloat(score);
    
    if (programType === 'TVET') {
        // TVET Grading: A(80-100%)=4, B(65-79%)=3, C(50-64%)=2, E(0-49%)=0
        if (numScore >= 80) {
            return { grade: 'A', gradePoint: 4.0, status: 'PASS' };
        } else if (numScore >= 65) {
            return { grade: 'B', gradePoint: 3.0, status: 'PASS' };
        } else if (numScore >= 50) {
            return { grade: 'C', gradePoint: 2.0, status: 'PASS' };
        } else {
            return { grade: 'E', gradePoint: 0.0, status: 'FAIL' };
        }
    } else {
        // Nursing Grading: A(75-100%)=4, B(65-74%)=3, C(60-64%)=2, D(0-59%)=0
        if (numScore >= 75) {
            return { grade: 'A', gradePoint: 4.0, status: 'PASS' };
        } else if (numScore >= 65) {
            return { grade: 'B', gradePoint: 3.0, status: 'PASS' };
        } else if (numScore >= 60) {
            return { grade: 'C', gradePoint: 2.0, status: 'PASS' };
        } else {
            return { grade: 'D', gradePoint: 0.0, status: 'FAIL' };
        }
    }
}

// Get program display name
function getProgramDisplayName(programCode) {
    const names = {
        // Nursing
        'KRCHN': 'KRCHN Nursing',
        
        // Diploma Programs
        'DPOTT': 'Diploma in Perioperative Theatre Technology',
        'DCH': 'Diploma in Community Health',
        'DHRIT': 'Diploma in Health Records and IT',
        'DSL': 'Diploma in Science Lab',
        'DSW': 'Diploma in Social Work',
        'DCJS': 'Diploma in Criminal Justice',
        'DHSS': 'Diploma in Health Support Services',
        'DICT': 'Diploma in ICT',
        'DME': 'Diploma in Medical Engineering',
        
        // Certificate Programs
        'CPOTT': 'Certificate in Perioperative Theatre Technology',
        'CCH': 'Certificate in Community Health',
        'CHRIT': 'Certificate in Health Records and IT',
        'CPC': 'Certificate in Patient Care',
        'CSL': 'Certificate in Science Lab',
        'CSW': 'Certificate in Social Work',
        'CCJS': 'Certificate in Criminal Justice',
        'CAG': 'Certificate in Agriculture',
        'CHSS': 'Certificate in Health Support Services',
        'CICT': 'Certificate in ICT',
        
        // Artisan Programs
        'ACH': 'Artisan in Community Health',
        'AAG': 'Artisan in Agriculture',
        'ASW': 'Artisan in Social Work',
        
        // Other
        'CCA': 'Certificate in Computer Applications',
        'PTE': 'TVET/CDACC'
    };
    return names[programCode] || programCode;
}

// Get program type label
function getProgramTypeLabel(programCode) {
    const type = getProgramType(programCode);
    if (type === 'KRCHN') return '🎓 Nursing';
    if (type === 'TVET') {
        const level = getProgramLevel(programCode);
        if (level === 'DIPLOMA') return '🔧 TVET Diploma';
        if (level === 'CERTIFICATE') return '🔧 TVET Certificate';
        if (level === 'ARTISAN') return '🔧 TVET Artisan';
        return '🔧 TVET';
    }
    return '📚 Unknown';
}

// ============================================================
// MAKE FUNCTIONS GLOBALLY AVAILABLE
// ============================================================

window.getProgramType = getProgramType;
window.getProgramLevel = getProgramLevel;
window.isTVETProgram = isTVETProgram;
window.isNursingProgram = isNursingProgram;
window.getAcademicBlocks = getAcademicBlocks;
window.calculateGrade = calculateGrade;
window.getProgramDisplayName = getProgramDisplayName;
window.getProgramTypeLabel = getProgramTypeLabel;

// ============================================================
// MAIN APPLICATION
// ============================================================

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
            getAcademicBlocks: getAcademicBlocks,
            calculateGrade: calculateGrade,
            escapeHtml: function(str) {
                if (!str) return '';
                return String(str)
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;');
            },
            getProgramDisplayName: getProgramDisplayName,
            getProgramType: getProgramType,
            isTVETProgram: isTVETProgram,
            getPortfolioCompletionStatus: function(stats) {
                const totalItems = (stats.totalCourses || 0) + (stats.schemesCompleted || 0) + (stats.lessonPlans || 0);
                const completedItems = stats.approved || 0;
                if (totalItems === 0) return 0;
                return Math.round((completedItems / totalItems) * 100);
            },
            getPortfolioStatusColor: function(percentage) {
                if (percentage >= 80) return '#10b981';
                if (percentage >= 50) return '#f59e0b';
                return '#ef4444';
            },
            getPortfolioStatusLabel: function(percentage) {
                if (percentage >= 80) return 'Excellent';
                if (percentage >= 60) return 'Good';
                if (percentage >= 40) return 'In Progress';
                if (percentage >= 20) return 'Needs Attention';
                return 'Not Started';
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
        
        // ==========================================
        // DETECT PROGRAM TYPE
        // ==========================================
        
        const program = profile.program || profile.department || 'KRCHN';
        const programType = getProgramType(program);
        const programLevel = getProgramLevel(program);
        const isTVET = programType === 'TVET';
        const programDisplay = getProgramDisplayName(program);
        const typeLabel = getProgramTypeLabel(program);
        
        console.log('📚 Program:', program);
        console.log('📚 Program Type:', programType);
        console.log('📚 Program Level:', programLevel);
        console.log('📚 Is TVET:', isTVET);
        
        // ==========================================
        // UPDATE UI WITH PROGRAM INFO
        // ==========================================
        
        // Update welcome header
        const welcomeHeader = document.getElementById('welcomeHeader');
        if (welcomeHeader) welcomeHeader.textContent = profile.full_name || 'Lecturer';
        
        // Update program subtitle with type
        const programSubtitle = document.getElementById('programSubtitle');
        if (programSubtitle) {
            const typeEmoji = isTVET ? '🔧' : '🎓';
            programSubtitle.textContent = `${typeEmoji} Dashboard filtered for ${programDisplay} (${typeLabel})`;
        }
        
        // Update program badge
        const programBadge = document.getElementById('userProgramBadge');
        if (programBadge) {
            const shortName = isTVET ? program : 'KRCHN';
            const badgeText = isTVET ? `${shortName} (TVET)` : `${shortName} Nursing`;
            programBadge.textContent = badgeText;
            // Add TVET badge styling
            if (isTVET) {
                programBadge.style.background = 'rgba(139,92,246,0.3)';
                programBadge.style.border = '1px solid #8b5cf6';
            }
        }
        
        // Update welcome banner
        const welcomeBanner = document.getElementById('welcomeBannerText');
        if (welcomeBanner) {
            const typeEmoji = isTVET ? '🔧' : '🎓';
            welcomeBanner.textContent = `${typeEmoji} Welcome to your Lecturer Dashboard for ${programDisplay} (${typeLabel})`;
        }
        
        // Show grading system info on dashboard
        const gradingInfo = document.getElementById('gradingSystemInfo');
        if (gradingInfo) {
            if (isTVET) {
                gradingInfo.innerHTML = `
                    <span style="background: #8b5cf6; color: white; padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 600;">
                        🔧 TVET Grading: A(80%) B(65%) C(50%) E(0%)
                    </span>
                `;
            } else {
                gradingInfo.innerHTML = `
                    <span style="background: #4C1D95; color: white; padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 600;">
                        🎓 Nursing Grading: A(75%) B(65%) C(60%) D(0%)
                    </span>
                `;
            }
        }
        
        // ==========================================
        // STORE PROGRAM TYPE FOR OTHER MODULES
        // ==========================================
        
        window.CURRENT_PROGRAM = program;
        window.CURRENT_PROGRAM_TYPE = programType;
        window.CURRENT_PROGRAM_LEVEL = programLevel;
        window.IS_TVET = isTVET;
        
        // Store in localStorage for other modules
        localStorage.setItem('currentProgram', program);
        localStorage.setItem('currentProgramType', programType);
        localStorage.setItem('isTVET', JSON.stringify(isTVET));
        
        // ==========================================
        // 7. Dispatch app ready event
        // ==========================================
        
        document.dispatchEvent(new CustomEvent('appReady'));
        
        // ==========================================
        // 8. Resolve lecturer ID for all modules
        // ==========================================
        
        const userId = profile.user_id;
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(userId));
        
        if (!isUUID) {
            console.log('🔍 Non-UUID user ID detected:', userId);
            
            try {
                const { data: staff } = await window.lecturerDB.supabase
                    .from('staff_records')
                    .select('id, first_name, other_names')
                    .eq('id', userId)
                    .maybeSingle();
                
                if (staff) {
                    console.log('✅ Found staff record with ID:', staff.id);
                    window.CORRECT_LECTURER_ID = staff.id;
                } else {
                    const { data: staffByEmail } = await window.lecturerDB.supabase
                        .from('staff_records')
                        .select('id, first_name, other_names')
                        .eq('email', profile.email)
                        .maybeSingle();
                    
                    if (staffByEmail) {
                        console.log('✅ Found staff record by email:', staffByEmail.id);
                        window.CORRECT_LECTURER_ID = staffByEmail.id;
                    }
                }
            } catch (e) {
                console.warn('Could not find staff record:', e.message);
            }
        } else {
            window.CORRECT_LECTURER_ID = userId;
        }
        
        console.log('🔑 Lecturer ID for modules:', window.CORRECT_LECTURER_ID);
        
        // ==========================================
        // 9. Initialize modules with correct ID
        // ==========================================
        
        const modules = [
            'LecturerCourses',
            'LecturerMarks', 
            'LecturerExams',
            'LecturerSessions',
            'LecturerAttendance',
            'LecturerResources',
            'LecturerMessages',
            'LecturerReports'
        ];
        
        modules.forEach(moduleName => {
            if (window[moduleName] && window[moduleName].lecturerAssignmentId !== undefined) {
                window[moduleName].lecturerAssignmentId = window.CORRECT_LECTURER_ID;
                console.log(`✅ Set ${moduleName}.lecturerAssignmentId to:`, window.CORRECT_LECTURER_ID);
            }
        });
        
        // ==========================================
        // 10. Initialize Academic Portfolio
        // ==========================================
        
        console.log('📁 Initializing Academic Portfolio...');
        if (window.AcademicPortfolio && typeof window.AcademicPortfolio.init === 'function') {
            if (window.AcademicPortfolio.lecturerId !== undefined) {
                window.AcademicPortfolio.lecturerId = window.CORRECT_LECTURER_ID;
            }
            window.AcademicPortfolio.init();
            console.log('✅ Academic Portfolio initialized');
        } else {
            console.warn('⚠️ AcademicPortfolio not found - module may not be loaded');
            if (typeof window.AcademicPortfolio === 'undefined') {
                window.AcademicPortfolio = {
                    init: function() {
                        console.log('⚠️ AcademicPortfolio fallback init called');
                    },
                    loadDashboard: function() {
                        console.log('⚠️ AcademicPortfolio fallback loadDashboard called');
                        const container = document.getElementById('ap-content');
                        if (container) {
                            container.innerHTML = `
                                <div style="text-align: center; padding: 60px 20px; color: #94a3b8;">
                                    <i class="fas fa-folder-open" style="font-size: 40px; color: #10b981;"></i>
                                    <h3 style="color: #1e293b; margin-top: 15px;">Academic Portfolio</h3>
                                    <p style="color: #94a3b8;">Loading portfolio module... Please refresh if this persists.</p>
                                    <button onclick="window.location.reload()" style="margin-top: 20px; background: #10b981; color: white; border: none; padding: 10px 24px; border-radius: 8px; cursor: pointer;">
                                        <i class="fas fa-sync-alt"></i> Refresh Page
                                    </button>
                                </div>
                            `;
                        }
                    },
                    refresh: function() {
                        this.loadDashboard();
                    },
                    switchTab: function(tab) {
                        this.loadDashboard();
                    }
                };
                console.log('✅ AcademicPortfolio fallback created');
            }
        }
        
        // ==========================================
        // 11. Load initial tab
        // ==========================================
        
        const savedTab = localStorage.getItem('nchsm_current_tab') || 'dashboard';
        if (window.LecturerUI) {
            console.log('📂 Loading tab:', savedTab);
            window.LecturerUI.showTab(savedTab);
        }
        
        // ==========================================
        // 12. SHOW SUCCESS NOTIFICATION
        // ==========================================
        
        setTimeout(function() {
            let name = 'Lecturer';
            try {
                const profileData = localStorage.getItem('userProfile');
                if (profileData) {
                    const data = JSON.parse(profileData);
                    name = data.full_name || data.name || 'Lecturer';
                } else if (profile) {
                    name = profile.full_name || profile.name || 'Lecturer';
                }
            } catch(e) {
                name = 'Lecturer';
            }
            
            const typeEmoji = isTVET ? '🔧' : '🎓';
            const programName = isTVET ? `${program} (TVET)` : `${program} Nursing`;
            
            const message = `👋 Welcome back, ${name}! ${typeEmoji} ${programName} Dashboard loaded ✅`;
            
            // Use the UI notification system
            if (window.LecturerUI && typeof window.LecturerUI.showNotification === 'function') {
                window.LecturerUI.showNotification(message, 'success');
            } else if (typeof window.showNotification === 'function') {
                window.showNotification(message, 'success');
            } else {
                console.log(`✅ Dashboard loaded for ${name} (${programName})`);
                
                // Simple toast fallback
                try {
                    document.querySelectorAll('.dashboard-success-toast').forEach(el => el.remove());
                    
                    const toast = document.createElement('div');
                    toast.className = 'dashboard-success-toast';
                    toast.style.cssText = `
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        background: ${isTVET ? '#8b5cf6' : '#10b981'};
                        color: white;
                        padding: 16px 24px;
                        border-radius: 12px;
                        font-weight: 500;
                        z-index: 999999;
                        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                        font-size: 14px;
                        animation: slideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                        border-left: 4px solid rgba(255,255,255,0.3);
                        max-width: 450px;
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        font-family: 'Inter', system-ui, sans-serif;
                    `;
                    toast.innerHTML = `
                        <span style="font-size: 20px;">${isTVET ? '🔧' : '👋'}</span>
                        <span>Welcome back, <strong>${name}</strong>! <br><span style="font-size: 12px; opacity: 0.9;">${programName} Dashboard loaded ✅</span></span>
                        <button onclick="this.parentElement.remove()" style="
                            background: none;
                            border: none;
                            color: rgba(255,255,255,0.7);
                            cursor: pointer;
                            font-size: 16px;
                            padding: 0 4px;
                            margin-left: 4px;
                            transition: color 0.2s;
                        " onmouseover="this.style.color='white'" onmouseout="this.style.color='rgba(255,255,255,0.7)'">
                            ✕
                        </button>
                    `;
                    document.body.appendChild(toast);
                    
                    setTimeout(() => {
                        if (toast.parentNode) {
                            toast.style.animation = 'slideOut 0.3s ease forwards';
                            setTimeout(() => toast.remove(), 300);
                        }
                    }, 5000);
                    
                    if (!document.getElementById('toastAnimations')) {
                        const style = document.createElement('style');
                        style.id = 'toastAnimations';
                        style.textContent = `
                            @keyframes slideIn {
                                from { opacity: 0; transform: translateX(40px) scale(0.95); }
                                to { opacity: 1; transform: translateX(0) scale(1); }
                            }
                            @keyframes slideOut {
                                from { opacity: 1; transform: translateX(0) scale(1); }
                                to { opacity: 0; transform: translateX(40px) scale(0.95); }
                            }
                        `;
                        document.head.appendChild(style);
                    }
                } catch(e) {
                    console.log('Could not create toast notification:', e);
                }
            }
        }, 1500);
        
        console.log('✅ Lecturer Portal started successfully!');
        console.log(`📚 Program: ${program} (${programType})`);
        console.log(`📚 Level: ${programLevel}`);
        
    } catch (error) {
        console.error('❌ Failed to start Lecturer Portal:', error);
        
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

// ============================================================
// EXPORT ALL MODULES
// ============================================================

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
    Messages: window.LecturerMessages,
    Reports: window.LecturerReports,
    Calendar: window.LecturerCalendar,
    AcademicPortfolio: window.AcademicPortfolio,
    // TVET/Nursing helpers
    getProgramType: getProgramType,
    getProgramLevel: getProgramLevel,
    isTVETProgram: isTVETProgram,
    isNursingProgram: isNursingProgram,
    getAcademicBlocks: getAcademicBlocks,
    calculateGrade: calculateGrade,
    getProgramDisplayName: getProgramDisplayName,
    getProgramTypeLabel: getProgramTypeLabel
};

console.log('✅ Lecturer main entry point loaded');
console.log('✅ TVET/Nursing support enabled');
