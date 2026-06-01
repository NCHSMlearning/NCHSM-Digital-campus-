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
        
        // Keep errors with a prefix for production debugging
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

// ========== SUPABASE CLIENT INITIALIZATION ==========
// Create the supabase client that all modules expect

// Wait for Supabase library to load from CDN
function initSupabaseClient() {
    try {
        // Check if Supabase library is available (loaded from CDN in HTML)
        if (typeof supabase === 'undefined' && typeof createClient !== 'undefined') {
            // If supabase variable doesn't exist but createClient does
            window.supabase = createClient(
                'https://lwhtjozfsmbyihenfunw.supabase.co',
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk'
            );
            console.log('✅ Supabase client initialized via createClient');
        } else if (typeof supabase !== 'undefined' && supabase.createClient) {
            // If supabase object exists from CDN
            window.supabase = supabase.createClient(
                window.APP_CONFIG.SUPABASE_URL,
                window.APP_CONFIG.SUPABASE_ANON_KEY
            );
            console.log('✅ Supabase client initialized via supabase.createClient');
        } else if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
            window.supabase = window.supabase.createClient(
                window.APP_CONFIG.SUPABASE_URL,
                window.APP_CONFIG.SUPABASE_ANON_KEY
            );
            console.log('✅ Supabase client initialized via window.supabase.createClient');
        } else {
            // Last resort - try to use the global from CDN
            console.warn('⚠️ Supabase library not yet loaded, will retry...');
            setTimeout(initSupabaseClient, 100);
            return false;
        }
        
        // Verify the client works
        if (window.supabase && typeof window.supabase.from === 'function') {
            console.log('✅ Supabase client ready - .from() method available');
            return true;
        } else {
            console.error('❌ Supabase client created but .from() method missing');
            return false;
        }
    } catch (error) {
        console.error('❌ Failed to initialize Supabase client:', error);
        return false;
    }
}

window.APP_CONFIG = {
    // Public test Supabase credentials
    SUPABASE_URL: 'https://lwhtjozfsmbyihenfunw.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk',
    
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

// Initialize Supabase client immediately
// Try to initialize, retry if needed
let initAttempts = 0;
const maxInitAttempts = 10;

function tryInitSupabase() {
    initAttempts++;
    const success = initSupabaseClient();
    
    if (!success && initAttempts < maxInitAttempts) {
        console.log(`⏳ Retrying Supabase initialization (${initAttempts}/${maxInitAttempts})...`);
        setTimeout(tryInitSupabase, 200);
    } else if (!success) {
        console.error('❌ Failed to initialize Supabase after multiple attempts');
        // Create a fallback mock client to prevent crashes
        window.supabase = {
            from: (table) => ({
                select: () => Promise.resolve({ data: [], error: null }),
                insert: () => Promise.resolve({ data: [], error: null }),
                update: () => Promise.resolve({ data: [], error: null }),
                delete: () => Promise.resolve({ data: [], error: null }),
                eq: () => ({ select: () => Promise.resolve({ data: [], error: null }) })
            }),
            auth: {
                getSession: () => Promise.resolve({ data: { session: null }, error: null }),
                getUser: () => Promise.resolve({ data: { user: null }, error: null })
            }
        };
        console.warn('⚠️ Using fallback mock Supabase client');
    }
}

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

// Start Supabase initialization
tryInitSupabase();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.APP_CONFIG;
}

// Also expose a global function to check Supabase status
window.checkSupabaseStatus = function() {
    if (window.supabase && typeof window.supabase.from === 'function') {
        console.log('✅ Supabase is ready');
        return true;
    } else {
        console.warn('⚠️ Supabase not ready');
        return false;
    }
};
