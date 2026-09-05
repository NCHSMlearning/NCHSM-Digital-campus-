// ============================================================
// 🎓 COMPLETE GRADUATION & CERTIFICATE SYSTEM
// FIXED: Uses grad* IDs that match your HTML
// ============================================================

console.log('🎓 Graduation & Certificate System Loading...');

// ============================================================
// GLOBAL VARIABLES - Safe declarations
// ============================================================

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
    } catch (e) {
        console.warn('Could not load grad settings:', e);
    }
}

// ============================================================
// RENDER FUNCTIONS - USING YOUR HTML IDs (grad*)
// ============================================================

function renderGraduateList() {
    // ✅ FIXED: Use gradStudentsList (your HTML ID)
    const tbody = document.getElementById('gradStudentsList');
    if (!tbody) {
        console.warn('⚠️ gradStudentsList element not found');
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
    // ✅ FIXED: Use gradRecentList or create container
    let tbody = document.getElementById('gradRecentList');
    if (!tbody) {
        // Try to find or create a container for recent certificates
        const section = document.getElementById('certificate-management');
        if (section) {
            // Look for a table with appropriate headers
            const tables = section.querySelectorAll('table');
            let targetTable = null;
            tables.forEach(table => {
                const headers = table.querySelectorAll('th');
                const headerTexts = Array.from(headers).map(th => th.textContent.toLowerCase());
                if (headerTexts.some(t => t.includes('certificate') || t.includes('serial') || t.includes('recent'))) {
                    targetTable = table;
                }
            });
            if (targetTable) {
                tbody = targetTable.querySelector('tbody');
                if (tbody) {
                    tbody.id = 'gradRecentList';
                }
            }
        }
        
        if (!tbody) {
            console.warn('⚠️ No recent certificates table found, skipping render');
            return;
        }
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
    
    // ✅ FIXED: Use your HTML IDs (grad*)
    const elements = {
        'gradTotalStudents': total,
        'gradGraduatesCount': graduates.length,
        'gradPendingCount': pending.length,
        'gradPrintedCount': printed.length,
        'gradScanCount': scanned,
        'gradNotEligibleCount': notEligible.length
    };
    
    for (const [id, value] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = value;
        } else {
            console.warn(`⚠️ Element ${id} not found`);
        }
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
    if (!selectAll) return;
    const checkboxes = document.querySelectorAll('.cert-student-checkbox:not([disabled])');
    const isChecked = selectAll?.checked || false;
    checkboxes.forEach(cb => cb.checked = isChecked);
}

function filterGradStudents() {
    renderGraduateList();
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
    renderGraduateList();
    updateGraduationStats();
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

// Alias for compatibility
window.initCertificateSystem = initGraduationSystem;

// ============================================================
// GENERATE FUNCTIONS (Shortened - keep the rest from your file)
// ============================================================

function generateTranscript(studentId) {
    // ... keep your existing function ...
}

function generateCertificate(studentId) {
    // ... keep your existing function ...
}

function generateSingleCertificate(studentId) {
    // ... keep your existing function ...
}

function generateSelectedTranscripts() {
    // ... keep your existing function ...
}

function generateSelectedCertificates() {
    // ... keep your existing function ...
}

function generateCertificatesForAll() {
    // ... keep your existing function ...
}

function autoGenerateAllCertificates() {
    // ... keep your existing function ...
}

function autoGenerateAllGraduationDocuments() {
    // ... keep your existing function ...
}

// ============================================================
// MARK AS PRINTED
// ============================================================

function markAsPrinted(studentId) {
    // ... keep your existing function ...
}

function markSelectedAsPrinted() {
    // ... keep your existing function ...
}

function markCertificateAsPrinted(studentId) {
    markAsPrinted(studentId);
}

// ============================================================
// QR CODE FUNCTIONS (Keep your existing functions)
// ============================================================

function showCertificateQR(studentId) {
    // ... keep your existing function ...
}

function renderQRCode(canvasId, data) {
    // ... keep your existing function ...
}

function downloadQR(studentId) {
    // ... keep your existing function ...
}

function verifyCertificate(studentId) {
    // ... keep your existing function ...
}

function startQRScanner() {
    // ... keep your existing function ...
}

function stopQRScanner() {
    // ... keep your existing function ...
}

function uploadQRImage() {
    // ... keep your existing function ...
}

function scanQRFromImage(event) {
    // ... keep your existing function ...
}

function viewCertificateFromQR() {
    // ... keep your existing function ...
}

function downloadCertificateFromQR() {
    // ... keep your existing function ...
}

// ============================================================
// SETTINGS & EXPORT FUNCTIONS (Keep your existing functions)
// ============================================================

function saveGradSettings() {
    // ... keep your existing function ...
}

function resetGradSettings() {
    // ... keep your existing function ...
}

function exportGraduationCSV() {
    // ... keep your existing function ...
}

function exportCertificateCSV() {
    // ... keep your existing function ...
}

function refreshGraduationData() {
    // ... keep your existing function ...
}

function printAllCertificates() {
    // ... keep your existing function ...
}

function copySerial(serial) {
    // ... keep your existing function ...
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
window.initCertificateSystem = initGraduationSystem;
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
console.log('📋 Using HTML IDs: gradStudentsList, gradTotalStudents, etc.');
console.log('📋
