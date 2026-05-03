class ProfileModule {
    constructor() {
        this.userId = null;
        this.userProfile = null;
        this.isEditing = false;
        this.photoObjectURL = null;
        this.pendingPhotoFile = null; 
        
        this.initializeElements();
    }
    
    initializeElements() {
        // Get form and containers
        this.profileForm = document.getElementById('profile-form');
        this.profileStatus = document.getElementById('profile-status');
        
        // Profile photo section (RIGHT COLUMN)
        this.passportPreview = document.getElementById('passport-preview');
        this.passportFileInput = document.getElementById('passport-file-input');
        
        // Upload buttons (photo controls in right column)
        this.choosePhotoButton = document.querySelector('#profile .photo-controls label[for="passport-file-input"]');
        this.savePhotoButton = document.getElementById('save-photo-button');
        this.cancelPhotoButton = document.getElementById('cancel-photo-button');
        
        // Form fields (LEFT COLUMN)
        this.profileName = document.getElementById('profile-name');
        this.profileStudentId = document.getElementById('profile-student-id');
        this.profileEmail = document.getElementById('profile-email');
        this.profilePhone = document.getElementById('profile-phone');
        this.profileDob = document.getElementById('profile-dob');        // DOB
        this.profileGender = document.getElementById('profile-gender');  // Gender
        this.profileProgram = document.getElementById('profile-program');
        this.profileBlock = document.getElementById('profile-block');
        this.profileIntakeYear = document.getElementById('profile-intake-year');
        
        // Admission Date fields
        this.profileAdmissionDate = document.getElementById('profile-admission-date');
        this.profileAdmissionYear = document.getElementById('profile-admission-year');
        
        // Block Progress elements (in left column)
        this.blockProgressFill = document.getElementById('block-progress-fill');
        this.blockProgressText = document.getElementById('block-progress-text');
        this.currentBlockStatus = document.getElementById('current-block-status');
        this.completedBlocksContainer = document.getElementById('completed-blocks');
        this.blockTimeline = document.getElementById('block-timeline-profile') || document.getElementById('block-timeline');
        
        // ==================== PASSWORD RESET ELEMENTS ====================
        this.currentPassword = document.getElementById('current-password');
        this.newPassword = document.getElementById('new-password');
        this.confirmPassword = document.getElementById('confirm-password');
        this.changePasswordBtn = document.getElementById('change-password-btn');
        this.passwordStrengthBar = document.getElementById('strength-bar');
        this.passwordStrengthText = document.getElementById('strength-text');
        this.passwordRequirements = document.getElementById('password-requirements');
        this.passwordFeedback = document.getElementById('password-feedback');
        
        // Action buttons (form actions at bottom)
        this.editProfileButton = document.getElementById('edit-profile-button');
        this.saveProfileButton = document.getElementById('save-profile-button');
        this.cancelEditButton = document.getElementById('cancel-edit-button');
        
        this.setupEventListeners();
        this.setupPasswordResetListeners();
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
    
    // ==================== PASSWORD RESET LISTENERS ====================
    setupPasswordResetListeners() {
        if (!this.newPassword) return;
        
        // Password strength checker
        this.newPassword.addEventListener('input', () => {
            this.checkPasswordStrength(this.newPassword.value);
            this.validatePasswordRequirements(this.newPassword.value);
        });
        
        // Confirm password check
        if (this.confirmPassword) {
            this.confirmPassword.addEventListener('input', () => {
                this.validateConfirmPassword();
            });
        }
        
        // Show password requirements when typing
        this.newPassword.addEventListener('focus', () => {
            if (this.passwordRequirements) {
                this.passwordRequirements.classList.add('show');
            }
        });
        
        this.newPassword.addEventListener('blur', () => {
            setTimeout(() => {
                if (this.passwordRequirements && !this.passwordRequirements.querySelector('.valid')) {
                    this.passwordRequirements.classList.remove('show');
                }
            }, 2000);
        });
        
        // Change password button click
        if (this.changePasswordBtn) {
            this.changePasswordBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.changeUserPassword();
            });
        }
    }
    
    // ==================== PASSWORD STRENGTH FUNCTIONS ====================
    checkPasswordStrength(password) {
        if (!this.passwordStrengthBar || !this.passwordStrengthText) return;
        
        let strength = 0;
        
        // Length check
        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        
        // Complexity checks
        if (/[A-Z]/.test(password)) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[!@#$%^&*]/.test(password)) strength++;
        
        let strengthClass = '';
        let strengthLabel = '';
        
        if (strength <= 2) {
            strengthClass = 'weak';
            strengthLabel = 'Weak';
        } else if (strength <= 4) {
            strengthClass = 'medium';
            strengthLabel = 'Medium';
        } else if (strength <= 6) {
            strengthClass = 'strong';
            strengthLabel = 'Strong';
        } else {
            strengthClass = 'very-strong';
            strengthLabel = 'Very Strong';
        }
        
        this.passwordStrengthBar.className = 'strength-bar ' + strengthClass;
        this.passwordStrengthText.textContent = strengthLabel;
        this.passwordStrengthText.style.color = this.getStrengthColor(strengthClass);
        
        // Update bar width for visual feedback
        const widthPercent = (strength / 7) * 100;
        this.passwordStrengthBar.style.width = `${widthPercent}%`;
    }
    
    getStrengthColor(strength) {
        switch(strength) {
            case 'weak': return '#dc2626';
            case 'medium': return '#f59e0b';
            case 'strong': return '#10b981';
            case 'very-strong': return '#059669';
            default: return '#6b7280';
        }
    }
    
    validatePasswordRequirements(password) {
        const requirements = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[!@#$%^&*]/.test(password)
        };
        
        // Update each requirement
        const reqLength = document.getElementById('req-length');
        const reqUppercase = document.getElementById('req-uppercase');
        const reqLowercase = document.getElementById('req-lowercase');
        const reqNumber = document.getElementById('req-number');
        const reqSpecial = document.getElementById('req-special');
        
        if (reqLength) this.updateRequirement(reqLength, requirements.length);
        if (reqUppercase) this.updateRequirement(reqUppercase, requirements.uppercase);
        if (reqLowercase) this.updateRequirement(reqLowercase, requirements.lowercase);
        if (reqNumber) this.updateRequirement(reqNumber, requirements.number);
        if (reqSpecial) this.updateRequirement(reqSpecial, requirements.special);
        
        return Object.values(requirements).every(v => v === true);
    }
    
    updateRequirement(element, isValid) {
        if (isValid) {
            element.classList.add('valid');
            element.style.color = '#10b981';
            element.style.textDecoration = 'line-through';
        } else {
            element.classList.remove('valid');
            element.style.color = '#dc2626';
            element.style.textDecoration = 'none';
        }
    }
    
    validateConfirmPassword() {
        const newPassword = this.newPassword?.value || '';
        const confirmPassword = this.confirmPassword?.value || '';
        
        if (confirmPassword && newPassword !== confirmPassword) {
            this.showPasswordFeedback('❌ Passwords do not match!', 'error');
            return false;
        } else if (confirmPassword && newPassword === confirmPassword) {
            this.showPasswordFeedback('✅ Passwords match!', 'success');
            setTimeout(() => this.clearPasswordFeedback(), 2000);
            return true;
        }
        
        this.clearPasswordFeedback();
        return false;
    }
    
    showPasswordFeedback(message, type) {
        if (!this.passwordFeedback) return;
        
        this.passwordFeedback.textContent = message;
        this.passwordFeedback.classList.add('show', type);
        this.passwordFeedback.classList.remove(type === 'success' ? 'error' : 'success');
    }
    
    clearPasswordFeedback() {
        if (this.passwordFeedback) {
            this.passwordFeedback.classList.remove('show');
        }
    }
    
    async changeUserPassword() {
        const currentPassword = this.currentPassword?.value;
        const newPassword = this.newPassword?.value;
        const confirmPassword = this.confirmPassword?.value;
        
        // Validation
        if (!currentPassword) {
            this.showPasswordFeedback('❌ Please enter your current password', 'error');
            return;
        }
        
        if (!newPassword) {
            this.showPasswordFeedback('❌ Please enter a new password', 'error');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            this.showPasswordFeedback('❌ New passwords do not match!', 'error');
            return;
        }
        
        // Validate password strength
        if (!this.validatePasswordRequirements(newPassword)) {
            this.showPasswordFeedback('❌ Password does not meet requirements!', 'error');
            if (this.passwordRequirements) this.passwordRequirements.classList.add('show');
            return;
        }
        
        // Show loading state
        if (this.changePasswordBtn) {
            this.changePasswordBtn.disabled = true;
            this.changePasswordBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Changing Password...';
        }
        
        try {
            const supabase = this.getSupabaseClient();
            if (!supabase) {
                throw new Error('Database connection not available');
            }
            
            const email = this.userProfile?.email;
            if (!email) {
                throw new Error('User email not found');
            }
            
            // Verify current password
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: email,
                password: currentPassword
            });
            
            if (signInError) {
                this.showPasswordFeedback('❌ Current password is incorrect!', 'error');
                return;
            }
            
            // Update password
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword
            });
            
            if (updateError) throw updateError;
            
            // Success
            this.showPasswordFeedback('✅ Password changed successfully! Please use your new password next login.', 'success');
            
            // Clear form
            if (this.currentPassword) this.currentPassword.value = '';
            if (this.newPassword) this.newPassword.value = '';
            if (this.confirmPassword) this.confirmPassword.value = '';
            
            // Reset strength indicator
            if (this.passwordStrengthBar) {
                this.passwordStrengthBar.className = 'strength-bar';
                this.passwordStrengthBar.style.width = '0%';
            }
            if (this.passwordStrengthText) this.passwordStrengthText.textContent = 'Not set';
            
            // Hide password requirements
            if (this.passwordRequirements) {
                this.passwordRequirements.classList.remove('show');
            }
            
            // Log audit
            await this.logAudit('PASSWORD_CHANGE', 'User changed their password', null, 'SUCCESS');
            
            // Optionally sign out and require re-login
            setTimeout(() => {
                if (confirm('Password changed successfully! Would you like to login again with your new password?')) {
                    supabase.auth.signOut();
                    window.location.href = '/login';
                }
            }, 2000);
            
        } catch (error) {
            console.error('Password change error:', error);
            this.showPasswordFeedback(`❌ Failed to change password: ${error.message}`, 'error');
            await this.logAudit('PASSWORD_CHANGE', `Failed to change password: ${error.message}`, null, 'FAILURE');
            
        } finally {
            if (this.changePasswordBtn) {
                this.changePasswordBtn.disabled = false;
                this.changePasswordBtn.innerHTML = 'Change Password';
            }
        }
    }
    
    async logAudit(action_type, details, target_id = null, status = 'SUCCESS') {
        try {
            const supabase = this.getSupabaseClient();
            if (!supabase) return;
            
            const logData = {
                user_id: this.userId,
                user_role: 'student',
                action_type: action_type,
                details: details,
                target_id: target_id,
                status: status,
                ip_address: await this.getIPAddress()
            };
            
            await supabase.from('audit_logs').insert([logData]);
        } catch (error) {
            console.error('Audit logging failed:', error);
        }
    }
    
    async getIPAddress() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            return null;
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
                    .maybeSingle();
                
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
            
            // Update block progress display
            this.updateBlockProgress();
            
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
        
        // Date of Birth
        if (this.profileDob && this.userProfile.date_of_birth) {
            const dob = new Date(this.userProfile.date_of_birth);
            if (!isNaN(dob)) {
                this.profileDob.value = dob.toISOString().split('T')[0];
            }
        } else if (this.profileDob) {
            this.profileDob.value = '';
        }
        
        // Gender
        if (this.profileGender && this.userProfile.gender) {
            this.profileGender.value = this.userProfile.gender;
        } else if (this.profileGender) {
            this.profileGender.value = '';
        }
        
        if (this.profileProgram) this.profileProgram.value = this.userProfile.program || this.userProfile.department || '';
        if (this.profileBlock) this.profileBlock.value = this.userProfile.block || this.userProfile.current_block || 'Introductory';
        if (this.profileIntakeYear) this.profileIntakeYear.value = this.userProfile.intake_year || this.userProfile.year_of_intake || '';
        
        // Admission Date
        if (this.profileAdmissionDate && this.userProfile.admission_date) {
            const admissionDate = new Date(this.userProfile.admission_date);
            if (!isNaN(admissionDate)) {
                this.profileAdmissionDate.value = admissionDate.toISOString().split('T')[0];
            }
        } else if (this.profileAdmissionDate) {
            this.profileAdmissionDate.value = '';
        }
        
        // Admission Year
        if (this.profileAdmissionYear) {
            if (this.userProfile.admission_year) {
                this.profileAdmissionYear.value = this.userProfile.admission_year;
            } else if (this.userProfile.admission_date) {
                const year = new Date(this.userProfile.admission_date).getFullYear();
                this.profileAdmissionYear.value = year;
            } else {
                this.profileAdmissionYear.value = '';
            }
        }
    }
    
    // Block Progress Display
    updateBlockProgress() {
        if (!this.userProfile) return;
        
        const currentBlock = this.userProfile.block || this.userProfile.current_block || 'Introductory';
        const blockOrder = {
            'Introductory': 1,
            'Block 1': 2,
            'Block 2': 3,
            'Block 3': 4,
            'Block 4': 5,
            'Block 5': 6,
            'Final': 7
        };
        
        const totalBlocks = 7;
        const currentBlockNumber = blockOrder[currentBlock] || 1;
        const completedBlocksCount = currentBlockNumber - 1;
        const progressPercent = (completedBlocksCount / totalBlocks) * 100;
        
        // Update progress bar
        if (this.blockProgressFill) {
            this.blockProgressFill.style.width = `${progressPercent}%`;
        }
        
        if (this.blockProgressText) {
            this.blockProgressText.textContent = `${Math.round(progressPercent)}% Complete`;
        }
        
        if (this.currentBlockStatus) {
            this.currentBlockStatus.textContent = `Current: ${currentBlock}`;
        }
        
        // Update block timeline
        this.updateBlockTimeline(currentBlock);
        
        // Update completed blocks badges
        this.updateCompletedBlocks(completedBlocksCount);
    }
    
    updateBlockTimeline(currentBlock) {
        if (!this.blockTimeline) return;
        
        const blocks = ['Introductory', 'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Final'];
        const currentIndex = blocks.indexOf(currentBlock);
        
        const blockSteps = this.blockTimeline.querySelectorAll('.block-step');
        const connectors = this.blockTimeline.querySelectorAll('.block-connector');
        
        blockSteps.forEach((step, index) => {
            step.classList.remove('completed', 'current', 'upcoming');
            
            if (index < currentIndex) {
                step.classList.add('completed');
            } else if (index === currentIndex) {
                step.classList.add('current');
            } else {
                step.classList.add('upcoming');
            }
        });
        
        connectors.forEach((connector, index) => {
            if (index < currentIndex) {
                connector.classList.add('completed');
            } else {
                connector.classList.remove('completed');
            }
        });
    }
    
    updateCompletedBlocks(completedCount) {
        if (!this.completedBlocksContainer) return;
        
        const blocks = ['Introductory', 'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5'];
        const completedBlocksList = blocks.slice(0, completedCount);
        
        if (completedBlocksList.length === 0) {
            this.completedBlocksContainer.innerHTML = '<span class="completed-badge">None yet</span>';
            return;
        }
        
        let html = '';
        completedBlocksList.forEach(block => {
            html += `<span class="completed-badge">✓ ${block}</span>`;
        });
        
        this.completedBlocksContainer.innerHTML = html;
    }
    
    async loadProfilePhoto() {
        if (!this.userProfile) return;
        
        const photoUrl = this.userProfile.passport_url;
        let finalPhotoSrc = 'https://dummyimage.com/160x160/cccccc/000000.png&text=Photo';
        
        if (photoUrl) {
            try {
                if (photoUrl.startsWith('http')) {
                    finalPhotoSrc = photoUrl;
                } else {
                    const supabaseUrl = window.APP_CONFIG?.SUPABASE_URL || 'https://lwhtjozfsmbyihenfunw.supabase.co';
                    finalPhotoSrc = `${supabaseUrl}/storage/v1/object/public/passports/${photoUrl}?t=${new Date().getTime()}`;
                }
                
                await new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = resolve;
                    img.onerror = reject;
                    img.src = finalPhotoSrc;
                });
                
            } catch (error) {
                console.warn('Photo load error:', error);
                finalPhotoSrc = 'https://dummyimage.com/160x160/cccccc/000000.png&text=No+Photo';
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
        if (this.editProfileButton) this.editProfileButton.style.display = 'inline-flex';
        if (this.saveProfileButton) this.saveProfileButton.style.display = 'none';
        if (this.cancelEditButton) this.cancelEditButton.style.display = 'none';
        if (this.choosePhotoButton) this.choosePhotoButton.style.display = 'inline-flex';
        if (this.savePhotoButton) this.savePhotoButton.style.display = 'none';
        if (this.cancelPhotoButton) this.cancelPhotoButton.style.display = 'none';
        
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
        if (this.saveProfileButton) this.saveProfileButton.style.display = 'inline-flex';
        if (this.cancelEditButton) this.cancelEditButton.style.display = 'inline-flex';
        if (this.choosePhotoButton) this.choosePhotoButton.style.display = 'inline-flex';
        if (this.savePhotoButton) this.savePhotoButton.style.display = 'none';
        if (this.cancelPhotoButton) this.cancelPhotoButton.style.display = 'none';
        
        // Add editing class
        if (this.profileForm) {
            this.profileForm.classList.add('editing');
        }
        
        // Make fields editable (only specific fields)
        this.setFieldsReadonly(false);
        
        this.showStatus('Edit mode enabled. Make your changes and click Save.', 'info');
        
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
    // Fields that can be edited (removed profileDob from this list)
    const editableFields = [this.profileName, this.profilePhone, this.profileGender];
    
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
    
    // Date of Birth - handle separately so calendar works when editable
    if (this.profileDob) {
        if (!readonly) {
            // In edit mode: remove readonly, enable the date picker
            this.profileDob.removeAttribute('readonly');
            this.profileDob.disabled = false;
            this.profileDob.classList.add('editable');
            // Force the date picker to be interactive
            this.profileDob.style.backgroundColor = '#fffbeb';
            this.profileDob.style.cursor = 'pointer';
        } else {
            // In view mode: make it readonly
            this.profileDob.setAttribute('readonly', 'readonly');
            this.profileDob.disabled = false; // Keep enabled but readonly
            this.profileDob.classList.remove('editable');
            this.profileDob.style.backgroundColor = '#f8fafc';
        }
    }
    
    // Fields that are always readonly
    const readonlyFields = [
        this.profileStudentId,
        this.profileEmail,
        this.profileProgram,
        this.profileBlock,
        this.profileIntakeYear,
        this.profileAdmissionDate,
        this.profileAdmissionYear
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
    
    // Handle date of birth properly
    if (updates.date_of_birth === '' || updates.date_of_birth === null || updates.date_of_birth === undefined) {
        updates.date_of_birth = null;
    } else if (updates.date_of_birth) {
        const testDate = new Date(updates.date_of_birth);
        if (isNaN(testDate.getTime())) {
            throw new Error('Invalid date format for date of birth');
        }
        updates.date_of_birth = testDate.toISOString().split('T')[0];
    }
    
    // Clean up other fields
    if (updates.phone === '') updates.phone = null;
    if (updates.gender === '') updates.gender = null;
    
    // CRITICAL FIX: Include the email field (required by database)
    // Get email from the userProfile or from the email input field
    const emailValue = this.userProfile?.email || (this.profileEmail ? this.profileEmail.value : null);
    
    if (!emailValue) {
        throw new Error('Email is required but not available');
    }
    
    // Build the complete object with ALL required fields
    const upsertData = {
        user_id: this.userId,
        email: emailValue,  // REQUIRED - database has NOT NULL constraint
        full_name: updates.full_name || this.userProfile?.full_name || '',
        phone: updates.phone,
        date_of_birth: updates.date_of_birth,
        gender: updates.gender,
        updated_at: new Date().toISOString()
    };
    
    // Also preserve other existing profile data if not being updated
    if (this.userProfile) {
        if (!upsertData.full_name && this.userProfile.full_name) upsertData.full_name = this.userProfile.full_name;
        if (this.userProfile.student_id) upsertData.student_id = this.userProfile.student_id;
        if (this.userProfile.program) upsertData.program = this.userProfile.program;
        if (this.userProfile.block) upsertData.block = this.userProfile.block;
        if (this.userProfile.intake_year) upsertData.intake_year = this.userProfile.intake_year;
    }
    
    console.log('Upserting profile data:', { user_id: upsertData.user_id, email: upsertData.email });
    
    const { error } = await supabase
        .from('consolidated_user_profiles_table')
        .upsert(upsertData, { onConflict: 'user_id' });
    
    if (error) throw error;
}
    
    async savePhotoOnly() {
        if (!this.pendingPhotoFile) {
            this.showStatus('No photo selected', 'error');
            return;
        }
        
        this.showStatus('Uploading photo...', 'info');
        
        try {
            await this.uploadPassportPhoto();
        } catch (error) {
            this.showStatus(`Upload failed: ${error.message}`, 'error');
        }
    }
    
    cancelPhotoUpload() {
        this.pendingPhotoFile = null;
        
        if (this.passportFileInput) {
            this.passportFileInput.value = '';
        }
        
        this.loadProfilePhoto();
        
        if (this.savePhotoButton) this.savePhotoButton.style.display = 'none';
        if (this.cancelPhotoButton) this.cancelPhotoButton.style.display = 'none';
        
        this.showStatus('Photo upload cancelled', 'info');
    }
    
    onSaveSuccess() {
        if (this.photoObjectURL) {
            URL.revokeObjectURL(this.photoObjectURL);
            this.photoObjectURL = null;
        }
        
        this.pendingPhotoFile = null;
        
        if (this.passportFileInput) {
            this.passportFileInput.value = '';
        }
        
        if (this.savePhotoButton) this.savePhotoButton.style.display = 'none';
        if (this.cancelPhotoButton) this.cancelPhotoButton.style.display = 'none';
        
        // Reload profile to get updated data
        this.loadProfile();
        
        this.showStatus('Profile updated successfully!', 'success');
        
        this.updateUIState('view');
    }
    
    onSaveError(error) {
        console.error('Save error:', error);
        this.showStatus(`Error: ${error.message}`, 'error');
        
        if (this.saveProfileButton) {
            this.saveProfileButton.disabled = false;
            this.saveProfileButton.innerHTML = '<span class="button-icon">💾</span> Save Changes';
        }
    }
    
   validateForm() {
    let isValid = true;
    
    this.clearAllErrors();
    
    if (this.profileName && !this.profileName.value.trim()) {
        this.showFieldError(this.profileName, 'Name is required');
        isValid = false;
    }
    
    if (this.profilePhone && this.profilePhone.value.trim()) {
        const phoneRegex = /^[\d\s\-\+\(\)]{10,20}$/;
        if (!phoneRegex.test(this.profilePhone.value.trim())) {
            this.showFieldError(this.profilePhone, 'Please enter a valid phone number');
            isValid = false;
        }
    }
    
    // IMPROVED DATE VALIDATION
    if (this.profileDob && this.profileDob.value) {
        const dobValue = this.profileDob.value;
        const dobDate = new Date(dobValue);
        
        // Check if date is valid
        if (isNaN(dobDate.getTime())) {
            this.showFieldError(this.profileDob, 'Please enter a valid date');
            isValid = false;
        } else {
            // Check age range
            const today = new Date();
            let age = today.getFullYear() - dobDate.getFullYear();
            const m = today.getMonth() - dobDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
                age--;
            }
            
            if (age < 16) {
                this.showFieldError(this.profileDob, 'You must be at least 16 years old');
                isValid = false;
            } else if (age > 100) {
                this.showFieldError(this.profileDob, 'Please enter a valid date of birth');
                isValid = false;
            }
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
        errorElement.style.color = '#dc2626';
        errorElement.style.fontSize = '0.75rem';
        errorElement.style.marginTop = '0.25rem';
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
        
        this.pendingPhotoFile = file;
        
        if (this.photoObjectURL) {
            URL.revokeObjectURL(this.photoObjectURL);
        }
        
        this.photoObjectURL = URL.createObjectURL(file);
        
        if (this.passportPreview) {
            this.passportPreview.src = this.photoObjectURL;
        }
        
        if (this.savePhotoButton) this.savePhotoButton.style.display = 'inline-flex';
        if (this.cancelPhotoButton) this.cancelPhotoButton.style.display = 'inline-flex';
        
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
        const file = this.pendingPhotoFile;
        if (!file) {
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
            
            const { error: uploadError } = await supabase.storage
                .from('passports')
                .upload(filePath, file, { 
                    cacheControl: '3600', 
                    upsert: true,
                    contentType: file.type
                });
            
            if (uploadError) throw uploadError;
            
            const { data: urlData } = supabase.storage
                .from('passports')
                .getPublicUrl(filePath);
            
            const publicUrl = urlData.publicUrl;
            
            const { error: updateError } = await supabase
                .from('consolidated_user_profiles_table')
                .upsert({ 
                    user_id: this.userId,
                    passport_url: publicUrl,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });
            
            if (updateError) throw updateError;
            
            this.showStatus('Photo uploaded successfully!', 'success');
            
            this.pendingPhotoFile = null;
            
            if (this.savePhotoButton) this.savePhotoButton.style.display = 'none';
            if (this.cancelPhotoButton) this.cancelPhotoButton.style.display = 'none';
            
            await this.loadProfile();
            
            setTimeout(() => {
                if (this.profileStatus && this.profileStatus.textContent === 'Photo uploaded successfully!') {
                    this.clearStatus();
                }
            }, 3000);
            
        } catch (error) {
            console.error('Upload error:', error);
            this.showStatus(`Upload failed: ${error.message}`, 'error');
            throw error;
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

// Initialize when DOM is ready or when profile tab is clicked
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
    
    // If profile is visible initially
    if (document.getElementById('profile') && document.getElementById('profile').style.display !== 'none') {
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

console.log('Profile module loaded with two-column layout (photo right, details left)');
