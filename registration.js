// ============================================
// REGISTRATION.JS - Complete JavaScript
// ============================================
// Hides the .html extension in the URL  
if (window.location.pathname.endsWith('.html')) {
    const cleanPath = window.location.pathname.replace(/\.html$/, '');
    window.history.replaceState({}, '', cleanPath);
} 
// ============================================
// SUPABASE CONFIGURATION
// ============================================
const SUPABASE_URL = 'https://lwhtjozfsmbyihenfunw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// STATE VARIABLES
// ============================================
let currentStep = 1;
let selectedStudentType = null; // 'continuing' or 'new'
let generatedStudentNumber = '';
let termsAccepted = false;
let studentIdCheckTimeout = null;
let studentIdCheckInProgress = false;
let emailCheckTimeout = null;
let emailCheckInProgress = false;

// ============================================
// STORED DOCUMENTS DATA
// ============================================
const uploadedDocs = {
    kcse: null,
    id: null,
    lecturer_id: null,
    kra_pin: null,
    university_cert: null,
    cv: null,
    profile_photo: null
};

// ============================================
// UTILITY FUNCTIONS
// ============================================
function showFeedback(message, type = 'success') {
    const messageDiv = document.getElementById('message');
    if (!messageDiv) return;
    messageDiv.textContent = message;
    messageDiv.className = `message ${type} show`;
    setTimeout(() => {
        messageDiv.classList.remove('show');
    }, 5000);
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getDocLabel(docType) {
    const labels = {
        kcse: 'KCSE Certificate',
        id: 'ID/Passport/Birth Cert',
        lecturer_id: 'National ID/Passport',
        kra_pin: 'KRA PIN Certificate',
        university_cert: 'University Certificate',
        cv: 'CV/Resume'
    };
    return labels[docType] || docType;
}

// ============================================
// STUDENT ID VALIDATION
// ============================================
function validateStudentIdWithDuplicate(studentId) {
    if (!studentId || studentId.trim() === '') {
        return { valid: false, message: 'Student ID is required' };
    }
    
    const cleaned = studentId.trim().toUpperCase();
    
    // Check if it's an auto-generated NCHSM number (for new students)
    if (cleaned.startsWith('NCHSM-')) {
        return { 
            valid: true, 
            format: 'generated',
            display: cleaned,
            isGenerated: true
        };
    }
    
    // FORMAT 1: KRCHN/XXXX/MAR/YYYY (Nursing)
    const krchnRegex = /^KRCHN\/(\d{4})\/(MAR)\/(\d{4})$/;
    const krchnMatch = cleaned.match(krchnRegex);
    if (krchnMatch) {
        const number = krchnMatch[1];
        const month = krchnMatch[2];
        const year = krchnMatch[3];
        
        if (month !== 'MAR') {
            return { valid: false, message: 'KRCHN intakes are only in March (MAR)' };
        }
        
        const yearNum = parseInt(year);
        if (yearNum < 2021 || yearNum > 2030) {
            return { valid: false, message: 'Year must be between 2021 and 2030' };
        }
        
        return { 
            valid: true, 
            format: 'krchn',
            program: 'KRCHN',
            number: number,
            month: month,
            year: year,
            display: `KRCHN/${number}/${month}/${year}`
        };
    }
    
    // TVET formats
    const tvetRegex2Digit = /^([A-Z]{2,5})\/(\d{4,5})\/(\d{2})\/(\d{2})$/;
    const tvetMatch2Digit = cleaned.match(tvetRegex2Digit);
    
    const tvetRegex4Digit = /^([A-Z]{2,5})\/(\d{4,5})\/(\d{2})\/(\d{4})$/;
    const tvetMatch4Digit = cleaned.match(tvetRegex4Digit);
    
    let tvetMatch = tvetMatch2Digit || tvetMatch4Digit;
    let is2DigitYear = !!tvetMatch2Digit;
    
    if (tvetMatch) {
        const program = tvetMatch[1];
        const number = tvetMatch[2];
        const month = tvetMatch[3];
        const year = tvetMatch[4];
        
        const validTvetPrograms = [
            'DPOTT', 'DCH', 'DHRIT', 'DSL', 'DSW', 
            'DCJS', 'DHSS', 'DICT', 'DME',
            'CPOTT', 'CCH', 'CHRIT', 'CPC', 'CSL', 'CSW', 
            'CCJS', 'CAG', 'CHSS', 'CICT',
            'CCG', 'COMT',
            'ACH', 'AAG', 'ASW',
            'CCA', 'PTE'
        ];
        
        if (!validTvetPrograms.includes(program)) {
            return { 
                valid: false, 
                message: `Invalid program "${program}". Valid: ${validTvetPrograms.join(', ')}` 
            };
        }
        
        const monthNum = parseInt(month);
        if (monthNum < 1 || monthNum > 12) {
            return { valid: false, message: 'Month must be 01-12' };
        }
        
        let yearNum = parseInt(year);
        let fullYear = year;
        
        if (is2DigitYear) {
            if (yearNum < 21 || yearNum > 30) {
                return { valid: false, message: 'Year must be 21-30 (2021-2030)' };
            }
            fullYear = '20' + year;
        } else {
            if (yearNum < 2021 || yearNum > 2030) {
                return { valid: false, message: 'Year must be between 2021 and 2030' };
            }
        }
        
        const monthNames = {
            '01': 'JAN', '02': 'FEB', '03': 'MAR', '04': 'APR',
            '05': 'MAY', '06': 'JUN', '07': 'JUL', '08': 'AUG',
            '09': 'SEP', '10': 'OCT', '11': 'NOV', '12': 'DEC'
        };
        
        const paddedNumber = number.padStart(5, '0');
        
        return { 
            valid: true, 
            format: 'tvet',
            program: program,
            number: number,
            paddedNumber: paddedNumber,
            month: month,
            monthName: monthNames[month] || month,
            year: year,
            fullYear: fullYear,
            display: `${program}/${paddedNumber}/${month}/${year}`,
            is2DigitYear: is2DigitYear
        };
    }
    
    return { 
        valid: false, 
        message: 'Invalid format. Use KRCHN/XXXX/MAR/YYYY for Nursing or PROGRAM/XXXXX/MM/YY or PROGRAM/XXXXX/MM/YYYY for TVET' 
    };
}

// ============================================
// STUDENT ID DUPLICATE CHECK
// ============================================
async function checkStudentIdExists(studentId) {
    if (!studentId || studentId.trim() === '') return false;
    
    try {
        const { data, error } = await sb.rpc('check_student_id_exists', {
            p_student_id: studentId.trim()
        });
        
        if (error) {
            console.error('Error checking student ID:', error);
            return false;
        }
        
        return data || false;
    } catch (error) {
        console.error('Error checking student ID:', error);
        return false;
    }
}

// ============================================
// GET LAST STUDENT ADMISSION NUMBER
// ============================================
async function getLastStudentAdmissionNumber() {
    try {
        // Query the consolidated_user_profiles_table for the last student ID
        const { data, error } = await sb
            .from('consolidated_user_profiles_table')
            .select('student_id')
            .not('student_id', 'is', null)
            .like('student_id', 'NCHSM-%')
            .order('created_at', { ascending: false })
            .limit(1);
        
        if (error) {
            console.error('Error fetching last student ID:', error);
            return null;
        }
        
        if (data && data.length > 0 && data[0].student_id) {
            return data[0].student_id;
        }
        return null;
    } catch (error) {
        console.error('Error fetching last student ID:', error);
        return null;
    }
}

// ============================================
// GENERATE SEQUENTIAL STUDENT NUMBER
// ============================================
async function generateSequentialStudentNumber() {
    const year = new Date().getFullYear();
    const yearSuffix = year.toString().slice(-2);
    let nextNumber = 1;
    
    try {
        const lastStudentId = await getLastStudentAdmissionNumber();
        
        if (lastStudentId) {
            // Parse the number from the last ID
            // Format: NCHSM-YY-XXXX
            const match = lastStudentId.match(/NCHSM-(\d{2})-(\d{4})/);
            if (match) {
                const lastYear = parseInt(match[1]);
                const lastNum = parseInt(match[2]);
                
                if (lastYear === parseInt(yearSuffix)) {
                    // Same year, increment the number
                    nextNumber = lastNum + 1;
                } else {
                    // New year, start from 1
                    nextNumber = 1;
                }
            }
        }
    } catch (error) {
        console.error('Error generating sequential number:', error);
    }
    
    // Pad to 4 digits
    const paddedNumber = String(nextNumber).padStart(4, '0');
    return `NCHSM-${yearSuffix}-${paddedNumber}`;
}

// ============================================
// STUDENT TYPE SELECTION
// ============================================
function selectStudentType(type) {
    selectedStudentType = type;
    
    // Update UI
    document.querySelectorAll('.student-type-card').forEach(card => {
        card.classList.remove('selected');
        const radio = card.querySelector('input[type="radio"]');
        if (card.dataset.type === type) {
            card.classList.add('selected');
            radio.checked = true;
        } else {
            radio.checked = false;
        }
    });
    
    const studentIdInput = document.getElementById('student_id_number');
    const studentIdLabel = document.getElementById('studentIdLabel');
    const studentIdHint = document.getElementById('studentIdHint');
    const regDisplay = document.getElementById('regNumberDisplay');
    const statusEl = document.getElementById('student-id-status');
    const programMsg = document.getElementById('programRequiredMsg');
    
    if (type === 'continuing') {
        studentIdLabel.textContent = 'Student ID / Registration Number';
        studentIdHint.textContent = '(Enter your existing Student ID)';
        studentIdInput.placeholder = 'e.g., KRCHN/0032/MAR/2024 or DPOTT/10726/05/26';
        studentIdInput.value = '';
        studentIdInput.disabled = false;
        studentIdInput.required = true;
        regDisplay.classList.remove('show');
        programMsg.classList.remove('show');
        statusEl.textContent = '';
        statusEl.className = 'help-text';
        studentIdInput.style.borderColor = '#e2e8f0';
        studentIdInput.dataset.valid = '';
        
        if (studentIdInput.dataset.generated === 'true') {
            studentIdInput.value = '';
            studentIdInput.dataset.generated = 'false';
        }
    } else if (type === 'new') {
        studentIdLabel.textContent = 'Registration Number';
        studentIdHint.textContent = '(Auto-generated after selecting program)';
        studentIdInput.placeholder = 'Select program first to generate';
        studentIdInput.disabled = true;
        studentIdInput.required = true;
        studentIdInput.style.borderColor = '#f59e0b';
        
        const program = document.getElementById('program_type').value;
        if (program && program !== '') {
            regDisplay.classList.add('show');
            programMsg.classList.remove('show');
            studentIdInput.style.borderColor = '#10b981';
            generateSequentialStudentNumber().then(num => {
                generatedStudentNumber = num;
                document.getElementById('generatedRegNumber').textContent = num;
                studentIdInput.value = num;
                studentIdInput.dataset.generated = 'true';
                statusEl.textContent = `✅ Generated: ${num}`;
                statusEl.className = 'help-text valid';
            });
        } else {
            regDisplay.classList.remove('show');
            programMsg.classList.add('show');
            studentIdInput.value = '';
            studentIdInput.dataset.generated = 'false';
            statusEl.textContent = '⚠️ Please select your program first to generate a registration number.';
            statusEl.className = 'help-text warning';
        }
    }
}

// ============================================
// REGENERATE STUDENT ID
// ============================================
function regenerateStudentId() {
    if (selectedStudentType === 'new') {
        const program = document.getElementById('program_type').value;
        if (program && program !== '') {
            generateSequentialStudentNumber().then(num => {
                generatedStudentNumber = num;
                document.getElementById('generatedRegNumber').textContent = num;
                const studentIdInput = document.getElementById('student_id_number');
                studentIdInput.value = num;
                studentIdInput.dataset.generated = 'true';
                const statusEl = document.getElementById('student-id-status');
                statusEl.textContent = `✅ Generated: ${num}`;
                statusEl.className = 'help-text valid';
                showFeedback('✅ New registration number generated!', 'success');
            });
        } else {
            showFeedback('⚠️ Please select a program first.', 'warning');
        }
    }
}

// ============================================
// CHECK IF STUDENT ID IS VALID
// ============================================
function isStudentIdValid() {
    const input = document.getElementById('student_id_number');
    const status = document.getElementById('student-id-status');
    
    if (!input || !status) return false;
    
    const value = input.value.trim();
    if (!value) return false;
    
    if (value.startsWith('NCHSM-')) {
        return true;
    }
    
    if (status.classList.contains('invalid')) return false;
    if (status.classList.contains('checking')) return false;
    if (status.classList.contains('valid')) return true;
    
    const validation = validateStudentIdWithDuplicate(value);
    return validation.valid;
}

// ============================================
// VALIDATION MODAL
// ============================================
function showValidationModal(errors) {
    const modal = document.getElementById('validationModal');
    const errorList = document.getElementById('validationErrorList');
    const title = document.getElementById('validationModalTitle');
    const subtitle = document.getElementById('validationModalSubtitle');
    const icon = document.getElementById('validationModalIcon');
    
    if (!modal) return;
    
    errorList.innerHTML = '';
    
    if (errors && errors.length > 0) {
        title.textContent = '⚠️ Cannot Proceed';
        subtitle.textContent = `Please fix the following ${errors.length} issue(s) before continuing:`;
        icon.className = 'modal-icon error';
        icon.textContent = '⚠️';
        
        errors.forEach(error => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="error-icon">${error.icon || '❌'}</span>
                <div>
                    <span class="error-field">${error.field}:</span>
                    <span>${error.message}</span>
                </div>
            `;
            errorList.appendChild(li);
        });
    } else {
        title.textContent = '✅ All Good!';
        subtitle.textContent = 'No issues found. You can proceed.';
        icon.className = 'modal-icon success';
        icon.textContent = '✅';
        
        const li = document.createElement('li');
        li.style.borderLeftColor = '#10b981';
        li.innerHTML = `
            <span class="error-icon">✅</span>
            <div>
                <span>All fields are valid and ready to go!</span>
            </div>
        `;
        errorList.appendChild(li);
    }
    
    modal.classList.add('show');
    
    if (!errors || errors.length === 0) {
        setTimeout(() => {
            closeValidationModal();
        }, 3000);
    }
}

function closeValidationModal() {
    const modal = document.getElementById('validationModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// ============================================
// PROGRESS NAVIGATION
// ============================================
function goToStep(step) {
    if (step > currentStep) {
        const currentSection = document.querySelector(`.form-section[data-section="${currentStep}"]`);
        if (currentSection) {
            const role = document.getElementById('role').value;
            const inputs = currentSection.querySelectorAll('input[required], select[required]');
            let errors = [];
            
            for (const input of inputs) {
                const isHidden = input.closest('.role-fields') && !input.closest('.role-fields').classList.contains('active');
                if (isHidden) continue;
                if (input.closest('#lecturer-fields') && role !== 'lecturer') continue;
                if (input.closest('#student-fields') && role !== 'student') continue;
                if (input.type === 'file') continue;
                
                if (input.id === 'student_id_number' && role === 'student') {
                    const studentId = input.value.trim();
                    if (!studentId) {
                        input.style.borderColor = '#DC2626';
                        errors.push({
                            field: 'Student ID',
                            message: 'Please enter your Student ID or generate one.',
                            icon: '❌'
                        });
                        continue;
                    }
                    
                    const validation = validateStudentIdWithDuplicate(studentId);
                    if (!validation.valid) {
                        input.style.borderColor = '#DC2626';
                        errors.push({
                            field: 'Student ID',
                            message: validation.message,
                            icon: '❌'
                        });
                        continue;
                    }
                    
                    const statusEl = document.getElementById('student-id-status');
                    if (statusEl && statusEl.classList.contains('checking') && !studentId.startsWith('NCHSM-')) {
                        errors.push({
                            field: 'Student ID',
                            message: 'Please wait, checking Student ID availability...',
                            icon: '⏳'
                        });
                        continue;
                    }
                    
                    if (statusEl && statusEl.classList.contains('invalid') && !studentId.startsWith('NCHSM-')) {
                        input.style.borderColor = '#DC2626';
                        errors.push({
                            field: 'Student ID',
                            message: 'This Student ID is already registered.',
                            icon: '❌'
                        });
                        continue;
                    }
                    
                    input.style.borderColor = '#10b981';
                } else if (!input.value.trim()) {
                    input.style.borderColor = '#DC2626';
                    const label = input.previousElementSibling?.textContent?.trim() || 'This field';
                    errors.push({
                        field: label,
                        message: 'This field is required.',
                        icon: '📝'
                    });
                } else {
                    input.style.borderColor = '#e2e8f0';
                }
            }
            
            if (role === 'student' && !selectedStudentType) {
                errors.push({
                    field: 'Student Type',
                    message: 'Please select whether you are a Continuing or New student.',
                    icon: '📋'
                });
            }
            
            if (errors.length > 0) {
                const errorField = document.querySelector('input[style*="border-color: #DC2626"], select[style*="border-color: #DC2626"]');
                if (errorField) {
                    errorField.focus();
                    errorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                showValidationModal(errors);
                return;
            }
        }
    }
    
    currentStep = step;
    document.querySelectorAll('.form-section').forEach(section => {
        section.style.display = section.dataset.section == step ? 'block' : 'none';
    });
    updateProgress();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateProgress() {
    document.querySelectorAll('.progress-step').forEach(step => {
        const stepNum = parseInt(step.dataset.step);
        step.classList.remove('active', 'done');
        if (stepNum === currentStep) step.classList.add('active');
        else if (stepNum < currentStep) step.classList.add('done');
    });
}

// ============================================
// INTAKE PREVIEW
// ============================================
function updateIntakePreview() {
    const program = document.getElementById('program_type').value;
    const isKRCHN = program === 'KRCHN';
    const isTVET = program && program !== '' && program !== 'KRCHN';
    
    if (isKRCHN) {
        document.getElementById('krchn-intake').classList.remove('hidden');
        document.getElementById('tvet-intake').classList.add('hidden');
        const year = document.getElementById('krchn_intake_year').value || '2026';
        document.getElementById('krchnDisplay').textContent = `March ${year}`;
    } else if (isTVET) {
        document.getElementById('krchn-intake').classList.add('hidden');
        document.getElementById('tvet-intake').classList.remove('hidden');
        const month = document.getElementById('tvet_intake_month').value || '03';
        const year = document.getElementById('tvet_intake_year').value || '2026';
        const monthNames = {
            '01': 'January', '02': 'February', '03': 'March', '04': 'April',
            '05': 'May', '06': 'June', '07': 'July', '08': 'August',
            '09': 'September', '10': 'October', '11': 'November', '12': 'December'
        };
        let displayYear = year;
        if (year.length === 2) {
            displayYear = '20' + year;
        }
        document.getElementById('tvetDisplay').textContent = `${monthNames[month] || month} ${displayYear} Intake`;
    } else {
        document.getElementById('krchn-intake').classList.add('hidden');
        document.getElementById('tvet-intake').classList.add('hidden');
    }
}

function getDisplayIntake(program, year, month) {
    if (!year) return 'N/A';
    
    let fullYear = year;
    if (typeof year === 'string') {
        if (year.length === 2) {
            const yearNum = parseInt(year);
            if (yearNum >= 20 && yearNum <= 99) {
                fullYear = '20' + year;
            } else if (yearNum >= 0 && yearNum <= 19) {
                fullYear = '20' + year;
            }
        } else if (year.length === 4) {
            fullYear = year;
        }
    }
    
    const monthNames = {
        '01': 'January', '02': 'February', '03': 'March', '04': 'April',
        '05': 'May', '06': 'June', '07': 'July', '08': 'August',
        '09': 'September', '10': 'October', '11': 'November', '12': 'December',
        'JAN': 'January', 'FEB': 'February', 'MAR': 'March', 'APR': 'April',
        'MAY': 'May', 'JUN': 'June', 'JUL': 'July', 'AUG': 'August',
        'SEP': 'September', 'OCT': 'October', 'NOV': 'November', 'DEC': 'December'
    };
    
    if (program === 'KRCHN') {
        return `March ${fullYear}`;
    }
    
    if (month) {
        const monthName = monthNames[String(month).toUpperCase()] || month;
        if (monthName !== String(month).toUpperCase()) {
            return `${monthName} ${fullYear}`;
        } else {
            return `Intake ${fullYear} (${month})`;
        }
    }
    
    return `Intake ${fullYear}`;
}

function getIntakeData() {
    const program = document.getElementById('program_type').value;
    const isKRCHN = program === 'KRCHN';
    const isTVET = program && program !== '' && program !== 'KRCHN';
    let intakeYear = '';
    let intakeMonth = '';
    let intakeDisplay = '';
    if (isKRCHN) {
        intakeYear = document.getElementById('krchn_intake_year').value || '';
        intakeMonth = 'MAR';
        intakeDisplay = `March ${intakeYear}`;
    } else if (isTVET) {
        const year = document.getElementById('tvet_intake_year').value || '';
        const month = document.getElementById('tvet_intake_month').value || '03';
        intakeYear = year;
        intakeMonth = month;
        const monthNames = {
            '01': 'JAN', '02': 'FEB', '03': 'MAR', '04': 'APR',
            '05': 'MAY', '06': 'JUN', '07': 'JUL', '08': 'AUG',
            '09': 'SEP', '10': 'OCT', '11': 'NOV', '12': 'DEC'
        };
        intakeDisplay = `${monthNames[month] || month} ${year}`;
    }
    return { intake_year: intakeYear, intake_month: intakeMonth, display: intakeDisplay };
}

// ============================================
// EMAIL VALIDATION
// ============================================
async function checkEmailExists(email) {
    if (!email || email.length < 5) return false;
    try {
        const { data: profileData, error: profileError } = await sb
            .from('consolidated_user_profiles_table')
            .select('email')
            .eq('email', email)
            .maybeSingle();
        if (profileError) {
            console.error('Profile check error:', profileError);
            return false;
        }
        return !!profileData;
    } catch (error) {
        console.error('Error checking email:', error);
        return false;
    }
}

// ============================================
// DOCUMENT HANDLING
// ============================================
function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
        showFeedback('❌ Photo size exceeds 5MB limit.', 'error');
        event.target.value = '';
        return;
    }
    
    if (!file.type.startsWith('image/')) {
        showFeedback('❌ Please upload an image file.', 'error');
        event.target.value = '';
        return;
    }
    
    const preview = document.getElementById('photoPreview');
    const reader = new FileReader();
    
    const progressEl = document.getElementById('photoProgress');
    const progressBar = document.getElementById('photoProgressBar');
    progressEl.classList.add('active');
    
    reader.onload = function(e) {
        const oldImg = preview.querySelector('img');
        if (oldImg) oldImg.remove();
        const placeholderIcon = preview.querySelector('.placeholder-icon');
        const placeholderText = preview.querySelector('.placeholder-text');
        if (placeholderIcon) placeholderIcon.style.display = 'none';
        if (placeholderText) placeholderText.style.display = 'none';
        
        const img = document.createElement('img');
        img.src = e.target.result;
        img.alt = 'Profile photo';
        preview.prepend(img);
        
        const statusEl = document.getElementById('photoStatus');
        statusEl.textContent = `📸 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
        statusEl.className = 'photo-status uploaded';
        
        setTimeout(() => {
            progressEl.classList.remove('active');
            progressBar.style.width = '0%';
        }, 500);
        
        uploadedDocs.profile_photo = file;
        console.log('✅ Photo selected for upload:', file.name);
    };
    
    reader.onprogress = function(e) {
        if (e.lengthComputable) {
            const progress = (e.loaded / e.total) * 100;
            progressBar.style.width = progress + '%';
        }
    };
    
    reader.onerror = function() {
        showFeedback('❌ Failed to read photo file.', 'error');
        progressEl.classList.remove('active');
    };
    
    reader.readAsDataURL(file);
}

function handleDocumentUpload(event, docType) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
        showFeedback(`❌ ${getDocLabel(docType)} exceeds 5MB limit.`, 'error');
        event.target.value = '';
        return;
    }
    
    uploadedDocs[docType] = file;
    
    const card = document.getElementById(`doc_${docType}`);
    const statusEl = document.getElementById(`doc_${docType}_status`);
    const filenameEl = document.getElementById(`doc_${docType}_filename`);
    
    if (card) card.classList.add('uploaded');
    if (statusEl) {
        statusEl.textContent = '✅ Uploaded';
        statusEl.className = 'doc-status uploaded-text';
    }
    if (filenameEl) {
        filenameEl.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    }
    
    showFeedback(`✅ ${getDocLabel(docType)} uploaded successfully!`, 'success');
    
    const progressEl = document.getElementById('docUploadProgress');
    const progressBar = document.getElementById('docProgressBar');
    if (progressEl) {
        progressEl.classList.add('active');
        if (progressBar) progressBar.style.width = '100%';
    }
    setTimeout(() => {
        if (progressEl) {
            progressEl.classList.remove('active');
            if (progressBar) progressBar.style.width = '0%';
        }
    }, 800);
}

function removeDocument(docType) {
    uploadedDocs[docType] = null;
    const card = document.getElementById(`doc_${docType}`);
    const statusEl = document.getElementById(`doc_${docType}_status`);
    const filenameEl = document.getElementById(`doc_${docType}_filename`);
    
    if (card) card.classList.remove('uploaded');
    if (statusEl) {
        statusEl.textContent = 'Not uploaded';
        statusEl.className = 'doc-status';
    }
    if (filenameEl) filenameEl.textContent = '';
    
    const input = document.getElementById(`doc_${docType}_input`);
    if (input) input.value = '';
    
    showFeedback(`🗑️ ${getDocLabel(docType)} removed.`, 'warning');
}

// ============================================
// TERMS & CONDITIONS
// ============================================
function openTermsModal(e) {
    if (e) e.preventDefault();
    document.getElementById('termsModal').classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeTermsModal() {
    document.getElementById('termsModal').classList.remove('show');
    document.body.style.overflow = '';
}

function acceptTerms() {
    termsAccepted = true;
    document.getElementById('terms').checked = true;
    closeTermsModal();
    showFeedback('✅ You have accepted the Terms & Conditions.', 'success');
}

// ============================================
// DRAFT SAVE/LOAD
// ============================================
function saveDraft() {
    const formData = new FormData(document.getElementById('register-form'));
    const data = {};
    for (const [key, value] of formData.entries()) {
        data[key] = value;
    }
    data._docs = {};
    for (const [key, value] of Object.entries(uploadedDocs)) {
        data._docs[key] = value ? 'uploaded' : 'none';
    }
    data._studentType = selectedStudentType;
    data._generatedNumber = generatedStudentNumber;
    localStorage.setItem('registration_draft', JSON.stringify(data));
    showFeedback('✅ Draft saved! You can continue later.', 'success');
}

function loadDraft() {
    const saved = localStorage.getItem('registration_draft');
    if (!saved) {
        showFeedback('No saved draft found.', 'warning');
        return;
    }
    try {
        const data = JSON.parse(saved);
        Object.keys(data).forEach(key => {
            if (key === '_docs') {
                for (const [docType, status] of Object.entries(data._docs)) {
                    if (status === 'uploaded') {
                        const card = document.getElementById(`doc_${docType}`);
                        const statusEl = document.getElementById(`doc_${docType}_status`);
                        const filenameEl = document.getElementById(`doc_${docType}_filename`);
                        if (card) {
                            card.classList.add('uploaded');
                            if (statusEl) {
                                statusEl.textContent = '✅ Previously uploaded';
                                statusEl.className = 'doc-status uploaded-text';
                            }
                            if (filenameEl) {
                                filenameEl.textContent = 'Saved from draft';
                            }
                        }
                    }
                }
                return;
            }
            if (key === '_studentType') {
                if (data[key]) {
                    selectStudentType(data[key]);
                }
                return;
            }
            if (key === '_generatedNumber') {
                if (data[key]) {
                    generatedStudentNumber = data[key];
                    document.getElementById('generatedRegNumber').textContent = data[key];
                }
                return;
            }
            const input = document.querySelector(`[name="${key}"]`);
            if (input) {
                input.value = data[key];
                if (key === 'program_type') {
                    input.dispatchEvent(new Event('change'));
                }
            }
        });
        showFeedback('✅ Draft loaded successfully!', 'success');
        updateIntakePreview();
    } catch (e) {
        showFeedback('Error loading draft: ' + e.message, 'error');
    }
}

// ============================================
// ADD LECTURER TO STAFF_RECORDS
// ============================================
async function addStaffToRecords(userId, email, password, fullName, staffId, department, phone, gender, program) {
    try {
        const { data: existing } = await sb
            .from('staff_records')
            .select('id')
            .eq('email', email)
            .maybeSingle();
        
        if (existing) {
            console.log('⚠️ Staff already exists in staff_records:', email);
            return true;
        }
        
        let finalStaffId = staffId;
        if (!finalStaffId || finalStaffId.trim() === '') {
            const deptCodes = {
                'Nursing': 'NUR',
                'TVET': 'TVT',
                'Community Health': 'COM',
                'Health Records': 'HRT',
                'ICT': 'ICT',
                'Administration': 'ADM'
            };
            
            const deptCode = deptCodes[department] || 'STA';
            
            const { data: deptStaff } = await sb
                .from('staff_records')
                .select('id')
                .ilike('id', 'NCHSM' + deptCode + '-%')
                .order('created_at', { ascending: false });
            
            let nextNumber = 1;
            if (deptStaff && deptStaff.length > 0) {
                const lastId = deptStaff[0].id;
                const match = lastId.match(new RegExp('NCHSM' + deptCode + '-(\\d+)'));
                if (match) {
                    nextNumber = parseInt(match[1]) + 1;
                } else {
                    nextNumber = deptStaff.length + 1;
                }
            }
            
            finalStaffId = 'NCHSM' + deptCode + '-' + String(nextNumber).padStart(3, '0');
            console.log('🆕 Auto-generated Staff ID:', finalStaffId);
        }
        
        const nameParts = fullName.trim().split(' ');
        const firstName = nameParts[0] || '';
        const otherNames = nameParts.slice(1).join(' ') || '';
        
        if (!department) {
            console.error('❌ Department is required for lecturer registration');
            return false;
        }
        
        const staffProgram = program || 'N/A';
        
        const staffData = {
            id: finalStaffId,
            title: 'Mr.',
            first_name: firstName,
            other_names: otherNames,
            department: department,
            designation: 'lecturer',
            email: email,
            phone: phone || '',
            gender: gender || 'Male',
            login_enabled: false,
            password_hash: btoa(password),
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            program: staffProgram
        };
        
        const { error } = await sb
            .from('staff_records')
            .insert([staffData]);
        
        if (error) {
            console.error('❌ Failed to add staff to staff_records:', error);
            return false;
        }
        
        console.log('✅ Staff added to staff_records with ID:', finalStaffId);
        return true;
        
    } catch (error) {
        console.error('❌ Error adding staff to staff_records:', error);
        return false;
    }
}

// ============================================
// SUCCESS ANIMATION
// ============================================
function showSuccessAnimation(intakeDisplay) {
    const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];
    for (let i = 0; i < 80; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.left = Math.random() * 100 + '%';
        piece.style.top = '-10px';
        piece.style.background = colors[Math.floor(Math.random() * colors.length)];
        piece.style.width = (Math.random() * 8 + 4) + 'px';
        piece.style.height = (Math.random() * 8 + 4) + 'px';
        piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        piece.style.animationDuration = (Math.random() * 2 + 2) + 's';
        piece.style.animationDelay = (Math.random() * 1.5) + 's';
        document.body.appendChild(piece);
        setTimeout(() => piece.remove(), 4000);
    }
    document.getElementById('successIntakeText').textContent = intakeDisplay || 'N/A';
    document.getElementById('successOverlay').classList.add('show');
    let countdown = 5;
    const countdownEl = document.getElementById('successCountdown');
    const interval = setInterval(() => {
        countdown--;
        if (countdown <= 0) {
            clearInterval(interval);
            window.location.href = 'login.html';
        } else {
            countdownEl.textContent = countdown;
        }
    }, 1000);
}

// ============================================
// FORM SUBMISSION
// ============================================
document.getElementById('register-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = '';
    messageDiv.className = 'message';
    
    const btn = document.getElementById('register-btn');
    btn.disabled = true;
    document.getElementById('button-text').innerHTML = '<div class="btn-loading"></div> Creating Account...';
    
    if (!document.getElementById('terms').checked && !termsAccepted) {
        showFeedback('❌ Please agree to the Terms & Conditions.', 'error');
        btn.disabled = false;
        document.getElementById('button-text').textContent = '✅ Create Account';
        return;
    }
    
    const email = document.getElementById('email').value.trim();
    if (!isValidEmail(email)) {
        showFeedback('❌ Please enter a valid email address.', 'error');
        btn.disabled = false;
        document.getElementById('button-text').textContent = '✅ Create Account';
        return;
    }
    
    try {
        const emailExistsFinal = await checkEmailExists(email);
        if (emailExistsFinal) {
            showFeedback('❌ This email is already registered. Please use a different email or login.', 'error');
            btn.disabled = false;
            document.getElementById('button-text').textContent = '✅ Create Account';
            return;
        }
    } catch (error) {
        console.error('Final email check failed:', error);
    }
    
    const role = document.getElementById('role').value;
    const full_name = document.getElementById('full_name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const alt_phone = document.getElementById('alt_phone').value.trim() || '';
    const national_id = document.getElementById('national_id').value.trim() || '';
    const dob = document.getElementById('dob').value;
    const gender = document.getElementById('gender').value;
    const address = document.getElementById('address').value.trim() || '';
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm_password').value;
    
    const programSelect = document.getElementById('program_type');
    const program_type = programSelect.value;
    
    const student_id_number = document.getElementById('student_id_number').value.trim();
    const intakeData = getIntakeData();
    const guardian_name = document.getElementById('guardian_name').value.trim() || '';
    const guardian_phone = document.getElementById('guardian_phone').value.trim() || '';
    
    const department = document.getElementById('department').value;
    const employment_date = document.getElementById('employment_date').value || '';
    
    // Validations
    if (!full_name) {
        showFeedback('❌ Please enter your full name.', 'error');
        btn.disabled = false;
        document.getElementById('button-text').textContent = '✅ Create Account';
        return;
    }
    if (!phone) {
        showFeedback('❌ Please enter your phone number.', 'error');
        btn.disabled = false;
        document.getElementById('button-text').textContent = '✅ Create Account';
        return;
    }
    if (!dob) {
        showFeedback('❌ Please select your date of birth.', 'error');
        document.getElementById('dob').style.borderColor = '#DC2626';
        btn.disabled = false;
        document.getElementById('button-text').textContent = '✅ Create Account';
        return;
    }
    if (!gender) {
        showFeedback('❌ Please select your gender.', 'error');
        btn.disabled = false;
        document.getElementById('button-text').textContent = '✅ Create Account';
        return;
    }
    if (!role) {
        showFeedback('❌ Please select a role.', 'error');
        btn.disabled = false;
        document.getElementById('button-text').textContent = '✅ Create Account';
        return;
    }
    if (password !== confirmPassword) {
        showFeedback('❌ Passwords do not match.', 'error');
        btn.disabled = false;
        document.getElementById('button-text').textContent = '✅ Create Account';
        return;
    }
    if (password.length < 6) {
        showFeedback('❌ Password must be at least 6 characters.', 'error');
        btn.disabled = false;
        document.getElementById('button-text').textContent = '✅ Create Account';
        return;
    }
    
    if (role === 'student') {
        if (!selectedStudentType) {
            showFeedback('❌ Please select whether you are a Continuing or New student.', 'error');
            btn.disabled = false;
            document.getElementById('button-text').textContent = '✅ Create Account';
            return;
        }
        
        const studentId = document.getElementById('student_id_number').value.trim();
        if (!studentId) {
            showFeedback('❌ Please enter your Student ID or generate one.', 'error');
            document.getElementById('student_id_number').style.borderColor = '#DC2626';
            btn.disabled = false;
            document.getElementById('button-text').textContent = '✅ Create Account';
            return;
        }
        
        const validation = validateStudentIdWithDuplicate(studentId);
        if (!validation.valid) {
            showFeedback('❌ ' + validation.message, 'error');
            document.getElementById('student_id_number').style.borderColor = '#DC2626';
            btn.disabled = false;
            document.getElementById('button-text').textContent = '✅ Create Account';
            return;
        }
        
        if (selectedStudentType === 'continuing') {
            try {
                const exists = await checkStudentIdExists(studentId);
                if (exists) {
                    showFeedback('❌ This Student ID is already registered. Please contact administration.', 'error');
                    document.getElementById('student_id_number').style.borderColor = '#DC2626';
                    btn.disabled = false;
                    document.getElementById('button-text').textContent = '✅ Create Account';
                    return;
                }
            } catch (error) {
                console.error('Error checking student ID:', error);
                showFeedback('⚠️ Could not verify Student ID. Please try again.', 'warning');
                btn.disabled = false;
                document.getElementById('button-text').textContent = '✅ Create Account';
                return;
            }
        }
        
        if (!program_type) {
            showFeedback('❌ Please select your program.', 'error');
            btn.disabled = false;
            document.getElementById('button-text').textContent = '✅ Create Account';
            return;
        }
        if (!intakeData.intake_year) {
            showFeedback('❌ Please select your intake year.', 'error');
            btn.disabled = false;
            document.getElementById('button-text').textContent = '✅ Create Account';
            return;
        }
    }
    
    if (role === 'lecturer') {
        if (!department) {
            showFeedback('❌ Please select your department.', 'error');
            btn.disabled = false;
            document.getElementById('button-text').textContent = '✅ Create Account';
            return;
        }
    }
    
    const today = new Date();
    const admissionDate = today.toISOString().split('T')[0];
    const defaultBlock = 'Introductory';
    
    try {
        let userMetadata = {
            full_name, role, phone, alt_phone, national_id,
            date_of_birth: dob, gender, address, status: 'pending',
            student_type: selectedStudentType
        };
        
        if (role === 'student') {
            const programValue = document.getElementById('program_type').value;
            userMetadata = {
                ...userMetadata,
                student_id: student_id_number,
                program: programValue,
                intake_year: intakeData.intake_year,
                intake_month: intakeData.intake_month,
                current_block: defaultBlock,
                guardian_name: guardian_name,
                guardian_phone: guardian_phone,
                admission_date: admissionDate,
                admission_year: today.getFullYear().toString(),
                doc_kcse: uploadedDocs.kcse ? 'uploaded' : 'pending',
                doc_id: uploadedDocs.id ? 'uploaded' : 'pending',
                is_new_student: selectedStudentType === 'new'
            };
        } else if (role === 'lecturer') {
            userMetadata = { 
                ...userMetadata, 
                department: department,
                program: program_type,
                employment_date: employment_date,
                staff_id: 'AUTO_GENERATED',
                doc_lecturer_id: uploadedDocs.lecturer_id ? 'uploaded' : 'pending',
                doc_kra_pin: uploadedDocs.kra_pin ? 'uploaded' : 'pending',
                doc_university_cert: uploadedDocs.university_cert ? 'uploaded' : 'pending',
                doc_cv: uploadedDocs.cv ? 'uploaded' : 'pending'
            };
        }
        
        console.log('📤 Sending user data:', { email, metadata: userMetadata });
        
        const { data: authData, error: authError } = await sb.auth.signUp({
            email, 
            password,
            options: { 
                data: userMetadata
            }
        });
        
        if (authError) {
            if (authError.message.includes('User already registered')) {
                showFeedback('❌ This email is already registered. Please use a different email or login.', 'error');
                btn.disabled = false;
                document.getElementById('button-text').textContent = '✅ Create Account';
                return;
            }
            throw authError;
        }
        
        console.log('✅ Auth user created:', authData.user.id);
        
        if (role === 'lecturer') {
            console.log('👔 Adding lecturer to staff_records...');
            const staffAdded = await addStaffToRecords(
                authData.user.id,
                email,
                password,
                full_name,
                '',
                department,
                phone,
                gender,
                program_type
            );
            
            if (staffAdded) {
                console.log('✅ Lecturer added to staff_records successfully!');
            } else {
                console.warn('⚠️ Lecturer not added to staff_records');
            }
        }
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const { data: profile, error: profileError } = await sb
            .from('consolidated_user_profiles_table')
            .select('*')
            .eq('user_id', authData.user.id)
            .single();
        
        if (profileError) {
            console.warn('⚠️ Profile not found yet, continuing...');
        } else {
            console.log('✅ Profile created:', profile);
        }
        
        const userId = authData.user.id;
        const uploadPromises = [];
        
        if (uploadedDocs.profile_photo) {
            const photoFile = uploadedDocs.profile_photo;
            const photoExt = photoFile.name.split('.').pop();
            const photoPath = `profiles/${userId}/photo.${photoExt}`;
            const uploadPromise = sb.storage
                .from('user-documents')
                .upload(photoPath, photoFile, { upsert: true })
                .then(() => {
                    console.log('✅ Profile photo uploaded');
                    return sb.from('consolidated_user_profiles_table')
                        .update({ profile_photo_url: photoPath })
                        .eq('user_id', userId);
                })
                .catch(err => console.error('❌ Failed to upload profile photo:', err));
            uploadPromises.push(uploadPromise);
        }
        
        if (role === 'student') {
            const studentDocTypes = ['kcse', 'id'];
            for (const docType of studentDocTypes) {
                if (uploadedDocs[docType]) {
                    const file = uploadedDocs[docType];
                    const ext = file.name.split('.').pop();
                    const docPath = `documents/${userId}/${docType}.${ext}`;
                    const uploadPromise = sb.storage
                        .from('user-documents')
                        .upload(docPath, file, { upsert: true })
                        .then(() => {
                            console.log(`✅ ${docType} document uploaded`);
                            return sb.from('user_documents')
                                .insert({
                                    user_id: userId,
                                    document_type: docType,
                                    file_path: docPath,
                                    file_name: file.name,
                                    upload_date: new Date().toISOString()
                                });
                        })
                        .catch(err => console.error(`❌ Failed to upload ${docType}:`, err));
                    uploadPromises.push(uploadPromise);
                }
            }
        }
        
        if (role === 'lecturer') {
            const lecturerDocTypes = ['lecturer_id', 'kra_pin', 'university_cert', 'cv'];
            for (const docType of lecturerDocTypes) {
                if (uploadedDocs[docType]) {
                    const file = uploadedDocs[docType];
                    const ext = file.name.split('.').pop();
                    const docPath = `documents/${userId}/${docType}.${ext}`;
                    const uploadPromise = sb.storage
                        .from('user-documents')
                        .upload(docPath, file, { upsert: true })
                        .then(() => {
                            console.log(`✅ ${docType} document uploaded`);
                            return sb.from('user_documents')
                                .insert({
                                    user_id: userId,
                                    document_type: docType,
                                    file_path: docPath,
                                    file_name: file.name,
                                    upload_date: new Date().toISOString()
                                });
                        })
                        .catch(err => console.error(`❌ Failed to upload ${docType}:`, err));
                    uploadPromises.push(uploadPromise);
                }
            }
        }
        
        await Promise.allSettled(uploadPromises);
        
        const displayIntake = getDisplayIntake(program_type, intakeData.intake_year, intakeData.intake_month);
        showFeedback(`✅ Registration successful!`, 'success');
        
        showSuccessAnimation(displayIntake);
        localStorage.removeItem('registration_draft');
        
    } catch (error) {
        console.error('❌ Registration error:', error);
        let errorMessage = error.message || 'Unknown error';
        showFeedback(`❌ Registration failed: ${errorMessage}`, 'error');
        btn.disabled = false;
        document.getElementById('button-text').textContent = '✅ Create Account';
    }
});

// ============================================
// EVENT LISTENERS & INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Feather Icons
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
    
    // Initialize
    updateIntakePreview();
    updateProgress();
    document.getElementById('role').dispatchEvent(new Event('change'));
    
    // ============================================
    // STUDENT ID REAL-TIME VALIDATION
    // ============================================
    const studentIdInput = document.getElementById('student_id_number');
    const studentIdStatus = document.getElementById('student-id-status');
    
    if (studentIdInput && studentIdStatus) {
        studentIdInput.addEventListener('input', function() {
            // Skip validation for generated numbers
            if (this.value.trim().startsWith('NCHSM-')) {
                studentIdStatus.textContent = '✅ Auto-generated registration number';
                studentIdStatus.className = 'help-text valid';
                this.style.borderColor = '#10b981';
                this.dataset.valid = 'true';
                return;
            }
            
            const value = this.value.trim();
            
            if (!value) {
                studentIdStatus.textContent = '';
                studentIdStatus.className = 'help-text';
                this.style.borderColor = '#e2e8f0';
                this.dataset.valid = '';
                return;
            }
            
            const validation = validateStudentIdWithDuplicate(value);
            
            if (!validation.valid) {
                studentIdStatus.textContent = '❌ ' + validation.message;
                studentIdStatus.className = 'help-text invalid';
                this.style.borderColor = '#DC2626';
                this.dataset.valid = 'false';
                if (studentIdCheckTimeout) clearTimeout(studentIdCheckTimeout);
                return;
            }
            
            studentIdStatus.textContent = '⏳ Checking if ID is available...';
            studentIdStatus.className = 'help-text checking';
            this.style.borderColor = '#f59e0b';
            this.dataset.valid = 'checking';
            
            if (studentIdCheckTimeout) clearTimeout(studentIdCheckTimeout);
            
            studentIdCheckTimeout = setTimeout(async () => {
                if (studentIdCheckInProgress) return;
                studentIdCheckInProgress = true;
                
                try {
                    const exists = await checkStudentIdExists(value);
                    
                    if (exists) {
                        studentIdStatus.textContent = '❌ This Student ID is already registered. Please check and try again.';
                        studentIdStatus.className = 'help-text invalid';
                        this.style.borderColor = '#DC2626';
                        this.dataset.valid = 'false';
                    } else {
                        let formatText = '';
                        if (validation.format === 'krchn') {
                            formatText = `✅ Valid KRCHN format: ${validation.program} | #${validation.number} | ${validation.month} ${validation.year}`;
                        } else if (validation.format === 'tvet') {
                            formatText = `✅ Valid TVET format: ${validation.program} | #${validation.number} | ${validation.monthName} ${validation.fullYear}`;
                        }
                        studentIdStatus.textContent = formatText + ' ✅ Available';
                        studentIdStatus.className = 'help-text valid';
                        this.style.borderColor = '#10b981';
                        this.dataset.valid = 'true';
                        
                        const programSelect = document.getElementById('program_type');
                        if (programSelect && validation.program) {
                            const options = programSelect.options;
                            for (let option of options) {
                                if (option.value === validation.program) {
                                    option.selected = true;
                                    programSelect.dispatchEvent(new Event('change'));
                                    break;
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error checking student ID:', error);
                    studentIdStatus.textContent = '⚠️ Could not verify ID availability';
                    studentIdStatus.className = 'help-text warning';
                    this.dataset.valid = 'unknown';
                } finally {
                    studentIdCheckInProgress = false;
                }
            }, 800);
        });
    }
    
    // ============================================
    // PROGRAM SELECTION EVENT
    // ============================================
    document.getElementById('program_type').addEventListener('change', function() {
        const selected = this.options[this.selectedIndex];
        const desc = selected?.dataset?.desc || 'Select a program above to see details';
        document.getElementById('programDescription').textContent = desc;
        updateIntakePreview();
        
        if (selectedStudentType === 'new') {
            if (this.value && this.value !== '') {
                generateSequentialStudentNumber().then(num => {
                    generatedStudentNumber = num;
                    document.getElementById('generatedRegNumber').textContent = num;
                    const studentIdInput = document.getElementById('student_id_number');
                    studentIdInput.value = num;
                    studentIdInput.dataset.generated = 'true';
                    studentIdInput.style.borderColor = '#10b981';
                    document.getElementById('regNumberDisplay').classList.add('show');
                    document.getElementById('programRequiredMsg').classList.remove('show');
                    const statusEl = document.getElementById('student-id-status');
                    statusEl.textContent = `✅ Generated: ${num}`;
                    statusEl.className = 'help-text valid';
                });
            } else {
                document.getElementById('regNumberDisplay').classList.remove('show');
                document.getElementById('programRequiredMsg').classList.add('show');
                document.getElementById('student_id_number').value = '';
                document.getElementById('student_id_number').style.borderColor = '#f59e0b';
                document.getElementById('student-id-status').textContent = '⚠️ Please select your program first to generate a registration number.';
                document.getElementById('student-id-status').className = 'help-text warning';
            }
        }
    });
    
    // ============================================
    // EMAIL VALIDATION
    // ============================================
    document.getElementById('email').addEventListener('input', function() {
        const email = this.value.trim();
        const emailStatus = document.getElementById('email-status');
        
        if (emailCheckTimeout) clearTimeout(emailCheckTimeout);
        
        if (email && !isValidEmail(email)) {
            emailStatus.textContent = '❌ Invalid email format';
            emailStatus.style.color = '#DC2626';
            this.style.borderColor = '#DC2626';
            return;
        }
        
        if (email.length < 5) {
            emailStatus.textContent = '';
            this.style.borderColor = '#e2e8f0';
            return;
        }
        
        emailStatus.textContent = '⏳ Checking...';
        emailStatus.style.color = '#f59e0b';
        this.style.borderColor = '#f59e0b';
        
        emailCheckTimeout = setTimeout(async () => {
            if (emailCheckInProgress) return;
            emailCheckInProgress = true;
            
            try {
                const exists = await checkEmailExists(email);
                if (exists) {
                    emailStatus.textContent = '❌ Email already registered. Please use a different email.';
                    emailStatus.style.color = '#DC2626';
                    this.style.borderColor = '#DC2626';
                } else {
                    emailStatus.textContent = '✅ Email available';
                    emailStatus.style.color = '#10b981';
                    this.style.borderColor = '#10b981';
                }
            } catch (error) {
                console.error('Email check failed:', error);
                emailStatus.textContent = '⚠️ Could not verify email';
                emailStatus.style.color = '#f59e0b';
            } finally {
                emailCheckInProgress = false;
            }
        }, 500);
    });
    
    // ============================================
    // PASSWORD STRENGTH
    // ============================================
    document.getElementById('password').addEventListener('input', function() {
        const password = this.value;
        let strength = 0;
        if (password.length >= 6) strength++;
        if (password.length >= 10) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;
        
        const levels = [
            { text: 'Very Weak', class: 'text-weak', bar: 'strength-weak' },
            { text: 'Weak', class: 'text-weak', bar: 'strength-weak' },
            { text: 'Fair', class: 'text-fair', bar: 'strength-fair' },
            { text: 'Good', class: 'text-good', bar: 'strength-good' },
            { text: 'Strong', class: 'text-strong', bar: 'strength-strong' },
            { text: 'Very Strong', class: 'text-strong', bar: 'strength-strong' }
        ];
        
        const level = Math.min(Math.floor(strength / 1), 5);
        const result = levels[level] || levels[0];
        
        document.getElementById('strengthBar').className = `strength-bar ${result.bar}`;
        const textEl = document.getElementById('strengthText');
        textEl.textContent = password.length > 0 ? `Strength: ${result.text}` : 'Enter a password';
        textEl.className = `strength-text ${password.length > 0 ? result.class : ''}`;
    });
    
    document.getElementById('confirm_password').addEventListener('input', function() {
        const password = document.getElementById('password').value;
        const confirm = this.value;
        const matchEl = document.getElementById('passwordMatch');
        
        if (confirm.length === 0) {
            matchEl.textContent = '';
            matchEl.style.color = '#5b6e8c';
        } else if (password === confirm) {
            matchEl.textContent = '✅ Passwords match!';
            matchEl.style.color = '#10b981';
        } else {
            matchEl.textContent = '❌ Passwords do not match';
            matchEl.style.color = '#DC2626';
        }
    });
    
    // ============================================
    // INTAKE PREVIEW UPDATES
    // ============================================
    document.getElementById('krchn_intake_year').addEventListener('change', updateIntakePreview);
    document.getElementById('tvet_intake_month').addEventListener('change', updateIntakePreview);
    document.getElementById('tvet_intake_year').addEventListener('change', updateIntakePreview);
    
    // ============================================
    // ROLE TOGGLE
    // ============================================
    document.getElementById('role').addEventListener('change', function() {
        const isStudent = this.value === 'student';
        const isLecturer = this.value === 'lecturer';
        const studentFields = document.getElementById('student-fields');
        const lecturerFields = document.getElementById('lecturer-fields');
        const studentDocs = document.getElementById('student-docs');
        
        if (isStudent) {
            studentFields.style.display = 'block';
            studentFields.classList.add('active');
            studentFields.querySelectorAll('input, select').forEach(input => {
                if (input.id !== 'student_id_number' && 
                    input.id !== 'guardian_name' && 
                    input.id !== 'guardian_phone') {
                    input.setAttribute('required', '');
                }
            });
            if (studentDocs) studentDocs.style.display = 'grid';
            lecturerFields.querySelectorAll('input, select').forEach(input => {
                input.removeAttribute('required');
            });
            
            if (!selectedStudentType) {
                selectStudentType('continuing');
            }
        } else {
            studentFields.style.display = 'none';
            studentFields.classList.remove('active');
            studentFields.querySelectorAll('input, select').forEach(input => {
                input.removeAttribute('required');
            });
            if (studentDocs) studentDocs.style.display = 'none';
        }
        
        if (isLecturer) {
            lecturerFields.style.display = 'block';
            lecturerFields.classList.add('active');
            lecturerFields.querySelectorAll('input, select').forEach(input => {
                if (input.type === 'file') {
                    input.removeAttribute('required');
                    return;
                }
                if (input.id === 'employment_date') {
                    input.removeAttribute('required');
                    return;
                }
                if (input.id === 'department') {
                    input.setAttribute('required', '');
                } else {
                    input.removeAttribute('required');
                }
            });
        } else {
            lecturerFields.style.display = 'none';
            lecturerFields.classList.remove('active');
            lecturerFields.querySelectorAll('input, select').forEach(input => {
                input.removeAttribute('required');
            });
        }
        updateProgress();
    });
    
    // ============================================
    // TERMS MODAL CLOSE ON OUTSIDE CLICK
    // ============================================
    document.getElementById('termsModal').addEventListener('click', function(e) {
        if (e.target === this) closeTermsModal();
    });
    
    document.getElementById('validationModal').addEventListener('click', function(e) {
        if (e.target === this) closeValidationModal();
    });
    
    console.log('✅ Registration page loaded with:');
    console.log('  📸 Profile photo upload');
    console.log('  📁 Student: KCSE + ID documents');
    console.log('  📁 Lecturer: ID + KRA PIN + University Certificate + CV (Optional)');
    console.log('  🆔 Student Type: Continuing or New Student');
    console.log('  ✨ New Students: Sequential registration number generation');
    console.log('  🆔 Student ID validation (KRCHN and TVET formats)');
    console.log('  ✅ Student ID duplicate checking (real-time)');
    console.log('  👔 Lecturer Staff ID auto-generated');
    console.log('  ✅ Validation modal shows errors when proceeding');
});
