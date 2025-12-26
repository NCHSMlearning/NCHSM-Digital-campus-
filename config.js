// config.js - Configuration for NCHSM Student Portal
// This file contains PUBLIC test credentials
// For production, use GitHub Secrets with GitHub Actions

console.log('🚀 Loading NCHSM Student Portal Configuration');

window.APP_CONFIG = {
    // Public test Supabase credentials
    SUPABASE_URL: 'https://lwhtjozfsmbyihenfunw.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUzMjg4MDIsImV4cCI6MjA1MDkwNDgwMn0.NDVnKvL-_nItJ_kVEnPRoFGlklltWauyQJh_QQqI8HE',
    
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

console.log('✅ Configuration loaded successfully');
console.log('App:', window.APP_CONFIG.APP_NAME);
console.log('Version:', window.APP_CONFIG.APP_VERSION);
console.log('Environment:', window.APP_CONFIG.ENVIRONMENT);

// Optional: Add validation
if (!window.APP_CONFIG.SUPABASE_URL || !window.APP_CONFIG.SUPABASE_ANON_KEY) {
    console.error('❌ Missing Supabase credentials');
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.APP_CONFIG;
}
