// config.js - Fixed version with proper Supabase handling
console.log('🚀 Loading NCHSM Student Portal Configuration');

// ========== DISABLE CONSOLE LOGS IN PRODUCTION ==========
(function() {
    const isLocalhost = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1' ||
                        window.location.hostname.includes('.local');
    const urlParams = new URLSearchParams(window.location.search);
    const forceDebug = urlParams.get('debug') === 'true';
    const keepLogs = isLocalhost || forceDebug;
    
    if (!keepLogs) {
        const originalError = console.error;
        console.log = function() {};
        console.debug = function() {};
        console.info = function() {};
        console.warn = function() {};
        console.error = function(...args) {
            originalError('[NCHSM Error]', ...args);
        };
        window.__LOGS_DISABLED = true;
    } else {
        window.__LOGS_DISABLED = false;
        console.log('🔧 Debug mode enabled');
    }
})();

window.APP_CONFIG = {
    SUPABASE_URL: 'https://lwhtjozfsmbyihenfunw.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk',
    LOCATIONIQ_API_KEY: '',
    BUILD_TIME: new Date().toISOString(),
    ENVIRONMENT: 'production',
    APP_NAME: 'NCHSM Digital Student Portal',
    APP_VERSION: '2.1.0'
};

// Global supabase variable
window.supabase = null;
let supabaseInitPromise = null;

// Function to initialize Supabase - called after CDN loads
function initSupabaseClient() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 30; // 3 seconds max (30 * 100ms)
        
        const checkAndInit = () => {
            attempts++;
            
            // Check if Supabase library is available from CDN
            if (typeof supabase !== 'undefined' && supabase.createClient) {
                try {
                    window.supabase = supabase.createClient(
                        window.APP_CONFIG.SUPABASE_URL,
                        window.APP_CONFIG.SUPABASE_ANON_KEY
                    );
                    console.log('✅ Supabase client initialized successfully');
                    resolve(window.supabase);
                } catch (err) {
                    console.error('Failed to create Supabase client:', err);
                    reject(err);
                }
            } 
            // Also check window.supabase (in case it's already there)
            else if (window.supabase && window.supabase.createClient) {
                try {
                    window.supabase = window.supabase.createClient(
                        window.APP_CONFIG.SUPABASE_URL,
                        window.APP_CONFIG.SUPABASE_ANON_KEY
                    );
                    console.log('✅ Supabase client initialized from window');
                    resolve(window.supabase);
                } catch (err) {
                    reject(err);
                }
            }
            else if (attempts >= maxAttempts) {
                console.error('❌ Supabase library failed to load after', maxAttempts, 'attempts');
                reject(new Error('Supabase library not loaded'));
            }
            else {
                setTimeout(checkAndInit, 100);
            }
        };
        
        checkAndInit();
    });
}

// Start initialization immediately but don't block
supabaseInitPromise = initSupabaseClient().catch(err => {
    console.error('Supabase initialization failed:', err);
    return null;
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.APP_CONFIG;
}

// Helper function to wait for Supabase
window.waitForSupabase = async function(timeout = 5000) {
    if (window.supabase && typeof window.supabase.from === 'function') {
        return window.supabase;
    }
    
    if (supabaseInitPromise) {
        const result = await Promise.race([
            supabaseInitPromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
        ]);
        return result;
    }
    
    return null;
};

console.log('✅ Config loaded, waiting for Supabase CDN...');
