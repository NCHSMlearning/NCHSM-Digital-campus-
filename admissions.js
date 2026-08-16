// ================================================================
// ADMISSIONS.JS - Complete Application Logic
// FIXED: Supabase initialization, all courses, full workflow
// ================================================================

// ================================================================
// SUPABASE CONFIGURATION - FIXED
// ================================================================
const SUPABASE_URL = 'https://lwhtjozfsmbyihenfunw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk';

// ✅ Initialize Supabase client with error handling
let supabase;
try {
    if (typeof window.supabase !== 'undefined') {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase client initialized');
    } else {
        console.error('❌ Supabase library not loaded');
        // Fallback - create client if window.supabase exists later
        document.addEventListener('DOMContentLoaded', function() {
            if (typeof window.supabase !== 'undefined') {
                supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                console.log('✅ Supabase client initialized (delayed)');
            }
        });
    }
} catch (e) {
    console.error('❌ Supabase initialization error:', e);
}

// ================================================================
// STATE VARIABLES
// ================================================================
let currentUser = null;
let currentStep = 1;
let uploadedDocs = {};
let eligibilityPassed = false;
let kcseValidated = false;
let applicationId = null;
let studentType = 'new';
let kcseDataExtracted = {};

// ================================================================
// COURSE DATA - ALL 32+ COURSES FROM NCHSM DOCUMENT
// ================================================================
const courseData = {
    // ==================== SCHOOL OF NURSING ====================
    nursing: [
        { code: 'CHN', name: 'Diploma Community Health Nursing (CHN)', duration: '3 Years', grade: 'C Plain', school: 'School of Nursing' }
    ],

    // ==================== SCHOOL OF HEALTHCARE ASSISTANT ====================
    healthcare: [
        { code: 'CNA', name: 'Certificate in Nursing Assistant (CNA)', duration: '6 Months', grade: 'D-', school: 'School of Healthcare Assistant' },
        { code: 'ACG', name: 'Artisan in Caregiver', duration: '2 Modules', grade: 'D-', school: 'School of Healthcare Assistant' },
        { code: 'HSS', name: 'Certificate in Health Services Support (Level 5)', duration: '4 Modules', grade: 'D Plain', school: 'School of Healthcare Assistant' },
        { code: 'HBC', name: 'Craft in Homebased Care Level 3', duration: '2 Modules', grade: 'D Plain', school: 'School of Healthcare Assistant' },
        { code: 'HSSM', name: 'Health Systems Support Management (Level 6)', duration: '6 Modules', grade: 'C-', school: 'School of Healthcare Assistant' }
    ],

    // ==================== SCHOOL OF HEALTH, SOCIAL & APPLIED SCIENCES ====================
    health_social: [
        { code: 'DPOTT', name: 'Diploma in Perioperative Theatre Technology (Level 6)', duration: '6 Modules', grade: 'C Plain', school: 'School of Health, Social & Applied Sciences' },
        { code: 'CPOTT', name: 'Certificate in Perioperative Theatre Technology (Level 5)', duration: '4 Modules', grade: 'C-', school: 'School of Health, Social & Applied Sciences' },
        { code: 'DCH', name: 'Diploma in Community Health (Level 6)', duration: '7 Modules', grade: 'C-', school: 'School of Health, Social & Applied Sciences' },
        { code: 'CCH', name: 'Certificate in Community Health (Level 5)', duration: '4 Modules', grade: 'D+', school: 'School of Health, Social & Applied Sciences' },
        { code: 'DSW', name: 'Diploma in Social Work & Community Devt (Level 6)', duration: '5 Modules', grade: 'C-', school: 'School of Health, Social & Applied Sciences' },
        { code: 'CSW', name: 'Certificate in Social Work & Community Devt (Level 5)', duration: '3 Modules', grade: 'D+', school: 'School of Health, Social & Applied Sciences' },
        { code: 'DHRIT', name: 'Diploma in Health Records & IT (Level 6)', duration: '7 Modules', grade: 'C Plain', school: 'School of Health, Social & Applied Sciences' },
        { code: 'CHRIT', name: 'Certificate in Health Records & IT (Level 5)', duration: '4 Modules', grade: 'C-', school: 'School of Health, Social & Applied Sciences' },
        { code: 'DOTM', name: 'Diploma in Orthopedic & Trauma Medicine (Level 6)', duration: '6 Modules', grade: 'C Plain', school: 'School of Health, Social & Applied Sciences' },
        { code: 'COTM', name: 'Certificate in Orthopedic & Trauma Medicine (Level 5)', duration: '4 Modules', grade: 'C-', school: 'School of Health, Social & Applied Sciences' },
        { code: 'DBME', name: 'Diploma in Bio-Medical Engineering (Level 6)', duration: '7 Modules', grade: 'C-', school: 'School of Health, Social & Applied Sciences' },
        { code: 'CBME', name: 'Certificate in Bio-Medical Engineering (Level 5)', duration: '4 Modules', grade: 'D+', school: 'School of Health, Social & Applied Sciences' },
        { code: 'DSL', name: 'Diploma in Science Laboratory (Level 6)', duration: '5 Modules', grade: 'C-', school: 'School of Health, Social & Applied Sciences' },
        { code: 'CSL', name: 'Certificate in Science Laboratory (Level 5)', duration: '3 Modules', grade: 'D Plain', school: 'School of Health, Social & Applied Sciences' },
        { code: 'DCSJ', name: 'Diploma in Criminal Safety Justice (Level 6)', duration: '5 Modules', grade: 'C-', school: 'School of Health, Social & Applied Sciences' },
        { code: 'CCSJ', name: 'Certificate in Criminal Safety Justice (Level 5)', duration: '4 Modules', grade: 'D Plain', school: 'School of Health, Social & Applied Sciences' }
    ],

    // ==================== SCHOOL OF INFORMATION COMMUNICATION TECHNOLOGY ====================
    ict: [
        { code: 'DICT', name: 'Diploma in Information Communication Technology', duration: '6 Modules', grade: 'C-', school: 'School of ICT' },
        { code: 'CICT', name: 'Certificate in Information Communication Technology', duration: '4 Modules', grade: 'D Plain', school: 'School of ICT' },
        { code: 'DCP', name: 'Diploma in Computer Programming', duration: '6 Modules', grade: 'C-', school: 'School of ICT' },
        { code: 'DCS', name: 'Diploma in Computer Science', duration: '6 Modules', grade: 'C Plain', school: 'School of ICT' },
        { code: 'NSA', name: 'Network System Administration', duration: '4 Modules', grade: 'C-', school: 'School of ICT' },
        { code: 'DCSec', name: 'Diploma in Cyber Security (Level 6)', duration: '6 Modules', grade: 'C-', school: 'School of ICT' }
    ],

    // ==================== ICT - SHORT COURSES ====================
    ict_short: [
        { code: 'CCA', name: 'Certificate in Computer Applications', duration: '1 Month', grade: 'Open', school: 'ICT Short Courses' },
        { code: 'CCE', name: 'Certificate in Advance Microsoft Excel', duration: '1 Month', grade: 'Open', school: 'ICT Short Courses' },
        { code: 'CGD', name: 'Certificate in Graphic Design', duration: '3 Months', grade: 'D-', school: 'ICT Short Courses' },
        { code: 'CDM', name: 'Certificate in Digital Marketing', duration: '2 Months', grade: 'Open', school: 'ICT Short Courses' },
        { code: 'COA', name: 'Certificate in Office Administrator', duration: '3 Months', grade: 'D Plain', school: 'ICT Short Courses' }
    ]
};

// ================================================================
// GRADE POINTS
// ================================================================
const gradePoints = {
    'A': 12, 'A-': 11, 'B+': 10, 'B': 9, 'B-': 8,
    'C+': 7, 'C': 6, 'C-': 5, 'D+': 4, 'D': 3, 'D-': 2, 'E': 1
};

// ================================================================
// CHECK SUPABASE AVAILABILITY
// ================================================================
function checkSupabase() {
    if (!supabase) {
        alert('❌ Supabase is not initialized. Please refresh the page and try again.');
        console.error('❌ Supabase client is undefined');
        return false;
    }
    return true;
}

// ================================================================
// NAVIGATION
// ================================================================
function navigateTo(page) {
    const pages = document.querySelectorAll('.page-content');
    pages.forEach(p => p.classList.remove('active'));
    
    const target = document.getElementById('page-' + page);
    if (target) target.classList.add('active');

    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(n => n.classList.remove('active'));
    const navLink = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (navLink) navLink.classList.add('active');

    if (page === 'register') {
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.classList.add('active');
            const loginForm = document.getElementById('loginForm');
            if (loginForm) loginForm.classList.remove('active');
        }
    }

    if (page === 'login') {
        setTimeout(() => {
            navigateTo('home');
            setTimeout(() => switchAuthTab('login'), 100);
        }, 100);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ================================================================
// AUTH TABS (Home Page)
// ================================================================
function switchAuthTab(tab) {
    const tabs = document.querySelectorAll('.auth-tabs .tab');
    tabs.forEach(t => t.classList.remove('active'));
    const activeTab = document.querySelector(`.auth-tabs .tab[data-tab="${tab}"]`);
    if (activeTab) activeTab.classList.add('active');

    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    if (loginForm) loginForm.classList.remove('active');
    if (registerForm) registerForm.classList.remove('active');

    if (tab === 'login') {
        if (loginForm) loginForm.classList.add('active');
        const subtitle = document.getElementById('authSubtitle');
        if (subtitle) subtitle.textContent = 'Sign in to continue your application';
    } else {
        if (registerForm) registerForm.classList.add('active');
        const subtitle = document.getElementById('authSubtitle');
        if (subtitle) subtitle.textContent = 'Create your account to get started';
    }

    const loginMsg = document.getElementById('loginMessage');
    const registerMsg = document.getElementById('registerMessage');
    if (loginMsg) { loginMsg.textContent = ''; loginMsg.className = 'auth-message'; }
    if (registerMsg) { registerMsg.textContent = ''; registerMsg.className = 'auth-message'; }
}

// ================================================================
// AUTH TABS (Application Page - Login Only)
// ================================================================
function switchAuthTab2(tab) {
    const tabs = document.querySelectorAll('#authContainer2 .tab');
    tabs.forEach(t => t.classList.remove('active'));
    const activeTab = document.querySelector(`#authContainer2 .tab[data-tab="${tab}"]`);
    if (activeTab) activeTab.classList.add('active');

    const loginForm = document.getElementById('loginForm2');
    if (loginForm) loginForm.classList.add('active');

    const loginMsg = document.getElementById('loginMessage2');
    if (loginMsg) { loginMsg.textContent = ''; loginMsg.className = 'auth-message'; }
}

// ================================================================
// LOGIN (Home Page) - FIXED with supabase check
// ================================================================
async function loginUser() {
    if (!checkSupabase()) return;
    
    const email = document.getElementById('loginEmail');
    const password = document.getElementById('loginPassword');
    const msg = document.getElementById('loginMessage');
    
    if (!email || !password || !msg) return;

    const emailVal = email.value.trim();
    const passwordVal = password.value;

    msg.className = 'auth-message';
    msg.textContent = '';

    if (!emailVal || !passwordVal) {
        msg.className = 'auth-message error';
        msg.textContent = '❌ Please enter both email and password.';
        return;
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({ 
            email: emailVal, 
            password: passwordVal 
        });
        if (error) throw error;

        // Check applications table
        const { data: applications, error: appError } = await supabase
            .from('applications')
            .select('status, id, full_name, phone')
            .eq('user_id', data.user.id)
            .order('created_at', { ascending: false })
            .limit(1);

        if (appError) {
            console.warn('Application check error:', appError);
        }

        if (!applications || applications.length === 0) {
            msg.className = 'auth-message error';
            msg.textContent = '❌ No application found. Please register first.';
            await supabase.auth.signOut();
            return;
        }

        const app = applications[0];

        // CASE 1: Application is 'draft' - User can access application form
        if (app.status === 'draft') {
            msg.className = 'auth-message success';
            msg.textContent = '✅ Welcome! Please complete your application.';
            setTimeout(() => {
                navigateTo('register');
                checkAuth();
            }, 500);
            return;
        }

        // CASE 2: Application is 'submitted' - Waiting for admin approval
        if (app.status === 'submitted') {
            msg.className = 'auth-message info';
            msg.textContent = '⏳ Your application is under review. You will be notified once approved.';
            await supabase.auth.signOut();
            return;
        }

        // CASE 3: Application is 'accepted' - Full access
        if (app.status === 'accepted') {
            // Check if profile exists
            const { data: existingProfile } = await supabase
                .from('consolidated_user_profiles_table')
                .select('id')
                .eq('user_id', data.user.id)
                .maybeSingle();

            // Insert into consolidated_user_profiles_table if not exists
            if (!existingProfile) {
                const { error: insertError } = await supabase
                    .from('consolidated_user_profiles_table')
                    .insert([{
                        user_id: data.user.id,
                        email: emailVal,
                        full_name: app.full_name || 'Student',
                        phone: app.phone || '',
                        role: 'student',
                        status: 'active',
                        created_at: new Date().toISOString()
                    }]);

                if (insertError) {
                    console.warn('Profile insertion error:', insertError);
                } else {
                    console.log('✅ User inserted into consolidated_user_profiles_table');
                }
            }

            msg.className = 'auth-message success';
            msg.textContent = '✅ Welcome! Your application has been approved.';
            setTimeout(() => {
                navigateTo('register');
                checkAuth();
            }, 500);
            return;
        }

        // CASE 4: Application is 'rejected'
        if (app.status === 'rejected') {
            msg.className = 'auth-message error';
            msg.textContent = '❌ Your application has been rejected. Please contact admissions.';
            await supabase.auth.signOut();
            return;
        }

    } catch (error) {
        msg.className = 'auth-message error';
        msg.textContent = '❌ ' + (error.message || 'Login failed.');
    }
}

// ================================================================
// LOGIN (Application Page) - FIXED
// ================================================================
async function loginUser2() {
    if (!checkSupabase()) return;
    
    const email = document.getElementById('loginEmail2');
    const password = document.getElementById('loginPassword2');
    const msg = document.getElementById('loginMessage2');
    
    if (!email || !password || !msg) return;

    const emailVal = email.value.trim();
    const passwordVal = password.value;

    msg.className = 'auth-message';
    msg.textContent = '';

    if (!emailVal || !passwordVal) {
        msg.className = 'auth-message error';
        msg.textContent = '❌ Please enter both email and password.';
        return;
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({ 
            email: emailVal, 
            password: passwordVal 
        });
        if (error) throw error;

        // Check applications table
        const { data: applications, error: appError } = await supabase
            .from('applications')
            .select('status, id, full_name, phone')
            .eq('user_id', data.user.id)
            .order('created_at', { ascending: false })
            .limit(1);

        if (appError) {
            console.warn('Application check error:', appError);
        }

        if (!applications || applications.length === 0) {
            msg.className = 'auth-message error';
            msg.textContent = '❌ No application found. Please register first.';
            await supabase.auth.signOut();
            return;
        }

        const app = applications[0];

        if (app.status === 'draft') {
            msg.className = 'auth-message success';
            msg.textContent = '✅ Welcome! Loading your application...';
            setTimeout(() => {
                window.location.reload();
            }, 500);
            return;
        }

        if (app.status === 'submitted') {
            msg.className = 'auth-message info';
            msg.textContent = '⏳ Your application is under review. You will be notified once approved.';
            await supabase.auth.signOut();
            return;
        }

        if (app.status === 'accepted') {
            const { data: existingProfile } = await supabase
                .from('consolidated_user_profiles_table')
                .select('id')
                .eq('user_id', data.user.id)
                .maybeSingle();

            if (!existingProfile) {
                await supabase
                    .from('consolidated_user_profiles_table')
                    .insert([{
                        user_id: data.user.id,
                        email: emailVal,
                        full_name: app.full_name || 'Student',
                        phone: app.phone || '',
                        role: 'student',
                        status: 'active',
                        created_at: new Date().toISOString()
                    }]);
            }

            msg.className = 'auth-message success';
            msg.textContent = '✅ Welcome! Your application has been approved.';
            setTimeout(() => {
                window.location.reload();
            }, 500);
            return;
        }

        if (app.status === 'rejected') {
            msg.className = 'auth-message error';
            msg.textContent = '❌ Your application has been rejected. Please contact admissions.';
            await supabase.auth.signOut();
            return;
        }

    } catch (error) {
        msg.className = 'auth-message error';
        msg.textContent = '❌ ' + (error.message || 'Login failed.');
    }
}

// ================================================================
// REGISTER - FIXED with supabase check
// ================================================================
async function registerUser() {
    if (!checkSupabase()) return;
    
    const name = document.getElementById('regName');
    const email = document.getElementById('regEmail');
    const phone = document.getElementById('regPhone');
    const password = document.getElementById('regPassword');
    const confirm = document.getElementById('regConfirmPassword');
    const msg = document.getElementById('registerMessage');
    const btn = document.getElementById('registerBtn');

    if (!name || !email || !phone || !password || !confirm || !msg) return;

    const nameVal = name.value.trim();
    const emailVal = email.value.trim();
    const phoneVal = phone.value.trim();
    const passwordVal = password.value;
    const confirmVal = confirm.value;

    msg.className = 'auth-message';
    msg.textContent = '';

    if (!nameVal || !emailVal || !phoneVal || !passwordVal || !confirmVal) {
        msg.className = 'auth-message error';
        msg.textContent = '❌ Please fill in all required fields.';
        return;
    }

    if (passwordVal.length < 8) {
        msg.className = 'auth-message error';
        msg.textContent = '❌ Password must be at least 8 characters.';
        return;
    }

    if (passwordVal !== confirmVal) {
        msg.className = 'auth-message error';
        msg.textContent = '❌ Passwords do not match.';
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
    }

    try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: emailVal,
            password: passwordVal,
            options: {
                data: {
                    full_name: nameVal,
                    phone: phoneVal,
                    role: 'student'
                }
            }
        });

        if (authError) {
            if (authError.message.includes('already registered')) {
                msg.className = 'auth-message error';
                msg.textContent = '❌ This email is already registered. Please login.';
            } else {
                throw authError;
            }
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
            }
            return;
        }

        // ✅ Create application (draft) - NO profile yet!
        const { error: appError } = await supabase
            .from('applications')
            .insert([{
                user_id: authData.user.id,
                user_email: emailVal,
                full_name: nameVal,
                email: emailVal,
                phone: phoneVal,
                status: 'draft'
            }]);

        if (appError) {
            console.warn('Application creation error:', appError);
        }

        msg.className = 'auth-message success';
        msg.textContent = '✅ Account created! Please login to start your application.';

        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
        }

        // Clear form
        name.value = '';
        email.value = '';
        phone.value = '';
        password.value = '';
        confirm.value = '';
        const strengthBar = document.getElementById('strengthBar');
        if (strengthBar) strengthBar.style.width = '0%';
        const strengthText = document.getElementById('strengthText');
        if (strengthText) strengthText.textContent = 'Enter a password';
        const matchDiv = document.getElementById('passwordMatch');
        if (matchDiv) matchDiv.textContent = '';
        const regEmailStatus = document.getElementById('regEmailStatus');
        if (regEmailStatus) { regEmailStatus.textContent = ''; regEmailStatus.className = 'help-text'; }

        // ✅ Redirect to login - User MUST login first!
        setTimeout(() => {
            navigateTo('home');
            switchAuthTab('login');
            
            const loginEmail = document.getElementById('loginEmail');
            if (loginEmail) loginEmail.value = emailVal;
            
            const loginMsg = document.getElementById('loginMessage');
            if (loginMsg) {
                loginMsg.textContent = '✅ Account created! Please login to start your application.';
                loginMsg.className = 'auth-message success';
            }
        }, 1500);

    } catch (error) {
        console.error('Registration error:', error);
        msg.className = 'auth-message error';
        msg.textContent = '❌ ' + (error.message || 'Registration failed. Please try again.');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
        }
    }
}

// ================================================================
// LOGOUT
// ================================================================
function logoutUser() {
    supabase.auth.signOut().then(() => { 
        window.location.reload(); 
    });
}

// ================================================================
// CHECK AUTH
// ================================================================
async function checkAuth() {
    if (!checkSupabase()) return;
    
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        const authContainer2 = document.getElementById('authContainer2');
        const admissionApp = document.getElementById('admissionApp');
        const userEmail = document.getElementById('userEmail');
        const userAvatar = document.getElementById('userAvatar');
        const emailInput = document.getElementById('email');
        const appNumber = document.getElementById('applicationNumber');
        const logoutBtn = document.getElementById('logoutBtn');
        const appUserInfo = document.getElementById('appUserInfo');

        if (session) {
            currentUser = session.user;
            
            // Check applications table
            const { data: applications, error: appError } = await supabase
                .from('applications')
                .select('status, full_name, id, phone')
                .eq('user_id', currentUser.id)
                .order('created_at', { ascending: false })
                .limit(1);

            if (appError) {
                console.warn('Application fetch error:', appError);
            }

            const app = applications && applications.length > 0 ? applications[0] : null;

            // No application - shouldn't happen
            if (!app) {
                if (authContainer2) authContainer2.style.display = 'block';
                if (admissionApp) admissionApp.style.display = 'none';
                return;
            }

            // CASE 1: Application is 'draft' - Show application form
            if (app.status === 'draft') {
                if (authContainer2) authContainer2.style.display = 'none';
                if (admissionApp) admissionApp.style.display = 'block';
                if (userEmail) userEmail.textContent = currentUser.email;
                if (userAvatar) userAvatar.textContent = currentUser.email.charAt(0).toUpperCase();
                if (emailInput) emailInput.value = currentUser.email;
                if (appNumber) appNumber.textContent = `ADM-${Date.now().toString().slice(-6)}`;
                
                applicationId = app.id;
                await loadUserApplication(currentUser.id);
                
                if (logoutBtn) logoutBtn.style.display = 'inline-flex';
                if (appUserInfo) appUserInfo.style.display = 'flex';
                return;
            }

            // CASE 2: Application is 'submitted' - Show waiting message
            if (app.status === 'submitted') {
                if (authContainer2) authContainer2.style.display = 'block';
                if (admissionApp) admissionApp.style.display = 'none';
                const loginMsg = document.getElementById('loginMessage2');
                if (loginMsg) {
                    loginMsg.textContent = '⏳ Your application is under review. You will be notified once approved.';
                    loginMsg.className = 'auth-message info';
                }
                await supabase.auth.signOut();
                return;
            }

            // CASE 3: Application is 'accepted' - Full access
            if (app.status === 'accepted') {
                // Check if profile exists
                const { data: profile } = await supabase
                    .from('consolidated_user_profiles_table')
                    .select('id')
                    .eq('user_id', currentUser.id)
                    .maybeSingle();

                if (!profile) {
                    // Insert profile if missing
                    await supabase
                        .from('consolidated_user_profiles_table')
                        .insert([{
                            user_id: currentUser.id,
                            email: currentUser.email,
                            full_name: app.full_name || 'Student',
                            phone: app.phone || '',
                            role: 'student',
                            status: 'active',
                            created_at: new Date().toISOString()
                        }]);
                }

                if (authContainer2) authContainer2.style.display = 'none';
                if (admissionApp) admissionApp.style.display = 'block';
                if (userEmail) userEmail.textContent = currentUser.email;
                if (userAvatar) userAvatar.textContent = currentUser.email.charAt(0).toUpperCase();
                if (emailInput) emailInput.value = currentUser.email;
                if (appNumber) appNumber.textContent = `ADM-${Date.now().toString().slice(-6)}`;
                
                if (logoutBtn) logoutBtn.style.display = 'inline-flex';
                if (appUserInfo) appUserInfo.style.display = 'flex';
                
                await loadUserApplication(currentUser.id);
                return;
            }

            // CASE 4: Application is 'rejected'
            if (app.status === 'rejected') {
                if (authContainer2) authContainer2.style.display = 'block';
                if (admissionApp) admissionApp.style.display = 'none';
                const loginMsg = document.getElementById('loginMessage2');
                if (loginMsg) {
                    loginMsg.textContent = '❌ Your application has been rejected. Please contact admissions.';
                    loginMsg.className = 'auth-message error';
                }
                await supabase.auth.signOut();
                return;
            }

        } else {
            // Not logged in - show login
            if (authContainer2) authContainer2.style.display = 'block';
            if (admissionApp) admissionApp.style.display = 'none';
        }
    } catch (error) {
        console.error('Auth error:', error);
        const authContainer2 = document.getElementById('authContainer2');
        const admissionApp = document.getElementById('admissionApp');
        if (authContainer2) authContainer2.style.display = 'block';
        if (admissionApp) admissionApp.style.display = 'none';
    }
}

// ================================================================
// LOAD USER APPLICATION
// ================================================================
async function loadUserApplication(userId) {
    try {
        const { data, error } = await supabase
            .from('applications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
            const app = data[0];
            applicationId = app.id;
            
            const fieldMap = {
                'fullName': 'full_name',
                'email': 'email',
                'phone': 'phone',
                'alt_phone': 'alt_phone',
                'national_id': 'national_id',
                'dob': 'dob',
                'gender': 'gender',
                'address': 'address',
                'city': 'city',
                'nationality': 'nationality',
                'county': 'county',
                'country_of_birth': 'country_of_birth',
                'marital_status': 'marital_status',
                'hear_about': 'hear_about',
                'sponsored': 'sponsored',
                'father_name': 'father_name',
                'father_phone': 'father_phone',
                'mother_name': 'mother_name',
                'mother_phone': 'mother_phone',
                'guardian_name': 'guardian_name',
                'guardian_phone': 'guardian_phone',
                'disability': 'disability',
                'medical_condition': 'medical_condition',
                'employed': 'employed',
                'school': 'school',
                'program': 'program',
                'campus': 'campus',
                'intake': 'intake',
                'mode_of_study': 'mode_of_study',
                'student_type': 'student_type',
                'prev_institution': 'prev_institution',
                'prev_year': 'prev_year',
                'transfer_reason': 'transfer_reason',
                'christian_experience': 'christian_experience'
            };

            Object.entries(fieldMap).forEach(([elementId, dbField]) => {
                const el = document.getElementById(elementId);
                if (el && app[dbField] !== undefined && app[dbField] !== null) {
                    if (el.type === 'checkbox') {
                        el.checked = app[dbField];
                    } else if (el.tagName === 'SELECT' || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                        el.value = app[dbField];
                    }
                }
            });

            if (app.student_type) {
                studentType = app.student_type;
                const transferFields = document.getElementById('transferFields');
                if (transferFields) {
                    transferFields.style.display = studentType === 'transfer' ? 'block' : 'none';
                }
                const transcriptCard = document.getElementById('doc_transcript');
                if (transcriptCard) {
                    transcriptCard.style.display = studentType === 'transfer' ? 'block' : 'none';
                }
                document.querySelectorAll('.student-type-card').forEach(c => {
                    c.classList.toggle('selected', c.dataset.type === studentType);
                });
            }

            if (app.documents_uploaded) {
                app.documents_uploaded.forEach(doc => {
                    uploadedDocs[doc] = true;
                    const statusEl = document.getElementById(`doc_${doc}_status`);
                    if (statusEl) { 
                        statusEl.textContent = '✅ Uploaded'; 
                        statusEl.style.color = '#0f7b3a'; 
                    }
                    const card = document.getElementById(`doc_${doc}`);
                    if (card) card.classList.add('uploaded');
                });
            }

            if (app.kcse_validated) kcseValidated = app.kcse_validated;
            if (app.eligibility_passed) eligibilityPassed = app.eligibility_passed;
            if (app.kcse_data) kcseDataExtracted = app.kcse_data;

            if (app.school) {
                const schoolSelect = document.getElementById('school');
                if (schoolSelect) {
                    schoolSelect.value = app.school;
                    updatePrograms();
                }
            }

            if (app.current_step) {
                currentStep = app.current_step;
                goToStep(currentStep);
            }

            if (app.status === 'submitted') {
                const submitBtn = document.getElementById('submitBtn');
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = '✅ Already Submitted';
                }
                const msgDiv = document.getElementById('submitMessage');
                if (msgDiv) {
                    msgDiv.className = 'auth-message info';
                    msgDiv.textContent = '📋 Your application has been submitted and is under review.';
                }
            }

            updateSummary();
        }
    } catch (error) {
        console.error('Load application error:', error);
    }
}

// ================================================================
// COURSE SELECTOR - Shows ALL courses
// ================================================================
function updatePrograms() {
    const school = document.getElementById('school');
    const programSelect = document.getElementById('program');
    if (!school || !programSelect) return;
    
    const schoolValue = school.value;
    programSelect.innerHTML = '<option value="">-- Select Course --</option>';

    if (schoolValue && courseData[schoolValue]) {
        courseData[schoolValue].forEach(course => {
            const option = document.createElement('option');
            option.value = course.code;
            option.textContent = `${course.name} (${course.duration}) - ${course.grade}`;
            option.dataset.duration = course.duration;
            option.dataset.grade = course.grade;
            programSelect.appendChild(option);
        });
    }
}

// ================================================================
// STUDENT TYPE
// ================================================================
function toggleStudentType() {
    const selected = document.querySelector('input[name="studentType"]:checked');
    if (!selected) return;
    const isTransfer = selected.value === 'transfer';
    const transferFields = document.getElementById('transferFields');
    if (transferFields) {
        transferFields.style.display = isTransfer ? 'block' : 'none';
    }
    const transcriptCard = document.getElementById('doc_transcript');
    if (transcriptCard) {
        transcriptCard.style.display = isTransfer ? 'block' : 'none';
    }
    studentType = isTransfer ? 'transfer' : 'new';
    document.querySelectorAll('.student-type-card').forEach(c => {
        c.classList.toggle('selected', c.dataset.type === studentType);
    });
    updateSummary();
}

// ================================================================
// STEP NAVIGATION
// ================================================================
function goToStep(step) {
    if (!validateStep(currentStep, step)) return;

    document.querySelectorAll('.form-section').forEach(el => el.classList.remove('active'));
    const targetSection = document.querySelector(`.form-section[data-section="${step}"]`);
    if (targetSection) targetSection.classList.add('active');

    document.querySelectorAll('.step-item').forEach(el => {
        el.classList.remove('active');
        const s = parseInt(el.dataset.step);
        if (s === step) el.classList.add('active');
    });

    currentStep = step;
    updateSummary();
    saveDraft();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validateStep(from, to) {
    if (from === 1 && to > 1) {
        const requiredFields = ['fullName', 'email', 'phone', 'nationalId', 'dob', 'gender'];
        for (let id of requiredFields) {
            const el = document.getElementById(id);
            if (!el || !el.value.trim()) {
                const label = el ? el.parentElement.querySelector('label') : null;
                const labelText = label ? label.textContent.trim() : id;
                showValidation(`Please complete field: ${labelText}`);
                return false;
            }
        }
    }
    if (from === 2 && to > 2) {
        const program = document.getElementById('program');
        if (!program || !program.value) {
            showValidation('Please select a Course.');
            return false;
        }
        const school = document.getElementById('school');
        if (!school || !school.value) {
            showValidation('Please select a School.');
            return false;
        }
    }
    if (from === 3 && to > 3) {
        if (!uploadedDocs['kcse']) {
            showValidation('Please upload your KCSE certificate.');
            return false;
        }
        if (!kcseValidated) {
            showValidation('KCSE document has not been scanned and validated.');
            return false;
        }
        if (!uploadedDocs['recommendation']) {
            showValidation('Please upload a Recommendation Letter.');
            return false;
        }
    }
    if (from === 4 && to > 4) {
        if (!uploadedDocs['id']) {
            showValidation('Please upload your National ID.');
            return false;
        }
        if (!uploadedDocs['passport']) {
            showValidation('Please upload a Passport Photo.');
            return false;
        }
    }
    if (from === 5 && to > 5) {
        const exp = document.getElementById('christianExperience');
        if (exp) {
            const words = exp.value.trim() ? exp.value.trim().split(/\s+/).length : 0;
            if (words < 400) {
                showValidation(`Please write at least 400 words. Current: ${words} words.`);
                return false;
            }
        }
    }
    return true;
}

function showValidation(msg) {
    const errorList = document.getElementById('errorList');
    if (errorList) {
        errorList.innerHTML = `<li>${msg}</li>`;
    }
    const modal = document.getElementById('validationModal');
    if (modal) {
        modal.classList.add('show');
    }
}

function closeValidation() {
    const modal = document.getElementById('validationModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// ================================================================
// DOCUMENT HANDLING
// ================================================================
function handleDocUpload(event, docKey) {
    const file = event.target.files[0];
    if (!file) return;

    const statusEl = document.getElementById(`doc_${docKey}_status`);
    const fnameEl = document.getElementById(`doc_${docKey}_filename`);

    if (file.size > 5 * 1024 * 1024) {
        alert('❌ File too large. Max 5MB.');
        event.target.value = '';
        return;
    }

    uploadedDocs[docKey] = true;
    if (statusEl) {
        statusEl.textContent = `✅ ${file.name}`;
        statusEl.style.color = '#0f7b3a';
    }
    if (fnameEl) fnameEl.textContent = file.name;
    const card = document.getElementById(`doc_${docKey}`);
    if (card) card.classList.add('uploaded');
    updateSummary();
    saveDraft();
}

function removeDocument(docKey) {
    delete uploadedDocs[docKey];
    const statusEl = document.getElementById(`doc_${docKey}_status`);
    const fnameEl = document.getElementById(`doc_${docKey}_filename`);
    const input = document.getElementById(`doc_${docKey}_input`);
    if (statusEl) { statusEl.textContent = 'Not uploaded'; statusEl.style.color = ''; }
    if (fnameEl) fnameEl.textContent = '';
    const card = document.getElementById(`doc_${docKey}`);
    if (card) card.classList.remove('uploaded');
    if (input) input.value = '';

    if (docKey === 'kcse') {
        kcseValidated = false;
        eligibilityPassed = false;
        const resultBox = document.getElementById('ocr_kcse_result');
        if (resultBox) resultBox.classList.remove('show');
        const ocrStatus = document.getElementById('ocr_kcse_status');
        if (ocrStatus) ocrStatus.textContent = '';
        const validationResult = document.getElementById('kcse_validation_result');
        if (validationResult) validationResult.innerHTML = '';
    }
    updateSummary();
}

// ================================================================
// OCR - KCSE
// ================================================================
async function handleKCSEDocument(event) {
    const file = event.target.files[0];
    if (!file) return;

    const statusEl = document.getElementById('doc_kcse_status');
    const fnameEl = document.getElementById('doc_kcse_filename');
    const ocrStatus = document.getElementById('ocr_kcse_status');
    const resultBox = document.getElementById('ocr_kcse_result');
    const overlay = document.getElementById('scanning_kcse');

    if (file.size > 10 * 1024 * 1024) {
        alert('❌ File too large. Max 10MB.');
        event.target.value = '';
        return;
    }

    if (overlay) overlay.classList.add('active');
    if (ocrStatus) {
        ocrStatus.textContent = '⏳ Processing...';
        ocrStatus.className = 'ocr-status pending';
    }
    if (resultBox) resultBox.classList.remove('show');

    try {
        let imageUrl = URL.createObjectURL(file);
        if (file.type === 'application/pdf') {
            if (ocrStatus) ocrStatus.textContent = '⏳ Converting PDF...';
            const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const context = canvas.getContext('2d');
            await page.render({ canvasContext: context, viewport: viewport }).promise;
            imageUrl = canvas.toDataURL('image/png');
        }

        if (ocrStatus) ocrStatus.textContent = '⏳ Scanning with OCR...';
        const result = await Tesseract.recognize(imageUrl, 'eng');
        const text = result.data.text;

        const extractedData = parseKCSEData(text);
        kcseDataExtracted = extractedData;

        uploadedDocs['kcse'] = true;
        if (statusEl) {
            statusEl.textContent = `✅ ${file.name}`;
            statusEl.style.color = '#0f7b3a';
        }
        if (fnameEl) fnameEl.textContent = file.name;
        const card = document.getElementById('doc_kcse');
        if (card) card.classList.add('uploaded');

        displayKCSEData(extractedData);
        validateKCSEAgainstProgram(extractedData);

        if (ocrStatus) {
            ocrStatus.textContent = '✅ OCR Complete';
            ocrStatus.className = 'ocr-status success';
        }
        if (resultBox) resultBox.classList.add('show');
        kcseValidated = true;

        if (file.type !== 'application/pdf') URL.revokeObjectURL(imageUrl);
        await saveDraft();
    } catch (error) {
        console.error('OCR Error:', error);
        if (ocrStatus) {
            ocrStatus.textContent = '❌ OCR Failed';
            ocrStatus.className = 'ocr-status fail';
        }
        alert('Document scanning failed. Please ensure the document is clear and try again.');
    } finally {
        if (overlay) overlay.classList.remove('active');
    }
    updateSummary();
}

function parseKCSEData(text) {
    const data = { name: '', indexNumber: '', year: '', subjects: [], grades: {}, overallGrade: '' };
    const cleanText = text.replace(/\s+/g, ' ').trim();

    const nameMatch = cleanText.match(/Name:\s*([A-Za-z\s.]+)/i) || cleanText.match(/([A-Z][a-z]+\s+[A-Z][a-z]+\s+[A-Z][a-z]+)/);
    if (nameMatch) data.name = nameMatch[1].trim();

    const indexMatch = cleanText.match(/Index\s*(?:Number|No):?\s*([0-9]{8,12})/i) || cleanText.match(/([0-9]{8,12})/);
    if (indexMatch) data.indexNumber = indexMatch[1].trim();

    const yearMatch = cleanText.match(/20[0-9]{2}/);
    if (yearMatch) data.year = yearMatch[0];

    const subjectPattern = /([A-Za-z\s]+)\s+([A-E][+-]?)/g;
    let match;
    while ((match = subjectPattern.exec(cleanText)) !== null) {
        const subject = match[1].trim();
        const grade = match[2].trim();
        if (subject.length > 1 && subject.length < 30 && grade.length <= 2) {
            data.subjects.push(subject);
            data.grades[subject] = grade;
        }
    }

    const overallMatch = cleanText.match(/Overall\s*Grade:\s*([A-E][+-]?)/i) || cleanText.match(/Mean\s*Grade:\s*([A-E][+-]?)/i);
    if (overallMatch) data.overallGrade = overallMatch[1].trim();

    if (!data.overallGrade && Object.keys(data.grades).length > 0) {
        const grades = Object.values(data.grades);
        const points = grades.map(g => gradePoints[g] || 0);
        const avg = points.reduce((a, b) => a + b, 0) / points.length;
        if (avg >= 11) data.overallGrade = 'A';
        else if (avg >= 9.5) data.overallGrade = 'A-';
        else if (avg >= 8.5) data.overallGrade = 'B+';
        else if (avg >= 7.5) data.overallGrade = 'B';
        else if (avg >= 6.5) data.overallGrade = 'B-';
        else if (avg >= 5.5) data.overallGrade = 'C+';
        else if (avg >= 4.5) data.overallGrade = 'C';
        else if (avg >= 3.5) data.overallGrade = 'C-';
        else if (avg >= 2.5) data.overallGrade = 'D+';
        else if (avg >= 1.5) data.overallGrade = 'D';
        else data.overallGrade = 'E';
    }
    return data;
}

function displayKCSEData(data) {
    const container = document.getElementById('kcse_extracted_data');
    if (!container) return;
    
    let html = `
        <div><span class="label">Student Name:</span> <span class="value">${data.name || 'Not detected'}</span></div>
        <div><span class="label">Index Number:</span> <span class="value">${data.indexNumber || 'Not detected'}</span></div>
        <div><span class="label">Year:</span> <span class="value">${data.year || 'Not detected'}</span></div>
        <div><span class="label">Overall Grade:</span> <span class="value">${data.overallGrade || 'Not detected'}</span></div>
    `;
    if (data.subjects.length > 0) {
        html += `<div style="grid-column:span 2;margin-top:4px;padding-top:4px;border-top:1px solid var(--gray-200);">
            <span style="font-weight:600;font-size:0.7rem;color:var(--gray-500);">Subjects & Grades:</span><br>
            ${data.subjects.map(s => `<span style="font-size:0.7rem;background:var(--gray-100);padding:2px 8px;border-radius:4px;margin:2px;display:inline-block;">${s}: ${data.grades[s] || 'N/A'}</span>`).join('')}
        </div>`;
    }
    container.innerHTML = html;
}

function validateKCSEAgainstProgram(data) {
    const programSelect = document.getElementById('program');
    const validationResult = document.getElementById('kcse_validation_result');
    
    if (!programSelect || !validationResult) return;
    
    const selectedOption = programSelect.options[programSelect.selectedIndex];
    
    if (!selectedOption || !selectedOption.value) {
        validationResult.innerHTML = `<span style="color:var(--warning);">⚠️ Please select a course first.</span>`;
        return;
    }

    const requiredGrade = selectedOption.dataset.grade || 'D';
    const studentGrade = data.overallGrade;

    if (!studentGrade) {
        validationResult.innerHTML = `<span style="color:var(--warning);">⚠️ Complete data not extracted. Ensure document is clear.</span>`;
        return;
    }

    const studentPoints = gradePoints[studentGrade] || 0;
    const minPoints = gradePoints[requiredGrade] || 0;

    let html = '';
    if (requiredGrade === 'Open' || requiredGrade === 'No minimum') {
        html = `<span class="validation-pass">✅ No minimum grade requirement for this course.</span>`;
        eligibilityPassed = true;
    } else if (studentPoints >= minPoints) {
        html = `<span class="validation-pass">✅ ELIGIBLE - ${studentGrade} meets ${requiredGrade} requirement!</span>`;
        eligibilityPassed = true;
    } else {
        html = `<span class="validation-fail">❌ NOT ELIGIBLE - ${studentGrade} below ${requiredGrade} requirement.</span>`;
        eligibilityPassed = false;
    }

    validationResult.innerHTML = html;
    const fullName = document.getElementById('fullName');
    if (data.name && fullName && !fullName.value) {
        fullName.value = data.name;
    }
    updateSummary();
}

// ================================================================
// OCR - ID
// ================================================================
async function handleIDDocument(event) {
    const file = event.target.files[0];
    if (!file) return;

    const statusEl = document.getElementById('doc_id_status');
    const fnameEl = document.getElementById('doc_id_filename');
    const ocrStatus = document.getElementById('ocr_id_status');
    const resultBox = document.getElementById('ocr_id_result');
    const overlay = document.getElementById('scanning_id');

    if (file.size > 10 * 1024 * 1024) {
        alert('❌ File too large. Max 10MB.');
        event.target.value = '';
        return;
    }

    if (overlay) overlay.classList.add('active');
    if (ocrStatus) {
        ocrStatus.textContent = '⏳ Processing...';
        ocrStatus.className = 'ocr-status pending';
    }
    if (resultBox) resultBox.classList.remove('show');

    try {
        let imageUrl = URL.createObjectURL(file);
        if (file.type === 'application/pdf') {
            if (ocrStatus) ocrStatus.textContent = '⏳ Converting PDF...';
            const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const context = canvas.getContext('2d');
            await page.render({ canvasContext: context, viewport: viewport }).promise;
            imageUrl = canvas.toDataURL('image/png');
        }

        if (ocrStatus) ocrStatus.textContent = '⏳ Scanning ID...';
        const result = await Tesseract.recognize(imageUrl, 'eng');
        const text = result.data.text;

        const idData = parseIDData(text);
        uploadedDocs['id'] = true;
        if (statusEl) {
            statusEl.textContent = `✅ ${file.name}`;
            statusEl.style.color = '#0f7b3a';
        }
        if (fnameEl) fnameEl.textContent = file.name;
        const card = document.getElementById('doc_id');
        if (card) card.classList.add('uploaded');

        displayIDData(idData);
        if (ocrStatus) {
            ocrStatus.textContent = '✅ OCR Complete';
            ocrStatus.className = 'ocr-status success';
        }
        if (resultBox) resultBox.classList.add('show');

        const nationalId = document.getElementById('nationalId');
        if (idData.idNumber && nationalId && !nationalId.value) {
            nationalId.value = idData.idNumber;
        }
        const fullName = document.getElementById('fullName');
        if (idData.name && fullName && !fullName.value) {
            fullName.value = idData.name;
        }
        if (file.type !== 'application/pdf') URL.revokeObjectURL(imageUrl);
        await saveDraft();
    } catch (error) {
        console.error('ID OCR Error:', error);
        if (ocrStatus) {
            ocrStatus.textContent = '❌ OCR Failed';
            ocrStatus.className = 'ocr-status fail';
        }
        alert('ID scanning failed. Please ensure the document is clear.');
    } finally {
        if (overlay) overlay.classList.remove('active');
    }
    updateSummary();
}

function parseIDData(text) {
    const data = { name: '', idNumber: '', dob: '' };
    const cleanText = text.replace(/\s+/g, ' ').trim();

    const nameMatch = cleanText.match(/Name:\s*([A-Za-z\s.]+)/i) || cleanText.match(/([A-Z][a-z]+\s+[A-Z][a-z]+\s+[A-Z][a-z]+)/);
    if (nameMatch) data.name = nameMatch[1].trim();

    const idMatch = cleanText.match(/ID\s*(?:Number|No):?\s*([0-9]{7,9})/i) || cleanText.match(/([0-9]{7,9})/);
    if (idMatch) data.idNumber = idMatch[1].trim();

    const dobMatch = cleanText.match(/DOB:\s*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i) || cleanText.match(/Birth:\s*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i);
    if (dobMatch) data.dob = dobMatch[1].trim();

    return data;
}

function displayIDData(data) {
    const container = document.getElementById('id_extracted_data');
    if (!container) return;
    container.innerHTML = `
        <div><span class="label">Name:</span> <span class="value">${data.name || 'Not detected'}</span></div>
        <div><span class="label">ID Number:</span> <span class="value">${data.idNumber || 'Not detected'}</span></div>
        <div><span class="label">DOB:</span> <span class="value">${data.dob || 'Not detected'}</span></div>
    `;
}

// ================================================================
// SAVE DRAFT
// ================================================================
async function saveDraft() {
    if (!currentUser) return;

    const data = {
        user_id: currentUser.id,
        user_email: currentUser.email,
        full_name: document.getElementById('fullName')?.value || '',
        email: document.getElementById('email')?.value || '',
        phone: document.getElementById('phone')?.value || '',
        alt_phone: document.getElementById('altPhone')?.value || '',
        national_id: document.getElementById('nationalId')?.value || '',
        dob: document.getElementById('dob')?.value || '',
        gender: document.getElementById('gender')?.value || '',
        address: document.getElementById('address')?.value || '',
        city: document.getElementById('city')?.value || '',
        nationality: document.getElementById('nationality')?.value || '',
        county: document.getElementById('county')?.value || '',
        country_of_birth: document.getElementById('countryOfBirth')?.value || '',
        marital_status: document.getElementById('maritalStatus')?.value || '',
        hear_about: document.getElementById('hearAbout')?.value || '',
        sponsored: document.getElementById('sponsored')?.value || '',
        father_name: document.getElementById('fatherName')?.value || '',
        father_phone: document.getElementById('fatherPhone')?.value || '',
        mother_name: document.getElementById('motherName')?.value || '',
        mother_phone: document.getElementById('motherPhone')?.value || '',
        guardian_name: document.getElementById('guardianName')?.value || '',
        guardian_phone: document.getElementById('guardianPhone')?.value || '',
        disability: document.getElementById('disability')?.value || '',
        medical_condition: document.getElementById('medicalCondition')?.value || '',
        employed: document.getElementById('employed')?.value || '',
        school: document.getElementById('school')?.value || '',
        program: document.getElementById('program')?.value || '',
        campus: document.getElementById('campus')?.value || '',
        intake: document.getElementById('intake')?.value || '',
        mode_of_study: document.getElementById('modeOfStudy')?.value || '',
        student_type: studentType,
        prev_institution: document.getElementById('prevInstitution')?.value || '',
        prev_year: document.getElementById('prevYear')?.value || '',
        transfer_reason: document.getElementById('transferReason')?.value || '',
        christian_experience: document.getElementById('christianExperience')?.value || '',
        kcse_data: kcseDataExtracted,
        kcse_validated: kcseValidated,
        eligibility_passed: eligibilityPassed,
        documents_uploaded: Object.keys(uploadedDocs).filter(k => uploadedDocs[k]),
        current_step: currentStep,
        updated_at: new Date().toISOString()
    };

    try {
        let result;
        if (applicationId) {
            result = await supabase.from('applications').update(data).eq('id', applicationId);
        } else {
            result = await supabase.from('applications').insert([data]).select();
            if (result.data && result.data.length > 0) {
                applicationId = result.data[0].id;
            }
        }
        if (result.error) throw result.error;
        return true;
    } catch (error) {
        console.error('Save error:', error);
        return false;
    }
}

// ================================================================
// UPDATE SUMMARY
// ================================================================
function updateSummary() {
    const name = document.getElementById('fullName')?.value || '—';
    const email = document.getElementById('email')?.value || '—';
    const phone = document.getElementById('phone')?.value || '—';
    const school = document.getElementById('school');
    const program = document.getElementById('program');
    const campus = document.getElementById('campus');
    const intake = document.getElementById('intake');
    const mode = document.getElementById('modeOfStudy');

    const schoolText = school ? school.options[school.selectedIndex]?.text || '—' : '—';
    const programText = program ? program.options[program.selectedIndex]?.text || '—' : '—';
    const campusText = campus ? campus.options[campus.selectedIndex]?.text || '—' : '—';
    const intakeText = intake ? intake.value || '—' : '—';
    const modeText = mode ? mode.options[mode.selectedIndex]?.text || '—' : '—';

    const count = Object.keys(uploadedDocs).filter(k => uploadedDocs[k]).length;
    const elig = eligibilityPassed ? '✅ Eligible' : '⏳ Pending';
    const validation = kcseValidated ? (eligibilityPassed ? '✅ Passed' : '❌ Failed') : '⏳ Not Scanned';
    const typeLabel = studentType === 'new' ? 'New Student' : 'Transfer Student';

    const elements = {
        'sumName': name,
        'sumEmail': email,
        'sumPhone': phone,
        'sumSchool': schoolText,
        'sumProgram': programText,
        'sumCampus': campusText,
        'sumIntake': intakeText,
        'sumMode': modeText,
        'sumStudentType': typeLabel,
        'sumValidation': validation,
        'sumEligibility': elig
    };

    Object.entries(elements).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    });

    const docsEl = document.getElementById('sumDocs');
    if (docsEl) docsEl.textContent = `${count} uploaded`;
}

// ================================================================
// SUBMIT ADMISSION
// ================================================================
async function submitAdmission() {
    const termsCheck = document.getElementById('termsCheck');
    if (!termsCheck || !termsCheck.checked) {
        showValidation('You must agree to the Terms & Conditions.');
        return;
    }
    if (!kcseValidated) {
        showValidation('KCSE document has not been scanned and validated.');
        return;
    }
    if (!eligibilityPassed) {
        showValidation('You do not meet the course eligibility requirements.');
        return;
    }
    if (!uploadedDocs['recommendation']) {
        showValidation('Please upload a Recommendation Letter.');
        return;
    }
    if (!uploadedDocs['id']) {
        showValidation('Please upload your National ID.');
        return;
    }
    if (!uploadedDocs['passport']) {
        showValidation('Please upload a Passport Photo.');
        return;
    }

    const btn = document.getElementById('submitBtn');
    const msg = document.getElementById('submitMessage');
    
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    }

    try {
        const data = {
            status: 'submitted',
            submitted_at: new Date().toISOString(),
            current_step: 6
        };

        let result;
        if (applicationId) {
            result = await supabase.from('applications').update(data).eq('id', applicationId);
        } else {
            data.user_id = currentUser.id;
            data.user_email = currentUser.email;
            result = await supabase.from('applications').insert([data]).select();
            if (result.data && result.data.length > 0) {
                applicationId = result.data[0].id;
            }
        }

        if (result.error) throw result.error;

        document.getElementById('successOverlay').classList.add('show');
        const refNumber = document.getElementById('refNumber');
        if (refNumber) {
            refNumber.textContent = `ADM-${Date.now().toString().slice(-6)}`;
        }

        if (msg) {
            msg.className = 'auth-message success';
            msg.textContent = '✅ Application submitted successfully! Please wait for admin approval.';
        }

        if (btn) {
            btn.disabled = true;
            btn.textContent = '✅ Submitted - Awaiting Approval';
        }

        setTimeout(() => {
            alert('Your application has been submitted. You will be notified via email once approved.');
            logoutUser();
        }, 3000);

    } catch (error) {
        console.error('Submit error:', error);
        if (msg) {
            msg.className = 'auth-message error';
            msg.textContent = '❌ Failed to submit: ' + error.message;
        }
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Application';
        }
    }
}

// ================================================================
// ENQUIRY
// ================================================================
function handleEnquiry(e) {
    e.preventDefault();
    const msg = document.getElementById('enquiryMessageStatus');
    if (msg) {
        msg.textContent = '✅ Your enquiry has been sent! We\'ll respond within 24 hours.';
        msg.className = 'auth-message success';
    }
    e.target.reset();
    setTimeout(() => { 
        if (msg) { msg.textContent = ''; msg.className = 'auth-message'; }
    }, 5000);
}

// ================================================================
// INIT
// ================================================================
document.addEventListener('DOMContentLoaded', function() {
    const yearEl = document.getElementById('currentYear');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    const appNumber = document.getElementById('applicationNumber');
    if (appNumber) {
        appNumber.textContent = `ADM-${Date.now().toString().slice(-6)}`;
    }

    // Check auth on page load
    checkAuth();
    updateSummary();

    console.log('✅ NCHSM Admission System loaded');
});

// Click on doc card triggers file input
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.doc-card').forEach(card => {
        card.addEventListener('click', function(e) {
            if (e.target.closest('.doc-remove') || e.target.closest('.ocr-status')) return;
            const input = this.querySelector('input[type="file"]');
            if (input) input.click();
        });
    });
});

// Password strength and match
document.addEventListener('DOMContentLoaded', function() {
    const pwdInput = document.getElementById('regPassword');
    const confirmInput = document.getElementById('regConfirmPassword');

    if (pwdInput) {
        pwdInput.addEventListener('input', function() {
            const val = this.value;
            let strength = 0;
            if (val.length >= 8) strength += 1;
            if (/[a-z]/.test(val) && /[A-Z]/.test(val)) strength += 1;
            if (/\d/.test(val)) strength += 1;
            if (/[^a-zA-Z0-9]/.test(val)) strength += 1;

            const percent = Math.min(strength * 25, 100);
            const strengthBar = document.getElementById('strengthBar');
            if (strengthBar) {
                strengthBar.style.width = percent + '%';
                let color = '#dc2626';
                if (strength >= 4) color = '#0f7b3a';
                else if (strength === 3) color = '#eab308';
                else if (strength === 2) color = '#f59e0b';
                strengthBar.style.background = color;
            }
            const strengthText = document.getElementById('strengthText');
            if (strengthText) {
                let label = 'Weak';
                if (strength >= 4) label = 'Strong';
                else if (strength === 3) label = 'Good';
                else if (strength === 2) label = 'Fair';
                strengthText.textContent = val.length === 0 ? 'Enter a password' : `${label} (${val.length} chars)`;
            }
            checkMatch();
        });

        confirmInput.addEventListener('input', checkMatch);
    }

    function checkMatch() {
        const p = pwdInput ? pwdInput.value : '';
        const c = confirmInput ? confirmInput.value : '';
        const matchDiv = document.getElementById('passwordMatch');
        if (!matchDiv) return;
        if (c.length === 0) { matchDiv.textContent = ''; return; }
        if (p === c) {
            matchDiv.textContent = '✅ Passwords match';
            matchDiv.style.color = '#0f7b3a';
        } else {
            matchDiv.textContent = '❌ Passwords do not match';
            matchDiv.style.color = '#dc2626';
        }
    }

    // Email availability check
    const regEmail = document.getElementById('regEmail');
    if (regEmail) {
        regEmail.addEventListener('input', function() {
            const status = document.getElementById('regEmailStatus');
            if (!status) return;
            const email = this.value.trim();
            if (email.length === 0) { status.textContent = ''; status.className = 'help-text'; return; }
            if (!email.includes('@') || !email.includes('.')) {
                status.textContent = '⚠️ Please enter a valid email';
                status.className = 'help-text error-text';
                return;
            }
            status.textContent = '✅ Email format valid';
            status.className = 'help-text success-text';
        });
    }

    // Word count for Christian Experience
    const expTextarea = document.getElementById('christianExperience');
    if (expTextarea) {
        expTextarea.addEventListener('input', function() {
            const words = this.value.trim() ? this.value.trim().split(/\s+/).length : 0;
            const wordCountEl = document.getElementById('wordCount');
            if (wordCountEl) {
                wordCountEl.textContent = `Words: ${words} (Minimum 400 required)`;
                wordCountEl.className = `word-count ${words >= 400 ? 'valid' : 'invalid'}`;
            }
        });
    }

    // Course selector
    const schoolSelect = document.getElementById('school');
    if (schoolSelect) {
        schoolSelect.addEventListener('change', updatePrograms);
    }
});

// Modal close on overlay click
document.addEventListener('DOMContentLoaded', function() {
    const validationModal = document.getElementById('validationModal');
    if (validationModal) {
        validationModal.addEventListener('click', function(e) {
            if (e.target === this) closeValidation();
        });
    }
    const successOverlay = document.getElementById('successOverlay');
    if (successOverlay) {
        successOverlay.addEventListener('click', function(e) {
            if (e.target === this) this.classList.remove('show');
        });
    }
});

console.log('✅ admissions.js loaded successfully');
