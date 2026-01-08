// js/profile.js - Profile Management Module (Aligned with enhanced HTML)
class ProfileModule {
    constructor() {
        this.userId = null;
        this.userProfile = null;
        
        // Profile elements - using IDs from the enhanced HTML
        this.profileForm = null;
        this.passportPreview = null;
        this.passportFileInput = null;
        this.uploadButton = null;
        this.editProfileButton = null;
        this.saveProfileButton = null;
        this.cancelEditButton = null;
        this.profileStatus = null;
        
        // Form fields from enhanced HTML
        this.profileName = null;
        this.profileStudentId = null;
        this.profileEmail = null;
        this.profilePhone = null;
        this.profileProgram = null;
        this.profileBlock = null;
        this.profileIntakeYear = null;
        
        // Help text elements
        this.helpTexts = {};
        
        this.isEditing = false;
        this.isInitialized = false;
        this.photoObjectURL = null; // To track and clean up object URLs
        
        this.initializeElements();
    }
    
    initializeElements() {
        console.log('🔧 Initializing ProfileModule elements...');
        
        // Get form and containers
        this.profileForm = this.getElement('profile-form');
        this.profileStatus = this.getElement('profile-status');
        
        // Profile photo section (aligned with enhanced HTML)
        this.passportPreview = this.getElement('passport-preview');
        this.passportFileInput = this.getElement('passport-file-input');
        this.uploadButton = this.getElement('upload-button');
        
        // Form fields (aligned with enhanced HTML)
        this.profileName = this.getElement('profile-name');
        this.profileStudentId = this.getElement('profile-student-id');
        this.profileEmail = this.getElement('profile-email');
        this.profilePhone = this.getElement('profile-phone');
        this.profileProgram = this.getElement('profile-program');
        this.profileBlock = this.getElement('profile-block');
        this.profileIntakeYear = this.getElement('profile-intake-year');
        
        // Action buttons (aligned with enhanced HTML)
        this.editProfileButton = this.getElement('edit-profile-button');
        this.saveProfileButton = this.getElement('save-profile-button');
        this.cancelEditButton = this.getElement('cancel-edit-button');
        
        // Get help text elements
        this.helpTexts = {
            name: this.getElement('name-help'),
            id: this.getElement('id-help'),
            email: this.getElement('email-help'),
            phone: this.getElement('phone-help')
        };
        
        // Setup event listeners
        this.setupEventListeners();
        
        console.log('✅ Profile elements initialized');
    }
    
    // Helper to safely get elements
    getElement(id) {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`⚠️ Profile element #${id} not found`);
        }
        return element;
    }
    
    setupEventListeners() {
        console.log('🎧 Setting up profile event listeners...');
        
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
        
        // Cancel edit button
        if (this.cancelEditButton) {
            this.cancelEditButton.addEventListener('click', () => this.cancelEditing());
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
        
        // Add input validation listeners
        this.setupValidationListeners();
    }
    
    setupValidationListeners() {
        // Real-time validation for phone number
        if (this.profilePhone) {
            this.profilePhone.addEventListener('input', () => {
                this.validatePhoneNumber();
            });
        }
        
        // Real-time validation for name
        if (this.profileName) {
            this.profileName.addEventListener('input', () => {
                this.validateName();
            });
        }
    }
    
    // Initialize with user data from database.js
    async initialize() {
        console.log('🚀 ProfileModule.initialize() called');
        
        // Get user data from database.js
        this.userId = this.getCurrentUserId();
        
        if (!this.userId) {
            console.warn('⚠️ User ID not available, waiting...');
            setTimeout(() => this.initialize(), 1000);
            return;
        }
        
        this.userProfile = this.getUserProfile();
        
        console.log('👤 ProfileModule user data:', {
            userId: this.userId,
            hasProfile: !!this.userProfile
        });
        
        await this.loadProfile();
        this.isInitialized = true;
    }
    
    // Get user ID from database.js
    getCurrentUserId() {
        if (window.db && window.db.currentUserId) {
            return window.db.currentUserId;
        }
        if (window.currentUserId) {
            return window.currentUserId;
        }
        // Try to get from auth session
        if (window.db && window.db.getCurrentUserId) {
            return window.db.getCurrentUserId();
        }
        return null;
    }
    
    // Get user profile from database.js
    getUserProfile() {
        if (window.db && window.db.currentUserProfile) {
            return window.db.currentUserProfile;
        }
        if (window.currentUserProfile || window.userProfile) {
            return window.currentUserProfile || window.userProfile;
        }
        return null;
    }
    
    // Get Supabase client from database.js
    getSupabaseClient() {
        if (window.db && window.db.supabase) {
            return window.db.supabase;
        }
        if (window.app && window.app.supabase) {
            return window.app.supabase;
        }
        console.error('❌ No Supabase client found');
        return null;
    }
    
    // Load profile from database.js
    async loadProfile() {
        if (!this.userId) {
            console.error('❌ User ID not set');
            return;
        }
        
        console.log('👤 Loading profile data...');
        
        this.showStatus('Loading profile...', 'info');
        
        try {
            // Use database.js to load profile
            let profile;
            if (window.db && window.db.loadUserProfile) {
                console.log('📦 Using database.js to load profile');
                profile = await window.db.loadUserProfile();
            } else {
                // Fallback: direct database query
                const supabase = this.getSupabaseClient();
                if (!supabase) {
                    throw new Error('No database connection');
                }
                
                const { data, error } = await supabase
                    .from('consolidated_user_profiles_table')
                    .select('*')
                    .eq('user_id', this.userId)
                    .single();
                
                if (error || !data) {
                    throw new Error('Profile data missing or restricted. Contact Admin.');
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
            this.toggleProfileEdit(false);
            
            console.log('✅ Profile loaded successfully');
            
        } catch (error) {
            console.error('❌ Error loading profile:', error);
            this.showStatus(`Error: ${error.message}`, 'error');
        }
    }
    
    populateProfileForm() {
        if (!this.userProfile) return;
        
        console.log('📝 Populating profile form...');
        
        // Populate form fields with user data
        const fieldMappings = {
            'profile-name': ['full_name'],
            'profile-student-id': ['student_id', 'reg_no'],
            'profile-email': ['email'],
            'profile-phone': ['phone', 'phone_number'],
            'profile-program': ['program', 'department'],
            'profile-block': ['block', 'current_block'],
            'profile-intake-year': ['intake_year', 'year_of_intake']
        };
        
        Object.entries(fieldMappings).forEach(([fieldId, keys]) => {
            const element = this.getElement(fieldId);
            if (element) {
                let value = '';
                for (const key of keys) {
                    if (this.userProfile[key]) {
                        value = this.userProfile[key];
                        break;
                    }
                }
                element.value = value || '';
            }
        });
        
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
            const name = this.userProfile.full_name || 'Student';
            welcomeHeader.textContent = name.includes('Welcome') ? name : `Welcome back, ${name}!`;
        }
    }
    
    async loadProfilePhoto() {
        if (!this.userProfile) return;
        
        console.log('🖼️ Loading profile photo...');
        
        const photoUrl = this.userProfile.passport_url;
        
        // Clean up previous object URL if exists
        if (this.photoObjectURL) {
            URL.revokeObjectURL(this.photoObjectURL);
            this.photoObjectURL = null;
        }
        
        let finalPhotoSrc = 'https://dummyimage.com/150x150/cccccc/000000.png&text=Upload+Photo';
        
        if (photoUrl) {
            try {
                // Try to construct Supabase URL
                const supabaseUrl = window.APP_CONFIG?.SUPABASE_URL || 'https://api.supabase.co';
                finalPhotoSrc = `${supabaseUrl}/storage/v1/object/public/passports/${photoUrl}?t=${new Date().getTime()}`;
                
                // Test if image loads
                await this.testImageLoad(finalPhotoSrc);
                console.log('📸 Profile photo loaded successfully');
            } catch (error) {
                console.warn('⚠️ Failed to load profile photo:', error);
                finalPhotoSrc = 'https://dummyimage.com/150x150/cccccc/000000.png&text=No+Photo';
            }
        }
        
        // Update profile photo
        if (this.passportPreview) {
            this.passportPreview.src = finalPhotoSrc;
            this.passportPreview.alt = photoUrl ? 'Your passport photo' : 'Upload passport photo';
        }
        
        // Update passport card visibility
        const passportCard = document.getElementById('action-passport');
        if (passportCard) {
            passportCard.style.display = photoUrl ? 'none' : 'block';
        }
    }
    
    testImageLoad(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('Image failed to load'));
            img.src = url;
        });
    }
    
    toggleProfileEdit(enable) {
        this.isEditing = enable;
        
        console.log(`🔄 Profile edit mode: ${enable ? 'ON' : 'OFF'}`);
        
        // Toggle readonly for editable fields
        const editableFields = [this.profileName, this.profilePhone];
        editableFields.forEach(field => {
            if (field) field.readOnly = !enable;
        });
        
        // Always readonly fields
        const readonlyFields = [
            this.profileStudentId,
            this.profileEmail,
            this.profileProgram,
            this.profileBlock,
            this.profileIntakeYear
        ];
        readonlyFields.forEach(field => {
            if (field) field.readOnly = true;
        });
        
        // Toggle buttons
        if (this.editProfileButton) {
            this.editProfileButton.style.display = enable ? 'none' : 'flex';
        }
        if (this.saveProfileButton) {
            this.saveProfileButton.style.display = enable ? 'flex' : 'none';
        }
        if (this.cancelEditButton) {
            this.cancelEditButton.style.display = enable ? 'inline-flex' : 'none';
        }
        
        // Toggle upload controls
        if (this.uploadButton) {
            this.uploadButton.style.display = enable ? 'flex' : 'none';
        }
        if (this.passportFileInput && this.passportFileInput.parentNode) {
            this.passportFileInput.parentNode.style.display = enable ? 'block' : 'none';
        }
        
        // Update help text visibility
        Object.values(this.helpTexts).forEach(helpText => {
            if (helpText) {
                helpText.style.display = enable ? 'block' : 'none';
            }
        });
        
        // Add/remove visual editing state
        if (this.profileForm) {
            this.profileForm.classList.toggle('editing', enable);
        }
        
        // Dispatch event for other components
        document.dispatchEvent(new CustomEvent('profileEditModeChange', {
            detail: { isEditing: enable }
        }));
    }
    
    enableEditing() {
        console.log('✏️ Enabling profile editing...');
        this.toggleProfileEdit(true);
        this.showStatus('You can now edit your profile', 'info');
        
        // Focus on name field
        if (this.profileName) {
            setTimeout(() => {
                this.profileName.focus();
                this.profileName.select();
            }, 100);
        }
    }
    
    cancelEditing() {
        console.log('✖️ Canceling profile editing...');
        
        // Reset form to original values
        this.populateProfileForm();
        
        // Reset photo preview if changed
        if (this.passportFileInput && this.passportFileInput.files.length > 0) {
            this.passportFileInput.value = '';
            this.loadProfilePhoto();
        }
        
        this.toggleProfileEdit(false);
        this.clearStatus();
        
        // Clean up object URL
        if (this.photoObjectURL) {
            URL.revokeObjectURL(this.photoObjectURL);
            this.photoObjectURL = null;
        }
    }
    
    async saveProfile() {
        if (!this.userId) {
            console.error('❌ Cannot save profile: User ID not set');
            return;
        }
        
        console.log('💾 Saving profile changes...');
        
        this.showStatus('Saving changes...', 'info');
        
        // Validate form
        if (!this.validateForm()) {
            return;
        }
        
        const updates = {
            full_name: this.profileName ? this.profileName.value.trim() : '',
            phone: this.profilePhone ? this.profilePhone.value.trim() : '',
            updated_at: new Date().toISOString()
        };
        
        try {
            // Use database.js if available
            let result;
            if (window.db && window.db.updateProfile) {
                console.log('📦 Using database.js to update profile');
                result = await window.db.updateProfile(updates);
            } else {
                // Fallback: direct update
                const supabase = this.getSupabaseClient();
                if (!supabase) {
                    throw new Error('No database connection');
                }
                
                const { error } = await supabase
                    .from('consolidated_user_profiles_table')
                    .update(updates)
                    .eq('user_id', this.userId);
                
                result = { success: !error, error };
            }
            
            if (result.error) {
                throw new Error(result.error.message);
            }
            
            console.log('✅ Profile updated successfully');
            
            // Upload photo if selected
            if (this.passportFileInput && this.passportFileInput.files.length > 0) {
                await this.uploadPassportPhoto();
            } else {
                this.showStatus('Profile updated successfully!', 'success');
                this.toggleProfileEdit(false);
                
                // Reload profile to get fresh data
                await this.loadProfile();
                
                // Show success notification
                this.showNotification('Profile updated successfully!', 'success');
            }
            
        } catch (error) {
            console.error('❌ Error saving profile:', error);
            this.showStatus(`Error: ${error.message}`, 'error');
        }
    }
    
    validateForm() {
        let isValid = true;
        
        // Validate name
        if (!this.validateName()) {
            isValid = false;
        }
        
        // Validate phone (if provided)
        if (this.profilePhone && this.profilePhone.value.trim()) {
            if (!this.validatePhoneNumber()) {
                isValid = false;
            }
        }
        
        return isValid;
    }
    
    validateName() {
        if (!this.profileName) return true;
        
        const name = this.profileName.value.trim();
        if (!name) {
            this.showFieldError(this.profileName, 'Name is required');
            return false;
        }
        
        if (name.length < 2) {
            this.showFieldError(this.profileName, 'Name must be at least 2 characters');
            return false;
        }
        
        this.clearFieldError(this.profileName);
        return true;
    }
    
    validatePhoneNumber() {
        if (!this.profilePhone) return true;
        
        const phone = this.profilePhone.value.trim();
        if (!phone) return true; // Phone is optional
        
        // Basic phone validation (adjust as needed)
        const phoneRegex = /^[\d\s\-\+\(\)]{10,20}$/;
        if (!phoneRegex.test(phone)) {
            this.showFieldError(this.profilePhone, 'Please enter a valid phone number');
            return false;
        }
        
        this.clearFieldError(this.profilePhone);
        return true;
    }
    
    showFieldError(field, message) {
        field.classList.add('error');
        const errorElement = field.parentNode.querySelector('.field-error') || 
                            document.createElement('div');
        errorElement.className = 'field-error';
        errorElement.textContent = message;
        errorElement.style.color = 'var(--color-error, #dc2626)';
        errorElement.style.fontSize = '0.875rem';
        errorElement.style.marginTop = '0.25rem';
        
        if (!field.parentNode.querySelector('.field-error')) {
            field.parentNode.appendChild(errorElement);
        }
    }
    
    clearFieldError(field) {
        field.classList.remove('error');
        const errorElement = field.parentNode.querySelector('.field-error');
        if (errorElement) {
            errorElement.remove();
        }
    }
    
    handlePassportFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            console.log('📁 File selected:', file.name);
            
            // Clean up previous object URL
            if (this.photoObjectURL) {
                URL.revokeObjectURL(this.photoObjectURL);
            }
            
            // Validate file
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
            const maxSize = 2 * 1024 * 1024; // 2MB (as per help text)
            
            if (!validTypes.includes(file.type)) {
                this.showStatus('Please select a valid image file (JPEG, PNG, WebP)', 'error');
                event.target.value = '';
                return;
            }
            
            if (file.size > maxSize) {
                this.showStatus('File size must be less than 2MB', 'error');
                event.target.value = '';
                return;
            }
            
            // Create and display object URL for preview
            this.photoObjectURL = URL.createObjectURL(file);
            
            if (this.passportPreview) {
                this.passportPreview.src = this.photoObjectURL;
            }
            
            if (this.uploadButton) {
                this.uploadButton.disabled = false;
                this.uploadButton.textContent = 'Upload Photo';
            }
            
            this.showStatus('Ready to upload photo', 'info');
        }
    }
    
    async uploadPassportPhoto() {
        if (!this.userId) {
            console.error('❌ Cannot upload: User ID not set');
            return;
        }
        
        const file = this.passportFileInput.files[0];
        if (!file) {
            this.showStatus('Please select a file first.', 'error');
            return;
        }
        
        console.log('📤 Uploading passport photo...');
        
        this.showStatus('Uploading photo... (This may take a few seconds)', 'info');
        
        if (this.uploadButton) {
            this.uploadButton.disabled = true;
            this.uploadButton.textContent = 'Uploading...';
        }
        
        try {
            // Use database.js if available
            let result;
            if (window.db && window.db.uploadPassportPhoto) {
                console.log('📦 Using database.js to upload photo');
                result = await window.db.uploadPassportPhoto(file);
            } else {
                // Fallback: direct upload
                const supabase = this.getSupabaseClient();
                if (!supabase) {
                    throw new Error('No database connection');
                }
                
                const fileExt = file.name.split('.').pop();
                const filePath = `${this.userId}.${fileExt}`;
                
                // Upload to storage
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
                
                result = { success: true, filePath };
            }
            
            if (!result.success) {
                throw new Error(result.error || 'Upload failed');
            }
            
            console.log('✅ Photo uploaded successfully');
            
            // Clear file input
            this.passportFileInput.value = '';
            
            // Clean up object URL
            if (this.photoObjectURL) {
                URL.revokeObjectURL(this.photoObjectURL);
                this.photoObjectURL = null;
            }
            
            // Reload profile to reflect change
            await this.loadProfile();
            
            this.showStatus('Profile updated successfully!', 'success');
            this.toggleProfileEdit(false);
            
            this.showNotification('Profile photo updated successfully!', 'success');
            
        } catch (error) {
            console.error('❌ Error uploading passport photo:', error);
            
            if (this.uploadButton) {
                this.uploadButton.disabled = false;
                this.uploadButton.textContent = 'Upload Photo';
            }
            
            this.showStatus(`Error: ${error.message}`, 'error');
        }
    }
    
    // Helper methods for status messages
    showStatus(message, type = 'info') {
        if (!this.profileStatus) return;
        
        this.profileStatus.textContent = message;
        this.profileStatus.className = `form-status form-status-${type}`;
        
        // Auto-clear success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                if (this.profileStatus && this.profileStatus.textContent === message) {
                    this.clearStatus();
                }
            }, 5000);
        }
    }
    
    clearStatus() {
        if (this.profileStatus) {
            this.profileStatus.textContent = '';
            this.profileStatus.className = '';
        }
    }
    
    showNotification(message, type = 'success') {
        // Use existing toast system if available
        if (window.showToast) {
            showToast(message, type);
            return;
        }
        
        // Fallback notification
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            border-radius: 8px;
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    // Get current user profile (for other modules)
    getCurrentUserProfile() {
        return this.userProfile;
    }
    
    // Cleanup method
    cleanup() {
        // Clean up object URL
        if (this.photoObjectURL) {
            URL.revokeObjectURL(this.photoObjectURL);
            this.photoObjectURL = null;
        }
        
        console.log('🧹 Profile module cleaned up');
    }
}

// Create global instance
let profileModule = null;

// Initialize profile module
function initProfileModule() {
    console.log('🚀 initProfileModule() called');
    
    // Check if profile elements exist
    if (!document.getElementById('profile-form')) {
        console.log('📭 Profile form not found on this page');
        return null;
    }
    
    // Clean up previous instance if exists
    if (profileModule) {
        profileModule.cleanup();
    }
    
    try {
        profileModule = new ProfileModule();
        
        // Wait for database to be ready
        const waitForDatabase = () => {
            if (window.db && window.db.isInitialized) {
                profileModule.initialize();
                console.log('✅ ProfileModule initialized successfully');
            } else {
                setTimeout(waitForDatabase, 500);
            }
        };
        
        waitForDatabase();
        
        return profileModule;
    } catch (error) {
        console.error('❌ Failed to initialize ProfileModule:', error);
        return null;
    }
}

// Global function to load profile
async function loadProfile() {
    if (profileModule) {
        await profileModule.loadProfile();
    } else {
        console.warn('⚠️ Profile module not initialized');
        initProfileModule();
    }
}

// Auto-initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('📱 DOM loaded, checking for profile elements...');
    
    // Check if we're on a page with profile elements
    const hasProfileElements = document.getElementById('profile-form') || 
                              document.getElementById('profile');
    
    if (hasProfileElements) {
        console.log('✅ Profile elements found, initializing...');
        
        // Wait a bit for other modules to initialize
        setTimeout(() => {
            initProfileModule();
        }, 1000);
        
        // Also initialize when profile tab is activated
        document.addEventListener('click', (e) => {
            const tabLink = e.target.closest('[data-tab="profile"]');
            if (tabLink && !profileModule) {
                setTimeout(() => {
                    initProfileModule();
                }, 300);
            }
        });
    }
});

// Listen for app ready event
document.addEventListener('appReady', function() {
    console.log('🎯 App is ready, checking profile...');
    if (document.getElementById('profile-form') && !profileModule) {
        initProfileModule();
    }
});

// Make functions globally available
window.ProfileModule = ProfileModule;
window.initProfileModule = initProfileModule;
window.loadProfile = loadProfile;

console.log('🏁 Profile module loaded, will auto-initialize when needed');
