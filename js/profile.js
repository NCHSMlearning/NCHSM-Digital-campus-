// ============================================================
// 📋 PROFILE MODULE - COMPLETE WITH 2FA & DYNAMIC LABELS
// ✅ Photos stored in user-documents bucket
// ✅ profile_photo_url and passport_url both updated
// ✅ Works with admin approvals
// ✅ Student sees their photo after registration
// ✅ Admin sees updated photos
// ✅ FULL 2FA INTEGRATION
// ✅ FIXED: Student ID, Email, Phone display in form
// ✅ FIXED: SUPABASE_URL error
// ✅ FIXED: Mobile fields populated
// ✅ FIXED: Dynamic labels for TVET (Terms) vs Nursing (Blocks)
// ============================================================

// ============================================================
// 🔧 SUPABASE URL FALLBACK
// ============================================================

if (typeof SUPABASE_URL === 'undefined') {
    window.SUPABASE_URL = 'https://lwhtjozfsmbyihenfunw.supabase.co';
}

if (typeof APP_CONFIG === 'undefined') {
    window.APP_CONFIG = {
        SUPABASE_URL: 'https://lwhtjozfsmbyihenfunw.supabase.co'
    };
}

// ============================================================
// 📋 PROFILE MODULE CLASS
// ============================================================

class ProfileModule {
    constructor() {
        console.log('👤 ProfileModule initializing...');
        
        this.userId = null;
        this.userProfile = null;
        this.isEditing = false;
        this.photoObjectURL = null;
        this.pendingPhotoFile = null;
        this.pendingDocuments = {};
        
        this.initializeElements();
        this.setupEventListeners();
        this.setupPasswordResetListeners();
        this.setupDocumentListeners();
        this.setupPhotoUpload();
        
        // Initialize after db is ready
        this.initialize();
    }
    
    // ============================================================
    // 🕐 TIME HELPERS
    // ============================================================
    
    getKenyaNow() {
        const now = new Date();
        return new Date(now.toLocaleString('en-US', { 
            timeZone: 'Africa/Nairobi' 
        }));
    }
    
    formatKenyaDate(date) {
        if (!date) return 'N/A';
        const d = new Date(date);
        return d.toLocaleDateString('en-KE', {
            timeZone: 'Africa/Nairobi',
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }
    
    // ============================================================
    // 📦 INITIALIZE ELEMENTS
    // ============================================================
    
    initializeElements() {
        // Form and containers
        this.profileForm = document.getElementById('profile-form');
        this.profileStatus = document.getElementById('profile-status');
        
        // Profile photo section
        this.passportPreview = document.getElementById('passport-preview');
        this.passportFileInput = document.getElementById('passport-file-input');
        
        // Personal Information - EDITABLE
        this.profileName = document.getElementById('profile-name-input');
        this.profileStudentId = document.getElementById('profile-student-id');
        this.profileEmail = document.getElementById('profile-email');
        this.profilePhone = document.getElementById('profile-phone-input');
        this.profileAltPhone = document.getElementById('profile-alt-phone-input');
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
        
        // Mobile Progress elements
        this.blockProgressFillMobile = document.getElementById('block-progress-fill-mobile');
        this.blockProgressTextMobile = document.getElementById('block-progress-text-mobile');
        this.currentBlockStatusMobile = document.getElementById('current-block-status-mobile');
        this.completedBlocksContainerMobile = document.getElementById('completed-blocks-mobile');
        this.blockTimelineMobile = document.getElementById('block-timeline-profile-mobile');
        
        // Document Upload Elements
        this.docKcseInput = document.getElementById('doc-kcse-input');
        this.docIdInput = document.getElementById('doc-id-input');
        this.docKcseFilename = document.getElementById('doc-kcse-filename');
        this.docIdFilename = document.getElementById('doc-id-filename');
        this.docKcseBadge = document.getElementById('doc-kcse-badge');
        this.docIdBadge = document.getElementById('doc-id-badge');
        
        // Mobile Document Elements
        this.docKcseInputMobile = document.getElementById('doc-kcse-input-mobile');
        this.docIdInputMobile = document.getElementById('doc-id-input-mobile');
        this.docKcseFilenameMobile = document.getElementById('doc-kcse-filename-mobile');
        this.docIdFilenameMobile = document.getElementById('doc-id-filename-mobile');
        this.docKcseBadgeMobile = document.getElementById('doc-kcse-badge-mobile');
        this.docIdBadgeMobile = document.getElementById('doc-id-badge-mobile');
        
        // Password Reset Elements
        this.currentPassword = document.getElementById('current-password');
        this.newPassword = document.getElementById('new-password');
        this.confirmPassword = document.getElementById('confirm-password');
        this.changePasswordBtn = document.getElementById('change-password-btn');
        this.passwordFeedback = document.getElementById('password-feedback');
        
        // Mobile Password Elements
        this.currentPasswordMobile = document.getElementById('current-password-mobile');
        this.newPasswordMobile = document.getElementById('new-password-mobile');
        this.confirmPasswordMobile = document.getElementById('confirm-password-mobile');
        this.changePasswordBtnMobile = document.getElementById('change-password-btn-mobile');
        this.passwordFeedbackMobile = document.getElementById('password-feedback-mobile');
        
        // Action Buttons
        this.editProfileButton = document.getElementById('edit-profile-button');
        this.saveProfileButton = document.getElementById('save-profile-button');
        this.cancelEditButton = document.getElementById('cancel-edit-button');
    }
    
    // ============================================================
    // 🎯 SETUP EVENT LISTENERS
    // ============================================================
    
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
        
        // Listen for profile updates from admin
        document.addEventListener('profileUpdated', (event) => {
            console.log('🔄 Profile updated by admin, reloading...');
            this.loadProfile();
            this.showStatus('Profile updated by admin!', 'success');
        });
        
        // Listen for photo updates
        document.addEventListener('photoUpdated', (event) => {
            console.log('📸 Photo updated, reloading...');
            this.loadProfilePhoto();
        });
        
        // Listen for 2FA enabled
        document.addEventListener('2FAEnabled', () => {
            this.update2FAUI();
            this.showStatus('✅ 2FA enabled successfully!', 'success');
        });
        
        // Listen for 2FA disabled
        document.addEventListener('2FADisabled', () => {
            this.update2FAUI();
            this.showStatus('2FA has been disabled.', 'info');
        });
    }
    
    // ============================================================
    // 📷 PHOTO UPLOAD SETUP
    // ============================================================
    
    setupPhotoUpload() {
        if (this.passportFileInput) {
            this.passportFileInput.addEventListener('change', (e) => this.handlePassportFileSelect(e));
        }
    }
    
    // ============================================================
    // 📄 DOCUMENT UPLOAD SETUP
    // ============================================================
    
    setupDocumentListeners() {
        if (this.docKcseInput) {
            this.docKcseInput.addEventListener('change', (e) => this.handleDocumentUpload(e, 'kcse'));
        }
        if (this.docIdInput) {
            this.docIdInput.addEventListener('change', (e) => this.handleDocumentUpload(e, 'id'));
        }
        if (this.docKcseInputMobile) {
            this.docKcseInputMobile.addEventListener('change', (e) => this.handleDocumentUpload(e, 'kcse', 'mobile'));
        }
        if (this.docIdInputMobile) {
            this.docIdInputMobile.addEventListener('change', (e) => this.handleDocumentUpload(e, 'id', 'mobile'));
        }
    }
    
    // ============================================================
    // 🔐 PASSWORD RESET SETUP
    // ============================================================
    
    setupPasswordResetListeners() {
        // Desktop password listeners
        if (this.newPassword) {
            this.newPassword.addEventListener('input', () => {
                this.validatePasswordRequirements(this.newPassword.value);
            });
        }
        
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
        
        // Mobile password listeners
        if (this.newPasswordMobile) {
            this.newPasswordMobile.addEventListener('input', () => {
                this.validatePasswordRequirementsMobile(this.newPasswordMobile.value);
            });
        }
        
        if (this.confirmPasswordMobile) {
            this.confirmPasswordMobile.addEventListener('input', () => {
                this.validateConfirmPasswordMobile();
            });
        }
        
        if (this.changePasswordBtnMobile) {
            this.changePasswordBtnMobile.addEventListener('click', (e) => {
                e.preventDefault();
                this.changeUserPasswordMobile();
            });
        }
    }
    
    // ============================================================
    // 🚀 INITIALIZE
    // ============================================================
    
    async initialize() {
        console.log('👤 ProfileModule initializing...');
        
        const getUserId = () => {
            if (window.db?.currentUserId) return window.db.currentUserId;
            if (window.currentUser?.id) return window.currentUser.id;
            if (window.user?.id) return window.user.id;
            if (window.auth?.user?.id) return window.auth.user.id;
            return null;
        };
        
        const userId = getUserId();
        
        if (userId) {
            this.userId = userId;
            this.userProfile = window.db?.currentUserProfile || {};
            console.log('✅ ProfileModule initialized with userId:', userId);
            await this.loadProfile();
        } else {
            console.warn('⚠️ No userId found, waiting for auth...');
            document.addEventListener('userDataLoaded', () => {
                const newUserId = getUserId();
                if (newUserId) {
                    this.userId = newUserId;
                    this.userProfile = window.db?.currentUserProfile || {};
                    this.loadProfile();
                }
            });
            
            setTimeout(() => {
                const delayedUserId = getUserId();
                if (delayedUserId && !this.userId) {
                    this.userId = delayedUserId;
                    this.userProfile = window.db?.currentUserProfile || {};
                    this.loadProfile();
                }
            }, 2000);
        }
        
        setTimeout(() => {
            this.update2FAUI();
        }, 1500);
    }
    
    // ============================================================
    // 📥 LOAD PROFILE
    // ============================================================
    
    async loadProfile() {
        if (!this.userId) {
            console.warn('⚠️ No userId for profile load');
            return;
        }
        
        this.showStatus('Loading profile...', 'info');
        
        try {
            const supabase = this.getSupabaseClient();
            if (!supabase) {
                this.showStatus('Database connection not available', 'error');
                return;
            }
            
            const { data, error } = await supabase
                .from('consolidated_user_profiles_table')
                .select('*')
                .eq('user_id', this.userId)
                .maybeSingle();
            
            if (error) {
                console.warn('Error loading profile:', error);
                this.showStatus(`Error loading profile: ${error.message}`, 'error');
                return;
            }
            
            this.userProfile = data || {};
            this.clearStatus();
            this.populateProfileForm();
            await this.loadProfilePhoto();
            this.updateDocumentStatus();
            this.updateBlockProgress();
            this.updateUIState('view');
            this.update2FAUI();
            
            console.log('✅ Profile loaded successfully');
            
        } catch (error) {
            console.error('Load profile error:', error);
            this.showStatus(`Error: ${error.message}`, 'error');
        }
    }
    
    // ============================================================
    // 📝 POPULATE PROFILE FORM - COMPLETE FIX (Desktop + Mobile)
    // ============================================================
    
    populateProfileForm() {
        if (!this.userProfile) return;
        
        const p = this.userProfile;
        
        // ============================================
        // 📊 HEADER DISPLAY FIELDS
        // ============================================
        
        const nameDisplay = document.getElementById('profile-name');
        if (nameDisplay) nameDisplay.textContent = p.full_name || 'Loading...';
        
        const studentIdDisplay = document.getElementById('profile-student-id');
        if (studentIdDisplay) studentIdDisplay.textContent = p.student_id || p.reg_no || '-';
        
        const emailDisplay = document.getElementById('profile-email');
        if (emailDisplay) emailDisplay.textContent = p.email || '-';
        
        const phoneDisplay = document.getElementById('profile-phone');
        if (phoneDisplay) phoneDisplay.textContent = p.phone || p.phone_number || '-';
        
        const programDisplay = document.getElementById('profile-program');
        if (programDisplay) programDisplay.textContent = p.program || '-';
        
        // ============================================
        // 📝 DESKTOP FORM INPUTS
        // ============================================
        
        if (this.profileName) this.profileName.value = p.full_name || '';
        
        const studentIdInput = document.getElementById('profile-student-id-input');
        if (studentIdInput) studentIdInput.value = p.student_id || p.reg_no || '';
        
        const emailInput = document.getElementById('profile-email-input');
        if (emailInput) emailInput.value = p.email || '';
        
        const phoneInput = document.getElementById('profile-phone-input');
        if (phoneInput) phoneInput.value = p.phone || p.phone_number || '';
        
        const altPhoneInput = document.getElementById('profile-alt-phone-input');
        if (altPhoneInput) altPhoneInput.value = p.alt_phone || '';
        
        const nationalIdInput = document.getElementById('profile-national-id-input');
        if (nationalIdInput) nationalIdInput.value = p.national_id || '';
        
        const addressInput = document.getElementById('profile-address-input');
        if (addressInput) addressInput.value = p.address || '';
        
        const guardianNameInput = document.getElementById('profile-guardian-name-input');
        if (guardianNameInput) guardianNameInput.value = p.guardian_name || '';
        
        const guardianPhoneInput = document.getElementById('profile-guardian-phone-input');
        if (guardianPhoneInput) guardianPhoneInput.value = p.guardian_phone || '';
        
        const programInput = document.getElementById('profile-program-input');
        if (programInput) programInput.value = p.program || '';
        
        const isTVET = this.isTVETStudent();
        const blockOrTerm = isTVET ? p.term || p.block : p.block || p.current_block;
        
        const blockInput = document.getElementById('profile-block-input');
        if (blockInput) blockInput.value = blockOrTerm || 'Introductory';
        
        const intakeYearInput = document.getElementById('profile-intake-year-input');
        if (intakeYearInput) intakeYearInput.value = p.intake_year || p.year_of_intake || '';
        
        const intakeMonthInput = document.getElementById('profile-intake-month-input');
        if (intakeMonthInput) intakeMonthInput.value = p.intake_month || '';
        
        if (this.profileDob && p.date_of_birth) {
            const dob = new Date(p.date_of_birth);
            if (!isNaN(dob)) {
                this.profileDob.value = dob.toISOString().split('T')[0];
            }
        } else if (this.profileDob) {
            this.profileDob.value = '';
        }
        
        if (this.profileGender) {
            this.profileGender.value = p.gender || '';
        }
        
        // ============================================
        // 📱 MOBILE FORM INPUTS
        // ============================================
        
        const mobileName = document.getElementById('profile-name-input-mobile');
        if (mobileName) mobileName.value = p.full_name || '';
        
        const mobileStudentId = document.getElementById('profile-student-id-input-mobile');
        if (mobileStudentId) mobileStudentId.value = p.student_id || p.reg_no || '';
        
        const mobileEmail = document.getElementById('profile-email-input-mobile');
        if (mobileEmail) mobileEmail.value = p.email || '';
        
        const mobilePhone = document.getElementById('profile-phone-input-mobile');
        if (mobilePhone) mobilePhone.value = p.phone || p.phone_number || '';
        
        const mobileAltPhone = document.getElementById('profile-alt-phone-input-mobile');
        if (mobileAltPhone) mobileAltPhone.value = p.alt_phone || '';
        
        const mobileNationalId = document.getElementById('profile-national-id-input-mobile');
        if (mobileNationalId) mobileNationalId.value = p.national_id || '';
        
        const mobileAddress = document.getElementById('profile-address-input-mobile');
        if (mobileAddress) mobileAddress.value = p.address || '';
        
        const mobileGuardianName = document.getElementById('profile-guardian-name-input-mobile');
        if (mobileGuardianName) mobileGuardianName.value = p.guardian_name || '';
        
        const mobileGuardianPhone = document.getElementById('profile-guardian-phone-input-mobile');
        if (mobileGuardianPhone) mobileGuardianPhone.value = p.guardian_phone || '';
        
        const mobileProgram = document.getElementById('profile-program-input-mobile');
        if (mobileProgram) mobileProgram.value = p.program || '';
        
        const mobileBlock = document.getElementById('profile-block-input-mobile');
        if (mobileBlock) mobileBlock.value = blockOrTerm || 'Introductory';
        
        const mobileIntakeYear = document.getElementById('profile-intake-year-input-mobile');
        if (mobileIntakeYear) mobileIntakeYear.value = p.intake_year || p.year_of_intake || '';
        
        const mobileIntakeMonth = document.getElementById('profile-intake-month-input-mobile');
        if (mobileIntakeMonth) mobileIntakeMonth.value = p.intake_month || '';
        
        const mobileDob = document.getElementById('profile-dob-input-mobile');
        if (mobileDob && p.date_of_birth) {
            const dob = new Date(p.date_of_birth);
            if (!isNaN(dob)) {
                mobileDob.value = dob.toISOString().split('T')[0];
            }
        } else if (mobileDob) {
            mobileDob.value = '';
        }
        
        const mobileGender = document.getElementById('profile-gender-input-mobile');
        if (mobileGender) {
            mobileGender.value = p.gender || '';
        }
        
        // ============================================
        // 📊 UPDATE QUICK STATS
        // ============================================
        this.updateQuickStats();
        
        // ============================================
        // 🏷️ UPDATE DYNAMIC LABELS (TVET vs Nursing)
        // ============================================
        this.updateDynamicLabels();
        
        console.log('✅ Profile form populated with all data (Desktop + Mobile):', {
            name: p.full_name,
            student_id: p.student_id,
            email: p.email,
            phone: p.phone,
            program: p.program,
            block: p.block,
            intake_year: p.intake_year,
            intake_month: p.intake_month
        });
    }
    
    // ============================================================
    // 🏷️ UPDATE DYNAMIC LABELS (TVET vs Nursing)
    // ============================================================
    
    updateDynamicLabels() {
        const isTVET = this.isTVETStudent();
        
        // ============================================
        // 📊 DESKTOP LABELS
        // ============================================
        const desktopLabels = {
            'block-label': isTVET ? 'Term' : 'Block',
            'current-block-label': isTVET ? 'Current Term' : 'Current Block',
            'completed-label': isTVET ? 'Terms Done' : 'Blocks Done',
            'completed-label-2': isTVET ? 'Terms' : 'Blocks'
        };
        
        Object.entries(desktopLabels).forEach(([id, text]) => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = text;
            }
        });
        
        // Update "Current Block" status text
        const currentStatusEl = document.getElementById('current-block-status');
        if (currentStatusEl) {
            const currentBlock = this.userProfile?.block || this.userProfile?.current_block || (isTVET ? 'Term 1' : 'Introductory');
            currentStatusEl.textContent = `Current: ${currentBlock}`;
        }
        
        // Update progress text
        const progressTextEl = document.getElementById('block-progress-text');
        if (progressTextEl) {
            const progress = this.getProgressPercent();
            progressTextEl.textContent = `${progress}% Complete`;
        }
        
        // ============================================
        // 📱 MOBILE LABELS
        // ============================================
        const mobileLabels = {
            'current-block-label-mobile': isTVET ? 'Current Term' : 'Current Block',
            'completed-label-mobile-2': isTVET ? 'Terms' : 'Blocks'
        };
        
        Object.entries(mobileLabels).forEach(([id, text]) => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = text;
            }
        });
        
        // Update mobile "Current Block" status text
        const currentStatusMobileEl = document.getElementById('current-block-status-mobile');
        if (currentStatusMobileEl) {
            const currentBlock = this.userProfile?.block || this.userProfile?.current_block || (isTVET ? 'Term 1' : 'Introductory');
            currentStatusMobileEl.textContent = `Current: ${currentBlock}`;
        }
        
        // Update mobile progress text
        const progressTextMobileEl = document.getElementById('block-progress-text-mobile');
        if (progressTextMobileEl) {
            const progress = this.getProgressPercent();
            progressTextMobileEl.textContent = `${progress}% Complete`;
        }
        
        console.log(`🏷️ Labels updated: ${isTVET ? 'TVET (Terms)' : 'Nursing (Blocks)'}`);
    }
    
    // ============================================================
    // 🖼️ LOAD PROFILE PHOTO - FIXED (SUPABASE_URL)
    // ============================================================
    
    async loadProfilePhoto() {
        if (!this.userProfile) return;
        
        let photoUrl = this.userProfile.profile_photo_url || this.userProfile.passport_url || null;
        
        let finalPhotoSrc = 'https://ui-avatars.com/api/?name=' + 
            encodeURIComponent(this.userProfile.full_name || 'Student') + 
            '&background=4C1D95&color=fff&size=120';
        
        if (photoUrl) {
            try {
                if (photoUrl.startsWith('http')) {
                    finalPhotoSrc = photoUrl;
                } else {
                    const supabaseUrl = window.SUPABASE_URL || 
                                       window.APP_CONFIG?.SUPABASE_URL || 
                                       'https://lwhtjozfsmbyihenfunw.supabase.co';
                    
                    let fullPath = photoUrl;
                    if (!photoUrl.includes('profiles/') && !photoUrl.includes('user-documents')) {
                        fullPath = `profiles/${this.userId}/${photoUrl}`;
                    }
                    
                    finalPhotoSrc = `${supabaseUrl}/storage/v1/object/public/user-documents/${fullPath}?t=${new Date().getTime()}`;
                }
                
                await new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = resolve;
                    img.onerror = reject;
                    img.src = finalPhotoSrc;
                });
            } catch (error) {
                console.warn('Photo load error:', error);
                finalPhotoSrc = 'https://ui-avatars.com/api/?name=' + 
                    encodeURIComponent(this.userProfile.full_name || 'Student') + 
                    '&background=4C1D95&color=fff&size=120';
            }
        }
        
        if (this.passportPreview) {
            this.passportPreview.src = finalPhotoSrc;
            this.passportPreview.alt = photoUrl ? 'Your passport photo' : 'Upload passport photo';
        }
    }
    
    // ============================================================
    // 📸 GET PHOTO URL - HELPER
    // ============================================================
    
    getPhotoUrl(profile) {
        if (!profile) return null;
        
        const photoPath = profile.profile_photo_url || profile.passport_url || null;
        if (!photoPath) return null;
        
        if (photoPath.startsWith('http')) {
            return photoPath;
        }
        
        const supabaseUrl = window.SUPABASE_URL || 
                           window.APP_CONFIG?.SUPABASE_URL || 
                           'https://lwhtjozfsmbyihenfunw.supabase.co';
        
        let fullPath = photoPath;
        if (!photoPath.startsWith('profiles/')) {
            fullPath = `profiles/${this.userId}/${photoPath}`;
        }
        return `${supabaseUrl}/storage/v1/object/public/user-documents/${fullPath}`;
    }
    
    // ============================================================
    // 📄 DOCUMENT UPLOAD HANDLERS
    // ============================================================
    
    async handleDocumentUpload(event, docType, variant = 'desktop') {
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
        
        const suffix = variant === 'mobile' ? '-mobile' : '';
        const filenameEl = document.getElementById(`doc-${docType}-filename${suffix}`);
        const badgeEl = document.getElementById(`doc-${docType}-badge${suffix}`);
        
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
    
    // ============================================================
    // 📸 PASSPORT PHOTO HANDLERS
    // ============================================================
    
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
    
    // ============================================================
    // 📸 UPLOAD PASSPORT PHOTO - FIXED
    // ============================================================
    
    async uploadPassportPhoto() {
        const file = this.pendingPhotoFile;
        if (!file) return;
        
        this.showStatus('Uploading photo...', 'info');
        
        try {
            const supabase = this.getSupabaseClient();
            if (!supabase) throw new Error('No database connection');
            
            const fileExt = file.name.split('.').pop();
            const filePath = `profiles/${this.userId}/photo.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
                .from('user-documents')
                .upload(filePath, file, { 
                    cacheControl: '3600', 
                    upsert: true, 
                    contentType: file.type 
                });
            
            if (uploadError) throw uploadError;
            
            const { data: urlData } = supabase.storage.from('user-documents').getPublicUrl(filePath);
            const publicUrl = urlData.publicUrl;
            
            const { error: updateError } = await supabase
                .from('consolidated_user_profiles_table')
                .update({ 
                    profile_photo_url: filePath,
                    passport_url: publicUrl,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', this.userId);
            
            if (updateError) throw updateError;
            
            this.showStatus('Photo uploaded successfully!', 'success');
            this.pendingPhotoFile = null;
            await this.loadProfile();
            
            document.dispatchEvent(new CustomEvent('photoUpdated', { 
                detail: { userId: this.userId }
            }));
            
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
    
    // ============================================================
    // 📊 DOCUMENT STATUS
    // ============================================================
    
    getDocumentStatusText(status) {
        const statusMap = {
            'pending': '⏳ Pending',
            'uploaded': '✅ Uploaded',
            'verified': '✅ Verified',
            'rejected': '❌ Rejected'
        };
        return statusMap[status] || '⏳ Pending';
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
    
    updateDocumentStatus() {
        if (!this.userProfile) return;
        
        // Desktop badges
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
        
        // Mobile badges
        if (this.docKcseBadgeMobile) {
            const status = this.userProfile.doc_kcse || 'pending';
            this.docKcseBadgeMobile.textContent = this.getDocumentStatusText(status);
            this.docKcseBadgeMobile.style.background = this.getStatusColor(status);
            this.docKcseBadgeMobile.style.color = 'white';
        }
        if (this.docIdBadgeMobile) {
            const status = this.userProfile.doc_id || 'pending';
            this.docIdBadgeMobile.textContent = this.getDocumentStatusText(status);
            this.docIdBadgeMobile.style.background = this.getStatusColor(status);
            this.docIdBadgeMobile.style.color = 'white';
        }
        
        // Desktop filenames
        if (this.docKcseFilename && this.userProfile.doc_kcse === 'uploaded') {
            this.docKcseFilename.textContent = '✅ Document uploaded';
        }
        if (this.docIdFilename && this.userProfile.doc_id === 'uploaded') {
            this.docIdFilename.textContent = '✅ Document uploaded';
        }
        
        // Mobile filenames
        if (this.docKcseFilenameMobile && this.userProfile.doc_kcse === 'uploaded') {
            this.docKcseFilenameMobile.textContent = '✅ Document uploaded';
        }
        if (this.docIdFilenameMobile && this.userProfile.doc_id === 'uploaded') {
            this.docIdFilenameMobile.textContent = '✅ Document uploaded';
        }
    }
    
    // ============================================================
    // 🔍 TVET HELPERS
    // ============================================================
    
    isTVETStudent() {
        const tvetPrograms = [
            'DPOTT', 'DCH', 'DHRIT', 'DSL', 'DSW', 'DCJS', 'DHSS', 'DICT', 'DME',
            'CPOTT', 'CCH', 'CHRIT', 'CPC', 'CSL', 'CSW', 'CCJS', 'CAG', 'CHSS', 'CICT',
            'ACH', 'AAG', 'ASW', 'CCA', 'PTE'
        ];
        const program = this.userProfile?.program || '';
        return tvetPrograms.includes(program) || program === 'TVET';
    }
    
    // ============================================================
    // 📊 BLOCK PROGRESS
    // ============================================================
    
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
        
        // Desktop progress
        if (this.blockProgressFill) {
            this.blockProgressFill.style.width = `${progressPercent}%`;
        }
        if (this.blockProgressText) {
            this.blockProgressText.textContent = `${progressPercent}% Complete`;
        }
        if (this.currentBlockStatus) {
            this.currentBlockStatus.textContent = `Current: ${currentBlock}`;
        }
        
        // Mobile progress
        if (this.blockProgressFillMobile) {
            this.blockProgressFillMobile.style.width = `${progressPercent}%`;
        }
        if (this.blockProgressTextMobile) {
            this.blockProgressTextMobile.textContent = `${progressPercent}% Complete`;
        }
        if (this.currentBlockStatusMobile) {
            this.currentBlockStatusMobile.textContent = `Current: ${currentBlock}`;
        }
        
        this.updateQuickStats(currentBlockNumber, completedBlocksCount, progressPercent);
        this.updateBlockTimeline(currentBlock, isTVET);
        this.updateCompletedBlocks(completedBlocksCount, isTVET);
    }
    
    updateQuickStats(currentBlockNumber, completedBlocksCount, progressPercent) {
        const blockNum = currentBlockNumber || this.getCurrentBlockNumber();
        const completed = completedBlocksCount !== undefined ? completedBlocksCount : this.getCompletedBlocksCount();
        const progress = progressPercent !== undefined ? progressPercent : this.getProgressPercent();
        
        if (this.profileBlockNumber) this.profileBlockNumber.textContent = blockNum;
        if (this.profileCompletedBlocks) this.profileCompletedBlocks.textContent = completed;
        if (this.profileProgress) this.profileProgress.textContent = `${progress}%`;
    }
    
    updateBlockTimeline(currentBlock, isTVET) {
        // Desktop timeline
        if (this.blockTimeline) {
            this.blockTimeline.innerHTML = this.buildTimelineHTML(currentBlock, isTVET);
        }
        
        // Mobile timeline
        if (this.blockTimelineMobile) {
            this.blockTimelineMobile.innerHTML = this.buildTimelineHTML(currentBlock, isTVET);
        }
    }
    
    buildTimelineHTML(currentBlock, isTVET) {
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
        return html;
    }
    
    updateCompletedBlocks(completedCount, isTVET) {
        // Desktop
        if (this.completedBlocksContainer) {
            this.completedBlocksContainer.innerHTML = this.buildCompletedBlocksHTML(completedCount, isTVET);
        }
        
        // Mobile
        if (this.completedBlocksContainerMobile) {
            this.completedBlocksContainerMobile.innerHTML = this.buildCompletedBlocksHTML(completedCount, isTVET);
        }
    }
    
    buildCompletedBlocksHTML(completedCount, isTVET) {
        let blocks;
        if (isTVET) {
            blocks = ['Introductory', 'Term 1', 'Term 2', 'Term 3', 'Term 4', 'Term 5'];
        } else {
            blocks = ['Introductory', 'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5'];
        }
        
        const completedBlocksList = blocks.slice(0, completedCount);
        
        if (completedBlocksList.length === 0) {
            return '<span style="background: #e2e8f0; color: #64748b; padding: 4px 12px; border-radius: 12px; font-size: 12px;">None yet</span>';
        }
        
        let html = '';
        completedBlocksList.forEach(block => {
            html += `<span style="background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 12px; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;">
                ✅ ${block}
            </span>`;
        });
        return html;
    }
    
    // ============================================================
    // 🔐 PASSWORD FUNCTIONS
    // ============================================================
    
    validatePasswordRequirements(password) {
        const requirements = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[!@#$%^&*]/.test(password)
        };
        const allValid = Object.values(requirements).every(v => v === true);
        
        // Update feedback for desktop
        const feedback = this.passwordFeedback;
        if (feedback) {
            if (password.length > 0) {
                const messages = [];
                if (!requirements.length) messages.push('at least 8 characters');
                if (!requirements.uppercase) messages.push('uppercase');
                if (!requirements.lowercase) messages.push('lowercase');
                if (!requirements.number) messages.push('number');
                if (!requirements.special) messages.push('special character');
                
                if (messages.length > 0) {
                    feedback.textContent = `⚠️ Needs: ${messages.join(', ')}`;
                    feedback.style.background = '#fef3c7';
                    feedback.style.color = '#92400e';
                    feedback.style.border = '1px solid #f59e0b';
                    feedback.style.display = 'block';
                } else {
                    feedback.textContent = '✅ Strong password!';
                    feedback.style.background = '#d1fae5';
                    feedback.style.color = '#065f46';
                    feedback.style.border = '1px solid #10b981';
                    feedback.style.display = 'block';
                }
            } else {
                feedback.style.display = 'none';
            }
        }
        
        return allValid;
    }
    
    validatePasswordRequirementsMobile(password) {
        const requirements = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[!@#$%^&*]/.test(password)
        };
        const allValid = Object.values(requirements).every(v => v === true);
        
        const feedback = this.passwordFeedbackMobile;
        if (feedback) {
            if (password.length > 0) {
                const messages = [];
                if (!requirements.length) messages.push('at least 8 characters');
                if (!requirements.uppercase) messages.push('uppercase');
                if (!requirements.lowercase) messages.push('lowercase');
                if (!requirements.number) messages.push('number');
                if (!requirements.special) messages.push('special character');
                
                if (messages.length > 0) {
                    feedback.textContent = `⚠️ Needs: ${messages.join(', ')}`;
                    feedback.style.background = '#fef3c7';
                    feedback.style.color = '#92400e';
                    feedback.style.border = '1px solid #f59e0b';
                    feedback.style.display = 'block';
                } else {
                    feedback.textContent = '✅ Strong password!';
                    feedback.style.background = '#d1fae5';
                    feedback.style.color = '#065f46';
                    feedback.style.border = '1px solid #10b981';
                    feedback.style.display = 'block';
                }
            } else {
                feedback.style.display = 'none';
            }
        }
        
        return allValid;
    }
    
    validateConfirmPassword() {
        const newPassword = this.newPassword?.value || '';
        const confirmPassword = this.confirmPassword?.value || '';
        
        const feedback = this.passwordFeedback;
        if (feedback) {
            if (confirmPassword && newPassword !== confirmPassword) {
                feedback.textContent = '❌ Passwords do not match!';
                feedback.style.background = '#fee2e2';
                feedback.style.color = '#991b1b';
                feedback.style.border = '1px solid #dc2626';
                feedback.style.display = 'block';
                return false;
            } else if (confirmPassword && newPassword === confirmPassword) {
                feedback.textContent = '✅ Passwords match!';
                feedback.style.background = '#d1fae5';
                feedback.style.color = '#065f46';
                feedback.style.border = '1px solid #10b981';
                feedback.style.display = 'block';
                setTimeout(() => {
                    if (feedback) feedback.style.display = 'none';
                }, 2000);
                return true;
            }
            feedback.style.display = 'none';
        }
        return false;
    }
    
    validateConfirmPasswordMobile() {
        const newPassword = this.newPasswordMobile?.value || '';
        const confirmPassword = this.confirmPasswordMobile?.value || '';
        
        const feedback = this.passwordFeedbackMobile;
        if (feedback) {
            if (confirmPassword && newPassword !== confirmPassword) {
                feedback.textContent = '❌ Passwords do not match!';
                feedback.style.background = '#fee2e2';
                feedback.style.color = '#991b1b';
                feedback.style.border = '1px solid #dc2626';
                feedback.style.display = 'block';
                return false;
            } else if (confirmPassword && newPassword === confirmPassword) {
                feedback.textContent = '✅ Passwords match!';
                feedback.style.background = '#d1fae5';
                feedback.style.color = '#065f46';
                feedback.style.border = '1px solid #10b981';
                feedback.style.display = 'block';
                setTimeout(() => {
                    if (feedback) feedback.style.display = 'none';
                }, 2000);
                return true;
            }
            feedback.style.display = 'none';
        }
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
            
            const email = this.userProfile?.email || this.userProfile?.user_email;
            if (!email) {
                throw new Error('User email not found. Please contact support.');
            }
            
            console.log('🔄 Changing password for user:', email);
            
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
            
            // Clear mobile fields too
            if (this.currentPasswordMobile) this.currentPasswordMobile.value = '';
            if (this.newPasswordMobile) this.newPasswordMobile.value = '';
            if (this.confirmPasswordMobile) this.confirmPasswordMobile.value = '';
            
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
    
    async changeUserPasswordMobile() {
        // Use desktop password change with mobile fields
        const currentPassword = this.currentPasswordMobile?.value;
        const newPassword = this.newPasswordMobile?.value;
        const confirmPassword = this.confirmPasswordMobile?.value;
        
        // Temporarily set desktop fields to mobile values
        if (this.currentPassword) this.currentPassword.value = currentPassword || '';
        if (this.newPassword) this.newPassword.value = newPassword || '';
        if (this.confirmPassword) this.confirmPassword.value = confirmPassword || '';
        
        await this.changeUserPassword();
    }
    
    // ============================================================
    // 💾 SAVE PROFILE
    // ============================================================
    
    async saveProfile() {
        if (!this.userId) {
            this.showStatus('Not logged in', 'error');
            return;
        }
        if (!this.validateForm()) return;
        this.updateUIState('saving');
        
        try {
            const updates = {
                full_name: this.profileName ? this.profileName.value.trim() : '',
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
            profile_photo_url: existingProfile?.profile_photo_url || this.userProfile?.profile_photo_url || null,
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
        
        document.dispatchEvent(new CustomEvent('profileUpdated', { 
            detail: { userId: this.userId }
        }));
    }
    
    onSaveError(error) {
        console.error('Save error:', error);
        this.showStatus(`Error: ${error.message}`, 'error');
        if (this.saveProfileButton) {
            this.saveProfileButton.disabled = false;
            this.saveProfileButton.innerHTML = '<i class="fas fa-save"></i> Save Changes';
        }
    }
    
    // ============================================================
    // ✅ VALIDATION
    // ============================================================
    
    validateForm() {
        let isValid = true;
        this.clearAllErrors();
        
        if (this.profileName && !this.profileName.value.trim()) {
            this.showFieldError(this.profileName, 'Full name is required');
            isValid = false;
        }
        
        if (this.profilePhone && !this.profilePhone.value.trim()) {
            this.showFieldError(this.profilePhone, 'Phone number is required');
            isValid = false;
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
    
    // ============================================================
    // 🎨 UI STATE MANAGEMENT
    // ============================================================
    
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
        const editableFields = [
            this.profileName,
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
    
    // ============================================================
    // 🔄 REFRESH
    // ============================================================
    
    refresh() {
        this.loadProfile();
        this.showStatus('Profile refreshed!', 'success');
    }
    
    // ============================================================
    // 🛡️ 2FA FUNCTIONS
    // ============================================================
    
    async check2FAStatus() {
        try {
            if (!this.userId) return false;
            
            const supabase = this.getSupabaseClient();
            if (!supabase) throw new Error('Database connection not available');
            
            const { data, error } = await supabase
                .from('consolidated_user_profiles_table')
                .select('two_factor_enabled, two_factor_secret, two_factor_setup_date')
                .eq('user_id', this.userId)
                .single();
            
            if (error) {
                console.warn('Error checking 2FA status:', error);
                return false;
            }
            
            return data;
        } catch (error) {
            console.error('Error checking 2FA:', error);
            return false;
        }
    }
    
    async update2FAUI() {
        const status = await this.check2FAStatus();
        
        // Desktop 2FA elements
        const badge = document.getElementById('profile2FABadge');
        const btn = document.getElementById('profileEnable2FA');
        const btnText = document.getElementById('profile2FABtnText');
        const msg = document.getElementById('profile2FAMessage');
        const recoverySection = document.getElementById('profileRecoveryCodes');
        const statusMsg = document.getElementById('profile2FAStatusMsg');
        
        // Mobile 2FA elements
        const badgeMobile = document.getElementById('profile2FABadgeMobile');
        const btnMobile = document.getElementById('profileEnable2FAMobile');
        const btnTextMobile = document.getElementById('profile2FABtnTextMobile');
        const msgMobile = document.getElementById('profile2FAMessageMobile');
        const recoverySectionMobile = document.getElementById('profileRecoveryCodesMobile');
        const statusMsgMobile = document.getElementById('profile2FAStatusMsgMobile');
        
        if (!badge && !btn) {
            this.create2FAElements();
            setTimeout(() => this.update2FAUI(), 300);
            return;
        }
        
        const isEnabled = status && status.two_factor_enabled && status.two_factor_secret;
        
        // Update Desktop
        if (isEnabled) {
            if (badge) {
                badge.style.background = '#d1fae5';
                badge.style.color = '#065f46';
                badge.innerHTML = '<i class="fas fa-check-circle" style="font-size: 11px;"></i> Enabled';
            }
            if (btn) {
                btn.style.background = '#10b981';
                btn.style.cursor = 'default';
                btn.disabled = true;
                btn.style.opacity = '0.8';
                btn.style.transform = 'none';
            }
            if (btnText) btnText.textContent = '✅ Active';
            if (msg) msg.textContent = '✅ Your account is secured with Two-Factor Authentication';
            if (statusMsg) {
                statusMsg.style.display = 'block';
                statusMsg.style.color = '#059669';
                statusMsg.textContent = '🔐 2FA is active - your account is protected';
            }
            if (recoverySection) {
                recoverySection.style.display = 'block';
                this.loadRecoveryCodesCount();
            }
        } else {
            if (badge) {
                badge.style.background = '#fef3c7';
                badge.style.color = '#92400e';
                badge.innerHTML = '<i class="fas fa-exclamation-triangle" style="font-size: 11px;"></i> Not Enabled';
            }
            if (btn) {
                btn.style.background = 'linear-gradient(135deg, #4C1D95, #7c3aed)';
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            }
            if (btnText) btnText.textContent = 'Enable 2FA';
            if (msg) msg.textContent = 'Secure your account with 2FA using Google Authenticator';
            if (statusMsg) {
                statusMsg.style.display = 'block';
                statusMsg.style.color = '#92400e';
                statusMsg.textContent = '⚠️ 2FA is not enabled - click "Enable 2FA" to secure your account';
            }
            if (recoverySection) recoverySection.style.display = 'none';
        }
        
        // Update Mobile
        if (isEnabled) {
            if (badgeMobile) {
                badgeMobile.style.background = '#d1fae5';
                badgeMobile.style.color = '#065f46';
                badgeMobile.innerHTML = '<i class="fas fa-check-circle" style="font-size: 9px;"></i> Enabled';
            }
            if (btnMobile) {
                btnMobile.style.background = '#10b981';
                btnMobile.style.cursor = 'default';
                btnMobile.disabled = true;
                btnMobile.style.opacity = '0.8';
            }
            if (btnTextMobile) btnTextMobile.textContent = '✅ Active';
            if (msgMobile) msgMobile.textContent = '✅ Secured with 2FA';
            if (statusMsgMobile) {
                statusMsgMobile.style.display = 'block';
                statusMsgMobile.style.color = '#059669';
                statusMsgMobile.textContent = '🔐 2FA active';
            }
            if (recoverySectionMobile) {
                recoverySectionMobile.style.display = 'block';
                this.loadRecoveryCodesCountMobile();
            }
        } else {
            if (badgeMobile) {
                badgeMobile.style.background = '#fef3c7';
                badgeMobile.style.color = '#92400e';
                badgeMobile.innerHTML = '<i class="fas fa-exclamation-triangle" style="font-size: 9px;"></i> Not Enabled';
            }
            if (btnMobile) {
                btnMobile.style.background = 'linear-gradient(135deg, #4C1D95, #7c3aed)';
                btnMobile.disabled = false;
                btnMobile.style.opacity = '1';
                btnMobile.style.cursor = 'pointer';
            }
            if (btnTextMobile) btnTextMobile.textContent = 'Enable 2FA';
            if (msgMobile) msgMobile.textContent = 'Secure your account with 2FA';
            if (statusMsgMobile) {
                statusMsgMobile.style.display = 'block';
                statusMsgMobile.style.color = '#92400e';
                statusMsgMobile.textContent = '⚠️ 2FA not enabled';
            }
            if (recoverySectionMobile) recoverySectionMobile.style.display = 'none';
        }
    }
    
    create2FAElements() {
        if (document.getElementById('profile2FABadge')) return;
        
        const securitySection = document.querySelector('.profile-security-section');
        if (!securitySection) {
            console.warn('Security section not found, cannot create 2FA UI');
            return;
        }
        
        const twoFADiv = document.createElement('div');
        twoFADiv.className = 'profile-2fa-section';
        twoFADiv.style.cssText = `
            border-top: 2px dashed #e5e7eb;
            margin-top: 16px;
            padding-top: 16px;
        `;
        twoFADiv.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 8px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-shield-alt" style="color: #4C1D95; font-size: 18px;"></i>
                    <div>
                        <h5 style="margin: 0; color: #0A3D62; font-size: 14px; font-weight: 600;">Two-Factor Authentication</h5>
                        <p style="margin: 0; font-size: 12px; color: #64748B;">Add an extra layer of security to your account</p>
                    </div>
                </div>
                <div id="profile2FAStatus">
                    <span id="profile2FABadge" style="padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; background: #fef3c7; color: #92400e; display: inline-flex; align-items: center; gap: 6px;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 11px;"></i> Not Enabled
                    </span>
                </div>
            </div>
            
            <div id="profile2FADetails" style="background: #f1f5f9; border-radius: 8px; padding: 12px 16px; margin-top: 6px;">
                <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                    <div style="flex: 1;">
                        <span style="font-size: 13px; color: #475569;">
                            <i class="fas fa-info-circle" style="color: #4C1D95;"></i> 
                            <span id="profile2FAMessage">Secure your account with 2FA using Google Authenticator</span>
                        </span>
                    </div>
                    <button id="profileEnable2FA" 
                            onclick="window.openProfile2FASetup()" 
                            style="padding: 8px 20px; background: linear-gradient(135deg, #4C1D95, #7c3aed); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 13px; transition: all 0.3s ease; white-space: nowrap; display: flex; align-items: center; gap: 6px;">
                        <i class="fas fa-shield-alt"></i> 
                        <span id="profile2FABtnText">Enable 2FA</span>
                    </button>
                </div>
                <div id="profile2FAStatusMsg" style="margin-top: 6px; font-size: 12px; color: #94a3b8; display: none;"></div>
                
                <div id="profileRecoveryCodes" style="display: none; margin-top: 10px; padding-top: 10px; border-top: 1px solid #e5e7eb;">
                    <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                        <i class="fas fa-key" style="color: #f59e0b;"></i>
                        <span style="font-size: 13px; color: #475569;">
                            <strong>Recovery Codes:</strong> 
                            <span id="profileRecoveryCount">0</span> codes remaining
                        </span>
                        <button onclick="window.generateProfileRecoveryCodes()" style="padding: 4px 14px; background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; border-radius: 6px; cursor: pointer; font-size: 12px;">
                            <i class="fas fa-redo-alt"></i> Generate New
                        </button>
                        <button onclick="window.disableProfile2FA()" style="padding: 4px 14px; background: #fee2e2; color: #dc2626; border: none; border-radius: 6px; cursor: pointer; font-size: 12px;">
                            <i class="fas fa-times-circle"></i> Disable 2FA
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        securitySection.appendChild(twoFADiv);
    }
    
    async open2FASetup() {
        try {
            if (!this.userId) {
                this.showStatus('Please login first', 'error');
                return;
            }
            
            const status = await this.check2FAStatus();
            if (status && status.two_factor_enabled && status.two_factor_secret) {
                this.showStatus('2FA is already enabled for your account!', 'info');
                await this.update2FAUI();
                return;
            }
            
            if (window.NCHSMLogin && typeof window.NCHSMLogin.show2FASetup === 'function') {
                const email = this.userProfile?.email || this.userProfile?.user_email;
                if (!email) {
                    this.showStatus('Email not found. Please contact support.', 'error');
                    return;
                }
                
                await window.NCHSMLogin.show2FASetup(this.userId, email);
                
                document.addEventListener('2FAEnabled', () => {
                    this.update2FAUI();
                    this.showStatus('✅ 2FA enabled successfully!', 'success');
                }, { once: true });
                
            } else if (typeof window.showQRCode === 'function') {
                window.showQRCode();
            } else {
                this.showStatus('2FA module not available. Please reload the page.', 'error');
            }
            
        } catch (error) {
            console.error('Error opening 2FA setup:', error);
            this.showStatus(`Error: ${error.message}`, 'error');
        }
    }
    
    async loadRecoveryCodesCount() {
        try {
            if (!this.userId) return;
            
            const supabase = this.getSupabaseClient();
            if (!supabase) return;
            
            const { data, error } = await supabase
                .from('two_factor_recovery_codes')
                .select('id')
                .eq('user_id', this.userId)
                .eq('is_used', false);
            
            if (error) throw error;
            
            const countEl = document.getElementById('profileRecoveryCount');
            if (countEl) countEl.textContent = data?.length || 0;
            
            const countElMobile = document.getElementById('profileRecoveryCountMobile');
            if (countElMobile) countElMobile.textContent = data?.length || 0;
            
        } catch (error) {
            console.error('Error loading recovery codes:', error);
        }
    }
    
    async loadRecoveryCodesCountMobile() {
        await this.loadRecoveryCodesCount();
    }
    
    async generateRecoveryCodes() {
        try {
            if (!this.userId) {
                this.showStatus('Please login first', 'error');
                return;
            }
            
            const supabase = this.getSupabaseClient();
            if (!supabase) throw new Error('Database connection not available');
            
            const codes = [];
            for (let i = 0; i < 10; i++) {
                const code = Math.random().toString(36).substring(2, 10).toUpperCase();
                codes.push(code);
            }
            
            // Delete old codes
            await supabase
                .from('two_factor_recovery_codes')
                .delete()
                .eq('user_id', this.userId);
            
            for (const code of codes) {
                const hashed = await this.hashToken(code);
                await supabase
                    .from('two_factor_recovery_codes')
                    .insert({
                        user_id: this.userId,
                        recovery_code: hashed,
                        created_at: new Date().toISOString()
                    });
            }
            
            alert('🔑 Your new recovery codes:\n\n' + codes.join('\n') + '\n\nStore these in a safe place!');
            
            await this.loadRecoveryCodesCount();
            this.showStatus('✅ New recovery codes generated!', 'success');
            
        } catch (error) {
            console.error('Error generating recovery codes:', error);
            this.showStatus(`Error: ${error.message}`, 'error');
        }
    }
    
    async disable2FA() {
        if (!confirm('⚠️ Are you sure you want to disable Two-Factor Authentication?\n\nYour account will be less secure without 2FA.')) {
            return;
        }
        
        try {
            if (!this.userId) {
                this.showStatus('Please login first', 'error');
                return;
            }
            
            const supabase = this.getSupabaseClient();
            if (!supabase) throw new Error('Database connection not available');
            
            const { error } = await supabase
                .from('consolidated_user_profiles_table')
                .update({
                    two_factor_enabled: false,
                    two_factor_verified: false,
                    two_factor_secret: null,
                    two_factor_setup_date: null,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', this.userId);
            
            if (error) throw error;
            
            await supabase
                .from('two_factor_recovery_codes')
                .delete()
                .eq('user_id', this.userId);
            
            await this.update2FAUI();
            this.showStatus('✅ 2FA has been disabled.', 'success');
            
            document.dispatchEvent(new CustomEvent('2FADisabled', { 
                detail: { userId: this.userId }
            }));
            
        } catch (error) {
            console.error('Error disabling 2FA:', error);
            this.showStatus(`Error: ${error.message}`, 'error');
        }
    }
    
    async hashToken(token) {
        const encoder = new TextEncoder();
        const data = encoder.encode(token);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    
    // ============================================================
    // 🔧 UTILITY FUNCTIONS
    // ============================================================
    
    getSupabaseClient() {
        if (window.db && window.db.supabase) {
            return window.db.supabase;
        }
        if (window.supabase) {
            return window.supabase;
        }
        return null;
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
}

// ============================================================
// 🚀 GLOBAL INITIALIZATION
// ============================================================

let profileModule = null;

function initProfileModule() {
    if (!document.getElementById('profile-form')) {
        console.warn('⚠️ Profile form not found, waiting...');
        return null;
    }
    
    if (profileModule) return profileModule;
    
    try {
        profileModule = new ProfileModule();
        console.log('✅ ProfileModule instantiated');
        return profileModule;
    } catch (error) {
        console.error('❌ ProfileModule initialization error:', error);
        return null;
    }
}

// ============================================================
// 🔄 REFRESH PROFILE FROM ADMIN
// ============================================================

function refreshStudentProfile(userId) {
    if (profileModule && profileModule.userId === userId) {
        console.log('🔄 Refreshing profile for user:', userId);
        profileModule.loadProfile();
        profileModule.showStatus('Profile refreshed!', 'success');
    }
}

// ============================================================
// 📌 EXPOSE GLOBALLY
// ============================================================

window.ProfileModule = ProfileModule;
window.initProfileModule = initProfileModule;
window.refreshStudentProfile = refreshStudentProfile;
window.ProfileModuleInstance = profileModule;

// ============================================================
// 🎯 GLOBAL 2FA FUNCTIONS FOR HTML BUTTONS
// ============================================================

window.openProfile2FASetup = function() {
    if (window.ProfileModuleInstance) {
        window.ProfileModuleInstance.open2FASetup();
    } else {
        const instance = initProfileModule();
        if (instance) {
            setTimeout(() => instance.open2FASetup(), 500);
        }
    }
};

window.generateProfileRecoveryCodes = function() {
    if (window.ProfileModuleInstance) {
        window.ProfileModuleInstance.generateRecoveryCodes();
    } else {
        const instance = initProfileModule();
        if (instance) {
            setTimeout(() => instance.generateRecoveryCodes(), 500);
        }
    }
};

window.disableProfile2FA = function() {
    if (window.ProfileModuleInstance) {
        window.ProfileModuleInstance.disable2FA();
    } else {
        const instance = initProfileModule();
        if (instance) {
            setTimeout(() => instance.disable2FA(), 500);
        }
    }
};

// ============================================================
// 🔥 EMERGENCY 2FA FIX - FORCE REGISTER GLOBAL FUNCTIONS
// ============================================================

(function ensure2FAFunctions() {
    console.log('🔧 Ensuring 2FA functions are available globally...');
    
    if (!window.ProfileModuleInstance && profileModule) {
        window.ProfileModuleInstance = profileModule;
    }
    
    if (typeof window.openProfile2FASetup !== 'function') {
        window.openProfile2FASetup = function() {
            console.log('🔐 openProfile2FASetup called (emergency)');
            const instance = window.ProfileModuleInstance || profileModule;
            if (instance && typeof instance.open2FASetup === 'function') {
                instance.open2FASetup();
            } else {
                try {
                    const newInstance = initProfileModule();
                    if (newInstance) {
                        window.ProfileModuleInstance = newInstance;
                        setTimeout(() => newInstance.open2FASetup(), 300);
                    } else {
                        alert('Profile module not ready. Please refresh the page.');
                    }
                } catch(e) {
                    alert('Error loading 2FA. Please refresh the page.');
                }
            }
        };
        console.log('✅ openProfile2FASetup registered (emergency)');
    }
    
    if (typeof window.generateProfileRecoveryCodes !== 'function') {
        window.generateProfileRecoveryCodes = function() {
            console.log('🔑 generateProfileRecoveryCodes called (emergency)');
            const instance = window.ProfileModuleInstance || profileModule;
            if (instance && typeof instance.generateRecoveryCodes === 'function') {
                instance.generateRecoveryCodes();
            } else {
                alert('Profile module not ready. Please refresh the page.');
            }
        };
        console.log('✅ generateProfileRecoveryCodes registered (emergency)');
    }
    
    if (typeof window.disableProfile2FA !== 'function') {
        window.disableProfile2FA = function() {
            console.log('🔓 disableProfile2FA called (emergency)');
            const instance = window.ProfileModuleInstance || profileModule;
            if (instance && typeof instance.disable2FA === 'function') {
                instance.disable2FA();
            } else {
                alert('Profile module not ready. Please refresh the page.');
            }
        };
        console.log('✅ disableProfile2FA registered (emergency)');
    }
    
    console.log('✅ All 2FA functions are now available globally!');
    console.log('📌 openProfile2FASetup:', typeof window.openProfile2FASetup);
    console.log('📌 generateProfileRecoveryCodes:', typeof window.generateProfileRecoveryCodes);
    console.log('📌 disableProfile2FA:', typeof window.disableProfile2FA);
})();

// ============================================================
// 📌 EVENT LISTENERS
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const instance = initProfileModule();
        if (instance) {
            window.ProfileModuleInstance = instance;
        }
    }, 500);
});

document.addEventListener('userDataLoaded', () => {
    setTimeout(() => {
        if (!profileModule) {
            const instance = initProfileModule();
            if (instance) {
                window.ProfileModuleInstance = instance;
            }
        } else if (profileModule.userId) {
            profileModule.loadProfile();
        }
    }, 300);
});

document.addEventListener('click', (e) => {
    const profileTab = e.target.closest('[data-tab="profile"]');
    if (profileTab) {
        setTimeout(() => {
            if (!profileModule) {
                const instance = initProfileModule();
                if (instance) {
                    window.ProfileModuleInstance = instance;
                }
            } else {
                profileModule.loadProfile();
            }
        }, 300);
    }
});

const profileObserver = new MutationObserver(() => {
    const profileTab = document.getElementById('profile');
    if (profileTab && profileTab.style.display !== 'none') {
        if (window.ProfileModuleInstance) {
            window.ProfileModuleInstance.update2FAUI();
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const profileTab = document.getElementById('profile');
    if (profileTab) {
        profileObserver.observe(profileTab, { attributes: true, attributeFilter: ['style'] });
    }
});

console.log('✅ ProfileModule loaded with all fixes');
console.log('📸 Photo handling fixed - uses user-documents bucket');
console.log('🔐 2FA fully integrated with profile');
console.log('📱 Mobile fields now populated');
console.log('🏷️ Dynamic labels for TVET (Terms) vs Nursing (Blocks)');
console.log('🔄 Admin refresh available via refreshStudentProfile(userId)');
