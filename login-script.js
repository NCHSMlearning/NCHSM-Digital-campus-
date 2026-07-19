// ============================================
// NCHSM SECURE LOGIN SYSTEM - ULTIMATE
// Version: 4.0 - Fixed Session + Theme Toggle
// Copyright © 2026 Nakuru College of Health Sciences and Management
// ============================================
  // ============================================
// 🚀 HIDE .html EXTENSION IN URL
// ============================================
if (window.location.pathname.endsWith('.html')) {
    const cleanPath = window.location.pathname.replace(/\.html$/, '');
    window.history.replaceState({}, '', cleanPath);
}
// ============================================
// QUEUE SYSTEM - BYPASSED
// ============================================
const LoginQueue = {
    queue: [],
    active: 0,
    maxConcurrent: 999,
    
    async add(email, password) {
        return await NCHSMLogin.executeLogin(email, password);
    },
    
    process() { return; },
    executeWithTimeout() { return; },
    showStatus() { 
        const el = document.getElementById('queueStatus');
        if (el) el.style.display = 'none';
    }
};

// ============================================
// MAIN LOGIN SYSTEM
// ============================================
window.NCHSMLogin = {
    // ===== STATE =====
    state: {
        currentUser: null,
        isLoggingIn: false,
        failedAttempts: 0,
        lastFailedTime: null,
        trustedDevices: JSON.parse(localStorage.getItem('trusted_devices') || '{}'),
        sessionId: null,
        isInitialized: false,
        maxAttempts: 5
    },
    
    // ===== SECURITY CONFIG =====
    security: {
        maxFailedAttempts: 5,
        lockoutDuration: 15 * 60 * 1000,
        minPasswordLength: 8,
        sessionTimeout: 24 * 60 * 60 * 1000,
        rateLimit: {
            enabled: true,
            maxRequests: 10,
            timeWindow: 60 * 1000
        },
        csrfProtection: true,
        requireTwoFactor: false
    },
 // ============================================
// BREVO CONFIGURATION - USING ENV VARIABLES
// ============================================
brevo: {
    apiKey: process.env.BREVO_API_KEY || 'YOUR_API_KEY_HERE',  // ← Use env var
    apiUrl: process.env.BREVO_API_URL || 'https://api.brevo.com/v3/smtp/email',
    enabled: true,
    sender: {
        email: process.env.BREVO_SENDER_EMAIL || 'noreply@nakurucollegeofhealthelearning.site',
        name: process.env.BREVO_SENDER_NAME || 'NCHSM ICT Support'
    }
},
    // ===== RATE LIMITING =====
    rateLimit: {
        requests: [],
        blockedUntil: null
    },
    
    // ===== CSRF TOKEN =====
    csrfToken: null,
    
    // ===== SESSION MONITORING =====
    sessionCheckInterval: null,
    
    // ===== SUPABASE =====
    supabase: null,
    
    // ===== STAFF RECORDS =====
    staffRecords: [],
    
  // ============================================
// INITIALIZATION
// ============================================
init: function() {
    if (this.state.isInitialized) {
        console.log('⚠️ NCHSMLogin already initialized');
        return;
    }
    
    console.log('🚀 Initializing NCHSMLogin v4.0...');
    console.log('🛡️ Ultimate Security Edition');
    console.log('🌓 Theme Toggle + Session Tracking Fixed');
    
    // Hide console from hackers
    this.disableDeveloperTools();
    
    // Initialize Feather Icons
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
    
    // Generate CSRF token
    this.generateCSRFToken();
    
    // Check for trusted device
    this.checkTrustedDevice();
    
    // Initialize password toggle
    this.initPasswordToggle();
    
    // ✅ INITIALIZE PASSWORD STRENGTH METER
    this.initPasswordStrength();  // ← ADD THIS LINE
    
    // Initialize login form
    this.initLoginForm();
    
    // Initialize modals
    this.initModals();
    
    // Focus management
    this.initFocusManagement();
    
    // Virtual keyboard handler
    this.initVirtualKeyboardHandler();
    
    // Initialize Supabase
    this.initSupabase();
    
    // Load staff records
    this.loadStaffRecords();
    
    // Clear URL parameters
    this.clearURLParameters();
    
    // Add honeypot
    this.addHoneypot();
    
    // Start session monitoring
    this.startSessionMonitoring();
    
    // Network status
    this.initNetworkStatus();
    
    // OTP input handling
    this.initOTPInputs();
    
    // Ripple effect on buttons
    this.initRippleEffect();
    
    // Hide skeleton loader
    this.hideSkeletonLoader();
    
    // ✅ INITIALIZE THEME TOGGLE
    this.initThemeToggle();
    
    // Mark as initialized
    this.state.isInitialized = true;
    
    console.log('✅ NCHSMLogin v4.0 initialized');
    console.log(`🕐 ${new Date().toLocaleString()}`);
},
    // ============================================
    // THEME TOGGLE - FIXED
    // ============================================
    initThemeToggle: function() {
        const toggleBtn = document.getElementById('themeToggle');
        const themeIcon = document.getElementById('themeIcon');
        const themeLabel = document.getElementById('themeLabel');
        
        if (!toggleBtn) {
            console.warn('⚠️ Theme toggle button not found');
            return;
        }
        
        // Check saved preference
        const savedTheme = localStorage.getItem('nchsm_theme') || 'light';
        console.log('🌓 Saved theme:', savedTheme);
        
        // Apply saved theme
        this.applyTheme(savedTheme);
        
        // Toggle on click
        toggleBtn.addEventListener('click', () => {
            const currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            this.applyTheme(newTheme);
            localStorage.setItem('nchsm_theme', newTheme);
            console.log('🌓 Theme changed to:', newTheme);
        });
        
        console.log('✅ Theme toggle initialized');
    },
    
    applyTheme: function(theme) {
        const themeIcon = document.getElementById('themeIcon');
        const themeLabel = document.getElementById('themeLabel');
        
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
            document.body.classList.remove('light-theme');
            if (themeIcon) {
                themeIcon.setAttribute('data-feather', 'moon');
            }
            if (themeLabel) {
                themeLabel.textContent = 'Dark';
            }
            console.log('🌙 Dark mode applied');
        } else {
            document.body.classList.add('light-theme');
            document.body.classList.remove('dark-theme');
            if (themeIcon) {
                themeIcon.setAttribute('data-feather', 'sun');
            }
            if (themeLabel) {
                themeLabel.textContent = 'Light';
            }
            console.log('☀️ Light mode applied');
        }
        
        // Re-render Feather icons
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    },
    
    // ============================================
    // SESSION TRACKING - FIXED VERSION
    // ============================================
    trackUserSession: async function(userId, email, sessionToken, userAgent, isStaff = false) {
        console.log('🔍 TRACKING SESSION STARTED');
        console.log('👤 User ID:', userId);
        console.log('📧 Email:', email);
        console.log('📝 Token:', sessionToken ? sessionToken.substring(0, 15) + '...' : 'NO TOKEN');
        console.log('👔 Is Staff:', isStaff);
        
        try {
            // Check if supabase is available
            if (!this.supabase) {
                console.error('❌ Supabase not initialized!');
                return null;
            }
            
            // Get IP address
            let ipAddress = 'unknown';
            try {
                const ipResponse = await fetch('https://api.ipify.org?format=json');
                const ipData = await ipResponse.json();
                ipAddress = ipData.ip;
                console.log('🌐 IP Address:', ipAddress);
            } catch (ipError) {
                console.warn('⚠️ Could not get IP, using "unknown"');
            }
            
            // Parse device info
            const deviceInfo = this.parseUserAgent(userAgent);
            console.log('📱 Device Info:', deviceInfo);
            
            // Set expiry (24 hours from now)
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24);
            console.log('⏰ Expires At:', expiresAt.toISOString());
            
            // Hash the token (for security)
            const hashedToken = await this.hashToken(sessionToken);
            console.log('🔐 Token hashed successfully');
            
            // Prepare session data
            const sessionData = {
                user_id: userId,
                session_token: hashedToken,
                ip_address: ipAddress,
                user_agent: userAgent || 'Unknown',
                device_info: deviceInfo,
                login_time: new Date().toISOString(),
                last_activity: new Date().toISOString(),
                expires_at: expiresAt.toISOString(),
                is_active: true,
                login_type: isStaff ? 'staff' : 'user',
                created_at: new Date().toISOString()
            };
            
            console.log('📦 Inserting session data...');
            
            // Insert session
            const { data, error } = await this.supabase
                .from('user_sessions')
                .insert(sessionData)
                .select();
            
            if (error) {
                console.error('❌ Session insert ERROR:', error);
                console.error('❌ Error details:', JSON.stringify(error, null, 2));
                
                // Try insert without select
                console.log('🔄 Retrying without .select()...');
                const { error: insertError } = await this.supabase
                    .from('user_sessions')
                    .insert(sessionData);
                
                if (insertError) {
                    console.error('❌ Second attempt failed:', insertError);
                    return null;
                }
                console.log('✅ Session inserted successfully (without select)');
                return { id: 'inserted' };
            }
            
            console.log('✅ Session tracked successfully!');
            console.log('📊 Session ID:', data?.[0]?.id);
            
            // Store session ID in local storage
            if (data && data[0]) {
                localStorage.setItem('session_id', data[0].id);
            }
            
            return data?.[0];
            
        } catch (error) {
            console.error('❌ Session tracking ERROR:', error);
            console.error('❌ Error stack:', error.stack);
            // Don't block login if session tracking fails
            return null;
        }
    },
    
 // ============================================
// COMPLETE LOGIN - WITH NOTIFICATIONS
// ============================================
completeLogin: async function(profileData, sessionToken, isStaff = false) {
    console.log('🎉 COMPLETE LOGIN STARTED');
    console.log('📊 Profile Data:', profileData);
    console.log('🔑 Session Token:', sessionToken ? sessionToken.substring(0, 15) + '...' : 'NO TOKEN');
    console.log('👔 Is Staff:', isStaff);
    
    try {
        // ✅ FIX: WAIT for updateLastLogin to complete
        if (!isStaff) {
            console.log('📝 Updating last login...');
            const updateResult = await this.updateLastLogin(profileData.user_id, profileData.email);
            console.log('📝 Update result:', updateResult ? '✅ SUCCESS' : '❌ FAILED');
            
            // If update failed, try force update
            if (!updateResult) {
                console.log('⚠️ updateLastLogin failed, trying force update...');
                await this.forceUpdateLoginCount(profileData.user_id);
            }
        }
        
        // 2. TRACK SESSION - THIS IS THE IMPORTANT PART
        console.log('🔍 Attempting to track session...');
        const sessionResult = await this.trackUserSession(
            profileData.user_id, 
            profileData.email, 
            sessionToken, 
            navigator.userAgent, 
            isStaff
        );
        
        if (sessionResult) {
            console.log('✅ Session tracked successfully!');
        } else {
            console.warn('⚠️ Session tracking returned null/undefined');
        }
        
        // 3. Store profile (minimal)
        const safeProfile = {
            user_id: profileData.user_id,
            email: profileData.email,
            full_name: profileData.full_name,
            role: profileData.role,
            program: profileData.program || profileData.department,
            is_staff: isStaff || false
        };
        localStorage.setItem('userProfile', JSON.stringify(safeProfile));
        console.log('💾 Profile stored in localStorage');
        
        // 4. Store session expiry
        if (!isStaff && this.supabase) {
            try {
                const { data: { session } } = await this.supabase.auth.getSession();
                if (session) {
                    localStorage.setItem('session_expires', session.expires_at);
                    console.log('⏰ Session expiry stored:', session.expires_at);
                }
            } catch (err) {
                console.warn('⚠️ Could not get session expiry:', err);
            }
        }
        
        // 5. Update last login info on page
        this.updateLastLoginInfo();
        
        // 🆕 5b. Send login notification (for students only)
        if (profileData.role === 'student' && !isStaff) {
            console.log('📧 Sending login notification...');
            this.sendLoginNotification(profileData).catch(err => {
                console.warn('⚠️ Login notification failed:', err);
            });
        }
        
        // 6. Redirect
        console.log('🚀 Redirecting to dashboard...');
        this.redirectToDashboard(profileData);
        
    } catch (error) {
        console.error('❌ Complete login error:', error);
        console.error('❌ Error stack:', error.stack);
        // Still redirect even if tracking fails
        this.redirectToDashboard(profileData);
    }
},
// ============================================
// FORCE UPDATE LOGIN COUNT - NEW FUNCTION
// ============================================
forceUpdateLoginCount: async function(userId) {
    try {
        console.log('🔧 Force updating login count for user:', userId);
        
        // Count sessions
        const { data: sessions, error: sessionsError } = await this.supabase
            .from('user_sessions')
            .select('id')
            .eq('user_id', userId);
        
        if (sessionsError) {
            console.error('❌ Error counting sessions:', sessionsError);
            return false;
        }
        
        const sessionCount = sessions?.length || 0;
        console.log('📊 Total sessions found:', sessionCount);
        
        // Update login_count to match sessions
        const { error: updateError } = await this.supabase
            .from('consolidated_user_profiles_table')
            .update({
                login_count: sessionCount,
                last_login: new Date().toISOString(),
                last_activity: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);
        
        if (updateError) {
            console.error('❌ Error updating login count:', updateError);
            return false;
        }
        
        console.log(`✅ Login count force updated to ${sessionCount}`);
        console.log(`✅ Login points: ${sessionCount * 10}`);
        return true;
        
    } catch (error) {
        console.error('❌ Force update error:', error);
        return false;
    }
},
        // ============================================
    // SEND LOGIN NOTIFICATION
    // ============================================
    sendLoginNotification: async function(studentData) {
        // Only for students
        if (!studentData || studentData.role === 'staff' || studentData.is_staff) return;
        if (!studentData.email || !this.brevo.enabled) return;
        
        try {
            const sender = this.brevo.senders.security;
            
            // Get IP
            let ip = 'Unknown';
            try {
                const res = await fetch('https://api.ipify.org?format=json');
                const data = await res.json();
                ip = data.ip;
            } catch(e) {}
            
            const now = new Date();
            const time = now.toLocaleString('en-KE', { 
                timeZone: 'Africa/Nairobi',
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            const device = this.parseUserAgent(navigator.userAgent);
            
            const response = await fetch(this.brevo.apiUrl, {
                method: 'POST',
                headers: {
                    'api-key': this.brevo.apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sender: { 
                        email: sender.email, 
                        name: sender.name
                    },
                    to: [{ email: studentData.email }],
                    subject: '🔐 New Login Alert - NCHSM Student Portal',
                    htmlContent: this.buildLoginEmail(
                        studentData.full_name || studentData.name || 'Student',
                        studentData.email,
                        studentData.student_id || studentData.user_id || 'N/A',
                        studentData.program || studentData.department || 'N/A',
                        studentData.block || studentData.year || 'N/A',
                        ip,
                        device,
                        time
                    )
                })
            });
            
            const data = await response.json();
            if (response.ok) {
                console.log(`✅ Login notification sent to ${studentData.email}`);
            } else {
                console.error('❌ Login notification failed:', data);
            }
            
        } catch(e) {
            console.warn('⚠️ Login notification error:', e);
        }
    },

      // ============================================
    // BUILD LOGIN EMAIL
    // ============================================
    buildLoginEmail: function(name, email, studentId, program, block, ip, device, time) {
        return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f0f4f8;">
    <div style="background: white; border-radius: 16px; padding: 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0;">
            <div style="display: inline-block; background: #0A3D62; border-radius: 50%; padding: 12px;">
                <span style="font-size: 32px;">🔐</span>
            </div>
            <h2 style="color: #0A3D62; margin: 10px 0 5px;">New Login Detected</h2>
            <p style="color: #64748B; margin: 0;">Nakuru College of Health Sciences and Management</p>
        </div>
        
        <div style="background: #e8f4f8; border-radius: 12px; padding: 16px; margin-bottom: 20px; border-left: 4px solid #0A3D62;">
            <p style="margin: 0; font-size: 16px; color: #0A3D62;">
                👋 <strong>Hello ${name}</strong>
            </p>
            <p style="margin: 8px 0 0; color: #1e293b;">
                Your NCHSM student account was just accessed. If this was you, no action is needed. If not, contact ICT Support immediately.
            </p>
        </div>
        
        <div style="background: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
            <h4 style="margin: 0 0 12px 0; color: #1e293b;">📋 Login Details</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr><td style="padding: 6px 0; color: #64748B;">👤 Name</td><td style="padding: 6px 0; color: #0A3D62; font-weight: 500;">${name}</td></tr>
                <tr><td style="padding: 6px 0; color: #64748B;">🆔 Student ID</td><td style="padding: 6px 0; color: #0A3D62; font-weight: 500;">${studentId}</td></tr>
                <tr><td style="padding: 6px 0; color: #64748B;">📚 Program</td><td style="padding: 6px 0; color: #0A3D62; font-weight: 500;">${program}</td></tr>
                <tr><td style="padding: 6px 0; color: #64748B;">📌 Block</td><td style="padding: 6px 0; color: #0A3D62; font-weight: 500;">${block}</td></tr>
                <tr><td style="padding: 6px 0; color: #64748B;">📧 Email</td><td style="padding: 6px 0; color: #0A3D62; font-weight: 500;">${email}</td></tr>
                <tr><td style="padding: 6px 0; color: #64748B;">🌐 IP</td><td style="padding: 6px 0; color: #dc2626; font-weight: 600;">${ip}</td></tr>
                <tr><td style="padding: 6px 0; color: #64748B;">💻 Device</td><td style="padding: 6px 0; color: #0A3D62; font-weight: 500;">${device}</td></tr>
                <tr><td style="padding: 6px 0; color: #64748B;">🕐 Time</td><td style="padding: 6px 0; color: #0A3D62; font-weight: 500;">${time}</td></tr>
            </table>
        </div>
        
        <div style="background: #fef3c7; border-radius: 12px; padding: 16px; border-left: 4px solid #F59E0B;">
            <h5 style="margin: 0 0 8px 0; color: #92400E;">💡 Security Tips</h5>
            <ul style="margin: 0; padding-left: 20px; color: #78350F; font-size: 13px; line-height: 1.6;">
                <li>If this wasn't you, contact NCHSM ICT Support immediately</li>
                <li>Never share your login credentials</li>
                <li>Use a strong, unique password</li>
            </ul>
        </div>
        
        <hr style="border: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">
            NCHSM ICT Support<br>
            📧 ict@nakurucollegeofhealthelearning.site<br>
            📞 +254 700 000 000<br>
            © ${new Date().getFullYear()} NCHSM
        </p>
    </div>
</body>
</html>
        `;
    },
    // ============================================
    // HIDE SKELETON LOADER
    // ============================================
    hideSkeletonLoader: function() {
        const skeleton = document.getElementById('skeletonLoader');
        if (skeleton) {
            setTimeout(() => {
                skeleton.classList.remove('active');
            }, 1000);
        }
    },
    
    // ============================================
    // RIPPLE EFFECT
    // ============================================
    initRippleEffect: function() {
        document.querySelectorAll('.login-button, .sso-btn, .btn-primary, .theme-toggle-btn').forEach(button => {
            button.addEventListener('click', function(e) {
                const rect = this.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                const ripple = document.createElement('span');
                ripple.className = 'ripple';
                ripple.style.left = x + 'px';
                ripple.style.top = y + 'px';
                this.appendChild(ripple);
                
                setTimeout(() => {
                    ripple.remove();
                }, 600);
            });
        });
    },
    
    // ============================================
    // OTP INPUT HANDLING
    // ============================================
    initOTPInputs: function() {
        document.querySelectorAll('.otp-digit').forEach((input, index, inputs) => {
            input.addEventListener('input', function() {
                if (this.value.length === 1 && index < inputs.length - 1) {
                    inputs[index + 1].focus();
                }
                const allFilled = Array.from(inputs).every(inp => inp.value.length === 1);
                if (allFilled) {
                    document.querySelector('.verify-otp')?.click();
                }
            });
            
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Backspace' && this.value.length === 0 && index > 0) {
                    inputs[index - 1].focus();
                }
                if (e.key === 'Enter') {
                    document.querySelector('.verify-otp')?.click();
                }
                if (e.key === 'ArrowRight' && index < inputs.length - 1) {
                    inputs[index + 1].focus();
                }
                if (e.key === 'ArrowLeft' && index > 0) {
                    inputs[index - 1].focus();
                }
            });
            
            input.addEventListener('paste', function(e) {
                const paste = (e.clipboardData || window.clipboardData).getData('text');
                if (paste && paste.length === 6 && /^\d+$/.test(paste)) {
                    e.preventDefault();
                    inputs.forEach((inp, i) => {
                        inp.value = paste[i] || '';
                    });
                    document.querySelector('.verify-otp')?.click();
                }
            });
        });
    },
    
    // ============================================
    // LOAD STAFF RECORDS
    // ============================================
    loadStaffRecords: async function() {
        try {
            if (!this.supabase) return;
            
            const { data, error } = await this.supabase
                .from('staff_records')
                .select('id, email, first_name, other_names, department, designation, login_enabled, status, password_hash')
                .eq('login_enabled', true)
                .eq('status', 'active');
            
            if (!error && data) {
                this.staffRecords = data;
                console.log(`📋 Loaded ${this.staffRecords.length} staff records`);
            }
        } catch (error) {
            console.error('Error loading staff records:', error);
        }
    },
    
    // ============================================
    // DISABLE DEVELOPER TOOLS
    // ============================================
    disableDeveloperTools: function() {
        document.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            return false;
        });
        
        document.addEventListener('keydown', function(e) {
            if (e.key === 'F12' || 
                (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
                (e.ctrlKey && e.key === 'u') ||
                (e.ctrlKey && e.key === 's')) {
                e.preventDefault();
                return false;
            }
        });
        
        const originalConsoleLog = console.log;
        console.log = function() {
            const args = Array.from(arguments);
            if (args.some(arg => typeof arg === 'string' && 
                (arg.includes('password') || arg.includes('token') || arg.includes('key') || 
                 arg.includes('secret') || arg.includes('credential')))) {
                return;
            }
            originalConsoleLog.apply(console, args);
        };
        
        const originalConsoleTable = console.table;
        console.table = function() {
            const args = Array.from(arguments);
            if (args.some(arg => typeof arg === 'object' && arg !== null && 
                (arg.password || arg.token || arg.key || arg.secret))) {
                return;
            }
            originalConsoleTable.apply(console, args);
        };
    },
    
    // ============================================
    // CSRF TOKEN MANAGEMENT
    // ============================================
    generateCSRFToken: function() {
        this.csrfToken = this.generateSecureToken();
        sessionStorage.setItem('csrf_token', this.csrfToken);
        
        const form = document.getElementById('loginForm');
        if (form) {
            let csrfInput = document.getElementById('csrf_token');
            if (!csrfInput) {
                csrfInput = document.createElement('input');
                csrfInput.type = 'hidden';
                csrfInput.id = 'csrf_token';
                csrfInput.name = 'csrf_token';
                form.appendChild(csrfInput);
            }
            csrfInput.value = this.csrfToken;
        }
    },
    
    validateCSRFToken: function(token) {
        if (!this.security.csrfProtection) return true;
        
        const stored = sessionStorage.getItem('csrf_token');
        if (!stored || !token || stored !== token) {
            this.showError('Security validation failed. Please refresh the page.');
            return false;
        }
        return true;
    },
    
    // ============================================
    // CLEAR URL PARAMETERS
    // ============================================
    clearURLParameters: function() {
        if (window.location.search.length > 0) {
            const cleanUrl = window.location.protocol + '//' + 
                window.location.host + window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
        }
    },
    
    // ============================================
    // HONEYPOT
    // ============================================
    addHoneypot: function() {
        const form = document.getElementById('loginForm');
        if (form && !document.getElementById('honeypot')) {
            const honeypot = document.createElement('div');
            honeypot.style.display = 'none';
            honeypot.innerHTML = `
                <input type="text" id="honeypot" name="honeypot" 
                       value="" tabindex="-1" autocomplete="off" 
                       aria-hidden="true">
            `;
            form.appendChild(honeypot.firstElementChild);
        }
    },
    
    // ============================================
    // RATE LIMITING
    // ============================================
    isRateLimited: function() {
        const now = Date.now();
        const windowMs = this.security.rateLimit.timeWindow;
        const maxRequests = this.security.rateLimit.maxRequests;
        
        this.rateLimit.requests = this.rateLimit.requests.filter(
            time => now - time < windowMs
        );
        
        if (this.rateLimit.blockedUntil && now < this.rateLimit.blockedUntil) {
            const remaining = Math.ceil((this.rateLimit.blockedUntil - now) / 60000);
            this.showError(`Too many attempts. Try again in ${remaining} minutes.`);
            return true;
        }
        
        if (this.rateLimit.requests.length >= maxRequests) {
            const blockMinutes = Math.min(15, Math.ceil(this.state.failedAttempts / 2));
            this.rateLimit.blockedUntil = now + (blockMinutes * 60000);
            this.showError(`Too many attempts. Try again in ${blockMinutes} minutes.`);
            return true;
        }
        
        return false;
    },
    
    addRateLimitRequest: function() {
        this.rateLimit.requests.push(Date.now());
    },
    
    // ============================================
    // FAILED ATTEMPTS
    // ============================================
    checkFailedAttempts: function(email) {
        const now = Date.now();
        
        if (this.state.failedAttempts >= this.security.maxFailedAttempts) {
            if (this.state.lastFailedTime && 
                (now - this.state.lastFailedTime) < this.security.lockoutDuration) {
                const remainingMinutes = Math.ceil(
                    (this.security.lockoutDuration - (now - this.state.lastFailedTime)) / 60000
                );
                this.showError(`Account temporarily locked. Try again in ${remainingMinutes} minutes.`);
                this.updateAttemptsDisplay(0);
                return true;
            } else {
                this.state.failedAttempts = 0;
                this.state.lastFailedTime = null;
            }
        }
        return false;
    },
    
    recordFailedAttempt: function() {
        this.state.failedAttempts++;
        this.state.lastFailedTime = Date.now();
        this.updateAttemptsDisplay(this.state.maxAttempts - this.state.failedAttempts);
        
        sessionStorage.setItem('failedAttempts', this.state.failedAttempts);
        sessionStorage.setItem('lastFailedTime', this.state.lastFailedTime);
    },
    
    resetFailedAttempts: function() {
        this.state.failedAttempts = 0;
        this.state.lastFailedTime = null;
        this.updateAttemptsDisplay(this.state.maxAttempts);
        sessionStorage.removeItem('failedAttempts');
        sessionStorage.removeItem('lastFailedTime');
    },
    
    updateAttemptsDisplay: function(remaining) {
        const attemptsInfo = document.getElementById('attemptsInfo');
        const attemptsText = document.getElementById('attemptsText');
        if (attemptsInfo && attemptsText) {
            if (remaining <= 0) {
                attemptsInfo.style.display = 'none';
            } else {
                attemptsInfo.style.display = 'flex';
                attemptsText.textContent = `${remaining} attempts remaining`;
                if (remaining <= 2) {
                    attemptsText.style.color = '#dc2626';
                } else {
                    attemptsText.style.color = '';
                }
            }
        }
    },
    
    // ============================================
    // SECURE TOKEN
    // ============================================
    generateSecureToken: function() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    },
    
    // ============================================
    // SUPABASE INIT
    // ============================================
    initSupabase: function() {
        try {
            if (window.supabase) {
                this.supabase = window.supabase.createClient(
                    'https://lwhtjozfsmbyihenfunw.supabase.co',
                    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk',
                    {
                        auth: {
                            persistSession: true,
                            autoRefreshToken: true,
                            detectSessionInUrl: false
                        },
                        db: {
                            schema: 'public'
                        }
                    }
                );
                console.log('✅ Supabase initialized');
            } else {
                console.error('❌ Supabase not loaded');
                this.showError('Authentication service not available. Please refresh the page.');
            }
        } catch (error) {
            console.error('❌ Supabase error:', error);
        }
    },
    
    // ============================================
    // PASSWORD TOGGLE
    // ============================================
    initPasswordToggle: function() {
        const passwordInput = document.getElementById('password');
        const toggleButton = document.getElementById('password-toggle-btn');
        const toggleIcon = document.getElementById('toggle-icon');
        
        if (!passwordInput || !toggleButton || !toggleIcon) return;
        
        toggleButton.addEventListener('click', () => {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            toggleIcon.setAttribute('data-feather', isPassword ? 'eye' : 'eye-off');
            feather.replace();
            toggleButton.setAttribute('aria-label', 
                isPassword ? 'Hide password' : 'Show password');
            toggleButton.setAttribute('aria-pressed', isPassword ? 'true' : 'false');
        });
        
        toggleButton.addEventListener('mousedown', (e) => e.preventDefault());
        toggleButton.addEventListener('touchstart', (e) => e.preventDefault());
        
        toggleButton.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleButton.click();
            }
        });
    },
    // ============================================
// PASSWORD STRENGTH METER - FIXED
// ============================================
initPasswordStrength: function() {
    const passwordInput = document.getElementById('password');
    const strengthProgress = document.getElementById('strengthProgress');
    const strengthText = document.getElementById('strengthText');
    
    if (!passwordInput || !strengthProgress || !strengthText) {
        console.warn('⚠️ Password strength elements not found');
        return;
    }
    
    console.log('✅ Password strength meter initialized');
    
    passwordInput.addEventListener('input', function() {
        const password = this.value;
        let strength = 0;
        
        // Check password criteria
        if (password.length >= 6) strength++;
        if (password.length >= 10) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;
        
        // Define strength levels
        const levels = [
            { text: 'Very Weak', color: '#ef4444', width: '20%' },
            { text: 'Weak', color: '#ef4444', width: '40%' },
            { text: 'Fair', color: '#f59e0b', width: '60%' },
            { text: 'Good', color: '#3b82f6', width: '80%' },
            { text: 'Strong', color: '#10b981', width: '100%' }
        ];
        
        // Calculate level (0-4)
        const level = Math.min(Math.floor(strength / 1.5), 4);
        const result = levels[level] || levels[0];
        
        // Update UI
        strengthProgress.style.width = result.width;
        strengthProgress.style.background = result.color;
        
        if (password.length === 0) {
            strengthText.textContent = 'Enter a strong password';
            strengthText.style.color = '#94a3b8';
            strengthProgress.style.width = '0%';
            strengthProgress.style.background = '#94a3b8';
        } else {
            strengthText.textContent = `Strength: ${result.text}`;
            strengthText.style.color = result.color;
        }
    });
},
    // ============================================
    // LOGIN FORM
    // ============================================
    initLoginForm: function() {
        const loginForm = document.getElementById('loginForm');
        if (!loginForm) return;
        
        loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        
        const emailInput = document.getElementById('email');
        if (emailInput) {
            setTimeout(() => emailInput.focus(), 100);
        }
        
        const inputs = loginForm.querySelectorAll('input[required]');
        inputs.forEach(input => {
            input.addEventListener('blur', (e) => this.validateField(e));
            input.addEventListener('input', (e) => this.clearFieldError(e));
        });
        
        const passwordInput = document.getElementById('password');
        if (passwordInput) {
            passwordInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    loginForm.dispatchEvent(new Event('submit'));
                }
                if (e.ctrlKey && e.key === 'Enter') {
                    e.preventDefault();
                    loginForm.dispatchEvent(new Event('submit'));
                }
            });
        }
        
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'r') {
                e.preventDefault();
                this.resetForm();
            }
        });
        
        const honeypot = document.getElementById('honeypot');
        if (honeypot) {
            honeypot.addEventListener('change', () => {
                if (honeypot.value) {
                    loginForm.style.display = 'none';
                }
            });
        }
    },
    
    // ============================================
    // RESET FORM
    // ============================================
    resetForm: function() {
        const form = document.getElementById('loginForm');
        if (form) {
            form.reset();
            document.getElementById('email')?.focus();
            this.clearError();
            this.clearSuccess();
            const progress = document.getElementById('strengthProgress');
            if (progress) {
                progress.style.width = '0%';
                progress.style.background = '#94a3b8';
            }
            const text = document.getElementById('strengthText');
            if (text) {
                text.textContent = 'Enter a strong password';
                text.style.color = '#94a3b8';
            }
            this.updateAttemptsDisplay(this.state.maxAttempts);
            this.showSuccess('Form reset successfully');
            setTimeout(() => this.clearSuccess(), 3000);
        }
    },
    
    // ============================================
    // VALIDATION
    // ============================================
    validateEmail: function(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },
    
    validateField: function(e) {
        const input = e.target;
        const value = input.value.trim();
        
        if (input.type === 'email' && value && !this.validateEmail(value)) {
            input.classList.add('error');
            return false;
        }
        
        if (input.required && !value) {
            input.classList.add('error');
            return false;
        }
        
        input.classList.remove('error');
        return true;
    },
    
    clearFieldError: function(e) {
        e.target.classList.remove('error');
        this.clearError();
    },
    
    // ============================================
    // MODALS
    // ============================================
    initModals: function() {
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.closeModal(modal.id);
                }
            });
        });
        
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });
    },
    
    openModal: function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            modal.removeAttribute('hidden');
            document.body.style.overflow = 'hidden';
            const firstInput = modal.querySelector('input, button');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
    },
    
    closeModal: function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            modal.setAttribute('hidden', 'true');
            document.body.style.overflow = '';
        }
    },
    
    // ============================================
    // FOCUS MANAGEMENT
    // ============================================
    initFocusManagement: function() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab' && document.querySelector('.modal-overlay.active')) {
                this.trapFocus(e);
            }
        });
    },
    
    trapFocus: function(e) {
        const modal = document.querySelector('.modal-overlay.active');
        if (!modal) return;
        
        const focusable = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstFocusable = focusable[0];
        const lastFocusable = focusable[focusable.length - 1];
        
        if (e.shiftKey) {
            if (document.activeElement === firstFocusable) {
                e.preventDefault();
                lastFocusable.focus();
            }
        } else {
            if (document.activeElement === lastFocusable) {
                e.preventDefault();
                firstFocusable.focus();
            }
        }
    },
    
    // ============================================
    // VIRTUAL KEYBOARD
    // ============================================
    initVirtualKeyboardHandler: function() {
        if (!window.visualViewport) return;
        
        const viewport = window.visualViewport;
        let keyboardVisible = false;
        
        viewport.addEventListener('resize', () => {
            const isKeyboardOpen = viewport.height < window.innerHeight * 0.6;
            
            if (isKeyboardOpen && !keyboardVisible) {
                keyboardVisible = true;
                document.body.style.paddingBottom = `${window.innerHeight - viewport.height}px`;
            } else if (!isKeyboardOpen && keyboardVisible) {
                keyboardVisible = false;
                document.body.style.paddingBottom = '0';
            }
        });
    },
    
    // ============================================
    // NETWORK STATUS
    // ============================================
    initNetworkStatus: function() {
        this.updateOnlineStatus();
        window.addEventListener('online', () => this.updateOnlineStatus());
        window.addEventListener('offline', () => this.updateOnlineStatus());
    },
    
    updateOnlineStatus: function() {
        const isOnline = navigator.onLine;
        document.body.classList.toggle('offline', !isOnline);
        
        if (!isOnline) {
            this.showError('You are offline. Please check your connection.');
        }
    },
    
    // ============================================
    // TRUSTED DEVICE
    // ============================================
    checkTrustedDevice: function() {
        const deviceId = this.generateDeviceId();
        const trustedDevice = this.state.trustedDevices[deviceId];
        
        if (trustedDevice && new Date(trustedDevice.expires) > new Date()) {
            const storedUser = localStorage.getItem('userProfile');
            if (storedUser) {
                const profile = JSON.parse(storedUser);
                this.redirectToDashboard(profile);
            }
        }
    },
    
    generateDeviceId: function() {
        const data = [
            navigator.userAgent,
            navigator.language,
            screen.width,
            screen.height,
            new Intl.DateTimeFormat().resolvedOptions().timeZone
        ].join('|');
        
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            hash = ((hash << 5) - hash) + data.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash).toString(16);
    },
    
    // ============================================
    // STAFF LOGIN
    // ============================================
    verifyStaffLogin: async function(identifier, password) {
        try {
            const staff = this.staffRecords.find(s => 
                s.email === identifier || s.id === identifier
            );
            
            if (!staff) return null;
            
            const storedPassword = atob(staff.password_hash);
            if (storedPassword !== password) return null;
            
            return {
                user_id: staff.id,
                email: staff.email,
                full_name: `${staff.first_name} ${staff.other_names || ''}`.trim(),
                role: staff.designation === 'Lecturer' || staff.designation === 'Senior Lecturer' ? 'lecturer' : 'staff',
                program: staff.department,
                is_staff: true,
                staff_record: staff
            };
        } catch (error) {
            console.error('Staff verification error');
            return null;
        }
    },
    
    // ============================================
    // EXECUTE LOGIN
    // ============================================
    executeLogin: async function(identifier, password) {
        if (!this.supabase) {
            throw new Error('Authentication service not available');
        }
        
        await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));
        
        let profileData = null;
        let isStaff = false;
        
        const isStaffId = !identifier.includes('@');
        if (isStaffId || identifier.includes('@')) {
            const staffProfile = await this.verifyStaffLogin(identifier, password);
            if (staffProfile) {
                profileData = staffProfile;
                isStaff = true;
                return { profileData, isStaff };
            }
        }
        
        const { data: authData, error: authError } = await this.supabase.auth
            .signInWithPassword({ 
                email: identifier, 
                password 
            });
        
        if (authError) {
            this.recordFailedAttempt();
            if (authError.message.includes('Invalid login credentials')) {
                throw new Error('Invalid email or password');
            } else if (authError.message.includes('Email not confirmed')) {
                throw new Error('Please verify your email');
            } else {
                throw new Error('Login failed. Please try again.');
            }
        }
        
        const { data: profile, error: profileError } = await this.supabase
            .from('consolidated_user_profiles_table')
            .select('*')
            .eq('email', identifier)
            .maybeSingle();
        
        if (!profile || profileError) {
            await this.supabase.auth.signOut();
            throw new Error('Account not found');
        }
        
        const validStatuses = ['approved', 'active'];
        if (!validStatuses.includes(profile.status?.toLowerCase())) {
            await this.supabase.auth.signOut();
            throw new Error('Account pending approval');
        }
        
        return { profileData: profile, isStaff: false };
    },
    
    // ============================================
    // LOGIN HANDLER
    // ============================================
    handleLogin: async function(e) {
        e.preventDefault();
        
        if (this.isRateLimited()) return;
        if (this.state.isLoggingIn) return;
        
        const identifier = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const loginButton = document.getElementById('loginButton');
        const buttonText = document.querySelector('.button-text');
        
        const honeypot = document.getElementById('honeypot');
        if (honeypot && honeypot.value) {
            this.addRateLimitRequest();
            return;
        }
        
        const csrfInput = document.getElementById('csrf_token');
        if (csrfInput && !this.validateCSRFToken(csrfInput.value)) {
            return;
        }
        
        if (!identifier) {
            this.showError('Please enter email or staff ID');
            this.recordFailedAttempt();
            this.addRateLimitRequest();
            return;
        }
        
        if (!password || password.length < 4) {
            this.showError('Invalid credentials');
            this.recordFailedAttempt();
            this.addRateLimitRequest();
            return;
        }
        
        if (this.checkFailedAttempts(identifier)) {
            this.addRateLimitRequest();
            return;
        }
        
        this.clearError();
        this.clearSuccess();
        this.state.isLoggingIn = true;
        loginButton.disabled = true;
        buttonText.innerHTML = '<span class="spinner"></span> Logging in...';
        
        this.addRateLimitRequest();
        
        try {
            console.log(`🔐 Logging in: ${identifier}`);
            
            const result = await this.executeLogin(identifier, password);
            
            this.resetFailedAttempts();
            
            const secureToken = this.generateSecureToken();
            
            await this.completeLogin(result.profileData, secureToken, result.isStaff);
            
        } catch (error) {
            console.error('💥 Login error:', error);
            
            if (this.supabase && !error.message.includes('staff')) {
                try {
                    await this.supabase.auth.signOut();
                } catch (signOutError) {
                    // Silent fail
                }
            }
            
            if (error.message.includes('busy') || error.message.includes('timeout')) {
                this.showError('⏰ Server is busy. Please wait 10 seconds and try again.');
            } else {
                this.showError(error.message || 'Login failed');
            }
            
        } finally {
            this.state.isLoggingIn = false;
            loginButton.disabled = false;
            buttonText.textContent = 'Sign In';
        }
    },
    
    // ============================================
    // SESSION MANAGEMENT
    // ============================================
    startSessionMonitoring: function() {
        this.sessionCheckInterval = setInterval(() => {
            this.checkSessionHealth();
        }, 30000);
    },
    
    checkSessionHealth: function() {
        const sessionExpires = localStorage.getItem('session_expires');
        if (sessionExpires) {
            const expires = parseInt(sessionExpires);
            const now = Math.floor(Date.now() / 1000);
            
            if ((expires - now) < 300) {
                this.showSessionWarning();
            }
            
            if (now > expires) {
                this.forceLogout('Your session has expired');
            }
        }
    },
    
    showSessionWarning: function() {
        const warning = document.getElementById('sessionWarning');
        const timer = document.getElementById('sessionTimer');
        
        if (warning && timer) {
            const expires = parseInt(localStorage.getItem('session_expires'));
            const now = Math.floor(Date.now() / 1000);
            const remaining = Math.max(0, expires - now);
            const minutes = Math.floor(remaining / 60);
            const seconds = remaining % 60;
            timer.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            warning.classList.add('active');
        }
    },
    
    extendSession: function() {
        const expires = new Date();
        expires.setHours(expires.getHours() + 24);
        localStorage.setItem('session_expires', Math.floor(expires.getTime() / 1000));
        
        const sessionId = localStorage.getItem('session_id');
        if (sessionId && this.supabase) {
            this.supabase
                .from('user_sessions')
                .update({
                    expires_at: expires.toISOString(),
                    last_activity: new Date().toISOString()
                })
                .eq('id', sessionId)
                .then(() => {
                    const warning = document.getElementById('sessionWarning');
                    if (warning) warning.classList.remove('active');
                    this.showSuccess('✅ Session extended successfully');
                    setTimeout(() => this.clearSuccess(), 3000);
                })
                .catch(() => {});
        }
    },
    
    forceLogout: function(message) {
        localStorage.removeItem('userProfile');
        localStorage.removeItem('session_id');
        localStorage.removeItem('session_expires');
        sessionStorage.clear();
        
        if (message) {
            this.showError(message);
        }
        
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
    },
    
    hashToken: async function(token) {
        const encoder = new TextEncoder();
        const data = encoder.encode(token);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },
    
    parseUserAgent: function(userAgent) {
        if (!userAgent) return 'Unknown';
        
        const ua = userAgent.toLowerCase();
        
        let browser = 'Unknown';
        if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome';
        else if (ua.includes('firefox')) browser = 'Firefox';
        else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
        else if (ua.includes('edg')) browser = 'Edge';
        
        let os = 'Unknown';
        if (ua.includes('windows')) os = 'Windows';
        else if (ua.includes('mac')) os = 'macOS';
        else if (ua.includes('linux')) os = 'Linux';
        else if (ua.includes('android')) os = 'Android';
        else if (ua.includes('ios') || ua.includes('iphone')) os = 'iOS';
        
        let device = 'Desktop';
        if (ua.includes('mobile')) device = 'Mobile';
        else if (ua.includes('tablet')) device = 'Tablet';
        
        return `${browser} on ${os} (${device})`;
    },
    
   // ============================================
// UPDATE LAST LOGIN - FIXED VERSION
// ============================================
updateLastLogin: async function(userId, email) {
    try {
        console.log('📝 updateLastLogin called for:', userId);
        
        const now = new Date().toISOString();
        
        // Get current login count
        const { data: profile, error: fetchError } = await this.supabase
            .from('consolidated_user_profiles_table')
            .select('login_count')
            .eq('user_id', userId)
            .maybeSingle();
        
        if (fetchError) {
            console.error('❌ Error fetching login count:', fetchError);
            return false;
        }
        
        const currentCount = profile?.login_count || 0;
        const newCount = currentCount + 1;
        
        console.log(`📊 Current login count: ${currentCount}, New: ${newCount}`);
        
        // Update
        const { error: updateError } = await this.supabase
            .from('consolidated_user_profiles_table')
            .update({
                last_login: now,
                login_count: newCount,
                last_activity: now,
                updated_at: now
            })
            .eq('user_id', userId);
        
        if (updateError) {
            console.error('❌ Error updating login count:', updateError);
            return false;
        }
        
        console.log(`✅ Login count updated to ${newCount}`);
        return true;
        
    } catch (error) {
        console.error('❌ updateLastLogin exception:', error);
        return false;
    }
},
 // ============================================
// UPDATE LAST LOGIN INFO - WITH CORRECT TIMEZONE
// ============================================
updateLastLoginInfo: function() {
    const info = document.getElementById('lastLoginInfo');
    if (!info) return;
    
    // Show loading state
    info.innerHTML = `
        <i data-feather="clock"></i>
        <span>Loading last login...</span>
    `;
    feather.replace();
    
    // Get user profile from localStorage
    const userProfile = localStorage.getItem('userProfile');
    if (!userProfile) {
        info.innerHTML = `
            <i data-feather="clock"></i>
            <span>Welcome! Please log in to see your activity.</span>
        `;
        feather.replace();
        return;
    }
    
    try {
        const profile = JSON.parse(userProfile);
        const userId = profile.user_id;
        
        if (!userId) {
            info.innerHTML = `
                <i data-feather="clock"></i>
                <span>Welcome! Please log in to see your activity.</span>
            `;
            feather.replace();
            return;
        }
        
        console.log('🔍 Fetching last login for user:', userId);
        
        // Query the database for last login
        this.supabase
            .from('user_sessions')
            .select('login_time, device_info, ip_address')
            .eq('user_id', userId)
            .order('login_time', { ascending: false })
            .limit(2)
            .then(({ data, error }) => {
                if (error) {
                    console.error('❌ Error fetching last login:', error);
                    this.showCurrentLoginInfo(info);
                    return;
                }
                
                if (!data || data.length === 0) {
                    info.innerHTML = `
                        <i data-feather="clock"></i>
                        <span>Welcome ${profile.full_name || 'User'}! This is your first login.</span>
                    `;
                    feather.replace();
                    return;
                }
                
                // data[0] is the current login, data[1] is the previous login
                if (data.length >= 2 && data[1]) {
                    const previousLogin = data[1];
                    
                    // ✅ FIX: Create date and add 3 hours for EAT timezone
                    const loginDate = new Date(previousLogin.login_time);
                    
                    // Format the time correctly
                    const timeStr = loginDate.toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: true,
                        timeZone: 'Africa/Nairobi'  // ← FORCE EAT TIMEZONE
                    });
                    const dateStr = loginDate.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'long', 
                        day: 'numeric',
                        timeZone: 'Africa/Nairobi'  // ← FORCE EAT TIMEZONE
                    });
                    const device = previousLogin.device_info || 'Unknown Device';
                    
                    info.innerHTML = `
                        <i data-feather="clock"></i>
                        <span>Last login: ${dateStr} at ${timeStr} from ${device}</span>
                    `;
                } else {
                    info.innerHTML = `
                        <i data-feather="clock"></i>
                        <span>Welcome ${profile.full_name || 'User'}! This is your first login.</span>
                    `;
                }
                feather.replace();
            })
            .catch((err) => {
                console.error('❌ Error:', err);
                this.showCurrentLoginInfo(info);
            });
            
    } catch (error) {
        console.error('❌ Error parsing profile:', error);
        this.showCurrentLoginInfo(info);
    }
},

// ===== FALLBACK: Show current login info =====
showCurrentLoginInfo: function(info) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true,
        timeZone: 'Africa/Nairobi'
    });
    const dateStr = now.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric',
        timeZone: 'Africa/Nairobi'
    });
    const device = this.parseUserAgent(navigator.userAgent);
    
    info.innerHTML = `
        <i data-feather="clock"></i>
        <span>Logged in: ${dateStr} at ${timeStr} from ${device}</span>
    `;
    feather.replace();
},
    
    // ============================================
    // REDIRECT TO DASHBOARD
    // ============================================
    redirectToDashboard: function(profileData) {
        console.log('🚀 Redirecting securely...');
        
        let role = profileData.role?.toLowerCase() || 'student';
        
        const validRoles = ['superadmin', 'admin', 'student', 'lecturer', 'staff'];
        if (!validRoles.includes(role)) {
            role = 'student';
        }
        
        if (profileData.is_staff || role === 'staff' || role === 'lecturer') {
            role = 'lecturer';
        }
        
        const redirectToken = this.generateSecureToken();
        sessionStorage.setItem('redirect_token', redirectToken);
        
        const roleRedirects = {
            'superadmin': 'superadmin.html',
            'admin': 'admin.html',
            'student': 'student.html',
            'lecturer': 'lecturer.html',
            'staff': 'lecturer.html'
        };
        
        let redirectFile = roleRedirects[role] || 'index.html';
        
        const url = new URL(redirectFile, window.location.origin);
        url.searchParams.set('token', redirectToken);
        url.searchParams.set('role', role);
        url.searchParams.set('ts', Date.now());
        
        console.log(`🎯 Role: ${role} -> ${url.pathname}`);
        
        document.body.style.opacity = '0';
        document.body.style.transition = 'opacity 0.3s ease';
        
        setTimeout(() => {
            window.location.replace(url.toString());
        }, 300);
    },
    
    // ============================================
    // MESSAGE HELPERS
    // ============================================
    showError: function(message) {
        const element = document.getElementById('errorMsg');
        if (element) {
            const errorText = element.querySelector('.error-text');
            if (errorText) {
                errorText.textContent = message;
            }
            element.classList.add('show');
            element.style.display = 'flex';
            this.clearSuccess();
        }
    },
    
    clearError: function() {
        const element = document.getElementById('errorMsg');
        if (element) {
            element.classList.remove('show');
            element.style.display = 'none';
        }
    },
    
    showSuccess: function(message) {
        const element = document.getElementById('successMsg');
        if (element) {
            const successText = element.querySelector('.success-text');
            if (successText) {
                successText.textContent = message;
            }
            element.classList.add('show');
            element.style.display = 'flex';
            this.clearError();
        }
    },
    
    clearSuccess: function() {
        const element = document.getElementById('successMsg');
        if (element) {
            element.classList.remove('show');
            element.style.display = 'none';
        }
    },
    
    // ============================================
    // CLEANUP
    // ============================================
    destroy: function() {
        if (this.sessionCheckInterval) {
            clearInterval(this.sessionCheckInterval);
        }
        
        this.csrfToken = null;
        sessionStorage.removeItem('csrf_token');
        sessionStorage.removeItem('redirect_token');
        
        console.log('🧹 Cleaned up NCHSMLogin');
    }
};

// ============================================
// GLOBAL FUNCTIONS
// ============================================
window.hideAllModals = () => {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        window.NCHSMLogin.closeModal(modal.id);
    });
};

window.closeModal = (modalId) => {
    window.NCHSMLogin.closeModal(modalId);
};

window.openModal = (modalId) => {
    window.NCHSMLogin.openModal(modalId);
};

window.extendSession = () => {
    window.NCHSMLogin.extendSession();
};

window.resendOTP = () => {
    window.NCHSMLogin.showSuccess('✅ New OTP code sent to your email');
    setTimeout(() => window.NCHSMLogin.clearSuccess(), 3000);
};

// ============================================
// INITIALIZE
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Restore failed attempts
    const savedAttempts = sessionStorage.getItem('failedAttempts');
    const savedTime = sessionStorage.getItem('lastFailedTime');
    if (savedAttempts) window.NCHSMLogin.state.failedAttempts = parseInt(savedAttempts);
    if (savedTime) window.NCHSMLogin.state.lastFailedTime = parseInt(savedTime);
    
    // Initialize
    window.NCHSMLogin.init();
    
    console.log('✅ Secure application ready');
    console.log(`📱 Device ID: ${window.NCHSMLogin.generateDeviceId()}`);
});

// ============================================
// CLEANUP ON UNLOAD
// ============================================
window.addEventListener('beforeunload', () => {
    window.NCHSMLogin?.destroy();
});

// ============================================
// SESSION EXTEND BUTTON
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    const extendBtn = document.getElementById('extendSessionBtn');
    if (extendBtn) {
        extendBtn.addEventListener('click', () => {
            window.NCHSMLogin.extendSession();
        });
    }
});

console.log('📦 NCHSM Login v4.0 loaded');
console.log(`🕐 ${new Date().toLocaleString()}`);
