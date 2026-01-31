// ============================================
// SINGLE SUPABASE INITIALIZATION - SAFE METHOD
// ============================================

// Create a namespace for our app to avoid conflicts
window.NCHSMLogin = {
    // State Management
    state: {
        currentUser: null,
        selectedMethod: null,
        currentSecret: null,
        backupCodes: [],
        isLoggingIn: false,
        otpAttempts: 0,
        maxOtpAttempts: 3,
        trustedDevices: JSON.parse(localStorage.getItem('trusted_devices') || '{}'),
        verificationCodes: {},
        currentVerificationMethod: null,
        resendTimer: null,
        resendTimeout: null
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
        
        // Initialize method selection
        this.initMethodSelection();
        
        // Initialize OTP input handling
        this.initOTPInputs();
        
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
    
    initMethodSelection: function() {
        // Add click handlers to verification options
        document.querySelectorAll('.verification-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const methodType = option.getAttribute('data-method');
                if (methodType) {
                    this.selectMethod(methodType);
                }
            });
            
            // Add keyboard support
            option.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const methodType = option.getAttribute('data-method');
                    if (methodType) {
                        this.selectMethod(methodType);
                    }
                }
            });
        });
    },
    
    initOTPInputs: function() {
        // Initialize OTP input event listeners
        const otpInput = document.getElementById('otpInput');
        const authOtpInput = document.getElementById('authenticatorOtpInput');
        
        if (otpInput) {
            otpInput.addEventListener('input', (e) => this.validateOTPInput(e.target, 'verify'));
        }
        
        if (authOtpInput) {
            authOtpInput.addEventListener('input', (e) => this.validateOTPInput(e.target, 'authenticator'));
        }
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
                // Keyboard opened
                keyboardVisible = true;
                document.body.style.paddingBottom = `${window.innerHeight - viewport.height}px`;
            } else if (!isKeyboardOpen && keyboardVisible) {
                // Keyboard closed
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
            // Device is trusted, skip to dashboard
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
    
    validateOTPInput: function(input, context) {
        // Only allow numbers
        input.value = input.value.replace(/[^0-9]/g, '');
        
        // Limit to 6 digits
        if (input.value.length > 6) {
            input.value = input.value.substring(0, 6);
        }
        
        // Auto-submit when 6 digits are entered
        if (input.value.length === 6) {
            setTimeout(() => {
                if (context === 'authenticator') {
                    this.completeAuthenticatorSetup();
                } else if (context === 'verify') {
                    this.verify2FACode();
                }
            }, 100);
        }
    },
    
    // ============================================
    // LOGIN HANDLER - FIXED VERSION
    // ============================================
    handleLogin: async function(e) {
        e.preventDefault();
        
        if (this.state.isLoggingIn) return;
        
        const email = document.getElementById('email').value.trim().toLowerCase();
        const password = document.getElementById('password').value;
        const errorMsg = document.getElementById('errorMsg');
        const loginButton = document.getElementById('loginButton');
        const buttonText = document.getElementById('button-text');
        
        // Validation
        if (!this.validateEmail(email)) {
            this.showError(errorMsg, 'Please enter a valid email address');
            return;
        }
        
        if (!password) {
            this.showError(errorMsg, 'Please enter your password');
            return;
        }
        
        // Update UI
        this.clearError(errorMsg);
        this.state.isLoggingIn = true;
        loginButton.disabled = true;
        buttonText.innerHTML = '<span class="loading-spinner"></span> Signing In...';
        
        try {
            console.log('🔐 Attempting login for:', email);
            
            // Check if Supabase is available
            if (!this.supabase) {
                throw new Error('Authentication service not available');
            }
            
            console.log('✅ Supabase client ready');
            
            // 1. Authenticate with Supabase
            const { data: authData, error: authError } = await this.supabase.auth.signInWithPassword({ 
                email, 
                password 
            });
            
            if (authError) {
                console.error('❌ Auth error:', authError);
                if (authError.message.includes('Invalid login credentials')) {
                    throw new Error('Invalid email or password. Please try again.');
                } else if (authError.message.includes('Email not confirmed')) {
                    throw new Error('Please verify your email address before logging in.');
                } else {
                    throw new Error(authError.message);
                }
            }
            
            console.log('✅ Authentication successful:', {
                userId: authData.user.id,
                email: authData.user.email
            });
            
            // 2. Store user session
            this.state.currentUser = {
                email,
                userId: authData.user.id,
                session: authData.session
            };
            
            // 3. Get user profile
            console.log('👤 Fetching user profile...');
            let profileData = null;
            
            // Try by email first
            const { data: profileByEmail, error: emailError } = await this.supabase
                .from('consolidated_user_profiles_table')
                .select('*')
                .eq('email', email)
                .maybeSingle();
            
            if (!emailError && profileByEmail) {
                profileData = profileByEmail;
                console.log('✅ Profile found by email');
            } else {
                // Try by user_id as fallback
                console.log('⚠️ Trying profile by user_id...');
                const { data: profileByUserId } = await this.supabase
                    .from('consolidated_user_profiles_table')
                    .select('*')
                    .eq('user_id', authData.user.id)
                    .maybeSingle();
                
                if (profileByUserId) {
                    profileData = profileByUserId;
                    console.log('✅ Profile found by user_id');
                } else {
                    throw new Error('Account not found. Please register first.');
                }
            }
            
            if (!profileData) {
                throw new Error('Account not found. Please register first.');
            }
            
            if (profileData.status?.toLowerCase() !== 'approved') {
                await this.supabase.auth.signOut();
                throw new Error('Account is pending approval. Please contact administration.');
            }
            
            console.log('✅ Profile loaded:', {
                name: profileData.full_name,
                role: profileData.role,
                status: profileData.status
            });
            
            // 4. Check if 2FA setup is required - FIXED SECTION
            console.log('🔍 Checking 2FA settings for user_id:', authData.user.id);
            
            // FIX: Add a small delay to ensure authentication is complete
            await new Promise(resolve => setTimeout(resolve, 100));
            
            try {
                const { data: totpSettings, error: totpError } = await this.supabase
                    .from('user_2fa_settings')
                    .select('*')
                    .eq('user_id', authData.user.id)
                    .maybeSingle();
                
                console.log('📊 2FA query result:', { 
                    hasData: !!totpSettings,
                    data: totpSettings,
                    error: totpError 
                });
                
                // Handle the response
                if (totpError) {
                    console.error('❌ 2FA query error:', totpError);
                    
                    // If the table exists but is empty, treat as new user
                    if (totpError.code === 'PGRST116' || 
                        totpError.message?.includes('does not exist') ||
                        totpError.message?.includes('No rows found')) {
                        console.log('➡️ No 2FA settings found. Showing method selection.');
                        this.showMethodSelection();
                        return;
                    }
                    
                    // For any other error, still show method selection as fallback
                    console.log('⚠️ 2FA check error, showing method selection as fallback');
                    this.showMethodSelection();
                    return;
                }
                
                // If no settings found OR 2FA not enabled
                if (!totpSettings || !totpSettings.is_2fa_enabled) {
                    console.log('➡️ 2FA not configured. Showing method selection.');
                    this.showMethodSelection();
                    return;
                }
                
                // User has 2FA enabled
                console.log('✅ User has 2FA enabled. Method:', totpSettings.preferred_method);
                
                // Check for trusted device
                const deviceId = this.generateDeviceId();
                if (this.state.trustedDevices[deviceId] && 
                    new Date(this.state.trustedDevices[deviceId].expires) > new Date()) {
                    // Trusted device, skip 2FA
                    console.log('🔒 Trusted device detected. Skipping 2FA.');
                    await this.completeLogin(profileData);
                } else {
                    // Show verification modal
                    console.log('📱 Showing verification for method:', totpSettings.preferred_method);
                    this.showVerificationModal(totpSettings.preferred_method || 'authenticator');
                }
                
            } catch (queryError) {
                console.error('❌ Error in 2FA query:', queryError);
                // If there's any error in the 2FA check, still show method selection
                this.showMethodSelection();
            }
            
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
// EMAIL SENDING FUNCTION - USING NEW URL
// ============================================
sendEmailWithCode: async function(email, otpCode, userName, emailType = 'verification') {
    return new Promise((resolve) => {
        console.log(`📧 Sending ${emailType} email to ${email}...`);
        
        // ✅ USE YOUR NEW ALL-IN-ONE GOOGLE SCRIPT URL
        const scriptUrl = 'https://script.google.com/macros/s/AKfycbwo0Z-oQ_p5-dIe4XYiaRTv6ZdxlmfxP5LIpQT4T1cGihvlimVJg3AvdUNrDeZ0cEkJ3g/exec';
        
        // Determine subject based on email type
        let subject;
        switch(emailType) {
            case 'welcome':
                subject = 'Welcome to NCHSM Digital Portal';
                break;
            case 'login_success':
                subject = 'Login Successful - NCHSM Digital Portal';
                break;
            default:
                subject = 'NCHSM: Your Verification Code';
        }
        
        // Send parameters - NO HTML needed, Google Script creates everything!
        const params = new URLSearchParams({
            to: email,
            otp: otpCode || 'N/A',
            userName: userName || email.split('@')[0],
            emailType: emailType,
            subject: subject
        });
        
        const fullUrl = scriptUrl + '?' + params.toString();
        console.log(`📡 Sending ${emailType} email...`);
        
        // Simple image method
        const img = new Image();
        img.src = fullUrl;
        img.style.display = 'none';
        
        img.onload = function() {
            console.log(`✅ ${emailType} email sent!`);
            resolve(true);
        };
        
        img.onerror = function() {
            console.log(`✅ ${emailType} request completed`);
            resolve(true);
        };
        
        document.body.appendChild(img);
        
        setTimeout(() => resolve(true), 2000);
    });
},
    // ============================================
    // EMAIL VERIFICATION FUNCTION
    // ============================================
    sendEmailVerification: async function() {
        try {
            if (!this.state.currentUser?.email) {
                throw new Error('No email address available');
            }
            
            console.log('📧 Sending email verification to:', this.state.currentUser.email);
            
            // Generate a 6-digit OTP
            const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
            
            // Store the code temporarily for verification
            this.state.verificationCodes.email = {
                code: otpCode,
                expires: Date.now() + (5 * 60 * 1000), // 5 minutes
                attempts: 0
            };
            
            // Send the email
            await this.sendEmailWithCode(
                this.state.currentUser.email,
                otpCode,
                this.state.currentUser.email.split('@')[0]
            );
            
            console.log('✅ Email verification sent successfully');
            return true;
            
        } catch (error) {
            console.error('❌ Email verification error:', error);
            throw new Error('Failed to send email verification');
        }
    },
    
    // ============================================
    // SMS VERIFICATION FUNCTION
    // ============================================
    sendSMSWithCode: async function(phoneNumber, otpCode) {
        return new Promise((resolve) => {
            console.log(`📱 [SIMULATION] Sending SMS OTP ${otpCode} to ${phoneNumber}`);
            
            // This is a simulation - in production, integrate with Twilio, AWS SNS, etc.
            // Example with Twilio:
            /*
            fetch('/api/send-sms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: phoneNumber,
                    body: `Your NCHSM verification code is: ${otpCode}. Valid for 5 minutes.`
                })
            })
            */
            
            // Simulate successful SMS send
            setTimeout(() => {
                console.log('✅ SMS simulation complete');
                resolve(true);
            }, 1000);
        });
    },
    
    sendSMSVerification: async function() {
        try {
            // Get user's phone number from profile
            const phoneNumber = await this.getUserPhone();
            if (!phoneNumber) {
                throw new Error('No phone number found in profile');
            }
            
            console.log('📱 Sending SMS verification to:', phoneNumber);
            
            // Generate a 6-digit OTP
            const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
            
            // Store the code temporarily for verification
            this.state.verificationCodes.sms = {
                code: otpCode,
                expires: Date.now() + (5 * 60 * 1000), // 5 minutes
                attempts: 0
            };
            
            // Send SMS
            await this.sendSMSWithCode(phoneNumber, otpCode);
            
            console.log('✅ SMS verification sent successfully');
            return true;
            
        } catch (error) {
            console.error('❌ SMS verification error:', error);
            throw new Error('Failed to send SMS verification');
        }
    },
    
    // ============================================
    // PROCESS LOGIN HELPER
    // ============================================
    processLogin: async function(profileData) {
        // Store profile
        localStorage.setItem('currentUserProfile', JSON.stringify(profileData));
        
        // Store session
        const { data: { session } } = await this.supabase.auth.getSession();
        if (session) {
            localStorage.setItem('supabase_session', JSON.stringify(session));
        }
        
        // Redirect based on role
        const role = profileData.role?.toLowerCase() || 'student';
        
        if (role === 'superadmin') {
            window.location.href = 'superadmin.html';
        } else if (role === 'admin') {
            window.location.href = 'admin.html';
        } else if (role === 'lecturer') {
            window.location.href = 'lecturer.html';
        } else if (role === 'hod') {
            window.location.href = 'hod-tracker.html';
        } else {
            window.location.href = 'index.html';
        }
    },
    
    // ============================================
    // MODAL MANAGEMENT
    // ============================================
    showMethodSelection: function() {
        console.log('🎯 Showing method selection');
        this.hideAllModals();
        const modal = document.getElementById('methodSelectionModal');
        modal.classList.add('active');
        modal.removeAttribute('hidden');
        
        // Reset selection
        this.state.selectedMethod = null;
        document.querySelectorAll('.verification-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        // Update user information display
        this.updateUserInfoDisplay();
        
        // Focus first option
        setTimeout(() => {
            const firstOption = document.querySelector('.verification-option');
            if (firstOption) {
                firstOption.focus();
            }
        }, 100);
    },
    
    showVerificationModal: function(method = 'authenticator') {
        console.log('🔐 Showing verification modal for method:', method);
        this.hideAllModals();
        const modal = document.getElementById('twoFactorModal');
        const methodText = document.getElementById('verificationMethodText');
        const emailText = document.getElementById('2faEmail');
        const otpHint = document.getElementById('otpHint');
        
        const methods = {
            authenticator: 'Enter the 6-digit code from your authenticator app',
            sms: 'Enter the 6-digit code sent to your phone',
            email: 'Enter the 6-digit code sent to your email'
        };
        
        methodText.textContent = methods[method] || methods.authenticator;
        
        // Show appropriate contact info
        if (method === 'email') {
            emailText.textContent = this.maskEmail(this.state.currentUser.email);
        } else if (method === 'sms') {
            this.getUserPhone().then(phone => {
                emailText.textContent = this.maskPhone(phone || 'No phone number');
            });
        } else {
            emailText.textContent = this.maskEmail(this.state.currentUser.email);
        }
        
        // Update OTP hint based on method
        if (method === 'sms') {
            otpHint.textContent = 'Enter the 6-digit code sent to your phone';
        } else if (method === 'email') {
            otpHint.textContent = 'Enter the 6-digit code sent to your email';
        } else {
            otpHint.textContent = 'Enter the 6-digit code from your authenticator app';
        }
        
        this.clearOTPInputs('verify');
        this.clearError(document.getElementById('2faError'));
        
        // Set current verification method
        this.state.currentVerificationMethod = method;
        
        // Show resend button and set countdown (only for SMS/Email)
        if (method === 'sms' || method === 'email') {
            this.updateResendButton(method);
        }
        
        modal.classList.add('active');
        modal.removeAttribute('hidden');
        setTimeout(() => document.getElementById('otpInput').focus(), 100);
    },
    
    showAuthenticatorSetup: function() {
        console.log('🔑 Showing authenticator setup');
        this.hideAllModals();
        
        // Check if otplib is available
        if (typeof otplib === 'undefined') {
            this.showError(document.getElementById('setupError'), 'Authentication library not loaded. Please refresh the page.');
            return;
        }
        
        // Check if QRCode library is available
        if (typeof QRCode === 'undefined') {
            this.showError(document.getElementById('setupError'), 'QR Code generator not loaded. Please refresh the page.');
            return;
        }
        
        // Generate TOTP secret
        this.state.currentSecret = otplib.authenticator.generateSecret();
        console.log('🔐 Generated TOTP secret');
        
        // Create URI for QR code
        const uri = otplib.authenticator.keyuri(
            encodeURIComponent(this.state.currentUser.email),
            'NCHSM Portal',
            this.state.currentSecret
        );
        
        // Generate QR code
        const qrCodeDiv = document.getElementById('qrCode');
        qrCodeDiv.innerHTML = '';
        
        try {
            QRCode.toCanvas(qrCodeDiv, uri, {
                width: 200,
                height: 200,
                margin: 1,
                color: { 
                    dark: '#0c4a6e', 
                    light: '#ffffff'
                },
                errorCorrectionLevel: 'H'
            }, (error) => {
                if (error) {
                    console.error('❌ QR Code generation failed:', error);
                    // Still show manual entry
                    this.showManualEntryOption();
                } else {
                    console.log('✅ QR Code generated successfully');
                }
            });
        } catch (error) {
            console.error('❌ QR Code error:', error);
            // Show manual entry as fallback
            this.showManualEntryOption();
        }
        
        // Always show manual entry option
        this.showManualEntryOption();
        
        this.clearOTPInputs('authenticator');
        this.clearError(document.getElementById('setupError'));
        
        const modal = document.getElementById('authenticatorSetupModal');
        modal.classList.add('active');
        modal.removeAttribute('hidden');
        
        // Focus OTP input
        setTimeout(() => {
            const otpInput = document.getElementById('authenticatorOtpInput');
            if (otpInput) {
                otpInput.focus();
            }
        }, 300);
    },
    
    // Show manual entry option for authenticator
    showManualEntryOption: function() {
        if (!this.state.currentSecret) return;
        
        const manualEntryDiv = document.createElement('div');
        manualEntryDiv.className = 'manual-entry';
        manualEntryDiv.innerHTML = `
            <p style="font-weight: 600; margin: 1rem 0 0.5rem 0; color: var(--gray-800);">
                Can't scan QR code?
            </p>
            <div class="manual-entry-code">
                <p style="font-size: 0.875rem; color: var(--gray-600); margin-bottom: 0.5rem;">
                    Enter this secret key manually:
                </p>
                <code style="font-family: monospace; background: #f8fafc; padding: 0.75rem; 
                        border-radius: 6px; word-break: break-all; display: block; border: 1px solid #e5e7eb;">
                    ${this.state.currentSecret}
                </code>
                <button onclick="window.NCHSMLogin.copySecretToClipboard()" 
                        class="copy-secret-btn"
                        style="margin-top: 0.75rem; padding: 0.5rem 1rem; font-size: 0.875rem;
                               background: #0c4a6e; color: white; border: none; border-radius: 4px;
                               cursor: pointer; display: flex; align-items: center; gap: 0.5rem;">
                    <i data-feather="copy" width="14" height="14"></i> Copy Secret Key
                </button>
            </div>
            <p style="font-size: 0.875rem; color: var(--gray-600); margin-top: 0.75rem;">
                <strong>Instructions:</strong><br>
                1. Open Google Authenticator/Authy/Microsoft Authenticator<br>
                2. Tap "+" to add new account<br>
                3. Choose "Enter a setup key"<br>
                4. Enter the secret key above<br>
                5. Save and get your 6-digit code
            </p>
        `;
        
        const qrContainer = document.querySelector('.qr-container');
        if (qrContainer) {
            // Remove existing manual entry if any
            const existing = qrContainer.querySelector('.manual-entry');
            if (existing) existing.remove();
            
            qrContainer.appendChild(manualEntryDiv);
            feather.replace();
        }
    },
    
    // Copy secret to clipboard
    copySecretToClipboard: function() {
        if (!this.state.currentSecret) return;
        
        navigator.clipboard.writeText(this.state.currentSecret).then(() => {
            // Show success message
            const setupError = document.getElementById('setupError');
            this.showError(setupError, 'Secret key copied to clipboard!', 'success');
            
            // Update button text temporarily
            const copyBtn = document.querySelector('.copy-secret-btn');
            if (copyBtn) {
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i data-feather="check" width="14" height="14"></i> Copied!';
                copyBtn.style.background = '#10b981';
                feather.replace();
                
                setTimeout(() => {
                    copyBtn.innerHTML = originalText;
                    copyBtn.style.background = '#0c4a6e';
                    feather.replace();
                }, 2000);
            }
        }).catch(err => {
            console.error('Copy failed:', err);
            this.showError(document.getElementById('setupError'), 
                'Failed to copy. Please select and copy manually.');
        });
    },
    
    showBackupCodesModal: function(codes) {
        console.log('📋 Showing backup codes modal');
        this.hideAllModals();
        this.state.backupCodes = codes;
        
        const codesList = document.getElementById('backupCodesList');
        codesList.innerHTML = codes.map(code => `
            <div class="backup-code" role="text" aria-label="Backup code">
                ${code}
                <button class="copy-button" 
                        onclick="window.NCHSMLogin.copyToClipboard('${code}', this)"
                        aria-label="Copy code ${code}">
                    <i data-feather="copy" width="12" height="12"></i>
                </button>
            </div>
        `).join('');
        
        feather.replace();
        
        const modal = document.getElementById('backupCodesModal');
        modal.classList.add('active');
        modal.removeAttribute('hidden');
    },
    
    hideAllModals: function() {
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.classList.remove('active');
            modal.setAttribute('hidden', 'true');
        });
        document.body.style.overflow = '';
    },
    
    // ============================================
    // METHOD SELECTION - eCitizen Style
    // ============================================
    selectMethod: function(method) {
        console.log('✅ Selected method:', method);
        this.state.selectedMethod = method;
        
        // Update UI
        document.querySelectorAll('.verification-option').forEach(element => {
            element.classList.remove('selected');
            element.setAttribute('aria-checked', 'false');
        });
        
        const selectedElement = document.querySelector(`.verification-option[data-method="${method}"]`);
        if (selectedElement) {
            selectedElement.classList.add('selected');
            selectedElement.setAttribute('aria-checked', 'true');
            selectedElement.focus();
        }
        
        // Clear any previous errors
        this.clearError(document.getElementById('methodError'));
    },
    
    proceedWithSelectedMethod: async function() {
        if (!this.state.selectedMethod) {
            this.showError(document.getElementById('methodError'), 'Please select a security method');
            return;
        }
        
        console.log('🚀 Proceeding with method:', this.state.selectedMethod);
        
        const methodBtn = document.getElementById('proceedMethodBtn');
        const originalText = methodBtn ? methodBtn.innerHTML : 'Continue';
        
        // Update UI
        if (methodBtn) {
            methodBtn.disabled = true;
            methodBtn.innerHTML = '<span class="loading-spinner"></span> Processing...';
        }
        
        try {
            if (this.state.selectedMethod === 'authenticator') {
                // For authenticator, show setup immediately
                this.showAuthenticatorSetup();
            } else if (this.state.selectedMethod === 'sms') {
                // Send SMS verification
                await this.sendSMSVerification();
                this.showVerificationModal('sms');
            } else if (this.state.selectedMethod === 'email') {
                // Send email verification
                await this.sendEmailVerification();
                this.showVerificationModal('email');
            }
        } catch (error) {
            console.error('❌ Method selection error:', error);
            this.showError(document.getElementById('methodError'), 
                `Failed: ${error.message}`);
        } finally {
            // Reset button
            if (methodBtn) {
                methodBtn.disabled = false;
                methodBtn.innerHTML = originalText;
            }
        }
    },
    
    // ============================================
    // USER INFO DISPLAY
    // ============================================
    updateUserInfoDisplay: function() {
        // Get email display element
        const emailDisplay = document.getElementById('userEmailDisplay');
        if (emailDisplay) {
            emailDisplay.textContent = this.maskEmail(this.state.currentUser?.email || '');
        }
        
        // Get phone display element
        const phoneDisplay = document.getElementById('userPhoneDisplay');
        if (phoneDisplay) {
            // Get phone from profile
            this.getUserPhone().then(phone => {
                phoneDisplay.textContent = this.maskPhone(phone || '');
            });
        }
    },
    
    maskEmail: function(email) {
        if (!email) return 'No email on file';
        
        const [localPart, domain] = email.split('@');
        if (!localPart || !domain) return email;
        
        // eCitizen style: Show first character and last character before @
        if (localPart.length <= 2) {
            return `${localPart}@${domain}`;
        }
        
        const firstChar = localPart[0];
        const lastChar = localPart[localPart.length - 1];
        const middleChars = localPart.length - 2;
        const maskedLocal = firstChar + '*'.repeat(middleChars) + lastChar;
        
        return `${maskedLocal}@${domain}`;
    },
    
    maskPhone: function(phone) {
        if (!phone || phone === 'No phone on file') return 'No phone on file';
        
        // Remove any non-digit characters
        const digits = phone.replace(/\D/g, '');
        
        if (digits.length < 4) return phone;
        
        // eCitizen style: Show country code and last 4 digits, mask the rest
        const countryCode = digits.length > 9 ? digits.slice(0, digits.length - 9) : '';
        const lastFour = digits.slice(-4);
        const middleDigits = digits.length - countryCode.length - 4;
        
        const maskedPart = '*'.repeat(middleDigits);
        
        return `+${countryCode}${maskedPart}${lastFour}`;
    },
    
    getUserPhone: async function() {
        try {
            if (!this.supabase || !this.state.currentUser?.email) return null;
            
            // Get phone from profile
            const { data: profile } = await this.supabase
                .from('consolidated_user_profiles_table')
                .select('phone')
                .eq('email', this.state.currentUser.email)
                .maybeSingle();
            
            return profile?.phone || null;
        } catch (error) {
            console.error('Error fetching phone:', error);
            return null;
        }
    },
    
    // ============================================
    // OTP HANDLING - SINGLE INPUT VERSION
    // ============================================
    clearOTPInputs: function(context) {
        if (context === 'authenticator') {
            const input = document.getElementById('authenticatorOtpInput');
            if (input) input.value = '';
        } else if (context === 'verify') {
            const input = document.getElementById('otpInput');
            if (input) input.value = '';
        }
    },
    
    getOTPCode: function(context) {
        if (context === 'authenticator') {
            const input = document.getElementById('authenticatorOtpInput');
            return input ? input.value : '';
        } else if (context === 'verify') {
            const input = document.getElementById('otpInput');
            return input ? input.value : '';
        }
        return '';
    },
    
    // ============================================
    // VERIFICATION CODE VALIDATION
    // ============================================
    verifyEmailCode: async function(code) {
        const stored = this.state.verificationCodes.email;
        
        if (!stored) {
            throw new Error('No verification code found. Please request a new one.');
        }
        
        if (Date.now() > stored.expires) {
            delete this.state.verificationCodes.email;
            throw new Error('Verification code has expired. Please request a new one.');
        }
        
        if (stored.attempts >= 3) {
            throw new Error('Too many failed attempts. Please request a new code.');
        }
        
        if (code !== stored.code) {
            stored.attempts++;
            throw new Error('Invalid verification code');
        }
        
        // Code is valid - clear it
        delete this.state.verificationCodes.email;
        return true;
    },
    
    verifySMSCode: async function(code) {
        const stored = this.state.verificationCodes.sms;
        
        if (!stored) {
            throw new Error('No verification code found. Please request a new one.');
        }
        
        if (Date.now() > stored.expires) {
            delete this.state.verificationCodes.sms;
            throw new Error('Verification code has expired. Please request a new one.');
        }
        
        if (stored.attempts >= 3) {
            throw new Error('Too many failed attempts. Please request a new code.');
        }
        
        if (code !== stored.code) {
            stored.attempts++;
            throw new Error('Invalid verification code');
        }
        
        // Code is valid - clear it
        delete this.state.verificationCodes.sms;
        return true;
    },
    
    // ============================================
    // AUTHENTICATOR SETUP
    // ============================================
    completeAuthenticatorSetup: async function() {
        const code = this.getOTPCode('authenticator');
        console.log('🔐 Verifying authenticator code:', code);
        
        if (code.length !== 6 || !/^\d{6}$/.test(code)) {
            this.showError(document.getElementById('setupError'), 'Please enter a valid 6-digit code');
            return;
        }
        
        const setupBtn = document.getElementById('setup2FABtn');
        const spinner = document.getElementById('setupVerifyingSpinner');
        
        if (setupBtn) setupBtn.disabled = true;
        if (spinner) spinner.style.display = 'inline-block';
        
        try {
            // Check if otplib is available
            if (typeof otplib === 'undefined') {
                throw new Error('Authentication library not available');
            }
            
            if (!this.state.currentSecret) {
                throw new Error('No secret key generated. Please refresh and try again.');
            }
            
            console.log('🔍 Verifying TOTP code with secret...');
            
            // Verify TOTP code with tolerance for clock skew
            const isValid = otplib.authenticator.check(code, this.state.currentSecret, {
                window: 1 // Allow 30 seconds clock skew
            });
            
            if (!isValid) {
                throw new Error('Invalid code. Please check your authenticator app and try again.');
            }
            
            console.log('✅ TOTP code verified successfully');
            
            // Generate backup codes
            const backupCodes = this.generateSecureBackupCodes(10);
            console.log('📋 Generated backup codes');
            
            // Save to database
            console.log('💾 Saving 2FA settings to database...');
            const { error } = await this.supabase
                .from('user_2fa_settings')
                .upsert({
                    user_id: this.state.currentUser.userId,
                    totp_secret: this.state.currentSecret,
                    backup_codes: backupCodes,
                    preferred_method: 'authenticator',
                    is_2fa_enabled: true,
                    setup_completed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id'
                });
            
            if (error) {
                console.error('❌ Database upsert error:', error);
                
                // Try alternative approach - insert instead of upsert
                const { error: insertError } = await this.supabase
                    .from('user_2fa_settings')
                    .insert({
                        user_id: this.state.currentUser.userId,
                        totp_secret: this.state.currentSecret,
                        backup_codes: backupCodes,
                        preferred_method: 'authenticator',
                        is_2fa_enabled: true,
                        setup_completed_at: new Date().toISOString()
                    });
                
                if (insertError) {
                    console.error('❌ Insert error:', insertError);
                    throw new Error('Failed to save 2FA settings. Please try again.');
                }
            }
            
            console.log('✅ 2FA settings saved successfully');
            
            // Store backup locally
            localStorage.setItem(`2fa_backup_${this.state.currentUser.userId}`, 
                JSON.stringify({
                    secret: this.state.currentSecret,
                    backupCodes: backupCodes,
                    setupDate: new Date().toISOString()
                }));
            
            // Show success modal with backup codes
            this.showBackupCodesModal(backupCodes);
            
        } catch (error) {
            console.error('❌ Setup error:', error);
            
            let errorMessage = error.message;
            if (error.message.includes('Invalid code')) {
                errorMessage = 'The code you entered is incorrect. Please check your authenticator app and try again.';
            }
            
            this.showError(document.getElementById('setupError'), errorMessage);
            
            // Clear OTP input and refocus
            this.clearOTPInputs('authenticator');
            const otpInput = document.getElementById('authenticatorOtpInput');
            if (otpInput) otpInput.focus();
            
        } finally {
            if (setupBtn) setupBtn.disabled = false;
            if (spinner) spinner.style.display = 'none';
        }
    },
    
    // Generate secure backup codes
    generateSecureBackupCodes: function(count) {
        const codes = [];
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing characters
        
        for (let i = 0; i < count; i++) {
            let code = '';
            for (let j = 0; j < 8; j++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            
            // Add hyphen for readability: XXXX-XXXX format
            code = code.substring(0, 4) + '-' + code.substring(4);
            codes.push(code);
        }
        
        return codes;
    },
    
    // ============================================
    // 2FA VERIFICATION
    // ============================================
    verify2FACode: async function() {
        const code = this.getOTPCode('verify');
        console.log('🔐 Verifying 2FA code:', code);
        
        if (code.length !== 6 || !/^\d{6}$/.test(code)) {
            this.showError(document.getElementById('2faError'), 'Please enter a valid 6-digit code');
            return;
        }
        
        const verifyBtn = document.getElementById('verify2FABtn');
        const spinner = document.getElementById('verifyingSpinner');
        
        if (verifyBtn) verifyBtn.disabled = true;
        if (spinner) spinner.style.display = 'inline-block';
        
        try {
            // Determine verification method
            const method = this.getCurrentVerificationMethod();
            console.log('🔍 Verifying with method:', method);
            
            if (method === 'authenticator') {
                await this.verifyAuthenticatorCode(code);
            } else if (method === 'email') {
                await this.verifyEmailCode(code);
            } else if (method === 'sms') {
                await this.verifySMSCode(code);
            }
            
            console.log('✅ 2FA verification successful');
            
            // Trust device if selected
            if (document.getElementById('trustDevice')?.checked) {
                console.log('🔒 Adding device to trusted devices');
                await this.trustDevice(this.state.currentUser.userId);
            }
            
            // Get profile and complete login
            const { data: profileData } = await this.supabase
                .from('consolidated_user_profiles_table')
                .select('*')
                .eq('email', this.state.currentUser.email)
                .single();
            
            if (!profileData) throw new Error('Profile not found');
            
            await this.completeLogin(profileData);
            
        } catch (error) {
            console.error('❌ Verification error:', error);
            this.showError(document.getElementById('2faError'), error.message);
            this.clearOTPInputs('verify');
            const otpInput = document.getElementById('otpInput');
            if (otpInput) otpInput.focus();
        } finally {
            if (verifyBtn) verifyBtn.disabled = false;
            if (spinner) spinner.style.display = 'none';
        }
    },
    
    // Verify authenticator code
    verifyAuthenticatorCode: async function(code) {
        try {
            console.log('🔍 Getting TOTP secret from database...');
            
            // Get TOTP secret from database
            const { data: totpData, error: totpQueryError } = await this.supabase
                .from('user_2fa_settings')
                .select('totp_secret')
                .eq('user_id', this.state.currentUser.userId)
                .maybeSingle();
            
            console.log('📊 TOTP data:', totpData);
            if (totpQueryError) console.error('TOTP query error:', totpQueryError);
            
            if (!totpData?.totp_secret) {
                // Try local storage as fallback
                console.log('⚠️ No TOTP secret in DB, checking local storage...');
                const localBackup = localStorage.getItem(`2fa_backup_${this.state.currentUser.userId}`);
                if (localBackup) {
                    const backupData = JSON.parse(localBackup);
                    if (backupData.secret) {
                        console.log('✅ Found secret in local storage');
                        const isValid = otplib.authenticator.check(code, backupData.secret, { window: 1 });
                        if (isValid) return true;
                    }
                }
                throw new Error('2FA not configured. Please set up authenticator first.');
            }
            
            console.log('🔐 Verifying TOTP code...');
            
            // Verify with tolerance for clock skew
            const isValid = otplib.authenticator.check(code, totpData.totp_secret, {
                window: 1
            });
            
            if (!isValid) {
                this.state.otpAttempts++;
                console.log(`❌ Invalid code. Attempt ${this.state.otpAttempts} of ${this.state.maxOtpAttempts}`);
                
                if (this.state.otpAttempts >= this.state.maxOtpAttempts) {
                    await this.supabase.auth.signOut();
                    
                    // Store lockout timestamp
                    localStorage.setItem(`2fa_lockout_${this.state.currentUser.userId}`, 
                        Date.now().toString());
                    
                    throw new Error('Too many failed attempts. Please try again in 15 minutes.');
                }
                
                const remaining = this.state.maxOtpAttempts - this.state.otpAttempts;
                throw new Error(`Invalid code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`);
            }
            
            // Reset attempts on success
            this.state.otpAttempts = 0;
            console.log('✅ TOTP code verified successfully');
            return true;
            
        } catch (error) {
            console.error('❌ TOTP verification error:', error);
            throw error;
        }
    },
    
    getCurrentVerificationMethod: function() {
        return this.state.currentVerificationMethod || 'authenticator';
    },
    
    // ============================================
    // RESEND FUNCTIONALITY
    // ============================================
    updateResendButton: function(method) {
        const resendBtn = document.getElementById('resendCodeBtn');
        if (!resendBtn) return;
        
        // Reset button
        resendBtn.disabled = false;
        resendBtn.innerHTML = 'Resend Code';
        resendBtn.onclick = () => this.resendVerificationCode(method);
        
        // Clear any existing timer
        if (this.state.resendTimer) clearInterval(this.state.resendTimer);
        if (this.state.resendTimeout) clearTimeout(this.state.resendTimeout);
        
        // Set countdown
        let timeLeft = 60;
        resendBtn.disabled = true;
        
        this.state.resendTimer = setInterval(() => {
            timeLeft--;
            resendBtn.innerHTML = `Resend in ${timeLeft}s`;
            
            if (timeLeft <= 0) {
                clearInterval(this.state.resendTimer);
                resendBtn.disabled = false;
                resendBtn.innerHTML = 'Resend Code';
                resendBtn.onclick = () => this.resendVerificationCode(method);
            }
        }, 1000);
    },
    
    resendVerificationCode: async function(method) {
        console.log('🔄 Resending verification code for method:', method);
        
        try {
            if (method === 'email') {
                await this.sendEmailVerification();
            } else if (method === 'sms') {
                await this.sendSMSVerification();
            }
            
            // Update resend button with new countdown
            this.updateResendButton(method);
            
            // Show success message
            this.showError(document.getElementById('2faError'), 
                `New code sent to your ${method}`, 'success');
            
        } catch (error) {
            console.error('❌ Resend error:', error);
            this.showError(document.getElementById('2faError'), 
                `Failed to resend: ${error.message}`);
        }
    },
    
    // ============================================
    // COMPLETE LOGIN
    // ============================================
    completeLogin: async function(profileData) {
        console.log('🎉 Completing login for:', profileData.email);
        
        try {
            // Store profile
            localStorage.setItem('currentUserProfile', JSON.stringify(profileData));
            
            // Store session
            const { data: { session } } = await this.supabase.auth.getSession();
            if (session) {
                localStorage.setItem('supabase_session', JSON.stringify(session));
            }
            
            // Redirect to dashboard
            this.redirectToDashboard(profileData);
            
        } catch (error) {
            console.error('❌ Complete login error:', error);
            if (this.supabase) {
                await this.supabase.auth.signOut();
            }
            localStorage.removeItem('currentUserProfile');
            localStorage.removeItem('supabase_session');
            this.showError(document.getElementById('errorMsg'), 'Login failed. Please try again.');
        }
    },
    
    trustDevice: async function(userId) {
        const deviceId = this.generateDeviceId();
        const expires = new Date();
        expires.setDate(expires.getDate() + 30);
        
        this.state.trustedDevices[deviceId] = {
            userId,
            expires: expires.toISOString()
        };
        
        localStorage.setItem('trusted_devices', JSON.stringify(this.state.trustedDevices));
        console.log('✅ Device trusted until:', expires.toISOString());
    },
    
    redirectToDashboard: function(profileData) {
        console.log('🚀 Redirecting to dashboard...');
        
        const redirects = {
            'student': 'index.html',
            'lecturer': 'lecturer.html',
            'admin': 'admin.html',
            'superadmin': 'superadmin.html',
            'hod': 'hod-tracker.html',
            'staff': 'staff.html'
        };
        
        const role = profileData.role?.toLowerCase() || 'student';
        const redirectUrl = redirects[role] || 'index.html';
        
        console.log(`🎯 Role: ${role}, Redirecting to: ${redirectUrl}`);
        
        // Add fade-out animation
        document.body.style.opacity = '0';
        document.body.style.transition = 'opacity 0.3s ease';
        
        setTimeout(() => {
            window.location.href = redirectUrl;
        }, 300);
    },
    
    proceedToDashboard: function() {
        console.log('🏠 Proceeding to dashboard...');
        this.hideAllModals();
        
        const storedProfile = localStorage.getItem('currentUserProfile');
        if (storedProfile) {
            const profile = JSON.parse(storedProfile);
            this.redirectToDashboard(profile);
        }
    },
    
    // ============================================
    // EMAIL TEMPLATE
    // ============================================
    generateEmailTemplate: function(otpCode) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NCHSM Verification Code</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #0c4a6e; color: white; padding: 20px; text-align: center; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 5px; }
        .otp-box { 
            background: white; 
            border: 2px dashed #0c4a6e; 
            padding: 20px; 
            text-align: center; 
            font-size: 32px; 
            font-weight: bold; 
            letter-spacing: 5px; 
            margin: 20px 0; 
        }
        .footer { 
            margin-top: 30px; 
            padding-top: 20px; 
            border-top: 1px solid #ddd; 
            font-size: 12px; 
            color: #666; 
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>NCHSM Digital Portal</h1>
        </div>
        <div class="content">
            <h2>Two-Factor Authentication</h2>
            <p>Hello,</p>
            <p>Your verification code for the NCHSM Digital Portal is:</p>
            
            <div class="otp-box">${otpCode}</div>
            
            <p>This code will expire in <strong>5 minutes</strong>.</p>
            <p>If you did not request this code, please ignore this email or contact support immediately.</p>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} NCHSM Digital Portal. All rights reserved.</p>
            <p>This is an automated message, please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>`;
    },
    
    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    useBackupCode: function() {
        const backupCode = prompt('Enter your backup code:');
        if (backupCode) {
            // Verify backup code
            alert('Backup code verification would be implemented here');
        }
    },
    
    copyToClipboard: function(text, button) {
        navigator.clipboard.writeText(text).then(() => {
            const icon = button.querySelector('i');
            icon.setAttribute('data-feather', 'check');
            feather.replace();
            button.setAttribute('aria-label', 'Copied!');
            
            setTimeout(() => {
                icon.setAttribute('data-feather', 'copy');
                feather.replace();
                button.setAttribute('aria-label', `Copy code ${text}`);
            }, 2000);
        }).catch(err => {
            console.error('Copy failed:', err);
        });
    },
    
    downloadBackupCodes: function() {
        if (!this.state.backupCodes.length) return;
        
        const content = `NCHSM Digital Portal - Backup Codes\n\n` +
                       `Generated: ${new Date().toLocaleDateString()}\n` +
                       `Email: ${this.state.currentUser?.email || 'Unknown'}\n\n` +
                       `IMPORTANT: Keep these codes in a secure place. Each code can be used once.\n\n` +
                       this.state.backupCodes.join('\n');
        
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nchsm-backup-codes-${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('✅ Backup codes downloaded');
    },
    
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
            
            // Auto-hide success messages after 5 seconds
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
    
    goBackToLogin: function() {
        console.log('🔙 Going back to login');
        this.hideAllModals();
        if (this.supabase) {
            this.supabase.auth.signOut();
        }
        // Clear any login state
        this.state.currentUser = null;
        this.state.isLoggingIn = false;
        this.state.verificationCodes = {};
        this.state.selectedMethod = null;
        this.state.currentVerificationMethod = null;
        
        // Reset form
        const loginButton = document.getElementById('loginButton');
        const buttonText = document.getElementById('button-text');
        if (loginButton) loginButton.disabled = false;
        if (buttonText) buttonText.textContent = 'Sign In';
        
        // Clear form
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        if (emailInput) emailInput.value = '';
        if (passwordInput) passwordInput.value = '';
        
        // Focus email field
        if (emailInput) emailInput.focus();
    },
    
    // ============================================
    // ACCESSIBILITY FUNCTIONS
    // ============================================
    handleModalKeyboard: function(e) {
        if (e.key === 'Escape') {
            this.hideAllModals();
        }
        
        if (e.key === 'Enter' && e.target.classList.contains('verification-option')) {
            e.preventDefault();
            const method = e.target.getAttribute('data-method');
            if (method) {
                this.selectMethod(method);
            }
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

// Make functions available globally for onclick handlers
window.hideAllModals = () => window.NCHSMLogin.hideAllModals();
window.validateOTPInput = (input, context) => window.NCHSMLogin.validateOTPInput(input, context);
window.verify2FACode = () => window.NCHSMLogin.verify2FACode();
window.useBackupCode = () => window.NCHSMLogin.useBackupCode();
window.selectMethod = (method) => window.NCHSMLogin.selectMethod(method);
window.proceedWithSelectedMethod = () => window.NCHSMLogin.proceedWithSelectedMethod();
window.completeAuthenticatorSetup = () => window.NCHSMLogin.completeAuthenticatorSetup();
window.downloadBackupCodes = () => window.NCHSMLogin.downloadBackupCodes();
window.proceedToDashboard = () => window.NCHSMLogin.proceedToDashboard();
window.copyToClipboard = (text, button) => window.NCHSMLogin.copyToClipboard(text, button);
window.copySecretToClipboard = () => window.NCHSMLogin.copySecretToClipboard();
window.goBackToLogin = () => window.NCHSMLogin.goBackToLogin();
window.resendVerificationCode = (method) => window.NCHSMLogin.resendVerificationCode(method);

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM loaded, initializing...');
    window.NCHSMLogin.init();
    
    // Offline detection
    window.addEventListener('online', () => {
        console.log('🌐 Online');
        window.NCHSMLogin.updateOnlineStatus();
    });
    window.addEventListener('offline', () => {
        console.log('📴 Offline');
        window.NCHSMLogin.updateOnlineStatus();
    });
    
    // Initialize online status
    window.NCHSMLogin.updateOnlineStatus();
    
    console.log('✅ Application ready');
});
