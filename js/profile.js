// js/profile.js - Profile Management Module
class ProfileModule {
    constructor(supabaseClient) {
        this.sb = supabaseClient;
        this.userId = null;
        this.userProfile = null;
        
        // Profile elements
        this.profileForm = null;
        this.passportPreview = null;
        this.headerPassportPreview = null;
        this.passportFileInput = null;
        this.uploadLabel = null;
        this.uploadButton = null;
        this.editProfileButton = null;
        this.saveProfileButton = null;
        this.profileStatus = null;
        
        // Form fields
        this.profileName = null;
        this.profileStudentId = null;
        this.profileEmail = null;
        this.profilePhone = null;
        this.profileProgram = null;
        this.profileBlock = null;
        this.profileIntakeYear = null;
        
        this.isEditing = false;
        
        this.initializeElements();
    }
    
    initializeElements() {
        // Get all profile elements
        this.profileForm = document.getElementById('profile-form');
        this.passportPreview = document.getElementById('passport-preview');
        this.headerPassportPreview = document.getElementById('header-passport-preview');
        this.passportFileInput = document.getElementById('passport-file-input');
        this.uploadLabel = document.getElementById('upload-label');
        this.uploadButton = document.getElementById('upload-button');
        this.editProfileButton = document.getElementById('edit-profile-button');
        this.saveProfileButton = document.getElementById('save-profile-button');
        this.profileStatus = document.getElementById('profile-status');
        
        // Form fields
        this.profileName = document.getElementById('profile-name');
        this.profileStudentId = document.getElementById('profile-student-id');
        this.profileEmail = document.getElementById('profile-email');
        this.profilePhone = document.getElementById('profile-phone');
        this.profileProgram = document.getElementById('profile-program');
        this.profileBlock = document.getElementById('profile-block');
        this.profileIntakeYear = document.getElementById('profile-intake-year');
        
        // Setup event listeners
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Edit profile button
        if (this.editProfileButton) {
            this.editProfileButton.addEventListener('click', () => this.enableEditing());
        }
        
        // Save profile button
        if (this.saveProfileButton) {
            this.saveProfileButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.saveProfile();
            });
        }
        
        // Profile form submission
        if (this.profileForm) {
            this.profileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveProfile();
            });
        }
        
        // Passport photo upload
        if (this.passportFileInput) {
            this.passportFileInput.addEventListener('change', (e) => this.handlePassportFileSelect(e));
        }
        
        if (this.uploadButton) {
            this.uploadButton.addEventListener('click', () => this.uploadPassportPhoto());
        }
        
        if (this.uploadLabel) {
            this.uploadLabel.addEventListener('click', () => this.passportFileInput.click());
        }
        
        // Click on passport preview to upload
        if (this.passportPreview) {
            this.passportPreview.addEventListener('click', () => {
                if (!this.isEditing) {
                    this.enableEditing();
                }
                this.passportFileInput.click();
            });
        }
    }
    
    // Initialize with user ID
    initialize(userId) {
        this.userId = userId;
        this.loadProfile();
    }
    
    // Load profile from consolidated_user_profiles_table
    async loadProfile() {
        if (!this.userId) {
            console.error('User ID not set');
            return;
        }
        
        if (this.profileStatus) this.profileStatus.textContent = 'Loading profile...';
        
        try {
            const { data: profile, error } = await this.sb
                .from('consolidated_user_profiles_table')
                .select('*')
                .eq('user_id', this.userId)
                .single();
            
            if (error || !profile) {
                console.error('Error loading consolidated profile:', error);
                if (this.profileStatus) this.profileStatus.textContent = 'Profile data missing or restricted. Contact Admin.';
                this.userProfile = {};
            } else {
                this.userProfile = profile;
                if (this.profileStatus) this.profileStatus.textContent = '';
                
                // Update user status in status bar
                const userStatusElement = document.getElementById('userStatus');
                if (userStatusElement && profile.full_name) {
                    userStatusElement.textContent = profile.full_name;
                }
            }
            
            // Populate form fields
            this.populateProfileForm();
            
            // Load profile photo
            this.loadProfilePhoto();
            
            this.toggleProfileEdit(false);
            if (this.uploadLabel && !this.userProfile.passport_url) {
                this.uploadLabel.style.display = 'block';
            }
            
        } catch (error) {
            console.error('Error loading profile:', error);
            if (this.profileStatus) this.profileStatus.textContent = `Error: ${error.message}`;
        }
    }
    
    populateProfileForm() {
        if (!this.userProfile) return;
        
        // Populate form fields with user data
        if (this.profileName) {
            this.profileName.value = this.userProfile.full_name || '';
        }
        
        if (this.profileStudentId) {
            this.profileStudentId.value = this.userProfile.student_id || this.userProfile.reg_no || '';
        }
        
        if (this.profileEmail) {
            this.profileEmail.value = this.userProfile.email || '';
        }
        
        if (this.profilePhone) {
            this.profilePhone.value = this.userProfile.phone || this.userProfile.phone_number || '';
        }
        
        if (this.profileProgram) {
            this.profileProgram.value = this.userProfile.program || this.userProfile.department || '';
        }
        
        if (this.profileBlock) {
            this.profileBlock.value = this.userProfile.block || this.userProfile.current_block || '';
        }
        
        if (this.profileIntakeYear) {
            this.profileIntakeYear.value = this.userProfile.intake_year || this.userProfile.year_of_intake || '';
        }
        
        // Update sidebar user info
        this.updateSidebarUserInfo();
    }
    
    updateSidebarUserInfo() {
        if (!this.userProfile) return;
        
        // Update sidebar user name
        const sidebarUserName = document.getElementById('sidebar-user-name');
        if (sidebarUserName) {
            sidebarUserName.textContent = this.userProfile.full_name || 'Student';
        }
        
        // Update sidebar user email
        const sidebarUserEmail = document.getElementById('sidebar-user-email');
        if (sidebarUserEmail) {
            sidebarUserEmail.textContent = this.userProfile.email || '';
        }
        
        // Update dashboard welcome
        const welcomeHeader = document.getElementById('welcome-header');
        if (welcomeHeader) {
            welcomeHeader.textContent = `Welcome back, ${this.userProfile.full_name || 'Student'}!`;
        }
    }
    
    async loadProfilePhoto() {
        if (!this.userProfile) return;
        
        const photoUrl = this.userProfile.passport_url;
        const passportCard = document.getElementById('action-passport');
        
        if (passportCard) {
            passportCard.style.display = photoUrl ? 'none' : 'block';
        }
        
        // Determine the photo source (URL or fallback)
        let finalPhotoSrc = 'https://dummyimage.com/150x150/cccccc/000000.png&text=NO+PHOTO';
        
        if (photoUrl) {
            // Construct proper Supabase URL
            finalPhotoSrc = `${window.APP_CONFIG.SUPABASE_URL}/storage/v1/object/public/passports/${photoUrl}?t=${new Date().getTime()}`;
        }
        
        // Update both profile and header images
        if (this.passportPreview) {
            this.passportPreview.src = finalPhotoSrc;
            this.passportPreview.onerror = function() {
                this.onerror = null;
                this.src = 'https://dummyimage.com/150x150/cccccc/000000.png&text=NO+PHOTO';
            };
        }
        
        if (this.headerPassportPreview) {
            this.headerPassportPreview.src = finalPhotoSrc;
            this.headerPassportPreview.onerror = function() {
                this.onerror = null;
                this.src = 'https://dummyimage.com/150x150/cccccc/000000.png&text=NO+PHOTO';
            };
        }
    }
    
    toggleProfileEdit(enable) {
        this.isEditing = enable;
        
        const editableFields = ['profile-name', 'profile-phone'];
        
        editableFields.forEach(id => {
            const input = document.getElementById(id);
            if (input) input.readOnly = !enable;
        });
        
        // Non-editable fields
        if (this.profileStudentId) this.profileStudentId.readOnly = true;
        if (this.profileEmail) this.profileEmail.readOnly = true;
        if (this.profileProgram) this.profileProgram.readOnly = true;
        if (this.profileBlock) this.profileBlock.readOnly = true;
        if (this.profileIntakeYear) this.profileIntakeYear.readOnly = true;
        
        // Toggle buttons
        if (this.editProfileButton) this.editProfileButton.style.display = enable ? 'none' : 'block';
        if (this.saveProfileButton) this.saveProfileButton.style.display = enable ? 'block' : 'none';
        
        // Upload label visibility
        if (this.uploadLabel) {
            if (enable || !(this.userProfile && this.userProfile.passport_url)) {
                this.uploadLabel.style.display = 'block';
            } else {
                this.uploadLabel.style.display = 'none';
            }
        }
        
        if (this.uploadButton) this.uploadButton.style.display = 'none';
    }
    
    enableEditing() {
        this.toggleProfileEdit(true);
        if (this.profileStatus) this.profileStatus.textContent = 'You can now edit your profile';
        
        // Focus on name field
        if (this.profileName) {
            setTimeout(() => {
                this.profileName.focus();
                this.profileName.select();
            }, 100);
        }
    }
    
    async saveProfile() {
        if (!this.userId) return;
        
        if (this.profileStatus) this.profileStatus.textContent = 'Saving changes...';
        
        const updates = {
            full_name: this.profileName ? this.profileName.value.trim() : '',
            phone: this.profilePhone ? this.profilePhone.value.trim() : '',
            updated_at: new Date().toISOString()
        };
        
        try {
            const { error } = await this.sb
                .from('consolidated_user_profiles_table')
                .update(updates)
                .eq('user_id', this.userId);
            
            if (error) {
                if (this.profileStatus) this.profileStatus.textContent = `Error saving profile: ${error.message}`;
            } else {
                if (this.profileStatus) this.profileStatus.textContent = 'Profile updated successfully!';
                await this.loadProfile(); // Reload profile
                
                // Show success toast if available
                if (window.showToast) {
                    showToast('Profile updated successfully!', 'success');
                }
            }
        } catch (error) {
            console.error('Error saving profile:', error);
            if (this.profileStatus) this.profileStatus.textContent = `Error: ${error.message}`;
        }
    }
    
    handlePassportFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            // Display temporary object URL for preview
            if (this.passportPreview) {
                this.passportPreview.src = URL.createObjectURL(file);
            }
            if (this.uploadButton) this.uploadButton.style.display = 'block';
            if (this.uploadLabel) this.uploadLabel.style.display = 'none';
        }
    }
    
    async uploadPassportPhoto() {
        if (!this.userId) return;
        
        const file = this.passportFileInput.files[0];
        if (!file) {
            if (this.profileStatus) this.profileStatus.textContent = 'Please select a file first.';
            return;
        }
        
        if (this.profileStatus) this.profileStatus.textContent = 'Uploading photo... (This may take a few seconds)';
        if (this.uploadButton) this.uploadButton.disabled = true;
        
        try {
            const fileExt = file.name.split('.').pop();
            const filePath = `${this.userId}.${fileExt}`;
            
            const { error: uploadError } = await this.sb.storage
                .from('passports')
                .upload(filePath, file, { cacheControl: '3600', upsert: true });
            
            if (uploadError) {
                if (this.profileStatus) this.profileStatus.textContent = `Upload failed: ${uploadError.message}`;
                if (this.uploadButton) this.uploadButton.disabled = false;
                return;
            }
            
            const { error: updateError } = await this.sb
                .from('consolidated_user_profiles_table')
                .update({ passport_url: filePath, updated_at: new Date().toISOString() })
                .eq('user_id', this.userId);
            
            if (updateError) {
                if (this.profileStatus) this.profileStatus.textContent = `Database update failed: ${updateError.message}`;
            } else {
                if (this.profileStatus) this.profileStatus.textContent = 'Photo uploaded and saved successfully! Refreshing profile...';
                
                // Clear file input and hide buttons after successful upload
                if (this.passportFileInput) this.passportFileInput.value = ''; 
                if (this.uploadButton) {
                    this.uploadButton.style.display = 'none';
                    this.uploadButton.disabled = false;
                }
                if (this.uploadLabel) this.uploadLabel.style.display = 'none';
                
                // Reload profile to reflect change
                await this.loadProfile();
                
                // Show success toast if available
                if (window.showToast) {
                    showToast('Profile photo updated successfully!', 'success');
                }
                
                // Set final status message
                if (this.profileStatus) this.profileStatus.textContent = 'Photo updated successfully!';
            }
            
        } catch (error) {
            console.error('Error uploading passport photo:', error);
            if (this.profileStatus) this.profileStatus.textContent = `Error: ${error.message}`;
            if (this.uploadButton) this.uploadButton.disabled = false;
        }
    }
    
    // Get current user profile (for other modules)
    getCurrentUserProfile() {
        return this.userProfile;
    }
    
    // Update current user profile (for other modules)
    updateUserProfile(data) {
        this.userProfile = { ...this.userProfile, ...data };
        this.populateProfileForm();
    }
}

// Create global instance and export functions
let profileModule = null;

// Initialize profile module
function initProfileModule(supabaseClient, userId) {
    profileModule = new ProfileModule(supabaseClient);
    profileModule.initialize(userId);
    return profileModule;
}

// Global functions for tab switching
async function loadProfile() {
    if (profileModule && window.currentUserId) {
        await profileModule.loadProfile();
    }
}

// Make functions globally available
window.ProfileModule = ProfileModule;
window.initProfileModule = initProfileModule;
window.loadProfile = loadProfile;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the profile tab
    if (document.getElementById('profile')?.classList.contains('active')) {
        console.log('Profile tab active, loading profile...');
    }
});
