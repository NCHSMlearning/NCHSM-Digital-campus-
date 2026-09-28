// ============================================================
// 🎓 COMPLETE GRADUATION & CERTIFICATE SYSTEM — FULL VERSION
// ============================================================

console.log('🎓 Graduation & Certificate System Loading...');

// ============================================================
// GLOBAL VARIABLES
// ============================================================

if (typeof CERT_STORAGE_KEY === 'undefined') var CERT_STORAGE_KEY = 'nchsm_certificates';
if (typeof CERT_SERIAL_PREFIX === 'undefined') var CERT_SERIAL_PREFIX = 'NCHSM-';
if (typeof GRAD_STORAGE_KEY === 'undefined') var GRAD_STORAGE_KEY = 'nchsm_graduation';
if (typeof TRANSCRIPT_STORAGE_KEY === 'undefined') var TRANSCRIPT_STORAGE_KEY = 'nchsm_transcripts';
if (typeof AUDIT_LOG_KEY === 'undefined') var AUDIT_LOG_KEY = 'nchsm_audit_log';

let certificates = [];
let graduationCandidates = [];
let allStudents = [];
let allMarks = {};
let allTranscripts = [];
let qrScannerActive = false;
let qrStream = null;
let qrAnimationFrame = null;
let currentQRStudentId = null;
let currentQRSerial = null;
let currentPreviewCert = null;

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
    }
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

function calculateOfficialGrade(score, programCode) {
    const config = getGradingConfig(programCode);
    const grades = config.grades;
    if (score === null || score === undefined || score === 0) {
        const defaultGrade = isNursingProgram(programCode) ? 'D' : 'E';
        return {
            grade: defaultGrade, points: 0.0,
            label: isNursingProgram(programCode) ? 'FAIL' : 'NOT YET COMPETENT',
            color: '#991b1b', bgColor: '#fee2e2'
        };
    }
    for (const [grade, gConfig] of Object.entries(grades)) {
        if (score >= gConfig.min && score <= gConfig.max) {
            return {
                grade: grade, points: gConfig.points, label: gConfig.label,
                color: '#0A3D62', bgColor: '#f8fafc'
            };
        }
    }
    const defaultGrade = isNursingProgram(programCode) ? 'D' : 'E';
    return {
        grade: defaultGrade, points: 0.0,
        label: isNursingProgram(programCode) ? 'FAIL' : 'NOT YET COMPETENT',
        color: '#991b1b', bgColor: '#fee2e2'
    };
}

function calculateAverageScore(marks) {
    if (!marks || marks.length === 0) return 0;
    const total = marks.reduce((sum, m) => sum + (m.final_score || m.score || 0), 0);
    return Math.round((total / marks.length) * 10) / 10;
}

function getSampleStudents() {
    return [
        { id: 'STU-001', name: 'Jane Muthoni', email: 'jane@nchsm.ac.ke', program: 'KRCHN', intake: '2026', block: 'Final' },
        { id: 'STU-002', name: 'Peter Ochieng', email: 'peter@nchsm.ac.ke', program: 'DPOTT', intake: '2026', block: 'Final' },
        { id: 'STU-003', name: 'Sarah Wanjiru', email: 'sarah@nchsm.ac.ke', program: 'DCH', intake: '2026', block: 'Block 5' }
    ];
}

// ============================================================
// SERIAL NUMBER + QR CODE DATA
// ============================================================

function generateUniqueSerialNumber(student, program) {
    const year = new Date().getFullYear();
    const prefix = isNursingProgram(program) ? 'NUR' : 'TVT';
    const count = certificates.length + 1;
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const sequential = count.toString().padStart(4, '0');
    return `${CERT_SERIAL_PREFIX}${prefix}-${year}-${sequential}-${random.slice(0, 4)}`;
}

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

// 🆕 Generate a QR code as a data URL (used by print templates and modal previews)
function generateQRDataURL(data, size = 180) {
    return new Promise((resolve) => {
        if (typeof QRCode === 'undefined') {
            console.warn('⚠️ QRCode library not loaded — QR will be blank');
            resolve('');
            return;
        }
        try {
            QRCode.toDataURL(String(data || ''), {
                width: size,
                margin: 1,
                color: { dark: '#0A3D62', light: '#ffffff' }
            }, (err, url) => {
                resolve(err ? '' : url);
            });
        } catch (e) {
            console.warn('QR generation error:', e);
            resolve('');
        }
    });
}

// ============================================================
// GET STUDENT MARKS
// ============================================================

function getStudentMarks(studentId) {
    if (allMarks[studentId]) return allMarks[studentId];
    const transcriptMarks = allTranscripts
        .filter(t => t.studentId === studentId)
        .flatMap(t => t.marks || []);
    if (transcriptMarks.length > 0) return transcriptMarks;

    // Sample marks for demo
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
    try { certificates = JSON.parse(localStorage.getItem(CERT_STORAGE_KEY) || '[]'); } catch (e) { certificates = []; }
    try { graduationCandidates = JSON.parse(localStorage.getItem(GRAD_STORAGE_KEY) || '[]'); } catch (e) { graduationCandidates = []; }
    try { allTranscripts = JSON.parse(localStorage.getItem(TRANSCRIPT_STORAGE_KEY) || '[]'); } catch (e) { allTranscripts = []; }
    try {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        allStudents = users.filter(u => u.role === 'student' && u.status === 'approved');
        if (allStudents.length === 0) allStudents = getSampleStudents();
    } catch (e) { allStudents = getSampleStudents(); }
    try { allMarks = JSON.parse(localStorage.getItem('student_marks') || '{}'); } catch (e) { allMarks = {}; }
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
    } catch (e) { console.warn('Could not load grad settings:', e); }
}

// ============================================================
// AUDIT LOG
// ============================================================

function addAuditLog(action, studentName, serialNumber) {
    try {
        const log = JSON.parse(localStorage.getItem(AUDIT_LOG_KEY) || '[]');
        log.unshift({
            timestamp: new Date().toISOString(),
            action: action,
            student: studentName || '-',
            serial: serialNumber || '-',
            by: window.currentUser?.full_name || window.currentUser?.email || 'Admin'
        });
        localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(log.slice(0, 50)));
        renderAuditLog();
    } catch (e) { console.warn('Audit log error:', e); }
}

function renderAuditLog() {
    const tbody = document.getElementById('gradAuditLogBody');
    if (!tbody) return;
    let log = [];
    try { log = JSON.parse(localStorage.getItem(AUDIT_LOG_KEY) || '[]'); } catch (e) {}
    if (log.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="padding: 30px; text-align: center; color: #94a3b8;">No audit log entries yet.</td></tr>`;
        return;
    }
    tbody.innerHTML = log.map(entry => `
        <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 12px; font-size: 12px; white-space: nowrap;">${new Date(entry.timestamp).toLocaleString()}</td>
            <td style="padding: 10px 12px; font-weight: 500;">${escapeHtml(entry.action)}</td>
            <td style="padding: 10px 12px;">${escapeHtml(entry.student)}</td>
            <td style="padding: 10px 12px; font-family: monospace; font-size: 11px;">${escapeHtml(entry.serial)}</td>
            <td style="padding: 10px 12px; font-size: 12px; color: #64748b;">${escapeHtml(entry.by)}</td>
        </tr>
    `).join('');
}

function clearAuditLog() {
    if (!confirm('Clear the entire audit log?')) return;
    localStorage.removeItem(AUDIT_LOG_KEY);
    renderAuditLog();
    if (typeof showNotification === 'function') showNotification('✅ Audit log cleared', 'success');
}

// ============================================================
// RENDER FUNCTIONS
// ============================================================

function renderGraduateList() {
    const tbody = document.getElementById('gradStudentsList');
    if (!tbody) {
        // Retry once the section is injected
        if (!renderGraduateList._retry) renderGraduateList._retry = 0;
        if (renderGraduateList._retry < 10) {
            renderGraduateList._retry++;
            setTimeout(renderGraduateList, 200);
        } else {
            console.warn('⚠️ gradStudentsList element not found after retries');
        }
        return;
    }
    renderGraduateList._retry = 0;

    const programFilter = document.getElementById('gradProgramFilter')?.value || 'all';
    const statusFilter = document.getElementById('gradStatusFilter')?.value || 'all';
    const intakeFilter = document.getElementById('gradIntakeFilter')?.value || 'all';
    const searchTerm = (document.getElementById('gradSearchInput')?.value || '').toLowerCase().trim();

    let filtered = [...graduationCandidates];
    if (programFilter !== 'all') filtered = filtered.filter(g => g.program === programFilter);
    if (statusFilter !== 'all') filtered = filtered.filter(g => g.status === statusFilter);
    if (intakeFilter !== 'all') filtered = filtered.filter(g => String(g.intake) === intakeFilter);
    if (searchTerm) {
        filtered = filtered.filter(g =>
            (g.name || '').toLowerCase().includes(searchTerm) ||
            (g.studentId || '').toLowerCase().includes(searchTerm) ||
            (g.email || '').toLowerCase().includes(searchTerm)
        );
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="padding: 30px; text-align: center; color: #94a3b8;">
            <i class="fas fa-info-circle"></i> No graduates found.
        </td></tr>`;
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
            pending: '⏳ Pending', ready: '✅ Ready',
            printed: '🖨️ Printed', not_eligible: '❌ Not Eligible'
        };
        const hasCert = student.certificateGenerated;
        const hasTranscript = student.transcriptGenerated;

        html += `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 10px; text-align: center;">
                    <input type="checkbox" class="grad-student-checkbox" data-student-id="${escapeHtml(student.studentId)}" ${student.status === 'not_eligible' ? 'disabled' : ''} onchange="updateGraduationSelectedCount()">
                </td>
                <td style="padding: 8px 10px;">
                    <strong>${escapeHtml(student.name)}</strong>
                    <div style="font-size: 11px; color: #94a3b8;">${escapeHtml(student.email || '')} · ${escapeHtml(student.studentId)}</div>
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
                    ${hasTranscript
                        ? `<i class="fas fa-check-circle" style="color: #10b981; font-size: 18px;" title="Transcript generated"></i>`
                        : `<span style="color: #94a3b8; font-size: 11px;">Not generated</span>`}
                </td>
                <td style="padding: 8px 10px; text-align: center;">
                    ${hasCert
                        ? `<i class="fas fa-check-circle" style="color: #10b981; font-size: 18px;" title="Certificate generated"></i>`
                        : `<span style="color: #94a3b8; font-size: 11px;">Not generated</span>`}
                </td>
                <td style="padding: 8px 10px; text-align: center;">
                    ${hasCert
                        ? `<i class="fas fa-qrcode" style="color: #4C1D95; font-size: 20px; cursor: pointer;" onclick="showCertificateQR('${escapeHtml(student.studentId)}')" title="Show QR"></i>`
                        : `<span style="color: #94a3b8; font-size: 11px;">—</span>`}
                </td>
                <td style="padding: 8px 10px; text-align: center; white-space: nowrap;">
                    <button onclick="generateTranscript('${escapeHtml(student.studentId)}')" title="Generate transcript" 
                            style="background: #4C1D95; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; margin-right: 3px;">
                        <i class="fas fa-file-pdf"></i>
                    </button>
                    <button onclick="generateSingleCertificate('${escapeHtml(student.studentId)}')" title="Generate certificate" 
                            style="background: #10b981; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; margin-right: 3px;">
                        <i class="fas fa-certificate"></i>
                    </button>
                    ${hasCert ? `<button onclick="openCertificatePreview('${escapeHtml(student.studentId)}')" title="Preview certificate" 
                            style="background: #f59e0b; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">
                        <i class="fas fa-eye"></i>
                    </button>` : ''}
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    updateGraduationSelectedCount();
}

function renderCertificateList() {
    let tbody = document.getElementById('gradRecentList');
    if (!tbody) { console.warn('⚠️ No recent certificates table found'); return; }

    const sorted = [...certificates].sort((a, b) => new Date(b.issuedAt) - new Date(a.issuedAt)).slice(0, 20);

    if (sorted.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="padding: 30px; text-align: center; color: #94a3b8;">
            <i class="fas fa-certificate" style="font-size: 24px; display: block; margin-bottom: 8px;"></i>
            No certificates issued yet.
        </td></tr>`;
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
                    <button onclick="copySerial('${escapeHtml(cert.serialNumber)}')" style="background: none; border: none; cursor: pointer; color: #94a3b8; font-size: 12px;" title="Copy serial">
                        <i class="fas fa-copy"></i>
                    </button>
                </td>
                <td style="padding: 10px 14px; text-align: center; font-size: 12px;">${new Date(cert.issuedAt).toLocaleDateString()}</td>
                <td style="padding: 10px 14px; text-align: center; font-weight: 600; color: ${isPassing ? '#10b981' : '#dc2626'};">${cert.avgScore}%</td>
                <td style="padding: 10px 14px; text-align: center;">
                    <span style="background: ${isPassing ? '#d1fae5' : '#fee2e2'}; padding: 2px 10px; border-radius: 12px; font-size: 11px; color: ${isPassing ? '#065f46' : '#991b1b'};">${cert.grade}</span>
                </td>
                <td style="padding: 10px 14px; text-align: center; white-space: nowrap;">
                    <button onclick="openCertificatePreview('${escapeHtml(cert.studentId)}')" title="Preview" style="background: #f59e0b; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; margin-right: 3px;"><i class="fas fa-eye"></i></button>
                    <button onclick="downloadCertificatePDF('${escapeHtml(cert.studentId)}')" title="Download" style="background: #10b981; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; margin-right: 3px;"><i class="fas fa-download"></i></button>
                    <button onclick="showCertificateQR('${escapeHtml(cert.studentId)}')" title="QR" style="background: #4C1D95; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;"><i class="fas fa-qrcode"></i></button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function updateGraduationStats() {
    const total = graduationCandidates.length;
    const graduates = graduationCandidates.filter(g => g.isEligible);
    const pending = graduationCandidates.filter(g => g.status === 'pending' && !g.certificateGenerated);
    const printed = graduationCandidates.filter(g => g.printed);
    const notEligible = graduationCandidates.filter(g => g.status === 'not_eligible');
    const scanned = certificates.reduce((sum, c) => sum + (c.scanCount || 0), 0);

    const map = {
        'gradTotalStudents': total,
        'gradGraduatesCount': graduates.length,
        'gradPendingCount': pending.length,
        'gradPrintedCount': printed.length,
        'gradScanCount': scanned,
        'gradNotEligibleCount': notEligible.length
    };
    for (const [id, value] of Object.entries(map)) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }
}

function updateGraduationSelectedCount() {
    const count = document.querySelectorAll('.grad-student-checkbox:checked').length;
    const el = document.getElementById('gradSelectedCount');
    if (el) el.textContent = count;
    return count;
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
    document.querySelectorAll('.cert-student-checkbox:not([disabled])').forEach(cb => cb.checked = selectAll.checked);
}

function filterGradStudents() { renderGraduateList(); }

function showCertificateSection() {
    const section = document.getElementById('certificate-management');
    if (section) {
        section.style.display = 'block';
        section.classList.add('active');
    }
}

function setupEventListeners() {
    const ids = ['gradProgramFilter', 'gradStatusFilter', 'gradIntakeFilter'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.dataset.gradBound) {
            el.dataset.gradBound = '1';
            el.addEventListener('change', filterGradStudents);
        }
    });
    const selectAll = document.getElementById('gradSelectAll');
    if (selectAll) selectAll.addEventListener('change', toggleAllGradCheckboxes);
    const searchInput = document.getElementById('gradSearchInput');
    if (searchInput && !searchInput.dataset.gradBound) {
        searchInput.dataset.gradBound = '1';
        // oninput already calls filterGradStudents from HTML, so nothing needed
    }
}

// ============================================================
// PROCESS GRADUATION CANDIDATES
// ============================================================

function processGraduationCandidates() {
    const passMark = parseInt(document.getElementById('gradPassMark')?.value || 50);

    const processed = allStudents.map(student => {
        const marks = getStudentMarks(student.id);
        const avgScore = calculateAverageScore(marks);
        const isFinalBlock = (student.block === 'Final' || student.block === 'Block 6' || student.block === 'Final Term');
        const isEligible = avgScore >= passMark && isFinalBlock;
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
            feePaid: existingGrad?.feePaid || false,
            feeAmount: existingGrad?.feeAmount || parseInt(document.getElementById('gradFeeAmount')?.value || 2500)
        };
    });

    graduationCandidates = processed;
    localStorage.setItem(GRAD_STORAGE_KEY, JSON.stringify(graduationCandidates));
    renderGraduateList();
    updateGraduationStats();
}

// ============================================================
// PRINTABLE TEMPLATES
// ============================================================

function buildCertificateHTML(cert, qrDataUrl) {
    const qrImg = qrDataUrl
        ? `<img src="${qrDataUrl}" alt="QR" style="width: 140px; height: 140px; margin-top: 16px;">`
        : '';
    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Certificate - ${escapeHtml(cert.studentName)}</title>
<style>
@page { size: A4 landscape; margin: 0; }
body { font-family: Georgia, 'Times New Roman', serif; padding: 30px; text-align: center; background: #fff; margin: 0; }
.cert { border: 8px double #4C1D95; padding: 40px 30px; max-width: 950px; margin: 0 auto; box-sizing: border-box; position: relative; }
h1 { color: #4C1D95; font-size: 44px; margin: 0 0 8px; letter-spacing: 3px; }
h2 { color: #1e293b; font-size: 34px; margin: 18px 0 8px; }
.meta { color: #475569; font-size: 16px; margin: 6px 0; }
.serial { font-family: 'Courier New', monospace; color: #4C1D95; font-weight: 700; margin-top: 20px; font-size: 14px; }
.footer { margin-top: 30px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e5e7eb; padding-top: 16px; }
@media print { body { padding: 0; } }
</style></head>
<body>
<div class="cert">
    <h1>NCHSM</h1>
    <p class="meta">Nakuru College of Health Sciences and Management</p>
    <h2>Certificate of Completion</h2>
    <p class="meta">This is to certify that</p>
    <h2 style="color:#1e293b;">${escapeHtml(cert.studentName)}</h2>
    <p class="meta">has successfully completed the programme</p>
    <h2 style="font-size:24px;">${escapeHtml(cert.program)}</h2>
    <p class="meta">Average Score: <strong>${cert.avgScore}%</strong> &nbsp;•&nbsp; Grade: <strong>${escapeHtml(cert.grade)}</strong> (${escapeHtml(cert.rating)})</p>
    <p class="meta">Issued: ${cert.issueDate} &nbsp;•&nbsp; Expires: ${cert.expiryDate}</p>
    <p class="serial">Serial No: ${escapeHtml(cert.serialNumber)}</p>
    ${qrImg}
    <p class="serial" style="font-size:11px;">Verify online: ${escapeHtml(cert.verificationUrl)}</p>
    <div class="footer">
        <p>This certificate is issued by NCHSM. Verify at ${escapeHtml(cert.verificationUrl)}</p>
    </div>
</div>
<script>window.onload = function(){ setTimeout(function(){ window.print(); }, 400); };<\/script>
</body></html>`;
}

function buildTranscriptHTML(student, marks, cert) {
    const rows = marks.map((m, i) => `
        <tr>
            <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${i + 1}</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1;">${escapeHtml(m.subjectCode || m.unit_code || '-')}</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1;">${escapeHtml(m.subject || m.unit_name || '-')}</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${m.score || m.final_score || 0}</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${m.grade || calculateOfficialGrade(m.score || 0, student.program).grade}</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${m.points || calculateOfficialGrade(m.score || 0, student.program).points}</td>
        </tr>
    `).join('');

    const avg = calculateAverageScore(marks);
    const grade = calculateOfficialGrade(avg, student.program);

    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Transcript - ${escapeHtml(student.name)}</title>
<style>
@page { size: A4; margin: 20mm; }
body { font-family: Arial, sans-serif; padding: 20px; }
h1 { text-align: center; color: #0A3D62; margin-bottom: 4px; }
h2 { text-align: center; color: #64748b; font-size: 16px; font-weight: 400; margin-top: 0; }
.info { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0; padding: 16px; background: #f8fafc; border-radius: 8px; }
.info div { font-size: 14px; }
.info strong { color: #0A3D62; }
table { width: 100%; border-collapse: collapse; margin-top: 16px; }
th { background: #0A3D62; color: white; padding: 10px; border: 1px solid #cbd5e1; text-align: left; font-size: 13px; }
.summary { margin-top: 20px; padding: 16px; background: #e0e7ff; border-radius: 8px; text-align: center; }
.summary .big { font-size: 24px; font-weight: 700; color: #4C1D95; }
.signatures { margin-top: 60px; display: flex; justify-content: space-between; }
.signatures div { border-top: 1px solid #475569; padding-top: 6px; width: 40%; text-align: center; font-size: 13px; color: #475569; }
@media print { body { padding: 0; } }
</style></head>
<body>
<h1>Nakuru College of Health Sciences and Management</h1>
<h2>Official Academic Transcript</h2>
<div class="info">
    <div><strong>Student:</strong> ${escapeHtml(student.name)}</div>
    <div><strong>Student ID:</strong> ${escapeHtml(student.studentId || student.id)}</div>
    <div><strong>Program:</strong> ${escapeHtml(student.program)}</div>
    <div><strong>Intake:</strong> ${escapeHtml(student.intake || '-')}</div>
    <div><strong>Block:</strong> ${escapeHtml(student.block || 'Final')}</div>
    <div><strong>Issued:</strong> ${new Date().toLocaleDateString()}</div>
</div>
<table>
    <thead>
        <tr>
            <th style="width: 40px;">#</th>
            <th>Code</th>
            <th>Course Title</th>
            <th style="width: 80px; text-align: center;">Score</th>
            <th style="width: 80px; text-align: center;">Grade</th>
            <th style="width: 80px; text-align: center;">Points</th>
        </tr>
    </thead>
    <tbody>${rows}</tbody>
</table>
<div class="summary">
    <div style="font-size: 13px; color: #475569;">Average Score / Overall Grade</div>
    <div class="big">${avg}% — ${grade.grade} (${grade.label})</div>
</div>
<div class="signatures">
    <div>Academic Registrar</div>
    <div>Director</div>
</div>
<script>window.onload = function(){ setTimeout(function(){ window.print(); }, 400); };<\/script>
</body></html>`;
}

// ============================================================
// GENERATE — TRANSCRIPT (single student)
// ============================================================

function generateTranscript(studentId) {
    const student = graduationCandidates.find(g => g.studentId === studentId) || allStudents.find(s => s.id === studentId);
    if (!student) { showNotification?.('❌ Student not found', 'error'); return; }

    const marks = getStudentMarks(studentId);
    const html = buildTranscriptHTML(student, marks, null);

    const win = window.open('', '_blank');
    if (!win) { showNotification?.('❌ Pop-up blocked', 'error'); return; }
    win.document.write(html);
    win.document.close();

    // Mark transcript generated
    const grad = graduationCandidates.find(g => g.studentId === studentId);
    if (grad) {
        grad.transcriptGenerated = true;
        localStorage.setItem(GRAD_STORAGE_KEY, JSON.stringify(graduationCandidates));
        renderGraduateList();
    }
    addAuditLog('Transcript Generated', student.name, '-');
    showNotification?.('📄 Transcript ready to print', 'success');
}

// ============================================================
// GENERATE — CERTIFICATE (single student, with QR)
// ============================================================

async function generateSingleCertificate(studentId) {
    const student = graduationCandidates.find(g => g.studentId === studentId) || allStudents.find(s => s.id === studentId);
    if (!student) { showNotification?.('❌ Student not found', 'error'); return; }

    const marks = getStudentMarks(studentId);
    let cert = certificates.find(c => c.studentId === studentId);
    if (!cert) {
        cert = createCertificate(student, marks, null);
        certificates.push(cert);
        localStorage.setItem(CERT_STORAGE_KEY, JSON.stringify(certificates));
    }

    // Generate QR
    const qrDataUrl = await generateQRDataURL(cert.qrCode || cert.serialNumber, 180);
    const html = buildCertificateHTML(cert, qrDataUrl);

    const win = window.open('', '_blank');
    if (!win) { showNotification?.('❌ Pop-up blocked', 'error'); return; }
    win.document.write(html);
    win.document.close();

    // Mark certificate generated in candidate list
    const grad = graduationCandidates.find(g => g.studentId === studentId);
    if (grad) {
        grad.certificateGenerated = true;
        grad.serialNumber = cert.serialNumber;
        grad.qrCode = cert.qrCode;
        grad.status = 'ready';
        localStorage.setItem(GRAD_STORAGE_KEY, JSON.stringify(graduationCandidates));
    }

    addAuditLog('Certificate Generated', student.name, cert.serialNumber);
    renderGraduateList();
    renderCertificateList();
    updateGraduationStats();
    showNotification?.(`✅ Certificate ${cert.serialNumber} generated`, 'success');
}

// ============================================================
// BULK OPERATIONS
// ============================================================

function getSelectedStudentIds() {
    const ids = [];
    document.querySelectorAll('.grad-student-checkbox:checked').forEach(cb => {
        ids.push(cb.getAttribute('data-student-id'));
    });
    return ids;
}

function showBulkProgressModal(total) {
    const modal = document.getElementById('gradBulkProgressModal');
    if (!modal) return;
    modal.style.display = 'flex';
    const bar = document.getElementById('bulkProgressBar');
    const pct = document.getElementById('bulkProgressPercent');
    const label = document.getElementById('bulkProgressLabel');
    const closeBtn = document.getElementById('bulkProgressCloseBtn');
    if (bar) bar.style.width = '0%';
    if (pct) pct.textContent = '0%';
    if (label) label.textContent = `Processing 0 of ${total}...`;
    if (closeBtn) closeBtn.style.display = 'none';
}

function updateBulkProgress(current, total) {
    const pct = total > 0 ? Math.round((current / total) * 100) : 0;
    const bar = document.getElementById('bulkProgressBar');
    const pctEl = document.getElementById('bulkProgressPercent');
    const label = document.getElementById('bulkProgressLabel');
    if (bar) bar.style.width = pct + '%';
    if (pctEl) pctEl.textContent = pct + '%';
    if (label) label.textContent = `Processing ${current} of ${total}...`;
}

function closeBulkProgressModal() {
    const modal = document.getElementById('gradBulkProgressModal');
    if (modal) modal.style.display = 'none';
}

async function generateSelectedTranscripts() {
    const ids = getSelectedStudentIds();
    if (ids.length === 0) { showNotification?.('⚠️ Select at least one student', 'warning'); return; }

    showBulkProgressModal(ids.length);
    for (let i = 0; i < ids.length; i++) {
        generateTranscript(ids[i]);
        updateBulkProgress(i + 1, ids.length);
        await new Promise(r => setTimeout(r, 400));
    }
    const closeBtn = document.getElementById('bulkProgressCloseBtn');
    if (closeBtn) closeBtn.style.display = 'inline-block';
    showNotification?.(`✅ ${ids.length} transcript(s) generated`, 'success');
}

async function generateSelectedCertificates() {
    const ids = getSelectedStudentIds();
    if (ids.length === 0) { showNotification?.('⚠️ Select at least one student', 'warning'); return; }

    showBulkProgressModal(ids.length);
    for (let i = 0; i < ids.length; i++) {
        await generateSingleCertificate(ids[i]);
        updateBulkProgress(i + 1, ids.length);
        await new Promise(r => setTimeout(r, 500));
    }
    const closeBtn = document.getElementById('bulkProgressCloseBtn');
    if (closeBtn) closeBtn.style.display = 'inline-block';
    showNotification?.(`✅ ${ids.length} certificate(s) generated`, 'success');
}

async function generateCertificatesForAll() {
    const eligible = graduationCandidates.filter(g => g.isEligible);
    if (eligible.length === 0) { showNotification?.('⚠️ No eligible graduates', 'warning'); return; }
    if (!confirm(`Generate certificates for all ${eligible.length} eligible graduates?`)) return;

    showBulkProgressModal(eligible.length);
    for (let i = 0; i < eligible.length; i++) {
        await generateSingleCertificate(eligible[i].studentId);
        updateBulkProgress(i + 1, eligible.length);
        await new Promise(r => setTimeout(r, 500));
    }
    const closeBtn = document.getElementById('bulkProgressCloseBtn');
    if (closeBtn) closeBtn.style.display = 'inline-block';
    showNotification?.(`✅ All certificates generated`, 'success');
}

async function autoGenerateAllCertificates() { return generateCertificatesForAll(); }

async function autoGenerateAllGraduationDocuments() {
    const eligible = graduationCandidates.filter(g => g.isEligible);
    if (eligible.length === 0) { showNotification?.('⚠️ No eligible graduates', 'warning'); return; }
    if (!confirm(`Generate transcripts AND certificates for all ${eligible.length} graduates?`)) return;

    showBulkProgressModal(eligible.length * 2);
    let done = 0;
    for (const grad of eligible) {
        generateTranscript(grad.studentId);
        done++; updateBulkProgress(done, eligible.length * 2);
        await new Promise(r => setTimeout(r, 400));
        await generateSingleCertificate(grad.studentId);
        done++; updateBulkProgress(done, eligible.length * 2);
        await new Promise(r => setTimeout(r, 500));
    }
    const closeBtn = document.getElementById('bulkProgressCloseBtn');
    if (closeBtn) closeBtn.style.display = 'inline-block';
    showNotification?.(`✅ Generated ${eligible.length} transcript(s) and certificate(s)`, 'success');
}

// ============================================================
// MARK AS PRINTED
// ============================================================

function markAsPrinted(studentId) {
    const cert = certificates.find(c => c.studentId === studentId);
    const grad = graduationCandidates.find(g => g.studentId === studentId);
    if (cert) { cert.printed = true; cert.printedAt = new Date().toISOString(); }
    if (grad) { grad.printed = true; grad.status = 'printed'; }
    localStorage.setItem(CERT_STORAGE_KEY, JSON.stringify(certificates));
    localStorage.setItem(GRAD_STORAGE_KEY, JSON.stringify(graduationCandidates));
    addAuditLog('Marked Printed', grad?.name || cert?.studentName || '-', cert?.serialNumber || '-');
    renderGraduateList();
    updateGraduationStats();
}

function markSelectedAsPrinted() {
    const ids = getSelectedStudentIds();
    if (ids.length === 0) { showNotification?.('⚠️ No students selected', 'warning'); return; }
    ids.forEach(id => markAsPrinted(id));
    showNotification?.(`✅ ${ids.length} marked as printed`, 'success');
}

function markCertificateAsPrinted(studentId) { markAsPrinted(studentId); }

// ============================================================
// PREVIEW MODAL
// ============================================================

async function openCertificatePreview(studentId) {
    const cert = certificates.find(c => c.studentId === studentId);
    if (!cert) { showNotification?.('❌ Certificate not found', 'error'); return; }
    currentPreviewCert = cert;
    const qrDataUrl = await generateQRDataURL(cert.qrCode || cert.serialNumber, 180);
    const content = document.getElementById('certificatePreviewContent');
    if (!content) return;
    content.innerHTML = `
        <div style="border: 6px double #4C1D95; padding: 30px; border-radius: 8px; background: #fff; text-align: center;">
            <h2 style="color: #4C1D95; margin: 0 0 8px; letter-spacing: 2px;">NCHSM</h2>
            <p style="color: #64748b; margin: 0 0 20px;">Certificate of Completion</p>
            <h3 style="color: #1e293b; font-size: 26px; margin: 16px 0;">${escapeHtml(cert.studentName)}</h3>
            <p style="color: #475569;">has completed <strong>${escapeHtml(cert.program)}</strong></p>
            <p style="color: #475569;">Score: <strong>${cert.avgScore}%</strong> • Grade: <strong>${escapeHtml(cert.grade)}</strong> (${escapeHtml(cert.rating)})</p>
            <p style="color: #475569;">Issued: ${cert.issueDate} • Expires: ${cert.expiryDate}</p>
            <p style="font-family: monospace; color: #4C1D95; font-weight: 700; margin-top: 16px;">Serial: ${escapeHtml(cert.serialNumber)}</p>
            ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR" style="width: 140px; height: 140px; margin-top: 16px;">` : ''}
        </div>
    `;
    document.getElementById('certificatePreviewModal').style.display = 'flex';
}

// ============================================================
// QR CODE FUNCTIONS
// ============================================================

async function showCertificateQR(studentId) {
    const cert = certificates.find(c => c.studentId === studentId);
    if (!cert) { showNotification?.('❌ No certificate found', 'error'); return; }

    currentQRStudentId = studentId;
    currentQRSerial = cert.serialNumber;

    const qrDataUrl = await generateQRDataURL(cert.qrCode || cert.serialNumber, 220);

    // If the preview modal exists, use it; otherwise fallback alert
    const modal = document.getElementById('certificatePreviewModal');
    if (modal) {
        const content = document.getElementById('certificatePreviewContent');
        content.innerHTML = `
            <div style="text-align: center;">
                <h3 style="color: #0A3D62; margin: 0 0 8px;">QR Code — ${escapeHtml(cert.studentName)}</h3>
                <p style="color: #64748b; font-family: monospace;">${escapeHtml(cert.serialNumber)}</p>
                ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR" style="width: 260px; height: 260px; margin: 16px auto; display: block;">` : '<p style="color: #dc2626;">QR generation failed</p>'}
                <button onclick="downloadQR('${escapeHtml(studentId)}')" style="background: #4C1D95; color: white; padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; margin-top: 12px;">
                    <i class="fas fa-download"></i> Download QR
                </button>
            </div>
        `;
        modal.style.display = 'flex';
    }

    // Also try to render into the small sidebar preview canvas if it exists
    const previewBox = document.getElementById('qrPreviewBox');
    const previewCanvas = document.getElementById('qrPreviewCanvas');
    if (previewBox && previewCanvas && qrDataUrl) {
        const img = new Image();
        img.onload = function() {
            previewCanvas.width = 180;
            previewCanvas.height = 180;
            const ctx = previewCanvas.getContext('2d');
            ctx.drawImage(img, 0, 0, 180, 180);
        };
        img.src = qrDataUrl;
        previewBox.style.display = 'block';
    }

    addAuditLog('QR Viewed', cert.studentName, cert.serialNumber);
}

async function downloadQR(studentId) {
    const cert = certificates.find(c => c.studentId === studentId);
    if (!cert) return;
    const qrDataUrl = await generateQRDataURL(cert.qrCode || cert.serialNumber, 400);
    if (!qrDataUrl) { showNotification?.('❌ QR generation failed', 'error'); return; }
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR_${cert.serialNumber}.png`;
    a.click();
    showNotification?.('📥 QR downloaded', 'success');
}

// ============================================================
// VERIFY CERTIFICATE
// ============================================================

async function verifyCertificate(serialOrData) {
    const result = document.getElementById('verifyResult');
    if (!result) return;
    result.style.display = 'block';

    if (!serialOrData) {
        result.innerHTML = `<div style="padding: 12px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; color: #991b1b;">❌ Please enter a serial number</div>`;
        return;
    }

    // Accept either a serial number or a base64 QR payload
    let serial = serialOrData;
    try {
        const decoded = JSON.parse(decodeURIComponent(escape(atob(serialOrData))));
        if (decoded.serialNumber) serial = decoded.serialNumber;
    } catch (e) { /* not a QR payload, treat as plain serial */ }

    const cert = certificates.find(c => c.serialNumber === serial);
    if (!cert) {
        result.innerHTML = `<div style="padding: 12px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; color: #991b1b;">
            ❌ <strong>Certificate not found</strong><br>
            <span style="font-size: 12px;">Serial: ${escapeHtml(serial)}</span>
        </div>`;
        return;
    }

    // Increment scan count
    cert.scanCount = (cert.scanCount || 0) + 1;
    cert.lastScanned = new Date().toISOString();
    localStorage.setItem(CERT_STORAGE_KEY, JSON.stringify(certificates));
    updateGraduationStats();

    result.innerHTML = `
        <div style="padding: 16px; background: #f0fdf4; border: 2px solid #10b981; border-radius: 10px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                <i class="fas fa-shield-alt" style="color: #10b981; font-size: 24px;"></i>
                <strong style="color: #065f46; font-size: 15px;">✅ Certificate Verified</strong>
            </div>
            <div style="font-size: 13px; color: #334155; line-height: 1.7;">
                <div><strong>Student:</strong> ${escapeHtml(cert.studentName)}</div>
                <div><strong>Program:</strong> ${escapeHtml(cert.program)}</div>
                <div><strong>Serial:</strong> <code>${escapeHtml(cert.serialNumber)}</code></div>
                <div><strong>Issued:</strong> ${cert.issueDate} &nbsp;•&nbsp; <strong>Expires:</strong> ${cert.expiryDate}</div>
                <div><strong>Score:</strong> ${cert.avgScore}% &nbsp;•&nbsp; <strong>Grade:</strong> ${escapeHtml(cert.grade)}</div>
            </div>
            <button onclick="openCertificatePreview('${escapeHtml(cert.studentId)}')" style="margin-top: 12px; background: #4C1D95; color: white; padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 12px;">
                <i class="fas fa-eye"></i> View Certificate
            </button>
        </div>
    `;
}

// ============================================================
// QR SCANNER (camera)
// ============================================================

async function startQRScanner() {
    const video = document.getElementById('qrVideo');
    const placeholder = document.getElementById('qrPlaceholder');
    const startBtn = document.getElementById('qrStartBtn');
    const stopBtn = document.getElementById('qrStopBtn');
    const status = document.getElementById('qrScannerStatus');

    if (!video || !navigator.mediaDevices) {
        showNotification?.('❌ Camera not supported', 'error');
        return;
    }

    try {
        qrStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.srcObject = qrStream;
        video.style.display = 'block';
        await video.play();
        if (placeholder) placeholder.style.display = 'none';
        if (startBtn) startBtn.style.display = 'none';
        if (stopBtn) stopBtn.style.display = 'inline-block';
        if (status) status.innerHTML = '<i class="fas fa-circle" style="color: #10b981; font-size: 8px;"></i> Active';
        qrScannerActive = true;

        const canvas = document.getElementById('qrCanvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        function tick() {
            if (!qrScannerActive) return;
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                if (typeof jsQR !== 'undefined') {
                    const code = jsQR(imageData.data, imageData.width, imageData.height);
                    if (code && code.data) {
                        handleQRScanResult(code.data);
                        stopQRScanner();
                        return;
                    }
                }
            }
            qrAnimationFrame = requestAnimationFrame(tick);
        }
        tick();
    } catch (err) {
        console.error('QR scanner error:', err);
        showNotification?.('❌ Camera access denied: ' + err.message, 'error');
    }
}

function stopQRScanner() {
    qrScannerActive = false;
    if (qrAnimationFrame) cancelAnimationFrame(qrAnimationFrame);
    if (qrStream) { qrStream.getTracks().forEach(t => t.stop()); qrStream = null; }
    const video = document.getElementById('qrVideo');
    const placeholder = document.getElementById('qrPlaceholder');
    const startBtn = document.getElementById('qrStartBtn');
    const stopBtn = document.getElementById('qrStopBtn');
    const status = document.getElementById('qrScannerStatus');
    if (video) { video.srcObject = null; video.style.display = 'none'; }
    if (placeholder) placeholder.style.display = 'block';
    if (startBtn) startBtn.style.display = 'inline-block';
    if (stopBtn) stopBtn.style.display = 'none';
    if (status) status.innerHTML = '<i class="fas fa-circle" style="color: #ef4444; font-size: 8px;"></i> Inactive';
}

function handleQRScanResult(data) {
    const resultBox = document.getElementById('qrScanResult');
    let parsed = null;
    try { parsed = JSON.parse(decodeURIComponent(escape(atob(data)))); } catch (e) {}

    if (parsed && parsed.serialNumber) {
        currentQRSerial = parsed.serialNumber;
        currentQRStudentId = parsed.studentId || null;
        if (resultBox) {
            resultBox.style.display = 'block';
            document.getElementById('qrResultName').textContent = parsed.studentName || 'Unknown';
            document.getElementById('qrResultDetails').textContent = `${parsed.program || 'N/A'} • ${parsed.serialNumber}`;
        }
        verifyCertificate(parsed.serialNumber);
    } else {
        // Treat as raw serial
        currentQRSerial = data;
        verifyCertificate(data);
    }
}

function uploadQRImage() {
    document.getElementById('qrImageUpload')?.click();
}

async function scanQRFromImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.getElementById('qrCanvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            if (typeof jsQR === 'undefined') { showNotification?.('❌ QR scanner library not loaded', 'error'); return; }
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            if (code && code.data) {
                handleQRScanResult(code.data);
            } else {
                showNotification?.('❌ No QR code found in image', 'error');
            }
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    event.target.value = '';
}

function viewCertificateFromQR() {
    if (currentQRStudentId) openCertificatePreview(currentQRStudentId);
    else if (currentQRSerial) {
        const cert = certificates.find(c => c.serialNumber === currentQRSerial);
        if (cert) openCertificatePreview(cert.studentId);
    }
}

function downloadCertificateFromQR() {
    if (currentPreviewCert) return downloadCertificatePDF(currentPreviewCert.studentId);
    if (currentQRStudentId) return downloadCertificatePDF(currentQRStudentId);
    showNotification?.('❌ No certificate selected', 'error');
}

// ============================================================
// DOWNLOAD CERTIFICATE PDF
// ============================================================

async function downloadCertificatePDF(studentId) {
    try {
        const cert = certificates.find(c => c.studentId === studentId);
        if (!cert) { showNotification?.('❌ No certificate found', 'error'); return; }
        const qrDataUrl = await generateQRDataURL(cert.qrCode || cert.serialNumber, 180);
        const html = buildCertificateHTML(cert, qrDataUrl);
        const win = window.open('', '_blank');
        if (!win) { showNotification?.('❌ Pop-up blocked', 'error'); return; }
        win.document.write(html);
        win.document.close();
        cert.printed = true;
        cert.printedAt = new Date().toISOString();
        localStorage.setItem(CERT_STORAGE_KEY, JSON.stringify(certificates));
        addAuditLog('PDF Downloaded', cert.studentName, cert.serialNumber);
    } catch (err) {
        console.error('downloadCertificatePDF error:', err);
        showNotification?.('❌ Failed: ' + err.message, 'error');
    }
}

// ============================================================
// SETTINGS
// ============================================================

function saveGradSettings() {
    const settings = {
        passMark: parseInt(document.getElementById('gradPassMark')?.value || 50),
        feeAmount: parseInt(document.getElementById('gradFeeAmount')?.value || 2500),
        gradDate: document.getElementById('gradDate')?.value || '',
        template: document.getElementById('gradTemplate')?.value || 'standard',
        emailOnGenerate: document.getElementById('gradEmailOnGenerate')?.checked || false,
        emailOnPrint: document.getElementById('gradEmailOnPrint')?.checked || false,
        notifyAdmin: document.getElementById('gradNotifyAdmin')?.checked || false
    };
    localStorage.setItem('grad_settings', JSON.stringify(settings));
    addAuditLog('Settings Saved', '-', '-');
    showNotification?.('✅ Settings saved', 'success');
    processGraduationCandidates();
}

function resetGradSettings() {
    if (!confirm('Reset all graduation settings to defaults?')) return;
    localStorage.removeItem('grad_settings');
    const p = document.getElementById('gradPassMark'); if (p) p.value = 50;
    const f = document.getElementById('gradFeeAmount'); if (f) f.value = 2500;
    const d = document.getElementById('gradDate'); if (d) d.value = '';
    const t = document.getElementById('gradTemplate'); if (t) t.value = 'standard';
    showNotification?.('🔄 Settings reset', 'info');
}

// ============================================================
// EXPORT CSV
// ============================================================

function downloadCSVFile(filename, content) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
}

function exportGraduationCSV() {
    if (graduationCandidates.length === 0) { showNotification?.('⚠️ No data', 'warning'); return; }
    const headers = ['Student ID', 'Name', 'Email', 'Program', 'Intake', 'Avg Score', 'Status', 'Certificate Generated', 'Serial Number'];
    const rows = graduationCandidates.map(g => [
        g.studentId, g.name, g.email, g.program, g.intake, g.avgScore,
        g.status, g.certificateGenerated ? 'Yes' : 'No', g.serialNumber || ''
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    downloadCSVFile(`graduation_candidates_${new Date().toISOString().split('T')[0]}.csv`, csv);
    showNotification?.('📥 Graduation CSV exported', 'success');
}

function exportCertificateCSV() {
    if (certificates.length === 0) { showNotification?.('⚠️ No certificates', 'warning'); return; }
    const headers = ['Serial Number', 'Student ID', 'Student Name', 'Program', 'Avg Score', 'Grade', 'Issue Date', 'Expiry Date', 'Printed', 'Scans'];
    const rows = certificates.map(c => [
        c.serialNumber, c.studentId, c.studentName, c.program, c.avgScore, c.grade,
        c.issueDate, c.expiryDate, c.printed ? 'Yes' : 'No', c.scanCount || 0
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    downloadCSVFile(`certificates_${new Date().toISOString().split('T')[0]}.csv`, csv);
    showNotification?.('📥 Certificates CSV exported', 'success');
}

// ============================================================
// BULK IMPORT MARKS
// ============================================================

function downloadMarksTemplate() {
    const csv = 'student_id,unit_code,cat1,cat2,exam_score\nSTU-001,ANA101,25,28,65\nSTU-002,PHY201,20,22,58\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'marks_import_template.csv';
    link.click();
    URL.revokeObjectURL(link.href);
}

function importBulkMarks() {
    const fileInput = document.getElementById('gradBulkMarksFile');
    const resultBox = document.getElementById('bulkImportResult');
    const file = fileInput?.files?.[0];
    if (!file) { showNotification?.('⚠️ Select a file', 'warning'); return; }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const text = e.target.result;
            const lines = text.trim().split(/\r?\n/);
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
            const idxStudent = headers.indexOf('student_id');
            const idxUnit = headers.indexOf('unit_code');
            const idxCat1 = headers.indexOf('cat1');
            const idxCat2 = headers.indexOf('cat2');
            const idxExam = headers.indexOf('exam_score');

            if (idxStudent < 0 || idxUnit < 0) throw new Error('Missing student_id or unit_code columns');

            let imported = 0;
            const marksMap = JSON.parse(localStorage.getItem('student_marks') || '{}');

            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                const parts = lines[i].split(',').map(p => p.trim());
                const sid = parts[idxStudent];
                const unit = parts[idxUnit];
                if (!sid || !unit) continue;

                const cat1 = parseFloat(parts[idxCat1]) || 0;
                const cat2 = parseFloat(parts[idxCat2]) || 0;
                const exam = parseFloat(parts[idxExam]) || 0;
                const total = cat1 + cat2 + exam;

                if (!marksMap[sid]) marksMap[sid] = [];
                marksMap[sid].push({
                    subjectCode: unit,
                    subject: unit,
                    score: total,
                    final_score: total,
                    block: 'Final'
                });
                imported++;
            }

            localStorage.setItem('student_marks', JSON.stringify(marksMap));
            if (resultBox) {
                resultBox.style.display = 'block';
                resultBox.innerHTML = `<div style="padding: 12px; background: #f0fdf4; border: 1px solid #10b981; border-radius: 8px; color: #065f46;">✅ Imported ${imported} mark(s)</div>`;
            }
            addAuditLog('Bulk Marks Imported', `${imported} rows`, '-');
            processGraduationCandidates();
            showNotification?.(`✅ Imported ${imported} marks`, 'success');
        } catch (err) {
            if (resultBox) resultBox.innerHTML = `<div style="padding: 12px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; color: #991b1b;">❌ ${escapeHtml(err.message)}</div>`;
        }
    };
    reader.readAsText(file);
}

// ============================================================
// PRINT ALL + REFRESH + COPY
// ============================================================

function printAllCertificates() {
    if (certificates.length === 0) { showNotification?.('⚠️ No certificates to print', 'warning'); return; }
    const certs = certificates.slice(0, 20);
    if (!confirm(`Print ${certs.length} certificate(s)?`)) return;
    certs.forEach((c, i) => setTimeout(() => downloadCertificatePDF(c.studentId), i * 800));
}

function refreshGraduationData() {
    loadAllData();
    processGraduationCandidates();
    renderGraduateList();
    renderCertificateList();
    updateGraduationStats();
    renderAuditLog();
    showNotification?.('🔄 Data refreshed', 'success');
}

function copySerial(serial) {
    navigator.clipboard.writeText(serial).then(() => {
        showNotification?.('📋 Serial copied', 'success');
    }).catch(() => {
        prompt('Copy this serial:', serial);
    });
}

// ============================================================
// NOTIFICATION FALLBACKS
// ============================================================

if (typeof showNotification === 'undefined') {
    window.showNotification = function(message, type) {
        console.log(`[${type || 'info'}] ${message}`);
        const toast = document.createElement('div');
        const colors = { success: '#059669', error: '#dc2626', warning: '#f59e0b', info: '#3b82f6' };
        toast.style.cssText = `
            position: fixed; bottom: 20px; right: 20px; padding: 12px 20px;
            background: ${colors[type] || '#3b82f6'}; color: white;
            border-radius: 8px; font-weight: 500; z-index: 100000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2); max-width: 400px;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.5s'; setTimeout(() => toast.remove(), 500); }, 3000);
    };
}

if (typeof showLoading === 'undefined') {
    window.showLoading = function(message) {
        const overlay = document.createElement('div');
        overlay.id = 'loadingOverlayTemp';
        overlay.style.cssText = `position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 99999; display: flex; justify-content: center; align-items: center;`;
        overlay.innerHTML = `<div style="background: white; padding: 30px 40px; border-radius: 12px; text-align: center;">
            <div style="width: 40px; height: 40px; border: 4px solid #e2e8f0; border-top-color: #4C1D95; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 12px;"></div>
            <p style="color: #1e293b; font-weight: 500; margin: 0;">${message}</p>
        </div><style>@keyframes spin { to { transform: rotate(360deg); } }</style>`;
        document.body.appendChild(overlay);
    };
}

if (typeof hideLoading === 'undefined') {
    window.hideLoading = function() { document.getElementById('loadingOverlayTemp')?.remove(); };
}

// ============================================================
// INITIALIZE
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
    renderAuditLog();
    console.log('✅ Graduation & Certificate System initialized!');
}

window.initCertificateSystem = initGraduationSystem;

// ============================================================
// EXPOSE TO GLOBAL SCOPE
// ============================================================

Object.assign(window, {
    initGraduationSystem, initCertificateSystem: initGraduationSystem,
    processGraduationCandidates, renderGraduateList, renderCertificateList,
    updateGraduationStats, updateGraduationSelectedCount,
    filterGradStudents, toggleAllGradCheckboxes, toggleAllCertCheckboxes,
    generateTranscript, generateSingleCertificate,
    generateSelectedTranscripts, generateSelectedCertificates,
    generateCertificatesForAll, autoGenerateAllCertificates,
    autoGenerateAllGraduationDocuments,
    markAsPrinted, markSelectedAsPrinted, markCertificateAsPrinted,
    exportGraduationCSV, exportCertificateCSV,
    refreshGraduationData, printAllCertificates, copySerial,
    saveGradSettings, resetGradSettings,
    showCertificateQR, downloadQR, verifyCertificate, openCertificatePreview,
    startQRScanner, stopQRScanner, uploadQRImage, scanQRFromImage,
    viewCertificateFromQR, downloadCertificateFromQR,
    downloadCertificatePDF, generateQRDataURL,
    downloadMarksTemplate, importBulkMarks,
    clearAuditLog, renderAuditLog, addAuditLog,
    closeBulkProgressModal, showBulkProgressModal, updateBulkProgress,
    getProgramType, isTVETProgram, isNursingProgram,
    getGradingConfig, calculateOfficialGrade, calculateAverageScore,
    escapeHtml, generateQRCodeData, generateUniqueSerialNumber,
    createCertificate, getStudentMarks, loadAllData
});

console.log('🎓 Graduation & Certificate System Loaded Successfully!');
console.log('📋 All features wired: generation, QR, verification, bulk ops, settings, audit log');
console.log('📋 Ready for initialization.');
