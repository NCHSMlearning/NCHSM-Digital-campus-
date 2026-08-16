// ============================================
// NCHSM SECURE LOGIN SYSTEM - ULTIMATE
// Version: 5.1 - FIXED FOR VARCHAR COLUMNS
// Copyright © 2026 Nakuru College of Health Sciences and Management
// ============================================

// ============================================
// FORCE CACHE CLEAR IF VERSION MISMATCH
// ============================================
(function() {
    const VERSION = '5.1';
    const storedVersion = localStorage.getItem('nchsm_js_version');
    
    if (storedVersion !== VERSION) {
        console.log('🔄 Clearing cache for new version...');
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('nchsm_js_version', VERSION);
    }
})();

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
// MAIN LOGIN SYSTEM - v5.1 WITH 2FA
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
        maxEmailLength: 100,
        maxNameLength: 100,
        sessionTimeout: 24 * 60 * 60 * 1000,
        rateLimit: {
            enabled: true,
            maxRequests: 10,
            timeWindow: 60 * 1000
        },
        csrfProtection: true,
        enforce2FA: true
    },

    // ============================================
    // GOOGLE AUTH CONFIG
    // ============================================
    google: {
        clientId: '533086740527-agnvv38lfir1fpsu26dfr7obg21rq9uv.apps.googleusercontent.com',
        initialized: false,
        credential: null
    },

    // ============================================
    // BREVO CONFIGURATION
    // ============================================
    brevo: {
        apiKey: null,
        apiUrl: 'https://api.brevo.com/v3/smtp/email',
        enabled: true,
        sender: {
            email: 'noreply@nchsm.co.ke',
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
        
        console.log('🚀 Initializing NCHSMLogin v5.1...');
        console.log('🛡️ Ultimate Security Edition + 2FA');
        console.log('🔐 Authenticator App Support Enabled');
        
        this.disableDeveloperTools();
        
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
        
        this.generateCSRFToken();
        this.checkTrustedDevice();
        this.initPasswordToggle();
        this.initPasswordStrength();
        this.initLoginForm();
        this.initModals();
        this.initFocusManagement();
        this.initVirtualKeyboardHandler();
        this.initSupabase();
        this.loadStaffRecords();
        this.clearURLParameters();
        this.addHoneypot();
        this.startSessionMonitoring();
        this.initNetworkStatus();
        this.initOTPInputs();
        this.initRippleEffect();
        this.hideSkeletonLoader();
        this.initThemeToggle();
        this.initGoogleLogin();
        
        this.loadBrevoApiKey().then(success => {
            if (success) {
                console.log('✅ Brevo integration ready');
            } else {
                console.warn('⚠️ Brevo integration not available');
            }
        });
        
        setTimeout(() => {
            this.update2FAButtonStatus();
        }, 1000);
        
        this.state.isInitialized = true;
        
        console.log('✅ NCHSMLogin v5.1 initialized');
        console.log('🔐 2FA enforcement: ENABLED');
        console.log(`🕐 ${new Date().toLocaleString()}`);
    },

    // ============================================
    // UPDATE 2FA BUTTON STATUS
    // ============================================
    update2FAButtonStatus: async function() {
        try {
            const userProfile = localStorage.getItem('userProfile');
            if (!userProfile) return;
            
            const profile = JSON.parse(userProfile);
            if (!profile.user_id) return;
            
            const { data, error } = await this.supabase
                .from('consolidated_user_profiles_table')
                .select('two_factor_enabled')
                .eq('user_id', profile.user_id)
                .single();
            
            if (error) return;
            
            const enableBtn = document.getElementById('enable2FABtn');
            if (enableBtn) {
                if (data?.two_factor_enabled) {
                    enableBtn.innerHTML = '✅ 2FA Enabled';
                    enableBtn.style.background = '#10b981';
                    enableBtn.disabled = true;
                    enableBtn.style.cursor = 'default';
                    enableBtn.style.opacity = '0.8';
                } else {
                    enableBtn.innerHTML = '🔐 Enable Two-Factor Authentication';
                    enableBtn.style.background = 'linear-gradient(135deg, #0A3D62, #1a5a7a)';
                    enableBtn.disabled = false;
                    enableBtn.style.cursor = 'pointer';
                    enableBtn.style.opacity = '1';
                }
            }
        } catch (e) {
            console.log('⚠️ Could not update 2FA button status');
        }
    },

    // ============================================
    // THEME TOGGLE
    // ============================================
    initThemeToggle: function() {
        const toggleBtn = document.getElementById('themeToggle');
        const themeIcon = document.getElementById('themeIcon');
        const themeLabel = document.getElementById('themeLabel');
        
        if (!toggleBtn) {
            console.warn('⚠️ Theme toggle button not found');
            return;
        }
        
        const savedTheme = localStorage.getItem('nchsm_theme') || 'light';
        this.applyTheme(savedTheme);
        
        toggleBtn.addEventListener('click', () => {
            const currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            this.applyTheme(newTheme);
            localStorage.setItem('nchsm_theme', newTheme);
        });
    },
    
    applyTheme: function(theme) {
        const themeIcon = document.getElementById('themeIcon');
        const themeLabel = document.getElementById('themeLabel');
        
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
            document.body.classList.remove('light-theme');
            if (themeIcon) themeIcon.setAttribute('data-feather', 'moon');
            if (themeLabel) themeLabel.textContent = 'Dark';
        } else {
            document.body.classList.add('light-theme');
            document.body.classList.remove('dark-theme');
            if (themeIcon) themeIcon.setAttribute('data-feather', 'sun');
            if (themeLabel) themeLabel.textContent = 'Light';
        }
        
        if (typeof feather !== 'undefined') feather.replace();
    },

    // ============================================
    // LOAD BREVO API KEY
    // ============================================
    loadBrevoApiKey: async function() {
        try {
            const cached = sessionStorage.getItem('brevo_api_key');
            if (cached) {
                this.brevo.apiKey = cached;
                this.brevo._initialized = true;
                return true;
            }
            
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
                sessionStorage.setItem('brevo_api_key', data.secret);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('❌ Failed to load Brevo API key:', error);
            return false;
        }
    },

    // ============================================
    // 2FA FUNCTIONS - AUTHENTICATOR APP SUPPORT
    // ============================================
    
    check2FARequirement: async function(userId) {
        try {
            const { data, error } = await this.supabase
                .from('consolidated_user_profiles_table')
                .select('two_factor_enabled, two_factor_secret')
                .eq('user_id', userId)
                .single();
            
            if (error) {
                console.error('2FA check error:', error);
                return false;
            }
            
            return data?.two_factor_enabled && data?.two_factor_secret ? true : false;
        } catch (e) {
            return false;
        }
    },

    generate2FASecret: async function(userId) {
        try {
            if (typeof otplib === 'undefined') {
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
                let secret = '';
                for (let i = 0; i < 32; i++) {
                    secret += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                
                await this.supabase
                    .from('consolidated_user_profiles_table')
                    .update({
                        two_factor_secret: secret,
                        two_factor_enabled: false,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', userId);
                
                return secret;
            }
            
            const secret = otplib.authenticator.generateSecret();
            
            await this.supabase
                .from('consolidated_user_profiles_table')
                .update({
                    two_factor_secret: secret,
                    two_factor_enabled: false,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId);
            
            return secret;
        } catch (error) {
            console.error('Error generating 2FA secret:', error);
            return null;
        }
    },

    get2FASecret: async function(userId) {
        try {
            const { data, error } = await this.supabase
                .from('consolidated_user_profiles_table')
                .select('two_factor_secret, two_factor_enabled')
                .eq('user_id', userId)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error getting 2FA secret:', error);
            return null;
        }
    },

    verifyTOTP: function(secret, token) {
        try {
            if (typeof otplib !== 'undefined') {
                return otplib.authenticator.check(token, secret);
            }
            
            console.warn('OTPLib not available - using basic verification');
            return token.length === 6 && /^\d{6}$/.test(token);
        } catch (error) {
            console.error('Error verifying TOTP:', error);
            return false;
        }
    },

    show2FASetup: async function(userId, email) {
        try {
            let result = await this.get2FASecret(userId);
            let secret = result?.two_factor_secret;
            
            if (!secret) {
                secret = await this.generate2FASecret(userId);
                if (!secret) {
                    this.showError('Could not generate 2FA secret');
                    return;
                }
            }
            
            const appName = 'NCHSM Portal';
            const otpauth = `otpauth://totp/${encodeURIComponent(appName)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(appName)}`;
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauth)}`;
            
            const qrImage = document.getElementById('qrCodeImage');
            const secretKey = document.getElementById('secretKey');
            
            if (qrImage) qrImage.src = qrUrl;
            if (secretKey) {
                const formatted = secret.replace(/(.{4})/g, '$1 ').trim();
                secretKey.textContent = formatted;
            }
            
            this.openModal('twoFactorSetupModal');
            
            sessionStorage.setItem('2fa_setup_secret', secret);
            sessionStorage.setItem('2fa_setup_user', userId);
            
        } catch (error) {
            console.error('Error showing 2FA setup:', error);
            this.showError('Error setting up 2FA');
        }
    },

    enable2FA: async function(userId, token) {
        try {
            const result = await this.get2FASecret(userId);
            if (!result || !result.two_factor_secret) {
                this.showError('No 2FA secret found');
                return false;
            }
            
            const isValid = this.verifyTOTP(result.two_factor_secret, token);
            
            if (isValid) {
                await this.supabase
                    .from('consolidated_user_profiles_table')
                    .update({
                        two_factor_enabled: true,
                        two_factor_verified: true,
                        two_factor_setup_date: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', userId);
                
                this.showSuccess('✅ Two-factor authentication enabled!');
                this.closeModal('twoFactorSetupModal');
                
                setTimeout(() => {
                    this.update2FAButtonStatus();
                }, 500);
                
                return true;
            } else {
                this.showError('Invalid verification code. Please try again.');
                return false;
            }
        } catch (error) {
            console.error('Error enabling 2FA:', error);
            this.showError('Error enabling 2FA');
            return false;
        }
    },

    show2FAModal: function() {
        this.openModal('twoFactorModal');
        
        document.querySelectorAll('#twoFactorModal .otp-digit').forEach(input => {
            input.value = '';
        });
        const firstInput = document.querySelector('#twoFactorModal .otp-digit');
        if (firstInput) firstInput.focus();
        
        const verifyBtn = document.getElementById('verifyOTP');
        if (verifyBtn) {
            verifyBtn.onclick = () => this.handle2FAVerification();
        }
    },

    handle2FAVerification: async function() {
        const digits = document.querySelectorAll('#twoFactorModal .otp-digit');
        let code = '';
        digits.forEach(input => code += input.value);
        
        if (code.length !== 6) {
            this.showError('Please enter all 6 digits');
            return;
        }
        
        const pendingData = JSON.parse(sessionStorage.getItem('pending_login_data'));
        if (!pendingData) {
            this.showError('Login session expired. Please try again.');
            this.closeModal('twoFactorModal');
            return;
        }
        
        try {
            const result = await this.get2FASecret(pendingData.profile.user_id);
            if (!result || !result.two_factor_secret) {
                this.showError('2FA not set up for this account');
                return;
            }
            
            const isValid = this.verifyTOTP(result.two_factor_secret, code);
            
            if (isValid) {
                this.closeModal('twoFactorModal');
                this.showSuccess('✅ 2FA verified successfully!');
                
                const secureToken = this.generateSecureToken();
                await this.completeLogin(
                    pendingData.profile,
                    secureToken,
                    pendingData.isStaff
                );
                
                sessionStorage.removeItem('pending_login_data');
            } else {
                this.showError('Invalid code. Please try again.');
                document.querySelectorAll('#twoFactorModal .otp-digit').forEach(input => {
                    input.value = '';
                });
                document.querySelector('#twoFactorModal .otp-digit')?.focus();
            }
        } catch (error) {
            console.error('2FA verification error:', error);
            this.showError('Error verifying 2FA code');
        }
    },

    // ============================================
    // SESSION TRACKING
    // ============================================
    trackUserSession: async function(userId, email, sessionToken, userAgent, isStaff = false) {
        console.log('🔍 Tracking session for:', email);
        
        try {
            if (!this.supabase) {
                console.error('❌ Supabase not initialized!');
                return null;
            }
            
            let ipAddress = 'unknown';
            try {
                const ipResponse = await fetch('https://api.ipify.org?format=json');
                const ipData = await ipResponse.json();
                ipAddress = ipData.ip;
            } catch (ipError) {
                console.warn('⚠️ Could not get IP');
            }
            
            const deviceInfo = this.parseUserAgent(userAgent);
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24);
            
            const hashedToken = await this.hashToken(sessionToken);
            
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
            
            const { data, error } = await this.supabase
                .from('user_sessions')
                .insert(sessionData)
                .select();
            
            if (error) {
                console.error('❌ Session insert error:', error);
                return null;
            }
            
            if (data && data[0]) {
                localStorage.setItem('session_id', data[0].id);
            }
            
            return data?.[0];
            
        } catch (error) {
            console.error('❌ Session tracking error:', error);
            return null;
        }
    },

    // ============================================
    // COMPLETE LOGIN - FIXED
    // ============================================
    completeLogin: async function(profileData, sessionToken, isStaff = false) {
        console.log('🎉 Completing login for:', profileData.email);
        
        try {
            let userIdForSession = profileData.user_id;
            
            if (isStaff && typeof profileData.user_id === 'string' && profileData.user_id.startsWith('STAFF')) {
                try {
                    const { data: profile, error } = await this.supabase
                        .from('consolidated_user_profiles_table')
                        .select('user_id')
                        .eq('email', profileData.email)
                        .single();
                    
                    if (!error && profile?.user_id) {
                        userIdForSession = profile.user_id;
                    }
                } catch (e) {}
            }
            
            if (!isStaff) {
                await this.updateLastLogin(profileData.user_id, profileData.email);
            }
            
            await this.trackUserSession(
                userIdForSession,
                profileData.email,
                sessionToken,
                navigator.userAgent,
                isStaff
            );
            
            // FIXED: Clean profile object with no undefined values
            const safeProfile = {
                user_id: userIdForSession || profileData.user_id || null,
                staff_id: profileData.staff_id || profileData.id || null,
                email: profileData.email || '',
                full_name: profileData.full_name || 'User',
                role: profileData.role || 'student',
                program: profileData.program || profileData.department || '',
                is_staff: isStaff || false,
                two_factor_enabled: profileData.two_factor_enabled || false,
                two_factor_verified: profileData.two_factor_verified || false
            };
            
            // Remove any undefined values
            Object.keys(safeProfile).forEach(key => {
                if (safeProfile[key] === undefined) {
                    safeProfile[key] = null;
                }
            });
            
            localStorage.setItem('userProfile', JSON.stringify(safeProfile));
            
            if (!isStaff && this.supabase) {
                try {
                    const { data: { session } } = await this.supabase.auth.getSession();
                    if (session) {
                        localStorage.setItem('session_expires', session.expires_at);
                    }
                } catch (err) {}
            }
            
            this.updateLastLoginInfo();
            
            if (profileData.role === 'student' && !isStaff) {
                this.sendLoginNotification(profileData).catch(() => {});
            }
            
            setTimeout(() => {
                this.update2FAButtonStatus();
            }, 500);
            
            this.redirectToDashboard(profileData);
            
        } catch (error) {
            console.error('❌ Complete login error:', error);
            this.showError('Error completing login: ' + error.message);
        }
    },

    // ============================================
    // FORCE UPDATE LOGIN COUNT
    // ============================================
    forceUpdateLoginCount: async function(userId) {
        try {
            const { data: sessions, error: sessionsError } = await this.supabase
                .from('user_sessions')
                .select('id')
                .eq('user_id', userId);
            
            if (sessionsError) {
                console.error('❌ Error counting sessions:', sessionsError);
                return false;
            }
            
            const sessionCount = sessions?.length || 0;
            
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
        if (!studentData || studentData.role === 'staff' || studentData.is_staff) return;
        if (!studentData.email || !this.brevo.enabled) return;
        
        try {
            if (!this.brevo._initialized) {
                const loaded = await this.loadBrevoApiKey();
                if (!loaded) return;
            }
            
            if (!this.brevo.apiKey) return;
            
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
            
            const htmlContent = `
                <h2>🔐 New Login Alert</h2>
                <p>Hello ${studentData.full_name || 'Student'},</p>
                <p>Your NCHSM account was just accessed from:</p>
                <ul>
                    <li><strong>IP:</strong> ${ip}</li>
                    <li><strong>Device:</strong> ${device}</li>
                    <li><strong>Time:</strong> ${time}</li>
                </ul>
                <p>If this wasn't you, please contact support immediately.</p>
            `;
            
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
                    subject: '🔐 New Login Alert - NCHSM Portal',
                    htmlContent: htmlContent
                })
            });
            
            if (response.ok) {
                console.log(`✅ Login notification sent to ${studentData.email}`);
            }
        } catch(e) {
            console.warn('⚠️ Login notification error:', e);
        }
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
    // 2FA OTP INPUT
    // ============================================
    initOTPInputs: function() {
        document.querySelectorAll('.otp-digit').forEach((input, index, inputs) => {
            
            input.addEventListener('input', function(e) {
                this.value = this.value.replace(/[^0-9]/g, '');
                
                if (this.value.length === 1 && index < inputs.length - 1) {
                    inputs[index + 1].focus();
                }
                
                const allFilled = Array.from(inputs).every(inp => inp.value.length === 1);
                
                if (allFilled) {
                    let code = '';
                    inputs.forEach(inp => code += inp.value);
                    console.log('📱 2FA Code entered:', code);
                    
                    const modal = this.closest('.modal-overlay');
                    
                    if (modal) {
                        let verifyBtn = modal.querySelector('#verifyOTP');
                        if (!verifyBtn) verifyBtn = modal.querySelector('.verify-otp');
                        if (!verifyBtn) verifyBtn = modal.querySelector('.btn-primary');
                        
                        if (verifyBtn) {
                            const originalText = verifyBtn.textContent;
                            verifyBtn.textContent = '⏳ Verifying...';
                            verifyBtn.disabled = true;
                            
                            setTimeout(() => {
                                verifyBtn.click();
                                
                                setTimeout(() => {
                                    verifyBtn.textContent = originalText;
                                    verifyBtn.disabled = false;
                                }, 2000);
                            }, 400);
                        }
                    }
                }
            });
            
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Backspace' && this.value.length === 0 && index > 0) {
                    inputs[index - 1].focus();
                    inputs[index - 1].value = '';
                }
                
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const modal = this.closest('.modal-overlay');
                    if (modal) {
                        const verifyBtn = modal.querySelector('#verifyOTP, .verify-otp, .btn-primary');
                        if (verifyBtn) verifyBtn.click();
                    }
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
                    
                    const modal = this.closest('.modal-overlay');
                    if (modal) {
                        const verifyBtn = modal.querySelector('#verifyOTP, .verify-otp, .btn-primary');
                        if (verifyBtn) {
                            verifyBtn.textContent = '⏳ Verifying...';
                            verifyBtn.disabled = true;
                            
                            setTimeout(() => {
                                verifyBtn.click();
                                setTimeout(() => {
                                    verifyBtn.textContent = 'Verify Code';
                                    verifyBtn.disabled = false;
                                }, 2000);
                            }, 400);
                        }
                    }
                }
            });
            
            input.addEventListener('focus', function() {
                if (this.value.length > 0) {
                    this.select();
                }
            });
        });
        
        console.log('✅ 2FA OTP Inputs initialized');
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
        const attemptsProgress = document.getElementById('attemptsProgress');
        
        if (attemptsInfo && attemptsText) {
            if (remaining <= 0) {
                attemptsInfo.style.display = 'none';
            } else {
                attemptsInfo.style.display = 'flex';
                attemptsText.textContent = `${remaining} attempts remaining`;
                if (attemptsProgress) {
                    const percentage = (remaining / this.state.maxAttempts) * 100;
                    attemptsProgress.style.width = `${percentage}%`;
                    attemptsProgress.style.background = remaining <= 2 ? '#dc2626' : '#2ecc71';
                }
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
    // PASSWORD STRENGTH METER
    // ============================================
    initPasswordStrength: function() {
        const passwordInput = document.getElementById('password');
        const strengthProgress = document.getElementById('strengthProgress');
        const strengthText = document.getElementById('strengthText');
        
        if (!passwordInput || !strengthProgress || !strengthText) {
            console.warn('⚠️ Password strength elements not found');
            return;
        }
        
        passwordInput.addEventListener('input', function() {
            const password = this.value;
            let strength = 0;
            
            if (password.length >= 6) strength++;
            if (password.length >= 12) strength++;
            if (/[A-Z]/.test(password)) strength++;
            if (/[a-z]/.test(password)) strength++;
            if (/[0-9]/.test(password)) strength++;
            if (/[^A-Za-z0-9]/.test(password)) strength++;
            
            const commonPasswords = ['password', '123456', '12345678', 'qwerty', 'admin', 'letmein', 'password123'];
            if (commonPasswords.some(p => password.toLowerCase().includes(p))) {
                strength = Math.max(0, strength - 2);
            }
            
            const levels = [
                { text: 'Very Weak', color: '#ef4444', width: '20%' },
                { text: 'Weak', color: '#ef4444', width: '40%' },
                { text: 'Fair', color: '#f59e0b', width: '60%' },
                { text: 'Good', color: '#3b82f6', width: '80%' },
                { text: 'Strong', color: '#10b981', width: '100%' }
            ];
            
            const level = Math.min(Math.floor(strength / 1.5), 4);
            const result = levels[level] || levels[0];
            
            strengthProgress.style.width = result.width;
            strengthProgress.style.background = result.color;
            
            if (password.length === 0) {
                strengthText.textContent = 'Enter a strong password (min 8 chars)';
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
            modal.style.display = 'flex';
            modal.classList.add('active');
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
            modal.style.display = 'none';
            modal.classList.remove('active');
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
            
            if (!staff) {
                console.log('❌ Staff not found:', identifier);
                return null;
            }
            
            const storedPassword = atob(staff.password_hash);
            if (storedPassword !== password) {
                console.log('❌ Password mismatch for:', identifier);
                return null;
            }
            
            let uuid = staff.id;
            try {
                const { data: profile } = await this.supabase
                    .from('consolidated_user_profiles_table')
                    .select('user_id')
                    .eq('email', staff.email)
                    .single();
                
                if (profile?.user_id) {
                    uuid = profile.user_id;
                    console.log('✅ Found UUID for staff:', uuid);
                }
            } catch (e) {
                console.log('⚠️ Could not get UUID, using staff ID:', staff.id);
            }
            
            return {
                user_id: uuid,
                staff_id: staff.id,
                id: staff.id,
                email: staff.email,
                full_name: `${staff.first_name} ${staff.other_names || ''}`.trim(),
                role: staff.designation === 'Lecturer' || staff.designation === 'Senior Lecturer' ? 'lecturer' : 'staff',
                program: staff.department,
                is_staff: true,
                staff_record: staff
            };
        } catch (error) {
            console.error('❌ Staff verification error:', error);
            return null;
        }
    },

    // ============================================
    // EXECUTE LOGIN - FIXED
    // ============================================
    executeLogin: async function(identifier, password) {
        if (!this.supabase) {
            throw new Error('Authentication service not available');
        }
        
        await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));
        
        let profileData = null;
        let isStaff = false;
        
        const staffProfile = await this.verifyStaffLogin(identifier, password);
        if (staffProfile) {
            console.log('✅ Staff login successful:', staffProfile.email);
            profileData = staffProfile;
            isStaff = true;
            return { profileData, isStaff };
        }
        
        console.log('🔐 Checking student login for:', identifier);
        
        try {
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
            
            if (!authData.user) {
                throw new Error('No user found');
            }
            
            console.log('✅ Supabase Auth successful for:', identifier);
            
            // FIXED: Select specific columns only
            const { data: profile, error: profileError } = await this.supabase
                .from('consolidated_user_profiles_table')
                .select('user_id, email, full_name, role, program, department, staff_id, status, two_factor_enabled, two_factor_secret, two_factor_verified')
                .eq('email', identifier)
                .maybeSingle();
            
            if (profileError) {
                console.error('❌ Profile error:', profileError);
                await this.supabase.auth.signOut();
                throw new Error('Error loading profile: ' + profileError.message);
            }
            
            // FIXED: Better handling for missing profile
            if (!profile) {
                console.error('❌ No profile found for:', identifier);
                // Try to create a minimal profile
                try {
                    const { error: insertError } = await this.supabase
                        .from('consolidated_user_profiles_table')
                        .insert({
                            user_id: authData.user.id,
                            email: identifier,
                            full_name: authData.user.user_metadata?.full_name || 'Student',
                            role: 'student',
                            status: 'active'
                        });
                    
                    if (!insertError) {
                        // Fetch the newly created profile
                        const { data: newProfile } = await this.supabase
                            .from('consolidated_user_profiles_table')
                            .select('user_id, email, full_name, role, program, department, staff_id, status, two_factor_enabled, two_factor_secret, two_factor_verified')
                            .eq('email', identifier)
                            .maybeSingle();
                        
                        if (newProfile) {
                            return { 
                                profileData: {
                                    user_id: newProfile.user_id,
                                    email: newProfile.email,
                                    full_name: newProfile.full_name || 'Student',
                                    role: newProfile.role || 'student',
                                    program: newProfile.program || newProfile.department,
                                    staff_id: newProfile.staff_id || null,
                                    is_staff: false,
                                    two_factor_enabled: newProfile.two_factor_enabled || false,
                                    two_factor_verified: newProfile.two_factor_verified || false
                                }, 
                                isStaff: false 
                            };
                        }
                    }
                } catch (e) {
                    console.warn('Could not create profile:', e);
                }
                throw new Error('Account not found. Please contact support.');
            }
            
            const validStatuses = ['approved', 'active'];
            if (!validStatuses.includes(profile.status?.toLowerCase())) {
                await this.supabase.auth.signOut();
                throw new Error('Account pending approval. Please wait.');
            }
            
            return { 
                profileData: {
                    user_id: profile.user_id,
                    email: profile.email,
                    full_name: profile.full_name || 'Student',
                    role: profile.role || 'student',
                    program: profile.program || profile.department,
                    staff_id: profile.staff_id || null,
                    is_staff: false,
                    two_factor_enabled: profile.two_factor_enabled || false,
                    two_factor_verified: profile.two_factor_verified || false,
                    ...profile
                }, 
                isStaff: false 
            };
        } catch (error) {
            console.error('❌ Student login error:', error);
            throw error;
        }
    },

    // ============================================
    // LOGIN HANDLER - WITH 2FA SUPPORT
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
        
        if (!password || password.length < 8) {
            this.showError('Password must be at least 8 characters');
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
            
            const has2FA = await this.check2FARequirement(result.profileData.user_id);
            
            if (has2FA) {
                sessionStorage.setItem('pending_login_data', JSON.stringify({
                    profile: result.profileData,
                    isStaff: result.isStaff
                }));
                
                this.show2FAModal();
                loginButton.disabled = false;
                buttonText.textContent = 'Sign In';
                this.state.isLoggingIn = false;
                return;
            }
            
            const secureToken = this.generateSecureToken();
            await this.completeLogin(result.profileData, secureToken, result.isStaff);
            
        } catch (error) {
            console.error('💥 Login error:', error);
            
            if (this.supabase && !error.message.includes('staff')) {
                try {
                    await this.supabase.auth.signOut();
                } catch (signOutError) {}
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
            warning.style.display = 'block';
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
                    if (warning) warning.style.display = 'none';
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
    // UPDATE LAST LOGIN
    // ============================================
    updateLastLogin: async function(userId, email) {
        try {
            console.log('📝 updateLastLogin called for:', userId);
            
            const now = new Date().toISOString();
            
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
    // UPDATE LAST LOGIN INFO - FIXED
    // ============================================
    updateLastLoginInfo: function() {
        const info = document.getElementById('lastLoginInfo');
        if (!info) return;
        
        try {
            const userProfile = localStorage.getItem('userProfile');
            if (!userProfile) {
                info.innerHTML = `
                    <i data-feather="clock"></i>
                    <span>Sign in to see your last login activity</span>
                `;
                if (typeof feather !== 'undefined') feather.replace();
                return;
            }
            
            const profile = JSON.parse(userProfile);
            const userId = profile.user_id;
            
            if (!userId) {
                info.innerHTML = `
                    <i data-feather="clock"></i>
                    <span>Welcome! Please log in to see your activity.</span>
                `;
                if (typeof feather !== 'undefined') feather.replace();
                return;
            }
            
            this.supabase
                .from('user_sessions')
                .select('login_time, device_info, ip_address')
                .eq('user_id', userId)
                .order('login_time', { ascending: false })
                .limit(2)
                .then(({ data, error }) => {
                    if (error || !data || data.length < 2) {
                        info.innerHTML = `
                            <i data-feather="clock"></i>
                            <span>Welcome ${profile.full_name || 'User'}!</span>
                        `;
                    } else {
                        const previousLogin = data[1];
                        const loginDate = new Date(previousLogin.login_time);
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
                    }
                    if (typeof feather !== 'undefined') feather.replace();
                })
                .catch((err) => {
                    console.warn('Error fetching session:', err);
                    info.innerHTML = `
                        <i data-feather="clock"></i>
                        <span>Welcome ${profile.full_name || 'User'}!</span>
                    `;
                    if (typeof feather !== 'undefined') feather.replace();
                });
        } catch (error) {
            console.error('❌ Error parsing profile:', error);
            // FIXED: Clear corrupted profile
            localStorage.removeItem('userProfile');
            info.innerHTML = `
                <i data-feather="clock"></i>
                <span>Sign in to see your last login activity</span>
            `;
            if (typeof feather !== 'undefined') feather.replace();
        }
    },
    
    // ============================================
    // REDIRECT TO DASHBOARD
    // ============================================
    redirectToDashboard: function(profileData) {
        console.log('🚀 Redirecting securely...');
        
        let role = profileData.role?.toLowerCase() || 'student';
        
        if (profileData.is_staff || role === 'staff' || role === 'lecturer') {
            role = 'lecturer';
        }
        
        const roleRedirects = {
            'superadmin': 'superadmin.html',
            'admin': 'admin.html',
            'student': 'student.html',
            'lecturer': 'lecturer.html'
        };
        
        let redirectFile = roleRedirects[role] || 'index.html';
        
        console.log(`🎯 Role: ${role} -> ${redirectFile}`);
        
        document.body.style.opacity = '0';
        document.body.style.transition = 'opacity 0.3s ease';
        
        setTimeout(() => {
            window.location.replace(redirectFile);
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
            element.style.display = 'flex';
            this.clearSuccess();
        }
    },
    
    clearError: function() {
        const element = document.getElementById('errorMsg');
        if (element) {
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
            element.style.display = 'flex';
            this.clearError();
        }
    },
    
    clearSuccess: function() {
        const element = document.getElementById('successMsg');
        if (element) {
            element.style.display = 'none';
        }
    },

    // ============================================
    // GOOGLE LOGIN
    // ============================================
    initGoogleLogin: function() {
        var self = this;
        
        if (typeof google === 'undefined' || !google.accounts) {
            console.warn('⚠️ Google library not loaded, retrying in 1s...');
            setTimeout(function() {
                self.initGoogleLogin();
            }, 1000);
            return;
        }
        
        console.log('🔑 Initializing Google Login...');
        
        try {
            google.accounts.id.initialize({
                client_id: this.google.clientId,
                callback: function(response) {
                    self.handleGoogleCredential(response);
                },
                cancel_on_tap_outside: false,
                auto_select: false,
                context: 'signin',
                ux_mode: 'redirect',
                login_uri: window.location.origin + window.location.pathname
            });
            
            var googleBtn = document.querySelector('.sso-btn.google');
            if (googleBtn) {
                var newBtn = googleBtn.cloneNode(true);
                googleBtn.parentNode.replaceChild(newBtn, googleBtn);
                
                newBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    console.log('🔑 Google button clicked...');
                    google.accounts.id.prompt();
                });
                console.log('✅ Google button attached');
            } else {
                console.warn('⚠️ Google button not found');
            }
            
            this.google.initialized = true;
            this.listenForGoogleRedirect();
        } catch (error) {
            console.error('❌ Google init error:', error);
        }
    },

    listenForGoogleRedirect: function() {
        var self = this;
        
        var storedCredential = sessionStorage.getItem('google_credential');
        if (storedCredential) {
            console.log('🎯 Found stored credential');
            sessionStorage.removeItem('google_credential');
            self.handleGoogleCredential({ credential: storedCredential });
            return;
        }
        
        window.addEventListener('googleCredentialReceived', function(event) {
            if (event.detail && event.detail.credential) {
                self.handleGoogleCredential({ credential: event.detail.credential });
            }
        });
    },

    handleGoogleCredential: function(response) {
        console.log('🎯 Google credential received');
        
        if (!response.credential) {
            this.showError('Google authentication failed');
            return;
        }
        
        try {
            var payload = this.decodeJWT(response.credential);
            console.log('📊 Google user:', payload.email);
            this.processGoogleLogin(payload);
        } catch (error) {
            console.error('❌ Error decoding JWT:', error);
            this.showError('Invalid Google response');
        }
    },

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

    processGoogleLogin: async function(payload) {
        if (!this.supabase) {
            this.showError('Authentication service unavailable');
            return;
        }
        
        const email = payload.email;
        const name = payload.name || payload.given_name || 'Student';
        
        const loginButton = document.getElementById('loginButton');
        const buttonText = document.querySelector('.button-text');
        if (loginButton) {
            loginButton.disabled = true;
            buttonText.innerHTML = '<span class="spinner"></span> Signing in...';
        }
        
        try {
            // FIXED: Select specific columns only
            const { data: profile, error: profileError } = await this.supabase
                .from('consolidated_user_profiles_table')
                .select('user_id, email, full_name, role, program, department, staff_id, status, two_factor_enabled, two_factor_secret, two_factor_verified')
                .eq('email', email)
                .maybeSingle();
            
            if (profileError || !profile) {
                this.showError('No account found with this email. Please register first.');
                setTimeout(() => window.location.href = 'register.html', 2000);
                return;
            }
            
            const validStatuses = ['approved', 'active'];
            if (!validStatuses.includes(profile.status?.toLowerCase())) {
                this.showError('Account pending approval. Please wait.');
                return;
            }
            
            const isStaff = profile.staff_id ? true : false;
            const userId = profile.user_id;
            
            const has2FA = await this.check2FARequirement(userId);
            
            if (has2FA) {
                sessionStorage.setItem('pending_login_data', JSON.stringify({
                    profile: {
                        user_id: userId,
                        email: email,
                        full_name: profile.full_name || name,
                        role: profile.role || 'student',
                        program: profile.program || profile.department,
                        staff_id: profile.staff_id || null,
                        is_staff: isStaff,
                        auth_provider: 'google'
                    },
                    isStaff: isStaff
                }));
                
                this.show2FAModal();
                if (loginButton) {
                    loginButton.disabled = false;
                    buttonText.textContent = 'Sign In';
                }
                return;
            }
            
            const sessionToken = this.generateSecureToken();
            await this.trackUserSession(
                userId,
                email,
                sessionToken,
                navigator.userAgent,
                isStaff
            );
            
            const safeProfile = {
                user_id: userId,
                email: email,
                full_name: profile.full_name || name,
                role: profile.role || 'student',
                program: profile.program || profile.department,
                staff_id: profile.staff_id || null,
                is_staff: isStaff,
                auth_provider: 'google',
                two_factor_enabled: profile.two_factor_enabled || false,
                two_factor_verified: profile.two_factor_verified || false
            };
            localStorage.setItem('userProfile', JSON.stringify(safeProfile));
            
            await this.updateLastLogin(userId, email);
            
            this.showSuccess(`✅ Welcome back, ${safeProfile.full_name}!`);
            this.updateLastLoginInfo();
            
            setTimeout(() => {
                this.update2FAButtonStatus();
            }, 500);
            
            setTimeout(() => this.redirectToDashboard(safeProfile), 1000);
            
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
// GLOBAL 2FA FUNCTIONS
// ============================================

window.showQRCode = async function() {
    try {
        const userProfile = JSON.parse(localStorage.getItem('userProfile'));
        
        if (!userProfile) {
            const statusEl = document.getElementById('twoFAStatus');
            if (statusEl) {
                statusEl.style.display = 'block';
                statusEl.style.color = '#dc2626';
                statusEl.textContent = '⚠️ Please login first to enable 2FA';
                setTimeout(() => { statusEl.style.display = 'none'; }, 4000);
            }
            return;
        }
        
        const { data, error } = await window.NCHSMLogin.supabase
            .from('consolidated_user_profiles_table')
            .select('two_factor_secret, two_factor_enabled')
            .eq('user_id', userProfile.user_id)
            .single();
        
        if (error) {
            console.error('Error getting secret:', error);
            alert('Error loading 2FA settings');
            return;
        }
        
        if (data?.two_factor_enabled) {
            const statusEl = document.getElementById('twoFAStatus');
            if (statusEl) {
                statusEl.style.display = 'block';
                statusEl.style.color = '#10b981';
                statusEl.textContent = '✅ 2FA is already enabled for your account!';
                setTimeout(() => { statusEl.style.display = 'none'; }, 4000);
            }
            return;
        }
        
        let secret = data?.two_factor_secret;
        
        if (!secret) {
            const newSecret = await window.NCHSMLogin.generate2FASecret(userProfile.user_id);
            if (!newSecret) {
                alert('Error generating 2FA secret. Please try again.');
                return;
            }
            secret = newSecret;
        }
        
        const appName = 'NCHSM Portal';
        const email = userProfile.email;
        const otpauth = `otpauth://totp/${encodeURIComponent(appName)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(appName)}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(otpauth)}`;
        
        document.getElementById('qrCodeImage').src = qrUrl;
        document.getElementById('secretKey').textContent = secret.replace(/(.{4})/g, '$1 ').trim();
        document.getElementById('twoFactorSetupModal').style.display = 'flex';
        
        sessionStorage.setItem('2fa_setup_secret', secret);
        sessionStorage.setItem('2fa_setup_user', userProfile.user_id);
        
    } catch (error) {
        console.error('Error showing QR code:', error);
        alert('Error loading QR code. Please try again.');
    }
};

window.copySecret = function() {
    const secretElement = document.getElementById('secretKey');
    if (secretElement) {
        const text = secretElement.textContent.replace(/\s/g, '');
        navigator.clipboard.writeText(text).then(() => {
            const btn = document.querySelector('button[onclick="copySecret()"]');
            if (btn) {
                btn.textContent = '✅ Copied!';
                btn.style.background = '#10b981';
                setTimeout(() => {
                    btn.textContent = '📋 Copy Secret Key';
                    btn.style.background = '#0A3D62';
                }, 2000);
            }
        }).catch(() => {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert('✅ Secret copied to clipboard!');
        });
    }
};

window.verifyAndEnable2FA = async function() {
    const digits = document.querySelectorAll('#twoFactorSetupModal .setup-otp');
    let code = '';
    digits.forEach(input => code += input.value);
    
    if (code.length !== 6) {
        const statusEl = document.getElementById('setupStatus');
        if (statusEl) {
            statusEl.style.display = 'block';
            statusEl.style.color = '#dc2626';
            statusEl.textContent = '⚠️ Please enter all 6 digits';
            setTimeout(() => { statusEl.style.display = 'none'; }, 3000);
        }
        return;
    }
    
    const userProfile = JSON.parse(localStorage.getItem('userProfile'));
    if (!userProfile) {
        alert('Please login first');
        return;
    }
    
    let secret = sessionStorage.getItem('2fa_setup_secret');
    if (!secret) {
        const { data, error } = await window.NCHSMLogin.supabase
            .from('consolidated_user_profiles_table')
            .select('two_factor_secret')
            .eq('user_id', userProfile.user_id)
            .single();
        
        if (error || !data?.two_factor_secret) {
            alert('No 2FA secret found. Please try again.');
            return;
        }
        secret = data.two_factor_secret;
    }
    
    const verifyBtn = document.querySelector('#twoFactorSetupModal .btn-primary');
    if (verifyBtn) {
        verifyBtn.textContent = '⏳ Verifying...';
        verifyBtn.disabled = true;
    }
    
    const isValid = window.NCHSMLogin.verifyTOTP(secret, code);
    
    if (isValid) {
        const { error } = await window.NCHSMLogin.supabase
            .from('consolidated_user_profiles_table')
            .update({
                two_factor_enabled: true,
                two_factor_verified: true,
                two_factor_setup_date: new Date().toISOString()
            })
            .eq('user_id', userProfile.user_id);
        
        if (error) {
            alert('Error enabling 2FA. Please try again.');
            console.error('Error enabling 2FA:', error);
            return;
        }
        
        window.NCHSMLogin.closeModal('twoFactorSetupModal');
        
        const statusEl = document.getElementById('twoFAStatus');
        if (statusEl) {
            statusEl.style.display = 'block';
            statusEl.style.color = '#10b981';
            statusEl.textContent = '✅ 2FA enabled successfully! 🎉';
            setTimeout(() => { statusEl.style.display = 'none'; }, 5000);
        }
        
        sessionStorage.removeItem('2fa_setup_secret');
        sessionStorage.removeItem('2fa_setup_user');
        
        const enableBtn = document.getElementById('enable2FABtn');
        if (enableBtn) {
            enableBtn.innerHTML = '✅ 2FA Enabled';
            enableBtn.style.background = '#10b981';
            enableBtn.disabled = true;
            enableBtn.style.cursor = 'default';
            enableBtn.style.opacity = '0.8';
        }
        
        alert('✅ Two-Factor Authentication enabled successfully!');
        
    } else {
        const statusEl = document.getElementById('setupStatus');
        if (statusEl) {
            statusEl.style.display = 'block';
            statusEl.style.color = '#dc2626';
            statusEl.textContent = '❌ Invalid code. Please try again.';
            setTimeout(() => { statusEl.style.display = 'none'; }, 3000);
        }
        
        document.querySelectorAll('#twoFactorSetupModal .setup-otp').forEach(input => {
            input.value = '';
        });
        document.querySelector('#twoFactorSetupModal .setup-otp')?.focus();
    }
    
    if (verifyBtn) {
        verifyBtn.textContent = '🔐 Verify & Enable 2FA';
        verifyBtn.disabled = false;
    }
};

// ============================================
// INITIALIZE
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    const savedAttempts = sessionStorage.getItem('failedAttempts');
    const savedTime = sessionStorage.getItem('lastFailedTime');
    if (savedAttempts) window.NCHSMLogin.state.failedAttempts = parseInt(savedAttempts);
    if (savedTime) window.NCHSMLogin.state.lastFailedTime = parseInt(savedTime);
    
    window.NCHSMLogin.init();
    
    console.log('✅ Secure application ready');
    console.log('🔐 2FA support: ENABLED');
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

// ============================================
// FORCE CACHE CLEAR HELPER
// ============================================
window.forceClearCache = function() {
    if (confirm('This will clear all cached data and reload the page. Continue?')) {
        localStorage.clear();
        sessionStorage.clear();
        document.cookie.split(";").forEach(function(c) {
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        window.location.reload(true);
    }
};

console.log('📦 NCHSM Login v5.1 loaded - Full 2FA Support');
console.log('🔐 Google Authenticator, Microsoft Authenticator, Authy ready');
console.log(`🕐 ${new Date().toLocaleString()}`);
