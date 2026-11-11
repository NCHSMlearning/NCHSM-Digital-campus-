// ============================================
// SUPABASE CONFIGURATION
// ============================================

// ===== YOUR SUPABASE CREDENTIALS =====
const SUPABASE_URL = 'https://lwhtjozfsmbyihenfunw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk';

// ===== CREATE SUPABASE CLIENT =====
// Check if supabaseJs exists (from CDN)
const supabase = supabaseJs.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== MAKE IT GLOBALLY AVAILABLE =====
window.supabase = supabase;
window.SUPABASE_URL = SUPABASE_URL;

console.log('✅ Supabase client initialized');
console.log(`📡 URL: ${SUPABASE_URL}`);

// ============================================
// CONNECTION TEST
// ============================================

async function testSupabaseConnection() {
    try {
        console.log('🔍 Testing Supabase connection...');
        
        const { data, error } = await window.supabase
            .from('consolidated_user_profiles_table')
            .select('*')
            .limit(1);
        
        if (error) {
            console.error('❌ Supabase connection failed:', error);
            return false;
        }
        
        console.log('✅ Supabase connected successfully!');
        return true;
        
    } catch (error) {
        console.error('❌ Supabase test error:', error);
        return false;
    }
}

setTimeout(testSupabaseConnection, 500);


// NCHSM maintenance: automatically clear revoked non-Super-Admin sessions.
// Server-side PostgREST pre-request validation is authoritative; this client
// probe detects its rejection and signs the browser out without touching valid
// Super Admin sessions.
(function () {
    'use strict';
    const client = window.supabase;
    if (!client || !client.auth || window.__NCHSM_SESSION_SHUTDOWN_CHECK__) return;
    window.__NCHSM_SESSION_SHUTDOWN_CHECK__ = true;
    let checking = false;
    let stopped = false;

    async function checkSession() {
        if (checking || stopped) return;
        checking = true;
        try {
            const authResult = await client.auth.getSession();
            const session = authResult && authResult.data && authResult.data.session;
            if (!session || !session.access_token) return;
            const probe = await client.from('user_sessions').select('*', { head: true, count: 'exact' }).limit(0);
            const message = String(probe && probe.error && probe.error.message || '');
            if (!/session revoked|session invalid|sign in again/i.test(message)) return;

            stopped = true;
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:24px;background:rgba(10,20,35,.95);font:15px system-ui,sans-serif;';
            const panel = document.createElement('div');
            panel.style.cssText = 'max-width:440px;padding:28px;border-radius:14px;background:#fff;color:#10243a;text-align:center;';
            const title = document.createElement('h2');
            title.textContent = 'Session ended';
            const text = document.createElement('p');
            text.textContent = 'System is temporarily disabled. Please try again later.';
            panel.append(title, text);
            overlay.appendChild(panel);
            (document.body || document.documentElement).appendChild(overlay);
            try { await client.auth.signOut({ scope: 'local' }); } catch (_) {}
            try {
                Object.keys(localStorage).forEach(function (key) {
                    if (/^sb-.*-auth-token$/i.test(key) || key === 'supabase.auth.token') localStorage.removeItem(key);
                });
            } catch (_) {}
            window.setTimeout(function () { window.location.replace('/login.html?maintenance=1'); }, 900);
        } catch (error) {
            // A network error is not proof that the session was revoked.
        } finally {
            checking = false;
        }
    }

    if (client.auth.onAuthStateChange) {
        client.auth.onAuthStateChange(function (event, session) {
            if (session && ['SIGNED_IN', 'TOKEN_REFRESHED', 'INITIAL_SESSION'].includes(event)) {
                Promise.resolve().then(checkSession);
            }
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', checkSession, { once: true });
    else checkSession();
})();
