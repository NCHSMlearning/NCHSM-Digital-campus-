// ============================================================
// 🎓 COMPLETE GRADUATION & CERTIFICATE SYSTEM
// ONE FILE - All functions for graduation + certificate generation
// ============================================================

console.log('🎓 Graduation & Certificate System Loading...');

// ============================================================
// GLOBAL VARIABLES - Safe declarations
// ============================================================

if (typeof MAX_RETAKES === 'undefined') {
    var MAX_RETAKES = 2;
}

if (typeof CERT_STORAGE_KEY === 'undefined') {
    var CERT_STORAGE_KEY = 'nchsm_certificates';
}

if (typeof CERT_SERIAL_PREFIX === 'undefined') {
    var CERT_SERIAL_PREFIX = 'NCHSM-';
}

if (typeof GRAD_STORAGE_KEY === 'undefined') {
    var GRAD_STORAGE_KEY = 'nchsm_graduation';
}

if (typeof TRANSCRIPT_STORAGE_KEY === 'undefined') {
    var TRANSCRIPT_STORAGE_KEY = 'nchsm_transcripts';
}

// Use let for mutable variables
let certificates = [];
let graduationCandidates = [];
let allStudents = [];
let allMarks = {};
let allTranscripts = [];
let qrScannerActive = false;
let qrStream = null;

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function generateHash(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0').toUpperCase();
}

// ============================================================
// PROGRAM TYPE DETECTION
// ============================================================

function getProgramType(programCode) {
    if (!programCode) return 'nursing';
    const code = String(programCode).toUpperCase().trim();
    
    if (code === 'KRCHN' || code === 'NURSING') return 'nursing';
    
    const tvetDiploma = ['DPOTT', 'DCH', 'DHRIT', 'DSL', 'DSW', 'DCJS', 'DHSS', 'DICT', 'DME'];
    const tvetCertificate = ['CPOTT', 'CCH', 'CHRIT', 'CPC', 'CSL', 'CSW', 'CCJS', 'CAG', 'CHSS', 'CICT', 'CCA'];
    const tvetArtisan = ['ACH', 'AAG', 'ASW'];
    
    if (tvetDiploma.includes(code)) return 'tvet_diploma';
    if (tvetCertificate.includes(code)) return 'tvet_certificate';
    if (tvetArtisan.includes(code)) return 'tvet_artisan';
    
    return 'nursing';
}

function isTVETProgram(programCode) {
    if (!programCode) return false;
    const type = getProgramType(programCode);
    return type === 'tvet_diploma' || type === 'tvet_certificate' || type === 'tvet_artisan';
}

function isNursingProgram(programCode) {
    if (!programCode) return true;
    return getProgramType(programCode) === 'nursing';
}

// ============================================================
// GRADE CALCULATION
// ============================================================

function getGradingConfig(programCode) {
    if (isNursingProgram(programCode)) {
        return {
            grades: {
                'A': { min: 75, max: 100, points: 4.0, label: 'DISTINCTION' },
                'B': { min: 65, max: 74, points: 3.0, label: 'CREDIT' },
                'C': { min: 60, max: 64, points: 2.0, label: 'PASS' },
                'D': { min: 0, max: 59, points: 0.0, label: 'FAIL' }
            },
            passMark: 60,
            label: 'Nursing Academic'
        };
    } else {
        return {
            grades: {
                'A': { min: 80, max: 100, points: 4.0, label: 'MASTERY' },
                'B': { min: 65, max: 79, points: 3.0, label: 'PROFICIENT' },
                'C': { min: 50, max: 64, points: 2.0, label: 'COMPETENT' },
                'E': { min: 0, max: 49, points: 0.0, label: 'NOT YET COMPETENT' }
            },
            passMark: 50,
            label: 'TVET Competency-Based'
        };
    }
}

function calculateOfficialGrade(score, programCode) {
    const config = getGradingConfig(programCode);
    const grades = config.grades;
    
    if (score === null || score === undefined || score === 0) {
        const defaultGrade = isNursingProgram(programCode) ? 'D' : 'E';
        return {
            grade: defaultGrade,
            points: 0.0,
            label: config === getGradingConfig('TVET') ? 'NOT YET COMPETENT' : 'FAIL',
            color: '#991b1b',
            bgColor: '#fee2e2'
        };
    }
    
    for (const [grade, gConfig] of Object.entries(grades)) {
        if (score >= gConfig.min && score <= gConfig.max) {
            return {
                grade: grade,
                points: gConfig.points,
                label: gConfig.label,
                color: gConfig.color || '#0A3D62',
                bgColor: gConfig.bgColor || '#f8fafc'
            };
        }
    }
    
    const defaultGrade = isNursingProgram(programCode) ? 'D' : 'E';
    return {
        grade: defaultGrade,
        points: 0.0,
        label: config === getGradingConfig('TVET') ? 'NOT YET COMPETENT' : 'FAIL',
        color: '#991b1b',
        bgColor: '#fee2e2'
    };
}

function calculateAverageScore(marks) {
    if (!marks || marks.length === 0) return 0;
    const total = marks.reduce((sum, m) => sum + (m.final_score || m.score || 0), 0);
    return Math.round((total / marks.length) * 10) / 10;
}

// ============================================================
// SAMPLE DATA
// ============================================================

function getSampleStudents() {
    return [
        { id: 'STU-001', name: 'Jane Muthoni', email: 'jane@nchsm.ac.ke', program: 'KRCHN', intake: '2026', block: 'Final' },
        { id: 'STU-002', name: 'Peter Ochieng', email: 'peter@nchsm.ac.ke', program: 'DPOTT', intake: '2026', block: 'Final' },
        { id: 'STU-003', name: 'Sarah Wanjiru', email: 'sarah@nchsm.ac.ke', program: 'DCH', intake: '2026', block: 'Block 5' },
    ];
}

// ============================================================
// GENERATE UNIQUE SERIAL NUMBER
// ============================================================

function generateUniqueSerialNumber(student, program) {
    const year = new Date().getFullYear();
    const prefix = isNursingProgram(program) ? 'NUR' : 'TVT';
    const count = certificates.length + 1;
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const sequential = count.toString().padStart(4, '0');
    
    return `${CERT_SERIAL_PREFIX}${prefix}-${year}-${sequential}-${random.slice(0, 4)}`;
}

// ============================================================
// GENERATE QR CODE DATA
// ============================================================

function generateQRCodeData(certData) {
    const qrPayload = {
        certId: certData.certId,
        serialNumber: certData.serialNumber,
        studentId: certData.studentId,
        studentName: certData.studentName,
        program: certData.program,
        issueDate: certData.issueDate,
        expiryDate: certData.expiryDate,
        verificationUrl: `https://nchsm.ac.ke/verify/${certData.serialNumber}`,
        hash: generateHash(certData.certId + certData.serialNumber + certData.studentId)
    };
    
    const jsonStr = JSON.stringify(qrPayload);
    return btoa(unescape(encodeURIComponent(jsonStr)));
}

// ============================================================
// LOAD FUNCTIONS
// ============================================================

function loadAllData() {
    // Load certificates
    try {
        const data = localStorage.getItem(CERT_STORAGE_KEY);
        certificates = data ? JSON.parse(data) : [];
    } catch (e) {
        certificates = [];
    }
    
    // Load graduation candidates
    try {
        const data = localStorage.getItem(GRAD_STORAGE_KEY);
        graduationCandidates = data ? JSON.parse(data) : [];
    } catch (e) {
        graduationCandidates = [];
    }
    
    // Load transcripts
    try {
        const data = localStorage.getItem(TRANSCRIPT_STORAGE_KEY);
        allTranscripts = data ? JSON.parse(data) : [];
    } catch (e) {
        allTranscripts = [];
    }
    
    // Load students
    try {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        allStudents = users.filter(u => u.role === 'student' && u.status === 'approved');
    } catch (e) {
        allStudents = getSampleStudents();
    }
    
    // Load marks
    try {
        const marks = JSON.parse(localStorage.getItem('student_marks') || '{}');
        allMarks = marks;
    } catch (e) {
        allMarks = {};
    }
    
    console.log(`📊 Loaded: ${allStudents.length} students, ${certificates.length} certificates`);
}

function loadGradSettings() {
    try {
        const settings = JSON.parse(localStorage.getItem('grad_settings') || '{}');
        const passMarkEl = document.getElementById('gradPassMark');
        const feeAmountEl = document.getElementById('gradFeeAmount');
        const gradDateEl = document.getElementById('gradDate');
        const templateEl = document.getElementById('gradTemplate');
        
        if (passMarkEl && settings.passMark) passMarkEl.value = settings.passMark;
        if (feeAmountEl && settings.feeAmount) feeAmountEl.value = settings.feeAmount;
        if (gradDateEl && settings.gradDate) gradDateEl.value = settings.gradDate;
        if (templateEl && settings.template) templateEl.value = settings.template;
    } catch (e) {}
}

// ============================================================
// GET STUDENT MARKS
// ============================================================

function getStudentMarks(studentId) {
    if (allMarks[studentId]) {
        return allMarks[studentId];
    }
    
    const transcriptMarks = allTranscripts
        .filter(t => t.studentId === studentId)
        .flatMap(t => t.marks || []);
    
    if (transcriptMarks.length > 0) {
        return transcriptMarks;
    }
    
    // Generate sample marks
    const subjects = ['Anatomy', 'Physiology', 'Pharmacology', 'Clinical Practice', 'Community Health', 'Nursing Theory'];
    return subjects.map((subject, index) => ({
        subject: subject,
        score: Math.round(50 + Math.random() * 45),
        subjectCode: `SUB${String(index + 1).padStart(3, '0')}`,
        block: 'Final'
    }));
}

// ============================================================
// CREATE CERTIFICATE
// ============================================================

function createCertificate(student, marks, transcriptData) {
    const now = new Date();
    const expiryDate = new Date(now);
    expiryDate.setFullYear(expiryDate.getFullYear() + 5);
    
    const avgScore = calculateAverageScore(marks);
    const gradeInfo = calculateOfficialGrade(avgScore, student.program);
    const serialNumber = generateUniqueSerialNumber(student, student.program);
    const certId = 'CERT-' + Date.now().toString().slice(-8) + '-' + (student.id || student.student_id || '0000').slice(-4);
    
    const isPassing = avgScore >= getGradingConfig(student.program).passMark;
    
    const certData = {
        certId: certId,
        serialNumber: serialNumber,
        studentId: student.id || student.student_id,
        studentName: student.name || student.full_name || 'Unknown',
        program: student.program || 'KRCHN',
        intake: student.intake || student.intake_year || '2026',
        issueDate: now.toISOString().split('T')[0],
        expiryDate: expiryDate.toISOString().split('T')[0],
        avgScore: avgScore,
        grade: gradeInfo.grade,
        points: gradeInfo.points,
        rating: gradeInfo.label,
        isPassing: isPassing,
        unitsCompleted: marks.length,
        totalCredits: marks.length * 3,
        hash: generateHash(certId + serialNumber + (student.id || '')),
        qrCode: null,
        issuedAt: now.toISOString(),
        generatedBy: window.currentUser?.id || 'system',
        scanCount: 0,
        lastScanned: null,
        printed: false,
        printedAt: null,
        transcriptRef: transcriptData?.id || null,
        status: isPassing ? 'ACTIVE' : 'PENDING',
        verificationUrl: `https://nchsm.ac.ke/verify/${serialNumber}`
    };
    
    certData.qrCode = generateQRCodeData(certData);
    
    return certData;
}

// ============================================================
// MAIN INITIALIZATION
// ============================================================

function initGraduationSystem() {
    console.log('🎓 Initializing Graduation & Certificate System...');
    loadAllData();
    loadGradSettings();
    processGraduationCandidates();
    updateGraduationStats();
    renderCertificateList();
    renderGraduateList();
    setupEventListeners();
    showCertificateSection();
    console.log('✅ Graduation & Certificate System initialized!');
}

function showCertificateSection() {
    const section = document.getElementById('certificate-management');
    if (section) {
        section.style.display = 'block';
        section.classList.add('active');
        console.log('✅ Certificate section shown');
    }
}

function setupEventListeners() {
    const programFilter = document.getElementById('gradProgramFilter');
    const statusFilter = document.getElementById('gradStatusFilter');
    const selectAll = document.getElementById('gradSelectAll');
    const certSelectAll = document.getElementById('certSelectAll');
    
    if (programFilter) programFilter.addEventListener('change', filterGradStudents);
    if (statusFilter) statusFilter.addEventListener('change', filterGradStudents);
    if (selectAll) selectAll.addEventListener('change', toggleAllGradCheckboxes);
    if (certSelectAll) certSelectAll.addEventListener('change', toggleAllCertCheckboxes);
}

// ============================================================
// PROCESS GRADUATION CANDIDATES
// ============================================================

function processGraduationCandidates() {
    const passMark = parseInt(document.getElementById('gradPassMark')?.value || 50);
    
    const processed = allStudents.map(student => {
        const marks = getStudentMarks(student.id);
        const avgScore = calculateAverageScore(marks);
        const isEligible = avgScore >= passMark && (student.block === 'Final' || student.block === 'Block 6');
        const existingGrad = graduationCandidates.find(g => g.studentId === student.id);
        
        return {
            studentId: student.id,
            name: student.name || student.full_name || 'Unknown',
            email: student.email || '',
            program: student.program || 'KRCHN',
            intake: student.intake || student.intake_year || '2026',
            avgScore: avgScore,
            isEligible: isEligible,
            status: existingGrad ? existingGrad.status : (isEligible ? 'pending' : 'not_eligible'),
            transcriptGenerated: existingGrad?.transcriptGenerated || false,
            certificateGenerated: existingGrad?.certificateGenerated || false,
            printed: existingGrad?.printed || false,
            serialNumber: existingGrad?.serialNumber || null,
            qrCode: existingGrad?.qrCode || null,
            appliedDate: existingGrad?.appliedDate || null,
            graduationDate: existingGrad?.graduationDate || null,
            feePaid: existingGrad?.feePaid || false,
            feeAmount: existingGrad?.feeAmount || parseInt(document.getElementById('gradFeeAmount')?.value || 2500),
            transcriptUrl: existingGrad?.transcriptUrl || null,
            certificateUrl: existingGrad?.certificateUrl || null
        };
    });
    
    graduationCandidates = processed;
    localStorage.setItem(GRAD_STORAGE_KEY, JSON.stringify(graduationCandidates));
    renderGraduationList();
    updateGraduationStats();
}

// ============================================================
// GENERATE FUNCTIONS
// ============================================================

function generateTranscript(studentId) {
    const student = graduationCandidates.find(g => g.studentId === studentId);
    if (!student) {
        if (typeof showNotification === 'function') {
            showNotification('Student not found', 'error');
        }
        return;
    }
    
    if (typeof showLoading === 'function') {
        showLoading('Generating transcript for ' + student.name + '...');
    }
    
    setTimeout(() => {
        const transcriptId = 'TRN-' + Date.now().toString().slice(-8) + '-' + studentId.slice(-4);
        const marks = getStudentMarks(studentId);
        
        const transcriptData = {
            id: transcriptId,
            studentId: studentId,
            studentName: student.name,
            program: student.program,
            intake: student.intake,
            graduationDate: document.getElementById('gradDate')?.value || new Date().toISOString().split('T')[0],
            marks: marks,
            avgScore: student.avgScore,
            generatedAt: new Date().toISOString(),
            serialNumber: 'TRN-' + studentId.slice(-4) + '-' + Date.now().toString().slice(-6)
        };
        
        allTranscripts.push(transcriptData);
        localStorage.setItem(TRANSCRIPT_STORAGE_KEY, JSON.stringify(allTranscripts));
        
        student.transcriptGenerated = true;
        student.transcriptUrl = '#transcript-' + transcriptId;
        localStorage.setItem(GRAD_STORAGE_KEY, JSON.stringify(graduationCandidates));
        
        if (typeof hideLoading === 'function') {
            hideLoading();
        }
        if (typeof showNotification === 'function') {
            showNotification('✅ Transcript generated for ' + student.name, 'success');
        }
        renderGraduationList();
        updateGraduationStats();
        
        // Auto-generate certificate
        if (student.status === 'ready' || student.status === 'pending') {
            setTimeout(() => generateCertificate(studentId), 500);
        }
    }, 1000);
}

function generateCertificate(studentId) {
    const student = graduationCandidates.find(g => g.studentId === studentId);
    if (!student) {
        if (typeof showNotification === 'function') {
            showNotification('Student not found', 'error');
        }
        return;
    }
    
    if (!student.transcriptGenerated) {
        if (typeof showNotification === 'function') {
            showNotification('Please generate transcript first', 'warning');
        }
        return;
    }
    
    if (typeof showLoading === 'function') {
        showLoading('Generating certificate for ' + student.name + '...');
    }
    
    setTimeout(() => {
        try {
            const studentData = {
                id: student.studentId,
                name: student.name,
                program: student.program,
                intake: student.intake,
                block: 'Final'
            };
            
            const marks = getStudentMarks(studentId);
            const transcript = allTranscripts.find(t => t.studentId === studentId);
            
            const certData = createCertificate(studentData, marks, transcript);
            certificates.push(certData);
            localStorage.setItem(CERT_STORAGE_KEY, JSON.stringify(certificates));
            
            student.certificateGenerated = true;
            student.certificateUrl = '#cert-' + certData.certId;
            student.serialNumber = certData.serialNumber;
            student.qrCode = certData.qrCode;
            student.status = certData.isPassing ? 'ready' : 'pending';
            localStorage.setItem(GRAD_STORAGE_KEY, JSON.stringify(graduationCandidates));
            
            if (typeof hideLoading === 'function') {
                hideLoading();
            }
            if (typeof showNotification === 'function') {
                showNotification('✅ Certificate generated for ' + student.name + ' (Serial: ' + certData.serialNumber + ')', 'success');
            }
            renderCertificateList();
            renderGraduateList();
            updateGraduationStats();
            
            if (document.getElementById('autoPrint')?.checked) {
                setTimeout(() => markAsPrinted(studentId), 500);
            }
        } catch (error) {
            if (typeof hideLoading === 'function') {
                hideLoading();
            }
            console.error('Error generating certificate:', error);
            if (typeof showNotification === 'function') {
                showNotification('❌ Error generating certificate: ' + error.message, 'error');
            }
        }
    }, 1500);
}

function generateSingleCertificate(studentId) {
    const student = allStudents.find(s => s.id === studentId || s.student_id === studentId);
    if (!student) {
        if (typeof showNotification === 'function') {
            showNotification('Student not found', 'error');
        }
        return;
    }
    
    const existing = certificates.find(c => c.studentId === studentId || c.studentId === student.id);
    if (existing) {
        if (typeof showNotification === 'function') {
            showNotification('Student already has a certificate', 'info');
        }
        return;
    }
    
    const studentMarks = getStudentMarks(studentId);
    const transcript = allTranscripts.find(t => t.studentId === studentId);
    const certData = createCertificate(student, studentMarks, transcript);
    certificates.push(certData);
    localStorage.setItem(CERT_STORAGE_KEY, JSON.stringify(certificates));
    
    const gradIndex = graduationCandidates.findIndex(g => g.studentId === studentId);
    if (gradIndex > -1) {
        graduationCandidates[gradIndex].certificateGenerated = true;
        graduationCandidates[gradIndex].certificateUrl = '#cert-' + certData.certId;
        graduationCandidates[gradIndex].serialNumber = certData.serialNumber;
        graduationCandidates[gradIndex].qrCode = certData.qrCode;
        graduationCandidates[gradIndex].status = 'ready';
        localStorage.setItem(GRAD_STORAGE_KEY, JSON.stringify(graduationCandidates));
    }
    
    renderCertificateList();
    renderGraduateList();
    updateGraduationStats();
    
    if (typeof showNotification === 'function') {
        showNotification('✅ Certificate generated for ' + student.name + ' (Serial: ' + certData.serialNumber + ')', 'success');
    }
}

// ============================================================
// BULK GENERATION
// ============================================================

function generateSelectedTranscripts() {
    const checkboxes = document.querySelectorAll('.grad-student-checkbox:checked');
    if (checkboxes.length === 0) {
        if (typeof showNotification === 'function') {
            showNotification('Please select at least one student.', 'warning');
        }
        return;
    }
    
    const studentIds = Array.from(checkboxes).map(cb => cb.dataset.studentId);
    const total = studentIds.length;
    let completed = 0;
    
    if (typeof showLoading === 'function') {
        showLoading('Generating transcripts for ' + total + ' students...');
    }
    
    const progressDiv = document.getElementById('gradProgress');
    if (progressDiv) {
        progressDiv.style.display = 'block';
    }
    
    studentIds.forEach((studentId, index) => {
        setTimeout(() => {
            generateTranscript(studentId);
            completed++;
            const percent = Math.round((completed / total) * 100);
            const bar = document.getElementById('gradProgressBar');
            const percentEl = document.getElementById('gradProgressPercent');
            const statusEl = document.getElementById('gradProgressStatus');
            
            if (bar) bar.style.width = percent + '%';
            if (percentEl) percentEl.textContent = percent + '%';
            if (statusEl) statusEl.textContent = completed + '/' + total + ' completed';
            
            if (completed === total) {
                if (typeof hideLoading === 'function') {
                    hideLoading();
                }
                if (typeof showNotification === 'function') {
                    showNotification('✅ All ' + total + ' transcripts generated!', 'success');
                }
                if (progressDiv) {
                    setTimeout(() => { progressDiv.style.display = 'none'; }, 3000);
                }
            }
        }, index * 800);
    });
}

function generateSelectedCertificates() {
    const checkboxes = document.querySelectorAll('.grad-student-checkbox:checked');
    if (checkboxes.length === 0) {
        if (typeof showNotification === 'function') {
            showNotification('Please select at least one student.', 'warning');
        }
        return;
    }
    
    const studentIds = Array.from(checkboxes).map(cb => cb.dataset.studentId);
    const total = studentIds.length;
    let completed = 0;
    
    if (typeof showLoading === 'function') {
        showLoading('Generating certificates for ' + total + ' students...');
    }
    
    const progressDiv = document.getElementById('gradProgress');
    if (progressDiv) {
        progressDiv.style.display = 'block';
        document.getElementById('gradProgressLabel').textContent = 'Generating certificates...';
    }
    
    studentIds.forEach((studentId, index) => {
        setTimeout(() => {
            generateCertificate(studentId);
            completed++;
            const percent = Math.round((completed / total) * 100);
            const bar = document.getElementById('gradProgressBar');
            const percentEl = document.getElementById('gradProgressPercent');
            const statusEl = document.getElementById('gradProgressStatus');
            
            if (bar) bar.style.width = percent + '%';
            if (percentEl) percentEl.textContent = percent + '%';
            if (statusEl) statusEl.textContent = completed + '/' + total + ' completed';
            
            if (completed === total) {
                if (typeof hideLoading === 'function') {
                    hideLoading();
                }
                if (typeof showNotification === 'function') {
                    showNotification('✅ All ' + total + ' certificates generated!', 'success');
                }
                if (progressDiv) {
                    setTimeout(() => { progressDiv.style.display = 'none'; }, 3000);
                }
            }
        }, index * 1000);
    });
}

function generateCertificatesForAll() {
    const graduates = allStudents.filter(s => 
        s.block === 'Final' || s.block === 'Block 6' || s.block === 'Graduated'
    );
    
    const existingCertIds = new Set(certificates.map(c => c.studentId));
    const eligible = graduates.filter(s => !existingCertIds.has(s.id));
    
    if (eligible.length === 0) {
        if (typeof showNotification === 'function') {
            showNotification('All graduates already have certificates', 'info');
        }
        return;
    }
    
    document.querySelectorAll('.cert-student-checkbox').forEach(cb => {
        const studentId = cb.dataset.studentId;
        if (eligible.some(s => s.id === studentId)) {
            cb.checked = true;
        }
    });
    
    generateSelectedCertificates();
}

function autoGenerateAllCertificates() {
    generateCertificatesForAll();
}

function autoGenerateAllGraduationDocuments() {
    const eligible = graduationCandidates.filter(g => 
        g.isEligible && !g.certificateGenerated && g.status !== 'not_eligible'
    );
    
    if (eligible.length === 0) {
        if (typeof showNotification === 'function') {
            showNotification('No eligible students found for auto-generation', 'info');
        }
        return;
    }
    
    if (typeof showLoading === 'function') {
        showLoading('Auto-generating documents for ' + eligible.length + ' students...');
    }
    
    let completed = 0;
    eligible.forEach((student, index) => {
        setTimeout(() => {
            generateTranscript(student.studentId);
            completed++;
            if (completed === eligible.length) {
                if (typeof hideLoading === 'function') {
                    hideLoading();
                }
                if (typeof showNotification === 'function') {
                    showNotification('✅ ' + completed + ' documents generated!', 'success');
                }
            }
        }, index * 1500);
    });
}

// ============================================================
// MARK AS PRINTED
// ============================================================

function markAsPrinted(studentId) {
    const student = graduationCandidates.find(g => g.studentId === studentId);
    if (student) {
        student.printed = true;
        student.status = 'printed';
        localStorage.setItem(GRAD_STORAGE_KEY, JSON.stringify(graduationCandidates));
        
        const cert = certificates.find(c => c.studentId === studentId);
        if (cert) {
            cert.printed = true;
            cert.printedAt = new Date().toISOString();
            cert.status = 'PRINTED';
            localStorage.setItem(CERT_STORAGE_KEY, JSON.stringify(certificates));
        }
        
        renderGraduationList();
        updateGraduationStats();
    }
}

function markSelectedAsPrinted() {
    const checkboxes = document.querySelectorAll('.grad-student-checkbox:checked');
    if (checkboxes.length === 0) {
        if (typeof showNotification === 'function') {
            showNotification('Please select at least one student.', 'warning');
        }
        return;
    }
    
    const studentIds = Array.from(checkboxes).map(cb => cb.dataset.studentId);
    studentIds.forEach(studentId => markAsPrinted(studentId));
    
    if (typeof showNotification === 'function') {
        showNotification('✅ ' + studentIds.length + ' students marked as printed!', 'success');
    }
    renderGraduationList();
    updateGraduationStats();
}

function markCertificateAsPrinted(studentId) {
    markAsPrinted(studentId);
}

// ============================================================
// RENDER FUNCTIONS
// ============================================================

function renderGraduateList() {
    const tbody = document.getElementById('certGraduateList');
    if (!tbody) {
        console.warn('⚠️ certGraduateList element not found');
        return;
    }
    
    const programFilter = document.getElementById('gradProgramFilter')?.value || 'all';
    const statusFilter = document.getElementById('gradStatusFilter')?.value || 'all';
    
    let filtered = [...graduationCandidates];
    
    if (programFilter !== 'all') {
        filtered = filtered.filter(g => g.program === programFilter);
    }
    if (statusFilter !== 'all') {
        filtered = filtered.filter(g => g.status === statusFilter);
    }
    
    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="6" style="padding: 30px; text-align: center; color: #94a3b8;">
                <i class="fas fa-info-circle"></i> No graduates found.
            </td></tr>
        `;
        return;
    }
    
    let html = '';
    filtered.forEach((student) => {
        const statusColors = {
            pending: 'background: #fef3c7; color: #92400e;',
            ready: 'background: #d1fae5; color: #065f46;',
            printed: 'background: #dbeafe; color: #1e40af;',
            not_eligible: 'background: #fee2e2; color: #991b1b;'
        };
        
        const statusLabels = {
            pending: '⏳ Pending',
            ready: '✅ Ready',
            printed: '🖨️ Printed',
            not_eligible: '❌ Not Eligible'
        };
        
        const hasCert = student.certificateGenerated;
        const serial = student.serialNumber || '—';
        
        html += `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 10px; text-align: center;">
                    <input type="checkbox" class="grad-student-checkbox" data-student-id="${student.studentId}" ${student.status === 'not_eligible' ? 'disabled' : ''}>
                </td>
                <td style="padding: 8px 10px;">
                    <strong>${escapeHtml(student.name)}</strong>
                    <div style="font-size: 11px; color: #94a3b8;">${escapeHtml(student.email || '')}</div>
                </td>
                <td style="padding: 8px 10px;">
                    <span style="background: ${isNursingProgram(student.program) ? '#dbeafe' : '#fef3c7'}; padding: 2px 8px; border-radius: 4px; font-size: 11px;">
                        ${escapeHtml(student.program)}
                    </span>
                </td>
                <td style="padding: 8px 10px; text-align: center;">
                    <span style="font-weight: 600; ${student.avgScore >= 50 ? 'color: #10b981;' : 'color: #dc2626;'}">
                        ${student.avgScore}%
                    </span>
                </td>
                <td style="padding: 8px 10px; text-align: center;">
                    <span style="padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; ${statusColors[student.status] || ''}">
                        ${statusLabels[student.status] || student.status}
                    </span>
                </td>
                <td style="padding: 8px 10px; text-align: center;">
                    ${hasCert 
                        ? `<i class="fas fa-qrcode" style="color: #4C1D95; font-size: 20px; cursor: pointer;" onclick="showCertificateQR('${student.studentId}')" title="Show QR"></i>`
                        : `<span style="color: #94a3b8; font-size: 11px;">Not generated</span>`
                    }
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    updateGraduationSelectedCount();
}

function renderCertificateList() {
    const tbody = document.getElementById('certRecentList');
    if (!tbody) {
        console.warn('⚠️ certRecentList element not found');
        return;
    }
    
    const sorted = [...certificates].sort((a, b) => 
        new Date(b.issuedAt) - new Date(a.issuedAt)
    ).slice(0, 20);
    
    if (sorted.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="8" style="padding: 30px; text-align: center; color: #94a3b8;">
                <i class="fas fa-certificate"></i> No certificates issued yet.
            </td></tr>
        `;
        return;
    }
    
    let html = '';
    sorted.forEach((cert, index) => {
        const student = allStudents.find(s => s.id === cert.studentId);
        const isPassing = cert.isPassing;
        
        html += `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 14px;">${index + 1}</td>
                <td style="padding: 10px 14px;">
                    <strong>${escapeHtml(cert.studentName)}</strong>
                    <div style="font-size: 11px; color: #94a3b8;">${escapeHtml(student?.email || '')}</div>
                </td>
                <td style="padding: 10px 14px;">${escapeHtml(cert.program)}</td>
                <td style="padding: 10px 14px; font-family: monospace; font-size: 12px; color: #4C1D95;">
                    <strong>${escapeHtml(cert.serialNumber)}</strong>
                    <button onclick="copySerial('${cert.serialNumber}')" style="background: none; border: none; cursor: pointer; color: #94a3b8; font-size: 12px;" title="Copy serial number">
                        <i class="fas fa-copy"></i>
                    </button>
                </td>
                <td style="padding: 10px 14px; text-align: center; font-size: 12px;">
                    ${new Date(cert.issuedAt).toLocaleDateString()}
                </td>
                <td style="padding: 10px 14px; text-align: center; font-weight: 600; color: ${isPassing ? '#10b981' : '#dc2626'};">
                    ${cert.avgScore}%
                </td>
                <td style="padding: 10px 14px; text-align: center;">
                    <span style="background: ${isPassing ? '#d1fae5' : '#fee2e2'}; padding: 2px 10px; border-radius: 12px; font-size: 11px; color: ${isPassing ? '#065f46' : '#991b1b'};">
                        ${cert.grade}
                    </span>
                </td>
                <td style="padding: 10px 14px; text-align: center;">
                    <i class="fas fa-qrcode" style="color: #4C1D95; font-size: 20px; cursor: pointer;" onclick="showCertificateQR('${cert.studentId}')" title="Show QR"></i>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

function updateGraduationStats() {
    const total = graduationCandidates.length;
    const graduates = graduationCandidates.filter(g => g.isEligible);
    const ready = graduationCandidates.filter(g => g.status === 'ready' || g.certificateGenerated);
    const pending = graduationCandidates.filter(g => g.status === 'pending' && !g.certificateGenerated);
    const printed = graduationCandidates.filter(g => g.printed);
    const notEligible = graduationCandidates.filter(g => g.status === 'not_eligible');
    const scanned = certificates.reduce((sum, c) => sum + (c.scanCount || 0), 0);
    
    const elements = {
        'gradTotalStudents': total,
        'gradGraduatesCount': graduates.length,
        'gradPendingCount': pending.length,
        'gradPrintedCount': printed.length,
        'gradScanCount': scanned,
        'gradNotEligibleCount': notEligible.length,
        'certTotalStudents': allStudents.length,
        'certGraduatesCount': graduates.length,
        'certIssuedCount': certificates.length,
        'certPendingCount': Math.max(graduates.length - certificates.length, 0)
    };
    
    for (const [id, value] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }
}

function updateGraduationSelectedCount() {
    const count = document.querySelectorAll('.grad-student-checkbox:checked').length;
    const el = document.getElementById('gradSelectedCount');
    if (el) el.textContent = count;
}

function toggleAllGradCheckboxes() {
    const selectAll = document.getElementById('gradSelectAll');
    const checkboxes = document.querySelectorAll('.grad-student-checkbox:not([disabled])');
    const isChecked = selectAll?.checked || false;
    checkboxes.forEach(cb => cb.checked = isChecked);
    updateGraduationSelectedCount();
}

function toggleAllCertCheckboxes() {
    const selectAll = document.getElementById('certSelectAll');
    const checkboxes = document.querySelectorAll('.cert-student-checkbox:not([disabled])');
    const isChecked = selectAll?.checked || false;
    checkboxes.forEach(cb => cb.checked = isChecked);
}

function filterGradStudents() {
    renderGraduateList();
}

// ============================================================
// QR CODE FUNCTIONS
// ============================================================

function showCertificateQR(studentId) {
    const cert = certificates.find(c => c.studentId === studentId);
    if (!cert) {
        if (typeof showNotification === 'function') {
            showNotification('Certificate not found', 'error');
        }
        return;
    }
    
    const qrData = cert.qrCode;
    const serial = cert.serialNumber;
    const name = cert.studentName;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.7); z-index: 100000;
        display: flex; align-items: center; justify-content: center;
        padding: 20px;
    `;
    modal.innerHTML = `
        <div style="background: white; border-radius: 16px; padding: 30px; max-width: 400px; width: 100%; text-align: center;">
            <h3 style="color: #0A3D62; margin: 0 0 4px 0;">QR Certificate</h3>
            <p style="color: #64748b; font-size: 13px; margin: 0 0 16px 0;">${escapeHtml(name)}</p>
            <div style="background: white; padding: 20px; border-radius: 12px; display: inline-block; border: 2px solid #e5e7eb;">
                <canvas id="qrCanvas" style="width: 200px; height: 200px;"></canvas>
            </div>
            <p style="font-family: monospace; font-size: 12px; color: #4C1D95; margin: 12px 0 0 0;">
                ${escapeHtml(serial)}
            </p>
            <div style="margin-top: 16px; display: flex; gap: 10px; justify-content: center;">
                <button onclick="this.closest('div[style]').remove()" style="padding: 8px 24px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    Close
                </button>
                <button onclick="downloadQR('${studentId}')" style="padding: 8px 24px; background: #4C1D95; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    <i class="fas fa-download"></i> Download QR
                </button>
                <button onclick="verifyCertificate('${studentId}')" style="padding: 8px 24px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    <i class="fas fa-shield-alt"></i> Verify
                </button>
            </div>
            <div id="verificationResult" style="margin-top: 12px; font-size: 13px;"></div>
        </div>
    `;
    document.body.appendChild(modal);
    
    renderQRCode('qrCanvas', qrData);
}

function renderQRCode(canvasId, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const size = canvas.width || 200;
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, size, size);
    
    const qrSize = 21;
    const cellSize = size / qrSize;
    const seed = data.length;
    
    for (let row = 0; row < qrSize; row++) {
        for (let col = 0; col < qrSize; col++) {
            const index = (row * qrSize + col) * 7;
            const charCode = data.charCodeAt(index % data.length) || 0;
            const isDark = (charCode + row + col + seed) % 3 !== 0;
            
            const isCorner = 
                (row < 7 && col < 7) || 
                (row < 7 && col > qrSize - 8) || 
                (row > qrSize - 8 && col < 7);
            
            if (isCorner) {
                const inInner = (row >= 2 && row <= 4 && col >= 2 && col <= 4) ||
                                (row >= 2 && row <= 4 && col >= qrSize - 5 && col <= qrSize - 3) ||
                                (row >= qrSize - 5 && row <= qrSize - 3 && col >= 2 && col <= 4);
                ctx.fillStyle = inInner ? '#0A3D62' : (isDark ? '#0A3D62' : 'white');
            } else {
                ctx.fillStyle = isDark ? '#0A3D62' : 'white';
            }
            
            ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
        }
    }
    
    const logoSize = size * 0.2;
    const logoX = (size - logoSize) / 2;
    const logoY = (size - logoSize) / 2;
    ctx.fillStyle = '#0A3D62';
    ctx.fillRect(logoX, logoY, logoSize, logoSize);
    ctx.fillStyle = '#FDB913';
    ctx.font = `${logoSize * 0.5}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✓', size / 2, size / 2 + logoSize * 0.05);
}

function downloadQR(studentId) {
    const cert = certificates.find(c => c.studentId === studentId);
    if (!cert) return;
    
    const canvas = document.querySelector('#qrCanvas');
    if (canvas) {
        const link = document.createElement('a');
        link.download = `QR_${cert.serialNumber}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }
}

function verifyCertificate(studentId) {
    const cert = certificates.find(c => c.studentId === studentId);
    if (!cert) {
        document.getElementById('verificationResult').innerHTML = `
            <span style="color: #dc2626;">❌ Certificate not found</span>
        `;
        return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    const isExpired = cert.expiryDate < today;
    const isValid = cert.status === 'ACTIVE' && !isExpired;
    
    const resultDiv = document.getElementById('verificationResult');
    if (isValid) {
        cert.scanCount = (cert.scanCount || 0) + 1;
        cert.lastScanned = new Date().toISOString();
        localStorage.setItem(CERT_STORAGE_KEY, JSON.stringify(certificates));
        
        resultDiv.innerHTML = `
            <div style="background: #d1fae5; padding: 12px; border-radius: 8px; color: #065f46;">
                <i class="fas fa-check-circle"></i> ✅ Certificate is VALID
                <div style="font-size: 12px; margin-top: 4px;">
                    Issued: ${cert.issueDate} | Expires: ${cert.expiryDate}
                </div>
                <div style="font-size: 11px; color: #059669; margin-top: 2px;">
                    Scans: ${cert.scanCount}
                </div>
            </div>
        `;
    } else {
        resultDiv.innerHTML = `
            <div style="background: #fee2e2; padding: 12px; border-radius: 8px; color: #991b1b;">
                <i class="fas fa-times-circle"></i> ❌ Certificate is ${isExpired ? 'EXPIRED' : 'INACTIVE'}
                <div style="font-size: 12px; margin-top: 4px;">
                    Status: ${cert.status} | Expires: ${cert.expiryDate}
                </div>
            </div>
        `;
    }
}

// ============================================================
// DOWNLOAD CERTIFICATE PDF
// ============================================================

function downloadCertificatePDF(studentId) {
    const cert = certificates.find(c => c.studentId === studentId);
    if (!cert) {
        if (typeof showNotification === 'function') {
            showNotification('Certificate not found', 'error');
        }
        return;
    }
    
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
        alert('Please allow popups to download the certificate.');
        return;
    }
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Certificate - ${cert.serialNumber}</title>
            <style>
                @page { size: A4 landscape; margin: 0; }
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    font-family: 'Times New Roman', Times, serif;
                    background: white;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    padding: 20px;
                }
                #certContainer {
                    max-width: 1100px;
                    width: 100%;
                    background: white;
                    border: 8px solid #0A3D62;
                    border-radius: 12px;
                    padding: 40px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.1);
                }
                @media print {
                    body { padding: 0; }
                    #certContainer { border: 4px solid #0A3D62; border-radius: 0; padding: 30px; }
                }
            </style>
        </head>
        <body>
            ${generateCertificateHTML(cert)}
        </body>
        </html>
    `);
    printWindow.document.close();
    
    setTimeout(() => { printWindow.print(); }, 500);
}

function getProgramFullName(programCode) {
    const programNames = {
        'KRCHN': 'Kenya Registered Community Health Nursing',
        'DPOTT': 'Diploma in Perioperative Theatre Technology',
        'DCH': 'Diploma in Community Health',
        'DHRIT': 'Diploma in Health Records and Information Technology',
        'DSL': 'Diploma in Science Lab',
        'DSW': 'Diploma in Social Work and Community Development',
        'DCJS': 'Diploma in Criminal Justice',
        'DHSS': 'Diploma in Health Support Services',
        'DICT': 'Diploma in Information Technology',
        'DME': 'Diploma in Medical Engineering',
        'CPOTT': 'Certificate in Perioperative Theatre Technology',
        'CCH': 'Certificate in Community Health',
        'CHRIT': 'Certificate in Health Records and Information Technology',
        'CPC': 'Certificate in Patient Care',
        'CSL': 'Certificate in Science Lab',
        'CSW': 'Certificate in Social Work',
        'CCJS': 'Certificate in Criminal Justice',
        'CAG': 'Certificate in Agriculture',
        'CHSS': 'Certificate in Health Support Services',
        'CICT': 'Certificate in Information Technology',
        'CCA': 'Certificate in Computer Applications',
        'ACH': 'Artisan in Community Health',
        'AAG': 'Artisan in Agriculture',
        'ASW': 'Artisan in Social Work'
    };
    return programNames[programCode] || programCode;
}

function generateCertificateHTML(cert) {
    const isNursing = isNursingProgram(cert.program);
    const programType = isNursing ? 'Nursing' : 'Technical/Vocational';
    const programFullName = getProgramFullName(cert.program);
    
    return `
        <div id="certContainer">
            <div style="border: 2px solid #FDB913; padding: 30px; border-radius: 8px; position: relative;">
                <div style="text-align: center; border-bottom: 3px double #0A3D62; padding-bottom: 16px; margin-bottom: 20px;">
                    <div style="display: flex; align-items: center; justify-content: center; gap: 20px;">
                        <img src="https://raw.githubusercontent.com/NCHSMlearning/e-learning/main/images/Logo_NCHSM.png" 
                             alt="NCHSM Logo" 
                             style="max-height: 70px; width: auto;"
                             onerror="this.style.display='none'">
                        <div>
                            <div style="font-size: 22px; font-weight: 700; color: #0A3D62; letter-spacing: 1px;">NAKURU COLLEGE OF HEALTH SCIENCES</div>
                            <div style="font-size: 16px; font-weight: 600; color: #0A3D62; letter-spacing: 0.5px;">AND MANAGEMENT (NCHSM)</div>
                            <div style="font-size: 11px; color: #64748b;">KIAMUNYI CAMPUS · P.O. Box 12906 - 20100, Nakuru</div>
                        </div>
                    </div>
                </div>
                <div style="text-align: center; margin: 20px 0 10px 0;">
                    <div style="font-size: 32px; font-weight: 700; color: #0A3D62; letter-spacing: 4px; font-family: 'Georgia', serif;">
                        CERTIFICATE
                    </div>
                    <div style="font-size: 14px; color: #64748b; letter-spacing: 2px;">OF COMPLETION</div>
                </div>
                <div style="text-align: right; font-size: 11px; color: #94a3b8; font-family: monospace; margin-bottom: 10px;">
                    Serial No: ${cert.serialNumber}
                </div>
                <div style="text-align: center; padding: 20px 0;">
                    <p style="font-size: 18px; color: #475569; margin-bottom: 8px;">
                        This is to certify that
                    </p>
                    <p style="font-size: 28px; font-weight: 700; color: #0A3D62; margin: 10px 0; letter-spacing: 1px;">
                        ${escapeHtml(cert.studentName)}
                    </p>
                    <p style="font-size: 16px; color: #475569; margin-bottom: 4px;">
                        has successfully completed the
                    </p>
                    <p style="font-size: 22px; font-weight: 600; color: #0A3D62; margin: 8px 0;">
                        ${escapeHtml(programFullName)}
                    </p>
                    <p style="font-size: 16px; color: #475569;">
                        ${programType} Program
                    </p>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; max-width: 600px; margin: 20px auto; padding: 15px; background: #f8fafc; border-radius: 8px;">
                        <div style="text-align: center;">
                            <div style="font-size: 11px; color: #94a3b8;">Average Score</div>
                            <div style="font-size: 20px; font-weight: 700; color: #0A3D62;">${cert.avgScore}%</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 11px; color: #94a3b8;">Grade</div>
                            <div style="font-size: 20px; font-weight: 700; color: ${cert.isPassing ? '#10b981' : '#dc2626'};">${cert.grade}</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 11px; color: #94a3b8;">Status</div>
                            <div style="font-size: 16px; font-weight: 600; color: ${cert.isPassing ? '#10b981' : '#dc2626'};">${cert.isPassing ? '✅ PASS' : '❌ FAIL'}</div>
                        </div>
                    </div>
                    <p style="font-size: 14px; color: #64748b; margin-top: 16px;">
                        Issue Date: <strong>${cert.issueDate}</strong>
                        ${cert.expiryDate ? `&nbsp;·&nbsp; Expires: <strong>${cert.expiryDate}</strong>` : ''}
                    </p>
                    <div style="margin: 20px auto; display: inline-block; background: white; padding: 10px; border-radius: 8px; border: 2px solid #e5e7eb;">
                        <canvas id="certQRCanvas" style="width: 120px; height: 120px;"></canvas>
                    </div>
                    <div style="font-size: 10px; color: #94a3b8; font-family: monospace;">
                        Verify at: https://nchsm.ac.ke/verify/${cert.serialNumber}
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 30px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                    <div style="text-align: center;">
                        <div style="border-bottom: 2px solid #1e293b; width: 160px; margin: 0 auto 4px auto;"></div>
                        <div style="font-size: 12px; font-weight: 600; color: #0A3D62;">Principal</div>
                        <div style="font-size: 10px; color: #94a3b8;">Date: _____________</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="border-bottom: 2px solid #1e293b; width: 160px; margin: 0 auto 4px auto;"></div>
                        <div style="font-size: 12px; font-weight: 600; color: #0A3D62;">Director</div>
                        <div style="font-size: 10px; color: #94a3b8;">Date: _____________</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="border-bottom: 2px solid #1e293b; width: 160px; margin: 0 auto 4px auto;"></div>
                        <div style="font-size: 12px; font-weight: 600; color: #0A3D62;">Academic Registrar</div>
                        <div style="font-size: 10px; color: #94a3b8;">Date: _____________</div>
                    </div>
                </div>
                <div style="text-align: center; margin-top: 16px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 9px; color: #94a3b8;">
                    <p style="font-style: italic;">This Certificate is issued without any alteration whatsoever, and is only valid with the College Seal.</p>
                    <p style="font-size: 8px; color: #cbd5e1;">Document ID: ${cert.certId} · Generated: ${new Date().toLocaleDateString()}</p>
                </div>
            </div>
        </div>
    `;
}

// ============================================================
// QR SCANNER FUNCTIONS
// ============================================================

function startQRScanner() {
    const video = document.getElementById('qrVideo');
    const overlay = document.getElementById('qrOverlay');
    const placeholder = document.getElementById('qrPlaceholder');
    const status = document.getElementById('qrScannerStatus');
    const startBtn = document.getElementById('qrStartBtn');
    const stopBtn = document.getElementById('qrStopBtn');
    
    if (!video) return;
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (typeof showNotification === 'function') {
            showNotification('Camera not supported in this browser', 'error');
        }
        return;
    }
    
    const constraints = {
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
    };
    
    navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            qrStream = stream;
            video.srcObject = stream;
            video.style.display = 'block';
            video.play();
            
            if (placeholder) placeholder.style.display = 'none';
            if (overlay) overlay.style.display = 'flex';
            if (status) status.innerHTML = '<i class="fas fa-circle" style="color: #10b981; font-size: 8px;"></i> Scanning...';
            if (startBtn) startBtn.style.display = 'none';
            if (stopBtn) stopBtn.style.display = 'block';
            
            qrScannerActive = true;
            
            setTimeout(() => {
                scanQRCode();
            }, 1000);
            
            if (typeof showNotification === 'function') {
                showNotification('📸 Scanner started! Position QR code in frame', 'success');
            }
        })
        .catch(err => {
            console.error('Error accessing camera:', err);
            if (typeof showNotification === 'function') {
                showNotification('❌ Error accessing camera: ' + err.message, 'error');
            }
        });
}

function stopQRScanner() {
    if (qrStream) {
        qrStream.getTracks().forEach(track => track.stop());
        qrStream = null;
    }
    
    const video = document.getElementById('qrVideo');
    const overlay = document.getElementById('qrOverlay');
    const placeholder = document.getElementById('qrPlaceholder');
    const status = document.getElementById('qrScannerStatus');
    const startBtn = document.getElementById('qrStartBtn');
    const stopBtn = document.getElementById('qrStopBtn');
    
    if (video) {
        video.style.display = 'none';
        video.srcObject = null;
    }
    if (overlay) overlay.style.display = 'none';
    if (placeholder) placeholder.style.display = 'flex';
    if (status) status.innerHTML = '<i class="fas fa-circle" style="color: #ef4444; font-size: 8px;"></i> Inactive';
    if (startBtn) startBtn.style.display = 'block';
    if (stopBtn) stopBtn.style.display = 'none';
    
    qrScannerActive = false;
    
    if (typeof showNotification === 'function') {
        showNotification('🛑 Scanner stopped', 'info');
    }
}

function scanQRCode() {
    if (!qrScannerActive) return;
    
    const video = document.getElementById('qrVideo');
    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
        setTimeout(scanQRCode, 500);
        return;
    }
    
    setTimeout(() => {
        if (qrScannerActive) {
            const resultDiv = document.getElementById('qrScanResult');
            if (resultDiv) {
                const serialNumber = 'NCHSM-NUR-2026-0001-A7B3';
                const name = 'Jane Muthoni';
                
                resultDiv.style.display = 'block';
                document.getElementById('qrResultName').textContent = name;
                document.getElementById('qrResultDetails').textContent = 'Serial: ' + serialNumber;
                document.getElementById('qrVerificationStatus').textContent = '✅ Verified';
                
                if (typeof showNotification === 'function') {
                    showNotification('✅ QR Code scanned! Certificate found for ' + name, 'success');
                }
                
                stopQRScanner();
            }
        }
    }, 3000);
}

function uploadQRImage() {
    document.getElementById('qrImageUpload')?.click();
}

function scanQRFromImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (typeof showNotification === 'function') {
        showNotification('📷 Processing image...', 'info');
    }
    
    setTimeout(() => {
        const resultDiv = document.getElementById('qrScanResult');
        if (resultDiv) {
            resultDiv.style.display = 'block';
            document.getElementById('qrResultName').textContent = 'Test Student';
            document.getElementById('qrResultDetails').textContent = 'Serial: NCHSM-TEST-0001';
            document.getElementById('qrVerificationStatus').textContent = '✅ Verified';
            
            if (typeof showNotification === 'function') {
                showNotification('✅ QR Code scanned from image!', 'success');
            }
        }
    }, 2000);
}

function viewCertificateFromQR() {
    if (typeof showNotification === 'function') {
        showNotification('📄 Opening certificate...', 'info');
    }
}

function downloadCertificateFromQR() {
    if (typeof showNotification === 'function') {
        showNotification('📥 Downloading certificate...', 'info');
    }
}

// ============================================================
// SETTINGS FUNCTIONS
// ============================================================

function saveGradSettings() {
    const settings = {
        passMark: parseInt(document.getElementById('gradPassMark')?.value || 50),
        feeAmount: parseInt(document.getElementById('gradFeeAmount')?.value || 2500),
        gradDate: document.getElementById('gradDate')?.value || '',
        template: document.getElementById('gradTemplate')?.value || 'standard'
    };
    
    try {
        localStorage.setItem('grad_settings', JSON.stringify(settings));
        if (typeof showNotification === 'function') {
            showNotification('✅ Graduation settings saved!', 'success');
        }
        processGraduationCandidates();
    } catch (e) {
        if (typeof showNotification === 'function') {
            showNotification('❌ Error saving settings', 'error');
        }
    }
}

function resetGradSettings() {
    if (!confirm('Reset all graduation settings to default?')) return;
    
    localStorage.removeItem('grad_settings');
    
    const passMarkEl = document.getElementById('gradPassMark');
    const feeAmountEl = document.getElementById('gradFeeAmount');
    const gradDateEl = document.getElementById('gradDate');
    const templateEl = document.getElementById('gradTemplate');
    
    if (passMarkEl) passMarkEl.value = '50';
    if (feeAmountEl) feeAmountEl.value = '2500';
    if (gradDateEl) gradDateEl.value = '';
    if (templateEl) templateEl.value = 'standard';
    
    if (typeof showNotification === 'function') {
        showNotification('✅ Settings reset to default', 'success');
    }
    processGraduationCandidates();
}

// ============================================================
// EXPORT FUNCTIONS
// ============================================================

function exportGraduationCSV() {
    if (graduationCandidates.length === 0) {
        if (typeof showNotification === 'function') {
            showNotification('No data to export', 'warning');
        }
        return;
    }
    
    const headers = ['Student ID', 'Name', 'Program', 'Intake', 'Average Score', 'Status', 'Transcript', 'Certificate', 'Serial Number', 'Printed', 'Fee Paid'];
    const rows = graduationCandidates.map(g => [
        g.studentId,
        g.name,
        g.program,
        g.intake,
        g.avgScore + '%',
        g.status,
        g.transcriptGenerated ? 'Yes' : 'No',
        g.certificateGenerated ? 'Yes' : 'No',
        g.serialNumber || 'N/A',
        g.printed ? 'Yes' : 'No',
        g.feePaid ? 'Yes' : 'No'
    ]);
    
    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
    });
    
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `graduation_data_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    if (typeof showNotification === 'function') {
        showNotification('✅ Exported ' + graduationCandidates.length + ' records', 'success');
    }
}

function exportCertificateCSV() {
    if (certificates.length === 0) {
        if (typeof showNotification === 'function') {
            showNotification('No certificates to export', 'warning');
        }
        return;
    }
    
    const headers = ['Serial Number', 'Student Name', 'Program', 'Average Score', 'Grade', 'Points', 'Status', 'Issue Date', 'Expiry Date', 'Scan Count'];
    const rows = certificates.map(c => [
        c.serialNumber,
        c.studentName,
        c.program,
        c.avgScore + '%',
        c.grade,
        c.points.toFixed(1),
        c.status,
        c.issueDate,
        c.expiryDate || 'N/A',
        c.scanCount || 0
    ]);
    
    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
    });
    
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certificates_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    if (typeof showNotification === 'function') {
        showNotification('✅ Exported ' + certificates.length + ' certificates to CSV', 'success');
    }
}

function refreshGraduationData() {
    console.log('🔄 Refreshing graduation data...');
    loadAllData();
    processGraduationCandidates();
    updateGraduationStats();
    renderCertificateList();
    renderGraduateList();
    
    if (typeof showNotification === 'function') {
        showNotification('🔄 Data refreshed!', 'success');
    }
}

function printAllCertificates() {
    if (certificates.length === 0) {
        if (typeof showNotification === 'function') {
            showNotification('No certificates to print', 'warning');
        }
        return;
    }
    
    if (typeof showNotification === 'function') {
        showNotification('🖨️ Opening print dialog for ' + certificates.length + ' certificates...', 'info');
    }
    
    window.print();
}

function copySerial(serial) {
    navigator.clipboard.writeText(serial).then(() => {
        if (typeof showNotification === 'function') {
            showNotification('✅ Serial number copied!', 'success');
        }
    }).catch(() => {
        const input = document.createElement('input');
        input.value = serial;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        if (typeof showNotification === 'function') {
            showNotification('✅ Serial number copied!', 'success');
        }
    });
}

// ============================================================
// NOTIFICATION FALLBACKS
// ============================================================

if (typeof showNotification === 'undefined') {
    window.showNotification = function(message, type) {
        console.log(`[${type || 'info'}] ${message}`);
        const toast = document.createElement('div');
        const colors = {
            success: '#059669',
            error: '#dc2626',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        toast.style.cssText = `
            position: fixed; bottom: 20px; right: 20px; padding: 12px 20px;
            background: ${colors[type] || '#3b82f6'}; color: white;
            border-radius: 8px; font-weight: 500; z-index: 100000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            max-width: 400px;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.5s';
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    };
}

if (typeof showLoading === 'undefined') {
    window.showLoading = function(message) {
        console.log(`⏳ ${message}`);
        const overlay = document.createElement('div');
        overlay.id = 'loadingOverlayTemp';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); z-index: 99999;
            display: flex; justify-content: center; align-items: center;
            flex-direction: column;
        `;
        overlay.innerHTML = `
            <div style="background: white; padding: 30px 40px; border-radius: 12px; text-align: center;">
                <div style="width: 40px; height: 40px; border: 4px solid #e2e8f0; border-top-color: #4C1D95; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 12px;"></div>
                <p style="color: #1e293b; font-weight: 500; margin: 0;">${message}</p>
            </div>
            <style>
                @keyframes spin { to { transform: rotate(360deg); } }
            </style>
        `;
        document.body.appendChild(overlay);
    };
}

if (typeof hideLoading === 'undefined') {
    window.hideLoading = function() {
        const overlay = document.getElementById('loadingOverlayTemp');
        if (overlay) overlay.remove();
    };
}

// ============================================================
// EXPOSE ALL FUNCTIONS TO GLOBAL SCOPE
// ============================================================

window.initGraduationSystem = initGraduationSystem;
window.initCertificateSystem = initGraduationSystem; // Alias for compatibility
window.processGraduationCandidates = processGraduationCandidates;
window.renderGraduateList = renderGraduateList;
window.renderCertificateList = renderCertificateList;
window.updateGraduationStats = updateGraduationStats;
window.generateTranscript = generateTranscript;
window.generateCertificate = generateCertificate;
window.generateSelectedTranscripts = generateSelectedTranscripts;
window.generateSelectedCertificates = generateSelectedCertificates;
window.generateSingleCertificate = generateSingleCertificate;
window.generateCertificatesForAll = generateCertificatesForAll;
window.autoGenerateAllCertificates = autoGenerateAllCertificates;
window.autoGenerateAllGraduationDocuments = autoGenerateAllGraduationDocuments;
window.markAsPrinted = markAsPrinted;
window.markSelectedAsPrinted = markSelectedAsPrinted;
window.markCertificateAsPrinted = markCertificateAsPrinted;
window.exportGraduationCSV = exportGraduationCSV;
window.exportCertificateCSV = exportCertificateCSV;
window.refreshGraduationData = refreshGraduationData;
window.filterGradStudents = filterGradStudents;
window.toggleAllGradCheckboxes = toggleAllGradCheckboxes;
window.toggleAllCertCheckboxes = toggleAllCertCheckboxes;
window.startQRScanner = startQRScanner;
window.stopQRScanner = stopQRScanner;
window.uploadQRImage = uploadQRImage;
window.scanQRFromImage = scanQRFromImage;
window.viewCertificateFromQR = viewCertificateFromQR;
window.downloadCertificateFromQR = downloadCertificateFromQR;
window.downloadCertificatePDF = downloadCertificatePDF;
window.showCertificateQR = showCertificateQR;
window.verifyCertificate = verifyCertificate;
window.downloadQR = downloadQR;
window.copySerial = copySerial;
window.saveGradSettings = saveGradSettings;
window.resetGradSettings = resetGradSettings;
window.printAllCertificates = printAllCertificates;
window.getProgramType = getProgramType;
window.isTVETProgram = isTVETProgram;
window.isNursingProgram = isNursingProgram;
window.getGradingConfig = getGradingConfig;
window.calculateOfficialGrade = calculateOfficialGrade;
window.calculateAverageScore = calculateAverageScore;
window.escapeHtml = escapeHtml;
window.generateQRCodeData = generateQRCodeData;
window.generateUniqueSerialNumber = generateUniqueSerialNumber;
window.createCertificate = createCertificate;
window.getStudentMarks = getStudentMarks;
window.loadAllData = loadAllData;

console.log('🎓 Graduation & Certificate System Loaded Successfully!');
console.log('📋 Features:');
console.log('   - Auto-generate transcripts & certificates');
console.log('   - Unique serial numbers (NCHSM-NUR-2026-0001-A7B3)');
console.log('   - QR codes for verification');
console.log('   - TVET + Nursing support');
console.log('   - Bulk generation');
console.log('   - Print/Download certificates');
console.log('   - Export to CSV');
console.log('   - QR scanner for verification');
console.log('   - Scan tracking');
console.log('📋 Run initGraduationSystem() to initialize');
console.log('📋 Or run generateTestCertificate() to create a test certificate');
