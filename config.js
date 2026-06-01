// config.js - Configuration for NCHSM Student Portal
// This file contains PUBLIC test credentials
// For production, use GitHub Secrets with GitHub Actions

// ========== DISABLE CONSOLE LOGS IN PRODUCTION ==========
(function() {
    // Check if running on localhost or development
    const isLocalhost = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1' ||
                        window.location.hostname.includes('.local');
    
    // Check for debug parameter
    const urlParams = new URLSearchParams(window.location.search);
    const forceDebug = urlParams.get('debug') === 'true';
    
    // Only keep logs if localhost or debug flag is present
    const keepLogs = isLocalhost || forceDebug;
    
    if (!keepLogs) {
        // Store original error function (keep errors for debugging)
        const originalError = console.error;
        
        // Disable all console methods
        console.log = function() {};
        console.debug = function() {};
        console.info = function() {};
        console.warn = function() {};
        
        // Optional: Keep errors but silence them too (uncomment if desired)
        // console.error = function() {};
        
        // Or keep errors with a prefix (recommended for production debugging)
        console.error = function(...args) {
            originalError('[NCHSM Error]', ...args);
        };
        
        // Flag to indicate logs are disabled
        window.__LOGS_DISABLED = true;
    } else {
        window.__LOGS_DISABLED = false;
        console.log('🔧 Debug mode enabled - console logs visible');
    }
})();

console.log('🚀 Loading NCHSM Student Portal Configuration');

window.APP_CONFIG = {
    // Public test Supabase credentials
    SUPABASE_URL: 'https://lwhtjozfsmbyihenfunw.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk',
    
    // Optional LocationIQ API key (get from https://locationiq.com/)
    LOCATIONIQ_API_KEY: '',
    
    // Build information
    BUILD_TIME: '2024-12-26T12:00:00Z',
    COMMIT_SHA: 'v1.0.0',
    ENVIRONMENT: 'production',
    
    // Application settings
    APP_NAME: 'NCHSM Digital Student Portal',
    APP_VERSION: '2.1.0'
};

// ========== FIX: Initialize Supabase Client ==========
// This is what was MISSING from your original config.js

function initializeSupabase() {
    try {
        // Check if Supabase library is loaded from CDN
        if (typeof supabase !== 'undefined' && supabase.createClient) {
            window.supabase = supabase.createClient(
                window.APP_CONFIG.SUPABASE_URL,
                window.APP_CONFIG.SUPABASE_ANON_KEY
            );
            console.log('✅ Supabase client initialized successfully');
            return true;
        }
        // Check if it's available as window.supabase
        else if (window.supabase && window.supabase.createClient) {
            window.supabase = window.supabase.createClient(
                window.APP_CONFIG.SUPABASE_URL,
                window.APP_CONFIG.SUPABASE_ANON_KEY
            );
            console.log('✅ Supabase client initialized from window');
            return true;
        }
        else {
            console.warn('⏳ Waiting for Supabase library to load...');
            // Retry after delay
            setTimeout(initializeSupabase, 100);
            return false;
        }
    } catch (error) {
        console.error('❌ Failed to initialize Supabase:', error);
        return false;
    }
}

// Start initialization
let initAttempts = 0;
function tryInitSupabase() {
    initAttempts++;
    const success = initializeSupabase();
    
    if (!success && initAttempts < 50) { // Try for up to 5 seconds
        setTimeout(tryInitSupabase, 100);
    } else if (!success) {
        console.error('❌ Could not initialize Supabase after 50 attempts');
        // Create a mock client to prevent crashes
        window.supabase = {
            from: () => ({
                select: () => Promise.resolve({ data: [], error: null }),
                insert: () => Promise.resolve({ data: [], error: null }),
                update: () => Promise.resolve({ data: [], error: null }),
                delete: () => Promise.resolve({ data: [], error: null })
            }),
            auth: {
                getSession: () => Promise.resolve({ data: { session: null }, error: null }),
                getUser: () => Promise.resolve({ data: { user: null }, error: null })
            }
        };
        console.warn('⚠️ Using mock Supabase client');
    }
}

// Start trying to initialize Supabase
tryInitSupabase();

// Only show these logs if debugging is enabled
if (!window.__LOGS_DISABLED) {
    console.log('✅ Configuration loaded successfully');
    console.log('App:', window.APP_CONFIG.APP_NAME);
    console.log('Version:', window.APP_CONFIG.APP_VERSION);
    console.log('Environment:', window.APP_CONFIG.ENVIRONMENT);
}

// Optional: Add validation (always show errors)
if (!window.APP_CONFIG.SUPABASE_URL || !window.APP_CONFIG.SUPABASE_ANON_KEY) {
    console.error('❌ Missing Supabase credentials');
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.APP_CONFIG;
}
