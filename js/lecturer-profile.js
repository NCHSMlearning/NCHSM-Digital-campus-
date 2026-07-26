// js/lecturer-profile.js
/**
 * NCHSM Lecturer Profile Module
 * Manages lecturer profile, settings, and preferences
 * NO ADMIN APPROVAL - Settings are saved locally
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
    
    async init() {
        console.log('👤 Initializing Lecturer Profile & Settings...');
        await this.loadProfile();
        this.loadSettings();
        this.renderProfile();
        this.renderSettings();
        this.setupEventListeners();
        this.setupSettingsTabs();
        console.log('✅ Lecturer Profile initialized');
    },
    
    async loadProfile() {
        try {
            const profile = window.lecturerDB?.getCurrentUserProfile();
            if (!profile) {
                console.warn('No profile found');
                this.profile = this.getMockProfile();
                return;
            }
            
            this.profile = profile;
            this.renderProfile();
            console.log('✅ Profile loaded');
            
        } catch (error) {
            console.error('Failed to load profile:', error);
            this.profile = this.getMockProfile();
            this.renderProfile();
        }
    },
    
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
            avatar_url: 'https://ui-avatars.com/api/?name=Jane+Lecturer&background=4C1D95&color=fff&size=120'
        };
    },
    
    renderProfile() {
        const p = this.profile;
        if (!p) return;
        
        // Avatar
        const avatar = document.getElementById('profileImg');
        if (avatar) {
            const name = p.full_name || 'Lecturer';
            const url = p.avatar_url || p.passport_url || 
                `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4C1D95&color=fff&size=120`;
            avatar.src = url;
        }
        
        // Name and role
        const nameEl = document.getElementById('profileNameDisplay');
        if (nameEl) nameEl.textContent = p.full_name || 'N/A';
        
        const roleEl = document.getElementById('profileRoleDisplay');
        if (roleEl) roleEl.textContent = p.role || 'Lecturer';
        
        // Details
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
    },
    
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
    
    darkenColor(hex) {
        // Simple color darkening for gradient
        let r = parseInt(hex.slice(1, 3), 16);
        let g = parseInt(hex.slice(3, 5), 16);
        let b = parseInt(hex.slice(5, 7), 16);
        
        r = Math.max(0, r - 50);
        g = Math.max(0, g - 50);
        b = Math.max(0, b - 50);
        
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    },
    
    setupSettingsTabs() {
        // Tab switching
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
        
        // Update tabs
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
        // Edit profile button
        const editBtn = document.getElementById('editProfileBtn');
        if (editBtn) {
            editBtn.addEventListener('click', () => this.openEditModal());
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
    
    openEditModal() {
        const p = this.profile;
        if (!p) return;
        
        // Check if modal already exists
        const existing = document.getElementById('editProfileModal');
        if (existing) {
            existing.remove();
            return;
        }
        
        const modal = document.createElement('div');
        modal.id = 'editProfileModal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5); z-index: 9999;
            display: flex; align-items: center; justify-content: center;
            backdrop-filter: blur(4px);
        `;
        modal.innerHTML = `
            <div style="background: white; border-radius: 16px; padding: 30px; max-width: 500px; width: 90%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0; color: #0A3D62;"><i class="fas fa-user-edit"></i> Edit Profile</h3>
                    <button onclick="document.getElementById('editProfileModal').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #94a3b8;">&times;</button>
                </div>
                <form id="editProfileForm">
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; font-weight: 600; font-size: 13px; color: #475569; margin-bottom: 5px;">Full Name</label>
                        <input type="text" id="editFullName" value="${this.escapeHtml(p.full_name || '')}" style="width: 100%; padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px;">
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; font-weight: 600; font-size: 13px; color: #475569; margin-bottom: 5px;">Phone</label>
                        <input type="tel" id="editPhone" value="${this.escapeHtml(p.phone || '')}" style="width: 100%; padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px;">
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; font-weight: 600; font-size: 13px; color: #475569; margin-bottom: 5px;">Department</label>
                        <input type="text" id="editDepartment" value="${this.escapeHtml(p.department || '')}" style="width: 100%; padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px;">
                    </div>
                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button type="submit" style="flex: 1; background: #4C1D95; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                            <i class="fas fa-save"></i> Save Changes
                        </button>
                        <button type="button" onclick="document.getElementById('editProfileModal').remove()" style="flex: 1; background: #e2e8f0; color: #475569; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Handle form submission
        document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveProfile({
                full_name: document.getElementById('editFullName').value,
                phone: document.getElementById('editPhone').value,
                department: document.getElementById('editDepartment').value
            });
            modal.remove();
        });
        
        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    },
    
    async saveProfile(updates) {
        try {
            const supabase = window.lecturerDB?.supabase;
            if (supabase && this.profile) {
                const { error } = await supabase
                    .from('consolidated_user_profiles_table')
                    .update(updates)
                    .eq('user_id', this.profile.user_id);
                
                if (error) throw error;
            }
            
            this.profile = { ...this.profile, ...updates };
            this.renderProfile();
            window.showNotification('Profile updated successfully!', 'success');
            
        } catch (error) {
            console.error('Update error:', error);
            window.showNotification('Failed to update profile: ' + error.message, 'error');
        }
    },
    
    async changePassword() {
        // Simple password change modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5); z-index: 9999;
            display: flex; align-items: center; justify-content: center;
            backdrop-filter: blur(4px);
        `;
        modal.innerHTML = `
            <div style="background: white; border-radius: 16px; padding: 30px; max-width: 400px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                <h3 style="margin: 0 0 20px 0; color: #0A3D62;"><i class="fas fa-key"></i> Change Password</h3>
                <form id="changePasswordForm">
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; font-weight: 600; font-size: 13px; color: #475569; margin-bottom: 5px;">Current Password</label>
                        <input type="password" id="currentPassword" required style="width: 100%; padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px;">
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; font-weight: 600; font-size: 13px; color: #475569; margin-bottom: 5px;">New Password</label>
                        <input type="password" id="newPassword" required minlength="8" style="width: 100%; padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px;">
                    </div>
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; font-weight: 600; font-size: 13px; color: #475569; margin-bottom: 5px;">Confirm New Password</label>
                        <input type="password" id="confirmPassword" required minlength="8" style="width: 100%; padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px;">
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button type="submit" style="flex: 1; background: #4C1D95; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                            <i class="fas fa-save"></i> Update Password
                        </button>
                        <button type="button" onclick="this.closest('div[style*=\\'fixed\\']').remove()" style="flex: 1; background: #e2e8f0; color: #475569; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        
        document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const current = document.getElementById('currentPassword').value;
            const newPass = document.getElementById('newPassword').value;
            const confirm = document.getElementById('confirmPassword').value;
            
            if (newPass !== confirm) {
                window.showNotification('Passwords do not match.', 'error');
                return;
            }
            
            if (newPass.length < 8) {
                window.showNotification('Password must be at least 8 characters.', 'error');
                return;
            }
            
            try {
                const supabase = window.lecturerDB?.supabase;
                if (supabase && this.profile) {
                    // Update password via Supabase
                    const { error } = await supabase.auth.updateUser({
                        password: newPass
                    });
                    
                    if (error) throw error;
                }
                
                window.showNotification('Password updated successfully!', 'success');
                modal.remove();
                
            } catch (error) {
                console.error('Password update error:', error);
                window.showNotification('Failed to update password: ' + error.message, 'error');
            }
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    },
    
    async handlePhotoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Preview
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.getElementById('profileImg');
            if (img) img.src = e.target.result;
        };
        reader.readAsDataURL(file);
        
        try {
            const supabase = window.lecturerDB?.supabase;
            if (supabase && this.profile) {
                // Upload to storage
                const fileExt = file.name.split('.').pop();
                const fileName = `avatar-${this.profile.user_id}-${Date.now()}.${fileExt}`;
                const filePath = `avatars/${fileName}`;
                
                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(filePath, file, { upsert: true });
                
                if (uploadError) throw uploadError;
                
                // Get public URL
                const { data: urlData } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(filePath);
                
                // Update profile
                const { error: updateError } = await supabase
                    .from('consolidated_user_profiles_table')
                    .update({ avatar_url: urlData.publicUrl })
                    .eq('user_id', this.profile.user_id);
                
                if (updateError) throw updateError;
                
                this.profile.avatar_url = urlData.publicUrl;
                window.showNotification('Photo updated successfully!', 'success');
            }
        } catch (error) {
            console.error('Photo upload error:', error);
            window.showNotification('Failed to upload photo: ' + error.message, 'error');
        }
    },
    
    async saveSettings(e) {
        if (e) e.preventDefault();
        
        // Get notification settings
        this.settings.emailNotify = document.getElementById('emailNotify')?.checked !== false;
        this.settings.smsNotify = document.getElementById('smsNotify')?.checked === true;
        this.settings.pushNotify = document.getElementById('pushNotify')?.checked !== false;
        
        // Get notification events
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
    },
    
    async refresh() {
        await this.loadProfile();
        this.loadSettings();
        this.renderSettings();
        window.showNotification('Profile refreshed!', 'success');
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
window.loadCalendar = () => window.LecturerCalendar?.goToToday();
