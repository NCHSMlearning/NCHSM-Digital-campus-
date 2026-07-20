// js/lecturer-profile.js
/**
 * NCHSM Lecturer Profile Module
 * Handles profile viewing, editing, and photo uploads
 */

const LecturerProfile = {
    profile: null,
    
    // Initialize
    async init() {
        console.log('👤 Initializing Lecturer Profile...');
        await this.loadProfile();
        this.setupEventListeners();
        console.log('✅ Lecturer Profile initialized');
    },
    
    // Load profile
    async loadProfile() {
        try {
            const profile = window.db?.getUserProfile();
            if (!profile) {
                console.warn('No profile found');
                return;
            }
            
            this.profile = profile;
            this.renderProfile();
            console.log('✅ Profile loaded');
            
        } catch (error) {
            console.error('Failed to load profile:', error);
            LecturerUI.showNotification('Failed to load profile: ' + error.message, 'error');
        }
    },
    
    // Render profile data
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
            'profileId': p.employee_id || p.student_id || 'N/A',
            'profileEmail': p.email || 'N/A',
            'profilePhone': p.phone || 'N/A',
            'profileDept': p.department || 'N/A',
            'profileJoinDate': p.join_date ? Utils.formatDate(p.join_date) : 'N/A',
            'profileProgramFocus': p.program || p.department || 'N/A'
        };
        
        Object.keys(fields).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = fields[id];
        });
    },
    
    // Setup event listeners
    setupEventListeners() {
        // Edit profile
        const editBtn = document.getElementById('editProfileBtn');
        if (editBtn) {
            editBtn.addEventListener('click', () => this.openEditModal());
        }
        
        // Change password
        const passBtn = document.getElementById('updatePasswordBtn');
        if (passBtn) {
            passBtn.addEventListener('click', () => this.openPasswordModal());
        }
        
        // Photo upload
        const photoBtn = document.getElementById('updatePhotoBtn');
        const photoInput = document.getElementById('photoUploadInput');
        if (photoBtn && photoInput) {
            photoBtn.addEventListener('click', () => photoInput.click());
            photoInput.addEventListener('change', (e) => this.handlePhotoUpload(e));
        }
    },
    
    // Open edit profile modal
    openEditModal() {
        const p = this.profile;
        if (!p) return;
        
        // Create modal dynamically
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'editProfileModal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content" style="max-width:500px;">
                <span class="close" onclick="document.getElementById('editProfileModal').remove()">&times;</span>
                <h3>Edit Profile</h3>
                <form id="editProfileForm">
                    <div class="form-group">
                        <label>Full Name</label>
                        <input type="text" id="editFullName" value="${Utils.escapeHtml(p.full_name || '')}">
                    </div>
                    <div class="form-group">
                        <label>Phone</label>
                        <input type="tel" id="editPhone" value="${Utils.escapeHtml(p.phone || '')}">
                    </div>
                    <div class="form-group">
                        <label>Department</label>
                        <input type="text" id="editDepartment" value="${Utils.escapeHtml(p.department || '')}">
                    </div>
                    <div class="modal-actions">
                        <button type="submit" class="btn btn-action">Save Changes</button>
                        <button type="button" class="btn btn-delete" onclick="document.getElementById('editProfileModal').remove()">Cancel</button>
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
    
    // Save profile updates
    async saveProfile(updates) {
        try {
            const result = await window.db?.updateProfile(updates);
            if (result?.success) {
                this.profile = { ...this.profile, ...updates };
                this.renderProfile();
                LecturerUI.showNotification('Profile updated successfully!', 'success');
            } else {
                throw new Error(result?.error || 'Update failed');
            }
        } catch (error) {
            LecturerUI.showNotification('Failed to update profile: ' + error.message, 'error');
        }
    },
    
    // Open password change modal
    openPasswordModal() {
        LecturerUI.showNotification('Password change feature coming soon!', 'info');
    },
    
    // Handle photo upload
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
        
        // Upload
        try {
            const result = await window.db?.uploadPassportPhoto(file);
            if (result?.success) {
                this.profile.passport_url = result.filePath;
                LecturerUI.showNotification('Photo updated successfully!', 'success');
            } else {
                throw new Error(result?.error || 'Upload failed');
            }
        } catch (error) {
            LecturerUI.showNotification('Failed to upload photo: ' + error.message, 'error');
        }
    },
    
    // Refresh profile
    async refresh() {
        await window.db?.loadUserProfile();
        this.profile = window.db?.getUserProfile();
        this.renderProfile();
        LecturerUI.showNotification('Profile refreshed!', 'success');
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => LecturerProfile.init(), 600);
});

window.LecturerProfile = LecturerProfile;
