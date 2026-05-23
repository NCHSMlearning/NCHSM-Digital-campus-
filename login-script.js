// ============================================
// COMPLETE LOGIN SCRIPT WITH SESSION TRACKING
// ============================================

// Create a namespace for our app to avoid conflicts
window.NCHSMLogin = {
    // State Management
    state: {
        currentUser: null,
        isLoggingIn: false,
        trustedDevices: JSON.parse(localStorage.getItem('trusted_devices') || '{}')
    },
    
    // Supabase client (will be initialized later)
    supabase: null,
    
    // ============================================
    // INITIALIZATION
    // ============================================
    init: function() {
        console.log('🚀 Initializing NCHSMLogin...');
        
        // Initialize Feather Icons
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
        
        // Check for trusted device
        this.checkTrustedDevice();
        
        // Password Toggle
        this.initPasswordToggle();
        
        // Form Submission
        this.initLoginForm();
        
        // Initialize modals
        this.initModals();
        
        // Focus management for accessibility
        this.initFocusManagement();
        
        // Handle virtual keyboard
        this.initVirtualKeyboardHandler();
        
        // Initialize Supabase safely
        this.initSupabase();
        
        console.log('✅ NCHSMLogin initialized');
    },
    
    // ============================================
    // SUPABASE INITIALIZATION
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
                            autoRefreshToken: true
                        },
                        db: {
                            schema: 'public'
                        }
                    }
                );
                console.log('✅ Supabase initialized successfully');
            } else {
                console.error('❌ Supabase library not loaded');
                this.showError(document.getElementById('errorMsg'), 'Authentication service not available. Please refresh the page.');
            }
        } catch (error) {
            console.error('❌ Error initializing Supabase:', error);
        }
    },
    
    // ============================================
    // INITIALIZATION FUNCTIONS
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
        });
        
        // Prevent form submission on toggle
        toggleButton.addEventListener('mousedown', (e) => e.preventDefault());
        toggleButton.addEventListener('touchstart', (e) => e.preventDefault());
    },
    
    initLoginForm: function() {
        const loginForm = document.getElementById('loginForm');
        if (!loginForm) return;
        
        loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        
        // Auto-focus email field on load
        const emailInput = document.getElementById('email');
        if (emailInput) {
            setTimeout(() => emailInput.focus(), 100);
        }
        
        // Add input validation
        const inputs = loginForm.querySelectorAll('input[required]');
        inputs.forEach(input => {
            input.addEventListener('blur', (e) => this.validateField(e));
            input.addEventListener('input', (e) => this.clearFieldError(e));
        });
    },
    
    initModals: function() {
        // Add keyboard navigation to modals
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.addEventListener('keydown', (e) => this.handleModalKeyboard(e));
        });
        
        // Close modal on backdrop click
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideAllModals();
                }
            });
        });
    },
    
    initFocusManagement: function() {
        // Trap focus in modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab' && document.querySelector('.modal-overlay.active')) {
                this.trapFocus(e);
            }
        });
    },
    
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
    // TRUSTED DEVICE CHECK
    // ============================================
    checkTrustedDevice: function() {
        const deviceId = this.generateDeviceId();
        const trustedDevice = this.state.trustedDevices[deviceId];
        
        if (trustedDevice && new Date(trustedDevice.expires) > new Date()) {
            const storedUser = localStorage.getItem('currentUserProfile');
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
        
        return btoa(data).substring(0, 32);
    },
    
    // ============================================
    // VALIDATION FUNCTIONS
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
        this.clearError(document.getElementById('errorMsg'));
    },
    
    // ============================================
    // LOGIN HANDLER
    // ============================================
    handleLogin: async function(e) {
        e.preventDefault();
        
        if (this.state.isLoggingIn) return;
        
        const email = document.getElementById('email').value.trim().toLowerCase();
        const password = document.getElementById('password').value;
        const errorMsg = document.getElementById('errorMsg');
        const loginButton = document.getElementById('loginButton');
        const buttonText = document.getElementById('button-text');
        
        if (!this.validateEmail(email)) {
            this.showError(errorMsg, 'Please enter a valid email address');
            return;
        }
        
        if (!password) {
            this.showError(errorMsg, 'Please enter your password');
            return;
        }
        
        this.clearError(errorMsg);
        this.state.isLoggingIn = true;
        loginButton.disabled = true;
        buttonText.innerHTML = '<span class="loading-spinner"></span> Signing In...';
        
        try {
            console.log('🔐 Attempting login for:', email);
            
            if (!this.supabase) {
                throw new Error('Authentication service not available');
            }
            
            const { data: authData, error: authError } = await this.supabase.auth.signInWithPassword({ 
                email, 
                password 
            });
            
            if (authError) {
                if (authError.message.includes('Invalid login credentials')) {
                    throw new Error('Invalid email or password. Please try again.');
                } else if (authError.message.includes('Email not confirmed')) {
                    throw new Error('Please verify your email address before logging in.');
                } else {
                    throw new Error(authError.message);
                }
            }
            
            console.log('✅ Authentication successful');
            
            this.state.currentUser = {
                email,
                userId: authData.user.id,
                session: authData.session
            };
            
            const { data: profileData, error: profileError } = await this.supabase
                .from('consolidated_user_profiles_table')
                .select('*')
                .eq('email', email)
                .maybeSingle();
            
            if (!profileData) {
                await this.supabase.auth.signOut();
                throw new Error('Account not found. Please register first.');
            }
            
            if (profileData.status?.toLowerCase() !== 'approved') {
                await this.supabase.auth.signOut();
                throw new Error('Account is pending approval. Please contact administration.');
            }
            
            console.log('✅ Profile loaded');
            
            await this.completeLogin(profileData, authData.session?.access_token);
            
        } catch (error) {
            console.error('💥 Login error:', error);
            
            if (this.supabase) {
                try {
                    await this.supabase.auth.signOut();
                } catch (signOutError) {
                    console.error('Sign out error:', signOutError);
                }
            }
            
            this.showError(errorMsg, error.message || 'Login failed. Please try again.');
            
        } finally {
            this.state.isLoggingIn = false;
            loginButton.disabled = false;
            buttonText.textContent = 'Sign In';
        }
    },
    
    // ============================================
    // SESSION TRACKING - NEW!
    // ============================================
    trackUserSession: async function(userId, email, sessionToken, userAgent) {
        try {
            console.log('🔍 Tracking session for user:', email);
            
            // Get user's IP address
            let ipAddress = 'unknown';
            try {
                const ipResponse = await fetch('https://api.ipify.org?format=json');
                const ipData = await ipResponse.json();
                ipAddress = ipData.ip;
            } catch (ipError) {
                console.warn('Could not fetch IP:', ipError);
            }
            
            // Parse device info from user agent
            const deviceInfo = this.parseUserAgent(userAgent);
            
            // Set session expiration (24 hours from now)
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24);
            
            // Generate a unique session token if not provided
            const finalSessionToken = sessionToken || this.generateSessionToken();
            
            // Insert new session record
            const { data, error } = await this.supabase
                .from('user_sessions')
                .insert({
                    user_id: userId,
                    session_token: finalSessionToken,
                    ip_address: ipAddress,
                    user_agent: userAgent,
                    device_info: deviceInfo,
                    login_time: new Date().toISOString(),
                    last_activity: new Date().toISOString(),
                    expires_at: expiresAt.toISOString(),
                    is_active: true
                })
                .select();
            
            if (error) {
                console.error('❌ Failed to track session:', error.message);
                return null;
            }
            
            console.log('✅ Session tracked for user:', email);
            
            // Store session info in localStorage for activity updates
            if (data && data[0]) {
                localStorage.setItem('current_session_id', data[0].id);
                localStorage.setItem('session_token', finalSessionToken);
            }
            
            return data?.[0];
            
        } catch (error) {
            console.error('❌ Session tracking error:', error);
            return null;
        }
    },
    
    // Parse user agent for device info
    parseUserAgent: function(userAgent) {
        if (!userAgent) return 'Unknown Device';
        
        const ua = userAgent.toLowerCase();
        
        // Browser detection
        let browser = 'Unknown';
        if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome';
        else if (ua.includes('firefox')) browser = 'Firefox';
        else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
        else if (ua.includes('edg')) browser = 'Edge';
        else if (ua.includes('opera')) browser = 'Opera';
        
        // OS detection
        let os = 'Unknown';
        if (ua.includes('windows')) os = 'Windows';
        else if (ua.includes('mac')) os = 'macOS';
        else if (ua.includes('linux')) os = 'Linux';
        else if (ua.includes('android')) os = 'Android';
        else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';
        
        // Device type
        let device = 'Desktop';
        if (ua.includes('mobile')) device = 'Mobile';
        else if (ua.includes('tablet')) device = 'Tablet';
        
        return `${browser} on ${os} (${device})`;
    },
    
    // Generate a unique session token
    generateSessionToken: function() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 16);
    },
    
    // ============================================
    // LOGIN TRACKING (Non-blocking - Safe)
    // ============================================
    updateLastLogin: async function(userId, email) {
        try {
            console.log('📝 Updating last login for:', email);
            
            const now = new Date().toISOString();
            
            // Get current login count first
            const { data: profile, error: fetchError } = await this.supabase
                .from('consolidated_user_profiles_table')
                .select('login_count')
                .eq('user_id', userId)
                .maybeSingle();
            
            if (fetchError) {
                console.error('Failed to fetch login count:', fetchError);
                return false;
            }
            
            const newCount = (profile?.login_count || 0) + 1;
            
            // Update last login
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
                console.error('Failed to update last login:', updateError);
                return false;
            }
            
            // Format time for display (Kenya time)
            const kenyaTime = new Date(now).toLocaleString('en-KE', { 
                timeZone: 'Africa/Nairobi',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });
            
            console.log(`✅ Last login updated: ${kenyaTime}`);
            console.log(`📊 Total logins: ${newCount}`);
            return true;
            
        } catch (error) {
            console.error('Last login update error:', error);
            return false;
        }
    },
    
    // ============================================
    // COMPLETE LOGIN - WITH LOGIN TRACKING AND SESSION TRACKING
    // ============================================
    completeLogin: async function(profileData, sessionToken) {
        console.log('🎉 Completing login for:', profileData.email);
        
        try {
            // Update last login (NON-BLOCKING)
            this.updateLastLogin(profileData.user_id, profileData.email)
                .then(result => {
                    if (result) {
                        console.log('✅ Login time recorded successfully');
                    } else {
                        console.warn('⚠️ Login time recording skipped (non-critical)');
                    }
                })
                .catch(err => {
                    console.warn('Non-critical: Login update failed', err);
                });
            
            // Track user session (NEW - NON-BLOCKING)
            this.trackUserSession(
                profileData.user_id,
                profileData.email,
                sessionToken,
                navigator.userAgent
            ).then(result => {
                if (result) {
                    console.log('✅ Session tracked successfully');
                } else {
                    console.warn('⚠️ Session tracking skipped (non-critical)');
                }
            }).catch(err => {
                console.warn('Non-critical: Session tracking failed', err);
            });
            
            // Store profile in localStorage
            localStorage.setItem('currentUserProfile', JSON.stringify(profileData));
            
            // Store session
            const { data: { session } } = await this.supabase.auth.getSession();
            if (session) {
                localStorage.setItem('supabase_session', JSON.stringify(session));
            }
            
            // Send email notification (non-blocking)
            this.sendLoginSuccessEmail(profileData.email, profileData.full_name || profileData.email)
                .then(() => console.log('✅ Login success email initiated'))
                .catch(err => console.warn('⚠️ Email sending failed (non-critical):', err));
            
            // Redirect to dashboard
            this.redirectToDashboard(profileData);
            
        } catch (error) {
            console.error('❌ Complete login error:', error);
            // Still redirect even if there's an error
            this.redirectToDashboard(profileData);
        }
    },
    
    // ============================================
    // SEND LOGIN SUCCESS EMAIL
    // ============================================
    sendLoginSuccessEmail: async function(email, userName) {
        return new Promise((resolve) => {
            console.log('🔐 Sending login success email to:', email);
            
            const scriptUrl = 'https://script.google.com/macros/s/AKfycbwo0Z-oQ_p5-dIe4XYiaRTv6ZdxlmfxP5LIpQT4T1cGihvlimVJg3AvdUNrDeZ0cEkJ3g/exec';
            
            const params = new URLSearchParams({
                to: email,
                otp: 'LOGIN_SUCCESS',
                userName: userName || email,
                emailType: 'login_success',
                subject: 'Login Successful - NCHSM Digital Portal'
            });
            
            const fullUrl = scriptUrl + '?' + params.toString();
            
            const img = new Image();
            img.src = fullUrl;
            
            img.onload = function() {
                console.log('✅ Login success email sent');
                resolve(true);
            };
            
            img.onerror = function() {
                console.log('✅ Login notification sent (img fallback)');
                resolve(true);
            };
            
            document.body.appendChild(img);
            
            setTimeout(() => {
                console.log('✅ Login email request completed');
                resolve(true);
            }, 1500);
        });
    },
    
    // ============================================
    // REDIRECT TO DASHBOARD - WITH CLEAN URLS
    // ============================================
    redirectToDashboard: function(profileData) {
        console.log('🚀 Redirecting to dashboard...');
        
        const redirects = {
            'student': '/student',
            'lecturer': '/lecturer',
            'admin': '/admin',
            'superadmin': '/superadmin',
            'hod': '/hod-tracker',
            'staff': '/staff'
        };
        
        const role = profileData.role?.toLowerCase() || 'student';
        const redirectUrl = redirects[role] || '/student';
        
        console.log(`🎯 Role: ${role}, Redirecting to: ${redirectUrl}`);
        
        // Smooth transition
        document.body.style.opacity = '0';
        document.body.style.transition = 'opacity 0.3s ease';
        
        setTimeout(() => {
            window.location.href = redirectUrl;
        }, 300);
    },
    
    // ============================================
    // MODAL MANAGEMENT
    // ============================================
    hideAllModals: function() {
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.classList.remove('active');
            modal.setAttribute('hidden', 'true');
        });
        document.body.style.overflow = '';
    },
    
    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    showError: function(element, message, type = 'error') {
        if (element) {
            const errorText = element.querySelector('.error-text');
            if (errorText) {
                errorText.textContent = message;
            }
            element.classList.remove('success', 'error', 'show');
            element.classList.add(type);
            element.classList.add('show');
            element.style.display = 'flex';
            
            if (type === 'success') {
                setTimeout(() => {
                    this.clearError(element);
                }, 5000);
            }
        }
    },
    
    clearError: function(element) {
        if (element) {
            element.classList.remove('show', 'error', 'success');
            element.style.display = 'none';
        }
    },
    
    // ============================================
    // ACCESSIBILITY FUNCTIONS
    // ============================================
    handleModalKeyboard: function(e) {
        if (e.key === 'Escape') {
            this.hideAllModals();
        }
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
    // PERFORMANCE OPTIMIZATIONS
    // ============================================
    updateOnlineStatus: function() {
        const isOnline = navigator.onLine;
        document.body.classList.toggle('offline', !isOnline);
        
        if (!isOnline) {
            this.showError(document.getElementById('errorMsg'), 'You are currently offline. Some features may be unavailable.');
        }
    }
};

// ============================================
// GLOBAL FUNCTION EXPORTS
// ============================================

window.hideAllModals = () => window.NCHSMLogin.hideAllModals();
window.goBackToLogin = () => window.NCHSMLogin.goBackToLogin?.() || window.location.reload();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM loaded, initializing...');
    window.NCHSMLogin.init();
    
    window.addEventListener('online', () => {
        console.log('🌐 Online');
        window.NCHSMLogin.updateOnlineStatus();
    });
    
    window.addEventListener('offline', () => {
        console.log('📴 Offline');
        window.NCHSMLogin.updateOnlineStatus();
    });
    
    window.NCHSMLogin.updateOnlineStatus();
    
    console.log('✅ Application ready');
});
