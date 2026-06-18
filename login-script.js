// ============================================
// QUEUE SYSTEM - COMPLETELY BYPASSED
// ============================================
const LoginQueue = {
    queue: [],
    active: 0,
    maxConcurrent: 999,
    
    async add(email, password) {
        // Direct login - no queue
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
// SECURE LOGIN SCRIPT - HACKER PROTECTED
// Supports: Students, Admins, SuperAdmins, Staff, Lecturers
// ============================================

// Create a namespace for our app to avoid conflicts
window.NCHSMLogin = {
    // State Management
    state: {
        currentUser: null,
        isLoggingIn: false,
        failedAttempts: 0,
        lastFailedTime: null,
        trustedDevices: JSON.parse(localStorage.getItem('trusted_devices') || '{}'),
        sessionId: null
    },
    
    // Security Configuration
    security: {
        maxFailedAttempts: 5,
        lockoutDuration: 15 * 60 * 1000, // 15 minutes
        minPasswordLength: 8,
        sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
        rateLimit: {
            enabled: true,
            maxRequests: 10,
            timeWindow: 60 * 1000 // 1 minute
        }
    },
    
    // Rate limiting tracking
    rateLimit: {
        requests: [],
        blockedUntil: null
    },
    
    // Supabase client (will be initialized later)
    supabase: null,
    
    // Staff records cache
    staffRecords: [],
    
    // ============================================
    // INITIALIZATION
    // ============================================
    init: function() {
        console.log('🚀 Initializing NCHSMLogin...');
        
        // Hide console from potential hackers (disable right-click, F12, etc.)
        this.disableDeveloperTools();
        
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
        
        // Load staff records for staff login
        this.loadStaffRecords();
        
        // Clear sensitive data from URL
        this.clearURLParameters();
        
        // Add honeypot field to catch bots
        this.addHoneypot();
        
        console.log('✅ NCHSMLogin initialized securely');
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
                console.log(`📋 Loaded ${this.staffRecords.length} staff records for login`);
            }
        } catch (error) {
            console.error('Error loading staff records:', error);
        }
    },
    
    // ============================================
    // SECURITY: Disable Developer Tools
    // ============================================
    disableDeveloperTools: function() {
        // Disable right-click
        document.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            return false;
        });
        
        // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
        document.addEventListener('keydown', function(e) {
            // F12
            if (e.key === 'F12') {
                e.preventDefault();
                return false;
            }
            // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
            if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) {
                e.preventDefault();
                return false;
            }
            // Ctrl+U
            if (e.ctrlKey && e.key === 'u') {
                e.preventDefault();
                return false;
            }
            // Ctrl+Shift+C
            if (e.ctrlKey && e.shiftKey && e.key === 'C') {
                e.preventDefault();
                return false;
            }
        });
        
        // Disable console.log override attempts
        const originalConsoleLog = console.log;
        console.log = function() {
            // Filter out sensitive info
            const args = Array.from(arguments);
            if (args.some(arg => typeof arg === 'string' && 
                (arg.includes('password') || arg.includes('token') || arg.includes('key')))) {
                return;
            }
            originalConsoleLog.apply(console, args);
        };
    },
    
    // ============================================
    // SECURITY: Clear URL Parameters
    // ============================================
    clearURLParameters: function() {
        if (window.location.search.length > 0) {
            const cleanUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
        }
    },
    
    // ============================================
    // SECURITY: Add Honeypot Field
    // ============================================
    addHoneypot: function() {
        const form = document.getElementById('loginForm');
        if (form && !document.getElementById('honeypot')) {
            const honeypot = document.createElement('div');
            honeypot.style.display = 'none';
            honeypot.innerHTML = '<input type="text" id="honeypot" name="honeypot" value="" tabindex="-1" autocomplete="off">';
            form.appendChild(honeypot);
        }
    },
    
    // ============================================
    // SECURITY: Check Rate Limit
    // ============================================
    isRateLimited: function() {
        const now = Date.now();
        
        // Clean old requests
        this.rateLimit.requests = this.rateLimit.requests.filter(time => now - time < this.security.rateLimit.timeWindow);
        
        // Check if blocked
        if (this.rateLimit.blockedUntil && now < this.rateLimit.blockedUntil) {
            const remainingMinutes = Math.ceil((this.rateLimit.blockedUntil - now) / 60000);
            this.showError(document.getElementById('errorMsg'), `Too many attempts. Please try again in ${remainingMinutes} minutes.`);
            return true;
        }
        
        // Check request count
        if (this.rateLimit.requests.length >= this.security.rateLimit.maxRequests) {
            this.rateLimit.blockedUntil = now + (15 * 60 * 1000); // Block for 15 minutes
            this.showError(document.getElementById('errorMsg'), 'Too many login attempts. Please try again in 15 minutes.');
            return true;
        }
        
        return false;
    },
    
    addRateLimitRequest: function() {
        this.rateLimit.requests.push(Date.now());
    },
    
    // ============================================
    // SECURITY: Check Failed Attempts
    // ============================================
    checkFailedAttempts: function(email) {
        const now = Date.now();
        
        if (this.state.failedAttempts >= this.security.maxFailedAttempts) {
            if (this.state.lastFailedTime && (now - this.state.lastFailedTime) < this.security.lockoutDuration) {
                const remainingMinutes = Math.ceil((this.security.lockoutDuration - (now - this.state.lastFailedTime)) / 60000);
                this.showError(document.getElementById('errorMsg'), `Account temporarily locked. Try again in ${remainingMinutes} minutes.`);
                return true;
            } else {
                // Reset failed attempts after lockout period
                this.state.failedAttempts = 0;
                this.state.lastFailedTime = null;
            }
        }
        return false;
    },
    
    recordFailedAttempt: function() {
        this.state.failedAttempts++;
        this.state.lastFailedTime = Date.now();
        
        // Store in session storage to persist across page refreshes
        sessionStorage.setItem('failedAttempts', this.state.failedAttempts);
        sessionStorage.setItem('lastFailedTime', this.state.lastFailedTime);
    },
    
    resetFailedAttempts: function() {
        this.state.failedAttempts = 0;
        this.state.lastFailedTime = null;
        sessionStorage.removeItem('failedAttempts');
        sessionStorage.removeItem('lastFailedTime');
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
                            autoRefreshToken: true,
                            detectSessionInUrl: false
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
        
        // Check for bot/honeypot
        const honeypot = document.getElementById('honeypot');
        if (honeypot) {
            honeypot.addEventListener('change', () => {
                if (honeypot.value) {
                    // Bot detected
                    console.log('Bot detected');
                    loginForm.style.display = 'none';
                }
            });
        }
    },
    
    initModals: function() {
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.addEventListener('keydown', (e) => this.handleModalKeyboard(e));
        });
        
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideAllModals();
                }
            });
        });
    },
    
    initFocusManagement: function() {
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
        
        // Simple hash to avoid exposing raw data
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            hash = ((hash << 5) - hash) + data.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash).toString(16);
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
    // STAFF LOGIN VERIFICATION
    // ============================================
    verifyStaffLogin: async function(identifier, password) {
        // Find staff by email or ID
        const staff = this.staffRecords.find(s => 
            s.email === identifier || s.id === identifier
        );
        
        if (!staff) return null;
        
        // Verify password
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
    },
    
    // ============================================
    // EXECUTE LOGIN - EXTRACTED FOR QUEUE
    // ============================================
    executeLogin: async function(identifier, password) {
        if (!this.supabase) {
            throw new Error('Authentication service not available');
        }
        
        // Random delay to prevent timing attacks
        await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200)); // 0.3-0.5 seconds
        
        let profileData = null;
        let isStaff = false;
        
        // Staff login check
        const isStaffId = !identifier.includes('@');
        if (isStaffId || identifier.includes('@')) {
            const staffProfile = await this.verifyStaffLogin(identifier, password);
            if (staffProfile) {
                profileData = staffProfile;
                isStaff = true;
                return { profileData, isStaff };
            }
        }
        
        // Regular Supabase auth
        const { data: authData, error: authError } = await this.supabase.auth.signInWithPassword({ 
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
    // Allow 'approved', 'active', and 'approved' statuses
const validStatuses = ['approved', 'active', 'approved'];
if (!validStatuses.includes(profile.status?.toLowerCase())) {
    await this.supabase.auth.signOut();
    throw new Error('Account pending approval');
}
        
        return { profileData: profile, isStaff: false };
    },
    
    // ============================================
    // SECURE LOGIN HANDLER - QUEUED VERSION
    // ============================================
    handleLogin: async function(e) {
        e.preventDefault();
        
        // Check rate limiting
        if (this.isRateLimited()) return;
        
        if (this.state.isLoggingIn) return;
        
        const identifier = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const errorMsg = document.getElementById('errorMsg');
        const loginButton = document.getElementById('loginButton');
        const buttonText = document.getElementById('button-text');
        
        // Check honeypot (bot detection)
        const honeypot = document.getElementById('honeypot');
        if (honeypot && honeypot.value) {
            // Bot detected - silently fail
            this.addRateLimitRequest();
            return;
        }
        
        if (!identifier) {
            this.showError(errorMsg, 'Please enter email or staff ID');
            this.recordFailedAttempt();
            this.addRateLimitRequest();
            return;
        }
        
        if (!password || password.length < 4) {
            this.showError(errorMsg, 'Invalid credentials');
            this.recordFailedAttempt();
            this.addRateLimitRequest();
            return;
        }
        
        // Check failed attempts
        if (this.checkFailedAttempts(identifier)) {
            this.addRateLimitRequest();
            return;
        }
        
        this.clearError(errorMsg);
        this.state.isLoggingIn = true;
        loginButton.disabled = true;
        buttonText.innerHTML = '<span class="loading-spinner"></span> ⏳ Logging in...';
        
        this.addRateLimitRequest();
        
        try {
            console.log(`🔐 Logging in: ${identifier}`);
            
            // 🔥 DIRECT LOGIN - NO QUEUE
            const result = await NCHSMLogin.executeLogin(identifier, password);
            
            // Reset failed attempts on successful login
            this.resetFailedAttempts();
            
            // Generate secure session token
            const secureToken = this.generateSecureToken();
            
            // Complete login
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
                this.showError(errorMsg, '⏰ Server is busy with other students. Please wait 10 seconds and try again.');
            } else {
                this.showError(errorMsg, error.message || 'Login failed');
            }
            
        } finally {
            this.state.isLoggingIn = false;
            loginButton.disabled = false;
            buttonText.textContent = 'Sign In';
        }
    },
    
    // ============================================
    // SECURE TOKEN GENERATION
    // ============================================
    generateSecureToken: function() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    },
    
    // ============================================
    // SESSION TRACKING (Secure)
    // ============================================
    trackUserSession: async function(userId, email, sessionToken, userAgent, isStaff = false) {
        try {
            console.log('🔍 Tracking session...');
            
            let ipAddress = 'unknown';
            try {
                const ipResponse = await fetch('https://api.ipify.org?format=json');
                const ipData = await ipResponse.json();
                ipAddress = ipData.ip;
            } catch (ipError) {
                // Silent fail
            }
            
            const deviceInfo = this.parseUserAgent(userAgent);
            
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24);
            
            // Hash the session token before storing
            const hashedToken = await this.hashToken(sessionToken);
            
            const { data, error } = await this.supabase
                .from('user_sessions')
                .insert({
                    user_id: userId,
                    session_token_hash: hashedToken,
                    ip_address: ipAddress,
                    user_agent: userAgent,
                    device_info: deviceInfo,
                    login_time: new Date().toISOString(),
                    last_activity: new Date().toISOString(),
                    expires_at: expiresAt.toISOString(),
                    is_active: true,
                    login_type: isStaff ? 'staff' : 'user'
                })
                .select();
            
            if (error) {
                console.error('❌ Session tracking failed');
                return null;
            }
            
            if (data && data[0]) {
                localStorage.setItem('session_id', data[0].id);
            }
            
            return data?.[0];
            
        } catch (error) {
            console.error('❌ Session tracking error');
            return null;
        }
    },
    
    // Simple hash function for token (client-side)
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
    // LOGIN TRACKING
    // ============================================
    updateLastLogin: async function(userId, email) {
        try {
            const now = new Date().toISOString();
            
            const { data: profile, error: fetchError } = await this.supabase
                .from('consolidated_user_profiles_table')
                .select('login_count')
                .eq('user_id', userId)
                .maybeSingle();
            
            if (fetchError) return false;
            
            const newCount = (profile?.login_count || 0) + 1;
            
            const { error: updateError } = await this.supabase
                .from('consolidated_user_profiles_table')
                .update({
                    last_login: now,
                    login_count: newCount,
                    last_activity: now,
                    updated_at: now
                })
                .eq('user_id', userId);
            
            if (updateError) return false;
            
            return true;
            
        } catch (error) {
            return false;
        }
    },
    
    // ============================================
    // COMPLETE LOGIN - SECURE REDIRECT (UPDATED for STAFF)
    // ============================================
    completeLogin: async function(profileData, sessionToken, isStaff = false) {
        console.log('🎉 Completing login...');
        
        try {
            // Non-blocking updates
            if (!isStaff) {
                this.updateLastLogin(profileData.user_id, profileData.email).catch(() => {});
            }
            this.trackUserSession(profileData.user_id, profileData.email, sessionToken, navigator.userAgent, isStaff).catch(() => {});
            
            // Store minimal profile data (no sensitive info)
            const safeProfile = {
                user_id: profileData.user_id,
                email: profileData.email,
                full_name: profileData.full_name,
                role: profileData.role,
                program: profileData.program || profileData.department,
                is_staff: isStaff || false
            };
            localStorage.setItem('userProfile', JSON.stringify(safeProfile));
            
            // Store session in secure way
            if (!isStaff && this.supabase) {
                const { data: { session } } = await this.supabase.auth.getSession();
                if (session) {
                    localStorage.setItem('session_expires', session.expires_at);
                }
            }
            
            // Redirect to dashboard
            this.redirectToDashboard(profileData);
            
        } catch (error) {
            console.error('❌ Complete login error');
            this.redirectToDashboard(profileData);
        }
    },
    
    // ============================================
    // REDIRECT TO DASHBOARD - SECURE (UPDATED for STAFF)
    // ============================================
    redirectToDashboard: function(profileData) {
        console.log('🚀 Redirecting...');
        
        let role = profileData.role?.toLowerCase() || 'student';
        
        // Handle staff/lecturer role
        if (profileData.is_staff || role === 'staff' || role === 'lecturer') {
            role = 'lecturer';
        }
        
        const roleRedirects = {
            'superadmin': 'superadmin.html',
            'admin': 'admin.html',
            'student': 'student.html',
            'lecturer': 'lecturer.html',
            'staff': 'lecturer.html'
        };
        
        let redirectFile = roleRedirects[role] || 'index.html';
        
        console.log(`🎯 Role: ${role} -> ${redirectFile}`);
        
        // Secure redirect - use replace to prevent back button to login page
        document.body.style.opacity = '0';
        document.body.style.transition = 'opacity 0.3s ease';
        
        setTimeout(() => {
            window.location.replace(redirectFile);
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
            this.showError(document.getElementById('errorMsg'), 'You are offline. Please check your connection.');
        }
    }
};

// ============================================
// GLOBAL FUNCTION EXPORTS (Minimal)
// ============================================
window.hideAllModals = () => window.NCHSMLogin.hideAllModals();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Restore failed attempts from session storage
    const savedAttempts = sessionStorage.getItem('failedAttempts');
    const savedTime = sessionStorage.getItem('lastFailedTime');
    if (savedAttempts) window.NCHSMLogin.state.failedAttempts = parseInt(savedAttempts);
    if (savedTime) window.NCHSMLogin.state.lastFailedTime = parseInt(savedTime);
    
    window.NCHSMLogin.init();
    
    window.addEventListener('online', () => window.NCHSMLogin.updateOnlineStatus());
    window.addEventListener('offline', () => window.NCHSMLogin.updateOnlineStatus());
    
    window.NCHSMLogin.updateOnlineStatus();
    
    console.log('✅ Secure application ready');
});
