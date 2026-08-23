/**
 * FINANCE MODULE - AUTHENTICATION (FIXED - CONNECTS TO SUPABASE)
 */

// ===== SUPABASE CONFIGURATION =====
const SUPABASE_URL = 'https://lwhtjozfsmbyihenfunw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk';

// Initialize Supabase client
let sbClient = null;

function initSupabaseAuth() {
    if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
        sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        window.sb = sbClient;
        console.log('✅ Supabase Auth client initialized');
        return true;
    }
    console.warn('⚠️ Supabase not loaded');
    return false;
}

// ===== CHECK AUTHENTICATION ON PAGE LOAD =====
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Supabase
    initSupabaseAuth();
    
    // Get current page name
    const currentPage = window.location.pathname.split('/').pop();
    const isLoginPage = currentPage === 'financelogin.html' || currentPage === '' || currentPage === 'finance-login.html';
    const isFinancePage = currentPage === 'finance.html';
    
    console.log('📍 Current page:', currentPage);
    console.log('🔐 Is login page:', isLoginPage);
    console.log('🔐 Is finance page:', isFinancePage);
    
    // Check authentication status
    const isAuth = isFinanceAuthenticated();
    console.log('🔑 Authenticated:', isAuth);
    
    // If on login page and authenticated, redirect to dashboard
    if (isLoginPage && isAuth) {
        console.log('➡️ Redirecting to finance.html (already logged in)');
        window.location.href = 'finance.html';
        return;
    }
    
    // If on finance page and NOT authenticated, redirect to login
    if (isFinancePage && !isAuth) {
        console.log('➡️ Redirecting to financelogin.html (not logged in)');
        window.location.href = 'financelogin.html';
        return;
    }
    
    // If on finance page and authenticated, load user data
    if (isFinancePage && isAuth) {
        console.log('✅ Loading finance dashboard');
        loadFinanceUser();
        resetSessionTimeout();
        // Initialize dashboard if function exists
        if (typeof loadDashboardData === 'function') {
            loadDashboardData();
        }
    }
    
    // If on login page and not authenticated, setup login form
    if (isLoginPage && !isAuth) {
        console.log('✅ Showing login form');
        setupLoginForm();
    }
});

// ===== SETUP LOGIN FORM =====
function setupLoginForm() {
    const loginBtn = document.getElementById('loginBtn');
    if (!loginBtn) {
        console.warn('⚠️ Login button not found');
        return;
    }
    
    // Remove existing listeners to prevent duplicates
    const newBtn = loginBtn.cloneNode(true);
    loginBtn.parentNode.replaceChild(newBtn, loginBtn);
    
    newBtn.addEventListener('click', handleLogin);
    
    // Also handle Enter key
    document.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const email = document.getElementById('email');
            const password = document.getElementById('password');
            if (email && password && document.activeElement === email || document.activeElement === password) {
                handleLogin(e);
            }
        }
    });
    
    console.log('✅ Login form setup complete');
}

// ===== HANDLE LOGIN =====
async function handleLogin(e) {
    if (e) e.preventDefault();
    console.log('🔐 Login attempt');
    
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');
    const errorDiv = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    
    if (!emailInput || !passwordInput) {
        console.error('Login form elements not found');
        return;
    }
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    // Reset error
    if (errorDiv) errorDiv.classList.remove('show');
    
    // Validate
    if (!email || !password) {
        showLoginError('Please enter both email and password.');
        return;
    }
    
    // Show loading
    if (loginBtn) {
        loginBtn.classList.add('loading');
        loginBtn.disabled = true;
    }
    
    try {
        // Authenticate with Supabase
        const { data: authData, error: authError } = await sbClient.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (authError) {
            console.error('❌ Auth error:', authError);
            throw new Error('Invalid email or password');
        }
        
        console.log('✅ Auth successful');
        
        // Get user profile from consolidated_user_profiles_table
        const { data: profile, error: profileError } = await sbClient
            .from('consolidated_user_profiles_table')
            .select('*')
            .eq('email', email)
            .single();
        
        if (profileError || !profile) {
            console.error('❌ Profile error:', profileError);
            await sbClient.auth.signOut();
            throw new Error('Account not found. Please contact administrator.');
        }
        
        console.log('📋 Profile found:', profile.full_name);
        console.log('🔑 Role:', profile.role);
        
        // ✅ Check for finance roles
        const userRole = (profile.role || '').toLowerCase();
        const financeRoles = ['superadmin', 'finance_officer'];
        
        if (!financeRoles.includes(userRole)) {
            console.error('❌ Invalid role:', userRole);
            await sbClient.auth.signOut();
            throw new Error('Access denied. You do not have finance privileges.');
        }
        
        console.log('✅ Finance access granted!');
        
        // Store user data
        const userData = {
            id: profile.id,
            email: profile.email,
            name: profile.full_name || profile.name || 'Finance Officer',
            role: userRole,
            student_id: profile.student_id || null,
            program: profile.program || null,
            phone: profile.phone || null,
            token: authData.session?.access_token || null,
            loginTime: new Date().toISOString()
        };
        
        // Store in localStorage
        localStorage.setItem('finance_user', JSON.stringify(userData));
        
        showToast(`Welcome ${userData.name}! Redirecting...`, 'success');
        
        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = 'finance.html';
        }, 800);
        
    } catch (error) {
        console.error('❌ Login error:', error);
        showLoginError(error.message || 'Login failed. Please try again.');
        
        // Shake animation
        const container = document.querySelector('.login-container');
        if (container) {
            container.classList.remove('shake');
            void container.offsetWidth;
            container.classList.add('shake');
        }
        
        if (passwordInput) passwordInput.value = '';
        if (passwordInput) passwordInput.focus();
        
    } finally {
        if (loginBtn) {
            loginBtn.classList.remove('loading');
            loginBtn.disabled = false;
        }
    }
}

// ===== SHOW LOGIN ERROR =====
function showLoginError(message) {
    const errorDiv = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    if (errorDiv && errorText) {
        errorText.textContent = message;
        errorDiv.classList.add('show');
    } else {
        alert(message);
    }
}

// ===== GET CURRENT FINANCE USER =====
function getCurrentFinanceUser() {
    try {
        // Check localStorage first
        let user = JSON.parse(localStorage.getItem('finance_user') || 'null');
        if (user) return user;
        
        // Check sessionStorage
        user = JSON.parse(sessionStorage.getItem('finance_user') || 'null');
        if (user) return user;
        
        return null;
    } catch (e) {
        console.error('Error getting user:', e);
        return null;
    }
}

// ===== CHECK IF AUTHENTICATED =====
function isFinanceAuthenticated() {
    const user = getCurrentFinanceUser();
    if (!user) return false;
    
    // Check if token exists
    if (!user.token) return false;
    
    // Check if token is expired (24 hours)
    if (user.loginTime) {
        const loginTime = new Date(user.loginTime);
        const now = new Date();
        const hoursDiff = (now - loginTime) / (1000 * 60 * 60);
        
        if (hoursDiff > 24) {
            localStorage.removeItem('finance_user');
            sessionStorage.removeItem('finance_user');
            return false;
        }
    }
    
    return true;
}

// ===== LOAD FINANCE USER =====
function loadFinanceUser() {
    const user = getCurrentFinanceUser();
    if (!user) return;
    
    console.log('👤 Loading user:', user.name);
    
    // Update UI elements
    const sidebarRole = document.getElementById('sidebarUserRole');
    
    if (sidebarRole) {
        const roleMap = {
            'superadmin': 'Super Admin',
            'finance_officer': 'Finance Officer'
        };
        sidebarRole.textContent = roleMap[user.role] || user.role || 'User';
    }
    
    updateCurrentDate();
}

// ===== UPDATE CURRENT DATE =====
function updateCurrentDate() {
    const dateDisplay = document.getElementById('currentDate');
    if (dateDisplay) {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateDisplay.textContent = now.toLocaleDateString('en-KE', options);
    }
}

// ===== TOGGLE PASSWORD =====
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleBtn = document.getElementById('togglePasswordBtn');
    
    if (!passwordInput) return;
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        if (toggleBtn) toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
    } else {
        passwordInput.type = 'password';
        if (toggleBtn) toggleBtn.innerHTML = '<i class="fas fa-eye"></i>';
    }
}

// ===== LOGOUT =====
function logoutFinance() {
    if (confirm('Are you sure you want to logout?')) {
        // Sign out from Supabase
        if (sbClient) {
            sbClient.auth.signOut();
        }
        
        localStorage.removeItem('finance_user');
        sessionStorage.removeItem('finance_user');
        showToast('Logged out successfully', 'info');
        setTimeout(() => {
            window.location.href = 'financelogin.html';
        }, 500);
    }
}

// ===== SHOW TOAST =====
function showToast(message, type = 'info') {
    const container = document.getElementById('financeToastContainer');
    if (!container) {
        console.log(`[${type}] ${message}`);
        return;
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ===== SESSION TIMEOUT =====
let sessionTimeout;

function resetSessionTimeout() {
    clearTimeout(sessionTimeout);
    sessionTimeout = setTimeout(() => {
        if (isFinanceAuthenticated()) {
            showToast('Your session is about to expire. Please save your work.', 'warning');
        }
    }, 30 * 60 * 1000);
}

// ===== HELPER FUNCTIONS =====
function showHelp() {
    showToast('Contact support at support@nchsm.ac.ke', 'info');
}

function goToMainDashboard() {
    window.location.href = '/home';
}

function toggleSidebar() {
    const sidebar = document.getElementById('financeSidebar');
    if (sidebar) sidebar.classList.toggle('open');
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
}

// ===== CLOSE MODALS =====
document.addEventListener('click', function(e) {
    document.querySelectorAll('.modal-overlay.active').forEach(modal => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(modal => {
            modal.classList.remove('active');
        });
    }
});

console.log('✅ Finance Auth loaded successfully (Supabase)');
console.log('🔑 Authenticated:', isFinanceAuthenticated());
