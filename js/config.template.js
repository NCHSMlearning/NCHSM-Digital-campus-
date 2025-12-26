// config.template.js - Template file for GitHub Secrets
// DO NOT PUT REAL KEYS HERE - This is a template that GitHub Actions will fill

console.log('🔧 Initializing NCHSM Student Portal Configuration...');

// Application Configuration Template
// These %%PLACEHOLDERS%% will be replaced by GitHub Actions with actual secrets
window.APP_CONFIG = {
    // === SUPABASE CONFIGURATION ===
    // These values come from GitHub Secrets
    SUPABASE_URL: '%%SUPABASE_URL%%',
    SUPABASE_ANON_KEY: '%%SUPABASE_ANON_KEY%%',
    
    // === LOCATION SERVICES ===
    LOCATIONIQ_API_KEY: '%%LOCATIONIQ_API_KEY%%', // For reverse geocoding
    
    // === APPLICATION METADATA ===
    APP_NAME: 'NCHSM Digital Student Portal',
    APP_VERSION: '2.1.0',
    ENVIRONMENT: '%%ENVIRONMENT%%', // 'production' or 'development'
    BUILD_TIME: '%%BUILD_TIME%%', // Auto-generated timestamp
    COMMIT_SHA: '%%COMMIT_SHA%%', // Auto-generated from git
    REPOSITORY_URL: 'https://github.com/NCHSMlearning/NCHSM-Digital-campus-',
    
    // === FEATURE TOGGLES ===
    FEATURES: {
        ATTENDANCE: true,
        EXAMS: true,
        RESOURCES: true,
        MESSAGES: true,
        NURSEIQ: true,
        OFFLINE_MODE: true,
        PWA: true,
        GEOLOCATION: true,
        FILE_UPLOAD: true,
        REVERSE_GEOCODING: true,
        GPS_VALIDATION: true
    },
    
    // === API CONFIGURATION ===
    API: {
        TIMEOUT: 30000, // 30 seconds
        RETRY_ATTEMPTS: 3,
        CACHE_DURATION: 3600000, // 1 hour
        MAX_REQUEST_SIZE: 5242880, // 5MB
        
        // External API endpoints
        LOCATIONIQ_BASE_URL: 'https://us1.locationiq.com/v1',
        LOCATIONIQ_REVERSE_URL: 'https://us1.locationiq.com/v1/reverse.php',
        LOCATIONIQ_SEARCH_URL: 'https://us1.locationiq.com/v1/search.php'
    },
    
    // === GEOLOCATION SETTINGS ===
    GEOLOCATION: {
        MAX_ACCURACY: 200, // meters
        TIMEOUT: 10000, // 10 seconds
        ENABLE_HIGH_ACCURACY: true,
        MAX_AGE: 60000, // 1 minute cache
        CHECKIN_RADIUS: 200, // meters - max distance for valid check-in
        MAX_RETRIES: 3,
        FALLBACK_TO_IP: true
    },
    
    // === STORAGE CONFIGURATION ===
    STORAGE: {
        MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
        ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif'],
        ALLOWED_DOC_TYPES: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        ],
        MAX_CACHE_SIZE: 50 * 1024 * 1024 // 50MB
    },
    
    // === UI CONFIGURATION ===
    UI: {
        THEME: 'default',
        PRIMARY_COLOR: '#4C1D95',
        SECONDARY_COLOR: '#7C3AED',
        ACCENT_COLOR: '#F97316',
        ALERT_COLOR: '#EF4444',
        SUCCESS_COLOR: '#10B981',
        WARNING_COLOR: '#F59E0B',
        DANGER_COLOR: '#DC2626',
        FONT_FAMILY: "'Inter', sans-serif",
        
        // Map settings
        MAP_TILE_URL: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        MAP_ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        MAP_DEFAULT_ZOOM: 16,
        MAP_MAX_ZOOM: 19
    },
    
    // === SESSION MANAGEMENT ===
    SESSION: {
        TIMEOUT: 30 * 60 * 1000, // 30 minutes
        REFRESH_INTERVAL: 5 * 60 * 1000, // 5 minutes
        PERSIST_SESSION: true,
        STORAGE_KEY: 'nchsm_session'
    },
    
    // === CACHE CONFIGURATION ===
    CACHE: {
        ENABLED: true,
        VERSION: 'v2.1',
        STRATEGY: 'network-first',
        OFFLINE_FALLBACK: true,
        PRECACHE: [
            './',
            './index.html',
            './indexstyle.css',
            './manifest.json',
            './config.js',
            './js/database.js',
            './js/utils.js'
        ]
    },
    
    // === DEBUGGING ===
    DEBUG: {
        LOG_LEVEL: '%%LOG_LEVEL%%', // 'debug', 'info', 'warn', 'error'
        ENABLE_CONSOLE: true,
        ENABLE_PERFORMANCE: true,
        ENABLE_ERROR_TRACKING: true,
        LOG_API_CALLS: false,
        LOG_LOCATION_DATA: false
    },
    
    // === SECURITY SETTINGS ===
    SECURITY: {
        REQUIRE_HTTPS: true,
        SANITIZE_INPUTS: true,
        VALIDATE_SESSION_ORIGIN: true,
        CSRF_PROTECTION: true,
        RATE_LIMITING: {
            ENABLED: true,
            MAX_REQUESTS: 100,
            TIME_WINDOW: 15 * 60 * 1000 // 15 minutes
        }
    }
};

// ====================
// VALIDATION FUNCTIONS
// ====================

/**
 * Validates the configuration
 * @returns {boolean} True if config is valid
 */
function validateConfig() {
    console.group('🔍 Validating Configuration');
    
    const config = window.APP_CONFIG;
    const errors = [];
    const warnings = [];
    
    // === REQUIRED CONFIGURATION ===
    
    // Check required Supabase config
    if (!config.SUPABASE_URL || config.SUPABASE_URL.includes('%%')) {
        errors.push('Missing or invalid SUPABASE_URL');
        console.error('❌ SUPABASE_URL:', config.SUPABASE_URL);
    } else {
        console.log('✅ SUPABASE_URL: [CONFIGURED]');
        
        // Validate URL format
        if (!config.SUPABASE_URL.startsWith('https://')) {
            warnings.push('SUPABASE_URL should use HTTPS');
        }
    }
    
    if (!config.SUPABASE_ANON_KEY || config.SUPABASE_ANON_KEY.includes('%%')) {
        errors.push('Missing or invalid SUPABASE_ANON_KEY');
        console.error('❌ SUPABASE_ANON_KEY: [MISSING]');
    } else {
        console.log('✅ SUPABASE_ANON_KEY: [CONFIGURED]');
        
        // Validate JWT format
        if (!config.SUPABASE_ANON_KEY.startsWith('eyJ')) {
            warnings.push('SUPABASE_ANON_KEY format appears invalid (should be JWT)');
        }
    }
    
    // === OPTIONAL BUT RECOMMENDED CONFIGURATION ===
    
    if (!config.LOCATIONIQ_API_KEY || config.LOCATIONIQ_API_KEY.includes('%%')) {
        warnings.push('LOCATIONIQ_API_KEY not configured - reverse geocoding will be disabled');
        console.warn('⚠️ LOCATIONIQ_API_KEY: [NOT CONFIGURED]');
        config.FEATURES.REVERSE_GEOCODING = false;
    } else {
        console.log('✅ LOCATIONIQ_API_KEY: [CONFIGURED]');
    }
    
    // === APPLICATION METADATA ===
    
    console.log('🌍 ENVIRONMENT:', config.ENVIRONMENT);
    console.log('📦 VERSION:', config.APP_VERSION);
    console.log('🕒 BUILD TIME:', config.BUILD_TIME);
    console.log('🔖 COMMIT:', config.COMMIT_SHA?.substring(0, 7) || 'unknown');
    
    // === FEATURE STATUS ===
    
    console.group('🚀 Feature Status:');
    Object.entries(config.FEATURES).forEach(([feature, enabled]) => {
        console.log(`${enabled ? '✅' : '❌'} ${feature}: ${enabled ? 'Enabled' : 'Disabled'}`);
    });
    console.groupEnd();
    
    // === WARNINGS ===
    
    if (warnings.length > 0) {
        console.group('⚠️ Configuration Warnings:');
        warnings.forEach(warning => console.warn(warning));
        console.groupEnd();
    }
    
    console.groupEnd();
    
    // === ERROR HANDLING ===
    
    if (errors.length > 0) {
        console.error('❌ Configuration errors:', errors);
        
        // Show user-friendly error
        if (typeof document !== 'undefined') {
            document.addEventListener('DOMContentLoaded', function() {
                showConfigError(errors, warnings);
            });
        }
        
        return false;
    }
    
    console.log('✅ Configuration validated successfully');
    return true;
}

/**
 * Shows configuration error to user
 * @param {string[]} errors - Array of error messages
 * @param {string[]} warnings - Array of warning messages
 */
function showConfigError(errors, warnings = []) {
    const errorHtml = `
        <div style="
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            padding: 20px;
            font-family: 'Inter', sans-serif;
        ">
            <div style="
                background: white;
                border-radius: 16px;
                padding: 40px;
                max-width: 600px;
                width: 100%;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                text-align: center;
            ">
                <div style="margin-bottom: 30px;">
                    <div style="
                        width: 80px;
                        height: 80px;
                        background: #ef4444;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto 20px;
                    ">
                        <i class="fas fa-exclamation-triangle" style="font-size: 36px; color: white;"></i>
                    </div>
                    <h1 style="color: #1f2937; margin-bottom: 10px;">Configuration Error</h1>
                    <p style="color: #6b7280;">
                        Application configuration is missing or invalid.
                    </p>
                </div>
                
                <div style="
                    background: #f3f4f6;
                    border-radius: 12px;
                    padding: 20px;
                    margin-bottom: 20px;
                    text-align: left;
                ">
                    <h3 style="color: #374151; margin-bottom: 10px;">
                        <i class="fas fa-times-circle" style="color: #ef4444; margin-right: 8px;"></i>
                        Critical Errors:
                    </h3>
                    <ul style="color: #dc2626; margin-left: 20px;">
                        ${errors.map(error => `<li><strong>${error}</strong></li>`).join('')}
                    </ul>
                </div>
                
                ${warnings.length > 0 ? `
                <div style="
                    background: #fffbeb;
                    border-radius: 12px;
                    padding: 20px;
                    margin-bottom: 20px;
                    text-align: left;
                    border-left: 4px solid #f59e0b;
                ">
                    <h3 style="color: #92400e; margin-bottom: 10px;">
                        <i class="fas fa-exclamation-circle" style="color: #f59e0b; margin-right: 8px;"></i>
                        Warnings:
                    </h3>
                    <ul style="color: #92400e; margin-left: 20px;">
                        ${warnings.map(warning => `<li>${warning}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}
                
                <div style="
                    background: #f0f9ff;
                    border-radius: 12px;
                    padding: 20px;
                    margin-bottom: 30px;
                    text-align: left;
                    border-left: 4px solid #0ea5e9;
                ">
                    <h3 style="color: #0369a1; margin-bottom: 10px;">
                        <i class="fas fa-cogs" style="color: #0ea5e9; margin-right: 8px;"></i>
                        How to Fix:
                    </h3>
                    <ol style="color: #374151; margin-left: 20px;">
                        <li>Go to your GitHub repository</li>
                        <li>Navigate to <strong>Settings → Secrets and variables → Actions</strong></li>
                        <li>Add the following repository secrets:</li>
                        <ul style="margin-left: 20px; color: #6b7280; margin-top: 5px;">
                            <li><code>SUPABASE_URL</code> - Your Supabase project URL</li>
                            <li><code>SUPABASE_ANON_KEY</code> - Your Supabase anonymous key</li>
                            <li><code>LOCATIONIQ_API_KEY</code> - Optional: LocationIQ API key for reverse geocoding</li>
                        </ul>
                        <li>Commit and push to trigger GitHub Actions</li>
                    </ol>
                    
                    <div style="margin-top: 15px; padding: 12px; background: #dbeafe; border-radius: 8px;">
                        <strong style="color: #1e40af;">Note:</strong>
                        <p style="color: #374151; margin-top: 5px; font-size: 14px;">
                            GitHub Actions will automatically replace the placeholders in <code>config.template.js</code>
                            with your actual secrets when deploying.
                        </p>
                    </div>
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                    <button onclick="window.location.reload()" style="
                        background: #4f46e5;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 600;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    ">
                        <i class="fas fa-redo"></i> Try Again
                    </button>
                    
                    <button onclick="window.open('https://github.com/${getRepoPath()}/settings/secrets/actions', '_blank')" style="
                        background: #6b7280;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 600;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    ">
                        <i class="fab fa-github"></i> Open GitHub Secrets
                    </button>
                    
                    <button onclick="window.open('https://supabase.com/dashboard/project/_/settings/api', '_blank')" style="
                        background: #3ecf8e;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 600;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    ">
                        <i class="fas fa-database"></i> Get Supabase Keys
                    </button>
                </div>
                
                <div style="margin-top: 20px; color: #9ca3af; font-size: 12px;">
                    <i class="fas fa-code-branch"></i> 
                    Build: ${window.APP_CONFIG.BUILD_TIME || 'Unknown'} | 
                    Environment: ${window.APP_CONFIG.ENVIRONMENT || 'Unknown'} |
                    Config Status: ${errors.length > 0 ? '❌ Invalid' : '⚠️ Partial'}
                </div>
            </div>
        </div>
    `;
    
    // Add FontAwesome if not already loaded
    if (!document.querySelector('link[href*="font-awesome"]')) {
        const faLink = document.createElement('link');
        faLink.rel = 'stylesheet';
        faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
        document.head.appendChild(faLink);
    }
    
    // Add Inter font if not already loaded
    if (!document.querySelector('link[href*="fonts.googleapis.com/css2?family=Inter"]')) {
        const fontLink = document.createElement('link');
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap';
        fontLink.rel = 'stylesheet';
        document.head.appendChild(fontLink);
    }
    
    document.body.innerHTML = errorHtml;
}

/**
 * Gets the current repository path
 * @returns {string} Repository path
 */
function getRepoPath() {
    const repoUrl = window.APP_CONFIG.REPOSITORY_URL || 'NCHSMlearning/NCHSM-Digital-campus-';
    return repoUrl.replace('https://github.com/', '');
}

/**
 * Returns a secure configuration object for API usage
 * @returns {object} Configuration object with sensitive data
 */
window.APP_CONFIG.getSecureConfig = function() {
    const config = { ...this };
    
    // Hide sensitive keys in logs
    if (config.SUPABASE_ANON_KEY) {
        config.SUPABASE_ANON_KEY = '[HIDDEN]';
    }
    if (config.LOCATIONIQ_API_KEY) {
        config.LOCATIONIQ_API_KEY = '[HIDDEN]';
    }
    
    return config;
};

/**
 * Check if feature is enabled
 * @param {string} feature - Feature name
 * @returns {boolean} True if enabled
 */
window.APP_CONFIG.isFeatureEnabled = function(feature) {
    return this.FEATURES[feature] === true;
};

/**
 * Get API endpoint with key
 * @param {string} endpoint - API endpoint
 * @param {object} params - Additional parameters
 * @returns {string} Complete API URL
 */
window.APP_CONFIG.getLocationIQUrl = function(endpoint, params = {}) {
    if (!this.LOCATIONIQ_API_KEY) {
        throw new Error('LocationIQ API key not configured');
    }
    
    const baseUrl = this.API[endpoint + '_URL'] || this.API.LOCATIONIQ_BASE_URL;
    const url = new URL(baseUrl);
    
    // Add API key
    url.searchParams.set('key', this.LOCATIONIQ_API_KEY);
    url.searchParams.set('format', 'json');
    
    // Add additional parameters
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            url.searchParams.set(key, value);
        }
    });
    
    return url.toString();
};

// Initialize configuration validation
(function init() {
    console.log('🚀 Starting configuration initialization...');
    
    // Validate configuration
    const isValid = validateConfig();
    
    if (isValid) {
        console.log('🎉 Configuration loaded successfully!');
        
        // Log secure config (without sensitive data)
        console.log('📊 Configuration Summary:', window.APP_CONFIG.getSecureConfig());
        
        // Initialize feature-dependent modules
        if (typeof initLocationServices === 'function' && window.APP_CONFIG.isFeatureEnabled('GEOLOCATION')) {
            initLocationServices();
        }
        
        // Dispatch config loaded event
        if (typeof document !== 'undefined') {
            const event = new CustomEvent('config-loaded', { detail: window.APP_CONFIG });
            document.dispatchEvent(event);
        }
    } else {
        console.error('❌ Configuration initialization failed');
    }
    
    return isValid;
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.APP_CONFIG;
}
