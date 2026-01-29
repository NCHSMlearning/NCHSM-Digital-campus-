// ============================================
// SINGLE SUPABASE INITIALIZATION
// ============================================

// Check if supabase is already defined
let supabase;
if (window.supabase) {
    supabase = window.supabase.createClient(
        'https://lwhtjozfsmbyihenfunw.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk'
    );
} else {
    console.error('Supabase library not loaded');
}

// ============================================
// STATE MANAGEMENT
// ============================================
const state = {
    currentUser: null,
    selectedMethod: null,
    currentSecret: null,
    backupCodes: [],
    isLoggingIn: false,
    otpAttempts: 0,
    maxOtpAttempts: 3,
    trustedDevices: JSON.parse(localStorage.getItem('trusted_devices') || '{}')
};

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Feather Icons
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
    
    // Check for trusted device
    checkTrustedDevice();
    
    // Password Toggle
    initPasswordToggle();
    
    // Form Submission
    initLoginForm();
    
    // Initialize modals
    initModals();
    
    // Focus management for accessibility
    initFocusManagement();
    
    // Handle virtual keyboard
    initVirtualKeyboardHandler();
});

// ============================================
// INITIALIZATION FUNCTIONS
// ============================================
function initPasswordToggle() {
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
}

function initLoginForm() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;
    
    loginForm.addEventListener('submit', handleLogin);
    
    // Auto-focus email field on load
    const emailInput = document.getElementById('email');
    if (emailInput) {
        setTimeout(() => emailInput.focus(), 100);
    }
    
    // Add input validation
    const inputs = loginForm.querySelectorAll('input[required]');
    inputs.forEach(input => {
        input.addEventListener('blur', validateField);
        input.addEventListener('input', clearFieldError);
    });
}

function initModals() {
    // Add keyboard navigation to modals
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('keydown', handleModalKeyboard);
    });
    
    // Close modal on backdrop click
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideAllModals();
            }
        });
    });
}

function initFocusManagement() {
    // Trap focus in modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Tab' && document.querySelector('.modal-overlay.active')) {
            trapFocus(e);
        }
    });
}

function initVirtualKeyboardHandler() {
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
}

// ============================================
// TRUSTED DEVICE CHECK
// ============================================
function checkTrustedDevice() {
    const deviceId = generateDeviceId();
    const trustedDevice = state.trustedDevices[deviceId];
    
    if (trustedDevice && new Date(trustedDevice.expires) > new Date()) {
        // Device is trusted, skip to dashboard
        const storedUser = localStorage.getItem('currentUserProfile');
        if (storedUser) {
            const profile = JSON.parse(storedUser);
            redirectToDashboard(profile);
        }
    }
}

function generateDeviceId() {
    const data = [
        navigator.userAgent,
        navigator.language,
        screen.width,
        screen.height,
        new Intl.DateTimeFormat().resolvedOptions().timeZone
    ].join('|');
    
    return btoa(data).substring(0, 32);
}

// ============================================
// LOGIN HANDLER
// ============================================
async function handleLogin(e) {
    e.preventDefault();
    
    if (state.isLoggingIn) return;
    
    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('errorMsg');
    const loginButton = document.getElementById('loginButton');
    const buttonText = document.getElementById('button-text');
    
    // Validation
    if (!validateEmail(email)) {
        showError(errorMsg, 'Please enter a valid email address');
        return;
    }
    
    if (!password) {
        showError(errorMsg, 'Please enter your password');
        return;
    }
    
    // Update UI
    clearError(errorMsg);
    state.isLoggingIn = true;
    loginButton.disabled = true;
    buttonText.innerHTML = '<span class="loading-spinner"></span> Signing In...';
    
    try {
        // 1. Authenticate with Supabase
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
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
        state.currentUser = {
            email,
            userId: authData.user.id,
            session: authData.session
        };
        
        // 3. Check profile status
        const { data: profileData, error: profileError } = await supabase
            .from('consolidated_user_profiles_table')
            .select('*')
            .eq('user_id', authData.user.id)
            .maybeSingle();
        
        if (profileError) throw new Error('Unable to load profile. Please try again.');
        
        if (!profileData) {
            await supabase.auth.signOut();
            throw new Error('Account not found. Please register first.');
        }
        
        if (profileData.status?.toLowerCase() !== 'approved') {
            await supabase.auth.signOut();
            throw new Error('Account is pending approval. Please contact administration.');
        }
        
        // 4. Check if 2FA setup is required
        const { data: totpSettings } = await supabase
            .from('user_2fa_settings')
            .select('*')
            .eq('id', authData.user.id)
            .maybeSingle();
        
        if (!totpSettings || !totpSettings.is_2fa_enabled) {
            // New user - setup 2FA
            showMethodSelection();
        } else {
            // Check for trusted device
            const deviceId = generateDeviceId();
            if (state.trustedDevices[deviceId] && 
                new Date(state.trustedDevices[deviceId].expires) > new Date()) {
                // Trusted device, skip 2FA
                await completeLogin(profileData);
            } else {
                // Existing user - verify 2FA
                showVerificationModal(totpSettings.preferred_method || 'authenticator');
            }
        }
        
    } catch (error) {
        console.error('Login error:', error);
        if (supabase) {
            await supabase.auth.signOut();
        }
        showError(errorMsg, error.message || 'Login failed. Please try again.');
        
    } finally {
        state.isLoggingIn = false;
        loginButton.disabled = false;
        buttonText.textContent = 'Sign In';
    }
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validateField(e) {
    const input = e.target;
    const value = input.value.trim();
    
    if (input.type === 'email' && value && !validateEmail(value)) {
        input.classList.add('error');
        return false;
    }
    
    if (input.required && !value) {
        input.classList.add('error');
        return false;
    }
    
    input.classList.remove('error');
    return true;
}

function clearFieldError(e) {
    e.target.classList.remove('error');
    clearError(document.getElementById('errorMsg'));
}

// ============================================
// MODAL MANAGEMENT
// ============================================
function showMethodSelection() {
    hideAllModals();
    const modal = document.getElementById('methodSelectionModal');
    modal.classList.add('active');
    document.querySelector('#methodSelectionModal .method-card').focus();
    
    // Reset selection
    state.selectedMethod = null;
    document.querySelectorAll('.method-card').forEach(card => {
        card.classList.remove('selected');
    });
}

function showVerificationModal(method = 'authenticator') {
    hideAllModals();
    const modal = document.getElementById('twoFactorModal');
    const methodText = document.getElementById('verificationMethodText');
    const emailText = document.getElementById('2faEmail');
    
    const methods = {
        authenticator: 'Enter the 6-digit code from your authenticator app',
        sms: 'Enter the 6-digit code sent to your phone',
        email: 'Enter the 6-digit code sent to your email'
    };
    
    methodText.textContent = methods[method] || methods.authenticator;
    emailText.textContent = state.currentUser.email;
    
    clearOTPInputs('verify');
    clearError(document.getElementById('2faError'));
    
    modal.classList.add('active');
    setTimeout(() => document.querySelector('#twoFactorModal .otp-digit').focus(), 100);
}

function showAuthenticatorSetup() {
    hideAllModals();
    
    // Generate TOTP secret
    state.currentSecret = otplib.authenticator.generateSecret();
    const uri = otplib.authenticator.keyuri(
        state.currentUser.email,
        'NCHSM Portal',
        state.currentSecret
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
            showError(document.getElementById('setupError'), 'Failed to generate QR code');
        }
    });
    
    clearOTPInputs('authenticator');
    clearError(document.getElementById('setupError'));
    
    document.getElementById('authenticatorSetupModal').classList.add('active');
    setTimeout(() => document.querySelector('#authenticatorSetupModal .otp-digit').focus(), 100);
}

function showBackupCodesModal(codes) {
    hideAllModals();
    state.backupCodes = codes;
    
    const codesList = document.getElementById('backupCodesList');
    codesList.innerHTML = codes.map(code => `
        <div class="backup-code" role="text" aria-label="Backup code">
            ${code}
            <button class="copy-button" 
                    onclick="copyToClipboard('${code}', this)"
                    aria-label="Copy code ${code}">
                <i data-feather="copy" width="12" height="12"></i>
            </button>
        </div>
    `).join('');
    
    feather.replace();
    document.getElementById('backupCodesModal').classList.add('active');
}

function hideAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.classList.remove('active');
    });
    document.body.style.overflow = '';
}

// ============================================
// METHOD SELECTION
// ============================================
function selectMethod(method) {
    state.selectedMethod = method;
    
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
    clearError(document.getElementById('methodError'));
}

function proceedWithSelectedMethod() {
    if (!state.selectedMethod) {
        showError(document.getElementById('methodError'), 'Please select a security method');
        return;
    }
    
    if (state.selectedMethod === 'authenticator') {
        showAuthenticatorSetup();
    } else {
        // For SMS/Email, show verification modal directly
        showVerificationModal(state.selectedMethod);
    }
}

// ============================================
// OTP HANDLING
// ============================================
function moveToNextOTP(input, context) {
    const index = parseInt(input.dataset.index);
    const modalId = getModalId(context);
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
                    completeAuthenticatorSetup();
                } else if (context === 'verify') {
                    verify2FACode();
                }
            }, 150);
        }
    }
}

function getModalId(context) {
    switch(context) {
        case 'authenticator': return '#authenticatorSetupModal';
        case 'verify': return '#twoFactorModal';
        default: return '#twoFactorModal';
    }
}

function clearOTPInputs(context) {
    const modalId = getModalId(context);
    document.querySelectorAll(`${modalId} .otp-digit`).forEach(input => {
        input.value = '';
        input.classList.remove('filled');
    });
}

function getOTPCode(context) {
    const modalId = getModalId(context);
    const inputs = document.querySelectorAll(`${modalId} .otp-digit`);
    return Array.from(inputs).map(input => input.value).join('');
}

// ============================================
// AUTHENTICATOR SETUP
// ============================================
async function completeAuthenticatorSetup() {
    const code = getOTPCode('authenticator');
    if (code.length !== 6 || !/^\d+$/.test(code)) {
        showError(document.getElementById('setupError'), 'Please enter all 6 digits');
        return;
    }
    
    const setupBtn = document.getElementById('setup2FABtn');
    const spinner = document.getElementById('setupVerifyingSpinner');
    setupBtn.disabled = true;
    spinner.style.display = 'inline-block';
    
    try {
        // Verify code
        const isValid = otplib.authenticator.check(code, state.currentSecret);
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
        const { error } = await supabase
            .from('user_2fa_settings')
            .upsert({
                id: state.currentUser.userId,
                totp_secret: state.currentSecret,
                backup_codes: backupCodes,
                preferred_method: 'authenticator',
                is_2fa_enabled: true,
                updated_at: new Date().toISOString()
            });
        
        if (error) throw error;
        
        showBackupCodesModal(backupCodes);
        
    } catch (error) {
        console.error('Setup error:', error);
        showError(document.getElementById('setupError'), error.message);
    } finally {
        setupBtn.disabled = false;
        spinner.style.display = 'none';
    }
}

// ============================================
// 2FA VERIFICATION
// ============================================
async function verify2FACode() {
    const code = getOTPCode('verify');
    if (code.length !== 6 || !/^\d+$/.test(code)) {
        showError(document.getElementById('2faError'), 'Please enter all 6 digits');
        return;
    }
    
    const verifyBtn = document.getElementById('verify2FABtn');
    const spinner = document.getElementById('verifyingSpinner');
    verifyBtn.disabled = true;
    spinner.style.display = 'inline-block';
    
    try {
        // Get TOTP secret
        const { data: totpData } = await supabase
            .from('user_2fa_settings')
            .select('totp_secret')
            .eq('id', state.currentUser.userId)
            .single();
        
        if (!totpData?.totp_secret) throw new Error('2FA not configured');
        
        // Verify TOTP
        const isValid = otplib.authenticator.check(code, totpData.totp_secret);
        
        if (!isValid) {
            state.otpAttempts++;
            if (state.otpAttempts >= state.maxOtpAttempts) {
                await supabase.auth.signOut();
                throw new Error('Too many failed attempts. Please try again later.');
            }
            throw new Error(`Invalid code. ${state.maxOtpAttempts - state.otpAttempts} attempts remaining.`);
        }
        
        // Trust device if selected
        if (document.getElementById('trustDevice')?.checked) {
            await trustDevice(state.currentUser.userId);
        }
        
        // Get profile and complete login
        const { data: profileData } = await supabase
            .from('consolidated_user_profiles_table')
            .select('*')
            .eq('user_id', state.currentUser.userId)
            .single();
        
        if (!profileData) throw new Error('Profile not found');
        
        await completeLogin(profileData);
        
    } catch (error) {
        console.error('Verification error:', error);
        showError(document.getElementById('2faError'), error.message);
        clearOTPInputs('verify');
        document.querySelector('#twoFactorModal .otp-digit').focus();
    } finally {
        verifyBtn.disabled = false;
        spinner.style.display = 'none';
    }
}

// ============================================
// COMPLETE LOGIN
// ============================================
async function completeLogin(profileData) {
    try {
        // Store profile
        localStorage.setItem('currentUserProfile', JSON.stringify(profileData));
        
        // Store session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            localStorage.setItem('supabase_session', JSON.stringify(session));
        }
        
        // Redirect to dashboard
        redirectToDashboard(profileData);
        
    } catch (error) {
        console.error('Complete login error:', error);
        if (supabase) {
            await supabase.auth.signOut();
        }
        localStorage.removeItem('currentUserProfile');
        localStorage.removeItem('supabase_session');
        showError(document.getElementById('errorMsg'), 'Login failed. Please try again.');
    }
}

async function trustDevice(userId) {
    const deviceId = generateDeviceId();
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);
    
    state.trustedDevices[deviceId] = {
        userId,
        expires: expires.toISOString()
    };
    
    localStorage.setItem('trusted_devices', JSON.stringify(state.trustedDevices));
}

function redirectToDashboard(profileData) {
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
}

function proceedToDashboard() {
    hideAllModals();
    
    const storedProfile = localStorage.getItem('currentUserProfile');
    if (storedProfile) {
        const profile = JSON.parse(storedProfile);
        redirectToDashboard(profile);
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function useBackupCode() {
    const backupCode = prompt('Enter your backup code:');
    if (backupCode) {
        // Verify backup code (simplified for demo)
        alert('Backup code verification would be implemented here');
    }
}

function sendRecoveryEmail() {
    if (!state.currentUser?.email) return;
    
    // Send recovery email (simplified for demo)
    alert(`Recovery email would be sent to ${state.currentUser.email}`);
}

function copyToClipboard(text, button) {
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
}

function downloadBackupCodes() {
    if (!state.backupCodes.length) return;
    
    const content = `NCHSM Digital Portal - Backup Codes\n\n` +
                   `Generated: ${new Date().toLocaleDateString()}\n` +
                   `Email: ${state.currentUser?.email || 'Unknown'}\n\n` +
                   `IMPORTANT: Keep these codes in a secure place. Each code can be used once.\n\n` +
                   state.backupCodes.join('\n');
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nchsm-backup-codes-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function showError(element, message) {
    if (element) {
        element.querySelector('.error-text').textContent = message;
        element.classList.add('show');
        element.style.display = 'flex';
    }
}

function clearError(element) {
    if (element) {
        element.classList.remove('show');
        element.style.display = 'none';
    }
}

// ============================================
// ACCESSIBILITY FUNCTIONS
// ============================================
function handleModalKeyboard(e) {
    if (e.key === 'Escape') {
        hideAllModals();
    }
    
    if (e.key === 'Enter' && e.target.classList.contains('method-card')) {
        const method = e.target.getAttribute('onclick')?.match(/selectMethod\('(.+)'\)/)?.[1];
        if (method) {
            selectMethod(method);
        }
    }
}

function trapFocus(e) {
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
}

// ============================================
// PERFORMANCE OPTIMIZATIONS
// ============================================
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        // Handle resize completion
    }, 250);
});

// Offline detection
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

function updateOnlineStatus() {
    const isOnline = navigator.onLine;
    document.body.classList.toggle('offline', !isOnline);
    
    if (!isOnline) {
        showError(document.getElementById('errorMsg'), 'You are currently offline. Some features may be unavailable.');
    }
}

// Initialize online status
updateOnlineStatus();
