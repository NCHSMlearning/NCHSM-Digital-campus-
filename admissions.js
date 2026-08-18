// ============================================================
// ADMISSIONS.JS - Complete Application Logic (FULLY FIXED)
// ============================================================

// ============================================================
// SUPABASE CONFIGURATION
// ============================================================

// Get Supabase client safely
function getSupabase() {
    // Try multiple ways to get the client
    if (typeof window.supabaseClient !== 'undefined' && window.supabaseClient) {
        return window.supabaseClient;
    }
    if (typeof window.sb !== 'undefined' && window.sb) {
        return window.sb;
    }
    if (typeof window.supabase !== 'undefined' && window.supabase) {
        if (window.supabase.from) {
            return window.supabase;
        }
        if (window.supabase.createClient) {
            const SUPABASE_URL = 'https://lwhtjozfsmbyihenfunw.supabase.co';
            const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk';
            window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            window.supabaseClient = window.sb;
            return window.sb;
        }
    }
    if (typeof supabase !== 'undefined' && supabase && supabase.createClient) {
        const SUPABASE_URL = 'https://lwhtjozfsmbyihenfunw.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk';
        window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        window.supabaseClient = window.sb;
        return window.sb;
    }
    console.error('❌ Supabase client not found');
    return null;
}

// Create global sb variable
let sb = getSupabase();

// ============================================================
// STATE VARIABLES
// ============================================================
let currentUser = null;
let currentStep = 1;
let uploadedDocs = {};
let eligibilityPassed = false;
let kcseValidated = false;
let emailValid = false;
let studentType = 'new';
let kcseDataExtracted = {};
let idDataExtracted = {};
let applicationId = null;
let emailCheckTimeout = null;

// ✅ FIX: Only declare once - check if it already exists
if (typeof missingFieldsData === 'undefined') {
    var missingFieldsData = [];
}

// ============================================================
// PROGRAM DATA
// ============================================================
const programCriteria = {
    'KRCHN': { minGrade: 'C+', subjects: ['English', 'Mathematics', 'Biology'], minSubjectGrades: { 'English': 'C', 'Mathematics': 'D+', 'Biology': 'C' } },
    'DCHN': { minGrade: 'C', subjects: ['English', 'Mathematics', 'Biology'], minSubjectGrades: { 'English': 'C', 'Mathematics': 'D', 'Biology': 'C' } },
    'DPOTT': { minGrade: 'C-', subjects: ['English', 'Mathematics', 'Biology'], minSubjectGrades: { 'English': 'D+', 'Mathematics': 'D', 'Biology': 'D+' } },
    'DCH': { minGrade: 'C-', subjects: ['English', 'Mathematics', 'Biology'], minSubjectGrades: { 'English': 'D+', 'Mathematics': 'D', 'Biology': 'D+' } },
    'DHRIT': { minGrade: 'C-', subjects: ['English', 'Mathematics'], minSubjectGrades: { 'English': 'D+', 'Mathematics': 'D' } },
    'DSL': { minGrade: 'C-', subjects: ['English', 'Mathematics', 'Chemistry'], minSubjectGrades: { 'English': 'D+', 'Mathematics': 'D', 'Chemistry': 'D+' } },
    'DSW': { minGrade: 'C-', subjects: ['English', 'Mathematics'], minSubjectGrades: { 'English': 'D+', 'Mathematics': 'D' } },
    'DCJS': { minGrade: 'C-', subjects: ['English', 'Mathematics'], minSubjectGrades: { 'English': 'D+', 'Mathematics': 'D' } },
    'DHSS': { minGrade: 'C-', subjects: ['English', 'Mathematics', 'Biology'], minSubjectGrades: { 'English': 'D+', 'Mathematics': 'D', 'Biology': 'D+' } },
    'DICT': { minGrade: 'C-', subjects: ['English', 'Mathematics'], minSubjectGrades: { 'English': 'D+', 'Mathematics': 'D' } },
    'DME': { minGrade: 'C', subjects: ['English', 'Mathematics', 'Physics'], minSubjectGrades: { 'English': 'C', 'Mathematics': 'C', 'Physics': 'C-' } },
    'CPOTT': { minGrade: 'D+', subjects: ['English', 'Mathematics', 'Biology'], minSubjectGrades: { 'English': 'D', 'Mathematics': 'D', 'Biology': 'D' } },
    'CCH': { minGrade: 'D+', subjects: ['English', 'Mathematics', 'Biology'], minSubjectGrades: { 'English': 'D', 'Mathematics': 'D', 'Biology': 'D' } },
    'CHRIT': { minGrade: 'D+', subjects: ['English', 'Mathematics'], minSubjectGrades: { 'English': 'D', 'Mathematics': 'D' } },
    'CPC': { minGrade: 'D', subjects: ['English', 'Mathematics', 'Biology'], minSubjectGrades: { 'English': 'D', 'Mathematics': 'D', 'Biology': 'D' } },
    'CSL': { minGrade: 'D+', subjects: ['English', 'Mathematics', 'Chemistry'], minSubjectGrades: { 'English': 'D', 'Mathematics': 'D', 'Chemistry': 'D' } },
    'CSW': { minGrade: 'D+', subjects: ['English', 'Mathematics'], minSubjectGrades: { 'English': 'D', 'Mathematics': 'D' } },
    'CCJS': { minGrade: 'D+', subjects: ['English', 'Mathematics'], minSubjectGrades: { 'English': 'D', 'Mathematics': 'D' } },
    'CAG': { minGrade: 'D', subjects: ['English', 'Mathematics'], minSubjectGrades: { 'English': 'D', 'Mathematics': 'D' } },
    'CHSS': { minGrade: 'D+', subjects: ['English', 'Mathematics', 'Biology'], minSubjectGrades: { 'English': 'D', 'Mathematics': 'D', 'Biology': 'D' } },
    'CICT': { minGrade: 'D+', subjects: ['English', 'Mathematics'], minSubjectGrades: { 'English': 'D', 'Mathematics': 'D' } },
    'CCG': { minGrade: 'D', subjects: ['English', 'Mathematics', 'Biology'], minSubjectGrades: { 'English': 'D', 'Mathematics': 'D', 'Biology': 'D' } },
    'COMT': { minGrade: 'D+', subjects: ['English', 'Mathematics', 'Biology'], minSubjectGrades: { 'English': 'D', 'Mathematics': 'D', 'Biology': 'D' } },
    'ACH': { minGrade: 'D', subjects: ['English', 'Mathematics'], minSubjectGrades: { 'English': 'D', 'Mathematics': 'D' } },
    'AAG': { minGrade: 'D', subjects: ['English', 'Mathematics'], minSubjectGrades: { 'English': 'D', 'Mathematics': 'D' } },
    'ASW': { minGrade: 'D', subjects: ['English', 'Mathematics'], minSubjectGrades: { 'English': 'D', 'Mathematics': 'D' } },
    'CCA': { minGrade: 'None', subjects: [], minSubjectGrades: {} },
    'PTE': { minGrade: 'None', subjects: [], minSubjectGrades: {} }
};

const gradePoints = {
    'A': 12, 'A-': 11, 'B+': 10, 'B': 9, 'B-': 8,
    'C+': 7, 'C': 6, 'C-': 5, 'D+': 4, 'D': 3, 'D-': 2, 'E': 1
};

const programNames = {
    'KRCHN': 'KRCHN Nursing',
    'DCHN': 'DCHN Nursing',
    'DPOTT': 'Diploma in Perioperative Theatre Technology',
    'DCH': 'Diploma in Community Health',
    'DHRIT': 'Diploma in Health Records & IT',
    'DSL': 'Diploma in Science Lab',
    'DSW': 'Diploma in Social Work',
    'DCJS': 'Diploma in Criminal Justice',
    'DHSS': 'Diploma in Health Support Services',
    'DICT': 'Diploma in ICT',
    'DME': 'Diploma in Medical Engineering',
    'CPOTT': 'Certificate in Perioperative Theatre Technology',
    'CCH': 'Certificate in Community Health',
    'CHRIT': 'Certificate in Health Records & IT',
    'CPC': 'Certificate in Patient Care',
    'CSL': 'Certificate in Science Lab',
    'CSW': 'Certificate in Social Work',
    'CCJS': 'Certificate in Criminal Justice',
    'CAG': 'Certificate in Agriculture',
    'CHSS': 'Certificate in Health Support Services',
    'CICT': 'Certificate in ICT',
    'CCG': 'Certificate in Caregiver',
    'COMT': 'Certificate in Orthopedic Trauma Medicine',
    'ACH': 'Artisan in Community Health',
    'AAG': 'Artisan in Agriculture',
    'ASW': 'Artisan in Social Work',
    'CCA': 'Certificate in Computer Applications',
    'PTE': 'TVET/CDACC PTE'
};

// ============================================================
// ULTRA MODERN VALIDATION MODAL FUNCTIONS
// ============================================================

/**
 * Show the validation modal with detailed missing fields
 * @param {string} title - The main title
 * @param {string} subtitle - The subtitle
 * @param {Array} missingFields - Array of {field, section, hint} objects
 */
function showValidationModal(title, subtitle, missingFields) {
    const modal = document.getElementById('validationModal');
    const titleEl = document.getElementById('modalTitle');
    const subtitleEl = document.getElementById('modalSubtitle');
    const summaryEl = document.getElementById('validationSummary');
    const countEl = document.getElementById('missingCount');
    const listEl = document.getElementById('missingFieldsList');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');

    if (!modal) return;

    // Store for later use
    missingFieldsData = missingFields || [];

    // Set header
    if (titleEl) titleEl.textContent = title || 'Cannot Proceed';
    if (subtitleEl) subtitleEl.textContent = subtitle || 'Please complete all required fields';

    // Update summary
    const count = missingFieldsData.length;
    if (countEl) countEl.textContent = count;
    if (summaryEl) {
        const msg = count === 1 ? 
            'required field needs your attention before you can proceed.' :
            'required fields need your attention before you can proceed.';
        summaryEl.querySelector('div').innerHTML = `<strong>${count}</strong> ${msg}`;
    }

    // Update progress
    const totalSteps = 4;
    const completed = Math.max(0, totalSteps - Math.ceil(count / 3));
    const percent = Math.min(Math.round((completed / totalSteps) * 100), 100);
    if (progressFill) progressFill.style.width = percent + '%';
    if (progressText) progressText.textContent = percent + '%';

    // Build missing fields list grouped by section
    if (listEl) {
        // Group by section
        const grouped = {};
        missingFieldsData.forEach(item => {
            const section = item.section || 'General';
            if (!grouped[section]) grouped[section] = [];
            grouped[section].push(item);
        });

        let html = '';
        const sectionIcons = {
            'Personal Details': 'fa-user',
            'Program Details': 'fa-graduation-cap',
            'Documents': 'fa-clipboard-list',
            'Submission': 'fa-clipboard-check',
            'Emergency Contact': 'fa-ambulance',
            'Medical History': 'fa-heartbeat',
            'Employment': 'fa-briefcase',
            'Validation': 'fa-exclamation-circle',
            'General': 'fa-circle'
        };

        for (const [section, fields] of Object.entries(grouped)) {
            const icon = sectionIcons[section] || 'fa-circle';
            html += `
                <div class="missing-section">
                    <div class="missing-section-header">
                        <i class="fas ${icon} section-icon"></i>
                        ${section}
                        <span class="badge-count">${fields.length}</span>
                    </div>
                    ${fields.map(f => `
                        <div class="missing-field-item">
                            <span class="field-name">${f.field}</span>
                            ${f.hint ? `<span class="field-hint">${f.hint}</span>` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
        }

        listEl.innerHTML = html || `
            <div style="text-align:center;padding:2rem;color:var(--gray-400);">
                <i class="fas fa-check-circle" style="font-size:2rem;color:var(--success);"></i>
                <p style="margin-top:0.5rem;">No missing fields found!</p>
            </div>
        `;
    }

    // Show modal
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

/**
 * Close the validation modal
 */
function closeValidation() {
    const modal = document.getElementById('validationModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

/**
 * Scroll to the first missing field and highlight it
 */
function scrollToFirstMissing() {
    closeValidation();
    
    // Try to find and focus the first missing field
    if (missingFieldsData.length > 0) {
        const fieldMap = {
            'Full Name': 'fullName',
            'Email Address': 'email',
            'Date of Birth': 'dob',
            'Nationality': 'nationality',
            'National ID': 'nationalId',
            'Country of Birth': 'countryOfBirth',
            'Gender': 'gender',
            'Address': 'address',
            'City': 'city',
            'Phone Number': 'phone',
            'How did you Know about Us': 'hearAbout',
            'Are you Sponsored': 'sponsored',
            'Sponsor Name': 'sponsorName',
            'School': 'school',
            'Course': 'program',
            'Campus': 'campus',
            'Intake': 'intake',
            'Mode of Study': 'modeOfStudy',
            'Student Type': 'studentType',
            'Previous Institution': 'prevInstitution',
            'Previous Year of Study': 'prevYear',
            'KCSE Certificate': 'doc_kcse_input',
            'National ID / Birth Certificate': 'doc_id_input',
            'Recommendation Letter': 'doc_recommendation_input',
            'Academic Transcript': 'doc_transcript_input',
            'Father Alive': 'fatherAlive',
            'Father Name': 'fatherName',
            'Father Phone No.': 'fatherPhone',
            'Mother Alive': 'motherAlive',
            'Mother Name': 'motherName',
            'Mother Phone No.': 'motherPhone',
            'Person With Disability': 'disability',
            'Disability Description': 'disabilityDesc',
            'Any Medical Condition': 'medicalCondition',
            'Medical Condition Description': 'medicalDesc',
            'Are you employed': 'employed',
            'Employment Details': 'employmentDesc',
            'Terms & Conditions': 'termsCheck'
        };

        const firstField = missingFieldsData[0];
        const fieldId = fieldMap[firstField.field];
        
        if (fieldId) {
            const el = document.getElementById(fieldId);
            if (el) {
                // Highlight the field
                el.style.borderColor = '#ef4444';
                el.style.boxShadow = '0 0 0 4px rgba(239, 68, 68, 0.2)';
                setTimeout(() => {
                    el.style.borderColor = '';
                    el.style.boxShadow = '';
                }, 3000);
                
                // Scroll to it
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.focus();
                return;
            }
        }
    }
}

/**
 * Legacy showValidation - now uses modern modal
 */
function showValidation(msg) {
    const missingFields = [{ field: msg, section: 'Validation', hint: 'Required field' }];
    showValidationModal('Validation Error', 'Please fix the following issues', missingFields);
}

// ============================================================
// NAVIGATION FUNCTION (Page switching)
// ============================================================
function navigateTo(page) {
    // Hide all pages
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
    
    // Show the target page
    const targetPage = document.getElementById(`page-${page}`);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) {
            item.classList.add('active');
        }
    });
    
    // If going to register page, check auth state
    if (page === 'register') {
        setTimeout(function() {
            checkAuthForRegisterPage();
        }, 300);
    }
    
    // If going to login page, redirect to home with login tab active
    if (page === 'login') {
        document.getElementById('page-home').classList.add('active');
        switchAuthTab('login');
        document.querySelector('.auth-wrapper')?.scrollIntoView({ behavior: 'smooth' });
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === 'home') {
                item.classList.add('active');
            }
        });
    }
}

// ============================================================
// ENHANCED goToStep WITH MODERN VALIDATION
// ============================================================

function goToStep(step) {
    // Validate current step before moving
    if (!validateStepWithModal(currentStep, step)) {
        return; // Validation failed, modal shown
    }

    // Update UI
    document.querySelectorAll('.form-section').forEach(el => el.classList.remove('active'));
    document.querySelector(`.form-section[data-section="${step}"]`)?.classList.add('active');

    document.querySelectorAll('.step-item').forEach(el => {
        el.classList.remove('active', 'completed');
        const s = parseInt(el.dataset.step);
        if (s === step) el.classList.add('active');
        else if (s < step) el.classList.add('completed');
    });

    currentStep = step;
    updateSummary();
    updateDocumentStatus();
    saveApplication(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Validate step with detailed modal showing all missing fields
 */
function validateStepWithModal(from, to) {
    const missingFields = [];

    if (from === 1 && to > 1) {
        // Personal Details
        const checks = [
            { id: 'fullName', field: 'Full Name', section: 'Personal Details', hint: 'Required field' },
            { id: 'email', field: 'Email Address', section: 'Personal Details', hint: 'Required field' },
            { id: 'dob', field: 'Date of Birth', section: 'Personal Details', hint: 'Required field' },
            { id: 'nationality', field: 'Nationality', section: 'Personal Details', hint: 'Required field' },
            { id: 'nationalId', field: 'National ID', section: 'Personal Details', hint: 'Required field' },
            { id: 'countryOfBirth', field: 'Country of Birth', section: 'Personal Details', hint: 'Required field' },
            { id: 'gender', field: 'Gender', section: 'Personal Details', hint: 'Required field' },
            { id: 'address', field: 'Address', section: 'Personal Details', hint: 'Required field' },
            { id: 'city', field: 'City', section: 'Personal Details', hint: 'Required field' },
            { id: 'phone', field: 'Phone Number', section: 'Personal Details', hint: 'Must be 10+ digits' },
            { id: 'hearAbout', field: 'How did you Know about Us', section: 'Personal Details', hint: 'Required field' },
            { id: 'sponsored', field: 'Are you Sponsored', section: 'Personal Details', hint: 'Required field' },
        ];

        // Phone validation
        const phone = document.getElementById('phone')?.value.trim();
        if (phone && phone.length < 10) {
            missingFields.push({ field: 'Phone Number', section: 'Personal Details', hint: 'Must be at least 10 digits' });
        }

        // Check all required fields
        checks.forEach(check => {
            const el = document.getElementById(check.id);
            if (el) {
                const val = el.value.trim();
                if (!val || val === '') {
                    missingFields.push({ field: check.field, section: check.section, hint: check.hint });
                }
            }
        });

        // Sponsor field
        const sponsored = document.getElementById('sponsored')?.value;
        if (sponsored === 'Yes') {
            const sponsorName = document.getElementById('sponsorName')?.value.trim();
            if (!sponsorName) {
                missingFields.push({ field: 'Sponsor Name', section: 'Personal Details', hint: 'Required since you are sponsored' });
            }
        }

        // Emergency Contact
        const fatherAlive = document.getElementById('fatherAlive')?.value;
        if (fatherAlive === 'Yes') {
            const fatherName = document.getElementById('fatherName')?.value.trim();
            const fatherPhone = document.getElementById('fatherPhone')?.value.trim();
            if (!fatherName) missingFields.push({ field: 'Father Name', section: 'Emergency Contact', hint: 'Required' });
            if (!fatherPhone) missingFields.push({ field: 'Father Phone No.', section: 'Emergency Contact', hint: 'Required' });
        }

        const motherAlive = document.getElementById('motherAlive')?.value;
        if (motherAlive === 'Yes') {
            const motherName = document.getElementById('motherName')?.value.trim();
            const motherPhone = document.getElementById('motherPhone')?.value.trim();
            if (!motherName) missingFields.push({ field: 'Mother Name', section: 'Emergency Contact', hint: 'Required' });
            if (!motherPhone) missingFields.push({ field: 'Mother Phone No.', section: 'Emergency Contact', hint: 'Required' });
        }

        // Medical History
        const disability = document.getElementById('disability')?.value;
        if (disability === 'Yes') {
            const desc = document.getElementById('disabilityDesc')?.value.trim();
            if (!desc) missingFields.push({ field: 'Disability Description', section: 'Medical History', hint: 'Required' });
        }

        const medical = document.getElementById('medicalCondition')?.value;
        if (medical === 'Yes') {
            const desc = document.getElementById('medicalDesc')?.value.trim();
            if (!desc) missingFields.push({ field: 'Medical Condition Description', section: 'Medical History', hint: 'Required' });
        }

        // Employment
        const employed = document.getElementById('employed')?.value;
        if (employed === 'Yes') {
            const desc = document.getElementById('employmentDesc')?.value.trim();
            if (!desc) missingFields.push({ field: 'Employment Details', section: 'Employment', hint: 'Required' });
        }

        // Photo
        const photo = document.getElementById('passportPhoto')?.files?.[0];
        if (!photo) {
            missingFields.push({ field: 'Passport Photo', section: 'Personal Details', hint: 'Upload a clear photo' });
        }

        if (missingFields.length > 0) {
            showValidationModal(
                'Complete Your Profile',
                'Please fill in all required personal details',
                missingFields
            );
            return false;
        }
    }

    if (from === 2 && to > 2) {
        // Program Details
        const checks = [
            { id: 'school', field: 'School', section: 'Program Details', hint: 'Select your school' },
            { id: 'program', field: 'Course', section: 'Program Details', hint: 'Select your course' },
            { id: 'campus', field: 'Campus', section: 'Program Details', hint: 'Select campus' },
            { id: 'intake', field: 'Intake', section: 'Program Details', hint: 'Select intake' },
            { id: 'modeOfStudy', field: 'Mode of Study', section: 'Program Details', hint: 'Select mode' },
        ];

        checks.forEach(check => {
            const el = document.getElementById(check.id);
            if (el) {
                const val = el.value.trim();
                if (!val || val === '') {
                    missingFields.push({ field: check.field, section: check.section, hint: check.hint });
                }
            }
        });

        // Student Type
        const studentTypeRadios = document.querySelectorAll('input[name="studentType"]');
        let selected = false;
        studentTypeRadios.forEach(r => { if (r.checked) selected = true; });
        if (!selected) {
            missingFields.push({ field: 'Student Type', section: 'Program Details', hint: 'Select new or transfer' });
        }

        // Transfer fields
        const transferChecked = document.querySelector('input[name="studentType"][value="transfer"]')?.checked;
        if (transferChecked) {
            const prevInst = document.getElementById('prevInstitution')?.value.trim();
            const prevYear = document.getElementById('prevYear')?.value.trim();
            if (!prevInst) missingFields.push({ field: 'Previous Institution', section: 'Program Details', hint: 'Required for transfer' });
            if (!prevYear) missingFields.push({ field: 'Previous Year of Study', section: 'Program Details', hint: 'Required for transfer' });
        }

        if (missingFields.length > 0) {
            showValidationModal(
                'Complete Program Details',
                'Please select all required program information',
                missingFields
            );
            return false;
        }
    }

    if (from === 3 && to > 3) {
        // Documents - KCSE, ID, Recommendation, Transcript (if transfer)
        const requiredDocs = [
            { id: 'doc_kcse_input', field: 'KCSE Certificate', section: 'Documents', hint: 'Required for validation' },
            { id: 'doc_id_input', field: 'National ID / Birth Certificate', section: 'Documents', hint: 'Required' },
            { id: 'doc_recommendation_input', field: 'Recommendation Letter', section: 'Documents', hint: 'Required' },
        ];

        requiredDocs.forEach(check => {
            const el = document.getElementById(check.id);
            if (el) {
                const hasFile = el.files && el.files.length > 0;
                if (!hasFile && !uploadedDocs[check.field.toLowerCase().replace(/[^a-z]/g, '_')]) {
                    missingFields.push({ field: check.field, section: check.section, hint: check.hint });
                }
            }
        });

        // Transcript for transfer students
        const transferChecked = document.querySelector('input[name="studentType"][value="transfer"]')?.checked;
        if (transferChecked) {
            const transcript = document.getElementById('doc_transcript_input');
            if (!transcript?.files?.length && !uploadedDocs['transcript']) {
                missingFields.push({ field: 'Academic Transcript', section: 'Documents', hint: 'Required for transfer' });
            }
        }

        // KCSE validation status
        if (!kcseValidated) {
            missingFields.push({ field: 'KCSE Validation', section: 'Documents', hint: 'Scan your KCSE certificate' });
        }

        if (missingFields.length > 0) {
            showValidationModal(
                'Upload Required Documents',
                'Please upload all required documents',
                missingFields
            );
            return false;
        }
    }

    if (from === 4 && to > 4) {
        // Submission - Terms check
        const terms = document.getElementById('termsCheck');
        if (!terms?.checked) {
            missingFields.push({ field: 'Terms & Conditions', section: 'Submission', hint: 'Check the box to agree' });
            showValidationModal(
                'Terms & Conditions',
                'Please agree to the terms before submitting',
                missingFields
            );
            return false;
        }
    }

    return true;
}

// ============================================================
// CHECK AUTH FOR REGISTER PAGE (Apply Now)
// ============================================================
async function checkAuthForRegisterPage() {
    console.log('🔍 checkAuthForRegisterPage() called');
    
    const supabaseClient = getSupabase();
    console.log('📡 Supabase client:', supabaseClient ? '✅ Available' : '❌ NULL');
    
    const authContainer = document.getElementById('authContainer2');
    const dashboardApp = document.getElementById('dashboardApp');
    
    console.log('📦 authContainer:', authContainer ? '✅ Found' : '❌ NOT FOUND');
    console.log('📦 dashboardApp:', dashboardApp ? '✅ Found' : '❌ NOT FOUND');
    
    if (!authContainer || !dashboardApp) {
        console.error('❌ DOM elements not found!');
        setTimeout(function() {
            const retryAuth = document.getElementById('authContainer2');
            const retryDash = document.getElementById('dashboardApp');
            if (retryAuth && retryDash) {
                console.log('✅ Retry found elements!');
                checkAuthForRegisterPage();
            } else {
                console.error('❌ Elements still not found. Check HTML IDs.');
            }
        }, 500);
        return;
    }
    
    if (!supabaseClient) {
        console.warn('⚠️ No Supabase client - showing register form');
        authContainer.style.display = 'block';
        dashboardApp.style.display = 'none';
        switchAuthTab2('register2');
        return;
    }

    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (error) throw error;
        
        console.log('👤 Session:', session ? '✅ Logged in' : '❌ Not logged in');
        
        if (session) {
            console.log('📋 User is logged in - showing dashboard');
            currentUser = session.user;
            authContainer.style.display = 'none';
            dashboardApp.style.display = 'block';
            
            const avatar = document.getElementById('dashAvatar');
            const name = document.getElementById('dashName');
            const email = document.getElementById('dashEmail');
            const appNo = document.getElementById('dashAppNo');
            
            if (avatar) avatar.textContent = currentUser.email.charAt(0).toUpperCase();
            if (name) name.textContent = 'Welcome, ' + (currentUser.user_metadata?.full_name || 'User') + '!';
            if (email) email.textContent = currentUser.email;
            
            await loadUserApplication(currentUser.id);
        } else {
            console.log('📝 User is NOT logged in - showing register form');
            authContainer.style.display = 'block';
            dashboardApp.style.display = 'none';
            switchAuthTab2('register2');
        }
    } catch (error) {
        console.error('❌ Auth check error:', error);
        authContainer.style.display = 'block';
        dashboardApp.style.display = 'none';
        switchAuthTab2('register2');
    }
}

// ============================================================
// UPDATE PROGRAMS FUNCTION
// ============================================================
function updatePrograms() {
    const school = document.getElementById('school')?.value;
    const programSelect = document.getElementById('program');
    
    if (!programSelect) return;
    
    programSelect.innerHTML = '<option value="">-- Select Course --</option>';
    
    const programs = {
        'nursing': [
            { value: 'KRCHN', label: 'KRCHN Nursing - 3.5 years' },
            { value: 'DCHN', label: 'DCHN Nursing - 3.5 years' }
        ],
        'healthcare': [
            { value: 'CNA', label: 'Certificate in Nursing Assistant (CNA) - 6 Months' },
            { value: 'CAREGIVER', label: 'Artisan in Caregiver - 2 Modules' },
            { value: 'HSS', label: 'Certificate in Health Services Support (Level 5) - 4 Modules' },
            { value: 'HBC', label: 'Craft in Homebased Care Level 3 - 2 Modules' },
            { value: 'HSSM', label: 'Health Systems Support Management (Level 6) - 6 Modules' }
        ],
        'health_social': [
            { value: 'DPOTT', label: 'Diploma in Perioperative Theatre Technology (Level 6) - 6 Modules' },
            { value: 'CPOTT', label: 'Certificate in Perioperative Theatre Technology (Level 5) - 4 Modules' },
            { value: 'DCH', label: 'Diploma in Community Health (Level 6) - 7 Modules' },
            { value: 'CCH', label: 'Certificate in Community Health (Level 5) - 4 Modules' },
            { value: 'DSW', label: 'Diploma in Social Work & Community Devt (Level 6) - 5 Modules' },
            { value: 'CSW', label: 'Certificate in Social Work & Community Devt (Level 5) - 3 Modules' },
            { value: 'DHRIT', label: 'Diploma in Health Records & IT (Level 6) - 7 Modules' },
            { value: 'CHRIT', label: 'Certificate in Health Records & IT (Level 5) - 4 Modules' },
            { value: 'COMT', label: 'Diploma in Orthopedic & Trauma Medicine (Level 6) - 6 Modules' },
            { value: 'COTM', label: 'Certificate in Orthopedic & Trauma Medicine (Level 5) - 4 Modules' },
            { value: 'DME', label: 'Diploma in Bio-Medical Engineering (Level 6) - 7 Modules' },
            { value: 'CBME', label: 'Certificate in Bio-Medical Engineering (Level 5) - 4 Modules' },
            { value: 'DSL', label: 'Diploma in Science Laboratory (Level 6) - 5 Modules' },
            { value: 'CSL', label: 'Certificate in Science Laboratory (Level 5) - 3 Modules' },
            { value: 'DCJS', label: 'Diploma in Criminal Safety Justice (Level 6) - 5 Modules' },
            { value: 'CCJS', label: 'Certificate in Criminal Safety Justice (Level 5) - 4 Modules' }
        ],
        'ict': [
            { value: 'DICT', label: 'Diploma in Information Communication Technology - 6 Modules' },
            { value: 'CICT', label: 'Certificate in Information Communication Technology - 4 Modules' },
            { value: 'DCP', label: 'Diploma in Computer Programming - 6 Modules' },
            { value: 'DCS', label: 'Diploma in Computer Science - 6 Modules' },
            { value: 'NSA', label: 'Network System Administration - 4 Modules' },
            { value: 'DCSEC', label: 'Diploma in Cyber Security (Level 6) - 6 Modules' }
        ],
        'ict_short': [
            { value: 'CCA', label: 'Certificate in Computer Applications - 1 Month' },
            { value: 'EXCEL', label: 'Certificate in Advance Microsoft Excel - 1 Month' },
            { value: 'GD', label: 'Certificate in Graphic Design - 3 Months' },
            { value: 'DM', label: 'Certificate in Digital Marketing - 2 Months' },
            { value: 'OA', label: 'Certificate in Office Administrator - 3 Months' }
        ]
    };
    
    if (school && programs[school]) {
        programs[school].forEach(prog => {
            const option = document.createElement('option');
            option.value = prog.value;
            option.textContent = prog.label;
            programSelect.appendChild(option);
        });
    }
}

// ============================================================
// TOGGLE STUDENT TYPE
// ============================================================
function toggleStudentType() {
    const selected = document.querySelector('input[name="studentType"]:checked');
    if (selected) {
        selectType(selected.value);
    }
}

// ============================================================
// AUTH FUNCTIONS - HOME PAGE
// ============================================================
function switchAuthTab(tab) {
    const tabs = document.querySelectorAll('.auth-tabs .tab');
    const forms = document.querySelectorAll('.auth-form');
    
    tabs.forEach(t => t.classList.remove('active'));
    forms.forEach(f => f.classList.remove('active'));
    
    document.querySelector(`.auth-tabs .tab[data-tab="${tab}"]`)?.classList.add('active');
    document.getElementById(tab === 'login' ? 'loginForm' : 'registerForm')?.classList.add('active');
    
    document.getElementById('loginMessage').className = 'auth-message';
    document.getElementById('loginMessage').textContent = '';
    document.getElementById('registerMessage').className = 'auth-message';
    document.getElementById('registerMessage').textContent = '';
}

// ============================================================
// LOGIN USER - HOME PAGE
// ============================================================
async function loginUser() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const msg = document.getElementById('loginMessage');
    const btn = document.getElementById('loginBtn');

    const supabaseClient = getSupabase();
    if (!supabaseClient) {
        msg.className = 'auth-message error';
        msg.textContent = '❌ System error. Please refresh the page.';
        return;
    }

    msg.className = 'auth-message';
    msg.textContent = '';

    if (!email || !password) {
        msg.className = 'auth-message error';
        msg.textContent = '❌ Please enter both email and password.';
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;

        msg.className = 'auth-message success';
        msg.textContent = '✅ Signed in successfully!';
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';

        const { data: profile } = await supabaseClient
            .from('consolidated_user_profiles_table')
            .select('status, full_name')
            .eq('user_id', data.user.id)
            .single();

        if (profile && profile.status === 'pending') {
            msg.textContent = '⏳ Your account is pending admin approval. You will be notified via email.';
            await supabaseClient.auth.signOut();
            return;
        }

        setTimeout(() => {
            navigateTo('register');
        }, 1000);
    } catch (error) {
        console.error('Login error:', error);
        msg.className = 'auth-message error';
        msg.textContent = '❌ ' + (error.message || 'Login failed.');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
    }
}

// ============================================================
// REGISTER USER - HOME PAGE (Auto-Login)
// ============================================================
async function registerUser() {
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regConfirmPassword').value;
    const msg = document.getElementById('registerMessage');
    const btn = document.getElementById('registerBtn');

    const supabaseClient = getSupabase();
    if (!supabaseClient) {
        msg.className = 'auth-message error';
        msg.textContent = '❌ System error. Please refresh the page.';
        return;
    }

    msg.className = 'auth-message';
    msg.textContent = '';

    if (!name || !email || !phone || !password || !confirm) {
        msg.className = 'auth-message error';
        msg.textContent = '❌ Please fill in all required fields.';
        return;
    }

    if (password.length < 8) {
        msg.className = 'auth-message error';
        msg.textContent = '❌ Password must be at least 8 characters.';
        return;
    }

    if (password !== confirm) {
        msg.className = 'auth-message error';
        msg.textContent = '❌ Passwords do not match.';
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';

    try {
        const { data: existing } = await supabaseClient
            .from('applications')
            .select('user_email')
            .eq('user_email', email)
            .maybeSingle();

        if (existing) {
            msg.className = 'auth-message error';
            msg.textContent = '❌ This email already has an application. Please login.';
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
            return;
        }

        const { data: authData, error: authError } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                    phone: phone,
                    role: 'applicant',
                    status: 'pending_application'
                }
            }
        });

        if (authError) throw authError;

        try {
            const { error: loginError } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });
            if (loginError) console.warn('Auto-login failed:', loginError);
        } catch (loginErr) {
            console.warn('Auto-login error:', loginErr);
        }

        const { error: appError } = await supabaseClient
            .from('applications')
            .insert([{
                user_id: authData.user.id,
                user_email: email,
                full_name: name,
                email: email,
                phone: phone,
                status: 'draft',
                created_at: new Date().toISOString()
            }]);

        if (appError) throw appError;

        msg.className = 'auth-message success';
        msg.textContent = '✅ Account created! You are now logged in. Please complete your application.';

        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';

        setTimeout(() => {
            navigateTo('register');
        }, 1500);

    } catch (error) {
        console.error('Registration error:', error);
        msg.className = 'auth-message error';
        msg.textContent = '❌ ' + (error.message || 'Registration failed. Please try again.');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
    }
}

// ============================================================
// LOGOUT USER
// ============================================================
function logoutUser() {
    const supabaseClient = getSupabase();
    if (supabaseClient) {
        supabaseClient.auth.signOut().then(() => {
            window.location.reload();
        });
    } else {
        window.location.reload();
    }
}

// ============================================================
// CHECK AUTH - HOME PAGE
// ============================================================
async function checkAuth() {
    const supabaseClient = getSupabase();
    if (!supabaseClient) {
        console.error('❌ Supabase client not available for auth check');
        const authContainer = document.getElementById('authContainer');
        const admissionApp = document.getElementById('admissionApp');
        if (authContainer) authContainer.style.display = 'block';
        if (admissionApp) admissionApp.style.display = 'none';
        return;
    }

    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (error) throw error;
        if (session) {
            currentUser = session.user;
            const authContainer = document.getElementById('authContainer');
            const admissionApp = document.getElementById('admissionApp');
            if (authContainer) authContainer.style.display = 'none';
            if (admissionApp) admissionApp.style.display = 'block';
            
            const userEmail = document.getElementById('userEmail');
            const userAvatar = document.getElementById('userAvatar');
            const emailInput = document.getElementById('email');
            
            if (userEmail) userEmail.textContent = currentUser.email;
            if (userAvatar) userAvatar.textContent = currentUser.email.charAt(0).toUpperCase();
            if (emailInput) emailInput.value = currentUser.email;
            
            await loadUserApplication(currentUser.id);
        } else {
            const authContainer = document.getElementById('authContainer');
            const admissionApp = document.getElementById('admissionApp');
            if (authContainer) authContainer.style.display = 'block';
            if (admissionApp) admissionApp.style.display = 'none';
        }
    } catch (error) {
        console.error('Auth error:', error);
        const authContainer = document.getElementById('authContainer');
        const admissionApp = document.getElementById('admissionApp');
        if (authContainer) authContainer.style.display = 'block';
        if (admissionApp) admissionApp.style.display = 'none';
    }
}

// ============================================================
// LOAD USER APPLICATION
// ============================================================
async function loadUserApplication(userId) {
    const supabaseClient = getSupabase();
    if (!supabaseClient) return;

    try {
        const { data, error } = await supabaseClient
            .from('applications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
            const app = data[0];
            applicationId = app.id;

            if (app.full_name) document.getElementById('fullName').value = app.full_name;
            if (app.phone) document.getElementById('phone').value = app.phone;
            if (app.alt_phone) document.getElementById('altPhone').value = app.alt_phone;
            if (app.national_id) document.getElementById('nationalId').value = app.national_id;
            if (app.dob) document.getElementById('dob').value = app.dob;
            if (app.gender) document.getElementById('gender').value = app.gender;
            if (app.address) document.getElementById('address').value = app.address;
            if (app.guardian_name) document.getElementById('guardianName').value = app.guardian_name;
            if (app.guardian_phone) document.getElementById('guardianPhone').value = app.guardian_phone;
            if (app.hear_about) document.getElementById('hearAbout').value = app.hear_about;
            if (app.program) document.getElementById('program').value = app.program;
            if (app.student_type) selectType(app.student_type);
            if (app.eligibility_passed) eligibilityPassed = app.eligibility_passed;
            if (app.kcse_validated) kcseValidated = app.kcse_validated;
            if (app.kcse_data) kcseDataExtracted = app.kcse_data;

            if (app.documents_uploaded) {
                app.documents_uploaded.forEach(doc => {
                    uploadedDocs[doc] = true;
                    const card = document.getElementById(`doc_${doc}`);
                    const statusEl = document.getElementById(`doc_${doc}_status`);
                    if (card) card.classList.add('uploaded');
                    if (statusEl) {
                        statusEl.textContent = '✅ Uploaded';
                        statusEl.style.color = 'var(--success)';
                    }
                });
            }

            updateProgramDesc();
            updateSummary();
            updateDocumentStatus();

            if (app.status === 'submitted') {
                const submitBtn = document.getElementById('submitBtn');
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = '✅ Already Submitted';
                }
            }
        }
    } catch (error) {
        console.error('Load application error:', error);
    }
}

// ============================================================
// SAVE APPLICATION
// ============================================================
async function saveApplication(step) {
    const supabaseClient = getSupabase();
    if (!supabaseClient || !currentUser) return;

    const data = {
        user_id: currentUser.id,
        user_email: currentUser.email,
        full_name: document.getElementById('fullName')?.value || '',
        phone: document.getElementById('phone')?.value || '',
        alt_phone: document.getElementById('altPhone')?.value || '',
        national_id: document.getElementById('nationalId')?.value || '',
        dob: document.getElementById('dob')?.value || '',
        gender: document.getElementById('gender')?.value || '',
        address: document.getElementById('address')?.value || '',
        guardian_name: document.getElementById('guardianName')?.value || '',
        guardian_phone: document.getElementById('guardianPhone')?.value || '',
        hear_about: document.getElementById('hearAbout')?.value || '',
        program: document.getElementById('program')?.value || '',
        program_name: programNames[document.getElementById('program')?.value] || '',
        intake: document.getElementById('intake')?.value || '',
        mode_of_study: document.getElementById('modeOfStudy')?.value || '',
        campus: document.getElementById('campus')?.value || '',
        prev_institution: document.getElementById('prevInstitution')?.value || '',
        prev_year: document.getElementById('prevYear')?.value || '',
        transfer_reason: document.getElementById('transferReason')?.value || '',
        student_type: studentType,
        eligibility_passed: eligibilityPassed || false,
        kcse_validated: kcseValidated || false,
        kcse_data: kcseDataExtracted,
        id_data: idDataExtracted,
        documents_uploaded: Object.keys(uploadedDocs).filter(k => uploadedDocs[k]),
        current_step: step || currentStep,
        updated_at: new Date().toISOString()
    };

    try {
        let result;
        if (applicationId) {
            result = await supabaseClient.from('applications').update(data).eq('id', applicationId);
        } else {
            result = await supabaseClient.from('applications').insert([data]).select();
            if (result.data && result.data.length > 0) {
                applicationId = result.data[0].id;
            }
        }
        if (result.error) throw result.error;
        return true;
    } catch (error) {
        console.error('Save error:', error);
        return false;
    }
}

// ============================================================
// STUDENT TYPE
// ============================================================
function selectType(type) {
    studentType = type;
    document.querySelectorAll('.student-type-card').forEach(c => c.classList.remove('selected'));
    document.querySelector(`.student-type-card[data-type="${type}"]`)?.classList.add('selected');
    document.querySelector(`.student-type-card[data-type="${type}"] input[type="radio"]`)?.setAttribute('checked', 'checked');

    const transferFields = document.getElementById('transferFields');
    const transcriptCard = document.getElementById('doc_transcript');

    if (type === 'transfer') {
        if (transferFields) transferFields.style.display = 'block';
        if (transcriptCard) transcriptCard.style.display = 'block';
        document.getElementById('prevInstitution').required = true;
        document.getElementById('prevYear').required = true;
    } else {
        if (transferFields) transferFields.style.display = 'none';
        if (transcriptCard) transcriptCard.style.display = 'none';
        document.getElementById('prevInstitution').required = false;
        document.getElementById('prevYear').required = false;
    }
    updateSummary();
    updateDocumentStatus();
}

// ============================================================
// PROGRAM FUNCTIONS
// ============================================================
function updateProgramDesc() {
    const select = document.getElementById('program');
    const desc = document.getElementById('programDesc');
    const map = {
        'KRCHN': '🎓 KRCHN Nursing · 3.5 years · Min C+',
        'DCHN': '🎓 DCHN Nursing · 3.5 years · Min C',
        'DPOTT': '🔬 Perioperative Theatre Technology · 2 years · Min C-',
        'DCH': '🏥 Community Health · 2 years · Min C-',
        'DHRIT': '📊 Health Records & IT · 2 years · Min C-',
        'DSL': '🧪 Science Lab · 2 years · Min C-',
        'DSW': '🤝 Social Work · 2 years · Min C-',
        'DCJS': '⚖️ Criminal Justice · 2 years · Min C-',
        'DHSS': '🏥 Health Support Services · 2 years · Min C-',
        'DICT': '💻 ICT · 2 years · Min C-',
        'DME': '⚙️ Medical Engineering · 2 years · Min C',
        'CPOTT': '🔬 Certificate POTT · 1 year · Min D+',
        'CCH': '🏥 Certificate CH · 1 year · Min D+',
        'CHRIT': '📊 Certificate HRIT · 1 year · Min D+',
        'CPC': '🩺 Patient Care · 6 months · Min D',
        'CSL': '🧪 Science Lab · 1 year · Min D+',
        'CSW': '🤝 Social Work · 1 year · Min D+',
        'CCJS': '⚖️ Criminal Justice · 1 year · Min D+',
        'CAG': '🌾 Agriculture · 1 year · Min D',
        'CHSS': '🏥 Health Support Services · 1 year · Min D+',
        'CICT': '💻 ICT · 1 year · Min D+',
        'CCG': '👴 Caregiver · 6 months · Min D',
        'COMT': '🦴 Orthopedic Trauma · 1 year · Min D+',
        'ACH': '🌿 Artisan CH · 6 months · Min D',
        'AAG': '🌾 Artisan Agriculture · 6 months · Min D',
        'ASW': '🤝 Artisan Social Work · 6 months · Min D',
        'CCA': '💻 Computer Applications · 3 months · No min',
        'PTE': '📚 TVET/CDACC PTE · No min'
    };
    if (desc && select) desc.textContent = map[select.value] || 'Select a program to see details';
    updateCriteria();
}

function updateCriteria() {
    const program = document.getElementById('program')?.value;
    const criteria = programCriteria[program];
    const content = document.getElementById('criteriaContent');
    if (!content) return;
    
    if (!criteria) {
        content.innerHTML = `<div class="criteria-item"><span class="criterion">Select a program to view criteria</span></div>`;
        return;
    }
    let html = `
        <div class="criteria-item"><span class="criterion">Minimum Grade</span><span class="requirement">${criteria.minGrade}</span></div>
        <div class="criteria-item"><span class="criterion">Required Subjects</span><span class="requirement">${criteria.subjects.length > 0 ? criteria.subjects.join(', ') : 'None'}</span></div>
    `;
    if (criteria.minSubjectGrades) {
        html += `<div class="criteria-item" style="border-bottom:none;padding-top:4px;">
            <span class="criterion" style="color:var(--gray-400);font-size:0.7rem;">Min subject grades:</span>
            <span class="requirement" style="font-size:0.7rem;color:var(--gray-500);">
                ${Object.entries(criteria.minSubjectGrades).map(([subj, grade]) => `${subj}: ${grade}`).join(' · ')}
            </span>
        </div>`;
    }
    content.innerHTML = html;
}

// ============================================================
// ENQUIRY HANDLER
// ============================================================
function handleEnquiry(event) {
    event.preventDefault();
    const name = document.getElementById('enquiryName')?.value.trim();
    const email = document.getElementById('enquiryEmail')?.value.trim();
    const phone = document.getElementById('enquiryPhone')?.value.trim();
    const subject = document.getElementById('enquirySubject')?.value.trim();
    const message = document.getElementById('enquiryMessage')?.value.trim();
    const status = document.getElementById('enquiryMessageStatus');
    
    if (!name || !email || !subject || !message) {
        if (status) {
            status.className = 'auth-message error';
            status.textContent = '❌ Please fill in all required fields.';
        }
        return;
    }
    
    if (status) {
        status.className = 'auth-message success';
        status.textContent = '✅ Your enquiry has been sent! We will get back to you within 24 hours.';
    }
    
    document.getElementById('enquiryName').value = '';
    document.getElementById('enquiryEmail').value = '';
    document.getElementById('enquiryPhone').value = '';
    document.getElementById('enquirySubject').value = '';
    document.getElementById('enquiryMessage').value = '';
}

// ============================================================
// OCR - KCSE DOCUMENT (FULLY WORKING)
// ============================================================
async function handleKCSEDocument(event) {
    const file = event.target.files[0];
    if (!file) return;

    console.log('📄 KCSE file selected:', file.name);

    const card = document.getElementById('doc_kcse');
    const statusEl = document.getElementById('doc_kcse_status');
    const fnameEl = document.getElementById('doc_kcse_filename');
    const ocrStatus = document.getElementById('ocr_kcse_status');
    const resultBox = document.getElementById('ocr_kcse_result');
    const overlay = document.getElementById('scanning_kcse');
    const dataContainer = document.getElementById('kcse_extracted_data');
    const validationResult = document.getElementById('kcse_validation_result');

    if (file.size > 10 * 1024 * 1024) {
        alert('❌ File too large. Max 10MB.');
        event.target.value = '';
        return;
    }

    // --- SHOW SCANNING OVERLAY ---
    if (overlay) {
        overlay.style.display = 'flex';
        overlay.style.pointerEvents = 'none';
    }
    if (ocrStatus) {
        ocrStatus.textContent = '⏳ Processing document...';
        ocrStatus.className = 'ocr-status pending';
        ocrStatus.style.color = '#f59e0b';
        ocrStatus.style.fontWeight = '600';
    }
    if (resultBox) {
        resultBox.style.display = 'none';
    }
    if (dataContainer) {
        dataContainer.innerHTML = `<div style="color:var(--gray-400);font-size:0.85rem;"><i class="fas fa-spinner fa-spin"></i> Extracting data from document...</div>`;
    }
    if (validationResult) {
        validationResult.innerHTML = '';
    }

    try {
        let imageUrl = URL.createObjectURL(file);
        
        // Handle PDF files
        if (file.type === 'application/pdf') {
            if (ocrStatus) ocrStatus.textContent = '⏳ Converting PDF to image...';
            try {
                const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
                const page = await pdf.getPage(1);
                const viewport = page.getViewport({ scale: 2.0 });
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const context = canvas.getContext('2d');
                await page.render({ canvasContext: context, viewport: viewport }).promise;
                imageUrl = canvas.toDataURL('image/png');
            } catch (pdfError) {
                console.warn('PDF conversion failed, trying as image:', pdfError);
            }
        }

        if (ocrStatus) ocrStatus.textContent = '⏳ Scanning with OCR (Tesseract)...';
        
        // Run OCR
        const result = await Tesseract.recognize(imageUrl, 'eng', {
            logger: (m) => {
                if (m.status === 'recognizing text') {
                    if (ocrStatus) ocrStatus.textContent = `⏳ OCR: ${Math.round(m.progress * 100)}%`;
                }
            }
        });
        
        const text = result.data.text;
        console.log('✅ OCR Complete. Text length:', text.length);

        // Parse the extracted text
        const extractedData = parseKCSEData(text);
        kcseDataExtracted = extractedData;

        // Mark as uploaded
        uploadedDocs['kcse'] = true;
        if (statusEl) {
            statusEl.textContent = `✅ ${file.name}`;
            statusEl.style.color = 'var(--success)';
            statusEl.style.fontWeight = '600';
        }
        if (fnameEl) fnameEl.textContent = file.name;
        if (card) card.classList.add('uploaded');

        // Display extracted data
        displayKCSEData(extractedData);
        
        // Validate against program
        validateKCSEAgainstProgram(extractedData);

        // Update status
        if (ocrStatus) {
            ocrStatus.textContent = '✅ OCR Complete - Data extracted successfully';
            ocrStatus.className = 'ocr-status success';
            ocrStatus.style.color = 'var(--success)';
            ocrStatus.style.fontWeight = '600';
        }
        if (resultBox) {
            resultBox.style.display = 'block';
            resultBox.style.animation = 'fadeIn 0.4s ease';
        }

        kcseValidated = true;

        // Auto-fill name if empty
        if (extractedData.name && !document.getElementById('fullName')?.value) {
            document.getElementById('fullName').value = extractedData.name;
        }

        // Clean up
        if (!file.type.startsWith('image/')) {
            URL.revokeObjectURL(imageUrl);
        }
        
        updateDocumentStatus();
        await saveApplication(currentStep);
        
    } catch (error) {
        console.error('❌ OCR Error:', error);
        if (ocrStatus) {
            ocrStatus.textContent = '❌ OCR Failed - Please try again';
            ocrStatus.className = 'ocr-status fail';
            ocrStatus.style.color = '#ef4444';
        }
        if (dataContainer) {
            dataContainer.innerHTML = `<div style="color:#ef4444;font-size:0.85rem;">❌ OCR failed. Please ensure the document is clear and try again.</div>`;
        }
        alert('Document scanning failed. Please ensure the document is clear and try again.');
    } finally {
        if (overlay) {
            overlay.style.display = 'none';
        }
    }
    updateSummary();
}

function parseKCSEData(text) {
    const data = { name: '', indexNumber: '', year: '', subjects: [], grades: {}, overallGrade: '' };
    const cleanText = text.replace(/\s+/g, ' ').trim();

    // Extract Name
    const nameMatch = cleanText.match(/Name:\s*([A-Za-z\s.]+)/i) || 
                      cleanText.match(/([A-Z][a-z]+\s+[A-Z][a-z]+\s+[A-Z][a-z]+)/);
    if (nameMatch) data.name = nameMatch[1].trim();

    // Extract Index Number
    const indexMatch = cleanText.match(/Index\s*(?:Number|No):?\s*([0-9]{8,12})/i) || 
                       cleanText.match(/([0-9]{8,12})/);
    if (indexMatch) data.indexNumber = indexMatch[1].trim();

    // Extract Year
    const yearMatch = cleanText.match(/20[0-9]{2}/);
    if (yearMatch) data.year = yearMatch[0];

    // Extract Subjects and Grades
    const subjectPattern = /([A-Za-z\s]+)\s+([A-E][+-]?)/g;
    let match;
    while ((match = subjectPattern.exec(cleanText)) !== null) {
        const subject = match[1].trim();
        const grade = match[2].trim();
        if (subject.length > 1 && subject.length < 30 && grade.length <= 2) {
            if (!data.subjects.some(s => s.toLowerCase() === subject.toLowerCase())) {
                data.subjects.push(subject);
                data.grades[subject] = grade;
            }
        }
    }

    // Extract Overall Grade
    const overallMatch = cleanText.match(/Overall\s*Grade:\s*([A-E][+-]?)/i) || 
                         cleanText.match(/Mean\s*Grade:\s*([A-E][+-]?)/i);
    if (overallMatch) data.overallGrade = overallMatch[1].trim();

    // Calculate overall grade if not found
    if (!data.overallGrade && Object.keys(data.grades).length > 0) {
        const grades = Object.values(data.grades);
        const points = grades.map(g => gradePoints[g] || 0);
        const avg = points.reduce((a, b) => a + b, 0) / points.length;
        if (avg >= 11) data.overallGrade = 'A';
        else if (avg >= 9.5) data.overallGrade = 'A-';
        else if (avg >= 8.5) data.overallGrade = 'B+';
        else if (avg >= 7.5) data.overallGrade = 'B';
        else if (avg >= 6.5) data.overallGrade = 'B-';
        else if (avg >= 5.5) data.overallGrade = 'C+';
        else if (avg >= 4.5) data.overallGrade = 'C';
        else if (avg >= 3.5) data.overallGrade = 'C-';
        else if (avg >= 2.5) data.overallGrade = 'D+';
        else if (avg >= 1.5) data.overallGrade = 'D';
        else data.overallGrade = 'E';
    }

    console.log('📊 Extracted KCSE Data:', data);
    return data;
}

function displayKCSEData(data) {
    const container = document.getElementById('kcse_extracted_data');
    if (!container) return;
    
    let html = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.25rem 1rem;font-size:0.85rem;padding:0.5rem 0;">
            <div><span style="color:var(--gray-500);font-weight:500;">Student Name:</span> <span style="color:var(--gray-800);font-weight:600;">${data.name || 'Not detected'}</span></div>
            <div><span style="color:var(--gray-500);font-weight:500;">Index Number:</span> <span style="color:var(--gray-800);font-weight:600;">${data.indexNumber || 'Not detected'}</span></div>
            <div><span style="color:var(--gray-500);font-weight:500;">Year:</span> <span style="color:var(--gray-800);font-weight:600;">${data.year || 'Not detected'}</span></div>
            <div><span style="color:var(--gray-500);font-weight:500;">Overall Grade:</span> <span style="color:var(--gray-800);font-weight:600;">${data.overallGrade || 'Not detected'}</span></div>
    `;
    if (data.subjects.length > 0) {
        html += `<div style="grid-column:span 2;margin-top:4px;padding-top:4px;border-top:1px solid var(--gray-200);">
            <span style="font-weight:600;font-size:0.7rem;color:var(--gray-500);">Subjects & Grades:</span><br>
            ${data.subjects.map(s => `<span style="font-size:0.7rem;background:var(--gray-100);padding:2px 8px;border-radius:4px;margin:2px;display:inline-block;">${s}: ${data.grades[s] || 'N/A'}</span>`).join('')}
        </div>`;
    }
    html += `</div>`;
    container.innerHTML = html;
}

function validateKCSEAgainstProgram(data) {
    const program = document.getElementById('program')?.value;
    const criteria = programCriteria[program];
    const validationResult = document.getElementById('kcse_validation_result');

    if (!validationResult) return;

    if (!criteria || !data.overallGrade) {
        validationResult.innerHTML = `<span style="color:var(--warning);">⚠️ Complete data not extracted. Ensure document is clear.</span>`;
        return;
    }

    const studentPoints = gradePoints[data.overallGrade] || 0;
    const minPoints = gradePoints[criteria.minGrade] || 0;
    let allPass = true;
    let messages = [];

    if (criteria.minGrade === 'None') {
        messages.push('✅ No minimum grade requirement');
    } else if (studentPoints >= minPoints) {
        messages.push(`✅ Overall ${data.overallGrade} meets ${criteria.minGrade}`);
    } else {
        messages.push(`❌ Overall ${data.overallGrade} below ${criteria.minGrade}`);
        allPass = false;
    }

    if (criteria.subjects && criteria.subjects.length > 0) {
        criteria.subjects.forEach(subject => {
            let foundGrade = null;
            for (const [key, value] of Object.entries(data.grades)) {
                if (key.toLowerCase().includes(subject.toLowerCase()) ||
                    subject.toLowerCase().includes(key.toLowerCase())) {
                    foundGrade = value;
                    break;
                }
            }
            const requiredGrade = criteria.minSubjectGrades[subject] || 'D';
            if (foundGrade) {
                if ((gradePoints[foundGrade] || 0) >= (gradePoints[requiredGrade] || 0)) {
                    messages.push(`✅ ${subject}: ${foundGrade} meets ${requiredGrade}`);
                } else {
                    messages.push(`❌ ${subject}: ${foundGrade} below ${requiredGrade}`);
                    allPass = false;
                }
            } else {
                messages.push(`⚠️ ${subject}: Not found in document`);
                allPass = false;
            }
        });
    }

    let html = allPass ?
        `<span class="validation-pass">✅ ELIGIBLE - You meet all requirements!</span>` :
        `<span class="validation-fail">❌ NOT ELIGIBLE - You do not meet all requirements.</span>`;
    html += `<div style="margin-top:6px;font-size:0.7rem;color:var(--gray-500);">${messages.map(m => `• ${m}`).join('<br>')}</div>`;
    validationResult.innerHTML = html;
    eligibilityPassed = allPass;
    updateSummary();
}

// ============================================================
// OCR - ID DOCUMENT (FULLY WORKING)
// ============================================================
async function handleIDDocument(event) {
    const file = event.target.files[0];
    if (!file) return;

    console.log('🪪 ID file selected:', file.name);

    const card = document.getElementById('doc_id');
    const statusEl = document.getElementById('doc_id_status');
    const fnameEl = document.getElementById('doc_id_filename');
    const ocrStatus = document.getElementById('ocr_id_status');
    const resultBox = document.getElementById('ocr_id_result');
    const overlay = document.getElementById('scanning_id');
    const dataContainer = document.getElementById('id_extracted_data');

    if (file.size > 10 * 1024 * 1024) {
        alert('❌ File too large. Max 10MB.');
        event.target.value = '';
        return;
    }

    // --- SHOW SCANNING OVERLAY ---
    if (overlay) {
        overlay.style.display = 'flex';
        overlay.style.pointerEvents = 'none';
    }
    if (ocrStatus) {
        ocrStatus.textContent = '⏳ Processing ID document...';
        ocrStatus.className = 'ocr-status pending';
        ocrStatus.style.color = '#f59e0b';
        ocrStatus.style.fontWeight = '600';
    }
    if (resultBox) {
        resultBox.style.display = 'none';
    }
    if (dataContainer) {
        dataContainer.innerHTML = `<div style="color:var(--gray-400);font-size:0.85rem;"><i class="fas fa-spinner fa-spin"></i> Extracting data from ID...</div>`;
    }

    try {
        let imageUrl = URL.createObjectURL(file);
        
        // Handle PDF files
        if (file.type === 'application/pdf') {
            if (ocrStatus) ocrStatus.textContent = '⏳ Converting PDF to image...';
            try {
                const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
                const page = await pdf.getPage(1);
                const viewport = page.getViewport({ scale: 2.0 });
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const context = canvas.getContext('2d');
                await page.render({ canvasContext: context, viewport: viewport }).promise;
                imageUrl = canvas.toDataURL('image/png');
            } catch (pdfError) {
                console.warn('PDF conversion failed:', pdfError);
            }
        }

        if (ocrStatus) ocrStatus.textContent = '⏳ Scanning ID with OCR...';
        
        // Run OCR
        const result = await Tesseract.recognize(imageUrl, 'eng', {
            logger: (m) => {
                if (m.status === 'recognizing text') {
                    if (ocrStatus) ocrStatus.textContent = `⏳ OCR: ${Math.round(m.progress * 100)}%`;
                }
            }
        });
        
        const text = result.data.text;
        console.log('✅ ID OCR Complete. Text length:', text.length);

        // Parse the extracted text
        const idData = parseIDData(text);
        idDataExtracted = idData;

        // Mark as uploaded
        uploadedDocs['id'] = true;
        if (statusEl) {
            statusEl.textContent = `✅ ${file.name}`;
            statusEl.style.color = 'var(--success)';
            statusEl.style.fontWeight = '600';
        }
        if (fnameEl) fnameEl.textContent = file.name;
        if (card) card.classList.add('uploaded');

        // Display extracted data
        displayIDData(idData);

        // Update status
        if (ocrStatus) {
            ocrStatus.textContent = '✅ OCR Complete - Data extracted successfully';
            ocrStatus.className = 'ocr-status success';
            ocrStatus.style.color = 'var(--success)';
            ocrStatus.style.fontWeight = '600';
        }
        if (resultBox) {
            resultBox.style.display = 'block';
            resultBox.style.animation = 'fadeIn 0.4s ease';
        }

        // Auto-fill fields if empty
        if (idData.idNumber && !document.getElementById('nationalId')?.value) {
            document.getElementById('nationalId').value = idData.idNumber;
        }
        if (idData.name && !document.getElementById('fullName')?.value) {
            document.getElementById('fullName').value = idData.name;
        }

        // Clean up
        if (!file.type.startsWith('image/')) {
            URL.revokeObjectURL(imageUrl);
        }
        
        updateDocumentStatus();
        await saveApplication(currentStep);
        
    } catch (error) {
        console.error('❌ ID OCR Error:', error);
        if (ocrStatus) {
            ocrStatus.textContent = '❌ OCR Failed - Please try again';
            ocrStatus.className = 'ocr-status fail';
            ocrStatus.style.color = '#ef4444';
        }
        if (dataContainer) {
            dataContainer.innerHTML = `<div style="color:#ef4444;font-size:0.85rem;">❌ OCR failed. Please ensure the document is clear and try again.</div>`;
        }
        alert('ID scanning failed. Please ensure the document is clear and try again.');
    } finally {
        if (overlay) {
            overlay.style.display = 'none';
        }
    }
    updateSummary();
}

function parseIDData(text) {
    const data = { name: '', idNumber: '', dob: '' };
    const cleanText = text.replace(/\s+/g, ' ').trim();

    // Extract Name
    const nameMatch = cleanText.match(/Name:\s*([A-Za-z\s.]+)/i) || 
                      cleanText.match(/([A-Z][a-z]+\s+[A-Z][a-z]+\s+[A-Z][a-z]+)/);
    if (nameMatch) data.name = nameMatch[1].trim();

    // Extract ID Number
    const idMatch = cleanText.match(/ID\s*(?:Number|No):?\s*([0-9]{7,9})/i) || 
                    cleanText.match(/([0-9]{7,9})/);
    if (idMatch) data.idNumber = idMatch[1].trim();

    // Extract DOB
    const dobMatch = cleanText.match(/DOB:\s*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i) || 
                     cleanText.match(/Birth:\s*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i) ||
                     cleanText.match(/([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/);
    if (dobMatch) data.dob = dobMatch[1].trim();

    console.log('🪪 Extracted ID Data:', data);
    return data;
}

function displayIDData(data) {
    const container = document.getElementById('id_extracted_data');
    if (!container) return;
    container.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.25rem 1rem;font-size:0.85rem;padding:0.5rem 0;">
            <div><span style="color:var(--gray-500);font-weight:500;">Full Name:</span> <span style="color:var(--gray-800);font-weight:600;">${data.name || 'Not detected'}</span></div>
            <div><span style="color:var(--gray-500);font-weight:500;">ID Number:</span> <span style="color:var(--gray-800);font-weight:600;">${data.idNumber || 'Not detected'}</span></div>
            <div><span style="color:var(--gray-500);font-weight:500;">Date of Birth:</span> <span style="color:var(--gray-800);font-weight:600;">${data.dob || 'Not detected'}</span></div>
        </div>
    `;
}

// ============================================================
// GENERAL DOCUMENT UPLOAD
// ============================================================
function handleDocUpload(event, docKey) {
    const file = event.target.files[0];
    if (!file) return;

    const card = document.getElementById(`doc_${docKey}`);
    const statusEl = document.getElementById(`doc_${docKey}_status`);
    const fnameEl = document.getElementById(`doc_${docKey}_filename`);

    if (file.size > 5 * 1024 * 1024) {
        alert('❌ File too large. Max 5MB.');
        event.target.value = '';
        return;
    }

    uploadedDocs[docKey] = true;
    if (statusEl) {
        statusEl.textContent = `✅ ${file.name}`;
        statusEl.style.color = 'var(--success)';
        statusEl.style.fontWeight = '600';
    }
    if (fnameEl) fnameEl.textContent = file.name;
    if (card) card.classList.add('uploaded');
    updateSummary();
    updateDocumentStatus();
    saveApplication(currentStep);
}

function removeDocument(docKey) {
    delete uploadedDocs[docKey];
    const card = document.getElementById(`doc_${docKey}`);
    const statusEl = document.getElementById(`doc_${docKey}_status`);
    const fnameEl = document.getElementById(`doc_${docKey}_filename`);
    const input = document.getElementById(`doc_${docKey}_input`);
    
    if (statusEl) {
        statusEl.textContent = 'Not uploaded';
        statusEl.style.color = 'var(--gray-400)';
        statusEl.style.fontWeight = '400';
    }
    if (fnameEl) fnameEl.textContent = 'No file chosen';
    if (card) card.classList.remove('uploaded');
    if (input) input.value = '';

    if (docKey === 'kcse') {
        kcseValidated = false;
        eligibilityPassed = false;
        const resultBox = document.getElementById('ocr_kcse_result');
        const ocrStatus = document.getElementById('ocr_kcse_status');
        const validationResult = document.getElementById('kcse_validation_result');
        if (resultBox) resultBox.style.display = 'none';
        if (ocrStatus) ocrStatus.textContent = '';
        if (validationResult) validationResult.innerHTML = '';
    }
    if (docKey === 'id') {
        const resultBox = document.getElementById('ocr_id_result');
        const ocrStatus = document.getElementById('ocr_id_status');
        if (resultBox) resultBox.style.display = 'none';
        if (ocrStatus) ocrStatus.textContent = '';
    }
    updateSummary();
    updateDocumentStatus();
    saveApplication(currentStep);
}

// ============================================================
// UPDATE DOCUMENT STATUS IN STEP 4
// ============================================================
function updateDocumentStatus() {
    const docStatusMap = {
        'kcse': 'KCSE Certificate',
        'id': 'National ID',
        'recommendation': 'Recommendation Letter',
        'transcript': 'Academic Transcript'
    };

    for (const [key, label] of Object.entries(docStatusMap)) {
        const statusEl = document.getElementById(`doc_status_${key}`);
        if (statusEl) {
            if (uploadedDocs[key]) {
                statusEl.textContent = '✅ Uploaded';
                statusEl.style.color = 'var(--success)';
            } else {
                statusEl.textContent = '❌ Not uploaded';
                statusEl.style.color = 'var(--danger)';
            }
        }
    }

    // Show/hide transcript row
    const transcriptRow = document.getElementById('doc_status_transcript_row');
    if (transcriptRow) {
        if (studentType === 'transfer') {
            transcriptRow.style.display = 'block';
        } else {
            transcriptRow.style.display = 'none';
        }
    }
}

// ============================================================
// DRAFT SAVE
// ============================================================
function saveDraft() {
    saveApplication(currentStep);
    const msg = document.getElementById('submitMessage');
    if (msg) {
        msg.className = 'auth-message success';
        msg.textContent = '✅ Draft saved to cloud!';
        setTimeout(() => { msg.className = 'auth-message'; msg.textContent = ''; }, 3000);
    }
}

// ============================================================
// SUMMARY
// ============================================================
function updateSummary() {
    const name = document.getElementById('fullName')?.value || '—';
    const email = document.getElementById('email')?.value || '—';
    const phone = document.getElementById('phone')?.value || '—';
    const prog = document.getElementById('program');
    const progText = prog?.options[prog.selectedIndex]?.text || '—';
    const school = document.getElementById('school');
    const schoolText = school?.options[school.selectedIndex]?.text || '—';
    const campus = document.getElementById('campus');
    const campusText = campus?.options[campus.selectedIndex]?.text || '—';
    const intake = document.getElementById('intake');
    const intakeText = intake?.options[intake.selectedIndex]?.text || '—';
    const mode = document.getElementById('modeOfStudy');
    const modeText = mode?.options[mode.selectedIndex]?.text || '—';
    const count = Object.keys(uploadedDocs).filter(k => uploadedDocs[k]).length;
    const elig = eligibilityPassed ? '✅ Eligible' : '⏳ Pending';
    const validation = kcseValidated ? (eligibilityPassed ? '✅ Passed' : '❌ Failed') : '⏳ Not Scanned';
    const typeLabel = studentType === 'new' ? 'New Student' : 'Transfer Student';

    const ids = ['sumName', 'sumEmail', 'sumPhone', 'sumProgram', 'sumSchool', 'sumCampus', 'sumIntake', 'sumMode', 'sumStudentType', 'sumDocs', 'sumValidation', 'sumEligibility'];
    const values = [name, email, phone, progText, schoolText, campusText, intakeText, modeText, typeLabel, `${count} uploaded`, validation, elig];
    ids.forEach((id, i) => {
        const el = document.getElementById(id);
        if (el) el.textContent = values[i];
    });
}

// ============================================================
// SUBMIT ADMISSION
// ============================================================
async function submitAdmission() {
    if (!document.getElementById('termsCheck')?.checked) {
        showValidationModal('Terms & Conditions', 'Please agree to the terms before submitting', [
            { field: 'Terms & Conditions', section: 'Submission', hint: 'Check the box to agree' }
        ]);
        return;
    }
    if (!kcseValidated) {
        showValidationModal('KCSE Not Validated', 'Please scan your KCSE certificate first', [
            { field: 'KCSE Validation', section: 'Documents', hint: 'Upload and scan your KCSE certificate' }
        ]);
        return;
    }
    if (!eligibilityPassed) {
        showValidationModal('Not Eligible', 'You do not meet the program requirements', [
            { field: 'Eligibility', section: 'Documents', hint: 'Your KCSE grades do not meet the minimum requirements' }
        ]);
        return;
    }
    if (!uploadedDocs['recommendation']) {
        showValidationModal('Missing Document', 'Please upload a Recommendation Letter', [
            { field: 'Recommendation Letter', section: 'Documents', hint: 'Required for all applicants' }
        ]);
        return;
    }
    if (!uploadedDocs['id']) {
        showValidationModal('Missing Document', 'Please upload your National ID', [
            { field: 'National ID / Birth Certificate', section: 'Documents', hint: 'Required for all applicants' }
        ]);
        return;
    }
    if (studentType === 'transfer' && !uploadedDocs['transcript']) {
        showValidationModal('Missing Document', 'Transfer students must upload their Academic Transcript', [
            { field: 'Academic Transcript', section: 'Documents', hint: 'Required for transfer students' }
        ]);
        return;
    }

    const btn = document.getElementById('submitBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    }

    try {
        const data = {
            status: 'submitted',
            submitted_at: new Date().toISOString(),
            current_step: 4
        };

        const supabaseClient = getSupabase();
        if (!supabaseClient) throw new Error('Supabase client not available');

        let result;
        if (applicationId) {
            result = await supabaseClient.from('applications').update(data).eq('id', applicationId);
        } else {
            data.user_id = currentUser.id;
            data.user_email = currentUser.email;
            result = await supabaseClient.from('applications').insert([data]).select();
            if (result.data && result.data.length > 0) {
                applicationId = result.data[0].id;
            }
        }

        if (result.error) throw result.error;

        const successOverlay = document.getElementById('successOverlay');
        const refNumber = document.getElementById('refNumber');
        if (successOverlay) successOverlay.classList.add('show');
        if (refNumber) refNumber.textContent = `ADM-${Date.now().toString().slice(-6)}`;

    } catch (error) {
        console.error('Submit error:', error);
        const msg = document.getElementById('submitMessage');
        if (msg) {
            msg.className = 'auth-message error';
            msg.textContent = '❌ Failed to submit: ' + error.message;
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Application';
        }
    }
}

// ============================================================
// AUTH 2 FUNCTIONS (For Apply Now / Register Page)
// ============================================================

function switchAuthTab2(tab) {
    const container = document.getElementById('authContainer2');
    if (!container) return;

    const tabs = container.querySelectorAll('.auth-tabs .tab');
    const forms = container.querySelectorAll('.auth-form');

    tabs.forEach(t => t.classList.remove('active'));
    forms.forEach(f => f.classList.remove('active'));

    const tabBtn = container.querySelector(`.auth-tabs .tab[data-tab="${tab}"]`);
    if (tabBtn) tabBtn.classList.add('active');

    const formId = tab === 'login2' ? 'loginForm2' : 'registerForm2';
    const form = document.getElementById(formId);
    if (form) form.classList.add('active');

    document.getElementById('loginMessage2').className = 'auth-message';
    document.getElementById('loginMessage2').textContent = '';
    document.getElementById('registerMessage2').className = 'auth-message';
    document.getElementById('registerMessage2').textContent = '';
}

async function loginUser2() {
    const email = document.getElementById('loginEmail2').value.trim();
    const password = document.getElementById('loginPassword2').value;
    const msg = document.getElementById('loginMessage2');
    const btn = document.getElementById('loginBtn2');

    const supabaseClient = getSupabase();
    if (!supabaseClient) {
        msg.className = 'auth-message error';
        msg.textContent = '❌ System error. Please refresh the page.';
        return;
    }

    msg.className = 'auth-message';
    msg.textContent = '';

    if (!email || !password) {
        msg.className = 'auth-message error';
        msg.textContent = '❌ Please enter both email and password.';
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;

        msg.className = 'auth-message success';
        msg.textContent = '✅ Signed in successfully!';
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';

        const { data: profile } = await supabaseClient
            .from('consolidated_user_profiles_table')
            .select('status, full_name')
            .eq('user_id', data.user.id)
            .single();

        if (profile && profile.status === 'pending') {
            msg.textContent = '⏳ Your account is pending admin approval. You will be notified via email.';
            await supabaseClient.auth.signOut();
            return;
        }

        setTimeout(() => {
            window.location.reload();
        }, 1000);
    } catch (error) {
        console.error('Login error:', error);
        msg.className = 'auth-message error';
        msg.textContent = '❌ ' + (error.message || 'Login failed.');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
    }
}

async function registerUser2() {
    const name = document.getElementById('regName2').value.trim();
    const email = document.getElementById('regEmail2').value.trim();
    const phone = document.getElementById('regPhone2').value.trim();
    const password = document.getElementById('regPassword2').value;
    const confirm = document.getElementById('regConfirmPassword2').value;
    const msg = document.getElementById('registerMessage2');
    const btn = document.getElementById('registerBtn2');

    const supabaseClient = getSupabase();
    if (!supabaseClient) {
        msg.className = 'auth-message error';
        msg.textContent = '❌ System error. Please refresh the page.';
        return;
    }

    msg.className = 'auth-message';
    msg.textContent = '';

    if (!name || !email || !phone || !password || !confirm) {
        msg.className = 'auth-message error';
        msg.textContent = '❌ Please fill in all required fields.';
        return;
    }

    if (password.length < 8) {
        msg.className = 'auth-message error';
        msg.textContent = '❌ Password must be at least 8 characters.';
        return;
    }

    if (password !== confirm) {
        msg.className = 'auth-message error';
        msg.textContent = '❌ Passwords do not match.';
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';

    try {
        const { data: existing } = await supabaseClient
            .from('applications')
            .select('user_email')
            .eq('user_email', email)
            .maybeSingle();

        if (existing) {
            msg.className = 'auth-message error';
            msg.textContent = '❌ This email already has an application. Please login.';
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
            return;
        }

        const { data: authData, error: authError } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                    phone: phone,
                    role: 'applicant',
                    status: 'pending_application'
                }
            }
        });

        if (authError) throw authError;

        try {
            const { error: loginError } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });
            if (loginError) console.warn('Auto-login failed:', loginError);
        } catch (loginErr) {
            console.warn('Auto-login error:', loginErr);
        }

        const { error: appError } = await supabaseClient
            .from('applications')
            .insert([{
                user_id: authData.user.id,
                user_email: email,
                full_name: name,
                email: email,
                phone: phone,
                status: 'draft',
                created_at: new Date().toISOString()
            }]);

        if (appError) throw appError;

        msg.className = 'auth-message success';
        msg.textContent = '✅ Account created! You are now logged in.';

        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';

        setTimeout(() => {
            window.location.reload();
        }, 1500);

    } catch (error) {
        console.error('Registration error:', error);
        msg.className = 'auth-message error';
        msg.textContent = '❌ ' + (error.message || 'Registration failed. Please try again.');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
    }
}

// ============================================================
// CONDITIONAL FIELD TOGGLES
// ============================================================

function toggleSponsor() {
    const val = document.getElementById('sponsored')?.value;
    const field = document.getElementById('sponsorField');
    const input = document.getElementById('sponsorName');
    if (!field) return;
    if (val === 'Yes') {
        field.className = 'col conditional-field visible';
        if (input) input.setAttribute('required', 'required');
    } else {
        field.className = 'col conditional-field hidden';
        if (input) input.removeAttribute('required');
    }
}

function toggleFather() {
    const val = document.getElementById('fatherAlive')?.value;
    const nameField = document.getElementById('fatherNameField');
    const phoneField = document.getElementById('fatherPhoneField');
    const nameInput = document.getElementById('fatherName');
    const phoneInput = document.getElementById('fatherPhone');
    if (!nameField || !phoneField) return;
    if (val === 'Yes') {
        nameField.className = 'form-group conditional-field visible';
        phoneField.className = 'form-group conditional-field visible';
        if (nameInput) nameInput.setAttribute('required', 'required');
        if (phoneInput) phoneInput.setAttribute('required', 'required');
    } else {
        nameField.className = 'form-group conditional-field hidden';
        phoneField.className = 'form-group conditional-field hidden';
        if (nameInput) nameInput.removeAttribute('required');
        if (phoneInput) phoneInput.removeAttribute('required');
    }
}

function toggleMother() {
    const val = document.getElementById('motherAlive')?.value;
    const nameField = document.getElementById('motherNameField');
    const phoneField = document.getElementById('motherPhoneField');
    const nameInput = document.getElementById('motherName');
    const phoneInput = document.getElementById('motherPhone');
    if (!nameField || !phoneField) return;
    if (val === 'Yes') {
        nameField.className = 'form-group conditional-field visible';
        phoneField.className = 'form-group conditional-field visible';
        if (nameInput) nameInput.setAttribute('required', 'required');
        if (phoneInput) phoneInput.setAttribute('required', 'required');
    } else {
        nameField.className = 'form-group conditional-field hidden';
        phoneField.className = 'form-group conditional-field hidden';
        if (nameInput) nameInput.removeAttribute('required');
        if (phoneInput) phoneInput.removeAttribute('required');
    }
}

function toggleDisability() {
    const val = document.getElementById('disability')?.value;
    const field = document.getElementById('disabilityField');
    const input = document.getElementById('disabilityDesc');
    if (!field) return;
    if (val === 'Yes') {
        field.className = 'col conditional-field visible';
        if (input) input.setAttribute('required', 'required');
    } else {
        field.className = 'col conditional-field hidden';
        if (input) input.removeAttribute('required');
    }
}

function toggleMedical() {
    const val = document.getElementById('medicalCondition')?.value;
    const field = document.getElementById('medicalField');
    const input = document.getElementById('medicalDesc');
    if (!field) return;
    if (val === 'Yes') {
        field.className = 'col conditional-field visible';
        if (input) input.setAttribute('required', 'required');
    } else {
        field.className = 'col conditional-field hidden';
        if (input) input.removeAttribute('required');
    }
}

function toggleEmployment() {
    const val = document.getElementById('employed')?.value;
    const field = document.getElementById('employmentField');
    const input = document.getElementById('employmentDesc');
    if (!field) return;
    if (val === 'Yes') {
        field.className = 'col col-3 conditional-field visible';
        if (input) input.setAttribute('required', 'required');
    } else {
        field.className = 'col col-3 conditional-field hidden';
        if (input) input.removeAttribute('required');
    }
}

// ============================================================
// PHOTO PREVIEW
// ============================================================

function previewPhoto(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('photoPreview');
    const fileName = document.getElementById('photoFileName');
    const upload = document.getElementById('photoUpload');
    if (!file || !preview) return;
    if (!file.type.startsWith('image/')) {
        alert('Please upload an image file.');
        event.target.value = '';
        return;
    }
    if (file.size > 4 * 1024 * 1024) {
        alert('File too large. Max 4MB.');
        event.target.value = '';
        return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        preview.innerHTML = `<img src="${e.target.result}" alt="Passport" />`;
        preview.classList.add('has-image');
        if (fileName) fileName.textContent = file.name;
        if (upload) upload.classList.add('uploaded');
    };
    reader.readAsDataURL(file);
}

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    const yearEl = document.getElementById('currentYear');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    // Initialize conditional fields
    setTimeout(function() {
        toggleSponsor();
        toggleFather();
        toggleMother();
        toggleDisability();
        toggleMedical();
        toggleEmployment();
    }, 100);

    // Check authentication on home page
    checkAuth();

    // Init form
    updateProgramDesc();
    updateSummary();
    updateDocumentStatus();

    // Register email validation (home page)
    const regEmail = document.getElementById('regEmail');
    if (regEmail) {
        regEmail.addEventListener('input', function() {
            const email = this.value.trim();
            const statusEl = document.getElementById('regEmailStatus');

            if (emailCheckTimeout) clearTimeout(emailCheckTimeout);

            if (!email) {
                if (statusEl) {
                    statusEl.textContent = '';
                    statusEl.style.color = '';
                }
                this.style.borderColor = '#e2e8f0';
                return;
            }

            if (!email.includes('@') || !email.includes('.')) {
                if (statusEl) {
                    statusEl.textContent = '❌ Invalid email format';
                    statusEl.style.color = '#ef4444';
                }
                this.style.borderColor = '#ef4444';
                return;
            }

            if (statusEl) {
                statusEl.textContent = '✅ Email format valid';
                statusEl.style.color = '#0b8a5e';
            }
            this.style.borderColor = '#0b8a5e';
        });
    }

    // Password strength (home page)
    const regPassword = document.getElementById('regPassword');
    if (regPassword) {
        regPassword.addEventListener('input', function() {
            const password = this.value;
            const bar = document.getElementById('strengthBar');
            const text = document.getElementById('strengthText');

            let score = 0;
            if (password.length >= 8) score++;
            if (password.length >= 12) score++;
            if (/[A-Z]/.test(password)) score++;
            if (/[a-z]/.test(password)) score++;
            if (/[0-9]/.test(password)) score++;
            if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

            const levels = [
                { text: 'Very Weak', cls: 'weak', width: '10%', color: '#ef4444' },
                { text: 'Weak', cls: 'weak', width: '25%', color: '#ef4444' },
                { text: 'Fair', cls: 'fair', width: '45%', color: '#f59e0b' },
                { text: 'Good', cls: 'good', width: '65%', color: '#3b82f6' },
                { text: 'Strong', cls: 'strong', width: '85%', color: '#0b8a5e' },
                { text: 'Very Strong', cls: 'strong', width: '100%', color: '#0b8a5e' }
            ];

            const level = Math.min(Math.floor(score / 1), 5);
            const result = levels[level] || levels[0];

            if (bar) {
                bar.style.width = result.width;
                bar.style.background = result.color;
            }
            if (text) {
                text.textContent = password.length > 0 ? `Strength: ${result.text}` : 'Enter a password';
                text.className = `strength-text ${password.length > 0 ? result.cls : ''}`;
            }
        });
    }

    // Password confirmation (home page)
    const regConfirm = document.getElementById('regConfirmPassword');
    if (regConfirm) {
        regConfirm.addEventListener('input', function() {
            const password = document.getElementById('regPassword').value;
            const confirm = this.value;
            const matchEl = document.getElementById('passwordMatch');

            if (!confirm) {
                if (matchEl) {
                    matchEl.textContent = '';
                    matchEl.className = 'password-match';
                }
                return;
            }

            if (password === confirm) {
                if (matchEl) {
                    matchEl.textContent = '✅ Passwords match';
                    matchEl.className = 'password-match match';
                }
            } else {
                if (matchEl) {
                    matchEl.textContent = '❌ Passwords do not match';
                    matchEl.className = 'password-match nomatch';
                }
            }
        });
    }

    // Register 2 - Email validation
    const regEmail2 = document.getElementById('regEmail2');
    if (regEmail2) {
        regEmail2.addEventListener('input', function() {
            const email = this.value.trim();
            const statusEl = document.getElementById('regEmailStatus2');

            if (!email) {
                if (statusEl) {
                    statusEl.textContent = '';
                    statusEl.style.color = '';
                }
                this.style.borderColor = '#e2e8f0';
                return;
            }

            if (!email.includes('@') || !email.includes('.')) {
                if (statusEl) {
                    statusEl.textContent = '❌ Invalid email format';
                    statusEl.style.color = '#ef4444';
                }
                this.style.borderColor = '#ef4444';
                return;
            }

            if (statusEl) {
                statusEl.textContent = '✅ Email format valid';
                statusEl.style.color = '#0b8a5e';
            }
            this.style.borderColor = '#0b8a5e';
        });
    }

    // Register 2 - Password strength
    const regPassword2 = document.getElementById('regPassword2');
    if (regPassword2) {
        regPassword2.addEventListener('input', function() {
            const password = this.value;
            const bar = document.getElementById('strengthBar2');
            const text = document.getElementById('strengthText2');

            let score = 0;
            if (password.length >= 8) score++;
            if (password.length >= 12) score++;
            if (/[A-Z]/.test(password)) score++;
            if (/[a-z]/.test(password)) score++;
            if (/[0-9]/.test(password)) score++;
            if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

            const levels = [
                { text: 'Very Weak', cls: 'weak', width: '10%', color: '#ef4444' },
                { text: 'Weak', cls: 'weak', width: '25%', color: '#ef4444' },
                { text: 'Fair', cls: 'fair', width: '45%', color: '#f59e0b' },
                { text: 'Good', cls: 'good', width: '65%', color: '#3b82f6' },
                { text: 'Strong', cls: 'strong', width: '85%', color: '#0b8a5e' },
                { text: 'Very Strong', cls: 'strong', width: '100%', color: '#0b8a5e' }
            ];

            const level = Math.min(Math.floor(score / 1), 5);
            const result = levels[level] || levels[0];

            if (bar) {
                bar.style.width = result.width;
                bar.style.background = result.color;
            }
            if (text) {
                text.textContent = password.length > 0 ? `Strength: ${result.text}` : 'Enter a password';
                text.className = `strength-text ${password.length > 0 ? result.cls : ''}`;
            }
        });
    }

    // Register 2 - Password confirmation
    const regConfirm2 = document.getElementById('regConfirmPassword2');
    if (regConfirm2) {
        regConfirm2.addEventListener('input', function() {
            const password = document.getElementById('regPassword2').value;
            const confirm = this.value;
            const matchEl = document.getElementById('passwordMatch2');

            if (!confirm) {
                if (matchEl) {
                    matchEl.textContent = '';
                    matchEl.className = 'password-match';
                }
                return;
            }

            if (password === confirm) {
                if (matchEl) {
                    matchEl.textContent = '✅ Passwords match';
                    matchEl.className = 'password-match match';
                }
            } else {
                if (matchEl) {
                    matchEl.textContent = '❌ Passwords do not match';
                    matchEl.className = 'password-match nomatch';
                }
            }
        });
    }

    // Enter key support for home page auth
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const activeTab = document.querySelector('.auth-tabs .tab.active');
            if (activeTab && activeTab.dataset.tab === 'login') {
                loginUser();
            } else if (activeTab && activeTab.dataset.tab === 'register') {
                registerUser();
            }
        }
    });

    // Enter key support for auth2
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const activeTab = document.querySelector('#authContainer2 .auth-tabs .tab.active');
            if (activeTab && activeTab.dataset.tab === 'login2') {
                loginUser2();
            } else if (activeTab && activeTab.dataset.tab === 'register2') {
                registerUser2();
            }
        }
    });

    // Check auth for register page when it becomes visible
    const registerPage = document.getElementById('page-register');
    if (registerPage) {
        const observer = new MutationObserver(function() {
            if (registerPage.classList.contains('active')) {
                checkAuthForRegisterPage();
            }
        });
        observer.observe(registerPage, { attributes: true, attributeFilter: ['class'] });
    }

    // Modal close on overlay click
    document.getElementById('validationModal')?.addEventListener('click', function(e) {
        if (e.target === this) closeValidation();
    });
    
    document.getElementById('successOverlay')?.addEventListener('click', function(e) {
        if (e.target === this) this.classList.remove('show');
    });

    // Close modal on ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeValidation();
        }
    });

    console.log('✅ NCHSM Admission System loaded with Ultra Modern Validation Modal');
});

// ============================================================
// MAKE FUNCTIONS GLOBALLY AVAILABLE
// ============================================================

window.navigateTo = navigateTo;
window.updatePrograms = updatePrograms;
window.toggleStudentType = toggleStudentType;
window.switchAuthTab = switchAuthTab;
window.loginUser = loginUser;
window.registerUser = registerUser;
window.logoutUser = logoutUser;
window.goToStep = goToStep;
window.selectType = selectType;
window.handleKCSEDocument = handleKCSEDocument;
window.handleIDDocument = handleIDDocument;
window.handleDocUpload = handleDocUpload;
window.removeDocument = removeDocument;
window.saveDraft = saveDraft;
window.submitAdmission = submitAdmission;
window.updateProgramDesc = updateProgramDesc;
window.updateCriteria = updateCriteria;
window.updateSummary = updateSummary;
window.updateDocumentStatus = updateDocumentStatus;
window.closeValidation = closeValidation;
window.showValidation = showValidation;
window.showValidationModal = showValidationModal;
window.scrollToFirstMissing = scrollToFirstMissing;
window.handleEnquiry = handleEnquiry;
window.switchAuthTab2 = switchAuthTab2;
window.loginUser2 = loginUser2;
window.registerUser2 = registerUser2;
window.checkAuthForRegisterPage = checkAuthForRegisterPage;
window.toggleSponsor = toggleSponsor;
window.toggleFather = toggleFather;
window.toggleMother = toggleMother;
window.toggleDisability = toggleDisability;
window.toggleMedical = toggleMedical;
window.toggleEmployment = toggleEmployment;
window.previewPhoto = previewPhoto;

console.log('✅ admissions.js loaded successfully with all functions registered');
