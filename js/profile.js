// profile.js - Complete Profile Management Module
class ProfileModule {
    constructor() {
        this.userId = null;
        this.userProfile = null;
        this.isEditing = false;
        this.photoObjectURL = null;
        
        this.initializeElements();
    }
    
    initializeElements() {
        // Get form and containers
        this.profileForm = document.getElementById('profile-form');
        this.profileStatus = document.getElementById('profile-status');
        
        // Profile photo section
        this.passportPreview = document.getElementById('passport-preview');
        this.passportFileInput = document.getElementById('passport-file-input');
        
        // Upload button - from your HTML, it's a label
        this.uploadButton = document.querySelector('label[for="passport-file-input"]');
        
        // Form fields
        this.profileName = document.getElementById('profile-name');
        this.profileStudentId = document.getElementById('profile-student-id');
        this.profileEmail = document.getElementById('profile-email');
        this.profilePhone = document.getElementById('profile-phone');
        this.profileProgram = document.getElementById('profile-program');
        this.profileBlock = document.getElementById('profile-block');
        this.profileIntakeYear = document.getElementById('profile-intake-year');
        
        // Action buttons
        this.editProfileButton = document.getElementById('edit-profile-button');
        this.saveProfileButton = document.getElementById('save-profile-button');
        this.cancelEditButton = document.getElementById('cancel-edit-button');
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Edit profile button
        if (this.editProfileButton) {
            this.editProfileButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.enableEditing();
            });
        }
        
        // Save profile button
        if (this.saveProfileButton) {
            this.saveProfileButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.saveProfile();
            });
        }
        
        // Cancel edit button
        if (this.cancelEditButton) {
            this.cancelEditButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.cancelEditing();
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
        
        // Click on passport preview to upload
        if (this.passportPreview) {
            this.passportPreview.addEventListener('click', () => {
                if (!this.isEditing) {
                    this.enableEditing();
                }
                if (this.passportFileInput) {
                    this.passportFileInput.click();
                }
            });
        }
    }
    
    async initialize() {
        // Get user data from database.js
        this.userId = this.getCurrentUserId();
        
        if (!this.userId) {
            setTimeout(() => this.initialize(), 1000);
            return;
        }
        
        this.userProfile = this.getUserProfile();
        
        await this.loadProfile();
    }
    
    getCurrentUserId() {
        if (window.db && window.db.currentUserId) {
            return window.db.currentUserId;
        }
        return null;
    }
    
    getUserProfile() {
        if (window.db && window.db.currentUserProfile) {
            return window.db.currentUserProfile;
        }
        return null;
    }
    
    getSupabaseClient() {
        if (window.db && window.db.supabase) {
            return window.db.supabase;
        }
        return null;
    }
    
    async loadProfile() {
        if (!this.userId) return;
        
        this.showStatus('Loading profile...', 'info');
        
        try {
            let profile;
            if (window.db && window.db.loadUserProfile) {
                profile = await window.db.loadUserProfile();
            } else {
                const supabase = this.getSupabaseClient();
                if (!supabase) return;
                
                const { data, error } = await supabase
                    .from('consolidated_user_profiles_table')
                    .select('*')
                    .eq('user_id', this.userId)
                    .single();
                
                if (error || !data) return;
                
                profile = data;
            }
            
            this.userProfile = profile;
            this.clearStatus();
            
            // Populate form fields
            this.populateProfileForm();
            
            // Load profile photo
            await this.loadProfilePhoto();
            
            // Set initial state
            this.updateUIState('view');
            
        } catch (error) {
            this.showStatus(`Error: ${error.message}`, 'error');
        }
    }
    
    populateProfileForm() {
        if (!this.userProfile) return;
        
        // Set field values
        if (this.profileName) this.profileName.value = this.userProfile.full_name || '';
        if (this.profileStudentId) this.profileStudentId.value = this.userProfile.student_id || this.userProfile.reg_no || '';
        if (this.profileEmail) this.profileEmail.value = this.userProfile.email || '';
        if (this.profilePhone) this.profilePhone.value = this.userProfile.phone || this.userProfile.phone_number || '';
        if (this.profileProgram) this.profileProgram.value = this.userProfile.program || this.userProfile.department || '';
        if (this.profileBlock) this.profileBlock.value = this.userProfile.block || this.userProfile.current_block || '';
        if (this.profileIntakeYear) this.profileIntakeYear.value = this.userProfile.intake_year || this.userProfile.year_of_intake || '';
    }
    
    async loadProfilePhoto() {
        if (!this.userProfile) return;
        
        const photoUrl = this.userProfile.passport_url;
        let finalPhotoSrc = 'https://dummyimage.com/150x150/cccccc/000000.png&text=Upload+Photo';
        
        if (photoUrl) {
            try {
                const supabaseUrl = window.APP_CONFIG?.SUPABASE_URL || 'https://api.supabase.co';
                finalPhotoSrc = `${supabaseUrl}/storage/v1/object/public/passports/${photoUrl}?t=${new Date().getTime()}`;
                
                // Test if image loads
                await new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = resolve;
                    img.onerror = reject;
                    img.src = finalPhotoSrc;
                });
                
            } catch (error) {
                finalPhotoSrc = 'https://dummyimage.com/150x150/cccccc/000000.png&text=No+Photo';
            }
        }
        
        if (this.passportPreview) {
            this.passportPreview.src = finalPhotoSrc;
            this.passportPreview.alt = photoUrl ? 'Your passport photo' : 'Upload passport photo';
        }
    }
    
    updateUIState(state) {
        switch(state) {
            case 'view':
                this.updateViewMode();
                break;
            case 'edit':
                this.updateEditMode();
                break;
            case 'saving':
                this.updateSavingMode();
                break;
        }
    }
    
    updateViewMode() {
        this.isEditing = false;
        
        // Show/Hide buttons
        if (this.editProfileButton) this.editProfileButton.style.display = 'flex';
        if (this.saveProfileButton) this.saveProfileButton.style.display = 'none';
        if (this.cancelEditButton) this.cancelEditButton.style.display = 'none';
        if (this.uploadButton) this.uploadButton.style.display = 'none';
        
        // Remove editing class
        if (this.profileForm) {
            this.profileForm.classList.remove('editing');
        }
        
        // Make fields readonly
        this.setFieldsReadonly(true);
        
        // Reset photo if needed
        if (this.passportFileInput && this.passportFileInput.files.length > 0) {
            this.passportFileInput.value = '';
            this.loadProfilePhoto();
        }
        
        this.clearStatus();
    }
    
    updateEditMode() {
        this.isEditing = true;
        
        // Show/Hide buttons
        if (this.editProfileButton) this.editProfileButton.style.display = 'none';
        if (this.saveProfileButton) this.saveProfileButton.style.display = 'flex';
        if (this.cancelEditButton) this.cancelEditButton.style.display = 'flex';
        if (this.uploadButton) this.uploadButton.style.display = 'flex';
        
        // Add editing class
        if (this.profileForm) {
            this.profileForm.classList.add('editing');
        }
        
        // Make fields editable
        this.setFieldsReadonly(false);
        
        this.showStatus('Edit mode enabled. Make your changes and click Save.', 'info');
        
        // Focus on first editable field
        setTimeout(() => {
            if (this.profileName) {
                this.profileName.focus();
            }
        }, 100);
    }
    
    updateSavingMode() {
        if (this.saveProfileButton) {
            this.saveProfileButton.disabled = true;
            this.saveProfileButton.classList.add('button-loading');
            this.saveProfileButton.innerHTML = 'Saving...';
        }
    }
    
    setFieldsReadonly(readonly) {
        // Fields that can be edited
        const editableFields = [this.profileName, this.profilePhone];
        editableFields.forEach(field => {
            if (field) {
                field.readOnly = readonly;
                if (!readonly) {
                    field.classList.add('editable');
                } else {
                    field.classList.remove('editable');
                }
            }
        });
        
        // Fields that are always readonly
        const readonlyFields = [
            this.profileStudentId,
            this.profileEmail,
            this.profileProgram,
            this.profileBlock,
            this.profileIntakeYear
        ];
        
        readonlyFields.forEach(field => {
            if (field) {
                field.readOnly = true;
                field.classList.remove('editable');
            }
        });
    }
    
    enableEditing() {
        this.updateUIState('edit');
    }
    
    cancelEditing() {
        // Restore original values
        this.populateProfileForm();
        
        // Reset photo
        if (this.passportFileInput && this.passportFileInput.files.length > 0) {
            this.passportFileInput.value = '';
            this.loadProfilePhoto();
        }
        
        this.updateUIState('view');
    }
    
    async saveProfile() {
        if (!this.userId) return;
        
        // Validate form
        if (!this.validateForm()) {
            return;
        }
        
        this.updateUIState('saving');
        
        try {
            const updates = {
                full_name: this.profileName ? this.profileName.value.trim() : '',
                phone: this.profilePhone ? this.profilePhone.value.trim() : '',
                updated_at: new Date().toISOString()
            };
            
            await this.saveProfileData(updates);
            
            if (this.passportFileInput.files.length > 0) {
                await this.uploadPassportPhoto();
            } else {
                this.onSaveSuccess();
            }
            
        } catch (error) {
            this.onSaveError(error);
        }
    }
    
    async saveProfileData(updates) {
        const supabase = this.getSupabaseClient();
        if (!supabase) {
            throw new Error('No database connection');
        }
        
        const { error } = await supabase
            .from('consolidated_user_profiles_table')
            .update(updates)
            .eq('user_id', this.userId);
        
        if (error) throw error;
    }
    
    onSaveSuccess() {
        if (this.photoObjectURL) {
            URL.revokeObjectURL(this.photoObjectURL);
            this.photoObjectURL = null;
        }
        
        this.loadProfile();
        
        this.showStatus('Profile updated successfully!', 'success');
        
        this.updateUIState('view');
    }
    
    onSaveError(error) {
        this.showStatus(`Error: ${error.message}`, 'error');
        
        // Re-enable save button
        if (this.saveProfileButton) {
            this.saveProfileButton.disabled = false;
            this.saveProfileButton.classList.remove('button-loading');
            this.saveProfileButton.innerHTML = '<span class="button-icon">💾</span>Save Changes';
        }
    }
    
    validateForm() {
        let isValid = true;
        
        // Clear previous errors
        this.clearAllErrors();
        
        // Validate name
        if (this.profileName && !this.profileName.value.trim()) {
            this.showFieldError(this.profileName, 'Name is required');
            isValid = false;
        }
        
        // Validate phone if provided
        if (this.profilePhone && this.profilePhone.value.trim()) {
            const phoneRegex = /^[\d\s\-\+\(\)]{10,20}$/;
            if (!phoneRegex.test(this.profilePhone.value.trim())) {
                this.showFieldError(this.profilePhone, 'Please enter a valid phone number');
                isValid = false;
            }
        }
        
        return isValid;
    }
    
    showFieldError(field, message) {
        field.classList.add('error');
        
        // Create or update error message
        let errorElement = field.parentElement.querySelector('.field-error');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'field-error';
            field.parentElement.appendChild(errorElement);
        }
        errorElement.textContent = message;
    }
    
    clearAllErrors() {
        const errorElements = document.querySelectorAll('.field-error');
        errorElements.forEach(element => element.remove());
        
        const errorInputs = document.querySelectorAll('.form-field input.error');
        errorInputs.forEach(input => input.classList.remove('error'));
    }
    
    handlePassportFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const validation = this.validatePassportFile(file);
        if (!validation.valid) {
            this.showStatus(validation.message, 'error');
            event.target.value = '';
            return;
        }
        
        if (this.photoObjectURL) {
            URL.revokeObjectURL(this.photoObjectURL);
        }
        
        this.photoObjectURL = URL.createObjectURL(file);
        
        if (this.passportPreview) {
            this.passportPreview.src = this.photoObjectURL;
        }
        
        const fileSize = (file.size / 1024 / 1024).toFixed(2);
        this.showStatus(`Ready to upload: ${file.name} (${fileSize} MB)`, 'info');
    }
    
    validatePassportFile(file) {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        const maxSize = 2 * 1024 * 1024;
        
        if (!validTypes.includes(file.type)) {
            return {
                valid: false,
                message: 'Invalid file type. Please upload JPG, PNG, or WebP image.'
            };
        }
        
        if (file.size > maxSize) {
            const maxSizeMB = (maxSize / 1024 / 1024).toFixed(0);
            const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
            return {
                valid: false,
                message: `File too large (${fileSizeMB} MB). Maximum size is ${maxSizeMB} MB.`
            };
        }
        
        return { valid: true };
    }
    
    async uploadPassportPhoto() {
        const file = this.passportFileInput.files[0];
        if (!file) {
            this.showStatus('Please select a file first.', 'error');
            return;
        }
        
        this.showStatus('Uploading photo...', 'info');
        
        try {
            const supabase = this.getSupabaseClient();
            if (!supabase) {
                throw new Error('No database connection');
            }
            
            const fileExt = file.name.split('.').pop();
            const filePath = `${this.userId}.${fileExt}`;
            
            // Upload file
            const { error: uploadError } = await supabase.storage
                .from('passports')
                .upload(filePath, file, { 
                    cacheControl: '3600', 
                    upsert: true,
                    contentType: file.type
                });
            
            if (uploadError) throw uploadError;
            
            // Update profile with photo URL
            const { error: updateError } = await supabase
                .from('consolidated_user_profiles_table')
                .update({ 
                    passport_url: filePath,
                    updated_at: new Date().toISOString() 
                })
                .eq('user_id', this.userId);
            
            if (updateError) throw updateError;
            
            this.passportFileInput.value = '';
            
            if (this.photoObjectURL) {
                URL.revokeObjectURL(this.photoObjectURL);
                this.photoObjectURL = null;
            }
            
            this.onSaveSuccess();
            
        } catch (error) {
            this.showStatus(`Error: ${error.message}`, 'error');
            
            if (this.saveProfileButton) {
                this.saveProfileButton.disabled = false;
                this.saveProfileButton.classList.remove('button-loading');
                this.saveProfileButton.innerHTML = '<span class="button-icon">💾</span>Save Changes';
            }
        }
    }
    
    showStatus(message, type = 'info') {
        if (!this.profileStatus) return;
        
        this.profileStatus.textContent = message;
        this.profileStatus.className = `form-status form-status-${type}`;
        
        if (type === 'success') {
            setTimeout(() => {
                if (this.profileStatus && this.profileStatus.textContent === message) {
                    this.clearStatus();
                }
            }, 3000);
        }
    }
    
    clearStatus() {
        if (this.profileStatus) {
            this.profileStatus.textContent = '';
            this.profileStatus.className = '';
        }
    }
}

// Create global instance
let profileModule = null;

function initProfileModule() {
    // Only initialize if profile form exists
    if (!document.getElementById('profile-form')) {
        return null;
    }
    
    if (profileModule) {
        profileModule.cleanup();
    }
    
    try {
        profileModule = new ProfileModule();
        
        // Wait for database to be ready
        const waitForDatabase = () => {
            if (window.db && window.db.isInitialized) {
                profileModule.initialize();
            } else {
                setTimeout(waitForDatabase, 500);
            }
        };
        
        waitForDatabase();
        
        return profileModule;
    } catch (error) {
        return null;
    }
}

// Initialize when tab is clicked
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on profile tab
    const profileTab = document.querySelector('[data-tab="profile"]');
    if (profileTab) {
        profileTab.addEventListener('click', () => {
            // Small delay to ensure tab content is visible
            setTimeout(() => {
                if (!profileModule) {
                    initProfileModule();
                } else {
                    profileModule.loadProfile();
                }
            }, 300);
        });
    }
    
    // Also initialize if profile form is already visible
    if (document.getElementById('profile-form')) {
        setTimeout(() => {
            initProfileModule();
        }, 1000);
    }
});

// Make functions available globally
window.ProfileModule = ProfileModule;
window.initProfileModule = initProfileModule;
window.loadProfile = () => {
    if (profileModule) {
        return profileModule.loadProfile();
    }
};

console.log('Profile module loaded');
