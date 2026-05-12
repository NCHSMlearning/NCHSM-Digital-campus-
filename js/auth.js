// js/auth.js - UPDATED VERSION with logout tracking
class AuthModule {
    constructor(supabase) {
        this.supabase = supabase;
        this.currentUserId = null;
        this.currentUserProfile = null;
    }
    
    async checkAuthentication() {
        try {
            const { data: { session }, error } = await this.supabase.auth.getSession();
            
            if (error) {
                console.error("Session error:", error);
                this.redirectToLogin();
                return false;
            }
            
            if (!session || !session.user) {
                console.warn("No active session found");
                this.redirectToLogin();
                return false;
            }
            
            this.currentUserId = session.user.id;
            console.log("✅ User authenticated:", this.currentUserId);
            
            // Load user profile
            await this.loadProfile();
            
            // Record login time when user authenticates
            await this.recordLoginTime();
            
            return true;
            
        } catch (err) {
            console.error("Auth check failed:", err);
            this.redirectToLogin();
            return false;
        }
    }
    
    async loadProfile() {
        try {
            const { data: profile, error } = await this.supabase
                .from('consolidated_user_profiles_table')
                .select('*')
                .eq('user_id', this.currentUserId)
                .single();
            
            if (error || !profile) {
                console.error('Error loading profile:', error);
                this.currentUserProfile = {};
            } else {
                this.currentUserProfile = profile;
            }
        } catch (error) {
            console.error('Profile load error:', error);
            this.currentUserProfile = {};
        }
    }
    
    // NEW: Record login time
    async recordLoginTime() {
        try {
            const { error } = await this.supabase
                .from('consolidated_user_profiles_table')
                .update({
                    last_login: new Date(),  // Records current time (Kenya time if server is set correctly)
                    login_count: this.supabase.rpc('increment_login_count', { user_id: this.currentUserId }),
                    updated_at: new Date()
                })
                .eq('user_id', this.currentUserId);
            
            if (error) console.error("Failed to record login time:", error);
            else console.log("✅ Login time recorded");
            
        } catch (error) {
            console.error("Login recording error:", error);
        }
    }
    
    // UPDATED: Record logout time and activity
    async logout() {
        try {
            // Record logout time before signing out
            await this.recordLogoutTime();
            
            // Close all realtime channels
            this.supabase.realtime.channels.forEach(channel => this.supabase.removeChannel(channel));
            
            // Sign out
            await this.supabase.auth.signOut();
            
            // Redirect to login page
            window.location.href = "login.html";
            
        } catch (error) {
            console.error("Logout error:", error);
            window.location.href = "login.html";
        }
    }
    
    // NEW: Record logout time
    async recordLogoutTime() {
        try {
            const { error } = await this.supabase
                .from('consolidated_user_profiles_table')
                .update({
                    last_activity: new Date(),  // Track last activity
                    last_logout: new Date(),    // Track logout time (requires adding column)
                    updated_at: new Date()
                })
                .eq('user_id', this.currentUserId);
            
            if (error) console.error("Failed to record logout time:", error);
            else console.log("✅ Logout time recorded");
            
        } catch (error) {
            console.error("Logout recording error:", error);
        }
    }
    
    redirectToLogin() {
        window.location.href = "login.html";
    }
}
