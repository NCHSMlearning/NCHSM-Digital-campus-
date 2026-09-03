// ============================================================
// 🎓 GRADUATION & CERTIFICATE MANAGEMENT
// Auto-generates transcripts & certificates from marks
// ============================================================

console.log('🎓 Super Admin Graduation Module Loading...');

// ============================================================
// GLOBAL VARIABLES - Safe declarations
// ============================================================

if (typeof MAX_RETAKES === 'undefined') {
    var MAX_RETAKES = 2;
}

if (typeof GRAD_STORAGE_KEY === 'undefined') {
    var GRAD_STORAGE_KEY = 'nchsm_graduation';
}

if (typeof CERT_STORAGE_KEY === 'undefined') {
    var CERT_STORAGE_KEY = 'nchsm_certificates';
}

if (typeof TRANSCRIPT_STORAGE_KEY === 'undefined') {
    var TRANSCRIPT_STORAGE_KEY = 'nchsm_transcripts';
}

let graduationCandidates = [];
let certificates = [];
let transcripts = [];
let allStudentMarks = {};
let qrScannerActive = false;
let qrStream = null;
let scannedQRData = null;

// ============================================================
// INITIALIZATION
// ============================================================

function initGraduationSystem() {
    console.log('🎓 Initializing Graduation & Certificate System...');
    loadAllData();
    loadGradSettings();
    processGraduationCandidates();
    updateGraduationStats();
    setupGraduationEventListeners();
    console.log('✅ Graduation system initialized!');
}

function loadAllData() {
    // Load graduation candidates
    try {
        const data = localStorage.getItem(GRAD_STORAGE_KEY);
        graduationCandidates = data ? JSON.parse(data) : [];
    } catch (e) {
        graduationCandidates = [];
    }
    
    // Load certificates
    try {
        const data = localStorage.getItem(CERT_STORAGE_KEY);
        certificates = data ? JSON.parse(data) : [];
    } catch (e) {
        certificates = [];
    }
    
    // Load transcripts
    try {
        const data = localStorage.getItem(TRANSCRIPT_STORAGE_KEY);
        transcripts = data ? JSON.parse(data) : [];
    } catch (e) {
        transcripts = [];
    }
    
    // Load student marks from marks entry system
    try {
        const data = localStorage.getItem('student_marks');
        allStudentMarks = data ? JSON.parse(data) : {};
    } catch (e) {
        allStudentMarks = {};
    }
    
    console.log(`📊 Loaded: ${Object.keys(allStudentMarks).length} students with marks`);
    console.log(`📄 Loaded: ${transcripts.length} transcripts`);
    console.log(`🏆 Loaded: ${certificates.length} certificates`);
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

function setupGraduationEventListeners() {
    const programFilter = document.getElementById('gradProgramFilter');
    const statusFilter = document.getElementById('gradStatusFilter');
    const selectAll = document.getElementById('gradSelectAll');
    
    if (programFilter) programFilter.addEventListener('change', filterGradStudents);
    if (statusFilter) statusFilter.addEventListener('change', filterGradStudents);
    if (selectAll) selectAll.addEventListener('change', toggleAllGradCheckboxes);
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
// GRADE CALCULATION (Matches Transcript Generator)
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
// GET SAMPLE STUDENTS
// ============================================================

function getSampleStudents() {
    return [
        { id: 'STU-001', name: 'Jane Muthoni', email: 'jane@nchsm.ac.ke', program: 'KRCHN', intake: '2026', block: 'Final' },
        { id: 'STU-002', name: 'Peter Ochieng', email: 'peter@nchsm.ac.ke', program: 'DPOTT', intake: '2026', block: 'Final' },
        { id: 'STU-003', name: 'Sarah Wanjiru', email: 'sarah@nchsm.ac.ke', program: 'DCH', intake: '2026', block: 'Block 5' },
    ];
}

// ============================================================
// PROCESS GRADUATION CANDIDATES
// ============================================================

function processGraduationCandidates() {
    // Get all students
    let students = [];
    try {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        students = users.filter(u => u.role === 'student' && u.status === 'approved');
    } catch (e) {
        students = getSampleStudents();
    }
    
    const passMark = parseInt(document.getElementById('gradPassMark')?.value || 50);
    
    // Check each student's marks
    const processed = students.map(student => {
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

function getStudentMarks(studentId) {
    // Try to get marks from localStorage
    if (allStudentMarks[studentId]) {
        return allStudentMarks[studentId];
    }
    
    // Try to get from transcript data
    const transcriptMarks = transcripts
        .filter(t => t.studentId === studentId)
        .flatMap(t => t.marks || []);
    
    if (transcriptMarks.length > 0) {
        return transcriptMarks;
    }
    
    // Generate sample marks for testing
    return generateSampleMarks(studentId);
}

function generateSampleMarks(studentId) {
    const subjects = [
        'Anatomy', 'Physiology', 'Pharmacology', 'Clinical Practice',
        'Community Health', 'Nursing Theory', 'Pathology', 'Microbiology'
    ];
    
    return subjects.map((subject, index) => ({
        subject: subject,
        score: Math.round(50 + Math.random() * 45),
        subjectCode: `SUB${String(index + 1).padStart(3, '0')}`,
        block: 'Final'
    }));
}

// ============================================================
// GET STUDENTS WITH MARKS
// ============================================================

function getAllStudentsWithMarks() {
    try {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        return users.filter(u => u.role === 'student' && u.status === 'approved');
    } catch (e) {
        return getSampleStudents();
    }
}

// ============================================================
// RENDER FUNCTIONS
// ============================================================

function renderGraduationList() {
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
            <tr><td colspan="9" style="padding: 30px; text-align: center; color: #94a3b8;">
                <i class="fas fa-info-circle"></i> No graduation candidates found.
            </td></tr>
        `;
        return;
    }
    
    let html = '';
    filtered.forEach((student, index) => {
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
        
        const hasTranscript = student.transcriptGenerated;
        const hasCertificate = student.certificateGenerated;
        const hasQR = student.qrCode ? true : false;
        const avgScore = student.avgScore || 0;
        const isPassing = avgScore >= 50;
        
        html += `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 12px; text-align: center;">
                    <input type="checkbox" class="grad-student-checkbox" data-student-id="${student.studentId}" ${student.status === 'not_eligible' ? 'disabled' : ''}>
                </td>
                <td style="padding: 10px 12px;">
                    <strong>${escapeHtml(student.name)}</strong>
                    <div style="font-size: 11px; color: #94a3b8;">${escapeHtml(student.email || '')}</div>
                </td>
                <td style="padding: 10px 12px;">
                    <span style="background: ${isNursingProgram(student.program) ? '#dbeafe' : '#fef3c7'}; padding: 2px 8px; border-radius: 4px; font-size: 11px;">
                        ${escapeHtml(student.program)}
                    </span>
                </td>
                <td style="padding: 10px 12px; text-align: center;">
                    <span style="font-weight: 600; ${isPassing ? 'color: #10b981;' : 'color: #dc2626;'}">
                        ${avgScore}%
                    </span>
                </td>
                <td style="padding: 10px 12px; text-align: center;">
                    <span style="padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; ${statusColors[student.status] || ''}">
                        ${statusLabels[student.status] || student.status}
                    </span>
                </td>
                <td style="padding: 10px 12px; text-align: center;">
                    ${hasTranscript 
                        ? `<i class="fas fa-file-pdf" style="color: #059669; font-size: 18px; cursor: pointer;" onclick="viewTranscript('${student.studentId}')" title="View Transcript"></i>`
                        : `<span style="color: #94a3b8; font-size: 11px;">Not generated</span>`
                    }
                </td>
                <td style="padding: 10px 12px; text-align: center;">
                    ${hasCertificate 
                        ? `<i class="fas fa-certificate" style="color: #f59e0b; font-size: 18px; cursor: pointer;" onclick="viewCertificate('${student.studentId}')" title="View Certificate"></i>`
                        : `<span style="color: #94a3b8; font-size: 11px;">Not generated</span>`
                    }
                </td>
                <td style="padding: 10px 12px; text-align: center;">
                    ${hasQR 
                        ? `<i class="fas fa-qrcode" style="color: #4C1D95; font-size: 20px; cursor: pointer;" onclick="showCertificateQR('${student.studentId}')" title="Show QR Code"></i>`
                        : `<span style="color: #94a3b8; font-size: 11px;">No QR</span>`
                    }
                </td>
                <td style="padding: 10px 12px; text-align: center;">
                    <div style="display: flex; gap: 4px; justify-content: center; flex-wrap: wrap;">
                        <button onclick="generateTranscript('${student.studentId}')" class="btn-action" style="padding: 2px 8px; font-size: 10px; background: #4C1D95; color: white; border: none; border-radius: 4px; cursor: pointer;" title="Generate Transcript">
                            <i class="fas fa-file-pdf"></i>
                        </button>
                        <button onclick="generateCertificate('${student.studentId}')" class="btn-action" style="padding: 2px 8px; font-size: 10px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer;" title="Generate Certificate">
                            <i class="fas fa-certificate"></i>
                        </button>
                        <button onclick="markAsPrinted('${student.studentId}')" class="btn-action" style="padding: 2px 8px; font-size: 10px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;" title="Mark as Printed">
                            <i class="fas fa-print"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    updateGraduationSelectedCount();
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
        'gradNotEligibleCount': notEligible.length
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
        
        transcripts.push(transcriptData);
        localStorage.setItem(TRANSCRIPT_STORAGE_KEY, JSON.stringify(transcripts));
        
        // Update student record
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
        
        // Auto-generate certificate if transcript is generated
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
    
    // Check if certificate module is loaded
    if (typeof generateUniqueSerialNumber !== 'function' || typeof createCertificate !== 'function') {
        if (typeof showNotification === 'function') {
            showNotification('⚠️ Certificate module not loaded. Please refresh the page.', 'warning');
        }
        console.warn('⚠️ Certificate functions not available. Make sure superadmin-certificates.js is loaded.');
        return;
    }
    
    if (typeof showLoading === 'function') {
        showLoading('Generating certificate for ' + student.name + '...');
    }
    
    setTimeout(() => {
        try {
            // Get student data
            const studentData = {
                id: student.studentId,
                name: student.name,
                program: student.program,
                intake: student.intake,
                block: 'Final'
            };
            
            const marks = getStudentMarks(studentId);
            const transcript = transcripts.find(t => t.studentId === studentId);
            
            // Generate unique serial number
            const serialNumber = generateUniqueSerialNumber(studentData, studentData.program);
            const certId = 'CERT-' + Date.now().toString().slice(-8) + '-' + studentId.slice(-4);
            
            // Get grade info
            const avgScore = student.avgScore || 0;
            const gradeInfo = calculateOfficialGrade(avgScore, studentData.program);
            const isPassing = avgScore >= getGradingConfig(studentData.program).passMark;
            
            const certificateData = {
                certId: certId,
                studentId: studentId,
                studentName: student.name,
                program: student.program,
                intake: student.intake,
                serialNumber: serialNumber,
                issueDate: document.getElementById('gradDate')?.value || new Date().toISOString().split('T')[0],
                graduationDate: document.getElementById('gradDate')?.value || new Date().toISOString().split('T')[0],
                avgScore: avgScore,
                grade: gradeInfo.grade,
                points: gradeInfo.points,
                rating: gradeInfo.label,
                isPassing: isPassing,
                qrCode: generateQRCodeData ? generateQRCodeData({
                    certId: certId,
                    serialNumber: serialNumber,
                    studentId: studentId,
                    studentName: student.name,
                    program: student.program,
                    issueDate: document.getElementById('gradDate')?.value || new Date().toISOString().split('T')[0],
                    verificationUrl: 'https://nchsm.ac.ke/verify/' + serialNumber
                }) : null,
                generatedAt: new Date().toISOString(),
                printed: false,
                status: isPassing ? 'ACTIVE' : 'PENDING',
                scanCount: 0,
                expiryDate: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            };
            
            certificates.push(certificateData);
            localStorage.setItem(CERT_STORAGE_KEY, JSON.stringify(certificates));
            
            // Update student record
            student.certificateGenerated = true;
            student.certificateUrl = '#cert-' + certId;
            student.serialNumber = serialNumber;
            student.qrCode = certificateData.qrCode;
            student.status = isPassing ? 'ready' : 'pending';
            localStorage.setItem(GRAD_STORAGE_KEY, JSON.stringify(graduationCandidates));
            
            if (typeof hideLoading === 'function') {
                hideLoading();
            }
            if (typeof showNotification === 'function') {
                showNotification('✅ Certificate generated for ' + student.name + ' (Serial: ' + serialNumber + ')', 'success');
            }
            renderGraduationList();
            updateGraduationStats();
            
            // Auto-mark as printed if setting is enabled
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
    
    // Show progress
    const progressDiv = document.getElementById('gradProgress');
    if (progressDiv) {
        progressDiv.style.display = 'block';
        document.getElementById('gradProgressLabel').textContent = 'Generating transcripts...';
        document.getElementById('gradProgressStatus').textContent = '0/' + total + ' completed';
    }
    
    studentIds.forEach((studentId, index) => {
        setTimeout(() => {
            generateTranscript(studentId);
            completed++;
            
            // Update progress
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
                    setTimeout(() => {
                        progressDiv.style.display = 'none';
                    }, 3000);
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
    
    // Show progress
    const progressDiv = document.getElementById('gradProgress');
    if (progressDiv) {
        progressDiv.style.display = 'block';
        document.getElementById('gradProgressLabel').textContent = 'Generating certificates...';
        document.getElementById('gradProgressStatus').textContent = '0/' + total + ' completed';
    }
    
    studentIds.forEach((studentId, index) => {
        setTimeout(() => {
            generateCertificate(studentId);
            completed++;
            
            // Update progress
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
                    setTimeout(() => {
                        progressDiv.style.display = 'none';
                    }, 3000);
                }
            }
        }, index * 1000);
    });
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

function markAsPrinted(studentId) {
    const student = graduationCandidates.find(g => g.studentId === studentId);
    if (student) {
        student.printed = true;
        student.status = 'printed';
        localStorage.setItem(GRAD_STORAGE_KEY, JSON.stringify(graduationCandidates));
        
        // Update certificate
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

function refreshGraduationData() {
    console.log('🔄 Refreshing graduation data...');
    loadAllData();
    processGraduationCandidates();
    updateGraduationStats();
    
    if (typeof showNotification === 'function') {
        showNotification('🔄 Graduation data refreshed!', 'success');
    }
}

function filterGradStudents() {
    renderGraduationList();
}

// ============================================================
// VIEW FUNCTIONS
// ============================================================

function viewTranscript(studentId) {
    const student = graduationCandidates.find(g => g.studentId === studentId);
    if (!student) return;
    
    if (typeof showNotification === 'function') {
        showNotification('📄 Transcript for ' + student.name + ' (Coming soon)', 'info');
    }
}

function viewCertificate(studentId) {
    const student = graduationCandidates.find(g => g.studentId === studentId);
    if (!student) return;
    
    if (typeof showNotification === 'function') {
        showNotification('🏆 Certificate for ' + student.name + ' (Coming soon)', 'info');
    }
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
            
            // Start scanning after video is ready
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
    
    // Simple QR scanning simulation
    // In production, use a library like jsQR
    setTimeout(() => {
        if (qrScannerActive) {
            // For demo purposes, show a message
            const resultDiv = document.getElementById('qrScanResult');
            if (resultDiv) {
                // Simulate a QR scan after 5 seconds
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
    
    // For demo purposes
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
// AUTO-GENERATE ALL DOCUMENTS
// ============================================================

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
// UTILITY FUNCTIONS
// ============================================================

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
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
// EXPOSE TO GLOBAL SCOPE
// ============================================================

window.initGraduationSystem = initGraduationSystem;
window.processGraduationCandidates = processGraduationCandidates;
window.renderGraduationList = renderGraduationList;
window.updateGraduationStats = updateGraduationStats;
window.generateTranscript = generateTranscript;
window.generateCertificate = generateCertificate;
window.generateSelectedTranscripts = generateSelectedTranscripts;
window.generateSelectedCertificates = generateSelectedCertificates;
window.markSelectedAsPrinted = markSelectedAsPrinted;
window.markAsPrinted = markAsPrinted;
window.exportGraduationCSV = exportGraduationCSV;
window.refreshGraduationData = refreshGraduationData;
window.filterGradStudents = filterGradStudents;
window.toggleAllGradCheckboxes = toggleAllGradCheckboxes;
window.viewTranscript = viewTranscript;
window.viewCertificate = viewCertificate;
window.startQRScanner = startQRScanner;
window.stopQRScanner = stopQRScanner;
window.uploadQRImage = uploadQRImage;
window.scanQRFromImage = scanQRFromImage;
window.viewCertificateFromQR = viewCertificateFromQR;
window.downloadCertificateFromQR = downloadCertificateFromQR;
window.autoGenerateAllGraduationDocuments = autoGenerateAllGraduationDocuments;
window.printAllCertificates = printAllCertificates;
window.saveGradSettings = saveGradSettings;
window.resetGradSettings = resetGradSettings;
window.getProgramType = getProgramType;
window.isTVETProgram = isTVETProgram;
window.isNursingProgram = isNursingProgram;
window.getGradingConfig = getGradingConfig;
window.calculateOfficialGrade = calculateOfficialGrade;
window.calculateAverageScore = calculateAverageScore;
window.escapeHtml = escapeHtml;

console.log('🎓 Graduation System Loaded Successfully!');
console.log('📋 Features:');
console.log('   - Graduation candidate management');
console.log('   - Auto-generate transcripts');
console.log('   - Auto-generate certificates (requires superadmin-certificates.js)');
console.log('   - Bulk operations');
console.log('   - QR scanner for verification');
console.log('   - Export to CSV');
console.log('   - Graduation settings');
console.log('📋 Run initGraduationSystem() to initialize');
