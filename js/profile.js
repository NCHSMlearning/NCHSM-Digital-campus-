// profile.js - Complete Profile Management Module
class ProfileModule {
    constructor() {
        this.userId = null;
        this.userProfile = null;
        
        // Profile elements
        this.profileForm = null;
        this.passportPreview = null;
        this.passportFileInput = null;
        this.uploadButton = null;
        this.editProfileButton = null;
        this.saveProfileButton = null;
        this.cancelEditButton = null;
        this.profileStatus = null;
        
        // Form fields
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
        this.photoObjectURL = null;
        this.originalValues = {};
        this.isPhotoUploading = false;
        
        this.initializeElements();
    }
    
    initializeElements() {
        console.log('🔧 Initializing ProfileModule elements...');
        
        // Get form and containers
        this.profileForm = this.getElement('profile-form');
        this.profileStatus = this.getElement('profile-status');
        
        // Profile photo section
        this.passportPreview = this.getElement('passport-preview');
        this.passportFileInput = this.getElement('passport-file-input');
        this.uploadButton = this.getElement('upload-button');
        
        // Form fields
        this.profileName = this.getElement('profile-name');
        this.profileStudentId = this.getElement('profile-student-id');
        this.profileEmail = this.getElement('profile-email');
        this.profilePhone = this.getElement('profile-phone');
        this.profileProgram = this.getElement('profile-program');
        this.profileBlock = this.getElement('profile-block');
        this.profileIntakeYear = this.getElement('profile-intake-year');
        
        // Action buttons
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
        this.setupEnhancedEventListeners();
        
        console.log('✅ Profile elements initialized');
    }
    
    getElement(id) {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`⚠️ Profile element #${id} not found`);
        }
        return element;
    }
    
    setupEventListeners() {
        console.log('🎧 Setting up event listeners...');
        
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
    
    setupEnhancedEventListeners() {
        console.log('🎬 Setting up enhanced event listeners...');
        
        // === Photo Section Enhancements ===
        const photoContainer = document.querySelector('.passport-photo-container');
        if (photoContainer) {
            // Drag and drop support
            photoContainer.addEventListener('dragover', (e) => {
                e.preventDefault();
                photoContainer.classList.add('drag-over');
            });
            
            photoContainer.addEventListener('dragleave', () => {
                photoContainer.classList.remove('drag-over');
            });
            
            photoContainer.addEventListener('drop', (e) => {
                e.preventDefault();
                photoContainer.classList.remove('drag-over');
                
                const files = e.dataTransfer.files;
                if (files.length > 0 && this.passportFileInput) {
                    this.passportFileInput.files = files;
                    this.handlePassportFileSelect({ target: this.passportFileInput });
                }
            });
            
            // Keyboard support for photo upload
            photoContainer.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (this.passportFileInput) {
                        this.passportFileInput.click();
                    }
                }
            });
        }
        
        // === Real-time Field Validation with Visual Feedback ===
        const fieldsToValidate = [this.profileName, this.profilePhone];
        fieldsToValidate.forEach(field => {
            if (field) {
                field.addEventListener('blur', () => this.validateFieldWithFeedback(field));
                field.addEventListener('input', () => {
                    field.classList.remove('error', 'success');
                    const errorElement = field.parentNode.querySelector('.field-error');
                    if (errorElement) errorElement.remove();
                });
            }
        });
        
        // === Form Field Focus Enhancements ===
        const formInputs = document.querySelectorAll('#profile-form input');
        formInputs.forEach(input => {
            input.addEventListener('focus', () => {
                input.parentElement.classList.add('focused');
            });
            
            input.addEventListener('blur', () => {
                input.parentElement.classList.remove('focused');
            });
        });
        
        // === Tab Switching Protection ===
        document.addEventListener('visibilitychange', () => {
            if (this.isEditing && document.hidden) {
                this.showNotification('Profile changes not saved', 'warning');
            }
        });
        
        // === Before Unload Warning ===
        window.addEventListener('beforeunload', (e) => {
            if (this.isEditing) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
                return e.returnValue;
            }
        });
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
    
    getCurrentUserId() {
        if (window.db && window.db.currentUserId) {
            return window.db.currentUserId;
        }
        if (window.currentUserId) {
            return window.currentUserId;
        }
        return null;
    }
    
    getUserProfile() {
        if (window.db && window.db.currentUserProfile) {
            return window.db.currentUserProfile;
        }
        if (window.currentUserProfile || window.userProfile) {
            return window.currentUserProfile || window.userProfile;
        }
        return null;
    }
    
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
    
    async loadProfile() {
        if (!this.userId) {
            console.error('❌ User ID not set');
            return;
        }
        
        console.log('👤 Loading profile data...');
        
        this.showStatus('Loading profile...', 'info');
        this.updateUIState('loading');
        
        try {
            let profile;
            if (window.db && window.db.loadUserProfile) {
                console.log('📦 Using database.js to load profile');
                profile = await window.db.loadUserProfile();
            } else {
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
            this.updateUIState('view');
            
            console.log('✅ Profile loaded successfully');
            
        } catch (error) {
            console.error('❌ Error loading profile:', error);
            this.updateUIState('error');
            this.showStatus(`Error: ${error.message}`, 'error');
        }
    }
    
    populateProfileForm() {
        if (!this.userProfile) return;
        
        console.log('📝 Populating profile form...');
        
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
        
        this.updateSidebarUserInfo();
    }
    
    updateSidebarUserInfo() {
        if (!this.userProfile) return;
        
        const sidebarUserName = document.getElementById('sidebar-user-name');
        if (sidebarUserName) {
            sidebarUserName.textContent = this.userProfile.full_name || 'Student';
        }
        
        const sidebarUserEmail = document.getElementById('sidebar-user-email');
        if (sidebarUserEmail) {
            sidebarUserEmail.textContent = this.userProfile.email || '';
        }
        
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
        
        if (this.photoObjectURL) {
            URL.revokeObjectURL(this.photoObjectURL);
            this.photoObjectURL = null;
        }
        
        let finalPhotoSrc = 'https://dummyimage.com/150x150/cccccc/000000.png&text=Upload+Photo';
        
        if (photoUrl) {
            try {
                const supabaseUrl = window.APP_CONFIG?.SUPABASE_URL || 'https://api.supabase.co';
                finalPhotoSrc = `${supabaseUrl}/storage/v1/object/public/passports/${photoUrl}?t=${new Date().getTime()}`;
                
                await this.testImageLoad(finalPhotoSrc);
                console.log('📸 Profile photo loaded successfully');
            } catch (error) {
                console.warn('⚠️ Failed to load profile photo:', error);
                finalPhotoSrc = 'https://dummyimage.com/150x150/cccccc/000000.png&text=No+Photo';
            }
        }
        
        if (this.passportPreview) {
            this.passportPreview.src = finalPhotoSrc;
            this.passportPreview.alt = photoUrl ? 'Your passport photo' : 'Upload passport photo';
        }
        
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
    
    updateUIState(state) {
        console.log(`🔄 Updating UI state to: ${state}`);
        
        switch(state) {
            case 'view':
                this.updateViewMode();
                break;
            case 'edit':
                this.updateEditMode();
                break;
            case 'loading':
                this.updateLoadingMode();
                break;
            case 'saving':
                this.updateSavingMode();
                break;
            case 'error':
                this.updateErrorMode();
                break;
        }
    }
    
    updateViewMode() {
        this.isEditing = false;
        
        this.toggleElement(this.editProfileButton, true);
        this.toggleElement(this.saveProfileButton, false);
        this.toggleElement(this.cancelEditButton, false);
        this.toggleElement(this.uploadButton, false);
        
        this.setFieldsReadonly(true);
        
        if (this.profileForm) {
            this.profileForm.classList.remove('editing', 'loading', 'saving');
        }
        
        this.clearAllErrors();
        
        if (this.passportFileInput && this.passportFileInput.files.length > 0) {
            this.resetPhotoPreview();
        }
        
        this.toggleHelpTexts(false);
    }
    
    updateEditMode() {
        this.isEditing = true;
        
        this.toggleElement(this.editProfileButton, false);
        this.toggleElement(this.saveProfileButton, true);
        this.toggleElement(this.cancelEditButton, true);
        this.toggleElement(this.uploadButton, true);
        
        this.setFieldsReadonly(false);
        
        if (this.profileForm) {
            this.profileForm.classList.add('editing');
            this.profileForm.classList.remove('loading', 'saving');
        }
        
        this.saveOriginalValues();
        this.focusFirstEditableField();
        this.toggleHelpTexts(true);
        
        this.showStatus('Edit mode enabled. Make your changes and click Save.', 'info');
    }
    
    updateLoadingMode() {
        this.showStatus('Loading...', 'info');
        this.disableAllButtons(true);
        
        if (this.profileForm) {
            this.profileForm.classList.add('loading');
        }
    }
    
    updateSavingMode() {
        this.showStatus('Saving changes...', 'info');
        this.disableAllButtons(true);
        
        if (this.saveProfileButton) {
            this.saveProfileButton.classList.add('button-loading');
            this.saveProfileButton.innerHTML = '<span class="spinner"></span>Saving...';
        }
        
        if (this.profileForm) {
            this.profileForm.classList.add('saving');
        }
    }
    
    updateErrorMode() {
        this.disableAllButtons(false);
        
        if (this.saveProfileButton) {
            this.saveProfileButton.classList.remove('button-loading');
            this.saveProfileButton.innerHTML = '<span class="button-icon">💾</span><span class="button-text">Save Changes</span>';
        }
        
        if (this.profileForm) {
            this.profileForm.classList.remove('saving', 'loading');
            this.profileForm.classList.add('error-shake');
            setTimeout(() => {
                this.profileForm.classList.remove('error-shake');
            }, 500);
        }
    }
    
    toggleElement(element, show) {
        if (element) {
            element.style.display = show ? 'flex' : 'none';
        }
    }
    
    setFieldsReadonly(readonly) {
        const editableFields = [this.profileName, this.profilePhone];
        editableFields.forEach(field => {
            if (field) {
                field.readOnly = readonly;
                field.classList.toggle('editable', !readonly);
            }
        });
        
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
    
    saveOriginalValues() {
        this.originalValues = {
            name: this.profileName ? this.profileName.value : '',
            phone: this.profilePhone ? this.profilePhone.value : '',
            photoUrl: this.passportPreview ? this.passportPreview.src : ''
        };
    }
    
    focusFirstEditableField() {
        setTimeout(() => {
            if (this.profileName && !this.profileName.readOnly) {
                this.profileName.focus();
                this.profileName.select();
            }
        }, 100);
    }
    
    toggleHelpTexts(show) {
        const helpTexts = document.querySelectorAll('.help-text');
        helpTexts.forEach(text => {
            text.style.display = show ? 'block' : 'none';
        });
    }
    
    disableAllButtons(disabled) {
        const buttons = [
            this.editProfileButton,
            this.saveProfileButton,
            this.cancelEditButton,
            this.uploadButton
        ];
        
        buttons.forEach(button => {
            if (button) {
                button.disabled = disabled;
            }
        });
    }
    
    clearAllErrors() {
        const errorElements = document.querySelectorAll('.field-error');
        errorElements.forEach(element => element.remove());
        
        const errorInputs = document.querySelectorAll('.form-input.error');
        errorInputs.forEach(input => {
            input.classList.remove('error');
            input.classList.remove('success');
        });
    }
    
    resetPhotoPreview() {
        if (this.passportPreview && this.originalValues.photoUrl) {
            this.passportPreview.src = this.originalValues.photoUrl;
            this.passportPreview.classList.remove('new-photo');
        }
        if (this.passportFileInput) {
            this.passportFileInput.value = '';
        }
        if (this.uploadButton) {
            this.uploadButton.disabled = true;
        }
    }
    
    enableEditing() {
        console.log('✏️ Enabling profile editing...');
        this.updateUIState('edit');
    }
    
    cancelEditing() {
        console.log('✖️ Canceling profile editing...');
        
        this.populateProfileForm();
        
        if (this.passportFileInput && this.passportFileInput.files.length > 0) {
            this.passportFileInput.value = '';
            this.loadProfilePhoto();
        }
        
        this.updateUIState('view');
        this.clearStatus();
        
        if (this.photoObjectURL) {
            URL.revokeObjectURL(this.photoObjectURL);
            this.photoObjectURL = null;
        }
        
        this.showNotification('Changes canceled', 'info');
    }
    
    async saveProfile() {
        if (!this.userId) {
            console.error('❌ Cannot save profile: User ID not set');
            return;
        }
        
        console.log('💾 Saving profile changes...');
        
        // Validate form
        if (!this.validateFormWithVisuals()) {
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
                await this.uploadPassportPhotoWithProgress();
            } else {
                this.onSaveSuccess();
            }
            
        } catch (error) {
            this.onSaveError(error);
        }
    }
    
    async saveProfileData(updates) {
        console.log('💾 Saving profile data...');
        
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
    
    async uploadPassportPhotoWithProgress() {
        console.log('📤 Uploading photo with progress...');
        
        this.isPhotoUploading = true;
        const file = this.passportFileInput.files[0];
        
        this.showUploadProgress(0);
        
        try {
            const supabase = this.getSupabaseClient();
            const fileExt = file.name.split('.').pop();
            const filePath = `${this.userId}.${fileExt}`;
            
            const { error } = await supabase.storage
                .from('passports')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true,
                    contentType: file.type
                });
            
            if (error) throw error;
            
            await supabase
                .from('consolidated_user_profiles_table')
                .update({ 
                    passport_url: filePath,
                    updated_at: new Date().toISOString() 
                })
                .eq('user_id', this.userId);
            
            this.showUploadProgress(100);
            setTimeout(() => this.onSaveSuccess(), 500);
            
        } catch (error) {
            throw error;
        } finally {
            this.isPhotoUploading = false;
        }
    }
    
    showUploadProgress(percent) {
        let progressBar = document.getElementById('upload-progress');
        if (!progressBar) {
            progressBar = document.createElement('div');
            progressBar.id = 'upload-progress';
            progressBar.className = 'progress-bar';
            progressBar.innerHTML = `
                <div class="progress-fill"></div>
                <div class="progress-text">Uploading: ${percent}%</div>
            `;
            
            const statusContainer = document.getElementById('profile-status-container') || 
                                   document.querySelector('.form-status-container');
            if (statusContainer) {
                statusContainer.appendChild(progressBar);
            }
        }
        
        const progressFill = progressBar.querySelector('.progress-fill');
        const progressText = progressBar.querySelector('.progress-text');
        
        if (progressFill) progressFill.style.width = `${percent}%`;
        if (progressText) progressText.textContent = `Uploading: ${percent}%`;
        
        if (percent === 100) {
            setTimeout(() => {
                progressBar.remove();
            }, 1000);
        }
    }
    
    onSaveSuccess() {
        console.log('✅ Save successful!');
        
        if (this.photoObjectURL) {
            URL.revokeObjectURL(this.photoObjectURL);
            this.photoObjectURL = null;
        }
        
        this.loadProfile();
        
        this.showStatus('Profile updated successfully!', 'success');
        this.showNotification('✅ Profile saved successfully!', 'success');
        
        this.updateUIState('view');
    }
    
    onSaveError(error) {
        console.error('❌ Save error:', error);
        this.updateUIState('error');
        this.showStatus(`Error: ${error.message}`, 'error');
        this.showNotification(`❌ ${error.message}`, 'error');
    }
    
    validateFormWithVisuals() {
        let isValid = true;
        
        if (!this.validateFieldWithFeedback(this.profileName, 'name')) {
            this.addFieldAnimation(this.profileName, 'shake');
            isValid = false;
        }
        
        if (this.profilePhone && this.profilePhone.value.trim()) {
            if (!this.validateFieldWithFeedback(this.profilePhone, 'phone')) {
                this.addFieldAnimation(this.profilePhone, 'shake');
                isValid = false;
            }
        }
        
        if (isValid && this.profileForm) {
            this.profileForm.classList.add('success-pulse');
            setTimeout(() => {
                this.profileForm.classList.remove('success-pulse');
            }, 1000);
        }
        
        return isValid;
    }
    
    validateFieldWithFeedback(field, type) {
        if (!field) return true;
        
        let isValid = true;
        let message = '';
        
        switch(type) {
            case 'name':
                const name = field.value.trim();
                if (!name) {
                    isValid = false;
                    message = 'Name is required';
                } else if (name.length < 2) {
                    isValid = false;
                    message = 'Name must be at least 2 characters';
                }
                break;
                
            case 'phone':
                const phone = field.value.trim();
                if (phone) {
                    const phoneRegex = /^[\d\s\-\+\(\)]{10,20}$/;
                    if (!phoneRegex.test(phone)) {
                        isValid = false;
                        message = 'Please enter a valid phone number';
                    }
                }
                break;
        }
        
        if (!isValid) {
            field.classList.remove('success');
            field.classList.add('error');
            this.showFieldError(field, message);
        } else {
            field.classList.remove('error');
            field.classList.add('success');
            setTimeout(() => {
                field.classList.remove('success');
            }, 2000);
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
        if (!phone) return true;
        
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
    
    addFieldAnimation(field, animation) {
        if (!field) return;
        
        field.classList.add(animation);
        setTimeout(() => {
            field.classList.remove(animation);
        }, 500);
    }
    
    handlePassportFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        console.log('📁 File selected:', file.name);
        
        const validation = this.validatePassportFile(file);
        if (!validation.valid) {
            this.showStatus(validation.message, 'error');
            event.target.value = '';
            return;
        }
        
        if (this.photoObjectURL) {
            URL.revokeObjectURL(this.photoObjectURL);
            this.photoObjectURL = null;
        }
        
        this.photoObjectURL = URL.createObjectURL(file);
        
        if (this.passportPreview) {
            this.passportPreview.src = this.photoObjectURL;
            this.passportPreview.classList.add('new-photo');
        }
        
        if (this.uploadButton) {
            this.uploadButton.disabled = false;
            this.uploadButton.textContent = 'Upload Photo';
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
        
        this.showStatus('Uploading photo...', 'info');
        
        if (this.uploadButton) {
            this.uploadButton.disabled = true;
            this.uploadButton.textContent = 'Uploading...';
        }
        
        try {
            const supabase = this.getSupabaseClient();
            if (!supabase) {
                throw new Error('No database connection');
            }
            
            const fileExt = file.name.split('.').pop();
            const filePath = `${this.userId}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
                .from('passports')
                .upload(filePath, file, { 
                    cacheControl: '3600', 
                    upsert: true,
                    contentType: file.type
                });
            
            if (uploadError) throw uploadError;
            
            const { error: updateError } = await supabase
                .from('consolidated_user_profiles_table')
                .update({ 
                    passport_url: filePath,
                    updated_at: new Date().toISOString() 
                })
                .eq('user_id', this.userId);
            
            if (updateError) throw updateError;
            
            console.log('✅ Photo uploaded successfully');
            
            this.passportFileInput.value = '';
            
            if (this.photoObjectURL) {
                URL.revokeObjectURL(this.photoObjectURL);
                this.photoObjectURL = null;
            }
            
            await this.loadProfile();
            
            this.showStatus('Profile updated successfully!', 'success');
            this.updateUIState('view');
            
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
    
    showStatus(message, type = 'info') {
        if (!this.profileStatus) return;
        
        this.profileStatus.textContent = message;
        this.profileStatus.className = `form-status form-status-${type}`;
        
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
        if (window.showToast) {
            showToast(message, type);
            return;
        }
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-live', 'assertive');
        
        const icons = {
            success: '✅',
            error: '❌',
            info: 'ℹ️',
            warning: '⚠️'
        };
        
        notification.innerHTML = `
            <span class="notification-icon">${icons[type] || icons.info}</span>
            <span class="notification-message">${message}</span>
        `;
        
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
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    getCurrentUserProfile() {
        return this.userProfile;
    }
    
    cleanup() {
        if (this.photoObjectURL) {
            URL.revokeObjectURL(this.photoObjectURL);
            this.photoObjectURL = null;
        }
        
        console.log('🧹 Profile module cleaned up');
    }
}

// Create global instance
let profileModule = null;

function initProfileModule() {
    console.log('🚀 initProfileModule() called');
    
    if (!document.getElementById('profile-form')) {
        console.log('📭 Profile form not found on this page');
        return null;
    }
    
    if (profileModule) {
        profileModule.cleanup();
    }
    
    try {
        profileModule = new ProfileModule();
        
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

async function loadProfile() {
    if (profileModule) {
        await profileModule.loadProfile();
    } else {
        console.warn('⚠️ Profile module not initialized');
        initProfileModule();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('📱 DOM loaded, checking for profile elements...');
    
    const hasProfileElements = document.getElementById('profile-form') || 
                              document.getElementById('profile');
    
    if (hasProfileElements) {
        console.log('✅ Profile elements found, initializing...');
        
        setTimeout(() => {
            initProfileModule();
        }, 1000);
        
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

document.addEventListener('appReady', function() {
    console.log('🎯 App is ready, checking profile...');
    if (document.getElementById('profile-form') && !profileModule) {
        initProfileModule();
    }
});

window.ProfileModule = ProfileModule;
window.initProfileModule = initProfileModule;
window.loadProfile = loadProfile;

console.log('🏁 Profile module loaded, will auto-initialize when needed');
