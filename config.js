// config.js - Configuration for NCHSM Student Portal & Lecturer Dashboard
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
        
        // Keep errors with a prefix (recommended for production debugging)
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

console.log('🚀 Loading NCHSM Portal Configuration');

// ============================================================
// APPLICATION CONFIGURATION
// ============================================================

window.APP_CONFIG = {
    // Public Supabase credentials
    SUPABASE_URL: 'https://lwhtjozfsmbyihenfunw.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk',
    
    // Optional LocationIQ API key (get from https://locationiq.com/)
    LOCATIONIQ_API_KEY: '',
    
    // Build information
    BUILD_TIME: '2024-12-26T12:00:00Z',
    COMMIT_SHA: 'v1.0.0',
    ENVIRONMENT: 'production',
    
    // Application settings
    APP_NAME: 'NCHSM Digital Portal',
    APP_VERSION: '2.1.0'
};

// ============================================================
// CREATE SUPABASE CLIENT INSTANCE
// ============================================================

// Check if supabase is available (loaded from CDN)
if (typeof supabase !== 'undefined') {
    try {
        // Create the Supabase client
        const supabaseClient = supabase.createClient(
            window.APP_CONFIG.SUPABASE_URL,
            window.APP_CONFIG.SUPABASE_ANON_KEY,
            {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true
                }
            }
        );
        
        // Expose globally as 'sb' (for lecturer-marks.js and others)
        window.sb = supabaseClient;
        
        // Also expose as supabaseClient for clarity
        window.supabaseClient = supabaseClient;
        
        if (!window.__LOGS_DISABLED) {
            console.log('✅ Supabase client created and exposed as window.sb');
        }
    } catch (error) {
        console.error('❌ Failed to create Supabase client:', error);
    }
} else {
    console.warn('⚠️ Supabase library not loaded. Make sure to include: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>');
}

// ============================================================
// FALLBACK: Ensure sb is defined (for modules that need it)
// ============================================================

if (typeof window.sb === 'undefined') {
    console.warn('⚠️ Creating fallback Supabase client...');
    try {
        // Try to create the client again
        if (typeof supabase !== 'undefined') {
            window.sb = supabase.createClient(
                window.APP_CONFIG.SUPABASE_URL,
                window.APP_CONFIG.SUPABASE_ANON_KEY
            );
            console.log('✅ Fallback Supabase client created');
        } else {
            // Create a dummy client that throws helpful errors
            window.sb = {
                auth: {
                    getUser: function() { 
                        console.error('❌ Supabase not initialized. Check your config.js loading.');
                        return Promise.reject(new Error('Supabase not initialized'));
                    },
                    getSession: function() {
                        console.error('❌ Supabase not initialized. Check your config.js loading.');
                        return Promise.reject(new Error('Supabase not initialized'));
                    }
                },
                from: function(table) {
                    console.error('❌ Supabase not initialized. Cannot query table:', table);
                    return {
                        select: function() { return this; },
                        eq: function() { return this; },
                        maybeSingle: function() { return Promise.reject(new Error('Supabase not initialized')); }
                    };
                }
            };
            console.warn('⚠️ Created dummy Supabase client. Real client will not work.');
        }
    } catch (e) {
        console.error('❌ Could not create fallback Supabase client:', e);
    }
}

// ============================================================
// VALIDATION
// ============================================================

if (!window.APP_CONFIG.SUPABASE_URL || !window.APP_CONFIG.SUPABASE_ANON_KEY) {
    console.error('❌ Missing Supabase credentials in APP_CONFIG');
}

if (!window.__LOGS_DISABLED) {
    console.log('✅ Configuration loaded successfully');
    console.log('App:', window.APP_CONFIG.APP_NAME);
    console.log('Version:', window.APP_CONFIG.APP_VERSION);
    console.log('Environment:', window.APP_CONFIG.ENVIRONMENT);
    console.log('Supabase client ready:', typeof window.sb !== 'undefined');
}

// ============================================================
// EXPORT (for module systems)
// ============================================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.APP_CONFIG;
}
