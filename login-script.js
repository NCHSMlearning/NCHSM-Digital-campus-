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
        verificationCodes: {}
    },
    
    // Supabase client (will be initialized later)
    supabase: null,
    
    // ============================================
    // INITIALIZATION
    // ============================================
    init: function() {
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
    },
    
    // ============================================
    // SUPABASE INITIALIZATION
    // ============================================
    initSupabase: function() {
        try {
            if (window.supabase) {
                this.supabase = window.supabase.createClient(
                    'https://lwhtjozfsmbyihenfunw.supabase.co',
                    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk'
                );
                console.log('Supabase initialized successfully');
            } else {
                console.error('Supabase library not loaded');
                this.showError(document.getElementById('errorMsg'), 'Authentication service not available. Please refresh the page.');
            }
        } catch (error) {
            console.error('Error initializing Supabase:', error);
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
            // Check if Supabase is available
            if (!this.supabase) {
                throw new Error('Authentication service not available');
            }
            
            // 1. Authenticate with Supabase
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
            
            // 2. Store user session
            this.state.currentUser = {
                email,
                userId: authData.user.id,
                session: authData.session
            };
            
            // 3. TRY EMAIL SEARCH FIRST (LIKE OLD SCRIPT)
            const { data: profileData, error: profileError } = await this.supabase
                .from('consolidated_user_profiles_table')
                .select('*')
                .eq('email', email)  // ← SEARCH BY EMAIL, NOT USER_ID
                .maybeSingle();
            
            if (profileError) {
                console.warn('Profile search by email failed:', profileError);
                // Try by user_id as fallback
                const { data: fallbackProfile } = await this.supabase
                    .from('consolidated_user_profiles_table')
                    .select('*')
                    .eq('user_id', authData.user.id)
                    .maybeSingle();
                
                if (!fallbackProfile) {
                    throw new Error('Account not found. Please register first.');
                }
                
                await this.processLogin(fallbackProfile);
                return;
            }
            
            if (!profileData) {
                throw new Error('Account not found. Please register first.');
            }
            
            if (profileData.status?.toLowerCase() !== 'approved') {
                await this.supabase.auth.signOut();
                throw new Error('Account is pending approval. Please contact administration.');
            }
            
            // 4. Check if 2FA setup is required
            const { data: totpSettings } = await this.supabase
                .from('user_2fa_settings')
                .select('*')
                .eq('id', authData.user.id)
                .maybeSingle();
            
            if (!totpSettings || !totpSettings.is_2fa_enabled) {
                // New user - setup 2FA
                this.showMethodSelection();
            } else {
                // Check for trusted device
                const deviceId = this.generateDeviceId();
                if (this.state.trustedDevices[deviceId] && 
                    new Date(this.state.trustedDevices[deviceId].expires) > new Date()) {
                    // Trusted device, skip 2FA
                    await this.completeLogin(profileData);
                } else {
                    // Existing user - verify 2FA
                    this.showVerificationModal(totpSettings.preferred_method || 'authenticator');
                }
            }
            
        } catch (error) {
            console.error('Login error:', error);
            if (this.supabase) {
                await this.supabase.auth.signOut();
            }
            this.showError(errorMsg, error.message || 'Login failed. Please try again.');
            
        } finally {
            this.state.isLoggingIn = false;
            loginButton.disabled = false;
            buttonText.textContent = 'Sign In';
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
        
        // Redirect based on role (like old script)
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
        console.log('Showing eCitizen style method selection');
        this.hideAllModals();
        const modal = document.getElementById('methodSelectionModal');
        modal.classList.add('active');
        
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
        this.hideAllModals();
        const modal = document.getElementById('twoFactorModal');
        const methodText = document.getElementById('verificationMethodText');
        const emailText = document.getElementById('2faEmail');
        
        const methods = {
            authenticator: 'Enter the 6-digit code from your authenticator app',
            sms: 'Enter the 6-digit code sent to your phone',
            email: 'Enter the 6-digit code sent to your email'
        };
        
        methodText.textContent = methods[method] || methods.authenticator;
        emailText.textContent = this.maskEmail(this.state.currentUser.email);
        
        this.clearOTPInputs('verify');
        this.clearError(document.getElementById('2faError'));
        
        // Show resend button and set countdown
        this.updateResendButton(method);
        
        modal.classList.add('active');
        setTimeout(() => document.querySelector('#twoFactorModal .otp-digit').focus(), 100);
    },
    
    showAuthenticatorSetup: function() {
        this.hideAllModals();
        
        // Generate TOTP secret
        this.state.currentSecret = otplib.authenticator.generateSecret();
        const uri = otplib.authenticator.keyuri(
            this.state.currentUser.email,
            'NCHSM Portal',
            this.state.currentSecret
        );
        
        // Generate QR code
        const qrCodeDiv = document.getElementById('qrCode');
        qrCodeDiv.innerHTML = '';
        
        QRCode.toCanvas(qrCodeDiv, uri, {
            width: 200,
            height: 200,
            margin: 1,
            color: { dark: '#0c4a6e', light: '#ffffff' }
        }, (error) => {
            if (error) {
                console.error('QR Code generation failed:', error);
                this.showError(document.getElementById('setupError'), 'Failed to generate QR code');
            }
        });
        
        this.clearOTPInputs('authenticator');
        this.clearError(document.getElementById('setupError'));
        
        document.getElementById('authenticatorSetupModal').classList.add('active');
        setTimeout(() => document.querySelector('#authenticatorSetupModal .otp-digit').focus(), 100);
    },
    
    showBackupCodesModal: function(codes) {
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
        document.getElementById('backupCodesModal').classList.add('active');
    },
    
    hideAllModals: function() {
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = '';
    },
    
    // ============================================
    // METHOD SELECTION - eCitizen Style
    // ============================================
    selectMethod: function(method) {
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
        
        // Show loading state
        const methodBtn = document.getElementById('proceedWithMethodBtn');
        const originalText = methodBtn.innerHTML;
        methodBtn.disabled = true;
        methodBtn.innerHTML = '<span class="loading-spinner"></span> Sending...';
        
        try {
            if (this.state.selectedMethod === 'authenticator') {
                this.showAuthenticatorSetup();
            } else if (this.state.selectedMethod === 'sms') {
                // Actually send SMS verification
                await this.sendSMSVerification();
                this.showVerificationModal('sms');
            } else if (this.state.selectedMethod === 'email') {
                // Actually send email verification
                await this.sendEmailVerification();
                this.showVerificationModal('email');
            }
        } catch (error) {
            console.error('Error sending verification:', error);
            this.showError(document.getElementById('methodError'), 
                `Failed to send verification: ${error.message}`);
        } finally {
            methodBtn.disabled = false;
            methodBtn.innerHTML = originalText;
        }
    },
    
    // ============================================
    // EMAIL VERIFICATION
    // ============================================
    sendEmailVerification: async function() {
        if (!this.state.currentUser?.email) {
            throw new Error('No email address available');
        }
        
        try {
            // Generate a 6-digit OTP
            const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
            
            // Store the code temporarily for verification
            this.state.verificationCodes.email = {
                code: otpCode,
                expires: Date.now() + (5 * 60 * 1000), // 5 minutes
                attempts: 0
            };
            
            // Save to database for verification (optional but recommended)
            const { error: dbError } = await this.supabase
                .from('verification_codes')
                .insert({
                    user_id: this.state.currentUser.userId,
                    email: this.state.currentUser.email,
                    code: otpCode,
                    type: 'email_2fa',
                    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
                });
            
            if (dbError) {
                console.warn('Failed to save verification code to database:', dbError);
                // Continue anyway, we have it in memory
            }
            
            // Method 1: Use Supabase Edge Function (Recommended)
            try {
                const { error: emailError } = await this.supabase.functions.invoke('send-2fa-email', {
                    body: {
                        to: this.state.currentUser.email,
                        otp: otpCode,
                        user_id: this.state.currentUser.userId
                    }
                });
                
                if (!emailError) {
                    console.log('✅ Email sent via Edge Function');
                    return;
                }
            } catch (edgeFuncError) {
                console.warn('Edge function failed:', edgeFuncError);
            }
            
            // Method 2: Use Supabase Email (if configured)
            try {
                const { error: emailError } = await this.supabase.auth.resend({
                    type: 'signup',
                    email: this.state.currentUser.email,
                    options: {
                        emailRedirectTo: window.location.origin,
                        data: {
                            otp_code: otpCode,
                            message: `Your NCHSM verification code is: ${otpCode}`
                        }
                    }
                });
                
                if (!emailError) {
                    console.log('✅ Email sent via Supabase Auth');
                    return;
                }
            } catch (authEmailError) {
                console.warn('Supabase Auth email failed:', authEmailError);
            }
            
            // Method 3: Use SMTP via Supabase
            const emailContent = this.generateEmailTemplate(otpCode);
            const { error: smtpError } = await this.supabase
                .from('emails')
                .insert({
                    to: this.state.currentUser.email,
                    subject: 'Your NCHSM Portal Verification Code',
                    html_content: emailContent,
                    created_at: new Date().toISOString()
                });
            
            if (smtpError) {
                console.warn('SMTP email failed:', smtpError);
                throw new Error('Could not send verification email. Please try another method.');
            }
            
            console.log('✅ Email sent via SMTP');
            
        } catch (error) {
            console.error('Email verification error:', error);
            throw new Error('Failed to send verification email');
        }
    },
    
    // ============================================
    // SMS VERIFICATION
    // ============================================
    sendSMSVerification: async function() {
        try {
            // Get user's phone number from profile
            const phoneNumber = await this.getUserPhone();
            if (!phoneNumber) {
                throw new Error('No phone number found in profile');
            }
            
            // Generate a 6-digit OTP
            const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
            
            // Store the code temporarily for verification
            this.state.verificationCodes.sms = {
                code: otpCode,
                expires: Date.now() + (5 * 60 * 1000), // 5 minutes
                attempts: 0
            };
            
            // Save to database
            const { error: dbError } = await this.supabase
                .from('verification_codes')
                .insert({
                    user_id: this.state.currentUser.userId,
                    phone: phoneNumber,
                    code: otpCode,
                    type: 'sms_2fa',
                    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
                });
            
            if (dbError) {
                console.warn('Failed to save SMS code to database:', dbError);
            }
            
            // Send SMS using Supabase Edge Function
            const { error: smsError } = await this.supabase.functions.invoke('send-sms-verification', {
                body: {
                    to: phoneNumber,
                    otp: otpCode,
                    user_id: this.state.currentUser.userId
                }
            });
            
            if (smsError) {
                console.warn('SMS Edge Function failed:', smsError);
                throw new Error('Could not send SMS. Please try another method.');
            }
            
            console.log(`✅ SMS sent to ${this.maskPhone(phoneNumber)}`);
            
        } catch (error) {
            console.error('SMS verification error:', error);
            throw new Error('Failed to send SMS verification');
        }
    },
    
    // ============================================
    // USER INFO DISPLAY
    // ============================================
    updateUserInfoDisplay: function() {
        // Mask email (eCitizen style)
        const email = this.state.currentUser?.email || '';
        const maskedEmail = this.maskEmail(email);
        const emailDisplay = document.getElementById('userEmailDisplay');
        if (emailDisplay) {
            emailDisplay.textContent = maskedEmail;
        }
        
        // Get and mask phone from profile
        this.getUserPhone().then(phone => {
            const maskedPhone = this.maskPhone(phone);
            const phoneDisplay = document.getElementById('userPhoneDisplay');
            if (phoneDisplay) {
                phoneDisplay.textContent = maskedPhone;
            }
        });
    },
    
    maskEmail: function(email) {
        if (!email) return 'No email on file';
        
        const [localPart, domain] = email.split('@');
        if (!localPart || !domain) return email;
        
        // eCitizen style: Show first character and last character before @
        const firstChar = localPart[0];
        const lastChar = localPart[localPart.length - 1];
        const middleChars = localPart.length - 2;
        const maskedLocal = firstChar + '*'.repeat(middleChars) + lastChar;
        
        return `${maskedLocal}@${domain}`;
    },
    
    maskPhone: function(phone) {
        if (!phone) return 'No phone on file';
        
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
    // OTP HANDLING
    // ============================================
    moveToNextOTP: function(input, context) {
        const index = parseInt(input.dataset.index);
        const modalId = this.getModalId(context);
        const allInputs = document.querySelectorAll(`${modalId} .otp-digit`);
        
        // Validate input (only numbers)
        input.value = input.value.replace(/[^0-9]/g, '');
        
        // Update UI
        input.classList.toggle('filled', input.value.length > 0);
        
        // Auto-navigation
        if (input.value.length === 1 && index < 5) {
            allInputs[index + 1].focus();
        }
        
        if (input.value.length === 0 && index > 0 && event.inputType === 'deleteContentBackward') {
            allInputs[index - 1].focus();
        }
        
        // Auto-submit
        if (index === 5 && input.value.length === 1) {
            const allFilled = Array.from(allInputs).every(inp => inp.value.length === 1);
            if (allFilled) {
                setTimeout(() => {
                    if (context === 'authenticator') {
                        this.completeAuthenticatorSetup();
                    } else if (context === 'verify') {
                        this.verify2FACode();
                    }
                }, 150);
            }
        }
    },
    
    getModalId: function(context) {
        switch(context) {
            case 'authenticator': return '#authenticatorSetupModal';
            case 'verify': return '#twoFactorModal';
            default: return '#twoFactorModal';
        }
    },
    
    clearOTPInputs: function(context) {
        const modalId = this.getModalId(context);
        document.querySelectorAll(`${modalId} .otp-digit`).forEach(input => {
            input.value = '';
            input.classList.remove('filled');
        });
    },
    
    getOTPCode: function(context) {
        const modalId = this.getModalId(context);
        const inputs = document.querySelectorAll(`${modalId} .otp-digit`);
        return Array.from(inputs).map(input => input.value).join('');
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
        if (code.length !== 6 || !/^\d+$/.test(code)) {
            this.showError(document.getElementById('setupError'), 'Please enter all 6 digits');
            return;
        }
        
        const setupBtn = document.getElementById('setup2FABtn');
        const spinner = document.getElementById('setupVerifyingSpinner');
        setupBtn.disabled = true;
        spinner.style.display = 'inline-block';
        
        try {
            // Verify code
            const isValid = otplib.authenticator.check(code, this.state.currentSecret);
            if (!isValid) {
                throw new Error('Invalid code. Please try again.');
            }
            
            // Generate backup codes
            const backupCodes = Array.from({length: 10}, () => 
                Array.from({length: 8}, () => 
                    'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]
                ).join('')
            );
            
            // Save to database
            const { error } = await this.supabase
                .from('user_2fa_settings')
                .upsert({
                    id: this.state.currentUser.userId,
                    totp_secret: this.state.currentSecret,
                    backup_codes: backupCodes,
                    preferred_method: 'authenticator',
                    is_2fa_enabled: true,
                    updated_at: new Date().toISOString()
                });
            
            if (error) throw error;
            
            this.showBackupCodesModal(backupCodes);
            
        } catch (error) {
            console.error('Setup error:', error);
            this.showError(document.getElementById('setupError'), error.message);
        } finally {
            setupBtn.disabled = false;
            spinner.style.display = 'none';
        }
    },
    
    // ============================================
    // 2FA VERIFICATION
    // ============================================
    verify2FACode: async function() {
        const code = this.getOTPCode('verify');
        if (code.length !== 6 || !/^\d+$/.test(code)) {
            this.showError(document.getElementById('2faError'), 'Please enter all 6 digits');
            return;
        }
        
        const verifyBtn = document.getElementById('verify2FABtn');
        const spinner = document.getElementById('verifyingSpinner');
        verifyBtn.disabled = true;
        spinner.style.display = 'inline-block';
        
        try {
            // Determine verification method based on current method
            const method = this.getCurrentVerificationMethod();
            
            if (method === 'authenticator') {
                // Get TOTP secret
                const { data: totpData } = await this.supabase
                    .from('user_2fa_settings')
                    .select('totp_secret')
                    .eq('id', this.state.currentUser.userId)
                    .single();
                
                if (!totpData?.totp_secret) throw new Error('2FA not configured');
                
                // Verify TOTP
                const isValid = otplib.authenticator.check(code, totpData.totp_secret);
                if (!isValid) {
                    this.state.otpAttempts++;
                    if (this.state.otpAttempts >= this.state.maxOtpAttempts) {
                        await this.supabase.auth.signOut();
                        throw new Error('Too many failed attempts. Please try again later.');
                    }
                    throw new Error(`Invalid code. ${this.state.maxOtpAttempts - this.state.otpAttempts} attempts remaining.`);
                }
            } else if (method === 'email') {
                // Verify email OTP
                await this.verifyEmailCode(code);
            } else if (method === 'sms') {
                // Verify SMS OTP
                await this.verifySMSCode(code);
            }
            
            // Trust device if selected
            if (document.getElementById('trustDevice')?.checked) {
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
            console.error('Verification error:', error);
            this.showError(document.getElementById('2faError'), error.message);
            this.clearOTPInputs('verify');
            document.querySelector('#twoFactorModal .otp-digit').focus();
        } finally {
            verifyBtn.disabled = false;
            spinner.style.display = 'none';
        }
    },
    
    getCurrentVerificationMethod: function() {
        // Check which method was selected
        if (this.state.selectedMethod) {
            return this.state.selectedMethod;
        }
        
        // Fallback to checking from database
        return 'authenticator'; // Default
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
        
        // Clear any existing timer
        if (this.resendTimer) clearInterval(this.resendTimer);
        if (this.resendTimeout) clearTimeout(this.resendTimeout);
        
        // Set countdown
        let timeLeft = 60; // 60 seconds
        resendBtn.disabled = true;
        
        this.resendTimer = setInterval(() => {
            timeLeft--;
            resendBtn.innerHTML = `Resend in ${timeLeft}s`;
            
            if (timeLeft <= 0) {
                clearInterval(this.resendTimer);
                resendBtn.disabled = false;
                resendBtn.innerHTML = 'Resend Code';
                resendBtn.onclick = () => this.resendVerificationCode(method);
            }
        }, 1000);
    },
    
    resendVerificationCode: async function(method) {
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
                `New verification code sent to your ${method}`, 'success');
            
        } catch (error) {
            console.error('Resend error:', error);
            this.showError(document.getElementById('2faError'), 
                `Failed to resend code: ${error.message}`);
        }
    },
    
    // ============================================
    // COMPLETE LOGIN
    // ============================================
    completeLogin: async function(profileData) {
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
            console.error('Complete login error:', error);
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
    },
    
    redirectToDashboard: function(profileData) {
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
        
        // Add fade-out animation
        document.body.style.opacity = '0';
        document.body.style.transition = 'opacity 0.3s ease';
        
        setTimeout(() => {
            window.location.href = redirectUrl;
        }, 300);
    },
    
    proceedToDashboard: function() {
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
            // Verify backup code (simplified for demo)
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
    },
    
    showError: function(element, message, type = 'error') {
        if (element) {
            element.querySelector('.error-text').textContent = message;
            element.classList.remove('success', 'error');
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
        this.hideAllModals();
        if (this.supabase) {
            this.supabase.auth.signOut();
        }
        // Clear any login state
        this.state.currentUser = null;
        this.state.isLoggingIn = false;
        this.state.verificationCodes = {};
        
        // Reset form
        const loginButton = document.getElementById('loginButton');
        const buttonText = document.getElementById('button-text');
        if (loginButton) loginButton.disabled = false;
        if (buttonText) buttonText.textContent = 'Sign In';
        
        // Focus email field
        const emailInput = document.getElementById('email');
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
window.moveToNextOTP = (input, context) => window.NCHSMLogin.moveToNextOTP(input, context);
window.verify2FACode = () => window.NCHSMLogin.verify2FACode();
window.useBackupCode = () => window.NCHSMLogin.useBackupCode();
window.selectMethod = (method) => window.NCHSMLogin.selectMethod(method);
window.proceedWithSelectedMethod = () => window.NCHSMLogin.proceedWithSelectedMethod();
window.completeAuthenticatorSetup = () => window.NCHSMLogin.completeAuthenticatorSetup();
window.downloadBackupCodes = () => window.NCHSMLogin.downloadBackupCodes();
window.proceedToDashboard = () => window.NCHSMLogin.proceedToDashboard();
window.copyToClipboard = (text, button) => window.NCHSMLogin.copyToClipboard(text, button);
window.goBackToLogin = () => window.NCHSMLogin.goBackToLogin();
window.resendVerificationCode = (method) => window.NCHSMLogin.resendVerificationCode(method);

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.NCHSMLogin.init();
    
    // Offline detection
    window.addEventListener('online', () => window.NCHSMLogin.updateOnlineStatus());
    window.addEventListener('offline', () => window.NCHSMLogin.updateOnlineStatus());
    
    // Initialize online status
    window.NCHSMLogin.updateOnlineStatus();
});
