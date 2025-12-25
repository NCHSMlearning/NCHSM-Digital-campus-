// js/auth.js
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
    
    async logout() {
        try {
            this.supabase.realtime.channels.forEach(channel => this.supabase.removeChannel(channel));
            await this.supabase.auth.signOut();
            window.location.href = "login.html";
        } catch (error) {
            console.error("Logout error:", error);
            window.location.href = "login.html";
        }
    }
    
    redirectToLogin() {
        window.location.href = "login.html";
    }
}
