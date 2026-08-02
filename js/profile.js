class ProfileModule {
    constructor() {
        this.userId = null;
        this.userProfile = null;
        this.isEditing = false;
        this.photoObjectURL = null;
        this.pendingPhotoFile = null;
        this.pendingDocuments = {};
        
        this.initializeElements();
    }
    
    initializeElements() {
        // Get form and containers
        this.profileForm = document.getElementById('profile-form');
        this.profileStatus = document.getElementById('profile-status');
        
        // Profile photo section
        this.passportPreview = document.getElementById('passport-preview');
        this.passportFileInput = document.getElementById('passport-file-input');
        
        // ==================== FORM FIELDS ====================
        
        // Personal Information - ✅ NOW EDITABLE
        this.profileName = document.getElementById('profile-name-input'); // ← Changed to input
        this.profileStudentId = document.getElementById('profile-student-id');
        this.profileEmail = document.getElementById('profile-email');
        this.profilePhone = document.getElementById('profile-phone-input'); // ← Should be input
        this.profileAltPhone = document.getElementById('profile-alt-phone-input'); // ← Should be input
        this.profileDob = document.getElementById('profile-dob-input');
        this.profileGender = document.getElementById('profile-gender-input');
        this.profileNationalId = document.getElementById('profile-national-id-input');
        this.profileAddress = document.getElementById('profile-address-input');
        
        // Guardian Information
        this.profileGuardianName = document.getElementById('profile-guardian-name-input');
        this.profileGuardianPhone = document.getElementById('profile-guardian-phone-input');
        
        // Academic Information - READ ONLY
        this.profileProgram = document.getElementById('profile-program-input');
        this.profileBlock = document.getElementById('profile-block-input');
        this.profileIntakeYear = document.getElementById('profile-intake-year-input');
        this.profileIntakeMonth = document.getElementById('profile-intake-month-input');
        
        // Quick Stats
        this.profileBlockNumber = document.getElementById('profile-block-number');
        this.profileCompletedBlocks = document.getElementById('profile-completed-blocks');
        this.profileProgress = document.getElementById('profile-progress');
        
        // Block Progress elements
        this.blockProgressFill = document.getElementById('block-progress-fill');
        this.blockProgressText = document.getElementById('block-progress-text');
        this.currentBlockStatus = document.getElementById('current-block-status');
        this.completedBlocksContainer = document.getElementById('completed-blocks');
        this.blockTimeline = document.getElementById('block-timeline-profile');
        
        // ==================== DOCUMENT UPLOAD ELEMENTS ====================
        this.docKcseInput = document.getElementById('doc-kcse-input');
        this.docIdInput = document.getElementById('doc-id-input');
        this.docKcseFilename = document.getElementById('doc-kcse-filename');
        this.docIdFilename = document.getElementById('doc-id-filename');
        this.docKcseBadge = document.getElementById('doc-kcse-badge');
        this.docIdBadge = document.getElementById('doc-id-badge');
        
        // ==================== PASSWORD RESET ELEMENTS ====================
        this.currentPassword = document.getElementById('current-password');
        this.newPassword = document.getElementById('new-password');
        this.confirmPassword = document.getElementById('confirm-password');
        this.changePasswordBtn = document.getElementById('change-password-btn');
        this.passwordFeedback = document.getElementById('password-feedback');
        
        // Action buttons
        this.editProfileButton = document.getElementById('edit-profile-button');
        this.saveProfileButton = document.getElementById('save-profile-button');
        this.cancelEditButton = document.getElementById('cancel-edit-button');
        
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
        
        // Passport file input change
        if (this.passportFileInput) {
            this.passportFileInput.addEventListener('change', (e) => this.handlePassportFileSelect(e));
        }
    }
    
    // ============================================
    // DOCUMENT UPLOAD LISTENERS
    // ============================================
    setupDocumentListeners() {
        if (this.docKcseInput) {
            this.docKcseInput.addEventListener('change', (e) => this.handleDocumentUpload(e, 'kcse'));
        }
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
            
            const docField = docType === 'kcse' ? 'doc_kcse' : 'doc_id';
            const { error: updateError } = await supabase
                .from('consolidated_user_profiles_table')
                .update({ 
                    [docField]: 'uploaded',
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', this.userId);
            
            if (updateError) throw updateError;
            
            if (badgeEl) {
                badgeEl.textContent = '✅ Uploaded';
                badgeEl.style.background = '#10b981';
                badgeEl.style.color = 'white';
            }
            
            this.showStatus(`✅ ${docType.toUpperCase()} document uploaded successfully!`, 'success');
            
            if (this.userProfile) {
                this.userProfile[docField] = 'uploaded';
            }
            
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
            this.validatePasswordRequirements(this.newPassword.value);
        });
        
        if (this.confirmPassword) {
            this.confirmPassword.addEventListener('input', () => {
                this.validateConfirmPassword();
            });
        }
        
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
    validatePasswordRequirements(password) {
        const requirements = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[!@#$%^&*]/.test(password)
        };
        return Object.values(requirements).every(v => v === true);
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
        this.passwordFeedback.style.display = 'block';
        this.passwordFeedback.style.background = type === 'success' ? '#d1fae5' : '#fee2e2';
        this.passwordFeedback.style.color = type === 'success' ? '#065f46' : '#991b1b';
        this.passwordFeedback.style.border = `1px solid ${type === 'success' ? '#10b981' : '#dc2626'}`;
    }
    
    clearPasswordFeedback() {
        if (this.passwordFeedback) {
            this.passwordFeedback.style.display = 'none';
            this.passwordFeedback.textContent = '';
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
            this.showPasswordFeedback('❌ Password must be at least 8 characters with uppercase, lowercase, number, and special character!', 'error');
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
                this.changePasswordBtn.innerHTML = '<i class="fas fa-key"></i> Change Password';
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
        
        // ✅ Personal Information - EDITABLE
        if (this.profileName) this.profileName.value = this.userProfile.full_name || '';
        if (this.profileStudentId) this.profileStudentId.textContent = this.userProfile.student_id || this.userProfile.reg_no || '-';
        if (this.profileEmail) this.profileEmail.textContent = this.userProfile.email || '-';
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
        if (this.profileGender) {
            this.profileGender.value = this.userProfile.gender || '';
        }
        
        // National ID
        if (this.profileNationalId) this.profileNationalId.value = this.userProfile.national_id || '';
        
        // Address
        if (this.profileAddress) this.profileAddress.value = this.userProfile.address || '';
        
        // Guardian Information
        if (this.profileGuardianName) this.profileGuardianName.value = this.userProfile.guardian_name || '';
        if (this.profileGuardianPhone) this.profileGuardianPhone.value = this.userProfile.guardian_phone || '';
        
        // Academic Information - READ ONLY
        if (this.profileProgram) this.profileProgram.value = this.userProfile.program || '';
        if (this.profileBlock) {
            const isTVET = this.isTVETStudent();
            const blockOrTerm = isTVET ? this.userProfile.term || this.userProfile.block : this.userProfile.block || this.userProfile.current_block;
            this.profileBlock.value = blockOrTerm || 'Introductory';
        }
        if (this.profileIntakeYear) this.profileIntakeYear.value = this.userProfile.intake_year || this.userProfile.year_of_intake || '';
        if (this.profileIntakeMonth) this.profileIntakeMonth.value = this.userProfile.intake_month || '';
        
        // Update quick stats
        this.updateQuickStats();
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
        
        if (this.docKcseBadge) {
            const status = this.userProfile.doc_kcse || 'pending';
            this.docKcseBadge.textContent = this.getDocumentStatusText(status);
            this.docKcseBadge.style.background = this.getStatusColor(status);
            this.docKcseBadge.style.color = 'white';
        }
        if (this.docIdBadge) {
            const status = this.userProfile.doc_id || 'pending';
            this.docIdBadge.textContent = this.getDocumentStatusText(status);
            this.docIdBadge.style.background = this.getStatusColor(status);
            this.docIdBadge.style.color = 'white';
        }
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
                'Introductory': 1, 'Term 1': 1, 'Term 2': 2, 'Term 3': 3,
                'Term 4': 4, 'Term 5': 5, 'Term 6': 6, 'Final': 7
            };
        } else {
            blockOrder = {
                'Introductory': 1, 'Block 1': 2, 'Block 2': 3, 'Block 3': 4,
                'Block 4': 5, 'Block 5': 6, 'Final': 7
            };
        }
        
        const totalBlocks = 7;
        const currentBlockNumber = blockOrder[currentBlock] || 1;
        const completedBlocksCount = currentBlockNumber - 1;
        const progressPercent = Math.round((completedBlocksCount / totalBlocks) * 100);
        
        if (this.blockProgressFill) {
            this.blockProgressFill.style.width = `${progressPercent}%`;
        }
        if (this.blockProgressText) {
            this.blockProgressText.textContent = `${progressPercent}% Complete`;
        }
        if (this.currentBlockStatus) {
            this.currentBlockStatus.textContent = `Current: ${currentBlock}`;
        }
        
        this.updateQuickStats(currentBlockNumber, completedBlocksCount, progressPercent);
        this.updateBlockTimeline(currentBlock, isTVET);
        this.updateCompletedBlocks(completedBlocksCount, isTVET);
    }
    
    updateQuickStats(currentBlockNumber, completedBlocksCount, progressPercent) {
        if (this.profileBlockNumber) {
            const blockNum = currentBlockNumber || this.getCurrentBlockNumber();
            this.profileBlockNumber.textContent = blockNum;
        }
        if (this.profileCompletedBlocks) {
            const completed = completedBlocksCount !== undefined ? completedBlocksCount : this.getCompletedBlocksCount();
            this.profileCompletedBlocks.textContent = completed;
        }
        if (this.profileProgress) {
            const progress = progressPercent !== undefined ? progressPercent : this.getProgressPercent();
            this.profileProgress.textContent = `${progress}%`;
        }
    }
    
    getCurrentBlockNumber() {
        const isTVET = this.isTVETStudent();
        const currentBlock = this.userProfile?.block || this.userProfile?.current_block || (isTVET ? 'Term 1' : 'Introductory');
        const blockOrder = isTVET ? {
            'Introductory': 1, 'Term 1': 1, 'Term 2': 2, 'Term 3': 3,
            'Term 4': 4, 'Term 5': 5, 'Term 6': 6, 'Final': 7
        } : {
            'Introductory': 1, 'Block 1': 2, 'Block 2': 3, 'Block 3': 4,
            'Block 4': 5, 'Block 5': 6, 'Final': 7
        };
        return blockOrder[currentBlock] || 1;
    }
    
    getCompletedBlocksCount() {
        return this.getCurrentBlockNumber() - 1;
    }
    
    getProgressPercent() {
        return Math.round((this.getCompletedBlocksCount() / 7) * 100);
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
        
        let html = '';
        blocks.forEach((block, index) => {
            let statusClass = 'upcoming';
            let icon = '⏳';
            if (index < currentIndex) {
                statusClass = 'completed';
                icon = '✅';
            } else if (index === currentIndex) {
                statusClass = 'current';
                icon = '📌';
            }
            
            html += `<span class="block-step ${statusClass}" style="padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; 
                ${statusClass === 'completed' ? 'background: #d1fae5; color: #065f46;' : 
                  statusClass === 'current' ? 'background: #4C1D95; color: white;' : 
                  'background: #e2e8f0; color: #94a3b8;'}">
                ${icon} ${block}
            </span>`;
            
            if (index < blocks.length - 1) {
                html += `<span class="block-connector ${index < currentIndex ? 'completed' : ''}" 
                    style="color: ${index < currentIndex ? '#10b981' : '#d1d5db'}; font-size: 12px;">➜</span>`;
            }
        });
        this.blockTimeline.innerHTML = html;
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
            this.completedBlocksContainer.innerHTML = '<span style="background: #e2e8f0; color: #64748b; padding: 4px 12px; border-radius: 12px; font-size: 12px;">None yet</span>';
            return;
        }
        
        let html = '';
        completedBlocksList.forEach(block => {
            html += `<span style="background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 12px; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;">
                ✅ ${block}
            </span>`;
        });
        this.completedBlocksContainer.innerHTML = html;
    }
    
    async loadProfilePhoto() {
        if (!this.userProfile) return;
        
        // ✅ FIX: Check both fields
        const photoUrl = this.userProfile.passport_url || this.userProfile.profile_photo_url;
        let finalPhotoSrc = 'https://ui-avatars.com/api/?name=Student&background=4C1D95&color=fff&size=120';
        
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
                finalPhotoSrc = 'https://ui-avatars.com/api/?name=Student&background=4C1D95&color=fff&size=120';
            }
        }
        
        if (this.passportPreview) {
            this.passportPreview.src = finalPhotoSrc;
            this.passportPreview.alt = photoUrl ? 'Your passport photo' : 'Upload passport photo';
        }
    }
    
    updateUIState(state) {
        switch(state) {
            case 'view': this.updateViewMode(); break;
            case 'edit': this.updateEditMode(); break;
            case 'saving': this.updateSavingMode(); break;
        }
    }
    
    updateViewMode() {
        this.isEditing = false;
        if (this.editProfileButton) this.editProfileButton.style.display = 'inline-flex';
        if (this.saveProfileButton) this.saveProfileButton.style.display = 'none';
        if (this.cancelEditButton) this.cancelEditButton.style.display = 'none';
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
            this.saveProfileButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        }
    }
    
    setFieldsReadonly(readonly) {
        // ✅ EDITABLE FIELDS (inputs)
        const editableFields = [
            this.profileName,      // ← NOW INCLUDED!
            this.profilePhone,
            this.profileAltPhone,
            this.profileDob,
            this.profileGender,
            this.profileNationalId,
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
                    field.style.background = '#fffbeb';
                    field.style.borderColor = '#f59e0b';
                } else {
                    field.classList.remove('editable');
                    field.style.background = '#f8fafc';
                    field.style.borderColor = '#e2e8f0';
                }
            }
        });
        
        // Date of Birth special handling
        if (this.profileDob) {
            if (!readonly) {
                this.profileDob.removeAttribute('readonly');
                this.profileDob.disabled = false;
                this.profileDob.style.cursor = 'pointer';
            } else {
                this.profileDob.setAttribute('readonly', 'readonly');
                this.profileDob.disabled = false;
            }
        }
        
        // ✅ READ-ONLY FIELDS (display text)
        const readonlyFields = [
            this.profileStudentId,
            this.profileEmail,
            this.profileProgram,
            this.profileBlock,
            this.profileIntakeYear,
            this.profileIntakeMonth
        ];
        
        readonlyFields.forEach(field => {
            if (field) {
                if (field.tagName === 'INPUT' || field.tagName === 'SELECT') {
                    field.readOnly = true;
                    field.disabled = true;
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
        this.updateUIState('view');
    }
    
    async saveProfile() {
        if (!this.userId) return;
        if (!this.validateForm()) return;
        this.updateUIState('saving');
        
        try {
            const updates = {
                full_name: this.profileName ? this.profileName.value.trim() : '', // ← NOW INCLUDED!
                phone: this.profilePhone ? this.profilePhone.value.trim() : '',
                alt_phone: this.profileAltPhone ? this.profileAltPhone.value.trim() : '',
                date_of_birth: this.profileDob ? this.profileDob.value : null,
                gender: this.profileGender ? this.profileGender.value : null,
                national_id: this.profileNationalId ? this.profileNationalId.value.trim() : '',
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
        
        const emailValue = updates.email || existingProfile?.email || this.userProfile?.email;
        const fullNameValue = updates.full_name || existingProfile?.full_name || this.userProfile?.full_name || '';
        const roleValue = existingProfile?.role || 'student';
        const statusValue = existingProfile?.status || 'active';
        
        if (!emailValue) throw new Error('Email is required but not available');
        if (!fullNameValue) throw new Error('Full name is required');
        
        const upsertData = {
            user_id: this.userId,
            email: emailValue,
            full_name: fullNameValue,
            role: roleValue,
            status: statusValue,
            phone: updates.phone !== undefined ? updates.phone : (existingProfile?.phone || this.userProfile?.phone || null),
            alt_phone: updates.alt_phone !== undefined ? updates.alt_phone : (existingProfile?.alt_phone || this.userProfile?.alt_phone || null),
            date_of_birth: dobValue,
            gender: updates.gender !== undefined ? updates.gender : (existingProfile?.gender || null),
            address: updates.address !== undefined ? updates.address : (existingProfile?.address || null),
            guardian_name: updates.guardian_name !== undefined ? updates.guardian_name : (existingProfile?.guardian_name || null),
            guardian_phone: updates.guardian_phone !== undefined ? updates.guardian_phone : (existingProfile?.guardian_phone || null),
            national_id: updates.national_id !== undefined ? updates.national_id : (existingProfile?.national_id || null),
            updated_at: new Date().toISOString(),
            student_id: existingProfile?.student_id || this.userProfile?.student_id || null,
            program: existingProfile?.program || this.userProfile?.program || null,
            block: existingProfile?.block || this.userProfile?.block || null,
            current_block: existingProfile?.current_block || this.userProfile?.current_block || null,
            intake_year: existingProfile?.intake_year || this.userProfile?.intake_year || null,
            intake_month: existingProfile?.intake_month || this.userProfile?.intake_month || null,
            passport_url: existingProfile?.passport_url || this.userProfile?.passport_url || null,
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
    
    onSaveSuccess() {
        if (this.photoObjectURL) {
            URL.revokeObjectURL(this.photoObjectURL);
            this.photoObjectURL = null;
        }
        this.pendingPhotoFile = null;
        if (this.passportFileInput) this.passportFileInput.value = '';
        this.loadProfile();
        this.showStatus('Profile updated successfully!', 'success');
        this.updateUIState('view');
    }
    
    onSaveError(error) {
        console.error('Save error:', error);
        this.showStatus(`Error: ${error.message}`, 'error');
        if (this.saveProfileButton) {
            this.saveProfileButton.disabled = false;
            this.saveProfileButton.innerHTML = '<i class="fas fa-save"></i> Save Changes';
        }
    }
    
    validateForm() {
        let isValid = true;
        this.clearAllErrors();
        
        // ✅ Validate Name
        if (this.profileName && !this.profileName.value.trim()) {
            this.showFieldError(this.profileName, 'Full name is required');
            isValid = false;
        }
        
        // Validate Phone
        if (this.profilePhone && !this.profilePhone.value.trim()) {
            this.showFieldError(this.profilePhone, 'Phone number is required');
            isValid = false;
        }
        
        // Validate DOB
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
        
        // Validate Guardian Phone
        if (this.profileGuardianPhone && this.profileGuardianPhone.value.trim()) {
            const phoneRegex = /^[\d\s\-\+\(\)]{10,20}$/;
            if (!phoneRegex.test(this.profileGuardianPhone.value.trim())) {
                this.showFieldError(this.profileGuardianPhone, 'Please enter a valid phone number');
                isValid = false;
            }
        }
        
        return isValid;
    }
    
    showFieldError(field, message) {
        field.classList.add('error');
        field.style.borderColor = '#dc2626';
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
        errorInputs.forEach(input => {
            input.classList.remove('error');
            input.style.borderColor = '#e2e8f0';
        });
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
        this.profileStatus.style.display = 'block';
        this.profileStatus.textContent = message;
        this.profileStatus.className = `form-status form-status-${type}`;
        
        const styles = {
            'info': { background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' },
            'success': { background: '#d1fae5', color: '#065f46', border: '1px solid #10b981' },
            'error': { background: '#fee2e2', color: '#991b1b', border: '1px solid #dc2626' }
        };
        const style = styles[type] || styles.info;
        Object.assign(this.profileStatus.style, style);
        
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
            this.profileStatus.style.display = 'none';
            this.profileStatus.textContent = '';
            this.profileStatus.className = '';
            this.profileStatus.style.background = '';
            this.profileStatus.style.color = '';
            this.profileStatus.style.border = '';
        }
    }
    
    refresh() {
        this.loadProfile();
        this.showStatus('Profile refreshed!', 'success');
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
window.StudentProfile = {
    refresh: () => {
        if (profileModule) {
            profileModule.refresh();
        } else {
            const instance = initProfileModule();
            if (instance) {
                setTimeout(() => instance.refresh(), 500);
            }
        }
    }
};

console.log('✅ Profile module loaded with editable name and phone fields');
