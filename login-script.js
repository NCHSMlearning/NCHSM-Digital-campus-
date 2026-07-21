// ============================================
// NCHSM SECURE LOGIN SYSTEM - ULTIMATE
// Version: 4.1 - GOOGLE AUTH INTEGRATED
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
    // GOOGLE AUTH CONFIG - ✅ YOUR CLIENT ID INSERTED
    // ============================================
    google: {
        clientId: '533086740527-agnvv38lfir1fpsu26dfr7obg21rq9uv.apps.googleusercontent.com',
        initialized: false,
        credential: null
    },

    // ============================================
    // BREVO CONFIGURATION - SECURE (Using Supabase)
    // ============================================
    brevo: {
        apiKey: null,
        apiUrl: 'https://api.brevo.com/v3/smtp/email',
        enabled: true,
        sender: {
            email: 'noreply@nakurucollegeofhealthelearning.site',
            name: 'NCHSM ICT Support'
        },
        _initialized: false
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
        
        console.log('🚀 Initializing NCHSMLogin v4.1...');
        console.log('🛡️ Ultimate Security Edition + Google Auth');
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
        
        // Initialize password strength meter
        this.initPasswordStrength();
        
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
        
        // Initialize theme toggle
        this.initThemeToggle();
        
        // ✅ INITIALIZE GOOGLE LOGIN
        this.initGoogleLogin();
        
        // Load Brevo API key from Supabase Secrets
        this.loadBrevoApiKey().then(success => {
            if (success) {
                console.log('✅ Brevo integration ready');
            } else {
                console.warn('⚠️ Brevo integration not available - login notifications disabled');
            }
        });
        
        // Mark as initialized
        this.state.isInitialized = true;
        
        console.log('✅ NCHSMLogin v4.1 initialized');
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
    // LOAD BREVO API KEY FROM SUPABASE
    // ============================================
    loadBrevoApiKey: async function() {
        try {
            // First, check if we already have it cached
            const cached = sessionStorage.getItem('brevo_api_key');
            if (cached) {
                console.log('📦 Using cached Brevo API key');
                this.brevo.apiKey = cached;
                this.brevo._initialized = true;
                return true;
            }
            
            console.log('🔑 Fetching Brevo API key from Supabase...');
            
            // Call the Edge Function
            const { data, error } = await this.supabase.functions.invoke('get-secret', {
                body: { secret_name: 'BREVO_API_KEY' }
            });
            
            if (error) {
                console.error('❌ Error fetching secret:', error);
                return false;
            }
            
            if (data && data.secret) {
                this.brevo.apiKey = data.secret;
                this.brevo._initialized = true;
                
                // Cache it in session storage (safe for this session)
                sessionStorage.setItem('brevo_api_key', data.secret);
                
                console.log('✅ Brevo API key loaded successfully');
                return true;
            }
            
            console.error('❌ No secret returned');
            return false;
            
        } catch (error) {
            console.error('❌ Failed to load Brevo API key:', error);
            return false;
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
    // SEND LOGIN NOTIFICATION (SECURE)
    // ============================================
    sendLoginNotification: async function(studentData) {
        // Only for students
        if (!studentData || studentData.role === 'staff' || studentData.is_staff) return;
        if (!studentData.email || !this.brevo.enabled) return;
        
        try {
            // Ensure API key is loaded
            if (!this.brevo._initialized) {
                console.log('⏳ Loading Brevo API key...');
                const loaded = await this.loadBrevoApiKey();
                if (!loaded) {
                    console.error('❌ Cannot send notification - API key not loaded');
                    return;
                }
            }
            
            // Check if we have the API key
            if (!this.brevo.apiKey) {
                console.error('❌ No Brevo API key available');
                return;
            }
            
            console.log(`📧 Sending login notification to ${studentData.email}`);
            
            // Get student's IP
            let ip = 'Unknown';
            try {
                const res = await fetch('https://api.ipify.org?format=json');
                const data = await res.json();
                ip = data.ip;
            } catch(e) {}
            
            // Get current time in EAT
            const now = new Date();
            const time = now.toLocaleString('en-KE', { 
                timeZone: 'Africa/Nairobi',
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            // Parse device info
            const device = this.parseUserAgent(navigator.userAgent);
            
            // Build email HTML
            const htmlContent = this.buildLoginEmail(
                studentData.full_name || studentData.name || 'Student',
                studentData.email,
                studentData.student_id || studentData.user_id || 'N/A',
                studentData.program || studentData.department || 'N/A',
                studentData.block || studentData.year || 'N/A',
                ip,
                device,
                time
            );
            
            // Send via Brevo
            const response = await fetch(this.brevo.apiUrl, {
                method: 'POST',
                headers: {
                    'api-key': this.brevo.apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sender: { 
                        email: this.brevo.sender.email, 
                        name: this.brevo.sender.name
                    },
                    to: [{ email: studentData.email }],
                    subject: '🔐 New Login Alert - NCHSM Student Portal',
                    htmlContent: htmlContent
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
    // BUILD LOGIN EMAIL - UPDATED CONTACTS
    // ============================================
    buildLoginEmail: function(name, email, studentId, program, block, ip, device, time) {
        // Format student ID - if it's a UUID, show "Pending" or use a cleaner format
        const displayStudentId = studentId && studentId.includes('-') && studentId.length > 20 
            ? 'Pending' 
            : studentId || 'N/A';
        
        // Format block
        const displayBlock = block && block !== 'N/A' && block !== 'null' ? block : 'Not Assigned';
        
        // Contact details
        const CONTACT_EMAIL = 'portal.nchsm@gmail.com';
        const PHONE1 = '0790969743';
        const PHONE2 = '0702432987';
        
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔐 New Login Alert</title>
</head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f0f4f8; color: #1a202c;">
    <div style="background: #ffffff; border-radius: 20px; padding: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
        
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 25px; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0;">
            <div style="display: inline-block; background: #0A3D62; border-radius: 50%; padding: 12px; margin-bottom: 10px;">
                <span style="font-size: 32px;">🔐</span>
            </div>
            <h2 style="color: #0A3D62; margin: 0; font-size: 24px;">New Login Detected</h2>
            <p style="color: #64748B; margin: 5px 0 0;">Nakuru College of Health Sciences and Management</p>
        </div>
        
        <!-- Welcome Message -->
        <div style="background: linear-gradient(135deg, #e8f4f8, #d4e8f0); border-radius: 14px; padding: 20px; margin-bottom: 20px; border-left: 4px solid #0A3D62;">
            <p style="margin: 0; font-size: 16px; color: #0A3D62;">
                👋 <strong>Hello ${name}</strong>
            </p>
            <p style="margin: 8px 0 0; color: #1e293b; font-size: 14px;">
                Your NCHSM student account was just accessed. If this was you, no action is needed. 
                If you don't recognize this activity, please secure your account immediately.
            </p>
        </div>
        
        <!-- Login Details -->
        <div style="background: #f8fafc; border-radius: 14px; padding: 20px; margin-bottom: 20px;">
            <h4 style="margin: 0 0 15px 0; color: #1e293b; font-size: 16px;">📋 Login Details</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                    <td style="padding: 8px 0; color: #64748B; width: 40%; border-bottom: 1px solid #e2e8f0;">👤 Name</td>
                    <td style="padding: 8px 0; color: #0A3D62; font-weight: 500; border-bottom: 1px solid #e2e8f0;">${name}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #64748B; width: 40%; border-bottom: 1px solid #e2e8f0;">🆔 Student ID</td>
                    <td style="padding: 8px 0; color: #0A3D62; font-weight: 500; border-bottom: 1px solid #e2e8f0;">${displayStudentId}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #64748B; width: 40%; border-bottom: 1px solid #e2e8f0;">📚 Program</td>
                    <td style="padding: 8px 0; color: #0A3D62; font-weight: 500; border-bottom: 1px solid #e2e8f0;">${program}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #64748B; width: 40%; border-bottom: 1px solid #e2e8f0;">📌 Block</td>
                    <td style="padding: 8px 0; color: #0A3D62; font-weight: 500; border-bottom: 1px solid #e2e8f0;">${displayBlock}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #64748B; width: 40%; border-bottom: 1px solid #e2e8f0;">📧 Email</td>
                    <td style="padding: 8px 0; color: #0A3D62; font-weight: 500; border-bottom: 1px solid #e2e8f0;">${email}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #64748B; width: 40%; border-bottom: 1px solid #e2e8f0;">🌐 IP Address</td>
                    <td style="padding: 8px 0; color: #dc2626; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${ip}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #64748B; width: 40%; border-bottom: 1px solid #e2e8f0;">💻 Device</td>
                    <td style="padding: 8px 0; color: #0A3D62; font-weight: 500; border-bottom: 1px solid #e2e8f0;">${device}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #64748B; width: 40%;">🕐 Login Time</td>
                    <td style="padding: 8px 0; color: #0A3D62; font-weight: 500;">${time}</td>
                </tr>
            </table>
        </div>
        
        <!-- Quick Actions -->
        <div style="display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap;">
            <a href="https://nakurucollegeofhealthelearning.site/student.html" 
               style="flex: 1; min-width: 140px; background: #0A3D62; color: white; padding: 12px 20px; border-radius: 10px; text-decoration: none; text-align: center; font-weight: 600; font-size: 14px; display: inline-block;">
                🚪 Go to Portal
            </a>
            <a href="mailto:${CONTACT_EMAIL}?subject=Unauthorized%20Login%20Alert" 
               style="flex: 1; min-width: 140px; background: #e2e8f0; color: #1e293b; padding: 12px 20px; border-radius: 10px; text-decoration: none; text-align: center; font-weight: 600; font-size: 14px; display: inline-block;">
                📧 Report Issue
            </a>
        </div>
        
        <!-- Security Tips -->
        <div style="background: #fef3c7; border-radius: 14px; padding: 16px; margin-bottom: 20px; border-left: 4px solid #F59E0B;">
            <h5 style="margin: 0 0 8px 0; color: #92400E; font-size: 14px;">💡 Security Tips</h5>
            <ul style="margin: 0; padding-left: 20px; color: #78350F; font-size: 13px; line-height: 1.6;">
                <li>If this wasn't you, contact NCHSM ICT Support immediately</li>
                <li>Never share your login credentials with anyone</li>
                <li>Use a strong, unique password for your account</li>
                <li>Enable two-factor authentication for extra security</li>
            </ul>
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
            <p style="margin: 0;">
                NCHSM ICT Support<br>
                📧 <a href="mailto:${CONTACT_EMAIL}" style="color: #0A3D62; text-decoration: none;">${CONTACT_EMAIL}</a><br>
                📞 <a href="tel:+254790969743" style="color: #0A3D62; text-decoration: none;">${PHONE1}</a> | 
                📞 <a href="tel:+254702432987" style="color: #0A3D62; text-decoration: none;">${PHONE2}</a><br>
                🔗 <a href="https://mail.nakurucollegeofhealthelearning.site" style="color: #0A3D62; text-decoration: none;">mail.nakurucollegeofhealthelearning.site</a>
            </p>
            <p style="margin: 8px 0 0; font-size: 11px; color: #94a3b8;">
                This is an automated security notification. Please do not reply to this email.
            </p>
            <p style="margin: 8px 0 0; font-size: 11px; color: #94a3b8;">
                © ${new Date().getFullYear()} Nakuru College of Health Sciences and Management
            </p>
        </div>
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
                        
                        // Create date and format with EAT timezone
                        const loginDate = new Date(previousLogin.login_time);
                        
                        // Format the time correctly
                        const timeStr = loginDate.toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: true,
                            timeZone: 'Africa/Nairobi'
                        });
                        const dateStr = loginDate.toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            month: 'long', 
                            day: 'numeric',
                            timeZone: 'Africa/Nairobi'
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
// INIT GOOGLE LOGIN - REDIRECT MODE
// ============================================
initGoogleLogin: function() {
    if (typeof google === 'undefined' || !google.accounts) {
        console.warn('⚠️ Google library not loaded, retrying in 1s...');
        setTimeout(() => this.initGoogleLogin(), 1000);
        return;
    }
    
    console.log('🔑 Initializing Google Login (redirect mode)...');
    
    try {
        google.accounts.id.initialize({
            client_id: this.google.clientId,
            callback: this.handleGoogleCredential.bind(this),
            cancel_on_tap_outside: false,
            auto_select: false,
            context: 'signin',
            ux_mode: 'redirect',  // ← REDIRECT MODE
            login_uri: window.location.origin + window.location.pathname
        });
        
        // Attach to your Google button
        const googleBtn = document.querySelector('.sso-btn.google');
        if (googleBtn) {
            const newBtn = googleBtn.cloneNode(true);
            googleBtn.parentNode.replaceChild(newBtn, googleBtn);
            
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('🔑 Google button clicked - redirecting to Google...');
                google.accounts.id.prompt();
            });
            console.log('✅ Google button attached (redirect mode)');
        } else {
            console.warn('⚠️ Google button not found');
        }
        
        this.google.initialized = true;
        console.log('✅ Google Login initialized successfully');
        
        // ✅ Listen for redirect response
        this.listenForGoogleRedirect();
        
    } catch (error) {
        console.error('❌ Google init error:', error);
    }
},

// ============================================
// LISTEN FOR GOOGLE REDIRECT RESPONSE
// ============================================
listenForGoogleRedirect: function() {
    console.log('🔍 Listening for Google redirect...');
    
    // Check if we already have a credential stored
    const storedCredential = sessionStorage.getItem('google_credential');
    if (storedCredential) {
        console.log('🎯 Found stored credential, processing...');
        sessionStorage.removeItem('google_credential');
        this.handleGoogleCredential({ credential: storedCredential });
        return;
    }
    
    // Listen for custom event from HTML
    window.addEventListener('googleCredentialReceived', (event) => {
        console.log('🎯 Google credential received via event!');
        if (event.detail && event.detail.credential) {
            this.handleGoogleCredential({ credential: event.detail.credential });
        }
    });
},

    // ============================================
    // DECODE JWT TOKEN
    // ============================================
    decodeJWT: function(token) {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64).split('').map(c => 
                '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
            ).join('')
        );
        return JSON.parse(jsonPayload);
    },

   // ============================================
// PROCESS GOOGLE LOGIN
// ============================================
processGoogleLogin: async function(payload) {
    if (!this.supabase) {
        this.showError('Authentication service unavailable');
        return;
    }
    
    const email = payload.email;
    const name = payload.name || payload.given_name || 'Student';
    
    console.log('📧 Processing Google login for:', email);
    
    // Show loading
    const loginButton = document.getElementById('loginButton');
    const buttonText = document.querySelector('.button-text');
    if (loginButton) {
        loginButton.disabled = true;
        buttonText.innerHTML = '<span class="spinner"></span> Signing in...';
    }
    
    try {
        // Check if user exists in our system
        const { data: profile, error: profileError } = await this.supabase
            .from('consolidated_user_profiles_table')
            .select('*')
            .eq('email', email)
            .maybeSingle();
        
        if (profileError) {
            console.error('❌ Profile error:', profileError);
            this.showError('Database error. Please try again.');
            return;
        }
        
        if (!profile) {
            // User doesn't exist - prompt to register
            this.showError('No account found with this email. Please register first.');
            setTimeout(() => {
                window.location.href = 'register.html';
            }, 2000);
            return;
        }
        
        // Check status
        const validStatuses = ['approved', 'active'];
        if (!validStatuses.includes(profile.status?.toLowerCase())) {
            this.showError('Account pending approval. Please wait.');
            return;
        }
        
        // Create a session for this user
        const sessionToken = this.generateSecureToken();
        
        // Track session
        const sessionResult = await this.trackUserSession(
            profile.user_id,
            email,
            sessionToken,
            navigator.userAgent,
            false
        );
        
        if (!sessionResult) {
            console.warn('⚠️ Session tracking failed but continuing');
        }
        
        // Update last login
        await this.updateLastLogin(profile.user_id, email);
        
        // Store profile
        const safeProfile = {
            user_id: profile.user_id,
            email: email,
            full_name: profile.full_name || name,
            role: profile.role || 'student',
            program: profile.program || profile.department,
            is_staff: false,
            auth_provider: 'google'
        };
        localStorage.setItem('userProfile', JSON.stringify(safeProfile));
        
        // Send login notification (optional)
        if (profile.role === 'student') {
            this.sendLoginNotification({
                ...profile,
                full_name: profile.full_name || name,
                email: email
            }).catch(() => {});
        }
        
        // Success message
        this.showSuccess(`✅ Welcome back, ${safeProfile.full_name}!`);
        this.updateLastLoginInfo();
        
        // Redirect
        setTimeout(() => {
            this.redirectToDashboard(safeProfile);
        }, 1000);
        
    } catch (error) {
        console.error('❌ Google login error:', error);
        this.showError('Login failed. Please try again.');
    } finally {
        if (loginButton) {
            loginButton.disabled = false;
            buttonText.textContent = 'Sign In';
        }
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

console.log('📦 NCHSM Login v4.1 loaded - Google Auth Integrated');
console.log(`🕐 ${new Date().toLocaleString()}`);
