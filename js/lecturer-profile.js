// js/lecturer-profile.js
/**
 * NCHSM Lecturer Profile Module
 * Manages lecturer profile with inline editing, settings, and preferences
 * NO ADMIN APPROVAL - Settings are saved locally
 * Supports both Nursing (KRCHN) and TVET programs
 */

const LecturerProfile = {
    profile: null,
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
    isTVET: false,
    currentProgram: 'KRCHN',
    
    // ─── PROGRAM TYPE DETECTION ───
    getProgramType() {
        return window.CURRENT_PROGRAM_TYPE || 'KRCHN';
    },
    
    isTVETProgram() {
        return this.getProgramType() === 'TVET';
    },
    
    getProgramTypeLabel() {
        return this.isTVETProgram() ? '🔧 TVET' : '🎓 Nursing';
    },
    
    getProgramEmoji() {
        return this.isTVETProgram() ? '🔧' : '🎓';
    },
    
    getGradingDisplay() {
        if (this.isTVETProgram()) {
            return 'A (80-100%) → 4.0 MASTERY | B (65-79%) → 3.0 PROFICIENT | C (50-64%) → 2.0 COMPETENT | E (0-49%) → 0.0 NOT YET COMPETENT';
        } else {
            return 'A (75-100%) → 4.0 | B (65-74%) → 3.0 | C (60-64%) → 2.0 | D (0-59%) → 0.0';
        }
    },
    
    getPassingThreshold() {
        return this.isTVETProgram() ? 50 : 60;
    },
    
    // ─── INIT ───
    async init() {
        console.log('👤 Initializing Lecturer Profile & Settings...');
        this.currentProgram = this.getProgramType();
        this.isTVET = this.isTVETProgram();
        console.log(`📚 Program Type: ${this.getProgramTypeLabel()}`);
        
        await this.loadProfile();
        this.loadSettings();
        this.renderProfile();
        this.renderSettings();
        this.setupEventListeners();
        this.setupSettingsTabs();
        this.showReadOnly();
        this.updateGradingInfo();
        console.log('✅ Lecturer Profile initialized');
    },
    
    // ─── UPDATE GRADING INFO ───
    updateGradingInfo() {
        const typeLabel = this.getProgramTypeLabel();
        const emoji = this.getProgramEmoji();
        const threshold = this.getPassingThreshold();
        const gradingDisplay = this.getGradingDisplay();
        
        // Update program badge in profile
        const programBadge = document.querySelector('#profile-content .program-badge');
        if (programBadge) {
            programBadge.textContent = `${emoji} ${typeLabel}`;
            programBadge.style.background = this.isTVET ? '#8b5cf6' : '#4C1D95';
            programBadge.style.color = 'white';
            programBadge.style.padding = '4px 12px';
            programBadge.style.borderRadius = '20px';
            programBadge.style.display = 'inline-block';
            programBadge.style.fontSize = '12px';
        }
        
        // Update grading info in profile
        const gradingEl = document.getElementById('profileGradingInfo');
        if (gradingEl) {
            gradingEl.innerHTML = `
                <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center; padding: 10px 16px; background: ${this.isTVET ? '#f5f3ff' : '#f0fdf4'}; border-radius: 8px; border: 1px solid ${this.isTVET ? '#ddd6fe' : '#bbf7d0'}; margin-top: 12px;">
                    <span style="font-weight: 600; font-size: 12px; color: ${this.isTVET ? '#7c3aed' : '#065f46'};">
                        ${emoji} ${typeLabel} Grading:
                    </span>
                    <span style="font-size: 11px; color: #475569;">
                        ${gradingDisplay}
                    </span>
                    <span style="font-size: 10px; color: #94a3b8; margin-left: auto;">
                        Passing: ≥${threshold}%
                    </span>
                </div>
            `;
        }
    },
    
    // ─── LOAD PROFILE ───
    async loadProfile() {
        try {
            const profile = window.lecturerDB?.getCurrentUserProfile();
            if (!profile) {
                console.warn('No profile found');
                this.profile = this.getMockProfile();
                return;
            }
            
            // Detect program type from profile
            const program = profile.program || profile.department || 'KRCHN';
            this.currentProgram = program;
            this.isTVET = window.IS_TVET || program !== 'KRCHN';
            
            this.profile = profile;
            this.renderProfile();
            this.updateGradingInfo();
            console.log(`✅ Profile loaded (${this.getProgramTypeLabel()})`);
            
        } catch (error) {
            console.error('Failed to load profile:', error);
            this.profile = this.getMockProfile();
            this.renderProfile();
        }
    },
    
    getMockProfile() {
        const isTVET = this.isTVETProgram();
        const programType = this.getProgramTypeLabel();
        
        return {
            user_id: 'mock-user-1',
            full_name: 'Dr. Jane Lecturer',
            email: 'jane.lecturer@nchsm.ac.ke',
            phone: '+254 700 123 456',
            department: isTVET ? 'TVET Department' : 'Nursing',
            program: isTVET ? 'DPOTT' : 'KRCHN',
            role: 'Lecturer',
            staff_id: 'LEC-2025-001',
            join_date: '2024-01-15',
            avatar_url: 'https://ui-avatars.com/api/?name=Jane+Lecturer&background=4C1D95&color=fff&size=120',
            program_type: programType,
            is_tvet: isTVET
        };
    },
    
    // ─── RENDER PROFILE ───
    renderProfile() {
        const p = this.profile;
        if (!p) return;
        
        const typeLabel = this.getProgramTypeLabel();
        const emoji = this.getProgramEmoji();
        
        // Avatar
        const avatar = document.getElementById('profileImg');
        if (avatar) {
            const name = p.full_name || 'Lecturer';
            const url = p.avatar_url || p.passport_url || 
                `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${this.isTVET ? '8b5cf6' : '4C1D95'}&color=fff&size=120`;
            avatar.src = url;
        }
        
        // Name and role
        const nameEl = document.getElementById('profileNameDisplay');
        if (nameEl) nameEl.textContent = p.full_name || 'N/A';
        
        const roleEl = document.getElementById('profileRoleDisplay');
        if (roleEl) {
            roleEl.textContent = `${p.role || 'Lecturer'} • ${typeLabel}`;
        }
        
        // Program type badge
        const typeBadge = document.getElementById('profileTypeBadge');
        if (typeBadge) {
            typeBadge.textContent = `${emoji} ${typeLabel}`;
            typeBadge.style.background = this.isTVET ? '#8b5cf6' : '#4C1D95';
            typeBadge.style.color = 'white';
            typeBadge.style.padding = '2px 12px';
            typeBadge.style.borderRadius = '20px';
            typeBadge.style.fontSize = '11px';
            typeBadge.style.fontWeight = '600';
            typeBadge.style.display = 'inline-block';
        }
        
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
            if (el) {
                el.textContent = fields[id];
                // Add program type indicator for program field
                if (id === 'profileProgramFocus') {
                    el.textContent = `${fields[id]} (${typeLabel})`;
                }
            }
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
            'settingsProgram': `${p.program || p.department || 'N/A'} (${typeLabel})`,
            'settingsStaffId': p.staff_id || p.employee_id || 'N/A',
            'settingsRole': `${p.role || 'Lecturer'} • ${typeLabel}`
        };
        
        Object.keys(settingsFields).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = settingsFields[id];
        });
        
        // Update stats
        this.updateStats();
        
        // Update program badge in sidebar
        const programBadge = document.getElementById('userProgramBadge');
        if (programBadge) {
            programBadge.textContent = `${this.currentProgram} (${typeLabel})`;
            programBadge.style.background = this.isTVET ? 'rgba(139,92,246,0.3)' : 'rgba(76,29,149,0.3)';
            programBadge.style.border = this.isTVET ? '1px solid #8b5cf6' : '1px solid #4C1D95';
        }
    },
    
    // ─── UPDATE STATS ───
    updateStats() {
        // Get courses count
        const courses = window.LecturerCourses?.courses || [];
        const coursesEl = document.getElementById('profileCoursesCount');
        if (coursesEl) coursesEl.textContent = courses.length || 0;
        
        // Get students count
        const students = window.LecturerStudents?.students || [];
        const studentsEl = document.getElementById('profileStudentsCount');
        if (studentsEl) studentsEl.textContent = students.length || 0;
        
        // Get years (from join date)
        const joinDate = this.profile?.join_date || this.profile?.created_at;
        if (joinDate) {
            const years = Math.floor((new Date() - new Date(joinDate)) / (1000 * 60 * 60 * 24 * 365));
            const yearsEl = document.getElementById('profileYearsCount');
            if (yearsEl) yearsEl.textContent = years || 0;
        }
        
        // Update program type stat
        const typeEl = document.getElementById('profileProgramType');
        if (typeEl) {
            typeEl.textContent = this.getProgramTypeLabel();
            typeEl.style.color = this.isTVET ? '#7c3aed' : '#4C1D95';
        }
    },
    
    // ─── LOAD SETTINGS ───
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
    
    // ─── RENDER SETTINGS ───
    renderSettings() {
        const s = this.settings;
        const typeLabel = this.getProgramTypeLabel();
        const emoji = this.getProgramEmoji();
        
        // Notification checkboxes
        const emailCheck = document.getElementById('emailNotify');
        if (emailCheck) {
            emailCheck.checked = s.emailNotify !== false;
        }
        
        const smsCheck = document.getElementById('smsNotify');
        if (smsCheck) {
            smsCheck.checked = s.smsNotify === true;
        }
        
        const pushCheck = document.getElementById('pushNotify');
        if (pushCheck) {
            pushCheck.checked = s.pushNotify !== false;
        }
        
        // Notification events
        const notifyChecks = {
            'notifyMarksEntry': s.notifications?.marksEntry !== false,
            'notifyNewSession': s.notifications?.newSession !== false,
            'notifyExamReminders': s.notifications?.examReminders === true,
            'notifyStudentMessages': s.notifications?.studentMessages === true
        };
        
        Object.keys(notifyChecks).forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.checked = notifyChecks[id];
            }
        });
        
        // Theme
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) {
            themeSelect.value = s.theme || 'light';
        }
        
        // Apply theme
        this.applyTheme(s.theme || 'light');
        
        // Apply accent color
        this.applyAccentColor(s.accentColor || '#4C1D95');
        
        // Highlight selected accent color
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
        
        // Update settings header with program type
        const settingsHeader = document.querySelector('#settings-content h2');
        if (settingsHeader) {
            settingsHeader.innerHTML = `<i class="fas fa-cog" style="color: #FDB913;"></i> ${emoji} ${typeLabel} Settings`;
        }
    },
    
    // ─── APPLY THEME ───
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
    
    // ─── APPLY ACCENT COLOR ───
    applyAccentColor(color) {
        document.documentElement.style.setProperty('--primary-color', color);
        
        // Update elements with accent color
        document.querySelectorAll('.accent-color').forEach(el => {
            el.style.color = color;
        });
        
        document.querySelectorAll('.accent-bg').forEach(el => {
            el.style.background = color;
        });
        
        // Update sidebar gradient if needed
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.style.background = `linear-gradient(135deg, ${color}, ${this.darkenColor(color)})`;
        }
    },
    
    // ─── DARKEN COLOR ───
    darkenColor(hex) {
        let r = parseInt(hex.slice(1, 3), 16);
        let g = parseInt(hex.slice(3, 5), 16);
        let b = parseInt(hex.slice(5, 7), 16);
        
        r = Math.max(0, r - 50);
        g = Math.max(0, g - 50);
        b = Math.max(0, b - 50);
        
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    },
    
    // ─── SETUP SETTINGS TABS ───
    setupSettingsTabs() {
        const tabs = ['notifications', 'account', 'appearance'];
        tabs.forEach(tab => {
            const btn = document.getElementById(`settingsTab${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
            if (btn) {
                btn.addEventListener('click', () => this.switchSettingsTab(tab));
            }
        });
    },
    
    // ─── SWITCH SETTINGS TAB ───
    switchSettingsTab(tab) {
        this.currentTab = tab;
        
        const tabs = ['notifications', 'account', 'appearance'];
        tabs.forEach(t => {
            const btn = document.getElementById(`settingsTab${t.charAt(0).toUpperCase() + t.slice(1)}`);
            const panel = document.getElementById(`settings${t.charAt(0).toUpperCase() + t.slice(1)}`);
            
            if (btn) {
                if (t === tab) {
                    btn.className = 'settings-tab active';
                    btn.style.background = this.isTVET ? '#8b5cf6' : '#4C1D95';
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
    
    // ─── SETUP EVENT LISTENERS ───
    setupEventListeners() {
        // Edit profile button (main page)
        const editBtn = document.getElementById('editProfileBtn');
        if (editBtn) {
            editBtn.addEventListener('click', () => this.enableEditing());
        }
        
        // Save profile button (inline editing)
        const saveBtn = document.getElementById('saveProfileBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveProfile());
        }
        
        // Cancel edit button
        const cancelBtn = document.getElementById('cancelEditBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.cancelEditing());
        }
        
        // Change password button
        const passBtn = document.getElementById('updatePasswordBtn');
        if (passBtn) {
            passBtn.addEventListener('click', () => this.changePassword());
        }
        
        // Photo upload
        const photoBtn = document.getElementById('updatePhotoBtn');
        const photoInput = document.getElementById('photoUploadInput');
        if (photoBtn && photoInput) {
            photoBtn.addEventListener('click', () => photoInput.click());
            photoInput.addEventListener('change', (e) => this.handlePhotoUpload(e));
        }
        
        // Settings form
        const settingsForm = document.getElementById('settingsForm');
        if (settingsForm) {
            settingsForm.addEventListener('submit', (e) => this.saveSettings(e));
        }
        
        // Theme select
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => {
                this.settings.theme = e.target.value;
                this.applyTheme(e.target.value);
                this.saveSettingsToStorage();
            });
        }
        
        // Appearance save button
        const appearanceSaveBtn = document.getElementById('saveAppearanceBtn');
        if (appearanceSaveBtn) {
            appearanceSaveBtn.addEventListener('click', () => this.saveAppearanceSettings());
        }
    },
    
    // ─── ENABLE EDITING ───
    enableEditing() {
        this.isEditing = true;
        
        // Enable all editable fields
        document.querySelectorAll('.profile-field').forEach(el => {
            el.readOnly = false;
            el.style.background = 'white';
            el.style.borderColor = this.isTVET ? '#8b5cf6' : '#4C1D95';
        });
        
        // Show field hints
        document.querySelectorAll('.field-hint').forEach(el => {
            el.style.display = 'block';
        });
        
        // Show action buttons
        const actions = document.getElementById('profileActions');
        if (actions) actions.style.display = 'flex';
        
        // Hide edit button
        const editBtn = document.getElementById('editProfileBtn');
        if (editBtn) editBtn.style.display = 'none';
        
        // Show save/cancel buttons
        const saveBtn = document.getElementById('saveProfileBtn');
        if (saveBtn) {
            saveBtn.style.display = 'inline-flex';
            saveBtn.style.background = this.isTVET ? '#8b5cf6' : '#10b981';
        }
        
        const cancelBtn = document.getElementById('cancelEditBtn');
        if (cancelBtn) cancelBtn.style.display = 'inline-flex';
    },
    
    // ─── SHOW READ ONLY ───
    showReadOnly() {
        this.isEditing = false;
        
        // Disable all editable fields
        document.querySelectorAll('.profile-field').forEach(el => {
            el.readOnly = true;
            el.style.background = '#f8fafc';
            el.style.borderColor = '#e2e8f0';
        });
        
        // Hide field hints
        document.querySelectorAll('.field-hint').forEach(el => {
            el.style.display = 'none';
        });
        
        // Hide action buttons
        const actions = document.getElementById('profileActions');
        if (actions) actions.style.display = 'none';
        
        // Show edit button
        const editBtn = document.getElementById('editProfileBtn');
        if (editBtn) editBtn.style.display = 'inline-flex';
        
        // Hide save/cancel buttons
        const saveBtn = document.getElementById('saveProfileBtn');
        if (saveBtn) saveBtn.style.display = 'none';
        
        const cancelBtn = document.getElementById('cancelEditBtn');
        if (cancelBtn) cancelBtn.style.display = 'none';
    },
    
    // ─── CANCEL EDITING ───
    cancelEditing() {
        // Reset fields to original values
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
    
    // ─── SAVE PROFILE ───
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
        
        try {
            window.showLoading('Saving profile...');
            
            const supabase = window.lecturerDB?.supabase;
            if (supabase && this.profile) {
                const { error } = await supabase
                    .from('consolidated_user_profiles_table')
                    .update(updates)
                    .eq('user_id', this.profile.user_id);
                
                if (error) throw error;
            }
            
            // Update local profile
            this.profile = { ...this.profile, ...updates };
            this.renderProfile();
            this.showReadOnly();
            this.updateGradingInfo();
            
            window.hideLoading();
            window.showNotification(`✅ ${this.getProgramTypeLabel()} profile updated successfully!`, 'success');
            
        } catch (error) {
            window.hideLoading();
            console.error('Update error:', error);
            window.showNotification('Failed to update profile: ' + error.message, 'error');
        }
    },
    
    // ─── CHANGE PASSWORD ───
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
            
            const supabase = window.lecturerDB?.supabase;
            if (supabase) {
                const { error } = await supabase.auth.updateUser({
                    password: newPass
                });
                
                if (error) throw error;
            }
            
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
            
            window.hideLoading();
            window.showNotification('✅ Password updated successfully!', 'success');
            
        } catch (error) {
            window.hideLoading();
            console.error('Password update error:', error);
            window.showNotification('Failed to update password: ' + error.message, 'error');
        }
    },
    
    // ─── HANDLE PHOTO UPLOAD ───
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
            
            const supabase = window.lecturerDB?.supabase;
            if (supabase && this.profile) {
                const fileExt = file.name.split('.').pop();
                const fileName = `avatar-${this.profile.user_id}-${Date.now()}.${fileExt}`;
                const filePath = `avatars/${fileName}`;
                
                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(filePath, file, { upsert: true });
                
                if (uploadError) throw uploadError;
                
                const { data: urlData } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(filePath);
                
                const { error: updateError } = await supabase
                    .from('consolidated_user_profiles_table')
                    .update({ avatar_url: urlData.publicUrl })
                    .eq('user_id', this.profile.user_id);
                
                if (updateError) throw updateError;
                
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
    
    // ─── SAVE SETTINGS ───
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
        window.showNotification(`${this.getProgramTypeLabel()} settings saved!`, 'success');
    },
    
    // ─── SAVE APPEARANCE SETTINGS ───
    saveAppearanceSettings() {
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) {
            this.settings.theme = themeSelect.value;
            this.applyTheme(themeSelect.value);
        }
        
        this.saveSettingsToStorage();
        window.showNotification('Appearance settings saved!', 'success');
    },
    
    // ─── CHANGE ACCENT COLOR ───
    changeAccentColor(color) {
        this.settings.accentColor = color;
        this.applyAccentColor(color);
        this.saveSettingsToStorage();
        this.renderSettings();
    },
    
    // ─── SAVE SETTINGS TO STORAGE ───
    saveSettingsToStorage() {
        try {
            localStorage.setItem('lecturerSettings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    },
    
    // ─── FORMAT DATE ───
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
    
    // ─── ESCAPE HTML ───
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    // ─── REFRESH ───
    async refresh() {
        await this.loadProfile();
        this.loadSettings();
        this.renderSettings();
        this.showReadOnly();
        this.updateGradingInfo();
        window.showNotification(`${this.getProgramTypeLabel()} profile refreshed!`, 'success');
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

console.log('✅ LecturerProfile module loaded');
console.log('📋 Features: Profile management, Settings, TVET/Nursing support');
