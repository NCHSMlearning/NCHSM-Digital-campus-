// js/lecturer-profile.js
/**
 * NCHSM Lecturer Profile Module
 * FIXED: Safe updates - does NOT break auth login
 * Updates only staff_records and consolidated_user_profiles_table
 */

const LecturerProfile = {
    profile: null,
    staffRecord: null,
    consolidatedProfile: null,
    userRecord: null,
    authUser: null,
    settings: {
        emailNotify: true,
        smsNotify: false,
        pushNotify: true,
        theme: 'light',
        accentColor: '#4C1D95',
        notifications: {
            marksEntry: true,
            newSession: true,
            examReminders: false,
            studentMessages: false
        }
    },
    currentTab: 'notifications',
    isEditing: false,
    
    async init() {
        console.log('👤 Initializing Lecturer Profile & Settings...');
        await this.loadProfile();
        this.loadSettings();
        this.renderProfile();
        this.renderSettings();
        this.setupEventListeners();
        this.setupSettingsTabs();
        this.showReadOnly();
        console.log('✅ Lecturer Profile initialized');
    },
    
    // ============================================
    // GET SUPABASE CLIENT
    // ============================================
    getSupabase() {
        if (window.lecturerDB?.supabase) return window.lecturerDB.supabase;
        if (typeof sb !== 'undefined') return sb;
        if (typeof supabase !== 'undefined') return supabase;
        return null;
    },
    
    // ============================================
    // LOAD PROFILE - SAFE, READ ONLY
    // ============================================
    async loadProfile() {
        try {
            const supabase = this.getSupabase();
            if (!supabase) {
                console.warn('No Supabase client found');
                this.profile = this.getMockProfile();
                return;
            }
            
            // Get current auth user
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                console.warn('No authenticated user found');
                this.profile = this.getMockProfile();
                return;
            }
            
            this.authUser = user;
            console.log('👤 Auth User:', user.email);
            
            // ============================================
            // 1. LOAD FROM staff_records (AUTHORITATIVE)
            // ============================================
            const { data: staffData, error: staffError } = await supabase
                .from('staff_records')
                .select('*')
                .eq('email', user.email)
                .maybeSingle();
            
            if (staffError) {
                console.warn('Error fetching staff_records:', staffError);
            }
            
            if (staffData) {
                this.staffRecord = staffData;
                console.log('✅ Staff record loaded:', staffData.id);
                console.log('  Department:', staffData.department);
                console.log('  Program:', staffData.program);
            } else {
                console.warn('⚠️ No staff record found for:', user.email);
            }
            
            // ============================================
            // 2. LOAD FROM consolidated_user_profiles_table
            // ============================================
            const { data: consolidatedData, error: consolidatedError } = await supabase
                .from('consolidated_user_profiles_table')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();
            
            if (consolidatedError) {
                console.warn('Error fetching consolidated profile:', consolidatedError);
            }
            
            if (consolidatedData) {
                this.consolidatedProfile = consolidatedData;
                console.log('✅ Consolidated profile loaded');
                console.log('  Department:', consolidatedData.department);
                console.log('  Program:', consolidatedData.program);
            } else {
                console.warn('⚠️ No consolidated profile found for:', user.email);
            }
            
            // ============================================
            // 3. BUILD PROFILE - staff_records is AUTHORITATIVE
            // ============================================
            if (this.staffRecord) {
                // Use staff_records as primary source
                this.profile = {
                    user_id: user.id,
                    // From staff_records (AUTHORITATIVE)
                    department: this.staffRecord.department || 'N/A',
                    program: this.staffRecord.program || 'N/A',
                    staff_id: this.staffRecord.id || 'N/A',
                    first_name: this.staffRecord.first_name || '',
                    other_names: this.staffRecord.other_names || '',
                    designation: this.staffRecord.designation || 'Lecturer',
                    gender: this.staffRecord.gender || '',
                    phone: this.staffRecord.phone || '',
                    email: this.staffRecord.email || user.email,
                    login_enabled: this.staffRecord.login_enabled || false,
                    status: this.staffRecord.status || 'active',
                    // From consolidated profile (display fields)
                    full_name: this.consolidatedProfile?.full_name || 
                              `${this.staffRecord.first_name || ''} ${this.staffRecord.other_names || ''}`.trim() || 'N/A',
                    avatar_url: this.consolidatedProfile?.profile_photo_url || 
                               this.consolidatedProfile?.passport_url || 
                               this.consolidatedProfile?.avatar_url || null,
                    join_date: this.consolidatedProfile?.created_at || this.staffRecord.created_at,
                    created_at: this.staffRecord.created_at,
                    updated_at: this.staffRecord.updated_at,
                    _source: 'staff_records_authoritative'
                };
                
                console.log('✅ Profile built from staff_records');
                console.log('  Department:', this.profile.department);
                console.log('  Program:', this.profile.program);
                
            } else if (this.consolidatedProfile) {
                // Fallback to consolidated profile
                this.profile = {
                    user_id: user.id,
                    full_name: this.consolidatedProfile.full_name || 'N/A',
                    email: this.consolidatedProfile.email || user.email,
                    phone: this.consolidatedProfile.phone || 'N/A',
                    department: this.consolidatedProfile.department || 'N/A',
                    program: this.consolidatedProfile.program || 'N/A',
                    role: this.consolidatedProfile.role || 'lecturer',
                    staff_id: this.consolidatedProfile.staff_id || 'N/A',
                    avatar_url: this.consolidatedProfile.profile_photo_url || 
                               this.consolidatedProfile.passport_url || 
                               this.consolidatedProfile.avatar_url || null,
                    join_date: this.consolidatedProfile.created_at,
                    created_at: this.consolidatedProfile.created_at,
                    updated_at: this.consolidatedProfile.updated_at,
                    _source: 'consolidated_only'
                };
                console.log('📋 Profile built from consolidated profile only');
            } else {
                console.warn('No profile data found, using mock');
                this.profile = this.getMockProfile();
                this.profile.email = user.email || this.profile.email;
            }
            
            this.renderProfile();
            console.log('✅ Profile loaded successfully');
            
        } catch (error) {
            console.error('Failed to load profile:', error);
            this.profile = this.getMockProfile();
            this.renderProfile();
        }
    },
    
    // ============================================
    // GET MOCK PROFILE
    // ============================================
    getMockProfile() {
        return {
            user_id: 'mock-user-1',
            full_name: 'Dr. Jane Lecturer',
            email: 'jane.lecturer@nchsm.ac.ke',
            phone: '+254 700 123 456',
            department: 'Nursing',
            program: 'KRCHN',
            role: 'Lecturer',
            staff_id: 'LEC-2025-001',
            join_date: '2024-01-15',
            avatar_url: 'https://ui-avatars.com/api/?name=Jane+Lecturer&background=4C1D95&color=fff&size=120',
            _source: 'mock'
        };
    },
    
    // ============================================
    // RENDER PROFILE
    // ============================================
    renderProfile() {
        const p = this.profile;
        if (!p) return;
        
        console.log('📊 Rendering profile with:', {
            department: p.department,
            program: p.program,
            source: p._source
        });
        
        // Avatar
        const avatar = document.getElementById('profileImg');
        if (avatar) {
            const name = p.full_name || 'Lecturer';
            const url = p.avatar_url || 
                `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4C1D95&color=fff&size=120`;
            avatar.src = url;
        }
        
        // Name and role
        const nameEl = document.getElementById('profileNameDisplay');
        if (nameEl) nameEl.textContent = p.full_name || 'N/A';
        
        const roleEl = document.getElementById('profileRoleDisplay');
        if (roleEl) roleEl.textContent = p.role || 'Lecturer';
        
        // Details - Read-only fields
        const fields = {
            'profileId': p.staff_id || p.employee_id || p.user_id || 'N/A',
            'profileEmail': p.email || 'N/A',
            'profilePhone': p.phone || p.phone_number || 'N/A',
            'profileDept': p.department || 'N/A',
            'profileJoinDate': p.join_date ? this.formatDate(p.join_date) : p.created_at ? this.formatDate(p.created_at) : 'N/A',
            'profileProgramFocus': p.program || p.department || 'N/A'
        };
        
        Object.keys(fields).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = fields[id];
        });
        
        // Editable fields (for inline editing)
        const editFields = {
            'editFullName': p.full_name || '',
            'editEmail': p.email || '',
            'editPhone': p.phone || '',
            'editDepartment': p.department || ''
        };
        
        Object.keys(editFields).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = editFields[id];
        });
        
        // Settings page profile info
        const settingsFields = {
            'settingsFullName': p.full_name || 'N/A',
            'settingsEmail': p.email || 'N/A',
            'settingsProgram': p.program || p.department || 'N/A',
            'settingsStaffId': p.staff_id || p.employee_id || 'N/A',
            'settingsRole': p.role || 'Lecturer'
        };
        
        Object.keys(settingsFields).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = settingsFields[id];
        });
        
        this.updateStats();
    },
    
    // ============================================
    // UPDATE STATS
    // ============================================
    updateStats() {
        const courses = window.LecturerCourses?.courses || [];
        const coursesEl = document.getElementById('profileCoursesCount');
        if (coursesEl) coursesEl.textContent = courses.length || 0;
        
        const students = window.LecturerStudents?.students || [];
        const studentsEl = document.getElementById('profileStudentsCount');
        if (studentsEl) studentsEl.textContent = students.length || 0;
        
        const joinDate = this.profile?.join_date || this.profile?.created_at;
        if (joinDate) {
            const years = Math.floor((new Date() - new Date(joinDate)) / (1000 * 60 * 60 * 24 * 365));
            const yearsEl = document.getElementById('profileYearsCount');
            if (yearsEl) yearsEl.textContent = years || 0;
        }
    },
    
    // ============================================
    // SAVE PROFILE - SAFE UPDATES ONLY
    // Does NOT modify auth user directly
    // ============================================
    async saveProfile() {
        const updates = {
            full_name: document.getElementById('editFullName')?.value?.trim(),
            email: document.getElementById('editEmail')?.value?.trim(),
            phone: document.getElementById('editPhone')?.value?.trim(),
            department: document.getElementById('editDepartment')?.value?.trim()
        };
        
        // Validate
        if (!updates.full_name) {
            window.showNotification('Full name is required.', 'error');
            document.getElementById('editFullName')?.focus();
            return;
        }
        
        if (!updates.email) {
            window.showNotification('Email is required.', 'error');
            document.getElementById('editEmail')?.focus();
            return;
        }
        
        if (!updates.phone) {
            window.showNotification('Phone number is required.', 'error');
            document.getElementById('editPhone')?.focus();
            return;
        }
        
        if (!updates.department) {
            window.showNotification('Department is required.', 'error');
            document.getElementById('editDepartment')?.focus();
            return;
        }
        
        try {
            window.showLoading('Saving profile...');
            
            const supabase = this.getSupabase();
            if (!supabase) throw new Error('Supabase client not available');
            
            const userId = this.profile?.user_id || this.authUser?.id;
            if (!userId) throw new Error('User ID not found');
            
            // ============================================
            // 1. UPDATE staff_records (SAFE)
            // ============================================
            if (this.staffRecord) {
                const { error: staffError } = await supabase
                    .from('staff_records')
                    .update({
                        first_name: updates.full_name.split(' ')[0] || updates.full_name,
                        other_names: updates.full_name.split(' ').slice(1).join(' ') || '',
                        email: updates.email,
                        phone: updates.phone,
                        department: updates.department,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', this.staffRecord.id);
                
                if (staffError) throw staffError;
                console.log('✅ staff_records updated');
            }
            
            // ============================================
            // 2. UPDATE consolidated_user_profiles_table (SAFE)
            // ============================================
            if (this.consolidatedProfile) {
                const { error: consError } = await supabase
                    .from('consolidated_user_profiles_table')
                    .update({
                        full_name: updates.full_name,
                        email: updates.email,
                        phone: updates.phone,
                        department: updates.department,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', userId);
                
                if (consError) throw consError;
                console.log('✅ consolidated_user_profiles_table updated');
            } else {
                // Create if doesn't exist
                await supabase
                    .from('consolidated_user_profiles_table')
                    .insert({
                        user_id: userId,
                        full_name: updates.full_name,
                        email: updates.email,
                        phone: updates.phone,
                        department: updates.department,
                        program: this.profile?.program || 'CPOTT',
                        role: 'lecturer',
                        staff_id: this.staffRecord?.id || null,
                        status: 'active',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });
                console.log('✅ consolidated_user_profiles_table created');
            }
            
            // ============================================
            // ⚠️ DO NOT UPDATE auth.users - This breaks login!
            // Auth email should only be changed via password reset flow
            // ============================================
            
            // Update local profile
            this.profile = { ...this.profile, ...updates };
            this.renderProfile();
            this.showReadOnly();
            
            window.hideLoading();
            window.showNotification('✅ Profile updated successfully!', 'success');
            
        } catch (error) {
            window.hideLoading();
            console.error('Update error:', error);
            window.showNotification('Failed to update profile: ' + error.message, 'error');
        }
    },
    
    // ============================================
    // CHANGE PASSWORD - Safe auth update
    // ============================================
    async changePassword() {
        const current = document.getElementById('currentPassword')?.value;
        const newPass = document.getElementById('newPassword')?.value;
        const confirm = document.getElementById('confirmPassword')?.value;
        const feedback = document.getElementById('passwordFeedback');
        
        if (feedback) {
            feedback.style.display = 'none';
            feedback.textContent = '';
        }
        
        if (!current) {
            window.showNotification('Please enter your current password.', 'error');
            document.getElementById('currentPassword')?.focus();
            return;
        }
        
        if (!newPass || newPass.length < 8) {
            window.showNotification('New password must be at least 8 characters.', 'error');
            document.getElementById('newPassword')?.focus();
            return;
        }
        
        if (newPass !== confirm) {
            window.showNotification('Passwords do not match.', 'error');
            document.getElementById('confirmPassword')?.focus();
            return;
        }
        
        try {
            window.showLoading('Updating password...');
            
            const supabase = this.getSupabase();
            if (!supabase) throw new Error('Supabase client not available');
            
            // ============================================
            // 1. UPDATE auth.users (This is the ONLY place to update auth)
            // ============================================
            const { error: authError } = await supabase.auth.updateUser({
                password: newPass
            });
            
            if (authError) throw authError;
            console.log('✅ Auth password updated');
            
            // ============================================
            // 2. UPDATE staff_records (Base64 encoded)
            // ============================================
            if (this.staffRecord) {
                const { error: staffError } = await supabase
                    .from('staff_records')
                    .update({
                        password_hash: btoa(newPass),
                        login_enabled: true,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', this.staffRecord.id);
                
                if (staffError) throw staffError;
                console.log('✅ staff_records password updated');
            }
            
            // Clear password fields
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
            
            if (feedback) {
                feedback.style.display = 'block';
                feedback.textContent = '✅ Password updated successfully!';
                feedback.style.background = '#d1fae5';
                feedback.style.color = '#065f46';
                feedback.style.padding = '8px 12px';
                feedback.style.borderRadius = '6px';
            }
            
            window.hideLoading();
            window.showNotification('✅ Password updated successfully!', 'success');
            
        } catch (error) {
            window.hideLoading();
            console.error('Password update error:', error);
            window.showNotification('Failed to update password: ' + error.message, 'error');
            
            if (feedback) {
                feedback.style.display = 'block';
                feedback.textContent = '❌ ' + error.message;
                feedback.style.background = '#fee2e2';
                feedback.style.color = '#991b1b';
                feedback.style.padding = '8px 12px';
                feedback.style.borderRadius = '6px';
            }
        }
    },
    
    // ============================================
    // REFRESH
    // ============================================
    async refresh() {
        await this.loadProfile();
        this.loadSettings();
        this.renderSettings();
        this.showReadOnly();
        window.showNotification('Profile refreshed!', 'success');
    },
    
    // ============================================
    // SETTINGS FUNCTIONS
    // ============================================
    loadSettings() {
        try {
            const savedSettings = localStorage.getItem('lecturerSettings');
            if (savedSettings) {
                this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
            }
            this.renderSettings();
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    },
    
    renderSettings() {
        const s = this.settings;
        
        const emailCheck = document.getElementById('emailNotify');
        if (emailCheck) emailCheck.checked = s.emailNotify !== false;
        
        const smsCheck = document.getElementById('smsNotify');
        if (smsCheck) smsCheck.checked = s.smsNotify === true;
        
        const pushCheck = document.getElementById('pushNotify');
        if (pushCheck) pushCheck.checked = s.pushNotify !== false;
        
        const notifyChecks = {
            'notifyMarksEntry': s.notifications?.marksEntry !== false,
            'notifyNewSession': s.notifications?.newSession !== false,
            'notifyExamReminders': s.notifications?.examReminders === true,
            'notifyStudentMessages': s.notifications?.studentMessages === true
        };
        
        Object.keys(notifyChecks).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.checked = notifyChecks[id];
        });
        
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) themeSelect.value = s.theme || 'light';
        
        this.applyTheme(s.theme || 'light');
        this.applyAccentColor(s.accentColor || '#4C1D95');
        
        document.querySelectorAll('.accent-color-btn').forEach(btn => {
            const color = btn.dataset.color;
            if (color === s.accentColor) {
                btn.style.border = '3px solid #1e293b';
                btn.style.transform = 'scale(1.1)';
            } else {
                btn.style.border = '3px solid transparent';
                btn.style.transform = 'scale(1)';
            }
        });
    },
    
    applyTheme(theme) {
        if (theme === 'dark') {
            document.body.style.background = '#0f172a';
            document.body.style.color = '#f1f5f9';
            document.querySelectorAll('.bg-white').forEach(el => {
                el.style.background = '#1e293b';
                el.style.color = '#f1f5f9';
            });
        } else {
            document.body.style.background = '#f0f4ff';
            document.body.style.color = '#0b1124';
            document.querySelectorAll('.bg-white').forEach(el => {
                el.style.background = 'white';
                el.style.color = 'inherit';
            });
        }
    },
    
    applyAccentColor(color) {
        document.documentElement.style.setProperty('--primary-color', color);
        document.querySelectorAll('.accent-color').forEach(el => {
            el.style.color = color;
        });
        document.querySelectorAll('.accent-bg').forEach(el => {
            el.style.background = color;
        });
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.style.background = `linear-gradient(135deg, ${color}, ${this.darkenColor(color)})`;
        }
    },
    
    darkenColor(hex) {
        let r = parseInt(hex.slice(1, 3), 16);
        let g = parseInt(hex.slice(3, 5), 16);
        let b = parseInt(hex.slice(5, 7), 16);
        r = Math.max(0, r - 50);
        g = Math.max(0, g - 50);
        b = Math.max(0, b - 50);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    },
    
    setupSettingsTabs() {
        const tabs = ['notifications', 'account', 'appearance'];
        tabs.forEach(tab => {
            const btn = document.getElementById(`settingsTab${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
            if (btn) {
                btn.addEventListener('click', () => this.switchSettingsTab(tab));
            }
        });
    },
    
    switchSettingsTab(tab) {
        this.currentTab = tab;
        const tabs = ['notifications', 'account', 'appearance'];
        tabs.forEach(t => {
            const btn = document.getElementById(`settingsTab${t.charAt(0).toUpperCase() + t.slice(1)}`);
            const panel = document.getElementById(`settings${t.charAt(0).toUpperCase() + t.slice(1)}`);
            if (btn) {
                if (t === tab) {
                    btn.className = 'settings-tab active';
                    btn.style.background = '#4C1D95';
                    btn.style.color = 'white';
                } else {
                    btn.className = 'settings-tab';
                    btn.style.background = 'transparent';
                    btn.style.color = '#475569';
                }
            }
            if (panel) {
                panel.style.display = t === tab ? 'block' : 'none';
            }
        });
    },
    
    setupEventListeners() {
        const editBtn = document.getElementById('editProfileBtn');
        if (editBtn) editBtn.addEventListener('click', () => this.enableEditing());
        
        const saveBtn = document.getElementById('saveProfileBtn');
        if (saveBtn) saveBtn.addEventListener('click', () => this.saveProfile());
        
        const cancelBtn = document.getElementById('cancelEditBtn');
        if (cancelBtn) cancelBtn.addEventListener('click', () => this.cancelEditing());
        
        const passBtn = document.getElementById('updatePasswordBtn');
        if (passBtn) passBtn.addEventListener('click', () => this.changePassword());
        
        const photoBtn = document.getElementById('updatePhotoBtn');
        const photoInput = document.getElementById('photoUploadInput');
        if (photoBtn && photoInput) {
            photoBtn.addEventListener('click', () => photoInput.click());
            photoInput.addEventListener('change', (e) => this.handlePhotoUpload(e));
        }
        
        const settingsForm = document.getElementById('settingsForm');
        if (settingsForm) settingsForm.addEventListener('submit', (e) => this.saveSettings(e));
        
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => {
                this.settings.theme = e.target.value;
                this.applyTheme(e.target.value);
                this.saveSettingsToStorage();
            });
        }
    },
    
    enableEditing() {
        this.isEditing = true;
        document.querySelectorAll('.profile-field').forEach(el => {
            el.readOnly = false;
            el.style.background = 'white';
            el.style.borderColor = '#4C1D95';
        });
        document.querySelectorAll('.field-hint').forEach(el => {
            el.style.display = 'block';
        });
        const actions = document.getElementById('profileActions');
        if (actions) actions.style.display = 'flex';
        const editBtn = document.getElementById('editProfileBtn');
        if (editBtn) editBtn.style.display = 'none';
        const saveBtn = document.getElementById('saveProfileBtn');
        if (saveBtn) saveBtn.style.display = 'inline-flex';
        const cancelBtn = document.getElementById('cancelEditBtn');
        if (cancelBtn) cancelBtn.style.display = 'inline-flex';
    },
    
    showReadOnly() {
        this.isEditing = false;
        document.querySelectorAll('.profile-field').forEach(el => {
            el.readOnly = true;
            el.style.background = '#f8fafc';
            el.style.borderColor = '#e2e8f0';
        });
        document.querySelectorAll('.field-hint').forEach(el => {
            el.style.display = 'none';
        });
        const actions = document.getElementById('profileActions');
        if (actions) actions.style.display = 'none';
        const editBtn = document.getElementById('editProfileBtn');
        if (editBtn) editBtn.style.display = 'inline-flex';
        const saveBtn = document.getElementById('saveProfileBtn');
        if (saveBtn) saveBtn.style.display = 'none';
        const cancelBtn = document.getElementById('cancelEditBtn');
        if (cancelBtn) cancelBtn.style.display = 'none';
    },
    
    cancelEditing() {
        const p = this.profile;
        if (p) {
            const editFields = {
                'editFullName': p.full_name || '',
                'editEmail': p.email || '',
                'editPhone': p.phone || '',
                'editDepartment': p.department || ''
            };
            Object.keys(editFields).forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = editFields[id];
            });
        }
        this.showReadOnly();
        window.showNotification('Edit cancelled.', 'info');
    },
    
    async handlePhotoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            window.showNotification('Please select an image file.', 'error');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            window.showNotification('Image must be less than 2MB.', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.getElementById('profileImg');
            if (img) img.src = e.target.result;
        };
        reader.readAsDataURL(file);
        
        try {
            window.showLoading('Uploading photo...');
            const supabase = this.getSupabase();
            if (supabase && this.profile) {
                const userId = this.profile.user_id || this.authUser?.id;
                const fileExt = file.name.split('.').pop();
                const fileName = `avatar-${userId}-${Date.now()}.${fileExt}`;
                const filePath = `avatars/${fileName}`;
                
                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(filePath, file, { upsert: true });
                
                if (uploadError) throw uploadError;
                
                const { data: urlData } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(filePath);
                
                // Update consolidated profile only
                await supabase
                    .from('consolidated_user_profiles_table')
                    .update({ 
                        profile_photo_url: urlData.publicUrl,
                        avatar_url: urlData.publicUrl,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', userId);
                
                this.profile.avatar_url = urlData.publicUrl;
                window.hideLoading();
                window.showNotification('✅ Photo updated successfully!', 'success');
            }
        } catch (error) {
            window.hideLoading();
            console.error('Photo upload error:', error);
            window.showNotification('Failed to upload photo: ' + error.message, 'error');
        }
    },
    
    async saveSettings(e) {
        if (e) e.preventDefault();
        this.settings.emailNotify = document.getElementById('emailNotify')?.checked !== false;
        this.settings.smsNotify = document.getElementById('smsNotify')?.checked === true;
        this.settings.pushNotify = document.getElementById('pushNotify')?.checked !== false;
        this.settings.notifications = {
            marksEntry: document.getElementById('notifyMarksEntry')?.checked !== false,
            newSession: document.getElementById('notifyNewSession')?.checked !== false,
            examReminders: document.getElementById('notifyExamReminders')?.checked === true,
            studentMessages: document.getElementById('notifyStudentMessages')?.checked === true
        };
        this.saveSettingsToStorage();
        window.showNotification('Settings saved successfully!', 'success');
    },
    
    saveAppearanceSettings() {
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) {
            this.settings.theme = themeSelect.value;
            this.applyTheme(themeSelect.value);
        }
        this.saveSettingsToStorage();
        window.showNotification('Appearance settings saved!', 'success');
    },
    
    changeAccentColor(color) {
        this.settings.accentColor = color;
        this.applyAccentColor(color);
        this.saveSettingsToStorage();
        this.renderSettings();
    },
    
    saveSettingsToStorage() {
        try {
            localStorage.setItem('lecturerSettings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    },
    
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        } catch {
            return dateString;
        }
    },
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => LecturerProfile.init(), 600);
});

// Make functions globally accessible
window.LecturerProfile = LecturerProfile;
window.switchSettingsTab = (tab) => LecturerProfile.switchSettingsTab(tab);
window.changeAccentColor = (color) => LecturerProfile.changeAccentColor(color);
window.saveSettings = () => LecturerProfile.saveSettings();
window.saveAppearanceSettings = () => LecturerProfile.saveAppearanceSettings();
window.loadAccountSettings = () => LecturerProfile.loadProfile();

console.log('✅ LecturerProfile module loaded (SAFE - does not break auth login)');
