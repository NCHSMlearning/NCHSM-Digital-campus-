// ============================================================
// ADMISSIONS.JS - Complete Application Logic (FULLY FIXED)
// ============================================================

// ============================================================
// SUPABASE CONFIGURATION - FIXED
// ============================================================

// Get Supabase client safely
function getSupabase() {
    // Try multiple ways to get the client
    if (typeof window.supabaseClient !== 'undefined' && window.supabaseClient) {
        return window.supabaseClient;
    }
    if (typeof window.sb !== 'undefined' && window.sb) {
        return window.sb;
    }
    if (typeof window.supabase !== 'undefined' && window.supabase) {
        if (window.supabase.from) {
            return window.supabase;
        }
        if (window.supabase.createClient) {
            const SUPABASE_URL = 'https://lwhtjozfsmbyihenfunw.supabase.co';
            const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk';
            window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            window.supabaseClient = window.sb;
            return window.sb;
        }
    }
    if (typeof supabase !== 'undefined' && supabase && supabase.createClient) {
        const SUPABASE_URL = 'https://lwhtjozfsmbyihenfunw.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk';
        window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        window.supabaseClient = window.sb;
        return window.sb;
    }
    console.error('❌ Supabase client not found');
    return null;
}

// Create global sb variable
let sb = getSupabase();

// ============================================================
// STATE VARIABLES
// ============================================================
let currentUser = null;
let currentStep = 1;
let uploadedDocs = {};
let eligibilityPassed = false;
let kcseValidated = false;
let emailValid = false;
let studentType = 'new';
let kcseDataExtracted = {};
let applicationId = null;
let emailCheckTimeout = null;

// ============================================================
// PROGRAM DATA
// ============================================================
const programCriteria = {
    'KRCHN': { minGrade: 'C+', subjects: ['English', 'Mathematics', 'Biology'], minSubjectGrades: { 'English': 'C', 'Mathematics': 'D+', 'Biology': 'C' } },
    'DCHN': { minGrade: 'C', subjects: ['English', 'Mathematics', 'Biology'], minSubjectGrades: { 'English': 'C', 'Mathematics': 'D', 'Biology': 'C' } },
    'DPOTT': { minGrade: 'C-', subjects: ['English', 'Mathematics', 'Biology'], minSubjectGrades: { 'English': 'D+', 'Mathematics': 'D', 'Biology': 'D+' } },
    'DCH': { minGrade: 'C-', subjects: ['English', 'Mathematics', 'Biology'], minSubjectGrades: { 'English': 'D+', 'Mathematics': 'D', 'Biology': 'D+' } },
    'DHRIT': { minGrade: 'C-', subjects: ['English', 'Mathematics'], minSubjectGrades: { 'English': 'D+', 'Mathematics': 'D' } },
    'DSL': { minGrade: 'C-', subjects: ['English', 'Mathematics', 'Chemistry'], minSubjectGrades: { 'English': 'D+', 'Mathematics': 'D', 'Chemistry': 'D+' } },
    'DSW': { minGrade: 'C-', subjects: ['English', 'Mathematics'], minSubjectGrades: { 'English': 'D+', 'Mathematics': 'D' } },
    'DCJS': { minGrade: 'C-', subjects: ['English', 'Mathematics'], minSubjectGrades: { 'English': 'D+', 'Mathematics': 'D' } },
    'DHSS': { minGrade: 'C-', subjects: ['English', 'Mathematics', 'Biology'], minSubjectGrades: { 'English': 'D+', 'Mathematics': 'D', 'Biology': 'D+' } },
    'DICT': { minGrade: 'C-', subjects: ['English', 'Mathematics'], minSubjectGrades: { 'English': 'D+', 'Mathematics': 'D' } },
    'DME': { minGrade: 'C', subjects: ['English', 'Mathematics', 'Physics'], minSubjectGrades: { 'English': 'C', 'Mathematics': 'C', 'Physics': 'C-' } },
    'CPOTT': { minGrade: 'D+', subjects: ['English', 'Mathematics', 'Biology'], minSubjectGrades: { 'English': 'D', 'Mathematics': 'D', 'Biology': 'D' } },
    'CCH': { minGrade: 'D+', subjects: ['English', 'Mathematics', 'Biology'], minSubjectGrades: { 'English': 'D', 'Mathematics': 'D', 'Biology': 'D' } },
    'CHRIT': { minGrade: 'D+', subjects: ['English', 'Mathematics'], minSubjectGrades: { 'English': 'D', 'Mathematics': 'D' } },
    'CPC': { minGrade: 'D', subjects: ['English', 'Mathematics', 'Biology'], minSubjectGrades: { 'English': 'D', 'Mathematics': 'D', 'Biology': 'D' } },
    'CSL': { minGrade: 'D+', subjects: ['English', 'Mathematics', 'Chemistry'], minSubjectGrades: { 'English': 'D', 'Mathematics': 'D', 'Chemistry': 'D' } },
    'CSW': { minGrade: 'D+', subjects: ['English', 'Mathematics'], minSubjectGrades: { 'English': 'D', 'Mathematics': 'D' } },
    'CCJS': { minGrade: 'D+', subjects: ['English', 'Mathematics'], minSubjectGrades: { 'English': 'D', 'Mathematics': 'D' } },
    'CAG': { minGrade: 'D', subjects: ['English', 'Mathematics'], minSubjectGrades: { 'English': 'D', 'Mathematics': 'D' } },
    'CHSS': { minGrade: 'D+', subjects: ['English', 'Mathematics', 'Biology'], minSubjectGrades: { 'English': 'D', 'Mathematics': 'D', 'Biology': 'D' } },
    'CICT': { minGrade: 'D+', subjects: ['English', 'Mathematics'], minSubjectGrades: { 'English': 'D', 'Mathematics': 'D' } },
    'CCG': { minGrade: 'D', subjects: ['English', 'Mathematics', 'Biology'], minSubjectGrades: { 'English': 'D', 'Mathematics': 'D', 'Biology': 'D' } },
    'COMT': { minGrade: 'D+', subjects: ['English', 'Mathematics', 'Biology'], minSubjectGrades: { 'English': 'D', 'Mathematics': 'D', 'Biology': 'D' } },
    'ACH': { minGrade: 'D', subjects: ['English', 'Mathematics'], minSubjectGrades: { 'English': 'D', 'Mathematics': 'D' } },
    'AAG': { minGrade: 'D', subjects: ['English', 'Mathematics'], minSubjectGrades: { 'English': 'D', 'Mathematics': 'D' } },
    'ASW': { minGrade: 'D', subjects: ['English', 'Mathematics'], minSubjectGrades: { 'English': 'D', 'Mathematics': 'D' } },
    'CCA': { minGrade: 'None', subjects: [], minSubjectGrades: {} },
    'PTE': { minGrade: 'None', subjects: [], minSubjectGrades: {} }
};

const gradePoints = {
    'A': 12, 'A-': 11, 'B+': 10, 'B': 9, 'B-': 8,
    'C+': 7, 'C': 6, 'C-': 5, 'D+': 4, 'D': 3, 'D-': 2, 'E': 1
};

const programNames = {
    'KRCHN': 'KRCHN Nursing',
    'DCHN': 'DCHN Nursing',
    'DPOTT': 'Diploma in Perioperative Theatre Technology',
    'DCH': 'Diploma in Community Health',
    'DHRIT': 'Diploma in Health Records & IT',
    'DSL': 'Diploma in Science Lab',
    'DSW': 'Diploma in Social Work',
    'DCJS': 'Diploma in Criminal Justice',
    'DHSS': 'Diploma in Health Support Services',
    'DICT': 'Diploma in ICT',
    'DME': 'Diploma in Medical Engineering',
    'CPOTT': 'Certificate in Perioperative Theatre Technology',
    'CCH': 'Certificate in Community Health',
    'CHRIT': 'Certificate in Health Records & IT',
    'CPC': 'Certificate in Patient Care',
    'CSL': 'Certificate in Science Lab',
    'CSW': 'Certificate in Social Work',
    'CCJS': 'Certificate in Criminal Justice',
    'CAG': 'Certificate in Agriculture',
    'CHSS': 'Certificate in Health Support Services',
    'CICT': 'Certificate in ICT',
    'CCG': 'Certificate in Caregiver',
    'COMT': 'Certificate in Orthopedic Trauma Medicine',
    'ACH': 'Artisan in Community Health',
    'AAG': 'Artisan in Agriculture',
    'ASW': 'Artisan in Social Work',
    'CCA': 'Certificate in Computer Applications',
    'PTE': 'TVET/CDACC PTE'
};

// ============================================================
// NAVIGATION FUNCTION (Page switching)
// ============================================================
function navigateTo(page) {
    // Hide all pages
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
    
    // Show the target page
    const targetPage = document.getElementById(`page-${page}`);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) {
            item.classList.add('active');
        }
    });
    
    // If going to register page, check auth state
    if (page === 'register') {
        checkAuthForRegisterPage();
    }
    
    // If going to login page, redirect to home with login tab active
    if (page === 'login') {
        document.getElementById('page-home').classList.add('active');
        switchAuthTab('login');
        document.querySelector('.auth-wrapper')?.scrollIntoView({ behavior: 'smooth' });
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === 'home') {
                item.classList.add('active');
            }
        });
    }
}

// ============================================================
// CHECK AUTH FOR REGISTER PAGE (Apply Now)
// ============================================================
async function checkAuthForRegisterPage() {
    const supabaseClient = getSupabase();
    if (!supabaseClient) return;

    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (error) throw error;
        
        if (session) {
            // User is logged in - show the application form
            currentUser = session.user;
            document.getElementById('authContainer2').style.display = 'none';
            document.getElementById('admissionApp').style.display = 'block';
            await loadUserApplication(currentUser.id);
        } else {
            // User is NOT logged in - show the auth container with register tab active
            document.getElementById('authContainer2').style.display = 'block';
            document.getElementById('admissionApp').style.display = 'none';
            // Default to register tab
            switchAuthTab2('register2');
        }
    } catch (error) {
        console.error('Auth check error:', error);
        document.getElementById('authContainer2').style.display = 'block';
        document.getElementById('admissionApp').style.display = 'none';
        switchAuthTab2('register2');
    }
}

// ============================================================
// UPDATE PROGRAMS FUNCTION (Populate courses based on school)
// ============================================================
function updatePrograms() {
    const school = document.getElementById('school').value;
    const programSelect = document.getElementById('program');
    
    programSelect.innerHTML = '<option value="">-- Select Course --</option>';
    
    const programs = {
        'nursing': [
            { value: 'KRCHN', label: 'KRCHN Nursing - 3.5 years' },
            { value: 'DCHN', label: 'DCHN Nursing - 3.5 years' }
        ],
        'healthcare': [
            { value: 'CNA', label: 'Certificate in Nursing Assistant (CNA) - 6 Months' },
            { value: 'CAREGIVER', label: 'Artisan in Caregiver - 2 Modules' },
            { value: 'HSS', label: 'Certificate in Health Services Support (Level 5) - 4 Modules' },
            { value: 'HBC', label: 'Craft in Homebased Care Level 3 - 2 Modules' },
            { value: 'HSSM', label: 'Health Systems Support Management (Level 6) - 6 Modules' }
        ],
        'health_social': [
            { value: 'DPOTT', label: 'Diploma in Perioperative Theatre Technology (Level 6) - 6 Modules' },
            { value: 'CPOTT', label: 'Certificate in Perioperative Theatre Technology (Level 5) - 4 Modules' },
            { value: 'DCH', label: 'Diploma in Community Health (Level 6) - 7 Modules' },
            { value: 'CCH', label: 'Certificate in Community Health (Level 5) - 4 Modules' },
            { value: 'DSW', label: 'Diploma in Social Work & Community Devt (Level 6) - 5 Modules' },
            { value: 'CSW', label: 'Certificate in Social Work & Community Devt (Level 5) - 3 Modules' },
            { value: 'DHRIT', label: 'Diploma in Health Records & IT (Level 6) - 7 Modules' },
            { value: 'CHRIT', label: 'Certificate in Health Records & IT (Level 5) - 4 Modules' },
            { value: 'COMT', label: 'Diploma in Orthopedic & Trauma Medicine (Level 6) - 6 Modules' },
            { value: 'COTM', label: 'Certificate in Orthopedic & Trauma Medicine (Level 5) - 4 Modules' },
            { value: 'DME', label: 'Diploma in Bio-Medical Engineering (Level 6) - 7 Modules' },
            { value: 'CBME', label: 'Certificate in Bio-Medical Engineering (Level 5) - 4 Modules' },
            { value: 'DSL', label: 'Diploma in Science Laboratory (Level 6) - 5 Modules' },
            { value: 'CSL', label: 'Certificate in Science Laboratory (Level 5) - 3 Modules' },
            { value: 'DCJS', label: 'Diploma in Criminal Safety Justice (Level 6) - 5 Modules' },
            { value: 'CCJS', label: 'Certificate in Criminal Safety Justice (Level 5) - 4 Modules' }
        ],
        'ict': [
            { value: 'DICT', label: 'Diploma in Information Communication Technology - 6 Modules' },
            { value: 'CICT', label: 'Certificate in Information Communication Technology - 4 Modules' },
            { value: 'DCP', label: 'Diploma in Computer Programming - 6 Modules' },
            { value: 'DCS', label: 'Diploma in Computer Science - 6 Modules' },
            { value: 'NSA', label: 'Network System Administration - 4 Modules' },
            { value: 'DCSEC', label: 'Diploma in Cyber Security (Level 6) - 6 Modules' }
        ],
        'ict_short': [
            { value: 'CCA', label: 'Certificate in Computer Applications - 1 Month' },
            { value: 'EXCEL', label: 'Certificate in Advance Microsoft Excel - 1 Month' },
            { value: 'GD', label: 'Certificate in Graphic Design - 3 Months' },
            { value: 'DM', label: 'Certificate in Digital Marketing - 2 Months' },
            { value: 'OA', label: 'Certificate in Office Administrator - 3 Months' }
        ]
    };
    
    if (school && programs[school]) {
        programs[school].forEach(prog => {
            const option = document.createElement('option');
            option.value = prog.value;
            option.textContent = prog.label;
            programSelect.appendChild(option);
        });
    }
}

// ============================================================
// TOGGLE STUDENT TYPE
// ============================================================
function toggleStudentType() {
    const selected = document.querySelector('input[name="studentType"]:checked');
    if (selected) {
        selectType(selected.value);
    }
}

// ============================================================
// AUTH FUNCTIONS - HOME PAGE
// ============================================================
function switchAuthTab(tab) {
    const tabs = document.querySelectorAll('.auth-tabs .tab');
    const forms = document.querySelectorAll('.auth-form');
    
    tabs.forEach(t => t.classList.remove('active'));
    forms.forEach(f => f.classList.remove('active'));
    
    document.querySelector(`.auth-tabs .tab[data-tab="${tab}"]`)?.classList.add('active');
    document.getElementById(tab === 'login' ? 'loginForm' : 'registerForm')?.classList.add('active');
    
    document.getElementById('loginMessage').className = 'auth-message';
    document.getElementById('loginMessage').textContent = '';
    document.getElementById('registerMessage').className = 'auth-message';
    document.getElementById('registerMessage').textContent = '';
}

// ============================================================
// LOGIN USER - HOME PAGE
// ============================================================
async function loginUser() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const msg = document.getElementById('loginMessage');
    const btn = document.getElementById('loginBtn');

    const supabaseClient = getSupabase();
    if (!supabaseClient) {
        msg.className = 'auth-message error';
        msg.textContent = '❌ System error. Please refresh the page.';
        return;
    }

    msg.className = 'auth-message';
    msg.textContent = '';

    if (!email || !password) {
        msg.className = 'auth-message error';
        msg.textContent = '❌ Please enter both email and password.';
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;

        msg.className = 'auth-message success';
        msg.textContent = '✅ Signed in successfully!';
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';

        // Check user status
        const { data: profile } = await supabaseClient
            .from('consolidated_user_profiles_table')
            .select('status, full_name')
            .eq('user_id', data.user.id)
            .single();

        if (profile && profile.status === 'pending') {
            msg.textContent = '⏳ Your account is pending admin approval. You will be notified via email.';
            await supabaseClient.auth.signOut();
            return;
        }

        // Redirect to register page to show application form
        setTimeout(() => {
            navigateTo('register');
        }, 1000);
    } catch (error) {
        console.error('Login error:', error);
        msg.className = 'auth-message error';
        msg.textContent = '❌ ' + (error.message || 'Login failed.');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
    }
}

// ============================================================
// REGISTER USER - HOME PAGE (Auto-Login)
// ============================================================
async function registerUser() {
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regConfirmPassword').value;
    const msg = document.getElementById('registerMessage');
    const btn = document.getElementById('registerBtn');

    const supabaseClient = getSupabase();
    if (!supabaseClient) {
        msg.className = 'auth-message error';
        msg.textContent = '❌ System error. Please refresh the page.';
        return;
    }

    msg.className = 'auth-message';
    msg.textContent = '';

    if (!name || !email || !phone || !password || !confirm) {
        msg.className = 'auth-message error';
        msg.textContent = '❌ Please fill in all required fields.';
        return;
    }

    if (password.length < 8) {
        msg.className = 'auth-message error';
        msg.textContent = '❌ Password must be at least 8 characters.';
        return;
    }

    if (password !== confirm) {
        msg.className = 'auth-message error';
        msg.textContent = '❌ Passwords do not match.';
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';

    try {
        const { data: existing } = await supabaseClient
            .from('applications')
            .select('user_email')
            .eq('user_email', email)
            .maybeSingle();

        if (existing) {
            msg.className = 'auth-message error';
            msg.textContent = '❌ This email already has an application. Please login.';
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
            return;
        }

        const { data: authData, error: authError } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                    phone: phone,
                    role: 'applicant',
                    status: 'pending_application'
                }
            }
        });

        if (authError) throw authError;

        // AUTO-LOGIN
        try {
            const { error: loginError } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });
            if (loginError) console.warn('Auto-login failed:', loginError);
        } catch (loginErr) {
            console.warn('Auto-login error:', loginErr);
        }

        // CREATE APPLICATION
        const { error: appError } = await supabaseClient
            .from('applications')
            .insert([{
                user_id: authData.user.id,
                user_email: email,
                full_name: name,
                email: email,
                phone: phone,
                status: 'draft',
                created_at: new Date().toISOString()
            }]);

        if (appError) throw appError;

        msg.className = 'auth-message success';
        msg.textContent = '✅ Account created! You are now logged in. Please complete your application.';

        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';

        // Redirect to register page to show application form
        setTimeout(() => {
            navigateTo('register');
        }, 1500);

    } catch (error) {
        console.error('Registration error:', error);
        msg.className = 'auth-message error';
        msg.textContent = '❌ ' + (error.message || 'Registration failed. Please try again.');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
    }
}

// ============================================================
// LOGOUT USER
// ============================================================
function logoutUser() {
    const supabaseClient = getSupabase();
    if (supabaseClient) {
        supabaseClient.auth.signOut().then(() => {
            window.location.reload();
        });
    } else {
        window.location.reload();
    }
}

// ============================================================
// CHECK AUTH - HOME PAGE
// ============================================================
async function checkAuth() {
    const supabaseClient = getSupabase();
    if (!supabaseClient) {
        console.error('❌ Supabase client not available for auth check');
        const authContainer = document.getElementById('authContainer');
        const admissionApp = document.getElementById('admissionApp');
        if (authContainer) authContainer.style.display = 'block';
        if (admissionApp) admissionApp.style.display = 'none';
        return;
    }

    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (error) throw error;
        if (session) {
            currentUser = session.user;
            const authContainer = document.getElementById('authContainer');
            const admissionApp = document.getElementById('admissionApp');
            if (authContainer) authContainer.style.display = 'none';
            if (admissionApp) admissionApp.style.display = 'block';
            
            const userEmail = document.getElementById('userEmail');
            const userAvatar = document.getElementById('userAvatar');
            const emailInput = document.getElementById('email');
            
            if (userEmail) userEmail.textContent = currentUser.email;
            if (userAvatar) userAvatar.textContent = currentUser.email.charAt(0).toUpperCase();
            if (emailInput) emailInput.value = currentUser.email;
            
            await loadUserApplication(currentUser.id);
        } else {
            const authContainer = document.getElementById('authContainer');
            const admissionApp = document.getElementById('admissionApp');
            if (authContainer) authContainer.style.display = 'block';
            if (admissionApp) admissionApp.style.display = 'none';
        }
    } catch (error) {
        console.error('Auth error:', error);
        const authContainer = document.getElementById('authContainer');
        const admissionApp = document.getElementById('admissionApp');
        if (authContainer) authContainer.style.display = 'block';
        if (admissionApp) admissionApp.style.display = 'none';
    }
}

// ============================================================
// LOAD USER APPLICATION
// ============================================================
async function loadUserApplication(userId) {
    const supabaseClient = getSupabase();
    if (!supabaseClient) return;

    try {
        const { data, error } = await supabaseClient
            .from('applications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
            const app = data[0];
            applicationId = app.id;

            if (app.full_name) document.getElementById('fullName').value = app.full_name;
            if (app.phone) document.getElementById('phone').value = app.phone;
            if (app.alt_phone) document.getElementById('altPhone').value = app.alt_phone;
            if (app.national_id) document.getElementById('nationalId').value = app.national_id;
            if (app.dob) document.getElementById('dob').value = app.dob;
            if (app.gender) document.getElementById('gender').value = app.gender;
            if (app.address) document.getElementById('address').value = app.address;
            if (app.guardian_name) document.getElementById('guardianName').value = app.guardian_name;
            if (app.guardian_phone) document.getElementById('guardianPhone').value = app.guardian_phone;
            if (app.emergency_name) document.getElementById('emergencyName').value = app.emergency_name;
            if (app.emergency_phone) document.getElementById('emergencyPhone').value = app.emergency_phone;
            if (app.emergency_relation) document.getElementById('emergencyRelation').value = app.emergency_relation;
            if (app.hear_about) document.getElementById('hearAbout').value = app.hear_about;
            if (app.program) document.getElementById('program').value = app.program;
            if (app.intake_month) document.getElementById('intakeMonth').value = app.intake_month;
            if (app.intake_year) document.getElementById('intakeYear').value = app.intake_year;
            if (app.prev_institution) document.getElementById('prevInstitution').value = app.prev_institution;
            if (app.prev_year) document.getElementById('prevYear').value = app.prev_year;
            if (app.transfer_reason) document.getElementById('transferReason').value = app.transfer_reason;
            if (app.student_type) selectType(app.student_type);
            if (app.eligibility_passed) eligibilityPassed = app.eligibility_passed;
            if (app.kcse_validated) kcseValidated = app.kcse_validated;
            if (app.kcse_data) kcseDataExtracted = app.kcse_data;

            if (app.documents_uploaded) {
                app.documents_uploaded.forEach(doc => {
                    uploadedDocs[doc] = true;
                    const card = document.getElementById(`doc_${doc}`);
                    const statusEl = document.getElementById(`doc_${doc}_status`);
                    if (card) card.classList.add('uploaded');
                    if (statusEl) {
                        statusEl.textContent = '✅ Uploaded';
                        statusEl.style.color = 'var(--success)';
                    }
                });
            }

            updateProgramDesc();
            updateIntakePreview();
            updateSummary();

            if (app.status === 'submitted') {
                const msg = document.getElementById('message');
                if (msg) {
                    msg.className = 'message info';
                    msg.textContent = '📋 You already have a submitted application.';
                }
                const submitBtn = document.getElementById('submitBtn');
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = '✅ Already Submitted';
                }
            }
        }
    } catch (error) {
        console.error('Load application error:', error);
    }
}

// ============================================================
// SAVE APPLICATION
// ============================================================
async function saveApplication(step) {
    const supabaseClient = getSupabase();
    if (!supabaseClient || !currentUser) return;

    const data = {
        user_id: currentUser.id,
        user_email: currentUser.email,
        full_name: document.getElementById('fullName').value,
        phone: document.getElementById('phone').value,
        alt_phone: document.getElementById('altPhone').value,
        national_id: document.getElementById('nationalId').value,
        dob: document.getElementById('dob').value,
        gender: document.getElementById('gender').value,
        address: document.getElementById('address').value,
        guardian_name: document.getElementById('guardianName').value,
        guardian_phone: document.getElementById('guardianPhone').value,
        emergency_name: document.getElementById('emergencyName').value,
        emergency_phone: document.getElementById('emergencyPhone').value,
        emergency_relation: document.getElementById('emergencyRelation').value,
        hear_about: document.getElementById('hearAbout').value,
        program: document.getElementById('program').value,
        program_name: programNames[document.getElementById('program').value] || '',
        intake_month: document.getElementById('intakeMonth').value,
        intake_year: document.getElementById('intakeYear').value,
        prev_institution: document.getElementById('prevInstitution').value,
        prev_year: document.getElementById('prevYear').value,
        transfer_reason: document.getElementById('transferReason').value,
        student_type: studentType,
        eligibility_passed: eligibilityPassed || false,
        kcse_validated: kcseValidated || false,
        kcse_data: kcseDataExtracted,
        documents_uploaded: Object.keys(uploadedDocs).filter(k => uploadedDocs[k]),
        current_step: step || currentStep,
        updated_at: new Date().toISOString()
    };

    try {
        let result;
        if (applicationId) {
            result = await supabaseClient.from('applications').update(data).eq('id', applicationId);
        } else {
            result = await supabaseClient.from('applications').insert([data]).select();
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

// ============================================================
// STUDENT TYPE
// ============================================================
function selectType(type) {
    studentType = type;
    document.querySelectorAll('.student-type-card').forEach(c => c.classList.remove('selected'));
    document.querySelector(`.student-type-card[data-type="${type}"]`)?.classList.add('selected');
    document.querySelector(`.student-type-card[data-type="${type}"] input[type="radio"]`)?.setAttribute('checked', 'checked');

    const prevEdu = document.getElementById('prevEducation');
    if (prevEdu) prevEdu.style.display = type === 'transfer' ? 'block' : 'none';

    const transcriptCard = document.getElementById('doc_transcript');
    const docDesc = document.getElementById('docSectionDesc');
    const reqText = document.getElementById('docRequirementsText');

    if (type === 'transfer') {
        if (transcriptCard) transcriptCard.style.display = 'flex';
        if (docDesc) docDesc.textContent = 'Transfer students must also submit academic transcripts.';
        if (reqText) reqText.textContent = 'KCSE, ID, and Recommendation required. Transfer students must upload transcripts.';
        document.getElementById('prevInstitution').required = true;
        document.getElementById('prevYear').required = true;
    } else {
        if (transcriptCard) transcriptCard.style.display = 'none';
        if (docDesc) docDesc.textContent = 'Upload your documents. KCSE, ID, and Recommendation required.';
        if (reqText) reqText.textContent = 'KCSE, ID, and Recommendation Letter are required for all students.';
        document.getElementById('prevInstitution').required = false;
        document.getElementById('prevYear').required = false;
    }
    updateSummary();
}

// ============================================================
// NAVIGATION - FORM STEPS
// ============================================================
function goToStep(step) {
    if (!validateStep(currentStep, step)) return;

    document.querySelectorAll('.form-section').forEach(el => el.classList.remove('active'));
    document.querySelector(`.form-section[data-section="${step}"]`)?.classList.add('active');

    document.querySelectorAll('.step-item').forEach(el => {
        el.classList.remove('active', 'completed');
        const s = parseInt(el.dataset.step);
        if (s === step) el.classList.add('active');
        else if (s < step) el.classList.add('completed');
    });

    currentStep = step;
    updateSummary();
    saveApplication(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validateStep(from, to) {
    if (from === 1 && to > 1) {
        const name = document.getElementById('fullName').value.trim();
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const id = document.getElementById('nationalId').value.trim();
        const dob = document.getElementById('dob').value;
        const gender = document.getElementById('gender').value;
        if (!name || !email || !phone || !id || !dob || !gender) {
            showValidation('Please complete all required personal details.');
            return false;
        }
        if (phone.length < 10) {
            showValidation('Phone number must be at least 10 digits.');
            return false;
        }
    }
    if (from === 2 && to > 2) {
        const program = document.getElementById('program').value;
        if (!program) {
            showValidation('Please select a Program.');
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
        if (studentType === 'transfer' && !uploadedDocs['transcript']) {
            showValidation('Transfer students must upload their Academic Transcript.');
            return false;
        }
    }
    return true;
}

function showValidation(msg) {
    document.getElementById('errorList').innerHTML = `<li>${msg}</li>`;
    document.getElementById('validationModal')?.classList.add('show');
}

function closeValidation() {
    document.getElementById('validationModal')?.classList.remove('show');
}

// ============================================================
// PROGRAM FUNCTIONS
// ============================================================
function updateProgramDesc() {
    const select = document.getElementById('program');
    const desc = document.getElementById('programDesc');
    const map = {
        'KRCHN': '🎓 KRCHN Nursing · 3.5 years · Min C+',
        'DCHN': '🎓 DCHN Nursing · 3.5 years · Min C',
        'DPOTT': '🔬 Perioperative Theatre Technology · 2 years · Min C-',
        'DCH': '🏥 Community Health · 2 years · Min C-',
        'DHRIT': '📊 Health Records & IT · 2 years · Min C-',
        'DSL': '🧪 Science Lab · 2 years · Min C-',
        'DSW': '🤝 Social Work · 2 years · Min C-',
        'DCJS': '⚖️ Criminal Justice · 2 years · Min C-',
        'DHSS': '🏥 Health Support Services · 2 years · Min C-',
        'DICT': '💻 ICT · 2 years · Min C-',
        'DME': '⚙️ Medical Engineering · 2 years · Min C',
        'CPOTT': '🔬 Certificate POTT · 1 year · Min D+',
        'CCH': '🏥 Certificate CH · 1 year · Min D+',
        'CHRIT': '📊 Certificate HRIT · 1 year · Min D+',
        'CPC': '🩺 Patient Care · 6 months · Min D',
        'CSL': '🧪 Science Lab · 1 year · Min D+',
        'CSW': '🤝 Social Work · 1 year · Min D+',
        'CCJS': '⚖️ Criminal Justice · 1 year · Min D+',
        'CAG': '🌾 Agriculture · 1 year · Min D',
        'CHSS': '🏥 Health Support Services · 1 year · Min D+',
        'CICT': '💻 ICT · 1 year · Min D+',
        'CCG': '👴 Caregiver · 6 months · Min D',
        'COMT': '🦴 Orthopedic Trauma · 1 year · Min D+',
        'ACH': '🌿 Artisan CH · 6 months · Min D',
        'AAG': '🌾 Artisan Agriculture · 6 months · Min D',
        'ASW': '🤝 Artisan Social Work · 6 months · Min D',
        'CCA': '💻 Computer Applications · 3 months · No min',
        'PTE': '📚 TVET/CDACC PTE · No min'
    };
    if (desc) desc.textContent = map[select.value] || 'Select a program to see details';
    updateCriteria();
}

function updateCriteria() {
    const program = document.getElementById('program').value;
    const criteria = programCriteria[program];
    const content = document.getElementById('criteriaContent');
    if (!content) return;
    
    if (!criteria) {
        content.innerHTML = `<div class="criteria-item"><span class="criterion">Select a program to view criteria</span></div>`;
        return;
    }
    let html = `
        <div class="criteria-item"><span class="criterion">Minimum Grade</span><span class="requirement">${criteria.minGrade}</span></div>
        <div class="criteria-item"><span class="criterion">Required Subjects</span><span class="requirement">${criteria.subjects.length > 0 ? criteria.subjects.join(', ') : 'None'}</span></div>
    `;
    if (criteria.minSubjectGrades) {
        html += `<div class="criteria-item" style="border-bottom:none;padding-top:4px;">
            <span class="criterion" style="color:var(--gray-400);font-size:0.7rem;">Min subject grades:</span>
            <span class="requirement" style="font-size:0.7rem;color:var(--gray-500);">
                ${Object.entries(criteria.minSubjectGrades).map(([subj, grade]) => `${subj}: ${grade}`).join(' · ')}
            </span>
        </div>`;
    }
    content.innerHTML = html;
}

function updateIntakePreview() {
    const month = document.getElementById('intakeMonth');
    const year = document.getElementById('intakeYear');
    const preview = document.getElementById('intakePreview');
    if (preview && month && year) {
        preview.textContent = `📅 Intake: ${month.options[month.selectedIndex]?.text || 'March'} ${year.value}`;
    }
}

// ============================================================
// ENQUIRY HANDLER
// ============================================================
function handleEnquiry(event) {
    event.preventDefault();
    const name = document.getElementById('enquiryName').value.trim();
    const email = document.getElementById('enquiryEmail').value.trim();
    const phone = document.getElementById('enquiryPhone').value.trim();
    const subject = document.getElementById('enquirySubject').value.trim();
    const message = document.getElementById('enquiryMessage').value.trim();
    const status = document.getElementById('enquiryMessageStatus');
    
    if (!name || !email || !subject || !message) {
        status.className = 'auth-message error';
        status.textContent = '❌ Please fill in all required fields.';
        return;
    }
    
    status.className = 'auth-message success';
    status.textContent = '✅ Your enquiry has been sent! We will get back to you within 24 hours.';
    
    document.getElementById('enquiryName').value = '';
    document.getElementById('enquiryEmail').value = '';
    document.getElementById('enquiryPhone').value = '';
    document.getElementById('enquirySubject').value = '';
    document.getElementById('enquiryMessage').value = '';
}

// ============================================================
// OCR - KCSE DOCUMENT
// ============================================================
async function handleKCSEDocument(event) {
    const file = event.target.files[0];
    if (!file) return;

    const card = document.getElementById('doc_kcse');
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
        console.log('OCR Text:', text);

        const extractedData = parseKCSEData(text);
        kcseDataExtracted = extractedData;

        uploadedDocs['kcse'] = true;
        if (statusEl) {
            statusEl.textContent = `✅ ${file.name}`;
            statusEl.style.color = 'var(--success)';
        }
        if (fnameEl) fnameEl.textContent = file.name;
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
        await saveApplication(currentStep);
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
    const program = document.getElementById('program').value;
    const criteria = programCriteria[program];
    const validationResult = document.getElementById('kcse_validation_result');

    if (!validationResult) return;

    if (!criteria || !data.overallGrade) {
        validationResult.innerHTML = `<span style="color:var(--warning);">⚠️ Complete data not extracted. Ensure document is clear.</span>`;
        return;
    }

    const studentPoints = gradePoints[data.overallGrade] || 0;
    const minPoints = gradePoints[criteria.minGrade] || 0;
    let allPass = true;
    let messages = [];

    if (criteria.minGrade === 'None') {
        messages.push('✅ No minimum grade requirement');
    } else if (studentPoints >= minPoints) {
        messages.push(`✅ Overall ${data.overallGrade} meets ${criteria.minGrade}`);
    } else {
        messages.push(`❌ Overall ${data.overallGrade} below ${criteria.minGrade}`);
        allPass = false;
    }

    if (criteria.subjects && criteria.subjects.length > 0) {
        criteria.subjects.forEach(subject => {
            let foundGrade = null;
            for (const [key, value] of Object.entries(data.grades)) {
                if (key.toLowerCase().includes(subject.toLowerCase()) ||
                    subject.toLowerCase().includes(key.toLowerCase())) {
                    foundGrade = value;
                    break;
                }
            }
            const requiredGrade = criteria.minSubjectGrades[subject] || 'D';
            if (foundGrade) {
                if ((gradePoints[foundGrade] || 0) >= (gradePoints[requiredGrade] || 0)) {
                    messages.push(`✅ ${subject}: ${foundGrade} meets ${requiredGrade}`);
                } else {
                    messages.push(`❌ ${subject}: ${foundGrade} below ${requiredGrade}`);
                    allPass = false;
                }
            } else {
                messages.push(`⚠️ ${subject}: Not found`);
                allPass = false;
            }
        });
    }

    let html = allPass ?
        `<span class="validation-pass">✅ ELIGIBLE - You meet all requirements!</span>` :
        `<span class="validation-fail">❌ NOT ELIGIBLE - You do not meet all requirements.</span>`;
    html += `<div style="margin-top:6px;font-size:0.7rem;color:var(--gray-500);">${messages.map(m => `• ${m}`).join('<br>')}</div>`;
    validationResult.innerHTML = html;
    eligibilityPassed = allPass;

    if (data.name && !document.getElementById('fullName').value) {
        document.getElementById('fullName').value = data.name;
    }
    updateSummary();
}

// ============================================================
// OCR - ID DOCUMENT
// ============================================================
async function handleIDDocument(event) {
    const file = event.target.files[0];
    if (!file) return;

    const card = document.getElementById('doc_id');
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
        console.log('ID OCR Text:', text);

        const idData = parseIDData(text);
        uploadedDocs['id'] = true;
        if (statusEl) {
            statusEl.textContent = `✅ ${file.name}`;
            statusEl.style.color = 'var(--success)';
        }
        if (fnameEl) fnameEl.textContent = file.name;
        if (card) card.classList.add('uploaded');

        displayIDData(idData);
        if (ocrStatus) {
            ocrStatus.textContent = '✅ OCR Complete';
            ocrStatus.className = 'ocr-status success';
        }
        if (resultBox) resultBox.classList.add('show');

        if (idData.idNumber && !document.getElementById('nationalId').value) {
            document.getElementById('nationalId').value = idData.idNumber;
        }
        if (idData.name && !document.getElementById('fullName').value) {
            document.getElementById('fullName').value = idData.name;
        }
        if (file.type !== 'application/pdf') URL.revokeObjectURL(imageUrl);
        await saveApplication(currentStep);
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

// ============================================================
// GENERAL DOCUMENT UPLOAD
// ============================================================
function handleDocUpload(event, docKey) {
    const file = event.target.files[0];
    if (!file) return;

    const card = document.getElementById(`doc_${docKey}`);
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
        statusEl.style.color = 'var(--success)';
    }
    if (fnameEl) fnameEl.textContent = file.name;
    if (card) card.classList.add('uploaded');
    updateSummary();
    saveApplication(currentStep);
}

function removeDocument(docKey) {
    delete uploadedDocs[docKey];
    const card = document.getElementById(`doc_${docKey}`);
    const statusEl = document.getElementById(`doc_${docKey}_status`);
    const fnameEl = document.getElementById(`doc_${docKey}_filename`);
    const input = document.getElementById(`doc_${docKey}_input`);
    
    if (statusEl) {
        statusEl.textContent = 'Not uploaded';
        statusEl.style.color = 'var(--gray-400)';
    }
    if (fnameEl) fnameEl.textContent = '';
    if (card) card.classList.remove('uploaded');
    if (input) input.value = '';

    if (docKey === 'kcse') {
        kcseValidated = false;
        eligibilityPassed = false;
        const resultBox = document.getElementById('ocr_kcse_result');
        const ocrStatus = document.getElementById('ocr_kcse_status');
        const validationResult = document.getElementById('kcse_validation_result');
        if (resultBox) resultBox.classList.remove('show');
        if (ocrStatus) ocrStatus.textContent = '';
        if (validationResult) validationResult.innerHTML = '';
    }
    updateSummary();
    saveApplication(currentStep);
}

// ============================================================
// DRAFT SAVE/LOAD
// ============================================================
function saveDraft() {
    saveApplication(currentStep);
    const msg = document.getElementById('message');
    if (msg) {
        msg.className = 'message success';
        msg.textContent = '✅ Draft saved to cloud!';
        setTimeout(() => { msg.className = 'message'; }, 3000);
    }
}

// ============================================================
// SUMMARY
// ============================================================
function updateSummary() {
    const name = document.getElementById('fullName')?.value || '—';
    const email = document.getElementById('email')?.value || '—';
    const phone = document.getElementById('phone')?.value || '—';
    const prog = document.getElementById('program');
    const progText = prog?.options[prog.selectedIndex]?.text || '—';
    const school = document.getElementById('school');
    const schoolText = school?.options[school.selectedIndex]?.text || '—';
    const campus = document.getElementById('campus');
    const campusText = campus?.options[campus.selectedIndex]?.text || '—';
    const intake = document.getElementById('intake');
    const intakeText = intake?.options[intake.selectedIndex]?.text || '—';
    const mode = document.getElementById('modeOfStudy');
    const modeText = mode?.options[mode.selectedIndex]?.text || '—';
    const count = Object.keys(uploadedDocs).filter(k => uploadedDocs[k]).length;
    const elig = eligibilityPassed ? '✅ Eligible' : '⏳ Pending';
    const validation = kcseValidated ? (eligibilityPassed ? '✅ Passed' : '❌ Failed') : '⏳ Not Scanned';
    const typeLabel = studentType === 'new' ? 'New Student' : 'Transfer Student';

    const ids = ['sumName', 'sumEmail', 'sumPhone', 'sumProgram', 'sumSchool', 'sumCampus', 'sumIntake', 'sumMode', 'sumStudentType', 'sumDocs', 'sumValidation', 'sumEligibility'];
    const values = [name, email, phone, progText, schoolText, campusText, intakeText, modeText, typeLabel, `${count} uploaded`, validation, elig];
    ids.forEach((id, i) => {
        const el = document.getElementById(id);
        if (el) el.textContent = values[i];
    });
}

// ============================================================
// SUBMIT ADMISSION
// ============================================================
async function submitAdmission() {
    if (!document.getElementById('termsCheck')?.checked) {
        showValidation('You must agree to the Terms & Conditions.');
        return;
    }
    if (!kcseValidated) {
        showValidation('KCSE document has not been scanned and validated.');
        return;
    }
    if (!eligibilityPassed) {
        showValidation('You do not meet the program eligibility requirements.');
        return;
    }
    if (!uploadedDocs['recommendation']) {
        showValidation('Please upload a Recommendation Letter.');
        return;
    }
    if (studentType === 'transfer' && !uploadedDocs['transcript']) {
        showValidation('Transfer students must upload their Academic Transcript.');
        return;
    }

    const btn = document.getElementById('submitBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    }

    try {
        const data = {
            status: 'submitted',
            submitted_at: new Date().toISOString(),
            current_step: 4
        };

        const supabaseClient = getSupabase();
        if (!supabaseClient) throw new Error('Supabase client not available');

        let result;
        if (applicationId) {
            result = await supabaseClient.from('applications').update(data).eq('id', applicationId);
        } else {
            data.user_id = currentUser.id;
            data.user_email = currentUser.email;
            result = await supabaseClient.from('applications').insert([data]).select();
            if (result.data && result.data.length > 0) {
                applicationId = result.data[0].id;
            }
        }

        if (result.error) throw result.error;

        const successOverlay = document.getElementById('successOverlay');
        const refNumber = document.getElementById('refNumber');
        if (successOverlay) successOverlay.classList.add('show');
        if (refNumber) refNumber.textContent = `ADM-${Date.now().toString().slice(-6)}`;

    } catch (error) {
        console.error('Submit error:', error);
        const msg = document.getElementById('message');
        if (msg) {
            msg.className = 'message error';
            msg.textContent = '❌ Failed to submit: ' + error.message;
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Application';
        }
    }
}

// ============================================================
// EMAIL VALIDATION & INIT
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    const yearEl = document.getElementById('currentYear');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    // Email validation on admission form
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.addEventListener('input', function() {
            const email = this.value.trim();
            const statusEl = document.getElementById('emailStatus');
            if (!email) {
                if (statusEl) {
                    statusEl.textContent = '';
                    statusEl.className = 'email-status';
                }
                return;
            }
            if (!email.includes('@') || !email.includes('.')) {
                if (statusEl) {
                    statusEl.textContent = '❌ Invalid email';
                    statusEl.className = 'email-status invalid';
                }
                return;
            }
            if (statusEl) {
                statusEl.textContent = '⏳ Checking...';
                statusEl.className = 'email-status checking';
            }
            setTimeout(() => {
                const domain = email.split('@')[1];
                if (domain && (['gmail.com', 'yahoo.com', 'outlook.com', 'nchsm.ac.ke'].includes(domain) ||
                        domain.endsWith('.ac.ke') || domain.endsWith('.ke'))) {
                    if (statusEl) {
                        statusEl.textContent = '✅ Valid email';
                        statusEl.className = 'email-status valid';
                    }
                } else {
                    if (statusEl) {
                        statusEl.textContent = '⚠️ Unusual domain';
                        statusEl.className = 'email-status invalid';
                    }
                }
            }, 400);
        });
    }

    // Register email validation
    const regEmail = document.getElementById('regEmail');
    if (regEmail) {
        regEmail.addEventListener('input', function() {
            const email = this.value.trim();
            const statusEl = document.getElementById('regEmailStatus');

            if (emailCheckTimeout) clearTimeout(emailCheckTimeout);

            if (!email) {
                if (statusEl) {
                    statusEl.textContent = '';
                    statusEl.style.color = '';
                }
                this.style.borderColor = '#e2e8f0';
                return;
            }

            if (!email.includes('@') || !email.includes('.')) {
                if (statusEl) {
                    statusEl.textContent = '❌ Invalid email format';
                    statusEl.style.color = '#ef4444';
                }
                this.style.borderColor = '#ef4444';
                return;
            }

            if (statusEl) {
                statusEl.textContent = '✅ Email format valid';
                statusEl.style.color = '#0b8a5e';
            }
            this.style.borderColor = '#0b8a5e';
        });
    }

    // Password strength
    const regPassword = document.getElementById('regPassword');
    if (regPassword) {
        regPassword.addEventListener('input', function() {
            const password = this.value;
            const bar = document.getElementById('strengthBar');
            const text = document.getElementById('strengthText');

            let score = 0;
            if (password.length >= 8) score++;
            if (password.length >= 12) score++;
            if (/[A-Z]/.test(password)) score++;
            if (/[a-z]/.test(password)) score++;
            if (/[0-9]/.test(password)) score++;
            if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

            const levels = [
                { text: 'Very Weak', cls: 'weak', width: '10%', color: '#ef4444' },
                { text: 'Weak', cls: 'weak', width: '25%', color: '#ef4444' },
                { text: 'Fair', cls: 'fair', width: '45%', color: '#f59e0b' },
                { text: 'Good', cls: 'good', width: '65%', color: '#3b82f6' },
                { text: 'Strong', cls: 'strong', width: '85%', color: '#0b8a5e' },
                { text: 'Very Strong', cls: 'strong', width: '100%', color: '#0b8a5e' }
            ];

            const level = Math.min(Math.floor(score / 1), 5);
            const result = levels[level] || levels[0];

            if (bar) {
                bar.style.width = result.width;
                bar.style.background = result.color;
            }
            if (text) {
                text.textContent = password.length > 0 ? `Strength: ${result.text}` : 'Enter a password';
                text.className = `strength-text ${password.length > 0 ? result.cls : ''}`;
            }
        });
    }

    // Password confirmation
    const regConfirm = document.getElementById('regConfirmPassword');
    if (regConfirm) {
        regConfirm.addEventListener('input', function() {
            const password = document.getElementById('regPassword').value;
            const confirm = this.value;
            const matchEl = document.getElementById('passwordMatch');

            if (!confirm) {
                if (matchEl) {
                    matchEl.textContent = '';
                    matchEl.className = 'password-match';
                }
                return;
            }

            if (password === confirm) {
                if (matchEl) {
                    matchEl.textContent = '✅ Passwords match';
                    matchEl.className = 'password-match match';
                }
            } else {
                if (matchEl) {
                    matchEl.textContent = '❌ Passwords do not match';
                    matchEl.className = 'password-match nomatch';
                }
            }
        });
    }

    // Check authentication on home page
    checkAuth();

    // Init form
    updateProgramDesc();
    updateIntakePreview();
    updateSummary();

    // Enter key support for home page auth
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const activeTab = document.querySelector('.auth-tabs .tab.active');
            if (activeTab && activeTab.dataset.tab === 'login') {
                loginUser();
            } else if (activeTab && activeTab.dataset.tab === 'register') {
                registerUser();
            }
        }
    });

    console.log('✅ NCHSM Admission System loaded');
});

// Click on doc card triggers file input
document.querySelectorAll('.doc-card').forEach(card => {
    card.addEventListener('click', function(e) {
        if (e.target.closest('.doc-remove') || e.target.closest('.ocr-status')) return;
        const input = this.querySelector('input[type="file"]');
        if (input) input.click();
    });
});

// Modal close on overlay click
document.getElementById('validationModal')?.addEventListener('click', function(e) {
    if (e.target === this) closeValidation();
});
document.getElementById('successOverlay')?.addEventListener('click', function(e) {
    if (e.target === this) this.classList.remove('show');
});

// ============================================================
// AUTH 2 FUNCTIONS (For Apply Now / Register Page)
// ============================================================

function switchAuthTab2(tab) {
    const container = document.getElementById('authContainer2');
    if (!container) return;

    const tabs = container.querySelectorAll('.auth-tabs .tab');
    const forms = container.querySelectorAll('.auth-form');

    tabs.forEach(t => t.classList.remove('active'));
    forms.forEach(f => f.classList.remove('active'));

    const tabBtn = container.querySelector(`.auth-tabs .tab[data-tab="${tab}"]`);
    if (tabBtn) tabBtn.classList.add('active');

    const formId = tab === 'login2' ? 'loginForm2' : 'registerForm2';
    const form = document.getElementById(formId);
    if (form) form.classList.add('active');

    document.getElementById('loginMessage2').className = 'auth-message';
    document.getElementById('loginMessage2').textContent = '';
    document.getElementById('registerMessage2').className = 'auth-message';
    document.getElementById('registerMessage2').textContent = '';
}

async function loginUser2() {
    const email = document.getElementById('loginEmail2').value.trim();
    const password = document.getElementById('loginPassword2').value;
    const msg = document.getElementById('loginMessage2');
    const btn = document.getElementById('loginBtn2');

    const supabaseClient = getSupabase();
    if (!supabaseClient) {
        msg.className = 'auth-message error';
        msg.textContent = '❌ System error. Please refresh the page.';
        return;
    }

    msg.className = 'auth-message';
    msg.textContent = '';

    if (!email || !password) {
        msg.className = 'auth-message error';
        msg.textContent = '❌ Please enter both email and password.';
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;

        msg.className = 'auth-message success';
        msg.textContent = '✅ Signed in successfully!';
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';

        const { data: profile } = await supabaseClient
            .from('consolidated_user_profiles_table')
            .select('status, full_name')
            .eq('user_id', data.user.id)
            .single();

        if (profile && profile.status === 'pending') {
            msg.textContent = '⏳ Your account is pending admin approval. You will be notified via email.';
            await supabaseClient.auth.signOut();
            return;
        }

        // Refresh the page to show application form
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    } catch (error) {
        console.error('Login error:', error);
        msg.className = 'auth-message error';
        msg.textContent = '❌ ' + (error.message || 'Login failed.');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
    }
}

async function registerUser2() {
    const name = document.getElementById('regName2').value.trim();
    const email = document.getElementById('regEmail2').value.trim();
    const phone = document.getElementById('regPhone2').value.trim();
    const password = document.getElementById('regPassword2').value;
    const confirm = document.getElementById('regConfirmPassword2').value;
    const msg = document.getElementById('registerMessage2');
    const btn = document.getElementById('registerBtn2');

    const supabaseClient = getSupabase();
    if (!supabaseClient) {
        msg.className = 'auth-message error';
        msg.textContent = '❌ System error. Please refresh the page.';
        return;
    }

    msg.className = 'auth-message';
    msg.textContent = '';

    if (!name || !email || !phone || !password || !confirm) {
        msg.className = 'auth-message error';
        msg.textContent = '❌ Please fill in all required fields.';
        return;
    }

    if (password.length < 8) {
        msg.className = 'auth-message error';
        msg.textContent = '❌ Password must be at least 8 characters.';
        return;
    }

    if (password !== confirm) {
        msg.className = 'auth-message error';
        msg.textContent = '❌ Passwords do not match.';
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';

    try {
        const { data: existing } = await supabaseClient
            .from('applications')
            .select('user_email')
            .eq('user_email', email)
            .maybeSingle();

        if (existing) {
            msg.className = 'auth-message error';
            msg.textContent = '❌ This email already has an application. Please login.';
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
            return;
        }

        const { data: authData, error: authError } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                    phone: phone,
                    role: 'applicant',
                    status: 'pending_application'
                }
            }
        });

        if (authError) throw authError;

        // Auto-login
        try {
            const { error: loginError } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });
            if (loginError) console.warn('Auto-login failed:', loginError);
        } catch (loginErr) {
            console.warn('Auto-login error:', loginErr);
        }

        // Create application
        const { error: appError } = await supabaseClient
            .from('applications')
            .insert([{
                user_id: authData.user.id,
                user_email: email,
                full_name: name,
                email: email,
                phone: phone,
                status: 'draft',
                created_at: new Date().toISOString()
            }]);

        if (appError) throw appError;

        msg.className = 'auth-message success';
        msg.textContent = '✅ Account created! You are now logged in.';

        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';

        // Refresh page to show application form
        setTimeout(() => {
            window.location.reload();
        }, 1500);

    } catch (error) {
        console.error('Registration error:', error);
        msg.className = 'auth-message error';
        msg.textContent = '❌ ' + (error.message || 'Registration failed. Please try again.');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
    }
}

// ============================================================
// REGISTER 2 - Email validation & password strength
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    const regEmail2 = document.getElementById('regEmail2');
    if (regEmail2) {
        regEmail2.addEventListener('input', function() {
            const email = this.value.trim();
            const statusEl = document.getElementById('regEmailStatus2');

            if (!email) {
                if (statusEl) {
                    statusEl.textContent = '';
                    statusEl.style.color = '';
                }
                this.style.borderColor = '#e2e8f0';
                return;
            }

            if (!email.includes('@') || !email.includes('.')) {
                if (statusEl) {
                    statusEl.textContent = '❌ Invalid email format';
                    statusEl.style.color = '#ef4444';
                }
                this.style.borderColor = '#ef4444';
                return;
            }

            if (statusEl) {
                statusEl.textContent = '✅ Email format valid';
                statusEl.style.color = '#0b8a5e';
            }
            this.style.borderColor = '#0b8a5e';
        });
    }

    const regPassword2 = document.getElementById('regPassword2');
    if (regPassword2) {
        regPassword2.addEventListener('input', function() {
            const password = this.value;
            const bar = document.getElementById('strengthBar2');
            const text = document.getElementById('strengthText2');

            let score = 0;
            if (password.length >= 8) score++;
            if (password.length >= 12) score++;
            if (/[A-Z]/.test(password)) score++;
            if (/[a-z]/.test(password)) score++;
            if (/[0-9]/.test(password)) score++;
            if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

            const levels = [
                { text: 'Very Weak', cls: 'weak', width: '10%', color: '#ef4444' },
                { text: 'Weak', cls: 'weak', width: '25%', color: '#ef4444' },
                { text: 'Fair', cls: 'fair', width: '45%', color: '#f59e0b' },
                { text: 'Good', cls: 'good', width: '65%', color: '#3b82f6' },
                { text: 'Strong', cls: 'strong', width: '85%', color: '#0b8a5e' },
                { text: 'Very Strong', cls: 'strong', width: '100%', color: '#0b8a5e' }
            ];

            const level = Math.min(Math.floor(score / 1), 5);
            const result = levels[level] || levels[0];

            if (bar) {
                bar.style.width = result.width;
                bar.style.background = result.color;
            }
            if (text) {
                text.textContent = password.length > 0 ? `Strength: ${result.text}` : 'Enter a password';
                text.className = `strength-text ${password.length > 0 ? result.cls : ''}`;
            }
        });
    }

    const regConfirm2 = document.getElementById('regConfirmPassword2');
    if (regConfirm2) {
        regConfirm2.addEventListener('input', function() {
            const password = document.getElementById('regPassword2').value;
            const confirm = this.value;
            const matchEl = document.getElementById('passwordMatch2');

            if (!confirm) {
                if (matchEl) {
                    matchEl.textContent = '';
                    matchEl.className = 'password-match';
                }
                return;
            }

            if (password === confirm) {
                if (matchEl) {
                    matchEl.textContent = '✅ Passwords match';
                    matchEl.className = 'password-match match';
                }
            } else {
                if (matchEl) {
                    matchEl.textContent = '❌ Passwords do not match';
                    matchEl.className = 'password-match nomatch';
                }
            }
        });
    }

    // Enter key support for auth2
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const activeTab = document.querySelector('#authContainer2 .auth-tabs .tab.active');
            if (activeTab && activeTab.dataset.tab === 'login2') {
                loginUser2();
            } else if (activeTab && activeTab.dataset.tab === 'register2') {
                registerUser2();
            }
        }
    });

    // Check auth for register page when it becomes visible
    const registerPage = document.getElementById('page-register');
    if (registerPage) {
        const observer = new MutationObserver(function() {
            if (registerPage.classList.contains('active')) {
                checkAuthForRegisterPage();
            }
        });
        observer.observe(registerPage, { attributes: true, attributeFilter: ['class'] });
    }
});

// ============================================================
// MAKE FUNCTIONS GLOBALLY AVAILABLE
// ============================================================
window.navigateTo = navigateTo;
window.updatePrograms = updatePrograms;
window.toggleStudentType = toggleStudentType;
window.switchAuthTab = switchAuthTab;
window.loginUser = loginUser;
window.registerUser = registerUser;
window.logoutUser = logoutUser;
window.goToStep = goToStep;
window.selectType = selectType;
window.handleKCSEDocument = handleKCSEDocument;
window.handleIDDocument = handleIDDocument;
window.handleDocUpload = handleDocUpload;
window.removeDocument = removeDocument;
window.saveDraft = saveDraft;
window.submitAdmission = submitAdmission;
window.updateProgramDesc = updateProgramDesc;
window.updateCriteria = updateCriteria;
window.updateIntakePreview = updateIntakePreview;
window.updateSummary = updateSummary;
window.closeValidation = closeValidation;
window.showValidation = showValidation;
window.handleEnquiry = handleEnquiry;
window.switchAuthTab2 = switchAuthTab2;
window.loginUser2 = loginUser2;
window.registerUser2 = registerUser2;
window.checkAuthForRegisterPage = checkAuthForRegisterPage;

console.log('✅ admissions.js loaded successfully');
