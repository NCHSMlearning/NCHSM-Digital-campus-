class ProfileModule {
    constructor() {
        this.userId = null;
        this.userProfile = null;
        this.isEditing = false;
        this.photoObjectURL = null;
        this.pendingPhotoFile = null;
        this.pendingDocuments = {}; // Track pending document uploads
        
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
        
        // ==================== FORM FIELDS (LEFT COLUMN) ====================
        
        // Personal Information
        this.profileName = document.getElementById('profile-name');
        this.profileStudentId = document.getElementById('profile-student-id');
        this.profileEmail = document.getElementById('profile-email');
        this.profilePhone = document.getElementById('profile-phone');
        this.profileAltPhone = document.getElementById('profile-alt-phone');
        this.profileDob = document.getElementById('profile-dob');
        this.profileGender = document.getElementById('profile-gender');
        this.profileNationalId = document.getElementById('profile-national-id');
        this.profileAddress = document.getElementById('profile-address');
        
        // Guardian Information
        this.profileGuardianName = document.getElementById('profile-guardian-name');
        this.profileGuardianPhone = document.getElementById('profile-guardian-phone');
        
        // Academic Information
        this.profileProgram = document.getElementById('profile-program');
        this.profileBlock = document.getElementById('profile-block');
        this.profileIntakeYear = document.getElementById('profile-intake-year');
        this.profileIntakeMonth = document.getElementById('profile-intake-month'); // NEW
        this.profileAdmissionDate = document.getElementById('profile-admission-date');
        this.profileAdmissionYear = document.getElementById('profile-admission-year');
        this.profileRole = document.getElementById('profile-role'); // NEW
        
        // Document Status
        this.profileDocKcse = document.getElementById('profile-doc-kcse'); // NEW
        this.profileDocId = document.getElementById('profile-doc-id'); // NEW
        
        // Block Progress elements
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
        
        // Action buttons
        this.editProfileButton = document.getElementById('edit-profile-button');
        this.saveProfileButton = document.getElementById('save-profile-button');
        this.cancelEditButton = document.getElementById('cancel-edit-button');
        
        // ==================== DOCUMENT UPLOAD ELEMENTS ====================
        this.docKcseInput = document.getElementById('doc-kcse-input');
        this.docIdInput = document.getElementById('doc-id-input');
        this.docKcseFilename = document.getElementById('doc-kcse-filename');
        this.docIdFilename = document.getElementById('doc-id-filename');
        this.docKcseBadge = document.getElementById('doc-kcse-badge');
        this.docIdBadge = document.getElementById('doc-id-badge');
        
        this.setupEventListeners();
        this.setupPasswordResetListeners();
        this.setupDocumentListeners();
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
    
    // ============================================
    // DOCUMENT UPLOAD LISTENERS
    // ============================================
    setupDocumentListeners() {
        // KCSE Certificate upload
        if (this.docKcseInput) {
            this.docKcseInput.addEventListener('change', (e) => this.handleDocumentUpload(e, 'kcse'));
        }
        
        // ID/Passport upload
        if (this.docIdInput) {
            this.docIdInput.addEventListener('change', (e) => this.handleDocumentUpload(e, 'id'));
        }
    }
    
    // ============================================
    // DOCUMENT UPLOAD HANDLERS
    // ============================================
    async handleDocumentUpload(event, docType) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Validate file
        const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (!validTypes.includes(file.type)) {
            this.showStatus('Invalid file type. Please upload PDF, JPG, or PNG.', 'error');
            event.target.value = '';
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            this.showStatus('File too large. Maximum size is 5 MB.', 'error');
            event.target.value = '';
            return;
        }
        
        // Update UI
        const filenameEl = document.getElementById(`doc-${docType}-filename`);
        const badgeEl = document.getElementById(`doc-${docType}-badge`);
        
        if (filenameEl) filenameEl.textContent = file.name;
        if (badgeEl) {
            badgeEl.textContent = 'Uploading...';
            badgeEl.style.background = '#f59e0b';
            badgeEl.style.color = '#78350f';
        }
        
        try {
            const supabase = this.getSupabaseClient();
            if (!supabase) throw new Error('Database connection not available');
            
            // Upload to storage
            const fileExt = file.name.split('.').pop();
            const filePath = `documents/${this.userId}/${docType}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
                .from('user-documents')
                .upload(filePath, file, { 
                    cacheControl: '3600', 
                    upsert: true,
                    contentType: file.type
                });
            
            if (uploadError) throw uploadError;
            
            // Update profile status
            const docField = docType === 'kcse' ? 'doc_kcse' : 'doc_id';
            const { error: updateError } = await supabase
                .from('consolidated_user_profiles_table')
                .update({ 
                    [docField]: 'uploaded',
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', this.userId);
            
            if (updateError) throw updateError;
            
            // Update UI
            if (badgeEl) {
                badgeEl.textContent = '✅ Uploaded';
                badgeEl.style.background = '#10b981';
                badgeEl.style.color = 'white';
            }
            
            // Update profile display field
            const displayField = docType === 'kcse' ? this.profileDocKcse : this.profileDocId;
            if (displayField) displayField.value = 'Uploaded';
            
            this.showStatus(`✅ ${docType.toUpperCase()} document uploaded successfully!`, 'success');
            
            // Update user profile
            if (this.userProfile) {
                this.userProfile[docField] = 'uploaded';
            }
            
            // Log audit
            await this.logAudit('DOCUMENT_UPLOAD', `Uploaded ${docType} document`, this.userId, 'SUCCESS');
            
        } catch (error) {
            console.error('Upload error:', error);
            if (badgeEl) {
                badgeEl.textContent = '❌ Failed';
                badgeEl.style.background = '#dc2626';
                badgeEl.style.color = 'white';
            }
            this.showStatus(`Upload failed: ${error.message}`, 'error');
            await this.logAudit('DOCUMENT_UPLOAD', `Failed to upload ${docType}: ${error.message}`, this.userId, 'FAILURE');
        }
    }
    
    // ============================================
    // PASSWORD RESET LISTENERS
    // ============================================
    setupPasswordResetListeners() {
        if (!this.newPassword) return;
        
        this.newPassword.addEventListener('input', () => {
            this.checkPasswordStrength(this.newPassword.value);
            this.validatePasswordRequirements(this.newPassword.value);
        });
        
        if (this.confirmPassword) {
            this.confirmPassword.addEventListener('input', () => {
                this.validateConfirmPassword();
            });
        }
        
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
        
        if (this.changePasswordBtn) {
            this.changePasswordBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.changeUserPassword();
            });
        }
    }
    
    // ============================================
    // PASSWORD STRENGTH FUNCTIONS
    // ============================================
    checkPasswordStrength(password) {
        if (!this.passwordStrengthBar || !this.passwordStrengthText) return;
        
        let strength = 0;
        
        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
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
        
        if (!this.validatePasswordRequirements(newPassword)) {
            this.showPasswordFeedback('❌ Password does not meet requirements!', 'error');
            if (this.passwordRequirements) this.passwordRequirements.classList.add('show');
            return;
        }
        
        if (this.changePasswordBtn) {
            this.changePasswordBtn.disabled = true;
            this.changePasswordBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Changing Password...';
        }
        
        try {
            const supabase = this.getSupabaseClient();
            if (!supabase) throw new Error('Database connection not available');
            
            const email = this.userProfile?.email;
            if (!email) throw new Error('User email not found');
            
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: email,
                password: currentPassword
            });
            
            if (signInError) {
                this.showPasswordFeedback('❌ Current password is incorrect!', 'error');
                return;
            }
            
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword
            });
            
            if (updateError) throw updateError;
            
            this.showPasswordFeedback('✅ Password changed successfully!', 'success');
            
            if (this.currentPassword) this.currentPassword.value = '';
            if (this.newPassword) this.newPassword.value = '';
            if (this.confirmPassword) this.confirmPassword.value = '';
            
            if (this.passwordStrengthBar) {
                this.passwordStrengthBar.className = 'strength-bar';
                this.passwordStrengthBar.style.width = '0%';
            }
            if (this.passwordStrengthText) this.passwordStrengthText.textContent = 'Not set';
            if (this.passwordRequirements) this.passwordRequirements.classList.remove('show');
            
            await this.logAudit('PASSWORD_CHANGE', 'User changed their password', null, 'SUCCESS');
            
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
            
            this.populateProfileForm();
            await this.loadProfilePhoto();
            this.updateDocumentStatus();
            this.updateBlockProgress();
            this.updateUIState('view');
            
        } catch (error) {
            console.error('Load profile error:', error);
            this.showStatus(`Error: ${error.message}`, 'error');
        }
    }
    
    populateProfileForm() {
        if (!this.userProfile) return;
        
        // Personal Information
        if (this.profileName) this.profileName.value = this.userProfile.full_name || '';
        if (this.profileStudentId) this.profileStudentId.value = this.userProfile.student_id || this.userProfile.reg_no || '';
        if (this.profileEmail) this.profileEmail.value = this.userProfile.email || '';
        if (this.profilePhone) this.profilePhone.value = this.userProfile.phone || this.userProfile.phone_number || '';
        if (this.profileAltPhone) this.profileAltPhone.value = this.userProfile.alt_phone || '';
        
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
        
        // National ID
        if (this.profileNationalId) this.profileNationalId.value = this.userProfile.national_id || '';
        
        // Address
        if (this.profileAddress) this.profileAddress.value = this.userProfile.address || '';
        
        // Guardian Information
        if (this.profileGuardianName) this.profileGuardianName.value = this.userProfile.guardian_name || '';
        if (this.profileGuardianPhone) this.profileGuardianPhone.value = this.userProfile.guardian_phone || '';
        
        // Academic Information
        if (this.profileRole) this.profileRole.value = this.userProfile.role || 'student';
        if (this.profileProgram) this.profileProgram.value = this.userProfile.program || this.userProfile.department || '';
        if (this.profileBlock) {
            const isTVET = this.isTVETStudent();
            const blockOrTerm = isTVET ? this.userProfile.term || this.userProfile.block : this.userProfile.block || this.userProfile.current_block;
            this.profileBlock.value = blockOrTerm || 'Introductory';
        }
        if (this.profileIntakeYear) this.profileIntakeYear.value = this.userProfile.intake_year || this.userProfile.year_of_intake || '';
        if (this.profileIntakeMonth) this.profileIntakeMonth.value = this.userProfile.intake_month || '';
        
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
        
        // Document Status
        if (this.profileDocKcse) {
            const status = this.userProfile.doc_kcse || 'pending';
            this.profileDocKcse.value = this.getDocumentStatusText(status);
        }
        if (this.profileDocId) {
            const status = this.userProfile.doc_id || 'pending';
            this.profileDocId.value = this.getDocumentStatusText(status);
        }
    }
    
    isTVETStudent() {
        const tvetPrograms = [
            'DPOTT', 'DCH', 'DHRIT', 'DSL', 'DSW', 'DCJS', 'DHSS', 'DICT', 'DME',
            'CPOTT', 'CCH', 'CHRIT', 'CPC', 'CSL', 'CSW', 'CCJS', 'CAG', 'CHSS', 'CICT',
            'ACH', 'AAG', 'ASW', 'CCA', 'PTE'
        ];
        const program = this.userProfile?.program || '';
        return tvetPrograms.includes(program) || program === 'TVET';
    }
    
    getDocumentStatusText(status) {
        const statusMap = {
            'pending': '⏳ Pending',
            'uploaded': '✅ Uploaded',
            'verified': '✅ Verified',
            'rejected': '❌ Rejected'
        };
        return statusMap[status] || '⏳ Pending';
    }
    
    updateDocumentStatus() {
        if (!this.userProfile) return;
        
        // Update badges
        const docKcseBadge = document.getElementById('doc-kcse-badge');
        const docIdBadge = document.getElementById('doc-id-badge');
        
        if (docKcseBadge) {
            const status = this.userProfile.doc_kcse || 'pending';
            docKcseBadge.textContent = this.getDocumentStatusText(status);
            docKcseBadge.style.background = this.getStatusColor(status);
            docKcseBadge.style.color = 'white';
        }
        
        if (docIdBadge) {
            const status = this.userProfile.doc_id || 'pending';
            docIdBadge.textContent = this.getDocumentStatusText(status);
            docIdBadge.style.background = this.getStatusColor(status);
            docIdBadge.style.color = 'white';
        }
        
        // Update filename displays
        if (this.docKcseFilename && this.userProfile.doc_kcse === 'uploaded') {
            this.docKcseFilename.textContent = '✅ Document uploaded';
        }
        if (this.docIdFilename && this.userProfile.doc_id === 'uploaded') {
            this.docIdFilename.textContent = '✅ Document uploaded';
        }
    }
    
    getStatusColor(status) {
        const colors = {
            'pending': '#f59e0b',
            'uploaded': '#10b981',
            'verified': '#059669',
            'rejected': '#dc2626'
        };
        return colors[status] || '#6b7280';
    }
    
    updateBlockProgress() {
        if (!this.userProfile) return;
        
        const isTVET = this.isTVETStudent();
        const currentBlock = this.userProfile.block || this.userProfile.current_block || (isTVET ? 'Term 1' : 'Introductory');
        
        let blockOrder;
        if (isTVET) {
            blockOrder = {
                'Term 1': 1,
                'Term 2': 2,
                'Term 3': 3,
                'Term 4': 4,
                'Term 5': 5,
                'Term 6': 6,
                'Final': 7,
                'Introductory': 1
            };
        } else {
            blockOrder = {
                'Introductory': 1,
                'Block 1': 2,
                'Block 2': 3,
                'Block 3': 4,
                'Block 4': 5,
                'Block 5': 6,
                'Final': 7
            };
        }
        
        const totalBlocks = 7;
        const currentBlockNumber = blockOrder[currentBlock] || 1;
        const completedBlocksCount = currentBlockNumber - 1;
        const progressPercent = (completedBlocksCount / totalBlocks) * 100;
        
        if (this.blockProgressFill) {
            this.blockProgressFill.style.width = `${progressPercent}%`;
        }
        
        if (this.blockProgressText) {
            this.blockProgressText.textContent = `${Math.round(progressPercent)}% Complete`;
        }
        
        if (this.currentBlockStatus) {
            const label = isTVET ? 'Term' : 'Block';
            this.currentBlockStatus.textContent = `Current: ${currentBlock}`;
        }
        
        this.updateBlockTimeline(currentBlock, isTVET);
        this.updateCompletedBlocks(completedBlocksCount, isTVET);
    }
    
    updateBlockTimeline(currentBlock, isTVET) {
        if (!this.blockTimeline) return;
        
        let blocks;
        if (isTVET) {
            blocks = ['Introductory', 'Term 1', 'Term 2', 'Term 3', 'Term 4', 'Term 5', 'Final'];
        } else {
            blocks = ['Introductory', 'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Final'];
        }
        
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
    
    updateCompletedBlocks(completedCount, isTVET) {
        if (!this.completedBlocksContainer) return;
        
        let blocks;
        if (isTVET) {
            blocks = ['Introductory', 'Term 1', 'Term 2', 'Term 3', 'Term 4', 'Term 5'];
        } else {
            blocks = ['Introductory', 'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5'];
        }
        
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
        
        if (this.editProfileButton) this.editProfileButton.style.display = 'inline-flex';
        if (this.saveProfileButton) this.saveProfileButton.style.display = 'none';
        if (this.cancelEditButton) this.cancelEditButton.style.display = 'none';
        if (this.choosePhotoButton) this.choosePhotoButton.style.display = 'inline-flex';
        if (this.savePhotoButton) this.savePhotoButton.style.display = 'none';
        if (this.cancelPhotoButton) this.cancelPhotoButton.style.display = 'none';
        
        if (this.profileForm) this.profileForm.classList.remove('editing');
        this.setFieldsReadonly(true);
        
        if (this.pendingPhotoFile) {
            this.pendingPhotoFile = null;
            this.loadProfilePhoto();
        }
        
        if (this.passportFileInput) this.passportFileInput.value = '';
        this.clearStatus();
    }
    
    updateEditMode() {
        this.isEditing = true;
        
        if (this.editProfileButton) this.editProfileButton.style.display = 'none';
        if (this.saveProfileButton) this.saveProfileButton.style.display = 'inline-flex';
        if (this.cancelEditButton) this.cancelEditButton.style.display = 'inline-flex';
        if (this.choosePhotoButton) this.choosePhotoButton.style.display = 'inline-flex';
        if (this.savePhotoButton) this.savePhotoButton.style.display = 'none';
        if (this.cancelPhotoButton) this.cancelPhotoButton.style.display = 'none';
        
        if (this.profileForm) this.profileForm.classList.add('editing');
        this.setFieldsReadonly(false);
        
        this.showStatus('Edit mode enabled. Make your changes and click Save.', 'info');
        
        setTimeout(() => {
            if (this.profileName) this.profileName.focus();
        }, 100);
    }
    
    updateSavingMode() {
        if (this.saveProfileButton) {
            this.saveProfileButton.disabled = true;
            this.saveProfileButton.innerHTML = '<span class="button-icon">⏳</span> Saving...';
        }
    }
    
    setFieldsReadonly(readonly) {
        // Editable fields
        const editableFields = [
            this.profileName, 
            this.profilePhone, 
            this.profileAltPhone,
            this.profileGender,
            this.profileDob,
            this.profileAddress,
            this.profileGuardianName,
            this.profileGuardianPhone
        ];
        
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
        
        // Date of Birth special handling
        if (this.profileDob) {
            if (!readonly) {
                this.profileDob.removeAttribute('readonly');
                this.profileDob.disabled = false;
                this.profileDob.classList.add('editable');
                this.profileDob.style.backgroundColor = '#fffbeb';
                this.profileDob.style.cursor = 'pointer';
            } else {
                this.profileDob.setAttribute('readonly', 'readonly');
                this.profileDob.disabled = false;
                this.profileDob.classList.remove('editable');
                this.profileDob.style.backgroundColor = '#f8fafc';
            }
        }
        
        // Readonly fields
        const readonlyFields = [
            this.profileStudentId,
            this.profileEmail,
            this.profileProgram,
            this.profileBlock,
            this.profileIntakeYear,
            this.profileIntakeMonth,
            this.profileAdmissionDate,
            this.profileAdmissionYear,
            this.profileNationalId,
            this.profileRole,
            this.profileDocKcse,
            this.profileDocId
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
        this.populateProfileForm();
        
        if (this.pendingPhotoFile) {
            this.pendingPhotoFile = null;
            this.loadProfilePhoto();
        }
        
        if (this.passportFileInput) this.passportFileInput.value = '';
        if (this.savePhotoButton) this.savePhotoButton.style.display = 'none';
        if (this.cancelPhotoButton) this.cancelPhotoButton.style.display = 'none';
        
        this.updateUIState('view');
    }
    
    async saveProfile() {
        if (!this.userId) return;
        
        if (!this.validateForm()) return;
        
        this.updateUIState('saving');
        
        try {
            const updates = {
                full_name: this.profileName ? this.profileName.value.trim() : '',
                phone: this.profilePhone ? this.profilePhone.value.trim() : '',
                alt_phone: this.profileAltPhone ? this.profileAltPhone.value.trim() : '',
                date_of_birth: this.profileDob ? this.profileDob.value : null,
                gender: this.profileGender ? this.profileGender.value : null,
                address: this.profileAddress ? this.profileAddress.value.trim() : '',
                guardian_name: this.profileGuardianName ? this.profileGuardianName.value.trim() : '',
                guardian_phone: this.profileGuardianPhone ? this.profileGuardianPhone.value.trim() : '',
                updated_at: new Date().toISOString()
            };
            
            await this.saveProfileData(updates);
            
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
        if (!supabase) throw new Error('No database connection');
        
        const { data: existingProfile, error: fetchError } = await supabase
            .from('consolidated_user_profiles_table')
            .select('*')
            .eq('user_id', this.userId)
            .maybeSingle();
        
        if (fetchError && fetchError.code !== 'PGRST116') {
            console.warn('Error fetching existing profile:', fetchError);
        }
        
        let dobValue = updates.date_of_birth;
        if (dobValue === '' || dobValue === null || dobValue === undefined) {
            dobValue = existingProfile?.date_of_birth || null;
        } else if (dobValue) {
            const testDate = new Date(dobValue);
            if (!isNaN(testDate.getTime())) {
                dobValue = testDate.toISOString().split('T')[0];
            }
        }
        
        const emailValue = updates.email || existingProfile?.email || this.userProfile?.email || (this.profileEmail?.value);
        const fullNameValue = updates.full_name || existingProfile?.full_name || this.userProfile?.full_name || '';
        const roleValue = existingProfile?.role || 'student';
        const statusValue = existingProfile?.status || 'active';
        
        let idValue = existingProfile?.id;
        if (!idValue) idValue = this.userId;
        
        if (!emailValue) throw new Error('Email is required but not available');
        if (!fullNameValue) throw new Error('Full name is required');
        
        const upsertData = {
            user_id: this.userId,
            id: idValue,
            email: emailValue,
            full_name: fullNameValue,
            role: roleValue,
            status: statusValue,
            phone: updates.phone !== undefined ? updates.phone : (existingProfile?.phone || null),
            alt_phone: updates.alt_phone !== undefined ? updates.alt_phone : (existingProfile?.alt_phone || null),
            date_of_birth: dobValue,
            gender: updates.gender !== undefined ? updates.gender : (existingProfile?.gender || null),
            address: updates.address !== undefined ? updates.address : (existingProfile?.address || null),
            guardian_name: updates.guardian_name !== undefined ? updates.guardian_name : (existingProfile?.guardian_name || null),
            guardian_phone: updates.guardian_phone !== undefined ? updates.guardian_phone : (existingProfile?.guardian_phone || null),
            updated_at: new Date().toISOString(),
            student_id: existingProfile?.student_id || this.userProfile?.student_id || null,
            program: existingProfile?.program || this.userProfile?.program || null,
            block: existingProfile?.block || this.userProfile?.block || null,
            current_block: existingProfile?.current_block || this.userProfile?.current_block || null,
            intake_year: existingProfile?.intake_year || this.userProfile?.intake_year || null,
            intake_month: existingProfile?.intake_month || this.userProfile?.intake_month || null,
            admission_date: existingProfile?.admission_date || this.userProfile?.admission_date || null,
            admission_year: existingProfile?.admission_year || this.userProfile?.admission_year || null,
            passport_url: existingProfile?.passport_url || this.userProfile?.passport_url || null,
            national_id: existingProfile?.national_id || this.userProfile?.national_id || null,
            department: existingProfile?.department || this.userProfile?.department || null,
            block_program_year: existingProfile?.block_program_year || null,
            student_uuid: existingProfile?.student_uuid || this.userId,
            two_factor_enabled: existingProfile?.two_factor_enabled || false,
            block_progress: existingProfile?.block_progress || null,
            role_id: existingProfile?.role_id || null,
            last_login: existingProfile?.last_login || null,
            created_at: existingProfile?.created_at || new Date().toISOString(),
            doc_kcse: existingProfile?.doc_kcse || 'pending',
            doc_id: existingProfile?.doc_id || 'pending'
        };
        
        Object.keys(upsertData).forEach(key => {
            if (upsertData[key] === undefined) delete upsertData[key];
        });
        
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
        if (this.passportFileInput) this.passportFileInput.value = '';
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
        if (this.passportFileInput) this.passportFileInput.value = '';
        if (this.savePhotoButton) this.savePhotoButton.style.display = 'none';
        if (this.cancelPhotoButton) this.cancelPhotoButton.style.display = 'none';
        
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
        
        if (this.profileDob && this.profileDob.value) {
            const dobValue = this.profileDob.value;
            const dobDate = new Date(dobValue);
            
            if (isNaN(dobDate.getTime())) {
                this.showFieldError(this.profileDob, 'Please enter a valid date');
                isValid = false;
            } else {
                const today = new Date();
                let age = today.getFullYear() - dobDate.getFullYear();
                const m = today.getMonth() - dobDate.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) age--;
                
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
        
        if (this.photoObjectURL) URL.revokeObjectURL(this.photoObjectURL);
        this.photoObjectURL = URL.createObjectURL(file);
        if (this.passportPreview) this.passportPreview.src = this.photoObjectURL;
        
        if (this.savePhotoButton) this.savePhotoButton.style.display = 'inline-flex';
        if (this.cancelPhotoButton) this.cancelPhotoButton.style.display = 'inline-flex';
        
        const fileSize = (file.size / 1024 / 1024).toFixed(2);
        this.showStatus(`Ready to upload: ${file.name} (${fileSize} MB)`, 'info');
    }
    
    validatePassportFile(file) {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        const maxSize = 2 * 1024 * 1024;
        
        if (!validTypes.includes(file.type)) {
            return { valid: false, message: 'Invalid file type. Please upload JPG, PNG, or WebP image.' };
        }
        
        if (file.size > maxSize) {
            const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
            return { valid: false, message: `File too large (${fileSizeMB} MB). Maximum size is 2 MB.` };
        }
        
        return { valid: true };
    }
    
    async uploadPassportPhoto() {
        const file = this.pendingPhotoFile;
        if (!file) return;
        
        this.showStatus('Uploading photo...', 'info');
        
        try {
            const supabase = this.getSupabaseClient();
            if (!supabase) throw new Error('No database connection');
            
            const fileExt = file.name.split('.').pop();
            const filePath = `${this.userId}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
                .from('passports')
                .upload(filePath, file, { cacheControl: '3600', upsert: true, contentType: file.type });
            
            if (uploadError) throw uploadError;
            
            const { data: urlData } = supabase.storage.from('passports').getPublicUrl(filePath);
            const publicUrl = urlData.publicUrl;
            
            const { error: updateError } = await supabase
                .from('consolidated_user_profiles_table')
                .update({ 
                    passport_url: publicUrl, 
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', this.userId);
            
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
    if (!document.getElementById('profile-form')) return null;
    if (profileModule) return profileModule;
    
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
    
    if (document.getElementById('profile') && document.getElementById('profile').style.display !== 'none') {
        setTimeout(() => initProfileModule(), 1000);
    }
});

window.ProfileModule = ProfileModule;
window.initProfileModule = initProfileModule;
window.loadProfile = () => {
    if (profileModule) return profileModule.loadProfile();
};

console.log('✅ Profile module loaded with ALL fields (Phone, Alt Phone, DOB, Gender, National ID, Address, Guardian Name, Guardian Phone, Intake Month, Document Status, and Document Upload)');
