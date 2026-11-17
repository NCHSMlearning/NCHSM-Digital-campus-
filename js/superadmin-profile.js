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
    id: '',
    name: 'Super Admin',
    email: '',
    phone: '',
    employeeId: '',
    department: '',
    location: '',
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
async function loadProfileData() {
    console.log('Loading authenticated Super Admin profile...');
    try {
        const supabase = profileGetSupabase();
        let authUser = window.currentUser || null;
        if (supabase?.auth?.getUser) {
            const { data, error } = await supabase.auth.getUser();
            if (error) throw error;
            authUser = data?.user || authUser;
        }
        if (!authUser?.id) {
            throw new Error('Your authenticated session could not be verified. Please sign in again.');
        }

        let dbProfile = {};
        if (supabase) {
            const { data, error } = await supabase
                .from('consolidated_user_profiles_table')
                .select('*')
                .eq('user_id', authUser.id)
                .maybeSingle();
            if (error) console.warn('Profile record could not be loaded:', error.message);
            dbProfile = data || {};
        }

        const metadata = authUser.user_metadata || {};
        const name = dbProfile.full_name || metadata.full_name || metadata.name || authUser.email?.split('@')[0] || 'Super Admin';
        const photo = dbProfile.profile_photo_url || dbProfile.avatar_url || metadata.avatar_url || localStorage.getItem('profilePhoto') || '';
        const accountStatus = dbProfile.status || (authUser.email_confirmed_at ? 'Email verified' : 'Email not verified');
        const createdAt = authUser.created_at || dbProfile.created_at || null;
        const lastSignIn = authUser.last_sign_in_at || null;
        profileData = {
            ...profileData,
            id: authUser.id,
            name,
            email: authUser.email || dbProfile.email || '',
            phone: dbProfile.phone || dbProfile.phone_number || metadata.phone || '',
            employeeId: dbProfile.staff_id || dbProfile.employee_id || '',
            department: dbProfile.department || dbProfile.program || '',
            location: dbProfile.address || '',
            role: dbProfile.role || 'superadmin',
            memberSince: createdAt ? new Date(createdAt).toLocaleDateString(undefined,{year:'numeric',month:'short'}) : 'Not available',
            lastLogin: lastSignIn ? new Date(lastSignIn).toLocaleString() : 'Not available',
            avatarInitials: name.split(/\\s+/).filter(Boolean).map(part=>part[0]).join('').toUpperCase().slice(0,2) || 'SA',
            photo,
            accountStatus
        };
        try { localStorage.setItem('profileData', JSON.stringify(profileData)); } catch (_) {}
        updateProfileUI();
        profileSetupSections();
        profileLoadSessions();
        loadProfileStats();
        loadRecentActivity();
        loadLoginHistory();
        await update2FAUI();
        console.log('Authenticated profile loaded.');
    } catch (error) {
        console.error('Profile load failed:', error);
        const nameEl = document.getElementById('profileDisplayName');
        if (nameEl) nameEl.textContent = 'Profile unavailable';
        if (typeof showFeedback === 'function') showFeedback(error.message || 'Unable to load profile', 'error');
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

    const avatar = document.getElementById('profileAvatar');
    if (avatar) {
        if (profileData.photo) {
            avatar.style.backgroundImage = 'url("' + String(profileData.photo).replace(/["\\\\]/g, '') + '")';
            avatar.style.backgroundSize = 'cover';
            avatar.style.backgroundPosition = 'center';
        } else {
            avatar.style.backgroundImage = '';
            avatar.style.backgroundSize = '';
            avatar.style.backgroundPosition = '';
        }
    }
    const accountStatus = document.getElementById('profileAccountStatus');
    if (accountStatus) {
        accountStatus.textContent = profileData.accountStatus || 'Status unavailable';
        accountStatus.style.color = ['active','approved'].includes(String(profileData.accountStatus || '').toLowerCase()) ? '#059669' : '#b45309';
    }
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
// ============================================================
// SUPABASE AUTHENTICATOR MFA — native TOTP
// ============================================================
let profileMfaEnrollment=null;
async function profileGetMfaFactors(){
 const sb=profileGetSupabase();if(!sb?.auth?.mfa?.listFactors)throw new Error('Supabase Auth MFA is unavailable.');
 const {data,error}=await sb.auth.mfa.listFactors();if(error)throw error;return data?.totp||[];
}
async function update2FAUI(){
 const status=document.getElementById('twoFactorStatus'),toggle=document.getElementById('twoFactorToggleBtn');
 const setup=document.getElementById('twoFactorSetupSection'),enabledBox=document.getElementById('twoFactorEnabledSection');
 try{
  const factors=await profileGetMfaFactors(),verified=factors.filter(f=>f.status==='verified'),active=verified.length>0;
  profileData.twoFactorEnabled=active;profileData.twoFactorVerified=active;profileData.twoFactorFactorId=verified[0]?.id||null;
  const stat=document.getElementById('profileStat2FA');if(stat){stat.textContent=active?'Enabled':'Disabled';stat.style.color=active?'#059669':'#b45309';}
  if(status){status.textContent=active?'Enabled':'Disabled';status.style.color=active?'#059669':'#dc2626';}
  if(toggle){toggle.textContent=active?'Disable 2FA':'Enable 2FA';toggle.style.background=active?'#dc2626':'#059669';toggle.onclick=active?disable2FA:show2FASetupModal;}
  if(setup)setup.style.display=active?'none':'block';if(enabledBox)enabledBox.style.display=active?'block':'none';
  const date=document.getElementById('twoFactorSetupDate');if(date&&active)date.textContent='Managed securely by Supabase Auth';
 }catch(e){console.error('MFA status error',e);if(status){status.textContent='Unavailable';status.style.color='#b45309';}if(typeof showFeedback==='function')showFeedback(e.message||'Unable to load 2FA status.','error');}
}
function profileEnsure2FAModal(){
 let m=document.getElementById('twoFactorModal');if(m)return m;
 m=document.createElement('div');m.id='twoFactorModal';m.style.cssText='display:none;position:fixed;inset:0;background:rgba(2,18,35,.68);z-index:100000;justify-content:center;align-items:center;padding:16px;box-sizing:border-box;';
 m.innerHTML='<div style="background:#fff;border-radius:18px;padding:24px;width:min(100%,460px);max-height:92vh;overflow:auto;position:relative;box-shadow:0 24px 70px rgba(0,0,0,.28);box-sizing:border-box"><button type="button" onclick="close2FAModal()" style="position:absolute;right:14px;top:12px;border:0;background:#f1f5f9;border-radius:50%;width:34px;height:34px;font-size:22px">&times;</button><div id="twoFactorModalContent"></div></div>';document.body.appendChild(m);return m;
}
async function show2FASetupModal(){
 const sb=profileGetSupabase();if(!sb?.auth?.mfa?.enroll){if(typeof showFeedback==='function')showFeedback('Supabase Auth MFA is unavailable.','error');return;}
 const modal=profileEnsure2FAModal(),content=document.getElementById('twoFactorModalContent');content.innerHTML='<p style="text-align:center;padding:28px">Preparing secure authenticator setup…</p>';modal.style.display='flex';
 try{
  const existing=await profileGetMfaFactors();for(const f of existing.filter(x=>x.status!=='verified')){const {error}=await sb.auth.mfa.unenroll({factorId:f.id});if(error)throw error;}
  const {data,error}=await sb.auth.mfa.enroll({factorType:'totp',friendlyName:'NCHSM Super Admin Authenticator'});if(error)throw error;
  if(!data?.id||!data?.totp?.qr_code||!data?.totp?.secret)throw new Error('Supabase did not return an authenticator QR code.');
  profileMfaEnrollment={factorId:data.id};sessionStorage.setItem('nchsm_mfa_enrollment_factor',data.id);
  const qr=data.totp.qr_code,secret=data.totp.secret;
  content.innerHTML=[
   '<div style="text-align:center"><h2 style="color:#0A3D62">Set up two-factor authentication</h2>',
   '<p style="color:#64748b;font-size:13px">Scan with Google Authenticator, Microsoft Authenticator, Authy or another TOTP app.</p>',
   '<img alt="Authenticator QR code" src="',qr,'" style="width:210px;height:210px;max-width:100%;object-fit:contain;border:1px solid #e2e8f0;border-radius:12px;padding:8px">',
   '<div style="background:#f8fafc;border-radius:10px;padding:12px;text-align:left;margin:12px 0"><b style="font-size:11px;color:#64748b">MANUAL SETUP KEY</b><code style="display:block;overflow-wrap:anywhere;margin:8px 0">',profileEscapeHtml(secret),'</code></div>',
   '<label for="twoFactorNativeCode">Enter the 6-digit code from your authenticator</label><input id="twoFactorNativeCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000" style="width:100%;box-sizing:border-box;padding:14px;border:1px solid #cbd5e1;border-radius:10px;text-align:center;font-size:24px;letter-spacing:8px">',
   '<div id="twoFactorError" role="alert" style="display:none;color:#dc2626;font-size:12px;margin-top:8px"></div>',
   '<div style="display:flex;gap:10px;margin-top:16px"><button onclick="close2FAModal()" style="flex:1;padding:12px">Cancel</button><button id="verifyEnableBtn" onclick="verifyAndEnable2FA()" style="flex:2;padding:12px;background:#4C1D95;color:white;border:0;border-radius:9px">Verify & Enable</button></div></div>'
  ].join('');
  document.getElementById('twoFactorNativeCode')?.focus();
 }catch(e){console.error('MFA enrollment failed',e);content.innerHTML='<p style="color:#b91c1c">Could not start 2FA setup: '+profileEscapeHtml(e.message)+'</p><button onclick="close2FAModal()">Close</button>';}
}
async function verifyAndEnable2FA(){
 const sb=profileGetSupabase(),code=(document.getElementById('twoFactorNativeCode')?.value||'').replace(/\D/g,''),err=document.getElementById('twoFactorError'),btn=document.getElementById('verifyEnableBtn');
 const factorId=profileMfaEnrollment?.factorId||sessionStorage.getItem('nchsm_mfa_enrollment_factor');
 if(!/^\d{6}$/.test(code)){if(err){err.textContent='Enter all six digits.';err.style.display='block';}return;}
 if(!factorId){if(err){err.textContent='Setup expired. Start again.';err.style.display='block';}return;}
 const old=btn?.textContent;if(btn){btn.disabled=true;btn.textContent='Verifying…';}
 try{
  const {data:ch,error:ce}=await sb.auth.mfa.challenge({factorId});if(ce)throw ce;
  const {error}=await sb.auth.mfa.verify({factorId,challengeId:ch.id,code});if(error)throw error;
  profileMfaEnrollment=null;sessionStorage.removeItem('nchsm_mfa_enrollment_factor');await update2FAUI();
  document.getElementById('twoFactorModalContent').innerHTML='<div style="text-align:center;padding:20px"><h2 style="color:#059669">2FA enabled successfully</h2><p>Your account is now protected by Supabase Auth. You will be asked for an authenticator code when signing in.</p><p style="font-size:12px;color:#92400e;background:#fef3c7;padding:10px;border-radius:8px">For recovery, enrol a second authenticator device and store it securely. Supabase Auth does not issue recovery codes in this flow.</p><button onclick="close2FAModal()">Done</button></div>';
  if(typeof showFeedback==='function')showFeedback('Two-factor authentication enabled.','success');
 }catch(e){console.error('MFA verify failed',e);if(err){err.textContent=e.message||'Code verification failed. Check device time.';err.style.display='block';}const input=document.getElementById('twoFactorNativeCode');if(input){input.value='';input.focus();}if(btn){btn.disabled=false;btn.textContent=old||'Verify & Enable';}}
}
async function disable2FA(){
 if(!confirm('Disable authenticator two-factor authentication?'))return;const sb=profileGetSupabase();
 try{
  const {data:aal,error:ae}=await sb.auth.mfa.getAuthenticatorAssuranceLevel();if(ae)throw ae;
  if(aal?.currentLevel!=='aal2')throw new Error('Sign in again and complete your authenticator code before disabling 2FA.');
  const factors=await profileGetMfaFactors();for(const f of factors.filter(x=>x.status==='verified')){const {error}=await sb.auth.mfa.unenroll({factorId:f.id});if(error)throw error;}
  await sb.auth.refreshSession();await update2FAUI();if(typeof showFeedback==='function')showFeedback('Two-factor authentication disabled.','success');
 }catch(e){console.error('MFA disable failed',e);if(typeof showFeedback==='function')showFeedback(e.message||'Could not disable 2FA.','error');}
}
function close2FAModal(){const m=document.getElementById('twoFactorModal');if(m)m.style.display='none';profileMfaEnrollment=null;sessionStorage.removeItem('nchsm_mfa_enrollment_factor');}
function profileWireSetupOtpInputs(){}
function profileShow2FASuccessScreen(){update2FAUI();}
function profileVerifyTOTP(){return false;}
function copySecretKey(secret){const f=()=>{const t=document.createElement('textarea');t.value=secret;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove();};if(navigator.clipboard?.writeText)navigator.clipboard.writeText(secret).catch(f);else f();}
function profileCopyBackupCodes(){if(typeof showFeedback==='function')showFeedback('Supabase Auth does not issue recovery codes. Enrol a second authenticator device.','info');}
function profileDownloadBackupCodes(){profileCopyBackupCodes();}
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
let profileRecentActivityRows = [];
let profileRecentActivityFilter = 'all';
let profileRecentActivitySearch = '';
let profileRecentActivityOffset = 0;
let profileRecentActivityHasMore = false;
let profileRecentActivityLoading = false;

async function loadRecentActivity(append = false) {
    const container=document.getElementById('profileRecentActivity');if(!container)return;
    const sb=profileGetSupabase();
    if(!sb){container.innerHTML=profileActivityEmpty('Secure audit service is unavailable.',true);return;}
    if(profileRecentActivityLoading)return;
    if(!append){profileRecentActivityOffset=0;profileRecentActivityRows=[];}
    profileRecentActivityLoading=true;
    if(!append)container.innerHTML='<div style="padding:22px;text-align:center;color:#64748b"><i class="fas fa-spinner fa-spin"></i> Loading system-wide audit trail…</div>';
    try{
      const {data,error}=await sb.rpc('get_superadmin_audit_events',{
        p_limit:100,p_offset:profileRecentActivityOffset,p_action:null,p_search:null
      });
      if(error)throw error;
      const batch=Array.isArray(data)?data:[];
      profileRecentActivityHasMore=batch.length===100;
      profileRecentActivityOffset+=batch.length;
      const mapped=batch.map((event,index)=>{
        const detail=event.details&&typeof event.details==='object'?event.details:{};
        return {
          id:[event.event_time,event.actor_id,event.action,event.source,event.module,index].join('|'),
          timestamp:event.event_time,
          user_id:event.actor_id,
          user_email:event.actor_email,
          actor_name:event.actor_name,
          role:event.actor_role,
          action_type:event.action,
          module:event.module,
          target_table:detail.target_table||'',
          target_id:detail.target_id||'',
          description:detail.description||detail.details||detail.failure_reason||detail.attempt_type||event.action,
          status:event.status,
          ip_address:event.ip_address,
          user_agent:event.user_agent||detail.user_agent||'',
          device_info:detail.session_device||'',
          source:event.source,
          request_id:detail.request_id||'',
          page_path:detail.page_path||'',
          old_data:detail.old_data||null,
          new_data:detail.new_data||null,
          raw_details:detail
        };
      });
      profileRecentActivityRows=append?profileRecentActivityRows.concat(mapped):mapped;
      const heading=document.querySelector('#profileActivityPanel h2, #profileActivityPanel h3');
      if(heading)heading.textContent='System-wide Audit Trail';
      profileRenderRecentActivity();
    }catch(error){
      console.error('System-wide audit RPC failed:',error);
      if(!append)container.innerHTML=profileActivityEmpty(error.message||'System-wide audit trail could not be loaded. Check administrator audit permissions.',true);
      else if(typeof showFeedback==='function')showFeedback('Could not load more audit records.','error');
    }finally{profileRecentActivityLoading=false;}
}

function profileAuditDevice(row){
    if(row.device_info)return row.device_info;
    const ua=String(row.user_agent||'');
    if(!ua)return 'Device not recorded';
    const device=/iPad|Tablet/i.test(ua)?'Tablet':/iPhone|Android.*Mobile|Mobile/i.test(ua)?'Mobile':/Android/i.test(ua)?'Android device':/Windows/i.test(ua)?'Windows computer':/Macintosh|Mac OS/i.test(ua)?'Mac computer':/Linux/i.test(ua)?'Linux computer':'Device not identified';
    const browser=/Edg\//i.test(ua)?'Edge':/OPR\/|Opera/i.test(ua)?'Opera':/Firefox\//i.test(ua)?'Firefox':/Chrome\//i.test(ua)?'Chrome':/Safari\//i.test(ua)?'Safari':'Browser not identified';
    return device+' · '+browser;
}
function profileAuditChangeSummary(row){
    const oldData=row.old_data&&typeof row.old_data==='object'?row.old_data:null;
    const newData=row.new_data&&typeof row.new_data==='object'?row.new_data:null;
    if(!oldData&&!newData)return row.description||'Action recorded; no field-level change snapshot was stored.';
    if(!oldData&&newData)return 'Created record with '+Object.keys(newData).length+' captured fields.';
    if(oldData&&!newData)return 'Deleted record; previous values are available in the audit details.';
    const changed=Array.from(new Set([...Object.keys(oldData||{}),...Object.keys(newData||{})])).filter(key=>JSON.stringify(oldData?.[key])!==JSON.stringify(newData?.[key]));
    return changed.length?'Changed fields: '+changed.join(', '):'Record updated; no field differences were returned.';
}
function profileAuditStatus(status){
    const s=String(status||'').toLowerCase();
    if(['success','succeeded','completed','approved','successful'].includes(s))return {label:'Successful',color:'#059669'};
    if(['failed','failure','error','denied','blocked'].includes(s))return {label:'Failed / blocked',color:'#dc2626'};
    if(['info','unknown'].includes(s))return {label:'Information',color:'#64748b'};
    return {label:status||'Recorded',color:'#64748b'};
}

function profileRenderRecentActivity(){
    const container=document.getElementById('profileRecentActivity');if(!container)return;
    const rows=profileRecentActivityRows;
    const filters=[['all','All events'],['success','Successful'],['failed','Failed / blocked'],['login','Logins'],['update','Updates'],['insert','Created'],['delete','Deleted']];
    const filtered=rows.filter(row=>{
      const action=String(row.action_type||'').toLowerCase(),status=String(row.status||'').toLowerCase();
      const filter=profileRecentActivityFilter==='all'||
        (profileRecentActivityFilter==='success'&&['success','succeeded','completed','approved','successful'].includes(status))||
        (profileRecentActivityFilter==='failed'&&['failed','failure','error','denied','blocked'].includes(status))||
        (profileRecentActivityFilter==='login'&&(/login|sign.in|token_refreshed|user_signedup/i.test(action)))||
        action===profileRecentActivityFilter;
      const hay=[row.actor_name,row.user_email,row.role,row.action_type,row.module,row.target_table,row.target_id,row.description,row.status,row.ip_address,row.device_info,row.user_agent,row.page_path,row.source].join(' ').toLowerCase();
      return filter&&hay.includes(profileRecentActivitySearch);
    });
    const esc=v=>profileEscapeHtml(v===null||v===undefined||v===''?'Not recorded':String(v));
    const fmt=v=>profileFormatDateTime(v,true)||'Time not recorded';
    const toolbar='<div style="display:grid;gap:9px;margin:0 0 14px;">'+
      '<input id="profileActivitySearch" type="search" value="'+esc(profileRecentActivitySearch)+'" placeholder="Search people, actions, IP, devices, modules, records…" aria-label="Search system audit trail" style="width:100%;box-sizing:border-box;border:1px solid #dbe2ea;border-radius:10px;padding:11px 12px;font-size:13px;background:#fff;">'+
      '<div style="display:flex;gap:7px;overflow-x:auto;padding:2px 0 5px;">'+filters.map(([v,label])=>'<button type="button" data-activity-filter="'+v+'" style="white-space:nowrap;border:1px solid '+(profileRecentActivityFilter===v?'#4C1D95':'#dbe2ea')+';background:'+(profileRecentActivityFilter===v?'#f3e8ff':'#fff')+';color:'+(profileRecentActivityFilter===v?'#4C1D95':'#475569')+';border-radius:20px;padding:7px 11px;font-size:11px;font-weight:700;">'+label+'</button>').join('')+'</div>'+
      '<div style="font-size:10px;line-height:1.5;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px 10px;">Older audit records may not contain device, IP or page details if those values were not captured when the action occurred. New records now capture available request metadata.</div>'+
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;"><span style="font-size:11px;color:#64748b">Showing '+filtered.length+' of '+rows.length+' loaded system events</span><button type="button" id="profileActivityExport" style="border:1px solid #0f766e;background:#ecfdf5;color:#0f766e;border-radius:8px;padding:8px 11px;font-size:11px;font-weight:700;"><i class="fas fa-file-csv"></i> Export CSV</button></div></div>';
    const cards=filtered.map(row=>{
      const action=String(row.action_type||'activity'),upper=action.toUpperCase(),status=profileAuditStatus(row.status);
      const color=profileGetActionColor(upper),icon=profileGetActionIcon(upper);
      const actor=row.actor_name||row.user_email||'Unknown actor';
      const browser=profileAuditDevice(row);
      const where=[row.module,row.page_path,row.target_table,row.target_id?'Record '+row.target_id:null].filter(Boolean).join(' · ')||'Location not recorded';
      const source=row.source||'Source not recorded';
      const ip=row.ip_address||'IP not recorded';
      const detailId='profile-audit-'+String(row.id).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,80);
      const oldJson=row.old_data?JSON.stringify(row.old_data,null,2):'No previous-data snapshot recorded.';
      const newJson=row.new_data?JSON.stringify(row.new_data,null,2):'No new-data snapshot recorded.';
      const rawJson=JSON.stringify(row.raw_details||{},null,2);
      return '<article style="display:flex;gap:10px;padding:14px 1px;border-bottom:1px solid #edf1f5;min-width:0;width:100%;box-sizing:border-box;">'+
       '<div style="width:36px;height:36px;flex:0 0 36px;border-radius:50%;background:'+color+'18;display:flex;align-items:center;justify-content:center;"><i class="fas '+icon+'" style="color:'+color+'"></i></div>'+
       '<div style="flex:1;min-width:0;max-width:100%;">'+
       '<div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;"><strong style="font-size:13px;color:#1e293b;overflow-wrap:anywhere;">'+esc(profileFormatActivityAction(action))+'</strong><span style="font-size:10px;font-weight:700;color:'+status.color+'">'+esc(status.label)+'</span></div>'+
       '<div style="font-size:12px;color:#334155;font-weight:600;margin-top:5px;overflow-wrap:anywhere;">'+esc(profileAuditChangeSummary(row))+'</div>'+
       '<div style="font-size:11px;color:#64748b;line-height:1.55;margin-top:7px;overflow-wrap:anywhere;"><b>Who:</b> '+esc(actor)+' · '+esc(row.user_email)+' · '+esc(row.role)+'</div>'+
       '<div style="font-size:11px;color:#64748b;line-height:1.55;overflow-wrap:anywhere;"><b>Where:</b> '+esc(where)+'</div>'+
       '<div style="font-size:11px;color:#64748b;line-height:1.55;overflow-wrap:anywhere;"><b>IP:</b> '+esc(ip)+'</div>'+
       '<div style="font-size:11px;color:#64748b;line-height:1.55;overflow-wrap:anywhere;"><b>Device / browser:</b> '+esc(browser)+'</div>'+
       '<div style="font-size:11px;color:#94a3b8;margin-top:5px;overflow-wrap:anywhere;"><i class="far fa-clock"></i> '+esc(fmt(row.timestamp))+' · '+esc(source)+'</div>'+
       '<details style="margin-top:8px;"><summary style="cursor:pointer;color:#4C1D95;font-size:11px;font-weight:700;padding:5px 0;">Inspect action details and data changes</summary>'+
       '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:9px;padding:10px;margin-top:6px;">'+
       '<div style="font-size:11px;font-weight:700;color:#334155">Previous data</div><pre style="white-space:pre-wrap;overflow-wrap:anywhere;max-height:180px;overflow:auto;background:#fff;padding:8px;border-radius:6px;font-size:10px;color:#475569">'+esc(oldJson)+'</pre>'+
       '<div style="font-size:11px;font-weight:700;color:#334155;margin-top:8px">New data</div><pre style="white-space:pre-wrap;overflow-wrap:anywhere;max-height:180px;overflow:auto;background:#fff;padding:8px;border-radius:6px;font-size:10px;color:#475569">'+esc(newJson)+'</pre>'+
       '<div style="font-size:11px;font-weight:700;color:#334155;margin-top:8px">Request / event metadata</div><pre style="white-space:pre-wrap;overflow-wrap:anywhere;max-height:180px;overflow:auto;background:#fff;padding:8px;border-radius:6px;font-size:10px;color:#475569">'+esc(rawJson)+'</pre>'+
       '<div style="font-size:10px;color:#64748b;margin-top:6px">Request ID: '+esc(row.request_id)+' · User ID: '+esc(row.user_id)+'</div></div></details></div></article>';
    }).join('');
    let paging='';
    if(profileRecentActivityHasMore)paging='<div style="padding:12px;text-align:center;"><button type="button" id="profileActivityLoadMore" style="border:1px solid #cbd5e1;background:#fff;border-radius:9px;padding:10px 16px;color:#334155;font-weight:700;font-size:12px;">Load more system events</button></div>';
    container.innerHTML=toolbar+(cards||profileActivityEmpty(rows.length?'No events match your search or filter.':'No system audit events were returned.'))+paging;
    const search=document.getElementById('profileActivitySearch');
    if(search)search.addEventListener('input',event=>{
      profileRecentActivitySearch=event.target.value.toLowerCase().trim();
      profileRenderRecentActivity();
      const next=document.getElementById('profileActivitySearch');if(next){next.focus();next.setSelectionRange(next.value.length,next.value.length);}
    });
    container.querySelectorAll('[data-activity-filter]').forEach(button=>button.addEventListener('click',()=>{profileRecentActivityFilter=button.dataset.activityFilter;profileRenderRecentActivity();}));
    document.getElementById('profileActivityExport')?.addEventListener('click',profileExportRecentActivity);
    document.getElementById('profileActivityLoadMore')?.addEventListener('click',()=>loadRecentActivity(true));
}

function profileExportRecentActivity(){
    const rows=profileRecentActivityRows.filter(row=>{
      const hay=[row.actor_name,row.user_email,row.role,row.action_type,row.module,row.target_table,row.target_id,row.description,row.status,row.ip_address,row.device_info,row.user_agent,row.page_path,row.source].join(' ').toLowerCase();
      const status=String(row.status||'').toLowerCase(),action=String(row.action_type||'').toLowerCase();
      const filter=profileRecentActivityFilter==='all'||
       (profileRecentActivityFilter==='success'&&['success','succeeded','completed','approved','successful'].includes(status))||
       (profileRecentActivityFilter==='failed'&&['failed','failure','error','denied','blocked'].includes(status))||
       (profileRecentActivityFilter==='login'&&(/login|sign.in|token_refreshed|user_signedup/i.test(action)))||action===profileRecentActivityFilter;
      return filter&&hay.includes(profileRecentActivitySearch);
    });
    const fields=['timestamp','actor_name','user_email','role','action_type','status','module','page_path','target_table','target_id','description','ip_address','device_info','user_agent','source','request_id','user_id','old_data','new_data','raw_details'];
    const quote=v=>'"'+String(v===null||v===undefined?'':typeof v==='object'?JSON.stringify(v):v).replace(/"/g,'""')+'"';
    const csv=[fields.join(','),...rows.map(row=>fields.map(field=>quote(row[field])).join(','))].join('\r\n');
    const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='nchsm-system-audit-'+new Date().toISOString().slice(0,10)+'.csv';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}

function profileActivityEmpty(message, isError) {
    const icon = isError ? 'fa-exclamation-circle' : 'fa-inbox';
    const color = isError ? '#dc2626' : '#94a3b8';
    return '<div style="text-align:center;color:' + color + ';padding:24px 12px;font-size:13px;"><i class="fas ' + icon + '" style="font-size:22px;display:block;margin-bottom:8px;"></i>' + profileEscapeHtml(message) + '</div>';
}

function profileFormatActivityAction(action) {
    const labels = {
        update: 'Record updated', insert: 'Record created', delete: 'Record deleted',
        login: 'Signed in', logout: 'Signed out', select: 'Record viewed',
        user_created: 'User created', user_updated: 'User updated', user_deleted: 'User deleted',
        marks_entry: 'Marks entered', marks_approved: 'Marks approved',
        resource_uploaded: 'Resource uploaded', system_maintenance: 'System maintenance',
        admin_action: 'Administrator action', '2fa_enabled': 'Two-factor authentication enabled',
        '2fa_disabled': 'Two-factor authentication disabled'
    };
    return labels[String(action || '').toLowerCase()] ||
        String(action || 'Activity').replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function profileFormatActivityDetails(details) {
    if (!details) return 'An action was recorded on your account.';
    return String(details)
        .replace(/consolidated_user_profiles_table/gi, 'your profile')
        .replace(/student_marks/gi, 'student marks')
        .replace(/user_sessions/gi, 'login sessions')
        .replace(/admin_notifications/gi, 'administrator notifications')
        .replace(/[_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
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

async function saveProfileChanges() {
    const name = document.getElementById('editProfileName')?.value.trim() || '';
    const phone = document.getElementById('editProfilePhone')?.value.trim() || '';
    const department = document.getElementById('editProfileDepartment')?.value.trim() || '';
    const location = document.getElementById('editProfileLocation')?.value.trim() || '';
    if (!name) {
        if (typeof showFeedback === 'function') showFeedback('Full name is required', 'error');
        else alert('Full name is required');
        return;
    }

    const supabase = profileGetSupabase();
    if (!supabase?.auth?.getUser) {
        if (typeof showFeedback === 'function') showFeedback('Secure connection unavailable. Please refresh and sign in again.', 'error');
        return;
    }
    const { data: authData, error: authError } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    if (authError || !userId || userId !== profileData.id) {
        if (typeof showFeedback === 'function') showFeedback('Your session could not be verified. Please sign in again.', 'error');
        return;
    }

    const submit = document.querySelector('#editProfileForm button[type="submit"]');
    const oldLabel = submit?.innerHTML;
    if (submit) { submit.disabled = true; submit.textContent = 'Saving…'; }
    try {
        const { data: updatedProfile, error } = await supabase
            .from('consolidated_user_profiles_table')
            .update({ full_name: name, phone, department, address: location, updated_at: new Date().toISOString() })
            .eq('user_id', userId)
            .select('user_id')
            .maybeSingle();
        if (error) throw error;
        if (!updatedProfile?.user_id) throw new Error('No profile row was updated. Check your profile record and update permissions.');

        profileData.name = name;
        profileData.phone = phone;
        profileData.department = department;
        profileData.location = location;
        profileData.avatarInitials = name.split(/\\s+/).filter(Boolean).map(part=>part[0]).join('').toUpperCase().slice(0,2);
        try { localStorage.setItem('profileData', JSON.stringify(profileData)); } catch (_) {}
        updateProfileUI();
        closeEditProfileModal();
        if (typeof showFeedback === 'function') showFeedback('Profile updated successfully.', 'success');
    } catch (error) {
        console.error('Profile update failed:', error);
        if (typeof showFeedback === 'function') showFeedback('Profile was not saved: ' + (error.message || 'Database error'), 'error');
    } finally {
        if (submit) { submit.disabled = false; submit.innerHTML = oldLabel || 'Save Changes'; }
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

async function handlePasswordChange() {
    const current = document.getElementById('currentPassword')?.value || '';
    const newPass = document.getElementById('newPassword')?.value || '';
    const confirm = document.getElementById('confirmPassword')?.value || '';
    const feedback = document.getElementById('passwordFeedback');
    if (!feedback) return;
    const showPasswordFeedback = (message, success=false) => {
        feedback.textContent = message;
        feedback.style.background = success ? '#d1fae5' : '#fee2e2';
        feedback.style.color = success ? '#065f46' : '#991b1b';
        feedback.style.display = 'block';
    };
    if (!current) return showPasswordFeedback('Enter your current password to continue.');
    if (newPass.length < 8) return showPasswordFeedback('New password must be at least 8 characters.');
    if (!/[A-Z]/.test(newPass) || !/[a-z]/.test(newPass) || !/[0-9]/.test(newPass)) {
        return showPasswordFeedback('Use at least one uppercase letter, one lowercase letter and one number.');
    }
    if (newPass !== confirm) return showPasswordFeedback('The new passwords do not match.');
    if (newPass === current) return showPasswordFeedback('Choose a password different from your current password.');

    const supabase = profileGetSupabase();
    if (!supabase?.auth?.signInWithPassword || !supabase?.auth?.updateUser) {
        return showPasswordFeedback('Secure password service is unavailable. Please refresh and try again.');
    }
    const submit = document.querySelector('#changePasswordForm button[type="submit"]');
    const original = submit?.innerHTML;
    if (submit) { submit.disabled = true; submit.textContent = 'Verifying…'; }
    try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        const email = authData?.user?.email;
        if (authError || !email) throw new Error('Your signed-in account could not be verified. Sign in again.');
        const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password: current });
        if (verifyError) throw new Error('Your current password is incorrect.');
        if (submit) submit.textContent = 'Updating password…';
        const { error: updateError } = await supabase.auth.updateUser({ password: newPass });
        if (updateError) throw updateError;
        showPasswordFeedback('Password changed successfully.', true);
        document.getElementById('changePasswordForm')?.reset();
        if (typeof showFeedback === 'function') showFeedback('Password changed successfully.', 'success');
        setTimeout(() => closeChangePasswordModal(), 1400);
    } catch (error) {
        console.error('Password update failed:', error);
        showPasswordFeedback(error.message || 'Password could not be changed.');
    } finally {
        if (submit) { submit.disabled = false; submit.innerHTML = original || 'Update Password'; }
    }
}

// ============================================================
// PROFILE PHOTO
// ============================================================
async function uploadProfilePhoto(event) {
    const file = event?.target?.files?.[0];
    if (!file) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) {
        if (typeof showFeedback === 'function') showFeedback('Use a JPG, PNG or WebP image.', 'error');
        event.target.value = '';
        return;
    }
    if (file.size > 2 * 1024 * 1024) {
        if (typeof showFeedback === 'function') showFeedback('Profile photo must be 2MB or smaller.', 'error');
        event.target.value = '';
        return;
    }

    const supabase = profileGetSupabase();
    const { data: authData, error: authError } = await supabase?.auth?.getUser?.() || {};
    const userId = authData?.user?.id;
    if (authError || !userId || userId !== profileData.id || !supabase?.storage) {
        if (typeof showFeedback === 'function') showFeedback('Your secure session could not be verified. Please sign in again.', 'error');
        return;
    }

    const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const objectPath = userId + '/profile-' + Date.now() + '.' + extension;
    try {
        const { error: uploadError } = await supabase.storage.from('avatars').upload(objectPath, file, {
            cacheControl: '3600',
            contentType: file.type,
            upsert: false
        });
        if (uploadError) throw uploadError;
        const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(objectPath);
        const photoUrl = publicData?.publicUrl;
        if (!photoUrl) throw new Error('Photo uploaded but its public URL could not be created.');

        const { data: saved, error: saveError } = await supabase
            .from('consolidated_user_profiles_table')
            .update({ profile_photo_url: photoUrl, updated_at: new Date().toISOString() })
            .eq('user_id', userId)
            .select('user_id')
            .maybeSingle();
        if (saveError) throw saveError;
        if (!saved?.user_id) throw new Error('Photo uploaded, but the profile record was not updated.');

        profileData.photo = photoUrl;
        updateProfileUI();
        try { localStorage.setItem('profileData', JSON.stringify(profileData)); } catch (_) {}
        if (typeof showFeedback === 'function') showFeedback('Profile photo saved to your account.', 'success');
    } catch (error) {
        console.error('Profile photo upload failed:', error);
        if (typeof showFeedback === 'function') showFeedback('Photo could not be saved: ' + (error.message || 'Upload failed'), 'error');
    } finally {
        event.target.value = '';
    }
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
        profileData.photo = e.target.result;
        try { localStorage.setItem('profilePhoto', e.target.result); } catch (_) {}
        const avatar = document.getElementById('profileAvatar');
        if (avatar) {
            avatar.style.backgroundImage = 'url("' + e.target.result + '")';
            avatar.style.backgroundSize = 'cover';
            avatar.style.backgroundPosition = 'center';
            avatar.innerHTML = '';
        }
    };
    reader.readAsDataURL(file);
}

// ============================================================
// PROFILE CENTRE: SESSIONS, PREFERENCES, NOTIFICATIONS & NAVIGATION
// ============================================================
let profileCurrentSessionRowId = null;

function profileSetupSections() {
    const root=document.getElementById('profile');if(!root)return;
    const info=root.querySelector('div[style*="grid-template-columns: 2fr 1fr"] > div:first-child');
    if(info&&!info.id)info.id='profilePersonalInfoPanel';
    const recent=document.getElementById('profileRecentActivity');
    const recentCard=recent?.parentElement;
    if(recentCard&&!recentCard.id)recentCard.id='profileActivityPanel';
    const stats=root.querySelector('div[style*="repeat(auto-fit, minmax(160px, 1fr))"]');
    if(stats&&!stats.id)stats.id='profileOverviewStats';
    const locatePanel=(id,childId)=>{
      const existing=document.getElementById(id);if(existing)return existing;
      const child=document.getElementById(childId);if(!child)return null;
      let node=child;
      for(let i=0;i<5&&node&&node.parentElement!==root;i++)node=node.parentElement;
      if(node&&node!==root){node.id=id;return node;}return null;
    };
    locatePanel('profileSecurityPanel','twoFactorStatus')||locatePanel('profileSecurityPanel','profileSessionsList');
    locatePanel('profileNotificationsPanel','profileEmailAlerts')||locatePanel('profileNotificationsPanel','profileInAppAlerts');
    locatePanel('profilePreferencesPanel','profileThemePreference')||locatePanel('profilePreferencesPanel','profileTimezone');
    profileBuildSectionNavigation(root);
    profileLoadPreferences();
}

function profileBuildSectionNavigation(root){
    if(!root||root.querySelector('#profileSectionNavigation'))return;
    const nav=document.createElement('nav');nav.id='profileSectionNavigation';nav.setAttribute('aria-label','Super Admin profile sections');
    nav.style.cssText='display:flex;gap:8px;overflow-x:auto;padding:10px 14px;margin:0 0 18px;position:sticky;top:0;z-index:20;background:rgba(248,250,252,.96);border-bottom:1px solid #e2e8f0;backdrop-filter:blur(10px);-webkit-overflow-scrolling:touch';
    const sections=[
      ['overview','Overview','#profileOverviewStats'],
      ['personal','Personal information','#profilePersonalInfoPanel'],
      ['security','Security & access','#profileSecurityPanel'],
      ['activity','Activity & audit','#profileActivityPanel'],
      ['notifications','Notifications','#profileNotificationsPanel'],
      ['preferences','Preferences','#profilePreferencesPanel']
    ];
    sections.forEach(([key,label,selector])=>{
      const target=root.querySelector(selector);if(!target)return;
      const button=document.createElement('button');button.type='button';button.dataset.profileSection=key;button.textContent=label;
      button.style.cssText='flex:0 0 auto;border:1px solid #dbe3ed;border-radius:999px;padding:9px 13px;background:#fff;color:#334155;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap';
      button.addEventListener('click',()=>profileNavigateSection(key));nav.appendChild(button);
    });
    const header=root.querySelector('.profile-header')||root.firstElementChild;
    if(header?.parentNode)header.parentNode.insertBefore(nav,header.nextSibling);else root.prepend(nav);
    const style=document.createElement('style');style.id='profileCentreResponsiveStyles';
    style.textContent='#profile{min-width:0}#profileSectionNavigation button:focus-visible{outline:3px solid #0f766e;outline-offset:2px}#profile .profile-dark-mode{color-scheme:dark}@media(max-width:640px){#profileSectionNavigation{margin-left:-8px;margin-right:-8px;padding-left:10px;padding-right:10px}#profile .profile-header{align-items:flex-start}#profile .profile-header h2{font-size:1.35rem}}';
    document.head.appendChild(style);
}

function profileNavigateSection(section) {
    const targets={
      overview:document.getElementById('profileOverviewStats')||document.querySelector('#profile > div:first-child'),
      personal:document.getElementById('profilePersonalInfoPanel'),
      security:document.getElementById('profileSecurityPanel'),
      activity:document.getElementById('profileActivityPanel'),
      notifications:document.getElementById('profileNotificationsPanel'),
      preferences:document.getElementById('profilePreferencesPanel')
    };
    const target=targets[section];if(!target)return;
    target.scrollIntoView({behavior:'smooth',block:'start'});
    document.querySelectorAll('#profileSectionNavigation [data-profile-section]').forEach(button=>{
      const active=button.dataset.profileSection===section;
      button.setAttribute('aria-current',active?'location':'false');
      button.style.background=active?'#0f3b53':'#fff';
      button.style.color=active?'#fff':'#334155';
      button.style.borderColor=active?'#0f3b53':'#dbe3ed';
    });
}

async function profileLoadSessions() {
    const container=document.getElementById('profileSessionsList');if(!container)return;
    const sb=profileGetSupabase(),userId=profileData.id;
    if(!sb||!userId){container.innerHTML=profileActivityEmpty('Your authenticated session is unavailable.',true);return;}
    container.innerHTML='<div style="padding:18px;text-align:center;color:#64748b"><i class="fas fa-spinner fa-spin"></i> Loading your sessions…</div>';
    try {
      const [{data:authData,error:authError},{data,error}]=await Promise.all([
        sb.auth.getSession(),
        sb.from('user_sessions').select('id,user_id,session_token,ip_address,user_agent,device_info,login_time,last_activity,expires_at,is_active,login_type').eq('user_id',userId).eq('is_active',true).order('last_activity',{ascending:false}).limit(30)
      ]);
      if(authError)throw authError;if(error)throw error;
      const accessToken=authData?.session?.access_token||'';
      const storedSessionId=localStorage.getItem('session_id');
      profileCurrentSessionRowId=(data||[]).find(row=>storedSessionId&&row.id===storedSessionId)?.id||null;
      const rows=data||[];
      if(!rows.length){container.innerHTML=profileActivityEmpty('No active sessions are recorded for this account.');return;}
      const safe=value=>profileEscapeHtml(value||'Not recorded');
      container.innerHTML=rows.map(row=>{
        const current=row.id===profileCurrentSessionRowId;
        const device=row.device_info||profileParseDeviceFromUA(row.user_agent);
        const browser=profileExtractBrowser(row.user_agent||row.device_info);
        const when=row.last_activity||row.login_time;
        const time=profileFormatDateTime(when)||'Time unavailable';
        return '<article style="display:flex;align-items:flex-start;gap:12px;padding:13px 0;border-bottom:1px solid #e9eef4;min-width:0;">'+
          '<div style="width:38px;height:38px;flex:0 0 38px;border-radius:12px;background:#eff6ff;color:#1d4ed8;display:grid;place-items:center;"><i class="fas '+profileGetDeviceIcon(device)+'"></i></div>'+
          '<div style="flex:1;min-width:0;"><div style="display:flex;gap:7px;align-items:center;flex-wrap:wrap;"><strong style="font-size:13px;color:#1e293b">'+safe(device)+'</strong>'+
          (current?'<span style="font-size:10px;background:#dcfce7;color:#166534;border-radius:20px;padding:3px 7px;font-weight:700">Current device</span>':'')+
          '</div><div style="font-size:11px;color:#64748b;margin-top:4px;overflow-wrap:anywhere">'+safe(browser)+' · '+safe(row.ip_address)+'</div>'+
          '<div style="font-size:11px;color:#94a3b8;margin-top:4px">Last active: '+safe(time)+'</div>'+
          (!current&&profileCurrentSessionRowId?'<button type="button" data-revoke-session="'+safe(row.id)+'" style="margin-top:8px;border:1px solid #fecaca;background:#fff7f7;color:#b91c1c;border-radius:7px;padding:6px 9px;font-size:11px;font-weight:700">Revoke session</button>':'')+
          '</div></article>';
      }).join('');
      if(!profileCurrentSessionRowId){
        container.insertAdjacentHTML('afterbegin','<div style="padding:10px;background:#fff7ed;border:1px solid #fed7aa;border-radius:9px;color:#9a3412;font-size:11px;margin-bottom:10px">The current browser session could not be matched safely. Session revocation is disabled to avoid signing you out unexpectedly.</div>');
      }
      container.querySelectorAll('[data-revoke-session]').forEach(button=>button.addEventListener('click',()=>profileRevokeSession(button.dataset.revokeSession)));
    }catch(e){console.error('Session list failed:',e);container.innerHTML=profileActivityEmpty(e.message||'Unable to load active sessions. Check session access permissions.',true);}
}

async function profileRevokeSession(sessionId) {
    if(!sessionId||sessionId===profileCurrentSessionRowId)return;
    if(!confirm('Revoke this session? The device will need to sign in again.'))return;
    const sb=profileGetSupabase();
    try {
      const {data,error}=await sb.from('user_sessions').update({
        is_active:false,terminated_at:new Date().toISOString(),terminated_by:profileData.email,termination_reason:'Revoked by account owner'
      }).eq('id',sessionId).eq('user_id',profileData.id).eq('is_active',true).select('id').maybeSingle();
      if(error)throw error;if(!data?.id)throw new Error('Session was not revoked. It may already be inactive or you may not have permission.');
      await profileWriteAudit('SESSION_REVOKED','security','user_sessions',sessionId,'Revoked an active account session');
      if(typeof showFeedback==='function')showFeedback('Session revoked.','success');
      profileLoadSessions();
    }catch(e){console.error('Session revocation failed:',e);if(typeof showFeedback==='function')showFeedback(e.message||'Could not revoke session.','error');}
}

async function profileWriteAudit(action,module,targetTable,targetId,description,extra={}) {
    const sb=profileGetSupabase();if(!sb||!profileData.id)return false;
    try {
      const {data:sessionData}=await sb.auth.getSession();
      const session=sessionData?.session;
      const ua=navigator.userAgent||'';
      let ipAddress=null;
      try{const {data:sessionRow}=await sb.from('user_sessions').select('ip_address').eq('user_id',profileData.id).order('last_activity',{ascending:false}).limit(1).maybeSingle();ipAddress=sessionRow?.ip_address||null;}catch(_){}
      const device=/iPad|Tablet/i.test(ua)?'Tablet':/iPhone|Android.*Mobile|Mobile/i.test(ua)?'Mobile':/Android/i.test(ua)?'Android device':/Windows/i.test(ua)?'Windows computer':/Macintosh|Mac OS/i.test(ua)?'Mac computer':'Desktop / unknown';
      const details={
        description:String(description||action),
        target_table:targetTable||null,
        target_id:targetId==null?null:String(targetId),
        page_path:location.pathname+location.search,
        user_agent:ua,
        device_info:device,
        request_id:(window.crypto?.randomUUID?window.crypto.randomUUID():String(Date.now())+'-'+Math.random().toString(36).slice(2)),
        ...extra
      };
      const {error}=await sb.from('audit_logs').insert({
        user_id:profileData.id,user_email:profileData.email,actor_name:profileData.name,
        role:profileData.role,user_role:profileData.role,action_type:action,module,
        target_table:targetTable||null,target_id:targetId==null?null:String(targetId),
        description:String(description||action),details:JSON.stringify(details),
        status:'success',source:'superadmin_profile',
        user_agent:ua,device_info:device,ip_address:ipAddress,page_path:location.pathname+location.search,
        request_id:details.request_id
      });
      if(error){console.warn('Profile audit event could not be written:',error.message);return false;}
      return true;
    }catch(e){console.warn('Profile audit event failed:',e);return false;}
}

function profileLoadPreferences() {
    let prefs={};
    try{prefs=JSON.parse(localStorage.getItem('nchsm_superadmin_profile_preferences')||'{}')||{};}catch(_){}
    const theme=prefs.theme||'light';
    document.body.classList.toggle('profile-dark-mode',theme==='dark');
    const themeSelect=document.getElementById('profileThemePreference');if(themeSelect)themeSelect.value=theme;
    const dateSelect=document.getElementById('profileDateFormat');if(dateSelect)dateSelect.value=prefs.dateFormat||'local';
    const timezone=document.getElementById('profileTimezone');if(timezone)timezone.value=prefs.timezone||Intl.DateTimeFormat().resolvedOptions().timeZone||'Africa/Nairobi';
    const email=document.getElementById('profileEmailAlerts');if(email)email.checked=!!prefs.emailSecurityAlerts;
    const inApp=document.getElementById('profileInAppAlerts');if(inApp)inApp.checked=prefs.inAppSecurityAlerts!==false;
    const browser=document.getElementById('profileBrowserAlerts');if(browser)browser.checked=!!prefs.browserNotifications;
    const browserStatus=document.getElementById('profileBrowserAlertStatus');
    if(browserStatus){const permission=('Notification' in window)?Notification.permission:'unsupported';browserStatus.textContent=permission==='granted'?'Browser notifications permitted':permission==='denied'?'Browser notifications blocked by browser':permission==='unsupported'?'Not supported by this browser':'Permission not yet granted';}
}

function profileFormatDateTime(value,includeSeconds=false) {
    if(!value)return 'Time not recorded';
    const date=new Date(value);if(Number.isNaN(date.getTime()))return 'Time not recorded';
    let prefs={};try{prefs=JSON.parse(localStorage.getItem('nchsm_superadmin_profile_preferences')||'{}')||{};}catch(_){}
    const timezone=prefs.timezone||Intl.DateTimeFormat().resolvedOptions().timeZone;
    const dateFormat=prefs.dateFormat||'local';
    const options={timeZone:timezone,day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'};
    if(includeSeconds)options.second='2-digit';
    if(dateFormat==='dmy'||dateFormat==='mdy'||dateFormat==='iso'){
      const parts=new Intl.DateTimeFormat('en-GB',{timeZone:timezone,day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',...(includeSeconds?{second:'2-digit'}:{})}).formatToParts(date);
      const part=type=>parts.find(p=>p.type===type)?.value||'';
      const datePart=dateFormat==='iso'?part('year')+'-'+part('month')+'-'+part('day'):dateFormat==='mdy'?part('month')+'/'+part('day')+'/'+part('year'):part('day')+'/'+part('month')+'/'+part('year');
      return datePart+' '+part('hour')+':'+part('minute')+(includeSeconds?':'+part('second'):'');
    }
    return new Intl.DateTimeFormat(undefined,options).format(date);
}

function profileSavePreferences() {
    const prefs={
      theme:document.getElementById('profileThemePreference')?.value||'light',
      dateFormat:document.getElementById('profileDateFormat')?.value||'local',
      timezone:document.getElementById('profileTimezone')?.value||Intl.DateTimeFormat().resolvedOptions().timeZone,
      emailSecurityAlerts:!!document.getElementById('profileEmailAlerts')?.checked,
      inAppSecurityAlerts:!!document.getElementById('profileInAppAlerts')?.checked,
      browserNotifications:!!document.getElementById('profileBrowserAlerts')?.checked
    };
    try{localStorage.setItem('nchsm_superadmin_profile_preferences',JSON.stringify(prefs));}
    catch(e){if(typeof showFeedback==='function')showFeedback('Preferences could not be saved in this browser.','error');return;}
    document.body.classList.toggle('profile-dark-mode',prefs.theme==='dark');
    const status=document.getElementById('profilePreferencesSaveStatus');
    if(status)status.textContent='Preferences saved on this device.';
    if(typeof showFeedback==='function')showFeedback('Profile preferences saved.','success');
    profileLoadPreferences();
}

async function profileRequestBrowserNotifications() {
    if(!('Notification' in window)){if(typeof showFeedback==='function')showFeedback('This browser does not support notifications.','error');return;}
    try {
      const permission=await Notification.requestPermission();
      profileLoadPreferences();
      if(permission==='granted'&&document.getElementById('profileBrowserAlerts')?.checked){
        new Notification('NCHSM Super Admin',{body:'Browser security notifications are enabled on this device.'});
      }
      if(typeof showFeedback==='function')showFeedback(permission==='granted'?'Browser notification permission granted.':permission==='denied'?'Notifications were blocked in browser settings.':'Notification permission was not granted.',permission==='granted'?'success':'info');
    }catch(e){if(typeof showFeedback==='function')showFeedback(e.message||'Could not request notification permission.','error');}
}

function profileHandlePreferenceChange() {
    profileSavePreferences();
    if(document.getElementById('profileBrowserAlerts')?.checked&&'Notification' in window&&Notification.permission==='default')profileRequestBrowserNotifications();
}

// ============================================================
// MISC
// ============================================================
function refreshProfile() {
    loadProfileData();
    loadLoginHistory();
    profileLoadSessions();
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
    if (window.__nchsmSuperAdminProfileInit) return;
    window.__nchsmSuperAdminProfileInit = true;
    console.log('Initializing Super Admin profile module.');
    const profileSection = document.getElementById('profile');
    const loadWhenVisible = () => {
        if (profileSection?.classList.contains('active')) {
            loadProfileData();
        }
    };
    document.addEventListener('click', function(event) {
        if (event.target.closest('#mainNav a[data-tab="profile"], .sidebar-profile-link')) {
            setTimeout(loadWhenVisible, 80);
        }
    });
    if (profileSection?.classList.contains('active')) loadProfileData();
    const emailInput = document.getElementById('editProfileEmail');
    if (emailInput) {
        emailInput.readOnly = true;
        emailInput.title = 'Account email is managed by secure sign-in settings.';
    }
    const employeeInput = document.getElementById('editProfileEmployeeId');
    if (employeeInput) {
        employeeInput.readOnly = true;
        employeeInput.title = 'Employee ID is managed by the institution.';
    }
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
window.profileNavigateSection = profileNavigateSection;
window.profileLoadSessions = profileLoadSessions;
window.profileRevokeSession = profileRevokeSession;
window.profileSavePreferences = profileSavePreferences;
window.profileHandlePreferenceChange = profileHandlePreferenceChange;
window.profileRequestBrowserNotifications = profileRequestBrowserNotifications;
window.initProfile = initProfile;

// 2FA globals
window.show2FASetupModal = show2FASetupModal;
window.enable2FA = show2FASetupModal;
window.verifyAndEnable2FA = verifyAndEnable2FA;
window.disable2FA = disable2FA;
window.close2FAModal = close2FAModal;
window.update2FAUI = update2FAUI;
window.copySecretKey = copySecretKey;
window.profileCopyBackupCodes = profileCopyBackupCodes;
window.profileDownloadBackupCodes = profileDownloadBackupCodes;
window.verifyTOTP = profileVerifyTOTP;

console.log('✅ Enhanced Super Admin Profile Centre loaded (MFA, sessions, audit, notifications and preferences)');

// Auto-init
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initProfile();
} else {
    document.addEventListener('DOMContentLoaded', initProfile);
}

})(); // END IIFE
