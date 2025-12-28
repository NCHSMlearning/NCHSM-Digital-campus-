// js/profile.js - Profile Management Module (Integrated with database.js)
class ProfileModule {
    constructor() {
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
        console.log('🔧 Initializing ProfileModule elements...');
        
        // Get all profile elements
        this.profileForm = this.getElement('profile-form');
        this.passportPreview = this.getElement('passport-preview');
        this.headerPassportPreview = this.getElement('header-passport-preview');
        this.passportFileInput = this.getElement('passport-file-input');
        this.uploadLabel = this.getElement('upload-label');
        this.uploadButton = this.getElement('upload-button');
        this.editProfileButton = this.getElement('edit-profile-button');
        this.saveProfileButton = this.getElement('save-profile-button');
        this.profileStatus = this.getElement('profile-status');
        
        // Form fields
        this.profileName = this.getElement('profile-name');
        this.profileStudentId = this.getElement('profile-student-id');
        this.profileEmail = this.getElement('profile-email');
        this.profilePhone = this.getElement('profile-phone');
        this.profileProgram = this.getElement('profile-program');
        this.profileBlock = this.getElement('profile-block');
        this.profileIntakeYear = this.getElement('profile-intake-year');
        
        // Setup event listeners
        this.setupEventListeners();
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
            this.uploadLabel.addEventListener('click', () => {
                if (this.passportFileInput) {
                    this.passportFileInput.click();
                }
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
    
    // Initialize with user data from database.js
    async initialize() {
        console.log('🚀 ProfileModule.initialize() called');
        
        // Get user data from database.js
        this.userId = this.getCurrentUserId();
        this.userProfile = this.getUserProfile();
        
        console.log('👤 ProfileModule user data:', {
            userId: this.userId,
            hasProfile: !!this.userProfile
        });
        
        if (this.userId && this.userProfile) {
            console.log('✅ User data available, loading profile...');
            await this.loadProfile();
        } else {
            console.warn('⚠️ Waiting for user data...');
            // Wait and retry (database might still be initializing)
            setTimeout(() => {
                console.log('🔄 Retrying profile initialization...');
                this.initialize();
            }, 1000);
        }
    }
    
    // Get user ID from database.js
    getCurrentUserId() {
        if (window.db && window.db.currentUserId) {
            return window.db.currentUserId;
        }
        if (window.currentUserId) {
            return window.currentUserId;
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
        
        if (this.profileStatus) {
            this.profileStatus.textContent = 'Loading profile...';
            this.profileStatus.className = 'info-message';
        }
        
        try {
            // Use database.js to load profile (it has caching)
            if (window.db && window.db.loadUserProfile) {
                console.log('📦 Using database.js to load profile');
                const profile = await window.db.loadUserProfile();
                this.userProfile = profile;
            } else {
                // Fallback: direct database query
                const supabase = this.getSupabaseClient();
                if (!supabase) {
                    throw new Error('No database connection');
                }
                
                const { data: profile, error } = await supabase
                    .from('consolidated_user_profiles_table')
                    .select('*')
                    .eq('user_id', this.userId)
                    .single();
                
                if (error || !profile) {
                    throw new Error('Profile data missing or restricted. Contact Admin.');
                }
                
                this.userProfile = profile;
            }
            
            if (this.profileStatus) {
                this.profileStatus.textContent = '';
                this.profileStatus.className = '';
            }
            
            // Populate form fields
            this.populateProfileForm();
            
            // Load profile photo
            this.loadProfilePhoto();
            
            this.toggleProfileEdit(false);
            
            console.log('✅ Profile loaded successfully');
            
        } catch (error) {
            console.error('❌ Error loading profile:', error);
            if (this.profileStatus) {
                this.profileStatus.textContent = `Error: ${error.message}`;
                this.profileStatus.className = 'error-message';
            }
        }
    }
    
    populateProfileForm() {
        if (!this.userProfile) return;
        
        console.log('📝 Populating profile form...');
        
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
            const name = this.userProfile.full_name || 'Student';
            welcomeHeader.textContent = name.includes('Welcome') ? name : `Welcome back, ${name}!`;
        }
    }
    
    async loadProfilePhoto() {
        if (!this.userProfile) return;
        
        console.log('🖼️ Loading profile photo...');
        
        const photoUrl = this.userProfile.passport_url;
        const passportCard = document.getElementById('action-passport');
        
        if (passportCard) {
            passportCard.style.display = photoUrl ? 'none' : 'block';
        }
        
        // Determine the photo source (URL or fallback)
        let finalPhotoSrc = 'https://dummyimage.com/150x150/cccccc/000000.png&text=NO+PHOTO';
        
        if (photoUrl) {
            // Construct proper Supabase URL
            const supabaseUrl = window.APP_CONFIG?.SUPABASE_URL || 'https://api.supabase.co';
            finalPhotoSrc = `${supabaseUrl}/storage/v1/object/public/passports/${photoUrl}?t=${new Date().getTime()}`;
            console.log('📸 Profile photo URL:', finalPhotoSrc);
        }
        
        // Update both profile and header images
        if (this.passportPreview) {
            this.passportPreview.src = finalPhotoSrc;
            this.passportPreview.onerror = function() {
                console.warn('⚠️ Failed to load profile photo, using fallback');
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
        
        // Update upload label visibility
        if (this.uploadLabel) {
            this.uploadLabel.style.display = photoUrl ? 'none' : 'block';
        }
    }
    
    toggleProfileEdit(enable) {
        this.isEditing = enable;
        
        console.log(`🔄 Profile edit mode: ${enable ? 'ON' : 'OFF'}`);
        
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
        
        if (this.uploadButton) {
            this.uploadButton.style.display = enable ? 'block' : 'none';
        }
    }
    
    enableEditing() {
        console.log('✏️ Enabling profile editing...');
        this.toggleProfileEdit(true);
        if (this.profileStatus) {
            this.profileStatus.textContent = 'You can now edit your profile';
            this.profileStatus.className = 'info-message';
        }
        
        // Focus on name field
        if (this.profileName) {
            setTimeout(() => {
                this.profileName.focus();
                this.profileName.select();
            }, 100);
        }
    }
    
    async saveProfile() {
        if (!this.userId) {
            console.error('❌ Cannot save profile: User ID not set');
            return;
        }
        
        console.log('💾 Saving profile changes...');
        
        if (this.profileStatus) {
            this.profileStatus.textContent = 'Saving changes...';
            this.profileStatus.className = 'info-message';
        }
        
        const updates = {
            full_name: this.profileName ? this.profileName.value.trim() : '',
            phone: this.profilePhone ? this.profilePhone.value.trim() : '',
            updated_at: new Date().toISOString()
        };
        
        // Validate
        if (!updates.full_name) {
            if (this.profileStatus) {
                this.profileStatus.textContent = 'Name is required';
                this.profileStatus.className = 'error-message';
            }
            return;
        }
        
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
            
            if (this.profileStatus) {
                this.profileStatus.textContent = 'Profile updated successfully!';
                this.profileStatus.className = 'success-message';
            }
            
            // Reload profile to get fresh data
            await this.loadProfile();
            
            // Dispatch event to notify other modules
            document.dispatchEvent(new CustomEvent('profileUpdated', {
                detail: { profile: this.userProfile }
            }));
            
            // Show success toast if available
            if (window.showToast) {
                showToast('Profile updated successfully!', 'success');
            }
            
        } catch (error) {
            console.error('❌ Error saving profile:', error);
            if (this.profileStatus) {
                this.profileStatus.textContent = `Error: ${error.message}`;
                this.profileStatus.className = 'error-message';
            }
        }
    }
    
    handlePassportFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            console.log('📁 File selected:', file.name);
            
            // Validate file
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
            const maxSize = 5 * 1024 * 1024; // 5MB
            
            if (!validTypes.includes(file.type)) {
                alert('Please select a valid image file (JPEG, PNG, GIF)');
                event.target.value = '';
                return;
            }
            
            if (file.size > maxSize) {
                alert('File size must be less than 5MB');
                event.target.value = '';
                return;
            }
            
            // Display temporary object URL for preview
            if (this.passportPreview) {
                this.passportPreview.src = URL.createObjectURL(file);
            }
            
            if (this.uploadButton) {
                this.uploadButton.style.display = 'block';
                this.uploadButton.disabled = false;
            }
            
            if (this.uploadLabel) this.uploadLabel.style.display = 'none';
            
            if (this.profileStatus) {
                this.profileStatus.textContent = 'Ready to upload photo';
                this.profileStatus.className = 'info-message';
            }
        }
    }
    
    async uploadPassportPhoto() {
        if (!this.userId) {
            console.error('❌ Cannot upload: User ID not set');
            return;
        }
        
        const file = this.passportFileInput.files[0];
        if (!file) {
            if (this.profileStatus) {
                this.profileStatus.textContent = 'Please select a file first.';
                this.profileStatus.className = 'error-message';
            }
            return;
        }
        
        console.log('📤 Uploading passport photo...');
        
        if (this.profileStatus) {
            this.profileStatus.textContent = 'Uploading photo... (This may take a few seconds)';
            this.profileStatus.className = 'info-message';
        }
        
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
                    .upload(filePath, file, { cacheControl: '3600', upsert: true });
                
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
            if (this.passportFileInput) {
                this.passportFileInput.value = '';
            }
            
            if (this.uploadButton) {
                this.uploadButton.style.display = 'none';
                this.uploadButton.disabled = false;
                this.uploadButton.textContent = 'Upload Photo';
            }
            
            if (this.uploadLabel) {
                this.uploadLabel.style.display = 'none';
            }
            
            // Reload profile to reflect change
            await this.loadProfile();
            
            if (this.profileStatus) {
                this.profileStatus.textContent = 'Photo uploaded successfully!';
                this.profileStatus.className = 'success-message';
            }
            
            // Show success toast if available
            if (window.showToast) {
                showToast('Profile photo updated successfully!', 'success');
            }
            
        } catch (error) {
            console.error('❌ Error uploading passport photo:', error);
            
            if (this.uploadButton) {
                this.uploadButton.disabled = false;
                this.uploadButton.textContent = 'Upload Photo';
            }
            
            if (this.profileStatus) {
                this.profileStatus.textContent = `Error: ${error.message}`;
                this.profileStatus.className = 'error-message';
            }
        }
    }
    
    // Get current user profile (for other modules)
    getCurrentUserProfile() {
        return this.userProfile;
    }
    
    // Update current user profile (for other modules)
    updateUserProfile(data) {
        console.log('👤 Updating user profile data');
        this.userProfile = { ...this.userProfile, ...data };
        this.populateProfileForm();
    }
}

// Create global instance
let profileModule = null;

// Initialize profile module (updated for database.js)
function initProfileModule() {
    console.log('🚀 initProfileModule() called');
    
    // Wait for database to be ready
    if (!window.db || !window.db.isInitialized) {
        console.log('⏳ Waiting for database to initialize...');
        setTimeout(initProfileModule, 500);
        return null;
    }
    
    try {
        profileModule = new ProfileModule();
        profileModule.initialize();
        console.log('✅ ProfileModule initialized successfully');
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
function autoInitializeProfile() {
    console.log('🔄 Auto-initializing profile module...');
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeWhenReady);
    } else {
        initializeWhenReady();
    }
}

function initializeWhenReady() {
    console.log('📱 DOM ready, checking for profile elements...');
    
    // Check if profile elements exist on this page
    const hasProfileElements = document.getElementById('profile-form') || 
                              document.getElementById('profile');
    
    if (hasProfileElements) {
        console.log('✅ Profile elements found, will initialize when needed...');
        
        // Initialize when profile tab is opened
        const checkForProfileTab = () => {
            if (document.getElementById('profile') && document.getElementById('profile').classList.contains('active')) {
                if (!profileModule) {
                    initProfileModule();
                }
            }
        };
        
        // Listen for tab changes
        document.addEventListener('click', (e) => {
            const tabLink = e.target.closest('[data-tab="profile"]');
            if (tabLink) {
                setTimeout(() => {
                    if (!profileModule) {
                        initProfileModule();
                    } else {
                        profileModule.loadProfile();
                    }
                }, 300);
            }
        });
        
    } else {
        console.log('📭 No profile elements on this page');
    }
}

// Listen for app ready event
document.addEventListener('appReady', function() {
    console.log('🎯 App is ready, checking profile...');
    if (document.getElementById('profile-form') && !profileModule) {
        setTimeout(() => {
            initProfileModule();
        }, 300);
    }
});

// Auto-initialize on page load
autoInitializeProfile();

// Make functions globally available
window.ProfileModule = ProfileModule;
window.initProfileModule = initProfileModule;
window.loadProfile = loadProfile;
window.profileModule = null;

console.log('🏁 Profile module loaded, will auto-initialize when needed');
