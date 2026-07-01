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
