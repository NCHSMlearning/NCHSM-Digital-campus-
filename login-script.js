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
        trustedDevices: JSON.parse(localStorage.getItem('trusted_devices') || '{}')
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
            input.addEventListener('blur', this.validateField.bind(this));
            input.addEventListener('input', this.clearFieldError.bind(this));
        });
    },
    
    initModals: function() {
        // Add keyboard navigation to modals
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.addEventListener('keydown', this.handleModalKeyboard.bind(this));
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
            
            // 3. Check profile status
            const { data: profileData, error: profileError } = await this.supabase
                .from('consolidated_user_profiles_table')
                .select('*')
                .eq('user_id', authData.user.id)
                .maybeSingle();
            
            if (profileError) throw new Error('Unable to load profile. Please try again.');
            
            if (!profileData) {
                await this.supabase.auth.signOut();
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
    // MODAL MANAGEMENT
    // ============================================
    showMethodSelection: function() {
        this.hideAllModals();
        const modal = document.getElementById('methodSelectionModal');
        modal.classList.add('active');
        document.querySelector('#methodSelectionModal .method-card').focus();
        
        // Reset selection
        this.state.selectedMethod = null;
        document.querySelectorAll('.method-card').forEach(card => {
            card.classList.remove('selected');
        });
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
        emailText.textContent = this.state.currentUser.email;
        
        this.clearOTPInputs('verify');
        this.clearError(document.getElementById('2faError'));
        
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
    // METHOD SELECTION
    // ============================================
    selectMethod: function(method) {
        this.state.selectedMethod = method;
        
        // Update UI
        document.querySelectorAll('.method-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        const selectedCard = event.currentTarget;
        selectedCard.classList.add('selected');
        selectedCard.setAttribute('aria-checked', 'true');
        
        // Update other cards
        document.querySelectorAll('.method-card').forEach(card => {
            if (card !== selectedCard) {
                card.setAttribute('aria-checked', 'false');
            }
        });
        
        // Clear any previous errors
        this.clearError(document.getElementById('methodError'));
    },
    
    proceedWithSelectedMethod: function() {
        if (!this.state.selectedMethod) {
            this.showError(document.getElementById('methodError'), 'Please select a security method');
            return;
        }
        
        if (this.state.selectedMethod === 'authenticator') {
            this.showAuthenticatorSetup();
        } else {
            // For SMS/Email, show verification modal directly
            this.showVerificationModal(this.state.selectedMethod);
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
            
            // Trust device if selected
            if (document.getElementById('trustDevice')?.checked) {
                await this.trustDevice(this.state.currentUser.userId);
            }
            
            // Get profile and complete login
            const { data: profileData } = await this.supabase
                .from('consolidated_user_profiles_table')
                .select('*')
                .eq('user_id', this.state.currentUser.userId)
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
    // UTILITY FUNCTIONS
    // ============================================
    useBackupCode: function() {
        const backupCode = prompt('Enter your backup code:');
        if (backupCode) {
            // Verify backup code (simplified for demo)
            alert('Backup code verification would be implemented here');
        }
    },
    
    sendRecoveryEmail: function() {
        if (!this.state.currentUser?.email) return;
        
        // Send recovery email (simplified for demo)
        alert(`Recovery email would be sent to ${this.state.currentUser.email}`);
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
    
    showError: function(element, message) {
        if (element) {
            element.querySelector('.error-text').textContent = message;
            element.classList.add('show');
            element.style.display = 'flex';
        }
    },
    
    clearError: function(element) {
        if (element) {
            element.classList.remove('show');
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
        
        if (e.key === 'Enter' && e.target.classList.contains('method-card')) {
            const method = e.target.getAttribute('onclick')?.match(/selectMethod\('(.+)'\)/)?.[1];
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
window.hideAllModals = () => NCHSMLogin.hideAllModals();
window.moveToNextOTP = (input, context) => NCHSMLogin.moveToNextOTP(input, context);
window.verify2FACode = () => NCHSMLogin.verify2FACode();
window.useBackupCode = () => NCHSMLogin.useBackupCode();
window.sendRecoveryEmail = () => NCHSMLogin.sendRecoveryEmail();
window.selectMethod = (method) => NCHSMLogin.selectMethod(method);
window.proceedWithSelectedMethod = () => NCHSMLogin.proceedWithSelectedMethod();
window.completeAuthenticatorSetup = () => NCHSMLogin.completeAuthenticatorSetup();
window.downloadBackupCodes = () => NCHSMLogin.downloadBackupCodes();
window.proceedToDashboard = () => NCHSMLogin.proceedToDashboard();
window.copyToClipboard = (text, button) => NCHSMLogin.copyToClipboard(text, button);

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    NCHSMLogin.init();
    
    // Offline detection
    window.addEventListener('online', () => NCHSMLogin.updateOnlineStatus());
    window.addEventListener('offline', () => NCHSMLogin.updateOnlineStatus());
    
    // Initialize online status
    NCHSMLogin.updateOnlineStatus();
});
