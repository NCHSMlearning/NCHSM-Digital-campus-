// profile.js - Complete Profile Management Module with DOB, Gender, and Save Picture Button
class ProfileModule {
    constructor() {
        this.userId = null;
        this.userProfile = null;
        this.isEditing = false;
        this.photoObjectURL = null;
        this.pendingPhotoFile = null; // Store pending photo until save
        
        this.initializeElements();
    }
    
    initializeElements() {
        // Get form and containers
        this.profileForm = document.getElementById('profile-form');
        this.profileStatus = document.getElementById('profile-status');
        
        // Profile photo section
        this.passportPreview = document.getElementById('passport-preview');
        this.passportFileInput = document.getElementById('passport-file-input');
        
        // Upload buttons
        this.choosePhotoButton = document.querySelector('label[for="passport-file-input"]');
        this.savePhotoButton = document.getElementById('save-photo-button');
        this.cancelPhotoButton = document.getElementById('cancel-photo-button');
        this.photoStatus = document.getElementById('photo-status');
        
        // Form fields
        this.profileName = document.getElementById('profile-name');
        this.profileStudentId = document.getElementById('profile-student-id');
        this.profileEmail = document.getElementById('profile-email');
        this.profilePhone = document.getElementById('profile-phone');
        this.profileDob = document.getElementById('profile-dob');        // NEW
        this.profileGender = document.getElementById('profile-gender');  // NEW
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
        
        // Choose photo button
        if (this.choosePhotoButton && this.passportFileInput) {
            this.choosePhotoButton.addEventListener('click', () => {
                if (!this.isEditing) {
                    this.enableEditing();
                }
                this.passportFileInput.click();
            });
        }
        
        // Passport file input change
        if (this.passportFileInput) {
            this.passportFileInput.addEventListener('change', (e) => this.handlePassportFileSelect(e));
        }
        
        // Save photo button
        if (this.savePhotoButton) {
            this.savePhotoButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.savePhotoOnly();
            });
        }
        
        // Cancel photo button
        if (this.cancelPhotoButton) {
            this.cancelPhotoButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.cancelPhotoUpload();
            });
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
                    .maybeSingle();  // Use maybeSingle to avoid 406 error
                
                if (error) {
                    console.warn('Error loading profile:', error);
                    return;
                }
                
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
            console.error('Load profile error:', error);
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
        
        // NEW: Date of Birth
        if (this.profileDob && this.userProfile.date_of_birth) {
            const dob = new Date(this.userProfile.date_of_birth);
            if (!isNaN(dob)) {
                this.profileDob.value = dob.toISOString().split('T')[0];
            }
        } else if (this.profileDob) {
            this.profileDob.value = '';
        }
        
        // NEW: Gender
        if (this.profileGender && this.userProfile.gender) {
            this.profileGender.value = this.userProfile.gender;
        } else if (this.profileGender) {
            this.profileGender.value = '';
        }
        
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
                // Check if it's a full URL or just a path
                if (photoUrl.startsWith('http')) {
                    finalPhotoSrc = photoUrl;
                } else {
                    const supabaseUrl = window.APP_CONFIG?.SUPABASE_URL || 'https://lwhtjozfsmbyihenfunw.supabase.co';
                    finalPhotoSrc = `${supabaseUrl}/storage/v1/object/public/passports/${photoUrl}?t=${new Date().getTime()}`;
                }
                
                // Test if image loads
                await new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = resolve;
                    img.onerror = reject;
                    img.src = finalPhotoSrc;
                });
                
            } catch (error) {
                console.warn('Photo load error:', error);
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
        if (this.choosePhotoButton) this.choosePhotoButton.style.display = 'flex';
        if (this.savePhotoButton) this.savePhotoButton.style.display = 'none';
        if (this.cancelPhotoButton) this.cancelPhotoButton.style.display = 'none';
        if (this.photoStatus) this.photoStatus.style.display = 'none';
        
        // Remove editing class
        if (this.profileForm) {
            this.profileForm.classList.remove('editing');
        }
        
        // Make fields readonly
        this.setFieldsReadonly(true);
        
        // Reset photo if pending
        if (this.pendingPhotoFile) {
            this.pendingPhotoFile = null;
            this.loadProfilePhoto();
        }
        
        // Reset file input
        if (this.passportFileInput) {
            this.passportFileInput.value = '';
        }
        
        this.clearStatus();
    }
    
    updateEditMode() {
        this.isEditing = true;
        
        // Show/Hide buttons
        if (this.editProfileButton) this.editProfileButton.style.display = 'none';
        if (this.saveProfileButton) this.saveProfileButton.style.display = 'flex';
        if (this.cancelEditButton) this.cancelEditButton.style.display = 'flex';
        if (this.choosePhotoButton) this.choosePhotoButton.style.display = 'flex';
        if (this.savePhotoButton) this.savePhotoButton.style.display = 'none';
        if (this.cancelPhotoButton) this.cancelPhotoButton.style.display = 'none';
        
        // Add editing class
        if (this.profileForm) {
            this.profileForm.classList.add('editing');
        }
        
        // Make fields editable (only specific fields)
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
            this.saveProfileButton.innerHTML = '<span class="button-icon">⏳</span> Saving...';
        }
    }
    
    setFieldsReadonly(readonly) {
        // Fields that can be edited
        const editableFields = [this.profileName, this.profilePhone, this.profileDob, this.profileGender];
        editableFields.forEach(field => {
            if (field) {
                if (field.tagName === 'SELECT') {
                    field.disabled = readonly;
                } else {
                    field.readOnly = readonly;
                }
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
                if (field.tagName === 'SELECT') {
                    field.disabled = true;
                } else {
                    field.readOnly = true;
                }
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
        
        // Reset photo if pending
        if (this.pendingPhotoFile) {
            this.pendingPhotoFile = null;
            this.loadProfilePhoto();
        }
        
        // Reset file input
        if (this.passportFileInput) {
            this.passportFileInput.value = '';
        }
        
        // Hide photo buttons
        if (this.savePhotoButton) this.savePhotoButton.style.display = 'none';
        if (this.cancelPhotoButton) this.cancelPhotoButton.style.display = 'none';
        
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
                date_of_birth: this.profileDob ? this.profileDob.value : null,
                gender: this.profileGender ? this.profileGender.value : null,
                updated_at: new Date().toISOString()
            };
            
            await this.saveProfileData(updates);
            
            // If there's a pending photo, upload it
            if (this.pendingPhotoFile) {
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
        
        // Use upsert to handle both insert and update
        const { error } = await supabase
            .from('consolidated_user_profiles_table')
            .upsert({
                user_id: this.userId,
                ...updates
            }, { onConflict: 'user_id' });
        
        if (error) throw error;
    }
    
    async savePhotoOnly() {
        if (!this.pendingPhotoFile) {
            this.showPhotoStatus('No photo selected', 'error');
            return;
        }
        
        this.showPhotoStatus('Uploading photo...', 'loading');
        
        try {
            await this.uploadPassportPhoto();
        } catch (error) {
            this.showPhotoStatus(`Upload failed: ${error.message}`, 'error');
        }
    }
    
    cancelPhotoUpload() {
        this.pendingPhotoFile = null;
        
        if (this.passportFileInput) {
            this.passportFileInput.value = '';
        }
        
        this.loadProfilePhoto();
        
        this.savePhotoButton.style.display = 'none';
        this.cancelPhotoButton.style.display = 'none';
        if (this.photoStatus) this.photoStatus.style.display = 'none';
        
        this.showStatus('Photo upload cancelled', 'info');
    }
    
    onSaveSuccess() {
        if (this.photoObjectURL) {
            URL.revokeObjectURL(this.photoObjectURL);
            this.photoObjectURL = null;
        }
        
        this.pendingPhotoFile = null;
        
        // Reset file input
        if (this.passportFileInput) {
            this.passportFileInput.value = '';
        }
        
        // Hide photo buttons
        if (this.savePhotoButton) this.savePhotoButton.style.display = 'none';
        if (this.cancelPhotoButton) this.cancelPhotoButton.style.display = 'none';
        if (this.photoStatus) this.photoStatus.style.display = 'none';
        
        this.loadProfile();
        
        this.showStatus('Profile updated successfully!', 'success');
        
        this.updateUIState('view');
    }
    
    onSaveError(error) {
        console.error('Save error:', error);
        this.showStatus(`Error: ${error.message}`, 'error');
        
        // Re-enable save button
        if (this.saveProfileButton) {
            this.saveProfileButton.disabled = false;
            this.saveProfileButton.innerHTML = '<span class="button-icon">💾</span> Save Changes';
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
        
        // Validate date of birth
        if (this.profileDob && this.profileDob.value) {
            const dobDate = new Date(this.profileDob.value);
            const today = new Date();
            const age = today.getFullYear() - dobDate.getFullYear();
            if (isNaN(dobDate) || age < 16 || age > 100) {
                this.showFieldError(this.profileDob, 'Please enter a valid date of birth');
                isValid = false;
            }
        }
        
        return isValid;
    }
    
    showFieldError(field, message) {
        field.classList.add('error');
        
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
        
        const errorInputs = document.querySelectorAll('.form-field input.error, .form-field select.error');
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
        
        // Store pending photo
        this.pendingPhotoFile = file;
        
        if (this.photoObjectURL) {
            URL.revokeObjectURL(this.photoObjectURL);
        }
        
        this.photoObjectURL = URL.createObjectURL(file);
        
        if (this.passportPreview) {
            this.passportPreview.src = this.photoObjectURL;
        }
        
        // Show save/cancel photo buttons
        if (this.savePhotoButton) this.savePhotoButton.style.display = 'inline-flex';
        if (this.cancelPhotoButton) this.cancelPhotoButton.style.display = 'inline-flex';
        
        const fileSize = (file.size / 1024 / 1024).toFixed(2);
        this.showPhotoStatus(`Ready to upload: ${file.name} (${fileSize} MB)`, 'info');
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
        const file = this.pendingPhotoFile;
        if (!file) {
            return;
        }
        
        this.showPhotoStatus('Uploading photo...', 'loading');
        
        try {
            const supabase = this.getSupabaseClient();
            if (!supabase) {
                throw new Error('No database connection');
            }
            
            const fileExt = file.name.split('.').pop();
            const filePath = `${this.userId}.${fileExt}`;
            
            // Upload file to storage
            const { error: uploadError } = await supabase.storage
                .from('passports')
                .upload(filePath, file, { 
                    cacheControl: '3600', 
                    upsert: true,
                    contentType: file.type
                });
            
            if (uploadError) throw uploadError;
            
            // Get public URL
            const { data: urlData } = supabase.storage
                .from('passports')
                .getPublicUrl(filePath);
            
            const publicUrl = urlData.publicUrl;
            
            // Update profile with photo URL
            const { error: updateError } = await supabase
                .from('consolidated_user_profiles_table')
                .upsert({ 
                    user_id: this.userId,
                    passport_url: publicUrl,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });
            
            if (updateError) throw updateError;
            
            this.showPhotoStatus('Photo uploaded successfully!', 'success');
            
            // Clear pending
            this.pendingPhotoFile = null;
            
            // Hide photo buttons
            if (this.savePhotoButton) this.savePhotoButton.style.display = 'none';
            if (this.cancelPhotoButton) this.cancelPhotoButton.style.display = 'none';
            
            // Reload profile to show updated photo
            await this.loadProfile();
            
            setTimeout(() => {
                if (this.photoStatus) this.photoStatus.style.display = 'none';
            }, 3000);
            
        } catch (error) {
            console.error('Upload error:', error);
            this.showPhotoStatus(`Upload failed: ${error.message}`, 'error');
            throw error;
        }
    }
    
    showPhotoStatus(message, type = 'info') {
        if (!this.photoStatus) return;
        
        this.photoStatus.style.display = 'block';
        this.photoStatus.textContent = message;
        this.photoStatus.className = `photo-status ${type}`;
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
    if (!document.getElementById('profile-form')) {
        return null;
    }
    
    if (profileModule) {
        return profileModule;
    }
    
    try {
        profileModule = new ProfileModule();
        
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
        console.error('Profile init error:', error);
        return null;
    }
}

// Initialize when tab is clicked
document.addEventListener('DOMContentLoaded', () => {
    const profileTab = document.querySelector('[data-tab="profile"]');
    if (profileTab) {
        profileTab.addEventListener('click', () => {
            setTimeout(() => {
                if (!profileModule) {
                    initProfileModule();
                } else {
                    profileModule.loadProfile();
                }
            }, 300);
        });
    }
    
    if (document.getElementById('profile-form')) {
        setTimeout(() => {
            initProfileModule();
        }, 1000);
    }
});

window.ProfileModule = ProfileModule;
window.initProfileModule = initProfileModule;
window.loadProfile = () => {
    if (profileModule) {
        return profileModule.loadProfile();
    }
};

console.log('Profile module loaded with DOB, Gender, and Save Picture button');
