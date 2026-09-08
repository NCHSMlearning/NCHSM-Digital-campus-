// database.js - Complete database operations with Login/Logout Tracking
class Database {
    constructor() {
        this.supabase = null;
        this.currentUserId = null;
        this.currentUserProfile = null;
        this.cachedData = {
            courses: [],
            exams: [],
            clinicalAreas: [],
            resources: [],
            messages: [],
            supplementaryUnits: [],
            supplementaryRegistrations: [],
            failedUnits: []
        };
        this.isInitialized = false;
        this.initializationPromise = null;
        this.profileModule = null;
        this.connectionCount = 0;
        this.lastConnectionTime = null;
    }

    // Initialize database connection with GitHub Secrets
    async initialize() {
        if (this.isInitialized &amp;&amp; this.supabase) {
            return this.supabase;
        }

        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = (async () =&gt; {
            try {
                const config = window.APP_CONFIG;

                if (!config?.SUPABASE_URL || !config?.SUPABASE_ANON_KEY) {
                    throw new Error(&#x27;Supabase configuration is missing. Check config.js.&#x27;);
                }

                // Reuse the READY client created by config.js first.
                // config.js exposes the real Supabase client as window.sb.
                if (
                    window.sb &amp;&amp;
                    typeof window.sb.from === &#x27;function&#x27; &amp;&amp;
                    window.sb.auth &amp;&amp;
                    typeof window.sb.auth.getSession === &#x27;function&#x27;
                ) {
                    this.supabase = window.sb;

                    console.log(
                        &#x27;✅ Database: Using Supabase client from window.sb&#x27;
                    );

                } else if (
                    window.NCHSMLogin?.supabase &amp;&amp;
                    typeof window.NCHSMLogin.supabase.from === &#x27;function&#x27;
                ) {
                    this.supabase = window.NCHSMLogin.supabase;

                    console.log(
                        &#x27;✅ Database: Using existing Supabase connection from login&#x27;
                    );

                } else if (
                    window.db?.supabase &amp;&amp;
                    window.db !== this &amp;&amp;
                    typeof window.db.supabase.from === &#x27;function&#x27;
                ) {
                    this.supabase = window.db.supabase;

                    console.log(
                        &#x27;✅ Database: Using existing Supabase connection from db&#x27;
                    );

                } else if (
                    window.supabase &amp;&amp;
                    typeof window.supabase.from === &#x27;function&#x27;
                ) {
                    // Only use window.supabase when it is the actual client.
                    // The Supabase CDN normally exposes a namespace there,
                    // which has createClient() but not from().
                    this.supabase = window.supabase;

                    console.log(
                        &#x27;✅ Database: Using global Supabase client&#x27;
                    );

                } else {
                    if (!window.supabaseClient &amp;&amp; typeof supabase === &#x27;undefined&#x27;) {
                        throw new Error(&#x27;Supabase library is not available.&#x27;);
                    }

                    const createClient =
                        window.supabaseClient?.createClient ||
                        (typeof supabase !== &#x27;undefined&#x27; &amp;&amp; supabase.createClient);

                    if (typeof createClient !== &#x27;function&#x27;) {
                        throw new Error(&#x27;Supabase createClient function is not available.&#x27;);
                    }

                    this.supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
                        auth: {
                            persistSession: true,
                            autoRefreshToken: true,
                            detectSessionInUrl: true
                        }
                    });
                }

                if (!this.supabase?.auth) {
                    throw new Error(&#x27;Supabase authentication client is unavailable.&#x27;);
                }

                // Stable alias for the actual client.
                window.supabaseClient = this.supabase;

                await this.testConnection();
                this.isInitialized = true;
                this.connectionCount += 1;
                this.lastConnectionTime = new Date();

                return this.supabase;
            } catch (error) {
                this.isInitialized = false;
                this.supabase = this.supabase || null;
                this.showConfigurationError(error);
                throw error;
            } finally {
                this.initializationPromise = null;
            }
        })();

        return this.initializationPromise;
    }

    async testConnection() {
        try {
            // Simple test query
            const { error } = await this.supabase.auth.getSession();

            if (error) {
                throw new Error(&#x27;Supabase authentication failed: &#x27; + error.message);
            }

            console.log(&#x27;🔌 Database connection test passed&#x27;);
            return true;

        } catch (error) {
            console.error(&#x27;🔌 Database connection test failed:&#x27;, error.message);

            // Provide helpful error messages
            if (error.message.includes(&#x27;JWT&#x27;)) {
                throw new Error(&#x27;Invalid Supabase API key. Check your SUPABASE_ANON_KEY in GitHub Secrets.&#x27;);
            } else if (error.message.includes(&#x27;fetch&#x27;)) {
                throw new Error(&#x27;Network error. Check your SUPABASE_URL in GitHub Secrets.&#x27;);
            } else if (error.message.includes(&#x27;CORS&#x27;)) {
                throw new Error(&#x27;CORS error. Add your domain to Supabase CORS settings.&#x27;);
            } else {
                throw error;
            }
        }
    }

    // Show configuration error UI
    showConfigurationError(error) {
        const errorHtml = `
            &lt;div style=&quot;
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                padding: 20px;
                font-family: &#x27;Inter&#x27;, sans-serif;
            &quot;&gt;
                &lt;div style=&quot;
                    background: white;
                    border-radius: 16px;
                    padding: 40px;
                    max-width: 600px;
                    width: 100%;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    text-align: center;
                &quot;&gt;
                    &lt;div style=&quot;margin-bottom: 30px;&quot;&gt;
                        &lt;div style=&quot;
                            width: 80px;
                            height: 80px;
                            background: #ef4444;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin: 0 auto 20px;
                        &quot;&gt;
                            &lt;i class=&quot;fas fa-database&quot; style=&quot;font-size: 36px; color: white;&quot;&gt;&lt;/i&gt;
                        &lt;/div&gt;
                        &lt;h1 style=&quot;color: #1f2937; margin-bottom: 10px;&quot;&gt;Configuration Error&lt;/h1&gt;
                        &lt;p style=&quot;color: #6b7280; margin-bottom: 20px;&quot;&gt;
                            Failed to load application configuration.
                        &lt;/p&gt;
                    &lt;/div&gt;
                    
                    &lt;div style=&quot;
                        background: #f3f4f6;
                        border-radius: 12px;
                        padding: 20px;
                        margin-bottom: 30px;
                        text-align: left;
                    &quot;&gt;
                        &lt;h3 style=&quot;color: #374151; margin-bottom: 10px;&quot;&gt;Error Details:&lt;/h3&gt;
                        &lt;code style=&quot;
                            background: #1f2937;
                            color: #10b981;
                            padding: 10px;
                            border-radius: 6px;
                            display: block;
                            font-family: monospace;
                            font-size: 14px;
                            overflow-x: auto;
                        &quot;&gt;
                            ${error.message}
                        &lt;/code&gt;
                    &lt;/div&gt;
                    
                    &lt;div style=&quot;
                        background: #f0f9ff;
                        border-radius: 12px;
                        padding: 20px;
                        margin-bottom: 30px;
                        text-align: left;
                        border-left: 4px solid #0ea5e9;
                    &quot;&gt;
                        &lt;h3 style=&quot;color: #0369a1; margin-bottom: 10px;&quot;&gt;
                            &lt;i class=&quot;fas fa-info-circle&quot;&gt;&lt;/i&gt; How to Fix:
                        &lt;/h3&gt;
                        &lt;ol style=&quot;color: #374151; margin-left: 20px;&quot;&gt;
                            &lt;li&gt;Check if &lt;strong&gt;config.js&lt;/strong&gt; file exists&lt;/li&gt;
                            &lt;li&gt;Verify GitHub Secrets are properly set (SUPABASE_URL, SUPABASE_ANON_KEY)&lt;/li&gt;
                            &lt;li&gt;Check browser console for detailed errors&lt;/li&gt;
                            &lt;li&gt;Ensure GitHub Actions workflow generated config.js&lt;/li&gt;
                        &lt;/ol&gt;
                    &lt;/div&gt;
                    
                    &lt;div style=&quot;display: flex; gap: 10px; justify-content: center;&quot;&gt;
                        &lt;button onclick=&quot;window.location.reload()&quot; style=&quot;
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
                        &quot;&gt;
                            &lt;i class=&quot;fas fa-redo&quot;&gt;&lt;/i&gt; Try Again
                        &lt;/button&gt;
                        
                        &lt;button onclick=&quot;showGitHubSecretsHelp()&quot; style=&quot;
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
                        &quot;&gt;
                            &lt;i class=&quot;fas fa-question-circle&quot;&gt;&lt;/i&gt; GitHub Secrets Help
                        &lt;/button&gt;
                    &lt;/div&gt;
                    
                    ${window.APP_CONFIG ? `
                    &lt;div style=&quot;margin-top: 20px; color: #9ca3af; font-size: 12px;&quot;&gt;
                        &lt;i class=&quot;fas fa-code-branch&quot;&gt;&lt;/i&gt; 
                        Build: ${window.APP_CONFIG.BUILD_TIME} | 
                        Commit: ${window.APP_CONFIG.COMMIT_SHA?.substring(0, 7) || &#x27;unknown&#x27;} |
                        Config: ${window.APP_CONFIG.SUPABASE_URL ? &#x27;Loaded&#x27; : &#x27;Missing&#x27;}
                    &lt;/div&gt;
                    ` : &#x27;&#x27;}
                &lt;/div&gt;
            &lt;/div&gt;
        `;

        document.body.innerHTML = errorHtml;
    }

    // ============================================================
    // 🔥 FIXED: AUTHENTICATION FUNCTIONS - NO AUTO-REDIRECT!
    // ============================================================

    /**
     * Return the current authenticated session.
     * This is the single gate used by database operations that require a user.
     */
    async getAuthenticatedSession() {
        if (!this.supabase?.auth) {
            throw new Error(&#x27;Database is not initialized.&#x27;);
        }

        const { data, error } = await this.supabase.auth.getSession();

        if (error) {
            throw error;
        }

        const session = data?.session;

        if (!session?.user?.id) {
            this.currentUserId = null;
            this.currentUserProfile = null;
            throw new Error(&#x27;No authenticated user session.&#x27;);
        }

        // Keep the local user identity synchronized with Supabase.
        if (this.currentUserId &amp;&amp; this.currentUserId !== session.user.id) {
            this.clearUserState();
        }

        this.currentUserId = session.user.id;
        return session;
    }

    /**
     * Require an authenticated user before accessing user-scoped data.
     */
    async requireAuthenticatedUser() {
        const session = await this.getAuthenticatedSession();
        return session.user.id;
    }

    /**
     * Clear user-scoped state without signing the user out.
     */
    clearUserState() {
        this.currentUserId = null;
        this.currentUserProfile = null;
        this.cachedData = {
            courses: [],
            exams: [],
            attendance: [],
            resources: [],
            messages: [],
            calendar: []
        };
    }

    async checkAuth() {
        try {
            await this.initialize();

            const session = await this.getAuthenticatedSession();
            const userId = session.user.id;

            const profile = await this.loadUserProfile(userId);

            if (!profile) {
                return false;
            }

            const requiredAcademicFields = [&#x27;program&#x27;, &#x27;block&#x27;, &#x27;intake_year&#x27;];
            const missingFields = requiredAcademicFields.filter(
                field =&gt; profile[field] === null ||
                         profile[field] === undefined ||
                         String(profile[field]).trim() === &#x27;&#x27;
            );

            if (missingFields.length &gt; 0) {
                console.warn(&#x27;Profile is missing required academic fields:&#x27;, missingFields);
                this.showIncompleteProfileWarning(profile, missingFields);
                return false;
            }

            await this.recordLoginTime();
            return true;
        } catch (error) {
            console.error(&#x27;Authentication check failed:&#x27;, error);

            if (error?.message === &#x27;No authenticated user session.&#x27;) {
                this.showDatabaseError(&#x27;Your session has expired. Please sign in again.&#x27;);
            } else {
                this.showDatabaseError(error?.message || &#x27;Unable to verify your account.&#x27;);
            }

            return false;
        }
    }

    async loadUserProfile() {
        try {
            console.log(&#x27;👤 Loading user profile...&#x27;);

            if (!this.currentUserId) {
                console.error(&#x27;❌ No user ID available&#x27;);
                this.showDatabaseError(&#x27;No User ID&#x27;, &#x27;Please login again.&#x27;);
                return null;
            }

            // Try consolidated_user_profiles_table
            const { data: consolidatedProfile, error: consolidatedError } = await this.supabase
                .from(&#x27;consolidated_user_profiles_table&#x27;)
                .select(&#x27;*&#x27;)
                .eq(&#x27;user_id&#x27;, this.currentUserId)
                .maybeSingle();

            if (!consolidatedError &amp;&amp; consolidatedProfile) {
                console.log(&#x27;✅ User loaded from consolidated_user_profiles_table&#x27;);
                this.currentUserProfile = consolidatedProfile;

                // ✅ CHECK REQUIRED FIELDS
                const requiredFields = [&#x27;program&#x27;, &#x27;block&#x27;, &#x27;intake_year&#x27;];
                const missingFields = requiredFields.filter(f =&gt; !consolidatedProfile[f]);

                if (missingFields.length &gt; 0) {
                    console.warn(&#x27;⚠️ Profile incomplete. Missing:&#x27;, missingFields.join(&#x27;, &#x27;));
                    console.warn(&#x27;📝 Current values:&#x27;, {
                        program: consolidatedProfile.program || &#x27;NULL&#x27;,
                        block: consolidatedProfile.block || &#x27;NULL&#x27;,
                        intake_year: consolidatedProfile.intake_year || &#x27;NULL&#x27;,
                        student_id: consolidatedProfile.student_id || &#x27;NULL&#x27;
                    });

                    // ✅ SHOW WARNING INSTEAD OF CREATING FAKE DATA
                    this.showIncompleteProfileWarning(missingFields);
                    return null;
                }

                return consolidatedProfile;
            }

            // Try profiles table
            const { data: regularProfile, error: regularError } = await this.supabase
                .from(&#x27;profiles&#x27;)
                .select(&#x27;*&#x27;)
                .eq(&#x27;id&#x27;, this.currentUserId)
                .maybeSingle();

            if (!regularError &amp;&amp; regularProfile) {
                console.log(&#x27;✅ User loaded from profiles table&#x27;);
                this.currentUserProfile = regularProfile;
                return regularProfile;
            }

            // Try by email
            const { data: userData } = await this.supabase.auth.getUser();
            if (userData?.user?.email) {
                const { data: emailProfile, error: emailError } = await this.supabase
                    .from(&#x27;consolidated_user_profiles_table&#x27;)
                    .select(&#x27;*&#x27;)
                    .eq(&#x27;email&#x27;, userData.user.email)
                    .maybeSingle();

                if (!emailError &amp;&amp; emailProfile) {
                    console.log(&#x27;✅ User loaded by email from consolidated table&#x27;);
                    this.currentUserProfile = emailProfile;

                    // ✅ CHECK REQUIRED FIELDS
                    const requiredFields = [&#x27;program&#x27;, &#x27;block&#x27;, &#x27;intake_year&#x27;];
                    const missingFields = requiredFields.filter(f =&gt; !emailProfile[f]);

                    if (missingFields.length &gt; 0) {
                        console.warn(&#x27;⚠️ Profile incomplete. Missing:&#x27;, missingFields.join(&#x27;, &#x27;));
                        this.showIncompleteProfileWarning(missingFields);
                        return null;
                    }

                    return emailProfile;
                }
            }

            // ============================================================
            // 🔥 FIX: NO MORE FALLBACK PROFILE!
            // Instead, show a clear error message
            // ============================================================
            console.error(&#x27;❌ No profile found for user:&#x27;, this.currentUserId);

            // ✅ Show error instead of creating fake data
            this.showNoProfileError();

            // ✅ Return null instead of fake profile
            this.currentUserProfile = null;
            return null;

        } catch (error) {
            console.error(&#x27;❌ Failed to load profile:&#x27;, error);
            this.showDatabaseError(&#x27;Error loading profile: &#x27; + error.message);
            this.currentUserProfile = null;
            return null;
        }
    }

    // ============================================================
    // ✅ ERROR DISPLAY FUNCTIONS
    // ============================================================

    showIncompleteProfileWarning(missingFields) {
        // Remove existing overlay if any
        const existing = document.querySelector(&#x27;.db-error-overlay&#x27;);
        if (existing) existing.remove();

        const overlay = document.createElement(&#x27;div&#x27;);
        overlay.className = &#x27;db-error-overlay&#x27;;
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.6);
            backdrop-filter: blur(4px);
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: &#x27;Inter&#x27;, sans-serif;
        `;
        overlay.innerHTML = `
            &lt;div style=&quot;
                background: white;
                border-radius: 16px;
                padding: 40px;
                max-width: 500px;
                width: 90%;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                text-align: center;
                animation: slideUp 0.3s ease;
            &quot;&gt;
                &lt;div style=&quot;font-size: 48px; margin-bottom: 16px;&quot;&gt;⚠️&lt;/div&gt;
                &lt;h3 style=&quot;color: #d97706; margin: 0 0 8px 0;&quot;&gt;Incomplete Profile&lt;/h3&gt;
                &lt;p style=&quot;color: #6b7280; margin: 0 0 12px 0;&quot;&gt;
                    Your student profile is missing required information:
                &lt;/p&gt;
                &lt;div style=&quot;background: #fef3c7; border-radius: 8px; padding: 12px; margin-bottom: 20px;&quot;&gt;
                    &lt;strong style=&quot;color: #92400e;&quot;&gt;Missing:&lt;/strong&gt;
                    &lt;span style=&quot;color: #78350f;&quot;&gt;${missingFields.join(&#x27;, &#x27;)}&lt;/span&gt;
                &lt;/div&gt;
                &lt;p style=&quot;color: #6b7280; font-size: 14px; margin-bottom: 20px;&quot;&gt;
                    Please contact the administrator to complete your profile.
                &lt;/p&gt;
                &lt;button onclick=&quot;window.location.href=&#x27;/login.html&#x27;&quot; style=&quot;
                    background: #4C1D95;
                    color: white;
                    border: none;
                    padding: 12px 32px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 16px;
                    transition: all 0.3s ease;
                &quot; onmouseover=&quot;this.style.transform=&#x27;translateY(-2px)&#x27;&quot; onmouseout=&quot;this.style.transform=&#x27;none&#x27;&quot;&gt;
                    Go to Login
                &lt;/button&gt;
                &lt;br&gt;&lt;br&gt;
                &lt;button onclick=&quot;location.reload()&quot; style=&quot;
                    background: transparent;
                    color: #4C1D95;
                    border: none;
                    cursor: pointer;
                    font-weight: 500;
                    font-size: 14px;
                    text-decoration: underline;
                &quot;&gt;
                    Try Again
                &lt;/button&gt;
            &lt;/div&gt;
        `;
        document.body.appendChild(overlay);
    }

    showNoProfileError() {
        const existing = document.querySelector(&#x27;.db-error-overlay&#x27;);
        if (existing) existing.remove();

        const overlay = document.createElement(&#x27;div&#x27;);
        overlay.className = &#x27;db-error-overlay&#x27;;
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.6);
            backdrop-filter: blur(4px);
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: &#x27;Inter&#x27;, sans-serif;
        `;
        overlay.innerHTML = `
            &lt;div style=&quot;
                background: white;
                border-radius: 16px;
                padding: 40px;
                max-width: 500px;
                width: 90%;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                text-align: center;
                animation: slideUp 0.3s ease;
            &quot;&gt;
                &lt;div style=&quot;font-size: 48px; margin-bottom: 16px;&quot;&gt;🚫&lt;/div&gt;
                &lt;h3 style=&quot;color: #dc2626; margin: 0 0 8px 0;&quot;&gt;Profile Not Found&lt;/h3&gt;
                &lt;p style=&quot;color: #6b7280; margin: 0 0 20px 0;&quot;&gt;
                    No student profile was found for your account.
                    Please contact support to set up your profile.
                &lt;/p&gt;
                &lt;button onclick=&quot;window.location.href=&#x27;/login.html&#x27;&quot; style=&quot;
                    background: #4C1D95;
                    color: white;
                    border: none;
                    padding: 12px 32px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 16px;
                    transition: all 0.3s ease;
                &quot; onmouseover=&quot;this.style.transform=&#x27;translateY(-2px)&#x27;&quot; onmouseout=&quot;this.style.transform=&#x27;none&#x27;&quot;&gt;
                    Go to Login
                &lt;/button&gt;
            &lt;/div&gt;
        `;
        document.body.appendChild(overlay);
    }

    showDatabaseError(message) {
        const existing = document.querySelector(&#x27;.db-error-overlay&#x27;);
        if (existing) existing.remove();

        const overlay = document.createElement(&#x27;div&#x27;);
        overlay.className = &#x27;db-error-overlay&#x27;;
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.6);
            backdrop-filter: blur(4px);
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: &#x27;Inter&#x27;, sans-serif;
        `;
        overlay.innerHTML = `
            &lt;div style=&quot;
                background: white;
                border-radius: 16px;
                padding: 40px;
                max-width: 500px;
                width: 90%;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                text-align: center;
                animation: slideUp 0.3s ease;
            &quot;&gt;
                &lt;div style=&quot;font-size: 48px; margin-bottom: 16px;&quot;&gt;💥&lt;/div&gt;
                &lt;h3 style=&quot;color: #dc2626; margin: 0 0 8px 0;&quot;&gt;Database Error&lt;/h3&gt;
                &lt;p style=&quot;color: #6b7280; margin: 0 0 20px 0;&quot;&gt;
                    ${message}
                &lt;/p&gt;
                &lt;button onclick=&quot;location.reload()&quot; style=&quot;
                    background: #4C1D95;
                    color: white;
                    border: none;
                    padding: 12px 32px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 16px;
                    transition: all 0.3s ease;
                &quot; onmouseover=&quot;this.style.transform=&#x27;translateY(-2px)&#x27;&quot; onmouseout=&quot;this.style.transform=&#x27;none&#x27;&quot;&gt;
                    Try Again
                &lt;/button&gt;
                &lt;br&gt;&lt;br&gt;
                &lt;button onclick=&quot;window.location.href=&#x27;/login.html&#x27;&quot; style=&quot;
                    background: transparent;
                    color: #4C1D95;
                    border: none;
                    cursor: pointer;
                    font-weight: 500;
                    font-size: 14px;
                    text-decoration: underline;
                &quot;&gt;
                    Go to Login
                &lt;/button&gt;
            &lt;/div&gt;
        `;
        document.body.appendChild(overlay);
    }

    // Record login time
    async recordLoginTime() {
        if (!this.currentUserId) {
            console.warn(&#x27;No user ID to record login time&#x27;);
            return;
        }

        try {
            const nowISO = new Date().toISOString();

            const { error } = await this.supabase
                .from(&#x27;consolidated_user_profiles_table&#x27;)
                .update({
                    last_login: nowISO,
                    last_activity: nowISO,
                    updated_at: nowISO
                })
                .eq(&#x27;user_id&#x27;, this.currentUserId);

            if (error) {
                console.error(&quot;Failed to record login time:&quot;, error);
            } else {
                console.log(`✅ Login time recorded at ${nowISO}`);
            }

        } catch (error) {
            console.error(&quot;Login recording error:&quot;, error);
        }
    }

    // Record logout time
    async recordLogoutTime() {
        if (!this.currentUserId) {
            console.warn(&#x27;No user ID to record logout time&#x27;);
            return;
        }

        try {
            const nowISO = new Date().toISOString();

            const { error } = await this.supabase
                .from(&#x27;consolidated_user_profiles_table&#x27;)
                .update({
                    last_activity: nowISO,
                    last_logout: nowISO,
                    updated_at: nowISO
                })
                .eq(&#x27;user_id&#x27;, this.currentUserId);

            if (error) {
                console.error(&quot;Failed to record logout time:&quot;, error);
            } else {
                console.log(`✅ Logout time recorded at ${nowISO}`);
            }

        } catch (error) {
            console.error(&quot;Logout recording error:&quot;, error);
        }
    }

    // Updated: Logout with tracking
    async logout() {
        try {
            await this.recordLogoutTime();
            this.supabase.realtime.channels.forEach(channel =&gt; this.supabase.removeChannel(channel));
            await this.supabase.auth.signOut();
            this.clearUserState();
            this.clearCache();
            window.location.href = &quot;login.html&quot;;
        } catch (error) {
            console.error(&quot;Logout error:&quot;, error);
            window.location.href = &quot;login.html&quot;;
        }
    }

    // Load profile data
    async loadProfileData() {
        console.log(&#x27;🔄 Database.loadProfileData() called&#x27;);

        if (this.profileModule) {
            console.log(&#x27;🎯 Loading profile via module...&#x27;);
            await this.profileModule.loadProfile();
        } else if (typeof window.loadProfile === &#x27;function&#x27;) {
            console.log(&#x27;🎯 Loading profile via global function...&#x27;);
            await window.loadProfile();
        } else if (this.currentUserId &amp;&amp; this.supabase) {
            console.log(&#x27;🎯 Loading profile directly...&#x27;);
            await this.loadUserProfile();
        }
    }

    // ============================================================
    // SUPPLEMENTARY REGISTRATION FUNCTIONS
    // ============================================================

    async getFailedUnits() {
        if (this.cachedData.failedUnits.length &gt; 0) {
            return this.cachedData.failedUnits;
        }

        if (!this.currentUserId) {
            console.warn(&#x27;No user ID to get failed units&#x27;);
            return [];
        }

        try {
            const { data: grades, error } = await this.supabase
                .from(&#x27;exam_grades&#x27;)
                .select(&#x27;*, exams:exam_id(unit_code, course_name, block_term, exam_name, program_type)&#x27;)
                .eq(&#x27;student_id&#x27;, this.currentUserId);

            if (error) throw error;

            const failedUnits = [];
            const processed = new Set();

            if (grades) {
                for (const grade of grades) {
                    const score = grade.total_score || grade.marks || 0;
                    const unitCode = grade.exams?.unit_code || grade.subject_name || grade.exam_name;

                    if (score &lt; 50 &amp;&amp; unitCode &amp;&amp; !processed.has(unitCode)) {
                        processed.add(unitCode);

                        const { data: existingReg } = await this.supabase
                            .from(&#x27;student_unit_registrations&#x27;)
                            .select(&#x27;id, status&#x27;)
                            .eq(&#x27;student_id&#x27;, this.currentUserId)
                            .eq(&#x27;unit_code&#x27;, unitCode)
                            .in(&#x27;reg_type&#x27;, [&#x27;Supplementary&#x27;, &#x27;Resit&#x27;, &#x27;Retake&#x27;])
                            .maybeSingle();

                        let regType = &#x27;Supplementary&#x27;;
                        if (score &lt; 30) regType = &#x27;Retake&#x27;;
                        else if (score &lt; 40) regType = &#x27;Resit&#x27;;

                        failedUnits.push({
                            unit_code: unitCode,
                            unit_name: grade.exams?.course_name || grade.subject_name || unitCode,
                            block: grade.exams?.block_term || &#x27;N/A&#x27;,
                            score: score,
                            reg_type: regType,
                            status: existingReg ? existingReg.status : &#x27;Eligible&#x27;,
                            existing_id: existingReg?.id || null
                        });
                    }
                }
            }

            this.cachedData.failedUnits = failedUnits;
            return failedUnits;

        } catch (error) {
            console.error(&#x27;Error loading failed units:&#x27;, error);
            return [];
        }
    }

    async getSupplementaryRegistrations() {
        if (this.cachedData.supplementaryRegistrations.length &gt; 0) {
            return this.cachedData.supplementaryRegistrations;
        }

        if (!this.currentUserId) {
            console.warn(&#x27;No user ID to get supplementary registrations&#x27;);
            return [];
        }

        try {
            const { data, error } = await this.supabase
                .from(&#x27;student_unit_registrations&#x27;)
                .select(&#x27;*&#x27;)
                .eq(&#x27;student_id&#x27;, this.currentUserId)
                .in(&#x27;reg_type&#x27;, [&#x27;Supplementary&#x27;, &#x27;Resit&#x27;, &#x27;Retake&#x27;])
                .order(&#x27;submitted_date&#x27;, { ascending: false });

            if (error) throw error;

            this.cachedData.supplementaryRegistrations = data || [];
            return this.cachedData.supplementaryRegistrations;

        } catch (error) {
            console.error(&#x27;Error loading supplementary registrations:&#x27;, error);
            return [];
        }
    }

    async registerSupplementaryUnits(units, paymentRef = null) {
        const userId = await this.requireAuthenticatedUser();
        if (!this.currentUserProfile) {
            await this.loadUserProfile(userId);
        }
        if (!this.currentUserProfile?.program ||
            !this.currentUserProfile?.block ||
            !this.currentUserProfile?.intake_year) {
            throw new Error(&#x27;Your academic profile is incomplete. Supplementary registration cannot continue.&#x27;);
        }


        if (!this.currentUserId) {
            return { success: false, error: &#x27;User not logged in&#x27; };
        }

        try {
            const registrations = units.map(unit =&gt; ({
                student_id: this.currentUserId,
                unit_code: unit.unit_code,
                unit_name: unit.unit_name || &#x27;Unknown Unit&#x27;,
                block: unit.block || null,
                reg_type: unit.reg_type || &#x27;Supplementary&#x27;,
                status: &#x27;pending&#x27;,
                payment_reference: paymentRef || null,
                submitted_date: new Date().toISOString().split(&#x27;T&#x27;)[0],
                created_at: new Date().toISOString(),
                program: this.currentUserProfile?.program || null,
                intake_year: this.currentUserProfile?.intake_year || new Date().getFullYear()
            }));

            const { data, error } = await this.supabase
                .from(&#x27;student_unit_registrations&#x27;)
                .insert(registrations)
                .select();

            if (error) throw error;

            this.cachedData.supplementaryRegistrations = [];
            this.cachedData.failedUnits = [];

            return { success: true, data: data };

        } catch (error) {
            console.error(&#x27;Error registering supplementary units:&#x27;, error);
            return { success: false, error: error.message };
        }
    }

    async getSupplementaryExamCard(registrationId) {
        if (!this.currentUserId) {
            return { success: false, error: &#x27;User not logged in&#x27; };
        }

        try {
            const { data: registration, error } = await this.supabase
                .from(&#x27;student_unit_registrations&#x27;)
                .select(&#x27;*&#x27;)
                .eq(&#x27;id&#x27;, registrationId)
                .eq(&#x27;student_id&#x27;, this.currentUserId)
                .eq(&#x27;status&#x27;, &#x27;approved&#x27;)
                .single();

            if (error) throw error;

            const profile = this.currentUserProfile || await this.loadUserProfile();

            return {
                success: true,
                registration: registration,
                profile: profile
            };

        } catch (error) {
            console.error(&#x27;Error getting exam card:&#x27;, error);
            return { success: false, error: error.message };
        }
    }

    // ============================================================
    // DASHBOARD FUNCTIONS
    // ============================================================

    async getDashboardMetrics() {
        const userId = this.currentUserId;

        try {
            const { data, error } = await this.supabase.rpc(&#x27;get_student_dashboard&#x27;, {
                p_user_id: userId
            });

            if (error) throw error;

            const profile = this.currentUserProfile || {};
            const courses = await this.getCourses();
            const resources = await this.getResources();
            const failedUnits = await this.getFailedUnits();
            const suppRegistrations = await this.getSupplementaryRegistrations();

            return {
                attendance: data.attendance || { rate: 0, verified: 0, total: 0, pending: 0 },
                examCard: data.examCard || { approved: 0, eligible: false },
                nurseiq: data.nurseiq || { questions: 0, accuracy: 0 },
                exam: data.exam || null,
                announcement: data.announcement || null,
                resources: resources.length || 0,
                courses: courses.length || 0,
                lastLogin: profile?.last_login || null,
                lastLogout: profile?.last_logout || null,
                loginCount: profile?.login_count || 0,
                failedUnits: failedUnits.length || 0,
                supplementaryRegistrations: suppRegistrations.length || 0,
                hasSupplementaryEligibility: failedUnits.length &gt; 0
            };

        } catch (error) {
            console.error(&#x27;Failed to get dashboard metrics:&#x27;, error);
            return await this.getDashboardMetricsFallback();
        }
    }

    async getDashboardMetricsFallback() {
        const userId = this.currentUserId;

        try {
            const { data: logs, error: logsError } = await this.supabase
                .from(&#x27;geo_attendance_logs&#x27;)
                .select(&#x27;is_verified&#x27;)
                .eq(&#x27;student_id&#x27;, userId);

            const totalLogs = logs?.length || 0;
            const verifiedCount = logs?.filter(l =&gt; l.is_verified === true).length || 0;
            const attendanceRate = totalLogs &gt; 0 ? Math.round((verifiedCount / totalLogs) * 100) : 0;

            const { data: profile } = await this.supabase
                .from(&#x27;consolidated_user_profiles_table&#x27;)
                .select(&#x27;last_login, last_logout, last_activity, login_count&#x27;)
                .eq(&#x27;user_id&#x27;, userId)
                .single();

            const courses = await this.getCourses();
            const coursesCount = courses.length;

            const resources = await this.getResources();
            const resourcesCount = resources.length;

            const exams = await this.getExams();
            const upcomingExam = exams
                .filter(exam =&gt; new Date(exam.exam_date) &gt; new Date())
                .sort((a, b) =&gt; new Date(a.exam_date) - new Date(b.exam_date))[0] || null;

            const failedUnits = await this.getFailedUnits();
            const suppRegistrations = await this.getSupplementaryRegistrations();

            return {
                attendance: {
                    rate: attendanceRate,
                    verified: verifiedCount,
                    total: totalLogs,
                    pending: totalLogs - verifiedCount
                },
                examCard: { approved: coursesCount, eligible: coursesCount &gt; 0 },
                nurseiq: { questions: 0, accuracy: 0 },
                exam: upcomingExam,
                announcement: null,
                resources: resourcesCount,
                courses: coursesCount,
                lastLogin: profile?.last_login || null,
                lastLogout: profile?.last_logout || null,
                loginCount: profile?.login_count || 0,
                failedUnits: failedUnits.length || 0,
                supplementaryRegistrations: suppRegistrations.length || 0,
                hasSupplementaryEligibility: failedUnits.length &gt; 0
            };

        } catch (error) {
            console.error(&#x27;Failed to get dashboard metrics (fallback):&#x27;, error);
            return null;
        }
    }

    // ============================================================
    // COURSES FUNCTIONS
    // ============================================================

    async getCourses() {
        if (this.cachedData.courses.length &gt; 0) {
            return this.cachedData.courses;
        }

        const program = this.currentUserProfile?.program || this.currentUserProfile?.department;
        const intakeYear = this.currentUserProfile?.intake_year;
        const block = this.currentUserProfile?.block || this.currentUserProfile?.current_block;

        if (!program || !intakeYear) {
            return [];
        }

        try {
            const blockFilter = `block.eq.${block},block.is.null,block.eq.General`;
            const programFilter = `target_program.eq.${program}`;

            const { data: courses, error } = await this.supabase
                .from(&#x27;courses&#x27;)
                .select(&#x27;*&#x27;)
                .or(programFilter)
                .eq(&#x27;intake_year&#x27;, intakeYear)
                .or(blockFilter)
                .order(&#x27;course_name&#x27;, { ascending: true });

            if (error) throw error;

            this.cachedData.courses = courses || [];
            return this.cachedData.courses;

        } catch (error) {
            console.error(&quot;Failed to load courses:&quot;, error);
            return [];
        }
    }

    // ============================================================
    // EXAMS FUNCTIONS
    // ============================================================

    async getExams() {
        if (this.cachedData.exams.length &gt; 0) {
            return this.cachedData.exams;
        }

        const program = this.currentUserProfile?.program || this.currentUserProfile?.department;
        const block = this.currentUserProfile?.block || this.currentUserProfile?.current_block;
        const intakeYear = this.currentUserProfile?.intake_year;
        const studentId = this.currentUserId;

        if (!program || !intakeYear) {
            return [];
        }

        try {
            const { data: exams, error: examsError } = await this.supabase
                .from(&#x27;exams_with_courses&#x27;)
                .select(`
                    id,
                    exam_name,
                    exam_type,  
                    exam_date,
                    status,
                    block_term,
                    program_type,
                    exam_link,
                    course_name
                `)
                .or(`program_type.eq.${program},program_type.eq.General`)
                .or(`block_term.eq.${block},block_term.is.null,block_term.eq.General`)
                .eq(&#x27;intake_year&#x27;, intakeYear)
                .order(&#x27;exam_date&#x27;, { ascending: true });

            if (examsError) throw examsError;

            const { data: grades, error: gradesError } = await this.supabase
                .from(&#x27;exam_grades&#x27;)
                .select(`
                    exam_id,
                    student_id,
                    cat_1_score,
                    cat_2_score,
                    exam_score,
                    total_score,
                    result_status,
                    marks,
                    graded_by,
                    graded_at
                `)
                .eq(&#x27;student_id&#x27;, studentId)
                .eq(&#x27;question_id&#x27;, &#x27;00000000-0000-0000-0000-000000000000&#x27;)
                .order(&#x27;graded_at&#x27;, { ascending: false });

            if (gradesError) throw gradesError;

            this.cachedData.exams = exams.map(exam =&gt; {
                const grade = grades?.find(g =&gt; String(g.exam_id) === String(exam.id));
                return { ...exam, grade: grade || null };
            });

            return this.cachedData.exams;

        } catch (error) {
            console.error(&#x27;Failed to load exams:&#x27;, error);
            return [];
        }
    }

    // ============================================================
    // ATTENDANCE FUNCTIONS
    // ============================================================

    async getClinicalTargets() {
        if (this.cachedData.clinicalAreas.length &gt; 0) {
            return this.cachedData.clinicalAreas;
        }

        const program = this.currentUserProfile?.program || this.currentUserProfile?.department;
        const intakeYear = this.currentUserProfile?.intake_year;
        const blockTerm = this.currentUserProfile?.block || this.currentUserProfile?.current_block || null;

        if (!program || !intakeYear) {
            return [];
        }

        try {
            const { data: areaData, error: areaError } = await this.supabase
                .from(&#x27;clinical_areas&#x27;)
                .select(&#x27;id, name, latitude, longitude, block, program, intake_year&#x27;)
                .ilike(&#x27;program&#x27;, program)
                .ilike(&#x27;intake_year&#x27;, intakeYear)
                .or(blockTerm ? `block.ilike.${blockTerm},block.is.null` : &#x27;block.is.null&#x27;);

            if (areaError) throw areaError;

            const { data: nameData, error: nameError } = await this.supabase
                .from(&#x27;clinical_names&#x27;)
                .select(&#x27;id, uuid, clinical_area_name, latitude, longitude, program, intake_year, block_term&#x27;)
                .ilike(&#x27;program&#x27;, program)
                .ilike(&#x27;intake_year&#x27;, intakeYear)
                .or(blockTerm ? `block_term.ilike.${blockTerm},block_term.is.null` : &#x27;block_term.is.null&#x27;);

            if (nameError) throw nameError;

            const mappedNames = (nameData || []).map(n =&gt; ({
                id: n.uuid,
                original_id: n.id,
                name: n.clinical_area_name,
                latitude: n.latitude,
                longitude: n.longitude,
                block: n.block_term || null
            }));

            this.cachedData.clinicalAreas = [...(areaData || []), ...mappedNames]
                .filter((v, i, a) =&gt; a.findIndex(t =&gt; t.name === v.name) === i)
                .sort((a, b) =&gt; a.name.localeCompare(b.name));

            return this.cachedData.clinicalAreas;

        } catch (error) {
            console.error(&quot;Error loading clinical areas:&quot;, error);
            return [];
        }
    }

    async getClassTargets() {
        const program = this.currentUserProfile?.program || this.currentUserProfile?.department;
        const intakeYear = this.currentUserProfile?.intake_year;
        const block = this.currentUserProfile?.block || this.currentUserProfile?.current_block || null;

        if (!program || !intakeYear) {
            return [];
        }

        try {
            let query = this.supabase.from(&#x27;courses_sections&#x27;)
                .select(&#x27;id, name, code, latitude, longitude&#x27;)
                .eq(&#x27;program&#x27;, program)
                .eq(&#x27;intake_year&#x27;, intakeYear);

            if (block) query = query.or(`block.eq.${block},block.is.null`);
            else query = query.is(&#x27;block&#x27;, null);

            const { data, error } = await query.order(&#x27;name&#x27;);

            if (error) throw error;

            return (data || []).map(c =&gt; ({
                id: c.id,
                name: c.name,
                code: c.code,
                latitude: c.latitude,
                longitude: c.longitude
            }));

        } catch (error) {
            console.error(&quot;Error loading class targets:&quot;, error);
            return [];
        }
    }

    async getAttendanceHistory() {
        try {
            const { data: logs, error } = await this.supabase
                .from(&#x27;geo_attendance_logs&#x27;)
                .select(&#x27;check_in_time, session_type, target_name, is_verified&#x27;)
                .eq(&#x27;student_id&#x27;, this.currentUserId)
                .order(&#x27;check_in_time&#x27;, { ascending: false })
                .limit(100);

            if (error) throw error;
            return logs || [];

        } catch (error) {
            console.error(&quot;Failed to load attendance history:&quot;, error);
            return [];
        }
    }

    async checkInAttendance(sessionType, targetId, targetName, location, studentProgram) {
        try {
            const deviceId = localStorage.getItem(&#x27;device_id&#x27;) || crypto.randomUUID();
            localStorage.setItem(&#x27;device_id&#x27;, deviceId);

            const checkInTime = new Date().toISOString();

            const targets = sessionType === &#x27;Clinical&#x27; ?
                await this.getClinicalTargets() :
                await this.getClassTargets();

            const target = targets.find(t =&gt; t.id === targetId);

            if (!target || (target.latitude === null || target.longitude === null)) {
                throw new Error(&#x27;Target location coordinates not found&#x27;);
            }

            const R = 6371000;
            const toRad = x =&gt; x * Math.PI / 180;
            const dLat = toRad(location.lat - target.latitude);
            const dLon = toRad(location.lon - target.longitude);
            const lat1 = toRad(location.lat);
            const lat2 = toRad(target.latitude);
            const a = Math.sin(dLat/2)**2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon/2)**2;
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distanceMeters = R * c;
            const isVerified = distanceMeters &lt;= 200;

            const { error } = await this.supabase.rpc(&#x27;check_in_and_defer_fk&#x27;, {
                p_student_id: this.currentUserId,
                p_check_in_time: checkInTime,
                p_session_type: sessionType === &#x27;Clinical&#x27; ? &#x27;Clinical&#x27; : &#x27;Class&#x27;,
                p_target_id: target.id,
                p_target_name: target.name,
                p_latitude: location.lat,
                p_longitude: location.lon,
                p_accuracy_m: location.acc,
                p_location_friendly_name: location.friendly,
                p_program: studentProgram,
                p_block: this.currentUserProfile.block || this.currentUserProfile.current_block,
                p_intake_year: this.currentUserProfile.intake_year,
                p_device_id: deviceId,
                p_is_verified: isVerified,
                p_course_id: sessionType === &#x27;Class&#x27; ? target.id : null,
                p_student_name: this.currentUserProfile.full_name || &#x27;Unknown Student&#x27;
            });

            if (error) throw error;

            await this.updateLastActivity();

            return { success: true, verified: isVerified };

        } catch (error) {
            console.error(&#x27;Check-in failed:&#x27;, error);
            return { success: false, error: error.message };
        }
    }

    // ============================================================
    // RESOURCES FUNCTIONS
    // ============================================================

    async getResources() {
        if (this.cachedData.resources.length &gt; 0) {
            return this.cachedData.resources;
        }

        const program = this.currentUserProfile?.program;
        const block = this.currentUserProfile?.block || this.currentUserProfile?.current_block;
        const intakeYear = this.currentUserProfile?.intake_year;

        if (!program || !intakeYear || !block) {
            return [];
        }

        try {
            const { data: resources, error } = await this.supabase
                .from(&#x27;resources&#x27;)
                .select(&#x27;id, title, file_path, file_url, program_type, block, intake, uploaded_by_name, created_at, description, file_type&#x27;)
                .eq(&#x27;program_type&#x27;, program)
                .eq(&#x27;block&#x27;, block)
                .eq(&#x27;intake&#x27;, intakeYear)
                .order(&#x27;created_at&#x27;, { ascending: false });

            if (error) throw error;

            this.cachedData.resources = resources || [];
            return this.cachedData.resources;

        } catch (err) {
            console.error(&quot;Error loading resources:&quot;, err);
            return [];
        }
    }

    // ============================================================
    // MESSAGES FUNCTIONS
    // ============================================================

    async getMessages() {
        if (this.cachedData.messages.length &gt; 0) {
            return this.cachedData.messages;
        }

        const program = this.currentUserProfile?.program || this.currentUserProfile?.department;

        try {
            const { data: personalMessages, error: personalError } = await this.supabase
                .from(&#x27;student_messages&#x27;)
                .select(&#x27;*&#x27;)
                .or(`recipient_id.eq.${this.currentUserId},recipient_program.eq.${program}`)
                .order(&#x27;created_at&#x27;, { ascending: false });

            if (personalError) throw personalError;

            const { data: notifications, error: notifError } = await this.supabase
                .from(&#x27;notifications&#x27;)
                .select(&#x27;*&#x27;)
                .or(`target_program.eq.${program},target_program.is.null`)
                .order(&#x27;created_at&#x27;, { ascending: false });

            if (notifError) throw notifError;

            this.cachedData.messages = [
                ...(personalMessages || []).map(m =&gt; ({ ...m, type: &#x27;Personal&#x27; })),
                ...(notifications || []).map(n =&gt; ({ ...n, type: &#x27;Announcement&#x27; }))
            ].sort((a, b) =&gt; new Date(b.created_at) - new Date(a.created_at));

            return this.cachedData.messages;

        } catch (error) {
            console.error(&quot;Failed to load messages:&quot;, error);
            return [];
        }
    }

    async sendMessage(message) {
        try {
            const { data, error } = await this.supabase
                .from(&#x27;student_messages&#x27;)
                .insert({
                    student_id: this.currentUserId,
                    student_name: this.currentUserProfile.full_name,
                    student_program: this.currentUserProfile.program || this.currentUserProfile.department,
                    message: message,
                    created_at: new Date().toISOString(),
                    is_read: false
                });

            if (error) throw error;

            await this.updateLastActivity();

            return { success: true };

        } catch (error) {
            console.error(&quot;Failed to send message:&quot;, error);
            return { success: false, error: error.message };
        }
    }

    // ============================================================
    // CALENDAR FUNCTIONS
    // ============================================================

    async getCalendarEvents() {
        const program = this.currentUserProfile?.program || this.currentUserProfile?.department;
        const block = this.currentUserProfile?.block || this.currentUserProfile?.current_block;
        const intakeYear = this.currentUserProfile?.intake_year;

        if (!program || !block || !intakeYear) {
            return [];
        }

        try {
            const { data: events, error } = await this.supabase
                .from(&#x27;calendar_events&#x27;)
                .select(&#x27;event_name, event_date, type, description, target_program, target_block, target_intake_year&#x27;)
                .or(`target_program.eq.${program},target_program.eq.General`)
                .or(`target_block.eq.${block},target_block.is.null`)
                .eq(&#x27;target_intake_year&#x27;, intakeYear);

            if (error) throw error;

            const exams = await this.getExams();
            const examEvents = exams.map(exam =&gt; ({
                event_name: exam.exam_name,
                event_date: exam.exam_date,
                type: &#x27;Exam&#x27;,
                description: `${exam.status || &#x27;Scheduled&#x27;} - Block ${exam.block_term}`
            }));

            return [...(events || []), ...examEvents]
                .sort((a, b) =&gt; new Date(a.event_date) - new Date(b.event_date));

        } catch (error) {
            console.error(&quot;Failed to load calendar events:&quot;, error);
            return [];
        }
    }

    // ============================================================
    // NURSEIQ FUNCTIONS
    // ============================================================

    async getNurseIQQuestions(courseId = null) {
        try {
            let query = this.supabase
                .from(&#x27;medical_assessments&#x27;)
                .select(`
                    *,
                    courses (
                        id,
                        course_name,
                        unit_code,
                        color,
                        description
                    )
                `)
                .eq(&#x27;is_active&#x27;, true)
                .eq(&#x27;is_published&#x27;, true);

            if (courseId) {
                query = query.eq(&#x27;course_id&#x27;, courseId);
            }

            const { data: questions, error } = await query;

            if (error) throw error;
            return questions || [];

        } catch (error) {
            console.error(&#x27;Error loading NurseIQ questions:&#x27;, error);
            return [];
        }
    }

    async getNurseIQCourses() {
        try {
            const questions = await this.getNurseIQQuestions();

            const coursesMap = {};
            questions.forEach(question =&gt; {
                const courseId = question.course_id || &#x27;general&#x27;;
                const courseName = question.courses?.course_name || &#x27;General Nursing&#x27;;
                const unitCode = question.courses?.unit_code || &#x27;KRCHN&#x27;;

                if (!coursesMap[courseId]) {
                    coursesMap[courseId] = {
                        id: courseId,
                        name: courseName,
                        unit_code: unitCode,
                        color: question.courses?.color || &#x27;#4f46e5&#x27;,
                        description: question.courses?.description || &#x27;&#x27;,
                        questions: [],
                        stats: {
                            total: 0,
                            active: 0,
                            hard: 0,
                            medium: 0,
                            easy: 0,
                            lastUpdated: null
                        }
                    };
                }

                coursesMap[courseId].questions.push(question);
                coursesMap[courseId].stats.total++;
                coursesMap[courseId].stats.active++;

                if (question.difficulty === &#x27;hard&#x27;) coursesMap[courseId].stats.hard++;
                else if (question.difficulty === &#x27;medium&#x27;) coursesMap[courseId].stats.medium++;
                else if (question.difficulty === &#x27;easy&#x27;) coursesMap[courseId].stats.easy++;

                if (question.updated_at) {
                    const updatedDate = new Date(question.updated_at);
                    if (!coursesMap[courseId].stats.lastUpdated || updatedDate &gt; coursesMap[courseId].stats.lastUpdated) {
                        coursesMap[courseId].stats.lastUpdated = updatedDate;
                    }
                }
            });

            return Object.values(coursesMap);

        } catch (error) {
            console.error(&#x27;Error loading NurseIQ courses:&#x27;, error);
            return [];
        }
    }

    // ============================================================
    // UTILITY FUNCTIONS
    // ============================================================

    clearCache() {
        this.cachedData = {
            courses: [],
            exams: [],
            clinicalAreas: [],
            resources: [],
            messages: [],
            supplementaryUnits: [],
            supplementaryRegistrations: [],
            failedUnits: []
        };
        console.log(&#x27;🧹 Cache cleared&#x27;);
    }

    async updateLastActivity() {
        if (!this.currentUserId) return;

        try {
            const { error } = await this.supabase
                .from(&#x27;consolidated_user_profiles_table&#x27;)
                .update({
                    last_activity: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq(&#x27;user_id&#x27;, this.currentUserId);

            if (error) console.error(&quot;Failed to update last activity:&quot;, error);

        } catch (error) {
            console.error(&quot;Last activity update error:&quot;, error);
        }
    }

    async updateProfile(updates) {
        try {
            const { error } = await this.supabase
                .from(&#x27;consolidated_user_profiles_table&#x27;)
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq(&#x27;user_id&#x27;, this.currentUserId);

            if (error) throw error;

            this.currentUserProfile = { ...this.currentUserProfile, ...updates };

            if (window.currentUser) {
                window.currentUser = { ...window.currentUser, ...updates };
            }

            await this.updateLastActivity();

            return { success: true };

        } catch (error) {
            console.error(&#x27;Failed to update profile:&#x27;, error);
            return { success: false, error: error.message };
        }
    }

    // ============================================================
    // 📸 PHOTO HANDLING - CORRECTED
    // ============================================================

    async uploadPassportPhoto(file) {
        try {
            const supabase = this.supabase;
            const userId = this.currentUserId;

            if (!userId) {
                throw new Error(&#x27;No user ID found&#x27;);
            }

            const validTypes = [&#x27;image/jpeg&#x27;, &#x27;image/jpg&#x27;, &#x27;image/png&#x27;, &#x27;image/webp&#x27;];
            if (!validTypes.includes(file.type)) {
                return { success: false, error: &#x27;Invalid file type. Please upload JPG, PNG, or WebP.&#x27; };
            }

            if (file.size &gt; 2 * 1024 * 1024) {
                return { success: false, error: &#x27;File too large. Maximum size is 2 MB.&#x27; };
            }

            const fileExt = file.name.split(&#x27;.&#x27;).pop();
            const filePath = `profiles/${userId}/photo.${fileExt}`;

            console.log(&#x27;📸 Uploading photo to:&#x27;, filePath);

            const { error: uploadError } = await supabase.storage
                .from(&#x27;user-documents&#x27;)
                .upload(filePath, file, {
                    cacheControl: &#x27;3600&#x27;,
                    upsert: true,
                    contentType: file.type
                });

            if (uploadError) {
                console.error(&#x27;❌ Upload error:&#x27;, uploadError);
                throw uploadError;
            }

            const { data: urlData } = supabase.storage
                .from(&#x27;user-documents&#x27;)
                .getPublicUrl(filePath);

            const publicUrl = urlData.publicUrl;

            const { error: updateError } = await supabase
                .from(&#x27;consolidated_user_profiles_table&#x27;)
                .update({
                    profile_photo_url: filePath,
                    passport_url: publicUrl,
                    updated_at: new Date().toISOString()
                })
                .eq(&#x27;user_id&#x27;, userId);

            if (updateError) throw updateError;

            if (this.currentUserProfile) {
                this.currentUserProfile.profile_photo_url = filePath;
                this.currentUserProfile.passport_url = publicUrl;
            }

            await this.updateLastActivity();

            console.log(&#x27;✅ Photo uploaded successfully:&#x27;, filePath);
            console.log(&#x27;🔗 Public URL:&#x27;, publicUrl);

            return { success: true, filePath: filePath, publicUrl: publicUrl };

        } catch (error) {
            console.error(&#x27;❌ Failed to upload photo:&#x27;, error);
            return { success: false, error: error.message };
        }
    }

    getPhotoUrl(userId = null) {
        const id = userId || this.currentUserId;
        if (!id) return null;

        const profile = this.currentUserProfile;
        if (!profile) return null;

        const photoPath = profile.profile_photo_url || profile.passport_url;
        if (!photoPath) return null;

        if (photoPath.startsWith(&#x27;http&#x27;)) {
            return photoPath;
        }

        const supabaseUrl = window.APP_CONFIG?.SUPABASE_URL;
        if (!supabaseUrl) throw new Error(&#x27;Supabase URL is not configured.&#x27;);
        return `${supabaseUrl}/storage/v1/object/public/user-documents/${photoPath}`;
    }

    getCurrentUserProfile() {
        return this.currentUserProfile;
    }

    getInstance() {
        return this;
    }
}

// ========== GLOBAL INITIALIZATION ==========

window.db = new Database();

window.getDatabase = async function() {
    await window.db.initialize();
    if (!window.db.supabase) {
        throw new Error(&#x27;Database connection is unavailable.&#x27;);
    }
    return window.db;
};

window.initDatabase = async function() {
    try {
        console.log(&#x27;🔧 Initializing database via global function...&#x27;);
        const dbInstance = await window.db.initialize();
        console.log(&#x27;✅ Database init result:&#x27;, dbInstance ? &#x27;Success&#x27; : &#x27;Failed&#x27;);
        return dbInstance;
    } catch (error) {
        console.error(&#x27;❌ Database initialization error:&#x27;, error);
        return null;
    }
};

function showGitHubSecretsHelp() {
    const helpText = `
# GitHub Secrets Configuration

## Required Secrets:
1. SUPABASE_URL - Your Supabase project URL
   Example: https://lwhtjozfsmbyihenfunw.supabase.co

2. SUPABASE_ANON_KEY - Your Supabase anonymous key
   Example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

3. LOCATIONIQ_API_KEY - LocationIQ API key (optional for geolocation)

## How to Add Secrets:
1. Go to your GitHub repository
2. Click Settings → Secrets and variables → Actions
3. Click &quot;New repository secret&quot;
4. Add each secret with the correct name and value
    `;

    alert(helpText);
}

document.addEventListener(&#x27;DOMContentLoaded&#x27;, function() {
    console.log(&#x27;📄 database.js loaded - DOM ready&#x27;);
});

console.log(&#x27;✅ database.js loaded with Supplementary Registration support and corrected photo upload!&#x27;);

// Global guard for modules that need a verified authenticated user.
// Modules should call this immediately before user-scoped database work.
window.requireAuthenticatedUser = async function () {
    if (!window.db) {
        throw new Error(&#x27;Database is not available.&#x27;);
    }
    return window.db.requireAuthenticatedUser();
};
</pre></div>
</div>
<script>
const code = '// database.js - Complete database operations with Login/Logout Tracking\nclass Database {\n    constructor() {\n        this.supabase = null;\n        this.currentUserId = null;\n        this.currentUserProfile = null;\n        this.cachedData = {\n            courses: [],\n            exams: [],\n            clinicalAreas: [],\n            resources: [],\n            messages: [],\n            supplementaryUnits: [],\n            supplementaryRegistrations: [],\n            failedUnits: []\n        };\n        this.isInitialized = false;\n        this.initializationPromise = null;\n        this.profileModule = null;\n        this.connectionCount = 0;\n        this.lastConnectionTime = null;\n    }\n\n    // Initialize database connection with GitHub Secrets\n    async initialize() {\n        if (this.isInitialized && this.supabase) {\n            return this.supabase;\n        }\n\n        if (this.initializationPromise) {\n            return this.initializationPromise;\n        }\n\n        this.initializationPromise = (async () => {\n            try {\n                const config = window.APP_CONFIG;\n\n                if (!config?.SUPABASE_URL || !config?.SUPABASE_ANON_KEY) {\n                    throw new Error(\'Supabase configuration is missing. Check config.js.\');\n                }\n\n                // Reuse the READY client created by config.js first.\n                // config.js exposes the real Supabase client as window.sb.\n                if (\n                    window.sb &&\n                    typeof window.sb.from === \'function\' &&\n                    window.sb.auth &&\n                    typeof window.sb.auth.getSession === \'function\'\n                ) {\n                    this.supabase = window.sb;\n\n                    console.log(\n                        \'✅ Database: Using Supabase client from window.sb\'\n                    );\n\n                } else if (\n                    window.NCHSMLogin?.supabase &&\n                    typeof window.NCHSMLogin.supabase.from === \'function\'\n                ) {\n                    this.supabase = window.NCHSMLogin.supabase;\n\n                    console.log(\n                        \'✅ Database: Using existing Supabase connection from login\'\n                    );\n\n                } else if (\n                    window.db?.supabase &&\n                    window.db !== this &&\n                    typeof window.db.supabase.from === \'function\'\n                ) {\n                    this.supabase = window.db.supabase;\n\n                    console.log(\n                        \'✅ Database: Using existing Supabase connection from db\'\n                    );\n\n                } else if (\n                    window.supabase &&\n                    typeof window.supabase.from === \'function\'\n                ) {\n                    // Only use window.supabase when it is the actual client.\n                    // The Supabase CDN normally exposes a namespace there,\n                    // which has createClient() but not from().\n                    this.supabase = window.supabase;\n\n                    console.log(\n                        \'✅ Database: Using global Supabase client\'\n                    );\n\n                } else {\n                    if (!window.supabaseClient && typeof supabase === \'undefined\') {\n                        throw new Error(\'Supabase library is not available.\');\n                    }\n\n                    const createClient =\n                        window.supabaseClient?.createClient ||\n                        (typeof supabase !== \'undefined\' && supabase.createClient);\n\n                    if (typeof createClient !== \'function\') {\n                        throw new Error(\'Supabase createClient function is not available.\');\n                    }\n\n                    this.supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {\n                        auth: {\n                            persistSession: true,\n                            autoRefreshToken: true,\n                            detectSessionInUrl: true\n                        }\n                    });\n                }\n\n                if (!this.supabase?.auth) {\n                    throw new Error(\'Supabase authentication client is unavailable.\');\n                }\n\n                // Stable alias for the actual client.\n                window.supabaseClient = this.supabase;\n\n                await this.testConnection();\n                this.isInitialized = true;\n                this.connectionCount += 1;\n                this.lastConnectionTime = new Date();\n\n                return this.supabase;\n            } catch (error) {\n                this.isInitialized = false;\n                this.supabase = this.supabase || null;\n                this.showConfigurationError(error);\n                throw error;\n            } finally {\n                this.initializationPromise = null;\n            }\n        })();\n\n        return this.initializationPromise;\n    }\n\n    async testConnection() {\n        try {\n            // Simple test query\n            const { error } = await this.supabase.auth.getSession();\n\n            if (error) {\n                throw new Error(\'Supabase authentication failed: \' + error.message);\n            }\n\n            console.log(\'🔌 Database connection test passed\');\n            return true;\n\n        } catch (error) {\n            console.error(\'🔌 Database connection test failed:\', error.message);\n\n            // Provide helpful error messages\n            if (error.message.includes(\'JWT\')) {\n                throw new Error(\'Invalid Supabase API key. Check your SUPABASE_ANON_KEY in GitHub Secrets.\');\n            } else if (error.message.includes(\'fetch\')) {\n                throw new Error(\'Network error. Check your SUPABASE_URL in GitHub Secrets.\');\n            } else if (error.message.includes(\'CORS\')) {\n                throw new Error(\'CORS error. Add your domain to Supabase CORS settings.\');\n            } else {\n                throw error;\n            }\n        }\n    }\n\n    // Show configuration error UI\n    showConfigurationError(error) {\n        const errorHtml = `\n            <div style="\n                position: fixed;\n                top: 0;\n                left: 0;\n                right: 0;\n                bottom: 0;\n                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);\n                display: flex;\n                align-items: center;\n                justify-content: center;\n                z-index: 9999;\n                padding: 20px;\n                font-family: \'Inter\', sans-serif;\n            ">\n                <div style="\n                    background: white;\n                    border-radius: 16px;\n                    padding: 40px;\n                    max-width: 600px;\n                    width: 100%;\n                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);\n                    text-align: center;\n                ">\n                    <div style="margin-bottom: 30px;">\n                        <div style="\n                            width: 80px;\n                            height: 80px;\n                            background: #ef4444;\n                            border-radius: 50%;\n                            display: flex;\n                            align-items: center;\n                            justify-content: center;\n                            margin: 0 auto 20px;\n                        ">\n                            <i class="fas fa-database" style="font-size: 36px; color: white;"></i>\n                        </div>\n                        <h1 style="color: #1f2937; margin-bottom: 10px;">Configuration Error</h1>\n                        <p style="color: #6b7280; margin-bottom: 20px;">\n                            Failed to load application configuration.\n                        </p>\n                    </div>\n                    \n                    <div style="\n                        background: #f3f4f6;\n                        border-radius: 12px;\n                        padding: 20px;\n                        margin-bottom: 30px;\n                        text-align: left;\n                    ">\n                        <h3 style="color: #374151; margin-bottom: 10px;">Error Details:</h3>\n                        <code style="\n                            background: #1f2937;\n                            color: #10b981;\n                            padding: 10px;\n                            border-radius: 6px;\n                            display: block;\n                            font-family: monospace;\n                            font-size: 14px;\n                            overflow-x: auto;\n                        ">\n                            ${error.message}\n                        </code>\n                    </div>\n                    \n                    <div style="\n                        background: #f0f9ff;\n                        border-radius: 12px;\n                        padding: 20px;\n                        margin-bottom: 30px;\n                        text-align: left;\n                        border-left: 4px solid #0ea5e9;\n                    ">\n                        <h3 style="color: #0369a1; margin-bottom: 10px;">\n                            <i class="fas fa-info-circle"></i> How to Fix:\n                        </h3>\n                        <ol style="color: #374151; margin-left: 20px;">\n                            <li>Check if <strong>config.js</strong> file exists</li>\n                            <li>Verify GitHub Secrets are properly set (SUPABASE_URL, SUPABASE_ANON_KEY)</li>\n                            <li>Check browser console for detailed errors</li>\n                            <li>Ensure GitHub Actions workflow generated config.js</li>\n                        </ol>\n                    </div>\n                    \n                    <div style="display: flex; gap: 10px; justify-content: center;">\n                        <button onclick="window.location.reload()" style="\n                            background: #4f46e5;\n                            color: white;\n                            border: none;\n                            padding: 12px 24px;\n                            border-radius: 8px;\n                            cursor: pointer;\n                            font-weight: 600;\n                            display: flex;\n                            align-items: center;\n                            gap: 8px;\n                        ">\n                            <i class="fas fa-redo"></i> Try Again\n                        </button>\n                        \n                        <button onclick="showGitHubSecretsHelp()" style="\n                            background: #6b7280;\n                            color: white;\n                            border: none;\n                            padding: 12px 24px;\n                            border-radius: 8px;\n                            cursor: pointer;\n                            font-weight: 600;\n                            display: flex;\n                            align-items: center;\n                            gap: 8px;\n                        ">\n                            <i class="fas fa-question-circle"></i> GitHub Secrets Help\n                        </button>\n                    </div>\n                    \n                    ${window.APP_CONFIG ? `\n                    <div style="margin-top: 20px; color: #9ca3af; font-size: 12px;">\n                        <i class="fas fa-code-branch"></i> \n                        Build: ${window.APP_CONFIG.BUILD_TIME} | \n                        Commit: ${window.APP_CONFIG.COMMIT_SHA?.substring(0, 7) || \'unknown\'} |\n                        Config: ${window.APP_CONFIG.SUPABASE_URL ? \'Loaded\' : \'Missing\'}\n                    </div>\n                    ` : \'\'}\n                </div>\n            </div>\n        `;\n\n        document.body.innerHTML = errorHtml;\n    }\n\n    // ============================================================\n    // 🔥 FIXED: AUTHENTICATION FUNCTIONS - NO AUTO-REDIRECT!\n    // ============================================================\n\n    /**\n     * Return the current authenticated session.\n     * This is the single gate used by database operations that require a user.\n     */\n    async getAuthenticatedSession() {\n        if (!this.supabase?.auth) {\n            throw new Error(\'Database is not initialized.\');\n        }\n\n        const { data, error } = await this.supabase.auth.getSession();\n\n        if (error) {\n            throw error;\n        }\n\n        const session = data?.session;\n\n        if (!session?.user?.id) {\n            this.currentUserId = null;\n            this.currentUserProfile = null;\n            throw new Error(\'No authenticated user session.\');\n        }\n\n        // Keep the local user identity synchronized with Supabase.\n        if (this.currentUserId && this.currentUserId !== session.user.id) {\n            this.clearUserState();\n        }\n\n        this.currentUserId = session.user.id;\n        return session;\n    }\n\n    /**\n     * Require an authenticated user before accessing user-scoped data.\n     */\n    async requireAuthenticatedUser() {\n        const session = await this.getAuthenticatedSession();\n        return session.user.id;\n    }\n\n    /**\n     * Clear user-scoped state without signing the user out.\n     */\n    clearUserState() {\n        this.currentUserId = null;\n        this.currentUserProfile = null;\n        this.cachedData = {\n            courses: [],\n            exams: [],\n            attendance: [],\n            resources: [],\n            messages: [],\n            calendar: []\n        };\n    }\n\n    async checkAuth() {\n        try {\n            await this.initialize();\n\n            const session = await this.getAuthenticatedSession();\n            const userId = session.user.id;\n\n            const profile = await this.loadUserProfile(userId);\n\n            if (!profile) {\n                return false;\n            }\n\n            const requiredAcademicFields = [\'program\', \'block\', \'intake_year\'];\n            const missingFields = requiredAcademicFields.filter(\n                field => profile[field] === null ||\n                         profile[field] === undefined ||\n                         String(profile[field]).trim() === \'\'\n            );\n\n            if (missingFields.length > 0) {\n                console.warn(\'Profile is missing required academic fields:\', missingFields);\n                this.showIncompleteProfileWarning(profile, missingFields);\n                return false;\n            }\n\n            await this.recordLoginTime();\n            return true;\n        } catch (error) {\n            console.error(\'Authentication check failed:\', error);\n\n            if (error?.message === \'No authenticated user session.\') {\n                this.showDatabaseError(\'Your session has expired. Please sign in again.\');\n            } else {\n                this.showDatabaseError(error?.message || \'Unable to verify your account.\');\n            }\n\n            return false;\n        }\n    }\n\n    async loadUserProfile() {\n        try {\n            console.log(\'👤 Loading user profile...\');\n\n            if (!this.currentUserId) {\n                console.error(\'❌ No user ID available\');\n                this.showDatabaseError(\'No User ID\', \'Please login again.\');\n                return null;\n            }\n\n            // Try consolidated_user_profiles_table\n            const { data: consolidatedProfile, error: consolidatedError } = await this.supabase\n                .from(\'consolidated_user_profiles_table\')\n                .select(\'*\')\n                .eq(\'user_id\', this.currentUserId)\n                .maybeSingle();\n\n            if (!consolidatedError && consolidatedProfile) {\n                console.log(\'✅ User loaded from consolidated_user_profiles_table\');\n                this.currentUserProfile = consolidatedProfile;\n\n                // ✅ CHECK REQUIRED FIELDS\n                const requiredFields = [\'program\', \'block\', \'intake_year\'];\n                const missingFields = requiredFields.filter(f => !consolidatedProfile[f]);\n\n                if (missingFields.length > 0) {\n                    console.warn(\'⚠️ Profile incomplete. Missing:\', missingFields.join(\', \'));\n                    console.warn(\'📝 Current values:\', {\n                        program: consolidatedProfile.program || \'NULL\',\n                        block: consolidatedProfile.block || \'NULL\',\n                        intake_year: consolidatedProfile.intake_year || \'NULL\',\n                        student_id: consolidatedProfile.student_id || \'NULL\'\n                    });\n\n                    // ✅ SHOW WARNING INSTEAD OF CREATING FAKE DATA\n                    this.showIncompleteProfileWarning(missingFields);\n                    return null;\n                }\n\n                return consolidatedProfile;\n            }\n\n            // Try profiles table\n            const { data: regularProfile, error: regularError } = await this.supabase\n                .from(\'profiles\')\n                .select(\'*\')\n                .eq(\'id\', this.currentUserId)\n                .maybeSingle();\n\n            if (!regularError && regularProfile) {\n                console.log(\'✅ User loaded from profiles table\');\n                this.currentUserProfile = regularProfile;\n                return regularProfile;\n            }\n\n            // Try by email\n            const { data: userData } = await this.supabase.auth.getUser();\n            if (userData?.user?.email) {\n                const { data: emailProfile, error: emailError } = await this.supabase\n                    .from(\'consolidated_user_profiles_table\')\n                    .select(\'*\')\n                    .eq(\'email\', userData.user.email)\n                    .maybeSingle();\n\n                if (!emailError && emailProfile) {\n                    console.log(\'✅ User loaded by email from consolidated table\');\n                    this.currentUserProfile = emailProfile;\n\n                    // ✅ CHECK REQUIRED FIELDS\n                    const requiredFields = [\'program\', \'block\', \'intake_year\'];\n                    const missingFields = requiredFields.filter(f => !emailProfile[f]);\n\n                    if (missingFields.length > 0) {\n                        console.warn(\'⚠️ Profile incomplete. Missing:\', missingFields.join(\', \'));\n                        this.showIncompleteProfileWarning(missingFields);\n                        return null;\n                    }\n\n                    return emailProfile;\n                }\n            }\n\n            // ============================================================\n            // 🔥 FIX: NO MORE FALLBACK PROFILE!\n            // Instead, show a clear error message\n            // ============================================================\n            console.error(\'❌ No profile found for user:\', this.currentUserId);\n\n            // ✅ Show error instead of creating fake data\n            this.showNoProfileError();\n\n            // ✅ Return null instead of fake profile\n            this.currentUserProfile = null;\n            return null;\n\n        } catch (error) {\n            console.error(\'❌ Failed to load profile:\', error);\n            this.showDatabaseError(\'Error loading profile: \' + error.message);\n            this.currentUserProfile = null;\n            return null;\n        }\n    }\n\n    // ============================================================\n    // ✅ ERROR DISPLAY FUNCTIONS\n    // ============================================================\n\n    showIncompleteProfileWarning(missingFields) {\n        // Remove existing overlay if any\n        const existing = document.querySelector(\'.db-error-overlay\');\n        if (existing) existing.remove();\n\n        const overlay = document.createElement(\'div\');\n        overlay.className = \'db-error-overlay\';\n        overlay.style.cssText = `\n            position: fixed;\n            top: 0;\n            left: 0;\n            right: 0;\n            bottom: 0;\n            background: rgba(0,0,0,0.6);\n            backdrop-filter: blur(4px);\n            z-index: 99999;\n            display: flex;\n            align-items: center;\n            justify-content: center;\n            font-family: \'Inter\', sans-serif;\n        `;\n        overlay.innerHTML = `\n            <div style="\n                background: white;\n                border-radius: 16px;\n                padding: 40px;\n                max-width: 500px;\n                width: 90%;\n                box-shadow: 0 20px 60px rgba(0,0,0,0.3);\n                text-align: center;\n                animation: slideUp 0.3s ease;\n            ">\n                <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>\n                <h3 style="color: #d97706; margin: 0 0 8px 0;">Incomplete Profile</h3>\n                <p style="color: #6b7280; margin: 0 0 12px 0;">\n                    Your student profile is missing required information:\n                </p>\n                <div style="background: #fef3c7; border-radius: 8px; padding: 12px; margin-bottom: 20px;">\n                    <strong style="color: #92400e;">Missing:</strong>\n                    <span style="color: #78350f;">${missingFields.join(\', \')}</span>\n                </div>\n                <p style="color: #6b7280; font-size: 14px; margin-bottom: 20px;">\n                    Please contact the administrator to complete your profile.\n                </p>\n                <button onclick="window.location.href=\'/login.html\'" style="\n                    background: #4C1D95;\n                    color: white;\n                    border: none;\n                    padding: 12px 32px;\n                    border-radius: 8px;\n                    cursor: pointer;\n                    font-weight: 600;\n                    font-size: 16px;\n                    transition: all 0.3s ease;\n                " onmouseover="this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.transform=\'none\'">\n                    Go to Login\n                </button>\n                <br><br>\n                <button onclick="location.reload()" style="\n                    background: transparent;\n                    color: #4C1D95;\n                    border: none;\n                    cursor: pointer;\n                    font-weight: 500;\n                    font-size: 14px;\n                    text-decoration: underline;\n                ">\n                    Try Again\n                </button>\n            </div>\n        `;\n        document.body.appendChild(overlay);\n    }\n\n    showNoProfileError() {\n        const existing = document.querySelector(\'.db-error-overlay\');\n        if (existing) existing.remove();\n\n        const overlay = document.createElement(\'div\');\n        overlay.className = \'db-error-overlay\';\n        overlay.style.cssText = `\n            position: fixed;\n            top: 0;\n            left: 0;\n            right: 0;\n            bottom: 0;\n            background: rgba(0,0,0,0.6);\n            backdrop-filter: blur(4px);\n            z-index: 99999;\n            display: flex;\n            align-items: center;\n            justify-content: center;\n            font-family: \'Inter\', sans-serif;\n        `;\n        overlay.innerHTML = `\n            <div style="\n                background: white;\n                border-radius: 16px;\n                padding: 40px;\n                max-width: 500px;\n                width: 90%;\n                box-shadow: 0 20px 60px rgba(0,0,0,0.3);\n                text-align: center;\n                animation: slideUp 0.3s ease;\n            ">\n                <div style="font-size: 48px; margin-bottom: 16px;">🚫</div>\n                <h3 style="color: #dc2626; margin: 0 0 8px 0;">Profile Not Found</h3>\n                <p style="color: #6b7280; margin: 0 0 20px 0;">\n                    No student profile was found for your account.\n                    Please contact support to set up your profile.\n                </p>\n                <button onclick="window.location.href=\'/login.html\'" style="\n                    background: #4C1D95;\n                    color: white;\n                    border: none;\n                    padding: 12px 32px;\n                    border-radius: 8px;\n                    cursor: pointer;\n                    font-weight: 600;\n                    font-size: 16px;\n                    transition: all 0.3s ease;\n                " onmouseover="this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.transform=\'none\'">\n                    Go to Login\n                </button>\n            </div>\n        `;\n        document.body.appendChild(overlay);\n    }\n\n    showDatabaseError(message) {\n        const existing = document.querySelector(\'.db-error-overlay\');\n        if (existing) existing.remove();\n\n        const overlay = document.createElement(\'div\');\n        overlay.className = \'db-error-overlay\';\n        overlay.style.cssText = `\n            position: fixed;\n            top: 0;\n            left: 0;\n            right: 0;\n            bottom: 0;\n            background: rgba(0,0,0,0.6);\n            backdrop-filter: blur(4px);\n            z-index: 99999;\n            display: flex;\n            align-items: center;\n            justify-content: center;\n            font-family: \'Inter\', sans-serif;\n        `;\n        overlay.innerHTML = `\n            <div style="\n                background: white;\n                border-radius: 16px;\n                padding: 40px;\n                max-width: 500px;\n                width: 90%;\n                box-shadow: 0 20px 60px rgba(0,0,0,0.3);\n                text-align: center;\n                animation: slideUp 0.3s ease;\n            ">\n                <div style="font-size: 48px; margin-bottom: 16px;">💥</div>\n                <h3 style="color: #dc2626; margin: 0 0 8px 0;">Database Error</h3>\n                <p style="color: #6b7280; margin: 0 0 20px 0;">\n                    ${message}\n                </p>\n                <button onclick="location.reload()" style="\n                    background: #4C1D95;\n                    color: white;\n                    border: none;\n                    padding: 12px 32px;\n                    border-radius: 8px;\n                    cursor: pointer;\n                    font-weight: 600;\n                    font-size: 16px;\n                    transition: all 0.3s ease;\n                " onmouseover="this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.transform=\'none\'">\n                    Try Again\n                </button>\n                <br><br>\n                <button onclick="window.location.href=\'/login.html\'" style="\n                    background: transparent;\n                    color: #4C1D95;\n                    border: none;\n                    cursor: pointer;\n                    font-weight: 500;\n                    font-size: 14px;\n                    text-decoration: underline;\n                ">\n                    Go to Login\n                </button>\n            </div>\n        `;\n        document.body.appendChild(overlay);\n    }\n\n    // Record login time\n    async recordLoginTime() {\n        if (!this.currentUserId) {\n            console.warn(\'No user ID to record login time\');\n            return;\n        }\n\n        try {\n            const nowISO = new Date().toISOString();\n\n            const { error } = await this.supabase\n                .from(\'consolidated_user_profiles_table\')\n                .update({\n                    last_login: nowISO,\n                    last_activity: nowISO,\n                    updated_at: nowISO\n                })\n                .eq(\'user_id\', this.currentUserId);\n\n            if (error) {\n                console.error("Failed to record login time:", error);\n            } else {\n                console.log(`✅ Login time recorded at ${nowISO}`);\n            }\n\n        } catch (error) {\n            console.error("Login recording error:", error);\n        }\n    }\n\n    // Record logout time\n    async recordLogoutTime() {\n        if (!this.currentUserId) {\n            console.warn(\'No user ID to record logout time\');\n            return;\n        }\n\n        try {\n            const nowISO = new Date().toISOString();\n\n            const { error } = await this.supabase\n                .from(\'consolidated_user_profiles_table\')\n                .update({\n                    last_activity: nowISO,\n                    last_logout: nowISO,\n                    updated_at: nowISO\n                })\n                .eq(\'user_id\', this.currentUserId);\n\n            if (error) {\n                console.error("Failed to record logout time:", error);\n            } else {\n                console.log(`✅ Logout time recorded at ${nowISO}`);\n            }\n\n        } catch (error) {\n            console.error("Logout recording error:", error);\n        }\n    }\n\n    // Updated: Logout with tracking\n    async logout() {\n        try {\n            await this.recordLogoutTime();\n            this.supabase.realtime.channels.forEach(channel => this.supabase.removeChannel(channel));\n            await this.supabase.auth.signOut();\n            this.clearUserState();\n            this.clearCache();\n            window.location.href = "login.html";\n        } catch (error) {\n            console.error("Logout error:", error);\n            window.location.href = "login.html";\n        }\n    }\n\n    // Load profile data\n    async loadProfileData() {\n        console.log(\'🔄 Database.loadProfileData() called\');\n\n        if (this.profileModule) {\n            console.log(\'🎯 Loading profile via module...\');\n            await this.profileModule.loadProfile();\n        } else if (typeof window.loadProfile === \'function\') {\n            console.log(\'🎯 Loading profile via global function...\');\n            await window.loadProfile();\n        } else if (this.currentUserId && this.supabase) {\n            console.log(\'🎯 Loading profile directly...\');\n            await this.loadUserProfile();\n        }\n    }\n\n    // ============================================================\n    // SUPPLEMENTARY REGISTRATION FUNCTIONS\n    // ============================================================\n\n    async getFailedUnits() {\n        if (this.cachedData.failedUnits.length > 0) {\n            return this.cachedData.failedUnits;\n        }\n\n        if (!this.currentUserId) {\n            console.warn(\'No user ID to get failed units\');\n            return [];\n        }\n\n        try {\n            const { data: grades, error } = await this.supabase\n                .from(\'exam_grades\')\n                .select(\'*, exams:exam_id(unit_code, course_name, block_term, exam_name, program_type)\')\n                .eq(\'student_id\', this.currentUserId);\n\n            if (error) throw error;\n\n            const failedUnits = [];\n            const processed = new Set();\n\n            if (grades) {\n                for (const grade of grades) {\n                    const score = grade.total_score || grade.marks || 0;\n                    const unitCode = grade.exams?.unit_code || grade.subject_name || grade.exam_name;\n\n                    if (score < 50 && unitCode && !processed.has(unitCode)) {\n                        processed.add(unitCode);\n\n                        const { data: existingReg } = await this.supabase\n                            .from(\'student_unit_registrations\')\n                            .select(\'id, status\')\n                            .eq(\'student_id\', this.currentUserId)\n                            .eq(\'unit_code\', unitCode)\n                            .in(\'reg_type\', [\'Supplementary\', \'Resit\', \'Retake\'])\n                            .maybeSingle();\n\n                        let regType = \'Supplementary\';\n                        if (score < 30) regType = \'Retake\';\n                        else if (score < 40) regType = \'Resit\';\n\n                        failedUnits.push({\n                            unit_code: unitCode,\n                            unit_name: grade.exams?.course_name || grade.subject_name || unitCode,\n                            block: grade.exams?.block_term || \'N/A\',\n                            score: score,\n                            reg_type: regType,\n                            status: existingReg ? existingReg.status : \'Eligible\',\n                            existing_id: existingReg?.id || null\n                        });\n                    }\n                }\n            }\n\n            this.cachedData.failedUnits = failedUnits;\n            return failedUnits;\n\n        } catch (error) {\n            console.error(\'Error loading failed units:\', error);\n            return [];\n        }\n    }\n\n    async getSupplementaryRegistrations() {\n        if (this.cachedData.supplementaryRegistrations.length > 0) {\n            return this.cachedData.supplementaryRegistrations;\n        }\n\n        if (!this.currentUserId) {\n            console.warn(\'No user ID to get supplementary registrations\');\n            return [];\n        }\n\n        try {\n            const { data, error } = await this.supabase\n                .from(\'student_unit_registrations\')\n                .select(\'*\')\n                .eq(\'student_id\', this.currentUserId)\n                .in(\'reg_type\', [\'Supplementary\', \'Resit\', \'Retake\'])\n                .order(\'submitted_date\', { ascending: false });\n\n            if (error) throw error;\n\n            this.cachedData.supplementaryRegistrations = data || [];\n            return this.cachedData.supplementaryRegistrations;\n\n        } catch (error) {\n            console.error(\'Error loading supplementary registrations:\', error);\n            return [];\n        }\n    }\n\n    async registerSupplementaryUnits(units, paymentRef = null) {\n        const userId = await this.requireAuthenticatedUser();\n        if (!this.currentUserProfile) {\n            await this.loadUserProfile(userId);\n        }\n        if (!this.currentUserProfile?.program ||\n            !this.currentUserProfile?.block ||\n            !this.currentUserProfile?.intake_year) {\n            throw new Error(\'Your academic profile is incomplete. Supplementary registration cannot continue.\');\n        }\n\n\n        if (!this.currentUserId) {\n            return { success: false, error: \'User not logged in\' };\n        }\n\n        try {\n            const registrations = units.map(unit => ({\n                student_id: this.currentUserId,\n                unit_code: unit.unit_code,\n                unit_name: unit.unit_name || \'Unknown Unit\',\n                block: unit.block || null,\n                reg_type: unit.reg_type || \'Supplementary\',\n                status: \'pending\',\n                payment_reference: paymentRef || null,\n                submitted_date: new Date().toISOString().split(\'T\')[0],\n                created_at: new Date().toISOString(),\n                program: this.currentUserProfile?.program || null,\n                intake_year: this.currentUserProfile?.intake_year || new Date().getFullYear()\n            }));\n\n            const { data, error } = await this.supabase\n                .from(\'student_unit_registrations\')\n                .insert(registrations)\n                .select();\n\n            if (error) throw error;\n\n            this.cachedData.supplementaryRegistrations = [];\n            this.cachedData.failedUnits = [];\n\n            return { success: true, data: data };\n\n        } catch (error) {\n            console.error(\'Error registering supplementary units:\', error);\n            return { success: false, error: error.message };\n        }\n    }\n\n    async getSupplementaryExamCard(registrationId) {\n        if (!this.currentUserId) {\n            return { success: false, error: \'User not logged in\' };\n        }\n\n        try {\n            const { data: registration, error } = await this.supabase\n                .from(\'student_unit_registrations\')\n                .select(\'*\')\n                .eq(\'id\', registrationId)\n                .eq(\'student_id\', this.currentUserId)\n                .eq(\'status\', \'approved\')\n                .single();\n\n            if (error) throw error;\n\n            const profile = this.currentUserProfile || await this.loadUserProfile();\n\n            return {\n                success: true,\n                registration: registration,\n                profile: profile\n            };\n\n        } catch (error) {\n            console.error(\'Error getting exam card:\', error);\n            return { success: false, error: error.message };\n        }\n    }\n\n    // ============================================================\n    // DASHBOARD FUNCTIONS\n    // ============================================================\n\n    async getDashboardMetrics() {\n        const userId = this.currentUserId;\n\n        try {\n            const { data, error } = await this.supabase.rpc(\'get_student_dashboard\', {\n                p_user_id: userId\n            });\n\n            if (error) throw error;\n\n            const profile = this.currentUserProfile || {};\n            const courses = await this.getCourses();\n            const resources = await this.getResources();\n            const failedUnits = await this.getFailedUnits();\n            const suppRegistrations = await this.getSupplementaryRegistrations();\n\n            return {\n                attendance: data.attendance || { rate: 0, verified: 0, total: 0, pending: 0 },\n                examCard: data.examCard || { approved: 0, eligible: false },\n                nurseiq: data.nurseiq || { questions: 0, accuracy: 0 },\n                exam: data.exam || null,\n                announcement: data.announcement || null,\n                resources: resources.length || 0,\n                courses: courses.length || 0,\n                lastLogin: profile?.last_login || null,\n                lastLogout: profile?.last_logout || null,\n                loginCount: profile?.login_count || 0,\n                failedUnits: failedUnits.length || 0,\n                supplementaryRegistrations: suppRegistrations.length || 0,\n                hasSupplementaryEligibility: failedUnits.length > 0\n            };\n\n        } catch (error) {\n            console.error(\'Failed to get dashboard metrics:\', error);\n            return await this.getDashboardMetricsFallback();\n        }\n    }\n\n    async getDashboardMetricsFallback() {\n        const userId = this.currentUserId;\n\n        try {\n            const { data: logs, error: logsError } = await this.supabase\n                .from(\'geo_attendance_logs\')\n                .select(\'is_verified\')\n                .eq(\'student_id\', userId);\n\n            const totalLogs = logs?.length || 0;\n            const verifiedCount = logs?.filter(l => l.is_verified === true).length || 0;\n            const attendanceRate = totalLogs > 0 ? Math.round((verifiedCount / totalLogs) * 100) : 0;\n\n            const { data: profile } = await this.supabase\n                .from(\'consolidated_user_profiles_table\')\n                .select(\'last_login, last_logout, last_activity, login_count\')\n                .eq(\'user_id\', userId)\n                .single();\n\n            const courses = await this.getCourses();\n            const coursesCount = courses.length;\n\n            const resources = await this.getResources();\n            const resourcesCount = resources.length;\n\n            const exams = await this.getExams();\n            const upcomingExam = exams\n                .filter(exam => new Date(exam.exam_date) > new Date())\n                .sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date))[0] || null;\n\n            const failedUnits = await this.getFailedUnits();\n            const suppRegistrations = await this.getSupplementaryRegistrations();\n\n            return {\n                attendance: {\n                    rate: attendanceRate,\n                    verified: verifiedCount,\n                    total: totalLogs,\n                    pending: totalLogs - verifiedCount\n                },\n                examCard: { approved: coursesCount, eligible: coursesCount > 0 },\n                nurseiq: { questions: 0, accuracy: 0 },\n                exam: upcomingExam,\n                announcement: null,\n                resources: resourcesCount,\n                courses: coursesCount,\n                lastLogin: profile?.last_login || null,\n                lastLogout: profile?.last_logout || null,\n                loginCount: profile?.login_count || 0,\n                failedUnits: failedUnits.length || 0,\n                supplementaryRegistrations: suppRegistrations.length || 0,\n                hasSupplementaryEligibility: failedUnits.length > 0\n            };\n\n        } catch (error) {\n            console.error(\'Failed to get dashboard metrics (fallback):\', error);\n            return null;\n        }\n    }\n\n    // ============================================================\n    // COURSES FUNCTIONS\n    // ============================================================\n\n    async getCourses() {\n        if (this.cachedData.courses.length > 0) {\n            return this.cachedData.courses;\n        }\n\n        const program = this.currentUserProfile?.program || this.currentUserProfile?.department;\n        const intakeYear = this.currentUserProfile?.intake_year;\n        const block = this.currentUserProfile?.block || this.currentUserProfile?.current_block;\n\n        if (!program || !intakeYear) {\n            return [];\n        }\n\n        try {\n            const blockFilter = `block.eq.${block},block.is.null,block.eq.General`;\n            const programFilter = `target_program.eq.${program}`;\n\n            const { data: courses, error } = await this.supabase\n                .from(\'courses\')\n                .select(\'*\')\n                .or(programFilter)\n                .eq(\'intake_year\', intakeYear)\n                .or(blockFilter)\n                .order(\'course_name\', { ascending: true });\n\n            if (error) throw error;\n\n            this.cachedData.courses = courses || [];\n            return this.cachedData.courses;\n\n        } catch (error) {\n            console.error("Failed to load courses:", error);\n            return [];\n        }\n    }\n\n    // ============================================================\n    // EXAMS FUNCTIONS\n    // ============================================================\n\n    async getExams() {\n        if (this.cachedData.exams.length > 0) {\n            return this.cachedData.exams;\n        }\n\n        const program = this.currentUserProfile?.program || this.currentUserProfile?.department;\n        const block = this.currentUserProfile?.block || this.currentUserProfile?.current_block;\n        const intakeYear = this.currentUserProfile?.intake_year;\n        const studentId = this.currentUserId;\n\n        if (!program || !intakeYear) {\n            return [];\n        }\n\n        try {\n            const { data: exams, error: examsError } = await this.supabase\n                .from(\'exams_with_courses\')\n                .select(`\n                    id,\n                    exam_name,\n                    exam_type,  \n                    exam_date,\n                    status,\n                    block_term,\n                    program_type,\n                    exam_link,\n                    course_name\n                `)\n                .or(`program_type.eq.${program},program_type.eq.General`)\n                .or(`block_term.eq.${block},block_term.is.null,block_term.eq.General`)\n                .eq(\'intake_year\', intakeYear)\n                .order(\'exam_date\', { ascending: true });\n\n            if (examsError) throw examsError;\n\n            const { data: grades, error: gradesError } = await this.supabase\n                .from(\'exam_grades\')\n                .select(`\n                    exam_id,\n                    student_id,\n                    cat_1_score,\n                    cat_2_score,\n                    exam_score,\n                    total_score,\n                    result_status,\n                    marks,\n                    graded_by,\n                    graded_at\n                `)\n                .eq(\'student_id\', studentId)\n                .eq(\'question_id\', \'00000000-0000-0000-0000-000000000000\')\n                .order(\'graded_at\', { ascending: false });\n\n            if (gradesError) throw gradesError;\n\n            this.cachedData.exams = exams.map(exam => {\n                const grade = grades?.find(g => String(g.exam_id) === String(exam.id));\n                return { ...exam, grade: grade || null };\n            });\n\n            return this.cachedData.exams;\n\n        } catch (error) {\n            console.error(\'Failed to load exams:\', error);\n            return [];\n        }\n    }\n\n    // ============================================================\n    // ATTENDANCE FUNCTIONS\n    // ============================================================\n\n    async getClinicalTargets() {\n        if (this.cachedData.clinicalAreas.length > 0) {\n            return this.cachedData.clinicalAreas;\n        }\n\n        const program = this.currentUserProfile?.program || this.currentUserProfile?.department;\n        const intakeYear = this.currentUserProfile?.intake_year;\n        const blockTerm = this.currentUserProfile?.block || this.currentUserProfile?.current_block || null;\n\n        if (!program || !intakeYear) {\n            return [];\n        }\n\n        try {\n            const { data: areaData, error: areaError } = await this.supabase\n                .from(\'clinical_areas\')\n                .select(\'id, name, latitude, longitude, block, program, intake_year\')\n                .ilike(\'program\', program)\n                .ilike(\'intake_year\', intakeYear)\n                .or(blockTerm ? `block.ilike.${blockTerm},block.is.null` : \'block.is.null\');\n\n            if (areaError) throw areaError;\n\n            const { data: nameData, error: nameError } = await this.supabase\n                .from(\'clinical_names\')\n                .select(\'id, uuid, clinical_area_name, latitude, longitude, program, intake_year, block_term\')\n                .ilike(\'program\', program)\n                .ilike(\'intake_year\', intakeYear)\n                .or(blockTerm ? `block_term.ilike.${blockTerm},block_term.is.null` : \'block_term.is.null\');\n\n            if (nameError) throw nameError;\n\n            const mappedNames = (nameData || []).map(n => ({\n                id: n.uuid,\n                original_id: n.id,\n                name: n.clinical_area_name,\n                latitude: n.latitude,\n                longitude: n.longitude,\n                block: n.block_term || null\n            }));\n\n            this.cachedData.clinicalAreas = [...(areaData || []), ...mappedNames]\n                .filter((v, i, a) => a.findIndex(t => t.name === v.name) === i)\n                .sort((a, b) => a.name.localeCompare(b.name));\n\n            return this.cachedData.clinicalAreas;\n\n        } catch (error) {\n            console.error("Error loading clinical areas:", error);\n            return [];\n        }\n    }\n\n    async getClassTargets() {\n        const program = this.currentUserProfile?.program || this.currentUserProfile?.department;\n        const intakeYear = this.currentUserProfile?.intake_year;\n        const block = this.currentUserProfile?.block || this.currentUserProfile?.current_block || null;\n\n        if (!program || !intakeYear) {\n            return [];\n        }\n\n        try {\n            let query = this.supabase.from(\'courses_sections\')\n                .select(\'id, name, code, latitude, longitude\')\n                .eq(\'program\', program)\n                .eq(\'intake_year\', intakeYear);\n\n            if (block) query = query.or(`block.eq.${block},block.is.null`);\n            else query = query.is(\'block\', null);\n\n            const { data, error } = await query.order(\'name\');\n\n            if (error) throw error;\n\n            return (data || []).map(c => ({\n                id: c.id,\n                name: c.name,\n                code: c.code,\n                latitude: c.latitude,\n                longitude: c.longitude\n            }));\n\n        } catch (error) {\n            console.error("Error loading class targets:", error);\n            return [];\n        }\n    }\n\n    async getAttendanceHistory() {\n        try {\n            const { data: logs, error } = await this.supabase\n                .from(\'geo_attendance_logs\')\n                .select(\'check_in_time, session_type, target_name, is_verified\')\n                .eq(\'student_id\', this.currentUserId)\n                .order(\'check_in_time\', { ascending: false })\n                .limit(100);\n\n            if (error) throw error;\n            return logs || [];\n\n        } catch (error) {\n            console.error("Failed to load attendance history:", error);\n            return [];\n        }\n    }\n\n    async checkInAttendance(sessionType, targetId, targetName, location, studentProgram) {\n        try {\n            const deviceId = localStorage.getItem(\'device_id\') || crypto.randomUUID();\n            localStorage.setItem(\'device_id\', deviceId);\n\n            const checkInTime = new Date().toISOString();\n\n            const targets = sessionType === \'Clinical\' ?\n                await this.getClinicalTargets() :\n                await this.getClassTargets();\n\n            const target = targets.find(t => t.id === targetId);\n\n            if (!target || (target.latitude === null || target.longitude === null)) {\n                throw new Error(\'Target location coordinates not found\');\n            }\n\n            const R = 6371000;\n            const toRad = x => x * Math.PI / 180;\n            const dLat = toRad(location.lat - target.latitude);\n            const dLon = toRad(location.lon - target.longitude);\n            const lat1 = toRad(location.lat);\n            const lat2 = toRad(target.latitude);\n            const a = Math.sin(dLat/2)**2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon/2)**2;\n            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));\n            const distanceMeters = R * c;\n            const isVerified = distanceMeters <= 200;\n\n            const { error } = await this.supabase.rpc(\'check_in_and_defer_fk\', {\n                p_student_id: this.currentUserId,\n                p_check_in_time: checkInTime,\n                p_session_type: sessionType === \'Clinical\' ? \'Clinical\' : \'Class\',\n                p_target_id: target.id,\n                p_target_name: target.name,\n                p_latitude: location.lat,\n                p_longitude: location.lon,\n                p_accuracy_m: location.acc,\n                p_location_friendly_name: location.friendly,\n                p_program: studentProgram,\n                p_block: this.currentUserProfile.block || this.currentUserProfile.current_block,\n                p_intake_year: this.currentUserProfile.intake_year,\n                p_device_id: deviceId,\n                p_is_verified: isVerified,\n                p_course_id: sessionType === \'Class\' ? target.id : null,\n                p_student_name: this.currentUserProfile.full_name || \'Unknown Student\'\n            });\n\n            if (error) throw error;\n\n            await this.updateLastActivity();\n\n            return { success: true, verified: isVerified };\n\n        } catch (error) {\n            console.error(\'Check-in failed:\', error);\n            return { success: false, error: error.message };\n        }\n    }\n\n    // ============================================================\n    // RESOURCES FUNCTIONS\n    // ============================================================\n\n    async getResources() {\n        if (this.cachedData.resources.length > 0) {\n            return this.cachedData.resources;\n        }\n\n        const program = this.currentUserProfile?.program;\n        const block = this.currentUserProfile?.block || this.currentUserProfile?.current_block;\n        const intakeYear = this.currentUserProfile?.intake_year;\n\n        if (!program || !intakeYear || !block) {\n            return [];\n        }\n\n        try {\n            const { data: resources, error } = await this.supabase\n                .from(\'resources\')\n                .select(\'id, title, file_path, file_url, program_type, block, intake, uploaded_by_name, created_at, description, file_type\')\n                .eq(\'program_type\', program)\n                .eq(\'block\', block)\n                .eq(\'intake\', intakeYear)\n                .order(\'created_at\', { ascending: false });\n\n            if (error) throw error;\n\n            this.cachedData.resources = resources || [];\n            return this.cachedData.resources;\n\n        } catch (err) {\n            console.error("Error loading resources:", err);\n            return [];\n        }\n    }\n\n    // ============================================================\n    // MESSAGES FUNCTIONS\n    // ============================================================\n\n    async getMessages() {\n        if (this.cachedData.messages.length > 0) {\n            return this.cachedData.messages;\n        }\n\n        const program = this.currentUserProfile?.program || this.currentUserProfile?.department;\n\n        try {\n            const { data: personalMessages, error: personalError } = await this.supabase\n                .from(\'student_messages\')\n                .select(\'*\')\n                .or(`recipient_id.eq.${this.currentUserId},recipient_program.eq.${program}`)\n                .order(\'created_at\', { ascending: false });\n\n            if (personalError) throw personalError;\n\n            const { data: notifications, error: notifError } = await this.supabase\n                .from(\'notifications\')\n                .select(\'*\')\n                .or(`target_program.eq.${program},target_program.is.null`)\n                .order(\'created_at\', { ascending: false });\n\n            if (notifError) throw notifError;\n\n            this.cachedData.messages = [\n                ...(personalMessages || []).map(m => ({ ...m, type: \'Personal\' })),\n                ...(notifications || []).map(n => ({ ...n, type: \'Announcement\' }))\n            ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));\n\n            return this.cachedData.messages;\n\n        } catch (error) {\n            console.error("Failed to load messages:", error);\n            return [];\n        }\n    }\n\n    async sendMessage(message) {\n        try {\n            const { data, error } = await this.supabase\n                .from(\'student_messages\')\n                .insert({\n                    student_id: this.currentUserId,\n                    student_name: this.currentUserProfile.full_name,\n                    student_program: this.currentUserProfile.program || this.currentUserProfile.department,\n                    message: message,\n                    created_at: new Date().toISOString(),\n                    is_read: false\n                });\n\n            if (error) throw error;\n\n            await this.updateLastActivity();\n\n            return { success: true };\n\n        } catch (error) {\n            console.error("Failed to send message:", error);\n            return { success: false, error: error.message };\n        }\n    }\n\n    // ============================================================\n    // CALENDAR FUNCTIONS\n    // ============================================================\n\n    async getCalendarEvents() {\n        const program = this.currentUserProfile?.program || this.currentUserProfile?.department;\n        const block = this.currentUserProfile?.block || this.currentUserProfile?.current_block;\n        const intakeYear = this.currentUserProfile?.intake_year;\n\n        if (!program || !block || !intakeYear) {\n            return [];\n        }\n\n        try {\n            const { data: events, error } = await this.supabase\n                .from(\'calendar_events\')\n                .select(\'event_name, event_date, type, description, target_program, target_block, target_intake_year\')\n                .or(`target_program.eq.${program},target_program.eq.General`)\n                .or(`target_block.eq.${block},target_block.is.null`)\n                .eq(\'target_intake_year\', intakeYear);\n\n            if (error) throw error;\n\n            const exams = await this.getExams();\n            const examEvents = exams.map(exam => ({\n                event_name: exam.exam_name,\n                event_date: exam.exam_date,\n                type: \'Exam\',\n                description: `${exam.status || \'Scheduled\'} - Block ${exam.block_term}`\n            }));\n\n            return [...(events || []), ...examEvents]\n                .sort((a, b) => new Date(a.event_date) - new Date(b.event_date));\n\n        } catch (error) {\n            console.error("Failed to load calendar events:", error);\n            return [];\n        }\n    }\n\n    // ============================================================\n    // NURSEIQ FUNCTIONS\n    // ============================================================\n\n    async getNurseIQQuestions(courseId = null) {\n        try {\n            let query = this.supabase\n                .from(\'medical_assessments\')\n                .select(`\n                    *,\n                    courses (\n                        id,\n                        course_name,\n                        unit_code,\n                        color,\n                        description\n                    )\n                `)\n                .eq(\'is_active\', true)\n                .eq(\'is_published\', true);\n\n            if (courseId) {\n                query = query.eq(\'course_id\', courseId);\n            }\n\n            const { data: questions, error } = await query;\n\n            if (error) throw error;\n            return questions || [];\n\n        } catch (error) {\n            console.error(\'Error loading NurseIQ questions:\', error);\n            return [];\n        }\n    }\n\n    async getNurseIQCourses() {\n        try {\n            const questions = await this.getNurseIQQuestions();\n\n            const coursesMap = {};\n            questions.forEach(question => {\n                const courseId = question.course_id || \'general\';\n                const courseName = question.courses?.course_name || \'General Nursing\';\n                const unitCode = question.courses?.unit_code || \'KRCHN\';\n\n                if (!coursesMap[courseId]) {\n                    coursesMap[courseId] = {\n                        id: courseId,\n                        name: courseName,\n                        unit_code: unitCode,\n                        color: question.courses?.color || \'#4f46e5\',\n                        description: question.courses?.description || \'\',\n                        questions: [],\n                        stats: {\n                            total: 0,\n                            active: 0,\n                            hard: 0,\n                            medium: 0,\n                            easy: 0,\n                            lastUpdated: null\n                        }\n                    };\n                }\n\n                coursesMap[courseId].questions.push(question);\n                coursesMap[courseId].stats.total++;\n                coursesMap[courseId].stats.active++;\n\n                if (question.difficulty === \'hard\') coursesMap[courseId].stats.hard++;\n                else if (question.difficulty === \'medium\') coursesMap[courseId].stats.medium++;\n                else if (question.difficulty === \'easy\') coursesMap[courseId].stats.easy++;\n\n                if (question.updated_at) {\n                    const updatedDate = new Date(question.updated_at);\n                    if (!coursesMap[courseId].stats.lastUpdated || updatedDate > coursesMap[courseId].stats.lastUpdated) {\n                        coursesMap[courseId].stats.lastUpdated = updatedDate;\n                    }\n                }\n            });\n\n            return Object.values(coursesMap);\n\n        } catch (error) {\n            console.error(\'Error loading NurseIQ courses:\', error);\n            return [];\n        }\n    }\n\n    // ============================================================\n    // UTILITY FUNCTIONS\n    // ============================================================\n\n    clearCache() {\n        this.cachedData = {\n            courses: [],\n            exams: [],\n            clinicalAreas: [],\n            resources: [],\n            messages: [],\n            supplementaryUnits: [],\n            supplementaryRegistrations: [],\n            failedUnits: []\n        };\n        console.log(\'🧹 Cache cleared\');\n    }\n\n    async updateLastActivity() {\n        if (!this.currentUserId) return;\n\n        try {\n            const { error } = await this.supabase\n                .from(\'consolidated_user_profiles_table\')\n                .update({\n                    last_activity: new Date().toISOString(),\n                    updated_at: new Date().toISOString()\n                })\n                .eq(\'user_id\', this.currentUserId);\n\n            if (error) console.error("Failed to update last activity:", error);\n\n        } catch (error) {\n            console.error("Last activity update error:", error);\n        }\n    }\n\n    async updateProfile(updates) {\n        try {\n            const { error } = await this.supabase\n                .from(\'consolidated_user_profiles_table\')\n                .update({\n                    ...updates,\n                    updated_at: new Date().toISOString()\n                })\n                .eq(\'user_id\', this.currentUserId);\n\n            if (error) throw error;\n\n            this.currentUserProfile = { ...this.currentUserProfile, ...updates };\n\n            if (window.currentUser) {\n                window.currentUser = { ...window.currentUser, ...updates };\n            }\n\n            await this.updateLastActivity();\n\n            return { success: true };\n\n        } catch (error) {\n            console.error(\'Failed to update profile:\', error);\n            return { success: false, error: error.message };\n        }\n    }\n\n    // ============================================================\n    // 📸 PHOTO HANDLING - CORRECTED\n    // ============================================================\n\n    async uploadPassportPhoto(file) {\n        try {\n            const supabase = this.supabase;\n            const userId = this.currentUserId;\n\n            if (!userId) {\n                throw new Error(\'No user ID found\');\n            }\n\n            const validTypes = [\'image/jpeg\', \'image/jpg\', \'image/png\', \'image/webp\'];\n            if (!validTypes.includes(file.type)) {\n                return { success: false, error: \'Invalid file type. Please upload JPG, PNG, or WebP.\' };\n            }\n\n            if (file.size > 2 * 1024 * 1024) {\n                return { success: false, error: \'File too large. Maximum size is 2 MB.\' };\n            }\n\n            const fileExt = file.name.split(\'.\').pop();\n            const filePath = `profiles/${userId}/photo.${fileExt}`;\n\n            console.log(\'📸 Uploading photo to:\', filePath);\n\n            const { error: uploadError } = await supabase.storage\n                .from(\'user-documents\')\n                .upload(filePath, file, {\n                    cacheControl: \'3600\',\n                    upsert: true,\n                    contentType: file.type\n                });\n\n            if (uploadError) {\n                console.error(\'❌ Upload error:\', uploadError);\n                throw uploadError;\n            }\n\n            const { data: urlData } = supabase.storage\n                .from(\'user-documents\')\n                .getPublicUrl(filePath);\n\n            const publicUrl = urlData.publicUrl;\n\n            const { error: updateError } = await supabase\n                .from(\'consolidated_user_profiles_table\')\n                .update({\n                    profile_photo_url: filePath,\n                    passport_url: publicUrl,\n                    updated_at: new Date().toISOString()\n                })\n                .eq(\'user_id\', userId);\n\n            if (updateError) throw updateError;\n\n            if (this.currentUserProfile) {\n                this.currentUserProfile.profile_photo_url = filePath;\n                this.currentUserProfile.passport_url = publicUrl;\n            }\n\n            await this.updateLastActivity();\n\n            console.log(\'✅ Photo uploaded successfully:\', filePath);\n            console.log(\'🔗 Public URL:\', publicUrl);\n\n            return { success: true, filePath: filePath, publicUrl: publicUrl };\n\n        } catch (error) {\n            console.error(\'❌ Failed to upload photo:\', error);\n            return { success: false, error: error.message };\n        }\n    }\n\n    getPhotoUrl(userId = null) {\n        const id = userId || this.currentUserId;\n        if (!id) return null;\n\n        const profile = this.currentUserProfile;\n        if (!profile) return null;\n\n        const photoPath = profile.profile_photo_url || profile.passport_url;\n        if (!photoPath) return null;\n\n        if (photoPath.startsWith(\'http\')) {\n            return photoPath;\n        }\n\n        const supabaseUrl = window.APP_CONFIG?.SUPABASE_URL;\n        if (!supabaseUrl) throw new Error(\'Supabase URL is not configured.\');\n        return `${supabaseUrl}/storage/v1/object/public/user-documents/${photoPath}`;\n    }\n\n    getCurrentUserProfile() {\n        return this.currentUserProfile;\n    }\n\n    getInstance() {\n        return this;\n    }\n}\n\n// ========== GLOBAL INITIALIZATION ==========\n\nwindow.db = new Database();\n\nwindow.getDatabase = async function() {\n    await window.db.initialize();\n    if (!window.db.supabase) {\n        throw new Error(\'Database connection is unavailable.\');\n    }\n    return window.db;\n};\n\nwindow.initDatabase = async function() {\n    try {\n        console.log(\'🔧 Initializing database via global function...\');\n        const dbInstance = await window.db.initialize();\n        console.log(\'✅ Database init result:\', dbInstance ? \'Success\' : \'Failed\');\n        return dbInstance;\n    } catch (error) {\n        console.error(\'❌ Database initialization error:\', error);\n        return null;\n    }\n};\n\nfunction showGitHubSecretsHelp() {\n    const helpText = `\n# GitHub Secrets Configuration\n\n## Required Secrets:\n1. SUPABASE_URL - Your Supabase project URL\n   Example: https://lwhtjozfsmbyihenfunw.supabase.co\n\n2. SUPABASE_ANON_KEY - Your Supabase anonymous key\n   Example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\n\n3. LOCATIONIQ_API_KEY - LocationIQ API key (optional for geolocation)\n\n## How to Add Secrets:\n1. Go to your GitHub repository\n2. Click Settings → Secrets and variables → Actions\n3. Click "New repository secret"\n4. Add each secret with the correct name and value\n    `;\n\n    alert(helpText);\n}\n\ndocument.addEventListener(\'DOMContentLoaded\', function() {\n    console.log(\'📄 database.js loaded - DOM ready\');\n});\n\nconsole.log(\'✅ database.js loaded with Supplementary Registration support and corrected photo upload!\');\n\n// Global guard for modules that need a verified authenticated user.\n// Modules should call this immediately before user-scoped database work.\nwindow.requireAuthenticatedUser = async function () {\n    if (!window.db) {\n        throw new Error(\'Database is not available.\');\n    }\n    return window.db.requireAuthenticatedUser();\n};\n';
document.getElementById('copyBtn').addEventListener('click', async () => {
  const btn = document.getElementById('copyBtn');
  try {
    await navigator.clipboard.writeText(code);
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = code;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  btn.textContent = '✓ Copied Full Code';
  setTimeout(() => btn.textContent = 'Copy Full Code', 1800);
});
</script>
</body>
</html>
