/**
 * FINANCE MODULE - AUTHENTICATION (FIXED - NO INFINITE LOOP)
 */

// ===== CHECK AUTHENTICATION ON PAGE LOAD =====
document.addEventListener('DOMContentLoaded', function() {
    // Get current page name
    const currentPage = window.location.pathname.split('/').pop();
    const isLoginPage = currentPage === 'financelogin.html' || currentPage === '';
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
    
    // If on login page and not authenticated, show login form
    if (isLoginPage && !isAuth) {
        console.log('✅ Showing login form');
        // Setup login form
        setupLoginForm();
    }
});

// ===== SETUP LOGIN FORM =====
function setupLoginForm() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) {
        console.warn('⚠️ Login form not found');
        return;
    }
    
    // Remove existing listeners to prevent duplicates
    const newForm = loginForm.cloneNode(true);
    loginForm.parentNode.replaceChild(newForm, loginForm);
    
    newForm.addEventListener('submit', handleLogin);
    console.log('✅ Login form setup complete');
}

// ===== HANDLE LOGIN =====
async function handleLogin(e) {
    e.preventDefault();
    console.log('🔐 Login attempt');
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    const loginBtn = document.getElementById('loginBtn');
    const errorDiv = document.getElementById('loginError');
    const errorText = document.getElementById('errorText');
    
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
        // Simulate API call
        const response = await simulateLogin(email, password);
        
        if (response.success) {
            // Store user data
            const userData = {
                ...response.user,
                token: response.token,
                rememberMe: rememberMe,
                loginTime: new Date().toISOString()
            };
            
            // Store in appropriate storage
            if (rememberMe) {
                localStorage.setItem('finance_user', JSON.stringify(userData));
            } else {
                sessionStorage.setItem('finance_user', JSON.stringify(userData));
            }
            
            showToast('Login successful! Redirecting...', 'success');
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = 'finance.html';
            }, 500);
            
        } else {
            showLoginError(response.message || 'Invalid credentials. Please try again.');
        }
        
    } catch (error) {
        console.error('Login error:', error);
        showLoginError('Network error. Please check your connection.');
    } finally {
        if (loginBtn) {
            loginBtn.classList.remove('loading');
            loginBtn.disabled = false;
        }
    }
}

// ===== SIMULATE LOGIN =====
async function simulateLogin(email, password) {
    return new Promise((resolve) => {
        setTimeout(() => {
            // Demo credentials
            const validUsers = [
                { 
                    email: 'admin@nchsm.ac.ke', 
                    password: 'admin123', 
                    role: 'superadmin', 
                    name: 'Super Admin',
                    studentId: 'SA001'
                },
                { 
                    email: 'finance@nchsm.ac.ke', 
                    password: 'finance123', 
                    role: 'finance_officer', 
                    name: 'Finance Officer',
                    studentId: 'FO001'
                },
                { 
                    email: 'student@nchsm.ac.ke', 
                    password: 'student123', 
                    role: 'student', 
                    name: 'John Student',
                    studentId: 'STU001',
                    program: 'KRCHN',
                    intake: 'March 2026'
                }
            ];
            
            const user = validUsers.find(u => 
                u.email.toLowerCase() === email.toLowerCase() && 
                u.password === password
            );
            
            if (user) {
                resolve({
                    success: true,
                    user: {
                        id: 'usr_' + Date.now(),
                        email: user.email,
                        name: user.name,
                        role: user.role,
                        studentId: user.studentId,
                        program: user.program || 'KRCHN',
                        intake: user.intake || 'March 2026'
                    },
                    token: 'token_' + Date.now() + '_' + Math.random().toString(36).substring(7)
                });
            } else {
                resolve({
                    success: false,
                    message: 'Invalid email or password. Try admin@nchsm.ac.ke / admin123'
                });
            }
        }, 800);
    });
}

// ===== SHOW LOGIN ERROR =====
function showLoginError(message) {
    const errorDiv = document.getElementById('loginError');
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
        // Check sessionStorage first
        let user = JSON.parse(sessionStorage.getItem('finance_user') || 'null');
        if (user) return user;
        
        // Check localStorage
        user = JSON.parse(localStorage.getItem('finance_user') || 'null');
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
    const nameDisplay = document.getElementById('userNameDisplay');
    const roleDisplay = document.getElementById('userRoleDisplay');
    const sidebarRole = document.getElementById('sidebarUserRole');
    const connectionStatus = document.getElementById('connectionStatus');
    
    if (nameDisplay) nameDisplay.textContent = user.name || 'User';
    
    if (roleDisplay) {
        const roleMap = {
            'superadmin': 'Super Admin',
            'admin': 'Administrator',
            'finance_officer': 'Finance Officer',
            'student': 'Student'
        };
        roleDisplay.textContent = roleMap[user.role] || user.role || 'User';
    }
    
    if (sidebarRole) {
        sidebarRole.textContent = roleDisplay ? roleDisplay.textContent : 'User';
    }
    
    if (connectionStatus) {
        connectionStatus.textContent = 'Online';
        connectionStatus.style.color = '#22c55e';
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
    const passwordInput = document.getElementById('loginPassword');
    const toggleIcon = document.getElementById('toggleIcon');
    
    if (!passwordInput) return;
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        if (toggleIcon) toggleIcon.className = 'fas fa-eye-slash';
    } else {
        passwordInput.type = 'password';
        if (toggleIcon) toggleIcon.className = 'fas fa-eye';
    }
}

// ===== LOGOUT =====
function logoutFinance() {
    localStorage.removeItem('finance_user');
    sessionStorage.removeItem('finance_user');
    showToast('Logged out successfully', 'info');
    setTimeout(() => {
        window.location.href = 'financelogin.html';
    }, 500);
}

// ===== SHOW TOAST =====
function showToast(message, type = 'info') {
    const container = document.getElementById('financeToastContainer');
    if (!container) {
        console.log(`[${type}] ${message}`);
        return;
    }
    
    const toast = document.createElement('div');
    toast.className = `finance-toast finance-toast-${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    toast.innerHTML = `
        <i class="fas ${icons[type] || icons.info}"></i>
        <span>${message}</span>
    `;
    
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

// ===== MODAL HELPERS =====
function showForgotPassword() {
    const modal = document.getElementById('forgotModal');
    if (modal) modal.classList.add('active');
}

function closeForgotModal() {
    const modal = document.getElementById('forgotModal');
    if (modal) modal.classList.remove('active');
}

function sendResetLink() {
    const email = document.getElementById('forgotEmail');
    if (!email || !email.value.trim()) {
        showToast('Please enter your email address.', 'warning');
        return;
    }
    showToast('Password reset link sent to your email.', 'success');
    closeForgotModal();
}

function showHelp() {
    showToast('Contact support at support@nchsm.ac.ke or call +254 700 000 000', 'info');
}

function goToMainDashboard() {
    window.location.href = '/index.html';
}

function toggleSidebar() {
    const sidebar = document.getElementById('financeSidebar');
    if (sidebar) sidebar.classList.toggle('open');
}

// ===== CLOSE MODALS =====
document.addEventListener('click', function(e) {
    document.querySelectorAll('.finance-modal.active').forEach(modal => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        document.querySelectorAll('.finance-modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
    }
});

console.log('✅ Finance Auth loaded successfully');
console.log('🔑 Authenticated:', isFinanceAuthenticated());
