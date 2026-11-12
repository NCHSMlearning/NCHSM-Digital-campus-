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


// ============================================================
// TEMPORARY ACCESS SHUTDOWN — CLEAR REVOKED BROWSER SESSIONS
// The database rejects revoked sessions. This check detects that
// rejection and clears the local Supabase session on the device.
// Valid Super Admin sessions continue to work.
// ============================================================
(function () {
    'use strict';
    const client = window.sb || window.supabaseClient;
    if (!client || !client.auth || window.__NCHSM_SESSION_SHUTDOWN_CHECK__) return;
    window.__NCHSM_SESSION_SHUTDOWN_CHECK__ = true;

    let shutdownStarted = false;
    let checkInProgress = false;
    function showShutdownNotice() {
        if (document.getElementById('nchsm-session-shutdown')) return;
        const overlay = document.createElement('div');
        overlay.id = 'nchsm-session-shutdown';
        overlay.setAttribute('role', 'alertdialog');
        overlay.setAttribute('aria-live', 'assertive');
        overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(10,20,35,.94);font-family:system-ui,sans-serif;';
        const card = document.createElement('div');
        card.style.cssText = 'max-width:440px;width:100%;padding:30px 24px;border-radius:16px;background:#fff;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.35);';
        const heading = document.createElement('h2');
        heading.textContent = 'Session ended';
        heading.style.cssText = 'margin:0 0 12px;color:#10243a;font-size:22px;';
        const body = document.createElement('p');
        body.textContent = 'The site has been updated. Please log in again to continue.';
        body.style.cssText = 'margin:0;color:#475569;font-size:15px;line-height:1.6;';
        card.appendChild(heading);
        card.appendChild(body);
        overlay.appendChild(card);
        (document.body || document.documentElement).appendChild(overlay);
    }

    async function validateBrowserSession() {
        if (shutdownStarted || checkInProgress) return;
        checkInProgress = true;
        try {
            const result = await client.auth.getSession();
            const session = result && result.data && result.data.session;
            if (!session || !session.access_token) return;

            // PostgREST's pre-request hook rejects revoked auth.sessions IDs.
            // A zero-row read still passes through the same server-side check.
            const probe = await client.from('user_sessions').select('*', { head: true, count: 'exact' }).limit(0);
            const errorText = String(probe && probe.error && (
                probe.error.message || probe.error.details || probe.error.hint
            ) || '');
            if (!/session revoked|session invalid|sign in again/i.test(errorText)) return;

            shutdownStarted = true;
            showShutdownNotice();
            try { await client.auth.signOut({ scope: 'local' }); } catch (_) {}
            // Remove only this project's Supabase auth entries; preserve unrelated app data.
            try {
                Object.keys(localStorage).forEach(function (key) {
                    if (/^sb-.*-auth-token$/i.test(key) || key === 'supabase.auth.token') {
                        localStorage.removeItem(key);
                    }
                });
            } catch (_) {}
            setTimeout(function () {
                window.location.replace('/login.html?updated=1');
            }, 900);
        } catch (error) {
            // Network interruptions must not sign out a valid user.
            if (!window.__LOGS_DISABLED) console.warn('NCHSM session validation deferred:', error);
        } finally {
            checkInProgress = false;
        }
    }

    if (client.auth.onAuthStateChange) {
        client.auth.onAuthStateChange(function (event, session) {
            if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')) {
                Promise.resolve().then(validateBrowserSession);
            }
        });
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', validateBrowserSession, { once: true });
    } else {
        validateBrowserSession();
    }
})();
