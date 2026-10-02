// ============================================================
// SUPER ADMIN PROFILE MODULE — ENHANCED
// 2FA (otplib) + Login History + Supabase Sync
// Matches NCHSMLogin v5.2 architecture
// Wrapped in IIFE to avoid global name collisions
// ============================================================

(function () {
'use strict';

// ============================================================
// LOAD OTPLIB (same CDN as login system)
// ============================================================
(function loadOtplib() {
    if (typeof otplib !== 'undefined') return;
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/otplib@12.0.1/browser/otplib.min.js';
    script.onload = () => console.log('✅ otplib loaded (profile)');
    script.onerror = () => console.warn('⚠️ otplib CDN failed — 2FA verify will not work');
    document.head.appendChild(script);
})();

// ============================================================
// SHARED HELPERS (renamed to avoid clashing with script.js)
// ============================================================
function profileGetSupabase() {
    if (window.NCHSMLogin?.supabase) return window.NCHSMLogin.supabase;
    if (window.sb) return window.sb;
    if (window.supabaseClient) return window.supabaseClient;
    return null;
}

function profileGetCurrentUserId() {
    try {
        const p = JSON.parse(localStorage.getItem('userProfile') || 'null');
        if (p?.user_id) return p.user_id;
    } catch (e) {}
    return profileData.id;
}

function profileGetCurrentUserProfile() {
    try {
        return JSON.parse(localStorage.getItem('userProfile') || 'null') || {};
    } catch (e) {
        return {};
    }
}

function profileEscapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function profileGetBrowserName() {
    const ua = navigator.userAgent;
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Edg/')) return 'Edge';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
    return 'Unknown Browser';
}

function profileGetDeviceIcon(device) {
    if (!device) return 'fa-desktop';
    const d = device.toLowerCase();
    if (d.includes('mobile') || d.includes('phone')) return 'fa-mobile-alt';
    if (d.includes('tablet') || d.includes('ipad')) return 'fa-tablet-alt';
    if (d.includes('laptop') || d.includes('macbook')) return 'fa-laptop';
    return 'fa-desktop';
}

// ============================================================
// PROFILE DATA
// ============================================================
let profileData = {
    id: 'SA-001',
    name: 'Super Admin',
    email: 'admin@nchsm.ac.ke',
    phone: '+254 700 000 000',
    employeeId: 'SA-001',
    department: 'Administration',
    location: 'Nairobi, Kenya',
    role: 'superadmin',
    memberSince: '2024',
    avatarInitials: 'SA',
    lastLogin: new Date().toLocaleString(),
    actionsCount: 0,
    twoFactorEnabled: false,
    twoFactorVerified: false,
    twoFactorSecret: null,
    twoFactorBackupCodes: []
};

// ============================================================
// LOAD PROFILE DATA
// ============================================================
function loadProfileData() {
    console.log('📋 Loading profile data...');
    try {
        let user = null;

        try {
            const s = JSON.parse(sessionStorage.getItem('user') || 'null');
            if (s) user = s;
        } catch (e) {}

        if (!user) {
            try {
                const l = JSON.parse(localStorage.getItem('user') || 'null');
                if (l) user = l;
            } catch (e) {}
        }

        if (!user) {
            try {
                const s = JSON.parse(localStorage.getItem('supabase.auth.token') || 'null');
                if (s?.currentSession?.user) user = s.currentSession.user;
            } catch (e) {}
        }

        if (!user && window.currentUser) user = window.currentUser;

        if (!user && typeof getCurrentUser === 'function') {
            try { user = getCurrentUser(); } catch (e) {}
        }

        const loginProfile = profileGetCurrentUserProfile();

        if (!user && loginProfile?.user_id) {
            user = {
                id: loginProfile.user_id,
                user_id: loginProfile.user_id,
                email: loginProfile.email,
                full_name: loginProfile.full_name,
                role: loginProfile.role,
                staff_id: loginProfile.staff_id,
                department: loginProfile.program || loginProfile.department,
                two_factor_enabled: loginProfile.two_factor_enabled,
                two_factor_verified: loginProfile.two_factor_verified
            };
        }

        try {
            const saved2FA = JSON.parse(localStorage.getItem('twoFactorSettings') || 'null');
            if (saved2FA) {
                profileData.twoFactorEnabled = !!saved2FA.enabled;
                profileData.twoFactorSecret = saved2FA.secret || null;
                profileData.twoFactorBackupCodes = saved2FA.backupCodes || [];
            }
        } catch (e) {}

        if (!user) {
            try {
                const saved = JSON.parse(localStorage.getItem('profileData') || 'null');
                if (saved) {
                    profileData = { ...profileData, ...saved };
                    updateProfileUI();
                    loadRecentActivity();
                    loadLoginHistory();
                    loadProfileStats();
                    update2FAUI();
                    console.log('✅ Profile loaded from saved data:', profileData.name);
                    return;
                }
            } catch (e) {}
        }

        if (user) {
            const name =
                user.full_name ||
                user.user_metadata?.full_name ||
                user.email?.split('@')[0] ||
                'Super Admin';
            const email = user.email || 'admin@nchsm.ac.ke';

            profileData.email = email;
            profileData.name = name;
            profileData.avatarInitials = name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);

            if (user.id || user.user_id) profileData.id = user.id || user.user_id;
            if (user.staff_id || user.student_id) {
                profileData.employeeId = user.staff_id || user.student_id;
            }
            if (user.department) profileData.department = user.department;
            if (user.program && !user.department) profileData.department = user.program;
            if (user.role) profileData.role = user.role;
            if (user.phone) profileData.phone = user.phone;
            if (user.location) profileData.location = user.location;
            if (user.two_factor_enabled !== undefined) {
                profileData.twoFactorEnabled = !!user.two_factor_enabled;
            }
            if (user.two_factor_verified !== undefined) {
                profileData.twoFactorVerified = !!user.two_factor_verified;
            }

            localStorage.setItem('profileData', JSON.stringify(profileData));
        }

        updateProfileUI();
        loadRecentActivity();
        loadProfileStats();
        loadLoginHistory();
        update2FAUI();

        console.log('✅ Profile loaded:', profileData.name);
    } catch (error) {
        console.error('Error loading profile:', error);
        updateProfileUI();
        update2FAUI();
    }
}

// ============================================================
// UPDATE PROFILE UI
// ============================================================
function updateProfileUI() {
    const elements = {
        profileDisplayName: profileData.name,
        profileEmail: profileData.email,
        profileFullName: profileData.name,
        profileFullEmail: profileData.email,
        profilePhone: profileData.phone || 'Not set',
        profileEmployeeId: profileData.employeeId || 'Not set',
        profileDepartment: profileData.department || 'Not set',
        profileLocation: profileData.location || 'Not set',
        profileStatRole: 'Super Admin',
        profileStatMemberSince: profileData.memberSince || '2024',
        profileLastLogin: profileData.lastLogin || 'Just now'
    };

    Object.keys(elements).forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.textContent = elements[id];
    });

    const avatarText = document.getElementById('profileAvatarText');
    if (avatarText) avatarText.textContent = profileData.avatarInitials || 'SA';

    const editAvatarText = document.getElementById('editProfileAvatarText');
    if (editAvatarText) editAvatarText.textContent = profileData.avatarInitials || 'SA';

    const fields = {
        editProfileName: profileData.name,
        editProfileEmail: profileData.email,
        editProfilePhone: profileData.phone || '',
        editProfileEmployeeId: profileData.employeeId || '',
        editProfileDepartment: profileData.department || 'Administration',
        editProfileLocation: profileData.location || ''
    };

    Object.keys(fields).forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = fields[id];
    });

    const statActions = document.getElementById('profileStatActions');
    if (statActions) statActions.textContent = profileData.actionsCount || 0;
}

// ============================================================
// LOAD PROFILE STATS
// ============================================================
function loadProfileStats() {
    try {
        const supabase = profileGetSupabase();
        if (!supabase) return;

        supabase
            .from('audit_logs')
            .select('*', { count: 'exact', head: true })
            .eq('user_email', profileData.email)
            .then(({ count, error }) => {
                if (!error && count !== null) {
                    profileData.actionsCount = count;
                    const statActions = document.getElementById('profileStatActions');
                    if (statActions) statActions.textContent = count;
                }
            })
            .catch(() => {});
    } catch (error) {
        console.warn('Error loading profile stats:', error);
    }
}

// ============================================================
// 2FA — otplib + Supabase (matches login system)
// ============================================================

async function profileFetch2FAStatus() {
    const supabase = profileGetSupabase();
    const userId = profileGetCurrentUserId();
    if (!supabase || !userId || userId === 'SA-001') return null;

    try {
        const { data, error } = await supabase
            .from('consolidated_user_profiles_table')
            .select(
                'two_factor_enabled, two_factor_secret, two_factor_verified, two_factor_setup_date'
            )
            .eq('user_id', userId)
            .maybeSingle();

        if (error) {
            console.warn('2FA fetch error:', error.message);
            return null;
        }
        return data;
    } catch (e) {
        console.warn('2FA fetch exception:', e);
        return null;
    }
}

async function update2FAUI() {
    const statusEl = document.getElementById('twoFactorStatus');
    const toggleBtn = document.getElementById('twoFactorToggleBtn');
    const setupSection = document.getElementById('twoFactorSetupSection');
    const enabledSection = document.getElementById('twoFactorEnabledSection');
    const setupDateEl = document.getElementById('twoFactorSetupDate');

    const remote = await profileFetch2FAStatus();
    const enabled = remote
        ? !!remote.two_factor_enabled
        : !!profileData.twoFactorEnabled;

    profileData.twoFactorEnabled = enabled;
    if (remote) {
        profileData.twoFactorSecret = remote.two_factor_secret || profileData.twoFactorSecret;
        profileData.twoFactorVerified = !!remote.two_factor_verified;
    }

    if (statusEl) {
        statusEl.textContent = enabled ? 'Enabled' : 'Disabled';
        statusEl.style.color = enabled ? '#10b981' : '#dc2626';
    }

    if (toggleBtn) {
        toggleBtn.textContent = enabled ? 'Disable 2FA' : 'Enable 2FA';
        toggleBtn.style.background = enabled ? '#dc2626' : '#10b981';
        toggleBtn.onclick = enabled ? disable2FA : show2FASetupModal;
    }

    if (setupSection) setupSection.style.display = enabled ? 'none' : 'block';
    if (enabledSection) enabledSection.style.display = enabled ? 'block' : 'none';

    if (setupDateEl && remote?.two_factor_setup_date) {
        setupDateEl.textContent = 'Enabled on ' + new Date(remote.two_factor_setup_date).toLocaleString();
    }
}

async function profileGenerate2FASecret() {
    const supabase = profileGetSupabase();
    const userId = profileGetCurrentUserId();

    let secret;
    if (typeof otplib !== 'undefined' && typeof otplib.generateSecret === 'function') {
        secret = otplib.generateSecret();
    } else {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        secret = '';
        for (let i = 0; i < 32; i++) {
            secret += chars.charAt(Math.floor(Math.random() * chars.length));
        }
    }

    if (supabase && userId && userId !== 'SA-001') {
        const { error } = await supabase
            .from('consolidated_user_profiles_table')
            .update({
                two_factor_secret: secret,
                two_factor_enabled: false,
                two_factor_verified: false,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);

        if (error) console.warn('Could not save 2FA secret:', error.message);
    }

    return secret;
}

async function profileVerifyTOTP(secret, token) {
    try {
        if (typeof otplib === 'undefined' || typeof otplib.verify !== 'function') {
            console.error('OTPLib unavailable — cannot verify TOTP');
            return false;
        }
        const result = await otplib.verify({ secret, token });
        return result === true || result?.valid === true;
    } catch (error) {
        console.error('Error verifying TOTP:', error);
        return false;
    }
}

async function show2FASetupModal() {
    const supabase = profileGetSupabase();
    const userId = profileGetCurrentUserId();
    const userEmail = profileData.email;

    let secret = profileData.twoFactorSecret;
    if (supabase && userId && userId !== 'SA-001') {
        const remote = await profileFetch2FAStatus();
        if (remote?.two_factor_secret) secret = remote.two_factor_secret;
    }

    if (!secret) secret = await profileGenerate2FASecret();

    if (!secret) {
        if (typeof showFeedback === 'function') {
            showFeedback('Could not generate 2FA secret', 'error');
        } else {
            alert('Could not generate 2FA secret');
        }
        return;
    }

    profileData.twoFactorSecret = secret;

    const appName = 'NCHSM Portal';
    const otpauth = `otpauth://totp/${encodeURIComponent(appName)}:${encodeURIComponent(
        userEmail
    )}?secret=${secret}&issuer=${encodeURIComponent(appName)}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
        otpauth
    )}`;

    let modal = document.getElementById('twoFactorModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'twoFactorModal';
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            display: none; position: fixed; inset: 0;
            background: rgba(0,0,0,0.55); z-index: 10000;
            justify-content: center; align-items: center; padding: 20px;
        `;
        modal.innerHTML = `
            <div style="background:white;border-radius:16px;padding:28px;max-width:480px;width:100%;max-height:92vh;overflow-y:auto;position:relative;box-shadow:0 25px 50px rgba(0,0,0,0.25);">
                <button onclick="close2FAModal()" style="position:absolute;top:14px;right:14px;background:none;border:none;font-size:22px;cursor:pointer;color:#94a3b8;line-height:1;">&times;</button>
                <div id="twoFactorModalContent"></div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    const content = document.getElementById('twoFactorModalContent');
    const formattedSecret = secret.replace(/(.{4})/g, '$1 ').trim();

    content.innerHTML = `
        <div style="text-align:center;margin-bottom:18px;">
            <div style="width:56px;height:56px;border-radius:50%;background:#f3e8ff;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;">
                <i class="fas fa-shield-alt" style="font-size:26px;color:#7c3aed;"></i>
            </div>
            <h2 style="font-size:19px;font-weight:600;color:#1e293b;margin:0 0 4px;">Set Up Two-Factor Authentication</h2>
            <p style="font-size:13px;color:#64748b;margin:0;">Scan the QR code with your authenticator app</p>
        </div>

        <div style="text-align:center;margin-bottom:16px;">
            <img src="${qrUrl}" alt="QR Code"
                 style="width:200px;height:200px;border:1px solid #e2e8f0;border-radius:12px;padding:8px;background:#fff;">
        </div>

        <div style="background:#f8fafc;border-radius:10px;padding:12px;margin-bottom:16px;">
            <p style="font-size:11px;color:#64748b;margin:0 0 6px;font-weight:600;letter-spacing:0.5px;">MANUAL ENTRY KEY</p>
            <div style="display:flex;align-items:center;gap:8px;">
                <code id="secretKeyDisplay" style="flex:1;background:#fff;padding:8px 10px;border-radius:6px;font-size:12px;letter-spacing:1.5px;color:#1e293b;border:1px solid #e2e8f0;word-break:break-all;">${formattedSecret}</code>
                <button onclick="copySecretKey('${secret}')" style="background:#4C1D95;color:#fff;border:none;padding:8px 12px;border-radius:6px;cursor:pointer;font-size:12px;">
                    <i class="fas fa-copy"></i>
                </button>
            </div>
        </div>

        <div style="margin-bottom:14px;">
            <label style="font-size:13px;font-weight:500;color:#1e293b;display:block;margin-bottom:8px;">
                Enter the 6-digit code from your app:
            </label>
            <div style="display:flex;gap:8px;justify-content:center;" id="setupOtpRow">
                ${Array.from({ length: 6 }, (_, i) => `
                    <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]"
                        class="setup-otp" data-index="${i}"
                        style="width:44px;height:52px;text-align:center;font-size:22px;font-weight:600;font-family:monospace;border:2px solid #e2e8f0;border-radius:10px;outline:none;transition:border-color 0.2s;">
                `).join('')}
            </div>
            <div id="twoFactorError" style="display:none;color:#dc2626;font-size:12px;margin-top:8px;text-align:center;"></div>
        </div>

        <div style="display:flex;gap:10px;">
            <button onclick="close2FAModal()" style="flex:1;padding:11px;border:1px solid #e2e8f0;background:#fff;border-radius:10px;cursor:pointer;font-size:13px;color:#64748b;">
                Cancel
            </button>
            <button id="verifyEnableBtn" onclick="verifyAndEnable2FA()" style="flex:2;padding:11px;border:none;background:#4C1D95;color:#fff;border-radius:10px;cursor:pointer;font-size:13px;font-weight:600;">
                <i class="fas fa-check-circle"></i> Verify & Enable
            </button>
        </div>

        <div style="margin-top:14px;padding:10px 12px;background:#fef3c7;border-radius:8px;">
            <p style="font-size:11px;color:#92400e;margin:0;line-height:1.5;">
                <i class="fas fa-info-circle"></i>
                Don't have an authenticator? Get <strong>Google Authenticator</strong>, <strong>Authy</strong>, or <strong>Microsoft Authenticator</strong>.
            </p>
        </div>
    `;

    sessionStorage.setItem('2fa_setup_secret', secret);
    sessionStorage.setItem('2fa_setup_user', userId || '');

    modal.style.display = 'flex';
    profileWireSetupOtpInputs();

    if (typeof trackGALogin === 'function') {
        trackGALogin('2fa_setup_started', {
            event_category: 'Security',
            user_id: userId
        });
    }
}

function profileWireSetupOtpInputs() {
    const inputs = document.querySelectorAll('#twoFactorModal .setup-otp');
    inputs.forEach((input, index) => {
        input.addEventListener('input', function () {
            this.value = this.value.replace(/[^0-9]/g, '');
            this.style.borderColor = this.value ? '#4C1D95' : '#e2e8f0';
            if (this.value.length === 1 && index < inputs.length - 1) {
                inputs[index + 1].focus();
            }
            const allFilled = Array.from(inputs).every((inp) => inp.value.length === 1);
            if (allFilled) setTimeout(() => verifyAndEnable2FA(), 300);
        });

        input.addEventListener('keydown', function (e) {
            if (e.key === 'Backspace' && !this.value && index > 0) {
                inputs[index - 1].focus();
                inputs[index - 1].value = '';
                inputs[index - 1].style.borderColor = '#e2e8f0';
            }
            if (e.key === 'ArrowLeft' && index > 0) inputs[index - 1].focus();
            if (e.key === 'ArrowRight' && index < inputs.length - 1) inputs[index + 1].focus();
            if (e.key === 'Enter') {
                e.preventDefault();
                verifyAndEnable2FA();
            }
        });

        input.addEventListener('paste', function (e) {
            const paste = (e.clipboardData || window.clipboardData).getData('text');
            if (paste && /^\d{6}$/.test(paste)) {
                e.preventDefault();
                inputs.forEach((inp, i) => {
                    inp.value = paste[i] || '';
                    inp.style.borderColor = inp.value ? '#4C1D95' : '#e2e8f0';
                });
                setTimeout(() => verifyAndEnable2FA(), 300);
            }
        });

        input.addEventListener('focus', function () {
            this.select();
        });
    });

    setTimeout(() => inputs[0]?.focus(), 150);
}

async function verifyAndEnable2FA() {
    const inputs = document.querySelectorAll('#twoFactorModal .setup-otp');
    let code = '';
    inputs.forEach((inp) => (code += inp.value));

    const errorEl = document.getElementById('twoFactorError');
    const verifyBtn = document.getElementById('verifyEnableBtn');

    if (code.length !== 6) {
        if (errorEl) {
            errorEl.textContent = 'Please enter all 6 digits';
            errorEl.style.display = 'block';
        }
        return;
    }

    const supabase = profileGetSupabase();
    const userId = profileGetCurrentUserId();
    let secret = sessionStorage.getItem('2fa_setup_secret') || profileData.twoFactorSecret;

    if (!secret && supabase && userId && userId !== 'SA-001') {
        const remote = await profileFetch2FAStatus();
        secret = remote?.two_factor_secret;
    }

    if (!secret) {
        if (errorEl) {
            errorEl.textContent = 'No 2FA secret found. Close and reopen.';
            errorEl.style.display = 'block';
        }
        return;
    }

    const originalText = verifyBtn?.innerHTML;
    if (verifyBtn) {
        verifyBtn.disabled = true;
        verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
    }

    const isValid = await profileVerifyTOTP(secret, code);

    if (!isValid) {
        if (errorEl) {
            errorEl.textContent = 'Invalid code. Check your device clock and try again.';
            errorEl.style.display = 'block';
        }
        inputs.forEach((inp) => {
            inp.value = '';
            inp.style.borderColor = '#e2e8f0';
        });
        inputs[0]?.focus();

        if (verifyBtn) {
            verifyBtn.disabled = false;
            verifyBtn.innerHTML = originalText;
        }

        if (typeof trackGALogin === 'function') {
            trackGALogin('2fa_setup_failed', {
                event_category: 'Security',
                user_id: userId
            });
        }
        return;
    }

    const updatePayload = {
        two_factor_enabled: true,
        two_factor_verified: true,
        two_factor_setup_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    if (supabase && userId && userId !== 'SA-001') {
        const { error } = await supabase
            .from('consolidated_user_profiles_table')
            .update(updatePayload)
            .eq('user_id', userId);

        if (error) {
            console.error('Failed to enable 2FA in DB:', error);
            if (errorEl) {
                errorEl.textContent = 'Could not save 2FA settings. Please try again.';
                errorEl.style.display = 'block';
            }
            if (verifyBtn) {
                verifyBtn.disabled = false;
                verifyBtn.innerHTML = originalText;
            }
            return;
        }
    }

    profileData.twoFactorEnabled = true;
    profileData.twoFactorVerified = true;

    const settings = {
        enabled: true,
        secret: profileData.twoFactorSecret,
        backupCodes: profileData.twoFactorBackupCodes || [],
        enabledAt: new Date().toISOString()
    };
    localStorage.setItem('twoFactorSettings', JSON.stringify(settings));
    localStorage.setItem('profileData', JSON.stringify(profileData));

    if (typeof trackGALogin === 'function') {
        trackGALogin('2fa_enabled', {
            event_category: 'Security',
            user_id: userId
        });
    }

    profileShow2FASuccessScreen();
    update2FAUI();

    if (typeof showFeedback === 'function') {
        showFeedback('✅ Two-factor authentication enabled!', 'success');
    }
}

function profileShow2FASuccessScreen() {
    const content = document.getElementById('twoFactorModalContent');
    if (!content) return;

    const backupCodes = [];
    for (let i = 0; i < 8; i++) {
        let code = '';
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        for (let j = 0; j < 8; j++) code += chars.charAt(Math.floor(Math.random() * chars.length));
        backupCodes.push(code.slice(0, 4) + '-' + code.slice(4));
    }

    profileData.twoFactorBackupCodes = backupCodes;
    localStorage.setItem('twoFactorBackupCodes', JSON.stringify(backupCodes));

    const supabase = profileGetSupabase();
    const userId = profileGetCurrentUserId();
    if (supabase && userId && userId !== 'SA-001') {
        supabase
            .from('consolidated_user_profiles_table')
            .update({ two_factor_backup_codes: backupCodes })
            .eq('user_id', userId)
            .then(() => {})
            .catch(() => {});
    }

    content.innerHTML = `
        <div style="text-align:center;margin-bottom:18px;">
            <div style="width:56px;height:56px;border-radius:50%;background:#ecfdf5;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;">
                <i class="fas fa-check-circle" style="font-size:28px;color:#10b981;"></i>
            </div>
            <h2 style="font-size:19px;font-weight:600;color:#1e293b;margin:0 0 4px;">2FA Enabled Successfully</h2>
            <p style="font-size:13px;color:#64748b;margin:0;">Save your backup codes in a safe place</p>
        </div>

        <div style="background:#fef3c7;border-radius:10px;padding:12px;margin-bottom:16px;">
            <p style="font-size:12px;color:#92400e;margin:0;line-height:1.5;">
                <i class="fas fa-exclamation-triangle"></i>
                Each code can be used once. If you lose your device, you'll need these to sign in.
            </p>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;">
            ${backupCodes.map((c) => `
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:9px;text-align:center;">
                    <code style="font-family:monospace;font-size:13px;letter-spacing:1.5px;color:#1e293b;">${c}</code>
                </div>
            `).join('')}
        </div>

        <div style="display:flex;gap:8px;margin-bottom:12px;">
            <button onclick="profileCopyBackupCodes()" style="flex:1;padding:11px;border:1px solid #e2e8f0;background:#fff;border-radius:10px;cursor:pointer;font-size:13px;color:#4C1D95;">
                <i class="fas fa-copy"></i> Copy Codes
            </button>
            <button onclick="profileDownloadBackupCodes()" style="flex:1;padding:11px;border:1px solid #e2e8f0;background:#fff;border-radius:10px;cursor:pointer;font-size:13px;color:#4C1D95;">
                <i class="fas fa-download"></i> Download
            </button>
        </div>

        <button onclick="close2FAModal()" style="width:100%;padding:12px;border:none;background:#4C1D95;color:#fff;border-radius:10px;cursor:pointer;font-size:13px;font-weight:600;">
            <i class="fas fa-check"></i> I've Saved My Codes
        </button>
    `;
}

function copySecretKey(secret) {
    navigator.clipboard
        .writeText(secret)
        .then(() => {
            if (typeof showFeedback === 'function') showFeedback('Secret copied', 'success');
        })
        .catch(() => {
            const ta = document.createElement('textarea');
            ta.value = secret;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
            if (typeof showFeedback === 'function') showFeedback('Secret copied', 'success');
        });
}

function profileCopyBackupCodes() {
    const codes = profileData.twoFactorBackupCodes || [];
    navigator.clipboard
        .writeText(codes.join('\n'))
        .then(() => {
            if (typeof showFeedback === 'function') showFeedback('Backup codes copied', 'success');
        })
        .catch(() => {
            const ta = document.createElement('textarea');
            ta.value = codes.join('\n');
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
            if (typeof showFeedback === 'function') showFeedback('Backup codes copied', 'success');
        });
}

function profileDownloadBackupCodes() {
    const codes = profileData.twoFactorBackupCodes || [];
    const text = `NCHSM Portal — 2FA Backup Codes
Generated: ${new Date().toLocaleString()}
Email: ${profileData.email}

${codes.join('\n')}

Keep these safe. Each code works once.`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `2fa-backup-codes-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    if (typeof showFeedback === 'function') showFeedback('Backup codes downloaded', 'success');
}

async function disable2FA() {
    if (
        !confirm(
            'Are you sure you want to disable two-factor authentication? This will make your account less secure.'
        )
    )
        return;

    const supabase = profileGetSupabase();
    const userId = profileGetCurrentUserId();

    if (supabase && userId && userId !== 'SA-001') {
        const { error } = await supabase
            .from('consolidated_user_profiles_table')
            .update({
                two_factor_enabled: false,
                two_factor_secret: null,
                two_factor_verified: false,
                two_factor_backup_codes: null,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);

        if (error) {
            console.error('Failed to disable 2FA:', error);
            if (typeof showFeedback === 'function')
                showFeedback('Could not disable 2FA. Try again.', 'error');
            return;
        }
    }

    profileData.twoFactorEnabled = false;
    profileData.twoFactorVerified = false;
    profileData.twoFactorSecret = null;
    profileData.twoFactorBackupCodes = [];

    localStorage.removeItem('twoFactorSettings');
    localStorage.removeItem('twoFactorBackupCodes');
    localStorage.setItem('profileData', JSON.stringify(profileData));

    update2FAUI();

    if (typeof trackGALogin === 'function') {
        trackGALogin('2fa_disabled', {
            event_category: 'Security',
            user_id: userId
        });
    }

    if (typeof showFeedback === 'function') showFeedback('2FA disabled', 'info');
}

function close2FAModal() {
    const modal = document.getElementById('twoFactorModal');
    if (modal) modal.style.display = 'none';
}

// ============================================================
// LOGIN HISTORY
// ============================================================
function loadLoginHistory() {
    let container = document.getElementById('loginHistoryContainer');
    const listContainer = document.getElementById('loginHistoryList');

    if (!container || !listContainer) {
        console.warn('Login history container missing in HTML');
        return;
    }

    listContainer.innerHTML = `
        <div style="text-align: center; color: #94a3b8; padding: 20px;">
            <i class="fas fa-spinner fa-spin"></i> Loading login history...
        </div>
    `;

    try {
        const supabase = profileGetSupabase();
        if (supabase) {
            supabase
                .from('user_sessions')
                .select('login_time, device_info, ip_address, login_type, is_active, user_agent')
                .eq('user_id', profileGetCurrentUserId())
                .order('login_time', { ascending: false })
                .limit(20)
                .then(({ data, error }) => {
                    if (!error && data && data.length > 0) {
                        renderLoginHistory(
                            data.map((d) => ({
                                login_time: d.login_time,
                                ip_address: d.ip_address,
                                device: d.device_info || profileParseDeviceFromUA(d.user_agent),
                                browser: profileExtractBrowser(d.device_info || d.user_agent),
                                status: 'SUCCESS',
                                location: '—',
                                login_type: d.login_type
                            }))
                        );
                    } else {
                        profileLoadLocalLoginHistory();
                    }
                })
                .catch(() => profileLoadLocalLoginHistory());
        } else {
            profileLoadLocalLoginHistory();
        }
    } catch (e) {
        profileLoadLocalLoginHistory();
    }
}

function profileParseDeviceFromUA(ua) {
    if (!ua) return 'Unknown';
    const isMobile = /Mobile/i.test(ua);
    const isTablet = /Tablet/i.test(ua);
    return isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop';
}

function profileExtractBrowser(deviceInfo) {
    if (!deviceInfo) return 'Unknown';
    const s = String(deviceInfo);
    if (/Edg\//i.test(s)) return 'Edge';
    if (/Chrome\//i.test(s)) return 'Chrome';
    if (/Firefox\//i.test(s)) return 'Firefox';
    if (/Safari\//i.test(s)) return 'Safari';
    const m = s.match(/^([A-Za-z]+)/);
    return m ? m[1] : 'Unknown';
}

function profileLoadLocalLoginHistory() {
    let history = [];
    try {
        history = JSON.parse(localStorage.getItem('loginHistory') || '[]');
    } catch (e) {
        history = [];
    }

    if (history.length === 0) {
        history = [
            {
                login_time: new Date().toISOString(),
                ip_address: '—',
                device: navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop',
                browser: profileGetBrowserName(),
                status: 'SUCCESS',
                location: 'Nairobi, Kenya'
            }
        ];
        localStorage.setItem('loginHistory', JSON.stringify(history));
    }

    renderLoginHistory(history);
}

function renderLoginHistory(history) {
    const container = document.getElementById('loginHistoryList');
    if (!container) return;

    if (!history || history.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;color:#94a3b8;padding:20px;">
                <i class="fas fa-history" style="font-size:24px;display:block;margin-bottom:8px;"></i>
                No login history available
            </div>`;
        return;
    }

    container.innerHTML = history
        .map((entry, index) => {
            const time = entry.login_time
                ? new Date(entry.login_time).toLocaleString()
                : 'Unknown';
            const isSuccess = entry.status === 'SUCCESS';
            const statusColor = isSuccess ? '#10b981' : '#dc2626';
            const statusIcon = isSuccess ? 'fa-check-circle' : 'fa-times-circle';
            const statusText = isSuccess ? 'Successful' : 'Failed';
            const deviceIcon = profileGetDeviceIcon(entry.device);
            const browserName = entry.browser || profileGetBrowserName();

            return `
            <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #f1f5f9;${
                index === history.length - 1 ? 'border-bottom:none;' : ''
            }">
                <div style="width:36px;height:36px;border-radius:50%;background:${
                    isSuccess ? '#ecfdf5' : '#fef2f2'
                };display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <i class="fas ${deviceIcon}" style="color:${statusColor};font-size:14px;"></i>
                </div>
                <div style="flex:1;min-width:0;">
                    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                        <span style="font-size:13px;font-weight:500;color:#1e293b;">${profileEscapeHtml(
                            entry.device || 'Unknown Device'
                        )}</span>
                        <span style="font-size:11px;color:#64748b;">• ${profileEscapeHtml(browserName)}</span>
                        <span style="font-size:10px;padding:2px 6px;border-radius:10px;background:${
                            isSuccess ? '#ecfdf5' : '#fef2f2'
                        };color:${statusColor};font-weight:500;">
                            <i class="fas ${statusIcon}" style="font-size:9px;"></i> ${statusText}
                        </span>
                    </div>
                    <div style="display:flex;align-items:center;gap:12px;margin-top:2px;flex-wrap:wrap;">
                        <span style="font-size:11px;color:#94a3b8;">
                            <i class="fas fa-clock" style="font-size:10px;"></i> ${time}
                        </span>
                        <span style="font-size:11px;color:#94a3b8;">
                            <i class="fas fa-map-marker-alt" style="font-size:10px;"></i> ${profileEscapeHtml(
                                entry.location || 'Unknown'
                            )}
                        </span>
                        <span style="font-size:11px;color:#94a3b8;">
                            <i class="fas fa-network-wired" style="font-size:10px;"></i> ${profileEscapeHtml(
                                entry.ip_address || 'N/A'
                            )}
                        </span>
                    </div>
                </div>
            </div>`;
        })
        .join('');
}

function logLoginAttempt(status, details = {}) {
    const entry = {
        user_email: profileData.email,
        login_time: new Date().toISOString(),
        ip_address: details.ip || '—',
        device:
            details.device ||
            (navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'),
        browser: profileGetBrowserName(),
        status: status,
        location: details.location || 'Nairobi, Kenya',
        user_agent: navigator.userAgent
    };

    try {
        const history = JSON.parse(localStorage.getItem('loginHistory') || '[]');
        history.unshift(entry);
        if (history.length > 50) history.length = 50;
        localStorage.setItem('loginHistory', JSON.stringify(history));
    } catch (e) {}

    return entry;
}

function clearLoginHistory() {
    if (!confirm('Are you sure you want to clear your login history?')) return;

    localStorage.removeItem('loginHistory');

    const supabase = profileGetSupabase();
    const userId = profileGetCurrentUserId();
    if (supabase && userId && userId !== 'SA-001') {
        supabase
            .from('user_sessions')
            .delete()
            .eq('user_id', userId)
            .then(() => {})
            .catch(() => {});
    }

    const container = document.getElementById('loginHistoryList');
    if (container) {
        container.innerHTML = `
            <div style="text-align:center;color:#94a3b8;padding:20px;">
                <i class="fas fa-check-circle" style="color:#10b981;font-size:24px;display:block;margin-bottom:8px;"></i>
                Login history cleared
            </div>`;
    }

    if (typeof showFeedback === 'function') showFeedback('Login history cleared', 'success');
}

// ============================================================
// RECENT ACTIVITY
// ============================================================
function loadRecentActivity() {
    const container = document.getElementById('profileRecentActivity');
    if (!container) return;

    const supabase = profileGetSupabase();
    if (!supabase) {
        container.innerHTML = `
            <div style="text-align:center;color:#94a3b8;padding:20px;">
                <i class="fas fa-inbox" style="font-size:24px;display:block;margin-bottom:8px;"></i>
                No recent activity
            </div>`;
        return;
    }

    supabase
        .from('audit_logs')
        .select('*')
        .eq('user_email', profileData.email)
        .order('timestamp', { ascending: false })
        .limit(5)
        .then(({ data: actions, error }) => {
            if (error || !actions || actions.length === 0) {
                container.innerHTML = `
                    <div style="text-align:center;color:#94a3b8;padding:20px;">
                        <i class="fas fa-inbox" style="font-size:24px;display:block;margin-bottom:8px;"></i>
                        No recent activity
                    </div>`;
                return;
            }

            container.innerHTML = actions
                .map((action) => {
                    const time = action.timestamp
                        ? new Date(action.timestamp).toLocaleString()
                        : '';
                    const icon = profileGetActionIcon(action.action_type);
                    const color = profileGetActionColor(action.action_type);
                    const statusColor = action.status === 'SUCCESS' ? '#10b981' : '#dc2626';
                    const statusText = action.status === 'SUCCESS' ? '✅' : '❌';

                    return `
                    <div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid #f1f5f9;">
                        <div style="width:30px;height:30px;border-radius:50%;background:${color}20;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                            <i class="fas ${icon}" style="color:${color};font-size:12px;"></i>
                        </div>
                        <div style="flex:1;min-width:0;">
                            <div style="font-size:12px;color:#1e293b;font-weight:500;">
                                ${profileEscapeHtml(action.action_type || 'Activity')}
                                <span style="font-weight:400;color:#94a3b8;font-size:11px;">
                                    ${profileEscapeHtml(action.details || '').substring(0, 30)}
                                </span>
                                <span style="color:${statusColor};font-size:10px;">${statusText}</span>
                            </div>
                            <div style="font-size:10px;color:#94a3b8;">${time}</div>
                        </div>
                    </div>`;
                })
                .join('');
        })
        .catch(() => {
            container.innerHTML = `
                <div style="text-align:center;color:#94a3b8;padding:20px;">
                    <i class="fas fa-exclamation-circle"></i> Could not load activity
                </div>`;
        });
}

// ============================================================
// HELPERS
// ============================================================
function profileGetActionColor(action) {
    const colors = {
        LOGIN: '#10b981',
        LOGOUT: '#6b7280',
        USER_CREATED: '#3b82f6',
        USER_UPDATED: '#f59e0b',
        USER_DELETED: '#ef4444',
        MARKS_ENTRY: '#8b5cf6',
        MARKS_APPROVED: '#059669',
        RESOURCE_UPLOADED: '#ec4899',
        SYSTEM_MAINTENANCE: '#f59e0b',
        ADMIN_ACTION: '#4C1D95',
        USER_ENROLL: '#10b981',
        '2FA_ENABLED': '#7c3aed',
        '2FA_DISABLED': '#dc2626'
    };
    return colors[action] || '#4C1D95';
}

function profileGetActionIcon(action) {
    const icons = {
        LOGIN: 'fa-sign-in-alt',
        LOGOUT: 'fa-sign-out-alt',
        USER_CREATED: 'fa-user-plus',
        USER_UPDATED: 'fa-user-edit',
        USER_DELETED: 'fa-user-minus',
        MARKS_ENTRY: 'fa-pen',
        MARKS_APPROVED: 'fa-check-double',
        RESOURCE_UPLOADED: 'fa-upload',
        SYSTEM_MAINTENANCE: 'fa-tools',
        ADMIN_ACTION: 'fa-shield-alt',
        USER_ENROLL: 'fa-user-graduate',
        '2FA_ENABLED': 'fa-shield-alt',
        '2FA_DISABLED': 'fa-shield-alt'
    };
    return icons[action] || 'fa-circle';
}

// ============================================================
// EDIT PROFILE
// ============================================================
function showEditProfileModal() {
    const modal = document.getElementById('editProfileModal');
    if (!modal) {
        console.warn('editProfileModal not found');
        return;
    }

    const nameEl = document.getElementById('editProfileName');
    const emailEl = document.getElementById('editProfileEmail');
    const phoneEl = document.getElementById('editProfilePhone');
    const empEl = document.getElementById('editProfileEmployeeId');
    const deptEl = document.getElementById('editProfileDepartment');
    const locEl = document.getElementById('editProfileLocation');

    if (nameEl) nameEl.value = profileData.name;
    if (emailEl) emailEl.value = profileData.email;
    if (phoneEl) phoneEl.value = profileData.phone || '';
    if (empEl) empEl.value = profileData.employeeId || '';
    if (deptEl) deptEl.value = profileData.department || 'Administration';
    if (locEl) locEl.value = profileData.location || '';

    modal.style.display = 'flex';
}

function closeEditProfileModal() {
    const modal = document.getElementById('editProfileModal');
    if (modal) modal.style.display = 'none';
}

function saveProfileChanges() {
    const nameEl = document.getElementById('editProfileName');
    const emailEl = document.getElementById('editProfileEmail');
    const phoneEl = document.getElementById('editProfilePhone');
    const empEl = document.getElementById('editProfileEmployeeId');
    const deptEl = document.getElementById('editProfileDepartment');
    const locEl = document.getElementById('editProfileLocation');

    const name = nameEl?.value.trim() || '';
    const email = emailEl?.value.trim() || '';
    const phone = phoneEl?.value.trim() || '';
    const employeeId = empEl?.value.trim() || '';
    const department = deptEl?.value || 'Administration';
    const location = locEl?.value.trim() || '';

    if (!name || !email) {
        if (typeof showFeedback === 'function') showFeedback('Name and email are required', 'error');
        else alert('Name and email are required');
        return;
    }

    try {
        const supabase = profileGetSupabase();
        const userId = profileGetCurrentUserId();
        if (supabase && userId && userId !== 'SA-001') {
            supabase
                .from('consolidated_user_profiles_table')
                .update({
                    full_name: name,
                    email: email,
                    phone: phone,
                    department: department,
                    location: location,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .then(({ error }) => {
                    if (error) console.warn('Database update failed:', error);
                })
                .catch(() => {});
        }

        profileData.name = name;
        profileData.email = email;
        profileData.phone = phone;
        profileData.employeeId = employeeId;
        profileData.department = department;
        profileData.location = location;
        profileData.avatarInitials = name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

        localStorage.setItem('profileData', JSON.stringify(profileData));
        updateProfileUI();
        closeEditProfileModal();

        if (typeof showFeedback === 'function') showFeedback('Profile updated successfully!', 'success');
    } catch (error) {
        console.error('Error saving profile:', error);
        if (typeof showFeedback === 'function')
            showFeedback('Error saving profile: ' + error.message, 'error');
    }
}

// ============================================================
// CHANGE PASSWORD
// ============================================================
function changePassword() {
    const modal = document.getElementById('changePasswordModal');
    if (modal) {
        modal.style.display = 'flex';
        const cp = document.getElementById('currentPassword');
        const np = document.getElementById('newPassword');
        const cf = document.getElementById('confirmPassword');
        const fb = document.getElementById('passwordFeedback');
        if (cp) cp.value = '';
        if (np) np.value = '';
        if (cf) cf.value = '';
        if (fb) fb.style.display = 'none';
    }
}

function closeChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    if (modal) modal.style.display = 'none';
}

function handlePasswordChange() {
    const current = document.getElementById('currentPassword')?.value || '';
    const newPass = document.getElementById('newPassword')?.value || '';
    const confirm = document.getElementById('confirmPassword')?.value || '';
    const feedback = document.getElementById('passwordFeedback');

    if (!feedback) return;

    if (!current) {
        feedback.textContent = 'Please enter your current password';
        feedback.style.background = '#fee2e2';
        feedback.style.color = '#991b1b';
        feedback.style.display = 'block';
        return;
    }

    if (newPass.length < 6) {
        feedback.textContent = 'New password must be at least 6 characters';
        feedback.style.background = '#fee2e2';
        feedback.style.color = '#991b1b';
        feedback.style.display = 'block';
        return;
    }

    if (newPass !== confirm) {
        feedback.textContent = 'Passwords do not match';
        feedback.style.background = '#fee2e2';
        feedback.style.color = '#991b1b';
        feedback.style.display = 'block';
        return;
    }

    const submitBtn = document.querySelector('#changePasswordForm button[type="submit"]');
    const originalText = submitBtn?.textContent || 'Update Password';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Updating...';
    }

    const supabase = profileGetSupabase();
    if (supabase?.auth?.updateUser) {
        supabase.auth
            .updateUser({ password: newPass })
            .then(({ error }) => {
                if (error) {
                    feedback.textContent = '❌ ' + error.message;
                    feedback.style.background = '#fee2e2';
                    feedback.style.color = '#991b1b';
                    feedback.style.display = 'block';
                } else {
                    feedback.textContent = '✅ Password changed successfully!';
                    feedback.style.background = '#d1fae5';
                    feedback.style.color = '#065f46';
                    feedback.style.display = 'block';
                    if (typeof showFeedback === 'function')
                        showFeedback('Password changed successfully!', 'success');
                    setTimeout(() => closeChangePasswordModal(), 1500);
                }
            })
            .catch((err) => {
                feedback.textContent = '❌ ' + err.message;
                feedback.style.background = '#fee2e2';
                feedback.style.color = '#991b1b';
                feedback.style.display = 'block';
            })
            .finally(() => {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            });
    } else {
        feedback.textContent = '✅ Password update request sent. Check your email.';
        feedback.style.background = '#dbeafe';
        feedback.style.color = '#1e40af';
        feedback.style.display = 'block';
        setTimeout(() => closeChangePasswordModal(), 2000);
    }
}

// ============================================================
// PROFILE PHOTO
// ============================================================
function uploadProfilePhoto(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        if (typeof showFeedback === 'function') showFeedback('Please select an image file', 'error');
        return;
    }

    if (file.size > 2 * 1024 * 1024) {
        if (typeof showFeedback === 'function') showFeedback('Image must be less than 2MB', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        const avatar = document.getElementById('profileAvatar');
        if (avatar) {
            avatar.style.backgroundImage = `url(${e.target.result})`;
            avatar.style.backgroundSize = 'cover';
            avatar.style.backgroundPosition = 'center';
            avatar.innerHTML = '';
        }

        try {
            localStorage.setItem('profilePhoto', e.target.result);
            if (typeof showFeedback === 'function') showFeedback('Photo uploaded successfully!', 'success');
        } catch (err) {
            if (typeof showFeedback === 'function') showFeedback('Error saving photo', 'error');
        }
    };
    reader.readAsDataURL(file);
}

function previewEditProfilePhoto(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const preview = document.getElementById('editProfileAvatarPreview');
        if (preview) {
            preview.style.backgroundImage = `url(${e.target.result})`;
            preview.style.backgroundSize = 'cover';
            preview.style.backgroundPosition = 'center';
            preview.innerHTML = '';
        }
    };
    reader.readAsDataURL(file);
}

// ============================================================
// MISC
// ============================================================
function refreshProfile() {
    loadProfileData();
    loadLoginHistory();
    update2FAUI();
    if (typeof showFeedback === 'function') showFeedback('Profile refreshed', 'info');
}

function viewAuditLogs() {
    if (typeof showTab === 'function') {
        showTab('audit');
    } else {
        console.warn('showTab not available');
    }
}

function exportProfileData() {
    const data = {
        ...profileData,
        exportedAt: new Date().toISOString(),
        loginHistory: JSON.parse(localStorage.getItem('loginHistory') || '[]')
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profile_export_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    if (typeof showFeedback === 'function') showFeedback('Profile data exported!', 'success');
}

// ============================================================
// INIT
// ============================================================
function initProfile() {
    console.log('👤 Initializing Profile module...');

    const profileTab = document.querySelector('[data-tab="profile"]');
    if (profileTab) {
        profileTab.addEventListener('click', function () {
            setTimeout(() => {
                loadProfileData();
                loadLoginHistory();
                update2FAUI();
            }, 300);
        });
    }

    const activeTab = document.querySelector('.tab-content.active');
    if (activeTab && activeTab.id === 'profile') {
        setTimeout(() => {
            loadProfileData();
            loadLoginHistory();
        }, 500);
    }

    setTimeout(() => {
        loadProfileData();
        loadLoginHistory();
        update2FAUI();

        if (typeof logLoginAttempt === 'function') {
            logLoginAttempt('SUCCESS');
        }
    }, 1000);

    console.log('✅ Profile module initialized');
}

// ============================================================
// EXPOSE TO GLOBAL (REQUIRED — buttons in HTML call these)
// ============================================================
window.loadProfileData = loadProfileData;
window.updateProfileUI = updateProfileUI;
window.loadProfileStats = loadProfileStats;
window.loadRecentActivity = loadRecentActivity;
window.loadLoginHistory = loadLoginHistory;
window.clearLoginHistory = clearLoginHistory;
window.logLoginAttempt = logLoginAttempt;
window.showEditProfileModal = showEditProfileModal;
window.closeEditProfileModal = closeEditProfileModal;
window.saveProfileChanges = saveProfileChanges;
window.changePassword = changePassword;
window.closeChangePasswordModal = closeChangePasswordModal;
window.handlePasswordChange = handlePasswordChange;
window.uploadProfilePhoto = uploadProfilePhoto;
window.previewEditProfilePhoto = previewEditProfilePhoto;
window.refreshProfile = refreshProfile;
window.viewAuditLogs = viewAuditLogs;
window.exportProfileData = exportProfileData;
window.initProfile = initProfile;

// 2FA globals
window.show2FASetupModal = show2FASetupModal;
window.verifyAndEnable2FA = verifyAndEnable2FA;
window.disable2FA = disable2FA;
window.close2FAModal = close2FAModal;
window.update2FAUI = update2FAUI;
window.copySecretKey = copySecretKey;
window.profileCopyBackupCodes = profileCopyBackupCodes;
window.profileDownloadBackupCodes = profileDownloadBackupCodes;
window.verifyTOTP = profileVerifyTOTP;

console.log('✅ Enhanced Super Admin Profile module loaded (otplib 2FA + Login History)');

// Auto-init
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initProfile();
} else {
    document.addEventListener('DOMContentLoaded', initProfile);
}

})(); // END IIFE
