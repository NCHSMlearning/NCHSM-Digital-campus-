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
