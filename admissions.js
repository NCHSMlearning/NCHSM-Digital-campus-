// ================================================================
// ADMISSIONS.JS - Complete Application Logic
// ================================================================
// Hides the .html extension in the URL
if (window.location.pathname.endsWith('.html')) {
    const cleanPath = window.location.pathname.replace(/\.html$/, '');
    window.history.replaceState({}, '', cleanPath);
}
// ================================================================
// SUPABASE CONFIGURATION
// ================================================================
if (typeof supabase === 'undefined') {
    const SUPABASE_URL = 'https://lwhtjozfsmbyihenfunw.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk';
    var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// ================================================================
// STATE VARIABLES
// ================================================================
let currentUser = null;
let currentStep = 1;
let uploadedDocs = {};
let eligibilityPassed = false;
let kcseValidated = false;
let applicationId = null;
let studentType = 'new';

// ================================================================
// COURSE DATA (from NCHSM document)
// ================================================================
const courseData = {
    nursing: [
        { code: 'CHN', name: 'Diploma Community Health Nursing (CHN)', duration: '3 Years', grade: 'C Plain', school: 'School of Nursing' }
    ],
    healthcare: [
        { code: 'CNA', name: 'Certificate in Nursing Assistant (CNA)', duration: '6 Months', grade: 'D-', school: 'School of Healthcare Assistant' },
        { code: 'ACG', name: 'Artisan in Caregiver', duration: '2 Modules', grade: 'D-', school: 'School of Healthcare Assistant' },
        { code: 'HSS', name: 'Certificate in Health Services Support (Level 5)', duration: '4 Modules', grade: 'D Plain', school: 'School of Healthcare Assistant' },
        { code: 'HBC', name: 'Craft in Homebased Care Level 3', duration: '2 Modules', grade: 'D Plain', school: 'School of Healthcare Assistant' },
        { code: 'HSSM', name: 'Health Systems Support Management (Level 6)', duration: '6 Modules', grade: 'C-', school: 'School of Healthcare Assistant' }
    ],
    health_social: [
        { code: 'DPOTT', name: 'Diploma in Perioperative Theatre Technology (Level 6)', duration: '6 Modules', grade: 'C Plain', school: 'School of Health, Social & Applied Sciences' },
        { code: 'CPOTT', name: 'Certificate in Perioperative Theatre Technology (Level 5)', duration: '4 Modules', grade: 'C-', school: 'School of Health, Social & Applied Sciences' },
        { code: 'DCH', name: 'Diploma in Community Health (Level 6)', duration: '7 Modules', grade: 'C-', school: 'School of Health, Social & Applied Sciences' },
        { code: 'CCH', name: 'Certificate in Community Health (Level 5)', duration: '4 Modules', grade: 'D+', school: 'School of Health, Social & Applied Sciences' },
        { code: 'DSW', name: 'Diploma in Social Work & Community Devt (Level 6)', duration: '5 Modules', grade: 'C-', school: 'School of Health, Social & Applied Sciences' },
        { code: 'CSW', name: 'Certificate in Social Work & Community Devt (Level 5)', duration: '3 Modules', grade: 'D+', school: 'School of Health, Social & Applied Sciences' },
        { code: 'DHRIT', name: 'Diploma in Health Records & IT (Level 6)', duration: '7 Modules', grade: 'C Plain', school: 'School of Health, Social & Applied Sciences' },
        { code: 'CHRIT', name: 'Certificate in Health Records & IT (Level 5)', duration: '4 Modules', grade: 'C-', school: 'School of Health, Social & Applied Sciences' },
        { code: 'DOTM', name: 'Diploma in Orthopedic & Trauma Medicine (Level 6)', duration: '6 Modules', grade: 'C Plain', school: 'School of Health, Social & Applied Sciences' },
        { code: 'COTM', name: 'Certificate in Orthopedic & Trauma Medicine (Level 5)', duration: '4 Modules', grade: 'C-', school: 'School of Health, Social & Applied Sciences' },
        { code: 'DBME', name: 'Diploma in Bio-Medical Engineering (Level 6)', duration: '7 Modules', grade: 'C-', school: 'School of Health, Social & Applied Sciences' },
        { code: 'CBME', name: 'Certificate in Bio-Medical Engineering (Level 5)', duration: '4 Modules', grade: 'D+', school: 'School of Health, Social & Applied Sciences' },
        { code: 'DSL', name: 'Diploma in Science Laboratory (Level 6)', duration: '5 Modules', grade: 'C-', school: 'School of Health, Social & Applied Sciences' },
        { code: 'CSL', name: 'Certificate in Science Laboratory (Level 5)', duration: '3 Modules', grade: 'D Plain', school: 'School of Health, Social & Applied Sciences' },
        { code: 'DCSJ', name: 'Diploma in Criminal Safety Justice (Level 6)', duration: '5 Modules', grade: 'C-', school: 'School of Health, Social & Applied Sciences' },
        { code: 'CCSJ', name: 'Certificate in Criminal Safety Justice (Level 5)', duration: '4 Modules', grade: 'D Plain', school: 'School of Health, Social & Applied Sciences' }
    ],
    ict: [
        { code: 'DICT', name: 'Diploma in Information Communication Technology', duration: '6 Modules', grade: 'C-', school: 'School of ICT' },
        { code: 'CICT', name: 'Certificate in Information Communication Technology', duration: '4 Modules', grade: 'D Plain', school: 'School of ICT' },
        { code: 'DCP', name: 'Diploma in Computer Programming', duration: '6 Modules', grade: 'C-', school: 'School of ICT' },
        { code: 'DCS', name: 'Diploma in Computer Science', duration: '6 Modules', grade: 'C Plain', school: 'School of ICT' },
        { code: 'NSA', name: 'Network System Administration', duration: '4 Modules', grade: 'C-', school: 'School of ICT' },
        { code: 'DCSec', name: 'Diploma in Cyber Security (Level 6)', duration: '6 Modules', grade: 'C-', school: 'School of ICT' }
    ],
    ict_short: [
        { code: 'CCA', name: 'Certificate in Computer Applications', duration: '1 Month', grade: 'Open', school: 'ICT Short Courses' },
        { code: 'CCE', name: 'Certificate in Advance Microsoft Excel', duration: '1 Month', grade: 'Open', school: 'ICT Short Courses' },
        { code: 'CGD', name: 'Certificate in Graphic Design', duration: '3 Months', grade: 'D-', school: 'ICT Short Courses' },
        { code: 'CDM', name: 'Certificate in Digital Marketing', duration: '2 Months', grade: 'Open', school: 'ICT Short Courses' },
        { code: 'COA', name: 'Certificate in Office Administrator', duration: '3 Months', grade: 'D Plain', school: 'ICT Short Courses' }
    ]
};

// ================================================================
// GRADE POINTS FOR VALIDATION
// ================================================================
const gradePoints = {
    'A': 12, 'A-': 11, 'B+': 10, 'B': 9, 'B-': 8,
    'C+': 7, 'C': 6, 'C-': 5, 'D+': 4, 'D': 3, 'D-': 2, 'E': 1
};

// ================================================================
// NAVIGATION
// ================================================================
function navigateTo(page) {
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
    const target = document.getElementById('page-' + page);
    if (target) target.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navLink = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (navLink) navLink.classList.add('active');

    if (page === 'login') {
        setTimeout(() => {
            navigateTo('home');
            setTimeout(() => switchAuthTab('login'), 100);
        }, 100);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ================================================================
// AUTH TABS
// ================================================================
function switchAuthTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.tab[data-tab="${tab}"]`).classList.add('active');

    document.getElementById('loginForm').classList.remove('active');
    document.getElementById('registerForm').classList.remove('active');

    if (tab === 'login') {
        document.getElementById('loginForm').classList.add('active');
        document.getElementById('authSubtitle').textContent = 'Sign in to continue your application';
    } else {
        document.getElementById('registerForm').classList.add('active');
        document.getElementById('authSubtitle').textContent = 'Create your account to get started';
    }

    document.getElementById('loginMessage').textContent = '';
    document.getElementById('registerMessage').textContent = '';
    document.getElementById('loginMessage').className = 'auth-message';
    document.getElementById('registerMessage').className = 'auth-message';
}

// ================================================================
// PASSWORD STRENGTH
// ================================================================
const pwdInput = document.getElementById('regPassword');
const confirmInput = document.getElementById('regConfirmPassword');

if (pwdInput) {
    pwdInput.addEventListener('input', function() {
        const val = this.value;
        let strength = 0;
        if (val.length >= 8) strength += 1;
        if (/[a-z]/.test(val) && /[A-Z]/.test(val)) strength += 1;
        if (/\d/.test(val)) strength += 1;
        if (/[^a-zA-Z0-9]/.test(val)) strength += 1;

        const percent = Math.min(strength * 25, 100);
        document.getElementById('strengthBar').style.width = percent + '%';

        let color = '#dc2626';
        let label = 'Weak';
        if (strength >= 4) { color = '#0f7b3a'; label = 'Strong'; }
        else if (strength === 3) { color = '#eab308'; label = 'Good'; }
        else if (strength === 2) { color = '#f59e0b'; label = 'Fair'; }
        document.getElementById('strengthBar').style.background = color;
        document.getElementById('strengthText').textContent = val.length === 0 ? 'Enter a password' : `${label} (${val.length} chars)`;
        checkMatch();
    });

    confirmInput.addEventListener('input', checkMatch);
}

function checkMatch() {
    const p = pwdInput ? pwdInput.value : '';
    const c = confirmInput ? confirmInput.value : '';
    const matchDiv = document.getElementById('passwordMatch');
    if (c.length === 0) { matchDiv.textContent = ''; return; }
    if (p === c) {
        matchDiv.textContent = '✅ Passwords match';
        matchDiv.style.color = '#0f7b3a';
    } else {
        matchDiv.textContent = '❌ Passwords do not match';
        matchDiv.style.color = '#dc2626';
    }
}

// ================================================================
// EMAIL AVAILABILITY CHECK
// ================================================================
const regEmail = document.getElementById('regEmail');
if (regEmail) {
    regEmail.addEventListener('input', function() {
        const status = document.getElementById('regEmailStatus');
        const email = this.value.trim();
        if (email.length === 0) { status.textContent = ''; status.className = 'help-text'; return; }
        if (!email.includes('@') || !email.includes('.')) {
            status.textContent = '⚠️ Please enter a valid email';
            status.className = 'help-text error-text';
            return;
        }
        if (email.toLowerCase().includes('test') || email.toLowerCase().includes('demo')) {
            status.textContent = '❌ This email is already registered (demo)';
            status.className = 'help-text error-text';
        } else {
            status.textContent = '✅ Email available';
            status.className = 'help-text success-text';
        }
    });
}

// ================================================================
// LOGIN
// ================================================================
async function loginUser() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const msg = document.getElementById('loginMessage');

    msg.className = 'auth-message';
    msg.textContent = '';

    if (!email || !password) {
        msg.className = 'auth-message error';
        msg.textContent = '❌ Please enter both email and password.';
        return;
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        msg.className = 'auth-message success';
        msg.textContent = '✅ Signed in successfully!';

        const { data: profile } = await supabase
            .from('consolidated_user_profiles_table')
            .select('status, full_name')
            .eq('user_id', data.user.id)
            .single();

        if (profile && profile.status === 'pending') {
            msg.textContent = '⏳ Your account is pending admin approval.';
            await supabase.auth.signOut();
            return;
        }

        setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
        msg.className = 'auth-message error';
        msg.textContent = '❌ ' + (error.message || 'Login failed.');
    }
}

// ================================================================
// REGISTER
// ================================================================
async function registerUser() {
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regConfirmPassword').value;
    const msg = document.getElementById('registerMessage');

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

    try {
        const { data: existing } = await supabase
            .from('consolidated_user_profiles_table')
            .select('email')
            .eq('email', email)
            .maybeSingle();

        if (existing) {
            msg.className = 'auth-message error';
            msg.textContent = '❌ This email is already registered.';
            return;
        }

        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: name, phone: phone, role: 'student', status: 'pending' }
            }
        });

        if (authError) throw authError;

        const { error: profileError } = await supabase
            .from('consolidated_user_profiles_table')
            .insert([{
                user_id: authData.user.id,
                email: email,
                full_name: name,
                phone: phone,
                role: 'student',
                status: 'pending',
                created_at: new Date().toISOString()
            }]);

        if (profileError) throw profileError;

        msg.className = 'auth-message success';
        msg.textContent = '✅ Account created! Please wait for admin approval.';

        setTimeout(() => { window.location.href = 'admission.html'; }, 3000);
    } catch (error) {
        msg.className = 'auth-message error';
        msg.textContent = '❌ ' + (error.message || 'Registration failed.');
    }
}

// ================================================================
// LOGOUT
// ================================================================
function logoutUser() {
    supabase.auth.signOut().then(() => { window.location.reload(); });
}

// ================================================================
// CHECK AUTH
// ================================================================
async function checkAuth() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (session) {
            currentUser = session.user;
            document.getElementById('authContainer').style.display = 'none';
            document.getElementById('admissionApp').style.display = 'block';
            document.getElementById('userEmail').textContent = currentUser.email;
            document.getElementById('userAvatar').textContent = currentUser.email.charAt(0).toUpperCase();
            document.getElementById('email').value = currentUser.email;
            document.getElementById('applicationNumber').textContent = `ADM-${Date.now().toString().slice(-6)}`;
            await loadUserApplication(currentUser.id);
        } else {
            document.getElementById('authContainer').style.display = 'block';
            document.getElementById('admissionApp').style.display = 'none';
        }
    } catch (error) {
        console.error('Auth error:', error);
        document.getElementById('authContainer').style.display = 'block';
        document.getElementById('admissionApp').style.display = 'none';
    }
}

// ================================================================
// LOAD USER APPLICATION
// ================================================================
async function loadUserApplication(userId) {
    try {
        const { data, error } = await supabase
            .from('applications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) throw error;
        if (data && data.length > 0) {
            const app = data[0];
            applicationId = app.id;
            Object.keys(app).forEach(key => {
                const el = document.getElementById(key);
                if (el && app[key]) {
                    if (el.type === 'checkbox') el.checked = app[key];
                    else if (el.tagName === 'SELECT' || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                        el.value = app[key];
                    }
                }
            });
            if (app.student_type) studentType = app.student_type;
            if (app.documents_uploaded) {
                app.documents_uploaded.forEach(doc => {
                    uploadedDocs[doc] = true;
                    const statusEl = document.getElementById(`doc_${doc}_status`);
                    if (statusEl) { statusEl.textContent = '✅ Uploaded'; statusEl.style.color = '#0f7b3a'; }
                });
            }
            updateSummary();
        }
    } catch (error) {
        console.error('Load application error:', error);
    }
}

// ================================================================
// COURSE SELECTOR
// ================================================================
function updatePrograms() {
    const school = document.getElementById('school').value;
    const programSelect = document.getElementById('program');
    programSelect.innerHTML = '<option value="">-- Select Course --</option>';

    if (school && courseData[school]) {
        courseData[school].forEach(course => {
            const option = document.createElement('option');
            option.value = course.code;
            option.textContent = `${course.name} (${course.duration}) - ${course.grade}`;
            option.dataset.duration = course.duration;
            option.dataset.grade = course.grade;
            programSelect.appendChild(option);
        });
    }
}

// ================================================================
// STUDENT TYPE
// ================================================================
function toggleStudentType() {
    const isTransfer = document.querySelector('input[name="studentType"]:checked').value === 'transfer';
    document.getElementById('transferFields').style.display = isTransfer ? 'block' : 'none';
    document.getElementById('doc_transcript').style.display = isTransfer ? 'block' : 'none';
    studentType = isTransfer ? 'transfer' : 'new';
    updateSummary();
}

// ================================================================
// STEP NAVIGATION
// ================================================================
function goToStep(step) {
    if (!validateStep(currentStep, step)) return;

    document.querySelectorAll('.form-section').forEach(el => el.classList.remove('active'));
    document.querySelector(`.form-section[data-section="${step}"]`).classList.add('active');

    document.querySelectorAll('.step-item').forEach(el => {
        el.classList.remove('active');
        const s = parseInt(el.dataset.step);
        if (s === step) el.classList.add('active');
    });

    currentStep = step;
    updateSummary();
    saveDraft();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validateStep(from, to) {
    if (from === 1 && to > 1) {
        const fields = ['fullName', 'email', 'phone', 'nationalId', 'dob', 'gender'];
        for (let id of fields) {
            if (!document.getElementById(id).value.trim()) {
                showValidation(`Please complete field: ${document.getElementById(id).parentElement.querySelector('label').textContent.trim()}`);
                return false;
            }
        }
    }
    if (from === 2 && to > 2) {
        if (!document.getElementById('program').value) {
            showValidation('Please select a Course.');
            return false;
        }
        if (!document.getElementById('school').value) {
            showValidation('Please select a School.');
            return false;
        }
    }
    if (from === 3 && to > 3) {
        if (!uploadedDocs['kcse']) {
            showValidation('Please upload your KCSE certificate.');
            return false;
        }
        if (!kcseValidated) {
            showValidation('KCSE document has not been scanned and validated.');
            return false;
        }
        if (!uploadedDocs['recommendation']) {
            showValidation('Please upload a Recommendation Letter.');
            return false;
        }
    }
    if (from === 4 && to > 4) {
        if (!uploadedDocs['id']) {
            showValidation('Please upload your National ID.');
            return false;
        }
        if (!uploadedDocs['passport']) {
            showValidation('Please upload a Passport Photo.');
            return false;
        }
    }
    if (from === 5 && to > 5) {
        const exp = document.getElementById('christianExperience').value.trim();
        const words = exp ? exp.split(/\s+/).length : 0;
        if (words < 400) {
            showValidation(`Please write at least 400 words. Current: ${words} words.`);
            return false;
        }
    }
    return true;
}

function showValidation(msg) {
    document.getElementById('errorList').innerHTML = `<li>${msg}</li>`;
    document.getElementById('validationModal').classList.add('show');
}

function closeValidation() {
    document.getElementById('validationModal').classList.remove('show');
}

// ================================================================
// DOCUMENT HANDLING
// ================================================================
function handleDocUpload(event, docKey) {
    const file = event.target.files[0];
    if (!file) return;

    const statusEl = document.getElementById(`doc_${docKey}_status`);
    const fnameEl = document.getElementById(`doc_${docKey}_filename`);

    if (file.size > 5 * 1024 * 1024) {
        alert('❌ File too large. Max 5MB.');
        event.target.value = '';
        return;
    }

    uploadedDocs[docKey] = true;
    statusEl.textContent = `✅ ${file.name}`;
    statusEl.style.color = '#0f7b3a';
    if (fnameEl) fnameEl.textContent = file.name;
    document.getElementById(`doc_${docKey}`).classList.add('uploaded');
    updateSummary();
    saveDraft();
}

function removeDocument(docKey) {
    delete uploadedDocs[docKey];
    const statusEl = document.getElementById(`doc_${docKey}_status`);
    const fnameEl = document.getElementById(`doc_${docKey}_filename`);
    const input = document.getElementById(`doc_${docKey}_input`);
    if (statusEl) { statusEl.textContent = 'Not uploaded'; statusEl.style.color = ''; }
    if (fnameEl) fnameEl.textContent = '';
    document.getElementById(`doc_${docKey}`).classList.remove('uploaded');
    if (input) input.value = '';

    if (docKey === 'kcse') {
        kcseValidated = false;
        eligibilityPassed = false;
        document.getElementById('ocr_kcse_result').classList.remove('show');
        document.getElementById('ocr_kcse_status').textContent = '';
        document.getElementById('kcse_validation_result').innerHTML = '';
    }
    updateSummary();
}

// ================================================================
// OCR - KCSE
// ================================================================
async function handleKCSEDocument(event) {
    const file = event.target.files[0];
    if (!file) return;

    const statusEl = document.getElementById('doc_kcse_status');
    const fnameEl = document.getElementById('doc_kcse_filename');
    const ocrStatus = document.getElementById('ocr_kcse_status');
    const resultBox = document.getElementById('ocr_kcse_result');
    const overlay = document.getElementById('scanning_kcse');

    if (file.size > 10 * 1024 * 1024) {
        alert('❌ File too large. Max 10MB.');
        event.target.value = '';
        return;
    }

    overlay.classList.add('active');
    ocrStatus.textContent = '⏳ Processing...';
    ocrStatus.className = 'ocr-status pending';
    resultBox.classList.remove('show');

    try {
        let imageUrl = URL.createObjectURL(file);
        if (file.type === 'application/pdf') {
            ocrStatus.textContent = '⏳ Converting PDF...';
            const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const context = canvas.getContext('2d');
            await page.render({ canvasContext: context, viewport: viewport }).promise;
            imageUrl = canvas.toDataURL('image/png');
        }

        ocrStatus.textContent = '⏳ Scanning with OCR...';
        const result = await Tesseract.recognize(imageUrl, 'eng');
        const text = result.data.text;

        const extractedData = parseKCSEData(text);
        kcseDataExtracted = extractedData;

        uploadedDocs['kcse'] = true;
        statusEl.textContent = `✅ ${file.name}`;
        fnameEl.textContent = file.name;
        document.getElementById('doc_kcse').classList.add('uploaded');

        displayKCSEData(extractedData);
        validateKCSEAgainstProgram(extractedData);

        ocrStatus.textContent = '✅ OCR Complete';
        ocrStatus.className = 'ocr-status success';
        resultBox.classList.add('show');
        kcseValidated = true;

        if (file.type !== 'application/pdf') URL.revokeObjectURL(imageUrl);
        await saveDraft();
    } catch (error) {
        console.error('OCR Error:', error);
        ocrStatus.textContent = '❌ OCR Failed';
        ocrStatus.className = 'ocr-status fail';
        alert('Document scanning failed. Please ensure the document is clear and try again.');
    } finally {
        overlay.classList.remove('active');
    }
    updateSummary();
}

function parseKCSEData(text) {
    const data = { name: '', indexNumber: '', year: '', subjects: [], grades: {}, overallGrade: '' };
    const cleanText = text.replace(/\s+/g, ' ').trim();

    const nameMatch = cleanText.match(/Name:\s*([A-Za-z\s.]+)/i) || cleanText.match(/([A-Z][a-z]+\s+[A-Z][a-z]+\s+[A-Z][a-z]+)/);
    if (nameMatch) data.name = nameMatch[1].trim();

    const indexMatch = cleanText.match(/Index\s*(?:Number|No):?\s*([0-9]{8,12})/i) || cleanText.match(/([0-9]{8,12})/);
    if (indexMatch) data.indexNumber = indexMatch[1].trim();

    const yearMatch = cleanText.match(/20[0-9]{2}/);
    if (yearMatch) data.year = yearMatch[0];

    const subjectPattern = /([A-Za-z\s]+)\s+([A-E][+-]?)/g;
    let match;
    while ((match = subjectPattern.exec(cleanText)) !== null) {
        const subject = match[1].trim();
        const grade = match[2].trim();
        if (subject.length > 1 && subject.length < 30 && grade.length <= 2) {
            data.subjects.push(subject);
            data.grades[subject] = grade;
        }
    }

    const overallMatch = cleanText.match(/Overall\s*Grade:\s*([A-E][+-]?)/i) || cleanText.match(/Mean\s*Grade:\s*([A-E][+-]?)/i);
    if (overallMatch) data.overallGrade = overallMatch[1].trim();

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
    return data;
}

function displayKCSEData(data) {
    const container = document.getElementById('kcse_extracted_data');
    let html = `
        <div><span class="label">Student Name:</span> <span class="value">${data.name || 'Not detected'}</span></div>
        <div><span class="label">Index Number:</span> <span class="value">${data.indexNumber || 'Not detected'}</span></div>
        <div><span class="label">Year:</span> <span class="value">${data.year || 'Not detected'}</span></div>
        <div><span class="label">Overall Grade:</span> <span class="value">${data.overallGrade || 'Not detected'}</span></div>
    `;
    if (data.subjects.length > 0) {
        html += `<div style="grid-column:span 2;margin-top:4px;padding-top:4px;border-top:1px solid var(--gray-200);">
            <span style="font-weight:600;font-size:0.7rem;color:var(--gray-500);">Subjects & Grades:</span><br>
            ${data.subjects.map(s => `<span style="font-size:0.7rem;background:var(--gray-100);padding:2px 8px;border-radius:4px;margin:2px;display:inline-block;">${s}: ${data.grades[s] || 'N/A'}</span>`).join('')}
        </div>`;
    }
    container.innerHTML = html;
}

function validateKCSEAgainstProgram(data) {
    const programSelect = document.getElementById('program');
    const selectedOption = programSelect.options[programSelect.selectedIndex];
    const validationResult = document.getElementById('kcse_validation_result');

    if (!selectedOption || !selectedOption.value) {
        validationResult.innerHTML = `<span style="color:var(--warning);">⚠️ Please select a course first.</span>`;
        return;
    }

    const requiredGrade = selectedOption.dataset.grade || 'D';
    const studentGrade = data.overallGrade;

    if (!studentGrade) {
        validationResult.innerHTML = `<span style="color:var(--warning);">⚠️ Complete data not extracted. Ensure document is clear.</span>`;
        return;
    }

    const studentPoints = gradePoints[studentGrade] || 0;
    const minPoints = gradePoints[requiredGrade] || 0;

    let html = '';
    if (requiredGrade === 'Open' || requiredGrade === 'No minimum') {
        html = `<span class="validation-pass">✅ No minimum grade requirement for this course.</span>`;
        eligibilityPassed = true;
    } else if (studentPoints >= minPoints) {
        html = `<span class="validation-pass">✅ ELIGIBLE - ${studentGrade} meets ${requiredGrade} requirement!</span>`;
        eligibilityPassed = true;
    } else {
        html = `<span class="validation-fail">❌ NOT ELIGIBLE - ${studentGrade} below ${requiredGrade} requirement.</span>`;
        eligibilityPassed = false;
    }

    validationResult.innerHTML = html;
    if (data.name && !document.getElementById('fullName').value) {
        document.getElementById('fullName').value = data.name;
    }
    updateSummary();
}

// ================================================================
// OCR - ID
// ================================================================
async function handleIDDocument(event) {
    const file = event.target.files[0];
    if (!file) return;

    const statusEl = document.getElementById('doc_id_status');
    const fnameEl = document.getElementById('doc_id_filename');
    const ocrStatus = document.getElementById('ocr_id_status');
    const resultBox = document.getElementById('ocr_id_result');
    const overlay = document.getElementById('scanning_id');

    if (file.size > 10 * 1024 * 1024) {
        alert('❌ File too large. Max 10MB.');
        event.target.value = '';
        return;
    }

    overlay.classList.add('active');
    ocrStatus.textContent = '⏳ Processing...';
    ocrStatus.className = 'ocr-status pending';
    resultBox.classList.remove('show');

    try {
        let imageUrl = URL.createObjectURL(file);
        if (file.type === 'application/pdf') {
            ocrStatus.textContent = '⏳ Converting PDF...';
            const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const context = canvas.getContext('2d');
            await page.render({ canvasContext: context, viewport: viewport }).promise;
            imageUrl = canvas.toDataURL('image/png');
        }

        ocrStatus.textContent = '⏳ Scanning ID...';
        const result = await Tesseract.recognize(imageUrl, 'eng');
        const text = result.data.text;

        const idData = parseIDData(text);
        uploadedDocs['id'] = true;
        statusEl.textContent = `✅ ${file.name}`;
        fnameEl.textContent = file.name;
        document.getElementById('doc_id').classList.add('uploaded');

        displayIDData(idData);
        ocrStatus.textContent = '✅ OCR Complete';
        ocrStatus.className = 'ocr-status success';
        resultBox.classList.add('show');

        if (idData.idNumber && !document.getElementById('nationalId').value) {
            document.getElementById('nationalId').value = idData.idNumber;
        }
        if (idData.name && !document.getElementById('fullName').value) {
            document.getElementById('fullName').value = idData.name;
        }
        if (file.type !== 'application/pdf') URL.revokeObjectURL(imageUrl);
        await saveDraft();
    } catch (error) {
        console.error('ID OCR Error:', error);
        ocrStatus.textContent = '❌ OCR Failed';
        ocrStatus.className = 'ocr-status fail';
        alert('ID scanning failed. Please ensure the document is clear.');
    } finally {
        overlay.classList.remove('active');
    }
    updateSummary();
}

function parseIDData(text) {
    const data = { name: '', idNumber: '', dob: '' };
    const cleanText = text.replace(/\s+/g, ' ').trim();

    const nameMatch = cleanText.match(/Name:\s*([A-Za-z\s.]+)/i) || cleanText.match(/([A-Z][a-z]+\s+[A-Z][a-z]+\s+[A-Z][a-z]+)/);
    if (nameMatch) data.name = nameMatch[1].trim();

    const idMatch = cleanText.match(/ID\s*(?:Number|No):?\s*([0-9]{7,9})/i) || cleanText.match(/([0-9]{7,9})/);
    if (idMatch) data.idNumber = idMatch[1].trim();

    const dobMatch = cleanText.match(/DOB:\s*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i) || cleanText.match(/Birth:\s*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i);
    if (dobMatch) data.dob = dobMatch[1].trim();

    return data;
}

function displayIDData(data) {
    document.getElementById('id_extracted_data').innerHTML = `
        <div><span class="label">Name:</span> <span class="value">${data.name || 'Not detected'}</span></div>
        <div><span class="label">ID Number:</span> <span class="value">${data.idNumber || 'Not detected'}</span></div>
        <div><span class="label">DOB:</span> <span class="value">${data.dob || 'Not detected'}</span></div>
    `;
}

// ================================================================
// SAVE DRAFT
// ================================================================
async function saveDraft() {
    if (!currentUser) return;

    const data = {
        user_id: currentUser.id,
        user_email: currentUser.email,
        full_name: document.getElementById('fullName')?.value || '',
        email: document.getElementById('email')?.value || '',
        phone: document.getElementById('phone')?.value || '',
        alt_phone: document.getElementById('altPhone')?.value || '',
        national_id: document.getElementById('nationalId')?.value || '',
        dob: document.getElementById('dob')?.value || '',
        gender: document.getElementById('gender')?.value || '',
        address: document.getElementById('address')?.value || '',
        city: document.getElementById('city')?.value || '',
        nationality: document.getElementById('nationality')?.value || '',
        county: document.getElementById('county')?.value || '',
        country_of_birth: document.getElementById('countryOfBirth')?.value || '',
        marital_status: document.getElementById('maritalStatus')?.value || '',
        hear_about: document.getElementById('hearAbout')?.value || '',
        sponsored: document.getElementById('sponsored')?.value || '',
        father_alive: document.getElementById('fatherAlive')?.value || '',
        father_name: document.getElementById('fatherName')?.value || '',
        father_phone: document.getElementById('fatherPhone')?.value || '',
        mother_alive: document.getElementById('motherAlive')?.value || '',
        mother_name: document.getElementById('motherName')?.value || '',
        mother_phone: document.getElementById('motherPhone')?.value || '',
        guardian_name: document.getElementById('guardianName')?.value || '',
        guardian_phone: document.getElementById('guardianPhone')?.value || '',
        disability: document.getElementById('disability')?.value || '',
        medical_condition: document.getElementById('medicalCondition')?.value || '',
        employed: document.getElementById('employed')?.value || '',
        school: document.getElementById('school')?.value || '',
        program: document.getElementById('program')?.value || '',
        campus: document.getElementById('campus')?.value || '',
        intake: document.getElementById('intake')?.value || '',
        mode_of_study: document.getElementById('modeOfStudy')?.value || '',
        student_type: studentType,
        prev_institution: document.getElementById('prevInstitution')?.value || '',
        prev_year: document.getElementById('prevYear')?.value || '',
        transfer_reason: document.getElementById('transferReason')?.value || '',
        christian_experience: document.getElementById('christianExperience')?.value || '',
        documents_uploaded: Object.keys(uploadedDocs).filter(k => uploadedDocs[k]),
        current_step: currentStep,
        updated_at: new Date().toISOString()
    };

    try {
        let result;
        if (applicationId) {
            result = await supabase.from('applications').update(data).eq('id', applicationId);
        } else {
            result = await supabase.from('applications').insert([data]).select();
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

// ================================================================
// UPDATE SUMMARY
// ================================================================
function updateSummary() {
    const name = document.getElementById('fullName')?.value || '—';
    const email = document.getElementById('email')?.value || '—';
    const phone = document.getElementById('phone')?.value || '—';
    const school = document.getElementById('school');
    const program = document.getElementById('program');
    const campus = document.getElementById('campus');
    const intake = document.getElementById('intake');
    const mode = document.getElementById('modeOfStudy');

    const schoolText = school ? school.options[school.selectedIndex]?.text || '—' : '—';
    const programText = program ? program.options[program.selectedIndex]?.text || '—' : '—';
    const campusText = campus ? campus.options[campus.selectedIndex]?.text || '—' : '—';
    const intakeText = intake ? intake.value || '—' : '—';
    const modeText = mode ? mode.options[mode.selectedIndex]?.text || '—' : '—';

    const count = Object.keys(uploadedDocs).filter(k => uploadedDocs[k]).length;
    const elig = eligibilityPassed ? '✅ Eligible' : '⏳ Pending';
    const validation = kcseValidated ? (eligibilityPassed ? '✅ Passed' : '❌ Failed') : '⏳ Not Scanned';
    const typeLabel = studentType === 'new' ? 'New Student' : 'Transfer Student';

    document.getElementById('sumName').textContent = name;
    document.getElementById('sumEmail').textContent = email;
    document.getElementById('sumPhone').textContent = phone;
    document.getElementById('sumSchool').textContent = schoolText;
    document.getElementById('sumProgram').textContent = programText;
    document.getElementById('sumCampus').textContent = campusText;
    document.getElementById('sumIntake').textContent = intakeText;
    document.getElementById('sumMode').textContent = modeText;
    document.getElementById('sumStudentType').textContent = typeLabel;
    document.getElementById('sumDocs').textContent = `${count} uploaded`;
    document.getElementById('sumValidation').textContent = validation;
    document.getElementById('sumEligibility').textContent = elig;
}

// ================================================================
// SUBMIT ADMISSION
// ================================================================
async function submitAdmission() {
    if (!document.getElementById('termsCheck').checked) {
        showValidation('You must agree to the Terms & Conditions.');
        return;
    }
    if (!kcseValidated) {
        showValidation('KCSE document has not been scanned and validated.');
        return;
    }
    if (!eligibilityPassed) {
        showValidation('You do not meet the course eligibility requirements.');
        return;
    }
    if (!uploadedDocs['recommendation']) {
        showValidation('Please upload a Recommendation Letter.');
        return;
    }

    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

    try {
        const data = {
            status: 'submitted',
            submitted_at: new Date().toISOString(),
            current_step: 6
        };

        let result;
        if (applicationId) {
            result = await supabase.from('applications').update(data).eq('id', applicationId);
        } else {
            data.user_id = currentUser.id;
            data.user_email = currentUser.email;
            result = await supabase.from('applications').insert([data]).select();
            if (result.data && result.data.length > 0) {
                applicationId = result.data[0].id;
            }
        }

        if (result.error) throw result.error;

        document.getElementById('successOverlay').classList.add('show');
        document.getElementById('refNumber').textContent = `ADM-${Date.now().toString().slice(-6)}`;

    } catch (error) {
        console.error('Submit error:', error);
        document.getElementById('submitMessage').className = 'auth-message error';
        document.getElementById('submitMessage').textContent = '❌ Failed to submit: ' + error.message;
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Application';
    }
}

// ================================================================
// ENQUIRY
// ================================================================
function handleEnquiry(e) {
    e.preventDefault();
    const msg = document.getElementById('enquiryMessageStatus');
    msg.textContent = '✅ Your enquiry has been sent! We\'ll respond within 24 hours.';
    msg.className = 'auth-message success';
    e.target.reset();
    setTimeout(() => { msg.textContent = ''; msg.className = 'auth-message'; }, 5000);
}

// ================================================================
// WORD COUNT FOR CHRISTIAN EXPERIENCE
// ================================================================
document.addEventListener('DOMContentLoaded', function() {
    const expTextarea = document.getElementById('christianExperience');
    if (expTextarea) {
        expTextarea.addEventListener('input', function() {
            const words = this.value.trim() ? this.value.trim().split(/\s+/).length : 0;
            const wordCountEl = document.getElementById('wordCount');
            wordCountEl.textContent = `Words: ${words} (Minimum 400 required)`;
            wordCountEl.className = `word-count ${words >= 400 ? 'valid' : 'invalid'}`;
        });
    }
});

// ================================================================
// INIT
// ================================================================
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('currentYear').textContent = new Date().getFullYear();

    // Initialize PDF.js
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    // Check auth
    checkAuth();

    // Update summary
    updateSummary();

    // Set initial application number
    document.getElementById('applicationNumber').textContent = `ADM-${Date.now().toString().slice(-6)}`;

    console.log('✅ NCHSM Admission System loaded');
});

// Click on doc card triggers file input
document.querySelectorAll('.doc-card').forEach(card => {
    card.addEventListener('click', function(e) {
        if (e.target.closest('.doc-remove') || e.target.closest('.ocr-status')) return;
        const input = this.querySelector('input[type="file"]');
        if (input) input.click();
    });
});

// Modal close on overlay click
document.getElementById('validationModal').addEventListener('click', function(e) {
    if (e.target === this) closeValidation();
});
document.getElementById('successOverlay').addEventListener('click', function(e) {
    if (e.target === this) this.classList.remove('show');
});

console.log('✅ admissions.js loaded successfully');
